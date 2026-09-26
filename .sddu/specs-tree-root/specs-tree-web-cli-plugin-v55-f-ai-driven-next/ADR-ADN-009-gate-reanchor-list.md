# ADR-ADN-009: 门禁等价重锚清单（新增 1 + 升级 6 + 间接 · 保护段 keep）

## 状态
ACCEPTED（承父 spec §5.11 GATE FR-ADN-110~117 · §9.5 门禁处置与计数对账 · §12 X-ADN-6 · N-ADN-012/019 · R-ADN-004/910）

## 背景

本 Feature 是「产出面转移」——把「确定性独占产出」的多处判据从「只有注册表能产候选」重锚为「AI 候选也可产、但受校验链约束」。**判据必须等价重锚（断言力不降、计数只增）**，并留台账；**唯一例外** = 保护段按台账显式取代。

**基线口径（诚实登记）**：父 spec §9.5 行的计数（如 `gate-integrity` **24**）引自 F-35 收口 + R8，**本轮未复跑**；本轮只读复核发现仓内实况与部分旧字面量不一致（例：`test/gate-integrity.test.ts#EXPECTED_AUDITED_FILES` 现为 **40** 项）。⇒ **重锚一律按「断言语义 + 语义增量」**，不按陈旧字面量（承 COR-ADN-3 口径）；收口实测时同源前移。

## 决策

### ① 新增 1

| 层 | 门禁 | 内容 |
|:-:|---|---|
| node | **`test/ai-next-candidate.test.ts`（NEW）** | AI-N-1~11：解析 / 5 道校验链真值表 / 顺序优先级 / 判定分层 / 注入反证族 / 真源切片 + 三段控制 / 零新增载体 / `DRIVER_DECLS_SRC` 12↔12 / 零新 LLM 与零第二阈值 / `ask` 一致性（详见 ADR-ADN-007） |

### ② 升级 6（等价重锚；**断言零删除**）

| # | 门禁 | old（钉死现状） | 处置 | new（等价重锚） |
|:-:|---|---|---|---|
| 1 | `test/recommendation-sources.test.ts` | 真值 7 / 模块白名单 5 / `NEXTSTEP_PRIORITY` 恰 4 / 单卡 / **④ 零新 LLM**（`:238`） | **等价重锚** | 全部保持；**新增**断言：`session.aiNext` 注入槽 ∈ 既有 `session` 源 ∧ `recommend.ts` 导入集合仍 ⊆ 白名单 5（**不新增条目**）；④ 保持绿 |
| 2 | `test/driver-timings.test.ts` | DT-2 恰 5 / DT-3 旧 4 逐字 / DT-4 调用点恰 8 / DT-5 入口恰 1 / DT-6 ctx 字段登记 | **等价重锚** | 全部保持；**新增** DT-6 显式断言 `session.aiNext` 经 `session` 前缀登记 |
| 3 | `test/driver-quadruple.test.ts` | DQ-1 双向包含（随 count）/ DQ-2 四元组 / DQ-3 evidence ≡ when-scope / DQ-4/DQ-5/DQ-6 | **等价重锚** | 双向包含自动 **12↔12**；DQ-3 收纳 `session.aiNext`（when-scope 源文本抽取）；DQ-2 的 `ai-next` 静态 `chips=['op.turn'] ⊆ OP_IDS` |
| 4 | `test/op-wiring.test.ts` | `requestTurn(` 恰 1 / `maybeRecommend` 1 定义·8 调用点 / `nextAfterSettle` 1 定义·10 调用点 / 自动按下点恰 1 / `dispatchChipAction` 恰 1（`ai-drive`） | **等价重锚** | **全部数值不动**（零新增挂点：AI 候选经既有 `done → maybeRecommend('idle')` 挂点；X-ADN-6 = 未发生取代）；反证保留 |
| 5 | `test/op-three-tier.test.ts` | `tierOf` 派生式三档 + `OP_TIER_TABLE` 物化 + 特权恒 gesture | **保留 + 加严** | 新增断言：接受层读点 = `tierOf`；确认 `tierOfId('op.authorize')==='gesture'` 且 `admitCandidate` 拒 |
| 6 | `test/proactivity-guard.test.ts` | 六常量单源 + 越限真抑制 + 关断偏好 | **等价重锚** | 新增「**提案不耗预算**」双向断言（产出候选 ⇒ 预算不变 / 自动成回合 ⇒ −1）+ 关断两相（显示相 + 按下相） |

### ③ `gate-integrity` 受审下界（**只增**）

- 新增 `V_ADN_NODE_GATE_FILES = ['test/ai-next-candidate.test.ts']`（承 `IAN1_/IAN2_/V55F2_` 先例，**只增**）；
- `EXPECTED_AUDITED_FILES` 下界 +1（收口按实测同源前移）；
- **`CHROMIUM_GATES === 9` 逐字不动**（**不新增 Chromium 门禁文件**；S0''' 面只在既有 `s0-self-driven.mjs` / `recommendation.mjs` / `law8-plaintext.mjs` **加断言**）。

### ④ 保留 / 间接面对账面（逐条确认无遗漏）

| 门禁 | 处置 | 说明 |
|---|---|---|
| `test/next-registry.test.ts` | **等价重锚（间接面）** | NR-10 反证「还原 PASS」的字面量 `DRIVER_DECLS_SRC.length === 11` → **12**；双向包含 assert 自动随 count |
| `test/next-obligation-table.test.ts` | **保留** | OT-4 读静态 `p.chips`（`ai-next` 静态下界 `['op.turn']` 有义务行） |
| `test/turn-arbitration.test.ts` | **保留** | `ARBITRATION_RESULTS` 四值逐字；AI 撞车 `blocked:busy` 继承 |
| `test/sw-op-mirror.test.ts` | **保留** | AI 校验链读同一 `shared/op-table`；镜像字段集不动 |
| `test/next-dispatch-diff0.test.ts` | **保留** | AI chip 经 `data-op` 单源分发，零 per-op 分支 |
| `test/r8-open-next-entry.test.ts` | **保留（不得回归）** | 首开保持确定性；终端恒在 |
| `test/free-input-next.test.ts` | **保留（下界只增）** | `ids.length >= 11` 仍成立（→12） |
| `test/insight-no-escalation.test.ts` | **保留** | `../web-cli-base` 零 diff |
| `test/supersession-ledger.test.ts` | **保留 + 新增** | X-ADN-1~11 台账条目 + 保护段判据（见 ADR-ADN-010） |
| `test/size-baseline.ts` / `size-ruling-vol3.test.ts` / `size-growth-evidence.test.ts` | **等价重锚 / 新增登记** | 逐叶五要素 + 三值；`SIDEPANEL_GROWTH_BREAKDOWN` 新增行（Σ + glue == 登记增量） |
| `test/design-contract.test.ts` / `test/op-protocol.test.ts` / `test/blocked-terminals.test.ts` / `test/driver-terminals.test.ts` / `test/settings.test.ts` | **保留** | 契约计数不变 |
| Chromium `journey.mjs` / `binding.mjs` | **保留（保护段 keep）** | **零改动** ⇒ 字节中立、sha 不变（见 ADR-ADN-010） |
| Chromium `l0.mjs` / `l1.mjs` / `l2.mjs` / `density.mjs` / `hardening.mjs` / `insight.mjs` / `zero-injection.mjs` / `auth-chip.mjs` / `page-input.mjs` / `no-dead-end.mjs` / `stream.mjs` | **保留** | 除非实测因 AI 候选渲染面需要等价重锚（**只加断言**）——`density.mjs` 为显示上界的最终仲裁 |

### ⑤ 纪律

- **断言零删除零降级、计数只增**（唯一例外 = 保护段显式取代 + 台账）；对账表三态齐（保留 / 等价重锚 / 显式取代）；
- **反证必须实跑**（注入 → FAIL 声明 `expectFailPattern` → 逐字节还原 sha256 前后相同 → PASS）；
- 门禁**严格串行**（`test` / `test:ui` / `test:binding` 绝不并发；一次一个 Chromium；`finally` 自清 profile）；`KL-N-10` flake 处置 = 隔离复跑 ≥2、日志全量、**仍红如实记录不阻塞收口**。

## 后果

- 「产出面转移」不会静默降低门禁强度（R-ADN-004 有逐条重锚 + 反证）；
- **代价**：1 新 node 门禁 + 6 处升级 + 若干间接重锚（**无断言删除**；`assertionsRemoved = 0`）；
- **诚实登记**：父 spec §9.5 的部分行计数未复跑；收口按实测同源前移。
