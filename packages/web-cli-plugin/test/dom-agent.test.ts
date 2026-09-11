import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PlatformDomOpResult } from '@lgdl/web-cli-base';
import { createDomAgent, createRemoteDomOps, domUnreachable, type DomAgentTransport } from '../src/content/dom-agent.js';
import { assembleExtensionDom } from '../src/platform/extension-env.js';

function recordingTransport(result: PlatformDomOpResult = { ok: true, output: 'done' }): {
  calls: Array<{ method: string; params: Record<string, unknown> }>;
  transport: DomAgentTransport;
} {
  const calls: Array<{ method: string; params: Record<string, unknown> }> = [];
  return {
    calls,
    transport: {
      async request(method, params) {
        calls.push({ method, params });
        return result;
      },
    },
  };
}

test('dom-agent: proxies required ops with their arguments', async () => {
  const { calls, transport } = recordingTransport({ ok: true, output: 'clicked' });
  const ops = createRemoteDomOps(transport);
  const res = await ops.click('#save', { offsetX: 3 });
  assert.equal(res.ok, true);
  assert.equal(res.output, 'clicked');
  assert.equal(calls[0]?.method, 'click');
  assert.deepEqual(calls[0]?.params.args, ['#save', { offsetX: 3 }]);

  await ops.readState();
  assert.equal(calls[1]?.method, 'readState');
});

test('dom-agent: optional ops are proxied lazily (no whitelist drift)', async () => {
  const { calls, transport } = recordingTransport();
  const ops = createRemoteDomOps(transport);
  const res = await ops.interactives!();
  assert.equal(res.ok, true);
  assert.equal(calls[0]?.method, 'interactives');
  assert.deepEqual(calls[0]?.params.args, []);
});

test('dom-agent: unreachable transport becomes a readable failure (FR-008/EC-007)', async () => {
  const ops = createRemoteDomOps({
    async request() {
      throw new Error('页面已导航');
    },
  });
  const res = await ops.snapshot();
  assert.equal(res.ok, false);
  assert.match(res.output, /DOM 能力不可达/);
  assert.match(res.output, /页面已导航/);
  assert.equal(res.error, 'dom-unreachable');
});

test('dom-agent: default off — no transport means no agent (NFR-002/007)', () => {
  assert.equal(createDomAgent(), undefined);
  const { transport } = recordingTransport();
  assert.notEqual(createDomAgent(transport), undefined);
});

test('dom-agent: extension-dom assembly is a readable no-op when not wired (FR-008)', async () => {
  const absent = assembleExtensionDom();
  assert.equal(absent.enabled, false);
  assert.equal(absent.dom, undefined);
  assert.match(absent.reason ?? '', /未装配|默认关/);

  const { transport } = recordingTransport({ ok: true, output: 'ok' });
  const wired = assembleExtensionDom(transport);
  assert.equal(wired.enabled, true);
  assert.ok(wired.dom?.ops);
  const res = await wired.dom!.ops!.click('#x');
  assert.equal(res.ok, true);
});

test('dom-agent: domUnreachable produces a stable readable shape', () => {
  const res = domUnreachable('click', 'boom');
  assert.equal(res.ok, false);
  assert.equal(res.error, 'dom-unreachable');
  assert.match(res.output, /click/);
  assert.match(res.output, /boom/);
});
