# 其他主流开源 Agent 基础能力调研（补充报告）

> 调研对象：Claude Code / Aider / OpenAI Codex / Qwen Code / Gemini CLI / Goose
> 方法：gh CLI（GitHub API）+ 官方文档抓取（联网信息）
> 日期：2026-09-06
> 目的：为 web-cli-base 孵化提供"agent 基础能力"横向参照

---

## 1. Claude Code（anthropics，Python，144k★）

**定位**：终端里的 agentic coding 工具，理解代码库 + 执行常规任务 + 处理 git 工作流。

**核心工具集**（官方文档确认）：
| 工具 | 作用 |
|------|------|
| `Bash` | shell 命令执行（21 处文档提及，最核心工具） |
| `Read` | 读文件 |
| `Write` | 写文件 |
| `Edit` | 字符串替换编辑 |
| `Glob` | 文件模式匹配（9 处文档提及） |
| `Grep` | 内容搜索 |
| `WebFetch` | 抓取 URL |
| `WebSearch` | 网页搜索（**有搜索**） |
| `Task` | 子任务委派（subagent） |
| `TodoWrite` | 任务清单 |
| `MultiEdit` / `NotebookEdit` | 多文件编辑 / Notebook 编辑 |

**独特设计：**
- **Agent Skills**：`/skills` 可发现、管理项目技能（类似 opencode SKILL.md）
- **hooks**：生命周期钩子（PreToolUse/PostToolUse 等），可拦截/审批工具调用
- **permission 模式**：plan / acceptEdits / bypassPermissions 三档 + 每工具规则
- **MCP 支持**：`claude mcp add` 挂外部工具
- **git 原生**：自动 commit、diff、revert

---

## 2. Aider（Aider-AI/aider，Python，48.7k★）

**定位**：终端 AI 结对编程（pair programming）。

**核心能力**：
| 能力 | 作用 |
|------|------|
| **Repo Map**（代码地图） | 全代码库地图，帮助大项目工作（独特设计⭐） |
| **Git 集成** | 自动 commit（有意义 message）、diff/undo |
| **图片 & 网页** | 聊天中加图片/网页做视觉上下文 |
| **copy/paste 到 web chat** | 任何 LLM 的 web 界面也能用 |
| edit/run 等 | 标准文件编辑 + 命令执行 |

**独特设计：**
- **Repo Map**：对代码库建地图（类似"代码索引"），让模型在**大项目**里也能定位——这是 aider 最标志性的能力，直接对标"上下文管理"
- **Git-first**：所有改动自动 commit，天然可回滚——**安全基线**
- **架构师/编辑双模式**：architect mode（只讨论）+ editor mode（改代码）分离

---

## 3. OpenAI Codex（openai/codex，Rust，121.8k★）

**定位**：轻量级 terminal coding agent（Rust 实现，快）。

**核心能力**（基于公开资料）：
| 能力 | 作用 |
|------|------|
| `shell` / `exec` | 命令执行 |
| `edit` | 文件编辑 |
| `apply_patch` | patch 应用 |
| `web_search` | 网页搜索 |
| `web_fetch` | 网页抓取 |
| 沙箱执行 | sandbox 运行命令（安全） |

**独特设计：**
- **Rust 实现**：启动快、内存小——"轻量"路线
- **沙箱**：命令在沙箱执行（对比 pi 的无沙箱）
- **IDE 集成**：VS Code/Cursor/Windsurf 插件
- **Cloud/Web 版**：chatgpt.com/codex（云端 agent）

---

## 4. Qwen Code（QwenLM/qwen-code，TypeScript，27.6k★）

**定位**：开源 terminal AI coding agent（阿里通义）。

**核心能力**：
| 工具 | 作用 |
|------|------|
| 标准工具集 | read/edit/bash/grep 等（类 opencode） |
| **MCP 客户端** | 挂载外部 MCP 服务 |
| **Agent 模式** | 多 agent 协作 |
| IDE 集成 | VS Code / JetBrains 插件 |
| 浏览器操作 | browser-use 类能力（部分版本） |

**独特设计：**
- **多模型支持**：Qwen 系列 + 兼容 OpenAI 协议的模型
- **全栈**：CLI + IDE + 浏览器三形态

---

## 5. Gemini CLI（google-gemini/gemini-cli，TypeScript，106.8k★）

**定位**：开源 AI agent，Gemini 能力带进终端。

**核心能力**：
| 工具 | 作用 |
|------|------|
| 标准工具集 | read/write/edit/bash/grep/glob |
| **WebSearch** | 内置 Google 搜索（Google 天然优势） |
| **WebFetch** | 网页抓取 |
| 图片理解 | 视觉输入 |
| MCP 支持 | 外部工具挂载 |

**独特设计：**
- **原生 Google 搜索**：web_search 是内置一等公民（对比 opencode 无搜索）
- **多模态**：Gemini 的视觉/长上下文能力
- **GCP 集成**：Vertex AI 支持

---

## 6. Goose（aaif-goose/goose，Rust，53.9k★）

**定位**：开源可扩展 AI agent，"goes beyond code suggestions"——安装、执行、编辑、测试。

**核心能力**：
| 工具 | 作用 |
|------|------|
| 标准工具集 | read/write/edit/bash 等 |
| **70+ MCP 扩展** | 通过 Model Context Protocol 连外部能力 |
| **15+ 供应商** | Anthropic/OpenAI/Google/Ollama/OpenRouter 等 |
| **ACP 供应商** | 用 Claude/ChatGPT/Gemini 订阅（ACP 协议） |
| **Custom Distributions** | 自定义 goose distro（预配置 provider/扩展/品牌） |

**独特设计：**
- **MCP-first 生态**：70+ 扩展全走 MCP 标准——**工具生态靠标准协议扩展**（web-cli-base 可借鉴）
- **ACP 双向**：既是 ACP 客户端又是供应商——协议互通
- **Rust 实现** + 可定制发行版

---

## 横向对比速览

| 项目 | 语言 | 文件工具 | 搜索 | 执行 | Web | 子任务 | 独特设计 |
|------|------|---------|------|------|-----|--------|---------|
| opencode | TS | read/write/edit/glob | grep | bash | webfetch | task | permission 三元组、agent markdown |
| pi | TS | read/write/edit/edit-diff/find/ls | grep | bash/pwsh | 扩展 | file-mutation-queue、project trust |
| dsh | TS | read/write/edit/str_replace | grep(ripgrep) | bash(一次性/持久) | **web_search+fetch** | 插件化、goal/jobs 三层任务 |
| Claude Code | Python | read/write/edit/glob | grep | Bash | **web_search+fetch** | **hooks 生命周期**、skills、MCP |
| Aider | Python | edit | (repomap) | run | 网页上下文 | **Repo Map**、git-first |
| Codex | Rust | edit/apply_patch | — | shell | web_search+fetch | **沙箱执行**、轻量 |
| Qwen Code | TS | 标准集 | grep | bash | — | MCP 客户端、IDE+CLI+browser |
| Gemini CLI | TS | 标准集 | grep | bash | **web_search(Google)** | 原生搜索、多模态 |
| Goose | Rust | 标准集 | grep | bash | — | **MCP-first 70+ 扩展**、ACP |

---

## 对 web-cli-base 的关键发现

1. **web_search 是主流标配**：8 个里 4 个有（dsh/Claude Code/Codex/Gemini CLI），opencode/pi 没有——**web-cli-base 应内置搜索**（web 侧尤其需要）
2. **编辑范式三选一**：字符串替换（Claude Code/openstack）、str_replace_editor 单工具多操作（dsh/Claude）、diff 编辑（pi edit-diff）——可多范式并存
3. **hooks 生命周期**（Claude Code）与 **可插拔策略**（dsh read-before-edit）是"约束注入"的两种路线——web 侧权限控制可借鉴
4. **MCP 是生态标准**：Goose 70+ 扩展全走 MCP、Qwen/Claude 都支持——web-cli-base 的扩展机制应对齐 MCP
5. **任务管理分层**：todo（会话级）→ goal（持久）→ jobs（后台）——dsh 最全
6. **Git-first 安全**（Aider 自动 commit）与 **沙箱**（Codex）是两种安全路线
7. **Repo Map**（Aider）解决大项目上下文——web-cli-base 的"文档上下文"可借鉴索引思想
