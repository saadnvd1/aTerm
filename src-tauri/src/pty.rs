use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::{Arc, Condvar, Mutex};
use std::thread;
use tauri::{AppHandle, Emitter};

/// Flow control constants for PTY backpressure
const HIGH_WATERMARK: usize = 100_000; // Pause PTY reads at 100K unacked chars
const LOW_WATERMARK: usize = 50_000;   // Resume PTY reads at 50K unacked chars
#[allow(dead_code)]
const ACK_BATCH_SIZE: usize = 4096;    // Batch ack messages by 4KB (used on frontend side)

pub type PtyMap = Arc<Mutex<HashMap<String, PtyHandle>>>;

/// Shared flow control state between the reader thread and ack commands
pub type FlowMap = Arc<Mutex<HashMap<String, Arc<FlowControl>>>>;

pub struct FlowControl {
    unacked: AtomicUsize,
    paused: AtomicBool,
    resume: Condvar,
    resume_mutex: Mutex<()>,
}

impl FlowControl {
    fn new() -> Self {
        Self {
            unacked: AtomicUsize::new(0),
            paused: AtomicBool::new(false),
            resume: Condvar::new(),
            resume_mutex: Mutex::new(()),
        }
    }

    /// Called by reader thread after emitting data — may block if above highwater
    fn add_unacked(&self, count: usize) {
        let prev = self.unacked.fetch_add(count, Ordering::Relaxed);
        if prev + count >= HIGH_WATERMARK {
            self.paused.store(true, Ordering::Relaxed);
            // Wait until ack brings us below low watermark
            let guard = self.resume_mutex.lock().unwrap();
            let _guard = self
                .resume
                .wait_while(guard, |_| self.paused.load(Ordering::Relaxed))
                .unwrap();
        }
    }

    /// Called when frontend acknowledges data was parsed by xterm.js
    fn ack(&self, count: usize) {
        let prev = self.unacked.fetch_sub(count.min(self.unacked.load(Ordering::Relaxed)), Ordering::Relaxed);
        if prev.saturating_sub(count) < LOW_WATERMARK && self.paused.load(Ordering::Relaxed) {
            self.paused.store(false, Ordering::Relaxed);
            self.resume.notify_one();
        }
    }
}

pub struct PtyHandle {
    master: Box<dyn portable_pty::MasterPty + Send>,
    writer: Box<dyn Write + Send>,
    child: Box<dyn portable_pty::Child + Send>,
}

#[tauri::command]
pub fn spawn_pty(
    id: String,
    cwd: String,
    cols: u16,
    rows: u16,
    command: Option<String>,
    app: AppHandle,
    state: tauri::State<'_, PtyMap>,
    flow_state: tauri::State<'_, FlowMap>,
) -> Result<(), String> {
    let pty_system = native_pty_system();

    let pair = pty_system
        .openpty(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;

    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());

    let mut cmd = if let Some(ref command) = command {
        let mut c = CommandBuilder::new(&shell);
        c.args([
            "-l",
            "-i",
            "-c",
            &format!("{}; exec {} -l -i", command, shell),
        ]);
        c
    } else {
        let mut c = CommandBuilder::new(&shell);
        c.args(["-l", "-i"]);
        c
    };
    cmd.cwd(&cwd);
    cmd.env("TERM", "xterm-256color");

    let child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;

    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

    // Set up flow control for this PTY
    let flow = Arc::new(FlowControl::new());
    {
        let mut flows = flow_state.lock().unwrap();
        flows.insert(id.clone(), flow.clone());
    }

    {
        let mut ptys = state.lock().unwrap();
        ptys.insert(
            id.clone(),
            PtyHandle {
                master: pair.master,
                writer,
                child,
            },
        );
    }

    let event_id = id.clone();
    thread::spawn(move || {
        // 64KB buffer for better throughput on fast output
        let mut buf = [0u8; 65536];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let encoded = BASE64.encode(&buf[..n]);
                    let _ = app.emit(&format!("pty-output-{}", event_id), encoded);
                    // Flow control: track unacked bytes, block if too fast
                    flow.add_unacked(n);
                }
                Err(_) => break,
            }
        }
    });

    Ok(())
}

/// Frontend calls this after xterm.js finishes parsing data
/// This releases backpressure on the PTY reader thread
#[tauri::command]
pub fn ack_pty_data(id: String, count: usize, flow_state: tauri::State<'_, FlowMap>) {
    let flows = flow_state.lock().unwrap();
    if let Some(flow) = flows.get(&id) {
        flow.ack(count);
    }
}

#[tauri::command]
pub fn write_pty(id: String, data: String, state: tauri::State<'_, PtyMap>) -> Result<(), String> {
    let mut ptys = state.lock().unwrap();
    if let Some(pty) = ptys.get_mut(&id) {
        pty.writer
            .write_all(data.as_bytes())
            .map_err(|e| e.to_string())?;
        pty.writer.flush().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn resize_pty(
    id: String,
    cols: u16,
    rows: u16,
    state: tauri::State<'_, PtyMap>,
) -> Result<(), String> {
    let ptys = state.lock().unwrap();
    if let Some(pty) = ptys.get(&id) {
        pty.master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn kill_pty(id: String, state: tauri::State<'_, PtyMap>, flow_state: tauri::State<'_, FlowMap>) -> Result<(), String> {
    let mut ptys = state.lock().unwrap();
    if let Some(mut pty) = ptys.remove(&id) {
        let _ = pty.child.kill();
    }
    // Clean up flow control
    let mut flows = flow_state.lock().unwrap();
    flows.remove(&id);
    Ok(())
}

#[tauri::command]
pub fn get_active_pty_count(state: tauri::State<'_, PtyMap>) -> usize {
    let ptys = state.lock().unwrap();
    ptys.len()
}

#[tauri::command]
pub fn kill_all_ptys(state: tauri::State<'_, PtyMap>, flow_state: tauri::State<'_, FlowMap>) -> Result<(), String> {
    let mut ptys = state.lock().unwrap();
    for (_, mut pty) in ptys.drain() {
        let _ = pty.child.kill();
    }
    let mut flows = flow_state.lock().unwrap();
    flows.clear();
    Ok(())
}

#[tauri::command]
pub fn force_exit(state: tauri::State<'_, PtyMap>) {
    {
        let mut ptys = state.lock().unwrap();
        for (_, mut pty) in ptys.drain() {
            let _ = pty.child.kill();
        }
    }
    std::process::exit(0);
}
