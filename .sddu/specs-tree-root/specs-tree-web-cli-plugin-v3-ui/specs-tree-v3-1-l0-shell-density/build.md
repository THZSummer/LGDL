# 构建报告：specs-tree-v3-1-l0-shell-density

> **文档定位**: SDDU 构建报告 — 记录全部任务的文件变更和实现结果，作为 review 阶段的输入
> **前置依赖**: `tasks.md`（15 任务 / 7 波）、`plan.md`（ADR-V3-013~019）、`spec.md`（叶子切片）+ 父 `spec.md` / `plan.md`
> **创建人**: SDDU Build Agent
> **创建时间**: 2026-09-16
> **版本**: v1.0
> **更新人**: SDDU Build Agent
> **更新时间**: 2026-09-16
> **更新说明**: 初始创建（V3-1 全量实施 + 全门禁绿 + 6 条反证实跑 + 首轮真实产物密度基线 + 取代台账）

## 1. 构建概要

| 维度 | 数值 |
|------|:--:|
| 完成任务数 | **15 / 15** |
| 复杂度分布 | S×5（101/104/112/114/115）/ M×8（102/103/105/107/108/110/111/113）/ L×2（106/109） |
| 新增文件 | **16** 个（5 src + 5 test/ui + 3 test + 3 docs；另 6 份设计稿归档 `design/ui-redesign/**` 不计入源码面）—— I16 修复轮按 `git diff --name-status c2c0e0d..HEAD` 逐项复算订正（原写 13，与 §2.1 表自相矛盾） |
| 修改文件 | **11** 个（3 src + 1 package.json + 7 测试）—— 同上复算订正（原写 12） |
| 波次 | 7 波全部按序完成（Wave 1→7，门禁严格串行） |

**门禁总览（全部绿，严格串行、日志全量落盘 `/tmp/opencode/v3-gate-logs/`）**

| 门禁 | 结果 | 计数 |
|------|------|:--:|
| `npm run typecheck` | ✅ 0 error | — |
| `npm run build` | ✅ | `content.js 177,076`（= 上限）/ `sidepanel.js` **294,874**（v3-1 轮）→ 修复轮按真实产物重登记后为 **295,225** ≤ ceiling 306,099（见 §5 I6） |
| `npm test` | ✅ | **725** passed / 0 failed（下界 646 → 只增） |
| `npm run test:supersession` | ✅ | 8 passed / 0 failed（hunk 全命中台账 + protectedRanges hash + 计数下界） |
| `npm run test:density` | ✅ | **97** passed / 0 failed（阶段 A~E + 9 强制格 + 15 登记格） |
| `npm run test:l0` | ✅ | **74** passed / 0 failed |
| `npm run test:ui`（journey） | ✅ | **167** 断言（不变） |
| `npm run test:insight` | ✅ | **108** 断言（不变） |
| `npm run test:binding` | ✅ | **192** 断言（不变） |
| `npm run test:hardening` | ✅ | **24** 断言 |
| `npm run test:e2e` | ✅ | PASS |
| 体积三线 | ✅ | `content.js` 177,076（无容差、零改动）/ `sidepanel.js` 294,874（v3-1 轮）→ **295,225**（修复轮真实产物，见 §5 I6）≤ 306,099 |
| 反证 RP-V3-01~06 | ✅ | 6/6 实跑，每条 **FAIL → 还原 → PASS** 两段齐备 |
| 零改动核对 | ✅ | manifest / options.html / `src/content/**` 三 hash / `src/security/**` / `web-cli-base/**` / 依赖 全部 0 diff |

**首轮真实产物密度基线（实测优先于设计稿；落差如实登记）**

| 档 | 320 | 400 | 520 |
|----|:--:|:--:|:--:|
| default（≤7/≤15） | 7 / 6 | 7 / 7 | 7 / 7 |
| firstRun（≤9/≤20） | 7 / 12 | 7 / 12 | 7 / 12 |
| risk（≤17/≤35） | 最差 9 / 13（15 格全登记，增量归属违规 0） | | |

- C4 常驻分区数 = **6**（风险位独立成区 + `<script>` 系 body 非 hidden 直接子元素）；**只登记不上限**，登记于 `docs/v3-density-baseline.{md,json}`。
- 设计稿口径落差（如实登记，不作验收依据）：E 公布 7/10/47/6 vs 实测 7/12/51/6（Δ +0/+2/+4/0）；D 公布 80/144/391/5 vs 实测 79/145/392/5。**同源硬证明**：E 稿自带 `window.__density()` 与我们的口径在同一 DOM 上逐项相等。
- 消息区下界：`#log` clientHeight 最终产物实测 **495px**（含待答决策卡最坏情形）→ 登记下界 **488px**（取代 v2 的 589px 锚点，ADR-V3-019 V31-S3；**只允许上调**）。I7 修复轮订正：原写 498px（中间轮次值），实余量 **7px**；下界数值 488 未动。

**取代台账**：`packages/web-cli-plugin/docs/v3-supersession-ledger.json`（base `c2c0e0d`；`counts` 5 项 + `gateFloors` + `v3GateFloors` + `protectedRanges`（journey `#15a~#15q` / binding `#21*`+`#22*` 字节 hash）+ `modifiedRanges`（26 条）+ `entries`（9 条）+ `zeroDiffFiles`（12 项））；门禁 `test/supersession-ledger.test.ts`（`countMethod` 唯一合法值 `runtime-check-calls`、`newTitle` 可定位、`--files-override` 供 RP-V3-05）。

**体积重登记（条件触发 → 已触发并显式完成）**：`sidepanel.js` 266,500 → 291,523 B（v3-1 轮，+25,023 / +9.4%，L0 骨架 + 折叠控制器的**有意增重**）→ **295,225 B**（修复轮按**真实产物**重登记；上一轮登记值 291,523 与该轮最终产物 294,874 不符，见 §5 I6）；ceiling 279,825 → **306,099 B**，修复轮**未抬高**（新增 `SIDEPANEL_CEILING_CAP = 306,099` 只降不升，公式值 309,986 未被采用 → 有效余量 5.00% → **3.68%**，方向收紧）；容差 **5% 不变**；`targetBudgetBytes` / `targetMet` 保持 `null`；历史值全保留（HISTORY + TIMELINE + previousBaselineBytes）；断言零删减（方向敏感断言改写为更强的「ceiling ≤ 上一轮 ceiling」）；+1B 反证在**新 ceiling** 上重跑。`content.js` **无容差、不可重登记**，本轮零改动（177,076 B，sha256 `52a82620…`）。

## 2. 文件变更

### 2.1 新增（16；下表 15 行，其中 docs/v3-density-baseline.{md,json} 合并为一行）

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| NEW | `src/ui/sidepanel/disclosure.ts` | TASK-104 | 唯一折叠控制器：白名单抛错（`#risk-rail` 被拒）+ `hidden` 属性 + ARIA 成对 + 展开态记忆 + `window.__v3.disclosure` |
| NEW | `src/ui/sidepanel/l0/risk-rail.ts` | TASK-105 | 五类风险唯一模板（三通道 + 文本非空抛错）+ `#risk-rail` 唯一写入者 + destructive 过滤 |
| NEW | `src/ui/sidepanel/l0/shell.ts` | TASK-106 | L0 三件事骨架（状态带 / 决策区 / 状态栏 + L2 骨架位） |
| NEW | `src/ui/sidepanel/l0/decision-card.ts` | TASK-106 | 唯一决策卡（≤2 推荐 + 「更多选项（还有 N 个）」真值计数 + 末项兜底就地展开 + 兜底态跨渲染保持） |
| NEW | `src/ui/sidepanel/l0/status-bar.ts` | TASK-106 | 一行状态栏 + ≤4 个 L2 入口（各带计数） |
| NEW | `test/ui/_v3-helpers.mjs` | TASK-101 | v3 门禁自带 helper（7 导出；代价显式登记，换取既有 4 个 `test/ui/*.mjs` 零删改） |
| NEW | `test/ui/density-metrics.mjs` | TASK-102 | **密度口径唯一实现源**（C1~C4 测量源码 + 阈值 + 视口 + 档位 + 归属判定 + 纯判定函数） |
| NEW | `test/ui/density-metrics.d.mts` | TASK-107 | 同一单源的 TS 类型面（口径单源、两个消费者） |
| NEW | `test/ui/density.mjs` | TASK-109 | Chromium 密度门禁：阶段 A（稿件同源）/ B（9 强制格）/ C（15 登记格）/ D（反作弊）/ E（汇总表）+ `--reverse RP-V3-01..04` |
| NEW | `test/ui/l0.mjs` | TASK-110 | L0 运行时门禁（骨架 / 决策卡 / 无常驻输入框 / 风险 5×2 / 祖先链 / 可发现性 / 320-400 等价 / 几何契约 / 双主题） |
| NEW | `test/density-thresholds.test.ts` | TASK-107 | 无 Chromium 静态门禁（阈值逐字 / 矩阵 9 / C1 选择器集 / 禁用 API 零命中 / 静态 DOM 契约 / RP-V3-02(a) / C4 登记） |
| NEW | `test/l0-disclosure.test.ts` | TASK-105 | 折叠器 + 风险模板单测（白名单抛错 / ARIA 成对 / 记忆往返 / destructive 过滤 / 三通道） |
| NEW | `test/supersession-ledger.test.ts` | TASK-108 | 取代台账门禁（hunk ↔ 台账 / protectedRanges hash / newTitle 可定位 / 计数下界 / `--files-override`） |
| NEW | `docs/v3-supersession-ledger.json` | TASK-108 | 取代台账（与 v2 台账并列不覆盖） |
| NEW | `docs/v3-density-baseline.md` / `.json` | TASK-112 | 首轮真实产物密度基线（人读 + 机读，与设计稿口径**分列**） |

### 2.2 修改（11）

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| MODIFY | `src/ui/sidepanel/index.html` | TASK-103 | 追加 `#risk-rail` / `#l0-decision` / `#l0-statusbar` / `#view-host` / `#l2-entries` / `#ask-fallback` 等；`#topbar`（原工具栏）+ `#llm-test-result` + 知情同意/自动授权 收进 L1；`#composer`/`#ask`/`#confirm`/`#settings-view`/`#tree-fab`/`#scroll-bottom` 默认 `hidden`；`#confirm` z-index 9（破坏性确认永不被 L2 覆盖层遮挡）；54 个 v1 id 零重命名；双主题 token 对称 |
| MODIFY | `src/ui/sidepanel/sidepanel.ts` | TASK-106 | 挂载 `disclosure` + `mountL0`；`display` 切换统一改 `hidden`；`renderAsk()` → L0 决策卡；`window.__v3.testing` 测试命名空间（`ask`/`setRisk`/`staleRef`/`revealFallback`/`openTreeView`/`refresh`…）；auto-auth/知情同意落到 L1；`探测中` 不再因后台刷新抖动 |
| MODIFY | `src/ui/sidepanel/view-model.ts` | TASK-106 | 追加纯函数 L0 视图模型（`l0ViewModel` / `deriveRiskClasses` / `moreOptionsLabel` / 站点名与状态文本）+ L1 触发器/目标契约 |
| MODIFY | `package.json` | TASK-109/110/113 | **只追加** scripts：`test:density` / `test:l0` / `test:supersession` / `test:v3`；`test` 追加一步「把 v3 口径模块复制进 dist-test」（依赖零新增） |
| MODIFY | `test/ui/journey.mjs` | TASK-113 | 仅**新增** L1/兜底前置展开（6 处）+ helper；断言文本与编号**零改**（`#15c` 等原样），零删除 |
| MODIFY | `test/ui/binding.mjs` | TASK-113 | 仅**新增**前置展开（`#authorize`/`#open-settings`/`#input`×2/`#auto-write`×2）；`#21*`/`#22*` 区段字节 hash 不变 |
| MODIFY | `test/ui/insight.mjs` | TASK-113 | 几何三连同编号同结构迁移（锚点 589/65.0% → 488/54.0%，取首轮实测下界）+ L1/抽屉前置展开 + 开态 zones 观测行；断言零删除 |
| MODIFY | `test/size-baseline.ts` | TASK-114 | 显式**提升**重登记（291,523 / ceiling 306,099；容差 5% 不变、target 保持 null、历史值保留） |
| MODIFY | `test/size-budget.test.ts` | TASK-114 | 基线常量重 pin + 方向敏感化（断言零删除，含「上一轮基线仍 PASS + 本轮实测超出上一轮 ceiling」张力证明） |
| MODIFY | `test/insight-archive.test.ts` | TASK-114 | 同上（基线常量与方向断言同步重 pin，历史链保留且单调不减） |
| MODIFY | `test/insight-tree-hierarchy.test.ts` | TASK-108 | V31-S9：r2 时代「journey.mjs 零 diff」包裹式禁令 → 更强的「零删除 + 新增行逐条登记」；r2 覆盖来源并入 v3 台账 |

**未改动（红线）**：`manifest.json` · `src/security/**`（`policy.ts` sha256 = `bfcb2ede…`、`auto-authorize.ts` = `1096d065…` 与 pin 一致）· `src/content/**` 三文件（内容 hash 与 pin 一致，`content.js` = 177,076 B 零改动）· `packages/web-cli-base/**` · `options.html` · `main`（`2ddc922`）· 依赖段 · `.opencode/opencode.json`。

## 3. 任务完成清单

| 任务 | 名称 | 复杂度 | 状态 | 对应 FR / AC |
|------|------|:--:|:--:|------|
| TASK-101 | v3 门禁 helper `_v3-helpers.mjs` | S | ✅ completed | FR-V3-004 / NFR-V3-014 |
| TASK-102 | 密度口径唯一实现源 `density-metrics.mjs` | M | ✅ completed | FR-V3-022 / AC-V3-001~005 / ADR-V3-003~005 |
| TASK-103 | `index.html` L0 常驻 DOM/样式 | M | ✅ completed | FR-V3-010/013/014/015/016/024/026 · AC-V3-008/009/020/021 |
| TASK-104 | 折叠器契约 `disclosure.ts` | S | ✅ completed | FR-V3-020/023/024 · AC-V3-010 · ADR-V3-016 |
| TASK-105 | 风险位唯一模板 `l0/risk-rail.ts` + 单测 | M | ✅ completed | FR-V3-016~019 · AC-V3-008/009 |
| TASK-106 | L0 骨架三件事 + 决策卡 + 状态栏 | L | ✅ completed | FR-V3-010~015/021/023 · AC-V3-001/002 · ADR-V3-013/014/017 |
| TASK-107 | 无 Chromium 静态门禁 `density-thresholds.test.ts` | M | ✅ completed | FR-V3-022/024 · AC-V3-005/007 · RP-V3-02(a) |
| TASK-108 | 取代台账 + 门禁 `supersession-ledger.test.ts` | M | ✅ completed | FR-V3-004 · AC-V3-011/012/014 · ADR-V3-019 |
| TASK-109 | Chromium 密度门禁 `density.mjs` | L | ✅ completed | FR-V3-022 · AC-V3-001~005 · ADR-V3-003~005 |
| TASK-110 | L0 运行时门禁 `l0.mjs` | M | ✅ completed | FR-V3-010~021/026 · AC-V3-008/009/010/020/021 |
| TASK-111 | RP-V3-01~06 六条反证实跑 | M | ✅ completed | NFR-V3-013 · AC-V3-006/014/015/024 |
| TASK-112 | 首轮真实产物密度基线登记 | S | ✅ completed | FR-V3-022 · AC-V3-004/005/007 · ADR-V3-011/018 |
| TASK-113 | 既有门禁同编号最小改写 + scripts | M | ✅ completed | FR-V3-004 · AC-V3-011/012 · ADR-V3-007/019 |
| TASK-114 | 体积守卫核对 + `sidepanel.js` 显式重登记 | S | ✅ completed | NFR-V3-005 · AC-V3-015/016 · ADR-V3-011 |
| TASK-115 | 收口：全门禁绿串行验证 + 人工面登记 | S | ✅ completed | FR-V3-003/086/087 · AC-V3-013/024/025/027 |

### 3.1 反证实跑结果（每条 FAIL → 还原 → PASS 两段齐备）

| 反证 | FAIL 段 | 还原段 | 日志 |
|------|---------|--------|------|
| RP-V3-01（+1 可点） | ✔ `C1 8 > 7` FAIL | ✔ 还原后 PASS | `rp-V3-01.log` |
| RP-V3-02（阈值 7→6） | ✔ (a) 纯函数 FAIL / (b) 副本驱动 FAIL | ✔ 原文件 sha256 未变 | `RP-V3-02.log` |
| RP-V3-03（CSS 隐身） | ✔ 4 变体计数**不下降** | ✔ `hidden=true` 必降 1，还原回 7 | `RP-V3-03.log` |
| RP-V3-04（风险行入折叠层） | ✔ AC-V3-008/009 FAIL | ✔ 还原后 PASS | `RP-V3-04.log` |
| RP-V3-05（删 1 条断言） | ✔ 计数 49 < 台账下界 50 FAIL | ✔ 副本移除后 PASS | `RP-V3-05.log` |
| RP-V3-06（`content.js` +1 B） | ✔ 体积门禁 FAIL | ✔ 重建后 177,076 B、sha256 复原、PASS | `RP-V3-06.log` |

### 3.2 人工面（headless 不可合成 → 如实登记）

| 项 | 状态 |
|----|:--:|
| 主题观感（明暗两套的真实视觉观感） | ⏳ 未执行 |
| 动画体感（过渡/滚动手感） | ⏳ 未执行 |
| 窄栏真实体感（320px 真实侧栏拖拽） | ⏳ 未执行 |
| 多显示器 / 高 DPI | ⏳ 未执行 |
| 原生权限弹窗的真实键盘/鼠标体感 | ⏳ 未执行 |
| 真实 Chromium 侧栏（非 tab 打开）中的输入法/焦点真实体感 | ⏳ 未执行 |

## 4. 偏差与风险（如实登记）

1. **取代面大于 plan 的预估**：plan ADR-V3-019 预计「journey 仅 `#15c`、binding 3 处、insight 3 条」。实际因披露模型（工具栏入 L1、composer 默认 `hidden`）需要 journey 6 处、binding 6 处、insight 2 处**前置展开**（全部为**纯新增**，断言文本/编号零改），并额外触发 `size-budget.test.ts` / `insight-archive.test.ts` / `insight-tree-hierarchy.test.ts` 三处**受控重 pin**（台账 V31-S6~S9 逐条登记，`newTitle` 可定位）。计数**只增不减**（journey 167 / insight 108 / binding 192 / sidepanel-view 38 / node 646→725）。
2. **几何锚点迁移**：insight 的 `#log ≥ 589px / ≥65.0%` 按计划（V31-S3）改为**首轮实测下界 488px / 54.0%**；同编号、同结构、零删除，并在 `test/ui/l0.mjs` 增加增强式几何契约（四区两两交面积 = 0、`#log` 唯一滚动容器、兜底态 composer 贴底不遮挡）。
3. **风险态构造使用测试命名空间**：五类风险在 v3-1 通过 `window.__v3.testing.setRisk(cls, 'force'|'off')` 构造（`unauthorized` 另有真实 `revoke` 通路）。plan 明确允许 `staleRef` 走测试命名空间；其余四类在 v3-1 采用同一机制以便确定性度量，**真实状态转换分别属 v3-2 / v3-4**（未新造生产后门：该命名空间只影响只读投影，不参与任何安全判定）。
4. **门禁发现并修复的真实回归 3 处**（保留为记录）：① `SVGElement.className` 只读导致每次渲染抛错（渲染全链路中断）；② 连接树抽屉覆盖 `#confirm` 导致破坏性确认不可答（binding `#22h` 之后整条链静默失效）；③ 后台探测刷新使 `#log` 状态文本抖动，破坏密度增量归属。三者均由门禁实测发现，非推断。
5. **`#view-host` 暂为骨架**：v3-1 只提供 L2 宿主与计数入口，视图替换（FR-V3-047：隐藏 `#log` 让宿主占位）归 **v3-3**。
6. **L2 入口计数为真值但内容为空**：`连接树 · 0` / `命令目录 · 0` / `审计 · N`（审计为真实 `state.auditCount`）；v3-3 填真值。

## 5. 修复轮（review R1 之后，2026-09-16）

> 输入：`review.md`（C1~C38）+ `review-report.md`（R1：22 通过 / 16 改进 / 0 阻塞）。
> 纪律：**方向只准收紧，禁止放宽**；测试只增不减、断言只强不弱；新增/修改的断言逐条更新台账。
> 门禁日志：`/tmp/opencode/v3-gate-logs/v3-1-fix/`（20 份，全量落盘、无 tail 截断）。

### 5.1 中severity（I1~I8，全部已修）

| # | 根因 | 修法 | 证据 | 可 FAIL 的断言 |
|---|------|------|------|:--:|
| **I1** | `l0/decision-card.ts` 的 early-return 分支用 `foldedCount <= 0` 判可见性，而 `foldedCount = foldedOptions.length + 1 ≥ 1` **恒真** → 无卡态第二次 render 会把 `#l0-more`（「更多选项（还有 1 个）」）重新点亮；且 `l0/shell.ts` 在 `card.render()` 之后无条件改写同一按钮的文案，形成**双写入者** | ① `#l0-more` 的 label / `data-count` / `hidden` 收敛为**唯一写入者** `decision-card.ts#applyMore()`（`hidden = !visible \|\| foldedCount <= 0 \|\| nothingBehind`，label/data-count 在无卡态归零）；② 删除 `shell.ts` 的重复写入 | `src/ui/sidepanel/l0/decision-card.ts:126-146`、`src/ui/sidepanel/l0/shell.ts:92-99`（删除 2 行写入） | ✅ 新增 `test/ui/l0.mjs` ②「无卡态第二次 render 后 `#l0-more` 仍 hidden」+「文案/data-count 归零」 |
| **I2** | 两份 `OTHER_OPTION_LABEL`（`risk-rail.ts` / `view-model.ts`）无相等断言，单测只断非产品常量 → 漂移不可见 | ① 单测加**三处常量相等**断言（risk-rail ≡ view-model ≡ shell 再导出）；② `test/ui/l0.mjs` 加**渲染态 DOM 文本**断言（`#l1-more-options` 末按钮 === 「其他…（我来描述）」） | `test/l0-disclosure.test.ts:7 节`、`test/ui/l0.mjs:239-248` | ✅ 两条都可 FAIL |
| **I3** | `l0/risk-rail.ts` 的 `partitionDecisionOptions` + `MAX_VISIBLE_RECOMMENDED=1` 是**产品零引用**的第二份分区规则，注释算术与产品常量（`L0_VISIBLE_RECOMMENDED=2`）及实测（2 个推荐选项）自相矛盾 | 删除 `partitionDecisionOptions` / `MAX_VISIBLE_RECOMMENDED` / `DecisionOption`（零引用），并把单测该节改写为**产品视图模型**（`l0ViewModel`）的推荐位/折叠位/N 派生断言 | `src/ui/sidepanel/l0/risk-rail.ts`（-52 行）；`grep -rn partitionDecisionOptions` = 0 命中 | ✅ 改为产品规则断言（改真值即变） |
| **I4** | ① `V31-S1/S2.oldTitle` 失真（journey 的仍在、binding 的 0 命中）② journey/binding 相对 base **0 删除行** → hunk↔台账校验对它们**恒真（空转）** ③ `counts.nodeTestLowerBound` 的 `countMethod=runtime-check-calls` 与 note 的「静态 `test(` 计数」**跨口径混用**（646 静态 / 725 运行期 / 819 静态含点号） | ① `V31-S1/S2/S4/S5` 改登记为 `modificationType: 'pure-addition'` + `oldTitle: null`，并加**两条门禁**：「pure-addition ⇒ oldTitle 必须为 null」「non-pure 的 oldTitle 必须已不存在于目标文件」② 台账新增 `pureAdditionFiles` + `pureAdditionNote`，门禁**显式排除**并对「0 删除行」本身断言，另加「至少要覆盖到一个真有删除行的文件（防空转）」③ `counts` 拆为 `nodeTestRuntime`（`runtime-node-tests`）+ `staticCalibers.nodeTestStatic`（`static-node-test-registrations`），新增 `countCalibers` 口径字典，门禁断言「每个 countMethod 必须在字典中定义」且两口径数字必须不同 | `docs/v3-supersession-ledger.json`（countCalibers / staticCalibers / pureAdditionFiles / 4 条条目 / 11 条 modifiedRanges）；`test/supersession-ledger.test.ts`（+3 用例） | ✅ 全部可 FAIL（含「反证前提：旧白名单会放行」对照） |
| **I5** | AC-V3-010 的遍历被 4 条白名单缩范围：4 个 `#l2-entry-*` 有 `aria-controls` 却**无 `aria-expanded`**，目标 `#view-host` 为空 → 应 FAIL 却不可见 | ① `index.html` 给 4 个 L2 入口补 `aria-expanded="false"`；`l0/status-bar.ts` 新增 `syncTriggerAria()` 按 `#view-host.hidden` 同步；`shell.ts#openL2` 调用之 ② `l0.mjs` ⑥ 改为**遍历全部 `[aria-controls]`**（实测 10 个：4 L0 + 4 L2 + `#tree-fab` + `#ask-other`），逐条断言文字/成对/目标存在/摘要，并加「完整性清单」断言防漏检；`#view-host` 骨架期按编排器许可**显式登记豁免**（`v3SkeletonExemptions`），且断言「空摘要目标集合 ⊆ 豁免集合且数量不得增长」+「豁免下入口仍须自带计数/标签」 | `src/ui/sidepanel/index.html:1105-1108`、`src/ui/sidepanel/l0/status-bar.ts:17-56`、`test/ui/l0.mjs:§⑥` | ✅ 10×4 条 + 3 条豁免边界断言 |
| **I6** | 体积登记值 291,523 B 与该轮**最终产物** 294,874 B 不符（差值来自登记后的 3 处门禁回归修复）→ `note` 对产物失真 | 按**真实产物**重登记：`SIDEPANEL_BASELINE_BYTES = 295_225`（修复轮最终构建实测）；ceiling **不抬高**：新增 `SIDEPANEL_CEILING_CAP = 306_099`（上一轮 ceiling），`SIDEPANEL_CEILING = min(floor(baseline×1.05), cap)` 且 `evaluateSidepanelSize()` 同步 cap-aware；未被采用的公式值 309,986 显式记为 `SIDEPANEL_CEILING_UNCAPPED`；容差 5% 不变；291,523/266,500 保留在 `SIDEPANEL_BASELINE_BYTES_TIMELINE` + `previousBaselineBytes` | `test/size-baseline.ts`（I6 段）；`test/size-budget.test.ts`（新增「实测 == 登记值」体节断言）；`test/ui/density.mjs` 阶段 F（产物字节 vs `docs/v3-density-baseline.json#volume`） | ✅ 断言零删减（方向敏感断言由「baseline > 上一轮 ceiling」**改写为更强且更严**的「ceiling ≤ 上一轮 ceiling」+ uncapped 反证） |
| **I7** | 几何来源叙述「实测 498 − 10 = 488」与最终产物实测 **495**（实余量 7px）不符；`insight.mjs` 的 PASS 摘要仍打印 589px | ① `density-metrics.mjs#LOG_CLIENT_HEIGHT_FLOOR` 注释按实测订正（495 − 7 = 488，**下界数值 488 不动**）；② `docs/v3-density-baseline.json` 增 `logClientHeightMeasuredWorst: 495` 并订正 note；③ `insight.mjs` PASS 摘要改为从 `LOG_CLIENT_HEIGHT_FLOOR` 插值（顺带订正 #I-06/#I-07 文档行与 7px 余量叙述） | `test/ui/density-metrics.mjs:197-226`、`docs/v3-density-baseline.json`、`test/ui/insight.mjs`（4 行文案） | ✅ 阶段 F「来源实测 == 登记来源值」（498 会 FAIL） |
| **I8** | ADR-V3-018 决策 2 的「门禁读取基线并比对」**未实现**（`density.mjs` 只打印「基线文件已存在」）→ 基线漂移不会被发现（I6/I7 的成因） | ① 口径单源新增纯函数 `compareBaselineCells()`；② `density.mjs` 新增**阶段 F**：24 个登记格（9 强制 + 15 风险 + worst）+ 阈值 + 几何下界 + **几何来源实测**（重新测量 `#log` clientHeight）+ **产物字节** 与 `docs/v3-density-baseline.json` 逐项机器比对，任何不一致即 FAIL 并打印可读差异；③ 新增 `--reverse RP-V3-08`（篡改真实基线文件 → FAIL → 还原（sha256 复核）→ PASS） | `test/ui/density.mjs`（阶段 F + RP-V3-08）、`test/ui/density-metrics.mjs`（`compareBaselineCells`） | ✅ RP-V3-08 实跑 8/8（FAIL→sha256 复原→PASS） |

**I8 的首次运行即时战果（真实缺陷，非本次改动引入）**：阶段 F 在修复轮第一次运行时即 FAIL，诊断 `risk(staleRef)@{320,400,520}.lines: 实测 8 ≠ 登记 7`。复算确认 `⌈244 ÷ 34⌉ = 8` —— 登记格与**自身 `chars` 字段**、与该轮门禁日志（`C2=8 chars=244`）都矛盾，是一次**登记错误**。处置：按实测订正 `lines: 8`（8 ≤ 风险档上限 35，方向不越界）+ 在登记格内写明订正理由；并新增**静态自洽断言**（`test/density-thresholds.test.ts`：每格必须满足 `lines = ⌈chars ÷ 34⌉`），使这类错误不能再通过。此外阶段 F 还暴露一处**夹具非对称**（`default@320` 194 chars vs `default@400/520` 223 chars，差值为产品第二次夹具运行时弹出的瞬时 `#notice` 29 字符）——按「只登记不粉饰」记入 `docs/v3-density-baseline.json#fixtureAsymmetry`，未改动任何已登记格（改任一格都会构成放宽或未经裁决的收紧），并把 RP-V3-08 驱动改为复现同一稳态（先跑两次夹具）。

### 5.2 低severity（机械可修的全部已修）

| # | 位置 | 修法 | 证据 |
|---|------|------|------|
| I9 | `test/l0-disclosure.test.ts:237` `assert.ok(targets instanceof Array \|\| true)` | 恒真断言 → `assert.ok(Array.isArray(...))` + `deepEqual(targets, COLLAPSIBLE_TARGETS)` | 该用例仍 PASS，且删掉实现即 FAIL |
| I10 | `test/density-thresholds.test.ts:329` 基线缺失即 `return` | 改为 `assert.ok(existsSync(BASELINE_JSON), …)`（缺失即 FAIL，不再静默跳过） | 同上 |
| I11 | `test/insight-tree-hierarchy.test.ts` V31-S9 白名单过宽（子串 `__v3`） | 收紧为 `/^await (v3RevealComposer|v3OpenStatusDetails|v3Collapse|v3OpenTreeView|window\.__v3)[.(]/` + 新增「新增行不得含 `check(`/`assert`」断言 + 反证对照（旧白名单会放行 `check('__v3 伪装…')`，新规则拒绝） | 台账条目 V31-S14 |
| I12 | `test/ui/l0.mjs:493-495` 双主题断言偏弱 | 新增：5 个语义 token 在两主题都必须解析为非空**且两套值必须不同**；风险行/徽标色值必须不同；去掉 paint 属性后三通道仍可读；徽标底色为继承（登记项） | ⑨ 段断言数 6 → 22 |
| I13 | `test/ui/l0.mjs:440` 空集合真空 PASS | 改为：静止态不得存在非 `#log` 滚动容器 + **注入不可压缩溢出**后 `#log` 必须可滚且滚动容器恰为 `['log']` | ⑧ 段 2 条新断言 |
| I14 | `hasDiff()` / `l0.mjs` 重复 `setRisk` + `void confirm` / `RISK_DETAIL_ENTRY_LABEL` | 三处零引用/冗余全部清理（`hasDiff` 删除并登记 V31-S15） | `grep -rn hasDiff(` = 0；`grep -rn RISK_DETAIL_ENTRY_LABEL` = 0 |
| I15 | `test/ui/density.mjs` 阶段 E 汇总 `C3=undefined` | `worst` 聚合补 `blocks`（并补 `chars` 以便与登记格比对） | 阶段 E/阶段 C 现在打印 `C3=25` |
| I16 | `build.md §1` 计数失真（13/12） | 复算订正为 **16 / 11**，并同步 §2.1/§2.2 标题 | 见 §1 表 |
| I17 | 台账 `v3GateFloors: {density-metrics.mjs: 0}` 永不失败 | 移出 count floor，改为 `v3CaliberPins`（7 条字面量 pin：三档阈值逐字 / 488 下界 / 三视口 / 34 / `compareBaselineCells`），门禁逐条断言存在 | `test/supersession-ledger.test.ts` 第 7 节（+1 用例） |

**deferred（如实登记，未假装已修）**：

| 项 | 理由 |
|----|------|
| RP-V3-02(b)/03/04 的「读取侧是副本/内联副本」（R1 §3 P1 判定的中severity 面） | 涉及把 `density.mjs` 的判定/探针改为**复用单一实现源**（例如 RP-03 直接调用 `DENSITY_MEASURE_SOURCE` 的 C1 计数、RP-04 驱动 `l0.mjs` 的 `riskProbe`）。这些改动会改变反证驱动的**独立性语义**（副本→同源）并需要重跑全部反证与门禁；本轮焦点是 I1~I8 + 机械型低severity，故**登记为 deferred**，建议 v3-2 或 validate 阶段处理。当前状态：RP-01/05/06/08 独立性强；RP-02b/03/04 已如实标注为中（不冒充强） |
| `package.json` 的 `-2` 行改写不在台账覆盖集合内（R1 §3 P3 ③） | 非受保护文件（脚本段），且台账 `pureAdditionFiles`/`modifiedRanges` 的覆盖面按「受保护文件」定义；如需覆盖 `package.json` 需扩展台账 schema（超出本轮范围）→ deferred |
| 消息区下界余量仅 7px（R1 §3 P2） | 数值 488 由 ADR-V3-009/ADR-V3-019 V31-S3 授权，**本轮只订正来源与余量叙述**（I7），不动数值；薄余量的真实风险已如实登记，建议 v3-2 起布局时复核 |

### 5.3 门禁结果（修复轮，严格串行、全日志落盘）

| 门禁 | 结果 | 计数（对照 R1 前） | 日志 |
|------|------|------|------|
| `npx tsc --noEmit` | ✅ 0 error | — | `typecheck.log` |
| `npm run build` | ✅ | `content.js 177,076`（= 上限，零改动）/ `sidepanel.js **295,225**` ≤ ceiling 306,099 | `build.log` `size.log` |
| `npm test` | ✅ | **732** passed / 0 failed / 0 skipped（对照 725） | `npm-test.log` |
| `npm run test:supersession` | ✅ | **11** passed（对照 8；l0.mjs 65 ≥ 65、density.mjs 54 ≥ 54） | `supersession.log` |
| `npm run test:density` | ✅ | **105** passed / 0 failed（对照 97；含阶段 F 8 条） | `density.log` |
| `npm run test:l0` | ✅ | **134** passed / 0 failed（对照 74） | `l0.log` |
| `npm run test:ui` | ✅ | **167** 断言（不变） | `ui.log` |
| `npm run test:insight` | ✅ | **108** 断言（不变；PASS 摘要已不再漂移） | `insight.log` |
| `npm run test:binding` | ✅ | **192** 断言（不变） | `binding.log` |
| `npm run test:hardening` | ✅ | **24** 断言 | `hardening.log` |
| `npm run test:e2e` | ✅ | PASS | `e2e.log` |
| 体积三线 | ✅ | `content.js 177,076`（sha256 `52a82620…`）/ `sidepanel.js 295,225 ≤ 306,099`（ceiling 未抬高） | `size.log` |
| 零改动核对 | ✅ | 判定链两文件 sha256 = pin、`src/content/**` 三文件 sha256 = pin、`manifest.json`/`options.html`/`hardening.mjs`/`sidepanel-view.test.ts`/`perf-budget.test.ts`/`fullchain.mjs` 全 0 diff、`main = 2ddc922`、依赖段无新增 | `zero-diff.log` |
| 反证 RP-V3-01~06 + RP-V3-08 | ✅ | 6/6 + 1，全部 FAIL → 还原 → PASS；RP-06 复原 sha256 `52a82620…`；RP-08 复原 sha256 一致 | `RP-V3-0*.log` |
| **I1 修复反证** | ✅ | 移除修复 → `test:l0` **2 条 FAIL**（`moreHidden:false`）→ 还原（`decision-card.ts` sha256 复原、产物回到 295,225）→ **134/0 PASS** | `RP-I1.log` |

**计数只增不减核对**：插件单测 725 → **732**；journey 167（不变）；insight 108（不变）；binding 192（不变）；density 97 → **105**；l0 74 → **134**；supersession 8 → **11**；sidepanel-view 38（不变）；静态 `\btest(` 814 → **830**（排除点号前缀 729 → **740**）。**断言零删减**（被取代的方向敏感断言逐条登记在台账 V31-S10~S15，且全部替换为**更强**的形式）。

## 6. 下一步

| 场景 | 操作 |
|------|------|
| 全部任务已完成 + review R1 的改进项已修复 | 运行 `@sddu-validate specs-tree-v3-1-l0-shell-density` 进入验证（本叶 `state.json` 已推进到 `phase=reviewed`） |
| 若需再审查本轮修复 | 运行 `@sddu-review specs-tree-v3-1-l0-shell-density`（R2 轮：建议重点复核 §5.1 的 I1/I4/I5/I8 四项与 `deferred` 三条） |

## 7. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：V3-1 全量实施（15 任务 / 7 波）、全门禁绿（串行、日志全量落盘）、6 条反证实跑、首轮真实产物密度基线（三档 × 三视口 + 与设计稿口径分列 + C4 登记）、取代台账与门禁、体积显式提升重登记；偏差与人工面如实登记 | 2026-09-16 | SDDU Build Agent |
| v1.1 | **修复轮**：I1~I8 中severity 全部修复（含 1 处状态机缺陷 + 门禁盲区、2 处 AC 证明力不足、1 组台账保真、1 组披露保真）；机械型低severity I9~I17 全部修复；`build.md §1` 计数按 `git diff` 复算订正；新增门禁阶段 F（基线机器比对）+ RP-V3-08 + I1 修复反证；3 项如实登记为 deferred；体积按真实产物重登记且 ceiling 未抬高 | 2026-09-16 | SDDU Build Agent（修复轮） |
