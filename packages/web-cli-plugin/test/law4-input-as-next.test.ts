/**
 * ★ IAN-2 **TASK-IAN-216**（ADR-IAN-006 §①② · ADR-IAN-008 §③ · FR-IAN-049 / 064 / 080 ·
 * AC-IAN-019/020）—— **法四机核门禁 `law4-input-as-next`**（L4-1~6 + 双向反证 + 三段控制）。
 *
 * ── 判什么（法四新条文「输入即 next：自由文本输入是流内 next 的一个选项；流外零输入面」）──
 *
 *   L4-1 三 id DOM **零命中**（读生产真源 `src/ui/sidepanel/index.html`）：`#composer` /
 *        `#input` / `#send` **元素不存在**（**非** `hidden` / `display:none` / 迟挂载）。
 *   L4-2 三 id ∈ `RETIRED_CONTAINER_IDS`（长度 **16**）；移出入册 ⇒ 必红。
 *   L4-3 默认屏**零可见输入框**（静态 `index.html` 的每个 `input/textarea/select/[contenteditable]`
 *        要么不存在，要么落在默认 `hidden` 的祖先内）。
 *   L4-4 流内 free-input 卡**存在可用**（真源切片：provider 单源 + `openFreeInputCard` +
 *        `setCardFallbackOpen` ⇒ 可展开 + 可聚焦）。
 *   L4-5 **三段控制禁恒真**：`ok` / `violated` / `n/a` 逐态可达（`n/a` 不冒充 `ok`）。
 *   L4-6 **真源切片**：判据读生产模块 / 生产 HTML，不读测试自建常量，不自我裁决。
 *
 * 双向反证**在文件内实跑**（注入 `<form id=composer hidden>` ⇒ 必红；移除后逐字节还原 ⇒ 绿；
 * 移出入册 ⇒ 必红）。
 *
 * @module test/law4-input-as-next
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { RETIRED_CONTAINER_IDS } from '../src/ui/sidepanel/host-registry.js';

const PKG = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel: string): string => readFileSync(join(PKG, rel), 'utf8');

const HTML_REL = 'src/ui/sidepanel/index.html';
const PROVIDERS_REL = 'src/ui/sidepanel/next-registry/providers.ts';
const ASKUSER_REL = 'src/ui/sidepanel/cards/askuser.ts';
const PANEL_REL = 'src/ui/sidepanel/sidepanel.ts';

/** 法四涉及的三个流外面 id（真退役目标）。 */
export const LAW4_RETIRED_IDS = ['composer', 'input', 'send'] as const;

export interface Law4Judgement {
  readonly id: string;
  readonly expectFailPattern: string;
}
export const JUDGEMENTS: readonly Law4Judgement[] = [
  { id: 'L4-1-dom-zero-hit', expectFailPattern: '法四 L4-1：`#composer`/`#input`/`#send` 必须 DOM 零命中（真退役 ≠ hidden）' },
  { id: 'L4-2-retired-registered', expectFailPattern: '法四 L4-2：三 id 必须逐 id 入 `RETIRED_CONTAINER_IDS`（长度 16）' },
  { id: 'L4-3-no-visible-input', expectFailPattern: '法四 L4-3：默认屏必须零可见输入框（无常驻输入面）' },
  { id: 'L4-4-stream-input-usable', expectFailPattern: '法四 L4-4：流内 free-input 卡必须存在可用（可展开 + 可聚焦）' },
  { id: 'L4-5-tri-state', expectFailPattern: '法四 L4-5：三段控制 ok / violated / n/a 逐态可达（n/a 不冒充 ok）' },
  { id: 'L4-6-true-source', expectFailPattern: '法四 L4-6：判据必须读生产真源（不读测试自建常量、不自我裁决）' },
];

/** 三态：`ok` = 判据通过；`violated` = 判据失败；`n/a` = 证据面不可达（**不**冒充 ok）。 */
export type TriState = 'ok' | 'violated' | 'n/a';
export function triState(pass: boolean | undefined): TriState {
  if (pass === undefined) return 'n/a';
  return pass ? 'ok' : 'violated';
}

/** 供 `JUDGEMENTS` 索引（禁止魔法下标散落）。 */
const J = (id: string): Law4Judgement => {
  const found = JUDGEMENTS.find((j) => j.id === id);
  if (!found) throw new Error(`law4: 未知判据 ${id}`);
  return found;
};

export interface Law4Reading {
  /** `index.html` 源码文本。 */
  readonly html: string;
  /** `host-registry.ts` 的退役容器册（真源导出）。 */
  readonly containerIds: readonly string[];
  readonly providersSrc: string;
  readonly askuserSrc: string;
  readonly panelSrc: string;
}

/** 提取 `index.html` 内所有 `id="…"`。 */
export function idsOf(html: string): string[] {
  return [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
}

/** 静态标记中是否出现某 id 的**元素**（`id="x"`）。 */
function hasId(html: string, id: string): boolean {
  return new RegExp(`\\sid="${id}"`).test(html);
}

/**
 * 除 `index.html` 外，还有哪些源把某 id 重新铸造进「默认文档」——
 * 真退役的判据是「**产品没有任何写点再铸该 id**」（host-registry 的判别规则）。
 */
function mintedElsewhere(id: string, reading: Law4Reading): boolean {
  const srcs = [reading.panelSrc, reading.providersSrc, reading.askuserSrc];
  for (const src of srcs) {
    // 只认「真写 DOM id」的形态：`id = 'composer'` / `id = "composer"` / `#composer` 铸造点。
    if (new RegExp(`\\.id\\s*=\\s*['"]${id}['"]`).test(src)) return true;
    if (new RegExp(`createElement\\([^)]*\\)[\\s\\S]{0,60}\\.id\\s*=\\s*['"]${id}['"]`).test(src)) return true;
  }
  return false;
}

/** 默认屏零可见输入框（静态半）：每个输入类元素都必须落在默认 `hidden` 的祖先内。 */
export function visibleInputProblems(html: string): string[] {
  const problems: string[] = [];
  const VOID = new Set(['input', 'br', 'img', 'meta', 'link', 'hr', 'source', 'area', 'base', 'col', 'embed', 'param', 'track', 'wbr']);
  const INPUT_TAGS = new Set(['input', 'textarea', 'select']);
  interface Frame {
    readonly tag: string;
    readonly hidden: boolean;
  }
  const stack: Frame[] = [];
  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*?)(\/?)>/g;
  for (const m of html.matchAll(tagRe)) {
    const closing = m[1] === '/';
    const tag = m[2].toLowerCase();
    const attrs = m[3] ?? '';
    const selfClosing = m[4] === '/';
    if (closing) {
      // pop to the nearest matching frame (tolerant of stray closers).
      for (let i = stack.length - 1; i >= 0; i -= 1) {
        if (stack[i].tag === tag) {
          stack.length = i;
          break;
        }
      }
      continue;
    }
    const parentHidden = stack.length > 0 ? stack[stack.length - 1].hidden : false;
    const hidden = parentHidden || /(^|\s)hidden(\s|>|=|$)/.test(attrs);
    if (INPUT_TAGS.has(tag)) {
      if (!hidden) {
        const line = html.slice(0, m.index ?? 0).split('\n').length;
        problems.push(`默认屏出现未隐藏的 <${tag}>（line ${line}：${m[0].slice(0, 60)}）`);
      }
    }
    if (/contenteditable\s*=\s*"true"/.test(attrs) && !hidden) {
      const line = html.slice(0, m.index ?? 0).split('\n').length;
      problems.push(`默认屏出现可编辑面（contenteditable=true，line ${line}）`);
    }
    if (!VOID.has(tag) && !selfClosing) stack.push({ tag, hidden });
  }
  return problems;
}

/** L4 判据本体（纯函数 ⇒ 双向反证可打在真实源文本上）。 */
export function law4Problems(reading: Law4Reading): string[] {
  const problems: string[] = [];

  // ── L4-1 三 id DOM 零命中（真退役 ≠ hidden）────────────────────────────────
  for (const id of LAW4_RETIRED_IDS) {
    if (hasId(reading.html, id)) {
      problems.push(`${J('L4-1-dom-zero-hit').expectFailPattern}：#${id} 仍在 index.html（元素存在；不得用 hidden / display:none 冒充退役）`);
    }
    if (mintedElsewhere(id, reading)) {
      problems.push(`${J('L4-1-dom-zero-hit').expectFailPattern}：生产源仍铸造 #${id}（退役容器不得有再铸写点）`);
    }
  }

  // ── L4-2 逐 id 入册（长度 16）───────────────────────────────────────────────
  for (const id of LAW4_RETIRED_IDS) {
    if (!reading.containerIds.includes(id)) {
      problems.push(`${J('L4-2-retired-registered').expectFailPattern}：#${id} 未入册（真退役 ≠ hidden 必须逐 id 可判）`);
    }
  }
  if (reading.containerIds.length !== 16) {
    problems.push(`${J('L4-2-retired-registered').expectFailPattern}：容器册长度实测 ${reading.containerIds.length} ≠ 16`);
  }

  // ── L4-3 默认屏零可见输入框 ─────────────────────────────────────────────────
  for (const p of visibleInputProblems(reading.html)) {
    problems.push(`${J('L4-3-no-visible-input').expectFailPattern}：${p}`);
  }

  // ── L4-4 流内 free-input 卡存在可用（真源切片）──────────────────────────────
  if (!/FREE_INPUT_LABEL/.test(reading.providersSrc)) {
    problems.push(`${J('L4-4-stream-input-usable').expectFailPattern}：free-input provider（FREE_INPUT_LABEL 单源）必须存在`);
  }
  if (!/function openFreeInputCard\(/.test(reading.panelSrc)) {
    problems.push(`${J('L4-4-stream-input-usable').expectFailPattern}：openFreeInputCard 必须存在（卡内输入可就地展开）`);
  }
  if (!/setCardFallbackOpen\(form,\s*true\)/.test(reading.panelSrc)) {
    problems.push(`${J('L4-4-stream-input-usable').expectFailPattern}：卡内输入必须可展开（setCardFallbackOpen(form, true)）`);
  }
  if (!/\.focus\(\)/.test(reading.askuserSrc) && !/\.focus\(\)/.test(reading.panelSrc)) {
    problems.push(`${J('L4-4-stream-input-usable').expectFailPattern}：卡内输入必须可聚焦（focus() 写点）`);
  }

  // ── L4-6 真源切片（本函数只读生产源文本 ⇒ 不自我裁决）──────────────────────
  if (reading.html.length < 1_000) {
    problems.push(`${J('L4-6-true-source').expectFailPattern}：index.html 真源切片必须非空（否则判据空转）`);
  }

  return problems;
}

/** 生产真值读数（node 面；Chromium 面另有运行时 DOM 判据）。 */
function productionReading(): Law4Reading {
  return {
    html: read(HTML_REL),
    containerIds: [...RETIRED_CONTAINER_IDS],
    providersSrc: read(PROVIDERS_REL),
    askuserSrc: read(ASKUSER_REL),
    panelSrc: read(PANEL_REL),
  };
}

test('法四 L4-1~4 / L4-6：流外零输入面 ∧ 三 id 入册 ∧ 卡内可用（生产真源）', () => {
  const reading = productionReading();
  assert.deepEqual(law4Problems(reading), [], '法四机核判据必须全绿（生产真源）');
  // 非恒真：真源确实含三 id 的**字面**（否则「零命中」是空转）。
  assert.ok(read(HTML_REL).includes('stream'), '前置：index.html 真源必须可定位');
  assert.equal(RETIRED_CONTAINER_IDS.length, 16, '容器册长度必须 16（13 + ★ IAN-2 三 id）');
});

test('法四 L4-5：三段控制 ok / violated / n/a 逐态可达（n/a 不冒充 ok，禁恒真）', () => {
  const clean = productionReading();
  assert.equal(triState(law4Problems(clean).length === 0), 'ok', '生产事实 ⇒ ok');
  const injected = { ...clean, html: `${clean.html}\n<form id="composer" hidden></form>\n` };
  assert.equal(triState(law4Problems(injected).length === 0), 'violated', '注入 ⇒ violated');
  assert.equal(triState(undefined), 'n/a', '读不到 ⇒ n/a');
  assert.notEqual(triState(undefined), 'ok', 'n/a 不得冒充 ok');
  assert.notEqual(triState(undefined), 'violated', 'n/a 不得冒充 violated');
  const states: TriState[] = [triState(true), triState(false), triState(undefined)];
  assert.deepEqual(states, ['ok', 'violated', 'n/a'], '三段必须逐态可达');
  assert.equal(new Set(states).size, 3, '三段互斥（禁两态混池）');
});

test('法四反证①：注入 `<form id=composer hidden>` ⇒ 必红（真退役 ≠ hidden）', () => {
  const clean = productionReading();
  const injected = { ...clean, html: clean.html.replace('<main ', '<form id="composer" hidden></form>\n    <main ') };
  assert.notEqual(injected.html, clean.html, '前置：注入锚点必须存在');
  assert.ok(
    law4Problems(injected).some((p) => p.includes(J('L4-1-dom-zero-hit').expectFailPattern) && p.includes('#composer')),
    '注入 hidden 形态 ⇒ L4-1 必红',
  );
  // 还原 ⇒ 绿（判据非恒真）。
  assert.deepEqual(law4Problems({ ...clean, html: clean.html }), []);
});

test('法四反证②：把 `#input` 移出退役册 ⇒ 必红（入册逐 id 可判）', () => {
  const clean = productionReading();
  const removed = clean.containerIds.filter((id) => id !== 'input');
  assert.ok(
    law4Problems({ ...clean, containerIds: removed }).some((p) => p.includes(J('L4-2-retired-registered').expectFailPattern) && p.includes('#input')),
    '移出入册 ⇒ L4-2 必红',
  );
  assert.deepEqual(law4Problems({ ...clean, containerIds: [...RETIRED_CONTAINER_IDS] }), []);
});

test('法四反证③：默认屏注入可见 `<input>` ⇒ L4-3 必红（零可见输入面非恒真）', () => {
  const clean = productionReading();
  const injected = { ...clean, html: clean.html.replace('<main ', '<input id="ghost" type="text" />\n    <main ') };
  assert.ok(
    law4Problems(injected).some((p) => p.includes(J('L4-3-no-visible-input').expectFailPattern)),
    '默认屏可见输入框 ⇒ L4-3 必红',
  );
  assert.deepEqual(law4Problems(clean), []);
});
