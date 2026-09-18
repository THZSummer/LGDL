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
| 新增文件 | **13**（插件：源码 7 + 测试 6）+ 1 SDDU 产物（`build.md`） |
| 修改文件 | **18**（插件 18 + SDDU 产物 2：`TREE.md`/`state.json`；口径 = **文件数**，不是表格行数 —— §2.2 表内合并了 2 文件行与 3 文件行，见 I-11 订正） |
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

### 2.2 修改（18；表内 15 行，其中 1 行合并 2 文件、1 行合并 3 文件）

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
| MODIFY | `test/size-budget.test.ts` · `test/size-growth-evidence.test.ts`（**2 个文件合并一行**） | 413 | 方向敏感断言按新实测值**重新 pin**（结构零改） |
| MODIFY | `test/l1-ref-validity.test.ts` · `test/ui/l1.mjs` · `test/insight-protocol.test.ts`（**3 个文件合并一行**） | 408/403 | 同编号重 pin：手势 4→6（三者同时相等）· SW 入口守门**三校验器**（更强） |
| MODIFY | ~~`test/insight-archive.test.ts` · `test/density-thresholds.test.ts`~~ | — | **订正（C30/I-11）**：这两个文件在本 commit **零 diff**（`git diff --name-status e528563..be54b70` 无此项）。体积登记对它们**自动同源**（导入同一常量），因此无需改动 —— 原表把它记为 MODIFY 是**清单失真**，本轮删除该行 |
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

## 11. 修复轮（review R1 后，2026-09-17）

> 输入：本叶 `review-report.md`（**❌ 不通过**，43 项 = 34 通过 / 6 警告 / 3 失败；2 阻塞）+ `review.md`（C1~C43）。
> 结论口径：**BLOCK-1 / BLOCK-2 已修**；I-01① / I-04 / I-05 / I-06 / I-07 / I-08 / I-09 / I-11 已修；
> **I-01②③ / I-02 / I-03 / I-10 deferred**（红线冲突，见 §11.4）。

### 11.1 BLOCK-1（高）：`normalizeStableOrigin(完整URL)` 当 origin ⇒ 带路径的真实页面全部不可用

**根因**（`src/background/service-worker.ts#pickLayerTarget`）：`normalizeStableOrigin()` 只做 `trim + 去尾斜杠 + toLowerCase`，喂它整条 URL（`http://h:p/app`）得到的就是「含路径的 origin 字符串」。于是①与 `candidate.expect`（真 origin）比对失败（bound 候选被跳过）、②`origins.isAuthorized('http://h:p/app')` 恒 false ⇒ `pick-layer-inject` 拒绝并**误报「未授权站点 …/app」**，`ref-highlight` / `pick-layer-teardown` 同样解析失败。真实站点普遍带路径 ⇒ 本叶核心能力在生产上不可达。

**一行修复**（`git diff` 原文）：

```diff
--- a/packages/web-cli-plugin/src/background/service-worker.ts
+++ b/packages/web-cli-plugin/src/background/service-worker.ts
@@
     if (NON_INJECTABLE_URL.test(url)) continue;
-    const origin = normalizeStableOrigin(url);
+    const origin = tabOrigin(url);
     if (!origin) continue;
```

`tabOrigin`（`:53` 已导入，`session-follow.ts` 导出）对 http(s) 返回 `new URL(url).origin`、其余返回 `null` ——
与 `OriginStore` 说的是同一套口径；非 http(s) 已由 `NON_INJECTABLE_URL` 先跳过，`null` 即「不可解析 ⇒ continue」。
`normalizeStableOrigin` 的导入**保留**（`:1789` 仍在 `isOriginAuthorized` 用于授权集合比对）。

**回归断言（必须可 FAIL）** —— `test/ui/page-input.mjs` 新增 5 条（原 46 → **61**）：

| # | 断言 | 为什么必须存在 |
|:--:|------|------|
| ① | 授权 origin 的 **`${origin}/app`** 上 `pick-layer-inject` 必须 `ok:true` | 生产触发路径 |
| ② | 该响应 `data.origin` 必须是**真 origin**（不含路径段） | 直接钉死根因 |
| ③ | `/app` 页面**隔离世界**内 `window.__wcliPickLayer === 'object'`（经 SW `executeScript({func})` 探测） | review 指定判据 |
| ④ | `/app` 页面 `[data-wcli-pick-root]` Shadow host === 1 | 「层真的挂上了」 |
| ⑤ | `/app` 页面上活层**确实接管右键**（`defaultPrevented === true`） | 行为级，排除「marker 在但层不可用」 |

并保留一条**根路径对照**（`/` 上同样 `ok:true` + marker `object`）—— 新断言与旧覆盖**并列**，不是替代。
`test/ui/zero-injection.mjs` 同步新增 **7 条**「带路径变体」（未授权 `${origin}/app`：Chrome 层拒绝 + SW 可读拒绝 + 五探针全零 + 强制注入负控翻正 + unmount 归零），原 20 → **27**。
> 这条夹具缺口（只测根路径）正是 review C39/C1 判定的「46+20 全绿也看不见缺陷」的成因；两个门禁现在都有 `/app` 变体。

**两段证伪原文（先回退 ⇒ 红；再修复 ⇒ 绿；sha256 还原）**：

```text
# ① 回退段（把 tabOrigin(url) 改回 normalizeStableOrigin(url)，npm run build 后跑）
#    日志：/tmp/opencode/v3-gate-logs/v3-4-fix/RP-BLOCK1-reverted.log
  ✖ BLOCK-1 回归：授权 origin 的**带路径**页面 /app 上 pick-layer-inject 必须 ok:true（且目标就是该 tab） — {"ok":true,"tabId":1832236740,"origin":"http://127.0.0.1:37141","error":"","expectedTab":1832236742}
  ✔ BLOCK-1 回归：注入目标的 origin 是真 origin（不含路径段）
  ✖ BLOCK-1 回归：/app 页面隔离世界内 window.__wcliPickLayer === object — undefined
  ✖ BLOCK-1 回归：/app 页面确实挂上了拾取画布（Shadow host） — 0
  ✖ BLOCK-1 回归：/app 页面上的活层确实接管右键（行为级，不只是 marker） — {"intercepted":false}
  ✔ BLOCK-1 对照：根路径 / 上 pick-layer-inject 同样 ok:true（新断言不是替代而是并列）
  ✔ BLOCK-1 对照：根路径页面 window.__wcliPickLayer === object
▶ v3-4 页面即输入门禁: 57 passed / 4 failed      （EXIT=1）

# ② 修复段（sha256 还原 src/background/service-worker.ts = e044be3c…5af851，npm run build 后跑）
#    日志：/tmp/opencode/v3-gate-logs/v3-4-fix/page-input.log
  ✔ BLOCK-1 回归：授权 origin 的**带路径**页面 /app 上 pick-layer-inject 必须 ok:true
  ✔ BLOCK-1 回归：注入目标的 origin 是真 origin（不含路径段）
  ✔ BLOCK-1 回归：/app 页面隔离世界内 window.__wcliPickLayer === object
  ✔ BLOCK-1 回归：/app 页面确实挂上了拾取画布（Shadow host）
  ✔ BLOCK-1 回归：/app 页面上的活层确实接管右键（行为级，不只是 marker）
  ✔ BLOCK-1 对照：根路径 / 上 pick-layer-inject 同样 ok:true（新断言不是替代而是并列）
  ✔ BLOCK-1 对照：根路径页面 window.__wcliPickLayer === object
▶ v3-4 页面即输入门禁: 61 passed / 0 failed      （EXIT=0）
```

> 回退段的 `ok:true` 是**假绿**：注入落到了根路径那个 tab（`tabId 1832236740 ≠ expectedTab 1832236742`），
> `/app` 上**零注入**。因此①这条断言也把目标 tab 钉进判据（只断言 `ok` 会被这个假绿蒙混过关）。

### 11.2 BLOCK-2（中）：登记/审计事实层的数字保真

对齐后**单一事实**：`349,925 → 362,777 B`（`+12,852 B` / **`+3.67%`**）、`ceiling = floor(362,777 × 1.05) = 380,915 B`、
Feature 累计 `(362,777 − 266,500) / 266,500 = ` **`+36.13%`**、最差连续两功能轮 `v3-1 + v3-2` = **`+22.96%`**、
v3-3 + v3-4 = `+10.44%`；`pick-input.ts` 归因 **5,085 B**；累计增量 **67,552 B**。

| # | 文件 | 改动 |
|:--:|------|------|
| ① | `test/size-baseline.ts` | `reason`：`349,925 → 362,777`（`+12,852 / +3.67%`）、`floor(362,777 × 1.05) = 380,915`、Feature 累计 `+36.13%`；`consecutiveGrowthAlert`：worst-pair `+22.96%`、v3-3+v3-4 `328,476 → 362,777（+10.44%）`、累计 `+36.13%`；`reRegisteredFrom` 与 `note` 同步；`SIDEPANEL_GROWTH_BREAKDOWN.closeoutDeltaBytes` 注释 `349,925 → 362,777` |
| ② | `test/size-baseline.ts:523` | `ceilingUncappedFormulaBytes: 380_271 → **380_915**`（= `floor(362,777 × 1.05)`） |
| ③ | `test/size-baseline.ts` `SIDEPANEL_BASELINE_BYTES_TIMELINE` | 移出两个**中间测量值** `362_163` / `362_865`（既非前值也非登记值，不该进「已发布基线」时间线）；**不静默消失**：新增 `SIDEPANEL_BASELINE_BYTES_INTERMEDIATE_SNAPSHOTS = [362_163, 362_865]` 并写明它们是中间**构建快照**，同时逐字保留在 `docs/v3-supersession-ledger.json#featureHistory.v3-4.intermediateBuildSnapshots` |
| ④ | `docs/v3-density-baseline.json` | `volume.directionalAlert` / `volume.note` / `growthBreakdown.reason` 同步（`362777 / 380915 / +12,852 / +3.67% / +36.13% / 22.96% / 5,085`）；并注明中间值已移出 TIMELINE |
| ⑤ | `docs/v3-supersession-ledger.json` | **16 处** `362,163` / `380,271` 按「定位串随轮次重 pin」约定改写为 `362,777` / `380,915`（`V34-S10/S11/S12` 的 `newTitle` + 11 条 `reason`）；历史值保留在 `featureHistory.v3-4.intermediateBuildSnapshots.supersededValues` |
| ⑥ | `test/size-budget.test.ts`（3 处注释）· `test/size-growth-evidence.test.ts`（注释 `5,053/66,938 → 5,085/67,552`） | 散文与实测同源 |

**新增机器断言**（`test/size-growth-evidence.test.ts`，挂在既有用例内、**不新增 `test(` 注册** ⇒ 静态口径计数不漂移）：

```ts
for (const r of rounds) {
  assert.equal(r.ceilingUncappedFormulaBytes, Math.floor(r.baselineAfterBytes * 1.05),
    `${r.id}: ceilingUncappedFormulaBytes 必须 = floor(baselineAfterBytes × 1.05)（不得与基线脱钩）`);
  assert.ok(r.ceilingAfterBytes === r.ceilingUncappedFormulaBytes || r.ceilingAfterBytes === SIDEPANEL_CEILING_CAP_RECORD,
    `${r.id}: ceilingAfterBytes 既不是公式值也不是记录 cap（同一事实不得有两个 ceiling）`);
}
```
> 该断言对**全部 7 轮**逐轮成立（v3-1 306,099 / v3-1-i6 309,986 / v3-2 344,062 / v3-2-closeout 344,899 /
> v3-3 367,374 / v3-3-fix 367,421 / v3-4 380,915）：若退回 `380,271` 必 FAIL。

**V34-S3 系列补登（review C41(b) / BLOCK-2 建议同轮）**：`test/insight-protocol.test.ts` 在本 commit 有 **4 行**删除
（不是 2 行：注释 1 + 正则 1 + 断言文案 1 + `unionGuard` 构造 1），而删除行判据的文件集合由台账自身推导 ⇒ 该删除**结构性不可见**。
本轮补登 **`V34-S3` / `V34-S3b` / `V34-S3c` / `V34-S3d`** 四条 `same-id-rewrite`（逐行 `oldTitle` + `newTitle` 可定位），
并按 I-05 把判据文件集合改为「台账集合 ∪ `git diff <base> --name-only -- test/**` 实测集合」——`insight-protocol.test.ts`
首次进入 `leafBases[0].scope.files`，叶段判据随之覆盖。`V34F-S1` 承接本轮 I-08 的注释改写。

### 11.3 顺手修逐条（I-01~I-11）

| # | 状态 | 根因 / 修法 / 证据 |
|:--:|:--:|------|
| **I-01①**（origin 广播 teardown） | ✅ 已修 | **根因**：`teardownPickLayer()` 只对 bound/active 的**一个** tab 发 teardown ⇒ 同 origin 的另一 tab 撤销后仍留活层并继续拦右键。**修法**（`service-worker.ts` → `background.js`，**非** pinned 产物）：`teardownPickLayer(s, origin?)` —— 传入 origin 时 `chrome.tabs.query({})` 按 `tabOrigin(tab.url) === origin` 逐个 `sendMessage(teardown)`；不传时保持原单 target 行为（面板关闭路径零改动）；`revoke` 调用点改为 `teardownPickLayer(s, origin)`。**证据**：`page-input.mjs` 新增「负控（撤销前两 tab 都拦截）→ revoke → 两 tab 全零」4 条断言（`marker/host/intercepted` 三零），并配 `AC-V3-018（撤销态）` 两条面板侧断言（L0 明示「零注入」+ 入口禁用）。 |
| **I-01②**（层自检 authorized） | ⛔ **deferred** | 见 §11.4 |
| **I-01③**（`pushState('gone')` 死路径） | ⛔ **deferred** | 见 §11.4 |
| **I-02**（`DOMContentLoaded` 复活 host） | ⛔ **deferred** | 见 §11.4 |
| **I-03**（菜单焦点还原） | ⛔ **deferred** | 见 §11.4 |
| **I-04**（夹具 `/app` + 站点自带 contextmenu） | ✅ 已修 | 两个门禁都加 `/app` 带路径变体（见 §11.1）；`page-input.mjs` 夹具加站点自有 `contextmenu` 监听器，新增 2 条断言：真实右键后**站点监听器仍 +1**（我们只 `preventDefault`、不 `stopPropagation`）且**我方菜单同时打开**（两门禁并存）。 |
| **I-05**（删除行判据的文件集合） | ✅ 已修 | `supersession-ledger.test.ts` 新增 `measuredTestFiles()`，判据文件集合 = 台账集合 ∪ 实测 diff 集合。修后实测：集合从 29 → 30（+`insight-protocol.test.ts`），`base` 段与叶段两处判据都覆盖它。 |
| **I-06**（`pick-layer-env` 死路径 + 契约漂移） | ✅ 已修（选「SW 路由」路线） | **根因**：面板 `startPick()` 发 `{kind:'pick-layer-env', …PickEnvInput}`，SW 无该 case（落 `default` → 「未知消息类型」，返回值被丢弃），且字段名（`activeOrigin`/`declaration`）与层 `accept()` 期望（`origin`/`declarationHash`）不符。**修法**：在 SW 增加真实路由 `case 'pick-layer-env'`，用 `declarationEnv()` 重新派生四元组后下发（**声明事实仍只有一个生产者**，缺声明仍是 `declarationHash: ''` fail-closed）；`pick-protocol.ts` 文档改写为「① inject 通路 ② 面板 re-push（已路由）」两个触发、一个来源。**为什么不删该 send**：面板侧改动会落在 `sidepanel.js`（**登记值 == 实测产物**，362,777），删一行即 -93 B ⇒ 需要「下调重登记」，与本轮「登记对齐」目标相反且违反「断言只强不弱」（`dir === 'up'`）。 |
| **I-07**（open shadow / `isTrusted` 文档化） | ✅ 已修（文档） | `pick-layer.ts` 头部新增 I-07 段：明写「这是 **CSS** 隔离，不是**脚本**隔离」；页面脚本可读改自绘 UI、可合成事件驱动捕获；**故意不加 `isTrusted` 过滤**并给出理由（过滤会同时致盲门禁探针与零注入负控，且无命令通道 ⇒ 不越权）。**不**改行为：加过滤会让两处既有断言（`page-input` ⑥ 的合成 `contextmenu` 二次拦截、`zero-injection` 强制注入负控）变成假绿/失效 —— 属「断言只强不弱」的反面。 |
| **I-08**（`gate-integrity.test.ts:119` 注释失真） | ✅ 已修 | 注释改写为「本常量是**已知门禁下界**；真正的受审集合由 marker 扫描推导且是**严格超集**（`page-input`/`zero-injection`/`l1-reverse`/`l2-reverse` 经扫描加入）」，「eight」措辞去掉；台账 `V34F-S1` 登记该改写。 |
| **I-09**（`pick-layer-budget.test.ts` 的 `t.skip`） | ✅ 已修 | 两处产物缺失分支由 `t.skip` 改为 `t.diagnostic(...) + assert.fail(...)`：未 build 的树上**必须失败**而不是静默通过（`npm test` 自身不 build）。 |
| **I-10**（死判据 / 未跟踪定时器） | ⛔ **deferred** | 见 §11.4 |
| **I-11**（build.md 清单口径 + `tasks.json` 状态） | ✅ 已修 | §1 表：新增 13（插件）+1 SDDU 产物、修改 **18**（口径 = 文件数，非表行数）；§2.2 标题注明「表内 15 行，其中 1 行合并 2 文件、1 行合并 3 文件」；**删除** `insight-archive.test.ts` / `density-thresholds.test.ts` 那条**失真 MODIFY**（实测零 diff，体积登记自动同源）；`tasks.json` 不含 `status` 字段这一事实已在此明写（完成态见 §3 表 + `state.json`）。 |

### 11.4 deferred（如实登记，**非**「已修」）

| # | 项 | 为什么 deferred（理由原文） |
|:--:|------|------|
| **I-01②** | 层自检 `authorized`（失去授权自行卸载） | 修法必须落在 `src/content/pick-layer.ts`（层内自检）与 `pick-bridge.ts`（`envReady` 门槛） |
| **I-01③** | `unmount()` 里 `bridge.pushState('gone', …)` 消除 `pick-input` 死分支 | 同上（`pick-layer.ts`） |
| **I-02** | `mountHost` 的 `DOMContentLoaded` 监听纳入 teardown（**已实证复活** Shadow host） | 修法必须落在 `src/content/pick-overlay.ts` |
| **I-03** | 菜单关闭还原宿主焦点（**已实证**丢到 BODY） | 修法必须落在 `src/content/pick-menu.ts` |
| **I-10** | `history.__wcliPickWrapped` 死判据 + `flash()` 未跟踪定时器 | 分别落在 `pick-layer.ts` / `pick-overlay.ts` |

**冲突本体（红线逐字）**：「`pick-layer.js` **32,391** 独立无容差上限（本轮**不得**增长，若功能需要增长 → **停下回报**）」，
且 `test/pick-layer-budget.test.ts` 要求「登记值 == 实测产物」（`assert.equal(size, PICK_LAYER_FINAL_ARTIFACT_BYTES)`，**零容差**，ADR-V3-031）。

**逐文件实测代价**（受控实验：逐个文件回退到 HEAD 后 `npm run build`，读 `dist/pick-layer.js` 字节）：

| 文件 | 回退后产物字节 | 该文件贡献 | 备注 |
|------|:--:|:--:|------|
| （全部保留 = 当前） | **33,900** | — | 相对登记值 **+1,509 B（+4.66%）** |
| `src/content/pick-bridge.ts` | 33,817 | +83 | `envReady()` 三处 |
| `src/content/pick-layer.ts` | 33,593 | +307 | `stillAuthorized()` + 3 个调用点 + `pushState('gone')` |
| `src/content/pick-menu.ts` | 33,396 | +504 | `restoreFocus()` / `previousFocus` / `wasOpen` |
| `src/content/pick-overlay.ts` | 33,285 | +615 | `disposed` / `domReady` / `timers` / `later()` / 新 `unmount()` |
| （全部回退 = 登记值） | **32,391** | 0 | `stat` 复核 |

**处置（按红线「停下回报」）**：
1. **不擅自抬高上限**、**不**改 `PICK_LAYER_FINAL_ARTIFACT_BYTES`、**不**重登记；
2. **不**用「压缩 CSS / 调空白凑字节」把限制藏起来（那只是把红线变成运气）；
3. **不**为未交付的行为新增断言（断言只增不减，但也不得为未实现行为伪造判据）——因此 `page-input.mjs` 中
   依赖 I-01②/I-03 的两段断言**未加入**，并在源码位置留下 TODO 级注释说明归属；
4. 上述 4 个文件的**全部**改动已在提交前**回退**：`dist/pick-layer.js` 仍为 **32,391 B 逐字节不变**。

> **建议给编排器的决策点**：若接受一次**显式重登记**（`32,391 → 33,900 B`，+4.66%，ADR-V3-031 的登记机制要求「前后值 + 日期 + 来源 + 理由 + 断言零删减」全披露），
> 这 5 项可在下一轮一次性落地（修法与实测代价已如上表给出，无需重新设计）。

### 11.5 修复轮门禁（严格串行、一次一个；全量日志 `/tmp/opencode/v3-gate-logs/v3-4-fix/`，**无 tail 截断**；每个门禁 `finally` 自清 profile）

| # | 门禁 | 退出码 | 计数 / 原文 | 对照下界 |
|:--:|------|:--:|------|:--:|
| ① | `npm run typecheck` | 0 | 0 error | — |
| ② | `npm run build` | 0 | `177076 / 32391 / 362777` | 三线不变 |
| ③ | `npm test` | 0 | `ℹ tests 795 / pass 795 / fail 0 / skipped 0` | 795（只增不减） |
| ④ | `npm run test:supersession` | 0 | `ℹ tests 14 / pass 14 / fail 0` | 14 |
| ⑤ | `npm run test:density` | 0 | `▶ density 门禁: 127 passed / 0 failed` | 127 |
| ⑥ | `npm run test:l0` | 0 | `164 passed / 0 failed` | 164 |
| ⑦ | `npm run test:l1` | 0 | `103 passed / 0 failed` | 103 |
| ⑧ | `npm run test:l2` | 0 | `71 passed / 0 failed` | 71 |
| ⑨ | `npm run test:l1-reverse` | 0 | 9 条反证「注入 → FAIL → sha256 复原 → PASS」 | 9 |
| ⑩ | `npm run test:l2-reverse` | 0 | 10 条反证全过 + 产物 sha256 复原 | 10 |
| ⑪ | `npm run test:page-input` | 0 | **61 passed / 0 failed**（原 46；BLOCK-1/I-04/I-01① 新增） | 46 |
| ⑫ | `npm run test:zero-injection` | 0 | **27 passed / 0 failed**（原 20；带路径变体新增 7） | 20 |
| ⑬ | `npm run test:ui`（journey） | 0 | `UI journey PASS — 167 assertions` | 167 |
| ⑭ | `npm run test:insight` | 0 | `UI insight PASS — 116 assertions` | 116 |
| ⑮ | `npm run test:binding` | 0 | `binding PASS — 192 assertions` | 192 |
| ⑯ | `npm run test:hardening` | 0 | `hardening PASS — 24 assertions` | 24 |
| ⑰ | `npm run test:e2e` | 0 | `R8 E2E PASS — real dist full chain` | PASS |
| ⑱ | `npm run test:gate-integrity` | 0 | `ℹ tests 12 / pass 12 / fail 0`（含新增 4 条 in-gate 反证模式核对） | 12 |
| ⑲ | 体积四线 + ceiling 机器断言 | 0 | `177076 / 32391 / 362777` + `ceilingUncappedFormulaBytes === floor(baselineAfterBytes×1.05)` 逐轮成立 | 见 §11.6 |
| ⑳ | 零改动核对 | 0 | 见 §11.6 | — |
| ㉑ | 反证全套 | 0 | RP-V3-01/02/03/04/08/09（`density --reverse`，各 EXIT=0）+ RP-V3-05（`l2-reverse#RP-V33-03`）+ RP-V3-06（`pick-layer-budget`/`size-budget` 内建）+ **BLOCK-1 两段证伪**（§11.1）+ 新断言 in-gate 模式登记（`RP-BLOCK1-01/02`、`RP-I01-01`） | 全过 |

**密度默认档仍 ≤7 零漂移**：阶段 A~F 全过（默认档恰好 7 可点、三视口逐项相等）。
**计数只增不减**：journey 167→167 · insight 116→116 · binding 192→192 · hardening 24→24 · node 795→795 · density 127→127 · l0 164→164 · l1 103→103 · l2 71→71 · gate-integrity 12→12；**新增**：page-input 46→**61**、zero-injection 20→**27**。

### 11.6 红线核验（逐条原文）

```text
$ stat -c '%s %n' dist/content.js dist/pick-layer.js dist/sidepanel.js
177076 dist/content.js        # 无容差、逐字节不变
32391 dist/pick-layer.js      # 无容差、逐字节不变（deferred 的 4 个文件已回退）
362777 dist/sidepanel.js      # == 登记值（BALANCE：改动只落在 background.js）

$ sha256sum src/content/content-script.ts src/content/dom-agent.ts src/content/page-bridge.ts
a72900313ab77c018961aa2b8e02bb1b630a9960c1b622f2a85addf543f99e82  src/content/content-script.ts
7df782b349b32839d0ec25fa515ee293441f85f75242083dae37e5ccfd601e0f  src/content/dom-agent.ts
5737c40a2014e7adf2bf4091a31a347af6600ecfea80f8882d52e9407191f4ac  src/content/page-bridge.ts
（与 test/size-baseline.ts#CONTENT_SOURCE_SHA256 三项逐字相等）

$ git status --porcelain -- packages/web-cli-plugin/manifest.json     → （空 = 零 diff）
$ grep -c contextMenus packages/web-cli-plugin/manifest.json          → 0
$ git status --porcelain -- .../src/ui/sidepanel/l1/ref-validity.ts   → （空 = 判定链未动）
$ git log --oneline -1 main                                           → 2ddc922（未动）
$ git status --porcelain -- packages/web-cli-base packages/lgdl-web-cli/src/web-cli-host \
      .opencode/opencode.json packages/web-cli-plugin/design          → （空）

密度阈值（逐字，test/ui/density-metrics.mjs#DENSITY_LIMITS）：
  default: { clickables: 7,  lines: 15 }
  firstRun: { clickables: 9,  lines: 20 }
  risk:     { clickables: 17, lines: 35 }     ← 7/15 · 9/20 · 17/35 未动

主界面无常驻输入框：#composer 默认 hidden（src/ui/sidepanel/index.html:1380 <form id="composer" hidden>）
风险位 L0 常驻不可折叠：#risk-rail 为 body-direct 常驻区（density 127 断言 + RP-V3-04 覆盖）
未授权站点零注入：test:zero-injection 27/0（含带路径变体与强制注入负控）
无新增依赖：package.json `dependencies`/`devDependencies` 零 diff（仅 scripts）
未使用 git add -A：逐文件 path-limited add（见 §11.7 命令原文）
```

### 11.7 提交与推送

```text
（逐文件 path-limited git add，禁用 git add -A）
git add <显式文件清单>
git commit -m "fix(web-cli-plugin): v3-4 修复轮（BLOCK-1 tabOrigin 回归 + BLOCK-2 登记数字对齐 + teardown/焦点/夹具加固）"
git push https://github.com/THZSummer/LGDL.git HEAD:refs/heads/feature/web-cli-plugin
```

---

## 12. 修复轮 R2（review R1 后；编排器裁决 **V3-VOL-2**，2026-09-17）

> 起点 HEAD `1e1b798`。R1 修复轮把 I-01②/I-01③/I-02/I-03/I-10 五项判为 **deferred**（`pick-layer.js`
> 32,391 B 零容差红线；实测需 +1,509 B ⇒ 按红线「停下回报」）。编排器据此**批准显式重登记**
> 32,391 → **33,900 B**，并要求五项一次性落地 + 复活路径复测 + 全套反证。本轮即该裁决的执行。

### 12.1 显式重登记（裁决 V3-VOL-2）——披露五要素

**单一事实**：`packages/web-cli-plugin/dist/pick-layer.js` = **33,900 B**（前值 **32,391 B**，**+1,509 B / +4.66%**）。

| 要素 | 内容（可复现） |
|------|------|
| **前后值** | 32,391 → **33,900** B（+1,509 B，+4.66%）；`PICK_LAYER_BASELINE_BYTES` / `PICK_LAYER_FINAL_ARTIFACT_BYTES` / `PICK_LAYER_CEILING` 三者仍相等 |
| **日期** | 2026-09-17（`PICK_LAYER_BASELINE_META.measuredOn`） |
| **来源** | `npm run build --workspace @lgdl/web-cli-plugin` + `stat -c %s dist/pick-layer.js` → `33900 dist/pick-layer.js`（日志 `/tmp/opencode/v3-gate-logs/v3-4-fix2/REDLINES.txt`） |
| **理由** | 本上限是**本 Feature 自建的首轮实测值**（与 `content.js` 的产品硬约束性质不同）；本次增长承载的是**正确性 / 安全性修复**（卸载后 host 复活、菜单焦点还原、授权自检、`gone` 上报、死判据/未跟踪定时器），属必要代价 |
| **历史逐字保留** | 该 artifact 此前**没有** `_TIMELINE`（首轮登记即单值），本轮**新增** `PICK_LAYER_BASELINE_BYTES_HISTORY = [32_391]`（逐字保留）＋ 同构于 `SIDEPANEL_RE_REGISTRATIONS` 的**重登记登记册** `PICK_LAYER_RE_REGISTRATIONS`（首轮 `v3-4` + 本轮 `v3-4-fix2`，链条首尾相接、末项 == 当前登记值），并由 `test/pick-layer-budget.test.ts` **逐条机器断言**（不止是文档） |

**逐文件归因（本轮重测，受控实验：逐文件 `git checkout HEAD -- <file>` → `npm run build` → `stat`）**：

| 文件 | 回退后产物字节 | 该文件贡献 | R1 预估值 |
|------|:--:|:--:|:--:|
| （全部保留 = 交付态） | **33,900** | — | 33,900 |
| `src/content/pick-overlay.ts` | 33,239 | **+661** | +615 |
| `src/content/pick-menu.ts` | 33,511 | **+389** | +504 |
| `src/content/pick-layer.ts` | 33,524 | **+376** | +307 |
| `src/content/pick-bridge.ts` | 33,817 | **+83** | +83 |
| （全部回退 = 前值） | **32,391** | 0 | 32,391 |

> 合计 **+1,509 B** 与裁决批准的增幅**逐字节相等**；**逐文件**分布与 R1 预估略有差异（R1 的分布是在**当时那版准备实现**上测的，代码形状已不同），故按本轮实测登记，**不**沿用预估分布。

**`+1 B` 反证在新值（33,901）上重跑（原文）**：

```text
$ printf ' ' >> dist/pick-layer.js && stat -c %s dist/pick-layer.js
33901
$ node --test dist-test/test/pick-layer-budget.test.js        # 日志 RP-R2-picklayer-plus1B.log
✖ V3-4 size: dist/pick-layer.js 独立无容差上限（+1 B 反证）且不与 content.js 合并计数 (1.987834ms)
  AssertionError [ERR_ASSERTION]: 登记 33900B ≠ 实测 33901B（按真实产物登记）
✔ V3-4 size: content.js 仍 ≤177,076 B（无容差）且冻结三文件 hash 不变 (2.503032ms)
ℹ tests 2 / pass 1 / fail 1
EXIT=1

$ cp /tmp/pl.orig dist/pick-layer.js                              # 逐字节还原
$ sha256sum dist/pick-layer.js dist/content.js > RP-R2-sha-after.txt
$ diff RP-R2-sha-before.txt RP-R2-sha-after.txt && echo SHA256_RESTORED_IDENTICAL
SHA256_RESTORED_IDENTICAL
$ node --test dist-test/test/pick-layer-budget.test.js        # 日志 RP-R2-restored.log
ℹ tests 2 / pass 2 / fail 0
EXIT=0
```

**`content.js` 不放宽**（同类反证，同轮实跑）：`printf ' ' >> dist/content.js` ⇒ `177077` ⇒
`AssertionError: content.js 177077B ≠ 177076B —— 本叶必须是逐字节零改动`（2 tests / 1 pass，EXIT=1）；
还原后 sha256 一致 ⇒ 2/2 PASS。`sidepanel.js` 本轮**零改动**（两次 `stat` 均为 362,777）。

### 12.2 五项 deferred 逐条落地（修法 + 断言 + 反证）

| # | 状态 | 修法（文件） | 落地断言（能 FAIL） |
|:--:|:--:|------|------|
| **I-02** | ✅ 已修 | `pick-overlay.ts`：`mountHost` 的延迟追加改为**可移除**（`mountPending` 记录是否武装了 `DOMContentLoaded` 监听，`unmount()` 里 `removeEventListener`）+ `let disposed` 双保险（`mountHost` 首句 `if (disposed) return;`，`unmount()` 先置 `disposed = true`） | `page-input` 新增 5 条：document_start 前置负控（`documentElement === null`）×2 + 卸载无异常 + **加载完成后 `shadowHosts` 必须 0** + 主世界 marker 必须 `undefined` |
| **I-03** | ✅ 已修 | `pick-menu.ts`：`open()` 在 **`move(1, 0)` 之前**记录 `doc.activeElement`（`previousFocus` + `wasOpen`），`close()` 调 `restoreFocus()` 把焦点还给宿主（`{preventScroll:true}`）；`wasOpen` 保证「从未打开就 `close()`」的路径（如 `exitPick()`）**不会抢焦点** | `page-input` 新增 4 条：输入框可聚焦（负控）+ 菜单确实打开 + 打开后焦点确实已被自绘 UI 接管（否则断言无对象）+ **Esc 关闭后 `activeElement.id === 'host-input'`** |
| **I-01②** | ✅ 已修 | `pick-layer.ts` `stillAuthorized()`（`bridge.env().authorized \|\| !bridge.envReady()`）+ 三个交互处理器（`onContextMenu`/`onPointerOver`/`onDblClick`）首句自检，失去授权即 `unmount()`；`pick-bridge.ts` 新增 `envReady()`（**区分「面板说不再授权」与「从未收到 env」**——后者是 zero-injection 强制注入负控的存活前提） | `page-input` 新增 3 条：撤销前层在场且拦右键（负控）+ 去授权 env 已下发 + **第一次右键即自行卸载（marker/host/拦截全零）** |
| **I-01③** | ✅ 已修 | `pick-layer.ts` `unmount()`：`bridge.pushState('gone', '页面侧已卸载')` **先于** `bridge.unmount()`（面板侧既有 `phase === 'gone'` 分支从死路径变活） | `page-input` 新增 1 条：面板风险区出现「页面侧不可用：页面侧已卸载」（有界等待 ≤1.6s，覆盖异步消息） |
| **I-10** | ✅ 已修 | `pick-overlay.ts`：`flash()` 的 `setTimeout` 收进被跟踪集合（`timers` + `later()`，`unmount()` 统一 `clearTimeout` + `clear()`）；`hideBubble()` 归零 `bubbleTimer`；暴露 `overlay.pendingTimers()` 与 `op('timers')` 门禁缝。`pick-layer.ts`：删除 `history.__wcliPickWrapped` 死判据（只读不写 ⇒ 幂等实际由 `window.__wcliPickLayer` marker 保证，注释写明） | `page-input` 新增 3 条：flash 前 **0**（负控）+ flash 期间 **≥1**（跟踪已建立）+ 定时器触发后自行移除 **归 0** |

**口径如实登记（不夸大）**：I-10 的另一半（`history.__wcliPickWrapped` 死判据删除）**没有可观测的行为差**
（该守卫从未被写入过），因此它没有独立的行为级 FAIL 探针 —— 其反证由**同一 hunk** 的 I-02 回退实跑承载
（见 §12.4 的回退段：overlay 的 `disposed`/`later`/`timers` 与 `history.__wcliPickWrapped` 同轮回退）。

> **⚖️ 收口轮订正注（validate R1 **F4**，2026-09-17）—— 历史表述逐字保留，事实按下文订正**
>
> §12.2 表中 I-01② 行写「失去授权即 `unmount()`」并列为 **✅ 已修**，容易被读成「teardown 丢失 ⇒ 已撤销的层自行卸载」
> 这个 hole 已闭合。**该读法不成立**：层侧自检需要收到 `pick-layer-env{authorized:false}`，而**撤销路径上当时并不存在
> 这个事实的生产发送点**（`pick-layer-inject` 对未授权 origin 提前 `return`、不推 env；`pick-layer-env` 的唯一生产
> 调用者 `startPick()` 只在 `inject()` 成功后才执行）。因此 I-01② 的自检**只在门禁自己 `tabs.sendMessage` 的测试通道上
> 成立**，它声称要保护的场景（撤销与拆卸竞态 / SW 重启）其实无人保护 —— 这是 validate R1 的 **F4**。
>
> 该 hole 在**收口轮才真正闭合**：`revoke` 现在**先**广播去授权事实（`denotifyPickLayer` → 每个受影响 tab 一份
> `pick-layer-env{authorized:false}`）**再**广播 teardown；且 `pick-layer-inject` 在 `executeScript`（await 点）**之后
> 重新现算** env 再下发，杜绝「在途 inject 把已撤销的 origin 重新标成 `authorized:true`」。改动全部落在
> `src/background/**`（`background.js` 无体积 pin）⇒ 三个受 pin 产物**逐字节不变**。两段证伪原文见 §13.2。

### 12.3 I-02「复活路径」复测（review 探针 B 形态，原文）

**复测设计**：把真实产物 `dist/pick-layer.js` 注册到**新文档创建时**执行（= `document_start`：
`document.documentElement` 仍为 `null` ⇒ 延迟追加被武装），脚本执行后**立刻** `unmount()`，
再让文档正常加载完成；加载完成后 Shadow host 必须恒为 0。
载体用**未授权** hostname `localhost`（同一 fixture 服务器）——**第一版探针正是被「面板在场 ⇒ 自动注入」
污染**：那个活动 tab 上出现了正常注入的宿主节点（主世界 `marker: 'undefined'` 而 `shadowHosts: 1`），
探针失去区分力；改用未授权 hostname 后注入被结构性拒绝，探针只可能看见「复活残留」。

```text
# 交付态（日志 page-input.log）
  ✔ I-02 前置：空白页可被定位（探针载体）
  ✔ I-02 前置（负控）：脚本在 document_start 执行（documentElement 尚为 null）
  ✔ I-02 前置：document_start 时层已挂载、卸载无异常（延迟追加确实被武装过）
  ✔ I-02：卸载后**文档加载完成** Shadow host 仍必须为 0（不再复活残留节点）
  ✔ I-02：复活残留也不得留下层标记（装载点的 marker 已删除）

# 回退 I-02 修复后（日志 RP-R2-reverted.log）
  ✖ I-02：卸载后**文档加载完成** Shadow host 仍必须为 0（不再复活残留节点）
    — {"docElAtStart":true,"mountedAtStart":true,"unmountedAtStart":true,"unmountError":"",
       "shadowHosts":1,"marker":"undefined","readyState":"complete"}
```

> 回退段的 `shadowHosts:1 / marker:'undefined'` 与 review R1 探针 B 的实测形态**逐字一致**
> （纯残留节点：无监听、不拦截）。

### 12.4 两段证伪（回退 ⇒ 必须红；修复 ⇒ 必须绿）

```text
# ① 回退段：`git checkout HEAD -- src/content/pick-{overlay,layer,menu,bridge}.ts`（= 修复前）
#    `npm run build` ⇒ dist/pick-layer.js = 32391；`node test/ui/page-input.mjs`
#    日志：/tmp/opencode/v3-gate-logs/v3-4-fix2/RP-R2-reverted.log
  ✖ I-03：Esc 关闭菜单后宿主焦点回到原元素（不再静默丢到 BODY）
    — {"during":{"id":"","menuOpen":true,"tag":"DIV"},"after":{"id":"","menuOpen":false,"tag":"BODY"}}
  ✖ I-02：卸载后**文档加载完成** Shadow host 仍必须为 0（不再复活残留节点） — {"shadowHosts":1,…}
  ✖ I-10 前置（负控）：flash 之前没有挂起的 overlay 定时器 — null
  ✖ I-10：flash 高亮期间 overlay 定时器被**跟踪**（≥1；只 setTimeout 不跟踪就无法清除） — null
  ✖ I-10：flash 定时器触发后自行从跟踪集合移除（归 0，不泄漏） — null
  ✖ I-01②：失去授权后第一次交互（右键）即**自行卸载**（marker / host / 拦截全零）
    — {"intercepted":true,"marker":"object","shadowHosts":1}
  ✖ I-01③：面板收到卸载事实（风险区出现「页面侧不可用：页面侧已卸载」） —
▶ v3-4 页面即输入门禁: 71 passed / 7 failed
EXIT=1

# ② 修复段：还原 4 个源文件（sha256 记录在 §12.6）→ `npm run build` ⇒ 33900
#    `node test/ui/page-input.mjs`（日志 page-input.log）
▶ v3-4 页面即输入门禁: 78 passed / 0 failed
✔ v3-4 页面即输入门禁 PASS
EXIT=0
```

> **7 条 FAIL 各自命中预期文本**（`expectFailPattern` 已登记进台账
> `v3ReverseProofExpectations.inGate` 的 `RP-I02-01`/`RP-I03-01`/`RP-I01b-01`/`RP-I01c-01`/`RP-I10-01`，
> 并在元门禁 `test/gate-integrity.test.ts` 的 **in-gate 模式断言清单**里逐条机器核对（该清单 4 → **9** 条；
`REVERSE_PROOF_EXCEPTIONS` 例外登记仍为 4 条、未增删））。
> 回退段没有任何启动/环境错误形态（Chromium 正常走完 78 个 check、只红 7 条）⇒ 判「因该红而红」。

### 12.5 门禁（**严格串行、一次一个**；全量日志 `/tmp/opencode/v3-gate-logs/v3-4-fix2/`，**无 tail 截断**；每门禁 `finally` 自清 profile）

| # | 门禁 | 退出码 | 计数 / 原文 | 对照下界 |
|:--:|------|:--:|------|:--:|
| ① | `npm run typecheck` | 0 | 0 error | — |
| ② | `npm run build` | 0 | `177076 / 33900 / 362777`（content / pick-layer / sidepanel） | 三线 = 登记值 |
| ③ | `npm test` | 0 | `ℹ tests 795 / pass 795 / fail 0 / skipped 0` | 795（只增不减） |
| ④ | `npm run test:supersession` | 0 | `ℹ tests 14 / pass 14 / fail 0`；叶段 30 文件 / 97 条逐字登记 | 14 |
| ⑤ | `npm run test:density` | 0 | `density 门禁: 127 passed / 0 failed` | 127 |
| ⑥ | `npm run test:l0` | 0 | `164 passed / 0 failed` | 164 |
| ⑦ | `npm run test:l1` | 0 | `103 passed / 0 failed` | 103 |
| ⑧ | `npm run test:l2` | 0 | `71 passed / 0 failed` | 71 |
| ⑨ | `npm run test:l1-reverse` | 0 | 9 条「注入 → FAIL → sha256 复原 → PASS」 | 9 |
| ⑩ | `npm run test:l2-reverse` | 0 | 10 条全过 + 产物 sha256 复原 | 10 |
| ⑪ | `npm run test:page-input` | 0 | **78 passed / 0 failed**（原 61；本轮 +17） | 61 |
| ⑫ | `npm run test:zero-injection` | 0 | `27 passed / 0 failed` | 27 |
| ⑬ | `npm run test:ui`（journey） | 0 | `UI journey PASS — 167 assertions` | 167 |
| ⑭ | `npm run test:insight` | 0 | `UI insight PASS — 116 assertions` | 116 |
| ⑮ | `npm run test:binding` | 0 | `binding PASS — 192 assertions` | 192 |
| ⑯ | `npm run test:hardening` | 0 | `hardening PASS — 24 assertions` | 24 |
| ⑰ | `npm run test:e2e` | 0 | `R8 E2E PASS — real dist full chain` | PASS |
| ⑱ | `npm run test:gate-integrity` | 0 | `ℹ tests 12 / pass 12 / fail 0`（in-gate 模式断言清单 4 → 9 条已逐条核对；例外登记仍 4 条） | 12 |
| ⑲ | 体积四线 + 登记一致性 | 0 | `177076 / 33900 / 362777` + `ceiling === baseline === 实测` + `PICK_LAYER_RE_REGISTRATIONS` 链条 | 见 §12.1 |
| ⑳ | 零改动核对 | 0 | 见 §12.6 | — |
| ㉑ | 反证全套 | 0 | RP-V3-01/02/03/04/08/09（`density --reverse`，各 EXIT=0）+ RP-V3-05（`l2-reverse#RP-V33-03`）+ RP-V3-06（`size-budget`/`pick-layer-budget` 内建）+ **R2 两段证伪**（§12.4）+ **pick-layer +1B @ 33,901** + **content.js +1B @ 177,077**（§12.1） | 全过 |

**计数只增不减**：journey 167→167 · insight 116→116 · binding 192→192 · hardening 24→24 · node 795→795 ·
density 127→127 · l0 164→164 · l1 103→103 · l2 71→71 · gate-integrity 12→12 · supersession 14→14 ·
zero-injection 27→27 · **page-input 61→78**（+17）。**断言零删减**：本轮的改写都在**同编号/同用例内加严**
（`PICK_LAYER_BASELINE_META.previousBaselineBytes` 由 `null` → `32_391`、`direction` 由 `initial` → `raised`，
是「按新事实重 pin」而非删除；登记册/历史/反证断言全部**新增**）。

### 12.6 红线核验（逐条原文，日志 `REDLINES.txt`）

```text
177076 packages/web-cli-plugin/dist/content.js        # 无容差、逐字节不变
33900  packages/web-cli-plugin/dist/pick-layer.js      # == 登记值（V3-VOL-2 显式重登记）
362777 packages/web-cli-plugin/dist/sidepanel.js       # == 登记值（本轮零改动）

a72900313ab77c018961aa2b8e02bb1b630a9960c1b622f2a85addf543f99e82  src/content/content-script.ts
7df782b349b32839d0ec25fa515ee293441f85f75242083dae37e5ccfd601e0f  src/content/dom-agent.ts
5737c40a2014e7adf2bf4091a31a347af6600ecfea80f8882d52e9407191f4ac  src/content/page-bridge.ts
（与 test/size-baseline.ts#CONTENT_SOURCE_SHA256 三项逐字相等）

$ git status --porcelain -- packages/web-cli-plugin/manifest.json     → （空 = 零 diff）
$ grep -c contextMenus packages/web-cli-plugin/manifest.json          → 0
$ git status --porcelain -- .../src/ui/sidepanel/l1/ref-validity.ts   → （空 = 判定链未动）
$ git log --oneline -1 main                                           → 2ddc922（未动）
$ git status --porcelain -- packages/web-cli-base packages/lgdl-web-cli/src/web-cli-host \
      .opencode/opencode.json packages/web-cli-plugin/design          → （空）
$ git diff HEAD --stat -- packages/web-cli-plugin/package.json        → （空 = 无新增依赖）

改动集合（`git status --porcelain`，9 个文件；**无** `git add -A`）：
 M packages/web-cli-plugin/docs/v3-supersession-ledger.json
 M packages/web-cli-plugin/src/content/pick-bridge.ts
 M packages/web-cli-plugin/src/content/pick-layer.ts
 M packages/web-cli-plugin/src/content/pick-menu.ts
 M packages/web-cli-plugin/src/content/pick-overlay.ts
 M packages/web-cli-plugin/test/gate-integrity.test.ts
 M packages/web-cli-plugin/test/pick-layer-budget.test.ts
 M packages/web-cli-plugin/test/size-baseline.ts
 M packages/web-cli-plugin/test/ui/page-input.mjs

密度阈值（未动）：default {clickables:7, lines:15} · firstRun {9, 20} · risk {17, 35}
主界面无常驻输入框：#composer 默认 hidden（density 127 断言 + journey/insight 布局守卫覆盖）
风险位 L0 常驻不可折叠：density 127/0 + RP-V3-04（本轮实跑 EXIT=0）
未授权站点零注入：test:zero-injection 27/0（含带路径变体与强制注入负控）
```

### 12.7 提交与推送

```text
（逐文件 path-limited git add，禁用 git add -A）
git add <9 个显式文件>
git commit -m "fix(web-cli-plugin): v3-4 修复轮 R2（裁决 V3-VOL-2：pick-layer 显式重登记 32391→33900 + 落地复活路径/焦点/广播自检 5 项）"
git push https://github.com/THZSummer/LGDL.git HEAD:refs/heads/feature/web-cli-plugin
```

### 12.8 风险登记（供 validate 阶段专项核查）

| # | 风险 | 说明 | 建议核查方式 |
|:--:|------|------|------|
| **R2-1** | **「只断言 `ok`」形态可能存在于其它门禁**（R1 自报的方法论风险） | R1 的 BLOCK-1 之所以能全绿溜过，是因为旧断言只断言了 `ok === true` 而没断言**行为级事实**（`/app` 上 marker/host/拦截）。`page-input`/`zero-injection` 已在 R1 修掉这一形态；但**其它门禁**（journey/insight/density/l0/l1/l2/binding/hardening/e2e）**本轮未做全仓清扫**（编排器明确留给 validate）。 | validate 专项：对每个门禁抽样「外层 `ok`/布尔返回」型断言，检查其**内层**是否有行为级判据（拒绝原因 / DOM 事实 / 计数三处同源）；**若发现同类形态，按 R1 的 BLOCK-1 方式补行为级断言 + 两段证伪**，不得只在文案上标注 |
| **R2-2** | I-10 的「死判据」半边无行为级 FAIL 探针 | `history.__wcliPickWrapped` 从未被写入 ⇒ 删除它没有可观测行为差（详见 §12.2 口径登记）；该 hunk 的反证由 I-02 的复活复测承载 | 若要求正面证明，可在 validate 阶段以**源码面**判据核对（全仓 0 处 `__wcliPickWrapped`） |
| **R2-3** | `pendingTimers()` 是**新增门禁缝**（`op('timers')`） | 它只覆盖 `later()` 跟踪集合（`flash` 定时器），`showBubble` 的淡出定时器走 `bubbleTimer` 变量（`unmount()` 亦清除，但不在该计数内） | validate 可核对 `showBubble`/`hideBubble`/`unmount` 三条路径的清理一致性 |
| **R2-4** | 人工面 6 项仍为 `⏳ 未执行`（无真人观察） | 与 R1 相同，如实登记，不冒充 PASS | 见 §8 |

---

## 13. 收口轮（validate R1 之后；处置 **F1~F7**，2026-09-17）

> 起点 HEAD `1e2e1a1`（本叶 `phase=validated`）。本轮**只**为处置 validate R1 的 7 项非阻塞发现（0 阻塞、
> ⚠️ 有条件通过）：**F4（中，最高优先）实现生产可达** · **F3（中）去 flaky** · **F1（中）登记保真** ·
> F2/F5/F6/F7（低）。改动面 = `src/background/**`（1 文件）+ `test/**`（4 文件）+ 台账（1 文件）+ SDDU 产物；
> **三个受 pin 产物（`content.js` / `pick-layer.js` / `sidepanel.js`）逐字节不变**。

### 13.1 F1~F7 逐条（根因 / 修法 / 证据 / 可 FAIL 反证）

| # | 级别 | 根因 | 修法（文件） | 可 FAIL 证据 / 反证 |
|:--:|:--:|------|------|------|
| **F4** | 中（最高优先） | 层侧自检（I-01②）读 `pick-layer-env{authorized:false}`，而**撤销路径上没有该事实的生产发送点**（`pick-layer-inject` 未授权时提前 return；`pick-layer-env` 唯一调用者 `startPick()` 仅在 inject 成功后执行）⇒ 自检只在测试通道成立，「teardown 丢失」场景无人保护 | `src/background/service-worker.ts`：**①** `revoke` 改为 **先** `denotifyPickLayer(s, origin)`（`pickLayerOriginTabs(origin)` 逐 tab 下发 `{kind:'pick-layer-env', …, authorized:false}`）**再** `teardownPickLayer(s, origin)`；**②** `pick-layer-inject` 在 `executeScript`（await 点）**之后**重新 `declarationEnv()` 再下发 env（在途 inject 不得把已撤销 origin 重新标成 `authorized:true`）。`teardownPickLayer` 与 `denotifyPickLayer` 共用同一候选集（`pickLayerOriginTabs`） | `page-input` 新增 6 条：窗口静止前置 / 夹具生效负控 / 「吞掉一份 teardown」负控 / **env(false) 送达被测 tab** 负控 / **env 先于 teardown** 消息级 / **teardown 丢失后仍自卸** 行为级。**回退两处 hunk ⇒ 实测 `88 passed / 4 failed` EXIT=1**（`seen:[]`、`{intercepted:true,marker:'object',shadowHosts:1}`、`mountTag == armTag` ⇒ 同一实例未重挂载）；修复 ⇒ `92 passed / 0 failed` EXIT=0（原文见 §13.2） |
| **F3** | 中 | `page-input` 的 I-01②/I-01③ 断言 flaky（validate 实测 5 次 2 红 = 76/2 ↔ 78/0）：载体落在 **bound/active** 的 `siteTab`，窗口期内任何一次 `refreshState → ensureInjected → pick-layer-inject` 都会**无条件重推 `authorized:true`** 覆盖刚下发的 env(false) | `test/ui/page-input.mjs`：**①** 载体换成**同 origin 的非 bound / 非 active tab**（`appTab`）—— `pickLayerTarget` 候选序里没有它 ⇒ 覆盖路径**结构上不存在**；**②** 静止前置（读探测状态机：`nextDelayMs ≥ 15000` 或终态 `ready`/`blocked`，**连续两次读数**一致才继续）；**③** 载体负控加强为 `marker === 'object' && intercepted === true && shadowHosts === 1`。**断言未减弱**（无删除、无缩短、无放宽） | **连跑 ≥5 次 5/5 绿**（`page-input-f1..f5` 全部 `92 passed / 0 failed` EXIT=0，原文见 §13.3）；静态口径另见 `page-input-run19..23`（同 5/5）。若静止前置读不到 quiet ⇒ 该前置自身 FAIL（不是恒真） |
| **F1** | 中 | 逐文件归因三处落点把 **R1 预估分布**（`615/504/307/83`）写成「受控实验实测」⇒ **登记失真**（同一事实两个版本，被冒充的是「测量方法」本身） | `test/size-baseline.ts`（JSDoc + `PICK_LAYER_RE_REGISTRATIONS['v3-4-fix2'].reason`）与 `docs/v3-supersession-ledger.json#featureHistory.v3-4-fix2.perFileAttribution` 按实测订正为 **`661/389/376/83`**；方法描述改为「逐文件回退到 **R2 前 `1e1b798`**」；历史值（`615/504/307/83` 与「曾被当成受控实验实测」）逐字保留在订正注 | `test/pick-layer-budget.test.ts` 新增用例：**三处同源 + 四项之和 == 总增幅（Σ == +1,509）**。反证两段：① 产物扰动 `+661 → +615` ⇒ `AssertionError: reason 的逐文件分布必须是实测值（不是 R1 预估值）` EXIT=1；② 台账 `totalBytes 1509 → 1508` ⇒ `AssertionError: 台账 totalBytes 必须 == 总增幅` EXIT=1；还原 ⇒ `3/3 pass` EXIT=0（原文见 §13.4） |
| **F2** | 低 | 散文残留 `+10.25% / +22.95%`（估读），与同文件 `:324/:325`、`docs/v3-density-baseline.json#volume.directionalAlert`（`+10.44% / +22.96%`）及实测算术自相矛盾 | `test/size-baseline.ts:670/673` 与台账 `V34-S4~S8` 的 5 条 `reason` 订正为 **`+10.44%` / `+22.96%`**（`(362777−328476)/328476 = +10.44%`；`(327679−266500)/266500 = +22.956% → +22.96%`），并各带订正注；历史值（`+10.25%` / `+22.95%`）逐字保留 | 台账一致性由 `test:supersession` 的逐行命中判据覆盖（`V34R3-S1/S2/S5` 逐条登记 oldTitle/newTitle，`newTitle` 必须可定位、`oldTitle` 必须已消失）；5 条 reason 的 5 处删除行逐行命中同一条目 |
| **F5** | 低 | `pickLayerTarget` 候选序「bound 优先」而 `followActiveTab` 的重绑是**异步**的 ⇒「切到同 origin 兄弟 tab」与「绑定落地」之间存在窗口，注入/高亮会落到**刚离开的**那个 tab（行为落到非预期目标） | `src/background/service-worker.ts#pickLayerTarget`：当 **bound 与 active 同 origin** 时以 **active** 为准（bound 仍是紧随其后的回退候选；`NON_INJECTABLE_URL` / `candidate.expect` 校验全部保留） | `page-input` 新增 5 条（含负控）。**构造是确定性的、不靠竞态**：先用内容脚本 `hello` 路径把 bound 换到非活动 tab（`hello` 绑**发送者 tab**，与「哪个 tab 是活动 tab」无关）⇒ 回退后必返回 `bound`（`tabId === siteTab`）FAIL，修复后返回 `active`（`tabId === appTab`）PASS |
| **F6** | 低 | `src/content/pick-menu.ts#restoreFocus` 的 `prev?.focus?.()`：当 `previousFocus` 已脱离 DOM 时**静默无效**（焦点落回 BODY，无观测输出） | ⛔ **deferred（未修，如实登记）**：一行修法（`if (!prev?.isConnected) …` 或落回可见入口）会让 `dist/pick-layer.js` **超过 V3-VOL-2 钉死的 33,900 B（零容差）** ⇒ 按红线「波及即停」，需**新的显式重登记裁决**（前后值 + 日期 + 来源 + 理由 + 历史保留）；本轮**不动**该产物，也不以「压缩别处凑字节」绕过 | 复现路径（validate R1 原文）：菜单开启期间宿主 `remove()` 掉 `previousFocus` 元素 → Esc 关闭 → `document.activeElement` 落回 `BODY`（`{id:'',tag:'BODY'}`）。**本叶既有 I-03 断言只覆盖「元素仍在 DOM」的正常路径**，故该边界保持未验证并在此如实登记 |
| **F7** | 低 | `build.md §12.4` / commit `1e2e1a1` 文案写「in-gate 模式清单 **4 → 9** 条」 | 订正为 **`8 → 13`**（R1 后 8 条、R2 后 13 条；「4」是 R1 之前的值）；本轮再 **13 → 17**（新增 F3/F4/F5 四条 in-gate 登记）。历史文案不改写，订正写在本节 | `test/gate-integrity.test.ts#inGate` 清单条数在 `--list-cases`/元门禁运行时被逐条核对（每条 pattern 必须能在门禁源码里定位 —— 本轮 17/17 命中） |

**F7 订正原文（逐字）**：`§12.4` 写的是「该清单 **4 → 9** 条」；实测 `test/gate-integrity.test.ts#inGate`
在 `1e1b798`（R1 后）= **8** 条、在 `1e2e1a1`（R2 后）= **13** 条。即原文的「4」是 R1 **之前**的值、
「9」忽略了 R1 新增的 4 条。本轮（收口轮）再次追加 4 条（F3/F4/F5）⇒ **17** 条。

### 13.2 F4 两段证伪（回退 ⇒ 必须红；修复 ⇒ 必须绿）—— 原文

```text
# ① 回退段：只回退 F4 的两处 hunk（① revoke 不再 denotify；② pick-layer-inject 不再重算 env）
#    日志：/tmp/opencode/v3-gate-logs/v3-4-closeout/RP-F4b-reverted.log
  ✖ F4 负控：去授权事实**送达**被测 tab 的隔离世界（发送 ≠ 送达；发送失败必须可见）
    — {"seen":[],"log":[{"tabId":999999,"kind":"__wcli-f4-selfcheck__","settled":"err:Could not establish connection. Receiving end does not exist."},
       {"tabId":1844229548,"kind":"pick-layer-teardown","settled":"dropped(simulated)"},
       {"tabId":1844229550,"kind":"pick-layer-teardown","settled":"ok"}]}
  ✖ F4：撤销路径**先**下发去授权事实，再拆（每个受影响 tab 的 env(authorized:false) 都先于其 teardown 尝试）
    — [{"tabId":999999,"kind":"__wcli-f4-selfcheck__",…},{"tabId":1844229548,"kind":"pick-layer-teardown","settled":"dropped(simulated)"},
       {"tabId":1844229550,"kind":"pick-layer-teardown","settled":"ok"}]
  ✖ F4：**teardown 丢失**（被夹具吞掉）的 bound tab 仍在收到 env(false) 后自行卸载（marker/host/拦截全零）
    — {"probe":{"intercepted":true,"marker":"object","shadowHosts":1},"mountTag":"tag-4zapzx","armTag":"tag-4zapzx","seen":[],"log":[…]}
  ✖ I-01 ①：bound tab 同样零残留（原本覆盖的那一半不得回退）
    — {"intercepted":true,"marker":"object","shadowHosts":1}
▶ v3-4 页面即输入门禁: 88 passed / 4 failed
EXIT=1

# ② 修复段：还原两处 hunk（sha256 记录见 §13.6）→ `npm run build`
#    日志：/tmp/opencode/v3-gate-logs/v3-4-closeout/page-input-f1.log
  ✔ F4 前置（静止）：窗口期内不会再发 probe-changed → refreshState（饱和退避 ≥15s 或终态，连续两次读数）
  ✔ F4 夹具前置（负控）：tab 侧收据与 mount 身份标记已装好（可观测）
  ✔ F4 夹具前置（负控）：SW 侧 sendMessage 吞包夹具确实生效（可观测，非静默失效）
  ✔ F4 夹具负控：teardown 广播确有一份被吞掉（「丢失」模拟真的发生，否则断言无对象）
  ✔ F4 负控：去授权事实**送达**被测 tab 的隔离世界（发送 ≠ 送达；发送失败必须可见）
  ✔ F4：撤销路径**先**下发去授权事实，再拆（每个受影响 tab 的 env(authorized:false) 都先于其 teardown 尝试）
  ✔ F4：**teardown 丢失**（被夹具吞掉）的 bound tab 仍在收到 env(false) 后自行卸载（marker/host/拦截全零）
  ✔ I-01 ①：撤销后**另一个 tab**（非 bound/active）也零残留（marker/host/拦截全零）
  ✔ I-01 ①：bound tab 同样零残留（原本覆盖的那一半不得回退）
  ✔ F4 夹具还原：SW 侧 sendMessage 已还原（后续用例不被夹具污染）
▶ v3-4 页面即输入门禁: 92 passed / 0 failed
EXIT=0
```

> **判「因该红而红」**：回退段没有任何启动/环境错误形态（Chromium 正常走完 92 个 check、只红 4 条，
> 且红的是**本次新加的四条**）；`mountTag == armTag` 这一条诊断把「未送达/未自卸」与「层被重挂载」
> 区分开 —— 回退段的形态正是 **F4 原始 hole 的形状**（`marker:'object'` + `intercepted:true` + `shadowHosts:1`）。

### 13.3 F3 稳定性证据（连跑 5 次原文）

```text
$ for i in f1 f2 f3 f4 f5; do npm run test:page-input; done      # 全量日志 page-input-f*.log（无 tail 截断）
page-input-f1 EXIT=0 :: ▶ v3-4 页面即输入门禁: 92 passed / 0 failed
page-input-f2 EXIT=0 :: ▶ v3-4 页面即输入门禁: 92 passed / 0 failed
page-input-f3 EXIT=0 :: ▶ v3-4 页面即输入门禁: 92 passed / 0 failed
page-input-f4 EXIT=0 :: ▶ v3-4 页面即输入门禁: 92 passed / 0 failed
page-input-f5 EXIT=0 :: ▶ v3-4 页面即输入门禁: 92 passed / 0 failed
（5/5 绿；另有同配置的 page-input-run19..23 亦 5/5 绿，供交叉印证）
```

**flake 机制（写清，便于复现）**：`pick-input.ensureInjected()`（由 `refreshState` 触发，`probe-changed` /
`session-changed` 都会触发）→ 面板发 `pick-layer-inject` → SW **无条件**在注入后下发 `pick-layer-env`
（`authorized` 由 OriginStore 现算）。旧版把 I-01② 的载体放在 **bound/active** 的 `siteTab` 上 ⇒ 只要
窗口期内发生一次 `refreshState`，刚下发的 `authorized:false` 就被覆盖为 `true`，层不再自检卸载
（**产物行为本身是对的**，被削弱的是门禁断言）。新版载体（非 bound/active）+ 静止前置让这条覆盖路径
对载体**不存在**，且窗口期内不再有探测事件；**断言一条未减**（载体负控反而加严）。

### 13.4 F1 Σ 断言反证原文

```text
# 扰动 ①（产物扰动）：把 dist-test 里 reason 的实测 +661 改回 R1 预估 +615
$ node --test dist-test/test/pick-layer-budget.test.js
✖ V3-4 size: 逐文件归因三处同源且四项之和 == 总增幅（Σ == +1,509，validate F1）
  AssertionError [ERR_ASSERTION]: reason 的逐文件分布必须是实测值（不是 R1 预估值）
ℹ tests 3 / pass 2 / fail 1     EXIT=1

# 扰动 ②（只动 Σ 关系的另一端）：台账 featureHistory.v3-4-fix2.perFileAttribution.totalBytes 1509 → 1508
$ node --test dist-test/test/pick-layer-budget.test.js
  AssertionError [ERR_ASSERTION]: 台账 totalBytes 必须 == 总增幅
ℹ tests 3 / pass 2 / fail 1     EXIT=1

# 还原（两处均逐字还原）：
$ npm test / node --test dist-test/test/pick-layer-budget.test.js
ℹ tests 796 / pass 796 / fail 0  ·  ℹ tests 3 / pass 3 / fail 0    EXIT=0
```

### 13.5 门禁（**严格串行、一次一个**；全量日志 `/tmp/opencode/v3-gate-logs/v3-4-closeout/`，**无 tail 截断**；每门禁 `finally` 自清 profile）

| # | 门禁 | 退出码 | 计数 / 原文 | 对照（只增不减） |
|:--:|------|:--:|------|:--:|
| ① | `npm run typecheck` | 0 | 0 error | — |
| ② | `npm run build` | 0 | `177076 / 33900 / 362777`（content / pick-layer / sidepanel） | 三线 = 登记值 |
| ③ | `npm test` | 0 | `ℹ tests 796 / pass 796 / fail 0 / skipped 0` | 795 → **796** |
| ④ | `npm run test:supersession` | 0 | `ℹ tests 14 / pass 14 / fail 0`（含叶段判据 + 逐行命中） | 14 |
| ⑤ | `npm run test:density` | 0 | `density 门禁: 127 passed / 0 failed` | 127 |
| ⑥ | `npm run test:l0` | 0 | `164 passed / 0 failed` | 164 |
| ⑦ | `npm run test:l1` | 0 | `103 passed / 0 failed` | 103 |
| ⑧ | `npm run test:l2` | 0 | `71 passed / 0 failed` | 71 |
| ⑨ | `npm run test:l1-reverse` | 0 | 「注入 → FAIL → 逐字节还原（sha256 复原）→ PASS」9 条 | 9 |
| ⑩ | `npm run test:l2-reverse` | 0 | 10 条全部命中 `expectFailPattern` + sha256 还原 | 10 |
| ⑪ | `npm run test:page-input`（**连跑 5 次**） | 0 ×5 | **92 passed / 0 failed** ×5（原 78） | 78 → **92** |
| ⑫ | `npm run test:zero-injection` | 0 | `27 passed / 0 failed` | 27 |
| ⑬ | `npm run test:ui`（journey） | 0 | `UI journey PASS — 167 assertions` | 167 |
| ⑭ | `npm run test:insight` | 0 | `UI insight PASS — 116 assertions` | 116 |
| ⑮ | `npm run test:binding` | 0（**复跑**） | `binding PASS — 192 assertions` | 192 |
| ⑯ | `npm run test:hardening` | 0 | `hardening PASS — 24 assertions` | 24 |
| ⑰ | `npm run test:e2e` | 0 | `R8 E2E PASS` | PASS |
| ⑱ | `npm run test:gate-integrity` | 0 | `ℹ tests 12 / pass 12 / fail 0`（in-gate 清单 **13 → 17**，逐条定位命中；例外登记仍 4 条） | 12 |
| ⑲ | 体积四线 + 登记一致性 | 0 | `177076 / 33900 / 362777` + `ceiling === baseline === 实测` + 登记册链条 | 见 §13.6 |
| ⑳ | 零改动核对 | 0 | 见 §13.6 | — |
| ㉑ | 反证全套 | 0 | `density --reverse` RP-V3-01/02/03/04/08/09 各 EXIT=0 · RP-V3-05 = `l2-reverse#RP-V33-03` · RP-V3-06 内建 · **F4 两段证伪**（§13.2）· **F1 Σ 两段反证**（§13.4）· **F3 5 连跑**（§13.3）· `pick-layer +1B @33,901` FAIL→还原 PASS · `content.js +1B @177,077` FAIL→还原 PASS | 全过 |

> **⑮ `test:binding` 首跑红、复跑绿 —— 如实登记（不掩盖、不冒充）**：首跑 `binding FAILED (3)`
> （`#3d/#3e/#3f`，诊断 `/tmp/opencode/r2-3/logs/binding-diagnostics-1789592607099.log` 显示
> `contexts.*: ERR:CDP socket not open (readyState=3)`，即 Chromium 进程在断言前已死亡）。
> **同一失败签名在本叶改动之前就存在**（`binding-diagnostics-1789520473394.log`，2026-09-16T01:01，
> 早于 R2 与本轮），属**环境性**（该门禁复用外部真实站点 `http://localhost:5173` + 需要 ~1.5 GB 内存的
> 单实例 Chromium）⇒ 单独复跑即 `192 assertions` 全绿。**未修改该门禁的任何断言**。

**计数只增不减**：node 795 → **796**（+1，F1 的 Σ 断言）· page-input 78 → **92**（+14 条断言）·
journey 167 → 167 · insight 116 → 116 · binding 192 → 192 · hardening 24 → 24 · density 127 → 127 ·
l0 164 → 164 · l1 103 → 103 · l2 71 → 71 · gate-integrity 12 → 12 · supersession 14 → 14 ·
zero-injection 27 → 27。**断言零删减**：`page-input` 的两处改写都是**同编号内加严**（载体负控增加
`shadowHosts === 1`），其余全部为**新增**；台账新增 `V34R3-S1~S5`（取代登记）+ `v3_4_closeoutNote` +
`featureHistory.v3-4-closeout`（只追加，旧值逐字保留）。

### 13.6 红线核验（逐条原文，日志 `REDLINES.txt` / `plus1b.txt`）

```text
177076 packages/web-cli-plugin/dist/content.js        # 无容差、逐字节不变（sha256 52a82620… 与 R2 后一致）
33900  packages/web-cli-plugin/dist/pick-layer.js      # == 登记值（sha256 5f567d7e… 与 R2 后一致）
362777 packages/web-cli-plugin/dist/sidepanel.js       # == 登记值（源码零改动；sha256 仅因 __BUILD_STAMP__ 变化）

a72900313ab77c018961aa2b8e02bb1b630a9960c1b622f2a85addf543f99e82  src/content/content-script.ts
7df782b349b32839d0ec25fa515ee293441f85f75242083dae37e5ccfd601e0f  src/content/dom-agent.ts
5737c40a2014e7adf2bf4091a31a347af6600ecfea80f8882d52e9407191f4ac  src/content/page-bridge.ts
（与 test/size-baseline.ts#CONTENT_SOURCE_SHA256 三项逐字相等）

manifest.json 零 diff · contextMenus = 0 次 · 无新增权限
src/ui/sidepanel/l1/ref-validity.ts（判定链）零 diff
main = 2ddc922（未动）· packages/web-cli-base / lgdl-web-cli/src/web-cli-host / .opencode/opencode.json / design 零 diff
package.json 零 diff（无新增依赖）· 密度阈值逐字 default 7/15 · firstRun 9/20 · risk 17/35
#composer 默认 hidden（主界面无常驻输入框）
`git status --porcelain` 7 文件（M）+ 2 新增 SDDU 产物（??）；**全程未用 `git add -A`**

$ printf ' ' >> dist/pick-layer.js  ⇒ 33901 ⇒ `AssertionError: 登记 33900B ≠ 实测 33901B`  EXIT=1
$ cp 还原 ⇒ sha256sum -c 一致（SHA256_RESTORED_IDENTICAL）⇒ 3/3 PASS  EXIT=0
$ printf ' ' >> dist/content.js    ⇒ 177077 ⇒ `AssertionError: content.js 177077B ≠ 177076B —— 本叶必须是逐字节零改动`  EXIT=1
$ cp 还原 ⇒ sha256 一致 ⇒ 3/3 PASS  EXIT=0
```

### 13.7 提交与推送

```text
（逐文件 path-limited git add，禁用 git add -A）
git add packages/web-cli-plugin/src/background/service-worker.ts \
        packages/web-cli-plugin/test/ui/page-input.mjs \
        packages/web-cli-plugin/test/size-baseline.ts \
        packages/web-cli-plugin/test/pick-layer-budget.test.ts \
        packages/web-cli-plugin/test/gate-integrity.test.ts \
        packages/web-cli-plugin/docs/v3-supersession-ledger.json \
        .sddu/.../specs-tree-v3-4-page-as-input/{build.md,state.json,TREE.md,validate.md,validate-report.md}
git commit -m "fix(web-cli-plugin): v3-4 收口轮（F4 revoke 先下发去授权闭合自检可达性 + F3 去flaky 五连跑 + F1 归因实测订正 + F2/F6/F7）"
git push https://github.com/THZSummer/LGDL.git HEAD:refs/heads/feature/web-cli-plugin
```

### 13.8 未完成 / deferred（如实登记）

| # | 项 | 状态 | 理由 |
|:--:|------|:--:|------|
| **F6** | `pick-menu.ts#restoreFocus` 对已脱离 DOM 的 `previousFocus` 静默无效 | ⛔ **deferred** | 修法必须落在 `src/content/pick-menu.ts` ⇒ `dist/pick-layer.js` 增长，而该产物按 **V3-VOL-2** 口径**零容差钉死 33,900 B**；按红线「波及即停」，需新的**显式重登记裁决**（前后值/日期/来源/理由/历史保留）。复现路径已登记（§13.1 F6 行） |
| 人工面 6 项 | 拾取观感 / 拖动体感 / 菜单观感 / 宿主真实兼容 / 多显示器 / 高 DPI | ⏳ **未执行** | 与 R1/R2 一致，如实登记，不冒充 PASS（§8） |
| 真实第三方站点 | 全部动态验证均在本地夹具（`127.0.0.1` / `localhost`） | ⏳ **未执行** | 同 validate §7（CSP / iframe / 复杂宿主样式未覆盖） |
| `risk` 档其余 4 子场景 | `unauthorized` / `probing` / `confirm` / `staleRef` | ⏳ 由门禁携带 | 与 validate §7.3 一致（本轮未增/未减该面） |


## 14. 收口后缺陷修复轮 R1（2026-09-17，作者真机反馈）

> **来源**：作者真机反馈（HEAD `870cb6e`，`https://platform.deepseek.com/usage`）：
> 「在普通站点拾取 2 条引用，稳定选择器 / 语义路径 / 文本摘要 / 捕获时间全部采到，但两条引用都被判失效 ——
> `无法确认引用 N 的目标是否仍然有效（引用捕获事实不完整：缺失 declarationHash）—— 按失效处理`」；
> 作者结论：**「拾取的效果不好，几乎完全不可用」**。
> **编排器裁决**（本轮的授权与设计）：fail-closed **不放松**——「不确定即失效」保留；修的是「**捕获事实不完整**」，
> 不是「判定太严」。修法必须落在**非冻结**产物（`src/content/**` + `dist/content.js` + `dist/pick-layer.js` 逐字节不变）。
> **轮次性质**：同一 Feature 内的**缺陷修复轮** ⇒ `roundKind: 'registry-fidelity-round'`（④ 的「连续两个功能轮」告警口径不变）。

### 14.1 根因（两个缺口，同一症状）

**缺口 ①：D4 的口径是「必须有 declarationHash」**（作者原文即是此分支）

| 步 | 文件:行（R1 前） | 事实 |
|:--:|------------------|------|
| ① | `src/content/ref-capture.ts:304`（**冻结**） | `declarationHash: env.declarationHash` —— 站点无声明时是 `''` |
| ② | `src/content/pick-bridge.ts:80` + SW `declarationEnv()`（**冻结 + 背景**） | 无采纳声明时下发 `declarationHash: ''` |
| ③ | `src/ui/sidepanel/pick-input.ts#accept()` → `sidepanel.ts#acceptCapture()` → `l1/ref-store.ts:137` | 摄取时 `declarationHash: raw.declarationHash ?? ''`（**当时没有第二个可补全的落点**） |
| ④ | `src/ui/sidepanel/l1/ref-validity.ts:142-149` | `REQUIRED_REF_FACTS` **含 `declarationHash`** ⇒ `''` 被判「捕获事实缺失」 |
| ⑤ | `src/ui/sidepanel/l1/ref-validity.ts:224-225` | `missing ⇒ unknown(missing-fact)` ⇒ 作者看到的原文 |

**站点声明是「站点工具面」机制，不是「用户拾取」的前提**：没有声明的站点，页面侧（冻结）只能写 `''`
⇒ **引用出生即死**。夹具盲区：v3-2/v3-4 的门禁夹具（LGDL / 自建夹具）都是**声明有效**的页面。

**缺口 ②：D1 的身份观测晚于身份标记**（修完 ① 才暴露）

`l1/ref-validity.ts:247` 的 D1 身份判据是 `res.refMark === ref.refId`（身份 = 捕获时写下的 `data-wcli-ref` 标记）。
但**标记由面板铸造 id 之后才写回页面**（`pick-layer.ts:103-111` 的 `mark` 分支）⇒ **捕获时刻的观测结构上不可能带上它**
⇒ 每一条新拾取的引用被判「目标元素已被同类新元素替换」⇒ 真实站点上**仍然不可用**。
缺口 ①/② 是同一症状的两个原因（D4 在判定顺序上先于 D1，所以作者先看到 `缺失 declarationHash`）。

### 14.2 修法（全部落在非冻结文件）

| 层 | 文件 | 改动 |
|----|------|------|
| 单一事实源 | `src/background/service-worker.ts` | `declarationEnv()` 新增 `declarationStatus`（`valid`/`invalid`/`absent`，由既有声明状态机派生：`supported→valid`、`unsupported→absent`、其余→`invalid`；`valid` 只在真有采纳 descriptor（真有摘要）时返回）；新增 `declarationStatusOf()` |
| 身份观测（缺口②） | `src/background/service-worker.ts` | 新增 `observeIdentity(tabId, selector)`：在 tab 的隔离世界**只读**读 DOM（`querySelectorAll` 计数 + `data-wcli-ref`），返回与 `RefResolution` 同形的观测；`ref-highlight` 的 **`mark` 分支在写标记之后**带上 `resolution` 回传 |
| 摄取 | `src/ui/sidepanel/pick-input.ts` | `withDeclaration()`：两条摄取落点（点击 / 拖放）都补全 `declaration: { status, hash? }`；`judgeEnv()` 增 `declarationStatus`；`highlight(mark)` 把新观测交回调用方 |
| 捕获事实 | `src/ui/sidepanel/l1/ref-store.ts` | `declaration` 事实透传（`create()`） |
| 判定（缺口①） | `src/ui/sidepanel/l1/ref-validity.ts` | `RefFacts.declaration?: { status, hash?, version? }` + `RefEnv.declarationStatus?`；**D4 = 捕获时状态 vs 当刻状态一致**（`valid` 还须摘要相等、双方已知的 version 相等；任何变化 ⇒ `invalid` + 文案「（请在页面上重新拾取）」）；`REQUIRED_REF_FACTS` 去掉 `declarationHash`；状态变化渲染 `声明状态 无效 → 有效`（`hash h1 → h2` / `version v1 → v2` 的 N-07 逐字模板**保留**） |
| 重判（缺口②） | `src/ui/sidepanel/sidepanel.ts` | `acceptCapture()`：标记回程返回**新观测** ⇒ `setResolution(fresh)` + `judge()` + `render()`，随后才把「判定：X」写进选择题（观测只能来自页面，面板**不自证** `resolved`） |
| 文案 | `src/ui/sidepanel/view-model.ts` | 风险位终端说明补一行：「未声明（或声明无效）的站点不影响「从页面拾取」与引用。」 |
| busy 残留 | `src/ui/sidepanel/chat-state.ts` + `sidepanel.ts` | `REF_ROUND_PREFIX` + `supersededAsk()`：引用回合取代**后台提问**时，把被取代的提问结算为 `canceled`（可读通知）——否则该提问只能等 ask-bridge 的 60 s 超时，期间 `pending` 让发送键一直显示「上一条指令仍在处理中」（见 §14.5） |

**fail-closed 逐分支论证**（新增出口全部是 `invalid` / `unknown`；`valid` 的**唯一**路径）见 v3-2 `build.md §12.3`
（D4 属 v3-2 的判定链产物）。缺口② 一侧同样安全：**观测读失败 ⇒ 保持旧事实 ⇒ 判 fail-closed（unknown）**，
面板从不自证 `resolved`（`test/ref-wiring.test.ts` 的静态反证钉死）。

### 14.3 反证（三条，逐条可 FAIL）

| # | 反证 | 扰动 | 期望 | 实测 |
|:-:|------|------|------|------|
| ①a | **复现反证（D4）** | `pick-input.ts#withDeclaration` 退化为恒等函数（摄取不再补声明状态，**语法合法**）→ 重建 → `node test/ui/page-input.mjs` | 新断言必须 FAIL | ✅ `EXIT=1`，`92 passed / 1 failed`，失败原因**逐字等于作者原文**：`无法确认引用 1 的目标是否仍然有效（引用捕获事实不完整：缺失 declarationHash）—— 按失效处理`；还原后 `93 passed / 0 failed`（`RP-R1-A2.log` / `RP-R1-A2.exit`） |
| ①b | **复现反证（D1）** | `sidepanel.ts#acceptCapture` 去掉「新观测回写」（`if (fresh) l1?.setResolution(fresh);` → `void fresh;`）→ 重建 → 同一门禁 | 新断言必须 FAIL | ✅ `EXIT=1`，`92 passed / 1 failed`，失败原因：`目标元素已被同类新元素替换（身份标记不匹配）`（`RP-R1-B.log` / `RP-R1-B.exit`） |
| ② | **状态变更反证** | 纯 Node：捕获 `invalid` → 当刻 `valid`（站点后来修好声明）/ `absent→invalid` / `valid→absent` | 必须 `invalid` + 文案提示重拾 | ✅ `test/l1-ref-validity.test.ts`「R1 judge: 声明**状态变更** ⇒ invalid 且可读原因提示重新拾取」；摘要变化仍走 `hash h1 → h2`（不加「重新拾取」，N-07 措辞不被覆盖） |
| ③ | **fail-closed 反证** | 纯 Node：捕获事实**既无 hash 也无 status**（修复前的旧数据）× 三档 env；`valid` 声明缺摘要；捕获侧缺摘要 | 必须仍失效（unknown），不得因 R1 放行 | ✅ 同文件「R1 judge fail-closed（反证③）」；旧记录的 legacy 分支与 R1 前**逐分支等价**（原有 12 个用例零改动、全绿） |

> **「因错而红」防呆**：①a 的第一版扰动把 `onCapture(withDeclaration(…)` 改成 `onCapture(…)` 造成**语法错误** ⇒
> 构建失败（`Expected ";" but found ")"`），该次 `EXIT=1` 是**构建错误**而非判据的红 —— 已按仓库既有纪律**判为无效并作废**，
> 改用「恒等函数」形态重跑（§14.3 表内为有效证据；无效证据 `RP-R1-A.log` / `RP-R1-A-build.log` 逐字留档）。

### 14.4 门禁（严格串行，全绿；计数只增不减）

| 门禁 | 实测 | 基线（收口时） |
|------|:--:|:--:|
| `npm run typecheck` / `npm run build` | `0 error` / `EXIT=0` | — |
| `npm test`（插件单测） | **`ℹ tests 803 / pass 803 / fail 0 / skipped 0`** | 796 → **803**（+7：判定链 4 + 布线反证 2 + busy 1） |
| `test:supersession` | **14 / 0** | 14（叶段登记 104 条） |
| `test:density` | **127 / 0** | 127 |
| `test:l0` / `test:l1` / `test:l2` | **164 / 103 / 71**，0 failed | 164 / 103 / 71 |
| `test:l1-reverse` / `test:l2-reverse` | **9 条 / 10 条**（注入→FAIL→sha256 复原→PASS） | 同 |
| `test:page-input` | **93 / 0**（**连跑 5 次 5/5 绿**，每次 `93 passed / 0 failed`） | 92 → **93**（R1 断言） |
| `test:zero-injection` | **27 / 0** | 27 |
| `test:ui` / `test:insight` / `test:binding` / `test:hardening` | **167 / 116 / 192 / 24** | 同 |
| `test:e2e` | **PASS** | PASS |
| `test:gate-integrity` | **12 / 12** | 12 |
| 体积四线 | `content.js 177,076`（sha `52a82620…` 不变）· `pick-layer.js 33,900`（sha `5f567d7e…` 不变）· `sidepanel.js 366,755` ≤ ceiling **385,092** · `+1 B` 反证在**新** ceiling 上重跑 | — |

日志全量落盘：`/tmp/opencode/v3-gate-logs/defect-r1-ref-declaration/`（`01-*` … `18-*`、`RP-*`、`REDLINES.txt`）。

### 14.5 busy 残留诊断（次要现象，**已修**）

原文：`发送已禁用：上一条指令仍在处理中，请稍候。`

**根因（精确到行）**：`sidepanel.ts#acceptCapture()` 无条件 `dispatch({ type: 'ask', requestId: 'ref-round-<refId>' })`
—— 该回合**覆盖** `state.ask`（`chat-state.ts:169-179`）。若被覆盖的是**后台提问**（`ask-user-request`），
`submitAsk()` 的 `if (res && !refId)` 分支**不会**把答复发回后台（`sidepanel.ts:1074`）⇒ 该提问的 `askBridge` 只能等
`DEFAULT_ASK_TIMEOUT_MS = 60000` 超时（`ask-bridge.ts`）；期间 `state.pending` 仍为 `true`（`view-model.ts:243`
渲染该文案），而它只由 `chat-result done` / `error` / `history` 清除。

**修法（≤10 行，非冻结文件）**：`chat-state.ts` 新增 `REF_ROUND_PREFIX` + `supersededAsk(state)`（纯判据）：
`acceptCapture()` 在派发引用回合**之前**把被取代的后台提问结算为 `canceled`，并给用户一句可读通知
（「已放弃上一条提问（你先在页面上拾取了引用）。」）。**可 FAIL 断言**：`test/sidepanel.test.ts` 的
「R1 ask: 引用回合（ref-round-*）取代后台提问时必须可判定（supersededAsk）」——判据是「后台 id ⇒ 返回它 / 自己人的
引用回合 ⇒ `null` / 无提问 ⇒ `null`」，并有「把 id 换成 `ask-8` 仍返回后台 id」的非空转对照。

### 14.6 体积与重登记（五要素披露）

| 项 | 值 |
|----|----|
| 前值 → 后值 | `362,777 → 366,755 B`（**+3,978 B / +1.10%**） |
| 逐模块归因（同几何实测，Σ == 总增幅） | `l1/ref-validity.ts +1,762` · `sidepanel.ts +854` · `pick-input.ts +724` · `l1/ref-store.ts +256` · `chat-state.ts +220` · `view-model.ts +162` |
| ceiling | 公式抬高 `floor(366,755 × 1.05) = 385,092 B`（容差 5% 未动、cap 仍 `record-only`） |
| Feature 累计 | 从 `266,500 B` 起算 **+37.62%**（< 40% 停工线；**最差相邻对 +22.96%** 的告警仍在） |
| 零改动 | `content.js` 177,076（sha 不变）· `pick-layer.js` 33,900（sha 不变）· 三冻结源 hash == pin |
| 登记落点 | `test/size-baseline.ts`（`SIDEPANEL_RE_REGISTRATIONS['v3-4-r1']` / `SIDEPANEL_GROWTH_BREAKDOWN` / TIMELINE）· `docs/v3-density-baseline.json#volume` · `docs/v3-supersession-ledger.json`（`V34R1-S1~S4` + `featureHistory.v3-4-r1`） |

### 14.7 零改动核对（红线）

| 红线 | 实测 | 结论 |
|------|------|:--:|
| `dist/content.js` 逐字节不变 | `177,076` · sha `52a826205553b46a896ccad54225d63ba62f5f7fe7c969a9bc2e655448d5b5f6` | ✅ |
| `dist/pick-layer.js` 逐字节不变 | `33,900` · sha `5f567d7ededc58183afe4ce45e3293b68204dfbe788dc6b9fb09bdc6e0d13e59` | ✅ |
| `src/content/**` 零改动 | 三冻结源 sha == `CONTENT_SOURCE_SHA256`（`a7290031…` / `7df782b3…` / `5737c40a…`）；`git diff --stat HEAD -- src/content` 空 | ✅ |
| 判定链 pin（`policy.ts` / `auto-authorize.ts`） | `bfcb2ede…` / `1096d065…`；`git diff --stat HEAD -- src/security` 空 | ✅ |
| `manifest.json` / `package.json` | 零 diff；`contextMenus` 命中 **0** | ✅ |
| 密度阈值 `7/15 · 9/20 · 17/35` | 未动（`test:density` 127/0） | ✅ |
| 风险位不可折叠 / 未授权零注入 | `test:l0` / `test:zero-injection` 27/0 全绿 | ✅ |
| 测试只增不减、断言只强不弱 | `796 → 803`；`page-input 92 → 93`；既有断言零删除（台账 `V34R1-S1~S4` 登记取代/新增） | ✅ |
| 不用 `git add -A` / 门禁串行 / 日志全量落盘 | 逐文件 path-limited add；`run-gates3.sh` 严格串行；日志全量落盘 | ✅ |

### 14.8 未完成 / 人工面（如实登记）

| # | 项 | 状态 | 说明 |
|:-:|----|:--:|------|
| 1 | **真实第三方站点复测**（作者真机：在 deepseek 页重新拾取 → 引用应有效且声明不变期间保持有效） | ⏳ **未执行** | headless 夹具只能证明「无声明站点 + 稳定选择器」的判定链与摄取闭合；真机观感/真实 SPA 仍需作者复测（本轮**不冒充 PASS**） |
| 2 | 拾取观感 / 拖动体感 / 菜单观感 / 宿主真实兼容 / 多显示器 / 高 DPI（6 项人工面） | ⏳ 未执行 | 与 §8 / §13.8 一致 |
| 3 | `pick-menu.ts#restoreFocus`（F6，需 `pick-layer.js` 重登记裁决） | ⛔ 仍 deferred | 与 §13.8 一致，本轮未动该产物 |
| 4 | busy 残留的**真实**复现（后台提问被拾取取代） | ⏳ 未实跑端到端 | 根因与修法在代码层明确（§14.5），并有纯判据可 FAIL 断言；端到端需要「mock LLM 主动提问 + 拾取」的夹具，本轮未新增该夹具（如实登记） |

## 15. 收口后缺陷修复轮 R2（2026-09-17，作者裁决「修：退避 + 稳态显示」）

> **来源**：作者真机反馈（HEAD `6d9ed5d`，`https://platform.deepseek.com/usage`）：
> 「deepseek 站点声明**永远无效**（返回 HTML）⇒ SW 每 15 秒软重试一轮 ⇒ 风险位每 15 秒在
> 「探测中」↔「站点声明存在但无效」之间**闪烁**，视觉上像卡死」。
> **编排器裁决**（2026-09-17，作者选定方案）：「**修：退避 + 稳态显示**」——
> ① 指数退避 `15s → 30s → 60s → 120s → 封顶 300s`（**按 origin 独立计数**）；
> ② 退避等待期风险位显示**稳态文案**（「低频自动复查中」），只有真正发起 fetch 的短暂窗口才显示「探测中」；
> ③ 「页面导航 / 刷新」「标签页切换」「可见性变化」仍**立即重试并重置退避**（恢复能力不打折）；
> ④ 用户可见文案由「每 15 秒低频软重试」改为真实退避描述。
> **轮次性质**：同一 Feature 内的**缺陷修复轮** ⇒ `roundKind: 'registry-fidelity-round'`（④ 的「连续两个功能轮」口径不变）。

### 15.1 根因（精确到行）

| 步 | 文件:行（R2 前） | 事实 |
|:--:|------------------|------|
| ① | `src/discovery/auto-probe.ts:229-232`（重试循环唯一落点） | `timer = deps.setTimer(() => { timer = null; void run(); }, nextDelayMs)` —— **唯一**的「何时再查」实现 |
| ② | `src/discovery/auto-probe.ts:225-226` | `retries += 1; nextDelayMs = delayForRetry(retries)`；`delayForRetry` 在 `BACKOFF_MS=[500,1000,2000,4000,8000]` 之后**饱和于 15000 恒定**（`BACKOFF_CAP_MS`）⇒ 终态（声明 invalid）**永远**每 15 s 一次 |
| ③ | `src/discovery/auto-probe.ts:174-176` | `phase = 'probing'; report()` —— 每次 fetch 都广播一次 `probing`；`waiting` 期广播 `waiting` |
| ④ | `src/background/service-worker.ts:770`（`onStatus`） | `probe-changed` → 面板 `refreshState()`（`sidepanel.ts:1864-1868`）⇒ 风险位每 15 s 重绘一次 |
| ⑤ | `src/ui/sidepanel/sidepanel.ts:411`（R2 前为 408） | `probing: state.probe?.phase === 'probing' && state.discoveryState !== 'supported'` ⇒ 只有在 fetch **在飞**时风险行存在；退避等待期该行**消失** |
| ⑥ | `src/ui/sidepanel/l0/risk-rail.ts:44` | 风险行文案唯一来源 `RISK_COPY.probing.text`（「探测中：正在读取站点声明（web-cli/x.y）…」） |
| ⑦ | `src/ui/sidepanel/view-model.ts:95`（R2 前） | `AUTO_RETRY_LINE` = 「…否则**每 15 秒低频软重试**…」—— 与 ② 的恒定 15 s 一致，但正是闪烁源与「永久无意义重试」的用户可见表述 |

**综合症状**：③⑤⑥ 让风险行在每轮 fetch 时**出现**、等待期**消失**（0.5 s 出现 / 15 s 消失的闪烁），⑦ 把该行为写成文案；② 让永不声明的站点被**永久**重试。

### 15.2 修法（diff 摘要）

| 层 | 文件 | 改动 |
|----|------|------|
| 退避表 | `src/discovery/auto-probe.ts` | 新增 `DECLARATION_BACKOFF_MS = [15000, 30000, 60000, 120000, 300000]` + `DECLARATION_BACKOFF_CAP_MS = 300000` + `declarationDelayForAttempt(attemptNo)`（`min(attemptNo, 5)` 索引，封顶 300 s）。**瞬态失败仍走旧的快速表**（`500ms→8s→15s`，`delayForRetry` 一字未动）—— 页面还在加载的站点不该等 15 s 才重试 |
| 按 origin 计数 | 同上 | `declarationAttempts: Map<origin, number>` + `declarationKinds: Map<origin, string>`；`bumpDeclarationAttempt(origin, terminalKey(outcome))` 只在「**同 origin 且同一终态结论**」时递增，**结论变化 ⇒ 重置为 1**；`clearDeclarationAttempt(origin)` 在 supported / blocked / 瞬态 / `kick` / `note` / `resetTarget` / `stop` 调用 |
| 稳态广播 | 同上 | `AutoProbeStatus` 新增 `declarationAttempt: number` 与 `steady: boolean`；`steady = (phase === 'waiting' && lastClass === 'terminal')` —— **只有真正发起 fetch 才进入 `probing`**；退避等待期广播的是 `waiting + steady:true`（等价于裁决要求的「稳态标记」） |
| 重置三触发器 | 同上 | `kick(origin, tabId)` = 导航/刷新/切标签页/内容脚本 hello/授权/面板(重)开 的统一入口：`retries = 0` + `clearDeclarationAttempt(origin)` + 立即 `run()`；结论变化由 `bumpDeclarationAttempt` 的 key 判定；结论变好由 `supported` 分支清理 |
| 面板（稳态显示） | `src/ui/sidepanel/view-model.ts` | 新增 `PROBING_STEADY_BADGE='低频复查'` / `probingSteadyText(kind)` / `probingSteadyView(probe)`（纯函数，`steady !== true` ⇒ `null`）；`L0Input.probeSteady` / `L0View.probeSteady` 新契约；`deriveRiskClasses` 在 `probing === true \|\| probeSteady` 时都激活 `probing` 类（五类不折叠）；`AUTO_RETRY_LINE` 改为「…否则按 **15 秒→5 分钟退避自动复查**…」 |
| 风险位渲染 | `src/ui/sidepanel/l0/risk-rail.ts` | `renderRiskRail(doc, active, staleRef?, probeSteady?)`：稳态行**复用既有 override 通道**（数据、非第二模板），仍是 `data-risk-class="probing"`、仍走 `renderRiskRow` 三通道、override 文本参与重绘签名；**缺省回落静态「探测中」文案** |
| 接线 | `src/ui/sidepanel/l0/shell.ts` / `sidepanel.ts` | override 透传；`l0Input()` 在 `state.probe.steady === true && discoveryState !== 'supported'` 时注入稳态行 |
| 拾取可用性 | `src/ui/sidepanel/view-model.ts` | **不变**：只有真正 fetch 在飞（`probing`）才 `pickDisabled`；退避等待期（`probeSteady`）**不**禁用拾取 —— 引用/拾取不受声明探测影响 |
| SW 触发 | `src/background/service-worker.ts` | 新增 `kickBoundProbe(s)`（`setFocused(true)` + `kick`），面板端口 **onConnect** 用它替原 `focusBoundProbe`（面板打开 = 新鲜信号）；`state` 回复路径**仍用** `ensure`（否则每次重绘都重置退避 ⇒ 空转） |

**可见性信号的实测回退（如实登记）**：初版还在面板 `visibilitychange→visible` 时通过面板端口发 `{kind:'panel-visible'}`。
`test:binding` **实测抓出真实回归**（非测试放宽）：面板驱动的后台刷新会重读 `state`，而 SW 的 `state` 回复会**消费一次性 `panelNotice`**
⇒ 该信号会把「已切换标签页…」提示在用户看到之前吞掉（`#9b` FAIL，191/1）。处置 = **移除该信号与 SW 侧 `port.onMessage` 处理**，
恢复能力由既有 `kick` 触发器承担：标签页激活/导航（`followActiveTab → kickDiscovery → kick`）与面板(重)开（`onConnect → kickBoundProbe`）。
证据：① 失败现场 = `RP-R2-D-binding-diagnostics-1789665266781.json`（`passes: 191 / failures: ["#9b 侧栏可读提示「已切换标签页，请点插件图标」"]`）；
② 移除后 `test:binding` **`binding PASS — 192 assertions`（EXIT=0）** = 最终串行运行的 `15-binding.log`（同一断言 `#9b` 在该日志中为 ✔）。
该结论也已写入代码注释（`sidepanel.ts:2005-2015`）。

### 15.3 反证（全部可 FAIL；扰动 → FAIL → sha256 还原 → PASS）

| # | 反证 | 扰动（合法语法） | 期望 | 实测 |
|:-:|------|------------------|------|------|
| A | **退避回退为恒 15 s** | `auto-probe.ts` 终态分支改 `nextDelayMs = DECLARATION_BACKOFF_MS[0]`（恒 15 s，即 R2 前的行为） | 新断言必须 FAIL | ✅ `EXIT=1`，`ℹ tests 815 / pass 811 / fail 4`；失败原文：`15s→30s→60s→120s→5min 封顶`（actual `[15000,15000,…]`）、`退避等待期必须带稳态标记（面板据此渲染稳态文案）`、`退避重置回第一步`（`15000 !== 120000`）、`结论变化 ⇒ attempt 重置`（`15000 !== 60000`）；还原后 sha256 == `74a6a52f…` PASS |
| B | **稳态标记回退**（退避期不再广播 `steady`） | `auto-probe.ts#snapshot()` 改 `steady: false` | 新断言必须 FAIL | ✅ `EXIT=1`，`ℹ tests 815 / pass 814 / fail 1`；失败原文：`退避等待期必须带稳态标记（面板据此渲染稳态文案）` / `false !== true`；还原后 sha256 == `74a6a52f…` PASS |
| C | **稳态行回退**（面板不再渲染稳态文案） | `view-model.ts#probingSteadyView` 判定反置（`probe.steady === true ⇒ null`） | 新断言必须 FAIL | ✅ `EXIT=1`，`ℹ tests 815 / pass 813 / fail 2`；失败原文：`terminal 退避等待期必须给出稳态行`、`L0View 必须把稳态行交给风险位渲染器`；还原后 sha256 == `2d80dc19…` PASS |
| D | **（门禁反证，实测有价值）** 可见性信号回归 | 保留 `panel-visible` 信号 | 既有门禁必须抓出 | ✅ `test:binding` `EXIT=1`，`191 passed / 1 failed`（`#9b 侧栏可读提示「已切换标签页，请点插件图标」），现场 `RP-R2-D-binding-diagnostics-1789665266781.json`；处置见 §15.2（移除后 `15-binding.log` `binding PASS — 192 assertions`） |

> **「因错而红」防呆**：反证 C 的首版扰动写成 `return null;` 尾巴 ⇒ `tsc` 报 `TS18049: 'probe' is possibly 'null' or 'undefined'`，
> 构建期即失败（`EXIT=2`）—— 按仓库纪律**判为无效并作废**，改用「判定反置」形态重跑（无效证据 `RP-R2-C-INVALID-builderror.log` 逐字留档）。

### 15.4 门禁（严格串行，18 步全绿；计数只增不减）

| 门禁 | 实测 | 基线（R1 后） |
|------|:--:|:--:|
| `01 typecheck` / `02 build` | `0 error` / `EXIT=0` | — |
| `03 npm test`（插件单测） | **`ℹ tests 815 / pass 815 / fail 0`** | 803 → **815**（+12：退避/稳态/重置三触发器/按 origin 独立计数 7 + 稳态文案与风险类接线 4 + 重绘签名 1） |
| `04 test:supersession` | **14 / 0** | 14 |
| `05 test:density` | **127 / 0**（22 登记格**逐项相等**） | 127 |
| `06/07/08 l0 / l1 / l2` | **164 / 103 / 71**，0 failed | 同 |
| `09/10 l1-reverse / l2-reverse` | **9 条 / 10 条**（注入→FAIL→sha256 复原→PASS） | 同 |
| `11 page-input` | **93 / 0** | 93 |
| `12 zero-injection` | **27 / 0** | 27 |
| `13/14/15/16 journey / insight / binding / hardening` | **167 / 116 / 192 / 24** | 同 |
| `17 e2e` | **R8 E2E PASS**（real dist full chain） | PASS |
| `18 gate-integrity` | **12 / 12** | 12 |
| 体积四线 | `content.js 177,076`（sha `52a82620…` **不变**）· `pick-layer.js 33,900`（sha `5f567d7e…` **不变**）· `sidepanel.js 368,529` ≤ ceiling **386,955** · `+1 B` 反证在新 ceiling 上重跑（`npm test` 内） | — |

日志全量落盘：`/tmp/opencode/v3-gate-logs/defect-r2-probe-backoff/`（`01-*` … `18-*`、`SERIAL.txt`、`RP-R2-A/B/C*`、`REDLINES-BEFORE/AFTER.txt`）。

**如实登记的环境性 flaky（1 次）**：文档/台账写入后复核 `npm test` 时，`perf-budget.test.ts` 的
`NFR-007: sequential authorized read dispatches stay within the per-call budget` 实测
`50 dispatches took 251ms (> 250ms budget)` ⇒ `EXIT=1 / fail 1`（`03b-npmtest-after-docs.log`）；
**单独复跑同一命令 ⇒ `815/815 pass`、`201.2ms`（`03c-npmtest-rerun.log`）**。该断言是**时间预算类**判据
（250 ms / 50 dispatch），与本轮改动无因果关系（本轮未触碰该路径），且首次 18 步串行运行时该项为绿 ——
按仓库纪律**如实登记为环境性抖动**，不改阈值、不删断言。

### 15.5 密度影响：**零漂移**（无须重登记）

裁决预判「稳态文案若进入被测格会触发 density 漂移」。实测**不漂移**，原因是两条口径边界：

- **风险位强制格（risk 子场景 `probing`）**用 `window.__v3.testing.setRisk('probing','force')` 驱动，**没有** `probeSteady` override
  ⇒ 渲染的仍是静态 `RISK_COPY.probing.text`（fetch 文案，本轮逐字未改）。这也正是 `renderRiskRail` 把稳态行做成 **override（缺省回落）** 的原因。
- **`#discovery-notice`** 承载 `AUTO_RETRY_LINE` 的新文案，但三档夹具的 `discoveryState` 均为 `supported` ⇒ 该节点 `hidden=true`，不进 C2/C3 计数。

`test:density` 阶段 F 机器比对结论：**`F 22 个登记格实测 == 基线登记值（漂移即 FAIL）` PASS**、`F 阈值同源` PASS、`F 产物字节 == 体积登记值` PASS。
⇒ **本轮密度对照表为空**（无格变更、无阈值改动；`7/15 · 9/20 · 17/35` 逐字未动）。

### 15.6 体积与重登记（五要素披露）

| 项 | 值 |
|----|----|
| 前值 → 后值 | `366,755 → 368,529 B`（**+1,774 B / +0.48%**） |
| 逐模块归因（真实 metafile `bytesInOutput`，Σ == 总增幅） | `view-model.ts +1,006` · `sidepanel.ts +388` · `l0/risk-rail.ts +352` · `l0/shell.ts +28`；退避调度器在 `src/discovery/auto-probe.ts` ⇒ **service-worker bundle**，不进本产物 |
| ceiling | 公式抬高 `floor(368,529 × 1.05) = 386,955 B`（容差 5% 未动、cap 仍 `record-only`、`previousCeilingBytes = 385,092`） |
| 累计口径 | `SIDEPANEL_GROWTH_BREAKDOWN.deltaBytes = 73,304`（368,529 − 295,225）；新必需 53,185 + 接线 19,398 + 位移 265 + 未归因胶水 456 = 73,304（必需占比 99.02%） |
| Feature 累计 | 从 266,500 B 起算 **+38.28%**（< 40% 停工线；最差相邻两功能轮 +22.96% 的告警仍在） |
| 零改动 | `content.js` 177,076（sha 不变）· `pick-layer.js` 33,900（sha 不变）· 三冻结源 hash == pin · 判定链 pin 零改动 |
| 登记落点 | `test/size-baseline.ts`（`SIDEPANEL_RE_REGISTRATIONS['v3-4-r2']` / `SIDEPANEL_GROWTH_BREAKDOWN` / TIMELINE 末项）· `test/size-budget.test.ts`（数值重 pin）· `test/size-growth-evidence.test.ts`（`deltaBytes`）· `docs/v3-density-baseline.json#volume` · `docs/v3-supersession-ledger.json`（`V34R2-S1~S8` + 两种口径读数 `962/826/815` 与 `currentRuntime 815` + `featureHistory['v3-4-r2']`） |

### 15.7 零改动核对（红线）

| 红线 | 实测 | 结论 |
|------|------|:--:|
| `dist/content.js` 逐字节不变 | `177,076` · sha `52a826205553b46a896ccad54225d63ba62f5f7fe7c969a9bc2e655448d5b5f6` | ✅ |
| `dist/pick-layer.js` 逐字节不变 | `33,900` · sha `5f567d7ededc58183afe4ce45e3293b68204dfbe788dc6b9fb09bdc6e0d13e59` | ✅ |
| `src/content/**` 零改动 | 三冻结源 sha == `CONTENT_SOURCE_SHA256`（`a7290031…` / `7df782b3…` / `5737c40a…`）；`git diff --stat HEAD -- src/content` 空 | ✅ |
| 判定链 pin（`policy.ts` / `auto-authorize.ts`） | `bfcb2ede…` / `1096d065…`；`git diff --stat HEAD -- src/security` 空 | ✅ |
| `manifest.json` / `index.html` / `package.json` | 零 diff；`manifest` 零新增权限（零注入门禁 27/0） | ✅ |
| 密度阈值 `7/15 · 9/20 · 17/35` | 未动（`test:density` 127/0，阶段 F 阈值同源 PASS） | ✅ |
| 风险位五类不折叠 / 未授权零注入 | `test:l0` 164/0（`probing` 类在退避期**仍常驻**）· `test:zero-injection` 27/0 | ✅ |
| 测试只增不减、断言只强不弱 | `803 → 815`；既有断言零删除（台账 `V34R2-S1~S8` 登记 2 处取代 + 1 处纯新增） | ✅ |
| 不用 `git add -A` / 门禁串行 / 日志全量落盘 | 逐文件 path-limited add；`run-gates-r2.sh` 严格串行；日志全量落盘 | ✅ |

### 15.8 未完成 / 人工面（如实登记）

| # | 项 | 状态 | 说明 |
|:-:|----|:--:|------|
| 1 | **真机观察「不再闪烁」**（作者：在 deepseek 站点观察风险位是否稳定显示稳态文案、且不在每 15 s 闪一次） | ⏳ **未执行** | headless 夹具能证明退避序列 / 稳态标记 / 三触发器 / 文案与风险位接线**全部**为真，但「视觉上不再闪烁」的观感只能在真机确认（本轮**不冒充 PASS**） |
| 2 | 真机确认「站点修好后立即恢复」（改站点声明 → 刷新/切标签页 → 应立刻进入正常态，不等 5 min） | ⏳ 未执行 | 逻辑由「`kick` 重置 + supported 分支清理」与 §15.3 反证 A 覆盖；真机端到端仍待作者复测 |
| 3 | 长退避（>2 min）在真实 SW 生命周期（MV3 可能休眠）下的行为 | ⏳ 未实测 | 退避定时器由 `deps.setTimer` 注入（现为 `setTimeout`）；MV3 SW 休眠会丢定时器，重唤醒依赖面板端口/标签事件（与既有 `ensure` 路径一致）。本轮**未**新增 alarm 保活（越界），如实登记为已知边界 |
| 4 | 拾取观感 / 拖动体感 / 菜单观感 / 宿主真实兼容 / 多显示器 / 高 DPI（6 项人工面）· `pick-menu.ts#restoreFocus`（F6）· busy 残留端到端 | ⏳ / ⛔ | 与 §8 / §13.8 / §14.8 一致，本轮未动 |

## 16. 收口后缺陷修复轮 R3（2026-09-17，作者真机确认「选择器断链、文字仍在」）

> **来源**：作者真机确认（HEAD `131f546`，deepseek SPA 页）：拾取的引用被判失效
> ——「目标元素已不存在（选择器解析失败或元素被替换）」，**但目标文字仍然可见**。
> 位置链选择器（`div._06da35f:nth-of-type(2) > div._03a4574:nth-of-type(2) > …`）在 SPA
> 重渲染 / 插入兄弟节点后**断链**（文字没变、位置索引变了）；当前 fail-closed 不做模糊重定位
> ⇒ 引用死亡，用户只能手动重新拾取（手势成本高）。
>
> **编排器裁决**（2026-09-17，修复设计，**fail-closed 不放松**）：
> **判定结论不变（选择器失败 = 失效），加的是「失效后的只读救援 + 用户显式确认的一键重锚」。
> 系统只提议，用户确认才落锚。**
> ① **文本候选定位（只读）**：SW 侧 `chrome.scripting.executeScript` 注入只读函数
> （R1 的 `observeIdentity()` 先例，**不碰冻结面**），按与摘要生成**同源**的归一化匹配；
> 0 候选 ⇒ 维持现文案；唯一候选 ⇒ 失效原因增强为「目标疑似仍在（文本唯一匹配）—— 可一键重锚」；
> 多候选 ⇒ 「多处匹配 N 处」且**不提供**一键重锚（歧义 = 不确定 = fail-closed）；救援限定**同 origin**，
> 路径变化带提示。
> ② **一键重锚（仅唯一候选）**：SW 侧只读计算**全新捕获事实**，走与手工拾取**同一摄取管线**
> （含 `withDeclaration()`）生成**新引用**（新 id、序号递增）；**旧引用零改动**（append-only）。
> ③ 多候选 / 跨路径不自动锚定；「重新拾取 / 改用描述」保持不变。
> ④ `ref-validity.ts` 的**结论枚举不扩**（仍 `valid/invalid/unknown`）—— 救援信息作为
> `dom-gone` 失效原因的 **payload 元数据**（`rescue: {candidates, unique, urlChanged}`）。
> **轮次性质**：同一 Feature 内的**缺陷修复轮** ⇒ `roundKind: 'registry-fidelity-round'`
> （④ 的「连续两个功能轮」口径不变）。

### 16.1 诊断（只读先行，file:line 原文）

| # | 关注点 | 位置（R3 前 → 现） | 事实 |
|:-:|--------|---------------------|------|
| 1 | 「目标元素不存在」判定与消息生成 | `src/ui/sidepanel/l1/ref-validity.ts:189`（`REASON_TEMPLATES['dom-gone']`）· `:282`（`reasonFor`）· `:391`（`evaluateRefValidity` 的 `res.status === 'missing'` 分支） | 判定链是**纯函数**、结论只有 `valid/invalid/unknown`；`dom-gone` 的文案逐字 pin（被测格与单测逐字符比对） |
| 2 | selector → 元素的解析链 | `src/background/service-worker.ts:1035` `observeIdentity()`（R1 只读观测）· `:2207` `ref-highlight` 的 `mark` 分支 | 选择器解析发生在**页面隔离世界**；SW 只报原始观测，不判定 |
| 3 | 文本摘要的生成 / 归一化 | `src/content/ref-capture.ts:40`（`TEXT_DIGEST_MAX=80`）· `:106` `flatten`（去空白）· `:111` `truncate`（超长补 `…`）· `:270` `textDigestFor` | 摘要 = `truncate(textContent, 80)`；页面侧**冻结**，SW 注入函数不能 `import`，故 `background/ref-rescue.ts` 内联**等价**归一化 |
| 4 | mark 写入机制 | `src/content/pick-layer.ts:103`（`if (msg.mode === 'mark' && msg.refId && msg.selector)` → `query(msg.selector)` → `markRef(marked, msg.refId)` → 角标）；`observeIdentity` 读 `data-wcli-ref` | 既有 mark 契约**按 selector 定位**（`query(msg.selector)` 用 `querySelector`），因此可复用；`pin` 的 `data-wcli-ref` 是 D1 的身份判据 |
| 5 | 摄取管线 | `src/ui/sidepanel/pick-input.ts:155` `withDeclaration()` → `:261/:305/:373` `onCapture(...)` → `src/ui/sidepanel/sidepanel.ts:1138` `acceptCapture()` → `src/ui/sidepanel/l1/ref-store.ts::create` | 三条落点（点击 / 拖放 / **R3 一键重锚**）共用同一条补全 + 铸造 + 标记回程管线 |
| 6 | 夹具 / 登记 | `test/ui/page-input.mjs`（R3 新段落，`#host-btn` 文案「宿主按钮」）· `test/size-baseline.ts`（`SIDEPANEL_BASELINE_BYTES` / `SIDEPANEL_GROWTH_BREAKDOWN`） | R3 前：单测 815 · page-input 93 · sidepanel `368,529 ≤ 386,955`（余量 18,426） |

### 16.2 修法（diff 摘要）

| 层 | 文件（**全部非冻结**） | 改动 |
|----|------------------------|------|
| 只读候选定位 | `src/background/ref-rescue.ts`（**新增**，service-worker bundle） | `rescueProbe(digest, root?, href?)`：`querySelectorAll('*')` → 与摘要**同源**归一化匹配 → 只保留**最内层**（父/子同文本去重，避免伪「多处匹配」）→ 唯一候选时用**与 `ref-capture.ts` 等价**的 `selectorFor` / `semanticPathFor` / `textDigestFor` 计算全新事实；`rescuePathOf(url)` 只取 `pathname`；`isRefRescueMessage` / `REF_RESCUE_KIND` 供 SW 入口守卫（**不**进 `content/pick-protocol.ts`，也**不**进 `KIND_SET`） |
| SW 路由 | `src/background/service-worker.ts` | 新增 `case 'ref-rescue'`：**同 origin / 已授权**双闸门 + `executeScript({func: rescueProbe})`；`REF_MARK_PATHS`（mark 时记录的捕获路径，§诊断 3）用于 `urlChanged`；`mark` 分支追加「记录捕获路径」；入口守卫加 `isRefRescueMessage` |
| kind 类型面 | `src/background/messaging.ts` | `PluginMessageKind` 增 `'ref-rescue'`（**类型面 only**；`KIND_SET` 一字未动 ⇒ `content.js` 零增长） |
| 判定链（结论枚举不扩） | `src/ui/sidepanel/l1/ref-validity.ts` | 新增 `RefRescue` + `RESCUE_REASON` + `refRescueFor()`；`RefEnv.rescue` / `RefVerdictView.rescue`（**payload 元数据**）；`dom-gone` 分支把匹配的观测挂上；`reasonFor` 按 0 / 唯一 / 多候选 / 跨路径渲染增强文案。**`RefVerdict` 三元组逐字未变；fail-closed 逐分支论证**：救援**从不**改变 `verdict`，也不参与 `isRefUsable()` 的 `valid` 判定 |
| 记录透传 | `src/ui/sidepanel/l1/ref-store.ts` | `RefRecord.rescue` + `decorate()` 从判定视图透传（仍**判定链是唯一写原因者**） |
| L1 条件按钮 | `src/ui/sidepanel/l1/panels.ts` · `src/ui/sidepanel/index.html` | `canReanchor(rescue)` 纯判据（唯一 ∧ 路径未变 ∧ 恰一条匹配）；`#l1-ref-rescue`（默认 `hidden`，`[hidden]{display:none!important}` 与 `#l1-ref-actions` 同法，**不进默认档密度**）；`setRescue()`；`report()` 暴露 `rescue` / `canAnchor` |
| 摄取 + 重锚 | `src/ui/sidepanel/pick-input.ts` | `rescue()`（只读，不摄取）/ `reanchor()`（`inject()` 保证身份标记可写 → **点击时重探**（无 TOCTOU）→ 唯一 ∧ 路径未变才 `onCapture(withDeclaration(facts), {status:'resolved',nodeCount:1})`；否则可读拒绝）；三条 `onCapture(withDeclaration(...))` 落点共用同一管线 |
| 接线 | `src/ui/sidepanel/sidepanel.ts` | `maybeRescue()`（**每个引用至多一次**只读探测；`dom-gone` 才发；`setRescue` 后 `judge()` 重判，判定链仍是唯一原因写入者）；`reanchorRef()`（未授权直接拒绝；成功后 `anchoredRefIds` 记忆 + 清 rescue 并重判）；测试 seam `l1('rescue', ...)`；`reset()` 清 rescue/记忆 |

**mark 选型论证（裁决 §2 的「诊断阶段确认 mark 的写入机制」）**：
优先复用 `pick-layer.ts` 既有 mark 消息契约 —— 其 `onHighlight` 的 `mark` 分支**按 `selector` 定位**（`query(msg.selector)`），
而 R3 的全新捕获事实**恰好就是**候选元素的（唯一）selector。因此「重锚后的身份标记」无需任何新消息、无需写属性、无需动冻结面：
面板照常发 `ref-highlight{mode:'mark', refId:新id, selector:新selector}` → 页面写 `data-wcli-ref=新id` → SW `observeIdentity()` 在**写入之后**读回 → 新引用判 `valid`。
**两种备选都未采用**（并在此论证）：① **SW 注入函数写属性** —— 会引入一次**页面写**，与「救援 = 只读探测」的边界冲突，且需要 origin 授权以外的自检；② **降级（重锚后登记为「未标记」，首次交互补标）** —— 会让重锚后的引用在首次交互前保持 `unknown`（fail-closed 但体验倒退）。
实际选型 = **复用既有 mark 契约**（零新增 write 路径、零冻结面改动、与手工拾取同一 D1 身份链）。

### 16.3 证据（门禁与实测原文）

- **单测（新增文件 `test/ref-rescue.test.ts`，11 例）**：`ℹ tests 826 / pass 826 / fail 0`（基线 815 → **826**）。
- **page-input（新增 R3 段落，9 条断言）**：`▶ v3-4 页面即输入门禁: 102 passed / 0 failed`（基线 93 → **102**）。其中：
  - `R3 前置（负控）：故障形态可构造——选择器解析失败 ⇒ 判定 invalid/dom-gone` ✔
  - `R3：只读文本候选定位给出 payload 元数据（唯一匹配 ⇒ unique）` ✔
  - `R3：失效原因增强为「目标疑似仍在（文本唯一匹配）—— 可一键重锚」` ✔
  - `R3：唯一候选时「一键重锚」按钮可见（且仅在唯一匹配时）` ✔
  - `R3：一键重锚生成**新引用**并判 valid（旧引用零改动，append-only）` ✔
  - `R3：身份标记写回页面且等于**新**引用 id（不是旧 id）` ✔
  - `R3：新引用带**全新**捕获事实（证据行里的选择器落到真实元素 #host-btn）` ✔
  - `R3 反证面：多候选 ⇒ 提示多处匹配且**不提供**一键重锚` ✔ / `R3 反证面：跨路径 ⇒ 带「页面路径已变化」提示且**不提供**一键重锚` ✔
- **同源对拍**：`rescueProbe` 对同一棵树给出的 `selector` / `semanticPath` / `textDigest` 与冻结 `ref-capture.ts#selectorFor/semanticPathFor/textDigestFor` **逐字符相等**（`test/ref-rescue.test.ts` §②）。
- **未授权 / 跨站**：`test:zero-injection` 27/0（结构面不变）；`ref-rescue` 路由的四条 `noRescue` 出口由布线级断言钉死（缺事实 / 跨站 / 未授权 / 不可达）。

### 16.4 反证（「回退 ⇒ 必须红；还原 ⇒ 必须绿」，逐条 sha256 复原）

| # | 反证 | 扰动 | 实测 FAIL 原文 | 还原 |
|:-:|------|------|----------------|------|
| A | **回退救援（候选定位短路）** | `src/background/ref-rescue.ts` 匹配条件改 `if (false && …)`（候选恒 0） | 单测 `EXIT=1`：`✖ R3 救援①：文本候选三态…`、`✖ R3 救援②同源…`（`tests 11 / pass 9 / fail 2`）；`test:page-input` `EXIT=1`，**6 条 R3 断言全红**（原文：`{"refId":"ref_6","candidates":0,"unique":false,…}`；`96 passed / 6 failed`） | `sha256sum -c` OK（源逐字节复原）→ 单测 `11/11 pass`；重建后 page-input 复绿 |
| B | **回退重锚（一键变无操作）** | `src/ui/sidepanel/pick-input.ts` 的 anchor 探测改 `false ? await probeRescue(...) : undefined` | 单测 `EXIT=1`：`✖ R3 摄取④：一键重锚走同一摄取管线…`（`tests 11 / pass 10 / fail 1`）；`test:page-input` `EXIT=1`，**3 条 R3 断言红**（`{"before":1,"after":1,"verdicts":["invalid"]}`；`99 passed / 3 failed`） | `sha256sum -c` OK（源逐字节复原）→ 单测 `11/11 pass`；重建后 page-input 复绿 |

日志：`/tmp/opencode/v3-gate-logs/defect-r3-ref-rescue/19-reverse-A-unit.log` · `20-reverse-A-page-input.log` · `21-reverse-A-restored.log` · `22-reverse-B-unit.log` · `23-reverse-B-page-input.log`。

### 16.5 门禁（**严格串行**，18 步全绿；计数只增不减）

日志全量落盘 `/tmp/opencode/v3-gate-logs/defect-r3-ref-rescue/`（`01-*` … `18-*`）。

| 门禁 | 实测 | 基线（R2 后） |
|------|:--:|:--:|
| `01 typecheck` / `02 build` | `0 error` / `EXIT=0` | — |
| `03 npm test`（插件单测） | **`ℹ tests 826 / pass 826 / fail 0 / skipped 0`** | 815 → **826**（+11：`test/ref-rescue.test.ts`） |
| `04 test:supersession` | **14 / 0** | 14 |
| `05 test:density` | **127 / 0**（22 登记格**逐项相等**；`F 产物字节 == 体积登记值` PASS） | 127 |
| `06/07/08 l0 / l1 / l2` | **164 / 103 / 71**，0 failed | 同 |
| `09/10 l1-reverse / l2-reverse` | **9 条 / 10 条**（注入→FAIL→sha256 复原→PASS） | 同 |
| `11 page-input` | **102 / 0** | 93 → **102**（+9：R3 救援/重锚/两反证面） |
| `12 zero-injection` | **27 / 0** | 27 |
| `13/14/15/16 journey / insight / binding / hardening` | **167 / 116 / 192 / 24** | 同 |
| `17 e2e` | **R8 E2E PASS**（real dist full chain） | PASS |
| `18 gate-integrity` | **12 / 12** | 12 |
| 体积四线 | `content.js 177,076`（sha `52a82620…` **不变**）· `pick-layer.js 33,900`（sha `5f567d7e…` **不变**）· `sidepanel.js 375,102 ≤ 393,857` · `+1 B` 反证在新 ceiling 上重跑（`npm test` 内） | — |

### 16.6 密度影响：**零漂移**（无须重登记密度表）

- `#l1-ref-rescue` 默认 `hidden`（`[hidden]{display:none!important}`），且位于 L1 引用证据层（`#l1-ref`，默认折叠）
  ⇒ 不进默认档可点/行数计数；`staleRef` 风险档夹具的 `textDigest='引用目标文本摘要'` 在夹具页面上**不存在** ⇒ 只读探测恒返回 0 候选 ⇒ 原因文案不变、按钮不显示。
- `test:density` 阶段 F：`F 22 个登记格实测 == 基线登记值（漂移即 FAIL）` PASS、`F 阈值同源` PASS、`F 产物字节 == 体积登记值` PASS。
- ⇒ 阈值 `7/15 · 9/20 · 17/35` **逐字未动**；**本轮密度对照表为空**。

### 16.7 体积与重登记（五要素披露）

| 项 | 值 |
|----|----|
| 前值 → 后值 | `368,529 → 375,102 B`（**+6,573 B / +1.78%**） |
| 逐模块归因（真实 metafile `bytesInOutput`，Σ == 总增幅） | `pick-input.ts +2,450` · `sidepanel.ts +1,800` · `l1/ref-validity.ts +1,057` · `l1/panels.ts +1,044` · `l1/ref-store.ts +222`；只读探测模块 `src/background/ref-rescue.ts` ⇒ **service-worker bundle**，不进本产物 |
| ceiling | 公式抬高 `floor(375,102 × 1.05) = 393,857 B`（容差 5% 未动、cap 仍 `record-only`、`previousCeilingBytes = 386,955`） |
| 累计口径 | `SIDEPANEL_GROWTH_BREAKDOWN.deltaBytes = 79,877`（375,102 − 295,225）；新必需 57,958 + 接线 21,198 + 位移 265 + 未归因胶水 456 = 79,877（必需占比 99.07%） |
| Feature 累计 | 从 266,500 B 起算 **+40.75%** —— **R3 后越过已登记的 40% 停工线**，已在回报中**显式列出并如实上报**（未放宽任何口径） |
| 零改动 | `content.js` 177,076（sha 不变）· `pick-layer.js` 33,900（sha 不变）· 三冻结源 hash == pin · 判定链 pin 零改动 |
| 登记落点 | `test/size-baseline.ts`（`SIDEPANEL_RE_REGISTRATIONS['v3-4-r3']` / `SIDEPANEL_GROWTH_BREAKDOWN` / `r3RoundRows` / TIMELINE 末项）· `test/size-budget.test.ts`（数值重 pin）· `test/size-growth-evidence.test.ts`（`deltaBytes`）· `docs/v3-density-baseline.json#volume` · `docs/v3-supersession-ledger.json`（`V34DR3-S1~S9` + `V34DR3-N1` + 两口径读数 `974/837/826` 与 `currentRuntime 826`） |

### 16.8 零改动核对（红线）

| 红线 | 实测 | 结论 |
|------|------|:--:|
| `dist/content.js` 逐字节不变 | `177,076` · sha `52a826205553b46a896ccad54225d63ba62f5f7fe7c969a9bc2e655448d5b5f6` | ✅ |
| `dist/pick-layer.js` 逐字节不变 | `33,900` · sha `5f567d7ededc58183afe4ce45e3293b68204dfbe788dc6b9fb09bdc6e0d13e59` | ✅ |
| `src/content/**` 零改动 | 三冻结源 sha == `CONTENT_SOURCE_SHA256`（`a7290031…` / `7df782b3…` / `5737c40a…`）；`git status` 无 `src/content/**` 改动 | ✅ |
| 判定链 pin（`policy.ts` / `auto-authorize.ts`）+ `ref-validity` 结论枚举 | `bfcb2ede…` / `1096d065…`；`RefVerdict` 仍 `valid\|invalid\|unknown`，救援为 payload 元数据 | ✅ |
| `manifest.json` 零新增权限 | 零 diff；`test:zero-injection` 27/0 | ✅ |
| 密度阈值 `7/15 · 9/20 · 17/35` | 未动（`test:density` 127/0） | ✅ |
| 风险位五类不折叠 / 未授权零注入 | `test:l0` 164/0 · `test:zero-injection` 27/0；`ref-rescue` 对未授权 origin `noRescue` | ✅ |
| 测试只增不减、断言只强不弱 | 单测 815 → **826**；page-input 93 → **102**；既有断言零删除（台账 `V34DR3-S1~S9` 登记取代 + `V34DR3-N1` 纯新增） | ✅ |
| 不用 `git add -A` / 门禁串行 / 日志全量落盘 | 逐文件 path-limited add；严格串行；日志全量落盘 | ✅ |

### 16.9 未完成 / 人工面（如实登记）

| # | 项 | 状态 | 说明 |
|:-:|----|:--:|------|
| 1 | **真机验证**：deepseek 页让文字可见但选择器断链的场景 → 一键重锚成功 | ⏳ **未执行（人工面）** | headless 夹具能证明**只读探测 / payload / 唯一候选按钮 / 重锚新引用 + 新标记 + 旧引用零改动 / 多候选与跨路径不提供**全部为真；真机端到端仍待作者复测（本轮**不冒充 PASS**） |
| 2 | 「页面路径已变化」提示的真机观感 | ⏳ 未执行 | 逻辑由 `REF_MARK_PATHS`（mark 时记录捕获路径）+ `rescuePathOf` 覆盖，并由单测/布线断言钉死；SW 重启会丢提示（**已知边界**：只丢提示、不丢救援） |
| 3 | `REF_MARK_PATHS` 的上限 200 条与 MV3 SW 生命周期 | ⏳ 未实测 | 纯记录性提示缓存，越界只影响提示；如实登记 |
| 4 | 拾取观感 / 拖动体感 / 菜单观感 / 宿主真实兼容 / 多显示器 / 高 DPI（6 项人工面）· `pick-menu.ts#restoreFocus`（F6） | ⏳ / ⛔ | 与 §8 / §13.8 / §14.8 / §15.8 一致，本轮未动 |

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.6 | **收口后缺陷修复轮 R3（作者真机确认，2026-09-17）**：SPA 重渲染后位置链选择器断链、文字仍在 ⇒ 引用被判 `dom-gone` 死亡、只能手动重拾。修法（**fail-closed 不放松，结论枚举不扩**）：SW 侧**只读**文本候选定位（`background/ref-rescue.ts#rescueProbe`，与摘要生成**同源**归一化；**不碰冻结面**，kind 走 background-only 校验器）→ 救援信息只作 `dom-gone` 失效原因的 **payload 元数据** `rescue:{candidates,unique,urlChanged}`（0 候选维持原文案）→ **一键重锚仅唯一候选 ∧ 路径未变**（用户显式确认；SW 只读计算全新捕获事实 → 经与手工拾取**同一条**摄取管线 `withDeclaration()` 生成**新引用** + 复用既有 mark 契约写身份标记；**旧引用零改动**）→ 多候选/跨路径**不提供**自动锚定、救援限**同 origin 且已授权**。反证 A（回退救援 ⇒ 单测 2 红 + page-input 6 红）/ B（回退重锚 ⇒ 单测 1 红 + page-input 3 红），均 sha256 逐字节还原 → PASS。门禁 18 步严格串行全绿（单测 **826** · supersession 14 · density **127（22 格零漂移、阈值未动）** · l0/l1/l2 164/103/71 · l1/l2-reverse 9/10 · page-input **102** · zero-injection 27 · journey/insight/binding/hardening 167/116/192/24 · e2e PASS · gate-integrity 12）；`sidepanel.js` 显式重登记 **368,529 → 375,102 B**（+6,573 / +1.78%，逐模块可归因；ceiling → **393,857**；容差 5% 未动、cap 仍 record-only）；Feature 累计 **+40.75%**，**越过已登记的 40% 停工线**（**已如实上报**，未放宽任何口径）；`content.js` 177,076 与 `pick-layer.js` 33,900 **逐字节不变**（sha 复核）；测试只增不减（815 → 826 / 93 → 102）。 | 2026-09-17 | SDDU Build Agent |
| v1.5 | **收口后缺陷修复轮 R2（作者裁决「修：退避 + 稳态显示」，2026-09-17）**：终态（声明 invalid / absent / version-mismatch）探测改走**独立指数退避** `15s→30s→60s→120s→300s（封顶）`（**按 origin + 按结论**计数，结论变化即重置；瞬态失败保持既有的 `500ms→15s` 快速表不改）；退避等待期广播 `steady:true` 稳态标记，面板风险位显示「（低频自动复查中）…」**稳态行**，只有真正 fetch 才显示「探测中」（消除每 15 s 闪烁）；`kick`（导航/刷新/切标签页/hello/授权/面板重开）仍**立即重试 + 重置退避**；用户可见文案改为真实退避描述。**实测回退**：初版的「面板可见性 → `panel-visible`」信号被 `test:binding` 抓出真实回归（面板刷新重读 `state` 会吞掉一次性 `panelNotice`）⇒ 移除该信号，恢复能力由既有 `kick` 触发（§15.2）。反证 A/B/C 三段（退避回退 / 稳态标记回退 / 稳态行回退，全部 `EXIT=1` + 命中预期文本 + sha256 逐字节还原 + PASS）+ 门禁反证 D（binding `#9b`）；「因错而红」防呆：反证 C 首版扰动为 TS 编译错 ⇒ 作废重跑。门禁 18 步严格串行全绿（单测 **815** · supersession 14 · density **127（22 登记格零漂移）** · l0/l1/l2 164/103/71 · l1/l2-reverse 9/10 · page-input 93 · zero-injection 27 · journey/insight/binding/hardening 167/116/192/24 · e2e PASS · gate-integrity 12）；`sidepanel.js` 显式重登记 **366,755 → 368,529 B**（+1,774 / +0.48%，逐模块可归因；ceiling → **386,955**；容差 5% 未动、cap 仍 record-only）；`content.js` 177,076 与 `pick-layer.js` 33,900 **逐字节不变**（sha 复核）；测试只增不减（803 → 815）。 | 2026-09-17 | SDDU Build Agent |
| v1.4 | **收口后缺陷修复轮 R1（作者真机反馈，2026-09-17）**：修「普通站点拾取的引用出生即死」**两个缺口** —— ① D4 口径由「必须有 `declarationHash`」改为「**捕获时声明状态 vs 当刻状态一致**」（SW `declarationEnv` 新增 `declarationStatus` 单一事实源 + 面板摄取 `withDeclaration()` 补全捕获事实；任何状态变化 ⇒ 失效并要求重拾；旧记录逐分支维持原判；fail-closed 逐分支论证见 v3-2 build.md §12.3）；② **D1 身份观测晚于身份标记**（标记由面板铸造 id 后才写回页面 ⇒ 新拾取的引用被判「已被同类新元素替换」）：`ref-highlight` 的 `mark` 分支由 SW 在写标记**之后**重读一次身份观测（`observeIdentity()`，只读 DOM）并交回面板重判（面板**不自证** `resolved`）。另修次要现象 busy 残留（引用回合取代后台提问 ⇒ 该提问只能等 60 s 超时，期间发送键显示「上一条指令仍在处理中」）：`supersededAsk()` + 结算为 canceled（≤10 行 + 可 FAIL 断言）。反证三条：①a 回退摄取补全 ⇒ `page-input` 失败原因**逐字等于作者原文**（`缺失 declarationHash`）· ①b 回退新观测回写 ⇒ 失败原因为「身份标记不匹配」· ② 状态变更 ⇒ invalid + 提示重拾 · ③ 旧数据（无 hash 无 status）⇒ 仍失效；**「因错而红」防呆**：①a 的首版扰动造成语法错误（构建失败）⇒ 判为无效并作废，改用恒等函数形态重跑（证据逐字留档）。门禁 21 项串行全绿（单测 **803** · density 127 · l0 164 · l1 103 · l2 71 · page-input **93（连跑 5/5）** · zero-injection 27 · journey 167 · insight 116 · binding 192 · hardening 24 · e2e PASS · gate-integrity 12 · l1/l2-reverse 9/10）；`sidepanel.js` 显式重登记 **362,777 → 366,755 B**（+3,978 / +1.10%，逐模块可归因；ceiling → **385,092**；容差 5% 未动、cap 仍 record-only）；`content.js` 177,076 与 `pick-layer.js` 33,900 **逐字节不变**（sha 复核）；测试只增不减（796 → 803）。 | 2026-09-17 | SDDU Build Agent |
| v1.3 | **收口轮（validate R1 的 F1~F7）**：**F4（最高优先）实现生产可达** —— `revoke` **先** `denotifyPickLayer`（逐 tab 广播 `pick-layer-env{authorized:false}`）**再** `teardownPickLayer`，且 `pick-layer-inject` 在 `executeScript` 后**重算** env 再下发（在途 inject 不得复活已撤销授权）；改动只在 `src/background/**`，三受 pin 产物逐字节不变。**F3 去 flaky**：I-01②/I-01③ 载体换成同 origin 的非 bound/active tab + 静止前置（饱和退避 ≥15s 或终态、连续两次读数），**连跑 5 次 5/5 绿**（92/0），断言零减弱。**F1 登记保真**：逐文件归因三处落点按实测订正 `661/389/376/83` + 新增「四项之和 == 总增幅（Σ == +1,509）」机器断言（两段反证：`+661→+615` ⇒ FAIL；台账 `totalBytes 1509→1508` ⇒ FAIL）。**F2**：`+10.25%/+22.95% → +10.44%/+22.96%`（含台账 5 条 reason），历史值逐字保留。**F5**：`pickLayerTarget` 同 origin 时 active 优先 + 确定性断言。**F7**：in-gate 清单文案订正（`4→9` 实为 `8→13`；本轮 `13→17`）。**F6 deferred**（修法落在钉死的 `pick-layer.js` 上，需新的显式重登记裁决）。门禁 21 项严格串行全绿（`binding` 首跑环境性红 ⇒ 复跑 192 全绿，已如实登记）；计数只增不减（node 795→796 / page-input 78→92）。 | 2026-09-17 | SDDU Build Agent |
| v1.2 | **修复轮 R2（裁决 V3-VOL-2）**：`pick-layer.js` **显式重登记 32,391 → 33,900 B**（+1,509 / +4.66%，逐文件实测 +661/+389/+376/+83；五要素披露 + 新增 `PICK_LAYER_BASELINE_BYTES_HISTORY`/`PICK_LAYER_RE_REGISTRATIONS` 机器断言；`+1 B` @ 33,901 反证实跑 FAIL、还原后 sha256 一致 PASS；`content.js` 177,076 与 `sidepanel.js` 362,777 零改动）；落地 5 项 deferred（I-02 复活 host / I-03 焦点还原 / I-01② 授权自检 + `envReady()` / I-01③ `pushState('gone')` / I-10 死判据 + 定时器跟踪）；`page-input` 61 → **78** 断言；**两段证伪**：回退 `71 passed / 7 failed` EXIT=1 → 修复 `78 passed / 0 failed` EXIT=0；台账 `V34R2-S1/S2/S3` + `featureHistory.v3-4-fix2` + 5 条 in-gate 反证登记；门禁 21 项严格串行全绿（计数只增不减）。 | 2026-09-17 | SDDU Build Agent |
| v1.1 | **修复轮（review R1 后）**：BLOCK-1 一行修复（`tabOrigin(url)`）+ 5 条可 FAIL 回归断言 + 两段证伪（回退 57/4 EXIT=1 → 修复 61/0 EXIT=0）；BLOCK-2 登记数字一次性对齐（`362,777 / 380,915 / +12,852 / +3.67% / +36.13% / 22.96% / 5,085 / 67,552`）+ `ceilingUncappedFormulaBytes` 机器断言 + 中间快照移出 TIMELINE（保留在 `INTERMEDIATE_SNAPSHOTS`）+ `V34-S3/S3b/S3c/S3d`/`V34F-S1` 补登；I-01①/I-04/I-05/I-06/I-07/I-08/I-09/I-11 已修，**I-01②③/I-02/I-03/I-10 deferred**（`pick-layer.js` 32,391 零容差，实测需 +1,509 B ⇒ 停下回报，未擅自抬高上限）；§2.2 两条 MODIFY 失真订正（实际零 diff）+ 文件计数口径改为文件数（18）。门禁 21 项严格串行全绿（含计数只增不减）。 | 2026-09-17 | SDDU Build Agent |
| v1.0 | 初始创建：15/15 任务完成；TASK-401 spike S1~S4 全过（未走 D1/D2）；门禁 21 项严格串行全绿（node 795 / density 127 / l0 164 / l1 103 / l2 71 / journey 167 / insight 116 / binding 192 / hardening 24 / e2e PASS / 新门禁 20 + 46）；体积四线 + 反证三段；`sidepanel.js` 显式重登记（349,925 → 362,777，+3.67%）与 Feature 累计 +36.13% 已披露；AC-CONV-1/2 兑现并各有可 FAIL 判据；人工面 6 项如实登记「未执行」。 | 2026-09-16 | SDDU Build Agent |
