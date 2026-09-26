# ADR-ADN-002: 5 道校验链与 SW 侧落点（PD-ADN-004 裁决 · 单源复用）

## 状态
ACCEPTED（承父 spec §5.3 VERIFY FR-ADN-020~029 · §11 DC-ADN-004/006/012 · §12 X-ADN-2 · PD-ADN-004）

## 背景

`pressCandidate` 的 opId **恒由注册表提供**（`ai-drive.ts:8` 铁律①）⇒ 今天**没有**「AI 候选 → 校验」入口（Q-ADN-003/004/005）。可用的既有单源事实：

- **在册 op**：`shared/op-table.ts#OP_IDS` / `OP_DESCRIPTORS`（**9** 枚）；
- **三档**：`tierOf(d)`（派生式单源）/ `tierOfId`（未知 ⇒ `undefined`）；
- **ref 事实**：SW 的**本回合引用快照** `ChatRefFact[]`（面板回合发起时下发；`refId` / `refNum` / `refState`；`background/ref-turn.ts`）；
- **param schema**：面板 `ops.ts#IMPL` 的 `params: AskSpec`（`definition.ts:101-104,152`）；
- **双面镜像**：SW 侧 `SW_OPS`（`background/op-executors.ts`，`filter(layer==='sw')`）+ `sw-op-mirror` 门禁。

## 决策

### ① 校验链（顺序即语义优先级；`background/ai-next.ts` 纯函数）

| # | 判据 | 事实源（**零新真值源**） | 失败码 |
|:-:|---|---|---|
| ① | `opId` 在册（∈ `OP_IDS` 9 枚） | `shared/op-table.ts#OP_IDS` / `opDescriptor` | `unknown-op` |
| ② | 三档清分：`tierOf(d)` ∈ {`auto`,`confirm`} 接受、`gesture` 拒 | `shared/op-table.ts#tierOf`（**唯一**档位单源） | `tier` |
| ③ | `ref` 存在且有效（候选带 `ref` 时） | 本回合快照 `ChatRefFact[]`（`refState==='valid'`） | `ref` |
| ④ | `params` 与该 op 的 `AskSpec` 相容 | 新增 **descriptor 加法字段**（见 ③ 节） | `param` |
| ⑤ | 越界 / 非法 ⇒ **丢弃 + 可读留痕**（零明文、不死端） | `blocked=` 行（本模块）+ 面板 notice | — |
| — | （附加）label 触零明文 caliber | 既有 `assertStreamPlaintext` caliber | `label` |

**顺序不可交换**：① 未过则不进入 ②；② `gesture` 拒则不进入 ③④（避免对未知 op 做 ref/param 判）——反证：注入「未知 op + 越界 ref」⇒ **只**报 `unknown-op`，不报 `ref`。

**拒绝码闭集**（`AiNextBlockedCode`）= `'unknown-op' | 'tier' | 'ref' | 'param' | 'label'`。
- `unknown-op` / `tier` 与 `PressBlocked`（`ai-drive.ts`）**同字面** ⇒ `ai-next.ts` 以 `import type { PressBlocked }` 派生（**类型单源**，零第二词表运行期声明）。
- `label` 是**新增第 5 类**：父 FR-ADN-026 列举的**四类非法**（幻觉 op / 越界 ref / gesture op / param 越界）**不减少**；本类是 EC-ADN-014（label 含凭据形值 / 正文）的机核落点，属**纯加法**（fail-closed，非放宽）。
- `parse` 级失败（无块 / 非数组 / 项非对象）**不写 blocked**（「未产出」支线 C，不是「被拦」支线 B）。

### ② 执行位置 = SW（B 列优先）；面板只收已校验

- 校验与解析同在 `background/ai-next.ts`；SW 已持有本回合 refs 快照与 `shared/op-table` 镜像（F-8）。
- **面板不设第二校验器**（N-ADN-022 / NFR-ADN-013）：面板把 `accepted` 当数据消费，唯一净化仍走 `label()`。
- 单源镜像判据 `sw-op-mirror` **保留**（AI 校验链读同一 `shared/op-table.ts`）。

### ③ `params` 校验 = 与 `AskSpec` **存在性 + 类型**相容（PD-ADN-004 同族）

**落地形态**：把「该 op 是否接受参数 / 参数形态」**提升为 `OpDescriptor` 的加法字段**（承 `hasConsent` 提升先例，不新建第二张表）：

```ts
readonly ask?: 'choice' | 'form';   // 缺席 ⇒ 该 op 不接受参数（params: null）
```

一致性由门禁机核：`ask === undefined ⟺ ops.ts#IMPL` 该行 `params === null`（新增一条 `ai-next-candidate` 断言；**加严**，非放宽）。

**校验真值表**：

| `params` | 该 op `ask` | 结论 |
|---|---|---|
| 缺席 | 任意 | ✅ 通过 |
| 存在 | `ask === undefined`（`op.turn`/`op.pick`/`op.describe`/`op.rebind`/`op.help`/`op.authorize`） | ❌ `blocked=param` |
| 存在 ∧ 非空字符串（≤ `AI_NEXT_PARAM_MAX = 128`） | `choice` / `form`（`op.llm-config`/`op.perm.request`/`op.revoke`） | ✅ 通过（**仅元数据**；取值仍由用户在既有 ask / consent 卡作答 —— AI **不代答**，N-ADN-017） |
| 其他类型（数组 / 对象 / 数字 / 空串 / 超长） | 任意 | ❌ `blocked=param` |

> **诚实登记（已知限制）**：本轮 chip 派发遵循既有「**chips 即指令**」（`cards/nextstep.ts`：`act==='next'` 时把 **chip 文案**作值；其余 op 的取值由用户在既有卡收集）⇒ `params` **不参与派发**，仅作候选元数据。把「参数化 chip 值」落成派发面属**后续轮扩展点**（登记 `PD-ADN-005` 同族）；本 ADR 不静默扩卡协议。

### ④ `ref` 字段语义（PD-ADN-004 裁决）

- `ref` = **字符串**；取值 = 本回合快照 `ChatRefFact.refId`（如 `ref_3`）**或**规范形 `ref_<refNum>`；**不接受**裸数字 / `#3` / 选择器字符串（避免第二编码）。
- 命中快照 ∧ `refState === 'valid'` ⇒ 通过；缺席 ⇒ 通过（`ref` 可选，FR-ADN-012）；有值但不命中 / 已失效 ⇒ `blocked=ref`。
- **零新真值源**：只读回合载荷（`background/ref-turn.ts` / `runChat(refs)`），不 import 面板 `l1/ref-store`（RCT-⑦ 既有判据继续承重）。

## 后果

- 安全核心一次就位（校验先于任何候选接受；R-ADN-901/902 有反证）；
- **代价**：`shared/op-table.ts` 新增 `ask` 字段 ⇒ 该模块**两侧 bundle**各 +数十字节（A/B 列均记；见 ADR-ADN-008）；
- **已知限制**：`params` 本轮不派发（上文诚实登记）；
- 判据可机核：纯函数（无 DOM / 时钟 / IO）+ 五类注入反证 + 三段控制（见 ADR-ADN-007）。
