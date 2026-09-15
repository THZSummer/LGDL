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

**取代台账**：`packages/web-cli-plugin/docs/v3-supersession-ledger.json`（base `c2c0e0d`；`counts` 5 项 + `gateFloors` + `v3GateFloors` + `protectedRanges`（journey `#15a~#15q` / binding `#21*`+`#22*` 字节 hash）+ `modifiedRanges`（**39** 条）+ `entries`（**15** 条）+ `zeroDiffFiles`（**11** 项）+ `pureAdditionFiles`（2）+ `v3CaliberPins`（9 条 pin）+ `v3SkeletonExemptions`（2：`view-host` / `settings-count`））；门禁 `test/supersession-ledger.test.ts`（**按行**覆盖判定 + `newTitle` 可定位 + `--files-override` 供 RP-V3-05）。

> **收口轮订正（validate R1 F4，2026-09-16）**：本节原文记「`modifiedRanges`（26 条）+ `entries`（9 条）+ `zeroDiffFiles`（12 项）」——这是 v3-1 首轮快照，I4/I6/I7/I11 与收口轮补登后早已失真。现按机读台账复算订正为 **39 / 15 / 11**（收口轮 F1 补登 2 条 = 3 行删除行之前为 37 / 15 / 11）。原文数字保留在此以便对账。

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
| **I8** | ADR-V3-018 决策 2 的「门禁读取基线并比对」**未实现**（`density.mjs` 只打印「基线文件已存在」）→ 基线漂移不会被发现（I6/I7 的成因） | ① 口径单源新增纯函数 `compareBaselineCells()`；② `density.mjs` 新增**阶段 F**：**22** 个登记格（6 非风险格 + 15 风险格 + worst）+ 阈值 + 几何下界 + **几何来源实测**（重新测量 `#log` clientHeight）+ **产物字节** 与 `docs/v3-density-baseline.json` 逐项机器比对，任何不一致即 FAIL 并打印可读差异；③ 新增 `--reverse RP-V3-08`（篡改真实基线文件 → FAIL → 还原（sha256 复核）→ PASS） | `test/ui/density.mjs`（阶段 F + RP-V3-08）、`test/ui/density-metrics.mjs`（`compareBaselineCells`） | ✅ RP-V3-08 实跑 8/8（FAIL→sha256 复原→PASS） |

> **收口轮订正（validate R1 F5，2026-09-16）**：本行原文写「**24** 个登记格」，高估 2 格 —— 阶段 F 实际机器比对 **22** 格（`6`（default/firstRun × 3 视口）+ `15`（风险子场景）+ `1`（worst））。「24」= 9 强制格（含 3 个由 worst-of-15 代表的 risk 视口格）+ 15，属重复计数。收口轮把该数字改为**机器计算**（`comparedCells`，日志与断言同源），使此类高估不可能再次出现。

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

> **收口轮订正（validate R1 F3，2026-09-16）**：静态口径的 830 / 740 不可复现。按**确切正则**复算（2026-09-16）：`/\btest\(/gm` = **833**、`/(?<![\\w.])test\(/gm` = **741**（`currentStatic` 采用此读法）、`/^test\(/gm` = **732**（与运行期 `ℹ tests` 逐值相等）。三种读法都 ≥ 646 下界；数字与正则已写入台账 `staticCalibers.nodeTestStatic.readings`，由门禁**机器复算**（不可再漂移）。

## 6. 收口轮（validate R1 之后，2026-09-16）

> **输入**：`validate-report.md` R1（⚠️ 有条件通过 / **0 阻塞** / 独立新发现 **F1~F9**）+ **编排器裁决**（§6.1）。
> **纪律**：不改 spec/plan 的条文语义（只做被裁决授权的**显式订正**并逐字保留历史）；测试只增不减、断言只强不弱；**不放宽任何上限**；
> 门禁**严格串行、一次一个 Chromium**、日志全量落盘（**禁 tail 截断**）于 `/tmp/opencode/v3-gate-logs/v3-1-closeout/`。
> **本轮改动面**（`git status` 可核）：门禁/测试 5 处（`test/supersession-ledger.test.ts`、`test/ui/density.mjs`、`test/ui/l0.mjs`、`test/ui/density-metrics.mjs`、`test/ui/density-metrics.d.mts`）、
> 机读台账/基线 2 处（`docs/v3-supersession-ledger.json`、`docs/v3-density-baseline.json`）+ 人读镜像 1 处（`docs/v3-density-baseline.md`）、SDDU 文档（本叶 spec/plan/state/build + validate-report 追加 + 父 spec/plan/state）。
> **未改**：`src/**` 任何文件（含 `src/content/**`）、`manifest.json`、判定链、`web-cli-base/**`、`design/**`、依赖段、`main`。

### 6.1 裁决记录（编排器，按此执行，未另作主张）

| # | 裁决 | 执行情况 |
|---|------|---------|
| A1 | **F8 订正，不豁免**：把本叶 spec §5/§7 与 state.json#gateSet 的 `sidepanel ≤279,825` 订正为经显式重登记后的值（实测 295,225 / ceiling 306,099），**逐字保留历史行**；父 spec/plan 同数字同步订正 | ✅ 5 个文件 12 处（本叶 spec 2 / 本叶 plan 2 / 本叶 state 1(+history) / 父 spec 3 / 父 plan 5→含 1 处预测 / 父 state 2）——见 §6.2 F8 |
| A2 | **F1 改为按行包含判定**：登记行集合 ⊇ 实际删除行集合（逐行命中），补登 3 行；**不许**放低为 hunk 重叠 | ✅ 判据改写 + 补登 `V31-MR-F1`（2 条区间覆盖 3 行）+ 反证实跑 |
| A3 | **F6 优先补真值计数**；派生不出真值则按 `#view-host` 同法登记豁免并断言豁免边界；**该 FR 必须有能 FAIL 的断言** | ⚠️ 走了**豁免路线**（真值在 L0 层派生不出，详见 §6.2 F6）；断言与反证均已落地 |
| A4 | **F7 探针补判定**，与 C1 口径对齐（C1 不豁免 visibility/opacity） | ✅ 上移为口径单源 + 补判定 + 新增 RP-V3-09 反证 |
| A5 | **F2/F3/F4/F5/F9 逐条订正为可复现值** | ✅ 732 / 833·741·732 + 确切正则 / 39·15·11 / 22 格（机器计算）/ 检查名对齐 |
| A6 | **夹具非对称 → 夹具做成确定性后按「收紧」流程重登记 320 格**；历史值保留，方向只能收紧 | ⚠️ **执行结果与「方向只能收紧」存在一处需明示的张力**：夹具已做成确定性（两遍 + 每格稳态断言 + 三视口逐项相等），但 `default@320` 的登记值由 **194/18/6 → 223/19/7**（数值方向为**上调**）。理由见 §6.3，**如实上报**。 |
| A7 | 红线（9 条）任一触碰即停下上报 | ✅ 零触碰，逐条核验见 §6.5 |

### 6.2 F1~F9 逐条处置（根因 / 修法 / 证据 / 可 FAIL 断言）

| # | 根因 | 修法 | 证据（文件 / 行 / 日志） | 可 FAIL 的断言与反证结果 |
|---|------|------|------------------------|------------------------|
| **F1** 🟠 | 台账覆盖率判据是 **hunk 与已登记区间的「重叠」**，不是**按行包含** → 同 hunk 内相邻行已登记即可整 hunk 通过，`size-budget.test.ts` old **272/273**、`insight-archive.test.ts` old **771** 三条删除行未被逐条登记（AC-V3-011 机器强制力不足） | ① 判据改为**逐行**：新增 `deletionLines(file)`（`-U0` hunk 内第 i 条 `-` 行 = `oldStart + i`），每条删除行的**行号必须落在本文件某个 `oldRange` 内**（或命中 `oldTitle`）；② 新增「逐行判定数 > 0」防空转断言；③ 台账补登 `V31-MR-F1`：`size-budget.test.ts [272,273]→[358,362]`（2 行）、`insight-archive.test.ts [771,771]→[779,783]`（1 行） | `test/supersession-ledger.test.ts`（模块 doc 第 1 条 + `deletionLines()` + 用例「**每一条删除行**必须逐行命中」）；`docs/v3-supersession-ledger.json#modifiedRanges`（37 → **39** 条） | ✅ **实跑**：移出 `[272,273]` → 门禁 **FAIL**（诊断逐行打印 `old 272` / `old 273`）→ 还原（sha256 `2b0e58f0…` **逐字节复原**）→ **11/0 PASS** |
| **F2** 🟡 | 台账 `counts.nodeTestRuntime.currentRuntime` 记 **731**，实测 **732** | 按实测订正为 **732**，note 写入复现命令 | `docs/v3-supersession-ledger.json#counts.nodeTestRuntime` | ✅ 门禁用例「计数只增不减（currentRuntime ≥ gateFloors）」继续约束；732 ≥ 646 下界 |
| **F3** 🟡 | `staticCalibers` 记「含点号前缀 830 / 排除点号前缀 740」，**两种都不可复现**且 note 未给确切正则 | 按确切正则复算并登记**三种读法**：`/\btest\(/gm` = **833**、`/(?<![\\w.])test\(/gm` = **741**（`currentStatic` 采用）、`/^test\(/gm` = **732**（与运行期 `ℹ tests` 逐值相等）；正则写入 `readings`，由门禁**机器复算** | `docs/v3-supersession-ledger.json#staticCalibers.nodeTestStatic.readings`；`test/supersession-ledger.test.ts`（用例「计数只增不减」新增复算段） | ✅ 可 FAIL：任一声明读法复算值 ≠ 登记值即 FAIL（**首跑即真实命中一次**：`anyWordBoundary` 834 ≠ 833，原因是新注释写了 `.test(` 字面量 —— 已改写注释使口径回到 833） |
| **F4** 🟡 | `build.md §1` 记「`modifiedRanges` 26 / `entries` 9 / `zeroDiffFiles` 12」，实际为 37/15/11（I4/I6/I7/I11 与补登后失真） | 按机读台账复算订正为 **39 / 15 / 11**（含 F1 补登 2 条 = 3 行）；原文数字与订正说明保留在同节注 | `build.md §1`（取代台账段） | ✅ 可核：复算命令 `python3 -c "import json;d=json.load(open('docs/v3-supersession-ledger.json'));print(len(d['modifiedRanges']),len(d['entries']),len(d['zeroDiffFiles']))"` |
| **F5** 🟡 | 阶段 F 日志/注释写「**24** 登记格」，高估 2（实际机器比对 **22** 格 = 6 + 15 + 1）；「24」把 3 个由 worst-of-15 代表的 risk 视口格重复计入 | 数字改为**机器计算** `comparedCells`（断言文本、日志、返回值同源），不再手写 | `test/ui/density.mjs`（`stageF()`）；门禁日志 `20-test-density-round3.log`：`✔ F 22 个登记格实测 == 基线登记值`、`· 基线比对：22 格 + …` | ✅ 可 FAIL：任一格实测 ≠ 登记即 FAIL（阶段 F 首跑即曾检出 `risk(staleRef).lines` 漂移，见 §5.1 I8） |
| **F6** 🟡 | FR-V3-015 要求 L2 入口「**各带计数**」，但 `#l2-entry-settings` 是 `data-count="n/a"` + 纯文本标签；而 `l0.mjs` ⑥ 的断言是「计数 **或** 标签」二选一 → 该 FR **没有任何能 FAIL 的断言** | **走了「登记豁免」路线**（编排器允许的两条路之一）：① 台账新增 `v3SkeletonExemptions#settings-count`（含 `why`：L0 层派生不出真值 —— 设置视图**懒挂载**、`l0ViewModel()` 是纯函数；写死魔数被禁；改 `src/**` 会让编排器已钉死的体积登记值 295,225 B 失效）；② `l0.mjs` 新增 ⑥b：`连接树/命令目录/审计` 必须「**入口标签 ≡ data-count ≡ 状态栏摘要**」**三处同源**，豁免入口必须显式 `n/a`，且「无计数入口集合 ⊆ 登记豁免集合且数量不得增长」 | `test/ui/l0.mjs` §⑥b（`L2_COUNT_EXEMPT` / `l2CountJudge()`）；`docs/v3-supersession-ledger.json#v3SkeletonExemptions` | ✅ **实跑 FAIL→还原→PASS（内联）**：篡改真 DOM `#l2-entry-tree[data-count]` `0→99` → 判据报 `tree: 三处不同源`；还原为 `0` → 判据为空。日志 `23-test_l0-round3.log` |
| **F7** 🟡 | 风险可见性探针的判据只有「祖先无 `hidden` ∧ 无折叠容器 ∧ `rect.height > 0`」；`visibility:hidden` / `opacity:0` **不改变 rect** → 风险位视觉上消失而探针仍 `ok:true`，与 C1「只豁免 `hidden`」的口径不一致（当前产物无该路径 ⇒ 属兜底覆盖面缺口） | ① 探针**上移为口径单源** `density-metrics.mjs#riskVisibilityProbeSource()`（`density.mjs` 与 `l0.mjs` 共用，消除两份实现）；② 祖先链补 `getComputedStyle` 判定 `visibility === 'hidden'` / `opacity === '0'`；③ 视口判据取两版中**更严**的一版（任一部分越界即 FAIL）；④ 新增 `--reverse RP-V3-09` | `test/ui/density-metrics.mjs`（新导出 + 注释说明「getComputedStyle 在这里用、在 `DENSITY_MEASURE_SOURCE` 里仍被禁」）；`test/ui/density.mjs#reverseRp09`；`test/ui/density-metrics.d.mts`；台账 `v3CaliberPins` +2 条 | ✅ **RP-V3-09 实跑 10/0**（日志 `21-RP-V3-09.log`）：`#risk-rail` 置 `visibility:hidden` → 探针 **FAIL**（`祖先链含 CSS 隐身`）；置 `opacity:0` → **FAIL**；两例均附带「**旧判据仍判通过**」对照（证明新判据是唯一拦截点）；还原 → **PASS** |
| **F8** 🟠 | spec `NFR-V3-005`/`AC-V3-016` 与 `state.json#gateSet` 登记 `sidepanel ≤279,825`（基线 266,500），而产物/代码/机读登记为 **295,225 / ceiling 306,099**（+9.4%）；重登记本身符合 NFR-V3-005 的「显式」要求，但 spec 字面数值被突破且未同步 | **订正（不豁免）**：逐处改为 `≤306,099（基线 295,225）`，并在**每一处逐字保留历史行** `~~279,825~~ → 306,099`、`~~266,500~~ → 295,225（经显式重登记订正，2026-09-16；容差 5% 未变、ceiling cap 只降不升、断言零删减）`；父 spec 3 处、父 plan 5 处、父 state `sizeGuards` 同步 | 本叶 `spec.md:115,150`、`plan.md:59,152`、`state.json#independence.gateSet(+gateSetHistory)`；父 `spec.md:90,294,377`、`plan.md:75,222,226,396,720`、`state.json#evidenceFacts.sizeGuards(+history)` | ✅ 可核：`grep -rn "279,825"` 的每一命中均带历史保留标记（原文 diff 见 §6.6）；阈值 7/15 · 9/20 · 17/35 与 ceiling **均未抬高** |
| **F9** 🔵 | 阶段 F 检查名「产物字节 ≤ 体积上限（ceiling 未因登记保真被抬高）」与其断言（`artifactBytes <= ceilingBytes`）**不等价** —— 该断言只证明「产物在上限内」，「未抬高」的真正证明在 `size-budget.test.ts` 的 V31-S12 | 检查名改为「产物字节 ≤ **机读**体积上限」，并在注释中指向 `test/size-budget.test.ts` 的 V31-S12（`SIDEPANEL_CEILING <= previousCeilingBytes` + 只降不升的 `SIDEPANEL_CEILING_CAP`）作为唯一证明 | `test/ui/density.mjs#stageF` | ✅ 命名与断言对齐后仍可 FAIL（+1B 反证 RP-V3-06 覆盖体积门禁） |
| **K-1** | 夹具非对称：`default@320`（**第一格**）194/18/6 vs 400/520 223/19/7，差值 = `#notice` 29 字符（validate 独立复测确认**会话内持续存在**，非文档原先写的「瞬时」） | 夹具改为**确定性两遍**（`fixturePass()` ×2，每格只测第二遍）+ 新增每格稳态断言 + 默认档三视口逐项相等断言；baseline 订正「瞬时」措辞；`default@320` 重登记 194/18/6 → **223/19/7**（历史值保留） | `test/ui/density.mjs#resetFixture/assertFixtureSettled`；`docs/v3-density-baseline.json#tiers.default["320"]{previous,…}` + `#fixtureAsymmetry`；**人读镜像** `docs/v3-density-baseline.md`（表格行 + 收口轮订正注 + 反证清单补 RP-V3-09） | ✅ 可 FAIL：每格 `#notice` 必须存在可见（24 格）、默认档三视口逐项相等（1 条）——旧夹具在第一条上即 FAIL（320 与 400/520 不等） |

### 6.3 A6 的执行张力（**如实上报，不粉饰**）

编排器对夹具项同时给了两条约束：「方向只能是收紧」与「validator 证实 `#notice` 在会话内**持续存在**，文档中『瞬时』措辞须一并订正」。二者在本格上不可同时成立：

1. **`#notice` 是真实稳态**：validate R1 独立复测（`probe-notice`/`probe-delta` 同构）显示，第二个夹具周期起 `#notice`（29 字符 / +1 块 / +1 行）在会话内**持续存在**，320 也因此与 400/520 完全一致（223/19/7）。旧登记值 194/18/6 是**第一格专属**的未稳态，**不可复现** ⇒ 它是欠测，不是「更严的登记值」。
2. **要「收紧」只能压低 400/520 与全部 risk 格**：把夹具改成「永不带 notice」需要清零 `state.notice`。该字段只由 chat-state reducer 的 `notice` action 覆盖，门禁侧**没有**真实通路（`window.__v3.testing` 无该 seam），唯一的机械手段是直接改 DOM —— 而 DOM 会被下一次 render 覆盖（本轮实测：清空后重新测量仍为 223）。要真正清零必须改 `src/**` 增加 seam，**这会让 `dist/sidepanel.js` 字节变化，使编排器已裁决钉死的体积登记值 295,225 B（A1/F8）失效**。
3. 因此本轮选择「**承认稳态**」：夹具确定性做成（每格同一稳态 + 断言），`default@320` 按真值重登记为 223/19/7，**历史值逐字保留**，**阈值与 ceiling 一律未动**。数值方向在该格上是**上调**（唯一一格），其余 21 格不变、无任何格放宽阈值。
4. **未采用**的替代方案（已评估、如实登记）：① 每格新开面板页 → 可让全部格都不带 notice（约 20 格数值下调），但需要重构阶段 B/C 的页面生命周期、把「真实用户的长期会话稳态」排除在测量之外，且与「320 格」的裁决范围不符；② 直接 DOM 清空 notice → 被下一次 render 覆盖，不可靠。若编排器要求按 ① 执行，本轮可另开一轮处置。

### 6.4 收口轮门禁结果（**严格串行、一次一个**、日志全量落盘 `/tmp/opencode/v3-gate-logs/v3-1-closeout/`）

| # | 命令 | 退出码 | 计数（对照 R1 验证轮） | 日志 |
|:--:|---|:--:|---|---|
| 1 | `npx tsc --noEmit` | **0** | 0 error | `10-typecheck.log` |
| 2 | `npm run build` | **0** | `content.js 177,076`（= 上限、零改动）/ `sidepanel.js 295,225` | `11-build.log` |
| 3 | `npm test` | **0** | **732** / 0 failed / 0 skipped（**不变**） | `12-npm-test.log` |
| 4 | `npm run test:supersession` | **0** | **11** / 0（不变）；台账下界 **按本轮实测上调**：l0.mjs 65 → **68**、density.mjs 54 → **60**（`v3GateFloorsNote` 同步；下界只增不减，且「下界 == 实测调用点数」是 RP-V3-05 敏感的**唯一**来源） | `13-supersession.log` |
| 5 | `npm run test:density` | **0** | **127** / 0（对照 105：+24 每格稳态 + 1 默认档确定性 − 0） | `20-test-density.log` |
| 6 | `npm run test:l0` | **0** | **137** / 0（对照 134：+3 = FR-V3-015 同源断言 + 反证 FAIL/还原两段） | `23-test_l0.log` |
| 7 | `npm run test:ui`（journey） | **0** | **167**（不变） | `23-test_ui.log` |
| 8 | `npm run test:insight` | **0** | **108**（不变） | `24-test_insight.log` |
| 9 | `npm run test:binding` | **0** | **192**（不变） | `24-test_binding.log` |
| 10 | `npm run test:hardening` | **0** | **24**（不变） | `25-test_hardening.log` |
| 11 | `npm run test:e2e` | **0** | PASS | `26-test_e2e.log` |
| 12 | 体积三线 | **0** | `content.js 177,076`（sha256 `52a82620…`）/ `sidepanel.js 295,225 ≤ 306,099`（登记值 == 实测产物） | `11-build.log` / `27-size.log` |
| 13 | 零改动核对 | **0** | 判定链 2 hash = pin / `src/content/**` 3 hash = pin / `manifest.json`·`options.html`·`web-cli-base/**`·依赖段 0 diff / `main = 2ddc922` | `28-zero-diff.log` |
| 14 | **反证复跑** | **0** | **RP-V3-01**（+1 可点 → FAIL `C1 8 > 7` → 还原 PASS，6/0）· **RP-V3-03**（4 变体 CSS 隐身计数不降 + `hidden=true` 必降 1，10/0）· **RP-V3-05**（删 1 条断言的副本 → `67 < 台账下界 68` AssertionError 退出 1；逐字节副本 → `override ok (68 ≥ 68)` 11/0 退出 0；原文件 sha256 `4b7b580d…` 未扰动）· **RP-V3-06**（`content.js` +1 B → 2 条断言 FAIL 退出 1 → 重建 → `177,076` / `52a82620…` 复原 → 16/0 退出 0）· **RP-V3-08**（篡改真基线 → FAIL → sha256 复原 → PASS，8/0）· **I1**（还原 pre-fix 早退分支 → `test:l0` **2 条 FAIL**（`moreHidden:false` / 「还有 1 个」）→ `decision-card.ts` sha256 `2e14e49d…` 复原 + 重建回到 295,225 → **137/0 PASS**）· **RP-V3-09**（F7，10/0）· **F1 反证**（移出 `[272,273]` → 逐行打印 `old 272`/`old 273` FAIL → 还原 sha256 `52054fc1…` → 11/0）· **F6 反证**（内联，随 `test:l0`） | `21-RP-*.log` / `27-RP-*.log` / `29-RP-I1-*.log` |

**计数只增不减核对**：插件单测 732（不变）；journey 167；insight 108；binding 192；hardening 24；**density 105 → 127**；**l0 134 → 137**；supersession 11（不变）。
静态口径（确切正则）：`/\btest\(/gm` = **833**、`/(?<![\\w.])test\(/gm` = **741**、`/^test\(/gm` = **732**（均 ≥ 646 下界）。

### 6.5 红线核验（逐条）

| 红线 | 核验方式 | 结果 |
|------|---------|:--:|
| ① 密度阈值恒为 7/15 · 9/20 · 17/35 | `density-metrics.mjs#DENSITY_LIMITS` 逐字 + 台账 `v3CaliberPins` 三条字面量 pin + `density-thresholds.test.ts` | ✅ 未动 |
| ② 不得用 `display:none`/`visibility`/`opacity`/`pointer-events` 规避可点计数（只豁免 `hidden`） | `DENSITY_MEASURE_SOURCE#visibleIn` 仅判 `hidden`；阶段 D 反作弊零命中；**F7 后风险探针与 C1 同向**（CSS 隐身 ⇒ 不可见 ⇒ 不得用于规避） | ✅ 未放宽 |
| ③ `content.js` 恒 177,076 B（无容差、不可重登记） | `stat` + sha256 `52a82620…`；`CONTENT_MAX_BYTES` 未改；构建可字节级重建 | ✅ |
| ④ `manifest.json` 零新增权限、无 `contextMenus` | `git diff c2c0e0d -- manifest.json` = 0；台账 `zeroDiffFiles` | ✅ |
| ⑤ 判定链 sha256 不变（`policy.ts` / `auto-authorize.ts`） | `size-budget.test.ts` 的 `CONTENT_SOURCE_SHA256` + 独立 `sha256sum` | ✅ = pin |
| ⑥ `src/content/**` 三冻结文件零改动 | 同上（三 hash 逐位一致） | ✅ |
| ⑦ 测试只增不减、断言只强不弱（取代逐条登记台账） | 本表 §6.4 计数 + F1 判据由 hunk→**按行**（严格更强）+ F6 由「或」→**同源三处**（严格更强） | ✅ |
| ⑧ 风险位仍 L0 常驻不可折叠 | `density.mjs` 阶段 C（15 格探针）+ `l0.mjs` ④⑤ + 各 15/10 条断言 | ✅ |
| ⑨ ceiling 不得因本轮而抬高 | `SIDEPANEL_CEILING_CAP = 306,099`（上一轮 ceiling）；`SIDEPANEL_CEILING = min(309,986, cap) = 306,099`；V31-S12 断言 `ceiling ≤ previousCeilingBytes` | ✅ 未抬高 |

### 6.6 F8 订正的原文 diff（历史行是否逐字保留）

```text
本叶 spec.md §5 NFR-V3-005
- | **NFR-V3-005** | `sidepanel.js` 基线 266,500 / ceiling 279,825（本叶改 sidepanel 必须过；重登记须显式） |
+ | **NFR-V3-005** | ~~`sidepanel.js` 基线 266,500 / ceiling 279,825~~ → **基线 295,225（实测产物）/ ceiling 306,099**
+ （经显式重登记订正，2026-09-16；容差 5% 未变、ceiling cap 只降不升、断言零删减）（本叶改 sidepanel 必须过；重登记须显式） |

本叶 spec.md §7 AC-V3-016
- | 体积 | **AC-V3-016** | `sidepanel.js` ≤ 279,825 B（基线 266,500；重登记须显式） |
+ | 体积 | **AC-V3-016** | ~~`sidepanel.js` ≤ 279,825 B（基线 266,500）~~ → **`sidepanel.js` ≤ 306,099 B（基线 295,225）**
+ （经显式重登记订正，2026-09-16；容差 5% 未变、ceiling cap 只降不升、断言零删减；重登记须显式） |

本叶 state.json#independence
- "体积守卫（content 177,076 无容差 / sidepanel ≤279,825）"
+ "体积守卫（content 177,076 无容差 / sidepanel ≤306,099（基线 295,225））"
+ "gateSetHistory": ["~~体积守卫（… / sidepanel ≤279,825）~~ —— 收口轮订正（validate R1 F8 + 编排器裁决，2026-09-16）：原文数字保留于此；…"]

父 spec.md（3 处）/ 父 plan.md（5 处）/ 父 state.json#evidenceFacts.sizeGuards
- 279,825 / 266,500  →  ~~279,825~~ → 306,099、~~266,500~~ → 295,225（每处逐字保留原文 + 订正说明）
+ 父 state.json: sidepanelCeilingBytes 279825 → 306099（+ history 数组逐字保留 266500/279825）
```

> 逐字保留核验：`grep -rn "279,825" .sddu/specs-tree-root/specs-tree-web-cli-plugin-v3-ui/{spec.md,plan.md,state.json,specs-tree-v3-1-l0-shell-density/{spec.md,plan.md,state.json}}`
> —— 每一命中都带 `~~…~~ → …` 历史标记或 `history` 字段；**没有**任何一处被静默改写。

### 6.7 收口轮剩余项（如实登记，未假装已做）

| # | 项 | 状态 |
|---|----|------|
| R1 | 夹具「无 `#notice` 会话态」的测量能力 | **未做**（需 `src/**` 增加清除通路 → 会破坏 A1 钉死的 295,225 B）；已在 `docs/v3-density-baseline.json#fixtureAsymmetry.residual` 登记 |
| R2 | 兄弟叶 v3-2 / v3-3 / v3-4 的 `spec.md` / `state.json` / `tasks.*` 与父 `discovery.md` **仍含旧 ceiling 279,825** | **未改**（超出本轮裁决范围：裁决只点名本叶 + 父 spec/plan）；建议各叶开工时按 §6.6 同一方式同步 |
| R3 | 既有 deferred（RP-02b/03/04 读取侧副本、`package.json` 台账覆盖面、7px 几何薄余量） | **不变**（本轮未触及） |
| R4 | 人工面 6 项（主题观感 / 动画体感 / 窄栏真实体感 / 多显示器 / 原生权限弹窗 / 真实侧栏 IME） | **⏳ 未执行**（headless 不可合成，不冒充 PASS） |

## 7. 下一步

| 场景 | 操作 |
|------|------|
| 全部任务已完成 + review R1 的改进项已修复 + validate R1 的 F1~F9 已处置（收口轮） | 运行 `@sddu-validate specs-tree-v3-1-l0-shell-density` 复核收口轮（重点：§6.2 的 F1 按行判据与 F7 探针、§6.3 的 A6 张力是否被接受） |
| 若需再审查本轮修复 | 运行 `@sddu-review specs-tree-v3-1-l0-shell-density`（R2 轮：建议重点复核 §5.1 的 I1/I4/I5/I8 四项与 `deferred` 三条） |

## 8. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：V3-1 全量实施（15 任务 / 7 波）、全门禁绿（串行、日志全量落盘）、6 条反证实跑、首轮真实产物密度基线（三档 × 三视口 + 与设计稿口径分列 + C4 登记）、取代台账与门禁、体积显式提升重登记；偏差与人工面如实登记 | 2026-09-16 | SDDU Build Agent |
| v1.1 | **修复轮**：I1~I8 中severity 全部修复（含 1 处状态机缺陷 + 门禁盲区、2 处 AC 证明力不足、1 组台账保真、1 组披露保真）；机械型低severity I9~I17 全部修复；`build.md §1` 计数按 `git diff` 复算订正；新增门禁阶段 F（基线机器比对）+ RP-V3-08 + I1 修复反证；3 项如实登记为 deferred；体积按真实产物重登记且 ceiling 未抬高 | 2026-09-16 | SDDU Build Agent（修复轮） |
| v1.2 | **收口轮**（validate R1 之后）：F1 台账判定改**按行包含**并补登 3 行；F2/F3/F4/F5/F9 逐条订正为可复现值（732 / 833·741·732 + 确切正则 / 39·15·11 / 22 格机器计算 / 检查名对齐）；F6 走**登记豁免**并新增「三处同源」可 FAIL 断言 + 内联反证；F7 风险探针上移为口径单源并补 `visibility`/`opacity` 判定 + 新增 RP-V3-09；F8 按裁决**订正不豁免**（本叶 spec/plan/state + 父 spec/plan/state 共 12 处，历史逐字保留）；夹具改确定性两遍 + `default@320` 重登记 194/18/6 → 223/19/7（历史保留；A6 张力如实上报）；新增 §6 收口轮章节；门禁严格串行全 0，density 105→127 / l0 134→137 | 2026-09-16 | SDDU Build Agent（收口轮） |
