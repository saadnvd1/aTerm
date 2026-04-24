import type { Terminal } from "@xterm/xterm";
import { invoke } from "@tauri-apps/api/core";

const ACK_BATCH_SIZE = 4096;

/**
 * Handles PTY output writes to xterm.js with flow control.
 *
 * Writes data directly to xterm (no batching) and acks the Rust backend
 * after xterm.js finishes parsing, enabling backpressure on fast output.
 *
 * Direct writes with flow control — no batching, backpressure handles the rest.
 */
export class PtyWriteBatcher {
  private unsentAck = 0;

  constructor(
    private terminal: Terminal,
    private ptyId: string,
  ) {}

  write(decoded: string): void {
    const len = decoded.length;
    this.terminal.write(decoded, () => {
      this.ack(len);
    });
  }

  private ack(count: number): void {
    this.unsentAck += count;
    while (this.unsentAck >= ACK_BATCH_SIZE) {
      this.unsentAck -= ACK_BATCH_SIZE;
      invoke("ack_pty_data", { id: this.ptyId, count: ACK_BATCH_SIZE }).catch(
        () => {},
      );
    }
  }

  dispose(): void {
    if (this.unsentAck > 0) {
      invoke("ack_pty_data", { id: this.ptyId, count: this.unsentAck }).catch(
        () => {},
      );
      this.unsentAck = 0;
    }
  }
}
