# 验证报告：specs-tree-web-cli-extract（F-13 ① web-cli 独立包抽取）

> **文档定位**: SDDU 验证报告 — 逐项记录自主验证的执行结果，作为工作流终点
> **验证策略**: validate.md（v1.0，V1~V17 验证场景及五维度指引）
> **前置依赖**: validate.md（验证策略）、spec.md（需求规范）、review-report.md（审查报告，状态 passed）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-08-31
> **验证轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-08-31
> **更新说明**: 初始创建 — 基于迁移后代码实况（新包 7 模块 1 适配 + core/cli/web 涉迁面 + 基线 tag v0.6-f13-baseline）逐项执行 V1~V17；动态验证全部真实执行（388 测试、CLI 冒烟、行为等价 diff、构建、headless 渲染冒烟）

---

## 1. 验证概要
> 验证结果的量化总览

| 维度 | 数值 |
|------|:--:|
| 验证项总数 | 17（V1~V17） |
| 通过 | 16 |
| 失败 | 0 |
| 无法执行 | 0 |
| 部分验证（转人工复核） | 1（V16 AI 面板四条路径完整行为 — 需真实 LLM API Key + 浏览器人工交互，按 EC-008 标注人工复核项；自动可验证部分已执行） |
| 阻塞问题 | 0 |

## 2. 逐项验证结果（V1~V17）
> 对照 validate.md 中定义的验证场景，逐项执行并记录实测结果

| # | 验证对象 | 验证步骤摘要 | 预期结果 | 实测结果 | 判定 |
|---|---------|------------|---------|---------|:--:|
| V1 | 包结构就位（FR-001/AC-001） | `ls packages/` 计数；新包 package.json/tsconfig/src 核验；root node_modules 解析 | 7 包并列；package.json 完整；workspace 纳入 | `ls packages/` = 7（ai-command-kit/cli/core/layout/render/router/web）；package.json name `@lgdl/ai-command-kit`、type module、main/types、exports 双路径（`.` + `./lgdl`）完整；root node_modules/@lgdl/ai-command-kit 链接存在 | ✅ |
| V2 | 依赖方向无环 + core 零依赖（FR-009/NFR-003/AC-004/EC-002） | core/package.json grep dependencies；新包 package.json dependencies；`npm ls`；grep core→新包 反向引用 | core 零依赖；新包→core 单向；无反向边无环 | core/package.json **无 dependencies 字段**（零依赖根 ✓）；新包 deps = `@lgdl/core` + openai + @anthropic-ai/sdk；`npm ls @lgdl/core @lgdl/ai-command-kit` 输出 `ai-command-kit → core`、`cli → ai-command-kit → core`、`web → ai-command-kit → core` 线性无环；grep core/ 中 `@lgdl/ai-command-kit` 仅 2 处**注释文本**（types.ts:208「供 @lgdl/ai-command-kit 单向依赖保类型」+ dist/types.d.ts:127）——非实际依赖 | ✅ |
| V3 | 导出面清单（AC-002） | 新包 index.ts 导出面逐符号核对 | 与 §5 一致 + 适配单例 | index.ts:10-37 双面导出齐全：注册表（COMMANDS/KNOWN_PARAMS/buildOperation/requireParams/assertChangeRequested/parseAttrsSpec/parseMemberSpec :11-18）、执行层（describeOperation/createOperationApplier + applyOperation/applyOperations 具名 :20-21,36-37 + LgdlOperation type :25）、tools+LLM（WEB_CLI_TOOL/chat/parseToolArguments/classifyError :22-23）、协议（tokenizeCli/parseArgs/parseWebCliCommand/parseWebCliBatch :26）、help（webCliHelp :28）、exec（createExecutor :30）、适配（lgdlKindResolver/lgdlBuildOperation/lgdlApplier/lgdlDomain/lgdlExecutor :33） | ✅ |
| V4 | core 导出面收敛（FR-009/AC-004） | grep core/src/index.ts 迁出符号 | 无迁出导出 | `grep "applyOperation\|buildOperation\|COMMANDS\|KNOWN_PARAMS\|requireParams\|assertChangeRequested\|parseAttrsSpec\|parseMemberSpec\|defaultKindFor" core/src/index.ts` = **0 匹配**（仅保留 `export type { LgdlOperation } from './types.js'` D-013 类型契约）；core/src/commands.ts、operations.ts 已删除（git status D） | ✅ |
| V5 | 无残留 grep（AC-006/EC-006） | 旧路径 import；迁出符号定义残留；新包核心领域实现 | 全 0 | `from './ops'\|from './web-cli'` grep = 0；core/web 迁出符号定义残留 grep = 0；新包核心模块仅 type-only import @lgdl/core（review C23 静态实证 + 本次核验 tools.ts/commands.ts 等）；领域值引用收敛 adapters/lgdl.ts | ✅ |
| V6 | 新包 82 测试全绿 | `npm test`（packages/ai-command-kit） | 82 全绿 fail 0 | **ℹ tests 82 / pass 82 / fail 0**（duration 447ms）；覆盖 commands 14 + operations 9 + exec 22 + protocol 27 + help 4 + llm 6 | ✅ |
| V7 | web 48 测试全绿 | `npm test`（packages/web） | 48 全绿 fail 0 | **ℹ tests 48 / pass 48 / fail 0**（duration 2511ms）；覆盖 locate 10 + snap 8 + provider 14 + web-fetch 6 + lgdl-web 2 + next-actions 4 + help 4 | ✅ |
| V8 | core 258 测试全绿 | `npm test`（packages/core） | 258 全绿 fail 0 | **ℹ tests 258 / pass 258 / fail 0**（duration 473ms）；覆盖 mutations 206 + parser 52 | ✅ |
| V9 | 388 计数守恒 + 基线参照（NFR-001/AC-005/ADR-008） | 汇总 V6~V8；基线 worktree 全量测试 | 388 守恒；基线 388 全绿 | **迁移后 82+48+258 = 388 全绿**（守恒 ✓）；**基线（tag v0.6-f13-baseline worktree）core 281 + web 107 = 388 全绿**（fail 0）——迁移前后总用例数不变（零新功能红线 C-001 顺带验证） | ✅ |
| V10 | 行为等价① help 输出逐字节（FR-006/NFR-002/AC-007/EC-010） | 基线 help.ts（编译自 baseline worktree，@lgdl/core COMMANDS）vs 新包 dist/help.js，运行 webCliHelp 7 topics（顶层/add-node/remove-edge/update-group/status/validate/help） | 输出逐字节一致 | **PASS: help 输出逐字节一致（topics=7）**（eq-help.mjs；输出落盘 baseline-help.txt / kit-help.txt 对比一致） | ✅ |
| V11 | 行为等价② tools schema 逐字节（FR-004/NFR-002/AC-007） | 提取基线 provider.ts WEB_CLI_TOOL vs 新包 tools.ts；运行期提取 enum | schema 逐字节；enum 20 项一致 | **PASS: WEB_CLI_TOOL schema 逐字节一致（len=1870）**（eq-tools-errors.mjs）；运行期提取新包 enum = **20 项**：status/validate/init/convert + 9 mutation + doc-info/get-node/get-edge/find-node + list-node-kinds/list-diagram-types + help；基线 provider.ts WEB_CLI_TOOL enum 同为 **20 项且顺序完全一致**（证实 spec FR-004「18 子命令」为描述偏差，非迁移引入 — review C14 复核确认） | ✅ |
| V12 | 行为等价③ 错误消息集合（FR-005/NFR-002/AC-007） | 中文字符串集合对比 web-cli→protocol、ops→exec | 零丢失零新增 | 集合对比：web-cli.ts vs protocol.ts 差异仅 1 条 fetch 缺 --path 消息；ops.ts vs exec.ts 差异仅 1 条 fetch 缺 --path 消息——**两条均已在 web 侧定位**（web-fetch.ts:38「缺少必填参数 --path…」、web-fetch.ts:63「✖ lgdl-web-fetch 缺少必填参数 --path…」），符合 ADR-007「fetch 留 web」预期拆分，**非消息丢失** | ✅ |
| V13 | CLI 冒烟 mutation 命令（FR-008/AC-003） | 迁移后 cli dist vs 基线 cli dist，真实 LGDL 文档上运行 add-node/update-node/add-edge/remove-node + status | 冒烟成功；stdout+落盘逐字节一致 | 迁移后 add-node ✓「✓ added node "n1" (New Node) :process」；status stdout diff = **无输出（逐字节一致）**；add-node 落盘文件 diff = **无输出**；多命令序列（update-node/add-edge/remove-node）stdout 逐条一致、最终落盘文件 diff = **无输出**（PASS: 多命令序列落盘逐字节一致） | ✅ |
| V14 | 构建与类型完整性（NFR-006/AC-001/AC-008） | `npm run build`（root workspaces 全仓） | 退出码 0；dist 产物含新包 | **BUILD_EXIT=0**（10.39s，vite web 产物正常 + tsc 各包零错误）；新包 dist/ 完整（commands/operations/exec/protocol/help/tools/llm/adapters/index .js+.d.ts）；基线 worktree build 亦通过（10.69s） | ✅ |
| V15 | CI 构建补齐（FR-011/AC-008/R-007） | 检查 deploy-pages.yml 新包构建 + paths；router 步骤 | workflow 含新包；router 按 B2 事实判定 | deploy-pages.yml:11 `packages/ai-command-kit/**` paths 触发 ✓；:37-38 `Build core, layout, render, ai-command-kit packages` 步骤 ✓；**router 构建步骤不存在（0 匹配）**——与 B2 复核一致：F-01 未实施（非本步回退），新包构建已补 = FR-011 达成 | ✅ |
| V16 | AI 面板四条路径（NFR-007/AC-009/EC-008） | vite dev server + headless chromium 渲染冒烟；四条路径自动化覆盖证据核验 | dev server 200；AiPanel 渲染；四条路径行为一致 | dev server `VITE v5.4.21 ready` + `HTTP 200` ✓；headless chromium --dump-dom 成功（exit 0），DOM 含「AI 助手面板」+ lgdl-web-cli 命令面（20 处匹配）✓；四条路径自动化覆盖证据：路径① chat→markdown（llm.test.ts classifyError/parseToolArguments/WEB_CLI_TOOL 6 例）、路径②③ lgdl-web-cli 工具调用 + 手动文本命令（exec.test.ts 22 例：add-node+add-edge 应用/status/失败即停/未知命令/init/convert 等）、路径④ web fetch（web-fetch.test.ts 6 例 + lgdl-web.test.ts 2 例）——**完整四条路径真实交互（需 LLM API Key + 浏览器人工操作）标注人工复核项**（EC-008） | ⚠️ |
| V17 | build 偏差 B1~B9 + review 4 项改进（FR-009/FR-011） | B1~B9 逐项动态复核；改进 1~4 现状确认 | 与 review 一致；改进项跟踪 | B1 W-D1 现场保留（provider.ts:342-357 OpenAI 端点 tools 注册 [WEB_CLI_TOOL, WEB_OP_TOOL] 无 WEB_FETCH_TOOL）✓；B3 LgdlOperation 在 core/types.ts:210 ✓；B4 新包 deps openai/anthropic（package.json:23,25）✓；B5 index 双面导出（:33-37）✓；B6 cli 9 命令 import 全切（grep ai-command-kit = 9 文件）✓；B7 ops.ts/web-cli.ts 已删除（ls 不存在）✓；B8 lgdl.ts 具名导出（lgdlKindResolver/lgdlApplier/lgdlBuildOperation/lgdlDomain/lgdlExecutor/executeSubcommand/executeCommands/describeCommandLine :49-104）✓；B9 web test 脚本 7 文件（locate/snap/provider/web-fetch/lgdl-web/next-actions/help）✓。改进 1：web/package.json:15,24 冗余 SDK 依赖**仍存在** → 跟踪；改进 2：lgdl-web.ts:6,39 注释漂移**仍存在** → 跟踪；改进 3：spec.md:97 FR-004「18 子命令」**仍为 18**（实测 20）→ 跟踪文档口径修正；改进 4：build.md **确认缺失**（build 摘要记录于 state.json notes）→ 跟踪 | ✅ |

## 3. 验证详细信息
> 按验证维度展开的详细执行结果

### 3.1 测试覆盖
> 运行测试套件的结果（动态实测）

| 需求 ID | spec 描述 | 测试用例 | 执行结果 | 覆盖率 |
|---------|----------|---------|:--:|:--:|
| FR-001 | 新包骨架 | 构建验证（V1/V14） | ✅ | 已覆盖（构建即证） |
| FR-002 | COMMANDS 注册表迁入 | commands.test.ts 14 例（新包） | ✅ 14/14 | 已覆盖 |
| FR-003 | 执行层迁入 | operations.test.ts 9 例 + exec.test.ts 22 例（新包） | ✅ 31/31 | 已覆盖 |
| FR-004 | tools schema + LLM 迁入 | llm.test.ts 6 例（新包，含 WEB_CLI_TOOL schema） | ✅ 6/6 | 已覆盖 |
| FR-005 | 协议解析器迁入 | protocol.test.ts 27 例（新包） | ✅ 27/27 | 已覆盖 |
| FR-006 | help 自文档框架迁入 | help.test.ts 4 例（新包）+ 行为等价 diff（V10） | ✅ 4/4 | 已覆盖 |
| FR-007 | web 接线随迁 + 适配注入 | exec.test.ts 22 例（新包）+ web-fetch 6 + lgdl-web 2 + provider 14（web） | ✅ 44/44 | 已覆盖 |
| FR-008 | cli 引用切换 | CLI 冒烟（V13） | ✅ | 已覆盖（真实执行） |
| FR-009 | core 导出面收敛与依赖方向 | 静态核验（V2/V4/V5）+ core 258 例 | ✅ 258/258 | 已覆盖 |
| FR-010 | 测试迁移与回归 | 全量 388（V6~V9） | ✅ 388/388 | 已覆盖 |
| FR-011 | CI 构建补齐 | workflow 核验（V15） | ✅ | 已覆盖 |
| NFR-001 | 零破坏回归门禁 | 388 守恒 + 基线 388 全绿参照（V9） | ✅ | 已覆盖 |
| NFR-002 | 零语义改动（逐字节） | V10~V13 行为等价 diff | ✅ | 已覆盖 |
| NFR-003 | 包依赖方向约束 | npm ls + grep（V2） | ✅ | 已覆盖 |
| NFR-004 | 领域解耦 | grep 领域实现残留（V5） | ✅ | 已覆盖 |
| NFR-005 | 零新增功能 | enum 20 项前后一致 + prompts.ts 三工具名一致（V11） | ✅ | 已覆盖 |
| NFR-006 | 构建与类型完整性 | npm run build 退出码 0（V14） | ✅ | 已覆盖 |
| NFR-007 | 手动 AI 实战闭环 | 自动化证据 + 人工复核项（V16） | ⚠️ | 部分覆盖（转人工） |

**实测计数汇总**：新包 82（14+9+22+27+4+6）+ web 48（10+8+14+6+2+4+4）+ core 258（206+52）= **388 全绿**；基线（迁移前）core 281 + web 107 = **388 全绿**。用例守恒 ✓。

### 3.2 接口数据
> 行为等价对比（基线 tag v0.6-f13-baseline）实测

| 检查项 | 调用方式 | 预期 | 实测 | 一致？ |
|--------|---------|------|------|:--:|
| webCliHelp 输出（7 topics） | eq-help.mjs（基线 help.ts 编译运行 vs 新包 dist/help.js） | 逐字节一致 | **PASS: 逐字节一致** | ✅ |
| WEB_CLI_TOOL schema | eq-tools-errors.mjs 文本提取 + node 运行期 enum 提取 | schema 逐字节；enum 20 项 | **PASS: schema 逐字节一致（len=1870）**；新包 enum 20 项 = 基线 enum 20 项（顺序一致） | ✅ |
| 错误消息字符串集合 | eq-tools-errors.mjs 中文串集合对比 | 零丢失 | 差异仅 2 条 fetch 消息（web-cli→protocol 1 条 + ops→exec 1 条），均已在 web 侧 web-fetch.ts:38,63 定位（ADR-007 预期拆分） | ✅ |
| CLI mutation 命令 stdout | 迁移后 vs 基线 cli dist 同命令真实执行 | 逐字节一致 | add-node/update-node/add-edge/remove-node/status stdout 全部一致（diff 无输出） | ✅ |
| CLI 落盘文件 | 冒烟后文件 diff | 逐字节一致 | add-node 后 + 多命令序列后 diff 均无输出 | ✅ |

### 3.3 构建脚本
> 构建、类型检查执行结果（动态实测）

| 命令 | 退出码 | 耗时 | 输出摘要 | 结果 |
|------|:--:|------|---------|:--:|
| `npm run build`（迁移后 root workspaces） | 0 | 10.39s | tsc 各包零错误 + vite web 产物正常（dist/assets/*.js）；新包 dist/ 完整 | ✅ |
| `npm run build`（基线 worktree 参照） | 0 | 10.69s | 基线全包构建通过（行为等价运行前提） | ✅ |
| `tsc`（新包 test 编译面） | 0 | — | npm test 内置 tsc 编译通过（dist-test 产出） | ✅ |

### 3.4 性能边界
> NFR/EC 边界实测（本 Feature 无新增性能指标 NFR；零语义改动即性能等价）

| NFR/EC | 指标要求 | 实测值 | 偏差 | 达标？ |
|-----|---------|-------|------|:--:|
| NFR-007 AI 实战闭环 | 四条路径行为与迁移前一致 | dev server HTTP 200 + AiPanel headless 渲染成功（DOM 含「AI 助手面板」+ lgdl-web-cli 20 处）；完整交互转人工复核 | 环境受限（需 LLM API Key + 浏览器人工操作） | ⚠️ 转人工 |
| EC-001 cli 引用断裂 | 切换与收敛原子落地 | cli 构建 + 9 命令冒烟通过（V13）——无断裂窗口 | 无 | ✅ |
| EC-002 依赖方向死锁 | 无 core re-export、无环 | npm ls 线性无环；core 无新包依赖（V2） | 无 | ✅ |
| EC-006 测试迁移遗漏 | 无残留 | grep 全 0（V5） | 无 | ✅ |
| EC-010 help 单一数据源断裂 | COMMANDS 来源切换 | help.ts:14 `import { COMMANDS } from './commands.js'`（新包注册表）；输出逐字节一致（V10） | 无 | ✅ |

### 3.5 漂移检测
> 实现与规范的偏离扫描（动态实测）

| 漂移类型 | 检测命令/方法 | 结果 |
|---------|-------------|------|
| 孤立代码（有代码无需求） | grep 迁出符号定义残留（core/web）+ 旧路径 import | ✅ 无（全 0） |
| 需求缺失（有需求无代码） | 逐 FR 核对导出面 + 测试覆盖 | ✅ 无（FR 11/11 覆盖） |
| 规格漂移（spec 被修改） | spec.md vs 基线（git 工作区状态） | ✅ 无（spec.md 未在 build 期间修改，git status 无 spec.md 变更） |
| 实现偏差（B1~B9） | V17 逐项复核 | ⚠️ B1 门禁偏差（F-04/F-05 未关闭）——authorized 记录在案（state.json notes），非本步引入缺陷；W-D1 现场保留 provider.ts:342-357（符合 EC-005/NG-005） |
| 文档口径偏差（改进 3） | spec.md:97 FR-004「18 子命令」vs 实测 20 项 | ⚠️ spec 描述计数偏差（迁移前后一致，非迁移引入）——列入改进跟踪，不阻塞 |

## 4. 验证脚本执行记录
> ADR-003 落地：validate Agent 自主编写并直接执行的验证脚本记录
> 脚本存放路径：`/tmp/sddu-validate-specs-tree-web-cli-extract-20260831/`

| 脚本文件 | 用途 | 对应场景 | 退出码 | 关键输出 |
|---------|------|:--:|:--:|---------|
| `scripts/eq-help.mjs` | 行为等价①：基线 help.ts 编译产物 vs 新包 dist/help.js 运行 webCliHelp 7 topics 逐字节对比（输出落盘 baseline-help.txt / kit-help.txt） | V10 | 0 | `PASS: help 输出逐字节一致 (topics=7)` |
| `scripts/eq-tools-errors.mjs` | 行为等价②③：WEB_CLI_TOOL schema 文本提取对比 + web-cli/ops vs protocol/exec 中文字符串集合对比 | V11/V12 | 0 | `PASS: WEB_CLI_TOOL schema 逐字节一致 (len=1870)`；`PASS: web-cli.ts vs protocol.ts 中文字符串集合一致（差异 1 条 fetch 消息已在 web 侧定位）`；`PASS: ops.ts vs exec.ts …（同上）` |
| 基线 worktree（git worktree add） | 迁移前基线运行环境：基线全量测试（core 281 + web 107 = 388 全绿）+ 基线 cli dist 冒烟 + 基线 help.ts 编译源 | V9/V10/V13 | 0 | 基线 388 全绿；基线 cli 冒烟与迁移后逐字节一致 |
| `smoke/`（test.lgdl 等） | CLI 冒烟真实文档：add-node/update-node/add-edge/remove-node/status 迁移后 vs 基线执行 + diff | V13 | 0 | `PASS: status 输出逐字节一致`；`PASS: add-node 落盘结果逐字节一致`；`PASS: 多命令序列落盘逐字节一致` |
| vite dev server + chromium-browser --headless --dump-dom | AI 面板渲染冒烟：dev server HTTP 200 + DOM 含「AI 助手面板」+ lgdl-web-cli 命令面 | V16 | 0 | `HTTP 200`；DOM 匹配：AI 助手面板 ×1、lgdl-web-cli ×20 |

> 路径约定说明：所有验证脚本写入 `/tmp/sddu-validate-specs-tree-web-cli-extract-20260831/`，由 validate Agent 自主编写、直接执行，不走 task→build 流水线（ADR-003）。历次验证轮次（R2…）可创建新时间戳子目录。

## 5. 阻塞问题
> 必须修复后才能通过验证的问题

| # | 位置 | 问题 | 对应 Vx | 修复建议 |
|---|------|------|:--:|---------|
| — | — | 无 | — | — |

## 6. 结论
> 验证最终结论

**结论**: ✅ 通过

**指标达标矩阵**：

| 指标 | 要求 | 实测 | 达标？ |
|------|------|------|:--:|
| FR 测试覆盖 | 100%（11/11） | 100%（11/11 全绿） | ✅ |
| NFR 测试覆盖 | ≥ 80% | 100%（7/7，NFR-007 自动化证据 + 人工复核清单） | ✅ |
| 构建退出码 | 0 | 0（全仓 build 10.39s） | ✅ |
| 阻塞问题数 | 0 | 0 | ✅ |
| 漂移项 | 0 严重 | 0 严重（B1 门禁偏差为已授权记录；改进 3 为 spec 计数描述偏差） | ✅ |
| 测试用例守恒 | 388 不变 | 388（82+48+258）守恒，基线 388 全绿参照 | ✅ |

**理由**：
1. **动态验证全真实执行**：388 测试三包全绿（新包 82 + web 48 + core 258，fail 0）+ 基线 worktree 388 全绿参照——用例计数守恒、零新功能红线（C-001）实证；
2. **零语义改动五面逐字节实证**（NFR-002/AC-007）：help 输出（7 topics）、WEB_CLI_TOOL schema（1870 字符）、错误消息字符串集合（差异仅 2 条 fetch 消息且均按 ADR-007 预期留在 web 侧 web-fetch.ts:38,63）、CLI mutation 命令 stdout、落盘文件——全部与基线 tag `v0.6-f13-baseline` 逐字节一致（diff 无输出）；
3. **依赖方向与解耦实证**（NFR-003/004）：core 零依赖根（package.json 无 dependencies）、新包→core 单向（npm ls 线性无环）、core 无反向引用（grep 仅注释）、领域值引用收敛 adapters/lgdl.ts 单点、grep 无残留全 0；
4. **构建与 CI 实证**（NFR-006/FR-011）：全仓 build 退出码 0、新包 dist 产物完整、deploy-pages.yml 含新包构建+paths（router 步骤不存在系 F-01 未实施，B2 事实修正，非回退）；
5. **B1~B9 偏差复核一致**：review 9 项 build 偏差全部动态复核通过，无新引入问题；review 4 项改进建议确认为非阻塞跟踪项（冗余 SDK 依赖、注释漂移、spec 计数 18→20、build.md 缺失——均不影响功能/语义/依赖，纳入后续清理）；
6. **AI 面板**：自动可验证部分（dev server HTTP 200 + AiPanel headless 渲染 + llm/exec/web-fetch 测试证据）全部通过；完整四条路径真实交互（需 LLM API Key + 浏览器人工操作）按 EC-008 设计标注人工复核项，由作者/评审确认后关闭。

**⚠️ 非阻塞跟踪项（4 项 review 改进建议，均建议后续清理，不阻塞本 Feature 关闭）**：
1. `packages/web/package.json:15,24` — openai/@anthropic-ai/sdk 冗余依赖（SDK 消费已迁新包 llm.ts）；
2. `packages/web/src/ai/lgdl-web.ts:6,39` — 注释称「AiPanel 经 './lgdl-web' 消费」与实际子路径消费不符（功能无影响）；
3. `spec.md:97` FR-004 —「18 子命令」应为 20 项（文档口径修正，非迁移引入）；
4. `build.md` 缺失 — build 摘要记录于 state.json notes（信息完整，文件未落盘，后续流程优化项）。

**🏷️ 人工复核项（1 项，NFR-007/AC-009）**：AI 面板四条路径（chat 文本→markdown / lgdl-web-cli 工具调用 / 手动文本命令 / web fetch）真实浏览器交互——需 LLM API Key + 人工操作，作者/评审确认后关闭（EC-008）。

## 修订记录
> 记录本文档的版本变更历史

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：基于迁移后代码实况 + 基线 tag v0.6-f13-baseline 逐项执行 V1~V17；388 测试全绿守恒、行为等价五面逐字节一致、B1~B9 复核一致、4 项改进跟踪、1 项人工复核；结论 ✅ 通过 | 2026-08-31 | SDDU Validate Agent |
