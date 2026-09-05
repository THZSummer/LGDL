import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSleepCommand, executeSleep, executeSleepFromArgs, normalizeSleepArgs } from './sleep.js';
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
  const noPrefix = parseSleepCommand('my-cli sleep --ms 1');
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
  const top = SLEEP_TOOL.function.parameters.properties as Record<string, unknown>;
  assert.ok(top.args, 'parameters should nest fields under an args object');
  const props = (top.args as { properties?: Record<string, unknown> }).properties;
  assert.ok(props);
  assert.ok(props?.ms);
  assert.ok(props?.seconds);
  assert.deepEqual(SLEEP_TOOL.function.parameters.required, ['args']);
  assert.ok(SLEEP_TOOL.function.description.includes('args.ms'));
});

test('webSleepHelp: shows ms/seconds usage', () => {
  const text = webSleepHelp();
  assert.ok(text.includes('sleep ——'));
  assert.ok(text.includes('--ms <毫秒>'));
  assert.ok(text.includes('--seconds <秒>'));
});

// ---- EC-011：executeSleepFromArgs / normalizeSleepArgs（fc 直调，缺参/归一/clamp）----

test('normalizeSleepArgs: ms and seconds normalize to ms (ms wins)', () => {
  assert.deepEqual(normalizeSleepArgs({ ms: '5000' }), { ok: true, ms: 5000 });
  assert.deepEqual(normalizeSleepArgs({ ms: '5000', seconds: '1' }), { ok: true, ms: 5000 });
  const sec = normalizeSleepArgs({ seconds: '3' });
  assert.deepEqual(sec, { ok: true, ms: 3000 });
  const secFloat = normalizeSleepArgs({ seconds: '0.5' });
  assert.deepEqual(secFloat, { ok: true, ms: 500 });
});

test('normalizeSleepArgs: missing duration is a friendly error with usage', () => {
  const r = normalizeSleepArgs({});
  if (r.ok === false) {
    assert.match(r.lines.join('\n'), /--ms <毫秒> 或 --seconds <秒>/);
    assert.ok(r.lines.some((l) => l.includes('✖')));
  } else {
    assert.fail('expected missing-duration error');
  }
  const empty = normalizeSleepArgs({ ms: '', seconds: '' });
  assert.equal(empty.ok, false);
});

test('normalizeSleepArgs: invalid / negative durations are errors', () => {
  assert.equal(normalizeSleepArgs({ ms: 'abc' }).ok, false);
  assert.equal(normalizeSleepArgs({ seconds: 'abc' }).ok, false);
  assert.equal(normalizeSleepArgs({ ms: '-1' }).ok, false);
  assert.equal(normalizeSleepArgs({ seconds: '-3' }).ok, false);
});

test('normalizeSleepArgs: clamps to 10-minute upper bound (zero real wait)', () => {
  const r = normalizeSleepArgs({ ms: '999999999' });
  assert.deepEqual(r, { ok: true, ms: 600000 });
});

test('executeSleepFromArgs: executes a real small wait end-to-end', async () => {
  const r = await executeSleepFromArgs({ ms: '5' });
  assert.equal(r.ok, true);
  assert.ok(r.lines.some((l) => l.includes('已等待 5ms')));
});

test('executeSleepFromArgs: missing duration errors without waiting', async () => {
  const r = await executeSleepFromArgs({});
  assert.equal(r.ok, false);
  assert.ok(r.lines.some((l) => l.includes('✖')));
});
