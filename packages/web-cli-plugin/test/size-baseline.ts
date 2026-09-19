/**
 * V2-2 — side-panel bundle size snapshot + regression-guard logic (NFR-V2-001 /
 * NFR-V2-002, ADR-V2-007).
 *
 * ── Baseline ≠ target budget; do NOT conflate them ──────────────────────────
 *
 * The side panel has **no byte target** (there is no NFR goal for it). What this
 * file records is a *regression baseline*: a measured value used to FAIL when a
 * change grows `dist/sidepanel.js` beyond `baseline × (1 + tolerance)`. The meta
 * block pins `targetBudgetBytes: null` / `targetMet: null` so the guard can never
 * drift into the v1 content-bundle「目标达成」narrative (D31 stays where it is).
 *
 * `dist/content.js` is different: its ceiling is a hard **no-growth** limit
 * (`CONTENT_MAX_BYTES`, no tolerance) pinned to the **latest re-measured value**,
 * so V2 can never silently fatten the injected bundle (NFR-V2-002 red line).
 *
 * Measurement discipline: re-measure after `npm run build` and update
 * `SIDEPANEL_BASELINE_BYTES` / `SIDEPANEL_CEILING` / `SIDEPANEL_BASELINE_META`
 * explicitly (date + source + build command). Never widen the tolerance or delete
 * an assertion to make a gate green.
 *
 * ── Guard-tighten round (2026-09-14): lock in the SDK-lazification result ─────
 *
 * Commit `0df2273` (base `src/llm.ts` static → lazy dynamic `import()`) shrank the
 * artifacts sharply, but the guards still carried the *pre-fix* ceilings
 * (`CONTENT_MAX_BYTES = 1,073,453`; side-panel ceiling `1,217,848`) — so
 * `content.js` could silently regrow to ~1 MiB without tripping anything. This
 * round **re-registers both at the measured post-fix values** (direction: strictly
 * tighter, never wider):
 *   - `CONTENT_MAX_BYTES` ....... 1,073,453 → **177,076** (no tolerance; one byte fails)
 *   - `SIDEPANEL_BASELINE_BYTES`  1,159,856 → **266,500** (ceiling 279,825 = ×1.05)
 * Every superseded value stays in `SIDEPANEL_BASELINE_BYTES_HISTORY` and the
 * reverse proofs were re-driven so they still FAIL at the new values.
 */
// Re-export the v1 reader unchanged (it swallows ONLY `ENOENT`; every other stat
// failure propagates — see `test/perf-budget.test.ts` for the reverse proof).
export { readArtifactSize, type StatLike } from './perf-baseline.js';

/**
 * Regression baseline for `dist/sidepanel.js`.
 *
 * ── Re-registration history (never silently widen; keep every value on record) ──
 *   - v1 measured value .......... 1,068,165 B
 *   - V2-2 (2026-09-13) .......... 1,085,389 B (+20,000 B: floating-tree UI, TASK-008)
 *   - V2-3 (2026-09-13) .......... 1,110,744 B (revoke/undo surface, `f45c124`)
 *   - V2-4 (2026-09-13) .......... 1,132,748 B (read-only command archive surface)
 *   - V2 R2 (2026-09-13) ......... 1,159,856 B (real nested tree UI + per-level
 *     allow/ask/deny policy controls + archive layering; R2 closeout re-measure
 *     recorded 1,162,942 B)
 *   - **current (2026-09-14)** ... 266,500 B (tightened after base LLM SDK
 *     lazification, commit `0df2273`; direction = down, see below)
 *
 * W4 fix round (2026-09-13): the V2-2 baseline (1,085,389 B) was NOT re-registered
 * after V2-3 added the revoke/confirm/receipt surface, so the guard's effective
 * headroom (~29 KB) was larger than the declared 5%. This is an explicit
 * re-registration at the **re-measured** value (not a silent widen): the previous
 * values stay recorded above and the reason for the increase is the intentional
 * V2-3 weight. The tolerance (5%) is unchanged and no assertion was removed.
 *
 * V2-4 re-registration (2026-09-13): `src/insight/archive-catalog.ts` (new) +
 * `tree-drawer.ts` archive sub-view grew the side panel by 22,004 B.
 *
 * R2 re-registration (2026-09-13, R2-V22-05): the real nested tree renderer
 * (`tree-view.ts` nested model + `tree-drawer.ts` role=tree/keyboard/breadcrumb/
 * layered controls) + archive layering grew the side panel by 27,108 B over
 * 1,132,748 B. Re-measured after `npm run build --workspace @lgdl/web-cli-plugin`
 * (stat: 1,159,856 B). Previous values retained in the history array; tolerance
 * unchanged (5%); `targetBudgetBytes` / `targetMet` remain null.
 *
 * Guard-tighten re-registration (2026-09-14, R3-perf follow-up): after commit
 * `0df2273` (base LLM SDK lazification) the side panel measured **266,500 B**, so
 * the pre-fix baseline 1,159,856 B (ceiling 1,217,848 B) was left holding ~950 KB
 * of silent headroom. This is an explicit **tightening** re-registration at the
 * re-measured value — source command
 * `npm run build --workspace @lgdl/web-cli-plugin` then `stat -c %s dist/sidepanel.js`.
 * Direction = **down** (previous recorded value 1,159,856 B; the R2 closeout
 * measurement 1,162,942 B is also retained on record). Tolerance still 5%; no
 * assertion removed.
 */
/**
 * ── v3-1 re-registration (2026-09-16, ADR-V3-011 / EC-V3-013) ────────────────
 *
 * The v3-1 L0 skeleton (`l0/{shell,decision-card,status-bar,risk-rail}.ts` +
 * `disclosure.ts` + the L0 view model) is an **intentional** weight increase: it
 * is the disclosure restructuring the whole v3 Feature is built on. Re-measured
 * after `npm run build --workspace @lgdl/web-cli-plugin`:
 *
 *   - `dist/content.js` ..... 177,076 B (UNCHANGED — v3-1 does not touch
 *     `src/content/**`; the hard, tolerance-free ceiling still holds byte-for-byte)
 *   - `dist/sidepanel.js` ... 266,500 → 291,523 B (+25,023 B, +9.4%)
 *     ceiling 279,825 → 306,099 B = floor(291,523 × 1.05)
 *
 * ── v3-1 review fix round re-registration (2026-09-16, review I6) ────────────
 *
 * The 291,523 B entry above was published as the re-registration **value** while
 * the FINAL artifact of that round measured **294,874 B** (+3,351 B, produced by
 * the three gate-discovered regressions fixed *after* the re-registration) — so
 * the registry (and its `note`) did not describe the shipped artifact.
 *
 * The fix round re-registers the **real artifact** and, at the same time, forbids
 * the ceiling from being raised by that bookkeeping (the old ceiling already
 * covers the artifact):
 *
 *   - `SIDEPANEL_BASELINE_BYTES` ... 291,523 → **295,225 B** (measured on the fix
 *     round's final build: L0 review fixes I1/I3/I5, +351 B over 294,874 B)
 *   - `SIDEPANEL_CEILING` ......... **306,099 B, UNCHANGED**: the ceiling is now
 *     `min(floor(baseline × 1.05), SIDEPANEL_CEILING_CAP)` and the cap is the
 *     previously registered ceiling, i.e. the ceiling may only ever go DOWN. The
 *     value the formula alone would produce (309,986 B) is therefore *not* taken —
 *     `floor(295,225 × 1.05) = 309,986 > 306,099` would have widened the guard by
 *     3,887 B purely for a registry-fidelity fix.
 *   - tolerance ................... **5% unchanged**; the effective headroom is
 *     now 3.68% (stricter, never wider);
 *   - `targetBudgetBytes` / `targetMet` stay **null**; the size assertions were not
 *     deleted — the ones that encoded「baseline > previous ceiling」were re-pinned
 *     to the direction-sensitive「ceiling ≤ previous ceiling」claim (registered in
 *     `docs/v3-supersession-ledger.json`, entry `V31-S10`).
 */
/**
 * ── v3-2 re-registration (2026-09-16, ADR-V3-011 / EC-V3-013, leaf
 *    specs-tree-v3-2-l1-disclosure-refs) ──────────────────────────────────────
 *
 * The v3-2 L1 layer (eight in-place content classes + the fail-closed reference
 * judge + the receipt triple + the local-tree slice) is an **intentional** weight
 * increase. Re-measured after `npm run build --workspace @lgdl/web-cli-plugin`:
 *
 *   - `dist/content.js` ..... 177,076 B (UNCHANGED — v3-2 does not touch
 *     `src/content/**`; the hard, tolerance-free ceiling still holds byte-for-byte)
 *   - `dist/sidepanel.js` ... 295,225 → **327,679 B** (+32,454 B, +11.0%)
 *
 * Direction = **raised** (deliberate feature weight), the ceiling is **HELD**:
 *
 *   - the previous value 295,225 B is retained in
 *     `SIDEPANEL_BASELINE_META.previousBaselineBytes` + `reRegisteredFrom` and in
 *     `SIDEPANEL_BASELINE_BYTES_TIMELINE` / `docs/v3-density-baseline.json#volume`;
 *   - the tolerance stays **5%** (`SIDEPANEL_BASELINE_TOLERANCE` untouched);
 *   - `targetBudgetBytes` / `targetMet` stay **null** (still a regression
 *     baseline, never a target — ADR-V2-007's narrative stays banned);
 *   - the size assertions were **not** deleted — the direction-sensitive ones are
 *     re-pinned (registered in `docs/v3-supersession-ledger.json`, entries
 *     `V32-S1`…`V32-S4`);
 *   - the one-byte reverse proof is re-driven at the (unchanged) ceiling.
 *
 * ── ⚠️ 本轮的**红线冲突**（必须显式上报，不得静默放宽）─────────────────────────
 *
 * `SIDEPANEL_CEILING_CAP = 306,099 B` 是**只降不升**的冻结上限（v3-1 I6 轮设立，
 * v3-2 编排器红线 ⑧ 明文禁止抬高）。同文件底部 `SIDEPANEL_CEILING` 因此仍等于
 * 306,099 B，而本轮产物实测 **327,679 B** → 产物**超出被冻结的 ceiling 21,580 B**，
 * 且：
 *
 *   - `test/size-budget.test.ts`「实测 ≤ cap」断言；
 *   - `test/ui/density.mjs` 阶段 F「产物 ≤ 机读上限」断言
 *
 * 会**如实 FAIL**。本叶**未**抬高 cap、**未**放宽容差、**未**删除任何断言、**未**
 * 把代码搬到 `sidepanel.js` 之外以绕开门禁 —— 按红线「若某目标只能靠放宽达成 → 停下
 * 如实上报」处理：需要编排器裁决（抬高 cap 至 ≥327,679 B，或削减本叶范围）。
 */
/**
 * ── v3-2 修复轮（2026-09-16，**编排器裁决 V3-VOL-1**）────────────────────────
 *
 * 裁决（原文要点）：① **批准** `sidepanel.js` 基线显式重登记至实测 **327,679 B**；
 * ② **撤销** v3-1 修复轮自加的 `SIDEPANEL_CEILING_CAP` 硬上限机制 —— 该 cap **不是
 * spec/作者要求**，是为证明「ceiling 只降不升」而自缚的装置，现已挡住合法功能：
 * 「移除它（或改为纯记录字段、不再参与判定）」；③ 以 4 条替代守卫取代之（见下）。
 * ④ 不变项：`content.js` 177,076 B 无容差、密度阈值逐字不变。
 *
 * 本文件据此落地：
 *
 *   ① **公式守卫（唯一判定）**：`SIDEPANEL_CEILING = floor(baseline × 1.05)`，
 *      容差 **5% 不变**。`SIDEPANEL_CEILING_CAP` 降级为**纯记录字段**
 *      （`SIDEPANEL_CEILING_CAP_RECORD`，值仍 306,099 B，附 `…_ROLE = 'record-only'`），
 *      **不参与任何判定**；`evaluateSidepanelSize()` 也不再接受 cap 形参。
 *   ② **重登记披露登记册**：`SIDEPANEL_RE_REGISTRATIONS` 逐轮记录「前后值 + 日期 +
 *      来源 + buildCommand + measuredBy + 理由 + 断言零删减台账条目 + 历史逐字保留值」，
 *      并由 `test/size-budget.test.ts` 断言字段齐备 / 链条首尾相接 / 历史值逐字保留。
 *   ③ **增长正当性证据**：`SIDEPANEL_GROWTH_BREAKDOWN`（esbuild metafile
 *      `bytesInOutput`，v3-1 树 vs v3-2 树，同一 absWorkingDir 几何）逐模块分解
 *      **+32,454 B**：新必需模块 26,156 B / 接线 5,848 B / 归因位移 220 B /
 *      未归因运行时胶水 230 B；`test/size-growth-evidence.test.ts` 用真实 metafile 复核。
 *   ④ **方向性守卫**：`evaluateConsecutiveReRegistrationGrowth()` —— 同一 Feature 内
 *      **连续两轮**重登记累计增幅 > **15%** 时产出**可读告警**（`warning !== null`），
 *      告警文本要求「显式回报编排器」。该告警由 `test/size-budget.test.ts` 断言
 *      **必须存在**（可读、可复现、可 FAIL），不靠人读日志。
 *
 * `content.js` 177,076 B（无容差、不可重登记）与密度阈值在本轮**零改动**。
 */
/**
 * ── v3-2 收口轮（2026-09-16，**validate R1 之后的收口轮**）─────────────────────
 *
 * 收口轮处置 validate R1 的 N-04/N-05/N-07/N-08（引用重拾不再自证、`reset()` 真清空
 * env、D4 原因写明哪一项变化、退役原因冻结）—— 四处都在 `src/ui/sidepanel/**`，因此
 * 产物**显式增重** +797 B：
 *
 *   - `dist/content.js` ..... 177,076 B（**UNCHANGED** —— 收口轮不碰 `src/content/**`，
 *     无容差硬上限逐字节保持）
 *   - `dist/sidepanel.js` ... 327,679 → **328,476 B**（+797 B，+0.24%）
 *
 * 方向 = **提升**（同一叶内的更正轮：`roundKind: 'registry-fidelity-round'`，故 ④ 的
 * 「连续两个**功能轮**」告警口径不变）。重登记按裁决 V3-VOL-1 ② 的披露要求逐项登记：
 *
 *   - 前值 327,679 B 保留在 `SIDEPANEL_RE_REGISTRATIONS` 链条 /
 *     `SIDEPANEL_BASELINE_BYTES_TIMELINE` / `reRegisteredFrom`；
 *   - 容差 **5% 不变**；`targetBudgetBytes` / `targetMet` 仍为 **null**；
 *   - ceiling 仍由**公式**给出：`floor(328,476 × 1.05)` = **344,899 B**（cap 保持
 *     `record-only`，不参与判定）；
 *   - 断言零删减：方向敏感断言按新实测值重新 pin，并登记台账条目 `V32-S17`。
 *
 * `previousBaselineBytes` **有意保留 295,225 B**：它是 {@link SIDEPANEL_GROWTH_BREAKDOWN}
 * 所比较的那棵树（v3-1 I6 轮的树）的基线，`deltaBytes` 因此仍是「v3-1 树 → 当前树」的
 * **累计**增量（R1 后为 71,175 B）；**逐轮**前后值由 `SIDEPANEL_RE_REGISTRATIONS` 承载体
 * （末项 `v3-4-r1`：362,777 → 366,755）。两者分工明确、不得混用。
 */
/**
 * ── 收口后缺陷修复轮 **R1**（2026-09-17，作者真机反馈；HEAD `870cb6e`）────────────
 *
 * 缺陷：在**任何普通站点**（如 `platform.deepseek.com/usage`）拾取的引用**出生即死**
 * ——「引用捕获事实不完整：缺失 declarationHash —— 按失效处理」。根因是 D4 的口径是
 * 「必须有 `declarationHash`」，而站点声明（web-cli 协议）是**站点工具面**机制、不是
 * 「用户拾取」的前提：没有声明的站点，页面侧（冻结）只能写 `declarationHash: ''`，
 * 于是**第三方站点的引用全部不可用**（作者原话：拾取「几乎完全不可用」）。
 *
 * 修法（fail-closed **不放松**：改的是「捕获事实不完整」，不是「判定太严」）：
 *   - SW 的 `declarationEnv()`（**单一事实源**）新增 `declarationStatus`（`valid` /
 *     `invalid` / `absent`，由既有声明状态机派生）；面板摄取拾取事实时把该**状态**
 *     写入捕获事实（`declaration: { status, hash? }`，`valid` 才带摘要）；
 *   - 判定链 D4 由「必须有 hash」改为「**捕获时状态 vs 当刻状态一致**」：
 *     `valid` 还须摘要（及双方已知的 version）相等；`invalid` / `absent` 只比状态；
 *     **任何变化（出现 / 消失 / 变更）⇒ 失效并要求重新拾取**；
 *   - 修复前的旧记录（既无 hash 也无 status）**维持原判**（unknown ⇒ 按失效），不迁移。
 *
 * 产物影响：`dist/sidepanel.js` 362,777 → **366,755 B**（+3,978 B，+1.10%），逐模块可归因；
 * `dist/content.js` 177,076 B 与 `dist/pick-layer.js` 33,900 B **逐字节不变**（冻结面零改动）。
 * 方向 = 提升；`roundKind: 'registry-fidelity-round'`（同一 Feature 内的缺陷修复轮，非新功能轮），
 * 故 ④ 的「连续两个**功能轮**」告警口径不变。ceiling 由公式抬高 floor(366,755 × 1.05) = **385,092 B**；
 * 容差 5% 未动、cap 仍 `record-only`、`targetBudgetBytes` / `targetMet` 仍为 null。
 */
/**
 * ── 收口后缺陷修复轮 **R2**（2026-09-17，作者真机反馈；HEAD `6d9ed5d`）────────────
 *
 * 缺陷：站点声明**永久无效**（deepseek 返回 HTML）时，SW 的自动探测每 15 秒软重试一轮
 * ⇒ 风险位每 15 秒在「探测中」↔「站点声明存在但无效」之间闪烁（视觉上像卡死），
 * 且对永不声明的站点是**永久无意义重试**。
 *
 * **作者裁决**（2026-09-17）：「修：退避 + 稳态显示」——
 *   - 终态（声明 invalid / absent / version-mismatch）改用**指数退避** `15s → 30s → 60s →
 *     120s → 300s（封顶）`，**按 origin 独立计数**；结论变化即重置（站点真修好立刻回正常态）；
 *   - 「探测中」只在**真正发起 fetch** 的窗口出现；退避等待期风险位显示**稳态文案**
 *     （「低频自动复查中」）⇒ 不再每 15 秒闪一次；
 *   - 恢复能力不打折：页面导航/刷新、标签页切换、内容脚本 hello、授权、**面板可见性变化**
 *     一律立即重试并**重置退避**（`kick()`）；
 *   - 用户可见文案由「每 15 秒低频软重试」改为真实退避描述。
 *
 * 产物影响：`dist/sidepanel.js` 366,755 → **368,529 B**（+1,774 B，+0.48%），逐模块可归因
 * （metafile：view-model +1,006 / sidepanel +388 / risk-rail +352 / shell +28）；
 * `dist/content.js` 177,076 B 与 `dist/pick-layer.js` 33,900 B **逐字节不变**（sha256 复核）。
 * 方向 = 提升；`roundKind: 'registry-fidelity-round'`（同一 Feature 内的缺陷修复轮，
 * ④ 的「连续两个**功能轮**」告警口径不变）。ceiling 由公式抬高
 * floor(368,529 × 1.05) = **386,955 B**；容差 5% 未动、cap 仍 `record-only`。
 */
/**
 * ── 收口后缺陷修复轮 **R3**（2026-09-17，作者真机确认；HEAD `131f546`）────────────────
 *
 * 缺陷：deepseek 等 SPA 重渲染 / 插入兄弟节点后，位置链选择器断链（target text 仍在页面上），
 * 冻结判定链判 `dom-gone` ⇒ 引用死亡，用户只能手动重新拾取（手势成本高）。
 *
 * 修法（fail-closed **不放松**：结论枚举仍是 valid/invalid/unknown）：
 *   - **只读文本候选定位**（SW 侧 `background/ref-rescue.ts#rescueProbe` 注入，R1 的
 *     `observeIdentity()` 先例；不碰冻结的 `src/content/**`）：与摘要生成**同源**归一化匹配，
 *     返回候选数（唯一 / 多 / 0）；
 *   - 救援信息只作 `dom-gone` 的 **payload 元数据**（`rescue: {candidates, unique, urlChanged}`），
 *     不新增第四态；0 候选维持原文案；
 *   - **一键重锚仅唯一候选**：用户显式确认 → SW 只读计算**全新捕获事实** → 经与手工拾取
 *     **同一条**摄取管线（`withDeclaration()`）生成**新引用**（新 id、序号递增）+ 写身份标记；
 *     **旧引用零改动**（append-only，留痕契约）；
 *   - 多候选 / 跨路径（`document.URL` 与捕获时路径不同）**不提供自动锚定**，保留「重新拾取 /
 *     改用描述」；救援限定**同 origin 且已授权**（未授权零注入）。
 *
 * 产物影响：`dist/sidepanel.js` 368,529 → **375,102 B**（+6,573 B，+1.78%），逐模块可归因
 * （真实 metafile：ref-validity +1,057 / ref-store +222 / panels +1,044 / pick-input +2,450 /
 * sidepanel +1,800 = **+6,573 B**）；只读探测模块 `src/background/ref-rescue.ts` 落在
 * **service-worker bundle**（不进本产物）；`dist/content.js` 177,076 B 与 `dist/pick-layer.js`
 * 33,900 B **逐字节不变**（sha256 复核）。方向 = 提升；`roundKind: 'registry-fidelity-round'`
 * （同一 Feature 内的缺陷修复轮，④ 的「连续两个功能轮」告警口径不变）。
 * ceiling 由公式抬高 floor(375,102 × 1.05) = **393,857 B**；容差 5% 未动、cap 仍 `record-only`、
 * `targetBudgetBytes` / `targetMet` 仍为 null。
 */
export const SIDEPANEL_BASELINE_BYTES = 426_487;

/** Previous registered baselines (v1 / V2-2 / V2-3 / V2-4 / V2 R2) — kept on record. */
export const SIDEPANEL_BASELINE_BYTES_HISTORY = [
  1_068_165, 1_085_389, 1_110_744, 1_132_748, 1_159_856, 1_162_942,
] as const;

/**
 * The **chronological** registry of every value this file has ever published
 * (2026-09-16, I6). `SIDEPANEL_BASELINE_BYTES_HISTORY` keeps the monotonically
 * non-decreasing v1→V2-R2 chain; the post-lazification values are *smaller*, so
 * appending them there would break its monotonicity assertion. This timeline is
 * the "keep every previous value" record the re-registration discipline demands —
 * appending is the only allowed edit (history may never be rewritten).
 */
export const SIDEPANEL_BASELINE_BYTES_TIMELINE = [
  1_068_165, 1_085_389, 1_110_744, 1_132_748, 1_159_856, 1_162_942, 266_500, 291_523, 295_225, 327_679, 328_476,
  349_880, 349_925, 362_777, 366_500, 366_755, 368_529, 375_102, 385_319, 425_442, 425_094, 426_487,
] as const;

/**
 * 中间**测量**快照 —— **不是**登记基线（BLOCK-2，review R1）。
 *
 * v3-4 构建轮在收敛到最终登记值之前先后测到过 `362,163` 与 `362,865`（两者都出现在
 * 构建过程中，既非上一轮基线也非最终登记值）。它们**不属于**「已发布基线」链条，因此
 * 已于本轮从 {@link SIDEPANEL_BASELINE_BYTES_TIMELINE} 移出 —— 中间测量值留在时间线里
 * 会让「同一事实多版本」（v3-3 审查 I-03⑤ 立过的规矩）复发。它们**没有被静默删除**：
 * 逐字保留在此处与 `docs/v3-supersession-ledger.json` 的历史 `reason` 文本中，供审计。
 */
export const SIDEPANEL_BASELINE_BYTES_INTERMEDIATE_SNAPSHOTS = [362_163, 362_865] as const;

/** Allowed growth over the baseline before the guard fails. */
export const SIDEPANEL_BASELINE_TOLERANCE = 0.05;

/**
 * 纯记录字段（v3-2 修复轮，编排器裁决 **V3-VOL-1 ②**）—— **不再参与任何判定**。
 *
 * v3-1 的 I6 轮曾把这个值（306,099 B = 当时的 ceiling）当成「只降不升」的硬上限
 * （`min(floor(baseline × 1.05), cap)`）。该机制**未经 spec/作者要求**，是修复轮自加的
 * 自缚装置：它让「按真实产物重登记」这件事无法在不「放宽守卫」的前提下完成，最终挡住
 * 了 v3-2 里 spec 明文的 L1 功能。裁决据此**撤销其判定作用**，仅保留历史值以备审计。
 *
 * ⚠️ `SIDEPANEL_CEILING` / `evaluateSidepanelSize()` **不得**再读取本值；任何把 cap 重新
 * 接回判定的改动都是对本裁决的违反。角色由 `SIDEPANEL_CEILING_CAP_ROLE` 显式声明，
 * 并由 `test/size-budget.test.ts` 断言（`record-only` + 判定不含 cap）。
 */
export const SIDEPANEL_CEILING_CAP_RECORD = 306_099;

/** `'record-only'` —— cap 的历史值只作记录，**不参与判定**（裁决 V3-VOL-1 ②）。 */
export const SIDEPANEL_CEILING_CAP_ROLE = 'record-only' as const;

/**
 * 兼容别名（值同 `SIDEPANEL_CEILING_CAP_RECORD`）。**纯记录**，不得用于判定 ——
 * 保留旧名字只为让「cap 已撤销」这件事在 diff 里可见（旧名若被重新用于守护，
 * 门禁会因 `SIDEPANEL_CEILING_CAP_ROLE !== 'record-only'` 之外的断言而暴露）。
 */
export const SIDEPANEL_CEILING_CAP = SIDEPANEL_CEILING_CAP_RECORD;

/**
 * 判定公式（裁决 V3-VOL-1 ①）：`floor(baseline × (1 + tolerance))`。
 * 容差 5% 不变；**没有任何 cap 参与**（这正是撤销 cap 的落地处）。
 */
export const SIDEPANEL_CEILING = Math.floor(
  SIDEPANEL_BASELINE_BYTES * (1 + SIDEPANEL_BASELINE_TOLERANCE),
);

/**
 * 「不加 cap 时公式会给出的值」。撤销 cap 之后它与 `SIDEPANEL_CEILING` **必须相等** ——
 * 该等式本身就是「判定里没有隐藏上限」的机器证据（`test/size-budget.test.ts` 断言）。
 */
export const SIDEPANEL_CEILING_UNCAPPED = Math.floor(
  SIDEPANEL_BASELINE_BYTES * (1 + SIDEPANEL_BASELINE_TOLERANCE),
);

/**
 * The bytes `dist/sidepanel.js` actually has (I6: 登记值 == 实测产物). Asserted
 * equal to the measured artifact by `test/size-budget.test.ts`, and compared at
 * runtime against the density registry by `test/ui/density.mjs` stage F.
 */
export const SIDEPANEL_FINAL_ARTIFACT_BYTES = 426_487;

/**
 * Machine-readable provenance. `targetBudgetBytes` / `targetMet` are **null on
 * purpose**: this is a regression baseline, not a target. Asserting them null is
 * how the suite forbids「目标达成」wording here (ADR-V2-007).
 */
export const SIDEPANEL_BASELINE_META = {
  kind: 'regression-baseline-only',
  measuredOn: '2026-09-19',
  source: 'packages/web-cli-plugin/dist/sidepanel.js',
  buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
  measuredBy:
    'SDDU v4-2 closeout round (2026-09-19, leaf specs-tree-v4-2-chat-stream-model; validate R1 findings F-01 / F-02 / F-03 + N-02): re-registered the **v4-2 leaf** on the FINAL artifact after the closeout fixes (deep freeze of payload arrays / stream-merge strict monotonicity / sanitizeLabel scan-then-truncate / hasSegment wiring) — 425,094 → 426,487 B; the previous 425,094 B (review fix round) and 425,442 B (build round) stay verbatim in SIDEPANEL_BASELINE_BYTES_TIMELINE and in the v4-2 registration reasons. Previous round: SDDU v4-2 review fix round (2026-09-19, leaf specs-tree-v4-2-chat-stream-model; SDDU review→build loop): re-registered the **v4-2 round** on the FINAL artifact after the review fixes (I-06 stream-merge seq-idempotent dedupe / I-07 empty-state single projection source / I-08 removal of the unreachable `patchAiCard` branch / I-09 RP-V4-09 function name / I-12 dead CSS + check copy) — 385,319 → 425,094 B; the pre-fix published 425,442 B is retained verbatim in SIDEPANEL_BASELINE_BYTES_TIMELINE, and the pre-fix per-module build-round attribution (Σ 39,661 + glue 462 = 40,123) is retained in the v4-2 registration reason. Previous round: SDDU v4-2 build round (2026-09-19, leaf specs-tree-v4-2-chat-stream-model): re-registered on the final artifact of the append-only stream event model + the 12 card types (stream-model / stream-digest / stream-render / cards/*) + the zero-plaintext digest + the V4-2 TASK-613 card-budget tightening. Previous round: SDDU v4-1 build round (2026-09-19, leaf specs-tree-v4-1-zone-shell-density): re-registered on the final artifact of the three-zone skeleton (header#region-toolbar / main#region-stream > ol#stream[role=log] / footer#region-statusbar) — the read-only site summary + four view entries + three-state theme in the toolbar, the risk chips + `#risk-detail` in the status bar, the single-source density exemption subtree (`density-scope.ts`), and the `#log`→`#stream` selector migration; every assertion was re-anchored, none deleted. Previous round: SDDU defect-fix round R3 (2026-09-17, post-closeout; author real-device confirmation at HEAD 131f546): re-registered on the final artifact of the『引用重锚救援』round — a read-only text-candidate probe for a selector-broken reference (SW-injected, same normalization as the frozen text digest), the rescue payload attached to the `dom-gone` verdict as metadata only, and the user-confirmed one-click re-anchor that mints a NEW reference through the same ingestion pipeline while the old card stays untouched (append-only). The judge verdict set is unchanged (valid/invalid/unknown; fail-closed not relaxed). Previous round: SDDU defect-fix round R2 (2026-09-17, post-closeout; author adjudication「修：退避+稳态显示」at HEAD 6d9ed5d): re-registered on the final artifact of the declaration-probe exponential backoff (15s→5min cap, per-origin, conclusion-change reset) plus the steady「低频自动复查中」risk-row variant that removes the 15s flicker. Previous round: SDDU defect-fix round R1 (2026-09-17, post-closeout; author real-device report at HEAD 870cb6e): re-registered on the final artifact of the「无有效站点声明时拾取引用出生即死」fix (SW declarationStatus single source + panel ingestion completes the capture fact + D4 state-consistency caliber, plus the reference-round / background-ask supersession fix). Previous rounds: SDDU v3-3 build round (2026-09-16, leaf specs-tree-v3-3-l2-on-demand-views): re-measured on the final artifact of the L2 on-demand views (view replacement + the four views +真值计数 + the tree-ownership migration). Previous rounds: SDDU v3-2 build round + fix round + closeout round (2026-09-16, leaf specs-tree-v3-2-l1-disclosure-refs): re-measured on the final artifact of the L1 layer (eight in-place content classes + the fail-closed five-dimension reference judge + the receipt triple + the local-tree slice). The fix round executed orchestrator ruling V3-VOL-1 (baseline explicitly re-registered at 327,679 B, ceiling = the plain formula, self-imposed SIDEPANEL_CEILING_CAP hard cap REVOKED and demoted to a record-only field). The CLOSEOUT round dispositions validate R1 findings N-04/N-05/N-07/N-08 in `src/ui/sidepanel/**` and re-registers the measured 328,476 B (+797 B) as a registry-fidelity round. Previous registered baselines: 327,679 B (v3-2 fix round) / 295,225 B (v3-1 I6 round; also the reference tree of SIDEPANEL_GROWTH_BREAKDOWN) / 291,523 B (whose final artifact measured 294,874 B — the discrepancy the I6 round fixed) / 266,500 B (tighten round 2026-09-14, ceiling 279,825 B) / 1,159,856 B (R2, ceiling 1,217,848 B) / R2 closeout 1,162,942 B / V2-4 1,132,748 B / V2-3 1,110,744 B / V2-2 1,085,389 B / v1 1,068,165 B. Every previous value is retained in SIDEPANEL_BASELINE_BYTES_HISTORY / SIDEPANEL_BASELINE_BYTES_TIMELINE / SIDEPANEL_RE_REGISTRATIONS.',
  /**
   * ⚠️ 语义（收口轮明写）：本字段 = {@link SIDEPANEL_GROWTH_BREAKDOWN} 所比较的**参照树**
   * 的基线（v3-1 I6 轮 295,225 B），因此 `deltaBytes` 是「v3-1 树 → 当前树」的**累计**
   * 增量。**逐轮**前后值（含 327,679 → 328,476）在 `SIDEPANEL_RE_REGISTRATIONS`。
   */
  /**
   * ⚠️ 语义（v4-2 明写）：这是 {@link SIDEPANEL_GROWTH_BREAKDOWN} 所比较的**参照树**的基线
   * （v3-1 I6 轮 295,225 B），**不是**「上一轮登记值」；`deltaBytes` 因此是「v3-1 树 → 当前树」的
   * 累计增量。逐轮前后值（含 385,319 → 425,442 → 425,094）在 `SIDEPANEL_RE_REGISTRATIONS`。
   */
  previousBaselineBytes: 295_225,
  previousCeilingBytes: 393_857,
  direction: 'raised',
  ceilingDirection: 'raised-formula',
  finalArtifactBytes: 426_487,
  /** 裁决 V3-VOL-1 ②：cap 已撤销，仅作记录（判定路径不含它）。 */
  ceilingFormula: 'floor(baseline × (1 + tolerance))',
  ceilingCapRole: 'record-only',
  ceilingCapRecordBytes: 306_099,
  /** 裁决 V3-VOL-1 ④：同 Feature 连续两轮累计增幅 > 15% 时的可读告警（非 null 即须回报编排器）。 */
  consecutiveGrowthAlertThreshold: 0.15,
  consecutiveGrowthAlert:
    '已触发：见 SIDEPANEL_RE_REGISTRATIONS 与 evaluateConsecutiveReRegistrationGrowth()。' +
    '**最差连续两功能轮** = v3-1 + v3-2（266,500 → 327,679 B，累计 +22.96% > 15%）—— 已显式回报编排器；' +
    'v3-3 + v3-4（328,476 → 362,777 B，+10.44%）**低于** 15% 线，但仍按「最差对」口径保留告警（守卫只增不减，见 helper 注释）；' +
    '从 266,500 B 起算的 Feature 累计 **+40.75%**（**R3 后越过已登记的 40% 停工线**：38.28% → 40.75%，已在 R3 回报中**显式列出并如实上报**，未以任何方式放宽口径）。' +
    // ── 裁决 V3-VOL-3（2026-09-18，作者选 B）：该 40% 停工线被**显式撤销** ──────────
    // 历史事实（上句）**逐字保留**；撤销以「显式登记」方式追加，绝不是静默绕过。
    '⚠️ **该 Feature 级 40% 累计停工线已由作者裁决 V3-VOL-3（2026-09-18，选 B）显式撤销**：' +
    '266,500 B 基线口径的百分比线在活跃开发期已无参照意义（R3 后实际 +40.75%）—— ' +
    '本轮起**不再作为停工/放行判据**；撤销出处见 `SIDEPANEL_SIZE_RULING_V3_VOL_3` / ' +
    '`evaluateFeatureCumulativeStopWorkLine()`（`enforced: false`）/ `PENDING_ABSOLUTE_CAP`，' +
    '反证「恢复该线 ⇒ 当前产物 375,102 B（+40.75%）必然 FAIL」由 `test/size-ruling-vol3.test.ts` 机器重跑。' +
    '**保留项（零改动）**：单轮 5% 容差 · 重登记五要素披露（前后值/日期/来源/理由/历史保留）· ' +
    '相邻两轮 >15% 告警 · `ceiling = floor(当前值 × 1.05)`。' +
    '**新增义务（硬约束）**：方案 F 重构（聊天流统一承载）落地收口时，必须**重新定 sidepanel 体积基线并设绝对值上限**。',
  /** 裁决 V3-VOL-3（2026-09-18，选 B）：Feature 级 40% 累计停工线已**显式撤销**（40.75% 不再触线）。 */
  cumulativeStopWorkLineStatus: 'revoked-by-V3-VOL-3',
  /**
   * 裁决 V3-VOL-3 的新增义务（硬约束）：方案 F 重构（聊天流统一承载）落地收口时，必须
   * **重新定 sidepanel 体积基线 + 设绝对值上限**（绝对值，不再用 266,500 基线口径的百分比线）。
   * 机器标记与「防静默删除」断言见 {@link PENDING_ABSOLUTE_CAP} / {@link evaluatePendingAbsoluteCap}。
   */
  pendingAbsoluteCapObligation:
    '方案 F 重构（聊天流统一承载）落地收口时，必须重新定 sidepanel 体积基线并设置绝对值上限',
  reRegisteredFrom:
    'v4-2 leaf 收口轮 426,487 B（ceiling 447,811 B；validate R1 的 F-01 深冻结 / F-02 seq 严格单调 / F-03 扫描先行 / N-02 hasSegment 接线）；' +
    'v4-2 review 修复轮 425,094 B（ceiling 446,348 B）与 v4-2 build 轮 425,442 B（ceiling 446,714 B）；' +
    'v4-1 三区骨架轮 375,102 B（ceiling 393,857 B；三区骨架 + 工具栏/状态栏/主题 + 密度口径单源）；' +
    'R2 缺陷修复轮 368,529 B（ceiling 386,955 B；声明探测退避 + 稳态显示）；' +
    'R1 缺陷修复轮 366,755 B（ceiling 385,092 B；无有效声明站点的引用出生即死修复 + 身份标记回程观测）；' +
    'v3-4 收口轮 362,777 B（ceiling 380,915 B；v3-4 功能轮 + 裁决 V3-VOL-2 的 pick-layer 重登记，产物本身未再动）；' +
    'v3-4 轮 349,925 B（ceiling 367,421 B；面板侧接线 pick-input.ts + 手势表单一清单 + 拾取不可用态）；' +
    'v3-3 修复轮 349,880 B（ceiling 367,374 B；审查 R1 的 F-01 订正 + I-01 逐目标 aria-controls 修复 + expectFailPattern 防呆）；v3-2 收口轮 328,476 B（ceiling 344,899 B，公式判定）；更早 v3-2 修复轮 327,679 B（ceiling 344,062 B）、v3-1 I6 轮 295,225 B（ceiling 306,099 B，cap 只降不升）与 291,523 B（该轮最终产物实测 294,874 B）、266,500 B（ceiling 279,825 B，2026-09-14 收紧轮）、1,159,856 B（ceiling 1,217,848 B）与 R2 收口实测 1,162,942 B',
  targetBudgetBytes: null,
  targetMet: null,
  reason:
    'sidepanel.js 无字节目标；本值为「不得回退」回归基线（基线 ≠ 目标预算）。' +
    '**2026-09-19 v4-1 三区骨架轮显式提升重登记：375,102 → 385,319 B（+10,217 B，+2.72%）**：' +
    '逐模块可归因（真实 metafile，Σ 模块增量 == +10,075 B + 未归因胶水 142 B == 真实产物差）：' +
    '四个**新必需模块** toolbar +3,111 / theme +2,937 / density-scope +1,783 / statusbar +976（= +8,807）；' +
    '既有模块接线 sidepanel +1,177 / view-model +398 / risk-rail +1,288 / shell +161 / view-host +1，' +
    '以及退役面收缩 disclosure −130 / l0/status-bar −1,627（计数徽标与摘要写入迁往工具栏 ⇒ 旧写入器只剩 67 B）；' +
    '**四类分解之和 == 累计增量 90,094 B**，未解释字节 598 B（<1,000 B 阈值）；' +
    '**断言零删减**：v4-1 只做「同编号等价改写 + 台账登记」（l0 整文件重写 / l1 入口机制重写 / l2 入口迁移 / insight 与 binding 选择器重锚），' +
    '`dist/content.js` 177,076 B 与 `dist/pick-layer.js` 33,900 B **逐字节不变**；' +
    'ceiling 由公式抬高 floor(385,319 × 1.05) = **404,584 B**（容差 5% 未动、cap 仍 record-only、' +
    '`targetBudgetBytes`/`targetMet` 仍为 null、`PENDING_ABSOLUTE_CAP` 仍 `resolved:false` 且未预填）。' +
    '**2026-09-17 缺陷修复轮 R3 显式提升重登记：368,529 → 375,102 B（+6,573 B，+1.78%）**：' +
    '全部来自「引用重锚救援」，逐模块可归因（真实 metafile，Σ == +6,573 B）：`pick-input.ts` +2,450（只读探测 + 重锚摄取落点）、' +
    '`sidepanel.ts` +1,800（`maybeRescue()` 探测触发（含重判）+ `reanchorRef()` 接线 + 测试 seam）、`l1/ref-validity.ts` +1,057（救援 payload 元数据 + 可读原因）、' +
    '`l1/panels.ts` +1,044（条件按钮 + `canReanchor()` 纯判据 + 报告）、`l1/ref-store.ts` +222（payload 透传到记录）；' +
    '只读探测模块 `src/background/ref-rescue.ts` 落在 **service-worker** 产物（不在本 bundle，故不计入）。' +
    '**fail-closed 未放松**：结论枚举不扩、0 候选维持原文案、多候选/跨路径不提供自动锚定、未授权 origin 零注入零救援；' +
    '`dist/content.js` 177,076 B 与 `dist/pick-layer.js` 33,900 B **逐字节不变**（sha256 复核）。' +
    'ceiling 由公式抬高 floor(375,102 × 1.05) = **393,857 B**。' +
    '**2026-09-17 缺陷修复轮 R2 显式提升重登记：366,755 → 368,529 B（+1,774 B，+0.48%）**：' +
    '全部来自「站点声明探测指数退避 + 稳态显示」：`view-model.ts` +1,006（稳态文案 derivation + `AUTO_RETRY_LINE` 改为真实退避描述 + `probeSteady` 契约）、' +
    '`sidepanel.ts` +388（稳态行接线；面板可见性信号经 binding 门禁实测后回退，净增为稳态行接线部分）、' +
    '`l0/risk-rail.ts` +352（稳态 override 与重绘签名）、`l0/shell.ts` +28（override 透传）；' +
    '`discovery/auto-probe.ts` 的调度器改动全部落在 **service-worker** 产物（不在本 bundle，故不计入），' +
    '`dist/content.js` 与 `dist/pick-layer.js` 逐字节不变。ceiling 由公式抬高 floor(368,529 × 1.05) = **386,955 B**。' +
    '**2026-09-17 缺陷修复轮 R1 显式提升重登记：362,777 → 366,755 B（+3,978 B，+1.10%）**：' +
    '全部来自「无有效站点声明时拾取引用出生即死」的修复与引用回合 busy 残留修复，逐模块可归因（esbuild metafile，Σ == +3,623 B）：' +
    '`l1/ref-validity.ts` +1,762（D4 由「必须有 hash」改为「捕获时状态 vs 当刻状态一致」+ 状态可读文案 + 旧记录逐分支维持原判的 legacy 分支）、' +
    '`sidepanel.ts` +854（state 回复的 declarationStatus 映射 + 身份标记回程重判 + `supersededAsk()` 落点）、' +
    '`pick-input.ts` +724（`withDeclaration()`：页面侧冻结产物只能写 hash，摄取点补全状态；judgeEnv 增 declarationStatus；`highlight(mark)` 交回新观测）、' +
    '`l1/ref-store.ts` +256（`declaration` 事实透传）、`chat-state.ts` +220（`REF_ROUND_PREFIX` + `supersededAsk()` 纯判据）、' +
    '`view-model.ts` +162（StateMessageView.declaration 增 declarationStatus + 风险位文案一行）。' +
    '**fail-closed 未放松**：判定链的每个新出口仍是 invalid / unknown，`valid` 只可能在「状态相同 ∧ (valid 时)摘要与 version 相同」时出现；' +
    '修复前的旧记录（既无 hash 也无 status）维持 unknown ⇒ 按失效。`dist/content.js` 177,076 B 与 `dist/pick-layer.js` 33,900 B **逐字节不变**（sha256 复核）。' +
    'ceiling 由公式抬高 floor(366,755 × 1.05) = **385,092 B**，容差 5% 未动、cap 仍为 record-only、targetBudgetBytes/targetMet 仍为 null；' +
    '从 266,500 B 起算的 Feature 累计 **+37.62%**（< 40% 停工线）。' +
    '**2026-09-16 v3-4 显式提升重登记：349,925 → 362,777 B（+12,852 B，+3.67%）**：本叶「页面即输入」落在 `sidepanel.js` 的部分只有面板侧接线 —— ' +
    '新增 1 个必需模块 `ui/sidepanel/pick-input.ts`（5_085 B：双触发注入 / 文档身份缓存 / 拖放落点 / 良性拒绝分类）与接线（sidepanel.ts +4_784、' +
    'l1/panels.ts +1,830 手势表由单一清单渲染、view-model.ts +422 手势清单与拾取不可用态、l0/shell.ts +694 风险区可用性行）；' +
    '页面侧功能全部落在**独立产物** `dist/pick-layer.js`（登记值 **33,900 B** —— 2026-09-17 经编排器裁决 V3-VOL-2 显式重登记：首轮 32,391 B → +1,509 B，承载 I-02/I-03/I-01②③/I-10 的正确性修复；自有「不增长」上限、容差 0，见 PICK_LAYER_*），`dist/content.js` 仍为 **177,076 B 逐字节不变**。' +
    'ceiling 由公式抬高 floor(362,777 × 1.05) = **380,915 B**，容差 5% 未动、cap 仍为 record-only、targetBudgetBytes/targetMet 仍为 null；' +
    '从 266,500 B 起算的 Feature 累计 **+36.13%**（< 40%）已在 v3-4 回报中显式列出。' +
    '（构建过程中的中间测量值 362,163 / 362,865 **不是**已发布基线，已从 TIMELINE 移出并保留在 SIDEPANEL_BASELINE_BYTES_INTERMEDIATE_SNAPSHOTS。）' +
    '更早轮次：2026-09-16 **v3-3 显式提升重登记：328,476 → 349,880 B（+21,404 B，+6.52%）**，' +
    '全部来自 spec 明文要求的 L2 按需视图（父 FR-V3-045~054 / AC-V3-026）：新增 5 个必需模块（l2/counts.ts 2,932 / l2/view-host.ts 3,206 / ' +
    'l2/command-catalog.ts 6,106 / l2/audit.ts 4,145 / settings/sections.ts 226 = 16,615 B）+ 接线（sidepanel.ts / view-model.ts / l0/status-bar.ts / ' +
    'l0/shell.ts）+ 归因位移；ceiling 由公式抬高 floor(349,880 × 1.05) = **367,374 B**，容差 5% 未动、cap 仍为 record-only、' +
    'targetBudgetBytes/targetMet 仍为 null；从 266,500 B 起算的 Feature 累计 **+31.29%**（>30%）已在 v3-3 回报中显式列出。' +
    '2026-09-16 v3-3 修复轮（同一叶，审查 R1 后）：按真实产物再登记 **349,880 → 349,925 B（+45 B，+0.013%）**，' +
    '增量**逐模块可归因**：全部来自 I-01（`l0/status-bar.ts` 逐目标 `aria-controls`，1,649 → 1,694 B）；' +
    'F-01 反证订正（版本化 harness `test/ui/l2-reverse.mjs` + 共享判定器 `test/reverse-proof-judge.mjs` + 元门禁 R4 防呆）与死代码清理（`catalogCounts()` 树摇 Δ=0）均**不动产物**；' +
    'ceiling 由公式抬高 floor(349,925 × 1.05) = **367,421 B**，容差 5% 未动、cap 仍 record-only、targetBudgetBytes/targetMet 仍为 null；' +
    'Feature 累计 **+31.30%**（>30%）已在修复轮回报中显式列出（连续两个功能轮口径仍为 +18.51%）。' +
    '更早轮次：2026-09-16 v3-2 显式**提升**重登记：L1 八类就地展开 + 引用失效 fail-closed 判定 + 回执三件套 + 局部树为 spec 明文要求的**必需增重**（父 spec FR-V3-030~040 / AC-V3-008~010 / AC-V3-022/023），实测 327,679 B（前值 295,225 B，+32,454 B）。修复轮按裁决 V3-VOL-1 ② 撤销自加 cap（该 cap 非 spec/作者要求），判定恢复为公式值。**收口轮**再 +797 B 至 **328,476 B**（前值 327,679 B）：四处改动都在 `src/ui/sidepanel/**`，逐条对应 validate R1 的 N-04（`repick()` 不再自证 `resolved`，观测由调用方传入）/ N-05（`setEnv({}, replace=true)` 真清空 env）/ N-07（D4 原因写明 hash 或 version 哪一项变化）/ N-08（退役记录冻结退役时的可读原因），无冗余或重复代码；ceiling 仍由公式给出 floor(328,476 × 1.05) = **344,899 B** —— 由公式抬高，而不是靠「放宽容差」或「删断言」达成；容差 5% 未动。累计增量构成见 §SIDEPANEL_GROWTH_BREAKDOWN（v3-1 树 → 当前树：新必需模块 26,913 B / 接线 5,888 B / 归因位移 220 B / 未归因胶水 230 B = +33,251 B）。历史值 1,068,165 / 1,085,389 / 1,110,744 / 1,132,748 / 1,159,856 / 1,162,942 / 266,500 / 291,523 / 295,225 / 327,679 全保留；断言零删减（方向敏感断言按新实测值重新 pin，见 docs/v3-supersession-ledger.json 的 V32-S1~S6 / V32-S17 / V32-MR-FIX）；targetBudgetBytes/targetMet 保持 null；+1 B 反证在**当前 ceiling** 上重跑。',
  note: '（保留字段名与历史断言连续性；本轮语义已由 reason 承载）缺陷修复轮 R3 把 sidepanel.js 回归基线**提升**重登记至 375,102 B（前值 368,529 B；更早 366,755 / 362,777 / 349,925 / 349,880 / 328,476 / 327,679 / 295,225 / 291,523 / 266,500）。R3 的 ceiling = floor(375,102 × 1.05) = 393,857 B（roundKind=registry-fidelity-round：同一 Feature 内的缺陷修复轮，④ 的「连续两个功能轮」口径不变）。缺陷修复轮 R1 把 sidepanel.js 回归基线**提升**重登记至 366,755 B（前值 362,777 B；更早 349,925 / 349,880 / 328,476 / 327,679 / 295,225 / 291,523（产物实测 294,874）/ 266,500）。R1 的 ceiling = floor(366,755 × 1.05) = 385,092 B（roundKind=registry-fidelity-round：同一 Feature 内的缺陷修复轮，④ 的「连续两个功能轮」口径不变）。v3-2 修复轮已按裁决 V3-VOL-1 ② 撤销自加 cap（cap 降级为 record-only，判定只走公式）。历史值全保留，容差 5% 不变，断言零删减。',
} as const;

/**
 * ── 替代守卫 ②（裁决 V3-VOL-1 ③②）：**重登记披露登记册** ────────────────────────
 *
 * 每一次重登记都必须**显式登记**：前后值 + 日期 + 来源 + `buildCommand` +
 * `measuredBy` + **理由** + 「断言零删减」的台账条目 + 本轮逐字保留的历史值。
 * 这不是文档，而是判定数据：`test/size-budget.test.ts` 逐条断言字段齐备、链条
 * 首尾相接（上一轮的 after == 下一轮的 before）、历史值必须仍在
 * `_HISTORY` / `_TIMELINE` 中逐字存在。
 *
 * `roundKind` 区分**功能轮**（一个叶交付）与**登记保真轮**（同一叶内的更正）：
 * 替代守卫 ④ 的方向性告警只按**功能轮**计「连续两轮」。
 */
export interface SizeReRegistration {
  /** 轮次标识（feature-round 形如 `v3-1`，登记保真轮形如 `v3-1-i6`）。 */
  readonly id: string;
  readonly roundKind: 'feature-round' | 'registry-fidelity-round';
  readonly feature: string;
  readonly date: string;
  readonly source: string;
  readonly buildCommand: string;
  readonly measuredBy: string;
  /** 理由（必填、非空；须写明为何必须增重）。 */
  readonly reason: string;
  readonly baselineBeforeBytes: number;
  readonly baselineAfterBytes: number;
  readonly ceilingBeforeBytes: number;
  readonly ceilingAfterBytes: number;
  /** 「断言零删减」的台账条目 id（`docs/v3-supersession-ledger.json`）。 */
  readonly assertionNonRemovalEntries: readonly string[];
  /** 本轮**逐字保留**的历史值（必须仍在 HISTORY / TIMELINE 中）。 */
  readonly historyRetainedBytes: readonly number[];
  /** 重登记时的实际候选 ceiling（撤销 cap 前 = cap 生效值；撤销后 = 公式值）。 */
  readonly ceilingUncappedFormulaBytes: number;
}

export const SIDEPANEL_RE_REGISTRATIONS: readonly SizeReRegistration[] = [
  {
    id: 'v3-1',
    roundKind: 'feature-round',
    feature: 'specs-tree-web-cli-plugin-v3-ui',
    date: '2026-09-16',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy: 'SDDU v3-1 build round (leaf specs-tree-v3-1-l0-shell-density)',
    reason: 'L0 常驻骨架 + 单一折叠控制器 + L0 视图模型为 v3 披露改造的有意增重。',
    baselineBeforeBytes: 266_500,
    baselineAfterBytes: 291_523,
    ceilingBeforeBytes: 279_825,
    ceilingAfterBytes: 306_099,
    assertionNonRemovalEntries: ['V31-S6', 'V31-S7'],
    historyRetainedBytes: [
      1_068_165, 1_085_389, 1_110_744, 1_132_748, 1_159_856, 1_162_942, 266_500,
    ],
    ceilingUncappedFormulaBytes: 306_099,
  },
  {
    id: 'v3-1-i6',
    roundKind: 'registry-fidelity-round',
    feature: 'specs-tree-web-cli-plugin-v3-ui',
    date: '2026-09-16',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy: 'SDDU v3-1 review fix round (I6, registry fidelity)',
    reason:
      '登记保真更正：上一轮发表的 291,523 B 与该轮最终产物 294,874 B 不符（I6），按真实产物 295,225 B 重登记；当时 cap 生效故 ceiling 未动。',
    baselineBeforeBytes: 291_523,
    baselineAfterBytes: 295_225,
    ceilingBeforeBytes: 306_099,
    ceilingAfterBytes: 306_099,
    assertionNonRemovalEntries: ['V31-S10', 'V31-S11', 'V31-S12'],
    historyRetainedBytes: [291_523, 266_500, 1_162_942, 1_159_856],
    ceilingUncappedFormulaBytes: 309_986,
  },
  {
    id: 'v3-2',
    roundKind: 'feature-round',
    feature: 'specs-tree-web-cli-plugin-v3-ui',
    date: '2026-09-16',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy:
      'SDDU v3-2 build round + fix round (leaf specs-tree-v3-2-l1-disclosure-refs, 编排器裁决 V3-VOL-1)',
    reason:
      'L1 八类就地展开 + 引用失效 fail-closed 五维判定 + 回执三件套 + 局部树为父 spec FR-V3-030~040 明文必需；修复轮按裁决 V3-VOL-1 撤销自加 cap，ceiling 恢复为公式值 floor(baseline × 1.05)。',
    baselineBeforeBytes: 295_225,
    baselineAfterBytes: 327_679,
    ceilingBeforeBytes: 306_099,
    ceilingAfterBytes: 344_062,
    assertionNonRemovalEntries: [
      'V32-S1',
      'V32-S2',
      'V32-S3',
      'V32-S4',
      'V32-S5',
      'V32-S6',
    ],
    historyRetainedBytes: [295_225, 291_523, 266_500, 1_162_942, 1_159_856],
    ceilingUncappedFormulaBytes: 344_062,
  },
  {
    id: 'v3-2-closeout',
    roundKind: 'registry-fidelity-round',
    feature: 'specs-tree-web-cli-plugin-v3-ui',
    date: '2026-09-16',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy: 'SDDU v3-2 closeout round (leaf specs-tree-v3-2-l1-disclosure-refs, after validate R1)',
    reason:
      'validate R1 的 N-04/N-05/N-07/N-08 处置全部落在 `src/ui/sidepanel/**`（重拾观测化 / env 真清空 / D4 原因指项 / 退役原因冻结），产物按实测 328,476 B 显式重登记（+797 B，+0.24%）。同一叶内的更正轮 → registry-fidelity-round（④ 的「连续两个功能轮」口径不变）。',
    baselineBeforeBytes: 327_679,
    baselineAfterBytes: 328_476,
    ceilingBeforeBytes: 344_062,
    ceilingAfterBytes: 344_899,
    assertionNonRemovalEntries: ['V32-S17'],
    historyRetainedBytes: [327_679, 295_225, 291_523, 266_500, 1_162_942, 1_159_856],
    ceilingUncappedFormulaBytes: 344_899,
  },
  {
    id: 'v3-3',
    roundKind: 'feature-round',
    feature: 'specs-tree-web-cli-plugin-v3-ui',
    date: '2026-09-16',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy: 'SDDU v3-3 build round (leaf specs-tree-v3-3-l2-on-demand-views)',
    reason:
      'L2 按需视图为父 spec FR-V3-045~054 / AC-V3-026 明文必需：四视图默认零占用 + 「计数 + 入口」（真值派生）+ 视图替换与 ← 返回（返回后展开态与密度复原）+ ' +
      'L2 期间风险位常驻可见 + 命令目录分列/零控件 + 审计零明文 + 树归属迁移（role=dialog→region）+ 能力集等价 8 项。' +
      '新增 5 个必需模块（counts / view-host / command-catalog / audit / settings-sections = 16,615 B）与接线（sidepanel.ts +4,501 / status-bar +267）；' +
      '`l0/shell.ts` 与 `view-model.ts` 因骨架期临时逻辑被真实实现取代而**净减** 213 B。ceiling 由公式抬高 floor(349,880 × 1.05) = 367,374 B；' +
      '容差 5% 未动、cap 仍为 record-only、targetBudgetBytes/targetMet 仍为 null。',
    baselineBeforeBytes: 328_476,
    baselineAfterBytes: 349_880,
    ceilingBeforeBytes: 344_899,
    ceilingAfterBytes: 367_374,
    assertionNonRemovalEntries: ['V33-S1', 'V33-S5', 'V33-S7', 'V33-S9', 'V33-MR-01', 'V33-MR-06'],
    historyRetainedBytes: [328_476, 327_679, 295_225, 291_523, 266_500, 1_162_942, 1_159_856],
    ceilingUncappedFormulaBytes: 367_374,
  },
  {
    id: 'v3-3-fix',
    roundKind: 'registry-fidelity-round',
    feature: 'specs-tree-web-cli-plugin-v3-ui',
    date: '2026-09-16',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy: 'SDDU v3-3 review-fix round (leaf specs-tree-v3-3-l2-on-demand-views, review R1)',
    reason:
      '审查 R1 修复轮：+45 B 全部来自 I-01（`l0/status-bar.ts` 的 `aria-controls` 改为**逐目标** —— 设置入口指向 `#settings-view`，' +
      '1,382 → 1,694 B）；死代码清理（`l2/command-catalog.ts#catalogCounts()`，已被树摇 ⇒ Δ=0 B）与 F-01 订正（`test/**` + `docs/**`，不影响产物）不引入字节。' +
      '同一叶内的更正轮 ⇒ `registry-fidelity-round`（④ 的「连续两个功能轮」口径不变，仍为 +18.51%）。',
    baselineBeforeBytes: 349_880,
    baselineAfterBytes: 349_925,
    ceilingBeforeBytes: 367_374,
    ceilingAfterBytes: 367_421,
    assertionNonRemovalEntries: ['V33F-S1', 'V33F-S2', 'V33F-S5', 'V33F-S6', 'V33F-S8', 'V33F-S10', 'V33F-S11'],
    historyRetainedBytes: [349_880, 328_476, 327_679, 295_225, 291_523, 266_500, 1_162_942, 1_159_856],
    ceilingUncappedFormulaBytes: 367_421,
  },
  {
    id: 'v3-4',
    roundKind: 'feature-round',
    feature: 'specs-tree-web-cli-plugin-v3-ui',
    date: '2026-09-16',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy: 'SDDU v3-4 build round (leaf specs-tree-v3-4-page-as-input)',
    reason:
      '「页面即输入」的面板侧为父 spec FR-V3-060~072 明文必需，且**只有接线**落在本产物：新增 1 个必需模块 ' +
      '`ui/sidepanel/pick-input.ts`（5,085 B —— 双触发按需注入 / 文档身份（documentId·navSeq）缓存 / `application/x-wcli-ref` 拖放落点 / ' +
      'AC-CONV-1 的 env 组装）；接线 4 处（sidepanel.ts +4,202：选择答复走唯一 guard 入口 + 生产 env 注入点 + P5 回合可视化；' +
      'l1/panels.ts +1,830：手势表改由**单一清单**渲染，FR-V3-070 的「条目数 = 实测数」不再靠人工同步；' +
      'view-model.ts +422：L1_GESTURE_LABELS + 拾取不可用态；l0/shell.ts +694：风险区「页面侧不可用（原因）」行）。' +
      '页面侧交互层**不进本产物**：`dist/pick-layer.js` 是独立 artifact，有自有「不增长」上限（PICK_LAYER_*）；`dist/content.js` 逐字节不变（177,076 B）。',
    baselineBeforeBytes: 349_925,
    baselineAfterBytes: 362_777,
    ceilingBeforeBytes: 367_421,
    ceilingAfterBytes: 380_915,
    assertionNonRemovalEntries: ['V34-S1', 'V34-S2', 'V34-S4', 'V34-S5', 'V34-S9', 'V34-S10', 'V34-S12', 'V34-N1', 'V34-N2', 'V34-N4'],
    historyRetainedBytes: [349_925, 349_880, 328_476, 327_679, 295_225, 291_523, 266_500, 1_162_942, 1_159_856],
    ceilingUncappedFormulaBytes: 380_915,
  },
  {
    id: 'v3-4-r1',
    roundKind: 'registry-fidelity-round',
    feature: 'specs-tree-web-cli-plugin-v3-ui',
    date: '2026-09-17',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy:
      'SDDU defect-fix round R1 (2026-09-17, post-closeout; author real-device report at HEAD 870cb6e)',
    reason:
      '**收口后缺陷修复轮（+3,978 B / +1.10%）**：作者真机反馈「普通站点拾取的引用几乎完全不可用」。' +
      '根因 = D4 要求「必须有 declarationHash」，而站点声明是**站点工具面**机制、不是拾取的前提：' +
      '没有声明的站点，页面侧（冻结）只能写 `declarationHash: \'\'` ⇒ 捕获事实被判「缺失」⇒ **引用出生即死**。' +
      '修法 = SW 的 `declarationEnv()`（单一事实源）新增 `declarationStatus`，面板摄取拾取事实时把**状态**写入捕获事实' +
      '（`declaration: { status, hash? }`），D4 改为「捕获时状态 vs 当刻状态一致」（任何变化 ⇒ 失效并要求重拾）；' +
      '修复前的旧记录（无 hash 无 status）维持原判（fail-closed 不放松）。同日一并修复引用回合取代后台提问导致的 busy 残留' +
      '（`chat-state.ts#supersededAsk()` + `acceptCapture` 结算为 canceled）。' +
      '逐模块归因（受控实验 `npm run size:attribution -- --rev 870cb6e --rev WORKTREE`，Σ == +3,623 B）：' +
      'ref-validity +1,762 / sidepanel +854 / pick-input +724 / ref-store +256 / chat-state +220 / view-model +162。' +
      '本轮 `dist/content.js` 177,076 B 与 `dist/pick-layer.js` 33,900 B 逐字节不变（sha256 复核）；' +
      'ceiling = floor(366,400 × 1.05) = 384,720 B（容差 5% 未动、cap 仍 record-only）。' +
      '同一 Feature 内的缺陷修复轮 ⇒ `registry-fidelity-round`（④ 的「连续两个功能轮」告警口径不变）。',
    baselineBeforeBytes: 362_777,
    baselineAfterBytes: 366_755,
    ceilingBeforeBytes: 380_915,
    ceilingAfterBytes: 385_092,
    assertionNonRemovalEntries: ['V34R1-S1', 'V34R1-S2', 'V34R1-S3'],
    historyRetainedBytes: [362_777, 349_925, 349_880, 328_476, 327_679, 295_225, 291_523, 266_500, 1_162_942, 1_159_856],
    ceilingUncappedFormulaBytes: 385_092,
  },
  {
    id: 'v3-4-r2',
    roundKind: 'registry-fidelity-round',
    feature: 'specs-tree-web-cli-plugin-v3-ui',
    date: '2026-09-17',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy:
      'SDDU defect-fix round R2 (2026-09-17, post-closeout; author adjudication「修：退避+稳态显示」at HEAD 6d9ed5d)',
    reason:
      '**收口后缺陷修复轮（+1,774 B / +0.48%）**：作者真机反馈「deepseek 站点声明永远无效（返回 HTML）⇒ ' +
      '风险位每 15 秒在「探测中」↔「站点声明存在但无效」之间闪烁，像卡死」。裁决修法 = ① 终态声明探测改用指数退避 ' +
      '`15s→30s→60s→120s→300s（封顶）`（按 origin 独立计数，结论变化即重置）；② 退避等待期风险位显示稳态文案、' +
      '只有真正发起 fetch 才显示「探测中」；③ 导航/刷新/切标签页/内容脚本 hello/授权/面板可见性一律立即重试并重置退避；' +
      '④ 用户可见文案改为真实退避描述。逐模块归因（真实 metafile `bytesInOutput`，Σ == +1,774 B）：' +
      'view-model +1,006 / sidepanel +388 / risk-rail +352 / shell +28（退避调度器在 service-worker bundle，不进本产物）；' +
      '本轮 `dist/content.js` 177,076 B 与 `dist/pick-layer.js` 33,900 B 逐字节不变（sha256 复核）；' +
      'ceiling = floor(368,529 × 1.05) = 386,955 B（容差 5% 未动、cap 仍 record-only）。' +
      '同一 Feature 内的缺陷修复轮 ⇒ `registry-fidelity-round`（④ 的「连续两个功能轮」告警口径不变）。',
    baselineBeforeBytes: 366_755,
    baselineAfterBytes: 368_529,
    ceilingBeforeBytes: 385_092,
    ceilingAfterBytes: 386_955,
    assertionNonRemovalEntries: ['V34R2-S1', 'V34R2-S2', 'V34R2-S3', 'V34R2-S4'],
    historyRetainedBytes: [366_755, 362_777, 349_925, 349_880, 328_476, 327_679, 295_225, 291_523, 266_500, 1_162_942, 1_159_856],
    ceilingUncappedFormulaBytes: 386_955,
  },
  {
    id: 'v3-4-r3',
    roundKind: 'registry-fidelity-round',
    feature: 'specs-tree-web-cli-plugin-v3-ui',
    date: '2026-09-17',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy:
      'SDDU defect-fix round R3 (2026-09-17, post-closeout; author real-device confirmation at HEAD 131f546)',
    reason:
      '**收口后缺陷修复轮（+6,573 B / +1.78%）**：作者真机确认「deepseek 页面上拾取的引用被判失效，但目标文字仍可见」——' +
      'SPA 重渲染 / 插入兄弟节点后位置链选择器断链（文字没变、位置索引变了），冻结判定链判 `dom-gone` ⇒ 引用死亡，只能手动重拾（手势成本高）。' +
      '修法（**fail-closed 不放松**）：① SW 侧**只读**文本候选定位（`background/ref-rescue.ts#rescueProbe` 注入，R1 `observeIdentity()` 先例；' +
      '不碰冻结的 `src/content/**`），按与摘要生成**同源**的归一化匹配，返回候选数（唯一 / 多 / 0）；' +
      '② 救援信息只作 `dom-gone` 失效原因的 **payload 元数据**（`rescue: {candidates, unique, urlChanged}`）——结论枚举仍是 valid/invalid/unknown，**不新增第四态**；' +
      '0 候选维持原文案（真没了）；③ **一键重锚仅唯一候选 ∧ 路径未变**：用户显式确认后 SW 只读计算**全新捕获事实**，' +
      '经与手工拾取**同一条**摄取管线（`withDeclaration()`）生成**新引用**（新 id、序号递增）+ 写身份标记；**旧引用零改动**（append-only，留痕契约）；' +
      '④ 多候选 / 跨路径（`document.URL` 与捕获时路径不同）**不提供自动锚定**，保留「重新拾取 / 改用描述」；救援限定**同 origin 且已授权**（未授权零注入零救援）。' +
      '逐模块归因（真实 metafile `bytesInOutput`，Σ == +6,573 B）：`pick-input.ts` +2,450 / `sidepanel.ts` +1,800 / `l1/ref-validity.ts` +1,057 / ' +
      '`l1/panels.ts` +1,044 / `l1/ref-store.ts` +222；只读探测模块 `src/background/ref-rescue.ts` 落在 **service-worker bundle**（不进本产物）。' +
      '本轮 `dist/content.js` 177,076 B 与 `dist/pick-layer.js` 33,900 B 逐字节不变（sha256 复核）；' +
      'ceiling = floor(375,102 × 1.05) = **393,857 B**（容差 5% 未动、cap 仍 record-only）。' +
      '**⚠️ 需显式上报**：从 266,500 B 起算的 Feature 累计由 38.28% 升至 **40.75%**，越过已登记的 40% 停工线 —— 已在 R3 回报中如实列出（未放宽任何口径）。' +
      '同一 Feature 内的缺陷修复轮 ⇒ `registry-fidelity-round`（④ 的「连续两个功能轮」告警口径不变）。',
    baselineBeforeBytes: 368_529,
    baselineAfterBytes: 375_102,
    ceilingBeforeBytes: 386_955,
    ceilingAfterBytes: 393_857,
    assertionNonRemovalEntries: ['V34DR3-S1', 'V34DR3-S2', 'V34DR3-S3', 'V34DR3-S4', 'V34DR3-S5', 'V34DR3-S6', 'V34DR3-S7', 'V34DR3-S8', 'V34DR3-S9'],
    historyRetainedBytes: [
      368_529, 366_755, 362_777, 349_925, 349_880, 328_476, 327_679, 295_225, 291_523, 266_500, 1_162_942, 1_159_856,
    ],
    ceilingUncappedFormulaBytes: 393_857,
  },
  {
    id: 'v4-1',
    roundKind: 'feature-round',
    feature: 'specs-tree-web-cli-plugin-v4-chat',
    date: '2026-09-19',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy: 'SDDU v4-1 build round (leaf specs-tree-v4-1-zone-shell-density)',
    reason:
      '**显式提升重登记：375,102 → 385,319 B（+10,217 B，+2.72%）**。全部为三区骨架的**必需增重**，' +
      '逐模块可归因（真实 `dist/build-meta.json` metafile 与沙箱归因工具双向核对，Σ 模块增量 +10,075 B + 未归因胶水 142 B == 真实产物差）：' +
      '四个新必需模块 toolbar +3,111 / theme +2,937 / density-scope +1,783 / statusbar +976；' +
      '既有模块接线 sidepanel +1,177 / view-model +398 / risk-rail +1,288 / shell +161 / view-host +1；' +
      '退役面收缩 disclosure −130 / l0/status-bar −1,627（计数徽标与摘要写入迁往 toolbar ⇒ 旧写入器只剩 67 B）。' +
      '对应 FR-CHAT-010~017（三区骨架 / 工具栏准入恰 5 / 状态栏风险 chips / 主题三态）与 FR-CHAT-070~075（密度豁免单源）。' +
      '**断言零删减**：只做同编号等价改写 + 双台账登记；`content.js` 177,076 B、`pick-layer.js` 33,900 B 逐字节不变。' +
      '容差 5% 未动；ceiling = floor(385,319 × 1.05) = **404,584 B**（cap 仍是 record-only 记录字段）。' +
      '`targetBudgetBytes`/`targetMet` 保持 **null**；`PENDING_ABSOLUTE_CAP` 保持 **resolved:false 且未预填**（F 重构收口时才置真）。',
    baselineBeforeBytes: 375_102,
    baselineAfterBytes: 385_319,
    ceilingBeforeBytes: 393_857,
    ceilingAfterBytes: 404_584,
    assertionNonRemovalEntries: ['V41-R2-1', 'V41-R2-2', 'V41-R2-3', 'V41-R2-4', 'V41-R2-5'],
    historyRetainedBytes: [1_068_165, 1_085_389, 1_110_744, 1_132_748, 1_159_856, 1_162_942, 266_500, 291_523, 295_225, 327_679, 328_476, 349_880, 349_925, 362_777, 366_755, 368_529, 375_102],
    ceilingUncappedFormulaBytes: 404_584,
  },
  {
    id: 'v4-2',
    roundKind: 'feature-round',
    feature: 'specs-tree-v4-2-chat-stream-model',
    date: '2026-09-19',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy: 'SDDU v4-2 build round (leaf specs-tree-v4-2-chat-stream-model)',
    reason:
      '**显式提升重登记（review 修复轮后按真实产物订正）：385,319 → 425,094 B（+39,775 B，+10.32%）**。全部为「聊天流 append-only 事件模型 + 12 类卡渲染」的**必需增重**，' +
      '（build 轮登记值原为 425,442 B：Σ 模块 +39,661 + 未归因胶水 462 == +40,123；review 修复轮移除死代码后最终产物 425,094 B：Σ 模块 +39,381 + 未归因胶水 394 == +39,775。两个数字都保留，不得只留其一。）' +
      '逐模块可归因（真实 `dist/build-meta.json` metafile 与 `npm run size:attribution -- --rev cf2af32 --worktree` 双向核对）：' +
      '十二个**新必需模块** stream-model +5,998 / stream-digest +6,253 / stream-render +2,489 / cards/{index 9,586, shared 2,172, ai 456, user 419, system 1,035, tool 2,784, thinking 1,636, error 445, notice 395} = +33,668；' +
      '四个既有模块接线 chat-state +4,891（stream 分支 + 终态事件；12 个既有 action 零删除）/ density-scope +501（V4-2 TASK-613 收紧：形态判据 + 合计上限）/ sidepanel +319（流渲染切换 + 摘要接线 + 测试 seam）/ l1/receipt +2。' +
      '对应 FR-CHAT-020~026 / 030~037（事件模型 / 卡分类学 / 过程族归位 / 固化契约 / 摘要零明文）与 NFR-CHAT-001/003/011/012。' +
      '**断言零删减**：`test/sidepanel-view.test.ts` 的 3 条静态断言按同一语义重锚到 `cards/*`（逐行登记 v4 台账 `leafBases[0].registeredUncoveredLines` 与 `entries`，并新增 stream.mjs 63 条 / node 37 条）；' +
      '`content.js` 177,076 B、`pick-layer.js` 33,900 B 逐字节不变；`KIND_SET` 零 diff。' +
      '容差 5% 未动；ceiling = floor(425,094 × 1.05) = **446,348 B**（cap 仍是 record-only 记录字段）。' +
      '⚠️ **连续两轮告警**：v4-1 + v4-2 = 375,102 → 425,094 B（累计 **+13.33%**），低于 15% 线但仍按「最差相邻对」口径如实报告编排器（见 `SIDEPANEL_BASELINE_META.consecutiveGrowthAlert`）。' +
      '`targetBudgetBytes`/`targetMet` 保持 **null**；`PENDING_ABSOLUTE_CAP` 保持 **resolved:false 且未预填**（F 重构收口时才置真）。',
    baselineBeforeBytes: 385_319,
    baselineAfterBytes: 425_094,
    ceilingBeforeBytes: 404_584,
    ceilingAfterBytes: 446_348,
    assertionNonRemovalEntries: ['V42-E-SVP-1', 'V42-E-SVP-2', 'V42-E-CARDS-1', 'V42-E-STREAM-1'],
    historyRetainedBytes: [1_068_165, 1_085_389, 1_110_744, 1_132_748, 1_159_856, 1_162_942, 266_500, 291_523, 295_225, 327_679, 328_476, 349_880, 349_925, 362_777, 366_500, 366_755, 368_529, 375_102, 385_319, 425_442],
    ceilingUncappedFormulaBytes: 446_348,
  },
  {
    id: 'v4-2-closeout',
    roundKind: 'registry-fidelity-round',
    feature: 'specs-tree-v4-2-chat-stream-model',
    date: '2026-09-19',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy:
      'SDDU v4-2 closeout round (leaf specs-tree-v4-2-chat-stream-model; validate R1 findings F-01 / F-02 / F-03 + N-02; closeout 不降级：phase 仍 validated)',
    reason:
      '**显式提升重登记（收口轮）：425,094 → 426,487 B（+1,393 B，+0.33%）**。全部为 validate R1 三条 finding（非阻塞）的**必需增重**，' +
      '逐模块可归因（真实 `dist/build-meta.json` metafile 与登记值逐条相等，Σ 模块增量 == 真实产物差，未归因胶水 **0**）：' +
      'F-01 `stream-model.ts` 5,998 → **6,908**（+910：`deepFreeze` 深冻结链，`appendEvent` 入口 + `project()` 出口，堵死事件 / CardView / caller 三处数组改写路径）；' +
      'F-02 `chat-state.ts` 9,414 → **9,953**（+539：`stream-merge` 只接纳 `seq > 已知最大值` + `mergeSkipped` 计数，逆序 seq 不再破坏单调性）；' +
      'F-03 `stream-digest.ts` 6,253 → **6,220**（−33：`sanitizeLabel` 顺序反转为「先全串扫描再截断」，删掉 `truncated` 中间变量 —— 该模块是**减重**，不是增重）；' +
      'N-02 `sidepanel.ts` 62,712 → **62,689**（−23：`hasSegment` 接线取代内联 `events.some(...)`，孤儿导出消除）。' +
      '对应 validate R1 的 **F-01 / F-02 / F-03** 与 **N-02**；三条修复各配可 FAIL 反证（回退 → 红 ∧ 还原 → 绿，原文见 build.md §16）。' +
      '**断言零删减**：新增 4 个 node 用例（nodeTestRuntime 920 → **924**），无一条既有断言被删；' +
      '`dist/content.js` 177,076 B 与 `dist/pick-layer.js` 33,900 B **逐字节不变**（sha256 复核）；`KIND_SET` / SW / manifest **零 diff**。' +
      '容差 5% 未动；ceiling = floor(426,487 × 1.05) = **447,811 B**（cap 仍是 record-only 记录字段）。' +
      '⚠️ **相邻两轮告警**：v4-1 + v4-2（含 review 修复轮与收口轮）= 375,102 → 426,487 B（累计 **+13.70%**），低于 15% 线但仍按「最差相邻对」口径如实报告编排器。' +
      '`targetBudgetBytes`/`targetMet` 保持 **null**；`PENDING_ABSOLUTE_CAP` 保持 **resolved:false 且未预填**（F 重构收口时才置真）。',
    baselineBeforeBytes: 425_094,
    baselineAfterBytes: 426_487,
    ceilingBeforeBytes: 446_348,
    ceilingAfterBytes: 447_811,
    assertionNonRemovalEntries: ['V42-E-SVOL-1', 'V42-E-SVOL-2', 'V42-E-DFREEZE-1', 'V42-E-SEQ-1'],
    historyRetainedBytes: [425_442, 425_094],
    ceilingUncappedFormulaBytes: 447_811,
  },
] as const;

/**
 * ── 替代守卫 ③（裁决 V3-VOL-1 ③）：**增长正当性证据** ─────────────────────────
 *
 * `+32,454 B` 不是一句「有意增重」，而是**逐模块可分解**的：用 esbuild metafile 的
 * `bytesInOutput`，在几何完全相同的两棵树里分别构建（v3-1 树 = `cf2af32` 的
 * `packages/web-cli-plugin/src`；v3-2 树 = `615bd0f` 的同路径），得到每个输入模块的
 * 字节贡献与其差值。两棵树的 `absWorkingDir` 深度/相对路径完全一致，因此
 * 「模块注释路径长度」这一构建噪声在两边相同 —— 实测两棵树 `dist/content.js`
 * 同为 177,440 B（等于允许的路径噪声常量），`sidepanel.js` 差值 = **32,454 B**，
 * 与登记基线之差逐字节相等（复现见 `test/size-attribution.mjs` / `npm run size:attribution`）。
 *
 * 结论：增量由 **spec 必需的 L1 模块（26,156 B，80.6%）** 与**接线（5,848 B，18.0%）**
 * 构成，另有 220 B 的**归因位移**（源码未改，仅因新引用者导致 esbuild 分摊变化）与
 * 230 B 的未归因运行时胶水；**没有任何重复/冗余代码**（47 个输入模块路径互不相同，
 * 共享的 v2 模块 `tree-receipt.ts` 增量 = 0 —— 复用而非复制）。
 */
export interface GrowthAttributionRow {
  readonly module: string;
  /** v3-1 树的字节贡献（`null` = v3-1 树不存在该模块）。 */
  readonly beforeBytes: number | null;
  readonly afterBytes: number;
  readonly deltaBytes: number;
  readonly kind: 'new-required-module' | 'wiring' | 'attribution-shift';
  /** 该模块字节由哪条需求/任务要求（新必需模块与接线必填）。 */
  readonly requiredBy: string;
}

export const SIDEPANEL_GROWTH_BREAKDOWN = {
  method:
    'esbuild metafile bytesInOutput；v3-1 树（cf2af32 的 packages/web-cli-plugin/src）vs **当前树**（R3 缺陷修复轮工作树；`afterBytes` 取自真实 ' +
    '`dist/build-meta.json`，`beforeBytes` 取自 v3-1 树）—— 同一 absWorkingDir 几何 + web-cli-base 同源拷贝。该表按**累计**口径（v3-1 树 → 当前树）登记，' +
    '`baselineReferenceBytes` 即它所比较的参照基线。',
  reproduceCommand:
    'npm run size:attribution -- --rev cf2af32 --worktree（`--worktree` 为 v3-3 新增、v3-4 修复了它的 TDZ 崩溃：sentinel 曾在 argv 解析之后声明，命令实际上跑不起来）。' +
    '⚠️ 口径：**核对用的是本包真实 `dist/build-meta.json`**（`test/size-growth-evidence.test.ts` 逐条比对 afterBytes）；' +
    '沙箱归因工具的路径深度与真实构建不同，`// <path>` 注释长度因此有常数差（实测 `src/build-info.ts` 沙箱 212 B vs 真实 237 B），' +
    '所以 afterBytes 一律取真实 metafile，beforeBytes 取沙箱中的 v3-1 树（同一工具、同一几何）。',
  measuredOn: '2026-09-19',
  /** The baseline whose **tree** this breakdown compares against (v3-1 I6). */
  baselineReferenceBytes: 295_225,
  /** 累计：当前基线 − `baselineReferenceBytes`（425,094 − 295,225）。 */
  deltaBytes: 131_262,
  /**
   * **最新一轮**的产物增量 = `SIDEPANEL_BASELINE_BYTES − 385,319`（`size-growth-evidence.test.ts` 直接机核该等式）。
   *
   * 〖I-10（v4-2 review 修复轮）〗本字段原先的 doc-comment 仍写「最近一轮（v4-1 三区骨架自身）375,102 → 385,319，
   * Σ+10,075+142」，与字段现值（v4-2 轮的 40,123）**脱节** —— 现按实测重写：v4-2 轮（含 review 修复轮）
   * 385,319 → **425,094 B**，Σ 模块 **+39,381** + 未归因胶水 **+394** == **+39,775**（build 轮登记的
   * 425,442 B / 40,123 作为历史值逐字保留在 `SIDEPANEL_RE_REGISTRATIONS['v4-2'].reason` 与
   * `v42RoundRows` 的注释里）。v4-1 轮自身的增量（375,102 → 385,319，Σ+10,075 + 142）
   * 逐字保留在 {@link SIDEPANEL_GROWTH_BREAKDOWN.v41RoundRows} 的注释与 `v41RoundUnattributedGlueBytes`。
   */
  closeoutDeltaBytes: 41_168,
  newRequiredModuleBytes: 101_814,
  wiringBytes: 28_123,
  attributionShiftBytes: 265,
  /**
   * 未归因运行时胶水：`deltaBytes − Σ(rows.deltaBytes)`（review 修复轮后实测 **1,060 B** = 累计增量 129,869 的 **0.82%**；
   * build 轮同为 1,060 B / v4-1 为 598 B）。随输入模块数（57 → 69）自然增长，仍远小于任何一层的实现字节。
   *
   * 〖v4-2 review 修复轮〗修复轮的真实产物减重（−348 B）**全部落在 rows 上**（代码删除 −280 + 本轮口径胶水 −68），
   * 但 `view-model.ts` 的 esbuild **分摊位移** −68 B 同时被重算（19,654 → 19,586），因此本字段（= delta − Σrows）
   * 回到与 build 轮相同的 1,060 B；`attributionShiftBytes` 265 与「未解释字节 <1,500 ∧ <2%」判据不变（实测 1,325 / 1.02%）。
   */
  unattributedHelperDeltaBytes: 1_060,
  /** 模块路径互不相同（无重复模块）；共享 v2 模块增量为 0（复用非复制）。 */
  duplicationCheck:
    '输入模块数 **69**（真实 `dist/build-meta.json` 实测；v3-1 为 41 / v3-2 为 47 / v3-3 为 52 / v3-4 为 53 / R1·R2·R3 均为 53 不新增；**v4-1 新增 4 个必需模块** toolbar + theme + density-scope + statusbar ⇒ 53 + 4 = **57**；**v4-2 再新增 12 个必需模块**（stream-* × 3 + cards/* × 9）⇒ 57 + 12 = **69**，见本文件 SIDEPANEL_GROWTH_BREAKDOWN.rows 的 new-required-module 行），路径互不相同；共享模块 src/ui/tree/tree-receipt.ts Δ=0 B 与 ' +
    'src/insight/ownership-tree.ts（首次被侧栏 bundle 引用 → 共享而非复制）—— 审计/命令目录/树视图复用既有投影模块；' +
    'l2/{counts,view-host,command-catalog,audit}.ts 与 settings/sections.ts 与 ui/sidepanel/pick-input.ts 各只有**一份**实现（v3-4 的页面侧代码全部在 ' +
    '独立 artifact `dist/pick-layer.js`，不重复进本 bundle）；R1 不新增模块 —— 六处改动全部落在既有模块（ref-validity / sidepanel / pick-input / ref-store / chat-state / view-model），' +
    '声明状态的**唯一**生产者仍是 SW 的 `declarationEnv()`（面板只透传，无第二套状态机）；' +
    'R2 只改既有 4 个模块（view-model / sidepanel / risk-rail / shell），退避调度器在 `src/discovery/auto-probe.ts`（**service-worker bundle**，不进本产物）—— 没有任何被复制的第二份实现；' +
    'R3 只改既有 5 个模块（pick-input / sidepanel / ref-validity / panels / ref-store；R3 段输入模块数仍 53 —— 不新增模块），只读探测在 `src/background/ref-rescue.ts`（**service-worker bundle**，不进本产物）—— 同样没有任何被复制的第二份实现。' +
    '〖review 修复轮 I8〗本字段原记「输入模块数 53 … R2 仍是 53」而真实 metafile 的 inputs 已随 v4-1 变为 **57**；已按实测订正，并由 `test/size-growth-evidence.test.ts` 增加「`Object.keys(inputs).length` == 登记输入模块数」的联动断言（登记值与真实 metafile 不得脱钩）。',
  /**
   * 真实 `dist/build-meta.json` 的 `inputs` 条目数（**机核值**，review 修复轮 I8）。
   * `duplicationCheck` 的散文里写「输入模块数 57」；这个字段让数字可被 metafile 直接核对
   * （`size-growth-evidence.test.ts`：`Object.keys(inputs).length === duplicationCheckInputModuleCount`）。
   */
  duplicationCheckInputModuleCount: 69,
  /**
   * **收口后缺陷修复轮 R2 自身的逐模块增量**（R1 工作树 → R2 工作树）：366,755 → 368,529 B（+1,774 B），
   * 与 `SIDEPANEL_RE_REGISTRATIONS['v3-4-r2']` 的 `baselineAfterBytes − baselineBeforeBytes` **逐字节相等**
   * （四行 Δ 之和 == 1,774，无未归因胶水；退避调度器在 service-worker bundle，不进本产物）。
   * v3-4 功能轮自身的增量（pick-input null→5,085 / sidepanel 53,390→58,174 / panels 13,280→15,110 /
   * shell 3,275→3,969 / view-model 17,666→18,088）保留在该轮 `SIDEPANEL_RE_REGISTRATIONS['v3-4'].reason`。
   *
   * 〖N-05（收口轮，v4-1 validate R1）—— 两处登记失真已订正〗
   *  ① **注释张冠李戴**：本字段自 `a0b93c9`（R2 轮）起装的是 **R2 轮**的行，注释却一直写
   *     「最近一轮（**R1** 缺陷修复轮）… Σ = +3,623 B」（R1 轮的真实登记增量是 **+3,978 B**，
   *     见 `SIDEPANEL_RE_REGISTRATIONS['v3-4-r1']`；+3,623 是 R1 受控归因实验的**模块和**，
   *     两者本就不等 —— 该 Σ 值自 `0b60951`（R1）起即与 R1 登记增量不符，行内容则自 `a0b93c9`
   *     起与「R1」标签不符）。现按实际内容改正为 R2 轮。
   *  ② **`5cf1ba8`（v4-1 R2 收尾轮）机械改写污染**：该提交把 4 行的 `afterBytes`/`deltaBytes`
   *     替换成**累计口径**（`rows` 表的当前值），使 4 行**全部** `deltaBytes ≠ afterBytes − beforeBytes`
   *     （实测 5 处不自洽：本组 4 处 + `r3RoundRows` 的 sidepanel 行）。本轮按本叶 `leafBase` `187c205`
   *     的既有值**逐字复原**（历史值优先，不改写历史），并由 `size-growth-evidence.test.ts`
   *     新增「每行 Δ 自洽 ∧ Σ == 该轮登记总增量」断言永久机核（含反证）。
   */
  closeoutRoundRows: [
    { module: 'src/ui/sidepanel/view-model.ts', beforeBytes: 18_250, afterBytes: 19_256, deltaBytes: 1_006 },
    { module: 'src/ui/sidepanel/sidepanel.ts', beforeBytes: 59_028, afterBytes: 59_416, deltaBytes: 388 },
    { module: 'src/ui/sidepanel/l0/risk-rail.ts', beforeBytes: 6_058, afterBytes: 6_410, deltaBytes: 352 },
    { module: 'src/ui/sidepanel/l0/shell.ts', beforeBytes: 3_969, afterBytes: 3_997, deltaBytes: 28 },
  ] as readonly { module: string; beforeBytes: number | null; afterBytes: number; deltaBytes: number }[],
  /**
   * R3 缺陷修复轮自身的逐模块增量（R2 工作树 → R3 工作树），真实 metafile 差（Σ == +6,573 B ==
   * `SIDEPANEL_RE_REGISTRATIONS['v3-4-r3']` 的 `baselineAfterBytes − baselineBeforeBytes`）：
   * ref-validity +1,057 / ref-store +222 / panels +1,044 / pick-input +2,450 / sidepanel +1,800；
   * `src/background/ref-rescue.ts` 落在 service-worker bundle，不计入本产物。
   *
   * 〖N-05（收口轮）〗sidepanel 行原为 `59_416 → 61_216 / Δ 1_800`（R3 正确值），`5cf1ba8` 把它
   * 改写成累计口径的 `62_393 / 17_548`（既不等于 after−before，也让 Σ 脱离 6,573）—— 本轮按
   * `187c205` / `3bff311` 的既有值复原（`v41RoundRows` 的 sidepanel `beforeBytes = 61_216`
   * 与复原值**互相吻合**：R3 末值 == v4-1 初值）。
   */
  r3RoundRows: [
    { module: 'src/ui/sidepanel/pick-input.ts', beforeBytes: 5_809, afterBytes: 8_259, deltaBytes: 2_450 },
    { module: 'src/ui/sidepanel/sidepanel.ts', beforeBytes: 59_416, afterBytes: 61_216, deltaBytes: 1_800 },
    { module: 'src/ui/sidepanel/l1/ref-validity.ts', beforeBytes: 7_840, afterBytes: 8_897, deltaBytes: 1_057 },
    { module: 'src/ui/sidepanel/l1/panels.ts', beforeBytes: 15_110, afterBytes: 16_154, deltaBytes: 1_044 },
    { module: 'src/ui/sidepanel/l1/ref-store.ts', beforeBytes: 3_979, afterBytes: 4_201, deltaBytes: 222 },
  ] as readonly { module: string; beforeBytes: number | null; afterBytes: number; deltaBytes: number }[],
  /**
   * **v4-1 三区骨架轮自身的逐模块增量**（R3 工作树 375,102 B → v4-1 工作树 385,319 B），
   * 与真实 metafile 同几何实测：
   *
   *   · 四个**新必需模块**（beforeBytes=null）：toolbar +3,111 / theme +2,937 /
   *     density-scope +1,783 / statusbar +976 = **+8,807**；
   *   · 既有模块接线：sidepanel +1,177 / view-model +398 / risk-rail +1,288 / shell +161 /
   *     l2/view-host +1 = +3,025；
   *   · 退役面收缩：disclosure −130 / l0/status-bar −1,627 = **−1,757**；
   *   · Σ 模块增量 = **+10,075**，加未归因胶水 **+142** == {@link SIDEPANEL_GROWTH_BREAKDOWN.closeoutDeltaBytes} **+10,217**
   *     （== 385,319 − 375,102）。
   *
   * **review 修复轮 I9**：这一组数字此前只出现在 `SIDEPANEL_BASELINE_META.reason` 的
   * 叙述里、**没有任何门禁断言**（`size-growth-evidence.test.ts` 当时只核 `rows` 累计口径的
   * `afterBytes`）。现在登记为 `v41RoundRows` + `v41RoundUnattributedGlueBytes`，并由该
   * 测试逐条机核：Σ(deltaBytes) + glue == `closeoutDeltaBytes`，且每行 `afterBytes` 必须等于
   * 真实 `dist/build-meta.json` 的 `bytesInOutput`。
   */
  v41RoundRows: [
    { module: 'src/ui/sidepanel/toolbar.ts', beforeBytes: null, afterBytes: 3_111, deltaBytes: 3_111 },
    { module: 'src/ui/sidepanel/theme.ts', beforeBytes: null, afterBytes: 2_937, deltaBytes: 2_937 },
    { module: 'src/ui/sidepanel/density-scope.ts', beforeBytes: null, afterBytes: 1_783, deltaBytes: 1_783 },
    { module: 'src/ui/sidepanel/statusbar.ts', beforeBytes: null, afterBytes: 976, deltaBytes: 976 },
    { module: 'src/ui/sidepanel/sidepanel.ts', beforeBytes: 61_216, afterBytes: 62_393, deltaBytes: 1_177 },
    { module: 'src/ui/sidepanel/view-model.ts', beforeBytes: 19_256, afterBytes: 19_654, deltaBytes: 398 },
    { module: 'src/ui/sidepanel/l0/risk-rail.ts', beforeBytes: 6_410, afterBytes: 7_698, deltaBytes: 1_288 },
    { module: 'src/ui/sidepanel/l0/shell.ts', beforeBytes: 3_997, afterBytes: 4_158, deltaBytes: 161 },
    { module: 'src/ui/sidepanel/l2/view-host.ts', beforeBytes: 3_206, afterBytes: 3_207, deltaBytes: 1 },
    { module: 'src/ui/sidepanel/disclosure.ts', beforeBytes: 5_318, afterBytes: 5_188, deltaBytes: -130 },
    { module: 'src/ui/sidepanel/l0/status-bar.ts', beforeBytes: 1_694, afterBytes: 67, deltaBytes: -1_627 },
  ] as readonly { module: string; beforeBytes: number | null; afterBytes: number; deltaBytes: number }[],
  /** v4-1 轮的未归因运行时胶水（Σ 模块增量之外的余量）；断言见 size-growth-evidence.test.ts。 */
  v41RoundUnattributedGlueBytes: 142,
  /**
   * **v4-2 轮的逐模块增量**（v4-1 树 385,319 B → 当前树 425,094 B，真实 metafile 同几何）。
   *
   *   · 四个既有接线模块：`chat-state` 4,523 → 9,304（+4,781）/ `density-scope` 1,783 → 2,284
   *     （+501）/ `sidepanel` 62,393 → 62,726（+333）/ `l1/receipt` 2,833 → 2,835（+2）= **+5,617**；
   *   · 十二个**新必需模块**（beforeBytes=null）：stream-model +5,998 / stream-digest +6,253 /
   *     stream-render +2,495 / cards/index +9,679 / cards/shared +2,172 / cards/ai +733 /
   *     cards/user +419 / cards/system +1,035 / cards/tool +2,784 / cards/thinking +1,636 /
   *     cards/error +445 / cards/notice +395 = **+34,044**；
   *   · build 轮 Σ 模块 **+39,661** + 未归因胶水 **+462** == **+40,123**（== 425,442 − 385,319，历史值）；
   *     review 修复轮后 Σ 模块 **+39,381** + 未归因胶水 **+394** == **+39,775**（== 425,094 − 385,319，当前值）。
   */
  v42RoundRows: [
    { module: 'src/ui/sidepanel/stream-model.ts', beforeBytes: null, afterBytes: 5_998, deltaBytes: 5_998 },
    { module: 'src/ui/sidepanel/stream-digest.ts', beforeBytes: null, afterBytes: 6_253, deltaBytes: 6_253 },
    { module: 'src/ui/sidepanel/stream-render.ts', beforeBytes: null, afterBytes: 2_489, deltaBytes: 2_489 },
    { module: 'src/ui/sidepanel/cards/index.ts', beforeBytes: null, afterBytes: 9_586, deltaBytes: 9_586 },
    { module: 'src/ui/sidepanel/cards/shared.ts', beforeBytes: null, afterBytes: 2_172, deltaBytes: 2_172 },
    { module: 'src/ui/sidepanel/cards/ai.ts', beforeBytes: null, afterBytes: 456, deltaBytes: 456 },
    { module: 'src/ui/sidepanel/cards/user.ts', beforeBytes: null, afterBytes: 419, deltaBytes: 419 },
    { module: 'src/ui/sidepanel/cards/system.ts', beforeBytes: null, afterBytes: 1_035, deltaBytes: 1_035 },
    { module: 'src/ui/sidepanel/cards/tool.ts', beforeBytes: null, afterBytes: 2_784, deltaBytes: 2_784 },
    { module: 'src/ui/sidepanel/cards/thinking.ts', beforeBytes: null, afterBytes: 1_636, deltaBytes: 1_636 },
    { module: 'src/ui/sidepanel/cards/error.ts', beforeBytes: null, afterBytes: 445, deltaBytes: 445 },
    { module: 'src/ui/sidepanel/cards/notice.ts', beforeBytes: null, afterBytes: 395, deltaBytes: 395 },
    { module: 'src/ui/sidepanel/sidepanel.ts', beforeBytes: 62_393, afterBytes: 62_712, deltaBytes: 319 },
    { module: 'src/ui/sidepanel/chat-state.ts', beforeBytes: 4_523, afterBytes: 9_414, deltaBytes: 4_891 },
    { module: 'src/ui/sidepanel/density-scope.ts', beforeBytes: 1_783, afterBytes: 2_284, deltaBytes: 501 },
    { module: 'src/ui/sidepanel/l1/receipt.ts', beforeBytes: 2_833, afterBytes: 2_835, deltaBytes: 2 },
  ] as readonly { module: string; beforeBytes: number | null; afterBytes: number; deltaBytes: number }[],
  /** v4-2 轮的未归因运行时胶水（v4-1 树 → 当前树；review 修复轮后 Σ 模块 +39,381 → 轮增量 39,775）。 */
  v42RoundUnattributedGlueBytes: 394,
  /**
   * **v4-2 收口轮自身的逐模块增量**（v4-2 review 修复轮树 425,094 B → 收口轮树 426,487 B，真实 metafile 同几何）：
   *
   *   · F-01 `stream-model` 5,998 → 6,908（+910：`deepFreeze` 深冻结链）；
   *   · F-02 `chat-state` 9,414 → 9,953（+539：`stream-merge` 严格单调 + `mergeSkipped`）；
   *   · F-03 `stream-digest` 6,253 → 6,220（**−33**：删除 `truncated` 中间变量，扫描先行）；
   *   · N-02 `sidepanel` 62,712 → 62,689（**−23**：`hasSegment` 接线）；
   *   · Σ(Δ) = **+1,393**，未归因胶水 **0** == 426,487 − 425,094（== `SIDEPANEL_RE_REGISTRATIONS['v4-2-closeout']` 的登记增量）。
   *
   * 该组是本叶**最新一轮**的 rows（`size-growth-evidence.test.ts` 用它逐条核真实 metafile 的
   * `bytesInOutput`）；`v42RoundRows` 保留 build + review 修复轮的历史归因（其 afterBytes 已不再
   * 等于当前产物 —— 与 `v41RoundRows` 同理，历史值优先）。
   */
  v42CloseoutRows: [
    { module: 'src/ui/sidepanel/stream-model.ts', beforeBytes: 5_998, afterBytes: 6_908, deltaBytes: 910 },
    { module: 'src/ui/sidepanel/stream-digest.ts', beforeBytes: 6_253, afterBytes: 6_220, deltaBytes: -33 },
    { module: 'src/ui/sidepanel/chat-state.ts', beforeBytes: 9_414, afterBytes: 9_953, deltaBytes: 539 },
    { module: 'src/ui/sidepanel/sidepanel.ts', beforeBytes: 62_712, afterBytes: 62_689, deltaBytes: -23 },
  ] as readonly { module: string; beforeBytes: number | null; afterBytes: number; deltaBytes: number }[],
  /** v4-2 收口轮的未归因运行时胶水：Σ 模块增量 == 真实产物差 ⇒ **0**。 */
  v42CloseoutUnattributedGlueBytes: 0,
  /**
   * 〖N-05（收口轮）〗逐轮 rows 组 ↔ `SIDEPANEL_RE_REGISTRATIONS` 条目的**机核映射**：
   * 每组 rows 的 Σ(deltaBytes) + 该组未归因胶水 必须等于该轮登记的
   * `baselineAfterBytes − baselineBeforeBytes`（登记值不得与逐模块归因脱钩）。
   * 由 `size-growth-evidence.test.ts` 的「全部 round rows 必须自洽」断言逐组实跑。
   */
  roundRowRegistrationIds: {
    closeoutRoundRows: 'v3-4-r2',
    r3RoundRows: 'v3-4-r3',
    v41RoundRows: 'v4-1',
    v42RoundRows: 'v4-2',
    v42CloseoutRows: 'v4-2-closeout',
  } as Readonly<Record<string, string>>,
  rows: [
    { module: 'src/ui/sidepanel/l1/panels.ts', beforeBytes: null, afterBytes: 16154, deltaBytes: 16154, kind: 'new-required-module', requiredBy: 'FR-V3-031/032/037/038/039（八类就地展开、后果两段、阻断呈现、两条恢复、回执三件套）+ FR-V3-070（手势表由单一清单渲染）+ R3（条件式「一键重锚」按钮 + `canReanchor()` 纯判据 + 报告）' },
    { module: 'src/ui/sidepanel/l2/command-catalog.ts', beforeBytes: null, afterBytes: 6106, deltaBytes: 6106, kind: 'new-required-module', requiredBy: 'FR-V3-049/053（命令目录逐条有档 + delay 单源措辞 + 硬底线零控件 + 分列）' },
    { module: 'src/ui/sidepanel/l1/ref-validity.ts', beforeBytes: null, afterBytes: 8897, deltaBytes: 8897, kind: 'new-required-module', requiredBy: 'FR-V3-036（五维 + 不确定即失效 fail-closed）+ N-07（D4 原因指项）+ R1（D4 状态一致性口径：捕获时状态 vs 当刻状态）+ R3（救援 payload 元数据 + `dom-gone` 可读救援原因；结论枚举不扩）' },
    { module: 'src/ui/sidepanel/pick-input.ts', beforeBytes: null, afterBytes: 8259, deltaBytes: 8259, kind: 'new-required-module', requiredBy: 'FR-V3-060/063/067/068（双触发按需注入 + 拖放落点 + 失败降级）+ AC-CONV-1（生产 env 组装）+ R1（摄取时补全捕获事实 withDeclaration()）+ R3（只读 rescue 往返 + `reanchor()`：唯一候选经同一摄取管线生成新引用）' },
    { module: 'src/ui/sidepanel/l2/audit.ts', beforeBytes: null, afterBytes: 4145, deltaBytes: 4145, kind: 'new-required-module', requiredBy: 'FR-V3-050 / NFR-V3-016（审计零明文字段白名单 + URL 去参）' },
    { module: 'src/ui/sidepanel/l1/ref-store.ts', beforeBytes: null, afterBytes: 4201, deltaBytes: 4201, kind: 'new-required-module', requiredBy: 'FR-V3-071/037（引用 id 单源 + 受保护派发 + 阻断）+ N-08（退役原因冻结）+ R1（declaration 事实透传）+ R3（救援 payload 透传到记录，供 L1 / 门禁读取）' },
    { module: 'src/ui/sidepanel/l2/view-host.ts', beforeBytes: null, afterBytes: 3207, deltaBytes: 3207, kind: 'new-required-module', requiredBy: 'FR-V3-047/048/054（视图替换 + ← 返回 + 展开态复原 + 单滚动容器） + v4-1（绑定 `#log`→`#stream`；返回回焦目标 `#l0-statusbar`→`#l2-entry-tree`）—— FR-CHAT-015' },
    { module: 'src/ui/sidepanel/l2/counts.ts', beforeBytes: null, afterBytes: 2932, deltaBytes: 2932, kind: 'new-required-module', requiredBy: 'FR-V3-046 / EC-V3-016（四类计数真值派生 + {live,baseline} 分列）' },
    { module: 'src/ui/sidepanel/l1/receipt.ts', beforeBytes: null, afterBytes: 2835, deltaBytes: 2835, kind: 'new-required-module', requiredBy: 'FR-V3-039 + NFR-V3-008/016（回执三件套 + 零明文）' },
    { module: 'src/ui/sidepanel/l1/local-tree.ts', beforeBytes: null, afterBytes: 658, deltaBytes: 658, kind: 'new-required-module', requiredBy: 'FR-V3-034（局部树 ≤3 节点）' },
    { module: 'src/insight/ownership-tree.ts', beforeBytes: null, afterBytes: 341, deltaBytes: 341, kind: 'new-required-module', requiredBy: 'FR-V3-034（复用 v2 主归属链，首次被侧栏 bundle 引用 → 共享而非复制）' },
    { module: 'src/ui/settings/sections.ts', beforeBytes: null, afterBytes: 226, deltaBytes: 226, kind: 'new-required-module', requiredBy: 'FR-V3-051 / FR-V3-046（设置分区登记表 —— 让设置入口的计数可派生而非豁免）' },
    { module: 'src/ui/sidepanel/toolbar.ts', beforeBytes: null, afterBytes: 3111, deltaBytes: 3111, kind: 'new-required-module', requiredBy: 'FR-CHAT-011/015/016（工具栏：只读站点摘要 + 4 视图入口带计数徽标 + 主题切换；可点准入恰 5 且超限抛错）+ NFR-CHAT-004/008 + ADR-V4-018/022' },
    { module: 'src/ui/sidepanel/theme.ts', beforeBytes: null, afterBytes: 2937, deltaBytes: 2937, kind: 'new-required-module', requiredBy: 'FR-CHAT-016（主题三态 auto→light→dark，复用已有 storage 权限，读写失败降级 auto 且不阻断界面）+ NFR-CHAT-008' },
    { module: 'src/ui/sidepanel/density-scope.ts', beforeBytes: null, afterBytes: 2284, deltaBytes: 2284, kind: 'new-required-module', requiredBy: 'FR-CHAT-070/071/072/075（豁免子树**单源** `DENSITY_EXCLUDED_SUBTREES=[\'#stream\']` + 三区外壳常量 + 四个防滥用常量 + `assertChromeNotInStream()`）+ ADR-V4-020' },
    { module: 'src/ui/sidepanel/statusbar.ts', beforeBytes: null, afterBytes: 976, deltaBytes: 976, kind: 'new-required-module', requiredBy: 'FR-CHAT-004/013/017（状态栏：连接状态一行 + 风险 chips 外层容器 + `#risk-detail`；J1/J2 不变量与 `riskActiveOf()` 纯函数）+ AC-CHAT-007' },
    { module: 'src/ui/sidepanel/sidepanel.ts', beforeBytes: 44_845, afterBytes: 62689, deltaBytes: 17844, kind: 'wiring', requiredBy: 'FR-V3-031~040（L1 挂载 + 单一派发器）+ FR-V3-045/047/048/054（L2 视图替换接线）+ FR-V3-060/061/062/066（面板侧拾取接线 + 生产 env 注入点 + 双向联动）+ AC-CONV-2（唯一动作入口）+ R1（declarationStatus 映射 + 身份标记回程重判 + supersededAsk 结算）+ R2（稳态行接线；面板可见性信号按 binding 门禁证据回退，恢复能力由既有 kick 触发器承担）+ R3（`maybeRescue()` 只读探测触发 + `reanchorRef()` 重锚接线 + 测试 seam） + v4-1（三区挂载接线 + `#log`→`#stream` 全部选择器迁移 + `mountTheme()` + `assertChromeNotInStream()` 测试 seam + 设置视图退出时 `syncEntryAria()`）—— FR-CHAT-010/014/015/016 · ADR-V4-017/022' },
    { module: 'src/ui/sidepanel/view-model.ts', beforeBytes: 17_123, afterBytes: 19_586, deltaBytes: 2_463, kind: 'wiring', requiredBy: 'FR-V3-031（L1 契约纯函数）+ FR-V3-046/015（L2 计数载体）+ FR-V3-068/070（拾取不可用态 + 手势清单单源）+ R1（declarationStatus 载体 + 风险位文案一行）+ R2（`probingSteadyView`/`probingSteadyText` 稳态文案 + 退避描述 `AUTO_RETRY_LINE` + `probeSteady` 契约） + v4-1（纯新增 `L0View.riskChips`，状态栏渲染输入：无 DOM、无时钟）—— FR-CHAT-004/013' },
    { module: 'src/ui/sidepanel/chat-state.ts', beforeBytes: 4_303, afterBytes: 9953, deltaBytes: 5650, kind: 'wiring', requiredBy: 'FR-V3-037/FR-V3-038 + AC-CONV-2（引用回合不得把后台提问的回合卡在「处理中」）+ R1（`REF_ROUND_PREFIX` + `supersededAsk()` 纯判据）' },
    { module: 'src/ui/sidepanel/disclosure.ts', beforeBytes: 4_547, afterBytes: 5188, deltaBytes: 641, kind: 'wiring', requiredBy: 'FR-V3-031（白名单 4 → 9 个目标 + 5 条 wiring）；v3-4 复核：数值未变（本叶不改折叠白名单） + v4-1（`COLLAPSIBLE_TARGETS` 9→7：移除退役的 topbar/l2-entries；`NEVER_FOLDABLE` 扩展为三区骨架）—— FR-CHAT-014 · ADR-V4-019' },
    { module: 'src/ui/sidepanel/l0/shell.ts', beforeBytes: 3_351, afterBytes: 4158, deltaBytes: 807, kind: 'wiring', requiredBy: 'FR-V3-047（入口路由交还 view-host）+ FR-V3-068（风险区「页面侧不可用（原因）」行，风险位唯一写入者不变）+ R2（稳态 override 透传，风险位唯一写入者不变） + v4-1（三区外壳：`#l0-status-band` → 只读 `.site-summary`；接线 toolbar/statusbar zone；`syncEntryAria()` 透传）—— FR-CHAT-014/015/016' },
    { module: 'src/ui/sidepanel/l0/risk-rail.ts', beforeBytes: 5_665, afterBytes: 7698, deltaBytes: 2033, kind: 'wiring', requiredBy: 'FR-V3-037（失效行可读原因；风险位唯一写入者不变）+ R2（稳态「低频自动复查中」override：同类、三通道、参与重绘签名） + v4-1（行 → chip 形态：`button.risk-row` + `data-chrome-control` + `aria-controls="risk-detail"`；零风险 ⇒ 0 可点 chip；探针/归属判据零逻辑改动）—— FR-CHAT-013/017 · ADR-V4-019' },
    { module: 'src/ui/sidepanel/l0/status-bar.ts', beforeBytes: 1_382, afterBytes: 67, deltaBytes: -1315, kind: 'wiring', requiredBy: 'FR-V3-015 / FR-V3-046（入口标签 + 面板摘要写入 + 逐目标 aria 对）+ I-01（逐目标 `aria-controls`：设置入口指向 `#settings-view`） + v4-1（位置迁移为 L2 入口写入器并委托 `toolbar.ts`；模块体从 1,694 B 收缩到 67 B —— 计数徽标改由工具栏渲染，`L2_ENTRY_FIELDS`/`syncTriggerAria` 语义保持）—— FR-CHAT-011/015' },
    { module: 'src/ui/tree/tree-drawer.ts', beforeBytes: 39_779, afterBytes: 39893, deltaBytes: 114, kind: 'attribution-shift', requiredBy: '源码未改；esbuild 分摊位移（归属迁移只改 index.html 的容器与 CSS）' },
    { module: 'src/ui/settings/panel.ts', beforeBytes: 37_040, afterBytes: 37111, deltaBytes: 71, kind: 'attribution-shift', requiredBy: '源码未改；esbuild 分摊位移' },
    { module: 'src/ui/sidepanel/markdown.ts', beforeBytes: 13_417, afterBytes: 13454, deltaBytes: 37, kind: 'attribution-shift', requiredBy: '源码未改；esbuild 分摊位移' },
    { module: 'src/ui/tree/tree-view.ts', beforeBytes: 21_240, afterBytes: 21267, deltaBytes: 27, kind: 'attribution-shift', requiredBy: '源码未改；esbuild 分摊位移（v3-4 复核：位移值未变）' },
    { module: 'src/build-info.ts', beforeBytes: 232, afterBytes: 237, deltaBytes: 5, kind: 'attribution-shift', requiredBy: '源码未改；esbuild 分摊位移（含构建戳字面量长度）' },
    { module: 'src/insight/archive-catalog.ts', beforeBytes: 13_175, afterBytes: 13179, deltaBytes: 4, kind: 'attribution-shift', requiredBy: '源码未改；esbuild 分摊位移（被 L2 命令目录只读复用）' },
    { module: 'src/ui/sidepanel/scroll-policy.ts', beforeBytes: 826, afterBytes: 830, deltaBytes: 4, kind: 'attribution-shift', requiredBy: '源码未改；esbuild 分摊位移' },
    { module: 'src/ui/settings/view.ts', beforeBytes: 13_222, afterBytes: 13225, deltaBytes: 3, kind: 'attribution-shift', requiredBy: '源码未改；esbuild 分摊位移' },
    { module: 'src/ui/sidepanel/stream-model.ts', beforeBytes: null, afterBytes: 6_908, deltaBytes: 6_908, kind: 'new-required-module', requiredBy: 'FR-CHAT-020/021/025（`StreamEvent{seq,ts,kind,cardId,sessionId,payload,terminal?}` 不可变 + `appendEvent`/`boundStreamEvents`/`project()` 纯投影 + 终态冻结不变式）+ NFR-CHAT-001 · ADR-V4-024/028' },
    { module: 'src/ui/sidepanel/stream-digest.ts', beforeBytes: null, afterBytes: 6_220, deltaBytes: 6_220, kind: 'new-required-module', requiredBy: 'FR-CHAT-024/025 + NFR-CHAT-012（零明文摘要白名单 + LRU 20 + 降级重建；面板侧 `chrome.storage.local`，零新权限零 SW 改动）· ADR-V4-028' },
    { module: 'src/ui/sidepanel/stream-render.ts', beforeBytes: null, afterBytes: 2_489, deltaBytes: 2_489, kind: 'new-required-module', requiredBy: 'FR-CHAT-022/023/037 + NFR-CHAT-003/011（keyed 增量渲染 append/patch/remove(bound) + 终态 DOM 冻结 + 滚动锚定 + 320px）· ADR-V4-025' },
    { module: 'src/ui/sidepanel/cards/index.ts', beforeBytes: null, afterBytes: 9_586, deltaBytes: 9_586, kind: 'new-required-module', requiredBy: 'FR-CHAT-021/022/036 + FR-CHAT-030~035/037（`CARD_TYPES` 12 项单源 + 卡工厂注册表 + 固化契约 + ask/auth/ref/nextstep 骨架）· ADR-V4-026/027' },
    { module: 'src/ui/sidepanel/cards/shared.ts', beforeBytes: null, afterBytes: 2_172, deltaBytes: 2_172, kind: 'new-required-module', requiredBy: 'FR-CHAT-022（卡 DOM 契约唯一语言：`card-head`/`card-col`/`.ts`/`.card-fixed` + 折叠阈值 480/10 单源）· ADR-V4-026/027' },
    { module: 'src/ui/sidepanel/cards/ai.ts', beforeBytes: null, afterBytes: 456, deltaBytes: 456, kind: 'new-required-module', requiredBy: 'FR-CHAT-031（AI 卡富文本走既有安全 `markdown.ts`）+ AC-CHAT-002' },
    { module: 'src/ui/sidepanel/cards/user.ts', beforeBytes: null, afterBytes: 419, deltaBytes: 419, kind: 'new-required-module', requiredBy: 'FR-CHAT-031（用户卡对侧气泡 = 对侧 `msg-user` 样式载体）' },
    { module: 'src/ui/sidepanel/cards/system.ts', beforeBytes: null, afterBytes: 1_035, deltaBytes: 1_035, kind: 'new-required-module', requiredBy: 'FR-CHAT-032/035（系统事件行单行 + `HH:MM:SS` 只追加；命令行 `.cmd` 紧凑样式）' },
    { module: 'src/ui/sidepanel/cards/tool.ts', beforeBytes: null, afterBytes: 2_784, deltaBytes: 2_784, kind: 'new-required-module', requiredBy: 'FR-CHAT-035 + FR-050/EC-023（工具卡字段逐项保留：工具名/✓✖/ms/预览/折叠记忆；失败卡 `.entry-error`）· ADR-V4-027' },
    { module: 'src/ui/sidepanel/cards/thinking.ts', beforeBytes: null, afterBytes: 1_636, deltaBytes: 1_636, kind: 'new-required-module', requiredBy: 'FR-CHAT-035 + NG-CHAT-006（思考两事件一卡 → 终态「已思考 N.Ns」；无 append 后 remove）· ADR-V4-027' },
    { module: 'src/ui/sidepanel/cards/error.ts', beforeBytes: null, afterBytes: 445, deltaBytes: 445, kind: 'new-required-module', requiredBy: 'FR-CHAT-035 + FR-050（错误条目为醒目 `.entry-error` system 气泡，可见条目）' },
    { module: 'src/ui/sidepanel/cards/notice.ts', beforeBytes: null, afterBytes: 395, deltaBytes: 395, kind: 'new-required-module', requiredBy: 'FR-CHAT-035 + ADR-V4-027 第 6 条（工具通知 `.msg-notice`，与系统事件行分离）' },
    { module: 'src/ui/tree/tree-receipt.ts', beforeBytes: 2_719, afterBytes: 2719, deltaBytes: 0, kind: 'attribution-shift', requiredBy: '源码未改且字节未变（Δ=0）—— 回执三件套/审计出口复用 v2 模块，未被复制出第二份实现' },
  ] as readonly GrowthAttributionRow[],
} as const;

/**
 * ── 替代守卫 ④（裁决 V3-VOL-1 ④）：**方向性守卫（防无声膨胀）** ─────────────────
 *
 * 同一 Feature 内**连续两轮**功能轮重登记，累计增幅 > `threshold`（默认 15%）时
 * **必须显式回报编排器**。实现为可读告警（`warning !== null`，附 feature / 轮次 /
 * 百分比 / 必须动作），并由门禁断言「当前状态必须触发它」+「阈值以下不触发它」
 * （可 FAIL、非恒真）。它不是静默日志：`test/size-budget.test.ts` 会把文本打到门禁
 * 输出，且 `SIDEPANEL_BASELINE_META.consecutiveGrowthAlert` 必须与之同源。
 */
export interface ConsecutiveGrowthVerdict {
  readonly feature: string;
  readonly rounds: readonly string[];
  readonly fromBytes: number;
  readonly toBytes: number;
  readonly cumulativePct: number;
  readonly threshold: number;
  /** 非 `null` 即为**必须显式回报编排器**的可读告警。 */
  readonly warning: string | null;
}

export function evaluateConsecutiveReRegistrationGrowth(
  entries: readonly SizeReRegistration[] = SIDEPANEL_RE_REGISTRATIONS,
  feature = 'specs-tree-web-cli-plugin-v3-ui',
  threshold = 0.15,
): ConsecutiveGrowthVerdict {
  const rounds = entries.filter((e) => e.feature === feature && e.roundKind === 'feature-round');
  if (rounds.length < 2) {
    return {
      feature,
      rounds: rounds.map((r) => r.id),
      fromBytes: rounds[0]?.baselineBeforeBytes ?? 0,
      toBytes: rounds[rounds.length - 1]?.baselineAfterBytes ?? 0,
      cumulativePct: 0,
      threshold,
      warning: null,
    };
  }
  // V3-4（**守卫只增不减**）：守卫改报「**最差**的连续两功能轮」，而不是「最后两轮」。
  // 原因如实登记：v3-1/v3-2/v3-3/v3-4 四轮里，最后两轮（v3-3 + v3-4，+10.44%）落在 15%
  // 线**以下**，若仍按「最后两轮」计，告警会**消失** —— 那是把守卫**放松**（历史上一旦
  // 发生过 >15% 的连续两轮，就再也没有机会被机器提醒）。改报最大值后：① 告警仍必然存在
  // （v3-1 + v3-2 = +22.96%），② 任何**新的** >15% 连续两轮同样会被抓出来，判定函数因此
  // **更强**而不是更弱；阈值、告警文案与「必须显式回报编排器」的要求零改动。
  // **收口轮订正（validate R1 **F2**，2026-09-17）**：本注释原登记 `+10.25%` / `+22.95%`
  // （估读），与实测算术不符 —— `(362777−328476)/328476 = +10.44%`、
  // `(327679−266500)/266500 = +22.956% → +22.96%`（与同文件 `:324/:325` 及
  // `docs/v3-density-baseline.json#volume.directionalAlert` 逐字一致）。数值按实测订正；
  // **历史值逐字保留**：订正前的两个数分别是 `+10.25%`（v3-3+v3-4）与 `+22.95%`（v3-1+v3-2）。
  let worst = { from: rounds[0].baselineBeforeBytes, to: rounds[0].baselineAfterBytes, pct: 0, i: 0 };
  for (let i = 1; i < rounds.length; i += 1) {
    const from = rounds[i - 1].baselineBeforeBytes;
    const to = rounds[i].baselineAfterBytes;
    const pct = (to - from) / from;
    if (pct > worst.pct) worst = { from, to, pct, i };
  }
  const previous = rounds[worst.i - 1];
  const last = rounds[worst.i];
  const fromBytes = worst.from;
  const toBytes = worst.to;
  const cumulativePct = worst.pct;
  const warning =
    cumulativePct > threshold
      ? `⚠️ 体积方向性告警（裁决 V3-VOL-1 ④）：Feature ${feature} 内连续两轮重登记 ` +
        `（最差连续两轮）${previous.id}（${fromBytes} B → ${previous.baselineAfterBytes} B）+ ${last.id}（${last.baselineBeforeBytes} B → ${toBytes} B）` +
        `累计增幅 ${(cumulativePct * 100).toFixed(2)}% > ${(threshold * 100).toFixed(0)}% —— **必须显式回报编排器**（不得无声膨胀）；` +
        `累计 +${toBytes - fromBytes} B；增量构成见 SIDEPANEL_GROWTH_BREAKDOWN。`
      : null;
  return { feature, rounds: rounds.map((r) => r.id), fromBytes, toBytes, cumulativePct, threshold, warning };
}

/**
 * ── V3-4 新增 artifact 守卫：`dist/pick-layer.js`（ADR-V3-031 / NFR-V3-004）────
 *
 * 页面侧交互层是**第 5 个产物**（按需注入，不进常驻 `content.js`），因此它有自己的
 * 「不增长」上限，**与 `content.js` 各自独立、绝不合并计数**（合并会互相掩盖：
 * 一方的余量会替另一方买单）。
 *
 *   - 基线 = 首轮构建的**实测值**（`PICK_LAYER_BASELINE_BYTES`），
 *   - `PICK_LAYER_CEILING = 该实测值`：新 artifact 无历史包袱，采用与 `content.js`
 *     同级的**无容差**口径（+1 B 即 FAIL），
 *   - 来源依据 = TASK-401 spike 的 S2 实测（最小骨架 8,606 B ≤ 60,000 B）与首轮真实产物。
 *
 * 超限处置：**只能改实现**（精简 CSS / 去重复 / 复用纯函数）；**不得**放宽上限、
 * 不得合并计数、不得把代码迁回 `content.js`（EC-V3-012）。
 *
 * ── 2026-09-17 显式重登记（编排器裁决 **V3-VOL-2**）：32,391 → 33,900 B ──────────
 *
 * 与 `content.js`（产品硬约束、历史沿用的上限）不同，本上限是**本 Feature 自建的
 * 首轮实测值**；本次 +1,509 B（+4.66%）承载的是**正确性 / 安全性修复**（而非新功能）：
 * ① 卸载后 Shadow host 复活（I-02）；② 菜单关闭不还原宿主焦点（I-03）；③ 层不按
 * `authorized` 自检、卸载不上报 `gone`、广播 teardown 的单 tab 缺口（I-01②③ / I-01①）。
 * 这些修复只能落在 `src/content/pick-{overlay,menu,layer,bridge}.ts`，而按 ADR-V3-031
 * 「登记值 == 实测产物（零容差）」的纪律，字节增长必须**显式重登记**而不是靠压缩凑数。
 * 逐文件归因（受控实验：逐文件回退到 **R2 前 `1e1b798`** 后 `npm run build`，读 `dist/pick-layer.js`）：
 * pick-overlay +661 / pick-menu +389 / pick-layer +376 / pick-bridge +83 = **+1,509 B**
 *（Σ 与「交付态 − 全部回退态」逐字节相等，且与 `baselineAfterBytes − baselineBeforeBytes` 相等；
 * validate R1 独立复现同值。`test/pick-layer-budget.test.ts` 对「四项之和 == 总增幅」有机器断言）
 * **收口轮订正（validate R1 **F1**，2026-09-17）**：本节曾把逐文件分布登记为
 * `+615` / `+504` / `+307` / `+83`（同序：pick-overlay / pick-menu / pick-layer / pick-bridge），
 * 并把它描述成「受控实验…实测」—— 那其实是 **R1 当时的预估值**被当成「实测」登记，属
 * **登记失真**（历史值在上句逐字保留）。现按实测订正为 `+661 / +389 / +376 / +83`。
 * 前后值、日期、来源、理由与「历史值逐字保留」（{@link PICK_LAYER_BASELINE_BYTES_HISTORY}
 * 的 32,391）登记在 {@link PICK_LAYER_RE_REGISTRATIONS}。**不放宽项**：`content.js`
 * 177,076 B 仍不可动；容差仍为 0（`+1 B` @ 33,901 必 FAIL）。
 */
export const PICK_LAYER_BASELINE_BYTES = 33_900;

/** `PICK_LAYER_CEILING` = 实测值（**无容差**；+1 B → FAIL）。 */
export const PICK_LAYER_CEILING = PICK_LAYER_BASELINE_BYTES;

/** `dist/pick-layer.js` 的登记实测值（`PICK_LAYER_BASELINE_BYTES` 的同源断言）。 */
export const PICK_LAYER_FINAL_ARTIFACT_BYTES = 33_900;

/**
 * **历史值逐字保留**（重登记纪律：历史只可追加，不得改写）。
 * 32,391 = 首轮（v3-4 build 轮）发表的实测基线，被 2026-09-17 的 V3-VOL-2 重登记取代。
 */
export const PICK_LAYER_BASELINE_BYTES_HISTORY = [32_391] as const;

/**
 * 重登记披露登记册（与 {@link SIDEPANEL_RE_REGISTRATIONS} 同构、同纪律）。
 *
 * 每次重登记都必须显式登记「前后值 + 日期 + 来源 + buildCommand + measuredBy + 理由 +
 * 断言零删减的台账条目 + 历史值逐字保留 + 该轮 ceiling 候选值」；`pick-layer-budget.test.ts`
 * 逐条断言字段齐备且链条首尾相接（上一轮 after == 下一轮 before，最后一项 == 当前登记值）。
 */
export const PICK_LAYER_RE_REGISTRATIONS: readonly SizeReRegistration[] = [
  {
    id: 'v3-4',
    roundKind: 'feature-round',
    feature: 'specs-tree-v3-4-page-as-input',
    date: '2026-09-16',
    source: 'packages/web-cli-plugin/dist/pick-layer.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy: 'SDDU v3-4 build round (leaf specs-tree-v3-4-page-as-input)',
    reason:
      '首轮登记：页面侧交互层作为第 5 个产物（按需注入，不进常驻 content.js）的实测值，' +
      '自有「不增长」上限（容差 0，+1 B → FAIL），与 content.js 各自独立、不合并计数。',
    baselineBeforeBytes: 0,
    baselineAfterBytes: 32_391,
    ceilingBeforeBytes: 0,
    ceilingAfterBytes: 32_391,
    assertionNonRemovalEntries: ['V34-N2'],
    historyRetainedBytes: [],
    ceilingUncappedFormulaBytes: 32_391,
  },
  {
    id: 'v3-4-fix2',
    roundKind: 'feature-round',
    feature: 'specs-tree-v3-4-page-as-input',
    date: '2026-09-17',
    source: 'packages/web-cli-plugin/dist/pick-layer.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy: 'SDDU v3-4 fix round R2 (leaf specs-tree-v3-4-page-as-input, orchestrator ruling V3-VOL-2)',
    reason:
      '**显式重登记（+1,509 B / +4.66%）**：本上限是**本 Feature 自建的首轮实测值**（不是 content.js ' +
      '那样的产品硬约束），本轮增长承载的是**正确性 / 安全性修复**的 5 项落地 —— I-02（`document_start` ' +
      '挂载后卸载会**复活** Shadow host：DOMContentLoaded 追加未被清除）、I-03（打开自绘菜单即夺走宿主焦点且 ' +
      '关闭不还原）、I-01②（层不按 `env().authorized` 自检 ⇒ 丢失 teardown 后继续拦右键）、I-01③（`pushState(\'gone\')` ' +
      '从未调用 ⇒ 面板 `gone` 分支是死路径、卸载后仍视为 injected）、I-10（`history.__wcliPickWrapped` 死判据 + ' +
      '`flash()` 未跟踪定时器）。逐文件归因（受控实验：逐文件回退到 R2 前 `1e1b798` 后 `npm run build`，`stat` 读产物）：' +
      'pick-overlay +661 / pick-menu +389 / pick-layer +376 / pick-bridge +83 = +1,509 B（实测；' +
      'Σ == baselineAfterBytes − baselineBeforeBytes，由 test/pick-layer-budget.test.ts 机器断言）。' +
      '**收口轮订正（validate R1 F1）**：本条曾登记 `+615` / `+504` / `+307` / `+83`（R1 预估值被当成' +
      '「受控实验实测」，属登记失真；历史值即此逐字保留），现按实测订正。' +
      '处置：**显式重登记**（而非压缩 CSS / 调空白凑字节），前值 32,391 B 逐字保留在 ' +
      'PICK_LAYER_BASELINE_BYTES_HISTORY；容差仍为 **0**，`+1 B`（33,901）反证必须 FAIL；' +
      '`content.js` 177,076 B 与 `sidepanel.js` 362,777 B 本轮**零改动**。',
    baselineBeforeBytes: 32_391,
    baselineAfterBytes: 33_900,
    ceilingBeforeBytes: 32_391,
    ceilingAfterBytes: 33_900,
    assertionNonRemovalEntries: ['V34R2-S1', 'V34R2-S2'],
    historyRetainedBytes: [32_391],
    ceilingUncappedFormulaBytes: 33_900,
  },
];

export const PICK_LAYER_BASELINE_META = {
  measuredOn: '2026-09-17',
  source: 'packages/web-cli-plugin/dist/pick-layer.js',
  buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
  measuredBy: 'SDDU v3-4 fix round R2 (leaf specs-tree-v3-4-page-as-input, orchestrator ruling V3-VOL-2)',
  /** 前值（首轮 v3-4 实测）：32,391 B —— 逐字保留在 PICK_LAYER_BASELINE_BYTES_HISTORY。 */
  previousBaselineBytes: 32_391,
  /** 方向：**显式提升**重登记（32,391 → 33,900，+1,509 B / +4.66%）。 */
  direction: 'raised',
  /** 容差 = 0（无容差口径，与 `content.js` 同级）。 */
  tolerance: 0,
  /** TASK-401 spike 的 S2 实测（最小骨架）与上限，供来源可核。 */
  spikeSkeletonBytes: 8_606,
  spikeLimitBytes: 60_000,
  disambiguation:
    '与 `CONTENT_MAX_BYTES`（177,076 B，常驻 `content.js`）**各自独立**；两者不得合并计数，也不得互相顶替。',
  /** 五要素披露的第二份落点（登记册 {@link PICK_LAYER_RE_REGISTRATIONS} 是权威值）。 */
  reRegisteredFrom: 'v3-4 build 轮 32,391 B（2026-09-16 首轮实测，容差 0）；2026-09-17 V3-VOL-2 显式重登记为 33,900 B。',
  reason:
    '2026-09-17 显式重登记（编排器裁决 V3-VOL-2）：32,391 → 33,900 B（+1,509 B / +4.66%）。' +
    '理由 = 本次增长承载**正确性 / 安全性修复**（复活 host / 焦点还原 / 授权自检 / gone 上报 / 定时器与死判据清理），' +
    '不是新功能扩张；本上限是本 Feature 自建的首轮实测值，与 content.js 的产品硬约束性质不同。' +
    '来源 = `npm run build --workspace @lgdl/web-cli-plugin` + `stat -c %s dist/pick-layer.js`（33,900）；' +
    '前值 32,391 逐字保留在 PICK_LAYER_BASELINE_BYTES_HISTORY；容差仍 0（+1 B @ 33,901 必 FAIL）。',
} as const;

/** Pure verdict for a measured `dist/pick-layer.js` size (**no tolerance**). */
export function evaluatePickLayerCeiling(
  measuredBytes: number,
  ceilingBytes: number = PICK_LAYER_CEILING,
): SizeVerdict {
  const ok = measuredBytes <= ceilingBytes;
  return {
    ok,
    measuredBytes,
    ceilingBytes,
    excessBytes: Math.max(0, measuredBytes - ceilingBytes),
    message: sizeMessage(
      'pick-layer.js',
      measuredBytes,
      ceilingBytes,
      ok,
      '新 artifact 独立无容差上限（ADR-V3-031；与 content.js 不合并计数）',
    ),
  };
}

/**
 * Hard no-growth ceiling for the injected `dist/content.js` (NFR-V2-002).
 *
 * Guard-tighten re-registration (2026-09-14): the v1-era value 1,073,453 B was
 * measured *before* the base LLM SDK lazification (commit `0df2273`). Leaving it
 * there let `content.js` silently regrow to ~1 MiB with every guard green. It is
 * now re-registered at the post-fix measured value **177,076 B** (source:
 * `npm run build --workspace @lgdl/web-cli-plugin` + `stat -c %s dist/content.js`).
 * Semantics are unchanged: **no tolerance — one byte over FAILS** (reverse proof
 * drives `177_077` → FAIL). Previous value 1,073,453 B stays on record.
 */
export const CONTENT_MAX_BYTES = 177_076;

/**
 * `src/content/**` source content hashes (W3 discipline): the injected bundle's
 * sources are **frozen by content hash** (not by a post-commit-恒绿 `git diff`).
 * Any byte change — including whitespace — must FAIL unless the pin is explicitly
 * updated with a dated reason. Pinned 2026-09-13 (V2-4 build; zero-injection red line).
 */
export const CONTENT_SOURCE_SHA256: Readonly<Record<string, string>> = {
  'src/content/content-script.ts': 'a72900313ab77c018961aa2b8e02bb1b630a9960c1b622f2a85addf543f99e82',
  'src/content/dom-agent.ts': '7df782b349b32839d0ec25fa515ee293441f85f75242083dae37e5ccfd601e0f',
  'src/content/page-bridge.ts': '5737c40a2014e7adf2bf4091a31a347af6600ecfea80f8882d52e9407191f4ac',
};


export interface SizeVerdict {
  ok: boolean;
  measuredBytes: number;
  ceilingBytes: number;
  excessBytes: number;
  message: string;
}

function sizeMessage(
  artifact: string,
  measuredBytes: number,
  ceilingBytes: number,
  ok: boolean,
  baselineClause: string,
): string {
  const excess = Math.max(0, measuredBytes - ceilingBytes);
  return ok
    ? `${artifact} ${measuredBytes}B ≤ 回归上限 ${ceilingBytes}B（${baselineClause}）。`
    : `${artifact} 体积回归：实测 ${measuredBytes}B > 回归上限 ${ceilingBytes}B（${baselineClause}）；超出 ${excess}B。` +
      '若为有意增重，请显式更新 test/size-baseline.ts 的基线并注明测量日期与来源；不得改容差或删断言来掩盖。';
}

/**
 * Pure verdict for a measured `dist/sidepanel.js` size (regression guard).
 *
 * The ceiling is the plain formula `floor(baseline × (1 + tolerance))` — **no cap
 * participates** (orchestrator ruling V3-VOL-1 ② revoked the v3-1 I6
 * `SIDEPANEL_CEILING_CAP` hard cap; it is a record-only field now). The guard's
 * integrity is carried by the four replacement guards instead:
 *   ① the formula + 5% tolerance here,
 *   ② `SIDEPANEL_RE_REGISTRATIONS` (explicit disclosure per round),
 *   ③ `SIDEPANEL_GROWTH_BREAKDOWN` (per-module growth justification),
 *   ④ `evaluateConsecutiveReRegistrationGrowth()` (>15% over two rounds ⇒ alert).
 */
export function evaluateSidepanelSize(
  measuredBytes: number,
  baselineBytes: number = SIDEPANEL_BASELINE_BYTES,
  tolerance: number = SIDEPANEL_BASELINE_TOLERANCE,
): SizeVerdict {
  const ceilingBytes = Math.floor(baselineBytes * (1 + tolerance));
  const ok = measuredBytes <= ceilingBytes;
  return {
    ok,
    measuredBytes,
    ceilingBytes,
    excessBytes: Math.max(0, measuredBytes - ceilingBytes),
    message: sizeMessage(
      'sidepanel.js',
      measuredBytes,
      ceilingBytes,
      ok,
      `基线 ${baselineBytes}B × ${(1 + tolerance).toFixed(2)} 容差（公式判定，无 cap —— 裁决 V3-VOL-1 ②）；基线 ≠ 目标预算`,
    ),
  };
}

/** Pure verdict for a measured `dist/content.js` size (**hard ceiling, no tolerance**). */
export function evaluateContentCeiling(
  measuredBytes: number,
  maxBytes: number = CONTENT_MAX_BYTES,
): SizeVerdict {
  const ok = measuredBytes <= maxBytes;
  return {
    ok,
    measuredBytes,
    ceilingBytes: maxBytes,
    excessBytes: Math.max(0, measuredBytes - maxBytes),
    message: sizeMessage('content.js', measuredBytes, maxBytes, ok, '零注入红线：不增长，无容差'),
  };
}

/** Read `dist/...` relative to this module (works from `dist-test/test/`). */
export function distArtifact(relative: string): URL {
  return new URL(`../../dist/${relative}`, import.meta.url);
}

// ---------------------------------------------------------------------------
// ── 作者裁决 **V3-VOL-3**（2026-09-18，选 **B**）：撤销 Feature 级 40% 累计停工线 ──
//
// 性质 = **工程纪律裁决的代码化**（不是功能变更；`dist/*` 零字节变化）。
//
//   - **撤销**：「Feature 累计增幅 40% 停工线」（口径 = 从 266,500 B 基线起算的百分比）。
//     理由（作者原话要点）：该百分比线在活跃开发期已无参照意义 —— R3 后实际 **+40.75%** 越过该线。
//   - **保留**：单轮 5% 容差 · 重登记五要素披露（前后值/日期/来源/理由/历史保留）·
//     相邻两轮 >15% 告警 · `ceiling = floor(当前值 × 1.05)`。
//   - **新增义务（硬约束）**：**方案 F 重构（聊天流统一承载）落地收口时，必须重新定
//     sidepanel 体积基线并设置绝对值上限** —— 机器标记 {@link PENDING_ABSOLUTE_CAP}
//     （`resolved === false` 存续 + 「不可静默删除」断言），F 收口置 `true` 时必须同时给出
//     新基线与绝对上限值（该断言本轮已写好，F 收口时自然生效）。
//   - **历史只追加**：各轮 `reason` 里提到 40% 线的文本**逐字保留**（那是历史事实）；
//     `SIDEPANEL_BASELINE_META.consecutiveGrowthAlert` 亦保留原句并**追加**撤销登记。
//
// ── 诊断（只读先行，如实登记）───────────────────────────────────────────────
// 裁决前，该 40% 线在仓库里是**登记口径的纪律文本**（`consecutiveGrowthAlert` +
// 各轮 `reason` + `docs/closeout.md §9B-8`），**没有**对应的机器常量/断言 —— 所以「撤销」
// 不能靠删一行代码完成，也不能靠静默删文本了事。本轮把它做成**可判定的历史规则模型**：
// `enforced: false` + `revokedBy: 'V3-VOL-3'`（撤销出处必须可读），并保留可 FAIL 的反证：
// `enforced: true`（= 恢复裁决前口径）时，对当前真实产物 375,102 B（+40.75%）**必然 FAIL**。
// ---------------------------------------------------------------------------

/** 裁决记录（结构化、可被门禁断言；不参与运行期判定）。 */
export interface SizeRulingRecord {
  readonly id: string;
  readonly date: string;
  readonly decidedBy: string;
  /** 作者裁决所选项（本裁决 = `B`：接受增长并改军规）。 */
  readonly choice: string;
  readonly title: string;
  readonly nature: string;
  readonly artifactImpact: string;
  readonly revokedRule: string;
  readonly revokeReason: string;
  /** 明确保留、零改动的守卫项。 */
  readonly retained: readonly string[];
  /** 新增义务（硬约束，带机器标记）。 */
  readonly newObligation: string;
  readonly diagnostic: string;
  readonly reverseProof: string;
}

export const SIDEPANEL_SIZE_RULING_V3_VOL_3: SizeRulingRecord = {
  id: 'V3-VOL-3',
  date: '2026-09-18',
  decidedBy: 'author',
  choice: 'B',
  title: '接受增长并改军规 —— 撤销「Feature 累计增幅 40% 停工线」',
  nature: 'engineering-discipline-codification（工程纪律裁决的代码化，不是功能变更）',
  artifactImpact:
    'zero-byte —— dist/content.js 177,076 B / pick-layer.js 33,900 B / sidepanel.js 375,102 B 三产物 sha256 前后一致',
  revokedRule: 'Feature 级累计增幅 40% 停工线（口径 = 从 266,500 B 基线起算的百分比）',
  revokeReason:
    '266,500 B 基线口径的百分比线在活跃开发期已无参照意义：R3 后实际 +40.75% 越过该线，' +
    '而该线既不阻断构建也不对应任何产品约束（单轮 5% 容差 + 相邻两轮 >15% 告警已覆盖「无声膨胀」风险）。',
  retained: [
    '单轮 5% 容差（SIDEPANEL_BASELINE_TOLERANCE = 0.05，未动）',
    '重登记五要素披露（前后值 / 日期 / 来源 / 理由 / 历史保留）',
    '相邻两轮 >15% 告警（evaluateConsecutiveReRegistrationGrowth，未动）',
    'ceiling 公式 floor(当前值 × 1.05)（SIDEPANEL_CEILING，未动）',
  ],
  newObligation:
    '方案 F 重构（聊天流统一承载）落地收口时，必须**重新定 sidepanel 体积基线并设置绝对值上限**' +
    '（机器标记 PENDING_ABSOLUTE_CAP：resolved 必须由 false 变 true 且同时给出新基线 + 绝对上限）。',
  diagnostic:
    '裁决前，该线只是登记口径的纪律文本（consecutiveGrowthAlert + 各轮 reason + docs/closeout.md §9B-8），' +
    '本文件没有对应的机器常量/断言。为满足「撤销要干净、不是静默绕过」，本轮建立可判定的历史规则模型' +
    '（enforced=false + revokedBy=V3-VOL-3 + wouldFail 真值），使「该线真实存在过」可被机器反证。',
  reverseProof:
    'test/size-ruling-vol3.test.ts：① 恢复该线（enforced=true）⇒ 375,102 B（+40.75%）判定 FAIL' +
    '（assert.throws 命中「停工」）；② 还原裁决（enforced=false）⇒ PASS 且 message 必带撤销出处「V3-VOL-3」。',
};

/** 已撤销规则的**判定模型**（`enforced=false` 即不参与任何现行判定）。 */
export interface FeatureCumulativeStopWorkRule {
  /** 历史阈值（0.40 = 40%）。 */
  readonly threshold: number;
  /** 累计起点（266,500 B = 2026-09-14 惰性化收紧轮后的实测值，R3 起算口径）。 */
  readonly fromBytes: number;
  /** 是否**仍在判定**：`false` = 已被 {@link SIDEPANEL_SIZE_RULING_V3_VOL_3} 撤销。 */
  readonly enforced: boolean;
  /** 撤销它的裁决 id（`enforced=false` 时必填；判定路径不读它，仅供撤销出处可读）。 */
  readonly revokedBy: string;
  readonly revokedOn: string;
}

/** 历史登记值（**已撤销**）：40% / 从 266,500 B 起算。 */
export const SIDEPANEL_FEATURE_CUMULATIVE_STOP_WORK_LINE: FeatureCumulativeStopWorkRule = {
  threshold: 0.4,
  fromBytes: 266_500,
  enforced: false,
  revokedBy: 'V3-VOL-3',
  revokedOn: '2026-09-18',
};

export interface FeatureCumulativeStopWorkVerdict {
  /** 现行判定结果：撤销后恒 `true`（该线不再阻断）。 */
  readonly ok: boolean;
  readonly enforced: boolean;
  readonly revokedBy: string;
  readonly measuredBytes: number;
  readonly fromBytes: number;
  readonly cumulativePct: number;
  readonly threshold: number;
  /** 若按**裁决前**口径（该线仍在判定）是否越线 —— 与 `enforced` 无关，永远给出真值。 */
  readonly wouldFail: boolean;
  readonly message: string;
}

/**
 * 撤销规则的判定模型。`enforced=false`（现行）⇒ `ok=true` 且 message 必带撤销出处
 * （**显式登记，不是静默绕过**）；`enforced=true`（反证复现裁决前口径）⇒ 按历史阈值判定。
 */
export function evaluateFeatureCumulativeStopWorkLine(
  measuredBytes: number = SIDEPANEL_FINAL_ARTIFACT_BYTES,
  rule: FeatureCumulativeStopWorkRule = SIDEPANEL_FEATURE_CUMULATIVE_STOP_WORK_LINE,
): FeatureCumulativeStopWorkVerdict {
  const cumulativePct = (measuredBytes - rule.fromBytes) / rule.fromBytes;
  const wouldFail = cumulativePct > rule.threshold;
  const pctText = `${(cumulativePct * 100).toFixed(2)}%`;
  const thresholdText = `${(rule.threshold * 100).toFixed(0)}%`;
  const lineText = `Feature 累计 ${pctText}（从 ${rule.fromBytes}B 起算，历史阈值 ${thresholdText}）`;
  if (!rule.enforced) {
    return {
      ok: true,
      enforced: false,
      revokedBy: rule.revokedBy,
      measuredBytes,
      fromBytes: rule.fromBytes,
      cumulativePct,
      threshold: rule.threshold,
      wouldFail,
      message:
        `${lineText}：该停工线已由作者裁决 ${rule.revokedBy}（${rule.revokedOn}，选 B）**显式撤销**，` +
        '本轮起不参与停工/放行判定（显式登记，非静默绕过）。' +
        (wouldFail ? `（历史口径下本值会 FAIL：${pctText} > ${thresholdText}）` : ''),
    };
  }
  const ok = !wouldFail;
  return {
    ok,
    enforced: true,
    revokedBy: rule.revokedBy,
    measuredBytes,
    fromBytes: rule.fromBytes,
    cumulativePct,
    threshold: rule.threshold,
    wouldFail,
    message: ok
      ? `${lineText}：未越线，历史停工线口径下 PASS。`
      : `${lineText}：越过历史「40% 停工线」—— 按裁决前口径**必须停工/上报**` +
        `（该口径已由 ${rule.revokedBy} 撤销；此处为反证复现，不是现行判定）。`,
  };
}

/**
 * ── 新增义务（硬约束）：方案 F 重构收口必须「重定基线 + 设绝对上限」──────────────
 *
 * 裁决 V3-VOL-3 明文要求该义务**登记得足够显眼**，保证 F 立项时被带进其 spec 验收、
 * 不会被遗忘。因此它不是一句文档：{@link evaluatePendingAbsoluteCap} 是配套的可 FAIL 断言——
 *   - 标记**缺失** ⇒ FAIL（防静默删除）；
 *   - `resolved === false` ⇒ 待办存续（且不得预填新基线/绝对上限，避免伪闭合）；
 *   - `resolved === true` ⇒ **必须**同时给出 `newBaselineBytes` / `absoluteCeilingBytes` /
 *     `resolvedOn` 且 `absoluteCeilingBytes >= newBaselineBytes`，否则 FAIL。
 */
export interface PendingAbsoluteCap {
  /** 义务来源裁决 id。 */
  readonly since: string;
  readonly obligation: string;
  readonly resolved: boolean;
  /** F 收口时登记的新基线（未闭合时必须为 `null`）。 */
  readonly newBaselineBytes: number | null;
  /** F 收口时登记的**绝对值上限**（不是百分比；未闭合时必须为 `null`）。 */
  readonly absoluteCeilingBytes: number | null;
  readonly resolvedOn: string | null;
}

export const PENDING_ABSOLUTE_CAP: PendingAbsoluteCap = {
  since: 'V3-VOL-3',
  obligation: '方案 F 重构（聊天流统一承载）落地收口时，必须重新定 sidepanel 体积基线并设置绝对值上限',
  resolved: false,
  newBaselineBytes: null,
  absoluteCeilingBytes: null,
  resolvedOn: null,
};

export interface PendingAbsoluteCapVerdict {
  readonly ok: boolean;
  readonly resolved: boolean;
  readonly message: string;
}

/** 纯判定：PENDING 标记存续 / 闭合是否合规（缺失或伪闭合都 FAIL）。 */
export function evaluatePendingAbsoluteCap(
  marker: PendingAbsoluteCap | null | undefined = PENDING_ABSOLUTE_CAP,
): PendingAbsoluteCapVerdict {
  if (marker === undefined || marker === null) {
    return {
      ok: false,
      resolved: false,
      message:
        'PENDING_ABSOLUTE_CAP 标记缺失 —— 方案 F 收口义务被静默删除（裁决 V3-VOL-3 明文禁止）：' +
        '该标记必须存在且 resolved=false，直到 F 收口置 true 并给出新基线 + 绝对上限。',
    };
  }
  if (!marker.resolved) {
    const problems: string[] = [];
    if (marker.since.trim().length === 0) problems.push('since 为空');
    if (marker.obligation.trim().length < 20) problems.push('obligation 必填且非套话');
    if (marker.newBaselineBytes !== null || marker.absoluteCeilingBytes !== null) {
      problems.push('resolved=false 时不得预填新基线/绝对上限（避免伪闭合）');
    }
    return {
      ok: problems.length === 0,
      resolved: false,
      message:
        problems.length === 0
          ? `待办未闭合（${marker.since} 起生效）：${marker.obligation}`
          : `PENDING_ABSOLUTE_CAP 登记失真：${problems.join(' / ')}`,
    };
  }
  const problems: string[] = [];
  if (typeof marker.newBaselineBytes !== 'number' || !(marker.newBaselineBytes > 0)) {
    problems.push('newBaselineBytes 必填且 > 0');
  }
  if (typeof marker.absoluteCeilingBytes !== 'number' || !(marker.absoluteCeilingBytes > 0)) {
    problems.push('absoluteCeilingBytes 必填且 > 0');
  }
  if (
    typeof marker.newBaselineBytes === 'number' &&
    typeof marker.absoluteCeilingBytes === 'number' &&
    marker.absoluteCeilingBytes < marker.newBaselineBytes
  ) {
    problems.push('absoluteCeilingBytes 不得小于 newBaselineBytes');
  }
  if (marker.resolvedOn === null || !/^\d{4}-\d{2}-\d{2}$/.test(marker.resolvedOn)) {
    problems.push('resolvedOn 必填（YYYY-MM-DD）');
  }
  return {
    ok: problems.length === 0,
    resolved: true,
    message:
      problems.length === 0
        ? `F 收口义务已闭合：新基线 ${marker.newBaselineBytes}B + 绝对上限 ${marker.absoluteCeilingBytes}B（${marker.resolvedOn}）`
        : `resolved=true 但缺少闭合证据：${problems.join(' / ')}`,
  };
}

/**
 * ── 保留项的可 FAIL 机器判据：重登记五要素披露 ────────────────────────────────
 *
 * 裁决 V3-VOL-3 **保留**了 V3-VOL-1 ② 的披露纪律。此纯函数把它变成可复用判据：
 * 返回**违规清单**（空 = 全部合规）。`test/size-ruling-vol3.test.ts` 用它做守恒自检
 * （真实登记册零违规 + 缺 `reason` 的合成条目必须报违规）。
 */
export interface DisclosureViolation {
  readonly id: string;
  readonly field: string;
  readonly message: string;
}

export function validateReRegistrationDisclosure(
  entries: readonly SizeReRegistration[],
): readonly DisclosureViolation[] {
  const violations: DisclosureViolation[] = [];
  for (const r of entries) {
    const id = r.id.trim().length > 0 ? r.id : '(missing-id)';
    const push = (field: string, message: string) => violations.push({ id, field, message });
    if (r.id.trim().length === 0) push('id', '轮次标识必填');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date)) push('date', `日期必填且为 YYYY-MM-DD（实测 "${r.date}"）`);
    if (r.source.trim().length === 0) push('source', '来源必填（被测产物路径）');
    if (r.buildCommand.trim().length === 0) push('buildCommand', 'buildCommand 必填');
    if (r.measuredBy.trim().length === 0) push('measuredBy', 'measuredBy 必填');
    if (r.reason.trim().length < 20) push('reason', '理由必填且非套话（≥20 字符）');
    if (!(r.baselineAfterBytes > r.baselineBeforeBytes)) {
      push('baseline', '必须显式增重：baselineAfterBytes > baselineBeforeBytes');
    }
    if (r.historyRetainedBytes.length === 0 && r.baselineBeforeBytes > 0) {
      push('historyRetainedBytes', '必须列出本轮逐字保留的历史值');
    }
    if (r.assertionNonRemovalEntries.length === 0) {
      push('assertionNonRemovalEntries', '必须登记「断言零删减」台账条目');
    }
  }
  return violations;
}
