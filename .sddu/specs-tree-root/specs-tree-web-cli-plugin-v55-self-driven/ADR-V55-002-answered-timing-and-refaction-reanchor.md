# ADR-V55-002: `'answered'` 时机源扩张 + `ref-action` 抑制的**时机侧**等价重锚（X-SELF-2 读法①）

## 状态
ACCEPTED

## 背景

现状两条硬事实：

1. `RecommendTrigger` = **恰 4 项**（`sidepanel.ts:1791`：`'pick'|'stale'|'idle'|'firstRun'`），**无 `'answered'`**
   ⇒ 答完之后推荐器**永不重新求值**（R4 的时机侧）。
2. `ref-action` 的 `when` 含 `ctx.session.openAsks === 0`（`providers.ts:136-148`）—— ask 开着时抑制；
   而答完之后**没有重跑时机**，于是抑制永不解除。

spec FR-SELF-030~036 / FR-SELF-101 / X-SELF-2 要求：时机词汇**扩张**（必须含 `'answered'`）、旧 4 项判据**逐条保留**（计数只增）、
`openAsks === 0` 抑制**显式裁决**（二选一显式：时机侧 / `when` 侧），且**不得**放宽阈值与常量。

## 决策

### 1. 时机源闭集：4 → **5**（旧 4 逐字保留）

```ts
/** 时机源闭集（**单一声明源**；`sidepanel.ts` 只 re-export 类型，零第二声明）。 */
export const DRIVER_TIMINGS = Object.freeze(['pick', 'stale', 'idle', 'firstRun', 'answered'] as const);
```

- 新增 `'answered'`，语义 = 「**某个已表达意图的终态刚刚发生**」（spec 逐字）。
- `sidepanel.ts` 的 `RecommendTrigger` **移出**（改为 `export type RecommendTrigger = DriverTiming;` 的单行 re-export）。
- `test/driver-timings.test.ts` 断言：集合**恰 5** ∧ 含 `'answered'` ∧ 旧 4 **逐字在** ∧
  `src/` 内除单源外**零** `'pick'|'stale'|'idle'|'firstRun'` 裸字面量（白名单 = 声明源 + 既有调用点）。

### 2. 抑制的裁决：**读法①（时机侧解决），`ref-action.when` 零改字节**

**决定性事实**：`submitAskFor` 在**同一次调用内**先 `dispatch({type:'ask-resolved'})`（`:2580-2586`）**再**走驱动路径（`:2587`）。
⇒ 到达 `'answered'` 求值时，该 ask **已在 `state.stream.openAsks` 中结算完毕** ⇒ `openAsks === 0` **自然成立**（当它是唯一开口 ask 时，而 `MAX_OPEN_ASKS = 2` 的另一条若仍是 ask，则抑制**正确保留**）。

⇒ **`when` 侧不需要任何改动**，X-SELF-2 的取代被完全吸收在**时机侧**：

| 项 | 处置 | 判据 |
|---|---|---|
| `RecommendTrigger` 恰 4 项 | **等价重锚**：值集 4 → 5（旧 4 逐字） | 单源扫描 + 计数 ≥5 + 含 `'answered'` |
| `ref-action.when` 的 `openAsks === 0` | **逐字不动**（`providers.ts:142` 该行 sha 不变） | 反证：把该行改成 `unanswered === 0` ⇒ 「`when` 零改」判据 FAIL（R-V55-102 的结构性防线） |
| 「答完永不重跑」 | **由时机侧消除**：结算后恰在**一次** `'answered'` 求值内产出可达 next | `test/ui/recommendation.mjs` 增断言 + 反证：删掉 `'answered'` 触发 ⇒ FAIL（复现会话 B 静默） |
| 求值入口恰一处 | **不变**：`maybeRecommend` 定义恰 1 + 调用点恰 7（ADR-V55-001 §5） | `test/driver-timings.test.ts` + `gate-integrity` |
| 防抖三常量 | `NEXTSTEP_MIN_INTERVAL_MS = 10_000` / `MAX_CHIPS_PER_CARD = 3` / `MAX_NEXTSTEP_CARDS_PER_ROUND = 1` **逐字不动** | 既有断言不减 + 反证：放宽任一 ⇒ FAIL |
| `firstRun` 的「至多一次」 | **仅**适用于 firstRun 面（`maybeRecommendFirstRunEntry`）；`'answered'` **不复用**该语义 | 断言：同一次面板生命内 `'answered'` 可多次触发（受去重 + 10 s 防抖约束）；反证：把新时机并入「至多一次」⇒ FAIL |

### 3. 触发点（**不是**调用点）

`'answered'` 的触发点 = `nextAfterSettle({ kind: 'answered', terminal })`（ADR-V55-001 §5），
由 §2 的三条「用户已表达的话」结算路径调用：`submitAskFor`（ref 回合 / 面板 op / 后台 ask 三型）与 `submitDescribe`。
**全部经既有单一求值入口**，`maybeRecommend(` 计数不增。

### 4. 时机 → 驱动者映射（FR-SELF-036）

```ts
/** 时机 → 驱动者（从 DRIVERS 抽取，**不手写第二份**）。 */
export function driversForTiming(t: DriverTiming): readonly string[];
```

判据（`test/driver-timings.test.ts`）：
1. 每个时机 **≥1** 驱动者；2. 每个驱动者的每个 timing 都在闭集内；
3. 「**答完之后谁会接手**」可回答：`driversForTiming('answered')` 非空 ∧ 其中至少一个的 `driverClass` 明确；
4. 注入「映射表多一行 / 少一行 / 悬空 timing」三类 ⇒ **各必 FAIL**（还原 ⇒ PASS）。

## 后果

**正面**
- 会话 B 的「彻底静默」在**时机侧**被消除，且**没有**为了修它而放宽 `when` 或改任何阈值常量。
- 时机值集扩张是**纯加法**：旧 4 项的生产调用点（7 处）与判据全部保留；`firstRun` 语义不被污染。

**负面 / 代价**
- 时机源现在是**值集 + 触发点 + 映射**三者协同：实现者必须把新触发点接到 `nextAfterSettle` 而不是就地加一行 `maybeRecommend(...)`（R-V55-101，由计数机核兜底）。
- 若同屏存在**第二条未答 ask**（`MAX_OPEN_ASKS = 2`），`ref-action` 仍被正确抑制 ⇒ 需要「第一条 ask 的答案」驱动的场景要等第二条结算 —— 这是**语义正确**的（避免 ask 未答时抢推荐面），登记为已知口径而非缺陷。

**被否决的替代**
- **`when` 侧重锚**（`openAsks === 0` → `unanswered === 0`）：需要新增 ctx 字段并改写被 v5 门禁逐字钉住的谓词行，等价重锚成本更高、且给「顺手改宽抑制条件」留下口子（R-V55-102）。
- **新增第 5 个以外的多个时机值**（`'bound'|'probe'|'receipt'`）：七类时刻中 4 类（绑定完成 / 拾取完成 / 探测稳态 / 授权回执 / 回合结束）**已由既有 `pick`/`idle` 覆盖**（见 ADR-V55-003 §3 映射），多开时机值只增维护面与体积，不增覆盖面。
