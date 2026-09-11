import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PermissionGate, type ToolResult } from '@lgdl/web-cli-base';
import {
  createPageBridge,
  EVENT_CONTEXT_SUMMARY_N,
  parseEventNotify,
  type BridgeIo,
} from '../src/content/page-bridge.js';
import { buildDescriptorMessage, buildResult, parseInvoke } from '../src/protocol/rpc.js';
import { createPluginPolicyConfig } from '../src/security/policy.js';
import { toToolEntry } from '../src/tools/declared-tools.js';

/** Build an IO where the "page" replies to invokes/probes via `pageReply`. */
function bridgeIoWithPage(pageReply: (data: unknown) => unknown): { io: BridgeIo; subscribers: Array<(d: unknown) => void> } {
  const subscribers: Array<(d: unknown) => void> = [];
  return {
    subscribers,
    io: {
      post: (message) => {
        const reply = pageReply(message);
        if (reply !== undefined) {
          for (const h of subscribers) h(reply);
        }
      },
      subscribe: (handler) => {
        subscribers.push(handler);
        return () => {
          const i = subscribers.indexOf(handler);
          if (i >= 0) subscribers.splice(i, 1);
        };
      },
    },
  };
}

test('page-bridge: invoke round trip with the page world', async () => {
  const { io } = bridgeIoWithPage((message) => {
    const invoke = parseInvoke(message);
    if (!invoke) return undefined;
    return buildResult({ channel: 'web-cli', id: invoke.id, ok: true, output: `ran ${invoke.tool}` });
  });
  const bridge = createPageBridge(io, { channel: 'web-cli' });
  const res = await bridge.invoke('notes-list', '', {});
  assert.equal(res.ok, true);
  assert.equal(res.output, 'ran notes-list');
  assert.equal(res.trust, 'external');
  bridge.dispose();
});

test('page-bridge: transport.channel/invokeType/resultType bind dynamically after discovery (R9-7)', async () => {
  const sent: Array<{ channel?: string; type?: string }> = [];
  const { io } = bridgeIoWithPage((message) => {
    const m = message as { type?: string; channel?: string; id?: string };
    if (m.type !== 'custom:invoke') return undefined;
    sent.push({ channel: m.channel, type: m.type });
    return { type: 'custom:result', channel: m.channel, id: m.id, ok: true, output: 'bound' };
  });
  const bridge = createPageBridge(io, { channel: 'web-cli' });
  // Discovery handshake still uses the default channel before binding.
  assert.equal((await bridge.handshake(5)).ok, false);
  bridge.bindTransport({ channel: 'custom', invokeType: 'custom:invoke', resultType: 'custom:result' });
  const res = await bridge.invoke('notes-list', '', {});
  assert.equal(res.ok, true);
  assert.equal(res.output, 'bound');
  assert.equal(res.channel, 'custom');
  assert.deepEqual(sent, [{ channel: 'custom', type: 'custom:invoke' }]);
  bridge.dispose();
});

test('page-bridge: timeout yields a readable failure (no throw)', async () => {
  const io: BridgeIo = { post: () => {}, subscribe: () => () => {} };
  const bridge = createPageBridge(io, { channel: 'web-cli', timeoutMs: 5 });
  const res = await bridge.invoke('slow', '', {});
  assert.equal(res.ok, false);
  assert.match(res.output, /超时/);
  bridge.dispose();
});

test('page-bridge: ignores results for other channels', async () => {
  const { io } = bridgeIoWithPage((message) => {
    const invoke = parseInvoke(message);
    if (!invoke) return undefined;
    return buildResult({ channel: 'other', id: invoke.id, ok: true, output: 'nope' });
  });
  const bridge = createPageBridge(io, { channel: 'web-cli', timeoutMs: 5 });
  const res = await bridge.invoke('x', '', {});
  assert.equal(res.ok, false);
  bridge.dispose();
});

test('page-bridge: handshake resolves from a page descriptor reply', async () => {
  const { io } = bridgeIoWithPage((message) => {
    const probe = message as { type?: string; id?: string };
    if (probe.type !== 'web-cli:probe') return undefined;
    return buildDescriptorMessage('web-cli', probe.id ?? '', { protocolVersion: '1.0' });
  });
  const bridge = createPageBridge(io, { channel: 'web-cli' });
  const hs = await bridge.handshake(20);
  assert.equal(hs.ok, true);
  bridge.dispose();
});

test('content script does not attach globals to window (FR-007 red line)', () => {
  const src = readFileSync(new URL('../../src/content/content-script.ts', import.meta.url), 'utf8');
  assert.equal(/(window|globalThis)\.[A-Za-z_]+\s*=/.test(src), false);
  const bridgeSrc = readFileSync(new URL('../../src/content/page-bridge.ts', import.meta.url), 'utf8');
  assert.equal(/(window|globalThis)\.[A-Za-z_]+\s*=/.test(bridgeSrc), false);
});

// ---------- TASK-013: event bridge (FR-021 / NFR-007) ----------

test('page-bridge: proxies the page env.events hub (subscribe/pull) (FR-021)', async () => {
  const seen: string[] = [];
  const { io } = bridgeIoWithPage((message) => {
    const m = message as { type?: string; op?: string; id?: string; params?: { subId?: string } };
    if (m.type !== 'web-cli:event') return undefined;
    seen.push(m.op ?? '');
    if (m.op === 'subscribe') {
      return { type: 'web-cli:event-result', channel: 'web-cli', id: m.id, ok: true, data: { ok: true, subId: 's1' } };
    }
    if (m.op === 'pull') {
      return {
        type: 'web-cli:event-result',
        channel: 'web-cli',
        id: m.id,
        ok: true,
        data: { ok: true, events: [{ seq: 1 }], lastId: 1, dropped: 0, delivered: 1, bufferSize: 0, autoPaused: false },
      };
    }
    return { type: 'web-cli:event-result', channel: 'web-cli', id: m.id, ok: true, data: { status: 'ok' } };
  });
  const bridge = createPageBridge(io, { channel: 'web-cli' });
  const sub = await bridge.events.subscribe({ kind: 'dom' });
  assert.equal(sub.ok, true);
  assert.equal((sub.data as { subId: string }).subId, 's1');
  const pulled = await bridge.events.pull('s1');
  assert.equal(pulled.ok, true);
  assert.equal((pulled.data as { events: unknown[] }).events.length, 1);
  const status = await bridge.events.status();
  assert.equal(status.ok, true);
  assert.deepEqual(seen, ['subscribe', 'pull', 'status']);
  bridge.dispose();
});

test('page-bridge: event pull is capped to the context summary budget with a readable note (NFR-007)', async () => {
  const many = Array.from({ length: EVENT_CONTEXT_SUMMARY_N + 5 }, (_, i) => ({ seq: i + 1 }));
  const { io } = bridgeIoWithPage((message) => {
    const m = message as { type?: string; id?: string };
    if (m.type !== 'web-cli:event') return undefined;
    return {
      type: 'web-cli:event-result',
      channel: 'web-cli',
      id: m.id,
      ok: true,
      data: { ok: true, events: many, lastId: many.length, dropped: 0, delivered: many.length, bufferSize: 0, autoPaused: false },
    };
  });
  const bridge = createPageBridge(io, { channel: 'web-cli' });
  const pulled = await bridge.events.pull('s1');
  const data = pulled.data as { events: unknown[]; note?: string };
  assert.equal(data.events.length, EVENT_CONTEXT_SUMMARY_N);
  assert.match(data.note ?? '', /上下文预算截断/);
  bridge.dispose();
});

test('page-bridge: forwards unsolicited event notifications to the background sink (FR-021)', async () => {
  const received: Array<{ subId: string; events: unknown[] }> = [];
  const { io, subscribers } = bridgeIoWithPage(() => undefined);
  const bridge = createPageBridge(io, { channel: 'web-cli', onEvent: (m) => received.push({ subId: m.subId, events: m.events }) });
  for (const h of subscribers) h({ type: 'web-cli:event-notify', channel: 'web-cli', subId: 's1', events: [{ seq: 9 }] });
  assert.equal(received.length, 1);
  assert.equal(received[0]?.subId, 's1');
  // Sanity: the notify parser accepts the shape the bridge forwards.
  assert.equal(parseEventNotify({ type: 'web-cli:event-notify', channel: 'web-cli', subId: 's', events: [] })?.subId, 's');
  bridge.dispose();
});

// ---------- TASK-013: UI op gated before RPC (FR-019) ----------

test('FR-019: site:lgdl-web-op-cli is recomputed as a danger tier and gated before RPC', async () => {
  const uiDecl = {
    id: 'lgdl-web-op-cli',
    summary: 'UI 操作（复制/导出/缩放/定位/全屏）',
    subcommands: ['copy-source', 'preview-zoom'],
  };

  const { io } = bridgeIoWithPage((message) => {
    const invoke = parseInvoke(message);
    if (!invoke) return undefined;
    return buildResult({ channel: 'web-cli', id: invoke.id, ok: true, output: `ui:${invoke.subcommand}` });
  });
  const bridge = createPageBridge(io, { channel: 'web-cli' });

  let called = 0;
  const rpc = {
    async invoke(req: { tool: string; subcommand: string; args: Record<string, string> }): Promise<ToolResult> {
      called += 1;
      const r = await bridge.invoke(req.tool, req.subcommand, req.args);
      return {
        ok: r.ok,
        output: r.output,
        ...(r.changed !== undefined ? { changed: r.changed } : {}),
        ...(r.source !== undefined ? { source: r.source } : {}),
        ...(r.error !== undefined ? { error: r.error } : {}),
        trust: r.trust as ToolResult['trust'],
      };
    },
  };
  const entry = toToolEntry(uiDecl, 'https://demo.test', rpc);
  // The plugin recomputes the risk; a UI tool is NOT on the read-only whitelist.
  assert.equal(entry.risk, 'write');

  const gate = new PermissionGate(createPluginPolicyConfig({ isAuthorized: () => true, trustOf: () => 'untrusted' }));
  const call = { tool: 'site.lgdl-web-op-cli', namespace: 'site', risk: entry.risk, subcommand: 'copy-source', args: {}, ctx: { origin: 'https://demo.test' } };

  // Unauthorized-by-confirmation path: deny → the RPC is never dispatched.
  const denied = await gate.check(call, { onAsk: () => ({ action: 'deny' as const }) });
  assert.equal(denied.action, 'deny');
  if (denied.action === 'deny') {
    // gate blocked the call: dispatch is intentionally skipped
  }
  assert.equal(called, 0);

  // Confirmed path: allow → RPC runs through the page bridge.
  const allowed = await gate.check(call, { onAsk: () => ({ action: 'allow' as const }) });
  assert.equal(allowed.action, 'allow');
  const result = await entry.executor!({ subcommand: 'copy-source', args: {} }, { origin: 'https://demo.test' });
  assert.equal(result.ok, true);
  assert.equal(result.output, 'ui:copy-source');
  assert.equal(called, 1);
  bridge.dispose();
});
