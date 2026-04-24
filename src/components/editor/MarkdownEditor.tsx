/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2026 Saad Naveed. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { useRef, useEffect } from "react";
import { EditorView, keymap, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { EditorState, RangeSetBuilder, Compartment } from "@codemirror/state";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { defaultKeymap, indentWithTab, history, historyKeymap } from "@codemirror/commands";
import { syntaxTree, ensureSyntaxTree } from "@codemirror/language";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import type { SyntaxNodeRef } from "@lezer/common";


interface Props {
  content: string;
  fontSize?: number;
  onChange: (value: string) => void;
  onSave?: () => void;
}

// ============================================================
// Rich Markdown Decorations — Obsidian-style inline rendering
// ============================================================

const hiddenMark = Decoration.mark({ class: "cm-md-hidden" });
const boldMark = Decoration.mark({ class: "cm-md-bold" });
const italicMark = Decoration.mark({ class: "cm-md-italic" });
const strikeMark = Decoration.mark({ class: "cm-md-strikethrough" });
const inlineCodeMark = Decoration.mark({ class: "cm-md-inline-code" });
const linkTextMark = Decoration.mark({ class: "cm-md-link-text" });

const headingMarks = [
  Decoration.mark({ class: "cm-md-heading cm-md-h1" }),
  Decoration.mark({ class: "cm-md-heading cm-md-h2" }),
  Decoration.mark({ class: "cm-md-heading cm-md-h3" }),
  Decoration.mark({ class: "cm-md-heading cm-md-h4" }),
  Decoration.mark({ class: "cm-md-heading cm-md-h5" }),
  Decoration.mark({ class: "cm-md-heading cm-md-h6" }),
];

const blockquoteMark = Decoration.line({ class: "cm-md-blockquote-line" });

function cursorOnLine(view: EditorView, from: number, to: number): boolean {
  const doc = view.state.doc;
  const lineStart = doc.lineAt(from).number;
  const lineEnd = doc.lineAt(to).number;
  for (const range of view.state.selection.ranges) {
    const cursorLine = doc.lineAt(range.head).number;
    if (cursorLine >= lineStart && cursorLine <= lineEnd) return true;
  }
  return false;
}

const richMarkdownPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = this.build(update.view);
      }
    }
    build(view: EditorView): DecorationSet {
      const doc = view.state.doc;
      const marks: { from: number; to: number; dec: Decoration }[] = [];
      const lines: { pos: number; dec: Decoration }[] = [];

      ensureSyntaxTree(view.state, view.viewport.to, 100);

      syntaxTree(view.state).iterate({
        enter: (node: SyntaxNodeRef) => {
          const { from, to, name } = node;
          const cursorNear = cursorOnLine(view, from, to);

          switch (name) {
            case "ATXHeading1":
            case "ATXHeading2":
            case "ATXHeading3":
            case "ATXHeading4":
            case "ATXHeading5":
            case "ATXHeading6": {
              const level = parseInt(name.slice(-1));
              marks.push({ from, to, dec: headingMarks[level - 1] });
              break;
            }
            case "HeaderMark": {
              if (!cursorNear) {
                const after = doc.sliceString(to, to + 1);
                const end = after === " " ? to + 1 : to;
                marks.push({ from, to: end, dec: hiddenMark });
              }
              break;
            }
            case "StrongEmphasis": {
              marks.push({ from, to, dec: boldMark });
              if (!cursorNear) {
                marks.push({ from, to: from + 2, dec: hiddenMark });
                marks.push({ from: to - 2, to, dec: hiddenMark });
              }
              break;
            }
            case "Emphasis": {
              marks.push({ from, to, dec: italicMark });
              if (!cursorNear) {
                marks.push({ from, to: from + 1, dec: hiddenMark });
                marks.push({ from: to - 1, to, dec: hiddenMark });
              }
              break;
            }
            case "Strikethrough": {
              marks.push({ from, to, dec: strikeMark });
              if (!cursorNear) {
                marks.push({ from, to: from + 2, dec: hiddenMark });
                marks.push({ from: to - 2, to, dec: hiddenMark });
              }
              break;
            }
            case "InlineCode": {
              marks.push({ from, to, dec: inlineCodeMark });
              if (!cursorNear) {
                marks.push({ from, to: from + 1, dec: hiddenMark });
                marks.push({ from: to - 1, to, dec: hiddenMark });
              }
              break;
            }
            case "Link": {
              if (!cursorNear) {
                const content = doc.sliceString(from, to);
                const bracketEnd = content.indexOf("]");
                if (bracketEnd > 0) {
                  marks.push({ from: from + 1, to: from + bracketEnd, dec: linkTextMark });
                  marks.push({ from, to: from + 1, dec: hiddenMark });
                  marks.push({ from: from + bracketEnd, to, dec: hiddenMark });
                }
              }
              break;
            }
            case "QuoteMark": {
              if (!cursorNear) {
                marks.push({ from, to, dec: hiddenMark });
              }
              break;
            }
            case "Blockquote": {
              const startLine = doc.lineAt(from).number;
              const endLine = doc.lineAt(Math.min(to, doc.length)).number;
              for (let i = startLine; i <= endLine; i++) {
                lines.push({ pos: doc.line(i).from, dec: blockquoteMark });
              }
              break;
            }
            case "HorizontalRule": {
              lines.push({ pos: doc.lineAt(from).from, dec: Decoration.line({ class: "cm-md-hr-line" }) });
              if (!cursorNear) {
                marks.push({ from, to, dec: hiddenMark });
              }
              break;
            }
            case "ListMark": {
              if (!cursorNear) {
                const marker = doc.sliceString(from, to);
                if (marker === "-" || marker === "*") {
                  marks.push({ from, to, dec: Decoration.mark({ class: "cm-md-list-bullet" }) });
                }
              }
              break;
            }
          }
        },
      });

      // Sort mark decorations by position (required by RangeSetBuilder)
      marks.sort((a, b) => a.from - b.from || a.to - b.to);
      lines.sort((a, b) => a.pos - b.pos);

      // Deduplicate line decorations (blockquote lines can overlap)
      const seenLines = new Set<number>();
      const uniqueLines = lines.filter((l) => {
        if (seenLines.has(l.pos)) return false;
        seenLines.add(l.pos);
        return true;
      });

      // Build decoration set: line decorations first (from===to), then marks
      const builder = new RangeSetBuilder<Decoration>();
      let li = 0;
      let mi = 0;
      while (li < uniqueLines.length || mi < marks.length) {
        const linePos = li < uniqueLines.length ? uniqueLines[li].pos : Infinity;
        const markFrom = mi < marks.length ? marks[mi].from : Infinity;

        if (linePos <= markFrom) {
          builder.add(linePos, linePos, uniqueLines[li].dec);
          li++;
        } else {
          builder.add(marks[mi].from, marks[mi].to, marks[mi].dec);
          mi++;
        }
      }

      return builder.finish();
    }
  },
  { decorations: (v) => v.decorations }
);

// ============================================================
// Theme (static CSS — uses CSS variables so it works with any aTerm theme)
// ============================================================

const mdTheme = EditorView.theme(
  {
    "&": {
      height: "100%",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", system-ui, sans-serif',
    },
    ".cm-content": {
      padding: "2em 48px",
      maxWidth: "900px",
      margin: "0 auto",
      lineHeight: "1.75",
      caretColor: "var(--foreground)",
    },
    ".cm-scroller": { overflow: "auto", height: "100%", fontFamily: "inherit" },
    ".cm-focused": { outline: "none" },
    ".cm-line": { padding: "0" },
    ".cm-cursor": { borderLeftColor: "var(--foreground)" },
    ".cm-selectionBackground": { background: "hsl(var(--primary) / 0.3) !important" },
    "&.cm-focused .cm-selectionBackground": { background: "hsl(var(--primary) / 0.3) !important" },
    ".cm-gutters": { display: "none" },

    ".cm-md-hidden": { fontSize: "0", width: "0", display: "inline", color: "transparent" },
    ".cm-md-heading": { fontWeight: "700", lineHeight: "1.3" },
    ".cm-md-h1": {
      fontSize: "2em", fontWeight: "800", letterSpacing: "-0.02em",
      borderBottom: "2px solid hsl(var(--border))", paddingBottom: "0.3em",
      display: "inline-block", width: "100%",
    },
    ".cm-md-h2": {
      fontSize: "1.6em", fontWeight: "700",
      borderBottom: "1px solid hsl(var(--border))", paddingBottom: "0.2em",
      display: "inline-block", width: "100%",
    },
    ".cm-md-h3": { fontSize: "1.3em", fontWeight: "600" },
    ".cm-md-h4": { fontSize: "1.1em", fontWeight: "600" },
    ".cm-md-h5": { fontSize: "0.95em", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" },
    ".cm-md-h6": { fontSize: "0.85em", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", opacity: "0.7" },
    ".cm-md-bold": { fontWeight: "600" },
    ".cm-md-italic": { fontStyle: "italic" },
    ".cm-md-strikethrough": { textDecoration: "line-through", opacity: "0.6" },
    ".cm-md-inline-code": {
      fontFamily: '"SF Mono", "JetBrains Mono", "Fira Code", monospace',
      fontSize: "0.875em", background: "hsl(var(--muted))",
      padding: "0.15em 0.4em", borderRadius: "4px", border: "1px solid hsl(var(--border))",
    },
    ".cm-md-link-text": { color: "hsl(var(--primary))", cursor: "pointer" },
    ".cm-md-blockquote-line": {
      borderLeft: "4px solid hsl(var(--primary))", paddingLeft: "1em",
      background: "hsl(var(--muted) / 0.3)", fontStyle: "italic",
    },
    ".cm-md-hr-line": { borderBottom: "2px solid hsl(var(--border))", marginBottom: "0.5em", paddingBottom: "0.5em" },
    ".cm-md-list-bullet": { color: "hsl(var(--primary))", fontWeight: "700" },
  },
  { dark: true }
);

// ============================================================
// Component
// ============================================================

// Font size compartment — allows reconfiguring without recreating editor
const fontSizeCompartment = new Compartment();

function fontSizeExtension(size: number) {
  return EditorView.theme({ "&": { fontSize: `${size}px` } });
}

export function MarkdownEditor({ content, fontSize = 14, onChange, onSave }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const isExternalUpdate = useRef(false);
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);

  // Keep refs current without triggering re-render
  onChangeRef.current = onChange;
  onSaveRef.current = onSave;

  // Create editor ONCE on mount
  useEffect(() => {
    if (!containerRef.current) return;
    if (viewRef.current) return; // Already created

    const state = EditorState.create({
      doc: content,
      extensions: [
        history(),
        keymap.of([
          { key: "Mod-s", run: () => { onSaveRef.current?.(); return true; } },
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
          indentWithTab,
        ]),
        markdown({ base: markdownLanguage }),
        richMarkdownPlugin,
        highlightSelectionMatches(),
        mdTheme,
        fontSizeCompartment.of(fontSizeExtension(fontSize)),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update: ViewUpdate) => {
          if (update.docChanged && !isExternalUpdate.current) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // EMPTY deps — create once, never recreate

  // Update font size without recreating editor
  useEffect(() => {
    viewRef.current?.dispatch({
      effects: fontSizeCompartment.reconfigure(fontSizeExtension(fontSize)),
    });
  }, [fontSize]);

  // Sync external content changes (e.g., switching files in tabs)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const current = view.state.doc.toString();
    if (current !== content) {
      isExternalUpdate.current = true;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: content },
      });
      isExternalUpdate.current = false;
    }
  }, [content]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden bg-background"
    />
  );
}
