# ADR-ADN-004: 注入与合并口径（`chipsFor` 加法契约 · 单卡位 · 前 N ≤3 · R6 扩展 · 替换）

## 状态
ACCEPTED（承父 spec §5.6 MERGE FR-ADN-050~056 · §5.2 FR-ADN-014/015 · §11 DC-ADN-008/016 · §12 X-ADN-3/4/8/9 · PD-ADN-005/007/008）

## 背景

- `recommendNextStep(input)` 是推荐产出**唯一内核**（`recommend.ts:487`；DT-5），输入是 plain record（pure；真值 7 源 / 模块白名单 5）。
- `candidateRules` 遍历 `resolveOrder()`：`rule ∉ NEXTSTEP_PRIORITY` ⇒ 跳过；同 rule 只取**首个 `when` 命中**的行（`seen`）⇒ 「AI 骑 `ref-action` 规则位 + 同规则内 AI 优先」需要**顺序**保证。
- `NextProvider.chips` 是**静态** `readonly string[]`，而 AI 候选的 opId 是**动态**的 ⇒ 现有冻结契约表达不了。
- 现状：单卡 `MAX_NEXTSTEP_CARDS_PER_ROUND = 1` / 3 chip `MAX_CHIPS_PER_CARD = 3` / `NEXTSTEP_PRIORITY` **恰 4**；R6 同因去重（`refActionDigest` 家系）今天只覆盖确定性 ref-action 候选。

## 决策

### ① 注入槽：**既有 7 源之内**（零新增顶层真值源）

- `NextCtx.session` 加**加法字段** `aiNext?: readonly AiNextCandidate[]`（**嵌套在既有 `session`** 之下 ⇒ 顶层仍恰 7 源；`test/next-registry` NR-0「顶层字段集 == 7 源白名单」保持绿）。
- `RecommendInput.session.aiNext?` 同步加法；`recommendCtx(input)` 透传（**唯一** ctx 构造点，零第二处）。
- `CTX_FIELD_SERVICE`：`session.aiNext` 经**既有** `session` 前缀解析（`serviceOfCtxField` 最长前缀）⇒ **零新增登记行**；DT-6 直接绿。
- **类型home**：`AiNextCandidate` 声明在 `next-registry/definition.ts`（**已在** `RECOMMEND_MODULE_WHITELIST`）⇒ `recommend.ts` **零新 import**。
  ⇒ **PD-ADN-008 裁决**：`recommendation-sources` 白名单**不新增条目**（恒 5）⇒ **X-ADN-9 = 未发生取代**。

### ② provider 契约纯加法扩展：`chipsFor?` + `label?`

```ts
export interface NextProvider {
  readonly chips: readonly string[];                    // 既有（逐字保留；validator/OT-4/DQ-2 的读取面）
  /** 加法：动态 chip 的权威产出（在场 ⇒ 覆盖 `chips`）。本轮仅 `ai-next` 使用。 */
  readonly chipsFor?: (ctx: NextCtx) => readonly string[];
  /** 加法：卡片标题覆盖（缺席 ⇒ 逐字沿用 `NEXTSTEP_LABELS[rule]`）。 */
  readonly label?: string;
}
```

- `candidateRules`：`const opIds = p.chipsFor ? p.chipsFor(ctx) : p.chips;` + `if (opIds.length === 0) continue;`。
- `reachableOpIds`（`op.help` 派生）：优先 `chipsFor(ctx)`（真实可达面）。
- **`chips` 仍必填非空**（`validateNextProvider` 的 `empty-chips` loud 判据**不删**）⇒ `ai-next` 声明 `chips: [ACT_TO_OP.next]` 作为**静态下界**（表达「至少可产 `op.turn`」）；`chipsFor` 为权威动态面。
- 既有 11 行 provider **零改动**（无 `chipsFor` ⇒ 逐字同前）⇒ `next-registry` / `design-contract` / `driver-quadruple` DQ-2 / `next-obligation-table` OT-4 的静态读取面**不受影响**。

### ③ `ai-next` provider（第 **12** 行）

```ts
{
  id: 'ai-next',
  deps: ['session'],
  priority: 2,
  prepend: true,          // ★ 同 priority 内按 prepend 先排 ⇒ 赢过确定性 ref-action
  mode: 'waterfall',
  fail: 'card-boundary',
  rule: 'ref-action',     // ★ 骑既有规则位 ⇒ NEXTSTEP_PRIORITY 恰 4 不动（X-ADN-4 未发生）
  label: '下一步推荐：AI 建议',   // 卡片标题覆盖（可选；缺席时退回规则标签）
  when: (ctx) => (ctx.session.aiNext?.length ?? 0) > 0 && ctx.session.openAsks === 0,
  chips: [ACT_TO_OP.next],
  chipsFor: (ctx) => ctx.session.aiNext!.map((c) => c.opId),
  textOf: (ctx) => ctx.session.aiNext!.map((c) => c.label),
}
```

- **顺序**：`resolveOrder` = `(priority asc, prepend desc, seq asc)` ⇒ `ai-next`（priority 2, prepend）排在确定性 `ref-action`（priority 2, 无 prepend）之前 ⇒ **同规则内 AI 优先**；AI `when` 为假 ⇒ `seen` 不落，确定性 `ref-action` 照旧接管 ⇒ **兜底可达**。
- **上层规则仍优先**：`risk-recovery`（0）/ `onboarding`（1）命中时 AI 候选**不显示**（同台竞争 → 高风险优先），与既有语义一致。
- **不新增第 5 规则位 / 不新增 op / 不新增动作**：`ACT_TO_OP` 仍恰 6 行。

### ④ 合并口径：**同单卡位 + 前 N ≤3 + 截断**

- 同台竞争**同一单卡位**（`MAX_NEXTSTEP_CARDS_PER_ROUND = 1` **不动**；X-ADN-3 未发生）。
- **PD-ADN-007 裁决：N = 3**（= `MAX_CHIPS_PER_CARD`）；排序 = **AI 给出的数组顺序**；> 3 条 ⇒ **截断**（不溢出、不新增卡）。
- **槽内不与规则候选交错**：AI 赢 ⇒ 整个 `ref-action` 槽归 AI（这正是「替换陈旧候选」的实现）。
- **列表内去重**：按 `opId#label` 摘要去重（同列表内重复项不占第二个槽）。

### ⑤ R6 同因去重扩展覆盖 AI（X-ADN-8 = 已发生）

- 在 `candidateRules` 内、构造 ctx **之前**，用**同一** `refActionDigest` / `intentDigest` 家系预过滤 AI 候选：
  ```
  key = refActionDigest(candidateRefId ?? `ref_${latestRefNum}` , candidate.label)
  若 key ∈ input.completedActions ⇒ 压掉该条（不动既有 post-filter 对确定性 ref-action 的行为）
  ```
- **判据等价重锚**（非放宽）：去重家系/摘要函数**逐字复用**；仅把「谁进入该家系」从「确定性 ref-action 候选」扩到「AI 候选」；反证「去掉 AI 去重 ⇒ 同 digest 复推 ⇒ 必红」。

### ⑥ 替换口径（FR-ADN-055）双向可判

- AI 候选在场（且赢得槽）⇒ 陈旧的确定性 `ref-action` chip（如「用引用 1 做原地翻译」）**不出现**；
- AI 候选缺席 / 全被拦 / 未产出 ⇒ 确定性 `ref-action` 候选**照旧**。
- 反证双向（在场仍出现 / 缺席却消失 ⇒ 各必红）。

### ⑦ 渲染零 per-op 分支（FR-ADN-056）

chip 的 `data-op` 由 `ACT_TO_OP` / `OP_TO_ACT` 单源派生；`dispatchChipAction` 仍是**一次查表**（零 per-op 分支）⇒ `next-dispatch-diff0` 判据保留。

## PD-ADN-005（本轮裁决 + 后续登记）

**本轮 = 仅 `ref-action` 规则上下文产出**：AI 产出契约只出现在 `refContextSegment` 的**有引用分支**（ADR-ADN-001 §③）⇒ 天然 ref-action 上下文；**更泛的 AI next 产出面**（无引用 / 更多规则位 / 参数化 chip 派发）属扩展面，须重新评估规则位与预算 ⇒ **登记为后续轮**（不静默扩）。

## 后果 / 取舍

- 题眼达成（AI 候选替代陈旧 chip）而**不破**单卡 / 3-chip / 规则表恰 4；
- **代价**：`NextProvider` 两次纯加法扩展（`chipsFor` / `label`）+ `shared/op-table` 的 `ask` 字段 ⇒ 两侧 bundle 各 +数十字节；`recommend.ts` 增 AI 同因预过滤（A 列，薄）；
- **判据**：新增 `ai-next-candidate` 断言「`chipsFor` 权威」、「截断 ≤3」、「替换双向」、「R6 家系覆盖 AI」；既有 `recommendation-sources` / `next-registry` / `driver-quadruple` / `next-obligation-table` 判据**零删**。
