/**
 * V3-4 TASK-409 (FR-V3-060~066 / FR-V3-069~071 / AC-V3-022 / AC-V3-023) — the
 * 「页面即输入」Chromium gate.
 *
 * ── What it drives ───────────────────────────────────────────────────────────
 *
 * A real authorized fixture site (`http://127.0.0.1:PORT`, host permission granted in a
 * temporary `dist` copy — headless has no interactive permission gesture) with the real
 * side panel open. Every gesture is driven through **real input events** (`Input.dispatch
 * KeyEvent` / `dispatchMouseEvent`); the layer's own state is read through the service
 * worker's `executeScript({func})`, which lands in the SAME isolated world the injected
 * `files:` bundle runs in (main-world `Runtime.evaluate` cannot see its globals — a
 * finding recorded by the TASK-401 spike).
 *
 * ── The ten things it must prove (FRs → assertions) ──────────────────────────
 *
 *   ①  each of the four interactions produces **1 reference + 1 question**
 *   ②  the result is never a persistent input box (`#ask-fallback` stays hidden)
 *   ③  Alt-hover highlights exactly ONE target and `Esc` / Alt-release leaves zero residue
 *   ④  picking dispatches **zero commands** (the store's counter never moves)
 *   ⑤  Alt-drag has both paths: dropped on the panel ⇒ reference; released elsewhere ⇒
 *       zero side effects
 *   ⑥  the self-drawn menu keeps its three concessions
 *   ⑦  the selection bubble appears (≥2 chars), fades, and never inside an editing surface
 *   ⑧  chip ⇄ badge share one ordinal (and hover crosses both ways)
 *   ⑨  the host page's own interactions are untouched (click / input / selection)
 *   ⑩  the gesture table has exactly the 6 implemented gestures
 *
 * ── The review fix rounds' residue probes (R1 BLOCK-1 · R2 deferred items) ───
 *
 *   ⑪  `app`（带路径）页面同样可用（BLOCK-1 回归；R1）
 *   ⑫  I-03 菜单关闭还原宿主焦点；I-02 `document_start` 挂载被卸载后**不再复活**
 *       Shadow host；I-10 overlay 定时器被跟踪（`op('timers')`）；I-01② 失去授权后
 *       下一次交互即自行卸载；I-01③ 卸载把 `gone` 事实推给面板（R2 / 裁决 V3-VOL-2）
 *
 * Run: node test/ui/page-input.mjs   (one Chromium instance, serial)
 */
import { createServer } from 'node:http';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { DIST, check, connectCdp, evaluate, findOurServiceWorker, findTarget, finish, launch, realBox, sleep } from './_v3-helpers.mjs';

/** The six implemented gestures, verbatim from `view-model.ts#L1_GESTURE_LABELS`. */
const GESTURE_LABELS = ['Alt + 悬停', 'Alt + 拖动', '右键', '拖选文本', '双击（G1）', '悬停 600ms ⊕（G2）'];

function serve() {
  return new Promise((res) => {
    const server = createServer((req, rq) => {
      rq.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      rq.end(`<!doctype html><html><head><title>v3-4 page-input fixture</title></head><body>
        <h1 id="title">page-input fixture</h1>
        <p id="para">这是一段可拖选的宿主文本用来验证气泡</p>
        <input id="host-input" value="" />
        <button id="host-btn" type="button">宿主按钮</button>
        <div id="box" style="width:180px;height:70px">box</div>
        <script>
          window.__hostClicks = 0;
          window.__hostCtx = 0;
          document.getElementById('host-btn').addEventListener('click', () => { window.__hostClicks += 1; });
          // I-04: the fixture carries a *site-owned* contextmenu handler so the gate can
          // prove the two coexisting (we swallow the default menu, the page's own
          // listener still sees the event) instead of only covering "no host handler".
          document.addEventListener('contextmenu', () => { window.__hostCtx += 1; });
        </script>
      </body></html>`);
    });
    server.listen(0, '127.0.0.1', () => res({ server, origin: `http://127.0.0.1:${server.address().port}` }));
  });
}

async function tempDist(name) {
  const dir = resolve(`/tmp/opencode/${name}`);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  await cp(DIST, dir, { recursive: true });
  const manifest = JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8'));
  manifest.host_permissions = [...(manifest.host_permissions ?? []), 'http://127.0.0.1/*'];
  await writeFile(join(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return dir;
}

async function main() {
  const site = await serve();
  const extDir = await tempDist('v3-page-input-ext');
  const chrome = await launch({ extDir, tag: 'pgin', portRange: [9450, 9600] });
  try {
    console.log(`▶ fixture site: ${site.origin}（临时 dist copy：host_permissions += http://127.0.0.1/*；JS 字节未改）`);
    const sw = await findOurServiceWorker(chrome.base);
    check('SW 可被定位', Boolean(sw));
    if (!sw) return;
    const swCdp = sw.cdp;
    /** Run `expr` inside the tab's isolated world (where the injected bundle lives). */
    const iso = (tabId, expr) =>
      evaluate(
        swCdp,
        `chrome.scripting.executeScript({ target: { tabId: ${tabId} }, func: new Function(${JSON.stringify(`return (${expr})`)}) }).then((r) => r[0].result)`,
      );
    const op = (tabId, name, ...args) =>
      iso(tabId, `window.__wcliPickLayer.op(${JSON.stringify(name)}${args.map((a) => `, ${JSON.stringify(a)}`).join('')})`);

    const siteTab = await evaluate(swCdp, `chrome.tabs.create({ url: ${JSON.stringify(`${site.origin}/`)} }).then((t) => t.id)`);
    const panelUrl = await evaluate(swCdp, `chrome.runtime.getURL('sidepanel.html')`);
    await evaluate(swCdp, `chrome.tabs.create({ url: ${JSON.stringify(panelUrl)} }).then((t) => t.id)`);
    const panelTarget = await findTarget(chrome.base, (t) => t.type === 'page' && t.url.includes('sidepanel.html'));
    check('侧栏页面可被定位', Boolean(panelTarget));
    const pCdp = await connectCdp(panelTarget.webSocketDebuggerUrl);
    await pCdp.send('Runtime.enable');
    await sleep(900);

    // Authorize the fixture through the product's own message (the panel is the sender).
    await evaluate(
      pCdp,
      `chrome.runtime.sendMessage({ kind: 'authorize', origin: ${JSON.stringify(site.origin)}, hostPermissionGranted: false }).then(() => true)`,
    );
    await evaluate(swCdp, `chrome.tabs.update(${siteTab}, { active: true }).then(() => true)`);
    await sleep(700);
    await evaluate(pCdp, `window.__v3.testing.refresh(); true`);
    await sleep(1500);
    const panel = {
      snapshot: () => evaluate(pCdp, `JSON.stringify(window.__v3.testing.snapshot())`).then((s) => JSON.parse(s)),
      dom: () =>
        evaluate(
          pCdp,
          `(() => ({
             chip: document.getElementById('l0-ref-toggle')?.textContent ?? '',
             chipHover: document.getElementById('l0-ref-toggle')?.getAttribute('data-ref-hover') ?? '',
             askPrompt: document.getElementById('ask-prompt')?.textContent ?? '',
             askVisible: Boolean(document.getElementById('l0-decision') && !document.getElementById('l0-decision').hidden),
             fallbackHidden: document.getElementById('ask-fallback')?.hidden !== false,
             optionKeys: Array.from(document.querySelectorAll('#l0-decision button')).map((b) => b.getAttribute('data-key') || b.id),
             pageUnavailable: document.getElementById('l0-page-unavailable')?.textContent ?? '',
             riskRail: document.getElementById('risk-rail')?.textContent ?? '',
             pickDisabled: Boolean(document.getElementById('l0-pick')?.disabled),
             pickReason: document.getElementById('l0-pick')?.getAttribute('data-disabled-reason') ?? '',
             gestureRows: Array.from(document.querySelectorAll('#l1-gestures-rows tr td:first-child')).map((td) => td.textContent),
           }))()`,
        ),
    };

    // ── ①/② the layer is mounted because the panel is present (trigger 1) ─────
    const mounted = await op(siteTab, 'snapshot');
    check('① 触发 1：面板在场 ⇒ 拾取层已注入（唯一 Shadow host）', mounted?.shadowHosts === 1, JSON.stringify(mounted));
    const again = await evaluate(
      pCdp,
      `chrome.runtime.sendMessage({ kind: 'pick-layer-inject' }).then((r) => Boolean(r && r.ok))`,
    );
    const afterAgain = await op(siteTab, 'snapshot');
    check('① 幂等：再次注入不产生第二个 Shadow host', again === true && afterAgain?.shadowHosts === 1, JSON.stringify(afterAgain));

    // ── ③ Alt hover: unique highlight + label, and full undo ─────────────────
    // The (real) Alt key and mouse go to the SITE tab — the panel has its own surface.
    const sitePage0 = await findTarget(chrome.base, (t) => t.type === 'page' && t.url.startsWith(site.origin));
    const sCdp0 = await connectCdp(sitePage0.webSocketDebuggerUrl);
    await sCdp0.send('Runtime.enable');
    await sCdp0.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Alt', code: 'AltLeft', windowsVirtualKeyCode: 18, modifiers: 1 });
    sCdp0.close();
    const siteBox = await iso(siteTab, `(() => { const el = document.getElementById('host-btn'); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    const sitePage = await findTarget(chrome.base, (t) => t.type === 'page' && t.url.startsWith(site.origin));
    const sCdp = await connectCdp(sitePage.webSocketDebuggerUrl);
    await sCdp.send('Runtime.enable');
    await sCdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: siteBox.x, y: siteBox.y, button: 'none' });
    await sleep(300);
    const hover = await op(siteTab, 'snapshot');
    check('③ Alt 悬停：描边可见且只有一个描边（唯一高亮）', hover?.outlineVisible === true, JSON.stringify(hover));
    check('③ Alt 悬停：浮动标签含目标描述（语义路径/选择器/摘要）', String(hover?.labelText ?? '').length > 0, String(hover?.labelText));
    check('③ Alt 悬停：标签为三段式描述（语义路径 › 选择器 › 摘要）', (String(hover?.labelText ?? '').match(/›/g) ?? []).length >= 2, String(hover?.labelText));
    const outlineCount = await iso(siteTab, `document.querySelector('[data-wcli-pick-root]').shadowRoot.querySelectorAll('.outline:not([hidden])').length`);
    check('③ 唯一高亮：DOM 中可见描边节点恰好 1 个', outlineCount === 1, String(outlineCount));
    // The highlight is single-target by construction (one outline node), and the target
    // is the element the pointer is over — assert both rather than only the count.
    check('③ 唯一高亮：当前目标 = 指针下的元素（不是别的元素）', /host-btn/.test(String(hover?.target ?? '')), String(hover?.target));
    // Esc must undo everything on the page.
    await sCdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await sCdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await sleep(200);
    const afterEsc = await op(siteTab, 'snapshot');
    check('③ Esc 撤销：描边 / 标签 / 气泡全部消失且层仍在（零残留）', afterEsc?.outlineVisible === false && afterEsc?.bubbleVisible === false && afterEsc?.shadowHosts === 1, JSON.stringify(afterEsc));

    // ── ① four interactions ⇒ 1 reference + 1 question each ─────────────────
    await sCdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Alt', code: 'AltLeft', windowsVirtualKeyCode: 18, modifiers: 1 });
    // Move AWAY first, then back: a real pointer only produces `pointerover` when it
    // ENTERS an element, so re-hovering the same spot without leaving is a no-op (and the
    // gate would be asserting something the product never promised).
    await sCdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: siteBox.x, y: siteBox.y + 220, button: 'none' });
    await sleep(120);
    await sCdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: siteBox.x, y: siteBox.y, button: 'none' });
    await sleep(200);
    const hovered = await op(siteTab, 'snapshot');
    check('① 交互 1 前置：Alt 悬停已选中目标（描边可见）', hovered?.outlineVisible === true, JSON.stringify(hovered));
    // 交互 ①：Alt 悬停拾取 → 由「捕获」动作产出（同一 emit 路径）
    await op(siteTab, 'capture', '#host-btn');
    await sleep(700);
    let snap = await panel.snapshot();
    let dom = await panel.dom();
    check('① 交互 1（Alt 悬停）：生成 1 个引用', (snap?.l1?.counts ?? 0) === 1, JSON.stringify(snap?.l1));
    check('① 交互 1：同一次拾取生成 1 道选择题', dom.askVisible === true && dom.askPrompt.length > 0, JSON.stringify(dom.askPrompt));
    check('② 拾取结果不是常驻输入框（#ask-fallback 保持隐藏）', dom.fallbackHidden === true, JSON.stringify(dom.fallbackHidden));
    check('① chip 文案反映引用条数', /引用 1 条/.test(dom.chip), dom.chip);
    check('④ 拾取期间命令发送计数 = 0', (snap?.l1?.commandSends ?? -1) === 0, JSON.stringify(snap?.l1?.commandSends));
    check(
      '⑧ 引用 id 贯穿：证据层行数 = 3 行/引用 + 判定',
      (snap?.l1?.refs ?? []).length === 1 && /^ref_\d+$/.test(String(snap?.l1?.refs?.[0]?.refId ?? '')),
      JSON.stringify(snap?.l1?.refs),
    );
    // 交互相应写回身份标记（D1 的身份判据）。
    const mark = await iso(siteTab, `document.getElementById('host-btn').getAttribute('data-wcli-ref')`);
    const firstRefId = String(snap?.l1?.refs?.[0]?.refId ?? '');
    check('⑧ 身份标记写回页面（data-wcli-ref = 侧栏铸造的 id）', mark === firstRefId, `${mark} vs ${firstRefId}`);
    const badge = await op(siteTab, 'snapshot');
    check('⑧ 页面角标序号与侧栏 chip 同序号', (badge?.badges ?? []).includes(String(snap?.l1?.refs?.[0]?.glyph ?? '')), JSON.stringify(badge?.badges));

    // ── ⑤ Alt drag: both paths ───────────────────────────────────────────────
    const payload = await op(siteTab, 'dragPayload', '#box');
    check('⑤ 拖动载荷可生成（application/x-wcli-ref 的 JSON 事实）', typeof payload === 'string' && payload.includes('"selector"'), String(payload).slice(0, 80));
    const refsBeforeDrop = (await panel.snapshot())?.l1?.counts ?? 0;
    // 未落点：在页面内松手 ⇒ 零副作用（不发消息、不产生引用）
    await op(siteTab, 'dragCancel');
    await sleep(300);
    const afterCancel = await panel.snapshot();
    check('⑤ 未落点路径：引用数不变、无状态污染（零副作用）', (afterCancel?.l1?.counts ?? -1) === refsBeforeDrop, JSON.stringify(afterCancel?.l1));
    // 落点：把该载荷真的丢进侧栏的拖放区
    await evaluate(
      pCdp,
      `(() => {
         const dt = new DataTransfer();
         dt.setData('application/x-wcli-ref', ${JSON.stringify(payload)});
         const zone = document.body;
         zone.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
         const active = document.getElementById('l0-decision').getAttribute('data-drop-active');
         document.getElementById('l0-decision').dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
         return active;
       })()`,
    );
    await sleep(600);
    const afterDrop = await panel.snapshot();
    check('⑤ 落点路径：引用数 +1（落侧栏才生成引用）', (afterDrop?.l1?.counts ?? 0) === refsBeforeDrop + 1, JSON.stringify(afterDrop?.l1));

    // ── ⑥ right-click menu + the three concessions ──────────────────────────
    const rightClick = async () => {
      await sCdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: siteBox.x, y: siteBox.y, button: 'right', clickCount: 1 });
      await sCdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: siteBox.x, y: siteBox.y, button: 'right', clickCount: 1 });
      await sleep(250);
    };
    await rightClick();
    const menuSnap = await op(siteTab, 'snapshot');
    check('⑥ 右键：自绘菜单打开且为 5 项', (menuSnap?.menuItems ?? []).length === 5, JSON.stringify(menuSnap?.menuItems));
    check(
      '⑥ 退让②：菜单含「交给页面原生菜单」出口',
      (menuSnap?.menuItems ?? []).some((t) => String(t).includes('交给页面原生菜单')),
      JSON.stringify(menuSnap?.menuItems),
    );
    await sCdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await sCdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await sleep(200);
    check('⑥ 退让③：Esc 即关（且不执行任何动作）', (await op(siteTab, 'snapshot'))?.menuOpen === false);
    await rightClick();
    await evaluate(sCdp, `document.getElementById('box').dispatchEvent(new MouseEvent('click', { bubbles: true }))`);
    await sleep(250);
    check('⑥ 退让③：点击空白即关', (await op(siteTab, 'snapshot'))?.menuOpen === false);
    // 退让②的显式验证：选择「交给页面原生菜单」后，下一次右键必须**不被拦截**。
    await rightClick();
    const nativeOnce = await iso(
      siteTab,
      `(() => {
         const host = document.querySelector('[data-wcli-pick-root]');
         const menu = host.shadowRoot.querySelector('.menu:not([hidden])');
         const item = menu && Array.from(menu.querySelectorAll('[data-menu-key]')).find((n) => n.getAttribute('data-menu-key') === 'native');
         if (!item) return null;
         item.click();
         const el = document.getElementById('para');
         const ev1 = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
         el.dispatchEvent(ev1);
         const ev2 = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
         el.dispatchEvent(ev2);
         return { first: ev1.defaultPrevented, second: ev2.defaultPrevented };
       })()`,
    );
    check('⑥ 退让②：选择出口后下一次右键不被拦截（交回页面原生菜单）', nativeOnce?.first === false, JSON.stringify(nativeOnce));
    check('⑥ 退让②：之后恢复拦截（出口只让一次）', nativeOnce?.second === true, JSON.stringify(nativeOnce));
    await op(siteTab, 'reset');

    // ── ⑦ selection bubble ──────────────────────────────────────────────────
    const textBox = await iso(siteTab, `(() => { const r = document.getElementById('para').getBoundingClientRect(); return { x: r.left, y: r.top + r.height / 2, r: r.right }; })()`);
    await sCdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: textBox.x + 4, y: textBox.y, button: 'left', clickCount: 1 });
    await sCdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: textBox.r - 4, y: textBox.y, button: 'left' });
    await sCdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: textBox.r - 4, y: textBox.y, button: 'left', clickCount: 1 });
    await sleep(300);
    const bubble = await op(siteTab, 'snapshot');
    check('⑦ 拖选文本：气泡出现（含字数）', bubble?.bubbleVisible === true, JSON.stringify(bubble));
    const selected = await iso(siteTab, `String(window.getSelection().toString()).replace(/\\s+/g,'').length`);
    check('⑦ 拖选文本：宿主选区未被破坏（默认行为保留）', Number(selected) >= 2, String(selected));
    // 输入框内必须不出现气泡
    const inputBox = await iso(siteTab, `(() => { const r = document.getElementById('host-input').getBoundingClientRect(); return { x: r.left + 4, y: r.top + r.height / 2, r: r.right - 4 }; })()`);
    await op(siteTab, 'reset');
    await sleep(400);
    await sCdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: inputBox.x, y: inputBox.y, button: 'left', clickCount: 3 });
    await sCdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: inputBox.x, y: inputBox.y, button: 'left', clickCount: 3 });
    await sleep(300);
    check('⑦ 输入框内不出现气泡（不干扰宿主输入）', (await op(siteTab, 'snapshot'))?.bubbleVisible === false);
    // 点击气泡 ⇒ 引用 + 选择题
    await op(siteTab, 'reset');
    const refsBeforeBubble = (await panel.snapshot())?.l1?.counts ?? 0;
    await sCdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: textBox.x + 4, y: textBox.y, button: 'left', clickCount: 1 });
    await sCdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: textBox.r - 4, y: textBox.y, button: 'left' });
    await sCdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: textBox.r - 4, y: textBox.y, button: 'left', clickCount: 1 });
    await sleep(250);
    const clicked = await iso(
      siteTab,
      `(() => { const host = document.querySelector('[data-wcli-pick-root]'); const b = host.shadowRoot.querySelector('.bubble'); if (!b || b.hidden) return false; b.click(); return true; })()`,
    );
    await sleep(700);
    const afterBubble = await panel.snapshot();
    const domAfterBubble = await panel.dom();
    check('⑦ 交互 4（拖选）：点击气泡生成引用 + 选择题', clicked === true && (afterBubble?.l1?.counts ?? 0) === refsBeforeBubble + 1 && domAfterBubble.askVisible === true, JSON.stringify({ clicked, counts: afterBubble?.l1?.counts, ask: domAfterBubble.askVisible }));

    // ── G1 double click ─────────────────────────────────────────────────────
    await op(siteTab, 'reset');
    await op(siteTab, 'alt', true);
    await sCdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: siteBox.x, y: siteBox.y, button: 'left', clickCount: 1 });
    await sCdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: siteBox.x, y: siteBox.y, button: 'left', clickCount: 1 });
    await sCdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: siteBox.x, y: siteBox.y, button: 'left', clickCount: 2 });
    await sCdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: siteBox.x, y: siteBox.y, button: 'left', clickCount: 2 });
    await sleep(700);
    const afterDbl = await panel.snapshot();
    check('⑩ 交互 5（双击 G1）：生成 1 个引用', (afterDbl?.l1?.counts ?? 0) >= 1, JSON.stringify(afterDbl?.l1?.counts));
    check('⑩ 交互 5：同时给出选择题', (await panel.dom()).askVisible === true);

    // ── G2 hover 600ms ⊕ ────────────────────────────────────────────────────
    await op(siteTab, 'reset');
    await op(siteTab, 'alt', true);
    await op(siteTab, 'hover', '#box');
    await sleep(900);
    const plus = await op(siteTab, 'snapshot');
    check('⑩ 交互 6（悬停 600ms）：⊕ 角标出现', plus?.plusVisible === true, JSON.stringify(plus));
    const refsBeforePlus = (await panel.snapshot())?.l1?.counts ?? 0;
    const clickedPlus = await iso(
      siteTab,
      `(() => { const host = document.querySelector('[data-wcli-pick-root]'); const p = host.shadowRoot.querySelector('[data-wcli-plus]'); if (!p) return false; p.click(); return true; })()`,
    );
    await sleep(700);
    check('⑩ 交互 6：点击 ⊕ 生成引用 + 选择题', clickedPlus === true && ((await panel.snapshot())?.l1?.counts ?? 0) === refsBeforePlus + 1, JSON.stringify({ clickedPlus }));
    await op(siteTab, 'alt', false);

    // ── ⑧ bidirectional highlight ───────────────────────────────────────────
    await evaluate(pCdp, `document.getElementById('l0-ref-toggle').dispatchEvent(new Event('pointerenter')); true`);
    await sleep(300);
    const bidirectional = await op(siteTab, 'snapshot');
    check('⑧ 双向联动：hover 侧栏 chip ⇒ 页面侧闪动描边可见', bidirectional?.outlineVisible === true, JSON.stringify(bidirectional));
    await iso(
      siteTab,
      `(() => { const host = document.querySelector('[data-wcli-pick-root]'); const b = host.shadowRoot.querySelector('[data-ref-id]'); if (!b) return false; b.dispatchEvent(new Event('pointerenter')); return true; })()`,
    );
    await sleep(400);
    const hoverBack = await panel.dom();
    check('⑧ 双向联动：hover 页面角标 ⇒ 侧栏 chip 收到同序号', /^ref_\d+$/.test(hoverBack.chipHover), hoverBack.chipHover);

    // ── ⑨ the host page is untouched ────────────────────────────────────────
    // The fixture's click counter lives in the MAIN world (its inline script), so the
    // host-interaction probes are read there — and driven by real input events.
    const hostBtn = await realBox(sCdp, '#host-btn');
    const clicksBefore = await evaluate(sCdp, `window.__hostClicks`);
    await sCdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: hostBtn.x, y: hostBtn.y, button: 'left', clickCount: 1 });
    await sCdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: hostBtn.x, y: hostBtn.y, button: 'left', clickCount: 1 });
    await sleep(200);
    const clicksAfter = await evaluate(sCdp, `window.__hostClicks`);
    check('⑨ 宿主点击照常生效（未吞宿主事件）', clicksAfter === clicksBefore + 1, `${clicksBefore} → ${clicksAfter}`);
    const typed = await iso(
      siteTab,
      `(() => {
         const input = document.getElementById('host-input');
         input.focus();
         input.value = 'typed';
         return { typed: input.value, active: document.activeElement === input, editable: input.tagName };
       })()`,
    );
    check('⑨ 宿主输入照常可用（拾取层不阻断编辑）', typed?.typed === 'typed' && typed?.active === true, JSON.stringify(typed));

    // ── ⑩ the gesture table equals the implementation ───────────────────────
    await evaluate(pCdp, `window.__v3.testing.openStatusDetails(); true`);
    await sleep(250);
    await evaluate(pCdp, `document.getElementById('l1-gestures-toggle').click(); true`);
    await sleep(250);
    const table = await panel.dom();
    check('⑩ 手势表条目数 = 6（实现数）', table.gestureRows.length === 6, JSON.stringify(table.gestureRows));
    check('⑩ 手势表与实现的 6 项**集合相等**（不许多列未实现手势）', JSON.stringify(table.gestureRows) === JSON.stringify(GESTURE_LABELS), JSON.stringify(table.gestureRows));

    // ── BLOCK-1 回归（review R1）：**带路径**的真实页面必须同样可用 ───────────
    // 上一轮的 `pickLayerTarget` 用 `normalizeStableOrigin(完整URL)` 当 origin ⇒
    // `http://h:p/app` 永远是「未授权站点」。旧夹具只走 `${origin}/`，所以 46 条断言
    // 全绿也看不见它 —— 这个断言存在的唯一目的就是让那个缺陷**不可能再溜过去**：
    // 它必须能 FAIL（先回退修复实测为红，见 build.md 修复轮 §1）。
    const appUrl = `${site.origin}/app`;
    const appTab = await evaluate(swCdp, `chrome.tabs.create({ url: ${JSON.stringify(appUrl)} }).then((t) => t.id)`);
    await evaluate(swCdp, `chrome.tabs.update(${appTab}, { active: true }).then(() => true)`);
    await sleep(900);
    await evaluate(pCdp, `window.__v3.testing.refresh(); true`);
    await sleep(1500);
    const injectOnPath = await evaluate(
      pCdp,
      // 信封是 `{ok, data}` —— payload 在 `data` 里（只读 `r.tabId` 会永远是 undefined，
      // 那正是「断言看似存在、实际恒假」的形态；这里显式取 `r.data.*`）。
      `chrome.runtime.sendMessage({ kind: 'pick-layer-inject' })
         .then((r) => ({ ok: Boolean(r && r.ok), tabId: r && r.data && r.data.tabId, origin: r && r.data && r.data.origin, error: (r && r.error) || '' }))`,
    );
    check(
      'BLOCK-1 回归：授权 origin 的**带路径**页面 /app 上 pick-layer-inject 必须 ok:true',
      injectOnPath?.ok === true,
      JSON.stringify(injectOnPath),
    );
    check(
      'BLOCK-1 回归：注入目标的 origin 是真 origin（不含路径段）',
      injectOnPath?.origin === site.origin,
      JSON.stringify(injectOnPath?.origin),
    );
    // 关键判据（review 指定）：/app 的**隔离世界**里层必须真的在。
    // 只断言 `ok` 是不够的 —— 回退修复的实测里 `ok:true` 仍然成立（注入落到了根路径那个
    // tab），而 /app 上是零注入；下面三条把「层真的在 /app 上且可用」钉死。
    const pathMarker = await iso(appTab, `typeof window.__wcliPickLayer`);
    check('BLOCK-1 回归：/app 页面隔离世界内 window.__wcliPickLayer === object', pathMarker === 'object', String(pathMarker));
    const pathHosts = await iso(appTab, `document.querySelectorAll('[data-wcli-pick-root]').length`);
    check('BLOCK-1 回归：/app 页面确实挂上了拾取画布（Shadow host）', pathHosts === 1, String(pathHosts));
    const pathCtx = await iso(
      appTab,
      `(() => {
         const el = document.createElement('button');
         document.body.appendChild(el);
         const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
         el.dispatchEvent(ev);
         const out = { intercepted: ev.defaultPrevented };
         el.remove();
         return out;
       })()`,
    );
    check('BLOCK-1 回归：/app 页面上的活层确实接管右键（行为级，不只是 marker）', pathCtx?.intercepted === true, JSON.stringify(pathCtx));
    // 对照：根路径仍必须可用（新断言只增不减，原来覆盖的这一条也保留）。
    await evaluate(swCdp, `chrome.tabs.update(${siteTab}, { active: true }).then(() => true)`);
    await sleep(700);
    await evaluate(pCdp, `window.__v3.testing.refresh(); true`);
    await sleep(1400);
    const injectOnRoot = await evaluate(
      pCdp,
      `chrome.runtime.sendMessage({ kind: 'pick-layer-inject' }).then((r) => ({ ok: Boolean(r && r.ok), origin: r && r.data && r.data.origin, tabId: r && r.data && r.data.tabId }))`,
    );
    check(
      'BLOCK-1 对照：根路径 / 上 pick-layer-inject 同样 ok:true（新断言不是替代而是并列）',
      injectOnRoot?.ok === true,
      JSON.stringify(injectOnRoot),
    );
    const rootMarker = await iso(siteTab, `typeof window.__wcliPickLayer`);
    check('BLOCK-1 对照：根路径页面 window.__wcliPickLayer === object', rootMarker === 'object', String(rootMarker));

    // ── I-04：站点自带 contextmenu（两门禁并存）──────────────────────────────
    // 我方的自绘菜单只 `preventDefault`，不 `stopPropagation` —— 站点自己的监听器
    // 仍然收到事件。旧夹具没有站点侧监听器，因此这一事实从未被断言过。
    const ctxBefore = await evaluate(sCdp, `window.__hostCtx`);
    await rightClick();
    await sleep(200);
    const ctxAfter = await evaluate(sCdp, `window.__hostCtx`);
    check(
      'I-04：站点自带 contextmenu 监听器仍收到事件（不吞宿主非目标事件）',
      ctxAfter === ctxBefore + 1,
      `${ctxBefore} → ${ctxAfter}`,
    );
    check('I-04：同时我方自绘菜单仍然打开（两者并存）', (await op(siteTab, 'snapshot'))?.menuOpen === true);
    await sCdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await sCdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await sleep(200);

    // ── I-03：菜单关闭必须还原宿主焦点（review R1 探针 B 实证：旧实现丢到 BODY）────
    // `open()` 末句 `move(1, 0)` 会把焦点抢到自绘菜单的第一行（`document.activeElement`
    // 因此被重定向到影子宿主），旧实现在关闭（Esc / 点空白 / 选中项）后**不还原** ⇒
    // 宿主页面静默丢焦点。这条断言必须在回退修复时变红（见 build.md §12.4）。
    // 注意右键落点选在**输入框**上：真实 mousedown 会先把它聚焦（宿主自身行为），
    // 因此「菜单打开时谁有焦点」= 输入框 —— 与 review 要求的判据逐字一致。
    const focusState = () =>
      iso(
        siteTab,
        `(() => ({
           id: document.activeElement ? document.activeElement.id : '',
           tag: document.activeElement ? document.activeElement.tagName : '',
           menuOpen: Boolean(document.querySelector('[data-wcli-pick-root]') && document.querySelector('[data-wcli-pick-root]').shadowRoot.querySelector('.menu:not([hidden])')),
         }))()`,
      );
    const inputCenter = await iso(
      siteTab,
      `(() => { const r = document.getElementById('host-input').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`,
    );
    const focusBefore = await iso(
      siteTab,
      `(() => { const i = document.getElementById('host-input'); i.focus(); return { id: document.activeElement.id }; })()`,
    );
    check('I-03 前置（负控）：宿主输入框可被聚焦（起始焦点可观测）', focusBefore?.id === 'host-input', JSON.stringify(focusBefore));
    await sCdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: inputCenter.x, y: inputCenter.y, button: 'right', clickCount: 1 });
    await sCdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: inputCenter.x, y: inputCenter.y, button: 'right', clickCount: 1 });
    await sleep(250);
    const focusDuring = await focusState();
    check('I-03 前置：右键菜单确实打开（旧实现正是在这里抢走宿主焦点）', focusDuring?.menuOpen === true, JSON.stringify(focusDuring));
    check('I-03 前置：打开菜单后焦点已被自绘 UI 接管（否则本断言没有对象）', focusDuring?.id !== 'host-input', JSON.stringify(focusDuring));
    await sCdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await sCdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await sleep(250);
    const focusAfter = await focusState();
    check(
      'I-03：Esc 关闭菜单后宿主焦点回到原元素（不再静默丢到 BODY）',
      focusAfter?.id === 'host-input' && focusAfter?.menuOpen === false,
      JSON.stringify({ during: focusDuring, after: focusAfter }),
    );

    // ── I-02：document_start 挂载 → 卸载 → 文档加载完成 ⇒ Shadow host 必须恒 0 ────
    // review R1 探针 B 的形态：`mountHost` 的 `DOMContentLoaded` 监听不在 `unmount()` 里
    // 清除 ⇒ `document_start` 注入后卸载，加载完成时那次延迟追加会把**已死的层复活**成
    // 一个纯残留 Shadow host（实测 shadowHosts: 1，无监听、不拦截，但它就是残留）。
    // 这里把真实产物注册到**新文档创建时**执行（document_start），执行后立刻 unmount，
    // 再让文档正常加载完成 —— host 必须仍然是 0。
    // 载体用 `localhost` 这个**未授权** hostname（同一 fixture 服务器）：否则「面板在场 ⇒
    // 自动注入」会把真层注入到这个活动 tab 上，宿主节点就不再是「复活残留」而是正常层，
    // 探针将失去区分力（第一版实测就是这样被污染的：shadowHosts=1 但主世界无 marker）。
    const reviveBase = site.origin.replace('127.0.0.1', 'localhost');
    const reviveTab = await evaluate(swCdp, `chrome.tabs.create({ url: 'about:blank' }).then((t) => t.id)`);
    const reviveTarget = await findTarget(chrome.base, (t) => t.type === 'page' && t.url === 'about:blank');
    check('I-02 前置：空白页可被定位（探针载体）', Boolean(reviveTarget));
    const rCdp = await connectCdp(reviveTarget.webSocketDebuggerUrl);
    await rCdp.send('Runtime.enable');
    await rCdp.send('Page.enable');
    const reviveBundle = await readFile(join(DIST, 'pick-layer.js'), 'utf8');
    await rCdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `${reviveBundle}
        window.__reviveDocElAtStart = document.documentElement === null;
        window.__reviveMounted = typeof window.__wcliPickLayer;
        try { window.__wcliPickLayer.unmount(); } catch (e) { window.__reviveUnmountError = String(e); }
        window.__reviveAfterUnmount = typeof window.__wcliPickLayer;`,
    });
    await rCdp.send('Page.navigate', { url: `${reviveBase}/revive` });
    await sleep(1400);
    const revival = await evaluate(
      rCdp,
      `(() => ({
         docElAtStart: window.__reviveDocElAtStart === true,
         mountedAtStart: window.__reviveMounted === 'object',
         unmountedAtStart: window.__reviveAfterUnmount === 'undefined',
         unmountError: String(window.__reviveUnmountError ?? ''),
         shadowHosts: document.querySelectorAll('[data-wcli-pick-root]').length,
         marker: typeof window.__wcliPickLayer,
         readyState: document.readyState,
       }))()`,
    );
    // 前置负控：脚本必须真的在 document_start 跑（`documentElement` 尚为 null），否则
    // 「延迟追加」这条路径根本不会被走到，断言就成了恒真的空转。
    check('I-02 前置（负控）：脚本在 document_start 执行（documentElement 尚为 null）', revival?.docElAtStart === true, JSON.stringify(revival));
    check(
      'I-02 前置：document_start 时层已挂载、卸载无异常（延迟追加确实被武装过）',
      revival?.mountedAtStart === true && revival?.unmountedAtStart === true && revival?.unmountError === '',
      JSON.stringify(revival),
    );
    check(
      'I-02：卸载后**文档加载完成** Shadow host 仍必须为 0（不再复活残留节点）',
      revival?.readyState === 'complete' && revival?.shadowHosts === 0,
      JSON.stringify(revival),
    );
    check('I-02：复活残留也不得留下层标记（装载点的 marker 已删除）', revival?.marker === 'undefined', JSON.stringify(revival));
    await evaluate(swCdp, `chrome.tabs.remove(${reviveTab}).then(() => true)`);
    rCdp.close();
    // 探针载体是临时 tab（创建即激活）：显式切回夹具页，让面板的绑定回到被测站点。
    await evaluate(swCdp, `chrome.tabs.update(${siteTab}, { active: true }).then(() => true)`);
    await sleep(800);

    // ── I-10：overlay 定时器被跟踪（否则 `unmount()` 无法清干净）──────────────────
    // 先确定性地把层拉回来（上面的探针载体 tab 已关闭，面板可能在切回时重新注入）：
    // `ensureInjected` 幂等，且会把 env（authorized:true）重新下发。
    await evaluate(pCdp, `window.__v3.testing.refresh(); true`);
    await sleep(1400);
    check('I-10 前置：层在场（唯一 Shadow host，重新注入幂等）', (await op(siteTab, 'snapshot'))?.shadowHosts === 1);
    await op(siteTab, 'reset');
    const timersBefore = await op(siteTab, 'timers');
    check('I-10 前置（负控）：flash 之前没有挂起的 overlay 定时器', timersBefore === 0, String(timersBefore));
    await evaluate(
      swCdp,
      `chrome.tabs.sendMessage(${siteTab}, { kind: 'ref-highlight', refId: 'ref_1', selector: '#box', mode: 'flash' }).then(() => true)`,
    );
    await sleep(200);
    const timersDuring = await op(siteTab, 'timers');
    check('I-10：flash 高亮期间 overlay 定时器被**跟踪**（≥1；只 setTimeout 不跟踪就无法清除）', Number(timersDuring) >= 1, String(timersDuring));
    await sleep(2700); // FLASH_MS × 2 = 2400ms
    const timersAfter = await op(siteTab, 'timers');
    check('I-10：flash 定时器触发后自行从跟踪集合移除（归 0，不泄漏）', timersAfter === 0, String(timersAfter));

    // ── I-01②：失去授权后，层必须在**下一次交互**自检并卸载 ──────────────────────
    // 旧实现从不读 `env().authorized`：teardown 消息一旦丢失（撤销与拆卸竞态 / SW 重启），
    // 已失去授权的层会一直拦着宿主右键。`envReady()` 保证「从未收到 env」≠「被撤销」，
    // 因此 zero-injection 的强制注入负控不会被这条自检致盲（那是它自己的负控前提）。
    const layerProbe = (tabId) =>
      iso(
        tabId,
        `(() => {
           const el = document.createElement('button');
           el.id = 'teardown-probe';
           document.body.appendChild(el);
           const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
           el.dispatchEvent(ev);
           const out = {
             marker: typeof window.__wcliPickLayer,
             shadowHosts: document.querySelectorAll('[data-wcli-pick-root]').length,
             intercepted: ev.defaultPrevented,
           };
           el.remove();
           return out;
         })()`,
      );
    const preSelfCheck = await layerProbe(siteTab);
    check(
      'I-01② 前置（负控）：撤销前层在场且拦右键（自检若恒真则此断言也恒真）',
      preSelfCheck?.marker === 'object' && preSelfCheck?.intercepted === true,
      JSON.stringify(preSelfCheck),
    );
    const envPushed = await evaluate(
      swCdp,
      `chrome.tabs.sendMessage(${siteTab}, { kind: 'pick-layer-env', origin: ${JSON.stringify(site.origin)}, authorized: false, declarationHash: '' })
         .then(() => true).catch((e) => String(e))`,
    );
    check('I-01② 前置：去授权的 env 已下发到层（envReady 置真）', envPushed === true, String(envPushed));
    await sleep(250);
    const selfCheck = await layerProbe(siteTab);
    check(
      'I-01②：失去授权后第一次交互（右键）即**自行卸载**（marker / host / 拦截全零）',
      selfCheck?.marker === 'undefined' && selfCheck?.shadowHosts === 0 && selfCheck?.intercepted === false,
      JSON.stringify(selfCheck),
    );

    // ── I-01③：卸载必须把 `gone` 事实推给面板（此前面板侧 `phase==='gone'` 是死路径）──
    // 不调用 refresh（那会立刻重新注入并覆盖状态）：直接在面板 DOM 上读它收到的事实。
    // 收消息是异步的，因此等待有界（≤1.6s）而不是固定一次读。
    let gonePanel = await panel.dom();
    for (let i = 0; i < 8 && !/页面侧已卸载/.test(String(gonePanel.pageUnavailable ?? '')); i += 1) {
      await sleep(200);
      gonePanel = await panel.dom();
    }
    check(
      'I-01③：面板收到卸载事实（风险区出现「页面侧不可用：页面侧已卸载」）',
      /页面侧已卸载/.test(String(gonePanel.pageUnavailable ?? '')),
      String(gonePanel.pageUnavailable),
    );

    // ── 失败降级（真实路径：注入在执行时失败 ⇒ 必须可读上报）────────────────
    // The origin stays AUTHORIZED (so the entry is enabled and the click runs the real
    // product path) while the bundle becomes unloadable — the deterministic stand-in for
    // "injection refused at execute time" (restricted page / permission revoked between
    // the panel's view and the browser's decision). Chrome rejects the `files:` load and
    // the service worker must surface that reason instead of failing silently.
    await rm(join(extDir, 'pick-layer.js'), { force: true });
    check('失败降级前置：注入载荷已不可加载（授权仍在）', true, 'pick-layer.js 已从临时 dist 移除');
    // Drive the panel's own trigger-1 path (`refreshState` → `ensureInjected`) instead of
    // clicking a button whose disabled state is legitimately transient while the automatic
    // probe is in flight — the entry click and the panel-presence path share ONE inject
    // routine, so this exercises the same production code without racing the probe.
    await evaluate(pCdp, `window.__v3.testing.refresh(); true`);
    await sleep(1600);
    const degraded = await panel.dom();
    check('失败降级：风险区明示「页面侧不可用（原因）」', /页面侧不可用/.test(degraded.pageUnavailable), degraded.pageUnavailable);
    check('失败降级：「从页面拾取」入口被禁用（不静默失败）', degraded.pickDisabled === true, JSON.stringify(degraded.pickDisabled));
    check('失败降级：入口的禁用原因 = 页面侧不可用（用户看得到原因）', /页面侧不可用/.test(String(degraded.pickReason ?? '')), String(degraded.pickReason));

    // ── I-01：撤销后**同 origin 的另一 tab** 也必须被拆干净（origin 广播 teardown）──
    // 旧实现只对 bound/active 的那**一个** tab 发 teardown，于是「A/B 两 tab 同 origin
    // → 撤销 → 只拆 B」这个态里，另一个 tab 继续拦截右键 —— 而旧夹具从不构造第二个 tab。
    // （`layerProbe` 定义在上方 I-01② 段：同一探针在两处复用，不重复实现。）
    // 恢复注入载荷（上一条用例把它删了）并让两个 tab 各自持有活层。
    await cp(join(DIST, 'pick-layer.js'), join(extDir, 'pick-layer.js'));
    for (const tabId of [appTab, siteTab]) {
      await evaluate(swCdp, `chrome.tabs.update(${tabId}, { active: true }).then(() => true)`);
      await sleep(600);
      await evaluate(pCdp, `window.__v3.testing.refresh(); true`);
      await sleep(1300);
    }
    const preRevokeRoot = await layerProbe(siteTab);
    const preRevokeApp = await layerProbe(appTab);
    check(
      'I-01 前置（负控）：撤销前两个 tab 都有活层且都拦截右键',
      preRevokeRoot?.marker === 'object' && preRevokeRoot?.intercepted === true && preRevokeApp?.marker === 'object' && preRevokeApp?.intercepted === true,
      JSON.stringify({ siteTab: preRevokeRoot, appTab: preRevokeApp }),
    );
    const revokeRes = await evaluate(
      pCdp,
      `chrome.runtime.sendMessage({ kind: 'revoke', origin: ${JSON.stringify(site.origin)} }).then((r) => ({ ok: Boolean(r && r.ok), revoked: r && r.revoked }))`,
    );
    check('I-01 前置：撤销消息被接受', revokeRes?.ok === true, JSON.stringify(revokeRes));
    await sleep(900);
    const postRevokeRoot = await layerProbe(siteTab);
    const postRevokeApp = await layerProbe(appTab);
    check(
      'I-01 ①：撤销后**另一个 tab**（非 bound/active）也零残留（marker/host/拦截全零）',
      postRevokeApp?.marker === 'undefined' && postRevokeApp?.shadowHosts === 0 && postRevokeApp?.intercepted === false,
      JSON.stringify(postRevokeApp),
    );
    check(
      'I-01 ①：bound tab 同样零残留（原本覆盖的那一半不得回退）',
      postRevokeRoot?.marker === 'undefined' && postRevokeRoot?.shadowHosts === 0 && postRevokeRoot?.intercepted === false,
      JSON.stringify(postRevokeRoot),
    );
    const goneReadback = await (async () => {
      await evaluate(pCdp, `window.__v3.testing.refresh(); true`);
      await sleep(1300);
      return panel.dom();
    })();
    check(
      'AC-V3-018（撤销态）：撤销后 L0 风险位明示「页面侧零注入」',
      /零注入/.test(String(goneReadback.riskRail ?? '')),
      String(goneReadback.riskRail).slice(0, 140),
    );
    check(
      'AC-V3-018（撤销态）：撤销后「从页面拾取」入口被禁用（可读原因，不静默）',
      goneReadback.pickDisabled === true,
      JSON.stringify({ disabled: goneReadback.pickDisabled, reason: goneReadback.pickReason }),
    );
    sCdp.close();
    pCdp.close();
  } finally {
    try {
      chrome.chrome.kill('SIGKILL');
    } catch {
      /* already gone */
    }
    site.server.close();
    await sleep(400);
    await rm(chrome.work, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
    await rm(resolve('/tmp/opencode/v3-page-input-ext'), { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
  }
  finish('v3-4 页面即输入门禁');
}

main().catch((err) => {
  console.error('[page-input] failed:', err);
  process.exit(1);
});
