# LGDL CLI 使用指南

`lgdl` 是 LGDL 的命令行工具——面向人、脚本和 AI Agent 的统一入口。

## 安装

> 待发布 npm 包，当前从源码运行：

```bash
cd packages/cli
npm run build
node dist/cli.js --help        # 或 npm link 后直接用 lgdl
```

## 全局参数

```bash
lgdl --help       # 查看所有命令
lgdl --version    # 查看版本
```

---

## 命令总览

| 命令 | 用途 | AI Agent 常用度 |
|---|---|---|
| `lgdl init --file <file>` | 创建空图文件 | ⭐ |
| `lgdl render --file <file>` | 渲染为 SVG（自动布局） | ⭐⭐⭐ |
| `lgdl status --file <file>` | 输出文本化图结构 | ⭐⭐⭐ |
| `lgdl export-mermaid --file <file>` | 导出 Mermaid 语法（兼容生态） | ⭐⭐ |
| `lgdl import-mermaid --file <file>` | 从 Mermaid 导入（迁移） | ⭐⭐ |
| `lgdl add-node --file <file>` | 加节点（增量，支持 attrs） | ⭐⭐⭐ |
| `lgdl remove-node --file <file>` | 删节点（自动清理关联边） | ⭐⭐⭐ |
| `lgdl update-node --file <file>` | 改节点 label/kind/attrs | ⭐⭐ |
| `lgdl add-edge --file <file>` | 加边（增量，支持 attrs） | ⭐⭐⭐ |
| `lgdl update-edge --file <file>` | 改边 label/attrs | ⭐⭐ |
| `lgdl remove-edge --file <file>` | 删边 | ⭐⭐ |
| `lgdl add-group --file <file>` | 加分组（泳道/分区） | ⭐⭐ |
| `lgdl remove-group --file <file>` | 删分组 | ⭐ |

---

## 详细说明

### `lgdl init --file <file>`

创建包含最小模板的空图文件。

```bash
lgdl init --file my-diagram.lgdl
# ✓ initialized my-diagram.lgdl
```

### `lgdl render --file <file> [-o out.svg] [--format svg|ascii]`

解析 `.lgdl` 文件 → 自动布局 → 输出 SVG（默认）或 ASCII 图。

```bash
lgdl render --file my-diagram.lgdl                    # 输出到 out.svg
lgdl render --file my-diagram.lgdl -o diagram.svg     # 指定输出文件
lgdl render --file my-diagram.lgdl --format ascii     # 终端直接显示 ASCII 图
# ✓ rendered my-diagram.lgdl -> diagram.svg (370x612, 5 nodes, 4 edges)
```

**`--format ascii`**：输出纯文本图（box-drawing 字符），适合终端、CI 日志、不支持图片的环境，也是 AI Agent 在终端「看图」的方式：

```
╭──────────╮
│  用户访问 │
╰──────────╯
      │
▼
┌──────────────┐
│  输入账号密码 │
└──────────────┘
```

- 布局是**确定性**的：同样的输入永远同样的输出
- 若文件有校验错误，渲染会失败并列出问题

### `lgdl status --file <file>`

把图的结构输出为**纯文本**——这是 AI Agent 读图的主要方式。

```bash
lgdl status --file my-diagram.lgdl
```

输出格式：

```
# 用户登录流程 [flowchart]      ← 标题 [图类型]

## nodes
  start (用户访问) :start       ← id (label) :kind（kind 为 process 时省略）
  login (输入账号密码)

## edges
  start -> login [打开页面]     ← from -> to [label]
  verify -> ok [通过]

## groups
  frontend (前端层): start, login   ← group id (label): 成员列表
```

### 增量编辑命令（核心）

所有增量命令都遵循同一模式：**读文件 → 修改 → 校验 → 写回**。AI Agent 通过这些命令精确修改图，**绝不重写整个文件**。

#### `lgdl add-node --file <file> --id <id> [--label <label>] [--kind <kind>] [--group <group>] [--attrs <key=value>]`

```bash
lgdl add-node --file my-diagram.lgdl --id register --label "注册账号" --kind process
# ✓ added node "register" (注册账号) :process
#   (saved my-diagram.lgdl)

# 加入分组
lgdl add-node --file my-diagram.lgdl --id register --group frontend

# 带扩展属性（甘特图任务：起始日 + 工期）
lgdl add-node --file my-diagram.lgdl --id dev --label "开发" --attrs start=6 --attrs duration=8
```

`--kind` 可选值：`start` `end` `process` `decision` `entity` `note` `state` `milestone`（默认 `process`）

**`--attrs` 扩展属性**：可重复传多个 `key=value`，自动识别类型：
- 数字：`--attrs start=6` → `start: 6`
- 布尔：`--attrs done=true` → `done: true`
- 字符串：`--attrs name="a b"` → `name: "a b"`

#### `lgdl remove-node --file <file> --id <id>`

```bash
lgdl remove-node --file my-diagram.lgdl --id register
# ✓ removed node "register" and 2 attached edge(s)
```

⚠️ 删节点会**自动删除所有关联的边**，并把它从分组中移除。

#### `lgdl update-node --file <file> --id <id> [--label <label>] [--kind <kind>] [--attrs <key=value>]`

```bash
lgdl update-node --file my-diagram.lgdl --id register --label "新用户注册"
lgdl update-node --file my-diagram.lgdl --id verify --kind decision
lgdl update-node --file my-diagram.lgdl --id dev --attrs progress=0.5   # 合并进 attrs
```

#### `lgdl add-edge --file <file> --from <id> --to <id> [--label <label>] [--attrs <key=value>]`

```bash
lgdl add-edge --file my-diagram.lgdl --from login --to register --label "没有账号？"
# ✓ added edge login -> register [没有账号？]

# ER 图：带关系基数
lgdl add-edge --file my-diagram.lgdl --from user --to order --label "拥有" --attrs cardinality="1..*"
```

⚠️ 不支持自环（from === to），重复边会报错。

#### `lgdl update-edge --file <file> --from <id> --to <id> [--label <label>] [--attrs <key=value>]`

```bash
lgdl update-edge --file my-diagram.lgdl --from user --to order --label "拥有多个"
lgdl update-edge --file my-diagram.lgdl --from user --to order --attrs cardinality="0..*"
```

#### `lgdl remove-edge --file <file> --from <id> --to <id>`

```bash
lgdl remove-edge --file my-diagram.lgdl --from verify --to fail
# ✓ removed edge verify -> fail
```

#### `lgdl add-group --file <file> --id <id> [--label <label>] [--contains <ids>]`

```bash
# 创建分组（泳道/分区），可指定初始成员
lgdl add-group --file my-diagram.lgdl --id frontend --label "前端层" --contains start,login
# ✓ added group "frontend" (前端层) with 2 member(s)
```

#### `lgdl remove-group --file <file> --id <id>`

```bash
lgdl remove-group --file my-diagram.lgdl --id frontend
# ✓ removed group "frontend"
```

⚠️ 删除分组不会删除其中的节点，节点只是脱离分组。

#### `lgdl export-mermaid --file <file> [-o out.mmd]`

把 LGDL 图导出为 **Mermaid 语法**，兼容 Mermaid Live Editor / mermaid.js 生态。

```bash
lgdl export-mermaid --file my-diagram.lgdl              # 输出到 stdout
lgdl export-mermaid --file my-diagram.lgdl -o out.mmd   # 写入文件
# ✓ exported my-diagram.lgdl -> out.mmd (flowchart)
```

**类型映射**：`flowchart`/`mindmap`/`sequence`/`er`/`state`/`gantt` 有专属 Mermaid 语法；`uml-class`/`arch`/`datastream` 降级为 flowchart 格式。

**用途**：把 LGDL 图贴到 GitHub README（Mermaid 原生渲染）、Typora、Notion 等支持 Mermaid 的地方。

#### `lgdl import-mermaid --file <file> --output out.lgdl`

把 Mermaid 语法导入为 LGDL 文件（迁移存量图）。

```bash
lgdl import-mermaid --file existing.mmd --output new.lgdl
# ✓ imported existing.mmd -> new.lgdl (flowchart, 5 nodes, 4 edges)
```

**支持**：`flowchart`/`sequenceDiagram`/`mindmap`/`stateDiagram-v2`/`erDiagram`/`gantt` 六种 Mermaid 方言。

**注意**：中文实体名（ER 图）会转成合法 id（label 保留中文）；不支持的 Mermaid 类型（如 `pie`）会报错。

---

## AI Agent 工作流示例

典型的「读图 → 改图 → 渲染」闭环：

```bash
# 1. 读图（AI 理解当前结构）
lgdl status --file my-diagram.lgdl

# 2. 增量修改（一次一步，不重写文件）
lgdl add-node --file my-diagram.lgdl --id register --label "注册账号"
lgdl add-edge --file my-diagram.lgdl --from login --to register --label "没有账号？"
lgdl update-node --file my-diagram.lgdl --id register --kind decision

# 3. 渲染成图
lgdl render --file my-diagram.lgdl -o result.svg
```

---

## 退出码

| 退出码 | 含义 |
|---|---|
| `0` | 成功 |
| `1` | 失败（文件不存在 / 校验错误 / 参数错误） |

## 输出约定

- 成功信息以 `✓` 开头
- 错误信息以 `✖` 开头（写入 stderr）
- 校验警告以 `⚠` 开头（不阻断执行）
- `status` 的纯文本输出**可直接被 AI 解析**，无需额外格式化
