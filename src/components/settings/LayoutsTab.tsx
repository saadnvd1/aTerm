import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ATSectionHeader } from "@/components/ui/at-section-header";
import { ATFormField } from "@/components/ui/at-form-field";
import { ATListItem, ATListItemContent } from "@/components/ui/at-list-item";
import { Plus, X } from "lucide-react";
import type { Layout, LayoutRow } from "../../lib/layouts";
import type { TerminalProfile } from "../../lib/profiles";

interface LayoutsTabProps {
  layouts: Layout[];
  profiles: TerminalProfile[];
  onLayoutsChange: (layouts: Layout[]) => void;
}

export function LayoutsTab({ layouts, profiles, onLayoutsChange }: LayoutsTabProps) {
  const [editingLayout, setEditingLayout] = useState<Layout | null>(null);

  function handleLayoutSave(layout: Layout) {
    const exists = layouts.some((l) => l.id === layout.id);
    const newLayouts = exists
      ? layouts.map((l) => (l.id === layout.id ? layout : l))
      : [...layouts, layout];
    onLayoutsChange(newLayouts);
    setEditingLayout(null);
  }

  function handleLayoutDelete(layoutId: string) {
    onLayoutsChange(layouts.filter((l) => l.id !== layoutId));
  }

  return (
    <div className="mb-6">
      <ATSectionHeader
        actions={
          <Button
            size="sm"
            className="h-6 text-[11px]"
            onClick={() =>
              setEditingLayout({
                id: crypto.randomUUID(),
                name: "",
                rows: [
                  {
                    id: crypto.randomUUID(),
                    flex: 1,
                    panes: [
                      { id: crypto.randomUUID(), profileId: "shell", flex: 1 },
                    ],
                  },
                ],
              })
            }
          >
            <Plus className="h-3 w-3 mr-1" />
            New
          </Button>
        }
      >
        Window Layouts
      </ATSectionHeader>

      {editingLayout ? (
        <LayoutEditor
          layout={editingLayout}
          profiles={profiles}
          onSave={handleLayoutSave}
          onCancel={() => setEditingLayout(null)}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {layouts.map((layout) => (
            <ATListItem
              key={layout.id}
              actions={
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => setEditingLayout(layout)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="h-6 w-6"
                    onClick={() => handleLayoutDelete(layout.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </>
              }
            >
              <ATListItemContent
                title={layout.name}
                subtitle={`${layout.rows.reduce((acc, r) => acc + r.panes.length, 0)} panes`}
                icon={<LayoutPreview layout={layout} profiles={profiles} />}
              />
            </ATListItem>
          ))}
        </div>
      )}
    </div>
  );
}

function LayoutEditor({
  layout,
  profiles,
  onSave,
  onCancel,
}: {
  layout: Layout;
  profiles: TerminalProfile[];
  onSave: (l: Layout) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(layout.name);
  const [rows, setRows] = useState(layout.rows);

  function handleSave() {
    if (!name.trim()) return;
    onSave({ ...layout, name: name.trim(), rows });
  }

  function addRow() {
    setRows([
      ...rows,
      {
        id: crypto.randomUUID(),
        flex: 1,
        panes: [{ id: crypto.randomUUID(), profileId: "shell", flex: 1 }],
      },
    ]);
  }

  function addPane(rowId: string) {
    setRows(
      rows.map((r) =>
        r.id === rowId
          ? {
              ...r,
              panes: [
                ...r.panes,
                { id: crypto.randomUUID(), profileId: "shell", flex: 1 },
              ],
            }
          : r
      )
    );
  }

  function removePane(rowId: string, paneId: string) {
    setRows(
      rows
        .map((r) =>
          r.id === rowId
            ? { ...r, panes: r.panes.filter((p) => p.id !== paneId) }
            : r
        )
        .filter((r) => r.panes.length > 0)
    );
  }

  function updatePaneProfile(rowId: string, paneId: string, profileId: string) {
    setRows(
      rows.map((r) =>
        r.id === rowId
          ? {
              ...r,
              panes: r.panes.map((p) =>
                p.id === paneId ? { ...p, profileId } : p
              ),
            }
          : r
      )
    );
  }

  return (
    <div className="flex flex-col gap-3.5 p-4 bg-muted rounded-lg border border-border">
      <ATFormField label="Name">
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., AI + Dev + Shell"
        />
      </ATFormField>

      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Pane Configuration
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[10px]"
            onClick={addRow}
          >
            <Plus className="h-3 w-3 mr-1" />
            Row
          </Button>
        </div>

        {rows.map((row, rowIndex) => (
          <LayoutRowEditor
            key={row.id}
            row={row}
            rowIndex={rowIndex}
            rowCount={rows.length}
            profiles={profiles}
            onAddPane={() => addPane(row.id)}
            onRemovePane={(paneId) => removePane(row.id, paneId)}
            onRemoveRow={() => setRows(rows.filter((r) => r.id !== row.id))}
            onUpdatePaneProfile={(paneId, profileId) =>
              updatePaneProfile(row.id, paneId, profileId)
            }
          />
        ))}
      </div>

      <div className="flex justify-end gap-2 mt-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave}>
          Save
        </Button>
      </div>
    </div>
  );
}

function LayoutRowEditor({
  row,
  rowIndex,
  rowCount,
  profiles,
  onAddPane,
  onRemovePane,
  onRemoveRow,
  onUpdatePaneProfile,
}: {
  row: LayoutRow;
  rowIndex: number;
  rowCount: number;
  profiles: TerminalProfile[];
  onAddPane: () => void;
  onRemovePane: (paneId: string) => void;
  onRemoveRow: () => void;
  onUpdatePaneProfile: (paneId: string, profileId: string) => void;
}) {
  return (
    <div className="p-2.5 bg-background rounded border border-border">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[10px] text-muted-foreground font-medium">
          Row {rowIndex + 1}
        </span>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-5 text-[10px] px-2"
            onClick={onAddPane}
          >
            <Plus className="h-2.5 w-2.5 mr-0.5" />
            Pane
          </Button>
          {rowCount > 1 && (
            <Button
              variant="outline"
              size="icon-sm"
              className="h-5 w-5"
              onClick={onRemoveRow}
              title="Remove row"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      <div className="flex gap-1.5">
        {row.panes.map((pane) => (
          <div key={pane.id} className="flex-1 flex gap-1">
            <Select
              value={pane.profileId}
              onValueChange={(v) => onUpdatePaneProfile(pane.id, v)}
            >
              <SelectTrigger className="flex-1 h-7 text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {row.panes.length > 1 && (
              <Button
                variant="outline"
                size="icon-sm"
                className="h-7 w-6"
                onClick={() => onRemovePane(pane.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function LayoutPreview({
  layout,
  profiles,
}: {
  layout: Layout;
  profiles: TerminalProfile[];
}) {
  return (
    <div className="w-9 h-6 flex flex-col gap-px bg-background rounded-sm overflow-hidden shrink-0">
      {layout.rows.map((row) => (
        <div key={row.id} className="flex gap-px" style={{ flex: row.flex }}>
          {row.panes.map((pane) => {
            const profile = profiles.find((p) => p.id === pane.profileId);
            return (
              <div
                key={pane.id}
                className="min-h-1 opacity-80"
                style={{
                  flex: pane.flex,
                  backgroundColor: profile?.color || "#888",
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
