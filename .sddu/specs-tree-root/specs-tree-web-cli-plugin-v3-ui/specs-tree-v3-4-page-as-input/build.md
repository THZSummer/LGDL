# 构建报告：specs-tree-v3-4-page-as-input

> **文档定位**: SDDU 构建报告 — 记录全部任务的文件变更和实现结果，作为 review 阶段的输入  
> **前置依赖**: `tasks.md`（15 任务 / 8 波）· `plan.md`（ADR-V3-030~036）· `spec.md`（v1.1，含 §7.1 AC-CONV-1/2）  
> **创建人**: SDDU Build Agent  
> **创建时间**: 2026-09-16  
> **版本**: v1.0  
> **更新人**: SDDU Build Agent  
> **更新时间**: 2026-09-16  
> **更新说明**: 初始创建（全 15 任务完成；门禁严格串行全绿；TASK-401 spike 结论、体积重登记与反证全套逐条留证）

---

## 1. 构建概要

| 维度 | 数值 |
|------|:--:|
| 完成任务数 | **15 / 15**（TASK-401~415，含 spike 门与 N-06 收敛） |
| 复杂度分布 | S×2（406 / 413）· M×12（401/402/403/404/405/408/409/410/411/412/414/415）· L×1（407） |
| 新增文件 | **13**（源码 7 + 测试 6） |
| 修改文件 | **16** |
| 新增产物 | **`dist/pick-layer.js` 32,391 B**（第 5 个 esbuild entry，按需注入，自有**无容差**上限） |
| 红线不变项 | `dist/content.js` **177,076 B 逐字节不变** · 三冻结文件 hash 不变 · `manifest.json` 零 diff · 判定链未动 |

### 1.1 TASK-401 spike 结论（**硬前置门：S1~S4 全过，未走 D1/D2**）

产物 `/tmp/opencode/v3-spike/`（临时，不入版本库）；证据 `…/v3-gate-logs/v3-4/spike-evidence.json`。

| 条目 | 结论 | 实测证据（原文） |
|:--:|:--:|------|
| **S1 注入可行** | ✅ | 已授权 origin：`{"ok":true}` + 挂载 `{"marker":"object","host":1}`；未授权 origin 同一调用：`{"ok":false,"reason":"Cannot access contents of url \"http://localhost:41601/\". Extension manifest must request permission to access this host."}`（**可读原因**） |
| **S2 体积可控** | ✅ | 最小骨架（描边/标签/胶囊/气泡/菜单 5 项 + 消息桥 + Alt 状态机 + teardown）实测 **8,606 B ≤ 60,000 B**（上限的 14.3%） |
| **S3 零注入可验证** | ✅ | 未授权 origin 五探针全负：`registeredScripts=[]` · `marker=undefined` · `shadowHosts=0` · `intercepted=false`；**反证**（CDP 强制注入同一 bundle）→ `marker=object / shadowHosts=1 / intercepted=true`；`unmount()` 后全部归零 |
| **S4 三退让可实现** | ✅ | ① 仅已授权拦截（S3）；② `nativeOnce`：出口项点击后 `nextRightClickPrevented=false`，再下一次 `true`；③ `afterEsc=true / afterBlankClick=true` |
| 红线自证 | ✅ | spike 未改 `CONTENT_MAX_BYTES`、未引入 `contextMenus`（`manifestHasContextMenus=false`）、未静态注入、未更新三 pin；`dist/content.js` 仍 177,076 B |
| **是否获准进实现** | ✅ **获准** | **未触发 D1（第二登记式 content script）/ D2（范围降级）** |

**spike 额外发现（已写进门禁设计）**：`files:` 注入落在 Chrome 的 **ISOLATED world**，主世界 `Runtime.evaluate` **看不到** `window.__wcliPickLayer`；因此「层状态」探针必须走 SW 的 `executeScript({func})`（同隔离世界），而**共享 DOM**（Shadow host 与事件）两世界皆可观测 —— `test/ui/page-input.mjs` 与 `zero-injection.mjs` 都照此实现。另外：`--worktree` 归因工具存在 **TDZ 崩溃**（`WORKTREE` 在 argv 解析之后声明），本叶修复（否则 `SIDEPANEL_GROWTH_BREAKDOWN.reproduceCommand` 跑不起来）。

### 1.2 门禁结果（**严格串行、一次一个**；全量日志 `/tmp/opencode/v3-gate-logs/v3-4/`，无 tail 截断）

| # | 门禁 | 结果 | 计数 / 原文 |
|:--:|------|:--:|------|
| ① | `npm run typecheck` | ✅ 0 error | — |
| ② | `npm run build` | ✅ | `content.js 177076` · `pick-layer.js 32391` · `sidepanel.js 362777` · `background.js` |
| ③ | `npm test` | ✅ | `ℹ tests 795 / pass 795 / fail 0`（下界 646；656→795） |
| ④ | `test:supersession` | ✅ | 台账 + 叶段判据全过（`未登记删除行 0 条`） |
| ⑤ | `test:zero-injection` | ✅ | **20 passed / 0 failed**（本叶新增） |
| ⑥ | `test:page-input` | ✅ | **46 passed / 0 failed**（本叶新增） |
| ⑦ | `test:density` | ✅ | **127 passed / 0 failed**（默认档三视口与登记格逐项相等） |
| ⑧ | `test:l0` | ✅ | **164 passed / 0 failed** |
| ⑨ | `test:l1` | ✅ | **103 passed / 0 failed** |
| ⑩ | `test:l2` | ✅ | **71 passed / 0 failed** |
| ⑪ | `test:l1-reverse` | ✅ | 9 条反证「注入 → FAIL → sha256 复原 → PASS」 |
| ⑫ | `test:l2-reverse` | ✅ | 10 条反证全过 + 产物 sha256 复原 |
| ⑬ | `test:ui`（journey） | ✅ | **167 assertions**（下界 167，零删减） |
| ⑭ | `test:insight` | ✅ | **116 assertions**（union 下界 108） |
| ⑮ | `test:binding` | ✅ | **192 assertions**（下界 192，零删减） |
| ⑯ | `test:hardening` | ✅ | **24 assertions** |
| ⑰ | `test:e2e` | ✅ | `R8 E2E PASS`（真实 dist 全链） |
| ⑱ | `test:gate-integrity` | ✅ | 元门禁（受审集合**目录扫描自动纳入**两个新门禁 + 合成/真实副本反证） |
| ⑲ | 体积四线 + 反证 | ✅ | 见 §5 |
| ⑳ | 零改动核对 | ✅ | 见 §7 |
| ㉑ | 反证全套 | ✅ | 见 §6（RP-V3-01/03/04/05/06/08/09 + l1/l2 反证 + 本叶新反证） |

**计数只增不减**：journey 167→167 · insight 108→116 · binding 192→192 · sidepanel-view 38→38 · node 646→**795**。密度默认档 **仍恰好 7 可点、三视口逐项相等**（零漂移）。

### 1.3 必须回报编排器的两条披露

1. **`sidepanel.js` 显式重登记**（`349,925 → 362,777 B`，+12,852 B / **+3.67%**）：披露五要素齐备（前后值 / 日期 / 来源 / 理由 / `_HISTORY`+`TIMELINE` 逐字保留），容差 **5% 未动**、`targetBudgetBytes`/`targetMet` 仍 **null**、断言零删减；ceiling 由公式抬高 `floor(362,777 × 1.05) = 380,915 B`。
2. **从 266,500 B 起算的 Feature 累计 +36.13%（>30%，< 40% 停工线）**：本叶增重全部来自 spec 必需的面板侧接线（逐模块归因见 §5.2），**未触发 40% 停工线**；方向性守卫（最差连续两功能轮 **+22.96%**）已触发并要求回报 —— 因此本条即为该回报。
3. **守卫语义收紧（非放宽）**：`evaluateConsecutiveReRegistrationGrowth()` 由「最后两轮」改为「**最差的连续两轮**」。理由如实登记：四轮中最后两轮（v3-3+v3-4，+10.25%）低于 15% 线，若仍按「最后两轮」计，**>15% 告警会消失**（= 放松守卫）；改取最大值后告警必然存在（v3-1+v3-2 = +22.96%），且任何**新的** >15% 相邻对同样被抓出。

---

## 2. 文件变更

### 2.1 新增（13）

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| NEW | `packages/web-cli-plugin/src/content/pick-layer.ts` | 404/407/408 | 拾取层入口：幂等 `install`（`window.__wcliPickLayer`）· Alt 状态机 · **六手势**（Alt 悬停 / Alt 拖动 / 右键 / 拖选 / G1 双击 / G2 悬停 ⊕）· P4 双向联动 · teardown 自卸载 · **命令通道为零** · `op()` 单一门禁派发器 |
| NEW | `packages/web-cli-plugin/src/content/ref-capture.ts` | 402 | 页面侧**唯一**捕获口径（稳定优先选择器 / 语义路径 ≤6 级 / `textDigest` 80 / `semanticPath` 120 / 事实字段集 / `data-wcli-ref` 身份标记 / `resolveRef` **只报观测**）+ 纯函数结构接口（Node 可测，无 jsdom） |
| NEW | `packages/web-cli-plugin/src/content/pick-overlay.ts` | 405 | open Shadow DOM 隔离宿主（`all: initial` + 唯一属性选择器 + `z-index 2147483000` + 内联 CSS/SVG）：**单一描边**（唯一高亮结构性保证）· 浮动标签 · 跟随胶囊 · 气泡（1.8s 淡出）· 角标（`①②③`） |
| NEW | `packages/web-cli-plugin/src/content/pick-menu.ts` | 406 | 右键自绘菜单（路线 1，零新增权限）：5 项 · **三退让** · `role=menu`/`menuitem` + roving tabindex + 方向键/Home/End/Enter · 视口钳制 |
| NEW | `packages/web-cli-plugin/src/content/pick-bridge.ts` | 404 | 消息桥：`pick-layer-state` / `ref-captured` / `ref-highlight` / teardown / env；**无判定、无命令**；无扩展运行时时降级为不报错（反证注入可存活） |
| NEW | `packages/web-cli-plugin/src/content/pick-protocol.ts` | 403 | 六个 kind 的**独立**运行时校验（**故意**不进 `KIND_SET`：实测 +307 B 会破 `content.js` 177,076 B 无容差红线） |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/pick-input.ts` | 407/415 | 面板侧：双触发（面板在场 / 「从页面拾取」）· 文档身份（`documentId`/`navSeq`）缓存 · `application/x-wcli-ref` 拖放落点 · **AC-CONV-1 的 env 组装** · 失败/良性 refusal 分类 |
| NEW | `packages/web-cli-plugin/test/ref-capture.test.ts` | 402 | 7 用例（与 v3-2 `ref-store` 截断口径**逐字相等**、边界、稳定性、字段集、输入区、身份只报观测） |
| NEW | `packages/web-cli-plugin/test/pick-layer-budget.test.ts` | 411 | 2 用例（新 artifact 无容差上限 + **+1 B 反证** + 不与 `content.js` 合并计数；`content.js` ≤177,076 与三 pin 复核） |
| NEW | `packages/web-cli-plugin/test/zero-injection.test.ts` | 410 | 3 用例（manifest 静态面 / SW 结构与源码 / 拾取层不自注册） |
| NEW | `packages/web-cli-plugin/test/ref-wiring.test.ts` | 415 | 4 用例（**AC-CONV-1** 生产 `setEnv` 调用点不止测试 seam + env 字段来源；**AC-CONV-2** 全仓唯一 `dispatchRefAction(` 调用点 + 引用回合走同一入口） |
| NEW | `packages/web-cli-plugin/test/ui/zero-injection.mjs` | 410 | Chromium 门禁（20 断言）：未授权五探针 + 负控 + L0 文案 + 入口禁用 |
| NEW | `packages/web-cli-plugin/test/ui/page-input.mjs` | 409 | Chromium 门禁（46 断言）：十项验收（见 §4） |

### 2.2 修改（16）

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| MODIFY | `build.mjs` | 403 | 追加第 5 个 entryPoint（`pick-layer.ts → dist/pick-layer.js`，IIFE）；既有 4 个 entry 零改动 |
| MODIFY | `src/background/service-worker.ts` | 403/415 | 追加 3 个 case（`pick-layer-inject` / `pick-layer-teardown` / `ref-highlight`）· `pickLayerTarget`（真实 tab URL 校验 + 良性 classification）· `declarationEnv`（**真实声明摘要** `sha256Hex`）· `state` 载荷追加 `declaration` · revoke 与面板断开追加 teardown |
| MODIFY | `src/background/messaging.ts` | 403 | 六个 kind 进**类型联合**（类型擦除、零字节）；**不进 `KIND_SET`**（+307 B 实测） |
| MODIFY | `src/ui/sidepanel/sidepanel.ts` | 407/408/415 | 双触发接线 · `ref-captured` 订阅（chip + 选择题 + 身份标记回填）· **`syncRefEnv()`（AC-CONV-1）** · **`applyRefAction()`（AC-CONV-2 唯一入口）** · 引用回合答复走同一入口 · P5 回合可视化 · 失败降级 |
| MODIFY | `src/ui/sidepanel/l0/shell.ts` | 407 | 风险区追加「页面侧不可用（原因）」行（**追加在风险位唯一写入者之后**，五类 v3-1 风险类所有权不变） |
| MODIFY | `src/ui/sidepanel/l1/panels.ts` | 407/408 | 手势表**由单一清单渲染**（`L1_GESTURE_LABELS`，条目数 = 实测数） |
| MODIFY | `src/ui/sidepanel/view-model.ts` | 407/408 | `L1_GESTURE_LABELS`/`L1_GESTURE_COUNT`（4→6）· `pickUnavailable` 态 · `StateMessageView.declaration` |
| MODIFY | `src/ui/sidepanel/index.html` | 408 | 手势表 tbody 改为清单渲染；标签 4→6 个手势 |
| MODIFY | `test/size-baseline.ts` | 411/413 | `PICK_LAYER_*`（新 artifact 无容差上限 + meta + `evaluatePickLayerCeiling`）· `SIDEPANEL_*` 显式重登记 · `SIDEPANEL_GROWTH_BREAKDOWN` 按真实 metafile 重算 · ②③④ 守卫 |
| MODIFY | `test/size-budget.test.ts` · `test/size-growth-evidence.test.ts` | 413 | 方向敏感断言按新实测值**重新 pin**（结构零改） |
| MODIFY | `test/l1-ref-validity.test.ts` · `test/ui/l1.mjs` · `test/insight-protocol.test.ts` | 408/403 | 同编号重 pin：手势 4→6（三者同时相等）· SW 入口守门**三校验器**（更强） |
| MODIFY | `test/insight-archive.test.ts`（阈值同源）· `test/density-thresholds.test.ts`（自动同源） | 413 | 体积登记同步（无删减） |
| MODIFY | `test/size-attribution.mjs` | 401 | 修复 `--worktree` 的 TDZ 崩溃（否则登记的复现命令跑不起来） |
| MODIFY | `docs/v3-supersession-ledger.json` | 412 | **只追加**：V34-S1..S13（取代）+ V34-N1..N14（新声明）；v3-3 叶段 `registeredUncoveredLines` **追加** 12 行（未改写任何既有行） |
| MODIFY | `docs/v3-density-baseline.json` | 413 | `volume` 与体积登记同源更新（前值逐字保留在 `previous`） |
| MODIFY | `package.json` | 409/410 | 追加 `test:page-input` / `test:zero-injection`；`test:v3` 串行链追加两项（既有 script 零删除） |

### 2.3 明确未改（红线）

`src/content/{content-script,dom-agent,page-bridge}.ts`（字节零改）· `manifest.json`（零 diff，含**无 `contextMenus`**）· `src/security/**` · `packages/web-cli-base/**` · `src/ui/options/**` · `design/**` · 判定链（`l1/ref-validity.ts` 未改）· `main`。

---

## 3. 任务完成清单

| 任务 | 名称 | 复杂度 | 状态 | 对应 FR / AC |
|------|------|:--:|:--:|------|
| TASK-401 | A-UI-004 前置 spike（S1~S4） | M | ✅ completed | FR-V3-067 · NFR-V3-003/004/007 · EC-V3-012 |
| TASK-402 | 引用捕获口径 `ref-capture.ts` + 单测 | M | ✅ completed | FR-V3-071 · ADR-V3-034 |
| TASK-403 | 第 5 bundle 构建与注入通路 | M | ✅ completed | FR-V3-067/072 · NFR-V3-003/004/006 |
| TASK-404 | 拾取层入口与消息桥 | M | ✅ completed | FR-V3-060/062/067/068/069/071 |
| TASK-405 | Shadow DOM 隔离宿主 | M | ✅ completed | FR-V3-060/062/063/065/069 · EC-V3-017 |
| TASK-406 | 右键自绘菜单（三退让） | S | ✅ completed | FR-V3-064 · NFR-V3-006/011 |
| TASK-407 | 四项交互接线 + 失败降级 + chip + P4 双向联动 | **L** | ✅ completed | FR-V3-060~066/068/071 · EC-V3-003/005/006/014 |
| TASK-408 | P5 执行可视化 + G1/G2 + 手势表 6 项 | M | ✅ completed | FR-V3-070 |
| TASK-409 | 页面即输入门禁 `page-input.mjs` | M | ✅ completed | AC-V3-022/023/024 |
| TASK-410 | 未授权零注入门禁（node + Chromium + 反证） | M | ✅ completed | FR-V3-067/068 · AC-V3-018 |
| TASK-411 | `pick-layer.js` 独立硬上限 + 基线登记 | M | ✅ completed | AC-V3-015/016 · ADR-V3-031 |
| TASK-412 | `binding.mjs` 页面侧条目 + 台账追加 | M | ✅ completed | AC-V3-011/012 · ADR-V3-036 |
| TASK-413 | `sidepanel.js` 体积核对 + 显式重登记 | S | ✅ completed（**触发**） | NFR-V3-005 |
| TASK-414 | 收口：全门禁绿 + 人工面登记 | M | ✅ completed | AC-V3-013/024/025 |
| TASK-415 | 引用能力生产接线（N-06 / AC-CONV-1·2） | M | ✅ completed | FR-V3-036/037（父）· §7.1 |

---

## 4. 需求 → 证据（`test/ui/page-input.mjs` 十项逐条）

| # | 验收 | 实测证据（门禁原文摘要） |
|:--:|------|------|
| ① | 四项交互**各**生成 1 引用 + 1 选择题 | 交互 1（Alt 悬停）`counts=1` + `askVisible=true`；交互 2（拖动落点）`counts+1`；交互 3（右键菜单项）经同一 `emit` 路径；交互 4（拖选气泡）`counts+1` + 选择题 |
| ② | 拾取结果**不是**常驻输入框 | `#ask-fallback` 全程 `hidden=true`；自由文本只在末项「其他…（我来描述）」（决策卡渲染） |
| ③ | 唯一高亮 + 可撤销 + 零残留 | 可见描边节点恰 **1** 个；`target` = 指针下的元素；`Esc` 后 `outlineVisible=false / bubbleVisible=false`，`shadowHosts=1`（层仍在但无残留） |
| ④ | 拾取期间**命令发送 = 0** | `l1.commandSends === 0`（拾取全过程；捕获路径无命令通道） |
| ⑤ | Alt 拖动**两路径** | 未落点：`dragCancel` → 引用数不变、零副作用；落点：`drop` 带 `application/x-wcli-ref` 载荷 → 引用 +1（`dragover` 时 `#l0-decision[data-drop-active]`） |
| ⑥ | 右键**三退让** | ① 未授权站零拦截（另见零注入门禁）；② 菜单含「交给页面原生菜单」，选择后 `nextRightClickPrevented=false`、再下一次 `true`；③ `Esc` 关 / 点空白关（均不执行动作） |
| ⑦ | 拖选气泡 | 真实拖选 → 气泡出现；宿主选区**未被破坏**；`input` 内**不出现**；点击气泡 → 引用 + 选择题 |
| ⑧ | chip ⇄ 角标**同序号** + 双向 hover | 页面 `data-wcli-ref` = 侧栏铸造 id；角标文本 = 同一 `glyph`；hover 侧栏 chip → 页面描边闪动可见；hover 页面角标 → 侧栏 chip `data-ref-hover=ref_<n>` |
| ⑨ | 宿主交互零影响 | 宿主按钮点击计数 +1（真实鼠标事件）；宿主输入可键入且取得焦点 |
| ⑩ | 手势表 = 实现数（6） | 渲染行 = `['Alt + 悬停','Alt + 拖动','右键','拖选文本','双击（G1）','悬停 600ms ⊕（G2）']` 与清单**集合相等**；G3~G5 明确标为「规格未实现」（不入表） |
| ⑪ | 失败降级不静默 | 注入载荷不可加载 ⇒ 风险区「页面侧不可用：…」+ 「从页面拾取」禁用 + `data-disabled-reason` 含原因 |

### 4.1 AC-CONV-1 / AC-CONV-2（N-06 收敛）兑现证据

| AC | 实现 | 机器判据 |
|:--:|------|------|
| **AC-CONV-1** | `sidepanel.ts#syncRefEnv()`（**render() 每次调用**）→ `pickInput.judgeEnv()`：`currentOrigin`/`authorized` 来自面板状态 · `documentId`/`navSeq` 来自**页面侧实报**（`pick-layer-state`）· `declarationHash`/`declarationVersion` 来自 SW 对**采纳声明的真实 sha256 摘要**（`declarationEnv` → `sha256Hex(projection).slice(0,16)`） | `test/ref-wiring.test.ts`：`setEnv` 生产调用点 **≥1**（且把生产调用点抹掉的伪造源码 ⇒ 判据变 0 ⇒ **非恒真**）；env **五个字段齐备**；**无 layer 在场时只报 origin/authorized**（缺 `documentId` ⇒ `page-unreachable` ⇒ 阻断，fail-closed）；运行期：授权站点拾取后判定链真跑（page-input 门禁的 chip/证据/风险区三处同源） |
| **AC-CONV-2** | `sidepanel.ts#applyRefAction()` 是**全仓唯一** `dispatchRefAction(` 调用点（首句即 `isRefUsable` guard）；引用回合的选择答复经 `pendingRefId` 走同一入口；测试 seam 的 `act` op **改成调用 `applyRefAction`**（不再是第二套实现） | `ref-wiring.test.ts`：全仓调用点断言 = `['src/ui/sidepanel/sidepanel.ts: 1']`（加一处伪造调用 ⇒ 立刻 FAIL）；guard 首句逐字断言；`submitAsk` 中引用回合**不**走 `ask-user-response`；page-input 门禁：拾取全程 + 失败态穷举控件后 `commandSends` 恒 0 |

---

## 5. 体积与密度

### 5.1 体积四线

| 产物 | 实测 | 上限 | 判定 | 说明 |
|------|:--:|:--:|:--:|------|
| `dist/content.js` | **177,076 B** | 177,076 B（**无容差**） | ✅ | 逐字节零改动；反证 177,077 → FAIL（§6） |
| `dist/pick-layer.js` | **32,391 B** | 32,391 B（**无容差**，新 artifact 独立基线） | ✅ | +1 B → FAIL（§6）；**不与 content.js 合并计数** |
| `dist/sidepanel.js` | **362,777 B** | 380,915 B（`floor(362,777 × 1.05)`，公式判定） | ✅ | **显式重登记** 349,925 → 362,777（§1.3） |
| `CONTENT_SOURCE_SHA256` 三 pin | 逐项相等 | 不变 | ✅ | 冻结三文件字节零改（`git diff --numstat` 空） |

### 5.2 增量归因（真实 `dist/build-meta.json`，逐模块；`npm run size:attribution` 可复现）

本叶自身（v3-3 修复轮工作树 → v3-4 工作树）：**+12,852 B**，其中新增必需模块 `pick-input.ts` **5,085 B**（含良性拒绝分类；`env()` 死接口与只写不读的 `hoverRef` 经 pre-review 删除）与接线 `sidepanel.ts` +4,784 / `l1/panels.ts` +1,830 / `l0/shell.ts` +694 / `view-model.ts` +422、未归因胶水 37 B。

累计口径（v3-1 树 `cf2af32` → 当前树）：**+67,552 B** = 新必需模块 **50,443 B** + 接线 **16,388 B** + 归因位移 **265 B** + 未归因胶水 **456 B**（未解释字节 721 B < 1,000 B；必需增量占比 **98.9% > 95%**）。输入模块 53 个路径互不相同；共享模块 `tree-receipt.ts` Δ=0、`ownership-tree.ts` 首次共享引入 —— **复用非复制**。

### 5.3 密度（默认档零漂移）

默认档三视口（320/400/520 × 900）：**C1=7 可点（上限 7）**、`C2=12`、`C3=20`、`C4=6`、`chars=380`，三视口**逐项相等**且与 `docs/v3-density-baseline.json` 登记值一致；`#log clientHeight` 356px ≥ 356px（`LOG_CLIENT_HEIGHT_FLOOR` 单源，v3-1 前 589px 的 v1 锚点已按 ADR-V3-019 V31-S3 迁移）；风险位常驻不可折叠；主界面**无常驻输入框**（`#composer` 默认 `hidden`，v3-1 已处置）。

---

## 6. 反证（本叶新增 + 沿用全套）

| 反证 | 形态 | FAIL 段证据 | 还原证据 |
|:--:|------|------|------|
| **新 · 零注入（in-gate）** | CDP 强制注入同一 bundle（绕过 Chrome 权限闸门） | `marker=object` · `shadowHosts=1` · `intercepted=true`（三项探针**翻红**） | `unmount()` 后全部归零（`shadowHosts=0 / intercepted=false`） |
| **新 · 未授权拒绝可读** | 未授权 origin 上 `executeScript` | `Cannot access contents of url … must request permission` | 同一扫描可见注册（`zero-probe-control`）⇒ 探针非恒真 |
| **新 · `pick-layer.js` +1 B** | 追加 1 字节 | `登记 32391B ≠ 实测 32392B（按真实产物登记）` → FAIL | 重新构建后 sha256 复原 → PASS |
| **新 · `content.js` +1 B** | 追加 1 字节 | `content.js 177077B ≠ 177076B —— 本叶必须是逐字节零改动` → FAIL | 重建后 sha256 复原 → PASS |
| **新 · 冻结源 +1 B** | `page-bridge.ts` 追加 1 字节 | `内容 hash 与 pin 不一致` → FAIL | `git checkout` + 重建 ⇒ sha256 复原 → PASS |
| **新 · AC-CONV-1 非恒真** | 抹掉生产 `setEnv` 调用点的伪造源码 | 判据计数变 **0** ⇒ 断言 FAIL | 原文 → PASS |
| **新 · AC-CONV-2 唯一调用点** | 加一处直接 `dispatchRefAction` 的伪造文件 | 调用点集合 ≠ `[…: 1]` ⇒ FAIL | 原文 → PASS |
| **新 · 良性拒绝分类** | 无站点标签页 / 浏览器内置页 | 不产生风险行（否则默认档密度 +181 chars，实测已消除） | — |
| 沿用 · RP-V3-01 | 注入 1 个额外可点元素 | `C1 可点元素 8 > 7` → FAIL | 还原 → PASS（6 断言） |
| 沿用 · RP-V3-03 | 篡改密度登记体积 +1 | 阶段 F `产物字节 == 体积登记值` FAIL（命中 2 处） | 还原后 **sha256 一致** → PASS |
| 沿用 · RP-V3-04 | 把风险行移入 L1(hidden) | AC-V3-008/009 FAIL | 还原 → PASS（5 断言） |
| 沿用 · RP-V3-05 | 删除一条断言的副本（`--files-override`） | 台账/叶段判据 FAIL（命中 6 处） | 基线 exit=0；还原 exit=0 |
| 沿用 · RP-V3-06 | 体积/三 pin 三段（content / pick-layer / 冻结源） | 三段 exit=1（见上表原文） | 三段 sha256 全部复原 → PASS |
| 沿用 · RP-V3-08 / 09 | 登记值篡改 / CSS 隐身（visibility·opacity） | F 比对 FAIL / 可见性探针 FAIL | 还原 → PASS（8 + 10 断言） |
| 沿用 · l1-reverse / l2-reverse | 9 + 10 条注入反证 | 全部「注入 → FAIL（命中 `expectFailPattern`）→ sha256 复原 → PASS」 | 判定器 `--selftest` 通过 |
| 沿用 · 元门禁 | 两个新门禁经**目录扫描自动纳入**受审集合 | 合成/真实副本注入反证全过 | `test:gate-integrity` ✅ |

---

## 7. 零改动核对（红线）

```
git diff --numstat -- manifest.json src/security src/content/{content-script,dom-agent,page-bridge}.ts \
  packages/web-cli-base src/ui/options design   →  （空：零 diff）
dist/content.js = 177,076 B（= CONTENT_MAX_BYTES）· 三源文件 sha256 = pin
manifest.json 权限段：permissions / optional_permissions / host_permissions 逐项相等；无 contextMenus；无 content_scripts；无 web_accessible_resources
依赖段：package.json dependencies/devDependencies 零新增
```
**未使用 `git add -A`**（逐文件 `git add`）；**未改 main**；**未 force push**。

---

## 8. 人工面（如实登记，**不冒充 PASS**）

| 项 | 状态 |
|------|------|
| 拾取观感（描边/标签在真实站点的可读性） | ⏳ **未执行** |
| 拖动体感（真实 HTML5 拖放到侧栏的手感） | ⏳ **未执行** |
| 右键菜单观感（与真实站点右键的冲突体感） | ⏳ **未执行** |
| 真实宿主兼容（真实 SPA / 全屏元素 / 复杂 CSS） | ⏳ **未执行**（门禁只覆盖确定性夹具 + 污染夹具） |
| 多显示器 / 高 DPI | ⏳ **未执行** |
| Alt 在 Windows 上聚焦浏览器菜单栏（E 稿已列为固有限制） | ⏳ **未执行**（如实登记为真实限制，不冒充已解决） |

**flake 如实登记**：`page-input.mjs` 的「失败降级」段最初通过点击 `#l0-pick` 触发，但该入口在自动探测期间会合法地处于 disabled（点击被吞）。改为走**同一注入例程**的面板在场路径（`refreshState → ensureInjected`）后稳定；**未**通过加长 sleep 或放宽断言掩盖。

---

## 9. deferred / 例外 / 风险（如实登记）

1. **「按需」的语义代价（ADR-V3-030 §6 已登记，本叶兑现）**：侧栏从未打开时页面**不**拦截右键（交回原生菜单）—— 这是设计取舍，不是缺陷。
2. **Alt 拖动到侧栏的 transport**：页面侧产出 `application/x-wcli-ref` 载荷，落点由侧栏消费；门禁以真实 `DragEvent`+`DataTransfer` 驱动两侧（跨窗口原生拖拽的**体感**属人工面，未执行）。
3. **`ref-highlight` 的 SW 转发**：面板无法直接 `tabs.sendMessage`，经 SW 转发（新增 1 个 case，薄路由、无判定）。
4. **`file:` 视为「无站点」**：扩展无 `file://` host 权限，且本地文件不是站点 ⇒ 归为**良性**（不产生风险行）。若未来作者要求本地文件也支持，需另立 ADR（本叶不放宽）。
5. **D1/D2 降级未触发**（spike 全过），因此「第二个登记式 content script」与「范围降级」两条路径**未实现**（按 ADR-V3-035 只在需要时启用）。

---

## 10. 下一步

| 场景 | 操作 |
|------|------|
| 全部任务已完成 | 运行 `@sddu-review specs-tree-v3-4-page-as-input` 开始代码审查 |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：15/15 任务完成；TASK-401 spike S1~S4 全过（未走 D1/D2）；门禁 21 项严格串行全绿（node 795 / density 127 / l0 164 / l1 103 / l2 71 / journey 167 / insight 116 / binding 192 / hardening 24 / e2e PASS / 新门禁 20 + 46）；体积四线 + 反证三段；`sidepanel.js` 显式重登记（349,925 → 362,777，+3.67%）与 Feature 累计 +36.13% 已披露；AC-CONV-1/2 兑现并各有可 FAIL 判据；人工面 6 项如实登记「未执行」。 | 2026-09-16 | SDDU Build Agent |
