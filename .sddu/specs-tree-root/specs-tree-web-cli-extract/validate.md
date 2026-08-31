# 验证策略：specs-tree-web-cli-extract（F-13 ① web-cli 独立包抽取）

> **文档定位**: SDDU 验证策略 — 指导 validate Agent 执行自主验证的场景和方法；验证结果见 validate-report.md
> **前置依赖**: spec.md（需求规范，11 FR / 7 NFR / 10 EC / AC-001~010）、review-report.md（审查报告，状态 passed，C1~C24 全项通过、0 阻塞、4 改进建议）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-08-31
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-08-31
> **更新说明**: 初始创建 — 基于 spec AC-001~010 + review 4 项改进建议 + plan 迁移序列（M0~M12/ADR-001~008）自主定义 V1~V17 验证场景；本 Feature 为代码类（纯重构抽取），按全维度验证（静态/动态/行为等价/构建/漂移）

---

## 1. 验证概要
> 验证场景量化总览（策略口径）

| 维度 | 数值 |
|------|:--:|
| 验证场景数 | 17（V1~V17） |
| FR 覆盖 | 11/11（每个 FR ≥ 1 个 Vx） |
| 验证维度覆盖 | 5/5（测试覆盖 / 接口数据 / 构建 / 性能边界 / 漂移检测） |
| 基线对比 | git tag `v0.6-f13-baseline`（迁移前基线，388 全绿已确认） |

## 2. 自主验证场景（V1~VN）

**验证对象来源**：
- `spec.md`：FR-001~011 / NFR-001~007 / EC-001~010 / AC-001~010 → 逐项验证实现与验收标准
- `review-report.md`：C1~C24 静态结论 + 4 项改进建议 → 动态复核 + 改进项确认/跟踪
- `plan.md`：M0~M12 迁移序列 / ADR-001~008 / §4.2 计数守恒表（388 = 新包 82 + web 48 + core 258）
- `state.json` notes：build 9 项偏差记录（B1~B9）→ 动态可验证项复核
- 迁移后产物：packages/ai-command-kit/（7 模块 1 适配 6 测试）+ core/cli/web 涉迁面

**Feature 类型判定**：代码类（纯重构抽取：新包 15 文件 + core 3 + web 7 + cli 10 + CI 1）→ 全五维度验证；性能维度按「零语义改动」口径以行为等价 diff 承载（无新增性能指标 NFR，NFR-002 零语义改动即性能面等价）。

| # | 验证对象 | 验证步骤 | 预期结果 | 验证维度 | 验证方法 |
|---|---------|---------|---------|---------|---------|
| V1 | 包结构就位（FR-001/AC-001） | `ls packages/` 计数；检查新包 package.json（name/type/main/types/exports）、tsconfig、src 入口；root workspaces 纳入 | 7 包并列；package.json 字段完整（含 `./lgdl` 子路径 exports）；workspace 纳入（root node_modules 可解析 @lgdl/ai-command-kit） | 静态 + 构建 | 目录检查 + 文件读取 |
| V2 | 依赖方向无环 + core 零依赖（FR-009/NFR-003/AC-004/EC-002） | 检查 core/package.json 无 dependencies；新包 package.json dependencies 面；`npm ls @lgdl/core @lgdl/ai-command-kit` 依赖图；grep core→新包 反向引用 | core 零依赖根；新包→core 单向；无 core→新包 反向边；无环；grep core 中 @lgdl/ai-command-kit 仅注释（类型契约说明） | 静态 + 漂移 | npm ls + grep |
| V3 | 导出面清单（AC-002） | 检查新包 index.ts 导出面：注册表（COMMANDS/KNOWN_PARAMS/buildOperation/requireParams/assertChangeRequested/parseAttrsSpec/parseMemberSpec）、执行层（LgdlOperation/describeOperation/applyOperation/applyOperations/executeSubcommand/executeCommands/CommandExecResult）、tools+LLM（WEB_CLI_TOOL/chat/parseToolArguments/classifyError）、协议（tokenizeCli/parseArgs/parseWebCliCommand）、help（webCliHelp）、适配（lgdlKindResolver/lgdlApplier/lgdlDomain/lgdlExecutor/lgdlBuildOperation） | 导出面与 §5 一致；每个符号有随迁测试覆盖 | 静态 | 文件读取 |
| V4 | core 导出面收敛（FR-009/AC-004） | grep core/src/index.ts 迁出符号（applyOperation/buildOperation/COMMANDS/KNOWN_PARAMS/defaultKindFor 等）；core/src/commands.ts/operations.ts 已删除 | 无迁出符号导出；无残留定义 | 静态 + 漂移 | grep |
| V5 | 无残留 grep（AC-006/EC-006） | grep 旧路径 import（`from './ops'`/`from './web-cli'`）；grep 迁出符号定义残留（core/web）；grep 新包核心模块领域函数实现（parseLgdl/serializeLgdl/addNode 等） | 旧路径 0；迁出定义 0；新包核心零领域实现（领域值引用收敛 adapters/lgdl.ts 单点） | 漂移 | grep |
| V6 | 新包 82 测试全绿（FR-002~007/AC-002） | `npm test`（packages/ai-command-kit） | 82 例全绿、fail 0（commands 14 + operations 9 + exec 22 + protocol 27 + help 4 + llm 6） | 测试覆盖 | npm test |
| V7 | web 48 测试全绿（FR-007/AC-005） | `npm test`（packages/web） | 48 例全绿、fail 0（locate 10 + snap 8 + provider 14 + web-fetch 6 + lgdl-web 2 + next-actions 4 + help 4） | 测试覆盖 | npm test |
| V8 | core 258 测试全绿（FR-010/AC-005） | `npm test`（packages/core） | 258 例全绿、fail 0（mutations 206 + parser 52） | 测试覆盖 | npm test |
| V9 | 388 计数守恒 + 全绿门禁（NFR-001/AC-005/ADR-008） | 汇总 V6~V8 计数；与基线（tag 上 core 281 + web 107）对照 | 总用例 388（82+48+258）守恒；fail 0；基线 388 全绿参照 | 测试覆盖 | npm test 汇总 |
| V10 | 行为等价① help 输出逐字节（FR-006/NFR-002/AC-007/EC-010） | 基线 help.ts 编译运行 webCliHelp（7 topics：顶层/add-node/remove-edge/update-group/status/validate/help）vs 新包 dist/help.js 同输入运行 | 输出逐字节一致 | 接口数据（行为等价） | 对比脚本（eq-help.mjs） |
| V11 | 行为等价② tools schema 逐字节（FR-004/NFR-002/AC-007） | 提取基线 provider.ts WEB_CLI_TOOL 区段 vs 新包 tools.ts 全文对比；运行期提取 enum 项数与顺序 | schema 逐字节一致；enum 20 项（status/validate/init/convert + 9 mutation + doc-info/get-node/get-edge/find-node + list-node-kinds/list-diagram-types + help）与基线一致 | 接口数据（行为等价） | 对比脚本（eq-tools-errors.mjs）+ node 运行期提取 |
| V12 | 行为等价③ 错误消息集合（FR-005/NFR-002/AC-007） | 提取基线 web-cli.ts/ops.ts vs 新包 protocol.ts/exec.ts 中文字符串集合对比；差异项逐条定位（fetch 消息应留 web 侧 web-fetch.ts/lgdl-web.ts，ADR-007） | 字符串集合一致或差异均为 ADR-007 预期拆分（fetch 留 web）；无消息丢失 | 接口数据（行为等价） | 对比脚本（eq-tools-errors.mjs） |
| V13 | CLI 冒烟 mutation 命令真实执行（FR-008/AC-003） | 迁移后 cli dist 运行 add-node/update-node/add-edge/remove-node 于真实 LGDL 文档；与基线 cli dist 同命令运行对比 stdout 与落盘文件 | 冒烟执行成功；stdout 与落盘文件逐字节一致（diff 无输出） | 接口数据（行为等价） | CLI 真实执行 + diff |
| V14 | 构建与类型完整性（NFR-006/AC-001/AC-008） | `npm run build`（root workspaces 全仓）；确认新包 dist/ 产物 | 退出码 0；dist/ 含新包（commands/operations/exec/protocol/help/tools/llm/adapters/index） | 构建 | npm run build |
| V15 | CI 构建补齐（FR-011/AC-008/R-007） | 检查 deploy-pages.yml：新包构建步骤 + paths 触发；router 构建步骤存在性（结合 B2：F-01 未实施则记录事实） | workflow 含新包构建 + paths；router 步骤按事实判定 | 静态 | 文件读取 |
| V16 | AI 面板四条路径（NFR-007/AC-009/EC-008） | ① chat 文本→markdown ② lgdl-web-cli 工具调用执行 ③ 手动文本命令执行 ④ web fetch 工具：先启动 vite dev server + headless chromium 验证 AiPanel 渲染；完整四条路径行为若环境不允许（需真实 LLM API Key + 人工交互），标注人工复核项并给出自动化测试覆盖证据 | dev server HTTP 200；AiPanel 渲染（DOM 含「AI 助手面板」+ lgdl-web-cli 命令面）；四条路径：自动化覆盖证据（llm 6 例/exec 22 例/web-fetch 6 例）+ 人工复核清单 | 性能边界（实战闭环）+ 测试覆盖 | vite + headless chromium + 测试证据 |
| V17 | build 偏差复核（B1~B9 动态可验证项）+ review 4 项改进确认/跟踪 | B1 W-D1 现场保留核验（provider.ts OpenAI 端点工具注册）；B3 LgdlOperation 在 core/types.ts；B4 新包 SDK 依赖；B5 index 双面导出；B6 cli 9 命令切换；B7 ops.ts 删除；B8 lgdl.ts 具名导出；B9 web test 脚本 7 文件；改进 1~4 逐项确认现状 | B1~B9 与 review 复核结论一致；改进 1（web 冗余 SDK）仍存在 → 跟踪项；改进 2（lgdl-web.ts 注释漂移）仍存在 → 跟踪项；改进 3（spec FR-004 18→20 计数）仍为 18 → 跟踪项；改进 4（build.md 缺失）确认 → 跟踪项 | 漂移 | grep + 文件读取 |

> **质量门槛（数量基线法）**：FR 11 项 → Vx 覆盖 11/11（V1→FR-001、V2→FR-009、V3→FR-002~006、V4→FR-009、V5→FR-009、V6→FR-002~007、V7→FR-007、V8→FR-010、V10~V12→FR-002~006、V13→FR-008、V14→FR-001/NFR-006、V15→FR-011、V16→NFR-007、V17→FR-009/FR-011）；五维度覆盖：测试覆盖（V6~V9）、接口数据（V10~V13 行为等价）、构建（V14/V15）、性能边界（V16）、漂移（V2/V4/V5/V17）✓

## 3. 测试覆盖验证（策略口径）
> 运行测试套件，统计覆盖率，逐项标注（执行结果见 validate-report.md）

### 3.1 功能需求 (FR) — 覆盖率目标 100%

| 需求 ID | spec 描述 | 验证场景 | 测试结果（策略口径） | 覆盖率 |
|---------|----------|:--:|:--:|:--:|
| FR-001 | 新包骨架 | V1/V14 | ✅ 预期通过 | 已覆盖 |
| FR-002 | COMMANDS 注册表迁入 | V3/V6/V10 | ✅ 预期通过 | 已覆盖 |
| FR-003 | 执行层迁入 | V3/V6/V10 | ✅ 预期通过 | 已覆盖 |
| FR-004 | tools schema + LLM 迁入 | V3/V6/V11 | ✅ 预期通过 | 已覆盖 |
| FR-005 | 协议解析器迁入 | V3/V6/V12 | ✅ 预期通过 | 已覆盖 |
| FR-006 | help 自文档框架迁入 | V3/V6/V10 | ✅ 预期通过 | 已覆盖 |
| FR-007 | web 接线随迁 + 适配注入 | V6/V7/V16 | ✅ 预期通过 | 已覆盖 |
| FR-008 | cli 引用切换 | V13 | ✅ 预期通过 | 已覆盖 |
| FR-009 | core 导出面收敛与依赖方向 | V2/V4/V5 | ✅ 预期通过 | 已覆盖 |
| FR-010 | 测试迁移与回归 | V6~V9 | ✅ 预期通过 | 已覆盖 |
| FR-011 | CI 构建补齐 | V15 | ✅ 预期通过 | 已覆盖 |

### 3.2 非功能需求 (NFR) — 覆盖率目标 ≥80%

| 需求 ID | spec 描述 | 验证场景 | 测试结果（策略口径） | 覆盖率 |
|---------|----------|:--:|:--:|:--:|
| NFR-001 | 零破坏回归门禁（388 守恒） | V9 | ✅ 预期通过 | 已覆盖 |
| NFR-002 | 零语义改动（逐字节一致） | V10~V13 | ✅ 预期通过 | 已覆盖 |
| NFR-003 | 包依赖方向约束（无环无反向边） | V2 | ✅ 预期通过 | 已覆盖 |
| NFR-004 | 领域解耦（新包核心零领域实现） | V5 | ✅ 预期通过 | 已覆盖 |
| NFR-005 | 零新增功能（命令 9/工具 3/enum 20） | V11 + prompts 比对 | ✅ 预期通过 | 已覆盖 |
| NFR-006 | 构建与类型完整性 | V14 | ✅ 预期通过 | 已覆盖 |
| NFR-007 | 手动 AI 实战闭环（四条路径） | V16 | ⚠️ 环境受限转人工复核 | 部分覆盖（自动化测试证据 + 人工清单） |

## 4. 接口与数据实测（策略口径）
> 行为等价对比面：help 文本 / tools schema / 错误消息 / CLI stdout+落盘（均与基线 tag 对比）

| 检查项 | spec 要求 | 验证方法 | 判定（策略口径） |
|--------|----------|---------|:--:|
| webCliHelp 输出（7 topics） | 与迁移前逐字节一致（NFR-002） | eq-help.mjs 基线 vs 新包运行 diff | ✅ 预期一致 |
| WEB_CLI_TOOL schema | name/description/parameters 逐字节不变（FR-004） | eq-tools-errors.mjs + 运行期 enum 提取 | ✅ 预期一致 |
| 错误消息字符串集合 | 零丢失零新增（NFR-002） | eq-tools-errors.mjs 集合对比 | ✅ 预期一致（fetch 差异为 ADR-007 预期拆分） |
| CLI mutation 命令 | 冒烟执行与迁移前一致（FR-008） | 迁移后 vs 基线 cli dist 同命令执行 + diff | ✅ 预期一致 |

## 5. 构建与脚本验证（策略口径）

| 检查项 | 命令 | 预期退出码 | 结果 |
|--------|------|:--:|:--:|
| 全仓构建 | `npm run build`（root） | 0 | ✅ 预期通过 |
| 新包构建 | `tsc`（packages/ai-command-kit） | 0 | ✅ 预期通过 |
| 基线构建（参照） | `npm run build`（baseline worktree） | 0 | ✅ 预期通过 |

## 6. 性能与边界验证（策略口径）
> 本 Feature 无新增性能指标 NFR（纯重构抽取）；NFR-002 零语义改动即性能等价面；NFR-007 实战闭环为唯一人工依赖项

| 项 | spec 要求 | 验证方法 | 达标？ |
|-----|----------|---------|:--:|
| AI 面板实战闭环（NFR-007） | 四条路径行为与迁移前一致 | vite dev server + headless chromium 渲染冒烟；完整路径转人工复核（EC-008） | ⚠️ 转人工 |
| EC-001 cli 引用断裂 | 切换与收敛原子落地无断裂窗口 | cli 构建 + 冒烟通过即证 | ✅ 预期通过 |
| EC-002 依赖方向死锁 | 无 core re-export、无环 | V2 npm ls + grep | ✅ 预期通过 |
| EC-006 测试迁移遗漏 | 无残留 | V5 grep | ✅ 预期通过 |

## 7. 漂移检测（策略口径）

| 漂移类型 | 检测方法 | 预期结果 |
|---------|---------|---------|
| 孤立代码（有代码无需求） | grep 新包/core/web 迁出符号定义残留 | ✅ 无 |
| 需求缺失（有需求无代码） | 逐 FR 核对导出面与测试 | ✅ 无 |
| 规格漂移（spec 被修改） | git diff spec.md vs 基线 | ✅ 无（build 期间未改 spec） |
| 实现偏差（B1~B9） | V17 逐项复核 | ⚠️ B1 门禁偏差（作者授权）记录在案，非本步引入 |

## 8. 结论（策略口径）
> 基于实测数据的最终判定（执行结果见 validate-report.md）

**结论**: ✅ 通过（预期）
**预期指标**：FR 覆盖率 100%（11/11）、NFR 覆盖率 100%（7/7，NFR-007 自动化证据 + 人工复核）、构建退出码 0、漂移 0 项严重、阻塞 0 项。

**依据**：
1. review-report.md 状态 passed（C1~C24 全项通过、0 阻塞、4 改进建议均低严重度非阻塞）；
2. 三包测试计数守恒 388（82+48+258）与基线全绿参照（V6~V9）；
3. 行为等价五面（help/schema/错误消息/CLI stdout/落盘文件）均与基线 tag 逐字节对比（V10~V13）；
4. 依赖方向与解耦静态实证（V2/V4/V5）；
5. AI 面板四条路径：自动可验证部分（dev server + 渲染冒烟 + llm/exec/web-fetch 测试证据）执行，完整人工交互按 EC-008 标注人工复核项（V16）。

## 9. 修订记录
> 记录本文档的版本变更历史

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：基于 spec AC-001~010 + review 4 项改进 + plan 迁移序列自主定义 V1~V17 验证场景矩阵（全五维度覆盖） | 2026-08-31 | SDDU Validate Agent |
