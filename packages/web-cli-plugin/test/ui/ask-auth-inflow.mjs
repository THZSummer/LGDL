/**
 * V4-3 TASK-709 (leaf `specs-tree-v4-3-ask-auth-inflow`) — the **ask/auth inflow**
 * gate (`npm run test:ask-auth`).
 *
 * Runs against the real `dist/` product through the REAL reducer + real card
 * factory (the `window.__v3.testing` seam drives the same `reduce`/`render` path
 * the background messages use — no shadow implementation):
 *
 *   ① choice 型：选项组 + 末项兜底默认收起（shim C1/C2/C4）
 *   ② text 型：卡内输入按需出现（shim C1）
 *   ③ 固化两态：答 / 取消（`data-answered` + 表单移除 + `.card-fixed` + `.ts`）（C5~C10）
 *   ④ 不可二次：终态卡 DOM 内 `button/input/select/textarea` = 0（C9）
 *   ⑤ 超时 / 取代留痕：`.ts` + 固化文案 + 系统行（C10 / EC-CHAT-001/002）
 *   ⑥ 授权卡：批准 / 拒绝固化 + 审计入口 + 终态零操作控件（D2/D3/D5/D6）
 *   ⑦ **AC-CHAT-016**：流内固化可读 + 时间戳 + 审计入口 + 审计视图分工 +
 *      站点级授权在设置视图可发现 / 可读（本叶唯一验收面）
 *   ⑧ `aria-live` + 320/400/520 零横向溢出 + 单卡可点 ≤ 6
 *   ⑨ 零明文：渲染文案 / 系统行不含 URL query / 密钥 / 命令参数体
 *   ⑩ 计数守恒（D-005 只增）
 *
 * The design-draft equivalents live in `design/ui-redesign/option-f-shim.mjs`
 * (frozen by `test/design-contract.test.ts`); R4-20 keeps the two numbers
 * registered separately — this file is the real-product side.
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
  finish,
  launch,
  openSidePanel,
  findOurServiceWorker,
  setViewport,
  sleep,
  VIEWPORT_HEIGHT,
  waitFor,
} from './_v3-helpers.mjs';

/** D-005 runtime floor（本叶台账 `v4GateFloors`）：首次实测后只增不减。 */
const ASK_AUTH_RUNTIME_FLOOR = 30;
/** 静态 `check(` 下界（同口径：文件自身计数）。 */
const ASK_AUTH_STATIC_FLOOR = 30;

/** The four tags a terminal card must not contain (shim C9 / D6). */
const CONTROL_TAGS = 'button,input,select,textarea';

/** A shared in-page visibility probe. */
const VIS = `const vis = (el) => { let n = el; while (n) { if (n.hidden === true) return false; n = n.parentElement; } return Boolean(el); };`;

async function main() {
  console.log(`▶ chrome: ${CHROME}`);
  console.log(`▶ dist:   ${DIST}`);
  const { chrome, base } = await launch({ tag: 'ask-auth', extDir: DIST, portRange: [9700, 9799] });
  try {
    const sw = await findOurServiceWorker(base);
    if (!sw) throw new Error('web-cli plugin service worker 不可达');
    const { cdp } = await openSidePanel(sw.cdp, base);
    const pageErrors = [];
    cdp.on('Runtime.exceptionThrown', (p) => pageErrors.push(p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text));

    await setViewport(cdp, 400, VIEWPORT_HEIGHT);
    await waitFor(cdp, `document.getElementById('stream') ? '1' : ''`, 80, 200);

    // ── ① choice 型 ───────────────────────────────────────────────────────────
    console.log('\n▶ ① choice 型：选项组 ≥3 + 末项兜底默认收起 + 取消入口');
    await evaluate(cdp, `window.__v3.testing.streamReset(); window.__v3.testing.ask('译文写回哪里？', ['原文替换', '插入到下方', '只给我译文']); true`);
    await sleep(200);
    const choiceRaw = await evaluate(
      cdp,
      `(() => {
        ${VIS}
        const c = document.querySelector('[data-msg-type="askuser"]');
        const fixed = c.querySelector('.card-fixed');
        return JSON.stringify({
          kind: c.getAttribute('data-ask-kind'),
          answered: c.getAttribute('data-answered'),
          options: [...c.querySelectorAll('#ask-options button')].map((b) => b.textContent),
          fallbackHidden: document.getElementById('ask-fallback').hidden,
          cancel: Boolean(document.getElementById('ask-cancel')),
          prompt: document.getElementById('ask-prompt').textContent,
          formVisible: vis(c.querySelector('.ask-form')),
          fixedHidden: fixed.hidden,
          clickables: [...c.querySelectorAll('button,a,select,textarea')].filter((el) => vis(el) && el.disabled !== true).length,
        });
      })()`,
    );
    const choice = JSON.parse(choiceRaw);
    check('① choice 型卡存在且 data-ask-kind=choice', choice.kind === 'choice', choiceRaw);
    check('① 选项 ≥3', choice.options.length >= 3, choiceRaw);
    check('① 末项逐字「其他…（我来描述）」', choice.options.at(-1) === '其他…（我来描述）', choiceRaw);
    check('① 兜底输入默认 hidden（法四）', choice.fallbackHidden === true, choiceRaw);
    check('① 取消入口存在且提示「不代填默认值」', choice.cancel === true, choiceRaw);
    check('① 操作前：表单可见 + 固化区 hidden + data-answered=false', choice.formVisible === true && choice.fixedHidden === true && choice.answered === 'false', choiceRaw);
    check('① 单卡可点 ≤6', choice.clickables <= 6, choiceRaw);

    // ── ③ ask 固化两态 + ④ 不可二次 ──────────────────────────────────────────
    console.log('\n▶ ③ ask 固化：回答 / 取消（data-answered + 表单移除 + .card-fixed + .ts）');
    await evaluate(cdp, `document.querySelector('[data-msg-type="askuser"] [data-act="choose"]').click(); true`);
    await sleep(200);
    const answeredRaw = await evaluate(
      cdp,
      `(() => {
        ${VIS}
        const c = document.querySelector('[data-msg-type="askuser"]');
        const fixed = c.querySelector('.card-fixed');
        return JSON.stringify({
          answered: c.getAttribute('data-answered'),
          formGone: c.querySelector('.ask-form') === null,
          fixedVisible: vis(fixed),
          fixedText: fixed.querySelector('b')?.textContent ?? '',
          ts: fixed.querySelector('.card-fixed-time')?.textContent ?? '',
          controls: c.querySelectorAll('${CONTROL_TAGS}').length,
        });
      })()`,
    );
    const answered = JSON.parse(answeredRaw);
    check('③ 回答后 data-answered=true', answered.answered === 'true', answeredRaw);
    check('③ 回答后表单已移除（结构性不可二次）', answered.formGone === true, answeredRaw);
    check('③ 固化区可见且文案含「已答：原文替换」', answered.fixedVisible === true && answered.fixedText.includes('已答：原文替换'), answeredRaw);
    check('③ 固化时间戳为 HH:MM:SS', /^\d{2}:\d{2}:\d{2}$/.test(answered.ts), answeredRaw);
    check('④ 终态卡零操作控件（DOM 计数 = 0）', answered.controls === 0, answeredRaw);

    // cancel
    await evaluate(cdp, `window.__v3.testing.streamReset(); window.__v3.testing.ask('再来一次', ['甲', '乙', '丙']); true`);
    await sleep(150);
    await evaluate(cdp, `document.getElementById('ask-cancel').click(); true`);
    await sleep(200);
    const cancelRaw = await evaluate(
      cdp,
      `(() => {
        const c = document.querySelector('[data-msg-type="askuser"]');
        return JSON.stringify({
          answered: c.getAttribute('data-answered'),
          reason: c.getAttribute('data-cancel-reason'),
          fixedText: c.querySelector('.card-fixed b')?.textContent ?? '',
          controls: c.querySelectorAll('${CONTROL_TAGS}').length,
        });
      })()`,
    );
    const cancel = JSON.parse(cancelRaw);
    check('③ 取消后 data-answered=cancelled（C10）', cancel.answered === 'cancelled', cancelRaw);
    check('③ 取消固化文案逐字「已取消（不代填默认值）」', cancel.fixedText === '已取消（不代填默认值）', cancelRaw);
    check('④ 取消终态卡同样零操作控件', cancel.controls === 0, cancelRaw);

    // ── ② text 型 ─────────────────────────────────────────────────────────────
    console.log('\n▶ ② text 型：卡内输入按需出现 + 提交固化');
    await evaluate(cdp, `window.__v3.testing.streamReset(); window.__v3.testing.streamSeed([{ kind: 'askuser', cardId: 'tx1', payload: { askKind: 'text', prompt: '补充说明', requestId: 'tx-req' } }]); true`);
    await sleep(200);
    const textRaw = await evaluate(
      cdp,
      `(() => {
        ${VIS}
        const input = document.getElementById('ask-input');
        return JSON.stringify({
          kind: document.querySelector('[data-msg-type="askuser"]').getAttribute('data-ask-kind'),
          fallbackVisible: vis(document.getElementById('ask-fallback')),
          hasInput: Boolean(input),
        });
      })()`,
    );
    const text = JSON.parse(textRaw);
    check('② text 型 data-ask-kind=text', text.kind === 'text', textRaw);
    check('② text 型卡内输入按需出现（fallback 可见）', text.fallbackVisible === true && text.hasInput === true, textRaw);
    await evaluate(cdp, `(() => { const i = document.getElementById('ask-input'); i.value = '我的补充'; document.getElementById('ask-submit').click(); return true; })()`);
    await sleep(200);
    const textAnswered = await evaluate(cdp, `document.querySelector('[data-msg-type="askuser"] .card-fixed b')?.textContent ?? ''`);
    check('② text 型提交后固化「已答：我的补充」', textAnswered === '已答：我的补充', String(textAnswered));

    // ── ⑭ 扩形（secret / form）— V5-2 TASK-V5-135/138/151 ────────────────────────
    // 扩形是**既有 kind 的枚举值**（`askuser`，不是新卡类型）；两份渲染各有独立判据。
    console.log('\n▶ ⑭ 扩形：secret 掩码卡 + form 多选卡');
    await evaluate(
      cdp,
      `window.__v3.testing.streamReset(); window.__v3.testing.streamSeed([{ kind: 'askuser', cardId: 'sc1', payload: { askKind: 'secret', prompt: 'API Key（仅写入本机）', secretLabel: '凭据（不回显）', requestId: 'sc-req' } }]); true`,
    );
    await sleep(200);
    const secretRaw = await evaluate(
      cdp,
      `(() => {
        const input = document.getElementById('ask-input');
        const card = document.querySelector('[data-msg-type="askuser"]');
        const vis = (el) => { let n = el; while (n) { if (n.hidden === true) return false; n = n.parentElement; } return Boolean(el); };
        return JSON.stringify({
          kind: card?.getAttribute('data-ask-kind'),
          type: input?.getAttribute('type'),
          secret: input?.getAttribute('data-secret'),
          hasFallback: Boolean(document.getElementById('ask-fallback')),
          clickables: [...card.querySelectorAll('button,input,select,textarea')].filter(vis).length,
        });
      })()`,
    );
    const secret = JSON.parse(secretRaw);
    check('⑭ secret 型 data-ask-kind=secret（既有 kind 的枚举值，非新卡类型）', secret.kind === 'secret', secretRaw);
    check('⑭ secret 型输入 type=password + data-secret=true（值不回显）', secret.type === 'password' && secret.secret === 'true', secretRaw);
    check('⑭ secret 型卡内可点 ≤6（复用一个 input/submit/cancel 三元组）', secret.clickables <= 6, secretRaw);
    // 提交一个值 ⇒ 固化只落**事实**（掩码 + 长度类别），值零出现（法八入口侧）。
    await evaluate(
      cdp,
      `(() => { const i = document.getElementById('ask-input'); i.value = 'sk-abcdefghijklmnop'; document.getElementById('ask-submit').click(); return true; })()`,
    );
    await sleep(200);
    const secretFixed = await evaluate(
      cdp,
      `(() => {
        const card = document.querySelector('[data-msg-type="askuser"]');
        const fixed = card?.querySelector('.card-fixed b')?.textContent ?? '';
        return JSON.stringify({ fixed, stream: document.getElementById('stream').textContent ?? '' });
      })()`,
    );
    const sf = JSON.parse(secretFixed);
    // 类别（8+ / 8-）取决于驱动路径：真实 op params 的掩码卡带 `maskedLength`（≥8 ⇒ 8+）；
    // seed 直驱的卡没有该事实 ⇒ 类别位落 8-。判据锚在**文案只含事实**（掩码 · 零明文 · 类别位）上。
    check('⑭ secret 固化文案 = 事实（掩码 · 零明文 · 长度类别位）', /掩码 · 零明文 · 8[+-] 位/.test(sf.fixed), secretFixed);
    check('⑭ 流内零明文：值/前缀不出现在消息区（法八入口侧）', !sf.stream.includes('sk-abcdefghijklmnop') && !/sk-abcdef/.test(sf.stream), secretFixed);

    await evaluate(
      cdp,
      `window.__v3.testing.streamReset(); window.__v3.testing.streamSeed([{ kind: 'askuser', cardId: 'fm1', payload: { askKind: 'form', prompt: '选择要申请的浏览器权限', requestId: 'fm-req', formOptions: [{ id: 'bookmarks', label: '书签访问', scope: 'bookmarks' }, { id: 'downloads', label: '下载记录（只读）', scope: 'downloads' }, { id: 'notify', label: '系统通知', scope: 'notifications' }, { id: 'clipboard', label: '剪贴板访问', scope: 'clipboardRead · clipboardWrite' }] } }]); true`,
    );
    await sleep(200);
    const formRaw = await evaluate(
      cdp,
      `(() => {
        const card = document.querySelector('[data-msg-type="askuser"]');
        const vis = (el) => { let n = el; while (n) { if (n.hidden === true) return false; n = n.parentElement; } return Boolean(el); };
        const boxes = [...card.querySelectorAll('input[type="checkbox"][data-cap]')];
        return JSON.stringify({
          kind: card?.getAttribute('data-ask-kind'),
          ids: boxes.map((b) => b.getAttribute('data-cap')),
          hasFallbackInput: Boolean(document.getElementById('ask-input')),
          hasSubmit: Boolean(document.getElementById('ask-submit')),
          hasCancel: Boolean(document.getElementById('ask-cancel')),
          clickables: [...card.querySelectorAll('button,input,select,textarea')].filter(vis).length,
        });
      })()`,
    );
    const form = JSON.parse(formRaw);
    check('⑭ form 型 data-ask-kind=form（既有 kind 的枚举值，非新卡类型）', form.kind === 'form', formRaw);
    check('⑭ form 型选项逐项 ∈ 能力注册表（集合相等）', JSON.stringify([...form.ids].sort()) === JSON.stringify(['bookmarks', 'clipboard', 'downloads', 'notify']), formRaw);
    check('⑭ form 型选项数 ≤4 ∧ 卡内控件 ≤6（4 checkbox + 提交 + 取消）', form.ids.length <= 4 && form.clickables <= 6, formRaw);
    check('⑭ form 型不铸文本输入（复用面之外不加第 4 个控件）', form.hasFallbackInput === false && form.hasSubmit === true && form.hasCancel === true, formRaw);
    await evaluate(
      cdp,
      `(() => { const card = document.querySelector('[data-msg-type="askuser"]'); const boxes = [...card.querySelectorAll('input[type="checkbox"][data-cap]')]; boxes[0].checked = true; boxes[3].checked = true; document.getElementById('ask-submit').click(); return true; })()`,
    );
    await sleep(200);
    const formAnswered = await evaluate(cdp, `document.querySelector('[data-msg-type="askuser"] .card-fixed b')?.textContent ?? ''`);
    check('⑭ form 型一次提交多字段（选中项按逗号合并为单个 params 值）', formAnswered === '已答：bookmarks,clipboard', String(formAnswered));

    // ── ⑤ 超时 / 取代留痕 ─────────────────────────────────────────────────────
    console.log('\n▶ ⑤ 超时 / 取代留痕（固化 + 系统行）');
    await evaluate(cdp, `window.__v3.testing.streamReset(); window.__v3.testing.ask('后台提问', ['是', '否', '先跳过']); window.__v3.testing.timeoutOpenAsks(); true`);
    await sleep(200);
    const timeoutRaw = await evaluate(
      cdp,
      `(() => {
        const c = document.querySelector('[data-msg-type="askuser"]');
        const sys = [...document.querySelectorAll('[data-msg-type="system"]')].map((s) => s.textContent).join(' | ');
        return JSON.stringify({ answered: c.getAttribute('data-answered'), reason: c.getAttribute('data-cancel-reason'), systemLine: /超时/.test(sys), open: window.__v3.testing.openAsks() });
      })()`,
    );
    const timeout = JSON.parse(timeoutRaw);
    check('⑤ 超时 ⇒ cancelled(timeout) 终态留痕', timeout.answered === 'cancelled' && timeout.reason === 'timeout', timeoutRaw);
    check('⑤ 超时追加系统行（可读因果）', timeout.systemLine === true, timeoutRaw);
    check('⑤ 超时后 openAsks 归零（无「永远处理中」）', timeout.open.length === 0, timeoutRaw);

    await evaluate(cdp, `window.__v3.testing.streamReset(); window.__v3.testing.ask('q1', ['甲', '乙', '丙']); window.__v3.testing.ask('q2', ['甲', '乙', '丙']); window.__v3.testing.ask('q3', ['甲', '乙', '丙']); true`);
    await sleep(200);
    const supRaw = await evaluate(
      cdp,
      `(() => {
        const cards = [...document.querySelectorAll('[data-msg-type="askuser"]')];
        const first = cards[0];
        const sys = [...document.querySelectorAll('[data-msg-type="system"]')].map((s) => s.textContent).join(' | ');
        return JSON.stringify({ count: cards.length, firstAnswered: first.getAttribute('data-answered'), firstReason: first.getAttribute('data-cancel-reason'), systemLine: /取代/.test(sys), open: window.__v3.testing.openAsks().length });
      })()`,
    );
    const sup = JSON.parse(supRaw);
    check('⑤ supersede 后 openAsks ≤ 2', sup.open <= 2, supRaw);
    check('⑤ 被取代卡 data-answered=cancelled + reason=superseded', sup.firstAnswered === 'cancelled' && sup.firstReason === 'superseded', supRaw);
    check('⑤ 取代产生系统行（R1 语义未丢）', sup.systemLine === true, supRaw);

    // ── ⑥ 授权卡 ──────────────────────────────────────────────────────────────
    console.log('\n▶ ⑥ 授权卡：批准 / 拒绝 + 审计入口 + 零操作控件');
    const seedAuth = `window.__v3.testing.streamReset(); window.__v3.testing.streamSeed([{ kind: 'auth', cardId: 'au1', payload: { askKind: 'confirm', prompt: 'tabs：关闭敏感标签页', requestId: 'au-req' } }]); true`;
    await evaluate(cdp, seedAuth);
    await sleep(200);
    const authPendingRaw = await evaluate(
      cdp,
      `(() => {
        ${VIS}
        const c = document.querySelector('[data-msg-type="auth"]');
        return JSON.stringify({
          decision: c.getAttribute('data-decision'),
          confirmVisible: vis(document.getElementById('confirm')),
          summary: document.getElementById('confirm-summary')?.textContent ?? '',
          allow: Boolean(document.getElementById('confirm-allow')),
          deny: Boolean(document.getElementById('confirm-deny')),
          preview: c.querySelector('.auth-consequence')?.textContent ?? '',
        });
      })()`,
    );
    const authPending = JSON.parse(authPendingRaw);
    check('⑥ 操作前 data-decision=pending + 批准/拒绝可见', authPending.decision === 'pending' && authPending.allow && authPending.deny, authPendingRaw);
    check('⑥ `#confirm-summary` 可读（范围说明）', /tabs/.test(authPending.summary), authPendingRaw);
    check('⑥ 范围与后果预演三段存在（静态模板）', /会发生什么/.test(authPending.preview) && /不可逆性声明/.test(authPending.preview), authPendingRaw);

    await evaluate(cdp, `document.getElementById('confirm-allow').click(); true`);
    await sleep(200);
    const authApprovedRaw = await evaluate(
      cdp,
      `(() => {
        ${VIS}
        const c = document.querySelector('[data-msg-type="auth"]');
        const fixed = c.querySelector('.card-fixed');
        return JSON.stringify({
          decision: c.getAttribute('data-decision'),
          actionsGone: c.querySelector('.auth-actions') === null,
          fixedVisible: vis(fixed),
          fixedText: fixed.querySelector('b')?.textContent ?? '',
          ts: fixed.querySelector('.card-fixed-time')?.textContent ?? '',
          audit: c.querySelector('.audit-entry')?.textContent ?? '',
          controls: c.querySelectorAll('${CONTROL_TAGS}').length,
          legacyIdHidden: (() => { const c = document.getElementById('confirm'); return c ? c.hidden === true : true; })(),
        });
      })()`,
    );
    const authApproved = JSON.parse(authApprovedRaw);
    check('⑥ 批准后 data-decision=approved + 操作按钮移除（D3）', authApproved.decision === 'approved' && authApproved.actionsGone === true, authApprovedRaw);
    check('⑥ 批准固化「已批准」+ 时间戳（D4）', authApproved.fixedVisible === true && authApproved.fixedText === '已批准' && /^\d{2}:\d{2}:\d{2}$/.test(authApproved.ts), authApprovedRaw);
    check('⑥ 审计入口可达 + 分工文案（D4 / AC-CHAT-016）', /审计/.test(authApproved.audit), authApprovedRaw);
    check('⑥ 终态授权卡零操作控件（D6）', authApproved.controls === 0, authApprovedRaw);
    check('⑥ 终态卡的 legacy `#confirm` 已 hidden（不遮蔽新卡，journey #16t 可判）', authApproved.legacyIdHidden === true, authApprovedRaw);

    await evaluate(cdp, seedAuth);
    await sleep(200);
    await evaluate(cdp, `document.getElementById('confirm-deny').click(); true`);
    await sleep(200);
    const authRejectedRaw = await evaluate(
      cdp,
      `(() => { const c = document.querySelector('[data-msg-type="auth"]'); return JSON.stringify({ decision: c.getAttribute('data-decision'), fixedText: c.querySelector('.card-fixed b')?.textContent ?? '', controls: c.querySelectorAll('${CONTROL_TAGS}').length }); })()`,
    );
    const authRejected = JSON.parse(authRejectedRaw);
    check('⑥ 拒绝后 data-decision=rejected + 固化「已拒绝（不执行）」（D5）', authRejected.decision === 'rejected' && authRejected.fixedText === '已拒绝（不执行）', authRejectedRaw);
    check('⑥ 拒绝终态卡零操作控件', authRejected.controls === 0, authRejectedRaw);

    // ── ⑪ BLOCK-01 回归：假批准（cancelled 终态渲染） ─────────────────────────
    // 三条真实路径（会话切换 / 被取代 / 回合结束）在模型侧由
    // `test/ask-auth-inflow.test.ts` 的「BLOCK-01 假批准回归」逐条断言；这里在**真实渲染
    // 路径**上覆盖其中两条（被取代 = 仲裁、回合结束 = 60 s 投影），断言终态卡渲染「已取消」
    // 而不是「已批准」。修复前本段必红（`data-decision=pending` + 文案「已批准」）。
    console.log('\n▶ ⑪ BLOCK-01 假批准回归：auth cancelled ⇒ 渲染「已取消」（不是「已批准」）');
    // Two open auth cards + one more ask ⇒ the real arbitration (`appendAskEvent`,
    // `MAX_OPEN_ASKS = 2`) supersedes the OLDEST card. `streamSeed` alone cannot drive
    // this (it appends events directly, no arbitration), so the third card goes through
    // the product's own `ask` seam.
    await evaluate(cdp, `window.__v3.testing.streamReset(); window.__v3.testing.streamSeed([
      { kind: 'auth', cardId: 'b1', payload: { askKind: 'confirm', prompt: 'tabs：关闭敏感标签页', requestId: 'b1' } },
      { kind: 'auth', cardId: 'b2', payload: { askKind: 'confirm', prompt: 'tabs：关闭敏感标签页', requestId: 'b2' } }
    ]); window.__v3.testing.ask('第三张（触发仲裁）', ['甲', '乙', '丙']); true`);
    await sleep(250);
    const fakeSupRaw = await evaluate(
      cdp,
      `(() => {
        const cards = [...document.querySelectorAll('[data-msg-type="auth"]')];
        const first = cards[0];
        return JSON.stringify({
          decision: first.getAttribute('data-decision'),
          fixedText: first.querySelector('.card-fixed b')?.textContent ?? '',
          audit: Boolean(first.querySelector('.audit-entry')),
          cancelledCount: cards.filter((c) => c.getAttribute('data-decision') === 'cancelled').length,
          approvedCount: cards.filter((c) => c.getAttribute('data-decision') === 'approved').length,
        });
      })()`,
    );
    const fakeSup = JSON.parse(fakeSupRaw);
    check('⑪ 被取代的 auth 卡渲染 data-decision=cancelled（不是 pending/approved）', fakeSup.decision === 'cancelled', fakeSupRaw);
    check('⑪ 被取代的 auth 卡固化文案「已取消（未授权，不执行）」且**不含**「已批准」', fakeSup.fixedText === '已取消（未授权，不执行）' && !/已批准/.test(fakeSup.fixedText), fakeSupRaw);
    check(
      '⑪ 被取代的 auth 卡恰 1 张 cancelled、0 张 approved（未决策的卡不得被算成已批准）',
      fakeSup.cancelledCount === 1 && fakeSup.approvedCount === 0,
      fakeSupRaw,
    );

    await evaluate(cdp, `window.__v3.testing.streamReset(); window.__v3.testing.streamSeed([{ kind: 'auth', cardId: 'to1', payload: { askKind: 'confirm', prompt: 'tabs：关闭敏感标签页', requestId: 'to1' } }]); window.__v3.testing.timeoutOpenAsks(); true`);
    await sleep(250);
    const fakeTimeoutRaw = await evaluate(
      cdp,
      `(() => {
        const c = document.querySelector('[data-msg-type="auth"]');
        return JSON.stringify({ decision: c.getAttribute('data-decision'), fixedText: c.querySelector('.card-fixed b')?.textContent ?? '' });
      })()`,
    );
    const fakeTimeout = JSON.parse(fakeTimeoutRaw);
    check('⑪ 回合结束（真实超时）的 auth 卡同样渲染 cancelled + 「已取消」', fakeTimeout.decision === 'cancelled' && fakeTimeout.fixedText === '已取消（未授权，不执行）', fakeTimeoutRaw);

    // ── ⑫ BLOCK-04 回归：审计入口真实可达（点击后状态变化） ───────────────────
    console.log('\n▶ ⑫ BLOCK-04 回归：终态授权卡点审计 ⇒ L2 审计视图必须真的打开');
    await evaluate(cdp, seedAuth);
    await sleep(200);
    await evaluate(cdp, `document.getElementById('confirm-allow').click(); true`);
    await sleep(200);
    const auditClickRaw = await evaluate(
      cdp,
      `(() => {
        ${VIS}
        const before = vis(document.querySelector('[data-l2-view="audit"]'));
        document.querySelector('[data-msg-type="auth"] .audit-entry').click();
        const after = vis(document.querySelector('[data-l2-view="audit"]'));
        return JSON.stringify({ before, after });
      })()`,
    );
    const auditClick = JSON.parse(auditClickRaw);
    check('⑫ 点击审计入口前审计视图不可见（判据不恒真）', auditClick.before === false, auditClickRaw);
    check('⑫ 点击审计入口后审计视图可见（真实跳转，不是死链）', auditClick.after === true, auditClickRaw);
    await evaluate(cdp, `window.__v3.testing.closeL2View(); true`);
    await sleep(150);

    // ── ⑦ AC-CHAT-016 站点级授权可发现 / 可读 ────────────────────────────────
    console.log('\n▶ ⑦ AC-CHAT-016：设置视图「站点与授权」可发现 / 可读');
    const settingsRaw = await evaluate(
      cdp,
      `(() => {
        ${VIS}
        window.__v3.testing.openL2View('settings');
        const view = document.getElementById('settings-view');
        const authorize = document.getElementById('authorize');
        const revoke = document.getElementById('revoke');
        return JSON.stringify({
          viewVisible: vis(view),
          hasAuthorize: Boolean(authorize) && /授权/.test(authorize.textContent),
          hasRevoke: Boolean(revoke) && /撤销/.test(revoke.textContent),
          sectionTitle: /站点与授权/.test(document.getElementById('topbar')?.getAttribute('aria-label') ?? ''),
        });
      })()`,
    );
    const settings = JSON.parse(settingsRaw);
    check('⑦ 设置视图可打开', settings.viewVisible === true, settingsRaw);
    check('⑦ 站点级授权入口在设置视图可发现可读（#authorize）', settings.hasAuthorize === true, settingsRaw);
    check('⑦ 撤销 / 站点与授权分区可读', settings.hasRevoke === true && settings.sectionTitle === true, settingsRaw);
    await evaluate(cdp, `window.__v3.testing.closeL2View(); true`);
    await sleep(150);

    // ── ⑧ aria-live + 三宽度零溢出 ────────────────────────────────────────────
    console.log('\n▶ ⑧ aria-live + 320/400/520 零横向溢出');
    await evaluate(cdp, `window.__v3.testing.streamReset(); window.__v3.testing.ask('宽度测试', ['甲', '乙', '丙']); true`);
    await sleep(150);
    for (const width of [320, 400, 520]) {
      await setViewport(cdp, width, VIEWPORT_HEIGHT);
      await sleep(120);
      const overflowRaw = await evaluate(
        cdp,
        `(() => {
          const stream = document.getElementById('stream');
          const card = document.querySelector('[data-msg-type="askuser"]');
          const r = card.getBoundingClientRect();
          const ariaLive = card.querySelector('.card-fixed')?.getAttribute('aria-live');
          window.__v3.testing.streamReset(); window.__v3.testing.ask('宽度测试', ['甲', '乙', '丙']);
          return JSON.stringify({ overflow: stream.scrollWidth - stream.clientWidth, right: Math.round(r.right), vw: window.innerWidth, ariaLive });
        })()`,
      );
      const o = JSON.parse(overflowRaw);
      check(`⑧ ${width}px 无横向溢出（ask 卡）`, o.overflow <= 1 && o.right <= o.vw + 1, overflowRaw);
      check(`⑧ ${width}px 固化区 aria-live=polite`, o.ariaLive === 'polite', overflowRaw);
    }

    // ── ⑨ 零明文 ──────────────────────────────────────────────────────────────
    console.log('\n▶ ⑨ 零明文：渲染文案 / 系统行不含 URL query / 密钥 / 命令参数体');
    const plainRaw = await evaluate(
      cdp,
      `(() => {
        const text = [...document.querySelectorAll('[data-msg-type="askuser"], [data-msg-type="auth"], [data-msg-type="system"]')].map((c) => c.textContent).join('\\n');
        return JSON.stringify({ urlQuery: /[?&][A-Za-z0-9_.~%-]+=/.test(text), secret: /(?:sk|pk|ghp)-[A-Za-z0-9_-]{8,}/.test(text), cmdArg: /(?:^|\\s)--?[A-Za-z][\\w-]*[=\\s]\\S/.test(text) });
      })()`,
    );
    const plain = JSON.parse(plainRaw);
    check('⑨ 渲染路径无 URL query', plain.urlQuery === false, plainRaw);
    check('⑨ 渲染路径无密钥 / 令牌', plain.secret === false, plainRaw);
    check('⑨ 渲染路径无命令参数体', plain.cmdArg === false, plainRaw);

    // ── ⑪ 展开态预算（I-03）：互斥披露使展开态仍 ≤6 / 两卡合计 ≤8 ─────────────
    // 判据口径与 `test/ui/density.mjs` 同源：可见（`hidden` 链）+ BUTTON|A|INPUT|SELECT|
    // TEXTAREA 或 tabindex≠-1。HO-1 裁决见 `docs/v4-density-baseline.json#knownLimitations`（I-03）。
    console.log('\n▶ ⑪ 展开态预算：互斥披露（展开兜底即收起选项行）');
    const ASK_BUDGET_FN = `(() => {
      const vis = (el) => { let n = el; while (n) { if (n.hidden === true) return false; n = n.parentElement; } return true; };
      const count = (card) => {
        let n = 0;
        for (const node of [card].concat(Array.from(card.querySelectorAll('*')))) {
          if (!vis(node)) continue;
          const tag = node.tagName || '';
          if (/^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(tag) || (node.hasAttribute('tabindex') && node.getAttribute('tabindex') !== '-1')) n += 1;
        }
        return n;
      };
      const cards = [...document.querySelectorAll('#stream [data-msg-type="askuser"]')];
      const per = cards.map(count);
      const visibleOptions = cards.map((c) => [...c.querySelectorAll('[data-act="choose"]')].filter(vis).length);
      return JSON.stringify({
        per,
        total: per.reduce((a, b) => a + b, 0),
        visibleOptions,
        otherExpanded: [...document.querySelectorAll('[data-act="choose-other"]')].map((b) => b.getAttribute('aria-expanded')),
      });
    })()`;
    const budget = (raw) => {
      const x = JSON.parse(raw);
      const worst = x.per.reduce((a, b) => Math.max(a, b), 0);
      return { x, ok: x.per.length > 0 && worst <= 6 && x.total <= 8, worst };
    };

    await evaluate(cdp, `window.__v3.testing.streamReset(); window.__v3.testing.ask('展开态预算', ['甲', '乙', '丙']); true`);
    await sleep(200);
    const oneCardCollapsed = budget(await evaluate(cdp, ASK_BUDGET_FN));
    await evaluate(cdp, `document.querySelector('[data-act="choose-other"]').click(); true`);
    await sleep(200);
    const oneCardExpandedRaw = await evaluate(cdp, ASK_BUDGET_FN);
    const oneCardExpanded = budget(oneCardExpandedRaw);
    check('⑪ 收起态单卡可点 ≤6（判据不恒真：先量后判）', oneCardCollapsed.x.per.length === 1 && oneCardCollapsed.ok === true, JSON.stringify(oneCardCollapsed.x));
    check('⑪ 展开兜底后单卡仍 ≤6（互斥披露：选项行收起）', oneCardExpanded.ok === true, oneCardExpandedRaw);
    check('⑪ 展开兜底后可见选项行 = 0（互斥披露真的发生）', oneCardExpanded.x.visibleOptions[0] === 0, oneCardExpandedRaw);
    // 两卡同时展开 ⇒ 合计 ≤8（HO-1 的 4 + 4）
    await evaluate(cdp, `window.__v3.testing.streamReset();
      window.__v3.testing.ask('两卡甲', ['甲', '乙', '丙']);
      window.__v3.testing.ask('两卡乙', ['甲', '乙', '丙']); true`);
    await sleep(250);
    await evaluate(
      cdp,
      `(() => { for (const b of document.querySelectorAll('[data-act="choose-other"]')) b.click(); return true; })()`,
    );
    await sleep(250);
    const twoRaw = await evaluate(cdp, ASK_BUDGET_FN);
    const two = budget(twoRaw);
    check('⑪ 两卡同开且都展开：合计可点 ≤8（不是 14）', two.ok === true && two.x.per.length === 2, twoRaw);

    // in-gate 反证：注入「选项行不收起」⇒ 展开态判据必须 FAIL；还原 ⇒ PASS。
    const reverseRaw = await evaluate(
      cdp,
      `(() => {
        const injected = document.querySelector('[data-act="choose-other"]').closest('[data-card-key]');
        const hiddenOptions = [...injected.querySelectorAll('#ask-options button, [data-act="choose"]')];
        const restore = hiddenOptions.map((b) => b.hidden);
        for (const b of hiddenOptions) b.hidden = false;   // 模拟「互斥披露缺失」
        const mid = ${ASK_BUDGET_FN};
        hiddenOptions.forEach((b, i) => { b.hidden = restore[i]; });
        const after = ${ASK_BUDGET_FN};
        return JSON.stringify({ injected: mid, restored: after });
      })()`,
    );
    const rev = JSON.parse(reverseRaw);
    const revInjected = budget(rev.injected);
    const revRestored = budget(rev.restored);
    check(
      '⑪ (FAIL 段) 注入「选项行不收起」⇒ 展开态判据必须 FAIL（单卡 >6 / 合计 >8）',
      revInjected.ok === false,
      `${rev.injected} | worst=${revInjected.worst}`,
    );
    check('⑪ (PASS 段) 还原互斥披露后判据必须 PASS（反证非恒真）', revRestored.ok === true, rev.restored);

    check('无未捕获页面异常（ask/auth 全链路干净）', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
    cdp.close();

    // ── ⑩ counter conservation ───────────────────────────────────────────────
    console.log('\n▶ ⑩ 计数守恒（D-005 只增）');
    const runtime = counts().passes;
    const selfSource = readFileSync(new URL('./ask-auth-inflow.mjs', import.meta.url), 'utf8');
    const staticCount = (selfSource.match(/\bcheck\(/g) ?? []).length;
    check(`⑩ 运行期断言计数 ≥ ${ASK_AUTH_RUNTIME_FLOOR}（D-005；countMethod = runtime-check-calls）`, runtime >= ASK_AUTH_RUNTIME_FLOOR, `runtime=${runtime}`);
    check(`⑩ 静态 check( 计数 ≥ ${ASK_AUTH_STATIC_FLOOR}`, staticCount >= ASK_AUTH_STATIC_FLOOR, `static=${staticCount}`);
  } finally {
    chrome.kill('SIGKILL');
  }
  finish('V4-3 ask-user / 授权卡流内化门禁');
}

main().catch((err) => {
  console.error(`✖ ask/auth 门禁异常：${err instanceof Error ? err.stack ?? err.message : String(err)}`);
  process.exit(1);
});
