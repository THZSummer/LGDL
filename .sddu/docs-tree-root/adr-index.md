# LGDL 技术全景 — 架构决策记录（ADR 索引详表）

> **文档定位**: sddu-docs-adr-index — 架构决策记录详表（决策 / 备选方案 / 理由 / 证据锚点）
> **输出文件名**: adr-index.md
> **数据来源**: 代码扫描生成（CHANGELOG + git 历史 + 代码证据交叉验证），未经 SDDU 工作流验证
> **创建人**: sddu-docs Agent
> **创建时间**: 2026-08-30
> **版本**: v1.0（基于工作区 `feature/group-as-node` @ `15e5b6b`）
> **更新说明**: 初始创建（从系统架构/docs-overview.md §2.3 的 8 条 ADR 索引展开）

---

## 0. 说明

- 本文档是根级 `docs-overview.md` §2 导航表声明的 `adr-index.md`，将 [系统架构/docs-overview.md](系统架构/docs-overview.md) §2.3 的 8 条 ADR 索引逐条展开。
- **证据口径**：每条 ADR 的证据锚点采用「commit hash + 文件:行号」双通道；CHANGELOG 中的数字（如测试数、打包时长）以**当日实测**为准，与实测不符处已标注。
- **甄别口径**：CHANGELOG.md Unreleased 段仅采信带验证记录的工程事实；规划性描述（语义 diff、CI 自动渲染、SSE 流式等）未纳入任何 ADR。
- 「证据待补」条目集中在 §3，不编造缺失证据。

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

## 3. 证据待补与说明

| # | ADR | 条目 | 说明 | 处理 |
|---|-----|------|------|------|
| P1 | ADR-001 | 「web 打包约 20s→6s」 | CHANGELOG.md:14 与 commit `490636e` 记载的构建性能观测，本次**未复测**打包时长（仅复测测试数与依赖残留） | 标注为构建观测记录（未复测），不作为当日实测引用 |
| P2 | ADR-001 | CHANGELOG.md:31-45 elkjs 迁移段位于 Unreleased 段内 | 结构放置错位（内容对应 2026-08-23 之前阶段）；事实由 commit `7d7bdab`/`13ae5f5` 佐证 | 不列为证据待补；已在本表与 ADR-001 中标注结构异常 |
| P3 | ADR-004 | 19 个命令的完整清单 | 由 `packages/cli/src/registry.ts:44-64` 数组项实证（数=19），与 CHANGELOG「19 个命令」一致 | 已实证，无需待补 |

> 说明：8 条 ADR 的证据锚点均已落实到 commit hash 或 文件:行号，无「完全无证据」条目；P1 为唯一未复测项（性能观测）。CHANGELOG.md:15,27 记载「core 314」与实测 281 的差异属测试数漂移（根级 D7），不影响本表 ADR 的决策事实。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：从系统架构 §2.3 展开 8 条 ADR 详表（决策/备选/理由/证据锚点） | 2026-08-30 | sddu-docs Agent |
