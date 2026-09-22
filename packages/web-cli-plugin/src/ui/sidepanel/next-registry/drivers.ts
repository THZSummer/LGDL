/**
 * V5.5-1 **TASK-V55-101** (ADR-V55-001 §1/§2 · FR-SELF-010~019 / 030~036 · AC-SELF-002/009/015) —
 * the **driver declaration single source**（驱动者四元组表 / 时机源闭集 / 七类时刻 /
 * `driverClass` / `CTX_FIELD_SERVICE` 各**恰一处**声明，门禁**从源文本抽取**机核）。
 *
 * ── 为什么是「注册表 provider + 独立声明表」而不是给 `NextProvider` 加字段 ──────
 *
 * v5-1 的 `NextProvider` 是**冻结契约**（`ops.ts` 逐字：「the v5-1 interface is NOT
 * extended, per the leaf independence rule」）。若把驱动权字段挂在 provider 行上，
 * 「驱动者集合 ≡ provider 集合」就退化为**恒真**（同源对象不可能漂移）⇒ 机核空转。
 * 独立表把「驱动权归属」集中成可扫描源文本，并**故意保留**「声明 ↔ 注册表漂移」这个
 * 可见失败面（由 `test/driver-quadruple.test.ts` 的双向包含 + 三类注入反证承担）。
 *
 * ── 本模块的纪律 ────────────────────────────────────────────────────────────
 *
 *   · **只声明 + 只机核**：不接主流程、零 `maybeRecommend(` / `requestTurn(` 新增；
 *   · `driverId` 键集与 `listProviders()` 的 id 集**双向包含**（不同源，可漂移 ⇒ 可判）；
 *   · 未登记 ctx 字段 / 未知时机 / 未知时刻 / 未知 `driverClass` 一律 **loud**
 *     （`{ok:false,error}`），**禁止静默默认**。
 *
 * @module ui/sidepanel/next-registry/drivers
 */
import type { NextService } from './definition.js';
import type { DriverTerminal } from './terminals.js';

/* ────────────────────────────────────────────────────────────────────────────
 * 1. 时机源闭集 —— 4 → **5**（旧 4 逐字保留；ADR-V55-002 §1）
 * ──────────────────────────────────────────────────────────────────────────── */

/** 时机源闭集（**单一声明源**；`sidepanel.ts` 只 re-export 类型，零第二声明）。 */
export const DRIVER_TIMINGS = Object.freeze(['pick', 'stale', 'idle', 'firstRun', 'answered'] as const);
export type DriverTiming = (typeof DRIVER_TIMINGS)[number];
/** **旧 4 逐字**（判据锚：值集扩张是纯加法，旧项一字不改）。 */
export const DRIVER_TIMINGS_LEGACY4 = Object.freeze(['pick', 'stale', 'idle', 'firstRun'] as const);
/** 新增的第 5 项（语义 = 「某个已表达意图的终态刚刚发生」）。 */
export const DRIVER_TIMING_ANSWERED = 'answered' as const;
/** `RecommendTrigger` 的唯一类型定义处（`sidepanel.ts` 只 re-export）。 */
export type RecommendTrigger = DriverTiming;

/* ────────────────────────────────────────────────────────────────────────────
 * 2. 七类「已表达意图」时刻（**恰 7**；FR-SELF-012）
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * 七类时刻（**恰 7**，父 FR-SELF-012 逐字：① 已答 ask ② 已交描述 ③ 绑定完成 ④ 拾取完成
 * ⑤ 探测稳态 ⑥ 授权回执 ⑦ 回合结束）。
 *
 * 注：ADR-V55-003 §3 把 ① 展开为 `answered-ref-ask` / `answered-op-ask` / `answered-bg-ask`
 * 三型 —— 三型由 `DRIVER_TERMINALS` 的三枚终态细化，时刻枚举本身保持 **恰 7**（AC-SELF-015）。
 */
export const PROACTIVE_MOMENTS = Object.freeze([
  'answered-ask',
  'describe-submitted',
  'bind-complete',
  'pick-complete',
  'probe-steady',
  'auth-receipt',
  'turn-end',
] as const);
export type ProactiveMoment = (typeof PROACTIVE_MOMENTS)[number];

/* ────────────────────────────────────────────────────────────────────────────
 * 3. driverClass（每驱动者**恰属一类**）
 * ──────────────────────────────────────────────────────────────────────────── */

export const DRIVER_CLASSES = Object.freeze(['deterministic', 'ai-driven'] as const);
export type DriverClass = (typeof DRIVER_CLASSES)[number];

/* ────────────────────────────────────────────────────────────────────────────
 * 4. CTX_FIELD_SERVICE —— ctx 字段 → 既有 NEXT_SERVICES 服务面的**单一**映射表
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * 字段前缀 → 服务面（键可以是前缀：`ref` 覆盖 `ref.validCount`，`session.proactive`
 * 覆盖 `session.proactive.enabled`）。`catalog` / `probe` 归 `pageSide`（页面侧观测面），
 * `risk` 归 `snapshot`（快照派生事实），`onboarding` 归 `credentials`（配置态）。
 */
export const CTX_FIELD_SERVICE = Object.freeze({
  ref: 'snapshot',
  session: 'session',
  'session.proactive': 'session',
  site: 'siteRegistry',
  catalog: 'pageSide',
  probe: 'pageSide',
  risk: 'snapshot',
  onboarding: 'credentials',
} as const satisfies Readonly<Record<string, NextService>>);
export type CtxFieldPrefix = keyof typeof CTX_FIELD_SERVICE;

/**
 * 最长前缀解析：`'ref.staleCount'` → `snapshot`；`'session.proactive.enabled'` → `session`。
 * 未登记 ⇒ `undefined`（调用方 loud）。**唯一**映射实现，禁止第二份。
 */
export function serviceOfCtxField(field: string): NextService | undefined {
  let best: string | undefined;
  for (const prefix of Object.keys(CTX_FIELD_SERVICE)) {
    if (field !== prefix && !field.startsWith(`${prefix}.`)) continue;
    if (best === undefined || prefix.length > best.length) best = prefix;
  }
  return best === undefined ? undefined : CTX_FIELD_SERVICE[best as CtxFieldPrefix];
}

/** EC-SELF-003 / R-V55-105 — 未登记字段 **loud 拦截**（注册校验，非静默默认）。 */
export function validateCtxFieldRegistration(fields: readonly string[]): { readonly ok: boolean; readonly error?: string } {
  const missing = fields.filter((f) => serviceOfCtxField(f) === undefined);
  if (missing.length > 0) return { ok: false, error: `unregistered-ctx-field:${missing.join(',')}` };
  return { ok: true };
}

/* ────────────────────────────────────────────────────────────────────────────
 * 5. 驱动者声明 + 注册（单点写入；loud 校验）
 * ──────────────────────────────────────────────────────────────────────────── */

export interface DriverDecl {
  /** = provider id（唯一）。 */
  readonly driverId: string;
  /** 触发的时机源（⊆ `DRIVER_TIMINGS`，非空）。 */
  readonly timings: readonly DriverTiming[];
  /** 归属的「已表达意图」时刻（⊆ `PROACTIVE_MOMENTS`，非空）。 */
  readonly moments: readonly ProactiveMoment[];
  readonly driverClass: DriverClass;
  readonly priority: 0 | 1 | 2 | 3;
  /** 该 provider 的 `when(ctx)` 实际读取的字段路径（⊆ `CTX_FIELD_SERVICE` 登记面）。 */
  readonly evidence: readonly string[];
}

export type DriverValidateResult = { readonly ok: true } | { readonly ok: false; readonly error: string };

/** R2/R4 —— 声明行的 loud 校验（任一元非法 ⇒ `{ok:false,error}`，禁静默覆盖）。 */
export function validateDriverDecl(decl: DriverDecl): DriverValidateResult {
  if (!decl || typeof decl.driverId !== 'string' || decl.driverId.length === 0) return { ok: false, error: 'missing-driver-id' };
  if (!Array.isArray(decl.timings) || decl.timings.length === 0) return { ok: false, error: `empty-timings:${decl.driverId}` };
  for (const t of decl.timings) {
    if (!(DRIVER_TIMINGS as readonly string[]).includes(t)) return { ok: false, error: `unknown-timing:${decl.driverId}:${String(t)}` };
  }
  if (!Array.isArray(decl.moments) || decl.moments.length === 0) return { ok: false, error: `empty-moments:${decl.driverId}` };
  for (const m of decl.moments) {
    if (!(PROACTIVE_MOMENTS as readonly string[]).includes(m)) return { ok: false, error: `unknown-moment:${decl.driverId}:${String(m)}` };
  }
  if (!(DRIVER_CLASSES as readonly string[]).includes(decl.driverClass)) return { ok: false, error: `unknown-driver-class:${decl.driverId}` };
  if (![0, 1, 2, 3].includes(decl.priority)) return { ok: false, error: `priority-out-of-range:${decl.driverId}` };
  if (!Array.isArray(decl.evidence) || decl.evidence.length === 0) return { ok: false, error: `empty-evidence:${decl.driverId}` };
  const bad = decl.evidence.filter((f) => serviceOfCtxField(f) === undefined);
  if (bad.length > 0) return { ok: false, error: `unregistered-ctx-field:${bad.join(',')}` };
  return { ok: true };
}

/** 声明注册表（**单点写入**：全文件唯一 `DECLS.push`）。 */
const DECLS: DriverDecl[] = [];

/** 注册一行驱动者声明（重复 id / 校验失败 ⇒ loud，不覆盖）。 */
export function registerDriverDecl(decl: DriverDecl): DriverValidateResult {
  const v = validateDriverDecl(decl);
  if (!v.ok) return v;
  if (DECLS.some((d) => d.driverId === decl.driverId)) return { ok: false, error: `duplicate-driver:${decl.driverId}` };
  DECLS.push(Object.freeze({ ...decl }));
  return { ok: true };
}

/** 当前声明行快照（数组顺序 = 注册顺序）。 */
export function listDriverDecls(): readonly DriverDecl[] {
  return DECLS.slice();
}

/** 测试 seam：清空注册表（生产零调用）。 */
export function resetDriverDecls(): void {
  DECLS.length = 0;
}

/* ────────────────────────────────────────────────────────────────────────────
 * 6. 时机 / 时刻 → 驱动者（**从声明抽取**，不手写第二份；FR-SELF-036）
 * ──────────────────────────────────────────────────────────────────────────── */

export function driversForTiming(timing: DriverTiming): readonly string[] {
  return Object.freeze(DECLS.filter((d) => d.timings.includes(timing)).map((d) => d.driverId));
}

export function driversForMoment(moment: ProactiveMoment | string): readonly string[] {
  return Object.freeze(DECLS.filter((d) => (d.moments as readonly string[]).includes(moment)).map((d) => d.driverId));
}

/* ────────────────────────────────────────────────────────────────────────────
 * 7. 四元组 + 去重键（FR-SELF-011/014/016）
 * ──────────────────────────────────────────────────────────────────────────── */

/** 一个驱动者的四元组（门禁从此处 + provider `chips` 抽取，不靠注释与人工对账）。 */
export interface DriverQuadruple {
  readonly driverId: string;
  readonly timing: DriverTiming;
  readonly evidence: readonly string[];
  readonly ops: readonly string[];
}

/** 把一行声明 × 其 provider 的 op 集展开成四元组（每 timing 一条）。 */
export function driverQuadruples(decl: DriverDecl, ops: readonly string[]): readonly DriverQuadruple[] {
  return Object.freeze(
    decl.timings.map((timing) => Object.freeze({ driverId: decl.driverId, timing, evidence: decl.evidence, ops: Object.freeze([...ops]) })),
  );
}

/**
 * 去重键 = `driverId + ctx 摘要`（FR-SELF-014 单源）。同一驱动者面对同一 ctx 事实只在
 * 一次求值内产出一次 —— 键的构造是本模块**唯一**处。
 */
export function dedupeKey(driverId: string, ctxDigest: string): string {
  return `${driverId}#${ctxDigest}`;
}

/* ────────────────────────────────────────────────────────────────────────────
 * 8. 结算 → 时机（`nextAfterSettle` 单入口的输入映射；ADR-V55-001 §5）
 * ──────────────────────────────────────────────────────────────────────────── */

/** 一次结算的来源（`answered` ⇒ 已表达意图的终态；其余 ⇒ 结算后的稳态 idle）。 */
export interface SettleSource {
  readonly kind: string;
  readonly terminal?: DriverTerminal;
  readonly opId?: string;
}

/**
 * 结算种类 → 时机值。**新的时机触发点全部经既有单一求值入口**（`maybeRecommend`
 * 定义恰 1 / 调用点恰 7），因此本函数是「加时机 = 改这一处映射」而不是「加调用点」。
 */
export function timingOfSettle(src: SettleSource): DriverTiming {
  return src.kind === 'answered' ? 'answered' : 'idle';
}
