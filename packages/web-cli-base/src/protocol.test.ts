import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseWebCliCommand, parseWebCliBatch, tokenizeCli } from './protocol.js';
import { formatStatus, parseLgdl } from '@lgdl/core';

test('tokenizeCli: splits on whitespace, respects quotes', () => {
  assert.deepEqual(tokenizeCli('lgdl-web-cli add-node --id x --label "hello world"'), [
    'lgdl-web-cli',
    'add-node',
    '--id',
    'x',
    '--label',
    'hello world',
  ]);
});

test('parseWebCliCommand: add-node with lgdl prefix and --doc', () => {
  const r = parseWebCliCommand('lgdl-web-cli add-node --doc main --id user --label 用户 --kind entity');
  assert.equal(r.kind, 'op');
  if (r.kind === 'op') {
    assert.equal(r.docId, 'main');
    assert.equal(r.op.op, 'add-node');
    assert.equal(r.op.id, 'user');
    assert.equal(r.op.label, '用户');
    assert.equal(r.op.kind, 'entity');
  }
});

test('parseWebCliCommand: missing lgdl-web-cli prefix is an error', () => {
  const r = parseWebCliCommand('add-edge --doc main --from a --to b --label 依赖');
  assert.equal(r.kind, 'error');
  if (r.kind === 'error') assert.match(r.message, /lgdl-web-cli/);
});

test('parseWebCliCommand: terminal `lgdl` prefix is rejected (entry separation)', () => {
  const r = parseWebCliCommand('lgdl status --doc main');
  assert.equal(r.kind, 'error');
  if (r.kind === 'error') assert.match(r.message, /lgdl-cli/);
});

test('parseWebCliCommand: update-node with new-id and attrs', () => {
  const r = parseWebCliCommand('lgdl-web-cli update-node --doc main --id old --new-id new --attrs start=0,duration=3');
  assert.equal(r.kind, 'op');
  if (r.kind === 'op') {
    assert.equal(r.docId, 'main');
    assert.equal(r.op.op, 'update-node');
    assert.equal(r.op.newId, 'new');
    assert.deepEqual(r.op.attrs, { start: 0, duration: 3 });
  }
});

test('parseWebCliCommand: status', () => {
  assert.deepEqual(parseWebCliCommand('lgdl-web-cli status --doc main'), { kind: 'status', docId: 'main' });
});

test('parseWebCliCommand: validate', () => {
  assert.deepEqual(parseWebCliCommand('lgdl-web-cli validate --doc main'), { kind: 'validate', docId: 'main' });
});

test('parseWebCliCommand: init', () => {
  assert.deepEqual(parseWebCliCommand('lgdl-web-cli init --doc main'), { kind: 'init', docId: 'main', type: undefined });
  assert.deepEqual(parseWebCliCommand('lgdl-web-cli init --doc main --type er'), { kind: 'init', docId: 'main', type: 'er' });
});

test('parseWebCliCommand: convert', () => {
  assert.deepEqual(parseWebCliCommand('lgdl-web-cli convert --doc main --to mermaid'), { kind: 'convert', docId: 'main', to: 'mermaid' });
});

test('parseWebCliCommand: convert missing --to is an error', () => {
  const r = parseWebCliCommand('lgdl-web-cli convert --doc main');
  assert.equal(r.kind, 'error');
  if (r.kind === 'error') assert.match(r.message, /--to/);
});

test('parseWebCliCommand: unknown command is an error', () => {
  const r = parseWebCliCommand('lgdl-web-cli explode --doc main --all');
  assert.equal(r.kind, 'error');
});

test('parseWebCliCommand: read-only query commands parse (doc-info / get-node / get-edge / find-node / list-*)', () => {
  const getNode = parseWebCliCommand('lgdl-web-cli get-node --doc main --id user');
  assert.equal(getNode.kind, 'query');
  if (getNode.kind === 'query') {
    assert.equal(getNode.command, 'get-node');
    assert.equal(getNode.args.id, 'user');
  }
  const findNode = parseWebCliCommand('lgdl-web-cli find-node --doc main --label 用户');
  assert.equal(findNode.kind, 'query');
  if (findNode.kind === 'query') assert.equal(findNode.args.label, '用户');
  for (const cmd of ['doc-info', 'get-edge', 'list-node-kinds', 'list-diagram-types']) {
    const r = parseWebCliCommand(`lgdl-web-cli ${cmd} --doc main`);
    assert.equal(r.kind, 'query', `${cmd} should parse as query`);
    if (r.kind === 'query') assert.equal(r.command, cmd);
  }
});

test('parseWebCliCommand: fetch-doc is NOT a lgdl-web-cli subcommand (moved to lgdl-web-fetch)', () => {
  const r = parseWebCliCommand('lgdl-web-cli fetch-doc --doc main --path x');
  assert.equal(r.kind, 'error');
  if (r.kind === 'error') assert.match(r.message, /lgdl-web-fetch/);
});

test('parseWebCliBatch: query commands pass through without stopping the batch', () => {
  const r = parseWebCliBatch(
    'lgdl-web-cli status --doc main\nlgdl-web-cli list-node-kinds --doc main\nlgdl-web-cli add-node --doc main --id a --label A',
  );
  assert.equal(r.errors.length, 0);
  assert.equal(r.ops.length, 1);
  assert.equal(r.wantsStatus, true);
  assert.equal(r.docId, 'main');
});

test('parseWebCliCommand: top-level --help needs no --doc', () => {
  assert.deepEqual(parseWebCliCommand('lgdl-web-cli --help'), { kind: 'help', topic: '' });
});

test('parseWebCliCommand: no subcommand shows top-level help', () => {
  assert.deepEqual(parseWebCliCommand('lgdl-web-cli'), { kind: 'help', topic: '' });
});

test('parseWebCliCommand: help subcommand alias (git style)', () => {
  assert.deepEqual(parseWebCliCommand('lgdl-web-cli help'), { kind: 'help', topic: '' });
  assert.deepEqual(parseWebCliCommand('lgdl-web-cli help add-node'), { kind: 'help', topic: 'add-node' });
});

test('parseWebCliCommand: <subcommand> --help wins over missing --doc and missing args', () => {
  // clig.dev：--help 优先级最高，加在末尾忽略其他校验
  assert.deepEqual(parseWebCliCommand('lgdl-web-cli add-node --help'), { kind: 'help', topic: 'add-node' });
  assert.deepEqual(parseWebCliCommand('lgdl-web-cli add-node --doc main --help'), { kind: 'help', topic: 'add-node' });
});

test('parseWebCliBatch: --help passes through without stopping the batch', () => {
  const r = parseWebCliBatch('lgdl-web-cli status --doc main\nlgdl-web-cli add-node --help\nlgdl-web-cli add-node --doc main --id a --label A');
  assert.equal(r.errors.length, 0);
  assert.equal(r.wantsHelp, true);
  assert.equal(r.helpTopic, 'add-node');
  assert.equal(r.ops.length, 1);
});

test('parseWebCliCommand: missing --doc is an error (web-cli requires it)', () => {
  const r = parseWebCliCommand('lgdl-web-cli add-node --id a --label A');
  assert.equal(r.kind, 'error');
  if (r.kind === 'error') assert.match(r.message, /--doc/);
});

test('parseWebCliCommand: missing required arg is an error', () => {
  const r = parseWebCliCommand('lgdl-web-cli add-node --doc main --label 只有标签');
  assert.equal(r.kind, 'error');
  if (r.kind === 'error') assert.match(r.message, /--id/);
});

test('parseWebCliBatch: multiple commands, stops at first error', () => {
  const r = parseWebCliBatch(
    'lgdl-web-cli status --doc main\nlgdl-web-cli add-node --doc main --id a --label A\nlgdl-web-cli add-node --doc main --id b\nlgdl-web-cli remove-node --doc main',
  );
  assert.equal(r.ops.length, 2);
  assert.equal(r.wantsStatus, true);
  assert.equal(r.errors.length, 1);
  assert.equal(r.errors[0].index, 3);
  assert.match(r.errors[0].message, /--id/);
});

test('parseWebCliBatch: error message names the failing command', () => {
  const r = parseWebCliBatch('lgdl-web-cli update-edge --doc main --from a --to b');
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0].message, /no change requested/);
});

test('parseWebCliBatch: validate/init/convert flags are set', () => {
  const r = parseWebCliBatch('lgdl-web-cli status --doc main\nlgdl-web-cli validate --doc main\nlgdl-web-cli init --doc main\nlgdl-web-cli convert --doc main --to mermaid');
  assert.equal(r.wantsStatus, true);
  assert.equal(r.wantsValidate, true);
  assert.equal(r.wantsInit, true);
  assert.equal(r.wantsConvert, true);
  assert.equal(r.convertTo, 'mermaid');
});

test('parseWebCliBatch: mixed --doc in one batch is an error', () => {
  const r = parseWebCliBatch('lgdl-web-cli status --doc main\nlgdl-web-cli add-node --doc other --id x');
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0].message, /--doc 不一致/);
});

test('parseWebCliBatch: --doc carried through the batch', () => {
  const r = parseWebCliBatch('lgdl-web-cli status --doc main\nlgdl-web-cli add-node --doc main --id x');
  assert.equal(r.docId, 'main');
  assert.equal(r.errors.length, 0);
});

test('formatStatus: renders nodes/edges/groups like lgdl status', () => {
  const src = `title: demo
type: flowchart
nodes:
  - id: start
    kind: start
    label: 开始
  - id: task
    label: 处理
  - id: g1
    kind: group
    label: G
    contains: [start]
edges:
  - from: start
    to: task
`;
  const parsed = parseLgdl(src);
  assert.ok(parsed.valid);
  const text = formatStatus(parsed.document);
  assert.match(text, /# demo \[flowchart\]/);
  assert.match(text, /start \(开始\) :start/);
  assert.match(text, /task \(处理\)/);
  assert.match(text, /start -> task/);
  assert.match(text, /g1 \(G\): start/);
});
