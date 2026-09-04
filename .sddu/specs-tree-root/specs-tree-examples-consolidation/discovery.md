# 问题挖掘报告：specs-tree-examples-consolidation（示例图整合）

> **文档定位**: SDDU 问题挖掘报告 — 记录用户问题、痛点和场景，作为 spec 阶段的输入（本 Feature 为**摸底型 discovery**：作者指令已闭环——"整合示例图：9 种图类型各保留一张、每张尽量体现该类型所有特性"，无访谈，聚焦**磁盘孤儿清单核实 + 9 类型特性覆盖缺口盘点 + 引用面/联动面清单 + gen-examples 现状 + golden 快照现状**，全部结论带代码证据，文件:行号）  
> **前置依赖**: 无（工作流起点；前置事实：specs-tree-render-gate 已建 golden 快照门禁（11 组）、engine-defect-fixes 已闭环（M1~M5），两 Feature 均判定"磁盘孤儿处置 / gen-examples 修复 / 产物重生成"**不在其范围、待作者另立 Feature** → 本 Feature 即该决策的落地载体，见 specs-tree-render-gate/{spec.md:51,72,75,225-226}）  
> **创建人**: SDDU Discovery Agent  
> **创建时间**: 2026-09-03  
> **版本**: v1.0  
> **更新人**: SDDU Discovery Agent  
> **更新时间**: 2026-09-03  
> **更新说明**: 初始创建 — 摸底型（只读盘点 + 产物落盘）：磁盘孤儿精确清单（10 个，逐个核实 type）/ 11 例 type 分布 / 9 类型特性覆盖矩阵 / 引用面清单 / gen-examples 断裂实证 / golden 快照现状

---

## 0. 执行摘要

| 维度 | 结论 | 关键证据 |
|---|---|---|
| 磁盘孤儿 | **精确 10 个** .lgdl（均带 .svg/.png 三件套），非 12 个（state.json description 口径把将随 examples.ts 缩编而"成孤儿"的 microservices/login-flow 一并计入；达成磁盘 21→9 需删 **12 组** = 10 孤儿 + 2 重复例） | examples/ 实有 63 文件 = 21 组三件套（实测）；examples.ts 仅 11 例（详见 §2.1/§2.2） |
| type 分布 | examples.ts 11 例 = arch×2 / flowchart×2 / datastream·er·gantt·mindmap·sequence·state·uml-class 各 ×1（9 类型全覆盖） | 脚本实测 11/11 磁盘镜像逐字一致（§2.2） |
| 特性缺口 | er：基数值域仅 `1`/`*`（缺 0..1 / 0..* / 1..* / n:m）；gantt：里程碑 duration=1（应 0）、依赖 4 边全 gap≈0（缺 gap≥20 / 目标在左）；另观察项：删 login-flow 后 A 档失去唯一 2 层嵌套 group | examples/er.lgdl:50-61；examples/gantt.lgdl:31-34；kind-coverage.test.ts:174-187（§2.3） |
| 引用面 | **11 处需联动**：镜像 examples-sources.ts / golden 11 组 / snapshot / matrix-a / kind-coverage / matrix-b（对照组）/ App.tsx / op-cli 文档串 / README / 2 个生成脚本 / 磁盘产物 | §2.4 |
| gen-examples | **链路已断**（实测 ERR_MODULE_NOT_FOUND）：import 旧包路径 `../packages/core|layout|render/dist`、读 `packages/web/src/examples.ts`，V2 9 包重命名后全部失效；修复 = 换 4 处路径（现包均 ESM 且 dist 已构建） | scripts/gen-examples.mjs:15-20 实测报错（§2.5） |
| golden | 现 11 组 svg + manifest.json（version 1 / ids 11 / files 11 sha256）；更新门 LGDL_UPDATE_SNAPSHOTS=1 显式重建；整合后 11→9 | §2.6 |

---

## 1. 问题定义与需求本质

### 1.1 核心问题

| 核心问题 | 业务影响 | 不解决的成本 |
|---|---|---|
| **示例冗余重复**：arch / flowchart 各 2 张高度同型（architecture vs microservices、login-flow vs ecommerce-flow），示范价值重叠 | 示例集是"该类型正确写法"的官方范本（README 图库 + lgdl-web 侧栏 + list-examples），重复例稀释示范密度 | 维护成本翻倍（11 张要维护的内容实际只有 9 类） |
| **磁盘孤儿堆积**：examples/ 21 个 .lgdl 中 10 个无单一事实源（examples.ts）对应，其中 9 个是 2026-08-24 AI 视觉评审历史产物（README:37-39 仍引用），1 个（group-node-demo）无任何引用 | 磁盘产物与单一事实源脱节（render-gate discovery §3.4 已记录）；孤儿被误读为官方推荐写法 | 孤儿持续漂移、无人维护，误导新读者与 AI Agent |
| **特性覆盖不全**：er 例仅演示 `1..*` 一种基数形态（缺可选基数/多对多）；gantt 例里程碑用 duration=1、依赖仅 gap≈0 背靠背（缺里程碑 duration=0 语义与依赖三型） | "每类型一张示范图"是作者明确诉求（state.json:9），残缺样例无法承担"全特性范本"职责 | 写作者参考残缺样例 → DSL 正确特性（基数四值/里程碑/依赖三型）得不到示范传播 |
| **产物生成链路断**：gen-examples.mjs（及 render-one.mjs）import 旧包路径，V2 9 包体系后失效 | examples/*.lgdl/.svg/.png 无法再重新生成（render-gate spec NG-002 记录"链路已断"） | 示例内容整合后无法重建磁盘产物三件套 |

### 1.2 需求本质（作者已对齐，state.json:9,15）
整合示例图：9 种图类型各保留一张示例图，每张尽量体现该类型所有特性。目标 9 张已圈定（flowchart 电商下单全流程 / mindmap AI 技术选型 / uml-class 订单系统类图 / arch Web 应用系统架构 / datastream 订单数据流 / sequence 用户登录时序 / er 电商 ER 图（补多基数 0..1/0..*/1..*/n:m）/ state 订单状态机 / gantt 产品发布甘特图（补里程碑 duration=0 + 依赖三型））。删 microservices、login-flow 两重复例；磁盘 21→9 组（lgdl/svg/png 三件套）；golden 快照 11→9 组显式重建；matrix-a 镜像 + kind-coverage/matrix-b 引用联动。**约束**：9 图类型不变、零新 DSL 语法、快照显式重建 + diff 审阅、测试守恒（state.json scope）。

---

## 2. 摸底盘点

## 2.1 磁盘孤儿清单（examples/ 目录，21 vs 11 对应）

**实测**：examples/ 共 63 文件 = 21 组 `.lgdl` + `.svg` + `.png` 三件套（`ls | wc` 21 .lgdl / 42 svg+png）。examples.ts 有 11 个 EXAMPLES id，磁盘对应 .lgdl 与 examples.ts source **逐字一致 11/11**（node 实测）。其余 **10 个孤儿**（逐文件读 `type:` 字段核实）：

| # | 孤儿 .lgdl（.svg/.png 同存） | 核实 type 字段 | 引用情况 | 与 9 类型对应 |
|---|---|---|---|---|
| 1 | arch-ecommerce.lgdl | `type: arch` | README.md:39 + ai-vision-review.md:53（AI 评审产物） | arch |
| 2 | datastream-log.lgdl | `type: datastream` | README.md:38 + ai-vision-review.md:54 | datastream |
| 3 | er-orders.lgdl | `type: er` | README.md:39 + ai-vision-review.md:55 | er |
| 4 | flowchart-auth.lgdl | `type: flowchart` | README.md:37 + ai-vision-review.md:49 | flowchart |
| 5 | gantt-saas-roadmap.lgdl | `type: gantt` | README.md:39 + ai-vision-review.md:57 | gantt |
| 6 | group-node-demo.lgdl | `title: 分组即节点…` + `type: flowchart` | **无任何引用**（render-gate discovery §3.4 亦记录） | flowchart |
| 7 | mindmap-product.lgdl | `type: mindmap` | README.md:37 + ai-vision-review.md:50 | mindmap |
| 8 | sequence-order.lgdl | `type: sequence` | README.md:38 + ai-vision-review.md:51 | sequence |
| 9 | state-order.lgdl | `type: state` | README.md:39 + ai-vision-review.md:56 | state |
| 10 | uml-class-order.lgdl | `type: uml-class` | README.md:38 + ai-vision-review.md:52 | uml-class |

**口径澄清（重要）**：state.json description/scope 写"12 个孤儿"，但**精确孤儿 = 10**（上表）。`12` 是"达成磁盘 21→9 需删除的组数" = 10 孤儿 + microservices/login-flow（这两个 examples.ts 缩编后磁盘镜像即成孤儿，连同其 .svg/.png 一并删）。两个口径差异需 spec/tasks 沿用"删 12 组 = 10 孤儿 + 2 重复例镜像"的精确表述。

**其它事实**：11 个非孤儿 id 磁盘文件与 examples.ts 逐字一致（`packages/lgdl-web/src/examples.ts` 为单一事实源，见 examples.ts:1-6 文件头注释 "THE single source of truth"）；9 个 AI 评审孤儿同时被 README.md:37-39 与 docs/reviews-2026-08-24/ai-vision-review.md:49-57 引用（删除属历史记录清理决策，见 §2.4 #11/#13）；孤儿 type 与 9 类型一一映射，无新增类型。

## 2.2 examples.ts 11 例的 type 分布

**证据**（脚本实测解析 examples.ts，正则与 gen-examples.mjs:25 同构）：EXAMPLES count = 11，type 分布：

| type | 例数 | id（examples.ts 行号） |
|---|---|---|
| arch | 2 | architecture(:15-19)、microservices(:22-25) |
| flowchart | 2 | login-flow(:42-45)、ecommerce-flow(:48-51) |
| datastream | 1 | datastream(:27-30) |
| er | 1 | er(:32-35) |
| gantt | 1 | gantt(:37-40) |
| mindmap | 1 | mindmap(:53-56) |
| sequence | 1 | sequence(:58-61) |
| state | 1 | state(:63-66) |
| uml-class | 1 | uml-class(:68-71) |

9 类型全覆盖，其中 arch / flowchart 各冗余 1 张（删除对象）。磁盘 11 例 .lgdl 与 examples.ts source 逐字一致 11/11（实测），可作为 line 级引用（磁盘 .lgdl 有行号、examples.ts source 是单行超长字符串）。

## 2.3 9 类型特性覆盖矩阵（现有示例缺哪些）

> **特性定义源**：lgdl-spec.md 图类型表(:21-31) + kind 差异表(:50-85) + Edge 基数/聚合边(:87-123) + Group 嵌套(:125-149) + attrs(:151-161)；渲染/布局特性由引擎代码与矩阵测试佐证（render/layout 实现 + kind-coverage.test.ts + matrix-b B7/B8/B4b）。
> **覆盖判定对象** = 目标保留的 9 张（微服务/登录流程两删除例不评）。

| 类型（保留例） | 该类型特性（来源） | 现有覆盖 | 缺 / 观察项 |
|---|---|---|---|
| **flowchart**（ecommerce-flow 电商下单全流程） | start/end 药丸、process、decision 菱形多分支、group 容器、聚合边 g→g、无 kind 回退 process（spec :56-62；kind-coverage :52-96） | start browse / end×4 / process×6 / decision×4（validate·lock-stock·pay·risk）/ 分支 label（校验通过/库存不足/风险拦截…）/ group 4 域平铺（examples/ecommerce-flow.lgdl）/ 聚合边 trade→fulfillment、fulfillment→after-sale（:109-112） | ① **删 login-flow 后 A 档失去唯一 2 层嵌套 group**（frontend 含组 auth，examples/login-flow.lgdl；kind-coverage.test.ts:174-187 断言"外含内"）→ 需 spec 决策是否在保留 9 张内补嵌套载体 ② 混合聚合边 n→g 在 flowchart A 档无（architecture 有 n→g，见下行；g→n 仅 B5 档） |
| **arch**（architecture Web 应用系统架构） | TB+分组；全 kind 混排（start/process/entity/note）；group 容器（process+entity+note 混合成组）；聚合边 g→g / n→g 混合；note 便签折角（kind-coverage :114-123） | 10 节点全 kind + 3 组平铺 front/core/data（examples/architecture.lgdl:38-46）+ 聚合边 front→core、core→data（g→g :71-76）+ **user→core 混合聚合边 n→g（:77-79）** + note（:10-11 kind: note） | 基本无（g→n 型聚合边 A 档无，属 B5 档覆盖项；如需 A 档体现全三型可并入） |
| **mindmap**（AI 项目技术选型） | 径向多级树；decision 叶折叠为圆角 rect（matrix-b B3：matrix-b.test.ts:124-132）；无 kind 叶回退 process（kind-coverage :201-207） | root → models/framework/deploy → llm·vision·rag·agent·cloud·edge 两级展开；rag/agent 为 decision kind；llm/vision/cloud/edge 无 kind（examples/mindmap.lgdl:5-29） | 基本无 |
| **sequence**（用户登录时序） | 参与者列（非 group 节点即参与者）；消息双向往返；label = 消息语义；group 不产生参与者（B4a：matrix-b.test.ts:138-142） | 4 参与者（user/browser/server/db）+ 6 消息含 3 反向（db→server / server→browser / browser→user，examples/sequence.lgdl:18-35） | 无 |
| **uml-class**（订单系统类图） | LR 类卡片（宽卡链，B12）；entity 卡片 members（attribute/method + type/params/visibility 四枚举符号映射，spec :64-85）；类关联边可带基数；group 领域层容器 | 4 类（User/Order/Payment/Cart）members 全带 type/params；visibility 仅 private/public（examples/uml-class.lgdl，protected/package grep=0）；2 组 domain/infra；3 关联边 拥有 1..* / 发起 1..1 / 关联 1..1（尾段 edges） | ① 观察项：visibility 四枚举仅用 2 值（protected/package 未示范）、method params 全 `()`——"全特性"目标下可补 ② matrix-a 专项穿体断言绑定 edges[1]（matrix-a.test.ts:132，现 = order→payment）——内容微调需复核索引 |
| **datastream**（订单处理数据流） | 泳道 = group（lgdl-lane，kind-coverage :189-192）；泳道内节点 + 泳道间流向（聚合边 g→g）；`_other` 合成列（B9） | 2 泳道 app/data + 聚合边 app→data"整体落库"（examples/datastream.lgdl） | 无 |
| **er**（电商 ER 图） | entity members attribute 行（er 无可见性概念，spec :85）；边基数 cardinalityFrom/To 双端显性、label 纯关系名（spec :92-107）；**值域 1 / * / 0..1 / 0..* / 1..* / 双多 n:m**（渲染支持证据 matrix-b.test.ts:208-212 对 0..1/0..*/1..* 文本渲染断言）；er mode 下 decision/note 混 kind 真实绘制（B8：matrix-docs-b.ts:450-511） | 4 entity（user/order/product/order-item），members = attribute+name（**无 type**，examples/er.lgdl:9-43）；3 边基数**全部 `1`→`*`**（:50-61，唯一字面量 `1` 与 `*`）；无 note/decision 混 kind | **①（作者指令核心）基数值域只出现 `1`/`*`：缺 0..1、0..*、1..*、双多 n:m 组合** ② er mode 混 kind（note/decision）未在 A 档示范（渲染支持见 B8）③ 观察项：members 未带 `type`（uml-class 与孤儿 er-orders 均带 typed attrs，删除前可参考）④ matrix-a 穿体断言绑定 er edges[0]（matrix-a.test.ts:131，现 = user→order）——增补边若变序需同步 |
| **state**（订单状态机） | state kind / end 终态；单入口 initial（in-degree 0 唯一，B10a/B10b 对照组 matrix-b.test.ts:240-252）；回环/失败回退转移；label = 转移事件；group 分区带 | 9 state + 4 end（done/closed/cancelled/refunded）+ 3 分区组（payment/fulfillment/after-sale）+ 15 转移含回环（paying→pending 支付失败）、超时（pending→closed）、缺货取消（preparing→cancelled）、退款分支（examples/state.lgdl） | 无（A 档 state 是 B10a/B10b 的"有 initial"对照组，matrix-b.test.ts:249-251——**state 内容不可破坏单入口性**，否则对照组失效） |
| **gantt**（产品发布甘特图） | task = attrs.start/duration（缺省回退 start=0/duration=1：lgdl-layout/src/index.ts:701-702、lgdl-render/src/index.ts:1211）；**milestone kind → 菱形（lgdl-gantt-milestone，按 kind 判定与 duration 无关，lgdl-render/src/index.ts:1237-1243；条宽 clamp ≥20px 对 duration=0 安全，lgdl-layout/src/index.ts:728）**；依赖 = 边（lgdl-dep）；**依赖三型 gap≥20 / gap≈0 / 目标在左**（B7：matrix-docs-b.ts:401-403,404-440 + matrix-b.test.ts:179-196）；负日期归一（lgdl-layout/src/index.ts:703-705）；group 分区带（B4b：lgdl-gantt-lane）；自适应列宽（:693-716） | 4 process bars（start/duration 全显式，examples/gantt.lgdl:7-28）+ 1 milestone launch **duration=1（:31-34）**；4 依赖边链式首尾相接（research 0+3=3 → design start 3 … test 14+4=18 → launch start 18，**全 gap≈0**） | **①（作者指令核心）里程碑 duration=1 非 0**——需改 duration=0（引擎安全：菱形按 kind 绘制、文本渲染 `${start}d +${dur}d`（render index.ts:1217）将显示 `18d +0d`，语义需 spec 确认）② **依赖三型仅 gap≈0 一种**——缺 gap≥20（大间隔）与目标在左（反向依赖）两型（B7 为 B 档参照）③ 观察项：无负日期（B7 特性）、无 group 分区带（B4b 特性；孤儿 gantt-saas-roadmap 原带 3 泳道，删除后 A 档无分区带样例） |

**跨类型通用特性观察**：2 层嵌套 group（spec Group 节 :134-144 支持嵌套）当前 A 档**唯一载体是 login-flow**（删除对象）→ 整合后 A 档嵌套特性零示范，需作者/spec 决策（保留 9 张中某张补嵌套、或接受由 B 档 B4b/B5 承担）。

## 2.4 引用面清单（整合后需要联动的所有文件）

| # | 文件 | 与示例集关系（证据） | 整合后动作 |
|---|---|---|---|
| 1 | `packages/lgdl-web/src/examples.ts` | **单一事实源** 11 例（:14-71，文件头 :2-5 声明 examples/* 为生成物） | 主体改动 11→9（删 microservices/login-flow，er/gantt 内容增强） |
| 2 | `packages/lgdl-web/src/App.tsx` | EXAMPLES 消费端：import（:16）、默认加载例 EXAMPLES[0]（:583-586，现 architecture）、switch-example 按 id 查找（:806）、list-examples 输出 `${EXAMPLES.length} 个`（:1034-1048）、侧栏渲染（:1082） | 自动跟随，一般无需手改（默认首例不变则无感） |
| 3 | `packages/lgdl-render/src/test-support/examples-sources.ts` | **ADR-002 受管镜像** 11 源（:19-31，注释 :2 "11 source"；:4 DO NOT EDIT，同步源=examples.ts；render→web 反依赖成环禁 import） | 手动逐字同步为 9（内容与 examples.ts 等价），注释改 9 |
| 4 | `packages/lgdl-render/test-assets/golden/` | golden 资产 11 `{id}.svg` + manifest.json（ids 11 :4-15；files 11 sha256 :17-27） | 显式重建为 9 组（LGDL_UPDATE_SNAPSHOTS=1）+ diff 审阅；manifest 同步 |
| 5 | `packages/lgdl-render/src/snapshot.test.ts` | 快照回归：对象集 = 镜像（renderAll :41-49；双校验 :89-97）；manifest 完整性断言 **ids.length===11（:73）**；更新门 :51-67 | 断言 11→9；9 组重建后自证一致 |
| 6 | `packages/lgdl-render/src/matrix-a.test.ts` | A 档遍历镜像 11（:123-133）；**专项穿体断言绑定 er edges[0] / uml-class edges[1]（:131-132，data-lgdl-loc 索引定位）**；0 违例 clean（:27-29） | 遍历自动 9；er 补基数/uml-class 微调后复核边索引与 0 违例 |
| 7 | `packages/lgdl-render/src/kind-coverage.test.ts` | kind 绘制断言绑定示例 id：login-flow（:53 start 药丸 / :83 decision 菱形 / :174-187 嵌套组外含内）、architecture（:69/:101/:114/:167）、state（:59 end 药丸 / :127 state 回退）、er（:106 members 行文本）、gantt（:139 milestone 菱形）、datastream（:190 泳道）、mindmap（:202 无 kind） | **login-flow 删除 → 3 处断言需换保留文档**（候选 ecommerce-flow 的 start/decision；嵌套断言需嵌套载体或改断）；er/gantt 内容增强后复核元素级断言仍成立 |
| 8 | `packages/lgdl-render/src/matrix-b.test.ts` | 自身 B 档 fixture + **A 档 state 对照组**（:38 import；:249-251 "A 档 state 单入口有 initial"） | state 保留不动则无影响（但 state 例不可改为多入口，见 §2.3）；B7/B8 语义与增强后 A 档 er/gantt 重叠可作参照 |
| 9 | `scripts/gen-examples.mjs` + `scripts/render-one.mjs` | 产物生成脚本（examples/*.lgdl/.svg/.png） | **修复旧包路径**（§2.5）后重生成 9 组三件套 |
| 10 | `examples/` 磁盘（21 组 = 63 文件） | 生成产物 | 删 12 组（10 孤儿 + microservices/login-flow）+ 重生成 9 组 |
| 11 | `README.md` | 图库 9 宫格引用 11 张 png + 源码链接（:21-33，含将删的 microservices :29 / login-flow :21）+ AI 评审 9 孤儿说明段（:37-39） | 删除后 2 处 png/源码链接 404 + 孤儿段失效 → 是否纳入本 feature 由作者决策（scope.in 未列 README） |
| 12 | `packages/lgdl-web-op-cli/src/ops.ts`(:57) / `tool.ts`(:45) | switch-example 工具说明示例参数 `--id login-flow`（纯元数据/文档串，非行为依赖） | 低优先：换用保留 id（如 ecommerce-flow） |
| 13 | docs 历史引用（作者决策是否动）：`docs/reviews-2026-08-24/ai-vision-review.md`（9 孤儿评审记录 :49-57）、`.sddu/docs-tree-root/核心引擎/web-ai助手.md`(:37 "11 个内置示例")、`.sddu/docs-tree-root/系统架构/端到端数据流-dataflow.md`(:22 gen-examples 数据流)、`specs-tree-render-gate/{discovery,spec,plan,tasks}.md`（孤儿处置留待决策记录） | 文档/历史存档 | 评审记录建议保留（历史）；docs-tree 快照性文档可随 Feature 收尾刷新或加注 |

## 2.5 gen-examples 脚本现状

**结论：链路已断（NG-002 确认）**。实测运行 `node scripts/gen-examples.mjs`：

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
'/home/usb/wks/gits/GitHub/LGDL/packages/core/dist/index.js'
imported from /home/usb/wks/gits/GitHub/LGDL/scripts/gen-examples.mjs
```

**断裂根因**（证据）：
- scripts/gen-examples.mjs:15-17 import `../packages/core/dist/index.js`、`../packages/layout/dist/index.js`、`../packages/render/dist/index.js` → V2 9 包重命名后目录不存在（现为 `packages/lgdl-core|lgdl-layout|lgdl-render|lgdl-web|…`，实测 ls）
- scripts/gen-examples.mjs:20 读 `packages/web/src/examples.ts` → 现路径 `packages/lgdl-web/src/examples.ts`
- scripts/render-one.mjs:12-14 同款旧路径，同样断

**修复可行性**（证据）：现 4 包 package.json 均 `"type": "module"`（ESM），且 `dist/index.js` 已构建存在（lgdl-core/lgdl-layout/lgdl-render 均有 dist）→ 仅需换 4 处路径即可恢复：`../packages/lgdl-core/dist/index.js`、`../packages/lgdl-layout/dist/index.js`、`../packages/lgdl-render/dist/index.js`、`packages/lgdl-web/src/examples.ts`。PNG 生成依赖可选 `@resvg/resvg-js`（:47-55，未装则跳过 .png，脚本逻辑已容错）。

**整合后使用路径**：改 examples.ts → 修脚本路径 → 跑脚本 → 产出 9 组 examples/<id>.lgdl/.svg/.png → 磁盘删 12 组旧三件套。注意 examples.ts 源字符串由正则硬解析（:25），每例 source 为单行转义字符串，修改时保持既有转义格式（gen-examples.mjs 现对 11 例解析成功）。

## 2.6 golden 快照现状

**位置/形态**：`packages/lgdl-render/test-assets/golden/` 共 12 文件 = 11 个 `{id}.svg`（architecture/microservices/datastream/er/gantt/login-flow/ecommerce-flow/mindmap/sequence/state/uml-class）+ `manifest.json`（version 1；ids 11 按镜像序；files 11 个 sha256 hex；**无时间戳/环境字段**，确定性可 diff）。无 .png 快照。

**机制**（snapshot.test.ts）：
- 对象集 = EXAMPLES_SOURCES 镜像（:41-49），与 A 档 matrix-a 共用模块级缓存
- 更新门：仅 `LGDL_UPDATE_SNAPSHOTS=1` 走写路径（:51-67 重写 svg + manifest），普通 npm test **不存在写盘分支**（:12-13 注释）→ CI 不可能静默更新基线
- 双校验：渲染串逐字节 = golden 文件 + sha256 = manifest.files[id]（:89-97）；manifest 完整性断言（:69-87）
- 快照基线 = 当前引擎重渲染字节（render-gate D-002，不采用已漂移磁盘 .svg）

**整合后**：镜像 11→9 → golden 需删 login-flow.svg/microservices.svg + 重建 er.svg/gantt.svg（内容增强后字节必变）→ 9 svg + manifest（ids 9）；snapshot.test.ts:73 的 `ids.length === 11` 断言改 9。**流程约束**：scope.out 要求 golden 变更走显式重建 + diff 审阅，禁止静默更新。

---

## 3. 假设与风险

| 类别 | 内容 | 状态 |
|---|---|---|
| 待验证假设 H1 | gantt 里程碑 duration=0 的引擎语义符合作者预期：layout 条宽 clamp ≥20px（lgdl-layout/src/index.ts:728）→ duration=0 任务仍有 20px 槽位 + 菱形绘制（render 按 kind 判定 :1237）+ 文本显示 `${start}d +0d`（:1217）。若作者期望"里程碑=零宽时间点"，需 validate 实测确认或另立引擎微调 | 待 spec/validate |
| 待验证假设 H2 | er 补 n:m（双端多基数，如 `*`..`*`）在当前渲染器基数外置逻辑下 0 违例——B8 全枚举**未含双多组合**（matrix-docs-b.ts:489-504 只有 1/0..1/0..*/1..*），属未断言组合 | 待 matrix-a 门禁验证 |
| 待验证假设 H3 | er/gantt 内容增强不破坏 matrix-a "0 违例 clean"（新增基数边/里程碑不引入穿体/压框/越界，matrix-a.test.ts:123-133） | matrix-a 即验收门 |
| 风险 R1 | 删 login-flow 使 kind-coverage 3 处断言失效（:53/:83/:174-187）且 A 档失去唯一 2 层嵌套 group —— tasks 必须同步改测试或补嵌套载体，否则 CI 红 | 需 tasks 覆盖 |
| 风险 R2 | state 例是 matrix-b B10a/B10b 的"有 initial"对照组（matrix-b.test.ts:249-251）——整合时不可把 state 改为多入口/纯环 | 联动约束 |
| 风险 R3 | golden 静默漂移——scope.out 已约束显式重建 + diff 审阅 | 流程约束 |
| 风险 R4 | examples.ts source 单行转义字符串 + gen-examples 正则硬解析（:25）——编辑格式错误将导致提取失败 | 生成后校验 |
| 待决策 D1 | README.md（:21-39）与 docs 历史引用是否纳入本 feature 清理（scope.in 未列，删除后 README 图库 404） | 作者决策 |
| 待决策 D2 | 磁盘 9 孤儿 .svg/.png 为 AI 视觉评审历史产物，删除前是否需归档 | 作者决策 |

---

## 4. 移交建议（spec 输入要点）

1. **精确孤儿口径**：10 孤儿逐个删除；microservices/login-flow 两镜像随 examples.ts 缩编删除 → 磁盘删 12 组、重建 9 组。
2. **er 增强**：在现有 4 实体 3 边基础上补基数值域（0..1 / 0..* / 1..* 及双多 n:m），可参照 B8（matrix-docs-b.ts:450-511）写法；如需补 er mode 混 kind（note/decision）与 typed attributes，spec 定夺（现渲染支持 B8 已证）。
3. **gantt 增强**：launch 里程碑 duration 1→0；依赖边补 gap≥20 与目标在左两型（可参照 B7 构造 matrix-docs-b.ts:404-440）；是否并入负日期/分区带由 spec 定。
4. **测试联动**：examples-sources.ts 镜像 11→9 → snapshot 断言 11→9 → golden 显式重建 → matrix-a 索引复核 → kind-coverage login-flow 断言换档 → matrix-b state 对照组保持。
5. **生成链路**：gen-examples.mjs（+ render-one.mjs）修 4 处包路径后重生成磁盘三件套。
6. **验收守则**：9 图类型不变；零新 DSL；快照显式重建 + diff 审阅；全仓 npm test 绿。

---

> **文档版本**: v1.0（2026-09-03）— 摸底型 discovery 产物，供 spec 阶段引用
