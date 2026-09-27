/**
 * NDA-1（原 F-36 / ADN-1 **TASK-ADN-106**）—— **AI next 候选的解析 + 5 道校验链 + 接受层判定**
 * （B 列，纯函数）。
 *
 * ── NDA-1 TASK-NDA-105 换轨（ADR-NDA-004 §① · ADR-NDA-101）─────────────────
 *
 * 上游产出从「文本尾随 `next` 围栏块 + 正则解析」换成「`next` 工具调用 + `hooks.intercept`
 * 捕获」：围栏块解析的四符号（info 串常量 / 围栏正则 / 取末块 / 解析入口）**函数级删除**
 * （结构性消除影子产出 EC-NDA-020），改为 `parseNextToolArguments(raw)`（`tc.rawArguments`
 * 严格 JSON，逐层口径与旧解析等价）。
 *
 * ── 三条纪律（每处 loud，零第二处）────────────────────────────────────────────
 *
 *   ① **解析在 SW**：`parseNextToolArguments` 取 `tc.rawArguments` 严格 `JSON.parse`；顶层必须
 *      **对象**（否则 ⇒ 零候选，**不写 blocked** —— 那是「未产出」支线 C，不是「被拦」支线 B）；
 *      缺 `candidates` / 非数组 ⇒ 零候选；非对象项 ⇒ 丢弃。
 *   ② **5 道校验链顺序即优先级**：① opId 在册（9 枚）→ ② `tierOf` 三档（`gesture` 恒拒）→
 *      ③ ref 有效（本回合快照）→ ④ param 与该 op 的 `ask` 相容 → ⑤ label 形状 + 零明文预筛。
 *      **顺序不可交换**：未知 op + 越界 ref ⇒ **只**报 `unknown-op`（不对未知 op 做后续判）。
 *   ③ **纯函数**：无 DOM / 时钟 / IO / chrome / fetch；零新真值源（只读 `shared/op-table` 与
 *      本回合 refs 载荷）。`AI_NEXT_LABEL_MAX` / `AI_NEXT_PARAM_MAX` 是**显示 / 结构上限**，
 *      **不是**护栏六常量阈值（零第二阈值；ADR-ADN-006 §⑤）。
 *
 * ── 零新 LLM（FR-ADN-017 / FR-NDA-017）───────────────────────────────────────
 *
 * 校验只消费**同回合内**工具调用捕获的 `candidates`（`service-worker.ts` 的 `done` 装配点）；
 * 本模块不发起任何 provider / 网络调用 ⇒ FR-CHAT-060 不破。
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
 * 1. 解析（ADR-NDA-101 §① / ADR-NDA-002 §③）
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * 从 `next` 工具调用的**原始 arguments** 取候选数组（ADR-NDA-101 §①）。
 *
 * 五层筛法（与已删除的 F-36 围栏块解析入口 **逐层等价**）：
 *   · `raw` 非串 / 空 ⇒ `[]`（未产出）；
 *   · 非法 JSON ⇒ `[]`（**不抛错** ⇒ 不中断回合，EC-NDA-015）；
 *   · 顶层非对象 / 数组 / `null` ⇒ `[]`；
 *   · 缺 `candidates` / 非数组 ⇒ `[]`；
 *   · 项非对象（含数组）⇒ **丢弃**，其余照常。
 *
 * **唯一输入面 = `tc.rawArguments`**：基座 `parseToolArguments` 对嵌套数组只保留标量（
 * `tc.args` 取不到 `candidates`）⇒ 本仓**零使用 `tc.args`**（ADR-NDA-101 §① / R-NDA-912）。
 */
export function parseNextToolArguments(raw: string | undefined): readonly unknown[] {
  if (typeof raw !== 'string' || raw.length === 0) return Object.freeze([]);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return Object.freeze([]);
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return Object.freeze([]);
  const list = (parsed as { candidates?: unknown }).candidates;
  if (!Array.isArray(list)) return Object.freeze([]);
  return Object.freeze(list.filter((item) => typeof item === 'object' && item !== null && !Array.isArray(item)));
}

/** 本回合 `next` 捕获态（ADR-NDA-101 §③）：`captured` 与候选**分离**可判。 */
export interface NextTurnCapture {
  /** 本回合模型是否**调用过** `next` 工具（解析失败亦为 `true`）。 */
  readonly captured: boolean;
  /** 最近一次调用的候选（覆盖式；`≤3` 截断不在本层）。 */
  readonly lastCandidates: readonly unknown[];
}

/** 捕获态初值：未捕获 / 零候选。 */
export function emptyNextTurnCapture(): NextTurnCapture {
  return Object.freeze({ captured: false, lastCandidates: Object.freeze([]) });
}

/**
 * **覆盖式**捕获（取最后一次 `next` 调用，非并集；ADR-NDA-101 §③）：返回值只取决于本次
 * `raw`（`prev` 仅为调用侧 `let` 重赋值的可读签名）。解析失败 ⇒ `captured=true` ∧ 零候选
 * （与「压根没调用」可判）。
 */
export function captureNextCall(prev: NextTurnCapture, raw: string | undefined): NextTurnCapture {
  void prev;
  return Object.freeze({ captured: true, lastCandidates: parseNextToolArguments(raw) });
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
 * 逐项校验（**面板只接收已校验候选** ⇒ 面板侧零第二校验器，N-ADN-022）。
 * 输入面 = **上游已解析的候选数组**（NDA-1 TASK-NDA-105 改签名：`text` → `candidates`；
 * 解析与校验两层分离 ⇒ 各自可判、可注入反证，ADR-NDA-004 §①）。
 * `blocked` 按项顺序记录（面板写留痕时去重 join）。
 *
 * `≤3` 截断**不在本层**（由装配层 `slice(0, MAX_CHIPS_PER_CARD)` 承担，ADR-NDA-101 §③）。
 */
export function validateAiNext(candidates: readonly unknown[], facts: AiNextFacts): AiNextPayload {
  const accepted: AiNextCandidate[] = [];
  const blocked: AiNextBlockedCode[] = [];
  for (const item of candidates) {
    const verdict = admitCandidate(item, facts);
    if (verdict.ok) accepted.push(verdict.candidate);
    else blocked.push(verdict.blocked);
  }
  return Object.freeze({ accepted: Object.freeze(accepted), blocked: Object.freeze(blocked) });
}
