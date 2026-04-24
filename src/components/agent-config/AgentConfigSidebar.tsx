import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, Plus } from "lucide-react";
import { AGENT_CONFIG_GROUPS, type AgentConfigFile } from "../../lib/agent-config";

interface Props {
  existenceMap: Record<string, boolean>;
  activeFileId: string | null;
  onOpenFile: (file: AgentConfigFile) => void;
  onCreateFile: (file: AgentConfigFile) => void;
}

export function AgentConfigSidebar({
  existenceMap,
  activeFileId,
  onOpenFile,
  onCreateFile,
}: Props) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Count existing files per group
  const getGroupStats = (groupId: string) => {
    const group = AGENT_CONFIG_GROUPS.find((g) => g.id === groupId);
    if (!group) return { total: 0, existing: 0 };
    const existing = group.files.filter((f) => existenceMap[f.id]).length;
    return { total: group.files.length, existing };
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
          const stats = getGroupStats(group.id);
          const hasAnyFiles = stats.existing > 0;

          return (
            <div key={group.id} className="mb-0.5">
              {/* Group header */}
              <button
                onClick={() => toggleGroup(group.id)}
                className={cn(
                  "w-full flex items-center gap-1.5 px-2 py-1.5 text-left transition-colors hover:bg-accent/50",
                  hasAnyFiles ? "text-foreground" : "text-muted-foreground"
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
                {stats.existing > 0 && (
                  <span className="text-[10px] text-muted-foreground bg-accent/50 px-1.5 py-0.5 rounded-full">
                    {stats.existing}
                  </span>
                )}
              </button>

              {/* Group files */}
              {!isCollapsed && (
                <div className="ml-3">
                  {group.files.map((file) => {
                    const exists = existenceMap[file.id];
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
                        {/* Existence indicator */}
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
