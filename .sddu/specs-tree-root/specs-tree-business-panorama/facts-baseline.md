# 事实基线（What 层）— LGDL 业务全景素材挖掘

> Feature: LGDL 业务全景（specs-tree-business-panorama）
> 采集: sddu-discovery · 2026-08-30
> 用途: 访谈的事实锚点。只记录 What 与出处，Why 一律留待访谈（见 interview-guide.md）。
> 约束: 本次不做存量文档漂移校正，漂移仅作为事实记录（§3.1、§3.5）。

## 1. 版本演进时间线（来源: CHANGELOG.md）

| 版本 | 日期 | What（一句话） | 锚点 |
|---|---|---|---|
| v0.1.0 | 2026-08-22 | 首个公开发布到 npm（@lgdl/core/layout/render/cli）：9 种图类型、语义优先 DSL、attrs 逃生舱、严格校验、CLI 14 命令、SVG/PNG/ASCII、dagre 布局、Web 工作台上线 | CHANGELOG.md:187-223 |
| v0.2.0 | 2026-08-22 | `convert --as plantuml/json`，转换器插件化注册表 | CHANGELOG.md:174-185 |
| v0.3.0 | 2026-08-22 | 嵌套分组（P0）、行内注释、ASCII/SVG group 渲染 | CHANGELOG.md:158-172 |
| v0.4.0 | 2026-08-23 | 聚合边（group 间关系）；kind 差异显性化（`members` / `cardinalityFrom·To`，两处标注"破坏性：旧写法不再兼容"）；Web 工作台打磨（滑动指针/预览点击定位源码/mindmap 视觉一致性） | CHANGELOG.md:91-157 |
| v0.5.0 | 2026-08-23 | Web AI 助手：命令模式 → 原生 function calling 三平级工具、validate 门禁、双 CLI 分离 + core 命令注册表单一实现、两层知识（方法论自动加载 + `--help` 自文档化）、多厂商接入 | CHANGELOG.md:59-89; docs/v0.5-web-ai.md |
| v0.6.0（Unreleased） | 开发中 | ① 布局引擎 dagre→elkjs→彻底自研（Sugiyama 框架、零依赖、web 打包 20s→6s）② group-as-node 模型统一 ③ AI 实战 + 视觉评审闭环（pi 画 9 种图，沉淀 bugs.md 与示例三件套）④ 正交绕障布线/标签避让/甘特自适应刻度 | CHANGELOG.md:3-57 |

**观察（事实）**：v0.1–v0.3 三个版本同日发布（2026-08-22），v0.4–v0.5 同日（2026-08-23）——约一周内 5 个版本 + 1 个进行中版本。版本号切分逻辑本身是访谈素材（G5-Q1）。

## 2. 三个关键转折点（What 事实定位）

1. **先 CLI 后 Web**：v0.1 同日发布 CLI（npm）与 Web 工作台（github.io），但 v0.1–v0.4 的能力主线（9 图类型、增量编辑、显性字段、严格校验）全部长在 CLI/core 上；Web 到 v0.5 才成为"AI 助手"的主战场。
2. **v0.5 做 AI 助手**：v0.4 显性化改造（members/cardinality + 去兼容包袱）刚落地，v0.5 同日转向 Web AI；早期设计为 markdown 围栏协议块，最终实现升级为原生 function calling（docs/v0.5-web-ai.md §0"实现演进"表明确记录了这次替换）。
3. **v0.6 自研布局**：单个 Unreleased 段内连续两次引擎迁移：dagre → elkjs（双引擎可回退）→ 彻底自研（删 dagre/elkjs、删 config.ts、零第三方依赖）；同段完成 group-as-node 模型统一与 AI 视觉评审驱动的渲染修复（正交绕障/标签避让）。

## 3. 带来源锚点的事实清单

### 3.1 定位与哲学（访谈目标 G1 / G4 锚点）
- README.md:3 副标题 "Semantic-first diagram language for AI agents"；README.md:5-7 双语定位："只描述图的「逻辑」……从不描述「布局」……彻底告别「AI 来回调整图形布局」的低效循环"
- design.md:12 语义/呈现解耦的原始理由："AI 擅长理解语义、生成逻辑；不擅长（也不应该）计算视觉布局"
- design.md:73 产品哲学最直接原文："LGDL 的消费方是 **CLI 操作的 AI**，不是手写语法的开发者——语法不为「手写友好」妥协，为「显性、零猜测」设计"
- design.md:29 "每次渲染都是全量确定性布局（不缓存、不手工调坐标）——语义不变则输出不变"
- README.md:158 "AI 的每次修改都是增量 patch……AI 永远不会重写整个文件"
- README.md:177-186 "球链网状算法"物理想象（球=node，绳=edge）；同段声明分层图用 Sugiyama 框架自研实现、零 dagre/elkjs 依赖
- **漂移事实（仅记录）**：design.md:33 "默认布局算法：elkjs……config.ts 可切回 dagre"——config.ts 已在 v0.6 删除（CHANGELOG.md:11-12）

### 3.2 严格校验 / 不留兼容包袱（G4 锚点）
- v0.1 即确立："严格校验：所有违规……都报 error，不静默忽略"（CHANGELOG.md:202）
- CHANGELOG.md:147 "⚠️ 破坏性：旧写法不再兼容——实体 label 内 \n 拼成员被校验拒绝"；CHANGELOG.md:156 同款（cardinality）
- README.md:72 "无警告级静默降级……旧写法……全部拒绝并给出可定位的报错（nodes[3].id 等路径）"

### 3.3 AI 协作设计（G3 / G4 锚点）
- "AI 不直接写 LGDL 源码——源码只由命令执行产生"（README.md:90；docs/v0.5-web-ai.md:85）
- 三平级工具、两层知识、op-cli 定位"让用户看得见、保持参与感"（README.md:89-97；docs/v0.5-web-ai.md:16,26-29）
- 双 CLI 分离 + core/commands.ts 单一实现（CHANGELOG.md:72；docs/v0.5-web-ai.md:114-120）
- AI 全流程演练：pi（DeepSeek V4）仅用 lgdl-cli 构建 9 种图 + 视觉模型评审，沉淀 bugs.md 与示例三件套（CHANGELOG.md:47-49；README.md:35-39）

### 3.4 竞品与生态（G2 锚点——存量文档几乎没有直接对比陈述）
- 存在的连接点只有工程性互操作：`convert --as mermaid/plantuml/json`、`import --from mermaid`（CHANGELOG.md:209-210；README.md:155-156）
- **未发现**任何 "vs Mermaid / PlantUML / Graphviz / D2 取舍" 的文档段落 → 竞品对比的 Why 完全依赖访谈挖掘
- docs/research/ 仅有 edge-routing/ 一个目录 → 与 v0.6 自研正交布线相关，可作"自研 vs 复用"的调研证据线索

### 3.5 结构性事实（差异 / 异常点，均仅记录不处理）
- **router 包缺席门面**：packages/router/package.json = `@lgdl/router` v0.5.0 — "LGDL orthogonal edge router (A* grid + shape-border anchoring), pure geometry, no rendering"；README 架构图（README.md:164-175）只列 core/layout/render/cli/web 五包。v0.6 CHANGELOG 记载正交布线（orthogonalize）实现在 packages/render 内——router 包与 render 的关系是待澄清事实（可作 G5 追问线索）
- 门面滞后：README.md:57 特性章节标题仍为 "v0.4.0 核心特性"，而门面顶部宣称 v0.5.0 已定型（README.md:9）
- docs/reviews-2026-08-24/ 已被 CHANGELOG/README 引用；docs/reviews-2026-08-28/ 存在但尚未在任何叙事文档中出现
- 测试规模自述："core 314 / render 21 / web 107 全绿"（CHANGELOG.md:15）

## 4. 待访谈填充
所有 Why 层结论（决策动机、取舍、竞品评估、场景假设、版本叙事）按 interview-guide.md 五组问题访谈后回填本 Feature 的 discovery 产物。
