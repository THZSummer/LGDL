/**
 * V4-2 TASK-610 (leaf `specs-tree-v4-2-chat-stream-model`) — the **stream gate**
 * (`npm run test:stream`).
 *
 * It runs against the real `dist/` product and asserts, through the real model +
 * real renderer alone (the `window.__v3.testing.streamSeed` seam appends events
 * through `appendEvent`/`render()` — no shadow implementation):
 *
 *   ① all **12 card types** exist and carry the canonical `data-msg-type`;
 *   ② the 5 process-card forms keep every v1 field (tool name / ✓✖ / ms / preview /
 *      folding), the command line, the thinking indicator, the error entry, the notice;
 *   ③ the **固化 contract**: before → after for `askuser` / `auth`（`data-*` flip,
 *      form hidden, `.card-fixed` visible with `HH:MM:SS`, no undo control）;
 *   ④ **keyed incremental rendering**: no clearing API (static), node identity is
 *      stable across appends, a terminal card's `outerHTML` is byte-frozen;
 *   ⑤ scroll policy: an append while scrolled up never steals the viewport, the
 *      "back to bottom" affordance is `hidden`-driven;
 *   ⑥ 320 / 400 / 520 zero horizontal overflow, incl. a long URL card;
 *   ⑦ accessibility: `ol#stream[role=log]`, `role=listitem` per card, readable `.ts`,
 *      `aria-live` on the固化 region, collapse via `hidden`;
 *   ⑧ long session (≈320 cards) appends without rebuilding the layer;
 *   ⑨ counter conservation (runtime / static `check(` floors).
 *
 * The design draft's equivalent assertions live in `design/ui-redesign/option-f-shim.mjs`
 * and are frozen by `test/design-contract.test.ts`; R4-20 requires the two numbers to
 * be registered **separately** — this file is the real-product side.
 *
 * Serial discipline: exactly ONE Chromium instance, one page target, everything in
 * order (NFR-CHAT-009 / NFR-V3-012).
 */
import { readFileSync } from 'node:fs';
import {
  CHROME,
  DIST,
  check,
  counts,
  evaluate,
  finish,
  launch,
  openSidePanel,
  findOurServiceWorker,
  realClick,
  setViewport,
  sleep,
  waitFor,
  VIEWPORT_HEIGHT,
} from './_v3-helpers.mjs';

/** D-005 runtime floor（本叶台账 `v4GateFloors`）：首次实测后只增不减。 */
const STREAM_RUNTIME_FLOOR = 61;
/** 静态 `check(` 下界（同口径：文件自身计数）。 */
const STREAM_STATIC_FLOOR = 51;

/** The 12 kinds — 7 primary (design-contract order) + 5 process. */
const CARD_TYPES = ['ai', 'user', 'nextstep', 'askuser', 'auth', 'system', 'ref', 'tool', 'command', 'thinking', 'error', 'notice'];

/** One seeded card per kind (the live product reaches the rest through v4-3/v4-4). */
const SEED = [
  { kind: 'ai', cardId: 'ai1', payload: { text: '# 标题\n\n1. 第一\n2. 第二\n\n行内 `code` 与表格：\n\n| 列 | 值 |\n| --- | --- |\n| a | b |' } },
  { kind: 'user', cardId: 'u1', payload: { text: 'USER-BODY-ONE' } },
  { kind: 'nextstep', cardId: 'n1', payload: { chips: ['从页面拾取', '看命令目录（122）'] } },
  { kind: 'askuser', cardId: 'q1', payload: { askKind: 'choice', prompt: '译文写回哪里？', options: ['原文替换', '插入到下方', '只给我译文'] } },
  { kind: 'auth', cardId: 'a1', payload: { prompt: '读取「导出」按钮的文本' } },
  { kind: 'system', cardId: 's1', payload: { text: '会话已切换：alpha.test', label: '会话已切换：alpha.test' } },
  { kind: 'ref', cardId: 'r1', payload: { refNum: 1, refState: 'stale', refLabel: '「导出」按钮' } },
  { kind: 'tool', cardId: 't1', payload: { tool: 'site_notes-list', ok: true, ms: 123, text: 'line-1\nline-2\nline-3' } },
  { kind: 'command', cardId: 'c1', payload: { text: 'site_notes-list --doc main' } },
  { kind: 'thinking', cardId: 'th1', payload: { label: '思考' } },
  { kind: 'error', cardId: 'e1', payload: { text: '模拟错误：写入门禁拒绝' } },
  { kind: 'notice', cardId: 'no1', payload: { text: '⚠ LLM 调用失败，正在自动重试一次…' } },
];

const seed = (spec) => `window.__v3.testing.streamSeed(${JSON.stringify(spec)})`;

async function main() {
  console.log(`▶ chrome: ${CHROME}`);
  console.log(`▶ dist:   ${DIST}`);
  const { chrome, base } = await launch({ tag: 'stream', extDir: DIST, portRange: [9600, 9699] });
  try {
    const sw = await findOurServiceWorker(base);
    if (!sw) throw new Error('web-cli plugin service worker 不可达');
    const { cdp } = await openSidePanel(sw.cdp, base);
    const pageErrors = [];
    cdp.on('Runtime.exceptionThrown', (p) => pageErrors.push(p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text));

    await setViewport(cdp, 400, VIEWPORT_HEIGHT);
    await waitFor(cdp, `document.getElementById('stream') ? '1' : ''`, 80, 200);
    await evaluate(cdp, `window.__v3.testing.streamReset()`);

    // ── ① 12 card types ──────────────────────────────────────────────────────
    console.log('\n▶ ① 12 卡型存在性 + data-msg-type 正确');
    await evaluate(cdp, seed(SEED));
    await sleep(200);
    const typesRaw = await evaluate(
      cdp,
      `(() => {
        const cards = [...document.querySelectorAll('#stream > [data-msg-type]')];
        return JSON.stringify({
          types: cards.map((c) => c.getAttribute('data-msg-type')),
          keys: cards.map((c) => c.getAttribute('data-card-key')),
          allListItems: cards.every((c) => c.tagName === 'LI' && c.getAttribute('role') === 'listitem'),
          hasTs: cards.every((c) => /^\\d{2}:\\d{2}:\\d{2}$/.test(c.querySelector('.card-head .ts')?.textContent ?? '')),
        });
      })()`,
    );
    const types = JSON.parse(typesRaw);
    for (const kind of CARD_TYPES) {
      check(`① 卡型 ${kind} 存在且 data-msg-type 正确`, types.types.includes(kind), typesRaw);
    }
    check('① 12 卡型逐型唯一存在（恰 12 张）', types.types.length === 12, typesRaw);
    check('① 每卡均为 li[role=listitem] 且挂在 #stream 直系', types.allListItems === true, typesRaw);
    check('① 每卡 `card-head` 均有可读 .ts（HH:MM:SS）', types.hasTs === true, typesRaw);

    // ── ② process family: 5 forms, zero field loss ───────────────────────────
    console.log('\n▶ ② 过程族 5 形态信息零丢失');
    const toolRaw = await evaluate(
      cdp,
      `(() => {
        const c = document.querySelector('[data-msg-type="tool"]');
        const body = c.querySelector('.tool-card-body');
        return JSON.stringify({
          name: c.querySelector('.tool-name')?.textContent,
          status: c.querySelector('.tool-status')?.textContent,
          okClass: c.querySelector('.tool-status')?.classList.contains('ok'),
          ms: c.querySelector('.tool-ms')?.textContent,
          preview: c.querySelector('.tool-preview')?.textContent ?? '',
          open: c.querySelector('.tool-card')?.open,
          monospace: /monospace|Menlo|Consolas/.test(getComputedStyle(body).fontFamily),
          overflowX: getComputedStyle(body).overflowX,
        });
      })()`,
    );
    const tool = JSON.parse(toolRaw);
    check('② 工具卡保留工具名', tool.name === 'site_notes-list', toolRaw);
    check('② 工具卡保留 ✓ 状态 + ok 类', tool.status === '✓ 成功' && tool.okClass === true, toolRaw);
    check('② 工具卡保留耗时（ms）', tool.ms === '123 ms', toolRaw);
    check('② 工具卡保留折叠首行预览', typeof tool.preview === 'string' && tool.preview.length > 0, toolRaw);
    check('② 工具卡正文等宽 + 横向滚动（长输出不截断）', tool.monospace === true && tool.overflowX === 'auto', toolRaw);
    const formsRaw = await evaluate(
      cdp,
      `(() => JSON.stringify({
        cmd: document.querySelector('[data-msg-type="command"] .cmd .cmd-text')?.textContent ?? '',
        thinking: Boolean(document.querySelector('[data-msg-type="thinking"].msg-thinking .msg-content')),
        errorEntry: Boolean(document.querySelector('[data-msg-type="error"].entry-error')) && Boolean(document.querySelector('[data-msg-type="error"] .msg-content')),
        notice: document.querySelector('[data-msg-type="notice"] .msg-notice')?.textContent ?? '',
      }))()`,
    );
    const forms = JSON.parse(formsRaw);
    check('② 命令行保留独立紧凑样式（.cmd）', forms.cmd.includes('site_notes-list'), formsRaw);
    check('② 思考形态存在（.msg-thinking）', forms.thinking === true, formsRaw);
    check('② 错误形态为醒目 system 气泡（.entry-error）', forms.errorEntry === true, formsRaw);
    check('② 工具通知形态存在（.msg-notice）', forms.notice.length > 0, formsRaw);

    // ── ③ 固化契约：操作前 → 操作后 ─────────────────────────────────────────
    console.log('\n▶ ③ 固化契约：askuser / auth 操作前 → 操作后（含 .ts / .card-fixed / 无撤销）');
    const askBeforeRaw = await evaluate(
      cdp,
      `(() => {
        const c = document.querySelector('[data-card-key="q1"]');
        return JSON.stringify({
          answered: c.getAttribute('data-answered'),
          formVisible: c.querySelector('.ask-form').hidden === false,
          fixedHidden: c.querySelector('.card-fixed').hidden === true,
          choices: c.querySelectorAll('.ask-form .choice').length,
          clickables: (() => { let n = 0; for (const el of [c].concat([...c.querySelectorAll('*')])) if (/^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) n += 1; return n; })(),
        });
      })()`,
    );
    const askBefore = JSON.parse(askBeforeRaw);
    check('③ 操作前：ask 未答 + 表单可见 + 固化区 hidden', askBefore.answered === 'false' && askBefore.formVisible === true && askBefore.fixedHidden === true, askBeforeRaw);
    check('③ choice 型 ≤3 选项 + 「其他…」+ 取消（结构 ≤6 可点）', askBefore.choices === 4 && askBefore.clickables <= 6, askBeforeRaw);

    await evaluate(cdp, seed([{ kind: 'askuser', cardId: 'q1', payload: { answer: '原文替换' }, terminal: 'answered' }]));
    await sleep(120);
    const askAfterRaw = await evaluate(
      cdp,
      `(() => {
        const c = document.querySelector('[data-card-key="q1"]');
        const fixed = c.querySelector('.card-fixed');
        return JSON.stringify({
          answered: c.getAttribute('data-answered'),
          formHidden: c.querySelector('.ask-form').hidden === true,
          fixedVisible: fixed.hidden === false,
          fixedText: fixed.querySelector('b')?.textContent ?? '',
          fixedTs: fixed.querySelector('.card-fixed-time')?.textContent ?? '',
          ariaLive: fixed.getAttribute('aria-live'),
          undo: /撤销/.test(c.textContent),
          frozen: c.getAttribute('data-frozen'),
        });
      })()`,
    );
    const askAfter = JSON.parse(askAfterRaw);
    check('③ 操作后：data-answered=true + 表单收起 + 固化区显示', askAfter.answered === 'true' && askAfter.formHidden === true && askAfter.fixedVisible === true, askAfterRaw);
    check('③ 固化文案含「已答：+ 回答」', askAfter.fixedText.startsWith('已答：') && askAfter.fixedText.includes('原文替换'), askAfterRaw);
    check('③ 固化区带时间戳（HH:MM:SS）', /^\d{2}:\d{2}:\d{2}$/.test(askAfter.fixedTs), askAfterRaw);
    check('③ 固化区 aria-live=polite（读屏可播报）', askAfter.ariaLive === 'polite', askAfterRaw);
    check('③ 只固化不撤销：卡内零「撤销」控件', askAfter.undo === false, askAfterRaw);
    check('③ 终态卡被标记 data-frozen=true', askAfter.frozen === 'true', askAfterRaw);

    await evaluate(cdp, seed([{ kind: 'auth', cardId: 'a1', payload: { askKind: 'confirm', prompt: '读取「导出」按钮的文本' }, terminal: 'approved' }]));
    await sleep(120);
    const authRaw = await evaluate(
      cdp,
      `(() => {
        const c = document.querySelector('[data-card-key="a1"]');
        const fixed = c.querySelector('.card-fixed');
        return JSON.stringify({
          decision: c.getAttribute('data-decision'),
          actionsHidden: c.querySelector('.auth-actions').hidden === true,
          fixedVisible: fixed.hidden === false,
          fixedText: fixed.querySelector('b')?.textContent ?? '',
          audit: fixed.querySelector('[data-act="audit"]')?.textContent ?? '',
        });
      })()`,
    );
    const auth = JSON.parse(authRaw);
    check('③ 授权卡：pending → approved（操作按钮收起 + 固化区显示）', auth.decision === 'approved' && auth.actionsHidden === true && auth.fixedVisible === true, authRaw);
    check('③ 批准固化文案含「已批准」+ 审计入口', auth.fixedText.includes('已批准') && /审计/.test(auth.audit), authRaw);

    // ── ④ keyed incremental rendering ───────────────────────────────────────
    console.log('\n▶ ④ 增量渲染：节点引用不变 + 终态 outerHTML 冻结 + 计数守恒');
    const incRaw = await evaluate(
      cdp,
      `(() => {
        const container = document.getElementById('stream');
        const first = document.querySelector('[data-card-key="ai1"]');
        const frozen = document.querySelector('[data-card-key="q1"]');
        const frozenHtml = frozen.outerHTML;
        const frozenNode = frozen;
        const beforeChildren = container.querySelectorAll(':scope > [data-card-key]').length;
        window.__v3.testing.streamSeed([{ kind: 'ai', cardId: 'ai-late', payload: { text: '追加' } }]);
        const afterChildren = container.querySelectorAll(':scope > [data-card-key]').length;
        const stats = window.__v3.testing.streamStats();
        return JSON.stringify({
          sameNode: document.querySelector('[data-card-key="ai1"]') === first,
          sameFrozenNode: document.querySelector('[data-card-key="q1"]') === frozenNode,
          frozenStable: document.querySelector('[data-card-key="q1"]').outerHTML === frozenHtml,
          beforeChildren,
          afterChildren,
          stats,
        });
      })()`,
    );
    const inc = JSON.parse(incRaw);
    check('④ 追加后既有卡节点引用不变（===，未整层重建）', inc.sameNode === true, incRaw);
    check('④ 终态卡节点引用不变', inc.sameFrozenNode === true, incRaw);
    check('④ 终态卡 outerHTML 逐字不变（DOM 冻结）', inc.frozenStable === true, incRaw);
    check('④ 追加只 +1 张卡（其余节点复用）', inc.afterChildren === inc.beforeChildren + 1, incRaw);
    check(
      '④ 容器 children 数 == project() 卡数（渲染与投影逐张一致）',
      inc.stats.rendered === inc.stats.projected && inc.stats.rendered === inc.afterChildren,
      incRaw,
    );
    // Static: the renderer carries no clearing API.
    const renderSrc = readFileSync(new URL('../../src/ui/sidepanel/stream-render.ts', import.meta.url), 'utf8');
    check('④ 静态零命中：stream-render.ts 无 `textContent = \'\'`', /textContent\s*=\s*''/.test(renderSrc) === false, '发现清空 API');
    check('④ 静态零命中：stream-render.ts 无 `replaceChildren(`', /replaceChildren\(/.test(renderSrc) === false, '发现 replaceChildren');

    // ── ⑤ scroll policy ─────────────────────────────────────────────────────
    console.log('\n▶ ⑤ 滚动：上滚期间追加不抢滚动 + 回到底部 hidden 驱动');
    const scrollRaw = await evaluate(
      cdp,
      `(() => {
        const log = document.getElementById('stream');
        const btn = document.getElementById('scroll-bottom');
        // Make the stream scrollable for sure.
        for (let i = 0; i < 30; i += 1) window.__v3.testing.streamSeed([{ kind: 'ai', cardId: 'pad-' + i, payload: { text: 'padding line ' + i } }]);
        log.scrollTop = 0;
        log.dispatchEvent(new Event('scroll'));
        const awayTop = Math.round(log.scrollTop);
        window.__v3.testing.streamSeed([{ kind: 'ai', cardId: 'after-away', payload: { text: 'x' } }]);
        const keptTop = Math.round(log.scrollTop);
        const shown = btn.hidden === false;
        btn.click();
        const afterClick = Math.round(log.scrollHeight - log.scrollTop - log.clientHeight);
        const hiddenAtBottom = btn.hidden === true;
        return JSON.stringify({ awayTop, keptTop, shown, afterClick, hiddenAtBottom });
      })()`,
    );
    const scroll = JSON.parse(scrollRaw);
    check('⑤ 上滚期间追加**不抢滚动**（scrollTop 保持不变）', scroll.keptTop === scroll.awayTop, scrollRaw);
    check('⑤ 上滚后「回到底部」显示（hidden=false）', scroll.shown === true, scrollRaw);
    check('⑤ 点击「回到底部」后贴底（距离 ≤48px）', scroll.afterClick <= 48, scrollRaw);
    check('⑤ 贴底后「回到底部」由 hidden 收起', scroll.hiddenAtBottom === true, scrollRaw);

    // ── ⑥ 320 / 400 / 520 zero overflow ─────────────────────────────────────
    console.log('\n▶ ⑥ 三宽度零水平溢出（含长 URL 卡）');
    await evaluate(
      cdp,
      seed([{ kind: 'ai', cardId: 'long-url', payload: { text: 'https://example.test/a/very/long/path/' + 'segment-'.repeat(30) + '?q=1' } }]),
    );
    for (const vp of [320, 400, 520]) {
      await setViewport(cdp, vp, VIEWPORT_HEIGHT);
      await sleep(250);
      const of = await evaluate(
        cdp,
        `JSON.stringify({
          doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          stream: document.getElementById('stream').scrollWidth - document.getElementById('stream').clientWidth,
        })`,
      );
      const o = JSON.parse(of);
      check(`⑥ ${vp}px 文档级零水平溢出`, o.doc === 0, of);
      check(`⑥ ${vp}px #stream 内零水平溢出（长 URL 折行）`, o.stream === 0, of);
    }
    await setViewport(cdp, 400, VIEWPORT_HEIGHT);

    // ── ⑦ accessibility ─────────────────────────────────────────────────────
    console.log('\n▶ ⑦ 无障碍：role=log / listitem / .ts / aria-live / hidden 收起');
    const a11yRaw = await evaluate(
      cdp,
      `(() => {
        const log = document.getElementById('stream');
        const cards = [...log.querySelectorAll(':scope > [data-msg-type]')];
        return JSON.stringify({
          tag: log.tagName,
          role: log.getAttribute('role'),
          allListItems: cards.every((c) => c.getAttribute('role') === 'listitem'),
          tsReadable: cards.every((c) => /^\\d{2}:\\d{2}:\\d{2}$/.test(c.querySelector('.card-head .ts')?.textContent ?? '')),
          fixedAria: cards.filter((c) => c.querySelector('.card-fixed')).every((c) => c.querySelector('.card-fixed').getAttribute('aria-live') === 'polite'),
          hiddenAttr: (() => { const c = document.querySelector('[data-card-key="q1"]'); return c.querySelector('.ask-form').hidden === true; })(),
        });
      })()`,
    );
    const a11y = JSON.parse(a11yRaw);
    check('⑦ 流本体为 ol#stream[role=log]', a11y.tag === 'OL' && a11y.role === 'log', a11yRaw);
    check('⑦ 每卡 role=listitem', a11y.allListItems === true, a11yRaw);
    check('⑦ 每卡 `.ts` 文本可读（HH:MM:SS）', a11y.tsReadable === true, a11yRaw);
    check('⑦ 固化区 aria-live=polite', a11y.fixedAria === true, a11yRaw);
    check('⑦ 收起一律用 hidden（非 display:none）', a11y.hiddenAttr === true, a11yRaw);

    // ── ⑧ long session ≈320 cards ───────────────────────────────────────────
    console.log('\n▶ ⑧ 长会话（≈320 卡）追加不整层重建');
    const longRaw = await evaluate(
      cdp,
      `(() => {
        const log = document.getElementById('stream');
        const first = document.querySelector('[data-card-key="ai1"]');
        const before = log.querySelectorAll(':scope > [data-card-key]').length;
        const batch = [];
        for (let i = 0; i < 300; i += 1) batch.push({ kind: i % 2 ? 'ai' : 'tool', cardId: 'long-' + i, payload: i % 2 ? { text: 'row ' + i } : { tool: 'bulk-tool', ok: true, ms: i, text: 'out ' + i } });
        window.__v3.testing.streamSeed(batch);
        const after = log.querySelectorAll(':scope > [data-card-key]').length;
        const stats = window.__v3.testing.streamStats();
        return JSON.stringify({
          before,
          after,
          sameFirstNode: document.querySelector('[data-card-key="ai1"]') === first,
          stats,
          toolCards: document.querySelectorAll('[data-msg-type="tool"]').length,
        });
      })()`,
    );
    const long = JSON.parse(longRaw);
    check('⑧ 批量追加 300 卡后总数 = 之前 + 300', long.after === long.before + 300, longRaw);
    check('⑧ 最早卡节点引用仍不变（未整层重建）', long.sameFirstNode === true, longRaw);
    check('⑧ 渲染卡数 == 投影卡数（长会话保持逐张一致）', long.stats.rendered === long.stats.projected, longRaw);
    check('⑧ 长会话下工具卡仍逐张渲染（无合并/丢弃）', long.toolCards >= 150, longRaw);

    check('无未捕获页面异常（流渲染全链路干净）', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
    cdp.close();

    // ── ⑨ counter conservation ──────────────────────────────────────────────
    console.log('\n▶ ⑨ 计数守恒（D-005 只增）');
    const runtime = counts().passes;
    const selfSource = readFileSync(new URL('./stream.mjs', import.meta.url), 'utf8');
    const staticCount = (selfSource.match(/\bcheck\(/g) ?? []).length;
    check(`⑨ 运行期断言计数 ≥ ${STREAM_RUNTIME_FLOOR}（D-005；countMethod = runtime-check-calls）`, runtime >= STREAM_RUNTIME_FLOOR, `runtime=${runtime}`);
    check(`⑨ 静态 check( 计数 ≥ ${STREAM_STATIC_FLOOR}`, staticCount >= STREAM_STATIC_FLOOR, `static=${staticCount}`);
  } finally {
    chrome.kill('SIGKILL');
  }
  finish('V4-2 流（事件模型 / 卡渲染）门禁');
}

main().catch((err) => {
  console.error(`✖ 流门禁异常：${err instanceof Error ? err.stack ?? err.message : String(err)}`);
  process.exit(1);
});
