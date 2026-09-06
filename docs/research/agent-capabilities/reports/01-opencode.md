# OpenCode Agent 框架基础能力调研

> 调研对象：opencode（sst/opencode，现已迁移至 anomalyco/opencode）
> 调研日期：2026-09-06
> 版本：CLI 二进制 `1.18.29`，SDK `@opencode-ai/sdk 1.16.2`
> 调研方式：本地 SDK 类型定义（`@opencode-ai/sdk/dist/*/gen/types.gen.d.ts`）+ CLI 命令输出（`opencode agent list` / `opencode debug agent <name>` / `opencode debug config`）+ 本机配置文件（`opencode.json` / `.opencode/agents/*.md`）+ 官方文档（tools / permissions / agents）。

---

## 0. 环境与安装布局

| 项 | 路径 |
|---|---|
| CLI 二进制 | `/home/usb/.nvm/versions/node/v24.15.0/bin/opencode`（Bun 编译单文件，~184MB） |
| 平台包 | `/home/usb/.nvm/versions/node/v24.15.0/lib/node_modules/opencode-ai/`（bin + 平台二进制） |
| SDK（客户端） | `/home/usb/.config/opencode/node_modules/@opencode-ai/sdk/dist/`（`gen/types.gen.d.ts` 为 OpenAPI 生成的完整类型） |
| 全局配置 | `/home/usb/.config/opencode/opencode.json` / `opencode.jsonc` |
| Agent 定义 | `/home/usb/wks/sddu/.opencode/agents/*.md`（项目级，Markdown frontmatter） |

关键结论：opencode 的**运行时是编译后的二进制，源码不可直接阅读**；但其 API 契约（工具、权限、agent、session）完全暴露在 SDK 的 TypeScript 类型定义中，且 CLI 提供了 `agent list` / `debug agent` / `debug config` 等只读内省命令，可据此精确还原能力面。

---

## 1. 基础工具清单

opencode 的内置工具按职责分为：文件读写、代码检索、命令执行、网络、子代理、任务编排、交互、LSP、Skill 等。下表汇总工具、作用、关键参数、对应权限键与默认权限。

| # | 工具名 | 作用 | 关键参数 | 权限键 | 默认 |
|---|---|---|---|---|---|
| 1 | `read` | 读文件/目录内容，支持行范围 | `filePath`, `offset`, `limit` | `read` | allow（`.env*` 默认 deny） |
| 2 | `edit` | 精确字符串替换（读改写） | `filePath`, `oldString`, `newString`, `replaceAll` | `edit` | allow |
| 3 | `write` | 新建/覆盖文件 | `filePath`, `content` | `edit`（复用） | allow |
| 4 | `apply_patch` | 应用 diff/patch（marker 行定位文件） | `patchText`（`*** Add File:` / `*** Update File:` / `*** Delete File:` / `*** Move to:`） | `edit`（复用） | allow |
| 5 | `grep` | 内容搜索（ripgrep，支持正则） | `pattern`, `path`, `include` | `grep` | allow |
| 6 | `glob` | 文件名模式匹配 | `pattern`, `path` | `glob` | allow |
| 7 | `list` | 列目录（当前版本已并入 `glob`，仍保留权限键） | `path` | `list` | allow |
| 8 | `bash` | 执行 shell 命令 | `command`, `workdir`, `timeout` | `bash` | allow |
| 9 | `webfetch` | 抓取网页内容（转 markdown/text/html） | `url`, `format`, `timeout` | `webfetch` | allow |
| 10 | `websearch` | 联网搜索（需 Exa/Parallel provider） | `query` | `websearch` | allow（需 provider） |
| 11 | `task` | 启动子代理（subagent） | `description`, `prompt`, `subagent_type`, `task_id`, `command` | `task` | allow |
| 12 | `todowrite` | 创建/维护任务清单 | `todos[]`（`content`/`status`/`priority`） | `todowrite`（含 `todoread`） | allow（子代理默认禁用） |
| 13 | `question` | 执行中向用户提问（澄清/选择） | `questions[]`（`question`/`header`/`options`/`multiple`） | `question` | allow |
| 14 | `lsp` | LSP 代码智能（实验性） | 操作：`goToDefinition`/`findReferences`/`hover`/`documentSymbol`/`callHierarchy` 等 | `lsp` | 需 `OPENCODE_EXPERIMENTAL_LSP_TOOL=true` |
| 15 | `skill` | 加载 SKILL.md 到上下文 | `name` | `skill` | allow |
| 16 | `invalid` | 内部工具，标记非法 tool call | — | 无（内部） | — |

**两类特殊「权限守卫」（非工具，但计入 permission 体系）：**

| 键 | 作用 | 默认 |
|---|---|---|
| `external_directory` | 工具访问工作目录之外路径时触发 | ask |
| `doom_loop` | 同一工具调用重复 3 次且输入相同（疑似死循环）时触发 | ask |

**关于 `websearch` 的说明**：它是「发现」（找信息），`webfetch` 是「抓取」（取特定 URL 内容）。`websearch` 仅在使用 OpenCode/OpenCode Go provider 或设置 `OPENCODE_ENABLE_EXA=1` / `OPENCODE_ENABLE_PARALLEL=1` 时可用；无需 API Key，直接连后端托管的 MCP 服务。

**关于内部实现**：`grep`/`glob` 底层使用 ripgrep，默认遵循 `.gitignore`；可通过项目根 `.ignore` 文件显式放行（如 `!node_modules/`）。

---

## 2. 工具权限模型

### 2.1 三态动作（Action）

每个权限规则最终解析为三态之一：

| 动作 | 含义 |
|---|---|
| `allow` | 无需批准直接执行 |
| `ask` | 弹窗请求批准 |
| `deny` | 阻止执行 |

`ask` 时 UI 提供三选一：`once`（仅本次）/ `always`（本次会话内命中建议模式的一律批准）/ `reject`（拒绝）。

### 2.2 配置层级与键

- 全局级：`opencode.json` 顶层 `permission` 字段。
- Agent 级：`agent.<name>.permission`，与全局**合并**，agent 规则优先。
- 权限键 = 工具名（含通配符），例如 `"mymcp_*": "deny"` 可拒绝某 MCP server 的全部工具，`"mymcp_search": "ask"` 精确到单个工具。

> 历史：`v1.1.1` 起旧的 `tools` 布尔配置（`"write": true/false`）已废弃并并入 `permission`，但仍向后兼容。`true` 等价 `{"*": "allow"}`，`false` 等价 `{"*": "deny"}`。

### 2.3 两种配置形态

**简写（整体授权）：**

```jsonc
{ "permission": { "*": "ask", "bash": "allow", "edit": "deny" } }
// 或一键全量
{ "permission": "allow" }
```

**对象语法（按模式/按参数粒度）：**

```jsonc
{
  "permission": {
    "bash": {
      "*": "ask",
      "git *": "allow",
      "npm *": "allow",
      "rm *": "deny",
      "grep *": "allow"
    },
    "edit": {
      "*": "deny",
      "packages/web/src/content/docs/*.mdx": "allow"
    }
  }
}
```

匹配规则：
- `*` 匹配任意多个字符，`?` 匹配恰好一个字符。
- **最后一个匹配规则胜出**——惯例是 `"*"` 兜底规则放最前，具体规则放其后。
- 支持 `~` / `$HOME` 开头的主目录展开（仅影响模式书写，不改变工作区边界）。
- `bash` 按解析出的命令匹配（如 `git status --porcelain`）；`"grep *"` 匹配带参命令，裸 `"grep"` 只匹配无参调用。

### 2.4 external_directory（工作区越界守卫）

任何带路径输入的工具（`read`/`edit`/`glob`/`grep` 及多数 `bash`）触碰**工作目录之外**路径时，触发 `external_directory` 权限：

```jsonc
{
  "permission": {
    "external_directory": { "~/projects/personal/**": "allow" },
    "edit": { "~/projects/personal/**": "deny" }   // 允许读但禁止编辑
  }
}
```

被放行的目录继承当前工作区的默认权限（如 `read` 默认 allow）。

### 2.5 默认值

未显式配置时，opencode 从宽松默认起步：

- 多数工具默认 `allow`。
- `doom_loop` 与 `external_directory` 默认 `ask`。
- `read` 默认 `allow`，但 `.env` / `*.env` / `*.env.*` 默认 `deny`（`.env.example` 放行）。

### 2.6 自动批准模式

`opencode --auto`（或 TUI 命令面板「Enable auto-approve permissions」）自动批准所有非显式 `deny` 的请求；显式 `deny` 依然生效。

---

## 3. Agent 定义方式

### 3.1 两类 Agent 与 mode

| 类型 | 说明 | 交互方式 |
|---|---|---|
| **primary** | 主对话代理，用户直接交互，Tab 键切换 | 直接对话 |
| **subagent** | 专职子代理，由主代理通过 `task` 工具或 `@mention` 调用 | 产生子会话（child session） |

`mode` 三值：`primary` / `subagent` / `all`（默认 `all`，既可直接对话也可被 task 调用）。

### 3.2 内置 Agent（本版本实际内置 8 个）

| Agent | mode | 角色 |
|---|---|---|
| `build` | primary | 默认主代理，全工具开启 |
| `plan` | primary | 受限分析/规划代理（编辑、bash 默认 ask，只读分析不改代码） |
| `general` | subagent | 通用研究/多步执行代理，除 todo 外全工具 |
| `explore` | subagent | 快速只读代码探索代理 |
| `scout` | subagent | 只读外部文档/依赖源码调研代理 |
| `compaction` | primary（hidden） | 系统代理，长上下文自动压缩 |
| `title` | primary（hidden） | 系统代理，生成会话标题 |
| `summary` | primary（hidden） | 系统代理，生成会话摘要 |

（注：本机通过 `.opencode/agents/*.md` 额外注册了 `sddu`、`sddu-build`、`sddu-fast` 等 11 个 SDDU 自定义代理，`mode` 覆盖 `primary`/`subagent`/`all` 三种。）

### 3.3 定义形式

**JSON（opencode.json 的 `agent` 字段）：**

```jsonc
{
  "agent": {
    "code-reviewer": {
      "description": "Reviews code for best practices",
      "mode": "subagent",
      "model": "anthropic/claude-sonnet-4-20250514",
      "prompt": "You are a code reviewer...",
      "permission": { "edit": "deny" }
    }
  }
}
```

**Markdown（文件名即 agent 名，frontmatter 为配置）：**

```markdown
---
description: SDDU 快速模式 - 轻量任务直接解决
mode: all
temperature: 0.3
permission:
  edit: allow
  bash: allow
  webfetch: allow
---
（正文即系统 prompt）
```

放置目录：全局 `~/.config/opencode/agents/`、项目 `.opencode/agents/`。本机 SDDU 代理即此形式（如 `sddu-fast.md` 用 `mode: all` + `temperature: 0.3` + 局部 permission）。

### 3.4 配置项（Options）

| 选项 | 说明 |
|---|---|
| `description` | 代理用途与调用时机（**必填**；影响 task 工具的自动调用选择） |
| `mode` | `primary` / `subagent` / `all` |
| `prompt` | 系统提示词（可 `{file:./path}` 引用文件） |
| `model` | 覆盖模型（`provider/model-id`；subagent 未指定时继承主代理模型） |
| `temperature` / `top_p` | 采样参数 |
| `permission` | 该代理的权限覆盖（见 §2） |
| `tools` | 已废弃的布尔工具开关 |
| `steps` / `maxSteps` | 最大 agentic 迭代步数（`maxSteps` 已废弃，用 `steps`） |
| `disable` | 禁用该代理 |
| `hidden` | 从 `@` 自动补全菜单隐藏（仅 subagent；仍可被 task 调用） |
| `color` | UI 配色（hex 或主题色） |
| 其他 | 透传给 provider 的模型选项（如 `reasoningEffort`） |

### 3.5 角色 prompt 与工具集的关系（关键点）

**prompt 本身不直接控制工具集。** 工具可用性由 `permission`（及其前身 `tools`）独立决定，二者解耦：

- **prompt** 决定「角色身份、行为规范、工作流」（如 SDDU 各阶段代理的领域知识）。
- **permission** 决定「能调用哪些工具、以什么条件调用」（如 `edit: deny` 使代理只读）。
- **description + mode + hidden** 决定「如何被发现/被调度」（task 工具是否自动选用、是否出现在 `@` 菜单）。
- 三者组合形成代理的能力边界：例如 `plan`（primary）通过 `permission` 把 `edit`/`bash` 置为 `ask` 实现「只规划不落地」，而其 prompt 是通用规划指导。

---

## 4. 会话 / 上下文管理

### 4.1 Session 数据模型（SDK `Session` / `SessionV2Info`）

| 字段 | 含义 |
|---|---|
| `id` / `slug` / `title` | 会话标识与标题 |
| `parentID` | 父会话（subagent 子会话由此挂接） |
| `directory` / `projectID` / `worktree` | 项目根 / 项目标识 / git worktree |
| `agent` / `model` | 当前代理与模型 |
| `tokens` | `input` / `output` / `reasoning` / `cache{read,write}` 分项统计 |
| `cost` | 费用统计 |
| `summary` | `additions` / `deletions` / `files` / `diffs[]`（本会话文件改动快照） |
| `permission` | 会话级权限规则集（可动态改写） |
| `revert` | 回滚信息（`messageID` / `partID` / `snapshot` / `diff`） |
| `share` | 分享 URL（`share: manual/auto/disabled`） |
| `time` | `created` / `updated` / `compacting` / `archived` |

### 4.2 消息部件（Message Parts）

会话消息由多种 part 构成，完整类型在 SDK 中定义：`TextPart` / `ReasoningPart`（思考）/ `FilePart`（附件）/ `ToolPart`（工具调用与结果，含 `pending/running/completed/error` 四态）/ `StepStartPart` / `StepFinishPart` / `SnapshotPart` / `PatchPart` / `AgentPart`（子代理切换）/ `RetryPart` / `CompactionPart`。

### 4.3 上下文压缩（Compaction）

Config 暴露 `compaction` 配置：

```jsonc
{ "compaction": { "auto": true, "prune": true, "tail_turns": 8, "preserve_recent_tokens": 20000, "reserved": 8000 } }
```

- 上下文溢出（overflow）时自动触发压缩，将历史压缩为摘要消息（`CompactionPart`）。
- 由 hidden 的 `compaction` 代理执行；`summary` 代理负责会话摘要、`title` 代理负责标题生成。

### 4.4 快照 / 回滚 / 分享

- 每次会话记录文件改动 diff（`summary.diffs`），支持 `revert`（回滚到某条消息/快照）。
- `share` 生成可分享 URL，`autoshare` 可自动分享。

### 4.5 会话操作（CLI 与 SDK）

CLI：

```
opencode session list / delete
opencode export [sessionID]   # 导出会话 JSON
opencode import <file|url>    # 导入会话
opencode stats                # token 用量与成本
opencode --continue / --session <id> / --fork   # 续接/指定/分叉会话
```

SDK 侧 Session API：`list / create / get / update / delete / children / todo / init / fork / abort`（v1 类型），v2 提供 SSE 事件流（`SessionNextTextDelta`、`SessionNextToolCalled`、`PermissionV2Asked`、`QuestionV2Asked` 等全生命周期事件）。

### 4.6 会话管理要点小结

- **父子会话**：subagent 创建 child session，可通过 keybind 在父子会话间导航（`session_child_first/cycle/parent`）。
- **无状态可恢复**：会话持久化于本地存储，支持 export/import 跨机迁移与 fork 分叉。
- **计量内建**：token 分项（含 reasoning/cache）与 cost 天然内建于 session 模型。

---

## 5. 对 web-cli-base 孵化的可借鉴点

### 5.1 工具集设计（可直接对照）

| 能力域 | opencode 提供 | 对 web-cli-base 的启示 |
|---|---|---|
| 文件读 | `read`（含 offset/limit、目录） | 必须支持行范围读取 + 目录列举，控制大文件截断 |
| 文件写 | `edit`（精确替换）/ `write` / `apply_patch` | 三种写方式分层：精确编辑是主力，patch 适合批量/跨文件 |
| 检索 | `grep`（正则）/ `glob`（模式） | 检索与文件匹配分离，底层复用 ripgrep + `.gitignore` |
| 命令 | `bash`（workdir/timeout/git 感知） | 必须支持工作目录隔离 + 超时 + 危险命令识别 |
| 网络 | `webfetch`（发现）/ `websearch`（抓取） | 「发现 vs 抓取」职责分离是好的抽象 |
| 编排 | `task`（子代理）/ `todowrite`（任务清单） | 子代理编排 + 显式 todo 状态机 |
| 交互 | `question`（结构化提问/选择） | 澄清歧义时用结构化选项而非自由文本 |

### 5.2 权限模型（强可借鉴）

1. **三态 + 粒度递进**：`allow/ask/deny` 全局 → 按工具 → 按 glob 模式，且「最后匹配胜出」+ 通配符兜底。
2. **工作区越界守卫**（`external_directory`）：把「工作目录外访问」作为独立维度，是 web 端安全的关键模式。
3. **安全默认**：`.env` 默认禁读、`doom_loop` 死循环守卫默认 ask，值得内置。
4. **ask 三态交互**（once/always/reject）是良好的用户体验模式。
5. **会话级权限**：session 内可动态改写 permission（`SessionPrompt.prompt` 会把临时工具开关写成 permission 规则）。

### 5.3 Agent 定义（强可借鉴）

1. **Markdown frontmatter 定义 agent**（文件名即 agent 名、正文即 prompt），比纯 JSON 更易维护和版本化——SDDU 已采用此模式。
2. **`mode: primary/subagent/all` 三态**清晰区分「直接对话 / 被调度 / 兼有」。
3. **prompt 与工具集解耦**：身份（prompt）与能力（permission）分离，便于组合复用。
4. **hidden + description 驱动 task 自动调度**：description 是子代理自动选择的依据，hidden 控制可见性。

### 5.4 会话/上下文（可借鉴）

1. **父子会话 + 可导航**：subagent 工作隔离在 child session，保留导航能力。
2. **内建计量**：token（分 reasoning/cache）+ cost + diff 摘要 + revert，可观测性是一等公民。
3. **compaction 可配置化**（auto/prune/tail_turns/reserve），上下文压缩策略显式暴露。
4. **SSE 事件流**（v2）：细粒度事件（文本增量/工具调用/权限请求/提问）适合 Web 端实时渲染。

### 5.5 扩展机制（生态可借鉴）

- **Custom tools**：配置文件内定义任意函数工具。
- **MCP servers**：本地/远程（含 OAuth）接入外部工具，权限键与内建工具统一按通配符匹配。
- **Plugins / Skills / Commands / References / LSP**：插件、SKILL.md、命令模板、引用目录、LSP 集成，构成完整扩展面。

---

## 附：关键参考

- 工具文档：https://opencode.ai/docs/tools/
- 权限文档：https://opencode.ai/docs/permissions/
- Agent 文档：https://opencode.ai/docs/agents/
- SDK 类型：`@opencode-ai/sdk/dist/v2/gen/types.gen.d.ts`（`PermissionConfig` / `AgentConfig` / `Config` / `Session` / `PermissionV2Rule` 等）
- 本机内省命令：`opencode agent list`、`opencode debug agent <name>`、`opencode debug config`
