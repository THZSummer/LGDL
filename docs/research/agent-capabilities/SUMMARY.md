# Agent 基础能力调研 — 总汇总报告

> **目的**：为 web-cli-base 孵化（未来 web 侧基础 agent 框架）提供前提输入。
> **调研对象**：opencode / pi / dsh（本地源码实测）+ Claude Code / Aider / Codex / Qwen Code / Gemini CLI / Goose / WorkBuddy（联网调研）。
> **日期**：2026-09-06
> **分报告**：`reports/01-opencode.md`、`02-pi.md`、`03-dsh.md`、`04-other-agents.md`、`05-workbuddy.md`

---

## 1. 能力全景矩阵

按"agent 基础能力"九大维度对比 9 个框架（●=内置标配 ◐=可选/扩展 ○=无/靠扩展）：

| 能力维度 | opencode | pi | dsh | Claude Code | Aider | Codex | Qwen | Gemini | Goose |
|---------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| **文件读** (read) | ● | ● | ● | ● | ◐ | ● | ● | ● | ● |
| **文件写** (write) | ● | ● | ● | ● | ◐ | ● | ● | ● | ● |
| **精确编辑** (edit) | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| **搜索** (grep) | ● | ● | ● | ● | ○ | ○ | ● | ● | ● |
| **模式匹配** (glob) | ● | ● | ● | ● | ○ | ○ | ● | ● | ● |
| **命令执行** (bash) | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| **网页抓取** (webfetch) | ● | ○ | ● | ● | ◐ | ● | ○ | ● | ◐ |
| **网页搜索** (websearch) | ○ | ○ | ● | ● | ○ | ● | ○ | ● | ◐ |
| **子任务** (subagent) | ● | ○ | ● | ● | ○ | ◐ | ● | ◐ | ◐ |
| **任务清单** (todo) | ● | ○ | ● | ● | ○ | ◐ | ○ | ◐ | ◐ |
| **技能加载** (skill) | ● | ● | ● | ● | ○ | ○ | ○ | ◐ | ● |
| **外部扩展** (MCP) | ◐ | ●(ext) | ● | ● | ○ | ◐ | ● | ● | ● |
| **权限模型** | ● | ◐ | ● | ● | ○ | ◐ | ◐ | ◐ | ◐ |
| **持久目标** (goal) | ○ | ○ | ● | ○ | ○ | ○ | ○ | ○ | ○ |

---

## 2. 共识能力（所有框架都有 → web-cli-base 的必选基线）

> 9 个框架 100% 共识，这是 agent 基础能力的**最小公分母**：

| # | 能力 | 说明 |
|---|------|------|
| 1 | **read** | 读文件（带行号、分页 offset/limit） |
| 2 | **write** | 写文件（原子创建/替换） |
| 3 | **edit** | 精确字符串替换（普遍要求"先读后改"） |
| 4 | **bash** | 命令执行（一次性 或 持久 shell） |
| 5 | **grep** | 内容搜索（正则） |
| 6 | **glob** | 文件模式匹配 |
| 7 | **子任务委派** | 复杂任务拆子 agent |
| 8 | **任务清单** | 多步任务可视化跟踪 |

**这 8 项就是 web-cli-base 的 MVP 工具集。**

---

## 3. 差异点（需决策）

### 3.1 编辑范式（三选一或并存）
| 范式 | 代表 | 特点 |
|------|------|------|
| 字符串替换 | opencode / Claude Code / dsh-fs | `oldString→newString`，需先 read |
| 单工具多操作 | dsh str_replace_editor / Claude | `view/create/str_replace/insert` 一个工具 |
| Diff 编辑 | pi edit-diff | 基于 diff，更语义化 |

**建议**：web-cli-base 先做字符串替换（最简单），预留 str_replace_editor 多操作接口。

### 3.2 网络能力（最大分歧）
- **有搜索+抓取**：dsh、Claude Code、Codex、Gemini CLI
- **只有抓取**：opencode
- **都没有**：pi
- **靠扩展**：Goose（MCP）、Qwen

> ⚠️ **web-cli-base 定位是 web 侧 → 网络能力是核心，必须内置 `web_search` + `webfetch`**（dsh/Claude 是最佳参照），且外部内容要标记 untrusted（dsh 的做法）。

### 3.3 执行会话（有状态 vs 无状态）
| 模式 | 代表 | 特点 |
|------|------|------|
| 一次性 shell | dsh bash、opencode bash | 每次全新，无残留（安全） |
| 持久 shell | dsh bash-persistent、pi | owner-scoped PTY，状态跨调用（高效） |

**建议**：两者并存（dsh 模式）——默认一次性安全，需要时持久。

### 3.4 权限模型（三路线）
| 路线 | 代表 | 机制 |
|------|------|------|
| 三元组规则 | opencode | `{permission, pattern, action: allow/ask/deny}`，白名单优先 |
| 项目信任门禁 | pi | 项目含资源才问，防静默篡改 |
| 可插拔策略 | dsh | read-before-edit 等做成独立插件，部署方选 |

**建议**：web 侧用 **opencode 三元组 + dsh 可插拔策略**结合——规则声明式，策略可按需注入。

### 3.5 上下文管理
| 机制 | 代表 |
|------|------|
| Repo Map（代码索引） | Aider（大项目定位） |
| Compaction（压缩） | opencode / pi / dsh |
| 会话分叉（branch/fork） | opencode parentID / pi JSONL 树 |
| Summarize（总结） | opencode |

> web-cli-base 的"文档/上下文"可借鉴 **Aider Repo Map** 的索引思想 + 通用 compaction。

### 3.6 任务/目标体系（分层）
| 层 | 工具 | 代表 |
|----|------|------|
| 会话级任务清单 | todo_write | dsh / opencode / Claude |
| 持久目标 | get/create/update_goal | **dsh 独有** |
| 后台作业统一控制 | job_output/list/kill | **dsh 独有** |

> **dsh 的三层任务体系是 web-cli-base 的最佳参照**——web 场景长任务更需要持久 goal + 后台作业。

### 3.7 扩展/生态
| 机制 | 代表 |
|------|------|
| MCP 标准协议 | Goose（70+ 扩展）、Claude、Qwen、dsh、WorkBuddy（103 连接器） |
| 自有扩展系统 | pi（TS 扩展）、opencode（plugin/skill） |
| Skill 目录加载 | opencode / pi / dsh / Claude / WorkBuddy |
| **市场包分发** | **WorkBuddy（295 技能/103 连接器/410 专家，装即用）** |

> **建议 web-cli-base 扩展机制对齐 MCP**（生态标准）+ 自有 skill 目录（轻量流程）+ **市场分发**（WorkBuddy 验证的生态规模路线）。WorkBuddy 的 `allowed-tools`（技能声明工具白名单）把权限下沉到技能粒度，值得借鉴。

---

## 4. 安全设计对比

| 方案 | 代表 | 适用 |
|------|------|------|
| 沙箱执行 | Codex、dsh-bash-sandbox | 不可信代码 |
| 无沙箱 + 信任门禁 | pi | 本地可信环境 |
| 权限规则门禁 | opencode（allow/ask/deny） | 交互式 |
| Git-first 自动 commit | Aider | 可回滚安全网 |

> **web-cli-base（web 侧）安全是重中之重**：权限规则门禁（opencode 三元组）+ 沙箱（web 容器天然隔离）+ 外部内容 untrusted 标记（dsh）三管齐下。

---

## 5. web-cli-base 孵化的落地建议（能力分层）

### 5.1 MVP 层（第一版必含）
```
read / write / edit / grep / glob / bash / subagent / todo
+ web_search / webfetch（web 侧核心，参照 dsh/Claude）
+ 权限三元组（opencode 模式）：{permission, pattern, allow/ask/deny}
```

### 5.2 增强层（第二版）
```
+ str_replace_editor（Claude 风格单工具多操作）
+ 持久 bash（dsh bash-persistent，owner-scoped）
+ skill 目录加载（opencode/pi 模式）
+ MCP 客户端（Goose/Claude 模式，生态对齐）
+ hooks 生命周期（Claude Code：PreToolUse/PostToolUse）
```

### 5.3 进阶层（web 化后）
```
+ goal 服务（dsh：get/create/update_goal，持久目标）
+ jobs 统一后台作业（dsh：job_output/list/kill）
+ workflow JS 编排（dsh：多 agent 扇出）
+ Repo Map 索引（Aider：大项目上下文）
+ 多形态 profile（dsh：web/tui/sdk/acp/headless 一套内核）
```

### 5.4 明确不做（反例教训）
```
- 不学 pi 完全砍掉联网（web 侧必须联网）
- 不学 pi 无权限门禁（web 侧权限是刚需）
- 不学 aider 过度依赖 git（web 文档场景非 git）
```

---

## 6. WorkBuddy 补充洞察（腾讯系桌面 agent）

WorkBuddy 与 OpenClaw/Claude Code 同类，但把**生态分发**做到极致：近 900 个市场包（295 技能 + 103 连接器 + 410 专家 + 88 插件）全是"装即用"。验证了 agent 能力不止 8 个核心工具，而是**可无限扩展、按技能/连接器/专家封装的市场生态**。核心机制：`SKILL.md + allowed-tools`（技能级权限）、`mcp.json` 连接器、专家预制 agent。

## 7. 一句话结论

**10 个框架共识出 8 项 MVP 能力（read/write/edit/bash/grep/glob/subagent/todo），web-cli-base 以此为内核；网络（search+fetch）与权限门禁是 web 侧区别于本地 CLI 的两大必补项；架构上以 dsh 的插件化工具 + 三层任务体系为长期参照，以 opencode 的权限三元组 + agent markdown 定义为中短期骨架，扩展对齐 MCP 生态标准 + 借鉴 WorkBuddy 的市场分发路线（技能级 allowed-tools 权限）。**

---

## 附：分报告索引

| 报告 | 对象 | 核心借鉴点 |
|------|------|-----------|
| [01-opencode.md](reports/01-opencode.md) | opencode | 权限三元组、agent markdown、directory 多目录 |
| [02-pi.md](reports/02-pi.md) | pi | file-mutation-queue、project trust、四层扩展 |
| [03-dsh.md](reports/03-dsh.md) | dsh | 插件化工具、三层任务、web 标配、多形态 profile |
| [04-other-agents.md](reports/04-other-agents.md) | Claude/Aider/Codex/Qwen/Gemini/Goose | hooks、Repo Map、MCP 生态、沙箱 |
| [05-workbuddy.md](reports/05-workbuddy.md) | WorkBuddy | allowed-tools 技能权限、MCP 连接器、市场分发、专家预制 |
