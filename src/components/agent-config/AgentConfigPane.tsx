import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";
import { PaneHeader } from "../PaneHeader";
import { CodeEditor } from "../editor/CodeEditor";
import { MarkdownEditor } from "../editor/MarkdownEditor";
import { AgentConfigSidebar, type DynamicFile } from "./AgentConfigSidebar";
import { AGENT_CONFIG_GROUPS, type AgentConfigFile } from "../../lib/agent-config";

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
}

interface OpenFile {
  configId: string;
  relativePath: string;
  label: string;
  content: string;
  originalContent: string;
  isDirty: boolean;
  language: string;
}

const DEFAULT_FONT_SIZE = 13;
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 24;

export function AgentConfigPane({
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
}: Props) {
  const [existenceMap, setExistenceMap] = useState<Record<string, boolean>>({});
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [fontSize, setFontSize] = useState(savedFontSize ?? DEFAULT_FONT_SIZE);
  const [newFilePrompt, setNewFilePrompt] = useState<AgentConfigFile | null>(null);
  const [newFileName, setNewFileName] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const newFileInputRef = useRef<HTMLInputElement>(null);

  // Check which config files exist
  const checkExistence = useCallback(async () => {
    const allFiles = AGENT_CONFIG_GROUPS.flatMap((g) => g.files);
    const paths = allFiles.map((f) => `${cwd}/${f.relativePath}`);

    try {
      const results = await invoke<boolean[]>("check_files_exist", { paths });
      const map: Record<string, boolean> = {};
      allFiles.forEach((f, i) => {
        map[f.id] = results[i];
      });
      setExistenceMap(map);
    } catch (err) {
      console.error("Failed to check config files:", err);
    }
  }, [cwd]);

  useEffect(() => {
    checkExistence();
  }, [checkExistence]);

  // Open a static config file
  const handleOpenFile = useCallback(
    async (configFile: AgentConfigFile) => {
      const existing = openFiles.find((f) => f.configId === configFile.id);
      if (existing) {
        setActiveFileId(configFile.id);
        return;
      }

      const fullPath = `${cwd}/${configFile.relativePath}`;
      try {
        const content = await invoke<string>("read_file_content", { path: fullPath });
        setOpenFiles((prev) => [
          ...prev,
          {
            configId: configFile.id,
            relativePath: configFile.relativePath,
            label: configFile.label,
            content,
            originalContent: content,
            isDirty: false,
            language: configFile.language,
          },
        ]);
        setActiveFileId(configFile.id);
      } catch (err) {
        console.error("Failed to open config file:", err);
      }
    },
    [cwd, openFiles]
  );

  // Open a dynamic file from a directory
  const handleOpenDynamicFile = useCallback(
    async (dynFile: DynamicFile) => {
      const existing = openFiles.find((f) => f.configId === dynFile.id);
      if (existing) {
        setActiveFileId(dynFile.id);
        return;
      }

      const fullPath = `${cwd}/${dynFile.relativePath}`;
      try {
        const content = await invoke<string>("read_file_content", { path: fullPath });
        setOpenFiles((prev) => [
          ...prev,
          {
            configId: dynFile.id,
            relativePath: dynFile.relativePath,
            label: dynFile.label,
            content,
            originalContent: content,
            isDirty: false,
            language: dynFile.language,
          },
        ]);
        setActiveFileId(dynFile.id);
      } catch (err) {
        console.error("Failed to open dynamic file:", err);
      }
    },
    [cwd, openFiles]
  );

  // Create a static config file with default content
  const handleCreateFile = useCallback(
    async (configFile: AgentConfigFile) => {
      const fullPath = `${cwd}/${configFile.relativePath}`;
      const content = configFile.defaultContent || "";

      try {
        await invoke("create_parent_dirs", { path: fullPath });
        await invoke("write_file_content", { path: fullPath, content });

        setExistenceMap((prev) => ({ ...prev, [configFile.id]: true }));
        setOpenFiles((prev) => [
          ...prev,
          {
            configId: configFile.id,
            relativePath: configFile.relativePath,
            label: configFile.label,
            content,
            originalContent: content,
            isDirty: false,
            language: configFile.language,
          },
        ]);
        setActiveFileId(configFile.id);
      } catch (err) {
        console.error("Failed to create config file:", err);
      }
    },
    [cwd]
  );

  // Prompt to create a new file inside a directory
  const handleCreateInDirectory = useCallback((configFile: AgentConfigFile) => {
    const ext = configFile.directoryFilter || ".md";
    setNewFileName(`new-file${ext}`);
    setNewFilePrompt(configFile);
    setTimeout(() => newFileInputRef.current?.focus(), 50);
  }, []);

  // Confirm creating a new file in a directory
  const confirmNewFile = useCallback(async () => {
    if (!newFilePrompt || !newFileName.trim()) {
      setNewFilePrompt(null);
      return;
    }

    const relativePath = `${newFilePrompt.relativePath}/${newFileName.trim()}`;
    const fullPath = `${cwd}/${relativePath}`;
    const content = "";

    try {
      await invoke("create_parent_dirs", { path: fullPath });
      await invoke("write_file_content", { path: fullPath, content });

      // Ensure directory shows as existing
      setExistenceMap((prev) => ({ ...prev, [newFilePrompt.id]: true }));

      const fileId = `${newFilePrompt.id}:${newFileName.trim()}`;
      setOpenFiles((prev) => [
        ...prev,
        {
          configId: fileId,
          relativePath,
          label: newFileName.trim(),
          content,
          originalContent: content,
          isDirty: false,
          language: newFilePrompt.language,
        },
      ]);
      setActiveFileId(fileId);
    } catch (err) {
      console.error("Failed to create file:", err);
    }

    setNewFilePrompt(null);
  }, [cwd, newFilePrompt, newFileName]);

  // Update content (marks dirty)
  const handleContentChange = useCallback((configId: string, newContent: string) => {
    setOpenFiles((prev) =>
      prev.map((f) => {
        if (f.configId !== configId) return f;
        return { ...f, content: newContent, isDirty: newContent !== f.originalContent };
      })
    );
  }, []);

  // Save file
  const handleSave = useCallback(async () => {
    const file = openFiles.find((f) => f.configId === activeFileId);
    if (!file) return;

    const fullPath = `${cwd}/${file.relativePath}`;
    try {
      await invoke("write_file_content", { path: fullPath, content: file.content });
      setOpenFiles((prev) =>
        prev.map((f) => {
          if (f.configId !== activeFileId) return f;
          return { ...f, originalContent: f.content, isDirty: false };
        })
      );
    } catch (err) {
      console.error("Failed to save:", err);
    }
  }, [cwd, activeFileId, openFiles]);

  // Close a tab
  const handleCloseTab = useCallback(
    (configId: string) => {
      const file = openFiles.find((f) => f.configId === configId);
      if (file?.isDirty) {
        if (window.confirm(`Save changes to ${file.relativePath}?`)) {
          const fullPath = `${cwd}/${file.relativePath}`;
          invoke("write_file_content", { path: fullPath, content: file.content });
        }
      }
      setOpenFiles((prev) => prev.filter((f) => f.configId !== configId));
      if (activeFileId === configId) {
        const remaining = openFiles.filter((f) => f.configId !== configId);
        setActiveFileId(remaining.length > 0 ? remaining[remaining.length - 1].configId : null);
      }
    },
    [cwd, activeFileId, openFiles]
  );

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isFocused) return;

      if (e.metaKey && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      if (e.metaKey && e.key === "w") {
        e.preventDefault();
        if (activeFileId) handleCloseTab(activeFileId);
      }
      if (e.metaKey && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        setFontSize((prev) => {
          const s = Math.min(prev + 1, MAX_FONT_SIZE);
          onFontSizeChange?.(s);
          return s;
        });
      }
      if (e.metaKey && e.key === "-") {
        e.preventDefault();
        setFontSize((prev) => {
          const s = Math.max(prev - 1, MIN_FONT_SIZE);
          onFontSizeChange?.(s);
          return s;
        });
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isFocused, activeFileId, handleSave, handleCloseTab, onFontSizeChange]);

  const activeFile = openFiles.find((f) => f.configId === activeFileId) || null;

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
        {/* Config file sidebar */}
        <AgentConfigSidebar
          cwd={cwd}
          existenceMap={existenceMap}
          activeFileId={activeFileId}
          onOpenFile={handleOpenFile}
          onCreateFile={handleCreateFile}
          onOpenDynamicFile={handleOpenDynamicFile}
          onCreateInDirectory={handleCreateInDirectory}
        />

        {/* Editor area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Tabs */}
          {openFiles.length > 0 && (
            <div className="flex items-center border-b border-border bg-secondary shrink-0 overflow-x-auto">
              {openFiles.map((file) => (
                <button
                  key={file.configId}
                  onClick={() => setActiveFileId(file.configId)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs border-r border-border transition-colors whitespace-nowrap",
                    file.configId === activeFileId
                      ? "bg-background text-foreground"
                      : "text-muted-foreground hover:bg-accent/50"
                  )}
                >
                  <span>{file.label}</span>
                  {file.isDirty && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseTab(file.configId);
                    }}
                    className="ml-1 p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </button>
                </button>
              ))}
            </div>
          )}

          {/* New file name input (shown when creating in directory) */}
          {newFilePrompt && (
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-secondary/80">
              <span className="text-xs text-muted-foreground">
                New file in {newFilePrompt.label}
              </span>
              <input
                ref={newFileInputRef}
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmNewFile();
                  if (e.key === "Escape") setNewFilePrompt(null);
                }}
                className="flex-1 px-2 py-1 text-xs bg-background border border-border rounded outline-none focus:border-primary"
              />
              <button
                onClick={confirmNewFile}
                className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                Create
              </button>
              <button
                onClick={() => setNewFilePrompt(null)}
                className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Editor content */}
          <div className="flex-1 overflow-hidden">
            {activeFile ? (
              activeFile.language === "markdown" ? (
                <MarkdownEditor
                  key={`agent-md-${activeFile.configId}`}
                  content={activeFile.content}
                  fontSize={fontSize}
                  onChange={(value) => handleContentChange(activeFile.configId, value)}
                  onSave={handleSave}
                />
              ) : (
                <CodeEditor
                  content={activeFile.content}
                  language={activeFile.language}
                  filePath={activeFile.relativePath}
                  projectRoot={cwd}
                  fontSize={fontSize}
                  onChange={(value) => handleContentChange(activeFile.configId, value)}
                  onSave={handleSave}
                />
              )
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs h-full">
                <div className="text-center">
                  <p className="mb-1">No config file open</p>
                  <p className="text-[11px]">Select a file from the sidebar to view or edit</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
