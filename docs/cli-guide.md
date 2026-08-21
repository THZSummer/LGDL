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
| `lgdl init <file>` | 创建空图文件 | ⭐ |
| `lgdl render <file>` | 渲染为 SVG（自动布局） | ⭐⭐⭐ |
| `lgdl status <file>` | 输出文本化图结构 | ⭐⭐⭐ |
| `lgdl add-node <file>` | 加节点（增量） | ⭐⭐⭐ |
| `lgdl remove-node <file>` | 删节点（自动清理关联边） | ⭐⭐⭐ |
| `lgdl update-node <file>` | 改节点 label/kind | ⭐⭐ |
| `lgdl add-edge <file>` | 加边（增量） | ⭐⭐⭐ |
| `lgdl remove-edge <file>` | 删边 | ⭐⭐ |

---

## 详细说明

### `lgdl init <file>`

创建包含最小模板的空图文件。

```bash
lgdl init my-diagram.lgdl
# ✓ initialized my-diagram.lgdl
```

### `lgdl render <file> [-o out.svg]`

解析 `.lgdl` 文件 → 自动布局 → 输出 SVG。

```bash
lgdl render my-diagram.lgdl                    # 输出到 out.svg
lgdl render my-diagram.lgdl -o diagram.svg     # 指定输出文件
# ✓ rendered my-diagram.lgdl -> diagram.svg (370x612, 5 nodes, 4 edges)
```

- 布局是**确定性**的：同样的输入永远同样的输出
- 若文件有校验错误，渲染会失败并列出问题

### `lgdl status <file>`

把图的结构输出为**纯文本**——这是 AI Agent 读图的主要方式。

```bash
lgdl status my-diagram.lgdl
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

#### `lgdl add-node <file> --id <id> [--label <label>] [--kind <kind>] [--group <group>]`

```bash
lgdl add-node my-diagram.lgdl --id register --label "注册账号" --kind process
# ✓ added node "register" (注册账号) :process
#   (saved my-diagram.lgdl)

# 加入分组
lgdl add-node my-diagram.lgdl --id register --group frontend
```

`--kind` 可选值：`start` `end` `process` `decision` `entity` `note` `state` `milestone`（默认 `process`）

#### `lgdl remove-node <file> --id <id>`

```bash
lgdl remove-node my-diagram.lgdl --id register
# ✓ removed node "register" and 2 attached edge(s)
```

⚠️ 删节点会**自动删除所有关联的边**，并把它从分组中移除。

#### `lgdl update-node <file> --id <id> [--label <label>] [--kind <kind>]`

```bash
lgdl update-node my-diagram.lgdl --id register --label "新用户注册"
lgdl update-node my-diagram.lgdl --id verify --kind decision
```

#### `lgdl add-edge <file> --from <id> --to <id> [--label <label>]`

```bash
lgdl add-edge my-diagram.lgdl --from login --to register --label "没有账号？"
# ✓ added edge login -> register [没有账号？]
```

⚠️ 不支持自环（from === to），重复边会报错。

#### `lgdl remove-edge <file> --from <id> --to <id>`

```bash
lgdl remove-edge my-diagram.lgdl --from verify --to fail
# ✓ removed edge verify -> fail
```

---

## AI Agent 工作流示例

典型的「读图 → 改图 → 渲染」闭环：

```bash
# 1. 读图（AI 理解当前结构）
lgdl status my-diagram.lgdl

# 2. 增量修改（一次一步，不重写文件）
lgdl add-node my-diagram.lgdl --id register --label "注册账号"
lgdl add-edge my-diagram.lgdl --from login --to register --label "没有账号？"
lgdl update-node my-diagram.lgdl --id register --kind decision

# 3. 渲染成图
lgdl render my-diagram.lgdl -o result.svg
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
