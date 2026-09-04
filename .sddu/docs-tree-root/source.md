# LGDL 技术全景 — 产物溯源

> **文档定位**: sddu-docs-source — 技术全景聚合的全部原始素材清单（文件 + 实测动作），保证每份产物可追溯
> **输出文件名**: source.md
> **数据来源**: 代码扫描生成（本次扫描动作实录）+ Feature 产物聚合（specs-tree-web-cli-v2 全套，V2 更新）
> **创建人**: sddu-docs Agent
> **创建时间**: 2026-08-30
> **版本**: v2.0（基于工作区 `feature/group-as-node` @ `d03dca4`，HEAD `d03dca49ba3802df0fd2490b9b9978f121a1c695`）
> **更新说明**: V2 增量更新——扫描基准 HEAD 15e5b6b → d03dca4；包路径 6 包 → 9 包（lgdl-* 更名 + 新包）；测试实测数字刷新（420 全绿）；素材清单补 lgdl-web-cli / lgdl-web-op-cli / web-cli-base

---

## 0. 扫描基准声明

- 扫描对象：当前工作区（分支 `feature/group-as-node`，HEAD `d03dca4`）；`main` 停在 `de2381e`，不含 v0.6 改动。
- 排除项：`.opencode/`（OpenCode 运行时）、`opencode.json`、`.sddu/`（本全景自身工作目录）——本次未扫描。
- 全部文件**只读引用**，未修改任何存量文档（docs/、README.md、CHANGELOG.md、examples/ 均未改动——README/docs 的包名更新属任务 B 单独交付）。
- 产物输出目录 `.sddu/docs-tree-root/`（两种模式统一产物目录）。

## 1. 扫描过的文件清单

### 1.1 包声明与构建配置（用途：依赖关系、版本、构建链）

| 文件 | 用途 |
|------|------|
| `package.json`（根） | workspaces 布局（9 包）、engines（node ≥20）、根脚本（build/test/lint） |
| `tsconfig.json`（根） | project references 构建链（lgdl-core → lgdl-layout → lgdl-router → lgdl-render → lgdl-cli；lgdl-web 不在其中） |
| `package-lock.json` | 9 workspace 条目 + dagre/elkjs 残留验证（grep = 0 处） |
| `packages/{lgdl-core,lgdl-layout,lgdl-router,lgdl-render,lgdl-cli,lgdl-web,lgdl-web-cli,lgdl-web-op-cli,web-cli-base}/package.json` | 各包依赖声明、零依赖实证（lgdl-core/lgdl-router）、web-cli-base 零 @lgdl/* 实证、lgdl-web 前端依赖清单 |
| `.github/workflows/deploy-pages.yml` | Pages 部署拓扑、G1 缺口（不含 lgdl-router/lgdl-cli 构建） |
| `scripts/gen-examples.mjs` | examples 三件套生成脚本（examples.ts 单一来源） |

### 1.2 源码关键文件（用途：ADR 证据锚点 + 数据流/依赖事实；V2 后路径以 lgdl-* 为准）

| 文件 | 用途 |
|------|------|
| `packages/lgdl-core/src/types.ts` | group-as-node 模型（`NodeKind` 含 'group'、`LgdlDocument` 无 groups 字段）——ADR-002 锚点 |
| `packages/lgdl-core/src/parser.ts` | 严格校验 error-only、`groups:` 旧语法 loud reject——ADR-002/005 锚点 |
| `packages/lgdl-core/src/operations.ts` | 增量编辑协议（LgdlOperation 9 种、applyOperations 失败即停）——ADR-008 锚点 |
| `packages/lgdl-core/src/mutations.ts` | 变更操作层（add/remove/update × node/edge/group） |
| `packages/lgdl-core/src/groups.ts` | deriveGroups 投影（UNIFIED 模型）——ADR-002 锚点 |
| `packages/lgdl-core/src/queries.ts` | 只读查询命令单一实现（doc-info/get-node 等） |
| `packages/lgdl-core/src/serialize.ts` | 序列化器（源码唯一写出者）——ADR-006/008 支撑 |
| `packages/lgdl-core/src/mermaid-import.ts` | 导入器（唯一存在 warning 的例外路径）——ADR-005 例外说明 |
| `packages/lgdl-layout/src/index.ts` | layout dispatch、layoutGrouped、`LARGE_GRAPH_THRESHOLD=120` 网格降级——ADR-001/002 锚点 |
| `packages/lgdl-layout/src/layered.ts` | 自研 Sugiyama 分层引擎——ADR-001 锚点 |
| `packages/lgdl-router/src/index.ts` | 正交布线引擎（模块头 pure geometry + routeEdge A*）——ADR-003 锚点 |
| `packages/lgdl-router/src/router.test.ts` | 8 条布线回归测试（实测 8/8）——ADR-003 锚点 |
| `packages/lgdl-render/src/index.ts` | router import（:10）、data-lgdl-loc 源映射——ADR-003 锚点 |
| `packages/lgdl-cli/src/cli.ts` | 终端入口（薄壳，registerAll）——ADR-004 锚点 |
| `packages/lgdl-cli/src/registry.ts` | 19 个命令注册数组——ADR-004 实证 |
| `packages/lgdl-cli/src/commands/*.ts` | 9 个 mutation 命令 import `@lgdl/lgdl-web-cli`（V2 切换）——ADR-V2-001/002 锚点 |
| `packages/lgdl-web/src/App.tsx` | 浏览器内编译管线 + opRegistry 注入（V2）——ADR-V2-006 锚点 |
| `packages/lgdl-web/src/ai/provider.ts` | 多厂商接入 + 三工具新源组装（V2）——ADR-007/V2-003/007 锚点 |
| `packages/lgdl-web/src/ai/AiPanel.tsx` | agent 循环（MAX_ROUNDS=1000 :363；失败反馈修正 :452）——ADR-007 锚点 |
| `packages/lgdl-web-cli/src/commands.ts` | COMMANDS 6 命令注册表 + buildOperation（V2 迁入）——ADR-V2-001/004/008 锚点 |
| `packages/lgdl-web-cli/src/adapters/lgdl.ts` | lgdlDomain/lgdlExecutor 组装单点（V2）——ADR-V2-003/005 锚点 |
| `packages/lgdl-web-op-cli/src/ops.ts` / `handlers.ts` | OP_COMMANDS 单一数据源 / OpHandlerRegistry 注入面（V2）——ADR-V2-006/008 锚点 |
| `packages/web-cli-base/src/exec.ts` | DomainApi<Op,Doc> 泛型契约 + validate 门禁（:294）——ADR-V2-003/005 锚点 |
| `packages/web-cli-base/src/web-fetch.ts` | web-fetch 中性化工具（V2 归位）——ADR-V2-007 锚点 |
| `packages/lgdl-web/src/examples.ts` | 9 个内置示例单一来源（gen-examples.mjs 的输入） |

### 1.3 存量文档（只读引用，可能存在漂移）

| 文件 | 用途 | 漂移标注 |
|------|------|---------|
| `CHANGELOG.md` | ADR 决策历史、版本沿革、测试数记载 | D6/D7 + elkjs 段放置错位（见 §4） |
| `docs/design.md` | 设计原则（增量编辑协议 §2、确定性布局 §3） | D1/D3（elkjs/config.ts 过时） |
| `docs/cli-guide.md` | CLI 命令清单（16 命令、用法） | 与 registry.ts 实测一致 |
| `docs/lgdl-spec.md` | DSL 规范 | D2（groups: 旧语法描述过时） |
| `README.md` | 门面文档（架构树、布局说明） | D4/D5/D8（5 包 vs 6 包、球链网状表述、v0.4/v0.5 标题错位） |
| `.sddu/docs-tree-root/` 既有产物 | 根级 docs-overview.md + 系统架构/ 三份（本次对齐口径的基线） | 核心引擎/ 目录为空（已声明未落盘） |

> ⚠️ 漂移清单 D1~D8 详情见根级 docs-overview.md §3.4；本表沿用该记录，本次未重读 drift 条目涉及的存量文档全文。

## 2. 关键实测动作（2026-08-30 V1 / 2026-09-01 V2）

| # | 动作 | 命令/方法 | 结果 |
|---|------|----------|------|
| M1 | lgdl-core 包测试 | `cd packages/lgdl-core && npm test` | **258 通过 / 0 失败**（V2 纯改名后实测；V1 基线 281，CHANGELOG 记 314 → D7） |
| M2 | lgdl-render 包测试 | `cd packages/lgdl-render && npm test` | **21 通过 / 0 失败** |
| M3 | lgdl-router 包测试 | `cd packages/lgdl-router && npm test` | **8 通过 / 0 失败**（ADR-003 独立回归实证） |
| M4 | lgdl-web 包测试 | `cd packages/lgdl-web && npm test` | **32 通过 / 0 失败**（V2 收敛；V1 基线 107） |
| M5 | lgdl-web-cli 包测试 | `cd packages/lgdl-web-cli && npm test` | **76 通过 / 0 失败**（V2 随迁） |
| M6 | lgdl-web-op-cli 包测试 | `cd packages/lgdl-web-op-cli && npm test` | **11 通过 / 0 失败**（V2 新包） |
| M7 | web-cli-base 包测试 | `cd packages/web-cli-base && npm test` | **14 通过 / 0 失败**（V2 纯化收敛） |
| M8 | 依赖残留验证 | `grep -c "dagre\|elkjs" package-lock.json` | **0 处**（ADR-001 零依赖实证） |
| M9 | base 零 lgdl 依赖验证 | grep web-cli-base/package.json dependencies | **无 @lgdl/\***（仅 openai/anthropic，ADR-V2-002） |
| M10 | 校验等级验证 | `grep -n "severity: 'warning'"` 于 parser/mutations/serialize/queries | **0 处**；mermaid-import.ts 5 处（ADR-005 例外） |
| M11 | 命令数实证 | 读取 `packages/lgdl-cli/src/registry.ts` | 注册数组 19 项（ADR-004） |
| M12 | V2 零残留验证 | grep 旧包名 `@lgdl/core` 等 | **0 处**（packages/ 源码 + lock，specs-tree-web-cli-v2 validate V6） |
| M13 | 源映射行号 | `grep -n "data-lgdl-loc" packages/lgdl-render/src/index.ts` | :411,427,549,585,599,652,753 |

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
| `36bff65` | docs(archify)：使用体验报告 + 布局走线机制揭秘 | —（docs/ 产物，不归全景） |
| `5ea98f3` | feat(web-cli-base)：F-13 ① web-cli 独立包抽取（V2 前置） | ADR-V2-* |
| `d03dca4`（HEAD） | **V2 抽取与包体系重构：9 包就位，base 纯化**（重命名 6 包 + 新增 lgdl-web-cli/lgdl-web-op-cli + base 零 lgdl 依赖） | ADR-V2-001~009 |

## 3. 每份产物对应素材

| 产物 | 素材来源 |
|------|---------|
| **docs-overview.md**（根级入口） | §1.1 全部（根/子 package.json、tsconfig、package-lock、deploy-pages.yml）+ CHANGELOG.md（测试数、版本沿革）+ README.md/docs/design.md/docs/lgdl-spec.md（漂移 D1~D8）+ M1~M13 实测 + G5 规划项 grep 验证 + specs-tree-web-cli-v2 全套（9 包体系章节） |
| **系统架构/docs-overview.md** | §1.1 包声明（依赖表 2.1，9 包）+ `lgdl-router/src/index.ts:1-10`（router 职责澄清 §2.2）+ commit `203a000`/`d03dca4` + deploy-pages.yml（部署拓扑 §2.4，G1 沿革） |
| **系统架构/包依赖关系-deps.md** | §1.1 各包 package.json + import 语句 grep（`lgdl-render/index.ts:10` router import、`lgdl-layout/index.ts:16` core import、`lgdl-web-cli/adapters/lgdl.ts` 组装）+ `lgdl-router.test.ts`（测试隔离证据）+ commit `203a000`/`d03dca4` |
| **系统架构/端到端数据流-dataflow.md** | `lgdl-cli/commands/render.ts` + `lgdl-cli/shared.ts`（校验门禁）+ `lgdl-web/App.tsx`（compile）+ `lgdl-web-cli/adapters/lgdl.ts` + `web-cli-base/exec.ts:294`（门禁）+ `AiPanel.tsx:363,452` + `scripts/gen-examples.mjs`（示例管线） |
| **diagrams/ 6 张图（V2 重绘）** | ① architecture-packages（9 包依赖+数据流合并）← §1.1 包声明 + import 关系；② architecture-layers（三层包体系）← 语言层/适配层/框架层分层；③ architecture-deps（9 包依赖）← 同源；④ dataflow-cli（终端管线）← render.ts/shared.ts；⑤ dataflow-web（Web 管线）← App.tsx；⑥ sequence-ai-ops（AI 命令管线）← lgdl-web-cli 执行层/AiPanel/provider.ts。渲染源：各 `.html` 由 archify 编译，IR 源文件 `diagrams/ir/*.json`（V2 全部重绘并通过 showcase 校验 + visual-check） |
| **adr-index.md** | CHANGELOG.md + §2.1 commit 清单 + §1.2 源码锚点（V1 8 条 + V2 9 条，V2 引用 specs-tree-web-cli-v2 plan.md §7） |
| **source.md** | 本表全部动作与文件清单的实录 |

## 4. 甄别声明

1. **CHANGELOG Unreleased 段仅采信带验证记录的工程事实**：语义 diff、CI 自动渲染、SSE 流式、`lgdl-cli serve` 代理等规划性描述在代码中**无实现痕迹**（已 grep 验证，根级 G5），未纳入任何全景文档；引用 CHANGELOG 的测试数（314）与实测（258）不符处，一律以实测为准并记入漂移清单 D7。
2. **CHANGELOG 结构异常**：`CHANGELOG.md:31-45` 的 elkjs 迁移段位于 Unreleased/0.6.0 段内，内容实际对应 2026-08-23 之前阶段——放置错位，ADR-001 已按 commit（`7d7bdab`/`13ae5f5`）佐证事实。
3. **存量文档漂移**：docs/design.md（elkjs/config.ts）、docs/lgdl-spec.md（groups: 语法）、README.md（球链网状表述等）与代码实际不一致时，**一律以代码为准**（D1~D8 已记录；D4 的 README 5 包架构树已在 V2 全景更新中随任务 B 一并解决）。
4. **证据待补**：唯一未复测项为「web 打包 20s→6s」性能观测（CHANGELOG + commit `490636e` 记载，本次未复测），已在 adr-index.md P1 标注。
5. **V2 产物口径**：V2 相关的 9 条 ADR 与 9 包体系事实引用 specs-tree-web-cli-v2 全套产物（phase=validated）；但**测试数字与依赖清单均为当日（2026-09-01）实测**，非文档转述（M1~M13）。
6. **核心引擎/ 域目录**：V1 记录的「目录为空」缺口已于 2026-08-30 批次 2b/2c 填齐（core/layout/render/router/web 五份深潜），V2 更新沿用。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：素材清单 + 实测动作 + 产物溯源映射 + 甄别声明 | 2026-08-30 | sddu-docs Agent |
| v2.0 | V2 增量更新：扫描基准 d03dca4；素材清单 9 包路径刷新；实测动作 M1~M13（420 例全绿）；commit 清单补 36bff65/5ea98f3/d03dca4；产物映射补 V2 重绘 6 图 | 2026-09-01 | sddu-docs Agent |
