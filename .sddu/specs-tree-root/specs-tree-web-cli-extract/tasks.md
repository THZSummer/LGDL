# 任务分解：specs-tree-web-cli-extract（F-13 ① web-cli 独立包抽取）

> **文档定位**: SDDU 任务清单 — 将技术方案分解为可并行执行的原子任务，作为 build 阶段的输入
> **前置依赖**: plan.md（技术方案，M0~M12 / 8 ADR / 测试守恒 388）、spec.md（需求规范，11 FR / 7 NFR / 10 EC / AC-001~010）
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-08-31
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-08-31
> **更新说明**: 初始创建（基于 plan M0~M12 迁移序列分解为 13 个原子任务、10 个执行波次；覆盖测试守恒 388 门禁与回归任务）

---

## 1. 依赖拓扑总览
> 任务依赖关系和执行顺序（DAG）

```
Wave 1 ─── (无依赖，前置门禁)
  TASK-001 [S]  M0 前置门禁与基线快照

Wave 2 ─── (依赖 Wave 1)
  TASK-002 [M]  M1 新包骨架 + CI 构建补齐

Wave 3 ─── (依赖 Wave 2，底座三件套并行窗口 ①)
  TASK-003 [L]  M2 迁底座① commands 注册表（+14 测试随迁，core 暂留导出）
  TASK-004 [M]  M3 迁底座② operations 操作协议（+9 测试随迁，core 删除）
  TASK-005 [L]  M4 迁底座③ tools + llm（provider.ts 拆分 +6 测试随迁）

Wave 4 ─── (依赖 Wave 3 的 TASK-003)
  TASK-006 [L]  M5 迁底座④ protocol + help（+31 测试随迁 + web-fetch 拆分）

Wave 5 ─── (依赖 Wave 3 的 TASK-004 + Wave 4)
  TASK-007 [L]  M6 迁底座⑤ exec 执行骨架（+22 测试随迁 + lgdl-web 组装）

Wave 6 ─── (依赖 Wave 3~5 全部底座)
  TASK-008 [M]  M7 组装 LGDL 适配层（adapters/lgdl.ts + index 双面导出）

Wave 7 ─── (依赖 Wave 6，引用切换并行窗口 ②)
  TASK-009 [M]  M8 切 cli 引用（9 个 mutation 命令）
  TASK-010 [M]  M9 切 web 接线（AiPanel + 删除 ops/web-cli）

Wave 8 ─── (依赖 Wave 7，EC-001 与 TASK-009 连续原子)
  TASK-011 [S]  M10 core 导出面收敛（零依赖复核）

Wave 9 ─── (依赖 Wave 8，全量回归门禁)
  TASK-012 [M]  M11 全量回归 + 无残留 + 手测（388 守恒）

Wave 10 ─── (依赖 Wave 9)
  TASK-013 [S]  M12 收口（v0.7 补课登记）
```

### 关键路径（Critical Path）

```
TASK-001 → TASK-002 → TASK-003 → TASK-006 → TASK-007 → TASK-008 → TASK-010 → TASK-011 → TASK-012 → TASK-013
```

- **关键路径长度**：10 个任务（最长链），总工作量 ≈ 5.5 人日；
- **关键路径决定因素**：TASK-003（M2 commands）是唯一前驱链起点——protocol/help（M5）、exec（M6）均依赖新包 commands 注册表；TASK-010（M9 web 切换）→ TASK-011（M10 core 收敛）段为连续原子（EC-001），不可拆分并行；
- **可裁剪分支**：TASK-004（M3 operations）与 TASK-005（M4 tools+llm）虽在关键路径侧支，但 TASK-007（M6 exec）依赖 TASK-004，故该链不迟于 TASK-006 完成即可不拖累关键路径；
- **并行窗口**：Wave 3（TASK-003/004/005 底座三件套）与 Wave 7（TASK-009/010 cli/web 切换）为两个并行窗口——可在第 2 周窗口（09-07~09-11）内分别推进，预计并行后总工期 ≈ 5.5 人日（关键路径 10 任务串行段 ≈ 4.5 人日 + 收尾）。

## 2. 任务列表
> 每个任务的详细定义

### TASK-001: M0 前置门禁与基线快照
> 启动抽取前确认排布门禁与全绿基线

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | 无 |
| **执行波次** | 1 |
| **对应 FR** | C-007 / EC-005 / AC-010 / NFR-001 |

**描述**: 确认 F-04/F-05 已关闭（C-007 排布门禁，EC-005 W-D1 共存规避）；git 基线 tag/commit；运行全仓 `npm test` 确认 web 107 / core 281 全绿基线快照（NFR-001）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| — | 无源码改动（基线快照：git tag + 测试日志留存） |

**验收标准**:
- [ ] ROADMAP 排布确认 F-04/F-05 已关闭（gate: AC-010/EC-005）
- [ ] git 基线 commit/tag 存在（如 `v0.6-f13-baseline`）
- [ ] 全仓 `npm test` 输出全绿：web 107 / core 281，失败数 = 0

**验证命令**:
```bash
npm test 2>&1 | tail -20   # 全绿基线（web 107 + core 281）
git log --oneline -1        # 基线 commit 存在
```

### TASK-002: M1 新包骨架 + CI 构建补齐
> 创建第 7 个包 packages/ai-command-kit 并补 CI 构建

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-001 |
| **执行波次** | 2 |
| **对应 FR** | FR-001 / FR-011 / AC-001 / AC-008 / NFR-006 |

**描述**: 建 `packages/ai-command-kit/`：package.json（name `@lgdl/ai-command-kit`、type module、dependencies `@lgdl/core`、build=tsc、test=tsc+`node --test` 参考 web/package.json:11）；tsconfig.json 参考 packages/layout/tsconfig.json；src/index.ts 骨架（空导出面，M2 起逐步填充）；root workspaces `packages/*` 通配自动纳入（root package.json 零改动）；`.github/workflows/deploy-pages.yml` 补新包构建步骤 + paths 触发（FR-011，router 构建 :37 保留不回退 F-01）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/ai-command-kit/package.json |
| NEW | packages/ai-command-kit/tsconfig.json |
| NEW | packages/ai-command-kit/src/index.ts |
| MODIFY | .github/workflows/deploy-pages.yml |

**验收标准**:
- [ ] `ls packages/` 见 7 个包目录（AC-001）；package.json 字段完整（name/type/main/types/exports）
- [ ] `npm run build`（全仓等价构建）通过且产物含新包
- [ ] deploy-pages.yml 含新包构建步骤与 paths 触发；router 构建步骤（:37）仍存在（AC-008）

**验证命令**:
```bash
ls packages/ | wc -l                                   # = 7
npm run build 2>&1 | tail -5                           # 构建通过
grep -n "ai-command-kit\|router" .github/workflows/deploy-pages.yml   # 新包构建 + router 保留
```

### TASK-003: M2 迁底座① commands 注册表
> core/src/commands.ts:26-289 迁入新包 + 14 测试随迁（core 暂留导出防断链）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-002 |
| **执行波次** | 3 |
| **对应 FR** | FR-002 / AC-002（注册表面）/ AC-007 / ADR-004 / D-010 |

**描述**: 将 core/src/commands.ts:26-289（COMMANDS/KNOWN_PARAMS/requireParams/assertChangeRequested/buildOperation/parseAttrsSpec/parseMemberSpec）迁入新包 src/commands.ts：① `defaultKindFor`（:223-227）不内嵌导出，转为 `buildOperation` 第 4 参 `kindResolver?` 注入（ADR-004，内置默认 resolver = 现状逻辑逐字节）；② `LgdlOperation/LgdlMember/LgdlAttrs` 类型 import 目标改为 `@lgdl/core`（D-013 保类型）；③ core/src/commands.test.ts 14 例随迁至新包 commands.test.ts（defaultKindFor 相关用例改导新包 adapters 导出，延迟到 M7 组装后可用——过渡期导 lgdlKindResolver 占位或按 M7 完成后调整）。**core 暂保留导出**（防 M3 未就绪断链，删除动作在 TASK-011/M10）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/ai-command-kit/src/commands.ts |
| NEW | packages/ai-command-kit/src/commands.test.ts（14 例） |
| — | core/src/commands.ts 保留（TASK-011 删除） |

**验收标准**:
- [ ] 新包导出 COMMANDS/KNOWN_PARAMS/buildOperation/requireParams/assertChangeRequested/parseAttrsSpec/parseMemberSpec（AC-002 注册表面）
- [ ] 新包 `npm test` 14 例全绿；断言逐字节保持（AC-007）
- [ ] 注入/未注入 kindResolver 均得现状行为：`buildOperation('add-node',{id},'er')` → kind `'entity'`
- [ ] core 仍全绿（暂留导出不断链）

**验证命令**:
```bash
cd packages/ai-command-kit && npm test               # 14 例全绿
cd packages/core && npm test                         # core 281 仍全绿（暂留）
```

### TASK-004: M3 迁底座② operations 操作协议
> core/src/operations.ts:31-220 迁入新包 + 9 测试随迁 + core 侧删除

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-002 |
| **执行波次** | 3 |
| **对应 FR** | FR-003（core 侧）/ AC-002（执行层面）/ ADR-005 / EC-003 |

**描述**: 将 core/src/operations.ts:31-220（LgdlOperation/describeOperation/applyOperation/applyOperations/OperationBatchResult）迁入新包 src/operations.ts：① 9 个 mutation 不再 import（:16-27 删除），改为 `createOperationApplier(mutations)` 注入工厂返回 `{ applyOperation, applyOperations }`（ADR-005，分派 switch 逐行复制零改动）；② `LgdlDocument/NodeKind/LgdlMember/LgdlAttrs` 类型 import 目标改为 `@lgdl/core`（D-013）；③ operations.test.ts 9 例随迁（import `./parser.js`/`./groups.js` → `@lgdl/core`）；④ **core/src/operations.ts 删除**（区别于 TASK-003 的暂留——operations 无下游在 core 内部消费其实现）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/ai-command-kit/src/operations.ts |
| NEW | packages/ai-command-kit/src/operations.test.ts（9 例） |
| DELETE | packages/core/src/operations.ts |
| DELETE | packages/core/src/operations.test.ts（随迁后） |

**验收标准**:
- [ ] 新包导出 LgdlOperation/describeOperation/applyOperation/applyOperations/OperationBatchResult/createOperationApplier（AC-002 执行层面）
- [ ] 新包测试全绿（commands 14 + operations 9 = 23 例）；分派语义不变（EC-003，随迁 9 例断言零改动）
- [ ] core 剩 258 例全绿（281-23，计数守恒中间态）
- [ ] 首个失败即停行为保持（operations.ts:199-220 逐行复制）

**验证命令**:
```bash
cd packages/ai-command-kit && npm test               # 23 例全绿
cd packages/core && npm test                         # 258 例全绿
```

### TASK-005: M4 迁底座③ tools + llm
> provider.ts 拆分：WEB_CLI_TOOL → tools.ts，LLM 客户端 → llm.ts（中性化）+ 6 测试随迁

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-002 |
| **执行波次** | 3 |
| **对应 FR** | FR-004 / AC-002（tools+LLM 面）/ AC-007 / D-011 / D-012 |

**描述**: 拆分 web/src/ai/provider.ts（581 行）：① :282-324 `WEB_CLI_TOOL` **逐字节**迁入新包 tools.ts（name/description/parameters 零改动，FR-004 验收）；② :196-229（ChatTurn/WebCliToolCall/ChatResult）、:392-547（chat 双路径/parseToolArguments/classifyError）迁入新包 llm.ts——`ProviderSettings/ProviderConfig`（web 应用态）不迁入，chat 改收中性 `LlmConfig`（含 `provider: LlmProviderInfo`，断言不变）；③ 留 web：PROVIDERS（:41-50）、localStorage Key 管理（:62-194）、WEB_OP_TOOL（:232-281）、WEB_FETCH_TOOL（:330-358）、testConnection（:371-386）及注册组装（:405-420/:504，F-04 修复点 W-D1 不移动，D-011）；④ provider.test.ts 6 例随迁 → 新包 llm.test.ts（classifyError 3 + parseToolArguments 2 + WEB_CLI_TOOL 1，provider 参数改中性 `LlmProviderInfo`）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/ai-command-kit/src/tools.ts |
| NEW | packages/ai-command-kit/src/llm.ts |
| NEW | packages/ai-command-kit/src/llm.test.ts（6 例） |
| MODIFY | packages/web/src/ai/provider.ts（删除迁出面，保留应用态） |
| MODIFY | packages/web/src/ai/provider.test.ts（删 6 例，保留 14 例） |

**验收标准**:
- [ ] 新包导出 WEB_CLI_TOOL/chat/parseToolArguments/classifyError（AC-002 tools+LLM 面）
- [ ] 新包 6 例全绿；web provider.test.ts 14 例全绿
- [ ] WEB_CLI_TOOL schema 逐字节不变（AC-007）；grep 确认 WEB_OP_TOOL/WEB_FETCH_TOOL 定义仍在 web/provider.ts（D-011）
- [ ] localStorage Key 管理（loadSettings/saveSettings/saveProviderInputs）仍在 web（D-012）

**验证命令**:
```bash
cd packages/ai-command-kit && npm test               # 29 例全绿（23 + llm 6）
cd packages/web && npm test                          # provider.test.ts 14 例
grep -c "WEB_OP_TOOL\|WEB_FETCH_TOOL" packages/web/src/ai/provider.ts   # ≥2（留 web）
```

### TASK-006: M5 迁底座④ protocol + help
> web-cli.ts 解析骨架 + help.ts webCliHelp 面迁入新包 + 31 测试随迁 + web-fetch 拆分

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-003（protocol/help 均依赖新包 commands 注册表） |
| **执行波次** | 4 |
| **对应 FR** | FR-005 / FR-006 / AC-002（协议/help 面）/ R-009 / EC-010 |

**描述**: ① web/src/ai/web-cli.ts:23-289（ParsedCommand/tokenizeCli/parseArgs/parseWebCliCommand/parseWebCliBatch/ParsedBatch）迁入新包 protocol.ts——`buildOperation` import 改自新包 commands.ts（未注入 resolver = 现状行为，ADR-004）；前缀 `lgdl-web-cli` 保留为默认配置；**parseWebFetchCommand/ParsedWebFetch（:291-327）不迁入**（web fetch 留 web，ADR-007）；② web/src/ai/help.ts:13-209（webCliHelp 面）迁入新包 help.ts——`COMMANDS` import 改自新包自身注册表（R-009 单一数据源闭环，EC-010）；webOpHelp/webFetchHelp（:212-322）留 web；③ 测试随迁：web-cli.test.ts 27 例 → protocol.test.ts、help.test.ts 4 例 → help.test.ts（web-cli.test.ts:4 的 `@lgdl/core` import 保持——formatStatus/parseLgdl 领域符号留 core）；④ web 侧新建 web-fetch.ts（parseWebFetchCommand/ParsedWebFetch :291-327）+ web-fetch.test.ts 3 例。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/ai-command-kit/src/protocol.ts |
| NEW | packages/ai-command-kit/src/protocol.test.ts（27 例） |
| NEW | packages/ai-command-kit/src/help.ts |
| NEW | packages/ai-command-kit/src/help.test.ts（4 例） |
| NEW | packages/web/src/ai/web-fetch.ts |
| NEW | packages/web/src/ai/web-fetch.test.ts（3 例） |
| MODIFY | packages/web/src/ai/help.ts（删除 webCliHelp 面 :13-209，保留 webOpHelp/webFetchHelp） |
| DELETE | packages/web/src/ai/web-cli.test.ts（27 例随迁后） |

**验收标准**:
- [ ] 新包导出 tokenizeCli/parseArgs/parseWebCliCommand/webCliHelp（AC-002 协议/help 面）
- [ ] 新包 protocol 27 + help 4 例全绿；解析结果逐字节一致（AC-007）
- [ ] web 侧 web-fetch.test.ts 3 例全绿；help.test.ts 剩 4 例（webOpHelp 3 + webFetchHelp 1）全绿
- [ ] help 输出与迁移前逐字符一致（COMMANDS 动态生成，EC-010）

**验证命令**:
```bash
cd packages/ai-command-kit && npm test               # 60 例全绿（29 + protocol 27 + help 4）
cd packages/web && npm test                          # web 剩余用例全绿（含 web-fetch 3）
```

### TASK-007: M6 迁底座⑤ exec 执行骨架
> ops.ts 执行管线迁入新包 exec.ts（DomainApi 注入）+ 22 测试随迁 + web 侧 fetch/组装拆分

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-004（operations 协议）+ TASK-006（help 面） |
| **执行波次** | 5 |
| **对应 FR** | FR-003（web 侧执行链）/ FR-007（部分）/ ADR-006 / EC-004 |

**描述**: ① web/src/ai/ops.ts:34-44（CommandExecResult）、:80-253（executeSubcommand 管线）、:260-331（executeCommands 循环）、:351-376（describeCommandLine）迁入新包 exec.ts——**19 个领域符号直调（:10-30）改为 `createExecutor(domain: DomainApi, options?)` 注入面**（ADR-006，EC-004 全量收口）；管线分支逐字节复制零改写（help 优先 :92-95、只读 :105-202、增量 :204-252）；executeCommands 增 `options.handleLine` 扩展点（fetch 行处理器 web 侧注入，ADR-007）；webCliHelp 引用改自新包 help.ts；② ops.test.ts 22 例随迁 → 新包 exec.test.ts；③ web 侧：web-fetch.ts 增 executeWebFetch（ops.ts:52-71，用平台 fetch :59）+ web-fetch.test.ts 增 3 例；新建 lgdl-web.ts（fetch 行处理器 ops.ts:271-293 逻辑 + 透传 lgdlExecutor 单例，单例引用在 M7 组装后接通）+ lgdl-web.test.ts 2 例（随迁 ops.test.ts:185,193）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/ai-command-kit/src/exec.ts |
| NEW | packages/ai-command-kit/src/exec.test.ts（22 例） |
| NEW | packages/web/src/ai/lgdl-web.ts |
| NEW | packages/web/src/ai/lgdl-web.test.ts（2 例） |
| MODIFY | packages/web/src/ai/web-fetch.ts（增 executeWebFetch） |
| MODIFY | packages/web/src/ai/web-fetch.test.ts（增 3 例，共 6 例） |
| DELETE | packages/web/src/ai/ops.test.ts（22 例随迁后） |

**验收标准**:
- [ ] 新包导出 createExecutor/CommandExecResult（AC-002 执行层面）
- [ ] 新包 exec.test.ts 22 例全绿（断言零改动，EC-004）；web web-fetch 6 例 + lgdl-web 2 例全绿
- [ ] 执行管线顺序（parseLgdl→buildOperation→applyOperation→validate→serializeLgdl）与失败即停行为不变
- [ ] 新包 exec.ts 无领域符号 import（仅 domain 注入引用，NFR-004 部分）

**验证命令**:
```bash
cd packages/ai-command-kit && npm test               # 82 例全绿（60 + exec 22）
cd packages/web && npm test                          # web 剩余用例全绿
grep -n "from '@lgdl/core'" packages/ai-command-kit/src/exec.ts   # 仅类型/领域注入引用
```

### TASK-008: M7 组装 LGDL 适配层
> 新包 adapters/lgdl.ts 单点组装 + index 双面导出 + web provider chat 薄包装

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-003 + TASK-004 + TASK-005 + TASK-006 + TASK-007 |
| **执行波次** | 6 |
| **对应 FR** | FR-007 / AC-002（适配单点）/ ADR-003 / NFR-004 / R-011 |

**描述**: ① 新建新包 src/adapters/lgdl.ts（LGDL 首个适配场景单点，ADR-003）：`lgdlKindResolver`（= 现状 defaultKindFor 逻辑逐字节，commands.ts:223-227）、`lgdlBuildOperation`（预注入 resolver）、`lgdlApplier = createOperationApplier(9 mutations)`、`lgdlDomain`（19 领域符号 + applier + buildOperation + webCliHelp）、`lgdlExecutor = createExecutor(lgdlDomain)`；② src/index.ts 双面导出：框架核心（commands/operations/exec/protocol/help/tools/llm）+ LGDL 适配单例（applyOperation/buildOperation 符号名不变——cli 9 命令零改动切换的价值）；③ web provider.ts chat 薄包装：构造 LlmConfig 调新包 chat，保持 `chat(settings, turns)` 签名（AiPanel.tsx:390 调用点不变）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/ai-command-kit/src/adapters/lgdl.ts |
| MODIFY | packages/ai-command-kit/src/index.ts（双面导出） |
| MODIFY | packages/web/src/ai/provider.ts（chat 薄包装） |

**验收标准**:
- [ ] 新包 index 导出面与 AC-002 清单一致（框架符号 + lgdlExecutor 单例）
- [ ] `npm run build` 全仓通过（NFR-006）；新包 + web 用例全绿
- [ ] NFR-004 验收口径（R-011）：框架核心模块零领域引用；LGDL 适配收敛于 adapters/ 单点
- [ ] web provider `chat(settings, turns)` 签名不变（AiPanel 调用点零改动）

**验证命令**:
```bash
npm run build 2>&1 | tail -5                         # 全仓构建通过
cd packages/ai-command-kit && npm test && cd ../web && npm test
grep -rn "from './adapters\|adapters/lgdl" packages/ai-command-kit/src/index.ts   # 适配导出就绪
```

### TASK-009: M8 切 cli 引用
> cli 9 个 mutation 命令 import 切至新包（diff = 仅包名）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-008 |
| **执行波次** | 7 |
| **对应 FR** | FR-008 / AC-003 / R-002 |

**描述**: ① packages/cli/src/commands/{add-node,remove-node,update-node,add-edge,remove-edge,update-edge,add-group,remove-group,update-group}.ts 各 :4 `import { applyOperation, buildOperation } from '@lgdl/core'` → `from '@lgdl/ai-command-kit'`（新包 index 双面导出符号名不变 → 调用点零改动，ADR-003）；② cli/package.json dependencies 加 `@lgdl/ai-command-kit`；③ **不切换面**：queries.ts:4/option-hints.ts:9/shared.ts:5-11/convert.ts:6/init.ts:4/import.ts:5 均为领域符号 → 留 `@lgdl/core` 零改动。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | packages/cli/src/commands/add-node.ts 等 9 个 mutation 命令（各 :4 import 一行） |
| MODIFY | packages/cli/package.json（dependencies + @lgdl/ai-command-kit） |

**验收标准**:
- [ ] 9 个 mutation 命令 import 目标全部为 '@lgdl/ai-command-kit'（AC-003 grep 核验）
- [ ] cli 包 tsc 构建通过；`lgdl-cli <mutation 命令>` 冒烟：op 构造/应用路径行为与迁移前一致（FR-008）
- [ ] queries/option-hints/shared/convert/init/import 的 '@lgdl/core' 引用零改动（领域符号留 core）

**验证命令**:
```bash
grep -rn "from '@lgdl/core'" packages/cli/src/commands/ | wc -l   # = 0（9 命令全切）
grep -rn "from '@lgdl/ai-command-kit'" packages/cli/src/commands/ | wc -l  # = 9
cd packages/cli && npm run build
node dist/cli.js add-node --help    # 冒烟：命令解析正常
```

### TASK-010: M9 切 web 接线
> AiPanel import 切至新包 + 删除 ops.ts/web-cli.ts

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-008 |
| **执行波次** | 7 |
| **对应 FR** | FR-007 / AC-003 / EC-006 |

**描述**: ① AiPanel.tsx:5 `from './ops'` → `from '@lgdl/ai-command-kit/lgdl'`（executeSubcommand）+ `from './web-fetch'`（executeWebFetch）；:6 仍 `from './provider'`（chat 包装保留同名导出）；:390/:430/:435 调用点零改动；② 删除 web/src/ai/ops.ts 与 web/src/ai/web-cli.ts（迁出完成，EC-006 无残留前置）；③ web/package.json dependencies + `@lgdl/ai-command-kit`；test 脚本文件列表更新（删 ops/web-cli，增 web-fetch/lgdl-web）；④ App.tsx:19-20/SettingsPanel.tsx:4-12 不动（loadSettings/saveSettings/webOpHelp/provider 留 web 部分）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | packages/web/src/ai/AiPanel.tsx（:5 import 切换） |
| MODIFY | packages/web/package.json（dependencies + test 脚本文件列表） |
| DELETE | packages/web/src/ai/ops.ts |
| DELETE | packages/web/src/ai/web-cli.ts |

**验收标准**:
- [ ] AiPanel.tsx import 目标为新包/lgdl-web（AC-003）；调用点 :390/:430/:435 零改动
- [ ] web 构建 + 剩余测试全绿（48 例中间态：107 - ops 27 - web-cli 30 + web-fetch 6 + lgdl-web 2 + help 拆 4 → 需按 §4.2 核对）
- [ ] grep 无旧路径残留：`from './ops'` / `from './web-cli'` 均无（EC-006）
- [ ] ops.ts/web-cli.ts 已删除；App.tsx/SettingsPanel.tsx 未改动

**验证命令**:
```bash
grep -rn "from './ops'\|from './web-cli'" packages/web/src/ | wc -l   # = 0
grep -n "ai-command-kit" packages/web/package.json                    # 依赖已加
cd packages/web && npm run build && npm test                          # 构建 + 用例全绿
```

### TASK-011: M10 core 导出面收敛
> core/src/index.ts 删除迁出导出 + 删除 commands.ts + 零依赖复核（与 TASK-009 连续原子）

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-009 + TASK-010 |
| **执行波次** | 8 |
| **对应 FR** | FR-009 / AC-004 / EC-001 / EC-002 / NFR-003 |

**描述**: ① core/src/index.ts 删除 :28-33（operations 面：applyOperation/applyOperations/describeOperation/LgdlOperation/OperationBatchResult）、:44-45（commands 面：COMMANDS/KNOWN_PARAMS/buildOperation/requireParams/assertChangeRequested/parseAttrsSpec/parseMemberSpec）迁出导出（FR-009）；② 删除 core/src/commands.ts、core/src/commands.test.ts（TASK-003 迁出后残留）；③ core/package.json 零依赖复核（无 dependencies 新增，NFR-003）；④ 依赖方向核验：新包→core 单向、无 core→新包 反向边、无环（EC-002 禁止 re-export）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | packages/core/src/index.ts（删除迁出导出） |
| DELETE | packages/core/src/commands.ts |
| DELETE | packages/core/src/commands.test.ts |
| — | packages/core/package.json（复核，预期零改动） |

**验收标准**:
- [ ] core/src/index.ts 不再导出迁出符号（AC-004）；core/package.json 无 dependencies 新增
- [ ] core 258 例全绿（281 - 14 commands - 9 operations）；`npm run build` 全仓通过
- [ ] 依赖方向检查：package.json 声明 + 构建解析无环、无 core→新包 反向边（NFR-003/EC-002）
- [ ] 与 TASK-009 连续原子落地（EC-001）：本任务与 M8 处于同一 commit/构建门禁内，无 cli 断裂窗口

**验证命令**:
```bash
cd packages/core && npm test                          # 258 例全绿
grep -n "dependencies" packages/core/package.json     # 无 dependencies 字段
npm run build 2>&1 | tail -5                          # 全仓构建通过
grep -n "applyOperation\|buildOperation\|COMMANDS" packages/core/src/index.ts | wc -l  # = 0
```

### TASK-012: M11 全量回归 + 无残留 + 手测
> 388 计数守恒门禁 + AC-006 无残留 grep + AI 面板四条路径手测

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-011 |
| **执行波次** | 9 |
| **对应 FR** | FR-010 / AC-005 / AC-006 / AC-007 / NFR-001 / NFR-002 / NFR-005 / NFR-007 / EC-006 / EC-008 / R-012 |

**描述**: ① 全仓 `npm test`：新包 82 + web 48 + core 258 = **388 全绿**（计数守恒门禁，ADR-008/R-012 口径：总用例数 + 全绿 + 断言逐字节）；② AC-006 无残留 grep：`defaultKindFor|WEB_CLI_TOOL|executeSubcommand|buildOperation` 定义只在允许位置（新包/按 Q-010/Q-011 决策的例外项）；无 import 指向已删除路径；③ 抽样逐字节比对：webCliHelp 文本（顶层/单命令）、WEB_CLI_TOOL schema JSON 迁移前后 diff 一致（AC-007/NFR-002）；④ AI 面板四条路径手测（NFR-007/AC-009/EC-008）：chat 文本→markdown、lgdl-web-cli 工具调用、手动文本命令、web fetch——人工逐条执行并记录（validate 阶段复核关闭）；⑤ 工具名不变（lgdl-web-cli/lgdl-web-op-cli/lgdl-web-fetch）与 prompts.ts 协议描述比对（NFR-005）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| — | 无源码改动（回归 + grep 核验 + 手测清单记录，记录落 validate 产物） |

**验收标准**:
- [ ] 全仓测试 388 全绿（新包 82 + web 48 + core 258），失败数 = 0（AC-005/NFR-001）
- [ ] AC-006 grep 核验通过：无残留、无指向已删除路径 import
- [ ] 抽样 diff：help 文本 / WEB_CLI_TOOL schema 与迁移前逐字节一致（AC-007/NFR-002）
- [ ] AI 面板四条路径手测记录完成，行为与迁移前一致（NFR-007/AC-009/EC-008）

**验证命令**:
```bash
npm test 2>&1 | tail -20                              # 388 全绿
grep -rn 'defaultKindFor\|WEB_CLI_TOOL\|executeSubcommand\|buildOperation' packages/core/src packages/web/src  # 仅允许位置
grep -rn "from '@lgdl/core'" packages/cli/src packages/web/src   # 逐条判定：仅领域留用
# 手测清单（人工）：chat 文本→markdown / lgdl-web-cli 工具调用 / 手动文本命令 / web fetch
```

### TASK-013: M12 收口
> state.json 更新 + v0.7 专项测试补课登记

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-012 |
| **执行波次** | 10 |
| **对应 FR** | AC-010 / EC-009 |

**描述**: ① state.json 更新（本步为 plan 收尾，build 阶段完成后由 validate 收口 phase=validated）；② v0.7 补 F-06/F-11 专项测试（护栏后置补课，ROADMAP.md:147）登记——抽取完成态确认不阻塞 v0.6 发布（EC-009）；③ 排布门禁复核：F-04/F-05 关闭后启动、v0.6 窗口内完成（AC-010）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | .sddu/specs-tree-root/specs-tree-web-cli-extract/state.json（validate 收口） |
| — | ROADMAP.md（v0.7 补课项登记，仅备注） |

**验收标准**:
- [ ] state.json phase 流转至 tasked（本步）→ validated（validate 阶段收口）
- [ ] ROADMAP v0.7 补 F-06/F-11 专项测试项已登记（ROADMAP.md:147 上下文）
- [ ] v0.6 发布未被抽取阻塞（EC-009/AC-010）

**验证命令**:
```bash
cat .sddu/specs-tree-root/specs-tree-web-cli-extract/state.json | grep -E 'phase|status'
```

## 3. 任务汇总
> 任务清单总表 + 数量、复杂度和波次的统计总览

| ID | 任务名称 | 复杂度 | 波次 | 前置依赖 | 对应 FR/AC | 工作量（人日） |
|----|---------|:--:|:--:|---------|-----------|:--:|
| TASK-001 | M0 前置门禁与基线快照 | S | 1 | 无 | C-007/AC-010/NFR-001 | 0.25 |
| TASK-002 | M1 新包骨架 + CI 构建补齐 | M | 2 | TASK-001 | FR-001/FR-011/AC-001/AC-008 | 0.5 |
| TASK-003 | M2 迁底座① commands 注册表 | L | 3 | TASK-002 | FR-002/AC-002/ADR-004 | 0.75 |
| TASK-004 | M3 迁底座② operations 操作协议 | M | 3 | TASK-002 | FR-003/AC-002/ADR-005 | 0.5 |
| TASK-005 | M4 迁底座③ tools + llm | L | 3 | TASK-002 | FR-004/AC-002/D-011/D-012 | 0.75 |
| TASK-006 | M5 迁底座④ protocol + help | L | 4 | TASK-003 | FR-005/FR-006/R-009/EC-010 | 0.75 |
| TASK-007 | M6 迁底座⑤ exec 执行骨架 | L | 5 | TASK-004, TASK-006 | FR-003/FR-007/ADR-006/EC-004 | 0.75 |
| TASK-008 | M7 组装 LGDL 适配层 | M | 6 | TASK-003~007 | FR-007/AC-002/ADR-003/NFR-004 | 0.5 |
| TASK-009 | M8 切 cli 引用 | M | 7 | TASK-008 | FR-008/AC-003/R-002 | 0.25 |
| TASK-010 | M9 切 web 接线 | M | 7 | TASK-008 | FR-007/AC-003/EC-006 | 0.5 |
| TASK-011 | M10 core 导出面收敛 | S | 8 | TASK-009, TASK-010 | FR-009/AC-004/EC-001/EC-002 | 0.25 |
| TASK-012 | M11 全量回归 + 无残留 + 手测 | M | 9 | TASK-011 | FR-010/AC-005~007/NFR-001/002/005/007 | 1.0 |
| TASK-013 | M12 收口 | S | 10 | TASK-012 | AC-010/EC-009 | 0.25 |

| 统计项 | 数值 |
|--------|:--:|
| 总任务数 | 13 |
| S 级 (简单) | 3 |
| M 级 (中等) | 6 |
| L 级 (复杂) | 4 |
| 执行波次 | 10 |
| 总工作量 | ≈ 6.25 人日（关键路径 ≈ 5.5 人日） |

## 4. 执行策略
> 各波次的执行说明 + 并行窗口标注

| 波次 | 任务 | 策略 |
|:--:|------|------|
| 1 | TASK-001 | 单任务串行（门禁确认，阻断后续） |
| 2 | TASK-002 | 单任务串行（新包骨架为全部底座前置） |
| 3 | TASK-003, TASK-004, TASK-005 | **并行窗口 ①**：底座三件套互不依赖（commands/operations/tools+llm 独立迁入），可在第 2 周窗口并行推进；完成后 3 路合流 |
| 4 | TASK-006 | 单任务串行（protocol/help 依赖 TASK-003 的注册表） |
| 5 | TASK-007 | 单任务串行（exec 依赖 TASK-004 协议 + TASK-006 help） |
| 6 | TASK-008 | 单任务串行（适配组装依赖全部底座五件套） |
| 7 | TASK-009, TASK-010 | **并行窗口 ②**：cli 与 web 引用切换互不依赖，可并行；均在 TASK-008 后 |
| 8 | TASK-011 | 单任务串行（core 收敛 = 零破坏最后一步，依赖 cli+web 全切；与 TASK-009 连续原子落地 EC-001） |
| 9 | TASK-012 | 单任务串行（全量回归门禁，阻断收口） |
| 10 | TASK-013 | 单任务串行（收口） |

**执行要点**：
1. **零破坏顺序红线**：先建骨架（W2）→ 迁底座（W3）→ 迁接线（W4~W6）→ 切引用（W7）→ 收敛（W8）→ 回归（W9）——TASK-011（core 删除导出）必须严格晚于 TASK-009/TASK-010（引用全切），任何一方先行即被 `npm run build` 门禁拦截（EC-001/R-002）；
2. **随迁测试与代码同 commit**（EC-006）：TASK-003~007 每步测试随迁与源码变更同一提交，杜绝残留；
3. **计数守恒分段核验**：W3 后 core 258 中间态 → W5 后新包 82 中间态 → W9 后 388 终态（R-012 口径：总用例数 + 全绿 + 断言逐字节）；
4. **第 2 周窗口（09-07~09-11）并行编排**：并行窗口 ①（W3 三件套）与并行窗口 ②（W7 双切换）分别压缩 1.5 人日与 0.5 人日串行时间，关键路径 10 任务 ≈ 5.5 人日在窗口内可承载（单作者制，超窗按 C-006 剥离顺延）；
5. **F-04 共享接线面**：W7 不触碰 provider.ts 注册组装（:405-420/:504）与 WEB_OP/FETCH 工具（D-011），避免移动 F-04 修复点 W-D1（R-006/EC-005）。

## 修订记录
> 记录本文档的版本变更历史

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：基于 plan M0~M12 迁移序列分解为 13 个原子任务、10 个执行波次、2 个并行窗口；覆盖测试守恒 388 门禁（TASK-012）与收口（TASK-013）；标注关键路径（10 任务 ≈ 5.5 人日）与 FR/AC/ADR 映射 | 2026-08-31 | SDDU Tasks Agent |
