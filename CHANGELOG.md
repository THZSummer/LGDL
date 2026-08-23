# Changelog

## 0.5.0 (2026-08-23)

**Web AI 助手（v0.5.0）**

- 🤖 **AI 助手面板**：左栏上下分栏（编辑器 40% / AI 60%，分隔条可拖、编辑器可一键收缩），对话生成新图 / 修改当前图，AI 回复渲染 LGDL 代码块（「应用」按钮，`parseLgdl` 校验门禁，失败红框列出错误）与增量操作块（「执行」按钮，逐条应用到当前图）
- 🔧 **共享操作层**（`core/operations.ts`）：结构化增量操作协议 `LgdlOperation`（add/remove/update × node/edge/group 共 9 种）+ `applyOperation`/`applyOperations`（批量、失败即停）；**CLI 全部 9 个增量命令重构为同一入口**——终端与 Web AI 行为严格一致，无第二套实现
- 🌐 **多厂商接入**（`ai/provider.ts`）：DeepSeek / Qwen / 火山方舟 / 腾讯混元 / OpenAI GPT 走 openai SDK（OpenAI 兼容端点），Claude 走 @anthropic-ai/sdk；**系统不内置任何 key**，用户手动填写、存 localStorage；支持自定义 baseURL（火山 coding/plan 端点）
- ⚙️ **设置面板**：AI 标题栏 ⚙ 按钮，选服务商 / 填 Key（可显隐）/ 选模型 / 自定义 baseURL，切换服务商自动预填默认模型
- 🎯 **提示词工程**（`ai/prompts.ts`）：LGDL 规范 system prompt（lgdl-web-cli 协议、可用调用、6 条硬性约束），AI 生成结果必须能通过校验
- 🚀 **预置操作滑轨**：17 个快捷操作（语法修复/自动优化/九种图类型创作/追加节点/整理分组等），点击即发送（含当前源码上下文注入），滚轮横滑
- ✅ **自动应用**：开关开启后 AI 回复中的代码块/操作块校验通过即自动写入编辑器
- 🛡️ **错误分类**：key 无效（401/403）/ 网络不通 / CORS 不允许 / 厂商 404 均给出明确中文提示
- 💻 **lgdl-web-cli 协议**：AI 通过 ```` ```lgdl-web-cli ```` 协议块操作图（`lgdl-web-cli status --doc main` / `lgdl-web-cli add-node --doc main --id x` …），**不直接写 LGDL 源码**；表达（普通文本）与执行（协议块）严格区分；agent 循环逐步执行（1~3 条/轮，结果反馈，失败即停，10 轮上限）
- 🔀 **双 CLI 分离**：终端 lgdl-cli（`--file` 磁盘文件）与 lgdl-web-cli（`--doc` 编辑器文档）物理分离；`core/commands.ts` 命令注册表（参数 schema / buildOperation / attrs/member 解析）为**两端业务逻辑唯一实现**，lgdl-cli（9 命令）与 lgdl-web-cli 均复用；`web/ai/web-cli.ts` 是协议解析器（仅 web 使用）
- 📊 **status / validate / init / convert**：`core/status.ts`（图结构文本）与 `core/commands.ts` 共用；lgdl-web-cli 支持 `validate`（语法校验）、`init`（默认图）、`convert --to mermaid/plantuml/json`（导出）

**Web AI 助手 · 协议升级与增强（同属 v0.5.0）**

- 🔄 **原生 function calling 协议**：从 markdown 围栏协议块升级为 LLM 原生工具调用（OpenAI `tool_calls` / Claude `tool_use`）——chat 文本（表达）与工具调用（执行）由 API 字段明确区分，不再靠 markdown 解析猜类型；工具结果以 `tool` 角色回传、失败反馈修正、agent 循环轮数上限可调（默认 1000）
- 🧰 **三平级工具**：`lgdl-web-cli`（图内容）/ `lgdl-web-op-cli`（UI 操作）/ `lgdl-web-fetch`（基础 web 获取，独立于任何 CLI）
- 🔍 **读多写少查询命令**（`core/queries.ts` 单一实现，CLI 与 Web 共享）：`doc-info` / `get-node` / `get-edge` / `find-node` / `list-node-kinds` / `list-diagram-types`；`init --type <类型>` 指定图类型模板（9 种）
- 🖱️ **lgdl-web-op-cli（UI 操作）**：复制源码 / 编辑器收缩展开 / 导出 SVG-PNG / 预览缩放-平移-重置 / 点击定位（编辑器同步跳转）/ 悬浮高亮（锚点）/ 切换示例 / 列出示例-图类型 / `next-actions`
- 💊 **next-actions 推荐胶囊**：AI 完成任务后可推荐 2-4 个下一步动作（label + prompt），以可点击胶囊卡片（独立消息类型 `next-actions`）展示在聊天框——点击即把动作作为用户指令发送，形成「AI 推荐 → 用户点选 → AI 执行」闭环
- 📖 **命令自文档化 `--help`**（clig.dev / GNU 规范）：`lgdl-web-cli <cmd> --help` / `help <cmd>` / 顶层 `--help`，`--help` 优先级最高（忽略其他参数与校验）；增量命令参数从 core `COMMANDS` 注册表动态生成（单一数据源，新增命令不用改文档）；`lgdl-web-op-cli` / `lgdl-web-fetch` 同步支持
- 🧠 **方法论自动加载**：使用指南 `README-CLI.md` 会话开始时由系统自动 fetch 注入 system prompt（战略层：工具分工/流程/陷阱）；命令用法 `--help` 按需查询（战术层）——不依赖 AI 调 fetch 读文档（治模型漏传 `--path`）
- 🎭 **操作助手定位**：AI 是 Web Workbench 网站操作助手——绘图过程适合时机用 op-cli 做页面交互（`preview-click`/`preview-hover`/`preview-reset`），让用户看得见、保持参与感；复制/导出等动作等用户要求再做
- 💻 **终端 lgdl-cli 同步**：19 个命令全部补 `--help` 示例（`Examples:` 段，clig.dev），`help [command]` 子命令；修复未知选项提示的旧前缀文案

**Web 工作台打磨**

- 示例切换器：滚动条隐藏不占布局、指针默认隐藏（hover/滚动才显示、橙色高对比）、两端 spacer 按首尾胶囊实际宽度计算使指针正中胶囊、边界 snap 改为吸附修正（不再 stay put）

## 0.4.0 (2026-08-23)

**Web 工作台：示例切换一步到位（滑动指针）**

- 🎛️ 示例切换行改为**紧凑轮盘**：区域宽度从"占满 header"固定为**最宽胶囊 × 2 + 间隙**（JS 实测写入 `--switcher-w`，约 296px），两端 spacer 缩到约半胶囊——滑动停稳后选中项约 1x 居中、左右各露出约 0.5x 相邻胶囊，滑轨占比显著变小
- 🎚️ 预览缩放：默认仍是 FitView（打开/切换图时整图适配），**最小缩放固定 50%**（此前下限 = 整图适配比例，大图可缩到 40% 以下看不清；若初始 FitView 已低于 50%，缩小时保持当前值不反向放大）
- 🐛 修复切换示例后缩放时背景跳变：`ZoomableSvg` 的滚轮监听只绑定一次，闭包捕获的是**首个示例的尺寸**——切到时序图后缩放，SVG 元素被设成旧图尺寸（如纵向 650×916 框住横向 960×530 的时序图），白色背景由横向矩形跳变为纵向矩形；改用 ref 持有最新尺寸
- 🚀 按钮归属调整：**复制源码**移到编辑器栏标题栏右上角，**导出 SVG / 导出 PNG**移到预览栏标题栏右上角（header 只留品牌 + 示例切换行）

- 🚀 示例下拉框改为**胶囊按钮行**：11 个示例全部平铺可见，点击即切换（一步完成，不再"打开下拉→选择"两步）
- 🎯 **滑动指针**：行中央固定指针线；横向滑动（普通滚轮自动转横滑 / 触控板 / Shift+滚轮）时，**指针下方的元素实时加光圈指示（跟随滑动变化）**，停稳后自动平滑吸附居中并正式选中
- 🐛 修复指针线钉在首个胶囊上：`.switcher-pointer` 原为滚动容器内的 absolute 元素——**absolute 在 overflow 滚动容器中会随内容一起滚动**，初始首个胶囊在中心、指针线也画在中心，滑动时两者一起移动，看起来"线一直跟着第一个元素"。指针线与淡出遮罩移到滚动容器外的 wrapper 上（固定在可视区，不随内容滚动）
- 🐛 移除切换示例后的"滚回可见"兜底 effect：它用瞬时 `scrollLeft` 赋值打断吸附的平滑滚动动画，与指针吸附竞争；改为只在区域尺寸变化（resize）后若选中项被挤出视口才滚回
- 🐛 修复滑动跳过元素：行两端用**内部 spacer**（flex-basis ≈ 半宽）撑出滑动空间，使**每个元素都能滚到指针中心**（此前第 2/3 个、倒数第 2/3 个元素离行端太近、永远无法被指针指到，滑动时被跳过）；吸附几何抽为纯函数 `computeSnap` 并加回归测试（11 个元素全滚动位置可达）
- 🐛 修复百分比 padding 撑爆 header：两端空间原用 `padding-inline: calc(50% - 62px)`（基于 header 宽度），把右侧"复制源码 / 导出 SVG / 导出 PNG"挤出画布——改为内部 spacer 元素（基于本区域宽度、参与 flex 布局与滚动）
- 🐛 修复选中/未选中效果不一致：去掉选中态 `font-weight` 加粗（选中时宽度变化导致整行跳动），胶囊统一 `min-width` 对齐
- 空间不足时该区域横向滑动：细滚动条 + 左右淡出遮罩提示可滑动；点击当前胶囊同样滚到指针下，保持「指针所指 = 当前项」


**Web 工作台：预览点击定位源码（双向跳转）**

- 🖱️ 预览中**左键单击任意元素**（节点 / 边 / 分组 / 泳道 / 类成员行 / 时序参与者与消息 / 甘特条与依赖），编辑器自动滚动并居中到对应源码行（光标同时落到该行）
- 渲染器为每个交互元素输出 `data-lgdl-loc` 源映射（`nodes[i]` / `edges[i]` / `groups[i]` / `nodes[i].members[j]`），静态 SVG/PNG 输出不受影响
- 定位逻辑抽为 `packages/web/src/locate.ts` 并修复：嵌套 `members:` 项不再被误计为 section 项（此前 `nodes[1]` 会跳到节点 0 的成员行）；深层路径（`nodes[0].members[1].kind`）回退到最近可解析前缀；块级成员列表按项定位
- 可点击元素光标为手型；状态栏提示「左键点击元素定位源码」


**渲染改进：mindmap 视觉一致性（评审驱动）**

- 🎨 mindmap 不再使用 flowchart 概念形状：`decision` 菱形、`start/end` 胶囊在思维导图语义中无意义，全部统一为圆角矩形（识图评审指出 RAG/Agent 菱形突兀）
- 🎨 布局同步：mindmap 节点统一尺寸（160×56），径向布局更均匀
- 🎨 字号层级加大区分度：中心主题 20px → 一级 15px → 二级 12px（原 17/14/12 层级感不足）
- ASCII 渲染同步（mindmap 下所有节点普通方框，无 `< >` 菱形标记）


**新特性：聚合边（group 间关系）**

- 🆕 edge 的 `from`/`to` 支持 **group id**：group→group、group→node、node→group
- 语义：组作为整体参与流向/依赖（不绑定组内节点）—— 架构分层、模块依赖、泳道间数据流的原生表达
- 校验：from/to 引用 node 或 group 均可；未知引用报错
- 布局：聚合边不参与节点布局（dagre 对 cluster 间边会崩，已过滤）
- SVG：紫色虚线箭头，从源组边框到目标组边框（`lgdl-aggregate-edge`）
- ASCII：水平（并排组 `──▶`）或垂直（上下组 `│` + `▼`）连接线
- `add-edge` CLI 同样支持 group id（校验在 core 层）

**新特性：kind 差异显性化 —— 类成员结构化字段 `members`**

- 🆕 node 新增显性字段 **`members`**：结构化类成员对象数组，替代 `label` 里 `\n` 拼接的隐式约定
- 成员结构：`{kind: attribute|method, name, visibility: public|private|protected|package, type, params}`
- 渲染器零猜测：不再靠 `(` 判断属性/方法、不再解析 `+/-` 记号；可见性符号由 `VIS_SYMBOL` 统一映射（core 单一来源，layout/render 共用）
- 校验（全部 error）：`members` 仅限 `kind: entity`，图类型限 `uml-class` 与 `er`（er 实体属性同样用 members，无可见性概念）；`member.kind`/`member.name` 必填；`params` 仅 method；`visibility` 枚举
- 布局/渲染：er 实体尺寸按属性行自适应，圆柱内显示名称+属性行
- 🐛 mermaid-import：修复 CJK 实体名属性从未被导入的 bug（`current` 已是 id，反查失败）
- 布局：类卡片尺寸按成员内容自适应（高度 = 32 + 行数×18 + 16；宽度跟随最长行）
- CLI：`add-node --member kind=..,name=..[,visibility=..][,type=..][,params=".."]`（可重复）、`update-node --member-add / --member-remove`
- 解析器：支持任意层级的块级对象列表（此前仅顶层，`members` 依赖此能力）
- ⚠️ **破坏性**：旧写法不再兼容——实体 `label` 内 `\n` 拼成员被校验拒绝，必须用 `members`；渲染器已删除 label-\n 回退

**新特性：边多重性显性化 —— `cardinalityFrom` / `cardinalityTo`**

- 🆕 edge 新增显性字段 **`cardinalityFrom`** / **`cardinalityTo`**：ER/UML 关联两端多重性，`label` 只放关系名
- 渲染器零猜测：不再用正则从 `label: "拥有 1..*"` 拆基数；关系名标在中点、两端基数各标在对应实体端（er 与 uml-class 均生效）
- 校验：两字段必须是字符串（`1` 也按字符串处理，与 id 同理）；手建文档传数字报 error
- CLI：`add-edge --cardinality-from <v> --cardinality-to <v>`、`update-edge` 同参；`status` 边输出 `(1..*)`
- 导入/导出：mermaid-import 的 `||--o{` 连接符映射到新字段、实体属性写入 `members`；mermaid er 导出只读显性字段
- ⚠️ **破坏性**：旧写法不再兼容——`label` 内嵌基数、`attrs.cardinality` 都被校验拒绝，必须用 `cardinalityFrom`/`cardinalityTo`；渲染器已删除正则拆分回退

## 0.3.0 (2026-08-22)

**新特性：嵌套分组（P0）**

- 🆕 group 支持嵌套：`contains` 可引用 node id **或 group id**（订单核心包住支付网关）
- 校验新增：group id 唯一性、未知成员（node/group）、节点/group 不能同属两个组、包含环检测（直接/间接自包含都是 error）
- `add-group --contains` 接受 group id；`remove-group` 自动从父组 contains 摘除
- 🐛 解析器支持**行内注释**（`contains: [a, b] # 成员`），引号内的 `#` 保留
- ASCII 渲染器完整支持 group：盒子边框、边框标题、嵌套盒子（外层包内层）、兄弟 group 自动分配到独立列带（不重叠）
- 跨列连接线：L 形分支 + 箭头穿过 group 边框（`└───┐` / `└───▼`），边框在连接线处断开让位
- SVG 渲染器同步支持嵌套 group（外层虚线框包住内层）

```bash
npm install -g @lgdl/cli
```

## 0.2.0 (2026-08-22)

**新特性：更多格式转换器**

- 🆕 `convert --as plantuml`：PlantUML 活动图语法（start/if-else/stop）
- 🆕 `convert --as json`：结构化 JSON 输出
- 转换器插件化注册表验证：加格式零 CLI 改动
- `--as` 可选值提示动态化（自动列出 mermaid/plantuml/json）

```bash
npm install -g @lgdl/cli
```

## 0.1.0 (2026-08-22)

**首个公开发布版本 —— 已发布到 npm！**

```bash
npm install -g @lgdl/cli
```

发布包：`@lgdl/core` `@lgdl/layout` `@lgdl/render` `@lgdl/cli`

### 核心能力

- **9 种图类型**：flowchart / mindmap / sequence / uml-class / arch / datastream / er / state / gantt
- **语义优先 DSL（.lgdl）**：只描述节点/关系/层级，布局由引擎自动完成
- **attrs 扩展属性**：图专属字段的逃生舱（如甘特工期、ER 基数）
- **严格校验**：所有违规（未知 kind、坏引用、重复 id）都报 error，不静默忽略

### CLI（@lgdl/cli）

- 14 个命令：`init` / `render` / `status` / `convert` / `import` / 增量编辑系列
- 统一的 `--file` 参数（无位置参数，AI 友好）
- `render --format svg|ascii`：SVG 或终端 ASCII 图（含分叉、边标签）
- `convert --as mermaid`：导出 Mermaid（插件化格式注册表）
- `import --from mermaid`：从 Mermaid 迁移
- 友好的错误处理：错误自动显示该命令 help + 可选值

### 渲染

- 确定性布局（dagre 层级 / 径向树 / 时序 / 泳道 / 甘特）
- SVG / PNG / ASCII 三种输出
- 大图（>120 节点）自动降级为网格布局保证性能

### Web 工作台

- 在线编辑器：https://thzsummer.github.io/LGDL/
- 语法高亮 + IntelliSense 补全 + 错误诊断（红色波浪线/遮罩/跳转）
- 导出 SVG / PNG
