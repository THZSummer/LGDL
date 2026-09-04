import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSleepCommand, executeSleep } from './sleep.js';
import { SLEEP_TOOL } from './tools.js';
import { webSleepHelp } from './help.js';

test('parseSleepCommand: parses sleep --ms', () => {
  const r = parseSleepCommand('sleep --ms 5000');
  assert.deepEqual(r, { ok: true, kind: 'sleep', ms: 5000 });
  const quoted = parseSleepCommand('sleep --ms "5000"');
  assert.deepEqual(quoted, { ok: true, kind: 'sleep', ms: 5000 });
});

test('parseSleepCommand: parses sleep --seconds', () => {
  const r = parseSleepCommand('sleep --seconds 3');
  assert.deepEqual(r, { ok: true, kind: 'sleep', ms: 3000 });
  const secFloat = parseSleepCommand('sleep --seconds 0.5');
  assert.deepEqual(secFloat, { ok: true, kind: 'sleep', ms: 500 });
});

test('parseSleepCommand: rejects missing prefix / missing duration', () => {
  const noPrefix = parseSleepCommand('lgdl-web-cli sleep --ms 1');
  assert.equal(noPrefix.ok, false);
  if (noPrefix.ok === false) assert.match(noPrefix.error, /sleep/);
  const noArgs = parseSleepCommand('sleep');
  assert.equal(noArgs.ok, false);
  if (noArgs.ok === false) assert.match(noArgs.error, /--ms|--seconds/);
});

test('parseSleepCommand: rejects invalid / negative durations', () => {
  const bad = parseSleepCommand('sleep --ms abc');
  assert.equal(bad.ok, false);
  if (bad.ok === false) assert.match(bad.error, /--ms|--seconds/);
  const neg = parseSleepCommand('sleep --ms -1');
  assert.equal(neg.ok, false);
  const noValue = parseSleepCommand('sleep --ms');
  assert.equal(noValue.ok, false);
});

test('parseSleepCommand: clamps to 10-minute upper bound', () => {
  const r = parseSleepCommand('sleep --ms 999999999');
  assert.equal(r.ok, true);
  if (r.ok === true) assert.equal(r.kind, 'sleep');
  if (r.ok === true && r.kind === 'sleep') assert.equal(r.ms, 600000);
});

test('parseSleepCommand: --help returns help', () => {
  const r = parseSleepCommand('sleep --help');
  assert.equal(r.ok, true);
  if (r.ok === true) assert.equal(r.kind, 'help');
});

test('executeSleep: waits and reports ok', async () => {
  const r = await executeSleep(5);
  assert.equal(r.ok, true);
  assert.ok(r.lines.some((l) => l.includes('已等待 5ms')));
});

test('SLEEP_TOOL: exposes sleep as an independent base tool', () => {
  assert.equal(SLEEP_TOOL.function.name, 'sleep');
  const props = SLEEP_TOOL.function.parameters.properties as Record<string, unknown>;
  assert.ok(props.ms);
  assert.ok(props.seconds);
  assert.ok(SLEEP_TOOL.function.description.includes('--ms 5000'));
});

test('webSleepHelp: shows ms/seconds usage', () => {
  const text = webSleepHelp();
  assert.ok(text.includes('sleep ——'));
  assert.ok(text.includes('--ms <毫秒>'));
  assert.ok(text.includes('--seconds <秒>'));
});
