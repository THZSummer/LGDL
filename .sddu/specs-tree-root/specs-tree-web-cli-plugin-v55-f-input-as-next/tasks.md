# 任务分解：specs-tree-web-cli-plugin-v55-f-input-as-next（web-cli-plugin v5.5.2「输入即 next：废除流外独立输入框」；父 Feature 统领性任务总览）

> **文档定位**: SDDU 任务清单（**父 / 跨切总览与索引**）— 记录 **6 波总表**、**2 叶 52 任务索引**、跨切红线（`N-IAN-001~028` / `T1~T15` / `X-IAN-1~11` / 共享面）→ 任务映射、**体积分列预算逐叶分摊对照表（A 列 ian-1 +2.5~4.5 KB / ian-2 −2.5~−1.0 KB 目标净负；B 列 0；C 列零容差）**、共享面「恰一次」登记、S0'' 双面落点、spikeGate 结论义务、新增 / 升级门禁清单与门禁守恒总表、停机规则、以及 build / review / validate 二维时序。**本文件不含可执行任务正文**（父为轻量规范容器，不承接 build / review / validate；任务正文见 2 叶 `tasks.md` / `tasks.json`）
> **前置依赖**: 本目录 `plan.md` v1.0（跨切契约 + `ADR-IAN-001~010` 索引 + §2.4 十条设计任务定案 + §2.5 PD-IAN-001~009 裁决 + §2.6 N-IAN-001~028 + §2.7 T1~T15 + §7.2 体积分列预算 + §7.3 6 波骨架 + §7.4 体积可行性结论）+ `spec.md` v1.0（**80 FR / 14 NFR / 18 EC / 27 AC / 20 NG / 10 US / 8 G / §12 X-IAN-1~11 / §13 N-IAN-001~028 / §9.5 18 门禁 + 计数基线 / §14 2 叶拆分 / §14.3 FR→叶 覆盖矩阵**）+ `discovery.md` v1.0 + 2 叶 `plan.md` v1.0 + 2 叶 `spec.md` v1.0
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-25
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-09-25
> **更新说明**: 初始创建（父总览：**2 叶 × 6 波 × 52 任务**（`TASK-IAN-101~127` / `201~225`，两叶连续编号）+ 跨切红线 → 任务映射 + **体积分列预算逐叶分摊 + 波内登记点 + EC-IAN-016 逐分支** + 共享面「恰一次」登记 + **S0'' 双面落点表** + 3 个 spikeGate（SG-IAN-01~03）+ **新增 2 门禁 / 升级 16 组门禁清单** + 门禁守恒总表（18 门禁三态）+ 停机规则 12 条 + 二维时序）

---

## 0. 结构登记（**2 叶 Feature**）

| 项 | 内容 |
|---|---|
| 父 Feature 定位 | **轻量规范容器**（父 `spec.md §14.1`）：`depth=1`；**不承接** build / review / validate；`childrens` 结构不变 |
| 叶数量 | **2 叶**（`depth=2` / `leaf:true` / `deliveryOrder` 1..2 / 链式 `dependsOn`） |
| 交付顺序 | `specs-tree-ian-1-free-input-next` → `specs-tree-ian-2-abolish-composer`（**硬串行**，叶间不可并行，父 `spec.md §14.1`） |
| 为何 3 波 + 3 波 | 沿用父 `plan.md §7.3` 骨架：ian-1 = **3**（形态与末端项 → 通道与手输 → R6/回填/验收）；ian-2 = **3**（拆除 → 重锚与唯一化 → 立法/门禁/保护段/验收） |
| 本轮父产物偏差 | 父产出 `tasks.md` / `tasks.json`（**总览型：0 条可执行任务**）—— 父 `spec.md §14.1` 未列出父 `tasks.json`；与 v4 / v4.5 / v5 / v5.5 / F-34 先例同口径**显式登记**，可整篇作废而不牵连叶（叶对父的引用 = 「父 FR/AC + `ADR-IAN-0xx` 编号」，不依赖父 `tasks` 物理存在性） |
| ADR 所有权 | `ADR-IAN-001/002` → ian-1；`003` 叶1 支持 / 叶2 唯一化；`004/005/006/007` → ian-2；`008/009/010` 两叶各落各项 |
| 编号空间 | `TASK-IAN-1xx`（叶1 `101~127`）/ `TASK-IAN-2xx`（叶2 `201~225`）；与 `TASK-001~040` / `TASK-2xx~3xx` / `TASK-4xx` / `TASK-5xx~8xx` / `TASK-V45-1xx` / `TASK-V5-1xx` / `TASK-V55-1xx~320` / `TASK-V55F-1xx~2xx` **零冲突** |
| 波次 | **6 波**（`W01~W06` 全局波序）；叶内 ian-1 `W1~W3` / ian-2 `W1~W3` |
| 两叶串行理由 | ian-2 依赖 ian-1 的流内输入面先建立：叶2 在叶1 `validated` 前不得启动，否则出现「无输入可用」窗口 ⇒ `N-IAN-027` / `R-IAN-901` |

### 0.1 模板偏差登记（**任务数 > 15**）

| 项 | 内容 |
|---|---|
| 模板建议 | agent 模板 §5.4 / §8「任务数量控制在 5~15 个之间」 |
| 本轮实际 | **52**（27 / 25），分落 2 叶；叶1 27（> 15）、叶2 25（> 15） |
| 理由 | ① 编排器任务书明定「按父 `plan.md §7.3` 的 **6 波骨架**分配」；② 过并会破坏「**每任务独立可验证**」；③ 与 F-34 父先例（45）/ v5.5 父先例（61）同口径显式登记；④ 52 = **可原子执行单元**（≈1 文件内 1 项可验证改动 + 其判据），**不是** LLM 调用数；⑤ 父 `plan.md §7.3` 估 ~50 ⇒ 52 对齐（+2，见 §2 索引） |

### 0.2 spikeGate 命名偏差登记

父 `plan.md` / `ADR-IAN-001~010` **未命名** spikeGate 代号（仅 `ADR-IAN-009 §②` 提及 S0'' 与 F-34 之 S0′ 同地位）。本轮按**编排器任务书**指定的 `SG-IAN-01~03` 落为**先验闸门**（tasks 阶段新增，**显式登记**），探针产物**不落版本库**（`test/_spike/` 探毕删除）。

### 0.3 tasks 级波次细化登记（与父 `plan.md §7` 的显式差异）

| 项 | 内容 |
|---|---|
| 差异 | 叶2 `test/op-wiring.test.ts` 重锚（`requestTurn(` **恰 2 → 恰 1**）由父 `plan.md §7` 的 **W2**（步6 通道唯一化）**前移至 W1**（`TASK-IAN-205`），与 DOM/CSS 退役 + 写者消解**同轮完成** |
| 理由 | ① `sidepanel.ts:3749` 的 composer submit 监听绑定 `$('composer')`，DOM 移除后必空引用 ⇒ 监听 / `requestTurn(input.value)` 调用**必须**在 W1 删除 ⇒ 物理计数在 W1 已变 1；② `FR-IAN-091`「取代与判据重锚**不得拆轮**」；③ 每波收口门禁绿约束（否则 W1 收口 `op-wiring` 必红） |
| 未变 | 步6 的「**R6 唯一化 + TA-4 重锚**」仍在 W2（`TASK-IAN-210/211`）；父 `ADR-IAN-004` 的 8 步语义与顺序**不变**，仅门禁重锚与实现同轮 |

---

## 1. 波次总表（6 波 · 2 叶硬串行）

| 全局波 | 叶 | 叶内波 | 名称 | 任务 | 任务数 | 规模 |
|:--:|:--:|:--:|---|---|:--:|---|
| **W01** | ian-1 | W1 | 形态与末端项（provider + 注入/floor + 终端渲染 + D0-5/D0-7 重锚；**SG-IAN-01**） | `101`–`107` | 7 | S×2 / M×5 |
| **W02** | ian-1 | W2 | 通道与手输（卡内语义分支 + `op.turn` 槽 + driver + 让位 + a11y；**SG-IAN-02**） | `108`–`116` | 9 | S×2 / M×5 / L×2 |
| **W03** | ian-1 | W3 | R6 双入口 / 流内回填 + 新门禁 `FIN-1~8` + **S0''-A** + 体积叶1 重登记（收口轮） | `117`–`127` | 11 | M×9 / L×2 |
| **W04** | ian-2 | W1 | 拆除：停引 → DOM/CSS 退役 → 写者消解 → 钩子重锚 → **op-wiring 重锚（同轮）** → 登记退役 | `201`–`206` | 6 | M×5 / L×1 |
| **W05** | ian-2 | W2 | 重锚与唯一化：四兜底收敛 + `#send-reason`/`sendDisabled`/draft/引导 + R6 唯一化 + node 门禁重锚 | `207`–`212` | 6 | M×6 |
| **W06** | ian-2 | W3 | 立法 / 门禁 / 保护段 / 验收：法四修订 + 台账 + 法四门禁 + journey 八步 + binding keep + **S0''-B** + 体积净负（收口轮·终局；**SG-IAN-03**） | `213`–`225` | 13 | M×8 / L×5 |
| **合计** | 2 叶 | — | — | `TASK-IAN-101~225` | **52** | **S×4 / M×39 / L×9** |

**跨叶次序**：`W01~W03`（ian-1 全绿 / `validated`）→ `W04~W06`（ian-2）。叶间**硬串行**（裁决 `BLK-IAN-9`）。

---

## 2. 两叶任务索引（52 条；正文见各叶 `tasks.md`）

### 2.1 ian-1 `specs-tree-ian-1-free-input-next`（**27 · `TASK-IAN-101~127` · 3 波**）

| 任务 | 波 | 规模 | 类型 | 标题 | 关键判据 / 门禁 |
|---|:--:|:--:|---|---|---|
| `101` | W1 | M | spike | **SG-IAN-01** `op.turn` 槽承载自由输入可行性探针 | `requestTurn(` 计数 / `op-wiring` 重锚口径预演 |
| `102` | W1 | S | impl | `providers.ts` `free-input` provider 行 + `DRIVER_DECLS_SRC` | 双向包含 / `when` 恒真 / 零新 kind |
| `103` | W1 | S | impl | `dispatch.ts` `SET_A_PROTOCOL_ACTIONS` 8→9 | `ACT_TO_OP` **仍恰 6** |
| `104` | W1 | M | impl | `recommend.ts` 末端项单点注入 + 零死端 floor + payload 布尔字段 | `NEXTSTEP_PRIORITY` **仍 4** / EC-IAN-001 |
| `105` | W1 | M | impl | `cards/nextstep.ts` 末端项渲染（`.next-chips` 之后，非 `.next-chip`） | 恒最末 / 在飞不被 pending 禁用 |
| `106` | W1 | M | gate | `next-dispatch-diff0.test.ts` D0-5 / D0-7 等价重锚 | 集 A 只增 / known 集扩张 / 集 B 字面量零引入 |
| `107` | W1 | M | gate | `test/ui/recommendation.mjs` 末端项断言（只增） | `test:recommendation ≥72` |
| `108` | W2 | M | spike | **SG-IAN-02** `askuser` 第二语义分支不破载体探针 | `KIND_SET` 40 / 12 kind / 零宿主 |
| `109` | W2 | M | impl | `cards/askuser.ts` free-input 卡内输入语义分支（幂等查询） | 独立 `requestId='free-input'` / 复用家系 |
| `110` | W2 | L | impl | `sidepanel.ts` `openFreeInputCard` + `handleCardAction` 集 A/requestId 分支 | 零第二 DOM 路径 / 反证「共 `requestId` ⇒ 必红」 |
| `111` | W2 | S | impl | `ai-drive.ts` `MANUAL_DRIVER_ID='manual'` 单源常量 | `∉ listDriverDecls()` |
| `112` | W2 | M | impl | 手输 trace（`driver=manual`）+ 让位语义（槽外）+ 空提交可读提示 | FIN-4/5/6 / 反证「移入 `requestTurn` ⇒ 必红」 |
| `113` | W2 | M | impl | 提交经 `op.turn` 槽（不新增 `requestTurn(` 直连） | 叶1 计数**仍恰 2** / 特权 op 不触达 |
| `114` | W2 | S | impl | `view-model.ts` 引导文案改指（叶1 侧）+ `AskFlowView` 语义锚 | 文案不指向流外面 |
| `115` | W2 | M | impl | a11y focus 卡内 input + Tab 序无悬空 + 键盘提交/取消 | `setCardFallbackOpen` 先例 |
| `116` | W2 | L | gate | `test/free-input-next.test.ts` **FIN-1~6** + 反证 | `free-input-next`（新） |
| `117` | W3 | M | impl | R6 双入口并存（composer submit **逐字保留可用**）+ 在飞不硬禁用 | S0''-A / N-IAN-027 |
| `118` | W3 | M | impl | 流内回填支持（`busy-rejected` 迁卡内：仅当为空 / 卡收起重展开 / 叶1 双载体并存） | FIN-7 / N-IAN-026 |
| `119` | W3 | M | gate | `turn-arbitration.test.ts` TA-4 等价重锚（双载体可判 + **删回填仍必红**） | `turn-arbitration ≥6` |
| `120` | W3 | M | gate | `r6-ty-experience-fix.test.ts` + `sidepanel-view.test.ts` 在飞不硬禁用 → 流内面 | 等价重锚 |
| `121` | W3 | M | gate | `free-input-next.test.ts` **FIN-7/8** + 三段控制 + 真源切片 | 禁恒真 / 真源切片 |
| `122` | W3 | M | gate | `gate-integrity.test.ts` `EXPECTED_AUDITED_FILES` 只增 `free-input-next` | 下界只增 / `CHROMIUM_GATES === 9` |
| `123` | W3 | L | gate | **S0''-A** node 面（`s0-self-driven-chain.test.ts` + `free-input-next.test.ts`） | 双入口各跑通 + 反证 |
| `124` | W3 | L | gate | **S0''-A** Chromium 面 + 样本单源扩展（`s0-chain.mjs`） | **只加断言不加文件** / 人工面 M1/M2/M5 |
| `125` | W3 | M | gate | 红线巡检（三冻结面 / `KIND_SET` 40 / 12 kind 零宿主 / base / 判定链 / manifest / 法八 / 特权） | `insight-no-escalation` / `test:law8 ≥36` |
| `126` | W3 | M | doc | **体积叶1 重登记**（五要素 + V3-VOL-3 三值 + 逐模块行 + EC-IAN-016 二态） | `A 列 +2.5~4.5 KB` / `test:size-ruling-vol3 ≥12` |
| `127` | W3 | M | doc | 门禁对账骨架 + X-IAN-7 叶1 侧台账骨架 | `test:supersession ≥42`（骨架） |

### 2.2 ian-2 `specs-tree-ian-2-abolish-composer`（**25 · `TASK-IAN-201~225` · 3 波**）

| 任务 | 波 | 规模 | 类型 | 标题 | 关键判据 / 门禁 |
|---|:--:|:--:|---|---|---|
| `201` | W1 | M | impl | 停引：`l0/shell.ts` 去流外 `composer.hidden` 写点（保留调用） | 反证「重新级联 ⇒ 双输入面 ⇒ 必红」 |
| `202` | W1 | M | impl | DOM / CSS 退役：三 id + 6 条 CSS + 出流注释；三区 CSS 逐字不动 | 三 id 零命中 / `:670-672` diff=0 |
| `203` | W1 | L | impl | 写者消解：`syncComposerVisibility` / `fallbackOpen` / `#send` writer / composer submit 监听 / 注释 | 标识符零命中 / 三缺陷结构性消解 |
| `204` | W1 | M | impl | 测试钩子重锚（`__v3.testing.revealFallback/hideFallback` → 只操作卡内） | 无死写点 / 空转钩子 |
| `205` | W1 | M | gate | `op-wiring.test.ts` 等价重锚（`requestTurn(` 恰 2→1 + 反证） | `OP_CALLSITE_SET.op.turn.callSites 2→1` |
| `206` | W1 | M | impl | 登记退役：`NEVER_FOLDABLE` 14→13 + `RETIRED_CONTAINER_IDS` 13→16 + 注释同步 | 宿主值 4 项逐字 / 注释算术订正 |
| `207` | W2 | M | impl | 四处兜底收敛终态（E1~E4 只展开卡内；`op.describe` 有值相逐字不变） | 反证「有值相发回合 ⇒ 必红」 |
| `208` | W2 | M | impl | `view-model.ts` 重锚族（`sendDisabled` 仅异常态 + draft 重锚 + 引导改指） | 在飞可提交 / draft 空安全 |
| `209` | W2 | M | gate | `#send-reason` 保留 + 判据重锚（在 `#region-statusbar` 内、非恒真） | `density-thresholds:787-814,864` |
| `210` | W2 | M | impl | R6 唯一化（入口 / 回填载体唯一到流内）+ TA-4 重锚 | `turn-arbitration ≥6` / 删回填仍必红 |
| `211` | W2 | M | gate | node 门禁重锚族（`turn-arbitration` / `r6-ty` / `sidepanel-view` / `settings` / `density` / `host-registry` / `l0-disclosure`） | 计数只增 / 三态齐 |
| `212` | W2 | M | gate | W2 回归 + 反证还原记录（`npm test` 串行 + sha256 前后相同） | 计数只增 / 反证实跑 |
| `213` | W3 | M | spike | **SG-IAN-03** journey 八步取代预演（段内 composer 清单 + 替换前后字节账） | binding 段前等长补偿预演 |
| `214` | W3 | M | doc | 法四三处原地修订（`v4-chat/spec.md:116/:225/:385` 逐字 old→new） | **三处一致，半修即红** / 不升格法十 |
| `215` | W3 | M | doc | 台账：`xIanLedger`（X-IAN-1~11）+ `redlineRemap` 6→7 + journey 新 pin / binding keep + `modifiedRanges` | 老 6 条逐字保留 / `≥42` |
| `216` | W3 | L | gate | `test/law4-input-as-next.test.ts` 新门禁（L4-1~6 + 双向反证 + 三段控制 + 真源切片） | `law4-input-as-next`（新） |
| `217` | W3 | M | gate | `supersession-ledger.test.ts` + `insight-tree-hierarchy.test.ts` 重锚 / 保留 | 老 `redlineRemap ≥3` 保留 / 先例引用 |
| `218` | W3 | L | gate | journey 保护段**八步显式取代**（#15c 同编号等价改写 + 新 pin 四处同步 + RP-V4-08 反证） | `test:journey ≥171` |
| `219` | W3 | L | gate | binding 保护段 **keep 字节中立**（段前等长补偿 ⇒ `startAnchor` 仍 =107780 + 三反证） | `test:binding ≥192` / 段内零字节 |
| `220` | W3 | M | gate | Chromium 门禁等价重锚族（`insight` / `l0` / `recommendation` / `s0-self-driven` + `l1`/`hardening` 保留确认） | 只加断言不加文件 |
| `221` | W3 | M | gate | `gate-integrity.test.ts` 下界只增 `law4-input-as-next`（+ 叶1 `free-input-next`） | `CHROMIUM_GATES === 9` |
| `222` | W3 | L | gate | **S0''-B** 终态样板（node + Chromium；「元素不存在非 hidden」机核 + 注入必红 + 逐字节还原） | 人工面 M3/M4 |
| `223` | W3 | M | gate | 红线守账巡检（三冻结面 / `KIND_SET` / 12 kind 零宿主 / base / 判定链 / manifest / 法八 / 特权）+ `KL-N-10` 隔离复跑 | 计数只增 |
| `224` | W3 | M | doc | **体积叶2 净负重登记**（五要素 + 三值 + 逐模块行 + 两叶 Σ + 严格口径如实 + EC-IAN-016 二态） | `A 列 −2.5~−1.0 KB（目标）` / 严格 −1.2~+0.3 KB |
| `225` | W3 | M | doc | 18 门禁三态对账 + 人工面 M3/M4 登记 + 叶2 交接口 | 无减少项 / 不冒充 PASS |

> **对齐说明**：父 `plan.md §7.3` 估 ian-1 ~26 / ian-2 ~24（Σ ~50）；本轮 27 / 25（Σ 52，+2）。增量来源 = ① 叶1 `FIN-1~8` 拆为骨架（116）+ 三段控制/真源（121）两任务；② 叶2 `gate-integrity` 下界（221）与红线守账（223）独立于 215/216；未并任务以保「每任务独立可验证」。

---

## 3. 跨切红线 → 任务映射

### 3.1 `N-IAN-001~028` 红线 → 守线任务

| # | 红线（要点） | 守线任务 | 判据 |
|---|---|---|---|
| `N-IAN-001/002` | `content.js` 177,076 B / `pick-layer.js` 34,358 B（零容差） | `125` / `223` | `stat` + sha256 双锚 |
| `N-IAN-003/004` | `KIND_SET` 40 / 12 kind / `REGISTERED_STRUCTURAL_HOSTS=[]` | `102` / `108` / `109` / `206` / `216` | 长度断言 + `host-registry` |
| `N-IAN-005/006` | 上游产物零改写（唯一例外 = 法四三处 + 台账） | `214` / `215` / `217` | 三处一致 + 台账 old→new |
| `N-IAN-007` | `packages/web-cli-base/**` 零 diff | `125` / `223` | `insight-no-escalation` |
| `N-IAN-008` | `turn-queue.ts` 三分支零改动 | `117` / `118` / `210` / `223` | `diff = 0` |
| `N-IAN-009` | 法八四面零明文不退化 | `112` / `116` / `121` / `125` / `223` | `test:law8 ≥36` |
| `N-IAN-010` | 零新增卡类型（第 13 种） | `102` / `108` / `109` | 复用 `askuser` + `.ask-fallback` |
| `N-IAN-011` | 法四加严为「流外零输入面」 | `216` | 法四门禁绿 |
| `N-IAN-012` | 断言零删除零降级、计数只增（唯一例外 = 保护段显式取代 + 台账） | `121` / `122` / `217` / `218` / `219` / `221` / `223` / `225` | 对账无减少项 |
| `N-IAN-013` | `authorConfirmation` 不得伪称已确认 | `126` / `224` | 读值断言 |
| `N-IAN-014/020` | `F-29` 不动 / 纪律（不碰 main / force push / path-limited / 无新依赖 / `.sddu` 外零触碰） | §16 纪律表（各叶 build / validate 记录） | 逐条 |
| `N-IAN-015` | 保护段逐段决策；哈希变更必须台账、禁静默 | `213` / `218` / `219` | journey 八步 / binding keep |
| `N-IAN-016` | 特权 op 恰 2 恒 gesture；SW 永不 `.request(` | `113` / `125` / `223` | `capability-wiring` / `op-three-tier` |
| `N-IAN-017` | consent / gesture 不得被 AI 代答（含手输变体） | `111` / `112` / `116` | 注入必红 |
| `N-IAN-018` | 判定链零触碰（`zeroDiffFiles` pin） | `125` / `223` | 哈希 pin |
| `N-IAN-019` | 门禁严格串行；`CHROMIUM_GATES === 9` | `122` / `221` / `223` | `gate-integrity` |
| `N-IAN-021` | 流内输入面唯一（恰 1 载体；第二输入面 ⇒ FAIL） | `109` / `110` / `116` / `210` | 唯一载体判据（非恒真） |
| `N-IAN-022` | 生产输入提交点唯一（`requestTurn(` 恰 1） | `205` / `210` | `op-wiring` + 反证 |
| `N-IAN-023` | 手输可判（driver 两值不同；同值 / AI 代答 ⇒ FAIL） | `111` / `112` / `116` | 逐行两值断言 |
| `N-IAN-024` | 法四门禁必绿且禁恒真（双向反证 + 三段控制） | `216` / `221` | `ok`/`violated`/`n/a` |
| `N-IAN-025` | 真退役（非 hidden）：三 id 不得以任何形态存在 | `202` / `216` / `222` | DOM 零命中 + 注入必红 |
| `N-IAN-026` | 回填三语义不退化（删回填仍必红） | `118` / `119` / `210` | TA-4 + 反证 |
| `N-IAN-027` | 中间态不破坏现网（ian-1 双入口均可用） | `117` / `123` / `124` | S0''-A 独立验收 |
| `N-IAN-028` | `#send-reason` 保留且判据非恒真（在 `#region-statusbar` 内） | `209` | `density` 非恒真 |

### 3.2 `X-IAN-1~11` 显式取代 → 任务映射（**等价重锚，不是放宽**）

| X | 处置 | 承载任务 | 台账动作 |
|---|---|---|---|
| `X-IAN-1` | 法四「输入按需出现」→「输入即 next：…流外零输入面」（原地修订 + old→new） | `214` / `215` / `216` / `217` | `xIanLedger` + `redlineRemap` 追加 |
| `X-IAN-2` | `#composer`/`#input`/`#send` 保留面 → 入退役面（DOM 真退役） | `206` / `207` / `219` | `modifiedRanges[]` |
| `X-IAN-3` | 「不得入容器册」反证 → 「必须入册」（13→16） | `206` / `216` / `221` | 计数对账（只增） |
| `X-IAN-4` | `form hidden` + body 尾 → 「三 id 均不在 DOM ∧ 流内输入卡存在可用」 | `202` / `216` / `218` / `220` | `modifiedRanges[]`（journey 段内） |
| `X-IAN-5` | `#I-08`/`#I-09` 几何 → 消解并显式登记（非删断言）+ 流内卡几何 | `220` | `modifiedRanges[]`（insight） |
| `X-IAN-6` | `requestTurn(` 恰 2 → 恰 1（唯一生产输入提交点 = `op.turn` 槽） | `205` | `OP_CALLSITE_SET` 2→1 |
| `X-IAN-7` | `busy-rejected` 回填 `#input` → 流内输入（+ 卡收起 ⇒ 重展开） | `118` / `119` / `210` | TA-4 重锚（删回填仍必红） |
| `X-IAN-8` | draft `#input` → 流内输入载体（空安全） | `208` / `217` | `settings.test.ts:191` 重锚 |
| `X-IAN-9` | `NEVER_FOLDABLE` 含 `'composer'` → 退役 14→13 | `206` / `211` | 计数对账（只增） |
| `X-IAN-10` | 首装引导「在输入框输入指令并发送」→ 改指流内 next 项 | `114` / `208` | 文案断言重锚 |
| `X-IAN-11` | `binding.mjs` `DIAG_SELECTORS` 含 `composer` + 真实键入 → 流内输入；保护段 keep | `219` / `220` | 段前等长补偿 + 段外逐行登记 |

> **落地纪律**（`FR-IAN-091/101/102`）：① 无放宽 / 删除 / 静默改；② 每项判据 ≥1 注入反证（注入 ⇒ FAIL ⇒ 逐字节还原 ⇒ PASS）；③ 判据力逐条对账；④ **未发生取代者如实登记「未发生」**（本条台账须逐条给 `superseded` / `no-supersession` 状态列，不留空、不伪造）；⑤ **取代与实现同轮完成**（不拆到「下一轮补」，承 §0.3 波次细化）。

### 3.3 不动面 `T1~T15` → 巡检任务

| # | 不动面 | 巡检任务 |
|:--:|---|---|
| `T1` | `src/content/**` / `dist/content.js` / `dist/pick-layer.js` | `125` / `223` |
| `T2` | `KIND_SET` 40 / 12 kind / `BORN_FROZEN_KINDS` / `STREAM_TERMINALS` / `BLOCKED_TERMINALS` / `MAX_OPEN_ASKS` | `102` / `108` / `125` / `206` / `216` |
| `T3` | 判定链（`policy.ts` / `auto-authorize.ts`；`zeroDiffFiles` pin） | `125` / `223` |
| `T4` | `manifest.json` 零 diff | `125` / `223` |
| `T5` | `packages/web-cli-base/**` | `125` / `223` |
| `T6` | `src/background/turn-queue.ts` / `service-worker.ts` 裁决面 | `117` / `210` / `223` |
| `T7` | `ACT_TO_OP`（恰 6）/ `OP_TO_ACT` / `OPS_BY_ID` / 9 op 清单 | `103` / `106` / `125` |
| `T8` | `NEXTSTEP_PRIORITY`（恰 4）/ `MAX_CHIPS_PER_CARD=3` / `MAX_NEXTSTEP_CARDS_PER_ROUND=1` | `104` / `105` / `106` |
| `T9` | 密度阈值 7/15·9/20·17/35 / `MAX_CLICKABLES_PER_CARD=6` / `MAX_STREAM_RESIDENT_CLICKABLES=8` | `105` / `107` / `220` |
| `T10` | `#send-reason` / `#rebind` | `209` / `220` |
| `T11` | `body.settings-open` 三区 CSS（`index.html:670-672`） | `202` |
| `T12` | `F-29` ROADMAP 区段 / `ROADMAP.md` 全文件 | §16 纪律（收口登记） |
| `T13` | v1~v5.5.1 / R6 的 SDDU 产物与 `test/size-baseline.ts` 历史条目 | `126` / `224`（只追加） |
| `T14` | `design/**` | §16 纪律（零改动） |
| `T15` | 既有门禁（只追加 / 等价重锚；`CHROMIUM_GATES === 9`） | `122` / `205` / `217` / `220` / `221` / `223` |

---

## 4. 共享面「恰一次」登记（`FR-IAN-002/005/102`）

> **口径**：四类共享面被 ≥2 叶触碰 ⇒ **必须恰一次做完**；禁止「两叶各改一次同一条目」。

| 共享面 | 登记叶 | 承载任务 | 校验 |
|---|---|---|---|
| **体积五要素** | 各叶登记自身增量；**两叶 Σ 对照在叶2** | `126`（叶1 正增量）/ `224`（叶2 净负 + 两叶 Σ 对照） | `SIDEPANEL_BASELINE_BYTES_TIMELINE` **只追加** + 逐模块归因（Σ 逐模块 Δ + 未归因 == 登记增量）+ **严格口径 DOM/CSS 不计账显式登记** |
| **journey 保护段** `43054..58287` / `cc79f413…` | **叶2**（本轮取代面） | `213`（预演）/ `218`（八步）/ `215`（台账） | 八步齐（history 新节 + 新 pin + `supersessionChain` + `modifiedRanges[]` + `redlineRemap[]` + 计数守恒只增 + RP-V4-08 反证） |
| **binding 保护段** `107780..115930` / `be9ad0e9…` | **叶2** | `213`（补偿预演）/ `219`（keep）/ `215`（登记） | 保段（`decision=keep`；段内零字节）+ 段前等长补偿（`startAnchor` byte 仍 = **107780**）+ 段外逐行登记 + `test:binding ≥192` + 三反证 |
| **取代台账** | **各叶各登各的条目（文件只追加）**；叶1 登 X-IAN-7 侧 + 门禁骨架，叶2 增 X-IAN-1~11 全量 | `127`（叶1）/ `215`（叶2） | `test:supersession ≥42` + `status ↔ knownGap` 一致性 + 老 `redlineRemap` 逐字保留 |
| **`knownGap` 一致性** | **叶2**（取代终态承接） | `215` | 逐条给状态列（`superseded` / `no-supersession`），不留空 |
| **人工面清单** | **各叶各登本叶项**（叶1 M1/M2/M5；叶2 M3/M4） | `124` / `222` | 逐项 `⏳ 未执行` / `PASS`；**不得冒充 PASS**；v5.5 / F-34 人工面零改写 |

---

## 5. 体积分列预算逐叶分摊与波内登记点

> 权威：父 `plan.md §7.2` + `ADR-IAN-010` + 父 `spec.md §5.11.1` / `FR-IAN-110~115`。`sidepanel.js` 是**唯一**带字节预算的产物；`background.js`（B 列）/ `options.js` / `test/**` **不计入**该账本；C 列（`content.js` / `pick-layer.js`）**零容差**。

**统一前提（承 F-34 closeout，本轮只读复核）**：A 基线 **591,946 B** · 生效上限 **621,543 B**（余量 **29,597 B**）· 档位 **614,400 B**（**距档 22,454 B**）· 绝对上限 **675,840 B** · `authorConfirmation = pending-author-line`（未闭合义务）。

| 列 | 叶1 落地项（A 计账 / B 不计账） | 叶2 落地项 | 预算 |
|---|---|---|---|
| **A** | provider `free-input` 行 + 末端项注入 + 零死端 floor · 卡内输入语义分支 + `op.turn` 槽接线 · 手输 driver + 让位 · 流内回填支持 + focus | 删 `syncComposerVisibility` / `fallbackOpen` / `#send` writer / composer submit 监听 / shell 流外写点 · 四处兜底停引 · `#send-reason`/`sendDisabled`/draft/引导重锚 · 容器册 / `NEVER_FOLDABLE` 登记 · `requestTurn(` 重锚 | 叶1 **+2.5~4.5 KB** / 叶2 **−2.5~−1.0 KB（目标净负）** |
| **B**（不计账） | **0**（零改动） | **0**（零改动） | 本 Feature 不改 SW 面 |
| **C** | **零触碰** | **零触碰** | 零容差 |

| 预算口径 | 叶1 | 叶2 | Σ | +15% 缓冲 | 结论 |
|---|--:|--:|--:|--:|---|
| **A 列（目标口径）** | +2.5~+4.5 KB | −2.5~−1.0 KB | **−0.0~+3.5 KB** | **−0.0~+4.0 KB** | 距档余量 22,454 B / 距生效上限余量 29,597 B ⇒ **正常口径不触发升档** ✅ |
| **A 列（严格口径：DOM/CSS 不计账，ADR-IAN-010 §③）** | +2.5~+4.5 KB | −1.2~+0.3 KB | +1.3~+4.8 KB | +1.5~+5.5 KB | 仍 < 22,454 B ⇒ **两种口径均不触发** |
| **B 列（不计账）** | 0 | 0 | 0 | — | 充分利用（本 Feature 不触 SW） |
| **2.8× 最坏（A 列 Σ 严格上界 4.8 KB）** | — | — | ≈13.4 KB | **≈15.4 KB** | **仍 < 22,454 B ⇒ 不触发**；仍**预置 EC-IAN-016 显式升档路径 + 作者一行**（本阶段不触发、不伪称已确认） |

**波内登记点与逐叶收口重登记**：
- 叶1 收口轮 `W03` ⇒ `TASK-IAN-126`：A 列本叶**正增量**实测登记（预算 +2.5~4.5 KB）+ 五要素 + V3-VOL-3 三值 + 逐模块行（`ian1Rows`）。
- 叶2 收口轮 `W06` ⇒ `TASK-IAN-224`：A 列本叶**净负**实测登记（目标 −2.5~−1.0 KB；**严格口径 −1.2~+0.3 KB**）+ **两叶 Σ 对照** + 五要素 + 三值 + 逐模块行（`ian2Rows`）。
- **波内标注**：W01 落地项 = provider/注入/终端（小）；W02 = 通道/手输（主增量）；**W03 收口登记**（叶1 正增量）；W04 = 删面（主减量）；W05 = 重锚（微量）；**W06 收口登记**（叶2 净负 + Σ）。

**越限 EC-IAN-016 任务化（逐分支；`TASK-IAN-126` / `TASK-IAN-224` 承载）**：

| 分支 | 触发 | 动作 |
|---|---|---|
| ① | 越**生效上限** `> 621,543` | **显式重登记基线**（`SIDEPANEL_BASELINE_BYTES` 同源前移 + 五要素 + V3-VOL-3 三值），**不触发档位** |
| ② | 越**档位 614,400** | 走 **EC 显式升档路径**（档位 → `ceilTo50KB(实测)`，绝对上限 → 档位 × 1.10）+ **作者一行** |
| ③ | 越**绝对上限 675,840** | **停止并请示作者** |
| — | `authorConfirmation` | 保持 `pending-author-line`，**不得伪称已确认**（`N-IAN-013`） |

**减体积优先级（越预算时按序执行）**：① 复用既有文案 / 静态模板；② 元组化声明数据；③ 复用 `askuser` 卡渲染面（第二**语义**分支，零第二 DOM 路径）；④ 纯记账 / 判定下移 `background.js`（不计账，须过 `FR-IAN-115` 反证：不得为绕门禁搬码）；⑤ **显式登记**未落地项（**绝不以删判据 / 放宽容差 / 静默下调档位实现**）。

**ian-2 净负诚实登记（`FR-IAN-115` / `R-IAN-908`）**：`index.html` 的 DOM/CSS 退役经 `build.mjs:95` `copyFile` 进 `dist/sidepanel.html`，**不进** `sidepanel.js` 账本（`ADR-IAN-010 §③` 显式口径）。若 build 实测严格 A 列为**非负（>0）** ⇒ **必须显式登记「为什么删面没有净负」+ 实际归因 + 重新校准**，不得只报 Σ、不得为凑净负搬码。

---

## 6. spikeGate 清单与结论义务

| 代码 | 任务 | 叶/波 | 假设（被验证者） | 被闸门任务 | 结论义务 / 停止规则 |
|---|---|---|---|---|---|
| **SG-IAN-01** | `TASK-IAN-101` | ian-1 / W1 | **`op.turn` 槽承载自由输入可行**：`dispatchChipAction('op.turn', text)` → `bindPanelOps.turn` → `requestTurn` 可达；叶1 `requestTurn(` 仍恰 2、叶2 恰 1；重锚口径（`OP_CALLSITE_SET.op.turn.callSites`）可预演 | `109` / `110` / `111` / `112` / `113` / `116` | 不可行 ⇒ **暂停上报**；**禁**新增 `requestTurn(` 直连 / 放宽计数 / 把提交改走 `submitDescribe` |
| **SG-IAN-02** | `TASK-IAN-108` | ian-1 / W2 | **`askuser` kind 第二语义分支不破载体**：独立 `requestId='free-input'` 不与 `ref-describe` 合流；复用 `.ask-fallback` 家系（id / 互斥 / focus）；`KIND_SET` 40 / 12 kind / 零宿主不动 | `109` / `110` / `116` | 不可行 ⇒ **暂停上报**；**禁**新增 kind / 新增 id 家系 / 改动 `KIND_SET` |
| **SG-IAN-03** | `TASK-IAN-213` | ian-2 / W3 | **journey 八步取代可行**：段内 `composer` 引用清单逐条可定位；替换前后字节账可算；binding 段前改写可用**等长补偿**使 `startAnchor` 仍 = 107780 | `218` / `219` | 字节账显示 binding 段前补偿不可行 ⇒ **binding 改走八步取代**（`ADR-IAN-007` 逃生口）；journey 段内清单与 `ADR-IAN-007` 冲突 ⇒ **暂停上报**（禁静默改段） |

**结论义务（全部 3 个）**：spike 结论须以「假设 / 探针方法 / 实跑证据 / 结论（可行 / 不可行）」五要素写入对应叶的 build 记录；**结论 = 不可行 / 不可构造** ⇒ 对应「被闸门任务」**不得开工**，且按停止规则上报（`blockers`）。**探针产物不落版本库**（`test/_spike/` 探毕删除）。

---

## 7. 门禁守恒总表与新增 / 升级门禁清单

### 7.1 18 门禁三态处置（`FR-IAN-104`；**禁漏项**；三态 = 保留 / 等价重锚 / 显式取代(+台账)）

| # | 层 | 门禁 | F-34 后基线 | 处置 | 承载任务 |
|:-:|:-:|---|--:|---|---|
| 1 | node | `test/op-wiring.test.ts` | `requestTurn(` 恰 2 | **等价重锚**（恰 1 + 反证） | `205` |
| 2 | node | `test/turn-arbitration.test.ts` | 6 | **等价重锚**（回填载体 → 流内；删回填仍必红） | `119` / `210` / `211` |
| 3 | node | `test/r6-ty-experience-fix.test.ts` | 族内 | **等价重锚**（在飞不硬禁用 → 流内面） | `211` |
| 4 | node | `test/sidepanel-view.test.ts` | 族内 | **等价重锚**（三 id 不存在 / 流内可提交） | `211` |
| 5 | node | `test/density-thresholds.test.ts` | 242 | **等价重锚**（`:775` 转「必须入册」；`#send-reason` 保留非恒真） | `206` / `209` / `211` |
| 6 | node | `test/host-registry.test.ts` | 11 | **等价重锚**（容器册 13→16） | `206` / `211` |
| 7 | node | `test/supersession-ledger.test.ts` | 42 | **保留 + 新增**（老 `redlineRemap` 逐字 + X-IAN-1 + journey 新 pin 链 + binding keep） | `215` / `217` |
| 8 | node | `test/insight-tree-hierarchy.test.ts` | 族内 | **保留**（先例引用）+ 本轮取代登记 | `217` |
| 9 | node | `test/settings.test.ts` | 族内 | **等价重锚**（draft → 流内载体） | `208` / `217` |
| 10 | node | `test/size-baseline.ts` | 族内 | **等价重锚 / 新增登记**（逐叶五要素 + 三值；旧条目保留） | `126` / `224` |
| 11 | Chromium | `test/ui/insight.mjs` | 118 | **显式取代 / 消解**（几何读面 → 消解并显式登记；不得静默 `null`） | `220` |
| 12 | Chromium | `test/ui/journey.mjs` | 171 | **等价重锚** + **保护段八步取代** | `218` |
| 13 | Chromium | `test/ui/l0.mjs` | 248 | **等价重锚**（③⑪ → 卡内唯一输入面） | `220` |
| 14 | Chromium | `test/ui/binding.mjs` | 192 | **等价重锚** + **保段 keep** | `219` / `220` |
| 15 | Chromium | `test/ui/recommendation.mjs` | 72 | **等价重锚**（末端项存在 / 不填输入 / 不越预算） | `107` / `220` |
| 16 | Chromium | `test/ui/s0-self-driven.mjs` | 70 | **等价重锚** + **新增 S0'' 断言（只加断言不加文件）** | `124` / `222` |
| 17 | Chromium | `test/ui/l1.mjs` | 131 | **保留**（若需微调 ⇒ 等价重锚 + 台账） | `220` |
| 18 | Chromium | `test/ui/hardening.mjs` | 24 | **保留** | `220` |

> **间接 / 对账面（不计入 18，逐条确认无遗漏）**：`test/notify-tools.test.ts`（6 命中多为消息 `send()`，**非 `#send` 按钮**，逐条区分）/ `test/settings-help.test.ts`（1）/ `test/system-merge.test.ts`（1）/ `test/parity/baseline-catalog.json`（对账基线登记）。

### 7.2 新增门禁（**2 门 node**；`EXPECTED_AUDITED_FILES` 下界只增 +2）

| # | 门禁文件 | 名 | 叶 | 承载任务 | 关键判据 |
|:--:|---|---|:--:|---|---|
| 1 | `test/free-input-next.test.ts` | 自由输入 next 面 | ian-1 | `116` / `121` / `122` | `FIN-1~8`：末端项恒最末 / 零死端 floor / 唯一提交点（不增 `requestTurn(`）/ 手输可判 / 让位槽外 / 空提交不静默 / 回填不覆盖 / 法八 + 各反证 + 三段控制 + 真源切片 |
| 2 | `test/law4-input-as-next.test.ts` | **法四机核** | ian-2 | `216` / `221` | `L4-1~6`：DOM 零命中 / 三 id 入册（=16）/ 默认屏零可见 / 卡内输入可用 / 三段控制禁恒真 / 真源切片 + 双向反证 |

> 2 门禁须由 `test/gate-integrity.test.ts` 的 `EXPECTED_AUDITED_FILES` **只增**（`TASK-IAN-122` / `221`）；**`CHROMIUM_GATES === 9` 逐字不动**（**不新增 Chromium 门禁文件**；S0'' Chromium 面只在既有 `s0-self-driven.mjs` 加断言）。

### 7.3 既有门禁升级清单（**改写 ≠ 删除**）

| # | 既有门禁 | 基线 | 升级内容 | 任务 |
|:--:|---|--:|---|---|
| 1 | `op-wiring` | `requestTurn(` 恰 2 | **等价重锚**为恰 1 + 注入第 2 点必红 | `205` |
| 2 | `next-dispatch-diff0` | D0-1~D0-7 | D0-5（集 A 只增 8→9）/ D0-7（known 集扩张）；`ACT_TO_OP` 仍恰 6 | `106` |
| 3 | `turn-arbitration` | 6 | TA-4 回填载体 → 流内（删回填仍必红） | `119` / `210` |
| 4 | `r6-ty-experience-fix` / `sidepanel-view` | 族内 | 在飞不硬禁用 → 流内输入面 | `211` |
| 5 | `density-thresholds` | 242 | `:389-409` 三 id 不存在 / `:754-776` 容器册 16 + 反证转「必须入册」/ `#send-reason` 非恒真 | `206` / `211` |
| 6 | `host-registry` | 11 | 容器册 13→16 + `TEST_RETIRED_CONTAINER_IDS` 同步 | `206` / `211` |
| 7 | `supersession-ledger` / `insight-tree-hierarchy` | 42 | 老 remap 保留 6→7 + X-IAN-1 一致性 + journey 新 pin + binding keep + 先例引用 | `215` / `217` |
| 8 | `settings` | 族内 | `:191` draft 载体重锚 | `208` / `217` |
| 9 | `l0-disclosure` | 族内 | `NEVER_FOLDABLE.length` 14→13（非恒真） | `206` / `211` |
| 10 | `insight.mjs` | 118 | 几何消解显式登记 + 默认屏零可见输入框 | `220` |
| 11 | `journey.mjs` | 171 | `#15c` → 流外零输入面（同编号等价改写）+ 八步新 pin | `218` |
| 12 | `l0.mjs` | 248 | ③⑪ → 卡内唯一输入面；单写判据 | `220` |
| 13 | `binding.mjs` | 192 | 诊断面重锚 + 段前等长补偿 keep | `219` / `220` |
| 14 | `recommendation.mjs` | 72 | 末端项只增 | `107` / `220` |
| 15 | `s0-self-driven.mjs` / `s0-self-driven-chain` | 70 | S0''-A/-B；只加断言不加文件 | `123` / `124` / `222` |
| 16 | `gate-integrity` / `size-*` / `test:size-ruling-vol3` | 19 / 12 | 受审集合只增 + 五要素重登记 + 三值同源 + 两叶 Σ + 严格口径登记 | `122` / `221` / `126` / `224` |

### 7.4 门禁基线守恒（**只增不减**，`npm test ≥1394`）

`npm test` **1394** · `op-wiring`（`requestTurn(` 恰 2→**恰 1**）· `turn-arbitration` **6** · `density` **242** · `host-registry` **11** · `supersession` **42** · `insight`（Chromium）**118** · `journey` **171** · `l0` **248** · `binding` **192** · `recommendation` **72** · `s0-self-driven` **70** · `l1` **131** · `hardening` **24** · `law8` **36** · `dead-end` **49** · `page-input` **118** · `l2` **74** · `auth-chip` **37** · `stream` **76** · `ask-auth` **78** · `zero-injection` **28** · `l1-reverse` **9** · `l2-reverse` **10** · `gate-integrity` **19** · `size-ruling-vol3` **12** · `ref-pick-wiring` **11** · `design-contract` **60** · `e2e` **PASS** · `CHROMIUM_GATES` **=== 9**。

> 基线引自父 `spec.md §9.5` + `ADR-IAN-008 §①`（**本轮未复跑**）。**唯一例外** = 保护段按台账**显式取代**并留痕（`modifiedRanges[]` + `redlineRemap[]` + 计数守恒只增 + RP-V4-08 反证）。

---

## 8. 停机规则（**12 条**）

| # | 触发 | 动作 |
|:--:|---|---|
| 1 | `dist/content.js` ≠ **177,076 B** / `52a82620…` 或 `dist/pick-layer.js` ≠ **34,358 B** / `77796bab…` | **立即停机**（`N-IAN-001/002` 零容差） |
| 2 | `manifest.json` / `packages/web-cli-base/**` 出现 diff | 停机（`N-IAN-007` / T4 / T5） |
| 3 | `KIND_SET` 新增任一字符串（自由输入被实现成新 kind）/ 12 kind / 零宿主被撞 | 停机（`N-IAN-003/004/010` / `R-IAN-008`） |
| 4 | 第二输入载体 / 第二 `requestTurn(` 直连调用点出现 | 停机（`N-IAN-021/022` / `R-IAN-907`） |
| 5 | 判定链（`policy.ts` / `auto-authorize.ts`）内容哈希变化 | 停机（`N-IAN-018` / T3） |
| 6 | 反证恒绿（注入后仍 PASS） | 停机；重写注入点（`FR-IAN-101`） |
| 7 | `SG-IAN-01/02/03` 结论 = 不可行 / 不可构造 | 被闸门任务**不得开工**（见 `blockers`） |
| 8 | 体积越**绝对上限**或静默改档位 / `authorConfirmation` | 停机（硬墙）；升档须**显式**登记（`ADR-IAN-010` / `EC-IAN-016`） |
| 9 | 任一门禁计数 < 基线（除保护段显式取代且已留痕） | 停机；还原并重锚 |
| 10 | 「真退役」被实现成 `hidden` / `display:none` / 迟挂载；或 ian-1 提前删 `#composer`（中间态破窗） | 停机（`N-IAN-025/027` / `R-IAN-901/902`） |
| 11 | 手输 driver 与 AI 驱动同值；或 AI 代填 / 自动提交用户手输文本 | 停机（`N-IAN-017/023` / `R-IAN-004/906`） |
| 12 | 法四三处只改一处（半修）；或老 `redlineRemap` 被改写 / 删断言充当重锚 | 停机（`N-IAN-005/006/012` / `R-IAN-006/920`） |

---

## 9. 二维时序：build / review / validate 策略（**设计在 build 前可启动**）

> 编排器要求：review / validate 策略**在 build 前**即设计完成（不等到实施后补），形成「叶内波次（横轴） × 三阶段（纵轴）」二维时序。

### 9.1 三阶段在每叶的时序

| 叶 | build（波内） | review（叶收口前） | validate（叶收口） |
|---|---|---|---|
| **ian-1** | `W01`(形态/末端项 + SG-IAN-01) → `W02`(通道/手输 + SG-IAN-02) → `W03`(R6/回填/新门禁/S0''-A/体积) | 判据真空审查（`FIN-1~8` **禁恒真**三段控制）+ 单源审计（末端项注入单源 / `free-input` `requestId` 唯一 / 提交点唯一）+ 注入反证完整性（`requestId` 混用 / 让位移入槽内 / 覆盖非空 / 假 provider） | S0''-A 双面实跑（双入口各成回合）+ 门禁守恒对账 + 体积正增量 + 漂移检测（provider ↔ 驱动器声明 / `data-act` ↔ 集 A / 末端项 ↔ payload） |
| **ian-2** | `W04`(拆除 + op-wiring 同轮) → `W05`(重锚/唯一化) → `W06`(立法/门禁/保护段/S0''-B/体积 + SG-IAN-03) | 重锚纪律审查（18 门禁三态齐、删面 vs 只增张力、老 remap 保留）+ 保护段审查（journey 八步 / binding keep 字节中立）+ 法四一致性（三处 + 台账 old→new）+ 恒真审查（法四门禁三段控制） | 18 门禁逐条复跑 + S0''-B 终态（元素不存在非 hidden + 注入必红）+ journey 新 pin / binding 双绿 + 体积净负 + 两叶 Σ + `e2e` PASS + 漂移检测（条文三处 ↔ 台账 / 容器册 ↔ 门禁 / 保护段 pin ↔ 链） |

### 9.2 review 前置判据（build 前已钉死）

1. **禁恒真**：`FIN-*` / `L4-*` 每条判据必须可注入违反面 + 三段控制（`ok` / `violated` / `n/a`）。
2. **禁纸面**：末端项**单源**（`recommendNextStep` 注入）；提交**唯一槽**（`op.turn`）；载体**唯一**（卡内 `.ask-fallback`）。
3. **禁假绿**：S0'' 走**生产模块真源切片**（不用假 provider / 桩跳过真实卡内输入与通道，`R-IAN-909`）。
4. **禁放宽**：`op-wiring` 恰 2→恰 1 是**等价重锚**（附反证），非放宽；老 `redlineRemap` 逐字保留。
5. **禁代答**：手输不得被 AI 代答 / 代填 / 自动提交（含「AI 建议即提交」变体）。
6. **禁静默**：法四三处一致（半修即红）；保护段哈希变更须八步/台账（禁静默改写）；回填非空不覆盖。

### 9.3 validate 前置判据（build 前已钉死）

| 判据 | 检查 |
|---|---|
| EXIST | 产物存在 + 无 TODO / 桩 |
| SUBSTANCE | 非空实现 + 长度阈值 + 关键路径覆盖（`FIN-1~8` / `L4-1~6` / S0''-1~10） |
| ANTI-PATTERN | 反模式检测 + **反证恒绿检测**（注入后仍 PASS ⇒ 缺陷） |
| WIRING | 接线真实（无孤岛）+ 门禁受审集合下界只增 + 计数只增 |
| DRIFT | 契约漂移（provider ↔ 驱动器声明 / `data-act` ↔ 集 A / 末端项 ↔ payload / `requestId` ↔ 路由 / driver 两值 / 容器册 ↔ 门禁 / 法四三处 ↔ 台账 / 保护段 pin / 两叶 Σ 体积） |

---

## 10. 每叶验收门禁清单（摘要；逐项见各叶 `tasks.md §5`）

- **ian-1**（W3 收口 `127`）：`typecheck` · `build` · `npm test ≥1394` · **`free-input-next`（新）** · `next-dispatch-diff0`（D0-5/D0-7 重锚，`ACT_TO_OP` 仍恰 6）· `op-wiring`（`requestTurn(` 仍恰 2，叶1 不变）· `turn-arbitration ≥6`（TA-4 重锚）· `r6-ty-experience-fix` / `sidepanel-view` · `test:recommendation ≥72` · `test:density ≥242` · `test:law8 ≥36`（零降级）· `test:dead-end ≥49` · `insight-no-escalation`（base 零 diff）· `test:supersession ≥42`（骨架）· `test:gate-integrity ≥19`（`CHROMIUM_GATES === 9`）· `s0-self-driven ≥70` · `test:journey ≥171` · `test:binding ≥192` · `test:l0 ≥248` · `size-*` + `test:size-ruling-vol3 ≥12` · `content.test.ts`
- **ian-2**（W3 收口 `225`）：`typecheck` · `build` · `npm test ≥1394` · **`law4-input-as-next`（新）** · `op-wiring`（`requestTurn(` **恰 1** + 反证）· `turn-arbitration ≥6`（唯一化侧）· `r6-ty-experience-fix` / `sidepanel-view` · `density-thresholds ≥242`（容器册 16）· `host-registry ≥11` · `l0-disclosure`（14→13）· `settings`（draft 重锚）· `supersession-ledger ≥42` · `insight-tree-hierarchy`（保留）· `test:insight ≥118` · `test:journey ≥171`（八步取代）· `test:binding ≥192`（keep）· `test:l0 ≥248` · `test:recommendation ≥72` · `s0-self-driven ≥70` · `test:l1 ≥131` · `test:hardening ≥24` · `test:law8 ≥36` · `test:dead-end ≥49` · `test:gate-integrity ≥19` · `size-*` + `test:size-ruling-vol3 ≥12` + **两叶 Σ** · `e2e` PASS

---

## 11. 未落地 / 待测点（禁预填）

| # | 主题 | 状态 | 归属任务 | 规则 |
|:--:|---|---|---|---|
| `IAN-P-001` | A 列（叶1）实测净增 + 是否触发档位上调 | `pending-measurement` | `126` | 禁预填；二态显式（越生效上限 ⇒ 重登记 / 越档位 ⇒ EC-IAN-016 + 作者一行 / 未越 ⇒ 如实登记） |
| `IAN-P-002` | 叶1 新门禁 `free-input-next` 三段控制可达性 | `pending-measurement` | `121` | 禁预填；`n/a` 不得冒充 `ok`（`N-IAN-024`） |
| `IAN-P-003` | 人工面 M1（末端项可发现性）/ M2（时隐时现困扰是否消失）/ M5（排队体感） | `pending-human` | `124` | 逐项 `⏳ 未执行` / `PASS`，不得冒充 PASS |
| `IAN-P-004` | V3-VOL-3 档位升档的作者一句外部确认（跨叶共享） | `pending-author-line` | `126` / `224` | 不得伪称已确认（`N-IAN-013`） |
| `IAN-P-005` | SG-IAN-03 字节账：binding 段前等长补偿是否可行（逃生口 = 八步） | `pending-measurement` | `213` | 禁预填；实测字节为准，冲突回写 `ADR-IAN-007` 对应行（台账同轮） |
| `IAN-P-006` | A 列（叶2）实测净增（严格口径是否净负）+ 两叶 Σ | `pending-measurement` | `224` | 禁预填；若非负须显式登记「为什么删面没有净负」+ 重新校准（`FR-IAN-115` / `R-IAN-908`） |
| `IAN-P-007` | 人工面 M3（卡内输入键盘手感 / 焦点流转）/ M4（读屏可用性） | `pending-human` | `222` | 逐项 `⏳ 未执行` / `PASS`，不得冒充 PASS |
| `IAN-P-008` | 法四三处修订的最终措辞（体例微调后语义逐字等价） | `resolved-plan` | `214` | old/new 逐字入台账；不得升格法十 |
| `IAN-P-009` | 叶2 波次细化：`op-wiring` 重锚前移至 W1（与 DOM/写者删除同轮） | `resolved-tasks` | `205` | tasks 显式裁决（`FR-IAN-091` 同轮 + 每波收口门禁绿）；plan §7 归属同步登记 |
| `IAN-P-010` | `KL-N-10` 家族 flake（`page-input` 陈旧 fixture / `binding` CDP / `ask-auth` 陈旧 profile） | `pending-measurement` | `223` / `225` | 隔离复跑 ≥2 + 日志全量；仍红如实记录不阻塞收口（`EC-IAN-015` / `R-IAN-012`） |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（F-35 父任务总览：**2 叶 × 6 波 × 52 任务**（`TASK-IAN-101~127` / `201~225`；S×4 / M×39 / L×9）+ 波次总表 + 两叶任务索引 + 跨切红线（`N-IAN-001~028` / `X-IAN-1~11` / `T1~T15`）→ 任务映射 + **体积分列预算逐叶分摊（A 列 ian-1 +2.5~4.5 KB / ian-2 −2.5~−1.0 KB 目标净负；严格 −1.2~+0.3 KB）+ 波内登记点 + EC-IAN-016 逐分支任务化** + 共享面「恰一次」登记 + **S0'' 双面落点表** + 3 个 spikeGate（SG-IAN-01/02/03，plan 未命名、按编排器任务书登记）+ **新增 2 门禁（`free-input-next` / `law4-input-as-next`）/ 升级 16 组既有门禁清单** + 门禁守恒总表（18 门禁三态 + `npm test ≥1394` + `CHROMIUM_GATES === 9`）+ 停机规则 12 条 + build/review/validate 二维时序 + 未落地 / 待测点 10 项。**本轮只做 tasks**：零 `src`/`test`/`dist`/`docs`/`design`/ROADMAP 改动；未跑门禁 / 构建 / Chromium；未调用任何受管 Provider（routing.v1 = `local_or_compute → none`） | 2026-09-25 | SDDU Tasks Agent |
