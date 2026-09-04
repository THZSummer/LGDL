# 技术计划：specs-tree-examples-consolidation（示例图整合）

> **文档定位**: SDDU 技术方案 — 记录架构设计、方案对比和 ADR，作为 tasks 阶段的输入
> **前置依赖**: spec.md v1.0（14 FR / 5 NFR / 7 EC / 设计决策 D-001~D-004）+ discovery.md v1.0（孤儿清单 / 引用面 13 处 / gen-examples 断裂实证）
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-03
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-03
> **更新说明**: 初始创建 — 将 spec D-001~D-004 决策落地为 9 图 DSL 终态、文件级变更清单、迁移步骤与快照重建审阅判据；产出 ADR-001（gantt 三型构造节点化推断）

## 1. 前置检查
> 启动技术规划前必须验证的前置条件
| 检查项 | 状态 |
|--------|:--:|
| spec.md 存在（`.sddu/specs-tree-root/specs-tree-examples-consolidation/spec.md`，271 行） | ✅ |
| discovery.md 存在（181 行，孤儿/引用面/链路断裂/golden 现状全部带文件:行号证据） | ✅ |
| 外部 API 文档缓存 | ✅ 不适用（本 Feature 无外部服务依赖；gen-examples/render-one 为本地脚本，实测断裂原因 = 包路径非外部 API） |
| 前置依赖已满足（render-gate golden 门禁 11 组闭环 / engine-defect-fixes M1~M5 闭环 / examples.ts 单一事实源在位） | ✅ |
| 模板文件（sddu-plan.md.hbs） | ✅ 用户自定义 `.sddu/templates/agents/output/` 不存在 → 插件内置兜底 `.opencode/plugins/sddu/templates/output/sddu-plan.md.hbs` |
| 既有 ADR 编号核查（防冲突） | ✅ specs-tree-render-gate 已用 ADR-001~004（feature 局部编号先例）；本 feature 目录无既有 ADR → 局部编号 ADR-001 起用 |

## 2. 架构分析
> 分析现有架构影响和需要的新组件

### 2.1 机制架构（零新增组件）

本 Feature **不新增任何运行时组件**。机制架构保持既有闭环（spec §2.4、ADR-002/ADR-003 已建）：

```
examples.ts（单一事实源，11 例）
   │ ①手工编辑缩编/增强（FR-001~FR-005）
   ▼
examples-sources.ts（ADR-002 受管镜像，逐字同步）──→ golden manifest+11 svg（ADR-003 显式重建门）
   │ ②镜像同步（FR-009）                        │ ⑤LGDL_UPDATE_SNAPSHOTS=1 重建 9 组 + diff 审阅（FR-010/FR-011）
   ▼                                            ▼
gen-examples.mjs（修复 4 处包路径 FR-007）──→ examples/ 磁盘三件套（21 组 → 删 12 → 重生成 9，FR-006/FR-008）
```

依赖链：lgdl-web（examples.ts 消费端 App.tsx 自动跟随，默认首例 architecture 未删 → 零手改）→ lgdl-render 测试面（镜像/快照/kind-coverage/matrix-a/matrix-b）→ scripts（gen-examples/render-one）。引擎 4 包（lgdl-core/lgdl-layout/lgdl-render/lgdl-router）src **零 diff**（NFR-001，examples 内容变更只经既有 parse→layout→render 链路）。

### 2.2 数据流变更

| 流 | 变更 |
|----|------|
| 示例内容流 | examples.ts 11 条 source → 9 条（删 microservices/login-flow；er/gantt/ecommerce-flow 3 条改写）；镜像、磁盘、golden 三派生随动 |
| 快照流 | 镜像 11 → 9 → golden manifest ids 11 → 9；6 例未变更 svg 重建后字节 0 diff（确定性自证） |
| 生成流 | gen-examples.mjs:15-20 旧包路径 → lgdl-* 新路径 → 磁盘 9 组重生成 |
| 测试流 | snapshot 硬断言 11→9（:73）；kind-coverage login-flow 3 处断言换档 ecommerce-flow；matrix-a/matrix-b 遍历自动 9 条 |

### 2.3 9 图 DSL 终态设计（核心交付物）

原则（spec NG-002/FR-005）：零新 DSL 语法；6 图 source 逐字零 diff；3 图增强全部参照 B 档已验证写法（B7 matrix-docs-b.ts:404-440 / B8 :450-511 / B4b）+ login-flow 嵌套先例（render-gate Q-012 已锁）。

#### 2.3.1 保留零改动 6 张（source 逐字不变）

| # | id / type | 锁定依据 |
|---|---|---|
| 1 | architecture / arch | 10 节点全 kind + 3 组平铺 + 聚合边 g→g×2 + 混合 n→g（g→n 三型中唯一 A 档载体） |
| 2 | datastream / datastream | 2 泳道 = group + 泳道间聚合边 g→g |
| 3 | mindmap / mindmap | 径向多级树 + decision 叶折叠 + 无 kind 叶回退 process |
| 4 | sequence / sequence | 4 参与者 + 6 消息含 3 反向 |
| 5 | state / state | 9 state + 4 end + 3 分区组 + 15 转移；**单入口 initial 不可破坏**（matrix-b.test.ts:249-251 B10 对照组） |
| 6 | uml-class / uml-class | LR 类卡片 + members type/params/visibility + 3 关联边；**edges 序不变**（matrix-a.test.ts:132 edges[1]=order→payment 专项） |

> 6 图 source 零 diff 是 golden 6 svg 字节 0 diff（FR-011）与 matrix-b 对照组（FR-013②）的前提，build 阶段以 `git diff` 逐字符核验。

#### 2.3.2 ecommerce-flow（flowchart）增强终态 —— 补 2 层嵌套 group（D-002）

**变更面**：仅 nodes 区尾部（after-sale 组声明之后、`edges:` 之前）**新增 1 个外层分组节点**；业务节点 14 + 边 17 + 既有 4 域组**内容零改动**；group 数 4 → 5。

新增节点 DSL（插在 `contains: [refund]` 之后）：

```yaml
  - id: platform
    label: 电商平台
    kind: group
    contains: [shopping, trade, fulfillment, after-sale]
```

**嵌套链**：`platform ⊃ shopping ⊃ browse/cart`（2 层嵌套）。`contains` 引用内层 group id（shopping 等）与 login-flow 先例同构（login-flow.lgdl:25-28 `frontend contains: [start, auth]`，golden 已锁渲染/审计 0 违例）——group 引用 group id 属既有合法写法（ADR-002 group-as-node，contains 可引用 node id 或 group id）。platform 声明序在 4 域组之后（login-flow 外组 frontend 同样声明于内组 auth 之后，layout computeGroupBox 递归已支持，render-gate Q-012 覆盖）。

**终态校验点**：
- 磁盘/镜像源含 platform 组声明；`lgdl-group` rect 数 = 5（platform/shopping/trade/fulfillment/after-sale）
- kind-coverage 迁移后断言：platform 外框完整含 shopping 内框（沿用现 :181-186 外含内判定，id 换 platform/shopping，见 §5.7）
- 聚合边 trade→fulfillment 变为嵌套组内跨子域边（语义不变，17 边零改动）

#### 2.3.3 er 增强终态 —— 多基数 + typed attributes + note 混 kind（D-003）

**变更面**：4 实体 members 补 `type`；新增 promotion 实体 + amount-note 便签；3 条边基数改写 + 新增 2 条带基数边 + 1 条 note 约束边；**edges[0] = user→order 保持**（matrix-a.test.ts:131 专项）。

完整终态 DSL（examples.ts 内须转义为单行 `\n` 字符串，见 §5.1）：

```yaml
title: 电商 ER 图
type: er

nodes:
  - id: user
    label: 用户
    kind: entity
    members:
      - kind: attribute
        name: id
        type: bigint
      - kind: attribute
        name: name
        type: varchar
      - kind: attribute
        name: email
        type: varchar
  - id: order
    label: 订单
    kind: entity
    members:
      - kind: attribute
        name: id
        type: bigint
      - kind: attribute
        name: userId
        type: bigint
      - kind: attribute
        name: amount
        type: decimal
  - id: product
    label: 商品
    kind: entity
    members:
      - kind: attribute
        name: id
        type: bigint
      - kind: attribute
        name: name
        type: varchar
      - kind: attribute
        name: price
        type: decimal
  - id: order-item
    label: 订单项
    kind: entity
    members:
      - kind: attribute
        name: id
        type: bigint
      - kind: attribute
        name: orderId
        type: bigint
      - kind: attribute
        name: productId
        type: bigint
      - kind: attribute
        name: quantity
        type: int
  - id: promotion
    label: 促销
    kind: entity
    members:
      - kind: attribute
        name: id
        type: bigint
      - kind: attribute
        name: name
        type: varchar
      - kind: attribute
        name: discount
        type: decimal
  - id: amount-note
    label: 订单金额为下单时各订单项 quantity×price 之和快照
    kind: note

edges:
  - from: user
    to: order
    label: 拥有
    cardinalityFrom: "1"
    cardinalityTo: "0..*"
  - from: order
    to: order-item
    label: 包含
    cardinalityFrom: "1"
    cardinalityTo: "1..*"
  - from: product
    to: order-item
    label: 被选购
    cardinalityFrom: "0..*"
    cardinalityTo: "1"
  - from: order
    to: promotion
    label: 使用
    cardinalityFrom: "0..1"
    cardinalityTo: "0..*"
  - from: promotion
    to: product
    label: 覆盖
    cardinalityFrom: "*"
    cardinalityTo: "*"
  - from: amount-note
    to: order
    label: 约束
```

**设计与约束核对**：
| 项 | 值 | 依据 |
|---|---|---|
| 基数值域覆盖 | 1 / 0..1 / 0..* / 1..* / *..*（双多 n:m） | D-003 表 5 边，顺序即 doc.edges 顺序；edges[0]=user→order 守序（matrix-a :131） |
| typed 行文本 | er mode 渲染 `${name}${type ? ': ' + type : ''}`（render index.ts:713-714）→ `<text>id: bigint</text>` 型；kind-coverage :106-109 断言需适配 typed 文本 | 行式文本实证：孤儿 er-orders.lgdl（2026-08-24 产物）同款写法 |
| type 取值 | 沿用 er-orders.lgdl 既有字面量（bigint/varchar/decimal/int），零新枚举 | er-orders.lgdl:10-90 |
| promotion 实体 | 语义：一订单至多使用 0..1 种促销、促销被 0..* 订单使用、促销与商品 *..* 覆盖 | D-003 表 :152-155 |
| amount-note 混 kind | note 折角在 er mode 真实绘制（B8 已证 matrix-docs-b.ts:482-484/505-507）；note→order 约束边**无基数**、label 纯关系名（B8 note1→user 同型） | D-003 :156；B8 |
| quantity 成员 | order-item 补 `quantity: int`（spec D-003 :144 类型列举含 quantity: int；note 语义 quantity×price 需成员自洽） | ⚠️ 推断 U-1：若 build 认为超 spec 字面，可去掉 quantity（note 语义退化为静态规则描述），需在 tasks 期与作者确认 |
| decision 不并入 | er 语义无菱形分叉位，B8 已承担 | D-003 :156 |

#### 2.3.4 gantt 增强终态 —— 里程碑 duration=0 + 依赖三型（D-004）

**变更面**：launch attrs.duration 1 → 0；主线链数值微调保持 gap≈0；**新增 doc（文档编写）/ retro（发布复盘）2 个 process 节点**承载"目标在左 / gap≥20"两条独立边（源节点均为 process，判定见下）；既有 4 process 主线语义保留。

> ⚠️ **推断 U-2（关键）**：spec D-004 表（spec.md:169-174）三型示例构造明确给出 `test→doc`、`test→retro` 两条独立边——但现 gantt 节点集（research/design/develop/test/launch）**不含 doc/retro**。现有 5 节点全部在主线链上（互相已连成 gap≈0 链），任意再连边必与主线判定冲突或成重复边；**不新增节点则 FR-004「目标在左 1 边 + gap≥20 1 边」无法构造**。故新增 2 process 节点是唯一满足 FR-004 的构造。tasks 期若作者意图为仅现有 5 节点 → 需回退改 spec（gap≈0 链 ≥4 边与三型并存无法同时满足）。此推断已落盘 ADR-001。

完整终态 DSL：

```yaml
title: 产品发布甘特图
type: gantt

nodes:
  - id: research
    label: 需求调研
    kind: process
    attrs:
      start: 0
      duration: 3
  - id: design
    label: 原型设计
    kind: process
    attrs:
      start: 3
      duration: 3
  - id: develop
    label: 开发实现
    kind: process
    attrs:
      start: 6
      duration: 8
  - id: doc
    label: 文档编写
    kind: process
    attrs:
      start: 10
      duration: 2
  - id: test
    label: 测试验收
    kind: process
    attrs:
      start: 14
      duration: 4
  - id: retro
    label: 发布复盘
    kind: process
    attrs:
      start: 38
      duration: 4
  - id: launch
    label: 上线发布
    kind: milestone
    attrs:
      start: 18
      duration: 0

edges:
  - from: research
    to: design
  - from: design
    to: develop
  - from: develop
    to: test
  - from: test
    to: launch
  - from: test
    to: doc
  - from: test
    to: retro
```

**三型逐边验算**（以 source attrs 数值为准；数值可按 U-2 规则微调，须满足判定）：

| 边 | 型 | 判定验算 |
|---|---|---|
| research→design | gap≈0 | target.start 3 = research.end 0+3 |
| design→develop | gap≈0 | 6 = 3+3 |
| develop→test | gap≈0 | 14 = 6+8 |
| test→launch | gap≈0 | 18 = 14+4（里程碑 launch = 主链终点目标）|
| test→doc | 目标在左 | doc.start 10 < test.end 18（反向/重叠依赖，连线向左绕行）|
| test→retro | gap≥20 | retro.start 38 − test.end 18 = 20 ≥ 20（上线后第 3 周复盘）|

**行序与不穿条构造**（layoutGantt 按 doc.nodes 声明序逐行堆叠，layout index.ts:721-730）：
行序 = research(1)/design(2)/develop(3)/doc(4)/test(5)/retro(6)/launch(7)。
- develop→test 垂直段 x=14 列，中间行 doc 条占 10..12 列 → 空列通过，不穿条
- test→doc 相邻行（行 5→4）
- test→retro 相邻行（行 5→6），gap≥20 段 x≥38 列与中间行条无交
- test→launch 跨 retro 行（行 5→7），垂直段 x=18 列，retro 条 38..42 列 → 空列通过
- 参照 B7「相邻行 + 空列」构造纪律（matrix-docs-b.ts:401-403）；最终以 matrix-a 0 违例门禁验收（FR-004/EC-001），若真红 → 最小化调数值（保三型判定）→ 仍红走 EC-001 记录，不降审计

**duration=0 引擎安全性**（discovery H1 已证）：
- 菱形按 kind 判定绘制（render index.ts:1237-1243），与 duration 无关 → 形状不回归
- 条宽 `Math.max(dur * colW - 4, 20)` clamp ≥20px（layout index.ts:728）→ duration=0 槽宽 20px ≥ 菱形直径 18px（r=9，kind-coverage :138-154 菱形宽高断言 18±0.6 仍成立）
- 时间文本 `${start}d +${dur}d`（render index.ts:1219）→ 里程碑文本显示 `18d +0d`（确定性语义锚点，EC-002 validate 实测确认）
- kind-coverage milestone 菱形断言（:138-154）**不改动且通过**（FR-012⑤）

#### 2.3.5 9 图类型守恒自检

9 id × 9 type 一一映射：architecture(arch)/datastream(datastream)/er(er)/gantt(gantt)/ecommerce-flow(flowchart)/mindmap(mindmap)/sequence(sequence)/state(state)/uml-class(uml-class) → 类型集合 = {arch, datastream, er, gantt, flowchart, mindmap, sequence, state, uml-class} 9 类不变（FR-014②）。EXAMPLES[0]=architecture 不变 → App.tsx 默认首例无感（NG-007）。

### 2.4 迁移步骤（执行顺序总纲）

spec FR-001~FR-014 的依赖拓扑决定的执行序（tasks 拆解基准）：

```
Step 1  内容面：examples.ts 11→9（删 2 条目 + 3 例 source 改写，§5.1）
Step 2  镜像面：examples-sources.ts 11→9 逐字同步（§5.2）
Step 3  测试联动：snapshot.test.ts 断言 11→9（§5.4）＋ kind-coverage.test.ts login-flow 换档 + er typed 适配（§5.7）；matrix-a/matrix-b 零改动复核
Step 4  链路修复 + 磁盘重建：gen-examples.mjs / render-one.mjs 4 处路径（§5.5）→ 删 12 组三件套（§5.6）→ npm run build（dist）→ node scripts/gen-examples.mjs 重生成 9 组
Step 5  快照重建：LGDL_UPDATE_SNAPSHOTS=1 跑 lgdl-render 测试 → golden 11→9 + git diff 审阅（§4.3 判据）
Step 6  总验收：全仓 npm run test --workspaces + 四面（examples.ts/镜像/磁盘/golden）9 集双向一致 + 引擎 4 包 src 零 diff
```

Step 顺序理由：镜像同步必须先于测试联动与快照重建（快照对象集 = 镜像，snapshot.test.ts:41-49）；磁盘重生成依赖脚本修复 + dist 构建；golden 重建只能在全内容/镜像终态后执行一次（ADR-003 显式重建纪律，避免二次重建）。**Step 4 前需确认 4 包 dist 已构建**（gen-examples.mjs:15-17 import dist）。

## 3. 方案对比
> 2-3 个可行方案的对比分析

| 维度 | 方案 A：一次性整体整合（推荐） | 方案 B：分阶段提交（删例 → 增强 → 快照三段） | 方案 C：机制先行（先修脚本自证 → 再改内容） |
|------|:--|:--|:--|
| 描述 | examples.ts 缩编+增强 → 镜像同步 → 测试联动 → 磁盘重建 → golden 显式重建一次 → 全量回归 | 先提交 11→9（含快照重建），再提交 er/gantt/ecommerce 增强（再重建快照） | 先修 gen-examples/render-one 路径并跑通旧 11 例自证幂等 → 再做内容整合与重建 |
| 优点 | 快照只重建一次（最小化 golden 变更面）；kind-coverage 断言一次性换档（无中间态）；git diff 单次审阅，范围与 spec FR-011 明列一致 | diff 粒度细、可分审可回滚；两类变更（删/改）独立验证 | 链路可信度先行；内容整合失败时可排除脚本因素 |
| 缺点 | 单次 diff 较大（但范围 = spec 明列文件，可控）；出错定位需一次处理 | golden 需重建两次（删例一次 + 增强一次）；kind-coverage 断言两轮迁移；中间态无独立发布价值，工作量近翻倍 | 前置自证需临时构造（旧 11 例内容马上会被改掉），自证价值低；总步骤未减少 |
| 风险 | 低（变更集与 spec FR-001~FR-013 清单一一对应） | 中（中间态镜像/断言两轮迁移易漏；快照双重建违反最小变更意图） | 低（但前置工作部分浪费） |
| 工作量 | 约 1.5~2 人日（含验证） | 约 3 人日 | 约 2~2.5 人日 |

## 4. 推荐方案
> 推荐方案及选择理由

**推荐**: 方案 A（一次性整体整合）

**理由**:
1. **快照纪律最优**：golden 变更只经一次 `LGDL_UPDATE_SNAPSHOTS=1` 显式重建（ADR-003），6 例未变更 svg 字节 0 diff 的自证只需一次；方案 B 的双重建放大 golden diff 面与审阅负担。
2. **中间态无价值**：删例后、增强前的镜像/断言中间态不具备任何独立发布意义（11→9 只是过渡），两轮迁移反而制造"计数残留/断言换档遗漏"风险窗口。
3. **变更集闭合可控**：spec FR-001~FR-013 已将全部改动精确到文件:行号，方案 A 的单次 git diff 即可完整对照审阅（NFR-004 测试同步守恒的显式可见性要求）。
4. **方案 C 的前置自证可内联**：脚本路径修复（§5.5）是纯机械 4 处替换，Step 4 中"修复 → 跑旧 11 例验证 → 删旧产物 → 跑新 9 例"的顺序天然完成 C 的目标，无需独立成案。

### 4.1 关键实施要点（tasks 输入）

- examples.ts source 为**单行转义字符串**（gen-examples.mjs:25 正则硬解析），er/gantt/ecommerce-flow 三例改写必须保持既有 `\n` 转义格式；编辑后立即跑 gen-examples 自证解析 9/9（EC-006：解析失败须退出码非 0，不静默跳过）。
- 镜像同步禁止 import web（render→web 成环，examples-sources.ts:12）；以脚本双向比对 9 条逐字一致验收（NFR-002）。
- gantt 三型数值（§2.3.4 表）允许 tasks 期按 U-2 微调，但**三型判定不可降级**（FR-004）；er 基数 token 全集不可降级（EC-001）。
- matrix-b.test.ts 零改动（FR-013②）；matrix-a.test.ts 零改动（遍历自动 9 条；er edges[0]/uml-class edges[1] 专项由内容守序保证）。

### 4.2 快照 diff 审阅判据（FR-011 落地）

重建后 `git diff` 审阅必须满足：
1. **变更集上界**：git 变更文件 ⊆ §5 文件影响表所列；**无任何 scope.out 越界**（引擎 4 包 src/dist 零 diff、README/docs/op-cli 文档串零 diff）。
2. **golden 目录**：
   - 变更（字节级）：`er.svg`、`gantt.svg`、`ecommerce-flow.svg` + `manifest.json`
   - 删除：`login-flow.svg`、`microservices.svg`
   - **0 diff（必证）**：`architecture.svg` / `datastream.svg` / `mindmap.svg` / `sequence.svg` / `state.svg` / `uml-class.svg`
3. **manifest 语义**：ids 恰 9 且与 EXAMPLES_SOURCES id 集一致（顺序同）；files 键齐无多余；version=1；无时间戳/env 字段（确定性可 diff）。
4. **三张变更 svg 的 diff 内容核验**：
   - er.svg：出现第 5 实体卡片 promotion + note 折角 path；user/order 卡片 members 行文本带 `: bigint` 等 type 后缀；基数锚点文本出现 `0..1` / `0..*` / `1..*` / `*` 双端组合（G4 不压框由 matrix-a 兜底）
   - gantt.svg：launch 菱形文本 `18d +0d`；任务行 7（doc/retro 新增）；依赖箭头 6（含 1 条向左绕行的目标在左 + 1 条长距 gap≥20）
   - ecommerce-flow.svg：`lgdl-group` 5 个 rect，platform 外框完整包含 shopping/trade/fulfillment/after-sale 四内框
5. **重建后回归**：lgdl-render 包 snapshot 9 条双校验（字节 + sha256）全绿（snapshot.test.ts:89-97 自动循环）。

## 5. 文件影响分析
> 所有需要创建/修改/删除的文件

### 5.1 `packages/lgdl-web/src/examples.ts`（MODIFY — 主体，FR-001~FR-005）

| 操作 | 位置 | 说明 |
|:--:|------|------|
| DELETE | :21-25（microservices 整条目，含 id :22 起的对象字面量 + 前导空行 :20） | 删除 microservices 条目（arch 重复例）；4 行对象 + 周边空行 |
| DELETE | :41-45（login-flow 整条目 + 空行 :46 一并处理） | 删除 login-flow 条目（flowchart 重复例） |
| MODIFY | :32-35（er 条目 source :34） | source 整体替换为 §2.3.3 终态 DSL（单行 `\n` 转义串） |
| MODIFY | :37-40（gantt 条目 source :39） | source 整体替换为 §2.3.4 终态 DSL（含 launch duration=0、doc/retro 新增、6 边） |
| MODIFY | :48-51（ecommerce-flow 条目 source :50） | source 中 after-sale 组声明后、`edges:` 前插入 platform 组声明（§2.3.2）；其余逐字不动 |
| KEEP | :14-19 architecture / :26-30 datastream / :52-71 mindmap·sequence·state·uml-class | **逐字零 diff**（FR-005）；:1-6 文件头 "single source of truth" 注释保留 |

终态：`EXAMPLES.length === 9`；id 序 = architecture/datastream/er/gantt/ecommerce-flow/mindmap/sequence/state/uml-class。

### 5.2 `packages/lgdl-render/src/test-support/examples-sources.ts`（MODIFY — 镜像，FR-009）

| 操作 | 位置 | 说明 |
|:--:|------|------|
| MODIFY | :2 注释 | "11 source" → "9 source" |
| DELETE | :21（microservices 条目） | 与 examples.ts 同步删除 |
| DELETE | :25（login-flow 条目） | 与 examples.ts 同步删除 |
| MODIFY | :23（er）/ :24（gantt）/ :26（ecommerce-flow） | 3 条 source 与 examples.ts 终态**逐字等价**（含增强内容） |
| KEEP | :19-20/:22/:27-30（architecture/datastream/mindmap/sequence/state/uml-class） | 零 diff |

> 注意：examples-sources.ts 条目为单行对象（`{ id, source }` 一行），examples.ts 为多行条目——同步以 **source 字符串逐字一致**为验收（脚本比对），禁止 import web。

### 5.3 `scripts/gen-examples.mjs`（MODIFY — 链路修复，FR-007）

| 位置 | 现值 → 目标值 |
|------|------|
| :3 注释 | `packages/web/src/examples.ts` → `packages/lgdl-web/src/examples.ts`（文档串同步） |
| :15 | `../packages/core/dist/index.js` → `../packages/lgdl-core/dist/index.js` |
| :16 | `../packages/layout/dist/index.js` → `../packages/lgdl-layout/dist/index.js` |
| :17 | `../packages/render/dist/index.js` → `../packages/lgdl-render/dist/index.js` |
| :20 | `packages/web/src/examples.ts` → `packages/lgdl-web/src/examples.ts` |

其余逻辑零改动（:25 正则、:47-55 PNG 可选容错保留）。

### 5.4 `scripts/render-one.mjs`（MODIFY — 链路修复，FR-007）

| 位置 | 现值 → 目标值 |
|------|------|
| :12 | `../packages/core/dist/index.js` → `../packages/lgdl-core/dist/index.js` |
| :13 | `../packages/layout/dist/index.js` → `../packages/lgdl-layout/dist/index.js` |
| :14 | `../packages/render/dist/index.js` → `../packages/lgdl-render/dist/index.js` |

### 5.5 `packages/lgdl-render/src/snapshot.test.ts`（MODIFY — 计数联动，FR-010）

| 位置 | 现值 → 目标值 |
|------|------|
| :4 / :8 / :10 / :11 / :41 / :69 | 注释与 test 名 "11" → "9"（含 :4 "11 源"、:8 "长度 11"、:10-11 "重写 11 svg"、:41 "渲染 11 例"、:69 test 名 "11 ids"） |
| :73 | `assert.equal(manifest.ids.length, 11` → `9`（含错误消息文案） |
| KEEP | :51-67 更新门（LGDL_UPDATE_SNAPSHOTS=1）、:89-97 逐例双校验循环（随 EXAMPLES_SOURCES 自动 9 条，无需逐条改） |

### 5.6 examples/ 磁盘（DELETE + 重生成，FR-006/FR-008）

**DELETE 12 组三件套 = 36 文件**（10 孤儿 + 2 重复例镜像）：

| 组 | 文件（各 .lgdl/.svg/.png） |
|----|------|
| 孤儿 1-10 | arch-ecommerce / datastream-log / er-orders / flowchart-auth / gantt-saas-roadmap / group-node-demo / mindmap-product / sequence-order / state-order / uml-class-order |
| 镜像 11-12 | microservices / login-flow |

删除后 examples/ 恰剩 9 组（architecture/datastream/er/gantt/ecommerce-flow/mindmap/sequence/state/uml-class），随后 `node scripts/gen-examples.mjs`（dist 已构建前提下）重生成覆盖 9 组三件套。终态：`ls examples/*.lgdl` = 9、`.svg` = 9、`.png` = 9 或无（resvg 缺失时以 lgdl/svg 为验收主体，FR-008）。

> 说明：9 组中的非增强 6 组 .svg 若与旧磁盘字节不同，属"修正 render-gate D-002 记录的磁盘漂移 7/11"（snapshot.test.ts:5 注释佐证），以「磁盘 .lgdl ↔ examples.ts 逐字一致 + .svg 为当前引擎渲染字节」为验收（FR-008），不以旧磁盘字节为基线。

### 5.7 `packages/lgdl-render/src/kind-coverage.test.ts`（MODIFY — 断言换档，FR-012）

| 位置 | 现值 → 目标值 |
|------|------|
| :9 核对表 start/end 行 | `login-flow/architecture/state/B1` → `ecommerce-flow/architecture/state/B1` |
| :11 核对表 decision 行 | `login-flow / B1` → `ecommerce-flow / B1` |
| :13 核对表 note 行 | `architecture、microservices / B1/B8` → `architecture / B1/B8`（删 microservices 引用） |
| :16 核对表 group 行 | `architecture、login-flow(2 层嵌套)、datastream、B4b` → `architecture、ecommerce-flow(2 层嵌套)、datastream、B4b` |
| :53-57 start/end 药丸用例 | `example('login-flow')` + node `'start'` → `example('ecommerce-flow')` + node `'browse'`（browse 为 ecommerce-flow 的 start kind 节点） |
| :83-95 decision 用例 | `example('login-flow')` + node `'verify'` → `example('ecommerce-flow')` + node `'validate'`（validate 为 decision kind） |
| :106-109 er members 断言 | `>id</text>`/`>name</text>`/`>email</text>` → `>id: bigint</text>`/`>name: varchar</text>`/`>email: varchar</text>`（typed 行文本适配，断言强度等价） |
| :167 test 名 | "login-flow 2 层嵌套外含内" → "ecommerce-flow 2 层嵌套外含内"（文案） |
| :174-187 嵌套组用例 | `example('login-flow')` → `example('ecommerce-flow')`；lgdl-group rect 计数 3 → **5**（:176）；外含内判定取 platform 外框 vs shopping 内框（:181-182，id frontend→platform、auth→shopping） |
| KEEP | :138-154 gantt milestone 菱形断言（duration=0 不影响 kind 判定，**不改动**）；:189-197 datastream 泳道；:201-207 mindmap 无 kind |

### 5.8 零改动文件（FR-005/FR-013/NG-001~NG-007 验证锚点）

| 文件 | 零改动理由 |
|------|------|
| `packages/lgdl-render/src/matrix-a.test.ts` | :123-133 遍历随 EXAMPLES_SOURCES 自动 9 条；:131 er edges[0]=user→order、:132 uml-class edges[1]=order→payment 专项由内容守序保持（FR-003/FR-005）；若 audit 0 违例成立 → 零改动通过（FR-013①） |
| `packages/lgdl-render/src/matrix-b.test.ts` | :38 import、:249-251 state 对照组由 FR-005 source 零 diff 锁定；**零改动**（FR-013②） |
| `packages/lgdl-web/src/App.tsx` | EXAMPLES 消费端自动跟随；EXAMPLES[0]=architecture 默认首例无感（NG-007） |
| 引擎 4 包 src | lgdl-core/lgdl-layout/lgdl-render/lgdl-router src 业务文件零 diff（NFR-001） |
| README.md / docs/ / op-cli 文档串 | scope.out（OQ-1/OQ-2/OQ-3 待作者决策） |
| `packages/lgdl-render/test-assets/golden/` 6 个 svg | architecture/datastream/mindmap/sequence/state/uml-class 重建后字节 0 diff（FR-011 自证） |

### 5.9 新增文件

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| NEW | `.sddu/specs-tree-root/specs-tree-examples-consolidation/ADR-001-gantt-dependency-three-form-node-ext.md` | gantt 三型构造新增 doc/retro 节点推断决策（§7） |
| NEW | `.sddu/specs-tree-root/specs-tree-examples-consolidation/plan.md` | 本文档 |

## 6. 风险评估
> 识别技术、依赖和时间风险及缓解措施

| 风险 | 概率 | 影响 | 缓解措施 |
|------|:--:|:--:|----------|
| er/gantt/ecommerce 增强内容触发 matrix-a 真实违例（n:m 双多未断言组合 H2、新基数边/里程碑几何、嵌套组边路由 H3） | 中 | 高 | ①先核对 DSL 合法 + 语义合理；②最小化调整设计内容（基数 token 全集/依赖三型不降级）；③引擎真缺陷 → EC-001 记录上报，不修引擎不放宽审计（NG-004/EC-001） |
| examples.ts source 单行转义编辑破坏 → gen-examples :25 正则解析失败（R4/EC-006） | 中 | 高 | 修复后脚本对解析失败输出错误且退出码非 0；build 后立即跑脚本自证 9/9；以磁盘 ↔ examples.ts 逐字一致双向比对兜底（FR-008/NFR-002） |
| 镜像与 examples.ts 手工同步遗漏漂移（ADR-002 R-008/EC-004） | 中 | 中 | golden 双校验在镜像侧自证；重建后 manifest 与镜像一致 + git diff 核对 9 条逐字等价（FR-009/FR-011 验收兜底） |
| kind-coverage login-flow 断言换档出错（id 引用错、计数漏改） | 中 | 中 | 每处迁移显式可见（NFR-004，禁静默删断言）；换档后全绿 + git diff 逐一对应 FR-012 清单 |
| gantt duration=0 文本语义 `18d +0d` 不符作者预期（EC-002/H1） | 中 | 低 | 里程碑形状按 kind 不回归；文本为确定性语义锚点，validate 实测确认；作者不认可 → OQ-5 另立引擎微调 Feature，本 Feature 不改引擎 |
| gantt 三型新增 doc/retro 节点推断与作者意图不符（U-2） | 低 | 中 | ADR-001 记录推断链与唯一性论证；tasks 期向作者确认；若否 → 回退改 spec（5 节点内无法同时满足 gap≈0 链 ≥4 边 + 两独立边） |
| golden 静默漂移/跨 Node 版本字节差（EC-007/NFR-005） | 低 | 中 | 仅 LGDL_UPDATE_SNAPSHOTS=1 写盘（snapshot.test.ts:51-67 无普通写盘分支）；以 ci.yml Node 20 为基准；环境差异 → EC-007 流程不直接放宽比对 |
| 磁盘漂移 .svg 重生成导致非增强例磁盘字节变化被误判为回归 | 中 | 低 | 验收以「examples.ts 逐字一致 + 当前引擎渲染」为准（FR-008），不以旧磁盘字节为基线；golden 0 diff 自证只针对 golden 资产 |
| dist 未构建导致 gen-examples 运行失败 | 低 | 低 | Step 4 前置 `npm run build`（gen-examples.mjs:15-17 import dist）；构建纳入 tasks |
| 时间风险：3 例 source 大字符串编辑 + 镜像逐字同步的机械劳动量 | 中 | 低 | 以磁盘 .lgdl（多行可读版）为编辑母本，经转义生成单行串；脚本双向比对代替目视 |

## 7. 生成的 ADR
> 本次规划产出的架构决策记录

| ADR | 标题 | 状态 |
|-----|------|:--:|
| ADR-001 | gantt 依赖三型构造需新增 doc/retro 两 process 节点（spec D-004 表隐含扩展的唯一满足构造） | PROPOSED |

> 其余设计决策（D-001 保留 9 张 / D-002 ecommerce 嵌套 / D-003 er 增强 / D-004 gantt 增强主体）已在 spec 阶段定案并锁入 spec.md，plan 仅做执行落地，不重复产出 ADR。

## 8. 修订记录
> 记录本文档的版本变更历史

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建 — 9 图 DSL 终态（ecommerce-flow platform 外组 / er 5 实体+typed+note+6 边基数五值 / gantt 7 任务+里程碑 duration=0+依赖三型）、文件级变更清单（精确到文件:行号，含零改动锚点）、迁移 6 步、快照 diff 审阅 5 判据、风险 10 项 + ADR-001 | 2026-09-03 | SDDU Plan Agent |
