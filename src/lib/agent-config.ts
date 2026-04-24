// Agent config file definitions — which files to surface per agent

export interface AgentConfigFile {
  id: string;
  label: string;
  relativePath: string;
  description: string;
  language: "markdown" | "json" | "yaml" | "plaintext";
  defaultContent?: string;
  /** If true, this entry represents a directory of files (e.g. .claude/skills/) */
  isDirectory?: boolean;
  /** File extension filter for directory entries (e.g. ".md") */
  directoryFilter?: string;
}

export interface AgentGroup {
  id: string;
  name: string;
  icon: string;
  files: AgentConfigFile[];
}

export const AGENT_CONFIG_GROUPS: AgentGroup[] = [
  {
    id: "claude",
    name: "Claude Code",
    icon: "🟣",
    files: [
      {
        id: "claude-md",
        label: "CLAUDE.md",
        relativePath: "CLAUDE.md",
        description: "Project instructions for Claude Code",
        language: "markdown",
        defaultContent: "# Project Instructions\n\nAdd project-specific instructions for Claude Code here.\n",
      },
      {
        id: "claude-settings",
        label: "settings.json",
        relativePath: ".claude/settings.json",
        description: "Claude Code project settings",
        language: "json",
        defaultContent: '{\n  "permissions": {\n    "allow": [],\n    "deny": []\n  }\n}\n',
      },
      {
        id: "claude-settings-local",
        label: "settings.local.json",
        relativePath: ".claude/settings.local.json",
        description: "Local Claude Code settings (gitignored)",
        language: "json",
        defaultContent: '{\n  "permissions": {\n    "allow": [],\n    "deny": []\n  }\n}\n',
      },
      {
        id: "claude-skills",
        label: ".claude/skills/",
        relativePath: ".claude/skills",
        description: "Claude Code skill files (SKILL.md)",
        language: "markdown",
        isDirectory: true,
        directoryFilter: ".md",
      },
      {
        id: "claude-commands",
        label: ".claude/commands/",
        relativePath: ".claude/commands",
        description: "Custom slash commands",
        language: "markdown",
        isDirectory: true,
        directoryFilter: ".md",
      },
    ],
  },
  {
    id: "agents",
    name: "Agents",
    icon: "🤖",
    files: [
      {
        id: "agents-md",
        label: "AGENTS.md",
        relativePath: "AGENTS.md",
        description: "Multi-agent orchestration config",
        language: "markdown",
        defaultContent: "# Agents\n\nDefine agent roles and responsibilities here.\n",
      },
    ],
  },
  {
    id: "codex",
    name: "Codex",
    icon: "🟢",
    files: [
      {
        id: "codex-md",
        label: "codex.md",
        relativePath: "codex.md",
        description: "OpenAI Codex project instructions",
        language: "markdown",
        defaultContent: "# Codex Instructions\n\nAdd project instructions for Codex here.\n",
      },
      {
        id: "codex-agents-md",
        label: "agents.md",
        relativePath: ".codex/agents.md",
        description: "Codex agent definitions",
        language: "markdown",
        defaultContent: "# Codex Agents\n\nDefine Codex agents here.\n",
      },
    ],
  },
  {
    id: "cursor",
    name: "Cursor",
    icon: "🔵",
    files: [
      {
        id: "cursorrules",
        label: ".cursorrules",
        relativePath: ".cursorrules",
        description: "Cursor AI project rules",
        language: "markdown",
        defaultContent: "# Cursor Rules\n\nAdd project-specific rules for Cursor here.\n",
      },
      {
        id: "cursor-mdc",
        label: ".cursor/rules/",
        relativePath: ".cursor/rules",
        description: "Cursor rule files (.mdc)",
        language: "markdown",
        isDirectory: true,
        directoryFilter: ".mdc",
      },
    ],
  },
  {
    id: "copilot",
    name: "GitHub Copilot",
    icon: "⚫",
    files: [
      {
        id: "copilot-instructions",
        label: "copilot-instructions.md",
        relativePath: ".github/copilot-instructions.md",
        description: "GitHub Copilot custom instructions",
        language: "markdown",
        defaultContent: "# Copilot Instructions\n\nAdd project-specific instructions for GitHub Copilot here.\n",
      },
    ],
  },
  {
    id: "general",
    name: "General",
    icon: "📄",
    files: [
      {
        id: "conventions",
        label: "CONVENTIONS.md",
        relativePath: "CONVENTIONS.md",
        description: "Project conventions and standards",
        language: "markdown",
        defaultContent: "# Conventions\n\nDocument project conventions and standards here.\n",
      },
      {
        id: "editorconfig",
        label: ".editorconfig",
        relativePath: ".editorconfig",
        description: "Editor configuration",
        language: "plaintext",
        defaultContent: "root = true\n\n[*]\nindent_style = space\nindent_size = 2\nend_of_line = lf\ncharset = utf-8\ntrim_trailing_whitespace = true\ninsert_final_newline = true\n",
      },
    ],
  },
];

// Flatten all config files for easy lookup
export function getAllConfigFiles(): AgentConfigFile[] {
  return AGENT_CONFIG_GROUPS.flatMap((g) => g.files);
}
