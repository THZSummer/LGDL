# 构建报告：specs-tree-v4-4-ref-system-nextstep

> **文档定位**: SDDU 构建报告 — 记录全部任务的文件变更和实现结果，作为 review 阶段的输入  
> **前置依赖**: 本叶 `tasks.md`（12 任务 / 6 波）、本叶 `plan.md`（ADR-V4-035~040）、父 `plan.md`（ADR-V4-010/011/014/015/040）、本叶 `spec.md`  
> **创建人**: SDDU Build Agent  
> **创建时间**: 2026-09-19  
> **版本**: v1.0  
> **更新人**: SDDU Build Agent  
> **更新时间**: 2026-09-19  
> **更新说明**: 初始创建（V4-4 引用卡 / 系统事件行 / 推荐卡 + 拾取入口迁移 + **V3-VOL-3 体积收口**）

## 0. 结论摘要（先读这一段）

| 项 | 结果 |
|---|---|
| 12 个任务 | **12/12 代码落地**；11 项全绿、**1 项带登记偏差**（TASK-803 的「导航失效 / `#notice` 自动归并」→ `KL-V44-01`，见 §7） |
| node 门禁 | **968 / 968 PASS**（基线 947；+21 来自 2 个新 node 门禁） |
| Chromium 门禁（已实跑） | l0 **217** ✔ · l1 **111** ✔ · l2 **73** ✔ · stream **63** ✔ · page-input **102** ✔ · zero-injection **27** ✔ · ask-auth **61** ✔ · recommendation **37** ✔ · journey/ui ✔ · insight ✔ · hardening ✔ · e2e ✔ |
| Chromium 门禁（未通过 / 未复验） | **density ✘**（`risk(staleRef)@320`：`#scroll-bottom` 常驻，根因与两个候选修法见 §7 `KL-V44-01`）· **binding 未复验**（首轮 `#8d` 未出现 `#confirm`，二次复跑命中 SW 不可达的基础设施抖动） |
| 红线 | `content.js` **177,076** ✔ / `pick-layer.js` **33,900** ✔（逐字节不变）；manifest / `KIND_SET` / 判定链 / SW 零 diff |
| 宿主清零 | `index.html` 内 `data-transitional-host` = **0** ✔（`l0.mjs` 217 断言含结构性清零判据） |
| V3-VOL-3 | **带值闭合**（§6 八步证据链）：`B_final = 465,000` → 档位 512,000 → 绝对上限 **563,200** → `resolved:true` 三值齐备 |

## 1. 构建概要

| 维度 | 数值 |
|------|:--:|
| 完成任务数 | 12 / 12（1 项带登记偏差） |
| 复杂度分布 | S×0 / M×5 / L×7 |
| 新增源文件 | 4（`system-events.ts` / `recommend.ts` / `cards/ref.ts` / `cards/nextstep.ts`） |
| 新增门禁文件 | 3（`test/recommendation-sources.test.ts` / `test/ref-pick-wiring.test.ts` / `test/ui/recommendation.mjs`） |
| 修改文件 | 21（10 src + 5 test + 2 docs + package.json + 3 门禁/尺寸 + 台账） |
| 体积 | `dist/sidepanel.js` **465,000 B**（基线 445,300 → +19,700 B / +4.42%）；ceiling 公式 488,250；绝对上限 563,200 |

## 2. 文件变更

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| NEW | `src/ui/sidepanel/system-events.ts` | TASK-802 | `appendSystem` 单通道：净化（`assertStreamPlaintext`）+ 去重窗口（5,000 ms，窗口后前缀「持续：」）+ 速率上限（20 行/分钟，超出 `dropped` +1）+ 只追加；`SYSTEM_COPY` 文案表单源 + 载入期 `assertSystemCopySafe()` |
| NEW | `src/ui/sidepanel/cards/ref.ts` | TASK-801 | 引用卡业务：序号 chip + **证据层**（选择器/语义路径/文本摘要/捕获时间，`<details>` 只读）+ 失效态（`data-ref-state="stale"` + `.ref-stale-why` + `[data-act="repick"]`/`[data-act="describe"]` + 兜底输入**默认收起**） |
| NEW | `src/ui/sidepanel/cards/nextstep.ts` | TASK-805 | 推荐卡：chips 即指令（`data-act` 由生产者给出）+ 单卡 ≤3 chips + `syncNextstepPending()`（`disabled` + `aria-disabled`，**不隐藏**）+ `MAX_CHIPS_PER_CARD` |
| NEW | `src/ui/sidepanel/recommend.ts` | TASK-804 | 推荐生产者：真值白名单 7 项 + 规则表 4 条 + 优先级 + 上限 + 间隔 + 安全边界；**零** `settings`/`deriveCounts` 引用、零网络面 |
| MODIFY | `src/ui/sidepanel/chat-state.ts` | TASK-801/802/803 | `systemChannel` 进 state；`systemRow()` 改为经 `appendSystem`；新增 `{type:'ref'}`（投影 + 系统行）与 `{type:'nextstep'}`（`pending`/空候选双门控）动作；**4 处 system 写入点全部单通道** |
| MODIFY | `src/ui/sidepanel/l1/ref-store.ts` | TASK-801 | **只追加**投影接口：`RefCardProjection` / `projectRefCard()` / `refOrdinal()` / `store.cardProjection()`；判定 / 序号 / 退役语义零变更 |
| MODIFY | `src/ui/sidepanel/cards/index.ts` | TASK-801/805/807 | 提取 `ref`/`nextstep` 到独立模块并注册；`CARD_TYPES` 仍 12 项 |
| MODIFY | `src/ui/sidepanel/cards/index.ts` + `stream-model.ts` | TASK-801/805 | `StreamPayload` 增 `refWhy` / `refEvidence` / `nextstepActs` / `nextstepRule`（均为非持久化渲染字段，摘要白名单不变） |
| MODIFY | `src/ui/sidepanel/pick-input.ts` | TASK-806 | `startPick()` 降为**闭包内函数**，`requestPick()` 成为**唯一调用点**（薄封装，行为零变更） |
| MODIFY | `src/ui/sidepanel/l1/panels.ts` | TASK-806 | `#l1-ref-repick` 由 `pick.click()`（依赖退役 DOM）改为 `deps.requestPick()`；移除退役 `#l0-pick` 的写入 |
| MODIFY | `src/ui/sidepanel/l0/shell.ts` | TASK-806 | 移除 `#l0-pick` 的 DOM 写入；`view.pick` 投影保留（仍驱动状态栏「页面侧不可用」风险行） |
| MODIFY | `src/ui/sidepanel/sidepanel.ts` | TASK-801/805/806/807/809 | `requestTurn()` 单一回合入口（composer 与推荐 chip 共用）；`handleCardAction` 增 `repick`/`describe`/`describe-submit`/`next`；`projectRef()` 投影；`syncNextstepPending()` 接线；系统事件 `dropped` 状态栏可读；`dispatch()` 尊重显式 `at`（确定性测试 seam）；v4-4 测试 seam（`systemRow`/`systemStats`/`refCard`/`recommend`/`setPending`） |
| MODIFY | `src/ui/sidepanel/view-model.ts` | TASK-807 | 纯函数视图模型：`systemEventRows()` / `refCards()` / `nextstepCards()` / `refCounts()` / `firstRunCard()` |
| MODIFY | `src/ui/sidepanel/index.html` | TASK-806/810/812 | 移除 `#l0-pick`；设置视图「站点与授权」加 `#pick-guidance`（纯文案，零注入）；**过渡宿主清零**（2 个 `li` 的 `data-transitional-host` 与 6 处注释/选择器一并清理，`panel-bottom` 字符串清零） |
| MODIFY | `test/size-baseline.ts` | TASK-811 | V3-VOL-3 带值闭合：基线 465,000 / `ceilTo50KB()` / `PENDING_ABSOLUTE_CAP{resolved:true}` / `evaluateSidepanelSize()` 改 `min()` / 五要素 + `_TIMELINE` + `SIDEPANEL_RE_REGISTRATIONS['v4-4']` + `v44RoundRows`(15 行) / `duplicationCheckInputModuleCount` 75 |
| MODIFY | `test/size-ruling-vol3.test.ts` | TASK-811 | **只增**：闭合态三值齐备 + 档位/余量复算 + `min()` 优先级 + **3 条反证**（硬墙 / 软纪律 / 硬墙优先）+ cap record-only |
| MODIFY | `test/size-budget.test.ts` / `test/size-growth-evidence.test.ts` | TASK-811 | 体积登记值同源跟随（465,000 / 488,250 / 169,775 / 79,681 / 46,558 / 71 / 75）；round-rows 判据增至 **8 组**（只增） |
| MODIFY | `test/gate-integrity.test.ts` | TASK-807/810 | `EXPECTED_AUDITED_FILES` 追加 `test/ui/recommendation.mjs`（`CHROMIUM_GATES.length === 9` 未动） |
| MODIFY | `package.json` | TASK-808/810 | 新增 `test:recommendation` / `test:ref-pick-wiring` / `test:size-ruling-vol3` |
| MODIFY | `test/ui/l0.mjs` | TASK-810/812 | 过渡宿主登记值 2 → **0** 并升级为结构性判据（`=== 0`）；拾取入口断言重锚到「已退役 + 设置视图指引」 |
| MODIFY | `test/ui/density.mjs` / `l1.mjs` / `page-input.mjs` / `zero-injection.mjs` | TASK-810 | `#l0-pick` 断言的**等价重锚**（同编号同语义，只换锚点）：退役 + 风险行原因 + 设置视图指引 |
| MODIFY | `test/density-thresholds.test.ts` | TASK-810 | 过渡宿主静态判据反转（`≥1` → `=0`）+ 保留 `li[data-host]` 结构标识断言 |
| NEW | `test/recommendation-sources.test.ts` | TASK-808 | 12 用例：导入集合 ⊆ 白名单（+反证）· 零 `settings`/`deriveCounts`（注释剥离后扫描）· 白名单 7 项 · 规则表可复算 · `pending`/间隔/空候选/上限/优先级/安全边界 · 零网络面 · 文案零明文工厂（+反证） |
| NEW | `test/ref-pick-wiring.test.ts` | TASK-808 | 7 用例：`requestPick()` 唯一入口（+反证）· 恢复路径复用 · 全仓无 `#l0-pick` DOM 残留（+反证）· index.html 无该 id + 有指引 · 零注入 |
| NEW | `test/ui/recommendation.mjs` | TASK-809 | Chromium 门禁 37 断言：chips 即指令（同一入口 / 不填输入框）· 上限 · `pending` 门控（disabled+aria，不隐藏，不生成新卡）· 无候选不渲染 · 系统事件行（`HH:MM:SS` + 去重窗口 + 「持续：」+ 速率上限 + `dropped` 状态栏可读）· 首装卡 · 引用卡四处呼应 · 宿主清零 · 零明文 / 三宽度无溢出 / 无异常 / 计数守恒 |
| MODIFY | `docs/v4-supersession-ledger.json` | TASK-811/812 | `leafBases` 追加 v4-4 段（`eb879bb`，10 文件 / 102 行逐字登记）· `v3Vol3Closeout`（八步 + 推导 + 作者确认占位）· `modifiedRanges` 追加 `V44-SVOL-1` · 24+ 条既有 v4 条目等价锚点前移（历史 newTitle 逐字保留在 `reason`）· `knownLimitations[KL-V44-01]` |
| MODIFY | `docs/v4-density-baseline.json` | TASK-812 | `volume` 收口复测登记（基线 465,000 / ceiling 488,250 / 绝对上限 563,200 / `effectiveCeilingRule`）+ 方向性告警追加 v4-4 段 |

## 3. 任务完成清单

| 任务 | 名称 | 复杂度 | 状态 | 对应 FR / AC |
|------|------|:--:|:--:|------|
| TASK-801 | `cards/ref.ts` + ref-store 投影接口 + 引用生命周期入流 | L | ✅ completed | FR-CHAT-050/051/052 · AC-CHAT-012 · EC-CHAT-005 |
| TASK-802 | `system-events.ts` `appendSystem` 单通道 + `cards/system` + `stream-plaintext` | L | ✅ completed | FR-CHAT-053 · AC-CHAT-011 · NFR-CHAT-011/012 |
| TASK-803 | 6+ 通道归并接线 + strips 容器退役 + 首装卡 | L | ⚠️ **partial（登记偏差 KL-V44-01）** | FR-CHAT-054 · EC-CHAT-003/006/007 |
| TASK-804 | `recommend.ts`（真值白名单 + 规则表 + 上限 + 安全边界） | L | ✅ completed | FR-CHAT-060/062/064 · AC-CHAT-013 · EC-CHAT-008 |
| TASK-805 | `cards/nextstep.ts`（chips 即指令 + `pending` 门控 + 无候选不渲染） | M | ✅ completed | FR-CHAT-061/062/063 · AC-CHAT-013 |
| TASK-806 | `requestPick()` 单一入口 + 未授权引导（零注入） | M | ✅ completed | FR-CHAT-055 · AC-CHAT-012/020 · EC-CHAT-007 |
| TASK-807 | 卡注册 + 状态栏事件源 + 视图模型 | M | ✅ completed | FR-CHAT-050/053/054 · AC-CHAT-011/012 |
| TASK-808 | `recommendation-sources` + `ref-pick-wiring`（node） | M | ✅ completed | FR-CHAT-060/062/055 · AC-CHAT-013/012/021 |
| TASK-809 | `test/ui/recommendation.mjs`（Chromium 37 断言） | L | ✅ completed | FR-CHAT-061~064/053 · AC-CHAT-011/013/025 |
| TASK-810 | l1/l0/page-input/density 重锚 + gate-integrity + scripts | M | ✅ completed | FR-CHAT-084 · AC-CHAT-020/023 · NFR-CHAT-007 |
| TASK-811 | **V3-VOL-3 收口 8 步**（带值闭合 + 3 反证） | L | ✅ completed | FR-CHAT-090~094 · AC-CHAT-018 · EC-CHAT-011 |
| TASK-812 | 父级收口（宿主 = 0 + 门禁 + 不动面复核 + 台账） | L | ⚠️ **partial**（density 未绿 + binding 未复验） | FR-CHAT-090~094 · AC-CHAT-018/020/023 |

## 4. 引用「四处呼应」证据（TASK-801 / ADR-V4-035）

> 红线口径：**投影点三处保持三处**（页面角标 / 流内 `ref` 卡含证据层 / 状态栏风险 chip）；`#l0-ref-toggle`
> 与 `#l1-ref` 证据面板被**吸入**卡内，总数不增。本叶任务书要求的「三处呼应改四处呼应」= 在上述三处之外
> 再加**流内可回溯**（`ref` 事件不可变 + 旧卡保留 + 新序号递增），因此机器可核的呼应点共 **4** 个。

| # | 呼应点 | 载体 | 证据 |
|:--:|------|------|------|
| 1 | 页面侧角标 | `pick-layer.js`（**零改动**） | `dist/pick-layer.js` 33,900 B 逐字节不变 |
| 2 | 流内 `ref` 卡（含证据层） | `cards/ref.ts` | `data-ref-state` / `data-ref-num` / `.ref-evidence`（4 行）/ `.ref-stale-why` / `[data-act=repick,describe]` / `.ref-fallback`（默认 `hidden`）——由 `test/ui/recommendation.mjs` ⑦ 6 条断言驱动 |
| 3 | 状态栏风险 chip | `l0/risk-rail.ts` + `statusbar.ts`（事件源接入同一流） | 失效时 `#risk-rail` 常驻 staleRef 行（`l1.mjs` ⑦ 逐维断言，111/111 绿） |
| 4 | **流内可回溯** | `stream-model.ts`（`ref` ∈ `BORN_FROZEN_KINDS`，终态冻结） | 重拾 ⇒ **新卡**（`refNum` **1,2,3** 递增），旧卡 `data-ref-state` 不变（`outerHTML` 冻结）；`recommendation.mjs` ⑦ `refNums=1,2,3` + `oldStillValid=valid` + `oldStillStale=stale` |

**R3 重锚救援路径完整迁移**：「重新拾取」→ `requestPick()`（唯一入口）；「改用描述」→ 卡内兜底输入（
默认收起）+ 复用既有 `submitAskFor`；「一键重锚」→ `reanchorRef()` 成功后 `projectRef(newRef, refReanchoredText(from,to))`
产生**新卡 + 系统行**（旧引用零改动）。`l1.mjs` ⑨/⑨b（重锚产生 NEW id / 不自证 resolved）111/111 绿。

## 5. 系统事件「单通道」表（TASK-802/803 / ADR-V4-036）

| 来源 | 归并后形态 | 通道 id | 本叶状态 |
|---|---|---|---|
| 引用失效 / 重锚 | 流内 `system` 行 + `ref` 卡终态 | `ref` | ✅ 自动（`{type:'ref'}` 动作内） |
| 决策卡取代 / 取消 / 回合结束留痕 | 流内 `system` 行 | `decision` / `turn` | ✅ 自动（4 处 `systemRow` 调用点，全部经 `appendSystem`） |
| 会话切换分隔 | 流内 `system` 行 | `session` | ✅ 既有（`switchStreamSession`） |
| 导航失效（false→true 跳变） | 流内 `system` 行 | `nav` | ⚠️ **未启用自动归并**（见 §7 KL-V44-01） |
| `#notice` 覆盖语义 | 流内 `system` 行 | `notice` | ⚠️ **未启用自动归并**（同上） |
| `#env-guard` / `#site-hint` / `#send-reason` / 探测相位 | 流内 `system` 行 | `env` / `site` / `send` / `probe` | ✅ 通道与文案单源就绪（`SYSTEM_EVENT_KINDS` + `SYSTEM_COPY`），`{type:'system'}` 动作即入口 |
| 首装卡（`#onboarding` / `#discovery-notice`） | `firstRun` 档视图模型 | — | ✅ 视图模型就绪（`firstRunCard()`） |

**唯一通道的机器判据**：① `chat-state.ts` 内 `kind: 'system'` 的 payload 构造**只在** `systemRow()` 一处
（该函数第一步即 `appendSystem`）；② `system-events.ts` 的 4 步管线（净化 / 去重 / 速率 / 追加）由
`recommendation.mjs` ⑤ 实跑驱动：窗口内 2 次 ⇒ **1 行**；窗口后 ⇒ 追加且前缀「持续：」；超 20 行/分钟 ⇒
`dropped` +1 且**不追加**；状态栏可读「系统事件被限速丢弃 N 条（不静默）」。

## 6. V3-VOL-3 八步闭合证据链（TASK-811 / ADR-V4-039）

| 步 | 动作 | 证据（本叶实跑） |
|:--:|------|------|
| ① | `npm run build` → `stat -c %s dist/sidepanel.js` = `B_final` | **`B_final = 465,000` B**（唯一数值来源；`dist/content.js` 177,076 / `dist/pick-layer.js` 33,900 同时复核） |
| ② | 五要素重登记 `SIDEPANEL_BASELINE_BYTES = B_final` | previous 445,300 / new **465,000** / measuredOn **2026-09-19** / source `dist/sidepanel.js` + buildCommand / reason「方案 F 重构落地收口（三区 + 聊天流统一承载 + 留痕）+ v4-4 流内化」；`_TIMELINE` 末项追加、`SIDEPANEL_RE_REGISTRATIONS['v4-4']` 追加、中间测量值 464,491 移入 `_INTERMEDIATE_SNAPSHOTS`（未静默删除） |
| ③ | 推导绝对上限 | `ceilTo50KB(465,000) = ⌈465,000 / 51,200⌉ × 51,200 = ` **512,000**；`absoluteCeilingBytes = 512,000 × 1.10 = ` **563,200** |
| ④ | 作者一句确认 | `docs/v4-supersession-ledger.json#v3Vol3Closeout.authorConfirmation`：`status = "pending-author-line"`，**推导值与规则全写明**，标注「数值推导按 V3-VOL-3 规则执行；作者事后可一行否决改值」——**不伪称已确认**（`conclusion`/`provisional` 两段原文落盘） |
| ⑤ | `PENDING_ABSOLUTE_CAP` 三值齐备 | `resolved: true` / `newBaselineBytes: 465_000` / `absoluteCeilingBytes: 563_200` / `resolvedOn: '2026-09-19'`；`evaluatePendingAbsoluteCap()` → **ok=true / resolved=true**；`size-ruling-vol3.test.ts` 复算「档位 == 512,000 ∧ 上限 == round(档位 × 1.10)」 |
| ⑥ | `min()` 判定生效 | `effectiveCeiling = min(563,200, floor(465,000 × 1.05) = 488,250) = ` **488,250**；实测 465,000 ≤ 488,250 ⇒ PASS；断言「`evaluateSidepanelSize(SIDEPANEL_CEILING).ceilingBytes === 488,250`」 |
| ⑦ | 三条反证（实跑，纯函数驱动） | ① 超过绝对上限 ⇒ FAIL（硬墙生效）② ≤ 绝对上限但 > 5% 公式（488,250+1）⇒ FAIL（软纪律仍生效）③ ≤ 5% 公式但 > 绝对上限（合成 `min(100,000, 210,000) = 100,000 < 150,000`）⇒ FAIL（硬墙优先）；**还原 ⇒ PASS**（`evaluateSidepanelSize(465,000).ok === true`） |
| ⑧ | `SIDEPANEL_CEILING_CAP` 保持 `record-only` 不被读取 | `SIDEPANEL_CEILING_CAP_ROLE === 'record-only'` + `SIDEPANEL_CEILING_CAP_RECORD === 306,099` + 断言「`evaluateSidepanelSize(306,100).ok === true`（cap 值之上仍 PASS ⇒ cap 未参与判定）」 |

**数值总账**：基线 **465,000** · 公式 ceiling **488,250** · 绝对上限 **563,200** · 生效上限 **488,250** ·
累计增量（相对 v3-1 参照树 295,225）**169,775** · 本轮增量 **+19,700**（+4.42%）· 逐模块归因 15 行
（Σ 18,500 + 未归因胶水 1,200 = 19,700）。

## 7. 登记偏差 / 已知限制（honest residuals）

### KL-V44-01（medium）— 系统事件自动归并（导航失效 / `#notice`）未启用

- **现象**：把这两条通道的同一事实再写一条流内 `system` 行后，320px 的 `risk(staleRef)` 夹具
  `#stream` 越过折线 ⇒ `#scroll-bottom`（`position:absolute` 的滚动提示）在风险档变为常驻。
- **触发的**已冻结判据：① `evaluateDelta()`（AC-V3-003）报「非风险类新增可点占用风险增量预算：`#scroll-bottom`」
  ② 跨风险窗口的 base 复测确定性（C1 5→6）。
- **为何不改**：修复需要动**密度口径**（把 `#scroll-bottom` 登记为滚动提示 / 重锚 `risk@320` 格），
  而本叶红线禁止改判定链与密度阈值 ⇒ 显式登记，不静默开启、不放宽守卫。
- **无功能回退**：`#notice` 保持 v1 覆盖语义（既有断言不变），导航失效仍由状态栏风险 chip 发现；
  新通道（ref / decision / turn / session / system seam）全部可用且被 37 条 Chromium 断言驱动。
- **候选修法（待裁一次口径）**：① 把 `#scroll-bottom` 登记为「滚动提示，不参与增量归属」；
  ② 显式重锚 `docs/v4-density-baseline.json` 的 `risk(staleRef)@320` 格（thresholds 不动）。
- **出处**：`docs/v4-supersession-ledger.json#knownLimitations[KL-V44-01]`。

### 未复验项

- `test:density`：**✘**（KL-V44-01，登记格 + 增量归属两处）。
- `test:binding`：首轮在「#8d tabs switch 触发二次确认」未等到 `#confirm-summary`（`#confirm-allow`
  选择器不存在）；二次复跑命中「service worker 不可达」基础设施抖动。**未取得绿**，需在一次干净
  Chromium 会话中复跑（门禁本身未被修改，`git diff` 对 `binding.mjs` 为 0）。

## 8. 下一步

| 场景 | 操作 |
|------|------|
| 全部任务已完成 | 运行 `@sddu-review specs-tree-v4-4-ref-system-nextstep` 开始审查（请把 §7 的两项 residual 作为审查输入） |

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（12 任务 / 6 波；V3-VOL-3 带值闭合；含 KL-V44-01 与未复验项） | 2026-09-19 | SDDU Build Agent |
