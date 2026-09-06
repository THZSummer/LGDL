# 问题挖掘报告：specs-tree-web-cli-base-v2（web-cli-base 浏览器生态位能力设计：OS→浏览器组成映射 + 浏览器原生工具集，对标 dsh 的自足 agent 框架）

> **文档定位**: SDDU 问题挖掘报告 — 以「浏览器生态位设计」公理（作者裁决，不照搬 OS 工具集）重做问题域：OS 组成 → 浏览器组成映射表、浏览器原生工具集设计域、不可承载面边界，作为 spec 阶段的输入
> **前置依赖**: F-23（specs-tree-web-cli-base-framework，phase=validated，2026-09-05 随 v0.6.0 发布）+ 调研报告 docs/research/agent-capabilities/（SUMMARY.md + reports/01~05，2026-09-06）+ 作者方向裁决（2026-09-06，生态位映射公理，见 §1.2 D-5）+ ROADMAP.md（F-13②/F-14 v1.1 线关联）
> **创建人**: SDDU Discovery Agent
> **创建时间**: 2026-09-06
> **版本**: v1.1
> **更新人**: SDDU Discovery Agent
> **更新时间**: 2026-09-06
> **更新说明**: v1.1 依据作者方向裁决（D-5：不照搬 OS 工具集，按浏览器生态位设计工具集）全篇重做——新增 OS→浏览器生态位映射表（§3.3）、浏览器工具集设计域（§3.4）、重写定位/问题清单/边界/开放点；v1.0 的「照搬 OS 工具（read/write/edit/bash/grep/glob…）」框架整体废弃

---

## 0. 本阶段说明（任务书对齐）

- **角色边界**：本阶段只做问题挖掘与现状盘点（只读），**不设计技术方案（plan 职责）、不写代码、不定义需求（spec 职责）**。§3.4 的工具候选清单与文末边界/开放点均为「问题域界定与设计域候选」，供 spec/plan 与作者裁决，非方案细节。
- **探查范围**：`packages/web-cli-base/src/`（router/delay/runner/tools/web-fetch/sleep/llm/exec 等 13 文件）、`packages/lgdl-web/src/ai/`（session/AiPanel/provider）、`packages/lgdl-web-cli/src/`（tool-entry/tools）、`packages/lgdl-web-op-cli/src/`（tool）、F-23 Feature 全过程产物、`docs/research/agent-capabilities/`、ROADMAP.md。代码事实引用 `文件:行号`；生态位映射（§3.3）为分析面，标注「知识面」不伪造代码证据。
- **方法**：①核实 F-23 后实际能力（§3.1，事实不变）；②作者裁决 D-5 落为设计公理（§1.2）；③产出「OS 组成 → 浏览器对应组成」映射表（§3.3，尽量全面）；④基于浏览器生态位界定 v2 工具集设计域（§3.4）+ 不可承载面（§3.5）；⑤与 F-23 架构衔接点（§3.6）；⑥问题清单（Q-001~Q-012）→ 边界映射 → 假设/风险 → 开放点（O-001~O-008）。无臆测代码证据。
- **输出格式**：用户自定义模板不存在；插件内置 `.opencode/plugins/sddu/templates/output/sddu-discovery.md.hbs` 存在（94 行 6 章骨架）。本文按「内置模板骨架 + F-23 discovery 先例」衔接：模板 1~6 章 ↔ 本文 §1~§7 语义对应；§0/§3 为证据基座（与 F-23 discovery 同构）。
- **上下文**：v0.6.0 已发布（2026-09-05，9 包体系，全仓测试 **583 = 582 pass + 1 skip**，ROADMAP.md:11）；F-23 框架化 validated（router/delay/runner 下沉 base）；agent-capabilities 调研 2026-09-06 落地（尚未被 ROADMAP 采纳）；本 Feature 为作者已确认立项的 v2，方向裁决 D-5 已下。

---

## 1. 问题定义

### 1.1 Feature 定位与设计范式转变（v1.1 核心）

作者的核心认知（立项背景 ②，原话口径）：**传统 agent 框架依赖操作系统，web-cli-base 依赖浏览器，因此 web-cli-base 在浏览器环境下能力薄弱，需补齐增强**。

**作者方向裁决（v1.1，推翻 v1.0 框架）**：不要照搬面向操作系统的工具集——read/write/edit/bash/grep/glob 是 **OS/文件系统生态位**的工具与语义。web-cli-base 应**面向 web 浏览器环境设计工具集**：先做「操作系统组成 → 浏览器对应组成」的生态位映射，再按浏览器生态位设计对应工具集。**切忌直接照搬 OS 工具名与语义**。

**一句话命题（v1.1）**：web-cli-base 现为「LGDL 图文档场景 5 工具 AI-CLI」（doc 内容操作 + DOM/UI 操作 + fetch + sleep + help），要成为对标 dsh 的完整自足 agent 框架，其能力设计必须落在**浏览器生态位**上——文件系统→存储/文档对象、shell→执行环境（WASM/Worker/远程）、进程/后台→Worker/任务句柄、终端 I/O→DOM/剪贴板/通知、管道→流/组合、包管理→注册表/skill/MCP、权限→Permissions API+应用级门禁。问题域集中在：**浏览器各组成生态位对应哪些 web-cli-base 原生工具、哪些 OS 能力无对应（判不可行或需代理桥）、如何接入 F-23 已定的 CommandRouter/AgentRunner 架构**。

### 1.2 作者决策（立项依据，已确认 → 非待挖问题）

| # | 决策/背景 | 出处 |
|---|----------|------|
| D-1 | 前置已完成：F-23 已交付「MVP 层」——CommandRouter + AgentRunner + DelayGate + 注册收敛（框架机制层） | 立项背景 ①（F-23 state.json notes 交付面实录） |
| D-2 | 作者核心认知：传统 agent 框架依赖操作系统，web-cli-base 依赖浏览器 → 浏览器环境下能力薄弱需补齐 | 立项背景 ② |
| D-3 | 调研报告确立能力分层：MVP 层 / 增强层 / 进阶层（SUMMARY.md:132-157）；分层思想可借鉴，具体工具不照搬 | 立项背景 ③ + D-5 |
| D-4 | 本次要补：增强层 + 进阶层，把 web-cli-base 补齐为对标 dsh 的完整自足 agent 框架 | 立项背景 ④ |
| **D-5** | **（v1.1 方向裁决）不照搬 OS 工具集**：read/write/edit/bash/grep/glob 是 OS/文件系统生态位的工具与语义；v2 先做「OS 组成 → 浏览器对应组成」生态位映射，再按浏览器生态位设计对应工具集 | 作者 2026-09-06 裁决（本版重做依据） |
| D-6 | （推论）v1.0 中「8 项 MVP 通用工具需先补」的口径随 D-5 失效：read/write/edit/bash/grep/glob/subagent/todo **不以其 OS 形态进入 v2**；其生态位以浏览器对应物重新表达（§3.3/§3.4） | D-5 派生；v1.0 O-001 关闭 |

### 1.3 核心问题与业务影响

| 核心问题 | 业务影响 | 不解决的成本 |
|---------|---------|------------|
| **能力设计范式刚切换，浏览器生态位工具集整体未定义**：现 5 工具只覆盖「LGDL 图文档 + LGDL UI + fetch + sleep + help」四个窄生态位点，浏览器其余组成（存储/检索/执行/状态/扩展/权限）零工具（Q-001/Q-002） | 「对标 dsh 的完整自足 agent 框架」无浏览器原生能力支撑；任何非 LGDL 场景装上 base 依旧无事可做 | 框架目标落空；v1.1 消费端（F-13②/F-14）拿到仍是「LGDL 专用壳」 |
| **生态位映射缺失导致能力规划无依据**：OS 组成↔浏览器组成的对应关系未系统建立，哪些可承载、哪些需代理桥、哪些判不可行无裁决基线（Q-003） | 「对标 dsh」落点悬空；spec/plan 无从判断能力边界，易滑回照搬 OS 工具或做出无宿主抽象 | 范围与深度失去锚点；返工风险 |
| **浏览器「执行/进程/文件」三大 OS 生态位无宿主**：无 shell/进程/文件系统等价物，需以 Web API（Worker/IndexedDB/OPFS/fetch/…）映射或判不可行（Q-004） | v2 的「执行域」「持久域」设计悬空——做错（假抽象）比不做更糟 | dsh 对标面中最重的三块无落点 |
| **应用级权限门禁与框架生命周期缺失**：浏览器安全模型（SOP/CSP/沙箱/Permissions API）是架构级强制，但**工具级** allow/ask/deny（OS 的 sudo/ACL 生态位）需应用层设计；现 router.dispatch 除 delay gate 外无任何钩子（Q-005） | AI 自动执行 UI 写操作/网络访问零应用级护栏；hooks（PreToolUse/PostToolUse 生态位）无处挂载 | 安全基线缺失；web 场景权限刚需（SUMMARY.md:164） |
| **无状态/任务/会话体系**：会话纯内存（AiPanel useState）、无跨 run 状态载体、无 todo/goal/jobs 浏览器宿主映射（IndexedDB/localStorage 未用）（Q-006） | 长任务、跨会话目标、后台作业、刷新恢复全部不可表达 | 与 dsh 三层任务体系代差持续扩大；浏览器持久化优势未利用 |
| **扩展生态位（skill/MCP/动态注册）缺失**：注册表仅构造时 register 平铺两段（业务/内建），无目录/命名空间/运行时加载；skill 目录、MCP（Streamable HTTP 系）零机制（Q-007） | 能力无法按标准协议扩展、按需加载；WorkBuddy 验证的「装即用」生态路线无承载 | 生态路线（SUMMARY.md:115,170）无入口 |

---

## 2. 用户画像与场景

| 用户角色 | 典型场景 | 关键痛点（原话/证据） | 当前应对方式 |
|---------|---------|-------------------|------------|
| 作者（单维护者/架构决策人） | 规划 web-cli-base v2 定位；为 v1.1 开源线（F-13②）与 F-14 生态消费端铺路 | 「不要照搬面向操作系统的工具集…要面向 web 浏览器环境设计工具集：先做『操作系统组成 → 浏览器对应组成』的生态位映射，再按浏览器生态位设计对应工具集」（D-5 裁决，原话） | 以 bash 类比逐层演进（V2 抽取 → F-23 框架化 → v2 浏览器生态位设计） |
| 未来 web-cli 消费端开发者（F-14/v1.1 线） | 装 web-cli-base 在任意网站/浏览器场景搭 AI-CLI | 现 base 只有 LGDL 场景 5 工具（§3.1）；浏览器通用能力（存储/检索/UI 自动化/网络搜索/任务）无原生工具（Q-001/Q-002） | 场景尚未出现；ROADMAP F-14 依赖协议发现机制（❌，ROADMAP.md:239） |
| LGDL Web 工作台 AI 使用者 | 让 AI 绘/改图、操作工作台 UI | 不直接感知框架缺口，但承受后果：AI 无 web_search（只能 fetch 已知 URL）、无跨会话记忆（刷新即丢）、长任务无跟踪；op-cli UI 操作无确认门禁 | 忍受；提示词兜底（PRESET_PROMPTS 把多步任务压进单条 prompt，AiPanel.tsx:38-147） |
| 下游 spec/plan/validate Agent | 消费本 discovery.md 产出 spec | 需要「浏览器生态位工具集设计域」的清晰界定与作者对开放点（O-001~O-008）的裁决 | 本文件 §3.3/§3.4/§3.5 提供设计域基线；O-001~O-008 供作者裁决 |

> 注：本 Feature 为框架能力补全，无终端用户访谈；「痛点原话」仅引用可溯源的项目内作者原话与代码/文档文案，不编造访谈记录。

---

## 3. 现状基线盘点与生态位映射（证据：文件:行号）

### 3.1 F-23 后 web-cli-base 实际能力（已核实，事实与 v1.0 一致）

**框架机制层（F-23 已交付，base 内）**：
- CommandRouter（`router.ts:102-287`）：工具注册表（业务序 Map + 内建固定序 Map :104-106）/ 统一分发 dispatch（:259-272，未注册名显式报错、执行器异常转 ok:false）/ schema 派生 deriveTools（:200-205）/ 命令文本派生 deriveCommand（:212-221）/ help 派生 listHelp/helpFor（:231-251）/ 内建自动注册（:131-135, 137-179）。
- DelayGate + Clock（`delay.ts:16-91`）：路由层命令间最小间隔（before :76-91）；钳制 [0,5000]（:33-37）。
- AgentRunner（`runner.ts:88-207`）：中性 AI-tool-workflow 循环，事件 8（:30-47）+ hooks 2（:50-55，场景级），零 react。

**工具面（lgdl-web AI 会话全部工具 = 5 个）**：
1. `lgdl-web-cli` 图内容操作——17 子命令（`lgdl-web-cli/src/tools.ts:33-40`），注册条目 `tool-entry.ts:21-44`（changed/source 原样返回）。
2. `lgdl-web-op-cli` DOM/UI 操作——19 子命令（preview-click/preview-hover/preview-zoom/page-fullscreen/export-svg/copy-source/…，`lgdl-web-op-cli/src/tool.ts:24-30`）。
3. `web-fetch`（base 内建）——fetch 原文返回，无 HTML→MD 清洗、无 untrusted 标记（`web-fetch.ts:54-79`）。
4. `sleep`（base 内建）——显式时序等待（`sleep.ts:79-109`）。
5. `web-cli-help`（base 内建）——一览/详情注册表派生（router.ts:231-251）。

**场景收敛面（lgdl-web）**：单一组装点 `session.ts:54-93`（router delayMs 600 + 注册 2 业务工具 + runAgent 装配）；AiPanel 只剩渲染与事件/钩子注入（`AiPanel.tsx:353-406`）；provider 多厂商应用态（`provider.ts:51-60`，8 厂商 + localStorage `lgdl-ai-settings` :72）。**会话消息纯 React state**（AiPanel.tsx:249-257）——刷新即失。

> **v1.1 生态位观察**：现 5 工具已覆盖的浏览器生态位点 = 「应用文档对象（docId/source 世界模型，router.ts:59-75）」「DOM/UI 自动化（op-cli）」「同源/URL fetch（web-fetch）」「时序（sleep）」「元工具（web-cli-help）」——它们是浏览器生态位下的**正确起点形态**（非 OS 工具名），但覆盖面极窄且全部绑定 LGDL 场景或平台原语。

### 3.2 现 5 工具的生态位归类（v1.1 视角）

| 现工具 | 生态位（OS 侧类比） | 浏览器生态位归属 | LGDL 特有? |
|--------|--------------------|------------------|:--:|
| lgdl-web-cli（17 子命令图操作） | 应用专属命令（对"文档"的 read/write/edit） | **应用文档对象域**（DSL source 的内容读写，docId 句柄；ToolContext.docId/source 世界模型 router.ts:71-75） | 是（内容语义 C 档） |
| lgdl-web-op-cli（19 子命令 UI 操作） | 终端 I/O/UI 自动化（点击/缩放/全屏/导出） | **DOM/UI 域**（浏览器最独特生态位——OS 侧无对应） | 是（handler 为 LGDL React 回调，C 档；机制可借鉴） |
| web-fetch | curl/wget | **网络域**（fetch API 封装；缺 HTML 清洗/untrusted 标记） | 否（base 内建，中性） |
| sleep | sleep 命令/定时 | **时序域**（setTimeout 封装） | 否（base 内建，中性） |
| web-cli-help | man/help/type | **元工具域**（注册表自举） | 否（base 内建，中性） |

### 3.3 OS 组成 → 浏览器对应组成：生态位映射表（知识面分析，D-5 产物）

> 对照原则：**生态位对生态位**——OS 组成满足的「能力位」（读写文件/执行命令/后台运行/…）在浏览器由哪些 Web API/机制满足；映射目的是界定 web-cli-base 工具的**语义落点**，不照搬 OS 工具名。○=浏览器原生可承载 ◐=受限承载（需降级语义/授权/生命周期约束） ✕=无对应（需代理桥或判不可行）。

#### A. 存储与文件系统组

| OS 组成 | OS 侧机制/工具 | 浏览器对应组成 | 承载 | web-cli-base 生态位落点 |
|---------|---------------|----------------|:--:|------------------------|
| 文件系统（层级目录/路径/权限位） | read/write/edit/ls/rm | OPFS（origin 私有文件系统，目录+句柄，worker 可同步访问）；IndexedDB（对象库/索引/事务）；**无通用路径遍历**（除 OPFS） | ◐ | 「内容/文档/资源对象」抽象：docId/URL/句柄式访问（F-23 已有 docId 隐式对象雏形 router.ts:71-75）；OPFS 为通用持久卷候选 |
| 用户可见文件 | 家目录/桌面文件 | File System Access API（showOpenFilePicker/showSaveFilePicker + FileSystemFileHandle/DirectoryHandle，**需用户手势授权**，可持久授权） | ◐ | 「用户文件」域工具（open/save/download）；每次授权 ≈ OS 的 sudo 提示 |
| 临时文件/内存文件 | /tmp、mmap | Blob/File/FileReader/URL.createObjectURL | ○ | 导出/下载链（op-cli export-svg/png/source 已有先例） |
| 配置/注册表 | ~/.config、dotfiles | localStorage（同步 KV）/sessionStorage/IndexedDB；应用 Settings | ○ | 场景设置（provider.ts:72 localStorage `lgdl-ai-settings` 已有）；通用 settings 骨架候选 |
| 存储配额/GC | df/du | navigator.storage.estimate/persist；配额自动回收 | ○ | 「存储」域观测（配额查询）候选 |

#### B. 执行与进程组

| OS 组成 | OS 侧机制/工具 | 浏览器对应组成 | 承载 | web-cli-base 生态位落点 |
|---------|---------------|----------------|:--:|------------------------|
| shell/命令解释器 | bash/zsh + 内建命令 | **无 shell**；应用自身命令系统（web-cli-base CommandRouter 即浏览器里的「shell」）；WASM 模块 = 「外部命令」等价物 | ◐ | CommandRouter 已承担（F-23）；「外部命令」= WASM 工具/远程端点（lgdl serve 代理方向先例 provider.ts:54） |
| 持久 shell（PTY 状态跨调用） | dsh bash-persistent（03-dsh.md:42-47） | 无 PTY；**持久 Worker**（状态跨消息存活）可为「持久执行上下文」载体；无终端语义（TTY/列宽/ANSI） | ◐ | 「持久执行上下文」候选（worker 池/单 worker 会话）；不做 PTY 语义 |
| 进程/线程 | fork/exec/thread | Web Worker（页内并行）、SharedWorker（跨页共享）、Service Worker（独立生命周期，事件驱动，不可常驻计算）；主线程 JS | ◐ | 计算密集型工具 worker 化；后台任务载体（见 D 组） |
| 环境变量 | env/export | 应用内会话状态/配置（sessionStorage/localStorage） | ○ | 「会话上下文」域（per-run 状态已有雏形：session.ts:65 run-local source） |
| 退出码/信号 | exit code、SIGTERM | 无信号；ToolResult.ok/error 已有（router.ts:59-68） | ○ | 既有契约（ok:false + error 语义） |
| 后台作业/守护进程 | jobs/nohup/daemon/cron | **无常驻守护**；异步任务句柄（ID + 状态 + 结果）+ worker；标签页节流/休眠约束；Notification API（完成通知）、Background Sync/Periodic Background Sync（受限） | ◐ | 「jobs」域：任务句柄 + 状态查询 + 结果检索 + 取消；生命周期语义需裁剪（见 §3.5） |
| stdin/stdout 流 | 管道、重定向 | 工具入参/返回文本（已有 ToolResult.output）；Web Streams（Readable/Writable/Transform）为流式管道 | ○ | 工具结果流式（runner 事件已近似流式：onCommandLine/onToolOutput，runner.ts:33-35） |
| 调度/时钟 | cron/at | setTimeout/setInterval；Web Locks API（互斥）；Page Visibility（后台节流） | ○ | sleep 已有（sleep.ts）；调度/节流机制位 |

#### C. 网络组

| OS 组成 | OS 侧机制/工具 | 浏览器对应组成 | 承载 | web-cli-base 生态位落点 |
|---------|---------------|----------------|:--:|------------------------|
| HTTP 客户端 | curl/wget | fetch API（HTTP/1.1/2/3）；XHR（legacy） | ○ | web-fetch 已有（web-fetch.ts:67-74）；升级 = HTML→MD 清洗 + untrusted 标记（dsh 03-dsh.md:53） |
| 全双工/流式连接 | nc/WebSocket 客户端 | WebSocket（全双工）；EventSource/SSE（单向推送）；WebRTC DataChannel（P2P） | ○ | 「实时连接」域候选（场景需要时）；WebStreams 响应体 |
| 域名解析/套接字 | DNS/getaddrinfo/原始 socket | **无控制权**（浏览器自动解析）；无原始 TCP/UDP | ✕ | 判不可行（无 API）；仅经 fetch/WS 抽象 |
| 网络搜索 | 搜索引擎 API | 无原生搜索；外部搜索服务（HTTP API） | ◐ | 「web-search」域候选（需服务端点/key——LGDL 侧无内置服务；中立框架自带端点问题见 O-007） |
| 下载/上传 | wget 下载、scp | `<a download>` + URL.createObjectURL；showSaveFilePicker；`<input type=file>`/showOpenFilePicker | ○ | 导出/下载已有先例（op-cli export-source 2026-09-06 提交 c12b5e4）；通用化候选 |
| 跨域访问 | 无（OS 全权） | **同源策略（SOP）+ CORS**；CSP（内容安全策略） | ✕(限制) | 架构级约束：跨域需服务端配合/代理；web-fetch 同源优先语义已含（tools.ts:26-28） |

#### D. 权限与安全组

| OS 组成 | OS 侧机制/工具 | 浏览器对应组成 | 承载 | web-cli-base 生态位落点 |
|---------|---------------|----------------|:--:|------------------------|
| 用户权限（文件位/ACL/sudo） | chmod/sudo/ACL | **无工具级权限原生等价**；Permissions API 仅查询少量类型（navigator.permissions.query）；实际授予靠**用户手势**（文件句柄/通知/剪贴板/摄像头…） | ◐ | **应用级工具权限门禁**（allow/ask/deny 三元组——opencode 01-opencode.md:62-72 的生态位，非工具而是横切机制）需框架设计；ask UI 归场景 |
| 沙箱/隔离 | 容器/seccomp/VM | 浏览器渲染进程沙箱（架构级）；iframe sandbox 属性；跨域隔离（COOP/COEP）；CSP | ○ | 架构已强制；工具层无需重复（记录即可） |
| 内容可信标记 | （无对应） | **无原生机制**；dsh 对外部内容标记 untrusted（03-dsh.md:53）是框架约定 | ◐ | 「内容可信」约定（web-fetch 等网络工具输出标记外部内容）候选 |
| 敏感能力授权 | 密码/钥匙串 | Permissions API（navigator.permissions.query 仅少数）；各 API 自带用户手势授权（getUserMedia/geolocation/clipboard/Notification/FileSystemAccess） | ◐ | 浏览器 API 级权限由浏览器弹窗承担；应用需感知「授权失败/被拒」并转友好错误 |
| 内容安全策略 | SELinux 等 | CSP（script-src/connect-src/…）；Trusted Types | ○ | 架构级；影响 fetch 端点与动态加载（skill/MCP 端点需过 CSP）——扩展域设计约束 |

#### E. 终端 I/O 与交互组

| OS 组成 | OS 侧机制/工具 | 浏览器对应组成 | 承载 | web-cli-base 生态位落点 |
|---------|---------------|----------------|:--:|------------------------|
| 终端/显示器 | TTY/ANSI/屏幕 | DOM/CSSOM 渲染（React 组件）；BOM（window/document）；Canvas/SVG 预览；ResizeObserver/MatchMedia | ○ | 消息渲染面已有（AiPanel）；预览渲染 = lgdl-render（C 档） |
| 键盘/鼠标/指针 | 输入设备 | DOM 事件（click/pointer/keydown/…）；Pointer Events | ○ | **DOM/UI 自动化域**（op-cli preview-click/preview-hover 先例 tool.ts:28-29）——浏览器最独特生态位，OS 侧无对应 |
| 用户交互提示 | read -p/确认框 | window.prompt/confirm（受限）；应用自定义 UI（React 弹层） | ○ | 「ask-user/澄清」域候选（对齐 dsh ask_user_question 03-dsh.md:68 的生态位） |
| 剪贴板 | xclip/pbcopy | Clipboard API（navigator.clipboard.read/write，**需权限/手势**）；document.execCommand（legacy） | ◐ | 「剪贴板」域候选（op-cli copy-source 已有应用内形态） |
| 通知/提醒 | 桌面通知 | Notification API（**需授权**） | ◐ | 「通知」域候选（长任务完成提醒——配合 jobs 域） |
| 音视频 I/O | ALSA/PulseAudio | getUserMedia/Web Audio/MediaRecorder | ◐ | 场景可选（非 agent 通用核心） |
| 设备/传感器 | 驱动层 | Geolocation/DeviceOrientation/Gamepad/USB/Serial/Bluetooth Web API（均需权限，部分仅安全上下文+Chromium） | ◐ | 场景可选；判「非 v2 通用工具面」 |

#### F. 进程间通信与元机制组

| OS 组成 | OS 侧机制/工具 | 浏览器对应组成 | 承载 | web-cli-base 生态位落点 |
|---------|---------------|----------------|:--:|------------------------|
| IPC/管道 | pipe/socketpair/共享内存 | postMessage/MessageChannel/BroadcastChannel（同源跨文档/worker）；SharedArrayBuffer（需跨域隔离） | ○ | runner/dispatch 的事件流（runner events/hooks）已近似；worker 通信候选 |
| 包管理/插件 | apt/npm/插件系统 | **无运行时系统包管理**；ES module（静态/动态 import()/import maps）、CDN 加载；应用注册表 = 插件位 | ◐ | **扩展生态位**：CommandRouter.register 已有（router.ts:182-188）+ skill 目录 + MCP（Streamable HTTP）候选；运行时动态注册/命名空间缺失（Q-007） |
| 动态库/原生码 | .so/.dll | WebAssembly 模块（WASI 提供部分 POSIX 面，浏览器内受限） | ◐ | WASM 工具（如 rg-wasm/sqlite-wasm）作为「外部命令」等价物候选 |
| 日志 | syslog/journald | console/应用内日志/IndexedDB 日志存储 | ○ | 「观测」域候选（工具级 trace 缺失，Q-010） |
| 会话/崩溃恢复 | 会话管理器 | sessionStorage/IndexedDB 持久 + 页面重载恢复（应用自己实现）；beforeunload/Page Lifecycle | ◐ | 「会话持久/恢复」域候选（现纯内存 AiPanel.tsx:249-257，刷新即失） |
| 加密/随机 | /dev/urandom、OpenSSL | Web Crypto（crypto.subtle/subtle 仅安全上下文） | ○ | 场景按需 |
| 用户身份 | OS 账户/login | Cookie/localStorage token/OAuth/WebAuthn（Passkey） | ◐ | provider key 管理已有（provider.ts:72）；无 OS 账户概念 |
| 代码搜索/索引 | ripgrep/ctags | 无文件树；**应用可及内容集**（文档/examples/guide/README）可索引（fetch 后内存/缓存） | ◐ | 「检索/索引」域候选（Aider Repo Map 思想 04:45,52 应用到文档/资源集；grep/glob 的 OS 语义**不照搬**——语义对象是「内容集」非「文件路径」） |

> 映射结论（问题化）：**浏览器原生可承载面 = 存储(OPFS/IDB/localStorage) + 网络(fetch/WS/SSE) + DOM/UI + Worker 执行/后台 + 流/事件 + 剪贴板/通知/文件句柄 + WebAssembly + 应用注册表**；**不可承载面 = 真 shell/PTY、OS 进程与信号、原始套接字/DNS、本地文件树通用读写、stdio 管道、常驻守护、系统包管理**——后者按「判不可行记录」或「代理桥（本地/服务端，先例 provider.ts:54 lgdl serve 方向）」处理（O-002）。

### 3.4 web-cli-base v2 工具集设计域（浏览器原生工具候选清单，供作者/spec 裁决）

> 按浏览器生态位分域（D-5：生态位对生态位，**非** OS 工具名照搬）；域内候选为**设计域界定**，工具名/契约留 spec。

| 设计域 | 生态位（OS 侧类比） | 浏览器原生工具候选（语义锚点） | 现况/备注 |
|--------|--------------------|-------------------------------|----------|
| **内容/文档域** | fs read/write/edit 的生态位（**对象=应用文档/资源，非文件路径**） | `doc-read/doc-write/doc-edit`（docId/URL 句柄 → 文本内容读改写；文本编辑原语如 str_replace 是「内容层」操作，不依赖文件系统）；LGDL 场景已有 lgdl-web-cli 承担（C 档），base 提供**通用文档对象抽象**候选 | ⚠️ 对象模型（docId 句柄 / OPFS / 用户文件三档边界）待裁（O-001） |
| **存储域** | 持久卷/配置 | `storage`（OPFS/IndexedDB：list/read/write/remove/quota）；`settings`（通用 KV 配置，lgdl-web provider 应用态上收候选——F-23 NG-004 曾裁留场景，v2 可复议） | ❌ 全缺；lgdl-web 仅 localStorage 存 provider 设置（provider.ts:72） |
| **检索域** | grep/glob/Repo Map 的生态位（**对象=可及内容集**） | `search-content`（应用文档/资源集全文搜索，含索引）；`list-resources`（可及内容目录：同源资源/文档 id——web-cli-help 已覆盖「工具目录」，此为新「资源目录」） | ❌ 全缺；grep/glob 的 OS 路径语义不进入 v2（D-5） |
| **网络域** | curl/wget/搜索 | `web-fetch`（已有，升级：HTML→MD 清洗 + untrusted 标记）；`web-search`（外部搜索服务，需端点裁决）；`download/save`（File System Access 存用户文件）；`ws/eventsource`（实时，可选） | ⚠️ web-fetch 已有（web-fetch.ts:67-74，原文返回）；web-search 缺（Q-008） |
| **DOM/UI 自动化域** | 终端 I/O/UI 自动化（浏览器独有） | 通用 `dom-*`（click/hover/scroll/zoom/fullscreen/read-dom-state…）——op-cli 19 子命令是其 LGDL 形态先例（tool.ts:24-30）；**与 F-14 插件（驱动任意网站）边界待裁**（O-008）；`ask-user`（澄清/选择，dsh ask_user_question 生态位 03-dsh.md:68）；`notify`（Notification API）；`clipboard` | ⚠️ op-cli（LGDL 形态）已有；通用 DOM 域是否 v2 做待裁 |
| **执行/计算域** | shell/外部命令的生态位 | `eval-js`/`eval-wasm`（沙箱执行 JS/WASM——浏览器原生「进程」替代位）；`exec-remote`（远程执行端点，代理桥形态）；持久执行上下文（worker 会话，状态跨调用） | ❌ 全缺；真 bash 判不可行（Q-004/O-002） |
| **任务/状态域** | todo/goal/jobs/子任务的生态位 | `todo`（会话级任务清单）；`goal`（跨会话持久目标，IndexedDB 宿主）；`jobs`（异步任务句柄：启动/查询/结果/取消——worker 或异步任务 + 状态存储）；`subagent`（**子会话**——同线程嵌套 AgentRunner，浏览器无进程隔离但可会话隔离）；`workflow`（脚本编排多工具/多子会话扇出） | ❌ 全缺（Q-006）；dsh 三层任务体系（03-dsh.md:86-89）的浏览器载体 |
| **扩展生态位** | 包管理/插件 | `skill`（skill 目录加载：SKILL.md → 注册工具/注入提示，05:30-44）；MCP 客户端（**Streamable HTTP/SSE transport**——stdio 不可承载，作为工具注册源动态进 router）；运行时注册（register 已有 router.ts:182-188 + 命名空间/卸载扩展） | ❌ 全缺（Q-007）；注册表需目录/命名空间扩展 |
| **会话/上下文域** | 会话管理/上下文压缩 | `session`（会话持久化/恢复，IndexedDB 存消息与状态）；`context`（摘要/压缩——上下文膨胀管理） | ❌ 现纯内存（AiPanel.tsx:249-257，Q-006） |
| **元/时序域** | help/sleep/时钟 | `web-cli-help`（已有）；`sleep`（已有）；框架级 hooks/权限门禁（横切，非工具，见 Q-005） | ✅ web-fetch 外两内建已有（router.ts:131-135） |

> 设计域工具集合计（候选口径）：**~9 域 25+ 工具候选**——v2 不可能全收，需按域裁剪波次（O-001/O-008 拆分裁决）。

### 3.5 浏览器不可承载面（需代理桥或判不可行；§3.3 的 ✕/受限收敛）

| OS 能力 | 浏览器限制 | 处理裁决候选 | 关联 |
|---------|-----------|-------------|------|
| 真 shell / bash / PTY（一次性+持久） | 无 OS 进程宿主；无终端语义 | 判不可行（记录）；或「代理桥」= 本地/服务端执行端点（先例 lgdl serve 方向 provider.ts:54）→ O-002 | Q-004 |
| 本地文件系统通用读写（路径语义 read/write/edit/grep/glob/bash） | SOP + 无文件树；仅 OPFS（origin 私有）+ File System Access（用户手势） | 路径语义判不可行；改为 docId/句柄/OPFS 语义（§3.4 内容/存储/检索域）→ D-5 已裁 | Q-001/Q-004 |
| 原始套接字 / UDP / DNS 控制 / 任意 TCP | 无 Web API | 判不可行；仅 fetch/WS/SSE 抽象 | §3.3 C 组 |
| MCP stdio transport | 无子进程/stdio | 不可承载；改 Streamable HTTP/SSE → O-006 | Q-007 |
| 常驻守护进程 / cron 级精确调度 | 标签页生命周期（节流/休眠/关闭）；Service Worker 事件驱动、不可常驻计算 | 语义降级：任务句柄 + 页面存活期执行 + Notification 完成通知；跨页面存活需服务端 → O-004 | Q-006 |
| 系统包管理（apt/npm 运行时装原生工具） | 无系统级安装 | 不可承载；WASM 模块/ES module/远程端点为「外部命令」等价物 | §3.3 F 组 |
| git 本地仓库 / ripgrep 等原生二进制 | 无本地进程 | git 场景按需走远程 API；rg → WASM 化 | §3.4 检索域 |
| 跨域任意访问 | SOP/CORS/CSP | 架构约束；同源优先 + 服务端代理 | §3.3 C 组 |
| 摄像头/麦克风/定位/蓝牙/USB/串口 | 需权限+手势，部分仅安全上下文 | 判「场景可选，非 v2 通用工具面」 | §3.3 E 组 |

### 3.6 F-23 架构衔接点（新能力挂载候选面，供 spec 界定）

- **ToolEntry 已含扩展位**（name/summary/schema/prefix/executor/help/delayMs/listed，router.ts:39-56）——所有新域工具以注册条目形态进入即得 schema/help/dispatch/delay（FR-001~005「注册即得」链）。
- **无目录/命名空间/运行时加载**：注册表 = 业务 Map + 内建 Map 两段平铺（router.ts:104-106）——skill/MCP 展开的动态工具集、按需开闭无承载位（Q-007/Q-009）。
- **runner hooks 是唯一「生命周期」落点**（intercept/onToolDone，runner.ts:50-55，场景注入 AiPanel.tsx:388-405）——权限门禁/审计/上下文增强等框架级 PreToolUse/PostToolUse 生态位需在 router.dispatch 或 runner 增框架级钩子/策略面（Q-005）。
- **世界模型 = 「文档态」**：ToolResult.changed/source + ToolContext {docId/source}（router.ts:59-75）——浏览器「内容/文档」生态位天然契合（§3.2 归类）；但任务/目标/会话等新状态载体无表达位（Q-006）。
- **dispatch 同步内存查找 + delay gate**（router.ts:259-272）——无异步初始化/工具预热/后台任务句柄概念（jobs 域需扩展）。
- **会话装配 = lgdl-web 私有**（session.ts:54-93）——多形态内核（headless/worker/子会话）需把「装配」中性化（Q-012/O-008）。
- **base 内建「注册即得」先例** = 新浏览器原生工具可直接进 base 内建（如 storage/search-content/web-search 若裁为中性与工具），自动置末顺序契约（FR-005，router.ts:199）。

---

## 4. 问题清单与缺口（v1.1 重做：浏览器生态位框架）

### 4.1 核心问题（影响面大、直接阻断「浏览器生态位自足 agent 框架」目标）

| ID | 问题描述 | 影响范围 |
|----|---------|---------|
| Q-001 | **浏览器生态位工具集整体未定义**：D-5 已裁「不照搬 OS 工具」，但浏览器各组成生态位（存储/检索/网络搜索/UI 自动化/执行/任务/扩展，§3.4 九域 25+ 候选）尚无设计裁决与实现；现 5 工具只覆盖 4 个窄生态位点且 LGDL 绑定（§3.1/§3.2） | 全部未来消费方；「对标 dsh」无浏览器原生能力支撑 |
| Q-002 | **能力设计范式刚切换，v1.0 口径全部作废待重估**：read/write/edit/bash/grep/glob/subagent/todo 的 OS 形态不进入 v2（D-6）；其生态位等价物（内容/存储/检索/执行/任务域）需要按浏览器语义全新设计——「哪些域、什么语义对象」无裁决 | v2 范围主干（O-001 首裁） |
| Q-003 | **生态位映射未文档化/未共识**：OS→浏览器组成对应关系（§3.3 为首次系统化初稿）未经作者确认；映射边界（◐ 受限项）直接影响能力规划依据 | spec/plan 锚点；返工风险 |
| Q-004 | **浏览器「执行/文件/进程」三大 OS 生态位无宿主，等价物未定**：真 shell/PTY/本地文件树/OS 进程判不可行（§3.5），可承载等价物（OPFS/worker/子会话/WASM/远程端点）与代理桥（lgdl serve 方向）取舍未裁 | 执行/计算域与任务域的设计落点（O-002/O-004/O-005） |
| Q-005 | **应用级权限门禁与框架级生命周期缺失**：浏览器安全模型（SOP/CSP/沙箱/Permissions API）是架构级强制，但**工具级 allow/ask/deny**（OS sudo/ACL 生态位，opencode 01-opencode.md:62-72）需应用层设计；router.dispatch 除 delay gate 外无钩子（router.ts:259-272），runner hooks 仅场景级（runner.ts:50-55）——增强层 hooks/权限生态位无落点 | web 场景权限刚需；AI 自动执行 UI/网络写操作零应用级护栏 |
| Q-006 | **无状态/任务/会话体系，浏览器持久化优势未利用**：会话纯内存（AiPanel.tsx:249-257，刷新即失）；无 todo/goal/jobs 的浏览器载体（IndexedDB/localStorage 未用于状态）；无跨 run 状态（session.ts:66 每次新建 runner） | 长任务/跨会话/后台作业/恢复全部不可表达；dsh 三层任务体系代差 |
| Q-007 | **扩展生态位（skill/MCP/动态注册）缺失**：注册表构造时 register 平铺（router.ts:182-188,104-106），无目录/命名空间/运行时加载；skill 目录、MCP（stdio 不可承载 → Streamable HTTP）零机制；WorkBuddy「装即用」生态路线无入口 | 生态路线（SUMMARY.md:115,170）；v1.1 协议发现机制前置雏形面 |

### 4.2 次要问题（影响中等 / 核心问题的衍生）

| ID | 问题描述 | 影响范围 |
|----|---------|---------|
| Q-008 | **网络域单薄且缺 web 侧核心项**：web-fetch 原文返回、无 HTML→MD 清洗、无 untrusted 标记（web-fetch.ts:67-74；dsh 做法 03-dsh.md:53）；web-search 全缺（8 框架 4 个标配 04:157；SUMMARY.md:69 明示网络是 web 侧核心必补）——搜索端点/服务归属待裁（O-007） | web 场景核心能力 |
| Q-009 | **schema 供给膨胀风险（无分组/按需开闭）**：deriveTools 全量派生（router.ts:200-205）单数组无分组；新增多域工具后冲击 FR-005 顺序契约（业务前置末=内建）与 tool_choice 优先序（F-23 spec A-006） | schema 质量/上下文预算/工具开关模型（O-007） |
| Q-010 | **观测/调试/验证面不足 + F-23 真实闭环遗留**：仅 delay stats（delay.ts:39-44）一项观测；无工具级 trace/会话重放。F-23 validate 遗留 ⏭️（真实 AI 闭环 AC-008 + testConnection，validate-report.md:181-183）——浏览器原生工具（存储/UI/权限 ask 交互）必须真实浏览器闭环才可验证 | v2 行为验证；回归风险 |
| Q-011 | **LGDL 场景接入面未定义**：新域工具（web-search/storage/skill/MCP/通用 dom-*）在 lgdl-web 是否默认注册、key/端点来源、权限 ask UI 归属、skill 内容来源（打包 vs 运行时）——场景接入未定义则工具「做了没人用」 | lgdl-web 消费价值兑现（O-007） |

### 4.3 潜在问题（影响小但可能恶化 / 信息不足待验证）

| ID | 问题描述 | 影响范围 |
|----|---------|---------|
| Q-012 | **多形态内核与 F-14 边界未裁**：base 现仅被 lgdl-web React 场景绑定消费（session.ts + AiPanel），无 headless/worker/子会话形态；「通用 DOM 自动化域」若泛化（§3.4）即触碰 F-14 web-cli-plugin（驱动任意网站，ROADMAP.md:233-245，协议发现机制 ❌ :239）——v2 做多少、留多少给 v1.1 需裁决 | 架构演进次序（O-005/O-008） |
| Q-013 | **调研报告分层（增强/进阶）在浏览器生态位下的再诠释未完成**：增强层（str_replace_editor/持久 bash/skill/MCP/hooks）与进阶层（goal/jobs/workflow/Repo Map/profile）的 OS 形态部分不可承载（§3.5），其浏览器等价物分域映射（§3.4 候选）待作者确认；「对标 dsh」基准（能力矩阵 SUMMARY.md:14-29 vs 逐域对齐）未定 | 验收口径；范围蔓延（O-008） |

### 4.4 边界界定初步映射（spec 输入；非方案）

**→ base 承接（候选 in，按生态位域裁剪裁决后）**
- 横切机制：应用级权限门禁（allow/ask/deny 挂 router dispatch / runner 框架级钩子，Q-005）、框架级 hooks（PreToolUse/PostToolUse 生态位）、工具注册表目录/命名空间/运行时注册扩展（Q-007）；
- 浏览器原生工具域（§3.4 候选，按 O-001/O-008 裁剪）：存储域（OPFS/IndexedDB）、检索域（内容集搜索/资源目录）、网络域（web-fetch 升级 + web-search）、任务状态域（todo/goal/jobs 的 IndexedDB/worker 载体）、会话持久域、扩展生态位（skill 目录 + MCP Streamable HTTP）；
- 内建工具「注册即得」链路沿用（FR-001~005，新域工具进 base 内建自动置末）。

**→ 场景侧（lgdl-web / 作者裁决）**
- 权限 ask 交互 UI、MCP 服务器配置 UI、新工具默认注册开关、web-search 端点与 key 管理（provider 应用态扩展面；F-23 NG-004 曾裁留场景，v2 复议位 O-007）；
- LGDL 特有语义（C 档：lgdl-web-cli 内容语义、op-cli DOM handler、语言引擎、场景内容）不动；op-cli 是 DOM/UI 自动化域的 LGDL 形态先例（§3.2）。

**→ 明确不做 / 天然不可承载（out，§3.5）**
- 真 shell/PTY、本地文件树路径语义工具（D-5 已裁）、原始套接字/DNS、stdio MCP、常驻守护、系统包管理——判不可行显式记录；代理桥（本地/服务端执行、HTTP MCP）为独立裁决项（O-002/O-006）；
- F-14 协议发现/声明机制与插件运行时（v1.1 线内，ROADMAP.md:239——不预设立场、不抢跑）；
- 开源决策（F-13②，作者待定）。

---

## 5. 竞品参考（事实记录，生态位设计视角，不做方案评价）

| 竞品/参照 | 是否处理过类似问题 | 处理方式（事实，生态位视角） | 与我们场景的差异 |
|----------|-------------------|----------------------------|----------------|
| dsh（作者对标对象） | 是（完整插件化 agent 框架） | **按生态位分包的插件架构**：fs / fs-search / str-replace-editor / bash(一次性+持久) / web(搜索+抓取) / subagent / workflow / todo / jobs / goal / skill（03-dsh.md:21-68）；工具=独立插件包可单独启停/换后端（:74-78）；read-before-edit 独立策略插件（:80-82）；profile 多形态 acp/headless/sdk/web/tui（:12-17） | dsh 生态位 = **本地进程 + 文件系统 + PTY**；其分包思想可借鉴，但 fs/bash/PTY 工具是 OS 生态位语义——浏览器需按 Web API 重新映射（§3.3），**不可照搬**（D-5） |
| opencode | 是 | 权限三元组 allow/ask/deny + pattern 规则 + external_directory 越界守卫（01-opencode.md:60-145）；agent markdown 定义（:191-206）；8 内置 agent 分层（primary/subagent，:158-171） | 本地 CLI harness；其**权限模型**是「工具级门禁」生态位参照（浏览器应用层需自建）；agent 分层 = 子会话生态位参照 |
| Claude Code | 是 | hooks 生命周期 PreToolUse/PostToolUse（04:31-33）；skills；MCP（claude mcp add，04:33）；web_search+fetch（04:146） | hooks/MCP/skill 是**机制生态位**参照（与宿主无关可借鉴）；其 OS 工具集同为 OS 生态位不照搬 |
| Aider | 是 | Repo Map 代码索引（04:45,52）；git-first（04:53-54） | 索引**思想**可映射到「文档/内容集」（§3.4 检索域）；git-first 依赖本地 git，web 场景判不可承载（SUMMARY.md:164） |
| Goose | 是 | MCP-first 生态：70+ 扩展全走 MCP（04:127-134） | MCP 是生态标准参照；浏览器需 Streamable HTTP（stdio 不可承载） |
| WorkBuddy | 是 | SKILL.md + frontmatter（allowed-tools 技能级权限）+ mcp.json 连接器 + 市场分发（05:23-44） | 桌面 agent 市场路线；skill 格式与技能级权限是「扩展生态位」参照；浏览器侧 skill 内容来源不同（O-007） |
| 仓库先例：F-23 web-cli-base 框架化 | 部分（机制层已交付） | CommandRouter（ToolEntry 单一数据源/派生/dispatch）+ AgentRunner + DelayGate（router.ts/delay.ts/runner.ts）——**机制与宿主无关** | 已交付机制层 = 浏览器原生工具与横切机制（权限/hooks/动态注册）的挂载基座（§3.6） |

> 注：以上只记录事实与差异，不推导「我们应该怎么做」（方案评估是 plan 职责）；「借鉴分层/生态位思想而非照搬工具」为 D-5 已裁方向。

---

## 6. 假设与风险

### 6.1 关键假设

| # | 假设内容 | 验证方式 |
|---|---------|---------|
| A-001 | §3.3 的 OS→浏览器生态位映射覆盖了 v2 所需主要组成（存储/执行/网络/权限/IO/元机制六大组），可作为能力规划基线 | 作者对映射表评审（O-003 前置）；spec 阶段按域核验遗漏 |
| A-002 | F-23「注册即得」链（ToolEntry → schema/help/dispatch/delay）可平滑承载新域工具与动态注册（目录/命名空间），无需重写注册模型 | spec 阶段评估 ToolEntry 扩展面与 FR-001~005 兼容性 |
| A-003 | 浏览器原生可承载面（OPFS/IndexedDB/worker/fetch/Streamable HTTP/子会话等）足以支撑「对标 dsh」的机制等价（分层/任务/扩展），无需 OS 桥即可达 v2 目标主体 | §3.4 候选按域试点验证（O-001~O-006 裁决后） |
| A-004 | lgdl-web 场景对新域工具（web-search/存储/任务/skill）有真实消费价值，浏览器持久化（会话恢复/跨会话目标）对 AI 工作台体验为正 | 真实 AI 实战闭环（F-23 遗留 ⏭️ validate-report.md:183）+ v2 场景试点 |
| A-005 | D-5 裁决下「对标 dsh」= 对齐**分层与生态位覆盖度**（每生态位有浏览器原生工具），而非工具名/数量对齐 | spec 验收口径（O-008 基准裁决） |

### 6.2 主要风险

| # | 风险描述 | 影响程度 |
|---|---------|---------|
| R-001 | **范围蔓延**：§3.4 九域 25+ 工具候选 + 横切机制（权限/hooks/动态注册）若全收单 Feature，容量爆表——需域裁剪与波次拆分（O-001/O-008） | 高 |
| R-002 | **浏览器约束误判**：把 OS 机制强行 web 化（无宿主假抽象）或把可承载能力误判不可行——映射表（§3.3）的 ◐/✕ 判定需试点验证 | 高 |
| R-003 | **schema 膨胀冲击既有契约**：多域工具全量进 deriveTools（router.ts:200-205）→ tool_choice 优先序漂移、上下文膨胀、AI 行为回归（Q-009，FR-005/AC-006 面） | 中 |
| R-004 | **与 F-14/v1.1 抢跑或重复**：通用 DOM 自动化、多形态内核、协议发现若在 base 先行（Q-012），F-14 立项时被迫在开源前定「半标准」（ROADMAP.md:233-245） | 中 |
| R-005 | **行为回归不可见**：F-23 真实 AI 闭环 ⏭️ 遗留未闭合即叠加权限门禁/新工具——现 5 工具 AI 闭环等价性无人工基线（validate-report.md:181-183） | 中 |
| R-006 | **新域工具无消费方**：lgdl-web 接入面未定义（端点/key/开关/ask UI，Q-011）则工具「做了没人用」 | 低 |
| R-007 | **「对标 dsh」基准漂移**：dsh 为 30+ 分包本地框架；浏览器生态位映射后能力面形状不同——按「分层+生态位覆盖」还是「矩阵对齐」（SUMMARY.md:14-29）验收未裁则口径摇摆 | 中 |

### 6.3 待确认开放点（需作者裁决，供 spec 输入；v1.1 依 D-5 重排）

| # | 开放点 | 关联问题 |
|---|--------|---------|
| O-001 | **首批工具域裁剪与内容对象模型**：§3.4 九域（内容/存储/检索/网络/DOM/执行/任务/扩展/会话）中 v2 首批做哪些域？「内容/文档」域的对象模型三档边界（应用 docId 句柄 / OPFS / 用户文件 File System Access）如何划？ | Q-001/Q-002/R-001 |
| O-002 | **不可承载面裁决粒度**：真 shell/PTY、本地文件树、原始套接字、stdio MCP 判「不可行显式记录」还是「代理桥」（本地/服务端执行端点，先例 provider.ts:54 lgdl serve 方向）；「持久执行上下文」的浏览器载体（worker）是否入 v2 | Q-004/R-002 |
| O-003 | **应用级权限门禁路线与挂点**：opencode 三元组（allow/ask/deny + pattern）形态；挂 router.dispatch 还是 runner 框架级 hooks；ask 交互 UI 归属（场景）；浏览器 API 级权限（文件句柄/通知/剪贴板）的授权失败转译 | Q-005/R-005 |
| O-004 | **任务/状态体系浏览器载体**：todo/goal/jobs 的宿主（IndexedDB/localStorage/内存）与跨会话程度（刷新恢复? 多标签?）；后台作业生命周期语义（页面存活期 + Notification 完成提醒 vs 需服务端）；worker 保活取舍 | Q-006/Q-008 |
| O-005 | **子会话/编排形态与归属**：subagent（同线程嵌套 runner 子会话）、workflow（脚本扇出）的浏览器形态是否 v2 做；与「多形态内核（headless/sdk）」是否同批 | Q-006/Q-012 |
| O-006 | **扩展生态位范围**：skill 目录加载机制是否 v2（内容来源：打包 vs 运行时——受 CSP/加载面约束）；MCP 客户端（Streamable HTTP/SSE）是否 v2 做试点；注册表目录/命名空间/运行时动态注册扩展 | Q-007/Q-010 |
| O-007 | **lgdl-web 场景接入面**：新域工具是否默认注册、web-search 端点与 key 来源（base 中立框架自带端点 vs 场景注入）、权限 ask UI 与 MCP 配置 UI 归属（provider 应用态上收复议 vs 留场景 F-23 NG-004） | Q-011/Q-009 |
| O-008 | **版本落点与波次拆分**：调研报告未纳入 ROADMAP（Q-013）；v0.7 已排满（ROADMAP.md:31）；v2 排 v0.8（:32）还是 v1.1 线；§3.4 域分组波次（如波 1 = 网络/存储/任务横切，波 2 = 扩展/检索/UI）如何拆；F-14 边界（通用 DOM 自动化留 v1.1?） | Q-012/Q-013/R-001/R-004 |

---

## 7. 下一步建议

| 优先级 | 事项 | 说明 |
|--------|------|------|
| 高 | 作者评审 §3.3 生态位映射表（六大组）确认边界（尤其 ◐ 受限项），作为 v2 能力规划公理基线 | Q-003/A-001（O-003 前置） |
| 高 | 作者裁决 O-001（首批域裁剪 + 内容对象模型）与 O-008（波次拆分 + 版本落点）——定 v2 范围主干 | R-001 范围蔓延 |
| 高 | 作者裁决 O-002/O-003（不可承载面 + 权限门禁）——定执行/任务域落点与安全基线 | Q-004/Q-005 |
| 中 | 以 Q-005/Q-006/Q-007 为核心问题域进入 spec：框架级 hooks/权限横切、状态/任务/会话载体、扩展生态位（skill/MCP HTTP）的 FR 级契约描述（不设计实现） | 本 Feature 主干 |
| 中 | 作者裁决 O-005/O-006/O-007（子会话/扩展范围/lgdl-web 接入面）——防能力无消费方或与 F-14 抢跑 | R-004/R-006 |
| 中 | F-23 真实 AI 闭环遗留（validate-report.md:183）作为 v2 前置人工基线先行补跑，再叠加权限/新工具 | R-005 |
| 低 | 作者裁决 O-008 后同步 ROADMAP 登记（含 agent-capabilities 调研采纳状态） | Q-013 |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.1 | 依据作者方向裁决 D-5（2026-09-06：不照搬 OS 工具集，按浏览器生态位设计工具集）全篇重做：新增 §1.2 D-5/D-6、§3.3 OS→浏览器生态位映射表（六大组 A-F）、§3.4 浏览器工具集设计域（九域 25+ 候选）、§3.5 不可承载面清单、§3.6 架构衔接点（v1.1 视角）；重写问题清单（Q-001~Q-013，浏览器生态位框架）、边界映射、竞品参考（生态位视角）、开放点（O-001~O-008，关闭 v1.0 O-001）；v1.0「照搬 OS 工具」框架废弃 | 2026-09-06 | SDDU Discovery Agent |
| v1.0 | 初始创建（已废弃框架基线）：盘点 F-23 后能力 + 增强/进阶 10 项缺口 + 浏览器约束初判；问题 Q-001~Q-013 / 开放点 O-001~O-008（含「8 项 MVP 工具未交付」口径差异 Q-001） | 2026-09-06 | SDDU Discovery Agent |
