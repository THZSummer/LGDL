// LGDL Web Workbench — edit .lgdl in the browser, live render
import React, { useMemo, useState, useCallback, useRef, useEffect, Component, type ReactNode } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine, Decoration, type DecorationSet } from '@codemirror/view';
import { EditorState, StateField, type Range } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { syntaxHighlighting, HighlightStyle, indentUnit, syntaxTree } from '@codemirror/language';
import { linter, type Diagnostic } from '@codemirror/lint';
import { autocompletion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import { yaml } from '@codemirror/lang-yaml';
import { tags as t } from '@lezer/highlight';
import { parseLgdl } from '@lgdl/core';
import { layoutDocument } from '@lgdl/layout';
import { renderSvg } from '@lgdl/render';
import { EXAMPLES, type Example } from './examples';
import './app.css';

/** LGDL-tuned highlight: keys stay teal, values are colored semantically below. */
const lgdlHighlight = HighlightStyle.define([
  { tag: t.propertyName, color: '#0f766e' }, // yaml keys (id, label, from...)
  { tag: t.comment, color: '#94a3b8', fontStyle: 'italic' },
  { tag: t.invalid, color: '#dc2626', textDecoration: 'underline wavy' },
]);

/** Values that are LGDL enum keywords (diagram types + node kinds). */
const LGDL_ENUMS = new Set([
  'flowchart', 'mindmap', 'uml-class', 'arch', 'datastream', 'sequence',
  'er', 'state', 'gantt',
  'start', 'end', 'process', 'decision', 'entity', 'note', 'milestone',
]);

// Decoration marks for semantic coloring of YAML values.
const enumMark = Decoration.mark({ class: 'cm-lgdl-enum' });
const numMark = Decoration.mark({ class: 'cm-lgdl-num' });
const boolMark = Decoration.mark({ class: 'cm-lgdl-bool' });
const plainMark = Decoration.mark({ class: 'cm-lgdl-plain' });

/**
 * LGDL semantic highlighting: @lezer/yaml labels every value as `Literal`
 * (mapped to t.string), so numbers/bools/enums all look identical. This
 * field re-colors each `key: value` line by the value's content.
 */
const lgdlValueHighlight = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(_deco, tr) {
    const text = tr.state.doc.toString();
    const ranges: Range<Decoration>[] = [];
    // match indented "key: value" lines
    const lineRe = /^[ \t]*[A-Za-z_][A-Za-z0-9_-]*:[ \t]*(.*)$/gm;
    let m: RegExpExecArray | null;
    while ((m = lineRe.exec(text))) {
      const full = m[0];
      const keyMatch = full.match(/[A-Za-z_][A-Za-z0-9_-]*/);
      if (!keyMatch) continue;
      const key = keyMatch[0];
      const valRaw = m[1].trim();
      if (!valRaw) continue;
      // value span within the doc
      const valueStart = m.index + m[0].length - valRaw.length;
      const valueEnd = valueStart + valRaw.length;
      const val = valRaw.replace(/^["']|["']$/g, '');
      let mark: Decoration;
      if ((key === 'type' || key === 'kind') && LGDL_ENUMS.has(val)) {
        mark = enumMark;
      } else if (/^-?\d+(\.\d+)?$/.test(val)) {
        mark = numMark;
      } else if (val === 'true' || val === 'false') {
        mark = boolMark;
      } else {
        mark = plainMark;
      }
      ranges.push(mark.range(valueStart, valueEnd));
    }
    return Decoration.set(ranges, true);
  },
  provide: (f) => EditorView.decorations.from(f),
});

/** Absolute position (char offsets) of a field value in the document. */
interface DocSpan {
  from: number;
  to: number;
}

/**
 * Map an LGDL issue location to the char range of the offending text.
 * Supports every location format the parser emits:
 *   - "type"                         -> value after "type:"
 *   - "nodes[i].id|kind|label"       -> that field's value in node i
 *   - "edges[i].from|to|label"       -> that field's value in edge i
 *   - "groups[i].contains"           -> first value in the inline list
 *   - "groups[i].contains[j]"        -> the j-th value in the list
 *   - "line N"                       -> the whole line N
 *   - "doc" / "runtime" / undefined  -> null (no location)
 */
function locateIssue(source: string, location: string | undefined): DocSpan | null {
  if (!location) return null;
  const lines = source.split('\n');
  const lineStart: number[] = [];
  let off = 0;
  for (const l of lines) {
    lineStart.push(off);
    off += l.length + 1;
  }

  // "line N" — highlight the whole line
  let lineMatch = location.match(/^line (\d+)$/);
  if (lineMatch) {
    const ln = parseInt(lineMatch[1], 10) - 1;
    if (ln < 0 || ln >= lines.length) return null;
    const content = lines[ln];
    const firstNonSpace = content.match(/\S/);
    const start = firstNonSpace ? lineStart[ln] + firstNonSpace.index! : lineStart[ln];
    return { from: start, to: lineStart[ln] + content.length };
  }

  // structured: section[index].field  or  section[index].contains[j]
  const m = location.match(/^(\w+)(?:\[(\d+)\])?(?:\.(\w+)(?:\[(\d+)\])?)?$/);
  if (!m) return null;
  const [, section, idxStr, field, subIdxStr] = m;
  const idx = idxStr !== undefined ? parseInt(idxStr, 10) : 0;
  const subIdx = subIdxStr !== undefined ? parseInt(subIdxStr, 10) : 0;

  // find the top-level section line, e.g. "edges:" (may or may not have a value)
  let sectionLine = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const indent = line.length - line.trimStart().length;
    if (indent > 0) continue; // only top-level keys
    if (/^\w+:/.test(trimmed) && trimmed.startsWith(section + ':')) {
      sectionLine = i;
      break;
    }
  }
  if (sectionLine === -1) return null;

  // section without list items (e.g. "type", "title"): value after colon
  if (idxStr === undefined && !field) {
    const line = lines[sectionLine];
    const colonIdx = line.indexOf(':');
    const value = line.slice(colonIdx + 1).trim();
    if (!value) {
      // empty value — mark right after the colon
      return { from: lineStart[sectionLine] + colonIdx + 1, to: lineStart[sectionLine] + colonIdx + 2 };
    }
    const vStart = line.indexOf(value, colonIdx + 1);
    return { from: lineStart[sectionLine] + vStart, to: lineStart[sectionLine] + vStart + value.length };
  }

  // walk the list items under the section
  let itemCount = -1;
  for (let i = sectionLine + 1; i < lines.length; i++) {
    const l = lines[i];
    if (!l.trim() || l.trim().startsWith('#')) continue;
    const indent = l.length - l.trimStart().length;
    if (indent === 0) break; // next top-level key
    if (!l.trim().startsWith('- ')) continue;
    itemCount++;
    if (itemCount !== idx) continue;

    const itemIndent = indent;
    if (!field) {
      // whole item line fallback
      return { from: lineStart[i], to: lineStart[i] + l.length };
    }

    // the field may sit on the item's first line: "- from: paid1"
    const firstMatch = l.trim().slice(2).match(new RegExp(`^${field}:\\s*(.*)$`));
    if (firstMatch) {
      const value = firstMatch[1].trim();
      if (subIdxStr !== undefined) {
        // inline list value: contains: [a, b, c]
        return locateListValue(source, lines, lineStart, i, value, subIdx);
      }
      const vStart = l.indexOf(value);
      return { from: lineStart[i] + vStart, to: lineStart[i] + vStart + value.length };
    }

    // scan following indented lines for "field: value"
    for (let j = i + 1; j < lines.length; j++) {
      const nl = lines[j];
      if (!nl.trim() || nl.trim().startsWith('#')) continue;
      const ni = nl.length - nl.trimStart().length;
      if (ni <= itemIndent) break;
      const fm = nl.trim().match(new RegExp(`^${field}:\\s*(.*)$`));
      if (fm) {
        const value = fm[1].trim();
        if (subIdxStr !== undefined) {
          return locateListValue(source, lines, lineStart, j, value, subIdx);
        }
        const vStart = nl.indexOf(value);
        return { from: lineStart[j] + vStart, to: lineStart[j] + vStart + value.length };
      }
    }

    // field not found in this item — fallback to whole item line
    return { from: lineStart[i], to: lineStart[i] + l.length };
  }
  return null;
}

/** Locate the j-th element of an inline list like "contains: [a, b, c]". */
function locateListValue(
  source: string,
  lines: string[],
  lineStart: number[],
  lineIdx: number,
  rawValue: string,
  subIdx: number,
): DocSpan | null {
  const listMatch = rawValue.match(/^\[(.*)\]$/s);
  if (!listMatch) return null;
  const items = listMatch[1].split(',').map((s) => s.trim()).filter((s) => s.length > 0);
  if (subIdx >= items.length) return null;
  // find the sub-item within the raw list text
  const listStart = lines[lineIdx].indexOf(rawValue);
  const itemPos = listMatch[1].indexOf(items[subIdx]);
  if (itemPos === -1) return null;
  return {
    from: lineStart[lineIdx] + listStart + 1 + itemPos,
    to: lineStart[lineIdx] + listStart + 1 + itemPos + items[subIdx].length,
  };
}

/** CodeMirror linter: red squiggles at every issue position (all are errors). */
const lgdlLinter = linter((view) => {
  const text = view.state.doc.toString();
  const state = compile(text);
  const diagnostics: Diagnostic[] = [];
  for (const issue of state.issues) {
    const span = locateIssue(text, issue.location);
    const from = span ? span.from : 0;
    const to = span ? span.to : Math.min(text.length, 1);
    diagnostics.push({
      from,
      to: Math.max(to, from + 1),
      severity: 'error',
      message: issue.message,
    });
  }
  return diagnostics;
});

// ---------------------------------------------------------------------------
// LGDL autocompletion (IntelliSense)
// ---------------------------------------------------------------------------

const DIAGRAM_TYPES = [
  'flowchart', 'mindmap', 'uml-class', 'arch', 'datastream',
  'sequence', 'er', 'state', 'gantt',
];
const NODE_KINDS = [
  'start', 'end', 'process', 'decision', 'entity', 'note', 'state', 'milestone',
];
const TOP_KEYS = ['title', 'type', 'nodes', 'edges', 'groups', 'meta'];
const NODE_FIELDS = ['id', 'label', 'kind', 'attrs', 'group'];
const EDGE_FIELDS = ['from', 'to', 'label', 'attrs'];
const GROUP_FIELDS = ['id', 'label', 'contains'];

function completion(text: string, label: string, detail: string, type = 'keyword') {
  return { label, detail, type, apply: text };
}

/** Collect all node ids from the document (for from/to/contains references). */
function collectNodeIds(doc: string): string[] {
  const ids: string[] = [];
  const re = /^\s*- id:\s*([A-Za-z0-9_-]+)/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(doc))) {
    ids.push(m[1]);
  }
  return ids;
}

/** Offer suggestions based on the current line's context. */
function lgdlCompletions(ctx: CompletionContext): CompletionResult | null {
  try {
    return lgdlCompletionsInner(ctx);
  } catch {
    // never let a completion error disable the feature
    return null;
  }
}

function lgdlCompletionsInner(ctx: CompletionContext): CompletionResult | null {
  const pos = ctx.pos;
  const docText = ctx.state.doc.toString();
  const line = ctx.state.doc.lineAt(pos);
  const textBefore = line.text.slice(0, pos - line.from);
  const trimmed = textBefore.trimStart();
  const indent = line.text.length - line.text.trimStart().length;
  const isItem = trimmed.startsWith('- ');

  // never complete inside a comment (tree-based check)
  const tree = syntaxTree(ctx.state);
  const node = tree.resolveInner(pos, -1);
  if (node && node.name === 'Comment') return null;

  // section (nodes/edges/groups) of the current line
  const lines = docText.split('\n');
  let section = '';
  for (let i = 0; i < line.number - 1; i++) {
    const t = lines[i].trim();
    if (t.startsWith('nodes:') || t.startsWith('edges:') || t.startsWith('groups:')) {
      section = t.slice(0, t.indexOf(':'));
    }
  }

  const content = isItem ? trimmed.slice(2) : trimmed;

  // ---- "key: value" — suggest values ----
  const colonMatch = content.match(/^(\w+):\s*([A-Za-z0-9_\[,-]*)$/);
  if (colonMatch) {
    const key = colonMatch[1];
    const valPart = colonMatch[2];
    const valStart = valPart !== '' && textBefore.endsWith(valPart) ? pos - valPart.length : pos;

    if (key === 'type') {
      return { from: valStart, options: DIAGRAM_TYPES.map((t) => completion(t, t, '图类型')) };
    }
    if (key === 'kind') {
      return { from: valStart, options: NODE_KINDS.map((k) => completion(k, k, '节点类型')) };
    }
    if (key === 'from' || key === 'to') {
      const ids = collectNodeIds(docText);
      return { from: valStart, options: ids.map((id) => completion(id, id, '节点引用', 'variable')) };
    }
    if (key === 'contains') {
      const ids = collectNodeIds(docText);
      const upToCursor = textBefore;
      const lastSep = Math.max(upToCursor.lastIndexOf(','), upToCursor.lastIndexOf('['));
      const itemStart = lastSep === -1 ? valStart : line.from + lastSep + 1;
      return { from: itemStart, options: ids.map((id) => completion(id, id, '节点引用', 'variable')) };
    }
    return null;
  }

  // ---- bare word: field name or top-level key (mid-typing) ----
  const bareWord = content.match(/^[A-Za-z]*$/);
  if (bareWord) {
    const from = pos - content.length;
    const prefix = content;
    if (isItem || indent > 0) {
      const fields = section === 'nodes' ? NODE_FIELDS : section === 'edges' ? EDGE_FIELDS : section === 'groups' ? GROUP_FIELDS : NODE_FIELDS;
      const detail = section === 'nodes' ? '节点字段' : section === 'edges' ? '边字段' : '分组字段';
      const matched = fields.filter((f) => f.startsWith(prefix));
      if (matched.length > 0) {
        return { from, options: matched.map((f) => completion(f + ': ', f, detail)) };
      }
      return null;
    }
    const matched = TOP_KEYS.filter((k) => k.startsWith(prefix));
    if (matched.length > 0) {
      return { from, options: matched.map((k) => completion(k + ': ', k, '顶层键')) };
    }
    return null;
  }

  return null;
}

const lgdlAutocomplete = autocompletion({
  override: [lgdlCompletions],
  defaultKeymap: true,
  activateOnTyping: true,
  activateOnTypingDelay: 50,
});

/** Error boundary: never let an unexpected error blank the whole page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="fatal-error">
          <h3>⚠️ 页面发生错误</h3>
          <p>{this.state.error.message}</p>
          <button
            onClick={() => {
              this.setState({ error: null });
              location.reload();
            }}
          >
            重新加载
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface RenderState {
  svg: string;
  width: number;
  height: number;
  nodeCount: number;
  edgeCount: number;
  issues: { severity: string; message: string; location?: string }[];
  /** elapsed ms for the last compile */
  elapsed: number;
}

/** Simple LRU-ish cache: source -> RenderState (bounded). */
const compileCache = new Map<string, RenderState>();
const CACHE_MAX = 50;

function compile(source: string): RenderState {
  const cached = compileCache.get(source);
  if (cached) return cached;

  const start = performance.now();
  try {
    const result = parseLgdl(source);
    const issues = result.issues.map((i) => ({
      severity: i.severity,
      message: i.message,
      location: i.location,
    }));

    let state: RenderState;
    if (!result.valid) {
      state = {
        svg: '',
        width: 0,
        height: 0,
        nodeCount: 0,
        edgeCount: 0,
        issues,
        elapsed: performance.now() - start,
      };
    } else {
      const doc = result.document;
      const layout = layoutDocument(doc);
      const svg = renderSvg(doc, layout);
      state = {
        svg,
        width: layout.width,
        height: layout.height,
        nodeCount: doc.nodes.length,
        edgeCount: doc.edges.length,
        issues,
        elapsed: performance.now() - start,
      };
    }

    if (compileCache.size >= CACHE_MAX) {
      const firstKey = compileCache.keys().next().value;
      if (firstKey) compileCache.delete(firstKey);
    }
    compileCache.set(source, state);
    return state;
  } catch (err) {
    // Never let an engine exception crash the page — show it as an error.
    const message = err instanceof Error ? err.message : String(err);
    const state: RenderState = {
      svg: '',
      width: 0,
      height: 0,
      nodeCount: 0,
      edgeCount: 0,
      issues: [{ severity: 'error', message: `内部错误: ${message}`, location: 'runtime' }],
      elapsed: performance.now() - start,
    };
    compileCache.set(source, state);
    return state;
  }
}

export function App(): React.JSX.Element {
  const [source, setSource] = useState<string>(EXAMPLES[0].source);
  const [exampleId, setExampleId] = useState<string>(EXAMPLES[0].id);
  const [copied, setCopied] = useState(false);
  const [debouncedSource, setDebouncedSource] = useState<string>(EXAMPLES[0].source);
  const [lastGood, setLastGood] = useState<RenderState>(() => compile(EXAMPLES[0].source));
  const [maskDismissed, setMaskDismissed] = useState(false);
  const svgRef = useRef<HTMLDivElement>(null);
  const editorHostRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const sourceRef = useRef(source);
  sourceRef.current = source;

  // CodeMirror editor (created once; content flows through React state)
  useEffect(() => {
    if (!editorHostRef.current || editorViewRef.current) return;
    const view = new EditorView({
      state: EditorState.create({
        doc: sourceRef.current,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          indentUnit.of('  '),
          yaml(),
          syntaxHighlighting(lgdlHighlight),
          lgdlValueHighlight,
          lgdlLinter,
          lgdlAutocomplete,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              setSource(update.state.doc.toString());
            }
          }),
          EditorView.theme({
            '&': { height: '100%', fontSize: '13px', backgroundColor: '#ffffff' },
            '.cm-scroller': { fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace", lineHeight: '1.6' },
            '.cm-content': { padding: '12px 0' },
            '.cm-gutters': { backgroundColor: '#f8fafc', color: '#94a3b8', border: 'none' },
            '.cm-activeLine': { backgroundColor: '#f1f5f9' },
            '.cm-activeLineGutter': { backgroundColor: '#e2e8f0', color: '#475569' },
            // semantic value colors (from lgdlValueHighlight marks)
            '.cm-lgdl-enum': { color: '#7c3aed', fontWeight: '600' },
            '.cm-lgdl-num': { color: '#ea580c' },
            '.cm-lgdl-bool': { color: '#db2777' },
            '.cm-lgdl-plain': { color: '#334155' },
          }),
        ],
      }),
      parent: editorHostRef.current,
    });
    editorViewRef.current = view;
    return () => {
      view.destroy();
      editorViewRef.current = null;
    };
  }, []);

  // keep editor content in sync when source changes externally (example switch)
  useEffect(() => {
    const view = editorViewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== source) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: source } });
    }
  }, [source]);

  // debounce: only recompile 300ms after the user stops typing
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSource(source), 300);
    return () => clearTimeout(timer);
  }, [source]);

  // cache is keyed on debounced source so stale values are reused cheaply
  const state = useMemo(() => compile(debouncedSource), [debouncedSource]);
  const hasErrors = state.issues.some((i) => i.severity === 'error');
  const isStale = source !== debouncedSource; // typing in progress

  // remember the last successfully rendered SVG so errors don't blank the view
  useEffect(() => {
    if (state.svg) {
      setLastGood(state);
    }
  }, [state.svg]);

  // when the user edits again, re-show the error mask if there are errors
  useEffect(() => {
    setMaskDismissed(false);
  }, [source]);

  const loadExample = useCallback((ex: Example) => {
    setExampleId(ex.id);
    setSource(ex.source);
    setDebouncedSource(ex.source);
    compileCache.clear();
  }, []);

  const downloadSvg = useCallback(() => {
    const blob = new Blob([state.svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exampleId}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state.svg, exampleId]);

  const downloadPng = useCallback(() => {
    if (!state.svg) return;
    const blob = new Blob([state.svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = state.width * scale;
      canvas.height = state.height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `${exampleId}.png`;
      a.click();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [state.svg, state.width, state.height, exampleId]);

  const copySource = useCallback(() => {
    navigator.clipboard.writeText(source).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [source]);

  // click an issue -> jump to the offending location in the editor
  const jumpToIssue = useCallback((location: string | undefined) => {
    const view = editorViewRef.current;
    if (!view) return;
    const span = locateIssue(view.state.doc.toString(), location);
    const pos = span ? span.from : 0;
    view.dispatch({ selection: { anchor: pos }, scrollIntoView: true });
    view.focus();
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">LGDL</span>
          <span className="brand-text">Web Workbench</span>
          <span className="brand-version">v0.1</span>
        </div>
        <div className="example-picker">
          <select
            value={exampleId}
            onChange={(e) => {
              const ex = EXAMPLES.find((x) => x.id === e.target.value);
              if (ex) loadExample(ex);
            }}
          >
            {EXAMPLES.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.label} ({ex.id})
              </option>
            ))}
          </select>
        </div>
        <div className="header-actions">
          <button onClick={copySource}>{copied ? '✓ 已复制' : '复制源码'}</button>
          <button onClick={downloadSvg} disabled={hasErrors || !state.svg}>
            导出 SVG
          </button>
          <button onClick={downloadPng} disabled={hasErrors || !state.svg}>
            导出 PNG
          </button>
        </div>
      </header>

      <main className="workspace">
        <section className="editor-pane">
          <div className="pane-title">
            编辑器 <span className="pane-hint">.lgdl 源码</span>
          </div>
          <div className="editor" ref={editorHostRef} aria-label="LGDL source editor" />
          <div className="status-bar">
            <span className={hasErrors ? 'status-error' : 'status-ok'}>
              {hasErrors
                ? `✖ ${state.issues.filter((i) => i.severity === 'error').length} 个错误`
                : isStale
                  ? '⏳ 输入中…'
                  : '✓ 语法正确'}
            </span>
            <span>
              {state.nodeCount} 节点 · {state.edgeCount} 边 · {state.width}×{state.height}
              {state.elapsed > 0 && !isStale ? ` · ${state.elapsed.toFixed(1)}ms` : ''}
            </span>
          </div>
        </section>

        <section className="preview-pane">
          <div className="pane-title">预览</div>
          <div className="preview-body">
            {state.svg ? (
              <div ref={svgRef} className="svg-container" dangerouslySetInnerHTML={{ __html: state.svg }} />
            ) : hasErrors && lastGood.svg ? (
              // keep the last good render visible, overlay an error mask
              <div className="preview-stale-wrap">
                <div className="svg-container svg-stale" dangerouslySetInnerHTML={{ __html: lastGood.svg }} />
                {!maskDismissed && (
                  <div className="error-mask">
                    <div className="error-mask-card">
                      <div className="error-mask-icon">✖</div>
                      <div className="error-mask-title">无法更新渲染</div>
                      <div className="error-mask-hint">
                        当前源码有 {state.issues.filter((i) => i.severity === 'error').length} 个错误，
                        下方显示的是上次成功渲染的图
                      </div>
                      <button
                        className="error-mask-btn"
                        onClick={() => setMaskDismissed(true)}
                      >
                        知道了，继续查看
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : hasErrors ? (
              <div className="preview-empty preview-error">
                <div className="preview-error-icon">✖</div>
                <div className="preview-error-title">无法渲染</div>
                <div className="preview-error-hint">请根据下方错误信息修正 LGDL 源码</div>
              </div>
            ) : isStale ? (
              <div className="preview-empty">
                <div className="preview-error-icon preview-loading">⏳</div>
                <div className="preview-error-title">渲染中…</div>
              </div>
            ) : (
              <div className="preview-empty">
                <div className="preview-error-title">暂无内容</div>
              </div>
            )}
          </div>
          {state.issues.length > 0 && (
            <div className="issue-list">
              {state.issues.map((issue, i) => (
                <div
                  key={i}
                  className={`issue issue-${issue.severity}`}
                  onClick={() => jumpToIssue(issue.location)}
                  title="点击跳转到源码位置"
                >
                  {issue.severity === 'error' ? '✖' : '⚠'} [{issue.location ?? 'doc'}] {issue.message}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

