# ADR-IAN-005: 四处兜底入口收敛终态 + `#send-reason` / `sendDisabled` / draft / 引导重锚

## 状态
ACCEPTED（承父 spec §5.6 CONV FR-IAN-050~056 / DC-IAN-005·006 / PD-IAN-006·007·008）

## 背景

四处兜底入口（E1 决策区末项 / E2 `op.describe` 无值相 / E3 L1 装配 / E4 `describe` 空值）**已全部**收敛到 `revealAskFallback()`（A-IAN-002 已证）；`#composer` **没有独立入口**，只被 `revealAskFallback → l0.revealFallback` **附带** reveal。收敛的**残余问题仅为「停止附带 reveal 流外面」这一处**（`sidepanel.ts:2895 → l0/shell.ts:98-99`）。

**只读事实**：

| 面 | 事实 | 位置 |
|---|---|---|
| E1 | 决策区末项 `data-key='ask-other'` → `deps.onRevealFallback?.()` | `cards/decision-region.ts:162-170` |
| E2 | `op.describe` 参数相无值 → `revealAskFallback()` | `sidepanel.ts:1512-1515` |
| E3 | L1 装配 `revealFallback: () => revealAskFallback()` | `sidepanel.ts:3650` |
| E4 | `bindPanelOps.describe`：有值 ⇒ `submitDescribe`；空 ⇒ `revealAskFallback` | `sidepanel.ts:3786-3789` |
| `#send-reason` | **保留载体**（状态栏 `#region-statusbar` 内），非退役 id；`host-registry.ts` 明列「保留」 | `host-registry.ts:295-321` / `index.html:497,513,576` |
| 门禁 | `density-thresholds:787-814,864`（`#send-reason` 必须在状态栏 ∧ 单写 ∧ 离开状态栏必红） | `test/density-thresholds.test.ts` |
| `sendDisabled` | `buttonStates.sendDisabled = !hasOrigin`；`sendDisabledReason(flow?)` 产可读原因 | `view-model.ts:298-315,401-409` |
| draft | `settingsViewSwitch.getDraft/setDraft` 读写 `#input.value` | `sidepanel.ts:1337-1341` |
| 引导 | `ONBOARDING_TEXTS[4] = '在输入框输入指令并发送，开始对话'` | `view-model.ts:350` |

## 决策

**① 四处入口收敛终态（叶2）——裁决 PD-IAN-007 = 保留 `revealAskFallback` 对 `l0` 的调用，但让 shell 只操作卡内。**

- 四处入口统一到**卡内 `.ask-fallback` 唯一载体**；`revealAskFallback()` 调用链内**零流外面**（`l0.revealFallback` 删除 `composer.hidden=false`）。
- **不删** `revealAskFallback` 的 `l0?.revealFallback()` 调用（避免改变既有调用图与门禁选择器）；「唯一载体」由 `l0/shell.ts` 的**写入面**收敛保证。
- `op.describe` 有值相 ⇒ `submitDescribe`（本地结算、不成回合）**逐字不变**（反证「有值相发回合 ⇒ 必红」）。
- 判据「唯一载体」**非恒真**：断言「任一兜底入口触发后，可见输入面恰 1 个（卡内），且 `#composer/#input/#send` 不在 DOM」。

**② `#send-reason` 保留 + 断言重锚（DC-IAN-006）。**

- `#send-reason` **仍在 `#region-statusbar` 内**（状态提示 ≠ 输入面）；`host-registry.ts:295-321` 保留要素逐字不动。
- 判据 `density-thresholds:787-814,864` **等价重锚**：「在状态栏内 + 单写 + 离开状态栏必红」三条逐条保留（非恒真），不得因删面而把这三条变成真空断言。文案来源仍是 `sendDisabledReason`（异常态可读原因：无活跃站点 / 未绑定）。

**③ `sendDisabled` 重锚（FR-IAN-054）。**

- `buttonStates.sendDisabled` 语义**保留**（`!hasOrigin`，仅异常态）；`:2270` 的 `$('send').disabled` writer 随面删除（元素不存在）。
- `AskFlowView.sendDisabled` 重锚到**流内输入面**：禁用仅异常态；**在飞不再硬禁用**（R6 语义保持，ADR-IAN-003 §①）。
- 断言：在飞时流内输入面可提交；无活跃站点 ⇒ 禁用 + 可读原因。

**④ draft 二择（PD-IAN-006）——裁决 = **重锚到流内输入载体**（不退役）。**

| 选项 | 裁决 | 理由 |
|---|---|---|
| 重锚（**采纳**） | `getDraft/setDraft` 改读/写**当前 free-input 卡的 `#ask-input`**（无卡 ⇒ `''` / 空写零副作用） | ① 能力是可用性面（切设置回来不丢草稿），退役是倒退；② 重锚成本 = 换选择器 + 空安全；③ `settings.test.ts:191` 判据可**等价重锚**（不断言删除）；④ 草稿只可能源于「已展开的卡内输入」，无卡时空串语义自洽 |
| 退役（不采纳） | — | 需显式台账登记「能力退役 + 理由」，且 `settings.test.ts:191` 变负向断言 ⇒ 可用性倒退 + 判据语义反转，收益不抵 |

- EC-IAN-011：不静默丢草稿；重锚后「切设置再回来」草稿仍在（判据可判）。

**⑤ 首装引导改指（FR-IAN-056）。** `ONBOARDING_TEXTS[4]` 由「在**输入框**输入指令并发送」改指**流内 next「自由输入…」项**（措辞更新，语义与流内入口一致）；`view-model` 断言等价重锚；不得指向已废面。

**⑥ `RETIRED_CONTAINER_IDS` 精确新下界（PD-IAN-008）——裁决 = 13 + 3 = **16**。**

- `#composer` / `#input` / `#send` **三个 id 全部入册**：三者同为「角色消失且无写点再铸」的真退役容器；逐 id 入册使「真退役 ≠ `hidden`」**逐 id 可判**（`host-registry.evaluateHostRegistry` ③ 逐项、`density-thresholds` 逐项反证）。
- `RETIRED_HOST_ATTRS` 的宿主值 `'composer'`（4 项）**逐字保留**（`density-thresholds:754,774` 原断言继续承重）；`RETIRED_HOST_DISPOSITIONS` 由两表**派生**（`host-registry.ts:200-224`），只增 3 条去向 + 反证元数据。
- 「保留面反证」重锚：`density-thresholds:769` 的 `['input','send','send-reason','rebind']` 逐项拆分——`input`/`send` 由「**不得**在册」转「**必须**在册」（非恒真：注入回 DOM ⇒ 红）；`send-reason`/`rebind` 保持「不得在册」逐字。
- `RETIRED_CONTAINER_IDS.length` 断言 13 → **16**（`density-thresholds:755` / `host-registry:262` 同步，只增不降）。

## 后果

- 正面：输入面单一化「可判」而非「恒真」；`#send-reason` 状态事实不随面误删；draft 能力保留。
- 代价：4 个门禁文件的重锚（density / host-registry / settings / sidepanel-view）+ `view-model` 文案与视图断言。
- 反证族：
  - 反证 ①：重新级联 `l0.revealFallback` 写 `composer.hidden` ⇒ 双输入面判据必红；
  - 反证 ②：`#send-reason` 移出状态栏 ⇒ density 判据必红（保留）；
  - 反证 ③：`#input`/`#send` 不进容器册 ⇒ 入册反证必红；`#composer` 回流 DOM ⇒ 法四必红；
  - 反证 ④：`op.describe` 有值相改成发回合 ⇒ NFR-IAN-008 反证必红；
  - 反证 ⑤：draft 静默丢 ⇒ `settings` 重锚判据必红。

## 影响文件（预估）

| 操作 | 文件 | 说明 |
|:--:|---|---|
| MODIFY | `src/ui/sidepanel/l0/shell.ts` / `sidepanel.ts` | 停引（去流外写入）；draft 重锚 |
| MODIFY | `src/ui/sidepanel/view-model.ts` | `ONBOARDING_TEXTS[4]` 改指；`sendDisabled` 语义锚 |
| MODIFY | `src/ui/sidepanel/host-registry.ts` | `RETIRED_CONTAINER_IDS` 13 → 16 + dispositions |
| MODIFY | `test/density-thresholds.test.ts` | `:389-409` / `:754-776` / `:787-814,864` 等价重锚 |
| MODIFY | `test/host-registry.test.ts` | 长度 13 → 16 + `TEST_RETIRED_CONTAINER_IDS` 同步 |
| MODIFY | `test/settings.test.ts` | `:191` draft 载体重锚 |
