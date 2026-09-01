# Archify 布局与走线（Edge Routing）机制揭秘

> 研究任务产物 · 只读源码分析 + LGDL 双全景 8 张图实测观察
> 源码根：`.opencode/skills/archify/archify/`（下文路径均相对该目录）
> 日期：2026-08-31
> 标注约定：`[文件:行号]` 为源码证据；无法直接证实、属观察推断的内容以「◆ 观察推断」标出。

---

## 1. 总纲：稳定优雅从哪来

**一句话结论：archify 的「稳定优雅」不是排出来的，而是管出来的——布局全部由确定性纯函数 + 固定常量表计算得出，交付前由双层机械门禁（renderer 布局校验 + 成品 artifact checker + 浏览器视觉检查）把任何「丑、乱、溢」直接判为失败，并在两轮聚焦修复内把作者拉回合格解。**

三层机制概览：

| 层 | 机制 | 源码落点 |
|---|---|---|
| **确定性布局算法** | 每种图类型 = 一套固定常量表 + 纯函数坐标计算（无随机、无时间依赖、无迭代到收敛的随机抖动），同一 IR 恒产出同一坐标 | `renderers/architecture/grid.mjs:13`、各 `render-*.mjs` 的 `layout` 常量表、`pathCache` |
| **交付前门禁** | renderer 内 `validateXxx()` 抛出结构化诊断 → CLI `deliver` 只原子提交通过检查的候选；成品再跑 9 项 artifact checker + composition 度量 | `render-architecture.mjs:337`、`bin/archify.mjs:916`、`scripts/check-render-output.mjs` |
| **视觉检查闭环** | `visual-check` 用无头 Chrome 在 4 档视口实测 containment / 投影字号 / Viewer chrome，落 JSON 收据 + 双主题截图，从不修改成品 | `bin/visual-check.mjs:9-14`、`bin/visual-check.mjs:690` |

设计哲学在 `SKILL.md` 中写死为工作流约束：先画主路径、≤12 个主节点、自动路由起步、一个诊断对应一个几何控制项、validate 每改必跑、通过后冻结候选（`SKILL.md:21-28`）。也就是说**优雅是「约束把坏解排除掉」的剩余空间**，而不是生成器有多聪明。

---

## 2. 布局机制分类型拆解

### 2.1 architecture：网格分配 + 自由坐标

架构图是五种类型里唯一提供「半自动网格」的。`grid.mjs` 第一行注释就把定位说清了：

> `/** Grid placement for architecture IR (#8). Not auto-layout — fixed cell math only. */` `grid.mjs:1`

**布局算法（grid 模式）：**
- 默认网格常量 `grid.mjs:3-11`：`origin [40,80]`、`cols 4`、`gapX 30`、`gapY 40`、`cellW 130`、`cellH 64`。
- `gridLayout()` 把 IR 里的 `layout` 覆盖到默认值上，`layout.mode !== 'grid'` 时返回 null（即自由放置）`grid.mjs:13-17`。
- 定位公式是纯算术：`x = origin.x + col * (cellW + gapX)`，`y = origin.y + row * (cellY + gapY)` `grid.mjs:19-31`。`pos:[x,y]` 优先于 `row/col`（`grid.mjs:20`、`43`）。
- `validateGridPlacement()` 做三类机械检查：缺 pos/row-col、col 越界（`col >= layout.cols` 报错）、同格重复（`grid.mjs:44-61`）。

**关于「层次 / 泳道 / 放射」等模式**：源码只存在两种——`layout.mode:'grid'` 与省略 `layout` 的自由坐标（schema 的 `layout.mode` enum 只有 `"grid"` 一个值，见 `schemas/architecture.schema.json:69` 起）。所谓「层次」在 LGDL 实测中是用**网格行**表达的（如 architecture-layers 图：cli/web 在 row 0、render 在 row 1、router/layout 在 row 2、core 在 row 3）；「泳道/分组」由 `boundaries`（`wraps` 成员列表）表达，边界矩形由成员包围盒自动计算 `render-architecture.mjs:111-131`。**◆ 观察推断**：任务描述提到的「层次/泳道/放射等布局模式」在本版本源码中没有独立算法实现，层次 = 网格行、泳道 = boundary/数据流 stage、放射 = 自由坐标。

**其他确定性细节：**
- 节点尺寸 `size:[w,h]` 缺省 `120×60`；`measureComponent` 用 `pos`/`row/col` 解析出 `x,y,cx,cy` `render-architecture.mjs:93-97`。
- Boundary 标题自动排版：按面积升序放置标题，遇遮挡把标题上移（while 循环内 `title.y = min(blocker.y - gap - title.height)`），确定性且有限步 `render-architecture.mjs:230-277`。
- 标题可读性迭代：质量档下最多 32 轮「按最小可读字号扩框→重排→比对收敛」，不收敛则报 `composition/desktop-readability` `render-architecture.mjs:288-313`。
- 自动 viewBox：由所有组件 + boundary + 图例足迹（`legendFootprint`）计算 `render-architecture.mjs:151-176`；IR 可显式 `meta.viewBox` 覆盖。
- z 序固定：boundary → 连线 → 组件 → 连线标签 → boundary 标题（遮罩把走线挡在标题外）→ 图例 `render-architecture.mjs:1048-1074`。

**确定性保证**：坐标 = 常量表 + 输入字段的算术函数；`resolveComponentPos` 对非法输入返回 `[NaN,NaN]` 而非猜测，随后被 `isFinitePoint` 校验捕获 `render-architecture.mjs:363-365`。

### 2.2 sequence：参与者列 + 消息行

**布局算法（`render-sequence.mjs:24-78`）：**
- 默认 viewBox `[920,760]`；参与者按**等距列**排布：`participantX(i) = leftX + i * colGap` `render-sequence.mjs:62-64`。
- 两种列模式：`column_fit:"fixed"`（默认，`participantW=86`、`colGap=108`，保持历史坐标）与 `"spread"`（按 viewBox 宽度均摊：`participantW = max(86, min(190, round((vbW - 124)/n) - 24))`，`colGap ≥ 108`）`render-sequence.mjs:31-39`。
- 行轴完全由作者给定 `message.y`；renderer 只校验不重排。关键常量：`topY=72`、`participantH=54`、`lifelineTop=142`、`lifelineBottom = vbH - 65`、`sideMargin=62` `render-sequence.mjs:41-51`。
- 消息几何：起点 `from.cx + dir*7`、终点 `to.cx - dir*7`，水平线 `render-sequence.mjs:80-88,127-133`。
- 段标签（segment label）避让：从 `segment.from - 22` 起，被消息标签/路由盒遮挡就 `y -= 22`，最多 4 次尝试 `render-sequence.mjs:339-353`。

**行距/首屏约束（实测关键）：**
- **28px 相邻消息行下限**：校验对「共享水平空间的相邻消息」要求 `Δy ≥ 28`，否则报错 `render-sequence.mjs:241-256`。
- 消息 y 必须落在可读时间轴内：`lifelineTop + 18 ≤ y ≤ lifelineBottom - 18`；时间轴净高 `< 120` 直接报错 `render-sequence.mjs:152-154,178-180`。
- 消息跨度 ≥ 60px、参与者盒宽 86px 放不下标签会拒绝（`render-sequence.mjs:156-159,181-184`）。
- **viewBox 比例 ≤0.39**：`docs/archify-usage-report.md:61` 记录的实测经验值。源码里没有字面的 0.39 常量，它是「首屏 + 可读性」门禁的**涌现约束**：① 成品 checker 按 930px 可读宽估算投影字号（`desktop-readability.mjs:1-5`），7px sublabel 投影到 6.03px 是极限通过（`check-render-output.mjs:625`）；② visual-check 在 1440×900 起验 containment。LGDL 实测的 sequence 图最终 viewBox `[1080,490]`（比例 0.454）四档全部通过，说明 0.39 是迭代期更保守的预算值。**◆ 观察推断**：0.39 的来源与「首屏不溢出」的垂直预算（900px 视口 − 固定 chrome ≈ 322px 后，`(900-322)*W/1274` 对 W=1080 恰好给出 H≤490）一致，但该精确值不是源码常量。

### 2.3 dataflow：泳道（阶段列）+ 行槽

**布局算法（`render-dataflow.mjs:51-63,92-106`）：**
- 每节点坐标 = 阶段列 + 行槽：`cx = leftX + stage*colGap`、`y = rowYs[row] + yOffset`。
- 常量表：`leftX=100`、`colGap=215`、`stageW=168`、`nodeW=112`、`nodeH=58`、`rowYs=[128,242,356,470,584]`（5 个固定行槽）、`stageY=46`、`stageH=36`、`stageBottomPad=74`；默认 viewBox `[940,720]`。
- 阶段帧 = 泳道：`stageFrame` 从阶段列中心展开宽 168 的矩形 `render-dataflow.mjs:77-88`。
- 标签盒高度按是否带 `classification` 分 16px / 27px，宽度按最长行估算 `render-dataflow.mjs:65-71`。

**确定性校验：** stage/row 必须在有效范围；节点水平留白 ≥24px；可读区上下界；行间 10px 净空；流最短 34px；`via` 中出现斜线段即报错（强制正交）`render-dataflow.mjs:134-204`。

### 2.4 workflow：列网格（实测约束最紧）

**布局算法（`render-workflow.mjs:47-57,92-107`）：**
- 泳道（lane）在 y 轴等距：`laneTop(i) = laneY + i*(laneH + laneGap)`，常量 `laneY=52`、`laneH=104`、`laneGap=20`、`laneTitleH=30`、`laneX=40`、`laneW=640`。
- 列网格：`colXs = [88, 220, 300, 430, 500, 625]`（6 列，列距 132/80/130/70/125）。节点 `cx = colXs[col]`，默认 `nodeW=92`。
- 节点垂直居中于泳道内容区：`y = laneTop + laneTitleH + (contentH - height)/2 + yOffset`。
- phases（列区间顶栏）、groups（泳道内列区间框）都由 `spanForCols(fromCol, toCol, pad)` 推导 `render-workflow.mjs:460-464`。
- 自动高度：`laneY + n*laneH + (n-1)*laneGap + 124`；宽度固定 720 `render-workflow.mjs:60-64`。

**为什么「3-4 列仅 70px 间距」会反复触发布局冲突（实测）：**
相邻列中心距小于节点宽 92px 即重叠——列距 80px（col1→2）时 92px 节点重叠 12px，列距 70px（col3→4）时重叠 22px（见第 7 章实测）。节点可用的「安全列链」只剩约 3-4 列（如 0→1→3→5）。加上 `validateWorkflow` 还强制：节点不得越泳道边界（`render-workflow.mjs:245-251`）、同泳道节点 8px 净空、边 ≥28px、phase/group 列区间不得重叠、`mainPath` 不得回退 `render-workflow.mjs:303-311,254-297,387-407`——列少、间距紧、约束多，这正是 LGDL 把「核心业务旅程」从 workflow 改型 dataflow 后一次通过的根因（见第 7 章）。

---

## 3. 走线（Edge Routing）机制

archify 的走线没有「路径搜索求解器」，而是一组**确定性候选生成 + 净空过滤 + 机械门禁**的组合。全部走线函数都是纯函数（`geometry.mjs:1-3` 明确声明）。

### 3.1 基础几何原语（`renderers/shared/geometry.mjs`）

| 原语 | 作用 | 位置 |
|---|---|---|
| `rectsOverlap(a,b,gap)` | 带 gap 的矩形碰撞（非有限坐标视为「未知」而非重叠） | `geometry.mjs:20-35` |
| `segmentIntersectsRect` | 线段与矩形求交（含端点在内判定 + 四边线段相交） | `geometry.mjs:37-52` |
| `segmentRectClearance` | 线段到矩形最小距离（交点=0；否则取端点距离与四角到线段距离的最小值） | `geometry.mjs:54-73` |
| `segmentRectIntersectionLength` | 线段被矩形覆盖的长度（slab 法） | `geometry.mjs:75-105` |
| `properSegmentIntersection` / `segmentsIntersect` / `orientation` | 叉积判交、共线判段 | `geometry.mjs:976-1030` |
| `normalizeRoutePoints` | 去重 + 共线折叠，输出最小折线点集 | `geometry.mjs:877-890` |
| `polylinePath` / `roundedPath` | 折线 → SVG path（圆角 r=8，半径截断到相邻段一半） | `geometry.mjs:1203-1239` |
| `anchor(rect,side)` | 边中点锚点 | `geometry.mjs:1032-1041` |
| `labelPoint` | 标签落点（labelAt 优先 → 双点中点偏上 10px → 默认第 1 段中点偏上 10px） | `geometry.mjs:1243-1255` |

### 3.2 端点方向契约与端口自动展开

- **Side 是方向契约**：`routeHonorsEndpointSides` 要求首/末段垂直离开/进入选定边 `geometry.mjs:194-256`。`cleanEndpointSideProblems` 把「来自/去向与侧不垂直」判为错误，并区分「作者声明的 side」与「renderer 推断的 side」`geometry.mjs:265-333`。
- **自动端口展开（automaticPortSpread）**：同一节点同一侧的多条自动边，把锚点沿边展开，间距 = `min(maxSpacing=14, (extent - 2*gutter=16)/(n-1))`，按对端中心排序——让扇形接线保持视觉区分 `geometry.mjs:1125-1183`。跳过了单条关系、显式 `via/channelX/channelY/labelAt` 与非 auto 路由。
- **节奏桥（automaticPortRhythmBridge）**：平行侧锚点间距过近时，走外侧通道（`endpointStubPx=24`、`interiorSegmentPx=16`），避免产生 <8px 微段或 <16px 内部转弯 `geometry.mjs:1054-1120`。
- 默认侧推断：按对方质心相对方位取 facing 侧 `defaultFromSide/defaultToSide` `geometry.mjs:1185-1197`。

### 3.3 自动路径生成（各 renderer 自带）

**architecture（障碍感知，确定性候选序）：** `routeVia` 的 auto 分支按固定优先级生成并过滤候选 `render-architecture.mjs:822-917`：
1. 近乎对齐（Δx<4 或 Δy<4）且垂直接线 → 直线；
2. `automaticPortRhythmBridge`（带 `routeClearsComponents` 过滤）；
3. 平行侧近距（Δ<16px）→ 外侧通道；
4. 候选序：`sideAware`（含 16px 外侧桥的 side-aware 折线，`render-architecture.mjs:694-744`）→ `sideSafe`（中点正交）→ 其余；**第一个通过净空过滤的即采纳**；
5. 兜底 `sideSafe[0] || sideAware[0] || horizontalFirst`——保持历史确定性，让门禁去报告真实障碍。

净空谓词：`routeClearsComponents`（端点组件豁免，clearance=2）与 `routeClearsEndpointComponents`（首段只查 from、末段只查 to）`render-architecture.mjs:651-672`。`pathFor` 用 `pathCache` 缓存每条连接的点集 `render-architecture.mjs:919-958`。

**dataflow（极简，无自动避障）：** auto 只有 `midX` 中点狗腿 `render-dataflow.mjs:326-331`；其余全靠 `vertical-channel/channelX`、`bottom-channel(+26px)`、`top-channel(-24px)` 等显式通道。穿节点不会自动绕——由 `cleanFlowProblems` 判错，逼作者用诊断给的控制项修复（见 3.4）。

**workflow（一弯优先 + 净空过滤）：** 同泳道走中点狗腿 `sameLaneAutoVia`；跨泳道先试「单弯」(`oneBendCrossLaneVia`，要求每段 ≥8px 且 `routeClearsUnrelatedNodes`)；`automaticOneBendSides` 自动挑选「垂直出 + 水平入」的朝向；失败才回落到 `drop`（泳道间隙按 `bias` 插值）`render-workflow.mjs:454-560`。显式路由原语：`drop / outside-right(+12) / return-left(-28) / bottom-channel(+32) / up-channel(-28)`。

### 3.4 净空门禁：不自动绕，就判错

`cleanFlowProblems` 是**所有类型共用的「边穿节点」硬门禁**（`edge-through-node`），连无质量档也会生效（注释明确这是正确性不变量，不是可选项）`geometry.mjs:340-400`。流程：每条已路由边逐段对每个非端点障碍求 `segmentIntersectsRect`，命中即出结构化诊断（含障碍 id、段下标、像素坐标）并给出 routeHint。

### 3.5 标签避让

- 标签落点由 `labelPoint` 确定性决定；workflow 会额外把标签放到**较长的那段**并做垂直偏移，避免标签压在短 stub 上 `render-workflow.mjs:564-576`。
- 三处机械检查：标签矩形 vs 组件/节点（`render-architecture.mjs:577-599`、`render-dataflow.mjs:265-278`、`render-workflow.mjs:409-422`）、标签 vs 标签（dataflow `279-285`、workflow `423-429`）、showcase 下标签 vs 其他关系的路由（`cleanLabelRouteClearanceProblems`，阈值 4px）`geometry.mjs:822-869`。
- 修复提示具可执行性：`suggestLabelObstacleFix` 直接给出 `labelAt [x,y]` 或 `labelDy ±n` 的具体数值建议 `geometry.mjs:1305-1316`；`suggestLabelPairFix` / `suggestComponentSeparation` 同理 `geometry.mjs:1318-1334`。

### 3.6 交叉最小化策略（如实说明）

**archify 没有交叉最小化算法，而是「showcase 下禁止交叉」**：`cleanCrossingProblems` 只在 `quality_profile === 'showcase'` 时启用（`ARCHIFY_QUALITY_PROFILE` 环境变量或 profile），只判「无共享端点的两条边在内部真交叉」，命中即 error `geometry.mjs:406-473`。配套的 `cleanAmbiguousCorridorProblems` 对「共走廊但未真交叉」的两条无关边（重叠 ≥8px）也判错 `geometry.mjs:480-530`；`cleanBorderRunProblems` 禁止沿容器边框借道 `geometry.mjs:585-627`；`cleanRouteRhythmProblems` 禁止 <16px 内部段 / <8px 微段 `geometry.mjs:739-820`；`routeBudgetMetrics` 给出折点数/拉伸比/最短段度量 `geometry.mjs:675-737`。也就是说：**交叉的最小化靠「不允许存在 + 作者按诊断手工避让」，而不是路由器的全局优化**。

---

## 4. 质量门禁体系

### 4.1 双门禁结构

```
renderer validateXxx() ──通过──> 写 SVG/HTML ──> check-render-output.mjs（9 项 + composition）
        │ 失败（结构化 diagnostics + supportedFixes）              │ 失败
        ▼                                                        ▼
    CLI 报错，绝不交付                                       deliver 原子提交 / 否则保留旧成品
        ───────────────────────────────────────────────────────────▶ visual-check（浏览器 4 视口）
```

### 4.2 validator.mjs —— schema 门禁（`renderers/shared/validator.mjs`）

- 用预生成的 AJV validators（`generated-validators.mjs`）校验 IR，失败时**把 JSON pointer 路径注解为最近元素 id/label**（`annotatedPath`），让 LLM 知道改谁 `validator.mjs:6-26`。
- 每个错误都转成结构化诊断：`code: schema/<keyword>`、`subject`（diagramType + path + identity）、`evidence`（keyword + 期望 schema + params）、`supportedFixes`（按 keyword 映射的可执行修复：additionalProperties→删属性、required→补字段、type→改类型、enum→选合法值、minimum/maximum→改边界、minItems/maxItems/minLength/maxLength→数量/长度）`validator.mjs:56-68,81-85`。

### 4.3 layout-report.mjs —— 布局度量（`renderers/shared/layout-report.mjs`）

供 `--layout-json` / `inspect` 输出：`componentBox`（id/type/label/坐标/尺寸/row/col/pos，坐标取整）、`boundaryBox`、`connectionPath`（路由点取整 + 标签落点）。**所有浮点坐标在报告层取整**，保证 dry-run 可 diff、可断言 `layout-report.mjs:3-40`。

### 4.4 成品 artifact checker（`scripts/check-render-output.mjs`）

对渲染出的 HTML 做 9 项检查：
1. `single_svg` 恰好一个 `<svg>`；
2. `finite_svg` 不含 NaN/undefined/Infinity；
3. `orthogonal_arrows` 无斜线段（从 path 命令流解析）`check-render-output.mjs:66-85`；
4. `label_route_clearance`（showcase 阈值 4px，standard 2px）`check-render-output.mjs:105`；
5. `relationship_crossings`；
6. `relationship_corridors`；
7. `container_border_runs`（所有档强制 error，`data-quality-gates` 非 advisory 时）；
8. `route_rhythm`；
9. `legend_clearance`（路由不得穿图例）。

composition 汇总：showcase 下 crossings/corridors/rhythm/labelClearance/desktopReadability 是 error，standard 降为 warning；`ok = checks 全过 && composition.status !== 'fail'` `check-render-output.mjs:121-133,274`。这就是 SKILL.md 说的「showcase 必须 9/9 检查且 0 errors / 0 warnings」`SKILL.md:28`。

### 4.5 visual-check.mjs —— 4 视口 + readabilityOk 原理（`bin/visual-check.mjs`）

- **4 档视口**：1440×900 / 1600×1000 / 1920×1080 / 2048×1320（`VISUAL_CHECK_VIEWPORTS`），light 全测；dark 只测 1440 与 2048（截图 `CAPTURE_VIEWPORTS`）`visual-check.mjs:9-19`。
- **投影字号计算**：页面内 JS 取 `scale = min(1, diagramWidth / viewBoxWidth)`，再对所有 `data-node-label / data-boundary-label / data-detail="context"` 的 text 计算 `sourceFontPx * scale`，记录最小者 `visual-check.mjs:394-414`。
- **readabilityOk**：`minimumProjectedNodeTextPx >= MIN_PROJECTED_NODE_TEXT_PX(6)` `visual-check.mjs:495-506`。
- **containment**：`scrollWidth ≤ innerWidth && scrollHeight ≤ innerHeight`，4 档全过才算 pass `visual-check.mjs:500-530,780-794`。
- **Viewer chrome 校验**：图例 vs 导航 Dock、stage vs Dock 的交叠面积与间隙（`legendDockIntersectionArea ≤ 0.5`、`dockStageGap ≥ requiredDockStageGap - 1`）`visual-check.mjs:514-519,610-638`。
- 收据结构：`{schemaVersion, status, containment, readability, viewerChrome, captures, sidecars}`；**永远 `visualReview:"pending"`**——自动化只出证据不出验收结论 `visual-check.mjs:660-684`；SKILL.md:92 明示「screenshots are evidence for inspection, never an automatic polish claim」。
- 退出码：0=pass、1=overflow/失败、2=无 Chrome（skipped）`visual-check.mjs:21`。
- 运行期防护：检查前后比对成品 sha256/bytes，成品被改动即失败 `visual-check.mjs:765-768`；sidecar 全部原子写（`writeAtomic`：tmp+pid → rename）`visual-check.mjs:42-50`。

### 4.6 两轮聚焦修复在源码/CLI 的体现

- **supportedFixes 是契约字段**：validator（schema 级）`validator.mjs:56-68`、geometry 门禁（布局级）`geometry.mjs:327,394,467,573,669,816,865`、CLI 顶层（artifact 级）`archify.mjs:188-196`（COMPOSITION_FIXES）都有；CLI 打印诊断时自动拼接 `Fix: …` `archify.mjs:230-239`。
- **「最多两轮」在 CLI 侧没有硬计数**，是 `SKILL.md:35` 的工作流纪律：`deliver` 失败时「只改诊断指出的 subject、核对 evidence、从 supportedFixes 里选、重跑；若连续两轮不改进最优错误数，停止并如实上报」。SKILL.md:21 还规定「每个诊断最多只应用一个几何控制项」，从源头防抖。
- CLI 对所有失败 fail-closed：renderer 未出结构化诊断时绝不把 Node 堆栈塞进收据（`archify.mjs:140-171`），错误一律转诊断对象。

---

## 5. 稳定性/确定性的工程保障

1. **纯函数编译**：布局几何全部是无随机、无时钟的纯函数；renderers 里的 `Math.random` / `Date.now` 检索结果为零（唯一例外在 `output-path.mjs:166` 的临时目录后缀与 `brand-marks.mjs` 的品牌抓取超时，均不进入 SVG 内容）。同一 IR → 同一字节（`SKILL.md` 与 `docs/archify-guide.md` 均以此为核心卖点）。
2. **固定迭代上限**：boundary 标题 32 轮不收敛即报错而非无限抖动 `render-architecture.mjs:288-313`；段标签最多 4 次上移 `render-sequence.mjs:345-348`；`pathCache` 保证每条边只算一次、顺序无关 `render-architecture.mjs:919,936-958`。
3. **compare 的 canonical 化**：base/head 两侧先过校验、再按 canonical 顺序重排集合后才渲染，保证「格式化的输入重写」不改变产物哈希 `archify.mjs:574-579,606-610`。
4. **原子交付防半成品**：
   - `deliver` 把规格冻结成 `specification.snapshot.json`（`flag:'wx'`）→ 用冻结副本渲染 → 跑 checker → 全部通过才 `rename` 到目标；失败时旧成品原样保留，staging 目录 finally 清理 `archify.mjs:876-936,1067,1115-1121`。
   - `compare` 用成对 backup/rename + 回滚（`commitComparePair`）`archify.mjs:314-380`。
   - `visual-check` 绝不改成品 HTML（只写 `.visual-check.*` sidecar）。
5. **诊断边界 fail-closed**：`rendererFailure` 只认结构化诊断 JSON，否则报「Renderer failed before emitting a structured diagnostic」`archify.mjs:140-171`。

---

## 6. 与 LGDL 的互鉴

LGDL 与 archify 走同一条「确定性渲染」技术路线（`docs/archify-usage-report.md:94-97`），但布局/走线机制完全不同：

| 维度 | Archify | LGDL 自研 |
|---|---|---|
| 布局策略 | 每类型固定常量表 + 纯函数坐标；网格/列/行槽全由 IR 显式指定，无自动布局 | Sugiyama 四阶段自动分层（cycle removal → 最长路径分层 → barycenter 排序 → 坐标），`packages/lgdl-layout/src/layered.ts:8-21,44-134` |
| 走线策略 | 确定性候选（桥/狗腿）净空过滤；showcase 禁止交叉，不自动绕障的类型靠门禁逼作者修 | 整图均匀网格 **A\* 搜索**（`routeAStar`，clear=14px 障碍膨胀、bendW=30 转弯罚、方向回退罚），8 组锚点对取质量分最高者，`packages/lgdl-router/src/index.ts:119-221,613-747` |
| 交叉处理 | showcase 把「真交叉 / 共走廊 / 沿边借道」判为 error，由作者手工避让 | `countCrossingsWithRouted` 对每条已布边逐段计数（每次 -1000），路由时即最小化 `index.ts:462-474,202-204` |
| 贴边处理 | 净空门禁 + 自动端口展开/节奏桥 | `pathHugLength` + 贴边硬罚 -1e5 + 锚点走廊雕刻 `index.ts:523-555,630-693` |
| 校验时机 | 交付前双层门禁 + 浏览器 4 视口实测 | 编译期 error-only 校验（ADR-005 哲学，`docs/research/edge-routing/lgdl-router-current.md` 有现状对照） |

**LGDL 可借鉴点：**
1. **4 视口视觉检查收据**：`visual-check` 的「containment + 投影字号 + 双主题截图 + 永不改成品」是 archify 最值得移植的能力——LGDL 目前无浏览器实测闭环，可在 Web 工作台或 CI 中加同等收据（含 `visualReview:"pending"` 的诚实边界）。
2. **净空验证即门禁**：archify 把「边穿节点 / 标签压线 / 沿框借道 / 微段」做成**提交前错误**而非运行时尽量绕——LGDL router 的 A* 已内置绕障，可再补一层「路由后净空审计」，把软评分漏网的解在交付前拦截。
3. **readability 度量**：`projectedNodeTextPx`（930px 可读宽模型 + 6px 投影下限）是简单但有效的防溢出公式，LGDL 的 render 可对「缩放后的字号下限」做同款预算。
4. **结构化 supportedFixes**：archify 每个诊断都带机器可读修复建议，LGDL CLI 的报错可对照升级（`docs/archify-usage-report.md:103` 已有同款结论）。
5. **确定性候选序而非全局优化**：archify 用「固定顺序候选 + 首个净空者」获得 O(n) 确定性；LGDL A* 靠 heap 优先序确定性也不错，但可给候选生成加同样的「可复现种子/稳定 tie-break」并留测试断言。

**LGDL 反哺 archify 的点（对称观察）**：Sugiyama 自动分层 + A* 真实绕障说明「自动布局也能确定」；archify 若未来要支持大图，可借鉴 LGDL 的 `layoutGrouped`（group 作 super-node）与 RANK_SEP=96 的层间通道预算（`docs/research/edge-routing/lgdl-router-current.md:62-69`）。

---

## 7. 实测观察（LGDL 8 张图）

LGDL 双全景 8 张图（`.sddu/docs-tree-root/diagrams/` + `业务全景/diagrams/`）全部通过 showcase 9/9 检查 + 4 视口 visual-check（收据 status=pass、readabilityOk=true、投影最小字号 7–9px）。哪些机制真正起了作用：

1. **architecture 网格 + boundary 标题排版**：3 张网格图用 `row` 表达层次（architecture-layers 的 cli/web→render→router/layout→core 四行）；`双层消费模型` 走自由坐标。boundary 标题的可读性迭代在 `architecture-deps`（含「零依赖 · 语言事实来源」上下文子标签）上实测投影 8.71px，远超 6px 门槛。
2. **workflow 列网格是真约束**：`colXs=[88,220,300,430,500,625]` 的 70px 列距（col3→4）对 92px 节点重叠 22px、80px 列距（col1→2）重叠 12px——安全列链仅剩约 3-4 列。**◆ 观察推断**：「3-4 列仅 70px 间距」是 LGDL 迭代时对该约束的实测概括（与 `docs/archify-usage-report.md:64` 记录一致），数字可由源码复算。
3. **sequence 行距压缩**：最终 9 条消息 y 以**严格 28px 等差**（160→384）排布 `sequence-ai-ops.json` 实测值；这正是 28px 相邻消息门禁的产物（原 12 条消息被压到 9 条，余量入卡片，`usage-report.md:62`）。`column_fit:"spread"` 在 1080 宽下把 6 个参与者铺满画布（86px → 约 135px 盒宽）。
4. **workflow→dataflow 改型的约束触发**：`核心业务旅程` 原为 workflow，固定列网格 + 纵向泳道预算反复冲突（usage-report.md:64 记录「两轮修复未果后调整」）；改 dataflow 后（5 stage × 2 row，viewBox `[1080,500]`）一次通过——实证了「两轮聚焦修复上限」规则与 dataflow 泳道+行槽布局的宽容度。
5. **visual-check 的 4 视口收据**：8 张图全部满足 `scrollW ≤ innerW && scrollH ≤ innerH` 且 dock 间隙 ≥10px；双主题 PNG + contact-sheet + JSON 落盘。这是「Agent 无法人工目检」场景下的质量兜底（usage-report.md:54,127）。
6. **deliver 原子性**：8/8 图交付收据均含规格与成品的 sha256/字节数；过程中渲染失败不会污染既有 HTML（本仓库未留半成品文件可佐证）。

---

## 8. 关键源码证据清单

**布局核心**
- `renderers/architecture/grid.mjs:1`（非自动布局声明）`;3-11`（默认网格常量）`;19-31`（定位公式）`;33-62`（网格校验）
- `renderers/architecture/render-architecture.mjs:62-80`（布局常量）`;93-108`（测量/动画步序）`;111-131`（boundary 包围盒）`;230-277`（标题避让）`;288-313`（32 轮收敛）`;1048-1074`（z 序）
- `renderers/sequence/render-sequence.mjs:24-51`（列/行常量）`;31-39`（column_fit）`;62-78`（参与者列）`;152-154`（时间轴下限）`;178-180`（y 界）`;241-256`（28px 行距）`;295-299`（宽度越界）
- `renderers/dataflow/render-dataflow.mjs:51-63`（泳道常量）`;92-106`（stage×row 定位）`;134-204`（校验）
- `renderers/workflow/render-workflow.mjs:47-57`（列网格常量）`;92-107`（定位）`;158-452`（校验）`;460-464`（spanForCols）

**走线几何**
- `renderers/shared/geometry.mjs:20-35`（rectsOverlap）`;37-52`（线段求交）`;54-73`（净空）`;194-256`（side 契约）`;340-400`（cleanFlowProblems 硬门禁）`;406-473`（showcase 禁交叉）`;480-530`（共走廊）`;585-673`（沿框借道）`;675-737`（路由预算）`;739-820`（节奏）`;822-869`（标签净空）`;877-890`（点规范化）`;1054-1120`（节奏桥）`;1125-1183`（端口展开）`;1243-1255`（标签落点）`;1305-1334`（修复提示）
- `renderers/architecture/render-architecture.mjs:651-672`（净空谓词）`;674-744`（side-aware 桥）`;746-820`（端口对齐）`;822-917`（auto 路由候选序）`;936-958`（pathCache）

**门禁体系**
- `renderers/shared/validator.mjs:6-26`（路径注解）`;38-86`（schema 校验 + supportedFixes）
- `renderers/shared/layout-report.mjs:3-40`（取整报告）
- `scripts/check-render-output.mjs:66-85`（single/finite/orthogonal）`;105`（阈值）`;121-133`（error/warning 分档）`;274`（ok 判定）`;621-650`（desktop readability）
- `renderers/shared/desktop-readability.mjs:1-26`（930px 模型 + 6px 下限）
- `bin/visual-check.mjs:9-19`（视口）`;42-50`（原子写）`;381-455`（投影字号）`;495-551`（observation）`;589-658`（诊断）`;660-684`（收据）`;690-825`（主流程）
- `bin/archify.mjs:173-196`（checker 诊断与修复映射）`;876-936`（snapshot→render→check）`;1067`（原子 rename）`;1487-1595`（validate）

**LGDL 对照**
- `packages/lgdl-layout/src/layered.ts:8-21`（Sugiyama 四阶段）`;108-132`（barycenter）`;209-210`（NODE_SEP/RANK_SEP）
- `packages/lgdl-router/src/index.ts:119-221`（routeEdge + quality）`;462-474`（交叉计数）`;523-555`（贴边长度）`;613-747`（A*）`;754-812`（折叠）

---

## 9. 标注为「推断」的内容汇总

1. **sequence viewBox 比例 ≤0.39**（第 2.2 节）：`docs/archify-usage-report.md:61` 记录的实测经验值；源码中无 0.39 字面常量。可验证的底层机制是 930px 可读宽模型 + 6px 投影下限 + 4 视口 containment；最终图以 0.454 通过，故 0.39 属更保守的迭代预算（推断其源于首屏垂直预算公式，未直接证实）。
2. **workflow「3-4 列仅 70px 间距」的概括措辞**（第 2.4、7 节）：70px 列距与 92px 节点重叠的复算有源码证据（`render-workflow.mjs:54-55`），但「3-4 列」「反复触发布局冲突」是对迭代过程的观察概括。
3. **architecture「层次/泳道/放射布局模式」**（第 2.1 节）：schema 仅支持 `mode:"grid"` 与自由坐标；「层次」由网格行实现属对 LGDL 用法的观察推断，非独立算法。
4. **首屏 chrome 高度约 322px、0.454 约束公式**（第 2.2 节）：由 sequence 收据的 scrollHeight=900、diagramWidth=1274 反推，未逐行追查 template.html 的完整盒模型。
5. **「安全列链仅 3-4 列」**（第 2.4 节）：由 colXs 间距与 nodeW 92 重叠复算推得，非源码注释。
