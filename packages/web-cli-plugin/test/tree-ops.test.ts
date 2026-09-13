/**
 * V2-3 gate `tree-ops`（TASK-005；FR-V2-036/039/040 + AC-V23-005/007/008）。
 *
 * **新文件承载**（v1 既有测试零改动）。逐条证明封闭白名单的结构性质：
 *   - 7 动作 → **唯一**既有通路（注入 spy：每次 run 恰好多一个通路被调用）；
 *   - **无默认写入分支**（白名单外的 actionId 不触发任何写入）；
 *   - `needsConfirmation` 逐动作；**未确认 ⇒ 零操作**（不发送任何消息）；
 *   - **幂等**（重复撤销可读，不报错）；
 *   - 失败 → `kind:'err'`（≥3 类可读失败路径）；
 *   - 回执 ② 的工具面证据来自**重拉实测**（present 由注入快照真值决定）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTreeOps, isTreeActionId, TREE_ACTION_IDS } from '../src/ui/tree/tree-ops.js';
import { needsConfirmation } from '../src/ui/tree/tree-view.js';
import type { OpResult, SettingsOps, SettingsTransport } from '../src/ui/settings/ops.js';
import type { EnvGuardResult } from '../src/platform/env-guard.js';
import { projectInsightTree } from '../src/insight/project-tree.js';
import type { ConnectTreeSnapshot, TreeActionId } from '../src/insight/tree-model.js';

// ---------------------------------------------------------------------------
// fakes（注入式：spy 计数 ⇒ 可断言「唯一通路」与「零写入」）
// ---------------------------------------------------------------------------

const ENV_ON = { inExtension: true, banner: '', reasons: [] } as unknown as EnvGuardResult;
const ENV_OFF = { inExtension: false, banner: '非扩展环境：部分能力不可用', reasons: ['not-extension'] } as unknown as EnvGuardResult;

function ok(text = 'ok', kind: OpResult['kind'] = 'ok'): OpResult<unknown> {
  return { ok: true, kind, text };
}

interface OpsHarness {
  ops: SettingsOps;
  counts: Record<string, number>;
}

function makeOps(): OpsHarness {
  const counts: Record<string, number> = {};
  const bump = (key: string): void => {
    counts[key] = (counts[key] ?? 0) + 1;
  };
  const ops = {
    clearLlm: async () => {
      bump('clearLlm');
      return ok('已清除本插件全部配置（含已保存的配置）。');
    },
    setTabsSetting: async (enabled: boolean) => {
      bump('setTabsSetting');
      return ok(`标签页开关=${enabled}`);
    },
    setCapabilityPrivacy: async (cap: string, scope: string, enabled: boolean) => {
      bump('setCapabilityPrivacy');
      return ok(`${cap}/${scope}=${enabled}`);
    },
    revokeCapability: async (cap: string) => {
      bump('revokeCapability');
      return ok(`已撤销 ${cap}`);
    },
    clearAutoAuth: async (origin: string) => {
      bump('clearAutoAuth');
      return ok(`已关闭 ${origin} 的自动授权（读/写都关）。`);
    },
    groupAction: async () => {
      bump('groupAction');
      return ok('分组配置已更新（分组只共享对话，不代表互相授权）。');
    },
  } as unknown as SettingsOps;
  return { ops, counts };
}

type TransportMode = 'ok' | 'fail' | 'throw' | 'not-revoked';

interface TransportHarness {
  transport: SettingsTransport;
  count: () => number;
  sent: { kind: string; origin?: string }[];
}

function makeTransport(mode: TransportMode = 'ok'): TransportHarness {
  let calls = 0;
  const sent: { kind: string; origin?: string }[] = [];
  const harness: TransportHarness = {
    transport: {
      send: async <T>(msg: { kind: string; [k: string]: unknown }) => {
        calls += 1;
        sent.push({ kind: msg.kind, ...(typeof msg.origin === 'string' ? { origin: msg.origin } : {}) });
        if (mode === 'throw') throw new Error('transport down');
        if (mode === 'fail') return { ok: false, error: '后台无响应' } as never as { ok: boolean; data?: T };
        const data =
          msg.kind === 'command-policy-set' || msg.kind === 'command-policy-reset'
            ? { ok: true, changed: true, text: `${msg.kind} ok（测试注入回执）` }
            : mode === 'not-revoked'
              ? { revoked: false, hostPermissionRemoved: false, contentScript: { ok: true } }
              : { revoked: true, hostPermissionRemoved: true, contentScript: { ok: true } };
        return { ok: true, data } as never as { ok: boolean; data?: T };
      },
    },
    count: () => calls,
    sent,
  };
  return harness;
}

function snapshotWithTool(tool: string | null): ConnectTreeSnapshot {
  return projectInsightTree({
    sites: [],
    capability: {
      grants: { bookmarks: false, downloads: false, notify: false, clipboard: false },
      toggles: {
        bookmarksRead: false,
        bookmarksWrite: false,
        downloadsRead: false,
        notify: false,
        clipboardRead: false,
        clipboardWrite: false,
      },
      tabsEnabled: false,
    },
    toolSurface: tool ? [{ name: tool, subcommands: [], presentInSurface: true }] : [],
    delayMs: 0,
  });
}

interface Harness extends OpsHarness, TransportHarness {
  run: ReturnType<typeof createTreeOps>['run'];
  refreshes: () => number;
}

function harness(opts: { transport?: TransportMode; env?: EnvGuardResult; tool?: string | null; refreshThrows?: boolean } = {}): Harness {
  const opsHarness = makeOps();
  const transportHarness = makeTransport(opts.transport ?? 'ok');
  let refreshes = 0;
  const treeOps = createTreeOps({
    ops: opsHarness.ops,
    transport: transportHarness.transport,
    env: opts.env ?? ENV_ON,
    refreshSnapshot: async () => {
      refreshes += 1;
      if (opts.refreshThrows) throw new Error('insight-tree 拉取失败');
      return snapshotWithTool(opts.tool === undefined ? 'site_a' : opts.tool);
    },
    now: () => 42,
  });
  return { ...opsHarness, ...transportHarness, run: treeOps.run, refreshes: () => refreshes };
}

const totalOpsCalls = (h: Harness): number => Object.values(h.counts).reduce((a, b) => a + b, 0);

interface Case {
  actionId: TreeActionId;
  target?: Record<string, unknown>;
  toolHint?: string;
  /** 期望被调用的既有通路（ops spy 名 / `transport`）。 */
  path: string;
  /** R2：transport 通路期望的**唯一**消息 kind（每动作 → 恰一条通路）。 */
  messageKind?: string;
}

// R2 (2026-09-13) — supersession S2 (ADR-V2-031): 9 actions, each mapping to
// exactly one existing/server path. The two new actions map to the two new
// `command-policy-*` message kinds (no bypass).
const CASES: Case[] = [
  { actionId: 'revoke-origin', target: { origin: 'https://a.test' }, toolHint: 'site_a', path: 'transport', messageKind: 'revoke' },
  { actionId: 'revoke-capability', target: { capability: 'bookmarks' }, path: 'revokeCapability' },
  { actionId: 'set-capability-toggle', target: { capability: 'bookmarks', scope: 'read', enabled: false }, path: 'setCapabilityPrivacy' },
  { actionId: 'set-tabs-toggle', target: { enabled: false }, path: 'setTabsSetting' },
  { actionId: 'clear-auto-auth', target: { origin: 'https://a.test' }, path: 'clearAutoAuth' },
  { actionId: 'disconnect-llm', target: {}, path: 'clearLlm' },
  { actionId: 'dissolve-group', target: { groupId: 'grp-1' }, path: 'groupAction' },
  // R2 new actions: tightening desired (`deny`) needs no confirmation.
  {
    actionId: 'set-command-policy',
    target: { command: { tool: 'read-tool' }, policyAction: 'deny', defaultAction: 'allow' },
    path: 'transport',
    messageKind: 'command-policy-set',
  },
  { actionId: 'reset-command-policy', target: { command: { tool: 'read-tool' } }, path: 'transport', messageKind: 'command-policy-reset' },
];

// ---------------------------------------------------------------------------
// 1. 封闭白名单（9 值）
// ---------------------------------------------------------------------------

// R2 (2026-09-13) — supersession S1 (ADR-V2-031, `removed=0`): the closed union
// grows 7 → 9 with `set-command-policy` / `reset-command-policy`. Deviation from
// the plan's loose wording: `command-allow` is **kept as a negative** (it is still
// not a whitelisted action id — only the two `*-command-policy` ids were added).
test('tree-ops: the action union is closed at exactly 9 values (R2 supersession S1)', () => {
  assert.equal(TREE_ACTION_IDS.length, 9);
  assert.deepEqual([...TREE_ACTION_IDS], [
    'revoke-origin',
    'revoke-capability',
    'set-capability-toggle',
    'set-tabs-toggle',
    'clear-auto-auth',
    'disconnect-llm',
    'dissolve-group',
    'set-command-policy',
    'reset-command-policy',
  ]);
  for (const id of TREE_ACTION_IDS) assert.equal(isTreeActionId(id), true);
  // 白名单外一律 false：不做 grant / request，也没有 `command-allow` 之类的泛化写动作。
  for (const bad of ['grant-origin', 'request-permission', 'command-allow', 'reset-command-policy ', '', undefined, 7]) {
    assert.equal(isTreeActionId(bad), false, `${String(bad)} must not be a whitelisted action`);
  }
});

// ---------------------------------------------------------------------------
// 2. 9/9 唯一映射既有通路
// ---------------------------------------------------------------------------

// R2 (2026-09-13) — supersession S2 (ADR-V2-031): 9 actions, each mapping to
// exactly one existing/server path (no side calls).
test('tree-ops: each of the 9 actions maps to exactly one existing path (no side calls, R2 supersession S2)', async () => {
  for (const c of CASES) {
    const h = harness({ tool: 'site_a' });
    const outcome = await h.run({ actionId: c.actionId, ...(c.target ? { target: c.target } : {}), ...(c.toolHint ? { toolHint: c.toolHint } : {}), confirmed: true });

    const transportCalls = h.count();
    const opsCalls = totalOpsCalls(h);
    if (c.path === 'transport') {
      assert.equal(transportCalls, 1, `${c.actionId}: exactly one message sent`);
      assert.equal(opsCalls, 0, `${c.actionId}: must not call any SettingsOps write`);
      assert.equal(h.sent.at(-1)?.kind, c.messageKind, `${c.actionId}: unique message path`);
      if (c.messageKind === 'revoke') assert.equal(h.sent.at(-1)?.origin, 'https://a.test');
    } else {
      assert.equal(transportCalls, 0, `${c.actionId}: must not send any message`);
      assert.equal(h.counts[c.path], 1, `${c.actionId}: ${c.path} called exactly once`);
      assert.equal(opsCalls, 1, `${c.actionId}: exactly one ops write (no side calls)`);
    }
    assert.equal(outcome.receipt.ok, true, `${c.actionId}: success receipt`);
    assert.notEqual(outcome.receipt.kind, 'err', `${c.actionId}: never an error kind on success`);
    assert.equal(outcome.auditEntry.entryPoint, 'admin_audit-export');
    assert.ok(outcome.toolSurfaceEvidence.evidence.length > 0);
  }
});

// ---------------------------------------------------------------------------
// 3. 无默认写入分支
// ---------------------------------------------------------------------------

test('tree-ops: no default write branch — a non-whitelisted actionId writes nothing', async () => {
  const h = harness();
  const outcome = await h.run({ actionId: 'grant-origin' as TreeActionId, target: { origin: 'https://a.test' }, confirmed: true });
  assert.equal(h.count(), 0, 'no transport send');
  assert.equal(totalOpsCalls(h), 0, 'no ops call');
  assert.equal(h.refreshes(), 0, 'no snapshot refresh');
  assert.equal(outcome.receipt.ok, false);
  assert.equal(outcome.receipt.kind, 'err');
  assert.match(outcome.receipt.text, /白名单/);
});

// ---------------------------------------------------------------------------
// 4. needsConfirmation（逐动作）+ 未确认 ⇒ 零操作
// ---------------------------------------------------------------------------

// R2 (2026-09-13) — supersession S3 (ADR-V2-031): 9 actions + the widening-only
// conditional confirmation for `set-command-policy`.
test('tree-ops: needsConfirmation matches the whitelist; unconfirmed ⇒ zero operation (R2 supersession S3)', async () => {
  for (const c of CASES) {
    const h = harness();
    const expected = needsConfirmation(c.actionId);
    const outcome = await h.run({ actionId: c.actionId, ...(c.target ? { target: c.target } : {}) });
    if (expected) {
      assert.equal(outcome.receipt.ok, false, `${c.actionId}: confirmation required → not executed`);
      assert.equal(h.count(), 0, `${c.actionId}: unconfirmed must not send any message`);
      assert.equal(totalOpsCalls(h), 0, `${c.actionId}: unconfirmed must not call any ops`);
      assert.match(outcome.receipt.text, /未收到显式确认|未执行任何操作/);
    } else if (c.path === 'transport') {
      // R2: tightening override / reset are reversible → run without confirmation.
      assert.equal(outcome.receipt.ok, true, `${c.actionId}: runs without confirmation`);
      assert.equal(h.count(), 1, `${c.actionId}: exactly one message sent`);
      assert.equal(totalOpsCalls(h), 0, `${c.actionId}: no SettingsOps write`);
    } else {
      // reversible toggles run without confirmation
      assert.equal(outcome.receipt.ok, true, `${c.actionId}: reversible toggle runs without confirmation`);
      assert.equal(totalOpsCalls(h), 1);
    }
  }
});

// R2: the widening direction of `set-command-policy` requires explicit confirmation.
test('tree-ops: widening command-policy needs explicit confirmation (zero operation otherwise)', async () => {
  const unconfirmed = harness();
  const blocked = await unconfirmed.run({
    actionId: 'set-command-policy',
    target: { command: { tool: 'dom' }, policyAction: 'allow', defaultAction: 'ask' },
  });
  assert.equal(blocked.receipt.ok, false);
  assert.equal(blocked.receipt.kind, 'warn');
  assert.match(blocked.receipt.text, /放宽方向|确认/);
  assert.equal(unconfirmed.count(), 0, 'unconfirmed widening must not send any message');
  assert.equal(totalOpsCalls(unconfirmed), 0);

  const confirmed = harness();
  const ran = await confirmed.run({
    actionId: 'set-command-policy',
    target: { command: { tool: 'dom' }, policyAction: 'allow', defaultAction: 'ask' },
    confirmed: true,
  });
  assert.equal(ran.receipt.ok, true);
  assert.equal(confirmed.count(), 1);
  assert.equal(confirmed.sent.at(-1)?.kind, 'command-policy-set');

  // Tightening (`deny`) is never gated by confirmation.
  const tighten = harness();
  const tightened = await tighten.run({
    actionId: 'set-command-policy',
    target: { command: { tool: 'dom' }, policyAction: 'deny', defaultAction: 'ask' },
  });
  assert.equal(tightened.receipt.ok, true);
  assert.equal(tighten.count(), 1);
});

// R2: reset-command-policy supports both single and all-reset via one unique path.
test('tree-ops: reset-command-policy (single / all) uses the unique reset path', async () => {
  const single = harness();
  const one = await single.run({ actionId: 'reset-command-policy', target: { command: { tool: 'dom', subcommand: 'read-state' } } });
  assert.equal(one.receipt.ok, true);
  assert.equal(single.sent.at(-1)?.kind, 'command-policy-reset');
  const all = harness();
  const every = await all.run({ actionId: 'reset-command-policy', target: { resetAll: true } });
  assert.equal(every.receipt.ok, true);
  assert.equal(all.sent.at(-1)?.kind, 'command-policy-reset');
  const missing = harness();
  const bad = await missing.run({ actionId: 'reset-command-policy', target: {} });
  assert.equal(bad.receipt.kind, 'err');
  assert.equal(missing.count(), 0, 'missing target → zero operation');
});

// ---------------------------------------------------------------------------
// 5. 幂等
// ---------------------------------------------------------------------------

test('tree-ops: repeated revoke is idempotent + readable (no error spam)', async () => {
  // origin already unauthorized → `revoked:false` must read as "already unauthorized".
  const h = harness({ transport: 'not-revoked', tool: 'site_a' });
  const first = await h.run({ actionId: 'revoke-origin', target: { origin: 'https://a.test' }, confirmed: true });
  const second = await h.run({ actionId: 'revoke-origin', target: { origin: 'https://a.test' }, confirmed: true });
  for (const outcome of [first, second]) {
    assert.equal(outcome.receipt.ok, true, 'idempotent repeat is not an error');
    assert.match(outcome.receipt.text, /已处于未授权状态|幂等/);
  }
  assert.equal(h.count(), 2, 'each explicit invocation sends its own revoke (idempotent at the store)');
});

// ---------------------------------------------------------------------------
// 6. 失败 → kind:'err'（≥3 类可读失败路径）
// ---------------------------------------------------------------------------

test('tree-ops: failures are readable kind:err (transport throw / transport error / missing target)', async () => {
  const thrown = harness({ transport: 'throw' });
  const a = await thrown.run({ actionId: 'revoke-origin', target: { origin: 'https://a.test' }, confirmed: true });
  assert.equal(a.receipt.kind, 'err');
  assert.match(a.receipt.text, /异常/);

  const failed = harness({ transport: 'fail' });
  const b = await failed.run({ actionId: 'revoke-origin', target: { origin: 'https://a.test' }, confirmed: true });
  assert.equal(b.receipt.kind, 'err');
  assert.match(b.receipt.text, /失败|无响应/);

  const missing = harness();
  const c = await missing.run({ actionId: 'revoke-origin', confirmed: true });
  assert.equal(c.receipt.kind, 'err');
  assert.equal(missing.count(), 0);

  const missingCap = harness();
  const d = await missingCap.run({ actionId: 'revoke-capability', confirmed: true });
  assert.equal(d.receipt.kind, 'err');
  assert.equal(totalOpsCalls(missingCap), 0);
});

test('tree-ops: an ops-level failure surfaces verbatim as kind:err (never a success state)', async () => {
  const h = harness();
  (h.ops as unknown as { revokeCapability: (cap: string) => Promise<OpResult<unknown>> }).revokeCapability = async () => ({
    ok: false,
    kind: 'err',
    text: '✖ 当前上下文不支持 chrome.permissions.remove',
  });
  const outcome = await h.run({ actionId: 'revoke-capability', target: { capability: 'bookmarks' }, confirmed: true });
  assert.equal(outcome.receipt.ok, false);
  assert.equal(outcome.receipt.kind, 'err');
  assert.match(outcome.receipt.text, /当前上下文不支持/);
});

test('tree-ops: non-extension environment is a readable zero operation', async () => {
  const h = harness({ env: ENV_OFF });
  const outcome = await h.run({ actionId: 'revoke-origin', target: { origin: 'https://a.test' }, confirmed: true });
  assert.equal(outcome.receipt.ok, false);
  assert.equal(outcome.receipt.kind, 'err');
  assert.match(outcome.receipt.text, /非扩展环境/);
  assert.equal(h.count(), 0);
  assert.equal(totalOpsCalls(h), 0);
});

// ---------------------------------------------------------------------------
// 7. 回执 ② 来自重拉实测
// ---------------------------------------------------------------------------

test('tree-ops: evidence ② is the re-pulled truth (present true/false), never a claimed intent', async () => {
  const removed = harness({ tool: null, transport: 'ok' });
  const a = await removed.run({ actionId: 'revoke-origin', target: { origin: 'https://a.test' }, toolHint: 'site_a', confirmed: true });
  assert.equal(a.toolSurfaceEvidence.present, false, 'tool absent from the re-pulled surface → present:false');
  assert.match(a.toolSurfaceEvidence.evidence, /已不在工具面/);
  assert.equal(removed.refreshes(), 1);

  const stillThere = harness({ tool: 'site_a' });
  const b = await stillThere.run({ actionId: 'revoke-origin', target: { origin: 'https://a.test' }, toolHint: 'site_a', confirmed: true });
  assert.equal(b.toolSurfaceEvidence.present, true);
  assert.match(b.toolSurfaceEvidence.evidence, /仍在工具面/);

  const refreshDown = harness({ refreshThrows: true });
  const c = await refreshDown.run({ actionId: 'revoke-origin', target: { origin: 'https://a.test' }, toolHint: 'site_a', confirmed: true });
  assert.equal(c.toolSurfaceEvidence.present, true, 'unconfirmed refresh must not claim removal');
  assert.match(c.toolSurfaceEvidence.evidence, /重拉实测未完成|未确认/);
});

test('tree-ops: surface-neutral actions disclose that the surface is unchanged', async () => {
  const h = harness();
  const outcome = await h.run({ actionId: 'clear-auto-auth', target: { origin: 'https://a.test' }, confirmed: true });
  assert.equal(outcome.receipt.ok, true);
  assert.equal(h.refreshes(), 0, 'surface-neutral action does not need a re-pull');
  assert.match(outcome.toolSurfaceEvidence.evidence, /不改变工具面集合/);
});
