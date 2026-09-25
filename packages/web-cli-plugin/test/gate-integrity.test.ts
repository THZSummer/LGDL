/**
 * V3-2 fix round 2 (2026-09-16) — **the meta-gate (元门禁)**: integrity of the gates
 * themselves.
 *
 * ── Why this file exists ────────────────────────────────────────────────────
 *
 * Review R1 found **F-01**: `test/ui/binding.mjs` shipped an assertion failure
 * ("`binding FAILED (4)`") while the process still exited **0**, because the
 * failure branch did `await dumpDiagnostics(...)` *before* `process.exit(1)` and
 * `dumpDiagnostics → captureRuntimeSummary → evaluate → cdp.send()` had **no
 * timeout and no `close` listener** — so on a CLOSED CDP socket the awaited
 * Promise never settled, `process.exit(1)` was unreachable, the event loop drained
 * and Node exited with its default code **0**. A failing gate was reported green.
 *
 * Fixing that one file is not enough: the *class* of defect must be unable to come
 * back. This gate therefore audits the gate scripts themselves, with no Chromium
 * and no fixtures (it runs inside `npm test`):
 *
 *   R1a  **exit-code primacy** — inside a failure block (`if (…failures.length…)
 *        {` / `main().catch(async …)`), the **first standalone `await` of the
 *        block** must already come *after* an exit-code-fixing statement
 *        (`process.exitCode = N`, `process.exit(N)`, `finish()`). The body is
 *        taken as an **indentation-delimited block window**, not as "the line
 *        immediately above the exit" — that one-line lookback was bypassable by
 *        inserting any statement between the `await` and the exit (closeout round
 *        N-01, demonstrated red with the historical F-01 shape plus an extra
 *        `console.error`). A standalone `await` immediately above an exit is
 *        still checked by the original adjacency rule, kept as a second clause.
 *   R1b  **bounded diagnostics** — an `await` that relies on R1a's "exit code is
 *        already fixed" clause must call a **self-bounding callee**: a function
 *        defined in the same file whose body installs a `setTimeout(...)` that
 *        exits the process (a hard wall-clock escape). Comments are **stripped
 *        before** the test and the callee body is the real indentation-delimited
 *        function body — a *commented-out* `setTimeout(... process.exit ...)`
 *        used to satisfy this rule (closeout round N-02).
 *   R2   **failure → exit coupling** — a file that records failures (`FAILED (` /
 *        `failures.push(` / `✖`) must have an explicit exit path
 *        (`process.exit(1)` / `process.exitCode = N` / `finish()` from
 *        `./_v3-helpers.mjs`, whose own failure branch exits 1).
 *   R3   **bounded CDP sends** — **every** CDP `send(method, params …)`
 *        implementation must carry a `readyState` guard **and** a `setTimeout`
 *        round-trip bound, and the socket must reject the **pending map of its
 *        own scope** on `close`. The earlier version inspected only the *first*
 *        `send(` in the file and accepted a file-global `close`+`reject(` pair,
 *        so a second unbounded client — or a close handler rejecting an unrelated
 *        object — went unnoticed (closeout round N-03).
 *
 * ── Falsifiability (a gate that cannot fail is not a gate) ──────────────────
 *
 *  * **Synthetic fixtures** — hand-written bad/good sources prove each rule fires
 *    on the bad shape and stays silent on the good one (in-process).
 *  * **Injected copy** — a real copy of the gate scripts is written to a temp root,
 *    a defect shape is injected into it, and the auditor must report it there
 *    while reporting nothing for the real root. The same root can be pointed at
 *    with `SDC_GATES_ROOT=<dir>`, which is how the fix/closeout rounds drove the
 *    meta-gate **red** out-of-process (see `build.md §10` / §11).
 *
 * ── The audited set is **derived by directory scan** (closeout round N-12) ──
 *
 * The set used to be `[...CHROMIUM_GATES, …]` — a constant derived from another
 * constant, which made the "the audited set is complete" assertion nearly
 * tautological: a ninth Chromium gate could be added and never be audited. It is
 * now computed by {@link discoverGateFiles} — every `test/ui/*.mjs` /
 * `test/e2e/*.mjs` that carries a CDP `send(method, params` implementation, a
 * `failures.push(` record, or the shared `_v3-helpers.mjs`底座 — so a new gate is
 * **automatically audited and must pass**. A literal
 * {@link EXPECTED_AUDITED_FILES} list is asserted to be a *subset* of the scan, so
 * renaming/deleting a known gate still fails (the set may grow, never shrink).
 *
 * ── V4.5-1 W1 (TASK-V45-101): the **node-gate** half of the audited set ──────
 *
 * The three v4.5 node gates (`test/host-registry.test.ts` /
 * `test/local-act-wiring.test.ts` / `test/settings-help.test.ts`) live in the package
 * `test/` root — outside `test/ui` — so the scan gained a second axis: any
 * `test/*.test.ts` that declares a **per-judgement `expectFailPattern` truth table**
 * (the node-gate counterpart of a Chromium gate's dynamic FAIL-段) is discovered and
 * audited. Consequences, in order of importance:
 *   · `CHROMIUM_GATES.length === 9` is **unchanged** (a node gate is not a Chromium
 *     gate — the `page-input.mjs` precedent, applied once more);
 *   · `EXPECTED_AUDITED_FILES` only ever grows: the three new paths are appended, the
 *     original set stays a subset, and a rename/removal still FAILs;
 *   · the R1a/R1b/R2/R3 rules are **not relaxed** for the new files: they must be
 *     silent on them (they carry no CDP client, no `failures.push(`/`FAILED (` marker
 *     and no `process.exit`), which the real-root audit below asserts.
 *   · the marker is the two-part「`JUDGEMENTS` 表 + 每条 `expectFailPattern`」— which
 *     keeps the auditor (`test/gate-integrity.test.ts`, whose synthetic fixtures quote
 *     the very shapes the rules forbid) and `test/size-budget.test.ts` (a disclosure
 *     caliber, not a gate body) out of its own audited set, with no hand-maintained
 *     exclusion list.
 *
 * ── Honest coverage limits (registered, not papered over) ───────────────────
 *
 *  * Static analysis is *structural*: it recognises the defended shapes, it does
 *    not execute the gates. `test/ui/l1.mjs` gets a real FAIL-段 dynamic proof from
 *    `test/ui/l1-reverse.mjs` (RP-L1-A~H + RP-L1-C2, each `FAIL 段 exit=1`);
 *    `test/ui/binding.mjs` gets a real dynamic proof from the F-01 reverse run
 *    (`build.md §10.2`, forced red → non-zero exit → restore → 192 PASS).
 *  * The remaining gates are **statically covered only** — proving each of them
 *    red would need one Chromium run per gate (~4 min each, ~1.5 GB RAM budget).
 *    They are listed in {@link STATIC_ONLY_GATES} and printed so the limitation is
 *    visible in the log, not buried here.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

function packageRoot(): string {
  let dir = HERE;
  for (let i = 0; i < 6; i += 1) {
    const pkg = resolve(dir, 'package.json');
    try {
      readFileSync(pkg);
      if (readFileSync(pkg, 'utf8').includes('web-cli-plugin')) return dir;
    } catch {
      /* keep walking up */
    }
    dir = resolve(dir, '..');
  }
  throw new Error(`package root not found from ${HERE}`);
}

const PKG = packageRoot();

/** Repository root (the ledger / judge paths in the R4 checks are repo-relative). */
const REPO = resolve(PKG, '..', '..');

/**
 * The roots the audit runs against. Default = the real package. `SDC_GATES_ROOT`
 * lets a reverse proof point the *same* auditor at an injected copy (the
 * meta-gate's own reverse proof: injected copy ⇒ this test fails ⇒ exit non-zero).
 */
const ROOTS = (process.env.SDC_GATES_ROOT ?? PKG).split(':').filter((s) => s.length > 0);

/**
 * The Chromium gate scripts — a **literal** list, kept because deriving it from the
 * directory scan would make「a gate was renamed/removed」invisible.
 *
 * I-08 (review R1): the old comment read "the user's list; `page-input.mjs` never
 * existed" — true when it was written (v3-1), false from v3-4 on: `page-input.mjs`
 * now exists and is auto-audited. It is deliberately NOT in this constant (this list
 * is the *known gate* floor; the scanned set is the real audited set and is a strict
 * superset — `page-input.mjs` / `zero-injection.mjs` / `l1-reverse.mjs` /
 * `l2-reverse.mjs` all join via the marker scan).
 */
export const CHROMIUM_GATES = [
  'test/ui/journey.mjs',
  'test/ui/insight.mjs',
  'test/ui/binding.mjs',
  'test/ui/l0.mjs',
  'test/ui/l1.mjs',
  // v3-3: the L2 on-demand-views gate (same shared base, one Chromium instance).
  'test/ui/l2.mjs',
  'test/ui/density.mjs',
  'test/ui/hardening.mjs',
  'test/e2e/fullchain.mjs',
] as const;

/**
 * A **literal** expectation (not derived from anything): the gates + drivers this
 * leaf ships. The directory scan must be a superset of it — a rename/removal of a
 * known gate must FAIL the meta-gate instead of silently shrinking the audited set.
 */
export const EXPECTED_AUDITED_FILES = [
  ...CHROMIUM_GATES,
  // V5-2 TASK-V5-130 / 132: the two node gates of the `op-*` type-only family (appended;
  // the node half is discovered by marker, and this floor makes a rename/removal FAIL).
  'test/op-protocol.test.ts',
  'test/sw-op-mirror.test.ts',
  // V5-2 TASK-V5-147 / 149: the per-op wiring gate + the S2 dead-end chain (node judged;
  // appended — the node half is discovered by the「JUDGEMENTS + expectFailPattern」marker).
  'test/op-wiring.test.ts',
  'test/s2-deadend-chain.test.ts',
  'test/ui/l1-reverse.mjs',
  // v3-3 fix round: the versioned L2 reverse-proof harness (F-01 订正 + expectFailPattern).
  'test/ui/l2-reverse.mjs',
  'test/ui/_v3-helpers.mjs',
  // V4-2 (TASK-611 / ADR-V4-029 decision 5): the stream gate (12 card types +
  // 固化契约 + keyed incremental rendering + scroll + 320px + a11y). Additive —
  // `CHROMIUM_GATES.length === 9` stays untouched (the `page-input.mjs` precedent).
  'test/ui/stream.mjs',
  // V4-3 (TASK-709 / TASK-710): the ask/auth inflow gate (choice/text + 固化两态 +
  // AC-CHAT-016). Additive — the Chromium-gate count constant stays 9.
  'test/ui/ask-auth-inflow.mjs',
  // V4-4 (TASK-807 / TASK-810): the recommendation / system-event / ref-card gate
  // (chips 即指令 + pending 门控 + 系统行去噪 + 宿主清零). Additive — the Chromium-gate
  // count constant stays 9 (ADR-V4-040 §5).
  'test/ui/recommendation.mjs',
  // ── V4.5-1 W1 (TASK-V45-101 / ADR-V45-012 §1) — the **node-gate** half ──────
  // Node gates live in the package `test/` root (not `test/ui`), so the directory
  // scan below was extended to discover them by their falsifiability marker
  // (`expectFailPattern`) instead of by directory. Additive on both axes:
  //   · `CHROMIUM_GATES.length === 9` stays untouched (the `page-input.mjs` precedent);
  //   · the audited set may only ever GROW — a rename/removal of one of these three
  //     still FAILs the subset assertion below.
  // The three files declare a per-judgement `expectFailPattern` truth table and export
  // their judges; they carry no CDP client and no `failures.push(`, exactly like the
  // existing `test/authorize-chip-wiring.test.ts` precedent — so the R1a/R1b/R2/R3
  // rules stay silent on them (verified by the audit running over the real root).
  'test/host-registry.test.ts',
  'test/local-act-wiring.test.ts',
  'test/settings-help.test.ts',
  // ── V5-1（TASK-V5-114 / 117 / 119 / 120 · ADR-V5-001 / 008 / 009）────────────
  // The v5-1 leaf adds four **node** gates, each declaring a `JUDGEMENTS` table with a
  // per-judgement `expectFailPattern` (the same falsifiability contract as the v4.5-1
  // three above). Additive on both axes — `CHROMIUM_GATES.length === 9` stays
  // untouched (the `page-input.mjs` precedent) and the audited set may only GROW:
  //   · `next-dispatch-diff0` — 集 B 零 per-op 分支 + 四操作哈希不变（AC-ALLN-005）；
  //   · `next-obligation-table` — 注册表 ↔ 义务表（行数 / opId 集 / 四要素 / 无悬空）；
  //   · `blocked-terminals` — 阻塞态枚举单源 + `site.unauthorized` 去 `firstRun`（FR-ALLN-010/013）；
  //   · `design-contract` — 双契约 F 60 冻结 + G 127 新增（X4 / FR-ALLN-100~103）。
  'test/next-dispatch-diff0.test.ts',
  'test/next-obligation-table.test.ts',
  'test/blocked-terminals.test.ts',
  'test/design-contract.test.ts',
  // ── V5-3（TASK-V5-155 / 159 / 162 · ADR-V5-010 / 009 / 006）────────────────
  // v5-3 新增的三个 Chromium 门禁（**只追加**；`CHROMIUM_GATES.length === 9` 不动 ——
  // 目录扫描按 `_v3-helpers.mjs` 标记自动纳入，本下界只让「改名 / 删除」可见）：
  //   · `law8-plaintext`  — 法八四面零明文 + 全属性扫描 + key 直写恰 1 点（FR-ALLN-023/024）；
  //   · `no-dead-end`     — 死端守护（5 类逐类 + 死端 = 0 + 双向注入反证 + S2 全链主验收）；
  //   · `auth-chip`       — 授权 chip 两态 / 零双写四词 / 黄绿点击（FR-ALLN-085~088）。
  'test/ui/law8-plaintext.mjs',
  'test/ui/no-dead-end.mjs',
  'test/ui/auth-chip.mjs',
  // V5-3 收口（TASK-V5-175）：V5-1 的注册表单源门禁（父 Feature 的 8 个新门禁之一，此前
  // 只在目录扫描里被自动纳入 —— 本下界让「改名 / 删除」也 FAIL）。
  'test/next-registry.test.ts',
  // ── V5.5-1（leaf specs-tree-v55-1-driver-layer；TASK-V55-105 / 108 / 110）──────────
  // W1+W2 的三枚新 node 门禁（时机源单源 / 四元组双向包含 / 终态词汇三段控制）。
  // 只追加 ⇒ 改名 / 删除仍 FAIL；`CHROMIUM_GATES.length === 9` 逐字不动（本叶 W1+W2 零新增
  // Chromium 门禁文件；W4 的 S0 Chromium 面走既有 `test:ui` 链，计数常量同样不改）。
  'test/driver-timings.test.ts',
  'test/driver-quadruple.test.ts',
  'test/driver-terminals.test.ts',
  // V5.5-1 W4（TASK-V55-121/122/123）：S0 node 面 + 法七扩展（node）+ S0 Chromium 面
  // （只追加 ⇒ 改名 / 删除仍 FAIL；`CHROMIUM_GATES.length === 9` 逐字不动 ——
  //  `s0-self-driven.mjs` 与 `no-dead-end.mjs` 一样走既有 `test:ui` 链）。
  'test/s0-self-driven-chain.test.ts',
  'test/law7x-ext.test.ts',
  'test/ui/s0-self-driven.mjs',
  // ── V5.5-2（leaf specs-tree-v55-2-deterministic-onboarding）主题① 新门禁（只追加）──
  'test/onboarding-deterministic.test.ts',
  // ── V5.5-3（leaf specs-tree-v55-3-ai-driven-orchestration）主题② 三枚新 node 门禁 ──────
  // R1/R2 落地、R3 收口轮（TASK-V55-320）逐项纳入受审下界（此前只被目录扫描自动纳入 ——
  // 本下界让「改名 / 删除」也 FAIL）。**只追加** ⇒ `CHROMIUM_GATES.length === 9` 逐字不动
  // （本叶零新增 Chromium 门禁文件：S0 分支 A 面走既有 `test/ui/s0-self-driven.mjs`）。
  //   · `op-three-tier`    — 派生式三档清分（`tierOf` + 物化表 + 特权恒 gesture）；
  //   · `turn-arbitration` — SW 有界仲裁（队列恒 ≤1 + 溢出明确拒绝 + 草稿回填）；
  //   · `proactivity-guard` — 护栏六常量单源 + 越限真抑制 + 载体零新增。
  'test/op-three-tier.test.ts',
  'test/turn-arbitration.test.ts',
  'test/proactivity-guard.test.ts',
  // ── V5.5F-1（leaf specs-tree-v55f-1-ref-context-and-anchor）范围底座三枚新 node 门禁 ──
  // W1/W2 落地 `ref-context-in-turn` / `law9-scope-reading`，W3 落地 `dom-ref-anchor`（TASK-V55F-108/
  // 113/121）。**只追加** ⇒ 改名 / 删除仍 FAIL；`CHROMIUM_GATES.length === 9` 逐字不动（本叶零新增
  // Chromium 门禁文件：S0′ 的 Chromium 面走既有 `test/ui/s0-self-driven.mjs`，只加断言不加文件）。
  'test/ref-context-in-turn.test.ts',
  'test/law9-scope-reading.test.ts',
  'test/dom-ref-anchor.test.ts',
  // ── V5.5F-2（leaf specs-tree-v55f-2-batch-consent）批量授权叶的 1 枚新 node 门禁 ──
  // W1 落 `batch-consent`（BC-1~7：计划构建 / 指纹 / 准入 / 回落 / 漂移 / 特权不入批 /
  // 零明文 / 中止）。**只追加** ⇒ 改名 / 删除仍 FAIL；`CHROMIUM_GATES.length === 9` 逐字
  // 不动（本叶零新增 Chromium 门禁文件：S0′ 批量段走既有 `test/ui/s0-self-driven.mjs`，
  // 只加断言不加文件）。`V55F2_NODE_GATE_FILES` 下界声明见 W3（TASK-V55F-216）。
  'test/batch-consent.test.ts',
  // ── IAN-1（leaf `specs-tree-ian-1-free-input-next`）叶1 新 node 门禁 ────────────────
  // W1/W2（TASK-IAN-116）落地 `free-input-next`（FIN-0~6），W3（TASK-IAN-121/123）扩到
  // FIN-0~9 + S0''-A node 面。**只追加** ⇒ 改名 / 删除仍 FAIL；`CHROMIUM_GATES.length === 9`
  // 逐字不动（本叶零新增 Chromium 门禁文件：S0''-A 的 Chromium 面走既有
  // `test/ui/s0-self-driven.mjs`，只加断言不加文件）。
  'test/free-input-next.test.ts',
  // ── ★ IAN-2（leaf `specs-tree-ian-2-abolish-composer`）叶2 新 node 门禁 ─────────────
  // TASK-IAN-216 落地 `law4-input-as-next`（L4-1~6：三 id DOM 零命中 / 逐 id 入册 16 /
  // 默认屏零可见输入 / 卡内可用 / 三段控制 / 真源切片）。**只追加** ⇒ 改名 / 删除仍 FAIL；
  // `CHROMIUM_GATES.length === 9` 逐字不动（叶2 零新增 Chromium 门禁文件）。
  'test/law4-input-as-next.test.ts',
  // ── ★ R8 缺陷修复轮（2026-09-25）首开 / ready 入口的新 node 门禁 ────────────────────
  // R8-1~6：入口单源 ∧ 双稳定点接线（紧随 firstRun 入口）∧ 复用既有 `'idle'`（零新增触发词
  // ⇒ 闭集仍恰 5）∧ 首开稳态必有含 free-input 终端的卡（零死端 floor）∧ 注入反证（移除入口
  // ⇒ 首开零卡必红）∧ 让位 firstRun（零双卡）。**只追加** ⇒ 改名 / 删除仍 FAIL；
  // `CHROMIUM_GATES.length === 9` 逐字不动（R8 零新增 Chromium 门禁文件）。
  'test/r8-open-next-entry.test.ts',
] as const;

/**
 * V5-3 收口（TASK-V5-175 / FR-ALLN-125）—— **父 Feature 的 8 个新门禁**。
 *
 * 逐项必须在「受审集合」内（目录扫描发现 ∧ `EXPECTED_AUDITED_FILES` 下界声明），任一未纳入
 * 即 FAIL。`CHROMIUM_GATES.length === 9` 不动（其中三个是 Chromium 门禁，五个是 node 门禁）。
 */
export const V5_NEW_GATE_FILES = [
  'test/ui/no-dead-end.mjs',
  'test/ui/law8-plaintext.mjs',
  'test/next-registry.test.ts',
  'test/next-obligation-table.test.ts',
  'test/next-dispatch-diff0.test.ts',
  'test/op-wiring.test.ts',
  'test/sw-op-mirror.test.ts',
  'test/op-protocol.test.ts',
] as const;

/** V5-1：本轮新增 / 加严的 node 门禁（发现由 `NODE_GATE_MARKER` 自动完成）。 */
export const V51_NODE_GATE_FILES = [
  'test/next-dispatch-diff0.test.ts',
  'test/next-obligation-table.test.ts',
  'test/blocked-terminals.test.ts',
  'test/design-contract.test.ts',
] as const;

/**
 * V5.5-1（leaf `specs-tree-v55-1-driver-layer`）—— **驱动者层 + 法七扩展底座**的新增 node 门禁。
 *
 * 本叶在 W1+W2（TASK-V55-101~112）落地 **3** 个 node 门禁；W4（TASK-V55-120~124）再追加
 * `s0-self-driven-chain` / `law7x-ext` 两枚（届时本下界 **只增** 至 5）。`CHROMIUM_GATES === 9`
 * 逐字不动（本轮零新增 Chromium 门禁文件）。
 */
export const V551_NODE_GATE_FILES = [
  'test/driver-timings.test.ts',
  'test/driver-quadruple.test.ts',
  'test/driver-terminals.test.ts',
  // ── W4（TASK-V55-121/123）：S0 node 面 + 法七扩展（本下界 3 → **5**，只增不减）────────
  'test/s0-self-driven-chain.test.ts',
  'test/law7x-ext.test.ts',
] as const;

/**
 * V5.5-2（leaf `specs-tree-v55-2-deterministic-onboarding`）—— **主题① 确定性系统流**的新增
 * node 门禁（`test/onboarding-deterministic.test.ts`：配置判据 3 字段 / runChat 源码序 /
 * 双源并存 / 引导流 4 步单源 / 悬置任务单源 + MAX=1 + 有效期重校验 / 回执-续接顺序）。
 *
 * 只增不减：`V551_NODE_GATE_FILES` 的 5 项逐字保留；`CHROMIUM_GATES === 9` 不动
 * （本轮零新增 Chromium 门禁文件，`law8` / `stream` 只加断言不加文件）。
 */
export const V552_NODE_GATE_FILES = ['test/onboarding-deterministic.test.ts'] as const;

/**
 * V5.5F-2（leaf `specs-tree-v55f-2-batch-consent`）—— **任务级批量授权叶**的新增 node 门禁。
 *
 * 本叶在 W1（TASK-V55F-205）落地 **1** 枚新 node 门禁 `batch-consent`（BC-1~7：计划构建 /
 * 指纹 / 准入 / 回落 / 漂移 / 特权不入批 / 审计零明文）；W3（TASK-V55F-216）收口轮**不新增**
 * Chromium 门禁文件（`s0-self-driven` / `no-dead-end` / `law8` 均**只加断言不加文件** ⇒
 * `CHROMIUM_GATES === 9` 逐字不动）。
 */
export const V55F2_NODE_GATE_FILES = ['test/batch-consent.test.ts'] as const;

/**
 * IAN-1（leaf `specs-tree-ian-1-free-input-next`）—— **流内自由输入 next 通道叶**的新增 node 门禁。
 *
 * 叶1（TASK-IAN-116/121/123）落地 **1** 枚新 node 门禁 `free-input-next`（FIN-0~9 + S0''-A node 面）；
 * 叶2 再 +1（`law4-input-as-next`）。**只增不减**：R1 的 `V5_*` / `V551_*` / `V552_*` / `V553_*` /
 * `V55F_*` 下界逐字保留；`CHROMIUM_GATES === 9` 逐字不动（本叶零新增 Chromium 门禁文件）。
 */
export const IAN1_NODE_GATE_FILES = ['test/free-input-next.test.ts'] as const;

/**
 * ★ IAN-2（leaf `specs-tree-ian-2-abolish-composer`）—— **废除 `#composer` + 法四修订叶**的
 * 新增 node 门禁（叶2 落地 **1** 枚：`law4-input-as-next`）。**只增不减**：叶1 的
 * `IAN1_NODE_GATE_FILES` 逐字保留；`CHROMIUM_GATES === 9` 逐字不动。
 */
export const IAN2_NODE_GATE_FILES = ['test/law4-input-as-next.test.ts'] as const;

/** V5.5F-2 W3 收口轮**实际改动、承载新判据**的受判门禁（只增不减；含叶1 的法九门禁重锚）。 */
export const V55F2_W3_AUDITED_FILES = [
  'test/batch-consent.test.ts',
  'test/law9-scope-reading.test.ts',
  'test/s0-self-driven-chain.test.ts',
] as const;

/** V4.5-1 W1: the node (non-Chromium) gates — discovered by {@link NODE_GATE_MARKER}. */
export const NODE_GATE_FILES = [
  'test/host-registry.test.ts',
  'test/local-act-wiring.test.ts',
  'test/settings-help.test.ts',
] as const;

/** Gates whose red-proof is static only (see the module doc's coverage limits). */
export const STATIC_ONLY_GATES = [
  'test/ui/journey.mjs',
  'test/ui/insight.mjs',
  'test/ui/l0.mjs',
  'test/ui/l2.mjs',
  'test/ui/density.mjs',
  'test/ui/hardening.mjs',
  'test/e2e/fullchain.mjs',
] as const;

/**
 * The directories that hold executable gates, and the markers that make a script a
 * gate: its own CDP client, its own failure records, or the shared v3 base
 * (`check`/`finish`, whose failure branch exits 1).
 */
const GATE_DIRS = ['test/ui', 'test/e2e'] as const;
const GATE_MARKER = /failures\.push\(|send\(method, params|_v3-helpers\.mjs/;
/**
 * V4.5-1 W1 (TASK-V45-101): the **node-gate** roots/marker.
 *
 * A node gate is a `test/*.test.ts` that declares a **per-judgement
 * `expectFailPattern` truth table** — the same falsifiability contract the Chromium
 * gates satisfy dynamically. Discovery is by marker (not by a hand-written list) so a
 * fourth node gate joins the audit automatically; `EXPECTED_AUDITED_FILES` stays the
 * literal floor that makes a rename/removal visible.
 */
const NODE_GATE_DIR = 'test' as const;
/**
 * A node gate declares a **`JUDGEMENTS` table** whose entries each carry a literal
 * `expectFailPattern`. The two-part marker (not `expectFailPattern` alone) is
 * deliberate: `test/gate-integrity.test.ts` itself *contains* the rules' violation
 * shapes as synthetic fixtures and `test/size-budget.test.ts` carries disclosure
 * `expectFailPattern`s — neither is a gate *body*, and the auditor must not audit
 * itself (that would be circular).
 */
const NODE_GATE_MARKER = /export const JUDGEMENTS[\s\S]{0,2000}?expectFailPattern\s*:/;
/** The caliber-only module has no gate body — it must NOT be pulled in. */
const NON_GATE_FILES = ['test/ui/density-metrics.mjs'] as const;

/**
 * Derive the audited set from the filesystem (N-12). A ninth gate that carries any
 * gate marker is included automatically — and therefore must pass the audit.
 * V4.5-1: node gates (`test/*.test.ts` with an `expectFailPattern` table) join too.
 */
export function discoverGateFiles(root: string): string[] {
  const found: string[] = [];
  for (const dir of GATE_DIRS) {
    let names: string[];
    try {
      names = readdirSync(resolve(root, dir));
    } catch {
      continue;
    }
    for (const name of names) {
      if (!name.endsWith('.mjs')) continue;
      const rel = `${dir}/${name}`;
      const text = readFileSync(resolve(root, rel), 'utf8');
      if (GATE_MARKER.test(text)) found.push(rel);
    }
  }
  // V4.5-1: node gates — `test/*.test.ts` declaring an `expectFailPattern` table.
  try {
    for (const name of readdirSync(resolve(root, NODE_GATE_DIR))) {
      if (!name.endsWith('.test.ts')) continue;
      const rel = `${NODE_GATE_DIR}/${name}`;
      const text = readFileSync(resolve(root, rel), 'utf8');
      if (NODE_GATE_MARKER.test(text)) found.push(rel);
    }
  } catch {
    /* a root without `test/` simply contributes nothing */
  }
  return found.sort();
}

/** The audited set for the real package (the reverse proofs re-scan their own root). */
export const AUDITED_FILES = discoverGateFiles(PKG);

export interface Violation {
  file: string;
  line: number;
  rule: 'R1a' | 'R1b' | 'R2' | 'R3';
  detail: string;
}

const NONZERO_EXIT = /process\.exitCode\s*=\s*[1-9]|process\.exit\s*\(\s*[1-9]/;
const EXIT_STATEMENT = /process\.exit\s*\(|process\.exitCode\s*=/;
const STANDALONE_AWAIT = /^await\b/;
const FAILURE_MARKER = /FAILED \(|failures\.push\(|✖ /;
const BOUNDED_AWAIT = /Promise\.(race|all|allSettled)\s*\(/;
/** Failure-block openers: `if (…failures.length…) {` and `…catch(async (…) => {`. */
const FAILURE_BLOCK_OPENER = /^\s*if\s*\(.*failures\.length.*\)\s*\{\s*$|\.catch\s*\(\s*async\b[^{]*\{\s*$/;

const isBlank = (line: string): boolean => line.trim().length === 0;

/** Indentation width of a line (spaces/tabs count 1 each — the gates use 2 spaces). */
function indentOf(line: string): number {
  const m = /^[ \t]*/.exec(line);
  return m ? m[0].length : 0;
}

/**
 * `openerIndex`'s body as line indices: every following line indented deeper than
 * the opener, stopping at the first non-blank line at the opener's indentation (the
 * closing brace / `});`). Indentation-based on purpose — the gates are consistently
 * formatted, and this avoids tokenising strings/templates that carry braces.
 */
function indentedBody(lines: string[], openerIndex: number): number[] {
  const base = indentOf(lines[openerIndex]);
  const idx: number[] = [];
  for (let k = openerIndex + 1; k < lines.length; k += 1) {
    const line = lines[k];
    if (isBlank(line)) {
      idx.push(k);
      continue;
    }
    if (indentOf(line) <= base) break;
    idx.push(k);
  }
  return idx;
}

/** Index of the nearest preceding named function declaration (the CDP client scope). */
function enclosingFunctionIndex(lines: string[], from: number): number {
  for (let k = from; k >= 0; k -= 1) {
    if (/^\s*(?:export\s+)?(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(/.test(lines[k])) return k;
  }
  return -1;
}

/**
 * Blank out comments (`//…`, `/*…*\/`) while preserving line structure, so a rule
 * can never be satisfied by *commented-out* code (N-02). String/template contents
 * are kept: the R3 close check legitimally matches `'close'`.
 */
function stripComments(source: string): string {
  const out = [...source];
  let i = 0;
  let state: 'code' | 'line' | 'block' | 'sq' | 'dq' | 'tpl' = 'code';
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    if (state === 'code') {
      if (ch === '/' && next === '/') {
        out[i] = ' ';
        out[i + 1] = ' ';
        i += 2;
        state = 'line';
        continue;
      }
      if (ch === '/' && next === '*') {
        out[i] = ' ';
        out[i + 1] = ' ';
        i += 2;
        state = 'block';
        continue;
      }
      if (ch === "'") state = 'sq';
      else if (ch === '"') state = 'dq';
      else if (ch === '`') state = 'tpl';
      i += 1;
      continue;
    }
    if (state === 'line') {
      if (ch === '\n') state = 'code';
      else out[i] = ' ';
      i += 1;
      continue;
    }
    if (state === 'block') {
      if (ch === '*' && next === '/') {
        out[i] = ' ';
        out[i + 1] = ' ';
        i += 2;
        state = 'code';
        continue;
      }
      if (ch !== '\n') out[i] = ' ';
      i += 1;
      continue;
    }
    // inside a string/template: keep it verbatim (no comment can start there)
    if (ch === '\\') {
      i += 2;
      continue;
    }
    if (state === 'sq' && ch === "'") state = 'code';
    else if (state === 'dq' && ch === '"') state = 'code';
    else if (state === 'tpl' && ch === '`') state = 'code';
    i += 1;
  }
  return out.join('');
}

/** Index of the nearest preceding substantive (non-blank) line. */
function prevSubstantive(lines: string[], from: number): number {
  for (let i = from - 1; i >= 0; i -= 1) {
    if (isBlank(lines[i])) continue;
    return i;
  }
  return -1;
}

/** `await foo(` → `foo`; `await Promise.race(` → `Promise.race`. */
function awaitedCallee(statement: string): string | null {
  const m = /^await\s+([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\(/.exec(statement.trim());
  return m ? m[1] : null;
}

/**
 * Does the callee's own definition install a hard `setTimeout(... process.exit ...)`?
 * The body is the **real** indentation-delimited function body of the clean source.
 */
function calleeIsSelfBounding(clean: string, callee: string): boolean {
  const name = callee.split('.')[0];
  const lines = clean.split('\n');
  const decl = lines.findIndex((line) => new RegExp(`^\\s*(?:async\\s+)?function\\s+${name}\\s*\\(`).test(line));
  if (decl < 0) return false;
  const body = indentedBody(lines, decl).map((k) => lines[k]).join('\n');
  for (let at = body.indexOf('setTimeout('); at >= 0; at = body.indexOf('setTimeout(', at + 1)) {
    // The timer callback must itself exit the process (a wall-clock escape).
    if (/process\.exit\s*\(/.test(body.slice(at, at + 400))) return true;
  }
  return false;
}

/**
 * The auditor. Pure function of `(file name, source text)` so the same rules can be
 * driven at the real files, at synthetic fixtures and at an injected temp copy.
 */
export function auditGateSource(file: string, source: string): Violation[] {
  const clean = stripComments(source);
  const lines = clean.split('\n');
  const rawLines = source.split('\n');
  const out: Violation[] = [];

  // ── R1a: exit-code primacy ────────────────────────────────────────────────
  // (1) block/window scan: inside a failure block, the exit code must be fixed
  //     before the block's FIRST standalone await (N-01 — the one-line lookback
  //     used to be bypassable by inserting any statement between them).
  for (let i = 0; i < lines.length; i += 1) {
    if (!FAILURE_BLOCK_OPENER.test(lines[i])) continue;
    const body = indentedBody(lines, i);
    const firstAwait = body.find((k) => STANDALONE_AWAIT.test(lines[k].trim()));
    if (firstAwait === undefined) continue;
    const fixedBefore = body.some((k) => k < firstAwait && NONZERO_EXIT.test(lines[k]));
    if (fixedBefore) continue;
    out.push({
      file,
      line: firstAwait + 1,
      rule: 'R1a',
      detail: `失败块（第 ${i + 1} 行起）内第一条独立 await 之前未定死退出码（${rawLines[firstAwait]?.trim() ?? ''}）`,
    });
  }
  // (2) adjacency scan (kept): a standalone await directly above an exit is only
  //     acceptable when bounded or when the exit code is already fixed.
  for (let i = 0; i < lines.length; i += 1) {
    if (!EXIT_STATEMENT.test(lines[i])) continue;
    const j = prevSubstantive(lines, i);
    if (j < 0 || !STANDALONE_AWAIT.test(lines[j].trim())) continue;
    const statement = lines.slice(j, i + 1).join('\n');
    if (BOUNDED_AWAIT.test(statement)) continue;
    const k = prevSubstantive(lines, j);
    const exitCodeFixed = k >= 0 && NONZERO_EXIT.test(lines[k]);
    if (exitCodeFixed) continue;
    out.push({
      file,
      line: j + 1,
      rule: 'R1a',
      detail: `第 ${j + 1} 行的独立 await 挡在退出码赋值之前且未加超时（第 ${i + 1} 行才退出；前一行：${lines[k]?.trim() ?? '<无>'}）`,
    });
  }
  // The two R1a clauses may describe the same await — report each await once.
  const seenAwait = new Set<number>();
  const deduped: Violation[] = [];
  for (const v of out) {
    if (v.rule === 'R1a') {
      if (seenAwait.has(v.line)) continue;
      seenAwait.add(v.line);
    }
    deduped.push(v);
  }
  out.length = 0;
  out.push(...deduped);

  // ── R1b: the "exit code already fixed" escape must be a *bounded* await ───
  for (let i = 0; i < lines.length; i += 1) {
    if (!STANDALONE_AWAIT.test(lines[i].trim())) continue;
    const k = prevSubstantive(lines, i);
    if (k < 0 || !NONZERO_EXIT.test(lines[k])) continue;
    // It relies on R1a's escape clause ⇒ the callee must self-terminate.
    const callee = awaitedCallee(lines[i]);
    if (!callee) continue;
    if (calleeIsSelfBounding(clean, callee)) continue;
    out.push({
      file,
      line: i + 1,
      rule: 'R1b',
      detail: `第 ${i + 1} 行的 await ${callee}(...) 依赖「退出码已定死」，但 ${callee}() 自身没有 setTimeout 硬上限（注释内同字面量不算）`,
    });
  }

  // ── R2: failure count ↔ exit code ────────────────────────────────────────
  if (FAILURE_MARKER.test(clean)) {
    const hasExit =
      /process\.exit\s*\(\s*[1-9]/.test(clean)
      || /process\.exitCode\s*=\s*[1-9]/.test(clean)
      || /finish\(/.test(clean);
    const usesHelper = /from\s+['"]\.\/_v3-helpers\.mjs['"]/.test(clean);
    const helperOk = !/finish\(/.test(clean) || usesHelper || file.endsWith('_v3-helpers.mjs');
    if (!hasExit || !helperOk) {
      out.push({
        file,
        line: 1,
        rule: 'R2',
        detail: `存在失败计数标记（FAILED/✖/failures.push）但没有可用的退出码路径（exit(1)/exitCode=1/finish()${
          usesHelper ? ' + _v3-helpers 导入' : ''
        }）`,
      });
    }
    if (/finish\(/.test(clean) && !file.endsWith('_v3-helpers.mjs')) {
      // The helper's own failure branch must really exit 1.
      const helperPath = resolve(PKG, 'test/ui/_v3-helpers.mjs');
      const helper = stripComments(readFileSync(helperPath, 'utf8'));
      if (!/if \(failures\.length\)[\s\S]{0,200}?process\.exit\(1\);/.test(helper)) {
        out.push({ file, line: 1, rule: 'R2', detail: 'finish() 的失败分支未同步 process.exit(1)' });
      }
    }
  }

  // ── R3: EVERY CDP send() must be bounded + its own scope must reject on close ─
  for (let i = 0; i < lines.length; i += 1) {
    if (!/send\(method, params/.test(lines[i])) continue;
    const sendBody = indentedBody(lines, i).map((k) => lines[k]).join('\n');
    if (!/readyState/.test(sendBody)) {
      out.push({ file, line: i + 1, rule: 'R3', detail: `第 ${i + 1} 行的 send() 缺 readyState 拒答（对 CLOSED socket 会静默挂死）` });
    }
    if (!/setTimeout\(/.test(sendBody)) {
      out.push({ file, line: i + 1, rule: 'R3', detail: `第 ${i + 1} 行的 send() 缺 setTimeout 超时拒答` });
    }
    const fnIndex = enclosingFunctionIndex(lines, i);
    if (fnIndex < 0) {
      out.push({ file, line: i + 1, rule: 'R3', detail: `第 ${i + 1} 行的 send() 不在具名函数作用域内（无法证明 close 拒结作用于其 pending 表）` });
      continue;
    }
    const scope = indentedBody(lines, fnIndex).map((k) => lines[k]).join('\n');
    if (!/new Map\(\)/.test(scope) || !/pending/.test(scope)) {
      out.push({ file, line: i + 1, rule: 'R3', detail: `第 ${i + 1} 行的 send() 所属作用域（第 ${fnIndex + 1} 行）没有 pending Map` });
      continue;
    }
    const closeIdx = /addEventListener\(\s*['"]close['"]/.exec(scope)?.index ?? -1;
    if (closeIdx < 0) {
      out.push({ file, line: i + 1, rule: 'R3', detail: `第 ${i + 1} 行的 send() 所属作用域的 socket close 未拒结 pending（F-01 的根因之一）` });
      continue;
    }
    const end = scope.indexOf('});', closeIdx);
    const handler = scope.slice(closeIdx, end > closeIdx ? end + 3 : closeIdx + 300);
    if (!/pending/.test(handler) || !/reject\(/.test(handler)) {
      out.push({
        file,
        line: i + 1,
        rule: 'R3',
        detail: `第 ${i + 1} 行的 send() 所属作用域的 close 监听未拒结**本作用域的 pending**（拒结无关对象不算）`,
      });
    }
  }

  return out;
}

function auditRoot(root: string, files: readonly string[]): Violation[] {
  const out: Violation[] = [];
  for (const file of files) {
    const path = resolve(root, file);
    let source: string;
    try {
      source = readFileSync(path, 'utf8');
    } catch (err) {
      out.push({ file, line: 0, rule: 'R2', detail: `无法读取（${err instanceof Error ? err.message : String(err)}）` });
      continue;
    }
    out.push(...auditGateSource(file, source));
  }
  return out;
}

/** Audit every gate the root's directories declare (N-12: the set is scanned). */
function auditDiscovered(root: string): Violation[] {
  return auditRoot(root, discoverGateFiles(root));
}

const fmt = (vs: Violation[]) => vs.map((v) => `  ${v.file}:${v.line} [${v.rule}] ${v.detail}`).join('\n');

// ── 0. the audited set is DERIVED from the filesystem (N-12) ─────────────────
test('元门禁：受审集合由目录扫描推导（新门禁自动纳入；已知门禁改名/删除必须 FAIL）', () => {
  for (const root of ROOTS) {
    const discovered = discoverGateFiles(root);
    assert.ok(discovered.length > 0, `目录扫描不得为空 @ ${root}（否则受审集合是空转）`);
    // The set may grow (a new gate is auto-included) but never shrink: every known
    // gate/driver must still be found by the scan.
    for (const file of EXPECTED_AUDITED_FILES) {
      assert.ok(
        discovered.includes(file),
        `${file} 未被目录扫描纳入 —— 门禁被改名/删除时本元门禁必须失败（集合不得静默收缩）：实际 ${discovered.join(', ')}`,
      );
    }
    for (const file of discovered) {
      assert.ok(existsSync(resolve(root, file)), `${file} 不存在（目录扫描给出了幽灵条目）`);
    }
    for (const file of NON_GATE_FILES) {
      assert.ok(!discovered.includes(file), `${file} 是纯口径模块（无门禁体），不得被误纳入受审集合`);
    }
  }
  assert.equal(CHROMIUM_GATES.length, 9, 'Chromium 门禁必须恰好 9 个（journey/insight/binding/l0/l1/l2/density/hardening/e2e；v3-3 新增 l2）');
});

// ── 0a. V4.5-1 W1: the node-gate half of the audited set is discovered too ──
test('元门禁（V4.5-1 W1）：node 门禁由 JUDGEMENTS 标记自动纳入（CHROMIUM_GATES 仍为 9）', () => {
  const discovered = discoverGateFiles(PKG);
  for (const file of NODE_GATE_FILES) {
    assert.ok(discovered.includes(file), `${file} 未被 node 门禁扫描纳入（判据表 + expectFailPattern 标记失效）`);
    assert.ok(EXPECTED_AUDITED_FILES.includes(file), `${file} 必须在 EXPECTED_AUDITED_FILES 的下界声明里（只追加）`);
  }
  // 3 个新 node 门禁都必须是**真门禁**（判据表非空 + 每条带 expectFailPattern 字面）。
  for (const file of NODE_GATE_FILES) {
    const text = readFileSync(resolve(PKG, file), 'utf8');
    assert.ok(/export const JUDGEMENTS/.test(text), `${file} 必须导出 JUDGEMENTS 判据表`);
    assert.ok((text.match(/expectFailPattern\s*:/g) ?? []).length >= 3, `${file} 每条判据必须声明 expectFailPattern`);
  }
  // CHROMIUM_GATES 计数不变（node 门禁不是 Chromium 门禁）。
  assert.equal(CHROMIUM_GATES.length, 9);
});

// ── 0a-2. V5-1: the four new node gates join the audited set (marker-discovered) ──
test('元门禁（V5-1）：四个新 node 门禁由 JUDGEMENTS 标记自动纳入（CHROMIUM_GATES 仍为 9）', () => {
  const discovered = discoverGateFiles(PKG);
  for (const file of V51_NODE_GATE_FILES) {
    assert.ok(discovered.includes(file), `${file} 未被 node 门禁扫描纳入（判据表 + expectFailPattern 标记失效）`);
    assert.ok((EXPECTED_AUDITED_FILES as readonly string[]).includes(file), `${file} 必须在 EXPECTED_AUDITED_FILES 的下界声明里（只追加）`);
    const text = readFileSync(resolve(PKG, file), 'utf8');
    assert.ok(/export const JUDGEMENTS/.test(text), `${file} 必须导出 JUDGEMENTS 判据表`);
    assert.ok((text.match(/expectFailPattern\s*:/g) ?? []).length >= 3, `${file} 每条判据必须声明 expectFailPattern`);
  }
  // 既有下界仍是子集（集合只增不减）。
  for (const file of NODE_GATE_FILES) {
    assert.ok(discovered.includes(file), `v4.5-1 的 node 门禁 ${file} 不得因本次追加而脱离受审集合`);
  }
  assert.equal(CHROMIUM_GATES.length, 9, 'Chromium 门禁计数常量不得改动（无新增 Chromium 门禁文件）');
});

// ── 0a-2. V5-3 closeout: the parent Feature's eight new gates are all audited ─
test('元门禁（V5-3 收口）：父 Feature 的 8 个新门禁逐项在受审集合内（只增不减）', () => {
  const discovered = discoverGateFiles(PKG);
  const problems: string[] = [];
  for (const file of V5_NEW_GATE_FILES) {
    if (!existsSync(resolve(PKG, file))) problems.push(`${file}: 文件不存在（新增门禁缺失）`);
    if (!discovered.includes(file)) problems.push(`${file}: 未被目录扫描纳入（判据标记失效）`);
    if (!(EXPECTED_AUDITED_FILES as readonly string[]).includes(file)) problems.push(`${file}: 不在 EXPECTED_AUDITED_FILES 下界声明里（改名/删除不可见）`);
  }
  assert.deepEqual(problems, [], `父 Feature 的新门禁未全部纳入受审集合：\n${problems.join('\n')}`);
  assert.equal(V5_NEW_GATE_FILES.length, 8, '父 Feature 的新门禁恰 8 个（逐项在册）');
  assert.equal(CHROMIUM_GATES.length, 9, 'Chromium 门禁计数常量不得改动（其中 3 个新门禁是 Chromium，5 个是 node）');
  console.log(`  ℹ V5 新门禁受审：8/8 在册（目录扫描 ∧ 下界声明双命中）`);
});

// ── 0a-3. V5.5-1: the driver-layer leaf's new node gates join the audited set ─
test('元门禁（V5.5-1）：驱动者层叶的新增 node 门禁逐项在受审集合内（只增不减，CHROMIUM_GATES 仍为 9）', () => {
  const discovered = discoverGateFiles(PKG);
  const problems: string[] = [];
  for (const file of V551_NODE_GATE_FILES) {
    if (!existsSync(resolve(PKG, file))) problems.push(`${file}: 文件不存在（新增门禁缺失）`);
    if (!discovered.includes(file)) problems.push(`${file}: 未被目录扫描纳入（JUDGEMENTS 判据标记失效）`);
    if (!(EXPECTED_AUDITED_FILES as readonly string[]).includes(file)) problems.push(`${file}: 不在 EXPECTED_AUDITED_FILES 下界声明里（改名/删除不可见）`);
    const text = readFileSync(resolve(PKG, file), 'utf8');
    if (!/export const JUDGEMENTS/.test(text)) problems.push(`${file}: 必须导出 JUDGEMENTS 判据表`);
    if ((text.match(/expectFailPattern\s*:/g) ?? []).length < 3) problems.push(`${file}: 每条判据必须声明 expectFailPattern（≥3）`);
  }
  assert.deepEqual(problems, [], `V5.5-1 新门禁未全部纳入受审集合：\n${problems.join('\n')}`);
  // 本叶 W1+W2 落地 3 枚；W4 只增（届时 5 枚）⇒ 本下界是**只增不减**的下界。
  assert.ok(V551_NODE_GATE_FILES.length >= 3, 'V5.5-1 新增 node 门禁下界不得低于 3（本叶 W4 再追加 2 枚）');
  // 反证：移出一项 ⇒ 判据必红（不得恒真）。
  const forged = [...V551_NODE_GATE_FILES, 'test/ghost-gate.test.ts'];
  const forgedProblems: string[] = [];
  for (const file of forged) {
    if (!discovered.includes(file)) forgedProblems.push(`${file}: 未被目录扫描纳入`);
  }
  assert.ok(forgedProblems.length > 0, '移出/新增一个不在受审集合的门禁必须判红（判据非恒真）');
  // 既有下界仍是子集（集合只增不减）。
  for (const file of V5_NEW_GATE_FILES) assert.ok(discovered.includes(file), `${file} 不得因本次追加而脱离受审集合`);
  assert.equal(CHROMIUM_GATES.length, 9, 'CHROMIUM_GATES === 9 逐字（本叶 W1+W2 零新增 Chromium 门禁文件）');
  console.log(`  ℹ V5.5-1 新门禁受审：${V551_NODE_GATE_FILES.length}/${V551_NODE_GATE_FILES.length} 在册（目录扫描 ∧ 下界声明双命中）`);
});

// ── 0a-4. V5.5-2: the theme① leaf's new node gate joins the audited set ─────
test('元门禁（V5.5-2）：主题① 叶的新增 node 门禁在受审集合内（只增不减，CHROMIUM_GATES 仍为 9）', () => {
  const discovered = discoverGateFiles(PKG);
  const problems: string[] = [];
  for (const file of V552_NODE_GATE_FILES) {
    if (!existsSync(resolve(PKG, file))) problems.push(`${file}: 文件不存在（新增门禁缺失）`);
    if (!discovered.includes(file)) problems.push(`${file}: 未被目录扫描纳入（JUDGEMENTS 判据标记失效）`);
    if (!(EXPECTED_AUDITED_FILES as readonly string[]).includes(file)) problems.push(`${file}: 不在 EXPECTED_AUDITED_FILES 下界声明里（改名/删除不可见）`);
    const text = readFileSync(resolve(PKG, file), 'utf8');
    if (!/export const JUDGEMENTS/.test(text)) problems.push(`${file}: 必须导出 JUDGEMENTS 判据表`);
    if ((text.match(/expectFailPattern\s*:/g) ?? []).length < 3) problems.push(`${file}: 每条判据必须声明 expectFailPattern（≥3）`);
  }
  assert.deepEqual(problems, [], `V5.5-2 新门禁未全部纳入受审集合：\n${problems.join('\n')}`);
  assert.ok(V552_NODE_GATE_FILES.length >= 1, 'V5.5-2 新增 node 门禁下界不得低于 1');
  const forged = [...V552_NODE_GATE_FILES, 'test/ghost-gate.test.ts'];
  assert.ok(forged.some((f) => !discovered.includes(f)), '移出/新增一个不在受审集合的门禁必须判红（判据非恒真）');
  for (const file of V551_NODE_GATE_FILES) assert.ok(discovered.includes(file), `${file} 不得因本次追加而脱离受审集合`);
  assert.equal(CHROMIUM_GATES.length, 9, 'CHROMIUM_GATES === 9 逐字（本轮零新增 Chromium 门禁文件）');
  console.log(`  ℹ V5.5-2 新门禁受审：${V552_NODE_GATE_FILES.length}/${V552_NODE_GATE_FILES.length} 在册（目录扫描 ∧ 下界声明双命中）`);
});

// ── 0a-4b. V5.5F-2: the batch-consent leaf's new node gate joins the audited set ──
test('元门禁（V5.5F-2）：批量授权叶的新增 node 门禁在受审集合内（只增不减，CHROMIUM_GATES 仍为 9）', () => {
  const discovered = discoverGateFiles(PKG);
  const problems: string[] = [];
  for (const file of V55F2_NODE_GATE_FILES) {
    if (!existsSync(resolve(PKG, file))) problems.push(`${file}: 文件不存在（新增门禁缺失）`);
    if (!discovered.includes(file)) problems.push(`${file}: 未被目录扫描纳入（JUDGEMENTS 判据标记失效）`);
    if (!(EXPECTED_AUDITED_FILES as readonly string[]).includes(file)) problems.push(`${file}: 不在 EXPECTED_AUDITED_FILES 下界声明里（改名/删除不可见）`);
    const text = readFileSync(resolve(PKG, file), 'utf8');
    if (!/export const JUDGEMENTS/.test(text)) problems.push(`${file}: 必须导出 JUDGEMENTS 判据表`);
    if ((text.match(/expectFailPattern\s*:/g) ?? []).length < 3) problems.push(`${file}: 每条判据必须声明 expectFailPattern（≥3）`);
  }
  assert.deepEqual(problems, [], `V5.5F-2 新门禁未全部纳入受审集合：\n${problems.join('\n')}`);
  assert.ok(V55F2_NODE_GATE_FILES.length >= 1, 'V5.5F-2 新增 node 门禁下界不得低于 1（batch-consent）');
  const forged = [...V55F2_NODE_GATE_FILES, 'test/ghost-gate.test.ts'];
  assert.ok(forged.some((f) => !discovered.includes(f)), '新增一个不在受审集合的门禁必须判红（判据非恒真）');
  for (const file of V551_NODE_GATE_FILES) assert.ok(discovered.includes(file), `${file} 不得因本次追加而脱离受审集合`);
  assert.equal(CHROMIUM_GATES.length, 9, 'CHROMIUM_GATES === 9 逐字（收口轮零新增 Chromium 门禁文件）');
  console.log(`  ℹ V5.5F-2 新门禁受审：${V55F2_NODE_GATE_FILES.length}/${V55F2_NODE_GATE_FILES.length} 在册（目录扫描 ∧ 下界声明双命中）`);
});

test('元门禁（V5.5F-2 W3）：本轮承载新判据的门禁仍在受审集合内（只增不减，CHROMIUM_GATES 仍为 9）', () => {
  const discovered = discoverGateFiles(PKG);
  const problems: string[] = [];
  for (const file of V55F2_W3_AUDITED_FILES) {
    if (!existsSync(resolve(PKG, file))) problems.push(`${file}: 文件不存在`);
    if (!discovered.includes(file)) problems.push(`${file}: 未被目录扫描纳入（判据标记失效）`);
    if (!(EXPECTED_AUDITED_FILES as readonly string[]).includes(file)) problems.push(`${file}: 不在 EXPECTED_AUDITED_FILES 下界声明里`);
  }
  assert.deepEqual(problems, [], `V5.5F-2 W3 受判门禁未全部在册：\n${problems.join('\n')}`);
  // 反证：把任一枚从集合里拿掉 ⇒ 同一判据必红（判据非恒真）。
  const dropped = V55F2_W3_AUDITED_FILES.filter((f) => f !== 'test/batch-consent.test.ts');
  assert.ok(dropped.length < V55F2_W3_AUDITED_FILES.length);
  assert.equal(CHROMIUM_GATES.length, 9, 'CHROMIUM_GATES === 9 逐字');
});

// ── 0b. N-12's own reverse proof: a fresh gate file is auto-audited ──────────

/**
 * V5.5-2 **W5（TASK-V55-213~216）** —— 收口轮**不新增**门禁文件（S0 分支 B 必判项 /
 * 两场景 / 取消非死端都落在**既有**门禁文件上，只增不减）。因此本轮的受审判据 = 「本轮
 * 实际改动、承载新判据的两枚门禁仍在受审集合内」+ 反证（把任一枚从集合里拿掉 ⇒ 必红）；
 * `CHROMIUM_GATES === 9` 仍逐字不动。
 */
export const V552_W5_AUDITED_FILES = [
  'test/onboarding-deterministic.test.ts',
  'test/s0-self-driven-chain.test.ts',
] as const;

test('元门禁（V5.5-2 W5）：本轮承载新判据的门禁仍在受审集合内（只增不减，CHROMIUM_GATES 仍为 9）', () => {
  const discovered = discoverGateFiles(PKG);
  const problems: string[] = [];
  for (const file of V552_W5_AUDITED_FILES) {
    if (!existsSync(resolve(PKG, file))) problems.push(`${file}: 文件不存在`);
    if (!discovered.includes(file)) problems.push(`${file}: 未被目录扫描纳入（JUDGEMENTS 判据标记失效）`);
    if (!(EXPECTED_AUDITED_FILES as readonly string[]).includes(file)) problems.push(`${file}: 不在 EXPECTED_AUDITED_FILES 下界声明里`);
  }
  assert.deepEqual(problems, [], `V5.5-2 W5 受审集合缺项：\n${problems.join('\n')}`);
  assert.ok(V552_W5_AUDITED_FILES.includes('test/onboarding-deterministic.test.ts'), '`onboarding-deterministic` 必须仍在本轮的受审声明里');
  // 反证：从受审集合里拿掉任一枚 ⇒ 必红（判据不是恒真）。
  for (const file of V552_W5_AUDITED_FILES) {
    const forgedDiscovered = discovered.filter((f) => f !== file);
    assert.ok(!forgedDiscovered.includes(file), `${file}: 从受审集合拿掉后必须判红`);
  }
  // W1~W4 与 V5.5-1 的受审下界不得因本轮追加而收缩。
  for (const file of [...V552_NODE_GATE_FILES, ...V551_NODE_GATE_FILES]) {
    assert.ok(discovered.includes(file), `${file} 不得脱离受审集合`);
  }
  assert.equal(CHROMIUM_GATES.length, 9, 'CHROMIUM_GATES === 9 逐字（本轮零新增 Chromium 门禁文件）');
  console.log(`  ℹ V5.5-2 W5 受审：${V552_W5_AUDITED_FILES.length}/${V552_W5_AUDITED_FILES.length} 在册（既有门禁只增不减）`);
});

/**
 * V5.5-3 **W5（TASK-V55-316~320）** —— 本叶的三枚 node 门禁 + 本轮承载新判据的既有门禁。
 *
 * `CHROMIUM_GATES === 9` 仍逐字不动（本叶零新增 Chromium 门禁文件；S0 分支 A 端到端落在
 * **既有** `test/ui/s0-self-driven.mjs`，只增判据不加文件）。
 */
export const V553_NODE_GATE_FILES = [
  'test/op-three-tier.test.ts',
  'test/turn-arbitration.test.ts',
  'test/proactivity-guard.test.ts',
] as const;

/** 本轮（W5）承载新判据的既有门禁（只增不减；都不新增 Chromium 门禁文件）。 */
export const V553_W5_AUDITED_FILES = [
  'test/op-three-tier.test.ts',
  'test/turn-arbitration.test.ts',
  'test/proactivity-guard.test.ts',
  'test/s0-self-driven-chain.test.ts',
  'test/ui/s0-self-driven.mjs',
] as const;

test('元门禁（V5.5-3 W5）：本叶三枚新 node 门禁逐项在受审集合内（只增不减，CHROMIUM_GATES 仍为 9）', () => {
  const discovered = discoverGateFiles(PKG);
  const problems: string[] = [];
  for (const file of V553_NODE_GATE_FILES) {
    if (!existsSync(resolve(PKG, file))) problems.push(`${file}: 文件不存在（新门禁缺失）`);
    if (!discovered.includes(file)) problems.push(`${file}: 未被目录扫描纳入（JUDGEMENTS 判据标记失效）`);
    if (!(EXPECTED_AUDITED_FILES as readonly string[]).includes(file)) problems.push(`${file}: 不在 EXPECTED_AUDITED_FILES 下界声明里（改名/删除不可见）`);
    const text = readFileSync(resolve(PKG, file), 'utf8');
    if (!/export const JUDGEMENTS/.test(text)) problems.push(`${file}: 必须导出 JUDGEMENTS 判据表`);
    if ((text.match(/expectFailPattern\s*:/g) ?? []).length < 3) problems.push(`${file}: 每条判据必须声明 expectFailPattern（≥3）`);
  }
  assert.deepEqual(problems, [], `V5.5-3 新门禁未全部纳入受审集合：\n${problems.join('\n')}`);
  assert.equal(V553_NODE_GATE_FILES.length, 3, '本叶新增 node 门禁下界为 3（tasks.md §5）');
  // 本轮承载新判据的门禁仍全部在册（只增不减）。
  for (const file of V553_W5_AUDITED_FILES) {
    assert.ok(discovered.includes(file), `${file} 必须仍在受审集合内（本轮改动过的门禁不得脱离）`);
  }
  // 反证：把任一枚从受审集合里拿掉 ⇒ 必红（判据不是恒真）。
  for (const file of V553_W5_AUDITED_FILES) {
    assert.ok(!discovered.filter((f) => f !== file).includes(file), `${file}: 拿掉后必须判红`);
  }
  // 前序受审下界不得因本轮追加而收缩。
  for (const file of [...V552_NODE_GATE_FILES, ...V551_NODE_GATE_FILES]) {
    assert.ok(discovered.includes(file), `${file} 不得脱离受审集合`);
  }
  assert.equal(CHROMIUM_GATES.length, 9, 'CHROMIUM_GATES === 9 逐字（本叶零新增 Chromium 门禁文件）');
  console.log(`  ℹ V5.5-3 新门禁受审：${V553_NODE_GATE_FILES.length}/${V553_NODE_GATE_FILES.length} 在册（目录扫描 ∧ 下界声明双命中）`);
});

test('元门禁反证：目录中新增一个「有失败计数、无退出码」的门禁 ⇒ 自动纳入且必须报红', () => {
  const tmp = mkdtempSync(resolve(tmpdir(), 'sdc-gates-new-'));
  for (const file of AUDITED_FILES) {
    const dst = resolve(tmp, file);
    mkdirSync(dirname(dst), { recursive: true });
    copyFileSync(resolve(PKG, file), dst);
  }
  // A ninth gate that nobody registered: it is discovered by the marker scan and
  // must therefore be audited (and fail — it records failures with no exit path).
  writeFileSync(
    resolve(tmp, 'test/ui/zzz-ninth-gate.mjs'),
    ['const failures = [];', 'console.log(`zzz FAILED (${failures.length}):`);', 'failures.push("x");', ''].join('\n'),
    'utf8',
  );
  const discovered = discoverGateFiles(tmp);
  assert.ok(discovered.includes('test/ui/zzz-ninth-gate.mjs'), `新门禁未被自动纳入：${discovered.join(', ')}`);
  const violations = auditDiscovered(tmp);
  assert.ok(
    violations.some((v) => v.rule === 'R2' && v.file === 'test/ui/zzz-ninth-gate.mjs'),
    `自动纳入的新门禁必须被审计（R2）：\n${fmt(violations)}`,
  );
  assert.deepEqual(auditDiscovered(PKG), [], '真实根在扫描扩展试验后仍必须干净（本测试不改仓库文件）');
});

// ── 1. the real gates pass the audit ────────────────────────────────────────
test('元门禁 R1a/R1b/R2/R3：真实门禁脚本全部通过（失败路径有界、失败计数耦合退出码、CDP send 有界）', () => {
  // `SDC_GATES_ROOT` is the meta-gate's own reverse-proof seam: pointing it at a
  // copy that carries a defect shape must turn THIS test red (non-zero exit).
  for (const root of ROOTS) {
    const violations = auditDiscovered(root);
    assert.deepEqual(violations, [], `门禁自身完整性缺陷 @ ${root}：\n${fmt(violations)}`);
  }
});

// ── 2. falsifiability: the detector must fire on the historical F-01 shape ──
test('元门禁反证（合成夹具）：F-01 历史形态（await 挡在退出码之前）必须被判 R1a', () => {
  const bad = [
    'async function main() {',
    '  if (failures.length) {',
    "    console.error(`gate FAILED (${failures.length}):`);",
    "    await dumpDiagnostics('main: assertions failed');",
    '    process.exit(1);',
    '  }',
    '}',
  ].join('\n');
  const r1a = auditGateSource('synthetic-bad.mjs', bad).filter((v) => v.rule === 'R1a');
  assert.equal(r1a.length, 1, `历史形态必须恰好命中 1 条 R1a，实际 ${r1a.length}：\n${fmt(r1a)}`);

  const good = [
    'async function dumpDiagnostics(reason) {',
    '  const __hardStop = setTimeout(() => { process.exit(1); }, 15_000);',
    '  try {',
    '    await capture(reason);',
    '  } catch (err) {',
    '    console.error(err);',
    '  } finally {',
    '    clearTimeout(__hardStop);',
    '  }',
    '}',
    'async function main() {',
    '  if (failures.length) {',
    "    console.error(`gate FAILED (${failures.length}):`);",
    '    process.exitCode = 1;',
    "    await dumpDiagnostics('main: assertions failed');",
    '    process.exit(1);',
    '  }',
    '}',
  ].join('\n');
  const goodViolations = auditGateSource('synthetic-good.mjs', good);
  assert.deepEqual(goodViolations, [], `已防御形态不得误报：\n${fmt(goodViolations)}`);

  // ... and the "exit code fixed but the await is unbounded" shape must trip R1b.
  const badR1b = [
    'async function dumpDiagnostics(reason) {',
    '  console.error(reason);',
    '}',
    'async function main() {',
    '  if (failures.length) {',
    '    process.exitCode = 1;',
    "    await dumpDiagnostics('main: assertions failed');",
    '    process.exit(1);',
    '  }',
    '}',
  ].join('\n');
  const r1b = auditGateSource('synthetic-unbounded.mjs', badR1b).filter((v) => v.rule === 'R1b');
  assert.equal(r1b.length, 1, `依赖「退出码已定死」但没有硬上限的 await 必须命中 R1b：\n${fmt(r1b)}`);
});

// ── 2b. N-01/N-02: the two demonstrated blind spots must now be caught ──────
/**
 * V5.5F-1（leaf `specs-tree-v55f-1-ref-context-and-anchor`）—— **范围底座叶的三枚 node 门禁**。
 *
 * `CHROMIUM_GATES.length === 9` 逐字不动（本叶零新增 Chromium 门禁文件；S0′ 的 Chromium 面
 * 只加断言不加文件）。
 */
export const V55F1_NODE_GATE_FILES = [
  'test/ref-context-in-turn.test.ts',
  'test/law9-scope-reading.test.ts',
  'test/dom-ref-anchor.test.ts',
] as const;

test('元判据（V5.5F-1）：范围底座叶的三枚新 node 门禁逐项在受审集合内（下界 ≥3，CHROMIUM_GATES 仍为 9）', () => {
  const discovered = discoverGateFiles(PKG);
  const problems: string[] = [];
  for (const file of V55F1_NODE_GATE_FILES) {
    if (!existsSync(resolve(PKG, file))) problems.push(`${file}: 文件不存在（新门禁缺失）`);
    if (!discovered.includes(file)) problems.push(`${file}: 未被目录扫描纳入（JUDGEMENTS 判据标记失效）`);
    if (!(EXPECTED_AUDITED_FILES as readonly string[]).includes(file)) problems.push(`${file}: 不在 EXPECTED_AUDITED_FILES 下界声明里（改名/删除不可见）`);
    const text = readFileSync(resolve(PKG, file), 'utf8');
    if (!/export const JUDGEMENTS/.test(text)) problems.push(`${file}: 必须导出 JUDGEMENTS 判据表`);
    if ((text.match(/expectFailPattern\s*:/g) ?? []).length < 3) problems.push(`${file}: 每条判据必须声明 expectFailPattern（≥3）`);
  }
  assert.deepEqual(problems, [], `V5.5F-1 新门禁未全部纳入受审集合：\n${problems.join('\n')}`);
  assert.ok(V55F1_NODE_GATE_FILES.length >= 3, 'V5.5F-1 新增 node 门禁下界不得低于 3（只增不减）');
  const forgedProblems: string[] = [];
  for (const file of [...V55F1_NODE_GATE_FILES, 'test/ghost-gate.test.ts']) {
    if (!discovered.includes(file)) forgedProblems.push(`${file}: 未被目录扫描纳入`);
  }
  assert.ok(forgedProblems.length > 0, '未在受审集合的门禁必须被判红（判据非恒真）');
  for (const file of [...V553_NODE_GATE_FILES, ...V552_NODE_GATE_FILES, ...V551_NODE_GATE_FILES]) {
    assert.ok(discovered.includes(file), `${file} 不得脱离受审集合`);
  }
  assert.equal(CHROMIUM_GATES.length, 9, 'CHROMIUM_GATES === 9 逐字（本叶零新增 Chromium 门禁文件）');
  console.log(`  ℹ V5.5F-1 新门禁受审：${V55F1_NODE_GATE_FILES.length}/${V55F1_NODE_GATE_FILES.length} 在册（目录扫描 ∧ 下界声明双命中）`);
});

/**
 * ★ IAN-1 **TASK-IAN-122**（ADR-IAN-008 §② · FR-IAN-105 · AC-IAN-022）—— 叶1 新 node 门禁
 * `free-input-next` **只增**进受审下界（目录扫描 ∧ 下界声明双命中）。
 *
 * 既有下界（`V5_*` / `V551_*` / `V552_*` / `V553_*` / `V55F_*`）**逐字保留**；
 * `CHROMIUM_GATES === 9` 逐字不动（本叶零新增 Chromium 门禁文件）。
 */
test('元门禁（IAN-1）：`free-input-next` 由 JUDGEMENTS 标记纳入受审集合（下界 ≥1，CHROMIUM_GATES 仍为 9）', () => {
  const discovered = discoverGateFiles(PKG);
  const problems: string[] = [];
  for (const file of IAN1_NODE_GATE_FILES) {
    if (!existsSync(resolve(PKG, file))) problems.push(`${file}: 文件不存在（新门禁缺失）`);
    if (!discovered.includes(file)) problems.push(`${file}: 未被目录扫描纳入（JUDGEMENTS 判据标记失效）`);
    if (!(EXPECTED_AUDITED_FILES as readonly string[]).includes(file)) problems.push(`${file}: 不在 EXPECTED_AUDITED_FILES 下界声明里（改名/删除不可见）`);
    const text = readFileSync(resolve(PKG, file), 'utf8');
    if (!/export const JUDGEMENTS/.test(text)) problems.push(`${file}: 必须导出 JUDGEMENTS 判据表`);
    if ((text.match(/expectFailPattern\s*:/g) ?? []).length < 3) problems.push(`${file}: 每条判据必须声明 expectFailPattern（≥3）`);
  }
  assert.deepEqual(problems, [], `IAN-1 新门禁未全部纳入受审集合：\n${problems.join('\n')}`);
  assert.ok(IAN1_NODE_GATE_FILES.length >= 1, 'IAN-1 叶1 新增 node 门禁下界不得低于 1（free-input-next；叶2 再 +1）');
  // 反证：未在受审集合的门禁必须被判红（判据非恒真）。
  const forgedProblems: string[] = [];
  for (const file of [...IAN1_NODE_GATE_FILES, 'test/ghost-gate.test.ts']) {
    if (!discovered.includes(file)) forgedProblems.push(`${file}: 未被目录扫描纳入`);
  }
  assert.ok(forgedProblems.length > 0, '未在受审集合的门禁必须被判红（判据非恒真）');
  // 既有下界逐字保留（本次只增 ⇒ 不得因追加而脱离受审集合）。
  for (const file of [
    ...V5_NEW_GATE_FILES,
    ...V551_NODE_GATE_FILES,
    ...V552_NODE_GATE_FILES,
    ...V553_NODE_GATE_FILES,
    ...V55F1_NODE_GATE_FILES,
    ...V55F2_NODE_GATE_FILES,
  ]) {
    assert.ok(discovered.includes(file), `${file} 不得脱离受审集合`);
    assert.ok((EXPECTED_AUDITED_FILES as readonly string[]).includes(file), `${file} 必须仍在下界声明里（只增不减）`);
  }
  assert.equal(CHROMIUM_GATES.length, 9, 'CHROMIUM_GATES === 9 逐字（本叶零新增 Chromium 门禁文件）');
  console.log(`  ℹ IAN-1 新门禁受审：${IAN1_NODE_GATE_FILES.length}/${IAN1_NODE_GATE_FILES.length} 在册（目录扫描 ∧ 下界声明双命中）`);
});

test('元门禁（★ IAN-2）：`law4-input-as-next` 由 JUDGEMENTS 标记纳入受审集合（下界 ≥1，CHROMIUM_GATES 仍为 9）', () => {
  const discovered = discoverGateFiles(PKG);
  const problems: string[] = [];
  for (const file of IAN2_NODE_GATE_FILES) {
    if (!existsSync(resolve(PKG, file))) problems.push(`${file}: 文件不存在（新门禁缺失）`);
    if (!discovered.includes(file)) problems.push(`${file}: 未被目录扫描纳入（JUDGEMENTS 判据标记失效）`);
    if (!(EXPECTED_AUDITED_FILES as readonly string[]).includes(file)) problems.push(`${file}: 不在 EXPECTED_AUDITED_FILES 下界声明里（改名/删除不可见）`);
    const text = readFileSync(resolve(PKG, file), 'utf8');
    if (!/export const JUDGEMENTS/.test(text)) problems.push(`${file}: 必须导出 JUDGEMENTS 判据表`);
    if ((text.match(/expectFailPattern\s*:/g) ?? []).length < 3) problems.push(`${file}: 每条判据必须声明 expectFailPattern（≥3）`);
  }
  assert.deepEqual(problems, [], `★ IAN-2 新门禁未全部纳入受审集合：\n${problems.join('\n')}`);
  assert.ok(IAN2_NODE_GATE_FILES.length >= 1, 'IAN-2 新增 node 门禁下界不得低于 1（law4-input-as-next）');
  // 反证：未在受审集合的门禁必须被判红（判据非恒真）。
  const forgedProblems: string[] = [];
  for (const file of [...IAN2_NODE_GATE_FILES, 'test/ghost-gate.test.ts']) {
    if (!discovered.includes(file)) forgedProblems.push(`${file}: 未被目录扫描纳入`);
  }
  assert.ok(forgedProblems.length > 0, '未在受审集合的门禁必须被判红（判据非恒真）');
  // 叶1 的既有下界逐字保留（只增不减）。
  for (const file of IAN1_NODE_GATE_FILES) {
    assert.ok(discovered.includes(file), `${file} 不得脱离受审集合`);
    assert.ok((EXPECTED_AUDITED_FILES as readonly string[]).includes(file), `${file} 必须仍在下界声明里（只增不减）`);
  }
  assert.equal(CHROMIUM_GATES.length, 9, 'CHROMIUM_GATES === 9 逐字（叶2 零新增 Chromium 门禁文件）');
  console.log(`  ℹ ★ IAN-2 新门禁受审：${IAN2_NODE_GATE_FILES.length}/${IAN2_NODE_GATE_FILES.length} 在册（目录扫描 ∧ 下界声明双命中）`);
});

test('元门禁反证（合成夹具）：N-01 中间语句绕过 / N-02 注释满足有界性 必须被判红', () => {
  // N-01 — the *exact* shape validate drove green: no `process.exitCode`, a plain
  // `console.error` sits between the await and the exit, and the callee lost its
  // hard stop. The block scan (not the one-line lookback) must catch the await.
  const n01 = [
    'async function dumpDiagnostics(reason) {',
    '  console.error(reason);',
    '}',
    'async function main() {',
    '  if (failures.length) {',
    "    console.error(`gate FAILED (${failures.length}):`);",
    "    await dumpDiagnostics('main: assertions failed');",
    "    console.error('（诊断返回）');",
    '    process.exit(1);',
    '  }',
    '}',
  ].join('\n');
  const n01r1a = auditGateSource('synthetic-n01.mjs', n01).filter((v) => v.rule === 'R1a');
  assert.equal(n01r1a.length, 1, `N-01 形态必须命中 1 条 R1a（块级扫描），实际 ${n01r1a.length}：\n${fmt(n01r1a)}`);

  // N-02 — the real hard stop is gone; only a *comment* still spells it out. Comment
  // stripping must leave nothing for `calleeIsSelfBounding` to find.
  const n02 = [
    'async function dumpDiagnostics(reason) {',
    '  // const __hardStop = setTimeout(() => { process.exit(1); }, 15_000);',
    '  console.error(reason);',
    '}',
    'async function main() {',
    '  if (failures.length) {',
    '    process.exitCode = 1;',
    "    await dumpDiagnostics('main: assertions failed');",
    '    process.exit(1);',
    '  }',
    '}',
  ].join('\n');
  const n02r1b = auditGateSource('synthetic-n02.mjs', n02).filter((v) => v.rule === 'R1b');
  assert.equal(n02r1b.length, 1, `N-02 形态（注释充当硬上限）必须命中 1 条 R1b，实际 ${n02r1b.length}：\n${fmt(n02r1b)}`);
});

test('元门禁反证（合成夹具）：失败计数无退出码 / 无界 CDP send 必须被判 R2 / R3', () => {
  const noExit = [
    "console.error(`gate FAILED (2):`);",
    'failures.push("x");',
  ].join('\n');
  assert.equal(
    auditGateSource('synthetic-noexit.mjs', noExit).filter((v) => v.rule === 'R2').length,
    1,
    '有失败计数而无退出码路径必须命中 R2',
  );

  const unguardedSend = [
    'async function connectCdp(url) {',
    '  const ws = new WebSocket(url);',
    '  const pending = new Map();',
    '  return {',
    '    send(method, params = {}) {',
    '      return new Promise((res, rej) => {',
    '        const id = 1;',
    '        pending.set(id, { resolve: res, reject: rej });',
    '        ws.send(JSON.stringify({ id, method, params }));',
    '      });',
    '    },',
    '  };',
    '}',
  ].join('\n');
  const r3 = auditGateSource('synthetic-send.mjs', unguardedSend).filter((v) => v.rule === 'R3');
  assert.equal(r3.length, 3, `无界 send 必须命中 R3×3（readyState / setTimeout / close 拒结），实际 ${r3.length}`);
});

// ── 2c. N-03: EVERY send() is checked, and `close` is scoped to its own pending ─
test('元门禁反证（合成夹具）：N-03 第二处无界 send / 拒结无关对象 必须被判红', () => {
  const secondUnbounded = [
    'async function connectCdp(url) {',
    '  const pending = new Map();',
    '  ws.addEventListener("close", () => { for (const [, p] of pending) p.reject(new Error("closed")); });',
    '  return {',
    '    send(method, params = {}) {',
    '      return new Promise((res, rej) => {',
    '        if (ws.readyState !== 1) { rej(new Error("closed")); return; }',
    '        pending.set(1, { resolve: res, reject: rej });',
    '        setTimeout(() => {}, 1);',
    '        ws.send(JSON.stringify({ id: 1, method, params }));',
    '      });',
    '    },',
    '  };',
    '}',
  ].join('\n');
  assert.deepEqual(
    auditGateSource('synthetic-first-bounded.mjs', secondUnbounded).filter((v) => v.rule === 'R3'),
    [],
    '第一处 send() 有界时不得误报',
  );
  const appended = `${secondUnbounded}\nfunction decoyClient(url) {\n  const pending = new Map();\n  return {\n    send(method, params = {}) {\n      return new Promise((res, rej) => { pending.set(1, { resolve: res, reject: rej }); });\n    },\n  };\n}\n`;
  const second = auditGateSource('synthetic-second.mjs', appended).filter((v) => v.rule === 'R3');
  assert.equal(second.length, 3, `第二处无界 send 必须被逐处检查（3 条：readyState/setTimeout/close），实际 ${second.length}：\n${fmt(second)}`);

  const unrelatedClose = [
    'async function connectCdp(url) {',
    '  const pending = new Map();',
    '  const other = { reject() {} };',
    '  other.addEventListener("close", () => { other.reject(); });',
    '  return {',
    '    send(method, params = {}) {',
    '      return new Promise((res, rej) => {',
    '        if (ws.readyState !== 1) { rej(new Error("closed")); return; }',
    '        pending.set(1, { resolve: res, reject: rej });',
    '        setTimeout(() => {}, 1);',
    '        ws.send(JSON.stringify({ id: 1, method, params }));',
    '      });',
    '    },',
    '  };',
    '}',
  ].join('\n');
  const unrelated = auditGateSource('synthetic-unrelated-close.mjs', unrelatedClose).filter((v) => v.rule === 'R3');
  assert.equal(unrelated.length, 1, `拒结无关对象的 close 必须被判红（且只有 close 一条），实际 ${unrelated.length}：\n${fmt(unrelated)}`);
});

// ── 3. the meta-gate itself must be able to fail: injected copies ───────────
/** Copy every discovered gate into a temp root (the injection never touches the repo). */
function injectedCopyRoot(): string {
  const tmp = mkdtempSync(resolve(tmpdir(), 'sdc-gates-'));
  for (const file of AUDITED_FILES) {
    const dst = resolve(tmp, file);
    mkdirSync(dirname(dst), { recursive: true });
    copyFileSync(resolve(PKG, file), dst);
  }
  return tmp;
}

/** Inject ordered `[from, to]` pairs into a copied gate and re-audit the copy. */
function auditInjected(file: string, edits: readonly [string, string][]): Violation[] {
  const tmp = injectedCopyRoot();
  const victim = resolve(tmp, file);
  let text = readFileSync(victim, 'utf8');
  for (const [from, to] of edits) {
    assert.ok(text.includes(from), `注入锚点不存在于 ${file}：${from}`);
    text = text.replace(from, to);
  }
  writeFileSync(victim, text, 'utf8');
  return auditRoot(tmp, discoverGateFiles(tmp));
}

test('元门禁反证（真实脚本副本注入）：F-01 / N-01 / N-02 / R2 形态 ⇒ 审计必须报红；真实根必须干净', () => {
  const f01 = auditInjected('test/ui/binding.mjs', [
    ['    process.exitCode = 1;\n    // T4:', '    await sleep(1);\n    // T4:'],
  ]);
  assert.ok(f01.some((v) => v.rule === 'R1a' && v.file === 'test/ui/binding.mjs'), `F-01 注入副本必须被判 R1a：\n${fmt(f01)}`);

  // N-01: drop the exit-code fix and put a plain statement between await and exit.
  const n01 = auditInjected('test/ui/binding.mjs', [
    ['    process.exitCode = 1;\n    // T4:', '    // T4:'],
    ["    await dumpDiagnostics('main: assertions failed');\n    process.exit(1);", "    await dumpDiagnostics('main: assertions failed');\n    console.error('（诊断返回）');\n    process.exit(1);"],
  ]);
  assert.ok(n01.some((v) => v.rule === 'R1a' && v.file === 'test/ui/binding.mjs'), `N-01 注入副本必须被判 R1a（块级扫描）：\n${fmt(n01)}`);

  // N-02: the hard stop survives only as a comment.
  const n02 = auditInjected('test/ui/binding.mjs', [
    [
      '  const __hardStop = setTimeout(() => {\n    console.error(\'✖ binding 诊断超时（15s 硬上限）→ 立即以失败退出（退出码已定）\');\n    process.exit(1);\n  }, 15_000);',
      '  // const __hardStop = setTimeout(() => { process.exit(1); }, 15_000);',
    ],
  ]);
  assert.ok(n02.some((v) => v.rule === 'R1b' && v.file === 'test/ui/binding.mjs'), `N-02 注入副本必须被判 R1b：\n${fmt(n02)}`);

  // R3 (validate caseB): an existing client loses its round-trip timeout.
  const r3 = auditInjected('test/ui/_v3-helpers.mjs', [['        setTimeout(() => {\n', '        void (() => {\n']]);
  assert.ok(r3.some((v) => v.rule === 'R3' && v.file === 'test/ui/_v3-helpers.mjs'), `R3 注入副本必须被判 R3：\n${fmt(r3)}`);

  // R2 (validate caseC): a gate records failures but loses every exit path
  // (`finish()` + `process.exit(1)` both gone ⇒ failure count no longer couples to
  // the exit code).
  const r2 = auditInjected('test/ui/l0.mjs', [
    ["  finish('L0 运行时门禁');", "  console.log('L0 done');"],
    ['  process.exit(1);', '  return;'],
  ]);
  assert.ok(r2.some((v) => v.rule === 'R2' && v.file === 'test/ui/l0.mjs'), `R2 注入副本必须被判 R2：\n${fmt(r2)}`);

  assert.deepEqual(auditDiscovered(PKG), [], '真实根在注入实验后仍必须干净（本测试不改仓库文件）');
});

// ── 4. honest registration of the coverage limit ────────────────────────────
test('元门禁：动态证伪覆盖如实登记（哪些门禁只有静态覆盖）', () => {
  // The claim itself is checkable: the set of statically-covered-only gates must be
  // a subset of the audited gates, and must not silently include the two gates that
  // *do* have a dynamic red-proof.
  for (const file of STATIC_ONLY_GATES) {
    assert.ok((AUDITED_FILES as readonly string[]).includes(file), `${file} 不在受审集合内`);
  }
  assert.ok(!(STATIC_ONLY_GATES as readonly string[]).includes('test/ui/binding.mjs'), 'binding.mjs 有 F-01 动态反证，不得登记为「仅静态」');
  assert.ok(!(STATIC_ONLY_GATES as readonly string[]).includes('test/ui/l1.mjs'), 'l1.mjs 有 RP-L1-A~H/C2 动态反证，不得登记为「仅静态」');
  console.log(
    `  ℹ 动态证伪覆盖：binding.mjs（F-01 反证）+ l1.mjs（RP-L1-A~H/C2）；仅静态覆盖（如实登记）：${STATIC_ONLY_GATES.join(', ')}`,
  );
});

// ── 5. R4（v3-3 fix round）：反证必须「因该红而红」────────────────────────────
/**
 * Review R1 (F-01) found the *class* of defect the first four rules cannot see:
 * `RP-V33-03`'s「delete one assertion ⇒ the ledger floor FAILS」reverse proof was red
 * because the **invocation was broken** (`node --test <test> --files-override <copy>`
 * made node execute the copy as a test file → `ERR_MODULE_NOT_FOUND`), not because the
 * floor judgement fired. A reverse proof must therefore declare the failure text it
 * expects (**`expectFailPattern`**) and be judged by
 * `test/reverse-proof-judge.mjs`, which rejects any red a launch/loading error can
 * explain — so「因错而红」can never again masquerade as evidence.
 *
 * R4a  **declaration** — every registered reverse-proof harness must declare at least
 *      its floor number of cases, each carrying a non-empty `expectFailPattern`.
 * R4b  **enforcement** — the harness must import the shared judge and call it (a
 *      declared pattern nobody judges is decoration), and the judge itself must carry
 *      the rejection texts/markers that make the "red-because-wrong" verdict possible.
 * R4c  **self-proof (dynamic)** — the judge's own `--selftest` is executed here: the
 *      **historical F-01 shape** must be judged INVALID, a real override failure VALID
 *      and a green run INVALID. If the anti-foolproof cannot fail, this test fails.
 * R4d  **honest exceptions** — reverse proofs whose failure text is environment-bound
 *      (or whose driver is not in the repository) must be registered as an
 *      **exception with a reason**; the set is printed, never silently allowed.
 */
export const REVERSE_PROOF_HARNESSES = [
  {
    file: 'test/ui/l1-reverse.mjs',
    /** RP-L1-A~H + RP-L1-C2 — one `expectFailPattern` each. */
    caseFloor: 9,
    driver: 'artifact perturbation (dist/sidepanel.js|html) + test/ui/l1.mjs',
  },
  {
    file: 'test/ui/l2-reverse.mjs',
    /**
     * v3-3: RP-V33-01/02/03/03-NEG/04/05 + closeout RP-V33-06 (N-09 leaf segment) and
     * RP-V33-07/08/09 (one self-proof per judge hardening, N-01 / N-02 / criterion c).
     */
    caseFloor: 10,
    driver: 'artifact/source perturbation + test/ui/l2.mjs / supersession / meta-gate / size guard',
  },
] as const;

/**
 * Registered exceptions (R4d). Each entry needs a **reason**; the meta-gate asserts the
 * reason is non-empty and prints the whole set, so "we cannot declare a pattern" can
 * never be an implicit, invisible allowance.
 */
export const REVERSE_PROOF_EXCEPTIONS = [
  {
    id: 'in-gate-RP-V3-01/04/05/08/09 · density.mjs',
    reason:
      'FAIL 段文本由门禁**自身**在同一 Chromium 进程内断言（`test/ui/density.mjs` 的 `check("RP-V3-0X (FAIL 段) …")` 正是 expectFailPattern 的等价物，正则/字面量逐字写在门禁里），' +
      '从外部再驱动一次需要每个 RP 一次 Chromium 运行（内存 ~1.5 GB、NFR-V3-012 串行纪律）。登记为「in-gate 形态」：模式断言**必须存在于门禁源码中**（下方 R4b 机器核对）。',
  },
  {
    id: 'in-gate-RP-V4-01~08 · density.mjs（v4-1 防滥用反证 + v4-2 TASK-613 收紧）',
    reason:
      'ADR-V4-020 第 3 条 / ADR-V4-023 第 5 条把 v4-1 的七条防滥用反证登记为 **in-gate 形态**（`test/ui/density.mjs --reverse RP-V4-0X`）：' +
      'v4-2 TASK-613 追加 **RP-V4-09**（卡预算 × 常驻入口准入重审的收紧判据：`[data-toolbar-slot]`/`.view-btn` 形态判据 + 首屏卡合计可点 ≤8），同一 in-gate 形态与同一纪律；' +
      'FAIL 段文本由门禁**自身**在同一 Chromium 进程内断言（每条驱动都断言「注入 → FAIL」与「还原 → PASS」两半，且 FAIL 半带字面诊断断言），' +
      '从外部再驱动一次需要每个 RP 一次 Chromium 运行（内存 ~1.5 GB、NFR-V3-012 串行纪律）。' +
      '与 v3 同类例外一致：模式断言**必须存在于门禁源码中**（下方 R4b 机器核对逐条校验）；' +
      '**不改** `readReverseProofLedger()` 的硬编码台账路径（ADR-V4-023 第 7 条），也未新增 Chromium 门禁文件（`CHROMIUM_GATES.length === 9` 与 `EXPECTED_AUDITED_FILES` 均不动）。',
  },
  {
    id: 'in-gate-V4-3-RV · ask-auth-inflow.mjs / l1.mjs（v4-3 审查修复轮 BLOCK/I 断言 + I-03 展开态反证）',
    reason:
      'v4-3 审查修复轮把四条新回归断言落在**既有** Chromium 门禁内：BLOCK-01 假批准（`test/ui/ask-auth-inflow.mjs` ⑪，auth cancelled ⇒ 渲染「已取消」而非「已批准」）、' +
      'BLOCK-04 审计入口真实可达（⑫，点击后 `[data-l2-view="audit"]` 必须可见）、I-03 展开态预算 + **in-gate 反证**（⑪：注入「选项行不收起」⇒ 单卡 7 > 6 / 合计 > 8 必须 FAIL，还原后 PASS）、' +
      'BLOCK-03 已决策历史答案源（`test/ui/l1.mjs` ⑪：`rounds[].chosen` = 流内卡的真实答案 / 取消原因可读）。' +
      'FAIL 段文本由门禁**自身**在同一 Chromium 进程内断言（与 `check(...)` 的 FAIL 段同源），从外部再驱动一次需要额外一次 Chromium 运行（内存 ~1.5 GB、NFR-V3-012 串行纪律）；' +
      '登记为「in-gate 形态」：模式断言**必须存在于门禁源码中**（下方 R4b 机器核对逐条校验）。' +
      '未新增 Chromium 门禁文件（`CHROMIUM_GATES.length === 9` 与 `EXPECTED_AUDITED_FILES` 均不动），`readReverseProofLedger()` 的硬编码台账路径不动。',
  },
  {
    id: 'in-gate-RP-L0-06b · l0.mjs',
    reason: '同上（`check("⑥ FR-V3-015 反证（FAIL 段）：篡改 data-count → 「三处同源」判据必须检出")` 在门禁内断言 FAIL 段文本）。',
  },
  {
    id: 'in-gate-V4-4-RF · recommendation.mjs / l0.mjs / density.mjs（v4-4 审查修复轮 BLOCK-01~03 + I-07）',
    reason:
      'V4-4 审查修复轮把六条新断言落在**既有** Chromium 门禁内：BLOCK-01 产品路径推荐卡（`test/ui/recommendation.mjs` ⑪，驱动源是 SW 发往面板的真实 `ref-captured`，断言里不调用测试 seam）+' +
      'BLOCK-03 兜底唯一与真实结算（⑫ 两条）、BLOCK-02 结构宿主判据（`test/ui/l0.mjs` ① 两条，查 DOM 而非属性）、I-07 登记格溯源门槛（`test/ui/density.mjs`）。' +
      'FAIL 段文本由门禁**自身**在同一 Chromium 进程内断言（与 `check(...)` 同源），从外部再驱动一次需要每个 RP 一次 Chromium 运行（内存 ~1.5 GB、NFR-V3-012 串行纪律）；' +
      '登记为「in-gate 形态」：模式断言**必须存在于门禁源码中**（R4b 逐条机器核对）。未新增 Chromium 门禁文件（`CHROMIUM_GATES.length === 9` 与 `EXPECTED_AUDITED_FILES` 均不动）。' +
      '两条**真实两段证伪**（断开接线 / 断开 describe-submit 分支）以 dist 字节扰动实跑，日志见 /tmp/opencode/v4-gate-logs/v4-4-reviewfix/。',
  },
  {
    id: 'in-gate-D1 · l1.mjs',
    reason: '同上（l1.mjs ⑧ D1 反证在门禁内断言「判据不是恒真」，FAIL 段文本随断言名固定）。',
  },
  {
    id: 'build-round /tmp 脚本（v3-1 RP-I1·RP-V3-05·RP-V3-06；v3-2/v3-3 rp-*.sh）',
    reason:
      '历史构建轮的反证驱动脚本落在 `/tmp/opencode/...`（**非版本化**，元门禁无法扫描；且 `rp-v33-03.sh` 的调用形态本身即 F-01 的根因）。' +
      '处置：v3-3 修复轮把本叶反证**收编**为版本化 harness `test/ui/l2-reverse.mjs`（逐条 expectFailPattern + 共享判定器 + 负控），' +
      '此后 **不得**再以 /tmp 脚本作为唯一证据；历史 /tmp 日志仅作旁证（原文在 build.md §6.2 逐字保留）。',
  },
] as const;

const REVERSE_JUDGE = 'packages/web-cli-plugin/test/reverse-proof-judge.mjs';
const JUDGE_IMPORT_RE = /from\s+['"]\.\.\/reverse-proof-judge\.mjs['"]/;
const JUDGE_CALL_RE = /judgeReverseProof(?:Invalid)?\s*\(/;
/** `expectFailPattern: '…'` / `expectFailPattern: /…/` — a non-empty declaration. */
const EXPECT_FAIL_PATTERN_RE = /expectFailPattern:\s*(\/[^/\n]+\/|'[^'\n]+'|"[^"\n]+")/g;

/**
 * Pattern **specificity** (closeout round, N-03 ②). The round-1 rule was
 * `pattern.length > 3`, which accepted `/./`, `'/../'` and `'✖ '` — an unconstrained
 * expression that matches any line is not a declared failure text.
 *
 * The judge is the only consumer that can be *executed*, so the rule is applied to the
 * inventory the harness prints (`--list-cases`), plus the comment-stripped source as a
 * second, independent reading.
 */
function patternSpecificity(declared: string, negativeControl: boolean): string | null {
  const body = declared.replace(/^[/'"]|[/'"]$/g, '');
  const meaningful = (body.match(/[\p{L}\p{N}]/gu) ?? []).length;
  const floor = negativeControl ? 4 : 6;
  if (declared.length < 8) return `声明过短（${declared.length} < 8）：${declared}`;
  if (meaningful < floor) return `声明的实义字符只有 ${meaningful} 个（下界 ${floor}）：${declared}`;
  if (/^[.\s*+?^$|\\/'"-]*$/.test(body)) return `声明是「匹配任意行」式模式：${declared}`;
  return null;
}

/** The ledger the meta-gate cross-checks the *executed* inventory against. */
function readReverseProofLedger(): {
  harnesses?: Array<{ file: string; cases: number }>;
} {
  const path = resolve(REPO, 'packages/web-cli-plugin/docs/v3-supersession-ledger.json');
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as {
    v3ReverseProofExpectations?: { harnesses?: Array<{ file: string; cases: number }> };
  };
  return parsed.v3ReverseProofExpectations ?? {};
}

/** Execute a harness's own `--list-cases` inventory (N-03 ③ — check the list, not the text). */
function listHarnessCases(
  file: string,
): Array<{ id: string; expectFailPattern: string; negativeControl?: boolean; expectValid?: boolean }> {
  const out = execFileSync('node', [resolve(PKG, file), '--list-cases'], { cwd: PKG, encoding: 'utf8' });
  const parsed = JSON.parse(out) as Array<{
    id: string;
    expectFailPattern: string;
    negativeControl?: boolean;
    expectValid?: boolean;
  }>;
  assert.ok(Array.isArray(parsed) && parsed.length > 0, `${file} --list-cases 必须输出非空清单`);
  return parsed;
}

test('元门禁 R4a/R4b：反证驱动脚本必须逐条声明 expectFailPattern 并真的接上有效性判定器', () => {
  const ledgerHarnesses = readReverseProofLedger().harnesses ?? [];
  assert.ok(ledgerHarnesses.length > 0, '台账 v3ReverseProofExpectations.harnesses 不得为空（登记册是本判据的对照物）');
  for (const harness of REVERSE_PROOF_HARNESSES) {
    const path = resolve(PKG, harness.file);
    assert.ok(existsSync(path), `登记的 reverse-proof harness 不存在：${harness.file}`);
    const text = readFileSync(path, 'utf8');

    // ── N-03 ③: check the EXECUTED inventory ──────────────────────────────────
    const inventory = listHarnessCases(harness.file);
    assert.ok(
      inventory.length >= harness.caseFloor,
      `${harness.file} 的 --list-cases 清单只有 ${inventory.length} 条（登记下界 ${harness.caseFloor}）—— ` +
        '「反证必须命中预期失败文本」不得被静默放宽',
    );
    const ids = inventory.map((c) => c.id);
    assert.equal(new Set(ids).size, ids.length, `${harness.file} 的用例 id 必须唯一：${ids.join(', ')}`);
    const weak: string[] = [];
    for (const entry of inventory) {
      const reason = patternSpecificity(entry.expectFailPattern, Boolean(entry.negativeControl));
      if (reason !== null) weak.push(`${entry.id}: ${reason}`);
    }
    assert.deepEqual(weak, [], `${harness.file} 的 expectFailPattern 存在占位/过宽声明：\n${weak.join('\n')}`);
    // The ledger's registered case count must equal the executable inventory (a
    // registration that lags the harness is a rubber stamp).
    const registered = ledgerHarnesses.find((h) => h.file.endsWith(harness.file));
    assert.ok(registered, `${harness.file} 未在台账 v3ReverseProofExpectations.harnesses 登记`);
    assert.equal(
      registered.cases,
      inventory.length,
      `${harness.file} 台账登记 ${registered.cases} 条 ≠ --list-cases 实测 ${inventory.length} 条`,
    );

    // ── N-03 ①: the source-text reading must also survive comments being stripped ──
    const declared = [...stripComments(text).matchAll(EXPECT_FAIL_PATTERN_RE)].map((m) => m[1]);
    assert.ok(
      declared.length >= harness.caseFloor,
      `${harness.file} 剥离注释后只声明了 ${declared.length} 个 expectFailPattern（登记下界 ${harness.caseFloor}）—— ` +
        '注释 / 字符串字面量不得充当声明',
    );

    assert.ok(
      JUDGE_IMPORT_RE.test(text),
      `${harness.file} 未接上共享判定器（import … from '../reverse-proof-judge.mjs'）—— 声明的模式必须真的被判定`,
    );
    assert.ok(JUDGE_CALL_RE.test(text), `${harness.file} 未调用 judgeReverseProof(…) —— 判定器是装饰品`);
    // The harness must also be in the audited set (a reverse proof is itself a gate).
    assert.ok(
      (AUDITED_FILES as readonly string[]).includes(harness.file),
      `${harness.file} 未被受审集合扫描到（R1a/R1b/R2/R3 不适用于它就等于没人审它）`,
    );
  }

  // The judge must carry the rejections that make「因错而红」impossible to pass:
  // (1) the launch-error markers — now including the Chromium/CDP/port/OOM classes and
  //     matched case-insensitively, (2) the "expected text missing ⇒ invalid" sentence,
  // (3) the failure-line anchoring (N-01) and (4) the completion marker (criterion c).
  const judge = readFileSync(resolve(REPO, REVERSE_JUDGE), 'utf8');
  const judgeFolded = judge.toLowerCase();
  for (const marker of [
    'ERR_MODULE_NOT_FOUND',
    'Cannot find module',
    'SyntaxError',
    'EADDRINUSE',
    'ECONNREFUSED',
    'EACCES',
    'heap out of memory',
    'FATAL ERROR',
    'CDP socket not open',
    'Failed to launch',
    'Target closed',
  ]) {
    assert.ok(
      judgeFolded.includes(marker.toLowerCase()),
      `判定器缺启动/环境错误标记 ${marker}（因错而红将无法被识别，N-02）`,
    );
  }
  assert.ok(/toLowerCase\(\)/.test(judge), '判定器必须大小写折叠后再比对标记（N-02 ②：小写标记也是同一个标记）');
  assert.ok(judge.includes('未命中预期失败文本'), '判定器缺「未命中预期失败文本 ⇒ 判无效」的分支');
  assert.ok(judge.includes('因错而红'), '判定器缺「因错而红」的判定语义（可读理由）');
  assert.ok(judge.includes('lineHasFailureMarker'), '判定器缺「命中行本身必须是失败行」的判据（N-01）');
  assert.ok(judge.includes('COMPLETION_MARKERS'), '判定器缺「门禁必须正常走完」的完成标记判据');

  // The judge's own inventory is executable too: `--list-cases` must expose every
  // adversarial shape validate drove, and the negative controls may never shrink.
  const judgeCases = listHarnessCases('test/reverse-proof-judge.mjs');
  const judgeNegative = judgeCases.filter((c) => c.expectValid === false).length;
  assert.ok(judgeCases.length >= 15, `判定器 --selftest 清单只有 ${judgeCases.length} 条（下界 15）`);
  assert.ok(
    judgeNegative >= 13,
    `判定器负控只有 ${judgeNegative} 条（下界 13）—— validate 的对抗形态不得被静默删除`,
  );
  const judgeRegistered = ledgerHarnesses.find((h) => h.file.endsWith('reverse-proof-judge.mjs'));
  assert.ok(judgeRegistered, '判定器自身未在台账 harnesses 登记');
  assert.equal(judgeRegistered.cases, judgeCases.length, `判定器台账登记 ${judgeRegistered.cases} 条 ≠ 实测 ${judgeCases.length} 条`);

  // In-gate reverse proofs (the R4d exceptions) must really carry their pattern
  // assertion in the gate source — otherwise the exception is a paper allowance.
  const inGate: ReadonlyArray<[string, RegExp]> = [
    ['test/ui/density.mjs', /RP-V3-01 FAIL 段诊断含「C1 8 > 7」/],
    ['test/ui/density.mjs', /RP-V3-08 FAIL 段诊断可读（含「实测 X ≠ 登记 Y」）/],
    // v4-1（ADR-V4-020 第 3 条 / ADR-V4-023 第 5 条）—— 七条防滥用反证逐条在门禁源码里
    // 带上自己的 FAIL 形态（两段证伪日志见 build.md；`--reverse RP-V4-0X` 实跑 EXIT=0）。
    ['test/ui/density.mjs', /RP-V4-01 FAIL 段诊断含「卡内可点 7 > 6」/],
    ['test/ui/density.mjs', /RP-V4-02 FAIL 段诊断含「首屏可见卡 3 > 2」/],
    ['test/ui/density.mjs', /RP-V4-03 FAIL 段 a 诊断含「欢迎卡 2 > 1」/],
    ['test/ui/density.mjs', /RP-V4-03 FAIL 段 b 诊断含「文本行 9 > 8」/],
    ['test/ui/density.mjs', /RP-V4-04 hidden=true 是唯一豁免通道 → C1 必须下降 1/],
    ['test/ui/density.mjs', /RP-V4-05 FAIL 段诊断含「超出 1 B」/],
    ['test/ui/density.mjs', /RP-V4-06 \(FAIL 段\) 工具栏控件移入 #stream 后豁免守卫必须抛错/],
    ['test/ui/density.mjs', /RP-V4-07 \(FAIL 段\) chip 被移入 hidden 容器后探针必须 FAIL/],
    // v4-2（TASK-613 裁决）：形态判据 + 首屏合计上限，两条 FAIL 形态逐条在门禁源码里。
    // v4-3 R2 重 pin：期望值从硬编码 10 改为动态 `基线合计 + 10`（v4-3 的 ask/auth 卡
    // 让基线首屏合计可点不再为 0），形态断言的**位置与语义**不变，只随模板字面量换锚。
    ['test/ui/density.mjs', /RP-V4-09 FAIL 段 ① 诊断含「流内卡合计可点 \$\{injectedTotal\} > 8」/],
    ['test/ui/density.mjs', /RP-V4-09 FAIL 段 ② 诊断含「常驻导航入口」/],
    // v4-3 审查修复轮（BLOCK-01 / BLOCK-03 / BLOCK-04 / I-03）—— 每条新断言都在门禁源码里
    // 带着自己的 FAIL 形态（BLOCK 两段证伪 + I-03 展开态反证原文见 build.md「review 修复轮」）。
    ['test/ui/ask-auth-inflow.mjs', /BLOCK-01 假批准回归：auth cancelled ⇒ 渲染「已取消」/],
    ['test/ui/ask-auth-inflow.mjs', /BLOCK-04 回归：终态授权卡点审计/],
    ['test/ui/ask-auth-inflow.mjs', /\(FAIL 段\) 注入「选项行不收起」⇒ 展开态判据必须 FAIL/],
    ['test/ui/l1.mjs', /⑪ 「已决策 N 步」只有审计视图标题一个声明点/],
    ['test/ui/l0.mjs', /反证（FAIL 段）：篡改 data-count/],
    ['test/ui/l1.mjs', /D1 反证（FAIL 段）/],
    // v3-4 fix round (review R1) — the new BLOCK-1 / I-01 / I-04 assertions must carry
    // their own FAIL shape in the gate source, so the two-stage falsification记录 is
    // anchored to code that can actually go red (not a paper allowance).
    ['test/ui/page-input.mjs', /BLOCK-1 回归：\/app 页面隔离世界内 window\.__wcliPickLayer === object/],
    ['test/ui/page-input.mjs', /BLOCK-1 回归：\/app 页面上的活层确实接管右键/],
    ['test/ui/page-input.mjs', /I-01 ①：撤销后\*\*另一个 tab\*\*/],
    ['test/ui/zero-injection.mjs', /BLOCK-1 回归：未授权 \/app 页面五探针全零/],
    // v3-4 fix round R2（裁决 V3-VOL-2）—— 5 项 deferred 逐条落地后，每条新断言都必须
    // 在门禁源码里带着自己的 FAIL 形态（两段证伪原文见 build.md §12.4：
    // 回退 ⇒ 71 passed / 7 failed EXIT=1；修复 ⇒ 78 passed / 0 failed EXIT=0）。
    ['test/ui/page-input.mjs', /I-02：卸载后\*\*文档加载完成\*\* Shadow host 仍必须为 0/],
    ['test/ui/page-input.mjs', /I-03：Esc 关闭菜单后宿主焦点回到原元素/],
    ['test/ui/page-input.mjs', /I-01②：失去授权后第一次交互（右键）即\*\*自行卸载\*\*/],
    ['test/ui/page-input.mjs', /I-01③：面板收到卸载事实/],
    ['test/ui/page-input.mjs', /I-10：flash 高亮期间 overlay 定时器被\*\*跟踪\*\*/],
    // v3-4 收口轮（validate R1 的 F3/F4/F5，2026-09-17）—— 同样逐条在门禁源码里带上
    // 自己的 FAIL 形态（两段证伪原文见 build.md §13：F4 回退 ⇒ `88 passed / 4 failed`
    // EXIT=1；修复 ⇒ `92 passed / 0 failed` EXIT=0，且连跑 ≥5 次 5/5 绿）。
    ['test/ui/page-input.mjs', /I-01② 前置（静止）：窗口期内不会再发 probe-changed/],
    ['test/ui/page-input.mjs', /F5：同 origin 切 tab 的窗口内，注入必须落在\*\*活动\*\* tab/],
    ['test/ui/page-input.mjs', /F4：撤销路径\*\*先\*\*下发去授权事实/],
    // V4-4 审查修复轮（BLOCK-01 / BLOCK-02 / BLOCK-03 / I-07）—— 每条新断言都带着自己的
    // FAIL 形态（两段证伪原文见 build.md「review 修复轮」；in-gate 形态沿用同一纪律）。
    ['test/ui/recommendation.mjs', /⑪ 产品路径（不经 seam）：生产者真实接线 ⇒ 流内出现 nextstep 卡/],
    ['test/ui/recommendation.mjs', /⑫ 提交描述 ⇒ 真实结算/],
    ['test/ui/recommendation.mjs', /⑫ 兜底输入唯一/],
    ['test/ui/l0.mjs', /① 零宿主终态：`#stream` 子树内 \[data-host\] 计数 = 0/],
    ['test/ui/l0.mjs', /① 已退役容器零 DOM 残留/],
    ['test/ui/density.mjs', /I-07 登记格溯源门槛/],
  ];
  for (const [file, pattern] of inGate) {
    const text = readFileSync(resolve(PKG, file), 'utf8');
    assert.ok(pattern.test(text), `${file} 的 in-gate 反证模式断言（${pattern}）不存在 —— 例外登记失真`);
  }
  console.log(
    `  ℹ R4a/R4b：${REVERSE_PROOF_HARNESSES.map((h) => `${h.file}（--list-cases ${h.caseFloor}+ 条，台账逐条对齐）`).join(' + ')}；` +
      `判定器清单 ${judgeCases.length} 条（负控 ${judgeNegative}）；` +
      `in-gate 例外 ${REVERSE_PROOF_EXCEPTIONS.length} 条（模式断言已逐条核对）`,
  );
});

test('元门禁 R4c（自身反证）：判定器必须把「因错而红」判无效、把真反证判有效（--selftest 实跑）', () => {
  const judge = resolve(REPO, REVERSE_JUDGE);
  assert.ok(existsSync(judge), `判定器不存在：${REVERSE_JUDGE}`);
  let out = '';
  let code = 0;
  try {
    out = execFileSync('node', [judge, '--selftest'], { cwd: PKG, encoding: 'utf8' });
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    code = e.status ?? 1;
    out = `${e.stdout ?? ''}${e.stderr ?? ''}`;
  }
  assert.equal(code, 0, `判定器 --selftest 未通过（防呆自身失效）：\n${out}`);
  assert.match(out, /因错而红被判无效/, '--selftest 必须显式报告「因错而红被判无效」');
  assert.match(out, /SELFTEST-2/, '--selftest 必须包含「历史形态 + 宽松期望文本仍判无效」的用例');
  assert.match(out, /passed \/ 0 failed/, '--selftest 必须全过');
  // Every adversarial shape validate drove must still be present and still be a
  // negative control — a hardening round that silently drops one has not happened.
  const selftestCases = listHarnessCases('test/reverse-proof-judge.mjs');
  const negativeIds = selftestCases.filter((c) => c.expectValid === false).map((c) => c.id);
  for (const label of [
    'SELFTEST-6',
    'SELFTEST-7',
    'SELFTEST-8',
    'SELFTEST-9',
    'SELFTEST-10',
    'SELFTEST-11',
    'SELFTEST-12',
    'SELFTEST-14',
    'SELFTEST-15',
  ]) {
    assert.ok(negativeIds.some((id) => id.includes(label)), `判定器缺少负控 ${label}（validate 的对抗形态必须常驻）`);
  }
  const positiveIds = selftestCases.filter((c) => c.expectValid === true).map((c) => c.id);
  assert.ok(
    positiveIds.some((id) => id.includes('SELFTEST-3')),
    '真阳性用例 SELFTEST-3 必须存在（否则「全部判无效」也能让负控全绿）',
  );
  assert.ok(
    positiveIds.some((id) => id.includes('SELFTEST-13')),
    '真阳性用例 SELFTEST-13（命中失败行 + 连带第二条失败）必须存在',
  );
  assert.match(out, /判定器反证清单：\d+ 条（负控 \d+ 条/, '--selftest 必须打印清单计数（负控数可被核对）');
  console.log(out.trimEnd().split('\n').slice(-3).join('\n'));
});

test('元门禁 R4d：无法声明可复现失败文本的反证必须如实登记为「例外 + 理由」（不得默认放行）', () => {
  assert.ok(REVERSE_PROOF_EXCEPTIONS.length > 0, '例外集合不得为空（若真无例外，请改为登记一条说明该事实的条目）');
  for (const exception of REVERSE_PROOF_EXCEPTIONS) {
    assert.ok(exception.id.length > 0, '例外必须有 id');
    assert.ok(exception.reason.trim().length >= 40, `${exception.id} 的例外理由过短（必须写明为何无法声明可复现失败文本 / 如何被替代覆盖）`);
  }
  // The registered harnesses must not silently be exceptions as well.
  for (const harness of REVERSE_PROOF_HARNESSES) {
    assert.ok(
      !REVERSE_PROOF_EXCEPTIONS.some((e) => e.id.includes(harness.file)),
      `${harness.file} 既有 expectFailPattern 又被登记为例外 —— 登记自相矛盾`,
    );
  }
  console.log(`  ℹ R4d 例外登记（如实、逐条带理由）：\n      ${REVERSE_PROOF_EXCEPTIONS.map((e) => e.id).join('\n      ')}`);
});
