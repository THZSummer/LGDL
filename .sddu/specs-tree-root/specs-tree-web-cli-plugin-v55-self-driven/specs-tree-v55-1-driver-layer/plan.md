# 技术计划：specs-tree-v55-1-driver-layer（V5.5-1 驱动者层 + 法七扩展底座）

> **文档定位**: SDDU 技术方案（**首叶 / 底座叶**）—— 本叶承载的父 FR/NFR/EC/AC 的**实施切片**；权威跨切契约见父 `../plan.md` + `../ADR-V55-001~012`
> **前置依赖**: 父 `../spec.md` v1.0 + 本叶 `spec.md` v1.0 + 父 `../plan.md` v1.0（跨切红线 / 体积预算 / 台账口径）
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-22
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-22
> **更新说明**: 初始创建（V5.5-1 叶 plan：驱动者声明单源 + 四元组机核 + `'answered'` 时机源扩张 + `ref-action` 时机侧重锚 + 驱动者终态词汇（法七扩展）+ 答案驱动化 + `submitDescribe` 补齐 + 后台 ask 迟到作答非死端 + S0 全链骨架/分支 A 机制侧/分支 B 识别侧 + 4 个新门禁）

---

## 1. 前置检查

| 检查项 | 状态 | 证据 |
|--------|:--:|------|
| 本叶 `spec.md` 存在 | ✅ | `spec.md`（273 行，v1.0） |
| 父 `spec.md` / `plan.md` 存在 | ✅ | `../spec.md`（853 行）/ `../plan.md` |
| 上游 v5 底座（只读复用） | ✅ | `next-registry/{definition,registry,providers,pipeline,dispatch,obligation-table,ops,snapshot}.ts`、`sidepanel.ts`、`l1/ref-store.ts`、`service-worker.ts`、`stream-model.ts`、`test/ui/fixtures/s2-chain.mjs` |
| 外部 API 文档缓存 | ✅ N/A | 零外部 API / 零新依赖 / 零新权限 |
| 依赖叶 | ✅ 无 | 本叶 = 依赖链起点（`deliveryOrder = 1`） |
| 保护 pin（本轮复算） | ✅ | journey `cc79f413…` 双绿；binding `be9ad0e9…` 双绿 |
| 体积基线 | ✅ | `sidepanel.js` 549,609 B（生效上限 577,089 / 余量 27,480 / 档位 563,200） |

## 2. 本叶范围与架构影响

**做**：① 驱动者声明单源（`drivers.ts`：时机闭集 5 / 七类时刻 7 / `driverClass` / 四元组抽取 / 去重键 / `CTX_FIELD_SERVICE` / `timingOfSettle`）；
② `RecommendTrigger` **外移 re-export**（单源）；③ `'answered'` 触发通路（`nextAfterSettle` 单入口，**零新增 `maybeRecommend(` 调用点**）；
④ 驱动者终态词汇（`terminals.ts`，4 项，与 `STREAM_TERMINALS` 6 **正交**）；⑤ `applyRefAction` = 裁决 + 驱动（调用点仍恰 1）；
⑥ `submitDescribe` 补齐驱动；⑦ 后台 ask 迟到作答：固化 + 可达 next（**不裸 `errorResponse`**）；
⑧ S0 骨架 + 分支 A 机制侧 + 分支 B 识别侧；⑨ 4 个新门禁 + 本叶取代台账条目。

**不做**：主题① 引导内容（v55-2）/ 主题② 主动性与护栏（v55-3）/ `NextProvider` 接口扩字段（ADR-V55-001 否决）/ `DRIVER_TERMINALS` 混入流终态（R-V55-103）/ 改 `ref-action.when`（R-V55-102）。

**关键设计定案（引用）**：ADR-V55-001（注册表形态 + diff=0 判据集 + `nextAfterSettle`）· ADR-V55-002（时机侧重锚）· ADR-V55-003（正交终态 + 三段控制）· ADR-V55-004（答案驱动化 + `commandSends` 登记）· ADR-V55-005（S0 双面 + 分层）。

## 3. 文件影响分析（本叶）

| 操作 | 文件路径 | 说明 |
|:--:|---|---|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/drivers.ts` | 驱动者声明单源（唯一） |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/terminals.ts` | 驱动者终态词汇 4（正交单源） |
| MODIFY | `src/ui/sidepanel/{sidepanel,recommend}.ts` | 类型 re-export / `nextAfterSettle` / 答案驱动化 / describe 补齐 / 迟到作答处理 |
| MODIFY | `src/ui/sidepanel/next-registry/{definition,providers,pipeline,ops}.ts` | `NextCtx` 加法字段 + 驱动者接线 + `reachableNext → nextAfterSettle` |
| MODIFY | `src/background/{service-worker,ask-bridge}.ts` | 迟到作答返回 `{settled:false, late:true}`（SW bundle，零 sidepanel 字节） |
| NEW | `test/driver-quadruple.test.ts` / `test/driver-timings.test.ts` / `test/driver-terminals.test.ts` | 3 个新 node 门禁 |
| NEW | `test/s0-self-driven-chain.test.ts` / `test/ui/fixtures/s0-chain.mjs` / `test/ui/s0-self-driven.mjs` | S0 样本 + node/Chromium 双面 |
| MODIFY | `test/{op-wiring,recommendation-sources,l1-ref-validity,ask-bridge,blocked-terminals,next-registry,supersession-ledger,gate-integrity,size-*}.test.ts` / `test/ui/{no-dead-end,recommendation,l1,page-input,ask-auth-inflow,law8-plaintext}.mjs` | 等价重锚（**改写 ≠ 删除**）+ 计数只增 |
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` | X-SELF-2/4/5/6 条目；X-SELF-1 登记「未发生取代」 |
| **NOOP** | `src/content/**` / `KIND_SET` / `manifest.json` / `docs/v3-supersession-ledger.json` / `ROADMAP.md` | 零 diff（显式） |

## 4. 实施序（4 波；供 `@sddu-tasks` 参考，非需求）

| 波 | 内容 | 完成判据 |
|:--:|---|---|
| **W1** 声明单源 | `drivers.ts` + `terminals.ts` + `RecommendTrigger` 外移 | 时机集恰 5 含 `'answered'`、旧 4 逐字；终态词汇恰 4 且正交；第二声明 ⇒ FAIL |
| **W2** 四元组机核 | 声明表 ↔ 注册表**双向包含** + `CTX_FIELD_SERVICE` + 悬空 chips | 三类注入反证各 FAIL → 还原 PASS；`test/driver-quadruple.test.ts` 绿 |
| **W3** 时机 + 答案驱动 | `nextAfterSettle` 单入口 + `'answered'` 触发 + `applyRefAction` / `submitDescribe` / 迟到作答 | **先证「答完会重跑」**（`test/ui/recommendation.mjs` 增）；再证「答案 ⇒ 驱动」；`maybeRecommend(` 计数仍 7；`when` 零改字节 |
| **W4** S0 + 门禁 + 收尾 | S0 样本 + 双面门禁 + 法七扩展门禁 + 台账 + 体积五要素 + 全门禁串行 | S0 逐环节可判；「答案不被丢弃 ∧ 静默窗口 = 0 ∧ 死端 = 0」；计数只增；保护段双绿 |

**叶内顺序铁律**：**先声明单源 → 再机核 → 再让「答完会重跑」可证 → 再落驱动语义**（若倒序，会先撞 `maybeRecommend` 计数门禁）。

## 5. 本叶验收门禁清单

`typecheck` · `build` · `npm test`（≥1181 增）· `op-wiring`（**`requestTurn(` 恰 2，原判据不改**）· `next-dispatch-diff0`（14 不变）· `next-obligation-table`（10）· `blocked-terminals`（9）· `recommendation-sources` · `local-act-wiring` · `l1-ref-validity` · `ask-bridge` · `test:dead-end`（≥39 **增**）· `test:recommendation`（≥65 增）· `test:ask-auth`（≥71 增）· `test:l1`（116）/ `test:page-input`（108）· `test:law8`（≥25）· `test:stream`（≥73 增）· `test:supersession`（≥36 增）· `test:gate-integrity`（≥15 增）· `size-*` + `test:size-ruling-vol3`（12）· **新 4 门禁**（四元组 / 时机源 / 终态词汇 / S0）· `design-contract`（19）

**共享面义务（本叶面）**：体积五要素重登记（本叶增量，**不加 cap**）· 取代台账 X-SELF-2/4/5/6 条目 + X-SELF-1「未发生取代」如实登记 · `knownGap` 一致性 · 保护段**保段**（journey / binding 双绿）。

## 6. 体积预算（本叶）

| 构成 | 预算 | 上界 |
|---|--:|--:|
| `drivers.ts` NEW 2,600 · `terminals.ts` NEW 700 · `providers.ts` 900 · `sidepanel.ts` 2,400 · `recommend.ts` 200 · `definition/pipeline/dispatch` 200 | **7,000** | **9,000** |

累计投影：549,609 → **556,609**（**未越档位 563,200**；生效上限前移至 584,439）。越预算 ⇒ 按 ADR-V55-011 §5 的**减体积优先级**执行，
**不得**删判据 / 放宽容差 / 静默降档；未落地项须**显式登记**。

## 7. 风险评估（本叶）

| # | 风险 | 等级 | 缓解 |
|---|---|:--:|---|
| R-SELF-002 | 门禁取代面（本叶**先撞** `requestTurn` / `RecommendTrigger`） | 高 | `requestTurn` **未发生取代**（diff = 0）；时机集扩张 + 单源 + 求值入口不增（ADR-V55-002） |
| R-SELF-003 / **R-V55-101** | 半驱动者复辟 / 第 8 个调用点 | 中高 | `nextAfterSettle` 单入口 + 调用点计数机核（1/7）+ 反证 |
| **R-V55-102** | `ref-action.when` 被顺手改宽（隐性放宽） | 中高 | 时机侧读法①；`when` 行**零改字节**判据 |
| **R-V55-103** | 终态词汇与流终态混用 | 中高 | 两表正交机核（交集空 + 6 逐字 + 4 单源） |
| R-SELF-007 / R-SELF-903 | 「已答」判据恒真 | 中高 | 四口径 + **三段控制** + 两段证伪 |
| R-SELF-008 | `askBridge` 生命周期耦合 | 中 | 迟到路径固化 + 可达 next；不伪造「接住」 |
| R-SELF-901 / 902 | 声明 ↔ 注册表漂移 / 第二个推荐器 | 中高 | 双向包含 + 三类注入；求值入口恰 1 定义 |
| R-SELF-908 / **R-V55-111** | S0 脚本绿 / 跨叶双计数 | 中高 | 逐环节可判 + 样本单源 + 分层接线（机制侧 ↔ 端到端） |
| R-SELF-006 | 体积（本叶 7,000 B） | 中高 | 分列预算 + 上界 + 减体积优先级 |

## 8. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V5.5-1 叶 plan：驱动者声明单源 / 四元组机核 / `'answered'` 时机源 / `ref-action` 时机侧重锚 / 驱动者终态词汇 / 答案驱动化 / describe 补齐 / 迟到作答非死端 / S0 骨架 + 分支 A 机制侧 + 分支 B 识别侧 / 4 新门禁；4 波；预算 7,000 B（上界 9,000）；累计 556,609 **未越档位**） | 2026-09-22 | SDDU Plan Agent |
