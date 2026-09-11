import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  WEB_CLI_PROTOCOL_VERSION,
  isToolRisk,
  normalizeDescriptor,
  parseDescriptor,
  parseDescriptorJson,
  parseToolDecl,
} from '../src/protocol/descriptor.js';
import { isVersionUnusable, negotiateVersion } from '../src/protocol/version.js';
import { discover, type DiscoveryDeps } from '../src/discovery/discovery.js';
import { versionAuditEvent } from '../src/security/discovery-audit.js';
import { defaultSource, resolveTrust, sha256Hex, verifyIntegrity } from '../src/protocol/trust.js';
import {
  buildInvoke,
  buildProbe,
  buildResult,
  isWebCliMessage,
  nextRequestId,
  parseDescriptorMessage,
  parseInvoke,
  parseResult,
  withTimeout,
} from '../src/protocol/rpc.js';

const validDescriptor = {
  protocolVersion: '1.0',
  siteName: 'Demo',
  tools: [
    { id: 'read-things', summary: 'Read things', riskHint: 'read' },
    { id: 'write-things', summary: 'Write things', params: { text: { type: 'string', required: true } }, riskHint: 'write' },
  ],
  transport: { kind: 'page-message', channel: 'web-cli' },
};

test('descriptor: parses a valid declaration and fills source', () => {
  const res = parseDescriptor(validDescriptor, { origin: 'https://demo.test', channel: 'well-known', fetchedAt: 1 });
  assert.equal(res.ok, true);
  if (!res.ok) return;
  assert.equal(res.descriptor.protocolVersion, '1.0');
  assert.equal(res.descriptor.tools.length, 2);
  assert.equal(res.descriptor.source?.origin, 'https://demo.test');
  assert.equal(res.descriptor.source?.trust, 'untrusted');
  assert.equal(res.descriptor.source?.integrityVerified, false);
});

test('descriptor: rejects invalid declarations readably', () => {
  assert.equal(parseDescriptor(null).ok, false);
  assert.equal(parseDescriptor({}).ok, false);
  assert.equal(parseDescriptor({ protocolVersion: '1.0' }).ok, false);
  const dup = parseDescriptor({
    protocolVersion: '1.0',
    tools: [
      { id: 'a', summary: 'A' },
      { id: 'a', summary: 'A2' },
    ],
    transport: { kind: 'page-message', channel: 'c' },
  });
  assert.equal(dup.ok, false);
  assert.match(dup.ok === false ? dup.error : '', /重复/);
  const badTransport = parseDescriptor({
    protocolVersion: '1.0',
    tools: [],
    transport: { kind: 'websocket', channel: 'c' },
  });
  assert.equal(badTransport.ok, false);
  const badRisk = parseToolDecl({ id: 'x', summary: 'X', riskHint: 'nope' });
  assert.equal(badRisk.ok, false);
  assert.equal(parseToolDecl({ id: 'bad id', summary: 'X' }).ok, false);
});

test('descriptor: parseDescriptorJson returns readable error on bad JSON', () => {
  const res = parseDescriptorJson('{not json');
  assert.equal(res.ok, false);
  assert.match(res.ok === false ? res.error : '', /JSON/);
});

test('descriptor: normalize trims fields and copies collections', () => {
  const res = parseDescriptor(validDescriptor);
  assert.equal(res.ok, true);
  if (!res.ok) return;
  const n = normalizeDescriptor(res.descriptor);
  assert.equal(n.tools[0].id, 'read-things');
  assert.notEqual(n.tools, res.descriptor.tools);
});

test('descriptor: isToolRisk guards the six tiers', () => {
  assert.equal(isToolRisk('evaluate'), true);
  assert.equal(isToolRisk('nope'), false);
  assert.equal(WEB_CLI_PROTOCOL_VERSION, '1.0');
});

test('version: accept / degrade / reject / invalid', () => {
  assert.equal(negotiateVersion('1.0').action, 'accept');
  assert.equal(negotiateVersion('1.0').ok, true);
  assert.equal(negotiateVersion('1.5').action, 'degrade');
  assert.equal(negotiateVersion('1.5').ok, true);
  assert.equal(negotiateVersion('2.0').action, 'reject');
  assert.equal(negotiateVersion('2.0').ok, false);
  assert.equal(negotiateVersion('abc').action, 'reject');
});

test('trust: no integrity declaration is conservative', async () => {
  const res = await verifyIntegrity({ protocolVersion: '1.0', tools: [], transport: { kind: 'page-message', channel: 'c' } });
  assert.equal(res.integrityVerified, false);
  assert.match(res.reason, /未提供完整性摘要/);
});

test('trust: sha256 integrity verification detects tampering', async () => {
  const text = JSON.stringify(validDescriptor);
  const digest = await sha256Hex(text);
  const parsed = parseDescriptor({ ...validDescriptor, integrity: { algorithm: 'sha256', digest } });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const good = await verifyIntegrity(parsed.descriptor, text);
  assert.equal(good.integrityVerified, true);
  const bad = await verifyIntegrity(parsed.descriptor, `${text} `);
  assert.equal(bad.integrityVerified, false);
  assert.match(bad.reason, /校验失败/);
});

test('trust: default source is untrusted; resolveTrust defaults untrusted', async () => {
  assert.equal(defaultSource('https://a.test', 'html-link').trust, 'untrusted');
  assert.equal(await resolveTrust('https://a.test'), 'untrusted');
  assert.equal(await resolveTrust('https://a.test', { trustOf: () => 'trusted' }), 'trusted');
  assert.equal(await resolveTrust('https://a.test', { trustOf: () => 'untrusted' }), 'untrusted');
});

test('rpc: invoke/result round trip and trust marking', () => {
  const invoke = buildInvoke({ channel: 'web-cli', id: '1', tool: 'notes-add', subcommand: 'add', args: { text: 'hi' } });
  assert.equal(isWebCliMessage(invoke), true);
  const parsed = parseInvoke(invoke);
  assert.equal(parsed?.tool, 'notes-add');
  assert.equal(parsed?.args.text, 'hi');
  const result = buildResult({ channel: 'web-cli', id: '1', ok: true, output: 'done', changed: true });
  assert.equal(result.trust, 'external');
  assert.equal(parseResult(result)?.ok, true);
  assert.equal(isWebCliMessage({ type: 'other' }), false);
});

test('rpc: parseResult honors a descriptor-declared resultType (R9-7)', () => {
  const custom = { type: 'custom:result', channel: 'custom', id: '1', ok: true, output: 'done' };
  assert.equal(parseResult(custom), null); // default resultType does not match
  const parsed = parseResult(custom, 'custom:result');
  assert.equal(parsed?.ok, true);
  assert.equal(parsed?.type, 'custom:result');
  assert.equal(parsed?.channel, 'custom');
});

test('rpc: probe/descriptor message parsing', () => {
  const probe = buildProbe('web-cli', 'p1');
  assert.equal(isWebCliMessage(probe), true);
  const msg = parseDescriptorMessage({ type: 'web-cli:descriptor', channel: 'web-cli', id: 'p1', descriptor: { a: 1 } });
  assert.deepEqual(msg?.descriptor, { a: 1 });
  assert.equal(parseDescriptorMessage({ type: 'web-cli:descriptor', channel: 'x' }), null);
});

test('rpc: withTimeout rejects readably and nextRequestId is unique', async () => {
  await assert.rejects(
    () => withTimeout(new Promise(() => {}), 5, 'op'),
    /超时/,
  );
  assert.notEqual(nextRequestId('r'), nextRequestId('r'));
});

// ---------- TASK-012: version negotiation hardening (FR-013 / EC-014) ----------

test('version: every outcome carries a readable notice and usability flag', () => {
  const accept = negotiateVersion('1.0');
  assert.equal(accept.action, 'accept');
  assert.match(accept.notice, /兼容/);
  assert.equal(isVersionUnusable(accept), false);

  const degrade = negotiateVersion('1.4');
  assert.equal(degrade.action, 'degrade');
  assert.match(degrade.notice, /较新|降级/);
  assert.equal(isVersionUnusable(degrade), false);

  const reject = negotiateVersion('2.0');
  assert.equal(reject.action, 'reject');
  assert.match(reject.notice, /不兼容/);
  assert.equal(isVersionUnusable(reject), true);

  const invalid = negotiateVersion('not-a-version');
  assert.equal(invalid.action, 'reject');
  assert.match(invalid.notice, /无效/);
  assert.equal(isVersionUnusable(invalid), true);
});

test('version: version negotiation is auditable (EC-014 / FR-013)', () => {
  const reject = versionAuditEvent('https://demo.test', negotiateVersion('2.0'), 42);
  assert.equal(reject.type, 'protocol-version');
  assert.equal(reject.origin, 'https://demo.test');
  assert.equal(reject.ok, false);
  assert.equal(reject.ts, 42);
  assert.match(reject.detail ?? '', /action=reject/);
  assert.match(reject.detail ?? '', /declared=2\.0/);

  const degrade = versionAuditEvent('https://demo.test', negotiateVersion('1.4'));
  assert.equal(degrade.ok, true);
  assert.match(degrade.detail ?? '', /action=degrade/);
});

// ---------- TASK-012: discovery failure degradation ≥3 scenarios (FR-014 / EC-001) ----------

const discoveryDescriptor = {
  protocolVersion: '1.0',
  tools: [{ id: 'notes-list', summary: 'List notes', riskHint: 'read' }],
  transport: { kind: 'page-message', channel: 'web-cli' },
};

function discoveryDeps(overrides: Partial<DiscoveryDeps> = {}): DiscoveryDeps {
  return {
    origin: 'https://demo.test',
    fetchText: async () => ({ ok: false, status: 404 }),
    readHtmlHref: async () => null,
    handshake: async () => ({ ok: false, error: 'no reply' }),
    ...overrides,
  };
}

test('discovery: no declaration → unsupported with no-declaration failure (EC-001)', async () => {
  const res = await discover(discoveryDeps());
  assert.equal(res.state, 'unsupported');
  assert.equal(res.failure.kind, 'no-declaration');
  assert.match(res.failure.message, /未声明支持/);
});

test('discovery: invalid declaration → unknown with invalid-declaration failure', async () => {
  const res = await discover(
    discoveryDeps({
      fetchText: async () => ({ ok: true, status: 200, text: '{broken json' }),
    }),
  );
  assert.equal(res.state, 'unknown');
  assert.equal(res.failure.kind, 'invalid-declaration');
  assert.match(res.failure.message, /声明无效/);
});

test('discovery: version mismatch → unknown with version-mismatch failure + negotiation', async () => {
  const res = await discover(
    discoveryDeps({
      fetchText: async () => ({ ok: true, status: 200, text: JSON.stringify({ ...discoveryDescriptor, protocolVersion: '2.0' }) }),
    }),
  );
  assert.equal(res.state, 'unknown');
  assert.equal(res.failure.kind, 'version-mismatch');
  assert.equal(res.version?.action, 'reject');
  assert.match(res.failure.message, /版本不兼容/);
});

test('discovery: transient failure → unknown (retryable, not a false unsupported)', async () => {
  const res = await discover(
    discoveryDeps({
      fetchText: async () => ({ ok: false, error: 'network down' }),
      readHtmlHref: async () => {
        throw new Error('dom error');
      },
    }),
  );
  assert.equal(res.state, 'unknown');
  assert.equal(res.failure.kind, 'transient');
});

test('discovery: supported result carries a reused version negotiation (accept)', async () => {
  const res = await discover(
    discoveryDeps({
      fetchText: async () => ({ ok: true, status: 200, text: JSON.stringify(discoveryDescriptor) }),
    }),
  );
  assert.equal(res.state, 'supported');
  assert.equal(res.failure.kind, 'none');
  assert.equal(res.version?.action, 'accept');
});
