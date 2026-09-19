/**
 * V3-1 TASK-109 / TASK-111 / ADR-V3-003 / ADR-V3-004 / ADR-V3-015
 * `npm run test:density` — the real-product L0 density gate.
 *
 * Five stages, all measured through the SINGLE caliber in
 * `test/ui/density-metrics.mjs` (the exact same expression string is injected
 * here and imported by `test/density-thresholds.test.ts`):
 *
 *   A  draft reconciliation — our caliber vs the design drafts' own
 *      `window.__density()`, plus the published numbers of
 *      `design/ui-redesign/index.html` (same-source proof; published-vs-measured
 *      deltas are REGISTERED, never smoothed over);
 *   B  the 9 mandatory cells  = 3 tiers × 3 viewports (320/400/520 × 900);
 *   C  the 15 registered cells = 5 risk sub-scenarios × 3 viewports, with the
 *      worst value taking part in the mandatory judgement and the risk increment
 *      attributed element-by-element (AC-V3-003);
 *   D  anti-cheat — the injected expression provably contains none of
 *      `getComputedStyle` / `offsetParent` / `getBoundingClientRect` / `aria-hidden`;
 *   E  the summary table (tier | viewport | caliber | measured | ceiling);
 *   F  **registry machine comparison** (ADR-V3-018 decision 2, review I8) — every
 *      measured cell (28 machine-compared cells, see below), the geometry floor AND
 *      its source measurement, and the shipped artifact bytes are compared against
 *      `docs/v4-density-baseline.json` (v4-1 起；`docs/v3-density-baseline.json` 已冻结为
 *      历史，只由 density-thresholds.test.ts 做 schema 保真断言）；any divergence is a
 *      FAIL with a readable diff (the registry can no longer drift silently).
 *
 * Closeout round (2026-09-16, validate R1): the fixture runs in TWO passes so every
 * cell reaches the same settled session state (`assertFixtureSettled()` asserts it
 * per cell, and the default tier must be identical across the three viewports);
 * stage F's cell count is computed instead of transcribed (F5) and its byte check is
 * named for what it proves (F9).
 *
 * `--reverse RP-V3-01..04,08,09` runs one counter-proof (see TASK-111 / the I8 and
 * closeout rounds). Every driver asserts BOTH halves — "must FAIL" and "must PASS
 * again after restore" — and exits non-zero if either half is missing (a counter-proof
 * that cannot fail is not a counter-proof, NFR-V3-013).
 *
 * Serial discipline (NFR-V3-012): exactly ONE Chromium instance, ONE page target,
 * every cell executed in order. Full stdout/stderr is tee'd to
 * `/tmp/opencode/v3-gate-logs/density.log` by the caller — never tail-truncated.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, unlinkSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  CHROME,
  DIST,
  PACKAGE_ROOT,
  check,
  evaluate,
  findOurServiceWorker,
  finish,
  launch,
  openSidePanel,
  realClick,
  setViewport,
  sleep,
  waitFor,
  VIEWPORT_HEIGHT,
} from './_v3-helpers.mjs';
import {
  DENSITY_LIMITS,
  DENSITY_MATRIX_SIZE,
  DENSITY_MEASURE_SOURCE,
  DENSITY_TIER_ORDER,
  DENSITY_VIEWPORTS,
  LOG_CLIENT_HEIGHT_FLOOR,
  MAX_CLICKABLES_PER_CARD,
  MAX_FIRST_SCREEN_CARDS,
  MAX_STREAM_RESIDENT_CLICKABLES,
  MAX_WELCOME_CARDS,
  MAX_WELCOME_LINES,
  RISK_SUBSCENARIOS,
  bannedApisInMeasureSource,
  compareBaselineCells,
  evaluateCardBudget,
  evaluateDelta,
  evaluateDensity,
  evaluateFirstScreen,
  measureSourceForRoot,
  riskVisibilityProbeSource,
} from './density-metrics.mjs';

const DESIGN_DIR = resolve(PACKAGE_ROOT, 'design/ui-redesign');
const BASELINE_JSON = resolve(PACKAGE_ROOT, 'docs/v4-density-baseline.json');
/** v3 基线：冻结的历史载体（schema 保真断言仍在 density-thresholds.test.ts）。 */
const V3_BASELINE_JSON = resolve(PACKAGE_ROOT, 'docs/v3-density-baseline.json');
const DRAFT_E = resolve(DESIGN_DIR, 'option-e-progressive.html');
const DRAFT_D = resolve(DESIGN_DIR, 'option-d-choice-guided.html');

/** Published numbers from `design/ui-redesign/index.html` (design-draft caliber). */
const DRAFT_PUBLISHED = {
  e: { clickables: 7, lines: 10, blocks: 47, regions: 6 },
  d: { clickables: 80, lines: 144, blocks: 391, regions: 5 },
};

/** Deviations from the published draft numbers, registered (never smoothed). */
const draftDeltas = [];

const argv = process.argv.slice(2);
const REVERSE = argv.includes('--reverse') ? argv[argv.indexOf('--reverse') + 1] : null;

/**
 * 默认档 `chars` 的跨视口容差（review 修复轮 **I6**）。
 *
 * v3 把 `chars` 当作视口无关量（逐项相等，0 容差）。I6 的**实测根因实验**（本文件
 * `charsAttribution()` 把摘要/审计入口的真实文本打进日志）证明：v4-1 的 `chars` 跨视口差
 * **不是**几何/摘要省略号造成的（原注释的「`nowrap+ellipsis` 少显示 3 字」归因不成立 ——
 * CSS ellipsis 不改 `textContent`），而是**审计计数在逐格运行时单调增长并跨位数**：
 *
 *   default  审计 2 → 6 → 10（第 3 格由 1 位变 2 位）
 *   empty    审计 92 → 96 → 100（第 3 格由 2 位变 3 位）
 *
 * 摘要 / `.view-label` / `.badge` 三处各多 1 字符 ⇒ 跨视口差恰为 **3**。因此该断言的
 * 正确形态是「结构四项逐项相等 ∧ chars 跨视口差 ≤ **实测上界 3**」（原实现取 8，偏松；
 * 收紧只减不增），并在 v4 取代台账 `redlineRemap` 显式登记「v3 chars 相等断言被取消」。
 */
const CHARS_SPREAD_MAX = 3;

/**
 * V4-1（ADR-V4-021 第 2 条 / FR-CHAT-072 / FR-CHAT-073）—— v4 的**两组新增独立登记格**。
 *
 * 31 格 = 9 强制（3 档 × 3 视口）+ 15 风险子场景 + **3 空态** + **3 风险详情展开** + 1 worst。
 * 这两档**不与 default 混算**：它们各自的 fixture 状态不同，档位互斥优先级依旧是
 * `risk > firstRun > default`，故上限显式取自 {@link DENSITY_LIMITS}（阈值 `7/15 · 9/20 · 17/35`
 * 逐字不变 —— 本叶不新增也不改写阈值）。
 */
const V4_EXTRA_TIERS = Object.freeze([
  Object.freeze({ key: 'empty', limits: DENSITY_LIMITS.default, why: '空态（无消息、无待决）：与 default 同为「低密度」态，但 fixture 与首屏卡集不同，独立成格' }),
  Object.freeze({ key: 'riskDetailOpen', limits: DENSITY_LIMITS.risk, why: '风险详情展开态：仍是风险档，但 #risk-detail 展开后 C2 增量真实存在，独立成格' }),
]);

/**
 * 卡的运行期口径（v4-1 过渡形态，登记于 `docs/v4-density-baseline.json#perCardBudget.caliber`）。
 *
 * 一张「卡」= `#stream` 内**可见的** `[data-msg-type]`（v4-2 的 7 主类卡）或空态欢迎占位
 * (`.log-empty-text`)。`li[data-transitional-host]` 是**过渡宿主**（v4-3/v4-4 退役），
 * 本身不是卡；`#l0-decision` 在 v4-1 仍是骨架占位宿主的内容体（v4-3 才换成 `askuser`/
 * `auth` 卡），故本叶**不**把它计为卡 —— 这一点显式登记在 `knownLimitations`，
 * 并由 RP-V4-01/02/03 注入 `[data-msg-type]` 卡来证明判据真的会红。
 */
const STREAM_CARDS_FN = `() => {
  const visibleIn = (el) => { let n = el; while (n) { if (n.hidden === true) return false; n = n.parentElement; } return true; };
  const CHARS_PER_LINE = 34;
  const stream = document.getElementById('stream');
  const cards = [];
  let seq = 0;
  for (const el of Array.from(stream.querySelectorAll('[data-msg-type], .log-empty-text'))) {
    if (!visibleIn(el)) continue;
    seq += 1;
    let clickables = 0;
    let chars = 0;
    for (const node of [el].concat(Array.from(el.querySelectorAll('*')))) {
      if (!visibleIn(node)) continue;
      const tag = node.tagName || '';
      if (/^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(tag) || (node.hasAttribute('tabindex') && node.getAttribute('tabindex') !== '-1')) clickables += 1;
      let own = '';
      for (const child of Array.from(node.childNodes)) if (child.nodeType === 3) own += child.textContent;
      chars += own.replace(/\\s+/g, '').length;
    }
    const welcome = el.classList.contains('log-empty-text');
    const key = welcome ? 'welcome' : (el.id || el.getAttribute('data-card-key') || (el.getAttribute('data-msg-type') + '#' + seq));
    cards.push({ key, clickables, chars, lines: Math.ceil(chars / CHARS_PER_LINE), welcome });
  }
  return cards;
}`;

/** The probe as a standalone expression (used by the stage measurements). */
const streamCardsProbe = `JSON.stringify((${STREAM_CARDS_FN})())`;

/**
 * **Atomic** perturbation probe — perturb, read the card list, restore, all inside ONE
 * `Runtime.evaluate`. This is what makes RP-V4-01/02/03 re-render-proof: the product
 * repaints `#stream` on every state push (`render()` drops non-host children), so a
 * perturbation that survives a `sleep()` and a separate probe call is a race, not a
 * proof. With the three steps in one synchronous block no repaint can interleave.
 */
const atomicCardsProbe = (perturb, restore) =>
  `(() => { ${perturb} const cards = (${STREAM_CARDS_FN})(); ${restore} return JSON.stringify(cards); })()`;

/** Read the card list and judge it (per-card budget + first-screen budget). */
async function judgeCards(cdp, tier) {
  const raw = await evaluate(cdp, streamCardsProbe);
  const cards = JSON.parse(raw);
  return {
    raw,
    cards,
    cardBudget: evaluateCardBudget(cards),
    firstScreen: evaluateFirstScreen(cards, tier === 'empty' ? 'empty' : 'default'),
  };
}

// ── in-page probes ───────────────────────────────────────────────────────────

/** The AC-V3-008 / AC-V3-009 risk-visibility probe (shared with `test/ui/l0.mjs`).
 *
 * Closeout round (F7): the implementation moved to the single-source module
 * (`density-metrics.mjs#riskVisibilityProbeSource`) so the two runtime gates can no
 * longer disagree about what "visible" means, and so the `visibility:hidden` /
 * `opacity:0` ancestor gap is fixed in exactly one place. */
const riskVisibleExpr = riskVisibilityProbeSource;

/** Per-element contribution snapshot for the RP-V3-03 counter-proof. */
const c1Probe = `(() => {
  const root = document.body;
  const visibleIn = (el) => { let n = el; while (n) { if (n.hidden === true) return false; n = n.parentElement; } return true; };
  let count = 0;
  for (const el of [root].concat(Array.from(root.querySelectorAll('*')))) {
    if (!visibleIn(el)) continue;
    const tag = el.tagName || '';
    if (/^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(tag) || (el.hasAttribute('tabindex') && el.getAttribute('tabindex') !== '-1')) count += 1;
  }
  return count;
})()`;

// ── fixtures ────────────────────────────────────────────────────────────────

const FIXTURE_ORIGIN = 'https://v3-density.test';
const LLM_KEY = 'web-cli:web-cli:llm';

/** Configure (or clear) the LLM projection through the real storage key. */
async function setLlm(cdp, configured) {
  if (configured) {
    await evaluate(
      cdp,
      `chrome.storage.local.set({ ${JSON.stringify(LLM_KEY)}: {
        active: 'openai',
        providers: { openai: { apiKey: 'v3-density-key', model: 'v3-density-mock', baseURL: 'http://127.0.0.1:9/v1' } },
        maxRounds: 3,
      } }).then(() => true)`,
    );
  } else {
    await evaluate(cdp, `chrome.storage.local.remove(${JSON.stringify(LLM_KEY)}).then(() => true)`);
  }
  await cdp.send('Page.reload', { ignoreCache: true });
  await waitFor(cdp, `document.getElementById('status') ? '1' : ''`, 80, 200);
  await sleep(500);
}

/** Bind the fixture origin through the real `discover` message. */
async function bindOrigin(cdp) {
  await evaluate(
    cdp,
    `chrome.runtime.sendMessage({ kind: 'discover', origin: ${JSON.stringify(FIXTURE_ORIGIN)}, state: 'supported' }).then(() => true)`,
  );
  const bound = await waitFor(
    cdp,
    `(() => { const s = document.getElementById('status').textContent; return s.includes('v3-density.test') ? s : ''; })()`,
    60,
    200,
  );
  return Boolean(bound);
}

/**
 * Authorize the fixture origin. The tier definition is a *state* ("已授权"), so the
 * fixture drives the **real `authorize` message** — the very message `#authorize`
 * sends — and then re-pulls the authoritative state. The OS permission prompt
 * (`chrome.permissions.request`) is deliberately skipped: headless has no prompt
 * UI, and for a synthetic origin with no real tab it never settles. The button's
 * own wiring is asserted separately by `test/ui/l0.mjs`.
 */
async function authorize(cdp) {
  await evaluate(
    cdp,
    `chrome.runtime.sendMessage({ kind: 'authorize', origin: ${JSON.stringify(FIXTURE_ORIGIN)}, hostPermissionGranted: false }).then(() => true)`,
  );
  await evaluate(cdp, `window.__v3.testing.refresh(); true`);
  const ok = await waitFor(cdp, `chrome.runtime.sendMessage({ kind: 'state' }).then((r) => r.data.authorized === true)`, 60, 200);
  if (ok) await evaluate(cdp, `window.__v3.testing.refresh(); true`);
  await sleep(250);
  return Boolean(ok);
}

/**
 * ONE fixture pass: bind + authorize + fold every disclosure + one decision card.
 *
 * Not called directly — `resetFixture()` runs it twice (see the determinism note).
 */
async function fixturePass(cdp, { authorized = true, ask = true, configured = true } = {}) {
  await setLlm(cdp, configured);
  const bound = await bindOrigin(cdp);
  if (!bound) throw new Error('fixture: origin 绑定失败');
  let authOk = true;
  if (authorized) {
    authOk = await authorize(cdp);
    if (!authOk) throw new Error('fixture: 授权失败');
  } else {
    // The origin store is authoritative and survives cells, so an "unauthorized"
    // fixture must actively revoke through the same message the revoke button uses.
    await evaluate(
      cdp,
      `chrome.runtime.sendMessage({ kind: 'revoke', origin: ${JSON.stringify(FIXTURE_ORIGIN)} }).then(() => true)`,
    );
    await evaluate(cdp, `window.__v3.testing.refresh(); true`);
    await waitFor(cdp, `chrome.runtime.sendMessage({ kind: 'state' }).then((r) => r.data.authorized !== true)`, 40, 200);
    await sleep(250);
  }
  await evaluate(cdp, `window.__v3.disclosure.collapseAll(); window.__v3.testing.reset(); true`);
  if (ask) {
    await evaluate(
      cdp,
      `window.__v3.testing.ask('这一步先做什么？', ['查看站点声明', '列出可用命令', '导出诊断', '打开设置']); true`,
    );
  }
  await sleep(350);
  return { authorized: authOk };
}

/**
 * THE default fixture (spec §9.2 "L0 默认态"): bound + authorized + probe finished
 * + no pending confirmation + onboarding / discovery-notice terminated; every
 * disclosure layer folded; one decision card with four options (so the clickable
 * budget sits exactly at 7).
 *
 * ── Fixture determinism (closeout round, validate R1 F2/K-1) ─────────────────
 *
 * The fixture runs in **two passes** and the *second* one is what the gate
 * measures. Reason: `#notice`(「页面已导航：会话上下文失效，请重新授权/重连（不静默续接）」,
 * 29 chars) is produced when the panel reloads while a session for the fixture
 * origin is already bound to the panel's OWN tab — which is true from the 2nd
 * fixture run onward, and never on the very first run of a fresh browser. Measuring
 * the 1st pass therefore produced a non-reproducible cell: `default@320` registered
 * 194 chars / 18 blocks / 6 lines while `default@400`/`@520` registered 223 / 19 / 7
 * — the whole difference being that notice (I8 had registered it as a fixture
 * asymmetry instead of fixing it).
 *
 * The notice is **not** transient: validate R1 independently measured the same 29
 * chars persisting inside the session for every subsequent cell, so the settled
 * state (notice present) is the product behaviour a long-lived panel actually has.
 * Making every cell run two passes makes every cell reach that same settled state
 * *by construction* instead of depending on run order (`#notice` cannot come and go),
 * and `assertFixtureSettled()` below asserts it per cell — an assertion that did not
 * exist before and that the asymmetry would have failed.
 */
async function resetFixture(cdp, opts = {}) {
  await fixturePass(cdp, opts);
  return fixturePass(cdp, opts);
}

/**
 * The settled-state anchor, read after every `resetFixture()`: the fixture must be
 * in the SAME state for every cell (the 29-char `#notice` of the settled session is
 * present, not absent). Returns the raw probe so a mismatch can be printed.
 */
const settledProbe = `(() => {
  const n = document.getElementById('notice');
  return JSON.stringify({
    noticeExists: Boolean(n),
    noticeHidden: n ? n.hidden : null,
    noticeLen: n ? (n.textContent || '').length : null,
    noticeText: n ? (n.textContent || '').slice(0, 60) : null,
  });
})()`;

/** Assert the fixture reached the settled state (one FAIL-able check per cell). */
async function assertFixtureSettled(cdp, label) {
  const raw = await evaluate(cdp, settledProbe);
  const s = JSON.parse(raw);
  check(
    `${label} 夹具确定性：达到同一稳态（#notice 持续存在的会话态，而非首次运行的未稳态）`,
    s.noticeExists === true && s.noticeHidden === false && s.noticeLen > 0,
    raw,
  );
  return s;
}

/** Force / hide a risk projection (AC-V3-003's attribution needs an exact pair). */
async function setRisk(cdp, cls, mode) {
  await evaluate(cdp, `window.__v3.testing.setRisk(${JSON.stringify(cls)}, ${JSON.stringify(mode)}); true`);
  await sleep(200);
}

/**
 * Wait until the automatic discovery probe is NOT in its transient `probing`
 * phase. The background retries the probe on a low-frequency timer, and while it
 * runs the L0 band legitimately reads `发现=探测中` (+1 character). Measuring across
 * that flip would be a *fixture* drift, not a product change — so the gate settles
 * the probe before every single measurement (R31-07: no silent cross-cell bleed).
 */
async function settleProbe(cdp) {
  await waitFor(
    cdp,
    `chrome.runtime.sendMessage({ kind: 'state' }).then((r) => (r.data && r.data.probe && r.data.probe.phase === 'probing' ? '' : 'settled'))`,
    40,
    150,
  );
  await sleep(150);
}

async function measure(cdp) {
  await settleProbe(cdp);
  const raw = await evaluate(cdp, DENSITY_MEASURE_SOURCE);
  return raw;
}

/**
 * review 修复轮 **I6** 归因诊断（**非断言**，只打日志）：`chars` 跨视口差异的根因证据。
 *
 * v4-1 原注释把 default 的 `chars` 差 3 归因为「站点摘要 `nowrap+ellipsis` 少显示 3 字」——
 * 该归因不成立（CSS ellipsis 不改变 `textContent`，且同视口下 default 与 empty 也差 3）。
 * 本诊断把工具栏摘要 / 审计入口标签 / 审计徽标 / `data-count` 的真实文本打进日志，让
 * 「跨视口差 3」是**数据量（审计计数跨位数）**还是**几何**可被直接读出。
 */
async function charsAttribution(cdp, label) {
  const raw = await evaluate(
    cdp,
    `JSON.stringify({
      summary: (document.getElementById('l2-entry-summary')?.textContent ?? '').trim(),
      auditLabel: (document.getElementById('l2-entry-audit')?.querySelector('.view-label')?.textContent ?? '').trim(),
      auditBadge: (document.getElementById('l2-entry-audit')?.querySelector('.badge')?.textContent ?? '').trim(),
      auditCount: document.getElementById('l2-entry-audit')?.getAttribute('data-count') ?? null,
      treeCount: document.getElementById('l2-entry-tree')?.getAttribute('data-count') ?? null,
      commandsCount: document.getElementById('l2-entry-commands')?.getAttribute('data-count') ?? null,
      settingsCount: document.getElementById('l2-entry-settings')?.getAttribute('data-count') ?? null,
    })`,
  );
  console.log(`    I6 归因（${label}）：${raw}`);
}

/** Structural fingerprint printed per cell (R31-07: no silent cross-cell bleed). */
async function fingerprint(cdp) {
  return evaluate(
    cdp,
    `(() => JSON.stringify({
      origin: document.getElementById('status')?.textContent ?? '',
      // V4-4 TASK-806: panel-side #l0-pick retired — the fingerprint tracks the settings-view
      // guidance instead (a retired entry must not be able to flip the cell print).
      pickGuidance: document.getElementById('pick-guidance')?.textContent ?? '',
      pickRetired: document.getElementById('l0-pick') === null,
      onboardingHidden: document.getElementById('onboarding')?.hidden ?? null,
      discoveryHidden: document.getElementById('discovery-notice')?.hidden ?? null,
      askHidden: document.getElementById('ask')?.hidden ?? null,
      moreHidden: document.getElementById('l0-more')?.hidden ?? null,
      disclosure: window.__v3.disclosure.snapshot(),
      risks: [...document.querySelectorAll('#risk-rail .risk-row')].map((r) => r.getAttribute('data-risk-class') ?? 'calm'),
      scrollBottomHidden: document.getElementById('scroll-bottom')?.hidden ?? null,
      log: (() => { const l = document.getElementById('stream'); return l ? { sh: l.scrollHeight, ch: l.clientHeight, st: l.scrollTop } : null; })(),
    }))()`,
  );
}

const fmt = (m) =>
  `C1=${m.clickables} C2=${m.lines} C3=${m.blocks} C4=${m.regions} chars=${m.chars}`;

// ── stage A: design-draft reconciliation ─────────────────────────────────────
async function stageA(browserCdp, base) {
  console.log('\n▶ 阶段 A：设计稿口径同源对账（我们的口径 vs 稿件自带 __density()）');
  for (const [key, file, hasOwnDensity] of [
    ['e', DRAFT_E, true],
    ['d', DRAFT_D, false],
  ]) {
    if (!existsSync(file)) {
      check(`A/${key} 稿件存在`, false, file);
      continue;
    }
    await browserCdp.send('Target.createTarget', { url: `file://${file}` });
    const target = await waitForTarget(base, file);
    if (!target) {
      check(`A/${key} 稿件页可打开`, false, file);
      continue;
    }
    const page = await (await import('./_v3-helpers.mjs')).connectCdp(target.webSocketDebuggerUrl);
    await page.send('Runtime.enable');
    await sleep(900);
    await setViewport(page, 400, VIEWPORT_HEIGHT);
    const ours = await evaluate(page, measureSourceForRoot(`document.getElementById('panel')`));
    const theirs = hasOwnDensity
      ? await evaluate(page, `typeof window.__density === 'function' ? window.__density() : null`)
      : null;
    const published = DRAFT_PUBLISHED[key];
    console.log(
      `  · 稿件 ${key.toUpperCase()}: 我们的口径 ${fmt(ours)} | 稿件自带 ${theirs ? `clickables=${theirs.interactive} lines=${theirs.lines} blocks=${theirs.blocks} regions=${theirs.regions}` : 'n/a'} | 公布值 ${JSON.stringify(published)}`,
    );
    if (theirs) {
      // Same-source proof: identical algorithm ⇒ identical numbers on the same DOM.
      check(
        `A/${key} 同源：我们的口径与稿件自带 __density() 逐项相等`,
        ours.clickables === theirs.interactive &&
          ours.lines === theirs.lines &&
          ours.blocks === theirs.blocks &&
          ours.regions === theirs.regions &&
          ours.chars === theirs.chars,
        `ours=${fmt(ours)} theirs=${JSON.stringify(theirs)}`,
      );
    }
    // The binding number the spec's threshold rationale rests on (E 实测 7).
    // E is the design baseline (D1) so its clickable count is asserted verbatim;
    // D is a high-density REFERENCE object (D2), never an acceptance target, so its
    // deviation is registered and only bounded (proving we measured the same file).
    if (key === 'e') {
      check(`A/${key} 可点元素 == 公布值 ${published.clickables}`, ours.clickables === published.clickables, `实测 ${ours.clickables}`);
    } else {
      check(
        `A/${key} 与公布值的落差在可登记范围内（|Δ| ≤ 2）`,
        Math.abs(ours.clickables - published.clickables) <= 2 && Math.abs(ours.lines - published.lines) <= 2 && Math.abs(ours.blocks - published.blocks) <= 2,
        `实测 ${fmt(ours)} vs 公布值 ${JSON.stringify(published)}`,
      );
    }
    // Published-vs-measured deltas are REGISTERED, not smoothed over: the published
    // table came from a Node shim over an earlier draft revision, while this gate
    // measures the shipped file with the shipped caliber.
    const delta = {
      draft: key,
      measured: { clickables: ours.clickables, lines: ours.lines, blocks: ours.blocks, regions: ours.regions, chars: ours.chars },
      published,
      delta: {
        clickables: ours.clickables - published.clickables,
        lines: ours.lines - published.lines,
        blocks: ours.blocks - published.blocks,
        regions: ours.regions - published.regions,
      },
    };
    draftDeltas.push(delta);
    if (delta.delta.lines !== 0 || delta.delta.blocks !== 0 || delta.delta.clickables !== 0 || delta.delta.regions !== 0) {
      console.log(`  ⚠ 稿件 ${key.toUpperCase()} 与公布值有落差，已如实登记：${JSON.stringify(delta.delta)}`);
    }
    check(`A/${key} 分区数 == 公布值 ${published.regions}`, ours.regions === published.regions, `实测 ${ours.regions}`);
    page.close();
  }
}

async function waitForTarget(base, needle, tries = 60, gapMs = 250) {
  for (let i = 0; i < tries; i += 1) {
    const list = await fetch(`${base}/json/list`).then((r) => r.json()).catch(() => []);
    const t = list.find((x) => x.type === 'page' && x.url.includes(needle));
    if (t) return t;
    await sleep(gapMs);
  }
  return undefined;
}

// ── stage B/C: the measurement matrix ───────────────────────────────────────
async function stageB(cdp) {
  console.log('\n▶ 阶段 B：真实产物 3 档 × 3 视口 = 9 强制格');
  const rows = [];
  for (const tier of DENSITY_TIER_ORDER) {
    if (tier === 'risk') continue; // stage C measures the risk tier cell-by-cell
    for (const vp of DENSITY_VIEWPORTS) {
      // Viewport FIRST, then the fixture: the fixture ends with a reload, so the
      // panel renders (and re-computes the scroll affordance) at the final size.
      await setViewport(cdp, vp, VIEWPORT_HEIGHT);
      await resetFixture(cdp, { authorized: true, ask: true, configured: tier !== 'firstRun' });
      await sleep(250);
      await assertFixtureSettled(cdp, `${tier}@${vp}`);
      const measured = await measure(cdp);
      const measuredAgain = await measure(cdp);
      const verdict = evaluateDensity(measured, tier);
      const fp = JSON.parse(await fingerprint(cdp));
      rows.push({ tier, vp, measured, verdict });
      check(
        `${tier}@${vp} 夹具幂等（连续两次测量逐项相等）`,
        measured.clickables === measuredAgain.clickables &&
          measured.lines === measuredAgain.lines &&
          measured.blocks === measuredAgain.blocks &&
          measured.regions === measuredAgain.regions,
        `${fmt(measured)} vs ${fmt(measuredAgain)}`,
      );
      console.log(
        `    可点明细：${(measured.elementsWithKeys ?? [])
          .filter((e) => e.clickable)
          .map((e) => (e.key && e.key.startsWith('>') ? e.key.slice(0, 34) : e.key))
          .join(' | ')}`,
      );
      console.log(`  · ${tier}@${vp}: ${fmt(measured)} → ${verdict.ok ? 'PASS' : 'FAIL'} | 指纹 pickDisabled=${fp.pickDisabled} onboardingHidden=${fp.onboardingHidden} discoveryHidden=${fp.discoveryHidden} askHidden=${fp.askHidden} scrollBottomHidden=${fp.scrollBottomHidden} log=${JSON.stringify(fp.log)} risks=${fp.risks.join(',') || 'none'} disclosure=${JSON.stringify(fp.disclosure)}`);
      check(`${tier}@${vp} C1/C2 ≤ 上限`, verdict.ok, verdict.message);
      if (tier === 'default') {
        await charsAttribution(cdp, `default@${vp}`);
        check(`default@${vp} 常驻分区数（C4）已登记`, Number.isFinite(measured.regions), `regions=${measured.regions}`);
        // V4-1 显式取代（redlineRemap：v3「default 恰 7 可点」）：三区骨架把 L1 入口面板与
        // 状态带整体退役，可点准入 = **工具栏 4 入口 + 主题 = 恰 5**（ADR-V4-018；#region-statusbar
        // 内零常驻可点，chips 只在风险态出现）。等价改写为「default 档可点 == 工具栏准入值」。
        check(
          `default@${vp} 可点预算恰为工具栏准入值（v4-1 取代 v3「恰 7」：4 入口 + 主题 = 5）`,
          measured.clickables === 5 && measured.clickables <= DENSITY_LIMITS.default.clickables,
          `实测 ${measured.clickables}`,
        );
        check(
          `default@${vp} 「回到底部」不在 L0 常驻（未上滚时必须 hidden）`,
          fp.scrollBottomHidden === true,
          `scrollBottomHidden=${fp.scrollBottomHidden} log=${JSON.stringify(fp.log)}`,
        );
        const defaultCards = await judgeCards(cdp, 'default');
        check(
          `default@${vp} 单卡可点 ≤${MAX_CLICKABLES_PER_CARD} ∧ 首屏卡 ≤${MAX_FIRST_SCREEN_CARDS} ∧ 首屏合计可点 ≤${MAX_STREAM_RESIDENT_CLICKABLES}（逐卡动态格）`,
          defaultCards.cardBudget.ok && defaultCards.firstScreen.ok,
          `${[...defaultCards.cardBudget.violations, ...defaultCards.firstScreen.violations].join(' / ')} | ${defaultCards.raw}`,
        );
      }
      if (tier === 'firstRun') {
        check(`firstRun@${vp} 首装态确实生效（onboarding 或 discovery-notice 可见）`, fp.onboardingHidden === false || fp.discoveryHidden === false, JSON.stringify(fp));
      }
    }
  }
  // Fixture determinism (closeout round, F2/K-1): the default tier is a *state*, not
  // a viewport-dependent layout, so a deterministic fixture must produce identical
  // cells at 320 / 400 / 520. The old asymmetry (`default@320` = 194/18/6 vs
  // 400/520 = 223/19/7) is exactly what this assertion FAILS on.
  const defaultRows = rows.filter((r) => r.tier === 'default');
  const firstMeasured = defaultRows[0]?.measured;
  // ── V4-1 显式取代（redlineRemap #4：v3「默认档三视口 chars 逐项相等」）──────────
  // v3 的确定性断言把 `chars` 也放进「逐项相等」集合（0 容差）。v4-1 的实测根因（I6）：
  // `chars` 会随**审计计数跨位数**变化（default 2→6→10 时摘要/标签/徽标各 +1 字符 = +3），
  // 因此 `chars` 不是视口无关量。取代后的判据：结构四项（C1/C2/C3/C4）必须逐项相等，
  // 且 `chars` 的跨视口差必须 ≤ **实测上界 3**（`CHARS_SPREAD_MAX`）。
  //
  // review 修复轮 I6：原实现取 ≤ 8（偏松且归因未证实），且该「v3 红线被取消」的事实
  // **未登记进 redlineRemap/entries**（登记缺失）。本轮两件都补齐：
  //   ① 容差由 8 收紧到实测上界 3；
  //   ② v4 取代台账新增 redlineRemap 条目（v3 chars 相等 → 结构相等 ∧ chars 差 ≤3）。
  const structDrift = defaultRows
    .filter((r) => r.measured.clickables !== firstMeasured.clickables
      || r.measured.lines !== firstMeasured.lines
      || r.measured.blocks !== firstMeasured.blocks
      || r.measured.regions !== firstMeasured.regions)
    .map((r) => `default@${r.vp}: ${fmt(r.measured)} ≠ default@${defaultRows[0].vp}: ${fmt(firstMeasured)}`);
  const charsSpread = Math.max(...defaultRows.map((r) => r.measured.chars)) - Math.min(...defaultRows.map((r) => r.measured.chars));
  // I6 归因证据（**诊断输出，非断言**）：逐元素 dump `elementsWithKeys.chars`，把跨视口
  // 有差异的元素与读数打进日志 —— 让「差 3」的根因可复核，而不是靠注释里的推测。
  const charsByKey = defaultRows.map((r) => new Map((r.measured.elementsWithKeys ?? []).map((e) => [e.key, e.chars])));
  const charsDiffs = [...new Set(charsByKey.flatMap((m) => [...m.keys()]))]
    .filter((key) => new Set(charsByKey.map((m) => m.get(key) ?? null)).size > 1)
    .map((key) => `${key}@${defaultRows.map((r, i) => `${r.vp}=${charsByKey[i].get(key) ?? '∅'}`).join(',')}`);
  console.log(`    chars 跨视口差异元素（I6 归因，诊断非断言）：${charsDiffs.length ? charsDiffs.join(' | ') : '无（逐元素相等）'}`);
  check(
    '默认档夹具确定性：三视口结构逐项相等（可点/行/块/分区；v4-1：chars 受摘要本身文本影响，见下条）',
    Boolean(firstMeasured) && defaultRows.length === DENSITY_VIEWPORTS.length && structDrift.length === 0,
    structDrift.join(' | ') || `rows=${defaultRows.length}`,
  );
  check(
    `默认档 chars 跨视口差 ≤ ${CHARS_SPREAD_MAX}（v4-1 登记：审计计数跨位数 ⇒ 摘要/标签/徽标各 +1 字符；review 修复轮 I6 由 8 收紧到实测上界）`,
    charsSpread <= CHARS_SPREAD_MAX,
    `spread=${charsSpread}（${defaultRows.map((r) => `@${r.vp}=${r.measured.chars}`).join(' ')}）| 差异元素：${charsDiffs.join(' | ') || '无'}`,
  );
  const baselineCharsSpread = existsSync(BASELINE_JSON)
    ? JSON.parse(readFileSync(BASELINE_JSON, 'utf8')).counts?.charsSpreadMax ?? null
    : null;
  check(
    '默认档 chars 容差与机读基线同源（口径单源 `counts.charsSpreadMax`，非本文件另造）',
    baselineCharsSpread === CHARS_SPREAD_MAX,
    `${JSON.stringify(baselineCharsSpread)} vs ${CHARS_SPREAD_MAX}`,
  );
  return rows;
}

// ── stage B2: the v4 extra registered cells (empty × 3 + riskDetailOpen × 3) ─
/**
 * V4-1（ADR-V4-021 第 2 条）：31 格里的两组**新增独立登记格** —— 空态（`#stream.empty`
 * + 欢迎占位）与风险详情展开（`#risk-detail` 可见）。它们**不与 default 混算**：
 * 每格有自己的 fixture、自己的上限来源（`empty ⇒ DENSITY_LIMITS.default` /
 * `riskDetailOpen ⇒ DENSITY_LIMITS.risk`），并逐格跑「单卡 ≤6」与「首屏 ≤2」两条防滥用判据。
 */
async function stageB2(cdp) {
  console.log('\n▶ 阶段 B2：v4 新增独立登记格（空态 3 + 风险详情展开 3 = 6 格）');
  const rows = [];
  for (const tier of V4_EXTRA_TIERS) {
    for (const vp of DENSITY_VIEWPORTS) {
      await setViewport(cdp, vp, VIEWPORT_HEIGHT);
      if (tier.key === 'empty') {
        await resetFixture(cdp, { authorized: true, ask: false });
        await sleep(250);
        const st = JSON.parse(
          await evaluate(
            cdp,
            `(() => {
              const s = document.getElementById('stream');
              const w = s.querySelector('.log-empty-text');
              return JSON.stringify({ empty: s.classList.contains('empty'), welcome: Boolean(w), welcomeChars: (w?.textContent ?? '').replace(/\\s+/g, '').length });
            })()`,
          ),
        );
        check(`empty@${vp} 空态确实生效（#stream.empty ∧ 欢迎占位存在）`, st.empty === true && st.welcome === true, JSON.stringify(st));
        check(
          `empty@${vp} 欢迎卡 ≤1 张且 ≤${MAX_WELCOME_LINES} 行（320px ⇒ ≤${MAX_WELCOME_LINES * 34} 字符）`,
          st.welcomeChars <= MAX_WELCOME_LINES * 34,
          `实测 ${st.welcomeChars} 字符（上限 ${MAX_WELCOME_LINES * 34}）`,
        );
      } else {
        await resetFixture(cdp, { authorized: true, ask: true });
        await setRisk(cdp, 'hardline', 'force');
        await sleep(250);
        const openedRaw = await evaluate(
          cdp,
          `(() => {
            const chip = document.querySelector('#risk-rail .risk-row[data-risk-class="hardline"]');
            if (!chip) return JSON.stringify({ chip: false });
            chip.click();
            const d = document.getElementById('risk-detail');
            return JSON.stringify({ chip: true, hidden: d ? d.hidden : null, expanded: chip.getAttribute('aria-expanded'), lines: d ? d.querySelectorAll('.risk-detail-line').length : 0, text: (d?.textContent ?? '') });
          })()`,
        );
        const o = JSON.parse(openedRaw);
        check(
          `riskDetailOpen@${vp} 风险详情确实展开（chip 点击 → #risk-detail 可见）`,
          o.chip === true && o.hidden === false && o.expanded === 'true' && o.lines >= 1,
          openedRaw,
        );
        check(
          `riskDetailOpen@${vp} 详情含「本阶段不发命令、不改授权」披露语`,
          /本阶段不发命令、不改授权/.test(o.text ?? ''),
          openedRaw,
        );
      }
      await assertFixtureSettled(cdp, `${tier.key}@${vp}`);
      await charsAttribution(cdp, `${tier.key}@${vp}`);
      const measured = await measure(cdp);
      const verdict = evaluateDensity(measured, tier.key === 'empty' ? 'default' : 'risk');
      const judgeTier = tier.key === 'empty' ? 'default' : 'risk';
      const cards = await judgeCards(cdp, tier.key);
      check(`${tier.key}@${vp} C1/C2 ≤ 上限（${tier.key} 档独立判定，阈值 7/15 · 9/20 · 17/35 逐字不变）`, verdict.ok, verdict.message);
      check(
        `${tier.key}@${vp} 单卡可点 ≤${MAX_CLICKABLES_PER_CARD}（逐卡动态格）`,
        cards.cardBudget.ok,
        `${cards.cardBudget.violations.join(' / ')} | ${cards.raw}`,
      );
      check(
        `${tier.key}@${vp} 首屏卡 ≤${MAX_FIRST_SCREEN_CARDS} ∧ 欢迎卡 ≤${MAX_WELCOME_CARDS} 张`,
        cards.firstScreen.ok,
        `${cards.firstScreen.violations.join(' / ')} | ${cards.raw}`,
      );
      // 与 stage C 同一纪律：一格结束后必须撤掉风险投影，绝不把状态泄漏到下一格。
      if (tier.key === 'riskDetailOpen') await setRisk(cdp, 'hardline', 'off');
      rows.push({ tier: tier.key, vp, measured, verdict, cards, judgeTier });
      const worstCard = cards.cards.reduce((n, c) => Math.max(n, c.clickables), 0);
      console.log(
        `  · ${tier.key}@${vp}: ${fmt(measured)} → ${verdict.ok ? 'PASS' : 'FAIL'} | 卡 ${cards.cards.length} 张（最坏单卡可点 ${worstCard}）| 首屏违规 ${cards.firstScreen.violations.length}`,
      );
    }
  }
  check('v4 新增独立登记格数 == 6（空态 3 + 风险详情展开 3）', rows.length === 6, String(rows.length));
  return rows;
}

async function stageC(cdp) {
  console.log('\n▶ 阶段 C：风险 5 子场景 × 3 视口 = 15 登记格（最差值参与强制判定）');
  const cells = [];
  const defaultRow = {};
  for (const sub of RISK_SUBSCENARIOS) {
    for (const vp of DENSITY_VIEWPORTS) {
      // base = the exact same fixture with the risk projection suppressed
      await setViewport(cdp, vp, VIEWPORT_HEIGHT);
      await resetFixture(cdp, { authorized: sub.key !== 'unauthorized', ask: true });
      await assertFixtureSettled(cdp, `risk(${sub.key})@${vp}`);
      if (sub.key === 'unauthorized') await setRisk(cdp, 'unauthorized', 'off');
      await sleep(250);
      const base = await measure(cdp);
      const baseText = await evaluate(cdp, `JSON.stringify({
        status: document.getElementById('status').textContent,
        llm: document.getElementById('llm-status').textContent,
        ref: document.getElementById('l0-ref-toggle').textContent,
        more: document.getElementById('l0-more').textContent,
      })`);
      // risk = the same fixture with the projection on
      await setRisk(cdp, sub.key, sub.key === 'unauthorized' ? 'natural' : 'force');
      await sleep(200);
      const measured = await measure(cdp);
      const verdict = evaluateDensity(measured, 'risk');
      const delta = evaluateDelta(base, measured);
      const probe = await evaluate(cdp, riskVisibleExpr(sub.key));
      // stability: re-measure the *base* after the risk window; a drift means the
      // fixture (not the product) moved, and it must be reported as such.
      // V4-4 R2: the expected drift is **registered** (see `riskExpectationFor`) —
      // `staleRef`'s risk step legitimately appends a real `ref` card (append-only,
      // FR-CHAT-050), which at 320px reveals the `#scroll-bottom` affordance. The judge
      // stays two-directional: the drift must equal the registered values EXACTLY (the
      // other 14 cells are registered as zero drift, i.e. the R1 judge verbatim).
      await setRisk(cdp, sub.key, 'off');
      await sleep(200);
      const baseAgain = await measure(cdp);
      const expected = riskExpectationFor(sub.key, vp);
      const keySets = deltaKeySets(base, measured, baseAgain);
      // ── V4-4 R2（KL-V44-01 裁决②/④：显式重锚）──────────────────────────────
      // 稳定性判据从「漂移必须为 0」重锚为「漂移必须**逐项等于登记值**」：登记表里
      // 只有 `staleRef@320` 一格有非零登记（风险步自身的流内副作用让 `#scroll-bottom`
      // 从 base 到 baseAgain 出现），其余 14 格登记值为 0（判据与 R1 完全一致）。
      // 双向：多漂、少漂、漂移键不符都 FAIL —— 登记的是**实测真值**，不是「允许漂移」。
      const drift = {
        clickables: baseAgain.clickables - base.clickables,
        lines: baseAgain.lines - base.lines,
        blocks: baseAgain.blocks - base.blocks,
        chars: baseAgain.chars - base.chars,
      };
      const driftRegistered = JSON.stringify(drift) === JSON.stringify(expected.baseWindowDrift);
      // 漂移键集合（可点 ∪ 文本块去重后排序）—— 与登记键逐字比较。
      const driftKeyList = [...new Set([...keySets.driftClickables, ...keySets.driftBlocks])].sort();
      const driftKeysRegistered =
        expected.driftKeys.length === 0
          ? driftKeyList.length === 0
          : JSON.stringify(driftKeyList) === JSON.stringify([...expected.driftKeys].sort());
      const stable = driftRegistered && driftKeysRegistered;
      check(
        `risk(${sub.key})@${vp} 夹具跨风险窗口稳定（base 复测逐项等于登记漂移${
          expected.registered ? `：${JSON.stringify(expected.baseWindowDrift)} / 键 ${JSON.stringify(expected.driftKeys)}` : ' 0'
        }）`,
        stable,
        `${fmt(base)} vs ${fmt(baseAgain)} | 漂移 ${JSON.stringify(drift)} | 漂移键 ${JSON.stringify(driftKeyList)} | base 文本 ${baseText}`,
      );
      if (!stable) console.log(`    漂移明细：base=${JSON.stringify(base.elementsWithKeys?.filter((e) => e.clickable || e.block).slice(0, 40))}`);
      cells.push({ sub: sub.key, vp, measured, verdict, delta, probe });
      // V4-4 R2（KL-V44-01 裁决④）—— **归因诊断（非断言）**：把三种状态的可点 / 文本块
      // 逐键差异打进日志，让「谁占了风险增量预算」可复核而不是靠注释推测（与阶段 B 的
      // `charsAttribution` 同一纪律）。登记格每次都打印（登记项是审查入口），其余格仅在
      // 出现漂移或增量违规时打印。
      if (!stable || delta.violations.length > 0 || expected.registered) {
        console.log(`    增量归因（非断言）：base 可点=${keySets.basePick.join(' | ')}`);
        console.log(`                   risk 可点=${keySets.measuredPick.join(' | ')}`);
        console.log(`                   baseAgain 可点=${keySets.againPick.join(' | ')}`);
        console.log(`                   risk∖base 可点=${keySets.newClickables.join(' | ') || '（无）'}`);
        console.log(`                   risk∖base 非风险可点=${keySets.newNonRiskClickables.join(' | ') || '（无）'}`);
        console.log(`                   baseAgain∖base 可点=${keySets.driftClickables.join(' | ') || '（无）'}`);
        console.log(`                   risk∖base 文本块=${keySets.newBlocks.join(' | ') || '（无）'}`);
        console.log(`                   baseAgain∖base 文本块=${keySets.driftBlocks.join(' | ') || '（无）'}`);
        console.log(`                   登记期望：违规=${JSON.stringify(expected.expectedViolations)} 漂移=${JSON.stringify(expected.baseWindowDrift)} 漂移键=${JSON.stringify(expected.driftKeys)}`);
      }
      console.log(`  · risk(${sub.key})@${vp}: ${fmt(measured)} → ${verdict.ok ? 'PASS' : 'FAIL'} | 增量违规 ${delta.violations.length} | 风险行可见 ${probe.ok ? 'YES' : `NO(${probe.why})`} | base 文本 ${baseText}`);
      check(`risk(${sub.key})@${vp} C1/C2 ≤ 风险档上限`, verdict.ok, verdict.message);
      check(`risk(${sub.key})@${vp} 风险行在 L0 可见且三通道齐备`, probe.ok === true, JSON.stringify(probe));
      // ── V4-4 R2：双向精确期望（登记外的任何新增/减少都 FAIL；未登记格仍要求 0 违规）──
      check(
        `risk(${sub.key})@${vp} 风险增量只被风险类元素占用（实测违规必须逐字等于登记期望${
          expected.expectedViolations.length ? `：${JSON.stringify(expected.expectedViolations)}` : ' 0'
        }）`,
        JSON.stringify(delta.violations) === JSON.stringify(expected.expectedViolations),
        `实测 ${JSON.stringify(delta.violations)} ≠ 登记 ${JSON.stringify(expected.expectedViolations)}`,
      );
      await setRisk(cdp, sub.key, 'off');
    }
  }
  // ── V4-4 R2（KL-V44-01 裁决④）：登记表**非空转**且**覆盖完整** ─────────────────
  // ① 覆盖：登记表的 `coverage` 必须与夹具矩阵（5 子场景 × 3 视口）逐项一致 —— 夹具
  //    增删一格而登记不更新即 FAIL（「新测量未登记」，与阶段 F 同一纪律；未列出的格一律
  //    适用 `defaultExpectation`，即「0 违规 ∧ 0 漂移」，与 R1 判据逐字一致）。
  // ② 非空转：每个**非默认**登记条目都必须在本次运行真实出现（登记格存在 ∧ 违规逐字命中），
  //    否则一条过期豁免会永久留在登记表里而没人发现。
  const coverage = RISK_INCREMENT_REGISTRY.coverage ?? {};
  const subsOk = JSON.stringify(coverage.subscenarios ?? []) === JSON.stringify(RISK_SUBSCENARIOS.map((s) => s.key));
  const vpsOk = JSON.stringify(coverage.viewports ?? []) === JSON.stringify([...DENSITY_VIEWPORTS]);
  check(
    'riskIncrementRegistry.coverage 与夹具矩阵逐项一致（5 风险子场景 × 3 视口；夹具增删格必须同步登记）',
    subsOk && vpsOk,
    `子场景一致=${subsOk} 视口一致=${vpsOk} | 登记 ${JSON.stringify(coverage)} vs 实测 ${JSON.stringify({
      subscenarios: RISK_SUBSCENARIOS.map((s) => s.key),
      viewports: [...DENSITY_VIEWPORTS],
    })}`,
  );
  const defaultExpectation = RISK_INCREMENT_REGISTRY.defaultExpectation ?? {
    expectedViolations: [],
    baseWindowDrift: { clickables: 0, lines: 0, blocks: 0, chars: 0 },
    driftKeys: [],
  };
  for (const [label, entry] of Object.entries(RISK_INCREMENT_REGISTRY.cells ?? {})) {
    const cell = cells.find((c) => `risk(${c.sub})@${c.vp}` === label);
    const registered = JSON.stringify(entry ?? {}) !== JSON.stringify(defaultExpectation);
    const produced = cell !== undefined && JSON.stringify(cell.delta.violations) === JSON.stringify(entry?.expectedViolations ?? []);
    check(
      `riskIncrementRegistry 登记项非空转（${label}：非默认登记 ∧ 登记格实测存在 ∧ 增量违规逐字命中）`,
      registered && produced,
      `非默认=${registered} 登记格存在=${cell !== undefined} 违规命中=${produced} 实测=${JSON.stringify(cell?.delta.violations ?? null)} 登记=${JSON.stringify(entry?.expectedViolations ?? [])}`,
    );
  }
  // V4-4 TASK-806 (FR-V3-014 等价重锚): the panel-side `#l0-pick` is retired, so
  //「未授权 / 探测中不得有可点的拾取入口」is now proven structurally (the element is
  // absent) plus the readable path (the settings-view guidance + the「页面侧零注入」
  // risk row). The intent is preserved; only the anchor moved.
  await resetFixture(cdp, { authorized: false, ask: true });
  await setRisk(cdp, 'unauthorized', 'natural');
  await sleep(200);
  const pickState = await evaluate(
    cdp,
    `(() => ({
      retired: document.getElementById('l0-pick') === null,
      guidance: document.getElementById('pick-guidance') ? document.getElementById('pick-guidance').textContent : '',
      zeroInjection: (document.getElementById('risk-rail').textContent || '').includes('页面侧零注入'),
    }))()`,
  );
  check('unauthorized 时面板侧拾取入口已退役（无假入口）', pickState.retired === true && /拾取/.test(pickState.guidance), JSON.stringify(pickState));
  check('unauthorized 时风险位明示「页面侧零注入」', pickState.zeroInjection === true, JSON.stringify(pickState));
  await setRisk(cdp, 'probing', 'force');
  await sleep(200);
  const pickProbing = await evaluate(cdp, `document.getElementById('l0-pick') === null && /拾取/.test(document.getElementById('pick-guidance').textContent)`);
  check('probing 时同样无可点拾取入口（页面侧零注入不变）', pickProbing === true, String(pickProbing));

  const worst = cells.reduce(
    (acc, cell) => ({
      clickables: Math.max(acc.clickables, cell.measured.clickables),
      lines: Math.max(acc.lines, cell.measured.lines),
      // I15: `blocks` was missing, so stage E printed `C3=undefined` for the worst row.
      blocks: Math.max(acc.blocks, cell.measured.blocks),
      regions: Math.max(acc.regions, cell.measured.regions),
      // `chars` keeps the `worst` aggregate comparable with the registry cell.
      chars: Math.max(acc.chars, cell.measured.chars),
    }),
    { clickables: 0, lines: 0, blocks: 0, regions: 0, chars: 0 },
  );
  const worstVerdict = evaluateDensity(worst, 'risk');
  check('风险档最差值 ≤ 上限（强制判定）', worstVerdict.ok, worstVerdict.message);
  console.log(`  · 风险档 15 格最差值：C1=${worst.clickables} C2=${worst.lines} C3=${worst.blocks} C4=${worst.regions}`);
  return { cells, worst };
}

// ── registry reader (single read path for stage F and RP-V3-08) ─────────────
function readBaselineRegistry() {
  return JSON.parse(readFileSync(BASELINE_JSON, 'utf8'));
}

/**
 * V4-4 R2（KL-V44-01 裁决②/④：**显式重锚**，不新增豁免类别）—— 风险增量的
 * **登记期望值**（机读，单源 = `docs/v4-density-baseline.json#riskIncrementRegistry`）。
 *
 * 为什么需要它：`staleRef` 的风险步骤**本身是产品行为**（失效引用会追加一张真实 `ref` 卡
 * 与一条 `system` 行；卡片只追加、按 FR-CHAT-050 永不移除）。当该副作用让 320px 的
 * `#stream` 越过折线时，`#scroll-bottom`（滚动提示，**非风险类**）出现，于是：
 *   ① `evaluateDelta`（AC-V3-003）把它报成「非风险类新增可点占用风险增量预算」；
 *   ② 跨风险窗口的 base 复测与 base 差一个 `#scroll-bottom`（夹具序，不是产品漂移）。
 *
 * 处置（编排器裁决，选②：显式重锚）：**不新增豁免类别、不放宽方向** ——
 *   · `#scroll-bottom` 照旧计入 C1（实测 7）并与登记格**逐格机对**（阶段 F，无豁免）；
 *   · 增量归属判据改成**双向精确期望**：本格实测违规必须**逐字等于**登记值（登记外的任何
 *     新增/减少都 FAIL），其余 14 格登记值为空数组（判据与 R1 完全一致）；
 *   · 跨窗口稳定性判据同样改成**双向精确期望**：漂移必须**逐项等于**登记值且漂移键集合
 *     逐字等于登记键（未登记者仍要求 0 漂移）；
 *   · 登记表**非空转**：每个登记条目都必须在本次运行真实出现（否则 FAIL）。
 */
const RISK_INCREMENT_REGISTRY = (() => {
  if (!existsSync(BASELINE_JSON)) return { cells: {} };
  return readBaselineRegistry().riskIncrementRegistry ?? { cells: {} };
})();

/** The registered expectation for one `risk(<sub>)@<vp>` cell (default = 空期望). */
function riskExpectationFor(sub, vp) {
  const label = `risk(${sub})@${vp}`;
  const entry = RISK_INCREMENT_REGISTRY.cells?.[label];
  const fallback = RISK_INCREMENT_REGISTRY.defaultExpectation ?? {
    expectedViolations: [],
    baseWindowDrift: { clickables: 0, lines: 0, blocks: 0, chars: 0 },
    driftKeys: [],
  };
  const effective = entry ?? fallback;
  return {
    label,
    registered: Boolean(entry),
    entry,
    expectedViolations: effective.expectedViolations ?? [],
    baseWindowDrift: effective.baseWindowDrift ?? { clickables: 0, lines: 0, blocks: 0, chars: 0 },
    driftKeys: effective.driftKeys ?? [],
  };
}

/** The per-element key sets an attribution judgement needs (pure, no assertion). */
function deltaKeySets(base, measured, baseAgain) {
  const keysOf = (m, pred) => new Set((m.elementsWithKeys ?? []).filter(pred).map((e) => `${e.key}${e.risk ? ' [risk]' : ''}`));
  const pick = (m) => keysOf(m, (e) => e.clickable);
  const block = (m) => keysOf(m, (e) => e.block);
  const diff = (a, b) => [...a].filter((k) => !b.has(k)).sort();
  const basePick = pick(base);
  const baseBlock = block(base);
  const measuredPick = pick(measured);
  const measuredBlock = block(measured);
  const againPick = pick(baseAgain);
  const againBlock = block(baseAgain);
  const newPick = diff(measuredPick, basePick);
  return {
    newClickables: newPick,
    newNonRiskClickables: newPick.filter((k) => !k.endsWith(' [risk]')),
    newBlocks: diff(measuredBlock, baseBlock),
    newNonRiskBlocks: diff(measuredBlock, baseBlock).filter((k) => !k.endsWith(' [risk]')),
    driftClickables: diff(againPick, basePick),
    driftBlocks: diff(againBlock, baseBlock),
    basePick: [...basePick],
    measuredPick: [...measuredPick],
    againPick: [...againPick],
  };
}

/**
 * ── stage F: registry machine comparison (ADR-V3-018 决策 2 / review I8) ─────
 */
async function stageF(cdp, rows, cells, worst, extraRows = []) {
  console.log('\n▶ 阶段 F：基线机器比对（实测 vs docs/v4-density-baseline.json）');
  check('F 基线文件存在（父 ADR-V4-010 的登记载体）', existsSync(BASELINE_JSON), BASELINE_JSON);
  if (!existsSync(BASELINE_JSON)) return { diffs: ['基线文件缺失'] };
  const baseline = readBaselineRegistry();
  const diffs = [];
  for (const row of rows) {
    if (row.tier === 'risk') continue;
    diffs.push(...compareBaselineCells(row.measured, baseline.tiers?.[row.tier]?.[String(row.vp)], () => `${row.tier}@${row.vp}`));
  }
  // V4-1：两组新增独立登记格（empty / riskDetailOpen）同样逐格机对（漂移即 FAIL）。
  for (const row of extraRows) {
    diffs.push(...compareBaselineCells(row.measured, baseline.tiers?.[row.tier]?.[String(row.vp)], () => `${row.tier}@${row.vp}`));
  }
  for (const cell of cells) {
    diffs.push(...compareBaselineCells(cell.measured, baseline.tiers?.risk?.subs?.[cell.sub]?.[String(cell.vp)], () => `risk(${cell.sub})@${cell.vp}`));
  }
  diffs.push(...compareBaselineCells(worst, baseline.tiers?.risk?.worst, () => 'risk.worst'));
  if (diffs.length > 0) {
    console.log('    漂移明细（可读差异）：');
    for (const line of diffs) console.log(`      · ${line}`);
  }
  // F5 (closeout round): the compared-cell count is COMPUTED, never transcribed.
  // It used to be the hard-coded "24" in the log line below, which double-counted
  // the 3 risk viewport cells that only ever exist as members of the 15-cell
  // sub-scenario set (9 mandatory + 15 risk + 1 worst ≠ the 22 cells actually
  // compared: 6 non-risk rows + 15 risk sub-cells + 1 worst).
  const comparedCells = rows.filter((r) => r.tier !== 'risk').length + extraRows.length + cells.length + 1;
  check(
    `F ${comparedCells} 个登记格实测 == 基线登记值（漂移即 FAIL）`,
    diffs.length === 0,
    diffs.slice(0, 8).join(' | '),
  );
  check(
    'F 阈值同源（机读基线 == 单源常量 DENSITY_LIMITS）',
    JSON.stringify(baseline.thresholds) === JSON.stringify(DENSITY_LIMITS),
    `${JSON.stringify(baseline.thresholds)} vs ${JSON.stringify(DENSITY_LIMITS)}`,
  );
  check(
    'F 几何下界同源（机读基线 == LOG_CLIENT_HEIGHT_FLOOR）',
    baseline.logClientHeightFloor === LOG_CLIENT_HEIGHT_FLOOR,
    `${baseline.logClientHeightFloor} vs ${LOG_CLIENT_HEIGHT_FLOOR}`,
  );
  // The geometry FLOOR's source figure must also be a real measurement: re-measure
  // the worst case (default tier, 400×900, pending decision card) on this build.
  await setViewport(cdp, 400, VIEWPORT_HEIGHT);
  await resetFixture(cdp);
  const logClientHeight = await evaluate(cdp, `document.getElementById('stream').clientHeight`);
  check(
    'F 几何下界来源实测 == 登记来源值（I7：来源 498→495 的机器比对）',
    logClientHeight === baseline.logClientHeightMeasuredWorst,
    `实测 ${logClientHeight}px ≠ 登记 ${baseline.logClientHeightMeasuredWorst}px`,
  );
  check(
    `F 几何下界成立（实测 ${logClientHeight}px ≥ 登记 ${baseline.logClientHeightFloor}px）`,
    logClientHeight >= baseline.logClientHeightFloor,
    `实测 ${logClientHeight}px < 登记下界 ${baseline.logClientHeightFloor}px`,
  );
  // Artifact bytes vs the volume registry (review I6: 登记值 == 实测产物).
  const artifactBytes = statSync(resolve(PACKAGE_ROOT, 'dist/sidepanel.js')).size;
  check(
    'F 产物字节 == 体积登记值（登记值必须等于实测产物）',
    artifactBytes === baseline.volume?.registeredBaselineBytes,
    `实测 ${artifactBytes}B ≠ 登记 ${baseline.volume?.registeredBaselineBytes}B`,
  );
  // F9 (closeout round): the check name must say what the assertion actually
  // proves — "artifact ≤ the machine-read ceiling", NOT "the ceiling was not
  // raised". The only proof of "not raised" is V31-S12 in
  // `test/size-budget.test.ts` (`SIDEPANEL_CEILING <= previousCeilingBytes` plus the
  // tighten-only `SIDEPANEL_CEILING_CAP`, asserted in that file's
  // 「ceiling is min(baseline × 1.05, cap) — 只降不升（I6）」 test); this stage only
  // cross-checks the artifact against the registered ceiling.
  //
  // ── V3-2 fix round (2026-09-16, orchestrator ruling V3-VOL-1 ②) ───────────
  // The tighten-only `SIDEPANEL_CEILING_CAP` referenced above has been
  // **REVOKED**: it was not a spec/author requirement but a self-imposed device
  // that ended up blocking the spec-mandated L1 feature. The ceiling is once
  // again the plain formula `floor(baseline × 1.05)` (tolerance 5% unchanged),
  // and "只降不升" is replaced by **four replacement guards**, asserted in
  // `test/size-budget.test.ts` + `test/size-growth-evidence.test.ts`:
  //   ① formula ceiling; ② explicit per-round re-registration registry;
  //   ③ per-module growth-justification evidence; ④ >15% over two consecutive
  //   feature rounds ⇒ mandatory reportable alert.
  // The claim proven *here* is unchanged and unchanged-able: the shipped
  // artifact ≤ the machine-read ceiling, with 登记值 == 实测产物 checked above.
  check(
    'F 产物字节 ≤ 机读体积上限（「未抬高」的唯一证明在 test/size-budget.test.ts#V31-S12）',
    artifactBytes <= baseline.volume?.ceilingBytes,
    `实测 ${artifactBytes}B > 上限 ${baseline.volume?.ceilingBytes}B`,
  );
  console.log(
    `  · 基线比对：${comparedCells} 格 + 几何下界（来源 ${baseline.logClientHeightMeasuredWorst}px / 下界 ${baseline.logClientHeightFloor}px）+ 产物 ${artifactBytes}B / 上限 ${baseline.volume?.ceilingBytes}B`,
  );
  return { diffs, artifactBytes, logClientHeight, comparedCells };
}

// ── stage D/E ───────────────────────────────────────────────────────────────
function stageD() {
  console.log('\n▶ 阶段 D：反作弊（注入表达式零命中禁用 API）');
  const leak = bannedApisInMeasureSource();
  check('测量源码零命中 getComputedStyle / offsetParent / getBoundingClientRect / aria-hidden', leak.length === 0, leak.join(', '));
}

function stageE(summary) {
  console.log('\n▶ 阶段 E：汇总表（档位 | 视口 | 口径 | 实测 | 上限）');
  console.log('  档位      视口  C1 实测/上限   C2 实测/上限   C3 块  C4 区  判定');
  for (const row of summary) {
    console.log(
      `  ${row.tier.padEnd(9)} ${String(row.vp).padEnd(5)} ${String(row.measured.clickables).padStart(3)}/${row.verdict.limits.clickables}        ${String(row.measured.lines).padStart(3)}/${row.verdict.limits.lines}        ${String(row.measured.blocks).padStart(4)}  ${String(row.measured.regions).padStart(4)}   ${row.verdict.ok ? 'PASS' : 'FAIL'}`,
    );
  }
  console.log(`\n  设计稿口径（仅登记，不作为验收依据）：E=${JSON.stringify(DRAFT_PUBLISHED.e)} D=${JSON.stringify(DRAFT_PUBLISHED.d)}`);
  for (const d of draftDeltas) {
    console.log(`  稿件 ${d.draft.toUpperCase()} 实测 ${JSON.stringify(d.measured)} vs 公布值 落差 ${JSON.stringify(d.delta)}`);
  }
}

// ── reverse counter-proofs (TASK-111) ───────────────────────────────────────
async function reverseRp01(cdp) {
  console.log('\n▶ RP-V3-01：注入额外可点元素越界 → 必须 FAIL → 还原 → 必须 PASS');
  await resetFixture(cdp);
  await setViewport(cdp, 400, VIEWPORT_HEIGHT);
  const before = await measure(cdp);
  // V4-1 等价重锚（台账 redlineRemap 第 1 条）：v3 的「默认档恰 7 可点」被三区骨架
  // 取代为「工具栏准入恰 5」（4 入口 + 主题，ADR-V4-018）。注入量随之从 1 个改为 3 个
  // —— 因为 5 + 1 = 6 仍在 7 的默认上限之内，注入 1 个已不再越界（这正是「恰 7」被
  // 取代的直接后果）。判据、FAIL 诊断文本（「C1 8 > 7」）与还原/PASS 两段逐字不变。
  check('RP-V3-01 前置：默认档恰为工具栏准入值 5 可点（否则注入 3 个不会越界）', before.clickables === 5, `实测 ${before.clickables}`);
  await evaluate(cdp, `(() => { for (const id of ['rp01a','rp01b','rp01c']) { const b = document.createElement('button'); b.id = id; b.textContent = id; document.body.appendChild(b); } return true; })()`);
  await sleep(150);
  const injected = await measure(cdp);
  const verdict = evaluateDensity(injected, 'default');
  check('RP-V3-01 (FAIL 段) 注入后密度门禁必须 FAIL', verdict.ok === false, `ok=${verdict.ok} ${verdict.message}`);
  check('RP-V3-01 FAIL 段诊断含「C1 8 > 7」', verdict.exceeds.includes('C1 可点元素 8 > 7'), verdict.exceeds.join(' / '));
  await evaluate(cdp, `(() => { for (const id of ['rp01a','rp01b','rp01c']) document.getElementById(id)?.remove(); return true; })()`);
  await sleep(150);
  const restored = await measure(cdp);
  const verdict2 = evaluateDensity(restored, 'default');
  check('RP-V3-01 (还原后 PASS 段) 还原后必须 PASS', verdict2.ok === true, `ok=${verdict2.ok} ${verdict2.message}`);
}

async function reverseRp02(cdp, base) {
  console.log('\n▶ RP-V3-02：阈值 -1（默认档 7→6）→ 必须 FAIL');
  const pure = evaluateDensity({ clickables: 7 }, 'default', { clickables: 6, lines: 15 });
  check('RP-V3-02(a) 纯函数层：上限 6 时 7 可点必须 FAIL', pure.ok === false, pure.message);
  const original = resolve(PACKAGE_ROOT, 'test/ui/density-metrics.mjs');
  const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
  const shaBefore = sha(original);
  const copy = resolve('/tmp', `density-metrics-rp02-${Date.now()}.mjs`);
  try {
    const source = readFileSync(original, 'utf8');
    const patched = source.replace('default: Object.freeze({ clickables: 7, lines: 15 })', 'default: Object.freeze({ clickables: 6, lines: 15 })');
    if (patched === source) throw new Error('RP-V3-02(b) 未能定位默认档阈值常量');
    writeFileSync(copy, patched, 'utf8');
    const { evaluateDensity: evaluatePatched } = await import(`file://${copy}?t=${Date.now()}`);
    await resetFixture(cdp);
    await setViewport(cdp, 400, VIEWPORT_HEIGHT);
    const measured = await measure(cdp);
    const verdict = evaluatePatched(measured, 'default');
    check('RP-V3-02(b) 副本阈值 6 驱动同一测量必须 FAIL', verdict.ok === false, `ok=${verdict.ok} ${verdict.message}`);
    // and the copy-driven judgement must flip back with the real threshold
    const real = evaluateDensity(measured, 'default');
    check('RP-V3-02(b) 原阈值 7 驱动同一测量必须 PASS（证明翻转来自阈值本身）', real.ok === true, real.message);
  } finally {
    if (existsSync(copy)) unlinkSync(copy);
    check('RP-V3-02 反证后原文件 sha256 未变', sha(original) === shaBefore, `${shaBefore} → ${sha(original)}`);
  }
}

async function reverseRp03(cdp) {
  console.log('\n▶ RP-V3-03：CSS 隐身不算豁免 → 计数不得下降；hidden=true 才下降 1');
  await resetFixture(cdp);
  await setViewport(cdp, 400, VIEWPORT_HEIGHT);
  // V4-1 等价重锚：v3 的靶子是 `#l0-ref-toggle`（当时挂在 L0 决策卡、计入 C1）；v4 把
  // 决策卡同构迁入 `#stream`（**豁免子树**）后该元素已不在 C1 口径内 ⇒ 靶子换成三区
  // 骨架内、口径内、且唯一的主题控件 `#theme-toggle`（工具栏准入 5 之一）。判据
  // （CSS 隐身不豁免 / `hidden` 是唯一豁免通道）与三段还原语义逐字不变。
  const target = '#theme-toggle';
  const setStyle = (style) =>
    evaluate(
      cdp,
      `(() => { const el = document.querySelector(${JSON.stringify(target)}); Object.assign(el.style, ${JSON.stringify(style)}); return true; })()`,
    );
  const clear = () => evaluate(cdp, `(() => { const el = document.querySelector(${JSON.stringify(target)}); el.style.cssText = ''; el.hidden = false; return true; })()`);
  const baseline = await evaluate(cdp, c1Probe);
  // V4-1 等价重锚：`c1Probe` 仍是**未排除 #stream** 的口径（反证靶面 = 口径本身），
  // 故基线不再等于「工具栏准入 5」；判据（不下降 / hidden 降 1 / 还原回位）逐字不变。
  check('RP-V3-03 前置：未排除口径的 C1 基线 > 0（判据未空转）', baseline > 0, `实测 ${baseline}`);
  for (const style of [{ display: 'none' }, { visibility: 'hidden' }, { opacity: '0' }, { pointerEvents: 'none' }]) {
    await setStyle(style);
    await sleep(120);
    const after = await evaluate(cdp, c1Probe);
    check(`RP-V3-03 CSS 隐身 ${JSON.stringify(style)} 后 C1 不下降`, after === baseline, `${baseline} → ${after}`);
  }
  await clear();
  await sleep(120);
  const cleaned = await evaluate(cdp, c1Probe);
  check('RP-V3-03 清除 CSS 隐身并还原后 C1 回到工具栏准入值', cleaned === baseline, `实测 ${cleaned}`);
  await evaluate(cdp, `(() => { document.querySelector(${JSON.stringify(target)}).hidden = true; return true; })()`);
  await sleep(120);
  const dropped = await evaluate(cdp, c1Probe);
  check('RP-V3-03 hidden=true 是唯一豁免通道 → C1 必须下降 1', dropped === baseline - 1, `${baseline} → ${dropped}`);
  await evaluate(cdp, `(() => { document.querySelector(${JSON.stringify(target)}).hidden = false; return true; })()`);
  await sleep(120);
  const restored = await evaluate(cdp, c1Probe);
  check('RP-V3-03 还原后 C1 回到工具栏准入值', restored === baseline, `实测 ${restored}`);
}

async function reverseRp04(cdp) {
  console.log('\n▶ RP-V3-04：把风险行移入 L1(hidden) → AC-V3-008/009 断言必须 FAIL → 还原 → PASS');
  await resetFixture(cdp);
  await setRisk(cdp, 'hardline', 'force');
  await setViewport(cdp, 400, VIEWPORT_HEIGHT);
  const before = await evaluate(cdp, riskVisibleExpr('hardline'));
  check('RP-V3-04 前置：风险行在 L0 可见（基线 PASS）', before.ok === true, JSON.stringify(before));
  await evaluate(
    cdp,
    `(() => {
      const row = document.querySelector('#risk-rail .risk-row[data-risk-class="hardline"]');
      const holder = document.createElement('div');
      holder.id = 'rp04-holder';
      holder.setAttribute('data-l1-panel', 'rp04');
      holder.hidden = true;
      document.body.appendChild(holder);
      holder.appendChild(row);
      return true;
    })()`,
  );
  await sleep(150);
  const displaced = await evaluate(cdp, riskVisibleExpr('hardline'));
  check('RP-V3-04 (FAIL 段) 风险行被移入折叠容器后 AC-V3-008/009 必须 FAIL', displaced.ok === false, JSON.stringify(displaced));
  await evaluate(
    cdp,
    `(() => {
      const holder = document.getElementById('rp04-holder');
      const rail = document.getElementById('risk-rail');
      while (holder.firstChild) rail.appendChild(holder.firstChild);
      holder.remove();
      return true;
    })()`,
  );
  await sleep(150);
  const restored = await evaluate(cdp, riskVisibleExpr('hardline'));
  check('RP-V3-04 (还原后 PASS 段) 还原后必须 PASS', restored.ok === true, JSON.stringify(restored));
  await setRisk(cdp, 'hardline', 'off');
}

/**
 * RP-V3-09 (closeout round, validate R1 **F7**) — the risk-visibility probe must
 * catch **CSS concealment** of an ancestor.
 *
 * `visibility:hidden` and `opacity:0` do not change `getBoundingClientRect()`, so
 * the pre-fix probe (hidden-ancestor + foldable-ancestor + non-zero box) reported
 * `ok: true` for a risk rail that was visually gone — while C1 explicitly refuses to
 * exempt those very properties. The perturbation is applied to the REAL ancestor
 * (`#risk-rail`, i.e. the row's parent chain — not the row itself), on the same
 * expression the gate uses, and the old criteria are asserted to still hold so the
 * proof shows the new clause is the only thing that can catch it.
 */
async function reverseRp09(cdp) {
  console.log('\n▶ RP-V3-09：风险位 CSS 隐身（visibility:hidden / opacity:0）→ 探针必须 FAIL → 还原 → PASS');
  await setViewport(cdp, 400, VIEWPORT_HEIGHT);
  await resetFixture(cdp);
  await assertFixtureSettled(cdp, 'RP-V3-09');
  await setRisk(cdp, 'hardline', 'force');
  await sleep(200);
  const before = await evaluate(cdp, riskVisibleExpr('hardline'));
  check('RP-V3-09 前置：风险行可见（基线 PASS）', before.ok === true, JSON.stringify(before));

  /** The pre-fix criteria, asserted independently: they must ALL still hold under CSS concealment. */
  const legacyProbe = `(() => {
    const row = document.querySelector('#risk-rail .risk-row[data-risk-class="hardline"]');
    if (!row) return { ok: false };
    let chain = []; let node = row;
    while (node) { chain.push(node); node = node.parentElement; }
    const hiddenAncestor = chain.some((n) => n.hidden === true);
    const folded = chain.some((n) => n.hasAttribute && (n.hasAttribute('data-l1-panel') || n.hasAttribute('data-l2-view') || n.hasAttribute('data-disclose-panel')));
    const rect = row.getBoundingClientRect();
    return { ok: !hiddenAncestor && !folded && rect.height > 0 };
  })()`;

  const cases = [
    { prop: 'visibility', value: 'hidden' },
    { prop: 'opacity', value: '0' },
  ];
  for (const c of cases) {
    await evaluate(cdp, `(() => { document.getElementById('risk-rail').style.${c.prop} = ${JSON.stringify(c.value)}; return true; })()`);
    await sleep(150);
    const concealed = await evaluate(cdp, riskVisibleExpr('hardline'));
    check(
      `RP-V3-09 (FAIL 段) 祖先 ${c.prop}:${c.value} 必须被判为不可见`,
      concealed.ok === false && /CSS 隐身/.test(String(concealed.why)),
      JSON.stringify(concealed),
    );
    const legacy = await evaluate(cdp, legacyProbe);
    check(
      `RP-V3-09 对照：旧判据（hidden / 折叠容器 / rect 高度）在 ${c.prop}:${c.value} 下仍判「通过」——新判据是唯一拦截点`,
      legacy.ok === true,
      JSON.stringify(legacy),
    );
    await evaluate(cdp, `(() => { document.getElementById('risk-rail').style.${c.prop} = ''; return true; })()`);
    await sleep(150);
    const restored = await evaluate(cdp, riskVisibleExpr('hardline'));
    check(`RP-V3-09 (还原后 PASS 段) 还原 ${c.prop} 后必须 PASS`, restored.ok === true, JSON.stringify(restored));
  }
  await setRisk(cdp, 'hardline', 'off');
}

/**
 * RP-V3-08 (review I8) — **the registry comparison must be able to fail**.
 *
 * The perturbation is applied to the REAL registry file that stage F reads
 * (`docs/v4-density-baseline.json`；v4-1 起 stage F 的 `BASELINE_JSON` 已切到 v4，
 * review 修复轮 I13② 订正本注释原写的 v3 文件名）and the judgement goes through the SAME
 * `compareBaselineCells()` + the same `readBaselineRegistry()`, so this is not a
 * copy-driven proof. The file is restored byte-for-byte and the sha256 is
 * re-checked, so a failed restore cannot go unnoticed.
 */
async function reverseRp08(cdp) {
  console.log('\n▶ RP-V3-08：篡改基线登记值 → 基线比对必须 FAIL → 还原 → 必须 PASS');
  const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
  check('RP-V3-08 前置：基线文件存在', existsSync(BASELINE_JSON), BASELINE_JSON);
  if (!existsSync(BASELINE_JSON)) return;
  const originalBytes = readFileSync(BASELINE_JSON);
  const shaBefore = sha(BASELINE_JSON);
  await setViewport(cdp, 400, VIEWPORT_HEIGHT);
  // The default@400 registry cell is measured on a *settled* fixture: from the
  // second fixture cycle on, the product shows a transient `#notice` toast
  // (29 own-text chars / +1 block / +1 line) that the very first cycle does not.
  // That asymmetry is REGISTERED in the baseline (`fixtureAsymmetry`) instead of
  // being smoothed away — and this driver must replicate the same steady state,
  // otherwise it would compare against a different cell.
  await resetFixture(cdp);
  await resetFixture(cdp);
  const measured = await measure(cdp);
  // Diagnostic (never an assertion): the RP-08 comparison only makes sense on the
  // same fixture cell stage B measured, so the width + the structural fingerprint
  // are printed alongside the result.
  const measuredFp = JSON.parse(await fingerprint(cdp));
  console.log(
    `  · RP-V3-08 诊断：innerWidth=${await evaluate(cdp, `window.innerWidth`)} ${fmt(measured)} | 指纹 askHidden=${measuredFp.askHidden} moreHidden=${measuredFp.moreHidden} origin=${JSON.stringify(measuredFp.origin)}`,
  );
  const before = compareBaselineCells(measured, readBaselineRegistry().tiers?.default?.['400'], () => 'default@400');
  check('RP-V3-08 前置：未篡改时实测与登记一致（PASS 段基线）', before.length === 0, before.join(' | '));
  let failDiffs = [];
  try {
    const tampered = readBaselineRegistry();
    tampered.tiers.default['400'].clickables = measured.clickables + 1;
    writeFileSync(BASELINE_JSON, `${JSON.stringify(tampered, null, 2)}\n`, 'utf8');
    failDiffs = compareBaselineCells(measured, readBaselineRegistry().tiers?.default?.['400'], () => 'default@400');
  } finally {
    writeFileSync(BASELINE_JSON, originalBytes);
  }
  check('RP-V3-08 (FAIL 段) 基线被篡改后比对必须 FAIL', failDiffs.length > 0, failDiffs.join(' | '));
  check(
    'RP-V3-08 FAIL 段诊断可读（含「实测 X ≠ 登记 Y」）',
    failDiffs.some((d) => /default@400\.clickables: 实测 \d+ ≠ 登记 \d+/.test(d)),
    failDiffs.join(' | '),
  );
  const restored = compareBaselineCells(measured, readBaselineRegistry().tiers?.default?.['400'], () => 'default@400');
  check('RP-V3-08 (还原后 PASS 段) 还原基线后比对必须 PASS', restored.length === 0, restored.join(' | '));
  check('RP-V3-08 还原后基线文件 sha256 复原', sha(BASELINE_JSON) === shaBefore, `${shaBefore} → ${sha(BASELINE_JSON)}`);
}

// ── V4-1 in-gate counter-proofs（TASK-511 / ADR-V4-020 第 3 条 / ADR-V4-023 第 5 条）──
/**
 * RP-V4-01~07 — the v4 anti-abuse counter-proofs, driven **inside this gate** (in-gate
 * form, registered in `test/gate-integrity.test.ts#REVERSE_PROOF_EXCEPTIONS`).
 *
 * Every driver asserts BOTH halves —「注入后必须 FAIL」and「还原后必须 PASS」— and the
 * FAIL half carries a literal diagnostic assertion, so a driver that cannot go red for
 * the right reason is not a counter-proof (NFR-V3-013 / NFR-CHAT-007).
 *
 * File-level perturbations (RP-V4-05) restore byte-for-byte and re-verify sha256.
 * DOM-level perturbations remove the injected node and re-measure.
 */
const SIZE_BASELINE_TS = resolve(PACKAGE_ROOT, 'test/size-baseline.ts');

/** Read a numeric constant from `size-baseline.ts` (single source, no second literal). */
function readSizeConstant(name) {
  const src = readFileSync(SIZE_BASELINE_TS, 'utf8');
  const m = new RegExp(`export const ${name}\\s*(?::[^=]*)?=\\s*([0-9_]+)\\s*;`).exec(src);
  if (!m) throw new Error(`size-baseline.ts 缺少常量 ${name}`);
  return Number(m[1].replace(/_/g, ''));
}

const sha256File = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

/** RP-V4-01（FR-CHAT-072）：单卡第 7 个可点 ⇒ 单卡预算必须 FAIL；移除后 PASS。 */
async function reverseRpV401(cdp) {
  console.log('\n▶ RP-V4-01：卡内注入第 7 个可点元素 → 单卡预算必须 FAIL → 还原 → 必须 PASS');
  await setViewport(cdp, 400, VIEWPORT_HEIGHT);
  await resetFixture(cdp, { authorized: true, ask: false });
  await sleep(200);
  const before = await judgeCards(cdp, 'empty');
  check('RP-V4-01 前置：基线单卡可点 ≤ 上限（判据未恒真）', before.cardBudget.ok === true, `${before.cardBudget.violations.join(' / ')} | ${before.raw}`);
  // 原子化（见 atomicCardsProbe）：注入 → 读卡集 → 还原 在同一个同步块内完成，
  // 任何一次 `render()` 重绘都无法与之间插（否则「注入后仍能量到」只是竞态巧合）。
  const injectedRaw = await evaluate(
    cdp,
    atomicCardsProbe(
      `const stream = document.getElementById('stream');
       const card = document.createElement('li');
       card.id = 'rp401-card';
       card.setAttribute('data-msg-type', 'nextstep');
       for (let i = 0; i < 7; i += 1) { const b = document.createElement('button'); b.textContent = 'opt' + i; card.appendChild(b); }
       stream.appendChild(card);`,
      `document.getElementById('rp401-card')?.remove();`,
    ),
  );
  const injectedBudget = evaluateCardBudget(JSON.parse(injectedRaw));
  check('RP-V4-01 (FAIL 段) 卡内第 7 个可点必须被单卡预算判 FAIL', injectedBudget.ok === false, `${injectedBudget.violations.join(' / ')} | ${injectedRaw}`);
  check('RP-V4-01 FAIL 段诊断含「卡内可点 7 > 6」', injectedBudget.violations.some((v) => /卡内可点 7 > 6/.test(v)), injectedBudget.violations.join(' / '));
  const restored = await judgeCards(cdp, 'empty');
  check('RP-V4-01 (还原后 PASS 段) 移除注入卡后单卡预算必须 PASS', restored.cardBudget.ok === true, `${restored.cardBudget.violations.join(' / ')} | ${restored.raw}`);
}

/** RP-V4-02（FR-CHAT-073）：空态首屏第 3 张卡 ⇒ 首屏预算必须 FAIL；移除后 PASS。 */
async function reverseRpV402(cdp) {
  console.log('\n▶ RP-V4-02：空态首屏注入到 3 张卡 → 首屏预算必须 FAIL → 还原 → 必须 PASS');
  await setViewport(cdp, 400, VIEWPORT_HEIGHT);
  await resetFixture(cdp, { authorized: true, ask: false });
  await sleep(200);
  const before = await judgeCards(cdp, 'empty');
  check('RP-V4-02 前置：空态首屏卡 ≤2（判据未恒真）', before.firstScreen.ok === true, `${before.firstScreen.violations.join(' / ')} | ${before.raw}`);
  const injectedRaw = await evaluate(
    cdp,
    atomicCardsProbe(
      `const stream = document.getElementById('stream');
       for (const id of ['rp402-a', 'rp402-b']) {
         const card = document.createElement('li');
         card.id = id;
         card.setAttribute('data-msg-type', 'system');
         card.textContent = id;
         stream.appendChild(card);
       }`,
      `for (const id of ['rp402-a','rp402-b']) document.getElementById(id)?.remove();`,
    ),
  );
  const injectedFirstScreen = evaluateFirstScreen(JSON.parse(injectedRaw), 'empty');
  check('RP-V4-02 (FAIL 段) 首屏第 3 张卡必须被首屏预算判 FAIL', injectedFirstScreen.ok === false, `${injectedFirstScreen.violations.join(' / ')} | ${injectedRaw}`);
  check('RP-V4-02 FAIL 段诊断含「首屏可见卡 3 > 2」', injectedFirstScreen.violations.some((v) => /首屏可见卡 3 > 2/.test(v)), injectedFirstScreen.violations.join(' / '));
  const restored = await judgeCards(cdp, 'empty');
  check('RP-V4-02 (还原后 PASS 段) 移除注入卡后首屏预算必须 PASS', restored.firstScreen.ok === true, `${restored.firstScreen.violations.join(' / ')} | ${restored.raw}`);
}

/** RP-V4-03（ADR-V4-007 第 4 条）：第 2 张欢迎卡 或 欢迎文本 >8 行 ⇒ 必须 FAIL；还原后 PASS。 */
async function reverseRpV403(cdp) {
  console.log('\n▶ RP-V4-03：注入第 2 张欢迎卡 / 欢迎文本 >8 行 → 必须 FAIL → 还原 → 必须 PASS');
  await setViewport(cdp, 400, VIEWPORT_HEIGHT);
  await resetFixture(cdp, { authorized: true, ask: false });
  await sleep(200);
  const before = await judgeCards(cdp, 'empty');
  check('RP-V4-03 前置：空态欢迎卡恰 1 张且 ≤8 行（判据未恒真）', before.firstScreen.ok === true && before.firstScreen.welcomeCards === 1, `${before.firstScreen.violations.join(' / ')} | ${before.raw}`);

  const twoRaw = await evaluate(
    cdp,
    atomicCardsProbe(
      `const stream = document.getElementById('stream');
       const extra = document.createElement('p');
       extra.id = 'rp403-welcome';
       extra.className = 'log-empty-text';
       extra.textContent = '第二张欢迎卡';
       stream.appendChild(extra);`,
      `document.getElementById('rp403-welcome')?.remove();`,
    ),
  );
  const twoWelcome = evaluateFirstScreen(JSON.parse(twoRaw), 'empty');
  check('RP-V4-03 (FAIL 段 a) 第 2 张欢迎卡必须被判 FAIL', twoWelcome.ok === false, `${twoWelcome.violations.join(' / ')} | ${twoRaw}`);
  check('RP-V4-03 FAIL 段 a 诊断含「欢迎卡 2 > 1」', twoWelcome.violations.some((v) => /欢迎卡 2 > 1/.test(v)), twoWelcome.violations.join(' / '));
  const backToOne = await judgeCards(cdp, 'empty');
  check('RP-V4-03 (还原后 PASS 段 a) 移除第 2 张欢迎卡后必须 PASS', backToOne.firstScreen.ok === true, `${backToOne.firstScreen.violations.join(' / ')} | ${backToOne.raw}`);

  const longRaw = await evaluate(
    cdp,
    atomicCardsProbe(
      `const wp = document.querySelector('#stream .log-empty-text');
       if (wp) wp.textContent = 'x'.repeat(300);`,
      `const wr = document.querySelector('#stream .log-empty-text');
       if (wr) wr.textContent = ${JSON.stringify('还没有对话。先在上方配置模型，然后打开目标站点并授权。')};`,
    ),
  );
  const longWelcome = evaluateFirstScreen(JSON.parse(longRaw), 'empty');
  check('RP-V4-03 (FAIL 段 b) 欢迎文本 >8 行必须被判 FAIL', longWelcome.ok === false, `${longWelcome.violations.join(' / ')} | ${longRaw}`);
  check('RP-V4-03 FAIL 段 b 诊断含「文本行 9 > 8」', longWelcome.violations.some((v) => /文本行 9 > 8/.test(v)), longWelcome.violations.join(' / '));
  const restored = await judgeCards(cdp, 'empty');
  check('RP-V4-03 (还原后 PASS 段 b) 还原欢迎文本后必须 PASS', restored.firstScreen.ok === true, `${restored.firstScreen.violations.join(' / ')} | ${restored.raw}`);
}

/** RP-V4-04（FR-CHAT-071）：CSS 隐身不豁免（C1 不降）；`hidden` 是唯一豁免通道（降 1）。 */
async function reverseRpV404(cdp) {
  console.log('\n▶ RP-V4-04：CSS 隐身不降 C1；`hidden` 必须降 1 → 还原 → 必须复原');
  await resetFixture(cdp);
  await setViewport(cdp, 400, VIEWPORT_HEIGHT);
  const target = '#theme-toggle';
  const setStyle = (style) =>
    evaluate(cdp, `(() => { const el = document.querySelector(${JSON.stringify(target)}); Object.assign(el.style, ${JSON.stringify(style)}); return true; })()`);
  const baseline = await evaluate(cdp, c1Probe);
  // 口径说明：`c1Probe` 是**未排除 #stream** 的口径（与 ADR-V4-020 §3 的反证靶面一致 ——
  // 「CSS 隐身不豁免」要判的正是「整页可见元素计数」这条口径本身），故基线不是 5（5 是
  // 排除 #stream 后的密度口径）。这里只断言基线非空，真正的判据是「不下降 / hidden 降 1」。
  check('RP-V4-04 前置：未排除口径的 C1 基线 > 0（判据未空转）', baseline > 0, `实测 ${baseline}`);
  for (const style of [{ display: 'none' }, { visibility: 'hidden' }, { opacity: '0' }, { pointerEvents: 'none' }]) {
    await setStyle(style);
    await sleep(120);
    const after = await evaluate(cdp, c1Probe);
    check(`RP-V4-04 CSS 隐身 ${JSON.stringify(style)} 后 C1 不下降（豁免只认 hidden）`, after === baseline, `${baseline} → ${after}`);
  }
  await evaluate(cdp, `(() => { const el = document.querySelector(${JSON.stringify(target)}); el.style.cssText = ''; return true; })()`);
  await sleep(120);
  const cleaned = await evaluate(cdp, c1Probe);
  check('RP-V4-04 清除 CSS 隐身并还原后 C1 回到基线', cleaned === baseline, `实测 ${cleaned}`);
  await evaluate(cdp, `(() => { document.querySelector(${JSON.stringify(target)}).hidden = true; return true; })()`);
  await sleep(120);
  const dropped = await evaluate(cdp, c1Probe);
  check('RP-V4-04 hidden=true 是唯一豁免通道 → C1 必须下降 1', dropped === baseline - 1, `${baseline} → ${dropped}`);
  await evaluate(cdp, `(() => { document.querySelector(${JSON.stringify(target)}).hidden = false; return true; })()`);
  await sleep(120);
  const restored = await evaluate(cdp, c1Probe);
  check('RP-V4-04 (还原后 PASS 段) 还原后 C1 必须回到基线', restored === baseline, `实测 ${restored}`);
}

/** RP-V4-05（ADR-V4-010 不动面）：`dist/pick-layer.js` +1 B ⇒ 无容差上限必须 FAIL；逐字节还原。 */
async function reverseRpV405(cdp) {
  console.log('\n▶ RP-V4-05：dist/pick-layer.js +1 B → 无容差上限判据必须 FAIL → 还原 → sha256 复核');
  const pickPath = resolve(PACKAGE_ROOT, 'dist/pick-layer.js');
  const registered = readSizeConstant('PICK_LAYER_BASELINE_BYTES');
  const src = readFileSync(SIZE_BASELINE_TS, 'utf8');
  check('RP-V4-05 前置：无容差上限与登记值同源（PICK_LAYER_CEILING = PICK_LAYER_BASELINE_BYTES）', /export const PICK_LAYER_CEILING = PICK_LAYER_BASELINE_BYTES;/.test(src), `登记值 ${registered}`);
  check('RP-V4-05 前置：dist/pick-layer.js 存在', existsSync(pickPath), pickPath);
  const original = readFileSync(pickPath);
  const shaBefore = sha256File(pickPath);
  const before = statSync(pickPath).size;
  check('RP-V4-05 前置：实测字节 == 登记值（无容差）', before === registered, `${before} vs ${registered}`);
  let failExcess = -1;
  try {
    writeFileSync(pickPath, Buffer.concat([original, Buffer.from(' ')]));
    const after = statSync(pickPath).size;
    failExcess = after - registered;
    check('RP-V4-05 (FAIL 段) +1 B 后无容差上限必须 FAIL', after > registered, `${after} > ${registered}`);
    check('RP-V4-05 FAIL 段诊断含「超出 1 B」', failExcess === 1, `超出 ${failExcess} B`);
  } finally {
    writeFileSync(pickPath, original);
  }
  check('RP-V4-05 还原后逐字节 sha256 复核（还原失败不得静默）', sha256File(pickPath) === shaBefore, `${shaBefore} → ${sha256File(pickPath)}`);
  check('RP-V4-05 (还原后 PASS 段) 还原后必须 PASS', statSync(pickPath).size <= registered, `实测 ${statSync(pickPath).size}`);
}

/**
 * RP-V4-06（FR-CHAT-075）—— 把工具栏控件移入 `#stream`：豁免守卫必须 FAIL，且**产品口径**下的密度 C1 必须真的下降 1。
 *
 * 〖N-01（收口轮）〗原 FAIL 段的第二半用 `c1Probe`（**未排除 `#stream`** 的整页可点计数）断言
 * 「C1 不得下降」——**在同一页面内移动元素不可能改变该计数**（`#theme-toggle` 仍是 `body` 的
 * 后代且可见），故该半段**恒真、不可证伪**（validate R1 实测 14 → 14）。现在主判据改用**产品
 * 口径**（`DENSITY_MEASURE_SOURCE` = 排除 `#stream` 的三区外壳口径）：注入后 C1 必须由 5 降为
 * **4** —— 这正是「把常驻控件塞进豁免子树 ⇒ 静默降密度」的滥用形态本身，唯一拦截点是
 * `assertChromeNotInStream()` 抛错；未排除口径则降级为**归因对照**（整页计数必须不变 ⇒ 证明
 * 控件仍挂在文档上、仍可见，「降 1」只可能由豁免造成，而不是元素消失）。
 *
 * 〖同一收口轮，竞态修复〗原实现「注入 → `sleep(150)` → 单独一次探针调用」是**竞态**：产品在
 * 状态推送时 `render()` 会丢弃 `#stream` 的非宿主子节点（注释见 `atomicCardsProbe`），注入的
 * 节点可能在两次调用之间被摘掉 —— 实测表现为「守卫 `pass` + 还原时 `#theme-toggle` 已不在
 * 文档中」。现改为**同一个同步块**内完成「前置读数 → 注入 → 读数 → 守卫 → 还原 → 还原读数」
 * （与 RP-V4-01/02/03 的 `atomicCardsProbe` 同一纪律），任何重绘都无法插入。
 */
async function reverseRpV406(cdp) {
  console.log('\n▶ RP-V4-06：工具栏控件移入 #stream → assertChromeNotInStream() 必须 FAIL 且（排除口径）C1 必须下降 1');
  await resetFixture(cdp);
  await setViewport(cdp, 400, VIEWPORT_HEIGHT);
  const atomicProbe = `(() => {
    const measure = () => (${DENSITY_MEASURE_SOURCE});
    const whole = () => (${c1Probe});
    const guard = () => { try { window.__v3.testing.assertChromeNotInStream(); return 'pass'; } catch (e) { return 'throw:' + (e && e.message ? e.message : String(e)); } };
    const toggle = document.getElementById('theme-toggle');
    const stream = document.getElementById('stream');
    const toolbar = document.getElementById('region-toolbar');
    if (!toggle || !stream || !toolbar) return JSON.stringify({ error: 'fixture missing', toggle: !!toggle, stream: !!stream, toolbar: !!toolbar });
    const before = { scoped: measure().clickables, whole: whole(), guard: guard() };
    stream.appendChild(toggle);
    const injected = { scoped: measure().clickables, whole: whole(), guard: guard() };
    toolbar.appendChild(toggle);
    const restored = { scoped: measure().clickables, whole: whole(), guard: guard() };
    return JSON.stringify({ before, injected, restored });
  })()`;
  const res = JSON.parse(await evaluate(cdp, atomicProbe));
  if (res.error) throw new Error(`RP-V4-06 夹具缺失：${JSON.stringify(res)}`);
  const { before, injected, restored } = res;
  check('RP-V4-06 前置：#stream 子树零 [data-chrome-control]（guard PASS）', before.guard === 'pass', before.guard);
  check('RP-V4-06 前置：排除口径 C1 == 工具栏准入值 5（判据不空转）', before.scoped === 5, `实测 ${before.scoped}`);
  check('RP-V4-06 (FAIL 段) 工具栏控件移入 #stream 后豁免守卫必须抛错', /^throw:/.test(injected.guard), injected.guard);
  check(
    'RP-V4-06 (FAIL 段) 豁免子树吞掉常驻可点 ⇒ 排除口径 C1 必须下降 1（滥用形态被观测到）',
    injected.scoped === before.scoped - 1,
    `${before.scoped} → ${injected.scoped}`,
  );
  check(
    'RP-V4-06 归因对照：未排除口径的整页计数不得变化（证明控件仍挂在文档上，降 1 只由豁免造成）',
    injected.whole === before.whole,
    `${before.whole} → ${injected.whole}`,
  );
  check('RP-V4-06 (还原后 PASS 段) 还原后豁免守卫必须 PASS', restored.guard === 'pass', restored.guard);
  check('RP-V4-06 还原后排除口径 C1 回到基线', restored.scoped === before.scoped, `${before.scoped} → ${restored.scoped}`);
}

/** RP-V4-07（FR-CHAT-013 / J3）：风险 chip 被移入 `hidden` 容器 ⇒ 可见性探针必须 FAIL。 */
async function reverseRpV407(cdp) {
  console.log('\n▶ RP-V4-07：风险 chip 移入 hidden 容器 → 风险可见性探针必须 FAIL → 还原 → PASS');
  await setViewport(cdp, 400, VIEWPORT_HEIGHT);
  await resetFixture(cdp);
  await setRisk(cdp, 'hardline', 'force');
  await sleep(200);
  const before = await evaluate(cdp, riskVisibleExpr('hardline'));
  check('RP-V4-07 前置：风险 chip 可见（基线 PASS）', before.ok === true, JSON.stringify(before));
  await evaluate(
    cdp,
    `(() => {
      const chip = document.querySelector('#risk-rail .risk-row[data-risk-class="hardline"]');
      const holder = document.createElement('div');
      holder.id = 'rp407-holder';
      holder.hidden = true;
      document.body.appendChild(holder);
      holder.appendChild(chip);
      return true;
    })()`,
  );
  await sleep(150);
  const hidden = await evaluate(cdp, riskVisibleExpr('hardline'));
  check('RP-V4-07 (FAIL 段) chip 被移入 hidden 容器后探针必须 FAIL', hidden.ok === false, JSON.stringify(hidden));
  await evaluate(
    cdp,
    `(() => { const h = document.getElementById('rp407-holder'); const rail = document.getElementById('risk-rail'); while (h.firstChild) rail.appendChild(h.firstChild); h.remove(); return true; })()`,
  );
  await sleep(150);
  const restored = await evaluate(cdp, riskVisibleExpr('hardline'));
  check('RP-V4-07 (还原后 PASS 段) 还原后风险可见性探针必须 PASS', restored.ok === true, JSON.stringify(restored));
  await setRisk(cdp, 'hardline', 'off');
}

/**
 * RP-V4-09（V4-2 TASK-613 · 裁决：卡预算 × 常驻入口准入重审）——
 * ① **形态判据**：带 `[data-toolbar-slot]` / `.view-btn` 的控件进入 `#stream` ⇒
 *    `assertChromeNotInStream()` 必须抛错（这正是 v4-1 validate N-02 指出、当时
 *    「只登记不修」的第一层反向判定，v4-2 落地）；
 * ② **合计上限**：注入两张卡各 5 可点（单卡 ≤6 全合规）⇒ 合计 = **基线合计 + 10**
 *    必须越界 ⇒ 首屏预算必须 FAIL，且失败原因必须是**合计**而非单卡（归因：单卡预算仍 PASS）。
 *    〖V4-3 R2 重 pin〗基线不再是 0 可点：v4-3 的 choice ask 卡是流内一等公民（实测 1 张 = 4 可点，
 *    见 HO-1 裁决），因此期望值必须**动态**取 `基线合计 + 10`，不得硬编码 10。
 *
 * 两半都在 ONE 同步块内完成「前置 → 注入 → 读数 → 还原 → 读数」，任何重绘都无法插入。
 */
async function reverseRpV409(cdp) {
  console.log('\n▶ RP-V4-09：流内常驻导航入口（形态判据）+ 首屏卡合计可点 > 8 → 必须 FAIL → 还原 → PASS');
  await resetFixture(cdp);
  await setViewport(cdp, 400, VIEWPORT_HEIGHT);
  const atomicProbe = `(() => {
    const cards = () => (${STREAM_CARDS_FN})();
    const guard = () => { try { window.__v3.testing.assertChromeNotInStream(); return 'pass'; } catch (e) { return 'throw:' + (e && e.message ? e.message : String(e)); } };
    const stream = document.getElementById('stream');
    const snap = () => JSON.stringify({ cards: cards(), guard: guard() });
    const before = snap();
    // ① aggregate: two cards × 5 clickables = 10 (per-card ≤6 holds for each).
    const made = [];
    for (let i = 0; i < 2; i += 1) {
      const li = document.createElement('li');
      li.setAttribute('data-msg-type', 'nextstep');
      li.setAttribute('data-card-key', 'rp409-agg-' + i);
      for (let j = 0; j < 5; j += 1) { const b = document.createElement('button'); b.textContent = 'chip-' + j; li.appendChild(b); }
      stream.appendChild(li); made.push(li);
    }
    const agg = snap();
    made.forEach((n) => n.remove());
    // ② form criterion: a toolbar/view-shaped control inside a stream card.
    const nav = document.createElement('li');
    nav.setAttribute('data-msg-type', 'nextstep');
    nav.setAttribute('data-card-key', 'rp409-nav');
    const btn = document.createElement('button');
    btn.setAttribute('data-toolbar-slot', 'view');
    btn.className = 'view-btn';
    btn.textContent = '越界入口';
    nav.appendChild(btn); stream.appendChild(nav);
    const navSnap = snap();
    nav.remove();
    const restored = snap();
    return JSON.stringify({ before, agg, navSnap, restored });
  })()`;
  const res = JSON.parse(await evaluate(cdp, atomicProbe));
  const judge = (snapJson) => {
    const snap = JSON.parse(snapJson);
    return {
      guard: snap.guard,
      firstScreen: evaluateFirstScreen(snap.cards, 'default'),
      cardBudget: evaluateCardBudget(snap.cards),
      /** V4-3 重 pin：注入前后的合计可点必须**动态**读取（基线卡片随产品演进变化）。 */
      totalClickables: (snap.cards ?? []).reduce((n, c) => n + Number(c?.clickables ?? 0), 0),
    };
  };
  const before = judge(res.before);
  const agg = judge(res.agg);
  const restored = judge(res.restored);
  // V4-3（TASK-711 R2 / RP-V4-09 重 pin）：v4-3 的 ask/auth 卡成为流内一等公民后，
  // 基线首屏不再只有 0 张可点卡（此处实测 1 张 choice ask 卡 = 4 可点，见 HO-1 裁决）。
  // 反证语义不变（注入 2 张 × 5 可点 ⇒ 合计越界必须 FAIL，且归因必须是**合计**），
  // 但「10」这个绝对值必须改为「基线合计 + 10」——否则产品演进会让这条反证变成因错而红。
  const injectedTotal = before.totalClickables + 10;
  check('RP-V4-09 前置：基线首屏预算 PASS ∧ guard PASS（判据不恒真）', before.firstScreen.ok === true && before.guard === 'pass', res.before);
  check(
    `RP-V4-09 (FAIL 段 ①) 首屏卡合计 ${injectedTotal} 可点（基线 ${before.totalClickables} + 注入 2×5）⇒ 首屏预算必须 FAIL`,
    agg.firstScreen.ok === false,
    JSON.stringify(agg.firstScreen),
  );
  check(
    `RP-V4-09 FAIL 段 ① 诊断含「流内卡合计可点 ${injectedTotal} > 8」`,
    agg.firstScreen.violations.includes(`流内卡合计可点 ${injectedTotal} > 8`),
    agg.firstScreen.violations.join(' / '),
  );
  check(
    'RP-V4-09 归因：单卡预算仍 PASS（红的必须是**合计**，不是单卡规则）',
    agg.cardBudget.ok === true,
    JSON.stringify(agg.cardBudget.violations),
  );
  const navGuard = JSON.parse(res.navSnap).guard;
  check('RP-V4-09 (FAIL 段 ②) 工具栏形态控件进入 #stream ⇒ 豁免守卫必须抛错', /^throw:/.test(navGuard), navGuard);
  check(
    'RP-V4-09 FAIL 段 ② 诊断含「常驻导航入口」',
    /常驻导航入口/.test(navGuard),
    navGuard,
  );
  check('RP-V4-09 (还原后 PASS 段) 还原后首屏预算 + guard 均回到 PASS', restored.firstScreen.ok === true && restored.guard === 'pass', res.restored);
}

// ── main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`▶ chrome: ${CHROME}`);
  console.log(`▶ dist:   ${DIST}`);
  if (REVERSE) console.log(`▶ 反证模式：${REVERSE}`);

  const { chrome, base } = await launch({ tag: REVERSE ? 'density-rev' : 'density', extDir: DIST, portRange: [9500, 9799] });
  try {
    const browserCdp = await (async () => {
      for (let i = 0; i < 80; i += 1) {
        const info = await fetch(`${base}/json/version`).then((r) => r.json()).catch(() => undefined);
        if (info?.webSocketDebuggerUrl) return (await import('./_v3-helpers.mjs')).connectCdp(info.webSocketDebuggerUrl);
        await sleep(250);
      }
      throw new Error('no browser endpoint');
    })();

    const sw = await findOurServiceWorker(base);
    if (!sw) throw new Error('web-cli plugin service worker 不可达');
    const { cdp } = await openSidePanel(sw.cdp, base);
    await setViewport(cdp, 400, VIEWPORT_HEIGHT);
    check('v3 测试钩子 window.__v3 可用', (await evaluate(cdp, `Boolean(window.__v3 && window.__v3.disclosure && window.__v3.testing)`)) === true);
    // V4-1 重锚：`#risk-rail` 由 body 直挂改为 `#region-statusbar` 内的 chips 行（J2 契约）。
    check(
      '风险位三区骨架内独立常驻（#region-statusbar 为 body 直挂 ∧ #risk-rail 是其后代且非折叠容器内）',
      (await evaluate(
        cdp,
        `(() => { const bar = document.getElementById('region-statusbar'); const rail = document.getElementById('risk-rail');
          return bar.parentElement === document.body && Boolean(rail) && bar.contains(rail)
            && window.__v3.disclosure.snapshot && !rail.closest('[data-disclose-panel],[data-l2-view]'); })()`,
      )) === true,
    );

    if (!REVERSE) {
      await stageA(browserCdp, base);
      const rows = await stageB(cdp);
      const { cells, worst } = await stageC(cdp);
      // V4-1：两组新增独立登记格在**既有 A/B/C 之后**执行 —— fixture 顺序对既有格
      // （尤其 width 敏感的 `.site-summary` 截断）是有影响的，新增格不得改变既有格的
      // 夹具序（换口径不是放松，既有 25 格的实测值必须逐格复现）。
      const extraRows = await stageB2(cdp);
      stageD();
      stageE([...rows, ...extraRows, { tier: 'risk', vp: 'worst', measured: worst, verdict: evaluateDensity(worst, 'risk') }]);
      console.log(`\n  · 风险 15 登记格：${cells.length} 格`);
      check('风险登记格数 == 15', cells.length === 15, String(cells.length));
      // V4-1（ADR-V4-021 第 2 条）：31 登记格 = 9 强制 + 15 风险 + 3 空态 + 3 风险详情展开 + 1 worst。
      // 9 强制 = `DENSITY_MATRIX_SIZE`（3 档 × 3 视口）；其中 risk 档那一行由 15 个风险
      // 子场景格承载（不另立行），故 31 = 9 + 15 + 3(空态) + 3(风险详情展开) + 1(worst)。
      //
      // review 修复轮 I10：**31 登记格 = 28 实测机对 + 3 名义**。`risk` 档在矩阵里占 3 格
      // （risk@320/400/520），但这 3 格不与 default/firstRun 行同构 —— 阶段 F 实际逐格机对
      // 的是 28 格（default×3 + firstRun×3 + 15 风险子场景 + empty×3 + riskDetailOpen×3 + worst×1）。
      // 下面同时断言 28 与 31，消除「双数并存」且不改变任何格的可测性。
      const registeredCells = DENSITY_MATRIX_SIZE + cells.length + extraRows.length + 1;
      const nominalRiskRowCells = 3;
      const machineComparedCells = registeredCells - nominalRiskRowCells;
      check(
        'v4 登记格总数 == 31（9 强制 + 15 风险 + 3 空态 + 3 风险详情展开 + 1 worst；其中 3 格为 risk 行名义格）',
        registeredCells === 31,
        `实测 ${registeredCells}（强制矩阵 ${DENSITY_MATRIX_SIZE} + 风险 ${cells.length} + 新增 ${extraRows.length} + worst 1）`,
      );
      check(
        'v4 实机对格数 == 28（31 − 3 名义：risk 行的 3 个视口格由 15 子场景承载，不另立测量）',
        machineComparedCells === 28,
        `实测 ${machineComparedCells}（登记 ${registeredCells} − 名义 ${nominalRiskRowCells}）`,
      );
      await stageF(cdp, rows, cells, worst, extraRows);
    } else {
      switch (REVERSE) {
        case 'RP-V3-01':
          await reverseRp01(cdp);
          break;
        case 'RP-V3-02':
          await reverseRp02(cdp, base);
          break;
        case 'RP-V3-03':
          await reverseRp03(cdp);
          break;
        case 'RP-V3-04':
          await reverseRp04(cdp);
          break;
        case 'RP-V3-08':
          await reverseRp08(cdp);
          break;
        case 'RP-V3-09':
          await reverseRp09(cdp);
          break;
        case 'RP-V4-01':
          await reverseRpV401(cdp);
          break;
        case 'RP-V4-02':
          await reverseRpV402(cdp);
          break;
        case 'RP-V4-03':
          await reverseRpV403(cdp);
          break;
        case 'RP-V4-04':
          await reverseRpV404(cdp);
          break;
        case 'RP-V4-05':
          await reverseRpV405(cdp);
          break;
        case 'RP-V4-06':
          await reverseRpV406(cdp);
          break;
        case 'RP-V4-07':
          await reverseRpV407(cdp);
          break;
        case 'RP-V4-09':
          await reverseRpV409(cdp);
          break;
        default:
          throw new Error(`未知反证：${REVERSE}`);
      }
    }
    cdp.close();
  } finally {
    chrome.kill('SIGKILL');
  }
  finish(REVERSE ? `density ${REVERSE} 反证` : 'density 门禁');
}

main().catch((err) => {
  console.error(`✖ density 门禁异常：${err instanceof Error ? err.stack ?? err.message : String(err)}`);
  process.exit(1);
});
