# Changelog

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
