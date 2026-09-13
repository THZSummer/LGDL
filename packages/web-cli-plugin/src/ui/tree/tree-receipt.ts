/**
 * V2-3 撤销后果三件套回执（FR-V2-037 / FR-V2-039；ADR-V2-009）。
 *
 * 纯对象构造（**零 IO、零 chrome 接口、零写 store、零明文**）：
 *   ① `receipt`              —— 成功/失败原因 + 下一步的可读回执；
 *   ② `toolSurfaceEvidence`  —— **动作后重拉实测**的工具面证据（非文案声称）；
 *   ③ `auditEntry`           —— 既有 `admin_audit-export` 审计入口提示。
 *
 * 「无静默失败 / 无假成功」的落点：
 *   - `opResult.ok === false` ⇒ `receipt.kind === 'err'`，**绝不**渲染成功态；
 *   - ② 的 `present` 只由**注入的重拉实测值**决定（本模块不做任何判断性假设）；
 *   - 重拉失败时用 {@link unverifiedEvidence} 明确标注「未确认」，不冒充「已移除」；
 *   - 本模块**无 `catch`**，因此结构上不可能吞错。
 *
 * 零明文：本模块只接收既有 `OpResult.text`（由 v1 ops 生成，已掩码）与目标标识，
 * **不接收/不构造** key 明文、剪贴板内容、通知正文、URL query、书签标题。
 */
import type { TreeActionId } from '../../insight/tree-model.js';
import type { OpResult } from '../settings/ops.js';

/** 回执语义（与 v1 `OpMessageKind` 同形：ok / warn / err）。 */
export type TreeReceiptKind = 'ok' | 'warn' | 'err';

export interface TreeReceipt {
  /** ① 回执（含成功/失败原因 + 下一步）。 */
  receipt: { ok: boolean; kind: TreeReceiptKind; text: string; nextStep?: string };
  /** ② 工具面已移除证据（**来自动作后重拉实测**）。 */
  toolSurfaceEvidence: { tool: string; present: boolean; checkedAt: number; evidence: string };
  /** ③ 审计入口（既有 `admin_audit-export`）。 */
  auditEntry: { entryPoint: 'admin_audit-export'; hint: string };
}

/** ③ 审计入口标识（既有通道，不新增）。 */
export const AUDIT_ENTRY_POINT = 'admin_audit-export';

/** ③ 审计入口提示（含入口路径 + 零明文声明）。 */
export const AUDIT_ENTRY_HINT =
  '在侧栏「查看审计」或经既有 admin_audit-export 查看本次撤销/关断事件（事件经既有 redact 掩码，零明文）。';

/** 不改变工具面集合的动作（如关断自动授权 / 断开 LLM / 解散分组）的证据文案。 */
export const NO_SURFACE_CHANGE_HINT = '本次动作不改变工具面集合（撤销自动授权 / 分组 ≠ 撤销站点授权）。';

/**
 * ② 工具面证据（**实测值驱动**）。
 *
 * `present` 必须是动作后重拉 `insight-tree` 得到的真值，**不得**由意图/文案推断。
 */
export function toolSurfaceEvidence(
  tool: string,
  present: boolean,
  now: number,
  note?: string,
): TreeReceipt['toolSurfaceEvidence'] {
  const subject = tool || '（无绑定工具）';
  const base = present
    ? `重拉实测：${subject} 仍在工具面（deriveTools）——未移除`
    : `重拉实测：${subject} 已不在工具面（deriveTools）——已移除`;
  return {
    tool: subject,
    present,
    checkedAt: now,
    evidence: note ? `${base}；${note}` : base,
  };
}

/**
 * ② 重拉失败时的证据：明确「未确认」，`present` 保守取 `true`（不冒充已移除）。
 * 绝不静默 —— 调用方应把 `reason` 同时透出到可读回执。
 */
export function unverifiedEvidence(tool: string, now: number, reason: string): TreeReceipt['toolSurfaceEvidence'] {
  const subject = tool || '（无绑定工具）';
  return {
    tool: subject,
    present: true,
    checkedAt: now,
    evidence: `重拉实测未完成（${reason}）：无法确认 ${subject} 是否已移出，按「未确认」呈现（不假成功）`,
  };
}

/** ③ 审计入口对象（恒定指向既有通道）。 */
function auditEntry(): TreeReceipt['auditEntry'] {
  return { entryPoint: AUDIT_ENTRY_POINT, hint: AUDIT_ENTRY_HINT };
}

export interface BuildReceiptInput {
  actionId: TreeActionId;
  /** 既有 ops / transport 的统一结果；`ok===false` ⇒ `kind:'err'`。 */
  opResult: OpResult<unknown>;
  /** ② 目标工具（缺省 = 本次动作不改变工具面集合）。 */
  tool?: string;
  /** ② 重拉实测值：该工具是否**仍**在工具面（仅在 `tool` 提供时有意义）。 */
  present?: boolean;
  /** ② 重拉时刻（可注入；纯函数不读时钟）。 */
  now: number;
  /** ② 实测附注（可选）。 */
  detail?: string;
  /** ② 显式证据（优先于 `tool`/`present`；用于「重拉失败」等不确定态）。 */
  evidence?: TreeReceipt['toolSurfaceEvidence'];
  /** 失败/成功后的下一步（可读）。 */
  nextStep?: string;
}

/**
 * 组装三件套。**纯净**：`now` 由调用方注入（本模块不读时钟、不做 IO）。
 *
 * ② 取值优先级：显式 `evidence`（不确定态）> `tool` + `present`（实测）> 无绑定工具。
 */
export function buildReceipt(input: BuildReceiptInput): TreeReceipt {
  const ok = input.opResult.ok === true;
  const text =
    input.opResult.text && input.opResult.text.length > 0
      ? input.opResult.text
      : ok
        ? '✓ 已完成（无补充说明）'
        : '✖ 失败：无原因文本（按失败呈现，不假成功）';
  const kind: TreeReceiptKind = ok ? (input.opResult.kind === 'warn' ? 'warn' : 'ok') : 'err';

  let evidence: TreeReceipt['toolSurfaceEvidence'];
  if (input.evidence) {
    evidence = input.evidence;
  } else if (input.tool !== undefined) {
    evidence = toolSurfaceEvidence(input.tool, input.present === true, input.now, input.detail);
  } else {
    evidence = { tool: '（无绑定工具）', present: true, checkedAt: input.now, evidence: NO_SURFACE_CHANGE_HINT };
  }

  return {
    receipt: {
      ok,
      kind,
      text,
      ...(input.nextStep ? { nextStep: input.nextStep } : {}),
    },
    toolSurfaceEvidence: evidence,
    auditEntry: auditEntry(),
  };
}
