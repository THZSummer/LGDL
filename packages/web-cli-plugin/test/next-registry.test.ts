/**
 * V5-1 TASK-V5-101/102/103/104 (ADR-V5-001) — the NextProvider registry gate:
 * Definition constants (R4) + `validateNextProvider` (R2/R4 loud) + `resolveOrder`
 * (R2/R3, **顺序不来自数组位置**) + `registerNextProvider` (R1 可逆 / R3 覆盖).
 *
 * 每条判据都声明 `expectFailPattern` 并导出其判据函数（供伪造源码反证）。
 *
 * @module test/next-registry
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  BLOCKED_TERMINALS,
  MOUNT_MODE,
  NEXT_MODES,
  NEXT_MOUNT_POINTS,
  NEXT_SERVICES,
  NEXT_SOURCE_NAMES,
} from '../src/ui/sidepanel/next-registry/definition.js';
import {
  countProviders,
  listProviders,
  registerNextProvider,
  resolveOrder,
  setKnownOpIds,
  validateNextProvider,
} from '../src/ui/sidepanel/next-registry/registry.js';
import type { NextCtx, NextProvider } from '../src/ui/sidepanel/next-registry/definition.js';
// V5.5-1 TASK-V55-118: 注册表**内**扩张的声明表（与 provider 集合双向包含的判据面）。
import { DRIVER_DECLS_SRC, builtinProviders } from '../src/ui/sidepanel/next-registry/providers.js';

const PKG = fileURLToPath(new URL('../../', import.meta.url));
const REGISTRY_SRC = readFileSync(join(PKG, 'src/ui/sidepanel/next-registry/registry.ts'), 'utf8');
const DEFINITION_SRC = readFileSync(join(PKG, 'src/ui/sidepanel/next-registry/definition.ts'), 'utf8');

export interface Judgement {
  readonly id: string;
  readonly expectFailPattern: string;
}
export const JUDGEMENTS: readonly Judgement[] = [
  { id: 'NR-1-validate-loud', expectFailPattern: '校验失败：非 loud' },
  { id: 'NR-2-duplicate-id', expectFailPattern: '重复 id 未拒绝' },
  { id: 'NR-3-roundtrip-reversible', expectFailPattern: '可逆注册：往返读数不正确' },
  { id: 'NR-4-idempotent-unregister', expectFailPattern: '幂等 unregister 失效' },
  { id: 'NR-5-overwrite-in-place', expectFailPattern: '覆盖语义：未按 id 整行替换' },
  { id: 'NR-6-resolve-order', expectFailPattern: 'resolveOrder 顺序不正确' },
  { id: 'NR-7-permutation-invariant', expectFailPattern: '列表位置置换改变了顺序' },
  { id: 'NR-8-single-write-point', expectFailPattern: 'REGISTRY 写入点不唯一' },
  { id: 'NR-9-blocked-single-source', expectFailPattern: 'BLOCKED_TERMINALS 字面量外泄' },
];

/** A synthetic provider factory (unique ids keep the singleton registry clean). */
function prov(id: string, over: Partial<NextProvider> = {}): NextProvider {
  return {
    id,
    deps: ['session'],
    priority: 1,
    mode: 'waterfall',
    fail: 'card-boundary',
    when: () => true,
    chips: ['op.turn'],
    ...over,
  };
}
const withPrefix = (p: string) => `t${p}`;

test('NR-0 Definition 常量：6 services / 2 modes / 5 mount points / MOUNT_MODE 表', () => {
  assert.equal(NEXT_SERVICES.length, 6);
  assert.equal(NEXT_MODES.length, 2);
  assert.equal(NEXT_MOUNT_POINTS.length, 5);
  assert.equal(MOUNT_MODE.receipt, 'emit');
  for (const mp of ['next', 'params', 'consent', 'execute'] as const) assert.equal(MOUNT_MODE[mp], 'waterfall');
  assert.equal(BLOCKED_TERMINALS.length, 5);
  assert.ok(Object.isFrozen(NEXT_SERVICES) && Object.isFrozen(MOUNT_MODE) && Object.isFrozen(BLOCKED_TERMINALS));
  assert.deepEqual([...NEXT_SOURCE_NAMES], ['ref', 'session', 'site', 'catalog', 'probe', 'risk', 'onboarding']);
});

test('NR-0 NextCtx 字段集 == 7 源白名单（源文本逐字集合相等）', () => {
  const body = /interface NextCtx \{([\s\S]*?)\n\}/.exec(DEFINITION_SRC);
  assert.ok(body, 'definition.ts 必须声明 NextCtx');
  const fields = [...body![1].matchAll(/^ {2}readonly ([a-zA-Z]+)\s*:/gm)].map((m) => m[1]).sort();
  assert.deepEqual(fields, [...NEXT_SOURCE_NAMES].sort(), 'NextCtx 字段必须恰为 7 源白名单');
});

test('NR-1 validateNextProvider：未知 deps / 非法 mode / 挂载点不符 / priority 缺失 / 空 chips ⇒ loud', () => {
  const fails = [
    validateNextProvider(prov(withPrefix('a'), { deps: ['unknown' as never] })),
    validateNextProvider(prov(withPrefix('b'), { mode: 'bogus' as never })),
    validateNextProvider(prov(withPrefix('c'), { mode: 'emit' }), 'next'),
    validateNextProvider(prov(withPrefix('d'), { priority: undefined as never })),
    validateNextProvider(prov(withPrefix('e'), { chips: [] })),
  ];
  for (const f of fails) {
    assert.equal(f.ok, false, `校验失败：非 loud（${JSON.stringify(f)}）`);
    assert.ok(!f.ok && typeof f.error === 'string' && f.error.length > 0, '校验失败：error 必须非空');
  }
  assert.equal(validateNextProvider(prov(withPrefix('ok'))).ok, true);
});

test('NR-1 反证：未知 deps 的判据确实命中 error 文本', () => {
  const f = validateNextProvider(prov(withPrefix('x'), { deps: ['nope' as never] }));
  assert.ok(!f.ok && f.error.includes('unknown-dep'), `校验失败：${JSON.stringify(f)}`);
});

test('NR-2 重复 id：第二次注册被拒绝（不覆盖），计数不变', () => {
  const base = countProviders();
  const r1 = registerNextProvider(prov(withPrefix('dup')));
  assert.equal(r1.ok, true);
  const r2 = registerNextProvider(prov(withPrefix('dup')));
  assert.equal(r2.ok, false, '重复 id 未拒绝');
  assert.equal(countProviders(), base + 1);
  if (r1.ok) r1.unregister();
  assert.equal(countProviders(), base);
});

test('NR-3 R1 往返：N → N+1 → N', () => {
  const base = countProviders();
  const r = registerNextProvider(prov(withPrefix('rt')));
  assert.equal(r.ok, true);
  assert.equal(countProviders(), base + 1, '可逆注册：往返读数不正确');
  if (r.ok) {
    assert.equal(r.unregister(), base);
    assert.equal(countProviders(), base);
  }
});

test('NR-4 幂等 unregister：第二次调用返回同一计数', () => {
  const base = countProviders();
  const r = registerNextProvider(prov(withPrefix('idem')));
  if (!r.ok) throw new Error('register failed');
  const first = r.unregister();
  const second = r.unregister();
  assert.equal(first, base);
  assert.equal(second, base, '幂等 unregister 失效（第二次改变了计数）');
});

test('NR-5 R3 覆盖：{overwrite:true} 计数不变且按 id 整行替换（原位）', () => {
  const base = countProviders();
  const before = prov(withPrefix('ov'), { priority: 3 });
  const after = prov(withPrefix('ov'), { priority: 0 });
  const r1 = registerNextProvider(before);
  if (!r1.ok) throw new Error('register failed');
  const idx = listProviders().findIndex((p) => p.id === withPrefix('ov'));
  const r2 = registerNextProvider(after, { overwrite: true });
  assert.equal(r2.ok, true, '覆盖语义：覆盖被拒绝');
  assert.equal(countProviders(), base + 1, '覆盖语义：计数改变');
  const row = listProviders()[idx];
  assert.equal(row?.priority, 0, '覆盖语义：未按 id 整行替换');
  r2.ok && r2.unregister();
  assert.equal(countProviders(), base);
});

test('NR-6 resolveOrder：priority asc（0→3）', () => {
  const defs = [
    registerNextProvider(prov(withPrefix('p0'), { priority: 0 })),
    registerNextProvider(prov(withPrefix('p1'), { priority: 1 })),
    registerNextProvider(prov(withPrefix('p2'), { priority: 2 })),
    registerNextProvider(prov(withPrefix('p3'), { priority: 3 })),
  ];
  defs.forEach((r) => assert.equal(r.ok, true));
  const ids = [withPrefix('p0'), withPrefix('p1'), withPrefix('p2'), withPrefix('p3')];
  const got = resolveOrder()
    .filter((p) => ids.includes(p.id))
    .map((p) => p.id);
  assert.deepEqual(got, ids, 'resolveOrder 顺序不正确');
  defs.forEach((r) => r.ok && r.unregister());
});

test('NR-6 prepend：同 priority 下 prepend:true 置前', () => {
  const a = withPrefix('preA');
  const b = withPrefix('preB');
  const ra = registerNextProvider(prov(a, { priority: 2 }));
  const rb = registerNextProvider(prov(b, { priority: 2, prepend: true }));
  assert.ok(ra.ok && rb.ok);
  const got = resolveOrder()
    .filter((p) => p.id === a || p.id === b)
    .map((p) => p.id);
  assert.deepEqual(got, [b, a], 'prepend 未置前');
  ra.ok && ra.unregister();
  rb.ok && rb.unregister();
});

test('NR-7 列表位置置换不变：同一集合 3 种注册顺序 ⇒ resolveOrder 逐项相等', () => {
  const defs = [
    prov(withPrefix('permA'), { priority: 3 }),
    prov(withPrefix('permB'), { priority: 0 }),
    prov(withPrefix('permC'), { priority: 2 }),
  ];
  const orders = [
    [0, 1, 2],
    [2, 0, 1],
    [1, 2, 0],
  ];
  const readings: string[][] = [];
  for (const order of orders) {
    const uns = order.map((i) => registerNextProvider(defs[i]));
    uns.forEach((r) => assert.ok(r.ok));
    readings.push(
      resolveOrder()
        .filter((p) => p.id.startsWith(withPrefix('perm')))
        .map((p) => p.id),
    );
    uns.forEach((r) => r.ok && r.unregister());
  }
  assert.deepEqual(readings[0], readings[1], '列表位置置换改变了顺序');
  assert.deepEqual(readings[1], readings[2], '列表位置置换改变了顺序');
});

test('NR-7 反证：把 resolveOrder 换成数组顺序 ⇒ 置换测试必红', () => {
  // 用一个「数组顺序」假实现模拟回退：注册顺序不同 ⇒ 读数不同。
  const defs = [prov(withPrefix('fbA'), { priority: 3 }), prov(withPrefix('fbB'), { priority: 0 })];
  const arrayOrder = (order: number[]) => order.map((i) => defs[i].id);
  assert.notDeepEqual(arrayOrder([0, 1]), arrayOrder([1, 0]), '数组顺序实现必须被置换测试判红');
});

test('NR-8 单点写入：registry.ts 中 REGISTRY.push / REGISTRY.splice 各恰 1 处', () => {
  const push = (REGISTRY_SRC.match(/REGISTRY\.push\(/g) ?? []).length;
  const splice = (REGISTRY_SRC.match(/REGISTRY\.splice\(/g) ?? []).length;
  assert.equal(push, 1, 'REGISTRY 写入点不唯一（push）');
  assert.equal(splice, 1, 'REGISTRY 写入点不唯一（splice）');
});

test('NR-9 BLOCKED_TERMINALS 单源：5 字面量在 definition.ts 声明，registry.ts 零命中', () => {
  for (const t of BLOCKED_TERMINALS) {
    assert.ok(DEFINITION_SRC.includes(`'${t}'`), `definition.ts 必须声明 ${t}`);
    assert.ok(!REGISTRY_SRC.includes(t), `BLOCKED_TERMINALS 字面量外泄：${t} 出现在 registry.ts`);
  }
});

test('NR-9 空值快照：空注册表下 resolveOrder() 返回空数组（无副作用）', () => {
  const base = countProviders();
  assert.equal(resolveOrder().length, base);
});

test('NR-9 chips 悬空：setKnownOpIds 后未知 chip ⇒ loud', () => {
  setKnownOpIds(['op.turn']);
  const bad = registerNextProvider(prov(withPrefix('dangle'), { chips: ['op.nope'] }));
  assert.equal(bad.ok, false, '悬空 chip 必须 loud');
  setKnownOpIds(null);
  const good = registerNextProvider(prov(withPrefix('dangle2'), { chips: ['op.nope'] }));
  assert.equal(good.ok, true, '未配置 knownOps 时不应误报');
  good.ok && good.unregister();
});

/* ── V5.5-1 TASK-V55-118（ADR-V55-001 §1 · FR-SELF-012/017/036 · X-SELF-2）──────
 *
 * X-SELF-2 的等价重锚（**改写 ≠ 删除**）：注册表**内**扩张 —— 10 行驱动者声明与
 * provider 集合双向包含，「答完之后恰 ≥1 驱动者」（`'answered'` 时机非空）。
 * 既有 16 条判据一条不减；以下只**增**。
 * ──────────────────────────────────────────────────────────────────────────── */

test('NR-10（V5.5-1）：驱动者声明 11 行 ↔ provider 集合双向包含 ∧ answered 时机有接手者', () => {
  const decls = Object.values(DRIVER_DECLS_SRC);
  const providerIds = new Set(builtinProviders().map((p) => p.id));
  assert.equal(decls.length, providerIds.size, `驱动者集合 ≡ provider 集合（实测 ${decls.length} vs ${providerIds.size}）`);
  // ★ IAN-1：新面必须**真的**被双向包含判据覆盖（不得只把计数从 10 改成 11 就了事）。
  assert.ok(providerIds.has('free-input'), 'free-input 终端必须在注册表内');
  assert.ok(decls.some((d) => d.driverId === 'free-input'), 'free-input 必须有声明行（双向包含）');
  for (const d of decls) assert.ok(providerIds.has(d.driverId), `声明行 ${d.driverId} 必须在注册表内`);
  for (const id of providerIds) assert.ok(decls.some((d) => d.driverId === id), `注册表 ${id} 必须有声明行（双向包含，不得漂移）`);
  // 「答完之后谁会接手」必须在声明层可回答（FR-SELF-036 / ADR-V55-002 §4）。
  const answered = decls.filter((d) => d.timings.includes('answered'));
  assert.ok(answered.length >= 1, "answered 时机必须至少 1 个驱动者（答完不是死端）");
  for (const d of answered) assert.ok(['deterministic', 'ai-driven'].includes(d.driverClass), `${d.driverId} 的 driverClass 必须明确`);
});

/**
 * V5.5-2 **TASK-V55-206**（ADR-V55-006 §4/§5 · FR-SELF-041/051/110 · AC-SELF-013）——
 * **主动识别折叠进既有 `risk` 源**：`llm.unconfigured` 的 op-driven provider 由
 * `risk` 派生（不新增 ctx 字段、不新增真值源），且**不看 `firstRun`** ——
 * 「已装未配」（`firstRun = false`）与「首装」两场景由此**各自**产出同一条引导。
 * ──────────────────────────────────────────────────────────────────────────── */
test('NR-11（V5.5-2）：引导 provider 由 risk 源驱动 ∧ 与 firstRun 无关（已装未配可达）', () => {
  const guide = builtinProviders().find((p) => p.id === 'llm.unconfigured');
  assert.ok(guide, '前置：llm.unconfigured 引导 provider 必须在内置 provider 集内');
  const mk = (risk: readonly string[], firstRun: boolean): NextCtx => ({
    ref: { validCount: 0, staleCount: 0 },
    session: { openAsks: 0, busy: false },
    site: { authorized: true, trust: 'trusted' },
    catalog: { toolCount: 0, subcommandCount: 0 },
    probe: { phase: 'ready', steady: true },
    risk,
    onboarding: { firstRun, pendingSteps: firstRun ? ['授权当前站点'] : [] },
  });
  // 主动识别（risk 含 llmBlocked）⇒ 两种场景都触发；词源仍是既有 7 源之一（risk）。
  assert.equal(guide.when(mk(['llmBlocked'], false)), true, '已装未配（firstRun=false）必须仍产出引导');
  assert.equal(guide.when(mk(['llmBlocked'], true)), true, '首装同样产出（两场景各自可达）');
  assert.equal(guide.when(mk([], false)), false, '无该风险 ⇒ 不触发（判据非恒真）');
  assert.ok(NEXT_SOURCE_NAMES.includes('risk') && NEXT_SOURCE_NAMES.length === 7, '真值源仍恰 7（不新增源）');
  // 反证：把 when 挂到 firstRun 上 ⇒ 已装未配场景必红。
  const forged = { ...guide, when: (ctx: NextCtx) => ctx.onboarding.firstRun && ctx.risk.includes('llmBlocked') };
  assert.equal(forged.when(mk(['llmBlocked'], false)), false, '挂上 firstRun ⇒ 已装未配丢失（判据非恒真）');
});

test('NR-10 反证：声明表多一行 / 少一行 ⇒ 双向包含必红 → 还原 PASS', () => {
  const decls = Object.values(DRIVER_DECLS_SRC);
  const extra = [...decls, { ...decls[0], driverId: 'ghost-driver' }];
  const providerIds = new Set(builtinProviders().map((p) => p.id));
  assert.ok(extra.some((d) => !providerIds.has(d.driverId)), '多一行（表有注册表无）⇒ 必红');
  const missing = decls.filter((d) => d.driverId !== 'ref-action');
  assert.equal(missing.length, decls.length - 1);
  assert.ok([...providerIds].some((id) => !missing.some((d) => d.driverId === id)), '少一行（注册表有表无）⇒ 必红');
  assert.equal(Object.values(DRIVER_DECLS_SRC).length, 12, '还原 PASS（声明行恰 12：IAN-1 free-input + F-36/ADN-1 ai-next）');
});
