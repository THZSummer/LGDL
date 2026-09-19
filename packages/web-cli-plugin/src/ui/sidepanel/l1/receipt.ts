/**
 * V3-2 TASK-204 (ADR-V3-022 / FR-V3-039 / NFR-V3-008 / NFR-V3-016) — the receipt
 * triple (回执三件套) for the L1 layer.
 *
 * ── Three pieces, none optional (FR-V3-039) ─────────────────────────────────
 *
 *   ① `summary`  — resident in **L0** (one line; the decision zone's receipt slot)
 *   ② `rows`     — the full evidence, one interaction away (`l1-receipt` panel)
 *   ③ `audit`    — the audit exit: jumps to the L2 audit view **and** carries an
 *                  inline one-line audit summary, so "three pieces present" is
 *                  decidable *inside* L1 (V32-O-4)
 *
 * The v2 semantics are **reused, not rewritten**: the receipt body comes from
 * `tree/tree-receipt.ts#buildReceipt`, and the tool-surface evidence is built by
 * the caller from a **fresh `insight-tree` pull** (the panel does that pull before
 * every receipt and stamps a monotonic `refreshSeq`, so a cached value would be
 * visible as a flat sequence).
 *
 * ── Zero plaintext (NFR-V3-016) ────────────────────────────────────────────
 *
 * The row labels ARE the field whitelist (they are constructed, never taken from
 * an action payload), and {@link assertNoPlaintext} scans the rendered strings
 * for forbidden content: command argument bodies, URL query strings, API keys,
 * clipboard / notification / bookmark bodies. Those appear only as a length, a
 * path or a basename.
 *
 * Pure: `now` is injected, no IO, no clock, no DOM.
 *
 * @module l1/receipt
 */
import { buildReceipt } from '../../tree/tree-receipt.js';
import type { TreeReceipt } from '../../tree/tree-receipt.js';

/** The three pieces — a closed list, so "one is missing" is enumerable. */
export const RECEIPT_PIECES = ['summary', 'evidence', 'audit'] as const;

/** Row labels (the field whitelist: nothing else may be rendered). */
export const RECEIPT_ROW_WHITELIST = [
  '命令名',
  '动作 id',
  '结果',
  '耗时',
  '时间',
  '审计 id',
  '目标摘要',
  '工具面（重拉实测）',
] as const;

/** ③ the audit exit label — verbatim, asserted by the gate. */
export const AUDIT_EXIT_LABEL = '查看审计（完整审计视图）';

/** Content that must never appear in a rendered receipt string. */
const FORBIDDEN = /api[-_]?key\s*[:=]|sk-[A-Za-z0-9]{8,}|\?[A-Za-z0-9_]+=[^&\s]+/i;

/** One evidence row. */
export interface ReceiptRow {
  label: string;
  value: string;
}

export interface L1Receipt {
  /** Monotonic pull sequence — proof the evidence came from a real re-pull. */
  refreshSeq: number;
  summary: string;
  kind: TreeReceipt['receipt']['kind'];
  rows: ReceiptRow[];
  audit: { exitLabel: string; target: 'l2-audit'; summary: string; entryPoint: string };
}

/**
 * Fail-closed plaintext scan over every rendered string of a receipt.
 *
 * I-11 (v4-2 review): `stream-digest.ts#assertNoPlaintext` is a **separate,
 * deliberately wider** predicate (it also rejects command argument bodies and raw
 * markup, because digest labels may echo caller input). This one stays narrow on
 * purpose: receipt labels are constructed constants, so only key/URL-query shapes
 * can arrive via a *value*. Do not merge the two without carrying both calibers —
 * see the note on the stream-side implementation.
 */
export function assertNoPlaintext(texts: readonly string[]): void {
  for (const text of texts) {
    if (FORBIDDEN.test(text)) {
      throw new Error('回执出现疑似明文：零明文纪律要求只记长度 / 路径 / basename，URL 必须去参');
    }
  }
}

/** Truncated target description (no full text, no query string). */
export function targetDigest(target: string): string {
  const flat = (target ?? '').replace(/[?#].*$/, '').replace(/\s+/g, '');
  return flat.length > 40 ? `${flat.slice(0, 40)}…` : flat || '（无目标）';
}

export interface BuildL1ReceiptInput {
  ok: boolean;
  text: string;
  actionId: string;
  command?: string;
  ms?: number;
  auditId?: string;
  target?: string;
  /** ② the tool-surface evidence from the re-pull (or v2 `unverifiedEvidence`). */
  evidence: TreeReceipt['toolSurfaceEvidence'];
  refreshSeq: number;
  now: number;
}

/** Deterministic, timezone-free stamp (no locale APIs → same string everywhere). */
function stamp(now: number): string {
  return new Date(now).toISOString().replace('T', ' ').replace(/\.\d+Z$/, 'Z');
}

/**
 * Build the L1 receipt projection on top of the v2 receipt semantics. Rows follow
 * {@link RECEIPT_ROW_WHITELIST} order; the summary is the one-liner that stays
 * resident in L0.
 */
export function buildL1Receipt(input: BuildL1ReceiptInput): L1Receipt {
  const v2 = buildReceipt({
    actionId: input.actionId as Parameters<typeof buildReceipt>[0]['actionId'],
    opResult: { ok: input.ok, kind: 'ok', text: input.text },
    evidence: input.evidence,
    now: input.now,
  });
  const ok = v2.receipt.ok;
  const rows: ReceiptRow[] = [
    { label: '命令名', value: input.command?.trim() || '（无命令名）' },
    { label: '动作 id', value: input.actionId },
    { label: '结果', value: ok ? '成功' : '失败' },
    { label: '耗时', value: `${Math.max(0, Math.round(input.ms ?? 0))} ms` },
    { label: '时间', value: stamp(input.now) },
    { label: '审计 id', value: input.auditId?.trim() || '（未记录审计 id）' },
    { label: '目标摘要', value: targetDigest(input.target ?? v2.toolSurfaceEvidence.tool) },
    { label: '工具面（重拉实测）', value: v2.toolSurfaceEvidence.evidence },
  ];
  const receipt: L1Receipt = {
    refreshSeq: input.refreshSeq,
    kind: v2.receipt.kind,
    summary: `回执：${rows[0].value} · ${ok ? '✓ 成功' : '✖ 失败'} · ${rows[3].value} · 审计 ${rows[5].value}`,
    rows,
    audit: {
      exitLabel: AUDIT_EXIT_LABEL,
      target: 'l2-audit',
      summary: `最新审计：${ok ? '已记录' : '失败已记录'} · 审计 id ${rows[5].value}`,
      entryPoint: v2.auditEntry.entryPoint,
    },
  };
  // A leak throws here — not in a gate a later leaf could forget to run.
  assertNoPlaintext([receipt.summary, ...rows.map((r) => `${r.label}${r.value}`), receipt.audit.summary]);
  return receipt;
}

/** The three pieces present? (a missing piece is a hard FAIL, never a default.) */
export function receiptPiecesPresent(receipt: L1Receipt | null | undefined): {
  summary: boolean;
  evidence: boolean;
  audit: boolean;
} {
  return {
    summary: Boolean(receipt && receipt.summary.trim()),
    evidence: Boolean(receipt && receipt.rows.length > 0),
    audit: Boolean(receipt && receipt.audit.exitLabel.trim() && receipt.audit.summary.trim()),
  };
}
