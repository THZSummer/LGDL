/**
 * V5-3 **TASK-V5-163 / 164 / 165 / 166** (ADR-V5-006 · FR-ALLN-085~088 / 092 ·
 * **AC-ALLN-012 / 015** · N17 / N23 · R-ALLN-007 / 907 · R-V5-105) — the **授权 chip**
 * gate: 状态栏常显两态 + 零双写五条 + 黄 / 绿点击行为.
 *
 * ── The claim ────────────────────────────────────────────────────────────────
 *
 *   ① `#auth-state` is the **ONE** always-resident carrier of the authorization state:
 *      `data-auth ∈ {yellow, green}`, the copy is 逐字（未授权 · 零注入 / 已授权 ·
 *      supported）, and the chip is **never `hidden`** (a state is always true);
 *   ② **零双写五条**: the four words 未授权 / 已授权 / 零注入 / supported appear in
 *      `#region-toolbar` ∪ `#statusbar-text` ∪ `#risk-chips` ∪ `#risk-rail` **nowhere**
 *      — the unique hit is `#auth-state`;
 *   ③ 黄态点击 ⇒ 流内产 `[data-op="op.authorize"]` 的 nextstep 卡 + 一条系统行，**不跳走**；
 *      绿态点击 ⇒ 展开管理详情（默认折叠 / 键盘可达），**不跳走**；
 *   ④ J1~J4 不破（状态栏本体永不折叠 / `#risk-chips` 语义不变 / 授权态不再占 rail）。
 *
 * ── Falsifiability ───────────────────────────────────────────────────────────
 *
 * {@link JUDGEMENTS} declares one `expectFailPattern` per line; three of them are driven
 * red by a real injection and restored (hide the chip in a zero-risk scene ⇒ ①② red;
 * write a four-word back into the toolbar ⇒ ② red; move `[data-op]` off the minted card
 * ⇒ ③ red).
 *
 * Run: `node test/ui/auth-chip.mjs`   (one Chromium instance, serial — N13)
 */
import {
  CHROME,
  DIST,
  check,
  evaluate,
  finish,
  launch,
  openSidePanel,
  findOurServiceWorker,
  setViewport,
  sleep,
  VIEWPORT_HEIGHT,
  waitFor,
} from './_v3-helpers.mjs';

const FIXTURE_ORIGIN = 'https://v3-authchip.test';
/** The four words of the zero-double-write scan (FR-ALLN-086 ②). */
export const FOUR_WORDS = ['未授权', '已授权', '零注入'];
/**
 * The `supported` half is scanned as the **auth phrase** (`已授权 · supported`), never as a
 * bare token: `发现=supported` is the site's declaration/probing **protocol** state — a
 * connection fact, not an authorization state — so a bare-token match would be a false
 * positive. **This caliber is registered (v5-3 review R1 I-01)** in the parent ADR
 * (`ADR-V5-006 §2`「四词扫描范围」) and in the leaf `spec.md`, not only in build.md.
 *
 * The judgement is therefore about the **authorization-state semantic slot**, not a global
 * bare-word ban: the machine-readable slot is `data-auth` (see {@link AUTH_SLOT}) plus the
 * two literal state phrases. `#status`'s `发现=support`/`发现=unsupported` protocol token
 * is explicitly allowed to stay (it is the connection state that the toolbar summary carries).
 */
export const AUTH_PHRASES = ['未授权 · 零注入', '已授权 · supported'];
/** The authorization-state semantic slot (I-01): the ONE machine-readable carrier. */
export const AUTH_SLOT = '[data-auth]';
/** The two-state copy, 逐字 (FR-ALLN-085). */
export const STATE_TEXT = { yellow: '未授权 · 零注入', green: '已授权 · supported' };

export const JUDGEMENTS = [
  { id: 'AC-1-two-states', expectFailPattern: '两态恒显其一（chip 永不为 hidden）' },
  { id: 'AC-2-unique-carrier', expectFailPattern: '四词唯一命中必须 = #auth-state（工具栏 / rail 零出现）' },
  { id: 'AC-2b-auth-slot', expectFailPattern: '授权态语义位（[data-auth]）必须唯一：工具栏区零出现（I-01 口径）' },
  { id: 'AC-3-yellow-click', expectFailPattern: '黄态点击必须产 op.authorize next 卡 + 系统行（不跳走）' },
  { id: 'AC-4-green-click', expectFailPattern: '绿态点击必须展开管理详情（默认折叠 / 不跳走）' },
  { id: 'AC-5-j1-j4', expectFailPattern: 'J1~J4 不得被授权 chip 破坏' },
];

/** The chip + the zero-double-write scan, in one reading. */
const SCAN = `(() => {
  const chip = document.getElementById('auth-state');
  const bar = document.getElementById('region-statusbar');
  const chips = document.getElementById('risk-chips');
  const rail = document.getElementById('risk-rail');
  const toolbar = document.getElementById('region-toolbar');
  const text = document.getElementById('statusbar-text');
  const hits = [];
  for (const [name, el] of [['region-toolbar', toolbar], ['statusbar-text', text], ['risk-chips', chips], ['risk-rail', rail]]) {
    if (!el) { hits.push('missing:' + name); continue; }
    const textContent = el.textContent || '';
    for (const w of ${JSON.stringify(FOUR_WORDS)}) if (textContent.includes(w)) hits.push(name + ':' + w);
    for (const ph of ${JSON.stringify(AUTH_PHRASES)}) if (textContent.includes(ph)) hits.push(name + ':phrase:' + ph);
  }
  const vis = (el) => { let n = el; while (n) { if (n.hidden === true) return false; n = n.parentElement; } return Boolean(el); };
  // I-01 (v5-3 review R1): the authorization-state **semantic slot** — the machine-readable
  // channel, judged independently of the discovery-protocol token. It must be exactly ONE
  // element in the whole panel (the chip) and ZERO inside the toolbar region.
  const authSlot = [...document.querySelectorAll('${AUTH_SLOT}')];
  const toolbarSlot = toolbar ? [...(toolbar.hasAttribute('data-auth') ? [toolbar] : []), ...toolbar.querySelectorAll('${AUTH_SLOT}')] : null;
  // 密度口径（ADR-V4-020）：测量根 = document.body，豁免子树 = #stream（只认 hidden 祖先）。
  const stream = document.getElementById('stream');
  const clickables = [...document.body.querySelectorAll('*')].filter((el) => {
    if (stream && stream.contains(el)) return false;
    if (!vis(el)) return false;
    const tag = el.tagName || '';
    return /^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(tag) || (el.hasAttribute('tabindex') && el.getAttribute('tabindex') !== '-1');
  }).length;
  return JSON.stringify({
    state: chip ? chip.getAttribute('data-auth') : null,
    chipText: chip ? chip.textContent : null,
    hidden: chip ? chip.hidden : null,
    barHidden: bar ? bar.hidden : null,
    chipsHidden: chips ? chips.hidden : null,
    railRows: rail ? rail.querySelectorAll('.risk-row[data-risk-class]').length : -1,
    railAuth: rail ? rail.querySelectorAll('[data-risk-class="unauthorized"]').length : -1,
    hits,
    clickables,
    authSlotCount: authSlot.length,
    authSlotIds: authSlot.map((el) => el.id || '(no-id)'),
    toolbarAuthSlotCount: toolbarSlot ? toolbarSlot.length : -1,
    detailHidden: document.getElementById('auth-detail') ? document.getElementById('auth-detail').hidden : null,
  });
})()`;

async function main() {
  console.log(`▶ chrome: ${CHROME}`);
  console.log(`▶ dist:   ${DIST}`);
  const { chrome, base } = await launch({ tag: 'auth-chip', extDir: DIST, portRange: [9840, 9920] });
  try {
    const sw = await findOurServiceWorker(base);
    if (!sw) throw new Error('web-cli plugin service worker 不可达');
    const { cdp } = await openSidePanel(sw.cdp, base);
    const pageErrors = [];
    cdp.on('Runtime.exceptionThrown', (p) => pageErrors.push(p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text));
    await setViewport(cdp, 400, VIEWPORT_HEIGHT);
    await waitFor(cdp, `document.getElementById('auth-state') ? '1' : ''`, 80, 200);

    // ── ① 两态恒显其一 ─────────────────────────────────────────────────────────
    console.log('\n▶ ① 两态：未授权 ⇒ yellow；授权后 ⇒ green（逐字；永不为 hidden）');
    const yellow = JSON.parse(await evaluate(cdp, SCAN));
    check(
      `① 未授权会话 data-auth=yellow ∧ 逐字「${STATE_TEXT.yellow}」∧ 永不 hidden`,
      yellow.state === 'yellow' && yellow.chipText === STATE_TEXT.yellow && yellow.hidden === false,
      JSON.stringify(yellow),
    );
    check('① 授权态**不再**占风险 rail（R-V5-105 / N23）', yellow.railAuth === 0, JSON.stringify({ railAuth: yellow.railAuth, railRows: yellow.railRows }));
    check('① 零风险时 `#risk-chips` 收缩为 hidden（J2 语义不变）', yellow.chipsHidden === true, JSON.stringify(yellow));

    await evaluate(cdp, `chrome.runtime.sendMessage({ kind: 'discover', origin: ${JSON.stringify(FIXTURE_ORIGIN)}, state: 'supported' }).then(() => true)`);
    await waitFor(cdp, `document.getElementById('status').textContent.includes('v3-authchip.test') ? '1' : ''`, 60, 200);
    await evaluate(cdp, `chrome.runtime.sendMessage({ kind: 'authorize', origin: ${JSON.stringify(FIXTURE_ORIGIN)}, hostPermissionGranted: false }).then(() => true)`);
    await evaluate(cdp, `window.__v3.testing.refresh(); true`);
    await waitFor(cdp, `chrome.runtime.sendMessage({ kind: 'state' }).then((r) => r.data.authorized === true)`, 60, 200);
    await evaluate(cdp, `window.__v3.testing.refresh(); true`);
    await sleep(250);
    const green = JSON.parse(await evaluate(cdp, SCAN));
    check(
      `① 已授权会话 data-auth=green ∧ 逐字「${STATE_TEXT.green}」∧ 永不 hidden`,
      green.state === 'green' && green.chipText === STATE_TEXT.green && green.hidden === false,
      JSON.stringify(green),
    );
    check('① 状态 ≡ 授权事实（同源：授权后转绿，且 rail 仍无授权类）', green.railAuth === 0, JSON.stringify({ railAuth: green.railAuth }));

    // ── ② 零双写五条（四词唯一命中 = #auth-state） ──────────────────────────────
    console.log('\n▶ ② 零双写：四词在工具栏区 / 风险区零出现，唯一命中 = #auth-state');
    check(`② 扫描范围（工具栏 ∪ 状态行 ∪ #risk-chips ∪ rail）四词零命中`, green.hits.length === 0, JSON.stringify(green.hits));
    check('② 唯一命中 = #auth-state（其文本即两态之一）', green.chipText === STATE_TEXT.green, JSON.stringify(green.chipText));
    // I-01（v5-3 review R1）：覆盖「授权态**语义位**」而非裸词全局禁 —— 机器可读位 `data-auth`
    // 全 UI 恰 1 处（= chip），工具栏区 0 处；`发现=supported`（探测协议态 / 连接态）不参与本判据。
    check(
      '② 授权态语义位（I-01）：全 UI `[data-auth]` 恰 1 处 = #auth-state',
      green.authSlotCount === 1 && green.authSlotIds[0] === 'auth-state',
      JSON.stringify({ authSlotCount: green.authSlotCount, authSlotIds: green.authSlotIds }),
    );
    check('② 授权态语义位（I-01）：工具栏区 `[data-auth]` 恰 0 处（无颜色 / 属性第二投影）', green.toolbarAuthSlotCount === 0, JSON.stringify({ toolbarAuthSlotCount: green.toolbarAuthSlotCount }));
    // 反证：把授权态语义位塞进工具栏 ⇒ 语义位判据必红；还原 ⇒ 绿。
    const injSlot = JSON.parse(
      await evaluate(cdp, `(() => { const t = document.getElementById('region-toolbar'); t.setAttribute('data-auth', 'green'); const r = ${SCAN}; t.removeAttribute('data-auth'); return r; })()`),
    );
    check(
      '② (FAIL 段) 授权态语义位第二投影注入工具栏 ⇒ 语义位判据必红',
      injSlot.toolbarAuthSlotCount === 1 && injSlot.authSlotCount === 2,
      JSON.stringify({ toolbarAuthSlotCount: injSlot.toolbarAuthSlotCount, authSlotCount: injSlot.authSlotCount }),
    );
    const restSlot = JSON.parse(await evaluate(cdp, SCAN));
    check('② (PASS 段) 还原后语义位回到恰 1 处（判据非恒真）', restSlot.authSlotCount === 1 && restSlot.toolbarAuthSlotCount === 0, JSON.stringify({ authSlotCount: restSlot.authSlotCount, toolbarAuthSlotCount: restSlot.toolbarAuthSlotCount }));
    // I-02（v5-3 review R1）：工具栏摘要 dot 只表**会话连接态**（G 稿「摘要 dot 恒绿」）——
    // 非 idle 恒 ok，与授权态解耦（授权态只在 chip 的语义位里）。
    const dots = JSON.parse(
      await evaluate(cdp, `(() => { const s = document.querySelector('.site-summary'); const p = document.getElementById('l0-policy-badge'); return JSON.stringify({ statusDot: s ? s.getAttribute('data-status-dot') : null, policyTone: p ? p.getAttribute('data-tone') : null, policy: p ? p.textContent : null, auth: document.getElementById('auth-state').getAttribute('data-auth') }); })()`),
    );
    check(
      '② 摘要 dot（I-02）只表会话连接态：有站点 ⇒ ok（与授权态解耦；G 稿「摘要 dot 恒绿」）',
      dots.statusDot === 'ok' && dots.auth === 'green',
      JSON.stringify(dots),
    );
    check(
      '② 策略徽标 tone（I-02）走 policy 维度（trusted ⇒ ok / untrusted ⇒ warn），不再搭授权 dot 的便车',
      dots.policyTone === (dots.policy === '策略：trusted' ? 'ok' : 'warn'),
      JSON.stringify(dots),
    );
    // 反证：把四词写回工具栏 ⇒ 必红；还原 ⇒ 绿。
    const inj2 = JSON.parse(
      await evaluate(cdp, `(() => { const s = document.getElementById('status'); const old = s.textContent; s.textContent = old + ' · 已授权'; const r = ${SCAN}; s.textContent = old; return r; })()`),
    );
    check(`② (FAIL 段) ${JUDGEMENTS[1].expectFailPattern}`, inj2.hits.includes('region-toolbar:已授权'), JSON.stringify(inj2.hits));
    const rest2 = JSON.parse(await evaluate(cdp, SCAN));
    check('② (PASS 段) 还原后四词零命中（判据非恒真）', rest2.hits.length === 0, JSON.stringify(rest2.hits));

    // ── ④ J1~J4 ───────────────────────────────────────────────────────────────
    check('④ J1 状态栏本体永不带 hidden', rest2.barHidden === false, JSON.stringify({ barHidden: rest2.barHidden }));
    check('④ J2 零风险 ⇒ chips hidden ∧ rail 无授权类', rest2.chipsHidden === true && rest2.railAuth === 0, JSON.stringify(rest2));
    // J3 是**祖先闭包**判据（chip 自身的 aria-expanded 是它的 disclose 通道，不算祖先）。
    const j3 = await evaluate(cdp, `(() => { let bad = 0; let n = document.getElementById('auth-state').parentElement; while (n) { if (n.hidden === true || n.hasAttribute('aria-expanded') || n.tagName === 'DETAILS') bad += 1; n = n.parentElement; } return bad; })()`);
    check('④ J3 chip 的祖先闭包无 hidden / 无折叠容器', j3 === 0, `bad=${j3}`);
    // 用**视图替换型**视图（audit）验 J4；settings 是独立 surface（须经 `#settings-back` 关闭），
    // 否则它的控件会落进默认屏读数（下面绿态测量的前置条件）。
    await evaluate(cdp, `window.__v3.testing.openL2View('audit'); true`);
    await sleep(200);
    const j4 = JSON.parse(await evaluate(cdp, SCAN));
    await evaluate(cdp, `window.__v3.testing.closeL2View(); true`);
    await evaluate(cdp, `(() => { const b = document.getElementById('settings-back'); if (b && document.getElementById('settings-view').hidden === false) b.click(); return true; })()`);
    await sleep(150);
    check('④ J4 打开视图不触碰状态栏（chip 两态仍在位）', j4.chipText === STATE_TEXT.green && j4.hidden === false, JSON.stringify({ t: j4.chipText }));

    // ── ③ 黄态点击 ⇒ 产 op.authorize next 卡 + 系统行（不跳走） ─────────────────
    console.log('\n▶ ③ 黄态点击 ⇒ 流内 op.authorize next 卡 + 系统行；面板 / 视图零切换');
    await evaluate(cdp, `chrome.runtime.sendMessage({ kind: 'revoke', origin: ${JSON.stringify(FIXTURE_ORIGIN)} }).then(() => true)`);
    await evaluate(cdp, `window.__v3.testing.refresh(); true`);
    await waitFor(cdp, `chrome.runtime.sendMessage({ kind: 'state' }).then((r) => r.data.authorized !== true)`, 60, 200);
    await evaluate(cdp, `window.__v3.testing.refresh(); window.__v3.testing.streamReset(); true`);
    await sleep(250);
    const beforeClick = JSON.parse(await evaluate(cdp, SCAN));
    check('③ 前置：回到黄态', beforeClick.state === 'yellow', JSON.stringify(beforeClick));
    // I-02 direct decoupling proof: with the SAME active origin, the dot stays `ok` while the
    // authorization state flips green → yellow. A dot coupled to `authorized` would be `warn` here.
    const yellowDot = JSON.parse(
      await evaluate(cdp, `(() => { const s = document.querySelector('.site-summary'); const p = document.getElementById('l0-policy-badge'); return JSON.stringify({ statusDot: s ? s.getAttribute('data-status-dot') : null, policyTone: p ? p.getAttribute('data-tone') : null, auth: document.getElementById('auth-state').getAttribute('data-auth') }); })()`),
    );
    check(
      '③ 前置 摘要 dot（I-02）：授权态由 green→yellow 翻转后 dot 仍 ok ⇒ 与授权态解耦（同上 origin）',
      yellowDot.statusDot === 'ok' && yellowDot.auth === 'yellow',
      JSON.stringify(yellowDot),
    );
    const yellowClick = JSON.parse(
      await evaluate(
        cdp,
        `(() => {
          const viewBefore = document.getElementById('view-host').hidden;
          const settingsBefore = document.getElementById('settings-view').hidden;
          document.getElementById('auth-state').click();
          const cards = [...document.querySelectorAll('#stream [data-msg-type="nextstep"] [data-op]')].map((b) => b.getAttribute('data-op'));
          const sysRows = [...document.querySelectorAll('#stream [data-msg-type="system"]')].map((s) => s.textContent);
          return JSON.stringify({
            viewBefore, settingsBefore,
            viewAfter: document.getElementById('view-host').hidden,
            settingsAfter: document.getElementById('settings-view').hidden,
            cards, sysRows,
          });
        })()`,
      ),
    );
    check(
      `③ (FAIL-able) 黄点击 ⇒ 流内新增含 [data-op="op.authorize"] 的 next 卡`,
      yellowClick.cards.includes('op.authorize'),
      JSON.stringify(yellowClick.cards),
    );
    check('③ 黄点击追加一条系统行（可读因果）', yellowClick.sysRows.length >= 1, JSON.stringify(yellowClick.sysRows));
    check(
      '③ 不跳走：点击前后 `#view-host` / `#settings-view` 的可见性均不变（NG-ALLN-019）',
      yellowClick.viewBefore === yellowClick.viewAfter && yellowClick.settingsBefore === yellowClick.settingsAfter,
      JSON.stringify(yellowClick),
    );
    // 反证：把铸造卡上的 [data-op] 摘掉 ⇒ ③ 判据必红；还原 ⇒ 绿。
    const inj3 = JSON.parse(
      await evaluate(
        cdp,
        `(() => { const b = document.querySelector('#stream [data-msg-type="nextstep"] [data-op="op.authorize"]'); b.removeAttribute('data-op'); const cards = [...document.querySelectorAll('#stream [data-msg-type="nextstep"] [data-op]')].map((x) => x.getAttribute('data-op')); b.setAttribute('data-op', 'op.authorize'); return JSON.stringify({ cards }); })()`,
      ),
    );
    check(`③ (FAIL 段) ${JUDGEMENTS[2].expectFailPattern}`, !inj3.cards.includes('op.authorize'), JSON.stringify(inj3.cards));

    // ── ③ 绿态点击 ⇒ 管理详情（默认折叠 / ≤7 / 键盘可达 / 不跳走） ─────────────
    console.log('\n▶ ③ 绿态点击 ⇒ 管理详情展开（默认折叠 / 展开后默认屏 ≤7 / 键盘可达）');
    await evaluate(cdp, `chrome.runtime.sendMessage({ kind: 'authorize', origin: ${JSON.stringify(FIXTURE_ORIGIN)}, hostPermissionGranted: false }).then(() => true)`);
    await evaluate(cdp, `window.__v3.testing.refresh(); true`);
    await waitFor(cdp, `chrome.runtime.sendMessage({ kind: 'state' }).then((r) => r.data.authorized === true)`, 60, 200);
    await evaluate(cdp, `window.__v3.testing.refresh(); true`);
    await sleep(250);
    await evaluate(cdp, `(() => { const b = document.getElementById('settings-back'); if (b && document.getElementById('settings-view').hidden === false) b.click(); return true; })()`);
    await sleep(150);
    const detailClosed = JSON.parse(await evaluate(cdp, SCAN));
    check('③ 管理详情**默认折叠**（`hidden` ⇒ 不计默认密度）', detailClosed.detailHidden === true, JSON.stringify({ detailHidden: detailClosed.detailHidden }));
    check('③ 默认屏可点 = 工具栏 5 + auth chip 1 = 6 ≤ 7', detailClosed.clickables === 6, JSON.stringify({ clickables: detailClosed.clickables }));
    const greenClick = JSON.parse(
      await evaluate(
        cdp,
        `(() => {
          const viewBefore = document.getElementById('view-host').hidden;
          document.getElementById('auth-state').click();
          const expanded = document.getElementById('auth-detail').hidden === false;
  const vis = (el) => { let n = el; while (n) { if (n.hidden === true) return false; n = n.parentElement; } return Boolean(el); };
          const st = document.getElementById('stream');
          const clickables = [...document.body.querySelectorAll('*')].filter((el) => { if (st && st.contains(el)) return false; if (!vis(el)) return false; const t = el.tagName || ''; return /^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(t) || (el.hasAttribute('tabindex') && el.getAttribute('tabindex') !== '-1'); }).length;
          const sel = document.getElementById('auth-detail-actions');
          const ops = sel ? [...sel.options].map((o) => o.value).filter((v) => v) : [];
          const focusables = sel && sel.tabIndex >= 0 ? 1 : 0;
          return JSON.stringify({ expanded, clickables, ops, focusables, viewBefore, viewAfter: document.getElementById('view-host').hidden, aria: document.getElementById('auth-state').getAttribute('aria-expanded') });
        })()`,
      ),
    );
    check('③ 绿点击 ⇒ 管理详情展开（`hidden` 解除）', greenClick.expanded === true, JSON.stringify(greenClick));
    check('③ 管理详情含 `op.revoke` / `op.rebind` 两入口（同一控件的两个选项）', greenClick.ops.includes('op.revoke') && greenClick.ops.includes('op.rebind'), JSON.stringify(greenClick.ops));
    check('③ 展开后默认屏可点 ≤ 7（6 + 恰 1 个管理控件）', greenClick.clickables === 7, JSON.stringify({ clickables: greenClick.clickables }));
    check('③ 键盘可达（管理控件 tabIndex ≥ 0）∧ `aria-expanded` 同步', greenClick.focusables === 1 && greenClick.aria === 'true', JSON.stringify(greenClick));
    check('③ 绿点击不跳走（`#view-host` 可见性不变）', greenClick.viewBefore === greenClick.viewAfter, JSON.stringify(greenClick));
    // 再点一次 ⇒ 收起（按需面）
    const collapse = JSON.parse(await evaluate(cdp, `(() => { document.getElementById('auth-state').click(); return JSON.stringify({ hidden: document.getElementById('auth-detail').hidden, aria: document.getElementById('auth-state').getAttribute('aria-expanded') }); })()`));
    check('③ 再点击 ⇒ 管理详情收起（按需面，非常驻）', collapse.hidden === true && collapse.aria === 'false', JSON.stringify(collapse));

    // ── ① 反证：零风险场景把 chip 置 hidden ⇒ 判据必红 ─────────────────────────
    const inj1 = JSON.parse(
      await evaluate(cdp, `(() => { const c = document.getElementById('auth-state'); c.hidden = true; const r = ${SCAN}; c.hidden = false; return r; })()`),
    );
    check(`① (FAIL 段) ${JUDGEMENTS[0].expectFailPattern}`, inj1.hidden === true, JSON.stringify({ hidden: inj1.hidden }));
    const rest1 = JSON.parse(await evaluate(cdp, SCAN));
    check('① (PASS 段) 还原后 chip 常显（永不 hidden）', rest1.hidden === false, JSON.stringify({ hidden: rest1.hidden }));

    check('元判据：每条 judgement 声明非占位 expectFailPattern', JUDGEMENTS.length >= 3 && JUDGEMENTS.every((j) => j.expectFailPattern.trim().length >= 8), JSON.stringify(JUDGEMENTS.map((j) => j.id)));
    check('无未捕获页面异常（授权 chip 全链路干净）', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
    cdp.close();
  } finally {
    chrome.kill('SIGKILL');
  }
  finish('V5-3 授权 chip 门禁');
}

main().catch((err) => {
  console.error(`✖ 授权 chip 门禁异常：${err instanceof Error ? err.stack ?? err.message : String(err)}`);
  process.exit(1);
});
