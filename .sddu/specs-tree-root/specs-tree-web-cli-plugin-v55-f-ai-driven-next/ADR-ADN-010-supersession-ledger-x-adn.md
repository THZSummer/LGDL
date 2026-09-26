# ADR-ADN-010: X-ADN-1~11 取代台账与保护段决策（逐条终态）

## 状态
ACCEPTED（承父 spec §5.10 SUPERSEDE FR-ADN-090~101 · §12 X-ADN 映射表 · §11 DC-ADN-014 · §9.3 AC-ADN-020/021 · N-ADN-005/006/015/030）

## 背景

X-ADN-1 = **产出权转移**（next 候选从「确定性内核独占产出」→「AI 驱动产出 + 注册表退居兜底与安全闸」）—— 本 Feature 的**唯一授权立法例外**，必须走 supersession 台账 old→new（**不是**静默改写）。其余 X 项凡**未发生取代**者，**必须如实登记 `no-supersession` + 理由**（不得留空 / 不得伪造「已取代」；N-ADN-030）。

**保护段（活跃 pin）**：journey `[43484,59347)` / len 15863 / 249 行 / sha `7b309258aab783e7…`；binding `[107780,115930)` / len 8150 / sha `be9ad0e9…`。

**老台账条目（v3 / v4 / v4.5 / v5 / v5.5 / F-34 / F-35）一律保留不动**。

## 决策

### ① X-ADN-1~11 逐条处置（与实现**同轮**完成）

| X | 现状形态 | plan 处置 | 落地 | **终态** |
|---|---|---|---|---|
| **X-ADN-1** | next 推荐 = 确定性内核独占产出（`recommendNextStep` 单源 / 真值 7 / 规则表 4 / 候选全来自注册表） | **产出权转移**：AI 驱动产出候选 + 注册表退居兜底与安全闸；台账 old→new（理由 / 日期 / 落点 / 作者裁决引用） | 叶1 + 叶2 | **已发生** |
| **X-ADN-2** | `recommendation-sources` ④「零新增网络 / LLM 面」 | **保持**：候选经注入槽（`session.aiNext`）⇒ `recommend.ts` 仍 pure、`fetch(`/`chrome.`/时钟仍零命中 | — | **未发生取代**（`no-supersession`：注入式落点已定，无需在 `recommend.ts` 内触达 AI） |
| **X-ADN-3** | `MAX_NEXTSTEP_CARDS_PER_ROUND = 1`（单卡） | **保持**：AI 多候选在单卡内以 ≤3 chip 呈现 | — | **未发生取代**（`no-supersession`） |
| **X-ADN-4** | `NEXTSTEP_PRIORITY` 恰 4 | **保持**：AI 骑既有 `ref-action` 规则位（`prepend` 同规则内优先），**不新增第 5 规则位** | — | **未发生取代**（`no-supersession`；「若需第 5 位」的取代路径**未触发**） |
| **X-ADN-5** | 时机源恰 5（`DRIVER_TIMINGS`） | **保持**：复用既有 `'idle'`，**不新增 `turn-done`** | — | **未发生取代**（`no-supersession`） |
| **X-ADN-6** | `maybeRecommend` 调用点 8 / `nextAfterSettle` 1 定义·10 调用点 / `requestTurn(` 恰 1 | **未发生变更**：AI 候选复用**既有** `done → maybeRecommend('idle')` 挂点，**零新增挂点 / 零新增调用点** | — | **未发生取代**（`no-supersession`；原「预登记」的触发条件**未满足** ⇒ 计数逐字不动） |
| **X-ADN-7** | `DRIVER_DECLS_SRC` ↔ `builtinProviders()` 双向包含 **11↔11** | **重锚 12↔12**：新增 `ai-next` provider 行 + `ai-next` 声明行（`evidence=session.aiNext`，与 `when` 同源；旧 11 行逐字保留） | 叶1 | **已发生** |
| **X-ADN-8** | R6 完成后同动作去重 = `refId#意图摘要`（`refActionDigest` 家系） | **扩展覆盖 AI 候选**：同 digest 家系/摘要函数**逐字复用**，仅扩大适用对象；判据等价重锚（非放宽） | 叶2 | **已发生** |
| **X-ADN-9** | `RECOMMEND_MODULE_WHITELIST` 恰 5 模块 | **保持**：AI 候选**类型**声明落在既在白名单的 `next-registry/definition.ts`；校验器在 SW 侧、不入 `recommend.ts` 导入面 ⇒ **白名单恒 5** | — | **未发生取代**（`no-supersession`；「若注入槽落新模块」条件**未成立**） |
| **X-ADN-10** | floor = 「仅含 `free-input` 终端」最小卡 | **保持（等价重锚）**：AI 候选**不进 floor**；floor 仍仅含终端；终端恒常驻；`safety` 仍不走 floor。判据**重跑** + 双向反证（`safety` 走 floor / 终端缺失 ⇒ 必红） | 叶2 | **未发生取代（等价重锚）**——语义逐字不变，仅判据重跑 |
| **X-ADN-11** | 关断偏好 `web-cli:proactive` 只涵盖「AI 主动回合」 | **扩展涵盖 AI next 候选的显示 / 自动按下**（一处偏好两相） | 叶2 | **已发生** |

**终态计数**：**已发生 4**（X-1 / X-7 / X-8 / X-11）· **未发生取代 6**（X-2 / X-3 / X-4 / X-5 / X-6 / X-9）· **等价重锚·非取代 1**（X-10）。
> **与父 spec §12 的暂时标注对照（如实登记）**：§12 的临时状态为「已发生 4 / 未发生 5 / 预登记 2」（X-6 / X-10 标「预登记」）。plan 阶段把两处「预登记」**落定为终态**：X-6 的触发条件（新增挂点）**未满足** ⇒ 归入**未发生取代**；X-10 语义**保持** ⇒ 归入**等价重锚（非取代）**。**不伪造「已取代」**。

### ② 台账落点（叶1 承接骨架，叶2 增量 + 终态）

- 新增台账段（`packages/web-cli-plugin/docs/v4-supersession-ledger.json` 的**新叶段**，承 `xIianLedgerFull` / `xSgoLedger` 命名先例，如 `xAdnLedger` / `xAdnLedgerLeaf2`）：
  - 每 X 项一行：`id` / `status`（`superseded` | `no-supersession` | `reanchored-keep`）/ `old`（逐字）/ `new` / `reason` / `date` / `landing`（叶1/叶2）/ `counterCheck`（可定位判据）；
  - **老条目（v3/v4/v4.5/v5/v5.5/F-34/F-35）逐字保留**（`test/supersession-ledger.test.ts` 既有链判据继续承重，**只增不减**）。
- 叶1（`adn-1`）登记 X-1（产出权转移 old→new）+ X-7（12↔12）+ X-2/3/4/5/6/9 的 `no-supersession` 骨架；
- 叶2（`adn-2`）登记 X-8/X-11（已发生）+ X-10（等价重锚）+ 全 11 条**终态对账**。

### ③ 保护段逐段决策（**keep**）

| 段 | 文件 | 区间 / sha | 决策 | 证明 |
|---|---|---|---|---|
| 1 | `test/ui/journey.mjs` | `[43484,59347)` / `7b309258aab783e7…` / 249 行 | **keep** | 本 Feature **零改动** `journey.mjs`（S0''' 面落在 `s0-self-driven.mjs`）⇒ 段内字节与段前字节**均不变** ⇒ `startAnchor` / `endByte` / sha **双绿**，**无需**等长补偿、**无需**八步取代 |
| 2 | `test/ui/binding.mjs` | `[107780,115930)` / `be9ad0e9…` / 8150 行 | **keep** | 同上，**零改动** `binding.mjs` ⇒ 字节中立双绿 |

- 若 build 实测**必须**改动上述文件（例如既有断言因 AI 候选渲染面而失真）⇒ **不静默改写**：改走**八步显式取代**（old 记历史 + new pin + 理由 + 日期 + leafBase）+ 台账留痕；本 plan **不预期**该分支。

### ④ 保护段与门禁的关系

- `supersession-ledger.test.ts`（保护段判据）**保留**；新增 X-ADN 台账段落一致性判据（逐条登记 + `counterCheck` 可定位 + `no-supersession` 理由非空）⇒ 计数只增（父 §9.5 记 49，收口按实测同源前移）。

## 后果

- 「显式取代 ≠ 放宽」：唯一取代（X-1）走台账 old→new；其余 6 项**如实登记未发生**；1 项等价重锚；老条目与保护段零触碰；
- **代价**：台账新增段落 + 若干一致性判据（node，只增）；**零产品字节**；
- **遗留**：X-1 的「产出权转移」是**语义级**取代，其判据强度靠「AI 候选经 5 道校验 + 确定性兜底仍在 + 终端恒常驻 + 全部既有计数不动」共同兑现（见 ADR-ADN-002/004/005/009）。
