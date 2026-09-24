# 技术计划：specs-tree-web-cli-plugin-v55-f-input-as-next（web-cli-plugin v0.11.2「输入即 next：废除流外独立输入框」；父 Feature 统领性技术方案）

> **文档定位**: SDDU 技术方案（**父 / 跨切契约与索引**）—— 记录跨切架构、总体方案取舍、聚合文件影响、红线继承、保护段决策、门禁重锚清单、体积分列预算与实施波次，以及 **10 条 ADR 的索引**（正文见本目录 `ADR-IAN-001~010-*.md`），作为 2 叶实施、审查与收口的单一参照
> **前置依赖**: 本目录 `spec.md` v1.0（**80 FR / 14 NFR / 18 EC / 27 AC / 20 NG / 10 US / 8 G**；O-IAN-001~011 全 `ruled`；§12 X-IAN-1~11 等价重写映射；§13 N-IAN-001~028；§5.11.1 分列预算表；§14 2 叶拆分）+ `discovery.md` v1.0 + 2 叶 `spec.md` v1.0（`specs-tree-ian-1-free-input-next` / `specs-tree-ian-2-abolish-composer`）+ 唯一直接上游 `specs-tree-web-cli-plugin-v55-f-scope-governance`（F-34 v0.11.1，两叶 `validated`，**零改写**）+ 底座 F-33 / F-32 / F-31 / F-30 / R6 `74d76c1`（**零改写**）
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-24
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-24
> **更新说明**: 初始创建（父 `plan.md` + 2 叶 `plan.md` + **ADR-IAN-001~010 正文**同批产出：① 「自由输入…」next 面形态（provider + 恒最末终端 + `data-act` 命名 + 零死端）② 卡内输入载体与提交通道（`.ask-fallback` 家系第二语义分支 + `op.turn` 槽 + `requestTurn(` 恰 1 + 手输 driver / 让位）③ R6 排队与草稿回填迁移（入口迁流内 + 回填迁卡内 + 不覆盖）④ `#composer` 废弃执行序与写者消解（停引 → 删面）⑤ 兜底收敛终态 + `#send-reason`/`sendDisabled`/draft/引导重锚 ⑥ 法四原地修订 + supersession 台账 old→new + X-IAN-1~11 逐条处置 ⑦ 保护段逐段决策（journey 八步取代 / binding keep 字节中立）⑧ 18 门禁三态重锚 + 2 新门禁设计 + `CHROMIUM_GATES === 9` 不动 ⑨ S0'' 双面验证设计 ⑩ 体积分列预算（逐模块归因 + 距档 22,454 + EC-IAN-016）。**本任务只做 plan**：不写 tasks、不写代码、不改 `src/**`·`test/**`·`dist/**`·`docs/**`·`design/**`·ROADMAP，不改 v1~v5.5.1 与 R6 SDDU 目录，不动 `main`、不 force push，**不跑门禁 / 构建 / Chromium**，**未调用任何受管 Provider**（routing.v1 = `local_or_compute → none`）。

---

## 1. 前置检查

| 检查项 | 状态 | 证据 |
|--------|:--:|------|
| 父 `spec.md` 存在 | ✅ | 本目录 `spec.md`（863 行，v1.0，2026-09-24，`phase=specified`） |
| 2 叶 `spec.md` 存在 | ✅ | `specs-tree-ian-1-free-input-next/spec.md`（268 行）/ `specs-tree-ian-2-abolish-composer/spec.md`（263 行），均 v1.0 |
| 叶数量与结构 | ✅ | 2 叶（`leaf:true` / `depth:2` / `deliveryOrder` 1..2 / `dependsOn: ian-1 → ian-2`）；父 `depth=1` 轻量规范容器（不承接 build/review/validate、不产 `tasks.json`） |
| 外部 API 文档缓存 | ✅ N/A | **零外部 API / 零新依赖 / 零新权限**（`manifest.json` 零 diff）；无 `/sddu:api-docs` 需求；`O-IAN-010` = 不需要外部竞品调研 |
| 参数化模板 | ✅ | `.opencode/plugins/sddu/templates/output/sddu-plan.md.hbs`（79 行；**无**用户级覆盖 `.sddu/templates/agents/output/sddu-plan.md.hbs`） |
| 上游先例 | ✅ | F-34 `plan.md`（父 + 2 叶 + `ADR-SGO-001~008`；沿用「ADR 正文独立成文件 + 父/叶两层 plan」落法） |
| 分支 / HEAD / 工作区 | ✅ | `feature/web-cli-plugin` / `a14aa19`（F-35 spec 产物）/ `git status --short` 空 |
| 红线现值（**本轮只读复核**） | ✅ | `dist/content.js` **177,076 B** / `52a82620…`；`dist/pick-layer.js` **34,358 B** / `77796bab…`；`dist/sidepanel.js` 基线 **591,946 B**（生效上限 `floor(×1.05)=621,543` / 档位 **614,400**（距档 **22,454**）/ 绝对上限 **675,840** / `authorConfirmation=pending-author-line`）；`KIND_SET` **40 逐字**；`REGISTERED_STRUCTURAL_HOSTS === []` |
| 主流程调用点（**本轮只读实测**） | ✅ | `requestTurn(` **恰 2**（composer submit `:3756` + `op.turn` 槽 `:3783`）；`maybeRecommend(` 1 定义 / 7 调用点；`nextAfterSettle(` 1 定义 / 10 调用点；`ACT_TO_OP` 恰 6 行；`NEXTSTEP_PRIORITY` 恰 4 项 |
| base 零 diff 机核 | ✅ | `test/insight-no-escalation.test.ts:147` `assert.equal(gitDiffStatus(['../web-cli-base']), 0, …)` 为现有判据（本 Feature 不碰该文件判据） |
| 保护 pin（**本轮只读复算命中**） | ✅ | journey **`43054..58287`** / sha **`cc79f413…`**（active，`supersededFrom e2b500df…`）；binding **`107780..115930`** / sha **`be9ad0e9…`**（active，`decision: keep`）；口径 = `supersession-ledger.test.ts#protectedPinFailures`（ADR-IAN-007） |
| 体积口径（**本轮只读复核**） | ✅ | `build.mjs:95` `copyFile(src/ui/sidepanel/index.html → dist/sidepanel.html)` ⇒ **DOM/CSS 退役不进 `dist/sidepanel.js` 账本**（`size-baseline.ts:814,2812` 既有口径）；本计划在 ADR-IAN-010 §③ 显式登记 |
| 写入范围 | ✅ | 仅本 Feature SDDU 目录（父 + 2 叶 `plan.md` / 10 ADR / 3× `state.json` / `TREE.md`）；**未跑任何门禁 / 构建 / Chromium** |

### 1.1 偏差登记（父 `plan.md` 的产出 vs 父 spec 的「轻量规范容器」定位）

父 `spec.md` §14.1 明定父 Feature = 轻量规范容器（不承接 build/review/validate，不产出 `tasks.json`）。本阶段按编排器任务书产出**父 + 2 叶两份层级的 `plan.md`**，与 F-34 先例同口径**显式登记**：

| 项 | 内容 |
|---|---|
| 偏差 | 父产出 `plan.md`（spec §14.1 未列出父 `plan.md`） |
| 理由 | 跨切契约（红线继承 / 不动面 / 保护段决策 / 门禁重锚清单 / 体积分列预算 / 波次 / ADR 编号）需**单点定义**，否则 2 叶与收口各持一套口径 |
| 容器内核仍遵守 | 父**不产出** `tasks.md` / `tasks.json`；父**不承接** build/review/validate；实施全部由 2 叶承载；父 `state.json` 的 `depth=1` / `childrens` 结构不变 |
| 引用方式 | 叶对父的引用 = 「父 FR/AC + `ADR-IAN-0xx` 编号」，不依赖父 `plan.md` 物理存在性 ⇒ 本文件可整篇作废而不牵连叶 |
| ADR 编号 | 本 Feature 用 `ADR-IAN-001~010`（与 FR/N/EC/AC 的 `IAN` 命名空间一致；不占用上游 `ADR-SGO-*` / `ADR-V55-*` / `ADR-V5-*`） |

### 1.2 本阶段的两条硬性约束（**先写结论**）

| 约束 | 结论 | 依据 |
|---|---|---|
| **体积（A 列 / `dist/sidepanel.js`）** | 叶1 **+2.5 ~ +4.5 KB** + 叶2 **−2.5 ~ −1.0 KB（目标净负）** = Σ **−0.0 ~ +3.5 KB**；+15% 缓冲 = **−0.0 ~ +4.0 KB ≤ 生效上限余量 29,597 B** ✅ 且 ≤ **距档余量 22,454 B** ✅ ⇒ **正常口径不触发升档**。**2.8× 最坏**（承 v5 教训）≈ **15.4 KB** ⇒ **仍 < 22,454 B ⇒ 也不触发升档**（**预置 EC-IAN-016 显式升档路径 + 作者一行**；本阶段**不触发**、**不伪称已确认**）。⚠️ **严格口径登记**：`index.html` 的 DOM/CSS 退役**不进** `sidepanel.js` 账本 ⇒ 叶2 严格 A 列净估 **−1.2 ~ +0.3 KB**；若实测非负须**如实登记「为什么删面没有净负」+ 重新校准**（ADR-IAN-010 §③ / FR-IAN-115 / R-IAN-908） | §5.11 / ADR-IAN-010 |
| **B 列（`dist/background.js`，不计账）** | 叶1 **0** + 叶2 **0**（`turn-queue.ts` 零 diff；本 Feature 不改 SW 面） | NG-IAN-006 / N-IAN-008 |

> 口径：`sidepanel.js` 是**唯一**带字节预算的产物；`background.js`（SW bundle）/ `options.js` / `content.js` / `pick-layer.js`（冻结）/ `test/**` **不计入**该账本。C 列（`content.js` / `pick-layer.js`）**零容差零触碰**。

---

## 2. 架构分析

### 2.1 问题定性（题眼）

v5（F-32）把「一切操作皆 next 流内闭环」立法；v5.5（F-33）把「下一步由谁按」转移到系统 / AI 侧；F-34（v5.5.1）把「下一步按的范围」兑现为可判读数。**v0.11.2 的题眼 = 「输入面本身也必须在 next 里」**：

1. **唯一流外输入面**：`#composer`（`<form id="composer" hidden>`）是**唯一**「自由文本 → 发起回合」面，却住在 `ol#stream` 之外（v4.5 出流到 `body` 尾，`host-registry.ts:144-146` 登记为「兼容读取面」）。
2. **显隐与历史相关而非与状态相关**：**D-A 双写者**（`syncComposerVisibility` vs `l0.revealFallback` 无条件直写）、**D-B 锁存无生产复位**（`fallbackOpen` 唯一复位点是测试钩子）、**D-C 设置态漏隐藏**（`openL2View('settings')` 提前 return 不调护栏 + 三区 CSS 不含 `#composer`）。
3. **四处兜底入口已全部收敛到卡内**（`revealAskFallback()`），但 `#composer` 被**附带** reveal（`revealAskFallback → l0.revealFallback`）——收敛问题**只剩「停止附带 reveal 流外面」这一处**。
4. **R6 队列语义与输入面位置解耦**（裁决在 SW `turn-queue.ts`），但**唯一用户入口与草稿回填载体都绑在 composer**（`sidepanel.ts:3756` 是 `requestTurn(` 恰 2 的第二处；`:3984-3991` 回填 `#input`）。
5. **法四默许流外按需输入框**：旧法四只禁「常驻」，未禁「流外按需」（Q-IAN-005）。

**⇒ 本 Feature 的验收锚 = 让「自由输入」在流内**可达、可提交、可排队、可回填**，并让流外面**真退役后门禁强度不降**（承作者裁决逐字：「不应该存在单独的输入框」）。**

### 2.2 目标架构（跨切）

```
packages/web-cli-plugin/src/ui/sidepanel/            ←【A 列 / 计账】
├── next-registry/
│   ├── providers.ts        ←【改，叶1】`free-input` provider 行 + `DRIVER_DECLS_SRC` 一条（chips:['free-input']）
│   ├── dispatch.ts         ←【改，叶1】`SET_A_PROTOCOL_ACTIONS` +`'free-input'`（8→9）；`ACT_TO_OP` **逐字不动**（仍恰 6）
│   └── ai-drive.ts         ←【改，叶1】`MANUAL_DRIVER_ID` 单源常量（手输 / AI 两值可判）
├── recommend.ts            ←【改，叶1】末端项注入（单源）+ 零死端 floor；`NEXTSTEP_PRIORITY` **逐字不动**（仍 4）
├── cards/
│   ├── nextstep.ts         ←【改，叶1】末端项渲染（`.next-chips` 之后；**非** `.next-chip` ⇒ 不被 pending 禁用）
│   └── askuser.ts          ←【改，叶1/2】`free-input` 卡内输入语义分支（复用 `.ask-fallback` 家系；幂等查询）
├── sidepanel.ts            ←【改，叶1/2】`openFreeInputCard` + `handleCardAction` 分支 + 手输 trace/让位 + 流内回填 + 停引/删面/重锚
├── l0/shell.ts             ←【改，叶2】`revealFallback/hideFallback` 只操作卡内（去流外 `composer.hidden` 写点）
├── index.html              ←【改，叶2】删 form/input/button + 6 条 CSS + 出流注释（→ `dist/sidepanel.html`，**不进 sidepanel.js 账本**）
├── disclosure.ts           ←【改，叶2】`NEVER_FOLDABLE` 去 `'composer'`（14 → 13）
├── host-registry.ts        ←【改，叶2】PRESERVED 去三项 + `RETIRED_CONTAINER_IDS` 13 → **16**
├── view-model.ts           ←【改，叶1/2】引导文案改指 + `sendDisabled` / `AskFlowView` 语义锚
└── stream-render.ts        ←【改，叶2】陈留注释同步
```

**七条结构性不变量**（本 Feature 的验收骨架，ADR 逐条落地）：

| # | 不变量 | 判据 | 承载 ADR |
|:-:|---|---|---|
| I1 | **自由输入在流内可达且恒最末** | 末端项存在 ∧ 恒为推荐卡最末 ∧ 无候选时仍可达（零死端） | ADR-IAN-001 |
| I2 | **输入载体唯一 + 提交点唯一** | 卡内 `.ask-fallback` 恰 1 载体；`requestTurn(` 恰 1（`op.turn` 槽）；第二载体 / 第二提交点 ⇒ FAIL | ADR-IAN-002 |
| I3 | **手输可判** | `driver=manual` ≠ AI driver id；`MANUAL_DRIVER_ID ∉ listDriverDecls()`；同值 / AI 代答 ⇒ FAIL | ADR-IAN-002 |
| I4 | **R6 零回归** | 队列语义 diff=0；入口与回填迁流内；不丢原话 / 不覆盖 / 有可读行 / 卡收起重展开 | ADR-IAN-003 |
| I5 | **流外零输入面（真退役非 hidden）** | 三 id DOM 零命中 ∧ `#composer` ∈ `RETIRED_CONTAINER_IDS`（16）∧ 注入必红 | ADR-IAN-004/005/008 |
| I6 | **立法与门禁一致且不降强度** | 法四三处一致 + old→new 台账；18 门禁三态齐；断言计数只增；`CHROMIUM_GATES === 9` | ADR-IAN-006/008 |
| I7 | **保护段纪律 + 体积分列** | journey 八步取代或 binding keep 字节中立；`KIND_SET` 40 / 冻结面零容差；A×1.15 ≤ 余量 | ADR-IAN-007/010 |

### 2.3 数据流与依赖（跨切）

| 面 | 变更方向 | 关键契约 |
|---|---|---|
| 推荐卡 | 新增**恒最末终端项**（`data-act='free-input'`，非 `.next-chip`） | 由 `recommendNextStep` 单点注入；`MAX_CHIPS_PER_CARD=3` 逐字不动；`MAX_NEXTSTEP_CARDS_PER_ROUND=1` 不动 |
| 卡内输入 | **复用** `askuser` kind 的 `.ask-fallback` 家系（`#ask-fallback`/`#ask-input`/`#ask-submit`/`#ask-cancel`） | 独立 `requestId='free-input'` 语义；`askKind:'text'` 出生即展开 + focus；零第二 DOM 路径 / 零新 id 家系 |
| 回合发起 | 手输提交经 **`op.turn` 槽**（`bindPanelOps.turn → requestTurn`） | `requestTurn(` 叶1 仍 2 / 叶2 恰 1；不新增注册表外直连；不新增 op |
| 手输语义 | `noteUserTurn()`（让位 + 静默期）**在槽外** | 不得移入 `requestTurn`（否则锁住 AI 答案后续流）；driver 留痕 `driver=manual` 只含字段名 |
| 排队 / 回填 | SW 有界队列**零改动**；入口 + 回填载体迁流内 | `queued`/`busy-rejected` 文案逐字保留；回填仅当为空 + 卡收起重展开 |
| 流外面 | **真退役**（DOM 移除） | 双写者 / 锁存 / 设置态漏隐藏**结构性消解**；`#send-reason` 保留（状态提示 ≠ 输入面） |
| 立法 | 法四**原地修订**（三处一致） | old→new 逐字入台账；不升格法十；老 `redlineRemap ≥3` 逐字保留 |
| 门禁 | 18 门禁三态重锚 + 2 新 node 门禁 | 断言零删除零降级、计数只增；`CHROMIUM_GATES === 9` 不动 |
| 保护段 | journey **八步取代** / binding **keep** | journey 段内 `#15c` 必改（`composerExists===true` 语义互斥）；binding 段内零读面 ⇒ 段前等长补偿 |
| 体积 | 分列预算 + 逐叶重登记 | 距档 22,454 B；EC-IAN-016 预置；`authorConfirmation` 不得伪称已确认 |

### 2.4 九条设计任务的定案（编排器任务书 1~7 + PD-IAN-001~009 的正面回答）

> 完整论证见对应 ADR；此处给出**结论 + 判据锚**，供 tasks 阶段直接引用。

| # | 任务 | **定案** | 判据锚 |
|:-:|---|---|---|
| 1 | **「自由输入…」provider 形态** | 新注册 provider `free-input`（`when` 恒真）；**不改 `NEXTSTEP_PRIORITY`**；由 `recommendNextStep` **单点注入**为推荐卡**恒最末终端项**；无候选时铸造仅含该终端的最小卡（**零死端**）；`data-act='free-input'` = **集 A 卡族协议动作**（`SET_A_PROTOCOL_ACTIONS` 8→9），**不进 `ACT_TO_OP`（仍恰 6）**；与「其他…（我来描述）」属**不同卡的终端**（同屏各为其卡末项）；不常驻 / 零新增 kind | FR-IAN-010~014；FIN-1/FIN-2；`next-dispatch-diff0` D0-5/D0-7 等价重锚 | ADR-IAN-001 |
| 2 | **卡内输入实现（PD-IAN-002）** | **复用 `.ask-fallback` 家系（id/class/互斥/focus 全复用）+ `askuser` kind 内第二**语义**分支**（独立 `requestId='free-input'`）；**不与 `ensureTextAskCard` 合流**（后者只认 `ref-describe`）；判据 = 「零第二套机制 / `#ask-input` 文档级唯一 / 第二 id 家系会撞唯一载体」 | FR-IAN-011/015/017；NFR-IAN-014 | ADR-IAN-002 |
| 3 | **提交通道与 `requestTurn` 重锚** | 提交经 `op.turn` 槽（`dispatchChipAction('op.turn', text)` → `bindPanelOps.turn` → `requestTurn`）；**叶1 恰 2 / 叶2 恰 1**；唯一生产输入提交点 = `op.turn` 槽；等价重锚 = `OP_CALLSITE_SET.op.turn.callSites 2→1` + `requestTurnProblems` 判据更新 + 反证 | FR-IAN-020/021/085；N-IAN-022 | ADR-IAN-002 / 008 |
| 4 | **手输 / AI 驱动区分（PD-IAN-003）** | 单源常量 `MANUAL_DRIVER_ID='manual'`（`ai-drive.ts`）；承载面 = **既有留痕行**（`driverTraceLine` 复用，零新字段）；判据 = 两值不同 + `MANUAL_DRIVER_ID ∉ listDriverDecls()` + AI 不写 `manual` + 同值必红；让位语义在手输路径、**槽外** | FR-IAN-022~024；N-IAN-023；EC-IAN-013/018 | ADR-IAN-002 |
| 5 | **R6 排队迁移** | 在飞时终端项**不被 pending 禁用**（非 `.next-chip`）；提交 → SW 有界队列（语义零改）；回填**从 `#input` 迁到卡内输入**（仅当为空；**卡收起 ⇒ 重展开**）；叶1 双载体并存 / 叶2 唯一化；TA-4 重锚（**删回填仍必红**） | FR-IAN-030~034；N-IAN-026；X-IAN-7 | ADR-IAN-003 |
| 6 | **ian-2 废除面执行序** | **停引 → 删面**：① 停 `l0.revealFallback` 的流外写入（保留调用）② DOM/CSS 退役 ③ 写者消解（`syncComposerVisibility`/`fallbackOpen`/`#send` writer）④ 登记退役（`NEVER_FOLDABLE` 14→13；`RETIRED_CONTAINER_IDS` 13→**16**；PRESERVED 去三项）⑤ 重锚（`#send-reason`/`sendDisabled`/draft/引导）⑥ 通道唯一化 ⑦ 立法 ⑧ 门禁/保护段/S0''/体积 | FR-IAN-040~049；PD-IAN-006/007/008 | ADR-IAN-004 / 005 |
| 7 | **保护段决策（PD-IAN-009 / COR-IAN-1）** | **journey `43054..58287` = 八步显式取代**（段内 ≥10 处 `composer`，含 `#15c` 的 `composerExists===true` ⇒ 语义互斥，**不可能字节中立**）；**binding `107780..115930` = keep 字节中立**（段内零 `composer`/`#input`/`#send`，全部相关读面在段前 <107780 ⇒ 等长补偿）；**先判后选**（判据 = 本轮只读探针） | FR-IAN-103；N-IAN-015；AC-IAN-021 | ADR-IAN-007 |
| 8 | **门禁重锚清单** | 18 门禁（node 10 + Chromium 8）**三态齐**逐条处置（ADR-IAN-008 表）；**2 新 node 门禁** `free-input-next` / `law4-input-as-next`（判据 + 反证 + 三段控制 + 真源切片）入 `gate-integrity` 下界（只增）；**`CHROMIUM_GATES === 9` 不动**（Chromium 面只加断言不加文件） | FR-IAN-100~106；N-IAN-012·019·024 | ADR-IAN-008 |
| 9 | **S0'' 双面验证设计** | 终态 10 步（S0''-1~10）node + Chromium 双面、**样本单源**（`s0-chain.mjs` 扩展，不新增样本文件）+ **中间态保护**（ian-1 双入口各跑通一轮 + 反证；ian-2 旧面**零可达**「元素不存在非 hidden」机核 + 注入必红）+ 反证必实跑逐字节还原 + 人工面 `⏳ 未执行` | FR-IAN-070~074；AC-IAN-001/027；R-IAN-909 | ADR-IAN-009 |
| 10 | **体积分列预算** | A 列 ian-1 **+2.5~4.5 KB** / ian-2 **−2.5~−1.0 KB（目标净负）**（严格口径 −1.2~+0.3 KB，见 ADR §③）；Σ×1.15 = **−0.0~+4.0 KB ≤ 距档 22,454**（正常）；2.8× 最坏 **15.4 KB < 22,454**；逐模块归因禁跨叶混算；**EC-IAN-016 预置** | FR-IAN-110~115；AC-IAN-025；N-IAN-013 | ADR-IAN-010 |

### 2.5 PD-IAN-001~009 裁决汇总

| PD | 问题 | 裁决 | 落点 |
|---|---|---|---|
| **PD-IAN-001** | 「自由输入…」触发的精确候选集合 / 与其他 provider 的次序 | **不作为独立 rule 候选**（避免「第 5 rule 永不渲染」死形态）；由 `recommendNextStep` 注入为**恒最末终端项**；无候选时 floor 铸卡 | ADR-IAN-001 §① |
| **PD-IAN-002** | 卡内输入复用 `#ask-*` 家系 vs 同 kind 第二渲染分支 | **复用 `.ask-fallback` 家系 + `askuser` kind 内第二**语义**分支**（`requestId='free-input'`）；零第二 id 家系 / 零第二 DOM 路径 | ADR-IAN-002 §① |
| **PD-IAN-003** | 手输 driver 字段字面量与承载面 | `MANUAL_DRIVER_ID='manual'`（`ai-drive.ts` 单源）；承载 = 既有留痕行（零新字段）；两值不相交 + 同值必红 | ADR-IAN-002 §③ |
| **PD-IAN-004** | 与「其他…（我来描述）」同卡并存的互斥披露口径 | 二者属**不同卡的终端**（推荐卡 vs 问询卡）⇒ 无同卡并存；同屏各为其卡末项；唯一共同约束 = 密度上界（不越 6 / 8 / 7·15·9·20·17·35 逐字不动） | ADR-IAN-001 §③ |
| **PD-IAN-005** | 是否需新 `data-act` 名 | **需**：`data-act='free-input'`，为**集 A 卡族协议动作**（`SET_A_PROTOCOL_ACTIONS` 8→9），**不进 `ACT_TO_OP`**（仍恰 6）；FR-IAN-010 的「落在 `ACT_TO_OP` 单源」读作「分发经唯一两集模型，零第二 act→op 表」（显式登记该读法） | ADR-IAN-001 §② |
| **PD-IAN-006** | draft 保持：重锚 vs 显式退役 | **重锚**到流内输入载体（`getDraft/setDraft` 读写 free-input 卡 `#ask-input`；无卡 ⇒ `''`/空写）；保留可用性能力；`settings.test.ts:191` 等价重锚 | ADR-IAN-005 §④ |
| **PD-IAN-007** | 兜底收敛是否删 `revealAskFallback` 的 `l0?.revealFallback()` 调用 | **保留调用**，让 `l0/shell.ts` 只操作卡内（去流外写入）⇒ 调用链零流外面、输入面唯一；不改变既有调用图 / 门禁选择器 | ADR-IAN-005 §① |
| **PD-IAN-008** | `RETIRED_CONTAINER_IDS` 精确新下界 | **13 → 16**（`#composer` / `#input` / `#send` 三 id **全部入册**，逐 id 可判「真退役 ≠ hidden」）；`RETIRED_HOST_ATTRS` 宿主值 4 项**逐字保留** | ADR-IAN-005 §⑥ |
| **PD-IAN-009** | journey / binding 保护段最终决策 | journey = **八步取代**；binding = **keep 字节中立**（先判后选，判据见 ADR-IAN-007 §背景探针表） | ADR-IAN-007 |

### 2.6 红线继承表（N-IAN-001~028 逐条）

> N-IAN-001~020 承父 spec §13.1（编成）；N-IAN-021~028 承 §13.2（spec 新增）。「继承动作」= 本 Feature 如何**逐条不退化**。

| # | 红线（要点） | 继承动作 | 承载 ADR |
|---|---|---|---|
| N-IAN-001 | `content.js` **177,076 B** / `52a82620…`（零容差） | **不动**（零 `src/content/**` 改动） | IAN-010 |
| N-IAN-002 | `pick-layer.js` **34,358 B** / `77796bab…`（零容差） | **不动** | IAN-010 |
| N-IAN-003 | `KIND_SET` **40** 逐字不增；新消息族走 type-only | **逐字不动**（末端项 / 卡内输入均为**既有 kind** 的加法字段） | IAN-001/002 |
| N-IAN-004 | 12 kind 契约不动；`REGISTERED_STRUCTURAL_HOSTS=[]` | **逐字不动**（复用 `nextstep` / `askuser` kind） | IAN-001/002 |
| N-IAN-005 | 上游产物零改写；**唯一授权例外 = 法四原地修订 + 台账** | **逐字遵守**（仅 `v4-chat/spec.md` 三处） | IAN-006 |
| N-IAN-006 | 法四修订必须走 supersession 台账 old→new | **逐字遵守**（四落点 + 三处一致） | IAN-006 |
| N-IAN-007 | `packages/web-cli-base/**` 零 diff | **逐字遵守** | §7 |
| N-IAN-008 | `turn-queue.ts` 三分支零改动；只迁移入与载体 | **逐字遵守**（diff = 0） | IAN-003 |
| N-IAN-009 | 法八四面零明文（输入文本仅走 `chat` `user` 载荷） | **不退化**（卡固化只写 FACT；留痕只含字段名） | IAN-002/009 |
| N-IAN-010 | 零新增卡类型（第 13 种） | **逐字不动**（复用 `askuser` + `.ask-fallback`） | IAN-002 |
| N-IAN-011 | 法四「默认屏无常驻输入框」不退化；本 Feature **加严**为「流外零输入面」 | **加严落地** | IAN-004/008 |
| N-IAN-012 | 断言零删除零降级、计数只增（例外 = 保护段显式取代 + 台账） | **逐字遵守**（18 门禁三态） | IAN-008 |
| N-IAN-013 | `authorConfirmation=pending-author-line` 属未闭合义务 | **保持占位、不伪称** | IAN-010 |
| N-IAN-014 | F-29 保持原样不动（ROADMAP 区段一字不动） | **不动** | §7 |
| N-IAN-015 | 保护段逐段决策；哈希变更必须台账、禁静默 | **逐字遵守**（journey 八步 / binding keep） | IAN-007 |
| N-IAN-016 | 特权 op 恰 2 恒 gesture；SW 永不 `.request(` | **逐字保留**（输入面不触达） | IAN-002 |
| N-IAN-017 | consent / gesture 不得被 AI 代答（含手输变体）；`op.turn` auto 档语义不退化 | **注入必红**（FIN-4 / EC-IAN-018） | IAN-002 |
| N-IAN-018 | 判定链（`policy.ts`/`auto-authorize.ts`）零触碰 | **不动**（`zeroDiffFiles` pin） | §7 |
| N-IAN-019 | 门禁严格串行；`CHROMIUM_GATES === 9` 不动 | **逐字遵守**（只加 node 门禁） | IAN-008 |
| N-IAN-020 | 纪律：不碰 main / 不 force push / path-limited add / 无新依赖 / `.sddu` 外零触碰 | **逐字遵守** | §7 |
| N-IAN-021 | 流内输入面**唯一**（恰 1 载体）；任何第二输入面 ⇒ FAIL | **唯一载体**（卡内 `.ask-fallback`） | IAN-002 |
| N-IAN-022 | 生产输入提交点**唯一**（`requestTurn(` 恰 1） | **恰 1**（叶2） | IAN-002/008 |
| N-IAN-023 | 手输可判（driver 两值不同）；同值 / AI 代答 ⇒ FAIL | **两值可判 + 注入必红** | IAN-002 |
| N-IAN-024 | 法四门禁必绿且**禁恒真**（双向反证 + 三段控制） | **判据形态 = law7x-ext/law9 同形** | IAN-008 |
| N-IAN-025 | **真退役（非 hidden）**：三 id 不得以任何形态存在于 DOM | **DOM 零命中 + 注入必红** | IAN-004/008 |
| N-IAN-026 | 回填三语义不退化（不丢原话 / 不覆盖 / 有可读行） | **逐条判据 + 删回填仍必红** | IAN-003 |
| N-IAN-027 | 中间态不破坏现网（ian-1 双入口均可用） | **S0''-A 独立验收** | IAN-009 |
| N-IAN-028 | `#send-reason` 保留面判据非恒真（必须在 `#region-statusbar` 内） | **保留 + 等价重锚** | IAN-005 |

### 2.7 明确「不动面」清单（逐项）

| # | 不动面 | 守线方式 |
|:-:|---|---|
| T1 | `src/content/**` / `dist/content.js` / `dist/pick-layer.js` | 零改动（`git diff` 零行；`stat` + sha256 前后一致） |
| T2 | `KIND_SET`（40）/ 12 kind / `BORN_FROZEN_KINDS` / `STREAM_TERMINALS` / `BLOCKED_TERMINALS` / `MAX_OPEN_ASKS` | 逐字零新增 |
| T3 | 判定链（`policy.ts` / `auto-authorize.ts`）/ `zeroDiffFiles` 哈希 pin | 零触碰 |
| T4 | `manifest.json` | **零 diff**（零新权限） |
| T5 | `packages/web-cli-base/**` | 零改动（`insight-no-escalation:147` 必绿） |
| T6 | `src/background/turn-queue.ts` / `service-worker.ts` 裁决面 | **零 diff** |
| T7 | `ACT_TO_OP`（恰 6 行）/ `OP_TO_ACT` / `OPS_BY_ID` / 9 op 清单 | 零新增 op / act 映射 |
| T8 | `NEXTSTEP_PRIORITY`（恰 4 项）/ `MAX_CHIPS_PER_CARD=3` / `MAX_NEXTSTEP_CARDS_PER_ROUND=1` | 逐字不动 |
| T9 | 密度阈值 **7/15 · 9/20 · 17/35** / `MAX_CLICKABLES_PER_CARD=6` / `MAX_STREAM_RESIDENT_CLICKABLES=8` | 逐字不动（本 Feature 只增断言） |
| T10 | `#send-reason`（状态栏保留载体）/ `#rebind` | 保留且判据非恒真 |
| T11 | `body.settings-open` 三区 CSS（`index.html:670-672`） | 逐字不变 |
| T12 | `F-29` ROADMAP 区段 / `ROADMAP.md` 全文件 | 零 diff（v0.11.2 登记留收口） |
| T13 | v1~v5.5.1 / R6 的 SDDU 产物与 `test/size-baseline.ts` 历史条目 | 只**追加**，不改写历史 |
| T14 | `design/**`（F 双 + G 双 sha） | 零改动 |
| T15 | 既有门禁 | 只允许**追加**与**等价重锚**（`CHROMIUM_GATES === 9` 不动） |

---

## 3. 方案对比

> 10 条 ADR 各自的「选项 / 裁决 / 后果」见 `ADR-IAN-001~010-*.md`。此处只做**总体方案**取舍（编排任务书的三个候选形态）。

| 维度 | **方案 A：既有注册表内扩张 + 卡内终端 + `op.turn` 槽（推荐）** | 方案 B：新增「自由输入」op / kind + 独立输入卡 | 方案 C：保留 composer 只修 D-A/B/C |
|---|---|---|---|
| 描述 | 新 provider 产末端项；卡内输入复用 `.ask-fallback` 家系（`askuser` 第二语义分支）；提交复用 `op.turn` 槽；流外面真退役 | 新增 `op.free-input` / 新卡 kind / 新 id 家系承载自由输入；流外面退役 | 只修双写者 / 锁存 / 设置态漏隐藏，保留 `#composer` |
| 优点 | 零新 op / 零新 kind / 零第二 act 表；`MAX_CHIPS_PER_CARD` / 密度阈值 / `requestTurn(` 计数全部零改或只减；S0'' 与 F-34 之 S0′ 同地位 | 概念边界直观；输入卡可独立演进 | 改动最小、风险最低 |
| 缺点 | 需 `recommendNextStep` 单点注入 + 一个集 A 动作（`data-act='free-input'`）⇒ 2 个既有门禁等价重锚（D0-5/D0-7） | **撞 N-IAN-003/004/010**（新 kind ⇒ `KIND_SET` / 12 kind 红）+ 新 op（NG-IAN-014）+ 第二输入载体（N-IAN-021） | **零机核**（作者裁决未交付）；D-A/B/C 只是「面存在」的症状，修缺陷保面 = 违背「不应该存在单独的输入框」；中间态永不到终态 |
| 风险 | R-IAN-001~013（逐条有承载） | 载体被撞（R-IAN-008）+ 第二输入面（R-IAN-907）+ 体积上界失控 | 主题级需求落空；AC-IAN-002/005/008 无承载 |
| 工作量 | 2 叶 / 6 波 / ~50 任务（串行） | 3 叶 / ~12 波（**越界**：新载体需新门禁与台账面） | 1 叶 / ~3 波，**不达标** |

## 4. 推荐方案

**推荐：方案 A**。

**理由**：

1. **唯一同时满足全部硬约束**：零新 op（NG-IAN-014）/ 零新 kind（N-IAN-003/004/010）/ `ACT_TO_OP` 恰 6（T7）/ 单卡（T8）/ 唯一载体与唯一提交点（N-IAN-021/022）—— 方案 B 一旦新增 op/kind/载体即红。
2. **形态与既有先例同构**：「其他…（我来描述）」已是「卡内终端项 + 就地展开输入」的可用先例（`decision-region.ts:162-170` / `askuser.ts:71-86,263-300`）⇒ 本 Feature 是**同构搬用**而非新造机制。
3. **R6 与队列语义解耦**：裁决在 SW（`turn-queue.ts` 零 diff），只需迁入口与回填载体 ⇒ 修复成果零回归、改动面最小。
4. **中间态安全可证**：先立新面（叶1 双入口并存）再拆旧面（叶2 唯一化）⇒ 无「无输入可用」窗口，S0''-A 独立验收。
5. **验证诚实**：S0'' 双面机器化（样本单源 + 双向反证 + 真源切片）；保护段「先判后选」（journey 八步 / binding keep）；体积严格口径如实登记（含「删 DOM/CSS 不进 sidepanel 账本」这一口径）。

---

## 5. 聚合文件影响分析

> 操作：**NEW** 新增 / **MODIFY** 修改 / **DELETE** 删除 / **NOOP** 显式零改动（登记）。共 **≈36 项**（src 11 / test 15 / docs 2 / SDDU 8）。

### 5.1 `src/**`（11 项）

| 操作 | 文件路径 | 说明 | 列 | 叶 |
|:--:|---|---|:--:|:--:|
| MODIFY | `src/ui/sidepanel/next-registry/providers.ts` | `free-input` provider 行 + `DRIVER_DECLS_SRC` 一条（`chips:['free-input']`；`when` 恒真） | A | 1 |
| MODIFY | `src/ui/sidepanel/next-registry/dispatch.ts` | `SET_A_PROTOCOL_ACTIONS` +`'free-input'`（8→9）；`ACT_TO_OP` **逐字不动** | A | 1 |
| MODIFY | `src/ui/sidepanel/next-registry/ai-drive.ts` | `MANUAL_DRIVER_ID='manual'` 单源常量 | A | 1 |
| MODIFY | `src/ui/sidepanel/recommend.ts` | 末端项注入（单源）+ 零死端 floor + payload 布尔字段；`NEXTSTEP_PRIORITY` 不动 | A | 1 |
| MODIFY | `src/ui/sidepanel/cards/nextstep.ts` | 末端项渲染（`.next-chips` 之后；非 `.next-chip`） | A | 1 |
| MODIFY | `src/ui/sidepanel/cards/askuser.ts` | `free-input` 卡内输入语义分支（复用家系；幂等查询） | A | 1 / 2 |
| MODIFY | `src/ui/sidepanel/sidepanel.ts` | `openFreeInputCard` + `handleCardAction` 分支 + 手输 trace/让位 + 流内回填 + 停引/删面/重锚/钩子 | A | 1 / 2 |
| MODIFY | `src/ui/sidepanel/l0/shell.ts` | `revealFallback/hideFallback` 只操作卡内（去流外写点） | A | 2 |
| MODIFY | `src/ui/sidepanel/index.html` | 删 form/input/button + 6 条 CSS + 出流注释（→ `dist/sidepanel.html`，**不进 sidepanel.js 账本**）；三区 CSS 不动 | A | 2 |
| MODIFY | `src/ui/sidepanel/disclosure.ts` / `host-registry.ts` / `stream-render.ts` | `NEVER_FOLDABLE` 14→13；PRESERVED 去三项 + `RETIRED_CONTAINER_IDS` 13→16；注释同步 | A | 2 |
| MODIFY | `src/ui/sidepanel/view-model.ts` | 引导文案改指 + `sendDisabled` / `AskFlowView` 语义锚 | A | 1 / 2 |
| **NOOP** | `packages/web-cli-base/**` / `src/content/**` / `src/background/**` / `manifest.json` | **零 diff**（显式登记） | — | 各叶 |

### 5.2 `test/**`（15 项）

| 操作 | 文件路径 | 说明 | 叶 |
|:--:|---|---|:--:|
| NEW | `test/free-input-next.test.ts` | 新面 + 通道 + 手输 + 回填 + 零死端 + 法八（FIN-1~8 + 反证 + 三段控制） | 1 |
| NEW | `test/law4-input-as-next.test.ts` | **法四机核**（L4-1~6：DOM 零命中 / 入册 / 默认屏零可见 / 卡内可用 / 禁恒真 / 真源切片） | 2 |
| MODIFY | `test/op-wiring.test.ts` | `requestTurn(` 恰 2 → 恰 1（`OP_CALLSITE_SET.op.turn 2→1`）+ 反证 | 2 |
| MODIFY | `test/turn-arbitration.test.ts` | TA-4 回填载体 → 流内（删回填仍必红） | 1 / 2 |
| MODIFY | `test/r6-ty-experience-fix.test.ts` | 在飞不硬禁用 → 流内输入面（等价重锚） | 2 |
| MODIFY | `test/sidepanel-view.test.ts` | `:115-120` / `:281` / `:657-659` 等价重锚 | 2 |
| MODIFY | `test/density-thresholds.test.ts` | `:389-409` / `:754-776` / `:787-814,864` 等价重锚 | 2 |
| MODIFY | `test/host-registry.test.ts` | 容器册 13 → 16 + `TEST_RETIRED_CONTAINER_IDS` 同步 | 2 |
| MODIFY | `test/supersession-ledger.test.ts` | X-IAN-1 一致性 + 老 remap 保留 + journey 新 pin 链 + binding keep | 2 |
| MODIFY | `test/settings.test.ts` | `:191` draft 载体重锚 | 2 |
| MODIFY | `test/size-baseline.ts` | 逐叶五要素重登记 + V3-VOL-3 三值 + 逐模块行 | 1 / 2 |
| MODIFY | `test/gate-integrity.test.ts` | `EXPECTED_AUDITED_FILES` 只增 2；`CHROMIUM_GATES === 9` 不动 | 1 / 2 |
| MODIFY | `test/next-dispatch-diff0.test.ts` | D0-5 / D0-7 等价重锚（集 A 只增 + known 集扩张） | 1 |
| MODIFY | `test/l0-disclosure.test.ts` | `NEVER_FOLDABLE.length` 14 → 13（非恒真） | 2 |
| MODIFY | `test/ui/{insight,journey,l0,binding,recommendation,s0-self-driven}.mjs` + `test/ui/fixtures/s0-chain.mjs` | 6 Chromium 门禁等价重锚 + 样本扩展（**只加断言不加文件**） | 1 / 2 |

### 5.3 `docs/**` 与配置（2 项）

| 操作 | 文件路径 | 说明 |
|:--:|---|---|
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` | `xIanLedger`（X-IAN-1~11 逐条）+ journey 新 pin / binding keep + `redlineRemap` 追加 + `modifiedRanges` |
| MODIFY | `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v4-chat/spec.md` | **唯一授权例外**：法四三处原地修订（`:116`/`:225`/`:385`；叶2 执行） |
| **NOOP** | `.sddu/specs-tree-root/ROADMAP.md` / `manifest.json` / `package.json`（无新依赖）/ `.opencode/opencode.json` | 零 diff（v0.11.2 登记留收口） |

### 5.4 SDDU 本 Feature 目录（8 项）

| 操作 | 文件路径 |
|:--:|---|
| NEW | `plan.md`（本文件） |
| NEW | `ADR-IAN-001` ~ `ADR-IAN-010`（10 项） |
| NEW | `specs-tree-ian-1-free-input-next/plan.md` |
| NEW | `specs-tree-ian-2-abolish-composer/plan.md` |
| MODIFY | `state.json`（父）+ 2 叶 `state.json`（phase → `planned`；phaseHistory 追加） |
| MODIFY | `TREE.md`（父 + 2 叶，由 `sddu-tree` 定向更新） |

---

## 6. 风险评估

### 6.1 继承风险（discovery R-IAN-001~013 + spec R-IAN-901~910）

| # | 风险 | 等级 | 缓解（⇒ 承载 ADR） |
|---|---|:--:|---|
| R-IAN-001 | **门禁 / 保护段重锚纪律被破坏**（最高危） | **高** | 18 门禁三态先出清单再动面；journey 八步 / binding keep 字节中立；断言计数只增（IAN-007/008） |
| R-IAN-002 | **R6 排队 / 草稿回填回归** | **高** | 入口迁流内 + 回填迁卡内（不覆盖 + 卡收起重展开）；TA-4 重锚非删除（IAN-003） |
| R-IAN-003 | **`requestTurn(` 恰 2 与废面冲突** | **高** | 显式取代 X-IAN-6（恰 1 + 反证）；不得静默改数（IAN-002/008） |
| R-IAN-004 | **`op.turn` auto 档 vs 手输语义混淆** | **高** | `driver=manual` 两值不相交 + AI 不写 manual + 同值必红（IAN-002） |
| R-IAN-005 | **体积越档位**（距档仅 22,454） | **中高** | 分列预算 + 15% 缓冲 + 2.8× 最坏预置；逐叶重登记；EC-IAN-016 + 作者一行（IAN-010） |
| R-IAN-006 | **法四台账不完整**（老 `redlineRemap ≥3` 不得删） | **中高** | 老条目逐字保留 + 新增条目；三处一致判据（IAN-006） |
| R-IAN-007 | **法八被输入卡撞破** | **中高** | 输入文本仅走 `chat` `user`；固化只写 FACT；`law8` 零降级（IAN-002/009） |
| R-IAN-008 | **`KIND_SET` 40 / 12 kind / 零宿主被撞** | **高** | 复用 `askuser` + `.ask-fallback`；加法字段非新 kind（IAN-001/002） |
| R-IAN-009 | **a11y focus 断裂**（`#input` 是既有 focus 目标） | **中** | focus 落卡内（`askuser.ts:71-86` 先例）+ 无悬空焦点断言（IAN-002/009） |
| R-IAN-010 | **e2e / binding 诊断面牵动 + 保护段** | **中高** | 诊断面替换 + 真实键入等价（不删路径）；binding 保段 keep 字节中立（IAN-007/008） |
| R-IAN-011 | **`#send-reason` / `buttonStates` 耦合面误删** | **中** | 保留 + 判据非恒真（IAN-005） |
| R-IAN-012 | **`KL-N-10` flake 被误读为回归** | **低—中** | 隔离复跑 ≥2 + 如实记录不阻塞收口（IAN-008） |
| R-IAN-013 | **方案先行** | **中高** | O-IAN 已全裁决；PD-IAN-001~009 在本计划 §2.5 显式裁决 |
| R-IAN-901 | **中间态被跳过** ⇒ 「无输入可用」窗口 | **高** | 叶1 不删面；S0''-A 双入口必绿（IAN-009） |
| R-IAN-902 | **「真退役」被实现成 `hidden` / 迟挂载** | **高** | DOM 零命中 + 注入 `#composer` ⇒ 必红（IAN-004/008） |
| R-IAN-903 | **法四判据被写成恒真** | **中高** | 三段控制 + 双向反证 + 真源切片（IAN-008 §②） |
| R-IAN-904 | **卡内复用导致「描述」语义被改** | **高** | 反证「`op.describe` 有值相发起回合 ⇒ 必红」（IAN-002） |
| R-IAN-905 | **回填实现成「覆盖用户新输入」** | **中高** | 仅当为空 + 非空只留痕；判据双向（IAN-003） |
| R-IAN-906 | **手输 driver 与 AI 同值** | **中高** | 逐行两值断言 + 同值必红（IAN-002） |
| R-IAN-907 | **「第二输入面」以新形态回归** | **中高** | N-IAN-021「唯一载体」判据（第二载体 ⇒ FAIL）（IAN-002） |
| R-IAN-908 | **ian-2 净值非负却谎报净负** | **中高** | 逐模块归因 + 严格口径登记为负或显式说明非负（IAN-010 §③） |
| R-IAN-909 | **S0'' 被写成「脚本绿」而非「链路可判」** | **中高** | 真源切片 + 双向反证（IAN-009） |
| R-IAN-910 | **18 门禁处置「看起来齐」但漏项** | **中高** | 按断言 / 选择器逐条 + 三态齐 + 间接面对账面（IAN-008） |

### 6.2 plan 新增风险（R-IAN-911~922）

| # | 风险 | 等级 | 缓解 |
|---|---|:--:|---|
| R-IAN-911 | **末端项与既有 chips 争位**：把终端算进 `MAX_CHIPS_PER_CARD` ⇒ 既有 3-chip 规则卡被截断 ⇒ 既有门禁（chip 数）红 | 中高 | 终端**不进** chips 预算（独立 `data-act`，非 `.next-chip`）；`MAX_CHIPS_PER_CARD=3` 逐字不动（IAN-001） |
| R-IAN-912 | **`free-input` 被做成独立 rule 候选** ⇒ 因 `MAX_NEXTSTEP_CARDS_PER_ROUND=1` 永不渲染（假可达） | 中高 | **不改 `NEXTSTEP_PRIORITY`**；由 `recommendNextStep` 注入末项 + floor 铸卡（IAN-001） |
| R-IAN-913 | **`data-act='free-input'` 被误当作 opId** ⇒ `dispatchChipAction` 查表失败 / D0-7 悬挂 | 中高 | 集 A 协议动作（`handleCardAction` 处理）+ D0-7 known 集等价重锚（IAN-001/008） |
| R-IAN-914 | **`free-input` 卡与 `ref-describe` 卡共用 `requestId`** ⇒ 提交误走本地结算（变成「描述」） | **高** | 独立 `requestId='free-input'` + 独立存在性判定；反证「共用 ⇒ 必红」（IAN-002） |
| R-IAN-915 | **手输提交新增 `requestTurn(` 直连**（绕过槽） | 高 | 提交经 `dispatchChipAction('op.turn')`；FIN-3 计数不增判据（IAN-002） |
| R-IAN-916 | **集 A 分支在 `handleCardAction` 引入集 B 字面量** ⇒ D0-1 红 | 中 | 分支只比对 `'free-input'` + 调本地 helper；D0-1 继续承重（IAN-001） |
| R-IAN-917 | **`index.html` 删面被误算入 sidepanel 体积** ⇒ 预算结论失真 | 中高 | ADR-IAN-010 §③ 显式登记（`copyFile` 独立产物）+ 严格口径登记（IAN-010） |
| R-IAN-918 | **journey `#15c` 只删不断言**（把 `composerExists` 断言拉掉充「重锚」） | 高 | 同编号等价改写为「三 id 零命中」+ 注入必红；计数只增（IAN-007/008） |
| R-IAN-919 | **binding 段前补偿不足**（改写长度差未抵消 ⇒ `startByte ≠ 107780`） | 中高 | 段前等长补偿 + startByte 显式断言；反证「+1 byte 不补偿 ⇒ 红」；逃生口 = 改走八步（IAN-007） |
| R-IAN-920 | **法四三处只改一处（半修）** | 高 | 三处一致判据（半修即红）+ 台账 old→new（IAN-006） |
| R-IAN-921 | **draft 重锚到不存在的 `#ask-input`**（无 free-input 卡时）⇒ 空指针 / 静默丢草稿 | 中 | 空安全读（无卡 ⇒ `''`）+ 空写零副作用 + EC-IAN-011（IAN-005） |
| R-IAN-922 | **S0'' Chromium 面新增门禁文件**（撞 `CHROMIUM_GATES === 9`） | 中 | 只在既有 `s0-self-driven.mjs` **加断言**；node 面入 node 下界（IAN-008/009） |

### 6.3 风险 Top5（按「阻塞程度 × 影响面」）

| 序 | 风险 | 为什么是 Top5 |
|:-:|---|---|
| 1 | **R-IAN-001 + R-IAN-910 + R-IAN-918** 门禁 / 保护段重锚纪律 | 删面与「只增」结构性张力；漏项 / 只删不断 = 静默降强度 ⇒ 18 门禁三态 + 八步取代是唯一解 |
| 2 | **R-IAN-008 + R-IAN-911/912** 零新增载体 + 形态死结 | 「独立 rule 永不渲染」「终端争 chips 预算」是两个很容易踩的形态陷阱；I1/I2 不变量结构性排除 |
| 3 | **R-IAN-914 + R-IAN-004/906** 卡语义混淆 + 手输可判 | 「自由输入」被实现成「描述」或「AI 可代答」= 题眼落空；独立 requestId + driver 两值 + 注入必红 |
| 4 | **R-IAN-002 + R-IAN-905** R6 回填回归 / 覆盖新输入 | 回填是高风险可判面；三语义逐条 + 删回填仍必红 |
| 5 | **R-IAN-005 + R-IAN-908/917** 体积与归因诚实 | DOM/CSS 不计账 ⇒「删面必净负」是错误假设；严格口径登记 + EC 路径 + 逐模块归因 |

---

## 7. 生成的 ADR

### 7.1 ADR 索引（**ADR-IAN-001~010，全部 ACCEPTED**；正文见同目录 `ADR-IAN-0xx-*.md`）

| ADR | 标题 | 状态 | 一句话主张 | 主责叶 |
|---|---|---|---|---|
| **ADR-IAN-001** | 流内「自由输入…」next 面形态（provider + 恒最末终端 + `data-act` 命名 + 零死端） | ACCEPTED | 新 provider `free-input`（`when` 恒真）；`recommendNextStep` 单点注入恒最末终端；无候选 ⇒ floor 铸卡；`data-act='free-input'` = 集 A 协议动作（不进 `ACT_TO_OP`，仍恰 6）；零新 rule / op / kind | 叶1 |
| **ADR-IAN-002** | 卡内输入载体与提交通道（`.ask-fallback` 家系第二语义分支 + `op.turn` 槽 + 手输 driver） | ACCEPTED | 复用家系 + 独立 `requestId='free-input'`；提交经 `op.turn` 槽（`requestTurn(` 叶1 2 / 叶2 1）；`MANUAL_DRIVER_ID='manual'` 两值不相交；让位语义槽外 | 叶1 |
| **ADR-IAN-003** | R6 排队 / 草稿回填迁移（入口迁流内 + 回填迁卡内 + 不覆盖） | ACCEPTED | 终端非 `.next-chip` ⇒ 在飞可用；回填仅当为空 + 卡收起重展开；`turn-queue.ts` 零 diff；TA-4 重锚非删除 | 叶1 / 2 |
| **ADR-IAN-004** | `#composer` 废弃执行序（停引 → 删面）与写者消解 | ACCEPTED | 先停引（保留 `l0.revealFallback` 调用）再删 DOM/CSS；删双写者 / 锁存 / `#send` writer；三缺陷**结构性消解**；钩子重锚 | 叶2 |
| **ADR-IAN-005** | 兜底收敛终态 + `#send-reason` / `sendDisabled` / draft / 引导重锚 | ACCEPTED | 四入口同一卡内载体；`#send-reason` 保留且非恒真；draft **重锚**（PD-006）；`RETIRED_CONTAINER_IDS` **13 → 16** | 叶2 |
| **ADR-IAN-006** | 法四原地修订 + supersession 台账 old→new + X-IAN-1~11 逐条处置 | ACCEPTED | 三处一致原地修订（不升格法十）；老 `redlineRemap` 逐字保留 + 新增；X-IAN-1~11 **11/11 已发生**（+ 未发生如实登记通道） | 叶2 |
| **ADR-IAN-007** | 保护段逐段决策（journey 八步取代 / binding keep 字节中立） | ACCEPTED | journey 段内 `#15c` 必改 ⇒ **八步取代**（新 pin）；binding 段内零读面 ⇒ **keep + 段前等长补偿**；先判后选 | 叶2 |
| **ADR-IAN-008** | 门禁等价重锚清单（18 门禁三态 + 2 新门禁设计 + `CHROMIUM_GATES === 9` 不动） | ACCEPTED | 18 行三态齐；新 `free-input-next` / `law4-input-as-next`（判据 + 反证 + 三段控制 + 真源切片）入下界只增；计数只增 | 叶1 / 2 |
| **ADR-IAN-009** | S0'' 双面验证设计（终态 10 步 + 中间态保护 + 「元素不存在非 hidden」机核） | ACCEPTED | 样本单源（`s0-chain.mjs` 扩展）；Chromium 面只加断言不加文件；ian-1 双入口必绿 + ian-2 旧面零可达 + 注入必红 | 叶1 / 2 |
| **ADR-IAN-010** | 体积分列预算（逐叶分列 + 逐模块归因 + 距档 22,454 + EC-IAN-016 预置） | ACCEPTED | A 列 ian-1 +2.5~4.5 KB / ian-2 −2.5~−1.0 KB（严格 −1.2~+0.3 KB）；Σ×1.15 ≤ 22,454；2.8× 最坏 15.4 KB 仍不触发；逐模块归因禁跨叶混算 | 各叶 |

### 7.2 体积分列预算表

**统一前提（本轮只读复核，承 spec §5.11.1）**：A 基线 **591,946 B** · 生效上限 **621,543 B**（余量 **29,597 B**）· **档位 614,400 B**（**距档 22,454 B**）· 绝对上限 **675,840 B** · `authorConfirmation = pending-author-line`（**未闭合义务**）。**B 列（`dist/background.js`）不计入 sidepanel 账本**。

| 列 | 产物 | 叶1（ian-1 新面）落地项 | 叶2（ian-2 废面）落地项 | 计账 |
|:-:|---|---|---|:-:|
| **A** | `dist/sidepanel.js` | provider `free-input` 行 + 末端项注入 + 零死端 floor · 卡内输入语义分支 + `op.turn` 槽接线 · 手输 driver + 让位 · 流内回填支持 + focus | 删 `syncComposerVisibility` / `fallbackOpen` / `#send` writer / shell 流外写点 · 四处兜底停引 · `#send-reason`/`sendDisabled`/draft/引导重锚 · 容器册 / `NEVER_FOLDABLE` 登记 · `requestTurn(` 重锚 | ✅ |
| **B** | `dist/background.js` | 0（零改动） | 0（零改动） | ❌ |
| **C** | `content.js` / `pick-layer.js` | **零触碰** | **零触碰** | 零容差 |

| 预算口径 | 叶1 | 叶2 | Σ | +15% 缓冲 | 结论 |
|---|--:|--:|--:|--:|---|
| **A 列（目标口径，承 spec）** | **+2.5 ~ +4.5 KB** | **−2.5 ~ −1.0 KB** | **−0.0 ~ +3.5 KB** | **−0.0 ~ +4.0 KB** | **距档余量 = 22,454 B ⇒ 正常口径不触发升档** |
| **A 列（严格口径：DOM/CSS 不计账）** | +2.5 ~ +4.5 KB | −1.2 ~ +0.3 KB | +1.3 ~ +4.8 KB | +1.5 ~ +5.5 KB | 仍 < 22,454 B ⇒ 不触发（**若 ian-2 非负须如实登记**） |
| **v55 历史低估系数 2.8× 最坏（Σ 上界 4.8 KB）** | — | — | ≈13.4 KB | ≈15.4 KB | **仍 < 22,454 B** ⇒ **预置 EC-IAN-016 显式升档路径 + 作者一行**（本阶段不触发、不伪称确认） |

**校准依据（实测增量）**：R6 +5,199 / v5.5-1 R1 +2,755 / v5.5-3 R2 +6,889 / **F-34 叶1 +7,109** / **F-34 叶2 +6,214**（⚠️ 叶2 计划 3.5~5.5 KB、实测 +6,214 ⇒ 上界低估约 1.13×；ian-2 须**先判后登记**）。

**减体积优先级（越预算时按序执行；均不触碰断言 / 容差 / 档位口径）**：① 复用既有文案 / 静态模板（零新字符串）；② 元组化声明数据（v5 `ops.ts#IMPL` 先例）；③ 复用 `askuser` 卡渲染面（`free-input` 走第二**语义**分支，零第二 DOM 路径）；④ 把纯记账 / 判定逻辑下移 `background.js`（**不计账**，但须过 FR-IAN-115 反证：不得为绕门禁搬码）；⑤ **显式登记未落地项**为未闭合义务 —— **绝不以删判据 / 放宽容差 / 静默下调档位实现**。

### 7.3 波次与任务数估算（供 `@sddu-tasks` 参考，**非需求**）

| 叶 | 波数 | 任务数（估） | 工作量集中区 |
|---|:--:|:--:|---|
| **ian-1**（新面 / 底座） | **3**（W1~W3） | **~26** | W1 形态与末端项（provider + 注入 + floor + 终端渲染 + 门禁等价重锚）· W2 通道与手输（卡内语义分支 + `op.turn` 槽 + driver + 让位 + 注入反证）· W3 R6 双入口 / 流内回填 + a11y + 新门禁 + S0''-A + 体积叶1 重登记 |
| **ian-2**（废面 / 拆除） | **3**（W1~W3） | **~24** | W1 停引 + DOM/CSS 退役 + 写者消解 · W2 登记退役 + 重锚（`#send-reason`/`sendDisabled`/draft/引导）+ 通道唯一化 · W3 法四修订 + 台账 + 门禁 18 重锚 + 保护段 + S0''-B + 体积净负重登记 |
| **合计** | **6** | **~50** | — |

> 口径：任务数 = 可原子执行单元（≈1 文件内 1 项可验证改动 + 其判据），**不是** LLM 调用数；2 叶**串行**（ian-1 → ian-2）。

### 7.4 体积可行性结论

**可行，正常口径不触发升档**：A 列 Σ 预算（目标口径）−0.0 ~ +3.5 KB（上界 3.5 KB）⇒ 加 15% 缓冲 −0.0 ~ +4.0 KB **落在距档余量 22,454 B 与生效上限余量 29,597 B 之内**。**严格口径**（DOM/CSS 不计账）Σ 上界 4.8 KB × 1.15 = **5.5 KB**，仍远小于 22,454 B。**2.8× 最坏**（Σ 上界 4.8 KB × 2.8 ≈ 13.4 KB；×1.15 ≈ **15.4 KB**）**仍 < 22,454 B** ⇒ **不触发升档**；但按 **V3-VOL-3 / EC-IAN-016** 仍**预置显式升档路径 + 作者一行**，`authorConfirmation` **保持占位、不得伪称已确认**。**预置、不静默、本阶段不触发**。

---

## 8. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（F-35 父 `plan.md` + 2 叶 `plan.md` + **ADR-IAN-001~010** 全 10 条正文）：§1 前置检查 + 偏差登记 + 两条硬性约束（A 列目标净负 / 严格口径登记；B 列不计账）；§2 架构分析（七条结构性不变量 / 数据流 / **十条设计任务定案** / **PD-IAN-001~009 裁决汇总** / **N-IAN-001~028 红线继承** / T1~T15 不动面）；§3~4 方案对比与推荐（方案 A：既有注册表内扩张 + 卡内终端 + `op.turn` 槽）；§5 聚合文件影响 **≈36 项**（src 11 / test 15 / docs 2 / SDDU 8）；§6 风险（继承 R-IAN-001~013 + R-IAN-901~910 + plan 新增 **R-IAN-911~922** + Top5）；§7 ADR 索引（10 条 ACCEPTED）+ **体积分列预算表**（目标 Σ×1.15 ≤ 22,454 ⇒ 不触发；2.8× 最坏 15.4 KB 仍不触发 ⇒ 预置 EC-IAN-016）+ 波次估算（2 叶 **6 波 / ~50 任务**）+ 体积可行性结论。**本轮只做 plan**：零 `src`/`test`/`dist`/`docs`/`design`/ROADMAP 改动，零门禁 / 构建 / Chromium，未调用任何受管 Provider（routing.v1 = `local_or_compute → none`） | 2026-09-24 | SDDU Plan Agent |
