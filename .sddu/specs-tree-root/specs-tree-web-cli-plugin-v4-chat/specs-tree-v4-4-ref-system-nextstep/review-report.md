# 审查报告：specs-tree-v4-4-ref-system-nextstep（V4-4 引用卡 / 系统事件行 / 推荐卡 + 拾取入口迁移）

> **文档定位**: SDDU 审查报告 — 逐项记录自主审查的执行结果，作为 validate 阶段的输入  
> **审查策略**: review.md（C1~C15 审查清单及四维度指引）  
> **前置依赖**: review.md、spec.md、plan.md（ADR-V4-035~040）、build.md v2.0 + 「review 修复轮」附章、tasks.md  
> **创建人**: SDDU Review Agent  
> **创建时间**: 2026-09-19  
> **审查轮次**: R2（轻量复审：聚焦 R1 三阻塞闭环 + I 项抽检 + 新引入风险扫描 + 门禁抽跑）  
> **版本**: v2.0  
> **更新人**: SDDU Review Agent  
> **更新时间**: 2026-09-20  
> **更新说明**: R2 复审——R1 BLOCK-01~03 逐条闭环判定（含独立复现）+ I-01/I-03/I-06/I-07 抽检 + 3 项新发现（I-09/I-10/I-11，均非阻塞）+ 6 项门禁抽跑；结论 ✅ 通过。R1 逐项结果（C1~C15 / 3 阻塞 / 8 改进）保留于附录 A。

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 复审项总数 | 9（3 阻塞闭环 + 4 I 项抽检 + 1 新风险扫描 + 1 门禁抽跑） |
| 通过 | 7 |
| 警告 | 2 |
| 失败 | 0 |
| 阻塞问题 | 0 |
| 新发现（改进项） | 3（I-09 中 / I-10 低 / I-11 低） |

**复审范围**：`git diff b79deb0..60f6ae1 -- packages/web-cli-plugin`（29 文件 / +1,820 −274），HEAD `60f6ae1`，分支 `feature/web-cli-plugin`。工作树干净（`git status --porcelain` 空）；`dist/` 为构建产物（非跟踪），实测 `dist/sidepanel.js` mtime 04:19 晚于提交 04:18、晚于全部被改 `src/**`（≤02:36）⇒ 产物对应当前提交源码。

**本轮独立复核（只读、严格串行、一次一个 Chromium）**：

| 项 | 方法 | 结果 |
|---|---|---|
| BLOCK-01 调用点 | 全仓 + 产物 grep `maybeRecommend(` | 1 定义 + **4 生产调用点**（`pick`/`stale`/`idle`×2），无 seam 调用 |
| BLOCK-01 产品路径 | 实跑 `test:recommendation` ⑪（SW 发真实 `ref-captured` → 面板真实 `onMessage`） | **44/44 PASS**（`rule=risk-recovery` 的 nextstep 卡真出现） |
| BLOCK-01 label 缺陷 | 读 `chat-state.ts:660` + 回归用例实跑 | 静态安全 label；`risk-recovery` 不再抛错（991 全量中通过） |
| BLOCK-02 判据非空转 | 独立编译 `host-registry.ts` 纯函数 + 5 组 forged reading | clean=[]；复活退役容器/过渡标记/未登记宿主/缺失宿主 **均判红** |
| BLOCK-02 产品 DOM | 实跑 `test:l0` | **221/221 PASS**（含 4 条新结构性断言） |
| BLOCK-03 结算 | 读 `handleCardAction`/`submitDescribe`/`textAskCardId` + 实跑 ⑫ | **真实结算**（描述落在已答 askuser 卡，无占位通知） |
| I-01 去重 | 读 `systemDedupeKey` + 实跑 node 用例 | N 卡 ⇒ **N 行** + 同事实 1 行负控 |
| I-03 投影点 | 读 `refEvidenceRows`/`REF_PROJECTION_POINTS` + 实跑 `test:ref-pick-wiring` | **11/11 PASS**（单源证据层 + 判据反证） |
| I-06/I-07 机核 | 实跑 `test:size-ruling-vol3` / `test:density` + 台账逐字段独立核 | 9/9、175/175 PASS；2 个非默认登记格溯源字段齐备 |
| 体积五要素 | `stat` + 登记册对读 + Σ 归因复算 | 478,163 == 登记；content 177,076 / pick-layer 33,900 不变；Σ 12,846 + glue 40 = 12,886 |
| 门禁 | `npm test` / `l0` / `recommendation` / `density` / `ref-pick-wiring` / `size-ruling-vol3` | 991 / 221 / 44 / 175 / 11 / 9 **全绿** |
| 红线 | `git diff b79deb0..60f6ae1`（manifest / `src/content/**` / `src/background/**` / journey.mjs / binding.mjs） | **零 diff** |

> 未复跑项（如实登记，留给 validate）：`typecheck` / `build` / `l1` / `l2` / `stream` / `page-input` / `zero-injection` / `ask-auth` / `ui(journey)` / `insight` / `binding` / `hardening` / `e2e` / `l1-reverse` / `l2-reverse`。其中全部 node 门禁已被 `npm test`（991/991）整体覆盖；Chromium 门禁按轻量口径抽跑 3 项。

## 2. R1 三阻塞闭环判定

### 2.1 BLOCK-01（推荐链路未接线）→ ✅ 闭环

| 复核对照 | 证据 |
|---|---|
| 生产者调用点 | `sidepanel.ts:1218` 定义 `maybeRecommend(trigger)`；生产调用点 4 处：`maybeRescue().then()`（:1654，`'stale'`）、`acceptCapture()` 异步尾部（:1791，`'pick'`）、`chat-result 'error'`（:2623，`'idle'`）、`chat-result 'done'` 且 `openAsks===0`（:2642，`'idle'`）——全仓/产物无第五处、无测试 seam 调用 |
| `lastProducedAt` / 间隔落生产状态 | `lastNextstepProducedAt`（:1206）在产卡后写入（:1259），回传 `input.lastProducedAt`（:1244）⇒ `NEXTSTEP_MIN_INTERVAL_MS` 真实生效；`testing.reset()` 清空（夹具隔离） |
| 「不经 seam」门禁真实性 | `test/ui/recommendation.mjs` ⑪（:300-352）：驱动源 = SW 上下文 `chrome.runtime.sendMessage({kind:'ref-captured',...})` → 面板真实 `chrome.runtime.onMessage` → `pickInput.accept` → `acceptCapture` → `projectRef` + `maybeRecommend('pick')`；断言 `refCards≥1 ∧ nextstepCards≥1 ∧ rule==='risk-recovery'`，**判定不使用 seam**（`testing.lastRecommend()` 仅作诊断输出） |
| `label()` 密钥形状产品级缺陷 | `chat-state.ts:642-662`：label 改为静态安全文案 `label(['下一步推荐'])`；rule id 只进 `nextstepRule`（`stream-model.ts:220`，不在 `DIGEST_FIELDS`、不持久化）。回归用例 `test/system-merge.test.ts`「rule=risk-recovery 不得抛错」断言 `doesNotThrow` + 卡真铸出 + label 安全 —— 修法正确（原 `label([action.rule])` 会把 `risk-recovery` 的 `sk-…` 形状送进密钥扫描 ⇒ 产品路径整卡抛错） |
| 顺带修 | 回合边界追加推荐卡后显式 `followToBottom` 并在终帧补 `updateScrollHint()`（:1146-1151），消除「回到底部」假提示帧 |

**残余（新发现 I-09，非阻塞）**：`maybeRecommend('firstRun')` **无生产调用点** —— `RecommendTrigger` 含 `'firstRun'`、输入分支只在 `trigger==='firstRun'` 时装配 onboarding 事实（:1241-1243），`sidepanel.ts:1199` 注释与 `build.md §1` 均称「首装」为已接时机，但全仓无调用 ⇒ 规则 `R-ONBOARDING` 的推荐卡在产品内不可达（仅测试 seam ⑥ 可达）。**判定：按本次复审口径（拾取后 / 失效后 / 空闲三时机）闭环；首装时机登记为改进项 I-09。**

### 2.2 BLOCK-02（通道未归并 + 宿主清零判据空转）→ ✅ 闭环

| 复核对照 | 证据 |
|---|---|
| 五通道真事件化 | `eventizeChannels()`（:1536-1559）在 `refreshState()` 尾部调用（:2167-2169）：`site`/`probe`/`send`/`firstRun` 经 `observeChannel`（:1178-1184，**首见=基线、仅变化才入队**）→ `flushChannelRows` → `dispatch({type:'system'})` → 唯一通道 `systemRow`；`env` 由 `applyEnvGuard` 直发 `{kind:'env'}`（:2773）；`#notice` 由 R2 已归并 |
| `firstRunCard()` 接线 | 由零调用工厂变为活：`renderOnboarding`（:1484，title 与既有 DOM 逐字一致）与 `eventizeChannels`（:1548）双处使用 |
| 宿主结构性判据 | 新 `host-registry.ts`：`REGISTERED_STRUCTURAL_HOSTS`（4 个存活宿主，`transitional:false` + 理由 + 通道绑定）、`RETIRED_HOST_IDS`（`l0-pick`/`l0-status-band`，查 **id** 零 DOM 残留）、`[data-transitional-host]` 计数必须 0、`STRIP_CHANNEL_KINDS` 每通道绑定 kind；单一纯函数 `evaluateHostRegistry` 由面板（`testing.hosts()`）、Chromium 门禁（`l0.mjs`）与 node 门禁（`density-thresholds.test.ts`）共用 |
| **判据反证（独立）** | 本轮独立编译该纯函数后驱动 5 组读数：真实读数 → `[]`；复活 `#l0-pick` → 红；`[data-transitional-host]=1` → 红；未登记宿主 `extra` → 红；登记宿主缺失 → 红 ⇒ **非空转、可 FAIL** |
| DOM == 注册 | `index.html` 实存 `li[data-host]` = `decision`/`composer`/`l1-panels`/`strips`（`data-transitional-host` 计数 0），与注册表**双向相等**；`l0.mjs` 221/221 实跑含此 4 条断言 |
| strip kind 有 emitter | `test/system-merge.test.ts:242-260` 逐通道断言存在 `observeChannel('<kind>'` / 直接 `dispatch({type:'system',kind:'env'})` / `#notice` 唯一通道动作 |
| 取代债务诚实性 | 5 条 strips 容器本体保留（与 ADR-V4-036 §后果「6 strips 容器移除」不一致），但保护门禁确实读这些 id（`journey.mjs:592/658/876`、`binding.mjs:896/905/2256`），保留有真实理由；已在注册表登记为**永久结构宿主**（非过渡态）+ 理由 + 通道绑定 ⇒ 不再是「删属性充数」的自我验收 |

**残余（新发现 I-11，非阻塞）**：ADR-V4-036 §后果 的「6 strips 容器移除」口径未随「保留只读投影 + 事件化」订正（plan/ADR 未改）。

### 2.3 BLOCK-03（`describe-submit` 死控件）→ ✅ 闭环

| 复核对照 | 证据 |
|---|---|
| 卡侧不再双铸 | `cards/ref.ts:105-143`：「改用描述」只切换**卡内** `form.ref-fallback`（本地 disclosure，不经 `onCardAction`）；提交派发 `onCardAction(cardId,'describe-submit',value)` |
| 处理分支落地 | `sidepanel.ts:212-219` 新增 `describe-submit` 分支 → `submitDescribe(value)`（:1858-1863）：`ensureTextAskCard()` + `dispatch({type:'ask-resolved', requestId:'ref-describe', …})` 真实结算；不可达的 `describe && value` 分支已删 |
| 「唯一本地 text 卡」判据 | `textAskCardId()`（:1796-1804）按**模型** `requestId==='ref-describe'` 且未终态判定存在（不再按 `#ask-fallback` id —— 任何 open ask 都会铸那族 id）；`ensureTextAskCard` 是唯一构造点（`revealAskFallback` 与 `submitDescribe` 共用） |
| 边界纪律 | 描述文本**不发后台**（`ref-describe` 无桥）、**不入系统行**（零明文口径未放宽） |
| Chromium 断言 | `test/ui/recommendation.mjs` ⑫（本轮实跑 44/44）：兜底唯一（点击后**不新增** `#ask-fallback` 所有者）、提交描述 ⇒ 描述出现在**已答** askuser 卡（`data-answered`）、**无**「将在 v4-3 / v4-4 落地」占位 |

## 3. I 项抽检结果（4 项）

| # | 抽检点 | 结论 | 证据 / 残余 |
|---|---|:--:|---|
| I-01 | 去重**事实标识**（N 卡 ⇒ N 行） | ✅ 闭环 | `systemDedupeKey(kind,text,factId)`（`system-events.ts:130-136`）；`traceSuperseded`/`settleTurnEnd`/`closeOpenAskCards` 逐卡传 `cardId`/`requestId`；`test/system-merge.test.ts`：2 张 open ask + 会话切换 ⇒ **2 行**，同事实 ⇒ 1 行，并附「键随事实标识改变」负控（本轮 `npm test` 991/991 内实跑） |
| I-03 | `REF_PROJECTION_POINTS=3` + 单一证据构造 | ⚠️ 部分闭环 | ✅ 证据层已**单一构造**：`ref-store.ts#refEvidenceRows`（:90-99）由 `projectRefCard`（:123）与 `panels.ts#paintRefs`（:294）共用，`panels.ts` 不再自建「稳定选择器」行；`test:ref-pick-wiring` 11/11（含反证）。⚠️ `REF_PROJECTION_POINTS` 仍是**自声明常量**（断言 `length===3`，未对 DOM 做投影点计数），`#l0-ref-toggle`/`#l0-ref-badge`/`#l1-ref` 仍由 `paintRefs` 独立重绘、被归类为「同源只读回看」，ADR-V4-035 决策 1 的「L0 chip / L1 面板吸入 ref 卡」口径未同步 ⇒ 见 I-11 |
| I-06 | `authorConfirmation` 机器判据 | ✅ 闭环 | `test/size-ruling-vol3.test.ts` 新增机核：`resolved:true` ⇒ `authorConfirmation` 必存在 ∧ `status ∈ {pending-author-line, confirmed, overridden-by-author}` ∧ `date` 为 `YYYY-MM-DD` ∧ `pending` 必带理由（非法值/缺失 FAIL + 反证），实跑 9/9；台账 `status` 仍 `pending-author-line`（**诚实占位，未伪称已确认**）。备注：未采纳可选加强「`pending` 时禁止下调/跨档重登」（本轮档位 512,000 与绝对上限 563,200 确未变），非阻塞 |
| I-07 | `riskIncrementRegistry` 溯源字段 + 伪造反证 | ✅ 闭环 | 台账 2 个**非默认**登记格（`risk(staleRef)@320` → `rulingId=KL-V44-01-②`；`risk(staleRef)@400` → `rulingId=V4-4-BLOCK-01-reviewfix`）均带 `rulingId`/`rulingDate`/`approvedBy`/`reason(≥40)`（本轮逐字段独立核：0 问题；抽掉 `rulingId` 即命中必填判据）；`density.mjs` 新增机核 + forged 反证；`@400` 新值 7/7/18/208、`@320` 7/7/18/208、`@520` 零漂移，实测与登记格逐格机对（175/175） |

## 4. 新发现与残余（均非阻塞）

| # | 位置 | 问题 | 对应 Cx | 严重程度 | 建议 |
|---|---|------|:--:|:--:|---|
| I-09 | `src/ui/sidepanel/sidepanel.ts:1204/1241-1243/1199`；`build.md §1` | **「首装」推荐时机未接生产**：`maybeRecommend('firstRun')` 全仓无调用点，`R-ONBOARDING` 推荐卡仅测试 seam 可达；注释/台账却称该时机已接 | C3 / C9 | 中 | 在首装态（`onboarding.visible ∧ 未终结`）的应用点调用 `maybeRecommend('firstRun')`，或如实登记「首装推荐本轮不接」并订正注释与 build.md |
| I-10 | `test/size-baseline.ts:380,969,1314` | **体积披露文案算术不一致**：`v4-4-reviewfix` 的 reason 写「465,277 → 478,163 B（**+12,683 B，+2.73%**）」，而登记字段与实测均为 **+12,886 B / +2.77%**（`build.md §6` 亦为 12,886/2.77%）；同轮 glue 注释写「12,723 − 12,683」，实测 Σ 逐模块 12,846 + glue 40 = 12,886。`validateReRegistrationDisclosure` 只校验字段非空与 `before<after`，**不校验 reason 算术** ⇒ 机核无法发现 | C12 / C14 | 低 | 订正三处文案为 12,886 / +2.77%（与 12,846+40）；数值字段与判定不受影响 |
| I-11 | `plan.md`（ADR-V4-035 决策 1 / ADR-V4-036 §后果）；`src/ui/sidepanel/sidepanel.ts:1170` | **文档/口径漂移**：① ADR-V4-036 §后果 的「6 strips 容器移除」未随「保留只读投影 + 唯一通道事件化」订正；② ADR-V4-035 决策 1 的「L0 chip / L1 证据面板吸入 ref 卡」未随 `REF_PROJECTION_POINTS`（自声明 3 点，L0/L1 为「同源只读回看」）订正；③ `sidepanel.ts:1170` 注释「rows are collected during `render()`」与实际入口（`refreshState` 的 `eventizeChannels`，同文件 :1519 注释才是正确的）不符 | C2 / C7 / C14 | 低 | 下一轮统一订正注释与 ADR 口径（显式登记取代/收窄，不与实现脱钩） |

> 说明：`R1 I-02/I-04/I-05/I-08` 本轮未逐条深查，抽读确认已落地（`openSessionSegment` + 唯一通道行、`testing.reset()` 清 `projectedRefState`/`channelMemory`/推荐时钟、死代码删除 + `startPick` 退出公共句柄、`test:v3` 链纳入 3 条新门禁），未列入上表。

## 5. 审查维度汇总（R2 抽样）

| 审查维度 | 审查项数 | 通过 | 警告 | 失败 | 通过率 |
|---------|:--:|:--:|:--:|:--:|:--:|
| 代码质量 | 1（R2-08 体积五要素/新风险） | 0 | 1 | 0 | 0% |
| 规范符合性 | 4（R2-01/03 BLOCK 闭环 · R2-04 I-01 · R2-06 I-06） | 4 | 0 | 0 | 100% |
| 架构一致性 | 3（R2-02 BLOCK-02 · R2-05 I-03 · R2-07 I-07） | 2 | 1 | 0 | 66.7% |
| 测试质量 | 1（R2-09 门禁抽跑） | 1 | 0 | 0 | 100% |
| **合计** | **9** | **7** | **2** | **0** | **77.8%** |

> 警告项均来自 §4 的**残余/新发现**（无失败、无阻塞）：R2-05 → I-11（投影点自声明）；R2-08 → I-10（披露文案算术）。R2-01 按本次复审口径判定通过，其残余（首装时机）单列为 I-09。

## 6. 阻塞问题

| # | 位置 | 问题 | 对应 Cx | 修复建议 |
|---|------|------|:--:|---------|
| — | — | **本轮 0 阻塞**（R1 BLOCK-01/02/03 全部闭环，见 §2） | — | — |

## 7. 结论

**结论**: ✅ 通过

| 指标 | 结果 |
|------|------|
| R1 三阻塞闭环 | **3 / 3 closed**（BLOCK-01/02/03，均经独立复核 + 实跑门禁） |
| 阻塞问题数 | 0 |
| 改进项 | 3（I-09 中 / I-10 低 / I-11 低；均非阻塞） |
| 规范符合性偏差 | spec FR/NFR/AC **0 项**；ADR/plan 落地偏差 2 项（I-09 首装时机 / I-11 口径漂移，已登记） |
| 可进入 validate | **是** |

**理由**：

1. **BLOCK-01 闭环**：`maybeRecommend` 三处真实时机（拾取后 / 引用失效后 / 空闲=回合结束且 `openAsks===0`）已接线并落到生产状态；`test:recommendation` ⑪ 由 SW 发往面板的**真实** `ref-captured` 驱动、断言不使用 seam，本轮实跑 44/44 通过（`rule=risk-recovery` 的推荐卡真出现）；顺带修掉的 `label()` 密钥形状产品级缺陷有专门回归用例。残余：首装时机未接生产 → I-09。
2. **BLOCK-02 闭环**：五通道经唯一通道真事件化（变化才追加）、`firstRunCard()` 接线为活、「过渡宿主清零」改回**结构性**判据（DOM 集合 == 注册集合 ∧ 退役容器零 DOM 残留 ∧ 过渡计数 0 ∧ strip kind 有 emitter）；本轮独立编译纯函数并驱动 5 组 forged reading，判据**非空转、可 FAIL**；`test:l0` 221/221。残余：ADR 文案未同步 → I-11。
3. **BLOCK-03 闭环**：`describe-submit` 在 `handleCardAction` 落地为 `submitDescribe`（按模型 `requestId='ref-describe'` 判存在并真实结算），卡侧不再双铸兜底输入；⑫ 断言「兜底唯一 + 提交即留痕 + 无占位」实跑通过。
4. **I 项抽检**：I-01/I-06/I-07 全闭环；I-03 证据层单源闭环、投影点仍为自声明常量（残余 I-11）。
5. **门禁与纪律**：`npm test 991` / `l0 221` / `recommendation 44` / `density 175` / `ref-pick-wiring 11` / `size-ruling-vol3 9` 六项抽跑全绿；体积 478,163 B == 登记（≤ 502,071），`content.js 177,076` / `pick-layer.js 33,900` 逐字节不变，manifest / `src/content/**` / `src/background/**` / journey / binding **零 diff**，`CHROMIUM_GATES.length===9` 未动。
6. **处置建议**：I-09（首装推荐时机）为唯一「中」级残余，建议在 `@sddu-validate` 期间或下一轮一并处置；I-10/I-11 为文案/口径订正，可与后续任一修改轮同批完成。**当前状态可进入 validate。**

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1：❌ 不通过；3 阻塞 / 8 改进；15 审查项 5✅/7⚠️/3❌；11 项门禁复跑 + KL-V44-01 独立 A/B 复现）→ 原文见附录 A（亦见 commit `b79deb0`） | 2026-09-19 | SDDU Review Agent |
| **v2.0** | **R2 复审（轻量）**：R1 BLOCK-01~03 逐条闭环判定（3/3 closed）+ I-01/I-03/I-06/I-07 抽检 + 新引入风险扫描（含体积五要素与 Σ 归因复算）+ 6 项门禁抽跑；新发现 I-09（中）/ I-10（低）/ I-11（低），0 阻塞；**结论 ✅ 通过**，可进入 validate | 2026-09-20 | SDDU Review Agent |

---

## 附录 A：R1 审查结果（原文保留，复核轨迹）

> 以下为 R1（HEAD `2be59e5`，报告 v1.0）的逐项结果与结论，逐字保留以维持审计连续性；R1 的具体证据（门禁复跑表、KL-V44-01 A/B 复现原文）见 commit `b79deb0` 与本次 R2 的独立复核（§1/§2）。

### A.1 R1 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查项总数 | 15 |
| 通过 | 5 |
| 警告 | 7 |
| 失败 | 3 |
| 阻塞问题 | 3 |

### A.2 R1 逐项审查结果（C1~C15）

| # | 审查对象 | 评估 | 发现（摘要） | 严重程度 |
|---|---|:--:|---|:--:|
| C1 | 引用生命周期 | ⚠️ | 三条主干真实接线；「改用描述」卡内兜底提交为死控件（→ BLOCK-03）；失效转 stale 用「追加新卡」而非 patch | 中 |
| C2 | 系统事件单通道 | ❌ | `switchStreamSession` 直发 `system`；5 条通道未归并；`firstRunCard()` 零调用；去重窗口把 N 卡合并为 1 行 | 阻塞 |
| C3 | 推荐生产者真值 | ❌ | 白名单 7 项真实；但 `recommendNextStep` 只有 seam 一个调用点 ⇒ 产品内不可达；安全边界为候选级（`some`） | 阻塞 |
| C4 | V3-VOL-3 闭合合法性 | ✅ | 三值复算通过；`authorConfirmation` 占位诚实但无机器判据（→ I-06） | 低 |
| C5 | `riskIncrementRegistry` 形态 | ⚠️ | 可接受为「不新增豁免类别」；登记项无溯源门槛（→ I-07） | 中 |
| C6 | KL-V44-01 裁决执行质量 | ✅ | 独立 A/B 复现「测量中性」成立；重锚五要素齐备 | 低 |
| C7 | 退役与迁移完整性 | ❌ | strips 容器未退役；清零由「删标记属性」达成 ⇒ 判据空转；引用投影点 ≥4 | 阻塞 |
| C8 | 门禁账与 AC 对照 | ⚠️ | 11 项复跑全绿；`test:v3` 未纳入新门禁（→ I-08） | 中 |
| C9 | 推荐卡渲染与门控 | ⚠️ | 卡工厂/门控正确，但仅经 seam 通路验证 | 中 |
| C10 | `ref-store` 只追加投影 | ✅ | 纯追加；判定/序号/退役语义零变更双重证明 | 低 |
| C11 | 零注入 / 零明文 / 持久化边界 | ✅ | 27/27 复跑；明文构造期抛错 | 低 |
| C12 | 体积五要素与中间重登记 | ✅ | 465,277 == 实测；重登记五要素齐备 | 低 |
| C13 | 测试质量 | ⚠️ | 多门禁真驱动；`describe-submit` 等切面无断言 | 中 |
| C14 | 代码质量 | ⚠️ | 死代码/死常量；`startPick` 未拦旁路（→ I-05） | 中 |
| C15 | 设计契约与长会话纪律 | ⚠️ | 6/6 复跑；长会话未实证 | 低 |

### A.3 R1 阻塞与改进

| # | 位置 | 问题 | R2 处置 |
|---|---|---|:--:|
| BLOCK-01 | 推荐链路未接线（seam-only） | 生产者仅 seam 可达 | ✅ 闭环（§2.1；残余 I-09） |
| BLOCK-02 | 5 通道未归并 + 宿主清零判据空转 | 删属性充数 | ✅ 闭环（§2.2；残余 I-11） |
| BLOCK-03 | `describe-submit` 死控件 | 提交落占位 | ✅ 闭环（§2.3） |
| I-01 | 去重窗口 N→1 合并 | 留痕回归 | ✅ 闭环（§3） |
| I-02 | `switchStreamSession` 绕过唯一通道 | 死常量 | ✅ 抽读确认已落地 |
| I-03 | 投影点 ≥4 + 证据层两处各建 | ADR 未落实 | ⚠️ 部分闭环（§3；残余 I-11） |
| I-04 | `projectedRefState` 跨夹具泄漏 | 夹具序敏感 | ✅ 抽读确认已落地（`testing.reset()` 清空） |
| I-05 | 死代码 + `startPick` 旁路 | — | ✅ 抽读确认已落地 |
| I-06 | `authorConfirmation` 无机器判据 | — | ✅ 闭环（§3） |
| I-07 | 登记表无溯源门槛 | — | ✅ 闭环（§3） |
| I-08 | `test:v3` 未纳入新门禁 | — | ✅ 抽读确认已落地（链含 3 条新门禁 + `design-contract`） |

### A.4 R1 结论

**结论**: ❌ 不通过（审查通过率 33.3%，5 ✅ / 15；3 阻塞 / 8 改进）→ 已由修复轮（HEAD `60f6ae1`）全部处置，本 R2 判定 **✅ 通过**。
