# ADR-NDA-003: 触发无条件与 `ai-led` 独立规则位（`NEXTSTEP_PRIORITY` 恰 4→5 等价重锚 + 密度重锚）

## 状态
PROPOSED

## 背景

两件事被 F-36 绑在一起，但**只有一件**是真的：

| 面 | 现状 | 事实 |
|---|---|---|
| 产出**提示**面 | 契约句 `NEXT_CONTRACT_GUIDANCE` **只并入有引用分支**（`ref-context.ts:97-100`：`valid.length === 0 ⇒ return ''`） | ✅ 真偏颇：无引用回合 LLM **根本未被提示**产 next（Q-NDA-003 根因） |
| 产出**落位**面 | `ai-next` provider `rule:'ref-action'` + `prepend:true`（`providers.ts:162-175`）；`when = (ctx.session.aiNext?.length ?? 0) > 0 && ctx.session.openAsks === 0`（`:171`） | ⚠️ **复核订正**：`when` **不读 refs** ⇒ 无引用时 AI 候选**已能**落位（借 `ref-action` 规则槽，`recommend.ts:506-515` 逐 provider 取首个 `when` 为真者）。真正的问题是**语义错位**（AI 的建议被登记为「用这条引用」这一档）与**标题/证据面误导**（靠 `label` 覆盖 + `evidence=['session.aiNext']` 才没出错） |

因此本 ADR 只处理**语义与登记面**，并顺带把「无条件」做成**可判**而不是靠巧合：把 `ai-next` 从 `ref-action` 槽里搬出来，给它**自己的规则位**。

## 决策

### ① `NEXTSTEP_PRIORITY` 恰 4 → **恰 5**（`ai-led` 插在第 2 位）

```ts
// recommend.ts:60
export const NEXTSTEP_PRIORITY = Object.freeze([
  'risk-recovery',        // 1（不动）
  'ai-led',               // 2  ★ 新增：AI 结构化产出（无条件驱动）
  'ref-action',           // 3（原 2；语义与判据逐字不变，只改位次）
  'onboarding',           // 4（原 3）
  'capability-discovery', // 5（原 4）
] as const);
```

- `NEXTSTEP_LABELS`（`recommend.ts:428-433`）补 `'ai-led': '下一步推荐：AI 建议'`（`ai-next` 已带 `label` 覆盖，此常量为类型完备与兜底）；
- `NextstepRuleId`（派生自 `NEXTSTEP_PRIORITY`）自动纳入；
- `RULE_PROVIDER_IDS`（`providers.ts:88`，现 `['onboarding','ref-action','capability-discovery']`）**追加 `'ai-led'`**（已核：该导出在全仓**零消费方**（仅声明），故此项为**语义完备**而非门禁必需；按「只增不删」处理）。
- **位次的语义**：`risk-recovery` 仍是最高（风险先于建议，`FR-NDA-044` 的确定性接管语义不变）；`ai-led` 高于 `ref-action` ⇒ **行为与 F-36 的 `prepend` 等价**（AI 在有引用时仍优先）；当 `aiLed.when === false` 时逐级回落（`ref-action` → `onboarding` → `capability-discovery` → 零死端 floor）。

### ② provider 改动（`providers.ts`，**加法 + 一处 rule 字面量变更**）

```ts
{
  id: 'ai-next',                 // ★ 不变（DQ-1 双向包含 13↔13 的既有键；PD-NDA-005）
  deps: ['session'],
  priority: 1,                   // ★ 2 → 1（相对位次随规则表前移；仅影响 resolveOrder 内部排序）
  prepend: true,                 // 保留（同 priority 内的显式优先）
  mode: 'waterfall', fail: 'card-boundary',
  rule: 'ai-led',                // ★ 'ref-action' → 'ai-led'
  label: '下一步推荐：AI 建议',   // 不变
  when: (ctx) => (ctx.session.aiNext?.length ?? 0) > 0 && ctx.session.openAsks === 0,  // 逐字不变
  chips: [ACT_TO_OP.next],       // 静态下界（empty-chips 判据不删）
  chipsFor: (ctx) => (ctx.session.aiNext ?? []).map((c) => c.opId),
  textOf: (ctx) => (ctx.session.aiNext ?? []).map((c) => c.label),
}
```

- **`when` 逐字不变** —— 这是「无条件」的可判事实：它**从不读 refs**；触发面只在**产出侧**（工具无条件下发，ADR-NDA-001）与**提示侧**（删除 `NEXT_CONTRACT_GUIDANCE`，ADR-NDA-004）；
- `DRIVER_DECLS_SRC['ai-next']`（`providers.ts:267`）**逐字保留**（`driverId:'ai-next'` / `timings:['idle']` / `moments:['turn-end']` / `driverClass:'ai-driven'` / `priority:2` / `evidence:['session.aiNext']`）—— 注意 `DriverDecl.priority` 与 `NextProvider.priority` 是**两个面**，`decl.priority` 无需随 provider 位次变（DQ-3 只比对 when-scope ↔ evidence，DQ-1 只比对 id 集合）；
- **零新增触发词**：`timings` 仍 `['idle']` ⇒ `DRIVER_TIMINGS` 恰 5（`drivers.ts:31`）与 `DRIVER_TIMINGS_LEGACY4` 逐字不动（FR-NDA-043 / DT-2 / DT-3）。

### ③ 密度重锚（**不放松**）

`priorityOf = NEXTSTEP_PRIORITY.indexOf(rule) + 1`（`recommend.ts:435-437`）只影响**排序**，不改变任何渲染预算：

| 预算 | 保持 |
|---|---|
| `MAX_NEXTSTEP_CARDS_PER_ROUND = 1`（`recommend.ts:51`） | 逐字不动 |
| `MAX_CHIPS_PER_CARD = 3`（`:54`） | 逐字不动（AI 候选亦 ≤3，`chipsFor` + `chipDedupKey` 去重） |
| 密度阈值 7/15 · 9/20 · 17/35（`density-scope.ts` / 门禁） | 逐字不动（**不由本 Feature 触碰**） |
| 终端不进 chip 预算（`terminal` 加法字段，`cards/nextstep.ts`） | 逐字不动 |

⇒ 「密度重锚」= **显式声明密度未受影响 + 门禁按既有阈值复跑绿**（不是改阈值）。若实测出现越阈值（窄视口 320px）⇒ **禁止抬阈值**，按「AI 卡与既有单卡同形且 ≤3 chip」的事实复核渲染，必要时以 `PD-NDA-*` 登记。

### ④ 门禁处置（**等价重锚，判据可 FAIL**）

| 门禁 | 现状判据 | 重锚 |
|---|---|---|
| `test/recommendation-sources.test.ts` ③ | 「`NEXTSTEP_PRIORITY` 恰 4 + 逐项值可复算」 | **恰 5** + 逐项值复算 + **注入「恰 4 / 位次漂移」伪造源 ⇒ 必红**（判据非恒真） |
| `test/recommendation-sources.test.ts:143-145` | 「每个候选的 `priority` 必须 == `NEXTSTEP_PRIORITY.indexOf(rule) + 1`」 | **逐字保留**（判据自适应新表）；断言**不变** |
| `test/recommendation-sources.test.ts:625` | 「风险恢复（priority 0）必须赢过 AI（**骑 priority 2 槽**）」 | **断言不变**（`cards[0].rule === 'risk-recovery'` 仍成立）；**注释**随语义重锚为「AI 独立 `ai-led` 槽（priority 2）」 |
| `test/ai-next-candidate.test.ts` AI-N-9 | `DRIVER_DECLS_SRC` 12↔12 + `evidence=session.aiNext` + `chipsFor` 权威 | 12↔12 保持（叶1 不加 provider）；`ai-next.rule === 'ai-led'` 追加断言 |
| `test/ai-next-candidate.test.ts` AI-N-2 | 5 道链顺序即优先级 | 逐字保留（校验链未动） |
| `test/driver-quadruple.test.ts` / `test/next-registry.test.ts` NR-10 | 12↔12 | **叶1 不动**（无新 provider）；**叶2** 因新增 `llm.abnormal` 走 12→13（ADR-NDA-202） |
| `test/op-three-tier.test.ts` / `sw-op-mirror.test.ts` / `next-dispatch-diff0.test.ts` | 三档 / 双面 / 集 B 单源 | **零改**（本 ADR 不触 op 面） |

### ⑤ 取代台账（X-NDA-5）

`docs/v4-supersession-ledger.json#xNdaLedger` 一行：
`old = "ai-next provider rule:'ref-action'（providers.ts:162-175）+ NEXTSTEP_PRIORITY 恰 4"` → `new = "rule:'ai-led' + NEXTSTEP_PRIORITY 恰 5（第二位）"`；`reason`（作者原则「配置 LLM ⇒ 对话结束即驱动」+ DC-NDA-010）；`date = 2026-09-27`；`landing = 叶1`；`counterCheck = recommendation-sources ③ 逐项复算 + 注入反证`。

## 备选方案

| 方案 | 处置 |
|---|---|
| A：继续骑 `ref-action` 位（只改注释 / evidence） | ⚠️ 可行且零门禁代价，但**违反 FR-NDA-042 字面**（「不再骑 `ref-action` 独占」）；且把「AI 建议」登记成「用这条引用」这一档，与本题「机制错位」同构 |
| C：规则表外的独立注入点（仿 `free-input` 终端） | ❌ 绕过 `candidateRules` ⇒ 同时绕过 `passesSafety`（`recommend.ts:549-551`）/ R6 去重 / 单卡预算口径 ⇒ 制造**第二产出路径**（N-NDA-022 / NFR-NDA-013 明令禁止） |
| D：把 AI 候选做成 `risk-recovery` 之上 | ❌ 会让 AI 建议压过风险恢复（`FR-NDA-044` 的确定性接管顺序被推翻） |

## 后果

**正向**：
- 「配置 LLM ⇒ 对话结束即驱动」在**登记面**诚实成立（AI 是独立一档推荐规则）；
- 行为与 F-36 **等价**（AI 仍优先于 `ref-action`），但语义可读、可判；
- 零新增触发词 / 零新增 op / 零新增 chip / 零新增 kind。

**代价**：
- 破「恰 4」⇒ `recommendation-sources` ③ 必须重锚（**显式取代 + 台账 + 密度重锚**，spec §12 X-NDA-5 已预授权）；
- A 列微小增量（规则表 + 标签 + provider `rule` 字面量：≈ +0.1~0.3 KB）；
- 若未来有第三方读 `NEXTSTEP_PRIORITY` 位次做持久化 ⇒ 需复核（本仓仅 `priorityOf` / 门禁复算读取，已核）。

## 落地判据（供 tasks/build）

1. `NEXTSTEP_PRIORITY.length === 5` 且第 2 项 `=== 'ai-led'`；`ai-next.rule === 'ai-led'`；
2. 反证：「注入 `['risk-recovery','ref-action','onboarding','capability-discovery']`（恰 4）⇒ 判据必红」；「位次互换 ⇒ 必红」；
3. 行为面：`aiNext` 非空 ∧ 无引用 ⇒ 产卡且 `rule === 'ai-led'`（**无引用仍驱动**，AC-NDA-005）；`aiNext` 空 ⇒ 不占规则位（回落确定性）；
4. `DRIVER_TIMINGS === 5` / `DRIVER_TIMINGS_LEGACY4` 逐字 / `DRIVER_DECLS_SRC` 12 行逐字（叶1）；
5. 密度门禁按既有阈值复跑绿（阈值逐字未改）。
