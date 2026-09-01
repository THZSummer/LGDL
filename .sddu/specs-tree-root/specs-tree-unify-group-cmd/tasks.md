# 任务分解：group 命令合并（specs-tree-unify-group-cmd）

> **文档定位**: SDDU 任务清单 — 将技术方案分解为可并行执行的原子任务，作为 build 阶段的输入  
> **前置依赖**: plan.md（技术方案，3 ADR / 7 变更面 / 迁移矩阵 15+9 / 风险 11 项）、spec.md（需求规范，21 FR / 7 NFR / 10 EC / 7 AC）  
> **创建人**: SDDU Tasks Agent  
> **创建时间**: 2026-09-01  
> **版本**: v1.0  
> **更新人**: SDDU Tasks Agent  
> **更新时间**: 2026-09-01  
> **更新说明**: 初始创建 — 9 任务 7 波次（L×3 / M×6 / S×0），覆盖变更面 7 面 + 测试迁移 + 验证门禁 + docs-tree-root 外部联动

---

## 1. 依赖拓扑总览
> 任务依赖关系和执行顺序

```
Wave 1 ─── (无依赖，源头)
  TASK-001 [L]  lgdl-core mutations/types/index 收敛（DD-001~003 + 逻辑并入 + 符号删除）

Wave 2 ─── (依赖 Wave 1)
  TASK-002 [L]  lgdl-web-cli 命令定义面收缩（commands/protocol/help/tools/adapters 5 文件）
  TASK-003 [M]  lgdl-web-cli 分派面收缩（operations.ts）

Wave 3 ─── (依赖 Wave 1~2)
  TASK-004 [M]  lgdl-cli 终端命令面收缩（registry + 3 文件删除 + add-node/update-node 补 option）

Wave 4 ─── (依赖 Wave 1~3)
  TASK-005 [L]  测试迁移（15 项等价迁移 + 9 项新增护栏测试）

Wave 5 ─── (依赖 Wave 2 命令面事实)
  TASK-006 [M]  AI 提示面同步（prompts.ts + AiPanel.tsx 4 处）

Wave 6 ─── (依赖 Wave 5，可并行)
  TASK-007 [M]  用户文档同步（README/cli-guide/ai-agent-guide/v0.5-web-ai）
  TASK-009 [M]  docs-tree-root 全景联动（外部 @sddu-docs，触发 + 验收）

Wave 7 ─── (依赖全部)
  TASK-008 [M]  验证门禁（tsc 全绿 + test 守恒 + grep 零残留 + git diff 零语义模型改动）
```

### 关键路径（Critical Path）

```
TASK-001 → TASK-002 → TASK-004 → TASK-005 → TASK-006 → TASK-007 → TASK-008
（7 环节 / 6 跳，全程串行 —— 最短交付路径）

并行支线（不占关键路径）：
  TASK-003 ‖ TASK-002（Wave 2 并行，T3 完成后 lgdl-web-cli src 编译恢复）
  TASK-009 ‖ TASK-007（Wave 6 并行，外部联动不阻塞门禁 T8）
```

> ⚠️ **批次提示（固化 plan §6.1）**：①(T1)③(T3)⑤(T5) 存在编译/测试强连锁——T1 删除 mutations 函数后，lgdl-web-cli operations.ts 的 import（T3 修）与 mutations.test.ts 的引用（T5 修）立即断裂；中间态**不可单独通过全量 tsc/test**，但每完成一个批次即可跑包内 tsc/grep 局部验证。T1 单点验收以 src 非测试文件 + grep 为准，全量绿灯在 T5 后、T8 总闸复核。

## 2. 任务列表
> 每个任务的详细定义

### TASK-001: lgdl-core mutations/types/index 收敛（DD-001~003 + 逻辑并入 + 符号删除）
> 变更面 ①（源头）：addGroup/removeGroup/updateGroup 逻辑并入 node 三函数，护栏随 node 函数落地

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | 无 |
| **执行波次** | 1 |
| **对应 FR** | FR-001/002/003/004/011/012/013/014/015；DD-001/002/003；EC-001~005/007/008/010；AC-02/04 |

**描述**: 在 lgdl-core 完成底层 mutation 收敛——
① `AddNodeOptions` 加 `contains?: string[]`（mutations.ts:36-46），`addNode` 加 DD-002 校验（contains 不配 `kind:'group'` 时 loud 报错，防直调绕过命令层）+ `kind==='group'` 分支执行 addGroup 校验集（自含/未知成员/重复归属/嵌套冲突，mutations.ts:393-414）并写 contains（:107-148）；
② `UpdateNodeOptions` 加 `containsAdd?: string[]` / `containsRemove?: string[]`（id 语义，mutations.ts:61-73），`updateNode` 加 DD-001 成员操作（先在组/在其他组/不在组校验，对齐 updateGroup :482-511；同时传先 add 后 remove）+ DD-003 kind 护栏（group→非 group 抛错，:264 后拦截；同值 no-op；反向允许）（:259-323）；
③ 提取共享 contains 校验 helper（FR-014，add 与 update 路径复用同一校验集）；
④ **删除** `addGroup`（:383-427）、`removeGroup`（:429-448）、`UpdateGroupOptions`（:450-461）、`updateGroup`（:463-546）；
⑤ `types.ts` `LgdlOperation` 9→6 变体：add-node 变体补 `contains?: string[]`（:211-219）、update-node 变体补 `containsAdd/containsRemove`（:221-230）、删三 group 变体（:253-263）；
⑥ `index.ts` 删四处导出：addGroup/removeGroup/updateGroup（:14-16）+ AddGroupOptions/UpdateGroupOptions（:23-24）。
summary 口径按 plan §6.2 解读 A：走 addNode 现有文案（`added node "g2" :group (label) with 2 member(s)`），不特判 "added group"；错误消息按 R-006/R-009 口径表统一（`Node not found` / `attached edge(s)` / `Node id already exists` / `Invalid node id`；contains 类错误保留旧口径）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/lgdl-core/src/mutations.ts` |
| MODIFY | `packages/lgdl-core/src/types.ts` |
| MODIFY | `packages/lgdl-core/src/index.ts` |

**验收标准**:
- [ ] `addNode(doc,{id:'g2',kind:'group',contains:['a','b']})` 对全部合法/非法输入与旧 `addGroup` 行为等价（结果文档、summary、错误消息；summary 按解读 A 为 node 文案，信息内容等价）
- [ ] 四类 contains 校验（自含/未知成员/重复归属/嵌套冲突）错误消息与旧 addGroup 一致（FR-002），且任一失败 document 原子不变（返回与输入相等）
- [ ] addNode 传 contains 不配 group kind（含 kindResolver 默认注入）→ 抛错消息含 "kind" 与 "group" 指引（DD-002 核心层兜底，FR-003）
- [ ] updateNode `containsAdd`：已在目标组 → "is already in group"；已在其他组 → membersOf 检查报错；未知成员报错；`containsRemove`：不在组 → `Member not found ... in group`；同时传先 add 后 remove；summary 记 `contains+ b` / `contains- a`（DD-001，FR-013/014）
- [ ] updateNode 对非 group 节点传 containsAdd/containsRemove → 抛错含 contains 仅 group 有效口径（FR-015）
- [ ] updateNode 对 `kind:'group'` 改 kind（group→非 group）→ 抛错 `分组节点不允许修改 kind...如需删除分组请用 remove-node`（EC-004/DD-003）；传同值 kind:'group' no-op；非 group→group 允许
- [ ] containsAdd/containsRemove 传空串/纯空白 id → 抛错 `成员 id 不能为空`（EC-008）
- [ ] `types.ts` 无 add-group/remove-group/update-group 三 op 变体（9→6）；`index.ts` 无 addGroup/removeGroup/updateGroup/AddGroupOptions/UpdateGroupOptions 四处导出
- [ ] grep `packages/lgdl-core/src` 非测试文件无 `addGroup(/removeGroup(/updateGroup(` 调用残留

**验证命令**:
```bash
cd packages/lgdl-core && npx tsc --noEmit   # 预期：src 非测试文件全绿；mutations.test.ts 报错属 TASK-005 迁移范围（批次中间态）
grep -rn "addGroup\|removeGroup\|updateGroup" packages/lgdl-core/src --include="*.ts" | grep -v "\.test\.ts"   # 预期零输出
```

### TASK-002: lgdl-web-cli 命令定义面收缩（commands/protocol/help/tools）
> 变更面 ②：COMMANDS/buildOperation 收缩 + loud reject 改写 + 帮助与 schema 同步

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-001 |
| **执行波次** | 2 |
| **对应 FR** | FR-001/003/004/005/007/008/021；DD-001/002；EC-001/002；AC-01/03/07 |

**描述**: 在 lgdl-web-cli 收缩命令定义面——
① `commands.ts`：删三 CommandSpec（:65-85）；add-node optional 加 `'contains'`（:28）；update-node optional/changeKeys 加 `'contains-add'/'contains-remove'`（:41-42，changeKeys 保证 no-change 校验覆盖）；**KNOWN_PARAMS 补 `'contains-add'/'contains-remove'`**（:89-94，R-011，否则 update-node 传新参数报未知参数）；buildOperation 删三 case（:202-220）、add-node case 解析 `--contains`（split(',') 复用 add-group 时代 :207 形态）+ DD-002 校验（`contains !== undefined && kind !== 'group'` → 抛错含 kind 与 group 指引，:144-158）、update-node case 解析 contains-add/remove（:161-171）；
② `protocol.ts`：删三 case（:118-129）；头注释子命令枚举改（:16-19）；**loud reject 主落点**——未知子命令提示列表改写（:143）：add-group → `add-node --kind group --contains`、remove-group → `remove-node`、update-group → `update-node`；
③ `help.ts`：INCR_EXAMPLES/INCR_SUMMARIES 删 group 三条（:119-121/:132-134）；add-node 示例改含 `--kind group --contains` 形态（:113）；update-node 示例补 contains-add；PARAM_DESC 补 contains-add/contains-remove 中文说明（:34-35）；顶层帮助由 COMMANDS 动态生成自动跟随（:180-193）；
④ `tools.ts`：WEB_CLI_TOOL description 子命令列表删三（:22）；subcommand enum 删三项（:36）；
⑤ `adapters/lgdl.ts`：注释口径更新（:9 "19 领域符号"、:51 "9 变体"，纯注释顺手改）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/lgdl-web-cli/src/commands.ts` |
| MODIFY | `packages/lgdl-web-cli/src/protocol.ts` |
| MODIFY | `packages/lgdl-web-cli/src/help.ts` |
| MODIFY | `packages/lgdl-web-cli/src/tools.ts` |
| MODIFY | `packages/lgdl-web-cli/src/adapters/lgdl.ts` |

**验收标准**:
- [ ] COMMANDS 注册表无 add-group/remove-group/update-group 三项；KNOWN_PARAMS 含 `contains-add`/`contains-remove`（R-011）
- [ ] `parseWebCliCommand` 传三命令名 → 抛错消息含对应改用指引：add-group → `add-node --kind group --contains`、remove-group → `remove-node`、update-group → `update-node`；提示列表不再含三命令（FR-007）
- [ ] buildOperation add-node case：`--kind group --contains a,b` 解析产出 `{op:'add-node', kind:'group', contains:['a','b']}`；`--contains` 不配 group kind（含 kindResolver 默认）→ 抛错含 "kind" 与 "group"（FR-003/004）
- [ ] buildOperation update-node case：`--contains-add a,b` / `--contains-remove c` 解析产出 containsAdd/containsRemove（trim+filter(Boolean)，空串被过滤或按 EC-008 报错路径）
- [ ] help 输出：add-node 示例含 `--contains`；顶层命令列表与 INCR_EXAMPLES/INCR_SUMMARIES 无三命令；PARAM_DESC 含 contains-add/contains-remove 中文说明
- [ ] tools.ts 子命令 enum 与 description 无三命令
- [ ] grep `packages/lgdl-web-cli/src` 非测试文件无 `add-group\|remove-group\|update-group` 残留

**验证命令**:
```bash
cd packages/lgdl-web-cli && npx tsc --noEmit   # 预期：src 非测试文件全绿（operations.ts 断裂由 TASK-003 修复；测试文件由 TASK-005 迁移）
grep -rn "add-group\|remove-group\|update-group" packages/lgdl-web-cli/src --include="*.ts" | grep -v "\.test\.ts"   # 预期零输出
```

### TASK-003: lgdl-web-cli 分派面收缩（operations.ts）
> 变更面 ③：describeOperation/OperationMutations/lgdlDispatch 收缩 + 分派透传

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-001 |
| **执行波次** | 2 |
| **对应 FR** | FR-009；AC-04 |

**描述**: `operations.ts` 收缩分派面——describeOperation 删三 case（:58-63）；OperationMutations 删三成员（:75-77）；lgdlDispatch 删三分派（:138-157）；add-node 分派透传 contains（:85-95，参考旧 add-group 逻辑 :138-145）；update-node 分派透传 containsAdd/containsRemove（:97-108）；import 删三函数（:36-38，addGroup/removeGroup/updateGroup）与三 Options 类型（:26-27，AddGroupOptions/UpdateGroupOptions）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/lgdl-web-cli/src/operations.ts` |

**验收标准**:
- [ ] lgdlDispatch 对 `{op:'add-node', kind:'group', contains:[...]}` 透传生效（含成员建组）
- [ ] lgdlDispatch 对 update-node op 的 containsAdd/containsRemove 透传生效
- [ ] describeOperation 对剩余 6 变体均返回 readable label（9→6）
- [ ] operations.ts 无 addGroup/removeGroup/updateGroup/AddGroupOptions/UpdateGroupOptions 引用
- [ ] 与 TASK-002 合并验收：`packages/lgdl-web-cli` src 非测试文件 `tsc --noEmit` 全绿

**验证命令**:
```bash
cd packages/lgdl-web-cli && npx tsc --noEmit   # 与 TASK-002 同批验收（T2+T3 后 src 编译恢复）
grep -rn "addGroup\|removeGroup\|updateGroup\|AddGroupOptions\|UpdateGroupOptions" packages/lgdl-web-cli/src --include="*.ts" | grep -v "\.test\.ts"   # 预期零输出
```

### TASK-004: lgdl-cli 终端命令面收缩（registry + 3 文件删除 + 2 命令补 option）
> 变更面 ④：终端命令面收缩，19 命令 → 16 命令

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-001、TASK-002、TASK-003（plan §6.1 ④ 依赖 ②③ 的 buildOperation/applyOperation；T1 删函数后 add-group.ts 的 Options import 亦断裂） |
| **执行波次** | 3 |
| **对应 FR** | FR-006；AC-01/03 |

**描述**: lgdl-cli 终端面收缩——`registry.ts` 删三 import（:32-34）与三数组项（:55-57），19 命令 → 16 命令；**删除** `commands/add-group.ts`（25 行）、`commands/remove-group.ts`（20 行）、`commands/update-group.ts`（35 行）三文件；`add-node.ts` 加 `--contains <ids>` option（:14-20 区域）+ action 透传（:31-38）；`update-node.ts` 加 `--contains-add <ids>` / `--contains-remove <ids>` option + action 透传（:22-32）。cli 侧 loud reject 采纳 commander 默认 unknown command（开放问题 2 处置，不额外注册隐藏命令）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/lgdl-cli/src/registry.ts` |
| DELETE | `packages/lgdl-cli/src/commands/add-group.ts` |
| DELETE | `packages/lgdl-cli/src/commands/remove-group.ts` |
| DELETE | `packages/lgdl-cli/src/commands/update-group.ts` |
| MODIFY | `packages/lgdl-cli/src/commands/add-node.ts` |
| MODIFY | `packages/lgdl-cli/src/commands/update-node.ts` |

**验收标准**:
- [ ] `lgdl-cli add-group --help` / `lgdl-cli remove-group x` / `lgdl-cli update-group --id g` 均报 unknown command（commander 默认，FR-006）
- [ ] registry.ts 无三命令 import 与数组项；命令计数 19 → 16
- [ ] `commands/` 目录下 add-group.ts/remove-group.ts/update-group.ts 已删除
- [ ] `lgdl-cli add-node --kind group --contains a,b` 终端入口可用（AC-02 终端侧）
- [ ] `lgdl-cli update-node --contains-add b` / `--contains-remove a` 终端入口可用
- [ ] `packages/lgdl-cli` tsc 全绿

**验证命令**:
```bash
cd packages/lgdl-cli && npx tsc --noEmit
ls packages/lgdl-cli/src/commands/ | grep -E "add-group|remove-group|update-group"   # 预期零输出
grep -rn "add-group\|remove-group\|update-group" packages/lgdl-cli/src   # 预期零输出
```

### TASK-005: 测试迁移（15 项等价迁移 + 9 项新增护栏测试）
> 变更面 ⑤：mutations.test 12 用例 + commands.test 1 + operations.test 2 迁移；新增 DD/EC 护栏覆盖

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-001、TASK-002、TASK-003、TASK-004 |
| **执行波次** | 4 |
| **对应 FR** | FR-016/017/018；AC-02/05 |

**描述**: 按 plan §6.3 迁移矩阵逐用例等价迁移 + 新增护栏测试——
① `mutations.test.ts`：import 删 addGroup/removeGroup/updateGroup 三符号（:10-12）；12 用例迁移——addGroup 5 用例（:215-265）→ `addNode(BASE,{id,kind:'group',contains:[...]})`（summary 断言 → `added node "g2" :group ... 1 member(s)`、错误消息按 R-009 表调整）；removeGroup 3 用例（:267-288）→ `removeNode`（错误消息 → `Node not found`）；removeGroup 清边用例（:933-949）→ `removeNode`（summary → `attached edge(s)`）；updateGroup 成员/rename 用例（:2550-2566）→ 拆三段 `updateNode`（containsAdd/containsRemove + newId，summary 前缀 group→node，memberAdd→containsAdd 语义迁移）；
② `commands.test.ts`：COMMANDS 清单断言 9 → 6（:13-25，断言集合 `['add-edge','add-node','remove-edge','remove-node','update-edge','update-node']`）+ 新增 add-node contains / update-node contains-add/contains-remove 解析断言（R-011 兜底）；
③ `operations.test.ts`：add-group 落成员用例（:57-62）→ `applyOperation(doc(), {op:'add-node', id:'g2', label:'G2', kind:'group', contains:['b']})`；describeOperation 9 变体遍历 → 6（:112-127，正则改 `^(add|remove|update)-(node|edge)`）；
④ 新增 9 项护栏测试（plan §6.3 表）：EC-001（contains 不配 kind → 抛错含指引）/ EC-002（显式非 group kind → 抛错）/ EC-003（非 group 节点 containsAdd/Remove → 抛错）/ EC-004（group 改 kind 抛错 + 同值 no-op）/ DD-003 反向（entity→group 允许）/ FR-014（containsAdd 已在组、已在其他组、自含各自抛错且 add/update 路径消息一致）/ containsRemove 不在组 → Member not found / EC-008（空串/纯空白 id 抛错）/ FR-002 原子性（任一校验失败 document 不变）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/lgdl-core/src/mutations.test.ts` |
| MODIFY | `packages/lgdl-web-cli/src/commands.test.ts` |
| MODIFY | `packages/lgdl-web-cli/src/operations.test.ts` |

**验收标准**:
- [ ] 迁移矩阵 15 项逐项对应无缺项：mutations.test 12（addGroup 5 + removeGroup 4 + updateGroup 1 拆 3 段）+ commands.test 1 + operations.test 2（FR-018 测试守恒；迁移前后矩阵对比可映射）
- [ ] 9 项新增护栏测试全部独立断言通过（FR-003/004/014/015、EC-001~008、DD-003 反向）
- [ ] `mutations.test.ts` / `commands.test.ts` / `operations.test.ts` 三文件全绿（`npm test`）
- [ ] 断言调整点符合 plan §6.2 口径表：`Node not found` / `attached edge(s)` / `added node "g2" :group ...` / `contains+ b` / `contains- a`（R-006/R-009 显式断言）
- [ ] grep 三包测试文件无 `addGroup(/removeGroup(/updateGroup(` 调用残留

**验证命令**:
```bash
cd packages/lgdl-core && npm test
cd ../lgdl-web-cli && npm test
grep -rn "addGroup(\|removeGroup(\|updateGroup(" packages/lgdl-core/src packages/lgdl-web-cli/src --include="*.test.ts"   # 预期零输出
```

### TASK-006: AI 提示面同步（prompts.ts + AiPanel.tsx）
> 变更面 ⑥：AI 提示面命令清单与快捷动作文案收敛

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-002（命令面事实：COMMANDS 6 命令定稿） |
| **执行波次** | 5 |
| **对应 FR** | FR-019；AC-01/03（AI function calling 入口） |

**描述**: `prompts.ts` 增量命令清单 9 → 6（:48，删 add-group/remove-group/update-group）；`AiPanel.tsx` 4 处 prompt 文案改 node 命令形态——:116（arch 分层）/ :122（datastream 泳道）→ "用 add-node --kind group"；:139（hint）→ "用 add-node --kind group 给节点归类分层"；:140（prompt）→ "（add-node --kind group --contains / update-node --contains-add）"——「整理分组」快捷动作本身保留，仅命令表述改 node 形态。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/lgdl-web/src/ai/prompts.ts` |
| MODIFY | `packages/lgdl-web/src/ai/AiPanel.tsx` |

**验收标准**:
- [ ] prompts.ts 增量命令清单恰为 6 命令（add-edge/add-node/remove-edge/remove-node/update-edge/update-node）
- [ ] AiPanel.tsx 4 处引用（:116/:122/:139/:140）无 add-group/remove-group/update-group 残留；「整理分组」动作保留且文案为 node 命令形态
- [ ] grep `packages/lgdl-web/src` 无 `add-group\|remove-group\|update-group` 残留（R-002 缓解）
- [ ] `packages/lgdl-web` tsc 全绿

**验证命令**:
```bash
grep -rn "add-group\|remove-group\|update-group" packages/lgdl-web/src   # 预期零输出
cd packages/lgdl-web && npx tsc --noEmit
```

### TASK-007: 用户文档同步（README / cli-guide / ai-agent-guide / v0.5-web-ai）
> 变更面 ⑦：用户文档命令口径统一为 16 命令 / 6 增量命令

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-006 |
| **执行波次** | 6 |
| **对应 FR** | FR-020/021（文档侧）；AC-01（docs/README 面）/07 |

**描述**: 文档改写为 node 命令等价形态——`README.md`：:154 命令表行 → `lgdl-cli add-node --kind group / update-node --contains-add ...`，:168 "9 个增量命令" → "6 个增量命令"；`docs/cli-guide.md`：:46-47 速查表两行改写，:197-216 add-group/remove-group 两个详细章节改写为 `add-node --kind group --contains` / `remove-node` 等价形态；`docs/ai-agent-guide.md`：:93 示例、:142-143 速查表、:182 完整示例改写；`docs/v0.5-web-ai.md`：:155 命令集表改写。降级项：`lgdl-web/public/.../README-CLI.md` grep 兜底确认后再动（discovery 已核实零 group 引用，NG-005 排除清单）。**NG-005 历史产物不改**：examples/*.lgdl、CHANGELOG.md、docs/reviews-2026-08-24/*、ROADMAP.md、specs-tree-web-cli-*。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `README.md` |
| MODIFY | `docs/cli-guide.md` |
| MODIFY | `docs/ai-agent-guide.md` |
| MODIFY | `docs/v0.5-web-ai.md` |
| MODIFY | `lgdl-web/public/**/README-CLI.md`（降级项：grep 确认存在 group 引用才动） |

**验收标准**:
- [ ] grep `README.md` 与 `docs/` 无 `add-group\|remove-group\|update-group` 命令引用（NG-005 例外清单逐项核对允许保留项：examples/*.lgdl、lgdl-web/public/.../README-CLI.md、CHANGELOG.md、reviews-2026-08-24/*、ROADMAP.md、specs-tree-web-cli-*）
- [ ] 文档口径统一：16 命令 / 6 个增量命令表述落地（AC-07）
- [ ] 速查表/详细章节/示例均为 node 命令等价形态（add-node --kind group --contains / update-node --contains-add / remove-node）
- [ ] 未误改 NG-005 历史产物（git diff 核对无 examples/CHANGELOG/reviews/ROADMAP/specs-tree-web-cli 改动）

**验证命令**:
```bash
grep -rn "add-group\|remove-group\|update-group" README.md docs/ | grep -v -E "examples/|README-CLI|CHANGELOG|reviews-2026-08-24|ROADMAP|specs-tree-web-cli"   # 预期零输出
grep -rn "6 个增量命令\|16 命令" README.md docs/   # 抽查口径
```

### TASK-008: 验证门禁（回归总闸：tsc 全绿 + test 守恒 + grep 零残留 + git diff 零语义模型改动）
> 变更面 ⑧：AC-01~07 回归验证总闸

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-001~TASK-007（本 feature 全部实现任务；TASK-009 为外部联动不阻塞门禁） |
| **执行波次** | 7 |
| **对应 FR** | 全部（AC-01~07 映射）；NFR-001/004/005/006 |

**描述**: 最终回归验证总闸，逐项执行 AC-01~07——① 各包 `tsc --noEmit` 全绿（lgdl-core/lgdl-web-cli/lgdl-cli/lgdl-web，NFR-006/AC-04）；② 各包 `npm test` 全绿 + 15 项迁移矩阵对比无缺项 + 测试总数不减少（FR-018/NFR-005/AC-05）；③ `grep -r "add-group\|remove-group\|update-group"` 按面核查零残留（packages 8 包 + docs + README，NG-005 例外清单核对，AC-01）；④ `git diff` 语义模型文件（parser.ts/serialize.ts/layout/render/LgdlDocument/LgdlNode/LgdlMember）零 diff（NFR-001/AC-06，types.ts 仅 LgdlOperation 联合收缩属命令协议面）；⑤ 三入口 loud reject 断言复核（cli unknown command / web-cli protocol 提示含指引 / AI tools enum 无三命令，AC-03）；⑥ 文档口径 16/6 抽查（AC-07）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| （验证执行） | 无源码改动；验证结论记录供 review/validate 阶段引用 |

**验收标准**:
- [ ] 四包 `tsc --noEmit` 全部通过（AC-04）
- [ ] 四包 `npm test` 全部通过；迁移矩阵 15 项对比无缺项；测试总数不减少（AC-05）
- [ ] `grep -r "add-group\|remove-group\|update-group"` 在 packages（8 包）+ docs + README 零残留（NG-005 例外清单核对通过）（AC-01）
- [ ] `git diff --name-only` 无 parser/serialize/layout/render/LgdlDocument/LgdlNode/LgdlMember 文件（AC-06）
- [ ] 三入口 loud reject 断言复核通过（AC-03）；文档口径 16/6 抽查通过（AC-07）

**验证命令**:
```bash
cd packages/lgdl-core && npm test && npx tsc --noEmit
cd ../lgdl-web-cli && npm test && npx tsc --noEmit
cd ../lgdl-cli && npm test && npx tsc --noEmit
cd ../lgdl-web && npm test && npx tsc --noEmit
grep -rn "add-group\|remove-group\|update-group" packages/ docs/ README.md | grep -v -E "examples/|README-CLI|CHANGELOG|reviews-2026-08-24|ROADMAP|specs-tree-web-cli"   # 预期零输出
git diff --name-only | grep -E "parser|serialize|layout|render"   # 预期零输出（语义模型零改动）
```

### TASK-009: docs-tree-root 全景联动（外部 @sddu-docs，触发 + 验收）
> 变更面 ⑨：跨树联动（R-008/R-011），本 feature 不落盘该目录

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-006（命令面定稿）；可与 TASK-007 并行（建议实际触发前确认 T7 文档口径已落地，避免计数不一致） |
| **执行波次** | 6 |
| **对应 FR** | AC-07（全景侧）；R-008/R-011 |

**描述**: 触发 @sddu-docs 对 `.sddu/docs-tree-root/` 联动更新（plan §5.5 清单，实为 8+ 文件，超 discovery 预估 6 文件）——`核心引擎/core-语义模型.md`（:200/:209/:215-226 命令清单与计数 19→16、9 增量→6 增量）、`核心引擎/web-ai助手.md`（:219）、`docs-overview.md`、`source.md`（:51-52）、`系统架构/docs-overview.md`（:31）、`系统架构/包依赖关系-deps.md`（:22/:56）、`adr-index.md`（:114/:171-180，如需汇入 ADR-001~003 落地引用）、`diagrams/` 系列（architecture-layers/packages/deps 的 .json/.html/.visual-check.json 中「19 命令/9 命令」计数）。本任务为**触发 + 验收**，实际落盘归 @sddu-docs。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `.sddu/docs-tree-root/核心引擎/core-语义模型.md` |
| MODIFY | `.sddu/docs-tree-root/核心引擎/web-ai助手.md` |
| MODIFY | `.sddu/docs-tree-root/docs-overview.md` |
| MODIFY | `.sddu/docs-tree-root/source.md` |
| MODIFY | `.sddu/docs-tree-root/系统架构/docs-overview.md` |
| MODIFY | `.sddu/docs-tree-root/系统架构/包依赖关系-deps.md` |
| MODIFY | `.sddu/docs-tree-root/adr-index.md` |
| MODIFY | `.sddu/docs-tree-root/diagrams/architecture-{layers,packages,deps}.{json,html,visual-check.json}`（计数同步） |

**验收标准**:
- [ ] 触发 @sddu-docs 完成联动后，`.sddu/docs-tree-root/` 全仓 grep 无「19 命令 / 9 命令 / 9 个增量命令」旧计数残留（新口径 16 命令 / 6 增量命令）
- [ ] diagrams/ 系列 json/html/visual-check.json 计数同步（architecture-layers:65/:184、architecture-packages:90、architecture-deps:98）
- [ ] adr-index.md 落地 ADR-001~003 引用（如 docs 侧决定汇入）
- [ ] 本 feature 目录未落盘 docs-tree-root（NG-004 边界保持）

**验证命令**:
```bash
grep -rn "19 命令\|9 命令\|9 个增量命令" .sddu/docs-tree-root/   # 联动后预期零输出
```

## 3. 任务汇总
> 任务数量、复杂度和波次的统计总览

| 统计项 | 数值 |
|--------|:--:|
| 总任务数 | 9 |
| S 级 (简单) | 0 |
| M 级 (中等) | 6（TASK-003/004/006/007/008/009） |
| L 级 (复杂) | 3（TASK-001/002/005） |
| 执行波次 | 7 |

> 覆盖度：变更面 7 面全量覆盖（① core / ② web-cli 定义面 / ③ 分派面 / ④ cli 终端面 / ⑤ 测试迁移 / ⑥ AI 提示 / ⑦ 文档）+ ⑧ 验证门禁 + ⑨ docs-tree-root 外部联动。测试迁移 15 项（mutations 12 + commands 1 + operations 2）+ 新增护栏 9 项全量落位。

## 4. 执行策略
> 各波次的执行说明

| 波次 | 任务 | 策略 |
|:--:|------|------|
| 1 | TASK-001 | 单点执行（源头，无依赖） |
| 2 | TASK-002, TASK-003 | 并行执行（依赖 Wave 1；T2+T3 完成后 lgdl-web-cli src 编译恢复） |
| 3 | TASK-004 | 单点执行（依赖 Wave 1~2 的 buildOperation/applyOperation 契约） |
| 4 | TASK-005 | 单点执行（依赖 Wave 1~3；修复批次中间态编译，实现与测试同批闭环） |
| 5 | TASK-006 | 单点执行（依赖 Wave 2 命令面事实） |
| 6 | TASK-007, TASK-009 | 并行执行（依赖 Wave 5；T9 为外部 @sddu-docs 触发，建议 T7 口径落地后触发） |
| 7 | TASK-008 | 单点执行（全部完成后回归总闸，AC-01~07） |

> **批次闭环提醒**：Wave 1→2 之间、Wave 3→4 之间为编译强连锁段，建议每完成一个批次跑包内 `tsc --noEmit` + `grep` 局部验证（见 TASK-001/002/003 验证命令）；全量绿灯在 TASK-005 完成后出现，TASK-008 复核。

## 修订记录
> 记录本文档的版本变更历史

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建 — 9 任务 7 波次（L×3/M×6/S×0）：T1 core mutations 收敛（DD-001~003）/ T2 web-cli 命令定义面 / T3 operations 分派面 / T4 cli 终端面 / T5 测试迁移（15 迁移 + 9 护栏）/ T6 AI 提示 / T7 用户文档 / T8 验证门禁 / T9 docs-tree-root 联动；依赖链 T1→(T2‖T3)→T4→T5→T6→(T7‖T9)→T8；关键路径 7 环节；批次提示固化（①③⑤ 编译/测试强连锁） | 2026-09-01 | SDDU Tasks Agent |
