/**
 * V5.5F-1 **TASK-V55F-117** (ADR-SGO-003 §3 · FR-SGO-033 · AC-SGO-022 · R-SGO-913) —
 * **只读身份观测的单一实现**（`observeIdentity`）.
 *
 * ── 为什么必须抽出来 ─────────────────────────────────────────────────────────
 *
 * 原实现是 `service-worker.ts` 的**模块私有**函数，被 `ref-highlight` 的 `mark` / `observe`
 * 两模式复用。`--ref` 锚定链需要**同一个**观测：
 *
 *   · `service-worker.ts`（写后重评 / 身份标记回读）；
 *   · `src/tools/dom-anchor.ts`（`--ref <n>` 的 **live 单节点闸**）。
 *
 * 两处**同源 import**（禁第二份副本）—— 本模块是唯一实现点。`src/background/**` 与
 * `src/tools/**` 同在 `background.js` bundle ⇒ base 零 diff（N-SGO-007）。
 *
 * ── 口径（R-SGO-913 显式登记）──────────────────────────────────────────────
 *
 * 本函数是**只读**观测：`querySelectorAll` / `getAttribute` / `textContent`，**零 DOM 写**。
 * 它被 `--ref` 用作**每写一次**的单节点闸，**不是**「每回合一次只读重观测」
 * （NG-SGO-013 / NFR-SGO-008 的判据面向「引用注入」面）。
 *
 * @module background/ref-observe
 */

/** 只读身份观测的形状（与 `l1/ref-validity.ts#RefResolution` 消费面同形）。 */
export interface RefObservation {
  readonly status: 'resolved' | 'missing' | 'ambiguous' | 'invalid-selector';
  readonly refMark?: string;
  readonly nodeCount?: number;
  readonly textDigest?: string;
}

/** 只读观测缝（`ref-turn.ts` 的回合快照透传它；`--ref` live 闸同源取用）。 */
export type RefObserver = (tabId: number, selector: string) => Promise<RefObservation | undefined>;

/**
 * R1（2026-09-17）— read the page's **current** identity observation for `selector`
 * (read-only DOM read in the tab's isolated world, the same world the injected bundle
 * runs in). The shape is the one `l1/ref-validity.ts#RefResolution` consumes:
 * `invalid-selector` (the CSS parser rejected the selector) / `missing` (0 nodes) /
 * `ambiguous` (>1) / `resolved` + the `data-wcli-ref` mark.
 *
 * R4（2026-09-22）: the throw is no longer folded into `missing`. A selector the parser
 * rejects is a **capture defect**（非法 / 被截断的选择器），and reporting it as
 * 「目标元素已不存在」is exactly the mis-diagnosis that made the reference born dead.
 *
 * Why it exists: the identity mark is written by the panel **after** the capture report
 * (the panel mints the id), so the capture-time report structurally cannot carry it —
 * without a fresh read, D1 denies every freshly picked reference. A failed read returns
 * `undefined`, which the panel treats as "no new observation" ⇒ the judge stays
 * fail-closed on the older fact.
 */
export async function observeIdentity(
  tabId: number,
  selector: string,
): Promise<RefObservation | undefined> {
  const results = await chrome.scripting
    .executeScript({
      target: { tabId },
      func: (sel: string) => {
        let nodes: Element[];
        try {
          nodes = Array.from(document.querySelectorAll(sel));
        } catch {
          return { status: 'invalid-selector' as const };
        }
        if (nodes.length === 0) return { status: 'missing' as const };
        if (nodes.length !== 1) return { status: 'ambiguous' as const, nodeCount: nodes.length };
        const node = nodes[0];
        const mark = node.getAttribute('data-wcli-ref');
        // R6（2026-09-23）—— 只读重观测同时带回**当前文本摘要**（与 `content/ref-capture.ts`
        // 同一口径的等价副本：flatten + 80 字截断 + 被截断补 `…`）。判定侧据此判
        // `text-changed`（身份仍在但内容被改写）；本函数仍**不写页面**。
        const TEXT_DIGEST_MAX = 80;
        const flatten = (text: string | null | undefined): string => String(text ?? '').replace(/\s+/g, '');
        const truncated = flatten(node.textContent);
        const textDigest = truncated.length > TEXT_DIGEST_MAX ? `${truncated.slice(0, TEXT_DIGEST_MAX)}…` : truncated;
        return { status: 'resolved' as const, nodeCount: 1, ...(mark ? { refMark: mark } : {}), textDigest };
      },
      args: [selector],
    })
    .catch(() => undefined);
  const result = results?.[0]?.result;
  return result && typeof result === 'object' ? (result as { status: 'resolved' }) : undefined;
}
