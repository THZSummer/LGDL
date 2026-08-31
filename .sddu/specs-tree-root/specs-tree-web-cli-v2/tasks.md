# 任务分解：specs-tree-web-cli-v2（web-cli V2 抽取与包体系重构）

> **文档定位**: SDDU 任务清单 — 将技术方案分解为可并行执行的原子任务，作为 build 阶段的输入
> **前置依赖**: plan.md（技术方案，M0~M11 + 9 ADR + 测试守恒 422-425）、spec.md（需求规范，25 FR 五组 + 7 NFR + 10 EC + AC-001~010 + D-001~004）
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-08-31
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-08-31
> **更新说明**: 初始创建 — 将 plan 迁移序列 M0~M11 分解为 21 个原子任务（16 波次 / S×3 / M×15 / L×3），关键路径 13 节点；DAG 决策：M6（cli 切换）提前于 M5（base 收敛）保证「每步可构建」；标注 5 个并行窗口

---

## 1. 依赖拓扑总览

> 任务依赖关系和执行顺序。编号即执行顺序（沿关键路径递增）；波次 = 可并行分组。

### 1.1 执行波次图

```
Wave 1  ─ TASK-001 [M] M0 基线门禁与测试基线快照
Wave 2  ─ TASK-002 [M] M1-① 目录 git mv + 6 包 name 身份
Wave 3  ─ TASK-003 [M] M1-② 跨包 import 改源 + 根/tsconfig/predev/CI + lock 重建
Wave 4  ─ TASK-004 [L] M2-① base 机制泛型化（并行窗口 A）
          TASK-005 [M] M2-② llm 去耦 + web 消费方同步
Wave 5  ─ TASK-006 [S] M3-① lgdl-web-cli 包骨架
Wave 6  ─ TASK-007 [M] M3-② commands/operations 迁入 + 23 测试（并行窗口 B）
          TASK-009 [S] M4-② tools.ts 迁入
Wave 7  ─ TASK-008 [M] M4-① protocol/help 迁入 + 30 测试
Wave 8  ─ TASK-010 [M] M4-③ adapters 组装单点 + exec.test 22
Wave 9  ─ TASK-011 [M] M6 cli 消费方切换（提前于 base 收敛，见 §1.3）
Wave 10 ─ TASK-012 [L] M5-① base 纯化收敛
Wave 11 ─ TASK-013 [M] M5-② web-fetch 归位与中性化
Wave 12 ─ TASK-014 [M] M7 web 基础接线（并行窗口 C）
          TASK-015 [M] M8-① op-cli 包骨架 + 源码
Wave 13 ─ TASK-016 [M] M8-② op-cli 测试随迁 + 新增
Wave 14 ─ TASK-017 [L] M9-① App opRegistry 注入 + web/help 清理 + test 重列（并行窗口 D）
          TASK-018 [M] M9-② provider 三工具新源 + 测试收敛
Wave 15 ─ TASK-019 [M] M10-① 全量回归 + 无残留 + 依赖图（并行窗口 E）
          TASK-020 [M] M10-② AI 面板四路径手测
Wave 16 ─ TASK-021 [S] M11 文档面 P2 收口
```

### 1.2 依赖图（DAG）

```
TASK-001 → TASK-002 → TASK-003 ─┬─ TASK-004 → TASK-006 ─┬─ TASK-007 → TASK-008 ─┐
                                 │                       └─ TASK-009 ────────────┤
                                 └─ TASK-005                                     │
                                                                    TASK-010 ◀────┘
                                                                         │
TASK-010 → TASK-011（M6 cli 切换）→ TASK-012（M5a base 收敛）→ TASK-013（M5b web-fetch 归位）→ TASK-014（M7 web 接线）
                                                                                  │
                                  TASK-012 ────────────────→ TASK-015（M8a op-cli）→ TASK-016（M8b op-cli 测试）
                                                                                        │
                                            TASK-016 ─┬─→ TASK-017（M9a App 注入）──┐
                                                      └─→ TASK-018（M9b provider）─┤
                                                                                    ├→ TASK-019（M10a 回归）→ TASK-021（M11 文档）
                                                                                    └→ TASK-020（M10b 手测）
```

**依赖关系表**：

| 任务 | 前置依赖 | 依赖理由 |
|------|---------|---------|
| TASK-002 | TASK-001 | 基线门禁先行（锁定迁移前状态，守恒对比基准） |
| TASK-003 | TASK-002 | 目录与 name 身份先行，import/配置引用后改（ADR-001） |
| TASK-004/005 | TASK-003 | base/web 文件被 M1 的 import 改源触及，串行避免 git 冲突 |
| TASK-006 | TASK-004 | 新包复制时直接使用泛型契约（R11 缓解：M2 先行） |
| TASK-007/009 | TASK-006 | 依赖包骨架（package.json/tsconfig/index） |
| TASK-008 | TASK-007 | help.ts 引用本包 COMMANDS（单一数据源 R-009） |
| TASK-010 | TASK-008, TASK-009 | adapters 组装依赖 commands/operations + protocol（parseBatch 注入） |
| TASK-011 | TASK-010 | cli 切换需 lgdl-web-cli 导出 buildOperation/applyOperation（FR-013） |
| TASK-012 | TASK-011 | **base 删 LGDL 面前 cli 必须已切换**（否则 cli 断引用，违可构建门禁） |
| TASK-013 | TASK-012 | web-fetch 归位与 base 收敛同改 base/tools.ts/help.ts，串行防冲突 |
| TASK-014 | TASK-013 | provider 三工具组装需 base 已导出 web-fetch（改名后） |
| TASK-015 | TASK-012 | R12：op-cli 在 base 收敛后建包，直接消费纯化后导出面 |
| TASK-016 | TASK-015 | 测试依赖源码 |
| TASK-017/018 | TASK-015, TASK-016 | web 接线依赖 op-cli 源码 + 测试已迁入（删 web 侧旧定义/用例防断引） |
| TASK-019/020 | TASK-017, TASK-018 | 全量回归与手测在全部迁移完成后执行 |
| TASK-021 | TASK-019 | 文档收口在回归通过后 |

### 1.3 关键路径

**关键路径（13 节点）**：
```
TASK-001 → TASK-002 → TASK-003 → TASK-004 → TASK-006 → TASK-007 → TASK-008
→ TASK-010 → TASK-011 → TASK-012 → TASK-013 → TASK-014 → TASK-019
（M0 → M1-① → M1-② → M2-① → M3-① → M3-② → M4-① → M4-③ → M6 → M5-① → M5-② → M7 → M10-①）
```
op-cli 支线关键路径等长：`…TASK-012 → TASK-015 → TASK-017 → TASK-019`。

**关键 DAG 决策（相对 plan M 编号顺序的调整）**：
1. **M6（cli 切换）提前至 M5（base 收敛）之前**：base 删 LGDL 面（commands/buildOperation）会立即断 cli 9 命令的 `import '@lgdl/web-cli-base'`（cli/src/commands/*.ts:4）——先切 cli（TASK-011）再收敛 base（TASK-012），保证每步全仓可构建（plan §4.1 门禁约束优先；R2/EC-002 依赖边变更与删除同批防断引）。
2. **M2 拆双轨**：机制泛型化（TASK-004）与 llm 去耦（TASK-005）文件零重叠，并行。
3. **M8/M9 依赖 base 收敛（TASK-012）而非仅依赖泛型化**：op-cli 直接消费纯化后 base 的 HelpArg/HelpEntry（R12），web 接线消费 base web-fetch 导出。

**并行窗口（5 处）**：

| 窗口 | 波次 | 并行任务 | 并行前提 |
|------|:--:|----------|---------|
| A | 4 | TASK-004 ∥ TASK-005 | base exec/operations/protocol 与 llm.ts/web 消费方文件零重叠 |
| B | 6 | TASK-007 ∥ TASK-009 | commands/operations 与 tools.ts 相互独立（均依赖骨架） |
| C | 12 | TASK-014 ∥ TASK-015 | web 接线与 op-cli 建包无文件交集（op-cli 仅依赖 base） |
| D | 14 | TASK-017 ∥ TASK-018 | App.tsx/web-help 与 provider.ts/AiPanel.tsx 文件不重叠 |
| E | 15 | TASK-019 ∥ TASK-020 | 自动化回归与手测独立 |

---

## 2. 任务列表

> 每个任务的详细定义。文件路径标注时点：M1 前为旧目录名，M1 后（TASK-003 起）以 `packages/lgdl-*` 新目录为准。

### TASK-001: M0 前置门禁与测试基线快照
> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | 无 |
| **执行波次** | 1 |
| **对应 FR** | 无（门禁）；支撑 NFR-003 / AC-005 守恒基线 |

**描述**: 迁移启动前锁定基线：① 创建 git 基线 tag/commit（`pre-v2-rename`）；② 全仓运行各包测试，记录基线计数（实测 419 = web-cli-base 82 + web 48 + core 260 + router 8 + render 21；守恒基准 388 = 82+48+260 口径）；③ 将各包测试命令与基线输出记入 notes（作为 M10 守恒对比基准）。不改任何源码。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW（git tag） | 仓库基线 commit/tag（无文件改动） |

**验收标准**:
- [ ] git tag `pre-v2-rename` 存在且指向迁移前最新 commit
- [ ] 5 个含测试包（web-cli-base/web/core/router/render）测试全绿、失败数 = 0
- [ ] 基线计数 419 与分布（82/48/260/8/21）已记录（notes 或基线日志）

**验证命令**:
```bash
git tag -l 'pre-v2-rename'
npm test --workspace @lgdl/web-cli-base --workspace @lgdl/web --workspace @lgdl/core --workspace @lgdl/router --workspace @lgdl/render 2>&1 | tail -40
```

### TASK-002: M1-① 目录 git mv + 6 包 name 身份
> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-001 |
| **执行波次** | 2 |
| **对应 FR** | FR-001（目录与包名重命名，A1/A2） |

**描述**: `git mv packages/{core,layout,render,router,cli,web} packages/lgdl-{core,layout,render,router,cli,web}`（git 保留历史，ADR-001 R-1）；6 包 package.json name `@lgdl/x` → `@lgdl/lgdl-x`（D-001 锁死 scoped 形式，EC-001 不返工）；web-cli-base 目录与 name 不动（C3）。身份先行，暂不改引用。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| RENAME | packages/{core,layout,render,router,cli,web} → packages/lgdl-{core,layout,render,router,cli,web}（6 目录，git mv） |
| MODIFY | packages/lgdl-{core,layout,render,router,cli,web}/package.json（name 字段，共 6 个） |

**验收标准**:
- [ ] `ls packages/` 见 8 目录：6 个 lgdl-* + web-cli-base（2 个新包目录由 TASK-006/015 创建）
- [ ] 6 包 package.json name 均为 `@lgdl/lgdl-*`；web-cli-base name 仍为 `@lgdl/web-cli-base`（FR-001 验收）
- [ ] git 历史保留：`git log --oneline --follow` 可追至旧路径

**验证命令**:
```bash
ls packages/
grep '"name"' packages/lgdl-*/package.json packages/web-cli-base/package.json
git log --oneline --follow packages/lgdl-core/package.json | head -3
```

### TASK-003: M1-② 跨包 import 改源 + 根/tsconfig/predev/CI + lock 重建
> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-002 |
| **执行波次** | 3 |
| **对应 FR** | FR-002（跨包 import，A3）、FR-003（根与构建链，A4~A8） |

**描述**: ① 跨包 import 改源（discovery §2.1 全量表 ~30 处）：layout/render/cli/web/web-cli-base 内 `from '@lgdl/core'` → `'@lgdl/lgdl-core'`、`@lgdl/layout` → `@lgdl/lgdl-layout`、`@lgdl/render` → `@lgdl/lgdl-render`、`@lgdl/router` → `@lgdl/lgdl-router`（`@lgdl/web-cli-base` 不改）；② 根 package.json:20 dependencies `@lgdl/cli` → `@lgdl/lgdl-cli`；③ 根 tsconfig.json:3-7 references 路径改新目录；④ web/package.json predev workspace 名改新；⑤ CI deploy-pages.yml 触发 paths:9-13 与 build:38 workspace 名改新；⑥ `npm install` 重建 package-lock.json（7→9 workspace 条目）与 node_modules/@lgdl 链接（FR-003-A5/EC-007）。**bin `lgdl-cli` 不变（FR-004）**。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | packages/lgdl-layout/src/index.ts:16；packages/lgdl-render/src/{index.ts,ascii.ts,ascii.test.ts,svg.test.ts}；packages/lgdl-cli/src/{shared.ts,option-hints.ts,commands/*.ts}；packages/lgdl-web/src/App.tsx:11-12；packages/web-cli-base/src/*.ts 中 `@lgdl/core` import（~30 处） |
| MODIFY | package.json:20（根 dependencies `@lgdl/cli` → `@lgdl/lgdl-cli`） |
| MODIFY | tsconfig.json:3-7（references 路径） |
| MODIFY | packages/lgdl-web/package.json:29-31（predev workspace 名） |
| MODIFY | .github/workflows/deploy-pages.yml:9-13/:38（paths + build workspace 名） |
| MODIFY | package-lock.json（`npm install` 重建） |

**验收标准**:
- [ ] FR-002 grep 零残留：`grep -rn "from '@lgdl/core'\|from '@lgdl/layout'\|from '@lgdl/render'\|from '@lgdl/router'\|from '@lgdl/cli'\|from '@lgdl/web'"` 在 packages/*/src 无命中（`@lgdl/web-cli-base` 除外）
- [ ] 根 package.json dependencies 为 `@lgdl/lgdl-cli`；tsconfig references / predev / CI grep 无旧 workspace 名
- [ ] `npm install` 后 package-lock.json 含 9 个 workspace 条目；node_modules/@lgdl/ 链接指向新目录（AC-002/EC-007）
- [ ] 全仓 `tsc -b`（或等价 build）零错误退出（AC-008）

**验证命令**:
```bash
grep -rn "from '@lgdl/core'\|from '@lgdl/layout'\|from '@lgdl/render'\|from '@lgdl/router'\|from '@lgdl/cli'\|from '@lgdl/web'" packages/*/src | grep -v web-cli-base || echo "零残留"
npm install
grep -c '"@lgdl/lgdl' package-lock.json && ls node_modules/@lgdl/
npm run build 2>&1 | tail -5
```

### TASK-004: M2-① base 机制泛型化
> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-003 |
| **执行波次** | 4（并行窗口 A，与 TASK-005 并行） |
| **对应 FR** | FR-018（DomainApi<Op,Doc>）、FR-020（createOperationApplier 泛型化）、FR-019 机制面（ExecutorOptions 注入参数/createBatchParser 骨架） |

**描述**: base 机制面泛型化（LGDL 具体面保留待迁）：① `exec.ts` DomainApi → `DomainApi<Op, Doc>`（19 方法签名类型参数化，ParseResult<Doc>/MutationResult<Doc>/OperationBatchResult<Doc> 泛型化，DIAGRAM_TYPES 收窄 readonly string[]，Issue 结构化契约，ADR-003 结构化兼容）；② `ExecutorOptions<Op>` 增加 3 注入参数 `commandPrefix`/`parseBatch`/`describeSubcommand`（默认值 = 无前缀 / 内置 createBatchParser 骨架 / `${sub} ${args}` fallback，ADR-005）+ 保留 handleLine/describeFetchLine；③ `operations.ts` `createOperationApplier<Op, Doc>(dispatch)` 泛型化（分派查表 + 失败即停批量循环，ADR-004）；④ `protocol.ts` 抽取 `createBatchParser<Op>` 泛型骨架（自 parseWebCliBatch 循环）、ParsedCommand/ParsedBatch 泛型化；⑤ base/adapters/lgdl.ts 组装注入 commandPrefix='lgdl-web-cli' 等参数（保持行为逐字节不变，NFR-005）；⑥ 测试适配：protocol.test 27 例中仅留 tokenizeCli 1 例准备、exec.test 机制面断言按泛型签名适配（用例本体随迁 TASK-008/010）。验证 base 测试全绿 + 全仓 build 绿（过渡态：base 仍含 LGDL 面）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | packages/web-cli-base/src/exec.ts（DomainApi<Op,Doc> + ExecutorOptions 注入参数） |
| MODIFY | packages/web-cli-base/src/operations.ts（createOperationApplier 泛型化 + OperationBatchResult<Doc>） |
| MODIFY | packages/web-cli-base/src/protocol.ts（createBatchParser 骨架抽取 + ParsedCommand/ParsedBatch 泛型化） |
| MODIFY | packages/web-cli-base/src/adapters/lgdl.ts（组装注入参数，行为不变） |
| MODIFY | packages/web-cli-base/src/{commands,help}.test.ts / protocol.test.ts / exec.test.ts（断言适配） |

**验收标准**:
- [ ] base 导出 `DomainApi<Op, Doc>`、`createOperationApplier<Op, Doc>`、`createBatchParser<Op>`、`ExecutorOptions<Op>`（含 commandPrefix/parseBatch/describeSubcommand）
- [ ] base 测试全绿（82 例基数不变或按适配微调）；全仓 build 零错误
- [ ] base/adapters/lgdl.ts 注入等价参数后行为与迁移前一致（NFR-005，lgdlExecutor 冒烟）

**验证命令**:
```bash
npm test --workspace @lgdl/web-cli-base 2>&1 | tail -10
npm run build 2>&1 | tail -5
```

### TASK-005: M2-② llm 去耦 + web 消费方同步
> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-003 |
| **执行波次** | 4（并行窗口 A，与 TASK-004 并行） |
| **对应 FR** | FR-021（ChatResult 单列表）、FR-023 部分（EC-004 原子：消费方同步） |

**描述**: llm.ts 三工具分流去耦（D-003）：① ChatResult 收敛为 `{ content, toolCalls: WebCliToolCall[], model }` 单列表（删 toolCalls/opCalls/fetchCalls 三字段 :34-45）；② chat() 删除按工具名过滤（:135-137/:187-189/:194-196）→ 全量透传；③ `grep lgdl` 在 llm.ts 零命中；④ **消费方同步（EC-004 原子）**：web/provider.ts chat 薄包装返回新契约、AiPanel.tsx:395 `[...res.toolCalls, ...res.opCalls, ...res.fetchCalls]` → `res.toolCalls`；⑤ llm.test.ts 6 例 → 5 例（WEB_CLI_TOOL 1 例 :42 移除，用例本体迁至 TASK-009 的 tools.test.ts），断言按新契约调整。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | packages/web-cli-base/src/llm.ts（ChatResult 单列表 + 删过滤） |
| MODIFY | packages/web-cli-base/src/llm.test.ts（6→5 例，断言按新契约） |
| MODIFY | packages/lgdl-web/src/ai/provider.ts（chat 薄包装返回新契约） |
| MODIFY | packages/lgdl-web/src/ai/AiPanel.tsx:395（单列表分发） |

**验收标准**:
- [ ] `grep -rn "lgdl" packages/web-cli-base/src/llm.ts` 零命中（FR-021）
- [ ] ChatResult 仅含 content/toolCalls/model 三字段；llm.test 5 例全绿
- [ ] web provider.test 12 例（chat 相关断言按新契约调整后）+ AiPanel 构建绿（EC-004）

**验证命令**:
```bash
grep -rn "lgdl" packages/web-cli-base/src/llm.ts || echo "零残留"
npm test --workspace @lgdl/web-cli-base 2>&1 | tail -10
npm run build --workspace @lgdl/lgdl-web 2>&1 | tail -5
```

### TASK-006: M3-① lgdl-web-cli 包骨架
> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-004 |
| **执行波次** | 5 |
| **对应 FR** | FR-006（新包骨架，B1） |

**描述**: 新建 packages/lgdl-web-cli：① package.json（name `@lgdl/lgdl-web-cli`，dependencies `@lgdl/web-cli-base` + `@lgdl/lgdl-core`，type:module / main / types / exports 含 `./lgdl` 子路径，build=tsc，test=tsc src/*.test.ts + node --test，web-cli-base 模式）；② tsconfig.json（参考 packages/lgdl-layout 模式）；③ src/index.ts 占位导出面（后续 TASK-007~010 填充）；④ 根 workspace 通配自动纳入，`npm install` 后 lock 补 2 条目（lgdl-web-cli + lgdl-web-op-cli，后者 TASK-015 建）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/lgdl-web-cli/package.json |
| NEW | packages/lgdl-web-cli/tsconfig.json |
| NEW | packages/lgdl-web-cli/src/index.ts（占位） |

**验收标准**:
- [ ] packages/lgdl-web-cli/ 存在，package.json 字段完整（name/deps/exports/scripts）
- [ ] 包级 build 通过；workspace 解析正常（`npm ls @lgdl/lgdl-web-cli` 有输出）

**验证命令**:
```bash
npm run build --workspace @lgdl/lgdl-web-cli 2>&1 | tail -5
```

### TASK-007: M3-② commands/operations 迁入 + 23 测试
> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-006 |
| **执行波次** | 6（并行窗口 B，与 TASK-009 并行） |
| **对应 FR** | FR-007（9 命令注册表，B2）、FR-008（LgdlOperation 协议，B3） |

**描述**: ① `commands.ts`：自 base/commands.ts:14-298 LGDL 面逐字节迁入——COMMANDS 9 命令注册表（:28-92）/KNOWN_PARAMS（:95-100）/requireParams（:103）/assertChangeRequested（:112）/defaultKindFor（:126-130）/buildOperation（:139-236）/parseAttrsSpec（:242）/parseMemberSpec（:266）；import `@lgdl/core` → `@lgdl/lgdl-core`；CommandSpec/KindResolver 类型自 base 导入（机制）；② `operations.ts`：describeOperation（:35-56）/OperationMutations（:59-69）/LgdlOperation re-export（:32）/分派 switch 9 变体（:92-154）改 `lgdlDispatch: Record<string, (doc, op) => MutationResult>` 映射（case 体逐行复制，ADR-004）+ 调 base 泛型工厂 `createOperationApplier<LgdlOperation, LgdlDocument>(lgdlDispatch)`（FR-020）；③ 随迁测试：commands.test 14 例 + operations.test 9 例（import 源更新，断言逐字节）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/lgdl-web-cli/src/commands.ts |
| NEW | packages/lgdl-web-cli/src/operations.ts |
| NEW | packages/lgdl-web-cli/src/commands.test.ts（14 例，自 base 随迁） |
| NEW | packages/lgdl-web-cli/src/operations.test.ts（9 例，自 base 随迁） |
| MODIFY | packages/lgdl-web-cli/src/index.ts（导出 COMMANDS 系/buildOperation/describeOperation/lgdlDispatch） |

**验收标准**:
- [ ] lgdl-web-cli 导出 COMMANDS 9 命令/KNOWN_PARAMS/buildOperation/requireParams/assertChangeRequested/parseAttrsSpec/parseMemberSpec/defaultKindFor + describeOperation/OperationMutations/LgdlOperation re-export/lgdlDispatch
- [ ] commands.test 14 + operations.test 9 例全绿（累计 23 例，lgdl-web-cli 测试通过）
- [ ] 对同一输入 buildOperation 输出 op 与迁移前逐字段一致（FR-007/NFR-002）

**验证命令**:
```bash
npm test --workspace @lgdl/lgdl-web-cli 2>&1 | tail -10
```

### TASK-008: M4-① protocol/help 迁入 + 30 测试
> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-007 |
| **执行波次** | 7 |
| **对应 FR** | FR-010（协议解析，B5）、FR-011（help 示例，B6） |

**描述**: ① `protocol.ts`：自 base/protocol.ts LGDL 路由面迁入——'lgdl-web-cli' 前缀校验（:44-52）/17 子命令枚举 switch（:85-153，逐字节保留含 help 共 20 项口径）/--doc 语义（:70-82）；tokenizeCli/parseArgs 自 base 导入复用（D-004）；parseWebCliBatch 调 base `createBatchParser` 泛型骨架（循环/失败即停/doc 一致性保留）；ParsedCommand/ParsedBatch 自 base 导入并实例化 `ParsedCommand<LgdlOperation>`；② `help.ts`：PARAM_DESC（:34-54）/WEB_CLI_EXTRA（:61-124）/INCR_EXAMPLES（:127-137）/INCR_SUMMARIES（:140-150）/webCliEntryFor/webCliHelpOne/webCliHelp（:152-211）；HelpArg/HelpEntry 自 base 导入（机制）；COMMANDS 引用本包 commands.ts（单一数据源 R-009）；'lgdl-web-cli' 硬编码 17+27 处随迁（业务包内合法）；③ 随迁测试：protocol.test 26 例（parseWebCli* + formatStatus）+ help.test 4 例。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/lgdl-web-cli/src/protocol.ts |
| NEW | packages/lgdl-web-cli/src/help.ts |
| NEW | packages/lgdl-web-cli/src/protocol.test.ts（26 例随迁） |
| NEW | packages/lgdl-web-cli/src/help.test.ts（4 例随迁） |
| MODIFY | packages/lgdl-web-cli/src/index.ts（导出 parseWebCliCommand/Batch + webCliHelp 系列） |

**验收标准**:
- [ ] lgdl-web-cli 导出 parseWebCliCommand/parseWebCliBatch/webCliHelp/webCliHelpOne/webCliEntryFor
- [ ] protocol.test 26 + help.test 4 例全绿（累计 53 例）；解析结果与 help 输出与迁移前逐字节一致（FR-010/FR-011/NFR-002）
- [ ] tokenizeCli/parseArgs 仍在 base 导出（D-004 验收）

**验证命令**:
```bash
npm test --workspace @lgdl/lgdl-web-cli 2>&1 | tail -10
```

### TASK-009: M4-② tools.ts 迁入
> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-006 |
| **执行波次** | 6（并行窗口 B，与 TASK-007 并行） |
| **对应 FR** | FR-009（lgdl-web-cli 工具，B4） |

**描述**: 自 base/tools.ts:12-54 迁入 WEB_CLI_TOOL **全量逐字节**（name `lgdl-web-cli`、20 子命令 enum 含 help 共 20 项——plan §1 核实计数，逐字节保留 NFR-002）；tools.test.ts 承接 TASK-005 移除的 llm.test WEB_CLI_TOOL 1 例（:42，schema 断言）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/lgdl-web-cli/src/tools.ts（逐字节复制） |
| NEW | packages/lgdl-web-cli/src/tools.test.ts（1 例） |
| MODIFY | packages/lgdl-web-cli/src/index.ts（导出 WEB_CLI_TOOL） |

**验收标准**:
- [ ] lgdl-web-cli 导出 WEB_CLI_TOOL；工具 name/description/parameters 与迁移前逐字节一致（FR-009/AC-009）
- [ ] tools.test 1 例全绿

**验证命令**:
```bash
npm test --workspace @lgdl/lgdl-web-cli 2>&1 | tail -10
```

### TASK-010: M4-③ adapters 组装单点 + exec.test 22
> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-008, TASK-009 |
| **执行波次** | 8 |
| **对应 FR** | FR-012（组装单点，B7） |

**描述**: `adapters/lgdl.ts`：自 base/adapters/lgdl.ts:1-104 全量随迁——lgdlKindResolver（:49）/lgdlApplier = createOperationApplier<LgdlOperation, LgdlDocument>(lgdlDispatch)（:56-66 调用形态不变）/lgdlBuildOperation（:69-73）/lgdlDomain 19 符号组装（:76-96）/lgdlExecutor = createExecutor(lgdlDomain, options)（:99，options 注入 commandPrefix='lgdl-web-cli'/parseBatch=本包 parseWebCliBatch/describeSubcommand=describeLgdlSubcommand，ADR-005）/具名导出 executeSubcommand/executeCommands/describeCommandLine（:102-104）；import 源改本包相对路径 + `@lgdl/lgdl-core`；随迁 exec.test 22 例（lgdlExecutor 行为面，间接覆盖 base 机制，plan §1 核实 2）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/lgdl-web-cli/src/adapters/lgdl.ts |
| NEW | packages/lgdl-web-cli/src/exec.test.ts（22 例随迁） |
| MODIFY | packages/lgdl-web-cli/src/index.ts（导出 lgdl* 系列 + ./lgdl 子路径就位） |

**验收标准**:
- [ ] lgdl-web-cli 导出 lgdlKindResolver/lgdlApplier/lgdlBuildOperation/lgdlDomain/lgdlExecutor + executeSubcommand/executeCommands/describeCommandLine
- [ ] exec.test 22 例全绿（lgdl-web-cli 累计 76 例 = 14+9+26+4+1+22）
- [ ] 19 符号组装结果与迁移前一致（FR-012）；`@lgdl/lgdl-web-cli/lgdl` 子路径可解析（FR-013 前置）

**验证命令**:
```bash
npm test --workspace @lgdl/lgdl-web-cli 2>&1 | tail -10
npm run build --workspace @lgdl/lgdl-web-cli 2>&1 | tail -5
```

### TASK-011: M6 cli 消费方切换
> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-010 |
| **执行波次** | 9 |
| **对应 FR** | FR-013（消费方接线，B8/R2/EC-002） |

**描述**: ① 9 个 mutation 命令（packages/lgdl-cli/src/commands/{add,remove,update}-{node,edge,group}.ts，各 :4）import `@lgdl/web-cli-base` → `@lgdl/lgdl-web-cli`（符号名 applyOperation/buildOperation 不变 → 调用点零改动，ADR-003 双面导出价值延续）；② cli/package.json dependencies `@lgdl/web-cli-base` → `@lgdl/lgdl-web-cli`（保留 `@lgdl/lgdl-core`/`@lgdl/lgdl-render`）；③ 冒烟：`lgdl-cli <mutation 命令>` 行为不变。**本任务提前于 TASK-012（base 收敛）执行——防 base 删 LGDL 面后 cli 断引用（见 §1.3 决策 1）**。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | packages/lgdl-cli/src/commands/{add,remove,update}-{node,edge,group}.ts（9 文件 :4 import 源） |
| MODIFY | packages/lgdl-cli/package.json:14（dependencies） |

**验收标准**:
- [ ] 9 个 cli 命令文件 import 源均为 `@lgdl/lgdl-web-cli`（FR-013/AC-007）
- [ ] cli 包 tsc 构建通过；`lgdl-cli <mutation 命令>` 冒烟行为不变
- [ ] bin `lgdl-cli` 保持不变（FR-004/AC-007）

**验证命令**:
```bash
grep -l "lgdl-web-cli" packages/lgdl-cli/src/commands/*.ts | wc -l   # 预期 9
npm run build --workspace @lgdl/lgdl-cli 2>&1 | tail -5
```

### TASK-012: M5-① base 纯化收敛
> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-011 |
| **执行波次** | 10 |
| **对应 FR** | FR-018（去 lgdl-core + 泛型契约）、FR-019（注册表机制保留 + 硬编码清零）、FR-020（createOperationApplier 泛型回留） |

**描述**: base 原子收敛点（plan §4.1 约束）：① **删 LGDL 面**：commands.ts 删 COMMANDS/KNOWN_PARAMS/buildOperation/requireParams/assertChangeRequested/parseAttrsSpec/parseMemberSpec（留 CommandSpec:17-26/requireParams 机制壳/KindResolver:124）、operations.ts 删 describeOperation/OperationMutations/LgdlOperation/分派（留泛型 createOperationApplier + OperationBatchResult<Doc>）、protocol.ts 删路由面（留 tokenizeCli/parseArgs/createBatchParser 泛型骨架）、help.ts 删 LGDL 文案面（留 HelpArg/HelpEntry 机制类型）、tools.ts 删 WEB_CLI_TOOL、index.ts 收敛导出面（删 LgdlOperation re-export + lgdl 适配单例 + applyOperation/applyOperations 具名 + `./lgdl` exports）、DELETE adapters/lgdl.ts；② **去依赖**：base/package.json 移除 `@lgdl/core`（deps 仅 @anthropic-ai/sdk + openai）；③ **硬编码清零**：exec 21 处 'lgdl-web-cli' 参数化收口（:376 前缀判断 → commandPrefix、:352-365 描述 → describeSubcommand、:146 错误文案 → 模板化 `${commandPrefix} status`，其余管线保留，ADR-005）；④ **base 测试收敛**：删 commands/operations/exec/help.test.ts（4 文件已随迁）、protocol.test 留 tokenizeCli 1 例、llm.test 5 例；清理 dist-test 残留（`rm -rf dist-test` 后重建，§4.2 执行要点 3）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | packages/web-cli-base/src/{commands,operations,protocol,help,tools,index}.ts（删 LGDL 面/收敛导出） |
| DELETE | packages/web-cli-base/src/adapters/lgdl.ts |
| MODIFY | packages/web-cli-base/package.json（移除 @lgdl/core；exports 删 ./lgdl） |
| MODIFY | packages/web-cli-base/src/exec.ts（硬编码参数化收口） |
| DELETE | packages/web-cli-base/src/{commands,operations,exec,help}.test.ts（已随迁） |
| MODIFY | packages/web-cli-base/src/{protocol,llm}.test.ts（protocol 留 1 例 / llm 5 例） |

**验收标准**:
- [ ] base/package.json 无任何 `@lgdl/*` dependencies（FR-018/AC-003）
- [ ] `grep -rn "@lgdl/" packages/web-cli-base/src packages/web-cli-base/package.json` 零命中（FR-018）
- [ ] `grep -rn "lgdl-web-cli\|lgdl-web-op-cli\|lgdl-web-fetch" packages/web-cli-base/src` 零命中（FR-019，web-fetch 中性名例外待 TASK-013 迁入）
- [ ] base 导出面收敛：机制符号完整（CommandSpec/KindResolver/tokenizeCli/parseArgs/createBatchParser/createOperationApplier/createExecutor/DomainApi<Op,Doc>/ExecutorOptions/ParsedCommand/ParsedBatch/HelpArg/HelpEntry/llm 全套），无具体命令注册表残留（FR-019）
- [ ] base 测试绿：protocol.test 1 + llm.test 5 = 6 例；`npm run build` 全仓零错误（cli 已切换故不红）

**验证命令**:
```bash
grep -rn "@lgdl/" packages/web-cli-base/src packages/web-cli-base/package.json || echo "零残留"
grep -rn "lgdl-web-cli\|lgdl-web-op-cli\|lgdl-web-fetch" packages/web-cli-base/src || echo "零残留"
npm test --workspace @lgdl/web-cli-base 2>&1 | tail -10
npm run build 2>&1 | tail -5
```

### TASK-013: M5-② web-fetch 归位与中性化
> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-012 |
| **执行波次** | 11 |
| **对应 FR** | FR-022（web-fetch 归位，C5/ADR-007，唯一命名例外） |

**描述**: 自 web 迁 base + 中性化改名（`lgdl-web-fetch` → `web-fetch`）：① base 迁入 WEB_FETCH_TOOL（自 provider.ts:261-289，name 改 web-fetch :271）→ base/tools.ts 新增导出；parseWebFetchCommand/executeWebFetch（自 web-fetch.ts:19-44/:54-79，前缀校验 :24/:27 改 web-fetch）→ base/web-fetch.ts 新文件；webFetchHelp（自 help.ts:126-137）→ base/help.ts 新增导出；② **web 侧同步删除与改名联动**：删 web/src/ai/web-fetch.ts；web/help.ts 删 webFetchHelp 面（webOpHelp 面留待 TASK-017）；lgdl-web.ts:17/:32 前缀判断、AiPanel.tsx:154/:431、prompts.ts:20/:27-28/:43 的 `lgdl-web-fetch` → `web-fetch`；③ 测试随迁：web-fetch.test 6 例（前缀断言改名调整）+ provider.test WEB_FETCH_TOOL 1 例（:197）+ help.test webFetchHelp 1 例（:27）→ base web-fetch.test.ts（合计 8 例，断言改名后全绿）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/web-cli-base/src/web-fetch.ts（parseWebFetchCommand/executeWebFetch，改名 web-fetch） |
| MODIFY | packages/web-cli-base/src/tools.ts（新增 WEB_FETCH_TOOL，name web-fetch） |
| MODIFY | packages/web-cli-base/src/help.ts（新增 webFetchHelp） |
| NEW | packages/web-cli-base/src/web-fetch.test.ts（8 例：6 随迁 + provider 1 + help 1） |
| DELETE | packages/lgdl-web/src/ai/web-fetch.ts |
| MODIFY | packages/lgdl-web/src/ai/{lgdl-web.ts, AiPanel.tsx, prompts.ts}（前缀改名联动） |
| MODIFY | packages/lgdl-web/src/ai/help.test.ts（删 webFetchHelp 1 例，剩 3 例待 TASK-016 迁） |
| MODIFY | packages/lgdl-web/src/ai/provider.test.ts（删 WEB_FETCH_TOOL 1 例，剩 13 例） |

**验收标准**:
- [ ] base 导出 web-fetch 全套（WEB_FETCH_TOOL 工具名 web-fetch/parseWebFetchCommand/executeWebFetch/webFetchHelp）（FR-022/AC-004）
- [ ] `grep -rn "lgdl-web-fetch"` 全仓（packages/src + 配置）零残留（FR-022 验收）
- [ ] base web-fetch.test 8 例全绿（base 累计 14 例 = protocol 1 + llm 5 + web-fetch 8）；web 剩余测试绿

**验证命令**:
```bash
grep -rn "lgdl-web-fetch" packages/ --include="*.ts" --include="*.tsx" --include="*.json" | grep -v node_modules || echo "零残留"
npm test --workspace @lgdl/web-cli-base 2>&1 | tail -10
```

### TASK-014: M7 web 基础接线
> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-013 |
| **执行波次** | 12（并行窗口 C，与 TASK-015 并行） |
| **对应 FR** | FR-023（三工具分发接线，C6） |

**描述**: ① AiPanel.tsx:5 import `@lgdl/web-cli-base/lgdl` → `@lgdl/lgdl-web-cli/lgdl`（executeSubcommand）；:7 WebCliToolCall 类型 import 源随 provider 调整；② lgdl-web.ts:10-11 import 拆分——lgdlDomain 自 `@lgdl/lgdl-web-cli`、createExecutor/LineHandleResult 自 `@lgdl/web-cli-base`；lgdlExecutor 组装注入 handleLine: handleFetchLine/describeFetchLine（web 侧 fetch 处理器注入，ADR-007 延续）；③ provider.ts chat() 三工具组装（:328-357）引用新源——WEB_CLI_TOOL 自 lgdl-web-cli / WEB_FETCH_TOOL 自 base（改名 web-fetch）/ WEB_OP_TOOL **暂留 web 定义**（TASK-018 再切）；Claude 3 工具 + OpenAI 2 工具 W-D1 现场保留（:326，NG-005 不修复）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | packages/lgdl-web/src/ai/AiPanel.tsx:5/:7（import 源） |
| MODIFY | packages/lgdl-web/src/ai/lgdl-web.ts:10-11（import 拆分 + 组装注入参数） |
| MODIFY | packages/lgdl-web/src/ai/provider.ts（三工具组装引用新源，WEB_OP_TOOL 暂留） |

**验收标准**:
- [ ] web 构建通过；provider.test 12 例（chat 三工具组装面）绿；AiPanel 分发逻辑不变（FR-023）
- [ ] 三工具注册完整：Claude 3 工具 / OpenAI 2 工具路径与现状一致（W-D1 现场保留不变）
- [ ] `@lgdl/lgdl-web-cli/lgdl` 子路径可被 web 解析（FR-013/AC-007）

**验证命令**:
```bash
npm run build --workspace @lgdl/lgdl-web 2>&1 | tail -5
npm test --workspace @lgdl/lgdl-web 2>&1 | tail -10
```

### TASK-015: M8-① op-cli 包骨架 + 源码
> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-012 |
| **执行波次** | 12（并行窗口 C，与 TASK-014 并行） |
| **对应 FR** | FR-014（包骨架 + 工具/元数据，C1）、FR-015（next-actions，C2）、FR-016（协议单一数据源 + handler 注册表，C3）、FR-017（范围界定，C4/R9） |

**描述**: 新建 packages/lgdl-web-op-cli（依赖 `@lgdl/web-cli-base` 仅类型，零 React/DOM，NFR-004）：① package.json（name `@lgdl/lgdl-web-op-cli`，type:module/main/types/exports，build=tsc，test=tsc + node --test）+ tsconfig + index.ts 导出面；② ops.ts——`OP_COMMANDS` 16 条元数据注册表（自 web/help.ts WEB_OP_ENTRIES:27-89 逐字节，含 export 别名 :34-39）+ `OP_SUBCOMMANDS = Object.keys(OP_COMMANDS)`（单一数据源，ADR-008，FR-016 双份并存收敛）；③ tool.ts——WEB_OP_TOOL（自 provider.ts:205-255 全量逐字节，name/description 保留，parameters.enum 由 OP_SUBCOMMANDS 生成保序 → schema 逐字节不变，R13 兜底）；④ help.ts——webOpHelpOne/webOpHelp（自 web/help.ts:91-123 逐字节），HelpArg/HelpEntry 自 base 导入（FR-014 统一重复定义）；⑤ next-actions.ts——NextAction/parseNextActions（自 next-actions.ts:12-35 全量）；⑥ handlers.ts——**handler 注入面（ADR-006）**：`OpExecResult`/`OpHandler`/`OpHandlerRegistry`（register/has/execute，未注册子命令返回 `✖ 未知操作 "x"` 与 App.tsx:1053 现状文案一致）+ createOpHandlerRegistry；**不新增文本解析器（FR-017/NG-004，R9）**。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/lgdl-web-op-cli/{package.json, tsconfig.json} |
| NEW | packages/lgdl-web-op-cli/src/{index.ts, ops.ts, tool.ts, help.ts, next-actions.ts, handlers.ts} |

**验收标准**:
- [ ] lgdl-web-op-cli 导出 WEB_OP_TOOL/webOpHelpOne/webOpHelp/NextAction/parseNextActions/OpHandlerRegistry/OpHandler/OpExecResult/createOpHandlerRegistry
- [ ] WEB_OP_TOOL name/description/parameters 与迁移前逐字节一致（16 子命令 enum 不变，FR-014/AC-009）；OP_COMMANDS 与 WEB_OP_TOOL 单一数据源闭环（FR-016）
- [ ] `grep -rn "react\|dom\|localStorage"` 于 packages/lgdl-web-op-cli/src 零命中（FR-016/NFR-004/AC-006）；包内无文本行解析模块（FR-017）
- [ ] 包级 build 通过；`npm install` 后 lock 含 9 个 workspace 条目（AC-001）

**验证命令**:
```bash
grep -rniE "react|document\.|localStorage" packages/lgdl-web-op-cli/src || echo "零 React/DOM 引用"
npm run build --workspace @lgdl/lgdl-web-op-cli 2>&1 | tail -5
```

### TASK-016: M8-② op-cli 测试随迁 + 新增
> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-015 |
| **执行波次** | 13 |
| **对应 FR** | FR-014（webOpHelp 面）、FR-015（next-actions）、FR-016（handlers 注册表） |

**描述**: 随迁 + 新增测试：① tool.test.ts——WEB_OP_TOOL schema 断言 1 例（自 provider.test.ts:190 随迁，断言与迁移前 JSON 逐字节 diff 抽样，R13/AC-009）；② ops.test.ts——webOpHelp 面 3 例（自 web/ai/help.test.ts:5/:13/:20 随迁）；③ next-actions.test.ts——4 例随迁；④ handlers.test.ts——**新增 2-3 例**（注册表 register/execute 正常分支 + 未注册子命令 → `✖ 未知操作` 错误分支，接线测试非业务功能，NFR-001 允许）；web 侧对应用例删除（provider.test 剩 12 例、help.test 清空待 TASK-017 删文件）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/lgdl-web-op-cli/src/{tool,ops,next-actions,handlers}.test.ts（1+3+4+2~3 = 10~11 例） |
| MODIFY | packages/lgdl-web/src/ai/provider.test.ts（删 WEB_OP_TOOL 1 例，剩 12 例） |
| MODIFY | packages/lgdl-web/src/ai/help.test.ts（删 webOpHelp 3 例，清空待删文件） |

**验收标准**:
- [ ] op-cli 测试 10~11 例全绿（tool 1 + ops 3 + next-actions 4 + handlers 2~3）
- [ ] handlers.test 覆盖未注册分支（`✖ 未知操作` 文案与 App.tsx:1053 现状一致）
- [ ] WEB_OP_TOOL schema 与迁移前 JSON 逐字节一致（R13 验收）

**验证命令**:
```bash
npm test --workspace @lgdl/lgdl-web-op-cli 2>&1 | tail -10
```

### TASK-017: M9-① App opRegistry 注入 + web/help 清理 + test 重列
> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-015, TASK-016 |
| **执行波次** | 14（并行窗口 D，与 TASK-018 并行） |
| **对应 FR** | FR-024（op 执行 handler 注入，C6/ADR-006）、FR-025（测试脚本重列，R5/EC-005） |

**描述**: ① **App.tsx handleWebOp :943-1055 → opRegistry 注入**：16 分支（clipboard :946 / setAiCollapsed :952-961 / downloadSvg·downloadPng :963-967 / preview zoom·pan·reset :979-1001 / jumpToIssue :1006 / .lgdl-hovered DOM :1013-1021 / EXAMPLES·selectExample :1024-1038 / webOpHelp :1050）逐分支复制为注册回调（useMemo 组装，依赖 source/downloadSvg/downloadPng/jumpToIssue/selectExample/applyAiSource）；`:1050` webOpHelp import 源 → `@lgdl/lgdl-web-op-cli`；未知操作文案由 registry.execute 未注册分支复现（NFR-002）；暴露 onWebOp = (sub, args) => opRegistry.execute(sub, args)；② web/help.ts 删除迁出面（webOpHelp 面 + HelpArg/HelpEntry 重复定义 :9-24）；DELETE web/help.test.ts（已迁空）；③ **web/package.json:11 test 脚本文件列表重列**（FR-025/EC-005）：删 web-fetch.test/next-actions.test/help.test，留 provider.test/lgdl-web.test/locate.test/snap.test；predev:12 workspace 名沿用 TASK-003 已改新名。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | packages/lgdl-web/src/App.tsx（handleWebOp → opRegistry 16 handler 注入） |
| MODIFY | packages/lgdl-web/src/ai/help.ts（删 webOpHelp 面 + HelpArg/HelpEntry 重复定义） |
| DELETE | packages/lgdl-web/src/ai/help.test.ts |
| MODIFY | packages/lgdl-web/package.json:11（test 脚本文件列表重列） |
| MODIFY | packages/lgdl-web/src/ai/AiPanel.tsx:414-428（next-actions 判别维持 + onWebOp 转发 registry） |

**验收标准**:
- [ ] op 16 分支行为与迁移前一致（downloadSvg/Png、clipboard、preview zoom/pan/reset、jumpToIssue、EXAMPLES 切换）（FR-024/AC-009）
- [ ] `grep -rn "webOpHelp\|WEB_OP_ENTRIES" packages/lgdl-web/src` 仅 App 引用新包源，无定义残留（AC-004）
- [ ] web test 脚本覆盖迁移后实际文件集合（无指向已迁移文件的旧路径）（FR-025/EC-005）；web 构建 + 全部测试绿（32 例 = provider 12 + lgdl-web 2 + locate 10 + snap 8）

**验证命令**:
```bash
grep -rn "WEB_OP_ENTRIES\|webOpHelp" packages/lgdl-web/src || echo "无残留定义"
cat packages/lgdl-web/package.json | grep -A5 '"test"'
npm run build --workspace @lgdl/lgdl-web 2>&1 | tail -5
npm test --workspace @lgdl/lgdl-web 2>&1 | tail -10
```

### TASK-018: M9-② provider 三工具新源 + 测试收敛
> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-015, TASK-016 |
| **执行波次** | 14（并行窗口 D，与 TASK-017 并行） |
| **对应 FR** | FR-023（三工具分发接线收尾，C6） |

**描述**: ① provider.ts 删 WEB_OP_TOOL 定义（:205-255）→ `import { WEB_OP_TOOL } from '@lgdl/lgdl-web-op-cli'`；WEB_FETCH_TOOL 引用已自 base（TASK-014 就位）；chat() 三工具组装全部新源（WEB_CLI_TOOL 自 lgdl-web-cli / WEB_OP_TOOL 自 op-cli / WEB_FETCH_TOOL 自 base）；② provider.test 已删 2 例（TASK-013/016 分批），剩 12 例全绿；③ AiPanel 分发三分支（tc.name 判别 lgdl-web-cli/lgdl-web-op-cli/web-fetch，:414-443）import 源更新 + 行为维持；④ 断言按 FR-021 单列表契约最终核验（无 opCalls/fetchCalls 残留引用）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | packages/lgdl-web/src/ai/provider.ts（删 WEB_OP_TOOL 定义 + 三工具新源组装） |
| MODIFY | packages/lgdl-web/src/ai/AiPanel.tsx（分发 import 源更新） |
| MODIFY | packages/lgdl-web/src/ai/provider.test.ts（12 例断言最终核验） |

**验收标准**:
- [ ] web 包无三工具定义残留（仅组装/分发引用，AC-004）：`grep -rn "WEB_CLI_TOOL\|WEB_OP_TOOL\|WEB_FETCH_TOOL" packages/lgdl-web/src` 仅出现 import/引用位置
- [ ] provider.test 12 例全绿；三工具分发行为与迁移前一致（FR-023/AC-009）
- [ ] 全仓 grep `opCalls\|fetchCalls`（ChatResult 旧三字段）零命中（FR-021 消费方收口）

**验证命令**:
```bash
grep -rn "WEB_OP_TOOL" packages/lgdl-web/src/ai/provider.ts | head -3
grep -rn "opCalls\|fetchCalls" packages/ --include="*.ts" --include="*.tsx" | grep -v node_modules || echo "旧三字段零残留"
npm test --workspace @lgdl/lgdl-web 2>&1 | tail -10
```

### TASK-019: M10-① 全量回归 + 无残留 + 依赖图核验
> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-017, TASK-018 |
| **执行波次** | 15（并行窗口 E，与 TASK-020 并行） |
| **对应 FR** | M10 门禁：NFR-003（守恒 ≥388）/NFR-004（依赖方向）/AC-002~AC-009/EC-001~EC-010 兜底 |

**描述**: ① **测试守恒计数**：全仓测试（lgdl-web-cli 76 + op-cli 10~11 + base 14 + web 32 + lgdl-core 260 + lgdl-router 8 + lgdl-render 21 = 421~422，≥388 基线，断言逐字节，新增仅接线测试）；② **无残留 grep**：FR-002/AC-002 旧包名零残留、AC-003 base 零残留、FR-019/FR-021/FR-022 硬编码零残留、EC-010 无指向已迁移路径的 import；③ **依赖图核验（AC-006/EC-002）**：各包 package.json 声明核对——base 零 @lgdl/*、lgdl-web-cli → base+lgdl-core、lgdl-web-op-cli → base（仅类型）、cli → lgdl-web-cli+lgdl-core+lgdl-render、web → 六包，无环无 base→lgdl 反向边；④ node_modules/@lgdl 链接与源码引用一致（EC-007）；CI 文件 workspace 名核验（AC-008）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| 验证 | 全仓（只读验证，不改源码） |

**验收标准**:
- [ ] 全仓测试计数 ≥ 388（预期 421~422）、失败数 = 0（AC-005/NFR-003）
- [ ] FR-002/AC-002/AC-003 grep 零残留逐条通过；EC-010 无残留
- [ ] 依赖图核验通过：9 包声明符合 ADR-002，无循环依赖（AC-006/NFR-004）
- [ ] node_modules/@lgdl 链接与 CI 文件核验通过（EC-007/AC-008）

**验证命令**:
```bash
# 各包测试（web-cli-base / lgdl-web-cli / lgdl-web-op-cli / lgdl-web / lgdl-core / lgdl-router / lgdl-render）
npm test --workspace @lgdl/web-cli-base --workspace @lgdl/lgdl-web-cli --workspace @lgdl/lgdl-web-op-cli --workspace @lgdl/lgdl-web --workspace @lgdl/lgdl-core --workspace @lgdl/lgdl-router --workspace @lgdl/lgdl-render 2>&1 | grep -E "pass|fail" | tail -20
grep -rn "@lgdl/core\b\|@lgdl/layout\b\|@lgdl/render\b\|@lgdl/router\b\|@lgdl/cli\b\|@lgdl/web\b" packages/*/src --include="*.ts" --include="*.tsx" | grep -v "lgdl-" || echo "AC-002 零残留"
grep -rn "@lgdl/" packages/web-cli-base/src packages/web-cli-base/package.json || echo "AC-003 零残留"
```

### TASK-020: M10-② AI 面板四路径手测
> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-017, TASK-018 |
| **执行波次** | 15（并行窗口 E，与 TASK-019 并行） |
| **对应 FR** | AC-009（行为逐字节一致抽样）、US-004（AI 实战链路四路径） |

**描述**: AI 面板四路径手测并记录清单（plan §4.1 M10）：① chat 文本回复（provider chat 薄包装新契约链路）；② lgdl-web-cli 工具调用（命令执行输出与迁移前一致，executeSubcommand 经新包 /lgdl 子路径）；③ lgdl-web-op-cli UI 操作（16 分支抽样：copy-source/preview-zoom/export-svg/jumpToIssue/switch-example 等，经 App opRegistry 注入）；④ web-fetch（改名后工具调用）。手测清单（路径/操作/预期/结果）记入 notes，供 validate 阶段复核。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| 手测 | web workbench AI 面板（dev server 运行，无源码改动） |

**验收标准**:
- [ ] 四路径手测全部通过（chat 文本 / lgdl-web-cli 命令 / lgdl-web-op-cli UI 操作 / web-fetch），行为与迁移前一致（AC-009 抽样）
- [ ] 手测清单（含操作步骤与结果）已记录

**验证命令**:
```bash
npm run dev --workspace @lgdl/lgdl-web   # 手测环境，按清单逐路径验证并记录
```

### TASK-021: M11 文档面 P2 收口
> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-019 |
| **执行波次** | 16 |
| **对应 FR** | FR-005（文档面同步，A9）、AC-010（文档 grep） |

**描述**: ① README.md:45-52、docs/cli-guide.md:7-10 的 `@lgdl/cli` 引用改 `@lgdl/lgdl-cli`（新包名）；② docs/research/edge-routing/* 文件头加注「历史文档，包名已更名为 @lgdl/lgdl-router」（NG-006 二选一：plan 取加注，成本最低保留历史引用完整性）；③ 全仓非 research 文档 grep 无旧包名残留（EC-008 不阻塞构建，P2）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | README.md:45-52（@lgdl/cli → @lgdl/lgdl-cli） |
| MODIFY | docs/cli-guide.md:7-10（同上） |
| MODIFY | docs/research/edge-routing/*（文件头加注） |

**验收标准**:
- [ ] 非 research 文档 grep 无 `@lgdl/cli`（旧名）残留（AC-010）
- [ ] research 文档已按「加注」方案落地（FR-005 二选一）

**验证命令**:
```bash
grep -rn "@lgdl/cli\b\|@lgdl/router\b" README.md docs/ | grep -v "lgdl-cli\|lgdl-router" || echo "文档零残留"
grep -l "历史文档，包名已更名为" docs/research/edge-routing/*.md | wc -l
```

---

## 3. 任务汇总

### 3.1 统计总览

| 统计项 | 数值 |
|--------|:--:|
| 总任务数 | 21 |
| S 级 (简单) | 3（TASK-006/009/021） |
| M 级 (中等) | 15 |
| L 级 (复杂) | 3（TASK-004/012/017） |
| 执行波次 | 16 |
| 并行窗口 | 5（A~E，见 §1.3） |
| 关键路径 | 13 节点（§1.3） |
| 估算工作量 | ≈ 7.7 人日（plan §4.3） |

### 3.2 任务清单表（含一句话摘要）

| ID | 名称 | 步 | 复杂度 | 波次 | 依赖 | 一句话摘要 |
|----|------|:--:|:--:|:--:|------|-----------|
| TASK-001 | M0 基线门禁 | M0 | M | 1 | 无 | git 基线 tag + 全仓测试基线快照（419 例记录） |
| TASK-002 | M1-① 目录/name 身份 | M1 | M | 2 | 001 | git mv 6 目录 + 6 包 name 改 @lgdl/lgdl-*（D-001） |
| TASK-003 | M1-② import/配置/lock | M1 | M | 3 | 002 | ~30 处跨包 import + 根/tsconfig/predev/CI + lock 重建 9 条目 |
| TASK-004 | M2-① base 机制泛型化 | M2 | L | 4 | 003 | DomainApi<Op,Doc> + createOperationApplier 泛型 + createBatchParser/ExecutorOptions 注入参数 |
| TASK-005 | M2-② llm 去耦 | M2 | M | 4 | 003 | ChatResult 单列表 + chat 删过滤 + provider/AiPanel 消费方同步（EC-004） |
| TASK-006 | M3-① 包骨架 | M3 | S | 5 | 004 | lgdl-web-cli package.json/tsconfig/index 占位 |
| TASK-007 | M3-② commands/operations | M3 | M | 6 | 006 | 9 命令注册表 + LgdlOperation 协议/lgdlDispatch 迁入 + 23 测试 |
| TASK-008 | M4-① protocol/help | M4 | M | 7 | 007 | 前缀校验/17 子命令 + webCliHelp 迁入 + 30 测试 |
| TASK-009 | M4-② tools | M4 | S | 6 | 006 | WEB_CLI_TOOL 逐字节迁入 + 1 测试 |
| TASK-010 | M4-③ adapters | M4 | M | 8 | 008, 009 | lgdlDomain 19 符号组装单点 + lgdlExecutor 注入参数 + 22 测试 |
| TASK-011 | M6 cli 切换 | M6 | M | 9 | 010 | 9 命令 import → lgdl-web-cli + deps + 冒烟（提前于 base 收敛） |
| TASK-012 | M5-① base 收敛 | M5 | L | 10 | 011 | 删 LGDL 面 + 去 @lgdl/core + 硬编码参数化清零 + 测试收敛 |
| TASK-013 | M5-② web-fetch 归位 | M5 | M | 11 | 012 | WEB_FETCH_TOOL/解析/执行/help 迁 base 改名 web-fetch + web 联动 |
| TASK-014 | M7 web 基础接线 | M7 | M | 12 | 013 | AiPanel/lgdl-web/provider import 新源 + 三工具组装 + fetch 处理器注入 |
| TASK-015 | M8-① op-cli 源码 | M8 | M | 12 | 012 | OP_COMMANDS 单一数据源 + WEB_OP_TOOL + webOpHelp + next-actions + OpHandlerRegistry |
| TASK-016 | M8-② op-cli 测试 | M8 | M | 13 | 015 | 随迁 8 例 + 新增 handlers 2-3 例（10-11 例） |
| TASK-017 | M9-① App 注入 | M9 | L | 14 | 015, 016 | handleWebOp 16 分支 → opRegistry 注入 + web/help 清理 + test 重列 |
| TASK-018 | M9-② provider 收尾 | M9 | M | 14 | 015, 016 | 删 WEB_OP_TOOL 定义 → import op-cli + 三工具新源最终核验 |
| TASK-019 | M10-① 全量回归 | M10 | M | 15 | 017, 018 | 守恒 ≥388 + 无残留 grep + 依赖图核验（AC-002~009） |
| TASK-020 | M10-② 四路径手测 | M10 | M | 15 | 017, 018 | AI 面板 chat/命令/UI 操作/fetch 四路径手测清单 |
| TASK-021 | M11 文档收口 | M11 | S | 16 | 019 | README/cli-guide 新名 + research 加注（FR-005 P2） |

### 3.3 FR/AC 覆盖矩阵

| FR | 覆盖任务 | AC | 覆盖任务 |
|----|---------|----|---------|
| FR-001~003 | TASK-002, TASK-003 | AC-001 | TASK-002, TASK-015（9 包就位） |
| FR-004 | TASK-003, TASK-011 | AC-002 | TASK-003, TASK-019 |
| FR-005 | TASK-021 | AC-003 | TASK-012 |
| FR-006~008 | TASK-006, TASK-007 | AC-004 | TASK-009, TASK-013, TASK-015, TASK-018 |
| FR-009~012 | TASK-008, TASK-009, TASK-010 | AC-005 | TASK-019 |
| FR-013 | TASK-011, TASK-014 | AC-006 | TASK-015, TASK-019 |
| FR-014~017 | TASK-015, TASK-016 | AC-007 | TASK-011, TASK-014, TASK-018 |
| FR-018~020 | TASK-004, TASK-012 | AC-008 | TASK-003, TASK-019 |
| FR-021 | TASK-005, TASK-018 | AC-009 | TASK-008, TASK-009, TASK-015, TASK-017, TASK-020 |
| FR-022 | TASK-013 | AC-010 | TASK-021 |
| FR-023 | TASK-005, TASK-014, TASK-018 | | |
| FR-024 | TASK-017 | | |
| FR-025 | TASK-017, TASK-019 | | |

---

## 4. 执行策略

### 4.1 波次执行说明

| 波次 | 任务 | 策略 |
|:--:|------|------|
| 1 | TASK-001 | 基线门禁，单点执行 |
| 2 | TASK-002 | 单点执行（git mv + name，原子批） |
| 3 | TASK-003 | 单点执行（import/配置/lock 整批原子，FR-003 批内不可分割，EC-006） |
| 4 | TASK-004, TASK-005 | **并行**（窗口 A：机制泛型化 ∥ llm 去耦，文件零重叠） |
| 5 | TASK-006 | 单点执行（新包骨架） |
| 6 | TASK-007, TASK-009 | **并行**（窗口 B：commands/operations ∥ tools） |
| 7 | TASK-008 | 单点执行（protocol/help，依赖 commands） |
| 8 | TASK-010 | 单点执行（adapters 组装，依赖 protocol+tools） |
| 9 | TASK-011 | 单点执行（cli 切换，**提前于 base 收敛**） |
| 10 | TASK-012 | 单点执行（base 原子收敛点，删面/去依赖/硬编码清零同批） |
| 11 | TASK-013 | 单点执行（web-fetch 归位，与 base 收敛串行防同文件冲突） |
| 12 | TASK-014, TASK-015 | **并行**（窗口 C：web 接线 ∥ op-cli 建包） |
| 13 | TASK-016 | 单点执行（op-cli 测试随迁 + 新增） |
| 14 | TASK-017, TASK-018 | **并行**（窗口 D：App 注入 ∥ provider 收尾） |
| 15 | TASK-019, TASK-020 | **并行**（窗口 E：自动化回归 ∥ 手测） |
| 16 | TASK-021 | 单点执行（文档 P2 收口，不阻塞构建） |

### 4.2 门禁规则

1. **每步可构建**：每个任务完成即运行相关包测试 + 全仓 build 门禁（plan §4.1 约束）；TASK-012（base 收敛）后 cli 必须已切换（TASK-011）——本 DAG 已按此排序；
2. **随迁测试与代码同 commit**（EC-010）：测试文件随业务迁移在 TASK-007/008/009/010/013/016 同批落地，base 侧旧测试文件在 TASK-012 删除；
3. **web test 脚本文件列表**（EC-005/R5）：TASK-017 重列后，TASK-019 比对脚本列表与实际文件集合一致；
4. **dist-test 清理**（§4.2-3）：base/lgdl-web-cli/lgdl-web-op-cli 测试集合变化时 `rm -rf dist-test` 后重建，防旧编译产物残留；
5. **守恒口径**（ADR-009）：TASK-019 按全仓 ≥388（预期 421~422）验收，新增仅接线/元数据测试（handlers 2-3 例），断言逐字节保持（NFR-002），唯一例外 = web-fetch 改名（FR-022）与 llm.test 单列表断言（FR-021）。

### 4.3 build 启动建议

按关键路径优先启动：`TASK-001 → TASK-002 → TASK-003 → TASK-004 → …`；窗口 A/B/C/D/E 内的任务可委派并行子 agent（sddu-build 多实例）。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：基于 plan M0~M11 + 9 ADR + 测试守恒表分解为 21 个原子任务（16 波次 / S×3 / M×15 / L×3）；DAG 决策：M6 提前于 M5 保证每步可构建；标注 5 并行窗口（A~E）；FR/AC 全覆盖映射；每任务含验收标准与验证命令 | 2026-08-31 | SDDU Tasks Agent |
