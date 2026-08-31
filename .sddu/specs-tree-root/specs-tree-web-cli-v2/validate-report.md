# 验证报告：specs-tree-web-cli-v2（web-cli V2 抽取与包体系重构）

> **文档定位**: SDDU 验证报告 — 逐项记录自主验证的执行结果，作为工作流终点
> **验证策略**: validate.md（V1~V16 验证场景及五维度指引，v1.0）
> **前置依赖**: validate.md（验证策略）、spec.md（需求规范）、review-report.md（审查报告，⚠️ 有条件通过，P1/P2 已前置处理）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-08-31
> **验证轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-08-31
> **更新说明**: 初始创建 — 基于重构后代码实况逐项执行 V1~V16（静态结构 5 / 测试覆盖 1 / 接口数据 4 / 构建 1 / CLI 冒烟 1 / build 偏差复核 2 / review 改进确认 2）；全量测试真实运行、CLI 命令真实执行、基线 tag pre-v2-rename 逐字节 diff；P1/P2 在验证前完成修复

## 1. 验证概要

| 维度 | 数值 |
|------|:--:|
| 验证项总数 | 16（V1~V16） |
| 通过 | 16 |
| 失败 | 0 |
| 无法执行 | 0 |
| 阻塞问题 | 0 |

## 2. 逐项验证结果（V1~V16）

> 对照 validate.md 中定义的验证场景，逐项执行并记录实测结果

| # | 验证对象 | 验证步骤 | 预期结果 | 实测结果 | 判定 |
|---|---------|---------|---------|---------|:--:|
| V1 | AC-001 包结构 9 包就位 | `ls packages/` + 9 包 package.json name + lock workspace 条目 | 9 目录、name 与 D-001 一致、lock 9 条目零 extraneous | `ls packages/` = lgdl-cli/lgdl-core/lgdl-layout/lgdl-render/lgdl-router/lgdl-web/lgdl-web-cli/lgdl-web-op-cli/web-cli-base（9 目录）；name：`@lgdl/lgdl-*`×6 + `@lgdl/web-cli-base` + `@lgdl/lgdl-web-cli` + `@lgdl/lgdl-web-op-cli` 全部正确；lock workspace entries = 9、extraneous = 0 | ✅ |
| V2 | AC-002 重命名零残留 | grep 旧包名（core/layout/render/router/cli/web 无 lgdl 前缀）于 packages/*/src + 根配置/CI/tsconfig/predev；node_modules/@lgdl 链接核验 | 全 grep 零命中；链接指向新目录 | src grep 旧包名 exit=1（零命中）；根 dependencies = `@lgdl/lgdl-cli`；tsconfig references = 5 新路径；CI paths 7 项 + build 6 workspace 名全部新名（含 2 新包）；predev workspace 名新名；node_modules/@lgdl 9 链接全部指向 packages/lgdl-*/web-cli-base 新目录 | ✅ |
| V3 | AC-003 base 零 lgdl 依赖与硬编码 | base/package.json dependencies + grep @lgdl/ + grep lgdl-web-* + llm.ts grep lgdl | 零 @lgdl/* 依赖、src 零硬编码、llm.ts 零 lgdl | base deps = `{"@anthropic-ai/sdk","openai"}`（零 @lgdl/*）；grep @lgdl/ 仅 index.ts:2 头注释自引用包名（合法）+ package.json name 字段自身；lgdl-web-cli/lgdl-web-op-cli/lgdl-web-fetch 零命中；llm.ts grep lgdl exit=1（零命中）；base/src = 9 源文件 + 3 测试（无 LGDL 面） | ✅ |
| V4 | AC-006 依赖方向无环 | 9 包 dependencies 声明核验 + op-cli 源码 grep react/dom | 单向无环、无 base→lgdl 反向边、op-cli 零 React/DOM | 依赖图实测：lgdl-core→{}；lgdl-layout→{lgdl-core}；lgdl-render→{lgdl-core,lgdl-layout,lgdl-router}；lgdl-router→{}；lgdl-cli→{lgdl-web-cli,lgdl-core,lgdl-render}；lgdl-web→{web-cli-base,lgdl-core,lgdl-layout,lgdl-render,lgdl-web-cli,lgdl-web-op-cli}；lgdl-web-cli→{web-cli-base,lgdl-core}；lgdl-web-op-cli→{web-cli-base}（仅类型）；web-cli-base→{}——无环、无反向边；op-cli grep react/document./localStorage exit=1（零命中） | ✅ |
| V5 | AC-004 三工具归位 | grep 定位 WEB_CLI_TOOL/WEB_OP_TOOL/WEB_FETCH_TOOL/OP_COMMANDS/webOpHelp/parseNextActions 定义位置 | 三工具定义在目标包、web 无定义残留 | WEB_CLI_TOOL → lgdl-web-cli/src/tools.ts；WEB_OP_TOOL → lgdl-web-op-cli/src/tool.ts；WEB_FETCH_TOOL → base/src/tools.ts；OP_COMMANDS → op-cli/ops.ts；webOpHelp → op-cli/help.ts；parseNextActions → op-cli/next-actions.ts；web 包定义残留 grep exit=1（零）；web provider.ts 仅 import 三工具（:17-20） | ✅ |
| V6 | AC-005 测试全绿且守恒 | 9 包逐一 `npm test`（先 `rm -rf dist-test` 清残留） | 全仓 ≥388、失败 0 | **全仓 420 例全绿、失败 0**：lgdl-core 258 + lgdl-web-cli 76 + lgdl-web 32 + lgdl-render 21 + base 14 + op-cli 11 + lgdl-router 8 + lgdl-layout 0* + lgdl-cli 0*（*基线即无测试文件，非删除）；守恒 ≥388 ✓（420 ≥ 388，与 build 实测 420 一致） | ✅ |
| V7 | AC-008 构建与类型完整性 | 9 包逐一 `npm run build`（tsc/vite） | 全仓 build 退出码 0、dist 产物完整 | 9 包 build 全部退出码 0（lgdl-core/layout/render/router/web-cli-base/lgdl-web-cli/lgdl-web-op-cli/lgdl-cli tsc 全绿 + lgdl-web vite 构建成功 5.41s，仅 chunk size 提示非错误）；lgdl-cli/dist/cli.js bin 存在 | ✅ |
| V8 | AC-009 零语义：WEB_CLI_TOOL schema 逐字节 | python 提取基线 base-tools.ts vs 当前 lgdl-web-cli/tools.ts 工具值对象，归一化后逐字节 diff | 逐字节一致 | **PASS**：归一化长度 base=cur=1294 字符，逐字节一致（name `lgdl-web-cli`/description/parameters 20 子命令 enum 含 help 全保留） | ✅ |
| V9 | AC-009 零语义：WEB_OP_TOOL schema 逐字节 | python 提取基线 web-provider.ts vs 当前 op-cli/tool.ts（enum 展开 OP_SUBCOMMANDS 派生值） | 逐字节一致（enum 16 项一致） | **PASS**：基线 enum 16 项 = 派生 OP_SUBCOMMANDS 16 项逐项一致（含顺序）；其余 schema（name/description/parameters 结构）归一化后 base=cur=1485 字符逐字节一致 | ✅ |
| V10 | AC-009 零语义：help 输出逐字节 | ① 运行时 webCliHelp()/webCliHelp(add-node)/webOpHelp() 输出核验；② OP_COMMANDS vs 基线 WEB_OP_ENTRIES 逐字节 diff；③ webCliHelp 面字符串集合对比 | 逐字符一致（唯一差异 = lgdl-web-fetch→web-fetch 联动） | 运行时输出正常（webCliHelp 28 行顶层 / add-node 单命令 12 行 / webOpHelp 25 行）；OP_COMMANDS vs WEB_OP_ENTRIES 归一化逐字节一致（2085=2085）；webCliHelp 面 diff 仅注释/import 结构差异 + 唯一文案联动 `lgdl-web-fetch`→`web-fetch`（FR-022 允许）；HelpArg/HelpEntry 自 base 导入（FR-014 统一） | ✅ |
| V11 | AC-009 零语义：错误消息/协议解析逐字节 | python 提取基线 protocol.ts vs 当前 lgdl-web-cli/protocol.ts + base/protocol.ts 文案字符串集合对比；运行时 parseWebCliCommand 验证 | 错误消息集合一致（唯一差异 = web-fetch 改名联动） | **PASS**：基线独有文案 0、当前独有文案 0（消息/提示类字符串完全一致）；运行时：未知子命令返回错误对象、add-node 缺 --doc 错误消息 `缺少必填参数 --doc <id>` 正常；tokenizeCli/parseArgs/createBatchParser 仍在 base 导出（D-004 达成，运行时 typeof 均为 function） | ✅ |
| V12 | AC-007/FR-013 CLI 冒烟 | 真实执行 `lgdl-cli` mutation 命令（合法 LGDL 文件） | add-node/remove-node/add-edge 成功、输出 op 结构正确、bin 不变 | bin = `{"lgdl-cli":"dist/cli.js"}` 不变；`lgdl-cli --help` 正常；**add-node --id new1 --kind process → `✓ added node "new1" (新节点) :process`（exit=0，文件已写入）；remove-node → `✓ removed node "new1"`（exit=0）；add-edge start→ok → `✓ added edge start -> ok [快捷路径]`（exit=0，edges 尾部已追加）**——mutation 真实生效 | ✅ |
| V13 | build 偏差 B2/B3 动态复核 | ① enum 派生一致性（V9 已证）；② WEB_FETCH_TOOL 描述核验 | enum 一致；描述中性化且功能语义保留 | B2：派生 enum 与基线工具 enum 16 项逐项一致（V9 证据）；B3：WEB_FETCH_TOOL name = `web-fetch`、描述相对基线仅改名联动（`independent of lgdl-web-cli / lgdl-web-op-cli` → `independent of the diagram CLI tools` + 示例 `lgdl-web-fetch`→`web-fetch`），path 必填/无默认文档/示例语义全保留——中性化达成且零 lgdl-web-* 硬编码 | ✅ |
| V14 | build 偏差 B4 动态复核 | base/src 含注释 grep lgdl-web-*；夹具中 lgdl 字样核验 | grep 零命中；夹具仅中性路径引用 | base/src `grep -rn "lgdl-web-cli\|lgdl-web-op-cli\|lgdl-web-fetch"` exit=1（零命中）；base 中 lgdl 字样仅剩：web-fetch.test.ts 夹具路径 `lgdl/web/workbench/README-CLI.md`（中性仓库路径，AC-003 例外）+ 各文件注释（如 exec.ts ADR-003 结构化兼容说明、web-fetch.ts 示例路径）——均为中性引用非 lgdl-web-* 前缀 | ✅ |
| V15 | review P1 处理确认 | ls web/src/ai 无 next-actions.*；AiPanel import 源；op-cli 侧测试绿 | web 侧删除、import 切换、op-cli 4 例绿 | **P1 已修复**：`git rm -f` 删除 web 侧 next-actions.ts + next-actions.test.ts（与 op-cli 版功能逐字节一致，仅注释头差异，删除安全）；AiPanel.tsx:9 = `import { parseNextActions, type NextAction } from '@lgdl/lgdl-web-op-cli'`（:418 调用 parseNextActions 正常）；op-cli/src/next-actions.ts + next-actions.test.ts 在位；op-cli 11 例全绿（V6 含 next-actions 4 例）；web 包 P1 后重测 32 例全绿（无副作用） | ✅ |
| V16 | review P2 处理确认 | lock workspace 条目 + extraneous + install 幂等 | 9 条目、零 extraneous、幂等 | **P2 已修复**：Node 脚本删除 6 个旧目录条目（packages/cli/core/layout/render/router/web，均 extraneous:true）+ `npm install` 重建验证；lock workspace entries = 9、extraneous = 0；项目根 `npm install` 重跑幂等（仍 9 条目零 extraneous）；node_modules/@lgdl 9 链接指向新目录 | ✅ |

## 3. 验证详细信息

### 3.1 测试覆盖

| 需求 ID | spec 描述 | 测试用例 | 执行结果 | 覆盖率 |
|---------|----------|---------|:--:|:--:|
| FR-001~005 | 组1 重命名 6 包 | 结构/残留 grep（V1/V2）+ web 32 例 | ✅ | 已覆盖 |
| FR-006~013 | 组2 抽取 lgdl-web-cli | lgdl-web-cli 76 例（commands 14 + operations 9 + protocol 26 + help 4 + tools 1 + exec 22）+ CLI 冒烟（V12） | ✅ | 已覆盖 |
| FR-014~017 | 组3 抽取 lgdl-web-op-cli | op-cli 11 例（tool 1 + ops 3 + next-actions 4 + handlers 3） | ✅ | 已覆盖 |
| FR-018~022 | 组4 base 纯化 | base 14 例（llm 5 + protocol 1 + web-fetch 8） | ✅ | 已覆盖 |
| FR-023~025 | 组5 web 调整 | web 32 例（provider 12 + lgdl-web 2 + locate/snap 18）+ web 构建 | ✅ | 已覆盖 |

**NFR 覆盖**：NFR-001 零新功能（V8~V11/V13 逐字节 + 功能面计数不变）✅；NFR-002 零语义（V8~V11 逐字节）✅；NFR-003 守恒（V6 420≥388）✅；NFR-004 依赖方向（V3/V4）✅；NFR-005 泛型化契约（V6 随迁测试 + V8~V11）✅；NFR-006 构建（V7）✅；NFR-007 命名一致性（V1）✅

### 3.2 接口数据

| 检查项 | 调用方式 | 预期 | 实测 | 一致？ |
|--------|---------|------|------|:--:|
| WEB_CLI_TOOL schema | python 提取 diff（基线 pre-v2-rename vs 当前） | 逐字节一致 | 归一化 1294=1294，一致 | ✅ |
| WEB_OP_TOOL schema（enum 派生） | python 提取 diff + OP_SUBCOMMANDS 展开 | enum 16 项 + 其余 schema 逐字节 | 16 项逐项一致；其余 1485=1485 | ✅ |
| webCliHelp 输出 | node 运行时调用 dist | 输出正常、文案与基线一致 | 28 行顶层 + 单命令完整；OP_COMMANDS vs 基线 2085=2085 | ✅ |
| 协议错误消息集合 | python 字符串集合 diff | 0 差异（除改名联动） | 基线独有 0 / 当前独有 0 | ✅ |
| lgdl-cli mutation 命令 | node dist/cli.js 真实执行 | add-node/remove-node/add-edge 成功 | 三命令全部 `✓` 成功（exit=0）+ 文件真实写入 | ✅ |
| bin 名 lgdl-cli | package.json bin 核验 | 不变 | `{"lgdl-cli":"dist/cli.js"}` | ✅ |

### 3.3 构建脚本

| 命令 | 退出码 | 耗时 | 输出摘要 | 结果 |
|------|:--:|------|---------|:--:|
| `npm run build`（lgdl-core/layout/render/router/web-cli-base/lgdl-web-cli/lgdl-web-op-cli/lgdl-cli） | 0 | ~15s | 9 包 tsc 全绿，无错误 | ✅ |
| `npm run build`（lgdl-web vite） | 0 | 5.41s | ✓ built；仅 chunk>500kB 提示（非错误） | ✅ |
| `npm test`（9 包全量） | 0 | ~20s | **420 例全绿、fail 0**（守恒 ≥388 ✓） | ✅ |
| `npm install`（lock 重建） | 0 | 6s | up to date；lock 9 条目零 extraneous；幂等确认 | ✅ |

### 3.4 性能边界

| NFR | 指标要求 | 实测值 | 偏差 | 达标？ |
|-----|---------|-------|------|:--:|
| 性能指标 | —（spec 无性能 NFR 定义，纯重构） | — | N/A | ✅ 不适用（显式标注） |
| EC-001~EC-010 边界 | 零残留/依赖方向/构建完整性/测试守恒 | V2~V4/V6/V7 全 PASS | 无 | ✅ |

> **性能/安全验证「不适用」说明**：本 Feature 为纯重构与抽取（NG-001 零新增功能、NG-003 零语义改动），spec NFR 无性能指标（并发/响应时间/吞吐量）定义、无外部服务调用、无安全面变更——按 validate.md §3 显式标注不适用；EC 边界类已由静态/动态验证覆盖。

### 3.5 漂移检测

| 漂移类型 | 检测命令/方法 | 结果 |
|---------|-------------|------|
| 孤立代码 | 残留文件 grep（P1 web 侧 next-actions） | ✅ 已清除（validate 启动前修复，V15 确认） |
| 需求缺失 | AC-001~010 逐项验证 | ✅ 无（16/16 PASS） |
| 规格漂移 | 基线 pre-v2-rename 逐字节 diff（schema/help/错误消息） | ✅ 无（唯一差异 = FR-022 改名联动，spec 声明允许） |
| lock 残留 | workspace 条目 + extraneous 扫描 | ✅ 已清除（P2 修复，V16 确认） |

## 4. 验证脚本执行记录

> ADR-003 落地：validate Agent 自主编写并直接执行的验证脚本；存放路径 `/tmp/sddu-validate-specs-tree-web-cli-v2-20260831/`

| 脚本文件 | 用途 | 对应场景 | 退出码 | 关键输出 |
|---------|------|:--:|:--:|---------|
| v1-package-structure.sh | 9 包目录 + name + lock 条目核验 | V1 | 0 | 9 目录；9 name 正确；lock 9 条目 extraneous 0 |
| v2-rename-residual.sh | 旧包名 grep 零残留 + 根配置/CI/tsconfig/predev 核验 | V2 | 0 | src grep exit=1（零命中）；CI paths 7 项 + build 6 workspace 全新名 |
| v3-base-purity.sh | base deps + src 硬编码 grep | V3 | 0 | deps 零 @lgdl/*；lgdl-web-* 零命中；llm.ts lgdl 零命中 |
| v4-dep-direction.sh | 9 包依赖声明 + op-cli react grep | V4 | 0 | 依赖图单向无环无反向边；op-cli 零 React/DOM |
| v5-tools-placement.sh | 三工具 + OP_COMMANDS/webOpHelp/parseNextActions 定义位置 | V5 | 0 | 三工具定义全部在目标包；web 零定义残留 |
| v6-full-test.sh | 9 包全量测试执行 + 计数汇总 | V6 | 0 | **420 例全绿、fail 0**（258+76+32+21+14+11+8） |
| v7-build-all.sh | 9 包全量构建 | V7 | 0 | 9 包 build 退出码 0 |
| v8-tools-schema.py / v8v9-schema-diff.py | WEB_CLI_TOOL/WEB_OP_TOOL schema 提取 diff | V8/V9 | 0 | V8 归一化 1294=1294 一致；V9 enum 16 项 + 其余 1485=1485 一致 |
| v9-enum-expand.py | OP_SUBCOMMANDS 派生值展开与基线 enum 对比 | V9/V13 | 0 | 派生 16 项与基线 enum 逐项一致 |
| v10-help-diff.py / v10b-help-runtime.py | help 文案集合 diff + OP_COMMANDS vs WEB_OP_ENTRIES 逐字节 | V10 | 0 | OP_COMMANDS 2085=2085 逐字节一致 |
| v10-v11-runtime.mjs | 运行时 webCliHelp/webOpHelp/协议解析/tokenizeCli 导出验证 | V10/V11 | 0 | help 输出正常；tokenizeCli/parseArgs/createBatchParser 均在 base |
| v11-errormsg-diff.py | 错误消息字符串集合 diff | V11 | 0 | 基线独有 0 / 当前独有 0 |
| v12-cli-smoke.sh | lgdl-cli mutation 命令真实执行 | V12 | 0 | add-node/remove-node/add-edge 全部 ✓（exit=0）文件落盘 |

> 基线提取：`git show pre-v2-rename:<path>` 提取 10 个基线文件（base-tools/help/protocol/commands/operations/adapters-lgdl + web-provider/help/next-actions/web-fetch.ts）至脚本目录。

## 5. 阻塞问题

| # | 位置 | 问题 | 对应 Vx | 修复建议 |
|---|------|------|:--:|---------|
| — | — | **无阻塞问题**（FAIL=0 / 无法执行 0） | — | — |

## 6. 结论

**结论: ✅ 通过**

**指标达标矩阵**：

| 指标 | 要求 | 实测 | 达标？ |
|------|------|------|:--:|
| FR 测试覆盖 | 100%（每个 FR ≥1 Vx） | 100%（25/25 覆盖，V1~V16） | ✅ |
| NFR 测试覆盖 | ≥80% | 100%（7/7 覆盖） | ✅ |
| 构建退出码 | 0 | 0（9 包全绿） | ✅ |
| 阻塞问题数 | 0 | 0 | ✅ |
| 漂移项 | 0 | 0（P1/P2 已清除；spec 声明允许的 web-fetch 改名联动除外） | ✅ |
| 测试守恒 | ≥388 | **420**（全绿） | ✅ |

**理由**:
- **全量动态执行**：全仓 420 例测试全绿（守恒 ≥388 ✓）、9 包构建退出码 0、lgdl-cli mutation 命令（add-node/remove-node/add-edge）真实执行成功且文件落盘——验证全程动手执行，无静态臆测；
- **零语义改动逐字节验证**：WEB_CLI_TOOL/WEB_OP_TOOL schema（含 OP_SUBCOMMANDS 派生 enum 16 项）、webCliHelp/webOpHelp 文案、协议错误消息集合均与基线 pre-v2-rename 逐字节一致；唯一差异 = web-fetch 中性化改名联动（FR-022/NG-007 spec 声明允许）；
- **静态结构全达标**：9 包就位（AC-001）、重命名零残留（AC-002）、base 零 lgdl 依赖与硬编码（AC-003）、三工具归位（AC-004）、依赖方向无环（AC-006）、文档面同步（AC-010，review C23 已证）；
- **review 改进项闭环**：P1（web 侧 next-actions 双份残留）已删除 + AiPanel import 切换 op-cli；P2（lock 6 个旧目录条目）已清理 + install 幂等确认——两处 build 遗漏在 validate 启动前修复并验证，无副作用（web 32 例重测全绿）；
- **build 偏差复核**：B1~B4 动态可验证项（enum 派生/B3 描述中性化/B4 注释夹具清理）实测通过，与 review 结论一致；
- 性能/安全维度按 validate.md 显式标注「不适用」（纯重构无性能 NFR、无外部服务、无安全变更）。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：R1 轮验证——V1~V16 逐项执行（16/16 PASS）；动态实测全仓 420 例测试全绿、9 包构建零错误、CLI mutation 三命令真实执行；零语义经基线 tag pre-v2-rename 逐字节 diff（schema/help/错误消息）；P1/P2 修复并确认；build 偏差 B2~B4 动态复核通过；结论 ✅ 通过 | 2026-08-31 | SDDU Validate Agent |
