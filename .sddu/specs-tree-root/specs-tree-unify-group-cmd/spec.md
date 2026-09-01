# Feature Specification：group 命令合并（命令层语义统一）

> **文档定位**: SDDU 需求规范 — 定义功能需求、非功能需求和边界情况，作为 plan 阶段的输入
> **前置依赖**: discovery.md（问题清单，6 面 19 项 Q-001~Q-019 / add-node 补 contains 现状核实 / 3 个 spec 决策点 / 8 项风险）
> **创建人**: SDDU Spec Agent
> **创建时间**: 2026-09-01
> **版本**: v1.0
> **更新人**: SDDU Spec Agent
> **更新时间**: 2026-09-01
> **更新说明**: 初始创建 — 基于 discovery 基线落盘需求规范；3 个 spec 决策点自主决策闭环（DD-001~DD-003），19 项 Q 全部映射为 FR/NFR/EC

---

## 1. 元数据

| 字段 | 值 |
|------|-----|
| Feature ID | FR-UNIFY-GROUP-CMD |
| 名称 | group 命令合并（specs-tree-unify-group-cmd） |
| 优先级 | P0（命令层半统一状态持续产生双入口维护成本；方案已由作者闭环） |
| 目标版本 | 随下一个 LGDL release（命令面收缩属破坏性变更，需版本记录） |

## 2. 上下文

> 背景与目标（命令层语义统一）

**背景**：v0.6 group-as-node 已在**语义模型层**完成统一——group 就是 `kind:'group'` 的节点（types.ts:1-9 头注释、`LgdlNode.contains` :146），parser/serialize/layout/render 全部按节点处理。但**命令层仍保留 add-group/remove-group/update-group 三件套**，与 add-node/remove-node/update-node 并存，构成「group 就是 node」哲学在命令层的半统一状态：

- 同一语义（分组）两种命令入口、两套参数（add-group `--contains` vs add-node `--kind group`）、两套心智模型；
- add-node 缺 `--contains`，创建"带成员的组"必须用 add-group；
- 任何 group 语义演进需双份命令维护。

**作者决策（2026-09-01 方案 B，已闭环）**：add-node 补 `--contains`（`--kind group --contains a,b`）；group 三命令从所有命令面移除（loud reject 提示改用 node 命令）；底层 mutations 收敛。零语义模型改动、零新增功能、不留兼容包袱。

**目标用户**：终端开发者（lgdl-cli，19 命令 → 16 命令）、AI Agent（lgdl-web-cli function calling，9 增量命令 → 6 增量命令）、LGDL 作者（架构一致性）。

**关键事实（discovery 已核实）**：removeNode/updateNode 底层已能处理 kind:'group'（mutations.ts:161/291）；remove-group 与 removeNode 行为已等价（仅错误消息/summary 文案差异）；**update-group 的 member-add/member-remove 是 contains 的 id 语义，与 update-node 的类成员结构语义（assertMemberShape）不等价**——这是合并边界上唯一不等价点，本规范 §8 决策点① 已闭环。

## 3. 目标与非目标

### 3.1 目标 (Goals)

| # | 目标描述 |
|---|---------|
| G-001 | 命令层彻底贯彻「group 就是 node」：group 三命令从所有命令面移除，node 命令成为分组操作的唯一入口 |
| G-002 | add-node 补齐 `--contains`（仅 `--kind group` 有效），创建"带成员的组"能力不丢失 |
| G-003 | 底层 mutations 收敛：addGroup/removeGroup/updateGroup 逻辑并入 addNode/removeNode/updateNode，函数与导出移除 |
| G-004 | loud reject：指向已移除命令的任何输入产生显式、含改用指引的报错，不留兼容包袱（LGDL 哲学） |
| G-005 | 行为等价迁移：原 group 命令全部能力以 node 命令等价形式保留，测试守恒证明 |

### 3.2 非目标 (Non-Goals)

| # | 明确不做 |
|---|---------|
| NG-001 | 语义模型改动：LgdlDocument/LgdlNode/parser/serialize/layout/render 零改动（group-as-node 数据模型已定） |
| NG-002 | 新增任何业务功能：需求覆盖集 = addGroup/removeGroup/updateGroup 原能力全集，不扩展（如 update-node 不支持整体替换 contains 列表、不支持 contains 排序/去重策略变更） |
| NG-003 | alias 兼容层：不保留 add-group 等作为别名/软删除（loud reject，不留兼容包袱） |
| NG-004 | docs-tree-root 全景文档联动（Q-019/R-008）：归 @sddu-docs 维护，本 feature 只落 specs-tree，完成后触发联动 |
| NG-005 | 历史产物改写：CHANGELOG.md、docs/reviews-2026-08-24/*、ROADMAP.md、specs-tree-web-cli-v2/*、specs-tree-web-cli-extract/*、examples/*.lgdl（语法文档）、lgdl-web/public/.../README-CLI.md、web-cli-base 机制层——已核实零命令引用或不改 |

### 3.3 需求边界 (In / Out)

**In（本 Feature 落地范围）**：
- add-node 命令补 `--contains`（cli + web-cli 命令面、buildOperation 解析、op 类型、分派透传、mutations 实现）
- add-group/remove-group/update-group 三命令从命令定义面/终端面/分派面/AI 提示面/文档面全量移除
- loud reject 落点：protocol.ts:143 未知子命令提示列表改写 + cli commander 默认 unknown command
- mutations 收敛：addGroup/removeGroup/updateGroup 函数与 Options 类型移除，逻辑并入 node 三函数
- LgdlOperation 联合类型收缩（9 → 6 变体），index.ts 导出同步
- 测试迁移（mutations.test 12 用例 + commands.test 1 + operations.test 2）与文档同步

**Out（明确排除）**：见 NG-001~NG-005。

## 4. 用户故事

| # | 作为… | 我想要… | 以便… |
|---|-------|---------|-------|
| US-001 | 终端开发者 | 用 add-node 一个命令创建带成员的组（`add-node --kind group --contains a,b`），不再记忆 add-group 专用命令 | 分组与节点操作同一套心智模型、同一套参数风格 |
| US-002 | AI Agent | system prompt 与 function schema 中只有 6 个增量命令，add-node 即涵盖"创建分组" | 选型无歧义，不再在 add-node 与 add-group 间二选一 |
| US-003 | 终端开发者 | 误输 add-group/remove-group/update-group 时得到明确报错和改用指引 | 不被 unknown command 卡住，两秒内找到正确命令 |
| US-004 | LGDL 作者 | 命令层与语义模型层完全对齐，group 语义演进只需维护 node 命令一条线 | 消除半统一状态的持续维护成本 |

## 5. 功能需求 (FR)

> 按「A. add-node 补 contains / B. 三命令移除 loud reject / C. mutations 收敛 / D. 测试迁移 / E. 文档同步」五组。验收标准均可独立验证。

### A. add-node 补 contains

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-001 | add-node 支持 `--contains <ids>` 参数（逗号分隔 id 列表，与 add-group 时代 `split(',')` 解析逻辑一致），创建 `kind:'group'` 节点并写入成员 | `add-node --id g2 --kind group --contains a,b` 产出节点 `{id:'g2', kind:'group', contains:['a','b']}`；行为与旧 `addGroup` 等价（同一构造结果、同一 summary 文案） | P0 |
| FR-002 | add-node `--contains` 的成员校验完整复用 addGroup 校验集：自含（cannot contain itself）、未知成员（unknown node or group）、重复归属（already belongs to group）、嵌套组冲突；任一失败 loud 报错且文档原子不变 | 对四类非法输入分别断言抛错（错误消息与旧 addGroup 一致）且返回的 document 与输入相等 | P0 |
| FR-003 | **决策点②（DD-002）**：add-node 传 `--contains` 但未传 `--kind group` → loud 报错，要求显式 `--kind group`；禁止静默忽略（现状副作用：contains 会被 KNOWN_PARAMS 认收后静默丢弃） | `add-node --id g2 --contains a` 抛错，消息含"kind"与"group"指引；无任何文档变更 | P0 |
| FR-004 | add-node 传 `--contains` 且显式 kind 非 group（如 `--kind entity --contains a`）→ loud 报错，消息与语义层口径一致（parser.ts:224 "contains is only valid on kind: 'group' nodes" 精神） | 对每种非 group kind 断言抛错；错误消息风格与 parser.ts:224 同口径 | P1 |

### B. 三命令移除 + loud reject

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-005 | web-cli 命令定义面移除三命令：COMMANDS 注册表（commands.ts:65-85）、buildOperation 三 case（:202-220）、protocol.ts parseWebCliCommand 三 case 与头注释子命令枚举（:118-129、:16-19）、tools.ts function schema 子命令 enum 与 description（:22、:36） | commands.test.ts COMMANDS 清单断言改 6 命令后全绿；grep packages/lgdl-web-cli/src 无 `add-group\|remove-group\|update-group` 残留 | P0 |
| FR-006 | 终端 cli 面移除三命令：registry.ts COMMANDS 数组与 import（:32-34、:55-57）、commands/ 下 add-group.ts/remove-group.ts/update-group.ts 三文件删除；命令计数 19 → 16 | `lgdl-cli add-group --help` / `lgdl-cli remove-group x` / `lgdl-cli update-group --id g` 均报 unknown command（commander 默认）；registry 无三命令引用 | P0 |
| FR-007 | **loud reject 主落点**：web-cli 收到 add-group/remove-group/update-group 子命令时，报错消息明确指引改用 node 命令（protocol.ts:143 未知子命令提示列表改写） | 调用 parseWebCliCommand 传三命令名抛错，消息包含"add-node --kind group --contains"（add-group 场景）/ "remove-node"（remove-group 场景）/ "update-node"（update-group 场景）指引；提示列表不再含三命令 | P0 |
| FR-008 | LgdlOperation 联合类型收缩：移除 add-group/remove-group/update-group 三变体（types.ts:253-263，联合 9 → 6）；add-node 变体补 `contains?: string[]`；update-node 变体补 `containsAdd?: string[]` / `containsRemove?: string[]` | 各包 `tsc --noEmit` 通过；grep types.ts 无三 op 变体 | P0 |
| FR-009 | operations.ts 分派面同步：describeOperation 移除三 case（:58-63）、OperationMutations 移除三成员（:75-77）、lgdlDispatch 移除三分派（:138-157）；add-node 分派透传 contains（参考 :138-145 旧 add-group 逻辑）、update-node 分派透传 containsAdd/containsRemove | operations.test.ts 9 变体遍历改 6 后全绿；lgdlDispatch 对 add-node op 的 contains 生效 | P0 |
| FR-010 | index.ts 导出同步：移除 addGroup/removeGroup/updateGroup（:14-16）与 AddGroupOptions/UpdateGroupOptions（:23-24）四处导出 | 消费方（lgdl-web-cli）在移除引用后编译通过；grep index.ts 无三符号导出 | P0 |

### C. mutations 收敛

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-011 | addGroup 逻辑并入 addNode：AddNodeOptions 补 `contains?: string[]`；addNode 在 kind==='group' 且 contains 定义时执行 addGroup 校验集（mutations.ts:393-414）并写 contains；addGroup 函数移除 | `addNode(doc,{id,kind:'group',contains:[...]})` 与旧 `addGroup` 对全部合法/非法输入逐字节等价（错误消息、结果文档、summary）；mutations.ts 无 addGroup 导出 | P0 |
| FR-012 | removeGroup 逻辑并入 removeNode（removeNode 已能删 kind:'group'：:158-159 过滤、:161 父组 contains 摘除、:164 清边）；removeGroup 函数移除；错误消息按 R-006 口径统一为 `Node not found` | `removeNode(doc,'g1')` 对 group 节点行为与旧 removeGroup 等价（父组摘除 + 聚合边清理）；不存在时报 `Node not found: "g1"`；mutations.ts 无 removeGroup 导出 | P0 |
| FR-013 | updateGroup 逻辑并入 updateNode（**决策点①，DD-001**）：成员操作经新增 `containsAdd?: string[]` / `containsRemove?: string[]` 承载（contains 的 id 语义）；label/attrs/newId 复用 updateNode 既有路径（rename 重写父组 contains :291-293 与边引用 :308-312 已具备）；updateGroup 函数与 UpdateGroupOptions 移除 | `updateNode` 对 kind:'group' 节点：`containsAdd:['b']` 追加成员、`containsRemove:['a']` 移除成员、newId/label/attrs 等价于旧 updateGroup；mutations.ts 无 updateGroup 导出 | P0 |
| FR-014 | contains 语义校验入口统一：addNode 的 contains 校验与 updateNode 的 containsAdd/containsRemove 校验复用同一校验集（自含 / 未知成员 / 重复归属 / 已在组 / 不在组 / 目标非 group 节点 loud 报错） | 每个校验场景有独立测试断言；同一非法输入在 add 与 update 路径下错误消息一致 | P1 |
| FR-015 | updateNode 对非 group 节点传 containsAdd/containsRemove → loud 报错（contains 仅 kind:'group' 有意义，types.ts:143-144） | `updateNode(doc,{id:'x',containsAdd:['b']})`（x 为 entity）抛错，消息含 contains 仅 group 有效口径 | P1 |

### D. 测试迁移

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-016 | mutations.test.ts 12 个 group 用例全部迁移为 node 命令等价形式：import 移除 addGroup/removeGroup/updateGroup 三符号（:10-12）；addGroup 用例 → `addNode(BASE,{id,kind:'group',contains:[...]})`（:215-265）；removeGroup 用例 → removeNode（:267-286、:933-949）；updateGroup 成员用例 → containsAdd/containsRemove（:2550-2566）；updateGroup rename/label/attrs 用例 → updateNode | 迁移后 mutations.test.ts 全绿；grep 无 addGroup(/removeGroup(/updateGroup( 调用残留 | P0 |
| FR-017 | commands.test.ts COMMANDS 清单断言 9 → 6（:13-25）；operations.test.ts group 用例迁移（:57-62 add-group 落成员 → add-node kind:'group'；:112-127 describeOperation 9 变体遍历 → 6 变体） | 两测试文件全绿；断言集合与 6 命令事实一致 | P0 |
| FR-018 | **测试守恒**：旧 group 用例（12+1+2 = 15 项）全部以等价形式保留，无行为覆盖丢失 | 迁移前后用例矩阵对比：每个旧 group 用例可映射到唯一新用例（行为等价性由测试断言证明）；测试总数不减少 | P1 |

### E. 文档同步

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-019 | AI 提示面：prompts.ts:48 增量命令清单 9 → 6；AiPanel.tsx 4 处 prompt 文案改 node 命令形态（:116、:122、:139-140——"整理分组"动作本身保留，仅命令表述改 add-node --kind group / update-node --contains-add 等） | grep packages/lgdl-web/src 无 add-group/remove-group/update-group 残留；"整理分组"快捷动作仍可用且生成 node 命令 | P1 |
| FR-020 | 用户文档改写为 node 命令等价形态：README.md:154（及 :168 "9 个增量命令"表述）、docs/cli-guide.md:46-47 速查表与 :197-216 两个详细章节、docs/ai-agent-guide.md:93/:142-143/:182、docs/v0.5-web-ai.md:155 命令集表 | grep README.md 与 docs/ 无三命令引用（NG-005 历史产物除外清单验证）；文档口径统一为 16 命令 / 6 个增量命令（A-003） | P1 |
| FR-021 | help.ts 同步：INCR_EXAMPLES/INCR_SUMMARIES 移除 group 三条（:119-121、:132-134）；add-node 示例改为含 `--kind group --contains` 形态（:113）；PARAM_DESC.contains 保留（:36，add-node 复用）；顶层帮助由 COMMANDS 动态生成自动跟随 | help.test.ts 全绿；help 输出中 add-node 示例含 --contains；顶层命令列表无三命令 | P1 |

## 6. 非功能需求 (NFR)

| ID | 类别 | 需求描述 | 验收标准 |
|----|------|---------|---------|
| NFR-001 | 架构一致性 | 零语义模型改动：LgdlDocument/LgdlNode/LgdlMember/parser/serialize/layout/render 零变更 | git diff 范围仅限命令层/mutations/LgdlOperation/文档/测试文件；语义模型文件无 diff |
| NFR-002 | 范围约束 | 零新功能：需求覆盖集 = addGroup/removeGroup/updateGroup 原能力全集，不新增任何行为项 | 变更清单与 §5 FR 一一映射；无 FR 之外的实现行为（plan 阶段以此审计） |
| NFR-003 | 可用性（loud reject） | 任何指向已移除命令的输入（cli 子命令、web-cli 子命令、AI function calling）产生显式、可操作、含改用指引的错误；禁止静默忽略或静默成功 | 对三类输入路径各断言错误输出含指引文案（FR-007）；全仓无"静默丢弃 contains"路径（FR-003 覆盖） |
| NFR-004 | 行为等价 | 合并后 node 命令在等价输入下与原 group 命令行为一致（结果文档、summary、错误消息——除 R-006 已声明口径：`Group not found`→`Node not found`、`aggregate edge(s)`→`attached edge(s)`） | 迁移测试（FR-016~018）等价性断言全绿；R-006 两处口径变化有显式测试断言 |
| NFR-005 | 测试守恒 | 删除用例全部等价迁移；测试总数不减少，覆盖不丢失 | 迁移前后用例矩阵对比无缺项（FR-018 验收） |
| NFR-006 | 编译完整性 | LgdlOperation 类型收缩跨 3 文件（types.ts + operations.ts + index.ts）连锁同步，无编译残留 | 各包 `tsc --noEmit`（或 build）全绿；CI 无类型错误 |
| NFR-007 | 一致性护栏 | 新增错误消息与语义层口径一致：contains 相关错误沿用 parser.ts:224 的 "contains is only valid on kind: 'group'" 风格 | 抽查新增错误消息文案风格与 parser 口径一致 |

## 7. 边界情况 (EC)

| ID | 场景 | 处理方式 |
|----|------|---------|
| EC-001 | add-node 传 `--contains` 但未配 `--kind`（kindResolver 默认 process/entity/state 依 docType 变化） | **loud 报错**，要求显式 `--kind group`（DD-002）；禁止自动置 kind——kindResolver 默认值依 docType 变化，自动置 group 会与文档类型默认语义冲突 |
| EC-002 | add-node 传 `--contains` 配显式非 group kind | loud 报错，消息与 parser.ts:224 同口径（FR-004） |
| EC-003 | update-node 对非 group 节点传 containsAdd/containsRemove | loud 报错（FR-015） |
| EC-004 | update-node 对 kind:'group' 节点改 `--kind`（如 group → entity） | **禁止**，loud 报错（DD-003）：改掉 group kind 会留下孤儿 contains（types.ts:144 仅 group 有意义）；错误消息含"分组节点不允许修改 kind"及指引 |
| EC-005 | contains 成员校验失败：自含 / 未知成员 / 重复归属 / 嵌套组冲突 / 已在组 / 不在组 | loud 报错且文档原子不变（FR-002/FR-014）；错误消息与旧 addGroup/updateGroup 一致 |
| EC-006 | 错误消息口径变化：`Group not found` → `Node not found`、`aggregate edge(s)` → `attached edge(s)`（R-006） | 接受（loud reject 范畴）；测试断言与用户文档同步更新 |
| EC-007 | update-node rename 至已存在 id（含 group id） | 冲突报错（updateNode :271 现有 doc.nodes 检查天然覆盖——group 即 node，无需双查；updateGroup 旧双查逻辑随函数移除） |
| EC-008 | `--contains-add`/`--contains-remove` 传空串、纯空白 id | loud 报错（与 updateNode memberRemove trim 检查 :276-278 同风格） |
| EC-009 | AI/用户仍生成旧 group 命令（模型记忆、遗留提示词） | 被 loud reject 并给出改用指引（FR-007）；不静默执行、不 alias（R-002 缓解：prompts/AiPanel 同步改，FR-019） |
| EC-010 | removeNode 删除不存在的 group id | 报 `Node not found`（FR-012 口径）；与旧 removeGroup 的 `Group not found` 差异由 EC-006 覆盖 |

## 8. 设计决策记录（3 决策点结论）

> discovery 标记的 3 个 spec 决策点，依据「零歧义、AI 可理解、loud」三原则自主决策，结论供 plan 阶段直接排任务。

### DD-001 决策点①（R-001，最高）：update-group → update-node 的 member 语义迁移

**问题**：updateGroup 的 memberAdd/memberRemove 是 **contains 的 id 语义**（mutations.ts:482-511：id 存在性 / 重复归属校验，操作 contains 数组）；updateNode 的 memberAdd/memberRemove 是 **结构化类成员语义**（LgdlMember，assertMemberShape :16-34，kind=attribute|method，`--member-add kind=method,name=checkout`）。两者**语义不等价**：`update-group --member-add c` ≠ `update-node --member-add c`。

**决策：选项 b —— update-node 新增独立参数 `--contains-add <ids>` / `--contains-remove <ids>`（contains 的 id 语义），member-add/member-remove 保持类成员语义不变。**

**理由**：
1. **零歧义**：同一 flag 恒定同一含义，不依赖目标节点 kind。选项 a（kind 分支）下 `--member-add` 的含义随目标节点 kind 漂移（group → id、entity → LgdlMember spec），且同一 flag 需承载两种值语法（裸 id vs `kind=,name=` spec），解析面分裂——用户与 AI 必须预知目标 kind 才能理解命令，违背零歧义。
2. **AI 可理解**：`--contains-add`/`--contains-remove` 自描述（操作 contains 列表），与 add-node 新 `--contains` 对称——创建用 `--contains`，追加用 `--contains-add`，移除用 `--contains-remove`，同一概念同一命名族，function schema 对模型友好。
3. **loud**：作用于非 group 节点时显式报错（FR-015），而非隐式改义后静默执行。
4. **能力守恒**：覆盖 updateGroup 全部能力（memberAdd/memberRemove + label/attrs/newId 复用 updateNode 既有路径），不新增语义（整体替换 contains 列表等明确 out of scope，NG-002）。

### DD-002 决策点②（R-004）：add-node 传 `--contains` 不配 `--kind group`

**问题**：kindResolver 默认依 docType 返回 process/entity/state（commands.ts:114-118），`add-node --contains a,b` 不配 `--kind group` 时 kind 落为非 group，contains 被**静默忽略**（types.ts:144）→ 静默数据错（discovery §5.1 现状副作用已证实 KNOWN_PARAMS 认 contains 不报未知参数）。

**决策：loud 报错——要求显式 `--kind group`，禁止自动置 kind=group。**

**理由**：
1. **LGDL 零猜测哲学**：语义层 parser.ts:224 已是同口径（"contains is only valid on kind: 'group' nodes"），命令层护栏应与语义层一致；自动置 kind 是"替你猜"，与哲学相悖。
2. **自动置 kind 与 docType 默认语义冲突**：如 uml-class 文档默认 kind=entity，自动置 group 会静默改变文档语义分类，破坏默认行为可预测性。
3. **loud 报错保留可修复性**：报错即提示用户意图可能错误（本想把节点放进某组却用了 contains），引导显式声明，错误在源头暴露而非在数据里潜伏。

### DD-003 决策点③（R-007）：update-node 对 kind:'group' 节点改 --kind 的护栏

**问题**：updateNode 允许改 kind（mutations.ts:302），改掉 group kind 会留下孤儿 contains（types.ts:144 contains 仅 group 有意义）；updateGroup 原本无 kind 参数。

**决策：禁止——update-node 对 kind:'group' 节点传 `--kind` 时 loud 报错；反向（非 group → group）维持 updateNode 既有行为（允许，产生空 contains，无孤儿风险）。**

**理由**：
1. **防静默数据错**：group → 非 group 使 contains 字段失去语义成为孤儿数据，且文档校验（parser.ts:224）会在下次解析时报错——禁止在源头拦截。
2. **能力守恒**：updateGroup 原本无 kind 参数，"group 不可被 update 改 kind"是原能力边界；禁止恰好保持该边界，不新增语义。
3. **反向允许无风险且属既有行为**：非 group → group 只产生空 contains（无孤儿），是 updateNode 既有能力（:302），不属于本 feature 新增，不做额外限制（最小护栏原则）。

## 9. 验收标准（可验证）

> 全部验收以实际执行为准（测试运行 / grep / git diff / tsc），非人工目检。

| # | 验收标准 | 验证方式 | 对应 |
|---|---------|---------|------|
| AC-01 | group 三命令全量移除且 loud reject：packages（lgdl-core/lgdl-web-cli/lgdl-cli/lgdl-web）与 docs/README 无 add-group/remove-group/update-group 命令引用（NG-005 历史产物除外清单逐项验证） | `grep -r "add-group\|remove-group\|update-group"` 按面核查 + 例外清单核对 | FR-005~007/019/020 |
| AC-02 | `add-node --kind group --contains a,b` 可用且与旧 add-group 行为等价（含四类校验）；`--contains` 不配 `--kind group` loud 报错 | mutations.test 迁移用例 + commands.test 断言 + 新增 EC-001~002 测试全绿 | FR-001~004 |
| AC-03 | 对 add-group/remove-group/update-group 的任一入口（cli 命令 / web-cli 子命令 / AI function calling）均 loud reject 且含改用指引（add-node --kind group --contains / remove-node / update-node） | 三条入口路径的错误输出断言 | FR-006/007, NFR-003 |
| AC-04 | mutations 面收敛：lgdl-core 无 addGroup/removeGroup/updateGroup 导出与实现；LgdlOperation 联合 9 → 6（add-node 含 contains、update-node 含 containsAdd/containsRemove）；operations.ts 三处与 index.ts 四处导出同步移除 | tsc 全绿 + grep 无残留 | FR-008~013 |
| AC-05 | 测试全绿且守恒：mutations.test / commands.test / operations.test / protocol.test / help.test / tools.test / exec.test 全部通过；旧 15 项 group 用例全部等价迁移（矩阵对比无缺项） | 各包 test 运行 + 用例矩阵 | FR-016~018, NFR-005 |
| AC-06 | 零语义模型改动：LgdlDocument/LgdlNode/LgdlMember/parser/serialize/layout/render 文件零 diff | `git diff` 文件清单核查 | NFR-001 |
| AC-07 | 文档口径统一：16 命令 / 6 个增量命令表述落地；help 输出、README、cli-guide、ai-agent-guide、v0.5-web-ai 无 group 命令残留 | grep + help 输出目检 | FR-020/021, A-003 |

## 10. 开放问题

| # | 问题 | 状态 |
|---|------|:--:|
| 1 | docs-tree-root 6 文件全景联动（Q-019/R-008：core-语义模型.md、docs-overview.md×2、source.md、deps.md、adr-index.md 的命令清单与计数）——本 feature 不落盘，完成后需手动触发 @sddu-docs 更新 | 待联动（外部依赖） |
| 2 | cli 侧 loud reject 文案形态：commander 默认 unknown command 输出 vs 自定义补充指引（web-cli 侧 FR-007 已定 protocol.ts:143 改写，cli 侧是否在 registry 之外附加指引消息） | 待 plan（不改变需求，仅实现细节） |
| 3 | 版本发布节奏：命令面收缩为破坏性变更，是否随下一个 release 一起发布并在 CHANGELOG 记录（CHANGELOG.md 历史条目不改，新条目新增） | 待决策（release 流程） |

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建 — 19 项 Q 全量映射 FR/NFR/EC；3 决策点闭环（DD-001 选项 b / DD-002 loud / DD-003 禁止）；验收标准 7 项 | 2026-09-01 | SDDU Spec Agent |
