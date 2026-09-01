# 审查策略：group 命令合并（specs-tree-unify-group-cmd）

> **文档定位**: SDDU 审查策略 — 指导 review Agent 执行自主审查的清单和方法；审查结果见 review-report.md
> **前置依赖**: spec.md（需求规范，21 FR / 7 NFR / 10 EC / 3 DD）、plan.md（技术方案，3 ADR / 7 变更面 / 迁移矩阵 15 项 / 风险 11）、build.md（构建产物，9 任务全 completed / 6 项偏差）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-02
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-02
> **更新说明**: 初始创建 — 基于 spec 21 FR + plan 3 ADR + build 6 项偏差自主定义 C1~C18 审查清单（四维度全覆盖，质量门槛满足：每 FR ≥ 1 Cx、每维度 ≥ 1 条）；因 build 已完成，本策略与审查报告同轮产出

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查对象文件 | 15 个（lgdl-core ×4 / lgdl-web-cli ×7 / lgdl-cli ×3 / lgdl-web ×1 抽查 + git diff 全量 41 文件） |
| 审查清单项 | 18 条（C1~C18） |
| 覆盖 | FR-001~021（21/21）+ NFR-001~007（7/7）+ EC-001~010（10/10）+ ADR-001~003（3/3）+ build 偏差 ①~⑥（6/6） |

## 2. 自主审查清单（C1~CN）

**审查对象来源**：
- `spec.md`：21 FR（五组 A~E）/ 7 NFR / 10 EC / 3 DD → 逐项核验实现完整性与正确性
- `plan.md`：3 ADR（= spec DD-001~003）/ §5 文件影响分析 / §6.2 口径表 / §6.3 迁移矩阵 → 架构遵循性检查
- `build.md`：文件变更清单 24+16 文件 / 偏差记录 6 项 → 覆盖完整性与偏差复核
- `src/` + `tests/`：源码与测试 → 代码质量与测试质量检查

**四维度指引**（清单覆盖 4 个维度）：
1. **代码质量** — 可读性、职责单一性、错误处理、编码规范
2. **规范符合性** — 对照 spec.md 逐 FR/NFR/EC 核验
3. **架构一致性** — 对照 plan.md ADR 和文件影响分析
4. **测试质量** — 覆盖率、边界条件、错误场景、断言有效性

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法 |
|---|---------|---------|---------|---------|
| C1 | add-node `--contains` 参数三层落地（mutations AddNodeOptions / commands.ts buildOperation / cli add-node.ts） | FR-001 / spec.md §5A | 规范符合性 | 代码走查 + commands.test 解析断言核对 |
| C2 | contains 校验集 + 文档原子性（自含 / 未知成员 / 重复归属 / 嵌套组冲突） | FR-002 / EC-005 | 规范符合性 | 代码走查 validateContainsMembers + FR-002 原子性测试 |
| C3 | DD-002 双保险：命令层 buildOperation 校验 + 核心层 addNode 校验（kind==='group'） | FR-003 / FR-004 / EC-001 / EC-002 / ADR-002 | 架构一致性 | 两处校验代码走查 + 护栏测试断言 |
| C4 | web-cli 命令定义面三命令全量移除（COMMANDS / buildOperation case / protocol.ts / help.ts / tools.ts enum） | FR-005 / FR-007 / FR-021 | 规范符合性 | 全仓 grep + 各文件走查 |
| C5 | cli 终端面移除（registry 19→16 / 三文件删除 / add-node、update-node 补 option） | FR-006 / AC-01 | 规范符合性 | git diff + registry.ts 走查 |
| C6 | LgdlOperation 9→6 连锁（types.ts / operations.ts describeOperation+OperationMutations+lgdlDispatch / index.ts 导出） | FR-008 / FR-009 / FR-010 / NFR-006 | 架构一致性 | 三文件走查 + 各包 tsc --noEmit 实跑 |
| C7 | mutations 收敛（addGroup/removeGroup/updateGroup 逻辑并入 node 三函数 + AddGroupOptions/UpdateGroupOptions 删除，共 5 符号） | FR-011 / FR-012 / FR-013 / AC-04 | 规范符合性 | mutations.ts 走查 + grep 无残留 |
| C8 | DD-001 语义：containsAdd/containsRemove 为 id 语义、memberAdd/memberRemove 类成员语义不变、先 add 后 remove | FR-013 / FR-014 / FR-015 / ADR-001 | 架构一致性 | updateNode 实现走查 + summary 断言核对 |
| C9 | DD-003 kind 护栏（group→非 group 拦截 / 同值 no-op / 非 group→group 反向允许） | EC-004 / ADR-003 | 架构一致性 | updateNode 实现走查 + EC-004 测试 |
| C10 | 零语义模型改动：LgdlDocument/LgdlNode/LgdlMember/parser/serialize/layout/render 零 diff | NFR-001 / AC-06 | 架构一致性 | git diff 文件清单 + types.ts diff 范围核查 |
| C11 | 错误消息口径一致性（R-006/R-009：Node not found / attached edge(s) / Node id already exists / Invalid node id / 保留四类校验文案） | NFR-004 / NFR-007 / EC-006 / EC-010 | 代码质量 | 文案对照 plan §6.2 口径表逐项核对 |
| C12 | mutations 收敛代码质量（共享 validateContainsMembers helper / 职责单一 / 无硬编码 / 可读性） | §5.1 代码质量方法论 | 代码质量 | mutations.ts 代码走查 |
| C13 | 命令层代码质量（KNOWN_PARAMS 完备性 R-011 / 无冗余 / 注释同步） | §5.1 代码质量方法论 | 代码质量 | commands.ts/help.ts 走查 |
| C14 | 测试迁移守恒矩阵（mutations 12 + commands 1 + operations 2 = 15 项映射无缺项） | FR-016 / FR-017 / FR-018 / NFR-005 | 测试质量 | git diff 逐用例映射比对 |
| C15 | 护栏测试有效性（9 项：DD-002/EC-002/EC-003/EC-004/DD-003 反向/FR-014×2/EC-008/FR-002 原子性） | plan §6.3 / spec EC-001~008 | 测试质量 | 测试断言强度核对（正则 + 消息精确匹配） |
| C16 | 回归验证复核（tsc 全绿 / 各包 test / 全仓 grep / 三入口 loud reject / AC-01~07） | build.md §4 / spec §9 | 测试质量 | 实际运行 tsc + test + grep 复核 build 声明 |
| C17 | **build 偏差①复核（重点）**：lgdl-web App.tsx 17 个 tsc 错误——OpHandler 契约（V2 lgdl-web-op-cli 引入）与 App.tsx handleWebOp 类型不匹配是否为既有基线，本 feature 是否真未引入 | build.md §5-① / state.json notes | 规范符合性 | tsc 实跑 + git log 溯源 + git diff 范围核查 |
| C18 | build 偏差②~⑥复核：② docs-tree-root 由 build 代为落盘是否准确（16 文件计数/命令清单）③ protocol.test +1 断言是否合理 ④ kind 取值 9 值同步 ⑤ dist 清理 ⑥ summary 口径解读 A | build.md §5-②~⑥ / plan.md §6.2 | 规范符合性 | git diff docs-tree-root 抽查 + protocol.test 断言核对 + summary 文案对照 |

> **质量门槛校验**：FR 21 个全覆盖（C1~C18 中 C1/C2/C4/C5/C7/C14/C16/C17 覆盖 A~E 五组全部 FR；NFR/EC/ADR 全部纳入）；四维度各 ≥ 1 条（规范符合性 8、架构一致性 5、代码质量 3、测试质量 3）。清单合格。

## 3. 审查详情（预期执行）

### 3.1 代码质量
| # | 检查项 | 文件 | 预期 |
|---|--------|------|:--:|
| 1 | validateContainsMembers 共享 helper 职责单一、校验序与旧 addGroup 一致 | mutations.ts:48-81 | 走查 |
| 2 | addNode/updateNode 错误处理覆盖（DD-002/DD-003/EC-008 前置拦截） | mutations.ts | 走查 |
| 3 | 命令层 KNOWN_PARAMS / PARAM_DESC / 示例同步 | commands.ts / help.ts | 走查 |

### 3.2 规范符合性（预期 FR 逐项）
| 需求 ID | spec 描述 | 代码实现位置（预期） | 符合？ |
|---------|----------|------------|:--:|
| FR-001 | add-node --contains 创建 kind:'group' 节点 | mutations.ts AddNodeOptions/构造 / commands.ts:134-146 / cli add-node.ts | 走查 |
| FR-002 | contains 四类校验 + 原子性 | mutations.ts:48-81 / FR-002 原子性测试 | 走查 |
| FR-003 | contains 不配 --kind group → loud 报错 | mutations.ts:176-185 / commands.ts:125-133 | 走查 |
| FR-004 | 显式非 group kind + contains → loud 报错 | 同上（统一 kind !== 'group' 判断） | 走查 |
| FR-005 | web-cli 命令定义面移除三命令 | commands.ts / protocol.ts / help.ts / tools.ts | 走查 |
| FR-006 | cli 面移除三命令（16 命令） | registry.ts / 三文件删除 | 走查 |
| FR-007 | loud reject 改用指引（add-node --kind group --contains / remove-node / update-node） | protocol.ts:128-151 | 走查 |
| FR-008 | LgdlOperation 9→6 + add-node contains + update-node containsAdd/Remove | types.ts:210-261 | 走查 |
| FR-009 | operations.ts 分派面同步 + contains 透传 | operations.ts:39-127 | 走查 |
| FR-010 | index.ts 四处导出移除 | index.ts:7-21 | 走查 |
| FR-011 | addGroup 并入 addNode | mutations.ts:164-222 | 走查 |
| FR-012 | removeGroup 并入 removeNode（Node not found 口径） | mutations.ts:224-246 | 走查 |
| FR-013 | updateGroup 并入 updateNode（DD-001 语义） | mutations.ts:333-442 | 走查 |
| FR-014 | add/update 共享校验集、消息一致 | validateContainsMembers + FR-014 测试 | 走查 |
| FR-015 | 非 group 传 contains 操作 loud 报错 | mutations.ts:360-365 | 走查 |
| FR-016 | mutations.test 12 用例等价迁移 | mutations.test.ts diff | 走查 |
| FR-017 | commands.test 9→6 / operations.test 迁移 | 两测试文件 diff | 走查 |
| FR-018 | 测试守恒 15 项映射无缺项 | 迁移矩阵比对 | 走查 |
| FR-019 | AI 提示面 9→6（prompts.ts + AiPanel 4 处） | 两文件 diff | 走查 |
| FR-020 | 用户文档改写 node 等价形态（4 文件） | README/cli-guide/ai-agent-guide/v0.5-web-ai diff | 走查 |
| FR-021 | help.ts 同步（INCR 示例/summary + PARAM_DESC.contains 保留） | help.ts diff | 走查 |

### 3.3 架构一致性（预期）
| 检查项 | 依据 | 预期 |
|--------|------|:--:|
| ADR-001（DD-001）遵循 | plan.md §9 / spec §8 | 走查 |
| ADR-002（DD-002）遵循 | 同上 | 走查 |
| ADR-003（DD-003）遵循 | 同上 | 走查 |
| 文件影响对齐 | plan.md §5（24 文件变更面） | git diff 比对 |
| 零语义模型改动 | NFR-001 | git diff 核查 |

### 3.4 测试质量（预期）
| 检查项 | 预期 |
|--------|:--:|
| 测试文件存在 | mutations/commands/operations/protocol/help/tools/exec 全在 |
| 核心逻辑覆盖 | 12 迁移 + 2 解析断言 |
| 边界条件覆盖 | 9 护栏（EC-001~008） |
| 错误场景覆盖 | 四类校验 + 三入口 loud reject |
| 断言有效性 | 正则精确匹配 + summary 包含断言 |

## 4. 改进建议（预期来源）
| # | 位置 | 问题 | 建议 |
|---|------|------|------|
| 1 | help.ts:6 | 头注释"增量命令（add-node 等 9 个）"过时（实为 6 个） | 顺手改 6 |
| 2 | lgdl-web App.tsx | 17 个 tsc 错误（V2 遗留基线，非本 feature 引入） | 建议后续 feature 修复 OpHandler 契约 |
| 3 | .sddu/docs-tree-root/adr-index.md | 路径引用陈旧（packages/core/、packages/cli/，V2 后为 lgdl-core/lgdl-cli） | @sddu-docs 联动复核时修正 |
| 4 | commands.ts KNOWN_PARAMS | 'to' 键重复出现（既有冗余，Set 无害） | 可选清理 |

## 5. 阻塞问题（预期）
| # | 位置 | 问题 | 修复建议 |
|---|------|------|---------|
| — | — | 预期 0 个（全部代码证据指向收敛完整、测试全绿） | — |

## 6. 结论（预期）
**结论**: ✅ 通过（待报告执行确认：0 阻塞 + 改进 < 5 + 规范符合率 100%）
**理由**: 预期 21 FR / 7 NFR / 10 EC / 3 ADR 全部有代码实现与测试支撑；build 6 项偏差复核（尤其 App.tsx 17 错误定性）待报告确认。

## 7. 修订记录
| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建 — C1~C18 审查清单定义（四维度全覆盖、21 FR 全覆盖、build 6 偏差全纳入） | 2026-09-02 | SDDU Review Agent |
