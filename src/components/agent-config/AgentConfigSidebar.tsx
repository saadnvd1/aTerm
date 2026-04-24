import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";
import { ChevronRight, Plus, FolderOpen } from "lucide-react";
import { AGENT_CONFIG_GROUPS, type AgentConfigFile } from "../../lib/agent-config";

interface DirFileEntry {
  name: string;
  path: string;
  is_dir: boolean;
}

/** A dynamically discovered file inside a directory entry */
export interface DynamicFile {
  id: string;
  label: string;
  relativePath: string;
  language: string;
  parentConfigId: string;
}

interface Props {
  cwd: string;
  existenceMap: Record<string, boolean>;
  activeFileId: string | null;
  onOpenFile: (file: AgentConfigFile) => void;
  onCreateFile: (file: AgentConfigFile) => void;
  onOpenDynamicFile: (file: DynamicFile) => void;
  onCreateInDirectory: (configFile: AgentConfigFile) => void;
}

export function AgentConfigSidebar({
  cwd,
  existenceMap,
  activeFileId,
  onOpenFile,
  onCreateFile,
  onOpenDynamicFile,
  onCreateInDirectory,
}: Props) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [dirChildren, setDirChildren] = useState<Record<string, DynamicFile[]>>({});

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.has(groupId) ? next.delete(groupId) : next.add(groupId);
      return next;
    });
  };

  // Load directory contents
  const loadDirContents = useCallback(
    async (configFile: AgentConfigFile) => {
      try {
        const entries = await invoke<DirFileEntry[]>("list_dir_files", {
          root: cwd,
          relativePath: configFile.relativePath,
        });

        const files: DynamicFile[] = entries
          .filter((e) => {
            if (e.is_dir) return false;
            if (configFile.directoryFilter) {
              return e.name.endsWith(configFile.directoryFilter);
            }
            return true;
          })
          .map((e) => {
            // Show path relative to the config directory (e.g. "subdir/file.md" not just "file.md")
            const prefix = configFile.relativePath + "/";
            const displayPath = e.path.startsWith(prefix) ? e.path.slice(prefix.length) : e.name;
            return {
              id: `${configFile.id}:${e.path}`,
              label: displayPath,
              relativePath: e.path,
              language: configFile.language,
              parentConfigId: configFile.id,
            };
          });

        setDirChildren((prev) => ({ ...prev, [configFile.id]: files }));
      } catch {
        setDirChildren((prev) => ({ ...prev, [configFile.id]: [] }));
      }
    },
    [cwd]
  );

  // Auto-load directory contents for existing directories
  useEffect(() => {
    for (const group of AGENT_CONFIG_GROUPS) {
      for (const file of group.files) {
        if (file.isDirectory && existenceMap[file.id]) {
          loadDirContents(file);
        }
      }
    }
  }, [existenceMap, loadDirContents]);

  const toggleDir = (configFile: AgentConfigFile) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(configFile.id)) {
        next.delete(configFile.id);
      } else {
        next.add(configFile.id);
        // Load contents if not already loaded
        if (!dirChildren[configFile.id]) {
          loadDirContents(configFile);
        }
      }
      return next;
    });
  };

  // Count existing files per group (including directory existence)
  const getGroupExistingCount = (groupId: string) => {
    const group = AGENT_CONFIG_GROUPS.find((g) => g.id === groupId);
    if (!group) return 0;
    return group.files.filter((f) => existenceMap[f.id]).length;
  };

  return (
    <div className="w-[200px] border-r border-border shrink-0 overflow-y-auto bg-secondary/50">
      <div className="px-3 py-2 border-b border-border">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Config Files
        </span>
      </div>

      <div className="py-1">
        {AGENT_CONFIG_GROUPS.map((group) => {
          const isCollapsed = collapsedGroups.has(group.id);
          const existingCount = getGroupExistingCount(group.id);

          return (
            <div key={group.id} className="mb-0.5">
              {/* Group header */}
              <button
                onClick={() => toggleGroup(group.id)}
                className={cn(
                  "w-full flex items-center gap-1.5 px-2 py-1.5 text-left transition-colors hover:bg-accent/50",
                  existingCount > 0 ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <ChevronRight
                  className={cn(
                    "h-3 w-3 shrink-0 transition-transform",
                    !isCollapsed && "rotate-90"
                  )}
                />
                <span className="text-sm shrink-0">{group.icon}</span>
                <span className="text-[12px] font-medium flex-1 truncate">{group.name}</span>
                {existingCount > 0 && (
                  <span className="text-[10px] text-muted-foreground bg-accent/50 px-1.5 py-0.5 rounded-full">
                    {existingCount}
                  </span>
                )}
              </button>

              {/* Group files */}
              {!isCollapsed && (
                <div className="ml-3">
                  {group.files.map((file) => {
                    const exists = existenceMap[file.id];

                    if (file.isDirectory) {
                      return (
                        <DirectoryEntry
                          key={file.id}
                          file={file}
                          exists={exists}
                          isExpanded={expandedDirs.has(file.id)}
                          children={dirChildren[file.id] || []}
                          activeFileId={activeFileId}
                          onToggle={() => toggleDir(file)}
                          onOpenDynamicFile={onOpenDynamicFile}
                          onCreateInDirectory={() => onCreateInDirectory(file)}
                        />
                      );
                    }

                    const isActive = activeFileId === file.id;
                    return (
                      <div
                        key={file.id}
                        className={cn(
                          "group flex items-center gap-1.5 px-2 py-1 rounded-sm transition-colors cursor-pointer",
                          isActive
                            ? "bg-accent text-foreground"
                            : exists
                              ? "text-foreground/80 hover:bg-accent/50"
                              : "text-muted-foreground/60 hover:bg-accent/30"
                        )}
                        onClick={() => (exists ? onOpenFile(file) : undefined)}
                        title={file.description}
                      >
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0",
                            exists ? "bg-emerald-500" : "bg-muted-foreground/30"
                          )}
                        />
                        <span className="text-[11px] flex-1 truncate font-mono">
                          {file.label}
                        </span>
                        {!exists && file.defaultContent && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onCreateFile(file);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-opacity"
                            title={`Create ${file.label}`}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DirectoryEntry({
  file,
  exists,
  isExpanded,
  children,
  activeFileId,
  onToggle,
  onOpenDynamicFile,
  onCreateInDirectory,
}: {
  file: AgentConfigFile;
  exists: boolean;
  isExpanded: boolean;
  children: DynamicFile[];
  activeFileId: string | null;
  onToggle: () => void;
  onOpenDynamicFile: (file: DynamicFile) => void;
  onCreateInDirectory: () => void;
}) {
  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1.5 px-2 py-1 rounded-sm transition-colors cursor-pointer",
          exists ? "text-foreground/80 hover:bg-accent/50" : "text-muted-foreground/60 hover:bg-accent/30"
        )}
        onClick={() => exists && onToggle()}
        title={file.description}
      >
        {exists ? (
          <ChevronRight
            className={cn(
              "h-3 w-3 shrink-0 transition-transform",
              isExpanded && "rotate-90"
            )}
          />
        ) : (
          <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-muted-foreground/30 ml-[1px] mr-[1px]" />
        )}
        <FolderOpen className="h-3 w-3 shrink-0 text-muted-foreground" />
        <span className="text-[11px] flex-1 truncate font-mono">{file.label}</span>
        {exists && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreateInDirectory();
            }}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-opacity"
            title={`New file in ${file.label}`}
          >
            <Plus className="h-3 w-3" />
          </button>
        )}
      </div>

      {isExpanded && exists && (
        <div className="ml-4">
          {children.length === 0 ? (
            <div className="px-2 py-1 text-[10px] text-muted-foreground/50 italic">
              Empty
            </div>
          ) : (
            children.map((child) => {
              const isActive = activeFileId === child.id;
              return (
                <div
                  key={child.id}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-sm transition-colors cursor-pointer",
                    isActive
                      ? "bg-accent text-foreground"
                      : "text-foreground/80 hover:bg-accent/50"
                  )}
                  onClick={() => onOpenDynamicFile(child)}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-emerald-500" />
                  <span className="text-[11px] flex-1 truncate font-mono">{child.label}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
