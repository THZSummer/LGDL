# 审查报告：specs-tree-web-cli-base-v2（web-cli-base v2：面向浏览器生态位的 agent 能力完备化——九域浏览器原生工具集 + 增强/进阶层机制）

> **文档定位**: SDDU 审查报告 — 逐项记录自主审查的执行结果，作为 validate 阶段的输入
> **审查策略**: review.md（C1~C53 审查清单，v1.0）
> **前置依赖**: review.md、spec.md v1.0、plan.md v1.0、discovery.md v1.1、build.md（P0+P2+GATE；state phaseNote 含 P1 完成）、state.json（builded）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-06
> **审查轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-06
> **更新说明**: 初始创建 — 基于 build 产物代码实况（git status/diff + web-cli-base/src 66 文件 + lgdl-web ai/ 全量静态阅读 + grep 门禁 + 测试清单盘点）逐项执行 C1~C53；零测试运行（动态面移交 validate，build 已实测 base 204 + lgdl-web 51 + 全仓 GATE 全绿）

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查项总数 | 53（C1~C53） |
| 通过 | 49 |
| 警告 | 4（C6 / C32 / C44 / C53，均不阻塞 validate 启动） |
| 失败 | 0 |
| 阻塞问题 | 0 |
| 改进建议 | 5（IMP-1~IMP-5，低严重度） |

**结论：⚠️ 有条件通过** — 代码质量合格、规范符合率 100%（49/49 静态可判定项全 PASS）、无阻塞问题；4 项 WARN + 5 项低严重度改进建议不阻塞 validate 启动（其中 C6/C53 属「记录待 validate 补齐」移交面，C32/C44 建议 validate 前置顺手处理）。

## 2. 逐项审查结果（C1~C53）

> evidence = 文件:行号（均为静态阅读 + grep + git 基线结论；未运行测试）

| # | 审查对象 | 审查基准 | 评估 | 发现（含 evidence） | 严重程度 |
|---|---------|---------|:--:|------|:--:|
| C1 | 九域工具面覆盖 | AC-002 / A-01 / plan §2.2 | ✅ | 九域模块齐备：DOC(doc-tools.ts)、STR(storage-tools.ts+storage-{mem,idb,opfs}.ts+settings.ts)、SRC(search-tools.ts)、NET(web-fetch/web-search/save-file/stream)、DOM(dom-tools/ask-user/notify/clipboard)、EXE(eval-tools/exec-remote/worker-session)、TSK(todo/goal/jobs/subagent)、SES(session-store/session-tool/context-tool)、EXT(skill-loader/mcp-client)+REG(router.ts v2)；lgdl-web session.ts:171-188 P0+P1 注册矩阵；P2 试点仅导出未注册（按矩阵默认关，build.md §6 有记录）；workflow 按 S-04 后置裁剪有记录 | — |
| C2 | 生态位纪律 grep 门禁 | D-5/D-6 / NG-007 / NFR-010 / AC-003 | ✅ | base src（43 生产文件）grep：无 read/write/edit/grep/glob/bash 工具名、无文件路径参数语义、无 OS 术语 schema（0 命中）；内容/存储/检索语义对象 = docId/卷条目/内容集（doc-tools.ts:1-15、storage-mem.ts:1-6、search-tools.ts:1-6）；eval 帮助面声明「非 shell、无文件系统/OS 面」（eval-tools.ts:205） | — |
| C3 | 范围纪律与不可承载面 out | NG-001~009 / A-02 | ✅ | NG-001 真 shell/socket/stdio MCP 零实现（mcp-client.ts:1-6 明示 Streamable HTTP、stdio 不可承载）；NG-004 exec-remote 仅契约+禁用态+「代理 OS 能力」声明（exec-remote.ts:6,24,56）；LGDL C 档零改动（git status：lgdl-web-cli/op-cli/lgdl-core/layout/render/router 均不在变更集）；NG-003 dom 同源边界 help 声明（dom-tools.ts:3-11,130）；NG-009 无 CORS 穿透（web-fetch.ts:73-80 CORS 仅转译提示）；base 零 UI（grep 无 React/AskDialog） | — |
| C4 | F-23 契约 additive 红线 | FR-043 / ADR-001 | ✅ | router.ts:60-86 ToolEntry 仅追加 group/namespace/enabled/risk 可选字段；注册键 = fqNameOf（namespace 空 = name，router.ts:169-172）；dispatch 五步链（router.ts:519-586：查条目→enabled→PermissionGate→delay→executor→审计）；deriveTools 缺省只含启用工具且顺序 = 业务注册序+内建置末（router.ts:432-445，router.test.ts 保留顺序断言）；F-23 router.test 既有用例原样保留（30 例含 10 例 F-23 语义） | — |
| C5 | 世界模型扩展（文档态→状态态） | FR-044 / plan §2.3.4 | ✅ | ToolContext.docId/source 保留 + services?: ToolServices 追加（router.ts:102-109）；lgdl-web dispatch ctx.services 注入 session/goals/jobs/audit（session.ts:236-247）；docId/source 语义不变（doc-tools 仍读 ctx.source/docId） | — |
| C6 | 验证基线前置 + 行为等价/声明 | FR-045/046 / AC-008 | ⚠️ | FR-045 前置人工基线（F-23 AC-008 真实闭环补跑）尚未形成记录——build.md §6:132 声明「真实浏览器冒烟面…移交 validate（FR-045/AC-008 基线）」；FR-046 行为清单 diff 未落盘；lgdl-web 新接线（ask/dom-* 门禁/web-search）无现成 5 工具路径对比记录。静态面无差异声明可核验 → 移交 validate 补齐（非 build 缺陷） | 中（移交面） |
| C7 | F-23 机制源码零语义改动 | ADR-007 / plan §5.3 | ✅ | git status/diff：runner.ts/delay.ts/sleep.ts/llm.ts/protocol.ts/exec.ts/commands.ts/operations.ts/help.ts 零改动；AgentRunner 复用（session.ts:220 createAgentRunner、subagent.ts:63 嵌套复用）；base 变更仅 router/index/tools/web-fetch + 测试（git diff --stat 一致） | — |
| C8 | 工具分组/目录（FR-001） | FR-001 / NFR-005 | ✅ | groupKeyOf = group→namespace→'general'（router.ts:165-167）；listHelp ≥2 组分节 + 禁用标注（router.ts:474-498）；deriveTools 支持 group/namespace 切片（router.ts:432-440）；assembly.test 「分组/顺序契约」断言 | — |
| C9 | 命名空间（FR-002） | FR-002 / EC-010 | ✅ | 注册键 = fqn ns.name（router.ts:169-172,294）；ns-less 名含 "." 抛错（router.ts:289-293）；同基名共存 + 可逆解析（router.test：skill.search ×7、同基名 ×2、setNamespaceOrder ×3、query ×7）；文本前缀缺省 = 全限定名可逆（router.ts:452-461） | — |
| C10 | 动态注册/卸载/查询（FR-003） | FR-003 / EC-010 | ✅ | register(entry,{source,allowedTools})/unregister/query（router.ts:287-372）；卸载清 nsFqns/nsSeen/sourceByFqn + 审计（:330-358）；重复注册抛错；router.test：unregister ×6 / query ×7 / 动态源审计 | — |
| C11 | 工具开关模型（FR-004） | FR-004 / EC-001/006 | ✅ | entry.enabled + enabledTools 白名单（router.ts:375-393）；禁用三链：deriveTools 不含（缺省 enabled:true 过滤）/ listHelp+helpFor 标注「已禁用」（:491,505）/ dispatch「✖ 已禁用」显式文案（:526-528）；EC-001 三态互异（未注册 :523 / 已禁用 :527 / 权限被拒 permission.ts）；router.test「已禁用」×7 + EC-001 ×5；web-search 未配置 → 运行时禁用态+指引（web-search.ts:7,19） | — |
| C12 | 框架级策略挂点（FR-005） | FR-005 / ADR-002 / NFR-003 | ✅ | dispatch step3 PermissionGate 先于 delay gate（router.ts:531-556，deny 短路不等待）；无旁路（grep：permission/PermissionGate 仅 router.ts + permission.ts 引用，业务/域工具零自行策略）；deny → ok:false「权限被拒」+ 执行器未被调用（permission.test.ts 间谍断言）；PostToolUse tool-call 审计（router.ts:564-572）；策略对象注入 read-before-edit（permission.test「策略对象注入」） | — |
| C13 | 权限裁决语义（FR-006） | FR-006 / EC-014 | ✅ | 裁决管线：allowed-tools→规则集→策略→缺省（permission.ts:208-294）；denyPriority 缺省 true（:175，EC-014 deny 优先，permission.test 断言可关闭）；缺省取向 read allow / 敏感 ask / riskDefaults 声明（:150-153,270-272）；决策入审计（router.ts:544-552 decision/reason/by/ruleIndex） | — |
| C14 | ask 交互契约（FR-007） | FR-007 / EC-002 | ✅ | AskHandle + settle + 超时（permission.ts:96-109,317-353：onAsk 桥、askTimeoutMs 缺省 20000、取消/超时→deny）；dispatch await check → runner await dispatch（挂起不推进）；无桥 fail-closed（:324-326）；permission.test：ask allow/deny/超时三路 + AskHandle settle；lgdl-web AskDialog + bindPermissionAsk 双入口接线（AiPanel.tsx diff、AskDialog.tsx） | — |
| C15 | 技能级 allowed-tools（FR-008） | FR-008 / FR-036 | ✅ | 注册时授权校验被拒 + 审计（router.ts:299-309）；dispatch 前冗余护栏（permission.ts:211-218）；skill 安装越权抛错（skill-loader.ts:89-91）+ mcp allowed-tools 过滤（mcp-client.ts:143）；三处测试（router/permission/mcp-client/skill-loader 段） | — |
| C16 | 浏览器 API 授权失败转译（FR-009） | FR-009 / EC-003 | ✅ | classifyCapabilityError/capabilityGuidance/translateCapabilityError（platform.ts:169-211，五类可读指引互异）；platform.test 五例（分类/转译/指引文案）；notify/clipboard/save/dom 等工具经 PlatformEnv 转译（notify.ts:35-38、clipboard.ts:5,44、save-file.ts:31） | — |
| C17 | 内容可信 untrusted（FR-010） | FR-010 / EC-007 | ✅ | web-fetch 结果 trust:untrusted（web-fetch.ts:139，独立于清洗不丢失）；web-search 结果 trust + 边界声明文案（web-search.ts:38,52）；eval-js 默认拒 untrusted（eval-tools.ts:158-167，EC-007 测试）；注：exec-remote（P2 未注册）结果未带 trust 元数据 → 入 IMP-5 | — |
| C18 | 审计与可观测横切 | NFR-003/009 | ✅ | AuditSink 六事件类型（audit.ts:21-27：permission/tool-call/extension-register/extension-unregister/context-compact/ask）；router 记录 permission/tool-call/extension（router.ts:593-611）；context-tool 记录 context-compact（ctx.services.audit）；audit.test 四类事件断言；注：'ask' 事件类型未实际发射（decision 已含于 permission 事件）→ IMP-3 | — |
| C19 | doc-read（FR-011） | FR-011 / D-5 | ✅ | 内容对象三来源 resolve/ctx.source/services（doc-tools.ts:1-15,30-31）；无上下文 → 友好错误 + 可读对象列表（doc-tools.test「无上下文→友好错误+列出可读对象」）；schema 无路径参数（grep 无 path 遍历语义） | — |
| C20 | doc-edit（FR-012） | FR-012 / F-23 契约 | ✅ | applyDocEdit 纯函数 str_replace/insert/create（doc-tools.ts:87,105）；changed+source 推进（F-23 契约兼容，测试「返回 changed+source 推进」）；read-before-edit 不内建、由策略承载（:15,231 + doc-tools.test「未先读→ask 联动、deny 执行器不被调用」） | — |
| C21 | storage 通用持久卷（FR-013）+ 载体（ADR-003） | FR-013 / ADR-003 / EC-004/005 | ✅ | StorageBackend list/read/write/remove+estimate/persist+revOf（storage-mem.ts:55-77）；三实现 mem/idb/opfs（storage-mem.ts:88 / storage-idb.ts:56-62 node 无 indexedDB 抛 NotFoundError / storage-opfs.ts:42）；EC-013 rev/expectedRev conflict（storage-mem.ts:115-128 + storage-idb.ts:146）；storage-tools.test：CRUD 全链 / EC-004 配额超限「配额不足」+清理建议 / EC-013 冲突 / 卷条目名路径越界拒绝（D-5）；EC-005 降级语义文档化（assembly/mem 注释）；真实 IDB/OPFS 冒烟预留注释（validate 承接） | — |
| C22 | storage-quota（FR-014） | FR-014 | ✅ | estimate/persist 输出可读 + 可解析（storage-tools.test「输出可读+可解析（FR-014）」+ memory estimate 实现 storage-mem.ts:134-138）；注入假 estimate 断言存在 | — |
| C23 | settings（FR-015/042） | FR-015 / FR-042 | ✅ | SettingsStore 命名空间隔离 `ns:key`（settings.ts:106-115）；localStorage 适配器 + memory 双后端 + node 无 LS 降级（settings.ts:41-42 + settings.test「node 无 LS 降级 memory」）；lgdl-web provider 数据平移不强绑（settings.ts:1-8 注释 + provider.ts diff 仅增 webSearch 字段、既有键读写零改动）；settings.test 5 例 | — |
| C24 | search-content（FR-016） | FR-016 / EC-011 | ✅ | 内容集语义对象 doc/volume/session（search-tools.ts:18,42）；命中含资源/行号/列（search-tools.test「含上下文行与位置」）；无索引线性扫描两次一致；预算护栏 maxBytes 截断/maxHits 上限（search-tools.test「预算护栏（EC-011）」） | — |
| C25 | list-resources（FR-017） | FR-017 | ✅ | 资源目录 doc/volume/session 与 web-cli-help 工具目录语义区分（search-tools.ts:10,18 + search-tools.test「与 web-cli-help 工具目录语义区分」） | — |
| C26 | web-fetch 升级（FR-018） | FR-018/043 / §3.6 A | ✅ | schema 仅追加可选 clean/maxBytes/timeoutMs（tools.ts diff：path 仍 required、缺省描述保留）；executeWebFetch(F-23 入口) 委托 WithOptions({}) 保持原行为（web-fetch.ts:208-218 + web-fetch.test「F-23 入口逐字节兼容」）；清洗默认关零依赖（:94-112）；护栏截断 + 元信息（:161-167）；错误分类网络/CORS/HTTP/超时可读（:68-82）；trust 内置（:139）。注：缺省 maxBytes=512KB 现在也作用于原入口（additive 护栏，超 512KB 输出带截断注记——声明为 FR-018 默认护栏） | — |
| C27 | web-search（FR-019） | FR-019 / EC-006 | ✅ | env.search 注入、base 零内置端点/key（web-search.ts:1-8；grep 无硬编码 URL）；未配置 → 禁用态 + WEB_SEARCH_CONFIG_GUIDE（:19 + web-search.test「EC-006 未配置→禁用态」+「enabled:false → schema 不含」双态）；结果带 untrusted（:38,52） | — |
| C28 | save/download + stream（FR-020/021） | FR-020/021 / EC-003 | ✅ | save FSA+下载链两路径 + 取消/拒绝可读（save-file.ts:19-31 + save-file.test 授权两路/下载链冒烟）；stream 连接/订阅/接收/关闭 + 超时（stream.ts + p2-web-tools.test「subscribe 收 N 条消息返回并关闭」）；P2 均经 env 注入 | — |
| C29 | dom-\*（FR-022） | FR-022 / NG-003 / FR-005 | ✅ | 子命令族 read-state/click/hover/scroll/zoom/fullscreen/snapshot（dom-tools.ts:90 + PlatformDomOps platform.ts:86-101）；同源边界（NG-003）无 iframe/跨站代码（dom-tools.ts:3-11 + grep）；写类受 PRM：App aiPolicy rules [{risk:'ui',action:'ask'}]（App.tsx diff）+ dom-tools.test「写操作 deny 策略拦截——ops 未被调用」；无 op-cli React handler 依赖（经 env.dom.ops 注入）；注：read-state/snapshot 与写子命令共用工具级 risk:'ui'（只读也会触发默认 ask 取向）→ IMP-4 | — |
| C30 | ask-user（FR-023） | FR-023 / NG-008 | ✅ | 三型契约 choice/confirm/text + 回答回填 + 取消（ask-user.ts:1-35,65-81 + ask-user.test「fake 应答器三型」）；与 PRM ask 语义区分显式声明（ask-user.ts:9-11,70 + help）；UI 归场景（AiPanel/AskDialog 接线） | — |
| C31 | notify + clipboard（FR-024/025） | FR-024/025 / EC-003 | ✅ | notify 授权两路：denied→降级路径提示、unsupported→可读（notify.ts:35-38 + p2-web-tools.test「granted/denied/unsupported 三路」+「show 抛 NotAllowedError→转译」）；clipboard 读/写 + 授权失败转译（clipboard.ts:44,63-67 + 测试）；均经 env 缝 | — |
| C32 | eval-js/eval-wasm（FR-026） | FR-026 / ADR-005 / EC-007 | ⚠️ | eval-js：worker 执行器注入（createWorkerEvalExecutor eval-tools.ts:68-95）、超时 terminate、纯计算、副作用由 risk:'write' + PRM + worker 端 blocked 报告（:59,169-171）、untrusted 默认拒（:158-167，EC-007 测试）、CSP/非 OS 沙箱声明（help :205-207）；**eval-wasm 缺 untrusted 拒执行闸门**：executeEvalWasm 无 trusted 参数/拒绝分支，wasm 执行器恒 post trusted:true（:101-128,235-248）与其注释「与 eval-js 同语义 EC-007」（:234）不符 → IMP-1 | 低（P2 未注册） |
| C33 | exec-remote + worker-session（FR-027/028） | FR-027/028 / NG-004/005 | ✅ | exec-remote：env 注入端点、未配置禁用+指引、代理声明（exec-remote.ts + p2-exec.test「未配置→禁用态+指引」）；worker-session：状态跨调用存活、崩溃重建主会话不中断（worker-session.ts:25-57 + p2-exec.test）、无 PTY 声明、页面卸载即失（:1-8）；远程结果 trust 缺失 → IMP-5 | — |
| C34 | todo（FR-029） | FR-029 / S-01 | ✅ | TodoStore 随会话持久化（todo.ts:1-10 + task-state.test「CRUD+随会话持久化（恢复后清单仍在）」）；会话级非独立跨会话 | — |
| C35 | goal（FR-030） | FR-030 / EC-013 | ✅ | GoalStore create/get/update/archive+进度、rev 冲突标记（goal.ts:66-75 + task-state.test「多实例共享读+冲突标记」）；宿主注入 backend（会话组装 session.ts:168） | — |
| C36 | jobs（FR-031） | FR-031 / EC-008/015 | ✅ | submit→jobId 即时返回（jobs.ts:153-177 fire-and-forget + delayMs:0 :308）；status/result/log/cancel/retry/list；终态不被覆盖 isJobTerminal（:20-23,160,168）；markJobsInterrupted 页面卸载标记（:39-50）；task-state.test：interrupted→可查可重试（EC-008）/cancel/EC-015 即时返回/未注入 runner 报错；无常驻守护语义（help :296） | — |
| C37 | subagent（FR-032） | FR-032 / EC-009 | ✅ | 嵌套 createAgentRunner 同线程（subagent.ts:63）；会话隔离非进程隔离声明 + 安全归 PRM（:31-32,117）；工具白名单 parseWhitelist（:100 + subagentHelp）；子会话失败 ok:false 主会话不中断（task-state.test「嵌套 AgentRunner 子会话执行并回收结果」+ EC-009 语义）；lgdl-web 注册为 enabled:false（session.ts:186） | — |
| C38 | workflow（FR-033） | FR-033 / S-04 | ✅ | 无 workflow.ts = 按 S-04「后置」显式裁剪（build.md §6:114 裁剪记录；plan §8 波 3 未列 workflow 交接）。不适用实现审查 → 判「后置记录存在」通过 | — |
| C39 | session（FR-034） | FR-034 / ADR-007 / EC-005/013 | ✅ | SessionStore IDB+memory 双轨、rev 冲突/last-write（session-store.ts:46-133 + task-state.test「持久→恢复 turns 等价」「EC-013 冲突标记」）；恢复入口 UI 归场景（App.tsx restorable chip）；runner 主体零改动（ADR-007）；EC-005 降级注释明示。注：lgdl-web 场景默认 memory 未注入 IDB → IMP-2 | — |
| C40 | context（FR-035） | FR-035 / NFR-009 | ✅ | compact：summarizer env/依赖注入、原始记录存档 `context:archive:<id>:<ts>` 可检索、审计 context-compact（context-tool.ts:1-8 + task-state.test「压缩后体量下降+可检索+原始存档+审计」）；触发阈值场景声明（base 不硬编码） | — |
| C41 | skill 目录加载（FR-036） | FR-036 / FR-008 / S-06 | ✅ | parseSkillMd frontmatter（name/description/allowed-tools 内联+列表）+ createSkillPrompt 提示注入 + 边界声明（skill-loader.ts:28-73）；installSkill 强制 skill:* 命名空间 + allowed-tools 越权抛错 + source 审计（:83-96）；fetchRemoteSkill 运行时接口 + CSP connect-src 约束文档化（:102-108）；测试覆盖存在（内嵌 eval-tools.test.ts 3 例，非独立文件——结构注记 IMP-6 弃、并入 IMP 清单说明） | — |
| C42 | MCP Streamable HTTP（FR-037） | FR-037 / ADR-006 / EC-012 | ✅ | 轻量 JSON-RPC fetch 客户端零官方 SDK（mcp-client.ts:39 + package.json 零新增依赖）；initialize/tools/list/tools/call 全链测试（mcp-client.test 5 例）；connectMcpSource 动态注册 mcp:* + source 审计 + allowed-tools 过滤（:143-165）；端点不可达→该源降级其余不受影响（mcp-client.test「EC-012」）；stdio 无实现 | — |
| C43 | 扩展注册治理（FR-038） | FR-038 / NFR-009 | ✅ | register/unregister 带 source 全程入 audit（router.ts:299-309,315-325,345-356）；跨 ns 共存 + 同 ns 重名拒绝（router.ts:294-297）；卸载清理完整（nsFqns/sourceByFqn 联动）；audit.test 扩展注册/卸载事件含来源/时间/命名空间 | — |
| C44 | 默认注册矩阵（FR-039） | FR-039 / S-08 / AC-007 | ⚠️ | session.ts:171-188 消费 P0 矩阵 + P1 扩域：storage/settings/doc/session/context 默认开、web-search 条件开（runAgent 按 webSearch 配置注入 env.search，session.ts:207-216）、dom 开（写经 PRM ui ask，App aiPolicy）、eval-js/subagent enabled:false（显式装载）；矩阵三链断言（assembly.test + session.test 改写有据 D-005）；**gap：场景未注入 IDB 载体**——createAiSession 缺省 createMemoryStorage（session.ts:166），App.tsx createAiSession 未传 backend/sessionStore → lgdl-web 实际「刷新可恢复/goal·jobs 落 IDB」在场景侧未接通（base 载体就绪、validate 浏览器面仍以 base 工具验证）→ IMP-2 | 中（场景接线） |
| C45 | web-search key/端点（FR-040） | FR-040 / S-08 | ✅ | ProviderSettings.webSearch BYOK（provider.ts diff）；端点+key 都填才落位（SettingsPanel diff）；未配置 → 禁用+指引（EC-006）；key 零泄露：不进 schema/help/log（grep apiKey 仅 provider.ts/SettingsPanel 存储与输入，无 console/log 输出）；provider.test webSearch 读写/缺省用例 | — |
| C46 | ask/配置 UI 归属（FR-041） | FR-041 / NG-008 | ✅ | AskDialog 权限 ask（allow/deny/remember）+ ask-user 双入口（AskDialog.tsx）；AiPanel bindPermissionAsk/bindAskUser（AiPanel diff）；App aiPolicy onAsk fail-closed deny（App diff）；SettingsPanel web-search BYOK + skill/MCP 配置入口（若入范围）；base 零 UI（grep 零命中 AskDialog/React） | — |
| C47 | provider 应用态复议（FR-042） | FR-042 / S-09 | ✅ | settings 骨架入 base（settings.ts 独立可测 + 5 例）；lgdl-web provider localStorage 旧字段读写零回归（provider.test 既有用例保留 + webSearch 缺省不落键）；无强制迁移代码 | — |
| C48 | 分层与依赖/中性纯度 | NFR-001/002/008 / AC-001/009/010 | ✅ | base 生产文件 grep：@lgdl/react import 0 命中、React/JSX 泄漏 0（build.md §6:130 GATE grep）；package.json dependencies 仅既有 openai/@anthropic-ai/sdk（零新增运行时依赖，web-fetch 清洗/mcp 自实现）；机制层（router/permission/audit/assembly）零浏览器直用（grep window/document 仅 platform.ts + storage 载体适配器 storage-idb/opfs 的结构化 globalThis 访问）；依赖方向单向（无 base→业务边）；base tsc/test 独立绿 | — |
| C49 | 模块边界与工厂形态 | plan §2.2 / NFR-004 | ✅ | 域模块 = createXxxToolEntry/Tools(env/deps) 工厂内聚（index.ts 导出 20+ 工厂）；跨域状态经 ctx.services/assembly 注入（session.ts:240）；共享浏览器能力收口 PlatformEnv（platform.ts 单缝）；工具路由知识单点注册条目（register 一处 → 四链可见，router.test「注册假工具四链」） | — |
| C50 | 新模块代码质量走查 | 项目宪法 / §5.1 | ✅ | 走查 66 文件：职责内聚（dispatch 五步链/permission 管线/jobs 生命周期/session store 各自单文件）；错误路径覆盖（EC-001~015 分支均有对应实现+测试）；魔法值参数化/常量提取（BUILTIN_ORDER router.ts:123、clamp [0,5000]、maxBytes 512KB 等声明于接口注释）；命名清晰（fqNameOf/groupKeyOf/isJobTerminal）；无重复实现（translateCapabilityError 全工具复用）；注释准确（浏览器生态位语义标注） | — |
| C51 | 测试守恒与改写有据（D-005） | NFR-006 / D-005 | ✅ | git diff：base 测试仅 router/web-fetch 增补（无删除）；lgdl-web session.test 派生顺序断言随矩阵「改写有据」（代码注释记录 D-005，承接矩阵派生断言）；provider.test 增补（零删除）；新测试 23 文件全部平铺 src/ 根（兼容 tsc src/*.test.ts 通配，package.json test 脚本）；F-23 既有用例只增不删（build.md §6:131） | — |
| C52 | 测试覆盖与断言有效性 | NFR-006 / AC-004/005/006 | ✅ | 专项测试齐备：permission 13/router 30/audit 7/platform 5/assembly 4/storage-tools 8/settings 5/doc 8/search 6/web-fetch 13/web-search 5/save 4/task-state 16/eval 9(含 skill-loader 3)/dom 7/mcp 5/p2-exec 5/p2-web-tools 7；关键断言强度：间谍断言（deny 执行器不被调用）、授权两路、ask 三路+超时、EC-013 conflict、EC-008 interrupted、EC-015 即时返回、EC-012 降级隔离；EC-001~015 逐项有测试或显式 validate 标注；弱断言未发现系统性 | — |
| C53 | 双轨验证面完整 | NFR-006 / FR-045 / AC-006/008 | ⚠️ | node 面全覆盖（上述专项全 node 注入桩）；真实浏览器冒烟清单存在但未执行（storage-tools.test.ts 预留注释 + build.md §6:132 移交清单：FSA/Notification/clipboard 授权、ws/SSE、eval-wasm、MCP 真端点、dom-* 真 DOM、IDB/OPFS 真持久、多标签冲突）；FR-045 F-23 真实闭环补跑基线记录未产生 → 移交 validate（与 C6 同源）；IDB/OPFS/授权两路均标注浏览器面唯一可测 | 中（移交面） |


## 3. 审查维度汇总

| 审查维度 | 审查项数 | 通过 | 警告 | 失败 | 通过率（可判定项） |
|---------|:--:|:--:|:--:|:--:|:--:|
| 规范符合性 | 41 | 37 | 4（C6/C32/C44/C53） | 0 | 100%（37/37 可判定；4 项 WARN 为移交面或低严重度缺口） |
| 架构一致性 | 7 | 7 | 0 | 0 | 100% |
| 代码质量 | 2 | 2 | 0 | 0 | 100% |
| 测试质量 | 3 | 3 | 0 | 0 | 100% |

## 4. 阻塞问题

无（0 个阻塞问题——无 FAIL、无红线破坏：F-23 additive 零回归、runner 零改动、C 档零改动、D-005 守恒均核验通过）。

## 5. 改进建议

| # | 位置 | 问题 | 对应 Cx | 建议 |
|---|------|------|:--:|------|
| IMP-1 | packages/web-cli-base/src/eval-tools.ts:234-248 | eval-wasm 无 untrusted 默认拒执行闸门（无 trusted 参数/拒绝分支，worker 恒 trusted:true），与 :234 注释「与 eval-js 同语义 EC-007」不符 | C32 | 补 eval-wasm 的 trusted 声明/拒绝路径（对齐 eval-js：未显式 trusted → ok:false + EC-007 文案）；或修正注释并记录为显式差异声明（P2 试点未注册场景，低危） |
| IMP-2 | packages/lgdl-web/src/App.tsx:1167 + session.ts:166 | lgdl-web 场景未注入 IDB 载体（createAiSession 缺省 memory），「刷新恢复/goal·jobs 落 IDB」在真实场景未接通 | C44/C39 | App 组装 createAiSession 时注入 deps.backend = createIdbStorage()（或经 browserEnv 提供），使 FR-030/031/034 场景闭环；validate 真实浏览器验证前置此项 |
| IMP-3 | audit.ts:26（'ask' 事件类型） | 'ask' 审计事件类型未实际发射（ask 裁决已含于 permission 事件 decision/by） | C18 | 保留（扩展契约）或移除死类型并更新 audit.test 类型断言——二选一，消除「定义未使用」 |
| IMP-4 | dom-tools.ts:141 | dom 工具级 risk:'ui' 覆盖 read-state/snapshot 只读子命令（默认取向下只读也触发 ask） | C29 | 将只读子命令（read-state/snapshot）与写子命令分级（策略对象按 subcommand 细分，或场景 riskDefaults 放行只读 dom），减少 AI 流畅度损耗 |
| IMP-5 | exec-remote.ts / worker-session.ts | 远程执行/持久上下文输出未带 untrusted 可信标记（FR-010 列「远程执行结果」） | C33/C17 | P2 试点完善面：exec-remote 返回 ToolResult.trust（level:'untrusted'）或显式差异声明记录（未注册场景低危） |

## 6. 结论

**结论**: ⚠️ 有条件通过

| 指标 | 结果 |
|------|------|
| 审查通过率 | 100%（49/49 静态可判定项 PASS；4 项 WARN 均不阻塞） |
| 阻塞问题数 | 0 |
| 规范符合性偏差 | 0 项 FAIL |
| 可进入 validate | 是 |

**理由**: 九域浏览器生态位工具面与机制层落地质量高——F-23 additive/runner 零改动/C 档零改动/测试守恒四条红线全部守住，权限门禁三组合（规则/策略/allowed-tools）与安全边界（untrusted/eval 沙箱/跨域）实现完整且有强断言测试；46 FR 对应实现逐项可追溯。4 项 WARN 中：C6/C53 为 validate 移交面（FR-045 真实闭环补跑记录 + 浏览器冒烟待 validate 执行）；C44 为 lgdl-web 场景 IDB 载体未注入（base 就绪，建议 validate 前接线）；C32 为 eval-wasm untrusted 闸门缺失（P2 未注册、低危）。无阻塞问题、无 FAIL，建议修复 IMP-1/IMP-2（validate 前置顺手处理）后进入 validate。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | R1 初始创建：基于 build 产物（P0+P1+P2+GATE 全波次）静态执行 C1~C53——49 PASS / 4 WARN（C6/C32/C44/C53）/ 0 FAIL / 0 阻塞；5 项改进建议（IMP-1~5）；结论 ⚠️ 有条件通过 | 2026-09-06 | SDDU Review Agent |
