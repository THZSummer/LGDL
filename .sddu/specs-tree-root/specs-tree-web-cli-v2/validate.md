# 验证策略：specs-tree-web-cli-v2（web-cli V2 抽取与包体系重构）

> **文档定位**: SDDU 验证策略 — 指导 validate Agent 执行自主验证的场景和方法；验证结果见 validate-report.md
> **前置依赖**: spec.md（需求规范，25 FR 五组 / 7 NFR / 10 EC / AC-001~010 + D-001~004）、plan.md（技术方案，M0~M11 / 9 ADR）、review-report.md（审查报告，⚠️ 有条件通过，0 阻塞 + P1/P2 改进）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-08-31
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-08-31
> **更新说明**: 初始创建 — 基于 spec AC-001~010 + plan 9 ADR + review C1~C25/B1~B4 结论 + review 2 项改进（P1/P2），自主定义 V1~V16 验证场景（静态 5 / 动态 3 / 行为等价 4 / CLI 冒烟 1 / build 偏差复核 2 / review 改进 2），代码类 Feature 全维度覆盖（测试覆盖 + 接口数据 + 构建 + 漂移检测）；性能/安全维度「不适用」— 本 Feature 为纯重构抽取（NFR 无性能指标定义，NG-001 零新功能）

## 1. 验证概要

| 维度 | 数值 |
|------|:--:|
| 验证对象 | 9 包（6 改名 + web-cli-base 纯化 + lgdl-web-cli + lgdl-web-op-cli）+ 根配置/CI/lock + 文档面 |
| 验证场景 | V1~V16（五维度：静态结构 5 / 测试覆盖 1 / 接口数据 4 / 构建 1 / 漂移检测 5，交叉覆盖） |
| 验证基线 | git tag `pre-v2-rename`（5ea98f3）逐字节 diff；spec AC-001~010 / NFR-001~007 |
| 动态验证 | 全量测试真实执行（9 包 npm test，守恒 ≥388）；CLI mutation 命令真实执行；build 全仓构建 |
| Feature 类型 | 代码类（全维度验证） |
| 前置条件 | ✅ review-report.md 状态 = ⚠️ 有条件通过（0 阻塞，P1/P2 已在 validate 启动前处理，见 §2 改进项前置处理） |

## 2. review 改进项前置处理（P1/P2）

> 用户指令：P1/P2 属 build 遗漏清理（删残留文件/重建 lock），validate 阶段先执行修复再验证。以下为处理记录，验证确认见 V15/V16。

| # | 改进项（review 记录） | 处理动作（validate 启动前执行） |
|---|----------------------|------------------------------|
| P1 | web 侧 next-actions 双份残留：`packages/lgdl-web/src/ai/next-actions.ts` + `next-actions.test.ts` 随 git mv 保留未删，AiPanel.tsx:9 仍本地导入 | ✅ 已执行：`git rm -f` 删除 web 侧 2 文件；AiPanel.tsx:9 import 切换至 `@lgdl/lgdl-web-op-cli`；web 包测试重跑 32 例全绿（修复后无副作用） |
| P2 | package-lock.json 残留 6 个旧目录条目（packages/cli/core/layout/render/router/web，`extraneous:true`） | ✅ 已执行：Node 脚本删除 6 个旧条目 + `npm install` 重建验证，lock 收敛为 9 workspace 条目、extraneous 0 |

## 3. 自主验证场景（V1~VN）

**验证对象来源**：
- `spec.md`：AC-001~010（总体验收）+ FR-001~025（五组）+ NFR-001~007 + EC-001~010
- `plan.md`：ADR-001~009 + M0~M11 迁移序列 + §4.2 测试守恒重算表
- `review-report.md`：C1~C25 静态审查结论（23 PASS / 2 WARN）+ B1~B4 偏差复核 + P1/P2 改进项
- 重构后代码：9 包 src + package.json 全量；根 package.json/tsconfig/CI；package-lock.json；README/docs

**质量门槛**：每个 AC ≥ 1 个 Vx；五维度（测试覆盖/接口数据/构建/性能边界/漂移检测）≥ 1 条；性能/安全维度显式标注「不适用」。

| # | 验证对象 | 验证步骤 | 预期结果 | 验证维度 | 验证方法 |
|---|---------|---------|---------|:--:|:--:|
| V1 | AC-001 包结构 9 包就位（目录 + name + workspace/lock） | ① `ls packages/` 核对 9 目录；② 逐包读 package.json name；③ lock 含 9 workspace 条目且零 extraneous | 9 目录 = 6 改名 lgdl-* + web-cli-base + lgdl-web-cli + lgdl-web-op-cli；name 与 D-001 一致（`@lgdl/lgdl-*`×6 + `@lgdl/web-cli-base` + 2 新包）；lock 9 条目 | 漂移检测 | ls + node 脚本 |
| V2 | AC-002 重命名零残留（跨包 import + 根配置 + CI + predev + tsconfig） | ① grep 旧包名 `@lgdl/core\b`/`layout`/`render`/`router`/`cli`/`web`（排除 web-cli-base 与 lgdl-* 新名）于 packages/*/src、根 package.json、CI、tsconfig、predev；② 核验 node_modules/@lgdl 链接指向新目录 | 全 grep 零命中；链接 9 个全部指向 packages/lgdl-*/web-cli-base 新目录 | 漂移检测 | grep 脚本 |
| V3 | AC-003 base 零 lgdl 依赖与硬编码（package.json + src） | ① base/package.json dependencies 核验（应仅 @anthropic-ai/sdk + openai）；② `grep -rn "@lgdl/"` 于 packages/web-cli-base/src 与 package.json；③ `grep -rn "lgdl-web-cli\|lgdl-web-op-cli\|lgdl-web-fetch"` 于 packages/web-cli-base/src（web-fetch 中性名除外）；④ llm.ts 单独 grep lgdl | package.json 零 @lgdl/*；src grep @lgdl/ 零命中（index.ts 头注释自引用除外）；lgdl-web-* 零命中；llm.ts lgdl 零命中 | 漂移检测 | grep 脚本 |
| V4 | AC-006 依赖方向无环（package.json 声明核验） | ① 逐包读 package.json dependencies；② 按 NFR-004 依赖图核验（base 零 @lgdl/*；lgdl-web-cli→{base,lgdl-core}；op-cli→base 仅类型；cli→{lgdl-web-cli,lgdl-core,lgdl-render}；web→六包）；③ op-cli 源码 grep react/dom 零命中 | 依赖图单向无环、无 base→lgdl 反向边；op-cli 零 React/DOM | 漂移检测 | node 脚本 + grep |
| V5 | AC-004 三工具归位（定义位置核验） | grep 定位：WEB_CLI_TOOL 定义于 lgdl-web-cli；WEB_OP_TOOL + WEB_OP_ENTRIES(OP_COMMANDS) + webOpHelp + next-actions 定义于 lgdl-web-op-cli；WEB_FETCH_TOOL（web-fetch）定义于 base；web 包仅组装/分发引用 | 三工具定义全部在目标包；web 无工具定义残留（仅 import 引用） | 漂移检测 | grep 脚本 |
| V6 | AC-005 测试全绿且守恒（全量动态执行） | ① 9 包逐一 `npm test`（lgdl-web 显式文件列表脚本；新包通配符脚本，先 `rm -rf dist-test` 清残留）；② 汇总各包测试计数；③ 比对守恒基线 ≥388；④ 失败数 = 0 | 全仓计数 ≥388（预估 407-435）；失败 = 0；无测试因重构删除（与 build 实测 420 交叉核验） | 测试覆盖 | npm test 逐包执行 |
| V7 | AC-008 构建与类型完整性（全仓 build） | ① 9 包逐一 `npm run build`（tsc）；② 根 `tsc -b`（若配置）；③ 核验 dist 产物存在 | 全仓 build 退出码 0；dist 产物完整（含 lgdl-cli/dist/cli.js bin） | 构建 | npm run build |
| V8 | AC-009 零语义：WEB_CLI_TOOL schema 逐字节 | python 提取基线 base-tools.ts 的 WEB_CLI_TOOL（name/description/parameters）JSON vs 当前 lgdl-web-cli/src/tools.ts | 逐字节一致（唯一允许差异 = 无；WEB_CLI_TOOL 不改名） | 接口数据 | python diff 脚本 |
| V9 | AC-009 零语义：WEB_OP_TOOL schema 逐字节 | python 提取基线 web-provider.ts 的 WEB_OP_TOOL（name/description/parameters enum）JSON vs 当前 lgdl-web-op-cli/src/tool.ts（enum 由 OP_SUBCOMMANDS 派生） | 逐字节一致（enum 16 项逐项一致，含顺序） | 接口数据 | python diff 脚本 |
| V10 | AC-009 零语义：help 输出逐字节（webCliHelp/webOpHelp/webFetchHelp） | python 提取基线 help 文案（base-help.ts 的 webCliHelp 系列 + web-help.ts 的 webOpHelp/webFetchHelp）vs 当前 lgdl-web-cli/help.ts + lgdl-web-op-cli/help.ts + base/help.ts | 逐字符一致（唯一允许差异 = `lgdl-web-fetch`→`web-fetch` 改名联动，FR-022/NG-007） | 接口数据 | python diff 脚本 |
| V11 | AC-009 零语义：协议解析与错误消息逐字节 | python 提取基线 base-protocol.ts 的错误消息字符串集合 vs 当前 lgdl-web-cli/protocol.ts + base/protocol.ts（tokenizeCli/parseArgs 留 base 面） | 错误消息字符串集合一致（唯一允许差异 = 未知子命令 `lgdl-web-fetch`→`web-fetch` 联动）；tokenizeCli/parseArgs 仍在 base 导出 | 接口数据 | python diff 脚本 |
| V12 | AC-007/FR-013 CLI 冒烟：mutation 命令真实执行 | ① `node packages/lgdl-cli/dist/cli.js --help`；② 实际执行 `lgdl-cli add-node`（含必填参数）验证 op 输出；③ 核验 bin 名 lgdl-cli 不变；④ 对照基线行为 | 命令可用、输出 op 结构与迁移前一致、bin 名不变 | 接口数据 | CLI 命令执行 |
| V13 | build 偏差 B2/B3 动态复核：WEB_OP_TOOL enum 派生 + WEB_FETCH_TOOL 描述 | ① 实测 OP_SUBCOMMANDS 派生 enum 与基线 WEB_OP_TOOL enum 逐项 diff（python）；② 读 base/tools.ts WEB_FETCH_TOOL 描述确认中性化（无 lgdl-web-* 工具名引用） | enum 16 项逐项一致；描述中性化且功能语义保留 | 接口数据 | python diff + read |
| V14 | build 偏差 B4 动态复核：base 注释/夹具清理 + llm 去耦实测 | ① base/src 含注释 grep `lgdl-web-*` 零命中；② base/web-fetch.test.ts 夹具中 lgdl 字样仅剩中性路径引用；③ llm.ts grep lgdl 零命中 | grep 零命中；夹具仅中性路径引用 | 漂移检测 | grep 脚本 |
| V15 | review P1 处理确认：next-actions 单份化 | ① `ls packages/lgdl-web/src/ai/` 无 next-actions.*；② AiPanel.tsx import 源为 `@lgdl/lgdl-web-op-cli`；③ op-cli 侧 next-actions.ts/.test.ts 存在且 4 例测试绿 | web 侧文件删除；import 已切换；op-cli 4 例全绿（V6 内含） | 漂移检测 | ls + grep + 测试 |
| V16 | review P2 处理确认：lock 收敛 9 条目 | ① lock 中 workspace 条目 = 9；② extraneous = 0；③ `npm install` 幂等（重跑不引入新残留） | lock 9 条目、零 extraneous、install 幂等 | 漂移检测 | node 脚本 + npm install |

> **性能/安全验证「不适用」说明**：本 Feature 为纯重构与抽取（NG-001 零新增功能、NG-003 零语义改动），spec NFR 无性能指标（并发/响应时间/吞吐量）定义，无外部服务/API 调用（纯内部代码重构），无安全面变更——按 §5.4 性能与边界验证规则显式标注「不适用」，EC 边界类（零残留/依赖方向/构建完整性）已由 V2~V4/V6~V7 覆盖。

## 4. 测试覆盖验证（预期矩阵）

### 4.1 功能需求 (FR) — 覆盖率 100%（25/25）

| 需求 ID | spec 描述 | 验证场景 | 覆盖率 |
|---------|----------|:--:|:--:|
| FR-001~005 | 组1 重命名 6 包（目录/name/import/根链/bin/文档） | V1, V2, V16 | 已覆盖 |
| FR-006~013 | 组2 抽取 lgdl-web-cli（骨架/命令/协议/工具/help/adapters/消费方） | V1, V5, V6, V8, V10, V11, V12 | 已覆盖 |
| FR-014~017 | 组3 抽取 lgdl-web-op-cli（工具/元数据/next-actions/handler/范围界定） | V1, V5, V6, V9, V13, V15 | 已覆盖 |
| FR-018~022 | 组4 base 纯化（泛型化/机制壳/llm 去耦/web-fetch 归位） | V3, V4, V6, V10, V11, V14 | 已覆盖 |
| FR-023~025 | 组5 web 调整（三工具分发/handler 注入/测试脚本） | V6, V7, V12, V15 | 已覆盖 |

### 4.2 非功能需求 (NFR) — 覆盖率 100%（7/7）

| 需求 ID | spec 描述 | 验证场景 | 覆盖率 |
|---------|----------|:--:|:--:|
| NFR-001 | 零新增功能（命令数 9/工具数 3/子命令 20+16+1） | V6, V8~V11, V13 | 已覆盖 |
| NFR-002 | 零语义改动（输出逐字节一致，唯一例外 web-fetch 改名） | V8~V11 | 已覆盖 |
| NFR-003 | 测试守恒 ≥388 | V6 | 已覆盖 |
| NFR-004 | 依赖方向约束（base 零 lgdl/无环/op-cli 零 React） | V3, V4 | 已覆盖 |
| NFR-005 | 泛型化契约（注入等价配置输出逐字节一致） | V6, V8~V11 | 已覆盖 |
| NFR-006 | 构建与类型完整性（全仓 tsc 零错误） | V7 | 已覆盖 |
| NFR-007 | 命名一致性（9 包 name 与 D-001 一致） | V1 | 已覆盖 |

## 5. 验证执行说明

- **零语义改动验证基线**：git tag `pre-v2-rename`（5ea98f3）；基线文件已提取至 `/tmp/sddu-validate-specs-tree-web-cli-v2-20260831/`（base-tools.ts / base-help.ts / base-protocol.ts / base-commands.ts / base-operations.ts / base-adapters-lgdl.ts / web-provider.ts / web-help.ts / web-next-actions.ts / web-web-fetch.ts）。
- **验证方式**：静态 grep 门禁 + 动态测试/命令执行 + python 逐字节 diff；测试全量真实运行（不臆测）。
- **验证脚本**：ADR-003 自主编写，存放于 `/tmp/sddu-validate-specs-tree-web-cli-v2-20260831/`，报告 §4 逐项记录。
- **结论标准**：AC 覆盖率 100%、测试守恒达标、构建退出码 0、漂移 0、阻塞 0 → ✅ 通过；非阻塞偏差 → ⚠️ 有条件通过；否则 ❌ 不通过。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：基于 spec AC-001~010 + plan 9 ADR + review C1~C25/B1~B4/P1~P2 定义 V1~V16 场景矩阵；静态 5（结构/残留/依赖/归位）+ 动态 3（测试/构建）+ 行为等价 4（schema×2/help/错误消息）+ CLI 冒烟 1 + 偏差复核 2 + 改进确认 2；性能/安全维度显式标注「不适用」（纯重构无 NFR 性能定义）；P1/P2 前置处理记录入 §2 | 2026-08-31 | SDDU Validate Agent |
