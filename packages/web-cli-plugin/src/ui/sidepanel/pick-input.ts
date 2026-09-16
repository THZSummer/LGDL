/**
 * V3-4 TASK-407 / TASK-415 (ADR-V3-030 / AC-CONV-1) — the panel side of「页面即输入」.
 *
 * This module owns exactly three things:
 *
 *   ① **the two injection triggers** — `ensureInjected()` (the panel is present on an
 *      authorized origin ⇒ the layer exists, so the right-click menu is always
 *      available) and `startPick()` (the「从页面拾取」entry re-runs the same idempotent
 *      inject, which also covers「panel opened before authorization」/「SW restarted」).
 *      A failed injection is surfaced **readably** (`onUnavailable`) instead of
 *      silently leaving the pick entry looking functional.
 *   ② **the document identity** — `documentId` / `navSeq` are page facts; the layer
 *      pushes them and the panel caches them. When no layer is live they are reported
 *      as empty/`NaN`, which is what makes the judge's env *incomplete* and therefore
 *      fail-closed (never a remembered identity from a previous document).
 *   ③ **the drop target** — a real `application/x-wcli-ref` drop on the panel mints the
 *      reference; releasing the drag anywhere else reports nothing at all (the「未落点
 *      零副作用」path).
 *
 * It does **not** judge, does not mint reference ids (the id source stays
 * `l1/ref-store.ts`) and cannot dispatch a command — every reference-driven action
 * goes through the panel's single `applyRefAction` entry (AC-CONV-2).
 *
 * @module ui/sidepanel/pick-input
 */

import type { RefEnv } from './l1/ref-validity.js';
import type { RawRefFacts } from './l1/ref-store.js';

/** The `application/x-wcli-ref` payload a page-side drag carries. */
export const DRAG_PAYLOAD_TYPE = 'application/x-wcli-ref';

export interface PickEnvInput {
  activeOrigin: string;
  authorized: boolean;
  /** Adopted declaration digest (+ protocol version) as reported by the background. */
  declaration: { hash: string; version?: string } | null;
}

export interface PickInputDeps {
  doc: Document;
  send(message: { kind: string; [k: string]: unknown }): Promise<{ ok: boolean; error?: string; data?: unknown }>;
  envInput(): PickEnvInput;
  /** One captured reference reached the panel (facts + the page's observation). */
  onCapture(facts: RawRefFacts, resolution: { status: string; refMark?: string; nodeCount?: number }): void;
  /** A page-side hover/fact message (bidirectional highlight). */
  onPageHover(refId: string): void;
  /** Injection outcome: `null` = available, a string = the readable reason. */
  onUnavailable(reason: string | null): void;
  notify(text: string): void;
}

export interface PickInputHandle {
  /** Trigger 1 — the panel is present (idempotent; called after every state read). */
  ensureInjected(): Promise<void>;
  /** Trigger 2 — the「从页面拾取」entry. */
  startPick(): Promise<void>;
  /** AC-CONV-1: report the complete judge env, still fail-closed while incomplete. */
  judgeEnv(): RefEnv;
  /** Ask the page to flash/reveal/mark one reference (P4/P5). */
  highlight(refId: string, selector: string, mode: 'flash' | 'mark' | 'outline'): Promise<void>;
  /** Route one inbound message; `true` when it was ours. */
  accept(raw: unknown): boolean;
  teardown(): void;
  state(): Record<string, unknown>;
}

export function mountPickInput(deps: PickInputDeps): PickInputHandle {
  const { doc } = deps;
  const state = {
    injected: false,
    unavailable: null as string | null,
    documentId: '',
    navSeq: Number.NaN,
    ackAt: 0,
    captures: 0,
    drops: 0,
    highlights: 0,
  };

  /** The judge's env: identity only while a live layer vouches for the document. */
  const judgeEnv = (): RefEnv => {
    const base = deps.envInput();
    if (!state.injected) {
      // No live page side ⇒ no document identity. Reporting a remembered one would
      // let a reference from a previous document pass as `valid`.
      return { currentOrigin: base.activeOrigin, authorized: base.authorized };
    }
    return {
      currentOrigin: base.activeOrigin,
      authorized: base.authorized,
      documentId: state.documentId,
      navSeq: state.navSeq,
      ...(base.declaration ? { declarationHash: base.declaration.hash } : {}),
      ...(base.declaration?.version ? { declarationVersion: base.declaration.version } : {}),
    };
  };

  const inject = async (): Promise<boolean> => {
    const res = await deps.send({ kind: 'pick-layer-inject' });
    if (!res.ok) {
      state.injected = false;
      state.documentId = '';
      state.navSeq = Number.NaN;
      // `benign` = the current tab is simply not a page this feature applies to (no
      // site open / a browser-internal page). That is「此处没有页面侧」, not a failure,
      // so it must NOT raise the risk-zone row (which would misreport an idle panel as
      // a broken one). A refusal the user actually asked for stays visible.
      const benign = (res.data as { benign?: boolean } | undefined)?.benign === true;
      state.unavailable = benign ? null : (res.error ?? '注入失败（原因未知）');
      deps.onUnavailable(state.unavailable);
      return false;
    }
    state.injected = true;
    state.unavailable = null;
    deps.onUnavailable(null);
    return true;
  };

  const highlight = async (refId: string, selector: string, mode: 'flash' | 'mark' | 'outline'): Promise<void> => {
    state.highlights += 1;
    await deps.send({ kind: 'ref-highlight', refId, selector, mode });
  };

  const accept = (raw: unknown): boolean => {
    const msg = raw as { kind?: string } | null;
    const kind = msg?.kind ?? '';
    if (kind === 'pick-layer-state') {
      const m = msg as unknown as { phase?: string; documentId?: string; navSeq?: number; reason?: string };
      if (m.phase === 'gone') {
        state.injected = false;
        state.documentId = '';
        state.navSeq = Number.NaN;
        deps.onUnavailable(m.reason ?? '页面侧已卸载');
        return true;
      }
      state.documentId = typeof m.documentId === 'string' ? m.documentId : '';
      state.navSeq = typeof m.navSeq === 'number' ? m.navSeq : Number.NaN;
      state.injected = state.documentId.length > 0;
      state.ackAt = Date.now();
      deps.onUnavailable(state.injected ? null : '页面侧未就绪');
      return true;
    }
    if (kind === 'ref-captured') {
      const m = msg as unknown as {
        facts?: RawRefFacts;
        resolution?: { status: string; refMark?: string; nodeCount?: number };
      };
      if (!m.facts || typeof m.facts !== 'object') return true;
      state.captures += 1;
      deps.onCapture(m.facts, m.resolution ?? { status: 'unreachable' });
      return true;
    }
    if (kind === 'ref-highlight') {
      const m = msg as unknown as { mode?: string; refId?: string };
      if (m.mode === 'page-hover' && m.refId) deps.onPageHover(m.refId);
      return true;
    }
    return false;
  };

  // ── the drop target (「落侧栏」path) ─────────────────────────────────────────
  const onDragOver = (ev: DragEvent): void => {
    if (!ev.dataTransfer) return;
    // Only a payload we can actually use is accepted, so dragging ordinary text
    // into the panel keeps the browser's default behaviour.
    if (!Array.from(ev.dataTransfer.types ?? []).includes(DRAG_PAYLOAD_TYPE)) return;
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'copy';
    doc.getElementById('l0-decision')?.setAttribute('data-drop-active', 'true');
  };
  const onDragLeave = (): void => {
    doc.getElementById('l0-decision')?.removeAttribute('data-drop-active');
  };
  const onDrop = (ev: DragEvent): void => {
    doc.getElementById('l0-decision')?.removeAttribute('data-drop-active');
    let payload = '';
    try {
      payload = ev.dataTransfer?.getData(DRAG_PAYLOAD_TYPE) ?? '';
    } catch {
      payload = '';
    }
    if (!payload) return;
    ev.preventDefault();
    state.drops += 1;
    let facts: RawRefFacts;
    try {
      facts = JSON.parse(payload) as RawRefFacts;
    } catch {
      deps.notify('✖ 拖入的内容不是有效的引用负载（按取消处理）');
      return;
    }
    deps.onCapture(facts, { status: 'resolved' });
  };
  doc.addEventListener('dragover', onDragOver as EventListener, true);
  doc.addEventListener('dragleave', onDragLeave as EventListener, true);
  doc.addEventListener('drop', onDrop as EventListener, true);

  return {
    async ensureInjected() {
      const base = deps.envInput();
      if (!base.activeOrigin || !base.authorized) {
        // Unauthorized / unbound: the product shows「页面侧零注入」and must not even
        // attempt the injection (the background would refuse it anyway).
        state.injected = false;
        state.unavailable = null;
        return;
      }
      await inject();
    },
    async startPick() {
      const ok = await inject();
      if (!ok) {
        deps.notify(`✖ 页面侧不可用：${state.unavailable ?? '注入失败'}`);
        return;
      }
      // The layer is in pick mode: the user's next Alt-hover / selection / right-click
      // produces a reference. No composer input is involved (FR-V3-061).
      await deps.send({ kind: 'pick-layer-env', ...deps.envInput() }).catch(() => undefined);
    },
    judgeEnv,
    highlight,
    accept,
    teardown() {
      doc.removeEventListener('dragover', onDragOver as EventListener, true);
      doc.removeEventListener('dragleave', onDragLeave as EventListener, true);
      doc.removeEventListener('drop', onDrop as EventListener, true);
      void deps.send({ kind: 'pick-layer-teardown' });
    },
    state: () => ({ ...state, judgeEnv: judgeEnv() }),
  };
}
