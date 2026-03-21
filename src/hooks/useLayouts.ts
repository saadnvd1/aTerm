import { useState, useEffect } from "react";
import { AppConfig, ProjectConfig } from "../lib/config";
import type { Layout } from "../lib/layouts";
import { killPty } from "../components/terminal-pane";

interface UseLayoutsProps {
  config: AppConfig;
  updateConfig: (config: AppConfig) => void;
  selectedProject: ProjectConfig | null;
}

export function useLayouts({ config, updateConfig, selectedProject }: UseLayoutsProps) {
  const [openedProjects, setOpenedProjects] = useState<Set<string>>(new Set());
  const [runtimeLayouts, setRuntimeLayouts] = useState<Record<string, Layout>>({});
  const [pendingFocusPaneId, setPendingFocusPaneId] = useState<string | null>(null);

  // Initialize runtime layout when project is first opened
  useEffect(() => {
    if (selectedProject && !selectedProject.deactivated && !openedProjects.has(selectedProject.id)) {
      setOpenedProjects((prev) => new Set([...prev, selectedProject.id]));
      const savedLayout = config.layouts.find((l) => l.id === selectedProject.layoutId) || config.layouts[0];
      if (savedLayout && !runtimeLayouts[selectedProject.id]) {
        setRuntimeLayouts((prev) => ({
          ...prev,
          [selectedProject.id]: JSON.parse(JSON.stringify(savedLayout)),
        }));
      }
    }
  }, [selectedProject, openedProjects, config.layouts, runtimeLayouts]);

  function handleRuntimeLayoutChange(projectId: string, newLayout: Layout) {
    setRuntimeLayouts((prev) => ({ ...prev, [projectId]: newLayout }));
  }

  function handlePersistentLayoutChange(projectId: string, newLayout: Layout) {
    setRuntimeLayouts((prev) => ({ ...prev, [projectId]: newLayout }));

    const project = config.projects.find((p) => p.id === projectId);
    if (!project) return;

    const projectSpecificLayoutId = `project-${projectId}`;
    const hasProjectSpecificLayout = config.layouts.some((l) => l.id === projectSpecificLayoutId);

    if (hasProjectSpecificLayout || project.layoutId === projectSpecificLayoutId) {
      const newLayouts = config.layouts.map((l) =>
        l.id === projectSpecificLayoutId
          ? { ...l, rows: JSON.parse(JSON.stringify(newLayout.rows)) }
          : l
      );
      updateConfig({ ...config, layouts: newLayouts });
    } else {
      const newLayoutObj: Layout = {
        id: projectSpecificLayoutId,
        name: `${project.name} Layout`,
        rows: JSON.parse(JSON.stringify(newLayout.rows)),
      };
      const newProjects = config.projects.map((p) =>
        p.id === projectId ? { ...p, layoutId: projectSpecificLayoutId } : p
      );
      updateConfig({
        ...config,
        layouts: [...config.layouts, newLayoutObj],
        projects: newProjects,
      });
    }
  }

  function handleSaveWindowArrangement(projectId: string) {
    const project = config.projects.find((p) => p.id === projectId);
    const runtimeLayout = runtimeLayouts[projectId];
    if (!project || !runtimeLayout) return;

    const projectSpecificLayoutId = `project-${projectId}`;
    const hasProjectSpecificLayout = config.layouts.some((l) => l.id === projectSpecificLayoutId);

    if (hasProjectSpecificLayout) {
      const newLayouts = config.layouts.map((l) =>
        l.id === projectSpecificLayoutId
          ? { ...l, rows: JSON.parse(JSON.stringify(runtimeLayout.rows)) }
          : l
      );
      updateConfig({ ...config, layouts: newLayouts });
    } else {
      const newLayout: Layout = {
        id: projectSpecificLayoutId,
        name: `${project.name} Layout`,
        rows: JSON.parse(JSON.stringify(runtimeLayout.rows)),
      };
      const newProjects = config.projects.map((p) =>
        p.id === projectId ? { ...p, layoutId: projectSpecificLayoutId } : p
      );
      updateConfig({
        ...config,
        layouts: [...config.layouts, newLayout],
        projects: newProjects,
      });
    }
  }

  function handleRestoreWindowArrangement(projectId: string) {
    const project = config.projects.find((p) => p.id === projectId);
    if (!project) return;

    const savedLayout = config.layouts.find((l) => l.id === project.layoutId) || config.layouts[0];
    if (savedLayout) {
      setRuntimeLayouts((prev) => ({
        ...prev,
        [projectId]: JSON.parse(JSON.stringify(savedLayout)),
      }));
    }
  }

  function handleAddGitPane() {
    if (!selectedProject) return;

    const layout = runtimeLayouts[selectedProject.id];
    if (!layout || layout.rows.length === 0) return;

    // Find existing git pane
    let gitPaneLocation: { rowIndex: number; paneIndex: number } | null = null;
    for (let rowIndex = 0; rowIndex < layout.rows.length; rowIndex++) {
      const row = layout.rows[rowIndex];
      for (let paneIndex = 0; paneIndex < row.panes.length; paneIndex++) {
        const pane = row.panes[paneIndex];
        const profile = config.profiles.find((p) => p.id === pane.profileId);
        if (profile?.type === "git") {
          gitPaneLocation = { rowIndex, paneIndex };
          break;
        }
      }
      if (gitPaneLocation) break;
    }

    if (gitPaneLocation) {
      // Remove the git pane (toggle off)
      const totalPanes = layout.rows.reduce((acc, r) => acc + r.panes.length, 0);
      if (totalPanes <= 1) return; // Don't remove the last pane

      const newRows = layout.rows
        .map((row, rowIndex) => {
          if (rowIndex !== gitPaneLocation!.rowIndex) return row;
          return {
            ...row,
            panes: row.panes.filter((_, i) => i !== gitPaneLocation!.paneIndex),
          };
        })
        .filter((row) => row.panes.length > 0);

      handleRuntimeLayoutChange(selectedProject.id, { ...layout, rows: newRows });
    } else {
      // Add a new git pane (toggle on)
      const newPane = { id: crypto.randomUUID(), profileId: "git", flex: 1 };
      const newRows = layout.rows.map((row, index) => {
        if (index === 0) {
          return { ...row, panes: [...row.panes, newPane] };
        }
        return row;
      });

      handleRuntimeLayoutChange(selectedProject.id, { ...layout, rows: newRows });
      setPendingFocusPaneId(newPane.id);
    }
  }

  function handleAddEditorPane() {
    if (!selectedProject) return;

    const layout = runtimeLayouts[selectedProject.id];
    if (!layout || layout.rows.length === 0) return;

    // Check if an editor pane already exists
    let editorPaneLocation: { rowIndex: number; paneIndex: number } | null = null;
    for (let rowIndex = 0; rowIndex < layout.rows.length; rowIndex++) {
      const row = layout.rows[rowIndex];
      for (let paneIndex = 0; paneIndex < row.panes.length; paneIndex++) {
        const pane = row.panes[paneIndex];
        const profile = config.profiles.find((p) => p.id === pane.profileId);
        if (profile?.type === "editor") {
          editorPaneLocation = { rowIndex, paneIndex };
          break;
        }
      }
      if (editorPaneLocation) break;
    }

    if (editorPaneLocation) {
      // Remove the editor pane (toggle off)
      const totalPanes = layout.rows.reduce((acc, r) => acc + r.panes.length, 0);
      if (totalPanes <= 1) return; // Don't remove the last pane

      const newRows = layout.rows
        .map((row, rowIndex) => {
          if (rowIndex !== editorPaneLocation!.rowIndex) return row;
          return {
            ...row,
            panes: row.panes.filter((_, i) => i !== editorPaneLocation!.paneIndex),
          };
        })
        .filter((row) => row.panes.length > 0);

      handleRuntimeLayoutChange(selectedProject.id, { ...layout, rows: newRows });
    } else {
      // Add a new editor pane (toggle on)
      const newPane = { id: crypto.randomUUID(), profileId: "editor", flex: 1 };
      const newRows = layout.rows.map((row, index) => {
        if (index === 0) {
          return { ...row, panes: [...row.panes, newPane] };
        }
        return row;
      });

      handleRuntimeLayoutChange(selectedProject.id, { ...layout, rows: newRows });
      setPendingFocusPaneId(newPane.id);
    }
  }

  // Ensure an editor pane exists (doesn't toggle off if already exists)
  function ensureEditorPane(): boolean {
    if (!selectedProject) return false;

    const layout = runtimeLayouts[selectedProject.id];
    if (!layout || layout.rows.length === 0) return false;

    // Check if an editor pane already exists
    const hasEditorPane = layout.rows.some((row) =>
      row.panes.some((pane) => {
        const profile = config.profiles.find((p) => p.id === pane.profileId);
        return profile?.type === "editor";
      })
    );

    if (hasEditorPane) {
      return true; // Already exists
    }

    // Add a new editor pane
    const newPane = { id: crypto.randomUUID(), profileId: "editor", flex: 1 };
    const newRows = layout.rows.map((row, index) => {
      if (index === 0) {
        return { ...row, panes: [...row.panes, newPane] };
      }
      return row;
    });

    handleRuntimeLayoutChange(selectedProject.id, { ...layout, rows: newRows });
    return true;
  }

  // Deactivate a project: kill all PTYs, remove from opened set
  function deactivateProject(projectId: string) {
    // Kill all PTYs for this project
    const layout = runtimeLayouts[projectId];
    if (layout) {
      for (const row of layout.rows) {
        for (const pane of row.panes) {
          const terminalId = `${projectId}-${pane.id}`;
          killPty(terminalId);
        }
      }
    }

    // Remove from opened projects and runtime layouts
    setOpenedProjects((prev) => {
      const next = new Set(prev);
      next.delete(projectId);
      return next;
    });
    setRuntimeLayouts((prev) => {
      const next = { ...prev };
      delete next[projectId];
      return next;
    });

    // Persist deactivated state
    const newProjects = config.projects.map((p) =>
      p.id === projectId ? { ...p, deactivated: true } : p
    );
    updateConfig({ ...config, projects: newProjects });
  }

  // Reactivate a project: clear deactivated flag (terminals will spawn on next select)
  function reactivateProject(projectId: string) {
    const newProjects = config.projects.map((p) =>
      p.id === projectId ? { ...p, deactivated: undefined } : p
    );
    updateConfig({ ...config, projects: newProjects });
  }

  // Cleanup when projects are removed
  function cleanupRemovedProjects(projectIds: Set<string>) {
    const newOpened = new Set([...openedProjects].filter((id) => projectIds.has(id)));
    if (newOpened.size !== openedProjects.size) {
      setOpenedProjects(newOpened);
    }

    const newRuntimeLayouts = { ...runtimeLayouts };
    for (const id of Object.keys(newRuntimeLayouts)) {
      if (!projectIds.has(id)) {
        delete newRuntimeLayouts[id];
      }
    }
    setRuntimeLayouts(newRuntimeLayouts);
  }

  return {
    openedProjects,
    runtimeLayouts,
    pendingFocusPaneId,
    clearPendingFocusPaneId: () => setPendingFocusPaneId(null),
    handleRuntimeLayoutChange,
    handlePersistentLayoutChange,
    handleSaveWindowArrangement,
    handleRestoreWindowArrangement,
    handleAddGitPane,
    handleAddEditorPane,
    ensureEditorPane,
    deactivateProject,
    reactivateProject,
    cleanupRemovedProjects,
  };
}
