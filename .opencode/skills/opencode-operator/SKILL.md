---
name: opencode-operator
description: "当 LLM Agent 或用户需要程序化操作 opencode 时加载--包括非交互式任务执行（opencode run）、无头 HTTP 服务器（opencode serve）、ACP 协议通信、会话/Agent/Skill/Plugin/MCP 管理和 GitHub CI/CD 集成，以及查询/巡检当前运行中的 opencode serve 进程和会话。不负责 opencode 配置文件编辑（走 customize-opencode）。"
---

# opencode-operator

## 接口

阅读本章节即可使用本 Skill，无需阅读后续路径细节。

> **命令自发现**（始终优先于本文件的静态表格）：
> - serve-api 子命令：`node scripts/serve-api.cjs`（无参数运行打印完整 usage）
> - opencode CLI 命令：`opencode --help`（列出全部顶层命令）；`opencode <command> --help` 查看子命令与参数详情

### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| `intent` | string | ✅ | 操作意图描述，如"跑一次代码审查"、"启动无头服务器" |
| `mode` | enum | ❌ | 操作模式，根据 intent 自动推导。见下表 |
| `project_dir` | string | ❌ | 目标项目目录，默认当前工作目录 |
| `agent` | string | ❌ | 指定 Agent（如 `build`、`sddu`）。用 `opencode agent list` 查看可用值 |
| `model` | string | ❌ | 指定模型，格式 `provider/model-id`。用 `opencode models` 查看可用值 |

**mode 选项**：

| 值 | 命令 | 适用场景 | 时长参考 |
|:--|:--|:--|:--|
| `cli`（默认） | `opencode run` | 单次任务：代码审查、bug 修复、问答 | <5min 单次；5-30min 用 `-c` 续接 |
| `serve` | `opencode serve` | 长期运行、多会话、需进度监控 | >30min |
| `acp` | `opencode acp` | 进程间 stdin/stdout 通信 | 任意 |
| `github` | `opencode github` | CI/CD 自动化 | 触发式 |

> 不确定时用 `cli`。任务超 5 分钟需 `-c` 续接或改用 `serve`。详见 [长流程编排](#长流程编排)。

### 返回值

**成功**：返回可执行的命令或 API 调用方案。长流程（>5 分钟）额外返回续接策略。

**异常**：

| 情况 | 处理 |
|------|------|
| opencode 未安装 | 提示安装命令 |
| serve 端口被占用 | 建议换端口 `--port <n>` |
| Agent 名称不存在 | 提示 `opencode agent list` 查看 |
| 模型不可用 | 提示 `opencode models` 查看 |

### 调用示例

```
# 简单任务（< 5 分钟）
用户："帮我在 src/ 上跑一次代码审查"
-> opencode run --agent build --auto --dir . "审查 src/ 目录"

# 长流程任务（5-30 分钟，需续接）
用户："用 SDDU 跑完 todo-app 的全流程"
-> opencode run --auto --dir /project --agent sddu "todo-app"
-> （超时后续接）opencode run -c --auto --dir /project "继续执行"

# 长期运行非阻塞（> 30 分钟，提交后去做别的）
用户："启动服务器跑个长任务，我先去忙别的"
-> node scripts/serve-api.cjs start --port 4096 --dir .
-> node scripts/serve-api.cjs submit --port 4096 --message "任务" --agent build
-> （随时）node scripts/serve-api.cjs status --port 4096 --session <sid>
-> （完成）node scripts/serve-api.cjs result --port 4096 --session <sid>
-> （太慢）node scripts/serve-api.cjs abort --port 4096 --session <sid>
-> （用完）node scripts/serve-api.cjs stop --port 4096

# 查询类
用户："列出当前项目有哪些 Agent"
-> opencode agent list
```

---

## 操作路径

根据操作意图选择路径。单次任务用 run，长期运行用 serve，进程间通信用 acp，CI/CD 用 github。

### 路径 1: opencode run（单次任务）

最常用的非交互式入口。执行一条消息，返回结果，退出。

**基本用法**：
```bash
# 自然语言任务
opencode run --auto "解释 src/index.ts 的架构"

# JSON 事件流输出（适合 Agent 解析）
opencode run --format json --auto "重构 auth 模块"

# 指定 Agent + 模型
opencode run --agent sddu --model deepseek/deepseek-v4-pro --auto "@sddu 状态"

# 带文件附件
opencode run --auto -f screenshot.png "分析这张架构图"

# 在指定目录运行
opencode run --auto --dir /path/to/project "修复 lint 错误"

# 继续上次会话
opencode run -c --auto "继续刚才的重构"

# 连接到已有 serve 实例（避免冷启动）
opencode run --attach http://localhost:4096 --auto "修复 lint 错误"

# 执行斜杠命令而非自然语言
opencode run --command compact
```

**关键 flags**：

| Flag | 类型 | 说明 |
|------|------|------|
| `--format json` | string | 输出原始 JSON 事件流，Agent 解析用 |
| `--auto` | boolean | 自动批准权限，无人值守必需 |
| `--agent` | string | 指定 Agent |
| `--model` | string | 指定模型（provider/model 格式） |
| `--attach` | string | 连接到 serve 实例 |
| `--dir` | string | 指定工作目录 |
| `--command` | string | 执行斜杠命令 |
| `-f/--file` | array | 附件文件 |
| `-c/--continue` | boolean | 继续上次会话 |
| `-s/--session` | string | 指定 session ID |
| `--variant` | string | 模型变体（推理强度：high/max/minimal） |
| `--thinking` | boolean | 显示思考过程 |
| `-i/--interactive` | boolean | 交互式分屏模式 |

> **长流程提示**：任务预计超过 5 分钟时，`opencode run` 可能被 shell 超时中断。使用 `-c` 续接或改用 `opencode serve`。详见 [长流程编排](#长流程编排) 章节。

### 路径 2: opencode serve（HTTP API）

启动无头 HTTP 服务器，适合长期运行、多会话管理、外部系统集成。

**通过脚本操作（推荐）**：

阻塞模式（提交后等待完成）：
```bash
# 一键模式：启动 -> 执行任务 -> 关闭
node scripts/serve-api.cjs run --message "审查代码" --agent build --dir . --port 4096
```

非阻塞模式（提交后去做别的，随时回来看进度）：
```bash
# 1. 启动 serve（一次性）
node scripts/serve-api.cjs start --port 4096 --dir .

# （可选）巡检当前有哪些 serve 在跑
node scripts/serve-api.cjs ps

# 2. 提交任务，立即返回 sessionId
node scripts/serve-api.cjs submit --port 4096 --message "审查代码" --agent build
# -> { sessionId: "abc-123", status: "submitted" }

# 3. 去做别的事情...

# 4. 随时查看进度
node scripts/serve-api.cjs status --port 4096 --session abc-123
# -> { status: "running", messageCount: 5 }

# 5. 完成后取结果
node scripts/serve-api.cjs result --port 4096 --session abc-123
# -> { status: "completed", messages: [...] }

# 6. 太慢可以中止
node scripts/serve-api.cjs abort --port 4096 --session abc-123

# 7. 全部用完关闭 serve
node scripts/serve-api.cjs stop --port 4096
```

> 不推荐直接 curl 调用 HTTP API。脚本封装了会话创建、消息发送、轮询、进程管理等确定性逻辑。如需查看完整 API 规范，访问运行中 serve 的 `/doc` 端点。

**认证**（可选）：
```bash
export OPENCODE_SERVER_PASSWORD=secret
```

**TUI 附加**：
```bash
opencode attach http://localhost:4096
```

> serve 不会自动退出。用 `scripts/serve-api.cjs stop --port 4096` 或 `lsof -ti:4096 | xargs kill` 关闭。

### 路径 3: opencode acp（标准协议）

通过 stdin/stdout 的 nd-JSON 通信，符合 ACP（Agent Client Protocol）标准。适合进程间通信，无 HTTP 开销。

```bash
# 启动 ACP 服务器
opencode acp --cwd /path/to/project

# 外部进程通过 stdin 发送 nd-JSON 消息
echo '{"method":"initialize","params":{...}}' | opencode acp
```

### 路径 4: GitHub Agent（CI/CD）

将 opencode 集成到 GitHub Actions，实现 PR 审查、自动修复等 CI/CD 自动化。

```bash
# 安装 GitHub Agent
opencode github install

# 手动触发执行
opencode github run --event push

# 拉取 PR 分支后启动 opencode
opencode pr 42
```

---

## 长流程编排

任务预计超过 5 分钟时（多阶段 workflow、批量重构），需特殊策略应对 shell 超时和进度不可见问题。

### 策略选择

| 预计时长 | 推荐策略 | 原因 |
|:--|:--|:--|
| < 5 分钟 | `opencode run --auto` | 单次完成，最简单 |
| 5-30 分钟 | `opencode run -c` 分段续接 | 绕过超时，自动恢复上下文 |
| > 30 分钟 | `scripts/serve-api.cjs` 非阻塞模式 | 提交即走，随时查进度 |

### `-c` 续接模式

`opencode run` 被超时中断后，`-c` 续接最后一次会话，保留完整上下文：

```bash
# 第一次调用（可能超时）
opencode run --auto --dir <project> --agent sddu "启动多阶段任务"

# 超时后续接（可多次）
opencode run -c --auto --dir <project> "继续执行"
```

**关键点**：
- `-c` 继续最后一次会话，保留完整对话历史和上下文
- 多次 `-c` 之间，Agent 的中间产物已持久化到磁盘（文件、state.json 等）
- 续接时如不确定进度，先检查项目产物文件再决定提示词

### 进度监控

| 场景 | 方法 | 示例 |
|:--|:--|:--|
| serve 非阻塞任务 | 脚本 status 命令 | `node scripts/serve-api.cjs status --port 4096 --session <sid>` |
| serve 实时事件流 | SSE 端点 | `curl -N http://localhost:4096/event` |
| serve 全局巡检 | 脚本 ps 命令 | `node scripts/serve-api.cjs ps` |
| `opencode run` 阻塞任务 | 读项目状态文件 | `cat <project>/.sddu/specs-tree-root/*/state.json \| jq .phase` |
| `opencode run` 阻塞任务 | 检查产物文件 | `ls <output_dir>/` 看文件增长 |
| `opencode run` 需事件流 | `--format json` 管道 | `opencode run --format json --auto "..." \| jq .type` |

### serve 长流程示例

```bash
# 一条龙：启动 serve -> 提交任务 -> 轮询 -> 取结果 -> 自动关闭
node scripts/serve-api.cjs run --message "执行多阶段任务" --agent sddu --dir . --port 4096
# stdout JSON: { sessionId, status, messages, duration }
# stderr 实时进度: [12.5s] status: running

# 或组合模式（需并行多会话时）
node scripts/serve-api.cjs start --port 4096 --dir .
node scripts/serve-api.cjs send --port 4096 --message "任务1" --agent build
node scripts/serve-api.cjs send --port 4096 --message "任务2" --agent build
node scripts/serve-api.cjs stop --port 4096
```

---

## CLI 命令速查

> **查看所有 CLI 命令**：`opencode --help`（列出全部顶层命令，始终是最新清单，优先于本章节静态表格）；`opencode <command> --help` 查看某命令的子命令与参数详情。

### 会话管理

| 命令 | 用途 |
|------|------|
| `opencode session list` | 列出所有会话 |
| `opencode session delete <id>` | 删除会话 |
| `opencode export [sessionID]` | 导出会话为 JSON |
| `opencode import <file>` | 从 JSON 导入会话 |
| `opencode stats [--days N] [--models]` | Token 用量和费用统计 |

### 模型与供应商

| 命令 | 用途 |
|------|------|
| `opencode models [provider] [--refresh]` | 列出可用模型（可过滤/刷新） |
| `opencode providers list` | 列出已配置的供应商 |
| `opencode providers login\|logout <id>` | 登录/退出供应商 |

### Agent 管理

| 命令 | 用途 |
|------|------|
| `opencode agent list` | 列出所有 Agent |
| `opencode agent create` | 创建自定义 Agent |

### MCP 服务器管理

| 命令 | 用途 |
|------|------|
| `opencode mcp add` | 添加 MCP 服务器 |
| `opencode mcp list` | 列出已配置的 MCP 服务器 |
| `opencode mcp auth` | MCP 服务器认证 |
| `opencode mcp debug` | 调试 MCP 服务器 |

### 其他

| 命令 | 用途 |
|------|------|
| `opencode plugin <module> [--global]` | 安装插件（可选全局） |
| `opencode debug` | 诊断和故障排除 |
| `opencode upgrade [version]` | 升级到最新或指定版本 |
| `opencode uninstall` | 卸载 opencode |

---

## 配置管理

opencode 配置分两层：用户级（全局）和项目级（覆盖合并）。

### 配置文件位置

| 层级 | 路径 | 管控内容 |
|------|------|---------|
| 用户级 | `~/.config/opencode/opencode.json` | provider、mcp、model |
| 项目级 | `./opencode.json` 或 `.opencode/opencode.json` | agent、permission、plugin |
| 用户级 Agent | `~/.config/opencode/agents/<name>.md` | 全局 Agent prompt |
| 项目级 Agent | `.opencode/agents/<name>.md` | 项目 Agent prompt |
| 用户级 Skill | `~/.config/opencode/skills/<name>/SKILL.md` | 全局 Skill |
| 项目级 Skill | `.opencode/skills/<name>/SKILL.md` | 项目 Skill |

> 配置编辑（修改 opencode.json、创建 Agent/Skill 文件）走 `customize-opencode` Skill。本 Skill 只管运行时操作。

### 运行时配置查询

```bash
# 查看当前配置
opencode debug

# 查看当前项目的 Agent 列表
opencode agent list

# 查看可用模型
opencode models
```

---

## 常见模式

### 模式 1: 脚本化代码任务

```bash
# 在 CI 中自动修复 lint
opencode run --format json --auto --dir . "修复所有 ESLint 错误" 2>/dev/null

# 批量给文件加注释
opencode run --auto "给 src/utils.ts 加上 JSDoc 注释"
```

### 模式 2: serve 多会话并行

```bash
# 启动服务器
node scripts/serve-api.cjs start --port 4096 --dir .

# 并行提交多个任务
node scripts/serve-api.cjs send --port 4096 --message "审查 auth/" &
node scripts/serve-api.cjs send --port 4096 --message "审查 payment/" &
wait

# 关闭服务器
node scripts/serve-api.cjs stop --port 4096
```

### 模式 3: 外部 Agent 通过脚本驱动 opencode

```bash
# openclaw / Claude Code / 其他 Agent 调用
node scripts/serve-api.cjs run --message "重构 auth 模块" --agent build --dir /project
# -> 解析 stdout JSON 获取结果，继续编排
```

### 模式 4: 指定 SDDU Agent 执行专项任务

```bash
# 用 sddu-spec Agent 写需求
opencode run --agent sddu-spec --auto --format json "为用户认证功能写需求"

# 用 sddu-build Agent 构建
opencode run --agent sddu-build --auto --format json "构建 specs-tree-root/specs-tree-auth/"

# 用 build Agent 做代码审查
opencode run --agent build --auto "审查 src/ 目录"
```

### 模式 5: 会话导出与迁移

```bash
# 导出会话
opencode export <session-id> --sanitize > session.json

# 在另一台机器导入
opencode import session.json

# 分享会话（生成链接）
opencode run --share --auto "帮我分析这段代码"
```

### 模式 6: 多阶段长流程（分段续接）

适合 SDDU 7 阶段 workflow 等预计 20-30 分钟的任务：

```bash
# 第一轮：启动（可能超时）
opencode run --auto --dir /path/to/project --agent sddu "project-name"

# 检查进度
cat /path/to/project/.sddu/specs-tree-root/*/state.json | jq .phase
# -> "discovered"

# 第二轮：续接
opencode run -c --auto --dir /path/to/project "继续执行"

# 再检查
cat /path/to/project/.sddu/specs-tree-root/*/state.json | jq .phase
# -> "specified"

# 重复直到完成
opencode run -c --auto --dir /path/to/project "继续"
# -> {"phase": "validated", "status": "completed"}
```

### 模式 7: 服务巡检 / 僵尸进程清理

```bash
# 发现所有运行中的 serve 进程加健康探测
node scripts/serve-api.cjs ps
# -> [{ pid: "12345", port: 4096, health: "alive", ... }, { pid: "12346", port: 4097, health: "down", ... }]

# 对 down 或不再需要的进程清理
node scripts/serve-api.cjs stop --port 4097

# 复核清理结果
node scripts/serve-api.cjs ps
```

### 模式 8: 会话清理

> 会话数据全局共享，端口号只决定连哪个 serve 进程不隔离数据，任意端口可查/删全局会话。

```bash
# 列出所有会话，找到废弃/僵尸会话
node scripts/serve-api.cjs sessions --port 4096
# -> [ { "id": "abc-123", "title": "...", "agent": "build" }, ... ]

# 删除指定会话（不可逆）
node scripts/serve-api.cjs rm --port 4096 --session abc-123
# -> { "deleted": true, "sessionId": "abc-123", "response": true }

# 复核确认已删除
node scripts/serve-api.cjs sessions --port 4096
```

---

## 脚本

| 脚本 | 路径 | 用途 |
|------|------|------|
| serve-api.cjs | scripts/serve-api.cjs | 封装 opencode serve HTTP API（**Agent 接口**）。11 个子命令：**阻塞** `run`（一条龙）、`send`（阻塞等待）；**非阻塞** `start`、`submit`（提交即返回）、`status`（查进度）、`result`（取结果）、`abort`（中止）、`stop`（关闭）；**只读巡检** `ps`（列出运行中的 serve 进程加健康探测）、`sessions`（列出会话，默认摘要最近5条，支持 --grep/--limit/--full，会话数据全局共享）、`rm`（删除会话不可逆）。零依赖，stdout JSON。通用参数 `--port`（必填，默认 4096），`--hostname`（可选），`--timeout`/`--interval`（轮询控制）。运行 `node serve-api.cjs` 无参数查看完整 usage。 |
| restart.cjs | scripts/server/restart.cjs | 重启 opencode serve（**人工运维工具**）。杀旧进程（SIGTERM → kill -9 兜底）→ spawn detached 启动 → 30s 健康检查 → 日志/PID 落盘 `<dir>/.opencode/logs/`。人类友好输出。默认 `--port 14096`、`--dir` 默认当前工作目录（可用 `--dir <path>` 覆盖）。 |
| stop.cjs | scripts/server/stop.cjs | 停止 opencode serve（**人工运维工具**）。终止占用端口进程（SIGTERM → kill -9 兜底），确认端口释放。人类友好输出。默认 `--port 14096`。 |
| attach.cjs | scripts/server/attach.cjs | 一键 TUI attach 到运行中的 serve（**人工运维工具**）。健康检查通过后以 `stdio: inherit` 启动 `opencode attach`。参数同上（默认 `--port 14096`、`--dir` 默认当前工作目录）。 |

> **分层约定**：`scripts/server/` 下为**人用**运维脚本（人类友好文本输出）；`serve-api.cjs` 为 **LLM Agent 用**接口（stdout JSON）。Agent 不得调用 server/ 脚本解析输出。

---

## 参考文档

拓展 `serve-api.cjs` 新能力时，先通过以下来源确认可用 API。

| 来源 | 地址 | 用途 |
|------|------|------|
| 官方文档 | https://opencode.ai/docs/server/ | serve 命令用法、认证方式、API 概览 |
| 运行时 OpenAPI 规范 | `GET http://主机:端口/doc` | 当前版本完整 API 端点自描述（OpenAPI 3.1.0），最权威 |
| GitHub 仓库 | https://github.com/anomalyco/opencode | 源码、issue、release |
| SDK 类型定义 | https://github.com/anomalyco/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts | 端点的 TypeScript schema |

### 用 `/doc` 发现新端点

启动 serve 后用 `curl -s http://127.0.0.1:端口/doc` 取 OpenAPI 规范，再用 `node` 或 `jq` 解析 paths 列出所有端点，对照下方已封装端点找出缺口。

```bash
curl -s http://127.0.0.1:4097/doc | node -e "const d=JSON.parse(require('fs').readFileSync(0));console.log(Object.keys(d.paths).join('\n'))"
```

### 已封装端点（供对照）

`serve-api.cjs` 当前已封装以下 7 个 API 端点：

| 端点 | serve-api.cjs 子命令 | 说明 |
|------|---------------------|------|
| `GET /global/health` | `status` / `cmdStart` / `cmdRun` | 健康检查 |
| `POST /session` | `send` / `submit` / `run` | 创建会话 |
| `GET /session` | `sessions` | 列出所有会话 |
| `GET /session/{id}/message` | `status` / `result` | 取消息 |
| `POST /session/{id}/prompt_async` | `send` / `submit` / `run` | 异步发消息 |
| `POST /session/{id}/abort` | `abort` | 中止会话 |
| `DELETE /session/{id}` | `rm` | 删除会话（不可逆） |

未封装的常见端点如 `GET /session/{id}`（查看单会话详情）、实时事件流等，可按需扩展。

---

## 边界

**本 Skill 负责**：
- opencode CLI 命令的构造和执行指引
- serve 模式通过 `scripts/serve-api.cjs` 脚本封装的调用方案
- ACP 协议的使用指引
- GitHub Agent 的 CI/CD 集成
- 运行时会话管理（创建、查询、中止、导出）
- Agent/Model/MCP 的运行时查询

**本 Skill 不负责**：
- 编辑 `opencode.json` 配置文件 -> 走 `customize-opencode`
- 创建 Agent/Skill 定义文件 -> 走 `customize-opencode`
- 编写 Agent prompt 模板 -> 走 `customize-opencode`
- 管理 MCP 服务器配置 -> 走 `customize-opencode`

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建 - 覆盖 opencode CLI 4 条操作路径 + HTTP API 端点表 + CLI 速查 + 配置管理 + 5 种常见模式 | 2026-07-24 | sddu-skill-creator |
| v1.1 | 新增长流程编排章节（`-c` 续接模式 + 进度监控 + serve 长流程示例）+ 模式 6 多阶段续接实战 | 2026-07-24 | 实战优化 |
| v1.2 | 接口章节重写：mode 选项表 + agent/model 发现方式 + 长流程调用示例 + 续接策略返回 | 2026-07-24 | 接口完善 |
| v1.3 | 补全 serve 生命周期：停止服务器 3 种方式 + 典型交互流程 step 6 + 接口示例关闭 + CLI 速查精简 | 2026-07-24 | 生命周期完善 |
| v2.0 | 脚本化：新增 `scripts/serve-api.cjs` 封装 serve API；路径 2/长流程/常见模式全部改为脚本驱动，移除裸 curl 示例和 API 端点表 | 2026-07-24 | 脚本化重构 |
| v2.1 | 新增非阻塞工作流：`submit`/`status`/`result`/`abort` 4 个子命令；进度监控表增加 serve 非阻塞查询 | 2026-07-24 | 非阻塞支持 |
| v2.2 | 新增 `ps` 子命令巡检运行中的 serve 进程；SKILL.md 同步服务巡检模式 | 2026-07-26 | @sddu-fast |
| v2.3 | 新增参考文档章节（官方文档地址 + /doc 端点 + 已封装端点对照） | 2026-07-26 | @sddu-fast |
| v2.4 | 新增 sessions/rm 子命令管理 serve 会话 | 2026-07-26 | @sddu-fast |
| v2.5 | 微调 description 补充 serve 进程/会话巡检触发词 | 2026-07-26 | @sddu-fast |
| v2.6 | 接口章节加命令自发现提示（无参数运行查看 usage） | 2026-07-26 | @sddu-fast |
| v2.7 | CLI 命令速查章节加 opencode --help 自发现提示 | 2026-07-26 | @sddu-fast |
| v2.8 | 接口章节自发现提示扩展为全集块（serve-api + opencode CLI 并列） | 2026-07-26 | @sddu-fast |
| v2.9 | sessions 加 --grep/--limit/--full 参数 + 文档说明会话数据全局共享 | 2026-07-26 | @sddu-fast |
| v3.0 | sessions 默认 limit 从 20 改为 5 | 2026-07-26 | @sddu-fast |
| v3.1 | 新增人工运维脚本 `scripts/server/`（restart.cjs / stop.cjs / attach.cjs，人用，CJS 人类友好输出）；分层约定：server/ 人用 vs serve-api.cjs Agent 用 | 2026-08-12 | @sddu-fast |
