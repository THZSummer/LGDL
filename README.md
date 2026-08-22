# LGDL — Logical Graph Description Language

> 逻辑化的图描述语言 · Semantic-first diagram language for AI agents

**LGDL（Logical Graph Description Language）是一门面向 AI Agent 的语义优先图表描述语言。** 它只描述图的「逻辑」（节点、关系、层级），从不描述「布局」（坐标、样式）。布局由确定性引擎自动完成，AI 修改图时只改逻辑，不碰布局——彻底告别「AI 来回调整图形布局」的低效循环。

**LGDL is a semantic-first diagram description language built for AI agents.** It describes only the *logic* of a diagram (nodes, relations, hierarchy) — never the *layout* (coordinates, styles). Layout is handled automatically by a deterministic engine, so AI edits change only the logic, never the layout. No more endless back-and-forth fiddling with diagram layout.

---

## 🎯 为什么需要 LGDL / Why LGDL?

**痛点 / The problem:**

- AI 生成图时，用户需要反复描述，AI 很难理解真实意图，浪费时间
- AI 修改图时，经常破坏已有布局，改一处动全身
- 布局是视觉问题，逻辑才是业务问题——AI 应该处理逻辑，引擎负责呈现

**解决思路 / The solution:**

```
┌─────────────────────────────┐
|  语义 LGDL（.lgdl 文件）     │ ← 只有节点/关系/层级，没有坐标
│  nodes: [{id, label, kind}]  │
│  edges: [{from, to, label}]  │
└─────────────────────────────┘
            │
            ▼
┌─────────────────────────────┐
│  布局引擎（确定性算法）        │ ← 自动排版，同样的输入永远同样的输出
└─────────────────────────────┘
            │
            ▼
┌─────────────────────────────┐
│  渲染输出 SVG / PNG / Mermaid │
└─────────────────────────────┘
```

**增量编辑协议（核心创新）:**

AI 的每次修改都是**增量 patch**（`add-node` / `remove-node` / `update-node` / `add-edge` / `remove-edge`），只重算受影响区域，已有节点位置保持稳定。AI 永远不会重写整个文件。

---

## 🖼️ 效果展示 / Gallery

> 🚀 **在线体验 Web 工作台**：[LGDL Workbench](https://thzsummer.github.io/LGDL/) —— 浏览器里编辑源码、实时渲染、导出 SVG/PNG

一种 LGDL 语言，九种图——全部由 `lgdl render` 自动布局生成，无任何手工排版：

| flowchart 流程图 | mindmap 思维导图 | sequence 时序图 |
|---|---|---|
| <p align="center"><img src="examples/login-flow.png" width="280"/><br/>[📄 源码](examples/login-flow.lgdl)</p> | <p align="center"><img src="examples/mindmap.png" width="280"/><br/>[📄 源码](examples/mindmap.lgdl)</p> | <p align="center"><img src="examples/sequence.png" width="280"/><br/>[📄 源码](examples/sequence.lgdl)</p> |

| uml-class 类图 | arch 架构图 | datastream 数据流 |
|---|---|---|
| <p align="center"><img src="examples/uml-class.png" width="280"/><br/>[📄 源码](examples/uml-class.lgdl)</p> | <p align="center"><img src="examples/architecture.png" width="280"/><br/>[📄 源码](examples/architecture.lgdl)</p> | <p align="center"><img src="examples/datastream.png" width="280"/><br/>[📄 源码](examples/datastream.lgdl)</p> |

| er ER 图 | state 状态机 | gantt 甘特图 |
|---|---|---|
| <p align="center"><img src="examples/er.png" width="280"/><br/>[📄 源码](examples/er.lgdl)</p> | <p align="center"><img src="examples/state.png" width="280"/><br/>[📄 源码](examples/state.lgdl)</p> | <p align="center"><img src="examples/gantt.png" width="280"/><br/>[📄 源码](examples/gantt.lgdl)</p> |

---

## 🚀 快速开始 / Quick Start

> 📦 已发布到 npm！`npm install -g @lgdl/cli` 即可使用

```bash
npm install -g @lgdl/cli     # 安装 CLI

lgdl init --file my-diagram.lgdl    # 初始化空图
lgdl render --file my-diagram.lgdl -o out.svg  # 渲染（自动布局）
lgdl status --file my-diagram.lgdl  # 输出文本化图结构 ← AI 读取当前图
```

### LGDL 示例 / Example

```yaml
title: 用户登录流程
type: flowchart            # flowchart | mindmap | uml-class | arch | datastream | er | state | gantt | sequence

nodes:
  - id: start
    label: 用户访问
    kind: start
  - id: login
    label: 输入账号密码
    kind: process
  - id: verify
    label: 验证凭据
    kind: decision

edges:
  - from: start
    to: login
    label: 打开页面
  - from: login
    to: verify
  - from: verify
    to: ok
    label: 通过
  - from: verify
    to: fail
    label: 失败

groups:
  - id: frontend
    label: 前端层
    contains: [start, login]
  - id: backend
    label: 后端层
    contains: [verify]
```

---

## 🏗️ 架构 / Architecture

```
LGDL/
├── packages/
│   ├── core/          # LGDL 解析、模型、校验（纯 TS，零依赖）
│   ├── layout/        # 布局引擎（确定性算法 + 局部重排）
│   ├── render/        # SVG/PNG 渲染器
│   ├── cli/           # lgdl 命令行
│   └── web/           # Web 工作台（React + React Flow）
├── docs/              # 设计文档、AI 集成指南
├── examples/          # 示例 .lgdl 文件
└── README.md
```

---

## 📚 文档 / Docs

- [LGDL 语言规范](docs/lgdl-spec.md) — LGDL Specification
- [CLI 使用指南](docs/cli-guide.md) — CLI Guide（命令参考、AI Agent 工作流）
- [AI Agent 使用指南](docs/ai-agent-guide.md) — AI Agent Guide（教 AI 用 LGDL 画图，含三步工作流）

---

## 🗺️ 路线图 / Roadmap

| 版本 | 内容 |
|---|---|
| **v0.1** | ✅ LGDL 解析器 + 层级布局引擎 + CLI（`init`/`render`/`status`/增量编辑）+ SVG 输出 |
| **v0.2** | ✅ 增量编辑协议 + 9 种图类型（flowchart/mindmap/sequence/uml-class/datastream/arch/er/state/gantt） |
| **v0.3** | ✅ attrs 扩展属性（逃生舱）+ ER/状态机/甘特图布局渲染 |
| **v0.4** | ⬜ Web 工作台（React + React Flow）+ Mermaid 导入导出 + 局部重排 + MCP Server |

---

## 🤝 参与贡献 / Contributing

欢迎提 issue、PR。设计讨论见 [GitHub Discussions](https://github.com/THZSummer/LGDL/discussions)。

## 📄 License

[MIT](LICENSE)
