# dsh 基础能力调研报告

> 调研对象：@deepseek-ai/dsh v0.1.2-rc.1（DeepSeek 官方 agent 框架，本地安装）
> 方法：源码 lib/ + node_modules/@deepseek-ai/* 全部包 README 实测
> 日期：2026-09-06
> 目的：为 web-cli-base 孵化提供"agent 基础能力"参考输入

---

## 1. 定位与架构

**dsh 是 DeepSeek 官方的插件化 agent 框架**。核心架构：

- **Launcher + Profile（配置档）**：`dsh` 是唯一启动器，`--profile <name>` 启动不同形态——`acp`（ACP stdio 服务）、`headless`（一次性任务）、`sdk`（JSON-RPC stdio 服务）、`sdk-minimal`（最小 agent）、`web`（Web 应用）、`tui`（终端）
- **插件化**：基于 **cordis**（插件容器），profile = 有序插件 bundle 栈 + 用户 override 层（`cordis.patch.yml`）
- **分包设计**：`@deepseek-ai/dsh-*` 按职责拆成 30+ 包（工具、agent、会话、SDK 协议、MCP 客户端、Web app 等）
- **多消费形态**：CLI / headless / ACP / SDK(JSON-RPC) / Web——一套内核多端

---

## 2. 基础工具清单（按功能包分组）

### 文件系统（dsh-tool-fs）
| 工具 | 作用 |
|------|------|
| `read` | 读文件（带行号） |
| `read_image` | 读图片（需模型声明图像输入） |
| `write` | 原子创建/替换文件 |
| `edit` | 精确字面替换（**read-before-edit 策略独立插件**：`dsh-fs-observation-policy`，可省略） |

### 文件发现（dsh-tool-fs-search）
| 工具 | 作用 |
|------|------|
| `glob` | 模式匹配找文件 |
| `grep` | 内容搜索（**内置 ripgrep 二进制**，无需宿主装 rg） |

### 编辑（dsh-tool-str-replace-editor）
| 工具 | 作用 |
|------|------|
| `str_replace_editor` | **Claude Code 风格单编辑器**：`view`（带行号查看）/ `create` / `str_replace` / `insert`，绝对路径 |

### 执行（dsh-tool-bash / dsh-tool-bash-persistent / dsh-tool-pwsh）
| 工具 | 作用 |
|------|------|
| `bash`（一次性） | 每次全新 shell，无状态残留；`run_in_background` 后台任务 |
| `bash`（持久） | **owner-scoped PTY**：cwd/变量/函数/后台任务跨调用存活，每 agent 独立 shell |
| `pwsh` | PowerShell 变体（一次性/持久） |

### 网络（dsh-tool-web）
| 工具 | 作用 |
|------|------|
| `web_search` | 网页搜索（**有搜索！**，opencode 没有） |
| `web_fetch` | 抓取页面（HTML 转 markdown，去 active/hidden 内容，外部内容标记 untrusted） |

### 任务编排（dsh-tool-subagent / dsh-tool-workflow / dsh-tool-todo / dsh-tool-jobs）
| 工具 | 作用 |
|------|------|
| `subagent` | 子 agent 委派（one-shot 等待 / continuable 后台 + 持久 child id） |
| `workflow` | **JS 编排脚本**：扇出子 agent 直到脚本返回值 |
| `todo_write` | 结构化任务清单（跨 turn 存活，whole-list 替换） |
| `job_output` / `job_list` / `job_kill` | 后台任务统一控制（bash 后台/PTY/subagent 都走同一 jobs 接口） |

### 目标/技能/交互
| 工具 | 作用 |
|------|------|
| `get_goal` / `create_goal` / `update_goal` | **持久目标服务**（长任务目标管理，权限在执行时强制） |
| `skill` | 技能目录 + 按名加载（会话开始给 catalog，可 `/name` 直接注入） |
| `ask_user_question` | 向用户提问（`{answers: [...]}` 规范形状，Web 端通过 Remote Events 收集） |

---

## 3. 设计亮点（对 web-cli-base 最有价值的）

### 3.1 工具分层与可组合性
每个工具是**独立插件包**，可单独启用/禁用/替换后端：
- `dsh-tool-fs`（读改写）与 `dsh-tool-fs-search`（发现）**拆分**——读与搜解耦
- 一次性 bash 与持久 bash **并存**——按需组合
- 同一执行契约可换不同 transport（如 subagent 换后端不改契约）

### 3.2 read-before-edit 策略可插拔
dsh 把"必须先读才能改"做成**独立策略插件**（`dsh-fs-observation-policy`），不内置在 fs 工具里——部署方自选是否强制。比 opencode 的硬性前置更灵活。

### 3.3 双编辑范式并存
`dsh-tool-fs` 的 read/write/edit 套件 **和** `str_replace_editor`（Claude Code 风格单工具多操作）两种范式都提供，按部署口味选择。

### 3.4 任务/目标/作业三件套
- **todo_write**：会话内任务清单（浅层）
- **goal 服务**：跨会话持久目标（深层，含 create/get/update + 权限强制）
- **jobs 统一接口**：所有后台工作（bash/PTY/subagent）统一 job_output/job_list/job_kill

### 3.5 web 工具完整（搜索+抓取都有）
对比 opencode 只有 webfetch，dsh 的 `web_search` + `web_fetch` 是标配，且对外部内容做 untrusted 标记、HTML 清洗。

### 3.6 权限/安全
- **sandbox 可插拔**：`dsh-bash-local` / `dsh-bash-sandbox` 后端可选，沙箱下拒绝命令可带 justification 重试
- **授权在工具层**：goal 的 create/edit 要求直接人类 turn，自动续跑只能 complete/blocked
- 非零退出**报告不失败**（agent 自己决定反应）

---

## 4. 对 web-cli-base 孵化的可借鉴点

| # | dsh 设计 | 借鉴价值 |
|---|---------|---------|
| 1 | **工具=独立插件包，可单独启停/换后端** | 工具注册与实现解耦（web-cli-base 的 CommandRouter 可对标） |
| 2 | **read-before-edit 作为可插拔策略** | 约束策略独立于工具，可部署时配置 |
| 3 | **一次性 vs 持久 bash 并存** | 有状态/无状态执行双模式 |
| 4 | **web_search + web_fetch 标配 + untrusted 标记** | 网络能力要完整，外部内容要标记 |
| 5 | **todo/goal/jobs 三层任务体系** | 任务清单(会话级) → 目标(持久) → 作业(后台统一控制) |
| 6 | **workflow JS 编排脚本** | 多 agent 扇出编排（大任务） |
| 7 | **subagent 支持 continuable 后台** | 子任务可后台运行 + 持久 id 续聊 |
| 8 | **profile 多形态**（acp/headless/sdk/web/tui） | 一套内核多消费端——web-cli-base 未来 web 化的天然路径 |
| 9 | **str_replace_editor 单工具多操作** | Claude Code 风格编辑范式可借鉴 |
| 10 | **sandbox 后端可插拔** | 安全边界可配置（web 端尤其重要） |

## 5. 一句话结论

dsh 是**最"企业级"的 agent 框架**：30+ 分包插件化、cordis 容器、工具全部独立可组合、任务/目标/作业三层体系、web 工具标配、profile 多形态（含 web app）。对 web-cli-base 孵化，dsh 的**插件化工具架构、可插拔策略、三层任务体系、多形态 profile** 是最完整的参照系——它几乎就是"web-cli-base 未来长成什么样"的答案。
