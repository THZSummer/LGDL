import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPermissionGate, createAskHandle, defaultActionForRisk, globMatch } from './permission.js';
import type { PolicyStrategy, PolicyAction, AskResolution, PermissionGateHooks } from './permission.js';

/** 记账时钟（ask 超时测试用：真实 setTimeout 小超时即可，无需注入）。 */
function q(tool: string, opts: { subcommand?: string; risk?: 'read' | 'write' | 'external' | 'ui' | 'state' } = {}) {
  return { tool, subcommand: opts.subcommand ?? '', risk: opts.risk };
}

// ---- FR-006/EC-014：裁决矩阵（allow/ask/deny × 命中/未命中） ----

test('permission: 空配置 gate — 无 risk/只读工具走缺省放行（router 层无 policy 才零开销）', async () => {
  const gate = createPermissionGate();
  assert.equal(gate.inactive, true);
  const d = await gate.check(q('web-fetch')); // 无 risk 声明
  assert.equal(d.action, 'allow');
  assert.match(d.reason, /放行/);
  const read = await gate.check(q('doc-read', { risk: 'read' }));
  assert.equal(read.action, 'allow');
  // 敏感面 → 缺省 ask（onAsk 缺省 deny 在 ask 三路用例覆盖）
  const sensitive = await gate.check(q('doc-edit', { risk: 'write' }), { onAsk: async () => ({ action: 'allow' }) });
  assert.equal(sensitive.action, 'allow');
});

test('permission: 缺省取向 — read 放行 / 敏感 ask / riskDefaults 危险 deny', async () => {
  assert.equal(defaultActionForRisk(undefined), 'allow');
  assert.equal(defaultActionForRisk('read'), 'allow');
  assert.equal(defaultActionForRisk('write'), 'ask');
  assert.equal(defaultActionForRisk('external'), 'ask');
  assert.equal(defaultActionForRisk('ui'), 'ask');
  assert.equal(defaultActionForRisk('state'), 'ask');
  // riskDefaults 声明 write=deny（危险面）→ 未命中规则时 deny
  const gate = createPermissionGate({ riskDefaults: { write: 'deny', ui: 'deny' } });
  const d = await gate.check(q('doc-edit', { risk: 'write' }));
  assert.equal(d.action, 'deny');
  assert.match(d.reason, /权限被拒：命中缺省 deny 取向/);
  const read = await gate.check(q('doc-read', { risk: 'read' }));
  assert.equal(read.action, 'allow');
});

test('permission: 规则命中 — deny/allow 规则矩阵（FR-006）', async () => {
  const denyGate = createPermissionGate({ rules: [{ pattern: 'storage.*', action: 'deny', note: '存储写禁用' }] });
  const hit = await denyGate.check(q('storage.remove'));
  assert.equal(hit.action, 'deny');
  assert.match(hit.reason, /命中规则 action=deny（存储写禁用）/);
  assert.equal(hit.by, 'rule');
  const miss = await denyGate.check(q('web-fetch')); // 未命中 → 缺省 allow
  assert.equal(miss.action, 'allow');

  const allowGate = createPermissionGate({ rules: [{ namespace: 'skill', action: 'allow' }] });
  assert.equal((await allowGate.check(q('skill.search'))).action, 'allow');
  // 未命中命名空间 → 缺省 ask 取向仅对敏感 risk 生效；无 risk → allow
  assert.equal((await allowGate.check(q('web-fetch'))).action, 'allow');
});

test('permission: EC-014 deny 优先 — allow 与 deny 冲突默认 deny 胜；可配置关闭', async () => {
  const rules = [
    { pattern: '*', action: 'allow' as const },
    { pattern: 'web-fetch', action: 'deny' as const },
  ];
  const denyPriority = createPermissionGate({ rules });
  const d = await denyPriority.check(q('web-fetch'));
  assert.equal(d.action, 'deny'); // 缺省 deny 优先
  const firstWins = createPermissionGate({ rules, denyPriority: false });
  const d2 = await firstWins.check(q('web-fetch'));
  assert.equal(d2.action, 'allow'); // 关闭 deny 优先 → 顺序首个（allow）胜
});

// ---- FR-008：allowed-tools 白名单 ----

test('permission: allowed-tools 白名单（冗余护栏 FR-008）', async () => {
  const gate = createPermissionGate({ allowedTools: ['skill.read', 'skill.search'] });
  const inSet = await gate.check(q('skill.read'));
  assert.equal(inSet.action, 'allow');
  const out = await gate.check(q('skill.evil'));
  assert.equal(out.action, 'deny');
  assert.match(out.reason, /不在 allowed-tools 白名单/);
  assert.equal(out.by, 'allowed-tools');
});

// ---- 策略对象注入（dsh 可插拔，如 read-before-edit 生态位） ----

test('permission: 策略对象注入 — 首个非 null 覆盖规则集（FR-005 read-before-edit 生态位）', async () => {
  // read-before-edit 简化策略：edit 类子命令未先读（ctx.ready !== true）→ deny
  const readBeforeEdit: PolicyStrategy = {
    name: 'read-before-edit',
    check: async (input): Promise<PolicyAction | null> => {
      if (input.subcommand === 'edit' && input.ctx.ready !== true) return 'deny';
      return null;
    },
  };
  const gate = createPermissionGate({ strategies: [readBeforeEdit] });
  const denied = await gate.check({ tool: 'doc-edit', subcommand: 'edit', ctx: { ready: false } });
  assert.equal(denied.action, 'deny');
  assert.match(denied.reason, /策略 read-before-edit 拒绝/);
  assert.equal(denied.by, 'strategy:read-before-edit');
  const allowed = await gate.check({ tool: 'doc-edit', subcommand: 'edit', ctx: { ready: true } });
  assert.equal(allowed.action, 'allow');
  // 非 edit 子命令策略不表态 → 缺省 allow
  const read = await gate.check({ tool: 'doc-edit', subcommand: 'read', ctx: { ready: false } });
  assert.equal(read.action, 'allow');
});

// ---- deny 时执行器未被调用（间谍断言，FR-005 语义预演；router 层 TASK-002 全链复证） ----

test('permission: deny 裁决 → 执行器未被调用（间谍断言）', async () => {
  const gate = createPermissionGate({ rules: [{ pattern: 'danger.*', action: 'deny' }] });
  let executed = 0;
  const dispatch = async (tool: string) => {
    const decision = await gate.check(q(tool));
    if (decision.action === 'deny') return { ok: false, output: decision.reason };
    executed += 1;
    return { ok: true, output: 'ran' };
  };
  const r = await dispatch('danger.write');
  assert.equal(r.ok, false);
  assert.equal(executed, 0);
  await dispatch('safe.read');
  assert.equal(executed, 1);
});

// ---- FR-007/EC-002：ask 三路（allow / deny / 超时 → deny + reason） ----

function askHooks(resolver: (() => Promise<'allow' | 'deny'>) | null, askTimeoutMs = 50): PermissionGateHooks {
  return {
    onAsk: async (): Promise<AskResolution> => {
      if (!resolver) return { action: 'deny' };
      const action = await resolver();
      return { action, remember: true };
    },
    askTimeoutMs,
  };
}

test('permission: ask 命中（write 缺省）→ 用户 allow → 放行', async () => {
  const gate = createPermissionGate(); // write → 缺省 ask
  const d = await gate.check(q('doc-edit', { risk: 'write' }), askHooks(async () => 'allow'));
  assert.equal(d.action, 'allow');
  assert.match(d.reason, /用户确认放行/);
  assert.equal(d.by, 'ask');
});

test('permission: ask → 用户 deny → 权限被拒（EC-002 取消语义）', async () => {
  const gate = createPermissionGate();
  const d = await gate.check(q('doc-edit', { risk: 'write' }), askHooks(async () => 'deny'));
  assert.equal(d.action, 'deny');
  assert.match(d.reason, /用户取消\/拒绝/);
});

test('permission: ask → 超时未裁决 → deny（EC-002）', async () => {
  const gate = createPermissionGate();
  // onAsk 永不 resolve（挂起）→ 超时路径
  const d = await gate.check(q('doc-edit', { risk: 'write' }), {
    onAsk: () => new Promise(() => {}),
    askTimeoutMs: 15,
  });
  assert.equal(d.action, 'deny');
  assert.match(d.reason, /ask 超时未裁决/);
});

test('permission: ask 命中但未配置 onAsk 桥 → 按 deny（fail-closed）', async () => {
  const gate = createPermissionGate();
  const d = await gate.check(q('doc-edit', { risk: 'write' }));
  assert.equal(d.action, 'deny');
  assert.match(d.reason, /未配置 onAsk 裁决桥/);
});

// ---- FR-007：AskHandle 挂起契约 ----

test('permission: AskHandle 挂起 → settle(allow/deny) 恢复', async () => {
  const handle = createAskHandle({ tool: 'web-fetch', reason: '需确认' });
  let settled: 'allow' | 'deny' | null = null;
  void handle.settled.then((r) => {
    settled = r.action;
  });
  assert.equal(settled, null); // 挂起未决
  handle.settle({ action: 'allow' });
  await handle.settled;
  assert.equal(settled, 'allow');
});

// ---- glob 匹配工具 ----

test('permission: globMatch（* / ? / 精确）', () => {
  assert.equal(globMatch('skill.search', '*'), true);
  assert.equal(globMatch('skill.search', 'skill.*'), true);
  assert.equal(globMatch('storage.remove', 'storage.*'), true);
  assert.equal(globMatch('web-fetch', 'web-fetch'), true);
  assert.equal(globMatch('skill2.search', 'skill.*'), false);
  assert.equal(globMatch('skillx', 'skill?'), true);
});

// ================= v3（FR-005/006/008，ADR-001/002）：ToolRisk 'evaluate' + PolicyRule.subcommand =================

test('permission v3: defaultActionForRisk("evaluate") = deny — 最高档缺省不静默 allow（FR-008/ADR-002）', () => {
  assert.equal(defaultActionForRisk('evaluate'), 'deny');
  // 既有档位缺省取向零变化（FR-001 additive）
  assert.equal(defaultActionForRisk('read'), 'allow');
  assert.equal(defaultActionForRisk(undefined), 'allow');
  assert.equal(defaultActionForRisk('write'), 'ask');
  assert.equal(defaultActionForRisk('external'), 'ask');
  assert.equal(defaultActionForRisk('ui'), 'ask');
  assert.equal(defaultActionForRisk('state'), 'ask');
});

test('permission v3: evaluate 档缺省 deny — 空配置/只含 read 放行规则均不静默放行（FR-008）', async () => {
  const empty = createPermissionGate();
  const d = await empty.check({ tool: 'page-eval', subcommand: '', risk: 'evaluate' });
  assert.equal(d.action, 'deny');
  assert.match(d.reason, /权限被拒：命中缺省 deny 取向/);
  assert.equal(d.by, 'default');
  // 只含 read 放行规则的 gate：evaluate 未命中规则 → 仍走缺省 deny
  const readOnly = createPermissionGate({ rules: [{ risk: 'read', action: 'allow' }] });
  const d2 = await readOnly.check({ tool: 'page-eval', subcommand: '', risk: 'evaluate' });
  assert.equal(d2.action, 'deny');
});

test('permission v3: PolicyRule.subcommand glob — 命中/未命中/缺省不限（FR-006/ADR-001）', async () => {
  const allowAsk = { onAsk: async () => ({ action: 'allow' as const }) };
  // 命中：子命令级 glob 规则（risk + subcommand 双面限定）
  const gate = createPermissionGate({
    rules: [{ pattern: 'dom', risk: 'write', subcommand: 'set-*', action: 'deny', note: '写子命令禁' }],
  });
  const hit = await gate.check({ tool: 'dom', subcommand: 'set-text', risk: 'write' });
  assert.equal(hit.action, 'deny');
  assert.match(hit.reason, /命中规则 action=deny（写子命令禁）/);
  // 未命中：subcommand 不匹配 → deny 规则不生效 → 缺省 ask（write 敏感面）经桥放行
  const miss = await gate.check({ tool: 'dom', subcommand: 'click', risk: 'write' }, allowAsk);
  assert.equal(miss.action, 'allow');
  assert.equal(miss.by, 'ask'); // 证明走缺省 ask 而非规则 deny
  // '?' 单字符 glob
  const qGate = createPermissionGate({ rules: [{ pattern: 'dom', subcommand: 'r?ad', action: 'allow' }] });
  assert.equal((await qGate.check({ tool: 'dom', subcommand: 'read', risk: 'read' })).action, 'allow');
  const qMiss = await qGate.check({ tool: 'dom', subcommand: 'write', risk: 'write' }, allowAsk);
  assert.equal(qMiss.by, 'ask'); // 'write' 不匹配 'r?ad' → 规则未命中
  // 规则未声明 subcommand → 任意子命令/无子命令均生效（缺省不限，v2 行为零变化）
  const plain = createPermissionGate({ rules: [{ pattern: 'dom', risk: 'ui', action: 'ask' }] });
  const withSub = await plain.check({ tool: 'dom', subcommand: 'click', risk: 'ui' }, allowAsk);
  assert.equal(withSub.action, 'allow');
  assert.equal(withSub.by, 'ask');
  const noSub = await plain.check({ tool: 'dom', subcommand: '', risk: 'ui' }, allowAsk);
  assert.equal(noSub.action, 'allow');
});

test('permission v3: 子命令级与工具级规则并存 — EC-013 deny 优先（v2 EC-014 语义沿）', async () => {
  // 子命令级 allow + 工具级 deny 同时命中 → deny（EC-013）
  const gate = createPermissionGate({
    rules: [
      { pattern: 'dom', risk: 'write', subcommand: 'set-text', action: 'allow', note: '子命令放行' },
      { pattern: 'dom', action: 'deny', note: '工具级禁' },
    ],
  });
  const d = await gate.check({ tool: 'dom', subcommand: 'set-text', risk: 'write' });
  assert.equal(d.action, 'deny');
  assert.match(d.reason, /命中规则 action=deny（工具级禁）/);
  // 反向：工具级 allow + 子命令级 deny → deny
  const gate2 = createPermissionGate({
    rules: [
      { pattern: 'dom', action: 'allow' },
      { pattern: 'dom', subcommand: 'reload', action: 'deny', note: '重载禁' },
    ],
  });
  const d2 = await gate2.check({ tool: 'dom', subcommand: 'reload' });
  assert.equal(d2.action, 'deny');
  assert.match(d2.reason, /（重载禁）/);
  // 非 deny 子命令 → 工具级 allow 放行（子命令级 deny 不误伤）
  assert.equal((await gate2.check({ tool: 'dom', subcommand: 'read-state' })).action, 'allow');
});
