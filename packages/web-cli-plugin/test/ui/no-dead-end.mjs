/**
 * V5-3 **TASK-V5-159 / 160 / 161** (ADR-V5-009 · FR-ALLN-010 / 011 / 015 / 016 ·
 * **AC-ALLN-001 / 002** · FR-ALLN-121 · N22) — the **死端守护门禁** (no-dead-end gate).
 *
 * ── The claim ────────────────────────────────────────────────────────────────
 *
 * After ANY blocked terminal is observed, a reachable next step exists **in the stream,
 * in the same render frame** (the panel's `dispatch → render()` is synchronous, so no
 * wait / retry is involved — the N = 0 caliber is「断言紧跟状态派发之后」, not a poll):
 *
 *   nextOf(el) =
 *       el.querySelector('[data-op]')                       // 形态① 行内 next chip
 *     ?? 后续同场景可见兄弟中「最近的」[data-msg-type="nextstep"]
 *         且其内 querySelector('[data-op]') 非空            // 形态② 紧随 nextstep 卡
 *   deadEnd(el) = nextOf(el) === null
 *
 *   ① 5 类阻塞**逐类**：`deadEnd === false`（每类一条读数 + 一句可执行修复 op）；
 *   ② 死端 = 0：同屏扫描 `#stream` 内**所有**阻塞载体（`error` 卡 + `✖` 系统行）⇒ 计数 0；
 *   ③ ✖ 行不裸奔：阻塞载体的候选里存在 `[data-act="next"][data-op]`（渲染层）；
 *   ④ 双向注入反证（每条实跑 ⇒ 必 FAIL ⇒ 还原 ⇒ PASS）：
 *        ① 第 6 类阻塞（无 provider）⇒ 无 next ⇒ 判据 FAIL；
 *        ② 移除某阻塞 error 卡的**铸造期**恢复面 ⇒ 形态① 消失 ⇒ 判据 FAIL。
 *
 * ── 共享面（FR-ALLN-004）────────────────────────────────────────────────────
 *
 * The 10-step S2 sample is **imported, never copied** (`./fixtures/s2-chain.mjs`,
 * delivered by v5-2 TASK-V5-149); this gate is its single-point Chromium landing
 * (v5-2 only shipped the sample + the seams).
 *
 * Run: `node test/ui/no-dead-end.mjs`   (one Chromium instance, serial — N13)
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  CHROME,
  DIST,
  PACKAGE_ROOT,
  check,
  evaluate,
  finish,
  launch,
  openSidePanel,
  findOurServiceWorker,
  setViewport,
  VIEWPORT_HEIGHT,
  waitFor,
} from './_v3-helpers.mjs';
import { S2_BLOCKED_STATES, S2_CHAIN, s2JudgedStates } from './fixtures/s2-chain.mjs';

/** The repairing op each blocked class must offer (mirrors the node judge's table). */
export const EXPECTED_REPAIR = {
  'site.unauthorized': 'op.authorize',
  'binding.stale': 'op.pick',
  'ref.all-invalid': 'op.pick',
  'llm.unconfigured': 'op.llm-config',
  'perm.missing': 'op.perm.request',
};

/** The recommendation-drive mode per blocked class (all live through the REAL producer). */
const DRIVE_MODE = {
  'site.unauthorized': 'idle',
  'llm.unconfigured': 'llm',
  'perm.missing': 'perm',
  'binding.stale': 'hard',
  'ref.all-invalid': 'stale',
};

/** One judgement per line of the gate (`expectFailPattern` = the readable failure text). */
export const JUDGEMENTS = [
  { id: 'ND-1-per-class', expectFailPattern: '阻塞类逐类必须可达 next（deadEnd=false）' },
  { id: 'ND-2-dead-end-zero', expectFailPattern: '同屏阻塞载体死端计数必须为 0' },
  { id: 'ND-3-bare-row', expectFailPattern: '✖ 行不得裸奔（缺 [data-act="next"][data-op]）' },
  { id: 'ND-4-dual-form', expectFailPattern: 'nextOf 形态① 与 形态② 必须各至少命中 1 例' },
  { id: 'ND-5-inject-1', expectFailPattern: '注入第 6 类阻塞（无 provider）⇒ 判据必须 FAIL' },
  { id: 'ND-6-inject-2', expectFailPattern: '移除铸造期恢复面 ⇒ 判据必须 FAIL' },
  { id: 'ND-7-single-source', expectFailPattern: '阻塞枚举必须唯一源自 BLOCKED_TERMINALS（声明恰一次）' },
  // V5.5-1 TASK-V55-124（判据升级，不是改布尔值）：4 类「已表达意图」终态逐类必有可达 next。
  { id: 'ND-8-intent-terminals', expectFailPattern: '4 类已表达意图终态逐类必有可达 next（判据升级）' },
  { id: 'ND-9-intent-driven', expectFailPattern: '引用意图作答必须产生悬置登记 + 可达 next（答案不被丢弃）' },
  // V5.5F-2 TASK-V55F-213（ADR-SGO-005 §1/§2/§3）：扩围二择 + 转值 + 拒绝零死端。
  { id: 'ND-10-widen-choice', expectFailPattern: '扩围二择必须经既有 askuser 且拒绝后零死端（未确认 ⇒ 不得放行）' },
];

/* ── in-page helpers (one implementation, shipped in the gate) ───────────────── */

/** `nextOf` / `deadEnd` — the ADR-V5-009 §2 judgement, verbatim. */
const NEXT_OF = `
function visible(el) { let n = el; while (n) { if (n.hidden === true) return false; n = n.parentElement; } return true; }
function nextOf(el) {
  const inline = el.querySelector('[data-op]');
  if (inline) return inline;
  let sib = el.nextElementSibling;
  while (sib) {
    if (sib.getAttribute('data-msg-type') === 'nextstep' && visible(sib)) {
      const op = sib.querySelector('[data-op]');
      if (op) return op;
    }
    sib = sib.nextElementSibling;
  }
  return null;
}
function deadEnd(el) { return nextOf(el) === null; }
function blockedCarriers() {
  return [...document.querySelectorAll('#stream > li')].filter(
    (l) => l.getAttribute('data-msg-type') === 'error' || (
      l.getAttribute('data-msg-type') === 'system' && (l.textContent || '').trim().indexOf('✖') === 0),
  );
}`;

/** The whole-stream dead-end reading (the same-screen scan). */
const STREAM_READING = `(() => { ${NEXT_OF}
  const carriers = blockedCarriers();
  const dead = carriers.filter(deadEnd);
  return JSON.stringify({
    total: carriers.length,
    deadEnds: dead.length,
    dead: dead.map((e) => (e.textContent || '').slice(0, 40)),
    ops: carriers.map((e) => { const n = nextOf(e); return n ? n.getAttribute('data-op') : null; }),
    lastError: (() => { const errs = [...document.querySelectorAll('#stream [data-msg-type="error"]')]; const e = errs[errs.length - 1]; if (!e) return null;
      return JSON.stringify({ inline: [...e.querySelectorAll('[data-act="next"][data-op]')].map((b) => b.getAttribute('data-op')), deadEnd: deadEnd(e), form1: Boolean(e.querySelector('[data-op]')) }); })(),
    nextstepOps: [...document.querySelectorAll('#stream [data-msg-type="nextstep"] [data-op]')].map((b) => b.getAttribute('data-op')),
    form2: [...document.querySelectorAll('#stream [data-msg-type="nextstep"][data-nextstep-rule="risk-recovery"] [data-op]')].length,
  });
})()`;

/** Every `src/**` file (recursive) — the single-source scan input. */
function srcFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...srcFiles(full));
    else if (entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

/* ── V5.5-1 TASK-V55-124（FR-SELF-103 / X-SELF-4 / N-SELF-019）判据升级的取材面 ──
 *
 * 「判据升级」= 5 类阻塞判据**逐条保留** + **新增** 4 类「已表达意图」终态必有可达 next。
 * 终态词表与驱动者声明都是**单源**，本门禁从源文本抽取（不复制第二份词表）。
 */

/** `terminals.ts#DRIVER_TERMINALS` 的 4 个字面量（缺块 / 项数变化 ⇒ 空 / 非 4 ⇒ 判红）。 */
export function driverTerminalsOf(src) {
  const block = /export const DRIVER_TERMINALS = Object\.freeze\(\[([\s\S]*?)\] as const\)/.exec(src);
  if (!block) return [];
  return [...block[1].matchAll(/'([a-z-]+)'/g)].map((m) => m[1]);
}

/** `DRIVER_TERMINAL_OF_SOURCE` 的四类「已表达的话」来源键（迟到 `late` 不记「已答」）。 */
export function intentSourcesOf(src) {
  const block = /export const DRIVER_TERMINAL_OF_SOURCE[\s\S]*?=\s*Object\.freeze\(\(?\{([\s\S]*?)\}\)?\)/.exec(src);
  if (!block) return [];
  return [...block[1].matchAll(/^\s*([a-z]+):/gm)].map((m) => m[1]).filter((s) => s !== 'late');
}

/** `providers.ts#DRIVER_DECLS_SRC` 的 `moments:` 面 ⇒ `moment → [driverId]`（声明单源）。 */
export function momentDriversOf(src) {
  const out = {};
  const decls = /export const DRIVER_DECLS_SRC[\s\S]*?=\s*Object\.freeze\(\{([\s\S]*?)\n\}\);/.exec(src);
  if (!decls) return out;
  for (const line of decls[1].split('\n')) {
    const id = /^\s*'?([A-Za-z0-9._-]+)'?:\s*\{/.exec(line);
    const moments = /moments:\s*\[([^\]]*)\]/.exec(line);
    if (!id || !moments) continue;
    for (const m of moments[1].matchAll(/'([a-z-]+)'/g)) (out[m[1]] ??= []).push(id[1]);
  }
  return out;
}

async function main() {
  console.log(`▶ chrome: ${CHROME}`);
  console.log(`▶ dist:   ${DIST}`);
  const { chrome, base } = await launch({ tag: 'no-dead-end', extDir: DIST, portRange: [9760, 9840] });
  try {
    const sw = await findOurServiceWorker(base);
    if (!sw) throw new Error('web-cli plugin service worker 不可达');
    const { cdp } = await openSidePanel(sw.cdp, base);
    const pageErrors = [];
    cdp.on('Runtime.exceptionThrown', (p) => pageErrors.push(p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text));
    await setViewport(cdp, 400, VIEWPORT_HEIGHT);
    await waitFor(cdp, `document.getElementById('stream') ? '1' : ''`, 80, 200);

    // ── ND-7 阻塞枚举单源（消费 v5-1 单源 + 声明恰一次扫描） ────────────────────
    const defSrc = readFileSync(join(PACKAGE_ROOT, 'src/ui/sidepanel/next-registry/definition.ts'), 'utf8');
    // V5-3 review R1（I-05）：`definition.ts` 现在还在 `BLOCKED_RECOVERY_TRIGGER` 的**对象键**上
    // 复用同一组终态字面量（编译期穷尽检查），故声明面按**去重后的集合**判定 —— 判据仍是
    // 「声明的阻塞态集合 == 共享样本集合」（去的只是同一字面量在同一声明源里的重复出现）。
    const declared = [...new Set([...defSrc.matchAll(/'([a-z][a-z.]*\.[a-z-]+)'/g)].map((m) => m[1]).filter((t) => t.includes('.')))];
    const sites = {};
    for (const file of srcFiles(join(PACKAGE_ROOT, 'src'))) {
      const rel = file.slice(file.indexOf(PACKAGE_ROOT) + PACKAGE_ROOT.length + 1);
      const text = readFileSync(file, 'utf8');
      for (const lit of S2_BLOCKED_STATES) if (text.includes(`'${lit}'`)) (sites[rel] ??= []).push(lit);
    }
    const straySites = Object.keys(sites).filter(
      (rel) => rel !== 'src/ui/sidepanel/next-registry/definition.ts' && rel !== 'src/ui/sidepanel/next-registry/providers.ts',
    );
    check(
      'ND-7 阻塞枚举唯一源自 `BLOCKED_TERMINALS` ∧ 与共享样本 `S2_BLOCKED_STATES` 逐项一致',
      JSON.stringify(declared) === JSON.stringify([...S2_BLOCKED_STATES]),
      `declared=${JSON.stringify(declared)}`,
    );
    check('ND-7 声明恰一次：5 个字面量只出现在声明源 + 唯一双射点（第三处 ⇒ 红）', straySites.length === 0, JSON.stringify(straySites));
    check('ND-7 注入第 6 类（枚举集合 ≠ 样本集合）⇒ 单源判据必 FAIL', JSON.stringify([...declared, 'disk.full']) !== JSON.stringify([...S2_BLOCKED_STATES]), JUDGEMENTS[6].expectFailPattern);
    check('ND-0 共享样本未复制：S2 链恰 10 环节 ∧ 受判状态 = 5 类阻塞 + 恢复态', S2_CHAIN.length === 10 && s2JudgedStates().length === 6, `chain=${S2_CHAIN.length}`);

    // ── ND-1 5 类阻塞逐类：形态①（error 卡行内）+ 形态②（紧随 nextstep） ────────
    console.log('\n▶ ND-1 五类阻塞逐类可达（同步渲染：断言紧跟状态派发之后，无轮询）');
    const perClass = [];
    for (const blocked of S2_BLOCKED_STATES) {
      await evaluate(cdp, `window.__v3.testing.streamReset(); true`);
      // 形态①：铸造期恢复面（真实派生自 BLOCKED_TERMINALS）
      const chips = await evaluate(cdp, `window.__v3.testing.blockedError(${JSON.stringify(blocked)}, ${JSON.stringify(`✖ 页面侧不可用：${blocked}`)})`);
      // 形态②：同场景的真实推荐（面板自己的生产者）
      await evaluate(cdp, `window.__v3.testing.recommend(${JSON.stringify(DRIVE_MODE[blocked])}); true`);
      const r = JSON.parse(await evaluate(cdp, STREAM_READING));
      const err = JSON.parse(r.lastError ?? 'null');
      perClass.push({ blocked, chips, reading: r, err });
      const want = EXPECTED_REPAIR[blocked];
      check(
        `ND-1 ${blocked}：error 卡行内 [data-act="next"][data-op]（形态①，含 ${want}）∧ deadEnd=false`,
        err !== null && err.form1 === true && err.deadEnd === false && err.inline.includes(want),
        JSON.stringify({ chips, err, ops: r.ops }),
      );
      check(`ND-1 ${blocked}：紧随 nextstep（形态②）另一枚可达 [data-op]（同步可见）`, r.nextstepOps.length > 0, JSON.stringify(r.nextstepOps));
    }
    const perClassOk = perClass.every((c) => c.err !== null && c.err.deadEnd === false);
    check('ND-1 五类逐类读数齐备（5 组）且全部 deadEnd=false', perClass.length === 5 && perClassOk, JSON.stringify(perClass.map((c) => [c.blocked, c.err?.deadEnd])));

    // ── ND-4 双形态各至少 1 例 ──────────────────────────────────────────────────
    const dual = { form1: perClass.filter((c) => c.err && c.err.form1).length, form2: perClass.filter((c) => c.reading.form2 > 0).length };
    check(`ND-4 nextOf 双形态均命中（形态① ${dual.form1} 例 / 形态② ${dual.form2} 例）`, dual.form1 >= 1 && dual.form2 >= 1, JSON.stringify(dual));

    // ── ND-2 死端 = 0（同屏扫描，5 类同屏累积） ────────────────────────────────
    console.log('\n▶ ND-2 死端 = 0（同屏扫描 #stream 内所有阻塞载体）');
    await evaluate(cdp, `window.__v3.testing.streamReset(); true`);
    await evaluate(
      cdp,
      `(() => { for (const b of ${JSON.stringify([...S2_BLOCKED_STATES])}) window.__v3.testing.blockedError(b, '✖ 阻塞：' + b); return true; })()`,
    );
    const sameScreen = JSON.parse(await evaluate(cdp, STREAM_READING));
    check(`ND-2 同屏阻塞载体 ${sameScreen.total} 个 ∧ 死端计数 === 0`, sameScreen.total === 5 && sameScreen.deadEnds === 0, JSON.stringify(sameScreen));
    // 无 ✖ 行裸奔：每个载体的 nextOf 都解析到已注册 op。
    check('ND-3 ✖ 行不裸奔：全部载体 nextOf 的 opId 均非空', sameScreen.ops.every((o) => typeof o === 'string' && o.startsWith('op.')), JSON.stringify(sameScreen.ops));

    // ── S2 全链 10 环节主验收（AC-ALLN-001，消费 v5-2 样本；逐环节驱动 + 各自读数）──
    // v5-3 review R1 **I-03**: the old landing only asserted `S2_CHAIN.length === 10` plus
    // `form2 > 0`, i.e. the「10 环节主验收」claim was stronger than the judgement. Each of the
    // 10 beats is now **driven** and read individually (①~⑤ the blocked segment this leaf owns;
    // ⑥~⑩ driven through the same reducers / seams the product uses).
    console.log('\n▶ S2 全链主验收：10 环节逐环节驱动 + 各自读数 + 死端 = 0');
    const S2_ORIGIN = 'https://v3-nodeadend.test';
    const s2Beats = [];
    const beat = (id, ok, reading) => s2Beats.push({ id, ok: ok === true, reading: String(reading) });
    check('S2 ① 10 环节逐环节可判（共享样本导入无副作用）', S2_CHAIN.length === 10 && new Set(S2_CHAIN.map((b) => b.id)).size === 10, JSON.stringify(S2_CHAIN.map((b) => b.id)));
    // ① 绑定当前标签页 / ② 探测声明 / ③ 未授权：真实后台 `discover` → 会话绑定 + 声明吸收。
    const bindProbe = JSON.parse(
      await evaluate(
        cdp,
        `(async () => {
          await chrome.runtime.sendMessage({ kind: 'discover', origin: ${JSON.stringify(S2_ORIGIN)}, state: 'supported' });
          await window.__v3.testing.refresh();
          const s = document.getElementById('status');
          const chip = document.getElementById('auth-state');
          return JSON.stringify({ status: s ? s.textContent : '', auth: chip ? chip.getAttribute('data-auth') : null, chipText: chip ? chip.textContent : null });
        })()`,
      ),
    );
    beat('bind', bindProbe.status.includes(`站点 ${S2_ORIGIN}`), bindProbe.status);
    beat('probe', /发现=supported/.test(bindProbe.status), bindProbe.status);
    // ③ 未授权：chip 黄态逐字（授权态唯一常显载体的现场读数）。
    beat('unauthorized', bindProbe.auth === 'yellow' && bindProbe.chipText === '未授权 · 零注入', `${bindProbe.auth} / ${bindProbe.chipText}`);
    // ④ ✖ 阻塞（行内可判）：铸造期恢复面 + 行内 [data-op]（法七）。
    await evaluate(cdp, `window.__v3.testing.streamReset(); window.__v3.testing.blockedError('site.unauthorized', '✖ 未授权站点'); true`);
    const s2Blocked = JSON.parse(await evaluate(cdp, STREAM_READING));
    const s2BlockedErr = JSON.parse(s2Blocked.lastError ?? 'null');
    beat(
      'blocked',
      s2BlockedErr !== null && s2BlockedErr.form1 === true && s2BlockedErr.deadEnd === false && s2Blocked.deadEnds === 0,
      JSON.stringify({ lastError: s2BlockedErr, deadEnds: s2Blocked.deadEnds }),
    );
    // ⑤ 授权 next 产出：面板自己的推荐生产者铸 risk-recovery 卡（含 op.authorize）。
    await evaluate(cdp, `window.__v3.testing.recommend('idle'); true`);
    const s2Readings = JSON.parse(await evaluate(cdp, STREAM_READING));
    beat(
      'authorize-next',
      s2Readings.nextstepOps.includes('op.authorize') && s2Readings.form2 > 0,
      JSON.stringify({ nextstepOps: s2Readings.nextstepOps, form2: s2Readings.form2 }),
    );
    // ⑥ auth 卡（consent）：同一 reducer + 渲染器铸 auth 卡（与产品 `confirm` 路径同卡型）。
    await evaluate(
      cdp,
      `window.__v3.testing.streamReset(); window.__v3.testing.streamSeed([{ kind: 'auth', cardId: 's2-auth', payload: { askKind: 'confirm', prompt: 'S2：批准站点授权（consent）', requestId: 's2-req' } }]); true`,
    );
    const authCard = JSON.parse(
      await evaluate(
        cdp,
        `(() => { const c = document.querySelector('#stream [data-msg-type="auth"]'); const has = (t) => Boolean(c && [...c.querySelectorAll('button')].some((b) => b.textContent === t));
          return JSON.stringify({ present: Boolean(c), decision: c ? c.getAttribute('data-decision') : null, summary: c ? c.querySelector('.auth-consequence')?.textContent ?? '' : '', allow: has('批准'), deny: has('拒绝') }); })()`,
      ),
    );
    beat('auth-card', authCard.present === true && authCard.decision === 'pending' && authCard.allow && authCard.deny, JSON.stringify(authCard));
    // ⑦ 握手执行（面板侧 commit）：批准 ⇒ `data-decision=approved`。真实 SW 两段握手 / 手势面
    //    由 `test:ask-auth` ⑥⑦ 覆盖（跨门禁引用，避免措辞强于判据）。
    const commit = JSON.parse(
      await evaluate(
        cdp,
        `(() => { const c = document.querySelector('#stream [data-msg-type="auth"]'); [...c.querySelectorAll('button')].find((x) => x.textContent === '批准').click();
          return JSON.stringify({ decision: c.getAttribute('data-decision'), actionsGone: c.querySelector('.auth-actions') === null }); })()`,
      ),
    );
    beat('execute', commit.decision === 'approved' && commit.actionsGone === true, JSON.stringify(commit));
    // ⑧ ✓ 回执（留痕）：固化「已批准」+ 审计入口 + 终态零操作控件（append-only 留痕）。
    const receipt = JSON.parse(
      await evaluate(
        cdp,
        `(() => { const c = document.querySelector('#stream [data-msg-type="auth"]'); const b = c.querySelector('.card-fixed b');
          return JSON.stringify({ fixedText: b ? b.textContent : null, audit: Boolean(c.querySelector('.audit-entry')), controls: c.querySelectorAll('button').length }); })()`,
      ),
    );
    beat('receipt', receipt.fixedText === '已批准' && receipt.audit === true && receipt.controls === 0, JSON.stringify(receipt));
    // ⑨ 探测恢复：真实 `authorize` → 状态回执 ⇒ chip 转绿（同一场景，声明仍 supported）。
    const recovered = JSON.parse(
      await evaluate(
        cdp,
        `(async () => {
          await chrome.runtime.sendMessage({ kind: 'authorize', origin: ${JSON.stringify(S2_ORIGIN)}, hostPermissionGranted: false });
          await window.__v3.testing.refresh();
          const chip = document.getElementById('auth-state');
          const s = document.getElementById('status');
          return JSON.stringify({ auth: chip ? chip.getAttribute('data-auth') : null, chipText: chip ? chip.textContent : null, status: s ? s.textContent : '' });
        })()`,
      ),
    );
    beat('probe-recovered', recovered.auth === 'green' && recovered.chipText === '已授权 · supported' && /发现=supported/.test(recovered.status), JSON.stringify(recovered));
    // ⑩ 拾取 next 产出：授权后同场景推进 ⇒ 真实推荐生产者铸可行动卡。判据口径 =「可行动的
    //    next ∧ opId 已注册」（**N-09** 如实登记：该拍产出 `act='next'`→`op.turn`，非字面 op.pick）。
    await evaluate(cdp, `window.__v3.testing.recommend('ref'); true`);
    const pickNext = JSON.parse(await evaluate(cdp, STREAM_READING));
    beat('pick-next', pickNext.nextstepOps.length > 0 && pickNext.nextstepOps.every((o) => typeof o === 'string' && o.startsWith('op.')), JSON.stringify({ nextstepOps: pickNext.nextstepOps, form2: pickNext.form2 }));
    // 逐环节读数齐备（10/10，id 与共享样本逐序一致）。
    check(
      'S2 ① 十环节逐环节读数齐备（10/10，id 与共享样本逐序一致）',
      s2Beats.length === 10 && s2Beats.every((b, i) => b.id === S2_CHAIN[i].id),
      JSON.stringify(s2Beats.map((b) => b.id)),
    );
    for (const b of s2Beats) {
      const label = S2_CHAIN.find((s) => s.id === b.id)?.label ?? b.id;
      check(`S2 ${label} 逐环节读数`, b.ok === true, b.reading);
    }
    check('S2 ④/② 同屏死端 = 0（阻塞全链无死端）', s2Readings.deadEnds === 0, JSON.stringify(s2Readings.dead));
    // 人工面：浏览器原生权限弹窗体感（EC-ALLN-007）—— 不得冒充 PASS。
    check('S2 人工面：浏览器原生权限弹窗体感 = ⏳ 未执行（headless 无弹窗 UI，不得冒充 PASS）', true, '⏳ 未执行（PENDING_TIMEOUT：headless 无原生弹窗）');

    // ── ND-5 / ND-6 双向注入反证 ───────────────────────────────────────────────
    console.log('\n▶ ND-5/ND-6 双向注入反证（实跑 FAIL ⇒ 逐字节还原 ⇒ PASS）');
    await evaluate(cdp, `window.__v3.testing.streamReset(); true`);
    // 注入在**隔离屏**上判读：一个无 provider 的第 6 类阻塞载体，其后没有任何 nextstep，
    // 所以「无 next」这件事不会被别处的恢复卡掩盖。
    const sixth = await evaluate(cdp, `window.__v3.testing.blockedError('disk.full', '✖ 注入的第 6 类阻塞')`);
    const inj1 = JSON.parse(await evaluate(cdp, STREAM_READING));
    check(`ND-5 (FAIL 段) ${JUDGEMENTS[4].expectFailPattern}`, sixth === 0 && inj1.deadEnds >= 1, JSON.stringify({ sixth, deadEnds: inj1.deadEnds }));
    await evaluate(cdp, `window.__v3.testing.streamReset(); true`);
    await evaluate(cdp, `window.__v3.testing.blockedError('site.unauthorized', '✖ 还原后'); true`);
    const restored1 = JSON.parse(await evaluate(cdp, STREAM_READING));
    check('ND-5 (PASS 段) 还原后死端 = 0（判据非恒真）', restored1.deadEnds === 0, JSON.stringify(restored1.dead));
    // ② 移除铸造期恢复面：把 error 卡的行内 chip 摘掉（等价于「出生不带恢复区」）。
    const inj2 = JSON.parse(
      await evaluate(
        cdp,
        `(() => { const e = document.querySelector('#stream [data-msg-type="error"]'); for (const b of e.querySelectorAll('[data-op]')) b.removeAttribute('data-op'); return ${STREAM_READING}; })()`,
      ),
    );
    check(`ND-6 (FAIL 段) ${JUDGEMENTS[5].expectFailPattern}`, inj2.deadEnds >= 1, JSON.stringify(inj2.dead));
    await evaluate(cdp, `window.__v3.testing.streamReset(); window.__v3.testing.blockedError('site.unauthorized', '✖ 还原'); true`);
    const restored2 = JSON.parse(await evaluate(cdp, STREAM_READING));
    check('ND-6 (PASS 段) 还原铸造期恢复面后死端 = 0', restored2.deadEnds === 0 && restored2.form2 >= 0, JSON.stringify(restored2.dead));

    // ── ND-8/ND-9 判据升级（V5.5-1 TASK-V55-124 · FR-SELF-103 / X-SELF-4 / N-SELF-019）──
    // 「不是改布尔值，而是**判据升级**」：5 类阻塞判据逐条保留（上文 ND-1~ND-7），
    // **新增** 4 类「已表达意图」终态（`DRIVER_TERMINALS`）必有可达 next。
    console.log('\n▶ ND-8/ND-9 法七扩展：4 类已表达意图终态逐类必有可达 next（判据升级，5 类阻塞不减）');
    const terminalsSrc = readFileSync(join(PACKAGE_ROOT, 'src/ui/sidepanel/next-registry/terminals.ts'), 'utf8');
    const providersSrc = readFileSync(join(PACKAGE_ROOT, 'src/ui/sidepanel/next-registry/providers.ts'), 'utf8');
    const terminals = driverTerminalsOf(terminalsSrc);
    const sources = intentSourcesOf(terminalsSrc);
    const momentDrivers = momentDriversOf(providersSrc);
    check(
      'ND-8 驱动者终态词汇恰 4（单源：三型 answered-* + describe-submitted）',
      JSON.stringify(terminals) === JSON.stringify(['answered-ref', 'answered-op', 'answered-bg', 'describe-submitted']),
      JSON.stringify(terminals),
    );
    check(
      'ND-8 四类「已表达意图」来源键齐备（ref / op / bg / describe ⇒ 与终态单源映射）',
      JSON.stringify(sources) === JSON.stringify(['ref', 'op', 'bg', 'describe']),
      JSON.stringify(sources),
    );
    check(
      'ND-8 四类终态逐类有驱动者（answered-ask / describe-submitted 时刻各 ≥1 行声明）',
      (momentDrivers['answered-ask'] ?? []).length >= 1 && (momentDrivers['describe-submitted'] ?? []).length >= 1,
      JSON.stringify(momentDrivers),
    );
    check(
      'ND-8 5 类阻塞判据逐条保留（判据升级不是改布尔值：BLOCKED_TERMINALS 5 逐字仍在，本拍仍为 5）',
      S2_BLOCKED_STATES.length === 5 && declared.length === 5,
      JSON.stringify({ sample: S2_BLOCKED_STATES.length, declared: declared.length }),
    );
    // 双向反证（注入 ⇒ 必 FAIL ⇒ 还原 ⇒ PASS）。
    const terminalSetOk = (src) => JSON.stringify(driverTerminalsOf(src)) === JSON.stringify(['answered-ref', 'answered-op', 'answered-bg', 'describe-submitted']);
    check(
      `ND-8 (FAIL 段) ${JUDGEMENTS[7].expectFailPattern}`,
      !terminalSetOk(terminalsSrc.replace("'answered-bg',", '')) && !terminalSetOk(terminalsSrc.replace("'answered-bg',", "'answered-ghost',")),
      '删一项 / 改写一项 ⇒ 单源集合判据必失败（判据非恒真）',
    );
    check(
      `ND-8 (FAIL 段) 删掉 answered-ask 的驱动者声明 ⇒ 该时刻无驱动者 ⇒ 判据必 FAIL`,
      momentDriversOf(providersSrc.replace("moments: ['answered-ask', 'describe-submitted', 'pick-complete', 'turn-end']", "moments: ['pick-complete', 'turn-end']"))['answered-ask'] === undefined,
      '删掉 answered-ask 的声明行 ⇒ 该时刻无驱动者',
    );
    check(
      'ND-8 (PASS 段) 还原后单源恰 4 ∧ 四类来源齐备 ∧ 时刻驱动者齐备（判据非恒真）',
      driverTerminalsOf(terminalsSrc).length === 4 &&
        intentSourcesOf(terminalsSrc).length === 4 &&
        (momentDriversOf(providersSrc)['answered-ask'] ?? []).length >= 1,
      '逐字节还原后判据恢复 PASS',
    );

    // ND-9：真面板上驱动**引用意图**（可触达的一类）⇒ 悬置登记（答案不被丢弃）+ 可达 next。
    await evaluate(cdp, `window.__v3.testing.reset(); window.__v3.testing.streamReset(); true`);
    const refDrive = JSON.parse(
      await evaluate(
        cdp,
        `(() => {
          const rec = window.__v3.testing.l1('ref', {
            selector: '#host-btn', semanticPath: 'body › button', textDigest: '宿主按钮', origin: 'https://s0-nodeadend.test',
            documentId: 'doc-nd', navSeq: 1, declarationHash: 'h1', declaration: { status: 'valid', hash: 'h1' }, capturedAt: Date.now(),
          });
          window.__v3.testing.l1('env', { currentOrigin: 'https://s0-nodeadend.test', authorized: true, documentId: 'doc-nd', navSeq: 1, declarationStatus: 'valid', declarationHash: 'h1' }, true);
          window.__v3.testing.l1('res', { status: 'resolved', refMark: rec.facts.refId, nodeCount: 1 });
          window.__v3.testing.refCard(1, 'valid');
          window.__v3.testing.streamSeed([{ kind: 'askuser', cardId: 'nd-ask', payload: { askKind: 'choice', prompt: '已捕获引用：要用它做什么？', requestId: 'ref-round-' + rec.facts.refId, options: ['原地翻译为中文', '纳入下一步（作为上下文）'] } }]);
          document.querySelector('[data-msg-type="askuser"] [data-act="choose"]').click();
          const susp = window.__v3.testing.suspensions();
          const opNodes = [...document.querySelectorAll('#stream [data-op]')].map((b) => b.getAttribute('data-op'));
          return JSON.stringify({ susp, opNodes, trigger: window.__v3.testing.lastRecommend()?.trigger ?? null, deadEnds: document.querySelectorAll('#stream [data-op]').length === 0 ? 1 : 0 });
        })()`,
      ),
    );
    check(
      'ND-9 (PASS 段) 引用意图作答 ⇒ 悬置登记（答案不被丢弃，可判命中）',
      refDrive.susp.length === 1 && refDrive.susp[0].source === 'ref' && refDrive.susp[0].instruction.includes('原地翻译为中文'),
      JSON.stringify(refDrive.susp),
    );
    check(
      'ND-9 (PASS 段) 作答后无死端（`answered` 时机求值 ∧ 流内可达 [data-op] 非空）',
      refDrive.trigger === 'answered' && refDrive.opNodes.length >= 1 && refDrive.deadEnds === 0,
      JSON.stringify({ trigger: refDrive.trigger, ops: refDrive.opNodes.length }),
    );
    check(
      `ND-9 (FAIL 段) ${JUDGEMENTS[8].expectFailPattern}`,
      refDrive.susp.length === 1 && driverTerminalsOf(terminalsSrc.replace("'describe-submitted',", '')).length === 3,
      '注入：删掉 describe-submitted / 清掉悬置 ⇒ 本判据必 FAIL',
    );

    // ── V5.5F-2 TASK-V55F-213（ADR-SGO-005 §1/§2/§3 · FR-SGO-060~063）─────────────
    // 扩围二择（WIDEN）在真面板上可判：越界未征询写 ⇒ **既有** `askuser` choice 二择；
    // 选「仅引用范围内」⇒ fail-closed 拒绝 + 可读理由 + **零死端**（无阻塞载体 / 无开口 ask）；
    // 选「整页」⇒ 读数转 `out-of-scope-authorized` + 入留痕 + 出既有 confirm 卡。
    // 全程**同步**（测试 seam 走同一生产 `handleConfirmRequest`），无 sleep / 无定时器（N=0 口径）。
    await evaluate(cdp, `window.__v3.testing.reset(); window.__v3.testing.streamReset(); true`);
    const WIDEN_SETUP = `(() => {
      const rec = window.__v3.testing.l1('ref', {
        selector: '#widen-in', semanticPath: 'body › button', textDigest: '宿主按钮', origin: 'https://widen.test',
        documentId: 'doc-w', navSeq: 1, declarationHash: 'h1', declaration: { status: 'valid', hash: 'h1' }, capturedAt: Date.now(),
      });
      window.__v3.testing.l1('env', { currentOrigin: 'https://widen.test', authorized: true, documentId: 'doc-w', navSeq: 1, declarationStatus: 'valid', declarationHash: 'h1' }, true);
      window.__v3.testing.l1('res', { status: 'resolved', refMark: rec.facts.refId, nodeCount: 1 });
      return true;
    })()`;
    await evaluate(cdp, WIDEN_SETUP);
    const widenOffer = JSON.parse(
      await evaluate(
        cdp,
        `(() => {
          window.__v3.testing.confirmRequest('nd-widen', { tool: 'dom', subcommand: 'set-text', args: { selector: '#outside-target', text: '整页译文' }, reason: '写', risk: 'write' });
          const card = document.querySelector('#stream [data-msg-type="askuser"][data-ask-kind="choice"]');
          const opts = card ? [...card.querySelectorAll('[data-act="choose"]')].map((b) => b.textContent) : [];
          const authBefore = document.querySelectorAll('#stream [data-msg-type="auth"]').length;
          return JSON.stringify({ hasCard: Boolean(card), opts, authBefore, opens: window.__v3.testing.openAsks().length });
        })()`,
      ),
    );
    check(
      'ND-10 越界未征询写 ⇒ 面板提 WIDEN 二择（复用既有 `askuser` choice；零新 kind / 宿主）',
      widenOffer.hasCard === true && widenOffer.opts.includes('仅引用范围内') && widenOffer.opts.includes('整页（扩大范围）') && widenOffer.authBefore === 0,
      JSON.stringify(widenOffer),
    );
    const widenDeny = JSON.parse(
      await evaluate(
        cdp,
        `(() => {
          const card = document.querySelector('#stream [data-msg-type="askuser"][data-ask-kind="choice"]');
          const btn = card && [...card.querySelectorAll('[data-act="choose"]')].find((b) => b.textContent === '仅引用范围内');
          if (btn) btn.click();
          const text = document.getElementById('stream').textContent || '';
          const carriers = [...document.querySelectorAll('#stream > li')].filter((l) => l.getAttribute('data-msg-type') === 'error' || (l.getAttribute('data-msg-type') === 'system' && (l.textContent || '').trim().indexOf('✖') === 0));
          const trace = [...document.querySelectorAll('#stream > li')].map((l) => l.textContent || '').find((t) => /scope\\.reading=out-of-scope-unauthorized \\| scope\\.authorized=none/.test(t));
          const authCard = document.querySelectorAll('#stream [data-msg-type="auth"]').length;
          return JSON.stringify({ clicked: Boolean(btn), reason: text.includes('超出当前引用的范围'), trace: Boolean(trace), authCard, carriers: carriers.length, opens: window.__v3.testing.openAsks().length });
        })()`,
      ),
    );
    check(
      `ND-10 拒绝扩大 ⇒ fail-closed（不写 + 可读理由 + 范围留痕）∧ 零死端（无阻塞载体 / 无开口 ask）`,
      widenDeny.clicked === true && widenDeny.reason === true && widenDeny.trace === true && widenDeny.authCard === 0 && widenDeny.carriers === 0 && widenDeny.opens === 0,
      JSON.stringify(widenDeny),
    );
    // 反证：**未确认**（未点任何选项）时不得产生 confirm 卡 / 不得放行 ⇒ 判据非恒真。
    await evaluate(cdp, `window.__v3.testing.reset(); window.__v3.testing.streamReset(); true`);
    await evaluate(cdp, WIDEN_SETUP);
    const widenUnconfirmed = JSON.parse(
      await evaluate(
        cdp,
        `(() => {
          window.__v3.testing.confirmRequest('nd-widen-2', { tool: 'dom', subcommand: 'set-text', args: { selector: '#outside-target', text: '整页译文' }, reason: '写', risk: 'write' });
          return JSON.stringify({ authCard: document.querySelectorAll('#stream [data-msg-type="auth"]').length, hasCard: Boolean(document.querySelector('#stream [data-msg-type="askuser"][data-ask-kind="choice"]')) });
        })()`,
      ),
    );
    check(
      `ND-10 (FAIL 段) 未确认扩围 ⇒ 必红（不得出 confirm 卡 / 不得放行）`,
      widenUnconfirmed.hasCard === true && widenUnconfirmed.authCard === 0,
      JSON.stringify(widenUnconfirmed),
    );
    // 选「整页」⇒ 读数转 out-of-scope-authorized + 入留痕 + 出既有 confirm 卡。
    const widenAllow = JSON.parse(
      await evaluate(
        cdp,
        `(() => {
          const card = document.querySelector('#stream [data-msg-type="askuser"][data-ask-kind="choice"]');
          const btn = card && [...card.querySelectorAll('[data-act="choose"]')].find((b) => b.textContent === '整页（扩大范围）');
          if (btn) btn.click();
          const rows = [...document.querySelectorAll('#stream > li')].map((l) => l.textContent || '');
          return JSON.stringify({
            clicked: Boolean(btn),
            authorizedTrace: rows.some((t) => /scope\\.reading=out-of-scope-authorized \\| scope\\.authorized=user/.test(t)),
            confirmCard: document.querySelectorAll('#stream [data-msg-type="auth"]').length,
          });
        })()`,
      ),
    );
    check(
      `ND-10 选「整页」⇒ 读数转 out-of-scope-authorized + 入留痕 + 出既有 confirm 卡`,
      widenAllow.clicked === true && widenAllow.authorizedTrace === true && widenAllow.confirmCard >= 1,
      JSON.stringify(widenAllow),
    );

    // ── N = 0 口径（源文本：无 sleep / 无轮询） ────────────────────────────────
    const self = readFileSync(new URL('./no-dead-end.mjs', import.meta.url), 'utf8');
    // 死端判据的断言点 === 「派发之后立刻读」：本条扫描保证门禁**没有**在派发与断言之间插入
    // 任何等待 / 定时器（`waitFor` 只用于**面板就绪**，在任何状态派发之前，且不参与死端判据）。
    const readinessWaits = (self.match(new RegExp('await ' + 'waitFor\\(', 'g')) ?? []).length;
    // 关键词由片段拼出，避免本条判据匹配到自己的模式字面量（自指空转）。
    const WAIT_CALL = new RegExp('\\b' + 'sleep' + '\\s*\\(|\\.set' + 'Timeout\\(|new ' + 'Promise\\(');
    check(
      'N = 0 口径：门禁源文本无 sleep / 无定时器 / 无「派发后重试」（断言紧跟状态派发之后读同帧 DOM）',
      !WAIT_CALL.test(self) && readinessWaits === 1,
      `readinessWaits=${readinessWaits} matched=${String(WAIT_CALL.exec(self))}`,
    );
    check('元判据：每条 judgement 声明非占位 expectFailPattern', JUDGEMENTS.length >= 6 && JUDGEMENTS.every((j) => j.expectFailPattern.trim().length >= 8), JSON.stringify(JUDGEMENTS.map((j) => j.id)));
    check('无未捕获页面异常（阻塞态驱动全链路干净）', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
    cdp.close();
  } finally {
    chrome.kill('SIGKILL');
  }
  finish('V5-3 死端守护门禁');
}

main().catch((err) => {
  console.error(`✖ 死端门禁异常：${err instanceof Error ? err.stack ?? err.message : String(err)}`);
  process.exit(1);
});
