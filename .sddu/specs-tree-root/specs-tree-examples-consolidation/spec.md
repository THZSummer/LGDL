# Feature Specification：specs-tree-examples-consolidation（示例图整合）

> **文档定位**: SDDU 需求规范 — 定义功能需求、非功能需求和边界情况，作为 plan 阶段的输入
> **前置依赖**: discovery.md v1.0（摸底型盘点：孤儿精确 10 个 / 11 例 type 分布 / 9 类型特性覆盖矩阵 / 引用面 13 处 / gen-examples 断裂实证 / golden 现状 11 组，全部代码证据 2026-09-03）+ 前置事实 specs-tree-render-gate（ADR-002 镜像 + ADR-003 golden 门禁，spec.md:51,72,75,225-226 明确"磁盘孤儿处置 / gen-examples 修复 / 产物重生成"不在其范围、待作者另立 Feature）+ specs-tree-engine-defect-fixes（M1~M5 已闭环，matrix-a 已收编 0 违例）
> **创建人**: SDDU Spec Agent
> **创建时间**: 2026-09-03
> **版本**: v1.0
> **更新人**: SDDU Spec Agent
> **更新时间**: 2026-09-03
> **更新说明**: 初始创建 — 摸底后轻量模式（需求本质作者已对齐，零访谈，自主决策设计）：保留 9 张示例图定案 + 删除口径澄清（10 孤儿 vs「删 12 组」双口径）；flowchart（ecommerce-flow）补 2 层嵌套 group、er 补多基数（0..1/0..*/1..*/1..*/n:m 双多）+ typed attributes + note 混 kind、gantt 补里程碑 duration=0 + 依赖三型（gap≈0 / 目标在左 / gap≥20）；磁盘 12 组三件套删除 + 脚本 4 处包路径修复重生成；镜像 / snapshot / golden / matrix-a / kind-coverage 联动清单（含 login-flow 3 处断言换档明细与 er typed 行文本适配）；matrix-b state 对照组锁定。需求映射 discovery §1~§2.6 → FR-001~FR-014

## 1. 元数据
> Feature 基本信息

| 字段 | 值 |
|------|-----|
| Feature ID | specs-tree-examples-consolidation（示例图整合；ROADMAP 未编号，作者指令 2026-09-02 立项） |
| 名称 | 示例图整合（9 种图类型各保留一张全特性示例图） |
| 优先级 | P1（发布质量：示例单一事实源一致性 + 图库范本完整性；依赖 render-gate/engine-defect-fixes 闭环后） |
| 目标版本 | 下一发布窗口（未定，见开放问题 OQ-4） |

## 2. 上下文
> 回顾问题背景和目标用户（摸底后轻量模式：无访谈，依据 discovery.md 基线归纳）

### 2.1 要解决的问题

discovery 摸底（2026-09-03 实测，代码证据见 discovery.md §2）确认核心问题成立：

| 核心问题 | 现状（代码证据） | 业务影响 |
|---------|----------------|---------|
| **示例冗余重复** | arch / flowchart 各 2 张高度同型（architecture vs microservices、login-flow vs ecommerce-flow）；examples.ts 11 例 = 9 类型覆盖但 arch×2/flowchart×2（examples.ts:15-71） | 示例集是"该类型正确写法"的官方范本（README 图库 + lgdl-web 侧栏 + list-examples），重复例稀释示范密度，维护成本翻倍 |
| **磁盘孤儿堆积** | examples/ 21 组三件套（63 文件），10 个 .lgdl 无单一事实源对应（9 个为 2026-08-24 AI 评审历史产物 README:37-39 引用、group-node-demo 无引用）；孤儿与 examples.ts 单一事实源（examples.ts:2-5 "THE single source of truth"）脱节 | 孤儿被误读为官方推荐写法，持续漂移无人维护（render-gate discovery §3.4 已记录） |
| **特性覆盖不全** | er 例 4 实体 3 边基数全部 `1`→`*`（examples/er.lgdl:46-61），缺 0..1/0..*/1..*/n:m 双多；gantt 里程碑 launch duration=1（应 0）（examples/gantt.lgdl:29-34）、4 依赖边全 gap≈0（:36-44），缺 gap≥20 与目标在左 | "每类型一张全特性示范图"是作者明确诉求（state.json:9），残缺样例无法承担范本职责 |
| **A 档 2 层嵌套 group 载体流失** | 2 层嵌套 group 当前 A 档唯一载体是 login-flow（frontend 含组 auth，examples/login-flow.lgdl；kind-coverage.test.ts:174-187 断言"外含内"）——login-flow 删除后 A 档嵌套特性零示范 | 写作者/测试失去"嵌套分组"官方写法参照与断言载体 |
| **产物生成链路断** | gen-examples.mjs:15-17 import `../packages/core|layout|render/dist/index.js`、:20 读 `packages/web/src/examples.ts`（V2 9 包重命名后失效）；render-one.mjs:12-14 同款。实测 ERR_MODULE_NOT_FOUND（render-gate spec NG-002 已记录"链路已断"） | 示例内容整合后无法重建磁盘产物三件套 |
| **golden 快照与镜像计数耦合 11** | golden manifest ids 11（test-assets/golden/manifest.json:3-15）；snapshot.test.ts:73 `ids.length===11`；examples-sources.ts:2 注释 "11 source"（ADR-002 受管镜像） | 缩编后三处 11 断言/注释若不联动 → 门禁红 / 口径漂移 |

### 2.2 需求本质（作者已对齐，state.json:9,15）
整合示例图：9 种图类型各保留一张示例图，每张尽量体现该类型所有特性。目标 9 张已圈定；删 microservices、login-flow 两重复例；磁盘 21→9 组三件套；golden 快照 11→9 组显式重建 + diff 审阅；matrix-a 镜像 + kind-coverage/matrix-b 测试联动。**约束**：9 图类型不变、零新 DSL 语法、快照显式重建 + diff 审阅、测试随示例集同步变更（scope，state.json:10-23）。

### 2.3 目标用户

| 用户角色 | 典型场景 | 关键痛点 |
|---------|---------|---------|
| LGDL 作者（引擎开发者，唯一决策者） | 写新图前查"某类型正确写法范本"；发布前检查示例产物一致性 | 重复例稀释示范；孤儿误导；er/gantt 残缺样例无法参考全特性写法 |
| 图库阅读者（README/网页侧栏/AI Agent） | 阅读官方示例图库 | README 9 宫格引用将删的 png/源码链接会 404；孤儿被当官方推荐 |
| CI / npm test 门禁 | 整合后全仓回归 | 镜像/snapshot/kind-coverage/matrix-a 中 11 例与 login-flow 断言需同步，否则门禁红 |
| 下游 Agent（plan/tasks/build） | 拿到"每张图改什么、删什么、联动什么"已拍板的需求 | 需要精确到文件:行号的改动清单与可验证验收标准 |

### 2.4 与现有功能的关系

- **上游事实**：render-gate 已交付 golden 门禁（11 组，ADR-003：`LGDL_UPDATE_SNAPSHOTS=1` 显式重建 + 双校验）+ A 档几何审计（matrix-a 0 违例 clean，KNOWN 已全清，matrix-a.test.ts:9-13）；engine-defect-fixes M1~M5 已闭环；examples.ts 为磁盘产物单一事实源。
- **关键机制依赖**：快照对象集 = examples-sources.ts 受管镜像（ADR-002，禁 import web 防成环）；镜像与 examples.ts 手工同步后走 `LGDL_UPDATE_SNAPSHOTS=1` 重建 golden。
- **不在本 Feature 范围**（state.json scope.out + discovery 移交建议 #1）：任何新功能/命令/新 DSL 语法；图类型数量改动（9 类型不变）；快照静默更新；README.md 与 docs 历史存档清理（另作者决策，见 OQ-1/OQ-2）；引擎缺陷修复。
- **下游**：@sddu-plan（依赖本 spec.md 完成技术规划）→ @sddu-tasks → @sddu-build（唯一执行代码改动的阶段）。

## 3. 目标与非目标
> 明确需求范围，防止范围蔓延

### 3.1 目标 (Goals)

| # | 目标描述 |
|---|---------|
| G-001 | **9 张全特性示例图定案**：flowchart（ecommerce-flow）/ mindmap / uml-class / arch / datastream / sequence / er / state / gantt 各保留一张，删 microservices、login-flow 两重复例；每张按类型特性清单核对覆盖（discovery §2.3 矩阵） |
| G-002 | **er 例补全基数语义**：4 实体 + 促销实体补 typed attributes 与 note 混 kind，5 关系边覆盖基数值域 1 / 0..1 / 0..* / 1..* / * 双多 n:m（作者指令核心缺口） |
| G-003 | **gantt 例补全时间轴语义**：launch 里程碑 duration 1→0；依赖边覆盖三型（gap≈0 链 / 目标在左 / gap≥20）（作者指令核心缺口） |
| G-004 | **flowchart 例补 2 层嵌套 group**：ecommerce-flow 增加外层分组（platform 包装 4 域），承接 login-flow 删除后流失的 A 档嵌套特性载体与 kind-coverage 断言目标 |
| G-005 | **磁盘孤儿与重复例清理**：删除 12 组三件套（10 孤儿 + microservices/login-flow 镜像），examples/ 21→9 组；产物经修复后的 gen-examples.mjs 重生成 |
| G-006 | **镜像 / 快照 / 测试联动**：examples-sources.ts 镜像、golden manifest、snapshot/matrix-a 遍历计数 11→9；kind-coverage login-flow 断言换档、er typed 断言适配；matrix-b state 对照组保持 |
| G-007 | **总体验收守恒**：9 图类型不变、零新 DSL、全仓 npm test 绿、重建后未变更 6 例字节零 diff（确定性自证） |

### 3.2 非目标 (Non-Goals)

| # | 明确不做 |
|---|---------|
| NG-001 | 不改 9 图类型数量与任何图类型定义（types.ts 零改动） |
| NG-002 | 不引入任何新 DSL 语法 / 关键字 / 属性（examples 只用既有合法写法，参照 lgdl-spec 与 B 档 fixture 写法） |
| NG-003 | 不碰 render/layout/router/core 运行时业务代码（examples 内容改动只经既有 parse→layout→render 链路，引擎零 diff） |
| NG-004 | 不修引擎缺陷：若增强内容在 matrix-a 暴露真实几何缺陷 → 记录已知缺口并上报作者（EC-001 流程），不降审计标准 |
| NG-005 | 不静默更新 golden：重建只经 `LGDL_UPDATE_SNAPSHOTS=1` 显式执行 + git diff 审阅（ADR-003 纪律） |
| NG-006 | 不动 README.md、docs/ 历史评审存档、op-cli 工具说明文档串（README 404 与历史引用清理另作者决策，OQ-1/OQ-2/OQ-3） |
| NG-007 | 不做 App.tsx 手改（EXAMPLES 消费端自动跟随；默认首例 architecture 未删，无感） |

## 4. 用户故事
> 以用户视角描述功能需求

| # | 作为… | 我想要… | 以便… |
|---|-------|---------|-------|
| US-001 | LGDL 作者 | 9 种图类型各有一张"全特性范本"图可参考 | 写新图时对照一张官方图即可覆盖该类型全部正确写法，不必拼凑多张 |
| US-002 | LGDL 作者 | er 图能示范全部基数值域与 typed attributes、gantt 图能示范里程碑与依赖三型 | 官方范本不再残缺，DSL 特性经示例传播 |
| US-003 | 图库阅读者/AI Agent | examples/ 磁盘产物与官方示例一一对应、无孤儿 | 不会把无人维护的历史产物误读为推荐写法 |
| US-004 | CI / 维护者 | 整合后镜像、快照、断言、产物四面对齐 | 不会因 11 例→9 例的计数/断言残留而门禁红或口径漂移 |
| US-005 | 下游 Agent（plan/tasks/build） | 拿到每张图的改动设计、删除清单、联动清单与验收标准 | 直接执行，不再回头做需求决策 |

## 5. 功能需求 (FR)
> 每个需求必须有唯一标识符且可测试；按 5 组组织（9 图定案与内容设计 / 删除与磁盘清理 / 生成链路修复 / 镜像与 golden / 测试联动与总验收）。需求来源：discovery.md 基线 + 作者指令闭环，设计决策理由充分、不臆造新范围。

---

### 设计决策 D-001：保留 9 张定案与删除口径澄清（对应 discovery §2.1/§2.2、移交建议 #1）

**问题**：discovery 明确两个口径需 spec 沿用精确表述——「10 个孤儿」vs state.json description 写的「12 个孤儿」；且 9 张目标图的取舍、每张图的特性基线需一次钉死。

**决策**：
1. **保留 9 张**（examples.ts 条目序）：architecture / datastream / er / gantt / ecommerce-flow / mindmap / sequence / state / uml-class。**删除 2 张**：microservices（arch 重复）、login-flow（flowchart 重复）。examples.ts 11→9；保留例相对顺序不变（App.tsx EXAMPLES[0]=architecture 默认首例无感，App.tsx 自动跟随零手改）。
2. **删除量口径**：「磁盘孤儿 = 10」（精确，逐文件核实 type）；「删 12 组」= 10 孤儿 + microservices/login-flow 两镜像（examples.ts 缩编后磁盘镜像即成孤儿）。两个口径并存，spec/tasks/state.json 均采用「10 孤儿 + 2 重复例镜像 = 删 12 组三件套」精确表述。
3. **9 图特性覆盖总表**（覆盖判定含本 Feature 变更后状态；特性来源 = discovery §2.3 矩阵 + lgdl-spec）：

| # | 图（id / 类型） | 该图承载的类型特性（保留基线） | 本 Feature 变更 |
|---|---|---|---|
| 1 | architecture / arch | 10 节点全 kind（start/process/entity/note）+ 3 组平铺 + 聚合边 g→g×2（front→core/core→data）+ 混合聚合边 n→g（user→core） | **保留零改动**（覆盖充分；g→n 三型中唯一 A 档载体） |
| 2 | datastream / datastream | 2 泳道 = group（lgdl-lane）+ 泳道内节点 + 泳道间聚合边 g→g（app→data 整体落库） | **保留零改动** |
| 3 | er / er | entity members attribute 行 + 关系 label + 双端基数（本 Feature 前仅 `1`→`*`） | **增强**：typed attributes（`name: type` 行式）+ 补 1 个促销实体 + note 混 kind + 5 关系边覆盖 1/0..1/0..*/1..*/n:m 双多（D-003） |
| 4 | gantt / gantt | 4 process bars（start/duration 显式）+ 1 milestone（本 Feature 前 duration=1）+ 4 依赖边 gap≈0 | **增强**：里程碑 duration→0 + 依赖三型（gap≈0 链 / 目标在左 / gap≥20）（D-004） |
| 5 | ecommerce-flow / flowchart | start/end 药丸 + process×6 + decision×4 多分支 + 分支 label + 4 域平铺 group + 聚合边 g→g×2（trade→fulfillment / fulfillment→after-sale） | **增强**：补 2 层嵌套 group（platform 包装 4 域，D-002）；其余零改动 |
| 6 | mindmap / mindmap | 径向多级树 + decision 叶折叠圆角 rect + 无 kind 叶回退 process | **保留零改动** |
| 7 | sequence / sequence | 4 参与者（非 group 即参与者）+ 6 消息含 3 反向 + label=消息语义 | **保留零改动** |
| 8 | state / state | 9 state + 4 end + 3 分区组 + 15 转移含回环/超时/退款分支 + **单入口 initial（matrix-b B10 对照组，matrix-b.test.ts:249-251）** | **保留零改动（结构性锁定：不可改多入口/纯环）** |
| 9 | uml-class / uml-class | LR 类卡片 + entity members（attribute/method + type/params/visibility 四枚举符号映射）+ 3 关联边带基数（拥有 1..* / 发起 1..1 / 关联 1..1）+ 2 领域组 | **保留零改动**（观察项 visibility 仅用 2 值等不阻塞；matrix-a edges[1] 索引绑定 order→payment 不因本 Feature 破坏） |

**跨类型通用特性核对**：2 层嵌套 group → 变更后 A 档载体 = ecommerce-flow（FR-002）；全 kind 形状混排 → architecture/state/er(B8 参照)；聚合边三态 → architecture（g→g/n→g）+ ecommerce（g→g）；g→n 无 A 档新增（architecture user→core 已覆盖 n→g；g→n 由 B 档 B5 承担，本 Feature 不扩散）。

---

### 设计决策 D-002：ecommerce-flow 补 2 层嵌套 group（承接 kind-coverage 嵌套断言载体）

**问题**：discovery §2.3 观察 + 风险 R1——删 login-flow 后 A 档失去唯一 2 层嵌套 group 载体，kind-coverage.test.ts:174-187「外含内」断言随之失效。

**决策**：在 ecommerce-flow 上以**语义自然的域层级**补嵌套，不新增业务节点/边：
- 新增 1 个外层分组节点 `platform`（label：电商平台，kind: group，`contains: [shopping, trade, fulfillment, after-sale]`）——4 域平铺结构升级为「平台 ⊃ 域」2 层嵌套（platform ⊃ shopping ⊃ browse/cart 即 2 层嵌套链）。
- 业务节点 14 个 + 17 条边（含 2 条聚合边）**全部保持不变**；group 数 4→5；聚合边 trade→fulfillment 变为嵌套组内跨子域边（语义不变）。
- 结构镜像 login-flow 已验证形态（frontend 外组含 [start, auth] 内组，golden 已锁定渲染/审计 0 违例；render-gate Q-012 覆盖嵌套 box 递归 computeGroupBox），无未验证新写法。
- **理由（不选其他候选载体）**：architecture 3 组为平铺业务层语义（无自然父子域）；state 分区带为阶段平行语义（强行嵌套破坏单入口对照组风险）；mindmap/sequence/datastream 的 group 语义锁定（mindmap 忽略 group / sequence group 非参与者 / datastream group=泳道不可嵌套）；uml-class 领域层（domain/infra）无子域。**flowchart 是唯一"嵌套分组"特性归属类型**（lgdl-spec Group 节 :134-144），补在 ecommerce-flow 上最自洽。

**验收锚点**：kind-coverage 嵌套断言迁移到 ecommerce-flow：group rect 数 = 5（platform/shopping/trade/fulfillment/after-sale）；platform 外框完整包含 shopping 内框（沿用 :181-186 外含内判定，id 换 platform/shopping）。

---

### 设计决策 D-003：er 例增强设计（作者指令核心缺口 + 观察项收编）

**问题**：er 例 4 实体 3 边基数字面量全为 `1`→`*`（缺 0..1/0..*/1..*/n:m 双多）；members 无 type（观察项③，孤儿 er-orders 带 typed attrs 即将删除）；er mode 混 kind 未在 A 档示范（B8 渲染支持已证，matrix-docs-b.ts:450-511）。

**决策**（参照 B8 已验证写法，matrix-docs-b.ts:489-511）：
1. **实体与 typed attributes**：4 实体 members 补 `type` 字段（id: bigint / name: varchar / price: decimal / amount: decimal / quantity: int…，行式渲染 `name: type`，orphan er-orders 渲染实证 `<text>id: bigint</text>`）；实体 user 的 id/name/email 成员保留（kind-coverage er members 断言迁移目标）。
2. **基数五值 + n:m 双多**：5 条关系边覆盖全部值域（顺序即 doc.edges 顺序，**edges[0] 必须保持 user→order**，matrix-a.test.ts:131 专项断言绑定）：

| 边序 | from→to | label | cardinalityFrom | cardinalityTo | 覆盖值 |
|---|---|---|---|---|---|
| 0 | user→order | 拥有 | 1 | 0..* | 1、0..* |
| 1 | order→order-item | 包含 | 1 | 1..* | 1..* |
| 2 | product→order-item | 被选购 | 0..* | 1 | 0..* |
| 3 | order→promotion | 使用 | 0..1 | 0..* | 0..1 |
| 4 | promotion→product | 覆盖 | * | * | *（双多 n:m）|

   （新增实体 `promotion` 促销：id bigint / name varchar / discount decimal；语义：一个订单至多使用 0..1 种促销、一种促销被 0..* 订单使用、促销与商品 *..* 多对多覆盖。）
3. **er mode 混 kind**：并入 1 个 note 便签（label：订单金额为下单时各订单项 quantity×price 之和快照，kind: note）+ note→order 约束边（无基数，label 纯关系名）——语义自然的"业务规则注释"；**decision 菱形不并入 A 档**（理由：ER 语义无菱形分叉位置，强行并入损害范本语义自洽性；decision 在 er mode 的真实绘制已由 B 档 B8 断言承担，matrix-docs-b.ts:485-487/508-510）。
4. **新增基数组合风险前置**：0..1/0..*/1..* 文本渲染有 matrix-b.test.ts:208-212 断言支撑；*..* 双多为未断言组合（discovery H2）→ 以 matrix-a 0 违例为门禁验收（FR-014），真红走 EC-001。

---

### 设计决策 D-004：gantt 例增强设计（作者指令核心缺口 + 观察项取舍）

**问题**：里程碑 launch duration=1（应 0，discovery H1：引擎按 kind 绘菱形与 duration 无关，render index.ts:1237-1243、layout 条宽 clamp ≥20px 对 duration=0 安全 layout index.ts:728）；4 依赖边全 gap≈0（缺 gap≥20 / 目标在左，B7 参照 matrix-docs-b.ts:404-440）。

**决策**：
1. **里程碑语义修正**：launch（上线发布）kind: milestone、attrs.start 保持主线末端、**duration: 0**。里程碑按 kind 绘菱形（与 duration 无关）→ 形状不变；文本渲染按 render index.ts:1217 将显示 `${start}d +0d`，作为 duration=0 的确定性语义锚点（validate 阶段实测确认，H1）。
2. **依赖三型构造**（参照 B7「相邻行 + 空列」构造避免垂直段穿条，matrix-docs-b.ts:401-403；数值以主线可读为度，plan/build 可按 U-2 规则微调但须满足三型判定）：

| 依赖型 | 判定（语义） | 示例构造（source.end→target.start） |
|---|---|---|
| gap≈0（背靠背） | target.start = source.end | 主线链 需求调研→原型设计→开发实现→测试验收→上线发布(里程碑) 首尾相接 |
| 目标在左 | target.start < source.end（反向/重叠依赖，连线向左绕行） | test→doc：doc.start（并行编写中）< test.end |
| gap≥20 | target.start − source.end ≥ 20 | test→retro：retro.start = test.end + 20（上线后第 3 周复盘） |

   （里程碑 launch 为主链 gap≈0 终点目标；gap≥20 与目标在左各由 1 条独立边承担，源节点均为 process。）
3. **不并入负日期与分区带**（观察项取舍，理由）：负日期（B7 特性）与 group 分区带（B4b 特性）已由 B 档 fixture 承担全链路断言与示范（matrix-docs-b.ts B7/B4b）；A 档 gantt 若并入分区带将把任务拆入泳道布局，放大 golden 重建 diff 与几何审计风险，且与 author 指令（里程碑 + 依赖三型）无直接关系 → 控制变更面，只修指令核心缺口。
4. 原有 4 process bar 主线语义（需求调研→原型设计→开发实现→测试验收→上线发布）保留，仅重排时间使三型成立。

---

### 组 1：9 图内容定案与三图增强（对应 G-001~G-004）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-001 | **examples.ts 缩编 11→9**：`packages/lgdl-web/src/examples.ts` 删除 microservices（:22-25）与 login-flow（:42-45）两个 EXAMPLES 条目；保留 9 例相对顺序不变（architecture/datastream/er/gantt/ecommerce-flow/mindmap/sequence/state/uml-class）；er/gantt/ecommerce-flow 三例 source 按 D-002~D-004 增强后改写（保持单行转义字符串格式，gen-examples.mjs:25 正则硬解析要求） | EXAMPLES.length === 9；id 集 = 上述 9 个、无多余；EXAMPLES[0].id === 'architecture'；`node` 实测 9/9 条 source 可被 parser 接受（parseLgdl valid）；文件头"single source of truth"注释保留 | P0 |
| FR-002 | **flowchart（ecommerce-flow）补 2 层嵌套 group**：按 D-002 在 nodes 末尾新增 `platform` 外组（contains 4 域）；14 业务节点 + 17 边（含 2 聚合边）内容零改动；group 数 4→5 | 磁盘/镜像 ecommerce-flow 源含 platform 组声明；kind-coverage 嵌套断言（迁移后）通过：lgdl-group rect 数=5 且 platform 外框完整含 shopping 内框；matrix-a 0 违例 | P0 |
| FR-003 | **er 例增强**：按 D-003——5 实体（含新 promotion）members 全部带 type；5 条带基数关系边 + note→order 约束边；note 混 kind；基数文本覆盖 1/0..1/0..*/1..*/n:m 双多；**doc.edges[0] = user→order** | er 源结构与 D-003 表一致；kind-coverage er members 断言（适配 typed 行文本后）通过；matrix-a er edges[0] 专项断言（assertNoOwnBoxPierce('er',0)）通过且审计 0 违例 | P0 |
| FR-004 | **gantt 例增强**：按 D-004——launch 里程碑 attrs.duration=0；依赖边集覆盖三型（gap≈0 链 ≥4 边 / 目标在左 1 边 / gap≥20 1 边）；保留主线 4 阶段语义 | gantt 源中 milestone 节点 duration===0；按 source 数值逐边验算：链式边 target.start=source.end（gap≈0）、目标在左边 target.start < source.end、gap≥20 边 target.start − source.end ≥ 20；kind-coverage milestone 菱形断言（r=9 菱形）不因 duration 改动失效；matrix-a 0 违例 | P0 |
| FR-005 | **其余 6 图保留零改动**：architecture/datastream/mindmap/sequence/state/uml-class 的 examples.ts source **内容零 diff**（含 state 单入口结构不可破坏，matrix-b B10 对照组）；uml-class edges 序不变（matrix-a edges[1]=order→payment 专项保持） | git diff 确认 6 例 source 无任何字符变化；matrix-b.test.ts:38/249-251 A 档 state 对照组相关断言原样通过 | P0 |

---

### 组 2：删除与磁盘清理（对应 G-005、discovery §2.1/§2.4 #10）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-006 | **磁盘 12 组三件套删除**：examples/ 删除 10 孤儿（arch-ecommerce、datastream-log、er-orders、flowchart-auth、gantt-saas-roadmap、group-node-demo、mindmap-product、sequence-order、state-order、uml-class-order）+ microservices + login-flow 的 `.lgdl/.svg/.png` 共 36 文件；删除在重生成前执行或由重生成覆盖后兜底清理，最终与 9 例重生成产物一致 | 删除后 `ls examples/*.lgdl` 恰 9 个且 id 集 = FR-001 的 9 id；`.svg/.png` 各 9；无任何非 9 集内的残留三件套文件 | P0 |

---

### 组 3：生成链路修复（对应 G-005、discovery §2.5、render-gate NG-002 闭环）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-007 | **gen-examples.mjs / render-one.mjs 包路径修复**：4 处 V2 旧路径 → 现包路径——①`../packages/core/dist/index.js`→`../packages/lgdl-core/dist/index.js` ②`../packages/layout/dist/index.js`→`../packages/lgdl-layout/dist/index.js` ③`../packages/render/dist/index.js`→`../packages/lgdl-render/dist/index.js` ④`packages/web/src/examples.ts`→`packages/lgdl-web/src/examples.ts`（render-one.mjs 只有 ①②③）；其余逻辑零改动（PNG 可选 @resvg/resvg-js 容错保留） | 修复后 `node scripts/gen-examples.mjs` 在 dist 已构建前提下运行成功（无 ERR_MODULE_NOT_FOUND），对 9 例逐一输出 lgdl/svg（png 缺失时明确跳过不报错）；`node scripts/render-one.mjs examples/er.lgdl` 成功产出 svg | P0 |
| FR-008 | **磁盘产物重生成 9 组**：examples.ts（FR-001 终态）经修复脚本生成 9 组 `.lgdl/.svg/.png` 三件套；与 FR-006 删除配合达到磁盘终态 | 重生成后：磁盘 9 组 .lgdl 与 examples.ts source **逐字一致 9/9**（node 实测比对）；.svg 由当前引擎渲染字节一致（确定性）；.png 存在或明确跳过记录（无 resvg 环境时以 lgdl/svg 为验收主体） | P0 |

---

### 组 4：镜像与 golden 快照联动（对应 G-006、ADR-002/ADR-003 机制）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-009 | **examples-sources.ts 镜像同步 11→9**：`packages/lgdl-render/src/test-support/examples-sources.ts` 删除 microservices/login-flow 两行条目，er/gantt/ecommerce-flow 三条 source 与 examples.ts 逐字等价（含增强内容）；文件头注释 "11 source"→"9 source"（:2）；条目序与 examples.ts 一致 | 镜像 9 条与 examples.ts 9 条（id、source 字符串）逐字一致（脚本比对，禁止 import web）；注释/文档串 11→9 | P0 |
| FR-010 | **snapshot.test.ts 硬断言 11→9**：`ids.length === 11`（:73）改 9；文件头/注释 "11"→"9"（:4/:8/:10/:11 相关表述）；快照用例循环随 EXAMPLES_SOURCES 自动 9 条，无需逐条改 | snapshot.test.ts 无残留 "11" 计数断言；LGDL_UPDATE_SNAPSHOTS=1 重建后 9 条字节+sha 双校验全绿 | P0 |
| FR-011 | **golden 快照 11→9 显式重建 + diff 审阅**：`packages/lgdl-render/test-assets/golden/` 删除 login-flow.svg、microservices.svg；以 `LGDL_UPDATE_SNAPSHOTS=1` 显式重建 er.svg（基数/typed 变更）、gantt.svg（里程碑/依赖变更）、ecommerce-flow.svg（嵌套变更）字节；manifest.json ids 9 + files sha256 同步；**不通过静默写盘更新**（普通 npm test 无写盘分支） | 重建后 manifest ids.length=9 且与镜像 9 集一致、files 键齐；**diff 审阅结论：变更仅限 er/gantt/ecommerce-flow 三 svg + manifest + 删除 login-flow/microservices 两 svg，architecture/datastream/mindmap/sequence/state/uml-class 六 svg 字节 0 diff**（确定性自证）；manifest 无时间戳字段 | P0 |

---

### 组 5：测试联动与总验收（对应 G-006/G-007、discovery §2.4 #6-8、风险 R1/R2）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-012 | **kind-coverage.test.ts login-flow 断言换档到 ecommerce-flow + er 适配**：①start/end 药丸用例（:53）`example('login-flow')` 的 'start' 节点 → `example('ecommerce-flow')` 的 'browse' 节点；②decision 菱形用例（:83）`example('login-flow')` 的 'verify' 节点 → ecommerce-flow 的 'validate' 节点；③嵌套组用例（:174-187）login-flow frontend/auth 外含内 → ecommerce-flow platform/shopping 外含内（group rect 计数 3→5，:176 断言同步）；④er members 行文本断言（:106-109）`>id</text>` 等 → typed 行文本（`>id: bigint</text>` 等）；⑤文件头 kind 覆盖核对表（:9/:11/:16）相关 id 引用同步。断言**语义等价迁移**，数量不缩减 | 换档后 kind-coverage.test.ts 全绿；git diff 中每处 login-flow→ecommerce-flow 迁移均显式可见（无静默删断言）；gantt milestone 菱形断言（:138-154）不改动且通过（duration=0 不影响 kind 判定） | P0 |
| FR-013 | **matrix-a / matrix-b 联动复核**：①matrix-a（:123-133 遍历自动 9 条）er edges[0]=user→order 与 uml-class edges[1]=order→payment 专项断言随 er 增强保持成立（FR-003 保证 edges[0] 不变序；uml-class 零改动保证 edges[1] 不变）→ 若增强后 audit 0 违例仍成立则零改动通过；②matrix-b state A 档对照组（:38 import、:249-251）**零改动**（state 例 source 零 diff 由 FR-005 锁定） | matrix-a 9 条全绿（audit 0 违例 + 2 条专项断言）；matrix-b 全绿且 git diff 无 matrix-b.test.ts 改动；**全仓 render 包测试全绿** | P0 |
| FR-014 | **总验收**：整合后全仓一致性——examples.ts / 镜像 / 磁盘产物 / golden 四面对齐（9 集），测试全绿，约束满足 | ①`npm run test --workspaces` 全仓绿；②9 图类型集合不变（9 id × 9 type 一一映射）；③examples/ 与 examples.ts 双向一致（无孤儿、无缺漏）；④golden manifest ids 9 + 双校验绿；⑤git diff 范围 = 本 spec 明列文件（FR-001~FR-013），无 scope.out 越界（引擎 4 包 src/dist 零 diff 由 NFR-001 审计） | P0 |

---

## 6. 非功能需求 (NFR)
> 性能、安全、可用性等跨切面需求

| ID | 类别 | 需求描述 | 验收标准 |
|----|------|---------|---------|
| NFR-001 | 兼容/旁路 | **零引擎改动、零新 DSL**：examples 内容增强只用既有合法 DSL 写法（对照 lgdl-spec + B 档 fixture 写法）；render/layout/router/core 四包 src 业务文件零 diff | `git diff --stat` 无 4 包 src 业务文件改动行；dist 产物与改动前一致（hash 比对）；9 例全部 parse valid |
| NFR-002 | 可维护 | **单一事实源守恒**：examples.ts 为唯一权威，磁盘产物与镜像均为其派生；整合后无任何"磁盘有、examples.ts 无"或反向缺漏 | 脚本双向比对：磁盘 9 .lgdl ↔ examples.ts 9 source 逐字一致；examples-sources.ts 9 ↔ examples.ts 9 逐字一致；examples/ 文件集合与 EXAMPLES id 集完全相等 |
| NFR-003 | 可维护 | **快照纪律**：golden 变更仅经 `LGDL_UPDATE_SNAPSHOTS=1` 显式重建 + git diff 审阅；普通 npm test/CI 无写盘分支、不可能静默更新基线（ADR-003 机制不变） | manifest 无时间戳/环境字段（确定性可 diff）；diff 审阅记录在 build/validate 产物中可追溯 |
| NFR-004 | 一致性 | **测试同步守恒**：所有随示例集缩编的测试改动必须与 examples.ts 变更同步且显式可见——允许的改动类型 = ①遍历/计数 11→9（snapshot/matrix-a 循环自动）②login-flow 3 处断言语义等价迁移 ③er typed 行文本断言适配；禁止 = 断言静默删除、断言弱化、与示例 id 集无关的测试改动 | git diff 逐一对应 FR-009~FR-013 清单，无清单外测试文件改动；kind-coverage 迁移断言与原断言断言强度等价（同款几何/文本判定） |
| NFR-005 | 确定性 | **重建幂等与跨环境稳定**：同 Node 主版本下重复重建产物字节不变（引擎确定性 A-002）；CI（Node 20）与本地快照一致 | 未变更 6 例重建后字节 0 diff（FR-011 已含）；validate 阶段实测 CI 环境快照一致；若 Node 版本差异致字节差 → EC-007 流程 |

## 7. 边界情况 (EC)
> 异常场景和边界条件的处理方式

| ID | 场景 | 处理方式 |
|----|------|---------|
| EC-001 | **er/gantt/ecommerce 增强内容触发 matrix-a 真实违例**（discovery H2/H3：n:m 双多未断言组合、新基数边/里程碑几何、嵌套组边路由） | ①先核对 DSL 写法合法 + 语义合理；②优先**最小化调整设计内容**（保持 D-003/D-004 覆盖语义：基数 token 全集与依赖三型不降级）再重建；③若为引擎真实缺陷 → 按 render-gate EC-001 同款流程：标记已知缺口记录 + 上报作者裁决，**不修引擎（NG-004）、不放宽审计口径**；matrix-a 0 违例标准不降 |
| EC-002 | **里程碑 duration=0 文本语义与作者预期不符**（discovery H1：render 文本按 index.ts:1217 输出 `${start}d +0d`） | 里程碑菱形按 kind 判定绘制（index.ts:1237-1243）与 duration 无关，形状不回归；文本 `+0d` 为确定性语义锚点 → validate 阶段实测确认后写入产物；若作者期望"零宽时间点不显示时长文本" → 记开放问题 OQ-5，由作者另立引擎微调 Feature，本 Feature 不改引擎 |
| EC-003 | **README/docs 引用失效**（删除后 README 图库 2 处 png/源码链接 404（:21 login-flow/:29 microservices）、AI 评审 9 孤儿说明段（:37-39）、docs-tree 快照"11 个内置示例"） | 不在 scope.in（NG-006）：README 与 docs 历史清理留待作者决策（OQ-1/OQ-2）；评审记录属历史存档建议保留；本 Feature 产物中标注"已知引用失效清单"移交作者 |
| EC-004 | **镜像同步出错 / web 源与镜像漂移**（examples.ts 与 examples-sources.ts 手工同步遗漏，ADR-002 R-008） | golden 双校验（字节 + sha256）在镜像侧自证；若镜像漂移 → golden 不静默漂移只随显式重建更新；以"重建后 manifest 与镜像一致 + git diff 核对 9 条逐字等价"为兜底（FR-009/FR-011 验收） |
| EC-005 | **孤儿文件删除前归档争议**（discovery D2：9 孤儿 .svg/.png 为 AI 视觉评审历史产物） | 默认不额外归档：产物在 git 历史中可完整恢复（评审记录 docs/reviews-2026-08-24/ai-vision-review.md 保留引用文字）；若作者要求归档 → 追加低成本归档步骤（tasks 期扩展），不阻塞主流程 |
| EC-006 | **examples.ts 编辑破坏转义格式 → gen-examples 正则解析失败**（discovery R4：source 单行转义字符串 + :25 正则硬解析） | 修复后脚本对解析失败条目输出错误且退出码非 0（不静默跳过）；以 FR-008「磁盘 9 .lgdl 与 examples.ts 逐字一致」双向比对兜底；build 阶段完成后立即跑脚本自证 |
| EC-007 | **快照跨平台/跨 Node 版本字节差**（NFR-005 残余风险） | 以 ci.yml 指定 Node 20 为基准固化；validate 实测若出现环境差异 → 降级策略由作者批准后实施，禁止直接放宽比对（与 render-gate EC-006 对齐） |

## 8. 开放问题
> 待决策事项和需要进一步调研的内容

| # | 问题 | 状态 |
|---|------|:--:|
| 1 | **README.md 图库与孤儿说明清理是否纳入本 Feature 后续（或另立）**：删除后 README:21/29 两处 png+源码链接 404、:37-39 AI 评审 9 孤儿说明段失效（scope.in 未列 README） | 待作者决策 |
| 2 | **docs 快照性文档刷新**：`.sddu/docs-tree-root/核心引擎/web-ai助手.md`(:37 "11 个内置示例")、`.sddu/docs-tree-root/系统架构/端到端数据流-dataflow.md`(:22 gen-examples 数据流) 与 render-gate 产物中"孤儿处置留待决策"记录（spec.md:51,72,75,225-226）是否收尾刷新/加注 | 待作者决策 |
| 3 | **op-cli 工具说明文档串**：`packages/lgdl-web-op-cli/src/ops.ts`(:57) / `tool.ts`(:45) 的 `--id login-flow` 示例参数（纯元数据非行为依赖）是否换用保留 id（如 ecommerce-flow） | 低优先待作者决策 |
| 4 | **目标版本**（下一发布窗口；与 render-gate 同批收口？） | 待作者决策 |
| 5 | **里程碑 duration=0 文本语义**（`${start}d +0d` 是否符合作者预期，EC-002 触发条件） | 待 validate 实测 + 作者裁决 |
| 6 | **er 双多 n:m（*..*）渲染审计结果**（B8 未断言组合，H2）——matrix-a 门禁验证；若 0 违例成立则关闭，若暴露缺陷走 EC-001 | 待 matrix-a 验证 |

## 修订记录
> 记录本文档的版本变更历史

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建 — 摸底后轻量模式（需求本质作者已对齐，零访谈，自主决策设计理由充分）：D-001 保留 9 张定案 + 删除双口径澄清；D-002 ecommerce-flow 补 platform 外组承接 2 层嵌套载体（含不选其他 5 图候选的理由）；D-003 er 增强（typed attrs + promotion 实体 + note 混 kind + 5 边基数五值 n:m 双多，edges[0]=user→order 守序；decision 不并入理由）；D-004 gantt 增强（里程碑 duration=0 + 依赖三型构造，负日期/分区带取舍理由）；FR-001~FR-014 五组（内容定案/删除清理/生成链路/镜像与 golden/测试联动与总验收）+ 5 NFR + 7 EC + 6 开放问题；联动清单精确到文件:行号（examples.ts / 镜像 :2 / snapshot :73 / golden manifest / kind-coverage :53,:83,:174-187,:106-109 / matrix-a :131-132 / matrix-b :249-251 / gen-examples.mjs :15-20 / render-one.mjs :12-14）；总验收 = 全仓 npm test 绿 + 四面（examples.ts/镜像/磁盘/golden）9 集对齐 + 四包引擎零 diff | 2026-09-03 | SDDU Spec Agent |
