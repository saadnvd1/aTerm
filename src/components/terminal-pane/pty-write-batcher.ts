import type { Terminal } from "@xterm/xterm";

/**
 * Batches PTY output writes to xterm.js using requestAnimationFrame.
 *
 * When rapid escape sequences arrive (e.g., Claude Code screen redraws),
 * intermediate states are coalesced into a single terminal.write() per frame,
 * preventing visible flicker.
 *
 * Latency impact: 0-16ms (one frame), imperceptible for interactive use.
 */
export class PtyWriteBatcher {
  private buffer = "";
  private rafId: number | null = null;

  constructor(private terminal: Terminal) {}

  write(decoded: string): void {
    this.buffer += decoded;

    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => this.flush());
    }
  }

  private flush(): void {
    this.rafId = null;
    if (!this.buffer) return;

    const data = this.buffer;
    this.buffer = "";
    this.terminal.write(data);
  }

  dispose(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    // Flush remaining data synchronously on dispose
    if (this.buffer) {
      this.terminal.write(this.buffer);
      this.buffer = "";
    }
  }
}
