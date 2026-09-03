# Feature Specification：specs-tree-engine-defect-fixes（引擎缺陷修复 — 门禁暴露项收编回 clean）

> **文档定位**: SDDU 需求规范 — 定义三类引擎缺陷（render 文本/标签、layout LR 布局、G6 贴边走线）的修复要求、非功能需求与边界情况，作为 plan 阶段的输入
> **前置依赖**: discovery.md（缺陷定位 Q-001~Q-008 / 29 项 KNOWN 清空映射 / 风险 R-001~R-007，全部源码证据 2026-09-02）+ state.json（需求本质作者指令已闭环：修复引擎让门禁回归 0 违例）+ specs-tree-render-gate spec（G1~G6 判定语义 D-003 / ADR-003 快照更新门）
> **创建人**: SDDU Spec Agent
> **创建时间**: 2026-09-02
> **版本**: v1.0
> **更新人**: SDDU Spec Agent
> **更新时间**: 2026-09-02
> **更新说明**: 初始创建 — 摸底后轻量模式（需求本质作者指令已闭环，无访谈）：三类缺陷修复要求分三组 FR + KNOWN 收编组，含设计决策 D-001~D-005、非功能（门禁归零 / 快照显式重建 / 测试守恒 / 不引入新违例）、边界与验收标准。需求映射 discovery Q-001~Q-008 → FR-001~FR-012。范围与门槛对齐 state.json scope.in/out（G1~G6 判定规则不动、快照禁静默更新）。

## 1. 元数据
> Feature 基本信息

| 字段 | 值 |
|------|-----|
| Feature ID | 承接 specs-tree-render-gate（b69bbbf，F-15+F-17 / ROADMAP v1.4.0）已知缺口收编：EC-001 四项 + G6 已知集 + B2-LR（作者指令 2026-09-02） |
| 名称 | specs-tree-engine-defect-fixes（引擎缺陷修复 — 门禁暴露的渲染/布局/走线缺陷） |
| 优先级 | P0（门禁回归 clean 是 render-gate 交付的收口承诺；作者指令明确修复） |
| 目标版本 | 下一发布窗口（未定，见开放问题 #1） |

## 2. 上下文
> 回顾问题背景和目标用户（摸底后轻量模式：作者指令已闭环，依据 discovery.md 基线归纳）

### 2.1 要解决的问题

门禁 feature（specs-tree-render-gate，b69bbbf）以「精确已知集断言」记录了引擎 **29 项几何违例**（matrix-a KNOWN_A 22 项 + matrix-b KNOWN_B 7 项，2026-09-03 实测 503 测试全绿）。discovery 源码只读 + 门禁复跑 + 路由/审计实测复现证实：**这些违例不是门禁误报，而是引擎真实缺陷**——三类：

| 缺陷类 | 问题（discovery 实证） | 业务影响 | 不解决的成本 |
|-------|----------------------|---------|------------|
| **① EC-001 四项**（render 文本/标签位置） | er/uml-class 基数标签落实体框内（Q-001/Q-002，G4 ×2：er edges[0] '1'@(110,56) 压 user 框、uml-class edges[1] '1'@(694,296) 压 payment 框——根因 = collapseGridPath 允许 L 捷径竖穿自身框 + pathHitsOwnBody 浮点锚点短路 + 基数沿折线局部方向外置）；state 边 label 贴右缘越界 4px（Q-003，G5 ×1）；gantt 里程碑窄条时间文本越界 ~5.4px（Q-004，G5 ×1） | 关系图/状态机/甘特图渲染产物标签压框、文字出画布，门禁只能"记录已知"无法"断言干净" | 门禁失去回归价值；渲染产物带病交付 |
| **② B2-LR 布局缺陷**（layout，潜在未门禁） | layered.ts LR 方向秩轴步距与画布宽按节点**高度**估算（Q-005）：LR 4 张 160×48 无成员 uml 卡链 a→b→c→d 实测相邻 rank 重叠 16px×48、画布 560 宽右溢 72px（G5 三元素命中） | er/uml-class 等 LR 文档在"宽>高的短卡片"形态互相压叠、出画布 | LR 常见类图/ER 短卡片场景不可用；缺陷无 KNOWN 守护（B2 已绕开取单 rank 纵排） |
| **③ G6 贴边走线**（router/render 三机制） | M1 routeRectilinear/routeEdge 大段借道 40~120px（Q-006，arch edges[10] 贴 core 顶边 83px / uml-class edges[1] 贴 infra 底边 98px / B5 贴 out 底边 120px）；M2 末端锚点微借道 1~16px（Q-007，网格 cell7 + 15° 浮点锚点列差 + collapse 自身框平行容差 ≤20px，13 处）；M3 renderGantt 依赖边 L 落点骑目标条左缘 16px（Q-008，手写路径不经 router，7 处） | 连边贴框边滑行视觉"粘在框上"，与作者裁决「容器也是 node，不允许贴边走」冲突 | G6 检查项长期带已知集运行，新增文档无法获得干净断言 |

**需求本质（作者指令已闭环，state.json:9）**：修复引擎让门禁从「已知集断言」回归「0 违例」——matrix-a/matrix-b 的 29 项 KNOWN 全清空、违例归零，门禁断言更新回 clean；golden 快照走显式重建 + diff 审阅（禁静默）；测试守恒不降；修复不引入新违例。

### 2.2 目标用户

| 用户角色 | 典型场景 | 关键痛点 |
|---------|---------|---------|
| 引擎渲染/布局/路由消费者 | er/uml-class 基数标注图、state 长状态机、gantt 里程碑图、LR 类图 | "基数 '1' 落到实体框里"；"文本出画布"；"连线贴在框边上滑行" |
| 门禁维护方（作者/下游 Agent） | 每次渲染改动后跑 matrix-a/b + snapshot | 29 项 KNOWN 令门禁长期"记录在案"而非"断言干净"；新增文档无法获得干净回归 |
| plan/build/validate 下游 Agent | 拿到可执行、可验收的修复要求 | 需要精确到机制层的修复方向 + 验收口径（0.5px 对齐、垂直进面合法、KNOWN 收编流程） |

### 2.3 与现有功能的关系

- **上游事实**：门禁 specs-tree-render-gate 已交付（G1~G6 判定语义 render-gate spec D-003，容差 `edgeRideTolPx=0.5`；KNOWN_A/B 精确集断言一一配对；snapshot 11 svg + manifest sha256，更新门 `LGDL_UPDATE_SNAPSHOTS=1` 显式重建 ADR-003）。
- **相关代码面**（discovery 全部附文件:行号实证）：`packages/lgdl-router/src/index.ts`（collapseGridPath/pathHitsOwnBody/shapeEdgePoint/routeEdge/routeRectilinear/routeAStar）、`packages/lgdl-render/src/index.ts`（基数绘制 896-930 / placeLabelBox 282-336 / 聚合与普通边障碍集 737-744/847-855 / renderGantt 1089-1117/1131-1135）、`packages/lgdl-layout/src/layered.ts`（秩轴/画布 200-259）、`packages/lgdl-layout/src/index.ts`（layoutGrouped/layoutHierarchical 共用 layeredRun 219-385）。
- **测试面**：matrix-a.test.ts（KNOWN_A 22 项 + 头注释 :9-23）、matrix-b.test.ts（KNOWN_B 7 项 + 头注释 :23-25）、snapshot.test.ts（11 例字节 + sha，LGDL_UPDATE_SNAPSHOTS 更新门）、geometry-audit.test.ts（helper 正反例）、degraded-paths.test.ts（fallback 语义：不抛 + 有限 + 正交）。
- **不在本 Feature 范围**：改门禁判定规则/容差（G1~G6 不动）；examples/*.svg 磁盘产物重生成；datastream `_other` 合成泳道无底框等其他已知缺口（render-gate 遗留，另立 Feature）。
- **下游**：@sddu-plan（依赖本 spec.md 完成技术规划）。

## 3. 目标与非目标
> 明确需求范围，防止范围蔓延

### 3.1 目标 (Goals)

| # | 目标描述 |
|---|---------|
| G-001 | **三类缺陷修复落地**：① EC-001 四项（er/uml-class 基数落实体框外、state 边 label 不越界、gantt 里程碑窄条文本不越界）；② B2-LR（layered.ts LR 秩轴距/画布宽按卡片宽估算，宽>高卡片不重叠不溢出）；③ G6 贴边三机制（M1 大段借道 / M2 末端微借道 / M3 renderGantt 依赖边骑左缘全部消除） |
| G-002 | **门禁回归 0 违例**：matrix-a/b 的 29 项 KNOWN（KNOWN_A 22 + KNOWN_B 7）全清空、违例归零，断言收编回 clean（已知集断言 → 0 违例断言） |
| G-003 | **golden 快照显式重建 + diff 审阅**：引擎修复必然改变 A 档多文档 SVG → 走 `LGDL_UPDATE_SNAPSHOTS=1` 显式重建 + git diff 审阅，禁止静默更新 |
| G-004 | **LR 缺陷补回归守护**：B2-LR 现无 KNOWN（潜伏项），修复后新增 LR 多 rank 宽卡片回归档，防复发 |
| G-005 | **测试守恒不降 + 不引入新违例**：全仓 `test(` 计数只增不删（≥503），除被清空的 KNOWN 外任何文档不得新增 G1~G6 违例 |

### 3.2 非目标 (Non-Goals)

| # | 明确不做 |
|---|---------|
| NG-001 | 不改门禁判定规则与容差：G1~G6 六类违例语义、`edgeRideTolPx=0.5`、AUDIT_TOL 常量、画布 1px 容忍等**全部不动**（引擎适配门禁而非门禁适配引擎，A-001/scope.out） |
| NG-002 | 不引入外部布线器/不换架构：不引入 ELK/klay/dagre 等第三方正交布局布线（discovery §4 竞品仅留档，非本 Feature 决策）；不重写 routeAStar/orthogonalize 骨架 |
| NG-003 | 不静默更新快照、不修 examples/*.svg 磁盘产物（磁盘漂移由作者另立 Feature 决策）；快照变更仅经显式重建 + 独立 commit |
| NG-004 | 不做三类缺陷之外的引擎修复（datastream `_other` 无底框、routeDefault 零长退化等 render-gate 遗留缺口不纳入） |
| NG-005 | 不新增 DSL/API/命令/新功能；文本语义不变（如 gantt `${start}d +${dur}d` 格式保持） |
| NG-006 | 不做详细技术设计/实现选型对比（spec 只钉修复方向与验收口径；具体机制实现归 plan 评估，如 M1 贴边硬拒 vs 障碍膨胀的实现细节） |

## 4. 用户故事
> 以用户视角描述功能需求

| # | 作为… | 我想要… | 以便… |
|---|-------|---------|-------|
| US-001 | 引擎渲染/布局消费者 | er/uml-class 基数标注始终落在实体框**外**、不压框 | 交付的 SVG 无基数压框视觉缺陷 |
| US-002 | 引擎渲染/布局消费者 | state 边 label、gantt 里程碑时间文本永不越出画布 | 长状态机/甘特图产物完整、不裁边 |
| US-003 | 引擎渲染/布局消费者 | LR 布局下宽>高的短类卡片不互相压叠、不撑破画布 | uml-class/er 常见形态可直接使用 LR |
| US-004 | 引擎渲染/布局消费者 | 连边不沿节点/容器框边滑行，垂直进锚点即可 | 走线干净、视觉不"粘框" |
| US-005 | 门禁维护方（作者） | 跑一次 matrix-a/b + snapshot 就得到"0 违例/clean"而非已知集配对 | 门禁恢复回归价值，新文档获得干净断言 |
| US-006 | 门禁维护方（作者） | golden 快照只在显式重建下更新，diff 可审 | 引擎修复的坐标/布局变化可被逐张审阅，防"悄悄全图变丑" |

## 5. 功能需求 (FR)
> 每个需求必须有唯一标识符且可测试；按 4 组组织（① render 文本/标签 / ② layout LR / ③ G6 贴边三机制 / ④ KNOWN 收编与回归），每组含设计决策 D-xxx 与 Q-xxx 覆盖映射。需求来源：discovery.md 基线 + 作者指令闭环，不臆造新范围。

---

### 设计决策 D-001：基数定位修复方向 = router 主修（A）+ renderer 面法线外置兜底（B）（对应 Q-001/Q-002）

**问题**：er/uml-class 基数 G4 是三层成因叠加（collapseGridPath 允许竖穿自身框的 L 捷径、pathHitsOwnBody 浮点锚点短路漏判、基数 22px 沿折线端点局部方向外置遇滑入/穿体时指向体内），非单一处；且"竖穿自身节点"走线本身无门禁项覆盖（G3 豁免端点，R-007）。

**决策**：
1. **A 主修（router 侧，清根因）**：`collapseGridPath.segClear` 增加"自身框内部穿越"拒绝（垂直/水平段横穿 own box 即拒，不只查平行贴墙）；平行贴墙容差 ≤20px 收敛对齐 G6 判定口径（>0.5px 不允许，见 D-004）；`pathHitsOwnBody.segInside` 修复浮点锚点短路（锚点 y=40.00000000000005 级 5e-14 差被含入框内侧）；路径末尾 detick——保证入/出端点相邻段与锚点所在面严格垂直。ER 案例修复后从 user 下/右面垂直出体，基数随局部方向自然外置。
2. **B 辅修（renderer 侧，兜底防复发）**：基数偏移改沿**锚点所在面的外法线**推进（anchor 在上边 → 向外向上 22px），不再依赖折线端点局部方向——使基数定位与路由质量解耦，即使未来路由再出滑入/穿体，基数也不会落回框内。
3. A/B 组合是**强需求**（非二选一）：A 消除穿体走线视觉缺陷本身（B 单独可清 G4 但穿体仍在，R-007 不接受"门禁归零但视觉缺陷残留"）；B 提供长期防复发兜底。
4. 修复的**验收证据**需含专项断言：G3 豁免端点 → 门禁 0 违例**不足以证明**穿体消除 → matrix-a 增补对 er edges[0] / uml-class edges[1] 折线的**测试侧专项断言**（非新增 G 规则）：任一路由段不得与 from/to 端点实体框内部相交（锚点除外）。

**风险承接**：collapse 语义收紧可能提高 A* 无解率（R-002）→ 全量矩阵回归确认 orthogonalize 兜底不增；锚点浮点（R-006）需 router 侧先稳定化（数值 snap，见 EC-005）。

---

### 设计决策 D-002：render 文本越界修复方向 = placeLabelBox 画布边界约束 + renderGantt 近右缘窄条回退（对应 Q-003/Q-004）

**问题**：state 边 label 越界因 `placeLabelBox`（render/index.ts:282-336）无画布边界概念（isFree/labelBoxAt 只避节点障碍与已放置标签，longestSegmentMid 倾向选长段）；gantt 窄条外置文本越界因窄条外置策略（条宽<64 时 text 于条右 6px 起排，render/index.ts:1131-1135）未考虑画布右缘。

**决策**：
1. **Q-003（state label）**：`placeLabelBox` 增加画布宽高参数（render 侧有 layout.width/height），`isFree` 与候选/回退逻辑补"估宽 bbox 必须完整落在画布内（含边距）"约束；越界候选剔除后回退到水平段/夹取合法候选。**口径一致约束**：placeLabelBox 同时服务普通边 label（:932）与聚合边 label（:758），两调用点行为一致（同一画布约束）。
2. **Q-004（gantt 窄条文本）**：以 renderer 侧回退为主（discovery 建议 ii）——renderGantt 检测近右缘窄条（`node.x + node.width + 6 + 文本估宽 > layout.width`）时回退为条内左对齐 / 条左侧 / 里程碑上方等策略；**可选辅以 layout 侧右缘余量预留**（layout/index.ts:718 画布宽为"窄条外置文本"预留，需镜像 renderer 估宽口径 fs=10），由 plan 评估取舍。**硬约束**：时间文本语义 `${start}d +${dur}d` 不变、milestone dur=0（条宽 20，mermaid 导入常态）同机制覆盖。

**风险承接**：文本改动影响 golden（R-003）→ 显式重建 + diff 审阅（组 4 FR-011）。

---

### 设计决策 D-003：B2-LR 修复方向 = 秩轴推进量按 rankdir 取维度 + 画布按节点实际右缘兜底 + 新增 B12 回归档（对应 Q-005）

**问题**：Sugiyama 坐标阶段把「秩轴推进量」错误绑定到**节点高度**，未按 rankdir 选对应维度（layered.ts:200-221 `rankMaxH`/`rowY` 双方向共用；LR 坐标交换 :244-245 后秩轴 x 步距 = 高度驱动）；LR 画布宽 :253-256 按末秩高度估算、缺 TB 分支 :258-259 的 maxNodeRight 兜底。

**决策**：
1. **秩轴尺寸显式按 rankdir 取维度**：LR → 每秩 `rankMaxW`（该秩 max 节点宽度）+ RANK_SEP 做 x 步进；TB → 维持 `rankMaxH`。`rowY`/`rankMaxH` 语义重命名（秩轴 vs 交叉轴）由 plan 落位，不改 TB 现有行为。
2. **LR 画布宽 = max over nodes `(x + width)` + GRAPH_MARGIN**（镜像 TB 的 maxNodeRight 兜底），保证宽卡片链右缘不溢出。
3. **回归守护（补 B12 档，spec 决策）**：新增 B 档合成文档 **B12（LR 多 rank 宽>高短卡片链）**——多 rank、有向边链、卡片宽 160 > 高 48~66（无成员或 0~1 行成员 uml 卡），断言：**① 相邻 rank 卡片 bbox 互不重叠（显式两两不相交断言，非仅依赖 audit——重叠本身非 G1~G6 违例）② 全部节点/画布不溢出 ③ audit 0 违例**。B2 现档维持"单 rank 纵排"折叠验证形态不动，其 intent 注释更新指向 B12（偏差已由 B12 覆盖）。B12 与修复同批提交（修复前为红，EC-010）。
4. layeredRun 被 layoutGrouped（layout/index.ts:219-345，两层 LR）与 layoutHierarchical（:349-385）共用 → 一并受益，回归面覆盖这两条入口。

**风险承接**：LR 坐标系统性漂移 → er/uml-class A 档 golden svg 大面积变化（R-004）→ 显式重建 + diff 审阅。

---

### 设计决策 D-004：G6 贴边三机制修复方向 = 与 audit 判定口径对齐的端到端 anti-ride（对应 Q-006/Q-007/Q-008）

**问题**：门禁 G6 判定（geometry-audit.ts:960-1007）：轴对齐段与任一节点/容器框边线共线（<0.5px）且重合 >0.5px 即违例、**无端点豁免**；垂直进锚点（仅交一点）天然合法。三机制成因不同：M1 = 障碍集排除端点 + 判交仅严格内部 → 沿自身端点框边滑行是零成本通道；M2 = 网格量化（7px）与浮点 15° 锚点列差 + collapse 自身框平行容差 ≤20px（:776-782，与 G6 0.5px 口径语义冲突）；M3 = renderGantt 手写 L 路径落点取目标左缘列（render/index.ts:1108-1109）。

**决策**（修复机制与 audit 口径必须精确对齐，R-005）：
1. **M1 大段借道**：routeRectilinear 与 routeEdge（含聚合边入口 render/index.ts:737-744 与普通边 :847-855 的端点/owning 组排除面）引入**贴边净空约束**——路径任一段与任一节点/容器框边线共线（>audit 容差）即非合法通道（贴边硬拒 / 候选净空过滤为主方向，与 G6 判定同构、改动收敛）；若密集障碍下候选全拒触发 R-001，plan 可采用**障碍膨胀 + 锚点外走廊**（复用 routeAStar 模型 :637-693）变体。**两种机制共享同一验收**：G6 0 违例 + 垂直进锚点保留合法 + fallback 不得贴边 + degraded-paths 场景 3 语义保持（不抛/有限/正交）。
2. **M2 末端微借道**：`collapseGridPath` 自身框平行贴墙容差收敛：从 ≤20px 对齐 G6 口径（>0.5px 即不允许，A-005 作者已裁决为缺陷非特性）；对最终输出加 **detick pass**——末段改用锚点真实坐标做"最后一跳"垂直落点（消除 1~6px 网格列差 tick），使入/出段垂直于面（垂直段与框边线重合长度≈0，天然不命中 G6）；routeRectilinear 通道量化侧同款处理。锚点数值先在 router 侧稳定化（R-006，浮点 snap）。
3. **M3 renderGantt 依赖边**：gap≈0 分支（render/index.ts:1108-1109）改为三段垂直进面——先水平到 `b.x - clear`（clear≈8~12）→ 垂直落到 `b.y` → 水平垂直进目标左面锚点（末段垂直于面、不贴边）；或竖直落列取 `b.x - clear`。**约束**：保持正交、不穿中间条、不改变"目标在左"（:1110-1112）与 gap≥20（:1105-1107）分支（B7 三型断言只验正交与 x≥轴起点，路径形态可微调）。
4. M1/M2 与 D-001（基数）共享 router 内部修复点（collapse/垂直出体/detick）——**同批实施、分 task 跟踪**（discovery §3.4 表：M1/M2 清 18 项、基数清 2 项 G4，共用 collapse/detick 改动）。

**风险承接**：R-001（候选全拒 → fallback 穿越，以 degraded-paths 场景 3 + 矩阵 0 违例双兜底）、R-002（collapse 收紧 → 无解率升，全量矩阵回归 + B12 观察）、R-005（口径对齐，见 EC-006 容差同源化）。

---

### 设计决策 D-005：KNOWN 收编与快照重建流程 = 引擎修复与断言收编同批提交 + 快照显式重建独立 commit（对应 discovery §3.4 清空映射表）

**问题**：修复落地后 matrix-a/b 断言将先红（KNOWN 期望在但无违例可配），golden 快照因坐标/布局变化必然 diff；收编顺序与提交纪律不钉死会造成中间态红、静默快照更新或漏收编。

**决策**：
1. **同批提交**：每修复桶落地时（或整 Feature 交付批）同步清空对应 KNOWN 条目与文件头注释（matrix-a.test.ts:9-23/:38-71、matrix-b.test.ts:23-25/:48-60），断言函数从"已知集一一配对"收编为"0 违例"（`assert.deepEqual(violations, [])`）。**不出现"代码已修但 KNOWN 仍挂"或"KNOWN 已删但代码未修"的中间态提交**（CI 只验最终态，EC-001）。
2. **快照显式重建**：A 档受影响文档（er/uml-class/state/gantt/architecture/microservices/login-flow/ecommerce-flow/mindmap 等，凡坐标/布局变化的例）经 `LGDL_UPDATE_SNAPSHOTS=1` 重建 + sha256 manifest 更新；git diff 逐张审阅（坐标/文本位置类变化可接受；结构性变化——形状/class/元素增删——需停下审查，疑似新缺陷则回退，EC-002）；快照变更独立 commit（ADR-003，禁静默）。
3. **KNOWN 清空映射为验收核对表**（discovery §3.4 总表 29 项 = 基数 2 + state G5 1 + gantt G5 1 + M3 7 + M1/M2 18；Q-005 0 项但补 B12 档）：build/validate 阶段逐桶核对，matrix-a/b 收编后无任何残留 KNOWN。
4. 结构断言（svg.test / kind-coverage）若因坐标/文本位置改动变红 → 属预期结构变化，随快照重建同步审阅更新，**不得弱化断言语义**（守恒 NFR-003）。

---

### 组 1：render 文本/标签位置修复（EC-001 四项，对应 discovery Q-001~Q-004）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-001 | **er 基数标签落实体框外（Q-001）**：router 侧消除 er edges[0]（user→order）路由竖穿 user 自身实体框的 L 捷径（collapseGridPath 自身框内部穿越拒绝 + pathHitsOwnBody 浮点锚点短路修复 + 锚点数值稳定化），入/出段垂直锚点面；renderer 侧基数沿锚点面外法线外置（D-001 A+B） | ① er A 档 KNOWN_A.er 清空：audit 0 违例；② 基数 '1' 文本 bbox 完全落在 user/order 实体框外（G4 不命中）；③ matrix-a 专项断言：edges[0] 折线无任何段与 user/order 框**内部**相交（锚点除外，G3 豁免端点故需测试侧自查）；④ 路由从 user 下/右面垂直出体（折线首段与出体面垂直） | P0 |
| FR-002 | **uml-class 基数落实体框外 + 同边滑入消除（Q-002）**：edges[1]（order→payment）末端沿 payment 底边滑入 2px tick 消除（router detick，D-004 M2）+ 基数沿面外法线外置（D-001 B） | ① uml-class A 档 KNOWN_A['uml-class'] 中 G4 条目清空：audit 0 违例（同边 G6 条目由 FR-008/FR-009 联动清空，见组 3 与映射表）；② 基数 '1' 文本 bbox 完全落在 payment 框外；③ 末端无沿 payment 底边滑入段（detick 后末段垂直进面） | P0 |
| FR-003 | **state 边 label 画布内夹取（Q-003）**：placeLabelBox 增加画布边界约束，`isFree`/候选/回退均要求估宽 bbox 完整落在画布内（含边距）；普通边 label（:932）与聚合边 label（:758）两调用点口径一致（D-002） | ① state A 档 KNOWN_A.state 清空：audit 0 违例；② edges[5] label "用户取消" bbox 右缘 ≤ 画布宽（720）边界（含容差）；③ 聚合边 label 走同约束（B5/B6 聚合 label 无越界回归绿）；④ 既有普通边 label 定位不劣化（A 档其余文档 label 0 违例） | P0 |
| FR-004 | **gantt 里程碑/窄条时间文本不越界（Q-004）**：renderGantt 对近右缘窄条（条宽<64，含 milestone dur=0 条宽 20）外置文本检测越界并回退（条内左对齐/条左侧/里程碑上方），或 layout 画布右缘预留外置文本宽（D-002） | ① gantt A 档 KNOWN_A.gantt 中 G5（nodes[4] '18d +1d'）清空：audit 0 违例；② launch 里程碑时间文本 bbox 完整落在画布内（右缘 ≤ 1060 + 容差）；③ dur=0 milestone（条宽 20）同机制覆盖（B4b/B7 回归绿）；④ 文本语义 `${start}d +${dur}d` 不变 | P0 |

---

### 组 2：B2-LR 布局修复（对应 discovery Q-005）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-005 | **layered.ts LR 秩轴距按卡片宽估算（Q-005）**：LR 方向秩轴推进量取该秩 max 节点**宽度**（rankMaxW）+ RANK_SEP，TB 维持高度驱动不变；`rowY`/`rankMaxH` 语义按秩轴/交叉轴重命名（D-003） | ① LR 4 张 160×48 无成员卡链（a→b→c→d）实测：相邻 rank 卡片 bbox **互不重叠**（两两不相交，显式断言）；② TB 行为零变化（现有 TB 文档坐标/快照除预期漂移外无回归，全量矩阵绿） | P0 |
| FR-006 | **LR 画布宽按节点实际右缘兜底（Q-005）**：LR 画布宽 = max over nodes `(x + width)` + GRAPH_MARGIN（镜像 TB maxNodeRight 兜底），不再按末秩高度估算 | ① 同上 LR 卡链画布宽 ≥ 末卡右缘 + MARGIN，audit G5 0 违例（rect/文本/分隔线三元素均不越界）；② layoutGrouped/layoutHierarchical 两条共用 layeredRun 入口 LR 输出均不溢出 | P0 |
| FR-007 | **B12 LR 宽卡片回归档新增（Q-005 守护，D-003-3）**：matrix-docs-b 新增 B12（LR 多 rank 宽>高短卡片链 + 有向边），断言节点两两不相交 + 不溢出画布 + audit 0 违例；B2 intent 注释更新引用 B12 | ① B12 档落地且全绿（修复后）；② B2 现档折叠断言与单 rank 形态不变、仍绿；③ B12 在修复前为红（证明其确实暴露原缺陷，EC-010 同批提交）；④ B12 使 LR 宽卡片缺陷从此有门禁守护（matrix-b 测试计数 +1，守恒满足） | P1 |

---

### 组 3：G6 贴边三机制修复（对应 discovery Q-006~Q-008）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-008 | **M1 大段借道消除（Q-006）**：routeRectilinear/routeEdge（聚合边与普通边）引入贴边净空约束——路径任一段不得与任一节点/容器框边线共线且重合 >audit 容差；垂直进锚点保留合法；fallback 不得贴边；实现机制（贴边硬拒/障碍膨胀+走廊）由 plan 按 R-001/R-005 评估选型，验收口径不变（D-004-1） | ① 大段借道实证清零：architecture edges[10]（沿 user 下 40px / core 上 83px）、uml-class edges[1]（沿 infra 下 98px）、B5 edges[2]（沿 out 下 120px）全部不再贴边；② 相应 KNOWN 清空（A：architecture G6 edges[10]×2、uml-class G6 infra 项；B：B5 G6）→ audit 0 违例；③ 垂直进锚点场景不误伤（degraded-paths 场景 3 + 既有垂直进锚用例保持绿）；④ dense 障碍下无候选 → fallback 语义保持（不抛/有限/正交，不新增穿越第三方框违例） | P0 |
| FR-009 | **M2 末端微借道消除（Q-007）**：collapseGridPath 自身框平行贴墙容差从 ≤20px 收敛对齐 G6 口径（>0.5px 不允许）；输出 detick pass（末段用锚点真实坐标垂直落点）；锚点浮点先稳定化；routeRectilinear 通道侧同款（D-004-2） | ① 13 处末端微借道实证清零：architecture edges[0]/[6]（cdn/worker）、microservices edges[0]/[11]/[17]/[18]（gateway/redis/es/oss）、login-flow edges[3]（fail）、ecommerce-flow edges[14]（refund）、mindmap edges[3]/[8]（llm/edge）、B1 edges[3]/[4]（n3/n4）、B9 edges[1]（svc）全部不再贴边；② 相应 KNOWN 清空（A 12 项 + B 3 项）→ audit 0 违例；③ 折线形态变化（可能多一个折点）评分可微降但非违例；④ detick 不引入对第三方框的穿边/贴边新违例 | P0 |
| FR-010 | **M3 renderGantt 依赖边垂直进面（Q-008）**：renderGantt gap≈0 分支（:1108-1109）改三段式（水平至 b.x-clear → 垂直至 b.y → 水平垂直进目标左面锚点，clear≈8~12）；"目标在左"（:1110-1112）与 gap≥20（:1105-1107）分支保持不变（D-004-3） | ① M3 实证清零：gantt edges[0..3]（design/develop/test/launch 左缘 16px）、B4b edges[0]（t3）、B7 edges[1]/[2]（t2/t3）不再骑目标条左缘；② 相应 KNOWN 清空（A gantt G6×4 + B B4b/B7 G6×3）→ audit 0 违例；③ 依赖边保持正交、不穿中间任务条；④ B7 三型断言（正交 + x≥轴起点）保持绿，路径形态可微调 | P0 |

---

### 组 4：KNOWN 收编与回归（对应 discovery §3.4 清空映射表）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-011 | **matrix-a/b KNOWN 集清空回 clean（D-005-1）**：引擎修复后同步清空 KNOWN_A（22 项）与 KNOWN_B（7 项）及两文件头注释（matrix-a.test.ts:9-23、matrix-b.test.ts:23-25），断言收编为 0 违例（violations 为空） | ① 29 项 KNOWN 全部移除，无残留；② matrix-a 11 档 + matrix-b 各档 audit 断言 = 0 违例（clean）；③ 头注释中 EC-001/G6 已知缺口描述同步删除/更新为 clean 说明；④ 每桶清空与对应修复同批提交（git 历史无"修了未收编/收了未修"中间态） | P0 |
| FR-012 | **golden 快照显式重建 + diff 审阅（D-005-2）**：A 档受影响文档经 `LGDL_UPDATE_SNAPSHOTS=1` 重建（11 svg + sha256 manifest），git diff 逐张审阅后独立 commit | ① snapshot.test 全绿（重建后重跑 0 diff）；② git diff 审阅记录：坐标/文本位置类变化确认有意、结构性变化（形状/class/元素增删）无异常（EC-002）；③ 无静默更新路径（普通模式重跑篡改文件 sha 不变，沿 render-gate NFR 实证口径）；④ 快照变更独立 commit 可追溯 | P0 |
| FR-013 | **测试守恒 + 不引入新违例（G-005）**：全仓 `test(` 计数只增不删（≥503 基线）；既有断言零删除、零弱化；除被清空的 KNOWN 外，matrix A/B + snapshot 全量文档不得出现任何新 G1~G6 违例 | ① 落地后全仓 `test(` 计数 ≥ 503 且列出新增用例数（B12 + 专项断言）；② git diff 不含既有 *.test.ts 删除行或断言弱化（review 阶段核查）；③ 全量矩阵 + snapshot 全绿且 0 违例（KNOWN 全清后无新违例顶替） | P0 |

**Q-xxx 覆盖映射**：Q-001（er 基数穿体/G4）→ FR-001 + D-001；Q-002（uml-class 基数 + 滑入）→ FR-002 + FR-008/FR-009（同边 G6 联动）；Q-003（state label 越界）→ FR-003；Q-004（gantt 窄条文本越界）→ FR-004；Q-005（B2-LR 按高估算）→ FR-005/FR-006/FR-007（B12 守护）；Q-006（M1 大段借道）→ FR-008；Q-007（M2 末端微借道）→ FR-009；Q-008（M3 renderGantt 骑左缘）→ FR-010；KNOWN 清空映射总表（discovery §3.4：基数 2 + state 1 + gantt G5 1 + M3 7 + M1/M2 18 = 29）→ FR-011/FR-012/FR-013。

## 6. 非功能需求 (NFR)
> 性能、安全、可用性等跨切面需求

| ID | 类别 | 需求描述 | 验收标准 |
|----|------|---------|---------|
| NFR-001 | 门禁归零 | **修复后门禁从「已知集断言」回归「0 违例」**：matrix-a/b 断言更新为 clean（violations 为空），G1~G6 判定规则与容差常量零改动（A-001，引擎适配门禁） | render 包测试全绿且 0 违例；geometry-audit helper 无语义 diff（或仅注释）；`edgeRideTolPx=0.5` 等常量值不变（R-005 口径对齐靠 router 侧收敛，非 audit 放宽） |
| NFR-002 | 快照纪律 | **golden 快照只走显式重建**：任何引擎修复引起的快照变化必须经 `LGDL_UPDATE_SNAPSHOTS=1` 重建 + git diff 审阅 + 独立 commit（ADR-003，scope.out） | snapshot.test 重建后全绿；普通模式无静默写盘路径（validate 实证篡改文件 sha 不变）；快照 diff 有审阅记录 |
| NFR-003 | 测试守恒 | **全仓测试只增不删**：`test(` 计数 ≥ 503（2026-09-03 基线），既有断言零删除零弱化；KNOWN 条目删除属断言收编（加强为 0 违例）非删测试 | 落地后计数核对 ≥ 503 并列出新增（B12、er/uml-class 专项断言等）；git diff 无既有 *.test.ts 删除行/断言弱化（review 核查） |
| NFR-004 | 无新违例 | **修复不引入新违例**：三类修复共享 router/render/layout 改动面，不得在清空 KNOWN 的同时给其他文档制造新 G1~G6（修一个不能坏十个） | 全量矩阵（A 11 + B 档）+ snapshot 文档 audit 全绿 0 违例；无任何文档新增 KNOWN 记录 |
| NFR-005 | 兜底语义 | **fallback/退化路径语义保持**：router 修复（贴边拒判/collapse 收紧/detick）不得破坏既有兜底契约——A* 无解 → orthogonalize、routeRectilinear 无候选 → fallback 均须保持"不抛异常 + 输出有限 + 正交"（degraded-paths.test.ts 场景 3） | degraded-paths.test.ts 全绿；矩阵全量回归确认 orthogonalize/fallback 触发频率不增（R-002）；兜底输出不贴边、不新增穿越 |
| NFR-006 | 兼容性 | **DSL/API/输出结构不破坏**：修复只改几何（坐标/文本位置/走线形态），不改变 SVG 结构语义（class 名、元素类型、data-lgdl-loc、viewBox 结构），不改 DSL 解析与 LayoutResult 数据结构 | svg.test/kind-coverage 结构断言在快照重建后全绿（仅坐标/文本值变化，元素结构与 class 不变）；无 API 签名破坏（render/layout/router 对外导出不变或仅内部重命名） |
| NFR-007 | 确定性 | **引擎确定性不破坏**：修复后渲染仍逐字节确定（同输入同输出，双渲染一致） | B 档语义锁文档（B3/B4a/B4b/B9 双渲染字节一致）保持绿；快照重建后本地与 CI 字节一致 |
| NFR-008 | 可审阅性 | **修复与收编可追溯**：每桶修复对应 discovery Q-xxx 与 KNOWN 清空映射（§3.4 表），plan/tasks/review/validate 可逐项核对"修了哪条、清了哪项" | spec→plan→tasks 映射表完整；review/validate 阶段按 FR 逐项核对（清空映射 29 项无遗漏、无幽灵清空） |

## 7. 边界情况 (EC)
> 异常场景和边界条件的处理方式

| ID | 场景 | 处理方式 |
|----|------|---------|
| EC-001 | **KNOWN 收编中间态红**（引擎已修但 KNOWN 期望在 / KNOWN 已删但引擎未修） | 同批提交（D-005-1）：修复桶与对应 KNOWN 清空放同一 commit 或同一交付批，CI 只验最终态；validate 阶段核对 git 历史无中间态；不通过放宽审计口径掩盖（放宽须作者批准） |
| EC-002 | **快照 diff 出现结构性变化**（非预期：形状/class/元素增删，超出坐标/文本位置类变化） | 停下审查：疑似修复引入新缺陷 → 回退该桶改动定位根因；确认属预期语义变化 → 记录审阅说明后合入（FR-012）；禁止直接接受未知结构变化 |
| EC-003 | **routeRectilinear 密集障碍候选全拒**（贴边净空约束收紧后，R-001） | fallback 语义兜底：保持 degraded-paths 场景 3（不抛/有限/正交），fallback 路径本身不得贴边；接受视觉绕行变长（非违例）；若 fallback 直连穿越第三方框 → 触发既有 degraded 语义约束核查，必要时 plan 评估障碍膨胀变体 |
| EC-004 | **collapse 语义收紧 → A* 无解率上升**（自身框穿越拒绝 + 平行容差收敛，R-002） | 全量矩阵回归确认 orthogonalize 兜底频率不增；B12/新增矩阵档重点观察；无解 → 正交兜底输出不得贴边/穿越；兜底增多属形态劣化（非违例）但需记录，若显著恶化上报作者 |
| EC-005 | **锚点浮点精度边界**（entity 顶弧锚 y=40.00000000000005 级 5e-14 差，R-006） | router 侧先做锚点数值稳定化（snap 到合理精度）再走 segInside/detick/贴边判定；防 5e-14 级差导致"段被含入框内侧"短路漏判或误判 |
| EC-006 | **router 内部容差与 audit 口径漂移**（修完仍红 / 误伤，R-005） | 修复以 audit 判定为准绳（共线 <0.5px + 重合 >0.5px 即违例、垂直进锚合法）；容差常量同源化（单一来源或一致性测试，plan 落位）；validate 阶段全量矩阵实测确认无"修完仍红" |
| EC-007 | **文本估宽启发式极端字符误判**（gantt 外置文本/state label 的 CJK vs Latin 估宽，R-003） | 沿用 renderer 既有估宽口径（labelBoxAt :246-251：CJK 1.0×fs / Latin 0.62×fs）做越界检测，bbox 四周保留既有安全扩边；validate 阶段对改动文档实测无误报/漏报；若需调估宽参数须作者批准并记录 |
| EC-008 | **gantt dep "目标在左"/gap≥20 分支误伤**（M3 修复只动 gap≈0 分支，Q-008） | 明确只改 gap≈0 分支；"目标在左"绕行与 gap≥20 分支行为不变；B7 三型断言（正交 + x≥轴起点）保持绿即证明未误伤 |
| EC-009 | **修复破坏已有锚点/基数定位的合法形态**（面法线外置误伤 22px 正常外置基数，D-001-B） | er/uml-class B8（基数全枚举：1/0..1/0..*/1..* 双向 22px 外置不压框）回归保持绿；外法线方向计算需覆盖 4 个面 + 15° 锚点位置；validate 实测无正常基数被误置 |
| EC-010 | **B12/新回归档在修复前为红**（新增档暴露原缺陷） | B12 与修复同批提交（修复前红是预期，证明档有效）；不在修复落地前单独合入红档；B12 断言（两两不相交 + 不溢出）与 audit 0 双重要求 |

## 8. 开放问题
> 待决策事项和需要进一步调研的内容

| # | 问题 | 状态 |
|---|------|:--:|
| 1 | **目标版本与合入窗口**：三类修复随下一发布窗口？与 render-gate 同批收口后立即合入？ROADMAP v1.4.0 排布约束 | 待作者/roadmap 决策 |
| 2 | **M1 实现机制选型**：贴边硬拒/候选净空过滤（主方向）vs 障碍膨胀 + 锚点外走廊（候选全拒时的变体）——两种机制共享验收（FR-008），具体实现与切换阈值 | 待 plan 评估（按 R-001/R-005） |
| 3 | **容差常量同源化方案**：router 内部贴边容差与 audit `edgeRideTolPx=0.5` 的单一来源/一致性测试如何落位（EC-006） | 待 plan 决策 |
| 4 | **gantt 窄条文本修复策略**：renderer 侧回退（主）与 layout 画布右缘预留（辅）是否双落地，还是仅 renderer 侧（FR-004） | 待 plan 评估 |
| 5 | **examples/*.svg 磁盘产物**：快照重建是否顺带重生成磁盘 .svg（本 Feature NG-003 不碰；磁盘漂移 7/11 处置） | 待作者决策（另立 Feature） |
| 6 | **er/uml-class 专项断言落点**：穿自身框消除的自查断言（FR-001/FR-002）放 matrix-a 文档断言还是 geometry-audit helper 扩展/独立单测（不新增 G 规则的前提下） | 待 plan 决策 |
| 7 | **collapse 平行贴墙容差收敛的兼容边界**：≤20px → >0.5px 收紧后，除 13 处 KNOWN 微借道外是否还有未被矩阵覆盖的 1~16px 平行滑入场景（discovery 已列 13 项实证，可能有余量） | 待 build/validate 实测核对 |

## 修订记录
> 记录本文档的版本变更历史

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建 — 摸底后轻量模式（需求本质作者指令已闭环，零访谈）：三类缺陷修复要求分 4 组 FR（render 文本标签 / layout LR / G6 贴边三机制 / KNOWN 收编回归）+ 设计决策 D-001~D-005（基数 A 主 B 辅、文本画布约束与窄条回退、B2-LR 按宽估算 + B12 回归档、G6 三机制对齐 audit 口径、KNOWN 同批收编 + 快照显式重建）；13 FR + 8 NFR + 10 EC + 7 开放问题；Q-001~Q-008 全覆盖映射；总体验收 = 29 KNOWN 清空 + 0 违例 + 快照显式重建审阅 + 测试守恒 ≥503 + 不引入新违例 | 2026-09-02 | SDDU Spec Agent |
