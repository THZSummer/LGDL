/**
 * V5.5-3 **TASK-V55-311** (ADR-V55-010 §1/§2/§4 · FR-SELF-061/106 · AC-SELF-014 · X-SELF-7 ·
 * `SG-V55-04` = **可得** · R-V55-106/107) — the **turn-arbitration gate**.
 *
 * ── What it judges ───────────────────────────────────────────────────────────
 *
 *   ① **闭集 4 项**：`executed` / `queued` / `busy-rejected` / `ai-deferred` —— 出现第五种
 *      结果即 FAIL；
 *   ② **队列硬上限 1（单源）**：`TURN_QUEUE_MAX` 恰一处声明；队列长度**恒 ≤ 1**；溢出 =
 *      `busy-rejected`（**不是**无界排队，**不是**静默丢弃）；
 *   ③ **用户输入零丢失三路径**：非在飞 `executed` / 在飞且有余量 `queued` / 在飞且已满
 *      `busy-rejected`（面板侧 `#input` 回填 —— 删掉回填 ⇒ FAIL）；
 *   ④ **AI 撞车不发起**：AI 路径 `pressDecision(… busy: true …)` ⇒ `blocked:busy`（不排队、
 *      只让位 + 留痕）；
 *   ⑤ **type-only**：仲裁词表**不进** `KIND_SET`（共享 `KIND_SET` 仍恰 40 项）；
 *   ⑥ **SW/panel 分工**：队列本体落 `background/`（零 sidepanel 字节）。
 *
 * 每条判据都有 `expectFailPattern`（gate-integrity 的 node 门禁发现标记），且注入反证
 * **在文件内实跑**（模仿 `test/op-wiring.test.ts` 的 node-gate 先例）。
 *
 * @module test/turn-arbitration
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { ARBITRATION_RESULTS } from '../src/background/chat-events.js';
import { classifyChatRequest, createTurnQueue, TURN_QUEUE_MAX } from '../src/background/turn-queue.js';
import { pressDecision } from '../src/ui/sidepanel/next-registry/ai-drive.js';

const PKG = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel: string): string => readFileSync(join(PKG, rel), 'utf8');

const SW = read('src/background/service-worker.ts');
const PANEL = read('src/ui/sidepanel/sidepanel.ts');
const MESSAGING = read('src/background/messaging.ts');
const QUEUE = read('src/background/turn-queue.ts');

export interface ArbitrationJudgement {
  readonly id: string;
  readonly expectFailPattern: string;
}
export const JUDGEMENTS: readonly ArbitrationJudgement[] = [
  { id: 'TA-1-closure-4', expectFailPattern: '仲裁结果必须是 4 项闭集（第五种结果即红）' },
  { id: 'TA-2-bounded-queue', expectFailPattern: '队列硬上限必须恰 1（单源，无界即红）' },
  { id: 'TA-3-zero-loss-3-paths', expectFailPattern: '用户输入零丢失三路径必须齐备（静默吞掉即红）' },
  { id: 'TA-4-draft-restore', expectFailPattern: '拒绝后草稿必须回填 #input（删掉回填即红）' },
  { id: 'TA-5-ai-defers', expectFailPattern: 'AI 撞车必须不发起（blocked:busy + 留痕）' },
  { id: 'TA-6-type-only', expectFailPattern: '仲裁词表必须 type-only（进 KIND_SET 即红）' },
  { id: 'TA-7-sw-no-panel-bytes', expectFailPattern: '队列本体必须落 background（不得被 src/ui 引入）' },
  // ★ IAN-1 R2（TASK-IAN-119 · FR-IAN-033 · ADR-IAN-003 §2）：叶1 **双载体并存** ——
  // 既有 `#input` 回填之上加**流内**卡内输入回填（同一「仅当为空」语义 ∧ 卡收起重展开 ∧ 按需铸造）。
  { id: 'TA-8-stream-draft-restore', expectFailPattern: '拒绝后草稿必须可回填**流内**输入（仅当为空 / 卡收起重展开 / 卡不存在按需铸造；删掉即红）' },
];

/** ③ 面板侧四句留痕 / 回填 + ★ IAN-1 R2 **双载体**（流外 `#input` ∧ 流内卡内输入）的**源码事实**。 */
export function panelRestoreProblems(panelSource: string): string[] {
  const problems: string[] = [];
  if (!/'busy-rejected'/.test(panelSource)) problems.push(`${JUDGEMENTS[3].expectFailPattern}：缺少 busy-rejected 分支`);
  if (!/draftInput\.value\s*=\s*rejected/.test(panelSource)) {
    problems.push(`${JUDGEMENTS[3].expectFailPattern}：缺少 #input 回填写点（draftInput.value = rejected）`);
  }
  if (!/draftInput\.value\.length\s*===\s*0/.test(panelSource)) {
    problems.push(`${JUDGEMENTS[3].expectFailPattern}：回填必须仅在输入框为空时（不覆盖用户新输入）`);
  }
  if (!/'queued'/.test(panelSource)) problems.push(`${JUDGEMENTS[3].expectFailPattern}：缺少 queued 可读留痕分支`);
  // ★ IAN-1 R2：**流内载体**逐条可判（判据只增，不改既有四项）。判据切片限定在该函数体内
  // （`openFreeInputCard` 里也有一次 `setCardFallbackOpen(form, true)` ⇒ 全源搜索会空转）。
  if (!/function restoreFreeInputDraft\(/.test(panelSource)) {
    problems.push(`${JUDGEMENTS[7].expectFailPattern}：缺少流内回填载体（restoreFreeInputDraft）`);
  }
  if (!/restoreFreeInputDraft\(rejected\)/.test(panelSource)) {
    problems.push(`${JUDGEMENTS[7].expectFailPattern}：流内回填必须真的接线（restoreFreeInputDraft(rejected)）`);
  }
  const restoreBody = /function restoreFreeInputDraft\(rejected: string\): boolean \{([\s\S]*?)\n\}/.exec(panelSource)?.[1] ?? '';
  if (restoreBody.length === 0) {
    problems.push(`${JUDGEMENTS[7].expectFailPattern}：流内回填体必须可定位（否则判据空转）`);
  } else {
    if (!/input\.value\.length\s*>\s*0\s*\)\s*return false/.test(restoreBody)) {
      problems.push(`${JUDGEMENTS[7].expectFailPattern}：流内回填必须仅在卡内输入为空时（不覆盖用户新输入）`);
    }
    if (!/setCardFallbackOpen\(form,\s*true\)/.test(restoreBody)) {
      problems.push(`${JUDGEMENTS[7].expectFailPattern}：卡收起必须重展开（setCardFallbackOpen(form, true)）`);
    }
    if (!/openFreeInputCard\(\)/.test(restoreBody)) {
      problems.push(`${JUDGEMENTS[7].expectFailPattern}：卡不存在必须按需铸造（openFreeInputCard）`);
    }
    if (!/input\.value\s*=\s*rejected/.test(restoreBody)) {
      problems.push(`${JUDGEMENTS[7].expectFailPattern}：卡内输入必须真的写回被拒原话`);
    }
  }
  return problems;
}

/** ⑤ `KIND_SET` 项数（从 `messaging.ts` 源文本抽取；不得空转）。 */
export function kindSetMembers(source: string): string[] {
  const block = /const KIND_SET[^=]*=\s*new Set<[^>]*>\(\[([\s\S]*?)\]\)/.exec(source);
  if (!block) return [];
  return (block[1].match(/'[^']+'/g) ?? []).map((s) => s.slice(1, -1));
}

/** ⑥ `turn-queue.ts` 不得被任何 `src/ui/**` 模块引入（SW bundle 才是落点）。 */
export function crossBundleProblems(files: readonly { readonly path: string; readonly text: string }[]): string[] {
  return files
    .filter((f) => f.path.startsWith('src/ui/') && /from\s+'[^']*turn-queue\.js'/.test(f.text))
    .map((f) => `${JUDGEMENTS[6].expectFailPattern}：${f.path} 引入了 background/turn-queue`);
}

test('TA ①: 仲裁闭集恰 4 项（executed / queued / busy-rejected / ai-deferred）', () => {
  const expected = ['executed', 'queued', 'busy-rejected', 'ai-deferred'];
  assert.deepEqual([...ARBITRATION_RESULTS], expected, JUDGEMENTS[0].expectFailPattern);
  // 穷举：把 5 个输入面全部走一遍，结果必落在闭集内（判据非恒真）。
  const seen = new Set<string>();
  for (const busy of [false, true]) {
    for (let len = 0; len <= 2; len += 1) seen.add(classifyChatRequest(busy, len));
  }
  for (const r of seen) assert.ok(expected.includes(r), `${JUDGEMENTS[0].expectFailPattern}：出现 ${r}`);
});

test('TA ②: 队列硬上限恰 1（单源）+ 溢出 = 明确拒绝（非无界）', () => {
  assert.equal(TURN_QUEUE_MAX, 1, JUDGEMENTS[1].expectFailPattern);
  // 单源：常量**恰一处**声明（`test/**` 不算源码面）。
  const decls = (read('src/background/turn-queue.ts').match(/export const TURN_QUEUE_MAX\s*=/g) ?? []).length;
  assert.equal(decls, 1, `${JUDGEMENTS[1].expectFailPattern}：TURN_QUEUE_MAX 声明 ${decls} 处`);
  assert.equal((SW.match(/const\s+TURN_QUEUE_MAX\s*=/g) ?? []).length, 0, 'SW 不得再声明第二份上限常量');

  const q = createTurnQueue();
  assert.equal(q.enqueue({ user: 'a', sessionId: null, at: 1 }), 'queued');
  assert.equal(q.size(), 1, '入队后长度 1');
  assert.equal(q.enqueue({ user: 'b', sessionId: null, at: 2 }), 'busy-rejected', '溢出必须明确拒绝');
  assert.equal(q.size(), 1, JUDGEMENTS[1].expectFailPattern);
  // 溢出**不吞掉**已在队首的那条（被拒的是 b；drain 出来的是 a）。
  assert.equal(q.drain()?.user, 'a', 'FIFO：drain 取出的是先入队的 a');
  assert.equal(q.drain(), undefined, 'drain 后为空');
});

test('TA ③: 用户输入零丢失三路径（executed / queued / busy-rejected）逐条断言', () => {
  assert.equal(classifyChatRequest(false, 0), 'executed', '非在飞 ⇒ 立即执行');
  assert.equal(classifyChatRequest(true, 0), 'queued', '在飞 ∧ 有余量 ⇒ 排队（不丢）');
  assert.equal(classifyChatRequest(true, 1), 'busy-rejected', '在飞 ∧ 已满 ⇒ 明确拒绝（不丢）');
  // 源码面：SW 三路径确实接线（queued / busy-rejected 两个 payload 变体都发出）。
  assert.match(SW, /variant:\s*'queued'/, JUDGEMENTS[2].expectFailPattern);
  assert.match(SW, /variant:\s*'busy-rejected'/, JUDGEMENTS[2].expectFailPattern);
  assert.deepEqual(panelRestoreProblems(PANEL), [], JUDGEMENTS[3].expectFailPattern);
});

test('TA ③/④ 反证：删掉回填 ⇒ 必红；队列改无界 ⇒ 必红 → 还原 PASS', () => {
  // 反证一：面板删掉回填写点。
  const noRestore = PANEL.replace('if (restoredInput) draftInput.value = rejected;', '');
  assert.notEqual(noRestore, PANEL, '前置：注入锚点必须存在');
  assert.ok(panelRestoreProblems(noRestore).length > 0, JUDGEMENTS[3].expectFailPattern);
  assert.deepEqual(panelRestoreProblems(PANEL), [], '还原 ⇒ PASS');
  // 反证二：把上限改成 2（无界 / 放宽）⇒ 溢出不再被拒。
  const unbounded = createTurnQueue(2);
  unbounded.enqueue({ user: 'a', sessionId: null, at: 1 });
  assert.equal(unbounded.enqueue({ user: 'b', sessionId: null, at: 2 }), 'queued', '对照：上限 2 ⇒ 第二条被接纳（说明上限真的承重）');
  assert.equal(unbounded.size(), 2, '对照实现长度 2');
  // 真判据：上限 1 ⇒ 第二条必拒。
  const bounded = createTurnQueue();
  bounded.enqueue({ user: 'a', sessionId: null, at: 1 });
  assert.equal(bounded.enqueue({ user: 'b', sessionId: null, at: 2 }), 'busy-rejected', JUDGEMENTS[1].expectFailPattern);
});

test('TA ④/⑧: 双载体回填（流外 #input ∧ 流内卡内输入）可判 + 三条反证 → 还原 PASS', () => {
  assert.equal(JUDGEMENTS.length, 8, 'TA 判据下界只增（本叶 +TA-8 = 8）');
  assert.deepEqual(panelRestoreProblems(PANEL), [], `${JUDGEMENTS[7].expectFailPattern}`);
  // 反证一：删掉流内回填的**接线**（调用点保留函数定义 ⇒ 只有调用点判据能抓）⇒ 必红。
  const noCard = PANEL.replace('const restoredCard = restoreFreeInputDraft(rejected);', 'const restoredCard = false;');
  assert.notEqual(noCard, PANEL, '前置：流内接线注入锚点必须存在');
  assert.ok(
    panelRestoreProblems(noCard).some((p) => p.includes(JUDGEMENTS[7].expectFailPattern)),
    `${JUDGEMENTS[7].expectFailPattern}：删流内接线 ⇒ 必红`,
  );
  // 反证二：流内回填改成**无条件覆盖**（去掉「仅当为空」守卫）⇒ 必红（复现「回填覆盖非空」）。
  const overwrite = PANEL.replace('if (input.value.length > 0) return false;', 'void 0;');
  assert.notEqual(overwrite, PANEL, '前置：不覆盖守卫锚点必须存在');
  assert.ok(
    panelRestoreProblems(overwrite).some((p) => p.includes(JUDGEMENTS[7].expectFailPattern)),
    `${JUDGEMENTS[7].expectFailPattern}：回填覆盖非空 ⇒ 必红`,
  );
  // 反证三：删流内「卡收起重展开」⇒ 必红（锚点用紧随其后的注释行唯一定位，**不误伤**
  // `openFreeInputCard` 里的同名调用）。
  const noReopen = PANEL.replace('  setCardFallbackOpen(form, true);\n  // 作用域限定', '  void 0;\n  // 作用域限定');
  assert.notEqual(noReopen, PANEL, '前置：重展开注入锚点必须存在');
  assert.ok(
    panelRestoreProblems(noReopen).some((p) => p.includes(JUDGEMENTS[7].expectFailPattern)),
    `${JUDGEMENTS[7].expectFailPattern}：卡收起不重展开 ⇒ 必红`,
  );
  // 反证四：删掉流外 `#input` 回填（既有判据）⇒ 仍必红（两载体各自承重，不互相掩盖）。
  const noInput = PANEL.replace('if (restoredInput) draftInput.value = rejected;', '');
  assert.notEqual(noInput, PANEL, '前置：流外注入锚点必须存在');
  assert.ok(
    panelRestoreProblems(noInput).some((p) => p.includes(JUDGEMENTS[3].expectFailPattern)),
    `${JUDGEMENTS[3].expectFailPattern}：删流外回填 ⇒ 必红`,
  );
  // 还原 ⇒ 全绿（判据不是恒真）。
  assert.deepEqual(panelRestoreProblems(PANEL), []);
});

test('TA ④: AI 撞车不发起（blocked:busy）+ 面板把 pending 作为 busy 注入', () => {
  const base = { actor: 'ai' as const, driverId: 'ref-action', driverClass: 'ai-driven' as const, configured: true, armed: true };
  assert.deepEqual(pressDecision('op.turn', { ...base, busy: true }), { ok: false, blocked: 'busy' }, JUDGEMENTS[4].expectFailPattern);
  assert.deepEqual(pressDecision('op.turn', base), { ok: true }, '对照：非在飞 ⇒ 放行（判据非恒真）');
  // 源码面：面板把在飞状态作为 busy 注入（AI 撞车走同一判据，零第二阈值）。
  assert.match(PANEL, /busy:\s*state\.pending/, `${JUDGEMENTS[4].expectFailPattern}：busy 必须由面板在飞状态注入`);
  // 留痕点在单源模块 `ai-drive.ts`（面板只消费），`blocked=` 必须真的写进可读行。
  assert.match(read('src/ui/sidepanel/next-registry/ai-drive.ts'), /blocked=\$\{decided\.blocked\}/, 'AI 被拒必须留痕（blocked=… 行）');
});

test('TA ⑤/⑥: 仲裁词表 type-only（KIND_SET 仍恰 40）+ 队列落 background（零 sidepanel 字节）', () => {
  const members = kindSetMembers(MESSAGING);
  assert.equal(members.length, 40, `${JUDGEMENTS[5].expectFailPattern}：KIND_SET 实测 ${members.length} 项（应恰 40）`);
  for (const word of ARBITRATION_RESULTS) {
    assert.equal(members.includes(word), false, `${JUDGEMENTS[5].expectFailPattern}：${word} 进了 KIND_SET`);
  }
  assert.ok(members.includes('chat'), '对照：KIND_SET 必须仍含既有 kind（判据非恒真）');
  // ⑤ 反证：把 queued 塞进 KIND_SET 源码 ⇒ 抽出的成员数变 41（判据真的读源）。
  const forged = MESSAGING.replace("  'chat',", "  'chat',\n  'queued',");
  assert.notEqual(forged, MESSAGING, '前置：注入锚点必须存在');
  assert.equal(kindSetMembers(forged).length, 41, `${JUDGEMENTS[5].expectFailPattern}：注入后应 41`);
  // ⑥ 跨 bundle：队列模块不得被任何 src/ui 引入。
  assert.deepEqual(
    crossBundleProblems([{ path: 'src/ui/sidepanel/sidepanel.ts', text: PANEL }, { path: 'src/background/service-worker.ts', text: SW }]),
    [],
    JUDGEMENTS[6].expectFailPattern,
  );
  const forgedCross = crossBundleProblems([{ path: 'src/ui/sidepanel/sidepanel.ts', text: `${PANEL}\nimport { createTurnQueue } from '../../background/turn-queue.js';\n` }]);
  assert.ok(forgedCross.length > 0, `${JUDGEMENTS[6].expectFailPattern}：注入 import 必红`);
  // ⑥ 队列本体在 background（源码事实，非注释）。
  assert.match(QUEUE, /export const TURN_QUEUE_MAX\s*=\s*1/, '常量单源在 background/turn-queue.ts');
});
