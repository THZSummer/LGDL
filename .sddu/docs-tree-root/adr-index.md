# LGDL 技术全景 — 架构决策记录（ADR 索引详表）

> **文档定位**: sddu-docs-adr-index — 架构决策记录详表（决策 / 备选方案 / 理由 / 证据锚点）
> **输出文件名**: adr-index.md
> **数据来源**: 代码扫描生成（CHANGELOG + git 历史 + 代码证据交叉验证）+ Feature 产物聚合（specs-tree-web-cli-v2 plan.md §7 的 9 条 V2 ADR）
> **创建人**: sddu-docs Agent
> **创建时间**: 2026-08-30
> **版本**: v2.0（基于工作区 `feature/group-as-node` @ `d03dca4`；V1 8 条 + V2 9 条）
> **更新说明**: V2 增量追加——引用 specs-tree-web-cli-v2（phase=validated）plan.md §7 的 9 条 ADR（重命名/抽取/base 纯化泛型化/web-fetch 归位等），状态由 PROPOSED 更新为 ACCEPTED（commit d03dca4 已实施）

---

## 0. 说明

- 本文档是根级 `docs-overview.md` §2 导航表声明的 `adr-index.md`，将 [系统架构/docs-overview.md](系统架构/docs-overview.md) §2.3 的 ADR 索引逐条展开。
- **证据口径**：每条 ADR 的证据锚点采用「commit hash + 文件:行号」双通道；CHANGELOG 中的数字（如测试数、打包时长）以**当日实测**为准，与实测不符处已标注。
- **甄别口径**：CHANGELOG.md Unreleased 段仅采信带验证记录的工程事实；规划性描述（语义 diff、CI 自动渲染、SSE 流式等）未纳入任何 ADR。
- **V2 口径**：§2.2 的 V2 ADR 引用 specs-tree-web-cli-v2 全套产物（discovery/spec/plan/tasks/review/validate，phase=validated）；plan.md 中标注 PROPOSED，commit `d03dca4` 实施后本表更新为 **ACCEPTED**。「证据待补」条目集中在 §3，不编造缺失证据。
- **路径口径**：V1 各条（§2.1）的证据锚点文件路径为**决策当时（V2 前）的目录名**（如 `packages/core/`、`packages/web/`），V2 后对应 `packages/lgdl-core/`、`packages/lgdl-web/` 等；锚点指向的 commit 与模块语义不变，属历史记录保留。

## 1. ADR 速查表

| 编号 | 标题 | 状态 | 影响范围 | 关键 commit | 证据状态 |
|:--:|------|:--:|---------|-----------|:--:|
| ADR-001 | 布局引擎三阶段演进：dagre → elkjs → 彻底自研 | ACCEPTED | layout、web 打包 | `490636e` / `7d7bdab` / `13ae5f5` | 完整（1 项性能观测未复测） |
| ADR-002 | 语义模型统一：group-as-node | ACCEPTED（开发分支） | core、layout、render 及全部下游 | `99f3d7d` | 完整 |
| ADR-003 | 布线抽出独立 router 包 | ACCEPTED | render、router | `203a000` / `3e89474` | 完整 |
| ADR-004 | 双 CLI 物理分离 + core 命令注册表单一实现 | ACCEPTED | cli、web、core | `1267d13` / `0ce6644` / `c3b4032` / `c232bd9` | 完整 |
| ADR-005 | error-only 严格校验（无静默降级） | ACCEPTED | core parser | 沿革于 v0.1（CHANGELOG.md:202） | 完整（含导入器例外说明） |
| ADR-006 | AI 不直接写源码，只走增量命令 | ACCEPTED | web AI、cli | `676cb95` | 完整 |
| ADR-007 | markdown 协议块升级为原生 function calling | ACCEPTED | web AI | `9fe73bf` / `fff64e8` | 完整 |
| ADR-008 | 增量编辑协议（AI 永不整图重写） | ACCEPTED | core、cli、web | `1267d13`（协议层沿革） | 完整 |
| ADR-V2-001 | 6 包重命名执行策略（git mv + 身份先行 + 引用后改 + lock 重建） | **ACCEPTED** | 全仓 | `d03dca4`（实施）；plan §2.3 | 完整 |
| ADR-V2-002 | 依赖方向：base 零 lgdl 依赖；lgdl-web-cli → base + lgdl-core 单向无环 | **ACCEPTED** | web-cli-base / lgdl-web-cli / lgdl-web-op-cli | `d03dca4`；plan §2.2 | 完整 |
| ADR-V2-003 | DomainApi<Op,Doc> 泛型化契约：结构化类型兼容，lgdl-core 类型零改动 | **ACCEPTED** | web-cli-base 契约面 | `d03dca4`；plan §2.6-① | 完整 |
| ADR-V2-004 | createOperationApplier 泛型化回留 base：dispatch 映射注入，9 变体分派随迁 | **ACCEPTED** | web-cli-base / lgdl-web-cli | `d03dca4`；plan §2.6-⑤ | 完整 |
| ADR-V2-005 | exec 管线参数化注入面：commandPrefix/parseBatch/describeSubcommand + handleLine/describeFetchLine | **ACCEPTED** | web-cli-base exec 管线 | `d03dca4`；plan §2.6-④ | 完整 |
| ADR-V2-006 | op-cli handler 注入面：OpHandlerRegistry 注册表，包定义协议/web 注入 React 回调 | **ACCEPTED** | lgdl-web-op-cli / lgdl-web | `d03dca4`；plan §2.5 | 完整 |
| ADR-V2-007 | web-fetch 中性化归位：lgdl-web-fetch → web-fetch，工具/解析/执行/help 归 base | **ACCEPTED** | web-cli-base / lgdl-web | `d03dca4`；plan §2.6-⑦ | 完整 |
| ADR-V2-008 | op 协议单一数据源：OP_COMMANDS 元数据注册表 → WEB_OP_TOOL 动态生成 | **ACCEPTED** | lgdl-web-op-cli | `d03dca4`；plan §2.5 | 完整 |
| ADR-V2-009 | 回归门禁口径：守恒 388 + 断言逐字节 + 新增接线测试 | **ACCEPTED** | 全仓测试 | `d03dca4`；plan §4.2 | 完整（420 实测） |

---

## 2. ADR 详表

### ADR-001 布局引擎三阶段演进：dagre → elkjs → 彻底自研

- **状态**：ACCEPTED
- **影响范围**：layout 包、web 打包体积与时长
- **决策**：分层布局引擎经历三个阶段——v0.1 用 dagre（`layoutHierarchicalDagre`）→ 迁移到 elkjs（`layoutHierarchicalElk`，`config.ts` 支持双引擎环境变量切换）→ 最终**彻底删除 dagre/elkjs 与 config.ts**，改用 LGDL 原生自研 Sugiyama 分层引擎 `layered.ts`（`layoutHierarchical` 改用 `layoutLayered`，`dagreRun` 改名 `layeredRun`）。
- **备选方案**：
  - **保留 dagre**：长边「绕大圈/斜线横穿/贴角不优雅」，dagre 是通用图库，对分组（cluster）边支持差，正交布线需另造轮子（CHANGELOG elkjs 迁移段记载）→ 否决。
  - **保留 elkjs（可配置回退）**：wasm 约 1.6MB 使 web 打包变慢（约 20s）、`layoutDocument` 被迫异步化（wasm 加载），浏览器打包链路复杂（需 bundled 构建修复，commit `13ae5f5`）→ 最终否决。
  - **彻底自研**（选择）：确定性输出（同输入同输出）、零第三方依赖、引擎全同步（layoutDocument 的 async 签名成为遗留）、web 打包 20s→6s、9 种图（TB/LR/含环 state）逐类型验证无回归。
- **理由**：与「语义优先、布局由确定性引擎完成」的项目定位一致——布局是确定性算法问题，自研可获得完全控制权（无外部引擎限制），并消除 wasm 依赖对浏览器打包的拖累。
- **证据锚点**：
  - `packages/layout/src/layered.ts:1-21` — 模块头注释：遵循 Sugiyama 框架（1981，注明出处）、**实现为自研**（no dagre/elkjs）、四阶段（去环→分层→层内排序→坐标分配）、确定性。
  - commit `490636e` — 自研替换 dagre/elkjs；删除 `layoutHierarchicalDagre`/`layoutHierarchicalElk`、`config.ts`（双引擎切换）、`types/elkjs.d.ts`；`dagreRun`→`layeredRun`；package.json 依赖只留 `@lgdl/core`。
  - commit `7d7bdab` — dagre → elkjs 迁移（可配置回退，正交布线）；commit `13ae5f5` — elkjs 改用自包含 bundled 构建修复 Vite/浏览器打包。
  - `packages/layout/package.json:18` — dependencies 仅 `@lgdl/core`；`package-lock.json` 实测 grep dagre/elkjs = **0 处**。
  - `packages/layout/src/index.ts:84-85,122,137` — `LARGE_GRAPH_THRESHOLD = 120` 与 dispatch 分支（自研分层为默认路径，网格为 >120 节点降级路径）。
  - 漂移标注：`docs/design.md:33` 仍写「默认 elkjs，config.ts 可切回 dagre」——**已过时**（根级漂移 D1/D3），以代码为准。
  - ⚠️ CHANGELOG 结构异常：`CHANGELOG.md:31-45` 的「dagre → elkjs」迁移段被放置在 Unreleased/0.6.0 段内，但内容对应 2026-08-23 之前的阶段（commit `7d7bdab` 佐证）——放置错位，事实本身由 commit 证实，不影响本条 ADR。

### ADR-002 语义模型统一：group-as-node

- **状态**：ACCEPTED（开发分支 `feature/group-as-node`；main 停在 `de2381e` 不含此改动）
- **影响范围**：core 类型模型、layout（分组感知布局）、render/ascii/mermaid/status/queries/plantuml/serialize/cli 全部下游
- **决策**：删除 `LgdlDocument.groups` 顶层字段与 `groups:` 顶层 DSL 语法，group 蜕化为 `kind:'group'` 节点携带 `contains`（可引用 node id 或 group id）；模型只剩 **node + edge** 两类一等概念；下游读取 `doc.groups` 的旧代码改用 `deriveGroups(doc)` 投影（接口形状不变）。
- **备选方案**：
  - **保留 `doc.groups` 独立字段 + `groups:` 旧语法**：两套概念并存，布局引擎必须特判 group（cluster 特例），解析器需维护双语法分支 → 否决（commit `99f3d7d` 记载用户明确要求「代码不允许兼容 groups 的写法」）。
  - **双轨过渡（新语法为主、旧语法兼容）**：CHANGELOG.md:21-22 曾记载「DSL 双语均接受」，属开发中间态 → 被后续提交废弃（根级漂移 D6），当前代码**拒绝**旧语法。
  - **统一为 group 节点**（选择）：分组框作为「超节点」参与两层布局（组间/组内均用自研分层引擎），布局引擎无需特判 group。
- **理由**：模型统一后「group 是 node 的一种」，布局、渲染、序列化、命令操作全部复用节点路径；消除双语法解析分支与数据同步漂移风险；下游读法（`doc.groups` 形状）经 `deriveGroups` 投影保持不变。
- **证据锚点**：
  - `packages/core/src/types.ts:2-9` — 模块头注释「group is NOT a separate field — it is a special node kind」；`types.ts:51-60` `NodeKind` 含 `'group'`；`types.ts:182-194` `LgdlDocument` 仅 `nodes + edges`，**无 groups 字段**。
  - `packages/core/src/groups.ts:1-10,25-38` — UNIFIED 模型注释 + `deriveGroups` 投影实现（`groupNodes` 过滤 `kind === 'group'`）。
  - `packages/core/src/parser.ts:54-55` — `groups:` 顶层字段被 loud reject 的注释（旧语法拒绝）。
  - `packages/layout/src/index.ts:219` — `layoutGrouped`（分组感知两层布局，分组框作为超节点）；`:352` `layoutLayered` 调用。
  - commit `99f3d7d` — 移除 `doc.groups` 字段、删除 raw-group 校验/归一化/投影重算、serialize 在 nodes 块内输出 group 节点。
  - 漂移标注：`docs/lgdl-spec.md:15,137` 称 `groups:` 可用、`CHANGELOG.md:21-22` 称双语接受——均过时（根级 D2/D6），以代码为准。

### ADR-003 布线抽出独立 router 包

- **状态**：ACCEPTED
- **影响范围**：render（删除本地走线函数）、新增 @lgdl/router 包、构建链（core ← layout ← router ← render ← cli/web）
- **决策**：将正交布线能力（A* 网格避障、形状边界锚定 `shapeEdgePoint`、出口面重居中 `recentreExit`、候选通道 `routeRectilinear`、降级正交化 `orthogonalize`、质量度量）从 render 内部抽出为独立包 **@lgdl/router**，纯几何、零依赖、不知 DOM 与样式。
- **备选方案**：
  - **留在 render 内部**：render/index.ts 膨胀至 1858 行，布线与绘制管线耦合，无法独立测试走线行为 → 否决。
  - **依赖 ELK 的 `edgeRouting: ORTHOGONAL`**：属布局层能力，走线质量迭代受限于外部引擎，且 elkjs 已被 ADR-001 移除 → 否决。
  - **独立包**（选择）：纯几何可独立回归测试（8 条）、render 专注「画」、路由专注「走线怎么绕」。
- **理由**：布线本质是纯几何计算（输入「布局折线 + 两端形状 kind + 障碍盒集合」，输出「90° 正交绕障折线」），与渲染管线解耦后既降低 render 复杂度（1858→1103 行），又能让走线行为在不开渲染器的情况下被测试（router.test.ts 8 条回归实测全绿）。
- **证据锚点**：
  - `packages/router/src/index.ts:1-10` — 模块头注释：pure geometry，无 DOM/样式知识，只需边界框 + 形状 kind。
  - `packages/render/src/index.ts:10` — `import { routeEdge, shapeEdgePoint, routeRectilinear } from '@lgdl/router'`（v0.6 新增 import，main 分支不存在）。
  - commit `203a000` — 抽出独立包：render/index.ts 1858→1103 行；构建链改为 core ← layout ← router ← render ← cli/web。
  - commit `3e89474` — 前置：在 render 内部实现 A* 网格避障路由器（routeAStar + collapseGridPath），随后被抽出。
  - `packages/router/package.json:18` — `"dependencies": {}`（零依赖实证）。
  - `packages/router/src/router.test.ts` — 8 条回归测试（routeEdge 绕障与贴边回归），本次实测 8/8 通过。
  - 缺口标注：`.github/workflows/deploy-pages.yml` 的 paths 触发与 build 步骤不含 router（根级 G1），v0.6 合入 main 后 Pages 构建将失败——仅记录，未修改。

### ADR-004 双 CLI 物理分离 + core 命令注册表单一实现

- **状态**：ACCEPTED
- **影响范围**：cli 包（终端入口）、web 包（lgdl-web-cli 协议解析器）、core 包（命令注册表）
- **决策**：终端 `lgdl-cli`（`--file` 磁盘文件，commander 解析 argv）与 Web `lgdl-web-cli`（`--doc` 编辑器文档，文本协议解析）**物理分离**为两个独立入口；命令业务逻辑（参数必填校验、no-change 校验、op 构造、attrs/member 解析）统一收敛到 `core/commands.ts` 命令注册表，两端只做「输入适配」。
- **备选方案**：
  - **单 CLI 双模式**：`--file`/`--doc` 混在同一入口，对象参数与 I/O 后端不同导致语义混乱 → 否决。
  - **两端各自实现命令逻辑**：业务行为漂移风险（v0.1-0.2 时代的代价），新增命令需改两处 → 否决。
  - **共享注册表 + 物理分离入口**（选择）：业务逻辑只写一次，两端行为严格一致。
- **理由**：CLI 入口文件极薄（`cli.ts:34` 一句 `registerAll`）；web-cli 协议解析器只供 web 包使用（边界物理化）；命令自文档化 `--help` 从注册表动态生成（新增命令不用改文档）；两端消费同一 `buildOperation`，增量命令行为严格一致。
- **证据锚点**：
  - `packages/core/src/commands.ts:1-17` — 模块头注释：「lgdl-cli 与 lgdl-web-cli 共享的业务逻辑层」；`:27-93` `COMMANDS` 注册表（13 条 CommandSpec，含 9 个增量命令）。
  - `packages/web/src/ai/web-cli.ts:1-20` — 模块头注释：协议解析器只供 Web；与 lgdl-cli 完全分离（互不解析对方参数格式）。
  - `packages/cli/src/cli.ts:34` — `registerAll(program)`（入口仅做 argv 适配与错误美化）；`packages/cli/src/registry.ts:44-64` — 注册 19 个命令（实测：init/render/status/6 个查询/convert/import + 9 增量）。
  - commit `1267d13` — 命令业务逻辑抽到 core/commands.ts（两端共用）；commit `0ce6644` — lgdl-cli 与 lgdl-web-cli 彻底分离；commit `c3b4032` — web-cli.ts 移入 web 包（边界物理化）；commit `c232bd9` — 入口前缀区分（终端 lgdl-cli / Web lgdl-web-cli）。
  - CHANGELOG.md:72（v0.5.0「双 CLI 分离」）、:82（命令自文档化 --help 由 COMMANDS 动态生成）。

### ADR-005 error-only 严格校验（无静默降级）

- **状态**：ACCEPTED（沿革自 v0.1 设计原则，0.5/0.6 持续强化）
- **影响范围**：core parser（主解析路径）
- **决策**：parser 校验**只产出 `severity: 'error'`**（主解析路径 0 处 warning），所有违规（未知 kind、坏引用、重复 id、错用专属字段等）一律 error + 可定位路径（`location`）；`valid=false` 时任何下游命令（含 render、增量命令）拒绝继续执行——**无警告级静默降级**。
- **备选方案**：
  - **warning 级提示 + 尽力渲染**：坏语义出图会误导 AI 与用户（图看着「能出」实际语义已损坏）→ 否决（CHANGELOG.md:202 自 v0.1 即确立「所有违规都报 error，不静默忽略」）。
  - **宽松解析 + 后置独立校验**：解析与校验分两层，事实源分裂 → 否决（`parseLgdl` 解析即校验，单一事实源）。
  - **error-only**（选择）：AI 消费方需要确定性——错误就是错误，绝不降级。
- **理由**：LGDL 的消费方是 CLI/AI（结构化操作），静默降级会让「错误输入 → 看似成功输出」的假象破坏 Agent 的可预测性；error + location 路径让错误可被工具直接定位修复。
- **证据锚点**：
  - `packages/core/src/parser.ts:34` — `validate()` 入口；grep 实测 `severity: 'error'` 遍布 `parser.ts:38-258`（约 40+ 处），**全文件 `severity: 'warning'` 0 处**。
  - 例外说明：`packages/core/src/mermaid-import.ts:162,219,253,292,301` 存在 `severity: 'warning'` —— 仅出现在 **mermaid 导入器**（宽容转换非主解析路径），主解析/校验路径仍为 error-only；mutations/serialize/queries 实测 0 处 warning。
  - `packages/cli/src/shared.ts:16-23` — `loadDocument` 对 `!result.valid` 直接 `process.exit(1)`（render 及全部命令的校验门禁落点）。
  - `packages/web/src/ai/ops.ts:239-248` — AI 写命令产物重新 `validate`，未通过即整体拒绝（error-only 在 AI 通道的兜底）。
  - CHANGELOG.md:202（v0.1.0「严格校验：所有违规（未知 kind、坏引用、重复 id）都报 error，不静默忽略」）。

### ADR-006 AI 不直接写源码，只走增量命令

- **状态**：ACCEPTED
- **影响范围**：web AI 助手（agent 循环）、cli（同一套增量命令）
- **决策**：AI 对图的一切修改只能通过 `lgdl-web-cli` 增量命令（add/remove/update × node/edge/group 等）完成，**绝不直接写 LGDL 源码文本**；写命令的产物必须重新通过 `validate` 门禁，否则整体拒绝；源码永远由 `serializeLgdl` 序列化器写出。
- **备选方案**：
  - **AI 直接生成源码文本**：模型输出不可控、格式错误会破坏图、绕过校验 → 否决（prompts.ts 明确「不存在 apply-source 命令」）。
  - **AI 输出 markdown 围栏代码块 + 人工点「应用」**：v0.4 时代方案，需人工确认、非 agent 循环可自动驱动 → 被 v0.5 增量命令协议取代。
  - **增量命令**（选择）：LLM 只产生意图（subcommand + args），执行与校验全走 core 单一实现。
- **理由**：增量命令是可验证、可回滚的结构化操作；「工具调用 → 结构化 Operation → 变更 → 校验 → 序列化回源码」闭环保证 AI 无法绕过校验门禁（ops.ts:239-248 是技术兜底）。
- **证据锚点**：
  - `packages/web/src/ai/prompts.ts:57` — 「**不存在 apply-source 命令——绝不直接写 LGDL 源码。**」；prompts.ts:19-28 system prompt「你不写 LGDL 源码、不写命令块——对图的一切修改都通过 lgdl-web-cli 工具调用完成」。
  - `packages/web/src/ai/ops.ts:204-217` — 增量命令分支（走 `core/buildOperation`）；`:239-249` — validate 门禁（`✖ 操作结果未通过校验` + `serializeLgdl` 回写）。
  - commit `676cb95` — 定义 web-cli 通讯协议（表达 vs 执行）+ agent 循环逐步执行。
  - `docs/design.md:17-29`（§2 增量编辑协议原则）——注意 design.md 未涉及 function calling 层（文档漂移，以代码为准）。

### ADR-007 markdown 协议块升级为原生 function calling

- **状态**：ACCEPTED
- **影响范围**：web AI 通道（provider 调用层、AiPanel agent 循环、ops 结构化执行）
- **决策**：AI 执行通道从 ```lgdl-web-cli``` markdown 围栏协议块升级为 **LLM 原生工具调用**（OpenAI `tool_calls` / Claude `tool_use`）；chat 文本（表达）与工具调用（执行）由 API 字段明确区分，不再靠 markdown 解析猜类型；工具结果以 `tool` 角色回传、失败反馈修正。
- **备选方案**：
  - **markdown 围栏解析**：靠围栏/标记猜消息类型不可靠（`fff64e8` 已先做「不再让 markdown 解析器猜类型」的缓解，仍未根除）→ 否决。
  - **原生 function calling**（选择）：业界标准，API 字段级区分表达/执行；agent 循环按 `tool_calls` 驱动，消息顺序由协议约束。
- **理由**：协议块解析是「猜测式」边界，模型输出格式漂移即解析失败；原生工具调用由 API 保证结构化，失败反馈修正形成闭环（AiPanel 追加 user 修正消息），轮数上限可调（默认 1000）。
- **证据锚点**：
  - commit `9fe73bf` — 对接原生 function calling（chat 与 web-cli 由 API 字段区分；含修复 400 "tool must follow tool_calls"）；commit `fff64e8` — 前置：协议层区分 chat 与 web-cli（不再让 markdown 解析器猜类型）。
  - `packages/web/src/ai/provider.ts:405` — `tools: [WEB_CLI_TOOL, WEB_OP_TOOL]`；`:443-444` — Claude `tool_use`；`:495` — OpenAI `tool_calls`。
  - `packages/web/src/ai/AiPanel.tsx:362,373-374` — `MAX_ROUNDS` 轮数上限（默认 1000，到顶自动停止）；`:450` — 失败反馈修正（「上一条命令执行失败，请查看错误并修正命令后重试」）。
  - CHANGELOG.md:77（v0.5.0「原生 function calling 协议」）；实测 web 107 测试全绿（ops/provider/web-cli 覆盖）。

### ADR-008 增量编辑协议（AI 永不整图重写）

- **状态**：ACCEPTED
- **影响范围**：core（operations 层）、cli（9 个增量命令）、web AI（lgdl-web-cli 工具）
- **决策**：定义结构化 `LgdlOperation`（add/remove/update × node/edge/group 共 9 种，JSON 可序列化）作为**唯一增量编辑协议**；`applyOperation`/`applyOperations` 为单一实现（批量失败即停）；CLI 9 个增量命令与 Web AI 共用同一入口——**AI 永不整图重写**。
- **备选方案**：
  - **整图重写**：大图 token 成本高、容易引入无意改动、变更不可追溯 → 否决（docs/design.md §2「AI 的每次修改必须是增量操作，而不是整图重写」）。
  - **CLI 与 Web 各自实现增量**：行为漂移风险（与 ADR-004 同理）→ 否决。
  - **共享操作层**（选择）：新增增量命令 = 加一个 op 变体（+ 两端表面），永无第二套实现。
- **理由**：一次修改一个原子操作，失败即停可精确报告第几个 op 失败（`failedIndex`）；mutation 校验、no-change 校验与 warning 在 CLI/Web 两端严格一致；源码永远由序列化器写出（可追溯）。
- **证据锚点**：
  - `packages/core/src/operations.ts:1-18` — 模块头注释（shared incremental edit protocol，两端同一 applyOperation 入口）；`:195-220` — `applyOperations` 失败即停（`failedIndex` + 填充 null 槽位）。
  - `packages/core/src/commands.ts:27-93` — `COMMANDS` 注册表中 9 个增量命令的 CommandSpec（add/remove/update × node/edge/group）。
  - commit `1267d13` — 命令业务逻辑抽到 core/commands.ts（增量协议单一数据源）。
  - `docs/design.md:17-29`（§2 增量编辑协议：add/remove/update + 确定性重排「语义不变则输出不变」）。
  - CHANGELOG.md:64（v0.5.0「共享操作层：结构化增量操作协议 9 种 + applyOperation/applyOperations 批量、失败即停」）。

---

## 2.2 V2 ADR 详表（specs-tree-web-cli-v2，9 条）

> 本节引用 specs-tree-web-cli-v2 全套产物（discovery/spec/plan/tasks/review/validate，phase=validated）。plan.md 中状态为 PROPOSED，commit `d03dca4`（2026-09-01）实施后全部转 **ACCEPTED**。各条决策/备选/理由详见 plan.md §7，本表按实测代码收敛证据锚点。

### ADR-V2-001 6 包重命名执行策略：git mv + 身份先行 + 引用后改 + lock 重建

- **状态**：ACCEPTED（commit d03dca4 已实施）
- **背景/决策**：D-001 锁死 scoped 命名（@lgdl/lgdl-*，EC-001 不返工）。顺序 = ① `git mv` 目录（保留历史）→ ② 6 包 package.json name 改身份 → ③ 跨包 import 改源（~30 处）→ ④ 根/tsconfig/predev/CI 同步 → ⑤ `npm install` 重建 lock（7→9 workspace 条目）→ ⑥ 文档面。「先改包身份再改引用」：身份先行使 workspace 解析立即指向新目录。
- **理由/后果**：重命名是纯机械面（git mv + 字符串替换），零语义改动；FR-002/AC-002 grep 零残留为验收；bin `lgdl-cli` 与协议前缀 `lgdl-web-cli`/`lgdl-web-op-cli` 不变。
- **证据锚点**：commit `d03dca4`（9 包就位 + lock 9 workspace 条目零 extraneous，validate V1 实测）；`ls packages/` = 9 目录；6 包 package.json name 全部 @lgdl/lgdl-*；根 package.json:20 dependencies `@lgdl/lgdl-cli`；validate-report.md V1（AC-001 9 包就位 PASS）。

### ADR-V2-002 依赖方向：base 零 lgdl 依赖；lgdl-web-cli → base + lgdl-core 单向无环

- **状态**：ACCEPTED
- **背景/决策**：作者裁决①（base 不依赖 lgdl-core）+ 任务书「lgdl-web-cli 依赖 web-cli-base（泛型机制）+ lgdl-core」。web-cli-base 纯化为零 @lgdl/* 依赖的公共框架（deps 仅 @anthropic-ai/sdk + openai）；lgdl-web-cli → {web-cli-base, lgdl-core}；lgdl-web-op-cli → web-cli-base（仅 HelpArg/HelpEntry 类型，零 React/DOM）；cli → {lgdl-web-cli, lgdl-core, lgdl-render}；web → {适配层 ×2, base, 引擎 ×3}。
- **理由/后果**：依赖图 `lgdl-core ← lgdl-web-cli ← cli/web` 与 `web-cli-base ← 适配包 ← cli/web` 线性无环（NFR-004/AC-006）；R2 核验点（cli → lgdl-web-cli → base/lgdl-core 与 cli → lgdl-core 并存）经 package.json 声明核对通过。
- **证据锚点**：9 包 package.json dependencies 逐包实测（见 系统架构/包依赖关系-deps.md §1）；AC-006 依赖图核验（review-report C21 / validate V4）。

### ADR-V2-003 DomainApi<Op,Doc> 泛型化契约：结构化类型兼容，lgdl-core 类型零改动

- **状态**：ACCEPTED
- **背景/决策**：FR-018 要求 DomainApi（原 exec.ts:40-65，19 LGDL 符号）泛型化 + base 去 lgdl-core 依赖；NG-003 要求类型定义零语义改动。base 定义 `DomainApi<Op, Doc>` 机制契约（ParseResult<Doc>/MutationResult<Doc>/OperationBatchResult<Doc> 泛型化，DIAGRAM_TYPES 收窄 readonly string[]）；lgdl-core 具体类型经 TS 结构化类型系统赋给契约（字段超集即可）；具体 DomainApi 实例（lgdlDomain 19 符号）随 adapters 迁 lgdl-web-cli。
- **理由/后果**：base 零 lgdl 类型引用（FR-018 grep 验收）；类型定义零改动（NG-003）；管线访问字段全在契约内（R10 兜底）；任意领域可实例化（NFR-005）。
- **证据锚点**：`packages/web-cli-base/src/exec.ts`（DomainApi<Op,Doc> 泛型契约）；`packages/lgdl-web-cli/src/adapters/lgdl.ts`（lgdlDomain 组装，类型参数实例化）；web-cli-base/package.json dependencies 无 @lgdl/*（AC-003/FR-019 零残留 grep）。

### ADR-V2-004 createOperationApplier 泛型化回留 base：dispatch 映射注入，9 变体分派随迁

- **状态**：ACCEPTED
- **背景/决策**：D-002 决策「泛型化版本回留 base，9 mutations 映射随业务迁」；FR-020 验收「注入相同 mutations 集时分派输出逐字节一致」。base `createOperationApplier<Op, Doc>(dispatch)` 返回 { applyOperation, applyOperations }——分派查找（op 字段判别）+ 失败即停批量循环；9 个 op 变体解构调用随迁 lgdl-web-cli/operations.ts 的 lgdlDispatch。
- **理由/后果**：机制（注入分派器）留 base、业务（LGDL 协议形状）随迁；零语义改动由「case 体逐行复制 + 注入相同映射输出一致」保证（NFR-005，validate 逐字节比对 1294=1294）。
- **证据锚点**：`packages/web-cli-base/src/operations.ts`（泛型工厂）；`packages/lgdl-web-cli/src/operations.ts`（lgdlDispatch 9 变体映射）；lgdl-web-cli/operations.test.ts 9 例随迁；validate-report V9（WEB_CLI_TOOL/OP_COMMANDS 逐字节 = 基线）。

### ADR-V2-005 exec 管线参数化注入面：commandPrefix/parseBatch/describeSubcommand + handleLine/describeFetchLine

- **状态**：ACCEPTED
- **背景/决策**：FR-019 要求 base exec 21 处 'lgdl-web-cli' 硬编码参数化/随迁；D-004 决策 tokenizeCli/parseArgs 留 base、parseWebCliCommand/Batch 路由面随迁。base `ExecutorOptions<Op>` 增 3 注入参数——commandPrefix（替代前缀判断与错误文案内嵌前缀）、parseBatch（单行批量解析）、describeSubcommand（替代 LGDL 描述文案）；保留 handleLine/describeFetchLine；base 默认值 = 无前缀/内置 createBatchParser 骨架。
- **理由/后果**：base 源码 'lgdl-web-cli' 字符串清零（FR-019 grep 验收）；注入等价参数时行为与迁移前逐字节一致（NFR-005）；lgdl-web-cli/adapters 组装时注入全部参数。
- **证据锚点**：`packages/web-cli-base/src/exec.ts`（ExecutorOptions 注入参数）；`packages/lgdl-web-cli/src/adapters/lgdl.ts`（lgdlExecutor 组装 options 注入）；AC-003/FR-019 grep 零残留（base/src 无 'lgdl-web-cli' 硬编码，validate V6）。

### ADR-V2-006 op-cli handler 注入面：OpHandlerRegistry 注册表，包定义协议/web 注入 React 回调

- **状态**：ACCEPTED
- **背景/决策**：FR-016/FR-024（C6）：op-cli 包不含 React 执行体，16 分支（原 App.tsx:943-1055）由 web 注入。lgdl-web-op-cli 定义 `OpHandler = (args) => OpExecResult` + `OpHandlerRegistry`（register/has/execute，未注册子命令返回与现状一致的「✖ 未知操作」文案）；web App.tsx 逐分支复制 16 个实现为注册回调（useMemo 组装）。
- **理由/后果**：包内纯协议/元数据零 React/DOM（FR-016/NFR-004 grep 验收）；执行行为 1:1 迁移（NFR-002）；handlers.test 3 例包内可测；其他领域可复用注册表注入自有 UI 操作。
- **证据锚点**：`packages/lgdl-web-op-cli/src/handlers.ts`（OpHandlerRegistry/OpHandler/OpExecResult）；`packages/lgdl-web/src/App.tsx`（opRegistry useMemo 注册 16 回调）；`grep -rniE "react|document\\.|localStorage"` op-cli 零命中（NFR-004）；handlers.test.ts 3 例（lgdl-web-op-cli 实测 11 例全绿）。

### ADR-V2-007 web-fetch 中性化归位：lgdl-web-fetch → web-fetch，工具/解析/执行/help 归 base

- **状态**：ACCEPTED
- **背景/决策**：作者裁决③ + FR-022：lgdl-web-fetch 是平台级能力，自 web 归 base 并中性化改名（唯一命名例外）。WEB_FETCH_TOOL + parseWebFetchCommand/executeWebFetch + webFetchHelp 迁 base（tools.ts / web-fetch.ts / help.ts）；工具 name 与前缀 `lgdl-web-fetch` → `web-fetch`；web 侧改名联动（lgdl-web.ts / AiPanel.tsx / prompts.ts）。
- **理由/后果**：base 平台能力补齐（其他领域可复用）；web 应用层与平台能力解耦；改名是命名改动非语义改动（NFR-002 例外声明）；全仓 grep 'lgdl-web-fetch' 零残留（FR-022 验收）。
- **证据锚点**：`packages/web-cli-base/src/web-fetch.ts` + `tools.ts`（name: 'web-fetch'）；`packages/lgdl-web/src/ai/provider.ts`（WEB_FETCH_TOOL 自 base 导入）；web-fetch.test.ts 6 例随迁（前缀断言改名）；validate V12（web-fetch 改名联动逐字节）。

### ADR-V2-008 op 协议单一数据源：OP_COMMANDS 元数据注册表 → WEB_OP_TOOL 动态生成

- **状态**：ACCEPTED
- **背景/决策**：FR-016 要求消除「工具定义 + help 元数据」双份并存（原 provider.ts enum vs help.ts entries 不一致：enum 含 help 不含 export、entries 含 export 不含 help）；FR-017 界定 op 协议 = 元数据契约。lgdl-web-op-cli 定义 `OP_COMMANDS: Record<string, OpCommandMeta>`（16 条，含 export 别名）+ `OP_SUBCOMMANDS = Object.keys(OP_COMMANDS)` 为唯一事实源；WEB_OP_TOOL.parameters.enum 由 OP_SUBCOMMANDS 生成（工具 schema 为基准，16 项逐字节复现迁移前）。
- **理由/后果**：单一数据源闭环（FR-016 验收）；schema 逐字节验收由 tool.test diff 兜底（R13）；不新增文本解析能力（FR-017/NG-004）。
- **证据锚点**：`packages/lgdl-web-op-cli/src/ops.ts`（OP_COMMANDS 16 条）+ `tool.ts`（WEB_OP_TOOL 动态生成）；tool.test.ts（schema 逐字节 1485=1485）；validate V10（OP_COMMANDS 2085=2085 逐字节）。

### ADR-V2-009 回归门禁口径：守恒 388 + 断言逐字节 + 新增接线测试

- **状态**：ACCEPTED（实测 420 例全绿）
- **背景/决策**：NFR-003 测试守恒（≥388）；随迁测试断言逐字节保持（NFR-002）。验收口径 = 全仓用例守恒 + 随迁断言输出逐字节一致 + 仅新增接线/元数据测试（op-cli handlers 3 例）；web test 脚本文件列表重列（FR-025）与新包通配符脚本 + dist-test 清理并行。
- **理由/后果**：validate 阶段按守恒口径验收；零新功能红线（NFR-001）顺带验证。
- **证据锚点**：全仓实测 **420 例全绿**（lgdl-web-cli 76 + lgdl-web 32 + lgdl-core 258 + lgdl-web-op-cli 11 + web-cli-base 14 + lgdl-router 8 + lgdl-render 21；守恒基准 388 = 82+48+258 口径）；commit d03dca4 记载一致；validate V2-V5 逐项 PASS。

---

## 3. 证据待补与说明

| # | ADR | 条目 | 说明 | 处理 |
|---|-----|------|------|------|
| P1 | ADR-001 | 「web 打包约 20s→6s」 | CHANGELOG.md:14 与 commit `490636e` 记载的构建性能观测，本次**未复测**打包时长（仅复测测试数与依赖残留） | 标注为构建观测记录（未复测），不作为当日实测引用 |
| P2 | ADR-001 | CHANGELOG.md:31-45 elkjs 迁移段位于 Unreleased 段内 | 结构放置错位（内容对应 2026-08-23 之前阶段）；事实由 commit `7d7bdab`/`13ae5f5` 佐证 | 不列为证据待补；已在本表与 ADR-001 中标注结构异常 |
| P3 | ADR-004 | 19 个命令的完整清单 | 由 `packages/cli/src/registry.ts:44-64` 数组项实证（数=19），与 CHANGELOG「19 个命令」一致 | 已实证，无需待补 |

> 说明：V1 8 条 ADR 的证据锚点均已落实到 commit hash 或 文件:行号，无「完全无证据」条目；P1 为唯一未复测项（性能观测）。CHANGELOG.md:15,27 记载「core 314」与实测 258 的差异属测试数漂移（根级 D7），不影响本表 ADR 的决策事实。V2 9 条 ADR（§2.2）引用 specs-tree-web-cli-v2 全套产物，证据锚点均以 commit d03dca4 后的代码实测为准。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：从系统架构 §2.3 展开 8 条 ADR 详表（决策/备选/理由/证据锚点） | 2026-08-30 | sddu-docs Agent |
| v2.0 | V2 增量追加：§1 速查表 + §2.2 共 9 条 V2 ADR（重命名执行策略/base 零 lgdl 依赖/DomainApi 泛型化/createOperationApplier 泛型回留/exec 参数化注入/handler 注入面/web-fetch 归位/op 协议单一数据源/回归门禁），引用 specs-tree-web-cli-v2 plan.md §7，状态 PROPOSED → ACCEPTED（commit d03dca4） | 2026-09-01 | sddu-docs Agent |
