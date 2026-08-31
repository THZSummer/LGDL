# 审查报告：specs-tree-web-cli-extract（F-13 ① web-cli 独立包抽取）

> **文档定位**: SDDU 审查报告 — 逐项记录自主审查的执行结果，作为 validate 阶段的输入
> **审查策略**: review.md（C1~C24 审查清单 + B1~B9 偏差复核清单，v1.0）
> **前置依赖**: review.md、spec.md、plan.md、tasks.md、state.json（builded，含 build 9 项偏差）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-08-31
> **审查轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-08-31
> **更新说明**: 初始创建 — 基于迁移后代码实况（新包 7 模块 1 适配 + core/cli/web 涉迁面）逐项执行 C1~C24 与 B1~B9 复核

## 1. 审查概要
> 审查结果的量化总览

| 维度 | 数值 |
|------|:--:|
| 审查项总数 | 24（C1~C24）+ 9（B1~B9 偏差复核） |
| 通过 | 22 |
| 警告 | 2（C14 spec 计数偏差、C21 注释漂移——均低严重度，不阻塞） |
| 失败 | 0 |
| 阻塞问题 | 0 |

## 2. 逐项审查结果（C1~CN）
> 对照 review.md 中定义的审查清单，逐项评估并记录发现

| # | 审查对象 | 审查基准 | 评估 | 发现 | 严重程度 |
|---|---------|---------|:--:|------|:--:|
| C1 | 新包骨架 | FR-001 / AC-001 / NFR-006 | ✅ | packages/ 下 7 包并列；package.json（name @lgdl/ai-command-kit、type module、main/types/exports 双路径 `./lgdl`）完整；tsconfig 就位；root workspaces `packages/*` 自动纳入（root 零改动）；dist/ 产物存在（build 已跑） | — |
| C2 | COMMANDS 注册表迁入 | FR-002 / AC-002 / AC-007 | ✅ | diff 证实 core/src/commands.ts → 新包 commands.ts 仅 3 处变化：① import 路径（./operations.js → @lgdl/core，D-013）；② defaultKindFor 从具名导出转为 buildOperation 第 4 参 kindResolver 默认值（逻辑逐字节 :126-130）；③ `args.kind ?? defaultKindFor(docType)` → `?? kindResolver(docType)`（默认等价）。COMMANDS/KNOWN_PARAMS/requireParams/assertChangeRequested/parseAttrsSpec/parseMemberSpec 零改动 | — |
| C3 | 执行层迁入 | FR-003 / AC-002 / EC-003 | ✅ | operations.ts：9 mutation import 删除 → createOperationApplier(mutations) 注入工厂；分派 switch 9 分支逐行复制（addNode 传参 id/label/kind/group/members/attrs 等字段一一对应）；applyOperations 失败即停（:168-189）与迁移前逐行一致。exec.ts：executeSubcommand 管线 11 分支（help/6 只读/4 增量）字符串集合对比仅 3 项差异 = 领域符号直调 → domain.xxx 注入引用，输出文本逐字节一致 | — |
| C4 | tools schema + LLM 客户端迁入 | FR-004 / AC-002 / D-011 / D-012 | ✅ | WEB_CLI_TOOL diff = 仅新增文件头注释，schema 逐字节一致。llm.ts：chat 双路径（Anthropic :83-143 / OpenAI :147-201）关键行为参数（max_tokens 4096、tool_use/tool_result/tool_calls 结构、dangerouslyAllowBrowser）与迁移前一致；错误消息零丢失。WEB_OP_TOOL/WEB_FETCH_TOOL 留 web provider.ts:206-289 ✓；localStorage 管理留 web :71-203 ✓ | — |
| C5 | 协议解析器迁入 | FR-005 / AC-002 / AC-007 | ✅ | web-cli.ts:23-289 → protocol.ts + web-fetch.ts（:291-327 fetch 部分按 ADR-007 留 web）。字符串集合对比零丢失零新增（唯一差异为 import 路径 './commands.js'）。parseWebCliCommand 前缀/--doc/--help 优先级/未知子命令分支结构完整 | — |
| C6 | help 自文档框架迁入 | FR-006 / EC-010 / R-009 | ✅ | 新包 help.ts:14 `import { COMMANDS } from './commands.js'`——单一数据源闭环（原 help.ts:11 自 @lgdl/core）；字符串对比仅 '@lgdl/core' → './commands.js' 差异，webCliHelp 输出文本逐字符一致；webOpHelp/webFetchHelp 留 web help.ts:108-136 ✓ | — |
| C7 | web 接线随迁 + 适配注入 | FR-007 / EC-004 / ADR-006 | ✅ | exec.ts DomainApi 收口 19 领域符号（:40-65，对应 ops.ts:10-30 直调面全量）；executeCommands 增 handleLine 扩展点（:294-303，fetch 行由 web lgdl-web.ts 注入）；web-fetch.ts 承载 executeWebFetch（:54-79，平台 fetch 留 web）；AiPanel.tsx diff 仅 import 行（:5/:6），调用点 :431/:436 零改动（迁移前 :430/:435） | — |
| C8 | cli 引用切换 | FR-008 / AC-003 / R-002 | ✅ | 9 个 mutation 命令 :4 import 全部切至 '@lgdl/ai-command-kit'（diff = 仅包名）；cli/package.json dependencies + @lgdl/ai-command-kit ✓；queries/option-hints/shared/convert/init/import 领域符号留 @lgdl/core 零改动 ✓（不切换面符合 plan §2.5.2） | — |
| C9 | core 导出面收敛与依赖方向 | FR-009 / AC-004 / NFR-003 / EC-002 | ✅ | core index.ts 删除 operations 面（applyOperation/applyOperations/describeOperation/OperationBatchResult）与 commands 面（COMMANDS/KNOWN_PARAMS/buildOperation/requireParams/assertChangeRequested/parseAttrsSpec/parseMemberSpec/defaultKindFor/CommandSpec），保留 `export type { LgdlOperation } from './types.js'`（D-013 类型契约）；grep 迁出符号 = 0 残留；core/package.json dependencies = {}（零依赖根）；无 core→新包 反向边 | — |
| C10 | 测试迁移与回归 | FR-010 / AC-005 / ADR-008 | ✅ | 静态计数：新包 82（14+9+22+27+4+6）+ web 48（4+2+4+14+6+10+8）+ core 258（206+52）= 388 ✓ 守恒；ops.test.ts 27 = exec 22 + web-fetch 3 + lgdl-web 2 分流正确；help.test.ts 8 = 新包 4 + web 4；provider.test.ts 20 = 新包 6 + web 14。动态全绿留 validate | — |
| C11 | CI 构建补齐 | FR-011 / AC-008 / R-007 | ✅ | deploy-pages.yml 含 `Build core, layout, render, ai-command-kit packages` 步骤 + paths 触发含 `packages/ai-command-kit/**`；router 构建步骤不存在（见 B2 复核——F-01 未实施，非本步回退） | — |
| C12 | 零新功能红线 | NFR-005 / NG-001 | ✅ | COMMANDS 9 增量命令不变；工具数 3（lgdl-web-cli 新包 / lgdl-web-op-cli web / lgdl-web-fetch web）；prompts.ts 三工具协议描述引用一致（:18-20）；WEB_CLI_TOOL enum 迁移前后一致（20 项，非 18——见 C14 记录） | — |
| C13 | 零语义改动① help 文本 | NFR-002 / AC-007 / EC-010 | ✅ | webCliHelp 面字符串 diff 零行为差异；help.test.ts 4 例（webCliHelp 顶层/增量命令/update no-change/未知 topic）与迁移前逐字节一致（diff 无输出） | — |
| C14 | 零语义改动② tools schema | FR-004 / AC-007 / NFR-002 | ⚠️ | WEB_CLI_TOOL 迁移前后逐字节一致（diff 仅头注释）✓；但 spec.md FR-004 声称「18 子命令 enum」与实际 20 项不符（status/validate/init/convert + 9 mutation + doc-info/get-node/get-edge/find-node + list-node-kinds/list-diagram-types + help）。迁移前 provider.ts:282-324 同为 20 项——**非迁移引入**，属 spec 描述计数偏差 | 低 |
| C15 | 零语义改动③ 协议/错误消息 | NFR-002 / AC-007 | ✅ | web-cli.ts 全部错误消息字符串（空命令/缺少前缀/lgdl 前缀提示/缺 --doc/缺 --to/未知子命令/参数缺值/意外的参数）迁移后均存在；parseWebCliBatch 失败即停（:287）与 doc 一致性校验（:245-255）逐行一致 | — |
| C16 | ADR-001/002 | plan §2.2/§2.4 | ✅ | 包名 @lgdl/ai-command-kit（中性，开源候选 ai-command-kit）；依赖图 `core(零依赖) ← ai-command-kit(deps: @lgdl/core) ← cli/web` 线性无环；新包不反向依赖 web/cli；web fetch 经 handleLine 注入（:294-303）而非反向依赖 | — |
| C17 | ADR-003 适配层 + 双面导出 | plan §3-4 | ✅ | adapters/lgdl.ts 单点组装 5 符号（lgdlKindResolver/lgdlBuildOperation/lgdlApplier/lgdlDomain/lgdlExecutor :49-99）；index.ts 双面导出（框架核心 :10-31 + 适配单例 :33-37）；`export const applyOperation/applyOperations`（:36-37）符号名与迁移前一致 → cli 调用点零改动（偏差⑤ 提前组装已复核，见 B5） | — |
| C18 | ADR-004 kindResolver 注入化 | plan §2.5.3 / D-010 | ✅ | buildOperation 第 4 参 kindResolver 默认 = 现状 defaultKindFor 逻辑逐字节（commands.ts:126-130,143）；lgdlKindResolver 显式导出（adapters/lgdl.ts:49-53）；lgdlBuildOperation 预注入（:69-73）；未注入/注入均得现状行为（er/uml-class→entity、state→state、默认 process）；commands.test.ts 14 例中 defaultKindFor 用例改导 `lgdlKindResolver as defaultKindFor`（断言零改动） | — |
| C19 | ADR-005 createOperationApplier | plan §2.5 / EC-003 | ✅ | createOperationApplier(mutations) 返回 { applyOperation, applyOperations }（operations.ts:86-89）；分派 switch 逐行复制（:92-154 与迁移前 :111-174 字段一一对应）；lgdlApplier 注入 9 mutations（adapters/lgdl.ts:56-66）；operations.test.ts 以 createOperationApplier 组装同 9 mutation 验证（断言零改动） | — |
| C20 | ADR-006 DomainApi 注入面 | plan §2.5.1 / EC-004 | ✅ | createExecutor(domain: DomainApi)（exec.ts:101）；DomainApi 收口 19 符号（:40-65）；管线分支逐字节复制（字符串集合对比实证）；executeCommands 增 handleLine/describeFetchLine 扩展点（:75-80,294-303）——不注入时行为 = 框架中性默认 | — |
| C21 | ADR-007 接线拆分边界 | plan §2.5.5 / D-011 / D-012 | ⚠️ | 拆分边界全部落实：fetch 留 web（web-fetch.ts/lgdl-web.ts）；localStorage 留 web（provider.ts:71-203）；WEB_OP/FETCH + 注册组装留 web（:326-357，W-D1 现场未移动）；chat 薄包装保 `chat(settings, turns)` 签名（:324）。发现：lgdl-web.ts:6,39 注释称「AiPanel 经 './lgdl-web' 消费」，实际 AiPanel.tsx:5 从 '@lgdl/ai-command-kit/lgdl' 子路径消费（功能无影响，注释漂移） | 低 |
| C22 | ADR-008 回归门禁口径 | plan §4.2 | ✅ | 计数守恒 388 落实（C10 实证）；「web 107」按 ROADMAP「web 侧测试面」（含新包随迁 82 例）口径解释，validate 阶段向作者说明 | — |
| C23 | 无残留 + 代码质量 | EC-006 / AC-006 | ✅ | grep 实证：无 `from './ops'`/`from './web-cli'` 旧路径残留；core/web/cli 无迁出符号定义残留；cli/web 的 '@lgdl/core' 引用全部为领域符号留用（convert/init/queries/import/option-hints/shared/App）；新包核心模块全部 type-only import @lgdl/core、零领域函数实现（grep parseLgdl/serializeLgdl/addNode 等 = 0），领域值引用收敛 adapters/lgdl.ts:46 单点；模块注释含迁移源定位（可追溯） | — |
| C24 | 测试守恒与断言有效性 | FR-010 / AC-005 | ✅ | 用例静态计数守恒（C10）；随迁断言抽样 diff：commands.test 仅 import 重定向、operations.test 仅 import+组装、protocol.test 仅 fetch 3 例分流、help.test 逐字节、llm.test 5 例逐字节 + 1 例（classifyError: Connection error）仅测试夹具 providerById → providerOf 中性化（断言本体 `/API Key 可能无效/` 不变）；exec.test 经 lgdlExecutor 单例消费（与生产路径一致）；边界/错误场景覆盖完整（缺参/未知命令/无效源码/--doc 不匹配/fetch 缺 path/畸形 JSON/CORS/404） | — |

## 3. 审查维度汇总
> 按四维度统计审查结果

| 审查维度 | 审查项数 | 通过 | 警告 | 失败 | 通过率 |
|---------|:--:|:--:|:--:|:--:|:--:|
| 代码质量 | 1 | 1 | 0 | 0 | 100% |
| 规范符合性 | 15 | 13 | 2（C14 spec 计数、C21 注释漂移） | 0 | 87%（警告不阻塞） |
| 架构一致性 | 7 | 7 | 0 | 0 | 100% |
| 测试质量 | 1 | 1 | 0 | 0 | 100% |
| **合计** | **24** | **22** | **2** | **0** | **92%（含警告）；100%（无失败）** |

## 4. 阻塞问题
> 必须修复后才能进入 validate 阶段的问题

| # | 位置 | 问题 | 对应 Cx | 修复建议 |
|---|------|------|:--:|---------|
| — | — | 无 | — | — |

## 5. 改进建议
> 非阻塞但建议优化的问题

| # | 位置 | 问题 | 对应 Cx | 建议 |
|---|------|------|:--:|------|
| 1 | packages/web/package.json | web/src 已无 openai/@anthropic-ai/sdk 直接引用（SDK 消费迁移至新包 llm.ts），web 侧两依赖冗余 | C4 | 从 web dependencies 移除（npm 去重不阻塞，属清理项） |
| 2 | packages/web/src/ai/lgdl-web.ts:6,39 | 注释称「AiPanel 经 './lgdl-web' 消费」，实际 AiPanel 从子路径 '@lgdl/ai-command-kit/lgdl' 消费 | C21 | 修正注释为「带 handleLine 的 lgdlExecutor 供 executeCommands 逐行场景；AiPanel 单命令经子路径消费」 |
| 3 | spec.md FR-004 | 「18 子命令 enum」计数与实际 20 项不符（迁移前后一致，非迁移引入） | C14 | spec 修订为 20 项（文档口径修正） |
| 4 | build.md 缺失 | build 执行摘要记录于 state.json notes，未落盘 build.md（前置条件列明） | C10 | 后续 feature 将 build 摘要落盘 build.md 或调整前置条件 |

## 6. 结论
> 审查最终结论

**结论**: ✅ 通过

| 指标 | 结果 |
|------|------|
| 审查通过率 | 92%（含警告）/ 100%（无失败） |
| 阻塞问题数 | 0 |
| 规范符合性偏差 | 0 项实现偏差（2 项低严重度发现：spec 计数描述、注释漂移，均非实现缺陷） |
| 可进入 validate | 是 |

**理由**:
1. **零语义改动实证**（核心维度）：git diff + 字符串集合对比覆盖全部六模块——commands（仅 import+kindResolver 注入）、operations（分派 switch 逐行复制）、exec（11 分支输出逐字节，仅领域符号直调→domain 注入）、protocol（零丢失零新增）、help（webCliHelp 逐字符）、tools（WEB_CLI_TOOL 逐字节）、llm（错误消息零丢失）；LgdlOperation 类型契约逐字节保留 core/types.ts（D-013）；
2. **零新功能实证**：命令 9 / 工具 3 / enum 20 项迁移前后一致，prompts.ts 协议描述未受影响；
3. **依赖方向与解耦实证**：core 零依赖无环、新包→core 单向、领域值引用收敛 adapters/lgdl.ts 单点（NFR-003/004 全满足）；
4. **引用完整性与无残留实证**：cli 9 处切换（diff 仅包名）、AiPanel 切换、core 收敛，grep 无旧路径/旧定义残留；
5. **测试守恒实证**：388 = 新包 82 + web 48 + core 258，随迁断言零改动（抽样 diff 全绿）；
6. **build 9 项偏差复核**：B1 门禁偏差（F-04/F-05 未关闭，W-D1 现场保留，作者已授权）为流程记录非实现缺陷；B2~B9 全部为 plan 未覆盖实际而做的合理调整，无新引入问题（详见下方偏差复核明细）；
7. 动态验证项（测试全绿执行、AI 面板四条路径手测）按 EC-008 设计留 validate 阶段人工复核（NFR-007/AC-009）。

**build 偏差复核明细（state.json notes 9 项）**：

| # | 偏差 | 复核结论 | 证据 |
|---|------|:--:|------|
| B1 | 门禁偏差：F-04/F-05 未关闭（W-D1 缺 WEB_FETCH_TOOL、W-D3、R-D2），作者授权继续 | ⚠️ 已如实记录、合规决策链 | W-D1 现场保留 provider.ts:346-357（OpenAI 端点 2 工具无 WEB_FETCH_TOOL）；git log 无 F-04/F-05 修复 commit；授权记录在 notes。非本步引入缺陷，validate 复核叠加风险 |
| B2 | deploy-pages.yml 原无 router 构建（F-01 未实施） | ✅ 事实修正 | workflow 无 router 步骤；新包构建+paths 已补（FR-011 达成） |
| B3 | LgdlOperation 契约迁 core/types.ts（D-013） | ✅ 类型逐字节保留 | types.ts:210-262 与迁移前 operations.ts:16-84 判别联合字段一一对应；core index.ts:28 保类型导出 |
| B4 | 新包 deps 增 openai/anthropic SDK | ✅ 迁移必然依赖 | 新包 package.json:23,25；SDK 引用仅新包 llm.ts:9-10；core 零依赖不受影响 |
| B5 | index 双面导出/lgdl 适配提前组装（TASK-008 前移） | ✅ 符合 ADR-003 | index.ts:33-37；lgdl.ts:49-99；无残留问题 |
| B6 | cli 9 命令切换提前（恢复 TASK-004 断链） | ✅ 断链已恢复 | 9 命令 import 全切；core 收敛面（index.ts）与切换同仓落地 |
| B7 | ops.ts 过渡转发层后删除 | ✅ 无残留 | ops.ts 已删（git status D）；grep 无 './ops' 引用 |
| B8 | adapters/lgdl.ts 补 executeSubcommand 具名导出 | ✅ 子路径消费就绪 | lgdl.ts:102-104；AiPanel.tsx:5 子路径消费 ✓ |
| B9 | web test 脚本文件列表更新提前 | ✅ 列表正确 | web package.json test 含 7 文件（locate/snap/provider/web-fetch/lgdl-web/next-actions/help） |

## 修订记录
> 记录本文档的版本变更历史

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：基于迁移后代码实况逐项执行 C1~C24 + B1~B9；结论 ✅ 通过（阻塞 0、改进 4、规范符合率 100% 实现面） | 2026-08-31 | SDDU Review Agent |
