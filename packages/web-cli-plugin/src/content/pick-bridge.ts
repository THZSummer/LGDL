/**
 * V3-4 TASK-404 (ADR-V3-030 / ADR-V3-033) — the pick layer's message bridge.
 *
 * ── The two directions ───────────────────────────────────────────────────────
 *
 * Outbound (page → panel/background, `chrome.runtime.sendMessage` broadcast):
 *   - `pick-layer-state`  the document identity + nothing else (`documentId`,
 *     `navSeq`, plus a readable `reason` when the layer is going away). This is a
 *     *fact* report: the panel decides what it means (FR-V3-036 keeps judgement on
 *     the panel side).
 *   - `ref-captured`      one reference's raw facts + the page-side observation
 *     (`status` / `refMark`), again facts only — never a verdict.
 *
 * Inbound (`chrome.runtime.onMessage`, delivered with `tabs.sendMessage`):
 *   - `pick-layer-env`      the declaration hash/version the page cannot know
 *     itself, plus the authorization view; cached and stamped onto captures.
 *   - `pick-layer-teardown` unmount everything (panel closed / authorization
 *     revoked).
 *   - `ref-highlight`       P4/P5: flash + reveal a target the panel is highlighting.
 *
 * ── Why the bridge is defensive ──────────────────────────────────────────────
 *
 * The same bundle must survive being evaluated in a context without an extension
 * runtime (the zero-injection negative control does exactly that). Every
 * `chrome.runtime` touch is therefore optional-chained; a missing runtime degrades
 * to "report nothing", never to a thrown error that would leave half a layer behind.
 *
 * @module content/pick-bridge
 */

import type { CaptureFacts } from './ref-capture.js';
import type { ResolutionReport } from './ref-capture.js';

/** The declaration facts the page cannot observe and must be told. */
export interface LayerEnv {
  origin: string;
  declarationHash: string;
  declarationVersion?: string;
  authorized: boolean;
}

export const PICK_LAYER_VERSION = 'v3-4';

export interface BridgeDeps {
  /** The document identity the layer owns (the bridge only carries it). */
  identity(): { documentId: string; navSeq: number };
  /** A highlight request from the panel (P4/P5). */
  onHighlight(msg: { refId?: string; selector?: string; mode?: string }): void;
  onTeardown(): void;
  onEnv(env: LayerEnv): void;
}

export interface Bridge {
  env(): LayerEnv;
  /** Push the document identity (and a readable reason when leaving). */
  pushState(phase: 'ready' | 'update' | 'gone', reason?: string): void;
  /** Push one captured reference. */
  pushCapture(facts: CaptureFacts, resolution: ResolutionReport): void;
  /** FR-V3-066: tell the panel its chip's counterpart is hovered on the page. */
  pushPageHover(refId: string): void;
  /** Route one inbound message; returns `true` when it was ours. */
  accept(raw: unknown): boolean;
  unmount(): void;
}

function runtime(): typeof chrome.runtime | undefined {
  return (globalThis as { chrome?: typeof chrome }).chrome?.runtime;
}

export function createBridge(deps: BridgeDeps): Bridge {
  let env: LayerEnv = { origin: '', declarationHash: '', authorized: false };
  const send = (kind: string, payload: Record<string, unknown>): void => {
    try {
      void runtime()?.sendMessage?.({ kind, ...payload });
    } catch {
      /* no extension runtime (negative-control injection) — nothing to report */
    }
  };
  const listener = (raw: unknown): void => {
    accept(raw);
  };
  function accept(raw: unknown): boolean {
    const msg = raw as { kind?: string } | null;
    const kind = msg?.kind ?? '';
    if (kind === 'pick-layer-teardown') {
      deps.onTeardown();
      return true;
    }
    if (kind === 'pick-layer-env') {
      const m = msg as unknown as { origin?: string; declarationHash?: string; declarationVersion?: string; authorized?: boolean };
      env = {
        origin: typeof m.origin === 'string' ? m.origin : env.origin,
        declarationHash: typeof m.declarationHash === 'string' ? m.declarationHash : env.declarationHash,
        authorized: m.authorized === true,
        ...(typeof m.declarationVersion === 'string' ? { declarationVersion: m.declarationVersion } : {}),
      };
      deps.onEnv(env);
      return true;
    }
    if (kind === 'ref-highlight') {
      deps.onHighlight(msg as { refId?: string; selector?: string; mode?: string });
      return true;
    }
    return false;
  }
  try {
    runtime()?.onMessage?.addListener(listener);
  } catch {
    /* no runtime — the layer still works, it just cannot be driven remotely */
  }
  return {
    env: () => ({ ...env }),
    pushState(phase, reason) {
      const id = deps.identity();
      send('pick-layer-state', {
        phase,
        documentId: id.documentId,
        navSeq: id.navSeq,
        ...(reason ? { reason } : {}),
      });
    },
    pushCapture(facts, resolution) {
      send('ref-captured', { facts, resolution });
    },
    pushPageHover(refId) {
      send('ref-highlight', { mode: 'page-hover', refId });
    },
    accept,
    unmount() {
      try {
        runtime()?.onMessage?.removeListener(listener);
      } catch {
        /* already detached */
      }
    },
  };
}
