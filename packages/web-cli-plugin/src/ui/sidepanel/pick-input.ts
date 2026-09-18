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

import type { DeclarationStatus, RefEnv, RefResolution } from './l1/ref-validity.js';
import type { RawRefFacts } from './l1/ref-store.js';

/** The `application/x-wcli-ref` payload a page-side drag carries. */
export const DRAG_PAYLOAD_TYPE = 'application/x-wcli-ref';

export interface PickEnvInput {
  activeOrigin: string;
  authorized: boolean;
  /** Adopted declaration digest (+ protocol version) as reported by the background. */
  declaration: { status: DeclarationStatus; hash: string; version?: string } | null;
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
  /**
   * Ask the page to flash/reveal/mark one reference (P4/P5).
   *
   * R1: `mark` returns a **fresh page identity observation** (the SW reads it *after*
   * the mark write) — without it D1 can never confirm a freshly picked reference.
   * `undefined` = no new observation (the judge keeps the previous, fail-closed fact).
   */
  highlight(refId: string, selector: string, mode: 'flash' | 'mark' | 'outline'): Promise<RefResolution | undefined>;
  /**
   * R3: one **read-only** text-candidate probe for an unusable reference. Returns the
   * observation (`candidates` / `unique` / `urlChanged`) or `undefined` when the page
   * side is unreachable — it never mints or mutates anything.
   */
  rescue(input: RescueInput): Promise<RescueObservation | undefined>;
  /**
   * R3: the user-confirmed one-click re-anchor. Re-probes (fresh facts, no TOCTOU),
   * then feeds the **unique** candidate through the SAME ingestion pipeline as a manual
   * pick (`withDeclaration()` + `onCapture`), which mints a new reference and writes the
   * identity mark. The old reference is untouched (append-only). `false` = refused
   * (ambiguous / moved path / page unreachable) — fail-closed, with a readable notice.
   */
  reanchor(input: RescueInput): Promise<boolean>;
  /** Route one inbound message; `true` when it was ours. */
  accept(raw: unknown): boolean;
  teardown(): void;
  state(): Record<string, unknown>;
}

/** R3: what the panel needs to describe one reference to the read-only rescue probe. */
export interface RescueInput {
  refId: string;
  selector: string;
  textDigest: string;
  origin: string;
}

/** R3: the rescue observation as reported by the background (facts only, no verdict). */
export interface RescueObservation {
  candidates: number;
  unique: boolean;
  urlChanged: boolean;
}

/** R3: the fresh DOM facts of the unique candidate (the background computed them read-only). */
export interface RescueFacts {
  selector: string;
  semanticPath: string;
  textDigest: string;
  capturedAt: number;
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
      // R1: the *state* is the fact (a site without a usable declaration still has a
      // complete, comparable state). The digest only exists while the state is `valid`.
      ...(base.declaration ? { declarationStatus: base.declaration.status } : {}),
      ...(base.declaration?.hash ? { declarationHash: base.declaration.hash } : {}),
      ...(base.declaration?.version ? { declarationVersion: base.declaration.version } : {}),
    };
  };

  /**
   * R1 (2026-09-17) — **complete the capture fact at ingestion**.
   *
   * The page side is frozen (`src/content/**` + `dist/pick-layer.js` are byte-pinned),
   * so a capture can only carry `declarationHash`; on a site without an adopted
   * declaration that is `''`, which the judge's completeness check used to read as
   * "fact missing" ⇒ **every reference picked on such a site was born dead**. The
   * status comes from the background's single declaration source (the `state` reply),
   * i.e. no second state machine is introduced here.
   */
  const withDeclaration = (facts: RawRefFacts): RawRefFacts => {
    const d = deps.envInput().declaration;
    if (!d) return facts;
    return {
      ...facts,
      declaration: {
        status: d.status,
        ...(d.hash ? { hash: d.hash } : {}),
        ...(d.version ? { version: d.version } : {}),
      },
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

  const highlight = async (
    refId: string,
    selector: string,
    mode: 'flash' | 'mark' | 'outline',
  ): Promise<RefResolution | undefined> => {
    state.highlights += 1;
    const res = await deps.send({ kind: 'ref-highlight', refId, selector, mode });
    // R1: only the identity-marking round-trip returns a fresh observation; every other
    // mode stays a pure side effect (the surface is unchanged for the hover/flash paths).
    if (mode !== 'mark' || !res.ok) return undefined;
    return (res.data as { resolution?: RefResolution } | undefined)?.resolution;
  };

  /**
   * R3 — the read-only rescue round-trip (panel → SW → page text search → panel).
   * `anchor: true` additionally asks for the fresh capture facts of the unique
   * candidate; the read-only default never returns facts the caller could misuse.
   */
  const probeRescue = async (
    input: RescueInput,
    anchor: boolean,
  ): Promise<{ observation: RescueObservation; facts?: RescueFacts } | undefined> => {
    const res = await deps.send({
      kind: 'ref-rescue',
      refId: input.refId,
      selector: input.selector,
      textDigest: input.textDigest,
      origin: input.origin,
      ...(anchor ? { anchor: true } : {}),
    });
    if (!res.ok) return undefined;
    const data = res.data as
      | { rescue?: Partial<RescueObservation>; facts?: RescueFacts; reason?: string }
      | undefined;
    const r = data?.rescue;
    if (!r || typeof r.candidates !== 'number') return undefined;
    return {
      observation: {
        candidates: r.candidates,
        unique: r.unique === true || r.candidates === 1,
        urlChanged: r.urlChanged === true,
      },
      ...(data?.facts ? { facts: data.facts } : {}),
    };
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
      deps.onCapture(withDeclaration(m.facts), m.resolution ?? { status: 'unreachable' });
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
    // The drag payload is minted page-side (frozen) ⇒ it has the same blind spot as a
    // click capture and goes through the same completion.
    deps.onCapture(withDeclaration(facts), { status: 'resolved' });
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
    async rescue(input) {
      return (await probeRescue(input, false))?.observation;
    },
    async reanchor(input) {
      // The mark write below is the identity D1 compares against, so the layer must be
      // live. A failed injection ⇒ refuse readably instead of minting a dead reference.
      if (!(await inject())) {
        deps.notify(`✖ 重锚失败：页面侧不可用（${state.unavailable ?? '注入失败'}）`);
        return false;
      }
      // Re-probe at click time (fresh facts): the first probe only drove the UI, so
      // reusing its facts would be a TOCTOU — the element may have moved since.
      const probe = await probeRescue(input, true);
      const obs = probe?.observation;
      if (!obs || !obs.unique || obs.urlChanged || !probe?.facts) {
        deps.notify(
          obs
            ? `✖ 无法一键重锚（${obs.candidates > 1 ? `文本多处匹配 ${obs.candidates} 处` : '页面路径已变化'}）：请手动重新拾取或改用描述。`
            : '✖ 无法一键重锚：页面侧不可达（按失效处理）。',
        );
        return false;
      }
      // The SAME ingestion pipeline as a manual pick: the panel's own origin / document
      // identity / declaration snapshot are completed here (the page could not know them),
      // and `onCapture` mints the new id + writes the mark + re-judges. The old reference
      // is deliberately left untouched (append-only, FR contract).
      const facts: RawRefFacts = {
        selector: probe.facts.selector,
        semanticPath: probe.facts.semanticPath,
        textDigest: probe.facts.textDigest,
        origin: deps.envInput().activeOrigin || input.origin,
        documentId: state.documentId,
        navSeq: state.navSeq,
        // Same caliber as a page capture: the digest exists only while the adopted
        // declaration is valid; the *state* snapshot is added by `withDeclaration()`.
        declarationHash: deps.envInput().declaration?.hash ?? '',
        capturedAt: probe.facts.capturedAt,
      };
      deps.onCapture(withDeclaration(facts), { status: 'resolved', nodeCount: 1 });
      return true;
    },
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
