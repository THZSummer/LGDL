/**
 * V3-4 TASK-410 (FR-V3-067 / FR-V3-068 / NFR-V3-007 / AC-V3-018) — **未授权站点零注入**
 * (the runtime half; the static half is `test/zero-injection.test.ts`).
 *
 * ── What "zero injection" has to mean to be worth asserting ──────────────────
 *
 * Not "the layer is injected but does not respond" — that would be a promise. The
 * claim is **structural**: on an origin the plugin is not authorized for, the layer
 * cannot even be *put* there, because `chrome.scripting.executeScript` requires a host
 * permission the extension does not hold. This gate drives exactly that path and then
 * probes the page for the five observable consequences:
 *
 *   ① no `registerContentScripts` entry for that origin
 *   ② no injection (no layer marker, in the world `files:` lands in)
 *   ③ no listeners (synthetic `contextmenu` / `Alt` produce nothing)
 *   ④ no Shadow host (`[data-wcli-pick-root]`)
 *   ⑤ `contextmenu` is never intercepted (the page's own menu is untouched)
 *
 * Every probe is paired with a **negative control**: the very same bundle is forced
 * into the page through CDP (bypassing Chrome's permission gate), and the probes must
 * flip to positive. A probe that cannot fail is not a probe (NFR-V3-013).
 *
 * Run: node test/ui/zero-injection.mjs   (one Chromium instance, serial)
 */
import { createServer } from 'node:http';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  DIST,
  PACKAGE_ROOT,
  check,
  connectCdp,
  evaluate,
  failed,
  findOurServiceWorker,
  findTarget,
  finish,
  launch,
  sleep,
} from './_v3-helpers.mjs';

/** The **unauthorized** origin: `localhost` is deliberately NOT in the temp manifest's
 *  host permissions (only `http://127.0.0.1/*` is), so Chrome refuses to inject there. */
function serve(hostname) {
  return new Promise((res) => {
    const server = createServer((req, rq) => {
      rq.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      rq.end(`<!doctype html><html><head><title>${hostname}</title></head><body>
        <h1 id="title">${hostname}</h1><p id="para">zero-injection fixture</p>
        <div id="box" style="width:160px;height:60px">box</div></body></html>`);
    });
    server.listen(0, hostname, () => res({ server, origin: `http://${hostname}:${server.address().port}` }));
  });
}

/** The five probes, run in the page's MAIN world (works with or without an extension
 *  runtime — i.e. it also works for the forced-injection negative control). */
const PROBES = `(() => {
  const el = document.createElement('button');
  el.id = 'probe-target';
  document.body.appendChild(el);
  const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
  el.dispatchEvent(ev);
  return {
    marker: typeof window.__wcliPickLayer,
    shadowHosts: document.querySelectorAll('[data-wcli-pick-root]').length,
    rightClickIntercepted: ev.defaultPrevented,
    bubbles: document.querySelectorAll('*').length,
  };
})()`;

async function tempDistWithFixturePermission() {
  const dir = resolve('/tmp/opencode/v3-zero-injection-ext');
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  await cp(DIST, dir, { recursive: true });
  const manifest = JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8'));
  manifest.host_permissions = [...(manifest.host_permissions ?? []), 'http://127.0.0.1/*'];
  await writeFile(join(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return dir;
}

async function main() {
  const authorized = await serve('127.0.0.1');
  const unauthorized = await serve('localhost');
  const extDir = await tempDistWithFixturePermission();
  const chrome = await launch({ extDir, tag: 'zer0', portRange: [9300, 9450] });
  try {
    console.log(`▶ authorized fixture: ${authorized.origin} · unauthorized fixture: ${unauthorized.origin}`);
    const sw = await findOurServiceWorker(chrome.base);
    check('SW 可被定位（门禁前置）', Boolean(sw), 'service worker not found');
    if (!sw) return;
    const swCdp = sw.cdp;

    const mkTab = (url) => evaluate(swCdp, `chrome.tabs.create({ url: ${JSON.stringify(url)} }).then((t) => t.id)`);
    const authorizedTab = await mkTab(`${authorized.origin}/`);
    const unauthorizedTab = await mkTab(`${unauthorized.origin}/`);
    await sleep(1600);

    // ── ① no registration for the unauthorized origin ─────────────────────────
    const registrations = await evaluate(
      swCdp,
      `chrome.scripting.getRegisteredContentScripts().then((all) => all.map((s) => ({ id: s.id, matches: s.matches, js: s.js })))`,
    );
    const forUnauthorized = (registrations ?? []).filter((r) =>
      (r.matches ?? []).some((m) => String(m).includes('localhost')),
    );
    check('① 未授权 origin 无 registerContentScripts 注册', forUnauthorized.length === 0, JSON.stringify(forUnauthorized));
    // Negative control for the registration probe: the fixture permission IS granted
    // for 127.0.0.1, so an explicit registration there would show up in the same scan —
    // the scan is therefore able to see registrations.
    await evaluate(
      swCdp,
      `chrome.scripting.registerContentScripts([{ id: 'zero-probe-control', matches: ['http://127.0.0.1/*'], js: ['content.js'], runAt: 'document_idle' }]).then(() => true).catch((e) => String(e))`,
    );
    const afterControl = await evaluate(
      swCdp,
      `chrome.scripting.getRegisteredContentScripts().then((all) => all.map((s) => s.id))`,
    );
    check(
      '① 反证：同一扫描能看见注册（探针非恒真）',
      (afterControl ?? []).includes('zero-probe-control'),
      JSON.stringify(afterControl),
    );
    await evaluate(swCdp, `chrome.scripting.unregisterContentScripts({ ids: ['zero-probe-control'] }).then(() => true).catch(() => false)`);

    // ── the tab cannot be injected at all (structural refusal, readable reason) ──
    const injectAttempt = await evaluate(
      swCdp,
      `chrome.scripting.executeScript({ target: { tabId: ${unauthorizedTab} }, files: ['pick-layer.js'] })
         .then(() => ({ ok: true })).catch((e) => ({ ok: false, reason: String((e && e.message) || e) }))`,
    );
    check('② 未授权 origin 注入被 Chrome 拒绝（结构性，非「注入后不响应」）', injectAttempt?.ok === false, JSON.stringify(injectAttempt));
    check(
      '② 拒绝原因可读（含 host permission 说明）',
      /permission|Cannot access/i.test(String(injectAttempt?.reason ?? '')),
      String(injectAttempt?.reason),
    );

    // ── the product's own refusal path: the PANEL asks, the SW refuses ────────
    // (The panel is the sender in production; `chrome.runtime.sendMessage` from the
    //  service worker itself has no receiving end, so the real sender is used.)
    const panelUrl = await evaluate(swCdp, `chrome.runtime.getURL('sidepanel.html')`);
    await evaluate(swCdp, `chrome.tabs.create({ url: ${JSON.stringify(panelUrl)} }).then((t) => t.id)`);
    const panelTarget = await findTarget(chrome.base, (t) => t.type === 'page' && t.url.includes('sidepanel.html'));
    check('侧栏页面可被定位', Boolean(panelTarget));
    const pCdp = await connectCdp(panelTarget.webSocketDebuggerUrl);
    await pCdp.send('Runtime.enable');
    await sleep(900);
    await evaluate(swCdp, `chrome.tabs.update(${unauthorizedTab}, { active: true }).then(() => true)`);
    await sleep(1000);
    await evaluate(pCdp, `window.__v3 && window.__v3.testing && window.__v3.testing.refresh(); true`);
    await sleep(900);
    const swInject = await evaluate(
      pCdp,
      `chrome.runtime.sendMessage({ kind: 'pick-layer-inject' }).then((res) => ({ ok: res && res.ok, error: (res && res.error) || '' }))`,
    );
    check('② SW 的 pick-layer-inject 对未授权 origin 返回可读拒绝（不静默）', swInject?.ok === false, JSON.stringify(swInject));
    check(
      '② 拒绝文案点明「未授权」或「页面侧不可用」',
      /未授权|页面侧不可用/.test(String(swInject?.error ?? '')),
      String(swInject?.error),
    );

    // ── probes ③④⑤ in the page ───────────────────────────────────────────────
    const unPage = await findTarget(chrome.base, (t) => t.type === 'page' && t.url.startsWith(unauthorized.origin));
    check('未授权 fixture 页可被定位', Boolean(unPage));
    const uCdp = await connectCdp(unPage.webSocketDebuggerUrl);
    await uCdp.send('Runtime.enable');
    const probes = await evaluate(uCdp, PROBES);
    check('② 无注入：页面内不存在拾取层标记', probes?.marker === 'undefined', JSON.stringify(probes));
    check('④ 无 Shadow host', probes?.shadowHosts === 0, JSON.stringify(probes));
    check('③⑤ 无监听 / 右键不被拦截（contextmenu 未被 preventDefault）', probes?.rightClickIntercepted === false, JSON.stringify(probes));

    // ── negative control: force the same bundle in through CDP ────────────────
    const bundle = await readFile(join(extDir, 'pick-layer.js'), 'utf8');
    await evaluate(uCdp, `${bundle}\n//# sourceURL=v3-zero-injection-forced.js`);
    const forced = await evaluate(uCdp, PROBES);
    check('反证：强制注入后标记出现（② 探针可 FAIL）', forced?.marker === 'object', JSON.stringify(forced));
    check('反证：强制注入后 Shadow host 出现（④ 探针可 FAIL）', (forced?.shadowHosts ?? 0) >= 1, JSON.stringify(forced));
    check('反证：强制注入后右键被拦截（③⑤ 探针可 FAIL）', forced?.rightClickIntercepted === true, JSON.stringify(forced));
    // teardown restores the unauthorized page to zero again.
    await evaluate(uCdp, `(window.__wcliPickLayer && window.__wcliPickLayer.unmount(), true)`);
    const after = await evaluate(uCdp, PROBES);
    check('反证收尾：unmount 后 Shadow host / 拦截全部归零（teardown 真的移除）', after?.shadowHosts === 0 && after?.rightClickIntercepted === false, JSON.stringify(after));
    uCdp.close();

    // ── the panel's L0 risk zone states it, and the pick entry is disabled ────
    const l0 = await evaluate(
      pCdp,
      `(() => {
         const rail = document.getElementById('risk-rail');
         const pick = document.getElementById('l0-pick');
         return {
           railText: rail ? rail.textContent : '',
           pickDisabled: Boolean(pick && pick.disabled),
           pickReason: pick ? (pick.getAttribute('data-disabled-reason') || '') : '',
           layerMarker: typeof window.__wcliPickLayer,
         };
       })()`,
    );
    check('AC-V3-018：L0 风险位明示「页面侧零注入」', /零注入/.test(String(l0?.railText ?? '')), String(l0?.railText));
    check('AC-V3-018：「从页面拾取」入口被禁用（未授权）', l0?.pickDisabled === true, JSON.stringify(l0));
    check('AC-V3-018：禁用原因可读', /未授权|页面侧不可用/.test(String(l0?.pickReason ?? '')), String(l0?.pickReason));
    check('未授权时侧栏自身也不带拾取层', l0?.layerMarker === 'undefined', String(l0?.layerMarker));

    // ── BLOCK-1 / I-04 回归：**带路径**的未授权页面同样零注入 ───────────────────
    // 旧夹具的未授权页只走 `${origin}/`（根路径），而真实站点几乎总带路径。这一条把
    // 「零注入」的覆盖从根路径扩到深层路径 —— 与 page-input 的 /app 变体成对存在。
    const unauthorizedPathUrl = `${unauthorized.origin}/app`;
    const unauthorizedPathTab = await mkTab(unauthorizedPathUrl);
    await sleep(1200);
    const injectAttemptPath = await evaluate(
      swCdp,
      `chrome.scripting.executeScript({ target: { tabId: ${unauthorizedPathTab} }, files: ['pick-layer.js'] })
         .then(() => ({ ok: true })).catch((e) => ({ ok: false, reason: String((e && e.message) || e) }))`,
    );
    check('BLOCK-1 回归：未授权 origin 的**带路径**页面注入同样被 Chrome 拒绝', injectAttemptPath?.ok === false, JSON.stringify(injectAttemptPath));
    await evaluate(swCdp, `chrome.tabs.update(${unauthorizedPathTab}, { active: true }).then(() => true)`);
    await sleep(900);
    const swInjectPath = await evaluate(
      pCdp,
      `chrome.runtime.sendMessage({ kind: 'pick-layer-inject' }).then((res) => ({ ok: res && res.ok, error: (res && res.error) || '' }))`,
    );
    check('BLOCK-1 回归：SW 对未授权带路径页面返回可读拒绝（不因路径误判）', swInjectPath?.ok === false, JSON.stringify(swInjectPath));
    check(
      'BLOCK-1 回归：拒绝文案点明「未授权」或「页面侧不可用」（带路径页亦然）',
      /未授权|页面侧不可用/.test(String(swInjectPath?.error ?? '')),
      String(swInjectPath?.error),
    );
    const unPathPage = await findTarget(chrome.base, (t) => t.type === 'page' && t.url === unauthorizedPathUrl);
    check('BLOCK-1 回归：未授权带路径 fixture 页可被定位', Boolean(unPathPage));
    const upCdp = await connectCdp(unPathPage.webSocketDebuggerUrl);
    await upCdp.send('Runtime.enable');
    const pathProbes = await evaluate(upCdp, PROBES);
    check(
      'BLOCK-1 回归：未授权 /app 页面五探针全零（marker / Shadow host / 右键未被拦截）',
      pathProbes?.marker === 'undefined' && pathProbes?.shadowHosts === 0 && pathProbes?.rightClickIntercepted === false,
      JSON.stringify(pathProbes),
    );
    // 负控：同一带路径页面强制注入后，探针必须翻正（否则该探针恒真）。
    const pathBundle = await readFile(join(extDir, 'pick-layer.js'), 'utf8');
    await evaluate(upCdp, `${pathBundle}\n//# sourceURL=v3-zero-injection-path-forced.js`);
    const pathForced = await evaluate(upCdp, PROBES);
    check('BLOCK-1 反证：带路径页面强制注入后探针翻正（该探针可 FAIL）', pathForced?.marker === 'object' && (pathForced?.shadowHosts ?? 0) >= 1, JSON.stringify(pathForced));
    await evaluate(upCdp, `(window.__wcliPickLayer && window.__wcliPickLayer.unmount(), true)`);
    const pathAfter = await evaluate(upCdp, PROBES);
    check('BLOCK-1 反证收尾：带路径页面 unmount 后归零', pathAfter?.shadowHosts === 0 && pathAfter?.rightClickIntercepted === false, JSON.stringify(pathAfter));
    upCdp.close();
    pCdp.close();
  } finally {
    try {
      chrome.chrome.kill('SIGKILL');
    } catch {
      /* already gone */
    }
    authorized.server.close();
    unauthorized.server.close();
    await sleep(400);
    await rm(chrome.work, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
    // The temp extension copy lives outside the Chromium profile; remove it too so the
    // tmpfs is not quietly filled by repeated runs (v3-3 I-05 lesson).
    await rm(resolve('/tmp/opencode/v3-zero-injection-ext'), { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
  }
  void failed();
  void check;
  void PACKAGE_ROOT;
  finish('v3-4 未授权零注入门禁');
}

main().catch((err) => {
  console.error('[zero-injection] failed:', err);
  process.exit(1);
});
