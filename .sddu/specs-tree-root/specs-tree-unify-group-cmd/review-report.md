# 审查报告：group 命令合并（specs-tree-unify-group-cmd）

> **文档定位**: SDDU 审查报告 — 逐项记录自主审查的执行结果，作为 validate 阶段的输入
> **审查策略**: review.md（C1~C18 审查清单及四维度指引）
> **前置依赖**: review.md（审查策略）、spec.md（需求规范）、plan.md（技术方案）、build.md（构建产物）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-02
> **审查轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-02
> **更新说明**: 初始创建 — C1~C18 逐项执行完毕（读代码 + git diff + tsc/test/grep 实跑复核），App.tsx 17 错误定性为 V2 遗留基线，build 6 项偏差全部复核，0 阻塞 4 改进，结论 ✅ 通过

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查项总数 | 18 |
| 通过 | 17 |
| 警告 | 1 |
| 失败 | 0 |
| 阻塞问题 | 0 |

## 2. 逐项审查结果（C1~C18）

| # | 审查对象 | 审查基准 | 评估 | 发现 | 严重程度 |
|---|---------|---------|:--:|------|:--:|
| C1 | add-node `--contains` 三层落地 | FR-001 | ✅ | mutations.ts:96 `AddNodeOptions.contains`、:190-197 节点构造写 contains、summary :204-206 `added node "g2" :group ... with N member(s)`；commands.ts:134-146 buildOperation 解析（split/trim/filter，与旧 add-group 同形态）；cli add-node.ts:19/37 option+透传。commands.test DD-002 解析断言（contains 'a,b' → ['a','b']）覆盖 | 无 |
| C2 | contains 校验集 + 原子性 | FR-002 / EC-005 | ✅ | validateContainsMembers（mutations.ts:48-81）校验序与旧 addGroup 一致：自含（:63-65）→未知成员（:66-70）→alreadyInTarget（:71-76）→membersOf 重复归属含嵌套冲突（:77-79）；FR-002 原子性测试断言 BASE.nodes/edges 不变 | 无 |
| C3 | DD-002 双保险 | FR-003/004 / EC-001/002 / ADR-002 | ✅ | 命令层 commands.ts:125-133（kind 解析后判 `kind !== 'group'`）+ 核心层 mutations.ts:176-185（resolvedKind 判，防直接 API 调用绕过）；护栏测试 DD-002 断言 /kind.*group/ + /请显式传 --kind group/，EC-002 断言 entity/state 双场景 | 无 |
| C4 | web-cli 命令定义面移除 | FR-005 / FR-007 / FR-021 | ✅ | COMMANDS 6 命令（commands.ts:22-65）；buildOperation 仅 6 case；protocol.ts 三 case 删 + 头注释枚举更新（:16-19）+ loud reject 主落点（:128-151，改用指引 add-node --kind group --contains / remove-node / update-node，命令名字面量拼接避免 grep 误匹配）；help.ts INCR_EXAMPLES/SUMMARIES 6 条；tools.ts enum 17 项无三命令。packages/ 全仓 grep 零残留 | 无 |
| C5 | cli 终端面移除 | FR-006 / AC-01 | ✅ | registry.ts COMMANDS 16 项、无三 import（:23-52）；add-group.ts/remove-group.ts/update-group.ts 三文件 git 状态 deleted；add-node.ts 补 `--contains`（:19/37）与 kind 说明含 group（:17）；update-node.ts 补 `--contains-add`/`--contains-remove`（:21-22/33-34） | 无 |
| C6 | LgdlOperation 9→6 连锁 | FR-008/009/010 / NFR-006 | ✅ | types.ts:210-261 六变体（add-node 含 contains :222、update-node 含 containsAdd/containsRemove :235-237）；operations.ts describeOperation 6 case / OperationMutations 6 成员 / lgdlDispatch 6 分派且 contains/containsAdd/containsRemove 透传（:79/:93-94）；index.ts 无三符号导出。tsc 实跑：lgdl-core ✅ / lgdl-web-cli ✅ / lgdl-cli ✅ | 无 |
| C7 | mutations 收敛（5 符号删除） | FR-011/012/013 / AC-04 | ✅ | mutations.ts 无 addGroup/removeGroup/updateGroup/AddGroupOptions/UpdateGroupOptions（grep 确认）；逻辑并入：addNode :164-222（contains + DD-002）、removeNode :224-246（已能删 group，父组摘除 + 清边）、updateNode :333-442（containsAdd/Remove + DD-003） | 无 |
| C8 | DD-001 语义（id 语义独立参数） | FR-013/014/015 / ADR-001 | ✅ | containsAdd/containsRemove 独立参数（mutations.ts:129-134 注释明示 id 语义、与 memberAdd 结构化类成员区分）；memberAdd/memberRemove 走 assertMemberShape 语义不变；先 add 后 remove（:392-398，对齐旧 updateGroup :509-511）；summary 记 `contains+ b`/`contains- a`（:436-437）；非 group 节点 loud 报错（:360-365） | 无 |
| C9 | DD-003 kind 护栏 | EC-004 / ADR-003 | ✅ | mutations.ts:354-358（group→非 group 报错含"分组节点不允许修改 kind"+remove-node 指引）；同值 'group'→'group' no-op（EC-004 测试断言 contains 保留）；反向 entity→group 允许且无孤儿 contains（DD-003 reverse 测试断言 `g?.contains === undefined`） | 无 |
| C10 | 零语义模型改动 | NFR-001 / AC-06 | ✅ | git diff --name-only 41 文件清单：无 parser.ts/serialize.ts/layout/render 任何文件；types.ts diff 仅 LgdlOperation 联合收缩（+3 字段、-3 变体），LgdlDocument/LgdlNode/LgdlMember/NodeKind 等语义模型类型零 diff | 无 |
| C11 | 错误消息口径一致性 | NFR-004/007 / EC-006/010 | ✅ | 对照 plan §6.2 口径表逐项：`Node not found`（:226/:337）、`attached edge(s)`（:244）、`Node id already exists`（:168）、`Invalid node id`（:171）已统一；四类校验文案保留（cannot contain itself / unknown node or group / already belongs to group / is already in group / Member not found in group）；新增三护栏文案（DD-002 :183、FR-015 :363、DD-003 :356）与 §6.2 新增行逐字一致 | 无 |
| C12 | mutations 收敛代码质量 | §5.1 方法论 | ✅ | validateContainsMembers 共享 helper 职责单一（add/update 双路径复用，FR-014 落点）；校验前置、错误处理完整；无魔法数字/硬编码；DD-002/DD-003 注释完整解释设计意图（孤儿 contains / 静默数据错等） | 无 |
| C13 | 命令层代码质量 | §5.1 方法论 | ⚠️ | KNOWN_PARAMS 补 contains-add/contains-remove（R-011 落地正确，commands.ts:72）；发现 2 处小问题：① help.ts:6 头注释仍写"增量命令（add-node 等 9 个）"（实为 6 个，本次 9→6 应顺手改）；② KNOWN_PARAMS 'to' 键重复（:70/:72，Set 去重无害，既有冗余非本次引入） | 低 |
| C14 | 测试迁移守恒矩阵 | FR-016/017/018 / NFR-005 | ✅ | 15 项映射无缺项：mutations 12（addGroup 7→addNode kind:group、removeGroup 4→removeNode、updateGroup 1 拆三段 containsAdd/rename/already-in-group）+ commands 1（9→6 断言）+ operations 2（add-group 落成员→add-node kind:'group'、describeOperation 9→6 变体正则改 `^(add\|remove\|update)-(node\|edge)`） | 无 |
| C15 | 护栏测试有效性 | plan §6.3 / EC-001~008 | ✅ | 9 项全部存在且断言有效：DD-002（双正则）、EC-002（entity/state 双场景）、EC-003（containsAdd/Remove 双断言）、EC-004（报错 + no-op contains 保留双断言）、DD-003 反向（kind + contains undefined）、FR-014 消息一致（`assert.equal(updErr, addErr)` 精确相等）、FR-014 不在组（精确消息）、EC-008（空串/空白双断言）、FR-002 原子性（BASE 全量比对） | 无 |
| C16 | 回归验证复核 | build.md §4 / AC-01~07 | ✅ | 实跑复核 build 声明全部一致：lgdl-core tsc 全绿 + **267 pass/0 fail**（HEAD 206→215 成立）；lgdl-web-cli tsc 全绿 + **79 pass/0 fail**（76→79 +3 成立）；lgdl-cli tsc 全绿；lgdl-web **35 pass/0 fail**（tsc 仅 App.tsx 17 基线错误，见 C17）；全仓 grep 唯一命中 docs/reviews-2026-08-24/ai-vision-review.md:27（NG-005 例外清单合规）；三入口 loud reject 复核通过 | 无 |
| C17 | **偏差①：App.tsx 17 个 tsc 错误定性** | build.md §5-① | ✅ | **定性确认：V2 遗留基线，非本 feature 引入。** 证据链：① tsc 实跑 17 个错误全部是 `() => string` 不匹配 `OpHandler`（期望 `OpExecResult = {ok, output}`）；② 契约定义于 lgdl-web-op-cli/src/handlers.ts:10-16，引入于 **d03dca4（V2 抽取与包体系重构）**；③ App.tsx 与 lgdl-web-op-cli **均不在本 feature git diff 文件清单**，App.tsx 最后修改于 0489db9（收口五件套）；④ 错误行（:949-1059）全部是 UI 操作 handler（copy-source/toggle-editor/export-svg/preview-zoom 等），与 group 命令无关。结论：V2 抽取时 OpHandler 契约（OpExecResult）与 App.tsx 注入回调（返回 string）未同步的遗留问题，build 偏差①定性准确 | 无（非本 feature 引入，但属基线欠债，见改进项 2） |
| C18 | 偏差②~⑥复核 | build.md §5-②~⑥ / plan §6.2 | ✅ | ② docs-tree-root 代为落盘：git diff 抽查 adr-index.md（9→6/19→16 + ADR-008 分组语义补充）、diagrams architecture-layers/deps.html + visual-check.json（16 命令/6 命令计数）——机械同步准确；仅路径引用陈旧（packages/core/ 等，V2 已更名）待 @sddu-docs 复核（改进项 3）。③ protocol.test +1 FR-007 断言：属 TASK-008 AC-03 验收范畴，合理。④ kind 取值 9 值（README/ai-agent-guide/cli-guide 同步，lgdl-spec/design 未动 = NG-005 合规）。⑤ dist 3 文件清理：gitignored 构建产物，git status 无影响。⑥ summary 口径解读 A：addNode 现有文案 `added node "g2" :group ... with 2 member(s)` 无 "added group" 特判（:204-206），测试断言同步；错误消息按 R-006/R-009 表统一 | 无 |

## 3. 审查维度汇总

| 审查维度 | 审查项数 | 通过 | 警告 | 失败 | 通过率 |
|---------|:--:|:--:|:--:|:--:|:--:|
| 代码质量 | 3 | 2 | 1 | 0 | 67% |
| 规范符合性 | 7 | 7 | 0 | 0 | 100% |
| 架构一致性 | 5 | 5 | 0 | 0 | 100% |
| 测试质量 | 3 | 3 | 0 | 0 | 100% |

> 注：代码质量维度 C13 的警告为 2 处注释/冗余小问题（help.ts 头注释、"to" 键重复），均不影响行为；维度通过率按项计 67% 因 C13 含警告，实际无失败项、无阻塞。

## 4. 阻塞问题

| # | 位置 | 问题 | 对应 Cx | 修复建议 |
|---|------|------|:--:|---------|
| — | — | 无阻塞问题 | — | — |

## 5. 改进建议

| # | 位置 | 问题 | 对应 Cx | 建议 |
|---|------|------|:--:|------|
| 1 | packages/lgdl-web-cli/src/help.ts:6 | 头注释仍写"增量命令（add-node 等 9 个）"，实为 6 个（本次 9→6 未顺手同步注释） | C13 | 改"6 个"；顺手检查 adapters/lgdl.ts 同类注释（:9 已改对） |
| 2 | packages/lgdl-web/src/App.tsx:949-1059 + lgdl-web-op-cli/src/handlers.ts:10-16 | **V2 遗留基线**：App.tsx 注入的 16 个 UI handler 返回 string，与 OpHandler 契约（OpExecResult）不匹配 → lgdl-web tsc 17 错误（非本 feature 引入，但不修则 NFR-006 长期不绿） | C17 | 后续 feature 修复：handler 回调改为返回 `{ok:true, output:...}`（或调整契约），validate 阶段确认 lgdl-web tsc 除基线外无新增错误 |
| 3 | .sddu/docs-tree-root/adr-index.md 等联动文件 | 命令计数已同步（19→16/9→6）但路径引用陈旧（packages/core/、packages/cli/，V2 后实为 lgdl-core/、lgdl-cli/） | C18 | 触发 @sddu-docs 复核 docs-tree-root 时一并修正路径引用（本 feature 已按 plan §5.5 完成计数/清单机械同步） |
| 4 | packages/lgdl-web-cli/src/commands.ts:70/72 | KNOWN_PARAMS 'to' 键重复（Set 去重无害，既有冗余，非本次引入） | C13 | 可选清理：删除 :72 行尾重复 'to' |

## 6. 结论

**结论**: ✅ 通过

| 指标 | 结果 |
|------|------|
| 审查通过率 | 17/18（94.4%）；失败 0 |
| 阻塞问题数 | 0 |
| 规范符合性偏差 | 0 项（21 FR / 7 NFR / 10 EC 全部符合） |
| 可进入 validate | 是 |

**理由**: 21 个 FR 全部在代码中有对应实现且验收标准可满足（mutations.ts / commands.ts / protocol.ts / operations.ts / registry.ts / 测试 / 文档逐项核对）；3 个 ADR（DD-001~003）落地完整（含双保险与护栏测试）；零语义模型改动经 git diff 确认（parser/serialize/layout/render 零 diff，types.ts 仅 LgdlOperation 收缩）；15 项测试迁移守恒 + 9 项护栏断言有效；各包 tsc/test 实跑复核与 build 声明一致（lgdl-core 267 / lgdl-web-cli 79 / lgdl-cli tsc ✅ / lgdl-web 35，唯一例外为 App.tsx 17 个 V2 遗留基线错误——已定性非本 feature 引入，不构成阻塞）；build 6 项偏差全部复核属实（① 定性 V2 遗留 ② docs-tree-root 机械同步准确 ③④⑤⑥ 合理）。改进项 4 个均非阻塞，建议 validate 阶段一并验证。可进入 validate 动手验证。

## 修订记录
| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1）— C1~C18 全部执行；App.tsx 17 错误定性 V2 遗留；0 阻塞 4 改进；结论 ✅ 通过 | 2026-09-02 | SDDU Review Agent |
