import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ATSectionHeader } from "@/components/ui/at-section-header";
import { useTheme } from "../../context/ThemeContext";
import { getThemeList } from "../../lib/themes";

interface AppearanceTabProps {
  defaultFontSize: number;
  defaultScrollback: number;
  smoothOutput: boolean;
  appVersion: string;
  onFontSizeChange: (size: number) => void;
  onScrollbackChange: (size: number) => void;
  onSmoothOutputChange: (enabled: boolean) => void;
}

export function AppearanceTab({
  defaultFontSize,
  defaultScrollback,
  smoothOutput,
  appVersion,
  onFontSizeChange,
  onScrollbackChange,
  onSmoothOutputChange,
}: AppearanceTabProps) {
  const { themeId, setThemeId } = useTheme();
  const themes = getThemeList();

  return (
    <>
      <div className="mb-6">
        <ATSectionHeader>Theme</ATSectionHeader>
        <div className="grid grid-cols-3 gap-3">
          {themes.map((t) => (
            <ThemeCard
              key={t.id}
              theme={t}
              isSelected={themeId === t.id}
              onSelect={() => setThemeId(t.id)}
            />
          ))}
        </div>
      </div>

      <div className="mb-6">
        <ATSectionHeader>Terminal Font Size</ATSectionHeader>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            min={8}
            max={32}
            value={defaultFontSize}
            onChange={(e) => {
              const size = Math.min(32, Math.max(8, parseInt(e.target.value, 10) || 13));
              onFontSizeChange(size);
            }}
            className="w-20"
          />
          <span className="text-xs text-muted-foreground">
            Default: 13px (range: 8-32)
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          Use Cmd+Plus/Minus in a terminal to adjust individual panes. Per-pane sizes are remembered.
        </p>
      </div>

      <div className="mb-6">
        <ATSectionHeader>Scrollback Buffer</ATSectionHeader>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            min={1000}
            max={100000}
            step={1000}
            value={defaultScrollback}
            onChange={(e) => {
              const size = Math.min(100000, Math.max(1000, parseInt(e.target.value, 10) || 10000));
              onScrollbackChange(size);
            }}
            className="w-24"
          />
          <span className="text-xs text-muted-foreground">
            Default: 10,000 lines (range: 1k-100k)
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          Lines kept in terminal history. Higher values use more memory (~7MB per 10k lines per terminal).
        </p>
      </div>

      <div className="mb-6">
        <ATSectionHeader>Experimental</ATSectionHeader>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm">Smooth Output</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Batches terminal output per frame to reduce screen redraw flicker during AI agent work.
            </p>
          </div>
          <Switch
            checked={smoothOutput}
            onCheckedChange={onSmoothOutputChange}
          />
        </div>
      </div>

      {appVersion && (
        <div className="pt-4 border-t border-border">
          <p className="text-[11px] text-muted-foreground">
            aTerm v{appVersion}
          </p>
        </div>
      )}
    </>
  );
}

interface ThemeCardProps {
  theme: {
    id: string;
    name: string;
    colors: {
      bg: string;
      bgSecondary: string;
      accent: string;
      textMuted: string;
    };
  };
  isSelected: boolean;
  onSelect: () => void;
}

function ThemeCard({ theme, isSelected, onSelect }: ThemeCardProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "p-2 bg-muted border-2 border-transparent rounded-lg cursor-pointer flex flex-col items-center gap-2 transition-all hover:border-muted-foreground/30",
        isSelected && "border-primary"
      )}
    >
      <div
        className="w-full h-[50px] rounded flex overflow-hidden"
        style={{ backgroundColor: theme.colors.bg }}
      >
        <div
          className="w-1/4 h-full"
          style={{ backgroundColor: theme.colors.bgSecondary }}
        />
        <div className="flex-1 p-1.5 flex flex-col gap-1">
          <div
            className="w-2/5 h-1.5 rounded-sm"
            style={{ backgroundColor: theme.colors.accent }}
          />
          <div
            className="w-4/5 h-1 rounded-sm opacity-50"
            style={{ backgroundColor: theme.colors.textMuted }}
          />
          <div
            className="w-3/5 h-1 rounded-sm opacity-50"
            style={{ backgroundColor: theme.colors.textMuted }}
          />
        </div>
      </div>
      <span className="text-[11px] text-muted-foreground">{theme.name}</span>
    </button>
  );
}
