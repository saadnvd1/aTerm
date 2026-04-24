import { useEffect } from "react";
import type { ProjectConfig } from "../lib/config";

interface UseKeyboardShortcutsProps {
  projects: ProjectConfig[];
  selectedProject: ProjectConfig | null;
  onSelectProject: (project: ProjectConfig) => void;
  onToggleSidebar: () => void;
  onOpenScratchNotes: () => void;
  onAddEditorPane?: () => void;
  onAddGitPane?: () => void;
  onOpenFileSearch?: () => void;
  onOpenNewTerminalModal?: () => void;
  onToggleZenMode?: () => void;
  onPrevTab?: () => void;
  onNextTab?: () => void;
}

export function useKeyboardShortcuts({
  projects,
  selectedProject,
  onSelectProject,
  onToggleSidebar,
  onOpenScratchNotes,
  onAddEditorPane,
  onAddGitPane,
  onOpenFileSearch,
  onOpenNewTerminalModal,
  onToggleZenMode,
  onPrevTab,
  onNextTab,
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd+1-9: Switch projects
      if (e.metaKey && e.key >= "1" && e.key <= "9") {
        const index = parseInt(e.key, 10) - 1;
        if (index < projects.length) {
          e.preventDefault();
          onSelectProject(projects[index]);
        }
      }
      // Cmd+B: Toggle sidebar
      if (e.metaKey && e.key === "b") {
        e.preventDefault();
        onToggleSidebar();
      }
      // Cmd+Shift+N: Open scratch notes
      if (e.metaKey && e.shiftKey && e.key.toLowerCase() === "n") {
        if (selectedProject) {
          e.preventDefault();
          onOpenScratchNotes();
        }
      }
      // Cmd+Shift+E: Toggle editor pane
      if (e.metaKey && e.shiftKey && e.key.toLowerCase() === "e") {
        if (selectedProject && onAddEditorPane) {
          e.preventDefault();
          onAddEditorPane();
        }
      }
      // Cmd+Shift+G: Toggle git panel
      if (e.metaKey && e.shiftKey && e.key.toLowerCase() === "g") {
        if (selectedProject && onAddGitPane) {
          e.preventDefault();
          onAddGitPane();
        }
      }
      // Cmd+P: Open file search
      if (e.metaKey && !e.shiftKey && e.key.toLowerCase() === "p") {
        if (selectedProject && onOpenFileSearch) {
          e.preventDefault();
          onOpenFileSearch();
        }
      }
      // Cmd+N or Cmd+T: Open new terminal modal
      if (e.metaKey && !e.shiftKey && (e.key.toLowerCase() === "n" || e.key.toLowerCase() === "t")) {
        if (onOpenNewTerminalModal) {
          e.preventDefault();
          onOpenNewTerminalModal();
        }
      }
      // Cmd+Shift+[ / ]: Previous/Next tab
      if (e.metaKey && e.shiftKey && (e.key === "[" || e.key === "{") && onPrevTab) {
        e.preventDefault();
        onPrevTab();
      }
      if (e.metaKey && e.shiftKey && (e.key === "]" || e.key === "}") && onNextTab) {
        e.preventDefault();
        onNextTab();
      }
      // Shift+Cmd+Z: Toggle zen mode
      if (e.metaKey && e.shiftKey && e.key.toLowerCase() === "z") {
        if (onToggleZenMode) {
          e.preventDefault();
          onToggleZenMode();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [projects, selectedProject, onSelectProject, onToggleSidebar, onOpenScratchNotes, onAddEditorPane, onAddGitPane, onOpenFileSearch, onOpenNewTerminalModal, onToggleZenMode, onPrevTab, onNextTab]);
}
