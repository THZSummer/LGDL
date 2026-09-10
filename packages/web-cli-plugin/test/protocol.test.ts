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
import { negotiateVersion } from '../src/protocol/version.js';
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
