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
 *      measured cell (9 mandatory + 15 risk + worst), the geometry floor AND its
 *      source measurement, and the shipped artifact bytes are compared against
 *      `docs/v3-density-baseline.json`; any divergence is a FAIL with a readable
 *      diff (the registry can no longer drift silently).
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
  DENSITY_MEASURE_SOURCE,
  DENSITY_TIER_ORDER,
  DENSITY_VIEWPORTS,
  LOG_CLIENT_HEIGHT_FLOOR,
  RISK_SUBSCENARIOS,
  bannedApisInMeasureSource,
  compareBaselineCells,
  evaluateDelta,
  evaluateDensity,
  measureSourceForRoot,
  riskVisibilityProbeSource,
} from './density-metrics.mjs';

const DESIGN_DIR = resolve(PACKAGE_ROOT, 'design/ui-redesign');
const BASELINE_JSON = resolve(PACKAGE_ROOT, 'docs/v3-density-baseline.json');
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

/** Structural fingerprint printed per cell (R31-07: no silent cross-cell bleed). */
async function fingerprint(cdp) {
  return evaluate(
    cdp,
    `(() => JSON.stringify({
      origin: document.getElementById('status')?.textContent ?? '',
      authorized: !document.getElementById('l0-pick')?.disabled || true,
      pickDisabled: document.getElementById('l0-pick')?.disabled ?? null,
      onboardingHidden: document.getElementById('onboarding')?.hidden ?? null,
      discoveryHidden: document.getElementById('discovery-notice')?.hidden ?? null,
      askHidden: document.getElementById('ask')?.hidden ?? null,
      moreHidden: document.getElementById('l0-more')?.hidden ?? null,
      disclosure: window.__v3.disclosure.snapshot(),
      risks: [...document.querySelectorAll('#risk-rail .risk-row')].map((r) => r.getAttribute('data-risk-class') ?? 'calm'),
      scrollBottomHidden: document.getElementById('scroll-bottom')?.hidden ?? null,
      log: (() => { const l = document.getElementById('log'); return { sh: l.scrollHeight, ch: l.clientHeight, st: l.scrollTop }; })(),
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
        check(`default@${vp} 常驻分区数（C4）已登记`, Number.isFinite(measured.regions), `regions=${measured.regions}`);
        check(`default@${vp} 可点预算恰为 7（配平可追溯）`, measured.clickables === DENSITY_LIMITS.default.clickables, `实测 ${measured.clickables}`);
        check(
          `default@${vp} 「回到底部」不在 L0 常驻（未上滚时必须 hidden）`,
          fp.scrollBottomHidden === true,
          `scrollBottomHidden=${fp.scrollBottomHidden} log=${JSON.stringify(fp.log)}`,
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
  const drift = defaultRows
    .filter((r) => r.measured.clickables !== firstMeasured.clickables
      || r.measured.lines !== firstMeasured.lines
      || r.measured.blocks !== firstMeasured.blocks
      || r.measured.chars !== firstMeasured.chars)
    .map((r) => `default@${r.vp}: ${fmt(r.measured)} ≠ default@${defaultRows[0].vp}: ${fmt(firstMeasured)}`);
  check(
    '默认档夹具确定性：三视口逐项相等（可点/行/块/chars，同一稳态 ⇒ 无视口差异）',
    Boolean(firstMeasured) && defaultRows.length === DENSITY_VIEWPORTS.length && drift.length === 0,
    drift.join(' | ') || `rows=${defaultRows.length}`,
  );
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
      await setRisk(cdp, sub.key, 'off');
      await sleep(200);
      const baseAgain = await measure(cdp);
      const stable =
        base.clickables === baseAgain.clickables &&
        base.lines === baseAgain.lines &&
        base.blocks === baseAgain.blocks &&
        base.chars === baseAgain.chars;
      check(
        `risk(${sub.key})@${vp} 夹具跨风险窗口稳定（base 复测逐项相等）`,
        stable,
        `${fmt(base)} vs ${fmt(baseAgain)} | base 文本 ${baseText}`,
      );
      if (!stable) console.log(`    漂移明细：base=${JSON.stringify(base.elementsWithKeys?.filter((e) => e.clickable || e.block).slice(0, 40))}`);
      cells.push({ sub: sub.key, vp, measured, verdict, delta, probe });
      console.log(`  · risk(${sub.key})@${vp}: ${fmt(measured)} → ${verdict.ok ? 'PASS' : 'FAIL'} | 增量违规 ${delta.violations.length} | 风险行可见 ${probe.ok ? 'YES' : `NO(${probe.why})`} | base 文本 ${baseText}`);
      check(`risk(${sub.key})@${vp} C1/C2 ≤ 风险档上限`, verdict.ok, verdict.message);
      check(`risk(${sub.key})@${vp} 风险行在 L0 可见且三通道齐备`, probe.ok === true, JSON.stringify(probe));
      check(`risk(${sub.key})@${vp} 风险增量只被风险类元素占用`, delta.violations.length === 0, delta.violations.join(' / '));
      await setRisk(cdp, sub.key, 'off');
    }
  }
  // `#l0-pick` must be disabled while unauthorized / probing (FR-V3-014)
  await resetFixture(cdp, { authorized: false, ask: true });
  await setRisk(cdp, 'unauthorized', 'natural');
  await sleep(200);
  const pickState = await evaluate(
    cdp,
    `(() => ({
      unauthorized: document.getElementById('l0-pick').disabled,
      title: document.getElementById('l0-pick').getAttribute('title'),
      zeroInjection: (document.getElementById('risk-rail').textContent || '').includes('页面侧零注入'),
    }))()`,
  );
  check('unauthorized 时「从页面拾取」禁用', pickState.unauthorized === true, JSON.stringify(pickState));
  check('unauthorized 时风险位明示「页面侧零注入」', pickState.zeroInjection === true, JSON.stringify(pickState));
  await setRisk(cdp, 'probing', 'force');
  await sleep(200);
  const pickProbing = await evaluate(cdp, `document.getElementById('l0-pick').disabled`);
  check('probing 时「从页面拾取」禁用', pickProbing === true, String(pickProbing));

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

// ── stage F: registry machine comparison (ADR-V3-018 决策 2 / review I8) ─────
async function stageF(cdp, rows, cells, worst) {
  console.log('\n▶ 阶段 F：基线机器比对（实测 vs docs/v3-density-baseline.json）');
  check('F 基线文件存在（ADR-V3-018 的登记载体）', existsSync(BASELINE_JSON), BASELINE_JSON);
  if (!existsSync(BASELINE_JSON)) return { diffs: ['基线文件缺失'] };
  const baseline = readBaselineRegistry();
  const diffs = [];
  for (const row of rows) {
    if (row.tier === 'risk') continue;
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
  const comparedCells = rows.filter((r) => r.tier !== 'risk').length + cells.length + 1;
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
  const logClientHeight = await evaluate(cdp, `document.getElementById('log').clientHeight`);
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
  console.log('\n▶ RP-V3-01：注入 1 个额外可点元素 → 必须 FAIL → 还原 → 必须 PASS');
  await resetFixture(cdp);
  await setViewport(cdp, 400, VIEWPORT_HEIGHT);
  const before = await measure(cdp);
  check('RP-V3-01 前置：默认档恰好 7 可点（否则注入 1 个不会越界）', before.clickables === 7, `实测 ${before.clickables}`);
  await evaluate(cdp, `(() => { const b = document.createElement('button'); b.id = 'rp01'; b.textContent = 'rp01'; document.body.appendChild(b); return true; })()`);
  await sleep(150);
  const injected = await measure(cdp);
  const verdict = evaluateDensity(injected, 'default');
  check('RP-V3-01 (FAIL 段) 注入后密度门禁必须 FAIL', verdict.ok === false, `ok=${verdict.ok} ${verdict.message}`);
  check('RP-V3-01 FAIL 段诊断含「C1 8 > 7」', verdict.exceeds.includes('C1 可点元素 8 > 7'), verdict.exceeds.join(' / '));
  await evaluate(cdp, `(() => { document.getElementById('rp01')?.remove(); return true; })()`);
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
  const target = '#l0-ref-toggle';
  const setStyle = (style) =>
    evaluate(
      cdp,
      `(() => { const el = document.querySelector(${JSON.stringify(target)}); Object.assign(el.style, ${JSON.stringify(style)}); return true; })()`,
    );
  const clear = () => evaluate(cdp, `(() => { const el = document.querySelector(${JSON.stringify(target)}); el.style.cssText = ''; el.hidden = false; return true; })()`);
  const baseline = await evaluate(cdp, c1Probe);
  check('RP-V3-03 前置：基线 C1 为 7', baseline === 7, `实测 ${baseline}`);
  for (const style of [{ display: 'none' }, { visibility: 'hidden' }, { opacity: '0' }, { pointerEvents: 'none' }]) {
    await setStyle(style);
    await sleep(120);
    const after = await evaluate(cdp, c1Probe);
    check(`RP-V3-03 CSS 隐身 ${JSON.stringify(style)} 后 C1 不下降`, after === baseline, `${baseline} → ${after}`);
  }
  await clear();
  await sleep(120);
  const cleaned = await evaluate(cdp, c1Probe);
  check('RP-V3-03 清除 CSS 隐身并还原后 C1 回到 7', cleaned === baseline, `实测 ${cleaned}`);
  await evaluate(cdp, `(() => { document.querySelector(${JSON.stringify(target)}).hidden = true; return true; })()`);
  await sleep(120);
  const dropped = await evaluate(cdp, c1Probe);
  check('RP-V3-03 hidden=true 是唯一豁免通道 → C1 必须下降 1', dropped === baseline - 1, `${baseline} → ${dropped}`);
  await evaluate(cdp, `(() => { document.querySelector(${JSON.stringify(target)}).hidden = false; return true; })()`);
  await sleep(120);
  const restored = await evaluate(cdp, c1Probe);
  check('RP-V3-03 还原后 C1 回到 7', restored === baseline, `实测 ${restored}`);
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
 * (`docs/v3-density-baseline.json`) and the judgement goes through the SAME
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
    check('风险位独立常驻（#risk-rail 为 body 直接子元素）', (await evaluate(cdp, `document.getElementById('risk-rail').parentElement === document.body`)) === true);

    if (!REVERSE) {
      await stageA(browserCdp, base);
      const rows = await stageB(cdp);
      const { cells, worst } = await stageC(cdp);
      stageD();
      stageE([...rows, { tier: 'risk', vp: 'worst', measured: worst, verdict: evaluateDensity(worst, 'risk') }]);
      console.log(`\n  · 风险 15 登记格：${cells.length} 格`);
      check('风险登记格数 == 15', cells.length === 15, String(cells.length));
      await stageF(cdp, rows, cells, worst);
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
