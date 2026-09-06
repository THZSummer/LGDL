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
