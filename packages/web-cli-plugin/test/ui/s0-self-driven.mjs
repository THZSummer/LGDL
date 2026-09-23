/**
 * V5.5-1 **TASK-V55-122** (ADR-V55-005 §3/§4 · FR-SELF-130/131 · **AC-SELF-001** ·
 * R-V55-111 / R-SELF-908) — the **S0 自驱链 Chromium 面门禁**（真面板）。
 *
 * ── 分层接线（ADR-V55-005 §3，逐字）──────────────────────────────────────────
 *
 * | 分支 | 本门禁断言 | 交付叶 |
 * |---|---|---|
 * | **A（已配置 LLM）机制侧** | ⑤ 之后 **答案 ⇒ 驱动**：悬置里答案可判命中 + 流内出现可行动候选（`[data-act="next"][data-op]`） | **v55-1**（本门禁） |
 * | A（续） | 「**无需用户再敲任何键** ⇒ 自动成回合」+ 留痕三要素 | **v55-3**（**不在本门禁**） |
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
import { CHROME, DIST, PACKAGE_ROOT, check, evaluate, finish, launch, openSidePanel, findOurServiceWorker, sleep } from './_v3-helpers.mjs';
import { S0_ANSWER, S0_CHAIN } from './fixtures/s0-chain.mjs';

/** One judgement per line of the gate (`expectFailPattern` = the readable failure text). */
export const JUDGEMENTS = [
  { id: 'S0C-1-per-beat', expectFailPattern: 'S0 十环节必须逐环节可判（真面板读数）' },
  { id: 'S0C-2-answer-driven', expectFailPattern: '答案必须产生驱动（悬置可判命中 + 可行动候选）' },
  { id: 'S0C-3-branch-A', expectFailPattern: '分支 A 机制侧：已配置 ⇒ 答案 ⇒ 可行动候选 + 可达 next' },
  { id: 'S0C-4-branch-B', expectFailPattern: '分支 B 识别侧：未配置 ⇒ 识别为终态 + 有驱动者（零 LLM 调用）' },
  { id: 'S0C-5-no-silence', expectFailPattern: '⑤ 之后不得出现静默窗口（无归因 ∧ 无终态 ∧ 无 next）' },
  { id: 'S0C-6-shared-sample', expectFailPattern: 'S0 样本必须与 node 面共用同一份（链序 / 答案逐字）' },
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
