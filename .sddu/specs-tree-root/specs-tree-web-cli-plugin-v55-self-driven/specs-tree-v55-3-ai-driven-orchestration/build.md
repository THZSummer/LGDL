# 构建报告：specs-tree-v55-3-ai-driven-orchestration（V5.5-3 主题② AI 驱动编排 · **R1 = W1+W2**）

> **文档定位**: SDDU 构建报告 — 记录全部任务的文件变更和实现结果，作为 review 阶段的输入  
> **前置依赖**: `tasks.md`（20 任务 / 5 波）、`tasks.json`、本叶 `plan.md` v1.0、父 `../plan.md` + `ADR-V55-008/009/010/011/012`、前置叶 `v55-1` / `v55-2`（全绿）  
> **创建人**: SDDU Build Agent  
> **创建时间**: 2026-09-23  
> **版本**: v1.0（**R1 中间构建报告**：W1+W2 = TASK-V55-301~307；W3~W5 留 R2）  
> **更新人**: SDDU Build Agent  
> **更新时间**: 2026-09-23  
> **更新说明**: 初始创建（派生式三档清分 + SG-V55-03 结论 + `pressCandidate` 载体 + AI 自动成回合（`requestTurn` 仍恰 2）+ 逐档反证 + 判定链零触碰；R1 体积中间登记）

---

## 0. R1 范围与基线

| 项 | 值 |
|---|---|
| 本轮范围 | **W1 + W2**：`TASK-V55-301`（SG-V55-03 探针）· `302`（`tierOf` + 物化表）· `303`（三档清分门禁）· `304`（`capability-wiring` / `sw-op-mirror` 等价重锚）· `305`（`ai-drive.ts`）· `306`（`op.turn` 槽复用 + 分支 A 端到端）· `307`（逐档反证 + 判定链零触碰） |
| 未做（留 R2） | W3 仲裁（`TURN_QUEUE_MAX=1` + 草稿回填）· W4 护栏六常量 + 留痕 + 关断否决 · W5 共享面收口（`journey`/`binding` 保护段 / 台账收口 / 体积终轮 T319 / 全门禁 T320） |
| 起点 | 分支 `feature/web-cli-plugin`，HEAD `69133ad`（v55-2 收口） |
| 入线基线 | `npm test` **1283 / 0**；`dist/sidepanel.js` **563,780 B**；生效上限 591,969 / 档位 614,400 / 绝对上限 675,840；`dist/content.js` 177,076 B；`dist/pick-layer.js` 34,358 B |
| 出线 | `npm test` **1299 / 0**（+16）；`dist/sidepanel.js` **566,535 B**（+2,755 / +0.49%）；档位 / 绝对上限 / `pending-author-line` **均未动** |

---

## 1. 构建概要

| 维度 | 数值 |
|------|:--:|
| 完成任务数 | **7 / 7**（本轮 W1+W2；全叶 20 任务） |
| 复杂度分布 | S×1（301） / M×4（302 / 304 / 305 / 307） / L×2（303 / 306） |
| 新增文件 | **2** 个（`ai-drive.ts` / `op-three-tier.test.ts`） |
| 修改文件 | **11** 个（src 2 / test 7 / docs 2） |
| 新增判据（node 用例） | **+16**（1283 → 1299） |
| 新增门禁文件 | 1（`test/op-three-tier.test.ts`，10 用例；W5 T320 纳入受审集合） |

---

## 2. 文件变更

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/ai-drive.ts` | TASK-V55-305/306 | `pressCandidate` **唯一自动按下点** + `pressDecision` 档位判定 + `driverClass` 权限矩阵 + `driverTraceLine` 留痕三要素 |
| NEW | `packages/web-cli-plugin/test/op-three-tier.test.ts` | TASK-V55-303/307 | 三档清分机核 10 用例（5/2/2 + 成员集逐字 + 特权恒 `gesture` + 与 `IMPL` 逐字段一致 + `auto` 零三表写入 + 新 op 归档 + 逐档反证 + 判定链零 diff） |
| MODIFY | `packages/web-cli-plugin/src/shared/op-table.ts` | TASK-V55-302 | `OpDescriptor.hasConsent`（consent 存在性提升为描述符字段）+ `OP_TIERS` / `tierOf`（**派生式**）+ 物化 `OP_TIER_TABLE` + `tierOfId`；**零新增 op** |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` | TASK-V55-306 | `driveAnsweredTurn()` 接线（`nextAfterSettle` 的 `answered` 分支 + 回合结束续流点）；经 **既有** `op.turn` 槽 ⇒ `requestTurn(` **仍恰 2** |
| MODIFY | `packages/web-cli-plugin/test/op-wiring.test.ts` | TASK-V55-306 | `OP-W⑦` 三段：自动按下点恰 1 / `requestTurn` 仍恰 2 / `nextAfterSettle` 调用点钉死（1 def + 10 calls）+ 分支 A 端到端 + 逐档拒绝 |
| MODIFY | `packages/web-cli-plugin/test/capability-wiring.test.ts` | TASK-V55-304 | 三档等价重锚（特权集 == `gesture` 档 ∧ `.request(` 计数不减 ∧ AI 自动执行特权 op 必红）；既有两条断言逐字保留 |
| MODIFY | `packages/web-cli-plugin/test/sw-op-mirror.test.ts` | TASK-V55-304 | `SW-M⑤` 三档加固 + 漂移反证锚点随 `hasConsent` 5 元组**等价重锚** |
| MODIFY | `packages/web-cli-plugin/test/size-baseline.ts` | R1 体积中间登记 | 基线 563,780 → **566,535**；TIMELINE / RE_REGISTRATIONS(`v55-3-r1`) / GROWTH_BREAKDOWN(`v553R1Rows` + glue 49) / `rows` 三值 / 输入模块数 90 → 91 |
| MODIFY | `packages/web-cli-plugin/test/size-budget.test.ts` · `size-growth-evidence.test.ts` · `size-ruling-vol3.test.ts` | R1 体积中间登记 | 生效上限 591,969 → **594,861**、基线 / Δ / 「最新一轮 rows」/ N-05 组数 29 → 30 同编号重 pin |
| MODIFY | `packages/web-cli-plugin/docs/v4-density-baseline.json` | R1 体积中间登记 | `volume` 段：`registeredBaselineBytes` 566,535 / `ceilingBytes` 594,861 / `effectiveCeilingRule` 与 `directionalAlert` 追补（31 格与阈值**逐字不动**） |
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` | R1 体积中间登记 + 换锚 | `v3Vol3Closeout.⑤` `newBaselineBytes` 同源前移；61 条 v4 条目 `newTitle` **换锚**（断言零删减）；`specs-tree-v5-3-chrome-face` / `r4-selector-fix` 叶段 scope + 逐字登记追补 |

**红线复核**：`dist/content.js` **177,076 B**（sha `52a82620…`）与 `dist/pick-layer.js` **34,358 B** **逐字节不变**；`manifest.json` / `KIND_SET` / `src/content/**` / `ROADMAP.md` / `design/**` 零 diff。

---

## 3. 任务完成清单

| 任务 | 名称 | 复杂度 | 状态 | 对应 FR |
|------|------|:--:|:--:|------|
| TASK-V55-301 | **SG-V55-03** 派生式清分可得性探针 | S | ✅ completed（探针已删除，不落版本库） | FR-SELF-080/086 |
| TASK-V55-302 | `op-table.ts` `tierOf` + 物化 `OP_TIER_TABLE` | M | ✅ completed | FR-SELF-080 |
| TASK-V55-303 | `op-three-tier.test.ts` 三档清分机核 | L | ✅ completed | FR-SELF-080/081/083/084/086 |
| TASK-V55-304 | `capability-wiring` / `sw-op-mirror` 等价重锚 | M | ✅ completed | FR-SELF-081/086 |
| TASK-V55-305 | `ai-drive.ts` `pressCandidate` 单源 + `driverClass` 矩阵 | M | ✅ completed | FR-SELF-063/065 |
| TASK-V55-306 | `op.turn` 槽复用（`requestTurn` 仍恰 2）+ 分支 A 端到端 | L | ✅ completed | FR-SELF-060/064/070 |
| TASK-V55-307 | 逐档反证（`confirm`/`gesture` 不可自动按下）+ 判定链零触碰 | M | ✅ completed | FR-SELF-067/082/085 |
| TASK-V55-308~320 | W3 仲裁 / W4 护栏 / W5 共享面收口 | — | ⏳ **pending（R2）** | — |

### 3.1 SG-V55-03 结论（先验闸门）

**结论 = 可得**（探针 `/tmp/opencode/v4-gate-logs/v55-3-r1/SG-V55-03.log`，五要素报告）：

```
① 派生式可得：可得   ② 计数：{auto:5, confirm:2, gesture:2}   ④ 与 IMPL 逐字段一致：一致   ⑤ problems：（空）
③ 成员集：auto=[op.turn,op.pick,op.describe,op.rebind,op.help] / confirm=[op.llm-config,op.revoke] / gesture=[op.authorize,op.perm.request]
```

⇒ `TASK-V55-302/303` 可开工（`BLK-V55-3` 未触发）；**未引入任何手写清分清单**（R-SELF-906 未违反）。

### 3.2 三档表落点与安全边界证据

- **落点**：`src/shared/op-table.ts#tierOf(d) = d.layer === 'sw' ? 'gesture' : (d.hasConsent ? 'confirm' : 'auto')`；`OP_TIER_TABLE` 由 `OP_DESCRIPTORS` **物化生成**（非第二份数据，门禁逐行重构断言相等）。
- **特权恒 `gesture` 断言**（`test/op-three-tier.test.ts` OT③ / `sw-op-mirror` SW-M⑤ / `capability-wiring`）：
  `SW_OP_DESCRIPTORS`（恰 2）逐项 `tierOf` == `gesture` ∧ `gesture` 档成员集 == 特权集（双向相等，无隐藏档）；
  `pressDecision('op.authorize' | 'op.perm.request', {actor:'ai'})` ⇒ `{ok:false, blocked:'tier'}`（**AI 不可发起 / 不可代按**）。
- **「SW 永不 `.request(`」语义等价保留**：`service-worker.ts` 中 `.request(` 命中数 **0**（计数不减）；手势 helper 的请求点 ≥1。
- **consent 不得被 AI 代答**：`confirm` 档（`op.llm-config` / `op.revoke`）`consent` 卡恒由面板收集器产出；`ai-drive.ts` 源码 **零 `consent` 通道**（`/collectConsent|consent/i` 零命中）；注入「AI 代答 ⇒ 必红」判据实跑。
- **`auto` 档零三表写入**：写入点表（`keyStore.save` / `requestCapabilityPermissionOnGesture` / `authorizeCurrentSite` / `removeCapabilityPermission`）全部落在 `confirm` / `gesture` 档；`auto` 档出现写入点 ⇒ FAIL。
- **判定链零触碰**：v3 台账 `zeroDiffFiles` 9 项逐项 `git diff`（未在册解冻者）；`policy.ts` / `auto-authorize.ts` **永不**可解冻（硬判据）。
- **AI 不自造候选**：`pressDecision` 首判 `opDescriptor(opId)` 未命中 ⇒ `blocked:unknown-op`。

### 3.3 继承义务处置（v55-1 / v55-2 移交）

| 义务 | 处置 |
|---|---|
| `nextAfterSettle` 调用点数值钉死 | **已钉死**：`test/op-wiring.test.ts#OP-W⑦` 断言 **1 定义 + 10 调用点**（本轮接线**未新增调用点**，`driveAnsweredTurn()` 在 `nextAfterSettle` 体**内**触发） |
| v55-2 N-01（零消费导出清理或登记） | **登记**（非本轮面）：`onboarding-flow.ts` 导出面零消费项由 W5 T320 收口轮统一处置；R1 未新增导出 |
| v55-2 N-02（续接成功后清空悬置，防旧原话重放） | **已落实（同义）**：`driveAnsweredTurn()` 以 `dedupeKey(driverId:source, instruction)` **单槽**消费；**只有真正按下成功才消费**（被拒不消费 ⇒ 下个结算点可再试，且**不会**无限重放同一意图） |

---

## 4. 测试与门禁对账

### 4.1 计数（只增不减）

| 门禁 | 入线 | 出线 | 结论 |
|---|--:|--:|---|
| `npm test`（node） | 1283 | **1299** | ✅ +16 / 0 fail |
| `test:journey` | 171 | **171** | ✅ 保段（**零 diff**，保护段未触及） |
| `test:binding` | 192 | **192** | ✅ 保段（**零 diff**） |
| `test:l0` | 248 | 248 | ✅ |
| `test:density` | 242 | 242 | ✅ 阈值逐字不动 |
| `test:s0-self-driven` | 42 | 42 | ✅ |
| `test:dead-end` | 49 | 49 | ✅ |
| `test:stream` / `ask-auth` / `auth-chip` / `law8` / `page-input` / `l1` / `l2` / `insight` / `hardening` / `zero-injection` / `recommendation` | — | 76 / 78 / 37 / 36 / 118 / 120 / 74 / 118 / 24 / 28 / 72 | ✅ 全部 ≥ 基线 |
| `test:supersession` | 36 | **36** | ✅ |
| `test:gate-integrity` | 15 | 15 | ✅ `CHROMIUM_GATES === 9` 逐字不动 |
| `test:size-ruling-vol3` | 12 | 12 | ✅ 三值同源 + `pending-author-line` 未伪称确认 |
| `test:e2e` | PASS | **PASS** | ✅ |

门禁串行复跑，日志：`/tmp/opencode/v4-gate-logs/v55-3-r1/`（27 份，逐门禁一份）。

### 4.2 体积五要素（R1 **中间登记**，TASK-V55-319 终轮在 R2）

| 要素 | 值 |
|---|---|
| 实测（`stat -c %s dist/sidepanel.js`） | **566,535 B**（入线 563,780，**Δ +2,755 / +0.49%**） |
| 逐模块归因（真实 `dist/build-meta.json`） | `sidepanel.ts` 101,704 → 102,426（**+722**）· `next-registry/ai-drive.ts` **NEW 1,511** · `shared/op-table.ts` 831 → 1,304（**+473**）；Σ **+2,706** + 未归因胶水 **+49** == **+2,755**（`SIDEPANEL_GROWTH_BREAKDOWN.v553R1Rows` / `v553R1UnattributedGlueBytes`） |
| 输入模块数 | 90 → **91**（`ai-drive.ts` 新增 1 个必需模块） |
| 生效上限 / 档位 / 绝对上限 | 生效上限 591,969 → **594,861**（= `floor(566,535 × 1.05)`，公式派生）；**档位 614,400 与绝对上限 675,840 均未动**（566,535 < 614,400 ⇒ **未跨档位**，无需升档） |
| 披露与占位 | `SIDEPANEL_RE_REGISTRATIONS['v55-3-r1']` 五要素齐备（direction `raised`）；`SIDEPANEL_CEILING_CAP_ROLE === 'record-only'`；`authorConfirmation` 保持 **`pending-author-line`**（**未伪称确认**） |
| 红线 | `content.js` 177,076 B / `pick-layer.js` 34,358 B **逐字节不变** |

**口径诚实登记**：本叶预算 5,900 B / 上界 7,600 B ⇒ R1 实测 +2,755 B **未越预算**；`op-table.ts`（+473）按 `new-required-module` 桶沿用（相对 v3-1 参照树仍为新增模块），`sidepanel.ts`（+722）计入接线桶。

---

## 5. 反证摘要（每条判据两段证据，禁恒真）

| # | 反证形态 | 结果 |
|---|---|---|
| 1 | **删 `tierOf` 派生**（抹掉 `confirm` 档 `hasConsent`） | 该 op 立刻落 `auto` ⇒ 清分 6/1/2 ⇒ **FAIL**；还原 ⇒ PASS |
| 2 | 把 `gesture` 档（`op.authorize`）归 `auto` | 特权恒 `gesture` 判据 **FAIL**；还原 ⇒ PASS |
| 3 | **AI 按下 `confirm` 档**（`op.llm-config` / `op.revoke`） | `pressDecision` ⇒ `blocked:'tier'`；对照实现（抽掉档位闸门）会放行 ⇒ 证明闸门承重 |
| 4 | **AI 自动执行特权 op** | `blocked:'tier'` + `capability-wiring` / `sw-op-mirror` 双判据 FAIL |
| 5 | **AI 代答 consent** | `aiConsentAnswerProblems(['op.llm-config'])` 必红；`ai-drive.ts` 零 consent 通道 |
| 6 | **AI 自造 opId**（`op.ghost`） | `blocked:'unknown-op'`（候选恒由注册表产出） |
| 7 | 新 op 未归档 / 第四档 | `partitionProblems` 双向包含判据必红 |
| 8 | **新增第三个 `requestTurn(` 调用点** / 复制自动按下点 | 计数据必红（实测 2 / 1）；还原 ⇒ PASS |
| 9 | **`auto` 档写三表** | `writePointProblems` 必红 |
| 10 | **AI 按 `confirm`/`gesture` 档产出可见 next 缺失** | `aiInitiateProblems` 必红 |
| 11 | 判定链文件改动（塞进 `zeroDiffFiles`） | `zeroDiffProblems` 必红 |

---

## 6. 已知限制 / 显式登记（R1）

| # | 项 | 处置 |
|---|---|---|
| N-V55-3-R1-01 | **W3~W5 未落地**（仲裁有界队列 / 护栏六常量 / 关断否决 / 共享面收口） | 显式登记为 **R2 范围**；`pressDecision` 已预留 `busy`（仲裁）与 `guardAllowed`（护栏）两缝，W3/W4 只接线、不改结构 |
| N-V55-3-R1-02 | AI 自动成回合的**有界性**当前只由「事件作用域单槽消费」承担（`dedupeKey` 单槽 + 只有按下成功才消费） | 频次 / 冷却 / 链深度 / 回合预算的**六常量护栏**在 W4 `guard.ts` 落地后经 `guardAllowed` 缝接入（零第二阈值）；**本 R1 不新增任何护栏常量**（避免与 W4 单源冲突） |
| N-V55-3-R1-03 | 「已配置」判据在 `sidepanel.ts` 复用既有表达式 `llmLoaded && Boolean(llmSummary?.configured)`（与 `maybeRecommend` 同源） | 未引入第二判据；v55-2 的 `isLlmConfigured`（SW bundle）保持**零 sidepanel 字节** |
| N-V55-3-R1-04 | 体积为 **中间登记**（非三叶合计终态） | TASK-V55-319（W5）按三叶合计终态再登记；本 R1 已保证「登记值 == 实测产物」与五要素齐备 |
| N-V55-3-R1-05 | v4 取代台账 61 条 `newTitle` **换锚** + 2 叶段 scope/逐字登记追补 | 因 R1 体积重 pin 与漂移反证锚点前移而**必然**发生；理由与历史值逐条留档（断言零删减、阈值零放宽） |
| N-V55-3-R1-06 | `state.json.phase` 置 `builded`（**R1 中间态**，非叶终态） | W5 T320 收口时按三叶合计终态再登记 |

---

## 7. 下一步

| 场景 | 操作 |
|------|------|
| 本轮（R1） | 已完成；建议先跑 `@sddu-review specs-tree-v55-3-ai-driven-orchestration`（安全边界：R-SELF-001 最高危） |
| 后续轮次 | **R2 = W3+W4+W5**（`TASK-V55-308~320`）：仲裁有界队列 1 + 草稿回填 · 护栏六常量单源 + 越限抑制 + 关断否决 · `journey`/`binding` 保护段 · 台账收口 · 体积终轮 + 全门禁串行 + e2e |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1 = W1+W2 / 7 任务 / 2 新文件 + 11 修改文件；SG-V55-03 = 可得；`npm test` 1283 → 1299 / 0；体积中间登记 563,780 → 566,535 B（+0.49%），档位与绝对上限未动、`pending-author-line` 保持；W3~W5 留 R2） | 2026-09-23 | SDDU Build Agent |
