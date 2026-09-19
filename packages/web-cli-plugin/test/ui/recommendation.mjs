/**
 * V4-4 TASK-809 (leaf `specs-tree-v4-4-ref-system-nextstep`) — the **recommendation /
 * system-event / reference-card** gate (`npm run test:recommendation`).
 *
 * Runs against the real `dist/` product through the REAL reducer + real card
 * factory (the `window.__v3.testing` seam drives the same `reduce` / `render` path
 * the background messages use — no shadow implementation):
 *
 *   ① chips 即指令：click 走 composer 的**同一生产入口**（`requestTurn`），不填输入框
 *   ② 上限：≤1 卡 / 卡 ≤3 chips（单卡可点 ≤6）
 *   ③ `pending` 门控：chips `disabled` + `aria-disabled`（**不隐藏**）且不生成新卡
 *   ④ 无候选不渲染：候选为空 ⇒ 流内零 `nextstep` 卡（EC-CHAT-008）
 *   ⑤ 系统事件行：`HH:MM:SS` + 只追加 + 去重窗口 + 速率上限 `dropped` 状态栏可读
 *   ⑥ 首装卡：`firstRun` 档推荐 ≤1 卡（不与 default 混算）
 *   ⑦ 引用卡：有效=证据层只读；失效=原因 + 两条恢复路径 + 兜底默认收起
 *   ⑧ 宿主清零：`[data-transitional-host]` 计数 = 0（v4 收口）
 *   ⑨ 无未捕获异常 + 零横向溢出 + 计数守恒（D-005 只增）
 *
 * Serial discipline: exactly ONE Chromium instance, one page target (NFR-CHAT-009).
 */
import { readFileSync } from 'node:fs';
import {
  CHROME,
  DIST,
  check,
  counts,
  evaluate,
  findOurServiceWorker,
  finish,
  launch,
  openSidePanel,
  setViewport,
  sleep,
  VIEWPORT_HEIGHT,
  waitFor,
} from './_v3-helpers.mjs';

/** D-005 runtime floor（本叶台账 `v4GateFloors`）：首次实测后只增不减。 */
const RECOMMENDATION_RUNTIME_FLOOR = 30;
/** 静态 `check(` 下界（同口径：文件自身计数）。 */
const RECOMMENDATION_STATIC_FLOOR = 30;

/** The four tags a chip count must respect (single-card budget ≤6). */
const CONTROL_TAGS = 'button,a,input,select,textarea';

/** A shared in-page visibility probe. */
const VIS = `const vis = (el) => { let n = el; while (n) { if (n.hidden === true) return false; n = n.parentElement; } return Boolean(el); };`;

/** Authorize + discover the fixture origin (same shape as the l0/density fixtures). */
async function authorizeFixture(cdp) {
  await evaluate(
    cdp,
    `chrome.runtime.sendMessage({ kind: 'discover', origin: 'https://v4-4.test', state: 'supported' }).then(() => true)`,
  );
  await waitFor(cdp, `document.getElementById('status').textContent.includes('v4-4.test') ? '1' : ''`, 60, 200);
  await evaluate(
    cdp,
    `chrome.runtime.sendMessage({ kind: 'authorize', origin: 'https://v4-4.test', hostPermissionGranted: false }).then(() => true)`,
  );
  await evaluate(cdp, `window.__v3.testing.refresh(); true`);
  await sleep(300);
}

async function main() {
  console.log(`▶ chrome: ${CHROME}`);
  console.log(`▶ dist:   ${DIST}`);
  const { chrome, base } = await launch({ tag: 'recommendation', extDir: DIST, portRange: [9800, 9899] });
  try {
    const sw = await findOurServiceWorker(base);
    if (!sw) throw new Error('web-cli plugin service worker 不可达');
    const { cdp } = await openSidePanel(sw.cdp, base);
    const pageErrors = [];
    cdp.on('Runtime.exceptionThrown', (p) => pageErrors.push(p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text));

    await setViewport(cdp, 400, VIEWPORT_HEIGHT);
    await waitFor(cdp, `document.getElementById('stream') ? '1' : ''`, 80, 200);
    await authorizeFixture(cdp);

    // ── ① chips 即指令（同一生产入口） ────────────────────────────────────────
    console.log('\n▶ ① chips 即指令：同一生产入口（不填输入框）');
    await evaluate(cdp, `window.__v3.testing.streamReset(); window.__v3.testing.refCard(3, 'valid'); window.__v3.testing.recommend('ref'); true`);
    await sleep(250);
    const chipRaw = await evaluate(
      cdp,
      `(() => {
        const card = document.querySelector('#stream [data-msg-type="nextstep"]');
        if (!card) return JSON.stringify({ found: false });
        const chips = [...card.querySelectorAll('button.next-chip')];
        const before = document.querySelectorAll('#stream [data-msg-type="user"]').length;
        const inputBefore = document.getElementById('input').value;
        const userBefore = document.querySelectorAll('#stream [data-msg-type="user"]').length;
        chips[0].click();
        return JSON.stringify({
          found: true,
          chipCount: chips.length,
          acts: chips.map((c) => c.getAttribute('data-act')),
          inputBefore,
          userBefore,
          userAfter: document.querySelectorAll('#stream [data-msg-type="user"]').length,
          inputAfter: document.getElementById('input').value,
          before,
        });
      })()`,
    );
    const chip = JSON.parse(chipRaw);
    check('① 推荐卡存在（有效引用 ⇒ R-REF-ACTION）', chip.found === true, chipRaw);
    check('① 单卡 chips ≤3', chip.found && chip.chipCount >= 1 && chip.chipCount <= 3, chipRaw);
    check('① chip 带 data-act（意图是数据，不是猜测）', chip.found && chip.acts.every((a) => typeof a === 'string' && a.length > 0), chipRaw);
    check('① chip 点击经同一生产入口发起回合（流内出现 user 卡）', chip.userAfter > chip.userBefore, chipRaw);
    check('① chip 不把文本复制进输入框（FR-CHAT-061 逐字禁止）', chip.inputAfter === '', chipRaw);

    // ── ② 上限 ───────────────────────────────────────────────────────────────
    console.log('\n▶ ② 上限：≤1 卡 / 卡 ≤3 chips / 单卡可点 ≤6');
    const limitRaw = await evaluate(
      cdp,
      `(() => {
        ${VIS}
        const cards = [...document.querySelectorAll('#stream [data-msg-type="nextstep"]')];
        const card = cards.at(-1);
        const clickables = card ? [...card.querySelectorAll('${CONTROL_TAGS}')].filter((el) => vis(el) && el.disabled !== true).length : -1;
        return JSON.stringify({ cards: cards.length, clickables });
      })()`,
    );
    const limit = JSON.parse(limitRaw);
    check('② 同一轮 ≤1 张推荐卡（无队列堆积）', limit.cards >= 1 && limit.cards <= 1, limitRaw);
    check('② 单卡可点 ≤6', limit.clickables >= 0 && limit.clickables <= 6, limitRaw);

    // ── ③ pending 门控 ───────────────────────────────────────────────────────
    console.log('\n▶ ③ pending 门控：disabled + aria-disabled（不隐藏）且不生成新卡');
    const pendingRaw = await evaluate(
      cdp,
      `(() => {
        const cardsBefore = document.querySelectorAll('#stream [data-msg-type="nextstep"]').length;
        window.__v3.testing.setPending(true);
        const chips = [...document.querySelectorAll('#stream [data-msg-type="nextstep"] button.next-chip')];
        const disabled = chips.length > 0 && chips.every((c) => c.disabled === true);
        const aria = chips.length > 0 && chips.every((c) => c.getAttribute('aria-disabled') === 'true');
        const hidden = chips.length === 0 || chips.every((c) => c.hidden === true);
        const produced = JSON.parse(window.__v3.testing.recommend('ref'));
        const cardsAfter = document.querySelectorAll('#stream [data-msg-type="nextstep"]').length;
        window.__v3.testing.setPending(false);
        const reEnabled = [...document.querySelectorAll('#stream [data-msg-type="nextstep"] button.next-chip')].every((c) => c.disabled === false);
        return JSON.stringify({ cardsBefore, disabled, aria, hidden, produced, cardsAfter, reEnabled });
      })()`,
    );
    const pending = JSON.parse(pendingRaw);
    check('③ pending 期间 chips disabled', pending.disabled === true, pendingRaw);
    check('③ pending 期间 chips aria-disabled=true', pending.aria === true, pendingRaw);
    check('③ pending 期间 chips **不隐藏**（避免布局跳动）', pending.hidden === false, pendingRaw);
    check('③ pending 期间不生成新卡（produced=0 且卡数不变）', pending.produced.produced === 0 && pending.cardsAfter === pending.cardsBefore, pendingRaw);
    check('③ pending 结束后重新评估（chips 恢复可用）', pending.reEnabled === true, pendingRaw);

    // ── ④ 无候选不渲染 ───────────────────────────────────────────────────────
    console.log('\n▶ ④ 无候选不渲染（EC-CHAT-008）');
    const emptyRaw = await evaluate(
      cdp,
      `(() => {
        window.__v3.testing.streamReset();
        const produced = JSON.parse(window.__v3.testing.recommend('empty'));
        return JSON.stringify({ produced, cards: document.querySelectorAll('#stream [data-msg-type="nextstep"]').length });
      })()`,
    );
    const empty = JSON.parse(emptyRaw);
    check('④ 无候选 ⇒ 不生成卡（无「下一步：无」式假推荐）', empty.produced.produced === 0 && empty.cards === 0, emptyRaw);

    // ── ⑦ 引用卡（有效 / 失效 / 两条恢复路径） ───────────────────────────────
    console.log('\n▶ ⑦ 引用卡：有效=证据层只读；失效=原因 + 两条恢复路径 + 兜底默认收起');
    const refRaw = await evaluate(
      cdp,
      `(() => {
        window.__v3.testing.streamReset();
        window.__v3.testing.refCard(1, 'valid');
        const valid = document.querySelector('#stream [data-msg-type="ref"]');
        const validState = valid.getAttribute('data-ref-state');
        const evidenceRows = valid.querySelectorAll('.ref-evidence .l1-row').length;
        window.__v3.testing.refCard(2, 'stale', { why: '目标元素已不存在', systemText: '引用 2 已失效：目标元素已不存在' });
        const stale = [...document.querySelectorAll('#stream [data-msg-type="ref"]')].at(-1);
        const fallback = stale.querySelector('.ref-fallback');
        const repick = stale.querySelector('[data-act="repick"]');
        const describe = stale.querySelector('[data-act="describe"]');
        // Capture the DEFAULT state BEFORE the click (otherwise the probe reads the
        // post-click value and the「默认收起」judgement is vacuous).
        const fallbackHiddenDefault = fallback.hidden === true;
        describe.click();
        const fallbackOpenAfterClick = fallback.hidden === false;
        // A re-pick mints a NEW card (refNum+1); the old two must stay untouched.
        window.__v3.testing.refCard(3, 'valid');
        const afterRepick = [...document.querySelectorAll('#stream [data-msg-type="ref"]')];
        return JSON.stringify({
          validState,
          evidenceRows,
          staleState: stale.getAttribute('data-ref-state'),
          why: stale.querySelector('.ref-stale-why')?.textContent ?? '',
          hasRepick: Boolean(repick),
          hasDescribe: Boolean(describe),
          fallbackHiddenDefault,
          fallbackOpenAfterClick,
          systemLine: [...document.querySelectorAll('#stream [data-msg-type="system"]')].some((r) => r.textContent.includes('已失效')),
          oldStillValid: valid.getAttribute('data-ref-state'),
          oldStillStale: stale.getAttribute('data-ref-state'),
          refNums: [...document.querySelectorAll('#stream [data-msg-type="ref"]')].map((r) => r.getAttribute('data-ref-num')),
          afterRepickCount: afterRepick.length,
        });
      })()`,
    );
    const ref = JSON.parse(refRaw);
    check('⑦ 有效引用卡 data-ref-state=valid 且证据层 4 行', ref.validState === 'valid' && ref.evidenceRows === 4, refRaw);
    check('⑦ 失效引用卡 data-ref-state=stale', ref.staleState === 'stale', refRaw);
    check('⑦ 失效卡可读原因（.ref-stale-why 非空）', ref.why.length > 0, refRaw);
    check('⑦ 两条恢复路径齐备（重新拾取 / 改用描述）', ref.hasRepick === true && ref.hasDescribe === true, refRaw);
    check('⑦ 兜底输入默认收起（法四 / shim E4）', ref.fallbackHiddenDefault === true, refRaw);
    check('⑦ 点「改用描述」后就地展开（默认收起的判据非恒真）', ref.fallbackOpenAfterClick === true, refRaw);
    check('⑦ 失效 ⇒ 流内系统行（E2）', ref.systemLine === true, refRaw);
    check('⑦ 旧卡零改动（valid 卡仍 valid / stale 卡仍 stale）', ref.oldStillValid === 'valid' && ref.oldStillStale === 'stale', refRaw);
    check('⑦ 重拾 ⇒ 新卡（refNum 递增），旧卡保留（append-only）', ref.refNums.join(',') === '1,2,3', refRaw);

    // ── ⑤ 系统事件行 ─────────────────────────────────────────────────────────
    console.log('\n▶ ⑤ 系统事件行：HH:MM:SS + 只追加 + 去重窗口 + 速率上限');
    const sysRaw = await evaluate(
      cdp,
      `(() => {
        window.__v3.testing.streamReset();
        const t = Date.now();
        window.__v3.testing.systemRow('nav', '页面已导航：会话上下文失效（不静默续接）', t);
        window.__v3.testing.systemRow('nav', '页面已导航：会话上下文失效（不静默续接）', t + 1000);
        const afterDedupe = window.__v3.testing.systemStats();
        window.__v3.testing.systemRow('nav', '页面已导航：会话上下文失效（不静默续接）', t + 6000);
        const afterWindow = window.__v3.testing.systemStats();
        for (let i = 0; i < 30; i += 1) window.__v3.testing.systemRow('probe', '探测状态变化：第 ' + i + ' 次', t + 7000 + i);
        const afterCap = window.__v3.testing.systemStats();
        const rows = [...document.querySelectorAll('#stream [data-msg-type="system"]')];
        const stamps = rows.map((r) => r.querySelector('time.ts')?.textContent ?? '');
        const bar = document.getElementById('statusbar-text').textContent;
        const bodies = rows.map((r) => r.textContent);
        return JSON.stringify({
          afterDedupe,
          afterWindow,
          afterCap,
          rows: rows.length,
          stampsOk: stamps.length > 0 && stamps.every((s) => /^\\d{2}:\\d{2}:\\d{2}$/.test(s)),
          continued: bodies.some((b) => b.includes('持续：')),
          bar,
          appendedOrder: (() => { const seqs = [...document.querySelectorAll('#stream [data-card-key]')].length; return seqs; })(),
        });
      })()`,
    );
    const sys = JSON.parse(sysRaw);
    check('⑤ ≥3 条可区分系统行且每条带 HH:MM:SS', sys.rows >= 3 && sys.stampsOk === true, sysRaw);
    check('⑤ 去重窗口内同 key 不追加（窗口内 2 次 ⇒ 1 行）', sys.afterDedupe.rows === 1, sysRaw);
    check('⑤ 窗口后重现阶段前缀「持续：」', sys.afterWindow.rows === 2 && sys.continued === true, sysRaw);
    check('⑤ 速率上限：超出部分 dropped 计数 +1 且不追加', sys.afterCap.dropped > 0, sysRaw);
    check('⑤ dropped 在状态栏可读（丢弃不静默）', /限速丢弃/.test(sys.bar), sysRaw);

    // ── ⑥ 首装卡 ─────────────────────────────────────────────────────────────
    console.log('\n▶ ⑥ 首装卡（firstRun 档）');
    const firstRaw = await evaluate(
      cdp,
      `(() => {
        window.__v3.testing.streamReset();
        const produced = JSON.parse(window.__v3.testing.recommend('firstRun'));
        const card = document.querySelector('#stream [data-msg-type="nextstep"]');
        return JSON.stringify({ produced, cards: document.querySelectorAll('#stream [data-msg-type="nextstep"]').length, rule: card?.getAttribute('data-nextstep-rule') ?? null });
      })()`,
    );
    const first = JSON.parse(firstRaw);
    check('⑥ firstRun 触发 onboarding 档推荐 ≤1 卡', first.cards === 1 && first.rule === 'onboarding', firstRaw);

    // ── ⑧ 宿主清零 ───────────────────────────────────────────────────────────
    console.log('\n▶ ⑧ 宿主清零（v4 收口）');
    const hostRaw = await evaluate(cdp, `JSON.stringify({ hosts: document.querySelectorAll('[data-transitional-host]').length })`);
    const host = JSON.parse(hostRaw);
    check('⑧ [data-transitional-host] 计数 = 0（R4-18 结构性清零）', host.hosts === 0, hostRaw);

    // ── ⑨ 零明文 + 溢出 + 异常 + 计数 ────────────────────────────────────────
    console.log('\n▶ ⑨ 零明文 / 零横向溢出 / 无异常 / 计数守恒');
    const plainRaw = await evaluate(
      cdp,
      `(() => {
        const text = [...document.querySelectorAll('#stream [data-msg-type="system"], #stream [data-msg-type="ref"], #stream [data-msg-type="nextstep"]')].map((c) => c.textContent).join('\\n');
        const stream = document.getElementById('stream');
        return JSON.stringify({
          urlQuery: /[?&][A-Za-z0-9_.~%-]+=/.test(text),
          secret: /(?:sk|pk|ghp)-[A-Za-z0-9_-]{8,}/.test(text),
          overflow: stream.scrollWidth - stream.clientWidth,
        });
      })()`,
    );
    const plain = JSON.parse(plainRaw);
    check('⑨ 渲染路径无 URL query', plain.urlQuery === false, plainRaw);
    check('⑨ 渲染路径无密钥 / 令牌', plain.secret === false, plainRaw);
    check('⑨ 400px 无横向溢出', plain.overflow <= 1, plainRaw);
    for (const width of [320, 520]) {
      await setViewport(cdp, width, VIEWPORT_HEIGHT);
      await sleep(120);
      const ov = await evaluate(cdp, `document.getElementById('stream').scrollWidth - document.getElementById('stream').clientWidth`);
      check(`⑨ ${width}px 无横向溢出`, ov <= 1, String(ov));
    }
    check('⑨ 无未捕获页面异常', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
    cdp.close();

    const runtime = counts().passes;
    const selfSource = readFileSync(new URL('./recommendation.mjs', import.meta.url), 'utf8');
    const staticCount = (selfSource.match(/\bcheck\(/g) ?? []).length;
    check(`⑩ 运行期断言计数 ≥ ${RECOMMENDATION_RUNTIME_FLOOR}（D-005；countMethod = runtime-check-calls）`, runtime >= RECOMMENDATION_RUNTIME_FLOOR, `runtime=${runtime}`);
    check(`⑩ 静态 check( 计数 ≥ ${RECOMMENDATION_STATIC_FLOOR}`, staticCount >= RECOMMENDATION_STATIC_FLOOR, `static=${staticCount}`);
  } finally {
    chrome.kill('SIGKILL');
  }
  finish('V4-4 引用卡 / 系统事件行 / 推荐卡门禁');
}

main().catch((err) => {
  console.error(`✖ recommendation 门禁异常：${err instanceof Error ? err.stack ?? err.message : String(err)}`);
  process.exit(1);
});
