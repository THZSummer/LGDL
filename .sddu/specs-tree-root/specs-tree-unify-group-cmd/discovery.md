# 问题挖掘报告：specs-tree-unify-group-cmd（group 命令合并）

> **文档定位**: SDDU 问题挖掘报告 — 记录用户问题、痛点和场景，作为 spec 阶段的输入（本 Feature 为轻量 discovery：方案已定「方案 B」，聚焦**现状全量盘点和合并边界**，不做访谈）  
> **前置依赖**: 无（工作流起点；前置完成项：v0.6 group-as-node 语义统一、V2 9 包体系 d03dca4、收口五件套 0489db9）  
> **创建人**: SDDU Discovery Agent  
> **创建时间**: 2026-09-01  
> **版本**: v1.0  
> **更新人**: SDDU Discovery Agent  
> **更新时间**: 2026-09-01  
> **更新说明**: 初始创建 — 轻量全量盘点（命令定义面 / 终端命令面 / 底层 mutation 面 / 操作分派面 / 测试面 / 文档与 AI 提示面），add-node 补 contains 现状核实，合并边界与风险清单

---

## 1. 问题定义

| 核心问题 | 业务影响 | 不解决的成本 |
|---------|---------|------------|
| **命令层与语义模型层半统一**：v0.6 已将 group 统一为 `kind:'group'` 节点（types.ts:1-9 头注释、LgdlNode.contains types.ts:146），但命令层仍保留 add-group/remove-group/update-group 三件套，与 node 命令（add-node/remove-node/update-node）并存 | 「group 就是 node」哲学在命令层未贯彻：同一语义（分组）有两种命令入口、两套心智模型、两套参数（add-group --contains vs add-node --group）；任何 group 语义演进需双份命令维护 | 命令层持续与已统一的语义模型背离，半统一状态固化；后续 group 功能（成员操作、嵌套等）每加一个都要在两套命令上各实现一遍 |
| **add-node 缺 --contains**：创建分组必须用 add-group，add-node 即使传 `--kind group` 也无法携带成员（现状核实见 §3.3 / §5.2） | 用户无法用统一 node 命令创建"带成员的组"，被迫记忆专用命令 | group 创建语义分散在两个命令面，合并后 add-node 承载能力不全 |

**决策（作者已闭环，2026-09-01 方案 B）**：add-node 补 `--contains`（`--kind group --contains a,b`）；group 三命令从所有命令面移除；loud reject 提示改用 node 命令；底层 mutations 收敛。零语义模型改动、零新增功能、不留兼容包袱。

---

## 2. 用户画像

| 用户角色 | 典型场景 | 关键痛点（证据） | 当前应对方式 |
|---------|---------|----------------|------------|
| LGDL 作者（方案决策者） | 审视架构一致性时发现命令层与模型层脱节 | 「group 就是 node 哲学，命令层还留着三件套，半统一状态」 | 决策方案 B 立项（state.json notes 2026-09-01） |
| 终端开发者（lgdl-cli） | 用 CLI 增量编辑 .lgdl 文件，加分组/删分组/改分组 | 需记忆 19 个命令（registry.ts:38-58）；分组操作与节点操作是两套命令、两套参数 | 查 cli-guide.md 命令表（:46-47）现学现用 |
| AI Agent（lgdl-web-cli / function calling） | 经 `lgdl-web-cli` 工具或提示词驱动编辑图，为节点归类分层 | system prompt 与快捷动作文案混列 9 个增量命令（prompts.ts:48；AiPanel.tsx:116/:122/:139-140），模型需在 add-node 与 add-group 间选型 | 靠 --help 自文档（help.ts 动态生成）临时分辨 |

> 轻量说明：本 Feature 方案已定，无访谈产出；上述场景均以代码/文档证据支撑。

---

## 3. 问题清单（全量出现面盘点）

> 每项附文件:行号证据（只读核实，2026-09-01）。这是本 Feature 的合并边界输入，spec/plan 阶段以此为准。

### 3.1 命令定义面（lgdl-web-cli）

| ID | 问题描述 | 证据位置 | 处置 |
|----|---------|---------|------|
| Q-001 | COMMANDS 注册表含 add-group/remove-group/update-group 三个 CommandSpec（参数/必填/changeKeys 规格） | commands.ts:65-85 | 移除（add-node optional 补 'contains' :28） |
| Q-002 | buildOperation 对 group 三命令的分派 case（add-group :202-208 / remove-group :209-210 / update-group :211-220） | commands.ts:202-220 | 移除；add-node case（:144-158）补 contains 解析 |
| Q-003 | parseWebCliCommand 的 group 三 case + 未知子命令提示列表含三命令 + 头注释子命令枚举 | protocol.ts:118-129（case）、:143（提示列表）、:16-19（头注释） | 三 case 移除；:143 提示列表改写并作为 **loud reject 主落点**（提示改用 add-node --kind group --contains / remove-node / update-node） |
| Q-004 | help.ts 命令元数据/示例：INCR_EXAMPLES 三条（:119-121）、INCR_SUMMARIES 三条（:132-134）；PARAM_DESC.contains（:36） | help.ts:119-121、:132-134 | 6 条移除；:36 contains 描述保留（add-node 复用）；add-node 示例（:113）改为含 --kind group --contains 形态；顶层帮助由 COMMANDS 动态生成（:180-193）自动跟随 |
| Q-005 | WEB_CLI_TOOL function schema：description 子命令列表 + subcommand enum 三项 | tools.ts:22、:36 | 两处移除三命令 |

### 3.2 终端命令面（lgdl-cli）

| ID | 问题描述 | 证据位置 | 处置 |
|----|---------|---------|------|
| Q-006 | registry.ts COMMANDS 数组三个 group 命令（import :32-34 + 数组项 :55-57） | registry.ts:32-34、:55-57 | 移除；19 命令 → 16 命令 |
| Q-007 | commands/ 目录三个 group 命令文件（add-group.ts 25 行含 --contains option :17；remove-group.ts 20 行；update-group.ts 35 行含 --member-add/--member-remove/--attrs collect :20） | commands/add-group.ts、remove-group.ts、update-group.ts | 三文件删除 |
| Q-008 | add-node.ts 无 --contains option（现 option 集 :14-20：--label/--kind/--group/--member/--attrs） | commands/add-node.ts:14-20 | 补 `--contains <ids>` option 并透传 buildOperation |

### 3.3 底层 mutation 面（lgdl-core）

| ID | 问题描述 | 证据位置 | 处置 |
|----|---------|---------|------|
| Q-009 | addGroup 函数（含 contains 全量校验：自含/未知成员/重复归属/嵌套 :393-414；组节点构造 :416-422） | mutations.ts:383-427 | 逻辑并入 addNode（kind==='group' 分支），函数移除 |
| Q-010 | removeGroup 函数（groupNodes 存在性校验 :430；摘除父 contains :439-443；清聚合边 :444） | mutations.ts:429-448 | 逻辑并入 removeNode，函数移除 |
| Q-011 | updateGroup 函数 + UpdateGroupOptions（memberAdd/Remove 为 contains 的 **id 语义** :482-511；rename 引用重写 :513-537；id 冲突双查 node+group :475-480） | mutations.ts:450-461（Options）、:463-546（函数） | 逻辑并入 updateNode，函数移除 |
| Q-012 | LgdlOperation 三个 group op 变体（types.ts:253-263）；add-node op 变体无 contains（:211-219）；index.ts 导出 addGroup/removeGroup/updateGroup（:14-16）与 AddGroupOptions/UpdateGroupOptions（:23-24） | types.ts:253-263、:211-219；index.ts:14-16、:23-24 | 三变体移除（op 联合 9→6）；add-node 变体补 `contains?: string[]`；index.ts 四处导出移除 |

### 3.4 操作分派面（lgdl-web-cli/src/operations.ts）

| ID | 问题描述 | 证据位置 | 处置 |
|----|---------|---------|------|
| Q-013 | describeOperation 三个 case（:58-63）；OperationMutations 三个成员（:75-77）；lgdlDispatch 三个分派（:138-157，add-group :138-145 / remove-group :146 / update-group :147-157） | operations.ts:58-63、:75-77、:138-157 | 三处同步移除；add-node 分派（:85-95）透传 contains |

### 3.5 测试面

| ID | 问题描述 | 证据位置 | 迁移清单 |
|----|---------|---------|---------|
| Q-014 | lgdl-core mutations.test.ts 的 group 用例（**12 个**） | mutations.test.ts:10-12（import）；:215-220 addGroup 建组；:222-224 未知成员；:226-241 嵌套组；:243-245 重复归属；:247-257 嵌套冲突；:259-261 自含；:263-265 id 校验；:267-281 removeGroup 父组摘除；:283-286 removeGroup 删除；:288-290 不存在报错；:933-949 removeGroup 清聚合边；:2550-2566 updateGroup 成员与 rename 重写 | 全部改为 addNode/removeNode/updateNode 等价形式（例：`addGroup(BASE,{id:'g2',contains:['b']})` → `addNode(BASE,{id:'g2',kind:'group',contains:['b']})`）；import 移除三符号；updateGroup 用例的 memberAdd 语义迁移见 §5.2 R-001 决策点 |
| Q-015 | lgdl-web-cli commands.test.ts 的 COMMANDS 清单断言 | commands.test.ts:13-25（断言 9 命令集合） | 改断言 6 命令集合 |
| Q-016 | lgdl-web-cli operations.test.ts 的 group 用例 | operations.test.ts:57-62（add-group 落成员）；:112-127（describeOperation 9 变体遍历） | :57-62 改 add-node kind:'group'；:112-127 改 6 变体 |
| — | **无其他测试残留**：protocol.test.ts / help.test.ts / tools.test.ts / exec.test.ts 均无 group 命令引用（grep 证实）；lgdl-cli 无测试文件（glob 证实） | — | 无需迁移 |

### 3.6 AI 提示面（lgdl-web）

| ID | 问题描述 | 证据位置 | 处置 |
|----|---------|---------|------|
| Q-017 | system prompt 修改命令清单混列 9 个增量命令；AiPanel 快捷动作文案引用 add-group/update-group | lgdl-web/src/ai/prompts.ts:48；lgdl-web/src/ai/AiPanel.tsx:116、:122、:139-140 | prompts.ts:48 改 6 命令；AiPanel 4 处 prompt 文案改 node 命令形态（"整理分组"动作本身保留，仅改命令表述） |

### 3.7 文档/示例面

| ID | 问题描述 | 证据位置 | 处置 |
|----|---------|---------|------|
| Q-018 | 用户文档 group 命令引用（命令表/示例/速查表） | README.md:154；docs/cli-guide.md:46-47（速查表）、:197-216（add-group/remove-group 两个详细章节）；docs/ai-agent-guide.md:93（示例）、:142-143（速查表）、:182（完整示例）；docs/v0.5-web-ai.md:155（命令集表） | 全部改写为 node 命令等价形态（add-node --kind group --contains / remove-node / update-node） |
| Q-019 | 全景文档（docs-tree-root）命令清单与计数 | .sddu/docs-tree-root/核心引擎/core-语义模型.md:211、:215-226（9 增量命令清单/19 命令清单/消费链描述）；docs-overview.md:117、:137；source.md:51-52；系统架构/docs-overview.md:31；系统架构/包依赖关系-deps.md:22、:56；adr-index.md:114-116、:171-180、:215、:262 | 跨树产物（归 @sddu-docs 维护），本 feature 完成后需联动更新（见 R-008） |
| — | **不受影响（确认排除）**：examples/*.lgdl 是语法文档（kind: group 节点，非命令，grep 零命令引用；group-node-demo.lgdl 为纯语法示例）；packages/lgdl-web/public/.../README-CLI.md（grep 零 group 命令引用）；web-cli-base 机制层（零 group 引用）；CHANGELOG.md:64/:85/:164、docs/reviews-2026-08-24/ai-vision-review.md:27、.sddu/specs-tree-root/ROADMAP.md:87 及 specs-tree-web-cli-v2/*、specs-tree-web-cli-extract/*（历史记录/历史 feature 产物，不改） | 已逐一核实 | 不动 |

---

## 4. 竞品参考

| 竞品 | 是否处理过类似问题 | 处理方式 | 与我们场景的差异 |
|------|-------------------|---------|----------------|
| 不适用（内部重构） | — | 本 Feature 为 LGDL 内部命令层收敛，方案已定（方案 B），无外部竞品调研需求 | — |
| 内部参照：v0.6 group-as-node | 是（语义模型层） | 已把 group 统一为 `kind:'group'` 节点（types.ts:1-9 头注释、LgdlNode.contains :146），parser/serialize/layout/render 全部按节点处理 | 语义模型层已统一，本 Feature 是其**命令层补完**——同一哲学的最后一公里，非新探索 |

---

## 5. 假设与风险

### 5.1 add-node 补 --contains 现状核实（任务点 3 交付）

| 项 | 现状（证据） | 合并所需改动 |
|----|------------|------------|
| AddNodeOptions | **无 contains** 字段（mutations.ts:36-46：id/label/kind/group/members/attrs） | 加 `contains?: string[]` |
| addNode 实现 | 不创建 contains（节点构造 :118-124 无 contains；`group` 参数是"放入已有分组"方向 :134-145，与"创建分组含成员"相反） | kind==='group' && contains 时：吸收 addGroup 校验（mutations.ts:393-414：自含/未知成员/重复归属/嵌套）并写 contains |
| CommandSpec add-node | optional = ['label','kind','group','member','attrs']（commands.ts:23-29），无 contains | optional 加 'contains' |
| buildOperation add-node | case 不解析 contains（commands.ts:144-158） | 解析 contains → op.contains（参考 add-group case :207 的 split(',') 逻辑） |
| LgdlOperation add-node 变体 | 无 contains（types.ts:211-219） | 加 `contains?: string[]` |
| lgdlDispatch add-node | 不透传 contains（operations.ts:85-95） | 透传（参考 add-group 分派 :138-145） |
| lgdl-cli add-node.ts | 无 --contains option（:14-20） | 加 `--contains <ids>` option |
| ✅ 已具备 | LgdlNode.contains 字段（types.ts:146，仅 kind:'group' 有意义 :143-144）；KNOWN_PARAMS 已含 contains（commands.ts:93，add-group 时代遗留）；PARAM_DESC.contains（help.ts:36）；help 顶层由 COMMANDS 动态生成（help.ts:180-193） | 直接复用 |
| ⚠️ 现状副作用 | add-node 现在传 --contains **不报未知参数**（KNOWN_PARAMS 已认 contains），会被**静默忽略**（types.ts:144 "ignored otherwise"） | 合并后必须 loud：--contains 仅在 kind==='group' 时有效，否则报错（防静默数据错） |

**removeNode / updateNode 已处理 kind:'group' 的现状核实**：
- removeNode（mutations.ts:150-172）：**已能删 group**——:158-159 过滤节点、:161 从父组 contains 摘除、:164 自动清边。与 removeGroup 差异仅：错误消息（"Node not found" :151 vs "Group not found" :430）、summary 文案（"attached edge(s)" :170 vs "aggregate edge(s)" :446）。
- updateNode（mutations.ts:259-323）：**已能改 group 的 label/attrs/newId**——:291-293 rename 时重写父组 contains、:308-312 重写边引用。**但 memberAdd/memberRemove 语义与 updateGroup 不同**（见 R-001）。

### 5.2 关键假设

| # | 假设内容 | 验证方式 |
|---|---------|---------|
| A-001 | 仓库内无外部调用方依赖 group 三命令（loud reject 无兼容包袱成立） | 已核实：全仓 grep `add-group\|remove-group\|update-group` 命中均为本仓库命令定义/文档/测试（见 §3），无外部 API 消费方 |
| A-002 | `contains` 仅 kind:'group' 节点有意义（types.ts:143-144 语义不变），add-node 对非 group kind 传 --contains 应报错 | spec 阶段确认校验策略（loud error vs 自动置 kind='group'） |
| A-003 | 命令收缩后文档口径统一为 16 命令（19-3），"9 个增量命令"表述改"6 个增量命令" | spec 阶段确认文档计数口径；docs-tree-root 联动由 @sddu-docs 跟进 |

### 5.3 主要风险

| # | 风险描述 | 影响程度 |
|---|---------|---------|
| R-001 | **update-group memberAdd/memberRemove 语义 ≠ update-node**（高概率踩坑点）：updateNode 的 memberAdd 是**结构化类成员** LgdlMember（assertMemberShape :16-34，kind=attribute\|method，parseMemberSpec 要求 kind=,name=），updateGroup 的 memberAdd 是 **contains 的普通 id**（存在性/重复归属校验 :482-503）。**"update-group --member-add c" ≠ "update-node --member-add c"**。合并不等价，需 spec 决策：① updateNode 按目标 kind==='group' 分支（memberAdd/Remove → contains 的 id 语义）；② 或新增 --contains-add/--contains-remove 参数。**修正 state.json notes「update-group 与 node 命令几乎无差异」的认知**——该判断对 label/attrs/newId/remove 成立，对 member 操作不成立 | 高 |
| R-002 | AI 提示词残留：prompts.ts:48 与 AiPanel.tsx 4 处若漏改，模型会继续生成 group 命令 → 全部被 loud reject，产生对话体验噪音 | 高 |
| R-003 | 文档残留：README/cli-guide/ai-agent-guide/v0.5-web-ai 共 5 文件 8 处引用若漏改，用户按文档执行报 unknown command | 中 |
| R-004 | kind 默认值陷阱：`add-node --contains a,b` 不传 `--kind group` → kindResolver 默认 process（commands.ts:114-118），contains 被**静默忽略**（types.ts:144）→ 静默数据错。需 loud 报错或自动置 kind='group'（决策点） | 中 |
| R-005 | LgdlOperation 类型收缩连锁（types.ts:253-263 + operations.ts 三处 + index.ts 导出）：漏改一处即编译失败——编译期可发现，风险可控，但改动面跨 3 文件需同步落地 | 中 |
| R-006 | remove 错误消息口径变化："Node not found" 替代 "Group not found"，测试断言与用户感知变化（可接受，loud reject 范畴） | 低 |
| R-007 | update-node 对 kind:'group' 改 kind 无护栏：updateNode 允许改 kind（:302），改掉 group kind 会留下孤儿 contains（types.ts:144 仅 group 有意义）；updateGroup 原本无 kind 参数。合并后需决策是否禁止 | 低 |
| R-008 | 全景文档跨树联动：docs-tree-root 6 文件（core-语义模型.md/docs-overview.md/source.md/系统架构 2 文件/adr-index.md）含命令清单与计数，归 @sddu-docs 维护——本 feature 只落 specs-tree，需另立联动或完成后手动触发 docs 侧更新 | 低 |

---

## 6. 下一步建议（合并边界清单）

| 优先级 | 事项 | 说明 |
|--------|------|------|
| 高 | **spec 决策点①（R-001）**：update-group → update-node 的 member 语义迁移方案（kind 分支 vs 新参数） | 这是合并边界上唯一不等价点，spec 必须先定，plan 才能排任务 |
| 高 | **spec 决策点②（R-004）**：add-node --contains 的 kind 校验策略（--kind group 必填报错 vs 自动置 group） | 防静默数据错 |
| 高 | **spec 决策点③（R-007）**：update-node 对 kind:'group' 的 kind 变更护栏 | 防孤儿 contains |
| 中 | **变更面落地顺序**（spec/plan 输入）：① lgdl-core mutations/types/index（Q-009~Q-012）→ ② lgdl-web-cli commands/protocol/help/tools/operations（Q-001~Q-005/Q-013）→ ③ lgdl-cli registry/3 文件删除/add-node.ts 补 option（Q-006~Q-008）→ ④ 测试迁移 12+1+2 用例（Q-014~Q-016）→ ⑤ AI 提示（Q-017）→ ⑥ 文档（Q-018）→ ⑦ docs-tree-root 联动（Q-019，R-008） | 依赖序：core 先行，命令层消费；测试与实现同批 |
| 中 | loud reject 文案（protocol.ts:143 + cli commander 默认错误） | 明确提示"分组已并入 node 命令：add-node --kind group --contains / remove-node / update-node" |
| 低 | 文档口径统一：16 命令 / 6 个增量命令表述（A-003） | README 架构段（README.md:168 "9 个增量命令"）同步更新 |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建 — 轻量全量盘点（6 面 19 项 Q + add-node contains 现状核实 + 合并边界 + 风险 8 项） | 2026-09-01 | SDDU Discovery Agent |
