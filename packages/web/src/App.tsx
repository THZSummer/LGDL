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
import { locateIssue, type DocSpan } from './locate';
import { computeSnap } from './snap';
import { EXAMPLES, type Example } from './examples';
import { AiPanel } from './ai/AiPanel';
import webPkg from '../package.json';
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
  // allow spaces in values (contains: [a, b] uses ", " separators)
  const colonMatch = content.match(/^(\w+):\s*([A-Za-z0-9_\[,\s-]*)$/);
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
      let itemStart = lastSep === -1 ? valStart : line.from + lastSep + 1;
      // skip spaces after the separator so replacement starts at the id
      while (itemStart < pos && /\s/.test(line.text[itemStart - line.from])) itemStart++;
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
          <h3>⚠️ 页面发生错误</h3>          <p>{this.state.error.message}</p>
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

/**
 * Zoomable SVG preview — wheel-only navigation, no modifier keys, no
 * press-and-hold gestures. One wheel input, two behaviors split by cursor
 * position (edge-aware):
 *   - cursor in the CENTER area  -> zoom anchored at the cursor
 *   - cursor near an EDGE band   -> wheel scrolls the canvas along that
 *     edge's axis (top/bottom band = vertical pan, left/right band =
 *     horizontal pan) — so after zooming in, move the cursor to an edge and
 *     keep scrolling to explore.
 * Zooming resizes the SVG element itself, so the scrollable area grows with
 * the diagram. Zooming all the way down stops at the fitted view (acts as a
 * natural reset). The view refits whenever a new diagram arrives.
 * `extraClass` is forwarded to the card (used for the dimmed stale render).
 */
const ZOOM_EDGE = 64; // px band near each viewport edge where wheel = pan
const ZOOM_MAX = 8;
const ZOOM_MIN = 0.5; // 最小缩放固定 50%——不再允许缩到整图适配比例以下

function ZoomableSvg({
  svg,
  width,
  height,
  extraClass = '',
  onScaleChange,
  onLocate,
}: {
  svg: string;
  width: number;
  height: number;
  extraClass?: string;
  onScaleChange?: (scale: number) => void;
  onLocate?: (loc: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  // keep the latest callback without re-binding the wheel listener
  const onScaleChangeRef = useRef(onScaleChange);
  onScaleChangeRef.current = onScaleChange;
  // keep the LATEST diagram size in refs: the wheel listener binds once and
  // its closure would otherwise capture the size of the FIRST diagram —
  // zooming after switching examples would resize the SVG to the old
  // diagram's dimensions (e.g. a portrait 650x916 box around a landscape
  // 960x530 sequence diagram), making the white background flip orientation.
  const widthRef = useRef(width);
  const heightRef = useRef(height);
  widthRef.current = width;
  heightRef.current = height;

  const applySize = (scale: number) => {
    const svgEl = innerRef.current?.querySelector('svg');
    if (!svgEl) return;
    svgEl.setAttribute('width', String(Math.max(1, Math.round(widthRef.current * scale))));
    svgEl.setAttribute('height', String(Math.max(1, Math.round(heightRef.current * scale))));
  };

  const resetView = () => {
    const host = hostRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    // 默认 FitView：大图适配进视口，小图按 1:1 显示（允许 < 50%，
    // 如超长图 40%——初始整图可见优先）
    const scale = Math.max(0.1, Math.min(1, (rect.width - 24) / width, (rect.height - 24) / height));
    scaleRef.current = scale;
    applySize(scale);
    host.scrollLeft = 0;
    host.scrollTop = 0;
    onScaleChangeRef.current?.(scale);
  };

  // new diagram (or first mount) -> refit
  useEffect(() => {
    resetView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svg]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = host.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      // ---- edge band: wheel pans along the nearest edge's axis ----
      const dL = mx;
      const dR = rect.width - mx;
      const dT = my;
      const dB = rect.height - my;
      const minD = Math.min(dL, dR, dT, dB);
      if (minD <= ZOOM_EDGE) {
        if (minD === dL || minD === dR) {
          host.scrollLeft += e.deltaY; // left/right band -> horizontal pan
        } else {
          host.scrollTop += e.deltaY; // top/bottom band -> vertical pan
        }
        return;
      }

      // ---- center: zoom anchored at the cursor (industry-standard math) ----
      // 缩放下限固定 50%（ZOOM_MIN）。若当前已低于下限（初始 FitView 的
      // 大图整图适配，如 40%），缩小保持当前值而不是反向放大。
      const cur = scaleRef.current;
      const next = Math.min(
        ZOOM_MAX,
        Math.max(Math.min(cur, ZOOM_MIN), cur * Math.exp(-e.deltaY * 0.0015)),
      );
      const k = next / cur;
      const sx = host.scrollLeft;
      const sy = host.scrollTop;
      scaleRef.current = next;
      applySize(next);
      // keep the point under the cursor stationary after the size change
      host.scrollLeft = (sx + mx) * k - mx;
      host.scrollTop = (sy + my) * k - my;
      onScaleChangeRef.current?.(next);
    };

    host.addEventListener('wheel', onWheel, { passive: false });
    return () => host.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // left-click an element -> jump to its source location ("nodes[3]",
  // "edges[1]", "groups[0]", "nodes[0].members[2]"...). Rendered by the
  // renderer as data-lgdl-loc on every interactive SVG element.
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = (e.target as Element).closest('[data-lgdl-loc]');
    if (!el) return;
    onLocate?.(el.getAttribute('data-lgdl-loc') ?? '');
  };

  return (
    <div className="preview-canvas" ref={hostRef} onClick={handleClick}>
      <div className={`svg-container svg-zoom ${extraClass}`} ref={innerRef}>
        <div className="svg-inner" dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
    </div>
  );
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
  const [zoomScale, setZoomScale] = useState<number | null>(null);
  // ---- 左栏上下分栏（编辑器 / AI 助手）----
  const [splitRatio, setSplitRatio] = useState(0.4); // 编辑器占左栏高度比例
  const [aiCollapsed, setAiCollapsed] = useState(false); // true = 编辑器收缩（仅剩标题栏）
  const [dragging, setDragging] = useState(false); // 分隔条拖拽中（禁用过渡，保持跟手）
  const dragRef = useRef<{ startY: number; startRatio: number } | null>(null);
  const editorPaneRef = useRef<HTMLElement>(null);
  const editorHostRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const switcherRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef(source);
  sourceRef.current = source;

  /** 分隔条拖拽：拖动中实时调整比例（允许拖到 0 触发收缩），松手后判定收缩。 */
  const onSplitPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    dragRef.current = { startY: e.clientY, startRatio: aiCollapsed ? 0.4 : splitRatio };
  }, [aiCollapsed, splitRatio]);

  const onSplitPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    const pane = editorPaneRef.current;
    if (!d || !pane) return;
    const rect = pane.getBoundingClientRect();
    if (rect.height <= 0) return;
    const ratio = Math.min(0.85, Math.max(0, d.startRatio + (e.clientY - d.startY) / rect.height));
    setSplitRatio(ratio);
    setAiCollapsed(false); // 拖动即视为展开意图
  }, []);

  const onSplitPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    dragRef.current = null;
    setDragging(false);
    if (!d) return;
    // 拖到几乎最底部（比例 < 8%）→ 编辑器收缩；否则按当前比例停住
    if (splitRatio < 0.08) {
      setAiCollapsed(true);
      setSplitRatio(0.4); // 下次展开回到默认 40%
    }
  }, [splitRatio]);

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

  // 滑动指针：指针 = 容器视口中心的竖线。滚动（含惯性）停稳后，把指针
  // 所指的示例平滑吸附居中并自动选中；点击胶囊也直接切换并滚到指针下。
  const exampleIdRef = useRef(exampleId);
  exampleIdRef.current = exampleId;

  const selectExample = useCallback((ex: Example) => {
    loadExample(ex);
    // 把点击的胶囊滚到指针（视口中心）位置，保持「指针所指 = 当前项」
    // （指针线在 wrapper 上，滚动发生在内层 .example-switcher）
    const wrap = switcherRef.current;
    const el = wrap?.querySelector<HTMLElement>('.example-switcher');
    if (!el) return;
    const chip = el.querySelector<HTMLElement>(`.example-chip[data-id="${ex.id}"]`);
    if (!chip) return;
    const cr = el.getBoundingClientRect();
    const r = chip.getBoundingClientRect();
    el.scrollBy({ left: r.left + r.width / 2 - (cr.left + cr.width / 2), behavior: 'smooth' });
  }, [loadExample]);

  useEffect(() => {
    const wrap = switcherRef.current;
    const el = wrap?.querySelector<HTMLElement>('.example-switcher');
    if (!el) return;
    // 垂直滚轮转为横向滑动（空间不足时滚动浏览）
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });

    // 滚动停稳（180ms 无滚动事件）→ 吸附并选中。目标选择交给纯函数
    // computeSnap：左/右边界选首/尾项（它们永远无法滚到指针中心），
    // 中间按「当前视口距离指针最近」的项，避免指针滑过的元素被跳过。
    let timer: ReturnType<typeof setTimeout> | undefined;
    // 滑动过程中实时指示指针（视口中心）下方的元素——仅视觉（.pointed），
    // 不切换示例；停稳后才正式选中。让"指针"随着滑动变化。
    const markPointed = () => {
      const cr = el.getBoundingClientRect();
      if (cr.width <= 0) return;
      const centerX = cr.left + cr.width / 2;
      let best: HTMLElement | null = null;
      let bestD = Infinity;
      for (const chip of el.querySelectorAll<HTMLElement>('.example-chip')) {
        const r = chip.getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - centerX);
        if (d < bestD) {
          bestD = d;
          best = chip;
        }
      }
      el.querySelectorAll<HTMLElement>('.example-chip.pointed').forEach((c) => c.classList.remove('pointed'));
      best?.classList.add('pointed');
    };
    const snap = () => {
      timer = undefined;
      // 滚动停稳：隐藏指针
      wrap?.classList.remove('scrolling');
      const cr = el.getBoundingClientRect();
      if (cr.width <= 0) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      const chips = Array.from(el.querySelectorAll<HTMLElement>('.example-chip')).map((chip) => {
        const r = chip.getBoundingClientRect();
        return { chip, id: chip.dataset.id ?? '', left: r.left, width: r.width };
      });
      const result = computeSnap(el.scrollLeft, maxScroll, cr.left + cr.width / 2, chips);
      if (!result) return;
      if (Math.abs(result.scrollLeft - el.scrollLeft) > 0.5) {
        el.scrollTo({ left: result.scrollLeft, behavior: 'smooth' });
      }
      // 自动选中目标（与当前不同才切换，避免重复加载）；正式选中后清掉
      // 临时的 .pointed 指示（active 高亮取而代之）
      const id = result.id;
      el.querySelectorAll<HTMLElement>('.example-chip.pointed').forEach((c) => c.classList.remove('pointed'));
      if (id && id !== exampleIdRef.current) {
        const ex = EXAMPLES.find((x) => x.id === id);
        if (ex) loadExample(ex);
      }
    };
    const onScroll = () => {
      // 滚动中显示指针（CSS: .switcher-wrap.scrolling .switcher-pointer）
      wrap?.classList.add('scrolling');
      markPointed();
      if (timer) clearTimeout(timer);
      timer = setTimeout(snap, 180);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('scroll', onScroll);
      if (timer) clearTimeout(timer);
    };
  }, [loadExample]);

  // 内容不满一行时（无横向溢出），指针与淡出遮罩没有意义——隐藏
  useEffect(() => {
    const wrap = switcherRef.current;
    const el = wrap?.querySelector<HTMLElement>('.example-switcher');
    if (!el || !wrap) return;
    const sync = () => {
      wrap.classList.toggle('has-overflow', el.scrollWidth > el.clientWidth + 1);
      // 紧凑轮盘：滑轨区域 = 最宽胶囊 × 2 + 两侧 gap（"选中 1x 居中、
      // 左右各露出约 0.5x 相邻胶囊"在数学上要求视口 ≈ 2x + 2gap）
      let maxW = 124;
      const chips = Array.from(el.querySelectorAll<HTMLElement>('.example-chip'));
      for (const chip of chips) {
        maxW = Math.max(maxW, chip.offsetWidth);
      }
      const viewW = maxW * 2 + 16;
      wrap.style.setProperty('--switcher-w', `${viewW}px`);
      // 两端 spacer = (视口宽 − 首/尾胶囊宽) / 2 − 4px（.example-switcher
      // 的左右 padding 各 4px），让首/尾胶囊的中心恰好落在视口中心
      // （指针）上——scrollLeft=0/max 时指针正中胶囊
      const firstW = chips[0]?.offsetWidth ?? maxW;
      const lastW = chips[chips.length - 1]?.offsetWidth ?? maxW;
      wrap.style.setProperty('--spacer-start', `${Math.max(8, Math.round((viewW - firstW) / 2 - 4))}px`);
      wrap.style.setProperty('--spacer-end', `${Math.max(8, Math.round((viewW - lastW) / 2 - 4))}px`);
    };
    sync();
    const ro = new ResizeObserver(() => {
      sync();
      // 窗口/区域尺寸变化后，若当前选中项被挤出视口，滚回可见
      const chip = el.querySelector<HTMLElement>('.example-chip.active');
      if (!chip) return;
      const cr = el.getBoundingClientRect();
      const r = chip.getBoundingClientRect();
      if (r.left < cr.left) el.scrollLeft -= cr.left - r.left;
      else if (r.right > cr.right) el.scrollLeft += r.right - cr.right;
    });
    ro.observe(el);
    return () => ro.disconnect();
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

  /** AI 输出的 LGDL 应用到编辑器（已在 AiPanel 内通过 parseLgdl 校验）。 */
  const applyAiSource = useCallback((lgdl: string) => {
    setSource(lgdl);
    setDebouncedSource(lgdl);
    compileCache.clear();
  }, []);

  // click an issue / preview element -> jump to the location in the editor,
  // centering the target line vertically and moving the cursor onto it
  const jumpToIssue = useCallback((location: string | undefined) => {
    const view = editorViewRef.current;
    if (!view || !location) return;
    const span = locateIssue(view.state.doc.toString(), location);
    if (!span) return;
    view.dispatch({
      selection: { anchor: span.from },
      effects: EditorView.scrollIntoView(span.from, { y: 'center' }),
    });
    view.focus();
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">LGDL</span>
          <span className="brand-text">Web Workbench</span>
          <span className="brand-version">v{webPkg.version}</span>
        </div>
        <div className="switcher-wrap" ref={switcherRef}>
          <div className="example-switcher" aria-label="示例列表">
            <span className="switcher-spacer" aria-hidden="true" />
            {EXAMPLES.map((ex) => (
              <button
                key={ex.id}
                type="button"
                data-id={ex.id}
                className={`example-chip${ex.id === exampleId ? ' active' : ''}`}
                aria-pressed={ex.id === exampleId}
                title={`${ex.label} (${ex.id})`}
                onClick={() => selectExample(ex)}
              >
              {ex.label}
            </button>
          ))}
          <span className="switcher-spacer" aria-hidden="true" />
          </div>
          <span className="switcher-pointer" aria-hidden="true" />
        </div>
      </header>

      <main className="workspace">
        <section className="editor-pane" ref={editorPaneRef}>
          <div
            className={`editor-region${aiCollapsed ? ' collapsed' : ''}${dragging ? ' dragging' : ''}`}
            style={{
              flexGrow: 0,
              flexShrink: 0,
              flexBasis: aiCollapsed ? '36px' : `${splitRatio * 100}%`,
              transition: dragging ? 'none' : 'flex-basis 0.25s ease',
            }}
          >
            <div
              className="pane-title pane-title-clickable"
              title={aiCollapsed ? '点击展开编辑器' : '点击收起编辑器'}
              onClick={() => {
                if (aiCollapsed) {
                  setAiCollapsed(false);
                  setSplitRatio(0.4);
                } else {
                  setAiCollapsed(true);
                }
              }}
            >
              <span>
                编辑器 <span className="pane-hint">.lgdl 源码</span>
              </span>
              <span className="pane-actions">
                <button
                  className="pane-icon-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (aiCollapsed) {
                      setAiCollapsed(false);
                      setSplitRatio(0.4);
                    } else {
                      setAiCollapsed(true);
                    }
                  }}
                  title={aiCollapsed ? '展开编辑器' : '收缩编辑器'}
                  aria-label={aiCollapsed ? '展开编辑器' : '收缩编辑器'}
                >
                  {aiCollapsed ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  )}
                </button>
                <button className="pane-btn" onClick={copySource} title="复制源码到剪贴板">
                  {copied ? '✓ 已复制' : '复制源码'}
                </button>
              </span>
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
          </div>

          <div
            className="split-handle"
            onPointerDown={onSplitPointerDown}
            onPointerMove={onSplitPointerMove}
            onPointerUp={onSplitPointerUp}
            title="拖动调整编辑器高度（拖到底部收起编辑器）"
          />

          <section className="ai-region">
            <div className="pane-title">
              <span>AI 助手 <span className="pane-hint">对话生成 / 修改图</span></span>
            </div>
            <div className="ai-body">
              <AiPanel onApply={applyAiSource} currentSource={source} />
            </div>
          </section>
        </section>

        <section className="preview-pane">
          <div className="pane-title">
            <span>预览</span>
            <div className="pane-actions">
              <button className="pane-btn" onClick={downloadSvg} disabled={hasErrors || !state.svg}>
                导出 SVG
              </button>
              <button className="pane-btn" onClick={downloadPng} disabled={hasErrors || !state.svg}>
                导出 PNG
              </button>
            </div>
          </div>
          <div className="preview-body">
            {state.svg ? (
              <ZoomableSvg svg={state.svg} width={state.width} height={state.height} onScaleChange={setZoomScale} onLocate={jumpToIssue} />
            ) : hasErrors && lastGood.svg ? (
              // keep the last good render visible, overlay an error mask
              <div className="preview-stale-wrap">
                <ZoomableSvg svg={lastGood.svg} width={lastGood.width} height={lastGood.height} extraClass="svg-stale" onScaleChange={setZoomScale} onLocate={jumpToIssue} />
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
          <div className="preview-statusbar">
            <span className={zoomScale !== null ? 'status-ok' : ''}>
              {zoomScale !== null ? `缩放 ${Math.round(zoomScale * 100)}%` : '缩放 —'}
            </span>
            <span>左键点击元素定位源码 · 滚轮中央缩放 · 边缘滚轮平移</span>
          </div>
        </section>
      </main>
    </div>
  );
}

