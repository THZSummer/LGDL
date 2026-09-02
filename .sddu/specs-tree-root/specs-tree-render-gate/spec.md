# Feature Specification：specs-tree-render-gate（补全 LGDL 门禁测试用例）

> **文档定位**: SDDU 需求规范 — 定义功能需求、非功能需求和边界情况，作为 plan 阶段的输入
> **前置依赖**: discovery.md（摸底型盘点：穷举空间 D1~D7 / 缺口矩阵 Q-001~Q-014 / golden 快照面含 7/11 漂移实测 / 几何检测方式建议 / 风险 7 项，全部代码证据 2026-09-02）+ ROADMAP v1.4.0（F-15 几何审计 / F-17 确定性哈希快照）+ state.json（需求本质作者已对齐：纯测试、旁路）
> **创建人**: SDDU Spec Agent
> **创建时间**: 2026-09-02
> **版本**: v1.1
> **更新人**: SDDU Fast Agent（作者指令）
> **更新时间**: 2026-09-03
> **更新说明**:
> v1.1（2026-09-03）— 门禁新增 **G6「沿框边借道」**检查项（作者实测盲区：architecture `user→core` 聚合边沿 core 组框顶边平行滑入 83px，path `M 242,88 L 202,88 L 202,600 L 353,600`）。本增量**只改审计口径**（test-support + 测试断言 + spec）：D-003 表新增 G6 行（含判定/容差/无端点豁免理由）、Violation type 扩为 G1~G6、AUDIT_TOL 增 `edgeRideTolPx=0.5`、FR-006 helper 自测 +4（G6 正反例）、矩阵 A/B 档按实测记录已知 G6 集（EC-001 同款：engine 贴边走线修复另 Feature，NG-004 不修引擎）。无 phase 流转。
> v1.0（2026-09-02）初始创建 — 摸底后轻量模式（需求本质作者已对齐，无访谈）：穷举矩阵等价类合并方案定案（D-001，验证矩阵 A+B 两档 ≈21~22 文档）、快照对象集拍板（D-002，11 例事实源 + 当前引擎重渲染为基线）、五项几何违规判定语义钉死（D-003，含容差常量）、测试落位与守恒（D-004，437 基线只增不删）、怪角处置（D-005）、语法变体不乘入矩阵（D-006）。需求映射 discovery Q-001~Q-014 → FR-001~FR-012

## 1. 元数据
> Feature 基本信息

| 字段 | 值 |
|------|-----|
| Feature ID | F-15 + F-17（ROADMAP v1.4.0，作者指令 2026-09-02 转正） |
| 名称 | specs-tree-render-gate（补全 LGDL 门禁测试用例：渲染产物几何审计 + examples golden 快照字节回归） |
| 优先级 | P0（发布前门禁：全绿才准交付） |
| 目标版本 | 下一发布窗口（未定，见开放问题 #6） |

## 2. 上下文
> 回顾问题背景和目标用户（摸底后轻量模式：无访谈，依据 discovery.md 基线归纳）

### 2.1 要解决的问题

discovery 摸底（源码只读实测 2026-09-02）确认三大核心问题成立，全部带代码证据：

| 核心问题 | 现状（代码证据） | 业务影响 |
|---------|----------------|---------|
| **渲染几何正确性零护栏** | layout 包 **0 测试**（src 无 *.test.ts）；svg.test.ts 7 例全部 `includes(...)` 结构断言 + 手造 LayoutResult fixture（svg.test.ts:13-224，**从未调用 layoutDocument**）；无一条断言"布局/走线结果无几何违例" | "语义不变则输出不变"（docs/design.md:29）无机械兜底；`NODE_SEP=80/RANK_SEP=96`（layout/layered.ts:209-210）或 barycenter/A* 参数一动，全部历史图可能无感平移/变丑，回归只能靠人眼 |
| **穷举覆盖缺口大** | LGDL 写法空间 = 9 图类型（types.ts:24-34）× 9 node kind × 多类 edge（节点边/聚合边三态/自环拒绝/扇出合并/基数/专属消息依赖）× 语法写法变体；引擎侧测试只覆盖一小片，大量组合从未过完整 layoutDocument→renderSvg 链路 | 未断言=可回归；兜底分支（routeDefault 零长退化 render/index.ts:948-956、orthogonalize 兜底 router/index.ts:219-220）零专项审计 |
| **examples golden 快照缺失** | examples/*.svg 与当前引擎**漂移 7/11**（引擎 0489db9 修复后未重新生成，2026-09-02 实测）；全仓无任何字节级回归基线 | "同输入同输出"承诺无字节级证明；README/评审引用的示例产物不代表当前引擎输出 |

**需求本质（作者已对齐，state.json:9）**：补全门禁测试用例——穷举 LGDL 所有写法（9 图类型 × 全部 node kind × 全部 edge 类型 × 语法变体），每个组合过完整 布局→走线→渲染 验证，断言无非有限坐标/非正交斜段/边穿节点/标签压框/越界/沿框边借道；并建立 examples golden 快照字节回归。形态：**纯测试用例、旁路**，跑 npm test/CI，发布前全绿才准交付；**不碰 render/router 运行时业务代码**（scope.out，state.json:18-21）。

### 2.2 目标用户

| 用户角色 | 典型场景 | 关键痛点 |
|---------|---------|---------|
| LGDL 作者（引擎开发者，唯一决策者） | 改布局/走线参数或修缺陷后，验证"全部历史图没变丑" | 无快照 → 参数一动全图无感平移；回归只能靠人眼扫 examples/（lessons P1-3） |
| CI / npm test 门禁 | 发布前自动化回归 | 现 CI（.github/workflows/ci.yml，F-02 v0.6 已交付）只跑 npm test，无几何审计/快照断言 |
| spec/tasks/plan 下游 Agent | 拿到可执行的需求输入 | 需要"穷举空间全维度 + 缺口矩阵 + 快照面 + 检测方式"（discovery §3 已交付本 spec 的输入） |

### 2.3 与现有功能的关系

- **上游事实**：v0.6.0 已发布（1a365af）；9 包体系（d03dca4）；ci.yml 测试工作流已存在（F-02 交付）；引擎确定性已验证（双渲染字节一致，无 Date.now/Math.random）；render/layout/router 全部确定性序列化。
- **测试面现状**：引擎 4 包 src 测试 298 例 + web 系 = 全仓 437 例（2026-09-02 实测 `test(` 计数）；发布基线 435（state.json 注 v0.6.0）。**只增不删守恒**（ROADMAP F-17 验收）。
- **不在本 Feature 范围**：修复 `scripts/gen-examples.mjs`（生成链路已断，discovery §3.4-3）；重生成 examples/*.svg/.png（磁盘产物漂移 7/11）；修复引擎缺陷（R-005 新红裁决）；CLI 侧门禁接入（scope.out）。
- **下游**：@sddu-plan（依赖本 spec.md 完成技术规划）。

## 3. 目标与非目标
> 明确需求范围，防止范围蔓延

### 3.1 目标 (Goals)

| # | 目标描述 |
|---|---------|
| G-001 | **穷举矩阵落地**：按渲染分型等价类合并原则建立验证矩阵（A 档 11 事实源文档 + B 档 ~10 等价类合成文档），覆盖 9 图类型 × 全部 node kind × 全部 edge 分型，每个组合过完整 parse→layoutDocument→renderSvg 链路（Q-001~Q-008） |
| G-002 | **六项几何违规断言**：非有限坐标 / 非正交斜段 / 边穿节点 / 标签压框 / 越界（画布/泳道）/ 沿框边借道，以最终 SVG 产物解析为判定真值，判定语义与容差在 spec 钉死（Q-014） |
| G-003 | **examples golden 快照字节回归**：对象集 = examples.ts 单一事实源 11 例，基线以当前引擎重渲染为准，测试每次重渲染逐字节 + sha256 比对（F-17） |
| G-004 | **CI/门禁接入**：新增用例落入 `npm run test`（ci.yml 既有工作流自动收集），发布前全绿才准交付（F-15） |
| G-005 | **测试守恒**：全仓基线 435（实测 437）只增不删，现有断言零回退 |

### 3.2 非目标 (Non-Goals)

| # | 明确不做 |
|---|---------|
| NG-001 | 不碰 render/router/layout 运行时业务代码（零语义改动、零新功能、不动 DSL） |
| NG-002 | 不修 `scripts/gen-examples.mjs`、不重生成 examples/*.svg/.png（磁盘产物漂移 7/11 记录为已知缺口，由作者另立 Feature 决策） |
| NG-003 | 不将审计接入 lgdl-cli render 命令（门禁必须旁路，不混业务；scope.out） |
| NG-004 | 不修引擎缺陷：矩阵落地暴露的真实缺陷（R-005 场景）只记录上报，不越界修复 |
| NG-005 | 不删除/迁移 examples/ 磁盘孤儿文件（10 个 .lgdl 不进快照但文件不动，处置由作者决策） |
| NG-006 | 不做架构/替代方案选型（等价类合并与审计数据源的方案对比是 plan 职责；本 spec 只钉需求与判定语义） |

## 4. 用户故事
> 以用户视角描述功能需求

| # | 作为… | 我想要… | 以便… |
|---|-------|---------|-------|
| US-001 | LGDL 作者 | 每次改 layout/router/render 后跑 `npm test` 就能自动把全部历史图与组合图过一遍几何审计 | 参数一动导致全图平移/变丑/斜段/穿节点时，在发布前被机械拦截而非靠人眼 |
| US-002 | LGDL 作者 | examples 11 张示例图的渲染输出有字节级 golden 基线 | 任何引擎改动导致示例产物漂移（如 0489db9 后 7/11 漂移）立即红，不再无人察觉 |
| US-003 | 发布/维护者 | CI 在每次改动时自动跑门禁测试 | 发布前全绿才准交付有自动化兜底 |
| US-004 | 下游 Agent（plan/tasks） | 拿到穷举矩阵规模、快照对象集、判定口径已拍板的需求 | 直接做技术规划，不必再回头做需求决策 |

## 5. 功能需求 (FR)
> 每个需求必须有唯一标识符且可测试；按 4 组组织（验证矩阵 / 几何审计 / golden 快照 / CI 接入与守恒），每组含设计决策与 Q-xxx 覆盖映射。需求来源：discovery.md 基线，不臆造新范围。

---

### 设计决策 D-001：验证矩阵等价类合并方案（对应 discovery R-004）

**问题**：discovery R-004 警告——"9 图类型 × 9 node kind × 多 edge 分型 × 写法变体"全笛卡尔积用例数失控，需按渲染分型等价类合并。discovery 建议口径（D2 表）：mindmap 全 kind 圆角矩形、uml-class 全卡片、sequence 统一参与者、gantt 条+里程碑——kind 在这些 mode 下不改变形状。

**决策**：验证矩阵 = **A 档（11 事实源文档，类型穷举不可合并）+ B 档（~10 等价类合成文档，kind/edge/边界按渲染语义等价类补齐）**，矩阵文档总量 **≈ 21~22**。合并原则 E1~E6：

| 原则 | 内容 | 依据（代码证据） |
|------|------|-----------------|
| **E1 type 全穷举（不可合并）** | 9 图类型各 ≥1 全链路文档。layout 分派（layout/index.ts:120-155）与 render 分派（render/index.ts:339-360）都以 type 为分派键，各 type 的布局（TB/LR/径向/时间轴/泳道/时间条/双层/大图 grid）与渲染出口不同 → type 无等价类可合 | A 档 11 例已覆盖全部 9 type（architecture/microservices=arch、login-flow/ecommerce-flow=flowchart、uml-class/er/gantt/mindmap/sequence/state/datastream） |
| **E2 kind 形状敏感档按"文档内混排"覆盖** | 形状随 kind 变的 mode（default 系：flowchart/arch/state/datastream/er——shapeKindFor 不折叠，SHAPES[kind] ?? process）→ **1 张组合图内混排全部 8 个形状 kind**（start/end 药丸、process 圆角、decision 菱形、entity 圆柱、note 折角、state/milestone 回退矩形），一次跑即覆盖"该 mode 下每 kind 的形状绘制 + 15° 锚点 + 走线不穿各类形状"。**不做 9 kind × 9 type 笛卡尔积**——SHAPES 表（render/index.ts:56-126）与 shapeKindFor（:456-457）按 kind 分派、与 type 无关，形状呈现等价类 = "default 系 mode 全体" | D2 表 + render/index.ts:56-126/456-457；layout NODE_SIZE（layout/index.ts:41-48）state/milestone 回退 process 尺寸（:165） |
| **E3 形状折叠档验证"kind 不影响形状"语义** | mindmap（所有 kind 圆角矩形 + 分支配色 + 字号层级 20/15/12，:636-650）与 uml-class（所有非 group 节点渲染类卡片，:456-457/958-1016）→ 用混 kind 文档**断言折叠成立**（decision/note/entity 均不出现菱形/折角/圆柱元素），而非逐 kind 穷举 | shapeKindFor :456-457；D2 表 |
| **E4 专属呈现档按语义构建** | sequence 参与者统一矩形 + 消息/回执虚线、gantt 任务条(rx=6) vs 里程碑菱形（:1136-1148）、uml-class 卡片 members 行、er members 内联（:653-663）——kind 在这些 mode 只参与 NODE_SIZE 排版 → 由 examples + B 档专属文档覆盖，无需 kind 全排列 | render/index.ts:363-432/1028-1176；D2 表 |
| **E5 edge 分型按"渲染语义类"跨 type 覆盖** | 不做 type×edge 全积：节点边（全 type 走 routeEdge 正交避障，:849-872）由矩阵全文档自然覆盖；聚合边三态 g→g/g→n/n→g（routeRectilinear，:716-770）跨有 group 路径的 type 补全三态；基数专属 er/uml-class；扇出标签合并（:781-803）专项 1 图；sequence 消息/return、gantt 依赖三型（:1096-1113）专属文档 | D3 表 |
| **E6 语法写法变体不乘入渲染矩阵** | YAML 写法变体（注释/引号/行内 list/object/BOM/负整数等，D4）的语义正确性已由 parser.test.ts 52 例覆盖；渲染链路确定性保证"解析后文档等价 → 输出字节等价" → 变体无需对每个矩阵文档重跑。矩阵文档统一用现代合法 DSL 文本（含必要 attrs/行内对象/负日期等边界写法在 B 档体现） | D4 表；A-002 确定性实测 |

**kind 覆盖核对表（验收时逐格核对，证明"全部 node kind 至少一次真实绘制/语义断言"）**：

| kind | 覆盖文档 | 断言语义 |
|------|---------|---------|
| start / end（药丸） | A：login-flow、ecommerce-flow、architecture、state（end）；B1 全 kind 组合图 | 药丸 rx=w/2 形状真实绘制 + 审计 0 违例 |
| process | A 全部 + B1 | 圆角矩形 rx=6 |
| decision（菱形） | A：login-flow、ecommerce-flow；B1 | 菱形 polygon 四顶点真实绘制 + 边锚点贴菱形边界 |
| entity（圆柱） | A：er、architecture、datastream；B1 | 圆柱 path 圆弧段 + er members 行 |
| note（折角） | A：architecture、microservices；B1 | 折角 path 真实绘制 |
| state（回退 process 矩形） | A：state（13 例 state kind）；B1 | **断言回退**：元素为 process 形状（无 state 专用 shape，SHAPES 无键） |
| milestone | A：gantt（launch）；B1；B7 | gantt 菱形 marker（r=9）；非 gantt 下回退 process |
| group（容器/泳道） | A：architecture/microservices（单层）、login-flow（嵌套 2 层）、state、datastream、uml-class、ecommerce-flow、gantt；B3/B4a（锁定忽略语义） | group box/lane rect 绘制 + 聚合边 + 嵌套 box 递归（computeGroupBox :481-518） |
| 无 kind（回退 process） | A：mindmap（部分节点无 kind）；B1 | 默认 kind 语义 |

**矩阵最终规模**：A 档 11 + B 档 ~10（B1~B10，B11 大图 P2 可选）≈ **21~22 个全链路文档**；每文档 = 1 条全链路测试用例（几何审计 0 违例）；A 档同时承载 golden 快照。对比全笛卡尔积（9 type × 9 kind × 多 edge × 变体 ≈ 数百用例），合并后用例数收敛到 ~22，且按 E1~E6 证明覆盖等价。

---

### 设计决策 D-002：golden 快照对象集与漂移基线（对应 discovery §3.4、R-001/R-002）

**问题**：快照对象集三选一（examples.ts 11 源 vs examples/ 磁盘 21 .lgdl vs 21+）；磁盘 .svg 已漂移 7/11；gen-examples.mjs 生成链路已断。

**决策**：
1. **快照对象集 = examples.ts（`packages/lgdl-web/src/examples.ts`）的 11 个 EXAMPLES 条目**（文件头自证 "THE single source of truth"，:2-4），**磁盘 10 孤儿文件不进快照**（9 个规范评审样例 + group-node-demo 无人维护，锁死会冻结陈旧样例）。快照输入直接取 EXAMPLES[i].source 字符串 parse（不依赖磁盘 .lgdl/.svg 文件）→ 快照再生链路自洽，与断掉的 gen-examples.mjs 解耦。
2. **快照基线 = 首次以当前引擎（2026-09-02 dist）重渲染的字节入库**。磁盘 .svg 的 7/11 漂移**作废不作为基线**（R-001：从磁盘 .svg 直接入库会锁住漂移产物）；**不修磁盘 .svg/.png**（NG-002，另立 Feature）。
3. 快照资产与 examples/*.svg 物理分离：前者是 CI 回归基线（测试资产），后者是人工查看产物（本 Feature 不碰）。

---

### 设计决策 D-003：几何审计数据源与六项违例判定语义（对应 discovery §3.5、Q-014、R-003）

**问题**：仓库无任何现成几何审计函数（Q-014）；"标签压框/越界"依赖估宽启发式，容差口径不先钉死则断言脆弱（R-003）；discovery 建议"LayoutResult 不可靠，SVG 才是画出来的真相"（LayoutResult.edges 只是中心线初值，最终折线在 render 侧 routeEdge/routeRectilinear 生成，:746/874-876）。

**决策**：审计 helper 输入 `(doc, layout, svg)` → 违例清单，六类判定**以最终 SVG 元素解析为真值**（非有限坐标双源校验例外，见下表），语义与容差常量如下（常量由 plan 落为命名常量，validate 阶段实测校准，校准需作者批准）：

| 违例类型 | 判定范围（SVG 侧选择器） | 判定标准 | 容差/豁免 |
|---------|------------------------|---------|----------|
| **G1 非有限坐标** | 双源：① LayoutResult 全数值字段（nodes x/y/width/height、edges points、画布 width/height）；② SVG rect/circle/line/polygon/path d/text 全部数值属性 | 任一坐标/尺寸 parse 后非 `Number.isFinite`，或 path d 含非法 token → 违例 | 无容差（硬判定）；path 数值含 `NaN/Infinity` 即报 |
| **G2 非正交斜段** | **仅连边元素**：class `lgdl-edge`/`lgdl-aggregate-edge`/`lgdl-dep`/`lgdl-message` 的 `<path>`（M/L 段）与 `<line>` | 任一段 `min(\|dx\|, \|dy\|) > 0.51px` → 违例（即 |dx|>0.51 **且** |dy|>0.51，discovery 建议口径） | 端点锚定 15° 量化（router shapeEdgePoint :244-248）产生的微小偏移 ≤0.51px 内豁免；**节点形状本体 path 不在审计范围**（entity 圆柱 A 弧/note 折角/decision 菱形/arrowhead marker polygon 是形状非走线）；path 含 C/Q/A 等非 M/L 命令的连边 → fail-safe 报"无法判定段"违例（防漏报） |
| **G3 边穿节点** | 连边 path 的水平/垂直段 × 障碍框集合 | 任一段与任一障碍框**内部**相交（开区间）→ 违例 | 障碍框 = ① 全部非 group 节点 bbox（LayoutResult.nodes，形状取包围盒）② 组框从 **SVG class `lgdl-group`/`lgdl-lane` rect 提取**（避免复算 render 私有 computeGroupBox）。**豁免**：该边自身的 from/to 端点节点、以及拥有该边端点的组（edge 合法离开/进入自身所属组，render obstacle 同口径 :849-856）；段与框**边界重合/贴边不算穿**（半开区间）；零长段（routeDefault 退化）不判穿 |
| **G4 标签压框** | 全部 `<text>`（节点标签/关系 label/edge label/聚合 label/基数文本/组标题/gantt 条外文字/时间轴 label） | 文本估宽 bbox 与任一**非宿主**节点/组框相交 → 违例 | 估宽镜像 renderer（labelBoxAt :246-251：CJK ≈ 1.0×fs、Latin ≈ 0.62×fs，行高 fs+4，text-anchor 定对齐）；bbox 四周外扩 **2px** 后再判交（浮点安全）；交点贴边不算（面积 > 0）。**宿主豁免**：节点标签的宿主 = 自身节点框（标签居中于框内合法）；组标题宿主 = 自身组框；其余 label（edge/聚合/基数等）无宿主，不得压任何节点/组框。基数文本锚定端点外 22px（:920-921）按其真实坐标估宽判交（不应误报：22px 偏移 + 2px 扩边仍不触框） |
| **G5 越界（画布/泳道）** | 全部 SVG 元素（rect/circle/line/polygon/path d/text 估宽） | 画布：元素任一点超出 viewBox `0 0 W H` 外扩 **1px** → 违例（viewBox 为最终画布权威，各出口统一输出 :944/1175）；datastream 泳道：节点 bbox 必须完整落入其泳道列 x 区间（列边界从 SVG `lgdl-lane` rect 提取，列序 i → x∈[40+260i, 40+260(i+1)]） | 画布容忍 1px（数字舍入/贴边）；合成 `_default`/`_other` 泳道无 lane rect → 降级画布检查（EC-003）；gantt/sequence 无泳道概念 → 仅画布检查 |
| **G6 沿框边借道** | 连边（`lgdl-edge`/`lgdl-aggregate-edge`/`lgdl-dep`/`lgdl-message`）path（M/L 段）与 line 的**轴对齐段** × 障碍框集合 | 水平段：段 y 与框 top/bottom（`box.y`/`box.y+box.h`）距离 **< 0.5px**（共线）且段 x 范围与框 x 范围**重合长度 > 0.5px** → 违例；垂直段对称（段 x vs 框 left/right，y 向重合 > 0.5px）。detail 报「沿 `<id>` 框`上/下/左/右`边借道（重合 Npx）」 | 障碍框 = **全部节点（LayoutResult.nodes bbox）+ 全部容器（SVG 提取，含端点自身框）——无端点豁免**（作者裁决：容器也是 node，贴边走线一律禁止；engine 贴边走线属另 Feature 修复，本检查如实上报）；容差常量 `edgeRideTolPx=0.5`（<0.5px 视为点接触噪声）；**无需端点豁免的几何理由**：垂直进锚点（段垂直框边线、仅锚点一点相交）重合长度≈0 天然不触发，平行滑入/滑出（段与框边线共线）才触发——几何上天然区分，故豁免只会放走真实借道 |

---

### 组 1：验证矩阵（对应 discovery Q-001~Q-013 穷举面）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-001 | **全链路门禁测试基座**：矩阵每个文档统一走真实链路 `parseLgdl(source) → layoutDocument(doc) → renderSvg(doc, layout) → geometry-audit`，输出违例清单；测试断言 = 违例清单为空 +（A 档）快照字节一致。**禁止手造 LayoutResult fixture 冒充矩阵用例**（唯一例外：FR-006 退化路径单测） | 基座以 1 个最小可解析文档（含 2 节点 1 边）跑通 parse→layout→render→audit；audit 输出 0 违例；基座可被矩阵全部用例复用 | P0 |
| FR-002 | **A 档：examples 11 事实源文档全链路审计**（类型穷举 E1）：architecture/microservices/datastream/er/gantt/login-flow/ecommerce-flow/mindmap/sequence/state/uml-class 各 1 条全链路用例（输入 = EXAMPLES[i].source），断言几何审计 0 违例 + 快照一致（FR-007） | 11 条用例全部通过（当前引擎基线 A-004 已实测基础项 0 违例，落地后以完整六类审计为准）；任一条审计命中 → 走 EC-001 流程 | P0 |
| FR-003 | **B 档：等价类合成文档**（按 D-001 E2~E6 补齐 A 档未覆盖的写法组合），必做清单 B1~B10：B1 flowchart 全形状 kind 混排组合图（8 形状 kind + 双向边/回边 + 中英 label 混排，E2）；B2 uml-class 混 kind 文档（process/decision/note/无 kind + entity members，验证折叠 E3）；B3 mindmap 带 group（锁定 group 被忽略语义，E3/Q-013）；B4a sequence 带 group（锁定 group 非参与者/聚合边不渲染语义）；B4b gantt 带聚合边（锁定聚合边在 gantt 漏画语义）；B5 聚合边 g→n 补全（A 档已含 g→g 与 n→g，缺 g→n，E5/Q-005）；B6 扇出标签合并图（1 源 → ≥2 targets 同 label 只渲染一次 + 异 label 分支，E5/Q-006）；B7 gantt 依赖三型 + 负日期 attrs（gap≥20 / gap≈0 折叠 / 目标在左绕行，E5/Q-008/D4）；B8 er 混 kind + 基数全枚举（decision/note + entity members + 基数 1/0..1/0..\*/1..\* 双向，E2/E5/Q-007）；B9 datastream 混合态（有分组节点 + 未分组节点 → `_other` 合成泳道，Q-009）；B10 state 多入口/零入口（findInitialState 返回 null 不画 initial 点，Q-011）。B11（P2 可选）大图 grid 分支 >120 节点 flowchart（Q-001 边界） | 矩阵文档全部落地且通过审计 0 违例；kind 覆盖核对表（D-001）逐格核对成立；每文档为真实 DSL 文本且可被 parser 接受；B3/B4a/B4b/B9 属"语义锁定"文档（不把静默忽略/漏画判为六类违例，见 D-005/EC-006） | P0（B11 P2） |
| FR-004 | **矩阵组织与命名**：文档按 D-001 三档语义组织（type 主文档 / edge 专项 / 边界怪角），文件内注释头标注对应 Q-xxx、覆盖维度与设计意图，保证 plan/tasks/review 可核对覆盖缺口 | 每个 discovery Q-001~Q-014 在矩阵或专项单测中有明确落点（映射表见组尾）；矩阵文档具备可读性注释（评审可追溯） | P1 |

**Q-xxx 覆盖映射**：Q-001（布局全分支经全链路断言）→ FR-002/FR-003 全文档 + B11；Q-002（全链路零测试）→ FR-001/FR-002；Q-003（6 类图无 svg 测试）→ FR-002（mindmap/sequence/gantt/datastream/state/arch 全在 A 档）；Q-004（kind×mode 矩阵）→ FR-003 B1/B2/B8 + kind 覆盖核对表；Q-005（聚合边三态）→ FR-002（g→g/n→g）+ FR-003 B5（g→n）；Q-006（扇出合并）→ FR-003 B6；Q-007（基数锚定）→ FR-003 B8 + FR-002 er/uml-class（G4 审计真值化）；Q-008（sequence/gantt 专属几何）→ FR-002 + FR-003 B7（G2/G5 审计）；Q-009（泳道 _other 混合态）→ FR-003 B9；Q-010（兜底/退化路径）→ FR-006 专项单测；Q-011（state 初始伪态分支）→ FR-003 B10；Q-012（嵌套 group ≥2）→ FR-002 login-flow（2 层）+ B1（G3/G5 审计）；Q-013（kind×type 语义怪角）→ FR-003 B3/B4a/B4b（D-005）；Q-014（几何违例断言目标未定义）→ FR-005/FR-006（D-003）。

---

### 组 2：几何审计 helper 与六项断言（对应 discovery §3.5、Q-014）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-005 | **geometry-audit helper**：测试侧审计函数（放 render 包测试支持代码，非 src 业务导出），签名 `auditGeometry(doc: LgdlDocument, layout: LayoutResult, svg: string): Violation[]`，Violation = `{ type: G1~G6, element: 定位串, detail: string, docRef?: nodes[i]/edges[i] }`；六类判定语义与容差常量按 **D-003 表** 实现 | helper 存在且可被矩阵基座 import；D-003 表 6 类判定各自对应实现常量；helper 不依赖 render/router 内部未导出函数（可只读复用 router 导出的纯函数或独立实现，plan 定） | P0 |
| FR-006 | **审计 helper 自测（正反例）**：每类违例配 ≥1 合成违规样例（断言**必报**）与 ≥1 合成健康样例（断言**不报**），共 ≥12 例：G1（NaN 坐标）、G2（45° 斜段边）、G3（边穿第三方节点）、G4（edge label 压节点框）、G5（元素越 viewBox / 节点越泳道列）、G6（水平段沿第三方节点/容器顶边借道必报；垂直进锚点、空白区折线不报）各配正反例 | helper 测试全绿；正反例证明判定口径不哑火也不误报 | P0 |
| FR-007 | **退化/兜底路径专项单测**（Q-010 降级方案，D-005）：routeDefault 零长退化（render/index.ts:948-956）、A* 无解 → orthogonalize 回退（router/index.ts:219-220）、routeRectilinear fallback 可能穿越（:592-602）——真实 DSL 无法稳定构造"A* 无解"输入 → 以**合成 LayoutResult fixture 单测**直接驱动 renderSvg/router，断言输出无 NaN/斜段/越界且不抛异常；这是矩阵内唯一允许 fixture 的例外 | 专项单测落地（≥3 场景）；router 既有 8 例（router.test.ts:5-190）保持绿并作为退化覆盖基线；若 plan 评估某场景不可稳定构造 → 记录开放问题 #5，覆盖责任划给 router.test + 既有兜底代码路径 | P1 |

---

### 组 3：examples golden 快照（对应 discovery §3.4、F-17）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-008 | **golden 快照建档**：对象集 = examples.ts 11 EXAMPLES（D-002）；每例 = parse EXAMPLES[i].source → 当前引擎渲染字节 + sha256，入库为快照资产（测试资产目录，与 examples/*.svg 物理分离）；**基线取当前引擎重渲染**，不采用已漂移的磁盘 .svg | 快照资产含 11 组 `{id}.svg` + sha256 manifest；首建后本地渲染字节与快照逐字节一致（0 diff） | P0 |
| FR-009 | **快照字节回归断言**：矩阵 A 档用例每次重渲染后逐字节比对快照 + sha256 校验；不一致 → 测试红。**禁止测试静默更新基线**（更新须显式 CLI 标志 + 单独 commit + 作者确认） | 测试中引入快照比对；人为改动快照文件 → 测试红且无自动覆盖路径 | P0 |
| FR-010 | **快照可再生成**：从 examples.ts source 出发全自动重建 11 组快照（不依赖磁盘 .lgdl/.svg、不依赖 gen-examples.mjs） | 提供重建入口（脚本/命令，plan 定）；重建后字节与已入库基线一致（确定性 A-002 支撑） | P1 |

---

### 组 4：CI 接入与测试守恒（对应 ROADMAP F-15 门禁形态、R-007）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-011 | **门禁落入 npm test/CI**：新增矩阵/审计/快照用例必须被 render 包既有 test 收集面收录（`npm run test --workspace @lgdl/lgdl-render` 全绿）；ci.yml 既有工作流（build 全量 → `npm run test --workspaces`）自动覆盖，**不新增 workflow**。若多测试文件结构超出既有收集面（test 脚本 `tsc src/*.test.ts --outDir dist-test && node --test dist-test/*.test.js`），允许最小测试侧调整（glob 或文件组织），**不得改动包 exports/构建产物** | `npm run test --workspace @lgdl/lgdl-render` 收集并全绿（含新增用例数）；全仓 `npm run test --workspaces` 全绿；ci.yml 无 diff（除非 test 收集面必需的最小调整，纳入 NFR-001 审计） | P0 |
| FR-012 | **测试守恒**：全仓测试数只增不删——落地后全仓 `test(` 计数 ≥ 437（发布基线 435，2026-09-02 实测 437），现有测试文件零删除、现有断言零弱化 | 落地后计数核对 ≥ 437 且列出新增用例数；git diff 不含既有 *.test.ts 的删除行或断言弱化（review 阶段核查） | P0 |

## 6. 非功能需求 (NFR)
> 性能、安全、可用性等跨切面需求

| ID | 类别 | 需求描述 | 验收标准 |
|----|------|---------|---------|
| NFR-001 | 旁路 | **零运行时业务代码改动**：lgdl-render/lgdl-layout/lgdl-router/lgdl-core 的 src 业务文件零 diff（审计/helper 只以测试支持代码存在，不进包 exports） | `git diff --stat` 仅新增测试文件/测试资产/（如需）render package.json test 脚本；lgdl-render 的 `dist/index.js` 产物与改动前一致（hash 比对） |
| NFR-002 | 兼容 | **零语义改动、零新功能、零 DSL 变更**：门禁只读消费 parse→layout→render 输出，不改变任何现有输入输出 | 首次快照建档即证明当前引擎字节被完整记录；无任何 render/layout/router 行为分支被测试代码触碰 |
| NFR-003 | 可用性 | **门禁反馈可定位**：审计违例清单含元素定位（class/坐标/d 段）与 docRef（nodes[i]/edges[i]），测试失败信息可直接指向肇事文档与元素 | 人为在测试文档注入 1 处违例 → 失败信息含违例类型 + 元素 + 文档位置（validate 实测） |
| NFR-004 | 性能 | **门禁时长预算**：render 包测试总时长（~22 矩阵文档全链路 + 快照 sha + helper 自测）可接受，不拖慢 CI | render 包 test 时长 ≤ 60s（当前基线量级实测对比；B11 大图若纳入另行评估） |
| NFR-005 | 确定性 | **快照跨环境稳定**：同一 Node 主版本内本地与 CI 字节一致（A-002 已实测双渲染字节一致） | ci.yml 指定 Node 20（既有）；validate 阶段实测 CI 环境快照一致；若 Node 版本差异致字节差 → EC-007 流程 |
| NFR-006 | 可维护 | **矩阵文档可追溯**：每文档注释头标注覆盖维度、Q-xxx 映射、设计意图，新 kind/edge 分型扩展时能定位等价类归属 | 评审阶段抽查 ≥3 文档注释完整；矩阵 README/注释说明 E1~E6 等价类归属 |

## 7. 边界情况 (EC)
> 异常场景和边界条件的处理方式

| ID | 场景 | 处理方式 |
|----|------|---------|
| EC-001 | **矩阵落地暴露真实缺陷**（R-005：datastream `_other`、kind×type 怪角等当前无样例角落可能现真红） | 先核对文档是否合法现代语法 + 语义合理；若合法且为引擎真实缺陷 → **不修引擎**（NG-004），该文档标记 xfail/移出全绿矩阵并记入已知缺口清单 + 上报作者裁决；**不通过放宽审计口径掩盖**（放宽须作者批准并记录到 D-003 容差变更） |
| EC-002 | **快照漂移**（引擎后续合法改动导致字节变化） | 测试红 → 作者确认改动有意 → 显式标志重建基线 + 独立 commit；禁止静默覆盖（FR-009） |
| EC-003 | **datastream `_other`/`_default` 合成泳道无底框**（render 泳道列表 = deriveGroups 不含合成列，Q-009） | 该列节点**泳道越界检查降级为画布检查**（无 lane rect 可取）；无底框是视觉缺口非六类违例 → B9 几何断言 = 已知 G6 集（G6 新增后 `svc→db` 沿 svc 右边缘末端微借道 4px 记入 KNOWN_B，EC-001 同款）+ 快照锁定现状 + 记录开放问题 #7 |
| EC-004 | **mindmap/sequence/gantt 内 kind×type 怪角**（Q-013：mindmap 带 group 被忽略、sequence 带 group 非参与者、gantt 聚合边漏画） | 语义锁定文档（B3/B4a/B4b）：断言 = 渲染不炸 + 几何断言 = 已知 G6 集（B4b 任务依赖 t2→t3 沿 t3 左边借道 16px 记入 KNOWN_B；B3/B4a 保持 0）+ 快照锁定当前语义；"静默忽略/漏画"不定义为六类违例，记入已知缺口（D-005）由作者裁决是否另立 Feature 标注不支持 |
| EC-005 | **零长/退化路径**（routeDefault 返回 (0,0)-(0,0)，render/index.ts:948-956） | 零长段不判 G3 穿边、亦不判 G6 借道；矩阵无法经 DSL 触发 → FR-007 合成 fixture 单测兜底；真实渲染中出现零长段时由 G1/G5 兜底（坐标非有限/越界仍会报） |
| EC-006 | **快照跨平台/跨 Node 版本字节差**（A-002 残余风险） | 以 ci.yml 指定 Node 20 为基准固化（NFR-005）；validate 实测若出现环境差异 → 降级策略（如对浮点序列化做 canonical 归一）由作者批准后实施，禁止直接放宽比对 |
| EC-007 | **测试文件收集面不足**（矩阵多文件结构超出 `node --test dist-test/*.test.js` 顶层 glob） | 允许最小调整 render test 脚本收集模式，或矩阵用例聚合成单文件（plan 定）；以 FR-011 验收（npm run test 收集并全绿）为准，不阻塞交付 |
| EC-008 | **审计正反例口径校准**（估宽启发式在极端字体/字符下误报） | D-003 容差常量为初值；validate 阶段用 11 A 档文档 + B 档全量实测校准；误报 → 调整容差需作者批准并记录（走 EC-001 同款审批，不静默放宽） |

## 8. 开放问题
> 待决策事项和需要进一步调研的内容

| # | 问题 | 状态 |
|---|------|:--:|
| 1 | **gen-examples.mjs 修复 + examples/*.svg/.png 重生成是否另立 Feature**（本 Feature 只建测试侧 golden，磁盘产物漂移 7/11 不修，NG-002） | 待作者决策 |
| 2 | **examples/ 磁盘 10 孤儿文件处置**（保留 / 迁移 / 删除；本 Feature 不动，NG-005） | 待作者决策 |
| 3 | **快照资产落位与重建入口细节**（render 包 test-assets 目录结构、manifest 格式、重建 CLI 标志命名） | 待 plan 决策 |
| 4 | **矩阵多测试文件结构与 render test 收集面调整方案**（FR-011/EC-007） | 待 plan 决策 |
| 5 | **Q-010 退化路径覆盖方案可行性**（A* 无解/orthogonalize 是否可稳定构造合成输入，FR-007） | 待 plan 探索/validate 验证 |
| 6 | **目标版本**（随下一发布窗口？与 F-06/F-11 同批收口？ROADMAP:180-181 排布约束） | 待作者决策 |
| 7 | **datastream `_other` 合成泳道无底框视觉缺口**（Q-009 探测结果若证实 → 是否另立引擎修复 Feature） | 待作者决策（本 Feature 不修） |
| 8 | **B11 大图 grid（>120 节点）是否纳入 P0 矩阵**（默认 P2 可选，plan 按矩阵时长预算裁量） | 待 plan 裁量 |

## 修订记录
> 记录本文档的版本变更历史

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.1 | G6「沿框边借道」检查项新增（作者指令，Fast 增量、无 phase 流转）：D-003 表 +1 行（判定/容差 edgeRideTolPx=0.5/无端点豁免理由）；Violation type 扩 G1~G6；FR-006 自测 ≥12（G6 正反例 ×4）；矩阵 A/B 档按实测记录已知 G6 集（A 档 7 文档 + B 档 5 文档，EC-001 同款——engine 贴边走线另 Feature 修复）；test 守恒 499→503 | 2026-09-03 | SDDU Fast Agent |
| v1.0 | 初始创建 — 摸底后轻量模式（需求本质作者已对齐，零访谈）：4 组 FR（验证矩阵 / 几何审计 / golden 快照 / CI 与守恒）含设计决策 D-001~D-006；验证矩阵 = A 档 11 + B 档 ~10 ≈ 21~22 文档（等价类原则 E1~E6 + kind 覆盖核对表）；快照对象集 = examples.ts 11 事实源 + 当前引擎重渲染为基线（漂移 7/11 作废）；五项几何违例判定语义与容差常量钉死（D-003 表）；Q-001~Q-014 全覆盖映射；12 FR + 6 NFR + 8 EC + 8 开放问题；总体验收 = 437 基线只增不删 + 全链路门禁全绿 | 2026-09-02 | SDDU Spec Agent |
