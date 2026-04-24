use std::fs;
use std::path::Path;

#[tauri::command]
pub fn open_in_editor(path: String, editor: Option<String>) -> Result<(), String> {
    let editor = editor.unwrap_or_else(|| "default".to_string());

    let result = match editor.as_str() {
        "vscode" | "code" => std::process::Command::new("code").arg(&path).spawn(),
        "cursor" => std::process::Command::new("cursor").arg(&path).spawn(),
        _ => {
            // Use system default - 'open' on macOS
            #[cfg(target_os = "macos")]
            {
                std::process::Command::new("open")
                    .arg("-t") // Open in default text editor
                    .arg(&path)
                    .spawn()
            }
            #[cfg(not(target_os = "macos"))]
            {
                std::process::Command::new("xdg-open").arg(&path).spawn()
            }
        }
    };

    result.map(|_| ()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn read_file_content(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_file_content(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn check_files_exist(paths: Vec<String>) -> Vec<bool> {
    paths.iter().map(|p| Path::new(p).exists()).collect()
}

#[tauri::command]
pub fn create_parent_dirs(path: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())
    } else {
        Ok(())
    }
}
