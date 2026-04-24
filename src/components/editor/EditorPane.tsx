import { useState, useEffect, useCallback, useRef } from "react";
import { PaneHeader } from "../PaneHeader";
import { FileExplorer } from "./FileExplorer";
import { EditorTabs } from "./EditorTabs";
import { CodeEditor } from "./CodeEditor";
import { MarkdownEditor } from "./MarkdownEditor";
import { useFileManager } from "../../hooks/useFileManager";

const DEFAULT_FONT_SIZE = 13;
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 24;

interface Props {
  id: string;
  title: string;
  cwd: string;
  accentColor?: string;
  projectColor?: string;
  fontSize?: number;
  onFontSizeChange?: (size: number) => void;
  onFocus?: () => void;
  isFocused?: boolean;
  onClose?: () => void;
  onRename?: (name: string) => void;
  triggerRename?: boolean;
  onTriggerRenameComplete?: () => void;
  canClose?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  pendingFileToOpen?: string | null;
  onPendingFileOpened?: () => void;
}

const DEFAULT_EXPLORER_WIDTH = 200;
const MIN_EXPLORER_WIDTH = 150;
const MAX_EXPLORER_WIDTH = 400;

export function EditorPane({
  title,
  cwd,
  accentColor,
  projectColor,
  fontSize: savedFontSize,
  onFontSizeChange,
  onFocus,
  isFocused,
  onClose,
  onRename,
  triggerRename,
  onTriggerRenameComplete,
  canClose,
  dragHandleProps,
  pendingFileToOpen,
  onPendingFileOpened,
}: Props) {
  const [explorerWidth, setExplorerWidth] = useState(DEFAULT_EXPLORER_WIDTH);
  const [isDraggingResize, setIsDraggingResize] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(savedFontSize ?? DEFAULT_FONT_SIZE);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    openFiles,
    activeFile,
    activeFilePath,
    setActiveFilePath,
    openFile,
    closeFile,
    updateContent,
    saveFile,
  } = useFileManager(cwd);

  // Handle file selection from explorer
  const handleSelectFile = useCallback(
    async (path: string) => {
      setSelectedPath(path);
      try {
        await openFile(path);
      } catch (err) {
        console.error("Failed to open file:", err);
      }
    },
    [openFile]
  );

  // Handle pending file from global search (Cmd+P)
  useEffect(() => {
    if (pendingFileToOpen) {
      handleSelectFile(pendingFileToOpen);
      onPendingFileOpened?.();
    }
  }, [pendingFileToOpen, handleSelectFile, onPendingFileOpened]);

  // Handle tab close
  const handleCloseFile = useCallback(
    async (path: string) => {
      const file = openFiles.find((f) => f.path === path);
      if (file?.isDirty) {
        const action = window.confirm(`Save changes to ${path}?`);
        if (action) {
          await saveFile(path);
        }
      }
      closeFile(path);
    },
    [openFiles, closeFile, saveFile]
  );

  // Handle save
  const handleSave = useCallback(() => {
    if (activeFilePath) {
      saveFile(activeFilePath);
    }
  }, [activeFilePath, saveFile]);

  // Handle resize drag
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingResize(true);

    const startX = e.clientX;
    const startWidth = explorerWidth;

    const onMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      const newWidth = Math.min(
        MAX_EXPLORER_WIDTH,
        Math.max(MIN_EXPLORER_WIDTH, startWidth + delta)
      );
      setExplorerWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsDraggingResize(false);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [explorerWidth]);

  // Auto-focus when pane becomes active
  useEffect(() => {
    if (isFocused && containerRef.current) {
      const timeout = setTimeout(() => {
        containerRef.current?.focus();
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [isFocused]);

  // Keyboard shortcuts (Cmd+P is handled globally in App.tsx)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isFocused) return;

      // Cmd+S to save
      if (e.metaKey && e.key === "s") {
        e.preventDefault();
        handleSave();
      }

      // Cmd+W to close tab
      if (e.metaKey && e.key === "w") {
        e.preventDefault();
        if (activeFilePath) {
          handleCloseFile(activeFilePath);
        }
      }

      // Cmd++ to increase font size
      if (e.metaKey && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        setFontSize((prev) => {
          const newSize = Math.min(prev + 1, MAX_FONT_SIZE);
          onFontSizeChange?.(newSize);
          return newSize;
        });
      }

      // Cmd+- to decrease font size
      if (e.metaKey && e.key === "-") {
        e.preventDefault();
        setFontSize((prev) => {
          const newSize = Math.max(prev - 1, MIN_FONT_SIZE);
          onFontSizeChange?.(newSize);
          return newSize;
        });
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isFocused, activeFilePath, handleSave, handleCloseFile, onFontSizeChange]);

  // Status bar info
  const statusInfo = activeFile
    ? `Ln 1, Col 1 | ${activeFile.language}`
    : null;

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="flex flex-col flex-1 min-h-0 bg-background rounded-lg border border-border overflow-hidden outline-none"
      onClick={onFocus}
    >
      <PaneHeader
        title={title}
        accentColor={accentColor}
        projectColor={projectColor}
        isFocused={isFocused}
        canClose={canClose}
        onClose={onClose}
        onRename={onRename}
        triggerRename={triggerRename}
        onTriggerRenameComplete={onTriggerRenameComplete}
        dragHandleProps={dragHandleProps}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* File Explorer */}
        <div
          className="border-r border-border shrink-0 overflow-hidden"
          style={{ width: explorerWidth }}
        >
          <FileExplorer
            projectRoot={cwd}
            selectedPath={selectedPath}
            onSelectFile={handleSelectFile}
          />
        </div>

        {/* Resize handle */}
        <div
          className={`w-1 cursor-col-resize bg-transparent hover:bg-primary/30 shrink-0 ${
            isDraggingResize ? "bg-primary" : ""
          }`}
          onMouseDown={handleResizeMouseDown}
        />

        {/* Editor area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <EditorTabs
            files={openFiles}
            activeFilePath={activeFilePath}
            onSelectFile={setActiveFilePath}
            onCloseFile={handleCloseFile}
          />

          <div className="flex-1 overflow-hidden">
            {activeFile ? (
              activeFile.language === "markdown" ? (
                <MarkdownEditor
                  content={activeFile.content}
                  fontSize={fontSize}
                  onChange={(value) => updateContent(activeFile.path, value)}
                  onSave={handleSave}
                />
              ) : (
                <CodeEditor
                  content={activeFile.content}
                  language={activeFile.language}
                  filePath={activeFile.path}
                  projectRoot={cwd}
                  fontSize={fontSize}
                  onChange={(value) => updateContent(activeFile.path, value)}
                  onSave={handleSave}
                />
              )
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs h-full">
                <div className="text-center">
                  <p className="mb-1">No file open</p>
                  <p className="text-[11px]">Select a file from the explorer or press ⌘P to search</p>
                </div>
              </div>
            )}
          </div>

          {/* Status bar */}
          {statusInfo && (
            <div className="px-3 py-1 border-t border-border text-[11px] text-muted-foreground bg-secondary shrink-0">
              {statusInfo}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
