/**
 * F-36 / ADN-1 **TASK-ADN-106**（ADR-ADN-001 §④/§⑤/§⑥ · ADR-ADN-002 · ADR-ADN-003 §① ·
 * FR-ADN-016~029）—— **AI next 候选的解析 + 5 道校验链 + 接受层判定**（NEW；B 列，纯函数）。
 *
 * ── 三条纪律（每处 loud，零第二处）────────────────────────────────────────────
 *
 *   ① **解析在 SW**：取**本回合最后一条** `assistant` 文本里的**最后一个** info 为 `next`
 *      的围栏块（大小写不敏感）；严格 `JSON.parse`；顶层必须**数组**（否则 ⇒ 零候选，
 *      **不写 blocked** —— 那是「未产出」支线 C，不是「被拦」支线 B）；非对象项 ⇒ 丢弃。
 *   ② **5 道校验链顺序即优先级**：① opId 在册（9 枚）→ ② `tierOf` 三档（`gesture` 恒拒）→
 *      ③ ref 有效（本回合快照）→ ④ param 与该 op 的 `ask` 相容 → ⑤ label 形状 + 零明文预筛。
 *      **顺序不可交换**：未知 op + 越界 ref ⇒ **只**报 `unknown-op`（不对未知 op 做后续判）。
 *   ③ **纯函数**：无 DOM / 时钟 / IO / chrome / fetch；零新真值源（只读 `shared/op-table` 与
 *      本回合 refs 载荷）。`AI_NEXT_LABEL_MAX` / `AI_NEXT_PARAM_MAX` 是**显示 / 结构上限**，
 *      **不是**护栏六常量阈值（零第二阈值；ADR-ADN-006 §⑤）。
 *
 * ── 零新 LLM（FR-ADN-017）────────────────────────────────────────────────────
 *
 * 校验只消费**刚结束回合**的输出文本（`service-worker.ts` 的 `done` 装配点）；本模块不发起
 * 任何 provider / 网络调用 ⇒ FR-CHAT-060 不破。
 *
 * @module background/ai-next
 */
import { OP_IDS, opDescriptor, tierOf } from '../shared/op-table.js';
// 零明文 caliber 复用（ADR-ADN-001 §⑥：**不新写净化器**；`assertNoPlaintext` 是唯一判据）。
import { assertNoPlaintext } from '../ui/sidepanel/stream-digest.js';
import type { PressBlocked } from '../ui/sidepanel/next-registry/ai-drive.js';
import type { AiNextBlockedCode, AiNextCandidate, AiNextPayload } from '../ui/sidepanel/next-registry/definition.js';

/** label 的**显示上限**（字符；先扫后截 —— 截断不掩护泄漏）。非六常量阈值。 */
export const AI_NEXT_LABEL_MAX = 48;
/** params 的**结构上限**（字符；仅候选元数据，本轮不参与派发）。非六常量阈值。 */
export const AI_NEXT_PARAM_MAX = 128;

/** The fence info string the contract asks for（大小写不敏感匹配）。 */
export const AI_NEXT_FENCE_INFO = 'next';

/**
 * 接受层拒绝码 = `PressBlocked` 的两个同字面码 + `ref` / `param` / `label`（**类型单源**：
 * `unknown-op` / `tier` 从按下层派生 ⇒ 零第二词表运行期声明）。
 */
export type AdmitBlocked = Extract<PressBlocked, 'unknown-op' | 'tier'> | 'ref' | 'param' | 'label';

/** 本回合的引用事实（**只读**；来自 `background/ref-turn.ts` 的回合快照，零新真值源）。 */
export interface AiNextRefFact {
  readonly refId: string;
  readonly refNum: number;
  readonly refState: string;
}
export interface AiNextFacts {
  readonly refs: readonly AiNextRefFact[];
}

/* ────────────────────────────────────────────────────────────────────────────
 * 1. 解析（ADR-ADN-001 §④）
 * ──────────────────────────────────────────────────────────────────────────── */

/** 三反引号围栏块（info 只取 `[A-Za-z0-9_-]*`；`next` 大小写不敏感）。 */
const FENCE = /```[ \t]*([A-Za-z0-9_-]*)[ \t]*\r?\n([\s\S]*?)```/g;

/** 取**最后一个** info 为 `next` 的围栏块体（无 ⇒ `null`）。 */
export function lastNextFenceBody(text: string | undefined): string | null {
  if (typeof text !== 'string' || text.length === 0) return null;
  let last: string | null = null;
  FENCE.lastIndex = 0;
  for (const m of text.matchAll(FENCE)) {
    if (String(m[1]).toLowerCase() === AI_NEXT_FENCE_INFO) last = m[2];
  }
  return last;
}

/**
 * 解析候选项：无块 / 非法 JSON / 顶层非数组 ⇒ `[]`（支线 C，**不写 blocked**）；
 * 非对象项 ⇒ 丢弃（形状未成候选）；对象项进入 5 道校验链。
 */
export function parseAiNextItems(text: string | undefined): readonly unknown[] {
  const body = lastNextFenceBody(text);
  if (body === null) return Object.freeze([]);
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return Object.freeze([]);
  }
  if (!Array.isArray(parsed)) return Object.freeze([]);
  return Object.freeze(parsed.filter((item) => typeof item === 'object' && item !== null && !Array.isArray(item)));
}

/* ────────────────────────────────────────────────────────────────────────────
 * 2. 单条候选的 5 道校验链（顺序即优先级；纯函数，反证从它实跑）
 * ──────────────────────────────────────────────────────────────────────────── */

/** ref 命中本回合快照 ∧ `refState === 'valid'`；只接受 `refId` 或规范形 `ref_<refNum>`。 */
function refAdmitted(ref: string, facts: AiNextFacts): boolean {
  return facts.refs.some((f) => f.refState === 'valid' && (f.refId === ref || `ref_${f.refNum}` === ref));
}

/**
 * 判定一条候选是否可**接受**（提案可见可点）。真值表（非恒真，四情形逐一断言）：
 *   · 在册 ∧ `tierOf === 'auto'`     ⇒ ✅ 接受（可自动按下）；
 *   · 在册 ∧ `tierOf === 'confirm'`  ⇒ ✅ 接受（可提案；consent 须用户答；**不可自动按下**）；
 *   · 在册 ∧ `tierOf === 'gesture'`  ⇒ ❌ `blocked='tier'`（连提案都拒）；
 *   · 不在册 / 缺 opId               ⇒ ❌ `blocked='unknown-op'`。
 */
export function admitCandidate(
  c: unknown,
  facts: AiNextFacts,
): { readonly ok: true; readonly candidate: AiNextCandidate } | { readonly ok: false; readonly blocked: AdmitBlocked } {
  // ① opId 在册（缺 opId / 非字符串 ⇒ unknown-op）。
  const raw = c as { opId?: unknown; label?: unknown; ref?: unknown; params?: unknown };
  const opId = typeof raw?.opId === 'string' ? raw.opId : '';
  const d = opId.length > 0 && (OP_IDS as readonly string[]).includes(opId) ? opDescriptor(opId) : undefined;
  if (!d) return { ok: false, blocked: 'unknown-op' };
  // ② 三档清分：`gesture` 恒拒（与 `confirm` 不混同）。
  if (tierOf(d) === 'gesture') return { ok: false, blocked: 'tier' };
  // ③ ref（缺席 ⇒ 通过；有值但不命中 / 已失效 ⇒ ref）。
  if (raw.ref !== undefined) {
    if (typeof raw.ref !== 'string' || !refAdmitted(raw.ref, facts)) return { ok: false, blocked: 'ref' };
  }
  // ④ param 与该 op 的 `ask` 相容（缺席 ⇒ 通过）。
  if (raw.params !== undefined) {
    if (d.ask === undefined) return { ok: false, blocked: 'param' };
    const p = raw.params;
    if (typeof p !== 'string' || p.length === 0 || p.length > AI_NEXT_PARAM_MAX) return { ok: false, blocked: 'param' };
  }
  // ⑤ label 形状 + 零明文预筛（先扫后截；命中 ⇒ fail-closed 丢弃，非崩溃）。
  if (typeof raw.label !== 'string' || raw.label.length === 0) return { ok: false, blocked: 'label' };
  try {
    assertNoPlaintext([raw.label]);
  } catch {
    return { ok: false, blocked: 'label' };
  }
  const label = raw.label.slice(0, AI_NEXT_LABEL_MAX);
  return {
    ok: true,
    candidate: Object.freeze({
      opId,
      label,
      ...(typeof raw.ref === 'string' ? { ref: raw.ref } : {}),
      ...(typeof raw.params === 'string' ? { params: raw.params } : {}),
    }),
  };
}

/**
 * 解析 + 逐项校验（**面板只接收已校验候选** ⇒ 面板侧零第二校验器，N-ADN-022）。
 * `blocked` 按项顺序记录（面板写留痕时去重 join）。
 */
export function validateAiNext(text: string | undefined, facts: AiNextFacts): AiNextPayload {
  const accepted: AiNextCandidate[] = [];
  const blocked: AiNextBlockedCode[] = [];
  for (const item of parseAiNextItems(text)) {
    const verdict = admitCandidate(item, facts);
    if (verdict.ok) accepted.push(verdict.candidate);
    else blocked.push(verdict.blocked);
  }
  return Object.freeze({ accepted: Object.freeze(accepted), blocked: Object.freeze(blocked) });
}
