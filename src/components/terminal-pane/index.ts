export { SearchOverlay } from "./SearchOverlay";
export { DragDropOverlay } from "./DragDropOverlay";
export {
  killPty,
  serializeRefs,
  spawnedPtys,
  terminalInstances,
  base64ToUint8Array,
  MIN_FONT_SIZE,
  MAX_FONT_SIZE,
  DEFAULT_SCROLLBACK,
  type TerminalInstance,
} from "./terminal-instance";
export { PtyWriteBatcher } from "./pty-write-batcher";

// Global setting for smooth output (RAF write batching)
// Set by App.tsx, read by TerminalPane — avoids prop drilling through 4 layers
export let smoothOutputEnabled = false;
export function setSmoothOutputEnabled(enabled: boolean) {
  smoothOutputEnabled = enabled;
}
