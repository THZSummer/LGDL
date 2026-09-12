/**
 * D3 — events runtime completion: the 6 previously-refused subcommands.
 *
 * These tests drive `createRemoteEventHub` through an **injected stateful page
 * hub** (the node form of the content event bridge) and through the authoritative
 * `router.dispatch` path so the base risk tiers / untrusted gate are exercised,
 * not re-implemented. They prove:
 *   - pause stops delivery / resume resumes it / clear empties / budget applies /
 *     switch toggles the channel — real forwarded behavior, never fake success;
 *   - a page that does not implement an op surfaces its own **specific** reason
 *     (no plugin-side generic「暂不支持」);
 *   - `pull-sensitive` keeps the base gate (`risk='write'` + `--trusted true` +
 *     ask) and, when the page supplies no detail, returns a specific reason.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  DEFAULT_BUDGETS,
  EVENTS_SUBCOMMANDS,
  createEventsToolEntry,
  type PlatformEnv,
  type PlatformEventHub,
  type PlatformSubSummary,
} from '@lgdl/web-cli-base';
import { createWebCliHost } from '../src/background/host.js';
import { createStorageAuditSink } from '../src/security/audit-sink.js';
import { createOriginStore, type PluginKv } from '../src/security/origin-store.js';
import {
  createRemoteEventHub,
  SENSITIVE_DETAIL_UNAVAILABLE,
  sensitiveSourceLabel,
  type EventBridgeReply,
  type RemoteEventHubDeps,
} from '../src/tools/remote-events.js';
import type { WebCliEventOp } from '../src/content/page-bridge.js';

// ── stateful page-hub double (mirrors base event-bus semantics) ──────────────

interface FakeSub {
  subId: string;
  kind: string;
  label?: string;
  sensitive: boolean;
  paused: boolean;
  autoPaused: boolean;
  buffer: Array<{ seq: number; kind: string; type: string }>;
  dropped: number;
  delivered: number;
  lastId: number;
  bufferLimit: number;
  autoPauseAt: number;
}

class FakePageHub {
  readonly ops: string[] = [];
  readonly subs = new Map<string, FakeSub>();
  readonly sensitiveDetail = new Map<number, { kind: string; detail: string }>();
  enabled = false;
  disabledDropped = 0;
  rateDropped = 0;
  private seq = 0;
  private counter = 0;
  /** When set, that op answers with a page-side "unsupported op" refusal. */
  unsupportedOp?: string;

  ingest(kind: string, count: number): void {
    for (let i = 0; i < count; i += 1) {
      this.seq += 1;
      if (!this.enabled) {
        this.disabledDropped += 1;
        continue;
      }
      for (const s of this.subs.values()) {
        if (s.kind !== kind || s.paused || s.autoPaused) continue;
        s.buffer.push({ seq: this.seq, kind: s.kind, type: 'synthetic' });
        s.delivered += 1;
        while (s.buffer.length > s.bufferLimit) {
          s.buffer.shift();
          s.dropped += 1;
        }
        if (s.delivered >= s.autoPauseAt) s.autoPaused = true;
      }
    }
  }

  private summary(s: FakeSub): PlatformSubSummary {
    return {
      subId: s.subId,
      kind: s.kind as PlatformSubSummary['kind'],
      filterLabel: '',
      sensitive: s.sensitive,
      ...(s.label ? { label: s.label } : {}),
      paused: s.paused,
      autoPaused: s.autoPaused,
      bufferSize: s.buffer.length,
      bufferLimit: s.bufferLimit,
      dropped: s.dropped,
      delivered: s.delivered,
      lastId: s.lastId,
    };
  }

  async request(op: WebCliEventOp, params: Record<string, unknown>): Promise<EventBridgeReply> {
    this.ops.push(op);
    if (this.unsupportedOp === op) {
      return { ok: false, error: `不支持的事件通道操作 "${op}"（可用：subscribe/pull/unsubscribe/status）` };
    }
    const subId = typeof params.subId === 'string' ? params.subId : '';
    switch (op) {
      case 'subscribe': {
        const id = `sub-${++this.counter}`;
        this.subs.set(id, {
          subId: id,
          kind: String(params.kind ?? 'dom'),
          ...(typeof params.label === 'string' ? { label: params.label } : {}),
          sensitive: params.sensitive === true,
          paused: false,
          autoPaused: false,
          buffer: [],
          dropped: 0,
          delivered: 0,
          lastId: 0,
          bufferLimit: DEFAULT_BUDGETS.bufferLimit,
          autoPauseAt: DEFAULT_BUDGETS.cumulativeBudget,
        });
        return { ok: true, data: { ok: true, subId: id } };
      }
      case 'unsubscribe': {
        const had = this.subs.delete(subId);
        return had ? { ok: true, data: { ok: true } } : { ok: false, error: `✖ 订阅不存在或已失效（${subId}）` };
      }
      case 'pause': {
        const s = this.subs.get(subId);
        if (!s) return { ok: false, error: `✖ 订阅不存在或已失效（${subId}）` };
        s.paused = true;
        return { ok: true, data: { ok: true } };
      }
      case 'resume': {
        const s = this.subs.get(subId);
        if (!s) return { ok: false, error: `✖ 订阅不存在或已失效（${subId}）` };
        s.paused = false;
        s.autoPaused = false;
        s.delivered = 0;
        return { ok: true, data: { ok: true } };
      }
      case 'clear': {
        const s = this.subs.get(subId);
        if (!s) return { ok: false, error: `✖ 订阅不存在或已失效（${subId}）` };
        s.buffer.length = 0;
        return { ok: true, data: { ok: true } };
      }
      case 'budget': {
        const s = this.subs.get(subId);
        if (!s) return { ok: false, error: `✖ 订阅不存在或已失效（${subId}）` };
        if (typeof params.bufferLimit === 'number') s.bufferLimit = params.bufferLimit;
        if (typeof params.autoPauseAt === 'number') s.autoPauseAt = params.autoPauseAt;
        return { ok: true, data: { ok: true } };
      }
      case 'switch': {
        this.enabled = params.on === true;
        return { ok: true, data: { ok: true } };
      }
      case 'pull': {
        const s = this.subs.get(subId);
        if (!s) return { ok: false, error: `✖ 订阅不存在或已失效（${subId}）` };
        const matched = s.buffer.filter((e) => e.seq > s.lastId);
        const events = typeof params.max === 'number' ? matched.slice(0, params.max) : matched;
        if (events.length > 0) s.lastId = events[events.length - 1].seq;
        return {
          ok: true,
          data: { ok: true, events, lastId: s.lastId, dropped: s.dropped, delivered: s.delivered, bufferSize: s.buffer.length, autoPaused: s.autoPaused },
        };
      }
      case 'pull-sensitive': {
        const s = this.subs.get(subId);
        const seq = typeof params.seq === 'number' ? params.seq : -1;
        const hit = this.sensitiveDetail.get(seq);
        if (!hit) return { ok: false, error: `✖ 事件 ${seq} 无保留明细（侧库容量已逐出，或该事件非敏感面）` };
        if (!s || s.kind !== hit.kind) return { ok: false, error: '✖ 订阅 kind 与明细事件不一致（越权访问拒，EC-012）' };
        return { ok: true, data: { ok: true, detail: hit.detail } };
      }
      case 'status': {
        return {
          ok: true,
          data: {
            enabled: this.enabled,
            subscriptionCount: this.subs.size,
            totalBuffered: [...this.subs.values()].reduce((n, s) => n + s.buffer.length, 0),
            disabledDropped: this.disabledDropped,
            rateDropped: this.rateDropped,
            budgets: DEFAULT_BUDGETS,
            subscriptions: [...this.subs.values()].map((s) => this.summary(s)),
          },
        };
      }
      default:
        return { ok: false, error: `不支持的事件通道操作 "${op}"` };
    }
  }
}

function hubOver(fake: FakePageHub): PlatformEventHub {
  const deps: RemoteEventHubDeps = { request: (op, params) => fake.request(op, params) };
  return createRemoteEventHub(deps);
}

function memoryKv(): PluginKv {
  const map = new Map<string, unknown>();
  return {
    async get<T>(key: string) {
      return map.get(key) as T | undefined;
    },
    async set(key, value) {
      map.set(key, value);
    },
    async remove(key) {
      map.delete(key);
    },
  };
}

function hostOver(fake: FakePageHub, onAsk?: (q: { risk?: string }) => Promise<{ action: 'allow' | 'deny' }>) {
  const audit = createStorageAuditSink(memoryKv());
  const origins = createOriginStore(memoryKv(), { audit });
  const env = {
    kind: 'browser',
    fetch: globalThis.fetch,
    events: hubOver(fake),
  } as unknown as PlatformEnv;
  return createWebCliHost({
    origins,
    audit,
    rpc: { invoke: async () => ({ ok: true, output: '' }) },
    descriptorShow: async () => '{}',
    llmConfig: async () => '{}',
    ...(onAsk ? { onAsk: onAsk as never } : {}),
    browserTools: { env },
  });
}

const call = (name: string, subcommand: string, args: Record<string, string> = {}) => ({
  id: 't',
  name,
  subcommand,
  args,
  rawArguments: '{}',
});

// ── op coverage + no generic refusal ─────────────────────────────────────────

test('D3: the 6 previously-refused subcommands are registered and forwarded (not hardcoded)', () => {
  for (const sub of ['pause', 'resume', 'clear', 'budget', 'switch', 'pull-sensitive']) {
    assert.ok(EVENTS_SUBCOMMANDS.includes(sub as never), `base events must declare ${sub}`);
  }
  // The plugin hub now implements every base hub op (no local refusal shim).
  const fake = new FakePageHub();
  const hub = hubOver(fake) as unknown as Record<string, unknown>;
  for (const m of ['pause', 'resume', 'clear', 'setBudget', 'switch', 'pullSensitive']) {
    assert.equal(typeof hub[m], 'function', `remote hub must implement ${m}`);
  }
  // No generic「暂不支持 / 当前不可用」shim remains in the implementation.
  const src = readFileSync(new URL('../../src/tools/remote-events.ts', import.meta.url), 'utf8');
  assert.equal(/暂不支持/.test(src), false, 'must not contain a generic 暂不支持 refusal');
  assert.equal(/当前不可用/.test(src), false, 'must not contain a generic 当前不可用 refusal');
});

test('D3: pause stops delivery, resume resumes it, clear empties the buffer', async () => {
  const fake = new FakePageHub();
  const hub = hubOver(fake);
  const sub = await hub.subscribe({ kind: 'dom' });
  assert.equal(sub.ok, true);
  const subId = (sub as { subId: string }).subId;
  await hub.switch(true);

  fake.ingest('dom', 3);
  const first = await hub.pull(subId);
  assert.equal(first.events.length, 3, 'switch on + ingest → events delivered');

  assert.deepEqual(await hub.pause(subId), { ok: true });
  fake.ingest('dom', 2);
  const paused = await hub.pull(subId);
  assert.equal(paused.events.length, 0, 'pause → no new events in the buffer');
  assert.equal((await hub.list()).find((s) => s.subId === subId)?.paused, true);

  assert.deepEqual(await hub.resume(subId), { ok: true });
  fake.ingest('dom', 2);
  const resumed = await hub.pull(subId);
  assert.equal(resumed.events.length, 2, 'resume → delivery continues');

  assert.deepEqual(await hub.clear(subId), { ok: true });
  const cleared = await hub.pull(subId);
  assert.equal(cleared.events.length, 0, 'clear → buffer emptied');
  assert.ok(fake.ops.includes('pause') && fake.ops.includes('resume') && fake.ops.includes('clear'));
});

test('D3: budget adjusts the subscription buffer limit; switch toggles the channel', async () => {
  const fake = new FakePageHub();
  const hub = hubOver(fake);
  const subId = ((await hub.subscribe({ kind: 'dom' })) as { subId: string }).subId;

  assert.deepEqual(await hub.setBudget({ subId, bufferLimit: 2 }), { ok: true });
  await hub.switch(true);
  fake.ingest('dom', 5);
  const pulled = await hub.pull(subId, { max: 10 });
  assert.equal(pulled.bufferSize, 2, 'budget bufferLimit=2 caps the buffered events');
  assert.equal((await hub.list()).find((s) => s.subId === subId)?.bufferLimit, 2);

  assert.deepEqual(await hub.switch(false), { ok: true });
  fake.ingest('dom', 1);
  const st = await hub.status();
  assert.equal(st.enabled, false);
  assert.ok(st.disabledDropped > 0, 'switch off → ingest is dropped and counted (not silently ignored)');
});

test('D3: a page that does not implement an op surfaces its specific reason verbatim (never fake success)', async () => {
  const fake = new FakePageHub();
  fake.unsupportedOp = 'pause';
  const host = hostOver(fake, async () => ({ action: 'allow' }));
  const res = await host.dispatch(call('events', 'pause', { subId: 'sub-1' }));
  assert.equal(res.ok, false);
  assert.match(res.output, /不支持的事件通道操作 "pause"/);
  assert.match(res.output, /subscribe\/pull\/unsubscribe\/status/);
  assert.equal(/暂不支持/.test(res.output), false, 'must not fall back to a generic refusal');
});

// ── base risk tiers are not widened ──────────────────────────────────────────

test('D3: base risk tiers are unchanged (pull-sensitive stays write, control ops stay state)', () => {
  const env = { kind: 'browser', fetch: globalThis.fetch, events: hubOver(new FakePageHub()) } as unknown as PlatformEnv;
  const entry = createEventsToolEntry(env);
  assert.equal(entry.risk, 'read');
  const tiers = entry.subcommandRisks ?? {};
  assert.equal(tiers['pull-sensitive'], 'write', 'pull-sensitive must keep the base write tier');
  for (const sub of ['pause', 'resume', 'clear', 'budget', 'switch', 'unsubscribe']) {
    assert.equal(tiers[sub], 'state', `${sub} must keep the base state tier`);
  }
  for (const sub of ['subscribe', 'list', 'status', 'pull']) {
    assert.equal(tiers[sub], 'read', `${sub} must keep the base read tier`);
  }
  assert.notEqual(tiers['pull-sensitive'], 'evaluate' as never);
});

// ── pull-sensitive gate ──────────────────────────────────────────────────────

test('D3: pull-sensitive is refused without --trusted (base gate) and never reaches the bridge', async () => {
  const fake = new FakePageHub();
  const host = hostOver(fake, async () => ({ action: 'allow' }));
  const res = await host.dispatch(call('events', 'pull-sensitive', { subId: 'sub-1', seq: '3' }));
  assert.equal(res.ok, false);
  assert.match(res.output, /trusted/);
  assert.equal(fake.ops.includes('pull-sensitive'), false, 'untrusted request must not be forwarded');
});

test('D3: pull-sensitive with --trusted forwards the gated request and labels the sensitive source', async () => {
  const fake = new FakePageHub();
  const host = hostOver(fake, async () => ({ action: 'allow' }));
  const subId = ((await hubOver(fake).subscribe({ kind: 'console', sensitive: true })) as { subId: string }).subId;
  fake.sensitiveDetail.set(7, { kind: 'console', detail: 'secret-plaintext' });

  const res = await host.dispatch(call('events', 'pull-sensitive', { subId, seq: '7', trusted: 'true' }));
  assert.equal(res.ok, true);
  assert.ok(fake.ops.includes('pull-sensitive'), 'trusted request is forwarded');
  assert.match(res.output, /secret-plaintext/);
  assert.match(res.output, /敏感来源/);
  assert.ok(res.output.includes(sensitiveSourceLabel(subId, 7)));
});

test('D3: pull-sensitive returns a specific reason (not a generic refusal) when the page has no detail', async () => {
  const fake = new FakePageHub();
  const host = hostOver(fake, async () => ({ action: 'allow' }));
  const subId = ((await hubOver(fake).subscribe({ kind: 'dom' })) as { subId: string }).subId;
  const res = await host.dispatch(call('events', 'pull-sensitive', { subId, seq: '99', trusted: 'true' }));
  assert.equal(res.ok, false);
  // The page's own precise reason is surfaced…
  assert.match(res.output, /无保留明细/);
  // …and when the page gives nothing, the plugin's specific FR-006 reason is used.
  assert.match(SENSITIVE_DETAIL_UNAVAILABLE, /零明文供给/);
  assert.match(SENSITIVE_DETAIL_UNAVAILABLE, /--trusted true/);
  assert.equal(/暂不支持/.test(SENSITIVE_DETAIL_UNAVAILABLE), false);
});

test('D3: pull-sensitive asks (base state/ask) and a denied ask blocks forwarding', async () => {
  const fake = new FakePageHub();
  const host = hostOver(fake, async () => ({ action: 'deny' }));
  const res = await host.dispatch(call('events', 'pull-sensitive', { subId: 'sub-1', seq: '1', trusted: 'true' }));
  assert.equal(res.ok, false);
  assert.equal(fake.ops.includes('pull-sensitive'), false, 'a denied ask must not forward');
});
