# Changelog

## 0.4.0（未发布）

**新特性：聚合边（group 间关系）**

- 🆕 edge 的 `from`/`to` 支持 **group id**：group→group、group→node、node→group
- 语义：组作为整体参与流向/依赖（不绑定组内节点）—— 架构分层、模块依赖、泳道间数据流的原生表达
- 校验：from/to 引用 node 或 group 均可；未知引用报错
- 布局：聚合边不参与节点布局（dagre 对 cluster 间边会崩，已过滤）
- SVG：紫色虚线箭头，从源组边框到目标组边框（`lgdl-aggregate-edge`）
- ASCII：水平（并排组 `──▶`）或垂直（上下组 `│` + `▼`）连接线
- `add-edge` CLI 同样支持 group id（校验在 core 层）

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
