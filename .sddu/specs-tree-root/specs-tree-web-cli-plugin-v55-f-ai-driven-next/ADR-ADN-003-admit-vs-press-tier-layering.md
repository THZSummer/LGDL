# ADR-ADN-003: 「候选接受判定」与「按下判定」分层（`admitCandidate` vs `pressDecision`）

## 状态
ACCEPTED（承父 spec §5.4 TIER FR-ADN-030~035 · §11 DC-ADN-005 · §13.2 N-ADN-016 · R-ADN-901 · R-ADN-905）

## 背景

今天**只有一个** `pressDecision(opId, ctx)`（`ai-drive.ts:67-78`）：

```ts
const d = opDescriptor(opId);
if (!d) return { ok:false, blocked:'unknown-op' };
if (tierOf(d) !== 'auto') return { ok:false, blocked:'tier' };
…
```

这对「**按下**」是**正确**的（只有 `auto` 档可自动按下；`confirm` 的 consent 必须用户答；`gesture` 恒特权）。但若把它直接当「**候选接受（提案）**」判据：

- `confirm` 档（`op.llm-config` / `op.revoke`）的 AI 候选将**永远可见不了** ⇒ 与 discovery §7.3 的裁决（`confirm` 可提案）冲突；
- 反过来，若为了「让 `confirm` 可见」而把闸门放宽为「非 `gesture` 即放行」，则 `gesture` 与 `confirm` **混同**（特权面泄漏）。

⇒ 必须**引入第二层判定**，且两层**共享同一档位单源**（`tierOf`）。

## 决策

### ① 接受层 `admitCandidate`（新增，纯函数）

> 落点 = `background/ai-next.ts`（SW 校验器内；与 5 道校验链同一函数族）。

```ts
export type AdmitBlocked = Extract<PressBlocked, 'unknown-op' | 'tier'> | 'ref' | 'param' | 'label';
export function admitCandidate(c: unknown, facts: AiNextFacts):
  | { readonly ok: true;  readonly candidate: AiNextCandidate }
  | { readonly ok: false; readonly blocked: AdmitBlocked };
```

真值表（**非恒真**，四情形逐一断言）：

| opId 情形 | `tierOf` | 接受层 |
|---|---|---|
| 在册 ∧ 无 consent ∧ `layer==='panel'`（`op.turn`/`op.pick`/`op.describe`/`op.help`/`op.rebind`） | `auto` | ✅ 接受（可自动按下） |
| 在册 ∧ `hasConsent`（`op.llm-config`/`op.revoke`） | `confirm` | ✅ 接受（**可提案可见可点**；consent 须用户答；**不可自动按下**） |
| 在册 ∧ `layer==='sw'`（`op.authorize`/`op.perm.request`） | `gesture` | ❌ 拒绝（`blocked=tier`；**连提案都拒 / 不可见**） |
| 不在册（幻觉 op / 缺 opId） | — | ❌ 拒绝（`blocked=unknown-op`） |

### ② 按下层 `pressDecision` **语义 diff = 0**

- `tierOf(d) !== 'auto'` ⇒ `blocked:'tier'` **保持**；`unknown-op` / `driver-class` / `unconfigured` / `busy` / `not-armed` / `guard` 的**顺序与取值逐字不动**；
- 自动按下路径仍**唯一**：`pressCandidate` → `dispatchChipAction`（恰 1 处）→ `op.turn` 槽；`requestTurn(` **恰 1**（`op-wiring` OP-W-⑦ 判据不删且绿）。
- ⇒ **`confirm` 候选不会自动按下**：`pressDecision('op.llm-config', {actor:'ai',…}) === {ok:false, blocked:'tier'}`。

### ③ 两判定共享 `tierOf` 单源

接受层与按下层**必须**读同一个 `tierOf`（`shared/op-table.ts`）。**零第二档位表 / 零第二阈值**（N-ADN-022 / FR-ADN-033）——反证「第二份档位定义 ⇒ 必红」；`op-three-tier` 判据不降（**加严**：新增断言「接受层档位读取点 = `tierOf`」）。

### ④ `confirm` 候选的点击路径（零新增执行体 / 不绕过 consent）

- `confirm` 候选渲染为普通 chip（`data-op='op.llm-config'` / `'op.revoke'`，经 `ACT_TO_OP`/`OP_TO_ACT` 单一查表 ⇒ **零 per-op 分支**，FR-ADN-056）。
- 点击经**既有** `dispatchChipAction` → `OPS_BY_ID[opId]` → 既有 op 管线 → **既有 consent 卡**由用户作答（`op.llm-config` 的 `secret` 卡 / `op.revoke` 的不可逆确认卡）。**AI 不代答 / 不自动提交**（N-ADN-017；EC-ADN-018）。

### ⑤ 分层**可判**（判据不得恒真）

必须存在一条可机核情形证明「接受 ≠ 按下」：

```
op.llm-config：admitCandidate(...).ok === true
             ∧ pressDecision('op.llm-config', { actor:'ai', driverClass:'ai-driven', configured:true, armed:true }).blocked === 'tier'
op.authorize ：admitCandidate(...).ok === false（blocked='tier'）  // 连接受都拒 ⇒ 不与 confirm 混同
```

反证双向：把 `confirm` 也拒（退回混同）⇒ 必红；把 `gesture` 放行 ⇒ 必红。

## 后果

- 解决「`pressDecision` 非 auto 一律 blocked:tier」与「`confirm` 可提案」的张力 —— **分层而非混同**；
- 特权面（`op.authorize` / `op.perm.request`）在**接受层**就被挡（不进 chips），触达面比「只在按下层挡」**更小**；
- 留痕：被接受但不可自动按下的 `confirm` 候选 → 用户点击后才走既有 consent 流；AI 自动按下尝试一律 `blocked=tier`（既有 `pressCandidate` 留痕）。

## 备选方案（拒绝）

| 备选 | 拒绝理由 |
|---|---|
| 直接复用 `pressDecision` 作接受判据 | `confirm` 永不可见（R-ADN-901），与 DC-ADN-005 冲突 |
| 放宽为「非 gesture 即接受 ∧ 非 gesture 即按下」 | `gesture` 与 `confirm` 混同 ⇒ 特权面泄漏（N-ADN-016） |
| 另写一份档位表喂接受层 | 第二档位表（N-ADN-022 FAIL）；档位漂移不可判 |
