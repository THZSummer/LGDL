# ADR-V55-003: 驱动者终态词汇（法七扩展）+「必有下一个驱动者」三段控制门禁

## 状态
ACCEPTED

## 背景

法七原形（v5）：5 类**阻塞终态**（`BLOCKED_TERMINALS` 恰 5，`definition.ts:34-41`）流内必有可达 next（死端 = 0，
`test/ui/no-dead-end.mjs` 39 断言 + `test/s2-deadend-chain.test.ts` 6 + `test/blocked-terminals.test.ts` 9）。

v5.5 的题眼恰恰是**法七没覆盖的那一类**：**「用户已表达意图」不是终态词汇**——
`applyRefAction` 通过有效性后只 `sends += 1`（`l1/ref-store.ts:290`）、`submitDescribe` 只 `dispatch`、
后台 ask 迟到只 `await errorResponse(...)`。三者共同点：**用户的「话」被记下来了，但没有驱动者接手**。

spec §5.3（FR-SELF-020~028）/ X-SELF-4 / N-SELF-019 / R-SELF-007 / R-SELF-903 要求：
**已答 ask / 已交描述入终态词汇**、每终态**必有下一个驱动者**、判定口径**显式可证伪**、**禁恒真断言**、且既有 5 类阻塞判据**逐条不减**。

## 决策

### 1. 两表**正交**：不改 `STREAM_TERMINALS`，另立 `DRIVER_TERMINALS`

```ts
// stream-model.ts（**零改动**）：流终态 = 卡的生命周期
export const STREAM_TERMINALS = Object.freeze(['answered','cancelled','approved','rejected','invalidated','completed'] as const); // 6 逐字不动

// next-registry/terminals.ts（**新，单一声明源**）：驱动者终态 = 「用户已表达意图」的可判事件
export const DRIVER_TERMINALS = Object.freeze([
  'answered-ref',        // ① 引用回合 ask（ref-round-<refId>）已答
  'answered-op',         // ① 面板 op `params` ask 已答
  'answered-bg',         // ① 后台 ask 已答（**在飞回合内**）
  'describe-submitted',  // ② 「改用描述」已交
] as const);
```

- **正交判据**：`STREAM_TERMINALS ∩ DRIVER_TERMINALS === ∅` ∧ `STREAM_TERMINALS` **6 逐字** ∧
  `DRIVER_TERMINALS` **恰 4** ∧ 后者**恰一处**声明（第二声明 ⇒ FAIL）。
- 「流终态 = 卡的生命周期；驱动者终态 = 用户已表达意图的可判事件」两者关系**文档化 + 机核**（FR-SELF-020）。

### 2. 「必有下一个驱动者」判据（**N = 0**）

- **判据形态**（复用 v5 死端守护的 `nextOf(el)` 双形态）：
  `nextOf(el) = el.querySelector('[data-op]') ?? 紧随同场景可见 nextstep 卡内 [data-op]`；
  `silentWindow = 存在区间 [t0,t1)：既无驱动者归因、又无终态事实、又无可达 next` —— **本场景必须为 0**（FR-SELF-133）。
- **判定口径（N = 0）**：断言**紧跟状态派发之后**（`dispatch → render()` 同步），**不引入新的等待窗口**（与 v5 逐字同义）。
- **7 类时刻逐类**断言「存在 ≥1 个驱动者归属」（`PROACTIVE_MOMENTS`，ADR-V55-001）：移除某类的全部驱动者 ⇒ **FAIL**。

### 3. 七类「已表达意图」时刻 ↔ 时机源 ↔ 驱动者（**映射表，单源抽取**）

| # | 时刻（`PROACTIVE_MOMENTS`） | 时机源 | 承接驱动者（示例） | 终态词汇 |
|:-:|---|---|---|---|
| ① | `answered-ref-ask` / `answered-op-ask` / `answered-bg-ask` | **`answered`（新）** | `ref-action`（`op.turn` 候选）/ 后台 ask 的恢复 next | `answered-ref` / `answered-op` / `answered-bg` |
| ② | `describe-submitted` | **`answered`（新）** | `ref-action` 的 describe 支路 / 恢复 next | `describe-submitted` |
| ③ | `bind-complete` | `idle`（既有） | `capability-discovery` / `site.unauthorized` 恢复行 | — |
| ④ | `pick-complete` | `pick`（既有） | `onboarding`（首装） / `ref-action` | — |
| ⑤ | `probe-steady` | `idle`（既有） | `capability-discovery` | — |
| ⑥ | `auth-receipt` | `idle`（既有） | `capability-discovery` / `binding.stale` 恢复行 | — |
| ⑦ | `turn-end` | `idle`（既有） | `capability-discovery` / `ref-action` | — |

⇒ 新增时机值**只需 1 个**（`'answered'`，ADR-V55-002），覆盖面由映射表机核保证（`test/driver-quadruple.test.ts` 断言 7/7 逐类非空）。

### 4. 「已答」四口径（FR-SELF-023 / EC-SELF-005）—— **每条都可注入违反面**

| # | 口径 | 判据 | 反证注入（必 FAIL） |
|:-:|---|---|---|
| ① | **已答** = `canceled === false` ∧ `trimmed !== ''`（非取消 + 非空） | `submitAskFor` 的 `isCanceled` 计算先于驱动分支（源码序） | 让「卡存在即已答」⇒ 恒真 ⇒ FAIL |
| ② | **已取消** = `canceled === true` ∨ `trimmed === ''` ⇒ **不记「已答」** | 取消路径**不进**驱动者终态词汇（但仍必有可达 next） | 把取消也记成已答 ⇒ FAIL |
| ③ | `ASK_CANCEL_REASONS` **4 项逐字**（`user`/`timeout`/`superseded`/`aborted`） | 逐字命中 | 增删任一项 ⇒ FAIL |
| ④ | 后台 ask **迟到**（回合已结束，`askBridge.settle` 返回 `false`）⇒ **不记「已答」** | 走 `answered-bg` **之外**的固化路径（见 ADR-V55-004 §3） | 把「迟到」也记成 `answered-bg` ⇒ FAIL |

### 5. **禁恒真断言**：每条判据**三段控制**（本 ADR 的核心机制贡献）

对**每一条**新 / 改的终态判据，门禁必须同时给出**三段读数**：

| 段 | 输入 | 期望 | 防的失效形态 |
|:-:|---|---|---|
| **① 正常段** | 真实 ctx + 完整注册表 | 判据 PASS，且**读数非空** | 判据从不运行 |
| **② 反证段** | 该终态存在 **但对应驱动者被移除** | **必 FAIL**（`expectFailPattern` 命中） | 判据恒真 / 恒绿 |
| **③ 对照段** | 该终态**不存在**（前提不成立） | 判据**不要求** next（既非 PASS 也非 FAIL，而是 **N/A**） | 「无条件断言」把 N/A 当 PASS |

③ 是本 Feature 相对 v5「双向反证」的**升级**（v4.5 的三类「反证恒绿」教训 + R-SELF-903）：只有 ① ② 两段时，
一条**恒真**的判据在 ② 段也可能「碰巧 FAIL」（因为移除驱动者会让**别的**判据红）⇒ 三段控制把「因」与「果」钉在同一判据上。
实现形态：`driverTerminalReading(ctx, registry) → { status: 'ok' | 'violated' | 'n/a'; driver?: string; next?: string }`，
门禁对 `status` 逐段断言（`n/a` 计入**独立**计数，不与 PASS 混池）。

## 后果

**正面**
- 「答案不被丢弃」从**实现约定**升级为**可机核终态**；法七从「5 类阻塞」扩张为「5 类阻塞 ∧ 4 类已表达意图」而不削弱原判据（N-SELF-019）。
- 两表正交 ⇒ 下游（含未来维护者）不会把「已答」误当卡生命周期状态（R-V55-103）。
- 三段控制把「判据恒真」从**事后审查**变成**门禁当场 FAIL**。

**负面 / 代价**
- 每新增一个驱动者终态要写三段读数（判据成本 ≈ 3×）；这是刻意选择的「用工作量换可证伪性」。
- `DRIVER_TERMINALS` 与 `PROACTIVE_MOMENTS` 是两个枚举（4 / 7）——刻意分离（终态 = 我方能判的 4 种；时刻 = 覆盖面要求的 7 类，含不需要新词汇的 5 类），两者的映射关系文档化 + 机核。
