import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createPageBridge, type BridgeIo } from '../src/content/page-bridge.js';
import { buildDescriptorMessage, buildResult, parseInvoke } from '../src/protocol/rpc.js';

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
