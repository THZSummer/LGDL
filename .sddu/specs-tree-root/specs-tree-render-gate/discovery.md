# 问题挖掘报告：specs-tree-render-gate（补全 LGDL 门禁测试用例）

> **文档定位**: SDDU 问题挖掘报告 — 记录用户问题、痛点和场景，作为 spec 阶段的输入（本 Feature 为**摸底型 discovery**：作者已闭环对齐需求本质——补全门禁测试用例，穷举 LGDL 所有写法并建立 golden 快照字节回归；无访谈，聚焦**穷举空间摸底 + 现有测试覆盖缺口盘点 + 快照面 + 几何检测方式**，全部结论带代码证据）  
> **前置依赖**: 无（工作流起点；前置事实：v0.6.0 已发布 1a365af、9 包体系 d03dca4、收口五件套 0489db9 改过 render/layout 导致 examples/*.svg 漂移——见 §3.4 实测）  
> **创建人**: SDDU Discovery Agent  
> **创建时间**: 2026-09-02  
> **版本**: v1.0  
> **更新人**: SDDU Discovery Agent  
> **更新时间**: 2026-09-02  
> **更新说明**: 初始创建 — 摸底型（源码只读盘点）：穷举空间全维度清单 / 现有测试覆盖盘点 / 覆盖缺口矩阵 / golden 快照面 / 几何违规检测方式建议 / 风险

---

## 1. 问题定义
> 概括核心问题及其业务影响，回答"为什么需要关注"

| 核心问题 | 业务影响 | 不解决的成本 |
|---------|---------|------------|
| **渲染几何正确性零护栏**：引擎"布局→走线→渲染"全链路没有任何测试把真实产物当整图断言——render 测试只断言"输出包含某结构"（`svg.test.ts` 7 例全部 `includes(...)` 结构断言 + 手造 Layout fixture，`lgdl-render/src/svg.test.ts:13-224`）；layout 包 **0 测试**（无任何 `*.test.ts`）；无一条断言"布局/走线结果无几何违例" | 布局/走线/渲染是 LGDL 核心卖点（"语义不变则输出不变"，`docs/design.md:29`）；`NODE_SEP=80/RANK_SEP=96`（`packages/lgdl-layout/src/layered.ts:209-210`）或 barycenter/A* 参数一动，全部历史图可能无感平移/变丑 | 回归只能靠人眼扫 `examples/` + AI 视觉评审（docs/reviews-2026-08-24/）；改算法无机械兜底（ROADMAP F-15/F-17 依据 lessons-for-lgdl.md v1.1 §3 P1-1/P1-3） |
| **穷举覆盖缺口大**：LGDL 写法空间 = 9 图类型 × 9 node kind × 多类 edge × 多组语法写法变体（§3.1 全维度清单），现有引擎侧测试只覆盖其中一小片（§3.2/§3.3 缺口矩阵），大量组合从未过完整 layoutDocument→renderSvg 链路 | 部分组合在当前引擎下几何健康（本摸底实测 11 张现行示例基础项 0 违例，§3.4），但**未断言=可回归**；兜底分支（routeDefault 退化路径 render/index.ts:948-956、orthogonalize 兜底 router/index.ts:219-220）零专项审计 | 未来引擎改动引入"某类型×某 kind 组合坏掉"的概率随覆盖缺口增大；发布前无门禁可拦 |
| **examples golden 快照缺失**：examples/*.svg 已与当前引擎**漂移 7/11**（§3.4 实测，引擎 0489db9 修复后未重新生成） | README/评审文档引用的示例产物可能不代表当前引擎输出；无字节级回归基线 | "同输入同输出"承诺无字节级证明；再次改动只能靠人眼 |

**需求本质（作者已对齐，state.json:9）**：补全门禁测试用例——穷举 LGDL 所有写法（9 图类型 × 全部 node kind × 全部 edge 类型 × 语法变体），每个组合过完整 布局→走线→渲染 验证，断言无非有限坐标/非正交斜段/边穿节点/标签压框/越界；并建立 examples golden 快照字节回归。形态：**纯测试用例、旁路**，跑 npm test/CI，发布前全绿才准交付；**不碰 render/router 运行时业务代码**（scope.out，state.json:18-21）。

---

## 2. 用户画像
> 描述受影响用户角色及其场景，回答"谁遇到了什么问题"

| 用户角色 | 典型场景 | 关键痛点（证据原文） | 当前应对方式 |
|---------|---------|-------------------|------------|
| LGDL 作者（引擎开发者，唯一决策者） | 改布局/走线参数或修缺陷后，验证"全部历史图没变丑" | lessons-for-lgdl.md v1.1：「render 测试断言的是『输出包含某结构』…没有一条断言整颗 SVG 字节不变…参数一动全图平移无感——没有快照，回归只能靠人眼扫 examples/」（:144-146，P1-3） | AI 视觉评审闭环（docs/reviews-2026-08-24/，开发期人工评审）；人眼对比 |
| CI / npm test 门禁 | 发布前自动化回归 | 「产物侧几何审计…render 出口纯几何审计，失败即 exit 非零拒绝」（ROADMAP.md:166 F-15）；「CI 断言重渲染逐字节一致」（ROADMAP.md:168 F-17） | 现 CI 只跑 `npm run test --workspaces`（.github/workflows/ci.yml），无几何审计/快照步骤 |
| spec/tasks/plan 下游 Agent | 拿到可执行的需求输入 | 需要"穷举空间全维度 + 缺口矩阵 + 快照面 + 检测方式"作为 spec 范围与 plan 任务的依据（本报告 §3/§6） | 无（本 Feature 立项前无此盘点） |

> 说明：本 Feature 方案由作者已对齐（纯测试、旁路），无访谈原话；用户原话以 lessons/ROADMAP/state.json 引文替代。

---

## 3. 问题清单（摸底盘点）
> 交付本 Feature 的摸底结果：§3.1 穷举空间全维度清单 → §3.2 现有测试覆盖盘点 → §3.3 覆盖缺口矩阵（含分级 Q-xxx）→ §3.4 golden 快照面 → §3.5 几何违规检测方式建议。每项附 `文件:行号` 证据（源码只读实测，2026-09-02）。

### 3.1 穷举空间全维度清单（D1~D7）
> 从源码实测的 LGDL 全部"写法"维度。**口径注意**：`lgdl-spec.md`（v0.5.0）已过时——仍描述顶层 `groups:`（docs/lgdl-spec.md:15,127-149，当前 parser allowlist 已物理拒绝，parser.ts:28/66-75）、elkjs/dagre 引擎切换（:23-35，实际已自研 Sugiyama/A*，layout/layered.ts 头注释）；README 速览也残留顶层 `groups:`（README.md 语法速览末段）。**穷举以代码为准**。

#### D1 图类型（9，单一事实源 DIAGRAM_TYPES）
`flowchart | mindmap | uml-class | arch | datastream | sequence | er | state | gantt`（types.ts:24-34；联合 types.ts:12-21）。布局分派证据 layout/index.ts:134-155；渲染分派证据 render/index.ts:339-360。

#### D2 node kind（9）× 各图类型下的真实呈现
- kind 枚举与语义：`start|end|process|decision|entity|note|state|milestone|group`（types.ts:51-73；`group` 是容器节点，携带 `contains`，types.ts:6-9/143-146）。
- **parser 不限制 kind×type 组合**（除 members 见 D5）→ 所有 kind 在任一 type 下语法合法；但渲染/布局按 type 分支处理（差异即穷举必须覆盖的"写法×行为"面）：

| type | group 的处理 | node kind 的呈现（代码证据） |
|---|---|---|
| flowchart / arch / state / uml-class / er（有 group 时） | 容器框/泳道（layoutGrouped 双层布局，layout/index.ts:219-345；render 派生 group box render/index.ts:473-519） | flowchart/arch/state/er：SHAPES 按 kind（start/end 药丸 rx=w/2 :58-73、decision 菱形 :84-104、entity 圆柱 :108-116、note 折角 :118-125、process 圆角矩形；state/milestone 无专用 shape → 回退 process，render/index.ts:636-637、FILL/STROKE 无 state/milestone 键回退 process :148-164） |
| uml-class | 同上（rankdir=LR，layout/index.ts:136-137） | **所有**非 group 节点渲染为类卡片（shapeKindFor → 'process'，render/index.ts:456-457、renderClassNode :958-1016） |
| er | 无 group 专用路径（layoutGrouped 列表含 er :134） | 按 kind 形状（同 default）+ entity 成员行拼接显示（render/index.ts:653-663） |
| mindmap | **group 节点被布局忽略**（layoutMindmap 过滤 plainNodes，layout/index.ts:408；render computeMindmapInfo 同样排除 :183） | 所有 kind 渲染为圆角矩形 + 分支配色 + 字号层级（root 20/level1 15/其余 12，render/index.ts:636-650）；kind 形状被忽略（:456-457） |
| sequence | group 节点非参与者（layout/index.ts:550；render 无 group 概念） | 参与者统一矩形头部（layout 固定 160×44，layout/index.ts:558-564；render/index.ts:405-413）；kind 只影响 NODE_SIZE 参与排版 |
| gantt | group 节点=分区泳道带（render/index.ts:1057-1086；layoutGantt 任务排除 group :700） | 任务条（rect rx=6，opacity .85）/ milestone 菱形（render/index.ts:1136-1148）；无 attrs 数字时回退 day0/1d（layout/index.ts:701-702、cli render.ts:45-51 仅警告） |
| datastream | group=泳道列（layoutSwimlane layout/index.ts:597-675；render 泳道 :474-478/553-567） | 按 kind 形状 + 颜色（同 default 分支） |

- 布局默认尺寸：NODE_SIZE 仅含 start/end/process/decision/entity/note（layout/index.ts:41-48），state/milestone 回退 process 尺寸（layout/index.ts:165）；无 member 时宽度按 label 文本宽度自适应（CJK≈字号、Latin≈0.62×，:76-82/169）。
- 大图分支：>120 非 group 节点走 O(n) grid（flowchart/state/er，layout/index.ts:85/124-129/762-798）——**穷举可选边界**。

#### D3 edge 类型（几何与语义分型）
| 分型 | 判定/语义 | 走线与渲染（代码证据） |
|---|---|---|
| 节点边 node→node | 两端均非 group id（layout 过滤 nodeEdges，layout/index.ts:92-98） | routeEdge A* 正交避障（render/index.ts:849-872；router/index.ts:119-221），灰色实线 + arrowhead，端点贴真实形状边界 15° 量化锚点（router shapeEdgePoint :233-317，24 锚点 15° :244-248） |
| 聚合边（组作为整体） | 任一端是 group id（parser.ts:300-313 允许 group id；layout 忽略不参与布局 layout/index.ts:92-98） | 支持 group→group / group→node / node→group 三种混合（docs/lgdl-spec.md:120 但以代码为准：render/index.ts:716-770），紫色虚线，routeRectilinear（render/index.ts:737-745；router routeRectilinear :563-603），label 带白底 rect（render/index.ts:747-764） |
| 自环 | **parse/validate 拒绝**（from===to，parser.ts:280-286；mutations 同拒 :259-261）→ 不可渲染，不属穷举几何面 | — |
| 重复边 | (from,to,label,attrs.relation) 四元重复被拒（parser.ts:291-299）；**同 from/to 不同 label 合法（ER 多关系）**（parser.test 有断言） | 渲染按同 from 同 label 扇出做**标签合并**（fan-out trunk 只画一次 label，render/index.ts:781-803） |
| 双向 A→B 与 B→A | 合法（方向相反不算重复） | sequence 渲染为 return 消息虚线（render/index.ts:424-425）；state 反向边（如 paying→pending）走回边（layout 分层时 DFS 反转 back-edge，layered.ts:168-185） |
| 带 multiplicity | er/uml-class 才渲染基数文本（render/index.ts:895-896） | 关系 label 居中 + `cardinalityFrom/To` 在端点外 22px 各标一个（render/index.ts:897-930）；合法值枚举 `1/*/0..1/0..*/1..*`（parser.ts:322-331），非法值 rejected；`attrs.cardinality`/label 混基数旧写法 rejected（parser.ts:332-350） |
| 无 label 边 | label 可省略（types.ts:157） | 只画线，不产生 label 文本 |
| sequence 消息 / gantt 依赖 | 分属独立渲染器 | sequence 消息为水平线段（含 return 虚线，render/index.ts:417-429）；gantt 依赖按 gap 分三种 L 型连接（gap≥20 / ≥-4 折叠 / 目标在左绕行，render/index.ts:1096-1113） |
| 兜底/退化路径 | layout 无 points 时 routeDefault 返回 **(0,0)-(0,0) 零长退化路径**（render/index.ts:948-956）；A* 无解时 routeEdge 回退 orthogonalize（router/index.ts:219-220/373-416）；routeRectilinear 无净空候选时返回 fallback（可能穿越，router/index.ts:592-602） | 与 F-11（R-D3/R-D5）合并执行的专项测试载体（ROADMAP.md:166/180） |

#### D4 语法写法变体（YAML 层，parser.ts 实测）
- 顶层结构：title/type/nodes/edges/meta 四字段 allowlist，**未知字段 error**（parser.ts:26-28/66-75）；`groups:` 顶层已废弃（拒绝）。
- 标量/值写法：注释（整行 `#` + 行内 ` #` 剥离，parser.ts:469/670-687）；`#` 引号内保留（parser.test）；双引号字符串转义 `\n \t \" \\`（parser.ts:736-744）；单引号（:745-747）；布尔 true/false/null/~（:713-715）；整数/浮点（:716-717）；**id/from/to/cardinality*/label 等保持字符串**（数字 id、布尔 label 不强转，:689-708）；负整数（gantt 负日期，parser.test 断言）。
- 集合写法：nodes/edges/members/contains 为 `- ` 列表（parseListItems :530-617）；contains 支持**行内列表** `[a, b]`（:729-735）；attrs 支持**嵌套块**与**行内对象** `{ start: 5, duration: 3 }`（:593-604/718-728）。
- 缩进与位置错误全部 loud error：意外缩进/错位 `-` 列表项（parser.ts:475-479/488-498/572-584）。
- BOM 剥离（parser.ts:447）。
- 顶层 `meta: {...}`（types.ts:178-180/193；parser 保留任意键）。

#### D5 属性/字段维度（校验与组合）
- node 字段：id（唯一、`^[A-Za-z0-9_-]+$`、:89-102）/ label（默认=id，types.ts:133）/ kind / members / contains / attrs。
- **members**：仅 `kind:entity` 且 type∈{uml-class, er} 合法（parser.ts:137-205）；member 结构 `{kind: attribute|method, name 必填, visibility: public|private|protected|package, type, params(仅 method)}`（types.ts:89-113）；er 禁 visibility（parser.ts:183-189）；entity label 内 `\n` 拼成员旧写法 rejected（parser.ts:210-221）。
- **contains**：仅 `kind:'group'` 节点合法（parser.ts:224-237）；成员可含 node id 与嵌套 group id；含未知引用/环/双归属全部 error（parser.ts:353-431）；node/group 共享 id 命名空间（parser.ts:242-263）。
- **attrs**：任意键逃生舱（types.ts:128；parser 原样保留）；gantt 语义键 `attrs.start`（number，可负）+ `attrs.duration`（非负 number）专项校验（parser.ts:112-132）；edge `attrs.relation` 参与重复键（parser.ts:291）。
- edge 字段：from/to/label/cardinalityFrom/cardinalityTo/attrs（types.ts:151-167；parser allowlist :27）；from/to 必须引用现存 node 或 group id（parser.ts:300-313）。

#### D6 渲染出口分型（renderSvg，render/index.ts:339-360）
`renderSequence`（:363-432）/ `renderGantt`（:1028-1176）/ `renderGeneral` 六 mode：uml-class/datastream/er/mindmap/state/default（:445-945）。每类出口的 SVG 元素族不同（rect/polygon/path/line/circle/text × class 语义 lgdl-node/lgdl-class/lgdl-group/lgdl-lane/lgdl-edge/lgdl-aggregate-edge/lgdl-dep/lgdl-message/lgdl-initial/lgdl-anchors/lgdl-edge-anchors/…），几何审计需按出口分别建模（§3.5）。

#### D7 布局出口分型（layoutDocument，layout/index.ts:120-155）
flowchart/arch（TB 分层）、uml-class/er（LR 分层）、state（TB）、mindmap（径向）、sequence（时间轴）、datastream（泳道）、gantt（时间条）、有 group 的 flowchart/arch/state/uml-class/er（双层 group 布局）、大图 grid。所有布局**确定性**（layered.ts:20-21「Deterministic: identical input → identical output」；barycenter 稳定 tie-break=文档序，layered.ts:113-117/127-130）。

### 3.2 现有测试覆盖盘点（引擎侧，src 实测 2026-09-02）

| 包 | 测试文件（test 数） | 覆盖了什么 | 没覆盖什么 |
|---|---|---|---|
| lgdl-core | mutations.test.ts（217）+ parser.test.ts（52） | DSL 语法/校验/增量操作语义（parser 52 例覆盖 D4/D5 校验面，见 parser.test.ts 标题清单）；无任何几何断言 | 不碰布局/渲染 |
| lgdl-layout | **0 测试文件、0 用例**（src 无 *.test.ts；package.json test=`node --test dist/**/*.test.js` 空匹配退出 0） | — | 布局引擎**全部裸奔**（F-06 范围） |
| lgdl-router | router.test.ts（8） | routeEdge 正交性/锚点/避障的**纯几何单测**（router.test.ts:5-190，多数为真实 bug 镜像场景） | 无与 layout+render 联动的全链路；无 bounds 越界/退化边界用例 |
| lgdl-render | svg.test.ts（7）+ ascii.test.ts（14），**render 包合计 21 例** | svg 7 例全是**手造 LgdlDocument+LayoutResult fixture 的 includes() 结构断言**（组绘制序、聚合边、uml-card、er 基数、data-lgdl-loc），**从未调用 layoutDocument**（svg.test.ts:13-224） | 无全链路（parse→layout→render）；无 mindmap/sequence/gantt/datastream/state/arch 的 svg 测试；**无任何几何断言** |
| lgdl-cli | 0 测试 | — | CLI 无测试（F-06 范围） |
| web 系（lgdl-web/web-cli/…） | 见 notes | 编辑器/AI/命令层 | 非本 Feature 关注面 |

> 事实口径：ROADMAP F-15 行所述"render 21 例仅断言包含结构"（ROADMAP.md:253）= svg 7 + ascii 14 全包合计，非 svg.test.ts 单文件 21。引擎 4 包 src 测试合计 = 217+52+8+21 = **298 例**；加 web 系与 web-ai 后全仓基线 ≈ **437 例**（state.json 注 v0.6.0 基线 435，本摸底按当前 src 实测约 437，含 ai/*.test.ts 16 例）。

### 3.3 覆盖缺口矩阵与分级（Q-001…）
> 分级：核心=影响面大/直接违背后门禁目标；次要=特定组合漏网；潜在=信息不足或边界未验证。

| ID | 级别 | 缺口描述（穷举空间 × 现有覆盖） | 证据 |
|----|------|------|------|
| Q-001 | 核心 | **布局引擎全裸奔**：layoutDocument 的 9 类布局分支（D7）无任何单测断言坐标/尺寸/确定性 | layout src 无 *.test.ts；layout/index.ts:120-155 全部分支 |
| Q-002 | 核心 | **完整链路零测试**：没有一例 parse→layout→render→SVG 产物整图断言；svg.test.ts 全部手造 fixture 跳过 layout 与真实 router 障碍集 | svg.test.ts:13-224（fixture 手造 LayoutResult） |
| Q-003 | 核心 | **6 类图无 svg 渲染测试**：mindmap/sequence/gantt/datastream/state/arch 的 renderGeneral/独立渲染器分支没有任何 svg 用例（含其专属元素：lifeline/activation/message、泳道、gantt 条/里程碑/依赖/轴、initial 伪状态、mindmap 配色层级） | svg.test.ts 标题仅 flowchart/uml-class/er 三型（见 §3.2） |
| Q-004 | 核心 | **node kind 呈现矩阵未穷举**：decision 菱形/entity 圆柱/note 折角/state 回退矩形/milestone 只在 gantt 有效/group 容器，多数 kind×mode 组合无渲染用例（如 flowchart 内 entity+note+state+milestone 混合图、uml-class 内 process kind、er 内 decision） | render/index.ts:456-457/636-637 SHAPES 回退逻辑无对应测试 |
| Q-005 | 核心 | **聚合边三类组合未穷举**：g→g / g→n / n→g（仅 1 例 g→g 测试 svg.test.ts:46-82）；混合聚合边（node→group，如 examples/architecture 用户→核心服务）零断言；聚合 label 白底避让、edge-anchors 端点 | render/index.ts:716-770；svg.test.ts:46-82 |
| Q-006 | 核心 | **重复边/扇出标签合并分支无测试**（同一 from 同 label 多 target 只渲染一次 label） | render/index.ts:781-803（Bug3 合并逻辑零用例） |
| Q-007 | 核心 | **ER/uml-class 基数渲染仅测"存在"**，未断言基数文本 22px 锚定坐标与关系 label 与基数互不重叠/压框 | render/index.ts:887-930；svg.test.ts:115-164（只查 includes） |
| Q-008 | 核心 | **sequence 消息与 gantt 依赖的专属几何无渲染断言**（return 虚线方向、gap≈0 L 折叠、gantt 时间轴刻线/条外文字/泳道带） | render/index.ts:363-432（sequence）、1028-1176（gantt） |
| Q-009 | 次要 | **datastream 泳道混合态未覆盖**：无 group 时合成 `_default` 泳道、有 group 但有未分组节点时合成尾随 `_other` 泳道（layout 计宽，render 泳道列表=deriveGroups 不含 _other → 该列无底框，潜在几何洞） | layout/index.ts:602-616 vs render/index.ts:474-478/553-567；11 张现行示例全部节点已分组、无混合态样本 |
| Q-010 | 次要 | **兜底/退化路径零专项审计**：routeDefault 零长退化、orthogonalize 回退、routeRectilinear fallback 可能穿越、A* 无解回退——F-11 同批测试载体 | render/index.ts:948-956；router/index.ts:219-220/373-416/563-603 |
| Q-011 | 次要 | **state 初始伪状态 / 唯一入口判定分支无用例**（单入口 vs 0/多入口 → findInitialState 返回 null 不画点） | render/index.ts:220-228/604-616 |
| Q-012 | 次要 | **多层嵌套 group**（嵌套深度 ≥2，如 examples/architecture 是单层；login-flow 2 层）的 group box 递归计算、绘制序、出画布边界无测试（a7728f4 曾修 group 出画布） | render/index.ts:481-518/569-601；layout/index.ts:319-324 |
| Q-013 | 潜在 | **kind×type 语法全组合合法但语义怪异的角落**（如 mindmap 带 group、sequence 带 group、gantt 聚合边——render 各自静默忽略或漏画），spec 需定"合法=必须穷举 or 标注不支持" | parser 不限制 kind×type（§3.1 D2）；renderGantt/renderSequence 无聚合边绘制路径 |
| Q-014 | 潜在 | **几何违例断言目标未定义**：非有限坐标/斜段/边穿节点/标签压框/越界目前仓库中不存在任何现成审计函数或判定口径（F-15 需从零建，建议见 §3.5）；现有 examples 基础项 0 违例（§3.4 实测）只能证明"当前样例健康"，不能证明"组合穷举后仍健康" | 全仓 grep 无几何审计函数（本次摸底只读确认） |

### 3.4 golden 快照面（快照对象 / 字节稳定性 / 生成链路 / 漂移实测）
1. **快照对象集现状**：examples/ 目录实有 **21 个 .lgdl**（21 组 .svg/.png 三件套），但**单一事实源** `packages/lgdl-web/src/examples.ts` 仅 **11 个** EXAMPLES 条目（id 见 :16-68：architecture/microservices/datastream/er/gantt/login-flow/ecommerce-flow/mindmap/sequence/state/uml-class，9 类图全覆盖、arch/flowchart 各 2 张）。**另 10 个为孤儿文件**（不在单一事实源）：README:37-39 引用的 9 张规范示例（arch-ecommerce/datastream-log/er-orders/flowchart-auth/gantt-saas-roadmap/mindmap-product/sequence-order/state-order/uml-class-order，2026-08-24 AI 视觉评审对象，docs/reviews-2026-08-24/ai-vision-review.md）＋group-node-demo（无任何引用）。**golden 快照"examples 全量"的边界需 spec 拍板**（11 源 vs 21 磁盘 vs 21+；孤儿快照会锁死无人维护的旧样例）。
2. **字节稳定性**：引擎源码无 `Date.now/Math.random/new Date/toISOString`（layout/router/render 三包 grep 零命中；唯一 Date 在 lgdl-core mermaid 转换器，非渲染链路）；布局坐标经 Math.round、渲染数字经 toString/toFixed(1) 确定性序列化；实测同源两次渲染**逐字节一致**（2026-09-02 实测 ecommerce-flow 双渲染 byte-identical）。→ **SVG 字节快照可行**（sha256 + 字节文件，ROADMAP F-17 口径）。
3. **生成链路**：`scripts/gen-examples.mjs` 声称从 examples.ts 单一事实源生成 .lgdl/.svg/.png，但**已失效**——imports `../packages/core|layout|render/dist`（9 包重构前旧路径，现为 lgdl-core/lgdl-layout/lgdl-render）且读取 `packages/web/src/examples.ts`（现为 packages/lgdl-web/src/examples.ts）；只写不清理（孤儿文件成因）。F-17 需先修或重建生成器，否则 golden 无法再生。
4. **漂移实测（关键证据）**：2026-09-02 用当前引擎（dist 重建后）渲染 11 张现行 .lgdl，与磁盘 .svg 比对——**7/11 DRIFT**（login-flow/uml-class/state/datastream/architecture/microservices/ecommerce-flow），仅 mindmap/gantt/er/sequence MATCH。成因：磁盘 .svg 最后生成于 dd7f926（2026-08-30，router 走线修复），其后 d03dca4（V2 重构）+ **0489db9（收口五件套 render/layout 修复）** 改动引擎未重新生成。→ 直接实证"无 golden 快照 → examples 产物漂移无人察觉"，正是 F-17 要钉死的回归。
5. **现有快照机制**：无。svg.test 只有结构断言；lgdl-web/src/snap.test.ts 是 UI 滚动吸附（computeSnap），与 SVG 快照无关。

### 3.5 几何违规检测方式建议（给 spec/plan 的输入）
> 原则：门禁是**旁路测试**，不改 render/router 运行时（scope.out），因此审计在**测试侧**对最终产物做几何判定。数据源二选一/混合：

| 违例类型 | 推荐判定数据源与做法 | 理由（代码证据） |
|---|---|---|
| 非有限坐标 | 双源校验：① LayoutResult 全字段 isFinite（旁路可直接拿到 layout，layout/index.ts:33-38）；② SVG 所有数值属性解析后 isFinite（rect/text/path/line/circle） | 布局整数化 + 渲染浮点，两处都可能引入 NaN/Infinity（routeEdge 兜底 shapeEdgePoint 有除零风险分支 router/index.ts:244-316），**双源都断言**最稳 |
| 非正交斜段 | **解析最终 SVG `<path d>` 每段 dx/dy**：任一段 |dx|>0.51 且 |dy|>0.51 即违例 | 最终折线在 render 侧 routeEdge/routeRectilinear 生成（render/index.ts:746/874-876），LayoutResult.edges 只是中心线初值（4 点折线 layout/index.ts:368-382）——**LayoutResult 不可靠，SVG 才是画出来的真相** |
| 边穿节点 | SVG 路径段 × 节点框（节点框取 LayoutResult.nodes 或 SVG `<g class="lgdl-node">` 内 rect）做线段-矩形相交检测；排除端点自身贴边（复用 router segmentCrosses/pathCrosses 纯函数思路 router/index.ts:419-437，测试可 import 只读复用） | 全链路障碍集（含 group box）在 render 内部计算（render/index.ts:708-714/849-856），测试复算=复制实现；直接对最终 path 判相交即"成品级"审计（archify P1-1 同思路：router 软评分漏网由独立视角拦截，lessons :114-125） |
| 标签压框 | 解析 `<text x y>`（含 cardinality 文本/关系 label/edge label/聚合 label/gantt 条外文字）+ 节点/组框，按渲染器同款估宽（CJK≈12px、Latin≈12×0.62，render/index.ts:246-251）构造 label bbox 判重叠 | 标签定位算法（placeLabelBox :282-336）已有"永不丢弃 label、无净空就落 ideal（可能压框）"的兜底（:326-336）——**这正是审计要抓的边界**；估宽是启发式，spec 需定容差口径 |
| 越界（画布/泳道/时间轴） | 全部 SVG 元素坐标（含 gantt 条外时间文本 :1135、基数 22px 外置 :920-921、group box pad 后扩展 render/index.ts:508-514、_other 泳道列）与 viewBox 画布比较；datastream 泳道专用：节点/边不得越过其泳道列边界 | 越界风险点散布在 render 各出口（§3.1 D6），以 viewBox 为最终画布权威（render 各出口统一输出 `<svg width height viewBox>`，如 :944） |

> **架构建议（供 plan 决策，非本阶段结论）**：测试侧建独立审计 helper（如 `packages/lgdl-render/src/geometry-audit.test-helper` 或独立测试文件内函数），输入 `(svg: string, layout: LayoutResult, doc: LgdlDocument)` 输出违例清单；穷举矩阵驱动其为真值来源。F-15 的"失败 exit 非零"形态在**测试断言层**实现（node:test assert），而非 CLI 拦截（scope.out 已排除 CLI 接入）。

---

## 4. 竞品参考
> 记录竞品对类似问题的处理方式（仅事实，不做方案评价——替代方案对比是 plan 职责）

| 竞品/参照 | 是否处理过类似问题 | 处理方式（事实） | 与我们场景的差异 |
|---|---|---|---|
| archify（作者同款工具，lessons 研究源） | 是——几何门禁 + 确定性哈希双机制 | ①9 项 artifact checker（single_svg/finite/orthogonal_arrows/label-route-clearance/crossings/corridors/border-runs/route-rhythm/legend-clearance），其中"边穿节点"是连无质量档都生效的正确性硬门禁（lessons-for-lgdl.md:117-118，layout-secrets.md:133）；②确定性字节级实证 6/6 sha256 跨会话一致 + deliver 规格快照 + sha 收据 + compare base/head canonical 化（lessons :140-143） | archify 门禁拦截"作者摆的坐标"、失败作者改 IR 重渲（作者在环）；LGDL 确定性下用户改不了输出，门禁只能落位**引擎开发阶段**回归资产（lessons §2.4 :90-105；ROADMAP.md:179 门禁落位修正）；archify 门禁/快照全在其 CLI 内建，LGDL 本 Feature 形态是**纯测试旁路** |
| archify 教训（反例） | 同工具各类型"各一套脾气"（--repo-root 只对 architecture 生效） | 类型存在但行为不一致、文档无警告（usage-report.md:153） | 提示 LGDL 穷举矩阵需显式覆盖"每 type 是否真的走其声称的布局/渲染路径"（对应 F-18 类型可用性矩阵） |

---

## 5. 假设与风险

### 5.1 关键假设
| # | 假设内容 | 验证方式 |
|---|---------|---------|
| A-001 | "9 图类型 × 全部 node kind × 全部 edge 类型"的穷举以**代码语义**为真值（parser 不限制 kind×type → 全笛卡尔积语法合法，但呈现分型需按 D2 表分级穷举） | spec 阶段按 §3.1 D1/D2/D3 矩阵逐格确认取舍 |
| A-002 | SVG 字节快照可跨平台稳定（Node 确定性序列化；无字体测量/无时间戳/无随机数） | 已实测双渲染字节一致（§3.4）；CI 跨平台稳定性待 validate 阶段验证 |
| A-003 | examples 快照基线应以 **11 张单一事实源** 为准（10 孤儿文件不锁快照，或明确迁移决策） | 作者/spec 拍板快照对象集（§3.4-1） |
| A-004 | 当前引擎对 11 张现行示例基础几何项健康（0 违例）可作基线前置，但不代表穷举矩阵全绿 | 摸底扫描（§3.4-4/§3.1 末尾）仅 5 类基础项；矩阵落地后以实际断言为准 |

### 5.2 主要风险
| # | 风险描述 | 影响程度 |
|---|---------|---------|
| R-001 | **文档/示例与代码语义漂移**：lgdl-spec.md v0.5.0 与 README 残留顶层 `groups:`/elkjs 描述（§3.1 口径注）；示例 .svg 已漂移 7/11。golden 快照基线若从磁盘 .svg 直接入库会锁住漂移产物 | 高 |
| R-002 | **gen-examples.mjs 生成链路已断**（旧包路径 + 旧 examples.ts 路径），快照无法再生的上游障碍未修则 F-17 不可落地 | 高 |
| R-003 | **审计口径需从零定义**（无现成几何审计函数）；"标签压框/越界"依赖估宽启发式，容差口径若不先在 spec 钉死，断言会脆弱（误报/漏报） | 中 |
| R-004 | 穷举矩阵体量：9 型×9 kind×多 edge 分型×写法变体，全笛卡尔积用例数可能过大；需 spec 按"渲染分型等价类"合并（D2/D3 分级），否则任务量失控 | 中 |
| R-005 | datastream `_other`/`_default` 合成泳道等"当前无样例"的角落可能暴露真实缺陷（门禁新红），发布前需作者裁决是修引擎还是标注不支持（scope：本 Feature 不修引擎 → 需降级为已知缺口记录） | 中 |
| R-006 | 旁路测试与 web 系/ASCII 渲染的关系未定义（ascii 14 例是否纳入门禁范围；data-lgdl-loc 定位断言是否顺带补 F-18） | 低 |
| R-007 | 全仓测试基线 435+（实测 src 约 437）"只增不删"约束（ROADMAP F-17 验收）需在任务排布时守恒验证 | 低 |

---

## 6. 下一步建议
> 给出后续工作的优先级建议（供 spec 阶段输入；排布约束：F-15/F-17 ↔ F-06/F-11 同批收口，ROADMAP.md:180-181）

| 优先级 | 事项 | 说明 |
|--------|------|------|
| 高 | 用 §3.1 D1~D7 全维度清单建立**穷举矩阵规格**（类型×kind 呈现分型×edge 分型×语法变体的等价类合并），替代"全笛卡尔积" | 直接决定 spec 的 FR 粒度与 tasks 体量（R-004） |
| 高 | 钉死 **examples 快照对象集 + 生成链路修复**（11 源 vs 21 磁盘；修 gen-examples.mjs 或重建生成器 + CI 断言） | F-17 前置；顺带消 R-001/R-002 |
| 高 | 按 §3.5 定审计 helper 接口与**五类违例判定口径**（含标签估宽容差、viewBox 越界容忍、端点贴边豁免） | F-15 前置；spec 需给容差常量 |
| 中 | 覆盖缺口按 Q-001~Q-014 映射为 spec 需求项，核心级（Q-001~Q-008）优先 | Q-009~Q-014（次要/潜在）可在 spec 标注或降级为记录 |
| 中 | 决策 datastream `_other`/kind×type 语义怪角（Q-009/Q-013）是"补用例"还是"文档标注不支持" | 涉及是否超出"纯测试"范围（scope.out），需作者裁决 |

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建 — 摸底型盘点：穷举空间全维度清单（D1~D7）/ 现有测试覆盖盘点 / 缺口矩阵 Q-001~Q-014 / golden 快照面（含 7/11 漂移实测与生成链路断点）/ 几何违规检测方式建议 / 风险 7 项 | 2026-09-02 | SDDU Discovery Agent |
