# 任务分解：specs-tree-web-cli-plugin-v45-f-regularization（web-cli-plugin v4.5「F 还原度转正」；父 Feature 统领性任务总览）

> **文档定位**: SDDU 任务清单（**父 / 跨切总览与索引**）— 记录波次总表、唯一叶任务索引、跨切红线 → 任务映射、原子区间与收口硬条件，作为审查与收口的单一参照。**本文件不含可执行任务**（父为轻量规范容器，不承接 build/review/validate）
> **前置依赖**: 本目录 `plan.md` v1.0（跨切契约 / N1~N18 红线 / T1~T10 不动面 / 五波序）+ `spec.md` v1.0（44 FR / 22 AC / §11 37 条去向）+ `discovery.md` v1.0（R-REG-001~015 / R-REG-901~906）+ 唯一叶 `specs-tree-v45-1-single-write-chronology/tasks.md` v1.0（**19 原子任务正文**）
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-21
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-09-21
> **更新说明**: 初始创建（父总览：单叶结构下的五波总表 + `TASK-V45-101~119` 索引 + 编排器覆盖面 ①~⑭ → 任务映射 + 4 个提交区间 + 24 门禁守恒总表 + 停机规则 7 条 + 偏差登记）

---

## 0. 结构登记（**单叶 Feature**）

| 项 | 内容 |
|---|---|
| 父 Feature 定位 | **轻量规范容器**（父 `spec.md §12.1`）：不承接 build/review/validate；`depth=1` / `childrens` 结构不变 |
| 叶数量 | **1（唯一叶）**：`specs-tree-v45-1-single-write-chronology`（`depth=2` / `leaf:true` / `deliveryOrder.position=1`） |
| 为何单叶 | 两项核心（5 条提示带单写化 / 4 宿主时间序化）共享**同一次体积重登记**与**同一次 journey 结构重锚** ⇒ 门禁迁移不可分割（父 §12.1） |
| 本轮父产物偏差 | 父产出 `tasks.md` / `tasks.json`（**总览型，无可执行任务**）—— 与 v4 先例（`ADR-V4-001`）同口径显式登记；容器内核仍遵守（父不承接 build/review/validate；实施全由唯一叶承载） |
| ADR 所有权 | 12 条 ADR（`ADR-V45-001~012`）**全部由唯一叶承载**（正文在叶 `plan.md §7`；父 `plan.md §7` 为索引） |
| 编号空间 | `TASK-V45-1xx`（`101~119`）—— 与 v1 `TASK-001~040` / v2 `2xx~3xx` / v3 `4xx` / v4 `5xx~8xx` 零冲突（本轮实测 `grep -rn "TASK-V45" .sddu/ = 0`） |

---

## 1. 波次总表（ADR-V45-012 五波）

| 波 | 名称 | 任务数 | 任务（叶内） | 提交区间 | 退出判据（简版） |
|:--:|---|:--:|---|:--:|---|
| **W1** | 门禁脚手架 / 断言预迁移 | 3 | `101` `102*` `103*` | **A** | 3 个新 node 门禁骨架就位；`EXPECTED_AUDITED_FILES` 追加；`CHROMIUM_GATES` 保持 9；失效断言先改写（声明 `expectFailPattern`）；**2 个 spikeGate 结论产出** |
| **W2** | strips 单写 | 3 | `104` `105` `106` | **B** | emitter 唯一 + 5 条提示带 DOM 真退役 + 归并矩阵新语义 + 「载体数 == 1」+ 4 组反证；15 门禁 44 处引用重写（≥原值） |
| **W3** | 宿主退役 + 元素迁移 | 6 | `107` `108` `109` `110` `111` `112` | **C** | `#stream` 零宿主 + 纯卡序；`messageAnchor` 迁移；卡内化（ref / ask / auth）；`#composer` 出流；L1 组 4 去向；`disclosure` 三声明；`host-registry` 零宿主判据；recovery/act/帮助分区 |
| **W4** | 门禁重算 + journey 取代 + 密度 | 4 | `113` `114` `115` `116` | **D**（与 W5 原子） | 11 处等价重锚全绿 + 反证注入点重写；journey 新 pin + `supersessionChain`；binding 保段 + 段外登记；density 31 格 `v45Ledger` + 夹具三重构造判据 |
| **W5** | 收尾 | 3 | `117` `118` `119` | **D**（与 W4 原子） | `options` 解冻 + 范围门禁 + `zero-injection` 复跑；体积五要素（`direction:'lowered'`）+ 三值同源 + 档位闸门；24 门禁串行全绿 + 红线逐字节 + 人工面清单 + 收口文档 |
| **合计** | — | **19** | `TASK-V45-101~119` | 4 区间 | 规模分布 **S×2 / M×6 / L×11**；**spikeGate ×2** |

`*` = **spikeGate（先验闸门）**：`102` → 闸 `114`；`103` → 闸 `113`。结论 = `report-to-orchestrator` ⇒ 下游**暂停并上报**（禁静默改 pin / 禁静默降级）。

---

## 2. 唯一叶任务索引（正文见叶 `tasks.md` / `tasks.json`）

| # | 任务 ID | 波 | 规模 | 标题 | 主 ADR |
|:--:|---|:--:|:--:|---|---|
| 1 | `TASK-V45-101` | W1 | M | 门禁脚手架三件套 + 受审集合追加 + 计数只增对账表 | 012/010/007/008 |
| 2 | `TASK-V45-102` | W1 | S | **spikeGate-A**：binding 段前字节中立避让可行性探针 | 005 |
| 3 | `TASK-V45-103` | W1 | S | **spikeGate-B**：journey `#15a~#15q` 等价改写 + 链式 superseder 预演 | 004 |
| 4 | `TASK-V45-104` | W2 | L | `STRIP_CHANNEL_KINDS` 重构 + `appendSystem` 单写收口 + `#send-reason` 保留 | 001 |
| 5 | `TASK-V45-105` | W2 | L | 5 条提示带 DOM 真退役 + `firstRunCard` 归并 + `title` 净化承载 | 001 |
| 6 | `TASK-V45-106` | W2 | L | strips 15 门禁 / 44 处断言重写（≥原值）+ 载体数 == 1 + 4 组反证 | 001 |
| 7 | `TASK-V45-107` | W3 | M | `messageAnchor` 迁移（→ `null`）+ 4 宿主 DOM 移除 + `#stream` 纯卡序 | 002 |
| 8 | `TASK-V45-108` | W3 | L | `decision` 壳元素卡内化（ref / askuser·auth / receipt 固化区） | 002 |
| 9 | `TASK-V45-109` | W3 | L | `l1-panels` 4 开关去向 + L2 只读承载块（树归因 / 审计证据 / 审计计数） | 002 |
| 10 | `TASK-V45-110` | W3 | M | `#composer` 出流（body 尾 `hidden`）+ `disclosure.ts` 三份声明重写 | 003/002 |
| 11 | `TASK-V45-111` | W3 | M | `host-registry` 零宿主反向判据 + `RETIRED_*` 扩容 + `l0` 结构判据 + 5 组伪造反证 | 010 |
| 12 | `TASK-V45-112` | W3 | L | `risk-recovery` 扩展 + act 闭集 6 项 + 本地 act 布线门禁 + 设置「帮助」分区 | 007/008 |
| 13 | `TASK-V45-113` | W4 | L | journey 第二次八步显式取代 + `supersessionChain` + 链式判据升级 | 004 |
| 14 | `TASK-V45-114` | W4 | M | binding 保段落地 + 段外逐行登记 | 005 |
| 15 | `TASK-V45-115` | W4 | L | 11 处门禁等价重锚 + 反证注入点重写 | 012/001/002 |
| 16 | `TASK-V45-116` | W4 | L | density 31 格实测重算 + `v45Ledger` + 夹具三重构造判据 | 006 |
| 17 | `TASK-V45-117` | W5 | M | `options/index.html` 解冻 + 范围门禁 + `zero-injection` 复跑 | 009 |
| 18 | `TASK-V45-118` | W5 | L | 体积五要素双向登记 + V3-VOL-3 三值同源 + 档位闸门 | 011 |
| 19 | `TASK-V45-119` | W5 | L | 收尾原子区间：24 门禁串行 + 红线逐字节 + 人工面清单 + 收口文档 | 012/011 |

**关键路径**：`101 → 104 → 105 → 106 → 107 → 108 → 109 → 110 → 111 → 112 → 115 → 113 → 116 → 118 → 119`
**可并行组**：`{102,103,101}` · `{114,115}` · `{117,113}`

---

## 3. 编排器覆盖面 → 任务映射（①~⑭ **逐项不漏**）

| # | 覆盖面 | 承载任务 |
|:--:|---|---|
| ① | host-registry 零宿主断言 + `RETIRED` 扩容 | `111`（+`107`） |
| ② | 5 通道 DOM 真退役 + 15 门禁 44 处 id 引用断言重写（数量 ≥ 原值） | `105` + `106`（+`104`） |
| ③ | decision 壳元素迁移（选项池 / 后果预演 → ask·auth 卡；receipt → 固化区；ref 证据 + 三恢复按钮 → ref 卡） | `108`（+`109`） |
| ④ | l1-panels 4 开关去向（局部树 → L2 树视图 / 历史退役 + 计数入审计标题 / 回执 → 审计 / 手势 → 设置帮助分区） | `109` + `112` |
| ⑤ | composer 迁 body 尾 | `110` |
| ⑥ | journey `supersessionChain` 第二次八步取代 | `113`（闸 `103`） |
| ⑦ | binding 字节中立避让 + 段外迁移 | `114`（闸 `102`） |
| ⑧ | density 31 格重算 + 台账 + `v45Ledger` | `116` |
| ⑨ | risk-recovery 扩展（site/probe + rebind/help，act 6 项 + 布线门禁） | `112` |
| ⑩ | options 解冻 + 文案订正 | `117` |
| ⑪ | 体积五要素双向登记 | `118` |
| ⑫ | l0 / l1 / disclosure / system-merge 断言重写 | `115` + `111` + `110` |
| ⑬ | 反证重写（注入点随形态搬迁） | `115` + `106` / `111` / `113` / `114` / `116` |
| ⑭ | 文档收尾 | `119` |

---

## 4. 跨切红线 → 任务守线映射（**继承父 §2.4 N1~N18**）

| 红线 | 内容 | 守线任务 |
|---|---|---|
| N1 | 三区法则（工具栏 ≤5 可点 / 流 = 唯一交互面 / 状态栏永不折叠）逐字不动 | `107` `110` `115` |
| N2 | `DENSITY_EXCLUDED_SUBTREES = ['#stream']` 单源不动 | `107` `116` |
| N3 | 密度阈值 `7/15 · 9/20 · 17/35` 逐字不动 | `116` `115` |
| N4 | 防滥用（单卡 ≤6 / 首屏 ≤2 / 合计 ≤8 / 欢迎卡 ≤1 / 文案 ≤8 行）逐字不动 | `105` `116` |
| N5 | 风险位永不折叠（状态栏本体 / `#risk-chips` / `#risk-rail` / `#risk-detail`）逐字保留 | `110` `115` |
| N6 | `STREAM_HEIGHT_RATIO_MIN = 0.65` 只允许上调 | `113` `110` |
| N7 | `dist/content.js` 177,076 B / `52a82620…` 零容差 | `118` `119` |
| N8 | `dist/pick-layer.js` 33,900 B / `5f567d7e…` 零容差 | `118` `119` |
| N9 | `design/**` + `option-f-shim.mjs` 双 sha256 + 60 断言零触碰 | `118` `119` |
| N10 | `manifest.json` 零新增权限 / 无 `contextMenus` / 判定链内容哈希零改动 | `118` `119` |
| N11 | `docs/v3-supersession-ledger.json` 零 diff（冻结历史） | `113` `114` `117` `119` |
| N12 | 断言零删除零降级、计数只增不减（唯一例外 = 保护段显式取代 + 台账留痕） | `101` `106` `113` `115` |
| N13 | 反证必须实跑（注入 → FAIL → 逐字节还原 → PASS）；禁「删属性充数 / 自我裁决 / 换口径放松」 | `106` `111` `113` `114` `115` `116` |
| N14 | 门禁严格串行（一次一个 Chromium，`finally` 自清 profile） | `115` `116` `119` |
| N15 | `git add` path-limited（禁 `git add -A` / `.`）；不 force push；不合 `main`；无新依赖 | `119` |
| N16 | `SIDEPANEL_CEILING_CAP` 保持 `record-only`（不设自缚装置） | `118` |
| N17 | V3-VOL-3 三值同源（档位 512,000 / 绝对上限 563,200 不变；`authorConfirmation` 保持 `pending-author-line`） | `118` |
| N18 | `KL-N-10`（binding 环境性 flake）：隔离复跑 ≥2、仍红如实登记**不阻塞收口** | `114` `119` |

---

## 5. 原子区间与收口硬条件（ADR-V45-012 §6/§8）

### 5.1 提交区间

| 区间 | 任务 | 原子性要求 |
|:--:|---|---|
| **A**（W1） | `101` `102` `103` | 探针结论**不入版本库**（`/tmp/opencode/v45-spike/`）；门禁骨架 + 受审集合追加同区间 |
| **B**（W2） | `104` `105` `106` | 完成前**不得**跑 journey / density 收口判据 |
| **C**（W3） | `107` ~ `112` | 终态 DOM 在本区间形成 |
| **D**（W4+W5） | `113` ~ `119` | **单一原子区间**：终态 DOM + 新 pin + 密度台账 + 体积登记 + 门禁日志**必须一次落盘**；中间态不得单独提交；失败 ⇒ 整区间回滚重跑（R-V45-109） |

### 5.2 收口硬条件（全部满足方可收口）

1. 各门禁计数 ≥ 基线（见 §6）；`CHROMIUM_GATES` 保持 9。
2. **无「不再 FAIL 的判据」遗留**（每条改动判据注入后必红；`expectFailPattern` 声明数只增）。
3. 台账 hunk ↔ 条目全命中 + `newTitle` 可定位 + `reason ≥ 40`。
4. 保护段判据全绿（journey 新 pin + `supersessionChain`；binding 保段 sha + `startByte 107780`）。
5. 密度 31 格逐格留痕（`v45Ledger`）；阈值零 diff；夹具锚由**构造**保证。
6. 体积五要素（含 `direction`）与 V3-VOL-3 三值同源；档位 512,000 与绝对上限 563,200 不变。
7. 红线 N7/N8/N9/N10/N11 + 不动面 T1~T10 逐字节 / 逐项零 diff。
8. 人工面清单逐项标注（`⏳ 未执行` 或 `PASS`，**不得冒充 PASS**）。

### 5.3 停机规则（**遇到即停下上报编排器**）

| 触发 | 停机点 | 处理 |
|---|---|---|
| binding 段前等长补偿不可行 | `102` → `114` | 上报证据；获批后走 binding pin 显式取代（链式八步）；**禁静默改 pin** |
| journey 新 pin 无法命中 / 链断 | `103` → `113` | 回八步 ①~④；**禁改 v3 台账** |
| 净减 > 19,225 B（`< 460_801`）或 `size > ceiling` | `118` | 停下上报（禁静默改三值 / 禁自缚装置 / 禁故意增重） |
| 任一密度登记格 C1/C2 > 阈值 | `116` | 停下上报（阈值零放宽；禁删格 / 挪回 `#stream`） |
| 反证恒绿（注入后仍绿） | `106` / `111` / `115` / `116` | 重写注入点；仍不能红 ⇒ 判据无效并上报 |
| `KL-N-10` 首轮异常 | `114` / `119` | 隔离复跑 ≥2；仍红如实登记**不阻塞收口** |

---

## 6. 门禁守恒总表（**跨切，24 项；父级下方界**）

| 门禁 | 下界 | 门禁 | 下界 |
|---|---:|---|---:|
| `typecheck` / `build` | PASS | `test:journey`（`test:ui`） | ≥167 |
| `plugin npm test` | ≥1001 | `test:insight` | ≥116 |
| `test:l0` | ≥223 | `test:binding` | ≥192 |
| `test:l1` | ≥111 | `test:hardening` | ≥24 |
| `test:l2` | ≥74 | `test:page-input` | ≥106 |
| `test:density` | ≥175 | `test:stream` | ≥63 |
| `test:ask-auth` | ≥61 | `test:recommendation` | ≥56 |
| `test:ref-pick-wiring` | ≥11 | `test:supersession` | ≥33 |
| `test:size-ruling-vol3` | ≥10 | `test:l1-reverse` / `test:l2-reverse` | ≥9 / ≥10 |
| `test:zero-injection` | ≥27 | `test:design-contract` | ≥6 |
| `test:e2e` | PASS | `test:gate-integrity` | ≥12 |

**新增门禁 3 项**（纳入 `EXPECTED_AUDITED_FILES`，`CHROMIUM_GATES` 不变）：`test/host-registry.test.ts` · `test/local-act-wiring.test.ts` · `test/settings-help.test.ts`。

---

## 7. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（父级**总览型** tasks：单叶结构登记 + 五波总表（W1~W5 / 19 任务 / S×2·M×6·L×11 / 2 spikeGate）+ `TASK-V45-101~119` 索引 + 编排器覆盖面 ①~⑭ → 任务映射 + 跨切红线 N1~N18 → 守线任务映射 + 4 提交区间与收口硬条件 8 条 + 停机规则 6 条 + 24 门禁守恒总表 + 3 新门禁；**无可执行任务**（父为轻量规范容器，实施全由唯一叶承载））。**本阶段只做 tasks**：不写代码、不改 `src/**`·`test/**`·`dist/**`·`docs/**`·`design/**`·ROADMAP，不动 `main`，**不跑门禁 / 构建 / Chromium**，**未调用任何受管 Provider**（routing.v1 = `local_or_compute → none`）。 | 2026-09-21 | SDDU Tasks Agent |
