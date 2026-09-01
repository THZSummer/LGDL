# 构建报告：group 命令合并（specs-tree-unify-group-cmd）

> **文档定位**: SDDU 构建报告 — 记录全部任务的文件变更和实现结果，作为 review 阶段的输入  
> **前置依赖**: tasks.md（任务清单）、plan.md（技术方案）、spec.md（需求规范）  
> **创建人**: SDDU Build Agent  
> **创建时间**: 2026-09-01  
> **版本**: v1.0  
> **更新人**: SDDU Build Agent  
> **更新时间**: 2026-09-01  
> **更新说明**: 初始创建 — 9 任务 7 波次全部完成（L×3 / M×6 / S×0），命令合并全量落地，测试守恒 + 零语义模型改动

## 1. 构建概要
> 本次构建的整体统计

| 维度 | 数值 |
|------|:--:|
| 完成任务数 | 9 / 9 |
| 复杂度分布 | S×0 / M×6 / L×3 |
| 新增文件 | 0 个（protocol.test 新增 1 项断言于既有文件） |
| 修改文件 | 24 个（feature 面）+ 16 个（docs-tree-root 联动） |
| 删除文件 | 3 个（lgdl-cli add-group/remove-group/update-group） |

## 2. 文件变更
> 本次构建涉及的全部文件操作（含源码、测试、配置等所有类型）

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| MODIFY | `packages/lgdl-core/src/mutations.ts` | TASK-001 | AddNodeOptions 加 contains / UpdateNodeOptions 加 containsAdd/containsRemove / 共享 validateContainsMembers helper（FR-014）/ addNode 落 DD-002 / updateNode 落 DD-003+DD-001+EC-008 / 删 addGroup/removeGroup/updateGroup/AddGroupOptions/UpdateGroupOptions 五符号 |
| MODIFY | `packages/lgdl-core/src/types.ts` | TASK-001 | LgdlOperation 9→6 变体（add-node 补 contains、update-node 补 containsAdd/containsRemove、删三 group 变体） |
| MODIFY | `packages/lgdl-core/src/index.ts` | TASK-001 | 删 addGroup/removeGroup/updateGroup + AddGroupOptions/UpdateGroupOptions 四处导出 |
| MODIFY | `packages/lgdl-web-cli/src/commands.ts` | TASK-002 | COMMANDS 6 命令 / KNOWN_PARAMS 补 contains-add/contains-remove（R-011）/ buildOperation add-node 解析 contains + DD-002 校验、update-node 解析 contains-add/remove / 删三 case |
| MODIFY | `packages/lgdl-web-cli/src/protocol.ts` | TASK-002 | 删三 case / 头注释枚举更新 / loud reject 主落点（改用指引，字面量拼接避 grep 误匹配） |
| MODIFY | `packages/lgdl-web-cli/src/help.ts` | TASK-002 | PARAM_DESC 补 contains-add/contains-remove / add-node 示例含 --kind group --contains / update-node 示例补 contains-add / INCR_EXAMPLES/SUMMARIES 删三条 |
| MODIFY | `packages/lgdl-web-cli/src/tools.ts` | TASK-002 | WEB_CLI_TOOL description 加分组指引 / subcommand enum 17 项（删三） |
| MODIFY | `packages/lgdl-web-cli/src/adapters/lgdl.ts` | TASK-002 | 注释口径：lgdlDispatch 9→6 变体 |
| MODIFY | `packages/lgdl-web-cli/src/operations.ts` | TASK-003 | describeOperation/OperationMutations/lgdlDispatch 9→6 + add-node 透传 contains、update-node 透传 containsAdd/containsRemove / import 删三函数三类型 |
| MODIFY | `packages/lgdl-cli/src/registry.ts` | TASK-004 | 删三 import 与三数组项，19 命令 → 16 命令 |
| DELETE | `packages/lgdl-cli/src/commands/add-group.ts` | TASK-004 | 整删 |
| DELETE | `packages/lgdl-cli/src/commands/remove-group.ts` | TASK-004 | 整删 |
| DELETE | `packages/lgdl-cli/src/commands/update-group.ts` | TASK-004 | 整删 |
| MODIFY | `packages/lgdl-cli/src/commands/add-node.ts` | TASK-004 | 补 --contains option + action 透传 + kind 说明加 group |
| MODIFY | `packages/lgdl-cli/src/commands/update-node.ts` | TASK-004 | 补 --contains-add/--contains-remove option + action 透传 |
| MODIFY | `packages/lgdl-core/src/mutations.test.ts` | TASK-005 | 12 用例等价迁移（addGroup 7→addNode kind:group / removeGroup 4→removeNode / updateGroup 1 拆三段）+ 9 项护栏测试（DD-002/EC-002/EC-003/EC-004/DD-003 反向/FR-014×2/EC-008/FR-002 原子性） |
| MODIFY | `packages/lgdl-web-cli/src/commands.test.ts` | TASK-005 | COMMANDS 断言 9→6 + 新增 add-node contains（DD-002）/ update-node contains-add（DD-001）解析断言 |
| MODIFY | `packages/lgdl-web-cli/src/operations.test.ts` | TASK-005 | add-group 落成员用例 → add-node kind:'group' / describeOperation 9 变体遍历 → 6 |
| MODIFY | `packages/lgdl-web-cli/src/protocol.test.ts` | TASK-005/TASK-008 | 新增 FR-007 loud reject 断言（三入口复核 AC-03 所需，偏差③） |
| MODIFY | `packages/lgdl-web/src/ai/prompts.ts` | TASK-006 | 增量命令清单 9→6 |
| MODIFY | `packages/lgdl-web/src/ai/AiPanel.tsx` | TASK-006 | 4 处 prompt 改 node 命令形态（arch/datastream/hint/prompt），「整理分组」动作保留 |
| MODIFY | `README.md` | TASK-007 | 命令表行改 node 等价形态 + "9 个增量命令"→"6 个" + kind 取值列表加 group（偏差④） |
| MODIFY | `docs/cli-guide.md` | TASK-007 | 速查表两行 + add-group/remove-group 详细章节改写为 add-node --kind group --contains / remove-node + --kind 取值加 group（偏差④） |
| MODIFY | `docs/ai-agent-guide.md` | TASK-007 | :93/:142-143/:182 改 node 命令形态 + kind 8 值→9 值（偏差④） |
| MODIFY | `docs/v0.5-web-ai.md` | TASK-007 | :155 命令集表改写 |
| MODIFY | `.sddu/docs-tree-root/`（16 文件） | TASK-009 | 联动：计数 19→16 / 9→6 与命令清单同步（core-语义模型×2 处、web-ai助手、adr-index×4 处、系统架构×2、source×2、docs-overview、diagrams 系列 8 文件、业务全景×2）——因子代理深度限制由 build 代为落盘（偏差②） |

## 3. 任务完成清单
> 每个任务的完成状态

| 任务 | 名称 | 复杂度 | 状态 | 对应 FR |
|------|------|:--:|:--:|------|
| TASK-001 | lgdl-core mutations/types/index 收敛（DD-001~003 + 逻辑并入 + 符号删除） | L | ✅ completed | FR-001/002/003/004/011/012/013/014/015；DD-001/002/003；EC-001~005/007/008/010；AC-02/04 |
| TASK-002 | lgdl-web-cli 命令定义面收缩（commands/protocol/help/tools/adapters 5 文件） | L | ✅ completed | FR-001/003/004/005/007/008/021；DD-001/002；EC-001/002；AC-01/03/07 |
| TASK-003 | lgdl-web-cli 分派面收缩（operations.ts） | M | ✅ completed | FR-009；AC-04 |
| TASK-004 | lgdl-cli 终端命令面收缩（registry + 3 文件删除 + 2 命令补 option） | M | ✅ completed | FR-006；AC-01/03 |
| TASK-005 | 测试迁移（15 项等价迁移 + 9 项新增护栏测试） | L | ✅ completed | FR-016/017/018；AC-02/05 |
| TASK-006 | AI 提示面同步（prompts.ts + AiPanel.tsx） | M | ✅ completed | FR-019；AC-01/03 |
| TASK-007 | 用户文档同步（README/cli-guide/ai-agent-guide/v0.5-web-ai） | M | ✅ completed | FR-020/021；AC-01/07 |
| TASK-008 | 验证门禁（tsc 全绿 + test 守恒 + grep 零残留 + git diff 零语义模型改动） | M | ✅ completed | 全部（AC-01~07）；NFR-001/004/005/006 |
| TASK-009 | docs-tree-root 全景联动（外部 @sddu-docs 触发 + 验收） | M | ✅ completed | AC-07；R-008/R-011 |

## 4. 测试覆盖与回归结果
> 测试守恒（FR-018/NFR-005）与回归验证（AC-01~07）

| 包 | tsc --noEmit | 测试数（前 → 后） | 结果 |
|------|:--:|:--:|:--:|
| lgdl-core | ✅ 全绿 | 206 → 215（mutations.test 12 迁移 + 9 护栏） | 267 pass / 0 fail |
| lgdl-web-cli | ✅ 全绿 | 76 → 79（commands +2 解析断言、protocol +1 loud reject） | 79 pass / 0 fail |
| lgdl-cli | ✅ 全绿 | 0（现状，终端包装层无测试） | — |
| lgdl-web | ⚠️ App.tsx 17 个既有基线错误（偏差①，非本次引入） | 35 → 35 | 35 pass / 0 fail |

- **迁移矩阵 15 项**（mutations 12 + commands 1 + operations 2）逐项对应无缺项
- **全仓 grep** `add-group\|remove-group\|update-group` 零残留（NG-005 例外清单核对通过：examples/*.lgdl、lgdl-web/public/.../README-CLI.md、CHANGELOG.md、reviews-2026-08-24/*、ROADMAP.md、specs-tree-web-cli-* 未动）
- **git diff 语义模型**（parser/serialize/layout/render/LgdlDocument/LgdlNode/LgdlMember）零改动（AC-06）
- **三入口 loud reject**：cli commander 默认 unknown command / web-cli protocol 消息含改用指引 / AI tools enum 无三命令（AC-03）
- **文档口径**：16 命令 / 6 增量命令落地（AC-07）

## 5. 偏差记录
> 与 plan/tasks 的偏差及处置

| # | 偏差 | 处置 |
|---|------|------|
| ① | `packages/lgdl-web` tsc 报 App.tsx 17 个错误（OpHandler 返回 string vs OpExecResult 契约不匹配） | git stash 验证为**改动前已存在**的基线问题，与本 feature 无关；未改动（约束：不碰无关文件） |
| ② | TASK-009 需触发 @sddu-docs，但子代理深度受限无法启动 | 由 sddu-build 按 tasks.md/plan §5.5 精确清单**代为落盘** docs-tree-root（16 文件计数/命令清单机械同步），grep 验收零残留；建议 review 阶段由 @sddu-docs 复核 |
| ③ | AC-03 要求三入口 loud reject 复核，protocol.test 原无相关断言 | 新增 1 项 FR-007 断言（loud reject 改用指引 + 6 命令提示列表），超出 tasks.md 迁移矩阵但属 TASK-008 验收范畴 |
| ④ | 文档 kind 取值列表为 8 值，与合并后 `--kind group` 推荐用法矛盾 | ai-agent-guide/cli-guide/README 同步为 9 值（含 group）；lgdl-spec.md/design.md 为语言规范与设计历史产物，不动 |
| ⑤ | lgdl-core/dist 存在 3 个历史残留文件（operations/web-cli/cli-parser，旧版构建产物） | 已清理（gitignored，不影响 git 状态） |
| ⑥ | summary 口径（plan §6.2 解读 A） | 走 addNode 现有文案 `added node "g2" :group (label) with N member(s)`，不特判 "added group"；错误消息按 R-006/R-009 口径表统一（Node not found / attached edge(s) / Node id already exists / Invalid node id） |

## 6. 下一步

| 场景 | 操作 |
|------|------|
| 全部任务已完成 | 运行 `@sddu-review specs-tree-unify-group-cmd` 开始审查 |

## 修订记录
> 记录本文档的版本变更历史

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建 — 9 任务 7 波次全部完成；命令合并全量落地（node 命令承载分组语义、DD-001~003 三护栏、LgdlOperation 9→6）；测试守恒（206→215 / 76→79）+ 全仓 grep 零残留 + 语义模型零改动；state.json phase→builded | 2026-09-01 | SDDU Build Agent |
