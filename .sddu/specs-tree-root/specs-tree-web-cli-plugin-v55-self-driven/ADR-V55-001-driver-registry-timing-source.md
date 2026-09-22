# ADR-V55-001: 驱动者 = 注册表 provider + 声明表（`drivers.ts`）；主流程 diff = 0 机核

## 状态
ACCEPTED

## 背景

v5（F-32）已把「下一步**是什么**」做成管线强制保证，但「下一步**由谁按**」仍是用户：
`requestTurn` 是面板**唯一**回合发起入口（调用点被门禁钉死**恰 2 处**），推荐器求值时机是**恰 4 项闭集**
（`sidepanel.ts:1791`），`ref-action` 又被 `when: … && ctx.session.openAsks === 0`（`providers.ts:136-148`）硬抑制。
⇒ 「用户已表达意图」之后**没有驱动者接手**（真机会话 B 22:49 彻底静默；会话 A 20:15 答两遍后手动重打）。

spec 的裁决（O-SELF-003 / DC-SELF-003 / FR-SELF-010~019 / NG-SELF-018 / N-SELF-022）要求：
**驱动者集合 ≡ 注册表 provider 集合**（双向包含）、四元组（`driverId`/`timing`/`evidence`/`ops`）可机核、
**新增驱动者主流程 diff = 0**、**不得**新增第 8 个散落 `maybeRecommend(...)` 调用点。

## 决策

### 1. 承载形态：**注册表 provider + 独立声明表**（不扩 v5 契约接口）

驱动者 = 「注册表里的 `NextProvider` 条目」**＋** `next-registry/drivers.ts` 里的一行**驱动者声明**：

```ts
/** 一个驱动者的四元组（唯一声明源；门禁从此处抽取，不靠注释与人工对账）。 */
export interface DriverDecl {
  readonly driverId: string;                 // = provider id（唯一）
  readonly timings: readonly DriverTiming[]; // 触发的时机源（⊆ DRIVER_TIMINGS）
  readonly moments: readonly ProactiveMoment[]; // 归属的「已表达意图」时刻（⊆ PROACTIVE_MOMENTS）
  readonly driverClass: 'deterministic' | 'ai-driven';
  readonly priority: 0 | 1 | 2 | 3;          // 必填（FR-SELF-018）
}
export const DRIVERS: Readonly<Record<string, DriverDecl>> = Object.freeze({ /* 8 行（= 既有 provider 集合）*/ });
```

**为什么是独立表而不是给 `NextProvider` 加字段**：
1. v5-1 的 `NextProvider` 接口是**冻结契约**（`ops.ts` 逐字注释：「the v5-1 interface is NOT extended, per the leaf independence rule」）——扩接口会同时波及双侧同源模块（`shared/op-table.ts` 的 type-only 镜像）与 4 个门禁；
2. spec 自己把「驱动者集合 ≡ provider 集合」写成**需要机核的事实**（FR-SELF-010 双向包含 + R-SELF-901 三类注入反证）。若把字段挂在 provider 行上，该断言退化成**恒真**（同源对象不可能漂移）⇒ 机核空转，正是 R-SELF-907 的形态；
3. 独立表把「驱动权归属」的**四元组**集中在一个可扫描的源文本里，`driverClass` / 时机 / 时刻 / 优先级各恰一处。

**双向包含机核**（`test/driver-quadruple.test.ts`）：`new Set(Object.keys(DRIVERS))` ≡ `new Set(listProviders().map(p => p.id))`；
三类注入反证（声明多一行 / 注册表多一行 / `chips` 悬空 opId）**各必 FAIL**，还原 ⇒ PASS（两段证伪）。

### 2. 四元组的机器形态（FR-SELF-011）

| 元 | 来源 | 判据 |
|---|---|---|
| `driverId` | `DRIVERS` 键 | 与 provider id 集合**双向包含**；重复 ⇒ 注册 loud（EC-SELF-001） |
| `timing` | `DRIVERS[id].timings` | ⊆ `DRIVER_TIMINGS`（**恰 5**，见 ADR-V55-002）；未知值 ⇒ loud（EC-SELF-002） |
| `evidence` | 该 provider 的 `when(ctx)` **实际读取**的字段 | ⊆ `CTX_FIELD_SERVICE` 登记面（**单一映射表**：`ctx 字段 → NEXT_SERVICES 6 项之一`）；未登记字段 ⇒ loud（EC-SELF-003 / R-V55-105） |
| `ops` | `DRIVERS[id]` 对应的 provider `chips` | ⊆ 9 opId（`OP_IDS`）；悬空 ⇒ 复用 v5 义务表机核（`dangling-chip`） |

`CTX_FIELD_SERVICE` 只承载**加法式**字段：本 Feature 唯一新增 = `session.proactive`（`{enabled, allowed}`），
来源 = 持久偏好 + 护栏状态，**属既有 `session` 服务面**；既有 7 键一个不改名、不删除。

### 3. 驱动者的 **producer 两形态**（「产出 next」vs「按下 auto 档 op」）

| 形态 | 谁做 | 落点 | 约束 |
|---|---|---|---|
| **产出候选**（`op.turn` / `op.llm-config` 等 next 或 op-direct chip） | 注册表 `when(ctx)`（不变） | `maybeRecommend` → `nextstep` 卡 | 候选**恒**由注册表产出；AI **不得**自造 opId（FR-SELF-065 / LNG-V55-3-003） |
| **自动按下**（`auto` 档 op） | 按下策略（`ai-drive.ts#pressCandidate`，v55-3） | `pressCandidate(opId, value, {by})` → `dispatchChipAction` → `runOp` → `PANEL.turn` → `requestTurn` | 仅 `driverClass === 'ai-driven'` **且** `tierOf(opId) === 'auto'` **且** 护栏/仲裁放行；**`confirm`/`gesture` 档只产出可见 next，永不自动按下** |

⇒ 「AI 启动回合」的**唯一**通路是**既有** `op.turn` 槽；`requestTurn(` 计数**保持恰 2**（X-SELF-1 **未发生取代**）。

### 4. 主流程 diff = 0 的**判据集**（I3，机制侧）

| # | 判据 | 现状 | 本 Feature |
|:-:|---|---|---|
| 1 | `requestTurn(` 调用点 | 恰 2（`:3232` / `:3256`） | **恰 2，判据一字不改**（X-SELF-1 读法①） |
| 2 | `maybeRecommend(` **定义** | 恰 1（`sidepanel.ts:1807`） | **恰 1** |
| 3 | `maybeRecommend(` **调用点** | 恰 7（`1909/2241/2383/2453/3281/3380/3399`） | **恰 7，不增**（新增时机经**既有**求值入口；`'answered'` 由既有闭合内的 `nextAfterSettle` 触达） |
| 4 | `nextAfterSettle(` **定义** | —（旧名 `reachableNext` 闭合） | **恰 1**（旧 `reachableNext` 闭合内部的那次 `maybeRecommend(` **就是**第 3 项的 7 个调用点之一，见 §5） |
| 5 | 集 B per-op 分支 | 0（`next-dispatch-diff0` 14） | **0**（`handleCardAction` 不动） |
| 6 | `op.execute(` 调用点 | 恰 1（`pipeline.ts#runOp`） | **恰 1** |

### 5. `'answered'` 时机的**触发通路**（避免第 8 个调用点的关键设计）

`reachableNext`（`bindPanelOps` 的一个闭合，内部含 `maybeRecommend('idle', {force:true})`）**升级**为
**单一结算→推荐入口**：

```ts
/** 唯一的「结算之后要一个 next」入口（定义恰 1；内部那次 maybeRecommend( 就是既有 7 处之一）。 */
function nextAfterSettle(src: SettleSource): string | null {
  return maybeRecommend(timingOfSettle(src), { force: true });   // ← 既有调用点 3281（改名不改计数）
}
// 既有 seam：reachableNext: (op, state) => { nextAfterSettle({ kind: state, opId: op.opId }); }
// 新触发点（**不是**新调用点）：submitAskFor / submitDescribe 结算后 → nextAfterSettle({ kind: 'answered', terminal })
```

`timingOfSettle(src)`（`drivers.ts` 单源）把「结算种类 + 终态」映射到时机值（`answered` / `idle`），
⇒ **新的时机触发点全部经由既有单一求值入口**（FR-SELF-033 允许），**不新增调用点**（FR-SELF-015 满足）。

## 后果

**正面**
- 「新增一种『用户已表达意图之后该做什么』= 注册一次声明 + 一个 `when(ctx)` 谓词 + 自带测试」成为**可机核**事实；主流程 diff = 0 有 6 条静态判据。
- 驱动权归属（四元组）有机器证据（FR-SELF-011），下游维护者不必读实现。
- 半驱动者堆积（R-SELF-003）在结构上被堵：声明表是唯一登记处，注册表外无驱动者。

**负面 / 代价**
- 声明表与注册表**两个源**存在漂移可能 —— 由**双向包含 + 三类注入反证**承担（这是**故意**保留的可见失败面，不是缺陷）。
- 每个新驱动者要写两处（provider 行 + 声明行）；工作量换可机核性。
- `NextCtx` 加法式扩字段引入一条新纪律（必须登记 `CTX_FIELD_SERVICE`），见 ADR-V55-002 §4。

**被否决的替代**
- **给 `NextProvider` 加 `driverClass`/`timing` 字段**：使 FR-SELF-010 的双向包含断言恒真（机核空转）、波及双侧同源模块与 4 门禁、破 v5-1 接口冻结纪律。
- **驱动者专用旁路（`proactive/` 层）**：即 N-SELF-022 明文禁止的「注册表外的驱动者」（总方案 B）。
