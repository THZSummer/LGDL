# LGDL 技术全景 — 产物溯源

> **文档定位**: sddu-docs-source — 技术全景聚合的全部原始素材清单（文件 + 实测动作），保证每份产物可追溯
> **输出文件名**: source.md
> **数据来源**: 代码扫描生成（本次扫描动作实录），未经 SDDU 工作流验证
> **创建人**: sddu-docs Agent
> **创建时间**: 2026-08-30
> **版本**: v1.0（基于工作区 `feature/group-as-node` @ `15e5b6b`，HEAD `15e5b6b1d4caf8df75071e45bcddce59b8bed767`）
> **更新说明**: 初始创建（代码级扫描模式②，全量构建）

---

## 0. 扫描基准声明

- 扫描对象：当前工作区（分支 `feature/group-as-node`，HEAD `15e5b6b`）；`main` 停在 `de2381e`，不含 v0.6 改动。
- 排除项：`.opencode/`（OpenCode 运行时）、`opencode.json`、`.sddu/`（本全景自身工作目录）——本次未扫描。
- 全部文件**只读引用**，未修改任何存量文档（docs/、README.md、CHANGELOG.md、examples/ 均未改动）。
- 产物输出目录 `.sddu/docs-tree-root/`（两种模式统一产物目录）。

## 1. 扫描过的文件清单

### 1.1 包声明与构建配置（用途：依赖关系、版本、构建链）

| 文件 | 用途 |
|------|------|
| `package.json`（根） | workspaces 布局（6 包）、engines（node ≥20）、根脚本（build/test/lint） |
| `tsconfig.json`（根） | project references 构建链（core → layout → router → render → cli；web 不在其中） |
| `package-lock.json` | dagre/elkjs 残留验证（grep = 0 处） |
| `packages/{core,layout,router,render,cli,web}/package.json` | 各包依赖声明、零依赖实证（core/router）、web 前端依赖清单 |
| `.github/workflows/deploy-pages.yml` | Pages 部署拓扑、G1 缺口（不含 router） |
| `scripts/gen-examples.mjs` | examples 三件套生成脚本（examples.ts 单一来源） |

### 1.2 源码关键文件（用途：ADR 证据锚点 + 数据流/依赖事实）

| 文件 | 用途 |
|------|------|
| `packages/core/src/types.ts` | group-as-node 模型（`NodeKind` 含 'group'、`LgdlDocument` 无 groups 字段）——ADR-002 锚点 |
| `packages/core/src/parser.ts` | 严格校验 error-only、`groups:` 旧语法 loud reject——ADR-002/005 锚点 |
| `packages/core/src/commands.ts` | 命令注册表单一实现（COMMANDS 13 条 CommandSpec）——ADR-004/008 锚点 |
| `packages/core/src/operations.ts` | 增量编辑协议（LgdlOperation 9 种、applyOperations 失败即停）——ADR-008 锚点 |
| `packages/core/src/mutations.ts` | 变更操作层（add/remove/update × node/edge/group） |
| `packages/core/src/groups.ts` | deriveGroups 投影（UNIFIED 模型）——ADR-002 锚点 |
| `packages/core/src/queries.ts` | 只读查询命令单一实现（doc-info/get-node 等） |
| `packages/core/src/serialize.ts` | 序列化器（源码唯一写出者）——ADR-006/008 支撑 |
| `packages/core/src/mermaid-import.ts` | 导入器（唯一存在 warning 的例外路径）——ADR-005 例外说明 |
| `packages/layout/src/index.ts` | layout dispatch、layoutGrouped（分组感知两层布局）、`LARGE_GRAPH_THRESHOLD=120` 网格降级——ADR-001/002 锚点 |
| `packages/layout/src/layered.ts` | 自研 Sugiyama 分层引擎（模块头声明出处 + 确定性）——ADR-001 锚点 |
| `packages/router/src/index.ts` | 正交布线引擎（模块头 pure geometry + routeEdge A*）——ADR-003 锚点 |
| `packages/router/src/router.test.ts` | 8 条布线回归测试（实测 8/8）——ADR-003 锚点 |
| `packages/render/src/index.ts` | router import（:10）、data-lgdl-loc 源映射（:411,427,549,585,599,652,753）——ADR-003 锚点 |
| `packages/cli/src/cli.ts` | 终端入口（薄壳，registerAll）——ADR-004 锚点 |
| `packages/cli/src/registry.ts` | 19 个命令注册数组——ADR-004 实证 |
| `packages/cli/src/shared.ts` | loadDocument 校验门禁（!valid 即 exit(1)）——ADR-005 锚点 |
| `packages/cli/src/commands/render.ts` | render 命令（SVG/ASCII、输出目录/覆盖提示） |
| `packages/web/src/App.tsx` | 浏览器内编译管线（parseLgdl → layoutDocument → renderSvg，:509-547） |
| `packages/web/src/ai/ops.ts` | AI 结构化执行（buildOperation + validate 门禁 + serializeLgdl，:204-249）——ADR-005/006/008 锚点 |
| `packages/web/src/ai/web-cli.ts` | lgdl-web-cli 协议解析器（只供 web，与 lgdl-cli 分离）——ADR-004/006 锚点 |
| `packages/web/src/ai/provider.ts` | 多厂商接入 + 原生 function calling（tools/tool_calls/tool_use，:405-508）——ADR-007 锚点 |
| `packages/web/src/ai/prompts.ts` | system prompt（「绝不直接写 LGDL 源码」，:57）——ADR-006 锚点 |
| `packages/web/src/ai/AiPanel.tsx` | agent 循环（MAX_ROUNDS=1000 :362,373；失败反馈修正 :450）——ADR-007 锚点 |
| `packages/web/src/examples.ts` | 11 个内置示例单一来源（gen-examples.mjs 的输入） |

### 1.3 存量文档（只读引用，可能存在漂移）

| 文件 | 用途 | 漂移标注 |
|------|------|---------|
| `CHANGELOG.md` | ADR 决策历史、版本沿革、测试数记载 | D6/D7 + elkjs 段放置错位（见 §4） |
| `docs/design.md` | 设计原则（增量编辑协议 §2、确定性布局 §3） | D1/D3（elkjs/config.ts 过时） |
| `docs/cli-guide.md` | CLI 命令清单（19 命令、用法） | 与 registry.ts 实测一致 |
| `docs/lgdl-spec.md` | DSL 规范 | D2（groups: 旧语法描述过时） |
| `README.md` | 门面文档（架构树、布局说明） | D4/D5/D8（5 包 vs 6 包、球链网状表述、v0.4/v0.5 标题错位） |
| `.sddu/docs-tree-root/` 既有产物 | 根级 docs-overview.md + 系统架构/ 三份（本次对齐口径的基线） | 核心引擎/ 目录为空（已声明未落盘） |

> ⚠️ 漂移清单 D1~D8 详情见根级 docs-overview.md §3.4；本表沿用该记录，本次未重读 drift 条目涉及的存量文档全文。

## 2. 关键实测动作（2026-08-30）

| # | 动作 | 命令/方法 | 结果 |
|---|------|----------|------|
| M1 | core 包测试 | `npm test --workspace @lgdl/core` | **281 通过 / 0 失败**（CHANGELOG 记 314，实测修正 → D7） |
| M2 | render 包测试 | `npm test --workspace @lgdl/render` | **21 通过 / 0 失败** |
| M3 | router 包测试 | `npm test --workspace @lgdl/router` | **8 通过 / 0 失败**（ADR-003 独立回归实证） |
| M4 | web 包测试 | `npm test --workspace @lgdl/web` | **107 通过 / 0 失败** |
| M5 | 依赖残留验证 | `grep -c "dagre\|elkjs" package-lock.json` | **0 处**（ADR-001 零依赖实证） |
| M6 | 校验等级验证 | `grep -n "severity: 'warning'"` 于 parser/mutations/serialize/queries | **0 处**；mermaid-import.ts 5 处（ADR-005 例外） |
| M7 | git 历史核查 | `git log --oneline -25` + `git show --stat` 关键 commit | 见 §2.1 commit 清单 |
| M8 | 命令数实证 | `sed` 读取 `packages/cli/src/registry.ts` | 注册数组 19 项（ADR-004） |
| M9 | 源映射行号 | `grep -n "data-lgdl-loc" packages/render/src/index.ts` | :411,427,549,585,599,652,753 |

### 2.1 关键 commit 清单（git 证据）

| commit | 主题 | 关联 ADR |
|--------|------|---------|
| `490636e` | 自研 Sugiyama 分层布局，彻底去 dagre/elkjs（删 config.ts/elkjs.d.ts） | ADR-001 |
| `7d7bdab` / `13ae5f5` | dagre→elkjs 迁移 / elkjs bundled 打包修复 | ADR-001 |
| `99f3d7d` | 移除 doc.groups 字段，group 只作为 kind:'group' 节点 | ADR-002 |
| `3e89474` | render 内部实现 A* 网格避障路由器（前置） | ADR-003 |
| `203a000` | 把走线抽到独立 @lgdl/router 包（render 1858→1103 行） | ADR-003 |
| `1267d13` / `0ce6644` / `c3b4032` / `c232bd9` | 命令业务逻辑抽 core/commands.ts / CLI 彻底分离 / web-cli.ts 移入 web / 前缀区分 | ADR-004 |
| `676cb95` | 定义 web-cli 通讯协议（表达 vs 执行）+ agent 循环 | ADR-006 |
| `9fe73bf` / `fff64e8` | 对接原生 function calling / 不再让 markdown 解析器猜类型 | ADR-007 |
| `15e5b6b`（HEAD） | docs: add archify guide | —（本次扫描基准） |

## 3. 每份产物对应素材

| 产物 | 素材来源 |
|------|---------|
| **docs-overview.md**（根级入口） | §1.1 全部（根/子 package.json、tsconfig、package-lock、deploy-pages.yml）+ CHANGELOG.md（测试数、版本沿革）+ README.md/docs/design.md/docs/lgdl-spec.md（漂移 D1~D8）+ M1~M6 实测 + G5 规划项 grep 验证 |
| **系统架构/docs-overview.md** | §1.1 包声明（依赖表 2.1）+ `router/src/index.ts:1-10`（router 职责澄清 §2.2）+ commit `203a000` + deploy-pages.yml（部署拓扑 §2.4） |
| **系统架构/包依赖关系-deps.md** | §1.1 各包 package.json + import 语句 grep（`render/index.ts:10` router import、`layout/index.ts:16` core import、`web/App.tsx:11-13` 三件套）+ `router.test.ts`（测试隔离证据）+ commit `203a000` |
| **系统架构/端到端数据流-dataflow.md** | `cli/commands/render.ts` + `cli/shared.ts`（校验门禁）+ `web/App.tsx:509-547`（compile）+ `web/ai/ops.ts:204-249` + `AiPanel.tsx:362,450` + `scripts/gen-examples.mjs`（示例管线） |
| **diagrams/ 6 张图** | ① architecture-packages（依赖+数据流合并）← §1.1 包声明 + import 关系；② architecture-layers（四层架构）← 同源分层；③ architecture-deps（包依赖）← 同源；④ dataflow-cli（终端管线）← render.ts/shared.ts；⑤ dataflow-web（Web 管线）← App.tsx；⑥ sequence-ai-ops（AI 命令管线）← ops.ts/AiPanel/provider.ts。渲染源：各 `.html` 由 archify 编译，IR 源文件 `diagrams/ir/*.json` |
| **adr-index.md**（本次产出） | CHANGELOG.md + §2.1 commit 清单 + §1.2 源码锚点（8 条 ADR 逐条落实文件:行号） |
| **source.md**（本次产出） | 本表全部动作与文件清单的实录 |

## 4. 甄别声明

1. **CHANGELOG Unreleased 段仅采信带验证记录的工程事实**：语义 diff、CI 自动渲染、SSE 流式、`lgdl-cli serve` 代理等规划性描述在代码中**无实现痕迹**（已 grep 验证，根级 G5），未纳入任何全景文档；引用 CHANGELOG 的测试数（314）与实测（281）不符处，一律以实测为准并记入漂移清单 D7。
2. **CHANGELOG 结构异常**：`CHANGELOG.md:31-45` 的 elkjs 迁移段位于 Unreleased/0.6.0 段内，内容实际对应 2026-08-23 之前阶段——放置错位，ADR-001 已按 commit（`7d7bdab`/`13ae5f5`）佐证事实。
3. **存量文档漂移**：docs/design.md（elkjs/config.ts）、docs/lgdl-spec.md（groups: 语法）、README.md（5 包架构树/球链网状表述）与代码实际不一致时，**一律以代码为准**（D1~D8 已记录，未修改任何存量文档）。
4. **证据待补**：唯一未复测项为「web 打包 20s→6s」性能观测（CHANGELOG + commit `490636e` 记载，本次未复测），已在 adr-index.md P1 标注。
5. **核心引擎/ 域目录缺口**：根级导航表声明了「核心引擎/」域目录（四大引擎深潜），但该目录当前为空（本次扫描未发现其中落盘文件）——作为遗留缺口如实记录，不属于本溯源文档可追溯范围。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：素材清单 + 实测动作 + 产物溯源映射 + 甄别声明 | 2026-08-30 | sddu-docs Agent |
