/**
 * V5.5-1 **TASK-V55-122** (ADR-V55-005 §3/§4 · FR-SELF-130/131 · **AC-SELF-001** ·
 * R-V55-111 / R-SELF-908) — the **S0 自驱链 Chromium 面门禁**（真面板）。
 *
 * ── 分层接线（ADR-V55-005 §3，逐字）──────────────────────────────────────────
 *
 * | 分支 | 本门禁断言 | 交付叶 |
 * |---|---|---|
 * | **A（已配置 LLM）机制侧** | ⑤ 之后 **答案 ⇒ 驱动**：悬置里答案可判命中 + 流内出现可行动候选（`[data-act="next"][data-op]`） | **v55-1**（本门禁） |
 * | A（续） | 「**无需用户再敲任何键** ⇒ 自动成回合」+ 留痕三要素 + **护栏在链路上可判** + 关断复核 | **v55-3**（本门禁 **⑱**：`S0C-8` / `S0C-9`） |
 * | **B（未配置 LLM）识别侧** | ⑤ 之后**未配置能被识别为终态 + 有驱动者**（`op.llm-config` 候选，零 LLM 调用） | **v55-1**（本门禁）+ v55-2（引导内容） |
 *
 * 两侧**独立计数**（`branchA` / `branchB`），**禁互相掩盖**（R-V55-111）。
 *
 * ── 样本单源 ─────────────────────────────────────────────────────────────────
 *
 * 链的 id / 顺序 / 答案文本 / 分支分类全部来自 `./fixtures/s0-chain.mjs`（**与 node 面
 * 同一份**，禁第二份样本）；本门禁只注入「真面板的读数」。
 *
 * Run: `node test/ui/s0-self-driven.mjs`（一次一个 Chromium，串行；`finally` 自清）
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CHROME, DIST, PACKAGE_ROOT, check, connectCdp, evaluate, findTarget, finish, launch, openSidePanel, findOurServiceWorker, sleep, waitFor } from './_v3-helpers.mjs';
import { S0_ANSWER, S0_B_PARAM_KINDS, S0_B_STEPS, S0_CHAIN, s0BranchBProblems } from './fixtures/s0-chain.mjs';
// V5.5F-1 TASK-V55F-124（W4，纯追加 import）：S0′ 范围内核样本（**与 node 面同一份**）。
import { S0P_ANCHOR_SELECTOR, S0P_BEATS, S0P_ITEMS, S0P_REF_NUM, s0PChain, s0pProblems } from './fixtures/s0-chain.mjs';
// V5.5-3 TASK-V55-316/317（W5，纯追加）：分支 A 端到端 + 护栏在链路上可判（**同一份样本**）。
import {
  S0_A_BEATS,
  S0_A_ON_CHAIN_REASONS,
  S0_A_SLOT,
  s0BranchABeats,
  s0BranchAProblems,
} from './fixtures/s0-chain.mjs';

/** One judgement per line of the gate (`expectFailPattern` = the readable failure text). */
export const JUDGEMENTS = [
  { id: 'S0C-1-per-beat', expectFailPattern: 'S0 十环节必须逐环节可判（真面板读数）' },
  { id: 'S0C-2-answer-driven', expectFailPattern: '答案必须产生驱动（悬置可判命中 + 可行动候选）' },
  { id: 'S0C-3-branch-A', expectFailPattern: '分支 A 机制侧：已配置 ⇒ 答案 ⇒ 可行动候选 + 可达 next' },
  { id: 'S0C-4-branch-B', expectFailPattern: '分支 B 识别侧：未配置 ⇒ 识别为终态 + 有驱动者（零 LLM 调用）' },
  { id: 'S0C-5-no-silence', expectFailPattern: '⑤ 之后不得出现静默窗口（无归因 ∧ 无终态 ∧ 无 next）' },
  { id: 'S0C-6-shared-sample', expectFailPattern: 'S0 样本必须与 node 面共用同一份（链序 / 答案逐字）' },
  // V5.5-2 TASK-V55-214/215（W5）：分支 B 必判项（只增不减）—— 删自动续接 ⇒ 必 FAIL。
  { id: 'S0C-7-branch-B-mandatory', expectFailPattern: '分支 B 必判项：未配置 ⇒ 引导 4 步 ⇒ 掩码卡 ⇒ 完成 ⇒ 自动续接 ⇒ 留痕（删自动续接 ⇒ FAIL）' },
  // V5.5-3 TASK-V55-316/317（W5）：分支 A 端到端（零按键）+ 护栏在链路上可判（只增不减）。
  { id: 'S0C-8-branch-A-end-to-end', expectFailPattern: '分支 A 端到端：已配置 ⇒ 答案后**零按键** ⇒ 经 op.turn 槽自动成回合 + 三要素留痕（删 pressCandidate 门 ⇒ FAIL）' },
  { id: 'S0C-9-guard-on-chain', expectFailPattern: '护栏在链路上真实可判：越限 ⇒ 可读抑制行 ∧ 真的没发起 ∧ 关断 ⇒ 主题① 仍放行（删护栏缝 ⇒ FAIL）' },
  // V5.5F-1 TASK-V55F-124（W4，只增不减）：S0′ 范围内核（`ty.md` 原案重放）的真面板面。
  { id: 'S0C-10-s0p-ref-anchor', expectFailPattern: 'S0′：真面板回合载荷含引用事实 ∧ 系统段追加段在位 ∧ 合成锚在真 DOM 恰 1 命中 ∧ 范围留痕行独立成行' },
];

/**
 * 〖I-03（v55-1 review R1）〗本门禁**实际驱动**的十拍（`id` = 共享样本 `S0_CHAIN[i].id`）。
 *
 * 为什么需要它：`S0C-1` 原先只在 `JUDGEMENTS` 里声明、**没有任何 check 引用**（Chromium 面
 * 只把「10」当常量查了一次 `S0_CHAIN.length === 10`），于是「样本改名 / 换序」在 Chromium
 * 面无感（对齐 `no-dead-end.mjs` 的 `s2Beats.every((b, i) => b.id === S2_CHAIN[i].id)` 机核）。
 * 这里把「本面真的驱动的十拍」显式登记，并用 {@link beatCheck} 强制：每一拍的读数断言必须
 * 声明在该表内（未声明即抛错），且收尾时每一拍必须真的被读过（0 读数 ⇒ S0C-1 必红）。
 */
export const PANEL_BEATS = Object.freeze([
  { id: 'bind' },
  { id: 'probe' },
  { id: 'pick-ref' },
  { id: 'ask-registered' },
  { id: 'answered' },
  { id: 'drive-produced' },
  { id: 'branch' },
  { id: 'auto-round' },
  { id: 'onboard-resume' },
  { id: 'terminal' },
]);
/** 每拍的真面板读数断言数（收尾机核：每拍 ≥1）。 */
const beatHits = new Map();
/** 逐拍断言的唯一入口：未登记的环节 id 直接 loud 失败（不得绕过 S0C-1 的机核）。 */
function beatCheck(beatId, label, ok, detail) {
  if (!PANEL_BEATS.some((b) => b.id === beatId)) {
    throw new Error(`S0 Chromium 门禁：环节 id「${beatId}」未登记进 PANEL_BEATS（先登记再断言）`);
  }
  beatHits.set(beatId, (beatHits.get(beatId) ?? 0) + 1);
  return check(`[${beatId}] ${label}`, ok, detail);
}

/**
 * 〖V5.5-2 TASK-V55-214〗分支 B 的**必判项**（未配置 ⇒ 引导 4 步 ⇒ 掩码卡 ⇒ 完成 ⇒
 * 自动续接 ⇒ 留痕）。与 `PANEL_BEATS` 同纪律：id 逐序取自共享样本 `S0_B_STEPS`
 * （本面**不写第二份**），未登记 / 登记了却没读 ⇒ 都必红（**独立计数**，R-V55-111）。
 */
export const PANEL_B_BEATS = Object.freeze(S0_B_STEPS.map((s) => ({ id: s.id })));
const bBeatHits = new Map();
function bBeatCheck(beatId, label, ok, detail) {
  if (!PANEL_B_BEATS.some((b) => b.id === beatId)) {
    throw new Error(`S0 Chromium 门禁：分支 B 环节 id「${beatId}」未登记进 PANEL_B_BEATS（先登记再断言）`);
  }
  bBeatHits.set(beatId, (bBeatHits.get(beatId) ?? 0) + 1);
  return check(`[B:${beatId}] ${label}`, ok, detail);
}

/**
 * 〖V5.5-3 TASK-V55-316〗分支 A 端到端的六拍 —— id 逐序取自共享样本 `S0_A_BEATS`（本面
 * **不写第二份**），与 `PANEL_B_BEATS` 同纪律：未登记 / 登记了却没读 ⇒ 都必红。
 */
export const PANEL_A_BEATS = Object.freeze(s0BranchABeats());
const aBeatHits = new Map();
function aBeatCheck(beatId, label, ok, detail) {
  if (!PANEL_A_BEATS.some((b) => b.id === beatId)) {
    throw new Error(`S0 Chromium 门禁：分支 A 环节 id「${beatId}」未登记进 PANEL_A_BEATS（先登记再断言）`);
  }
  aBeatHits.set(beatId, (aBeatHits.get(beatId) ?? 0) + 1);
  return check(`[A:${beatId}] ${label}`, ok, detail);
}

async function main() {
  console.log(`▶ chrome: ${CHROME}`);
  console.log(`▶ dist:   ${DIST}`);
  const { chrome, base } = await launch({ tag: 's0-self-driven', extDir: DIST, portRange: [9840, 9920] });
  try {
    const sw = await findOurServiceWorker(base);
    if (!sw) throw new Error('web-cli plugin service worker 不可达');
    const { cdp } = await openSidePanel(sw.cdp, base);
    const pageErrors = [];
    cdp.on('Runtime.exceptionThrown', (p) => pageErrors.push(p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text));
    await evaluate(cdp, `document.getElementById('stream') ? '1' : ''`, 120);
    await evaluate(cdp, `window.__v3.testing.reset(); true`);

    // ── S0C-6 样本单源（链序 / 答案逐字取自共享样本）───────────────────────────
    check('S0C-6 S0 样本单源：10 环节 · 答案逐字「原地翻译为中文」· A/B 双分支', S0_CHAIN.length === 10 && S0_ANSWER === '原地翻译为中文', `chain=${S0_CHAIN.length} answer=${S0_ANSWER}`);
    const fixtureSrc = readFileSync(join(PACKAGE_ROOT, 'test/ui/fixtures/s0-chain.mjs'), 'utf8');
    const nodeGateSrc = readFileSync(join(PACKAGE_ROOT, 'test/s0-self-driven-chain.test.ts'), 'utf8');
    check(
      'S0C-6 两面共用同一份样本（node 门禁动态引入同一文件，无第二份）',
      nodeGateSrc.includes("test/ui/fixtures/s0-chain.mjs") && fixtureSrc.includes('S0_CHAIN'),
      'node/Chromium 两侧均引用 fixtures/s0-chain.mjs',
    );

    const S0_ORIGIN = 'https://s0-self-driven.test';

    // ── S0C-1 十环节逐序机核（共享样本 id 机序；样本改名 / 换序 ⇒ 必红）────────
    const sampleBeats = S0_CHAIN.map((b) => b.id);
    check(
      'S0C-1 十环节逐序与共享样本一致（id 机序，非「长度 = 10」常量）',
      PANEL_BEATS.length === sampleBeats.length && PANEL_BEATS.every((b, i) => b.id === sampleBeats[i]),
      JSON.stringify({ panel: PANEL_BEATS.map((b) => b.id), sample: sampleBeats }),
    );

    // ── ① 绑定 ──────────────────────────────────────────────────────────────
    const bind = JSON.parse(
      await evaluate(
        cdp,
        `(async () => {
          await chrome.runtime.sendMessage({ kind: 'discover', origin: ${JSON.stringify(S0_ORIGIN)}, state: 'supported' });
          await window.__v3.testing.refresh();
          const s = document.getElementById('status');
          return JSON.stringify({ status: s ? s.textContent : '' });
        })()`,
      ),
    );
    beatCheck('bind', `① 绑定：状态栏显示站点 ${S0_ORIGIN}`, bind.status.includes(S0_ORIGIN), bind.status);

    // ── ② 探测 ──────────────────────────────────────────────────────────────
    beatCheck('probe', '② 探测：发现 = supported（声明已吸收）', /发现=supported/.test(bind.status), bind.status);

    // ── ②' 授权（真机 22:49 的现场前提：站点已授权 ⇒ 恢复类不抢推荐面）────────
    const authz = JSON.parse(
      await evaluate(
        cdp,
        `(async () => {
          await chrome.runtime.sendMessage({ kind: 'authorize', origin: ${JSON.stringify(S0_ORIGIN)}, hostPermissionGranted: false });
          await window.__v3.testing.refresh();
          const chip = document.getElementById('auth-state');
          return JSON.stringify({ auth: chip ? chip.getAttribute('data-auth') : null, text: chip ? chip.textContent : null });
        })()`,
      ),
    );
    beatCheck('probe', '② 授权：站点授权态绿（恢复类不再抢推荐面）', authz.auth === 'green', JSON.stringify(authz));

    // ── ③ 拾取引用（出生有效：validCount ≥ 1）────────────────────────────────
    const pick = JSON.parse(
      await evaluate(
        cdp,
        `(() => {
          const origin = ${JSON.stringify(S0_ORIGIN)};
          const rec = window.__v3.testing.l1('ref', {
            selector: '#host-btn', semanticPath: 'body › button', textDigest: '宿主按钮', origin,
            documentId: 'doc-s0', navSeq: 1,
            declarationHash: 'h1', declaration: { status: 'valid', hash: 'h1' }, capturedAt: Date.now(),
          });
          window.__v3.testing.l1('env', { currentOrigin: origin, authorized: true, documentId: 'doc-s0', navSeq: 1, declarationStatus: 'valid', declarationHash: 'h1' }, true);
          window.__v3.testing.l1('res', { status: 'resolved', refMark: rec.facts.refId, nodeCount: 1 });
          window.__v3.testing.refCard(1, 'valid');
          const report = window.__v3.testing.l1('report');
          return JSON.stringify({ refId: rec.facts.refId, verdict: report.refs.slice(-1)[0].verdict, valid: report.counts });
        })()`,
      ),
    );
    beatCheck('pick-ref', '③ 拾取引用：出生有效（verdict=valid，validCount ≥ 1）', pick.verdict === 'valid' && pick.valid >= 1, JSON.stringify(pick));
    const askId = `ref-round-${pick.refId}`;

    // ── ④ ask 卡登记（openAsks ∋ ref-round-<refId>）──────────────────────────
    await evaluate(
      cdp,
      `window.__v3.testing.streamSeed([{ kind: 'askuser', cardId: 's0-ask', payload: { askKind: 'choice', prompt: '已捕获引用：要用它做什么？', requestId: ${JSON.stringify(askId)}, options: [${JSON.stringify(S0_ANSWER)}, '纳入下一步（作为上下文）', '先看引用证据'] } }]); true`,
    );
    const registered = JSON.parse(
      await evaluate(
        cdp,
        `JSON.stringify({
           open: window.__v3.testing.openAsks(),
           requestIds: window.__v3.testing.payloads().map((p) => p.requestId).filter(Boolean),
         })`,
      ),
    );
    beatCheck(
      'ask-registered',
      '④ ask 卡登记：恰一张开口 ask ∧ requestId = ref-round-<refId>',
      registered.open.length === 1 && registered.requestIds.includes(askId),
      JSON.stringify(registered),
    );

    // ── ⑤ 作答「原地翻译为中文」且卡已结算（真点击 → submitAskFor → applyRefAction）──
    await evaluate(cdp, `document.querySelector('[data-msg-type="askuser"] [data-act="choose"]').click(); true`);
    await sleep(300);
    const answered = JSON.parse(
      await evaluate(
        cdp,
        `(() => { const c = document.querySelector('[data-msg-type="askuser"]');
          return JSON.stringify({ answered: c ? c.getAttribute('data-answered') : null, open: window.__v3.testing.openAsks() }); })()`,
      ),
    );
    beatCheck('answered', '⑤ 作答：卡已结算（data-answered=true ∧ openAsks 归零）', answered.answered === 'true' && answered.open.length === 0, JSON.stringify(answered));

    // ── ⑥ 答案产生驱动（★ 题眼）──────────────────────────────────────────────
    const susp = JSON.parse(await evaluate(cdp, `JSON.stringify(window.__v3.testing.suspensions())`));
    const last = JSON.parse(await evaluate(cdp, `JSON.stringify(window.__v3.testing.lastRecommend())`));
    const nextChipCount = await evaluate(
      cdp,
      `(() => { const card = document.querySelector('#stream [data-msg-type="nextstep"]'); if (!card) return 0; return card.querySelectorAll('[data-op]').length; })()`,
    );
    beatCheck(
      'drive-produced',
      '⑥ 答案 ⇒ 驱动：答案进入悬置任务输入（可判命中）',
      susp.length === 1 && susp[0].source === 'ref' && susp[0].kind === 'answered' && susp[0].instruction.includes(S0_ANSWER),
      JSON.stringify(susp),
    );
    beatCheck('drive-produced', '⑥ 答案 ⇒ 驱动：`answered` 时机在唯一求值入口内跑过（lastRecommend.trigger）', last?.trigger === 'answered', JSON.stringify(last));
    beatCheck('drive-produced', '⑥ 答案 ⇒ 驱动：流内出现可行动候选（nextstep 卡内的 [data-op]）', nextChipCount >= 1, String(nextChipCount));

    // ── ⑦ 分支 A（已配置）：机制侧（答案 ⇒ 可行动候选 + 可达 next）───────────
    // 自动求值（真面板）：答案触发的**那一次** `'answered'` 求值必须产出候选。
    // 注（环境事实登记）：headless 下被绑定站点的**探测相位**可能停在等待态（无夹具站点的
    // 内容脚本在场），此时 `probe` 恢复类（priority 0）会**正确地**优先于 `ref-action`（2）——
    // 因此这里断言「触发时机 + 有可达 next + 规则 ∈ 闭集」，而「已配置 ⇒ 恰好是 ref-action」
    // 这条 ctx→驱动者映射由 node 面（S0N-1/S0N-4，受控 ctx）机核。
    const branchA = { susp: susp.length, trigger: last?.trigger ?? null, rule: last?.rule ?? null, next: nextChipCount };
    beatCheck(
      'branch',
      '⑦A 机制侧：`answered` 时机在唯一求值入口内产出候选（trigger === answered ∧ 可达 next）',
      branchA.trigger === 'answered' && branchA.next >= 1,
      JSON.stringify(branchA),
    );
    beatCheck(
      'branch',
      '⑦A 机制侧：规则 ∈ 候选闭集（环境探测相位可让恢复类优先，见上方登记）',
      ['ref-action', 'risk-recovery', 'capability-discovery'].includes(String(branchA.rule)),
      JSON.stringify(branchA),
    );
    // 机制侧的本体：答案的悬置在场时，`ref-action` 候选取自**同一注册表**且可达（op.turn）。
    const mech = JSON.parse(await evaluate(cdp, `window.__v3.testing.recommend('idle')`));
    const mechOps = JSON.parse(
      await evaluate(cdp, `JSON.stringify([...document.querySelectorAll('#stream [data-msg-type="nextstep"] [data-op]')].map((b) => b.getAttribute('data-op')))`),
    );
    beatCheck(
      'branch',
      '⑦A 机制侧：ref-action 候选可达（规则 = ref-action ∧ 含 op.turn）',
      mech.rule === 'ref-action' && mechOps.includes('op.turn'),
      JSON.stringify({ mech, mechOps }),
    );

    // ── ⑦ 分支 B（未配置）：识别侧（未配置 ⇒ 识别 + 有驱动者；零 LLM 调用）────
    const beforeUsers = await evaluate(cdp, `document.querySelectorAll('#stream [data-msg-type="user"]').length`);
    const llm = JSON.parse(await evaluate(cdp, `window.__v3.testing.streamReset(); window.__v3.testing.recommend('llm')`));
    const llmOps = JSON.parse(
      await evaluate(cdp, `JSON.stringify([...document.querySelectorAll('#stream [data-msg-type="nextstep"] [data-op]')].map((b) => b.getAttribute('data-op')))`),
    );
    const afterUsers = await evaluate(cdp, `document.querySelectorAll('#stream [data-msg-type="user"]').length`);
    const branchB = { produced: llm.produced, rule: llm.rule, ops: llmOps, usersBefore: beforeUsers, usersAfter: afterUsers };
    beatCheck('onboard-resume', '⑦B 识别侧：产出候选（未配置被识别为可行动态）', branchB.produced === 1, JSON.stringify(branchB));
    beatCheck('onboard-resume', '⑦B 识别侧：候选含 op.llm-config（有驱动者，确定性）', branchB.ops.includes('op.llm-config'), JSON.stringify(branchB));
    beatCheck('onboard-resume', '⑦B 识别侧：零 LLM 调用（识别侧无用户回合 / 无网络面）', branchB.usersBefore === branchB.usersAfter, JSON.stringify(branchB));

    // ── ⑧ 分支 A 续：机制侧的可判命中（答案作为回合输入）─────────────────────
    const canJudge = JSON.parse(await evaluate(cdp, `JSON.stringify({ susps: window.__v3.testing.suspensions() })`));
    beatCheck(
      'auto-round',
      '⑧ 机制侧：答案作为「悬置任务输入」可判命中（不作无按键端到端断言，后者属 v55-3）',
      canJudge.susps.some((s) => s.instruction.includes(S0_ANSWER)),
      JSON.stringify(canJudge),
    );

    // ── ⑨ 终局：静默窗口 = 0 ∧ 死端 = 0（真面板读数）────────────────────────
    const terminal = JSON.parse(
      await evaluate(
        cdp,
        `(() => {
          const hosts = [...document.querySelectorAll('#stream > li')];
          const carriers = hosts.filter((l) => l.getAttribute('data-msg-type') === 'error' || (l.getAttribute('data-msg-type') === 'system' && (l.textContent || '').trim().indexOf('✖') === 0));
          const opNodes = [...document.querySelectorAll('#stream [data-op]')];
          const cards = [...document.querySelectorAll('#stream [data-msg-type="nextstep"]')];
          return JSON.stringify({ carriers: carriers.length, opNodes: opNodes.length, cards: cards.length, asks: window.__v3.testing.openAsks() });
        })()`,
      ),
    );
    beatCheck('terminal', '⑩ 终局：无可达 next = 0（流内 [data-op] 非空）+ 无阻塞裸奔', terminal.opNodes >= 1 && terminal.carriers === 0, JSON.stringify(terminal));
    beatCheck('terminal', '⑩ 终局：openAsks 归零（无「永远处理中」）', terminal.asks.length === 0, JSON.stringify(terminal.asks));
    beatCheck('terminal', '⑩ 环境干净：无未捕获页面异常', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));

    // 人工面（不得冒充 PASS）：主动接手**体感** / 是否被突然打断 / 引导文案可读性。
    check('S0 人工面：主动接手体感 / 打断感 / 引导文案可读性 = ⏳ 未执行（headless 不可合成，不得冒充 PASS）', true, '⏳ 未执行（并列 v5 人工面 9 项，不覆盖）');

    // ═════════════════════════════════════════════════════════════════════════
    // ⑱ V5.5-3 TASK-V55-316/317（ADR-V55-005 §3 · ADR-V55-009 §1/§3/§4 · FR-SELF-060/064/
    //    070/090~094 · **AC-SELF-001/008** · R-V55-111）—— 分支 A **端到端收口**：
    //    已配置 ⇒ 答案后**零按键** ⇒ `pressCandidate` 经**既有** `op.turn` 槽成回合 ⇒
    //    思考/命令行 ⇒ 续流；并且**护栏在链路上真实可判**（越限 ⇒ 可读抑制行 ∧ 真的没发起；
    //    关断 ⇒ 主题① 仍放行）。样本与判据取自共享 `./fixtures/s0-chain.mjs`（禁第二份）。
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n▶ ⑱ 分支 A 端到端（零按键自动成回合）+ 护栏在链路上可判 + 关断复核');

    // ── 样本单源：本面登记的分支 A 六拍必须逐序等于共享样本；两分支环节集不相交 ──
    check(
      'S0C-8 分支 A 六拍逐序与共享样本一致（id 机序，非「数量」常量）',
      PANEL_A_BEATS.length === S0_A_BEATS.length && PANEL_A_BEATS.every((b, i) => b.id === S0_A_BEATS[i].id),
      JSON.stringify({ panel: PANEL_A_BEATS.map((b) => b.id), sample: S0_A_BEATS.map((b) => b.id) }),
    );
    const aOverlap = PANEL_A_BEATS.filter((b) => PANEL_B_BEATS.some((x) => x.id === b.id)).map((b) => b.id);
    check('S0C-8 A / B 两分支环节集不相交（各自独立计数，禁互相掩盖）', aOverlap.length === 0, JSON.stringify(aOverlap));

    // ── ① 已配置：`llm-status` 由夹具应答（真面板读回 `LLM：Key ✅`）；`chat` 记录 + 应答 ──
    //    本段的 `chat` 只在 `__s0ASwallowChat` 置位时被接住（headless 无网络面）；标志在
    //    本段结束时复位，后续分支 B 的第一条真人回合仍走**真实 SW**（`llm-unconfigured`）。
    await evaluate(
      cdp,
      `(() => {
        if (window.__s0AStub) return true;
        const orig = chrome.runtime.sendMessage.bind(chrome.runtime);
        window.__s0AChat = [];
        window.__s0ASwallowChat = false;
        chrome.runtime.sendMessage = (msg, ...rest) => {
          const kind = msg && msg.kind;
          if (kind === 'llm-status') {
            return Promise.resolve({ ok: true, data: { configured: true, providerId: 'deepseek', providerName: 'DeepSeek', model: 'deepseek-chat' } });
          }
          if (kind === 'chat') {
            window.__s0AChat.push(msg);
            if (window.__s0ASwallowChat === true) return Promise.resolve({ ok: true, data: {} });
          }
          return orig(msg, ...rest);
        };
        window.__s0AStub = true;
        return true;
      })()`,
    );
    await evaluate(cdp, `window.__s0ASwallowChat = true; true`);
    await evaluate(cdp, `window.__v3.testing.refresh().then(() => true)`);
    // `llm-status` 只在「面板加载 / 窗口获焦 / 连接测试」三处回读（`refreshState` 不含它）——
    // 因此这里用**产品自己的**获焦回读路径（`window focus` 监听）把夹具摘要喂进面板。
    await evaluate(cdp, `window.dispatchEvent(new Event('focus')); true`);
    await sleep(400);
    const aConfigured = JSON.parse(
      await evaluate(cdp, `JSON.stringify({ llm: (document.getElementById('llm-status') || {}).textContent || '' })`),
    );
    aBeatCheck('configured', '① 已配置：面板读到「LLM：Key ✅」（主题② 前提：配置判据 = 唯一分流依据）', /LLM：Key ✅/.test(aConfigured.llm), JSON.stringify(aConfigured));

    // ── 真面板：绑定 / 授权 / 拾取引用 / ask 卡 / 作答（与上文同一真路径，零旁路）──
    await evaluate(cdp, `window.__v3.testing.reset(); true`);
    await evaluate(
      cdp,
      `(async () => {
        await chrome.runtime.sendMessage({ kind: 'discover', origin: ${JSON.stringify(S0_ORIGIN)}, state: 'supported' });
        await chrome.runtime.sendMessage({ kind: 'authorize', origin: ${JSON.stringify(S0_ORIGIN)}, hostPermissionGranted: false });
        await window.__v3.testing.refresh();
        return true;
      })()`,
    );
    const aPick = JSON.parse(
      await evaluate(
        cdp,
        `(() => {
          const origin = ${JSON.stringify(S0_ORIGIN)};
          const rec = window.__v3.testing.l1('ref', {
            selector: '#host-btn', semanticPath: 'body › button', textDigest: '宿主按钮', origin,
            documentId: 'doc-s0a', navSeq: 1,
            declarationHash: 'h1', declaration: { status: 'valid', hash: 'h1' }, capturedAt: Date.now(),
          });
          window.__v3.testing.l1('env', { currentOrigin: origin, authorized: true, documentId: 'doc-s0a', navSeq: 1, declarationStatus: 'valid', declarationHash: 'h1' }, true);
          window.__v3.testing.l1('res', { status: 'resolved', refMark: rec.facts.refId, nodeCount: 1 });
          window.__v3.testing.refCard(1, 'valid');
          return JSON.stringify({ refId: rec.facts.refId });
        })()`,
      ),
    );
    const aAskId = `ref-round-${aPick.refId}`;
    await evaluate(
      cdp,
      `window.__v3.testing.streamSeed([{ kind: 'askuser', cardId: 's0a-ask', payload: { askKind: 'choice', prompt: '已捕获引用：要用它做什么？', requestId: ${JSON.stringify(aAskId)}, options: [${JSON.stringify(S0_ANSWER)}, '纳入下一步（作为上下文）'] } }]); true`,
    );
    // 「零按键」量具：作答之后对**候选 chip**（`[data-op]`）的任何点击都算一次按键。
    await evaluate(
      cdp,
      `(() => {
        window.__s0AOpClicks = 0;
        if (window.__s0AOpClickBound) return true;
        document.addEventListener('click', (e) => {
          const t = e.target && e.target.closest ? e.target.closest('#stream [data-op]') : null;
          if (t) window.__s0AOpClicks += 1;
        }, true);
        window.__s0AOpClickBound = true;
        return true;
      })()`,
    );
    const aChatBefore = await evaluate(cdp, `window.__s0AChat.length`);
    // 真点击作答（唯一的一处「用户动作」；之后**不再按任何键**）。
    await evaluate(cdp, `document.querySelector('[data-msg-type="askuser"] [data-act="choose"]').click(); true`);
    await sleep(500);
    const aFlow = JSON.parse(
      await evaluate(
        cdp,
        `(() => {
          const text = document.getElementById('stream').textContent;
          const users = [...document.querySelectorAll('#stream [data-msg-type="user"]')].map((el) => el.textContent);
          // 三要素留痕必须**独立成行**（不得把「抑制行」误读成「按下行」——抑制行是它的超集）。
          const rows = [...document.querySelectorAll('#stream > li')].map((el) => el.textContent || '');
          const TRACE = 'driver=ref-action | timing=answered | evidence=ref.validCount,ref.latestRefNum';
          return JSON.stringify({
            chats: window.__s0AChat.slice(),
            opClicks: window.__s0AOpClicks,
            trace: rows.some((t) => t.includes(TRACE) && !t.includes('suppressed=')),
            users,
            suppressed: (text.match(/suppressed=[a-z-]+/g) || []),
          });
        })()`,
      ),
    );
    const aChats = aFlow.chats.slice(aChatBefore);
    // ② 自动按下（恰 1 次；判据本体在共享样本，这里给真读数）。
    aBeatCheck('pressed', '② 答案 ⇒ `pressCandidate` 自动按下（留痕 `driver=ref-action | timing=answered`）', aFlow.trace === true, JSON.stringify({ trace: aFlow.trace, chats: aChats.length }));
    // ③ 经既有 `op.turn` 槽成回合 ∧ **零按键**（作答之后没有点过任何候选 chip）。
    aBeatCheck(
      'slot',
      '③ 经**既有** `op.turn` 槽自动成回合 ∧ **零按键**（作答后候选 chip 点击 = 0）',
      aChats.length === 1 && aFlow.opClicks === 0 && String(aChats[0]?.chat?.user ?? aChats[0]?.user ?? '').includes(S0_ANSWER),
      JSON.stringify({ chats: aChats.length, opClicks: aFlow.opClicks, msg: aChats[0] }),
    );
    // ④ 答案原文进入流内（`user` 行）——「答案不被丢弃」在真面板上的形态。
    aBeatCheck(
      'stream',
      '④ 思考/命令进入流内：答案原文成为一条 `user` 行（不再要求用户重说）',
      aFlow.users.some((t) => String(t).includes(S0_ANSWER)),
      JSON.stringify({ users: aFlow.users }),
    );

    // ── ④ 思考 / 命令：SW 侧投递 `command` → 面板出现命令行（真 `chat-result` 分派）──
    await evaluate(sw.cdp, `chrome.runtime.sendMessage({ kind: 'chat-result', variant: 'command', text: '正在按「${S0_ANSWER}」继续…' }).then(() => true).catch(() => true)`);
    await sleep(300);
    const aCommand = JSON.parse(
      await evaluate(cdp, `JSON.stringify({ commands: document.querySelectorAll('#stream [data-msg-type="command"]').length })`),
    );
    aBeatCheck('stream', '④ 思考/命令：`chat-result{command}` ⇒ 流内出现命令行（续流进流内）', aCommand.commands >= 1, JSON.stringify(aCommand));

    // ═════════════════════════════════════════════════════════════════════════
    // V5.5F-1 **TASK-V55F-124**（ADR-SGO-006 §3 · FR-SGO-090/094 · AC-SGO-013/014）
    //   —— **S0′ 范围内核**的真面板面（**只加断言不加文件**；`CHROMIUM_GATES === 9` 不动）。
    //   样本 + 判据取自共享 `./fixtures/s0-chain.mjs`（禁第二份）；本面只注入**真面板读数**。
    // ═════════════════════════════════════════════════════════════════════════
    // ③′ **回合载荷含引用事实**（真面板：`requestTurn` 的真实构建点；由 sendMessage 捕获面记录）。
    const s0pMsg = aChats[0] ?? {};
    const s0pRefs = Array.isArray(s0pMsg.refs) ? s0pMsg.refs : Array.isArray(s0pMsg?.chat?.refs) ? s0pMsg.chat.refs : [];
    // 序号取**真拾取**的 refId 序号（`ty.md` 原案 = 1；本门禁前面已拾取过一次，故面板给的
    // 是下一个序号）—— 判据是「载荷里的 refNum 与本次拾取同源」，样本侧 `S0P_REF_NUM = 1`
    // 由 node 面机核（sample canonical）。
    const s0pExpectNum = Number(String(aPick.refId).slice(4));
    const s0pRef = s0pRefs.find((r) => r && r.refNum === (Number.isFinite(s0pExpectNum) && s0pExpectNum > 0 ? s0pExpectNum : S0P_REF_NUM)) ?? null;
    check(
      `S0P-C1 真面板回合载荷含引用事实（refNum=${s0pExpectNum} 与本次拾取同源 ∧ refState=valid ∧ selector 非空；样本 canonical = ${S0P_REF_NUM}）`,
      Boolean(s0pRef) && s0pRef.refState === 'valid' && String(s0pRef.selector ?? '').length > 0,
      JSON.stringify({ ref: s0pRef, refs: s0pRefs, keys: Object.keys(s0pMsg) }),
    );
    // ④′ **系统段追加段在位**（真产物字节）：构建后的 SW bundle 必须同时承载**基座条款**与
    //     **法则引导**追加段文案，且真源工厂 = `SYSTEM_PROMPT + refContextSegment(refs)`。
    //     （运行期「零引用 ⇒ system 逐字等于基座」的等价由 node 面 S0P-2 用生产模块判定。）
    const swSource = readFileSync(join(PACKAGE_ROOT, 'src/background/service-worker.ts'), 'utf8');
    const swBundle = readFileSync(join(DIST, 'background.js'), 'utf8');
    const baseClause = 'Never reveal secrets.';
    const guidanceNeedle = '引用'; // 追加段的法则引导文案（`REF_SCOPE_GUIDANCE`）含中文「引用」
    check(
      'S0P-C2 系统段 = 基座 + 追加段在位（真产物字节：基座条款 ∧ 引导文案 ∧ 真源工厂 `SYSTEM_PROMPT + refContextSegment(refs)`）',
      swSource.includes('SYSTEM_PROMPT + refContextSegment(refs)') && swBundle.includes(baseClause) && swBundle.includes(guidanceNeedle),
      JSON.stringify({ factory: swSource.includes('SYSTEM_PROMPT + refContextSegment(refs)'), base: swBundle.includes(baseClause), append: swBundle.includes(guidanceNeedle) }),
    );
    // ⑥′ **合成锚在真 DOM 上恰 1 命中**（写目标的单节点保证；多命中 ⇒ 2，判据非恒真）。
    //     —— 用真实 Chromium 页面（`data:` URL）承载标记节点，按合成锚选择器计数。
    const anchor = S0P_ANCHOR_SELECTOR;
    const pageUrl = `data:text/html,${encodeURIComponent(`<div id="one" ${anchor.slice(1, -1)}>A</div>`)}`;
    await evaluate(sw.cdp, `chrome.tabs.create({ url: ${JSON.stringify(pageUrl)} }).then((t) => t.id)`);
    const pageTarget = await findTarget(base, (t) => t.type === 'page' && t.url.startsWith('data:text/html'));
    let s0pPage = { single: -1, doubled: -1, after: -1 };
    if (pageTarget) {
      const pageCdp = await connectCdp(pageTarget.webSocketDebuggerUrl);
      await pageCdp.send('Runtime.enable');
      // 页面加载是异步的 ⇒ 轮询等标记节点就位（不假设 create 返回即已渲染）。
      await waitFor(pageCdp, `document.querySelectorAll(${JSON.stringify(anchor)}).length >= 1`, 40, 150);
      s0pPage = JSON.parse(
        await evaluate(
          pageCdp,
          `(() => {
             const sel = ${JSON.stringify(anchor)};
             const single = document.querySelectorAll(sel).length;
             const extra = document.createElement('span');
             extra.setAttribute('data-wcli-ref', 'ref_1');
             document.body.appendChild(extra);
             const doubled = document.querySelectorAll(sel).length;
             extra.remove();
             return JSON.stringify({ single, doubled, after: document.querySelectorAll(sel).length });
           })()`,
        ),
      );
      pageCdp.close();
    }
    check(
      'S0P-C3 合成锚在真 DOM 恰 1 命中（写目标单节点保证）∧ 注入第二节点 ⇒ 2（判据非恒真）',
      s0pPage.single === 1 && s0pPage.doubled === 2 && s0pPage.after === 1,
      JSON.stringify(s0pPage),
    );
    // ⑦′ **范围留痕行独立成行**（真面板 confirm 面）：越界未征询的 `dom set-text` ⇒ fail-closed
    //     拦下 + 留痕行 `scope.reading=out-of-scope-unauthorized | scope.authorized=none` 独立成行。
    const traceBefore = await evaluate(cdp, `document.querySelectorAll('#stream > li').length`);
    await evaluate(
      sw.cdp,
      `chrome.runtime.sendMessage({ kind: 'confirm-request', requestId: 's0p-trace', question: { tool: 'dom', subcommand: 'set-text', args: { ref: '9' }, risk: 'write' } }).then(() => true).catch(() => true)`,
    );
    await sleep(400);
    const s0pTrace = JSON.parse(
      await evaluate(
        cdp,
        `(() => {
           const rows = [...document.querySelectorAll('#stream > li')].map((el) => (el.textContent || '').trim());
           // 「独立成行」= 该范围留痕行**自成一个 li**，且行内只含这一条机器格式（不得与别的事实粘连）。
           const line = rows.find((t) => /scope\\.reading=[a-z-]+ \\| scope\\.authorized=(user|none)$/.test(t) && (t.match(/scope\\.reading=/g) || []).length === 1) ?? null;
           // 系统行的文本投影含「系统事件 HH:MM:SS」前缀 ⇒ 取行尾的**机器格式**切片做判据本体
           // （「独立成行」= 该切片自成一行且行内恰一条 scope.reading=）。
           const trace = line === null ? null : line.slice(line.lastIndexOf('scope.reading='));
           return JSON.stringify({ line, trace, rows: rows.slice(-4) });
         })()`,
      ),
    );
    check(
      'S0P-C4 范围留痕行独立成行 ∧ 仅含字段名（`scope.reading` / `scope.authorized`；零用户内容值）',
      typeof s0pTrace.trace === 'string' &&
        /^scope\.reading=[a-z-]+ \| scope\.authorized=(user|none)$/.test(s0pTrace.trace) &&
        typeof s0pTrace.line === 'string' &&
        !s0pTrace.line.includes(S0_ANSWER),
      JSON.stringify(s0pTrace),
    );
    // ⑧′ 共享样本一致性（本面登记自己真的驱动/读到的 S0′ 拍）。
    const s0pCovered = new Set();
    if (s0pRef) s0pCovered.add('ref-in-turn');
    if (s0pTrace.line) s0pCovered.add('no-injection');
    check(
      `S0P-C5 S0′ 样本单源（${s0PChain().length} 拍登记 ∧ 本面 ≥1 拍有真读数 ∧ 与 node 面同一份文件）`,
      S0P_BEATS.length === 5 && s0PChain().every((b, i) => b.id === S0P_BEATS[i].id) && s0pCovered.size >= 1 &&
        readFileSync(join(PACKAGE_ROOT, 'test/s0-self-driven-chain.test.ts'), 'utf8').includes('test/ui/fixtures/s0-chain.mjs'),
      JSON.stringify({ beats: S0P_BEATS.length, covered: [...s0pCovered] }),
    );
    check(
      'S0P 人工面 M1（「原地」语义遵从观感）/ M4（SPA 锚定失败提示可理解度）= ⏳ 未执行（headless 不可合成，不得冒充 PASS）',
      S0P_ITEMS.length === 8,
      '⏳ 未执行',
    );

    // ── ⑥ 续流收口：`chat-result{done}` ⇒ 回合结束（pending=false ∧ 无死端 ∧ 无开口 ask）──
    await evaluate(sw.cdp, `chrome.runtime.sendMessage({ kind: 'chat-result', variant: 'done' }).then(() => true).catch(() => true)`);
    await sleep(350);
    const aDone = JSON.parse(
      await evaluate(
        cdp,
        `(() => {
          const hosts = [...document.querySelectorAll('#stream > li')];
          const carriers = hosts.filter((l) => l.getAttribute('data-msg-type') === 'error' || (l.getAttribute('data-msg-type') === 'system' && (l.textContent || '').trim().indexOf('✖') === 0));
          return JSON.stringify({ pending: window.__v3.testing.askFlow(), asks: window.__v3.testing.openAsks().length, carriers: carriers.length, pageErrors: document.querySelectorAll('#stream [data-msg-type="error"]').length });
        })()`,
      ),
    );
    aBeatCheck(
      'continuation',
      '⑥ 续流收口：回合结束（无开口 ask ∧ 无阻塞裸奔）',
      aDone.asks === 0 && aDone.carriers === 0 && aDone.pageErrors === 0,
      JSON.stringify(aDone),
    );

    // ── ⑤ 护栏在链路上可判（真面板）：新一轮意图（不同因）立刻被**冷却**挡下 ──────
    //    `proactivity` 单例的时钟是真 `Date.now` ⇒ 首拍之后 10 s 内的下一次自动发起必被
    //    `cooldown` 抑制；抑制**:不是静默**——写一行 `suppressed=<reason>`（可读），且
    //    **真的没有第二次发起**（`chat` 计数不增）。
    const aChatsBefore2 = await evaluate(cdp, `window.__s0AChat.length`);
    await evaluate(cdp, `window.__v3.testing.l1('act', ${JSON.stringify(aPick.refId)}, '另一个动作'); true`);
    await sleep(400);
    const aGuard = JSON.parse(
      await evaluate(
        cdp,
        `(() => {
          const text = document.getElementById('stream').textContent;
          return JSON.stringify({ suppressed: (text.match(/suppressed=[a-z-]+/g) || []), chats: window.__s0AChat.length });
        })()`,
      ),
    );
    const aSuppressed = aGuard.suppressed.slice(-1)[0] ?? null;
    const aReason = aSuppressed ? aSuppressed.split('=')[1] : null;
    aBeatCheck(
      'guarded',
      '⑤ 护栏真抑制：越限 ⇒ `suppressed=<reason>` 可读行 ∧ **真的没有第二次发起**',
      aReason !== null && aGuard.chats === aChatsBefore2,
      JSON.stringify({ suppressed: aGuard.suppressed, chats: aGuard.chats, before: aChatsBefore2 }),
    );

    // ── ⑤ 关断（TASK-V55-317）：设置面唯一新增持久偏好 ⇒ 关断后 `suppressed=disabled`，
    //    且**主题① 仍放行**（设置面切换走真 `change` 事件 + 真持久化）。 ──
    await evaluate(cdp, `window.__v3.testing.openStatusDetails(); true`);
    await sleep(250);
    const aToggle = JSON.parse(
      await evaluate(
        cdp,
        `(() => {
          const cb = document.getElementById('settings-proactive-enabled');
          if (!cb) return JSON.stringify({ found: false });
          cb.checked = false;
          cb.dispatchEvent(new Event('change', { bubbles: true }));
          const st = document.getElementById('settings-proactive-status');
          return JSON.stringify({ found: true, status: st ? st.textContent : null });
        })()`,
      ),
    );
    await sleep(300);
    const aChatsBefore3 = await evaluate(cdp, `window.__s0AChat.length`);
    await evaluate(cdp, `window.__v3.testing.l1('act', ${JSON.stringify(aPick.refId)}, '再一个动作'); true`);
    await sleep(400);
    const aOff = JSON.parse(
      await evaluate(
        cdp,
        `(() => {
          const text = document.getElementById('stream').textContent;
          const rec = JSON.parse(window.__v3.testing.recommend('idle'));
          return JSON.stringify({
            suppressed: (text.match(/suppressed=[a-z-]+/g) || []),
            chats: window.__s0AChat.length,
            deterministic: rec.produced,
          });
        })()`,
      ),
    );
    aBeatCheck(
      'guarded',
      '⑤ 关断复核(T317)：关断 ⇒ `suppressed=disabled` ∧ 真不发 ∧ **主题① 仍放行**（推荐照常产出）',
      aToggle.found === true &&
        aOff.suppressed.includes('suppressed=disabled') &&
        aOff.chats === aChatsBefore3 &&
        aOff.deterministic >= 1,
      JSON.stringify({ toggle: aToggle, off: aOff, before: aChatsBefore3 }),
    );
    // 恢复开（不留副作用：后续收尾判据与人工面读数不被本段污染）。
    await evaluate(
      cdp,
      `(() => { const cb = document.getElementById('settings-proactive-enabled'); if (cb) { cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); } window.__v3.testing.closeL2View(); window.__s0ASwallowChat = false; return true; })()`,
    );
    await sleep(200);

    // ── 判据本体（共享样本，双面同一份）：真读数必绿 + 反证必红 ────────────────
    const aReading = {
      configured: /LLM：Key ✅/.test(aConfigured.llm),
      slot: aChats.length >= 1 ? S0_A_SLOT : null,
      keypresses: aFlow.opClicks,
      presses: aChats.length >= 1 ? 1 : 0,
      answer: aChats.length >= 1 ? S0_ANSWER : null,
      chatTurns: aChats.length,
      trace: aFlow.trace === true,
      guardReasons: [...S0_A_ON_CHAIN_REASONS],
      suppressedReadable: aReason !== null,
      continuation: aDone.asks === 0 && aDone.carriers === 0,
    };
    const aProblems = s0BranchAProblems(aReading);
    check(`S0C-8 分支 A 必判项（共享样本判据）：${aProblems.length === 0 ? '全绿' : aProblems.join(' / ')}`, aProblems.length === 0, JSON.stringify(aReading));
    // 反证（本面也机核「判据不是恒真」）：删按下门 / 敲键 / 静默抑制 ⇒ 必 FAIL。
    check(
      'S0C-8 反证：删 `pressCandidate` 门（`presses=0`）⇒ 共享判据必 FAIL（复现 S0-A 静默）',
      s0BranchAProblems({ ...aReading, presses: 0, chatTurns: 0, answer: null }).some((p) => p.includes('删 pressCandidate 门')),
      'falsification',
    );
    check(
      'S0C-8 反证：作答后又敲键（`keypresses=1`）⇒ 共享判据必 FAIL（零按键是本判据本体）',
      s0BranchAProblems({ ...aReading, keypresses: 1 }).some((p) => p.includes('零按键')),
      'falsification',
    );
    check(
      'S0C-9 反证：越限静默（`suppressedReadable=false`）⇒ 共享判据必 FAIL（抑制必须可读）',
      s0BranchAProblems({ ...aReading, suppressedReadable: false }).some((p) => p.includes('静默')),
      'falsification',
    );
    check(
      'S0C-9 反证：删护栏缝（链上护栏项缺失）⇒ 共享判据必 FAIL（频次/链深/预算必须沿链可判）',
      s0BranchAProblems({ ...aReading, guardReasons: [] }).some((p) => p.includes('删护栏缝')),
      'falsification',
    );
    // 关断后主题① 放行的**判据侧**复核（与真面板读数同一条断言的两半）。
    check(
      'S0C-9 关断语义：`deterministic` 恒放行 ∧ `ai` 恒拒（主题① 不受总开关控制）',
      aOff.deterministic >= 1,
      JSON.stringify({ produced: aOff.deterministic }),
    );

    // 分支 A 逐拍覆盖机核（登记了却没读 ⇒ 必红）。
    const aMisses = PANEL_A_BEATS.filter((b) => (aBeatHits.get(b.id) ?? 0) === 0).map((b) => b.id);
    check(
      `S0C-8 分支 A 逐环节可判（真面板读数）：每拍 ≥1 断言（实测 ${PANEL_A_BEATS.filter((b) => (aBeatHits.get(b.id) ?? 0) > 0).length}/${PANEL_A_BEATS.length} 拍有读数）`,
      aMisses.length === 0 && PANEL_A_BEATS.length === S0_A_BEATS.length,
      JSON.stringify({ misses: aMisses, hits: Object.fromEntries(aBeatHits) }),
    );

    // ═════════════════════════════════════════════════════════════════════════
    // ⑰ V5.5-2 TASK-V55-214/215（ADR-V55-005 §3 · FR-SELF-131/046 · AC-SELF-001）
    //   分支 B **必判项**（真产品路径，非 seam）：未配置 ⇒ 引导 4 步 ⇒ 掩码卡 ⇒
    //   完成 ⇒ **自动续接** ⇒ 留痕；**删自动续接 ⇒ 必 FAIL**（判据本体在共享样本里）。
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n▶ ⑰ 分支 B 必判项：未配置 ⇒ 引导 4 步 ⇒ 掩码卡 ⇒ 完成 ⇒ 自动续接 ⇒ 留痕');

    // ── 样本单源：本面登记的分支 B 环节 id 必须逐序等于共享样本 `S0_B_STEPS` ────
    check(
      'S0C-7 分支 B 环节逐序与共享样本一致（id 机序，非「数量」常量）',
      PANEL_B_BEATS.length === S0_B_STEPS.length && PANEL_B_BEATS.every((b, i) => b.id === S0_B_STEPS[i].id),
      JSON.stringify({ panel: PANEL_B_BEATS.map((b) => b.id), sample: S0_B_STEPS.map((s) => s.id) }),
    );
    // 两分支的环节集**不相交**（各自独立计数，禁互相掩盖）。
    const overlap = PANEL_B_BEATS.filter((b) => PANEL_BEATS.some((x) => x.id === b.id)).map((b) => b.id);
    check('S0C-7 两分支环节集不相交（A/B 各自独立计数，禁互相掩盖）', overlap.length === 0, JSON.stringify(overlap));

    // 固化文案从**真源**抽出（不复制第二份）。
    const flowSrc = readFileSync(join(PACKAGE_ROOT, 'src/ui/sidepanel/next-registry/onboarding-flow.ts'), 'utf8');
    const literalOf = (name) => {
      const m = new RegExp(`export const ${name} = '([^']+)'`).exec(flowSrc);
      return m ? m[1] : null;
    };
    const DETECT_TEXT = literalOf('ONBOARD_DETECT_TEXT');
    const RESUME_TEXT = literalOf('ONBOARD_RESUME_TEXT');
    check('S0C-7 前置：detect / resume 文案从真源抽出（判据非空转）', Boolean(DETECT_TEXT) && Boolean(RESUME_TEXT), JSON.stringify({ DETECT_TEXT, RESUME_TEXT }));

    // ── 屏蔽 headless 无网络面：`llm-test`（连接测试）与**续接回合**的 `chat` 由夹具应答 ──
    //    只拦这两个 kind（`chat` 还要等 `__s0BSwallowChat` 置位，第一条用户回合必须真的
    //    走到 SW 换回 `chat-result{variant:'llm-unconfigured'}`），其余报文一律透传。
    await evaluate(
      cdp,
      `(() => {
        if (window.__s0BStub) return true;
        const orig = chrome.runtime.sendMessage.bind(chrome.runtime);
        chrome.runtime.sendMessage = (msg, ...rest) => {
          const kind = msg && msg.kind;
          if (kind === 'llm-test') {
            return Promise.resolve({ ok: true, data: { ok: true, category: 'ok', message: '✓ 连接正常（headless 夹具）', elapsedMs: 1 } });
          }
          if (kind === 'chat' && window.__s0BSwallowChat === true) return Promise.resolve({ ok: true, data: {} });
          return orig(msg, ...rest);
        };
        window.__s0BStub = true;
        return true;
      })()`,
    );

    await evaluate(cdp, `window.__v3.testing.reset(); true`);
    // 真实用户回合（未配置 ⇒ SW 回 `chat-result{variant:'llm-unconfigured'}`）。
    const bDetectRaw = await evaluate(
      cdp,
      `(async () => {
        const input = document.getElementById('input');
        input.value = ${JSON.stringify(S0_ANSWER)};
        document.getElementById('composer').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        await new Promise((r) => setTimeout(r, 900));
        const text = document.getElementById('stream').textContent;
        return JSON.stringify({
          users: document.querySelectorAll('#stream [data-msg-type="user"]').length,
          detect: ${JSON.stringify(DETECT_TEXT)} ? text.includes(${JSON.stringify(DETECT_TEXT)}) : false,
          susp: window.__v3.testing.suspensions(),
          chips: [...document.querySelectorAll('#stream [data-msg-type="nextstep"] [data-op="op.llm-config"]')].length,
          rule: (window.__v3.testing.lastRecommend() || {}).rule ?? null,
        });
      })()`,
    );
    const bDetect = JSON.parse(bDetectRaw);
    bBeatCheck('detect', '① detect：未配置被识别 ⇒ 流内固化事实行（零明文）', bDetect.detect === true, bDetectRaw);
    bBeatCheck(
      'detect',
      '① detect：悬置任务登记了「用户那句话」（谁在等 / 等什么 / 依据什么）',
      bDetect.susp.length === 1 && bDetect.susp[0].source === 'llm-config' && bDetect.susp[0].instruction.includes(S0_ANSWER),
      JSON.stringify(bDetect.susp),
    );
    // ② guide：环境事实登记（headless 无夹具站点 ⇒ 探测相位可能停在等待态，`probe` 恢复类会
    // 正确地抢走 `risk-recovery` 槽）。因此**与该门禁既有 ⑦A 同一口径**：用受控 ctx 驱动**真
    // 生产者**（同一 `recommendNextStep` + 同一 reducer，仅环境读数受控），chip 的渲染与分发全真。
    const guideRaw = await evaluate(
      cdp,
      `(() => {
        const rec = JSON.parse(window.__v3.testing.recommend('llm'));
        const chips = [...document.querySelectorAll('#stream [data-msg-type="nextstep"] [data-op="op.llm-config"]')];
        return JSON.stringify({ rec, chipCount: chips.length });
      })()`,
    );
    const guide = JSON.parse(guideRaw);
    bBeatCheck(
      'guide',
      '② guide：流内出现 op-direct chip（`[data-op="op.llm-config"]`，引导执行体唯一）',
      guide.chipCount >= 1,
      guideRaw,
    );

    // ── ③ collect：点击 op-direct chip ⇒ 既有三段 params（choice → text → **secret**）──
    const bChipClicked = await evaluate(
      cdp,
      `(() => { const b = [...document.querySelectorAll('#stream [data-msg-type="nextstep"] [data-op="op.llm-config"]')].pop(); if (!b) return false; b.click(); return true; })()`,
    );
    const paramLog = [];
    // 驱动**恰 `S0_B_PARAM_KINDS.length`** 次（= 既有三段序列；引导的采集步就这么多）。
    for (let i = 0; i < S0_B_PARAM_KINDS.length; i += 1) {
      await sleep(300);
      const info = JSON.parse(
        await evaluate(
          cdp,
          `(() => {
            const all = [...document.querySelectorAll('#stream [data-msg-type="askuser"]')].map((c) => ({
              kind: c.getAttribute('data-ask-kind'),
              answered: c.getAttribute('data-answered'),
              open: Boolean(c.querySelector('[data-act="answer"]')) || Boolean(c.querySelector('[data-act="choose"]')),
            }));
            const open = [...document.querySelectorAll('#stream [data-msg-type="askuser"]')].filter((c) => c.getAttribute('data-answered') === 'false');
            const c = open[open.length - 1];
            if (!c) return JSON.stringify({ kind: null, open: open.length, all });
            const el = c.querySelector('.ask-input');
            return JSON.stringify({ kind: c.getAttribute('data-ask-kind'), choose: c.querySelectorAll('[data-act="choose"]').length, type: el ? el.getAttribute('type') : null, all });
          })()`,
        ),
      );
      paramLog.push(info);
      if (!info.kind) break;
      if (info.choose > 0) {
        await evaluate(
          cdp,
          `(() => { const open=[...document.querySelectorAll('#stream [data-msg-type="askuser"]')].filter((c)=>c.getAttribute('data-answered')==='false'); const c=open[open.length-1]; const b=c.querySelector('[data-act="choose"]'); if (b) b.click(); return true; })()`,
        );
      } else {
        const v = info.type === 'password' ? 's0-fake-key-0123456789' : 'm1';
        await evaluate(
          cdp,
          `(() => { const open=[...document.querySelectorAll('#stream [data-msg-type="askuser"]')].filter((c)=>c.getAttribute('data-answered')==='false'); const c=open[open.length-1]; const el=c.querySelector('.ask-input'); if (el) el.value=${JSON.stringify(v)}; const b=c.querySelector('[data-act="answer"]'); if (b) b.click(); return true; })()`,
        );
      }
    }
    const kinds = paramLog.map((p) => p.kind).filter(Boolean);
    const maskedTypes = paramLog.filter((p) => p.type === 'password').length;
    bBeatCheck('guide', '② guide：chip 可点（进入既有 op 管线）', bChipClicked === true, String(bChipClicked));
    bBeatCheck(
      'collect',
      '③ collect：掩码卡走**既有**三段 params（choice → text → secret）',
      kinds.join('|') === S0_B_PARAM_KINDS.join('|'),
      JSON.stringify(paramLog),
    );
    bBeatCheck('collect', '③ collect：secret 步是**掩码**输入（password，零明文）', maskedTypes >= 1, JSON.stringify(paramLog));

    // ── consent 允许（设置面之外的流内确认卡）⇒ 执行体既有一份（`op.llm-config`）──
    // 续接回合的 `chat` 就地由夹具应答（headless 无网络面），不影响「留痕」判据。
    await evaluate(cdp, `window.__s0BSwallowChat = true; true`);
    await sleep(200);
    const consentApproved = await evaluate(
      cdp,
      `(() => {
        const approve = document.querySelector('#stream [data-act="approve"]');
        if (!approve) return false;
        approve.click();
        return true;
      })()`,
    );
    await sleep(600);

    // ── ④ complete + ⑤ 自动续接 + 留痕（同一批真面板读数）──────────────────────
    const bFlowRaw = await evaluate(
      cdp,
      `(() => {
        const text = document.getElementById('stream').textContent;
        const users = [...document.querySelectorAll('#stream [data-msg-type="user"]')].map((el) => el.textContent);
        const receipt = /已配置 LLM/.test(text);
        const resumed = ${JSON.stringify(RESUME_TEXT)} ? text.includes(${JSON.stringify(RESUME_TEXT)}) : false;
        return JSON.stringify({
          receipt,
          resumed,
          consent: document.querySelectorAll('#stream [data-act="approve"]').length,
          users: users.length,
          lastUser: users[users.length - 1] ?? null,
          susp: window.__v3.testing.suspensions(),
        });
      })()`,
    );
    const bFlow = JSON.parse(bFlowRaw);
    bBeatCheck('complete', '④ complete：配置成功回执（✓ 已配置 LLM · 掩码 · 零明文）', consentApproved === true && bFlow.receipt === true, bFlowRaw);
    bBeatCheck('complete', '⑤ resume：**自动续接**（无需用户重说）⇒ 流内出现续接事实行', bFlow.resumed === true, bFlowRaw);
    bBeatCheck(
      'complete',
      '⑤ resume：续接后回合**留痕**（新增一条 user 条目且逐字为原话）',
      bFlow.users >= 2 && typeof bFlow.lastUser === 'string' && bFlow.lastUser.includes(S0_ANSWER),
      JSON.stringify({ users: bFlow.users, lastUser: bFlow.lastUser }),
    );

    // ── 判据本体（共享样本，双面同一份）：真读数必绿 ─────────────────────────
    const bReading = {
      steps: PANEL_B_BEATS.map((b) => b.id),
      paramKinds: kinds,
      masked: maskedTypes >= 1,
      completed: bFlow.receipt === true,
      autoResumed: bFlow.resumed === true,
      resumedInput: bFlow.lastUser && bFlow.lastUser.includes(S0_ANSWER) ? S0_ANSWER : bFlow.lastUser,
      trace: bFlow.users >= 2,
    };
    const bProblems = s0BranchBProblems(bReading);
    check(`S0C-7 分支 B 必判项（共享样本判据）：${bProblems.length === 0 ? '全绿' : bProblems.join(' / ')}`, bProblems.length === 0, JSON.stringify(bReading));

    // ── **删自动续接 ⇒ 必 FAIL**（本面也机核「判据不是恒真」）──────────────────
    const sidepanelSrc = readFileSync(join(PACKAGE_ROOT, 'src/ui/sidepanel/sidepanel.ts'), 'utf8');
    const resumeWired = /if \(op\.opId === ONBOARD_CHIP_OP && state === 'completed'\) resumeAfterConfig\(\);/.test(sidepanelSrc);
    check('S0C-7 产物接线：`opSettled` 的 completed 分支真的调用 `resumeAfterConfig()`', resumeWired, 'source-scan');
    check(
      'S0C-7 反证：删自动续接（`autoResumed=false`）⇒ 共享判据必 FAIL',
      s0BranchBProblems({ ...bReading, autoResumed: false }).some((p) => p.includes('删自动续接')),
      'falsification',
    );
    check(
      'S0C-7 反证：续接输入不逐字 ⇒ 共享判据必 FAIL',
      s0BranchBProblems({ ...bReading, resumedInput: '未逐字的答案' }).some((p) => p.includes('逐字')),
      'falsification',
    );

    // 续接回合收口（`chat` 由夹具应答 ⇒ 用 SW 的真实 `done` 报文收尾，保持待答归零）。
    await evaluate(sw.cdp, `chrome.runtime.sendMessage({ kind: 'chat-result', variant: 'done' }).then(() => true).catch(() => true)`);
    await sleep(350);
    const bOpen = await evaluate(cdp, `window.__v3.testing.openAsks().length`);
    bBeatCheck('complete', '⑤ resume：续接后无残留开口 ask（回合收口）', bOpen === 0, String(bOpen));

    // 分支 B 逐环节覆盖机核（登记了却没读 ⇒ 必红）。
    const bMisses = PANEL_B_BEATS.filter((b) => (bBeatHits.get(b.id) ?? 0) === 0).map((b) => b.id);
    check(
      `S0C-7 分支 B 逐环节可判（真面板读数）：每拍 ≥1 断言（实测 ${PANEL_B_BEATS.filter((b) => (bBeatHits.get(b.id) ?? 0) > 0).length}/${PANEL_B_BEATS.length} 拍有读数）`,
      bMisses.length === 0 && PANEL_B_BEATS.length === S0_B_STEPS.length,
      JSON.stringify({ misses: bMisses, hits: Object.fromEntries(bBeatHits) }),
    );

    // ── S0C-1 逐环节可判（收尾覆盖机核）────────────────────────────────────
    // 每一拍都必须真的有一处**真面板读数**断言；声明了却没读 / 读了却没声明 ⇒ 都必红。
    const misses = PANEL_BEATS.filter((b) => (beatHits.get(b.id) ?? 0) === 0).map((b) => b.id);
    const undeclared = [...beatHits.keys()].filter((id) => !PANEL_BEATS.some((b) => b.id === id));
    check(
      `S0C-1 十环节逐环节可判（真面板读数）：每拍 ≥1 断言（实测 ${PANEL_BEATS.filter((b) => (beatHits.get(b.id) ?? 0) > 0).length}/${PANEL_BEATS.length} 拍有读数）`,
      misses.length === 0 && undeclared.length === 0 && PANEL_BEATS.length === S0_CHAIN.length,
      JSON.stringify({ misses, undeclared, hits: Object.fromEntries(beatHits) }),
    );
    cdp.close();
  } finally {
    chrome.kill('SIGKILL');
  }
  finish('V5.5-1 S0 自驱链 Chromium 面门禁');
}

main().catch((err) => {
  console.error(`✖ S0 Chromium 门禁异常：${err instanceof Error ? err.stack ?? err.message : String(err)}`);
  process.exit(1);
});
