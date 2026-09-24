# 构建报告：specs-tree-v55f-2-batch-consent（V5.5F-2 任务级批量授权）

> **文档定位**: SDDU 构建报告 — 记录本叶**第一轮**（**R1 = W1 + W2**，`TASK-V55F-201~212`）的文件变更、实现结果与门禁读值，作为 review 的输入
> **前置依赖**: 本叶 `tasks.md` / `tasks.json`（16 任务 / 3 波）、本叶 `plan.md` v1.0、父 `plan.md` + `ADR-SGO-004/005`（另读 006/007 做落点判定）、叶1 `specs-tree-v55f-1-ref-context-and-anchor`（**validated**，硬依赖已满足）
> **创建人**: SDDU Build Agent
> **创建时间**: 2026-09-24
> **版本**: v2.0（**R1 = W1+W2（12/16）+ R2 = W3（4/16）⇒ 16/16 全部完成**）
> **更新人**: SDDU Build Agent
> **更新时间**: 2026-09-24
> **更新说明**: v2.0 追加 **R2（W3：`TASK-V55F-213~216`）**：WIDEN 二择接线 + `out-of-scope-authorized` 转值 + 批量留痕（213）→ S0′ 批量段 `S0P-B1~B3`（214）→ X-SGO-4/6/7 台账 + 法八批量零明文只增（215）→ 体积逐叶重登记 + 本叶收口（216：**6 项体积/红线 pin 一次闭环，`npm test` 1394 / 0 fail**）。v1.0（R1 = W1+W2）逐字保留。

---

## 1. 构建概要

| 维度 | 数值 |
|------|:--:|
| 完成任务数 | **12 / 16**（R1 = `TASK-V55F-201~212`，W1+W2；W3 `213~216` 留 R2） |
| 复杂度分布 | R1：**S×1（`204`）/ M×10（`201`/`202`/`203`/`205`/`206`/`207`/`208`/`209`/`211`/`212`）/ L×1（`210`）** |
| 新增文件 | **2 个**：`src/background/batch-plan.ts`（B 列）· `test/batch-consent.test.ts`（新 node 门禁） |
| 修改文件 | **13 个**（唯一文件）：源码 9（`messaging.ts` / `service-worker.ts` / `confirm.ts` / `audit-sink.ts` / `stream-model.ts` / `chat-state.ts` / `cards/auth.ts` / `cards/index.ts` / `sidepanel.ts`）+ 门禁 4（`supersession-ledger.test.ts` / `op-three-tier.test.ts` / `capability-wiring.test.ts` / `gate-integrity.test.ts`） |
| 新增 node 门禁 | **1 枚**（`batch-consent`，BC-1~7；已入 `EXPECTED_AUDITED_FILES`；`CHROMIUM_GATES === 9` 逐字不动） |
| 测试计数 | `npm test` **1375 → 1386**（+11 用例：BC-1~7 ×7 + RL-06 扩批量 ×1 + OT-⑩ 扩批量 ×1 + 特权不入批 ×1 + 元门禁自动纳入 ×1）；**提交前 1379 pass / 7 fail**（含 1 条预提交 worktree 漂移）⇒ **提交后 1380 pass / 6 fail**（漂移自愈；6 = 体积/红线 pin 家族，逐叶重登记属 W3 `216`） |
| A 列体积 | `dist/sidepanel.js` **585,732 → 589,033 B**（**+3,301 B ≈ 3.22 KiB**；叶预算 **3.5~5.5 KB** ⇒ 上界未越；生效上限 615,018 / 档位 614,400 ⇒ **未跨**） |
| B 列体积（**不计账**） | `dist/background.js` **1,627,424 → 1,635,675 B**（**+8,251 B**；`batch-plan.ts` NEW + `confirm.ts` 计划感知桥 + `service-worker.ts` 捕获/接线 + `audit-sink.ts` 字段） |
| 红线冻结面 | `dist/content.js` **177,076 B** / sha `52a82620…`、`dist/pick-layer.js` **34,358 B** / sha `77796bab…` **逐字节不变**；`packages/web-cli-base/**` **零 diff** |
| 计数红线 | `KIND_SET` **40 逐字**（计划是 `confirm-request` 的 type-only 扩展字段，未成 kind）；`requestTurn(` **恰 2**（不新增主流程调用点）；12 kind / `REGISTERED_STRUCTURAL_HOSTS === []` / `MAX_OPEN_ASKS = 2` / `ASK_CANCEL_REASONS` 4 逐字 |
| 保护段 | journey **171 / 0**、binding **192 / 0**（两文件**本轮零改动**；保护段字节区间未触及） |
| 受管 Provider | **零调用**（routing.v1 = `local_or_compute → none`） |

### 1.1 R1 交付的三条主链

```
① 边界先行（W1）：RL-06 / OT-⑩ 扩批量变体注入必红 + 特权 op 不入批机核 + 载体零新增
   + batch-consent 门禁骨架 BC-1~7（每条 expectFailPattern + 注入反证 ⇒ 禁恒真）
② 计划与指纹（W2）：runChat 的 chat 回调内**恰一处**捕获单条 assistant 消息的 toolCalls
   → buildPlan（in-scope dom set-text）→ planFingerprint（逐字节入哈希）
   → 一次真实手势（既有 auth 卡）→ 计划内准入 / 计划外逐条回落 / 批准前漂移显式失败
③ 零明文与中止：计划正文仅 UI 渲染文本（CardView.plan 与 payload 同级、非 payload）
   + maskRefDigest 掩码 + 审计只记 fingerprintDigest / batchEntries
   + 中止 ⇒ cancelled + 部分完成如实（不谎报整批成功）
```

---

## 2. 文件变更

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| **NEW** | `packages/web-cli-plugin/src/background/batch-plan.ts` | 206 / 207 / 208 | **B 列**（纯逻辑 / 零 `chrome.*`）。① `buildPlan(calls, refs)`：单条 assistant 消息的 **in-scope `dom set-text`** 聚合（范围外不入计划）；`planMode` = `N≥2` 出卡 / `N==1` 逐条 / `N==0` 不出；② `planFingerprint` = `'sha256:' + sha256Hex(canonical(selector ∧ actionType ∧ fromDigest ∧ toText))`（**逐字节**，不归一化；**摘要出账**）；③ `admitEntry`：条目键 ∈ 已批准集 ⇒ 放行 / 计划外 ⇒ 回落 / 批准前漂移 ⇒ 显式失败；`createBatchConsent()` + 生产单例 `batchConsent`；`planTargetInRefs` 与法九 `targetInRefs` **同口径**（BC-1 逐例机核） |
| MODIFY | `.../src/background/messaging.ts` | 204 | **只增 type-only** `BatchPlanWireEntry` / `BatchPlanWire` / `ConfirmPlanQuestionExt`（`question.plan` 是既有 `confirm-request` 的**扩展字段**，不是 kind）。`KIND_SET` **40 逐字不动** |
| MODIFY | `.../src/background/service-worker.ts` | 209 | `runChat` 的 `chat` 回调内**恰一处** `batchConsent.setPlan(await buildPlan(res.toolCalls, refs))`（计划在任何写**执行之前**成立）；`finally` `batchConsent.clear()`；`createConfirmBridge` 增 `plan: { consent: batchConsent, refs: () => refTurnHolder.refs() }`（holder 单源 + 漂移重校验同源） |
| MODIFY | `.../src/security/confirm.ts` | 210 | **计划感知桥**：首次写 ⇒ 计划卡（`question.plan` 渲染数据）；已批准 ∧ 未漂移 ⇒ **放行**（不再出卡）；被拒 / 中止 ⇒ **拒绝**；漂移 ⇒ **显式失败**；审批状态**只**由 `opts.ask` 回传（面板真实点击）推进；计划卡 `ask` 审计**只记指纹摘要 + 条目数**。**单条路径逐字不变**（`plan` 缺省 ⇒ 既有 `summary` 审计路径） |
| MODIFY | `.../src/security/audit-sink.ts` | 210 | `PluginAuditEvent` 增 `fingerprintDigest?` / `batchEntries?` / `fieldNames?`（**只记机器事实**，正文 / 译文永不入审计值） |
| MODIFY | `.../src/ui/sidepanel/stream-model.ts` | 211 | `StreamEvent` / `StreamEventInput` / `CardView` 增 `plan?: readonly string[]`（**与 `payload` 同级、不在 `payload` 内**，R-SGO-914 消除）；`appendEvent` 深冻结拷贝；`project()` 折叠（终态冻结后不再改）；**不在 `DIGEST_FIELDS`** ⇒ 不持久化（零明文持久化面） |
| MODIFY | `.../src/ui/sidepanel/chat-state.ts` | 211 | `confirm` action 增 `plan?: readonly string[]`；`auth` 卡经 `appendAskEvent` 的 `plan` 字段（**payload 之外**）。缺省 ⇒ 单条卡逐字节不变 |
| MODIFY | `.../src/ui/sidepanel/cards/auth.ts` | 211 / 212 | `authPlanRows`（`textContent` 行 + `maskRefDigest` 掩码 + 上限 **8 行** + 诚实计数行，PD-SGO-007）；`planBlock` **零 DOM 内容属性**；`patchAuthCard` 在中止（`cancelled` ∧ 有计划）追加**如实交代**行 `AUTH_PLAN_ABORT_TEXT` |
| MODIFY | `.../src/ui/sidepanel/cards/index.ts` | 211 | 导出 `authPlanRows` / `AUTH_PLAN_RENDER_MAX` / `AUTH_PLAN_ABORT_TEXT`（单源在卡侧） |
| MODIFY | `.../src/ui/sidepanel/sidepanel.ts` | 211 / 212 | `confirm-request` 分支读 `question.plan` → 计划行 + 零明文留痕行（`batch.plan=<fingerprint> \| batch.entries=N`）；计划被拒时落留痕行；`requestTurn(` 仍恰 2 |
| MODIFY | `.../test/supersession-ledger.test.ts` | 201 | **纯追加**：RL-06 扩批量变体（`BULK_CONSENT_VARIANTS` 三类 + `bulkConsentProxyProblems` + `bulkConsentWriteSites`）；原 12 项红线终核**逐字不动** |
| MODIFY | `.../test/op-three-tier.test.ts` | 202 | **纯追加**：OT-⑩ 扩批量变体（`bulkAdmitProblems`；`tierOf` 逐 op 不变；特权入批必红） |
| MODIFY | `.../test/capability-wiring.test.ts` | 203 | **纯追加**：`batchPrivilegedProblems` + 计划模块零特权标识 / 零 `.request(` / 计数不减 / 注入必红 |
| **NEW** | `.../test/batch-consent.test.ts` | 205 | **新 node 门禁** `BC-1~7`（各带 `expectFailPattern` + 注入反证；真源切片读生产模块） |
| MODIFY | `.../test/gate-integrity.test.ts` | 205（→216 收口） | `EXPECTED_AUDITED_FILES` **只追加** `test/batch-consent.test.ts`（新门禁自动纳入受审集合）；`CHROMIUM_GATES === 9` 逐字不动 |

> **NOOP（显式登记）**: `packages/web-cli-base/**`（零 diff）· `src/content/**` · `dist/content.js` · `dist/pick-layer.js` · `manifest.json` · `src/security/policy.ts` / `auto-authorize.ts`（判定链 `zeroDiffFiles` 9 项）· `shared/op-table.ts`（`tierOf` 单源不改）· `src/ui/sidepanel/l1/ref-scope.ts`（法九四值唯一声明不动；计划侧只**复用**其掩码口径）· `chat-runner.ts`（base runner 已提供全部 `toolCalls` ⇒ **零改**）。

---

## 3. 任务完成清单（R1）

| 任务 | 名称 | 复杂度 | 状态 | 对应 FR |
|------|------|:--:|:--:|------|
| TASK-V55F-201 | RL-06 扩批量变体（AI 代答计划 ⇒ 必红） | M | ✅ completed | FR-SGO-049 / 103 |
| TASK-V55F-202 | OT-⑩ 扩批量变体（`tierOf` 逐 op 不变） | M | ✅ completed | FR-SGO-049 / 103 |
| TASK-V55F-203 | 特权 op 不入批机核 + 「SW 永不 `.request(`」 | M | ✅ completed | FR-SGO-045 |
| TASK-V55F-204 | 载体零新增（type-only 计划字段 + 复用 `auth` kind） | S | ✅ completed | FR-SGO-041 / 063 |
| TASK-V55F-205 | `test/batch-consent.test.ts` 新门禁骨架（BC-1~7） | M | ✅ completed（**7 / 0**） | FR-SGO-040~050 / 093 |
| TASK-V55F-206 | `batch-plan.ts` 计划结构 + `buildPlan`（系统聚合） | M | ✅ completed | FR-SGO-040 / 041 |
| TASK-V55F-207 | `batch-plan.ts` `planFingerprint`（逐字节入哈希、摘要出账） | M | ✅ completed | FR-SGO-042 |
| TASK-V55F-208 | `batch-plan.ts` `admitEntry`（准入 / 回落 / 漂移） | M | ✅ completed | FR-SGO-042 / 044 / 049 |
| TASK-V55F-209 | SW 批次 `toolCalls` 捕获 + holder + `confirm` 桥接线 | M | ✅ completed | FR-SGO-040 / 041 |
| TASK-V55F-210 | `security/confirm.ts` 计划感知桥（指纹准入 + 回落 + 零明文） | L | ✅ completed | FR-SGO-042 / 044 / 046 / 049 |
| TASK-V55F-211 | 计划卡渲染（`chat-state.ts` 字段 + `cards/auth.ts` 计划行） | M | ✅ completed | FR-SGO-050 / 046 / 048 |
| TASK-V55F-212 | 中止 + 部分完成如实 + 逐条保留（`cancelled` 语义保持） | M | ✅ completed | FR-SGO-047 / 048 |
| TASK-V55F-213 | WIDEN 二择接线 + `out-of-scope-authorized` 转值 + 批量留痕 | M | ✅ completed（**R2**） | FR-SGO-060~063 / 081 / 082 |
| TASK-V55F-214 | S0′ 批量段（S0P-B1~B3） | L | ✅ completed（**R2**） | FR-SGO-093 |
| TASK-V55F-215 | X-SGO-4/6/7 台账 + 法八批量零明文只增 | M | ✅ completed（**R2**） | FR-SGO-103 / 105 / 107 |
| TASK-V55F-216 | 体积本叶重登记 + 本叶收口 | M | ✅ completed（**R2**） | FR-SGO-120~125 |

### 3.1 测试覆盖（R1 新增 11 用例）

| 门禁 | 用例 | 覆盖 |
|---|:--:|---|
| `batch-consent`（**新**） | **7** | BC-1 计划构建（范围外不入 / 三分支 / 与 `targetInRefs` 逐例等价）· BC-2 指纹逐字节（空白改动 ⇒ 变 / 出账只记摘要）· BC-3 准入 + 计划外回落 · BC-4 批准前漂移 · BC-5 特权不入批 · BC-6 零明文（四面临界 + 掩码）· BC-7 中止 + 部分完成如实 |
| `test:supersession` | **1** | RL-06 扩批量变体（AI 代答 / 建议即同意 / 自动展开 三类注入必红） |
| `op-three-tier` | **1** | OT-⑩ 扩批量变体（`tierOf` 逐 op 不变 ∧ 批量准入 ⊆ auto ∧ 特权恒 gesture） |
| `capability-wiring` | **1** | 特权 op 不入批（计划模块零特权标识 ∧ `.request(` 计数不减） |
| `gate-integrity` | **1**（元判据自动纳入） | 新门禁由 `JUDGEMENTS + expectFailPattern` 标记被目录扫描发现并逐项在册 |

---

## 4. 门禁对账

> 严格串行（**一次一个 Chromium**）；日志全量落在 `/tmp/opencode/v4-gate-logs/v55f-2-r1/`。
> 「基线」= v55f-1 validated 后读值。

| 门禁 | 基线 | R1 实测 | 结论 |
|---|---:|:--:|---|
| `npm run typecheck` | 绿 | **绿** | 无类型错误（`typecheck` 日志同时段） |
| `npm run build` | 绿 | **绿** | 4 产物 + `build-meta.json`；`sidepanel.js` = 589,033（`build.log`） |
| `npm test`（全部 node 门禁） | 1375 / 0 | **1386 用例（提交前 1379/7 ⇒ 提交后 1380/6）** | +11 用例只增。**6 红 = 体积/红线 pin**（登记基线滞后产物 ⇒ **逐叶重登记属 W3 `TASK-V55F-216`**，R1 如实红并归因）；预提交的 1 条 worktree 漂移（`zeroDiffFiles` 巡检对未提交改动敏感）在提交后**自愈**（实测 `npm test-final.log` = 1380 pass / 6 fail） |
| `batch-consent`（**新**） | — | **7 / 0** | BC-1~7 全绿（含 on-disk 注入反证） |
| `test:supersession` | 39 / 0 | **40 / 0**（除体积红线③家族 → 归 §7 偏差 1） | RL-06 扩批量变体在册；X-SGO 台账（W3 `215`）未动 |
| `op-three-tier` | 10 / 0 | **11 / 0** | `tierOf` 逐 op 不变；特权恒 gesture（**订正**：baseline 10/0 ∧ R1 +1 ⇒ 11/0；原文「11/0 · 12/0」为抄录偏差，见 §10.1 I-04 / §11 对账订正） |
| `capability-wiring` | 10 / 0 | **11 / 0** | `.request(` 计数不减（SW 0 / helper ≥1）（**订正**：baseline 10/0 ∧ R1 +1 ⇒ 11/0；原文「9/0 · 10/0」为抄录偏差，见 §10.1 I-04 / §11 对账订正） |
| `host-registry` | 绿 | **绿** | 零宿主 / 12 kind / `MAX_OPEN_ASKS = 2` / `ASK_CANCEL_REASONS` 4 逐字 |
| `test:gate-integrity` | 20 / 0 | **20 / 0** | 新门禁入受审集合；`CHROMIUM_GATES === 9` |
| `test:law8`（法八四面） | 46 / 0 | **46 / 0** | **零降级**（计划行 `textContent` + 掩码；四面零正文） |
| `test:dead-end` | 49 / 0 | **49 / 0** | 计数不减（中止 ⇒ 可读理由 + 可达下一步） |
| `test:auth-chip` | 37 / 0 | **37 / 0** | 授权 chip 两态不变 |
| `test:ask-auth` | 78 / 0 | **78 / 0** | ask/auth 流入链路不变 |
| `test:stream` | 76 / 0 | **76 / 0** | 流模型（`plan` 兄弟字段不影响既有投影/渲染） |
| `test:ui`（journey；**保护段**） | 171 / 0 | **171 / 0** | 保护段 `43054..58287` **零字节** |
| `test:binding`（**保护段**） | 192 / 0 | **192 / 0** | 保护段 `107780..115930` **零字节** |
| `test:l0` / `test:l1` | 248 / 0 · 131 / 0 | **248 / 0 · 131 / 0** | 计数不减 |
| `s0-self-driven`（Chromium） | 65 / 0 | **65 / 0** | 计数不减（S0′ 批量段 = W3 `214`） |
| `e2e` | PASS | **PASS** | 4 产物真实全链（`e2e.log`） |
| 红线巡检 | — | **绿** | `content.js` 177,076 / `52a82620…`；`pick-layer.js` 34,358 / `77796bab…`；base 零 diff；`KIND_SET` 40；`requestTurn(` 2 |
| `size-*` / `test:size-ruling-vol3` / 红线③ | 绿（登记 == 产物） | **6 红**（登记滞后产物） | **R1 只测不登记**（逐叶收口属 W3 `216`）—— 见 §5 / §7 偏差 1 |

---

## 5. 体积五要素（**R1 只测量；登记留 W3 `TASK-V55F-216`**）

> 口径（ADR-SGO-007 / FR-SGO-120~125）：**A 列** = `sidepanel.js` 净增（计账）；**B 列** = `background.js` 净增（**不计账**，优先落 SW 侧）。

| 要素 | 值 |
|---|---|
| **① 前值 / 后值** | A 列：**585,732 B → 589,033 B**（**+3,301 B ≈ 3.22 KiB**，+0.56%）· B 列：**1,627,424 → 1,635,675 B**（**+8,251 B**；不计账） |
| **② 日期** | 2026-09-24（**R1 = W1+W2**） |
| **③ 来源 / 命令 / 测量者** | `packages/web-cli-plugin/dist/sidepanel.js` / `npm run build`（esbuild `metafile: true` ⇒ `dist/build-meta.json`）/ SDDU Build Agent（基线侧同几何重建对账：`585,732` / `1,627,424` 与 v55f-1 登记值**逐字节一致**） |
| **④ 理由（逐模块归因，真实 metafile）** | A 列：`ui/sidepanel/cards/auth.ts` **+2,113**（计划行 + 掩码 + 中止交代）+ `ui/sidepanel/stream-model.ts` **+455**（`plan` 兄弟字段 + 投影折叠）+ `ui/sidepanel/sidepanel.ts` **+448**（`question.plan` 读取 + 零明文留痕）+ `ui/sidepanel/chat-state.ts` **+285**（`confirm` action 字段）＝ **Σ +3,301 + 胶水 0 == 登记增量**。B 列：`background/batch-plan.ts` NEW / `security/confirm.ts` 计划感知桥 / `background/service-worker.ts` 捕获与接线 / `security/audit-sink.ts` 字段（全部落 SW bundle ⇒ 本产物零字节） |
| **⑤ 历史保留** | R1 **不重登记**（`SIDEPANEL_BASELINE_BYTES_TIMELINE` / `SIDEPANEL_RE_REGISTRATIONS` / `HISTORY` 本轮**逐字不动**）⇒ W3 `216` 追加 |
| **预算对照** | A 列预算 **3.5~5.5 KB**（上界 4.0~6.3 KB）：实测 **+3,301 B** ⇒ **未越上界**（**低于下界 199 B** —— 面板侧改动比估量更小，属正常口径偏差，不是越限）；生效上限 **615,018**、档位 **614,400**、绝对上限 **675,840** ⇒ 589,033 **均未越** |
| **三值同源（V3-VOL-3，R1 保持）** | `SIDEPANEL_BASELINE_BYTES` = **585,732**（=W3 才前移）∧ 档位 `ceilTo50KB(585,732)` = **614,400** ∧ 绝对上限 675,840 = 614,400 × 1.10；`cap` 保持 `record-only` |
| **EC-SGO-022 二态（显式，禁预填）** | 越**生效上限**（615,018）= **否**（589,033 < 615,018）· 越**档位**（614,400）= **否**（距 **25,367 B**）· 越**绝对上限**（675,840）= **否** ⇒ **三分支均未触发** |
| **`authorConfirmation`** | 保持 **`pending-author-line`**（**不得伪称已确认**，N-SGO-023） |
| **两叶 Σ 对照（前移量）** | 本叶 A 列 +3,301 B（R1）· 叶1 A 列 +7,109 B ⇒ **Σ +10,410 B ≈ 10.2 KiB**，落在父 `plan.md §8` 正常口径 **9.5~14.5 KB**（+15% 16.7 KB）内；对照余量 **28,668 B**（614,400 − 585,732）⇒ **不触发升档** |

---

## 6. 反证摘要（每任务注入 ⇒ 必红 ⇒ 还原 ⇒ PASS）

| 任务 | 注入点 | 期望 FAIL 模式 | 实测 |
|:--:|---|---|:--:|
| **201** | 把 `batchConsent.markApproved()` 注入 **AI 侧模块**（on-disk：`next-registry/ai-drive.ts`） | 「AI 代答了计划审批」 | ✅ FAIL → **逐字节还原（sha256 相同）** → PASS；「建议即同意」「自动展开」两类在测内注入同样必红 |
| 201 | 把计划审批写入点塞进 AI / LLM 模块（合成 facts） | 三类变体各自必红 | ✅ FAIL → 还原 PASS |
| **202** | 把 `op.authorize` 塞进批量准入集 ／ 把其档位改成 `auto` | 「批量准入不得含非 auto 档」＋「特权恒 gesture」 | ✅ 双红 → 还原 PASS |
| **203** | 把 `op.authorize` 标识注入 `src/background/batch-plan.ts`（on-disk） | 「批量计划模块不得出现特权 op」 | ✅ FAIL → **逐字节还原** → PASS |
| 204 / 205 | 复制声明 / 把 `refs` 加进 `KIND_SET` ／ 计划字段写进 `StreamPayload` | 「KIND_SET 41」「计划字段不得进入 `StreamPayload`」 | ✅ FAIL → 还原 PASS |
| **206** | 把范围外条目放进计划 | 「计划必须只含 in-scope `dom set-text`」 | ✅ FAIL → 还原 PASS（BC-1） |
| **207** | 用 **归一化**（trim）后比较文本对 | 「空白改动 ⇒ 指纹变」（归一化后判相等） | ✅ 判据承重：归一化实现把 `'译文'` 与 `'译文 '` 判成相等，逐字节 canonical 能区分（BC-2） |
| **208** | 把 `admitEntry` 的计划外分支改成 `admitted`（on-disk：`dist-test` 编译产物） | 「计划外被放行必然判红」 | ✅ FAIL → **逐字节还原** → PASS（BC-3） |
| 208 | 忽略漂移（`drift` ⇒ `admitted`） | 「漂移仍放行必红」 | ✅ FAIL → 还原 PASS（BC-4） |
| **210** | 把计划正文（含凭据形哨兵）放进审计值 ／ 卡行不掩码 | 「审计 / payload / digest / DOM 属性无计划正文」「凭据形必须被掩码」 | ✅ 判据承重：计划卡 `ask` 审计改为**只记指纹摘要 + 条目数**后四面零命中（BC-6） |
| **212** | 中止（`markCancelled`）后仍返回 `admitted` | 「中止后不得继续写」 | ✅ FAIL → 还原 PASS（BC-7）；`auth` 6 终态逐字保持 |

> **禁恒真纪律**：每条判据都声明 `expectFailPattern`，且**在测内实跑注入**（BC-3/4/7 用伪造 `AdmitFn`；BC-2 用归一化实现）—— 无一条是恒真断言（FR-SGO-111）。

---

## 7. 纪律与偏差登记

| 项 | 状态 |
|---|---|
| 法八（页面文本可入载荷 / 凭据不可 / 审计零明文） | ✅ 计划行只经 `textContent` 渲染（**零 DOM 内容属性**）+ `maskRefDigest` 单一口径掩码；审计只记 `fingerprintDigest` / `batchEntries`；`CardView.plan` 与 `payload` **同级**（不在 payload 内）；`law8` **46/0 零降级** |
| 法九（读数单源 + 禁恒真） | ✅ `l1/ref-scope.ts` 四值与 `scopeReading` **唯一声明不动**（未新增第二声明）；计划侧成员判据由 BC-1 **逐例等价机核**（不复制判据，靠机器保证不漂移） |
| 红线⑥（consent 不得被 AI 代答） | ✅ 批量变体三类注入必红；审批状态**只**由面板真实点击回传推进（`confirm.ts` 唯一写入面）；AI / LLM 侧模块零审批写入点（on-disk 注入实测） |
| 特权 op 恒不入批 | ✅ 计划只识别 `dom set-text`；计划模块零特权标识；`tierOf` 单源不改；`.request(` 计数不减 |
| 测试只增 | ✅ `npm test` 1375 → 1386（+11 用例）；Chromium 面**零新增文件**（`CHROMIUM_GATES === 9` 未动） |
| 门禁串行 + 日志 | ✅ 一次一个 Chromium；日志 `/tmp/opencode/v4-gate-logs/v55f-2-r1/` |
| `git add -A` | ✅ 未使用（按文件精确 stage；`dist/` / `dist-test/` 未入库） |
| 红线巡检 | ✅ `content.js` 177,076 / `52a82620…`；`pick-layer.js` 34,358 / `77796bab…`；`web-cli-base/**` 零 diff；`KIND_SET` 40；`requestTurn(` 恰 2；`manifest.json` 零 diff |
| **偏差登记 1** | **体积逐叶重登记后置**：R1 A 列净增 **+3,301 B**（上界 6.3 KB 内、未越任何上限）但**不重登记**（`TASK-V55F-216` 留 W3，按任务书「W3 体积收口」）⇒ `size-budget` / `size-growth-evidence`（×3）/ `size-ruling-vol3` / `supersession` 红线③ 家族**如实红**并归因。**不以放宽容差 / 删判据 / 静默降档实现**；登记将随 W3 的五要素 + 三值同源前移 + 两叶 Σ 一次闭合 |
| **偏差登记 2** | **`zeroDiffFiles` 巡检的预提交敏感**：`src/background/messaging.ts` 在 `zeroDiffFiles`（不动面）内 —— 本叶的 type-only 扩展使其**在提交前**被 `git status --porcelain` 判为漂移（R1 的 7 红之一）。这是**提交流水线时点**的产物，不是解冻：提交后 worktree 干净 ⇒ 该条自愈（与 v55f-1 R1 同口径）。**不篡改判据、不预填解冻册** |
| **偏差登记 3** | **`batch-plan.ts` 与 `l1/ref-scope.ts` 的成员判据关系**：SW 侧不 import 面板读数模块（保持叶1「读数单列」口径）⇒ 计划侧以 `planTargetInRefs` 承载**同一口径**（路 A `--ref` / 路 B selector / 路 B′ 合成锚），并由 `BC-1` 对法九 `targetInRefs` **逐例等价机核**（含「路 B 兜路 A 误配」用例）。**不复制四值词表**（法九 L9-1 仍唯一声明） |
| **偏差登记 4** | **`question.plan` 的 wire 明文**：计划条目（含 `toText` / `fromDigest`）经既有 `confirm-request` 的 type-only 扩展字段下发 —— 属**页面文本**（法八允许入载荷 / 上下文）；**凭据形值在渲染前逐行掩码**（`maskRefDigest`），审计面**从不**接收文本对。这是 ADR-SGO-004 §2/§7 的**明文口径**，非越界 |
| **偏差登记 5** | **人工面 M2 / M3**（连点疲劳体感 / 批量卡真机可读性）**⏳ 未执行**（属 W3 `TASK-V55F-214`，不得冒充 PASS） |
| **偏差登记 6** | **W3 未做项显式登记**：WIDEN 二择（`213`）/ S0′ 批量段 `S0P-B1~B3`（`214`）/ X-SGO-4/6/7 台账 + `law8` 只增（`215`）/ 体积收口（`216`）⇒ R1 交付**不含**扩围征询与图谱台账，review / validate 应以 **R1（W1+W2）** 范围判定 |

---

## 8. 下一步

| 场景 | 操作 |
|------|------|
| **R1（W1+W2）已完成** | 12/16 任务完成；`batch-consent` 7/0；法八 / 死端 / 保护段全绿 |
| **继续构建（R2 = W3）** | 运行 `@sddu-build specs-tree-v55f-2-batch-consent`（续做 `TASK-V55F-213~216`：WIDEN 二择 / S0′ 批量段 / 台账 / 体积逐叶收口）—— 收口后 6 项体积/红线 pin 一次闭合 |
| 审阅 | 运行 `@sddu-review specs-tree-v55f-2-batch-consent`（红线⑥ + 法八 + 授权语义） |
| 父收口 | 父 `specs-tree-web-cli-plugin-v55-f-scope-governance` 待两叶均收口后登记 ROADMAP |

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（**R1 = W1+W2**，`TASK-V55F-201~212`）：边界先行（RL-06 / OT-⑩ 扩批量变体注入必红 + 特权 op 不入批机核 + 载体零新增 + `batch-consent` BC-1~7）→ 计划/指纹/准入/回落/漂移/零明文/中止。`npm test` 1375 → 1386（+11）；`batch-consent` **7/0**；A 列 +3,301 B / B 列 +8,251 B；三冻结面逐字节不变；`law8` 46/0 · `dead-end` 49/0 · journey 171 · binding 192 · l0 248 · l1 131 · stream 76 · auth-chip 37 · ask-auth 78 · s0 65 · `e2e` PASS。R1 末 7 红 = 6 体积/红线 pin（重登记属 W3 `216`）+ 1 预提交 worktree 漂移（提交后自愈）；W3（`213~216`）留 R2。零受管 Provider 调用（routing.v1 = `local_or_compute → none`） | 2026-09-24 | SDDU Build Agent |
| v2.0 | **R2 = W3（`TASK-V55F-213~216`）⇒ 16/16 全部完成**：WIDEN 二择（`ref-scope.ts` 单源 + `sidepanel.ts` 接线 + 批量留痕）→ S0′ 批量段 `S0P-B1~B3`（样本单源扩展 + node/Chromium 双面只加断言）→ X-SGO-4/6/7 台账 + 法八批量零明文只增 → 体积逐叶重登记（A 列 585,732 → **591,946 B**）+ v55f-2 叶段台账。**6 项体积/红线 pin 一次闭环：`npm test` 1394 / 0 fail**；`law8` 52/0（+6）· `dead-end` 53/0（+4）· `s0-self-driven` 70/0（+5）· `stream` 76/0 · `ask-auth` 78/0 · `auth-chip` 37/0 · `l0` 248 · `l1` 131 · `l2` 74 · journey 171 · binding 192（1 次 KL-N-10 flake ⇒ 隔离复跑 PASS）· `e2e` PASS。零受管 Provider 调用 | 2026-09-24 | SDDU Build Agent |
| v2.1 | **review 微修（R1 审查 I-01~I-04，§10）**：I-01 `cards/index.ts:56` 两条 import 拆回单行（纯格式）· I-02 `confirm.ts` `fallback` 显式分支（不挂计划渲染数据 / 不置 `planGate` / `BATCH_FALLBACK_TEXT` 上屏，判据本体不改）· I-03 删除死导出 `BATCH_RENDER_MAX`（单源保留 `cards/auth.ts#AUTH_PLAN_RENDER_MAX`）· I-04 `build.md` §9.2 supersession 40→42 / §9.3 生效上限 615,018→621,543。**A 列 `sidepanel.js` 591,946 不变（无需重登记）**，B 列 `background.js` +175 B（不计账）；`typecheck` = 0 · `npm test` **1394/0**（不减）· `test:supersession` **42/0**；三冻结面 sha 双锚（`content` 52a82620… / `pick-layer` 77796bab…）零 diff。零受管 Provider 调用（routing.v1 = `local_or_compute → none`） | 2026-09-24 | SDDU Fast Agent |

---

## 9. R2 = W3 收口（`TASK-V55F-213~216`）

> 本节记录 **R2（W3）** 的实现、反证与门禁终值；R1 段（§1~§8）逐字保留。

### 9.1 文件变更（R2）

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| MODIFY | `.../src/ui/sidepanel/l1/ref-scope.ts` | 213 | **扩围二择单源**：`SCOPE_WIDEN_PROMPT` / `SCOPE_WIDEN_OPTIONS`（「仅引用范围内」/「整页（扩大范围）」）/ `SCOPE_WIDEN_WHOLE_PAGE` / `isWidenWholePage` / `isWidenAuthorizedReading`。零状态（写入面在面板）。 |
| MODIFY | `.../src/ui/sidepanel/sidepanel.ts` | 213 | confirm 面处理提为**具名** `handleConfirmRequest`（listener 与测试 seam 同一路径）；越界未征询 ⇒ **WIDEN 二择**（既有 `askuser`；零新 kind）+ 「整页 ⇒ `authorized=true`（唯一写入面 = 真实点击）」+ 留痕 `scope.reading=out-of-scope-authorized \| scope.authorized=user`；拒绝 / 取消 ⇒ fail-closed + 可读理由 + 零死端；`__v3.testing.confirmRequest` seam；批量留痕扩展为 `batch.gesture` / `batch.results`。 |
| MODIFY | `.../test/ui/fixtures/s0-chain.mjs` | 214 | **S0′ 批量段样本单源**：`S0P_B_BEATS` / `S0P_B_ITEMS` / `s0pBProblems` / `s0pBChain`（node + Chromium 双面共用；只加断言不加文件）。 |
| MODIFY | `.../test/s0-self-driven-chain.test.ts` | 214 | S0′ 批量段 **node 判官**（真源切片 = `background/batch-plan.ts`；`S0P_B1~B3` + 反证）。 |
| MODIFY | `.../test/ui/s0-self-driven.mjs` | 214 | S0′ 批量段 **Chromium 面**（单卡 N 行 / 一次手势留痕 / 扩围二择；`S0C-11`）。 |
| MODIFY | `.../test/law9-scope-reading.test.ts` | 213 | `confirmBranch` 真源切片跟随生产结构前移 + **L9-9 扩围二择**（转值单源 + AI 零写入面 + 注入必红）。 |
| MODIFY | `.../test/ui/no-dead-end.mjs` | 213 | **ND-10**：WIDEN 拒绝 ⇒ fail-closed ∧ 零死端（无阻塞载体 / 无开口 ask）；未确认 ⇒ 不得放行；整页 ⇒ 转值 + 留痕 + 出 confirm 卡。 |
| MODIFY | `.../docs/v4-supersession-ledger.json` | 215 / 216 | **X-SGO-4/6/7 台账**（`xSgoLedgerLeaf2` + `redlineRemap[]`）+ `modifiedRanges` 本叶同步面 + `v55f-2-batch-consent` 叶段（leafBase `37e4e28`）+ 体积三值前移 + `V55F2-E-VOL-*` 取代条目。 |
| MODIFY | `.../test/supersession-ledger.test.ts` | 215 | `xSgoLeaf2Problems` + 叶2 X-SGO 判据 + 本叶受判文件 `modifiedRanges` 判据。 |
| MODIFY | `.../test/ui/law8-plaintext.mjs` | 215 | **⑨ 批量计划零明文**（计划行仅 `textContent` + 凭据形掩码；四面零命中；批量留痕零明文）+ 反证；⑧ 随 WIDEN 接线同步（二择后再读留痕）。 |
| MODIFY | `.../test/size-baseline.ts` | 216 | **A 列逐叶重登记**：基线 585,732 → **591,946**（五要素 + TIMELINE + `v55f-2-r2` 登记条目 + `v55f2R1R2Rows` + 桶和 + 累计归因）。 |
| MODIFY | `.../test/size-budget.test.ts` / `size-growth-evidence.test.ts` / `size-ruling-vol3.test.ts` | 216 | 数值重 pin（591,946 / 621,543 / 296,721 / 6,214）+ 最新一轮 rows 重指向 `v55f2R1R2Rows`（组数 33 → 34）。 |
| MODIFY | `.../test/gate-integrity.test.ts` | 216 | `V55F2_NODE_GATE_FILES`（`batch-consent`）+ `V55F2_W3_AUDITED_FILES` 下界声明 + 反证；`CHROMIUM_GATES === 9` 逐字不动。 |
| MODIFY | `.../docs/v4-density-baseline.json` | 216 | 密度登记 `registeredBaselineBytes` / `ceilingBytes` 与代码同源（591,946 / 621,543）。 |

> **NOOP（R2 显式登记）**: `packages/web-cli-base/**`（零 diff）· `src/content/**` · `dist/content.js` · `dist/pick-layer.js` · `manifest.json` · `src/security/policy.ts` / `auto-authorize.ts`（判定链）· `shared/op-table.ts`（`tierOf` 单源）· `requestTurn(`（仍恰 2）· `KIND_SET`（40 逐字）· `MAX_OPEN_ASKS`（2）/ `ASK_CANCEL_REASONS`（4）。

### 9.2 门禁终值（R2 收口，6 项 pin 闭环）

| 门禁 | R1 实测 | **R2 终值** | 结论 |
|---|---:|---:|---|
| `npm run typecheck` | 绿 | **绿** | 无类型错误 |
| `npm run build` | 绿 | **绿** | `sidepanel.js` = **591,946** / `background.js` = 1,635,675 |
| `npm test`（全部 node 门禁） | 1386（1380/6） | **1394（1394 / 0）** | **6 项体积/红线 pin 全部闭环**；+8 用例（213/214/215/216 只增） |
| `batch-consent`（新） | 7 / 0 | **7 / 0** | BC-1~7 全绿 |
| `test:supersession` | 40 / 0（除体积） | **42 / 0** | RL-06 扩批量变体在册；X-SGO 台账（215）落账（R2 新增叶2 台账 + `modifiedRanges` 两用例 ⇒ 40→42） |
| `op-three-tier` | 11 / 0 | **11 / 0** | `tierOf` 逐 op 不变；特权恒 gesture（**订正**：validate O-01 —— 实测 `grep -c '^test('` = 11；原文记 12/0） |
| `capability-wiring` | 11 / 0 | **11 / 0** | `.request(` 计数不减；批量不触达特权 op（**订正**：validate O-01 —— 实测 `grep -c '^test('` = 11；原文记 10/0） |
| `host-registry` | 绿 | **绿** | 零宿主 / 12 kind / `KIND_SET` 40 |
| `test:gate-integrity` | 20 / 0 | **20 / 0** | `V55F2_NODE_GATE_FILES ≥1`；`CHROMIUM_GATES === 9` |
| `test:law8`（法八四面） | 46 / 0 | **52 / 0**（+6） | 批量计划零明文 + 掩码；**零降级** |
| `test:dead-end` | 49 / 0 | **53 / 0**（+4） | ND-10 WIDEN 拒绝零死端；**只增** |
| `test:auth-chip` | 37 / 0 | **37 / 0** | 授权 chip 两态不变 |
| `test:ask-auth` | 78 / 0 | **78 / 0** | ask/auth 流入链路不变 |
| `test:stream` | 76 / 0 | **76 / 0** | 流模型不变 |
| `test:ui`（journey；保护段） | 171 / 0 | **171 / 0** | 保护段 `43054..58287` 零字节 |
| `test:binding`（保护段） | 192 / 0 | **192 / 0**（1 次 KL-N-10 flake ⇒ 隔离复跑 PASS） | 保护段 `107780..115930` 零字节 |
| `test:l0` / `l1` / `l2` | 248 / 131 / 74 | **248 / 131 / 74** | 计数不减 |
| `s0-self-driven`（Chromium） | 65 / 0 | **70 / 0**（+5） | S0′ 批量段 `S0P-B1~B3` |
| `test:insight` / `density` / `recommendation` / `zero-injection` / `page-input` / `l1-reverse` / `l2-reverse` / `onboarding` / `ref-pick-wiring` / `design-contract` / `hardening` | 绿 | **绿**（hardening 1 次环境 flake ⇒ 复跑 PASS） | 计数不减 |
| `e2e` | PASS | **PASS** | 4 产物真实全链 |
| `size-*` / `test:size-ruling-vol3` | **6 红**（登记滞后产物） | **全绿** | 逐叶重登记一次闭合 |
| 红线巡检 | — | **绿** | `content.js` 177,076 / sha `52a82620…`；`pick-layer.js` 34,358 / sha `77796bab…`；base 零 diff；`KIND_SET` 40；`requestTurn(` 2 |

### 9.3 体积五要素（R2 终值）

| 要素 | 值 |
|---|---|
| **① 前值 / 后值** | A 列（`sidepanel.js`）：`585,732 → 591,946 B`（**+6,214 B ≈ 6.07 KiB**，+1.06%）；B 列（`background.js`，**不计账**）：`1,627,424 → 1,635,675 B`（R1 +8,251 B；R2 无 SW src 改动） |
| **② 日期** | 2026-09-24（R1+R2 合并逐叶收口） |
| **③ 来源 / 命令 / 测量者** | `packages/web-cli-plugin/dist/sidepanel.js` / `npm run build`（esbuild `metafile: true` ⇒ `dist/build-meta.json`）/ SDDU Build Agent |
| **④ 理由（真实 metafile 逐模块归因）** | `SIDEPANEL_GROWTH_BREAKDOWN.v55f2R1R2Rows`：`sidepanel.ts` **+2,829** / `cards/auth.ts` **+2,113** / `l1/ref-scope.ts` **+532** / `stream-model.ts` **+455** / `chat-state.ts` **+285** ⇒ Σ **+6,214** + glue **0** == 登记增量 |
| **⑤ 历史保留** | `SIDEPANEL_BASELINE_BYTES_TIMELINE` / `SIDEPANEL_RE_REGISTRATIONS` **只追加**（新增 `v55f-2-r2` 条目；历史值逐字保留） |
| **预算对照（诚实登记）** | 本叶 A 列预算 **3.5~5.5 KB**（上界 +15% **4.0~6.3 KB**）⇒ 实测 **+6,214 B**：**越预算基线上界（5.5 KB）但未越 +15% 上界（6.3 KB）**，显式超出并登记（不删判据 / 不放宽容差） |
| **三值同源（V3-VOL-3）** | baseline **591,946** ∧ 档位 `ceilTo50KB(591,946)` = **614,400**（未动）∧ 绝对上限 **675,840**（未动）；生效上限 = `min(675,840, floor(591,946 × 1.05) = 621,543)`；`cap` 保持 `record-only` |
| **EC-SGO-022 二态（显式）** | 越生效上限（621,543）= **否**（591,946 < 621,543）· 越档位（614,400）= **否** · 越绝对上限（675,840）= **否** ⇒ 三分支均未触发 |
| **`authorConfirmation`** | 保持 **`pending-author-line`**（不伪称已确认） |
| **两叶 Σ 对照** | 叶1 **+7,109 B** + 本叶 **+6,214 B** = **+13,323 B ≈ 13.0 KiB**，落在正常口径 **9.5~14.5 KB**（+15% 16.7 KB）内；对照余量 **22,454 B**（614,400 − 591,946）⇒ **不触发升档** |

### 9.4 反证摘要（R2：注入 ⇒ 必红 ⇒ 还原 ⇒ PASS）

| 任务 | 注入点 | 期望 FAIL 模式 | 实测 |
|:--:|---|---|:--:|
| **213** | 把 `scopeWidenAuthorized = true` 注入 AI / SW 侧模块（合成 facts，on-disk 模拟） | 「AI / SW 侧模块不得有扩围授权写入面」 | ✅ FAIL → 还原（sha 复核）PASS（L9-9 反证） |
| **213** | 去掉「整页」真实点击守卫 / 加第二写入面 | 「扩围授权必须被真实点击值守卫」/「写入面恰一处」 | ✅ FAIL → 还原 PASS |
| **213** | **扩围未确认**（未点任何选项）却出 confirm 卡 / 放行 | 「未确认扩围 ⇒ 不得出 confirm 卡 / 不得放行」 | ✅ 判据承重（ND-10 FAIL 段：`hasCard ∧ authCard===0`） |
| **213** | 拒绝二择后仍继续写（fail-closed 失效） | WIDEN 拒绝 ⇒ 不写 + 可读理由 + 零死端 | ✅ ND-10（拒绝后 `authCard===0 ∧ carriers===0`） |
| **214** | 一次手势只放行 1 条 / 计划外不回落 / 计划内 <2 | 「S0P-B1」 | ✅ FAIL → 还原 PASS |
| **214** | 未授权却改写 > 引用数 / 授权读数错 | 「S0P-B2」 | ✅ FAIL → 还原 PASS（授权例外本身 ⇒ 绿） |
| **214** | 二择缺失 / 中止不可判 / 留痕格式坏 / 留痕含用户内容值 | 「S0P-B3」 | ✅ FAIL → 还原 PASS |
| **215** | AI 自填 authorized / 去掉「整页」守卫 / 第二写入面 | 「L9-9 AI 零写入面」 | ✅ FAIL → 还原 PASS |
| **215** | 计划行未掩码 / 注入含哨兵 payload | 「⑨ 批量计划零明文非恒真」 | ✅ 注入 ⇒ 命中 ⇒ 还原零命中 |
| **216** | 登记值与实测脱钩 / 桶和 / Σ ≠ 增量 / 越 1 B | 体积回归 + N-01/N-05 判据 | ✅ 全绿（6 pin 闭环） |

### 9.5 纪律与偏差登记（R2）

| 项 | 状态 |
|---|---|
| 红线⑥（consent 不得被 AI 代答） | ✅ WIDEN 二择仅由**真实点击**写入 `authorized`；AI / SW 零写入面（L9-9 on-disk 注入必红）；批量变体三类注入必红（R1） |
| 法八（页面文本可入载荷 / 凭据不可 / 审计零明文） | ✅ 批量计划行仅 `textContent` + `maskRefDigest` 掩码；`CardView.plan` 与 `payload` **同级**；批量留痕只记指纹摘要 + 计数 + 手势 + 结果；`law8` 52/0 **零降级** |
| 零新增载体 | ✅ 二择复用既有 `askuser`；`KIND_SET` 40 / 12 kind / `REGISTERED_STRUCTURAL_HOSTS === []` / `MAX_OPEN_ASKS = 2` / `ASK_CANCEL_REASONS` 4 逐字 |
| 计数只增 | ✅ `law8` 46→52 · `dead-end` 49→53 · `s0` 65→70 · `npm test` 1386→1394；`tierOf` 逐 op 不变；`.request(` 不减；`CHROMIUM_GATES === 9` |
| 门禁串行 + 日志 | ✅ 一次一个 Chromium；日志 `/tmp/opencode/v4-gate-logs/v55f-2-r2/` |
| `git add -A` | ✅ 未使用（按文件精确 stage） |
| **偏差登记 1（诚实）** | **A 列越预算基线上界**：实测 +6,214 B > 预算上界 5.5 KB，但未越 +15% 上界（6.3 KB）与任何体积上限；已显式登记（不删判据 / 不放宽容差），两叶 Σ 13.0 KiB 在正常口径内 |
| **偏差登记 2（flake）** | `binding` 与 `hardening` 各出现 **1 次环境性 flake**（CDP socket / 探测时序），按 `EC-SGO-021 / KL-N-10` **隔离复跑 ≥2 ⇒ PASS**；如实记录，不冒充零 flake |
| **偏差登记 3（人工面）** | S0′ M2（连点疲劳体感）/ M3（批量计划卡真机可读性 / 可否决性）= **`⏳ 未执行`**（headless 不可合成，不得冒充 PASS） |
| 受管 Provider | **零调用**（routing.v1 = `local_or_compute → none`） |

### 9.6 下一步

| 场景 | 操作 |
|------|------|
| **16 / 16 全部完成** | `npm test` 1394 / 0 · `e2e` PASS · 6 项 pin 闭环 · 三冻结面/base 零 diff |
| 审阅 | 运行 `@sddu-review specs-tree-v55f-2-batch-consent`（红线⑥ + 法八 + 授权语义） |
| 父收口 | 父 `specs-tree-web-cli-plugin-v55-f-scope-governance` 待两叶均收口后登记 ROADMAP |

---

## 10. review 微修（R1 审查 I-01~I-04）

> 触发：`review-report.md` R1 的 4 个**非阻塞**改进项（I-01 import 格式回归 / I-02 fallback 未显式分支 / I-03 死常量双声明 / I-04 终值登记精度）。**判据本体零改动、红线零触碰**：A 列（`sidepanel.js`）逐字节不变，改动仅落 B 列（`background.js`，不计账）+ 报告登记。

### 10.1 逐项处置

| # | 位置 | 处置 | 验证 |
|---|---|---|---|
| **I-01** | `src/ui/sidepanel/cards/index.ts:56` | 两条 import 由**并到一行**拆回**单行单语句**（`auth.js` / `ref.js` 各一行）——纯格式，零行为变更，与文件其余导入风格一致 | `tsc` 绿；重建后 `sidepanel.js` **591,946 不变**（esbuild 擦除语句分隔 ⇒ 零字节） |
| **I-02** | `src/security/confirm.ts:174` | `admitEntry` 的 `fallback` 走**独立分支**（与 `plan-consent` 解耦）：① 不挂计划渲染数据（计划外卡不再沿用「本批将写入」计划行）；② **不置 `planGate`** ⇒ 对该卡的同意 / 拒绝**不推进**整批计划审批状态（与主单条路径同口径）；③ 把 `verdict.message`（`BATCH_FALLBACK_TEXT`）并入上屏文案（deny 面不再只有通用理由）。**判据本体不改**：`admitEntry` 仍返回 `fallback`（计划外不自动放行，`BC-3` 承重不变） | `npm test` 1394/0；`supersession` 对 `planGate.markApproved()/markRejected()` 的唯一写入面断言仍绿；`batch-consent` 7/0 |
| **I-03** | `src/background/batch-plan.ts:40-41` | 删除**死导出** `BATCH_RENDER_MAX = 8`（全仓无引用），展示上限**单源**保留于 `cards/auth.ts` 的 `AUTH_PLAN_RENDER_MAX = 8`（PD-SGO-007 8 行上限语义**保留一处**）；`batch-plan.ts` 落 B 列 ⇒ A 列零字节 | 全仓 `grep BATCH_RENDER_MAX` = **0**；`tsc` 绿；`size-*` 全绿（A 列不变） |
| **I-04** | `build.md` §9.2 / §9.3 | (a) §9.2 `test:supersession` R2 终值 **40/0 → 42/0**（补注 R2 新增叶2 台账 + `modifiedRanges` 两用例 40→42）；(b) §9.3「EC-SGO-022 二态」行生效上限 **615,018 → 621,543**（与同表公式 `min(675,840, floor(591,946×1.05))` 及 §9.3 生效上限行统一）。**零代码 / 零门禁改动** | `grep -c '^test(' supersession-ledger.test.ts` = **42**；`npm run test:supersession` = **42/0** |

### 10.2 复跑与体积

| 项 | 结果 |
|---|---|
| `npm run typecheck` | **0**（绿） |
| `npm test`（node 全量） | **1394 / 0**（= R2 基线，**只增不减**；无新增 / 无删除用例） |
| `test:supersession` | **42 / 0**（与 I-04 订正一致） |
| A 列 `sidepanel.js` | **591,946 B — 不变**（I-01 纯格式 / I-03 落 B 列 ⇒ A 列零字节）⇒ **五要素无需重登记**（生效上限 621,543 / 档位 614,400 / 绝对上限 675,840 / `pending-author-line` 均不动） |
| B 列 `background.js` | **1,635,675 → 1,635,850 B**（**+175 B**，I-02 显式分支；不计账） |
| 三冻结面 | `content.js` **177,076 / sha `52a82620…`** · `pick-layer.js` **34,358 / sha `77796bab…`** 逐字节不变 |

日志：`/tmp/opencode/v4-gate-logs/v55f-2-fix/`（`typecheck.log` / `build.log` / `npm-test.log` / `supersession.log`）。

### 10.3 下一步

I-01~I-04 已在 review → validate 之间闭环，均为**非阻塞**项；A 列零字节、判据本体零改动 ⇒ 不触发新轮次，直接交 validate。


---

# 构建报告 v3.0（v55f-2 **收口段**：N 项归并 + 终态对账）

> **文档定位**: SDDU 收口记录 —— 本叶 7 阶段流水线（build → review → validate 全通过）之后的**收口轮**：N 项归并登记 + 终态对账 + 交付物清单 + 移交项。**零产品代码改动**（`.sddu` 外零触碰）。
> **输入**: `review-report.md` v1.0（R1；36 Cx / **0 BLOCK** / 4 I / **5 O**）+ `validate-report.md` v1.0（R1；V1~V9 全绿 / 0 阻塞 / 1 无法执行 / **N-01 + O-01~O-04**）+ 本叶 build.md v1.0~v2.1（偏差登记 1~3）+ §10（review 微修 I-01~I-04）+ 父 `plan.md` §8 / `ADR-SGO-004/005/006/007`（体积分列预算）
> **版本**: v3.0（本叶 **close 终态**）
> **更新时间**: 2026-09-24
> **更新说明**: 收口轮 —— review **O-01~O-05**（5 项）+ validate **N-01 + O-01~O-04**（5 项）去重归并为 **N-01~N-10** 并逐条标注 owner（**本叶收口 / 父收口 / 人工面**）；**validate O-01 顺手订正落地**（§9.2 `op-three-tier` R2 终值 **12/0 → 11/0** · `capability-wiring` R2 终值 **10/0 → 11/0**；同族 §4 R1 基线/实测列一并订正为 10/0→11/0 · 10/0→11/0）；终态对账（任务 **16/16** · `npm test` **1375 → 1394 / 0** · 体积 **585,732 → 591,946 B（+6,214）** · 三冻结面零 diff · **X-SGO-4 已发生**）

## 11. 终态快照（close 基线）

| 项 | 终态读值（收口轮取自 build + review + validate 产物实测值） |
|---|---|
| 分支 / HEAD | `feature/web-cli-plugin` / **`c0bac99`**（本叶最后提交 = validate；review I-01~I-04 微修轮） |
| 任务 | **16 / 16 completed**（W1~W3；TASK-V55F-201~216；S×1 / M×13 / L×2） |
| 门禁（新增） | **1 枚新 node 门禁**：`batch-consent` **7/0**（BC-1~7）；`s0-self-driven` Chromium 面 **65 → 70/0**（`S0C-11` / `S0P-C6`，只加断言）；`s0-self-driven-chain` node 面 **24 → 27/0**（`S0P-B1~B3`）；`law9-scope-reading` **12 → 14/0**（`L9-9` 扩围）；`batch-consent` 纳入 `EXPECTED_AUDITED_FILES`（`gate-integrity` **20 → 22/0**）；**`CHROMIUM_GATES === 9` 逐字不动** |
| `npm test`（node） | **1375 → 1394 / 0**（+19，只增不减；R1 +11 / R2 +8） |
| 体积 | `dist/sidepanel.js` **585,732 → 591,946 B（+6,214 ≈ 6.07 KiB）**（A 列计账）；**越预算基线上界 5.5 KB，未越 +15% 上界 6.3 KB** ⇒ **显式诚实登记**（不删判据 / 不放宽容差）；B 列 `background.js` **1,627,424 → 1,635,850 B**（R1 +8,251 / 微修 +175，**不计账**） |
| 生效上限 / 档位 / 绝对上限 | 生效上限 = `min(675,840, floor(591,946 × 1.05) = 621,543)` = **621,543 B**；档位 **614,400 B**（未动）；绝对上限 **675,840 B**（未动）；`authorConfirmation` = **`pending-author-line`**（**不伪称已确认**） |
| 逐模块归因 | `SIDEPANEL_GROWTH_BREAKDOWN.v55f2R1R2Rows`：`sidepanel.ts` +2,829 · `cards/auth.ts` +2,113 · `l1/ref-scope.ts` +532 · `stream-model.ts` +455 · `chat-state.ts` +285 ⇒ Σ **+6,214** + glue **0** == **+6,214** |
| 两叶 Σ | 叶1 **+7,109** + 叶2 **+6,214** = **+13,323 B ≈ 13.0 KiB**（父 `plan.md` §8 正常口径 **9.5~14.5 KB**，+15% 16.7 KB ⇒ 内） |
| 冻结面（dist） | `dist/content.js` **177,076 B / sha `52a82620…b5f6`**、`dist/pick-layer.js` **34,358 B / sha `77796bab…575e`** —— **逐字节零 diff** |
| 源码 / 不动面 | `packages/web-cli-base/**` · `manifest.json` · `src/content/**` · `security/policy.ts` · `security/auto-authorize.ts` · `shared/op-table.ts`（`tierOf` 单源）· `chat-runner.ts` —— **全零 diff**；`KIND_SET` **40** · `requestTurn(` **恰 2** · `CARD_TYPES` **12** ∧ 零宿主 · `MAX_OPEN_ASKS` **2** · `ASK_CANCEL_REASONS` **4** · 特权 op 恰 2 恒 `gesture` |
| 取代台账（本叶段） | `docs/v4-supersession-ledger.json#xSgoLedgerLeaf2`：**X-SGO-4 = superseded（已发生）** + X-SGO-6/7 = no-supersession（读数承载 / 未发生）；`redlineRemap[]` 三条（RL-06 / OT-⑩ / law8「**扩覆盖非替换**」）+ 叶2 段 `leafBase 37e4e28` + 14 项 `modifiedRanges`；`test:supersession` **39 → 42/0** |
| S0′ 批量段 | node `s0-self-driven-chain` **27/0**（`S0P-B1~B3` 正读 + 5 反证）· Chromium `s0-self-driven` **70/0**（`S0P-C6`：一条 `confirm-request{plan}` ⇒ 单张 auth 卡 N 行 ∧ 一次手势 ⇒ `batch.gesture=user ∧ batch.results=N/N` 零明文 ∧ 二择走既有 `askuser`）；样本单源 `test/ui/fixtures/s0-chain.mjs` |
| 安全边界（R-SGO-001，唯一红线级） | 亲注入 **5 处**全部「红 ⇒ 逐字节还原 ⇒ sha 相同 ⇒ 复绿」：① AI 侧 `markApproved(` ⇒ `RL-06 扩批量` 1 红；② `op.authorize` 入计划模块 ⇒ `capability-wiring` 1 红；③ `planEntryKey` 归一化 ⇒ `BC-2` 1 红；④ `admitEntry` 计划外放行 ⇒ `BC-3` 1 红；⑤ 去 WIDEN「整页」点击守卫 ⇒ `L9-9` 2 红 |
| 保护段 | `journey` **171 PASS**（`43054..58287` / sha `cc79f413…`）· `binding` **192 PASS**（`107780..115930` / sha `be9ad0e9…`）—— **保段**（两文件 `git diff` 零命中） |
| 流水线结论 | review **✅ 通过**（R1：36 Cx / 0 BLOCK / 4 I → `c0bac99` 微修闭环 / 5 O）· validate **✅ 通过**（V1~V9 全绿；**0 阻塞 / 1 无法执行（人工面 M2/M3）**；FR 承载切片 21/21） |

## 12. 交付物清单（本叶足迹；`git diff 6b9b982..c0bac99` 实测）

**非 `.sddu` 变更面（28 文件 = 新增 2 + 修改 26）**

| 操作 | 数量 | 文件 |
|:--:|:--:|---|
| **NEW（源码 1）** | 1 | `src/background/batch-plan.ts`（B 列：`buildPlan` / `planFingerprint` / `admitEntry` / `createBatchConsent` 单例） |
| **NEW（门禁 1）** | 1 | `test/batch-consent.test.ts`（BC-1~7，新 node 门禁） |
| **MODIFY（源码 10）** | 10 | `src/background/messaging.ts` · `service-worker.ts` · `src/security/{confirm,audit-sink}.ts` · `src/ui/sidepanel/{sidepanel,stream-model,chat-state}.ts` · `src/ui/sidepanel/cards/{auth,index}.ts` · `src/ui/sidepanel/l1/ref-scope.ts` |
| **MODIFY（门禁 / fixture / 台账 16）** | 16 | `test/{supersession-ledger,op-three-tier,capability-wiring,gate-integrity,law9-scope-reading,s0-self-driven-chain,size-baseline,size-budget,size-growth-evidence,size-ruling-vol3}.test.ts` + `test/ui/{s0-self-driven,law8-plaintext,no-dead-end}.mjs` + `test/ui/fixtures/s0-chain.mjs` + `docs/{v4-supersession-ledger,v4-density-baseline}.json` |

> 统计口径：**28 文件 = 新增 2（源码 1 + 门禁 1）+ 修改 26（源码 10 + 门禁/fixture 14 + 台账 2）**；`git diff --name-only 6b9b982..c0bac99 -- . ':(exclude).sddu/**'` 合计 **28**（`.sddu` 另行 10）。
> **SDDU 产物（`.sddu` 内）**：`spec.md` · `plan.md` · `tasks.md` · `tasks.json` · `build.md`（本收口段）· `review.md` · `review-report.md` · `validate.md` · `validate-report.md` · `state.json` · `TREE.md`。

## 13. N 项归并登记（review O-01~O-05 + validate N-01/O-01~O-04 → N-01~N-10）

> **归并口径**：review **O 5 项**（O-01~O-05）→ 主体；validate **N-01 + O-01~O-04**（5 项）→ 主体；本叶 build **偏差登记 1~3** + §10 微修 去重并入（同源合并为一行）。**来源覆盖 = 全部逐条可回溯**（review O-03 ≡ I-02 余项；review O-05 ≡ build 偏差 1 的单位口径面；validate N-01 ≡ build 偏差 2 同族）。

| 统一编号 | 来源 | 类型 / 严重度 | 内容摘要 | owner | 处置 |
|:--:|:--:|:--:|---|---|---|
| **N-01** | validate O-01 + build §9.2/§4 | 登记精度 / 低 | `build.md` §9.2（R2 终值）与 §4（R1 基线/实测）两处读数与实测不符：`op-three-tier` 记 **12/0**（实测 **11/0**）、`capability-wiring` 记 **10/0**（实测 **11/0**）；`grep -c '^test('` 实测 11 / 11，门禁实跑 11/0 · 11/0 | **本叶收口**（**本轮订正**） | 已订正（§9.2 两格 + 同族 §4 两行）为 **11/0 · 11/0**（基线 10/0 ∧ R1 +1）；**零代码 / 零判据影响**（`review-report` §0 早已按 11/0 · 11/0 如实记录） |
| **N-02** | review O-01 | 估算口径 / 低 | `plan.md` §5.1/§5.2 文件影响清单为「≈11 项」估算；实产含清单未列的 `messaging.ts`（type-only wire）/ `audit-sink.ts` / `stream-model.ts` / `cards/index.ts` / `law9-scope-reading.test.ts` / `s0-self-driven-chain.test.ts`。均为 plan 已声明的**意图面**（type-only 载体 / 渲染字段 / 断言只增），属估算口径，非架构偏离 | **父收口** | 登记估算口径；实产清单以 §12 为准 |
| **N-03** | review O-02 | 判据完备性 / 低 | `test/supersession-ledger.test.ts#BULK_CONSENT_AI_MODULES` 的「AI/SW 零写入面」判据为**列表式**（恰 4 个 AI/LLM 模块）；新增 AI 模块不会自动纳入。当前由「`markApproved/markRejected` 全仓**唯一**调用点为 `confirm.ts`」的结构事实兜底 | **父收口** | 登记完备性边界（风险可控，结构化兜底在外）；不改判据 |
| **N-04** | review O-03（≡ I-02 余项） | 可读性 / 低 | `BATCH_REJECTED_TEXT` / `BATCH_DRIFT_TEXT` / `BATCH_FALLBACK_TEXT` 三文案**未上屏**（deny 面仅通用理由，除 I-02 已修的 fallback 面上屏外）；`EC-SGO-014`「显式失败」由 `deny` 满足（非静默放行），但用户看不到「漂移 / 已拒绝」的具体原因 | **父收口**（deferred） | 登记为可读性余项（I-02 已修 fallback 面）；后续轮次可选强化 |
| **N-05** | review O-04 | 测试覆盖 / 低 | fallback **经 `confirm.ts` 桥的端到端路径**无专用用例（`BC-3` 只直测 `admitEntry`；桥侧由 Chromium `S0P-C6` 的「一条 `confirm-request{plan}`」间接覆盖）。 | **父收口**（deferred） | 登记测试覆盖缺位；建议后续补「计划外写经桥 ⇒ 出一张卡且不复用已批准」用例（I-02 后行为已由 validate V5 探针 4/4 实测） |
| **N-06** | review O-05 + build 偏差 1 | 登记口径 / 低 | 体积单位口径混用（预算用十进制 KB：3.5~5.5 / 4.0~6.3；增量描述用 KiB：+3.22 / +6.07 KiB）—— 数值与结论自洽（6,214 B < 6,325 B），仅建议注明单位口径 | **父收口** | 登记单位口径（父总账统一以 **B + KiB** 双列）；不改判据 |
| **N-07** | validate N-01 + build 偏差 2 | 环境性 flake / 低 | **环境性 flake 家族（KL-N-10）**：`test/ui/binding.mjs` 首跑阶段 1 `#8d/#8e` 处 `selector not found: #confirm-allow` + 诊断落盘 `CDP socket not open`（与 leaf1 `page-input` / `ask-auth` 同族）；`binding.mjs` **不在本叶变更面**（`git diff` 零命中）⇒ 清理陈旧 `/tmp/web-cli-*` fixture 后**隔离复跑 192/0 PASS** | **父收口** | 登记为环境性 flake 家族（并入 F-34 段统一条目；保段凭据 = `supersession` 42/0 + 保护段 sha 双命中）；**不伪称首跑绿** |
| **N-08** | validate O-02 | 工具口径 / 低 | 采用编排器指定固定脚本目录（`/tmp/opencode/v4-gate-logs/v55f-2-validate/`）而非模板默认时间戳目录 | **父收口** | 与 v55f-1 / v5-2 等前例一致；脚本与日志同目录，可回溯；登记 |
| **N-09** | validate O-03 | 安全兜底 / 信息 | 桥层「指纹漂移」经由桥**不可直接触达**（`planEntryOf` 由**当前** refs 重推导 ⇒ 目标不可解析时 `entry` 为空 ⇒ 回落普通单条卡 = 需新鲜手势，仍 fail-closed）；`drift` 仅在 `admitEntry` 层可达（`BC-4` 已覆盖） | **父收口** | 登记为结构性**安全兜底**（不是缺陷）；已由 validate V3 探针第 ③ 组实测（出普通单条卡、`plan===undefined`） |
| **N-10** | validate O-04（无法执行项） | 人工面 / ⏳ | 人工面 **2 项** `⏳ 未执行`（headless 不可合成）：**M2** 42 连点疲劳体感（本 Feature 直接对标 `ty.md` 42 张卡的根因场景）· **M3** 批量计划卡真机可读性与可否决性 | **人工面** | 移交：待真机人工验收；**不冒充 PASS**（父 `AC-SGO-026`） |

**已闭环（不入 N 编号，仅备查）**：review **I-01**（`cards/index.ts:56` 两条 import 并行的格式回归）→ **`c0bac99` 微修闭环**（拆回单行）；review **I-02**（`confirm.ts` `fallback` 未显式分支 ⇒ 文案未上屏 / 累计划行 / `planGate` 推进）→ **`c0bac99` 微修闭环**（独立分支 + `BATCH_FALLBACK_TEXT` 上屏 + 不推进 `planGate`，validate V5 探针 **4/4** 实测）；review **I-03**（`BATCH_RENDER_MAX` 死常量双声明）→ **`c0bac99` 微修闭环**（删除，展示上限单源保留 `AUTH_PLAN_RENDER_MAX`）；review **I-04**（`build.md` R2 终值登记两小点）→ **`c0bac99` 微修闭环**（supersession 42/0 · 生效上限 621,543）。

**owner 分布**：**父收口 = 8**（N-02 / 03 / 04 / 05 / 06 / 07 / 08 / 09）· **本叶收口 = 1**（N-01，本轮订正落地）· **人工面 = 1**（N-10）。
**严重度分布**：阻塞 **0** · 高 **0** · 低 / 信息 **10**（全部为登记项，**均不阻塞**）。

## 14. 终态对账

| 对账项 | 要求 | 终态实测 | 判定 |
|---|---|---|:--:|
| 任务 | 16 / 16 | **16 / 16 completed**（`TASK-V55F-201~216`；W1~W3） | ✅ |
| 门禁（新） | 新增 ∧ 只增 | **1 枚新 node 门禁**（`batch-consent` 7/0）+ `s0-self-driven` Chromium **65 → 70/0** + `s0-self-driven-chain` node **24 → 27/0** + `law9-scope-reading` **12 → 14/0**；`gate-integrity` **22/0**；`CHROMIUM_GATES === 9` 逐字 | ✅ |
| `npm test` | 只增不减 | **1375 → 1394 / 0**（+19）；validate 亲跑 1394/1394/0 | ✅ |
| 体积 | 登记 ∧ 诚实 ∧ 未触 EC | **585,732 → 591,946 B（+6,214 ≈ 6.07 KiB）**；越预算基线上界 5.5 KB **显式登记** / 未越 +15% 上界 6.3 KB；生效上限 **621,543**；档位 **614,400** / 绝对上限 **675,840** 未跨；EC-SGO-022 三分支未触发；`pending-author-line` | ✅（越上界已显式登记） |
| 三冻结面 | 零 diff | `content.js` **177,076 B / sha `52a82620…`** · `pick-layer.js` **34,358 B / sha `77796bab…`** **逐字节零 diff**；`sidepanel.js` **591,946 B** = 登记基线 | ✅ |
| 载体不受撞 | `KIND_SET` 40 / `requestTurn(` 2 / 12 kind / 零宿主 | `KIND_SET` **40 逐字**（`question.plan` 为 type-only 扩展字段，非 kind）· `requestTurn(` **恰 2** · `CARD_TYPES` **12** · 零宿主 · `MAX_OPEN_ASKS` 2 · `ASK_CANCEL_REASONS` 4 · 特权恰 2 恒 `gesture` | ✅ |
| 取代台账 | X-SGO-4 已发生 ∧ 6/7 如实 | `xSgoLedgerLeaf2`（X-SGO-4 superseded + 6/7 no-supersession）+ `redlineRemap[]` 三条（扩覆盖非替换）+ 14 项 `modifiedRanges`；`test:supersession` **42/0** | ✅ |
| S0′ 批量段 | 核心断言承重 | node **27/0** + Chromium **70/0**；`S0P-B1~B3` 正读 + 5 反证必红；`S0P-C6` 单卡 N 行 ∧ 一次手势 `results=N/N` ∧ 二择走 `askuser` | ✅ |
| 安全边界（R-SGO-001） | 亲注入承重 | 5 处注入全部「红 ⇒ sha 逐字节还原 ⇒ 复绿」（AI 代答 / 特权入批 / 归一化 / 计划外放行 / 去 WIDEN 守卫）；`scopeWidenAuthorized = true` 全仓**恰 1 处** ∧ 真实点击守卫 | ✅ |
| 保护段 | 保段 | `journey` **171 PASS** · `binding` **192 PASS**（flake 由 `supersession` 42/0 + 保护段 sha 双命中兜底） | ✅ |
| 规格漂移 | spec 零 diff | `git diff 850ae82..c0bac99 -- <leaf>/spec.md` = **0 命中**（spec 零改动） | ✅ |
| ROADMAP | 零 diff（父收口统一登记） | `git diff 6b9b982..c0bac99 -- .sddu/specs-tree-root/ROADMAP.md` = **0** | ✅ |
| 红线路径 | 零命中 | 28 变更文件中**禁令路径命中 0**（`packages/web-cli-base/**` / `src/content/**` / `manifest.json` / `dist/content.js` / `dist/pick-layer.js` / `policy.ts` / `auto-authorize.ts` / `op-table.ts` / `ROADMAP.md`） | ✅ |
| `.sddu` 外触碰 | 收口轮零产品改动 | 收口轮仅改 `.sddu/**`（`build.md` / `state.json` / `TREE.md`）；产品源码零字节 | ✅ |

## 15. 移交项（handover）

| 移交对象 | 项 | 交接要点 |
|---|---|---|
| **父收口**（F-34 closeout） | **N-02~N-09**（除 N-01 / N-10） | ① plan 估算口径 / `BULK_CONSENT_AI_MODULES` 列表式 / 三文案可读性余项 / fallback 桥端到端用例缺位 / 体积单位口径 / 工具目录 / 桥层漂移兜底 —— 逐条**登记**（不改判据）；② **N-07 环境性 flake 家族**（binding；并入 F-34 段统一条目；保段凭据 = `supersession` 42/0 + 保护段 sha 双命中）；③ 叶累计体积 **+6,214 B**（越预算基线上界、未越 +15% 上界，显式登记）并入父总账；④ **X-SGO-4 已发生**（红线⑥ 扩覆盖批量）并入父取代台账终态；⑤ ROADMAP F-34 / v0.11.1 统一登记 |
| **人工面** | **N-10** | M2 42 连点疲劳体感（对标 `ty.md` 根因场景）+ M3 批量计划卡真机可读性与可否决性 = **⏳ 未执行**（headless 不可合成，**不冒充 PASS**）；并列 v5 / v5.5 / 叶1 人工面清单 |
| **叶1（v55f-1）** | — | 硬依赖已在叶1 validated 后满足；叶1 N-01（`authorized` 恒值）由本叶 WIDEN 二择落地**闭环**（`scopeWidenAuthorized = true` 真实点击守卫 + `L9-9` / `ND-10` 判据承重） |
| **本叶（v55f-2）** | **N-01** | build.md 两处读数订正已在**本轮落地**（§9.2 + §4）；review I-01~I-04 已由 `c0bac99` 微修闭环；**无遗留指向本叶的动作** |

## 16. 对账订正（不静默）

1. **测试计数基线链**：`1375`（叶1 终值）→ `1386`（R1，提交后 1380/6）→ **`1394`（R2 终值）** → **`1394`（微修后不变）**；收口轮不改代码 ⇒ 终态口径 = `1394/0`（validate 亲跑同源）。
2. **体积终态口径**：R1 **589,033**（+3,301）→ R2 **591,946**（累计 +6,214）；越预算基线上界已显式登记（§9.5 偏差 1）；生效上限 **621,543**；档位 / 绝对上限**未动**（未跨档位）。
3. **两处读数订正（N-01，本轮落地）**：§9.2 R2 终值 `op-three-tier` **12/0 → 11/0**、`capability-wiring` **10/0 → 11/0**；同族 §4 R1 基线/实测 `op-three-tier` **11/0·12/0 → 10/0·11/0**、`capability-wiring` **9/0·10/0 → 10/0·11/0**（实测 `grep -c '^test('` = 11 / 11）；**零代码 / 零判据影响**。
4. **文件统计口径**：以 §12 的 `git diff 6b9b982..c0bac99` 实测为准 —— **28 = 新增 2 + 修改 26**（`.sddu` 另行 10）。
5. **`state.json` 终态确认**：本叶 `phase = validated` / `status = completed`（**归一**：原 `status: tracked` 与 `phase: validated` 不一致 ⇒ 本轮订正为 `completed`，与叶1 及父 children 镜像同源）；本轮追加 `closeout` 记录与 `phaseHistory` 一条**收口记录**（agent `sddu-build`，artifact = 本收口段）。

## 修订记录（v3.0）

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v3.0 | **收口段**（review O-01~O-05 + validate N-01/O-01~O-04 → **N-01~N-10** 归并 + owner 分布（父收口 8 / 本叶收口 1 / 人工面 1）· 终态快照 · 交付物清单 · 终态对账 13 项 · 移交项 · 对账订正 5 条；**含 validate O-01 订正落地**（§9.2 + §4 两处读数 → 11/0 · 11/0）；零产品代码改动，`.sddu` 外零触碰） | 2026-09-24 | SDDU Build Agent |


