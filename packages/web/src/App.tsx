// LGDL Web Workbench — edit .lgdl in the browser, live render
import React, { useMemo, useState, useCallback, useRef, useEffect, Component, type ReactNode } from 'react';
import { parseLgdl } from '@lgdl/core';
import { layoutDocument } from '@lgdl/layout';
import { renderSvg } from '@lgdl/render';
import { EXAMPLES, type Example } from './examples';
import './app.css';

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
  const svgRef = useRef<HTMLDivElement>(null);

  // debounce: only recompile 300ms after the user stops typing
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSource(source), 300);
    return () => clearTimeout(timer);
  }, [source]);

  // cache is keyed on debounced source so stale values are reused cheaply
  const state = useMemo(() => compile(debouncedSource), [debouncedSource]);
  const hasErrors = state.issues.some((i) => i.severity === 'error');
  const isStale = source !== debouncedSource; // typing in progress

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
          <textarea
            className="editor"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            spellCheck={false}
            aria-label="LGDL source editor"
          />
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
                <div key={i} className={`issue issue-${issue.severity}`}>
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

