# ADR-NDA-004: 围栏块通道替换与 `ai-next-candidate` 门禁改写（等价或更强）

## 状态
PROPOSED

## 背景

F-36 的产出通道 = **文本尾随围栏块**：提示句 `NEXT_CONTRACT_GUIDANCE`（`ref-context.ts:52-59`）→ SW 取「最后一条 assistant 文本的最后一个 `next` 围栏块」（`ai-next.ts:59-70` `FENCE` / `lastNextFenceBody`）→ `JSON.parse` + 顶层数组（`:76-87` `parseAiNextItems`）→ 5 道链（`:105-158`）。

作者口径逐字「**没有调用 `next` 工具**」⇒ 载体应为工具。spec 裁决 = **替换（单一产出通道）**（FR-NDA-080~083 / DC-NDA-006 / O-NDA-006）。

**同时必须守住两件事**：
1. **校验链整体保留**（K-1：`admitCandidate` + `validateAiNext`；`ai-next.ts:105-158`）—— 换机制只换**上游输入**；
2. **门禁不得静默降强度**：新 node 门禁 `test/ai-next-candidate.test.ts` 的 **AI-N-1 钉死围栏块解析**（`:8,78`；`AI-N-1` 逐字「尾随 `next` 围栏块 + 严格 JSON 数组」），且 `test/ui/fixtures/s0-chain.mjs:770` 用围栏块 info 串造样本（R-NDA-005 / R-NDA-902 / R-NDA-908）。

## 决策

### ① 函数级替换（**删除，不留影子产出**）

| 目标 | 处置 | 依据 |
|---|---|---|
| `NEXT_CONTRACT_GUIDANCE`（`ref-context.ts:52-59`）与其注入（`:100`） | **删除**（`refContextSegment` 里 `REF_SCOPE_GUIDANCE` 逐字保留） | FR-NDA-041 / 081；`COR-NDA-12`：`ref-context-in-turn.test.ts:314` 只断言 `REF_SCOPE_GUIDANCE` ⇒ **零门禁代价** |
| `AI_NEXT_FENCE_INFO` / `FENCE` / `lastNextFenceBody` / `parseAiNextItems`（`ai-next.ts:36,59-87`） | **删除**（围栏块不再有任何读者） | FR-NDA-080 / 081；`EC-NDA-020`「影子产出残留 ⇒ 必红」；删除即**结构性**消除 R-NDA-902 |
| `admitCandidate`（`:105-143`）/ `AI_NEXT_LABEL_MAX` / `AI_NEXT_PARAM_MAX` | **逐字保留** | K-1 / K-8 / FR-NDA-030~036 / 115 |
| `validateAiNext` | **保留函数名，改输入面**：`validateAiNext(candidates: readonly unknown[], facts: AiNextFacts): AiNextPayload`（原来是 `text: string \| undefined`） | FR-NDA-081「保留校验链」；调用点唯一（`service-worker.ts:1036`）⇒ 零第二校验器 |
| 新解析入口 | 由 ADR-NDA-002 §③ 的 `rawArguments` 严格解析承担（可放 `service-worker.ts` 或 `ai-next.ts` 内的 `parseNextToolArguments(raw: string)`，**单源一处**） | COR-NDA-8 / R-NDA-912 |

> **不做过渡兼容**：`PD-NDA-010` 裁决 = 「替换、单一通道」，无开关、无双读（`NG-NDA-013`）。

### ② `ai-next-candidate` 门禁改写（**等价或更强；断言只增**）

改写原则：**把「钉死围栏块解析」换成「钉死工具捕获 + 5 道链 + 判定分层 + nudge 有界 + 异常闭集 + 分相」**，AI-N-2~11 的**语义**逐条保留（输入面从「文本」换成「已解析的 `candidates` 数组」）；`assertionsRemoved = 0`。

| 判据 | 改写形态 |
|---|---|
| **AI-N-1**（原：围栏块 + 严格 JSON） | **改为**：`parseNextToolArguments(raw)` —— 合法 JSON 对象 + `candidates` 数组 + 非对象项丢弃；缺 `candidates` / 非法 JSON / 顶层数组 ⇒ **零候选且不抛**（`EC-NDA-015`）；并新增：**取最后一次调用**（覆盖式）与 **≤3 截断** |
| AI-N-2 链顺序即优先级 | 逐字保留（用注入的 `candidates` 直接驱动 `admitCandidate`） |
| AI-N-3 `ref` 有效 | 逐字保留 |
| AI-N-4 `params` 相容 | 逐字保留（`AiNextCandidate.params: string`；schema 同构 `{type:'string'}`） |
| AI-N-5 判定分层（`confirm` 可接受不可按下 / `gesture` 连接受都拒） | 逐字保留（`pressDecision` diff=0） |
| AI-N-6 五类注入反证 | 逐字保留（幻觉 op / `gesture` / 越界 ref / 越界 param / label 含凭据）+ 新增「AI 代答 `confirm` consent ⇒ 必红」 |
| AI-N-7 真源切片 + 三段控制 | 逐字保留（真源仍 `shared/op-table.ts` + 回合 refs 快照） |
| AI-N-8 零新增载体 | 逐字保留（`KIND_SET` 40 / 12 kind / 零宿主 / `ACT_TO_OP` 6） |
| AI-N-9 驱动者声明 | 12↔12 保持（叶1）+ 新增 `ai-next.rule === 'ai-led'` |
| AI-N-10 零新 LLM / 零第二阈值 | 逐字保留（`ai-next.ts` 仍纯；`recommend.ts` 零 `fetch(`/`chrome.`/时钟） |
| AI-N-11 `ask` descriptor ↔ `ops.ts#IMPL` | 逐字保留 |
| **新增 AI-N-12** | **schema 单源**：`NEXT_TOOL_SCHEMA.parameters` 与 `AiNextCandidate` 同构（字段名 / 必填集）；`maxItems === MAX_CHIPS_PER_CARD`；`enum === OP_IDS.filter(tierOf!=='gesture')`（重算式逐项）；`NEXT_TOOL_NAME === 'next'` |
| **新增 AI-N-13** | **工具调用不上流**：`onCommandLine` / `onToolOutput` 对 `next` 零发射（源切片 + 反证） |
| **新增 AI-N-14** | **`tc.args` 零使用**：源文本扫描 ⇒ 出现 `tc.args` 读取候选 ⇒ 必红 |
| **新增 AI-N-15**（叶2 增量） | `shouldNudge` 有界（`nudgeUsed=true ⇒ false`）+ `abnormalVerdict` 三情真值表 + 分相判据非恒真 |

**前后对账**：改写轮必须给出「断言语义逐条对账表」（旧 11 条 + 新 4~5 条，**无减少项**）；**`assertionsRemoved = 0`**；改写后仍纳入 `gate-integrity` 受审集合（下界**只增**，`CHROMIUM_GATES === 9` 不动）。

### ③ Chromium 面：**只加断言不加文件**

- `test/ui/s0-self-driven.mjs`（既有 Chromium 门禁）内加 S0'''' 支线断言；
- 样本来源 `test/ui/fixtures/s0-chain.mjs:770`（现按围栏块 info 串造样本）**等价重锚**为「工具调用捕获」样本（同一文件内改样本生成器，**不新增文件**、不动 `CHROMIUM_GATES`);
- `CHROMIUM_GATES === 9` 逐字不动（`gate-integrity.test.ts`）。

### ④ 取代台账

`xNdaLedger` 两行（叶1）：`X-NDA-1`（产出机制：围栏块 + 正则 → 工具 + 捕获，**已发生**）、`X-NDA-7`（门禁 AI-N-1 改写，**已发生**）；并登记 `X-NDA-12`（零新 LLM 往返契约 **未发生取代**：工具调用在同一回合内，`runner.ts:142-186`）。

## 备选方案

| 方案 | 处置 |
|---|---|
| 保留围栏块解析函数但不调用（「死代码」） | ❌ 死代码可被重新接线（R-NDA-902 的**载体**仍在）；`EC-NDA-020` 精神要求结构性消除 |
| 保留一个过渡开关期（`PD-NDA-010`） | ❌ 双通道期会让「谁是权威」不可判；且过渡期门禁无法收口 |
| 保留围栏块作为「模型不遵从 tools 时的兜底」 | ❌ 这正是「软约定兜底软约定」的循环；真正的兜底是确定性注册表（K-5）+ 系统兜底推荐（ADR-NDA-007） |
| 门禁改写时顺带删除 AI-N-1 并只留行为面测试 | ❌ `assertionsRemoved ≠ 0`（R-NDA-908）；且会丢掉「解析形状」这一层判据 |

## 后果

**正向**：
- 单一产出通道 ⇒ 判据可判（FR-NDA-080 反证「围栏块仍能产出 ⇒ 必红」变成**结构性不可能**）；
- 校验链 / 判定分层 / 零明文 / 载荷面**逐字保留**（换机制零误伤，R-NDA-001 的主要缓解）；
- `ref-context.ts` 变短 ⇒ B 列**负增量**（删提示句）。

**代价**：
- 门禁改写是本 Feature **最重**的治理成本（`PR-NDA-*` 语义对账 + 反证实跑 `sha256` 逐字节还原）；
- Chromium 样本生成器重锚需一次实测复跑（承接 Chromium 面断言增量）；
- 若未来第三方（其他 harness / 文档）引用围栏块契约 ⇒ 需台账说明（本仓零外部消费者，已核）。

## 落地判据（供 tasks/build）

1. `NEXT_CONTRACT_GUIDANCE` / `AI_NEXT_FENCE_INFO` / `FENCE` / `lastNextFenceBody` / `parseAiNextItems` 在 `src/**` **零命中**；
2. `admitCandidate` 函数体**逐字未变**（切片哈希可判）；`validateAiNext` 仍被 `service-worker.ts` 唯一调用；
3. 改写后的 `ai-next-candidate` 门禁：断言条数 **≥** 前值（对账表 + `assertionsRemoved = 0`）；
4. 反证「围栏块文本仍能产出候选 ⇒ 必红」（把旧解析函数重新接线 ⇒ 门禁必红）；
5. Chromium：`CHROMIUM_GATES === 9`；`s0-self-driven.mjs` 断言增量如实登记；样本生成器改后门禁绿。
