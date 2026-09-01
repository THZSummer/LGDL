# 技术计划：group 命令合并（specs-tree-unify-group-cmd）

> **文档定位**: SDDU 技术方案 — 记录架构设计、方案对比和 ADR，作为 tasks 阶段的输入  
> **前置依赖**: spec.md（需求规范，21 FR 五组 / 7 NFR / 10 EC / 3 设计决策 DD-001~003 / 7 AC）、discovery.md（6 面 19 项 Q / 8 风险）  
> **创建人**: SDDU Plan Agent  
> **创建时间**: 2026-09-01  
> **版本**: v1.0  
> **更新人**: SDDU Plan Agent  
> **更新时间**: 2026-09-01  
> **更新说明**: 初始创建 — 3 决策点落地设计（DD-001~003）+ 7 变更面实施设计 + 迁移步骤序列 + 测试迁移矩阵（15 项）+ 风险矩阵（R-001~008 + 3 项 plan 新增）+ 工作量估算

---

## 1. 前置检查

| 检查项 | 状态 |
|--------|:--:|
| spec.md 存在 | ✅（`.sddu/specs-tree-root/specs-tree-unify-group-cmd/spec.md`，223 行） |
| 外部 API 文档缓存 | ✅ 不适用（内部重构，零外部服务依赖，已核实仓库无外部 API 消费方） |
| 前置依赖已满足 | ✅ v0.6 group-as-node（`types.ts:1-9` 头注释 / `LgdlNode.contains` :146）、V2 9 包体系（d03dca4）、收口五件套（0489db9）——均已核实 |
| 用户自定义模板 | ⚠️ `.sddu/templates/agents/output/sddu-plan.md.hbs` 不存在（`.sddu/` 下无 templates 目录）→ 采用插件内置兜底 `.opencode/plugins/sddu/templates/output/sddu-plan.md.hbs` |

## 2. 架构分析

### 2.1 现状架构与问题定位

语义模型层已完成统一（group 就是 `kind:'group'` 节点，`types.ts:130-149`），但命令层仍保留双入口：

```
命令层（半统一）                    语义模型层（已统一，本 Feature 零改动）
┌──────────────────────┐           ┌────────────────────────────┐
│ add-group --contains │──┐        │ LgdlNode {                 │
│ remove-group         │──┼──op──▶ │   kind?: 'group',          │
│ update-group --member│  │        │   contains?: string[]      │
│ add-node --kind group│──┘        │   members?: LgdlMember[]   │
└──────────────────────┘           └────────────────────────────┘
        ↑ 双入口并存                    ↑ 唯一事实源（parser/serialize/
        （Q-001~Q-019）                  layout/render 全按节点处理）
```

**依赖链**（本 Feature 的改动波及面）：

```
lgdl-core            lgdl-web-cli                lgdl-cli / lgdl-web
mutations.ts ─────▶  operations.ts (lgdlDispatch) ─▶ lgdl-cli registry.ts → commands/*.ts
types.ts ────────▶  commands.ts (COMMANDS/buildOperation) ─▶ lgdl-web-cli protocol.ts / tools.ts
index.ts (导出) ──▶  help.ts (PARAM_DESC/INCR_EXAMPLES/SUMMARIES) ─▶ lgdl-web prompts.ts / AiPanel.tsx
```

**架构影响**：本 Feature 为**收敛型重构，无新组件、无数据流新增**。数据流唯一的变更方向是「group 三命令的 op 路径折叠进 node 三命令」：`add-group op` → `add-node op (kind:'group', contains)`、`remove-group op` → `remove-node op`、`update-group op` → `update-node op (containsAdd/containsRemove)`。LgdlOperation 联合类型 9 变体 → 6 变体（`types.ts:210-263`）。

### 2.2 现状核实结论（plan 阶段复查，与 discovery 一致，另发现 2 处差异）

| 核实项 | 结论 |
|--------|------|
| addNode 缺 contains | ✅ `AddNodeOptions`（mutations.ts:36-46）无 contains；节点构造 :118-124 不写 contains；`group` 参数是「放入已有分组」方向 :134-145 |
| removeNode 已能删 group | ✅ :158-159 过滤、:161 父组 contains 摘除、:164 清边；与 removeGroup 差异仅错误消息（:151 vs :430）与 summary 文案（:170 "attached edge(s)" vs :446 "aggregate edge(s)"） |
| updateNode 已能改 group 的 label/attrs/newId | ✅ rename 重写父组 contains :291-293、边引用 :308-312 |
| updateGroup member 语义 ≠ updateNode member 语义 | ✅ updateGroup memberAdd/Remove 是 contains 的 **id 语义**（:482-511）；updateNode memberAdd/Remove 是结构化类成员（assertMemberShape :16-34）——合并边界唯一不等价点（R-001），spec DD-001 已闭环 |
| **⚠️ 差异 1（AiPanel 路径）** | discovery 标注 `lgdl-web/src/ai/AiPanel.tsx` ✅ 正确（此前 ls 输出误读，实读确认文件位于 `packages/lgdl-web/src/ai/AiPanel.tsx`，4 处引用 :116/:122/:139/:140） |
| **⚠️ 差异 2（docs-tree-root 联动面）** | discovery 预估 6 文件，实 grep 确认**联动面超过 6 文件**：核心引擎/core-语义模型.md（:200/:209/:215-226）、核心引擎/web-ai助手.md（:219）、adr-index.md（:114/:171-180）、**diagrams/ 系列**（architecture-layers.json:65/:184、architecture-packages.json:90、architecture-deps.json:98、以及对应 .html 与 .visual-check.json）——均含「19 命令 / 9 命令」计数。归 @sddu-docs 联动（R-008/R-011） |

### 2.3 三个设计决策的落地设计（spec §8 DD-001~003 → 实施方案）

#### DD-001 落地设计：update-node 新增 `--contains-add` / `--contains-remove`（contains 的 id 语义）

**决策**（spec 已定）：新增独立参数承载 group 成员 id 语义；`--member-add/--member-remove` 保持类成员语义（assertMemberShape）不变。

**落地细节**：

| 层 | 改动 |
|----|------|
| `UpdateNodeOptions`（mutations.ts:61-73） | 加 `containsAdd?: string[]` / `containsRemove?: string[]`（id 语义，与 memberAdd: LgdlMember 严格区分） |
| `updateNode`（mutations.ts:259-323） | ① 目标节点非 `kind:'group'` 且传 containsAdd/containsRemove → loud 报错（FR-015，消息口径见 §6.5 口径表）；② containsAdd 校验集（对齐 updateGroup :482-503）：自含 → 未知成员 → 已在目标组（"is already in group"）→ 已在其他组（membersOf 检查）；③ containsRemove 校验（对齐 :504-506）：成员不在目标组 → "Member not found ... in group"；④ 同时传时先 add 后 remove（对齐 :509-511）；⑤ summary changes 记 `contains+ b` / `contains- a`（与 `member+`/`member-` 区分） |
| `LgdlOperation` update-node 变体（types.ts:221-230） | 加 `containsAdd?: string[]` / `containsRemove?: string[]` |
| `CommandSpec update-node`（commands.ts:37-43） | optional 与 changeKeys 加 `'contains-add'` / `'contains-remove'`（changeKeys 保证 no-change 校验覆盖） |
| `buildOperation` update-node case（commands.ts:161-171） | 解析 `args['contains-add']` / `args['contains-remove']` → `split(',').map(trim).filter(Boolean)`（复用 add-group 时代 :207 的解析形态） |
| `lgdlDispatch` update-node（operations.ts:97-108） | 透传 containsAdd/containsRemove |
| cli `update-node.ts`（:18 区域） | 加 `.option('--contains-add <ids>', ...)` / `.option('--contains-remove <ids>', ...)` 并透传 buildOperation |
| `KNOWN_PARAMS`（commands.ts:89-94） | 补 `'contains-add'` / `'contains-remove'`（⚠️ discovery 未列，必须加，否则 update-node 传新参数报未知参数） |
| `PARAM_DESC`（help.ts:19-39） | 补 `contains-add` / `contains-remove` 中文说明 |

**护栏**：containsAdd/containsRemove 作用于非 group 节点时 loud 报错（FR-015 / EC-003）；与 memberAdd/memberRemove 完全独立参数，零歧义（flag 恒定含义，spec DD-001 理由 1）。

#### DD-002 落地设计：add-node 传 `--contains` 必须显式 `--kind group`（loud 报错）

**决策**（spec 已定）：禁止自动置 kind；loud 报错要求显式 `--kind group`。

**落地细节（双保险，命令层 + 核心层）**：

| 层 | 校验位置 | 行为 |
|----|---------|------|
| 命令层 `buildOperation` add-node case（commands.ts:144-158） | kind 解析后（`args.kind ?? kindResolver(docType)` :145） | `contains !== undefined && kind !== 'group'` → 抛错 `--contains 仅对 kind:'group' 节点有效（当前 kind: "<resolved>")，请显式传 --kind group`（FR-003，含 kind 与 group 指引） |
| 核心层 `addNode`（mutations.ts:107-148） | id/校验后、节点构造前（:116 后） | 同口径抛错。**防直接 API 调用绕过命令层**（lgdlDispatch 直构造 op、或消费方直调 addNode） |

**理由复述**（spec DD-002）：kindResolver 依 docType 返回 entity/state/process（commands.ts:114-118），不传 kind 时 contains 会被静默忽略（types.ts:144）→ 静默数据错；自动置 group 与 docType 默认语义冲突（如 uml-class 默认 entity）；报错保留可修复性。

**注意**：`--contains` 配**显式**非 group kind（如 `--kind entity --contains a`）同样 loud 报错（FR-004 / EC-002），同一校验覆盖两种情况（统一判 `kind !== 'group'` 即可）。

#### DD-003 落地设计：update-node 禁止修改 `kind:'group'` 节点的 kind

**决策**（spec 已定）：group → 非 group 禁止（loud 报错）；非 group → group 允许（updateNode 既有行为 :302）。

**落地细节**：

| 层 | 位置 | 行为 |
|----|------|------|
| `updateNode`（mutations.ts:259-323） | target 查找后（:264 后）、rename 校验附近 | `kind !== undefined && target.kind === 'group' && kind !== 'group'` → 抛错 `分组节点不允许修改 kind（节点 "<id>" 为 kind:'group'，改掉会留下无意义的 contains 字段）；如需删除分组请用 remove-node`（EC-004） |
| 命令层 | 无需重复护栏 | buildOperation 透传错误消息；cli/web-cli 的 `--kind` 照常解析，错误在 mutations 层拦截 |
| 反向（非 group → group） | 不加代码 | 走既有 :302 分支，产生空 contains，无孤儿风险（spec DD-003 理由 3，最小护栏原则） |

**边界**：`kind === 'group'`（改到相同值）视为 no-op 不报错，与 rename 到当前 id no-op（:266）逻辑一致。

## 3. 方案对比

> 方案 B 已由作者闭环（spec 上下文），本表对比的是**落地方式**的三条路径。

| 维度 | 方案 A：全量移除 + 逻辑内联（推荐） | 方案 B：命令层移除、mutations 保留内部 group 函数 | 方案 C：alias 兼容层（保留三命令做软删除提示） |
|------|:--|:--|:--|
| 描述 | addGroup/removeGroup/updateGroup 函数与 Options 类型彻底删除，逻辑内联进 addNode/removeNode/updateNode（DD-001~003 护栏随 node 函数落地）；LgdlOperation 9→6；测试等价迁移 | 命令面移除三命令，mutations 保留 group 三函数作为内部实现，node 函数委托调用 | 命令层移除注册，但保留 `add-group` 子命令名做 loud reject 软提示（alias 到 node 命令的指引） |
| 优点 | 单一实现路径，彻底贯彻「group 就是 node」；LgdlOperation 协议面干净（6 变体）；无死代码；后续 group 语义演进只维护 node 一条线 | 核心函数保留，lgdl-core 内部改动小；测试可渐进迁移 | 用户过渡体验最平滑（旧命令名仍可触发指引而非 unknown command） |
| 缺点 | 改动面最大（mutations.ts 重构 + 连锁 7 文件 + 12 测试用例迁移）；summary/错误消息口径变化需全量同步（R-009） | **双实现路径仍在**：addNode 与 addGroup 并存，任何 group 语义演进仍需双份维护——只表面统一，未解决 discovery 核心问题 | **违背 LGDL 哲学**（spec NG-003 明确排除：不留兼容包袱）；alias 层成为永久的第二套命令名心智负担 |
| 风险 | 连锁编译风险（R-005）——编译期可发现，依赖序落地可控 | 半统一状态固化（discovery 核心问题未解决）；group 函数成为无人调用的死代码，lint/维护噪音 | 与 NG-003 直接冲突；alias 映射表自身需双份维护 |
| 工作量 | 约 5 人日（含测试迁移与文档） | 约 2.5 人日（但交付不完整） | 约 3 人日（但不符合需求） |

## 4. 推荐方案

**推荐**: 方案 A —— 全量移除 + 逻辑内联
**理由**: 唯一满足 spec 目标 G-001~G-005 与 NFR-001~007 的方案。方案 B 只解决命令面、未解决「双实现路径」这一半统一的本质；方案 C 被 spec NG-003 明确排除。方案 A 的连锁改动面（R-005）是编译期可发现的确定性风险，通过 §7 迁移步骤序列的依赖序控制，测试守恒（FR-018）与零语义模型改动（NFR-001）提供行为等价性保障。

## 5. 文件影响分析

### 5.1 lgdl-core（面 1：底层 mutation 面）

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| MODIFY | `packages/lgdl-core/src/mutations.ts` | `AddNodeOptions` 加 `contains?: string[]`（:36-46）；`addNode` 加 DD-002 校验 + kind==='group' 分支写 contains（:107-148）；`UpdateNodeOptions` 加 `containsAdd/containsRemove`（:61-73）；`updateNode` 加 DD-001 成员操作 + DD-003 kind 护栏（:259-323）；提取共享 contains 校验 helper（FR-014）；**删除** `addGroup`（:383-427）、`removeGroup`（:429-448）、`UpdateGroupOptions`（:450-461）、`updateGroup`（:463-546） |
| MODIFY | `packages/lgdl-core/src/types.ts` | `LgdlOperation` 删除三 group 变体（:253-263）；add-node 变体加 `contains?: string[]`（:211-219）；update-node 变体加 `containsAdd/containsRemove`（:221-230） |
| MODIFY | `packages/lgdl-core/src/index.ts` | 删除 addGroup/removeGroup/updateGroup 导出（:14-16）与 AddGroupOptions/UpdateGroupOptions 导出（:23-24） |
| MODIFY | `packages/lgdl-core/src/mutations.test.ts` | 12 个 group 用例等价迁移（import :10-12 删三符号；用例 :215-265/:267-289/:933-949/:2550-2566）+ 新增护栏测试（DD-001~003 / EC-001~008） |

### 5.2 lgdl-web-cli（面 2：命令定义面 + 面 4：操作分派面）

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| MODIFY | `packages/lgdl-web-cli/src/commands.ts` | 删除三 CommandSpec（:65-85）；add-node optional 加 `'contains'`（:28）；update-node optional/changeKeys 加 `'contains-add'/'contains-remove'`（:41-42）；KNOWN_PARAMS 补两个新 key（:89-94）；buildOperation 删除三 case（:202-220）、add-node case 解析 contains + DD-002 校验（:144-158）、update-node case 解析 contains-add/remove（:161-171） |
| MODIFY | `packages/lgdl-web-cli/src/operations.ts` | describeOperation 删三 case（:58-63）；OperationMutations 删三成员（:75-77）；lgdlDispatch 删三分派（:138-157）；add-node 分派透传 contains（:85-95）；update-node 分派透传 containsAdd/containsRemove（:97-108）；import 删三函数（:36-38）与三 Options 类型（:26-27） |
| MODIFY | `packages/lgdl-web-cli/src/protocol.ts` | 删除三 case（:118-129）；头注释子命令枚举改（:16-19）；**loud reject 主落点**：未知子命令提示列表改写（:143）——对 add-group/remove-group/update-group 给出「分组已并入 node 命令：add-node --kind group --contains / remove-node / update-node」指引 |
| MODIFY | `packages/lgdl-web-cli/src/help.ts` | INCR_EXAMPLES 删三条 group（:119-121）；INCR_SUMMARIES 删三条（:132-134）；add-node 示例改含 `--kind group --contains` 形态（:113）；update-node 示例补 contains-add；PARAM_DESC 补 contains-add/contains-remove（:34-35 区域）；顶层帮助由 COMMANDS 动态生成（:180-193）自动跟随 |
| MODIFY | `packages/lgdl-web-cli/src/tools.ts` | WEB_CLI_TOOL description 子命令列表删三（:22）；subcommand enum 删三项（:36） |
| MODIFY | `packages/lgdl-web-cli/src/adapters/lgdl.ts` | 注释口径更新（:9 "19 领域符号"、:51 "9 变体"——纯注释，非必需，顺手改） |
| MODIFY | `packages/lgdl-web-cli/src/commands.test.ts` | COMMANDS 清单断言 9 → 6（:13-25）+ 新增 contains 解析断言 |
| MODIFY | `packages/lgdl-web-cli/src/operations.test.ts` | add-group 用例 → add-node kind:'group'（:57-62）；describeOperation 9 变体遍历 → 6（:112-127） |

### 5.3 lgdl-cli（面 3：终端命令面）

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| MODIFY | `packages/lgdl-cli/src/registry.ts` | 删除三 import（:32-34）与三数组项（:55-57）；19 命令 → 16 命令 |
| DELETE | `packages/lgdl-cli/src/commands/add-group.ts` | 三文件整删（add-group.ts 25 行 / remove-group.ts 20 行 / update-group.ts 35 行） |
| DELETE | `packages/lgdl-cli/src/commands/remove-group.ts` | 同上 |
| DELETE | `packages/lgdl-cli/src/commands/update-group.ts` | 同上 |
| MODIFY | `packages/lgdl-cli/src/commands/add-node.ts` | 加 `--contains <ids>` option（:14-20 区域）+ action 透传（:31-38） |
| MODIFY | `packages/lgdl-cli/src/commands/update-node.ts` | 加 `--contains-add <ids>` / `--contains-remove <ids>` option + action 透传（:22-32） |

### 5.4 AI 提示面（面 6）+ 文档面（面 7）

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| MODIFY | `packages/lgdl-web/src/ai/prompts.ts` | 增量命令清单 9 → 6（:48，删 add-group/remove-group/update-group） |
| MODIFY | `packages/lgdl-web/src/ai/AiPanel.tsx` | 4 处 prompt 文案改 node 命令形态：:116（arch 分层）→ "用 add-node --kind group"；:122（datastream 泳道）→ 同上；:139（hint）→ "用 add-node --kind group 给节点归类分层"；:140（prompt）→ "（add-node --kind group --contains / update-node --contains-add）"——「整理分组」动作本身保留 |
| MODIFY | `README.md` | :154 命令表行 → `lgdl-cli add-node --kind group / update-node --contains-add ...`；:168 "9 个增量命令" → "6 个增量命令" |
| MODIFY | `docs/cli-guide.md` | :46-47 速查表两行改写；:197-216 add-group/remove-group 两个详细章节改写为 add-node --kind group --contains / remove-node 等价形态 |
| MODIFY | `docs/ai-agent-guide.md` | :93 示例、:142-143 速查表、:182 完整示例改写 |
| MODIFY | `docs/v0.5-web-ai.md` | :155 命令集表改写 |
| MODIFY | `docs/README-CLI.md`（若存在 group 引用） | ⚠️ 降级项：discovery 已核实 `lgdl-web/public/.../README-CLI.md` 零 group 命令引用（NG-005 排除清单），grep 兜底确认后再动 |

### 5.5 联动面（不落本 feature，R-008）

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| 触发联动 | `.sddu/docs-tree-root/`（8+ 文件） | 核心引擎/core-语义模型.md（:200/:209/:215-226）、核心引擎/web-ai助手.md（:219）、docs-overview.md、source.md、系统架构/*（docs-overview.md、包依赖关系-deps.md）、adr-index.md（:114/:171-180）、**diagrams/ 系列**（architecture-layers/packages/deps 的 .json/.html/.visual-check.json）——归 @sddu-docs，完成后触发（R-008/R-011） |

## 6. 实施设计（变更面落地 + 迁移步骤 + 测试策略）

### 6.1 变更面落地顺序（源自 discovery §6，依赖序：core 先行，命令层消费）

| 顺序 | 变更面 | 内容 | 依赖 |
|:--:|------|------|------|
| ① | lgdl-core mutations/types/index | DD-001~003 落地 + 逻辑并入 + 函数/导出/类型删除 | 无（源头） |
| ② | lgdl-web-cli commands/protocol/help/tools | COMMANDS/buildOperation 收缩 + loud reject 改写 + 帮助与 schema 同步 | ①（LgdlOperation 类型） |
| ③ | lgdl-web-cli operations | describeOperation/OperationMutations/lgdlDispatch 收缩 + 分派透传 | ①（mutations 函数） |
| ④ | lgdl-cli registry/3 文件删除/2 命令补 option | 终端命令面收缩 | ②③（buildOperation/applyOperation） |
| ⑤ | 测试迁移（12+1+2）+ 新增护栏测试 | 等价迁移 + DD-001~003/EC 覆盖 | ①~④（与实现同批） |
| ⑥ | AI 提示 prompts/AiPanel | 命令清单与快捷动作文案 | ②（命令面事实） |
| ⑦ | 文档 README/cli-guide/ai-agent-guide/v0.5-web-ai | 命令口径统一 | ②④ |
| ⑧ | 验证：tsc 全绿 + 各包 test + grep 无残留 + git diff 语义模型零改动 | AC-01~07 | ①~⑦ |
| ⑨ | docs-tree-root 联动（外部触发 @sddu-docs） | 全景文档命令清单与计数 | ⑦ |

> ⚠️ **批次提示（tasks 阶段排布输入）**：①~③ + ⑤ 存在编译/测试强连锁（① 删函数后 ③ 的 import 立即断裂、⑤ 旧用例引用被删函数立即失败），建议按「①→②③④→⑤→⑥→⑦→⑧」任务链排布，中间态不可单独编译/测试通过，但每完成一个批次即可跑 tsc/test 验证。

### 6.2 消息口径变化总表（plan 识别，R-009 —— 比 spec NFR-004 声明的两处更多）

| 旧（group 命令） | 新（node 命令） | 场景 | 声明来源 |
|---|---|---|---|
| `Group not found: "x"` | `Node not found: "x"` | remove/update 不存在 group | NFR-004 / R-006 已声明 |
| `aggregate edge(s)` | `attached edge(s)` | remove 清边 summary | NFR-004 / R-006 已声明 |
| `added group "g2" (label) with 2 member(s)` | `added node "g2" :group (label) with 2 member(s)` | add 建组 summary 前缀 | **R-009（plan 新增）**：FR-001 字面「同一 summary 文案」与 NFR-004「口径统一到 node 命令」存在歧义，plan 决策取**解读 A**——summary 走 addNode 现有文案（信息内容等价：id/label/成员数），不特判 "added group" 文案（特判违背「group 就是 node」哲学且引入分支）。降级方案 B：若验收严格字面要求，addNode 特判 `kind==='group'` 输出旧文案——不推荐，tasks 阶段按解读 A 实现 |
| `removed group "g1"` / `updated group "lane1" (...)` | `removed node "g1"` / `updated node "lane1" (...)` | remove/update summary 前缀 | R-009（plan 新增，同族） |
| `Group id already exists: "g2"` | `Node id already exists: "g2"` | add 重名（含 group 重名） | R-009（plan 新增）：addNode :110 全量 nodes 检查天然覆盖 group 冲突（EC-007 已声明 updateNode 同理），无需双查 |
| `Invalid group id: "x"` | `Invalid node id: "x"` | add id 非法字符 | R-009（plan 新增）：addNode :113-114 校验接管 |
| `Group contains unknown node or group: "m"` | **保留同口径**（addNode 吸收 addGroup 校验集） | contains 未知成员 | FR-002 要求一致 |
| `"m" already belongs to group "g"` | 保留 | contains 重复归属/嵌套冲突 | FR-002 |
| `Group cannot contain itself: "g"` | 保留 | contains 自含 | FR-002 |
| `"m" is already in group "g"` | 保留（containsAdd 场景） | update 追加已在组成员 | FR-014 |
| `Member not found: "m" in group "g"` | 保留（containsRemove 场景） | update 移除不在组成员 | FR-014 |
| （新增）`--contains 仅对 kind:'group' 节点有效（当前 kind: "x"），请显式传 --kind group` | add-node contains 不配 group kind | FR-003/004、EC-001/002（DD-002） |
| （新增）`contains-add/contains-remove 仅对 kind:'group' 节点有效（节点 "x" 的 kind 为 "y"）` | update-node 对非 group 传 contains 成员操作 | FR-015、EC-003 |
| （新增）`分组节点不允许修改 kind（节点 "x" 为 kind:'group'...）；如需删除分组请用 remove-node` | update-node 对 group 改 kind | EC-004（DD-003） |
| （新增）`contains-add/contains-remove: 成员 id 不能为空` | 空串/纯空白 id | EC-008（与 updateNode memberRemove trim 检查 :276-278 同风格） |

### 6.3 测试迁移矩阵（15 项 = mutations.test 12 + commands.test 1 + operations.test 2，FR-016~018）

**mutations.test.ts（12 用例）**：

| 旧用例（行号） | 旧断言关键点 | 新形式（等价迁移） | 断言调整点 |
|---|---|---|---|
| addGroup creates group with members（:215） | groupNodes 数量 / contains / summary "added group" | `addNode(BASE, {id:'g2', label:'G2', kind:'group', contains:['b']})` | summary 断言 → `added node "g2" :group ... 1 member(s)`（R-009） |
| addGroup rejects unknown member（:222） | /unknown node or group/ | `addNode(BASE, {id:'g2', kind:'group', contains:['ghost']})` | 错误消息不变（FR-002 要求一致） |
| addGroup supports nested groups（:226） | 嵌套组合法 + 序列化后可 parse | `addNode(doc, {id:'outer', label:'外层', kind:'group', contains:['inner','b']})` | summary 断言同上 |
| addGroup rejects member already in another group（:243） | /already belongs to group "g1"/ | `addNode(BASE, {id:'g2', kind:'group', contains:['a']})` | 无（错误消息保留） |
| addGroup rejects a group already nested（:247） | /already belongs to group "g3"/ | `addNode(doc, {id:'g4', kind:'group', contains:['g2']})` | 无 |
| addGroup rejects self-containment（:259） | /cannot contain itself/ | `addNode(BASE, {id:'g2', kind:'group', contains:['g2']})` | 无 |
| addGroup rejects invalid id chars（:263） | /Invalid group id/ | `addNode(BASE, {id:'bad group!', kind:'group'})` | 错误消息 → /Invalid node id/（R-009） |
| removeGroup detaches it from parent groups（:267） | 父组 contains 摘除 + 可 parse | `removeNode(doc, 'inner')` | 无（removeNode :161 已等价） |
| removeGroup removes group（:283） | groupNodes 归零 | `removeNode(BASE, 'g1')` | 无 |
| removeGroup throws on missing（:288） | /not found/ | `removeNode(BASE, 'nope')` | 错误消息 → /Node not found/（R-006 已声明） |
| removeGroup auto-cleans aggregate edges（:933） | edges 归零 + summary /aggregate edge/ | `removeNode(doc, 'g1')` | summary 断言 → /attached edge/（R-006 已声明） |
| updateGroup manages members and renames（:2550） | contains ['a','b'] / rename 边引用 / /already in group/ | 拆三段：`updateNode(doc,{id:'lane1',containsAdd:['b']})` → contains ['a','b']；`updateNode(r1.document,{id:'lane1',newId:'lane2'})` → edges[0].from 'lane2'；`updateNode(doc,{id:'lane1',containsAdd:['a']})` → /already in group/ | summary 前缀 group→node（R-009）；memberAdd→containsAdd（DD-001 语义迁移） |

**commands.test.ts（1 用例）**：

| 旧用例（行号） | 新形式 | 断言调整点 |
|---|---|---|
| COMMANDS covers all 9 incremental commands（:13-25） | 断言 6 命令集合：`['add-edge','add-node','remove-edge','remove-node','update-edge','update-node']` | 删三 group 键；可新增 add-node contains / update-node contains-add 解析断言（FR-001/DD-001） |

**operations.test.ts（2 用例）**：

| 旧用例（行号） | 新形式 | 断言调整点 |
|---|---|---|
| applyOperation: add-group places members（:57-62） | `applyOperation(doc(), {op:'add-node', id:'g2', label:'G2', kind:'group', contains:['b']})` | op 变体名 add-node + kind:'group'（DD-002 方向：kind 显式）；groupNodes 断言不变 |
| describeOperation: every variant has readable label（:112-127） | ops 数组删三 group 变体（9→6）；正则改 `^(add|remove|update)-(node|edge)` | 断言集合与 6 变体事实一致 |

**新增护栏测试（plan 建议，spec FR/EC 要求的独立断言，不违反测试守恒 FR-018）**：

| 测试 | 覆盖 |
|---|---|
| addNode contains 不配 kind（默认 kindResolver 注入 process）→ 抛错含 "kind"/"group" 指引 | FR-003 / EC-001（DD-002） |
| addNode contains 配显式非 group kind（entity/state）→ 抛错 | FR-004 / EC-002 |
| updateNode 对非 group 节点传 containsAdd/containsRemove → 抛错 | FR-015 / EC-003 |
| updateNode 对 kind:'group' 传 kind 变更（group→entity）→ 抛错；传 kind:'group'（同值）→ 不报错 | EC-004（DD-003） |
| updateNode 非 group→group（entity→group）→ 允许 | DD-003 反向 |
| containsAdd 已在组 / 已在其他组 / 自含 → 各自抛错 | FR-014（与 addNode 路径错误消息一致） |
| containsRemove 不在组 → 抛错 /Member not found/ | FR-014 |
| contains-add/contains-remove 空串、纯空白 id → 抛错 | EC-008 |
| addNode contains 校验原子性：任一校验失败 document 不变 | FR-002 原子性 |

### 6.4 回归验证总表（AC 映射）

| AC | 验证方式 | 落点 |
|----|---------|------|
| AC-01 三命令全量移除且 loud reject | `grep -r "add-group\|remove-group\|update-group"` 按面核查（packages 8 包 + docs + README）+ NG-005 例外清单核对（examples/*.lgdl、README-CLI.md、CHANGELOG、reviews-*、ROADMAP、specs-tree-web-cli-*） | FR-005~007/019/020 |
| AC-02 add-node --kind group --contains 可用 + 四类校验 + 不配 kind 报错 | mutations.test 迁移用例 + commands.test 断言 + 新增 EC-001~002 测试 | FR-001~004 |
| AC-03 三入口（cli / web-cli 子命令 / AI function calling）均 loud reject 含指引 | cli: `lgdl-cli add-group --help` 等报 unknown command（commander 默认）；web-cli: protocol.test 断言消息含改用指引；AI: tools.ts enum 无三命令 + prompts/AiPanel 无残留 | FR-006/007、NFR-003 |
| AC-04 mutations 面收敛 + LgdlOperation 9→6 + 三处/四处导出同步 | tsc --noEmit 全绿（lgdl-core/lgdl-web-cli/lgdl-cli/lgdl-web）+ grep 无残留 | FR-008~013 |
| AC-05 测试全绿且守恒 | 各包 test 运行 + 迁移矩阵对比（§6.3 无缺项） | FR-016~018、NFR-005 |
| AC-06 零语义模型改动 | `git diff` 文件清单核查：parser.ts/serialize.ts/layout/render/LgdlDocument/LgdlNode/LgdlMember 无 diff（types.ts 仅 LgdlOperation 联合收缩，属命令协议面不属语义模型） | NFR-001 |
| AC-07 文档口径 16 命令 / 6 增量命令 | grep + help 输出目检 | FR-020/021、A-003 |

## 7. 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|:--:|:--:|----------|
| R-001 update-group member 语义 ≠ update-node（唯一不等价点） | 高 | 高 | spec DD-001 已闭环：独立 `--contains-add/--contains-remove` 参数承载 id 语义，member-add/remove 保持类成员语义；§6.2 口径表 + 迁移矩阵 :2550 用例显式映射；护栏测试（非 group 传 contains 操作报错）兜底 |
| R-002 AI 提示词残留（模型继续生成 group 命令 → 全部 loud reject → 对话噪音） | 中 | 高 | prompts.ts:48 + AiPanel.tsx 4 处同批改（⑥）；AC-01 grep 兜底；EC-009 已定义（loud reject 是最终防线，不 alias） |
| R-003 文档残留（用户按文档执行报 unknown command） | 中 | 中 | 文档 5 文件同批改写（⑦）；AC-01/AC-07 grep 兜底；NG-005 例外清单核对防误改历史产物 |
| R-004 kind 默认值陷阱（--contains 不配 --kind group 被静默忽略） | 中 | 中 | DD-002 双保险：buildOperation（命令层早校验）+ addNode（核心层兜底）；新增 EC-001~002 测试 |
| R-005 LgdlOperation 类型收缩连锁（types + operations + index 跨 3 文件） | 中 | 中 | 依赖序落地（①→③）；tsc --noEmit 全绿验收（AC-04）；编译期可发现，无运行时风险 |
| R-006 remove 错误消息口径变化（Group not found→Node not found / aggregate→attached） | 低 | 低 | spec 已声明接受（EC-006）；测试断言与文档同步更新（§6.2 口径表） |
| R-007 update-node 对 group 改 kind 产生孤儿 contains | 低 | 低 | DD-003 护栏（mutations 层 :264 后拦截，group→非 group 抛错；反向允许）；新增 EC-004 测试 |
| R-008 docs-tree-root 跨树联动（本 feature 不落盘） | 低 | 中 | 外部依赖 @sddu-docs；**plan 新增发现**：联动面超 discovery 预估的 6 文件，含 diagrams/ 系列（architecture-layers/packages/deps 的 .json/.html/.visual-check.json）与核心引擎/web-ai助手.md:219——§5.5 提供完整清单，完成后触发联动 |
| **R-009（plan 新增）** summary/错误消息前缀 group→node 口径面扩大（added group→added node、Invalid group id→Invalid node id、Group id already exists→Node id already exists） | 高 | 中 | §6.2 口径变化总表全量列出 + 迁移矩阵逐用例标注断言调整点；含 FR-001「同一 summary 文案」歧义决策（解读 A，见 §6.2） |
| **R-010（核实排除）** 其他包引用 group 命令 | — | — | 已 grep 排除：lgdl-web-op-cli / lgdl-layout / lgdl-render / lgdl-router / web-cli-base 零 group 命令/函数引用（仅 lgdl-web/src 的 prompts.ts 与 AiPanel.tsx） |
| **R-011（plan 新增）** KNOWN_PARAMS 未补新参数导致 update-node 传 contains-add 报未知参数 | 中 | 低 | commands.ts:89-94 补 `'contains-add'/'contains-remove'`（§2.3 DD-001 落地表已列）；commands.test 新增断言兜底 |

## 8. 工作量估算

| 变更面 | 内容 | 工作量 |
|------|------|:--:|
| ① lgdl-core | mutations 重构（DD 三护栏 + 校验 helper + 逻辑并入 + 删除 3+3 符号）、types.ts 收缩、index.ts 导出 | 1.5 人日 |
| ② lgdl-web-cli | commands/protocol/help/tools/operations/adapters 6 文件同步 | 1 人日 |
| ③ lgdl-cli | registry + 3 文件删除 + add-node/update-node 补 option | 0.5 人日 |
| ④ 测试 | 15 项迁移 + 9 项新增护栏测试 | 1 人日 |
| ⑤ AI 提示 + 文档 | prompts/AiPanel + README/cli-guide/ai-agent-guide/v0.5-web-ai | 0.5 人日 |
| ⑥ 验证 | tsc 全绿 + 各包 test + grep 核查 + git diff 语义模型零改动 + AC 映射 | 0.5 人日 |
| **合计** | | **约 5 人日** |

> docs-tree-root 联动（R-008）为外部依赖，工作量计入 @sddu-docs 侧，不在本 feature 内。

## 9. 生成的 ADR

> 按既有惯例（specs-tree-v06-closeout/plan.md：D-001 已于 spec 定案，不单独生成 ADR 文件），本 Feature 的 3 项设计决策已在 spec §8 闭环（DD-001~003），本表为落地引用，**不重复生成独立 ADR 文件**；若需汇入全局 adr-index 由 @sddu-docs 联动时决定（R-008）。

| ADR | 标题 | 状态 |
|-----|------|:--:|
| ADR-001（= spec DD-001） | update-node 新增 `--contains-add/--contains-remove` 承载 group 成员 id 语义（member-add/remove 保持类成员语义） | ACCEPTED |
| ADR-002（= spec DD-002） | add-node 传 `--contains` 不配 `--kind group` 时 loud 报错（禁止自动置 kind） | ACCEPTED |
| ADR-003（= spec DD-003） | update-node 禁止修改 kind:'group' 节点的 kind（防孤儿 contains；非 group→group 允许） | ACCEPTED |

## 10. 开放问题（承接 spec §10）

| # | 问题 | 本 plan 处置 |
|---|------|------|
| 1 | docs-tree-root 全景联动（Q-019/R-008） | 提供完整联动清单（§5.5，含 diagrams 系列）；完成后手动触发 @sddu-docs |
| 2 | cli 侧 loud reject 文案形态 | 采纳 commander 默认 unknown command（FR-006）；web-cli 侧 protocol.ts:143 改写为带改用指引（FR-007）。降级方案：若需 cli 侧同样带指引，可在 registry 层注册隐藏命令输出指引——**不推荐**（违背 commander 惯例、引入额外代码） |
| 3 | 版本发布节奏（破坏性变更） | 随下一 release 发布并在 CHANGELOG 新增条目（历史条目不改，NG-005）；发布时机由 release 流程决策 |

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建 — 3 决策点落地设计（DD-001~003 双保险/护栏细节）+ 7 变更面实施设计 + 迁移步骤序列 + 测试迁移矩阵（15 项 + 9 项新增）+ 口径变化总表（R-009）+ 风险矩阵（R-001~008 + 3 项新增）+ 工作量约 5 人日 | 2026-09-01 | SDDU Plan Agent |
