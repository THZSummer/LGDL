/**
 * V5.5F-1 **TASK-V55F-106** (ADR-SGO-001 §4 · ADR-SGO-002 §3 · FR-SGO-015/016/017 ·
 * N-SGO-029 · EC-SGO-008 · R-SGO-908) — the **系统段追加段组装 + 回合载荷运行时校验**.
 *
 * ── 双轨（ADR-SGO-002 §3）────────────────────────────────────────────────────
 *
 *   · **A 轨（判据）** = 范围读数 `l1/ref-scope.ts#scopeReading`（面板侧）—— 门禁真源切片；
 *   · **B 轨（引导）** = 本模块产出的**自然语言追加段** —— 门禁**不读**提示词；
 *     「门禁读提示词」视为实现错误。
 *
 * ── 基座 + 追加段（FR-SGO-016）───────────────────────────────────────────────
 *
 * `SYSTEM_PROMPT` 常量**逐字保留为基座**（5 条既有条款不改，见 `service-worker.ts`）。
 *   · **无 refs ⇒ 返回 `''`** ⇒ `system === SYSTEM_PROMPT`（**逐字**，N-SGO-029 / EC-SGO-008）；
 *   · **有 refs ⇒** `'\n\n' + <引用事实行> + <法则引导文本>`。
 *
 * ── 运行时校验（FR-SGO-015）──────────────────────────────────────────────────
 *
 * 载荷来自消息面（可能被篡改 / 版本错位）：形状 / 正整数 `refNum` / 非空 `selector` /
 * `refState === 'valid'` 逐条判；**非法项逐项剔除**（不静默污染上下文，也不因一条坏数据
 * 丢弃整批）。
 *
 * @module background/ref-context
 */
import type { ChatRefFact } from './messaging.js';

/**
 * 追加段的**法则引导文本**（B 轨 / 引导，不是判据）：把「引用即范围」的机制事实
 * 翻译成模型可读的指令。**判据不读它**（ADR-SGO-002 §3）。
 */
export const REF_SCOPE_GUIDANCE = [
  'References define the scope of this turn:',
  'the numbered references listed above are the ONLY places the user has pointed at.',
  'When a tool writes (for example `dom set-text`), it MUST target one of those references',
  '(prefer `--ref <n>`); do not rewrite other parts of the page.',
  'Note: `--ref <n>` is accepted only by `dom set-text`; read commands must use `--selector` instead.',
  'If the request needs a target outside that scope, stop and ask the user to confirm widening',
  'it — never widen the scope on your own and never treat "no reference" as "everything is in scope".',
].join(' ');

/**
 * F-36 / ADN-1 **TASK-ADN-104**（ADR-ADN-001 §③ · ADR-ADN-004 PD-ADN-005 · FR-ADN-010）——
 * **AI next 产出契约句**（B 轨 / 引导，**不是**判据）。
 *
 * 关键纪律：它只并入**有引用分支**（`refContextSegment` 的 `valid.length > 0` 分支）⇒
 * 无引用 ⇒ 追加段仍为 `''` ⇒ `system` 逐字等于 `SYSTEM_PROMPT` 基座（RCT-3/RCT-4 保持绿）。
 * 基座 5 条与 `system` 工厂形态**零改**（契约句不是第 6 条基座条款）。
 *
 * 说明（本轮诚实登记）：`params` 是候选**元数据**、本轮不参与派发（ADR-ADN-002 §③），
 * 故契约句只描述 `opId` + `label` 两个必需字段。
 */
export const NEXT_CONTRACT_GUIDANCE = [
  'If, and only if, you can name the next best step for the user, end your final answer',
  'with ONE trailing fenced block tagged next, whose body is a strict JSON array of',
  '{"opId":"op.turn","label":"<short imperative in the user\'s language>"} objects.',
  'Only these ops may be proposed: op.turn, op.pick, op.describe, op.rebind, op.help.',
  'At most 3 items, in priority order. A label is short display text and must never contain',
  'a credential, a URL query string or a command argument body.',
].join(' ');

/** 一条事实的运行时校验（形状 + 语义；不通过 ⇒ 丢弃该条）。 */
export function isChatRefFact(value: unknown): value is ChatRefFact {
  if (typeof value !== 'object' || value === null) return false;
  const f = value as Partial<ChatRefFact>;
  return (
    typeof f.refNum === 'number' &&
    Number.isInteger(f.refNum) &&
    f.refNum > 0 &&
    typeof f.refId === 'string' &&
    f.refId.length > 0 &&
    typeof f.selector === 'string' &&
    f.selector.trim().length > 0 &&
    typeof f.refMark === 'string' &&
    typeof f.textDigest === 'string' &&
    f.refState === 'valid'
  );
}

/**
 * **逐项剔除**非法项的载荷校验（FR-SGO-015）。`refs` 缺席 / 非数组 ⇒ 空数组
 * （⇒ 追加段为空 ⇒ 系统段逐字等于基座）。
 */
export function validateRefPayload(raw: unknown): readonly ChatRefFact[] {
  if (!Array.isArray(raw)) return Object.freeze([]);
  return Object.freeze(raw.filter(isChatRefFact));
}

/** 一条引用事实行（机器可读；`textDigest` 已在投影处掩码 —— 见 `turnRefsOf`）。 */
export function refFactLine(f: ChatRefFact): string {
  return `- #${f.refNum} selector=${f.selector} textDigest=${f.textDigest || '（无）'} refState=${f.refState} refMark=${f.refMark}`;
}

/**
 * **系统段追加段**（FR-SGO-016）：无 refs ⇒ `''`（系统段逐字等于基座）；有 refs ⇒
 * 事实行 + 法则引导。**`SYSTEM_PROMPT` 基座不在此处**（它由 `service-worker.ts` 逐字持有）。
 */
export function refContextSegment(refs: readonly ChatRefFact[] | undefined): string {
  const valid = validateRefPayload(refs);
  if (valid.length === 0) return '';
  return `\n\n[references in this turn]\n${valid.map(refFactLine).join('\n')}\n${REF_SCOPE_GUIDANCE} ${NEXT_CONTRACT_GUIDANCE}`;
}
