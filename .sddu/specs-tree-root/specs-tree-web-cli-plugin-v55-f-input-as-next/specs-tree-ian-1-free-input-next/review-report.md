# 审查报告：specs-tree-ian-1-free-input-next

> **文档定位**: SDDU 审查报告 — 逐项记录自主审查的执行结果，作为 validate 阶段的输入
> **审查策略**: `review.md`（C1~C26 审查清单 + 四维度指引）
> **前置依赖**: `review.md` · `spec.md`（v1.0）· `plan.md`（v1.0）· `tasks.md`（v1.0）· `build.md`（v2.0，R1+R2 叶1 收口）· 父 `../plan.md`（ADR-IAN-001/002/003/008/009/010）
> **审查对象**: `feature/web-cli-plugin` @ **`f3af634`**（R1 `e76f455` + R2 `2aa58ab` / TREE `f3af634`；任务 **27/27**）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-25
> **审查轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-25
> **更新说明**: 初始创建（叶1 流内自由输入 next 通道静态审查：26 Cx / 23 ✅ / 3 ⚠️ / 0 ❌ / **0 BLOCK** / 3 I / 2 O；亲跑 node `npm test` 1431/0 + Chromium 五门禁 + 三冻结面/体积/红线终核）

---

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查项总数 | 26（C1~C26） |
| 通过 | 23 |
| 警告 | 3 |
| 失败 | 0 |
| 阻塞问题 | **0** |

> 结论：**✅ 通过**（可进入 validate 动手验证）。阻塞 0；改进 3（< 5 阈值）；规范符合性偏差 0。

---

## 2. 逐项审查结果（C1~C26）

| # | 审查对象 | 审查基准 | 评估 | 发现 | 严重程度 |
|---|---------|---------|:--:|------|:--:|
| C1 | 末端项「自由输入…」存在 ∧ 恒最末 | FR-IAN-010/014 · ADR-IAN-001 §① | ✅ | provider 恒真（`providers.ts`）+ `recommendNextStep` 单点注入；`nextstep.ts` 把终端 append 在 `.next-chips` **之后**且 `data-act='free-input'`；`recommendation.mjs ⑰` 与 `S0C-12` 真面板均判最末 | 低 |
| C2 | 点开就地展开卡内输入（零第二 DOM 路径 / 不常驻） | FR-IAN-011/012 | ✅ | `openFreeInputCard` 铸 `askuser` 卡（`askKind:'text'` 出生即展开）+ `setCardFallbackOpen`；终端是 `<button>` 非输入框；`S0C-12` 判 `#ask-fallback` 可见 + `#ask-input` 获焦 | 低 |
| C3 | 零死端 floor | FR-IAN-013 · EC-IAN-001 | ✅ | `recommendNextStep` 在 `raw.length===0` 且 `!busy` 且间隔已过 ⇒ 铸仅含终端最小卡（零 chip / `rule` 缺省）；FIN-2 亲跑；`test:dead-end 53/0` | 低 |
| C4 | `op.describe` 有值相语义不变 | FR-IAN-015 · NFR-IAN-008 | ✅ | `handleCardAction` 按独立 `requestId='free-input'` 分流 ⇒ 其它 requestId 仍走 `submitAskFor`；`askFixedText` 对 `ref-describe` 仍回显、对 `free-input` 不回显（亲测对照） | 低 |
| C5 | 提交唯一经 `op.turn` 槽；`requestTurn(` 恰 2 | FR-IAN-016/020/021 | ✅ | `submitFreeInput` 无 `requestTurn(`；经 `dispatchOp('op.turn',{value:text})` → `runOp` → `PANEL.turn` → `requestTurn`；亲数 `requestTurn(` 调用点 = **2**（`sidepanel.ts:3888` composer ∧ `:3915` op.turn 槽）；`op-wiring 14/0` | 低 |
| C6 | 手输/AI driver 两值可判 | FR-IAN-022 · 024 · EC-IAN-013/018 | ✅ | `MANUAL_DRIVER_ID='manual'` 单源（`ai-drive.ts` 恰一处）∧ ∉ `listDriverDecls()`；手输写 `driver=manual`，AI 路径写候选声明 id；FIN-4 含同值反证 | 低 |
| C7 | 让位语义槽外 | FR-IAN-023 | ✅ | `proactivity.noteUserTurn()` 在 `submitFreeInput` 内、`requestTurn` 体外；FIN-5 切片 + 反证 | 低 |
| C8 | 空提交不静默 | EC-IAN-004 | ✅ | `if(!text){ dispatch(notice); return; }` 先于 `dispatchOp`；FIN-6 含「删通知 ⇒ 必红 / 删守卫 ⇒ 必红」双反证 | 低 |
| C9 | a11y focus / 键盘 | FR-IAN-019 · EC-IAN-010 | ✅ | `askuser.ts` 对 free-input 加 keydown（Enter 提交 / Escape 取消）；`S0C-12` 判 `activeElement.id==='ask-input'` | 低 |
| C10 | 零新增载体 | FR-IAN-017 · NFR-IAN-007 | ✅ | 亲测：`KIND_SET`=**40** · 12 kind=**12** · `REGISTERED_STRUCTURAL_HOSTS=[]` · `ACT_TO_OP`=**6** ∧ `free-input` ∉ `ACT_TO_OP` ∧ ∈ 集 A；FIN-0 + `insight` IAN-1 面 | 低 |
| C11 | 法八零明文 | FR-IAN-018 · NFR-IAN-004 | ✅ | 亲跑 `law8 60/0`（含 ⑩ 自由输入零明文面：payload 恰 1 命中 ∧ 卡固化不回显 ∧ digest/审计/DOM 属性零命中）；FIN-8 + 退化回显反证 | 低 |
| C12 | 特权 op 恒 gesture | FR-IAN-025 · NFR-IAN-002/003 | ✅ | `op.turn` ∈ `auto` 档；`insight-no-escalation` IAN-1 扩面亲跑（特权恒 gesture ∧ SW 永不 `permissions.request(`）；提交路径不触达特权 op | 低 |
| C13 | R6 双入口并存 ∧ 在飞不硬禁用 | FR-IAN-030/031 · NFR-IAN-006 | ✅ | `NEXT_TERMINAL_CLASS='next-terminal'` ≠ `'next-chip'`；`syncNextstepPending` 只扫 `button.next-chip`；`submitFreeInput` 仅 `!state.activeOrigin` 异常态硬拒（无 `pending` 门控）；`sidepanel-view`/`r6-ty` node 反证 + `S0C-12` 真面板读数 | 低 |
| C14 | 流内回填 / 不覆盖 / 卡收起重展开 | FR-IAN-032/033/086 · EC-IAN-003 | ✅ | `restoreFreeInputDraft` 三分支（卡在仅当为空 / 卡收起重展开 + focus / 卡不存在按需铸造）+ 流外 `#input` 逐字保留（双载体互不覆盖）；TA-8 / FIN-7 各含反证；`S0C-12` 真 DOM 双回填（`bf1.input===R ∧ bf1.card===R`，非空不覆盖） | 低 |
| C15 | S0''-A 中间态样板双面 | FR-IAN-070~074 · AC-IAN-001/027 | ✅ | 亲跑 `test:s0-self-driven 81/0`（S0C-12 真面板：点末端项 → 获焦 → 真键入 → 真提交 → 流内 `user` 行 → 旧 `#composer` 仍可用 → 双回填）；node 面 `s0-self-driven-chain` 真管线回合 + 反证族 ×7；样本单源 `s0-chain.mjs` | 低 |
| C16 | 四处兜底入口流内载体内接线 | FR-IAN-050/052 | ✅ | `handleCardAction('free-input')` 只 `openFreeInputCard()`（reveal 卡内 `.ask-fallback`）；未新增流外载体 / 未动旧面 | 低 |
| C17 | 门禁治理骨架 | FR-IAN-100~106 | ✅ | 亲跑 `gate-integrity 23/0`（下界只增 `free-input-next` ∧ `CHROMIUM_GATES===9` 不动）· `supersession 45/0`（+3，断言零删除）；新门禁含 `expectFailPattern` + 反证实跑 | 低 |
| C18 | 体积五要素 / EC-IAN-016 | FR-IAN-110~115 · NFR-IAN-001 | ✅ | 亲测 `stat dist/sidepanel.js`=**599,125**（== 登记值；`size-budget` skipped=0 ⇒ 同源）；591,946→599,125（+7,179）；生效上限 629,081 / 档位 614,400 / 绝对上限 675,840 / `pending-author-line`；EC-IAN-016 二态「否」；越叶预算如实登记（详见 §5-I-02 与附录 B-6） | 低 |
| C19 | 定义/注册表/分发表一致 | plan §4-1/§4-2 | ✅ | provider 11（含 `free-input`）· `DRIVER_DECLS_SRC` 11 · `ACT_TO_OP` 6 · 集 A 9 · `NEXTSTEP_PRIORITY` 4；`next-dispatch-diff0`/`driver-quadruple` 亲跑 | 低 |
| C20 | 文件影响对齐（plan §5）∧ 零改上游 | plan §5 · NG-IAN-003~006 | ⚠️ | 上游零改：`turn-queue.ts` diff=0 · base/manifest/判定链零 diff。但 plan §5 未列 4 个连带改动文件（`next-registry/ops.ts` / `stream-model.ts` / `chat-state.ts` / `stream-plaintext.ts`）——build §6/§8 已如实登记。见 I-01 | 低 |
| C21 | 模块边界与单一职责 | ADR-IAN-001 §① | ✅ | `reachableOpIds` 只收真实注册 op（过滤 `free-input` 协议动作，避免污染「可用操作(N)」）；`askuser.ts#openAskCardIdByRequest` 收敛 `textAskCardId`/`freeInputCardId` 两处查询为单源纯函数 | 低 |
| C22 | 错误处理与可读行 | EC-IAN-004 | ✅ | 空提交 / 无活跃站点各写可读 notice（复用既有通道，零新 kind）；`cancelFreeInputCard` 本地固化零 SW 投递（free-input 非提问） | 低 |
| C23 | 新门禁质量 | TASK-IAN-116/121 | ✅ | `free-input-next.test.ts` 536 行：FIN-0~9 共 10 条判据（元判据 `JUDGEMENTS.length===10`）+ 逐条 `expectFailPattern` + 反证（注入式 forged 源 / 合成伪造体，真源码零触碰）；亲跑 22/0 | 低 |
| C24 | 双面测试有效性 | ADR-IAN-008/009 | ⚠️ | 样本单源 ✅（R2 零新增文件；仅叶范围新增 `test/free-input-next.test.ts`）；三段控制 ok/violated/n/a 可达 ✅。但「在飞时终端可用」与「空提交不静默」的行为级端到端驱动仅落在源码切片/结构读数（`S0C-12` 在空闲态读 `disabled===false`，未真在 pending=true 下点击终端）。见 I-03 | 低 |
| C25 | 台账一致性 | FR-IAN-102/114 | ⚠️ | `xIianLedger.rows`=**7**（X-IAN-1~7：3 `superseded` / 4 `no-supersession`，counterCheck 可定位）· `xIianGateReconciliation.rows`=**11**（old→new + `assertionsRemoved=0`）；`ian1Rows` Σ +7,179 + glue 0 == 叶增量。但 `docs/v4-density-baseline.json` 的 `effectiveCeilingRule`/历史注记字段仍停留旧轮次数值（602,095 / 573,424 等），与同文件 `volume.registeredBaselineBytes=599125` 并存易误读（build §6-B-7 已声明零触碰）。见 I-02 | 低 |
| C26 | 冻结面 / 红线终核 | FR-IAN-112 · NFR-IAN-005 | ✅ | 亲测：`content.js` 177,076 B / sha `52a82620…` · `pick-layer.js` 34,358 B / sha `77796bab…`（逐字节不变）；保护段亲跑 `journey 171` / `binding 192`（首跑 CDP-socket flake ⇒ 隔离复跑 PASS，与 KL-N-10 登记一致）；`law8 60` / `dead-end 53` / `recommendation 79` 保段 | 低 |

---

## 3. 审查维度汇总

| 审查维度 | 审查项数 | 通过 | 警告 | 失败 | 通过率 |
|---------|:--:|:--:|:--:|:--:|:--:|
| 代码质量（C21/C22） | 2 | 2 | 0 | 0 | 100% |
| 规范符合性（C1~C18） | 18 | 18 | 0 | 0 | 100% |
| 架构一致性（C19/C20/C25） | 3 | 1 | 2 | 0 | 33.3% |
| 测试质量（C23/C24/C26） | 3 | 2 | 1 | 0 | 66.7% |
| **合计** | **26** | **23** | **3** | **0** | **88.5%** |

> 规范符合性维度（C1~C18）**100%**；3 个 ⚠️ 均为文档一致性 / 测试完备性改进项，非需求偏差、非功能缺陷。

---

## 4. 阻塞问题

| # | 位置 | 问题 | 对应 Cx | 修复建议 |
|---|------|------|:--:|---------|
| — | — | **无**（0 BLOCK） | — | — |

---

## 5. 改进建议

| # | 位置 | 问题 | 对应 Cx | 建议 |
|---|------|------|:--:|------|
| I-01 | `plan.md` §5 文件影响分析 | 漏列 4 个连带改动文件：`next-registry/ops.ts`（`reachableOpIds` 只收真实 op 的行为变更）/ `stream-model.ts` + `chat-state.ts`（`nextstepTerminal` 加法字段）/ `stream-plaintext.ts`（`ASK_COPY.freeInputSubmitted`）。build §6-A-2/§8 已如实登记为「文件清单外连带重锚」。 | C20 | 文档一致性（非功能）：后续叶 plan 的 §5 一并列出这 4 个关联点，或在 build 偏差登记处交叉引用 plan 行号。 |
| I-02 | `packages/web-cli-plugin/docs/v4-density-baseline.json` | `volume.registeredBaselineBytes`/`ceilingBytes` 已同源前移至 599,125 / 629,081，但同文件 `effectiveCeilingRule` 与 `directionalAlert` 等注记字段仍停留旧轮次（602,095 / 573,424 / 591,946 等），读者易误读；build §6-B-7 已声明本叶零触碰。 | C25 | 建议后续轮统一刷新该文件的注记字段（或显式标注「该字段为历史链，权威值以 `registeredBaselineBytes` 为准」），与 `test/size-baseline.ts` 保持同源口径。 |
| I-03 | `test/ui/s0-self-driven.mjs`（S0C-12）· `test/free-input-next.test.ts`（FIN-6） | 「在飞时终端可用（EC-IAN-002）」与「空提交不静默（EC-IAN-004）」目前以**结构/源码切片**判据覆盖（终端 class 单源 ∧ 同步器不覆盖 ∧ 提交体无 pending 门控；空守卫先通知后返回），未在真面板上以 `pending=true` 实际点击终端并观察 `queued`、也未真触发一次空提交读 notice。 | C24 | 建议 validate 阶段补一条行为级用例：真面板置 pending ⇒ 点终端 ⇒ 提交 ⇒ 断言流内 `queued` 可读行（SW 仲裁）；并补一次空提交 ⇒ 断言 notice 行上屏。 |

> 改进项 **3 < 5**（阈值），不阻塞。

---

## 6. 结论

**结论**: **✅ 通过**

| 指标 | 结果 |
|------|------|
| 审查通过率 | 88.5%（23/26） |
| 阻塞问题数 | **0** |
| 规范符合性偏差 | **0** 项（C1~C18 全 ✅；ADR-IAN-001 §① 措辞差异见附录 C，判为观察项） |
| 可进入 validate | **是** |

**理由**：
1. **提交通道正确**（重点 1）：自由输入提交**唯一**经 `op.turn` 槽；亲数 `requestTurn(` **仍恰 2**（composer submit + op.turn 槽）；`ACT_TO_OP` 仍恰 **6**；集 A **8→9**（含 `free-input`）而集 B 不增（`free-input` ∉ `ACT_TO_OP`）。
2. **卡内输入安全**（重点 2）：独立 `requestId='free-input'`（`openAskCardIdByRequest` 亲测两语义互不干扰）∧ 与 `ref-describe` **不共用**（退化注入 ⇒ FIN-0 与 FIN-8 双判官**必红**，已亲测）；法八零明文亲跑 `law8 60/0`（含 ⑩）；空提交先 notice 后 return（非静默）。
3. **R6 迁移行为级**（重点 3）：终端非 `.next-chip` ⇒ 在飞不被 `syncNextstepPending` 压制；`submitFreeInput` 仅异常态硬拒；排队端到端经 SW 既有仲裁（`turn-queue.ts` diff=0）；双回填载体由 `S0C-12` 真 DOM 亲跑（互不覆盖）。
4. **S0''-A 中间态**（重点 4）：Chromium 亲跑 **81/0**（双入口互不破坏）；R2 **零新增文件**、样本单源 `s0-chain.mjs`。
5. **floor 口径裁决**（重点 5）：判定 R1 §6-A-8 处置**正当**——`empty` 覆盖、`safety` 不覆盖，fail-closed **未放松**（详见附录 C）。
6. **体积/台账**（重点 6）：`599,125` 五要素同源（`skipped=0`）；越叶预算 +7,179 如实登记（不停机、不静默降档、`pending-author-line` 未伪称）；`xIianLedger` 7 行 + 门禁对账 11 行。
7. **门禁与红线**（重点 7）：`npm test` **1431/0**；三冻结面逐字节不变；`KIND_SET 40`/12 kind/特权手势/`journey 171`·`binding 192` 保段。

---

## 附录 A — 亲跑对账（R1 审查轮）

| 门禁 | 亲跑结果 | 登记值（build.md） | 判定 |
|------|:--:|:--:|:--:|
| `npm test`（node） | **1431 / 0** | 1431 / 0 | ✅ 一致 |
| （其中）`free-input-next` | 22 / 0 | FIN-0~9 | ✅ |
| （其中）`turn-arbitration` | 7 / 0 | TA-1~8 | ✅ |
| （其中）`gate-integrity` | 23 / 0 | 23 / 0 | ✅ |
| （其中）`supersession` | 45 / 0 | 45 / 0 | ✅ |
| （其中）`insight-no-escalation`（node） | 21 / 0 | — | ✅ |
| （其中）`op-wiring` | 14 / 0 | 14 / 0 | ✅ |
| （其中）`size-budget` + `size-ruling-vol3` + `size-growth-evidence` | 47 / 0（**skipped 0**） | PASS | ✅ 实际产物 == 登记 599,125 |
| `test:s0-self-driven`（Chromium） | **81 / 0** | 81 | ✅ 一致（含 S0C-12） |
| `test:law8`（Chromium） | **60 / 0** | 60 | ✅ 一致（含 ⑩） |
| `test:ui`（journey） | **171** | 171 | ✅ 保段 |
| `test:binding` | 首跑 CDP-socket 环境 flake ⇒ **隔离复跑 192 PASS** | 192（KL-N-10 登记） | ✅ 与登记一致 |
| `test:recommendation` | **79 / 0** | 79 | ✅ 一致 |
| `test:dead-end` | **53 / 0** | 53 | ✅ 保段 |

> 说明：`dist/`、`dist-test/` 均被 `.gitignore` 忽略；亲跑未污染工作区（`git status` 空）。

## 附录 B — 重点亲核证据

1. **提交通道**：`submitFreeInput` 体（`sidepanel.ts:2921-2934`）无 `requestTurn(`，经 `dispatchOp('op.turn',{value:text})`；`requestTurn(` 调用点 = `sidepanel.ts:3888`（composer submit）∧ `:3915`（`bindPanelOps.turn`）⇒ 恰 2。
2. **集 A / 集 B**：`SET_A_PROTOCOL_ACTIONS` = 9（末项 `'free-input'`）；`ACT_TO_OP` 键 = 6（`next/repick/describe/authorize/rebind/help`）且**不含** `free-input`。
3. **独立 requestId**：`openAskCardIdByRequest(events,'free-input')` = `c1`、`('ref-describe')` = `c2`、未知 = `undefined`；`askFixedText(free-input)` = `已提交（内容在对话中）`（**不回显**）vs `askFixedText(ref-describe)` = `已答：SENTINEL-XYZ`（回显）。
4. **退化注入必红（亲测）**：把 `FREE_INPUT_REQUEST_ID` 改为 `'ref-describe'` ⇒ FIN-0 静态判官 `false`（红）；以 `{requestId:'ref-describe', answer: FIN8_SENTINEL}` 走固化 ⇒ `law8Problems` 报 1 problem（「卡固化不得回显用户文本」）。
5. **在飞不硬禁用**：`syncNextstepPending` 源体只 `querySelectorAll('button.next-chip')`；`NEXT_TERMINAL_CLASS='next-terminal'`；`submitFreeInput` 仅 `if(!state.activeOrigin)` 硬拒（无 `state.pending`/`buttonStates`）。
6. **体积同源**：`stat -c %s dist/sidepanel.js` = **599125**；`size-budget` 的「built sidepanel.js within ceiling」用例 **未 skip** 且通过 ⇒ 登记值 == 实测产物。五要素：591,946 → 599,125（+7,179）/ 生效上限 629,081 / 档位 614,400 / 绝对上限 675,840 / `pending-author-line`；EC-IAN-016 三档均「否」。
7. **台账**：`xIianLedger.rows` = 7（X-IAN-1~7）· `xIianGateReconciliation.rows` = 11（每行 `assertionsRemoved=0`）。
8. **冻结面**：`sha256(content.js)` 前 8 位 `52a82620` · `sha256(pick-layer.js)` 前 8 位 `77796bab`。

## 附录 C — floor 口径裁决复核（R1 §6-A-8）

- **ADR-IAN-001 §① 字面**：「若**无任何候选**（原 `suppression ∈ {'empty','safety'}`）且 `!busy` 且间隔已过 ⇒ 铸造仅含该终端的最小推荐卡」。
- **落实现状**：`recommendNextStep`：`rules.length===0` 时，仅当 `raw.length===0`（`empty`）走 floor；`raw.length!==0`（`safety`）**照旧返回 0 卡 + `suppression:'safety'`**（build §6-A-8 已登记为口径裁决点）。
- **判定：正当**。理由：① `NFR-IAN-006`（兜底接线**不得放松 fail-closed 方向**）优先；② `safety` = 「存在候选但全被安全边界拦下」，与「无任何候选」语义不同，此时给「自由输入…」入口方向与 fail-closed 相反；③ 改动**未删任何既有判据**——`recommendation-sources` safety 用例逐字保留、FIN-2 第三条亲跑断言 `safety ⇒ 0 卡`；④ 判据力零放宽、无静默降档。
- **观察项 O-01（非阻塞）**：ADR-IAN-001 §① 的 `{'empty','safety'}` 措辞与落地口径不一致（属 ADR 侧措辞过宽）。建议叶2 / 作者在规范侧显式收窄为 `empty`，并登记 `safety` 的 fail-closed 语义，以免后续轮误按字面扩张。

## 附录 D — 观察项（不计入 I 项）

| # | 观察 | 说明 |
|---|------|------|
| O-01 | ADR-IAN-001 §① floor 口径措辞过宽 | 见附录 C；裁定落地口径正当，建议规范侧订正措辞。 |
| O-02 | S0''-A node 面「旧入口跑通一轮」为**接线判据**（非 DOM 真回合） | build §6-B-3 已在 `s0-self-driven.mjs` 注释与 `s0ppProblems` 文档显式登记；真 DOM 双回合由 Chromium `S0C-12` 承载（禁脚本绿冒充链路可判，如实）。 |

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0（R1） | 初始审查报告：26 Cx / 23 ✅ / 3 ⚠️ / 0 ❌ / **0 BLOCK** / 3 I / 2 O；亲跑 `npm test 1431/0` + Chromium `s0-self-driven 81/0` · `law8 60/0` · `journey 171` · `binding 192` · `recommendation 79/0` · `dead-end 53/0`；三冻结面 sha 双锚 + 体积五要素同源 599,125 + `xIianLedger` 7 行 / 门禁对账 11 行终核；重点 1~7 逐项亲核（含 requestId 退化注入必红、floor 口径裁决正当）；结论 ✅ 通过。 | 2026-09-25 | SDDU Review Agent |
