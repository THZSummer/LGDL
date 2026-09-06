# 审查策略：specs-tree-web-cli-base-v2（web-cli-base v2：面向浏览器生态位的 agent 能力完备化——九域浏览器原生工具集 + 增强/进阶层机制）

> **文档定位**: SDDU 审查策略 — 指导 review Agent 执行自主审查的清单和方法；审查结果见 review-report.md
> **前置依赖**: discovery.md v1.1（Q-001~Q-013 / §3.3 生态位映射六大组 / §3.4 九域 / §3.5 不可承载面 / §3.6 衔接点）、spec.md v1.0（46 FR 十三组 REG/PRM/DOC/STR/SRC/NET/DOM/EXE/TSK/SES/EXT/LGDL/BSL + 10 NFR + 15 EC + 12 AC，D-5/D-6/A-01~A-04 已裁，S-01~S-09 已裁）、plan.md v1.0（技术方案 + ADR-001~008 + §2.3 扩展接口三件套 + §5 文件影响面 + §2.6/§8 波次交接）、F-23 上游产物（spec/plan/review.md/review-report.md，phase=validated）、state.json（phase=planned）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-06
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-06
> **更新说明**: 初始创建 — 基于 spec（46 FR 十三组 / 10 NFR / 15 EC / 12 AC / D-5·D-6·A-01~A-04 红线）+ plan（8 ADR + §2.3 扩展接口 + §5 文件影响面）+ discovery（九域域表/NG 清单）自主定义 C1~C53 审查清单（规范符合性 41 / 架构一致性 7 / 代码质量 2 / 测试质量 3），覆盖五大审查面：①九域能力浏览器生态位贴合度 ②46 FR 规范符合性 ③权限门禁三者组合与安全边界（untrusted/eval 沙箱/跨域）④F-23 契约红线（additive/runner 零改动/测试守恒）⑤代码质量与模块边界

> **执行模式说明（ADR-004 §8.1 步骤 1）**：本 Feature 的 review.md（策略）在 plan 完成后先行产出（不依赖 tasks/build，state.json 现 phase=planned）；review-report.md（报告，R1）待 build 完成后按本文档 C1~C53 逐项执行。若 build 完成后 build.md 存在「实现口径声明」（如 web-fetch 缺省兼容细节、PermissionGate 插入点、矩阵默认取向落地），R1 以独立复核清单（O 系列）追加核验——口径点已在 C4/C12/C26/C44 内嵌，不另行编号。

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查对象（预期，plan §5） | base 机制层扩展（router.ts v2 / permission / audit / platform / assembly）+ 域工具层 9 域 20+ 模块（doc/storage/settings/search/web-search/save/stream/dom/ask-user/notify/clipboard/eval/exec-remote/worker-session/todo/goal/jobs/subagent/workflow/session-store/session/context/skill/mcp）+ lgdl-web 组装与 UI 面（session/provider/AiPanel/App/AskDialog/SettingsPanel）；测试文件平铺 src/ 根 |
| 审查清单 | C1~C53（规范符合性 41 / 架构一致性 7 / 代码质量 2 / 测试质量 3） |
| FR 覆盖 | 46 FR 全部 ≥ 1 个 Cx（FR-001~046 逐一锚定，见各 C 行「审查基准」） |
| 红线输入 | D-5/D-6 生态位公理（C2/C3）、A-01 九域全做（C1）、A-02 代理原则（C3）、A-03 权限三组合（C12~C17）、A-04 版本（C6）；NG-001（C3/C32/C33/C42）、NG-002（C3/C47）、NG-003（C3/C29）、NG-004（C3/C33）、NG-005（C32/C33）、NG-007（C2）、NG-008（C3/C14/C30/C46）、NG-009（C3/C26）；F-23 契约红线（C4 additive / C5 世界模型 / C7 runner 零改动 / C26 web-fetch 缺省兼容 / C51 测试守恒） |
| 质量门槛 | 每个 FR ≥ 1 个 Cx（满足）；四维度各 ≥ 1 条（满足）；无法审查项显式标注「不适用」或「动态面移交 validate」 |
| 审查方式 | 静态阅读 + grep 门禁 + git diff/status 基线对照（R1 以 build 产物 = 工作区当前状态）；**不运行测试**（动态验证归 validate 阶段） |

## 2. 自主审查清单（C1~C53）

**审查对象来源**：
- `spec.md`：FR-001~046（十三组）逐项核验实现完整性与正确性；NFR-001~010；EC-001~015；AC-001~012；NG-001~009；D-5/D-6/A-01~A-04 红线
- `plan.md`：ADR-001~008 → 架构遵循性检查；§2.3 扩展接口三件套（ToolEntry additive 字段 / PermissionGate 插入 dispatch / 全限定名三链一致派生）→ 落点对照；§5 文件影响面 → 完整性；§2.6/§8 波次交接 → 域覆盖对照
- `discovery.md`：§3.4 九域设计域 → 域覆盖基线；§3.5 不可承载面 → out 断言
- 实现代码实况（R1 时）：packages/web-cli-base/src 全量 + packages/lgdl-web/src + git status/diff + package.json

**四维度覆盖**：规范符合性（FR 逐项核验为主，41 条）→ 架构一致性（ADR/分层/依赖/影响面，C1/C4/C5/C7/C21/C39/C48）→ 代码质量（模块边界与走查，C49/C50）→ 测试质量（守恒/覆盖/双轨，C51~C53）。

### 2.1 生态位纪律与范围边界 + F-23 契约红线（横切）

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法（含通过标准） |
|---|---------|---------|---------|---------|
| C1 | **九域工具面覆盖**：plan §2.2 域模块表 + §5.1 NEW 清单 vs discovery §3.4 九域设计域 | AC-002 / A-01（九域全做）/ plan §2.2/§5.1 | 架构一致性 | 检查方法：R1 以 git status + src 文件清单建立「域 × FR × 模块」对照表——DOC(doc-tools)/STR(storage-tools+storage-{mem,idb,opfs}+settings)/SRC(search-tools)/NET(web-fetch·web-search·save·stream)/DOM(dom-tools·ask-user·notify·clipboard)/EXE(eval-tools·exec-remote·worker-session)/TSK(todo·goal·jobs·subagent·workflow)/SES(session-store·session-tool·context-tool)/EXT(skill-loader·mcp-client) + REG(router v2) 逐域核验模块存在性与 entry 可注册；P0/P1/P2 标注与 plan §2.6/§8 波次一致；P2 试点项（MCP/workflow/ws/exec-remote/notify/clipboard/save 完整面）裁剪决策需有记录。通过标准：九域无遗漏域；每域 ≥ 1 工具模块存在且经 createXxxTool 工厂产出 ToolEntry；波次标注与 plan 一致；P2 裁减项在 tasks/build 有显式记录 |
| C2 | **生态位纪律 grep 门禁**：不照搬 OS 工具集（D-5/D-6 红线核心） | D-5/D-6 / NG-001/007 / NFR-010 / AC-003 | 规范符合性 | 检查方法：grep base 全模块——OS 形态工具名与语义零命中：工具名（read/write/edit/grep/glob/bash 等）、文件路径参数语义（`~/.` 路径、glob-on-path、路径遍历）、bash 持久会话/PTY/ANSI 能力面；内容/存储/检索域语义对象 = docId 句柄/卷条目/资源 id（非文件路径，FR-011/013/016 断言）；帮助面与 schema 描述无 OS 术语残留。通过标准：grep 清单零命中（例外仅出现在「声明不做/代理」的帮助文案与 out 清单）；subagent→子会话、todo→会话级清单等重表达命名成立 |
| C3 | **范围纪律与不可承载面 out**：NG-001~009 逐项断言 + 代理原则 + 防抢跑 | NG-001~009 / A-02 / discovery §3.5 | 规范符合性 | 检查方法：NG 清单逐项对照实现面：真 shell/PTY/本地文件树/socket·DNS/stdio MCP/常驻守护/系统包管理 = 不落地（grep 零命中）；exec-remote 仅预留契约 + 未配置禁用 + 「代理 OS 能力、非本框架实现」声明（NG-004/FR-027）；LGDL C 档零改动（lgdl-web-cli/op-cli/lgdl-core/layout/render/router C 档语义零改动，NG-002）；F-14 不抢跑（dom-* 仅宿主同源、无跨站驱动/插件运行时/多形态内核，NG-003）；无跨 origin 代理穿透（无 CORS 代理/绕过 SOP 实现，NG-009）；base 零 UI 代码（NG-008）。通过标准：NG-001~009 逐项有 grep 断言或文档断言支撑；C 档文件 git status 零改动（注释级除外）；跨域相关工具全部同源优先 + 友好错误转译 |
| C4 | **F-23 契约 additive 红线**：ToolEntry/ToolResult/ToolContext 仅追加字段缺省兼容 + 分发链插入点 + 顺序契约 | FR-043 / ADR-001 / plan §2.3.1 / F-23 router.test.ts:153 顺序断言 | 架构一致性 | 检查方法：git diff router.ts——ToolEntry 仅追加 group/namespace/enabled/risk（缺省 = 与旧行为完全一致）；注册键 = 全限定名 ns.name（空 ns = name，与 F-23 逐字节兼容）；dispatch 链顺序 = 查条目 → enabled 检查 → ★PermissionGate → delay gate → executor → PostToolUse 审计（FR-005 插入点在 delay 前、执行器零改动）；deriveTools 缺省全量 = 原顺序（组内注册序 + 内建置末）；无另起分发路径/子 router（ADR-001）。通过标准：新字段缺省路径行为与 F-23 完全一致；F-23 router.test 既有用例零回归全绿；dispatch 插入点与 plan §2.3.2 一致 |
| C5 | **世界模型扩展（文档态 → 状态态）**：docId/source 保留 + ctx.services 状态访问面 | FR-044 / plan §2.3.4 / F-23 ToolContext 契约 | 架构一致性 | 检查方法：ToolContext.docId/source 字段保留且语义不变（lgdl-web-cli 文档工具 dispatch ctx 零回归）；services?: ToolServices（session/goal/jobs/audit store）为追加扩展位；store 工厂（IDB/memory 双轨）由场景组装注入（session.ts）；新域工具经 ctx.services 访问状态的注入桩可测。通过标准：文档态工具行为零变化（F-23 用例绿）；新域工具 services 访问经注入断言成立；ctx 组装点 = 场景 session.ts（base 不硬编码 store 实例） |
| C6 | **验证基线前置 + AI 行为等价/声明改进**：F-23 真实闭环补跑 + v2 浏览器工具验证记录 + 行为差异声明 | FR-045 + FR-046 / AC-008 / F-23 validate-report.md:181-183（⏭️ 遗留） | 规范符合性 | 检查方法（静态面）：build/validate 产物含——①F-23 AC-008 真实 AI 闭环补跑记录（前置人工基线，波 1 入口，需浏览器+API Key）；②v2 浏览器原生工具真实浏览器验证清单（存储/权限 ask/UI/搜索/任务持久）；③FR-046 行为清单 diff：lgdl-web 现 5 工具路径在 v2 新工具 + 权限门禁叠加下的用户可感知差异逐项记录，差异 = 声明项改进（ask 交互/新工具/门禁）且可审计，无未声明差异。通过标准：三类记录存在且指向具体文件；无未声明差异；「动态执行面（真实闭环手测）」显式标注移交 validate，review 只核验记录存在性与差异声明完整性 |
| C7 | **F-23 机制源码零语义改动清单**：runner 主体零改动 + 其余机制文件不动 | ADR-007 / plan §5.3 / F-23 runner.test 12 例 | 架构一致性 | 检查方法：git status/diff 核验——AgentRunner（runner.ts）主体零语义改动（会话恢复/上下文压缩经场景 chat 闭包 + SessionStore 承接，ADR-007）；delay/sleep/help/exec/commands/operations/protocol/llm 零语义改动（plan §5.3 不改动面）；仅 tools.ts/web-fetch.ts 按 §5.1 声明升级；runner 无 react/浏览器 import 引入；F-23 runner/delay/sleep/session 测试零回归。通过标准：改动文件集合 ⊆ plan §5 声明面（无多余/无遗漏）；runner.ts 语义零改动（git diff 为空或注释级）；F-23 测试全绿 |

### 2.2 REG — 注册表目录/命名空间/运行时扩展（FR-001~004）

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法（含通过标准） |
|---|---------|---------|---------|---------|
| C8 | **工具分组/目录（FR-001）**：ToolEntry.group + help 分组一览 + deriveTools 分组两态 | FR-001 / NFR-005 / AC-005 + AC-011 / ADR-001 | 规范符合性 | 检查方法：router 实现 group 派生视图（group 为条目的元数据视图、不建独立存储——单一数据源 NFR-004）；listHelp 按组分节输出；deriveTools(opts) 支持 group/namespace/grouped 切片，缺省（无 opts）= 原全量顺序；分组切片与全量视图一致（无重复/漏注册）。通过标准：注册不同组工具后 listHelp 呈分组结构；deriveTools 分组/全量两态可测且全量态与 F-23 顺序断言一致；组缺省归组规则（namespace → 'general'）与 plan 一致 |
| C9 | **命名空间（FR-002）**：全限定名键 + 三链一致 + 同基名共存 + 可逆解析 | FR-002 / EC-010 / plan §2.3.1 / ADR-001 | 规范符合性 | 检查方法：注册表键 = 全限定名 ns.name（顶层 = name）；schema function.name / dispatch 键 / help 查询键三链一致使用全限定名；文本前缀含命名空间（`skill.search`）且可逆解析回 {namespace, name}；同基名不同命名空间共存可分别查询与派发（`search` vs `skill.search`）；setNamespaceOrder 生效且缺省 = 首次注册序；顶层 5 工具（无命名空间）零回归。通过标准：同基名共存单测（分别派发）；前缀逆解析单测成立；setNamespaceOrder 断言；F-23 顺序契约不断 |
| C10 | **运行时动态注册/卸载/查询（FR-003）**：register/unregister/query + 「注册即得」链对动态源保持 | FR-003 / EC-010 / AC-005 / RegisterOptions(source/allowedTools) | 规范符合性 | 检查方法：register(entry, opts?)/unregister/query 运行时可用（含按 namespace/group/name/enabled 过滤）；模拟动态源全链：注册 → 派生可见 → 派发可执行 → 卸载 → schema/help/dispatch 三链即时消失（卸载后 dispatch 走 EC-001「✖ 未注册工具」语义）；重复注册同名同命名空间抛错（EC-010 沿 F-23 EC-003 语义）。通过标准：动态源全链单测断言（含卸载后三链消失）；重名拒绝断言；「注册即得」四链（schema/前缀/help/顺序）对动态源保持 |
| C11 | **工具开关模型（FR-004）**：enabled + 启用集 + 禁用三链 + 三态文案互异 | FR-004 / EC-001/006 / AC-011 / plan §2.3.1 | 规范符合性 | 检查方法：ToolEntry.enabled 声明 + 场景启用集（enabledTools 白名单或 setEnabled）；禁用工具三链断言：deriveTools 不含、listHelp 一览标注「已禁用」、dispatch 返回显式「已禁用」错误（文案与「未注册」「权限被拒」互异——EC-001 三态）；启用集缺省 = 全启用且与 F-23 builtins 选项（false = 全不注册）兼容；web-search/exec-remote 未配置 = 禁用态 + 指引（EC-006 联动 FR-019/027）。通过标准：禁用工具三链断言通过；EC-001 三态文案互异单测（「✖ 未注册工具/已禁用/权限被拒」）；启用集与 builtins 选项兼容 |

### 2.3 PRM — 应用级权限门禁与安全边界（FR-005~010 + 安全横切；A-03 三者组合）

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法（含通过标准） |
|---|---------|---------|---------|---------|
| C12 | **框架级策略挂点（FR-005）**：PermissionGate 插入 dispatch、与 delay gate 同层、先于执行器、无旁路 | FR-005 / ADR-002 / NFR-003 / AC-004 | 规范符合性 | 检查方法：dispatch 链中 PermissionGate 位置（查条目/enabled 之后、delay gate 之前——deny/ask 短路不产生 delay 等待）；策略三输入齐备：①三元组规则集（{permission, pattern, action: allow/ask/deny}，白名单优先语义）②dsh 可插拔策略对象（部署方注入，如 read-before-edit）③allowed-tools 授权冗余护栏；deny → ok:false「权限被拒」且执行器未被调用（间谍断言）；执行器之后 PostToolUse 审计挂点（audit sink 注入）；无旁路 grep：业务包无自行权限检查/绕过实现、策略代码只存在于路由层（NFR-003）。通过标准：间谍断言通过；grep 零旁路命中；deny 短路零 delay 等待；策略注入经 RouterOptions.policy |
| C13 | **权限裁决语义（FR-006）**：三态矩阵 + 默认取向 + deny 优先 + 可观察 | FR-006 / EC-014 / plan §2.3.2 | 规范符合性 | 检查方法：裁决矩阵单测（allow/ask/deny × 命中/未命中全格）；未匹配规则默认动作场景可配置且生效；默认取向 = 敏感面（写/外联/UI 副作用 risk 分类）ask/deny、只读面 allow（risk 字段供参考、非裁决本身）；EC-014 扩展 allow 与全局 deny 冲突默认 deny 优先；裁决结果入审计（decision 记录可观察）。通过标准：裁决矩阵全格断言；默认取向生效断言；EC-014 deny 优先断言；审计含裁决记录（NFR-009） |
| C14 | **ask 交互契约（FR-007）**：分发挂起 Promise + onAsk 桥 + 取消/超时 → deny + 会话自愈 | FR-007 / EC-002 / ADR-002/008 / NG-008 | 规范符合性 | 检查方法：ask 命中 → 分发挂起（AskHandle Promise 化）+ RouterOptions.policy.onAsk 桥 + 挂起状态/事件（场景渲染用）；用户取消/超时 → deny + 审计记录（EC-002）；runner 循环在 ask 挂起期间不推进、裁决后继续（AI 不中断可自愈）；base 零 UI 代码（grep 无 React/弹层实现——AskDialog 在 lgdl-web，NG-008）。通过标准：fake 裁决器 allow/deny/超时三路单测断言；EC-002 取消/超时 → deny + 审计；base grep 零 UI；场景 onAsk 接线存在（AiPanel/AskDialog） |
| C15 | **技能级 allowed-tools（FR-008）**：WorkBuddy 生态位 + 扩展源注册校验 + FR-036 联动 | FR-008 / FR-036 / ADR-002 / AC-004 | 规范符合性 | 检查方法：扩展源（skill/MCP）注册时校验声明的 allowed-tools 授权集：授权工具注册成功、越权工具注册被拒（或降级 ask——策略决定，默认被拒 + 审计）；dispatch 冗余护栏（注册后执行前再校验）；与 skill-loader（FR-036）联动测试存在。通过标准：授权/未授权两场景断言；越权注册被拒 + 审计；联动测试绿 |
| C16 | **浏览器 API 授权失败转译（FR-009）**：文件句柄/通知/剪贴板/权限查询被拒或不支持 → 友好错误 | FR-009 / EC-003 / ADR-003/008 | 规范符合性 | 检查方法：PlatformEnv 适配层捕获 NotAllowedError/SecurityError/NotFoundError（及不支持检测）→ 工具 ok:false + 授权路径指引（如「需在浏览器地址栏权限设置允许通知」）+ 会话不中断；转译工具函数集中实现（域工具复用，无散落重复）；EC-003 场景（通知/剪贴板/文件句柄/权限查询）逐一有转译断言。通过标准：授权桩两路/不支持断言；指引文案可读；错误不导致 runner/会话中断 |
| C17 | **内容可信约定 untrusted（FR-010）**：外部结果标记 + 不自动执行 + 注入防护 | FR-010 / EC-007 / ADR-005 / AC-004 | 规范符合性 | 检查方法：web-fetch/web-search/exec-remote 输出携带可信标记（来源/时间/可信级——ToolResult.trust 或等效元数据通道，不改变原文文本）；untrusted 内容不自动执行（eval 默认拒 untrusted 输入 FR-026/EC-007 联动）；标记不因 HTML→MD 清洗丢失（清洗后保留断言）；注入指令文本不进配置面、进入 AI 上下文有边界声明（FR-010 AC：含注入指令的抓取在 AI 闭环不回显执行——静态路径 + validate 闭环记录）。通过标准：外部结果带标记断言；清洗后标记保留单测；eval 拒 untrusted 断言；配置面无 untrusted 写入路径 |
| C18 | **审计与可观测性横切（NFR-003/009）**：四类审计事件 + trace 关联会话恢复 | NFR-003/009 / FR-005/038/035 / Q-010 | 规范符合性 | 检查方法：AuditSink 事件面含四类：权限裁决/工具调用/扩展注册/上下文压缩；audit sink 可注入（memory/console）；权限裁决/调用/扩展注册全量入审计（NFR-003 安全基线）；审计记录与 session 恢复数据可关联（trace 支持重放，Q-010）。通过标准：audit.test 四类事件断言；注入 sink 生效；router dispatch 挂 PostToolUse 审计（executor 调用后记录 decision/duration/trust） |

### 2.4 九域域工具规范符合性

#### DOC — 内容/文档域（FR-011/012）

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法（含通过标准） |
|---|---------|---------|---------|---------|
| C19 | **doc-read（FR-011）**：内容对象读（句柄/卷条目语义，非文件路径） | FR-011 / D-5 / AC-002 | 规范符合性 | 检查方法：executor 读 ToolContext.docId/source（当前文档对象）或经 storage 后端取卷条目（注入）；schema/执行语义 = 文档句柄/卷条目 id，无文件路径参数与遍历逻辑（grep 路径语义零命中）；无可用上下文 → 友好错误并列出可读对象（如可及卷条目/资源 id）。通过标准：假 ctx（source/docId）读回内容断言；无上下文可读错误断言；语义不含路径遍历（grep） |
| C20 | **doc-edit（FR-012）**：文本编辑原语（str_replace/insert/create）+ changed/source 契约 + read-before-edit 归策略 | FR-012 / F-23 changed/source 契约 / AC-002 | 规范符合性 | 检查方法：编辑原语为内容层操作（非文件系统形态）；ToolResult ok/output/changed/source 推进（沿 F-23 契约）且可经场景 onApply 写回；read-before-edit「先读后改」由 PRM 策略承载（dsh 生态位），工具内不内建（无 read 前置硬编码）；与 lgdl-web-cli 文档变更语义同契约。通过标准：编辑后 changed/source 断言；read-before-edit 策略启用时未先读 → ask 测试存在（permission 联动）；无工具内自建 read 强制逻辑 |

#### STR — 存储域（FR-013~015）

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法（含通过标准） |
|---|---------|---------|---------|---------|
| C21 | **storage 通用持久卷（FR-013）+ 载体选型（ADR-003）**：OPFS/IDB 双载体 + StorageBackend 抽象 | FR-013 / ADR-003 / EC-004/005 / AC-006 | 架构一致性 | 检查方法：统一 StorageBackend（list/read/write/remove + estimate/persist）三实现（opfs 卷语义 + idb 对象库 + mem 双轨 node 测试缝）；storage 工具全链注入 fake 后端断言；origin 私有边界（无 origin 外访问）；EC-004 配额超限 → 「配额不足」可读错误 + storage-quota 联动建议（不静默丢数据）；EC-005 隐私模式/存储不可用 → 降级内存态 + 明示「本次会话不持久」；storage 工具可运行于页面与 worker（FR-013 AC——worker 可访问性以 OPFS worker 同步访问或等效实现满足）。通过标准：mem fake 全链 CRUD 断言；EC-004/005 转译单测；browserEnv 真持久冒烟清单（validate 记录）；worker 上下文可用性有实现或文档化约束 |
| C22 | **storage-quota 配额观测（FR-014）** | FR-014 | 规范符合性 | 检查方法：estimate/persist 语义面输出可读 + 可解析（结构化输出，非纯文本展示）；注入假 estimate 值断言输出格式与语义；GC/配额回收风险提示文案存在。通过标准：输出格式断言成立；真实浏览器返回真实配额（validate 冒烟记录） |
| C23 | **settings 通用 KV 配置（FR-015）**：同步 KV 骨架 + 可注入后端 + 不强迁 provider 数据 | FR-015 / FR-042 / S-09 / AC-007 | 规范符合性 | 检查方法：settings 工具 get/set/list/remove（同步 KV 语义）+ 可注入后端（localStorage 适配器/memory，独立小后端不入 OPFS/IDB——ADR-003）；命名空间隔离（多场景可复用）；lgdl-web provider 数据平移不强绑：现有 localStorage `lgdl-ai-settings` 读写行为不回归（若未平移则行为原样，向后兼容优先）。通过标准：node 假后端 CRUD + 命名空间隔离断言；lgdl-web 现有设置读写零回归（provider.test 既有用例绿） |

#### SRC — 检索域（FR-016/017）

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法（含通过标准） |
|---|---------|---------|---------|---------|
| C24 | **search-content（FR-016）**：内容集全文/模式搜索（非文件路径语义） | FR-016 / D-5 / EC-011 / AC-002 | 规范符合性 | 检查方法：语义对象 = 可及内容集（当前文档对象/已加载资源/OPFS 卷条目/会话记录），schema 无文件路径/glob-on-path 参数（grep 零命中，D-5）；模式/全文搜索命中结果含上下文行与位置；无索引退化为线性扫描且结果一致；超大内容集预算护栏（EC-011：上限/截断声明 + 输出元信息）。通过标准：注入小内容集命中断言（含上下文行/位置）；退化一致性断言；预算护栏生效断言 |
| C25 | **list-resources（FR-017）**：资源目录（与 web-cli-help 工具目录区分） | FR-017 / AC-002 | 规范符合性 | 检查方法：列出可及资源（文档对象 id/卷条目/会话资源）——语义上区别于 web-cli-help 的「工具」目录；输出稳定可解析（结构化）；help 文本断言两目录语义不混淆。通过标准：写入/注册资源后 list 含条目；帮助文案区分「资源」vs「工具」目录 |

#### NET — 网络域（FR-018~021）

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法（含通过标准） |
|---|---------|---------|---------|---------|
| C26 | **web-fetch 升级（FR-018）**：清洗(默认关)/护栏/错误分类/untrusted + **缺省逐字节兼容** | FR-018/043 / plan §3.6 方案 A / NG-009 / FR-010 | 规范符合性 | 检查方法：schema 仅追加可选参数（clean/护栏上限等），缺省 = 原文返回（tools.ts WEB_FETCH_TOOL 升级不破坏既有——F-23 用例零回归）；HTML→MD 清洗默认关（基础语义、零依赖内置最小转换器，P-03）；响应大小/时长护栏 + 截断元信息（长度/截断标记，EC-011）；错误分类（网络/CORS/HTTP 状态 → 可读错误，同源优先 + SOP/CORS 约束转友好错误 NG-009）；untrusted 标记内置常开（ToolResult.trust 通道 + 审计，不改变原文文本）。通过标准：mock fetch 断言（原文/清洗两态、trust 标记、超限截断元信息、CORS 拒绝可读）；F-23 web-fetch 既有用例零回归；无 CORS 穿透实现 |
| C27 | **web-search（FR-019）**：场景注入端点 + 未配置禁用 + 结果 untrusted | FR-019 / EC-006 / FR-040 / NFR-002 | 规范符合性 | 检查方法：query → 结果列表（标题/摘要/来源链接/可信标记）；端点与凭据 = env/场景注入（base 零内置端点零内置 key——grep 无硬编码 URL/密钥）；未配置 → 工具禁用态（FR-004 语义）+ 配置指引（EC-006），不影响其他工具与会话；结果带 untrusted 标记（FR-010）。通过标准：注入假搜索服务全链断言（成功/空结果/失败/鉴权错）；未配置态三链断言；key 不进 schema/help/日志（grep） |
| C28 | **save/download（FR-020）+ ws/eventsource（FR-021，P1/P2）** | FR-020/021 / EC-003 / FR-009 | 规范符合性 | 检查方法：save/download = File System Access 存用户文件 + blob 下载链两路径，用户手势授权失败转译（授权桩成功/拒绝两路，FR-009）；stream（若入范围）假连接桩断言消息流/关闭/错误语义（P2 可裁剪）。通过标准：save 授权两路断言 + 下载链冒烟；stream 桩断言（若入范围）；P2 裁剪决策有记录 |

#### DOM — DOM/UI 自动化域（FR-022~025）

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法（含通过标准） |
|---|---------|---------|---------|---------|
| C29 | **dom-\*（FR-022）**：通用 DOM 子命令族 + 宿主同源边界 + 写操作走 PRM + 无 React handler 依赖 | FR-022 / NG-003 / FR-005 联动 / AC-002/004 | 规范符合性 | 检查方法：子命令族（read-state/click/hover/scroll/zoom/fullscreen/snapshot 等）执行目标 = 宿主应用自身同源页面——无第三方/跨域站点驱动逻辑（无 iframe 注入外部 URL、无跨站自动化，NG-003/F-14 不抢跑 grep）；写类/UI 副作用子命令 risk:'ui' 且经 PRM 门禁（deny 策略下拦截——间谍断言）；DOM 操作经 PlatformEnv.dom 注入桩实现，无 op-cli React handler 依赖（grep 零 React import）。通过标准：逐子命令注入桩/浏览器冒烟断言；写操作 deny 拦截断言；无 React handler 依赖；同源边界 grep 通过 |
| C30 | **ask-user（FR-023）**：任务内澄清契约 + 与 PRM ask 语义区分 + UI 归场景 | FR-023 / NG-008 / FR-007 联动 | 规范符合性 | 检查方法：问题结构/选项/回答回填契约（选择/确认/自由文本三型）；应答器 env 注入（fake 三型断言）；与 PRM ask（FR-007 权限裁决）语义区分——工具描述/文档显式区分「任务内澄清」vs「权限裁决」，两条 UI 入口路径不同；AI 循环挂起/恢复正确；UI 呈现归场景（base 零 UI）。通过标准：三型应答断言；两 ask 语义区分文档化断言；挂起/恢复断言 |
| C31 | **notify + clipboard（FR-024 + FR-025，P2）**：授权两路转译 + 降级路径 | FR-024 + FR-025 / EC-003 / FR-009 | 规范符合性 | 检查方法：notify（Notification API，配合 jobs 完成提醒）授权桩允许/拒绝两路断言 + 拒绝时降级路径提示；clipboard 读写 mock navigator.clipboard（手势/权限失败转译）；均经 PlatformEnv 适配（node 面可测）。通过标准：两路授权断言 + 降级文案可读；P2 若裁剪有记录 |

#### EXE — 执行/计算域（FR-026~028）

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法（含通过标准） |
|---|---------|---------|---------|---------|
| C32 | **eval-js/eval-wasm（FR-026）**：worker 执行器注入沙箱 + PRM 门禁 + untrusted 拒 + 非 OS 沙箱声明 | FR-026 / ADR-005 / EC-007 / NG-001/005 / AC-002/004 | 规范符合性 | 检查方法：执行器 = PlatformEnv.workerFactory 注入 worker（blob/模块；无 DOM 面、可 terminate 中断、主线程不卡）；node 面 = 注入桩执行器（NFR-006）；纯计算语义返回正确；DOM/网络副作用尝试在默认策略下被拦截（写/外联默认 ask/deny——门禁断言）；untrusted 输入默认拒执行（EC-007：untrusted 来源内容默认拒、除非显式 trusted 策略放行）；CSP（worker-src/script-src）约束记录；帮助/工具描述显式声明「worker 非 OS 沙箱（无 seccomp/VM）、无 PTY/终端/文件系统/OS 面」（NG-001/005 不冒充）。通过标准：注入执行器纯计算断言；副作用拦截断言；untrusted 拒执行断言；CSP 记录存在；声明文案存在 |
| C33 | **exec-remote + worker 持久上下文（FR-027 + FR-028，P2）**：代理桥预留契约 + 状态跨调用（无 PTY） | FR-027 + FR-028 / NG-001/004/005 / AC-002 | 规范符合性 | 检查方法：exec-remote（若入范围）端点/鉴权/超时 = env 注入、未配置 → 禁用 + 指引、工具描述显式声明「代理 OS 能力、非本框架实现」（NG-004）；worker-session 两调用间状态保持断言、无 PTY/ANSI/终端语义字段（NG-005）、页面卸载即失语义记录于帮助（不冒充常驻，ADR-004）。通过标准：mock 端点全链 + 未配置态断言（若入范围）；worker 桩状态保持断言；无终端语义字段；P2 裁剪决策有记录 |

#### TSK — 任务/状态域（FR-029~033）

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法（含通过标准） |
|---|---------|---------|---------|---------|
| C34 | **todo（FR-029）**：会话级任务清单（随会话持久，非独立跨会话） | FR-029 / S-01 / AC-006 | 规范符合性 | 检查方法：add/list/update/mark-done/remove CRUD；宿主 = 会话级状态存储（随会话持久化——SessionStore 承载，非独立跨会话存储）；会话持久化启用时恢复后清单仍在（联动 C39）。通过标准：会话内 CRUD 断言；持久恢复后 todo 仍在断言 |
| C35 | **goal（FR-030）**：跨会话持久目标 + IDB 宿主 + 多标签冲突标记 | FR-030 / EC-013 / S-01/S-02 / AC-006 | 规范符合性 | 检查方法：create/get/update/archive + 进度记录；宿主 = IndexedDB（origin 级），刷新/重开可恢复；同源多标签共享读 + 写入冲突标记/last-write（EC-013，非静默覆盖）；进度查询/时间索引经 IDB 对象库能力（ADR-003）。通过标准：持久 → 重开可查断言；并发写冲突标记断言（fake 后端双写）；EC-013 不静默覆盖 |
| C36 | **jobs（FR-031）**：后台任务句柄 + 页面存活期 + interrupted + Notification + 不叠 delay | FR-031 / EC-008/015 / S-03 / ADR-004 | 规范符合性 | 检查方法：submit → jobId；status/result/log/cancel 全生命周期；执行 = 页面存活期异步任务、状态与结果落 IDB（JobStore）；完成 → Notification（授权失败转译 FR-009/024 联动）；页面卸载/刷新 → beforeunload/Page Lifecycle 标记 interrupted（可查/可取消/可重试 EC-008）；启动类命令即时返回 jobId、不阻塞轮次、不叠加 delay 等待（EC-015——jobs 条目 delayMs:0 沿 F-23 FR-016 免除通道）；跨页面存活/服务端常驻守护 = out（ADR-004 语义声明于帮助/文档）。通过标准：全生命周期单测（含模拟卸载中断 → 恢复查询 → 重试）；EC-015 断言（启动即时返回不叠 delay）；无常驻守护语义 |
| C37 | **subagent（FR-032）**：嵌套 runner 子会话 + 会话隔离 + 工具裁剪 + 失败隔离 | FR-032 / EC-009 / S-04 / AC-002 | 规范符合性 | 检查方法：任务委派嵌套 AgentRunner 子会话并回收结果；同线程 + 会话隔离（非进程隔离——安全边界归 PRM 而非子会话语义，代码/文档边界断言）；子会话工具集可裁剪（继承白名单/子集，控 schema 膨胀）；chat 工厂 env 注入；子会话失败 → ok:false + 主会话不中断（EC-009）。通过标准：fake chat 子会话委派/回收断言；失败 ok:false 且主会话继续断言；白名单生效断言 |
| C38 | **workflow（FR-033，P2/后置）**：声明式编排（若入范围） | FR-033 / S-04 | 规范符合性 | 检查方法：若入范围——声明式多步编排（工具调用序列/子会话扇出/条件与汇聚），编排引擎对假步骤执行 + 扇出/汇聚计数断言；若后置裁剪——plan/tasks 有显式后置记录（S-04）。通过标准：入范围则编排断言绿；未入范围则后置记录存在 |

#### SES — 会话/上下文域（FR-034/035）

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法（含通过标准） |
|---|---------|---------|---------|---------|
| C39 | **session（FR-034）**：SessionStore IDB 持久化/恢复 + 冲突标记 + 降级 + runner 零改动 | FR-034 / ADR-007 / EC-005/013 / AC-006 | 架构一致性 | 检查方法：SessionStore（IDB + memory 双轨）持久化 turns/事件流/恢复点；恢复路径 = 场景 chat 闭包预置历史 turns + 恢复入口 UI 归场景（lgdl-web App.tsx 恢复提示）；多标签并发 → 冲突标记/last-write（EC-013）；EC-005 隐私模式 → 降级内存态 + 明示不持久；AgentRunner 主体零改动（联动 C7——恢复经 chat 闭包消费侧扩展）。通过标准：持久 → 重开 turns 等价断言；冲突标记断言；恢复后 runAgent 续跑冒烟记录；runner git diff 零改动 |
| C40 | **context（FR-035）**：上下文膨胀管理（摘要压缩 + 原始保留 + 可审计 + 策略场景声明） | FR-035 / NFR-009 / AC-006 | 规范符合性 | 检查方法：摘要/压缩工具（summarizer env 注入）对 turns/工具输出压缩；原始记录保留于 session store 可检索找回；压缩动作可审计（AuditSink 事件）；压缩触发策略由场景在 chat 闭包声明（超阈值先压缩再送 LLM）。通过标准：压缩后体量下降且关键工具结果可检索断言；压缩审计记录断言；触发策略在场景闭包声明（base 不内置阈值硬编码） |

#### EXT — 扩展生态位（FR-036~038）

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法（含通过标准） |
|---|---------|---------|---------|---------|
| C41 | **skill 目录加载（FR-036）**：SKILL.md frontmatter + 提示注入 + allowed-tools 门禁 + 来源策略 | FR-036 / FR-008 联动 / S-06 / NFR-008 / AC-012 | 规范符合性 | 检查方法：SKILL.md frontmatter（name/description/allowed-tools）+ 正文加载 → 提示注入 + 可选工具注册（命名空间 skill:*）；内容来源 = 内置打包目录先行 + 运行时加载接口预留（CSP/connect-src 约束文档化）+ 用户文件导入可选（S-06）；越权工具注册被拒或降级 ask（FR-008 联动——skill 声明 allowed-tools 与实际注册工具核对）。通过标准：内置 skill 加载提示注入断言；授权/越权两场景断言；运行时加载接口存在 + CSP 约束记录 |
| C42 | **MCP Streamable HTTP 客户端（FR-037，P2 试点）**：轻量客户端 + mcp:* 动态注册 + 断连降级 | FR-037 / ADR-006 / EC-012 / NG-001 / AC-012 | 规范符合性 | 检查方法：轻量 Streamable HTTP/SSE 客户端（initialize → tools/list → tools/call + SSE 流解析）；零官方 SDK 运行时依赖（package.json 核验，NFR-002/P-02）；工具以 mcp:* 命名空间动态注册进 router（复用 FR-003 动态注册 + FR-008 allowed-tools + FR-038 审计）；服务器配置/凭据 = env 注入（场景）；端点不可达/协议错误 → 该源工具降级不可用 + 明确错误，其余工具与会话不受影响（EC-012）；stdio transport 不可承载（NG-001 显式记录）；CSP connect-src 约束记录于扩展帮助面。通过标准：mock MCP HTTP 服务器全链断言（若入范围）；降级隔离断言；零 SDK 依赖核验；stdio 无实现 |
| C43 | **扩展注册治理（FR-038）**：来源审计 + 重名策略 + 卸载零残留 | FR-038 / NFR-009 / AC-012 | 规范符合性 | 检查方法：扩展源（skill/MCP）注册全程入审计（来源/时间/命名空间/全限定名）；跨命名空间重名策略化（FR-002 允许共存；同命名空间同全限定名重复注册拒绝——EC-010）；卸载清理完整（schema/help/dispatch/审计联动——卸载后 grep 零残留）。通过标准：审计记录含来源断言；重名策略两态断言；卸载后全链 + 审计零残留 grep |

#### LGDL — lgdl-web 场景接入面（FR-039~042）

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法（含通过标准） |
|---|---------|---------|---------|---------|
| C44 | **默认注册矩阵（FR-039）**：session.ts 组装点扩展 + 矩阵推荐取向 | FR-039 / S-08 / AC-007 | 规范符合性 | 检查方法：session.ts 在既有 router(600ms) + 2 业务注册之上追加矩阵（assembly.buildDefaultMatrix() 场景裁剪）；矩阵取向与 spec FR-039 推荐一致：中性无副作用/场景必要类默认开（storage/session/todo/goal/jobs/context/doc-*）、web-search 条件开（配 key 后）、dom-* 默认开但写操作经 PRM、skill/MCP 默认关（显式装载）；矩阵单测：启用集 → 派生 schema 与矩阵一致；矩阵变更单点生效（NFR-004）。通过标准：矩阵派生断言；与推荐取向一致（逐项核对）；既有 2 业务注册 + delayMs 600 保持；F-23 session.test 既有用例零回归 |
| C45 | **web-search key/端点来源（FR-040）**：BYOK 存储位 + 未配置禁用 + key 零泄露 | FR-040 / S-08 / FR-019 联动 / AC-007 | 规范符合性 | 检查方法：provider 应用态扩展 webSearch 字段（endpoint/apiKey BYOK 存储位——provider.ts 扩展，旧字段读写零回归）；未配置 → web-search 禁用态 + 指引（EC-006）；配置后全链可用；key 零泄露 grep（key 名/值不进 deriveTools/schema/help/listHelp/console/日志）。通过标准：配置前禁用/配置后可用断言；key 零泄露 grep 通过；provider.test 新增 webSearch 字段用例且既有用例零回归 |
| C46 | **ask UI 与扩展配置 UI 归属（FR-041）**：场景 UI + base 零 UI + AI 闭环 ask 路径 | FR-041 / NG-008 / FR-007/023/037 联动 / AC-004/007 | 规范符合性 | 检查方法：AskDialog（lgdl-web React）接线 AiPanel：权限 ask（policy.onAsk → AskDialog 呈现）与 ask-user 双入口、ask 挂起/恢复状态渲染；SettingsPanel 提供 web-search 端点/key 配置（FR-040）+ skill/MCP 配置入口（若入范围 FR-041）；base 零 UI 代码 grep（AskDialog/SettingsPanel/React 组件零命中于 base）；AI 闭环 ask 场景手测记录（validate——弹层呈现并完成裁决、模型自愈）。通过标准：场景 UI 接线存在（代码路径可读）；base grep 零 UI；手测记录存在（动态面移交 validate） |
| C47 | **provider 应用态上收复议（FR-042）**：settings 骨架入 base + 场景数据不强迁 | FR-042 / S-09 / NG-002 / AC-007 | 规范符合性 | 检查方法：settings 骨架入 base（FR-015 联动 C23——独立可用单测）；lgdl-web provider 多厂商 localStorage 数据平移不强绑（NG-002 场景内容保护：不强制迁移、不破坏现有读写路径）；provider.test 既有用例零回归 + 新增缺省行为用例。通过标准：骨架独立可用单测；lgdl-web 现有 localStorage 读写行为零回归 |

### 2.5 代码质量与模块边界（§5.1 方法论 + plan §2.2 分层原则）

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法（含通过标准） |
|---|---------|---------|---------|---------|
| C48 | **分层与依赖方向 / 中性纯度**：机制层零浏览器 import 假设 + base 零 LGDL/react/业务依赖 + 单向无环 | NFR-001/002/008 / AC-001 + AC-009 + AC-010 / plan §2.2 | 架构一致性 | 检查方法：机制层（router v2/permission/audit/platform/assembly）无浏览器 import 假设——触碰浏览器能力全经 PlatformEnv 注入（grep 机制层无 window/document/navigator/Notification/clipboard/localStorage/IndexedDB 直用）；域工具 executor 只经 PlatformEnv/ctx 触碰浏览器 API（浏览器能力调用收口适配器，FR-009 转译复用）；base package.json 零新增运行时依赖（OPFS/IDB/Worker/fetch 等为 Web 标准 API，NFR-002）+ 零 @lgdl/react/业务依赖；依赖单向无环（业务包 → base，无 base → 业务边）；新依赖清单（如有）有评审记录。通过标准：grep/package.json 核验通过；base 独立构建 + 独立测试绿（AC-001）；无 base → 业务边 |
| C49 | **模块边界与工厂形态**：域模块 = createXxxTool(env, deps) 工厂内聚 + 域间无直接依赖 + 单一数据源 | plan §2.2/§2.6 + §5.1 / NFR-004 | 代码质量 | 检查方法：每域模块文件 = entry 工厂（schema + executor + help 内聚，ToolEntry 由工厂产出）；域间无直接模块 import（跨域状态经 ctx.services/assembly 注入——grep 域间 import 白名单）；共享浏览器能力/转译/截断逻辑收口 PlatformEnv/工具函数（无散落重复实现）；工具路由知识（name/schema/prefix/executor/help/order + group/namespace/enabled/risk/权限归属）单点注册条目——增删改 = 单点变更全链可见（NFR-004 冒烟：注册假工具含命名空间/组/开关声明 → schema 派生/help/派发/前缀四链自动可见）。通过标准：工厂签名一致（env/deps 注入面）；域间 import 白名单内无越界；重复实现 grep 零命中；单点变更冒烟断言 |
| C50 | **新模块代码质量走查**：可读性/职责单一/错误处理/无魔法值/注释准确 | 项目宪法 / §5.1 方法 | 代码质量 | 检查方法：新/改模块逐文件走查——命名清晰度；函数单一职责（dispatch 链/permission 裁决/jobs 生命周期/session store 各自内聚，无上帝函数）；异常路径覆盖（浏览器 API 抛错 → ok:false + 分类转译对应 EC-001~015 分支；executor 抛错兜底沿 F-23 EC-012 语义）；魔法数字/硬编码提取（delay 钳制 5000/600ms/预算上限/超时参数化或常量集中）；浏览器生态位语义与「非 OS」声明注释准确（不写误导性 OS 类比注释）；无冗余重复逻辑。通过标准：走查无阻塞发现；改进项 < 5 条清单化（进入 review-report 改进建议区） |

### 2.6 测试质量（NFR-006 双轨，D-005 先例延续）

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法（含通过标准） |
|---|---------|---------|---------|---------|
| C51 | **测试守恒与改写有据（D-005）**：F-23 用例零删除零回归 + 新测试文件布局合规 | NFR-006 / D-005 / plan §1-8（测试平铺 src/ 根）| 测试质量 | 检查方法：git status/diff 核验——F-23 既有测试（router/delay/runner/sleep/session/web-fetch 等）零删除、零语义改写，或改写有承接落点与记录（D-005：删除改写需有依据说明 + 承接测试文件）；新增测试文件平铺 src/ 根（兼容 base package.json tsc 通配测试脚本，plan §1-8）；lgdl-web session.test/provider.test 增补用例存在（矩阵派生断言/webSearch 字段，承接 FR-039/040）。通过标准：F-23 用例全保留全绿（无删除面或删除有记录+承接）；新测试文件位置合规；改写记录可审计 |
| C52 | **新专项测试覆盖完整性与断言有效性**：permission/audit/storage/域工具逐模块全链 + EC 覆盖映射 + 断言强度 | NFR-006 / AC-004/005/006 / plan §4.2 测试策略 | 测试质量 | 检查方法：专项测试文件存在性核对（router 增补/permission/audit/storage-*/settings/search/dom/eval/todo·goal·jobs/session/context/skill/web-search 等——按 tasks 波次完成度对应）；EC-001~015 边界覆盖映射表核对（每 EC ≥ 1 测试或显式标注「浏览器面移交 validate 冒烟」）；断言强度抽样——间谍断言（deny 时执行器零调用 FR-005）、授权两路（允许/拒绝）、ask 三路（allow/deny/超时）、冲突标记/last-write、深比较 vs 弱 ok 断言排查；弱断言（仅 ok:true 无行为断言）列为改进项。通过标准：专项清单与 tasks 波次对应无空洞；EC 覆盖映射无未标注空洞；抽样断言有效；弱断言清单化 |
| C53 | **双轨验证面完整（node 可测面 + 真实浏览器冒烟清单）**：浏览器面唯一可测项的分界记录 + FR-045 补跑基线 | NFR-006 / FR-045 / AC-006 + AC-008 | 测试质量 | 检查方法：真实浏览器冒烟清单存在且逐项可追溯（IDB/OPFS 真持久、Notification/clipboard 授权两路、ask UI 弹层、dom-* 真 DOM、eval worker、多标签冲突、恢复续跑）；node 注入桩面与浏览器面的分界记录（哪些 EC/AC 必须浏览器面验证、哪些 node 桩面已等价覆盖）；F-23 AC-008 闭环补跑基线记录（validate 报告，联动 C6）。通过标准：冒烟清单覆盖标注项；分界记录完整；补跑基线记录存在——「动态执行在 validate，review 静态核验清单/记录存在性与完整性」 |

## 3. 审查执行说明

- **审查方式**：静态阅读 + grep 门禁 + git diff/status 基线对照（R1 以 build 产物 = 工作区当前状态）；**不运行测试**（动态验证归 validate 阶段，build 阶段已实测门禁全绿，review 只核验测试存在性与断言强度）。
- **向后兼容**：plan.md v1.0 不含旧格式 §8「产物审查策略」章节——本文档审查清单由 review Agent 依 spec（FR/NFR/EC/AC/NG）+ plan（ADR/扩展接口/影响面）+ discovery（域表/NG）自主定义，不依赖 plan 的策略预设。
- **结论标准**（§6）：阻塞问题 0 个、改进项 < 5 个、规范符合率 100% → ✅ 通过；改进项存在但不阻塞 → ⚠️ 有条件通过（建议修复后验证）；存在阻塞 → ❌ 不通过（需重新实现）。
- **无法动态审查项标注**：C6（真实 AI 闭环行为）、C22/C53（真实浏览器配额/冒烟）、C31/C45/C46 的浏览器授权手测面等——静态面只核验「记录/清单/接线存在 + 差异声明完整」，显式标注「动态面移交 validate」，不判 PASS/FAIL（记「动态面」）。
- **质量门槛符合性自检**：46 FR 每 FR ≥ 1 个 Cx（见各 C 行基准列）；四维度 ≥ 1 条（规范符合性 41 / 架构一致性 7 / 代码质量 2 / 测试质量 3）；Cx 总数 53 ≥ max(46 FR, 4) 起底门槛。符合。

## 4. 状态机与文件关联提醒

- 当前 state.json `artifacts` 仅含 discovery/spec/plan 三项，`files.review` 字段未记录——本策略文档落盘后，请按 §8.2 在产出审查报告（review-report.md）时一并确认 state.json 的 `files.review` 指向 `.sddu/specs-tree-root/specs-tree-web-cli-base-v2/review.md`（state.json 由状态机管理，Agent 不直接修改）。
- 本阶段为 ADR-004 §8.1 步骤 1（策略先行，phase 保持 planned）；步骤 2（review-report.md，R1）待 tasks/build 完成后触发，届时按完成协议更新 phase=reviewed 并定向更新 Feature 目录导航（TREE.md 待 sddu-docs 扫描收录 review.md）。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：基于 spec.md v1.0（46 FR 十三组 + S-01~S-09 已裁）+ plan.md v1.0（8 ADR + §2.3 扩展接口 + §5 影响面 + 波次）+ discovery v1.1（域表/NG）自主定义 C1~C53 审查清单（规范符合性 41 / 架构一致性 7 / 代码质量 2 / 测试质量 3）。覆盖五大审查面：①九域生态位贴合（C1/C2/C3）②46 FR 规范符合（C8~C47 域行 + C19~C47）③权限三组合与安全边界（C12~C18：untrusted/eval 沙箱 C32/跨域 C3·C26·C29）④F-23 契约红线（C4/C5/C7/C26/C51）⑤代码质量与模块边界（C48~C50）；EC-001~015/AC-001~012/NG-001~009 全映射；质量门槛满足（FR ≥1 Cx、四维度 ≥1）；「不适用/动态面移交 validate」标注规则见 §3 | 2026-09-06 | SDDU Review Agent |




