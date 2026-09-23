/**
 * V5.5F-1 **TASK-V55F-108** (ADR-SGO-001 · FR-SGO-010/012/013/016/017 ·
 * N-SGO-014/029 · EC-SGO-008/019 · R-SGO-902/908) — the **引用事实进回合**门禁（node）.
 *
 * ── 判什么 ───────────────────────────────────────────────────────────────────
 *
 *   ① **载荷 type-only 单声明**：`ChatRefFact`（**7 字段**）/ `ChatRefTurnPayload`
 *      **恰一处**声明；`KIND_SET` **40 项逐字**不增（`refs` 是 payload 字段，**不是** kind）；
 *   ② **唯一构建点 + 两入口同口径**：`requestTurn` 内**恰一处**构建 `refs`；`requestTurn(` **恰 2**；
 *      驱动者自动成回合经既有 `op.turn` 槽复用同一构建点；
 *   ③ **基座逐字 + 追加段**：`SYSTEM_PROMPT` 5 条既有条款不改；无引用 ⇒ 追加段 `''`
 *      ⇒ `system === 基座`（**逐字**）；
 *   ④ **零引用零漂移**：`refs` 字段**缺席**（不是空数组）；
 *   ⑤ **凭据形掩码**（EC-SGO-019）；⑥ **运行时校验逐项剔除**；
 *   ⑦ **SW 引用唯一来源 = 回合载荷**（零新通道 / 零每回合页面探测）。
 *
 * 每条判据带 `expectFailPattern`，并**在文件内实跑注入反证**（改基座 / 删追加段 /
 * 复制声明 / 加 kind / 去掩码 ⇒ 必红；逐字节还原 ⇒ PASS）。
 *
 * @module test/ref-context-in-turn
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  REF_SCOPE_GUIDANCE,
  isChatRefFact,
  refContextSegment,
  validateRefPayload,
} from '../src/background/ref-context.js';
import { createRefTurnHolder } from '../src/background/ref-turn.js';
import { makeMessage, type ChatRefFact } from '../src/background/messaging.js';
import { createTurnQueue } from '../src/background/turn-queue.js';
import { maskRefDigest, turnRefsOf } from '../src/ui/sidepanel/l1/ref-scope.js';
import { createRefStore, type RefRecord } from '../src/ui/sidepanel/l1/ref-store.js';
import type { RefEnv } from '../src/ui/sidepanel/l1/ref-validity.js';

const PKG = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel: string): string => readFileSync(join(PKG, rel), 'utf8');

const MESSAGING_REL = 'src/background/messaging.ts';
const SIDEPANEL_REL = 'src/ui/sidepanel/sidepanel.ts';
const SW_REL = 'src/background/service-worker.ts';
const CHAT_RUNNER_REL = 'src/background/chat-runner.ts';
const REF_SCOPE_REL = 'src/ui/sidepanel/l1/ref-scope.ts';

export interface Judgement {
  readonly id: string;
  readonly expectFailPattern: string;
}
export const JUDGEMENTS: readonly Judgement[] = [
  { id: 'RCT-1-payload-type-only', expectFailPattern: '载荷必须 type-only 单声明（7 字段）且 KIND_SET 40 逐字不增' },
  { id: 'RCT-2-single-build-point', expectFailPattern: '引用快照必须只有一个构建点（两入口同口径，requestTurn( 恰 2）' },
  { id: 'RCT-3-system-base-verbatim', expectFailPattern: '系统段必须 = SYSTEM_PROMPT 基座（5 条逐字）+ 追加段' },
  { id: 'RCT-4-no-ref-zero-drift', expectFailPattern: '零引用回合必须逐字等于基座（refs 字段缺席，不是空数组）' },
  { id: 'RCT-5-credential-masked', expectFailPattern: '凭据形 textDigest 必须先掩码（凭据值绝不入 LLM 上下文）' },
  { id: 'RCT-6-runtime-validation', expectFailPattern: '回合载荷必须逐项剔除非法项（形状 / 正整数 refNum / 非空 selector / refState=valid）' },
  { id: 'RCT-7-sw-single-source', expectFailPattern: 'SW 的引用事实唯一来源 = 回合载荷（零新通道 / 零每回合页面探测）' },
];

/* ── 真源切片的静态判据（纯函数，便于注入反证）────────────────────────────── */

const KIND_SET_RE = /const KIND_SET[^=]*=\s*new Set<PluginMessageKind>\(\[([\s\S]*?)\]\)/;

/** ① 载荷 type-only 单声明 + 7 字段 + KIND_SET 40 逐字。 */
export function payloadProblems(messaging: string): string[] {
  const p = JUDGEMENTS[0].expectFailPattern;
  const problems: string[] = [];
  const decls = (messaging.match(/export interface ChatRefFact\s*\{/g) ?? []).length;
  const payloads = (messaging.match(/export interface ChatRefTurnPayload\s*\{/g) ?? []).length;
  if (decls !== 1) problems.push(`${p}：ChatRefFact 声明实测 ${decls} 处（第二声明即红）`);
  if (payloads !== 1) problems.push(`${p}：ChatRefTurnPayload 声明实测 ${payloads} 处（第二声明即红）`);
  const body = /export interface ChatRefFact\s*\{([\s\S]*?)\n\}/.exec(messaging)?.[1] ?? '';
  if (body.length === 0) problems.push(`${p}：ChatRefFact 字段体无法解析（判据悬空）`);
  const fields = [...body.matchAll(/readonly\s+(\w+)\??:/g)].map((m) => m[1]);
  const expected = ['refNum', 'refId', 'selector', 'refMark', 'textDigest', 'refState', 'nodeCount'];
  if (fields.length !== 7 || expected.some((f) => !fields.includes(f))) {
    problems.push(`${p}：字段集必须恰 7 项（实测 ${fields.join(',')}）`);
  }
  if (!/readonly\s+refState:\s*'valid'/.test(body)) problems.push(`${p}：refState 必须只可能是 'valid'`);
  const kindBlock = KIND_SET_RE.exec(messaging)?.[1] ?? '';
  const items = kindBlock.split(',').map((s) => s.trim()).filter((s) => /^'/.test(s));
  if (items.length !== 40) problems.push(`${p}：KIND_SET 实测 ${items.length} 项 ≠ 40 逐字`);
  if (items.some((i) => /'(refs|ref-fact|ref-turn)'/.test(i))) problems.push(`${p}：refs 不得成为新 kind`);
  return problems;
}

/** `symbol(` 的出现点数（排除注释行 / import / 定义行）——与 `op-wiring.test.ts` 同口径。 */
export function callSites(source: string, symbol: string): number[] {
  const out: number[] = [];
  const esc = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  source.split('\n').forEach((raw, i) => {
    const t = raw.trim();
    if (t.startsWith('*') || t.startsWith('//') || t.startsWith('/*')) return;
    if (!new RegExp(`${esc}\\s*\\(`).test(raw)) return;
    if (/^\s*import\b/.test(raw)) return;
    if (new RegExp(`^\\s*(?:export\\s+)?(?:async\\s+)?function\\s+${esc}\\s*\\(`).test(raw)) return;
    if (new RegExp(`^\\s*(?:export\\s+)?const\\s+${esc}\\s*=`).test(raw)) return;
    out.push(i + 1);
  });
  return out;
}

/** `requestTurn` 的函数体（左闭右开到顶层 `\n}`）。 */
export function requestTurnBody(sidepanel: string): string {
  const start = sidepanel.indexOf('function requestTurn(text: string): boolean {');
  if (start < 0) return '';
  const end = sidepanel.indexOf('\n}', start);
  return end > start ? sidepanel.slice(start, end) : sidepanel.slice(start);
}

/** ② 唯一构建点 + 两入口 + `requestTurn(` 恰 2。 */
export function buildPointProblems(sidepanel: string, refScope: string): string[] {
  const p = JUDGEMENTS[1].expectFailPattern;
  const problems: string[] = [];
  const sites = callSites(sidepanel, 'requestTurn');
  if (sites.length !== 2) problems.push(`${p}：requestTurn( 实测 ${sites.length} 处 ≠ 2（行号 ${sites.join(', ')}）`);
  const body = requestTurnBody(sidepanel);
  if (body.length === 0) problems.push(`${p}：requestTurn 函数体不存在（判据对象缺失）`);
  const builds = body.match(/turnRefsOf\(/g) ?? [];
  if (builds.length !== 1) problems.push(`${p}：requestTurn 内的引用快照构建点实测 ${builds.length} 处 ≠ 1`);
  const sends = (body.match(/makeMessage\('chat'/g) ?? []).length;
  if (sends !== 1) problems.push(`${p}：requestTurn 内 chat 载荷发送点实测 ${sends} 处 ≠ 1`);
  const bind = /bindPanelOps\(\{([\s\S]*?)\n\s*\}\);/.exec(sidepanel)?.[1] ?? '';
  if (!/turn:\s*\(text[\s\S]{0,80}?requestTurn\(text\)/.test(bind)) {
    problems.push(`${p}：op.turn 槽必须复用同一 requestTurn（驱动者入口同口径）`);
  }
  const scopeTurnRefs = (refScope.match(/export function turnRefsOf\s*\(/g) ?? []).length;
  if (scopeTurnRefs !== 1) problems.push(`${p}：turnRefsOf 必须恰一处声明（实测 ${scopeTurnRefs} 处）`);
  return problems;
}

/** `SYSTEM_PROMPT` 的**5 条既有条款**（逐字锚）。 */
export const SYSTEM_BASE_CLAUSES = Object.freeze([
  'You are the web-cli plugin assistant.',
  'Always respect authorization and confirmation prompts.',
  'Never reveal secrets.',
  'When a tool call FAILS you MUST report it to the user explicitly in your reply',
  'If the failure reason says the target origin is not authorized',
]);

/** 把 `const SYSTEM_PROMPT = …;` 的字符串片段拼回基座全文（仅用于「逐字」比对）。 */
export function systemPromptLiteral(sw: string): string {
  const at = sw.indexOf('const SYSTEM_PROMPT =');
  if (at < 0) return '';
  const end = sw.indexOf(';', at);
  const block = sw.slice(at, end < 0 ? sw.length : end);
  return [...block.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]).join('');
}

/** ③ 基座 5 条逐字 + 追加段工厂。 */
export function systemBaseProblems(sw: string): string[] {
  const p = JUDGEMENTS[2].expectFailPattern;
  const problems: string[] = [];
  const base = systemPromptLiteral(sw);
  if (base.length === 0) problems.push(`${p}：SYSTEM_PROMPT 字面量无法解析（判据悬空）`);
  for (const clause of SYSTEM_BASE_CLAUSES) {
    if (!base.includes(clause)) problems.push(`${p}：基座条款被改写 / 删除（缺「${clause.slice(0, 40)}…」）`);
  }
  if (!/system:\s*\(\)\s*=>\s*SYSTEM_PROMPT\s*\+\s*refContextSegment\(refs\)/.test(sw)) {
    problems.push(`${p}：system 工厂必须 = 基座（SYSTEM_PROMPT）+ 追加段（refContextSegment(refs)）`);
  }
  return problems;
}

/** ④ 零引用 ⇒ 载荷字段**缺席**（不是空数组）。 */
export function zeroRefPayloadProblems(sidepanel: string): string[] {
  const p = JUDGEMENTS[3].expectFailPattern;
  const problems: string[] = [];
  const body = requestTurnBody(sidepanel);
  if (!/\.\.\.\(refs\.length\s*\?\s*\{\s*refs\s*\}\s*:\s*\{\}\)/.test(body)) {
    problems.push(`${p}：载荷必须写成 \`...(refs.length ? { refs } : {})\`（零引用 ⇒ 字段缺席）`);
  }
  const msg = makeMessage('chat', { user: 'x' });
  if (Object.prototype.hasOwnProperty.call(msg, 'refs')) problems.push(`${p}：零引用的 chat 载荷不得带 refs 字段`);
  return problems;
}

/** ⑤ 凭据形掩码（EC-SGO-019）—— `project` 可注入（反证：不掩码的投影 ⇒ 必红）。 */
export function credentialProblems(
  records: readonly RefRecord[],
  project: (rs: readonly RefRecord[]) => readonly ChatRefFact[] = turnRefsOf,
): string[] {
  const p = JUDGEMENTS[4].expectFailPattern;
  const problems: string[] = [];
  const facts = project(records);
  records.forEach((rec, i) => {
    const raw = rec.facts.textDigest;
    const projected = facts[i]?.textDigest;
    if (/sk-[A-Za-z0-9]{6,}|token=[^\s•]|gh[pousr]_[A-Za-z0-9]{10,}/.test(raw)) {
      if (projected === raw) problems.push(`${p}：凭据形 textDigest 未掩码（${raw.slice(0, 24)}…）`);
    }
    if (projected && /sk-[A-Za-z0-9]{6,}/.test(projected)) problems.push(`${p}：textDigest 泄漏裸凭据词元`);
  });
  if (maskRefDigest('token=abcdef123456') !== 'token=•••') problems.push(`${p}：maskRefDigest 必须掩码 key=value 凭据值`);
  if (!/^•••$/.test(maskRefDigest('sk-ABCdef0123456789'))) problems.push(`${p}：maskRefDigest 必须掩码裸词元（sk-…）`);
  return problems;
}

/** ⑥ 运行时校验逐项剔除非法项。 */
export function validationProblems(): string[] {
  const p = JUDGEMENTS[5].expectFailPattern;
  const problems: string[] = [];
  const good: ChatRefFact = {
    refNum: 1,
    refId: 'ref_1',
    selector: '#target',
    refMark: 'ref_1',
    textDigest: '目标文本',
    refState: 'valid',
  };
  const bad: unknown[] = [
    { ...good, refNum: 0 },
    { ...good, refNum: 1.5 },
    { ...good, selector: '   ' },
    { ...good, refState: 'invalid' },
    { ...good, refId: '' },
    'not-an-object',
    null,
  ];
  const kept = validateRefPayload([good, ...bad]);
  if (kept.length !== 1) problems.push(`${p}：非法项必须逐项剔除（保留 ${kept.length} 项 ≠ 1）`);
  if (validateRefPayload(bad).length !== 0) problems.push(`${p}：全非法时不得保留任何项`);
  if (refContextSegment(bad as readonly ChatRefFact[]) !== '') problems.push(`${p}：全非法载荷 ⇒ 追加段必须为空`);
  if (!isChatRefFact(good)) problems.push(`${p}：合法项被误判非法`);
  return problems;
}

/** ⑦ SW 引用唯一来源 = 回合载荷（零新通道）。 */
export function sourceChannelProblems(sw: string): string[] {
  const p = JUDGEMENTS[6].expectFailPattern;
  const problems: string[] = [];
  if (/from\s+'\.\/ref-store\.js'|from\s+'.*l1\/ref-store/.test(sw)) problems.push(`${p}：SW 不得 import 面板引用表（第二真值源）`);
  const chatCase = /case 'chat':\s*\{([\s\S]*?)\n\s*case '/.exec(sw)?.[1] ?? '';
  if (!/validateRefPayload\(message\.refs\)/.test(chatCase)) problems.push(`${p}：case 'chat' 必须从载荷读 refs 并运行时校验`);
  if (!/void runChat\(s, user, refs\)/.test(chatCase)) problems.push(`${p}：case 'chat' 必须把 refs 交给 runChat`);
  if (!/refTurnHolder\.set\(/.test(sw) || !/refTurnHolder\.clear\(\)/.test(sw)) {
    problems.push(`${p}：回合引用单源必须每回合 set / finally clear`);
  }
  if (!/await runChat\(s, drained\.user, drained\.refs\)/.test(sw)) problems.push(`${p}：排队回合必须用自带快照`);
  return problems;
}

/* ── 真源片段 ─────────────────────────────────────────────────────────────── */
const MESSAGING = read(MESSAGING_REL);
const SIDEPANEL = read(SIDEPANEL_REL);
const SW = read(SW_REL);
const CHAT_RUNNER = read(CHAT_RUNNER_REL);
const REF_SCOPE = read(REF_SCOPE_REL);

const ENV: RefEnv = {
  currentOrigin: 'https://a.test',
  authorized: true,
  documentId: 'doc-1',
  navSeq: 1,
  declarationHash: 'h1',
};

/** 造一条**判为 valid** 的记录（走生产判定路径，不手搓 verdict）。 */
function validRecords(digests: readonly string[]): RefRecord[] {
  const out: RefRecord[] = [];
  for (const textDigest of digests) {
    const store = createRefStore();
    const rec = store.create({ selector: '#target', textDigest, origin: 'https://a.test', documentId: 'doc-1', navSeq: 1, declarationHash: 'h1', capturedAt: 1 });
    store.judge({ ...ENV, resolution: { status: 'resolved', refMark: rec.facts.refId, nodeCount: 1 } });
    const judged = store.all()[0];
    if (judged.verdict === 'valid') out.push(judged);
  }
  return out;
}

/* ── 判据 ─────────────────────────────────────────────────────────────────── */

test('RCT-1 载荷 type-only 单声明（7 字段）+ KIND_SET 40 逐字', () => {
  assert.deepEqual(payloadProblems(MESSAGING), [], JUDGEMENTS[0].expectFailPattern);
  // 反证①：复制一份声明 ⇒ 必红。
  const dup = MESSAGING.replace('export interface ChatRefFact {', 'export interface ChatRefFact {\n  readonly ghost: string;');
  assert.ok(payloadProblems(dup).some((x) => /字段集必须恰 7 项/.test(x)), '复制声明 / 加字段必须判红');
  // 反证②：把 refs 加进 KIND_SET ⇒ 必红。
  const kindInjected = MESSAGING.replace("  'clipboard-op',\n]);", "  'clipboard-op',\n  'refs',\n]);");
  assert.notEqual(kindInjected, MESSAGING, '前置：KIND_SET 注入锚点必须存在');
  assert.ok(payloadProblems(kindInjected).some((x) => /KIND_SET 实测 41 项/.test(x)), 'KIND_SET 加项必须判红');
  // 还原 ⇒ PASS（判据非恒真）。
  assert.deepEqual(payloadProblems(MESSAGING), []);
});

test('RCT-2 唯一构建点（两入口同口径）+ requestTurn( 恰 2', () => {
  assert.deepEqual(buildPointProblems(SIDEPANEL, REF_SCOPE), [], JUDGEMENTS[1].expectFailPattern);
  // 反证：复制一条 requestTurn( 调用点 ⇒ 必红 → 还原 PASS。
  const forged = `${SIDEPANEL}\nfunction ghostTurn(): void {\n  requestTurn('ghost');\n}\n`;
  assert.ok(buildPointProblems(forged, REF_SCOPE).some((x) => /requestTurn\( 实测 3 处/.test(x)), '第二构建点必须判红');
  // 反证：把 turnRefsOf 从 requestTurn 里挪走 ⇒ 必红。
  const noBuild = SIDEPANEL.replace(/const refs = turnRefsOf\([^;]*\);/, 'const refs = [] as const;');
  assert.notEqual(noBuild, SIDEPANEL, '前置：构建点注入锚点必须存在');
  assert.ok(buildPointProblems(noBuild, REF_SCOPE).some((x) => /构建点实测 0 处/.test(x)), '删掉唯一构建点必须判红');
  assert.deepEqual(buildPointProblems(SIDEPANEL, REF_SCOPE), []);
});

test('RCT-3 系统段 = 基座（5 条逐字）+ 追加段；③④ 无引用 ⇒ 逐字等于基座', () => {
  assert.deepEqual(systemBaseProblems(SW), [], JUDGEMENTS[2].expectFailPattern);
  const base = systemPromptLiteral(SW);
  assert.ok(base.length > 300, `基座字面量必须真实取到（实测 ${base.length} 字符）`);
  // 追加段：有 refs ⇒ 事实 + 引导；无 refs ⇒ ''（⇒ system 逐字等于基座）。
  assert.equal(refContextSegment(undefined), '', JUDGEMENTS[3].expectFailPattern);
  assert.equal(refContextSegment([]), '', JUDGEMENTS[3].expectFailPattern);
  const facts = turnRefsOf(validRecords(['目标文本']));
  const seg = refContextSegment(facts);
  assert.ok(seg.startsWith('\n\n'), '追加段必须以空行开始（不与基座粘连）');
  for (const f of facts) assert.ok(seg.includes(`#${f.refNum}`) && seg.includes(f.selector), '追加段必须含引用事实行');
  assert.ok(seg.includes(REF_SCOPE_GUIDANCE), '追加段必须含法则引导文本');
  assert.equal(base + refContextSegment([]), base, '零引用 ⇒ system === 基座（逐字）');
  // `chat-runner.ts` 零改：system 已支持工厂形态。
  assert.ok(/system:\s*string\s*\|\s*\(\(\)\s*=>\s*string\s*\|\s*Promise<string>\)/.test(CHAT_RUNNER), 'chat-runner 必须已支持 system 工厂（零改）');
  // 反证：删掉基座的一条条款 ⇒ 必红。
  const mangled = SW.replace('Never reveal secrets.', 'Reveal everything.');
  assert.ok(systemBaseProblems(mangled).some((x) => /基座条款被改写/.test(x)), '改基座必须判红');
  // 反证：删掉追加段（system 退回常量）⇒ 必红 → 还原 PASS。
  const noAppend = SW.replace('SYSTEM_PROMPT + refContextSegment(refs)', 'SYSTEM_PROMPT');
  assert.notEqual(noAppend, SW, '前置：追加段注入锚点必须存在');
  assert.ok(systemBaseProblems(noAppend).some((x) => /追加段/.test(x)), '删追加段必须判红');
  assert.deepEqual(systemBaseProblems(SW), []);
});

test('RCT-4 零引用 ⇒ refs 字段缺席（不是空数组）', () => {
  assert.deepEqual(zeroRefPayloadProblems(SIDEPANEL), [], JUDGEMENTS[3].expectFailPattern);
  // 反证：改成无条件 `{ refs }` ⇒ 必红（零引用也带空数组）→ 还原 PASS。
  const forged = SIDEPANEL.replace('...(refs.length ? { refs } : {})', '...{ refs }');
  assert.notEqual(forged, SIDEPANEL, '前置：载荷注入锚点必须存在');
  assert.ok(zeroRefPayloadProblems(forged).length > 0, '零引用带空数组必须判红');
  assert.deepEqual(zeroRefPayloadProblems(SIDEPANEL), []);
});

test('RCT-5 凭据形 textDigest 掩码（EC-SGO-019）', () => {
  const records = validRecords(['token=abcdef123456', 'sk-ABCdef0123456789', '普通页面文本']);
  const facts = turnRefsOf(records);
  assert.equal(facts.length, 3, '三条活引用都必须进快照');
  assert.deepEqual(credentialProblems(records), [], JUDGEMENTS[4].expectFailPattern);
  assert.ok(facts.some((f) => f.textDigest === '普通页面文本'), '非凭据页面文本必须原样保留（不误伤）');
  // 反证：注入「不掩码的投影」⇒ 必红 → 还原 PASS（判据非恒真）。
  const identityProject = (rs: readonly RefRecord[]): readonly ChatRefFact[] =>
    rs.map((r) =>
      Object.freeze({
        refNum: 1,
        refId: r.facts.refId,
        selector: r.facts.selector,
        refMark: r.facts.refId,
        textDigest: r.facts.textDigest,
        refState: 'valid' as const,
      }),
    );
  assert.ok(
    credentialProblems(records, identityProject).some((x) => /未掩码/.test(x)),
    '不掩码的投影必须判红',
  );
  assert.deepEqual(credentialProblems(records), []);
});

test('RCT-6 运行时校验逐项剔除非法项', () => {
  assert.deepEqual(validationProblems(), [], JUDGEMENTS[5].expectFailPattern);
});

test('RCT-7 SW 引用唯一来源 = 回合载荷（零新通道 / 零每回合页面探测）', () => {
  assert.deepEqual(sourceChannelProblems(SW), [], JUDGEMENTS[6].expectFailPattern);
  // 反证：让 SW 直连面板引用表 ⇒ 必红。
  const leaked = SW.replace("import { runChatTurn } from './chat-runner.js';", "import { runChatTurn } from './chat-runner.js';\nimport { createRefStore } from '../ui/sidepanel/l1/ref-store.js';");
  assert.notEqual(leaked, SW, '前置：注入锚点必须存在');
  assert.ok(sourceChannelProblems(leaked).some((x) => /不得 import 面板引用表/.test(x)), 'SW 直连引用表必须判红');
  // 反证：删掉回合 set/clear ⇒ 必红 → 还原 PASS。
  const noClear = SW.replace('refTurnHolder.clear();', '');
  assert.ok(sourceChannelProblems(noClear).some((x) => /set \/ finally clear/.test(x)), '删 clear 必须判红');
  assert.deepEqual(sourceChannelProblems(SW), []);
});

test('RCT-8 回合引用单源：每回合 set / clear ∧ 排队回合自带快照（动态）', () => {
  const holder = createRefTurnHolder();
  const facts = turnRefsOf(validRecords(['目标文本']));
  assert.deepEqual(holder.refs(), [], '无回合 ⇒ 空');
  holder.set({ refs: facts, tabId: 7, observe: async () => ({ status: 'resolved' as const, nodeCount: 1 }) });
  assert.equal(holder.refs().length, 1, '回合内必须能看到本回合快照');
  assert.equal(holder.refOf(facts[0].refNum)?.refId, facts[0].refId, '--ref n 解析路 A 必须命中');
  assert.equal(holder.observeTarget()?.tabId, 7, 'tabId 必须同源取用');
  assert.ok(holder.observeTarget()?.observe, '只读观测缝必须同源取用（每写一次的单节点闸）');
  holder.clear();
  assert.deepEqual(holder.refs(), [], '回合结束必须清空（零跨回合漂移）');
  assert.equal(holder.observeTarget(), undefined, '清空后不得残留 tabId / observe');
  // 排队回合自带快照（drain 出的回合用它自己的 refs）。
  const queue = createTurnQueue();
  assert.equal(queue.enqueue({ user: 'a', sessionId: 's', at: 1, refs: facts }), 'queued');
  const drained = queue.drain();
  assert.equal(drained?.refs?.length, 1, '排队回合必须自带引用快照');
  assert.equal(queue.drain(), undefined, '队列 FIFO 且硬上限 1');
});

test('RCT 元判据：每条 judgement 声明非占位 expectFailPattern', () => {
  assert.ok(JUDGEMENTS.length >= 7, '本门禁判据下界 ≥7');
  for (const j of JUDGEMENTS) {
    assert.ok(j.expectFailPattern.trim().length >= 8 && !j.expectFailPattern.includes('TODO'), `${j.id} 的 expectFailPattern 不得占位`);
  }
});
