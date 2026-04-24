import { cn } from "@/lib/utils";
import { X, Plus } from "lucide-react";
import type { TransientTerminal } from "../lib/transient";
import { TerminalPane } from "./TerminalPane";

interface Props {
  terminals: TransientTerminal[];
  selectedTerminalId: string;
  defaultFontSize: number;
  defaultScrollback: number;
  onSelectTerminal: (id: string) => void;
  onCloseTerminal: (id: string) => void;
  onNewTerminal: () => void;
}

export function TransientTerminalView({
  terminals,
  selectedTerminalId,
  defaultFontSize,
  defaultScrollback,
  onSelectTerminal,
  onCloseTerminal,
  onNewTerminal,
}: Props) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Tab bar */}
      <div className="flex items-center border-b border-border bg-secondary/50 px-1 shrink-0">
        <div className="flex items-center gap-0.5 overflow-x-auto flex-1 py-1">
          {terminals.map((terminal) => {
            const isActive = terminal.id === selectedTerminalId;
            return (
              <button
                key={terminal.id}
                onClick={() => onSelectTerminal(terminal.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border-none cursor-pointer transition-colors group whitespace-nowrap",
                  isActive
                    ? "bg-background text-foreground"
                    : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <span>{terminal.name}</span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTerminal(terminal.id);
                  }}
                  className={cn(
                    "inline-flex items-center justify-center h-4 w-4 rounded-sm hover:bg-foreground/10",
                    isActive ? "opacity-70" : "opacity-0 group-hover:opacity-70"
                  )}
                >
                  <X className="h-3 w-3" />
                </span>
              </button>
            );
          })}
        </div>
        <button
          onClick={onNewTerminal}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 border-none bg-transparent cursor-pointer transition-colors shrink-0"
          title="New Terminal"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Terminal panes - keep all alive, hide inactive */}
      <div className="flex-1 min-h-0 relative">
        {terminals.map((terminal) => {
          const isActive = terminal.id === selectedTerminalId;
          return (
            <div
              key={terminal.id}
              className="absolute inset-0 p-2"
              style={{ display: isActive ? "flex" : "none", flexDirection: "column" }}
            >
              <TerminalPane
                id={`transient-${terminal.id}`}
                title={terminal.name}
                cwd={terminal.cwd}
                defaultFontSize={defaultFontSize}
                scrollback={defaultScrollback}
                isFocused={isActive}
                isProjectActive={isActive}
                canClose={false}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
