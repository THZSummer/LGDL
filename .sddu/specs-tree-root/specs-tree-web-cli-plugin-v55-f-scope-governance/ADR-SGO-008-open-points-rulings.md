# ADR-SGO-008: PD-SGO-001~007 裁决汇总（读命令 / 重观测 / 字段集 / 可见面 / 计划生成 / 指纹文本对 / 条目上限）

## 状态
ACCEPTED

## 背景

父 spec §8 在 discovery `O-SGO-001~009` 全部裁决之外，另外登记了 **7 条「spec 阶段新识别 / 明确留待 plan 或后续轮」的开放点 `PD-SGO-001~007`**（父 spec §8 / 2 叶 spec §10 / `state.json#openPointsDeferred`）。编排器任务书要求本 plan **在规范边界内逐条裁决**（不得顺手放宽任何既有判据）。

**边界（N-SGO-022）**：`O-SGO-001~009` 已在 spec 批量裁决；本 ADR **只**在 spec 留下的这 7 条上选策略，**不重新讨论**已裁决项。

## 决策（逐条裁决表）

| PD | 问题 | **裁决** | 理由 | 判据锚 / 落点 |
|---|---|---|---|---|
| **PD-SGO-001** | 读命令 `--ref`（`read-element` / `structure`）是否同加 | **本阶段不做**（登记后续轮） | 编排裁决 ④「**先落写命令**」：写是**风险面**（越界写），读是**探测成本面**（`ty.md` 实测 ≥142 条只读探测）；读命令加 `--ref` 不影响范围底座成立。`ref` 参数虽挂在整个 `dom` schema（base 零 diff 下无法只给 `set-text` 声明），但非 `set-text` 子命令传 `--ref` ⇒ **EC-SGO-017 显式错误** | ADR-SGO-003 §2/§6；`test/dom-ref-anchor.test.ts`（非 set-text 注入 ⇒ FAIL） |
| **PD-SGO-002** | 是否每回合注入只读重观测最新摘要 | **不做**（NG-SGO-013）：用回合已有的引用事实（回合发起时快照）即可判范围；每回合重观测引入每回合页面探测（性能 / token 成本） | 现取回合已有事实；唯一的 live 只读观测是 `--ref` 的**每写一次**单节点闸（口径已显式区分） | ADR-SGO-001 §8；`test/ref-context-in-turn.test.ts`（「每回合页面探测次数不增」断言） |
| **PD-SGO-003** | 引用表字段集是否扩 `semanticPath` / `origin` / `navSeq` | **保持 7 项最小集**（`refNum` / `refId` / `selector` / `refMark` / `textDigest` / `refState` / `nodeCount`） | 最小集已可判「命中」（`--ref` 命中 + selector 命中 + 有效性）；扩字段是**加法**（体积 + 无判范围必要）⇒ 留后续轮 | ADR-SGO-001 §9；`test/ref-context-in-turn.test.ts`（字段集断言） |
| **PD-SGO-004** | 范围读数是否入流内可见面 | **不入新的流内可见面**（避免动密度预算与 12 kind 面）；读数经**留痕行** + **二择卡**（叶2）可达 | 编排裁决 ⑥只要求「入留痕」；入流会动密度预算与 12 kind 面 | ADR-SGO-002 §6；`test/density-thresholds.test.ts` / `stream-model`（阈值 / 12 kind 不动） |
| **PD-SGO-005** | 批量计划生成路径：AI 一次产出完整计划 vs 系统在首次写入后聚合 | **系统聚合**（单条 assistant 消息的全 `toolCalls` 中 **in-scope `set-text`**） | 计划 = **真实将写内容**（同一 `toolCalls` 源）⇒ 计划与实际写入**结构性不可漂移**（R-SGO-906 消除）；**零新工具 / kind**；base runner 已提供全部 `toolCalls` | ADR-SGO-004 §1；`test/batch-consent.test.ts#BC-1` |
| **PD-SGO-006** | 计划指纹文本对比较口径（逐字节 vs 归一化摘要） | **逐字节入哈希、摘要出账**：条目按 `{selector, actionType, fromDigest, toText}` **逐字节**规范化后 `sha256`；出账只记摘要 | 「逐字节」保证**不因空白 / 归一化放行**（R-SGO-906 的反面）；「摘要出账」保证审计 / 留痕**零明文**（N-SGO-026）—— 两个诉求**同时**满足 | ADR-SGO-004 §3；`test/batch-consent.test.ts#BC-2` |
| **PD-SGO-007** | 批量卡是否显示条目上限 | **展示上限 8 行 + 诚实计数行**（`共 N 条（显示前 8）`） | 有界展示（防密度爆炸）+ 诚实（用户知道总数）；**纯显示策略**，指纹覆盖**全部 N 条**，**不改变授权范围 / 不放松任何判据** | ADR-SGO-004 §10；`test/batch-consent.test.ts#BC-2`（指纹覆盖 N）+ `test/density-thresholds.test.ts` |

## 后果

**正面**
- 7 条开放点在 **spec 边界内**逐条落定，且**每一条都指向一个可机核判据**（无「顺手定下」的软决策）。
- 两条最关键的裁决（PD-SGO-005 系统聚合 / PD-SGO-006 逐字节入哈希）**互相加强**：系统聚合让计划同源，逐字节哈希让指纹不可放宽 ⇒ 双重堵死 R-SGO-906。

**负面 / 代价**
- PD-SGO-001（读命令）与 PD-SGO-003（字段集）**保持后置** ⇒ 后续轮需再评估（已在 2 叶 spec 的 §10 保留）。
- PD-SGO-007 的 8 行上限是**经验值**（非 spec 数字）⇒ 若真机显示需要调整，属**显示策略**变更（不动指纹 / 授权范围），可后续微调。

**被否决的替代**
- **PD-SGO-001 读写都加**（本阶段）：扩大风险面，且读命令的面 base 零 diff 下无法单独声明（会与 EC-SGO-017 冲突）。
- **PD-SGO-005 AI 自出计划**：可能与真实写入漂移（R-SGO-906）。
- **PD-SGO-006 归一化比较**：空白改动被放行（R-SGO-906 形态）。
- **PD-SGO-007 无上限全展示**：大批量时卡面爆炸（撞密度预算）。

**判据锚**：本 ADR 表逐行的落点门禁（`test/dom-ref-anchor.test.ts` / `test/ref-context-in-turn.test.ts` / `test/batch-consent.test.ts` / `test/density-thresholds.test.ts` / `test/stream-model.test.ts` 邻域）。
