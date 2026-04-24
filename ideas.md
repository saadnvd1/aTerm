# aTerm Ideas

## Completed Features

- [x] Cmd+D to split and open a new shell in the project's working directory
- [x] Drag and drop to re-arrange terminal panes
- [x] Git panel with staging, commits, history
- [x] Cmd+W to close focused pane (instead of window)
- [x] Pane focus indicator (lighter tab bar background)

## Git Panel Improvements

- [ ] Show file diff in modal/popup window (as an alternative to inline)
- [ ] Inline file editing in diff viewer
- [ ] Right-click file to open in default editor or VSCode

## Terminals

- [ ] Rename anonymous terminal tabs (double-click tab to edit name)

## Agent Integration

- [ ] First-class skills support — dedicated panes for viewing/editing skills (SKILL.md files)
- [x] Dedicated panes for CLAUDE.md, AGENTS.md, and other agent config files — surface them in the UI instead of requiring terminal navigation

## Code Editor

- [ ] Create new files directly from the editor file tree
- [ ] Watch filesystem for changes — when files are created/deleted outside aTerm, update the file tree in real-time

## Window Management

- [ ] Detachable windows (see docs/plans/detachable-panes.md)
  - [ ] Detachable panes - pop out a single terminal into its own window
  - [ ] Detachable projects - pop out an entire project (all terminals) into its own window
  - Shared infrastructure: Rust window manager, URL-based routing, WindowShell component

## Performance

- [ ] Investigate typing lag with large scrollback (~1300+ lines) - possibly WebGL context loss or xterm.js issue
  - Check: https://github.com/xtermjs/xterm.js/issues/5447 (GPU lag Dec 2025)
  - Try: recreate WebGL addon on context loss instead of falling back to canvas
  - Try: reduce default scrollback for AI assistant profiles
  - Try: add "lightweight mode" that disables some addons for long sessions
