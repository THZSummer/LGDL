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
| 新增文件 | **13** 个（4 src + 4 test/ui + 2 test + 3 docs） |
| 修改文件 | **12** 个（3 src + 1 package.json + 6 测试 + 2 size/baseline 相关…详见 §2） |
| 波次 | 7 波全部按序完成（Wave 1→7，门禁严格串行） |

**门禁总览（全部绿，严格串行、日志全量落盘 `/tmp/opencode/v3-gate-logs/`）**

| 门禁 | 结果 | 计数 |
|------|------|:--:|
| `npm run typecheck` | ✅ 0 error | — |
| `npm run build` | ✅ | `content.js 177,076`（= 上限）/ `sidepanel.js 294,874` ≤ ceiling 306,099 |
| `npm test` | ✅ | **725** passed / 0 failed（下界 646 → 只增） |
| `npm run test:supersession` | ✅ | 8 passed / 0 failed（hunk 全命中台账 + protectedRanges hash + 计数下界） |
| `npm run test:density` | ✅ | **97** passed / 0 failed（阶段 A~E + 9 强制格 + 15 登记格） |
| `npm run test:l0` | ✅ | **74** passed / 0 failed |
| `npm run test:ui`（journey） | ✅ | **167** 断言（不变） |
| `npm run test:insight` | ✅ | **108** 断言（不变） |
| `npm run test:binding` | ✅ | **192** 断言（不变） |
| `npm run test:hardening` | ✅ | **24** 断言 |
| `npm run test:e2e` | ✅ | PASS |
| 体积三线 | ✅ | `content.js` 177,076（无容差、零改动）/ `sidepanel.js` 294,874 ≤ 306,099 |
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
- 消息区下界：`#log` clientHeight 首轮实测 498px（含待答决策卡最坏情形）→ 登记下界 **488px**（取代 v2 的 589px 锚点，ADR-V3-019 V31-S3；**只允许上调**）。

**取代台账**：`packages/web-cli-plugin/docs/v3-supersession-ledger.json`（base `c2c0e0d`；`counts` 5 项 + `gateFloors` + `v3GateFloors` + `protectedRanges`（journey `#15a~#15q` / binding `#21*`+`#22*` 字节 hash）+ `modifiedRanges`（26 条）+ `entries`（9 条）+ `zeroDiffFiles`（12 项））；门禁 `test/supersession-ledger.test.ts`（`countMethod` 唯一合法值 `runtime-check-calls`、`newTitle` 可定位、`--files-override` 供 RP-V3-05）。

**体积重登记（条件触发 → 已触发并显式完成）**：`sidepanel.js` 266,500 → **291,523 B**（+25,023 / +9.4%，L0 骨架 + 折叠控制器的**有意增重**）；ceiling 279,825 → **306,099 B**（= floor(291,523 × 1.05)）；容差 **5% 不变**；`targetBudgetBytes` / `targetMet` 保持 `null`；历史值全保留；断言零删减（仅按实测值重 pin 并加方向敏感断言）；+1B 反证在**新 ceiling** 上重跑。`content.js` **无容差、不可重登记**，本轮零改动（177,076 B）。

## 2. 文件变更

### 2.1 新增（13）

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

### 2.2 修改

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

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：V3-1 全量实施（15 任务 / 7 波）、全门禁绿（串行、日志全量落盘）、6 条反证实跑、首轮真实产物密度基线（三档 × 三视口 + 与设计稿口径分列 + C4 登记）、取代台账与门禁、体积显式提升重登记；偏差与人工面如实登记 | 2026-09-16 | SDDU Build Agent |
