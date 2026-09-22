/**
 * V5-3 **TASK-V5-154 / 155** (ADR-V5-010 · FR-ALLN-023 / 024 · **AC-ALLN-003** · N24) —
 * the **法八四面零明文机核** (law8 four-face zero-plaintext gate).
 *
 * ── The claim ────────────────────────────────────────────────────────────────
 *
 * A value written through the masked card (掩码卡) reaches **the key store and nothing
 * else**. The gate drives the REAL path (`op.llm-config` → `collectOpParams` →
 * `submitSecret` → `keyStore.save`) with a sentinel that deliberately matches
 * `stream-plaintext.ts#label()`'s secret shape, then scans **four faces**:
 *
 *   ① 流内 payload   — `#stream` 全子树 `textContent` + `innerHTML` + every card
 *                      `CardView.payload` (serialized)
 *   ② digest         — `chrome.storage.local` 的 `stream-digest:*` 全部值
 *   ③ 审计面         — 审计**渲染**（`[data-l2-view="audit"]` / `#l2-audit-host` /
 *                      `#l1-receipt-rows`）+ 审计**存储**（`web-cli:audit`）
 *   ④ DOM value + 全部属性 — 根节点内**每个元素**的 `value` / `defaultValue` /
 *                      `placeholder` / `title` / `aria-label` / `aria-description` /
 *                      **全部 `attributes`（含 `data-*`，逐项而非白名单子集）**；
 *                      掩码输入的 `value` 在提交后**清空**
 *
 * ── Falsifiability (a face that cannot fail is not a face) ───────────────────
 *
 * {@link FACES} declares one `expectFailPattern` per face; each of the four is driven
 * red **by a real injection at the declared location** (① 一条卡的 payload.text /
 * ② 一个 digest 键 / ③ 审计渲染 / ④ 一个元素的 `title` 属性), then restored ⇒ green.
 * The 5th signal is the existing `label()` guard: the sentinel's shape is exactly what
 * `stream-plaintext.ts` throws on (`SENTINEL_SHAPE` below is recomputed from that
 * source), so a leak through `label()` cannot pass silently.
 *
 * Run: `node test/ui/law8-plaintext.mjs`   (one Chromium instance, serial — N13)
 */
import { readFileSync } from 'node:fs';
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
  sleep,
  VIEWPORT_HEIGHT,
  waitFor,
} from './_v3-helpers.mjs';

/** The sentinel: `sk-` + a high-entropy suffix ⇒ it matches `label()`'s secret shape. */
export const SENTINEL = 'sk-v5-law8-Q7mZ4tR9xK2p';
/** The product's ONE mask token (`stream-plaintext.ts#DIGEST_MASK`). */
const MASK = '••••••';

/** One judgement per face — the readable fragment its FAIL segment must produce. */
export const FACES = [
  { id: 'face-1-stream-payload', expectFailPattern: '法八面①（流内 payload）命中哨兵' },
  { id: 'face-2-digest', expectFailPattern: '法八面②（digest）命中哨兵' },
  { id: 'face-3-audit', expectFailPattern: '法八面③（审计面）命中哨兵' },
  { id: 'face-4-dom-attrs', expectFailPattern: '法八面④（DOM value / 全部属性）命中哨兵' },
];

/* ── the four in-page scans (one implementation, driven by the gate) ────────── */

/** ① the stream subtree + every folded payload. */
const SCAN_1 = `(() => {
  const S = ${JSON.stringify(SENTINEL)};
  const hits = [];
  const stream = document.getElementById('stream');
  if ((stream.textContent || '').includes(S)) hits.push('#stream.textContent');
  if ((stream.innerHTML || '').includes(S)) hits.push('#stream.innerHTML');
  const payloads = window.__v3.testing.payloads();
  if (JSON.stringify(payloads).includes(S)) hits.push('CardView.payload');
  return JSON.stringify({ hits, payloadCount: payloads.length });
})()`;

/** ② every persisted digest value (flush first: the digest is written on close). */
const SCAN_2 = `(async () => {
  const S = ${JSON.stringify(SENTINEL)};
  window.dispatchEvent(new Event('pagehide'));
  await new Promise((r) => setTimeout(r, 120));
  const all = await chrome.storage.local.get(null);
  const keys = Object.keys(all).filter((k) => k.indexOf('stream-digest') !== -1);
  const hits = keys.filter((k) => JSON.stringify(all[k]).includes(S));
  const masked = keys.filter((k) => JSON.stringify(all[k]).includes(${JSON.stringify(MASK)})).length;
  return JSON.stringify({ keys, hits, masked });
})()`;

/** ③ the audit rendered surfaces + the audit storage. */
const SCAN_3 = `(async () => {
  const S = ${JSON.stringify(SENTINEL)};
  const hits = [];
  const view = document.querySelector('[data-l2-view="audit"]');
  const rendered = (view ? view.textContent + view.innerHTML : '') + (document.getElementById('l1-receipt-rows')?.textContent ?? '');
  if (rendered.includes(S)) hits.push('audit-rendered');
  const all = await chrome.storage.local.get(null);
  const keys = Object.keys(all).filter((k) => k.indexOf('audit') !== -1);
  const stored = JSON.stringify(keys.map((k) => all[k]));
  if (stored.includes(S)) hits.push('audit-storage');
  // 审计面的字段口径（NFR-ALLN-011）：渲染出的每一个 [data-field] 必须 ∈ 审计白名单七列；
  // 零明文说明必须在位；审计行事实三元组（action/time/result）逐行齐备。
  const fields = [...document.querySelectorAll('#l2-audit-host [data-field]')].map((n) => n.getAttribute('data-field'));
  const allowed = ['id', 'command', 'action', 'result', 'ms', 'time', 'origin'];
  const outside = [...new Set(fields.filter((f) => !allowed.includes(f)))];
  const rows = [...document.querySelectorAll('#l2-audit-host .l2-audit-row')];
  const tuple = rows.every((r) => ['action', 'time', 'result'].every((f) => r.querySelector('[data-field="' + f + '"]')));
  const note = Boolean(document.querySelector('#l2-audit-host .l2-note-zero-plaintext'));
  return JSON.stringify({ hits, keys, outside, tuple, note, rows: rows.length });
})()`;

/** ④ every element's value / text-y props / ALL attributes, under the measurement root. */
const SCAN_4 = `(() => {
  const S = ${JSON.stringify(SENTINEL)};
  const hits = [];
  const root = document.getElementById('region-statusbar')?.parentElement ?? document.body;
  for (const el of [root, ...root.querySelectorAll('*')]) {
    if (el.value !== undefined && typeof el.value === 'string' && el.value.includes(S)) hits.push('value:' + (el.id || el.tagName));
    if (typeof el.defaultValue === 'string' && el.defaultValue.includes(S)) hits.push('defaultValue:' + (el.id || el.tagName));
    if (typeof el.placeholder === 'string' && el.placeholder.includes(S)) hits.push('placeholder:' + (el.id || el.tagName));
    if (typeof el.title === 'string' && el.title.includes(S)) hits.push('title:' + (el.id || el.tagName));
    // 全部 attributes（含 data-*）：逐项，不是白名单子集。
    for (const attr of el.attributes ?? []) {
      if (String(attr.value).includes(S)) hits.push('@' + attr.name + ':' + (el.id || el.tagName));
    }
  }
  const password = document.querySelector('input[type="password"][data-secret]');
  return JSON.stringify({ hits, password: password ? { value: password.value, secret: password.getAttribute('data-secret') } : null });
})()`;

/**
 * Drive the REAL masked path: recommendation chip (`op.llm-config`) → params sequence
 * (choice → text → **secret**) → `submitSecret` → `keyStore.save`.
 *
 * Written as a tolerant walker (it reports what it saw) so a UI change shows up as a
 * readable reading rather than as a null-click crash.
 */
async function driveMaskedWrite(cdp, value) {
  const log = [];
  await evaluate(cdp, `window.__v3.testing.streamReset(); true`);
  await evaluate(cdp, `window.__v3.testing.recommend('llm'); true`);
  await sleep(250);
  const chip = await evaluate(
    cdp,
    `(() => { const b = document.querySelector('#stream [data-msg-type="nextstep"] [data-op="op.llm-config"]'); if (!b) return false; b.click(); return true; })()`,
  );
  log.push({ kind: 'chip', clicked: chip });
  for (let i = 0; i < 4; i += 1) {
    await sleep(250);
    // The NEWEST unanswered ask card owns the param the pipeline is waiting for; the
    // answered / superseded ones stay in the stream (append-only), so the walker scopes
    // its selectors to that card instead of the document (the ids repeat per card).
    const info = JSON.parse(
      await evaluate(
        cdp,
        `(() => {
          const open = [...document.querySelectorAll('#stream [data-msg-type="askuser"]')].filter((c) => c.getAttribute('data-answered') === 'false');
          const c = open[open.length - 1];
          if (!c) return JSON.stringify({ kind: null, open: open.length });
          const i = c.querySelector('.ask-input');
          return JSON.stringify({ kind: c.getAttribute('data-ask-kind'), choose: c.querySelectorAll('[data-act="choose"]').length, type: i ? i.getAttribute('type') : null });
        })()`,
      ),
    );
    log.push(info);
    if (!info.kind) break;
    if (info.choose > 0) {
      await evaluate(cdp, `(() => { const open=[...document.querySelectorAll('#stream [data-msg-type="askuser"]')].filter((c)=>c.getAttribute('data-answered')==='false'); const c=open[open.length-1]; const b=c.querySelector('[data-act="choose"]'); if (b) b.click(); return true; })()`);
    } else {
      // The sentinel goes into the **secret** field only (the non-secret params get a
      // benign value), so a hit in any face is attributable to the value-under-test.
      const v = info.type === 'password' ? value : 'm1';
      await evaluate(
        cdp,
        `(() => { const open=[...document.querySelectorAll('#stream [data-msg-type="askuser"]')].filter((c)=>c.getAttribute('data-answered')==='false'); const c=open[open.length-1]; const i=c.querySelector('.ask-input'); if (i) i.value=${JSON.stringify('_V_')}; const b=c.querySelector('[data-act="answer"]'); if (b) b.click(); return true; })()`.replace('"_V_"', JSON.stringify(v)),
      );
    }
  }
  return log;
}

async function main() {
  console.log(`▶ chrome: ${CHROME}`);
  console.log(`▶ dist:   ${DIST}`);
  console.log(`▶ sentinel: ${SENTINEL}`);
  const { chrome, base } = await launch({ tag: 'law8', extDir: DIST, portRange: [9250, 9350] });
  try {
    const sw = await findOurServiceWorker(base);
    if (!sw) throw new Error('web-cli plugin service worker 不可达');
    const { cdp } = await openSidePanel(sw.cdp, base);
    const pageErrors = [];
    cdp.on('Runtime.exceptionThrown', (p) => pageErrors.push(p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text));
    await setViewport(cdp, 400, VIEWPORT_HEIGHT);
    await waitFor(cdp, `document.getElementById('stream') ? '1' : ''`, 80, 200);
    // A session segment must exist for the digest to be persisted on close (the flush is
    // keyed by the live session id), so the fixture binds an origin through the REAL
    // discovery message — the same one the product sends.
    await evaluate(cdp, `chrome.runtime.sendMessage({ kind: 'discover', origin: 'https://v3-law8.test', state: 'supported' }).then(() => true)`);
    await waitFor(cdp, `document.getElementById('status').textContent.includes('v3-law8.test') ? '1' : ''`, 60, 200);

    // ── 前置：哨兵形状 == 零明文守卫的 secret 形状（第 5 信号） ──────────────────
    // 值一旦经 `label()` / `sanitizeLabel()` / `assertNoPlaintext()` 就会**抛错**，所以
    // 哨兵必须命中 `stream-digest.ts#SECRET` 的形状 —— 该形状从**源文本**读出（不复制）。
    const guardSrc = readFileSync(join(PACKAGE_ROOT, 'src/ui/sidepanel/stream-digest.ts'), 'utf8');
    const secretDecl = /const SECRET = \/(.+)\/([a-z]*);/.exec(guardSrc);
    const secretRe = secretDecl ? new RegExp(secretDecl[1], secretDecl[2] || 'i') : null;
    check(
      '前置（第 5 信号）：哨兵命中源文本读出的 `SECRET` 形状 ⇒ 经 `label()` 必抛错（既有守卫）',
      secretRe !== null && secretRe.test(SENTINEL) && !secretRe.test('sk-v5-law8'),
      `decl=${Boolean(secretDecl)} match=${secretRe ? secretRe.test(SENTINEL) : 'n/a'}`,
    );

    // ── 驱动真实掩码写入路径 ───────────────────────────────────────────────────
    console.log('\n▶ 驱动：op.llm-config → params(choice/text/secret) → submitSecret → keyStore');
    const steps = await driveMaskedWrite(cdp, SENTINEL);
    check(
      '驱动路径：`op.llm-config` chip 可点 ∧ params 三段（choice/text/**secret**）走真实提交路径',
      steps[0]?.clicked === true && steps.some((s) => s.kind === 'secret'),
      JSON.stringify(steps),
    );
    await evaluate(cdp, `document.getElementById('l2-entry-audit').click(); true`);
    await sleep(600);
    await evaluate(cdp, `window.__v3.testing.closeL2View(); true`);
    await sleep(150);

    // ── 四面 ───────────────────────────────────────────────────────────────────
    const f1 = JSON.parse(await evaluate(cdp, SCAN_1));
    check(`① 流内 payload 零命中（#stream text+html+${f1.payloadCount} 个 payload）`, f1.hits.length === 0, JSON.stringify(f1.hits));
    const f2 = JSON.parse(await evaluate(cdp, SCAN_2));
    check(`② digest 零命中（${f2.keys.length} 个 digest 键）`, f2.hits.length === 0, JSON.stringify(f2.hits));
    check('② digest 含掩码 `••••••`（掩码卡写入的 digest 痕迹 = 掩码令牌，不只零命中）', f2.masked >= 1, JSON.stringify(f2));
    const f3 = JSON.parse(await evaluate(cdp, SCAN_3));
    check('③ 审计面（渲染 + 存储）零命中', f3.hits.length === 0, JSON.stringify(f3));
    check('③ 审计渲染列口径：`[data-field]` ⊆ 七列白名单 ∧ 零明文说明在位（NFR-ALLN-011）', f3.outside.length === 0 && f3.note === true, JSON.stringify(f3));
    check('③ 审计行事实三元组逐行齐备（action/time/result；零行时该判据不空转由下方行数记录）', f3.tuple === true, JSON.stringify({ rows: f3.rows }));
    const f4 = JSON.parse(await evaluate(cdp, SCAN_4));
    check('④ DOM value + 全部属性（逐项）零命中', f4.hits.length === 0, JSON.stringify(f4.hits));
    const fact = await evaluate(
      cdp,
      `(() => { const t = document.getElementById('stream').textContent; return JSON.stringify({ mask: t.includes('\u63A9\u7801'), cat: /8[+-]/.test(t), zero: t.includes('\u96F6\u660E\u6587') }); })()`,
    ).then((r) => JSON.parse(r));
    check('④ 掩码写入的**事实**可读：固化区含「掩码 · 零明文」+ 长度类别（值零出现）', fact.mask === true && fact.zero === true && fact.cat === true, JSON.stringify(fact));
    check(
      '④ 提交后掩码输入被清空（值不留痕）',
      f4.password === null || f4.password.value === '',
      JSON.stringify(f4.password),
    );

    // ── key 直写：值直达 key-store 恰 1 调用点 ─────────────────────────────────
    // 注释剔除后再计数：源文本里的说明句不算调用点。
    const sidepanelSrc = readFileSync(join(PACKAGE_ROOT, 'src/ui/sidepanel/sidepanel.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    const saveSites = (sidepanelSrc.match(/keyStore\.save\(/g) ?? []).length;
    check('key 直写：`src` 中 `keyStore.save(` 调用点 == 1（值只达 key-store，不经 dispatch/payload/digest）', saveSites === 1, `saveSites=${saveSites}`);
    const storedKey = await evaluate(cdp, `chrome.storage.local.get(null).then((all) => JSON.stringify(Object.keys(all).filter((k) => k.indexOf('llm') !== -1)))`);
    check('key-store 键存在（写入确实落到本机存储，不落流 / 不落 digest）', String(storedKey).length > 2, String(storedKey));
    const keyStoreValue = await evaluate(cdp, `chrome.storage.local.get(null).then((all) => JSON.stringify(Object.entries(all).filter(([k]) => k.indexOf('llm') !== -1)))`);
    check('key 直写面：哨兵**只**出现在 key-store 值里（该面是法八的合法落点）', keyStoreValue.includes(SENTINEL), `len=${keyStoreValue.length}`);

    // ── 四类注入反证（每条实跑 ⇒ 必 FAIL；还原 ⇒ PASS） ─────────────────────────
    console.log('\n▶ 四类注入反证（expectFailPattern 逐条实跑）');
    // ① → 流内 payload
    await evaluate(cdp, `window.__v3.testing.streamSeed([{ kind: 'ai', cardId: 'law8-evil', payload: { text: ${JSON.stringify(SENTINEL)} } }]); true`);
    const i1 = JSON.parse(await evaluate(cdp, SCAN_1));
    check(`① (FAIL 段) ${FACES[0].expectFailPattern}`, i1.hits.length > 0, JSON.stringify(i1.hits));
    await evaluate(cdp, `window.__v3.testing.streamReset(); true`);
    const r1 = JSON.parse(await evaluate(cdp, SCAN_1));
    check('① (PASS 段) 还原后零命中（判据非恒真）', r1.hits.length === 0, JSON.stringify(r1.hits));
    // ② → digest
    const i2 = JSON.parse(
      await evaluate(
        cdp,
        `(async () => { await chrome.storage.local.set({ 'web-cli/stream-digest:law8-evil': { v: 1, entries: [{ label: ${JSON.stringify(SENTINEL)} }] } }); return ${SCAN_2}; })()`,
      ),
    );
    check(`② (FAIL 段) ${FACES[1].expectFailPattern}`, i2.hits.length > 0, JSON.stringify(i2.hits));
    await evaluate(cdp, `chrome.storage.local.remove('web-cli/stream-digest:law8-evil'); true`);
    const r2 = JSON.parse(await evaluate(cdp, SCAN_2));
    check('② (PASS 段) 还原后零命中', r2.hits.length === 0, JSON.stringify(r2.hits));
    // ③ → 审计渲染
    const i3 = JSON.parse(
      await evaluate(
        cdp,
        `(() => { const host = document.getElementById('l2-audit-host'); const n = document.createElement('p'); n.id = 'law8-evil-audit'; n.textContent = ${JSON.stringify(SENTINEL)}; host.appendChild(n); return ${SCAN_3}; })()`,
      ),
    );
    check(`③ (FAIL 段) ${FACES[2].expectFailPattern}`, i3.hits.length > 0, JSON.stringify(i3.hits));
    await evaluate(cdp, `document.getElementById('law8-evil-audit')?.remove(); true`);
    const r3 = JSON.parse(await evaluate(cdp, SCAN_3));
    check('③ (PASS 段) 还原后零命中', r3.hits.length === 0, JSON.stringify(r3.hits));
    // ④ → 一个元素的 title / data-* 属性
    const i4 = JSON.parse(
      await evaluate(
        cdp,
        `(() => { const el = document.getElementById('statusbar-text'); el.setAttribute('title', ${JSON.stringify(SENTINEL)}); el.setAttribute('data-law8-x', ${JSON.stringify(SENTINEL)}); return ${SCAN_4}; })()`,
      ),
    );
    check(`④ (FAIL 段) ${FACES[3].expectFailPattern}`, i4.hits.length >= 2, JSON.stringify(i4.hits));
    await evaluate(cdp, `(() => { const el = document.getElementById('statusbar-text'); el.removeAttribute('title'); el.removeAttribute('data-law8-x'); return true; })()`);
    const r4 = JSON.parse(await evaluate(cdp, SCAN_4));
    check('④ (PASS 段) 还原后零命中', r4.hits.length === 0, JSON.stringify(r4.hits));

    // ── 元判据 ─────────────────────────────────────────────────────────────────
    check('元判据：四面各自声明非占位 expectFailPattern', FACES.length === 4 && FACES.every((f) => f.expectFailPattern.trim().length >= 8), JSON.stringify(FACES.map((f) => f.id)));
    check('无未捕获页面异常（掩码写入全链路干净）', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
    cdp.close();
  } finally {
    chrome.kill('SIGKILL');
  }
  finish('V5-3 法八四面零明文门禁');
}

main().catch((err) => {
  console.error(`✖ 法八门禁异常：${err instanceof Error ? err.stack ?? err.message : String(err)}`);
  process.exit(1);
});
