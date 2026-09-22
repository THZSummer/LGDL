# ADR-V55-008: op 三档清分的**派生式单源**（`tierOf`）+ 新 op 归档机核

## 状态
ACCEPTED

## 背景

「AI 可以主动发起哪些 op」**当前零清单**（Q-SELF-010）；而主动性一旦放开，最容易的越界就是「让 AI 顺手把授权也办了」
—— 直接撞 N-SELF-005 / N-SELF-021（特权 op 恰 2 必须用户手势；「SW 永不 `.request(`」）。

spec §5.7（FR-SELF-080~086）/ O-SELF-004 / DC-SELF-004：
`auto`（AI 可自主）**恰 5**：`op.pick` / `op.describe` / `op.help` / `op.rebind` / `op.turn`；
`confirm`（AI 可发起，需用户点确认）**恰 2**：`op.llm-config` / `op.revoke`；
`gesture`（必须用户手势）**恰 2**：`op.authorize` / `op.perm.request`（**恒在此档**）；合计 **9 = 5 + 2 + 2**。
且必须：清分表**恰一处**声明 + 机核、与既有 `ops.ts#IMPL` 的 `riskLevel`/`consent`/`layer` **一致**（不一致即红）、**新 op 必须归档**。

## 决策

### 1. **派生式**单源：`tier` 由既有字段计算，不手写第二份清单

```ts
// src/shared/op-table.ts（既有文件 = 双侧同源唯一来源；描述符行**零改写**语义）
export const OP_TIERS = Object.freeze(['auto', 'confirm', 'gesture'] as const);
export type OpTier = (typeof OP_TIERS)[number];

/**
 * 三档清分的**唯一判定**：由既有的 `layer` / `consent` 派生（零第二份手写清单）。
 *   · `layer === 'sw'`        ⇒ `gesture`（浏览器侧手势不可让渡：op.authorize / op.perm.request）
 *   · 否则有 consent 卡        ⇒ `confirm`（写安全面 / 不可逆 ⇒ 用户必须点确认）
 *   · 否则                    ⇒ `auto`（不写授权 / 权限 / 凭据三表，无可逆后果）
 */
export function tierOf(d: Pick<OpDescriptor, 'layer' | 'consent'>): OpTier {
  if (d.layer === 'sw') return 'gesture';
  return d.consent ? 'confirm' : 'auto';
}
/** 物化表（供门禁从源文本抽取；**由 tierOf 生成，不是第二份数据**）。 */
export const OP_TIER_TABLE: Readonly<Record<string, OpTier>> = /* derive from OP_DESCRIPTORS + OP_CONSENT */;
```

**为什么派生而不是手写 9 行 `tier`**：
1. 手写清单与 `IMPL` 的 `layer`/`consent` 声明**可以脱钩**（R-SELF-906「清分纸面化」），派生式让「脱钩」在类型/求值层不可能；
2. FR-SELF-086 要求的「逐 op 对照 `riskLevel`/`consent`/`layer`」在派生式下变成**同一事实的两种读法**，门禁只需断言派生结果 == 期望三集（5/2/2）；
3. 新增 op 时 `tier` **自动产生** ⇒ 「新 op 未归档」的唯一可能形态是「op 不在 `OP_DESCRIPTORS` 里」，而这已被 `OPS_BY_ID` 的 `op-impl-missing` loud 抛出（`ops.ts:372`）。

**`consent` 的来源**：`NextOp.consent` 目前由 `ops.ts#IMPL` 的行给出（`op.authorize` / `op.llm-config` / `op.perm.request` / `op.revoke` 四行有 consent）。
为避免「第三份声明」，`consent` 的存在性**提升为描述符字段** `hasConsent: boolean`（由 `IMPL` 行与描述符的**一致性机核**保证：`test/op-three-tier.test.ts` 断言
`OP_DESCRIPTORS[i].hasConsent === Boolean(OPS_BY_ID[id].consent)`，不一致 ⇒ FAIL）。

### 2. 三档的**边界语义**（逐档机核）

| 档 | 成员（逐字） | 语义断言 | 反证 |
|---|---|---|---|
| `auto` | `op.pick` / `op.describe` / `op.help` / `op.rebind` / `op.turn` | **零三表写入**（授权 / 权限 / 凭据）：静态（无 `keyStore.save(` / 无授权写点 / 无 `permissions.request(`）+ 运行期（写点 sink 单源扫描） | 让 `auto` 档 op 写凭据 ⇒ FAIL（FR-SELF-083） |
| `confirm` | `op.llm-config` / `op.revoke` | AI **可发起**但 **consent 卡必须由用户作答**（作答方可判为「用户」）；AI 发起时**必须**产出**可见**的 confirm next（不得隐式执行） | AI 代答 consent ⇒ FAIL（FR-SELF-082 / NG-SELF-017） |
| `gesture` | `op.authorize` / `op.perm.request`（**恒**） | AI **不可发起**、不可代答、不可「先发起后补手势」；发起方 = 用户手势；「SW 永不 `.request(`」语义**等价保留** | AI 自动执行特权 op ⇒ FAIL（FR-SELF-081/085 / N-SELF-021） |

### 3. 与「自动按下」的关系（ADR-V55-009 §3 的上游约束）

```
pressCandidate(opId, value, { by: 'deterministic' | 'ai' })
  ├─ by === 'ai'         ⇒ tierOf(op) === 'auto' 才算放行；否则：拒绝 + 产出**可见** next（绝不自动按下）
  └─ by === 'deterministic'（主题① 的确定性流）⇒ 仅允许 op.turn（auto 档）；其余档一律走用户点击 + 用户 consent
```

⇒ **三档是「谁能按」的唯一权威**；`gesture` 档连「产出可见 next」都只走既有手势路径（`op.authorize` 的 chip 由用户点）。

### 4. **不加第 10 个 op**（本 ADR 的一个明确否决项）

spec FR-SELF-080 把成员集写成**逐字 5/2/2**（O-SELF-004 裁决）。若为了「一次性否决 / 关断」新增 `op.proactive`：
- 它会落在 `confirm` 档（写偏好 = 写状态）⇒ 集合变成 **5/3/2**，**直接违反** FR-SELF-080 的「成员恰 5/2/2」；
- 且新增 op 会连锁修改 `OP_DESCRIPTORS` / `IMPL` / `OBS` / 义务表 / `sw-op-mirror` / `op-wiring` / 面板 seam 与体积预算。

⇒ **否决**。否决 / 关断的载体改走**既有机制**（consent 的 `reject` + 设置面既有开关形态），见 ADR-V55-009 §4。

### 5. 新 op / 新特权**归档机核**（FR-SELF-084 / EC-SELF-018）

| 判据 | 反证（注入 ⇒ 必 FAIL） |
|---|---|
| 清分表 opId 集 **≡** `OPS_BY_ID` 键集（双向包含） | 在 `OP_DESCRIPTORS` 加一行而不更新一致性面 ⇒ FAIL |
| 任一 op 的 tier ∈ `OP_TIERS`（恰一档，无未归档 / 无多重归档） | 让 `tierOf` 返回第四值 / 返回空 ⇒ FAIL |
| 新特权（`layer:'sw'`）**恒** `gesture` | 把新 sw op 归 `auto` ⇒ FAIL |
| 计数字面：`{auto:5, confirm:2, gesture:2}` | 增删任一成员 ⇒ FAIL |

## 后果

**正面**
- R-SELF-906（清分纸面化）**结构性消除**：`tier` 不是数据而是 `layer`/`consent` 的函数，改一处不可能只改一半。
- 「AI 不得降档」有唯一权威判定点（`tierOf`），按下策略只是它的调用者。
- 零新增 op / 零新增服务面 / 零新增权限 ⇒ 体积与红线面都不动。

**负面 / 代价**
- `consent` 的存在性被提升为描述符字段（`hasConsent`）⇒ 描述符与 `IMPL` 之间多一条一致性断言（这是**加严**，不是放松）。
- 派生式让「人为把某 op 从 `confirm` 调到 `auto`」变得**需要改 `consent`/`layer`**（即改安全声明本身，会被 `IMPL` 一致性 + 特权恒 gesture 两条判据同时拦住）—— 这是期望行为，但实现者会感到「不如直接写表方便」。

**被否决的替代**
- **手写 9 行 `tier` 表**：与 `IMPL` 声明可脱钩（R-SELF-906 原样复现）；且 `tier` 与 `layer`/`consent` 的「一致」变成需要人工对账的第三份事实。
- **把 tier 挂到 `OP_DESCRIPTORS` 的字面量行上（手写值）**：同样引入可脱钩面；派生 + 物化同时提供「机器抽取面」与「不可漂移」两个性质。
