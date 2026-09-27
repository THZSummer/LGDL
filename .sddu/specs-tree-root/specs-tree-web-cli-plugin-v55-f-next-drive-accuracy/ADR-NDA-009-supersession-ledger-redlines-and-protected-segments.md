# ADR-NDA-009: 取代台账 `X-NDA-1~12`、零改基座硬红线与保护段逐段决策

## 状态
PROPOSED

## 背景

本 Feature 是**机制级修正**，与 F-36（v0.11.3，父 + 两叶 `validated/completed`）构成「**并列新主题 + 显式取代**」关系：F-36 产物**零改写**（N-NDA-005），差异走 `supersession` 台账 old→new（**不是**静默改写）。同时有三条互锁的硬约束：

1. **零改基座**：`packages/web-cli-base/**` 零 diff（`insight-no-escalation.test.ts:147` 机核；N-NDA-007 / NFR-NDA-005）—— 本 Feature 只**复用** function calling + `hooks.intercept`；
2. **保护段逐段决策**：journey `[43484,59347)` sha `7b309258…` + binding `[107780,115930)` sha `be9ad0e9…`，默认 `keep`（字节中立），取代须走八步 + 哈希 old→new 台账（N-NDA-015 / FR-NDA-133）；
3. **断言零删除零降级**（`assertionsRemoved = 0`，唯一例外 = 保护段显式取代 + 台账；N-NDA-012）。

替代台账的**落点已核**：`packages/web-cli-plugin/docs/v4-supersession-ledger.json` 当前已有 F-33/F-34/F-35/F-36 的段（`xSelfLedger` / `xSgoLedger` / `xIianLedgerFull` / `xAdnLedgerFull` 等，见 key 列表），老条目**一律保留不动**（`FR-NDA-132`）；本 Feature 追加 `xNdaLedger` / `xNdaGateReconciliation` / `xNdaLedgerFull`。

## 决策

### ① 台账结构（**追加，不改老键**）

```jsonc
// docs/v4-supersession-ledger.json（追加三个顶层键）
"xNdaLedger": {
  "leaf": "specs-tree-nda-1-next-tool-channel",
  "feature": "F-37 / v0.11.4",
  "date": "2026-09-27",
  "note": "叶1 对 X-NDA-1/2/5/6/7/8/9/12 的逐条终态骨架（叶2 收口 X-NDA-3/4/10/11 终态）",
  "entries": [ /* 每行：id / status / old（逐字）/ new / reason / date / landing / counterCheck */ ]
},
"xNdaGateReconciliation": { /* 逐门禁三态：保留 / 等价重锚 / 显式取代（+台账） */ },
"xNdaLedgerFull": { /* 两叶合并终态（叶2 收口） */ }
```

**逐条三态预登记**（`status ∈ { superseded, keep, no-supersession }`；**未发生者必须如实登记 `no-supersession` + 非空理由**，N-NDA-030 / FR-NDA-122）：

| X | F-36 现状（old 逐字锚） | 处置 | status | 叶 | counterCheck |
|---|---|---|---|:--:|---|
| **X-NDA-1** | 产出机制 = 文本尾随 `next` 围栏块 + SW 正则解析（`ref-context.ts:52-59`；`ai-next.ts:58-87`） | 取代为 `next` 工具 + `hooks.intercept` 捕获 + 合成 `ToolResult` | **superseded** | 叶1 | AI-N-1 改写 + 反证「围栏块仍能产出 ⇒ 必红」 |
| **X-NDA-2** | 触发只在有引用上下文（`ref-context.ts:97-100`；`ai-next` 骑 `ref-action`） | 取代为无条件（工具无条件下发 + 提示句删除 + `ai-led` 规则位） | **superseded** | 叶1 | 反证「无引用回合仍驱动」+ `providers.ts:171` `when` 不读 refs |
| **X-NDA-3** | 未配置 ⇒ 恒真「自由输入」终端（`providers.ts:217`） | 取代为分相（未配置不显示 / 已配置恒常驻） | **superseded** | 叶2 | FIN 两相判据 + 双向反证 |
| **X-NDA-4** | 无 LLM 异常兜底（`service-worker.ts:1027-1043`；`sidepanel.ts:4147-4152`） | **新增**（非删除）：`abnormalVerdict` 闭集 + nudge 一次 + `llm.abnormal` 兜底 | **superseded（新增项）** | 叶2 | 三情真值表 + 兜底 chip 可达 + 反证「无兜底 ⇒ 必红」 |
| **X-NDA-5** | `ai-next` provider 骑 `ref-action` 位 + `NEXTSTEP_PRIORITY` 恰 4 | 等价重锚：`rule:'ai-led'` + `NEXTSTEP_PRIORITY` 恰 5（第二位） | **superseded** | 叶1 | `recommendation-sources` ③ 逐项复算 + 注入「恰 4」⇒ 必红 |
| **X-NDA-6** | F-36 正确资产 9 项（K-1~K-9） | **保留**（逐条 `no-supersession`） | **keep**（9 行） | 叶1+叶2 | 各判据绿 + 反证「删任一项 ⇒ 必红」 |
| **X-NDA-7** | 门禁 `ai-next-candidate` 的 AI-N-1 钉死围栏块解析（`test/ai-next-candidate.test.ts:8,78`） | 改写（等价或更强）：钉「工具捕获 + 5 道链 + 分层 + nudge 有界 + 异常闭集 + 分相」 | **superseded** | 叶1 | 前后断言对账（无减少项）+ `assertionsRemoved = 0` |
| **X-NDA-8** | `parity` 工具目录（`deriveTools()` 对 main 基线；新增工具需 `pluginExtras`） | 等价重锚：`pluginExtras['next']`（reason + basis）+ 旧条目逐字保留 | **superseded** | 叶1 | `parity` 绿 + 反证「无条目 ⇒ 必红」 |
| **X-NDA-9** | 时机源恰 5（复用 `'idle'`） | **保持**（零新增触发词） | **no-supersession** | 叶1 | DT-2 / DT-3 绿 + 反证「新增第 6 词 ⇒ 必红」 |
| **X-NDA-10** | 首开保持确定性（`PD-ADN-001` deferred） | **保持**（不转正；登记 `PD-NDA-001`） | **no-supersession** | 叶2 | `r8-open-next-entry` R8-1~6 绿 + 零双卡判据 |
| **X-NDA-11** | `requestTurn(` 恰 1 / `maybeRecommend` 1 定义 8 调用点 / `nextAfterSettle` 1 定义 10 调用点 | **保持**（ADR-NDA-006 的回调内 nudge **零新增调用点**） | **no-supersession** | 叶2 | `op-wiring` OP-W-6/8 + `driver-quadruple` 全绿且计数未变 |
| **X-NDA-12** | 围栏块协议的「零新 LLM 往返」契约（同回合输出） | **保持**（工具调用仍在同一回合内） | **no-supersession** | 叶1 | `recommendation-sources` ④ 绿 + 反证「主链新增 `fetch(` ⇒ 必红」 |

**净结果**：已发生取代 **7**（X-NDA-1/2/3/4/5/7/8）+ 保留 **1**（X-NDA-6，含 9 条子项）+ 未发生取代 **4**（X-NDA-9/10/11/12）。**注**：spec §12 预登记「X-NDA-11 = 预登记」，本 ADR 据 ADR-NDA-006 **降级为 `no-supersession`**（净减一处重锚，**更优**，须在台账写明这一判定依据）。

### ② 零改基座硬红线（**机核 + 逐条守线**）

| 红线 | 锚 | 本 Feature 的守法 |
|---|---|---|
| `packages/web-cli-base/**` 零 diff | `insight-no-escalation.test.ts:147` | 只**读** `llm.ts`（类型 / `parseToolArguments` 契约）与 `runner.ts`（`hooks` 形状）；**不新增 import 到 base 的实现**（`import type` 只用于类型）；不复制 / 不分叉 base 模块 |
| 判定链零触碰 | `zeroDiffFiles` 恰 9 项（内容哈希 pin） | `src/security/policy.ts` / `auto-authorize.ts` 零改；`resolve` 判定不变 |
| `content.js` / `pick-layer.js` 字节冻结 | 177,076 B / 34,358 B | `src/content/**` 零改；构建后 `stat` + `sha256` 双锚 |
| `KIND_SET` 40 / 12 kind / 零宿主 | `messaging` / `stream-model` / `host-registry` 门禁 | 候选走**既有** `chat-result.aiNext` 加法字段；`abnormal` 仍是 `aiNext` 的**子字段**（type-only）⇒ 零新 kind / 零新 variant / 零新宿主 |
| 幂等 / 单源 | NFR-NDA-013 | 唯一产出通道（`next` 工具）+ 唯一校验器（5 道链）+ 唯一档位单源（`tierOf`）+ 唯一分相判据（`risk.llmBlocked`）+ 唯一异常判定（SW `abnormalVerdict`）+ 唯一修复 op（`op.llm-config`） |

### ③ 保护段逐段决策（**默认 `keep`，字节中立**）

| 段 | 文件 | 字节区间 | pin | 决策（plan 预裁决；build 实测复核） |
|---|---|---|---|---|
| journey | `test/ui/journey.mjs` | `[43484,59347)` | sha `7b309258…` | **`keep`**（字节中立）—— 本 Feature 不在 `journey.mjs` 内改任何被测行为；S0'''' 断言进 `s0-self-driven.mjs`（另一门禁）⇒ journey 保护段**不必然触碰** |
| binding | `test/ui/binding.mjs` | `[107780,115930)` | sha `be9ad0e9…` | **`keep`**（字节中立）—— 诊断面不受本 Feature 影响 |

- **判据**：保护段门禁绿（`protectedPinFailures` 双绿：段本体 sha + 起始字节偏移）+ `startByte` 显式断言；
- **若 build 实测必须触碰**（例如门禁需要新增断言落在段内）⇒ **八步显式取代**：`old` 可机核 → 等价改写 → `modifiedRanges` 逐行登记 → 新 pin → 台账 + `supersededFrom` 链 + 理由 / 日期；**禁止静默改写**；
- **禁止**：把断言删掉以避开哈希变更（`NG-NDA-019`）。

### ④ 门禁处置三态（`xNdaGateReconciliation`，**禁漏项**，承 spec §9.5 的 23 行 + 间接面）

| # | 门禁 | 三态 | old→new / 定位 |
|:-:|---|:--:|---|
| 1 | `test/ai-next-candidate.test.ts` | **显式取代（改写）** | AI-N-1 围栏块 → 工具捕获；+AI-N-12~15；对账表 |
| 2 | `test/parity.test.ts` + `test/parity/waivers.json` | **等价重锚** | `pluginExtras += 'next'`（位置订正 `COR-NDA-6`） |
| 3 | `test/recommendation-sources.test.ts` | **显式取代** | ③ `NEXTSTEP_PRIORITY` 恰 4 → 恰 5（逐项复算） |
| 4 | `test/driver-timings.test.ts` | **保留** | 恰 5 / 旧 4 逐字；零新增触发词 |
| 5 | `test/driver-quadruple.test.ts` | **等价重锚** | 12↔12 → **13↔13**（叶2；`llm.abnormal`） |
| 6 | `test/op-wiring.test.ts` | **保留** | `requestTurn(` 恰 1 / `maybeRecommend` 1/8 / `nextAfterSettle` 1/10 **零变**（X-NDA-11 = `no-supersession`） |
| 7 | `test/turn-arbitration.test.ts` | **保留** | 四值逐字；nudge 无独立回合 ⇒ 更强满足 |
| 8 | `test/op-three-tier.test.ts` | **保留** | `tierOf` 派生式 + 特权恒 `gesture` |
| 9 | `test/proactivity-guard.test.ts` | **保留** | 六常量单源；nudge 不绕护栏 |
| 10 | `test/sw-op-mirror.test.ts` | **保留** | 双面一致（捕获 / 校验读同一单源） |
| 11 | `test/gate-integrity.test.ts` | **等价重锚** | 受审下界**只增**；`CHROMIUM_GATES === 9` 逐字不动 |
| 12 | `test/r8-open-next-entry.test.ts` | **保留** | 首开确定性不回归 |
| 13 | `test/free-input-next.test.ts` | **显式取代** | 恒真 → `configured` 分相（FIN 判据改写；已配置相仍恒常驻） |
| 14 | `test/supersession-ledger.test.ts` | **保留 + 新增** | `xNdaLedger*` 判据 + 保护段决策 |
| 15 | `test/insight-no-escalation.test.ts` | **保留** | base 零 diff |
| 16 | `test/size-baseline.ts` / `size-ruling-vol3.test.ts` | **等价重锚 / 新增登记** | 逐叶五要素 + 三值；B 列不计账 |
| 17 | `test/next-dispatch-diff0.test.ts` | **保留** | 集 B 零 per-op 分支 |
| 18 | `test/driver-terminals.test.ts` / `blocked-terminals.test.ts` | **保留** | 恰 4 / 恰 5 / 恰 2 / 恰 5 均未变（`llm.abnormal` 不入这三个集合） |
| 19 | `test/next-registry.test.ts` | **等价重锚** | NR-10 声明行 12 → 13（叶2） |
| 20 | `test/ui/s0-self-driven.mjs`（+ `fixtures/s0-chain.mjs`） | **等价重锚 + 断言增量** | 只加断言不加文件；样本重锚为工具捕获 |
| 21 | `test/ui/recommendation.mjs` | **等价重锚** | AI 候选渲染 / 分相终端 |
| 22 | `test/ui/journey.mjs` | **保留** | 保护段 `keep`（字节中立） |
| 23 | `test/ui/binding.mjs` | **保留** | 保护段 `keep`（字节中立） |
| 24 | `test/ui/{l0,l1,no-dead-end,law8-plaintext}.mjs` | **保留 / 等价重锚** | 零死端只增必绿；法八零降级 |
| 25 | 间接面：`op-protocol` / `next-registry` / `next-obligation-table` / `chat-events` / `settings` / `design-contract` | **逐条确认无遗漏** | 若无改动 ⇒ 登记「保留（未触碰）」；若计数面涉及 ⇒ 只增 |

- **纪律**：三态齐（无「未处置」项）；**`assertionsRemoved = 0`**；「行数当断言数」不算对账（R-NDA-910）⇒ 按**断言语义**逐条。

## 备选方案

| 方案 | 处置 |
|---|---|
| 不建台账，只在 build 注释里写明差异 | ❌ N-NDA-006 / FR-NDA-132 明令（`supersession` 台账 old→new 是**唯一**授权例外路径）；`supersession-ledger.test.ts` 会红 |
| 把 X-NDA 台账写进新文件（不动 `v4-...json`） | ❌ 既有门禁读 `v4-supersession-ledger.json`（`supersession-ledger.test.ts:70` 等）；新文件会成为**第二台账**（漂移面） |
| 直接改写 F-36 产物（把机制改回去） | ❌ N-NDA-005（上游产物零改写，唯一例外 = X 台账）；且会破 F-36 的 `validated` 终态 |
| 保护段「顺手重排」以容纳新断言 | ❌ 哈希静默变更（N-NDA-015 明令禁止）；须走八步 |

## 后果

**正向**：
- 机制取代**有据可查**（old→new 逐字 + 理由 + 日期 + 落点 + 可定位判据）；
- 三条硬红线（零改基座 / 保护段 / 断言只增）在**同轮**完成对账（`FR-NDA-122`）；
- 净减一处重锚（X-NDA-11 由「预登记」降为 `no-supersession`）。

**代价**：
- 台账三个新键 + 25 行门禁处置 + 9 行 keep 记账 ⇒ 文档工作量（**零字节**，不进包）；
- 「三态齐 + 间接面确认」的复核成本（R-NDA-910 的漏项风险）⇒ 用 §④ 的 25 行表 + 逐条 `counterCheck` 收口。

## 落地判据（供 tasks/build）

1. `docs/v4-supersession-ledger.json` 新增三键；**老键逐字保留**（`git diff` 只增）；
2. `xNdaLedger` 每行有 `id` / `status` / `old` / `new` / `reason` / `date` / `landing` / `counterCheck`；未发生者 `status === 'no-supersession'` 且 `reason` 非空；
3. `supersession-ledger.test.ts` 绿（含新判据）；保护段双绿（sha + `startByte`）且 `modifiedRanges` 为空或逐行登记；
4. `insight-no-escalation` 绿（base 零 diff）；`zeroDiffFiles` 9 项哈希 pin 不变；
5. `assertionsRemoved === 0`（对账表逐条语义比对，非行数）。
