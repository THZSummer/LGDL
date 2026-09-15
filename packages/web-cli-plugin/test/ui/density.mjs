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
 *   E  the summary table (tier | viewport | caliber | measured | ceiling).
 *
 * `--reverse RP-V3-01..04` runs one counter-proof (see TASK-111). Every driver
 * asserts BOTH halves — "must FAIL" and "must PASS again after restore" — and
 * exits non-zero if either half is missing (a counter-proof that cannot fail is
 * not a counter-proof, NFR-V3-013).
 *
 * Serial discipline (NFR-V3-012): exactly ONE Chromium instance, ONE page target,
 * every cell executed in order. Full stdout/stderr is tee'd to
 * `/tmp/opencode/v3-gate-logs/density.log` by the caller — never tail-truncated.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
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
  RISK_SUBSCENARIOS,
  bannedApisInMeasureSource,
  evaluateDelta,
  evaluateDensity,
  measureSourceForRoot,
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

/** The AC-V3-008 / AC-V3-009 risk-visibility probe (shared with `test/ui/l0.mjs`). */
const riskVisibleExpr = (cls) => `(() => {
  const row = document.querySelector('#risk-rail .risk-row[data-risk-class="${cls}"]');
  if (!row) return { ok: false, why: '风险行不存在' };
  const chain = [];
  let node = row;
  while (node) { chain.push(node); node = node.parentElement; }
  const hiddenAncestor = chain.find((n) => n.hidden === true);
  if (hiddenAncestor) return { ok: false, why: '祖先链含 hidden=' + hiddenAncestor.id };
  const folded = chain.find((n) => n.hasAttribute && (n.hasAttribute('data-l1-panel') || n.hasAttribute('data-l2-view') || n.hasAttribute('data-disclose-panel')));
  if (folded) return { ok: false, why: '祖先链含折叠容器 ' + (folded.id || folded.className) };
  const rect = row.getBoundingClientRect();
  if (!(rect.height > 0)) return { ok: false, why: '渲染高度为 0' };
  if (rect.bottom < 0 || rect.top > window.innerHeight) return { ok: false, why: '不在默认视口内' };
  const text = (row.querySelector('.risk-text')?.textContent ?? '').trim();
  const badge = (row.querySelector('.risk-badge')?.textContent ?? '').trim();
  const icon = row.querySelector('.risk-icon');
  if (!text) return { ok: false, why: '文字通道为空' };
  if (!badge) return { ok: false, why: '徽标通道为空' };
  if (!icon) return { ok: false, why: '图标通道缺失' };
  return { ok: true, text, badge };
})()`;

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
 * THE default fixture (spec §9.2 "L0 默认态"):
 * bound + authorized + probe finished + no pending confirmation +
 * onboarding / discovery-notice terminated; every disclosure layer folded; one
 * decision card with four options (so the clickable budget sits exactly at 7).
 */
async function resetFixture(cdp, { authorized = true, ask = true, configured = true } = {}) {
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
      regions: Math.max(acc.regions, cell.measured.regions),
    }),
    { clickables: 0, lines: 0, regions: 0 },
  );
  const worstVerdict = evaluateDensity(worst, 'risk');
  check('风险档最差值 ≤ 上限（强制判定）', worstVerdict.ok, worstVerdict.message);
  console.log(`  · 风险档 15 格最差值：C1=${worst.clickables} C2=${worst.lines} C4=${worst.regions}`);
  return { cells, worst };
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
      if (BASELINE_JSON) console.log(`  · 基线文件：${existsSync(BASELINE_JSON) ? '已存在（由 TASK-112 登记）' : '尚未生成'}`);
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
