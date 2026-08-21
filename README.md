# LGDL — Logical Graph Description Language

> 逻辑化的图描述语言 · Semantic-first diagram DSL for AI agents

**LGDL 是一门面向 AI Agent 的语义优先图表描述语言。** 它只描述图的「逻辑」（节点、关系、层级），从不描述「布局」（坐标、样式）。布局由确定性引擎自动完成，AI 修改图时只改逻辑，不碰布局——彻底告别「AI 来回调整图形布局」的低效循环。

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
│  语义 DSL（.sdg 文件）        │ ← 只有节点/关系/层级，没有坐标
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

## 🚀 快速开始 / Quick Start

> 开发中，v0.1 尚未发布

```bash
npm install -g @lgdl/cli    # 安装 CLI（待发布）

lgdl init my-diagram.sdg    # 初始化空图
lgdl render my-diagram.sdg -o out.svg  # 渲染（自动布局）
lgdl status my-diagram.sdg  # 输出文本化图结构 ← AI 读取当前图
```

### DSL 示例 / Example

```yaml
title: 用户登录流程
type: flowchart            # flowchart | mindmap | uml-class | arch | datastream

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
│   ├── core/          # DSL 解析、模型、校验（纯 TS，零依赖）
│   ├── layout/        # 布局引擎（确定性算法 + 局部重排）
│   ├── render/        # SVG/PNG 渲染器
│   ├── cli/           # lgdl 命令行
│   └── web/           # Web 工作台（React + React Flow）
├── docs/              # 设计文档、AI 集成指南
├── examples/          # 示例 .sdg 文件
└── README.md
```

---

## 📚 文档 / Docs

- [DSL 规范](docs/dsl-spec.md) — DSL Specification
- [AI Agent 集成指南](docs/ai-agent-guide.md) — AI Agent Integration Guide（待编写）

---

## 🗺️ 路线图 / Roadmap

| 版本 | 内容 |
|---|---|
| **v0.1** | DSL 解析器 + 层级布局引擎 + CLI（`init`/`render`/`add-node`/`add-edge`/`status`/`diff`）+ SVG 输出 |
| **v0.2** | 增量编辑协议完善 + Mermaid 导入导出 + 思维导图/流程图形状 |
| **v0.3** | Web 工作台（React + React Flow，左侧 DSL 右侧实时渲染） |
| **v0.4** | 更多图类型（UML、架构图、数据流）+ AI Agent 集成（MCP Server + Skill 文档） |

---

## 🤝 参与贡献 / Contributing

欢迎提 issue、PR。设计讨论见 [GitHub Discussions](https://github.com/THZSummer/LGDL/discussions)。

## 📄 License

[MIT](LICENSE)
