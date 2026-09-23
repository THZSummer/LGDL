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
 *   - `dist/sidepanel.js` ... 266,500 → 291,523 B (+12,886 B, +2.77%)
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
 *   - `dist/sidepanel.js` ... 327,679 → **328,476 B**（+12,886 B，+2.77%）
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
 *
 * ── V4-4 收口轮（2026-09-20，validate R1 的 F-01 + N-01~N-05 处置）─────────────
 * `src` 改动 = **一处**：`sidepanel.ts#projectRef` 的投影唯一性键改为 `refNum + 状态`
 * （F-01：`dom-gone` 救援观察落地时同序号 ref 卡被重复投影，validate R1 实测
 * `data-ref-num=["1","1"]`；旧守卫 `if (!systemText && …)` 让「要写一行可读系统行」
 * 顺带绕开卡的抑制）。真实 metafile 归因 `sidepanel.ts` 79,626 → **79,750 B**（+124 B，
 * Σ + glue 0 == 登记增量）。N-01~N-05 为登记/口径项，**零字节**；门禁侧只**新增**
 * 断言（`test/ui/page-input.mjs` ⑯ 四条件 + 两段证伪），无任何断言被删除或放宽。
 *
 * ── V4-4 快修轮（2026-09-20，review R2 的 I-09~I-11 处置）─────────────────────
 * `src` 改动 = **一处**：`sidepanel.ts` 的「首装」推荐时机真实接线（I-09 —— 该时机此前
 * **无生产调用点**，`R-ONBOARDING` 的卡只在测试 seam 里可达）。真实 metafile 归因
 * `sidepanel.ts` 78,892 → **79,626 B**（+734 B，Σ + glue 0 == 登记增量）。I-10（披露文案
 * 算术）/ I-11（ADR 口径 + 陈旧注释）零字节改动。方向 = 提升（`registry-fidelity-round`）。
 *
 * ── V5-2 R1（2026-09-22，leaf `specs-tree-v5-2-ops-first-batch`；TASK-V5-123~137）──────
 * `src` 改动 = 9 op 前五落地（`shared/op-table.ts` + `next-registry/ops.ts`）+ SW 执行器
 * 与 `op-*` type-only 通路 + `op.authorize` 两段握手 + 掩码 `secret` 卡与值直达 key-store
 * + `op.llm-config` 凭据快照回滚。真实 `dist/build-meta.json` bytesInOutput 逐模块归因见
 * `SIDEPANEL_GROWTH_BREAKDOWN.v52R1Rows`（Σ 逐模块 +11,155 + 未归因胶水 73 == 登记增量
 * +11,228）。方向 = 提升。**本轮越档位 ⇒ 编排器裁决① 显式升档**：
 * 档位 512,000 → **563,200**（`ceilTo50KB(518,543) = 563,200`），绝对上限 563,200 → **619,520**
 * （`563,200 × 1.10`）；`authorConfirmation` 保持 **`pending-author-line`**（占位，不伪称已确认）；
 * 生效上限 = `min(619,520, floor(518,543 × 1.05) = 544,470) = 544,470`。根因登记：ADR-V5-011 §1
 * 的预算表**低估约 2 倍**（给 9 op 执行体 3,400 B，实测仅 `ops.ts` 一项即 3,918 B；面板接线
 * 未在预算表单列，实测 +4,935 B）。
 */
/**
 * ── V5-2 **收口轮**（2026-09-22，validate R1 的 N-01 + N-04~N-09 / KL-N-10 登记）──────────
 * 处理 validate R1 的 **N-01**（`op.perm.request` 拒绝路径同一失败事实行**写 2 行**）。
 * `src` 改动 = **一处删除**：`sidepanel.ts#permRequest` 不再自己
 * `dispatch({ type: 'notice', text: out.receipt.text })` —— 该失败行由**管线结算**
 * （`pipeline.ts#defaultSettle('failed')` → `opReceiptText(op, out)`，取 `out.receipt.text`）
 * 唯一写出（settle = 唯一写者；文案不变，因为 settle 取的就是同一个 `out.receipt.text`）。
 * 真实 `dist/build-meta.json` bytesInOutput 归因：`sidepanel.ts` 93,773 → **93,687 B**
 * （**−86 B**，Σ −86 + 未归因胶水 0 == 登记增量 −86）。
 *
 * 方向 = **净减**（`roundKind: 'registry-fidelity-round'`，`direction: 'lowered'` —— N-01
 * 是「删一条重复写」的产物变更，非功能增重）；**档位 `ceilTo50KB(542,064) = 563,200` 与
 * 绝对上限 619,520 均未变**；生效上限 = `min(619,520, floor(542,064 × 1.05) = 569,167)
 * = 569,167`（较上一轮 569,257 更紧）。`dist/content.js` 177,076 B / sha `52a82620…` 与
 * `dist/pick-layer.js` 33,900 B / sha `5f567d7e…` **逐字节不变**。
 */
export const SIDEPANEL_BASELINE_BYTES = 563_145;

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
  349_880, 349_925, 362_777, 366_500, 366_755, 368_529, 375_102, 385_319, 425_442, 425_094, 426_487, 440_698,
  445_300, 445_300, 465_000, 465_277, 476_834, 478_163, 478_897, 479_021, 480_026, 480_896,
  // 〖V4.5-1 W3（2026-09-21）〗宿主全退役 + 元素卡内化 / 视图迁移一轮的登记值（追加是唯一允许的编辑）。
  493_501,
  // 〖V4.5-1 review R1 修复轮（2026-09-21）〗BLOCK-01~04 + I-01~06 的登记值。
  498_521,
  // 〖V5-1 R1（2026-09-22，TASK-V5-101~113）〗NextProvider 注册表 + 管线 + 瘦分发一轮的登记值。
  507_315,
  // 〖V5-2 R1（2026-09-22，TASK-V5-123~137；编排器裁决① 显式升档）〗9 op 前五 + SW 执行器
  //   + 两段握手 + 掩码卡 + 凭据回滚一轮的登记值（档位 512,000 → 563,200；绝对上限 → 619,520）。
  518_543,
  // 〖V5-2 R2（2026-09-22，TASK-V5-138~152；程序面收口轮）〗form/perm.request/revoke/三表回滚
  //   + settings 收编 + S2 断链门禁一轮的登记值（档位与绝对上限不变）。
  535_821,
  // 〖V5-2 review R1 修复轮（2026-09-22）〗BLOCK-01~03 + I 项：载荷透传 / 失败结算与真回滚 /
  //   perm.missing 事实源 / 四类执行体提为与面无关的 `settings/op-bodies.ts` 一轮的登记值
  //   （档位 563,200 与绝对上限 619,520 均不变；生效上限 → 569,257）。
  542_150,
  // 〖V5-2 收口轮（2026-09-22，validate R1 的 N-01 + N-04~N-09 / KL-N-10 登记）〗唯一 `src` 改动 =
  //   `sidepanel.ts#permRequest` 删去自我 `dispatch`（失败行由管线 settle 唯一写出）；**净减 −86 B**
  //   （档位 563,200 与绝对上限 619,520 均不变；生效上限 → 569,167）。
  542_064,
  // 〖V5-3 R2（2026-09-22，TASK-V5-153~176；**末叶 / 收口叶 + 三叶合计终轮**）〗授权 chip 唯一载体
  //   + `data-narrow`（ResizeObserver→实际宽度 ≤360）+ 密度口径解耦（X5 等价重锚）+ `error` 出生
  //   恢复区 + 死端守护 + 法八四面机核 + **法八面③ `maskedLength` 审计列**（+566 B）+ 体积五要素三叶
  //   合计登记（档位 563,200 与绝对上限 619,520 均不变；生效上限 → 573,688）。
  546_370,
  // 〖V5-3 review R1 修复轮（2026-09-22，BLOCK-01 + I-01~05；**唯一载体彻底闭环**）〗站点行授权态
  //   改**指针**（`auth-pointer` + `data-auth-pointer="#auth-state"`；台账零状态值）+ dot/policyTone
  //   与授权态解耦（I-02）+ `blockedRecovery` 对象键对齐（I-05）+ S2 十环节逐环节读数（I-03）
  //   （档位 563,200 与绝对上限 619,520 均不变；生效上限 → 574,935）。
  547_558,
  // 〖R4 缺陷修复轮（2026-09-22，引用出生即失效：选择器截断根修 + 诊断分离 + 捕获回环校验止血）〗
  //   根修 = `content/ref-capture.ts#selectorFor` 存储选择器**永不截断**（>512 才回退 compact 链；
  //   截断只保留在展示层）+ `resolveRef` / `observeIdentity` 把 `invalid-selector` 与 `missing`
  //   分开 + `ref-validity.ts` 维度词表只增；止血 = `acceptCapture` 捕获回环校验（唯一文本匹配 ⇒
  //   用 SW 现算的完整选择器替换后重判 / 仍失败 ⇒ 拒铸 + 可读系统事件 + 引导 next）。
  //   `dist/pick-layer.js` 33,900 → **34,358 B**（显式解冻重登记，见 PICK_LAYER_RE_REGISTRATIONS）；
  //   `dist/content.js` 177,076 B **逐字节不变**（档位 563,200 与绝对上限 619,520 均不变；
  //   生效上限 → 577,089）。
  549_609,
  // 〖V5.5-1 R1（2026-09-23，TASK-V55-101~112；W1+W2 驱动者层底座轮）〗驱动者声明单源
  //   （drivers.ts）+ 驱动者终态词汇（terminals.ts）+ 时机源外移 + 驱动者行登记（providers.ts）
  //   + 三个新 node 门禁的**中间**登记值（本叶 W4 = TASK-V55-125 收口轮将再登记）。
  554_576,
  // 〖V5.5-1 R2（2026-09-23，TASK-V55-113~125；W3+W4 收口轮）〗答案驱动化（`nextAfterSettle` 单入口
  //   + `'answered'` 时机 + `applyRefAction` 裁决+驱动 + `submitDescribe` 补齐 + 后台 ask 迟到
  //   非死端）+ S0 双面门禁 + `no-dead-end` 判据升级 + 法七扩展门禁的**收口**登记值。
  557_761,
  // 〖V5.5-1 review R1 修复轮（2026-09-23，review R1 的 BLOCK-01 + I-01~03）〗后台 ask「取消」
  //   守卫（FR-SELF-023 口径② 的生产路径落地）+ X-SELF 台账落账 + 恒真断言修复 + 调用点口径门禁。
  557_883,
  // 〖V5.5-2 R1（2026-09-23）〗主题① 确定性系统流（配置判据 / 引导 4 步 / 悬置续接）的登记值。
  562_273,
  // 〖V5.5-2 R2（2026-09-23，TASK-V55-213~216；W5 = 两场景 / S0 分支 B 必判项 / 取消非死端 / 收口）〗
  //   两场景单源 + 取消同因去重 + **掩码参数 ask 的 resolver 归属修正**（引导首次可真正完成 ⇒ 自动续接）
  //   的登记值（档位 `ceilTo50KB(563,145) = 563,200` 与绝对上限 619,520 均**未变**，距档位 55 B）。
  563_145,
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
export const SIDEPANEL_BASELINE_BYTES_INTERMEDIATE_SNAPSHOTS = [362_163, 362_865, 464_491] as const;

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
export const SIDEPANEL_FINAL_ARTIFACT_BYTES = 563_145;

/**
 * Machine-readable provenance. `targetBudgetBytes` / `targetMet` are **null on
 * purpose**: this is a regression baseline, not a target. Asserting them null is
 * how the suite forbids「目标达成」wording here (ADR-V2-007).
 */
export const SIDEPANEL_BASELINE_META = {
  kind: 'regression-baseline-only',
  measuredOn: '2026-09-23',
  source: 'packages/web-cli-plugin/dist/sidepanel.js',
  buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
  measuredBy:
    'SDDU **V5.5-2 R2（2026-09-23, leaf specs-tree-v55-2-deterministic-onboarding; W5 = TASK-V55-213~216）**: re-registered on the FINAL artifact — 562,273 → **563,145 B**（+872 B，+0.16%）— ' +
    '主题① 收口轮：两场景单源（`onboarding-flow.ts#ONBOARD_SCENARIOS` / `onboardScenario()`）+ 「取消引导 ⇒ 同因不重复」去重键（`suppressOnboardCause` + `declinedOnboardCauses`）+ ' +
    '**掩码参数 ask 的 resolver 归属修正**（`submitAskFor` 的 op 分支不再先删 resolver ⇒ `submitSecret` 才能交付值 ⇒ 引导首次可真正走到 consent / complete ⇒ 自动续接）；' +
    '真实 metafile 逐模块归因见 `SIDEPANEL_GROWTH_BREAKDOWN.v552R2Rows`（Σ +872 + glue 0 == +872）；档位 `ceilTo50KB(563,145) = 563,200` 与绝对上限 619,520 **均未变**（⚠️ 距档位仅 55 B），生效上限 = `min(619,520, floor(563,145 × 1.05) = 591,302) = 591,302`；`dist/content.js` 177,076 B 与 `dist/pick-layer.js` 34,358 B **逐字节不变**；本条目为**本叶最终登记**。' +
    'Previous round: ' +
    'SDDU **V5.5-2 R1（2026-09-23, leaf specs-tree-v55-2-deterministic-onboarding; W1~W4 = TASK-V55-201~212）**: re-registered on the FINAL artifact — 557,883 → **562,273 B**（+4,390 B，+0.79%）— ' +
    '主题① 确定性系统流：`isLlmConfigured` 3 字段判据（落 `src/llm/status.ts` = SW bundle ⇒ 本产物零字节）+ `runChat` 前置判据（先于 `providerChat` ∧ 先于 `chatBusy = true`）+ `chat-result` 的 `variant` **type-only** 扩成员（`KIND_SET` 40 逐字不动）+ 双源并存（主动识别折叠进既有 `risk` 源）+ NEW `next-registry/onboarding-flow.ts`（引导 4 步单源）+ NEW `next-registry/suspension.ts`（悬置单源 `MAX=1` + 有效期重校验）+ 配置完成自动续接；真实 metafile 逐模块归因见 `SIDEPANEL_GROWTH_BREAKDOWN.v552R1Rows`（Σ +4,293 + glue +97 == +4,390）；档位 `ceilTo50KB(562,273) = 563,200` 与绝对上限 619,520 **均未变**（⚠️ 距档位仅 927 B），生效上限 = `min(619,520, floor(562,273 × 1.05) = 590,386) = 590,386`；`dist/content.js` 177,076 B 与 `dist/pick-layer.js` 34,358 B **逐字节不变**；本条目为**中间登记**（W5 TASK-V55-216 按最终产物再登记）。' +
    'SDDU **V5.5-1 review R1 修复轮（2026-09-23, leaf specs-tree-v55-1-driver-layer; review R1 的 BLOCK-01/02 + I-01~03）**: re-registered on the FINAL artifact — 557,761 → **557,883 B**（+122 B，+0.02%）— ' +
    'BLOCK-01 后台 ask「取消」守卫（`submitAskFor` 的 `rid && !isRef` 分支在 `registerSuspension` **之前**用 `isCanceled` 拦下 ⇒ 不记 `answered-bg` / 不驱动 `answered`，与 op 路同口径走稳态驱动集；FR-SELF-023 口径② / EC-SELF-005 的**生产路径**落地）+ 逐模块归因见 `SIDEPANEL_GROWTH_BREAKDOWN.v551FixRows`（`sidepanel.ts` 99,566 → **99,688（+122）**，Σ +122 + glue 0 == +122）+ X-SELF-2/4/5/6 取代台账落账 + X-SELF-1「未发生取代」登记 + `driver-quadruple` 恒真断言修复（I-01）+ `applyRefAction` 调用点口径门禁（I-02）+ S0 Chromium 面十环节机序（I-03）；档位 `ceilTo50KB(557,883) = 563,200` 与绝对上限 619,520 **均未变**，生效上限 = `min(619,520, floor(557,883 × 1.05) = 585,777) = 585,777`；`dist/content.js` 177,076 B 与 `dist/pick-layer.js` 34,358 B **逐字节不变**（sha 复核）。Previous round: SDDU **V5.5-1 R2（2026-09-23, leaf specs-tree-v55-1-driver-layer; W3+W4 = TASK-V55-113~125；答案驱动化 + S0 双面 + no-dead-end 判据升级 + 法七扩展）**: re-registered on the FINAL artifact — 554,576 → **557,761 B**（+3,185 B，+0.57%）— ' +
    'SDDU **V5.5-1 R1（2026-09-23, leaf specs-tree-v55-1-driver-layer; W1+W2 = TASK-V55-101~112；驱动者声明单源 + 终态词汇 + 时机源外移 + 驱动者行登记）**: re-registered on the FINAL artifact — 549,609 → **554,576 B**（+4,967 B，+0.90%）— ' +
    '驱动者层底座 W1+W2：NEW `next-registry/drivers.ts` + NEW `next-registry/terminals.ts`（正交 4 终态）+ `RecommendTrigger` 外移单源 + `providers.ts` 10 行 `DRIVER_DECLS_SRC` 驱动者声明表 + `NextCtx` 加法字段组 `session.proactive`；真实 metafile 逐模块归因见 `SIDEPANEL_GROWTH_BREAKDOWN.v551R1Rows`（Σ +4,919 + glue +48 == +4,967）；档位 563,200 与绝对上限 619,520 **均未变**，生效上限 = `min(619,520, floor(554,576 × 1.05) = 582,304) = 582,304`；`dist/content.js` 177,076 B 与 `dist/pick-layer.js` 34,358 B **逐字节不变**；本条目为**中间登记**（W4 TASK-V55-125 按最终产物再登记）。Previous round: SDDU **R4 缺陷修复轮（2026-09-22, post-closeout; 作者裁决「根修 + 止血，含解冻 pick-layer.js」at HEAD 953a2ed）**: re-registered on the FINAL artifact — 547,558 → **549,609 B**（+2,051 B，+0.37%）— ' +
    '引用「出生即失效」的根修 + 止血：`content/ref-capture.ts#selectorFor` 存储选择器**永不截断**（`SELECTOR_STORE_MAX` = 512，超限回退 compact 链；截断只保留在展示层）+ `resolveRef` / SW `observeIdentity` 把 `invalid-selector` 与 `missing` 分开（`l1/ref-validity.ts` 维度词表只增 + 独立文案）+ `acceptCapture` **捕获回环校验止血**（唯一文本匹配 ⇒ 用 SW 现算的完整选择器替换后重判；仍失败 ⇒ 拒铸 + 可读系统事件 + 引导 next）；真实 metafile 逐模块归因见 `SIDEPANEL_GROWTH_BREAKDOWN.r4SelectorFixRows`（Σ +2,051 + glue 0）；档位 563,200 与绝对上限 619,520 未变，生效上限 = `min(619,520, floor(549,609 × 1.05) = 577,089) = 577,089`；`dist/content.js` 177,076 B / sha `52a82620…` 逐字节不变；`dist/pick-layer.js` 33,900 → **34,358 B**（同轮**显式解冻重登记**）。Previous round: SDDU V5-3 **review R1 修复轮（2026-09-22, leaf specs-tree-v5-3-chrome-face; BLOCK-01 + I-01~05）**: re-registered on the FINAL artifact — 546,370 → **547,558 B**（+1,188 B，+0.22%）— ' +
    '站点行授权态改**指针**（`auth-pointer` + `data-auth-pointer="#auth-state"`；台账零状态值）/ 工具栏 dot 与授权态解耦（I-02）/ `blockedRecovery` 对象键对齐（I-05）/ S2 十环节逐环节读数（I-03）+ 四词扫描口径回写 ADR（I-01）；' +
    '真实 metafile 逐模块归因见 `SIDEPANEL_GROWTH_BREAKDOWN.v53FixRows`（Σ +1,188 + glue 0）；档位 563,200 与绝对上限 619,520 未变，生效上限 = 574,935。Previous round: SDDU V5-3 **R2（末叶 / 收口叶 + 三叶合计终轮）** (2026-09-22, leaf specs-tree-v5-3-chrome-face; TASK-V5-153~176): re-registered on the FINAL artifact — 542,064 → **546,370 B** (+4,306 B, +0.79%) — of the CHROME / X5 / LAW7 / LAW8 closeout leaf: ① `#auth-state` 授权态唯一载体（两态恒显其一 + 零双写五条 + 黄/绿点击）；② `data-narrow`（`ResizeObserver` 观测面板**实际宽度** ≤360，非 `matchMedia` 视口）；③ 密度登记格口径与宽度**解耦**（X5 等价重锚：31 格逐格留痕 `docs/v4-density-baseline.json#v5Ledger`，阈值 7/15 · 9/20 · 17/35 逐字不动）；④ `error` **出生铸造**恢复区（`BORN_FROZEN_KINDS` 不动）+ 死端守护门禁（5 类逐类 + 死端 = 0 + 双向注入反证 + S2 全链主验收）；⑤ 法八四面零明文机核（含 **法八面③ `maskedLength` 审计列**：白名单 / 渲染列 / 行 / 单元格 + SW 侧只记**长度类别**）。Per-module metafile attribution: `sidepanel.ts` 93,687 → 95,702 (+2,015) / `l2/audit.ts` 4,145 → 4,711 (+566) / `cards/error.ts` 445 → 982 (+537) / `next-registry/providers.ts` 4,452 → 4,880 (+428) / `statusbar.ts` 976 → 1,335 (+359) / `l0/risk-rail.ts` 7,698 → 7,959 (+261) / `chat-state.ts` 17,647 → 17,847 (+200) / `stream-plaintext.ts` 4,567 → 4,627 (+60) / `view-model.ts` 23,788 → 23,668 (**−120**, 工具栏 digest 去 auth 段)；Σ 模块 +4,306 + glue 0 == 登记增量 +4,306（`SIDEPANEL_GROWTH_BREAKDOWN.v53Rows`）。档位 `ceilTo50KB(546,370) = 563,200` 与绝对上限 619,520 **均未变**；生效上限 = `min(619,520, floor(546,370 × 1.05) = 573,688) = 573,688`。`dist/content.js` 177,076 B / sha `52a82620…` 与 `dist/pick-layer.js` 33,900 B / sha `5f567d7e…` **逐字节不变**；容差 5% 未动、断言零删减。预算口径诚实登记：ADR-V5-011 §1 的 v5-3 逐项预算 3,250 B 被 R1 用满（+3,209），R2 的 `maskedLength` 列 + `data-narrow` 使本叶合计 **+4,306 B**（编排器裁决「质量优先，落 `maskedLength` 列」）⇒ 显式超出行预算并按**三叶合计**口径重登记（未删格、未放宽容差、未下调档位）。Previous round: ' +
    'SDDU V5-2 **收口轮** (2026-09-22, leaf specs-tree-v5-2-ops-first-batch; validate R1 的 N-01 + N-04~N-09 / KL-N-10 登记): re-registered on the FINAL artifact after the closeout round — 542,150 → **542,064 B** (-86 B, -0.02%) — of the ONE `src` change: `sidepanel.ts#permRequest` no longer `dispatch`es its own notice — the pipeline settle (`pipeline.ts#defaultSettle("failed")` → `opReceiptText(op, out)`) is the SOLE writer of the `op.perm.request` refusal fact row (validate R1 **N-01**: the duplicate row is gone; the text is unchanged because the settle reads the same `out.receipt.text`). Per-module metafile attribution: `sidepanel.ts` 93,773 → 93,687 = **-86 B**, Σ -86 + glue 0 == the registered delta（`SIDEPANEL_GROWTH_BREAKDOWN.v52CloseoutRows`）。方向 = **净减**（`direction: "lowered"` / `registry-fidelity-round`）；档位 `ceilTo50KB(542,064) = 563,200` 与绝对上限 619,520 **均未变**；生效上限 = `min(619,520, floor(542,064 × 1.05) = 569,167) = 569,167`（较上一轮更紧）。`dist/content.js` 177,076 B / sha `52a82620…` 与 `dist/pick-layer.js` 33,900 B / sha `5f567d7e…` **逐字节不变**；容差 5% 未动、断言零删减。Previous round: ' +
    'SDDU V5-2 **review R1 修复轮** (2026-09-22, leaf specs-tree-v5-2-ops-first-batch; BLOCK-01~03 + I 项): re-registered on the FINAL artifact — 535,821 → **542,150 B** (+6,329 B, +1.18%) — of the review-fix round: ① BLOCK-01 载荷透传（执行体透传 `OpOutcome` + ctx 值转发 + 缺缝 loud）与 options 面同执行体（新增 `settings/op-bodies.ts`，消灭假成功）；② BLOCK-02 非 `{ok:true}` 一律失败结算（`settle("failed")` + 三表整体回滚，EC-ALLN-011/NFR-ALLN-010 生产可达）；③ BLOCK-03 `llm.unconfigured` / `perm.missing` 修复 provider 真实接线（`BLOCKED_P0_MAP` 5/5 landed，双射闭合）；④ I-04 掩码只落长度类别 / I-05 未解释字节线性口径订正 / I-06 ADR 订正注 / I-02 执行体提为与面无关模块。Per-module metafile attribution: `settings/op-bodies.ts` NEW +8,151 / `sidepanel.ts` −2,636 / `settings/ops.ts` −1,852 / `cards/askuser.ts` −46 / `next-registry/providers.ts` +1,187 / `next-registry/ops.ts` +826 / `next-registry/pipeline.ts` +344 / `recommend.ts` +278 / `cards/nextstep.ts` +42; Σ +6,294 + glue 35 == 登记增量 +6,329（`SIDEPANEL_GROWTH_BREAKDOWN.v52ReviewfixRows`）。档位 `ceilTo50KB(542,150) = 563,200` 与绝对上限 619,520 **均未变**；生效上限 = `min(619,520, floor(542,150 × 1.05) = 569,257) = 569,257`。`dist/content.js` 177,076 B / sha `52a82620…` 与 `dist/pick-layer.js` 33,900 B / sha `5f567d7e…` **逐字节不变**；容差 5% 未动、断言零删减。Previous round: SDDU V5-2 R2 build (2026-09-22, leaf specs-tree-v5-2-ops-first-batch; TASK-V5-138~152): re-registered on the FINAL artifact — 518,543 → **535,821 B** (+17,278 B, +3.33%) — of the second half of the 9-op batch: the `form` multi-select card, `op.perm.request` (mechanism + two-stage handshake + approve/deny double固化), `op.revoke` (three targets + irreversible confirmation + audit entry), the three-table snapshot / whole rollback, the refusal-is-not-a-dead-end settle, the settings/options 4-class consolidation onto the ONE op execute body, the per-op wiring gate and the S2 dead-end chain first acceptance. Per-module metafile attribution: `sidepanel.ts` 88,536 → 96,409 (+7,873) / `next-registry/ops.ts` 3,918 → 6,246 (+2,328) / `settings/ops.ts` 17,027 → 19,119 (+2,092) / `cards/askuser.ts` 7,315 → 9,182 (+1,867) / `next-registry/snapshot.ts` NEW 1,601 / `platform/capability-permissions.ts` 2,088 → 2,757 (+669) / `next-registry/pipeline.ts` 2,979 → 3,516 (+537) / `chat-state.ts` 17,385 → 17,647 (+262); Σ +17,229 + glue 49 == 登记增量 +17,278（`SIDEPANEL_GROWTH_BREAKDOWN.v52R2Rows`）。档位 `ceilTo50KB(535,821) = 563,200` 与绝对上限 619,520 **均未变**（裁决① 的档位一次到位）；生效上限 = `min(619,520, floor(535,821 × 1.05) = 562,612) = 562,612`。`dist/content.js` 177,076 B / sha `52a82620…` 与 `dist/pick-layer.js` 33,900 B / sha `5f567d7e…` **逐字节不变**；容差 5% 未动、断言零删减（体积面唯一放宽：未解释字节绝对口径 1,500 → 2,500 B，理由 = 输入模块数 83 → 86 的自然增长 + **新增相对口径 <2% 保留**，见 build.md §6）。Previous round: SDDU V5-2 R1 build (2026-09-22, leaf specs-tree-v5-2-ops-first-batch; TASK-V5-123~137; 编排器裁决① 显式升档): re-registered on the FINAL artifact — 507,315 → **518,543 B** (+11,228 B, +2.21%) — of the 9-op first batch (five ops landed + `shared/op-table.ts` double-sided single source + `next-registry/ops.ts` executor table) + the SW executor / `op-*` type-only channel + `op.authorize` two-stage handshake + the masked `secret` card with the value going straight to the key store + `op.llm-config` credential snapshot rollback. Per-module metafile attribution: `next-registry/ops.ts` +3,918 / `sidepanel.ts` +4,935 / `shared/op-table.ts` +831 / `cards/askuser.ts` +511 / `recommend.ts` +485 / `stream-plaintext.ts` +427 / `chat-state.ts` +185 / `cards/nextstep.ts` +28 / `pipeline.ts` −156 / 归因位移 −9; Σ 模块 +11,155 + 未归因胶水 73 == 登记增量 +11,228（`SIDEPANEL_GROWTH_BREAKDOWN.v52R1Rows`）。**越档位 ⇒ 显式升档**（裁决①）：档位 512,000 → **563,200**（`ceilTo50KB(518,543) = 563,200`），绝对上限 563,200 → **619,520**（`563,200 × 1.10`）；生效上限 = `min(619,520, floor(518,543 × 1.05) = 544,470) = 544,470`；`authorConfirmation` 保持 `pending-author-line`（占位，不伪称已确认）。根因（计划侧偏差，登记不静默）：ADR-V5-011 §1 预算表给 9 op 执行体 3,400 B / `askuser` 扩形 1,800 B，实测**仅 `ops.ts` 一项即 3,918 B**、面板接线（collectors / 握手 / 掩码提交）+4,935 B ⇒ 预算**低估约 2 倍**。`dist/content.js` 177,076 B / sha `52a82620…` 与 `dist/pick-layer.js` 33,900 B / sha `5f567d7e…` **逐字节不变**；容差 5% 未动、断言零删减。Previous round: SDDU V5-1 R1 build (2026-09-22, leaf specs-tree-v5-1-next-registry-pipeline; TASK-V5-101~113): re-registered on the FINAL artifact — 498,521 → **507,315 B** (+8,794 B, +1.76%) — of the NextProvider registry / op pipeline / thin-dispatch round: ① 新增 5 个必需模块 `next-registry/{definition,registry,pipeline,providers,dispatch}.ts`（11,002 B）；② `recommend.ts` 规则表迁入内置 provider（−1,604 B）+ `sidepanel.ts` 集 B 分支收敛为一次查表（−303 B）+ `cards/nextstep.ts` 增 `data-op`（+86 B）；Σ 模块 +8,537 + 未归因胶水 257 == 登记增量 +8,794（`SIDEPANEL_GROWTH_BREAKDOWN.v51R1Rows`）。Previous round: SDDU v4.5-1 review R1 修复轮 (2026-09-21, leaf specs-tree-v45-1-single-write-chronology; review R1 BLOCK-01~04 + I-01~06): re-registered on the FINAL artifact — 493,501 → **498,521 B** (+5,020 B, +1.02%) — of the review-fix round: ① BLOCK-01 迁移容器口径（`l0-receipt-summary` 移出 `RETIRED_CONTAINER_IDS` + `MIGRATED_CONTAINER_IDS` 登记 + 判别规则注释）；② BLOCK-02 拖放高亮写点从退役 `#l0-decision` 迁到真实落点面 `#stream`；③ BLOCK-03 单写判据接 live 载体读数（`stripChannelReading` / `stripCarrierCounts` / `stripChannelProblems` + `firstRun` 卡在⇒行不在）；④ BLOCK-04 `title` 净化面反证（node 用例，零字节）。Per-module metafile attribution: `host-registry.ts` 7,128 → 9,273（+2,145）/ `sidepanel.ts` 81,029 → 83,904（+2,875）；Σ +5,020 + glue 0 == the registered delta（`SIDEPANEL_GROWTH_BREAKDOWN.v45ReviewfixRows`）。Previous round: SDDU v4.5-1 R2 (2026-09-21, leaf specs-tree-v45-1-single-write-chronology; W3 = TASK-V45-107~112): re-registered on the FINAL artifact — 480,896 → **493,501 B** (+12,605 B, +2.62%) — of the **host-zeroing** round（宿主全退役 + 决策壳卡内化 + 视图迁移 + 零宿主注册表 + risk-recovery 触发集 + 设置帮助分区）; previous (W1+W2) 单写轮: 480,026 → **480,896 B** (+870 B, +0.18%) — of the **single-write** round: ① `host-registry.ts` `STRIP_CHANNEL_KINDS` 由「legacy id + kind」重构为 `{channel, kind, emitterSite, carrierCount: 1, reason}` + `evaluateStripChannels()` 单写判据 + `strips` 宿主退役（+1,105 B）；② `stream-plaintext.ts` 新增 `plaintextTitle()` —— 行 `title` 长文案的 fail-closed 净化（NFR-V45-003 / R-REG-901，+167 B）；③ `chat-state.ts` `systemRow` 落 `systemKind`（渲染成 `data-kind`）+ 净化后的 `systemTitle`（+283 B）；④ `cards/system.ts` 渲染 `data-kind` / 行 `title`（+184 B）；⑤ `settings/panel.ts` 站点分区详情（与流内行 `title` 同源，+192 B）；⑥ `sidepanel.ts` **净减** −1,061 B（五条提示带的 DOM 写入口整体退役：`renderSiteHint` / `renderOnboarding` / `renderDiscoveryNotice` / `#notice` 投影 / `#env-guard` 横幅，改由唯一系统行承载 + `CHANNEL_STATE_CARRIERS` 首屏载体规则）。Per-module metafile attribution: Σ 6 modules +870 + glue 0 == the registered delta（`SIDEPANEL_GROWTH_BREAKDOWN.v45W1W2Rows`）。`dist/content.js` 177,076 B / sha `52a82620…` 与 `dist/pick-layer.js` 33,900 B / sha `5f567d7e…` 逐字节不变。Previous round: ' +
    'F 还原度快修轮 (2026-09-20, real-device first-screen fidelity fix: FIX-1~FIX-4; FIX-5 evaluated then deferred): re-registered on the FINAL artifact — 479,021 → **480,026 B** (+1,005 B, +0.21%) — of the authorization-chip direct flow (recommend `act:\'authorize\'` + the ONE `authorizeCurrentSite()` entry), the stale spatial-guidance copy, the toolbar digest (origin · 授权态 · 会话) and the decision-slot kicker semantic convergence. Per-module metafile attribution: `view-model.ts` 21,322 → 22,552 (+1,230) / `sidepanel.ts` 79,750 → 79,865 (+115) / `recommend.ts` 3,993 → 4,192 (+199) / `l2/counts.ts` 2,932 → 2,523 (−409, `l2StatusBarText` tree-shaken out of the production path) / `l0/shell.ts` 5,710 → 5,580 (−130); Σ module +1,005 + glue 0 == the registered delta. `dist/content.js` 177,076 B and `dist/pick-layer.js` 33,900 B byte-identical. Previous round: ' +
    'SDDU v4-4 closeout round (2026-09-20, leaf specs-tree-v4-4-ref-system-nextstep; validate R1 findings F-01 + N-01~N-05): re-registered on the FINAL artifact after the closeout round — 478,897 → **479,021 B** (+124 B, +0.03%) — of the ONE `src` change: `sidepanel.ts#projectRef` now keys the projection uniqueness on `refNum + state` (F-01: the `dom-gone` rescue observation landing used to mint a SECOND card for the same ordinal, `data-ref-num=["1","1"]`; the old `if (!systemText && …)` guard let a readable system row un-suppress the card). The suppressed projection still writes the readable row through the ONE system channel. Per-module metafile attribution: `sidepanel.ts` 79,626 → 79,750 = +124 B, Σ + glue 0 == the registered delta. Two-stage falsification on the real product path (`test/ui/page-input.mjs` ⑯): reverting the uniqueness key ⇒ `data-ref-num=["10","10"]` / 2 cards ⇒ 104 passed / 2 failed; byte-identical restore ⇒ 106 passed / 0 failed. N-01~N-05 are registration/caliber items (+0 bytes): N-01 `switchStreamSession` bypass (zero product callers + wiring gate), N-02 `BUILD_STAMP` non-reproducible bytes (KL-N-08), N-03 binding environmental flake (KL-N-10), N-04 I-04 strict-order independence (mechanism removed, optional gate), N-05 one-click re-anchor button lives in the L1 evidence panel (caliber ruling: FR-CHAT-052 卡内 read as recovery-path-reachable — logged as a known deviation). Previous round: SDDU v4-4 快修轮 (2026-09-20, leaf specs-tree-v4-4-ref-system-nextstep; review R2 findings I-09/I-10/I-11): re-registered on the FINAL artifact after the quick-fix round — 478,163 → **478,897 B** (+734 B, +0.15%) — of the I-09 first-run recommendation entry (the `firstRun` timing now has a REAL production call site at the `firstRun` channel eventization point; per-module metafile attribution: `sidepanel.ts` 78,892 → 79,626 = +734 B, Σ + glue 0 == the registered delta). I-10 (the disclosure arithmetic is now machine-checked by `validateReRegistrationDisclosure`) and I-11 (ADR caliber notes + the stale comment) cost **zero bytes**. Previous round: SDDU v4-4 review 修复轮 (2026-09-19, leaf specs-tree-v4-4-ref-system-nextstep; review R1 findings BLOCK-01~03 + I-01~I-08): re-registered on the FINAL artifact after the review fixes — 465,277 → **478,163 B** (+12,886 B, +2.77%) — of: ① BLOCK-01 recommendation producer wiring (three production timings + the product-path gate assertion); ② BLOCK-02 seven-channel merge (the five remaining strips eventized through the single channel + `firstRunCard` live + the structural host registry); ③ BLOCK-03 the `ref` card fallback submit landing in `handleCardAction`; plus I-01 (dedupe fact identity) / I-02 (session row through the channel) / I-03 (single evidence construction) / I-04 (projection memory cleared per fixture) / I-05 (dead code removed, `startPick` off the public handle) / I-06 (author-confirmation machine criterion) / I-07 (risk-registry provenance fields) / I-08 (`test:v3` chain). Per-module attribution in `SIDEPANEL_GROWTH_BREAKDOWN.rows` (real metafile, input modules 75 → 76 with `host-registry.ts`). Previous round: SDDU v4-4 R2 round (2026-09-19, leaf specs-tree-v4-4-ref-system-nextstep; orchestrator ruling KL-V44-01 ② **显式重锚**): re-registered on the FINAL artifact after the ruling landed — 465,000 → **465,277 B** (+277 B, +0.06%) — of the **automatic merge** of the two remaining transient channels (navigation invalidation + the legacy `#notice` overwrite slot) into the single system-event channel (TASK-803 补完 / FR-CHAT-054 / ADR-V4-036 §5); the ONLY `src` change is `chat-state.ts` (metafile-byte-attributed: 15,838 → 16,115). Same round: `docs/v4-density-baseline.json#riskIncrementRegistry` (the risk-increment / cross-window-drift expectations become a machine-readable, two-directional registry) + the `risk(staleRef)@320` cell re-anchored 6/6/17/203 → 7/7/18/208 (+ `risk.worst` clickables 6→7 / blocks 17→18) after a Chromium re-measure of all three viewports (400/520 zero drift), and a NEW node gate `test/system-merge.test.ts` (10 cases). Thresholds 7/15 · 9/20 · 17/35 and the exemption caliber (`hidden` only) are **verbatim unchanged**. Previous round: SDDU v4-4 closeout round (2026-09-19, leaf specs-tree-v4-4-ref-system-nextstep; **V3-VOL-3 八步带值闭合** at HEAD eb879bb): re-registered the **v4-4 leaf** on the FINAL artifact — 445,300 → 465,000 B (+19,700 B, +4.42%) — of the reference card / single system-event channel / recommendation card inflow plus the panel-side pick-entry retirement. **V3-VOL-3 closure**: `B_final = 465,000` (measured by `stat -c %s dist/sidepanel.js`), tier `ceilTo50KB(B_final) = 512,000 B`, `absoluteCeilingBytes = 512,000 × 1.10 = 563,200 B`; judgement = `min(563,200, floor(465,000 × 1.05) = 488,250) = 488,250 B`; `PENDING_ABSOLUTE_CAP` 置 `resolved:true` 三值齐备（`newBaselineBytes` / `absoluteCeilingBytes` / `resolvedOn`）。authorConfirmation 见 `docs/v4-supersession-ledger.json#v3Vol3Closeout`。Previous round: SDDU v4-3 review fix round (2026-09-19, leaf specs-tree-v4-3-ask-auth-inflow; review R1 findings BLOCK-01~04 + I-01~I-08): re-registered the **v4-3 leaf** on the FINAL artifact after the review fixes (auth `cancelled` terminal rendering + turn-end vs 60 s timeout split + stream-derived L1 decided-rounds + audit-exit deps + label-factory wiring + choice mutual disclosure + `#ask*` id de-duplication + ledger leaf-scope rule) — 440,698 → 445,300 B; the previous 440,698 B stays verbatim in SIDEPANEL_BASELINE_BYTES_TIMELINE and in the v4-3 registration reason. Previous round: SDDU v4-2 closeout round (2026-09-19, leaf specs-tree-v4-2-chat-stream-model; validate R1 findings F-01 / F-02 / F-03 + N-02): re-registered the **v4-2 leaf** on the FINAL artifact after the closeout fixes (deep freeze of payload arrays / stream-merge strict monotonicity / sanitizeLabel scan-then-truncate / hasSegment wiring) — 425,094 → 426,487 B; the previous 425,094 B (review fix round) and 425,442 B (build round) stay verbatim in SIDEPANEL_BASELINE_BYTES_TIMELINE and in the v4-2 registration reasons. Previous round: SDDU v4-2 review fix round (2026-09-19, leaf specs-tree-v4-2-chat-stream-model; SDDU review→build loop): re-registered the **v4-2 round** on the FINAL artifact after the review fixes (I-06 stream-merge seq-idempotent dedupe / I-07 empty-state single projection source / I-08 removal of the unreachable `patchAiCard` branch / I-09 RP-V4-09 function name / I-12 dead CSS + check copy) — 385,319 → 425,094 B; the pre-fix published 425,442 B is retained verbatim in SIDEPANEL_BASELINE_BYTES_TIMELINE, and the pre-fix per-module build-round attribution (Σ 39,661 + glue 462 = 40,123) is retained in the v4-2 registration reason. Previous round: SDDU v4-2 build round (2026-09-19, leaf specs-tree-v4-2-chat-stream-model): re-registered on the final artifact of the append-only stream event model + the 12 card types (stream-model / stream-digest / stream-render / cards/*) + the zero-plaintext digest + the V4-2 TASK-613 card-budget tightening. Previous round: SDDU v4-1 build round (2026-09-19, leaf specs-tree-v4-1-zone-shell-density): re-registered on the final artifact of the three-zone skeleton (header#region-toolbar / main#region-stream > ol#stream[role=log] / footer#region-statusbar) — the read-only site summary + four view entries + three-state theme in the toolbar, the risk chips + `#risk-detail` in the status bar, the single-source density exemption subtree (`density-scope.ts`), and the `#log`→`#stream` selector migration; every assertion was re-anchored, none deleted. Previous round: SDDU defect-fix round R3 (2026-09-17, post-closeout; author real-device confirmation at HEAD 131f546): re-registered on the final artifact of the『引用重锚救援』round — a read-only text-candidate probe for a selector-broken reference (SW-injected, same normalization as the frozen text digest), the rescue payload attached to the `dom-gone` verdict as metadata only, and the user-confirmed one-click re-anchor that mints a NEW reference through the same ingestion pipeline while the old card stays untouched (append-only). The judge verdict set is unchanged (valid/invalid/unknown; fail-closed not relaxed). Previous round: SDDU defect-fix round R2 (2026-09-17, post-closeout; author adjudication「修：退避+稳态显示」at HEAD 6d9ed5d): re-registered on the final artifact of the declaration-probe exponential backoff (15s→5min cap, per-origin, conclusion-change reset) plus the steady「低频自动复查中」risk-row variant that removes the 15s flicker. Previous round: SDDU defect-fix round R1 (2026-09-17, post-closeout; author real-device report at HEAD 870cb6e): re-registered on the final artifact of the「无有效站点声明时拾取引用出生即死」fix (SW declarationStatus single source + panel ingestion completes the capture fact + D4 state-consistency caliber, plus the reference-round / background-ask supersession fix). Previous rounds: SDDU v3-3 build round (2026-09-16, leaf specs-tree-v3-3-l2-on-demand-views): re-measured on the final artifact of the L2 on-demand views (view replacement + the four views +真值计数 + the tree-ownership migration). Previous rounds: SDDU v3-2 build round + fix round + closeout round (2026-09-16, leaf specs-tree-v3-2-l1-disclosure-refs): re-measured on the final artifact of the L1 layer (eight in-place content classes + the fail-closed five-dimension reference judge + the receipt triple + the local-tree slice). The fix round executed orchestrator ruling V3-VOL-1 (baseline explicitly re-registered at 327,679 B, ceiling = the plain formula, self-imposed SIDEPANEL_CEILING_CAP hard cap REVOKED and demoted to a record-only field). The CLOSEOUT round dispositions validate R1 findings N-04/N-05/N-07/N-08 in `src/ui/sidepanel/**` and re-registers the measured 328,476 B (+797 B) as a registry-fidelity round. Previous registered baselines: 327,679 B (v3-2 fix round) / 295,225 B (v3-1 I6 round; also the reference tree of SIDEPANEL_GROWTH_BREAKDOWN) / 291,523 B (whose final artifact measured 294,874 B — the discrepancy the I6 round fixed) / 266,500 B (tighten round 2026-09-14, ceiling 279,825 B) / 1,159,856 B (R2, ceiling 1,217,848 B) / R2 closeout 1,162,942 B / V2-4 1,132,748 B / V2-3 1,110,744 B / V2-2 1,085,389 B / v1 1,068,165 B. Every previous value is retained in SIDEPANEL_BASELINE_BYTES_HISTORY / SIDEPANEL_BASELINE_BYTES_TIMELINE / SIDEPANEL_RE_REGISTRATIONS.',
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
  finalArtifactBytes: 563_145,
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
    '**新增义务（硬约束）**：方案 F 重构（聊天流统一承载）落地收口时，必须**重新定 sidepanel 体积基线并设绝对值上限**。' +
    '〖V4-4 R2〗最新相邻对 = v4-4 + v4-4-r2（465,000 → 465,277 B，+0.06%），远低于 15% 线；**最差对**仍是 v3-1 + v3-2（+22.96%）⇒ 告警按「最差对」口径保留（守卫只增不减）。',
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
    'v4-4 closeout 轮 465,000 B（ceiling 488,250 B；V3-VOL-3 八步带值闭合）；' +
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
    '**2026-09-20 F 还原度快修轮显式提升重登记：479,021 → 480,026 B（+1,005 B，+0.21%）**：全部来自四处实现层语义/文案修复' +
    '（FIX-1 授权 chip 直达授权流 / FIX-2 过时空间指引文案 / FIX-3 工具栏摘要 digest / FIX-4 决策槽 kicker），' +
    '逐模块可归因（真实 dist/build-meta.json bytesInOutput，见 SIDEPANEL_GROWTH_BREAKDOWN.fFidelityFixRows）：' +
    'view-model.ts +1,230 / sidepanel.ts +115 / recommend.ts +199 / l2/counts.ts −409（树摇）/ l0/shell.ts −130，Σ +1,005 + 未归因胶水 0 == +1,005。' +
    '`dist/content.js` 177,076 B 与 `dist/pick-layer.js` 33,900 B 逐字节不变；ceiling 由公式抬高 floor(480,026 × 1.05) = **504,027 B**；' +
    '**V3-VOL-3 三值**：`newBaselineBytes` 同源前移（480,026），档位 512,000 与绝对上限 563,200 未变，resolvedOn 保持 2026-09-19。' +
    '**2026-09-19 v4-4 R2 裁决落地轮显式提升重登记：465,000 → 465,277 B（+277 B，+0.06%）**：' +
    '全部来自**一处** `src` 改动 —— `chat-state.ts` 的自动归并接线（`reduce()` 透传归约前状态 + `streamBranch` 的 `case \'state\'`/`case \'notice\'`），' +
    '真实 metafile 逐模块机核（`chat-state.ts` 15,838 → 16,115 = +277 B，未归因胶水 0；见 `SIDEPANEL_GROWTH_BREAKDOWN.v44R2Rows`）。' +
    '裁决出处 = 编排器 KL-V44-01 选②（**显式重锚**：启用 TASK-803 的自动归并 + 按五要素重锚 `risk(staleRef)@320` 登记格，**不新增豁免类别**）。' +
    '`dist/content.js` 177,076 B / `dist/pick-layer.js` 33,900 B **逐字节不变**；manifest / `KIND_SET` / 判定链 / SW 零 diff。' +
    'ceiling 由公式抬高 floor(465,277 × 1.05) = **488,540 B**（容差 5% 未动、cap 仍 record-only、`targetBudgetBytes`/`targetMet` 仍为 null）。' +
    '**V3-VOL-3 三值**：`newBaselineBytes` 同源前移（465,277）；档位 512,000 与绝对上限 563,200 **未变**；`resolvedOn` 2026-09-19 未变。' +
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
  /**
   * 〖V4.5-1 R3（TASK-V45-118 / ADR-V45-011 §2）〗本轮重登记的**方向**，显式声明并由
   * `reRegistrationDirectionProblems()` 与 Δ **双向**机核：
   *   · `raised`    ⇒ Δ 必须 > 0；
   *   · `lowered`   ⇒ Δ 必须 < 0（净减也强制登记，理由是「有意的结构净减」）；
   *   · `unchanged` ⇒ Δ 必须 == 0（零字节轮也要留痕，且不得伪装成提升/净减）。
   * 任一不成立（含非法值）即 FAIL。**声明不是装饰**：真实注册表每一轮都必须声明它
   * （`reRegistrationDirectionCoverageProblems()` 逐条机核），反证见
   * `test/size-ruling-vol3.test.ts`（错误声明必须判红）。
   */
  readonly direction?: 'raised' | 'lowered' | 'unchanged';
}

/** 合法方向值（闭集）——非法值即 FAIL（不得用别的词回避判定）。 */
export const RE_REGISTRATION_DIRECTIONS = Object.freeze(['raised', 'lowered', 'unchanged'] as const);

/** 一条重登记的**方向声明**与 Δ 的一致性判据（纯函数；唯一实现）。 */
export function reRegistrationDirectionProblems(
  entries: readonly Pick<SizeReRegistration, 'id' | 'baselineBeforeBytes' | 'baselineAfterBytes' | 'direction'>[],
): string[] {
  const problems: string[] = [];
  for (const e of entries) {
    const delta = e.baselineAfterBytes - e.baselineBeforeBytes;
    const dir = e.direction;
    if (dir === undefined) {
      problems.push(`${e.id}: 缺少 direction 声明（Δ=${delta}）—— 每一轮重登记都必须显式声明方向`);
      continue;
    }
    if (!(RE_REGISTRATION_DIRECTIONS as readonly string[]).includes(dir)) {
      problems.push(`${e.id}: direction=${String(dir)} 非法（合法值：${RE_REGISTRATION_DIRECTIONS.join(' / ')}）`);
      continue;
    }
    if (dir === 'raised' && !(delta > 0)) problems.push(`${e.id}: direction='raised' 但 Δ=${delta} ≤ 0（声明与算术矛盾）`);
    if (dir === 'lowered' && !(delta < 0)) problems.push(`${e.id}: direction='lowered' 但 Δ=${delta} ≥ 0（声明与算术矛盾）`);
    if (dir === 'unchanged' && delta !== 0) problems.push(`${e.id}: direction='unchanged' 但 Δ=${delta} ≠ 0（声明与算术矛盾）`);
  }
  return problems;
}

/** 覆盖判据：真实注册表（含终轮）**逐条**都必须声明方向。 */
export function reRegistrationDirectionCoverageProblems(
  entries: readonly Pick<SizeReRegistration, 'id' | 'direction'>[],
): string[] {
  return entries.filter((e) => e.direction === undefined).map((e) => `${e.id}: 未声明 direction（覆盖不全）`);
}

/**
 * 〖V4.5-1 R3（2026-09-21，W4+W5 = TASK-V45-113~119）〗**终轮登记**（Δ = **0**）。
 *
 * W4+W5 是「门禁重锚 + journey 取代 + 密度重算 + 体积同源 + 收口」轮：对
 * `dist/sidepanel.js` **没有任何 byte 变化**（真实 esbuild metafile 与 W3 轮逐模块相等
 * ⇒ Σ Δ = 0 ∧ 未归因胶水 0 == 登记增量 0；该等式由
 * `size-growth-evidence.test.ts` 对真实 metafile 实跑）。R3 唯一的 `src` 改动是
 * `src/ui/options/index.html` 的**纯文案行**（FIX-2 deferred 关闭），它**不进**
 * `sidepanel.js` ⇒ 体积基线不动。
 *
 * 零字节轮也**必须**留痕（FR-V45-090/091：任何 byte 变化 ⇒ 强制登记；而「没有变化」
 * 本身也是必须显式声明的事实，否则「登记滞后」与「真的没变」无法区分）；方向因此是
 * **`unchanged`**（新增的第三种合法值，由反向证明驱动：写成 raised/lowered 即红）。
 */
export const SIDEPANEL_W4W5_FINAL_ROUND: SizeReRegistration = {
  id: 'v45-1-w4w5',
  direction: 'unchanged',
  roundKind: 'registry-fidelity-round',
  feature: 'specs-tree-v45-1-single-write-chronology',
  date: '2026-09-21',
  source: 'packages/web-cli-plugin/dist/sidepanel.js',
  buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
  measuredBy: 'SDDU v4.5-1 R3 (2026-09-21, leaf specs-tree-v45-1-single-write-chronology; W4+W5 = TASK-V45-113~119)',
  reason:
    '终轮（W4+W5）**零字节**重登记：R3 只改门禁 / 台账 / 文档（journey 保护段第二次显式取代、binding 保段登记、' +
    'density 31 格重算 + v45Ledger、options 纯文案解冻、体积三值同源复核），`src/**` 中唯一改动是 ' +
    '`src/ui/options/index.html` 的纯文案行（不进 `sidepanel.js`）⇒ 真实 metafile 与 W3 轮**逐模块相等**：' +
    'Σ 逐模块 Δ = 0 + 未归因胶水 0 == 登记增量 0。方向 = `unchanged`（不伪装成提升，也不伪装成净减）。',
  baselineBeforeBytes: 493_501,
  baselineAfterBytes: 493_501,
  ceilingBeforeBytes: 518_176,
  ceilingAfterBytes: 518_176,
  assertionNonRemovalEntries: ['V45W2-E-07', 'V45W2-E-13', 'V45W2-E-14'],
  historyRetainedBytes: [493_501],
  ceilingUncappedFormulaBytes: 518_176,
};

/**
 * 〖V4.5-1 R3（TASK-V45-118 / ADR-V45-011 §6）〗**档位不下移硬边界**（算术，前置）：
 * `ceilTo50KB(b) = 512_000 ⟺ 460_801 ≤ b ≤ 512_000`。净减超过
 * `480_026 − 460_801 = 19_225 B`（相对 V3-VOL-3 档位起点）即越界 ⇒ **停下上报编排器**。
 * 由 `test/size-ruling-vol3.test.ts` 的闸门断言与反证逐条驱动。
 *
 * 〖V5-2 R1（2026-09-22，编排器裁决① 显式升档）〗档位**上移**一档 ⇒ 边界随档位同源前移：
 * `ceilTo50KB(b) = 563_200 ⟺ 512_001 ≤ b ≤ 563_200`。**硬边界方向不变**（只挡下移、
 * 不挡上移）：净减掉出一档仍须停下上报。`SIDEPANEL_TIER_BYTES` 是现行档位，
 * `SIDEPANEL_TIER_FLOOR_BYTES` 是它的算术下界，两者由门禁逐条复算。
 */
export const SIDEPANEL_TIER_FLOOR_BYTES = 512_001;

export const SIDEPANEL_RE_REGISTRATIONS: readonly SizeReRegistration[] = [
  {
    id: 'v3-1',
    direction: 'raised',
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
    direction: 'raised',
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
    direction: 'raised',
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
    direction: 'raised',
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
    direction: 'raised',
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
    direction: 'raised',
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
    direction: 'raised',
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
    direction: 'raised',
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
    direction: 'raised',
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
    direction: 'raised',
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
    direction: 'raised',
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
    direction: 'raised',
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
    direction: 'raised',
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
  {
    id: 'v4-3',
    direction: 'raised',
    roundKind: 'feature-round',
    feature: 'specs-tree-v4-3-ask-auth-inflow',
    date: '2026-09-19',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy: 'SDDU v4-3 build round (leaf specs-tree-v4-3-ask-auth-inflow)',
    reason:
      '**显式提升重登记（功能轮）：426,487 → 440,698 B（+14,211 B，+3.33%）**。全部为 ask/auth 流内化的**必需增重**，逐模块可归因（真实 dist/build-meta.json bytesInOutput）：' +
      '三个新必需模块 stream-plaintext 1,961 / cards/askuser 5,595 / cards/auth 5,944（+13,500）；既有模块接线 sidepanel +2,410 / chat-state +2,840 / stream-model +2,746 / l0/shell +1,872 / view-model +309；cards/index −5,819（提取）。' +
      '**断言零删减**：新增 test/ask-auth-inflow.test.ts（12 用例）与 test/ui/ask-auth-inflow.mjs（49 断言）；content.js 177,076 / pick-layer.js 33,900 逐字节不变；ask-bridge.ts / KIND_SET / SW / manifest 零 diff。' +
      '容差 5% 未动；ceiling = floor(440,698 × 1.05) = **462,732 B**（cap 仍 record-only）。⚠️ 相邻两轮 v4-2 + v4-3 = +3.26%（<15% 线，仍如实登记）。PENDING_ABSOLUTE_CAP 保持 resolved:false。',
    baselineBeforeBytes: 426_487,
    baselineAfterBytes: 440_698,
    ceilingBeforeBytes: 447_811,
    ceilingAfterBytes: 462_732,
    assertionNonRemovalEntries: ['V43-SVOL-1'],
    historyRetainedBytes: [426_487, 425_094],
    ceilingUncappedFormulaBytes: 462_732,
  },
  {
    id: 'v4-3-reviewfix',
    direction: 'raised',
    roundKind: 'registry-fidelity-round',
    feature: 'specs-tree-v4-3-ask-auth-inflow',
    date: '2026-09-19',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy: 'SDDU v4-3 review fix round (leaf specs-tree-v4-3-ask-auth-inflow, review R1: BLOCK-01~04 + I-01~I-08)',
    reason:
      '**显式提升重登记（同一叶的审查修复轮）：440,698 → 445,300 B（+4,602 B，+1.04%）**。全部为评审阻塞/改进项的落地字节，逐模块可归因（真实 dist/build-meta.json bytesInOutput，见 SIDEPANEL_GROWTH_BREAKDOWN.v43ReviewfixRows）：' +
      'BLOCK-01（auth 卡 `cancelled` 终态渲染「已取消」+ `data-decision="cancelled"`，`cards/auth.ts`）/ BLOCK-02（回合结束与 60 s 超时分离：`stream-model` 的 `closeOpenAsks` 过滤 + `chat-state` 的 `settleTurnEnd`）/ BLOCK-03（L1「已决策历史」改由 `project()` 终态 ask 卡派生）/ BLOCK-04（`patchAuthCard` 透传真实 deps ⇒ 审计入口可达）/ I-01（`label()` 工厂接为生产路径 + 删除第二份白名单）/ I-02（`askFlowView` 接为 composer 真实消费点、删除失真 `turnStuck`）/ I-03（choice 卡互斥披露：展开兜底即收起选项行）/ I-04（`#ask*` legacy id 去重）/ I-06（error 收尾按 `aborted` 结算）/ I-07（`terminalDecision` fail-closed + `clearAsk` 按 kind 结算）/ I-05（叶段 scope 去自指）。' +
      '**断言只增不减**：new test/ask-auth-inflow.test.ts 断言（假批准三路径 / 真超时 / error 结算 / I-07 fail-closed）+ test/ui/ask-auth-inflow.mjs 新增段（假批准回归 / 审计入口真实跳转 / 展开态预算 + in-gate 反证）+ test/ui/l1.mjs 答案文案断言。' +
      'content.js 177,076 / pick-layer.js 33,900 逐字节不变；ask-bridge.ts / KIND_SET / SW / manifest 零 diff。' +
      '容差 5% 未动；ceiling = floor(445,300 × 1.05) = **467,565 B**（cap 仍 record-only）。⚠️ 相邻两轮 v4-3 + v4-3-reviewfix = +0.97%（<15% 线，仍如实登记）。PENDING_ABSOLUTE_CAP 保持 resolved:false。',
    baselineBeforeBytes: 440_698,
    baselineAfterBytes: 445_300,
    ceilingBeforeBytes: 462_732,
    ceilingAfterBytes: 467_565,
    assertionNonRemovalEntries: ['V43RV-SVOL-1'],
    historyRetainedBytes: [440_698, 426_487, 425_094],
    ceilingUncappedFormulaBytes: 467_565,
  },
  {
    id: 'v4-4',
    direction: 'raised',
    roundKind: 'feature-round',
    feature: 'specs-tree-v4-4-ref-system-nextstep',
    date: '2026-09-19',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy: 'SDDU build/closeout round (leaf specs-tree-v4-4-ref-system-nextstep, **V3-VOL-3 八步带值闭合**)',
    reason:
      '**显式提升重登记（功能轮 + 父级收口锚）：445,300 → 465,000 B（+19,700 B，+4.42%）**。' +
      '本叶把三类过程全部涌入流内并退役面板侧拾取入口：引用卡（`cards/ref.ts` + `l1/ref-store.ts#cardProjection` 的只追加投影接口）/ 系统事件单通道（`system-events.ts` 的去重窗口 + 速率上限 + `dropped` 计数归档，`chat-state.ts` 的 6+ 通道归并）/ 推荐卡（`recommend.ts` 真值白名单 + `cards/nextstep.ts` 的 chips 即指令 + `requestTurn` 单一生产入口）；面板侧 `#l0-pick` 退役（`requestPick()` 单一入口 + 设置视图指引），过渡宿主清零（`data-transitional-host` × 0）。' +
      '**断言只增不减**：新增 node 门禁 `test/recommendation-sources.test.ts`（12 用例）与 `test/ref-pick-wiring.test.ts`（7 用例）+ Chromium 门禁 `test/ui/recommendation.mjs`；`test/ui/l0.mjs` / `density.mjs` / `l1.mjs` / `page-input.mjs` / `zero-injection.mjs` 全部**等价重锚**（同编号、同语义，只换锚点）。' +
      'content.js 177,076 / pick-layer.js 33,900 逐字节不变；manifest / `KIND_SET` / 判定链 / SW 零 diff。' +
      '容差 5% 未动；`SIDEPANEL_CEILING = floor(465,000 × 1.05) = **488,250 B**`；**判定改为 `min(绝对上限 563,200, 488,250) = 488,250`**（裁决 V3-VOL-3 ⑥）。' +
      '相邻两轮 v4-3-reviewfix + v4-4 = +4.42%（<15% 线，仍如实登记）。' +
      '**V3-VOL-3 闭合**：`PENDING_ABSOLUTE_CAP` 置 `resolved:true`（`B_final` 465,000 / 档位 512,000 / 绝对上限 563,200 / resolvedOn 2026-09-19），`evaluatePendingAbsoluteCap()` 通过；作者确认见 `docs/v4-supersession-ledger.json#v3Vol3Closeout.authorConfirmation`。',
    baselineBeforeBytes: 445_300,
    baselineAfterBytes: 465_000,
    ceilingBeforeBytes: 467_565,
    ceilingAfterBytes: 488_250,
    assertionNonRemovalEntries: ['V44-SVOL-1'],
    historyRetainedBytes: [445_300, 440_698, 426_487, 425_094],
    ceilingUncappedFormulaBytes: 488_250,
  },
  {
    // 〖V4-4 R2（2026-09-19，编排器裁决 KL-V44-01 ②：**显式重锚**）〗
    // 同一叶的**裁决落地轮**：启用「导航失效 / `#notice` 自动归并」系统事件行（TASK-803 补完）
    // = 唯一一处 `src` 改动（`chat-state.ts`），逐模块可归因（真实 metafile：
    // chat-state.ts 15,838 → 16,115 = **+277 B**，未归因胶水 0）。
    id: 'v4-4-r2',
    direction: 'raised',
    roundKind: 'registry-fidelity-round',
    feature: 'specs-tree-v4-4-ref-system-nextstep',
    date: '2026-09-19',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy: 'SDDU build round R2 (leaf specs-tree-v4-4-ref-system-nextstep, KL-V44-01 裁决落地)',
    reason:
      '**显式提升重登记（同一叶的裁决落地轮）：465,000 → 465,277 B（+277 B，+0.06%）**。' +
      '全部来自**一处** `src` 改动：`chat-state.ts` 的自动归并接线 —— ① `reduce()` 把**归约前状态**透传给 `streamBranch`（导航失效的 false→true 跳变只能在新旧两态之间判定）；' +
      '② `streamBranch` 新增 `case \'state\'`（跳变 ⇒ 一条 `nav` 系统行）与 `case \'notice\'`（覆盖槽 ⇒ 一条 `notice` 系统行），两条都经 `systemRow()` 的**唯一通道**（净化 + 去重窗口 + 速率上限 + `dropped` 计数不可绕过）。' +
      '**这是一次裁决落地，不是功能扩张**：TASK-803 的归并矩阵要求这两条通道自动归并（FR-CHAT-054），R1 曾按红线**显式登记偏差**（KL-V44-01），R2 按编排器裁决选②落地。' +
      '**门禁只增不减**：新增 node 门禁 `test/system-merge.test.ts`（10 用例：跳变恰一条 / 非跳变不重复 / 窗口外「持续：」/ 窗口内去重 / `#notice` 双通道同事实 / 速率上限 `dropped` / 净化 fail-closed / 通道闭集）；' +
      '`test/ui/density.mjs` 新增 `riskIncrementRegistry` 逐格**双向精确期望**（`docs/v4-density-baseline.json#riskIncrementRegistry`）+ 登记项非空转 + `coverage` 与夹具矩阵逐项一致三条判据，**无任何断言被删除或放宽**。' +
      'content.js 177,076 / pick-layer.js 33,900 **逐字节不变**；manifest / `KIND_SET` / 判定链 / SW 零 diff（`git diff --stat` 可核）。' +
      '容差 5% 未动；`SIDEPANEL_CEILING = floor(465,277 × 1.05) = **488,540 B**`（由公式抬高；判定仍是 `min(绝对上限 563,200, 488,540) = 488,540`，裁决 V3-VOL-3 ⑥）。' +
      '相邻两轮 v4-4 + v4-4-r2 = +0.06%（<15% 线，仍如实登记）。' +
      '**V3-VOL-3 三值**：`newBaselineBytes` 随现行基线同源前移（465,277，走「作者确认占位」规则重登）；**档位 `ceilTo50KB(465,277) = 512,000` 与绝对上限 563,200 均未变**；`resolvedOn` 保持 2026-09-19；`evaluatePendingAbsoluteCap()` 通过。',
    baselineBeforeBytes: 465_000,
    baselineAfterBytes: 465_277,
    ceilingBeforeBytes: 488_250,
    ceilingAfterBytes: 488_540,
    assertionNonRemovalEntries: ['V44-R2-SVOL-1'],
    historyRetainedBytes: [465_000, 445_300, 440_698, 426_487, 425_094],
    ceilingUncappedFormulaBytes: 488_540,
  },
  {
    // V4-4 review 修复轮（R1：3 阻塞 / 8 改进，全部处置后按**最终实测产物**重登记）
    id: 'v4-4-reviewfix',
    direction: 'raised',
    roundKind: 'registry-fidelity-round',
    feature: 'specs-tree-v4-4-ref-system-nextstep',
    date: '2026-09-19',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy: 'SDDU build round (leaf specs-tree-v4-4-ref-system-nextstep, review R1 BLOCK-01~03 + I-01~I-08 修复轮)',
    reason:
      '**显式提升重登记（同一叶的审查修复轮）：465,277 → 478,163 B（+12,886 B，+2.77%）**。全部为评审阻塞/改进项的落地字节，逐模块可归因（真实 dist/build-meta.json bytesInOutput，见 SIDEPANEL_GROWTH_BREAKDOWN.rows）：' +
      '① **BLOCK-01 推荐链路接线**：生产者三处真实时机（拾取后 / 引用失效后 / 空闲=回合结束无 open ask）在 sidepanel 渲染路径调用 + 产品内 nextstep 卡可达（Chromium 门禁不经 seam 断言 + 断开接线两段证伪）；' +
      '② **BLOCK-02 七通道归并 + 宿主结构性退役**：剩余 5 通道（`#env-guard`/`#site-hint`/`#onboarding`/`#discovery-notice`/`#send-reason`）经 `systemRow()` 事件化、`firstRunCard()` 接线（首装卡真实渲染）、新增 `host-registry.ts` 结构判据（登记集合 == 实存宿主集合 + `[data-transitional-host]` 计数 0 + 已退役容器 DOM 零残留）；' +
      '③ **BLOCK-03 死控件落地**：失效卡「改用描述」的 `describe-submit` 在 `handleCardAction` 落地（结算唯一 text 兜底卡 + 点击即真实变化断言 + 两段证伪）；' +
      '④ **I-01~I-08**：去重 key 增加事实标识（N 卡 ⇒ N 行）/ 会话分隔行走唯一通道 + 死常量接线 / 证据层单一构造（`refEvidenceRows`）/ `projectedRefState` 按夹具清空 / 死代码清理（`hasChips`/`systemEventRows`/`nextstepCards` + `startPick` 退出公共句柄）/ `authorConfirmation` 机器判据 / `riskIncrementRegistry` 溯源字段 / `test:v3` 纳入三条新门禁。' +
      '**门禁只增不减**：新增断言全部落在既有门禁内（`test/ui/recommendation.mjs` / `test/ui/l0.mjs` / `test/system-merge.test.ts` / `test/ref-pick-wiring.test.ts` / `test/recommendation-sources.test.ts` / `test/size-ruling-vol3.test.ts` / `test/density-thresholds.test.ts`），**无任何断言被删除或放宽**。' +
      'content.js 177,076 / pick-layer.js 33,900 **逐字节不变**；manifest / `KIND_SET` / 判定链 / SW 零 diff。' +
      '容差 5% 未动；`SIDEPANEL_CEILING = floor(478,163 × 1.05) = **502,071 B**`（由公式抬高；判定仍是 `min(绝对上限 563,200, 502,071) = 502,071`，裁决 V3-VOL-3 ⑥）。' +
      '相邻两轮 v4-4-r2 + v4-4-reviewfix = +2.77%（<15% 线，仍如实登记）。' +
      '**V3-VOL-3 三值**：`newBaselineBytes` 随现行基线同源前移（478,163，走「作者确认占位」规则重登）；**档位 `ceilTo50KB(478,163) = 512,000` 与绝对上限 563,200 均未变**；`resolvedOn` 保持 2026-09-19；`evaluatePendingAbsoluteCap()` 通过。',
    baselineBeforeBytes: 465_277,
    baselineAfterBytes: 478_163,
    ceilingBeforeBytes: 488_540,
    ceilingAfterBytes: 502_071,
    assertionNonRemovalEntries: ['V44-RF-SVOL-1'],
    historyRetainedBytes: [465_277, 465_000, 445_300, 440_698, 426_487],
    ceilingUncappedFormulaBytes: 502_071,
  },
  {
    // V4-4 快修轮（review R2 的 I-09/I-10/I-11 处置；唯一 `src` 改动 = I-09 首装推荐接线）
    id: 'v4-4-i09fix',
    direction: 'raised',
    roundKind: 'registry-fidelity-round',
    feature: 'specs-tree-v4-4-ref-system-nextstep',
    date: '2026-09-20',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy: 'SDDU build round (leaf specs-tree-v4-4-ref-system-nextstep, review R2 I-09~I-11 快修轮)',
    reason:
      '**显式提升重登记（同一叶的快修轮）：478,163 → 478,897 B（+734 B，+0.15%）**。全部来自**一处** `src` 改动（真实 `dist/build-meta.json` bytesInOutput，见 `SIDEPANEL_GROWTH_BREAKDOWN.v44I09fixRows`，Σ 734 + glue 0 == 登记增量）：' +
      '**I-09「首装」推荐时机真实接线** —— `maybeRecommend(\'firstRun\')` 此前**无生产调用点**（`R-ONBOARDING` 的推荐卡只在测试 seam 里可达；注释与 `build.md` 却称该时机已接）。修法：新增 `maybeRecommendFirstRunEntry()`，在 `firstRun` 通道的**事件化点**（`eventizeChannels` 尾部）与 `refreshLlmStatus()` 落地后各求值一次；判定要求两条事实均已到位（`llmLoaded`（`configured` 权威）+ 已应用过一次 `state` 回包（`authorized` / `activeOrigin` 权威）），避免半加载面板给已配置用户推荐「完成首次设置」；入口按「每次面板生命至多消费一次」计（事件，不是重试循环），生产者自身的 `pending` / 间隔 / 无候选门控仍是最后一道。' +
      '**I-09 接线证据（Chromium，不经 seam）**：`test/ui/recommendation.mjs` ⑬ 在 `authorizeFixture` **之前**（真·首装态：无模型配置 / 无绑定站点 / 无会话）断言 `#stream [data-msg-type="nextstep"][data-nextstep-rule="onboarding"]` 真实出现 + 卡片带可点 chip；判定**不调用** `window.__v3.testing.*`（`lastRecommend()` 仅作诊断输出，`trigger===\'firstRun\'` 证明是生产入口而非 seam）。两段证伪实跑：把 `maybeRecommend(\'firstRun\')` 注入失效 ⇒ ⑬ FAIL ⇒ 逐字节还原 ⇒ PASS。' +
      '**I-10 披露算术机核**：`validateReRegistrationDisclosure` 新增 canonical 披露元组（`before → after B（+Δ B，+P%）`）的**算术判据** —— 元组的前后值 / Δ / 百分比必须与登记字段逐项相等（Δ = after − before，P = round(Δ/before×100, 2)）；`v4-4-reviewfix` 的 reason/`META.measuredBy` 里「+12,683 B / +2.73%」订正为「+12,886 B / +2.77%」，同轮 glue 注释「12,723 − 12,683」订正为「12,886 − 12,846」（Σ 逐模块 12,846 + glue 40 = 12,886）。**I-11 ADR 口径订正注**（`plan.md` 修订记录，ADR 正文零改写）+ `sidepanel.ts` 陈旧注释（原称 rows「在 render() 期间收集」）订正 —— 两者**零字节**。' +
      '**门禁只增不减**：`test/ui/recommendation.mjs` 新增 ⑬（5 条断言）；`test/size-ruling-vol3.test.ts` 新增披露算术用例（真实登记册零违规 + 伪造元组 ⇒ 违规的反证 + `META.measuredBy` 与末条登记同源的机核）；`test/size-growth-evidence.test.ts` 新增第 11 组 round rows 判据。**无任何断言被删除或放宽。**' +
      'content.js 177,076 / pick-layer.js 33,900 **逐字节不变**；manifest / `KIND_SET` / 判定链 / SW 零 diff；journey / binding 保护段零 diff。' +
      '容差 5% 未动；`SIDEPANEL_CEILING = floor(478,897 × 1.05) = **502,841 B**`（由公式抬高；判定仍是 `min(绝对上限 563,200, 502,841) = 502,841`，裁决 V3-VOL-3 ⑥）。' +
      '相邻两轮 v4-4-reviewfix + v4-4-i09fix = +0.15%（<15% 线，仍如实登记）。' +
      '**V3-VOL-3 三值**：`newBaselineBytes` 随现行基线同源前移（478,897，走「作者确认占位」规则重登）；**档位 `ceilTo50KB(478,897) = 512,000` 与绝对上限 563,200 均未变**；`resolvedOn` 保持 2026-09-19；`evaluatePendingAbsoluteCap()` 通过。',
    baselineBeforeBytes: 478_163,
    baselineAfterBytes: 478_897,
    ceilingBeforeBytes: 502_071,
    ceilingAfterBytes: 502_841,
    assertionNonRemovalEntries: ['V44-I09FIX-SVOL-1'],
    historyRetainedBytes: [478_163, 476_834, 465_277, 465_000, 445_300],
    ceilingUncappedFormulaBytes: 502_841,
  },
  {
    // V4-4 收口轮（validate R1 的 F-01 修复 + N-01~N-05 登记；唯一 `src` 改动 = `projectRef` 唯一性键）
    id: 'v4-4-closeout',
    direction: 'raised',
    roundKind: 'registry-fidelity-round',
    feature: 'specs-tree-v4-4-ref-system-nextstep',
    date: '2026-09-20',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy: 'SDDU build closeout round (leaf specs-tree-v4-4-ref-system-nextstep, validate R1 F-01 + N-01~N-05)',
    reason:
      '**显式提升重登记（同一叶的收口轮）：478,897 → 479,021 B（+124 B，+0.03%）**。全部来自**一处** `src` 改动（真实 `dist/build-meta.json` bytesInOutput，见 `SIDEPANEL_GROWTH_BREAKDOWN.v44CloseoutRows`，Σ 124 + glue 0 == 登记增量）：' +
      '**F-01 同序号引用卡重复投影修复** —— `dom-gone` 引用的只读救援观察落地时，同一事实被投影两次（捕获时 `acceptCapture` + 救援落地 `maybeRescue().then`），旧守卫 `if (!systemText && …) return` 让「本次要写一行可读系统行」**顺带**把 `ref` 卡的抑制绕开，于是流内出现两张同序号失效卡（validate R1 独立探针实测 `data-ref-num = ["1","1"]`）。修法：`projectRef` 的唯一性键 = **`refNum + 状态`** —— 同一 `(序号, 状态)` 只允许一张活卡；被抑制时**仍然照写可读系统行**（走唯一系统通道，事实不静默丢弃），真正的状态迁移（`refNum:valid` → `refNum:stale`）键不同、照旧投影新卡。' +
      '**F-01 两段证伪（Chromium，真实产品路径）**：`test/ui/page-input.mjs` ⑯ 用 SW→面板的真实 `ref-captured` + 真实 `ref-rescue` 往返（页面侧文字唯一匹配）驱动 —— 回退 `projectRef` 的唯一性键 ⇒ `data-ref-num=["10","10"]`、卡片 2 张 ⇒ 门禁 **104 passed / 2 failed**（rc=1）；逐字节还原（`sidepanel.ts` sha256 `03af7188…` 前后相同）⇒ **106 passed / 0 failed**（rc=0）。' +
      '**N-01~N-05 登记（零字节）**：N-01 纯模型 `switchStreamSession` 旁路（产品零调用 + 布线门禁禁直呼，导出仅测试可见）/ N-02 `BUILD_STAMP` 致产物非逐字节可复现（KL-N-08 同源，字节大小恒定）/ N-03 binding 环境性 flake（KL-N-10 同源，隔离复跑 192/192）/ N-04 I-04 严格序无关性无独立门禁（机制已由 `testing.reset()` 消除，独立门禁属增量可选）/ N-05 **口径裁决登记**：一键重锚按钮 `#l1-ref-rescue` 在 L1 证据面板内（而非流内卡内）—— spec FR-CHAT-052 的「卡内」语义按「恢复路径可达即可（L1 面板与卡内二选一）」读，功能等价（失效卡引导至该面板），登记为已知偏差，若后续真机反馈需要卡内按钮则作为小改进项。' +
      '**门禁只增不减**：`test/ui/page-input.mjs` 新增 ⑯（4 条断言：救援落地负控 / 救援事实可读负控 / 同序号卡恰 1 张 / 被抑制投影仍写系统行），**无任何断言被删除或放宽**。' +
      'content.js 177,076 / pick-layer.js 33,900 **逐字节不变**；manifest / `KIND_SET` / 判定链 / SW 零 diff；journey / binding 保护段零 diff。' +
      '容差 5% 未动；`SIDEPANEL_CEILING = floor(479,021 × 1.05) = **502,972 B**`（由公式抬高；判定仍是 `min(绝对上限 563,200, 502,972) = 502,972`，裁决 V3-VOL-3 ⑥）。' +
      '相邻两轮 v4-4-i09fix + v4-4-closeout = +0.03%（<15% 线，仍如实登记）。' +
      '**V3-VOL-3 三值**：`newBaselineBytes` 随现行基线同源前移（479,021，走「作者确认占位」规则重登）；**档位 `ceilTo50KB(479,021) = 512,000` 与绝对上限 563,200 均未变**；`resolvedOn` 保持 2026-09-19；`evaluatePendingAbsoluteCap()` 通过。',
    baselineBeforeBytes: 478_897,
    baselineAfterBytes: 479_021,
    ceilingBeforeBytes: 502_841,
    ceilingAfterBytes: 502_972,
    assertionNonRemovalEntries: ['V44-CLOSE-SVOL-1', 'V44-CLOSE-E-1'],
    historyRetainedBytes: [478_897, 478_163, 476_834, 465_277, 465_000],
    ceilingUncappedFormulaBytes: 502_972,
  },
  {
    // F 还原度快修轮（2026-09-20，真机首屏评估的 FIX-1~FIX-4；FIX-5 评估后 deferred）
    id: 'f-fidelity-fix',
    direction: 'raised',
    roundKind: 'registry-fidelity-round',
    feature: 'specs-tree-v4-4-ref-system-nextstep',
    date: '2026-09-20',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy: 'F 还原度快修轮（2026-09-20，真机首屏评估偏差 FIX-1~FIX-4；FIX-5 评估后 deferred）',
    reason:
      '**显式提升重登记（F 还原度快修轮）：479,021 → 480,026 B（+1,005 B，+0.21%）**。四处实现层语义/文案修复（真实 `dist/build-meta.json` bytesInOutput，见 `SIDEPANEL_GROWTH_BREAKDOWN.fFidelityFixRows`，Σ 模块 +1,005 + glue 0 == 登记增量）：' +
      '① **FIX-1 授权 chip 直达授权流** —— onboarding 的「授权当前站点」chip 由 `act:\'next\'` 改为 `act:\'authorize\'`（`NEXTSTEP_ACTS` 闭集扩为 4），`sidepanel.ts` 把 `#authorize` 的权限流抽成**单一入口** `authorizeCurrentSite()`（设置按钮与 chip 两处调用），授权**不经 `requestTurn`、不受 `pending` 门控**；' +
      '② **FIX-2 过时空间指引文案** —— v4-4 把 `#authorize` 迁入设置视图后，`view-model.ts` 的 onboarding 步骤仍写「点击下方『授权当前站点』」；订正为「点『下一步推荐』卡中的『授权当前站点』（或 设置 → 站点与授权）」；同轮核对并订正 `web-fetch-tool.ts` / `session-follow.ts` / `service-worker.ts` 的同类指引（`src/ui/options/index.html` 与 `src/ui/tree/tree-ops.ts` 分别被 v3 台账 `zeroDiffFiles` 与 insight-archive 内容哈希冻结 ⇒ 本轮**未动**，登记为 deferred）；' +
      '③ **FIX-3 工具栏摘要回归 F 契约** —— `#l2-entry-summary` 由计数串改为 `view-model.ts#toolbarDigest`（origin · 授权态 · 会话，数据源仍是既有 state 字段）；计数收敛为**两处**（入口标签 + 徽标），`l2/counts.ts` 计数单源未动（`l2StatusBarText` 退出生产路径 ⇒ 树摇 −409 B）；' +
      '④ **FIX-4 决策槽 kicker 语义收敛** —— `L0_KICKER` 由「下一步做什么」改为静态角色名「决策 · 回执 · 引用」，不再与流内「下一步推荐」竞争；DOM / ARIA 未动。' +
      '逐模块归因：`view-model.ts` 21,322 → 22,552（+1,230）/ `sidepanel.ts` 79,750 → 79,865（+115）/ `recommend.ts` 3,993 → 4,192（+199）/ `l2/counts.ts` 2,932 → 2,523（−409）/ `l0/shell.ts` 5,710 → 5,580（−130）。' +
      '`dist/content.js` 177,076 B 与 `dist/pick-layer.js` 33,900 B **逐字节不变**（sha256 复核）；manifest / `KIND_SET` / 判定链 / SW 权限面零触碰；journey / binding 保护段零 diff。' +
      '门禁侧只增不减（toolbar 摘要「三处同源」等价替换为「两处同源 + digest」；新增 `test/authorize-chip-wiring.test.ts` 与 `test/ui/recommendation.mjs` ⑭）。' +
      '容差 5% 未动；`SIDEPANEL_CEILING = floor(480,026 × 1.05) = **504,027 B**`（由公式抬高；判定仍是 `min(绝对上限 563,200, 504,027) = 504,027`，裁决 V3-VOL-3 ⑥）。' +
      '**V3-VOL-3 三值**：`newBaselineBytes` 随现行基线同源前移（480,026，走「作者确认占位」规则重登）；**档位 `ceilTo50KB(480,026) = 512,000` 与绝对上限 563,200 均未变**；`resolvedOn` 保持 2026-09-19；`evaluatePendingAbsoluteCap()` 通过。',
    baselineBeforeBytes: 479_021,
    baselineAfterBytes: 480_026,
    ceilingBeforeBytes: 502_972,
    ceilingAfterBytes: 504_027,
    assertionNonRemovalEntries: ['FIXFID-E-001'],
    historyRetainedBytes: [479_021, 478_897, 478_163, 465_277, 465_000],
    ceilingUncappedFormulaBytes: 504_027,
  },
  {
    // V4.5-1 R1（2026-09-21，W1+W2 = TASK-V45-101~106，提交区间 A+B）
    id: 'v45-1-w2',
    direction: 'raised',
    roundKind: 'registry-fidelity-round',
    feature: 'specs-tree-v45-1-single-write-chronology',
    date: '2026-09-21',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy: 'SDDU v4.5-1 R2 (2026-09-21, leaf specs-tree-v45-1-single-write-chronology; W3 = TASK-V45-107~112): re-registered on the FINAL artifact — 480,896 → **493,501 B** (+12,605 B, +2.62%) — of the host-zeroing round (stream = pure chronological card list + decision-shell internalization + view migration + zero-host registry + risk-recovery trigger set + settings help section).',
    reason:
      '**显式重登记（同一叶的功能轮 W1+W2）：480,026 → 480,896 B（+870 B，+0.18%）**。真实 `dist/build-meta.json` bytesInOutput 逐模块归因（见 `SIDEPANEL_GROWTH_BREAKDOWN.v45W1W2Rows`，Σ 模块 +870 + glue 0 == 登记增量）：' +
      '① **TASK-V45-104 单写契约**：`host-registry.ts` 的 `STRIP_CHANNEL_KINDS` 由「legacy id + kind」重构为 `{channel, kind, emitterSite, carrierCount: 1, reason}`，新增 `evaluateStripChannels()` 三判据（唯一 emitter / 载体数 == 1 / `#send-reason` 仍在状态栏），删除与退役正面矛盾的「legacy id 仍在 DOM」判据与双写理由（+1,105 B）；' +
      '② **TASK-V45-105 五通道真退役**：`index.html` 移除 `li[data-host="strips"]` + `.strips` + `#env-guard` / `#site-hint*` / `#onboarding` / `#discovery-notice*` / `#notice` 与其死 CSS；`sidepanel.ts` 删除 `renderSiteHint` / `renderOnboarding` / `renderDiscoveryNotice` / `#notice` 投影 / `#env-guard` 横幅写入口（**净减 −1,061 B**）；事实唯一载体 = 流内系统行 + `firstRunCard`，长文案走行 `title`（`plaintextTitle()` fail-closed 净化，+167 B），行上落 `data-kind`（+283 / +184 B）；站点长文案同时落在设置视图站点分区详情（同源，+192 B）；`CHANNEL_STATE_CARRIERS` 让 site / probe 的首屏载体可达；' +
      '③ **TASK-V45-106 断言重写**：15 处门禁引用按新语义重写（「节点为 null + 流内载体数 == 1」双断言，数量只增），保护段（journey byte 43054..55259 / binding byte 107780..115930）由**同前置区等量删白**保持逐字节中立（spikeGate-A = keep-feasible / spikeGate-B = eight-steps-feasible）。' +
      '方向 = **提升**（+870 B；净减只出现在 `sidepanel.ts` 单模块）。`dist/content.js` 177,076 B（sha `52a82620…`）与 `dist/pick-layer.js` 33,900 B（sha `5f567d7e…`）**逐字节不变**；容差 5% 未动；ceiling = floor(480,896 × 1.05) = **504,940 B**；档位 `ceilTo50KB(480,896) = 512,000`（未下移）⇒ `absoluteCeilingBytes = 563,200` 不变；`SIDEPANEL_CEILING_CAP` 保持 record-only。' +
      '**门禁只增不减**：`npm test` 1001 → 1034（+33 node 断言，含 3 个新 node 门禁）；`CHROMIUM_GATES.length === 9` 不变；`EXPECTED_AUDITED_FILES` 只追加 3 项。**无任何断言被删除或放宽。**',
    baselineBeforeBytes: 480_026,
    baselineAfterBytes: 480_896,
    ceilingBeforeBytes: 504_027,
    ceilingAfterBytes: 504_940,
    assertionNonRemovalEntries: ['V45W2-E-01', 'V45W2-E-02', 'V45W2-E-03', 'V45W2-E-04', 'V45W2-E-05', 'V45W2-E-06', 'V45W2-E-07'],
    historyRetainedBytes: [480_026, 479_021, 478_897, 478_163, 476_834, 465_277, 465_000],
    ceilingUncappedFormulaBytes: 504_940,
  },
  /**
   * 〖V4.5-1 W3（2026-09-21）〗宿主全退役 + 元素卡内化 / 视图迁移一轮的**显式重登记**。
   * 五要素：前值 480,896 B / 后值 **493,501 B**（+12,605 B，+2.62%）/ 日期 2026-09-21 /
   * 来源 `packages/web-cli-plugin/dist/sidepanel.js` / 理由见下；历史值逐字保留在
   * `SIDEPANEL_BASELINE_BYTES_HISTORY` / `_TIMELINE` / 本登记册。
   */
  {
    id: 'v45-1-w3',
    direction: 'raised',
    roundKind: 'feature-round',
    feature: 'specs-tree-v45-1-single-write-chronology',
    date: '2026-09-21',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy: 'SDDU v4.5-1 R2（2026-09-21，W3 = TASK-V45-107~112：宿主清零 + 元素卡内化 / 视图迁移 + 零宿主判据 + risk-recovery 扩展 + 设置帮助分区）',
    reason:
      '**显式重登记（同一叶的功能轮 W3）：480,896 → 493,501 B（+12,605 B，+2.62%）**。真实 `dist/build-meta.json` bytesInOutput 逐模块归因（见 `SIDEPANEL_GROWTH_BREAKDOWN.v45W3Rows`，Σ 模块 +12,527 + glue 78 == 登记增量）：' +
      '① **TASK-V45-107 流纯时间序**：4 个固定位置宿主（`decision` / `composer` / `l1-panels` / `strips`）连同包裹层 DOM 移除，`stream-render.ts#messageAnchor()` 恒为 `null`；新增产品侧零宿主 / 纯卡序自断言（`assertStreamPureCardOrder` / `readStreamShape`，`density-scope.ts` 2,284 → 4,379）；' +
      '② **TASK-V45-108 决策壳卡内化**：新增 `cards/decision-region.ts`（选项池 + 后果预演 + 三段模板逐字）、`settings/help.ts`（帮助分区手势表）；`askuser` / `auth` / `ref` 卡承载选项池 / 后果预演 / 证据区 + 三恢复按钮 + 卡内 chip（退役 `#l0-ref-toggle` / `#l0-ref-badge`）；' +
      '③ **TASK-V45-109/110 视图迁移 + composer 出流**：局部树 / 回执证据 / 已决步数迁入 `#view-host` 只读承载块；`#composer` 迁 body 尾并保持 `hidden`（布局护栏 `syncComposerVisibility`）；`disclosure.ts` 三份声明重写；' +
      '④ **TASK-V45-111/112 零宿主判据 + 恢复规则扩展**：`host-registry.ts` 注册表降级为反向判据 + 退休真相册；`recommend.ts` 触发集（site / probe）/ chips 规则表 / act 闭集 6 项（「重新绑定当前标签页」由规则表首项保证）。' +
      '方向 = **提升**。`dist/content.js` 177,076 B 与 `dist/pick-layer.js` 33,900 B **逐字节不变**；容差 5% 未动；ceiling = floor(493,501 × 1.05) = **518,176 B**；档位 `ceilTo50KB(493,501) = 512,000`（**未下移**）⇒ `absoluteCeilingBytes = 563,200` 不变；判定 = min(563,200, 518,176) = 518,176。`SIDEPANEL_CEILING_CAP` 保持 record-only。' +
      '**门禁只增不减**：node `npm test` 1034 → 1037；`test:l0` 223 → 227、`test:l1` 111 → 115、`test:recommendation` 56 → 59、`test:insight` 116、`test:ui` 168、`test:binding` 192、`test:l2` 74、`test:ask-auth` 61、`test:stream` 63、`test:hardening` 24、`test:page-input` 106 全部 ≥ 基线。**无任何断言被删除或放宽。**',
    baselineBeforeBytes: 480_896,
    baselineAfterBytes: 493_501,
    ceilingBeforeBytes: 504_940,
    ceilingAfterBytes: 518_176,
    assertionNonRemovalEntries: ['V45W3-E-01', 'V45W3-E-02', 'V45W3-E-03', 'V45W3-E-04', 'V45W3-E-05', 'V45W3-E-06'],
    historyRetainedBytes: [480_896, 480_026, 479_021, 478_897, 478_163, 465_277, 465_000],
    ceilingUncappedFormulaBytes: 518_176,
  },
  /**
   * 〖V4.5-1 review R1 修复轮（2026-09-21，BLOCK-01~04 + I-01~06）〗**显式重登记**。
   * 五要素：前值 493,501 B / 后值 **498,521 B**（+5,020 B，+1.02%）/ 日期 2026-09-21 /
   * 来源 `packages/web-cli-plugin/dist/sidepanel.js` / 理由见下；历史值逐字保留在
   * `SIDEPANEL_BASELINE_BYTES_TIMELINE` 与本登记册。
   */
  {
    id: 'v45-1-reviewfix',
    direction: 'raised',
    roundKind: 'registry-fidelity-round',
    feature: 'specs-tree-v45-1-single-write-chronology',
    date: '2026-09-21',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy:
      'SDDU v4.5-1 review R1 修复轮（2026-09-21，leaf specs-tree-v45-1-single-write-chronology；review R1 BLOCK-01~04 + I-01~06）',
    reason:
      '**显式重登记（同一叶的审查修复轮）：493,501 → 498,521 B（+5,020 B，+1.02%）**。真实 `dist/build-meta.json` bytesInOutput 逐模块归因（见 `SIDEPANEL_GROWTH_BREAKDOWN.v45ReviewfixRows`，Σ 模块 +5,020 + glue 0 == 登记增量）：' +
      '① **BLOCK-01 迁移容器口径**（`host-registry.ts`）：`l0-receipt-summary` 移出 `RETIRED_CONTAINER_IDS`（14 → 13）并新增 `MIGRATED_CONTAINER_IDS` 登记 +「真退役 vs 迁移容器」判别规则；`evaluateStripChannels` 的载体半边由「缺失即跳过」改为「缺失即红 ∧ 载体面 > 上限即红」；新增 `STRIP_CHANNEL_LEGACY_IDS`；' +
      '② **BLOCK-02 死写点迁移**（`pick-input.ts`）：拖放高亮的 3 个写点从退役 `#l0-decision` 迁到真实落点面 `#stream`（写点 / 读点同载体）；' +
      '③ **BLOCK-03 live 载体读数**（`sidepanel.ts`）：新增 `stripCarrierReading` / `stripChannelReading` / `stripCarrierCounts` / `stripChannelProblems` + `firstRun`「卡在 ⇒ 行不在」抑制口径；' +
      '④ **BLOCK-04** `title` 净化反证落在 node 用例（零产物字节）；I-01~I-06 为 plan / ADR / 台账口径回写（零产物字节）。' +
      '方向 = **提升**。`dist/content.js` 177,076 B 与 `dist/pick-layer.js` 33,900 B **逐字节不变**；容差 5% 未动；ceiling = floor(498,521 × 1.05) = **523,447 B**；档位 `ceilTo50KB(498,521) = 512,000`（**未下移**）⇒ `absoluteCeilingBytes = 563,200` 不变；判定 = min(563,200, 523,447) = 523,447。`SIDEPANEL_CEILING_CAP` 保持 record-only。' +
      '**门禁只增不减**：node `npm test` 1044 → 1045；`test:l0` 227 → 244、`test:l1` 115 → 116、`test:density` 229 → 232 等只增（详见 build.md「review 修复轮」）。**无任何断言被删除或放宽。**',
    baselineBeforeBytes: 493_501,
    baselineAfterBytes: 498_521,
    ceilingBeforeBytes: 518_176,
    ceilingAfterBytes: 523_447,
    assertionNonRemovalEntries: ['V45W3-E-01', 'V45R3-E-01', 'V45R3-E-02'],
    historyRetainedBytes: [493_501, 480_896, 480_026, 479_021, 478_897, 478_163],
    ceilingUncappedFormulaBytes: 523_447,
  },
  /**
   * 〖V5-1 R1（2026-09-22，TASK-V5-101~113）〗**显式重登记**。
   * 五要素：前值 498,521 B / 后值 **507,315 B**（+8,794 B，+1.76%）/ 日期 2026-09-22 /
   * 来源 `packages/web-cli-plugin/dist/sidepanel.js` / 理由见下；历史值逐字保留在
   * `SIDEPANEL_BASELINE_BYTES_TIMELINE` 与本登记册。
   */
  {
    id: 'v5-1-r1',
    direction: 'raised',
    roundKind: 'feature-round',
    feature: 'specs-tree-v5-1-next-registry-pipeline',
    date: '2026-09-22',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy: 'SDDU V5-1 R1 build（2026-09-22, leaf specs-tree-v5-1-next-registry-pipeline; TASK-V5-101~113）',
    reason:
      '**显式重登记（新增 leaf 的功能轮 R1）：498,521 → 507,315 B（+8,794 B，+1.76%）**。真实 `dist/build-meta.json` bytesInOutput 逐模块归因（见 `SIDEPANEL_GROWTH_BREAKDOWN.v51R1Rows`，Σ 模块 +8,537 + glue 257 == 登记增量）：' +
      '① 新增 5 个必需模块 `next-registry/{pipeline(+3,135),providers(+3,265),registry(+2,460),dispatch(+795),definition(+703)}.ts`（Definition / Provider / Consumer 三件套 + 四态管线 + 4 内置 provider）；' +
      '② `recommend.ts` 规则表迁入内置 provider（−1,604）、`sidepanel.ts` 集 B 分支收敛为 `dispatchChipAction` 一次查表（−303）、`cards/nextstep.ts` 增 `data-op`（+86）。' +
      '方向 = **提升**。`dist/content.js` 177,076 B / sha `52a82620…` 与 `dist/pick-layer.js` 33,900 B / sha `5f567d7e…` **逐字节不变**；容差 5% 未动；ceiling = floor(507,315 × 1.05) = **532,680 B**；档位 `ceilTo50KB(507,315) = 512,000`（**未下移**）⇒ `absoluteCeilingBytes = 563,200` 不变；判定 = min(563,200, 532,680) = 532,680。`SIDEPANEL_CEILING_CAP` 保持 record-only。' +
      '`assertionNonRemovalEntries` 指向仍有效的既有台账条目（v5-1 自身的 X3/X6 `modifiedRanges` 条目按叶序在 R2 / TASK-V5-115 登记；本字段非空寄存器先行保证「断言零删减」不是空转）。**无任何断言被删除或放宽**（`local-act-wiring` / `recommendation-sources` 的重锚按 TASK-V5-115 预迁移，判据力只升）。',
    baselineBeforeBytes: 498_521,
    baselineAfterBytes: 507_315,
    ceilingBeforeBytes: 523_447,
    ceilingAfterBytes: 532_680,
    assertionNonRemovalEntries: ['V45R3-E-01', 'V45R3-E-02'],
    historyRetainedBytes: [498_521, 493_501, 480_896, 480_026, 479_021, 478_897],
    ceilingUncappedFormulaBytes: 532_680,
  },
  /**
   * 〖V5-2 R1（2026-09-22，TASK-V5-123~137；编排器裁决① **显式升档**）〗**显式重登记**。
   * 五要素：前值 507,315 B / 后值 **518,543 B**（+11,228 B，+2.21%）/ 日期 2026-09-22 /
   * 来源 `packages/web-cli-plugin/dist/sidepanel.js` / 理由见下；历史值逐字保留在
   * `SIDEPANEL_BASELINE_BYTES_TIMELINE` 与本登记册。**档位上调** 512,000 → 563,200
   * （`ceilTo50KB(518,543) = 563,200`）⇒ 绝对上限 563,200 → **619,520**；
   * `authorConfirmation` 保持 `pending-author-line`（占位，不伪称已确认）。
   */
  {
    id: 'v5-2-r1',
    direction: 'raised',
    roundKind: 'feature-round',
    feature: 'specs-tree-v5-2-ops-first-batch',
    date: '2026-09-22',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy: 'SDDU V5-2 R1 build（2026-09-22, leaf specs-tree-v5-2-ops-first-batch; TASK-V5-123~137）',
    reason:
      '**显式重登记（新增 leaf 的功能轮 R1）：507,315 → 518,543 B（+11,228 B，+2.21%）**。真实 `dist/build-meta.json` bytesInOutput 逐模块归因（见 `SIDEPANEL_GROWTH_BREAKDOWN.v52R1Rows`，Σ 模块 +11,155 + glue 73 == 登记增量）：' +
      '① 新增 `next-registry/ops.ts`（9 op 执行体 + 缝，+3,918）与 `shared/op-table.ts`（双侧同源描述符表，+831）；' +
      '② `sidepanel.ts` 生产缝（collectors / 两段握手 / 掩码提交 / `op.llm-config` 回滚，+4,935）；' +
      '③ 掩码 `secret` 卡（`cards/askuser.ts` +511）、`recommend.ts` 授权 chip 落槽（+485）、`stream-plaintext.ts` 掩码文案单源（+427）、`chat-state.ts` askKind 派生（+185）、`cards/nextstep.ts` chip 值透传（+28），`pipeline.ts` op 表迁出净减（−156）。' +
      '方向 = **提升**；**本轮越档位**（518,543 > 512,000）⇒ **编排器裁决① 显式升档**：档位 512,000 → **563,200**、绝对上限 563,200 → **619,520**（`SIDEPANEL_TIER_BYTES × 1.10`），`resolvedOn` 保持闭合实测日期，`authorConfirmation` 保持 `pending-author-line`。' +
      '根因（计划侧偏差，登记不静默）：ADR-V5-011 §1 给 9 op 执行体 3,400 B / `askuser` 扩形 1,800 B，而实测**仅 `ops.ts` 一项即 3,918 B**、面板接线（预算表未单列）+4,935 B ⇒ 预算**低估约 2 倍**。' +
      '`dist/content.js` 177,076 B / sha `52a82620…` 与 `dist/pick-layer.js` 33,900 B / sha `5f567d7e…` **逐字节不变**；容差 5% 未动；ceiling = floor(518,543 × 1.05) = **544,470 B**；判定 = min(619,520, 544,470) = 544,470。`SIDEPANEL_CEILING_CAP` 保持 record-only。**无任何断言被删除或放宽**。',
    baselineBeforeBytes: 507_315,
    baselineAfterBytes: 518_543,
    ceilingBeforeBytes: 532_680,
    ceilingAfterBytes: 544_470,
    assertionNonRemovalEntries: ['V52R1-E-01'],
    historyRetainedBytes: [507_315, 498_521, 493_501, 480_896, 480_026],
    ceilingUncappedFormulaBytes: 544_470,
  },
  /**
   * 〖V5-2 R2（2026-09-22，TASK-V5-138~152；程序面收口轮）〗**显式重登记**。
   * 五要素：前值 518,543 B / 后值 **535,821 B**（+17,278 B，+3.33%）/ 日期 2026-09-22 /
   * 来源 `packages/web-cli-plugin/dist/sidepanel.js` / 理由见下；历史值逐字保留在
   * `SIDEPANEL_BASELINE_BYTES_TIMELINE` 与本登记册。**档位与绝对上限均不变**
   * （`ceilTo50KB(535,821) = 563,200` / 619,520）。
   */
  {
    id: 'v5-2-r2',
    direction: 'raised',
    roundKind: 'feature-round',
    feature: 'specs-tree-v5-2-ops-first-batch',
    date: '2026-09-22',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy: 'SDDU V5-2 R2 build（2026-09-22, leaf specs-tree-v5-2-ops-first-batch; TASK-V5-138~152）',
    reason:
      '**显式重登记（同一叶的功能轮 R2）：518,543 → 535,821 B（+17,278 B，+3.33%）**。真实 `dist/build-meta.json` bytesInOutput 逐模块归因（见 `SIDEPANEL_GROWTH_BREAKDOWN.v52R2Rows`，Σ 模块 +17,229 + glue 49 == 登记增量）：' +
      '① `sidepanel.ts` +7,873（`form` 卡收集 / `op.perm.request` 两段握手与双固化 / `op.revoke` 三目标执行体 / 三表快照生产适配器 / 拒绝可达 next / settings `dispatchOp` 接线）；' +
      '② `next-registry/ops.ts` +2,328（`op.revoke` 五要素 + `op.perm.request` 执行体 + 可达 next 缝 + 回执同源构造）；' +
      '③ `cards/askuser.ts` +1,867（`form` 多选卡构造）；④ 新增 `next-registry/snapshot.ts` 1,601（三表整体回滚）；' +
      '⑤ `settings/ops.ts` +2,092（4 类委派 + 回执同源 + 工具面重拉实测的不假成功判定）；⑥ `platform/capability-permissions.ts` +669（form 选项单源 + 在册校验）；' +
      '⑦ `next-registry/pipeline.ts` +537（`dispatchOp` 第二 consent 载体 + 默认 settle/快照接缝）/ `chat-state.ts` +262（`formOptions` 进 payload）。' +
      '方向 = **提升**；**档位与绝对上限均未变**（`ceilTo50KB(534,913) = 563,200`、619,520），生效上限 = `min(619,520, floor(535,821 × 1.05) = 562,612) = 562,612`。' +
      '`dist/content.js` 177,076 B / sha `52a82620…` 与 `dist/pick-layer.js` 33,900 B / sha `5f567d7e…` **逐字节不变**；容差 5% 未动；`SIDEPANEL_CEILING_CAP` 保持 record-only。' +
      '**断言零删减**；体积面唯一放宽 = 未解释字节绝对口径 1,500 → 2,500 B（输入模块数 83 → 86 的自然增长；同一处**新增相对口径 <2%** 保留为更紧的一面）。',
    baselineBeforeBytes: 518_543,
    baselineAfterBytes: 535_821,
    ceilingBeforeBytes: 544_470,
    ceilingAfterBytes: 562_612,
    assertionNonRemovalEntries: ['V52R1-E-01', 'V52R2-E-01'],
    historyRetainedBytes: [518_543, 507_315, 498_521, 493_501, 480_896],
    ceilingUncappedFormulaBytes: 562_612,
  },
  /**
   * 〖V5-2 **review R1 修复轮**（2026-09-22，BLOCK-01~03 + I 项）〗**显式重登记**。
   * 五要素：前值 535,821 B / 后值 **542,150 B**（+6,329 B，+1.18%）/ 日期 2026-09-22 /
   * 来源 `packages/web-cli-plugin/dist/sidepanel.js` / 理由见下；历史值逐字保留在
   * `SIDEPANEL_BASELINE_BYTES_TIMELINE` 与本登记册。**档位与绝对上限均不变**
   * （`ceilTo50KB(542,150) = 563,200` / 619,520）；生效上限 = `min(619,520, floor(542,150 × 1.05) = 569,257) = 569,257`。
   * `roundKind` = `registry-fidelity-round`（同一 Feature 内的修复轮，非新功能轮）。
   */
  {
    id: 'v5-2-reviewfix',
    direction: 'raised',
    roundKind: 'registry-fidelity-round',
    feature: 'specs-tree-v5-2-ops-first-batch',
    date: '2026-09-22',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy: 'SDDU V5-2 review R1 修复轮 build（2026-09-22, leaf specs-tree-v5-2-ops-first-batch）',
    reason:
      '**显式重登记（同一叶的 review 修复轮）：535,821 → 542,150 B（+6,329 B，+1.18%）**。真实 `dist/build-meta.json` bytesInOutput 逐模块归因（见 `SIDEPANEL_GROWTH_BREAKDOWN.v52ReviewfixRows`，Σ 模块 +6,294 + glue 35 == 登记增量 +6,329）：' +
      '① 新增 `src/ui/settings/op-bodies.ts` **+8,151**（与面无关的四类执行体：表单凭据落储 / 撤销三目标 / 权限两段握手；两面的原子入口注入）—— review BLOCK-01 的落地形态（消灭 options 面的假成功）；' +
      '② `sidepanel.ts` **−2,636** 与 `settings/ops.ts` **−1,852**（执行体与控制流迁出，`settings/ops.ts` 零原生语句：I-02/I-03）；' +
      '③ `next-registry/providers.ts` **+1,187**（两条 op-driven 修复 provider：`llm.unconfigured` / `perm.missing` 的 chips 真实接线）与 `next-registry/ops.ts` **+826**（执行体透传 `OpOutcome` + 缺缝 loud + ctx 值转发）—— review BLOCK-03/01；' +
      '④ `next-registry/pipeline.ts` **+344**（失败态结算 `failed` + 非 `{ok:true}` 整体回滚）—— review BLOCK-02；`recommend.ts` **+278**（op-direct chip act）+ `cards/nextstep.ts` **+42**（op-direct `data-op`）+ `cards/askuser.ts` **−46**（I-04 类别位）。' +
      '方向 = **提升**；**档位与绝对上限均未变**（`ceilTo50KB(542,150) = 563,200`、619,520），生效上限 = `min(619,520, floor(542,150 × 1.05) = 569,257) = 569,257`。' +
      '`dist/content.js` 177,076 B / sha `52a82620…` 与 `dist/pick-layer.js` 33,900 B / sha `5f567d7e…` **逐字节不变**；容差 5% 未动；`SIDEPANEL_CEILING_CAP` 保持 record-only。' +
      '**断言零删减**（`npm test` 1165 → 1172 / 0 fail；Chromium 三门禁只增）；体积面口径订正 = 未解释字节的**线性上界**由「常量 + 每新增模块」改为「每输入模块 25 B」（I-05 如实登记为放宽 + 公式依据）。',
    baselineBeforeBytes: 535_821,
    baselineAfterBytes: 542_150,
    ceilingBeforeBytes: 562_612,
    ceilingAfterBytes: 569_257,
    assertionNonRemovalEntries: ['V52R3-MR-sidepanel-view-副本判据重锚'],
    historyRetainedBytes: [535_821, 518_543, 507_315, 498_521, 493_501],
    ceilingUncappedFormulaBytes: 569_257,
  },
  /**
   * 〖V5-2 **收口轮**（2026-09-22，validate R1 的 N-01 + N-04~N-09 / KL-N-10 登记）〗
   * **显式净减重登记**（本 Feature 的**首个净减轮**）。
   *
   * 五要素：前值 542,150 B / 后值 **542,064 B**（**−86 B，−0.02%**）/ 日期 2026-09-22 /
   * 来源 `packages/web-cli-plugin/dist/sidepanel.js` / 理由见下；历史值逐字保留在
   * `SIDEPANEL_BASELINE_BYTES_TIMELINE` 与本登记册。**档位与绝对上限均不变**
   * （`ceilTo50KB(542,064) = 563,200` / 619,520）；生效上限 = `min(619,520, floor(542,064 × 1.05) = 569,167) = 569,167`。
   * `roundKind` = `registry-fidelity-round`（同一 Feature 内的更正轮，非新功能轮）；
   * `direction: 'lowered'` —— 净减也强制登记（删掉一条重复写，方向不得伪装成提升）。
   */
  {
    id: 'v5-2-closeout',
    direction: 'lowered',
    roundKind: 'registry-fidelity-round',
    feature: 'specs-tree-v5-2-ops-first-batch',
    date: '2026-09-22',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy: 'SDDU V5-2 收口轮 build（2026-09-22, leaf specs-tree-v5-2-ops-first-batch）',
    reason:
      '**显式净减重登记（同一叶的收口轮）：542,150 → 542,064 B（-86 B，-0.02%）**。唯一 `src` 改动 = ' +
      '`sidepanel.ts#permRequest` 删去 `if (!out.ok && out.receipt) dispatch({ type: \'notice\', text: out.receipt.text });` ' +
      '—— validate R1 **N-01**：该行与管线结算（`pipeline.ts#defaultSettle("failed")` → `opReceiptText(op, out)`，取 `out.receipt.text`）' +
      '写的是**同一条**失败事实行，导致 `op.perm.request` 拒绝时出现 **2 行**；删除后**管线 settle 为唯一写者**，文案不变（settle 取的就是同一个 `out.receipt.text`）。' +
      '真实 `dist/build-meta.json` bytesInOutput 逐模块归因（见 `SIDEPANEL_GROWTH_BREAKDOWN.v52CloseoutRows`，Σ -86 + glue 0 == 登记增量 -86）：' +
      '`sidepanel.ts` 93,773 → **93,687 B**（**−86 B**，唯一的模块移动）。方向 = **净减**（`direction: "lowered"`，本 Feature 首个净减轮）；' +
      '**档位与绝对上限均未变**（`ceilTo50KB(542,064) = 563,200`、619,520），生效上限 = `min(619,520, floor(542,064 × 1.05) = 569,167) = 569,167`（较上一轮 569,257 **更紧**）。' +
      '`dist/content.js` 177,076 B / sha `52a82620…` 与 `dist/pick-layer.js` 33,900 B / sha `5f567d7e…` **逐字节不变**；容差 5% 未动；`SIDEPANEL_CEILING_CAP` 保持 record-only。' +
      '**断言零删减**（`npm test` 1172+ / 0 fail；`size-budget` / `size-ruling-vol3` / `size-growth-evidence` 三门禁复跑绿）；同轮登记 validate R1 的 N-04~N-09 / KL-N-10（+0 字节，见 build.md「收口轮」）。',
    baselineBeforeBytes: 542_150,
    baselineAfterBytes: 542_064,
    ceilingBeforeBytes: 569_257,
    ceilingAfterBytes: 569_167,
    assertionNonRemovalEntries: ['V52C-MR-v5-2-closeout'],
    historyRetainedBytes: [542_150, 535_821, 518_543, 507_315, 498_521],
    ceilingUncappedFormulaBytes: 569_167,
  },
  /**
   * 〖V5-3 R2（2026-09-22，TASK-V5-153~176）—— **末叶 / 收口叶 + 三叶合计终轮**〗
   *
   * **显式提升重登记（v5-3 叶收口轮）：542,064 → 546,370 B（+4,306 B，+0.79%）**。本轮同时登记
   * **v5-3 叶的 R1（153~166）与 R2（167~176）**（R1 当时按纪律把「体积五要素」整体归 R2 收口）。
   * 真实 `dist/build-meta.json` bytesInOutput 逐模块归因（见 `SIDEPANEL_GROWTH_BREAKDOWN.v53Rows`，
   * Σ 模块 +4,306 + 未归因胶水 0 == 登记增量 +4,306）：
   *   · `sidepanel.ts` +2,015（授权 chip 两态与黄/绿点击 + `ResizeObserver→data-narrow` + 三测试缝）
   *   · `l2/audit.ts` **+566**（法八面③ `maskedLength` 审计列：白名单 / 渲染列 / 行 / 单元格）
   *   · `cards/error.ts` +537（`error` 出生铸造恢复区）
   *   · `next-registry/providers.ts` +428（`blockedRecovery` 运行期派生）
   *   · `statusbar.ts` +359（`#auth-state` 唯一写入者）
   *   · `l0/risk-rail.ts` +261（`RAIL_RISK_CLASSES` 4 + `AUTH_STATES` 拆分）
   *   · `chat-state.ts` +200（掩码分支 + digest 掩码痕迹）
   *   · `stream-plaintext.ts` +60（`DIGEST_MASK` 单源）
   *   · `view-model.ts` **−120**（工具栏 digest 去 auth 段 / 状态文案去授权态词）。
   * 档位 `ceilTo50KB(546,370) = 563,200` 与绝对上限 619,520 **均未变**（不离档、不下移）；
   * 生效上限 = `min(619,520, floor(546,370 × 1.05) = 573,688) = 573,688`。`dist/content.js` 177,076 B /
   * sha `52a82620…` 与 `dist/pick-layer.js` 33,900 B / sha `5f567d7e…` **逐字节不变**；容差 5% 未动、
   * 断言零删减（本轮既有门禁的载体重锚 = 等价重锚，逐条登记于 `modifiedRanges[]` / `v5Ledger`）。
   */
  {
    id: 'v5-3-r2',
    direction: 'raised',
    roundKind: 'feature-round',
    feature: 'specs-tree-v5-3-chrome-face',
    date: '2026-09-22',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy: 'SDDU V5-3 R2 build（2026-09-22, leaf specs-tree-v5-3-chrome-face · TASK-V5-153~176）',
    reason:
      '**显式提升重登记（末叶 / 收口叶 + 三叶合计终轮）：542,064 → 546,370 B（+4,306 B，+0.79%）**。' +
      '本轮登记 v5-3 叶 R1+R2 的全部实施字节（R1 按纪律把五要素整体归 R2）。' +
      '真实 `dist/build-meta.json` bytesInOutput 逐模块归因（见 `SIDEPANEL_GROWTH_BREAKDOWN.v53Rows`，Σ 模块 +4,306 + glue 0 == 登记增量 +4,306）：' +
      '`sidepanel.ts` +2,015（授权 chip 唯一载体 + 黄/绿点击 + `ResizeObserver→data-narrow` + 三测试缝）/ `l2/audit.ts` **+566**（法八面③ `maskedLength` 审计列）/ ' +
      '`cards/error.ts` +537（出生铸造恢复区）/ `next-registry/providers.ts` +428（`blockedRecovery` 运行期派生）/ `statusbar.ts` +359（`#auth-state` 唯一写入者）/ ' +
      '`l0/risk-rail.ts` +261（rail 四类 + `AUTH_STATES`）/ `chat-state.ts` +200 / `stream-plaintext.ts` +60 / `view-model.ts` **−120**（去 auth 段）。' +
      '**档位与绝对上限均未变**（`ceilTo50KB(546,370) = 563,200`、619,520），生效上限 = `min(619,520, floor(546,370 × 1.05) = 573,688) = 573,688`。' +
      '`dist/content.js` 177,076 B / sha `52a82620…` 与 `dist/pick-layer.js` 33,900 B / sha `5f567d7e…` **逐字节不变**；容差 5% 未动；`SIDEPANEL_CEILING_CAP` 保持 record-only；' +
      '`authorConfirmation.status` 保持 **`pending-author-line`**（占位，不伪称已确认）。' +
      '预算口径诚实登记：`ADR-V5-011 §1` 的 v5-3 逐项预算 3,250 B 被 R1 单独用满（+3,209），R2 的 **法八面③ `maskedLength` 审计列 + `data-narrow`** 使本叶合计 +4,306 B —— ' +
      '编排队列裁决「质量优先，落 `maskedLength` 列」，故本叶**显式超出行预算**并按三叶合计口径重登记（未删格、未放宽容差、未下调档位）。' +
      '**断言零删减**（既有门禁的授权态载体重锚为等价重锚，逐条登记于 `modifiedRanges[]` / `v5Ledger`）。',
    baselineBeforeBytes: 542_064,
    baselineAfterBytes: 546_370,
    ceilingBeforeBytes: 569_167,
    ceilingAfterBytes: 573_688,
    assertionNonRemovalEntries: ['V53-MR-binding-1481', 'V53-MR-binding-1486', 'V53-MR-binding-1489', 'V53-MR-binding-1496'],
    historyRetainedBytes: [542_064, 542_150, 535_821, 518_543, 507_315, 498_521],
    ceilingUncappedFormulaBytes: 573_688,
  },
  {
    id: 'v5-3-reviewfix',
    direction: 'raised',
    roundKind: 'registry-fidelity-round',
    feature: 'specs-tree-v5-3-chrome-face',
    date: '2026-09-22',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy: 'SDDU V5-3 review R1 修复轮（2026-09-22, leaf specs-tree-v5-3-chrome-face · BLOCK-01 + I-01~05）',
    reason:
      '**显式提升重登记（review R1 修复轮）：546,370 → 547,558 B（+1,188 B，+0.22%）**。' +
      '真实 `dist/build-meta.json` bytesInOutput 逐模块归因（见 `SIDEPANEL_GROWTH_BREAKDOWN.v53FixRows`，Σ 模块 +1,188 + glue 0 == 登记增量 +1,188）：' +
      '① **BLOCK-01（唯一载体彻底闭环）**：`project-tree.ts#siteBadges` 站点行不再复制授权态值，改为 `auth-pointer` **指针**（`data-auth-pointer="#auth-state"`）；' +
      '`tree-view.ts` 站点行 sublabel 改指针常量 `TREE_AUTH_POINTER_NOTE`；`tree-drawer.ts` 运行期重建指针说明节点（`replaceChildren()` 后仍可见）+ 徽标渲染指针属性；' +
      '② **I-01**：四词扫描口径回写 `ADR-V5-006 §2` + 叶 `spec.md`（`发现=supported` 为探测协议态 / 连接态，**允许保留**；判据 = 授权态**语义位** `[data-auth]` + 两态逐字短语，非裸词全局禁）+ `auth-chip.mjs` 语义位/工具栏零出现 + 注入反证；' +
      '③ **I-02**：工具栏摘要 `data-status-dot` 与授权态解耦（只表**会话连接态**，G 稿「摘要 dot 恒绿」）+ 新增 `policyTone` 走 policy 维度（`l0/shell.ts` 写入点）；' +
      '④ **I-03**：`no-dead-end.mjs` S2 十环节**逐环节驱动 + 各自读数**（`refresh()` 测试缝改为可 await ⇒ ⑨/⑩ 无轮询）；' +
      '⑤ **I-05**：`blockedRecovery` 位置耦合魔法数组改 `definition.ts#BLOCKED_RECOVERY_TRIGGER` **对象键对齐**（编译期穷尽，`satisfies Record<BlockedTerminal, …>`）。' +
      '**档位与绝对上限均未变**（`ceilTo50KB(547,558) = 563,200`、619,520），生效上限 = `min(619,520, floor(547,558 × 1.05) = 574,935) = 574,935`。' +
      '`dist/content.js` 177,076 B / sha `52a82620…` 与 `dist/pick-layer.js` 33,900 B / sha `5f567d7e…` **逐字节不变**；容差 5% 未动；`SIDEPANEL_CEILING_CAP` 保持 record-only；' +
      '`authorConfirmation.status` 保持 **`pending-author-line`**（占位，不伪称已确认）。' +
      '**断言零删减**（载体重锚 = 等价重锚，逐条登记于 `modifiedRanges[]`；`npm test` 计数只增）。',
    baselineBeforeBytes: 546_370,
    baselineAfterBytes: 547_558,
    ceilingBeforeBytes: 573_688,
    ceilingAfterBytes: 574_935,
    assertionNonRemovalEntries: ['V53R1-MR-insight-I20a', 'V53R1-MR-insight-projection-站点徽标'],
    historyRetainedBytes: [546_370, 542_064, 542_150, 535_821, 518_543],
    ceilingUncappedFormulaBytes: 574_935,
  },
  /**
   * 〖R4 缺陷修复轮（2026-09-22；作者裁决「根修 + 止血，含解冻 pick-layer.js」）〗
   *
   * **显式提升重登记（收口后缺陷修复轮）：547,558 → 549,609 B（+2,051 B，+0.37%）**。
   *
   * 缺陷（代码诊断 + 真机选择器实测 121 字）：`content/ref-capture.ts#selectorFor` 把 >120 字的
   * 选择器截断成 `slice(0,120)+'…'` —— **非法 CSS**；`resolveRef` 又把 CSS 解析器抛错与「0 命中」
   * 同吞为 `{status:'missing'}` ⇒ 判定链 D1 报 `dom-gone` ⇒ **引用出生即死**（目标仍在页面上）。
   *
   * 修法（fail-closed **不放松**）：① 存储 / 查询用选择器**永不截断**（`SELECTOR_STORE_MAX` = 512，
   * 超限回退 compact 链；截断只保留在展示层 `selectorForDisplay` / `displaySelector`）；
   * ② **诊断分离**（`invalid-selector` 独立于 `missing` —— SW `observeIdentity` 同步；`ref-validity.ts`
   * 维度词表**只增**一条 + 独立文案）；③ **捕获回环校验止血**（`acceptCapture` 观测为
   * missing / invalid-selector ⇒ 先只读文本候选探测：唯一匹配 ⇒ 用 SW 现算的**完整**选择器替换后重判；
   * 仍失败 ⇒ **拒铸**（不产生出生即死的引用）+ 可读系统事件 + 引导 next，法七不破）。
   *
   * 真实 `dist/build-meta.json` bytesInOutput 逐模块归因（见
   * `SIDEPANEL_GROWTH_BREAKDOWN.r4SelectorFixRows`，Σ 模块 +2,051 + glue 0 == 登记增量 +2,051）：
   * `sidepanel.ts` +999（捕获回环校验 + 拒铸路径 + 展示层截断接线）/ `l1/ref-validity.ts` +742
   * （`invalid-selector` 维度 + 文案 + 救援挂载面）/ `l1/ref-store.ts` +220（`displaySelector` 单点 +
   * 证据 / 标签展示面）/ `pick-input.ts` +90（`reanchor` 的 `silent` 选项）。
   *
   * **档位与绝对上限均未变**（`ceilTo50KB(549,609) = 563,200`、619,520），生效上限 =
   * `min(619,520, floor(549,609 × 1.05) = 577,089) = 577,089`。`dist/content.js` 177,076 B /
   * sha `52a82620…` **逐字节不变**（本修不碰 content script）；`dist/pick-layer.js` 33,900 →
   * **34,358 B**（同一轮的**显式解冻重登记**，走 `PICK_LAYER_RE_REGISTRATIONS['r4-selector-fix']`
   * 五要素）。`SIDEPANEL_CEILING_CAP` 保持 record-only；`authorConfirmation` 保持
   * `pending-author-line`（占位，不伪称已确认）。
   *
   * **断言零删减**：`ref-capture.test.ts` 的两条截断口径断言按**登记口径变更**重锚（`SELECTOR_MAX`
   * 仍是**展示**上限 120；存储上限新增 `SELECTOR_STORE_MAX` = 512；`resolveRef` 的抛错分支由
   * `missing` 改为 `invalid-selector`），并且**只增**：新增 4 条 R4 用例（>120 回环 / 截断反证 /
   * >512 compact 回退 / invalid-selector 维度）。既有行被替换者在 v4 台账逐行登记
   * （`leafBases[].registeredUncoveredLines` = `R4-MR-ref-capture-test`）。
   */
  {
    id: 'r4-selector-fix',
    direction: 'raised',
    roundKind: 'registry-fidelity-round',
    feature: 'specs-tree-web-cli-plugin-v3-ui',
    date: '2026-09-22',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy:
      'SDDU defect-fix round R4（2026-09-22, post-closeout; author adjudication「根修 + 止血，含解冻 pick-layer.js」at HEAD 953a2ed）',
    reason:
      '**收口后缺陷修复轮（显式提升重登记）：547,558 → 549,609 B（+2,051 B，+0.37%）**。' +
      '缺陷：`content/ref-capture.ts#selectorFor` 把 >120 字的选择器截断成 `slice(0,120)+\'…\'` —— **非法 CSS**' +
      '（真机选择器实测 121 字）；`resolveRef` 又把解析器抛错与「0 命中」同吞为 `{status:\'missing\'}` ⇒ 判定链 D1 ' +
      '报 `dom-gone` ⇒ **引用出生即死**（目标仍在页面上）。修法（① 根修 / ② 诊断分离 / ③ 止血）：' +
      '① 存储 / 查询用选择器**永不截断**（`SELECTOR_STORE_MAX` = 512，超限回退 compact 链；截断只保留在**展示层**' +
      ' `selectorForDisplay` / `displaySelector`）；② `resolveRef` / SW `observeIdentity` 把 `invalid-selector` 与 ' +
      '`missing` 分开，`l1/ref-validity.ts` 维度词表**只增**一条 + 独立文案（不得再写「目标元素已不存在」）；' +
      '③ `acceptCapture` 捕获回环校验：观测为 missing / invalid-selector ⇒ 先做只读文本候选探测（唯一匹配 ⇒ 用 SW ' +
      '现算的**完整**选择器替换后再走同一条摄取管线；仍失败 ⇒ **拒铸** + 可读系统事件 + 引导 next，法七不破）。' +
      '真实 `dist/build-meta.json` bytesInOutput 逐模块归因（见 `SIDEPANEL_GROWTH_BREAKDOWN.r4SelectorFixRows`，' +
      'Σ 模块 +2,051 + glue 0 == 登记增量 +2,051）：`sidepanel.ts` 96,037 → **97,036（+999）** / ' +
      '`l1/ref-validity.ts` 8,897 → **9,639（+742）** / `l1/ref-store.ts` 5,949 → **6,169（+220）** / ' +
      '`pick-input.ts` 8,315 → **8,405（+90）**。**档位与绝对上限均未变**（`ceilTo50KB(549,609) = 563,200`、' +
      '619,520），生效上限 = `min(619,520, floor(549,609 × 1.05) = 577,089) = 577,089`。`dist/content.js` ' +
      '177,076 B / sha `52a82620…` **逐字节不变**（本修不碰 content script）；`dist/pick-layer.js` 33,900 → ' +
      '**34,358 B** 走**同一轮的显式解冻重登记**（`PICK_LAYER_RE_REGISTRATIONS[\'r4-selector-fix\']` 五要素：' +
      '前后值 / 日期 / 来源 / 理由 / 历史保留）。容差 5% 未动；`SIDEPANEL_CEILING_CAP` 保持 record-only；' +
      '**断言零删减**（`ref-capture.test.ts` 的两条截断口径断言按**登记口径变更**重锚并**只增 4 条** R4 用例；' +
      '被替换的既有行逐行登记于 v4 台账 `leafBases[].registeredUncoveredLines`）。' +
      '**两段证伪（实测原文见 `packages/web-cli-plugin/docs/r4-selector-truncation-2026-09-22.md`）**：' +
      '① 回退 `selectorFor` 截断 ⇒ 真实 DOM 回环断言红；② 回退诊断分离 ⇒ `test:l1` 的新维度行红；' +
      '③ 回退捕获回环校验 ⇒ page-input 的 R4 止血段红。',
    baselineBeforeBytes: 547_558,
    baselineAfterBytes: 549_609,
    ceilingBeforeBytes: 574_935,
    ceilingAfterBytes: 577_089,
    assertionNonRemovalEntries: ['R4-MR-ref-capture-test', 'R4-MR-l1-reason'],
    historyRetainedBytes: [547_558, 546_370, 542_064, 542_150, 535_821],
    ceilingUncappedFormulaBytes: 577_089,
  },
  /**
   * 〖V5.5-1 R1（2026-09-23，leaf specs-tree-v55-1-driver-layer；W1+W2 = TASK-V55-101~112）〗
   * **显式提升重登记（本叶功能轮 R1 / 中间登记）：549,609 → 554,576 B（+4,967 B，+0.90%）**。
   *
   * 本叶 = 驱动者层 + 法七扩展底座。R1（W1+W2）落地：① 新增 `next-registry/drivers.ts`
   * （驱动者声明**单源**：时机闭集 5（含 `'answered'`，旧 4 逐字）/ 七类时刻枚举 / `driverClass` /
   * `CTX_FIELD_SERVICE` / 四元组抽取 + 去重键 + `timingOfSettle`）；② 新增
   * `next-registry/terminals.ts`（驱动者终态词汇 4，与 `STREAM_TERMINALS` 6 **正交**）；
   * ③ `RecommendTrigger` 从 `sidepanel.ts` **外移**到单源（`import type` / `export type` 被压缩器
   * 擦除 ⇒ 本文件 0 B）；④ `providers.ts` 增 10 行驱动者声明表 `DRIVER_DECLS_SRC` + 注册接线
   * （`registerBuiltinProviders()` 内 idempotent 注册）；⑤ `definition.ts#NextCtx` **加法**字段组
   * `session.proactive`（可选，注释被擦除 ⇒ 0 B）。
   *
   * 真实 `dist/build-meta.json` bytesInOutput 逐模块归因（见 `SIDEPANEL_GROWTH_BREAKDOWN.v551R1Rows`，
   * Σ 模块 **+4,919** + glue **+48** == 登记增量 **+4,967**）：`next-registry/drivers.ts` NEW
   * **+2,662** / `next-registry/providers.ts` 4,834 → **7,091（+2,257）**。
   *
   * **档位与绝对上限均未变**（`ceilTo50KB(554,576) = 563,200`、619,520），生效上限 =
   * `min(619,520, floor(554,576 × 1.05) = 582,304) = 582,304`。`dist/content.js` 177,076 B 与
   * `dist/pick-layer.js` 34,358 B **逐字节不变**（本轮零触碰 content script / pick layer）；容差 5% 未动；
   * `SIDEPANEL_CEILING_CAP` 保持 record-only；`authorConfirmation` 保持占位。**断言零删减**
   * （新增 3 个受审 node 门禁；既有测试仅按新登记值重锚）。
   */
  {
    id: 'v55-1-r1',
    direction: 'raised',
    roundKind: 'feature-round',
    feature: 'specs-tree-v55-1-driver-layer',
    date: '2026-09-23',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy:
      'SDDU V5.5-1 R1（2026-09-23，leaf specs-tree-v55-1-driver-layer；W1+W2 = TASK-V55-101~112；驱动者声明单源 + 终态词汇 + 时机源外移 + 驱动者行登记）',
    reason:
      '**显式提升重登记（本叶功能轮 R1 / 中间登记）：549,609 → 554,576 B（+4,967 B，+0.90%）**。' +
      '本轮唯一 `src` 改动面 = 驱动者层底座：① NEW `next-registry/drivers.ts` +2,662（时机闭集 5 含 ' +
      "`answered` / 七类时刻 / `DRIVER_CLASSES` / `CTX_FIELD_SERVICE` + `serviceOfCtxField` + " +
      '`validateCtxFieldRegistration` / `DriverDecl` + loud 校验 + 注册表 + `driversForTiming` / ' +
      '`driversForMoment` / 四元组 + `dedupeKey` / `timingOfSettle`）；② `next-registry/providers.ts` ' +
      '4,834 → **7,091（+2,257）**（10 行 `DRIVER_DECLS_SRC` + `registerBuiltinProviders` 内 idempotent ' +
      '注册接线）；③ `sidepanel.ts` / `recommend.ts` / `definition.ts` 本轮 **0 B**（类型 re-export 与 ' +
      '注释均被压缩器擦除）。**档位与绝对上限均未变**（`ceilTo50KB(554,576) = 563,200`、619,520），' +
      '生效上限 = `min(619,520, floor(554,576 × 1.05) = 582,304) = 582,304`。' +
      '**中间登记说明**：本叶 W4（TASK-V55-125）将在 S0 双面 + 法七扩展门禁 + 全门禁串行收口后按**最终产物**' +
      '再次登记（本条目逐字保留）。`dist/content.js` 177,076 B 与 `dist/pick-layer.js` 34,358 B ' +
      '**逐字节不变**；容差 5% 未动；`SIDEPANEL_CEILING_CAP` 保持 record-only；**断言零删减**' +
      '（新增 `driver-timings` / `driver-quadruple` / `driver-terminals` 三个受审 node 门禁）。',
    baselineBeforeBytes: 549_609,
    baselineAfterBytes: 554_576,
    ceilingBeforeBytes: 577_089,
    ceilingAfterBytes: 582_304,
    assertionNonRemovalEntries: ['V551-R1-SVOL-1'],
    historyRetainedBytes: [549_609, 547_558, 546_370, 542_064, 542_150],
    ceilingUncappedFormulaBytes: 582_304,
  },
  {
    id: 'v55-1-r2',
    direction: 'raised',
    roundKind: 'feature-round',
    feature: 'specs-tree-v55-1-driver-layer',
    date: '2026-09-23',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy:
      'SDDU V5.5-1 R2（2026-09-23，leaf specs-tree-v55-1-driver-layer；W3+W4 = TASK-V55-113~125；答案驱动化 + S0 双面 + no-dead-end 判据升级 + 法七扩展）',
    reason:
      '**本叶收口轮显式提升重登记：554,576 → 557,761 B（+3,185 B，+0.57%）**。' +
      '本轮唯一 `src` 改动面 = 答案驱动化 + 驱动者层判据（W3/W4）：① `next-registry/drivers.ts` ' +
      '2,662 → **3,307（+645）**（悬置任务登记 `registerSuspension` / `listSuspensions` / `resetSuspensions` + ' +
      '「答案不被丢弃」判据 `answerNotDropped` + 「静默窗口」三段读数 `silentWindowReading` + `SettleSource.force`）；' +
      '② `sidepanel.ts` 97,036 → **99,566（+2,530）**（`nextAfterSettle` 唯一结算入口 + `answered` 时机接线' +
      '（`applyRefAction` / `submitDescribe` / op-ask / 后台 ask 四条路径）+ 后台 ask 迟到口径（`bgAskIds` + ' +
      '`LATE_ASK_TEXT` + SW `settleOutcome` 的 late 事实）+ 悬置读数 seam）。`next-registry/terminals.ts` ' +
      '本**不进** sidepanel 包（终态词表是判定侧单源，生产只记来源键）⇒ 0 B。**档位与绝对上限均未变**' +
      '（`ceilTo50KB(557,761) = 563,200`、619,520），生效上限 = `min(619,520, floor(557,761 × 1.05) = 585,649) = 585,649`。' +
      '**收口说明**：本条目取代 R1 的**中间登记**（`v55-1-r1` 逐字保留）；真实 metafile 逐模块归因见 ' +
      '`SIDEPANEL_GROWTH_BREAKDOWN.v551R2Rows`（Σ 模块 +3,175 + glue +10 == +3,185）。' +
      '**预算口径诚实登记**：ADR-V55-011 §1 给本叶 7,000 B（上界 9,000），R1 已用 **+4,967**，本轮再 **+3,185** ' +
      '⇒ 本叶合计 **+8,152 B**，**超出叶预算 7,000 B（未越上界 9,000 B）**：超预算项如实登记，**未删判据 / ' +
      '未放宽容差 / 未静默降档**（减体积优先级 ADR-V55-011 §5 已核：文档注释打包时已被擦除，保留的都是判据本体与驱动语义）。' +
      '`dist/content.js` 177,076 B 与 `dist/pick-layer.js` 34,358 B **逐字节不变**；容差 5% 未动；' +
      '`SIDEPANEL_CEILING_CAP` 保持 record-only；**断言零删减**（新增 `s0-self-driven-chain` / `law7x-ext` ' +
      '两个受审 node 门禁 + `s0-self-driven` Chromium 面；`no-dead-end` / `law8` / `recommendation` / `ask-auth` 计数只增）。',
    baselineBeforeBytes: 554_576,
    baselineAfterBytes: 557_761,
    ceilingBeforeBytes: 582_304,
    ceilingAfterBytes: 585_649,
    assertionNonRemovalEntries: ['V551-R2-SVOL-1'],
    historyRetainedBytes: [554_576, 549_609, 547_558, 546_370, 542_064],
    ceilingUncappedFormulaBytes: 585_649,
  },
  /**
   * 〖V5.5-1 **review R1 修复轮**（2026-09-23，leaf specs-tree-v55-1-driver-layer；review R1 的
   * BLOCK-01/02 + I-01~03）〗**显式提升重登记：557,761 → 557,883 B（+122 B，+0.02%）**。
   *
   * 本轮唯一 `src` 改动 = `sidepanel.ts#submitAskFor` 的**后台 ask 取消守卫**（BLOCK-01）：
   * 真实的「后台 ask 被取消」（`data-act="cancel"` / 空值 ⇒ `submitAskFor(rid, undefined, true)`）
   * 过去会走 `.then()` 的登记分支，把取消记成 `answered-bg` 终态并驱动 `'answered'` —— 违反
   * FR-SELF-023 口径② / EC-SELF-005。修复 = 在 `registerSuspension` **之前**加
   * `if (isCanceled) { nextAfterSettle({ kind: 'settle', force: true }); return; }`（与 op 路同口径：
   * 取消走稳态驱动集，仍有接管者 ⇒ 非死端）。
   *
   * 真实 `dist/build-meta.json` bytesInOutput 逐模块归因（见 `SIDEPANEL_GROWTH_BREAKDOWN.v551FixRows`，
   * Σ 模块 **+122** + glue **0** == 登记增量 **+122**）：`sidepanel.ts` 99,566 → **99,688（+122）**；
   * 门禁面改动（`driver-quadruple` / `law7x-ext` / `l1-ref-validity` / `s0-self-driven.mjs`）**不进 bundle** ⇒ 0 B。
   *
   * **档位与绝对上限均未变**（`ceilTo50KB(557,883) = 563,200`、绝对上限 619,520），生效上限 =
   * `min(619,520, floor(557,883 × 1.05) = 585,777) = 585,777`。`dist/content.js` 177,076 B（sha `52a82620…`）
   * 与 `dist/pick-layer.js` 34,358 B（sha `77796bab…`）**逐字节不变**；容差 5% 未动；
   * `SIDEPANEL_CEILING_CAP` 保持 record-only；**断言零删减**（新增 2 条 node 用例 +
   * `no-dead-end`/`s0-self-driven` Chromium 面 check 只增；恒真断言 `|| true` 被**删除并替换为真实断言**，
   * 属判据力**上升**）。
   *
   * **预算口径诚实登记**：ADR-V55-011 §1 给本叶 7,000 B（上界 9,000），R1 用 **+4,967**、R2 用 **+3,185**、
   * 本轮再 **+122** ⇒ 本叶合计 **+8,274 B**，仍**超出叶预算 7,000 B（未越上界 9,000 B）**：如实登记，
   * **未删判据 / 未放宽容差 / 未静默降档**。
   */
  {
    id: 'v55-1-fix',
    direction: 'raised',
    roundKind: 'registry-fidelity-round',
    feature: 'specs-tree-v55-1-driver-layer',
    date: '2026-09-23',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy:
      'SDDU V5.5-1 review R1 修复轮（2026-09-23，leaf specs-tree-v55-1-driver-layer；review R1 的 BLOCK-01/02 + I-01~03）',
    reason:
      '**review R1 修复轮显式提升重登记：557,761 → 557,883 B（+122 B，+0.02%）**。' +
      '唯一 `src` 改动面 = BLOCK-01 的后台 ask **取消守卫**（`sidepanel.ts#submitAskFor` 的 ' +
      '`rid && !isRef` 分支：`isCanceled` ⇒ `nextAfterSettle({ kind: \'settle\', force: true })` + ' +
      '`return`，**不登记悬置、不驱动 `answered`**）；真实 metafile 逐模块归因见 ' +
      '`SIDEPANEL_GROWTH_BREAKDOWN.v551FixRows`（Σ 模块 +122 + glue 0 == +122）。' +
      'BLOCK-02（取代台账 X-SELF-2/4/5/6 + X-SELF-1 未发生取代）与 I-01~03 全在门禁/台账面，**零字节**。' +
      '**档位与绝对上限均未变**（`ceilTo50KB(557,883) = 563,200`、619,520），生效上限 = ' +
      '`min(619,520, floor(557,883 × 1.05) = 585,777) = 585,777`。`dist/content.js` 177,076 B 与 ' +
      '`dist/pick-layer.js` 34,358 B **逐字节不变**；容差 5% 未动；`SIDEPANEL_CEILING_CAP` 保持 record-only；' +
      '**断言零删减**（唯一被删的断言是恒真断言 `|| true`，替换为真实断言 = 判据力上升）。' +
      '**预算口径诚实登记**：本叶合计 **+8,274 B**（R1 +4,967 / R2 +3,185 / 本轮 +122）仍超叶预算 7,000 B、未越上界 9,000 B。',
    baselineBeforeBytes: 557_761,
    baselineAfterBytes: 557_883,
    ceilingBeforeBytes: 585_649,
    ceilingAfterBytes: 585_777,
    assertionNonRemovalEntries: ['V551-FIX-SVOL-1', 'X-SELF-2', 'X-SELF-4', 'X-SELF-5', 'X-SELF-6'],
    historyRetainedBytes: [557_761, 554_576, 549_609, 547_558, 546_370],
    ceilingUncappedFormulaBytes: 585_777,
  },
  /**
   * 〖V5.5-2 R1（2026-09-23，leaf specs-tree-v55-2-deterministic-onboarding；W1~W4 = TASK-V55-201~212）〗
   * **中间登记**（W5 TASK-V55-216 按最终产物再登记）。主题①「确定性系统流」：`isLlmConfigured` 3 字段判据
   * （落 `src/llm/status.ts` ⇒ SW bundle，`sidepanel.js` **零字节**）+ `runChat` 前置判据（先于 `providerChat`、
   * 先于 `chatBusy = true`）+ `chat-result` 的 `variant` **type-only** 扩成员（`KIND_SET` 40 逐字不动）+
   * 双源并存（主动识别折叠进既有 `risk` 源，恢复链零改写）+ 引导流 4 步单源（`onboarding-flow.ts`）+
   * 悬置任务单源（`suspension.ts`：`MAX_SUSPENSIONS = 1` + 有效期重校验）+ 配置完成自动续接（`pipeline.ts`
   * 结算收口后通知 ⇒ 回执在前、续接在后）。`content.js` / `pick-layer.js` 逐字节不变。
   */
  {
    id: 'v55-2-r1',
    direction: 'raised',
    roundKind: 'feature-round',
    feature: 'specs-tree-v55-2-deterministic-onboarding',
    date: '2026-09-23',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy:
      'SDDU V5.5-2 R1 build（2026-09-23，leaf specs-tree-v55-2-deterministic-onboarding；W1~W4 = TASK-V55-201~212）',
    reason:
      '**主题① R1 显式提升重登记（中间登记）：557,883 → 562,273 B（+4,390 B，+0.79%）**。' +
      '真实 metafile 逐模块归因见 `SIDEPANEL_GROWTH_BREAKDOWN.v552R1Rows`（Σ 模块 +4,293 + glue +97 == +4,390）：' +
      '`sidepanel.ts` 99,688 → **101,042（+1,354）**（主动识别分支 + 悬置登记 + `resumeAfterConfig` + `opSettled` 接线）；' +
      'NEW `onboarding-flow.ts` **1,280**（引导流 4 步单源）；NEW `suspension.ts` **1,421**（悬置三要素 + MAX=1 + 有效期重校验 + 续接决策）；' +
      '`next-registry/ops.ts` 7,072 → **7,155（+83）**（`opSettled` 结算后缝）；`next-registry/pipeline.ts` 3,860 → **3,908（+48）**（结算收口后通知，回执在前/续接在后）。' +
      '**档位与绝对上限均未变**（`ceilTo50KB(562,273) = 563,200`、619,520）⚠️ **距档位仅 927 B**；生效上限 = ' +
      '`min(619,520, floor(562,273 × 1.05) = 590,386) = 590,386`。`dist/content.js` 177,076 B 与 ' +
      '`dist/pick-layer.js` 34,358 B **逐字节不变**；容差 5% 未动；`SIDEPANEL_CEILING_CAP` 保持 record-only；断言零删减。' +
      '**预算口径诚实登记**：本叶预算 4,900 B（上界 6,300）⇒ R1 用 +4,390 B，**未越预算、未越上界、未越档位**；' +
      '剩余档位余量 927 B —— W5（TASK-V55-216）收口登记时若再增即越档位，须按 ADR-V55-011 §4 显式升档（不停机）。',
    baselineBeforeBytes: 557_883,
    baselineAfterBytes: 562_273,
    ceilingBeforeBytes: 585_777,
    ceilingAfterBytes: 590_386,
    assertionNonRemovalEntries: ['V552-R1-SVOL-1'],
    historyRetainedBytes: [557_883, 557_761, 554_576, 549_609],
    ceilingUncappedFormulaBytes: 590_386,
  },
  /**
   * 〖V5.5-2 R2（2026-09-23，W5 = TASK-V55-213~216）—— **本叶最终登记**〗
   *
   * 两场景单源（首装 / 已装未配 ⇒ 同一条配置引导；已配置 ⇒ 零引导）+「取消引导 ⇒ 同因不重复」
   * 去重键（`suppressOnboardCause` / `declinedOnboardCauses`；取消**非死端**：force 求值 ⇒ 可达 next）
   * + **掩码参数 ask 的 resolver 归属修正**（`submitAskFor` 的 op 分支不再先删 resolver ⇒
   * `submitSecret` 才能拿到它并交付值 ⇒ `op.llm-config` 首次可真正走到 consent / complete ⇒
   * 自动续接真的发生；R1 只机核了源码序，运行期这条链是断的）。
   *
   * 档位**未越**：`ceilTo50KB(563,145) = 563,200`（距档位 **55 B**）与绝对上限 619,520 均未变
   * ⇒ 本轮**无需**按 ADR-V55-011 §4 升档；生效上限 = `min(619,520, floor(563,145 × 1.05) = 591,302) = 591,302`。
   */
  {
    id: 'v55-2-r2',
    direction: 'raised',
    roundKind: 'feature-round',
    feature: 'specs-tree-v55-2-deterministic-onboarding',
    date: '2026-09-23',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy:
      'SDDU V5.5-2 R2 build（2026-09-23，leaf specs-tree-v55-2-deterministic-onboarding；W5 = TASK-V55-213~216）',
    reason:
      '**主题① R2 显式提升重登记（本叶最终登记）：562,273 → 563,145 B（+872 B，+0.16%）**。' +
      '真实 metafile 逐模块归因见 `SIDEPANEL_GROWTH_BREAKDOWN.v552R2Rows`（Σ 模块 +872 + glue **0** == +872）：' +
      '`next-registry/onboarding-flow.ts` 1,280 → **1,722（+442）**（两场景单源 + 同因去重的纯判据）；' +
      '`sidepanel.ts` 101,042 → **101,472（+430）**（去重键接线 + `submitAskFor` 的 op 分支 resolver 归属修正）。' +
      '**档位与绝对上限均未变**（`ceilTo50KB(563,145) = 563,200`、619,520）⚠️ **距档位仅 55 B**（不再越档 ⇒ 不需显式升档）；' +
      '生效上限 = `min(619,520, floor(563,145 × 1.05) = 591,302) = 591,302`。`dist/content.js` 177,076 B 与 ' +
      '`dist/pick-layer.js` 34,358 B **逐字节不变**；容差 5% 未动；`SIDEPANEL_CEILING_CAP` 保持 record-only；断言零删减。' +
      '**预算口径诚实登记**：本叶预算 4,900 B / 上界 6,300 B；R1 +4,390 + R2 +872 = **+5,262 B** ⇒ ' +
      '**超出叶预算 362 B**（未越叶上界 6,300 B，未越档位）——按「质量优先 + 显式登记」处置，不静默。',
    baselineBeforeBytes: 562_273,
    baselineAfterBytes: 563_145,
    ceilingBeforeBytes: 590_386,
    ceilingAfterBytes: 591_302,
    assertionNonRemovalEntries: ['V552-R2-SVOL-1'],
    historyRetainedBytes: [562_273, 557_883, 557_761, 554_576],
    ceilingUncappedFormulaBytes: 591_302,
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
  measuredOn: '2026-09-23',
  /** The baseline whose **tree** this breakdown compares against (v3-1 I6). */
  baselineReferenceBytes: 295_225,
  /**
   * 累计：当前基线 − `baselineReferenceBytes`（**557,883 − 295,225 = 262,658**；
   * V5.5-1 review R1 修复轮为 557,761 − 295,225 = 262,536 再加本轮 +122）。
   */
  deltaBytes: 267_920,
  /**
   * **最新一轮**的产物增量 = `SIDEPANEL_BASELINE_BYTES − 上一轮登记值`（`size-growth-evidence.test.ts` 直接机核该等式）。
   * 〖R4 缺陷修复轮（2026-09-22）〗最新一轮 = `r4-selector-fix` ⇒ 本字段 = `549,609 − 547,558 = **2,051**`
   *   （逐模块归因见 `SIDEPANEL_GROWTH_BREAKDOWN.r4SelectorFixRows`）。更早语义（V5-2 收口轮 = `542,064 − 542,150 = −86`，首个净减轮）逐字保留在下面。
   * 〖V5-2 收口轮（2026-09-22）〗最新一轮 = `v5-2-closeout` ⇒ 本字段 = `542,064 − 542,150 = **−86**`
   * （**首个净减轮**：`sidepanel.ts#permRequest` 删去重复写，见 `SIDEPANEL_GROWTH_BREAKDOWN.v52CloseoutRows`）。
   * 更早语义（v4-2 起「最新一轮」= `SIDEPANEL_BASELINE_BYTES − 385,319`）随轮次前移，历史值逐字保留在下段。
   *
   * 〖I-10（v4-2 review 修复轮）〗本字段原先的 doc-comment 仍写「最近一轮（v4-1 三区骨架自身）375,102 → 385,319，
   * Σ+10,075+142」，与字段现值（v4-2 轮的 40,123）**脱节** —— 现按实测重写：v4-2 轮（含 review 修复轮）
   * 385,319 → **425,094 B**，Σ 模块 **+39,381** + 未归因胶水 **+394** == **+39,775**（build 轮登记的
   * 425,442 B / 40,123 作为历史值逐字保留在 `SIDEPANEL_RE_REGISTRATIONS['v4-2'].reason` 与
   * `v42RoundRows` 的注释里）。v4-1 轮自身的增量（375,102 → 385,319，Σ+10,075 + 142）
   * 逐字保留在 {@link SIDEPANEL_GROWTH_BREAKDOWN.v41RoundRows} 的注释与 `v41RoundUnattributedGlueBytes`。
   */
  closeoutDeltaBytes: 872,
  newRequiredModuleBytes: 185_354,
  // R2（+277：chat-state 的自动归并接线）+ 审查修复轮（+12,846）+ 快修轮（+734：sidepanel 首装推荐接线）
  // + 收口轮（+124：`projectRef` 唯一性键）+ V5-1 R1（−303：sidepanel 集 B 瘦身）计入接线桶；
  // 〖V5-2 R1/R2/reviewfix 修复轮 + 收口轮〗接线桶按各轮 sidepanel.ts 归因前移；
  // 〖R4 缺陷修复轮（2026-09-22）〗新增 2,051 B 按模块桶分摊：新必需桶 += 1,052（ref-validity +742 /
  //   pick-input +90 / ref-store +220），接线桶 += 999（sidepanel.ts 的捕获回环校验 + 展示层接线）；
  // 〖V5.5-1 R2（2026-09-23，W3+W4 收口轮）〗新增 +3,185 B 全部落在**既有模块的接线桶**
  //   （drivers.ts +645 / sidepanel.ts +2,530 = +3,175；余 10 B 为本轮未归因胶水，进 `unattributedHelperDeltaBytes`）。
  // 〖V5.5-1 review R1 修复轮（2026-09-23）〗新增 +122 B 全部落在**既有模块的接线桶**
  //   （sidepanel.ts 99,566 → 99,688；glue 0，`unattributedHelperDeltaBytes` 不变）。
  // 桶和 = newRequiredModuleBytes 181,921 + wiringBytes 78,814 + 0 + 1,923 == 262,658 == `deltaBytes`。
  wiringBytes: 80_598,
  attributionShiftBytes: 0,
  /**
   * 未归因运行时胶水：`deltaBytes − Σ(rows.deltaBytes)`（review 修复轮后实测 **1,060 B** = 累计增量 129,869 的 **0.82%**；
   * build 轮同为 1,060 B / v4-1 为 598 B）。随输入模块数（57 → 69）自然增长，仍远小于任何一层的实现字节。
   *
   * 〖v4-2 review 修复轮〗修复轮的真实产物减重（−348 B）**全部落在 rows 上**（代码删除 −280 + 本轮口径胶水 −68），
   * 但 `view-model.ts` 的 esbuild **分摊位移** −68 B 同时被重算（19,654 → 19,586），因此本字段（= delta − Σrows）
   * 回到与 build 轮相同的 1,060 B；`attributionShiftBytes` 265 与「未解释字节 <1,500 ∧ <2%」判据不变（实测 1,325 / 1.02%）。
   */
  unattributedHelperDeltaBytes: 1_968,
  /** 模块路径互不相同（无重复模块）；共享 v2 模块增量为 0（复用非复制）。 */
  duplicationCheck:
    '输入模块数 **88**（真实 `dist/build-meta.json` 实测；v3-1 为 41 / v3-2 为 47 / v3-3 为 52 / v3-4 为 53 / R1·R2·R3 均为 53 不新增；**v4-1 新增 4 个必需模块** toolbar + theme + density-scope + statusbar ⇒ 53 + 4 = **57**；**v4-2 再新增 12 个必需模块**（stream-* × 3 + cards/* × 9）⇒ 57 + 12 = **69**；**v4-3 净增 2 个**（新增 stream-plaintext + cards/askuser + cards/auth，退役 l0/decision-card）⇒ 69 + 2 = **71**；**v4-4 净增 4 个必需模块**（system-events + recommend + cards/ref + cards/nextstep）⇒ 71 + 4 = **75**；**v4-4 审查修复轮再新增 1 个必需模块**（`host-registry.ts`：结构宿主注册表）⇒ 75 + 1 = **76**；**V5-1 R1 新增 5 个必需模块**（`next-registry/{definition,registry,pipeline,providers,dispatch}.ts`：Definition / Provider / 管线 / 内置 provider / 瘦分发）⇒ 78 + 5 = **83**；**V5-2 R1/R2 再新增 3 个必需模块**（`shared/op-table.ts` 双侧同源描述符表 + `next-registry/ops.ts` 9 op 执行体 + `next-registry/snapshot.ts` 三表快照）⇒ 83 + 3 = **86**；**V5-2 review R1 修复轮再新增 1 个必需模块**（`settings/op-bodies.ts`：与面无关的四类执行体，面板与 options 共用）⇒ 86 + 1 = **87**；**V5.5-1 R1 再新增 1 个必需模块**（`next-registry/drivers.ts`：驱动者声明单源 + 四元组 + `CTX_FIELD_SERVICE`）⇒ 87 + 1 = **88**；**V5.5-2 R1 再新增 2 个必需模块**（`next-registry/onboarding-flow.ts`：引导流恰 4 步单源 + `next-registry/suspension.ts`：配置悬置任务单源 + `MAX_SUSPENSIONS = 1`）⇒ 88 + 2 = **90**，见本文件 SIDEPANEL_GROWTH_BREAKDOWN.rows），路径互不相同；共享模块 src/ui/tree/tree-receipt.ts Δ=0 B 与 ' +
    'src/insight/ownership-tree.ts（首次被侧栏 bundle 引用 → 共享而非复制）—— 审计/命令目录/树视图复用既有投影模块；' +
    'l2/{counts,view-host,command-catalog,audit}.ts 与 settings/sections.ts 与 ui/sidepanel/pick-input.ts 各只有**一份**实现（v3-4 的页面侧代码全部在 ' +
    '独立 artifact `dist/pick-layer.js`，不重复进本 bundle）；R1 不新增模块 —— 六处改动全部落在既有模块（ref-validity / sidepanel / pick-input / ref-store / chat-state / view-model），' +
    '声明状态的**唯一**生产者仍是 SW 的 `declarationEnv()`（面板只透传，无第二套状态机）；' +
    'R2 只改既有 4 个模块（view-model / sidepanel / risk-rail / shell），退避调度器在 `src/discovery/auto-probe.ts`（**service-worker bundle**，不进本产物）—— 没有任何被复制的第二份实现；' +
    'R3 只改既有 5 个模块（pick-input / sidepanel / ref-validity / panels / ref-store；R3 段输入模块数仍 53 —— 不新增模块），只读探测在 `src/background/ref-rescue.ts`（**service-worker bundle**，不进本产物）—— 同样没有任何被复制的第二份实现。' +
    '〖review 修复轮 I8〗本字段原记「输入模块数 53 … R2 仍是 53」而真实 metafile 的 inputs 已随 v4-1 变为 **57**；已按实测订正，并由 `test/size-growth-evidence.test.ts` 增加「`Object.keys(inputs).length` == 登记输入模块数」的联动断言（登记值与真实 metafile 不得脱钩）。',
  /**
   * 真实 `dist/build-meta.json` 的 `inputs` 条目数（**机核值**，review 修复轮 I8）。
   * `duplicationCheck` 的散文里写「输入模块数 75」；这个字段让数字可被 metafile 直接核对
   * （`size-growth-evidence.test.ts`：`Object.keys(inputs).length === duplicationCheckInputModuleCount`）。
   */
  duplicationCheckInputModuleCount: 90,
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
   * **v4-3 轮的逐模块增量**（v4-2 收口轮树 426,487 B → 当前树 440,396 B，真实 metafile）。
   * `afterBytes` 取自真实 `dist/build-meta.json`；`beforeBytes` 取 v4-2 收口轮登记值。
   * Σ(Δ)=15,594；登记增量 = 440,396 − 426,487 = 13,909；未归因胶水 = −1,685（提取/新增模块改变了
   * esbuild 的分摊，共享模块的字节下降落在 `cards/shared.ts` 的 attribution-shift 行）。
   */
  v43RoundRows: [
    { module: 'src/ui/sidepanel/stream-plaintext.ts', beforeBytes: null, afterBytes: 1_961, deltaBytes: 1_961 },
    { module: 'src/ui/sidepanel/cards/askuser.ts', beforeBytes: null, afterBytes: 5_595, deltaBytes: 5_595 },
    { module: 'src/ui/sidepanel/cards/auth.ts', beforeBytes: null, afterBytes: 6_047, deltaBytes: 6_047 },
    { module: 'src/ui/sidepanel/stream-model.ts', beforeBytes: 6_908, afterBytes: 9_654, deltaBytes: 2_746 },
    { module: 'src/ui/sidepanel/chat-state.ts', beforeBytes: 9_953, afterBytes: 12_793, deltaBytes: 2_840 },
    { module: 'src/ui/sidepanel/sidepanel.ts', beforeBytes: 62_689, afterBytes: 65_099, deltaBytes: 2_410 },
    { module: 'src/ui/sidepanel/l0/shell.ts', beforeBytes: 4_158, afterBytes: 6_229, deltaBytes: 2_071 },
    { module: 'src/ui/sidepanel/view-model.ts', beforeBytes: 19_586, afterBytes: 19_895, deltaBytes: 309 },
    { module: 'src/ui/sidepanel/cards/index.ts', beforeBytes: 9_586, afterBytes: 3_767, deltaBytes: -5_819 },
    { module: 'src/ui/sidepanel/cards/shared.ts', beforeBytes: 4_436, afterBytes: 2_172, deltaBytes: -2_264 },
  ],
  v43RoundUnattributedGlueBytes: -1_685,
  /**
   * **v4-3 审查修复轮自身的逐模块增量**（v4-3 功能轮树 440,698 B → 审查修复轮树 444,962 B）。
   * `beforeBytes` = {@link SIDEPANEL_GROWTH_BREAKDOWN.v43RoundRows} 登记的 v4-3 功能轮 `afterBytes`；
   * `afterBytes` 取自真实 `dist/build-metadata.json`。Σ(Δ)=5,898；登记增量 = 445,300 − 440,698 = 4,602；
   * 未归因胶水 = **−1,296**（互斥披露/去重让若干既有行的分摊下降，落在胶水项）。
   *
   * 本轮全部改动都服务于评审阻塞/改进项（BLOCK-01~04 + I-01~I-08），无新增输入模块
   * （`duplicationCheckInputModuleCount` 仍为 75），无新权限、无 SW/KIND_SET/manifest 改动。
   */
  v43ReviewfixRows: [
    { module: 'src/ui/sidepanel/stream-plaintext.ts', beforeBytes: 1_961, afterBytes: 3973, deltaBytes: 2012 },
    { module: 'src/ui/sidepanel/cards/askuser.ts', beforeBytes: 5_595, afterBytes: 6631, deltaBytes: 1036 },
    { module: 'src/ui/sidepanel/cards/auth.ts', beforeBytes: 6_047, afterBytes: 6200, deltaBytes: 153 },
    { module: 'src/ui/sidepanel/stream-model.ts', beforeBytes: 9_654, afterBytes: 9727, deltaBytes: 73 },
    { module: 'src/ui/sidepanel/chat-state.ts', beforeBytes: 12_793, afterBytes: 13848, deltaBytes: 1055 },
    { module: 'src/ui/sidepanel/sidepanel.ts', beforeBytes: 65_099, afterBytes: 66354, deltaBytes: 1255 },
    { module: 'src/ui/sidepanel/l0/shell.ts', beforeBytes: 6_229, afterBytes: 5934, deltaBytes: -295 },
    { module: 'src/ui/sidepanel/view-model.ts', beforeBytes: 19_586, afterBytes: 20181, deltaBytes: 595 },
    { module: 'src/ui/sidepanel/cards/index.ts', beforeBytes: 3_767, afterBytes: 3781, deltaBytes: 14 },
    { module: 'src/ui/sidepanel/cards/shared.ts', beforeBytes: 2_172, afterBytes: 2172, deltaBytes: 0 },
  ],
  /** v4-3 审查修复轮的未归因运行时胶水：Σ 模块增量 5,898 − 登记增量 4,602 = **−1,296**。 */
  v43ReviewfixUnattributedGlueBytes: -1_296,
  /**
   * V4-4（TASK-801~812）逐模块增量 —— **最新一轮**（`closeoutDeltaBytes` 语义：
   * 465,000 − 445,300 = +19,700 B）。四个新必需模块（system-events / recommend /
   * cards/ref / cards/nextstep = +12,388）+ 十一个接线模块（含退役 #l0-pick 与过渡宿主
   * 清零带来的收缩）+ 未归因胶水 +1200；Σ(deltaBytes) 由 `size-growth-evidence.test.ts` 的
   * N-05 组判据（Σ + glue == 登记增量）与 metafile 逐模块对照双向机核。
   */
  v44RoundRows: [
    { module: 'src/ui/sidepanel/system-events.ts', beforeBytes: null, afterBytes: 3730, deltaBytes: 3730 },
    { module: 'src/ui/sidepanel/recommend.ts', beforeBytes: null, afterBytes: 4032, deltaBytes: 4032 },
    { module: 'src/ui/sidepanel/cards/ref.ts', beforeBytes: null, afterBytes: 3276, deltaBytes: 3276 },
    { module: 'src/ui/sidepanel/cards/nextstep.ts', beforeBytes: null, afterBytes: 1350, deltaBytes: 1350 },
    { module: 'src/ui/sidepanel/sidepanel.ts', beforeBytes: 66354, afterBytes: 72583, deltaBytes: 6229 },
    { module: 'src/ui/sidepanel/chat-state.ts', beforeBytes: 13848, afterBytes: 15838, deltaBytes: 1990 },
    { module: 'src/ui/sidepanel/view-model.ts', beforeBytes: 20181, afterBytes: 20690, deltaBytes: 509 },
    { module: 'src/ui/sidepanel/l1/ref-store.ts', beforeBytes: 4201, afterBytes: 5443, deltaBytes: 1242 },
    { module: 'src/ui/sidepanel/l1/panels.ts', beforeBytes: 16154, afterBytes: 14654, deltaBytes: -1500 },
    { module: 'src/ui/sidepanel/l0/shell.ts', beforeBytes: 5934, afterBytes: 5710, deltaBytes: -224 },
    { module: 'src/ui/sidepanel/cards/index.ts', beforeBytes: 3781, afterBytes: 1559, deltaBytes: -2222 },
    { module: 'src/ui/sidepanel/pick-input.ts', beforeBytes: 8259, afterBytes: 8332, deltaBytes: 73 },
    { module: 'src/ui/sidepanel/stream-render.ts', beforeBytes: 2489, afterBytes: 2495, deltaBytes: 6 },
    { module: 'src/ui/sidepanel/toolbar.ts', beforeBytes: 3111, afterBytes: 3117, deltaBytes: 6 },
    { module: 'src/ui/sidepanel/theme.ts', beforeBytes: 2937, afterBytes: 2940, deltaBytes: 3 },
  ] as const,
  /** V4-4 轮的未归因胶水（esbuild 分账噪声；小于 1% 输出）。 */
  v44RoundUnattributedGlueBytes: 1200,
  /**
   * 〖V4-4 R2（2026-09-19，KL-V44-01 裁决落地轮）〗逐模块归因：**一行**——
   * `465,277 − 465,000 = +277 B` 全部来自 `chat-state.ts`（自动归并接线：`reduce()` 透传
   * 归约前状态 + `streamBranch` 的 `case 'state'` / `case 'notice'`），未归因胶水 **0**。
   * `afterBytes` 由 `size-growth-evidence.test.ts` 与真实 metafile 逐模块机核。
   */
  v44R2Rows: [
    { module: 'src/ui/sidepanel/chat-state.ts', beforeBytes: 15838, afterBytes: 16115, deltaBytes: 277 },
  ] as const,
  /** V4-4 R2 轮的未归因胶水（单模块改动，实测 0）。 */
  v44R2UnattributedGlueBytes: 0,
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
    v43RoundRows: 'v4-3',
    v43ReviewfixRows: 'v4-3-reviewfix',
    v44RoundRows: 'v4-4',
    // 〖V4-4 R2〗同一叶的裁决落地轮（最新一轮 = 本组；其 afterBytes 必须等于真实 metafile）。
    v44R2Rows: 'v4-4-r2',
    // 〖V4-4 审查修复轮〗
    v44ReviewfixRows: 'v4-4-reviewfix',
    // 〖V4-4 快修轮（I-09~I-11）〗
    v44I09fixRows: 'v4-4-i09fix',
    // 〖V4-4 收口轮（F-01 + N-01~N-05）〗最新一轮 = 本组（其 afterBytes 必须等于真实 metafile）。
    v44CloseoutRows: 'v4-4-closeout',
    // 〖F 还原度快修轮（FIX-1~FIX-4）〗最新一轮 = 本组（其 afterBytes 必须等于真实 metafile）。
    fFidelityFixRows: 'f-fidelity-fix',
    v45W1W2Rows: 'v45-1-w2',
    v45W3Rows: 'v45-1-w3',
    // 〖V4.5-1 review R1 修复轮（BLOCK-01~04 + I-01~06）〗
    v45ReviewfixRows: 'v45-1-reviewfix',
    // 〖V5-1 R1（TASK-V5-101~113）〗最新一轮 = 本组（其 afterBytes 必须等于真实 metafile）。
    v51R1Rows: 'v5-1-r1',
    // 〖V5-2 R1（TASK-V5-123~137；编排器裁决① 显式升档）〗
    v52R1Rows: 'v5-2-r1',
    // 〖V5-2 R2（TASK-V5-138~152）〗最新一轮 = 本组。
    v52R2Rows: 'v5-2-r2',
    v52ReviewfixRows: 'v5-2-reviewfix',
    // 〖V5-2 收口轮（2026-09-22，validate R1 的 N-01 + N-04~N-09 / KL-N-10 登记）〗最新一轮 = 本组（首个净减轮）。
    v52CloseoutRows: 'v5-2-closeout',
    // 〖V5-3 R2（2026-09-22，TASK-V5-153~176；末叶 / 收口叶 + 三叶合计终轮）〗
    v53Rows: 'v5-3-r2',
    // 〖V5-3 review R1 修复轮（2026-09-22）〗
    v53FixRows: 'v5-3-reviewfix',
    // 〖R4 缺陷修复轮（2026-09-22）〗
    r4SelectorFixRows: 'r4-selector-fix',
    // 〖V5.5-1 R1（2026-09-23，W1+W2 驱动者层底座轮）〗
    v551R1Rows: 'v55-1-r1',
    // 〖V5.5-1 R2（2026-09-23，W3+W4 收口轮）〗
    v551R2Rows: 'v55-1-r2',
    // 〖V5.5-1 review R1 修复轮（2026-09-23，BLOCK-01/02 + I-01~03）〗**最新一轮** = 本组（其 afterBytes 必须等于真实 metafile）。
    v551FixRows: 'v55-1-fix',
    v552R1Rows: 'v55-2-r1',
    v552R2Rows: 'v55-2-r2',
  } as Readonly<Record<string, string>>,
  v44ReviewfixRows: [
    { module: 'src/ui/sidepanel/sidepanel.ts', beforeBytes: 72583, afterBytes: 78892, deltaBytes: 6309 },
    { module: 'src/ui/sidepanel/view-model.ts', beforeBytes: 20690, afterBytes: 21322, deltaBytes: 632 },
    { module: 'src/ui/sidepanel/system-events.ts', beforeBytes: 3730, afterBytes: 4301, deltaBytes: 571 },
    { module: 'src/ui/sidepanel/l1/ref-store.ts', beforeBytes: 5443, afterBytes: 5949, deltaBytes: 506 },
    { module: 'src/ui/sidepanel/stream-model.ts', beforeBytes: 9727, afterBytes: 9221, deltaBytes: -506 },
    { module: 'src/ui/sidepanel/chat-state.ts', beforeBytes: 16115, afterBytes: 16917, deltaBytes: 802 },
    { module: 'src/ui/sidepanel/recommend.ts', beforeBytes: 4032, afterBytes: 3993, deltaBytes: -39 },
    { module: 'src/ui/sidepanel/cards/ref.ts', beforeBytes: 3276, afterBytes: 3298, deltaBytes: 22 },
    { module: 'src/ui/sidepanel/l1/panels.ts', beforeBytes: 14654, afterBytes: 14460, deltaBytes: -194 },
    { module: 'src/ui/sidepanel/pick-input.ts', beforeBytes: 8332, afterBytes: 8315, deltaBytes: -17 },
    { module: 'src/ui/sidepanel/host-registry.ts', beforeBytes: null, afterBytes: 4760, deltaBytes: 4760 },
  ] as const,
  v44I09fixRows: [
    // 唯一 `src` 改动：`sidepanel.ts` 的「首装」推荐时机真实接线（I-09）；Σ 734 + glue 0 == 478,897 − 478,163。
    { module: 'src/ui/sidepanel/sidepanel.ts', beforeBytes: 78892, afterBytes: 79626, deltaBytes: 734 },
  ] as const,
  /** 〖V4-4 快修轮（2026-09-20，review R2 I-09~I-11）〗未归因胶水 = 0（单模块，Δ 逐字节相等）。 */
  v44I09fixUnattributedGlueBytes: 0,
  /**
   * 〖V4-4 收口轮（2026-09-20，validate R1 的 F-01 + N-01~N-05）〗逐模块归因：**一行** ——
   * `479,021 − 478,897 = +124 B` 全部来自 `sidepanel.ts#projectRef` 的投影唯一性键改为
   * `refNum + 状态`（F-01）；N-01~N-05 为登记/口径项，**零字节**。未归因胶水 **0**。
   * `afterBytes` 由 `size-growth-evidence.test.ts` 与真实 metafile 逐模块机核。
   */
  v44CloseoutRows: [
    // 唯一 `src` 改动：`sidepanel.ts` 的 F-01 修复（同序号卡唯一）；Σ 124 + glue 0 == 479,021 − 478,897。
    { module: 'src/ui/sidepanel/sidepanel.ts', beforeBytes: 79626, afterBytes: 79750, deltaBytes: 124 },
  ] as const,
  /** 〖V4-4 收口轮〗未归因胶水 = 0（单模块，Δ 逐字节相等）。 */
  v44CloseoutUnattributedGlueBytes: 0,
  /**
   * 〖F 还原度快修轮（2026-09-20，真机首屏评估的 FIX-1~FIX-4）〗逐模块归因：
   * `479,021 → 480,026 B（+1,005 B）`。**最新一轮** —— 其 `afterBytes` 由
   * `size-growth-evidence.test.ts` 与真实 metafile 逐模块机核。
   *   · FIX-1 授权 chip 直达授权流：`recommend.ts` act 闭集 + `authorize` + `sidepanel.ts` 抽出
   *     `authorizeCurrentSite()` 单一入口（授权是浏览器权限流，不是聊天回合）；
   *   · FIX-2 过时空间指引文案订正（`view-model.ts` onboarding 步骤等，指向 v4-4 后真实入口）；
   *   · FIX-3 工具栏摘要回归 F 契约：`view-model.ts#toolbarDigest` = origin · 授权态 · 会话
   *     （计数收敛为两处）；`l2/counts.ts` 的 `l2StatusBarText` 退出生产路径被**树摇**（−409）；
   *   · FIX-4 决策槽 kicker 语义收敛：`L0_KICKER` = 决策 · 回执 · 引用，`l0/shell.ts` 改读常量（−130）。
   * Σ 模块 **+1,005** + 未归因胶水 **0** == 登记增量 **+1,005**。
   */
  fFidelityFixRows: [
    { module: 'src/ui/sidepanel/view-model.ts', beforeBytes: 21322, afterBytes: 22552, deltaBytes: 1230 },
    { module: 'src/ui/sidepanel/sidepanel.ts', beforeBytes: 79750, afterBytes: 79865, deltaBytes: 115 },
    { module: 'src/ui/sidepanel/recommend.ts', beforeBytes: 3993, afterBytes: 4192, deltaBytes: 199 },
    { module: 'src/ui/sidepanel/l2/counts.ts', beforeBytes: 2932, afterBytes: 2523, deltaBytes: -409 },
    { module: 'src/ui/sidepanel/l0/shell.ts', beforeBytes: 5710, afterBytes: 5580, deltaBytes: -130 },
  ] as const,
  /** 〖F 还原度快修轮〗未归因胶水 = 0 B（五处改动逐模块可归因，Σ +1,005 == 登记增量）。 */
  fFidelityFixUnattributedGlueBytes: 0,
  /**
   * 〖V4.5-1 R1（2026-09-21，W1+W2 = TASK-V45-101~106）〗逐模块归因：
   * `480,026 → 480,896 B（+870 B，+0.18%）`。**最新一轮** —— 其 `afterBytes` 由
   * `size-growth-evidence.test.ts` 与真实 metafile 逐模块机核。
   *   · `host-registry.ts` 4,760 → 5,865（+1,105）：单写契约重构 + `evaluateStripChannels()` + `strips` 宿主退役；
   *   · `chat-state.ts` 16,917 → 17,200（+283）：`systemRow` 落 `systemKind`/`systemTitle`；
   *   · `cards/system.ts` 1,035 → 1,219（+184）：渲染 `data-kind` + 行 `title`；
   *   · `stream-plaintext.ts` 3,973 → 4,140（+167）：`plaintextTitle()`（NFR-V45-003 / R-REG-901）；
   *   · `settings/panel.ts` 37,118 → 37,310（+192）：站点分区详情（与流内行 `title` 同源）；
   *   · `sidepanel.ts` 79,865 → 78,804（**−1,061**）：五条提示带的 DOM 写入口整体退役。
   * Σ 模块 **+870** + 未归因胶水 **0** == 登记增量 **+870**。
   */
  /**
   * 〖V4.5-1 W3（TASK-V45-107~112）〗逐模块 metafile 归因（真实 `dist/build-meta.json`
   * bytesInOutput，W2 → W3）：Σ **+12,527** + 未归因胶水 **78** == 登记增量 **+12,605**。
   */
  v45W3Rows: [
    { module: 'src/ui/sidepanel/sidepanel.ts', beforeBytes: 78_804, afterBytes: 81_029, deltaBytes: 2_225 },
    { module: 'src/ui/sidepanel/cards/decision-region.ts', beforeBytes: null, afterBytes: 6_386, deltaBytes: 6_386 },
    { module: 'src/ui/settings/help.ts', beforeBytes: null, afterBytes: 1_343, deltaBytes: 1_343 },
    { module: 'src/ui/sidepanel/host-registry.ts', beforeBytes: 5_865, afterBytes: 7_128, deltaBytes: 1_263 },
    { module: 'src/ui/sidepanel/disclosure.ts', beforeBytes: 5_188, afterBytes: 6_481, deltaBytes: 1_293 },
    { module: 'src/ui/sidepanel/density-scope.ts', beforeBytes: 2_284, afterBytes: 4_379, deltaBytes: 2_095 },
    { module: 'src/ui/sidepanel/view-model.ts', beforeBytes: 22_552, afterBytes: 23_788, deltaBytes: 1_236 },
    { module: 'src/ui/sidepanel/recommend.ts', beforeBytes: 4_192, afterBytes: 5_917, deltaBytes: 1_725 },
    { module: 'src/ui/sidepanel/cards/askuser.ts', beforeBytes: 6_631, afterBytes: 6_804, deltaBytes: 173 },
    { module: 'src/ui/sidepanel/cards/auth.ts', beforeBytes: 6_200, afterBytes: 6_387, deltaBytes: 187 },
    { module: 'src/ui/sidepanel/cards/ref.ts', beforeBytes: 3_298, afterBytes: 5_227, deltaBytes: 1_929 },
    { module: 'src/ui/sidepanel/l1/panels.ts', beforeBytes: 14_460, afterBytes: 9_414, deltaBytes: -5_046 },
    { module: 'src/ui/sidepanel/l0/shell.ts', beforeBytes: 5_580, afterBytes: 3_285, deltaBytes: -2_295 },
    { module: 'src/ui/sidepanel/stream-render.ts', beforeBytes: 2_495, afterBytes: 2_439, deltaBytes: -56 },
    { module: 'src/ui/settings/sections.ts', beforeBytes: 226, afterBytes: 247, deltaBytes: 21 },
    { module: 'src/ui/settings/panel.ts', beforeBytes: 37_310, afterBytes: 37_358, deltaBytes: 48 },
  ] as const,
  /** 〖V4.5-1 W3〗未归因胶水（= 登记增量 − Σ 模块）。 */
  v45W3UnattributedGlueBytes: 78,
  /**
   * 〖V4.5-1 R3（TASK-V45-118）〗终轮（W4+W5）的逐模块归因集 = **空集**：R3 对
   * `dist/sidepanel.js` **没有任何模块移动**（真实 metafile 与 W3 轮逐模块逐值相等）。
   * 空集是登记事实（不是省略）：Σ([]) + glue(0) == 登记增量 0，由
   * `size-growth-evidence.test.ts` 的「终轮 Δ=0 归因」判据对真实 metafile 实跑。
   * 唯一的 `src` 改动 `src/ui/options/index.html`（纯文案行）不进 sidepanel.js。
   */
  v45W4W5Rows: [] as const,
  /** 终轮的未归因胶水（无模块移动，实测 0）。 */
  v45W4W5UnattributedGlueBytes: 0,
  v45W1W2Rows: [
    { module: 'src/ui/sidepanel/host-registry.ts', beforeBytes: 4_760, afterBytes: 5_865, deltaBytes: 1_105 },
    { module: 'src/ui/sidepanel/chat-state.ts', beforeBytes: 16_917, afterBytes: 17_200, deltaBytes: 283 },
    { module: 'src/ui/sidepanel/cards/system.ts', beforeBytes: 1_035, afterBytes: 1_219, deltaBytes: 184 },
    { module: 'src/ui/sidepanel/stream-plaintext.ts', beforeBytes: 3_973, afterBytes: 4_140, deltaBytes: 167 },
    { module: 'src/ui/settings/panel.ts', beforeBytes: 37_118, afterBytes: 37_310, deltaBytes: 192 },
    { module: 'src/ui/sidepanel/sidepanel.ts', beforeBytes: 79_865, afterBytes: 78_804, deltaBytes: -1_061 },
  ] as const,
  /** 〖V4.5-1 R1〗未归因胶水 = 0 B（六处改动逐模块可归因，Σ +870 == 登记增量）。 */
  v45W1W2UnattributedGlueBytes: 0,
  /**
   * 〖V4.5-1 review R1 修复轮（2026-09-21，BLOCK-01~04 + I-01~06）〗逐模块 metafile 归因
   * （真实 `dist/build-meta.json` bytesInOutput，W4+W5 → 修复轮）：仅两个模块移动
   * —— `host-registry.ts` 7,128 → 9,273（+2,145：迁移容器登记 + 判别规则 + 载体判据收紧
   * + legacy 面选择器）与 `sidepanel.ts` 81,029 → 83,904（+2,875：live 载体读数 + firstRun
   * 抑制 + 测试钩子）。Σ 模块 **+5,020** + 未归因胶水 **0** == 登记增量 **+5,020**。
   */
  v45ReviewfixRows: [
    { module: 'src/ui/sidepanel/host-registry.ts', beforeBytes: 7_128, afterBytes: 9_273, deltaBytes: 2_145 },
    { module: 'src/ui/sidepanel/sidepanel.ts', beforeBytes: 81_029, afterBytes: 83_904, deltaBytes: 2_875 },
  ] as const,
  /** 〖V4.5-1 review R1 修复轮〗未归因胶水 = 0 B（两模块逐条可归因，Σ +5,020 == 登记增量）。 */
  v45ReviewfixUnattributedGlueBytes: 0,
  /**
   * 〖V5-1 R1（2026-09-22，TASK-V5-101~113）〗逐模块 metafile 归因（真实 `dist/build-meta.json`
   * bytesInOutput，review R1 修复轮 → 本轮）：5 个新增必需模块（next-registry/{definition,registry,
   * pipeline,providers,dispatch}）+ 3 个接线模块（`recommend.ts` 规则迁出 −1,604 / `sidepanel.ts`
   * 集 B 瘦身 −303 / `cards/nextstep.ts` 增 `data-op` +86）。Σ 模块 **+8,537** + 未归因胶水 **257**
   * == 登记增量 **+8,794**。
   */
  v51R1Rows: [
    { module: 'src/ui/sidepanel/next-registry/pipeline.ts', beforeBytes: null, afterBytes: 3_135, deltaBytes: 3_135 },
    { module: 'src/ui/sidepanel/next-registry/providers.ts', beforeBytes: null, afterBytes: 3_265, deltaBytes: 3_265 },
    { module: 'src/ui/sidepanel/next-registry/registry.ts', beforeBytes: null, afterBytes: 2_460, deltaBytes: 2_460 },
    { module: 'src/ui/sidepanel/next-registry/dispatch.ts', beforeBytes: null, afterBytes: 795, deltaBytes: 795 },
    { module: 'src/ui/sidepanel/next-registry/definition.ts', beforeBytes: null, afterBytes: 703, deltaBytes: 703 },
    { module: 'src/ui/sidepanel/recommend.ts', beforeBytes: 5_917, afterBytes: 4_313, deltaBytes: -1_604 },
    { module: 'src/ui/sidepanel/sidepanel.ts', beforeBytes: 83_904, afterBytes: 83_601, deltaBytes: -303 },
    { module: 'src/ui/sidepanel/cards/nextstep.ts', beforeBytes: 1_350, afterBytes: 1_436, deltaBytes: 86 },
  ] as const,
  /** 〖V5-1 R1〗未归因胶水 = 257 B（esbuild 分账噪声，<0.01% 输出）。 */
  v51R1UnattributedGlueBytes: 257,
  /**
   * 〖V5-2 R1（2026-09-22，TASK-V5-123~137）〗逐模块 metafile 归因（真实
   * `dist/build-meta.json` bytesInOutput，v5-1 R1 树 → 本轮）：新增 `next-registry/ops.ts`
   * （9 op 执行体 + 缝，+3,918）与 `shared/op-table.ts`（双侧同源描述符表，+831）；
   * `sidepanel.ts` 生产缝（collectors / 两段握手 / 掩码提交 / `op.llm-config` 回滚，+4,935）；
   * 掩码 `secret` 卡 +511 / `recommend.ts` 授权 chip 落槽 +485 / `stream-plaintext.ts`
   * 掩码文案单源 +427 / `chat-state.ts` askKind 派生 +185 / `cards/nextstep.ts` chip 值透传 +28；
   * `pipeline.ts` op 表迁出 −156；归因位移 `clipboard-page.ts` −9（源码未改，仅分摊变化）。
   * Σ 模块 **+11,155** + 未归因胶水 **73** == 登记增量 **+11,228**。
   */
  v52R1Rows: [
    { module: 'src/ui/sidepanel/next-registry/ops.ts', beforeBytes: null, afterBytes: 3_918, deltaBytes: 3_918 },
    { module: 'src/ui/sidepanel/sidepanel.ts', beforeBytes: 83_601, afterBytes: 88_536, deltaBytes: 4_935 },
    { module: 'src/shared/op-table.ts', beforeBytes: null, afterBytes: 831, deltaBytes: 831 },
    { module: 'src/ui/sidepanel/cards/askuser.ts', beforeBytes: 6_804, afterBytes: 7_315, deltaBytes: 511 },
    { module: 'src/ui/sidepanel/recommend.ts', beforeBytes: 4_313, afterBytes: 4_798, deltaBytes: 485 },
    { module: 'src/ui/sidepanel/stream-plaintext.ts', beforeBytes: 4_140, afterBytes: 4_567, deltaBytes: 427 },
    { module: 'src/ui/sidepanel/chat-state.ts', beforeBytes: 17_200, afterBytes: 17_385, deltaBytes: 185 },
    { module: 'src/ui/sidepanel/cards/nextstep.ts', beforeBytes: 1_436, afterBytes: 1_464, deltaBytes: 28 },
    { module: 'src/ui/sidepanel/next-registry/pipeline.ts', beforeBytes: 3_135, afterBytes: 2_979, deltaBytes: -156 },
    { module: 'src/platform/clipboard-page.ts', beforeBytes: 2_612, afterBytes: 2_603, deltaBytes: -9 },
  ] as const,
  /** 〖V5-2 R1〗未归因胶水 = 73 B（esbuild 分账噪声，<0.02% 输出）。 */
  v52R1UnattributedGlueBytes: 73,
  /**
   * 〖V5-2 R2（2026-09-22，TASK-V5-138~152）〗逐模块 metafile 归因（真实
   * `dist/build-meta.json` bytesInOutput，R1 树 → 本轮）：8 个模块移动（见各轮 `reason`）
   * + 新增 `next-registry/snapshot.ts`（1,601 B）。Σ 模块 **+16,321** + 未归因胶水 **49**
   * == 登记增量 **+16,370**。
   */
  v52R2Rows: [
    { module: 'src/ui/sidepanel/sidepanel.ts', beforeBytes: 88_536, afterBytes: 96_409, deltaBytes: 7_873 },
    { module: 'src/ui/sidepanel/next-registry/ops.ts', beforeBytes: 3_918, afterBytes: 6_246, deltaBytes: 2_328 },
    { module: 'src/ui/settings/ops.ts', beforeBytes: 17_027, afterBytes: 19_119, deltaBytes: 2_092 },
    { module: 'src/ui/sidepanel/cards/askuser.ts', beforeBytes: 7_315, afterBytes: 9_182, deltaBytes: 1_867 },
    { module: 'src/ui/sidepanel/next-registry/snapshot.ts', beforeBytes: null, afterBytes: 1_601, deltaBytes: 1_601 },
    { module: 'src/platform/capability-permissions.ts', beforeBytes: 2_088, afterBytes: 2_757, deltaBytes: 669 },
    { module: 'src/ui/sidepanel/next-registry/pipeline.ts', beforeBytes: 2_979, afterBytes: 3_516, deltaBytes: 537 },
    { module: 'src/ui/sidepanel/chat-state.ts', beforeBytes: 17_385, afterBytes: 17_647, deltaBytes: 262 },
  ] as const,
  /** 〖V5-2 R2〗未归因胶水 = 49 B（esbuild 分账噪声，<0.01% 输出）。 */
  v52R2UnattributedGlueBytes: 49,
  /**
   * 〖V5-2 **review R1 修复轮**（2026-09-22）〗**最新一轮**的逐模块增量（R2 树 535,821 →
   * 修复轮树 542,150，真实 metafile 同几何）：新增 `settings/op-bodies.ts` +8,151 /
   * `sidepanel.ts` −2,636 / `settings/ops.ts` −1,852 / `providers.ts` +1,187 / `ops.ts` +826 /
   * `pipeline.ts` +344 / `recommend.ts` +278 / `cards/nextstep.ts` +42 / `cards/askuser.ts` −46；
   * Σ 模块 **+6,294** + 未归因胶水 **35** == 登记增量 **+6,329**。
   */
  v52ReviewfixRows: [
    { module: 'src/ui/settings/op-bodies.ts', beforeBytes: null, afterBytes: 8_151, deltaBytes: 8_151 },
    { module: 'src/ui/sidepanel/sidepanel.ts', beforeBytes: 96_409, afterBytes: 93_773, deltaBytes: -2_636 },
    { module: 'src/ui/settings/ops.ts', beforeBytes: 19_119, afterBytes: 17_267, deltaBytes: -1_852 },
    { module: 'src/ui/sidepanel/cards/askuser.ts', beforeBytes: 9_182, afterBytes: 9_136, deltaBytes: -46 },
    { module: 'src/ui/sidepanel/next-registry/providers.ts', beforeBytes: 3_265, afterBytes: 4_452, deltaBytes: 1_187 },
    { module: 'src/ui/sidepanel/next-registry/ops.ts', beforeBytes: 6_246, afterBytes: 7_072, deltaBytes: 826 },
    { module: 'src/ui/sidepanel/next-registry/pipeline.ts', beforeBytes: 3_516, afterBytes: 3_860, deltaBytes: 344 },
    { module: 'src/ui/sidepanel/recommend.ts', beforeBytes: 4_798, afterBytes: 5_076, deltaBytes: 278 },
    { module: 'src/ui/sidepanel/cards/nextstep.ts', beforeBytes: 1_464, afterBytes: 1_506, deltaBytes: 42 },
  ] as const,
  /** 〖V5-2 review R1 修复轮〗未归因胶水 = 35 B（esbuild 分账噪声，<0.01% 输出）。 */
  v52ReviewfixUnattributedGlueBytes: 35,
  /**
   * 〖V5-2 **收口轮**（2026-09-22，validate R1 的 N-01 + N-04~N-09 / KL-N-10 登记）〗
   * **最新一轮**的逐模块增量（review 修复轮树 542,150 → 收口轮树 **542,064**，真实 metafile 同几何）：
   * 唯一事实 = `sidepanel.ts` 93,773 → **93,687 B**（**−86 B**：`permRequest` 不再自己
   * `dispatch` 一条失败 notice —— 管线 settle 是 `op.perm.request` 失败行的唯一写者，N-01）；
   * Σ 模块 **−86** + 未归因胶水 **0** == 登记增量 **−86**。**首个净减轮**（`direction: 'lowered'`）。
   */
  v52CloseoutRows: [
    { module: 'src/ui/sidepanel/sidepanel.ts', beforeBytes: 93_773, afterBytes: 93_687, deltaBytes: -86 },
  ] as const,
  /** 〖V5-2 收口轮〗未归因胶水 = 0 B（单模块，Δ 逐字节相等）。 */
  v52CloseoutUnattributedGlueBytes: 0,
  /**
   * 〖V5-3 R2（2026-09-22，TASK-V5-153~176）—— **末叶 / 收口叶 + 三叶合计终轮**〗
   * **最新一轮**的逐模块增量（V5-2 收口树 542,064 → V5-3 树 **546,370**，真实 metafile 同几何）：
   * `sidepanel.ts` +2,015（授权 chip 唯一载体 + 黄/绿点击 + `ResizeObserver→data-narrow` + 三测试缝）/
   * `l2/audit.ts` **+566**（法八面③ `maskedLength` 审计列）/ `cards/error.ts` +537（出生铸造恢复区）/
   * `next-registry/providers.ts` +428（`blockedRecovery` 运行期派生）/ `statusbar.ts` +359（`#auth-state`
   * 唯一写入者）/ `l0/risk-rail.ts` +261 / `chat-state.ts` +200 / `stream-plaintext.ts` +60 /
   * `view-model.ts` **−120**（工具栏 digest 去 auth 段）；
   * Σ 模块 **+4,306** + 未归因胶水 **0** == 登记增量 **+4,306**。
   */
  v53Rows: [
    { module: 'src/ui/sidepanel/sidepanel.ts', beforeBytes: 93_687, afterBytes: 95_702, deltaBytes: 2_015 },
    { module: 'src/ui/sidepanel/l2/audit.ts', beforeBytes: 4_145, afterBytes: 4_711, deltaBytes: 566 },
    { module: 'src/ui/sidepanel/cards/error.ts', beforeBytes: 445, afterBytes: 982, deltaBytes: 537 },
    { module: 'src/ui/sidepanel/next-registry/providers.ts', beforeBytes: 4_452, afterBytes: 4_880, deltaBytes: 428 },
    { module: 'src/ui/sidepanel/statusbar.ts', beforeBytes: 976, afterBytes: 1_335, deltaBytes: 359 },
    { module: 'src/ui/sidepanel/l0/risk-rail.ts', beforeBytes: 7_698, afterBytes: 7_959, deltaBytes: 261 },
    { module: 'src/ui/sidepanel/chat-state.ts', beforeBytes: 17_647, afterBytes: 17_847, deltaBytes: 200 },
    { module: 'src/ui/sidepanel/stream-plaintext.ts', beforeBytes: 4_567, afterBytes: 4_627, deltaBytes: 60 },
    { module: 'src/ui/sidepanel/view-model.ts', beforeBytes: 23_788, afterBytes: 23_668, deltaBytes: -120 },
  ] as const,
  /** 〖V5-3 R2〗未归因胶水 = 0 B（Σ 模块 +4,306 == 登记增量 +4,306）。 */
  v53UnattributedGlueBytes: 0,
  /**
   * 〖V5-3 review R1 修复轮（2026-09-22，BLOCK-01 + I-01~05）—— **最新一轮**〗
   * 逐模块增量（V5-3 R2 树 546,370 → 修复轮树 **547,558**，真实 metafile 同几何）：
   * `sidepanel.ts` +335（`refresh()` 测试缝可 await ⇒ 十环节 ⑨/⑩ 无轮询驱动）/ `view-model.ts` +278
   * （I-02：dot 只表会话连接态 + `policyTone` 走 policy 维度）/ `tree-drawer.ts` +281（BLOCK-01：
   * 站点行 `auth-pointer` 指针 + 运行期指针说明节点）/ `tree-view.ts` +125（站点行 sublabel 改指针常量）/
   * `next-registry/definition.ts` +214（I-05：`BLOCKED_RECOVERY_TRIGGER` 对象键对齐）/
   * `next-registry/providers.ts` **−46**（I-05：删除位置耦合魔法数组）/
   * `l0/shell.ts` +1（policyTone 写入点）；Σ 模块 **+1,188** + 未归因胶水 **0** == 登记增量 **+1,188**。
   */
  /**
   * 〖R4 缺陷修复轮（2026-09-22）〗「引用出生即失效」根修 + 止血的逐模块归因
   * （`sidepanel.ts` 96,037 → 97,036 / `l1/ref-validity.ts` 8,897 → 9,639 /
   * `l1/ref-store.ts` 5,949 → 6,169 / `pick-input.ts` 8,315 → 8,405；
   * Σ +2,051 + glue 0 == 该轮登记增量 +2,051，由 `size-growth-evidence.test.ts` 的
   * 「全部 round rows」组判据 + 「最新一轮 afterBytes == 真实 metafile」判据双向机核）。
   */
  r4SelectorFixRows: [
    { module: 'src/ui/sidepanel/sidepanel.ts', beforeBytes: 96_037, afterBytes: 97_036, deltaBytes: 999 },
    { module: 'src/ui/sidepanel/l1/ref-validity.ts', beforeBytes: 8_897, afterBytes: 9_639, deltaBytes: 742 },
    { module: 'src/ui/sidepanel/l1/ref-store.ts', beforeBytes: 5_949, afterBytes: 6_169, deltaBytes: 220 },
    { module: 'src/ui/sidepanel/pick-input.ts', beforeBytes: 8_315, afterBytes: 8_405, deltaBytes: 90 },
  ] as const,
  /** 〖R4 缺陷修复轮〗未归因胶水 = 0 B（Σ 模块 +2,051 == 登记增量 +2,051）。 */
  r4SelectorFixUnattributedGlueBytes: 0,
  /**
   * 〖V5.5-1 R1（2026-09-23，leaf specs-tree-v55-1-driver-layer；W1+W2 = TASK-V55-101~112）〗
   * 最新一轮 = 本组。驱动者声明单源 + 终态词汇 + 时机源外移 + 驱动者行登记的**中间**登记
   * （本叶收口轮 TASK-V55-125 将按最终产物再登记）。
   */
  v551R1Rows: [
    { module: 'src/ui/sidepanel/next-registry/drivers.ts', beforeBytes: null, afterBytes: 2_662, deltaBytes: 2_662 },
    { module: 'src/ui/sidepanel/next-registry/providers.ts', beforeBytes: 4_834, afterBytes: 7_091, deltaBytes: 2_257 },
  ] as const,
  /** 〖V5.5-1 R1〗未归因运行时胶水 = 48 B（Σ 模块 +4,919 + 48 == 登记增量 +4,967）。 */
  v551R1UnattributedGlueBytes: 48,
  /**
   * 〖V5.5-1 R2（2026-09-23，leaf specs-tree-v55-1-driver-layer；W3+W4 = TASK-V55-113~125）〗
   * 最新一轮 = 本组（**收口**登记；R1 的中间登记 `v551R1Rows` 逐字保留）。答案驱动化 + S0 双面 +
   * `no-dead-end` 判据升级 + 法七扩展。
   */
  v551R2Rows: [
    { module: 'src/ui/sidepanel/next-registry/drivers.ts', beforeBytes: 2_662, afterBytes: 3_307, deltaBytes: 645 },
    { module: 'src/ui/sidepanel/sidepanel.ts', beforeBytes: 97_036, afterBytes: 99_566, deltaBytes: 2_530 },
  ] as const,
  /** 〖V5.5-1 R2〗未归因运行时胶水 = 10 B（Σ 模块 +3,175 + 10 == 登记增量 +3,185）。 */
  v551R2UnattributedGlueBytes: 10,
  /**
   * 〖V5.5-1 review R1 修复轮（2026-09-23，review R1 的 BLOCK-01 + I-01~03）〗**最新一轮** = 本组。
   * 唯一 `src` 改动 = `sidepanel.ts#submitAskFor` 的后台 ask 分支加**取消守卫**（BLOCK-01：
   * `isCanceled` ⇒ `nextAfterSettle({ kind: 'settle', force: true })` 并 return，不登记悬置、不驱动
   * `'answered'`）；门禁面改动（`driver-quadruple` / `law7x-ext` / `l1-ref-validity` / `s0-self-driven.mjs`）
   * **不进 bundle** ⇒ 0 B。
   */
  /**
   * 〖V5.5-2 R1（2026-09-23，leaf specs-tree-v55-2-deterministic-onboarding；W1~W4 = TASK-V55-201~212）〗
   * **最新一轮** = 本组（中间登记）。主题① 确定性系统流：配置判据（`isLlmConfigured`，SW bundle ⇒ 本产物 0 B）
   * + `runChat` 前置判据 + `chat-result` variant **type-only** + 双源并存 + 引导流 4 步单源 + 悬置任务单源
   * + 配置完成自动续接（回执在前、续接在后）。逐模块归因见真实 `dist/build-meta.json` bytesInOutput。
   */
  v552R1Rows: [
    { module: 'src/ui/sidepanel/sidepanel.ts', beforeBytes: 99_688, afterBytes: 101_042, deltaBytes: 1_354 },
    { module: 'src/ui/sidepanel/next-registry/onboarding-flow.ts', beforeBytes: null, afterBytes: 1_280, deltaBytes: 1_280 },
    { module: 'src/ui/sidepanel/next-registry/suspension.ts', beforeBytes: null, afterBytes: 1_421, deltaBytes: 1_421 },
    { module: 'src/ui/sidepanel/next-registry/ops.ts', beforeBytes: 7_072, afterBytes: 7_155, deltaBytes: 83 },
    { module: 'src/ui/sidepanel/next-registry/pipeline.ts', beforeBytes: 3_860, afterBytes: 3_908, deltaBytes: 48 },
    { module: 'src/ui/sidepanel/next-registry/providers.ts', beforeBytes: 7_091, afterBytes: 7_198, deltaBytes: 107 },
  ] as const,
  /** 〖V5.5-2 R1〗未归因运行时胶水 = 97 B（Σ 模块 +4,293 + 97 == 登记增量 +4,390）。 */
  v552R1UnattributedGlueBytes: 97,
  /**
   * 〖V5.5-2 R2（2026-09-23，W5 = TASK-V55-213~216）—— **本叶最终轮** = 本组〗
   * 逐模块 metafile 归因（真实 `dist/build-meta.json` bytesInOutput，R1 树 → R2 树）：
   *   · `next-registry/onboarding-flow.ts` 1,280 → **1,722（+442）**：两场景单源
   *     （`ONBOARD_SCENARIOS` / `onboardScenario()`）+ 「取消 ⇒ 同因不重复」纯判据
   *     （`onboardCauseKey` / `suppressOnboardCause`）；
   *   · `sidepanel.ts` 101,042 → **101,472（+430）**：去重键接线（`onboardGuideCause` /
   *     `declinedOnboardCauses` + `maybeRecommend` 同因过滤 + `reset()` 复位）+ `submitAskFor`
   *     的 op 分支 **resolver 归属修正**（掩码 ask 的 resolver 由 `submitSecret` 消费）。
   * Σ 模块 **+872** + 未归因胶水 **0** == 登记增量 **+872**。
   */
  v552R2Rows: [
    { module: 'src/ui/sidepanel/next-registry/onboarding-flow.ts', beforeBytes: 1_280, afterBytes: 1_722, deltaBytes: 442 },
    { module: 'src/ui/sidepanel/sidepanel.ts', beforeBytes: 101_042, afterBytes: 101_472, deltaBytes: 430 },
  ] as const,
  /** 〖V5.5-2 R2〗未归因运行时胶水 = 0 B（Σ 模块 +872 == 登记增量 +872）。 */
  v552R2UnattributedGlueBytes: 0,
  v551FixRows: [
    { module: 'src/ui/sidepanel/sidepanel.ts', beforeBytes: 99_566, afterBytes: 99_688, deltaBytes: 122 },
  ] as const,
  /** 〖V5.5-1 review R1 修复轮〗未归因运行时胶水 = 0 B（Σ 模块 +122 == 登记增量 +122）。 */
  v551FixUnattributedGlueBytes: 0,
  v53FixRows: [
    { module: 'src/ui/sidepanel/sidepanel.ts', beforeBytes: 95_702, afterBytes: 96_037, deltaBytes: 335 },
    { module: 'src/ui/sidepanel/view-model.ts', beforeBytes: 23_668, afterBytes: 23_946, deltaBytes: 278 },
    { module: 'src/ui/tree/tree-drawer.ts', beforeBytes: 39_893, afterBytes: 40_174, deltaBytes: 281 },
    { module: 'src/ui/tree/tree-view.ts', beforeBytes: 21_267, afterBytes: 21_392, deltaBytes: 125 },
    { module: 'src/ui/sidepanel/next-registry/definition.ts', beforeBytes: 703, afterBytes: 917, deltaBytes: 214 },
    { module: 'src/ui/sidepanel/next-registry/providers.ts', beforeBytes: 4_880, afterBytes: 4_834, deltaBytes: -46 },
    { module: 'src/ui/sidepanel/l0/shell.ts', beforeBytes: 3_285, afterBytes: 3_286, deltaBytes: 1 },
  ] as const,
  /** 〖V5-3 review R1 修复轮〗未归因胶水 = 0 B（Σ 模块 +1,188 == 登记增量 +1,188）。 */
  v53FixUnattributedGlueBytes: 0,
  /**
   * 〖V4-4 审查修复轮（2026-09-19，review R1 BLOCK-01~03 + I-01~I-08）〗未归因胶水 = 圆整残差 40 B
   * （本轮登记增量 12,886 − Σ逐模块 12,846；esbuild 分账噪声，<0.01% 输出）。
   * 〖I-10（v4-4 快修轮）〗原文写「12,723 − 12,683」—— 两个数字都与登记字段/实测不符（登记字段
   * `465,277 → 478,163` ⇒ Δ = 12,886；逐模块 Σ = 12,846 + glue 40）。文案已订正，并由
   * `validateReRegistrationDisclosure` 的**算术机核**接管（见该函数）。
   */
  v44ReviewfixUnattributedGlueBytes: 40,
  rows: [
    { module: 'src/ui/sidepanel/sidepanel.ts', beforeBytes: 44_845, afterBytes: 101472, deltaBytes: 56627, kind: 'wiring', requiredBy: 'FR-V3-031~040 + FR-V3-045/047/048/054 + FR-V3-060~066 + AC-CONV-2 + R1 + R2 + R3 + v4-1 + v4-3（卡动作按 cardId→requestId 解析 + askFlow/timeoutOpenAsks seam + 授权卡审计入口 + revealAskFallback + clearAsk 全结算）—— FR-CHAT-040~048 · ADR-V4-017/022/030~033；〖V5-2 收口轮〗删去 `permRequest` 的重复 notice 写者 −86 B' },
        { module: 'src/ui/sidepanel/next-registry/onboarding-flow.ts', beforeBytes: null, afterBytes: 1722, deltaBytes: 1722, kind: 'new-required-module', requiredBy: 'FR-SELF-042（确定性引导流恰 4 步单源：识别 → 引导 → 采集 → 完成；采集复用 `OP_PARAM_SEQUENCE[\'op.llm-config\']`，零新执行面）· ADR-V55-007 §1' },
    { module: 'src/ui/sidepanel/next-registry/suspension.ts', beforeBytes: null, afterBytes: 1421, deltaBytes: 1421, kind: 'new-required-module', requiredBy: 'FR-SELF-045/046（配置悬置任务：单源登记 + `MAX_SUSPENSIONS = 1` + 有效期重校验 + 续接决策）· ADR-V55-007 §2' },
{ module: 'src/ui/sidepanel/chat-state.ts', beforeBytes: 4_303, afterBytes: 17847, deltaBytes: 13544, kind: 'wiring', requiredBy: 'FR-V3-037/FR-V3-038 + AC-CONV-2 + R1（REF_ROUND_PREFIX + supersededAsk）+ FR-CHAT-042/043/044/048（终态事件接线 + 仲裁 + supersede/超时双留痕）+ **FR-CHAT-053/054（V4-4 R2：导航失效 / `#notice` 自动归并接线，`reduce()` 透传归约前状态 + `streamBranch` 的 `case \'state\'`/`case \'notice\'`）**· ADR-V4-030~032 / ADR-V4-036 §5' },
    { module: 'src/ui/sidepanel/l1/panels.ts', beforeBytes: null, afterBytes: 9414, deltaBytes: 9414, kind: 'new-required-module', requiredBy: 'FR-V3-031/032/037/038/039（八类就地展开、后果两段、阻断呈现、两条恢复、回执三件套）+ FR-V3-070（手势表由单一清单渲染）+ R3（条件式「一键重锚」按钮 + `canReanchor()` 纯判据 + 报告）' },
    { module: 'src/ui/sidepanel/host-registry.ts', beforeBytes: null, afterBytes: 9273, deltaBytes: 9273, kind: 'new-required-module', requiredBy: 'V4-4 review 修复轮 BLOCK-02（结构宿主注册表 + 唯一判据 evaluateHostRegistry：登记集合 == 实存宿主集合 / transitional 恒 false / [data-transitional-host] 计数 0 / 已退役容器 DOM 零残留）· ADR-V4-005 §6 / ADR-V4-040 §3 · FR-CHAT-054' },
    { module: 'src/ui/sidepanel/stream-model.ts', beforeBytes: null, afterBytes: 9221, deltaBytes: 9221, kind: 'new-required-module', requiredBy: 'FR-CHAT-020/021/025 + FR-CHAT-040/042/044/048（MAX_OPEN_ASKS=2 仲裁 + appendAskEvent/closeOpenAsks + openAskEntries）+ NFR-CHAT-001 · ADR-V4-024/028/030~032' },
    { module: 'src/ui/sidepanel/cards/askuser.ts', beforeBytes: null, afterBytes: 9136, deltaBytes: 9136, kind: 'new-required-module', requiredBy: 'FR-CHAT-040/041/042 + AC-CHAT-003/005（choice/text 两型 + 固化两态 + 终态零控件）· ADR-V4-030' },
    { module: 'src/ui/sidepanel/l1/ref-validity.ts', beforeBytes: null, afterBytes: 9639, deltaBytes: 9639, kind: 'new-required-module', requiredBy: 'FR-V3-036（五维 + 不确定即失效 fail-closed）+ N-07（D4 原因指项）+ R1（D4 状态一致性口径：捕获时状态 vs 当刻状态）+ R3（救援 payload 元数据 + `dom-gone` 可读救援原因；结论枚举不扩）' },
    { module: 'src/ui/sidepanel/pick-input.ts', beforeBytes: null, afterBytes: 8405, deltaBytes: 8405, kind: 'new-required-module', requiredBy: 'FR-V3-060/063/067/068（双触发按需注入 + 拖放落点 + 失败降级）+ AC-CONV-1（生产 env 组装）+ R1（摄取时补全捕获事实 withDeclaration()）+ R3（只读 rescue 往返 + `reanchor()`：唯一候选经同一摄取管线生成新引用）' },
    { module: 'src/ui/sidepanel/view-model.ts', beforeBytes: 17_123, afterBytes: 23946, deltaBytes: 6823, kind: 'wiring', requiredBy: 'FR-V3-031 + FR-V3-046/015 + FR-V3-068/070 + R1 + R2 + v4-1 + FR-CHAT-048（askFlowView 回合语义：pending 只门控新回合/推荐 chip）· ADR-V4-032' },
    { module: 'src/ui/sidepanel/cards/auth.ts', beforeBytes: null, afterBytes: 6387, deltaBytes: 6387, kind: 'new-required-module', requiredBy: 'FR-CHAT-045/046/047 + AC-CHAT-016（批准/拒绝 + 预演 + 审计入口 + 两态固化 + legacy #confirm 单一解析）· ADR-V4-030/033' },
    { module: 'src/ui/sidepanel/cards/decision-region.ts', beforeBytes: null, afterBytes: 6386, deltaBytes: 6386, kind: 'new-required-module', requiredBy: 'FR-V45-021/026 · ADR-V45-002 §3（决策区卡内化：选项池 + 后果预演 + 三段模板逐字）' },
    { module: 'src/ui/sidepanel/next-registry/ops.ts', beforeBytes: null, afterBytes: 7155, deltaBytes: 7155, kind: 'new-required-module', requiredBy: 'FR-ALLN-055/059/065/068（op 表 + 四态管线 + 双层执行器同源）' },
    { module: 'src/ui/sidepanel/stream-digest.ts', beforeBytes: null, afterBytes: 6220, deltaBytes: 6220, kind: 'new-required-module', requiredBy: 'FR-CHAT-024/025 + NFR-CHAT-012（零明文摘要白名单 + LRU 20 + 降级重建；面板侧 `chrome.storage.local`，零新权限零 SW 改动）· ADR-V4-028' },
    { module: 'src/ui/sidepanel/l2/command-catalog.ts', beforeBytes: null, afterBytes: 6106, deltaBytes: 6106, kind: 'new-required-module', requiredBy: 'FR-V3-049/053（命令目录逐条有档 + delay 单源措辞 + 硬底线零控件 + 分列）' },
    { module: 'src/ui/sidepanel/l1/ref-store.ts', beforeBytes: null, afterBytes: 6169, deltaBytes: 6169, kind: 'new-required-module', requiredBy: 'FR-V3-071/037（引用 id 单源 + 受保护派发 + 阻断）+ N-08（退役原因冻结）+ R1（declaration 事实透传）+ R3（救援 payload 透传到记录，供 L1 / 门禁读取）' },
    { module: 'src/ui/sidepanel/cards/ref.ts', beforeBytes: null, afterBytes: 5227, deltaBytes: 5227, kind: 'new-required-module', requiredBy: 'V4-4 TASK-801（引用卡：序号 + 证据层只读 + 失效原因 + 两条恢复路径 + 兜底默认收起）· ADR-V4-035 · FR-CHAT-050~052 · shim E2~E5' },
    { module: 'src/ui/sidepanel/recommend.ts', beforeBytes: null, afterBytes: 5076, deltaBytes: 5076, kind: 'new-required-module', requiredBy: 'V4-4 TASK-804（推荐生产者：真值白名单 7 项 + 规则表/优先级/上限 + 安全边界；禁设置项计数真值）· ADR-V4-037/015 · FR-CHAT-060~064；〖V5-1 R1〗规则表迁入 `next-registry/providers.ts` 的内置 provider，`recommend.ts` 保留常量 + 委托注册表（−1,604 B）' },
    { module: 'src/ui/sidepanel/stream-plaintext.ts', beforeBytes: null, afterBytes: 4627, deltaBytes: 4627, kind: 'new-required-module', requiredBy: 'FR-CHAT-049 / AC-CHAT-021（流内留痕零明文白名单 + label 工厂）· ADR-V4-034' },
    { module: 'src/ui/sidepanel/density-scope.ts', beforeBytes: null, afterBytes: 4379, deltaBytes: 4379, kind: 'new-required-module', requiredBy: 'FR-CHAT-070/071/072/075（豁免子树**单源** `DENSITY_EXCLUDED_SUBTREES=[\'#stream\']` + 三区外壳常量 + 四个防滥用常量 + `assertChromeNotInStream()`）+ ADR-V4-020' },
    { module: 'src/ui/sidepanel/system-events.ts', beforeBytes: null, afterBytes: 4301, deltaBytes: 4301, kind: 'new-required-module', requiredBy: 'V4-4 TASK-802（appendSystem 单一通道：净化 + 去重窗口 + 速率上限 + dropped 归档；#notice 覆盖语义被取代）· ADR-V4-036 · FR-CHAT-053/054' },
    { module: 'src/ui/sidepanel/l2/audit.ts', beforeBytes: null, afterBytes: 4711, deltaBytes: 4711, kind: 'new-required-module', requiredBy: 'FR-V3-050 / NFR-V3-016（审计零明文字段白名单 + URL 去参）' },
    { module: 'src/ui/sidepanel/next-registry/pipeline.ts', beforeBytes: null, afterBytes: 3908, deltaBytes: 3908, kind: 'new-required-module', requiredBy: 'FR-ALLN-055 / FR-ALLN-034（`runOp` 四态唯一管线 + `pendingOps` FIFO 仲裁 + 快照/回滚语义位 + R5 失败三级；`op.execute(` 恰 1 调用点）· ADR-V5-002 §1' },
    { module: 'src/ui/sidepanel/next-registry/providers.ts', beforeBytes: null, afterBytes: 7198, deltaBytes: 7198, kind: 'new-required-module', requiredBy: 'FR-ALLN-030~038 / FR-ALLN-013（4 内置 provider：5 P0 恢复 + onboarding/ref-action/capability-discovery；旧 `recommend.ts` 规则表等价迁移）· ADR-V5-001；〖V5.5-1 R1〗+ `DRIVER_DECLS_SRC` 10 行驱动者声明表 + 注册接线 · FR-SELF-010/012/017/036' },
    { module: 'src/ui/sidepanel/next-registry/drivers.ts', beforeBytes: null, afterBytes: 3307, deltaBytes: 3307, kind: 'new-required-module', requiredBy: 'FR-SELF-010/011/012/017/019/030/033/036（驱动者声明单源：时机闭集 5 / 七类时刻 / `driverClass` / `CTX_FIELD_SERVICE` / 四元组 + 去重键 + `timingOfSettle`）；〖V5.5-1 R2〗+645 B（悬置任务登记 + `answerNotDropped` + `silentWindowReading` + `SettleSource.force`）· ADR-V55-001/002/004' },
    { module: 'src/ui/sidepanel/l2/view-host.ts', beforeBytes: null, afterBytes: 3207, deltaBytes: 3207, kind: 'new-required-module', requiredBy: 'FR-V3-047/048/054（视图替换 + ← 返回 + 展开态复原 + 单滚动容器） + v4-1（绑定 `#log`→`#stream`；返回回焦目标 `#l0-statusbar`→`#l2-entry-tree`）—— FR-CHAT-015' },
    { module: 'src/ui/sidepanel/toolbar.ts', beforeBytes: null, afterBytes: 3117, deltaBytes: 3117, kind: 'new-required-module', requiredBy: 'FR-CHAT-011/015/016（工具栏：只读站点摘要 + 4 视图入口带计数徽标 + 主题切换；可点准入恰 5 且超限抛错）+ NFR-CHAT-004/008 + ADR-V4-018/022' },
    { module: 'src/ui/sidepanel/theme.ts', beforeBytes: null, afterBytes: 2940, deltaBytes: 2940, kind: 'new-required-module', requiredBy: 'FR-CHAT-016（主题三态 auto→light→dark，复用已有 storage 权限，读写失败降级 auto 且不阻断界面）+ NFR-CHAT-008' },
    { module: 'src/ui/sidepanel/l1/receipt.ts', beforeBytes: null, afterBytes: 2835, deltaBytes: 2835, kind: 'new-required-module', requiredBy: 'FR-V3-039 + NFR-V3-008/016（回执三件套 + 零明文）' },
    { module: 'src/ui/sidepanel/cards/tool.ts', beforeBytes: null, afterBytes: 2784, deltaBytes: 2784, kind: 'new-required-module', requiredBy: 'FR-CHAT-035 + FR-050/EC-023（工具卡字段逐项保留：工具名/✓✖/ms/预览/折叠记忆；失败卡 `.entry-error`）· ADR-V4-027' },
    { module: 'src/ui/sidepanel/l2/counts.ts', beforeBytes: null, afterBytes: 2523, deltaBytes: 2523, kind: 'new-required-module', requiredBy: 'FR-V3-046 / EC-V3-016（四类计数真值派生 + {live,baseline} 分列）；〖F 快修轮〗`l2StatusBarText` 退出生产路径（toolbar 摘要改读 `toolbarDigest`）后被树摇 ⇒ −409 B' },
    { module: 'src/ui/sidepanel/next-registry/registry.ts', beforeBytes: null, afterBytes: 2460, deltaBytes: 2460, kind: 'new-required-module', requiredBy: 'FR-ALLN-030/031/032/033（R1 可逆注册 / R2 deps⊆SERVICES / R3 优先级显式化 + 覆盖 / R4 分发模式表；`resolveOrder` 列表位置置换不变）· ADR-V5-001' },
    { module: 'src/ui/sidepanel/stream-render.ts', beforeBytes: null, afterBytes: 2439, deltaBytes: 2439, kind: 'new-required-module', requiredBy: 'FR-CHAT-022/023/037 + NFR-CHAT-003/011（keyed 增量渲染 append/patch/remove(bound) + 终态 DOM 冻结 + 滚动锚定 + 320px）· ADR-V4-025' },
    { module: 'src/ui/sidepanel/cards/shared.ts', beforeBytes: null, afterBytes: 2172, deltaBytes: 2172, kind: 'new-required-module', requiredBy: 'FR-CHAT-022（卡 DOM 契约唯一语言：`card-head`/`card-col`/`.ts`/`.card-fixed` + 折叠阈值 480/10 单源）· ADR-V4-026/027' },
    { module: 'src/ui/settings/ops.ts', beforeBytes: 17_025, afterBytes: 17267, deltaBytes: 242, kind: 'wiring', requiredBy: 'FR-ALLN-075/076（settings 4 类收编为单一执行体）' },
    { module: 'src/ui/sidepanel/l0/risk-rail.ts', beforeBytes: 5_665, afterBytes: 7959, deltaBytes: 2294, kind: 'wiring', requiredBy: 'FR-V3-037（失效行可读原因；风险位唯一写入者不变）+ R2（稳态「低频自动复查中」override：同类、三通道、参与重绘签名） + v4-1（行 → chip 形态：`button.risk-row` + `data-chrome-control` + `aria-controls="risk-detail"`；零风险 ⇒ 0 可点 chip；探针/归属判据零逻辑改动）—— FR-CHAT-013/017 · ADR-V4-019' },
    { module: 'src/ui/sidepanel/disclosure.ts', beforeBytes: 4_547, afterBytes: 6481, deltaBytes: 1934, kind: 'wiring', requiredBy: 'FR-V3-031（白名单 4 → 9 个目标 + 5 条 wiring）；v3-4 复核：数值未变（本叶不改折叠白名单） + v4-1（`COLLAPSIBLE_TARGETS` 9→7：移除退役的 topbar/l2-entries；`NEVER_FOLDABLE` 扩展为三区骨架）—— FR-CHAT-014 · ADR-V4-019' },
    { module: 'src/ui/sidepanel/cards/thinking.ts', beforeBytes: null, afterBytes: 1636, deltaBytes: 1636, kind: 'new-required-module', requiredBy: 'FR-CHAT-035 + NG-CHAT-006（思考两事件一卡 → 终态「已思考 N.Ns」；无 append 后 remove）· ADR-V4-027' },
    { module: 'src/ui/sidepanel/next-registry/snapshot.ts', beforeBytes: null, afterBytes: 1601, deltaBytes: 1601, kind: 'new-required-module', requiredBy: 'FR-ALLN-055/059/065/068（op 表 + 四态管线 + 双层执行器同源）' },
    { module: 'src/ui/settings/op-bodies.ts', beforeBytes: null, afterBytes: 8151, deltaBytes: 8151, kind: 'new-required-module', requiredBy: 'FR-ALLN-042/043/044/075/076 · ADR-V5-005 §1/§3（与面无关的四类执行体：凭据表单落储 / 撤销三目标 / 权限两段握手；原子入口由面注入 —— review R1 BLOCK-01 的落地形态，消灭 options 面的假成功）' },
    { module: 'src/ui/sidepanel/cards/index.ts', beforeBytes: null, afterBytes: 1559, deltaBytes: 1559, kind: 'new-required-module', requiredBy: 'FR-CHAT-021/022/036（CARD_TYPES 单源 + 注册表 + 固化契约；v4-3 把 ask/auth 提取为独立模块）· ADR-V4-026/027' },
    { module: 'src/ui/sidepanel/cards/nextstep.ts', beforeBytes: null, afterBytes: 1506, deltaBytes: 1506, kind: 'new-required-module', requiredBy: 'V4-4 TASK-805（推荐卡：chips 即指令 + 单卡 ≤3 chips + pending 门控 disabled/aria-disabled 不隐藏 + 无候选不渲染）· ADR-V4-037 · FR-CHAT-061~063；〖V5-1 R1〗chip 增 `data-op`（= `ACT_TO_OP[act]`，FR-ALLN-057）' },
    { module: 'src/ui/settings/help.ts', beforeBytes: null, afterBytes: 1343, deltaBytes: 1343, kind: 'new-required-module', requiredBy: 'FR-V45-040/041/042 · ADR-V45-008（设置「帮助」分区：6 手势行只读零可点，行数单源）' },
    { module: 'src/ui/sidepanel/cards/system.ts', beforeBytes: null, afterBytes: 1219, deltaBytes: 1219, kind: 'new-required-module', requiredBy: 'FR-CHAT-032/035（系统事件行单行 + `HH:MM:SS` 只追加；命令行 `.cmd` 紧凑样式）' },
    { module: 'src/ui/sidepanel/statusbar.ts', beforeBytes: null, afterBytes: 1335, deltaBytes: 1335, kind: 'new-required-module', requiredBy: 'FR-CHAT-004/013/017（状态栏：连接状态一行 + 风险 chips 外层容器 + `#risk-detail`；J1/J2 不变量与 `riskActiveOf()` 纯函数）+ AC-CHAT-007' },
    { module: 'src/shared/op-table.ts', beforeBytes: null, afterBytes: 831, deltaBytes: 831, kind: 'new-required-module', requiredBy: 'FR-ALLN-068（双侧同源描述符表）' },
    { module: 'src/ui/sidepanel/next-registry/dispatch.ts', beforeBytes: null, afterBytes: 795, deltaBytes: 795, kind: 'new-required-module', requiredBy: 'FR-ALLN-056/057/058（`ACT_TO_OP` 6 行唯一权威 + `dispatchChipAction` 一次查表零 per-op 分支 + 集 A 协议动作常量）· ADR-V5-001' },
    { module: 'src/ui/sidepanel/next-registry/definition.ts', beforeBytes: null, afterBytes: 917, deltaBytes: 917, kind: 'new-required-module', requiredBy: 'FR-ALLN-010 / FR-ALLN-033 / FR-ALLN-035（`NEXT_SERVICES`/`NEXT_MODES`/`MOUNT_MODE`/`BLOCKED_TERMINALS`(5) 单源 + `NextCtx` 7 源）· ADR-V5-001 / ADR-V5-009 §1' },
    { module: 'src/platform/capability-permissions.ts', beforeBytes: 2_088, afterBytes: 2757, deltaBytes: 669, kind: 'wiring', requiredBy: 'FR-ALLN-043（能力权限最小集 + form 选项源）' },
    { module: 'src/ui/sidepanel/l1/local-tree.ts', beforeBytes: null, afterBytes: 658, deltaBytes: 658, kind: 'new-required-module', requiredBy: 'FR-V3-034（局部树 ≤3 节点）' },
    { module: 'src/ui/sidepanel/cards/ai.ts', beforeBytes: null, afterBytes: 456, deltaBytes: 456, kind: 'new-required-module', requiredBy: 'FR-CHAT-031（AI 卡富文本走既有安全 `markdown.ts`）+ AC-CHAT-002' },
    { module: 'src/ui/sidepanel/cards/error.ts', beforeBytes: null, afterBytes: 982, deltaBytes: 982, kind: 'new-required-module', requiredBy: 'FR-CHAT-035 + FR-050（错误条目为醒目 `.entry-error` system 气泡，可见条目）' },
    { module: 'src/ui/sidepanel/cards/user.ts', beforeBytes: null, afterBytes: 419, deltaBytes: 419, kind: 'new-required-module', requiredBy: 'FR-CHAT-031（用户卡对侧气泡 = 对侧 `msg-user` 样式载体）' },
    { module: 'src/ui/sidepanel/cards/notice.ts', beforeBytes: null, afterBytes: 395, deltaBytes: 395, kind: 'new-required-module', requiredBy: 'FR-CHAT-035 + ADR-V4-027 第 6 条（工具通知 `.msg-notice`，与系统事件行分离）' },
    { module: 'src/insight/ownership-tree.ts', beforeBytes: null, afterBytes: 341, deltaBytes: 341, kind: 'new-required-module', requiredBy: 'FR-V3-034（复用 v2 主归属链，首次被侧栏 bundle 引用 → 共享而非复制）' },
    { module: 'src/ui/settings/panel.ts', beforeBytes: 37_040, afterBytes: 37358, deltaBytes: 318, kind: 'wiring', requiredBy: 'FR-ALLN-075/076（settings 面板接线：能力撤销 / LLM 表单走 op 单一执行体）' },
    { module: 'src/ui/settings/sections.ts', beforeBytes: null, afterBytes: 247, deltaBytes: 247, kind: 'new-required-module', requiredBy: 'FR-V3-051 / FR-V3-046（设置分区登记表 —— 让设置入口的计数可派生而非豁免）' },
    { module: 'src/ui/tree/tree-drawer.ts', beforeBytes: 39_779, afterBytes: 40174, deltaBytes: 395, kind: 'wiring', requiredBy: 'FR-ALLN-059（复用既有连接树入口；归属迁移只改 index.html 的容器与 CSS，面板接线改走 op 触发器）' },
    { module: 'src/ui/sidepanel/markdown.ts', beforeBytes: 13_417, afterBytes: 13463, deltaBytes: 46, kind: 'wiring', requiredBy: 'FR-ALLN-059（复用既有 markdown 渲染；面板接线改走 op 触发器）' },
    { module: 'src/ui/settings/diagnostics.ts', beforeBytes: 4_941, afterBytes: 4975, deltaBytes: 34, kind: 'wiring', requiredBy: 'FR-ALLN-075/076（settings 4 类收编为单一执行体）' },
    { module: 'src/ui/tree/tree-view.ts', beforeBytes: 21_240, afterBytes: 21392, deltaBytes: 152, kind: 'wiring', requiredBy: 'FR-ALLN-059（复用既有实现；面板接线改走 op 触发器）' },
    { module: 'src/ui/settings/view.ts', beforeBytes: 13_222, afterBytes: 13233, deltaBytes: 11, kind: 'wiring', requiredBy: 'FR-ALLN-059（复用既有单一入口；面板接线改走 op 触发器）' },
    { module: 'src/build-info.ts', beforeBytes: 207, afterBytes: 212, deltaBytes: 5, kind: 'wiring', requiredBy: 'FR-ALLN-059（复用既有单一入口 / 面板接线改走 op 触发器）' },
    { module: 'src/insight/archive-catalog.ts', beforeBytes: 13_175, afterBytes: 13179, deltaBytes: 4, kind: 'wiring', requiredBy: 'FR-ALLN-059（复用既有 archive 目录，被 L2 命令目录只读复用；+4 B 为 esbuild 分摊位移）' },
    { module: 'src/ui/sidepanel/scroll-policy.ts', beforeBytes: 826, afterBytes: 830, deltaBytes: 4, kind: 'wiring', requiredBy: 'FR-ALLN-059（复用既有滚动策略；+4 B 为 esbuild 分摊位移）' },
    { module: 'src/ui/tree/tree-receipt.ts', beforeBytes: 2_719, afterBytes: 2721, deltaBytes: 2, kind: 'wiring', requiredBy: 'FR-ALLN-059（复用既有单一入口：回执三件套/审计出口复用 v2 模块，源码未改，+2 B 为 esbuild 分摊位移）' },
    { module: 'src/ui/sidepanel/l0/shell.ts', beforeBytes: 3_351, afterBytes: 3286, deltaBytes: -65, kind: 'wiring', requiredBy: 'FR-V3-047 + FR-V3-068 + R2 + v4-1（三区外壳）+ FR-CHAT-040/042（决策槽退役后 #l0-more / #l1-more-options 单一写入者迁入 + 流内卡兜底输入与 composer reveal 控制）· ADR-V4-030' },
    { module: 'src/ui/sidepanel/l0/status-bar.ts', beforeBytes: 1_382, afterBytes: 67, deltaBytes: -1315, kind: 'wiring', requiredBy: 'FR-V3-015 / FR-V3-046（入口标签 + 面板摘要写入 + 逐目标 aria 对）+ I-01（逐目标 `aria-controls`：设置入口指向 `#settings-view`） + v4-1（位置迁移为 L2 入口写入器并委托 `toolbar.ts`；模块体从 1,694 B 收缩到 67 B —— 计数徽标改由工具栏渲染，`L2_ENTRY_FIELDS`/`syncTriggerAria` 语义保持）—— FR-CHAT-011/015' },
    { module: 'src/ui/sidepanel/l0/decision-card.ts', beforeBytes: 4_028, afterBytes: 0, deltaBytes: -4028, kind: 'wiring', requiredBy: 'FR-ALLN-043/065（V5-2 9 op 落地 + 面板接线）' },
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
 *
 * ── 2026-09-22 R4 缺陷修复轮：**显式解冻**重登记 33,900 → 34,358 B（+458 B / +1.35%）──
 *
 * 作者裁决「根修 + 止血，**含解冻 pick-layer.js**」。选择器的生成 / 观测都在页面侧产物里，
 * 而 R4 的三处根修只能落在这里：① `selectorFor` 产出的选择器**永不截断**
 * （`SELECTOR_STORE_MAX` = 512 + 超限回退 compact 链）—— 旧的 `slice(0,120)+省略号` 是**非法 CSS**，
 * 被 `resolveRef` 读成「元素不存在」⇒ 引用**出生即死**（真机选择器实测 121 字）；② `resolveRef`
 * 把 `invalid-selector`（解析器抛错）与 `missing`（0 命中）**分开返回**；③ `selectorForDisplay`
 * 承载**展示层**截断（`pick-overlay.ts#describe` 的浮层标签改走它，与存储值分离）。
 * 解冻按 V3-VOL-2 先例**显式登记**（不是静默放开），且**不**把字节迁进常驻 `content.js`
 * （177,076 B / sha `52a82620…` 逐字节不变，见 `pick-layer-budget` 的联动断言）。
 * 容差仍 0（`+1 B` @ 34,359 必 FAIL）；前值 33,900 / 32,391 逐字保留在 HISTORY。
 */
export const PICK_LAYER_BASELINE_BYTES = 34_358;

/** `PICK_LAYER_CEILING` = 实测值（**无容差**；+1 B → FAIL）。 */
export const PICK_LAYER_CEILING = PICK_LAYER_BASELINE_BYTES;

/** `dist/pick-layer.js` 的登记实测值（`PICK_LAYER_BASELINE_BYTES` 的同源断言）。 */
export const PICK_LAYER_FINAL_ARTIFACT_BYTES = 34_358;

/**
 * **历史值逐字保留**（重登记纪律：历史只可追加，不得改写）。
 * 32,391 = 首轮（v3-4 build 轮）发表的实测基线，被 2026-09-17 的 V3-VOL-2 重登记取代。
 */
export const PICK_LAYER_BASELINE_BYTES_HISTORY = [32_391, 33_900] as const;

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
    direction: 'raised',
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
    direction: 'raised',
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
  /**
   * 〖R4 缺陷修复轮（2026-09-22；作者裁决「根修 + 止血，**含解冻 pick-layer.js**」）〗
   *
   * **显式解冻重登记（无容差口径不变）**：33,900 → **34,358 B（+458 B / +1.35%）**。
   *
   * 为什么必须动它：选择器的**生成**（`selectorFor`）与**观测**（`resolveRef`）都在页面侧产物里
   * （`src/content/ref-capture.ts`，`dist/pick-layer.js` 的输入模块）。R4 的根修 —— 存储 / 查询值
   * **永不截断**（`SELECTOR_STORE_MAX` = 512 + 超限回退 compact 链）、`selectorForDisplay` 承载
   * **展示层**截断、`resolveRef` 把 `invalid-selector` 与 `missing` 分开返回 —— 只能落在这一侧。
   * 因此按 V3-VOL-2 先例**显式解冻**并重登记（不是静默放开，也**不**把字节挤进常驻 `content.js`：
   * 177,076 B / sha `52a82620…` 本轮逐字节不变，由 `pick-layer-budget` 的联动断言机核）。
   *
   * 变更内容：`ref-capture.ts`（去截断 + `SELECTOR_STORE_MAX` + `selectorChain(compact)` 回退 +
   * `selectorForDisplay` + `resolveRef` 的 `invalid-selector`）；`pick-overlay.ts#describe` 的浮层
   * 标签是**展示面** ⇒ 改走 `selectorForDisplay`（与存储值分离）。实证：`ref-capture.test.ts` 的回环
   * 断言（>120 真实链 `querySelector` 命中捕获元素本身）+ `ref-rescue.test.ts` 的逐字符同源对拍
   * （SW 镜像与页面口径同字）+ `test/ui/page-input.mjs` ⑰ 的 Chromium 真实 DOM 回环。
   *
   * 上限口径：**容差仍为 0**（`+1 B` @ 34,359 必 FAIL）；前值 33,900 / 32,391 逐字保留在
   * `PICK_LAYER_BASELINE_BYTES_HISTORY`；与 `CONTENT_MAX_BYTES` 各自独立、不合并计数（EC-V3-012）。
   */
  {
    id: 'r4-selector-fix',
    direction: 'raised',
    roundKind: 'registry-fidelity-round',
    feature: 'specs-tree-web-cli-plugin-v3-ui',
    date: '2026-09-22',
    source: 'packages/web-cli-plugin/dist/pick-layer.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy:
      'SDDU defect-fix round R4（2026-09-22, post-closeout; 作者裁决「根修 + 止血，含解冻 pick-layer.js」at HEAD 953a2ed）',
    reason:
      '**显式解冻重登记（+458 B / +1.35%）：33,900 → 34,358 B**。理由是**正确性修复**而非新功能：' +
      '`selectorFor` 把 >120 字的选择器截断成 `slice(0,120)+省略号` 产出**非法 CSS**，`resolveRef` 又把解析器抛错' +
      '与「0 命中」同吞为 `missing` ⇒ 拾取到的引用**出生即死**（真机选择器实测 121 字、目标仍在页面上）。' +
      '两处都只能在页面侧产物里修：① `src/content/ref-capture.ts`：`selectorFor` **永不截断**' +
      '（`SELECTOR_STORE_MAX` = 512；超限改用 compact 链 —— 丢 `tag.class` 类片段、保留每一级 `:nth-of-type` ' +
      '与 `#id` / `[data-*]` 锚点）、新增 `selectorForDisplay` 承载**展示层**截断、`resolveRef` 的抛错分支改为 ' +
      '`invalid-selector`；② `src/content/pick-overlay.ts#describe` 的浮层标签（**展示面**）改走 ' +
      '`selectorForDisplay`，与存储 / 查询值分离。**放置口径**：字节落在既有的第 5 个产物（按需注入），' +
      '**不**挤进常驻 `content.js`（177,076 B / sha `52a82620…` 本轮逐字节不变）。' +
      '**容差仍为 0**（`+1 B` @ 34,359 反证必 FAIL）；前值 33,900 / 32,391 逐字保留在 ' +
      '`PICK_LAYER_BASELINE_BYTES_HISTORY`；与 `CONTENT_MAX_BYTES` 各自独立、不合并计数（EC-V3-012）。' +
      '**断言零删减**：`ref-capture.test.ts` 的两条截断口径断言按登记口径变更重锚（`SELECTOR_MAX` 仍是' +
      '展示上限 120；存储上限新增 `SELECTOR_STORE_MAX`），并**只增** 4 条 R4 用例；被替换的既有行逐行登记于' +
      ' v4 台账 `leafBases[].registeredUncoveredLines`。',
    baselineBeforeBytes: 33_900,
    baselineAfterBytes: 34_358,
    ceilingBeforeBytes: 33_900,
    ceilingAfterBytes: 34_358,
    assertionNonRemovalEntries: ['R4-MR-ref-capture-test'],
    historyRetainedBytes: [33_900, 32_391],
    ceilingUncappedFormulaBytes: 34_358,
  },
];

export const PICK_LAYER_BASELINE_META = {
  measuredOn: '2026-09-22',
  source: 'packages/web-cli-plugin/dist/pick-layer.js',
  buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
  measuredBy:
    'SDDU defect-fix round R4（2026-09-22, post-closeout; 作者裁决「根修 + 止血，含解冻 pick-layer.js」at HEAD 953a2ed）',
  /** 前值（V3-VOL-2 显式重登记值）：33,900 B —— 与 32,391 一并逐字保留在 PICK_LAYER_BASELINE_BYTES_HISTORY。 */
  previousBaselineBytes: 33_900,
  /** 方向：**显式提升**（解冻）重登记（33,900 → 34,358，+458 B / +1.35%）。 */
  direction: 'raised',
  /** 容差 = 0（无容差口径，与 `content.js` 同级）。 */
  tolerance: 0,
  /** TASK-401 spike 的 S2 实测（最小骨架）与上限，供来源可核。 */
  spikeSkeletonBytes: 8_606,
  spikeLimitBytes: 60_000,
  disambiguation:
    '与 `CONTENT_MAX_BYTES`（177,076 B，常驻 `content.js`）**各自独立**；两者不得合并计数，也不得互相顶替。',
  /** 五要素披露的第二份落点（登记册 {@link PICK_LAYER_RE_REGISTRATIONS} 是权威值）。 */
  reRegisteredFrom:
    'v3-4 build 轮 32,391 B（2026-09-16 首轮实测，容差 0）→ 2026-09-17 V3-VOL-2 显式重登记 33,900 B → ' +
    '2026-09-22 R4 缺陷修复轮**显式解冻重登记** 34,358 B（选择器截断根修 + 诊断分离；作者裁决「含解冻 pick-layer.js」）。',
  reason:
    '2026-09-22 显式**解冻**重登记：33,900 → 34,358 B（+458 B / +1.35%）。' +
    '理由 = 本次增长承载**正确性修复**：`src/content/ref-capture.ts#selectorFor` 产出的选择器曾把 >120 字截断成 ' +
    '`slice(0,120)+省略号`（非法 CSS），`resolveRef` 又把它读成「元素不存在」⇒ 引用**出生即死**；' +
    '根修 = 存储 / 查询值**永不截断**（`SELECTOR_STORE_MAX` = 512 + compact 回退）+ 展示层与存储值分离 + ' +
    '`invalid-selector` 与 `missing` 分开返回。解冻走 V3-VOL-2 先例的**显式登记**（不是静默放开）；' +
    '改动只落页面侧既有文件，`dist/content.js` 177,076 B / sha `52a82620…` 逐字节不变。' +
    '来源 = `npm run build --workspace @lgdl/web-cli-plugin` + `stat -c %s dist/pick-layer.js`（34,358）；' +
    '前值 33,900 / 32,391 逐字保留在 PICK_LAYER_BASELINE_BYTES_HISTORY；容差仍 0（+1 B @ 34,359 必 FAIL）。',
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
  const formulaCeilingBytes = Math.floor(baselineBytes * (1 + tolerance));
  // ── V4-4 TASK-811 (ADR-V4-039 §5 / 裁决 V3-VOL-3 裁决 6) ────────────────────
  // `effectiveCeiling = min(absoluteCeilingBytes, floor(currentBaseline × 1.05))`.
  // The absolute ceiling is the LONG-TERM HARD WALL; the 5% formula is the per-round
  // SOFT discipline. Taking the minimum is what keeps both meaningful: the soft rule
  // can bite inside a round, and the wall can never be widened by re-registering.
  // While the marker is unresolved the absolute wall simply does not exist yet
  // (`resolved:false` ⇒ formula only) — the closure itself is judged separately by
  // `evaluatePendingAbsoluteCap()`.
  const wall = PENDING_ABSOLUTE_CAP.resolved ? PENDING_ABSOLUTE_CAP.absoluteCeilingBytes : null;
  const ceilingBytes = wall !== null ? Math.min(wall, formulaCeilingBytes) : formulaCeilingBytes;
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
      `min(绝对上限 ${wall ?? '未闭合'}, floor(基线 ${baselineBytes}B × ${(1 + tolerance).toFixed(2)})) —— 硬墙 × 轮内软纪律（裁决 V3-VOL-3 ⑥）；cap ` +
        '`SIDEPANEL_CEILING_CAP_RECORD` 仍 record-only（判定路径不含它）',
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

/** `ceilTo50KB(x) = ⌈x / 51200⌉ × 51200` — the 50 KB tier used by the V3-VOL-3 rule. */
export function ceilTo50KB(x: number): number {
  return Math.ceil(x / 51_200) * 51_200;
}

/** The 50 KB tier step (bytes) — the V3-VOL-3 derivation base. */
export const ABSOLUTE_CAP_TIER_BYTES = 51_200;
/** The V3-VOL-3 margin over the 50 KB tier (实测值上取整到 50KB 档 + 10% 余量). */
export const ABSOLUTE_CAP_MARGIN = 1.1;

/**
 * The measured `dist/sidepanel.js` **at the v4-4 closeout** (the ONLY numeric source
 * of the closure derivation). Historical fact — it is what `v3Vol3Closeout` and the
 * density registry recorded on 2026-09-19.
 *
 * 〖V4-4 R2（2026-09-19）〗R2 按编排器裁决 KL-V44-01 ② 动了一处 `src`（`chat-state.ts`
 * 的自动归并接线 ⇒ 产物 465,000 → **465,277 B**，+277 B / +0.06%），因此**现行登记基线**
 * （{@link SIDEPANEL_BASELINE_BYTES}）与 `PENDING_ABSOLUTE_CAP.newBaselineBytes` 同步前移
 * （走「作者确认占位」规则重登，见 `docs/v4-supersession-ledger.json#v3Vol3Closeout`）。
 * **档位与绝对上限不变**：`ceilTo50KB(465,277) = 512,000`（同一 50 KB 档）⇒
 * `absoluteCeilingBytes` 仍 **563,200 B**。本常量保持闭合时的实测值 465,000 不改写历史，
 * 其「档位不变」由 `size-ruling-vol3.test.ts` 逐条复算。
 */
export const V3_VOL3_B_FINAL_BYTES = 465_000;
/** `ceilTo50KB(B_final)` — the tier the absolute ceiling is derived from. */
export const V3_VOL3_TIER_BYTES = ceilTo50KB(V3_VOL3_B_FINAL_BYTES);

/**
 * 〖V5-2 R1（2026-09-22，编排器裁决① 显式升档）〗**现行档位** = `ceilTo50KB(现行基线)`。
 *
 * 裁决 V3-VOL-3 的档位推导是「`ceilTo50KB(B_final)` × 1.10」，而历轮重登记都要求
 * 「档位**未下移**」。V5-2 R1 的实测 518,543 B 使 `ceilTo50KB(518,543) = **563,200**`
 * —— 档位**上移**一档（512,000 → 563,200），因此编排器裁决①：**显式登记档位上调**，
 * 绝对上限随之 563,200 → **619,520**（`563,200 × 1.10`）。历史闭合三值
 * （465,000 / 512,000 / 563,200）逐字保留于 `V3_VOL3_*` 与台账 `v3Vol3Closeout`。
 */
export const SIDEPANEL_TIER_BYTES = ceilTo50KB(SIDEPANEL_BASELINE_BYTES);

export const PENDING_ABSOLUTE_CAP: PendingAbsoluteCap = {
  since: 'V3-VOL-3',
  obligation: '方案 F 重构（聊天流统一承载）落地收口时，必须重新定 sidepanel 体积基线并设置绝对值上限',
  // ── V4-4 TASK-811（ADR-V4-039）：带值闭合（v4 为最后完成叶）──────────────────
  // ① 实测 B_final = 465,000 B（`stat -c %s dist/sidepanel.js`，禁预估）—— 闭合时的实测值
  // ② 档位 = ceilTo50KB(465,000) = 512,000 B
  // ③ 绝对上限 = 512,000 × 1.10 = 563,200 B
  // 〖V4-4 R2〗`newBaselineBytes` 与**现行登记基线同源**（R2 重锚后为 465,277 B；档位
  // ceilTo50KB(465,277) 仍是 512,000 ⇒ 绝对上限仍是 563,200，三值中的后两值未动）。
  // 〖V5-2 R1（2026-09-22，编排器裁决①）〗**档位显式上调**：`ceilTo50KB(518,543) = 563,200`
  // （上移一档）⇒ `absoluteCeilingBytes` = **619,520**（= 563,200 × 1.10）；`resolvedOn`
  // 保持闭合实测日期；`authorConfirmation` 保持 `pending-author-line`（**不伪称已确认**）。
  resolved: true,
  newBaselineBytes: SIDEPANEL_BASELINE_BYTES,
  absoluteCeilingBytes: Math.round(SIDEPANEL_TIER_BYTES * ABSOLUTE_CAP_MARGIN),
  resolvedOn: '2026-09-19',
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

/**
 * ── I-10（v4-4 快修轮）：披露**算术**机核 ─────────────────────────────────────
 *
 * The review found the `v4-4-reviewfix` disclosure clause said「+12,683 B，+2.73%」while the
 * registered fields (and the real artifact) were **+12,886 B / +2.77%** — and nothing could
 * notice, because the disclosure judge only checked「非空 ∧ before < after」. A disclosure
 * whose numbers do not even agree with its own registered fields is exactly the
 * 「登记值 ↔ 叙述脱钩」failure this file exists to prevent.
 *
 * The canonical clause is the one every recent round writes:
 *
 *     `<before> → <after> B（+<Δ> B，+<P>%）`      (ASCII parens/commas are accepted too)
 *
 * A machine check needs a **parseable** clause, not prose-mining: when a round writes the
 * canonical clause, `before` / `after` / `Δ` / `P` must all agree with the registered fields
 * (`Δ == after − before` and `P == round(Δ/before×100, 2)`). Rounds that predate the clause
 * (v3-x and earlier) expose no canonical tuple ⇒ nothing to check (this is a coverage
 * statement, not a relaxation: **within** the clause nothing is allowed to disagree).
 * `*` is stripped first so the emphasised form (`**478,163 B**`) is still machine-readable.
 * 〖V5-2 收口轮〗因本轮是**首个显式净减轮**（`direction: 'lowered'`，Δ = −86 B），元组的
 * **符号**必须进入捕获组：`Δ` / `P` 现在都是**带符号数**（`[+\-]?…`），正向轮次逐字不变
 * （`+6,329` / `+1.18%` 仍解析为 `6,329` / `1.18`），净减轮解析为 `-86` / `-0.02`。
 */
export const RE_REGISTRATION_DISCLOSURE_PATTERN =
  /([\d,]+)\s*→\s*([\d,]+)\s*B\s*[（(]\s*([+\-]?[\d,]+)\s*B\s*[，,]\s*([+\-]?\d+(?:\.\d+)?)\s*%\s*[）)]/g;

const parseDisclosureNumber = (text: string): number => Number(text.replace(/,/g, ''));

/**
 * The arithmetic problems of **one** disclosure text against the registered before/after
 * values (empty = consistent, or no canonical clause to judge). Shared by the per-entry
 * judge and by the `META.measuredBy` judge in `size-ruling-vol3.test.ts`.
 */
export function disclosureArithmeticProblems(
  text: string,
  expected: { readonly beforeBytes: number; readonly afterBytes: number },
  options: { readonly firstTupleOnly?: boolean } = {},
): readonly string[] {
  const problems: string[] = [];
  const all = [...text.replace(/\*/g, '').matchAll(RE_REGISTRATION_DISCLOSURE_PATTERN)];
  // `META.measuredBy` is a **chain** of rounds (newest first), so only its first tuple
  // is the current round's; an entry's own `reason` carries exactly one.
  const matches = options.firstTupleOnly ? all.slice(0, 1) : all;
  for (const m of matches) {
    const [before, after, delta, pct] = [
      parseDisclosureNumber(m[1] as string),
      parseDisclosureNumber(m[2] as string),
      parseDisclosureNumber(m[3] as string),
      Number(m[4] as string),
    ];
    const clause = m[0];
    if (before !== expected.beforeBytes) {
      problems.push(`披露元组的 before ${before} ≠ 登记字段 ${expected.beforeBytes}（${clause}）`);
    }
    if (after !== expected.afterBytes) {
      problems.push(`披露元组的 after ${after} ≠ 登记字段 ${expected.afterBytes}（${clause}）`);
    }
    const registeredDelta = expected.afterBytes - expected.beforeBytes;
    if (delta !== registeredDelta) {
      problems.push(`披露元组的 Δ ${delta} ≠ 登记字段 Δ ${registeredDelta}（${clause}）`);
    }
    const expectedPct = Number(((registeredDelta / expected.beforeBytes) * 100).toFixed(2));
    if (pct !== expectedPct) {
      problems.push(`披露元组的百分比 ${pct}% ≠ 登记字段复算 ${expectedPct}%（${clause}）`);
    }
  }
  return problems;
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
    const delta = r.baselineAfterBytes - r.baselineBeforeBytes;
    if (delta > 0) {
      if (r.direction === 'lowered') push('baseline', '基线增重但 direction="lowered"（声明与算术矛盾）');
    } else if (delta < 0) {
      // 〖V5-2 收口轮〗**显式净减轮**（validate R1 N-01：删掉 op.perm.request 的重复失败行写者）。
      // 允许净减，但**必须**显式声明 `direction: 'lowered'`：静默下调仍违规；方向与 Δ 的双向
      // 机核由 `reRegistrationDirectionProblems()` 承担（`lowered` ⇒ Δ<0）。
      if (r.direction !== 'lowered') push('baseline', '净减轮必须显式声明 direction="lowered"（不得静默下调）');
    } else {
      if (r.direction !== 'unchanged') push('baseline', '零字节轮必须显式声明 direction="unchanged"');
    }
    for (const problem of disclosureArithmeticProblems(r.reason, {
      beforeBytes: r.baselineBeforeBytes,
      afterBytes: r.baselineAfterBytes,
    })) {
      push('reasonArithmetic', problem);
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
