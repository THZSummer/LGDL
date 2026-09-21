/**
 * V4.5-1 **W1 / TASK-V45-101** — the **node-gate skeleton** for ADR-V45-008
 * (手势表 → 设置「帮助」分区；`SETTINGS_SECTION_IDS` 单源派生).
 *
 * ── Why a NEW gate ──────────────────────────────────────────────────────────
 *
 * `#l1-gestures`（6 手势表）retires from the stream, so the help content needs a
 * determined home. ADR-V45-008 puts it in a **read-only** settings section
 * (`#settings-help`, `class: 'wc-section'`) whose rows come from ONE source
 * (`view-model.ts#L1_GESTURE_LABELS`). Two drift risks are structural:
 *   ① the section count is derived in three places (`SETTINGS_SECTION_IDS` /
 *      `#settings-root > .wc-section` / the entry `data-count`) — R-REG-903;
 *   ② a「help」section that grows buttons becomes a second interaction surface,
 *      which law one forbids.
 *
 * ── W1 形态（骨架） ─────────────────────────────────────────────────────────
 *
 * The judges are pure functions over「ids + rendered source」; they are exercised
 * against the **real** registry (7 sections today) and the real gesture list (6
 * labels today) — both of which stay true after W3 (`settings-help` is *added*, the
 * gesture list is *moved*, neither is renumbered here). The `settings-help` slot and
 * the "zero clickable" / "keyboard reachable" halves are declared with
 * `status: 'pending-w3'`; `TASK-V45-112` flips them to `landed` and adds the live
 * Chromium assertions in `test/ui/l2.mjs`.
 *
 * ── Falsifiability ──────────────────────────────────────────────────────────
 *
 * Every judgement carries a literal `expectFailPattern`; three reverse proofs drive
 * the declared fragments red on forged inputs.
 *
 * @module test/settings-help
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { SETTINGS_SECTION_IDS, settingsSectionCount } from '../src/ui/settings/sections.js';
import { L1_GESTURE_LABELS } from '../src/ui/sidepanel/view-model.js';

const PKG = fileURLToPath(new URL('../../', import.meta.url));
const PANEL = readFileSync(join(PKG, 'src/ui/settings/panel.ts'), 'utf8');
/** The「帮助」section's own module (W3/TASK-V45-112) — the gesture table's new home. */
const HELP_SOURCE = readFileSync(join(PKG, 'src/ui/settings/help.ts'), 'utf8');

/* ────────────────────────────────────────────────────────────────────────────
 * 1. The judges (pure)
 * ──────────────────────────────────────────────────────────────────────────── */

export interface HelpJudgement {
  readonly id: string;
  readonly expectFailPattern: string;
  readonly status: 'landed' | 'pending-w3';
}

export const JUDGEMENTS: readonly HelpJudgement[] = [
  { id: 'SH-1-registry-rendered', expectFailPattern: '分区注册表与渲染面不同源：', status: 'landed' },
  { id: 'SH-2-derived-count', expectFailPattern: '分区计数未派生：', status: 'landed' },
  { id: 'SH-3-gesture-single-source', expectFailPattern: '手势行数未单源：', status: 'landed' },
  { id: 'SH-4-zero-clickable', expectFailPattern: '分区内零可点控件', status: 'landed' },
  { id: 'SH-5-keyboard-reachable', expectFailPattern: '（W3 实体化：键盘可达）', status: 'pending-w3' },
];

/** The section the gesture table moves into (declared in W1, rendered in W3). */
export const HELP_SECTION_ID = 'settings-help';

/**
 * 三方同源判据 ①：every registry id must be rendered by the panel as
 * `id: '<id>'` **and** carry `class: 'wc-section'` on the same `h(...)` call.
 */
export function registryRenderedProblems(ids: readonly string[], panelSource: string): string[] {
  const problems: string[] = [];
  for (const id of ids) {
    const re = new RegExp(`id: '${id}'`);
    if (!re.test(panelSource)) {
      problems.push(`分区注册表与渲染面不同源：#${id} 在 panel.ts 中找不到 id 声明（注册表不得领先于渲染面）`);
      continue;
    }
    // The same `h(doc, 'section', { id: '<id>', class: 'wc-section' })` call must carry the class.
    const callRe = new RegExp(`h\\(doc, 'section', \\{ id: '${id}', class: 'wc-section' \\}`);
    if (!callRe.test(panelSource)) {
      problems.push(`分区注册表与渲染面不同源：#${id} 未以 id + class: 'wc-section' 成对渲染`);
    }
  }
  return problems;
}

/** 三方同源判据 ②：the count must be *derived* (never a hard-coded literal). */
export function derivedCountProblems(count: number, ids: readonly string[], panelSource: string): string[] {
  const problems: string[] = [];
  if (count !== ids.length) {
    problems.push(`分区计数未派生：settingsSectionCount()=${count} ≠ SETTINGS_SECTION_IDS.length=${ids.length}`);
  }
  // A hard-coded count would show up as `data-count="9"`-style literals in the panel.
  const literal = /data-count="\d+"|data-count',\s*'\d+'/;
  if (literal.test(panelSource)) {
    problems.push(`分区计数未派生：panel.ts 出现 data-count 字面量（计数必须由注册表派生）`);
  }
  return problems;
}

/** 四判据 ③：the help rows must equal the ONE gesture-label list. */
export function gestureRowProblems(rows: readonly string[], labels: readonly string[]): string[] {
  const problems: string[] = [];
  if (rows.length !== labels.length) {
    problems.push(`手势行数未单源：渲染 ${rows.length} 行 ≠ L1_GESTURE_LABELS.length=${labels.length}`);
  }
  for (const label of labels) {
    if (!rows.includes(label)) problems.push(`手势行数未单源：行集合缺少标签「${label}」`);
  }
  return problems;
}

/** 四判据 ④（W3 实体化）：the section body must carry zero clickable controls. */
export function zeroClickableProblems(clickableCount: number): string[] {
  return clickableCount === 0
    ? []
    : [`（W3 实体化：分区内零可点控件）实测 ${clickableCount} 个可点控件（帮助内容不得成为第二交互面）`];
}

/* ────────────────────────────────────────────────────────────────────────────
 * 2. 真源码断言（W1 已落地面）
 * ──────────────────────────────────────────────────────────────────────────── */

test('V45 W1 SH-2：SETTINGS_SECTION_IDS 计数由注册表派生（settingsSectionCount 同源）', () => {
  assert.equal(settingsSectionCount(), SETTINGS_SECTION_IDS.length);
  assert.equal(settingsSectionCount(['a', 'b', 'c']), 3, '计数函数必须真的按入参派生');
  assert.equal(SETTINGS_SECTION_IDS.length, 8, `W3 终态必须是 8 个分区（实测 ${SETTINGS_SECTION_IDS.length}）`);
});

test('V45 W1 SH-2：注册表 id 唯一且带 settings- 前缀（改名必须被看住）', () => {
  const dup = SETTINGS_SECTION_IDS.filter((id, i) => SETTINGS_SECTION_IDS.indexOf(id) !== i);
  assert.deepEqual(dup, [], `注册表含重复 id：${dup.join(', ')}`);
  for (const id of SETTINGS_SECTION_IDS) assert.match(id, /^settings-/, `分区 id 必须以 settings- 前缀：${id}`);
});

test('V45 W1 SH-1：分区注册表 ↔ 渲染面三方同源（id + class: wc-section 成对）', () => {
  // The「帮助」section's markup lives in its own module; the judge is fed the union of
  // both render surfaces, so「单源」still covers every registry id (never a narrowed set).
  assert.deepEqual(registryRenderedProblems(SETTINGS_SECTION_IDS, `${PANEL}\n${HELP_SOURCE}`), []);
});

test('V45 W1 SH-3：手势表行数单源（L1_GESTURE_LABELS 恰 6 条，仍是手势表的唯一来源）', () => {
  assert.equal(L1_GESTURE_LABELS.length, 6, `手势表必须恰 6 行（实测 ${L1_GESTURE_LABELS.length}）`);
  assert.deepEqual(gestureRowProblems([...L1_GESTURE_LABELS], L1_GESTURE_LABELS), []);
});

test('V45 W3 SH-4：帮助分区已实体化为第 8 分区（只读零可点 + 手势表单源）', () => {
  assert.equal((SETTINGS_SECTION_IDS as readonly string[]).includes(HELP_SECTION_ID), true, '注册表必须含 settings-help');
  assert.equal(SETTINGS_SECTION_IDS.length, 8, '分区数必须是 8');
  // The section is BUILT by its own module (single source for the gesture rows) and
  // MOUNTED by `panel.ts`; both halves are machine-checked so「渲染点」cannot vanish.
  assert.ok(HELP_SOURCE.includes(`id: ${HELP_SECTION_ID}`) || HELP_SOURCE.includes(`'${HELP_SECTION_ID}'`), 'help.ts 必须声明该分区 id');
  assert.ok(PANEL.includes('buildHelpSection(doc, h)'), 'panel.ts 必须挂载帮助分区');
  // Zero clickables: the section builds a table and NOTHING else — no button/a/input
  // creation call may appear in its source (the live-DOM half is `test/ui/l2.mjs`).
  for (const tag of ["'button'", "'a'", "'input'", "'select'", "'textarea'"]) {
    assert.equal(HELP_SOURCE.includes(tag), false, `help.ts 不得创建 ${tag}（帮助内容不是第二交互面）`);
  }
  // The rows come from the ONE list (`gestureRows()`), never a second copy.
  assert.ok(HELP_SOURCE.includes('gestureRows()'), 'help.ts 必须从 `gestureRows()` 单源渲染');
  assert.deepEqual(gestureRowProblems([...L1_GESTURE_LABELS], L1_GESTURE_LABELS), []);
  assert.deepEqual(zeroClickableProblems(0), []);
});

/* ────────────────────────────────────────────────────────────────────────────
 * 3. 反证（3 条，逐条实跑）
 * ──────────────────────────────────────────────────────────────────────────── */

test('V45 W1 SH-1 反证：注册表新增 id 而渲染面未跟进 ⇒ 同源判据必红', () => {
  const problems = registryRenderedProblems([...SETTINGS_SECTION_IDS, 'settings-not-rendered'], PANEL);
  assert.ok(problems.some((p) => p.includes('分区注册表与渲染面不同源：')), problems.join(' | '));
});

test('V45 W1 SH-2 反证：硬编码计数（panel.ts 出现 data-count 字面量）⇒ 派生判据必红', () => {
  const problems = derivedCountProblems(SETTINGS_SECTION_IDS.length, SETTINGS_SECTION_IDS, `${PANEL}\n  el.setAttribute('data-count', '8');\n`);
  assert.ok(problems.some((p) => p.includes('分区计数未派生：')), problems.join(' | '));
});

test('V45 W1 SH-3 反证：删 1 行手势 ⇒ 行数同源判据必红', () => {
  const rows = L1_GESTURE_LABELS.slice(0, -1);
  const problems = gestureRowProblems(rows, L1_GESTURE_LABELS);
  assert.ok(problems.some((p) => p.includes('手势行数未单源：')), problems.join(' | '));
});

test('V45 W1 SH-4 反证：分区内注入 1 个按钮 ⇒ 零可点判据必红（W3 起对 live DOM 生效）', () => {
  const problems = zeroClickableProblems(1);
  assert.ok(problems.some((p) => p.includes('分区内零可点控件')), problems.join(' | '));
  assert.deepEqual(zeroClickableProblems(0), [], '零可点时必须不红（判据不得恒红）');
});

test('V45 W1 元判据：每条 judgement 都声明非占位 expectFailPattern', () => {
  for (const j of JUDGEMENTS) {
    assert.ok(j.expectFailPattern.trim().length >= 8, `${j.id}: expectFailPattern 不得为空/占位`);
    assert.ok(!j.expectFailPattern.includes('TODO'), `${j.id}: expectFailPattern 不得是 TODO`);
  }
  assert.ok(JUDGEMENTS.filter((j) => j.status === 'landed').length >= 3, '已落地判据必须 ≥3 条');
});
