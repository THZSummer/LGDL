# Changelog

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
