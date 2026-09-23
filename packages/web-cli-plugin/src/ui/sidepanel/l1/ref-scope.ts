/**
 * V5.5F-1 **TASK-V55F-103 / 110 / 112** (ADR-SGO-001 §2 · ADR-SGO-002 §1/§2/§5 ·
 * FR-SGO-011/012/018/019/020~024/080/083/084 · R-SGO-901/903/917) — the
 * **引用快照投影 + 范围读数单源**（法九：范围读数）。
 *
 * ── 为什么要单源 ──────────────────────────────────────────────────────────────
 *
 * 母缺陷（根因 A/B/E）：唯一回合载荷是 `{ user }`，面板持有引用表而 SW 不持有 ⇒
 * 「用户指的是哪一处」在整个链路上**物理不可见**。本模块是「引用即范围」的**判据面**：
 *
 *   ① **引用快照投影** `turnRefsOf(records)` —— **恰一处**把 `RefRecord` 投影为进入回合的
 *      `ChatRefFact[]`（只取 `verdict === 'valid'` ∧ 未退役；`refMark = refId` 单点铸造）；
 *   ② **范围读数** `SCOPE_READINGS`（4 值）+ `scopeReading(facts)`（**唯一判定函数**）——
 *      第二处声明即 FAIL（N-SGO-028，对齐 `terminals.ts` 的唯一声明纪律）；
 *   ③ **留痕单源** `SCOPE_TRACE_FIELDS` / `scopeReadingTrace` —— 只含**字段名**与**机器枚举**
 *      （读数词 / actor），**零用户内容值**（FR-SGO-083 · R-SGO-917 caliber）。
 *
 * ── 口径写死（FR-SGO-012 · ADR-SGO-001 §5）─────────────────────────────────────
 *
 *   · **页面文本可入 LLM 上下文**：`textDigest` / `selector` 属**页面内容**（非凭据）；
 *   · **凭据值不可入任何面**：**凭据形** `textDigest` ⇒ 先掩码（EC-SGO-019）；
 *   · **留痕只含字段名**：读数词 / actor / 计数属**机器事实**，不受「零值」口径约束
 *     （R-SGO-917 显式登记）；正文 / 译文 / 凭据 / 答案全文 / URL query 一律除外。
 *
 * ── 只消费 verdict，不重判（R-SGO-901 结构性消除）─────────────────────────────
 *
 * 读数**只消费** store 的 `verdict`（`isActiveRef`），**不重判** `valid / invalid / unknown`；
 * 3 结果 + 6 维度的 deny 方向（`ref-validity.ts`）**零触碰**（X-SGO-5）。
 *
 * ── 列别（ADR-SGO-002 §1）────────────────────────────────────────────────────
 *
 * 本模块**只被面板侧 import** ⇒ 只进 `sidepanel.js`（A 列）；SW 侧的追加段是**引导**
 * （`background/ref-context.ts`），**不 import** 本模块 ⇒ 「读数单源」同时是「读数单列」。
 *
 * @module l1/ref-scope
 */
import { maskTextPayload } from '../../../security/redact.js';
import type { ChatRefFact } from '../../../background/messaging.js';
import { isActiveRef, refOrdinal, type RefRecord } from './ref-store.js';

/** 范围判定的目标（本次动作要写的那一处 / 那几处）。 */
export interface ScopeTarget {
  /** 目标选择器（可读，可能是 `[data-wcli-ref="ref_n"]` 合成锚或存储选择器）。 */
  readonly selector: string;
  /** `--ref n` 给出的稳定业务序号（路 A；缺省 ⇒ 只走 selector 路）。 */
  readonly refNum?: number;
}

/** 一条**活跃有效引用**的判定视图（`turnRefsOf` 的派生形状，无正文 / 无凭据）。 */
export interface ScopeRef {
  readonly refNum: number;
  readonly refId: string;
  readonly selector: string;
}

/** 范围判定的**输入事实**（目标集合 vs 引用解析集合 + 用户授权事实）。 */
export interface ScopeFacts {
  readonly targets: readonly ScopeTarget[];
  readonly refs: readonly ScopeRef[];
  /** **输入事实**：越界是否已获用户批准（只由用户确认产生，AI 不得自判 / 自填）。 */
  readonly authorized: boolean;
}

/**
 * **凭据形**词元（EC-SGO-019）—— 常见 API key / token 前缀形态。命中即掩码：
 * 这些值即使没有 `key=value` 外壳也**绝不**入 LLM 上下文（FR-SGO-012 ②）。
 */
const CREDENTIAL_SHAPE =
  /\b(?:sk-[A-Za-z0-9_-]{8,}|gh[pousr]_[A-Za-z0-9]{16,}|xox[baprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{20,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{6,})\b/g;

/**
 * 引用摘要的**唯一掩码口径**（ADR-SGO-001 §5）：先走 base 的 `maskTextPayload`
 * （`key=value` / `Bearer` / JSON 三类形态），再兜**裸词元形**（`CREDENTIAL_SHAPE`）。
 * 页面普通文本原样返回 ⇒ 非凭据内容不误伤。
 */
export function maskRefDigest(text: string): string {
  const once = maskTextPayload(text ?? '');
  return once.replace(CREDENTIAL_SHAPE, '•••');
}

/**
 * **引用快照投影（恰一处）** —— 把 registry 记录投影为进入回合的 `ChatRefFact[]`。
 *
 * 只取 **活跃有效**（`verdict === 'valid'` ∧ 未退役，`isActiveRef` 单源）；
 * `refMark = refId`（单点铸造；页面侧 `content/ref-capture.ts` 写入 `data-wcli-ref = refId`）；
 * `refState` **只可能是 `'valid'`**（fail-closed：不可用引用不入表）。
 * 顺序保持 registry 顺序（稳定 ⇒ 回合载荷可复现）。
 */
export function turnRefsOf(records: readonly RefRecord[]): readonly ChatRefFact[] {
  return Object.freeze(
    records.filter(isActiveRef).map((r) =>
      Object.freeze({
        refNum: refOrdinal(r.facts.refId),
        refId: r.facts.refId,
        selector: r.facts.selector,
        refMark: r.facts.refId,
        textDigest: maskRefDigest(r.facts.textDigest),
        refState: 'valid' as const,
      }),
    ),
  );
}

/**
 * **投影为范围读数视图**（`ScopeRef[]`）—— 与回合载荷**同一份快照单源**（ADR-SGO-002 §2）。
 */
export function scopeRefsOf(records: readonly RefRecord[]): readonly ScopeRef[] {
  return Object.freeze(
    turnRefsOf(records).map((f) => Object.freeze({ refNum: f.refNum, refId: f.refId, selector: f.selector })),
  );
}

/* ── 范围读数（法九）：四值**单源** + 唯一判定函数（TASK-V55F-110）────────────
 *
 * 第二处声明 `SCOPE_READINGS` / 判定函数 ⇒ FAIL（N-SGO-028，对齐 `terminals.ts`
 * 的唯一声明纪律）。`no-ref` **≠** `in-scope`（FR-SGO-021 逐字）。
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * **范围读数四值（唯一声明）**：
 *   · `in-scope`  —— 有活跃引用，且**每个**目标都命中引用集合；
 *   · `out-of-scope-authorized`   —— 越界，但用户**已批准**（扩围事实）；
 *   · `out-of-scope-unauthorized` —— 越界，且**未征询**（fail-closed 拦下）；
 *   · `no-ref` —— **无活跃有效引用 ⇒ 无法判定**（**不是** `in-scope`）。
 */
export const SCOPE_READINGS = Object.freeze([
  'in-scope',
  'out-of-scope-authorized',
  'out-of-scope-unauthorized',
  'no-ref',
] as const);

export type ScopeReading = (typeof SCOPE_READINGS)[number];

/**
 * 「目标 ∈ 引用集合」的**两路命中**（ADR-SGO-002 §2）：
 *   · 路 A：`--ref n` 命中（`target.refNum` 在引用集合里）；
 *   · 路 B / B′：`selector` 命中（存储选择器，或合成的 `[data-wcli-ref="ref_n"]` 锚）。
 */
export function targetInRefs(target: ScopeTarget, refs: readonly ScopeRef[]): boolean {
  if (target.refNum !== undefined && refs.some((r) => r.refNum === target.refNum)) return true;
  return refs.some((r) => target.selector === r.selector || target.selector === `[data-wcli-ref="${r.refId}"]`);
}

/**
 * **范围读数（唯一判定函数）**—— 判据面（A 轨）。门禁真源切片指向本函数；
 * **不读**提示词（B 轨是引导，ADR-SGO-002 §3）。
 */
export function scopeReading(f: ScopeFacts): ScopeReading {
  // ① 无活跃有效引用 ⇒ 无法判定（**不得**判 in-scope；无引用回合不因此阻断，EC-SGO-008）。
  if (f.refs.length === 0) return 'no-ref';
  for (const t of f.targets) {
    if (targetInRefs(t, f.refs)) continue; // ② 在范围内
    // ③ / ④ 越界：是否已获用户批准是**输入事实**（AI 不得自判 / 自填）。
    return f.authorized ? 'out-of-scope-authorized' : 'out-of-scope-unauthorized';
  }
  return 'in-scope';
}

/* ── 留痕单源（TASK-V55F-112）──────────────────────────────────────────────── */

/**
 * 范围留痕的**字段名单源**（只含字段名；值由 {@link scopeReadingTrace} 以机器枚举产生）。
 * **零用户内容值**（FR-SGO-083）：正文 / 译文 / 凭据 / 答案全文 / URL query 一律不在此列。
 */
export const SCOPE_TRACE_FIELDS = Object.freeze(['scope.reading', 'scope.authorized'] as const);

/**
 * 范围留痕行（**独立成行**的机器格式；经既有 `notice` / 系统行通道渲染，零新 kind）：
 * `scope.reading=<enum> | scope.authorized=<actor>`，`actor ∈ {'user','none'}`。
 *
 * **caliber（R-SGO-917 显式登记）**：留痕「值」的口径 = **用户内容值**；**机器枚举读数词**
 * 与 **actor** / 计数 / 指纹摘要属**机器事实**，不受该口径约束 —— 否则 FR-SGO-081
 * （扩围事实必须可从留痕读出）与 FR-SGO-080（不含值）自相矛盾。
 */
export function scopeReadingTrace(reading: ScopeReading, authorized: boolean): string {
  return `${SCOPE_TRACE_FIELDS[0]}=${reading} | ${SCOPE_TRACE_FIELDS[1]}=${authorized ? 'user' : 'none'}`;
}

/* ── 越界写的机制拦截裁决（TASK-V55F-111）───────────────────────────────────── */

/** 越界未征询写的**可读理由 + 可达 next**（deny 面文案；不含任何用户内容值）。 */
export const SCOPE_WRITE_BLOCK_TEXT =
  '本次写入超出当前引用的范围（该目标不在你已引用的元素内），已按 fail-closed 拦下 —— ' +
  '请在已引用的目标内操作，或先在页面上重新拾取目标以建立新的引用范围，然后重试。';

/** 写闸裁决（纯函数）：`out-of-scope-unauthorized` ⇒ fail-closed 拦下 + 可达 next。 */
export function scopeWriteGate(f: ScopeFacts): { readonly reading: ScopeReading; readonly blocked: boolean; readonly message: string } {
  const reading = scopeReading(f);
  const blocked = reading === 'out-of-scope-unauthorized';
  return Object.freeze({ reading, blocked, message: blocked ? SCOPE_WRITE_BLOCK_TEXT : '' });
}

/* ── 扩围征询（WIDEN 二择）单源（TASK-V55F-213 · ADR-SGO-005 §1/§2/§3）──────────
 *
 * 越界未征询（`out-of-scope-unauthorized`）时，面板经**既有** `ask-user-request`
 * 通道提二择；本模块只持有**选项文案 + 提示语 + 转值判据**的**唯一声明** ——
 * `authorized` 的**写入面**在面板侧（真实点击回传），不在本模块（本模块零状态）。
 * ─────────────────────────────────────────────────────────────────────────── */

/** 二择提示语（唯一声明；机器枚举文案，非用户内容值）。 */
export const SCOPE_WIDEN_PROMPT = '本次写动作超出引用范围，是否扩大到整页？';

/** 二择选项（唯一声明）：「仅引用范围内」（fail-closed 默认）/「整页（扩大范围）」。 */
export const SCOPE_WIDEN_OPTIONS = Object.freeze(['仅引用范围内', '整页（扩大范围）'] as const);

/** 「整页」选项字面量（唯一转值判据的锚）。 */
export const SCOPE_WIDEN_WHOLE_PAGE = SCOPE_WIDEN_OPTIONS[1];

/**
 * 「整页」⇒ 扩围获批。**只由真实点击回传的选项值判定** —— AI / SW 路径无写入面
 * （FR-SGO-061 / R-SGO-907）；`undefined`（取消）/ 另一选项 ⇒ `false`（fail-closed）。
 */
export function isWidenWholePage(choice: string | undefined): boolean {
  return choice === SCOPE_WIDEN_WHOLE_PAGE;
}

/**
 * 读数是否为**扩围已获批**（`out-of-scope-authorized`）—— 面板侧**唯一**的判据入口，
 * 避免把读数值字面量散落到第二个模块（法九 L9-1「第二声明即红」）。
 */
export function isWidenAuthorizedReading(reading: ScopeReading): boolean {
  return reading === 'out-of-scope-authorized';
}

