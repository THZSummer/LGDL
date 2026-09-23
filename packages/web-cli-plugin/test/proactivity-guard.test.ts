/**
 * V5.5-3 **TASK-V55-315** (ADR-V55-009 §1/§4/§5/§6 · FR-SELF-090~097 · AC-SELF-006 ·
 * R-SELF-004/907 · R-V55-109 · N-SELF-026) — the **proactivity-guard gate**.
 *
 * ── What it judges ───────────────────────────────────────────────────────────
 *
 *   ① **六常量 + 窗口 + 默认值各恰一处**声明（源文本抽取）；散落字面量零命中；冷却
 *      **re-export** 既有 10 s（`guard.ts` 内**零第二份** `10_000`）；
 *   ② **越限真抑制**（不是「只写不判」）：频次 / 同因 / 静默 / 冷却 / 链深 / 预算逐条
 *      注入 ⇒ `allowed:false` + 对应 reason；还原 ⇒ PASS；
 *   ③ **关断**：`setEnabled(false)` ⇒ AI 主动零发起（`disabled`），而**主题① 仍工作**
 *      （`verdict('deterministic')` 恒放行）；关断**可逆**；
 *   ④ **载体零新增**：12 kind（7 主类 + 5 过程卡）逐字 / `REGISTERED_STRUCTURAL_HOSTS === []`
 *      / `KIND_SET` 40 逐字；
 *   ⑤ **未落地二态**（N-SELF-026）：本文件逐项断言「已落地（判据 + 反证）」。
 *
 * 每条判据都有 `expectFailPattern`（gate-integrity 的 node 门禁发现标记）。
 *
 * @module test/proactivity-guard
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { NEXTSTEP_MIN_INTERVAL_MS } from '../src/ui/sidepanel/recommend.js';
import {
  AI_CHAIN_DEPTH_MAX,
  AI_PROACTIVE_COOLDOWN_MS,
  AI_PROACTIVE_ENABLED_DEFAULT,
  AI_PROACTIVE_MAX_PER_WINDOW,
  AI_PROACTIVE_PREF_KEY,
  AI_PROACTIVE_SILENCE_MS,
  AI_PROACTIVE_WINDOW_MS,
  AI_TURN_BUDGET_PER_SESSION,
  createProactivityGuard,
} from '../src/ui/sidepanel/next-registry/guard.js';
import { REGISTERED_STRUCTURAL_HOSTS } from '../src/ui/sidepanel/host-registry.js';
import { PRIMARY_CARD_TYPES, PROCESS_CARD_TYPES } from '../src/ui/sidepanel/stream-model.js';

const PKG = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel: string): string => readFileSync(join(PKG, rel), 'utf8');

export interface GuardJudgement {
  readonly id: string;
  readonly expectFailPattern: string;
}
export const JUDGEMENTS: readonly GuardJudgement[] = [
  { id: 'PG-1-six-constants-single-source', expectFailPattern: '护栏常量必须各恰一处声明（散落第二份即红）' },
  { id: 'PG-2-frequency-suppressed', expectFailPattern: '越限频次必须真抑制（第 7 次即红）' },
  { id: 'PG-3-same-cause-silence-cooldown', expectFailPattern: '同因 / 静默 / 冷却必须真抑制' },
  { id: 'PG-4-chain-depth-truncation', expectFailPattern: '链深达上限必须截断（第 3 次自动发起即红）' },
  { id: 'PG-5-budget-non-dead-end', expectFailPattern: '预算耗尽必须停发且非死端（第 9 个主动回合即红）' },
  { id: 'PG-6-killswitch', expectFailPattern: '关断后 AI 主动零发起且主题① 仍工作' },
  { id: 'PG-7-zero-new-carrier', expectFailPattern: '载体零新增（12 kind / 零宿主 / KIND_SET 40）' },
];

/** 去掉块注释 / 行注释（单源扫描只判**代码面**，注释里的举例不算第二份声明）。 */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/** 全部 `src/**\/*.ts`（相对包根）—— 单源扫描的真实面。 */
function sourceFiles(): { readonly path: string; readonly text: string }[] {
  const out: { path: string; text: string }[] = [];
  const walk = (rel: string): void => {
    for (const entry of readdirSync(join(PKG, rel), { withFileTypes: true })) {
      const child = `${rel}/${entry.name}`;
      if (entry.isDirectory()) walk(child);
      else if (entry.name.endsWith('.ts')) out.push({ path: child, text: stripComments(read(child)) });
    }
  };
  walk('src');
  return out;
}
const SRC = sourceFiles();

/** 常量声明处数（`export const NAME =`；默认值 `AI_PROACTIVE_ENABLED_DEFAULT`）。 */
export function declarationCount(files: readonly { readonly text: string }[], name: string): number {
  const re = new RegExp(`export\\s+const\\s+${name}\\s*=`, 'g');
  return files.reduce((n, f) => n + (f.text.match(re) ?? []).length, 0);
}

/** 数字字面量在源码面上的出现处数（含 `600_000` / `10_000` 形状；用于散落扫描）。 */
export function literalCount(files: readonly { readonly path: string; readonly text: string }[], literal: string, onlyPath?: string): number {
  return files
    .filter((f) => (onlyPath ? f.path === onlyPath : true))
    .reduce((n, f) => n + (f.text.split(literal).length - 1), 0);
}

/** ⑤ `KIND_SET` 项数（从源文本抽取）。 */
export function kindSetMembers(source: string): string[] {
  const block = /const KIND_SET[^=]*=\s*new Set<[^>]*>\(\[([\s\S]*?)\]\)/.exec(source);
  return block ? (block[1].match(/'[^']+'/g) ?? []).map((s) => s.slice(1, -1)) : [];
}

test('PG ①: 六常量 + 窗口 + 默认值各恰一处声明；散落零命中；冷却 re-export', () => {
  for (const name of [
    'AI_PROACTIVE_MAX_PER_WINDOW',
    'AI_PROACTIVE_WINDOW_MS',
    'AI_PROACTIVE_SILENCE_MS',
    'AI_CHAIN_DEPTH_MAX',
    'AI_TURN_BUDGET_PER_SESSION',
    'AI_PROACTIVE_ENABLED_DEFAULT',
  ]) {
    assert.equal(declarationCount(SRC, name), 1, `${JUDGEMENTS[0].expectFailPattern}：${name} 声明 ${declarationCount(SRC, name)} 处`);
  }
  // 冷却 = re-export 既有 10 s：常量名恰一处，且 guard 源内**零** 10_000 字面量。
  assert.equal(declarationCount(SRC, 'AI_PROACTIVE_COOLDOWN_MS'), 1, JUDGEMENTS[0].expectFailPattern);
  assert.equal(AI_PROACTIVE_COOLDOWN_MS, NEXTSTEP_MIN_INTERVAL_MS, '冷却必须与既有防抖同源');
  assert.equal(AI_PROACTIVE_COOLDOWN_MS, 10_000);
  assert.equal(literalCount(SRC, '10_000', 'src/ui/sidepanel/next-registry/guard.ts'), 0, `${JUDGEMENTS[0].expectFailPattern}：guard.ts 不得写第二份 10_000`);
  assert.match(read('src/ui/sidepanel/next-registry/guard.ts'), /NEXTSTEP_MIN_INTERVAL_MS/, '必须 re-export 而非重声明');
  // 散落扫描：10 min 窗口字面量在**源码面**上恰一处（guard.ts）；60 s 静默在 guard.ts 内
  // 恰一处（`60_000` 在别处有无关用途 —— `SYSTEM_RATE_WINDOW_MS` / `TEST_CACHE_TTL_MS`，
  // 不能拿数值本身当判据，所以按「模块内恰一处 + 常量名恰一处」判）。
  assert.equal(literalCount(SRC, '600_000'), 1, `${JUDGEMENTS[0].expectFailPattern}：600_000 恰一处`);
  assert.equal(literalCount(SRC, '60_000', 'src/ui/sidepanel/next-registry/guard.ts'), 1, `${JUDGEMENTS[0].expectFailPattern}：guard.ts 内 60_000 恰一处`);
  // 反证：在别处写第二份 ⇒ 计数必红。
  const forged = [...SRC, { path: 'src/ui/sidepanel/forged.ts', text: 'export const AI_CHAIN_DEPTH_MAX = 9;' }];
  assert.equal(declarationCount(forged, 'AI_CHAIN_DEPTH_MAX'), 2, `${JUDGEMENTS[0].expectFailPattern}：注入第二份应计数为 2`);
});

test('PG ②: 频次越限真抑制（滚动窗 6 / 10min ⇒ 第 7 次红）', () => {
  assert.equal(AI_PROACTIVE_MAX_PER_WINDOW, 6);
  assert.equal(AI_PROACTIVE_WINDOW_MS, 600_000);
  let t = 1_000;
  const g = createProactivityGuard(() => t);
  for (let i = 0; i < AI_PROACTIVE_MAX_PER_WINDOW; i += 1) {
    assert.deepEqual(g.verdict('ai', `cause-${i}`), { allowed: true }, `第 ${i + 1} 次应放行`);
    g.noteProactive(`cause-${i}`, t);
    g.noteUserInteraction(); // 用户交互：重置链深（隔离频次判据）
    t += AI_PROACTIVE_COOLDOWN_MS;
  }
  assert.deepEqual(g.verdict('ai', 'cause-7'), { allowed: false, reason: 'frequency' }, JUDGEMENTS[1].expectFailPattern);
  // 反证：窗口滚动后恢复放行（判据非恒真）。
  t += AI_PROACTIVE_WINDOW_MS;
  assert.deepEqual(g.verdict('ai', 'cause-8'), { allowed: true }, '窗口滚动后应恢复');
});

test('PG ③: 同因不重复 / 静默期 / 冷却 逐条真抑制', () => {
  // 同因：同 cause 第二次 ⇒ same-cause（链深 / 冷却都已让路）。
  {
    let t = 1_000;
    const g = createProactivityGuard(() => t);
    g.noteProactive('same', t);
    t += AI_PROACTIVE_COOLDOWN_MS;
    assert.deepEqual(g.verdict('ai', 'same'), { allowed: false, reason: 'same-cause' }, JUDGEMENTS[2].expectFailPattern);
    assert.deepEqual(g.verdict('ai', 'other'), { allowed: true }, '对照：不同因仍可（判据非恒真）');
  }
  // 静默：用户手输后 60 s 内不主动。
  {
    let t = 1_000;
    const g = createProactivityGuard(() => t);
    g.noteUserTurn(t);
    assert.deepEqual(g.verdict('ai', 'x'), { allowed: false, reason: 'silence' }, JUDGEMENTS[2].expectFailPattern);
    t += AI_PROACTIVE_SILENCE_MS;
    assert.deepEqual(g.verdict('ai', 'x'), { allowed: true }, '静默期过后恢复');
  }
  // 冷却：两次自动发起间隔 < 10 s ⇒ cooldown。
  {
    let t = 1_000;
    const g = createProactivityGuard(() => t);
    g.noteProactive('a', t);
    t += AI_PROACTIVE_COOLDOWN_MS - 1;
    assert.deepEqual(g.verdict('ai', 'b'), { allowed: false, reason: 'cooldown' }, JUDGEMENTS[2].expectFailPattern);
    t += 1;
    assert.deepEqual(g.verdict('ai', 'b'), { allowed: true }, '冷却期满恢复');
  }
});

test('PG ④: 链深达上限截断（连续 2 次后第 3 次红；用户交互重置）', () => {
  assert.equal(AI_CHAIN_DEPTH_MAX, 2);
  let t = 1_000;
  const g = createProactivityGuard(() => t);
  // 连续两次自动发起（无用户交互）。
  for (let i = 0; i < AI_CHAIN_DEPTH_MAX; i += 1) {
    assert.deepEqual(g.verdict('ai', `c${i}`), { allowed: true }, `链内第 ${i + 1} 次应放行`);
    g.noteProactive(`c${i}`, t);
    t += AI_PROACTIVE_COOLDOWN_MS;
  }
  assert.deepEqual(g.verdict('ai', 'c3'), { allowed: false, reason: 'chain-depth' }, JUDGEMENTS[3].expectFailPattern);
  // 用户交互 ⇒ 链断开 ⇒ 恢复（「达界转用户手势」的可逆形态）。
  g.noteUserInteraction();
  assert.deepEqual(g.verdict('ai', 'c4'), { allowed: true }, '用户交互后链深重置');
});

test('PG ⑤: 回合预算耗尽停发（第 9 个主动回合红）；非死端（确定性面仍放行）', () => {
  assert.equal(AI_TURN_BUDGET_PER_SESSION, 8);
  let t = 1_000;
  const g = createProactivityGuard(() => t);
  for (let i = 0; i < AI_TURN_BUDGET_PER_SESSION; i += 1) {
    assert.deepEqual(g.verdict('ai', `b${i}`), { allowed: true }, `预算内第 ${i + 1} 个应放行`);
    g.noteProactive(`b${i}`, t);
    g.noteUserInteraction();
    t += AI_PROACTIVE_COOLDOWN_MS;
    if ((i + 1) % AI_PROACTIVE_MAX_PER_WINDOW === 0) t += AI_PROACTIVE_WINDOW_MS; // 让频次窗滚动
  }
  assert.deepEqual(g.verdict('ai', 'b9'), { allowed: false, reason: 'budget' }, JUDGEMENTS[4].expectFailPattern);
  // 非死端：预算耗尽只挡 AI 主动；确定性面（主题①）仍放行 ⇒ 可达 next 不被阻断。
  assert.deepEqual(g.verdict('deterministic'), { allowed: true }, JUDGEMENTS[4].expectFailPattern);
});

test('PG ⑥: 关断后 AI 主动零发起 + 主题① 仍工作 + 可逆', () => {
  const g = createProactivityGuard(() => 1_000);
  assert.equal(AI_PROACTIVE_ENABLED_DEFAULT, true, '默认值必须显式登记（ON）');
  assert.equal(g.enabled(), true, '默认 ON 与文书同源');
  g.setEnabled(false);
  assert.deepEqual(g.verdict('ai', 'x'), { allowed: false, reason: 'disabled' }, JUDGEMENTS[5].expectFailPattern);
  // 主题① 不受总开关控制（零 token / 确定性；FR-SELF-069 显式裁决）。
  assert.deepEqual(g.verdict('deterministic'), { allowed: true }, '主题① 不受 AI 开关控制');
  g.setEnabled(true);
  assert.deepEqual(g.verdict('ai', 'x'), { allowed: true }, '关断可逆（NFR-SELF-010）');
});

test('PG ⑦: 载体零新增（12 kind / 零宿主 / KIND_SET 40 逐字）+ 偏好键独立', () => {
  assert.equal(PRIMARY_CARD_TYPES.length, 7, JUDGEMENTS[6].expectFailPattern);
  assert.equal(PROCESS_CARD_TYPES.length, 5, JUDGEMENTS[6].expectFailPattern);
  assert.equal(PRIMARY_CARD_TYPES.length + PROCESS_CARD_TYPES.length, 12, JUDGEMENTS[6].expectFailPattern);
  assert.deepEqual([...PROCESS_CARD_TYPES], ['tool', 'command', 'thinking', 'error', 'notice'], '过程卡逐字');
  assert.deepEqual([...REGISTERED_STRUCTURAL_HOSTS], [], '流内固定宿主必须仍为空');
  const members = kindSetMembers(read('src/background/messaging.ts'));
  assert.equal(members.length, 40, `${JUDGEMENTS[6].expectFailPattern}：KIND_SET 实测 ${members.length} 项`);
  // 反证：注入第 13 个 kind / 第 41 个 KIND_SET 项 ⇒ 必红。
  assert.equal(kindSetMembers(read('src/background/messaging.ts').replace("  'chat',", "  'chat',\n  'ghost',")).length, 41, '注入反证');
  // 关断偏好键独立（不得与 LLM Key 混键，ADR-V55-009 后果）。
  assert.notEqual(AI_PROACTIVE_PREF_KEY, 'web-cli:llm');
  assert.equal(/api[_-]?key|secret/i.test(AI_PROACTIVE_PREF_KEY), false, '偏好键内不得出现 apiKey 形状');
});
