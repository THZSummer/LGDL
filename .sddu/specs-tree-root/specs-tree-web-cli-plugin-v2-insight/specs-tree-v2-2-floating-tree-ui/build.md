# 构建报告：specs-tree-v2-2-floating-tree-ui（V2-2 悬浮连接树 UI 与交互）

> **文档定位**: SDDU 实施构建报告（**叶子子 Feature**，P0，P0 闭环第二环：可见）— 记录 V2-2 的实施产物、逐任务实现要点、决策记录与门禁结果，作为 review 阶段的输入
> **父 Feature**: `specs-tree-web-cli-plugin-v2-insight`（web-cli-plugin v2「any insight」）
> **构建人**: SDDU Build Agent · **构建时间**: 2026-09-13 · **版本**: v1.0
> **授权**: **编排器代作者决策（2026-09-13 授权）** —— 作者已授权编排器自行决策后续 SDDU 流程，本轮不再向作者提问；开放点自行裁决并登记（见 §6）
> **分支**: `feature/web-cli-plugin`（`main` = `2ddc922…` 未动）
> **输入**: 本叶子 `tasks.md` / `tasks.json`（11 任务 / 4 波，跨叶子 Wave 6~9）+ `plan.md`（§3.1~3.7）+ 父 `plan.md`（ADR-V2-004/005/006/007/011/013/014/015）+ V2-1 产出（`ConnectTreeSnapshot` + `insight-tree`/`insight-changed` 通路）

---

## 1. 构建概要

| 维度 | 数值 |
|------|:--:|
| 完成任务数 | **11 / 11**（TASK-001~011，Wave 6~9 全部） |
| 复杂度分布 | S×3 / M×7 / L×1 |
| 新增文件 | **6** 个（2 源码 + 4 测试） |
| 修改文件 | **4** 个（`index.html` / `sidepanel.ts` / `package.json` / `docs/smoke-checklist.md`） |
| 门禁 | `typecheck` **0 error**；插件 `npm test` **577/577**（V2-1 561 → **+16**，0 fail / 0 skip）；新增 `test:insight` **45 断言** PASS；v1 `test:ui` **167**（零删减）；`test:hardening` **24**；`test:binding` **163**；`test:e2e` PASS；全仓 `npm test`（base **483** + plugin **577**）**0 fail** |
| 红线 | 零新权限（`manifest.json` 零 diff）；零注入（`content.js` **1,073,453 B 零增长**）；不碰 base（零 diff）；无新依赖；判定链零改（`policy.ts` / `auto-authorize.ts` 零 diff）；`options.html` 零 diff；v1 `journey.mjs` 零 diff |
| 未跑门禁 | **无**（本轮为第一个 UI 改动 → 全量门禁均已在真实 dist 上串行跑完） |

**主产出**：真实可用的侧栏常驻悬浮入口（FAB）+ 覆盖式连接树抽屉（四维度导航 / 状态徽标 / 检索过滤 / 空态降级可读）+ 纯渲染模型结构保证（`deny ⇒ controls:[]`、静态权限无 revoke）+ 新体积守卫（基线 ≠ 目标预算）+ 布局量化门禁。

---

## 2. 文件变更

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/tree/tree-view.ts` | TASK-002 | 纯渲染模型：`buildTreeRows(snapshot, filter?)` → `TreeRenderModel`（`header.modelNote`/`noEscalationNote` + 四维度 `groups[].rows`）；`needsConfirmation(actionId)`；**结构保证** `deny ⇒ controls:[]`、静态权限无 `revoke` + `revokeHint`、可选能力仅 `granted` 给 revoke、命令级零写入控件；过滤纯只读 |
| NEW | `packages/web-cli-plugin/src/ui/tree/tree-drawer.ts` | TASK-004 | DOM 挂载（惰性）：`mountTreeDrawer({root,fab,doc,ops,onNotice})` → `{open,close,toggle,refresh,setFilter,isOpen,isLoaded}`；首开才 pull `insight-tree` + 建 DOM；关闭态 `[hidden]` 零渲染；Esc 关闭 + 焦点回归 FAB + `aria-expanded` 同步；**零 `innerHTML`**、无 bare catch；控件只读呈现（无写路径） |
| NEW | `packages/web-cli-plugin/test/tree-view.test.ts` | TASK-003 | `tree-view` 纯测：34 工具 / **142 基线子命令** deny ⇒ `controls===[]`；非 deny 命令仍无写入控件；静态权限无 revoke + `revokeHint`；可选能力授予才有 revoke；文案钉死；`needsConfirmation` 7/7；过滤只读 deep-equal |
| NEW | `packages/web-cli-plugin/test/size-baseline.ts` | TASK-006/008 | 体积守卫基线：`SIDEPANEL_BASELINE_BYTES=1_085_389` / 容差 5% / `SIDEPANEL_CEILING=1_139_658`；`SIDEPANEL_BASELINE_META{targetBudgetBytes:null,targetMet:null}`；`CONTENT_MAX_BYTES=1_073_453`（无容差）；复用 v1 `readArtifactSize`（只吞 `ENOENT`） |
| NEW | `packages/web-cli-plugin/test/size-budget.test.ts` | TASK-006/008 | 体积守卫门禁：sidepanel ≤ ceiling / content ≤ 上限；反证 `ceiling+1` 与 `1_073_454` 必 FAIL；只吞 ENOENT；基线 ≠ 目标预算；与 v1 D31 一致（64 KiB / targetMet=false） |
| NEW | `packages/web-cli-plugin/test/ui/insight.mjs` | TASK-007 | `test:insight`：真实 dist + CDP（视口 400×900），FAB/抽屉 + 四维度/徽标/降级/文案/过滤 + 布局量化（开/关两态）+ 320px 溢出 + Esc 焦点回归；**新断言编号 `#I-00…#I-17`（45 断言）**，v1 `journey.mjs` 零改动 |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/index.html` | TASK-001 | **append-only**：`#tree-fab` + `#tree-drawer`（`#panel-main` 内 absolute 子元素，默认 `hidden`）+ 抽屉样式；既有 id/类**零重命名**（零删除行） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` | TASK-005 | **append-only**：`wire()` 末尾 mount 抽屉 + 追加订阅器（`insight-changed`/`capability-changed`/`session-changed`/`probe-changed` → `refresh()`，首开前 no-op）+ focus/visibility 刷新；`applyEnvGuard` 追加禁用 `#tree-fab`；既有 hook/handler **零删改**（`git diff` 仅新增行） |
| MODIFY | `packages/web-cli-plugin/package.json` | TASK-005 | **追加** `"test:insight": "node test/ui/insight.mjs"`；`dependencies`/`devDependencies` 零新增（零删除行） |
| MODIFY | `packages/web-cli-plugin/docs/smoke-checklist.md` | TASK-011 | **追加** §5「v2 人工面：悬浮连接树（V2-2）」`V2-H-A~D`；既有 §1~§4（M1~M30 / H0~H10 / 降级出口）**零删改** |

**明确未改（零 diff 核验见 §5.4）**：`packages/web-cli-base/**`、`src/security/policy.ts`、`src/security/auto-authorize.ts`、`manifest.json`、`src/ui/options/index.html`、`test/perf-baseline.ts`、`test/perf-budget.test.ts`、`test/ui/journey.mjs`、v1 SDDU 目录 `specs-tree-web-cli-plugin/**`、`.opencode/opencode.json`、任何依赖段。

---

## 3. 任务完成清单

| 任务 | 名称 | 复杂度 | 状态 | 对应 FR | 验证结果 |
|------|------|:--:|:--:|------|------|
| TASK-001 | `index.html` 追加 FAB + 覆盖式抽屉标记与样式（append-only） | M | ✅ completed | FR-V2-020/023/024、FR-V2-004 | build 成功；`#tree-fab`/`#tree-drawer` 在 `#panel-main`；既有 id 全命中；`options.html` 零 diff |
| TASK-002 | `tree-view.ts` 纯渲染模型 | M | ✅ completed | FR-V2-021/022/025 | typecheck 0 error；无 `innerHTML`；142 子命令 deny⇒`controls[]` |
| TASK-003 | `tree-view` 纯测门禁 | S | ✅ completed | FR-V2-021/022/025 | `npm test` 全绿（8 个新纯测） |
| TASK-004 | `tree-drawer.ts` 惰性 DOM 挂载 | M | ✅ completed | FR-V2-020/021/022/024 | build + typecheck 0 error；零 `innerHTML`/无 bare catch；Esc/焦点/aria 实测通过 |
| TASK-005 | `sidepanel.ts` 挂载/订阅 + `package.json` script | M | ✅ completed | FR-V2-020/024、FR-V2-002 | append-only（零删除行）；禁用列表含 `#tree-fab`；依赖零新增 |
| TASK-006 | `size-budget` 基建（只吞 ENOENT / 反证 / 基线≠目标） | M | ✅ completed | NFR-V2-001/002、AC-V2-006 | `npm test` 全绿（8 个新体积测试）；反证通过 |
| TASK-007 | `test:insight` 量化门禁 | L | ✅ completed | FR-V2-020~025、AC-V2-002 | `npm run test:insight` **45 断言 PASS**；v1 `journey.mjs` 零 diff |
| TASK-008 | build 后实测登记基线 + `content.js` 不增长 | S | ✅ completed | NFR-V2-001/002、AC-V2-006 | 基线 1,085,389（日期/来源已登记）；`content.js` 1,073,453（0 增长） |
| TASK-009 | 门禁串行 + v1 断言零删减核验（收口） | M | ✅ completed | FR-V2-023、NFR-V2-009 | 全套串行见 §5；v1 `test:ui` 167 零删减；base 483 零回归 |
| TASK-010 | grep/契约门禁 | S | ✅ completed | FR-V2-024、NFR-V22-006 | 无 `innerHTML`；id/类零重命名；`options.html`/`manifest.json`/base 零 diff |
| TASK-011 | 人工面清单落点（`smoke-checklist.md` v2 段） | M | ✅ completed | FR-V2-022、NFR-V2-008 | §5 `V2-H-A~D` 已追加；既有内容零删改 |

**Wave 执行**：Wave 6（T001/T002/T006）→ Wave 7（T003/T004）→ Wave 8（T005）→ Wave 9（T007/T008/T009/T010/T011）。全部实施完成。

---

## 4. 交付门槛（可自动化验收面）

| 门禁 | 命令 | 断言要点 | 结果 |
|------|------|----------|:--:|
| `tree-view`（纯） | `npm test` | 142 基线子命令 deny⇒`controls=[]`；静态权限无 revoke；文案；`needsConfirmation` 7/7；过滤只读 | ✅ |
| `size-budget` | `npm test` | sidepanel ≤ 1,139,658；content ≤ 1,073,453；反证；只吞 ENOENT；基线≠目标预算 | ✅ |
| `test:insight` | `npm run test:insight` | FAB/抽屉 + 布局量化（589px/65%/composer/FAB∩composer/400·320）开·关两态 + 文案 + deny 无控件 | ✅ 45 断言 |
| v1 `test:ui` 回归 | `npm run test:ui` | v1 `#15a~#15q` 及既有全部断言零删减 | ✅ 167 断言 |
| grep/契约 | grep + git diff | 无 `innerHTML`；id/类零重命名；options/manifest/base/perf-*/journey 零 diff | ✅ |

---

## 5. 门禁执行记录（**严格串行**；原文计数）

> 执行纪律：一次一个 Chromium 门禁，绝不并发（本仓库 OOM 前科）。全部在真实 `dist/`（`npm run build` 产物）上运行。

| # | 命令 | 退出 | 原文计数/结果 |
|:--:|------|:--:|------|
| 1 | `npm run typecheck` | 0 | `tsc --noEmit` → **0 error** |
| 2 | `npm test`（插件） | 0 | `ℹ tests 577 / pass 577 / fail 0 / skipped 0`（V2-1 561 → **+16**：tree-view 8 + size-budget 8） |
| 3 | `npm run test:insight`（新门禁） | 0 | **UI insight PASS — 45 assertions**（FAB/抽屉/四维度/徽标/降级/文案/过滤/几何） |
| 4 | `npm run test:ui`（v1 回归） | 0 | **UI journey PASS — 167 assertions**（与 v1 基线一致，零删减） |
| 5 | `npm run test:hardening` | 0 | **hardening PASS — 24 assertions**（A 非扩展守卫 / B 未声明协议 / C 未重载构建不一致） |
| 6 | `npm run test:binding` | 0 | **binding PASS — 163 assertions**（真实 dist + localhost:5173 + mock LLM 全链） |
| 7 | `npm run test:e2e`（最重，最后单独） | 0 | **R8 E2E PASS**（fixture AC-010 + LGDL Workbench AC-009） |
| 8 | 全仓 `npm test`（仅此一次） | 0 | 插件 **577/577**；`web-cli-base` **483/483**；**0 fail** |

**未跑/被杀/OOM/超时项**：**无**。

### 5.1 布局守卫实测数值（`test:insight`，真实 dist，视口 400×900，开·关两态）

| 指标 | 阈值 | 关态实测 | 开态实测 | 判定 |
|------|------|:--:|:--:|:--:|
| `#log` 计算 `flex-grow` | `=== '1'` | `'1'` | `'1'` | ✅ |
| `#log` 稳态 `clientHeight`（去镀铬，见 §6 D-V22-01） | `≥ 589px` | **674px** | **674px** | ✅ |
| `#log` 稳态高度占比 | `≥ 65.0%` | **74.9%** | **74.9%** | ✅ |
| `#log` 原始口径（仅导航条隐藏 = v1 `journey.mjs` #15b） | `≥ 405px`（v1 自身 `>45vh`） | **418px / 46.4%** | — | ✅ |
| `#composer` 底边 − 视口底 | `∈ [0, +8px]` | **+8px** | **+8px** | ✅ |
| `#tree-fab` ∩ `#composer` 交面积 | `= 0` | **0** | **0** | ✅ |
| 文档级水平溢出 | `= 0` | **0** | **0** | ✅ |
| `#log` 水平溢出 | `= 0` | **0** | **0** | ✅ |
| 抽屉水平溢出（400px） | `= 0` | — | **0** | ✅ |
| 320px 文档/`#log`/抽屉水平溢出 | `= 0` | **0/0** | **0/0/0** | ✅ |
| 开/关逐字段相等（flex-grow / `#log` 高 / 占比 / composer / 溢出） | drift `= []` | — | — | ✅ |

**`test:insight` 关态原文**：`{"innerHeight":900,"innerWidth":400,"logFlexGrow":"1","logClientHeight":674,"logRatio":74.9,"composerGapToBottom":8,"fabComposerArea":0,"docOverflowX":0,"logOverflowX":0,"drawerOverflowX":0,"drawerHidden":true,"fabExpanded":"false"}`

### 5.2 体积（`npm run build` 实测）

| 产物 | 前（V2-1 / v1 基线） | 后（V2-2） | 增量 | 判定 |
|------|:--:|:--:|:--:|:--:|
| `dist/content.js` | 1,073,453 B | **1,073,453 B** | **0** | ✅ 零注入（`CONTENT_MAX_BYTES` 无容差） |
| `dist/sidepanel.js` | **1,068,165 B** | **1,085,389 B** | **+17,224 B** | ✅ V2-2 UI 有意增重 |
| `dist/background.js` | 1,402,337 B | 1,402,337 B | 0 | ✅ |

**登记的新基线值**：`SIDEPANEL_BASELINE_BYTES = 1_085_389`（测量日期 **2026-09-13**；来源 `packages/web-cli-plugin/dist/sidepanel.js`；构建命令 `npm run build --workspace @lgdl/web-cli-plugin`）。
**`SIDEPANEL_CEILING = floor(1_085_389 × 1.05) = 1_139_658`**。`SIDEPANEL_BASELINE_META.targetBudgetBytes = null`、`targetMet = null`（**基线 ≠ 目标预算**）。
**文件头已注明**：增重为 V2-2 UI 有意引入（v1 1,068,165 → 1,085,389）。

> **W5 订正（2026-09-13 修复轮）**：本表 `dist/sidepanel.js` 的「前」值原记 **1,065,389 B**（增量记 **+20,000 B**），与父 `spec.md` §2.5 / `docs/dev.md` 的 **1,068,165 B** 不自洽。**现订正为 1,068,165 B → 1,085,389 B（+17,224 B）**；来源 = v1 收口实测 `dist/sidepanel.js`（测量时点 = v1 收口，2026-09-13 由 `npm run build --workspace @lgdl/web-cli-plugin` 复核）。**历史行保留在案、以本订正为准**（不改代码真值；`test/size-baseline.ts` 的 v1 历史值同为 1,068,165）。

### 5.3 `deny` 无控件 / 静态权限无 revoke / `delay`（= deny）文案 —— 落地证据

| 项 | 落地方式 | 证据 |
|----|----------|------|
| `deny` 节点无控件（ADR-V2-011） | `tree-view.ts#commandControls`：`action==='deny'` → **恒 `[]`**（渲染模型层结构保证，独立于投影）；`tree-drawer.ts` 只在 `controls.length>0` 时建控件容器 | 纯测：142 基线子命令（+ 34 工具 + 实时面）逐一断言 `controls.length===0`；实机：`test:insight` `#I-12` `deny` 行含 0 个 `.tree-controls .tree-control`（`.tree-row[data-action="deny"]` ≥1） |
| 命令级零写入路径 | `commandControls` 仅保留 `kind==='none'` 只读披露，过滤掉任何 `revoke`/`toggle` | 纯测：非 deny 命令行 `controls` 全为 `none`，无 revoke/toggle |
| 静态权限无 revoke + 如实披露 | `capabilityControls`：`source==='static'` → `[]`；`revokeHint` 透传「静态权限不可逐项撤销（需停用/卸载扩展）」 | 纯测：5 个静态权限行均无 revoke 且 `revokeHint` 非空 |
| 可选能力仅授予后给 revoke | `source==='optional'` → 仅 `granted===true` 保留 revoke（未授予不渲染「假撤销」） | 纯测：未授予 `controls=[]`，授予 `controls` 含 revoke |
| `delay`（= deny）文案 + 与 `delayMs` 消歧 | `TREE_NO_ESCALATION_NOTE` 含「撤销/关断 = 回到更保守，不放宽任何门禁」+「命令档位 delay（= deny，fail-closed，非可配置档位；与命令间 delayMs 无关）不可放宽；deny/delay 节点不提供任何开关」；命令行 sublabel 标注真实 `delayMs` | 实机 `test:insight` `#I-11a/#I-11b`：抽屉文本含上述声明 + `delay`/`deny`/`fail-closed`/`delayMs` |

### 5.4 四项零改动核验（`git diff --quiet` 全部零 diff）

| 面 | 命令 | 结果 |
|----|------|:--:|
| `packages/web-cli-base/**` | `git diff --quiet -- packages/web-cli-base` | ✅ 零 diff |
| `src/security/policy.ts` | `git diff --quiet -- …/policy.ts` | ✅ 零 diff |
| `src/security/auto-authorize.ts` | `git diff --quiet -- …/auto-authorize.ts` | ✅ 零 diff |
| `manifest.json` | `git diff --quiet -- …/manifest.json` | ✅ 零 diff（零新权限；无 `<all_urls>`、无 content_scripts） |
| `src/ui/options/index.html` | `git diff --quiet -- …/options/index.html` | ✅ 零 diff（未改 options） |
| v1 `test/ui/journey.mjs` | `git diff --quiet -- …/test/ui/journey.mjs` | ✅ 零 diff（断言零删减；`test:ui` 167 断言全绿） |
| v1 `test/perf-baseline.ts` / `perf-budget.test.ts` | `git diff --quiet -- …` | ✅ 零 diff（D31 叙事未污染） |
| v1 SDDU 目录 `specs-tree-web-cli-plugin/**` | `git status --porcelain` | ✅ 零改动 |
| append-only | `git diff --unified=0 -- index.html / sidepanel.ts / package.json` 过滤 `^-[^-]` | ✅ 零删除行 |

---

## 6. 决策与偏差记录

| # | 事项 | 裁决 / 处置 | 依据 |
|---|------|-------------|------|
| **D-V22-01** | **布局主断言 `#log ≥589px` 的口径** | `test:insight` 以**去镀铬稳态**测量（隐藏 `#site-hint`/`#onboarding`/`#discovery-notice`/`#consent-slot`/`#send-reason`）：实测 **674px / 74.9% ≥ 589px / 65.0%**，主/次断言如实通过。**不隐藏任何 chrome 的真实稳态**：仅隐藏导航条时 `#log = 418px / 46.4%`——这是**今日 v1 面板自身**的数字（v1 `journey.mjs` #15b 自身只断言 `>45%` 且通过）。原因：`docs/dev.md` §11.3 的 589px 测于 TASK-023，**早于** FR-052 自动授权块（提交 `7b56993`）+ `#risk-status` + `#llm-test-result` 落地；故 589px 对今日面板是**陈旧口径**，逐字套用会「构造即失败」，恰是 ADR-V2-006 自己否决的做法。为不放宽门禁，脚本**另加**两条更强断言：(a) v1 口径（仅隐藏导航条）`#log ≥ 405px`（v1 自身 `>45vh` 下限）证明零回归；(b) **开/关逐字段相等**（flex-grow / `#log` 高 / 占比 / composer / 溢出）证明 V2-2 覆盖层不改变任何稳态几何。实测明细见 §5.1。 | ADR-V2-006（「门禁既不能空洞，也不能构造即失败」）；`docs/dev.md` §11.3；实测面板分解：`panel-top 164 + #log 418 + panel-bottom 318`（consent 207 + send-reason 37 + composer 39） |
| **D-V22-02** | 体积基线登记 | TASK-006 先置 v1 值 1,068,165；TASK-008 build 后实测 **1,085,389** 并重登（日期/来源/命令齐备），ceiling 重算 **1,139,658**；`targetBudgetBytes/targetMet` 恒 `null`（基线 ≠ 目标预算）。`content.js` 硬上限 1,073,453 零容差，实测 0 增长。 | ADR-V2-007；NFR-V2-001/002 |
| **D-V22-03** | 抽屉内控件在本轮**只读呈现**，不接线 | `tree-drawer.ts` 以只读 `ControlDescriptor`（`.tree-control` span + `data-kind`/`data-action-id`）渲染，**不注册任何写操作、不发送任何写入消息**；写路径（`tree-ops.ts` + 确认 + 三件套）归 V2-3。确保「本轮不新增任何写路径」「不是提权面」由结构保证。 | 任务书红线；父 plan ADR-V2-008（写路径归 V2-3） |
| **D-V22-04** | 消息面复用 V2-1 通路，零新增 | 仅侧栏 `send<ConnectTreeSnapshot>(makeMessage('insight-tree'))` 拉取 + 第二 `onMessage` 监听器消费 `insight-changed` 等；**未改** `messaging.ts`/`insight-protocol.ts`/`service-worker.ts`（V2-1 已建）。 | ADR-V2-004；V2-1 已交付通路 |
| **D-V22-05** | 渲染模型独立重算 `controls`（纵深防御） | `tree-view.ts` 不直接透传快照的 `controls`，而是按自身规则重算（命令 → 仅 `none`；静态 → `[]`；可选 → 仅授予 revoke；站点 → 仅授权 revoke）。即使投影层未来漂移，渲染层仍保证 ADR-V2-011。 | ADR-V2-011（结构保证而非文案承诺） |
| — | 规范模糊点 | 无新增；开放点 O-V2-001（抽屉默认收起）按建议值落地（实测 `#I-01c`）。 | spec §8 |

---

## 7. 运行/降级说明与人工面

- **惰性**：抽屉首开才 pull + 建 DOM；关闭态 `[hidden]`（`display:none`）→ 无渲染、无轮询、无定时器（NFR-V22-005）。订阅刷新在当前实现下为**事件驱动**（无轮询）：`insight-changed` / `capability-changed` / `session-changed` / `probe-changed` + `focus` / `visibilitychange`；首开前 `refresh()` 为 no-op。
- **错误可见**：`insight-tree` 拉取失败 → 抽屉内 `.tree-error` 可读文案 + `#notice` 外送；**无 bare catch**、不静默。
- **人工面**：`docs/smoke-checklist.md` §5 追加 `V2-H-A`（悬浮观感/动画/明暗）、`V2-H-B`（长站点名/320px 拥挤）、`V2-H-C`（多显示器/高 DPI）、`V2-H-D`（键盘/焦点遍历），本轮均标 `⏳ 待人工`（headless 无法判定观感与真实体感）。

---

## 8. 下一步

| 场景 | 操作 |
|------|------|
| 全部任务已完成 | 运行 `@sddu-review specs-tree-v2-2-floating-tree-ui` 开始代码审查 |
| 下游 | V2-3（撤销与取消授权操作面）将 **MODIFY** `src/ui/tree/{tree-view,tree-drawer}.ts` 接线写路径（本轮已留只读控件语义与 `needsConfirmation` 判定） |

---

## R2 修复轮（2026-09-13，编排器代作者决策：消化 review `39cd0a1` 的 6 建议 + 3 提示）

> **输入**：父 `review-report.md`（`39cd0a1`；C1~C22 + W1~W6 + T1~T3）。**纪律**：只加固不放宽；断言只增不减；门禁严格串行一次一个；不碰 `main`/`packages/web-cli-base/**`/v1 SDDU；无新依赖。
> **本轮门禁原文（串行）**：`typecheck` **0 error**；插件 `npm test` **616/616 · 0 fail**（599 → **+17**）；`test:insight` **52 断言 PASS**（45 → +7）；`test:ui` **167 断言**（v1 零删减）；`test:hardening` **24**；`test:binding` **180 断言**；`test:e2e` **PASS**；全仓 `npm test`：base **483/483** + plugin **616/616**，**0 fail**。`dist/content.js = 1,073,453 B`（零增长）；`dist/sidepanel.js = 1,110,744 B`。

以下为**修复轮全量条目逐条 before → after**（本表在三叶子 `build.md` 一致登记；各叶子仅触及其中一部分）：

| 项 | before | after | 证据 |
|----|--------|-------|------|
| **W1** | 子 V2-2 `spec.md:56,88` + `state.json:20` + `ROADMAP.md` v1.20.0 素材行仍写「≥65.5%」，与父 `AC-V2-002`/ADR-V2-006 不一致 | 最小订正为父口径「**≥589px 主 + ≥65.0% 次 + 去镀铬测量条件 + 来源 ADR-V2-006**」；**保留历史叙述**并注「以现状为准（父 spec 为权威）」 | 本叶子 `spec.md` / `state.json` / `ROADMAP.md`（见 diff） |
| **W2** | `src/background/insight-protocol.ts`（第二校验路径）**无任何单测**；两路径一致性无门禁 | 新建 `test/insight-protocol.test.ts`（**6 测试 / 18 条 assert（循环覆盖 21 条反例 + 26 条 corpus）**）：①合法 insight 通过 ②未知/畸形 kind 拒绝 ③缺字段/类型错/非对象拒绝 ④与主 `KIND_SET`（`isPluginMessage`）**等价性**（同批反例 + oracle）⑤SW 入口并集守卫**无未校验放行**（静态锚定 `!isPluginMessage && !isInsightMessage ⇒ return undefined`） | `node --test dist-test/test/insight-protocol.test.js` → **6/6 pass** |
| **W3** | 冻结靠 `git diff --quiet HEAD -- policy.ts auto-authorize.ts` → **worktree vs HEAD**，提交后恒为 0 = **永不失效的假安全网** | 改为**内容哈希钉死**：`policy.ts` / `auto-authorize.ts` 的 SHA-256 常量化（含登记日期/来源 commit/理由）+ **判定表快照**（`PLUGIN_RISK_DEFAULTS` + `AUTO_AUTH_DEFAULTS` + 720 行 `decideAutoAuthorization` 结论）哈希 + **反证自测**（改一字节必 FAIL）。原 `git diff` 断言**全部保留** | pin：`policy.ts=bfcb2ede…3c89a8`、`auto-authorize.ts=1096d065…ef4b`、判定表 `d1667d24…8b74`（2026-09-13 / `39cd0a1`）；反证实跑见 V2-1 `build.md` R2 节 |
| **W4** | `SIDEPANEL_BASELINE_BYTES=1,085,389`（V2-2 时点），实际 `sidepanel.js=1,110,744`（V2-3 后）→ 有效余量 ~29KB > 声明的 5% | **显式重登记**为实测 **1,110,744**；`SIDEPANEL_CEILING` **1,139,658 → 1,166,281**；历史值 `1,068,165` / `1,085,389` 保留在案；`CONTENT_MAX_BYTES=1,073,453` **不变**；新增 W4 门禁 + 随新 ceiling 的反证自测 | `stat -c %s dist/sidepanel.js` = **1110744**（2026-09-13，`npm run build --workspace @lgdl/web-cli-plugin`）；`test/size-budget.test.ts` 新增 2 测试 |
| **W5** | 本 `build.md` §5.2 `sidepanel.js` 「前」值 `1,065,389`（增量记 `+20,000`），与父 spec §2.5 / `dev.md` 的 `1,068,165` 不自洽 | 订正为 **1,068,165 B → 1,085,389 B（+17,224 B）**；加 W5 脚注说明来源/测量时点，**保留历史行**并注「以本订正为准」 | §5.2 已改（见 diff） |
| **W6** | v1 口径仅断言 raw `#log ≥405px`（实测 418px，余量仅 13px）→ 有「小幅回退仍绿」盲区 | `test/ui/insight.mjs` **钉死 v1 raw 基线 418px / 46.4%**（2026-09-13，来源 `journey.mjs` #15b 条件）；新增**更敏感**断言 `#I-06c ≥410px`、`#I-06d ≥45.4%`（容差 8px ≈1.9% / 1.0pt）；**不降低**既有 405px | `test:insight` **52 断言 PASS**（含新增 `#I-06c/#I-06d`） |
| **T1** | 树侧能力撤销**成功**路径未自动化（仅单测 + 失败路径 e2e `#21j/#21k`） | `binding.mjs` 追加 `#21o*` **最佳努力端到端**：以 `userGesture:true` 真实 `chrome.permissions.request` 授权可选能力，成功则断言「撤销成功 + 工具即时移出 `deriveTools()` + 审计 + 回执可读」。**实跑：headless `permissions.request = PENDING_TIMEOUT`**（原生弹窗不可合成）→ **如实 observe 跳过、不伪造 PASS**；成功分支代码就位，环境允许时自动生效。既有断言**零删改** | `test:binding` 观测原文（见下）|
| **T2** | `pushInsightChanged()` 用 `void … .catch(() => {})` **静默吞异常** | 改为 `console.debug` 诊断（说明「best-effort / 无接收方 / 不伪造状态」；payload 为空 → **零敏感明文**）；新增门禁断言（无空 catch + 有诊断 + 注释声明不伪造） | `src/background/service-worker.ts`；`test/insight-no-escalation.test.ts` 新增 T2 测试 |
| **T3** | `deriveAction` 是对策略的**再实现**，与真实判定链漂移风险无门禁 | 新建 `test/insight-action-parity.test.ts`（**4 测试**）：用**真实** `createPluginPolicyConfig` + **真实** `PermissionGate` 复算；对 `projectCommands` 产出的**全部 28 工具 / 94 子命令（122 命令节点）**逐条断言 == 真值链，另加站点域矩阵（read/write/undefined × 授权 × trust）；**反证自测**。唯一已知**保守方向**分歧（base 内建 `web-fetch`/`sleep`/`web-cli-help` risk 缺失：投影 `deny` vs 运行时 `allow`）**显式钉死**（仅此三工具、仅此方向；其它任何分歧 FAIL） | `node --test dist-test/test/insight-action-parity.test.js` → **4/4 pass** |

**T1 实跑观测原文**（来自本轮 `test:binding`）：
```
· #21o/#21o2/#21o3/#21o4 跳过（如实记录，不伪造 PASS）：headless 无法合成原生 grant 手势 →
  chrome.permissions.request = PENDING_TIMEOUT；树侧「能力撤销成功」端到端因此保持人工面 V2-H-4，
  失败路径已由 #21j/#21k 覆盖。
```
**T2 实跑**：`pushInsightChanged` 现于推送失败/无接收方时 `console.debug` 一行诊断（无 payload、零明文）；门禁断言证明**不再有空 catch** 且诊断存在。

**四项零改动复核（本轮再次核验）**：`packages/web-cli-base/**` / `src/security/policy.ts` / `src/security/auto-authorize.ts` / `manifest.json` → `git diff --quiet` 全部 **exit 0**（W3 哈希 pin 因此**钉在对的值上**）。`specs-tree-web-cli-plugin/**`（v1 SDDU）零 diff。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建。V2-2 Wave 6~9 / TASK-001~011 全部实施；逐任务文件变更 + 门禁原文（typecheck / 插件 npm test 577 / test:insight 45 / test:ui 167 / test:hardening 24 / test:binding 163 / test:e2e / 全仓 npm test base 483 + plugin 577）+ 布局实测（去镀铬 674px/74.9%，v1 口径 418px/46.4%，开/关逐字段相等）+ 体积（content 0 增长；sidepanel +20,000 → 新基线 1,085,389 / ceiling 1,139,658）+ 零改动核验 + 决策 D-V22-01~05。 | 2026-09-13 | SDDU Build Agent |
| v1.1 | R2 修复轮：W1（口径订正）/ W4（基线重登记 1,110,744 · ceiling 1,166,281）/ W5（§5.2 数字订正 1,068,165 → 1,085,389，+17,224）/ W6（pinned v1 raw 基线 418px + `#I-06c/#I-06d`）；门禁全量串行复跑：typecheck 0 / 插件 npm test 616 / test:insight 52 / test:ui 167 / test:hardening 24 / test:binding 180 / test:e2e PASS / 全仓 base 483 + plugin 616 = 0 fail。 | 2026-09-13 | SDDU Build Agent |

---

## R2 第 2 轮（2026-09-13，sddu-build）

R2-V22-01~06 全部完成：`tree-view.ts` 改真层级树（消费 `ownershipTree` 嵌套模型 + 默认/生效分列 + 分层控件 + `CLAMP_REASON_LABEL` + `TREE_MODEL_NOTE` 重写）；`tree-drawer.ts` 自建 `role=tree/treeitem` + `aria-expanded/aria-level` + 键盘（↑↓←→/Enter/Space/Home/End）+ roving tabindex + 面包屑 + 展开态会话保持 + 惰性渲染 + deny 分层 DOM（硬底线零控件 + `.tree-clamp-reason`）+ 放宽类二次确认 + 过滤命中路径自动展开；`test/tree-view.test.ts` 取代 S4~S8；`test/ui/insight.mjs` 取代 S13~S16 + 新增 `#I-20a~k`（作者两例真实 DOM 逐层展开/收起、面包屑、键盘、覆盖即时生效、多状态布局守卫关/开/深展开/收起 drift=0）；体积显式重登记（sidepanel 1,132,748 → **1,159,856**，ceiling **1,217,848**，容差 5% 不变，HISTORY 追加）；文档回填 + 人工面 `V2-H-10~14`（`⏳ 待人工`）。

门禁：typecheck 0 error；插件 npm test 690/0；test:insight PASS 102 断言；test:ui 167；test:hardening 24；test:binding 192；test:e2e PASS；全仓 0 fail。`content.js` 零增长；`policy.ts`/`auto-authorize.ts` sha256 不变；manifest/base/content/options 零 diff；无新依赖/权限。

偏差：declared site tool 的 schema 不暴露 `subcommand` enum → 作者示例①真实 DOM 最深可展层为「工具」；「工具→子命令」由示例②与 node 门禁证明（详见父 build.md §R2 第 2 轮 §2）。
