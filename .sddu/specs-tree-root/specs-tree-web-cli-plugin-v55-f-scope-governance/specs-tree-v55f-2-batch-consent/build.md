# 构建报告：specs-tree-v55f-2-batch-consent（V5.5F-2 任务级批量授权）

> **文档定位**: SDDU 构建报告 — 记录本叶**第一轮**（**R1 = W1 + W2**，`TASK-V55F-201~212`）的文件变更、实现结果与门禁读值，作为 review 的输入
> **前置依赖**: 本叶 `tasks.md` / `tasks.json`（16 任务 / 3 波）、本叶 `plan.md` v1.0、父 `plan.md` + `ADR-SGO-004/005`（另读 006/007 做落点判定）、叶1 `specs-tree-v55f-1-ref-context-and-anchor`（**validated**，硬依赖已满足）
> **创建人**: SDDU Build Agent
> **创建时间**: 2026-09-24
> **版本**: v1.0（**R1 = W1 + W2，12 / 16**；W3 留 R2）
> **更新人**: SDDU Build Agent
> **更新时间**: 2026-09-24
> **更新说明**: 初始创建（**R1 = W1+W2**）：边界先行（RL-06 / OT-⑩ 扩批量变体注入必红 + 特权 op 不入批机核 + 载体零新增 + `batch-consent` 门禁 BC-1~7）→ 计划/指纹/准入/回落/漂移/零明文/中止。**W3（`TASK-V55F-213~216`：WIDEN 二择 / S0′ 批量段 / X 台账 / 体积逐叶收口）留 R2。**

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
| TASK-V55F-213 | WIDEN 二择接线 + `out-of-scope-authorized` 转值 + 批量留痕 | M | ⏳ **留 R2（W3）** | FR-SGO-060~063 / 081 / 082 |
| TASK-V55F-214 | S0′ 批量段（S0P-B1~B3） | L | ⏳ **留 R2（W3）** | FR-SGO-093 |
| TASK-V55F-215 | X-SGO-4/6/7 台账 + 法八批量零明文只增 | M | ⏳ **留 R2（W3）** | FR-SGO-103 / 105 / 107 |
| TASK-V55F-216 | 体积本叶重登记 + 本叶收口 | M | ⏳ **留 R2（W3）** | FR-SGO-120~125 |

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
| `op-three-tier` | 11 / 0 | **12 / 0** | `tierOf` 逐 op 不变；特权恒 gesture |
| `capability-wiring` | 9 / 0 | **10 / 0** | `.request(` 计数不减（SW 0 / helper ≥1） |
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
