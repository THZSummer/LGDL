import { test } from 'node:test';
import assert from 'node:assert/strict';
import { discover, type DiscoveryDeps } from '../src/discovery/discovery.js';
import { parseHtmlDeclaration, resolveDeclarationHref, wellKnownUrl } from '../src/discovery/static-declaration.js';
import { runtimeHandshake } from '../src/discovery/runtime-handshake.js';
import { WEB_CLI_DESCRIPTOR_TYPE } from '../src/protocol/rpc.js';

const descriptor = {
  protocolVersion: '1.0',
  tools: [{ id: 'notes-list', summary: 'List notes', riskHint: 'read' }],
  transport: { kind: 'page-message', channel: 'web-cli' },
};

function deps(overrides: Partial<DiscoveryDeps> = {}): DiscoveryDeps {
  return {
    origin: 'https://demo.test',
    fetchText: async () => ({ ok: false, status: 404 }),
    readHtmlHref: async () => null,
    handshake: async () => ({ ok: false, error: 'no reply' }),
    ...overrides,
  };
}

test('discovery: well-known success → supported', async () => {
  const res = await discover(
    deps({ fetchText: async (url) => (url.endsWith('/.well-known/web-cli.json') ? { ok: true, status: 200, text: JSON.stringify(descriptor) } : { ok: false, status: 404 }) }),
  );
  assert.equal(res.state, 'supported');
  assert.equal(res.descriptor?.tools.length, 1);
  assert.equal(res.descriptor?.source?.channel, 'well-known');
  assert.equal(res.descriptor?.source?.trust, 'untrusted');
});

test('discovery: falls back to HTML link when well-known is absent', async () => {
  const res = await discover(
    deps({
      fetchText: async (url) => {
        if (url.endsWith('/.well-known/web-cli.json')) return { ok: false, status: 404 };
        if (url === 'https://demo.test/app/web-cli.json') return { ok: true, status: 200, text: JSON.stringify(descriptor) };
        return { ok: false, status: 404 };
      },
      readHtmlHref: async () => 'https://demo.test/app/web-cli.json',
    }),
  );
  assert.equal(res.state, 'supported');
  assert.equal(res.descriptor?.source?.channel, 'html-link');
});

test('discovery: no declaration anywhere → unsupported (never false supported)', async () => {
  const res = await discover(deps());
  assert.equal(res.state, 'unsupported');
  assert.equal(res.descriptor, undefined);
  assert.equal(res.attempts.length, 3);
});

test('discovery: invalid well-known falls through to runtime handshake', async () => {
  const res = await discover(
    deps({
      fetchText: async () => ({ ok: true, status: 200, text: '{broken' }),
      handshake: async () => ({ ok: true, descriptor }),
    }),
  );
  assert.equal(res.state, 'supported');
  assert.equal(res.descriptor?.source?.channel, 'runtime-handshake');
  assert.equal(res.attempts.some((a) => a.channel === 'well-known' && a.kind === 'invalid'), true);
});

test('discovery: incompatible protocol version → unknown with readable reason', async () => {
  const res = await discover(
    deps({
      fetchText: async () => ({ ok: true, status: 200, text: JSON.stringify({ ...descriptor, protocolVersion: '2.0' }) }),
    }),
  );
  assert.equal(res.state, 'unknown');
  assert.match(res.reason, /不兼容/);
});

test('discovery: transient fetch error → unknown (not unsupported)', async () => {
  const res = await discover(
    deps({
      fetchText: async () => ({ ok: false, error: 'network down' }),
      readHtmlHref: async () => {
        throw new Error('dom error');
      },
    }),
  );
  assert.equal(res.state, 'unknown');
});

test('static-declaration: resolves relative hrefs under a sub-path base', () => {
  assert.equal(wellKnownUrl('https://demo.test/'), 'https://demo.test/.well-known/web-cli.json');
  assert.equal(
    resolveDeclarationHref('.well-known/web-cli.json', 'https://demo.test/LGDL/index.html'),
    'https://demo.test/LGDL/.well-known/web-cli.json',
  );
  assert.equal(resolveDeclarationHref('web-cli.json', 'https://demo.test/LGDL/'), 'https://demo.test/LGDL/web-cli.json');
  assert.equal(resolveDeclarationHref('', 'https://demo.test/'), null);
});

test('static-declaration: parses link and meta markers', () => {
  const html = '<html><head><link rel="stylesheet" href="a.css"><link rel="web-cli" href=".well-known/web-cli.json"></head></html>';
  assert.equal(
    parseHtmlDeclaration(html, 'https://demo.test/LGDL/index.html'),
    'https://demo.test/LGDL/.well-known/web-cli.json',
  );
  const meta = '<meta name="web-cli" content="/decl/web-cli.json">';
  assert.equal(parseHtmlDeclaration(meta, 'https://demo.test/page'), 'https://demo.test/decl/web-cli.json');
  assert.equal(parseHtmlDeclaration('<html></html>', 'https://demo.test/'), null);
});

test('runtime-handshake: replies with descriptor; times out readably', async () => {
  const handlers: Array<(d: unknown) => void> = [];
  const io = {
    send: (message: unknown) => {
      const msg = message as { id: string };
      for (const h of handlers) h({ type: WEB_CLI_DESCRIPTOR_TYPE, channel: 'web-cli', id: msg.id, descriptor });
    },
    subscribe: (h: (d: unknown) => void) => {
      handlers.push(h);
      return () => {
        const i = handlers.indexOf(h);
        if (i >= 0) handlers.splice(i, 1);
      };
    },
  };
  const ok = await runtimeHandshake({ channel: 'web-cli', io, timeoutMs: 50 });
  assert.equal(ok.ok, true);

  const silent = { send: () => {}, subscribe: () => () => {} };
  const timeout = await runtimeHandshake({ channel: 'web-cli', io: silent, timeoutMs: 10 });
  assert.equal(timeout.ok, false);
  assert.match(timeout.error ?? '', /超时/);
});

test('runtime-handshake: ignores messages for other channels/ids', async () => {
  const handlers: Array<(d: unknown) => void> = [];
  const io = {
    send: () => {
      for (const h of handlers) h({ type: WEB_CLI_DESCRIPTOR_TYPE, channel: 'other', id: 'x', descriptor });
    },
    subscribe: (h: (d: unknown) => void) => {
      handlers.push(h);
      return () => {};
    },
  };
  const res = await runtimeHandshake({ channel: 'web-cli', io, timeoutMs: 10, probeId: 'p' });
  assert.equal(res.ok, false);
});
