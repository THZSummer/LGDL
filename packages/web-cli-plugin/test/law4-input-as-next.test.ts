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

// ── ★ IAN-2 review R1 BLOCK-01：法四**原地修订** old→new 逐字台账 + 「三处一致」机核 ──
//
// O-IAN-007 裁决 = 原地修订（非静默改写）：`v4-chat/spec.md` 的**法四三处**
// (`:116` 法则表 / `:225` FR-CHAT-014 / `:385` AC-CHAT-007) 必须同轮改成同一新条文；
// `old` 逐字 / `new` 逐字 / 理由 / 日期 / 三锚（file:line）登记在
// `docs/v4-supersession-ledger.json#law4InplaceRevision`。**三处只改一处（半修）⇒ 必红**。
export const LAW4_OLD_VERBATIM =
  '输入按需出现：无常驻输入框；ask-user text 输入框只在问题卡内出现，卡内还有「其他…（我来描述）」兜底';
export const LAW4_NEW_VERBATIM = '输入即 next：自由文本输入是流内 next 的一个选项；流外零输入面';
/** 三处共同的核心句（逐字；L4-7 在每锚行上比对它）。 */
export const LAW4_CORE_SENTENCE = '自由文本输入是流内 next 的一个选项；**流外零输入面**';
/** 三处一致锚行号（1-indexed）。 */
export const LAW4_ANCHOR_LINES = [116, 225, 385] as const;
const V4_CHAT_SPEC_REL = '.sddu/specs-tree-root/specs-tree-web-cli-plugin-v4-chat/spec.md';
const V4_LEDGER_REL = 'docs/v4-supersession-ledger.json';

export interface Law4Anchor {
  readonly file: string;
  readonly line: number;
}
export interface Law4Revision {
  readonly id?: string;
  readonly old?: string;
  readonly new?: string;
  readonly reason?: string;
  readonly date?: string;
  readonly coreSentence?: string;
  readonly counterCheck?: string;
  readonly anchors?: readonly Law4Anchor[];
}

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
  {
    id: 'L4-7-three-way-consistency',
    expectFailPattern: '法四 L4-7：`v4-chat/spec.md` 三处（:116/:225/:385）必须同轮改成同一新条文（半修 ⇒ 必红）∧ 台账 old→new 逐字',
  },
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

/**
 * ★ IAN-2 review R1 **BLOCK-01** —— 法四「三处一致」机核（纯函数 ⇒ 反证可打在真实源文本上）。
 *
 * 判据（读 `.sddu/.../v4-chat/spec.md` 三锚行 + 台账 `law4InplaceRevision`）：
 *   · 台账条目存在，且 `old` / `new` / `coreSentence` 逐字匹配（ADR-IAN-006 §①）；
 *   · `reason` 非套话 / `date` 合法 / `counterCheck` 非空；
 *   · `anchors` 行号 == `[116, 225, 385]` 且文件都是 `v4-chat/spec.md`；
 *   · 每个锚行**都必须**含核心句 `LAW4_CORE_SENTENCE`（三处改一处 / 缺一处 ⇒ 半修必红）。
 *
 * `specLines(line)` 返回该 1-indexed 行的文本（越界 ⇒ `undefined`）。
 */
export function law4ConsistencyProblems(
  revision: Law4Revision | undefined,
  specLines: (line: number) => string | undefined,
): string[] {
  const p = J('L4-7-three-way-consistency').expectFailPattern;
  const problems: string[] = [];
  if (!revision) return [`${p}：台账缺法四条目（\`${V4_LEDGER_REL}#law4InplaceRevision\`）`];
  if (revision.old !== LAW4_OLD_VERBATIM) problems.push(`${p}：old 逐字不符（必须等于台账登记旧条文）`);
  if (revision.new !== LAW4_NEW_VERBATIM) problems.push(`${p}：new 逐字不符（必须等于法四新条文）`);
  if ((revision.coreSentence ?? '') !== LAW4_CORE_SENTENCE) problems.push(`${p}：coreSentence 与三处核心句逐字不符`);
  if ((revision.reason ?? '').trim().length < 20) problems.push(`${p}：reason 必须非套话（≥20 字符）`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(revision.date ?? ''))) problems.push(`${p}：date 缺失或不合法（${revision.date}）`);
  if ((revision.counterCheck ?? '').trim().length === 0) problems.push(`${p}：counterCheck 不得为空`);
  const anchors = revision.anchors ?? [];
  const lines = anchors.map((a) => a.line).sort((a, b) => a - b);
  if (JSON.stringify(lines) !== JSON.stringify([...LAW4_ANCHOR_LINES])) {
    problems.push(`${p}：三锚行号必须恰为 [${LAW4_ANCHOR_LINES.join(', ')}]（实测 [${lines.join(', ')}]）`);
  }
  if (anchors.length === 0) problems.push(`${p}：anchors 不得为空（必须登记三处落点 file:line）`);
  for (const a of anchors) {
    if (!String(a.file ?? '').endsWith('v4-chat/spec.md')) problems.push(`${p}：锚点文件必须是 v4-chat/spec.md（${a.file}）`);
    const text = specLines(a.line);
    if (text === undefined) {
      problems.push(`${p}：锚点 ${a.file}:${a.line} 不存在（行号漂移）`);
      continue;
    }
    if (!text.includes(LAW4_CORE_SENTENCE)) {
      problems.push(`${p}：${a.file}:${a.line} 缺法四新条文核心句（半修 / 未修 ⇒ 必红）`);
    }
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

test('法四 L4-7：三处一致（`v4-chat/spec.md` :116/:225/:385 + 台账 old→new 逐字）∧ 半修必红', () => {
  const revision = (
    JSON.parse(readFileSync(join(PKG, V4_LEDGER_REL), 'utf8')) as { law4InplaceRevision?: Law4Revision }
  ).law4InplaceRevision;
  const specText = readFileSync(join(PKG, '..', '..', V4_CHAT_SPEC_REL), 'utf8');
  const specArr = specText.split('\n');
  const specLines = (line: number): string | undefined => (line >= 1 && line <= specArr.length ? specArr[line - 1] : undefined);

  // 生产事实 ⇒ 全绿（三处核心句逐字一致 + 台账 old/new 逐字）。
  assert.deepEqual(law4ConsistencyProblems(revision, specLines), [], '法四三处一致机核必须全绿');
  assert.equal(revision?.id, 'X-IAN-1', '法四条目 id 必须 = X-IAN-1（父 §12 编号）');
  // 非恒真：三锚行号确实落在 spec 真源内且含新条文。
  for (const line of LAW4_ANCHOR_LINES) {
    assert.ok((specLines(line) ?? '').includes(LAW4_CORE_SENTENCE), `前置：spec.md:${line} 必须含法四新条文`);
  }

  // ── 反证①：**半修**（只回退一处到旧条文）⇒ 必红（核心判据）──────────────
  const reverted = (line: number): string | undefined => {
    const text = specLines(line);
    return line === LAW4_ANCHOR_LINES[1] ? (text ?? '').replace(LAW4_CORE_SENTENCE, '输入按需出现：无常驻输入框') : text;
  };
  const halfFix = law4ConsistencyProblems(revision, reverted);
  assert.ok(halfFix.some((x) => x.includes(`:${LAW4_ANCHOR_LINES[1]}`)), '三处只改一处（半修）⇒ 必红');

  // ── 反证②：锚点行号漂移 ⇒ 必红 ──────────────────────────────────────────
  const drifted: Law4Revision = {
    ...revision,
    anchors: (revision?.anchors ?? []).map((a, i) => (i === 0 ? { ...a, line: 117 } : a)),
  };
  assert.ok(
    law4ConsistencyProblems(drifted, specLines).some((x) => x.includes('三锚行号')),
    '锚点行号漂移 ⇒ 必红',
  );

  // ── 反证③：台账 old / new / coreSentence 空字段或错字 ⇒ 必红 ─────────────
  assert.ok(law4ConsistencyProblems({ ...revision, old: '' }, specLines).some((x) => x.includes('old 逐字')));
  assert.ok(law4ConsistencyProblems({ ...revision, new: '其他' }, specLines).some((x) => x.includes('new 逐字')));
  assert.ok(law4ConsistencyProblems({ ...revision, anchors: [] }, specLines).some((x) => x.includes('anchors')));

  // ── 反证④：台账条目整体缺失 ⇒ 必红 ─────────────────────────────────────
  assert.ok(law4ConsistencyProblems(undefined, specLines).some((x) => x.includes('缺法四条目')));

  // 还原 ⇒ 绿（判据非恒真）。
  assert.deepEqual(law4ConsistencyProblems(revision, specLines), []);
});
