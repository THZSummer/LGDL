import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DelayGate, clampDelayMs, realClock, type Clock } from './delay.js';

/** 记账型 fake clock：同步记账 + 手动推进，零真实等待（AC-005）。 */
function makeFakeClock() {
  let t = 0;
  const waits: number[] = [];
  const clock: Clock = {
    now: () => t,
    sleep: async (ms) => {
      waits.push(ms);
      t += ms; // sleep 结束后时钟推进（等价真实流逝）
    },
  };
  return {
    clock,
    advance: (ms: number) => {
      t += ms;
    },
    waits,
    now: () => t,
  };
}

/** 模拟一次 delay-eligible 命令分发：gate 前置 + 执行（耗时经 clock 流逝）+ 记账。 */
async function runCommand(gate: DelayGate, delayMs: number, fake: ReturnType<typeof makeFakeClock>, execMs: number, tool = 't') {
  await gate.before(delayMs, tool);
  fake.advance(execMs); // 命令执行耗时自然流逝
}

test('realClock exists and exposes now/sleep', () => {
  assert.equal(typeof realClock.now, 'function');
  assert.equal(typeof realClock.sleep, 'function');
  assert.equal(typeof realClock.now(), 'number');
});

test('clampDelayMs: illegal values clamp to [0,5000] (EC-009)', () => {
  assert.equal(clampDelayMs(600), 600);
  assert.equal(clampDelayMs(0), 0);
  assert.equal(clampDelayMs(-1), 0);
  assert.equal(clampDelayMs(-5000), 0);
  assert.equal(clampDelayMs(5000), 5000);
  assert.equal(clampDelayMs(5001), 5000);
  assert.equal(clampDelayMs(999999), 5000);
  assert.equal(clampDelayMs(Number.NaN), 0);
  assert.equal(clampDelayMs(Number.POSITIVE_INFINITY), 0);
});

test('DelayGate: first dispatch never waits (FR-014)', async () => {
  const fake = makeFakeClock();
  const gate = new DelayGate(fake.clock);
  await runCommand(gate, 600, fake, 0);
  assert.deepEqual(fake.waits, []);
  assert.deepEqual(gate.stats, { waitCount: 0, waitedMs: 0 });
});

test('DelayGate: two consecutive commands are spaced max(delayMs, exec time)', async () => {
  // exec < delayMs → 补齐至间隔起点距 600ms
  const fake = makeFakeClock();
  const gate = new DelayGate(fake.clock);
  await runCommand(gate, 600, fake, 250);
  await runCommand(gate, 600, fake, 100);
  assert.deepEqual(fake.waits, [350]); // 首个不等待；第二个补齐 600-250
  assert.deepEqual(gate.stats, { waitCount: 1, waitedMs: 350 });
  // 起点间隔 = 250 + 350 = 600 = delayMs
  assert.equal(fake.now(), 600 + 100);
});

test('DelayGate: slow command (exec >= delayMs) needs no top-up', async () => {
  const fake = makeFakeClock();
  const gate = new DelayGate(fake.clock);
  await runCommand(gate, 600, fake, 800); // 执行耗时已 ≥ 600
  await runCommand(gate, 600, fake, 0);
  assert.deepEqual(fake.waits, []);
  assert.deepEqual(gate.stats, { waitCount: 0, waitedMs: 0 });
  assert.equal(fake.now(), 800);
});

test('DelayGate: delayMs=0 (disabled / exempt) is zero-overhead and does not update the slot', async () => {
  const fake = makeFakeClock();
  const gate = new DelayGate(fake.clock);
  await runCommand(gate, 0, fake, 3000); // 免除命令：不等待、不更新起点
  assert.deepEqual(fake.waits, []);
  // 紧随的 gated 命令：因免除命令未更新起点（无上一命令），仍不等待
  await runCommand(gate, 600, fake, 0);
  assert.deepEqual(fake.waits, []);
});

test('DelayGate: exempt sleep-like long wait leaves subsequent command un-padded (EC-005)', async () => {
  // A(gated 50ms) → sleep-like exempt(3000ms) → B(gated)
  const fake = makeFakeClock();
  const gate = new DelayGate(fake.clock);
  await runCommand(gate, 600, fake, 50, 'a');
  await runCommand(gate, 0, fake, 3000, 'sleep'); // 免除：执行 3000 自然流逝
  const waitsBefore = fake.waits.length;
  await runCommand(gate, 600, fake, 0, 'b');
  assert.equal(fake.waits.length, waitsBefore); // 不追加等待
  // 距 A 起点已 3050ms ≥ 600 → 无补齐
});

test('DelayGate: exempt short wait is padded up to the interval (EC-005)', async () => {
  // A(gated 0ms) → sleep-like exempt(200ms) → B(gated)：B 补齐至距 A 起点 600
  const fake = makeFakeClock();
  const gate = new DelayGate(fake.clock);
  await runCommand(gate, 600, fake, 0, 'a');
  await runCommand(gate, 0, fake, 200, 'sleep');
  await runCommand(gate, 600, fake, 0, 'b');
  assert.deepEqual(fake.waits, [400]); // 200 < 600 → 补齐 400
  assert.equal(fake.now(), 200 + 400);
});

test('DelayGate: stats + onDelay observation (FR-017)', async () => {
  const fake = makeFakeClock();
  const seen: Array<{ waited: number; tool: string }> = [];
  const gate = new DelayGate(fake.clock, (waited, tool) => seen.push({ waited, tool }));
  // first(0→100) → second(补齐 500，起点 600) → third(补齐 600，起点 1200，执行 700)
  // → fourth(距 third 起点 700 ≥ 600，无需补齐)
  await runCommand(gate, 600, fake, 100, 'first');
  await runCommand(gate, 600, fake, 0, 'second');
  await runCommand(gate, 600, fake, 700, 'third');
  await runCommand(gate, 600, fake, 0, 'fourth');
  assert.deepEqual(seen, [
    { waited: 500, tool: 'second' },
    { waited: 600, tool: 'third' },
  ]);
  assert.deepEqual(gate.stats, { waitCount: 2, waitedMs: 1100 });
});

test('DelayGate: no-delay gate path is zero overhead (NFR-006)', async () => {
  const fake = makeFakeClock();
  const gate = new DelayGate(fake.clock);
  // 多次 0 延迟分发：无等待、无记录
  for (let i = 0; i < 5; i += 1) await runCommand(gate, 0, fake, 1);
  assert.deepEqual(fake.waits, []);
  assert.deepEqual(gate.stats, { waitCount: 0, waitedMs: 0 });
});
