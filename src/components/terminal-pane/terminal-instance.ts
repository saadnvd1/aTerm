import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { SearchAddon } from "@xterm/addon-search";
import { SerializeAddon } from "@xterm/addon-serialize";
import { invoke } from "@tauri-apps/api/core";
import { PtyWriteBatcher } from "./pty-write-batcher";

// Track spawned PTYs globally so we don't respawn on remount (e.g., after drag)
export const spawnedPtys = new Set<string>();

// Track Terminal instances globally so buffer survives remount (e.g., after drag)
export interface TerminalInstance {
  terminal: Terminal;
  fitAddon: FitAddon;
  searchAddon: SearchAddon;
  serializeAddon: SerializeAddon;
  unlisten: (() => void) | null;
  batcher: PtyWriteBatcher | null;
}

export const terminalInstances = new Map<string, TerminalInstance>();

// Expose serialize function ref for external use (context menu)
export const serializeRefs = new Map<string, () => string>();

/**
 * Kill a PTY and dispose terminal - call this when pane is explicitly closed
 */
export function killPty(id: string) {
  if (spawnedPtys.has(id)) {
    invoke("kill_pty", { id }).catch(console.error);
    spawnedPtys.delete(id);
  }
  // Also dispose the terminal instance
  const instance = terminalInstances.get(id);
  if (instance) {
    instance.unlisten?.();
    instance.batcher?.dispose();
    instance.terminal.dispose();
    terminalInstances.delete(id);
  }
  serializeRefs.delete(id);
}

/**
 * Base64 decode helper for PTY output
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Font size limits
export const MIN_FONT_SIZE = 8;
export const MAX_FONT_SIZE = 32;
export const DEFAULT_SCROLLBACK = 10000;
