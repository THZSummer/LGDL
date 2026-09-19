# 审查报告：specs-tree-v4-3-ask-auth-inflow

> **文档定位**: SDDU 审查报告 — 逐项记录自主审查的执行结果，作为 validate 阶段的输入
> **审查策略**: `review.md`（C1~C13 审查清单 + FR→Cx 覆盖矩阵 + 12 个打假面 + 判据纪律）
> **前置依赖**: `review.md`、本叶 `spec.md`/`plan.md`/`tasks.md`/`build.md` v2.0、父 `../spec.md` §5.5/§8.3/§10、`docs/v4-supersession-ledger.json`、`docs/v4-density-baseline.json`、v4-2 `review-report.md`（标准先例）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-19
> **审查轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-19
> **更新说明**: 初始创建（R1 全量静态审查 + 只读复跑 5 项 + 2 个最小复现脚本：C1~C13 逐项结论 + **BLOCK-01~04** + I-01~I-08 + 红线零改动核验 + 台账独立复算 + AC 逐条证据）

---

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查项总数 | **13**（C1~C13） |
| 通过 | **4**（C3 / C4 / C6 / C12） |
| 警告 | **5**（C2 / C5 / C8 / C10 / C11） |
| 失败 | **4**（C1 / C7 / C9 / C13） |
| 阻塞问题 | **4**（BLOCK-01~04） |
| 改进项 | **8**（I-01~I-08；高 1 / 中 5 / 低 2） |
| 规范符合性偏差 | **4**（AC-CHAT-014 部分 / 015 / 016 + FR-CHAT-047·047 的 `rounds[]` 声明） |

**被审基线**：仓库 `/home/usb/wks/gits/GitHub/LGDL` · 分支 `feature/web-cli-plugin` · HEAD `1fb26bb` · diff 基线 `0f8a1fb`（v4-2 收口轮）；R1 功能段 `b58a52d`+`3eea886`、R2 收口段 `1fb26bb`。`main` 未动。

**纪律声明**：本轮**未修改**任何源码/测试/配置/既有文档；仅新增 `review.md`、`review-report.md`，更新本叶 `state.json`（阶段登记 + `files.review`/`files.reviewReport`）、父 `state.json`（`childrens[]` 的 v4-3 阶段同步，用户指令遗留项）与 `TREE.md`。复现脚本写在 `/tmp/opencode/v43-review/`（不写入仓库）；复跑门禁只读（`dist/**`、`dist-test/**` 为 gitignored 产物，`npx tsc --noEmit` 不写盘）。

**结论一句话**：承载层内化、固化契约、取代台账、体积与红线**主体成立**（门禁 22/22 rc=0，本机复跑 5 项一致，71 条台账逐条机核通过），但**终态机在「非 happy-path 终态」上有两处硬缺陷、auth 卡的 `cancelled` 终态会渲染成「已批准」、审计入口在真实主路径点了没反应、L1 已决策历史把流内答案记错**——其中「假批准」与「假超时」直接违背本叶「留痕即事实」的核心目标，故判 ❌ 不通过。

---

## 2. 逐项审查结果（C1~C13）

| # | 审查对象 | 审查基准 | 评估 | 发现 | 严重程度 |
|---|---------|---------|:--:|------|:--:|
| C1 | 终态机正确性（六终态 × 竞态 / 越界终态） | FR-CHAT-041~044 · ADR-V4-030 §2/§4 · EC-CHAT-001/002/003 | ❌ | ② 越界终态：auth 卡的 `cancelled` 终态在**三条路径**上都会被造出（会话切换 `chat-state.ts:445-446`、被新 ask 取代 `stream-model.ts:437-445`、回合结束 `chat-state.ts:437-438`），而渲染层把它映射为**「已批准」+ `data-decision="pending"`** ⇒ **假授权留痕**（BLOCK-01）；③ 回合结束被当作「60 s 超时」结算**面板自有**引用回合 ask ⇒ 拾取流程的引用问题被立刻冻结 + **未发生的超时**被写进留痕（BLOCK-02）。① 正向路径（回答 / 用户取消 / 真超时 / 批准 / 拒绝 / 取代 / 会话切换）与终态冻结（`project()` 首次终态事件后忽略后续）经走查 + 真实 reducer 复现**成立** | 阻塞 |
| C2 | 未终态卡仲裁与上限（`MAX_OPEN_ASKS` / ref 优先 / 最旧 supersede） | FR-CHAT-044/048 · ADR-V4-032 §1~§3 | ⚠️ | 上限语义**正确且与 ADR 一致**（open=2 时第 3 张 supersede **最旧**：`stream-model.ts:412-415` 的 `while (remaining.length - i >= MAX_OPEN_ASKS)` 实测只挑 1 张 = 最旧；ref 到达先清后台 ask）。但 ① `MAX_OPEN_ASKS=2` **允许两张 `askuser` 同开**，`buildForm` 对每张卡无条件铸造同族 `#ask*` id（无 auth 那样的去重守卫）⇒ 重复 DOM id + 旧 id 读取方错位（I-04）；② ADR-V4-032 §2「ref 到达 ⇒ 先 supersede **所有**后台 ask」在代码里被 `if (open.length < MAX_OPEN_ASKS) return` 短路，仅在 ≥2 张时生效（实际由 `supersededAsk` 兜住，故无功能后果，但注释/ADR 与代码字面不一致） | 中 |
| C3 | 固化不可逆与零控件 | FR-CHAT-041/042 · AC-CHAT-003/005 · shim C5~C10 | ✅ | 结构性不可二次**成立**：终态分支不创建表单（`cards/askuser.ts:65-73`）、迁移时**移除**表单节点（`:192-199`）、终态后 `#ask*`/`#confirm*` id 不再铸造；DOM 零控件断言（`ask-auth-inflow.mjs` ④ 实测 0）与「后续事件不得改写」（`project()` 终态冻结 + `test/ask-auth-inflow.test.ts:94-103`）双证据。可达性：`aria-live=polite` 在 `.card-fixed`（门禁 ⑧ 三视口实测）；`#composer` 与 `#ask-fallback` hidden 语义保持 | — |
| C4 | 承载层内化（独占槽退役 / 宿主清零 / 残留面登记） | FR-CHAT-040 · ADR-V4-030 §4/§6/§7 · HO-2 | ✅ | `index.html` `data-transitional-host="v4-3"` 计数 = **0**（实测只剩 2 个 v4-4 宿主，与 `l0.mjs:84` 登记值 2 一致）；`#ask*`/`#confirm*` 静态标记已从 `index.html` 移除并入 `density-thresholds.test.ts#V4_RETIRED_IDS`；`decision-card.ts` 已删且全仓零残留引用（仅 3 处**注释**提及）。**残留面归属说明（不计缺陷）**：`#l0-decision` 容器（`#l0-pick`/`#l0-more`/`#l1-more-options` 池）仍在流内宿主，且 `l0-more` 的 N 仍由 `state.ask` 派生（`view-model.ts:849-852`）——该面属 **v4-4**（`data-transitional-host="v4-4"` / TASK-812 清零义务），且已被门禁显式断言计数，故判「已登记的过渡形态」而非缺陷 | — |
| C5 | 留痕因果与文案单源 | FR-CHAT-042/043/044 · ADR-V4-031 §2/§3 · NFR-CHAT-001 | ⚠️ | `ASK_COPY` 单源 + `cancelSystemLine(reason)` 三选一的实现**干净**（卡内文案与系统行同源，无打架）；「取代」路径实测双留痕（卡 `cancelled(superseded)` + 系统行「上一轮提问已被新的拾取回合取代」，`repro1.mjs` C 步）。但 reason 词表只有 `user/timeout/superseded`，**没有「回合结束」这一因**，于是把「回合结束」写成「提问超时未答」的**假超时**（BLOCK-02 的留痕面），且用户主动取消不写系统行（`cancelSystemLine('user') === null`，属设计取舍但需与 FR-CHAT-042「取消也留痕」的口径对齐说明） | 中 |
| C6 | 零明文三层（渲染 / 生成侧工厂 / 摘要白名单） | FR-CHAT-049 · ADR-V4-034 · AC-CHAT-021 · NFR-CHAT-005/012 | ✅ | **摘要侧结构性安全**：`digestEntryOf`（`stream-digest.ts:213-231`）只读 `seq/ts/kind/cardId/terminal/label/tool/ok/ms/refNum/requestId`，`answer`/`prompt`/`cancelReason`/`options` **一个都不读**（静态穷举 + `test/ask-auth-inflow.test.ts:188-202` 用「我的密码是 hunter2」反证 `answer ∉ entry`）。渲染侧 `ASK_COPY` 全常量 + `assertStreamPlaintext` 复用 `assertNoPlaintext` 宽口径；反向 4 类（URL query / 命令参数体 / 密钥 / 原始标记）逐条可抛错；`test/ui/ask-auth-inflow.mjs` ⑨ 在真实渲染路径断言零命中。**层数声明有瑕疵**（见 I-01，仅文档/死码层，未破红线） | — |
| C7 | auth 卡安全面（伪造批准 / 越界终态文案 / 审计入口 / 后果预演） | FR-CHAT-045/046/047 · AC-CHAT-016 · ADR-V4-033/034 | ❌ | ① **伪造批准**：`approved` 只能经卡内按钮的真实点击 → `handleCardAction` → `confirm-response` + 本地终态，无 DOM 注入可达路径（无全局 `[data-act]` 委派，grep 确认唯一监听在元素自身），且终态冻结使「批准后取消」无效（走查 + ADR §4）。② **越界终态文案**：`authFixedText` 缺 `cancelled` 分支 ⇒ 渲染「已批准」（BLOCK-01）；`decisionState` 把 `cancelled` 映射为 `pending`。③ **审计入口不可达**：`patchAuthCard` 用 `{ doc }` 造 deps，`onCardAction` 为 undefined 且 `preventDefault()` 已拦掉 `href="#audit"` ⇒ 刚决策的卡点审计**无反应**（BLOCK-04；门禁只断言文案含「审计」）。④ 后果预演复用静态 `#l1-consequence-tpl`（三行）✓，但 `{{label}}` 代的是 `payload.prompt`（SW 摘要，可能含书签标题等页面文本），与 ADR-V4-034 §2 的「不含页面文本」表述不符（仅渲染、不入摘要，I-08） | 阻塞 |
| C8 | 回合语义（`pending` 门控 / 无「永远处理中」/ 会话切换） | FR-CHAT-048 · ADR-V4-032 §4~§7 · AC-CHAT-014 | ⚠️ | 产品**可观测行为**成立：composer 仍由 `sendDisabledReason({pending})` 门控（`sidepanel.ts:1099`，文本/来源未改 ✓）；未终态卡的提交不受 `pending` 影响（卡内监听独立 ✓）；`pending` 能在 `done`/会话切换回落（`test/ask-auth-inflow.test.ts:147-165`）⇒ 无「永远处理中」。但 ADR-V4-032 §4 声称的「**ONE definition**」`askFlowView`（`view-model.ts:408-417`）**没有任何产品消费点**（仅 `window.__v3.testing.askFlow()` seam，grep 全仓无第二处引用）；`turnStuck = pending && openAsks === 0` 把「正常处理中」误标为 stuck（I-02）。另 `case 'error'`（`chat-state.ts:210`，reduceChat 置 `pending=false`）**绕过** stream 分支的 `case 'pending'` ⇒ 回合因错误结束时未结算未终态卡（I-06） | 中 |
| C9 | 退役完整性（`decision-card.ts` / `rounds[]` 派生 / 已答历史含改选） | ADR-V4-030 §7/§8 · build TASK-707 · FR-CHAT-047 | ❌ | `decision-card.ts` 删除干净（零残留引用 ✓）；`rounds[]` **未退役**：`l1/panels.ts#observe`（`:379-398`）仍是 `input.ask` 的差值推断，与 ADR-V4-030 §8「差分推断被**事件派生**取代」和 build §3「`rounds[]` 仍由 events 派生（✅）」**不符**；更严重的是它的唯一答案来源 `data-key="ask-option:*"` 的生产者随 `decision-card.ts:175` 一起被删、`btn.id === 'ask-submit'` 委派分支随 `#ask-fallback` 迁出 `#l0-decision`（`panels.ts:251-256`）而失效 ⇒ **从流内卡回答的每一轮**都在「已决策历史」里记成回落值（`lastUserText` = 上一条用户消息，或「（无回答）」+ `canceled:true`）——`repro1.mjs`/`repro2.mjs` 同源走查 + `l1.mjs:717-718` 只断言计数/改选、**无断言覆盖文案** ⇒ 真实缺陷且无门禁（BLOCK-03） | 阻塞 |
| C10 | 测试质量（覆盖 / 边界 / 反向可 FAIL） | NFR-CHAT-009 · AC-CHAT-023 · build §5 | ⚠️ | 新增门禁**质量高**：`test/ask-auth-inflow.test.ts` 五组 12 用例驱动真实 reducer（六终态矩阵 / 上限 / 无永远处理中 / 零明文正反 / R1 等价）；`test/ui/ask-auth-inflow.mjs` 49 断言覆盖 choice/text 两型 + 固化两态 + 零控件 + 超时·取代留痕 + AC-CHAT-016 + 320/400/520 + 零明文 + 计数守恒；反证体系（l1-reverse 9 条 / l2-reverse 10 条 / 台账逐叶段注入）实测全绿。**覆盖盲区**（与本轮 4 个阻塞一一对应）：① auth 卡 `cancelled` 终态无任何用例；② 「回合结束 × 面板自有 ask」交错无用例；③ L1 `rounds` 文案无断言；④ 审计入口只断言文案不断言点击效果；⑤ HO-1 展开态可点数无测量（I-03） | 中 |
| C11 | 台账与体积（71 entries / leafBases[1] / 9 换锚 / 五要素） | 父 §10 纪律 · build §4/§5/§7 | ⚠️ | **独立复算全绿**（`python3`，见 §6.3）：71 条 `V43-E-*` 的 `oldTitle` **100%** 逐字命中叶段删除行、`newTitle` **100%** 可在当前文件定位、`reason` 全部 ≥40 字符；`leafBases[1]`（v4-3 @ `0f8a1fb`）登记 72 行 = `git diff --numstat` 该 10 文件删除行**逐文件相等**（19/22/9/7/5/4/3/1/1/1）；两个叶段每组 `count == 清单长度`；`leafBases[0]` 的 v4-1 scope 由 18 → 33 复算订正后删除行亦已逐字登记。体积五要素与 `dist` 实测一致（sidepanel.js **440,698 B** = 登记值，ceiling `floor(440698×1.05)=462,732`；content 177,076 / pick-layer 33,900 与冻结值逐字节相同）。**治理瑕疵**：叶段受判文件集由台账**自身**文件集合推导（`test/supersession-ledger.test.ts:926-931`），从未登记过的文件永远进不了受判集 ⇒ `test/ui/stream.mjs`（v4-2 新增、v4-3 删 8 行）的删除行**既不在叶段受判集、也不在 base 相对 entries**（该文件在 `187c205` 尚不存在）⇒ 未登记未受判（I-05） | 中 |
| C12 | 门禁账与红线 + AC 证据 | AC-CHAT-021/023/025 · NFR-CHAT-005/009/010 · 父 D6 | ✅ | 门禁账 22 行（21 门禁 + RP-V4-09 复验）在 `/tmp/opencode/v4-gate-logs/v4-3-r2/summary.txt` 逐项 `exit=0` + `---- FAIL=0 ----`；本机**独立复跑 5 项**全部一致：`tsc --noEmit` rc=0、`npm test` **937/0**、`test:supersession` **31/0**（含「155 条逐条命中」「2 叶段 · 受判文件 66」）、`test:gate-integrity` **12/0**、`test:design-contract` **6/0**。**红线零改动**：`git diff --stat 0f8a1fb..1fb26bb` 对 `src/background/**`、`src/content/**`、`manifest.json`、`policy.ts`、`auto-authorize.ts`、`ask-bridge.ts` **全为空**；R2 段 `3eea886..1fb26bb` 对 `src/**` 亦空（与 build §7「R2 零产品字节」一致）。AC 逐条映射见 §2.1（其中 003/005/021/023/025 证据完整；014/015/016 因 BLOCK-02/04 降级为偏差） | — |
| C13 | 代码质量（职责单一 / 错误处理 / 死码 / 注释失真） | 项目宪法 · build §2 | ❌ | ① **死导出**：`STREAM_FIELD_WHITELIST`、`assertStreamCopySafe`（零调用点，含测试）、`label()` 工厂（仅测试调用）——ADR-V4-034 §5 的「生成侧工厂约束」层**未接线**（I-01）；`askFlowView` 同（I-02）。② **注释失真**：`cards/askuser.ts:20-26` 称「At most one open ask card exists in practice（ADR-V4-032 caps the set at 2 and the second is an auth card）」——模型上明确允许两张 `askuser` 同开（`test/ask-auth-inflow.test.ts:107-121` 正是两张 `askuser`），该注释会误导后续维护者忽略重复 id 问题（I-04）。③ `terminalDecision` 的 `cardIdForRequest(...) ?? lastOpenCardId(kind)` 回退对未知 requestId 会静默结错卡，且 `clearAsk()` 因 kind 固定 `askuser` 无法结算 auth（循环上限 `MAX_OPEN_ASKS+1` 后静默退出）（I-07）。④ 正向：新增模块职责单一（卡渲染 / 文案单源 / 仲裁纯函数分离清晰），`deepFreeze` 与 `project()` 的纯函数纪律保持 | 中 |

### 2.1 AC 逐条证据（本叶 8 个验收锚点）

| AC | 要求（父 §8.3） | 证据 | 判定 |
|----|---------------|------|:--:|
| AC-CHAT-003 | 固化契约统一：ask（答/取消）+ auth（批准/拒绝）逐态成交；已固化卡不可二次 | `cards/askuser.ts:166-199`（两态 + 结构移除）、`cards/auth.ts:124-201`；`ask-auth-inflow.mjs` ③④⑥、`ask-auth-inflow.test.ts` ①；`design-contract.test.ts` 6/0（shim C/D 条款） | ✅（附注：模型额外的 auth `cancelled` 终态不属本 AC 枚举，但渲染错误见 BLOCK-01） |
| AC-CHAT-005 | 法二：无撤销控件；撤销 = 新系统事件行 | 终态卡 DOM `button,input,select,textarea` 计数 = 0（门禁 ④ 实测）；`cancelSystemLine` 生成的系统行即「新事件行」 | ✅ |
| AC-CHAT-014 | `supersededAsk` = 取消 + 留痕；`pending` 门控一致；无「永远处理中」 | `supersededAsk` 返回 `{requestId,cardId,mustTrace}`（`test/sidepanel.test.ts:193-206`）；`repro1.mjs` C 步实测双留痕；`ask-auth-inflow.test.ts` ③ 断言 `pending` 可回落 | ⚠️（门控定义 `askFlowView` 无消费点 I-02；回合结束误结算 BLOCK-02） |
| AC-CHAT-015 | 60 s 超时 ⇒ canceled 留痕、不代填；主动取消同样留痕 | 超时留痕落地（`ask-auth-inflow.mjs` ⑤ 实测 `reason=timeout` + 系统行）；不代填（固化文案固定「已取消（不代填默认值）」，无 `default` 采纳路径） | ❌（把**回合结束**当超时 ⇒ 假超时留痕 + 面板自有 ask 被误结算，BLOCK-02） |
| AC-CHAT-016 | 批准/拒绝流内固化可读 + 时间戳 + **审计入口**；站点级授权在设置视图可发现可读 | 固化文案 + `.ts` ✓（门禁 ⑥）；站点级授权 ✓（门禁 ⑦ `#authorize`/`#revoke` + `#settings-view`）；**审计入口**仅在文案层成立，点击无效果（BLOCK-04） | ❌ |
| AC-CHAT-021 | 零明文 + 安全反向断言 + 未授权零注入 27 保持 | 摘要结构无自由文本（`digestEntryOf` 穷举 + 反证）；反向 4 类抛错；`test:zero-injection` 日志 27/0；红线文件零 diff；判定链零改动 | ✅ |
| AC-CHAT-023 | 门禁纪律：严格串行 / 日志完整落盘 / 反证实跑 / 每叶全绿 | `summary.txt` 22 行独立进程 + `FAIL=0`；反证日志 `rp-ledger-row-fail/pass.log`、`l1-reverse.log`（9 条注入→FAIL→sha256 还原→PASS）、`l2-reverse.log`（10 条） | ✅ |
| AC-CHAT-025 | 设计契约机器化（shim 60/60 + 映射）+ 真实产物侧复算 | `test:design-contract` **6/0**（本机复跑一致）；产品侧 C/D 等价断言落在 `ask-auth-inflow.mjs` / `stream.mjs` / `design-contract.test.ts` | ✅ |

---

## 3. 审查维度汇总

| 审查维度 | 审查项数 | 通过 | 警告 | 失败 | 通过率 |
|---------|:--:|:--:|:--:|:--:|:--:|
| 代码质量 | 3（C1 局部 · C9 · C13） | 0 | 1 | 2 | 0% |
| 规范符合性 | 5（C1 · C3 · C5 · C6 · C8） | 2 | 2 | 1 | 40% |
| 架构一致性 | 4（C4 · C7 · C9 · C11） | 1 | 1 | 2 | 25% |
| 测试质量 | 3（C5 局部 · C10 · C12） | 1 | 1 | 1 | 33% |
| **合计（按 Cx 主归属去重）** | **13** | **4** | **5** | **4** | **30.8%** |

> 注：C1 / C5 / C9 同时参与两个维度（矩阵见 `review.md` §2.1）；上表按**主归属**计一次，避免重复计数。

---

## 4. 阻塞问题

| # | 位置 | 问题 | 对应 Cx | 修复建议 |
|---|------|------|:--:|---------|
| **BLOCK-01** | `src/ui/sidepanel/cards/auth.ts:37-47`（`decisionState` / `authFixedText`）+ `src/ui/sidepanel/stream-model.ts:456-471`（`closeOpenAsks`） | **auth 卡的 `cancelled` 终态渲染成「已批准」**（`data-decision` 反而 = `pending`）。三条真实路径都能造出该终态：① 会话切换（`chat-state.ts:445-446`）② 被新 ask/上限取代（`stream-model.ts:437-445`）③ 回合结束（`chat-state.ts:437-438`）⇒ 用户从未批准，界面与留痕却显示「已批准」+ 时间戳 + 审计入口——恰是 ADR-V4-031「never a silent approve」禁止的形态。**复现**：`node /tmp/opencode/v43-review/repro2.mjs` 场景 1 输出 `data-decision 渲染 = pending` / `固化文案渲染 = 已批准` | C1 · C7 | ① `authFixedText` 增 `cancelled` 分支（如「已取消（未授权，不执行）」）；② `decisionState` 增 `cancelled`（或让 auth 卡**不**走 `cancelled` 终态，改走 `rejected` 语义的独立态）；③ 补门禁：auth 卡在任一 `cancelled` 终态下**不得**出现「已批准」文案，且 `data-decision` 不得为 `pending` |
| **BLOCK-02** | `src/ui/sidepanel/chat-state.ts:437-438` + `src/ui/sidepanel/sidepanel.ts:2128`（`done` ⇒ `pending:false`）+ `:1304-1311`（面板自有引用回合 ask） | **回合结束被当成 60 s 超时，把面板自有 ask 结算为 `cancelled(timeout)`**。引用回合 ask（`ref-round-<refId>`）由面板本地发起、不经 SW、也没有 60 s 计时器；拾取时若有回合在跑（正是 R1 要修的现场），该回合的 `done` 一到就把「已捕获引用 ref_N：要用它做什么？」**冻结为超时**（`done` 与卡创建的先后是竞态）⇒ 拾取 → 选择用途的链路可间歇性断掉，且留痕写下**从未发生的**「提问超时未答」。**复现**：`node /tmp/opencode/v43-review/repro1.mjs` E 步 `ref-round-ref_1 → cancelled(timeout)` | C1 · C5 · C8 | ① 把「回合结束」与「60 s 超时」拆成两个 `AskCancelReason`（或仅对 SW 侧 ask 走 timeout 投影）；② 面板自有 ask（`ref-round-*` / `ref-describe`）**不随回合结束结算**；③ 补门禁：`ask → pick → ref-round ask → done` 链上引用回合卡必须仍可答、且不得出现「超时」系统行 |
| **BLOCK-03** | `src/ui/sidepanel/l1/panels.ts:251-256`（`pendingAnswer` 唯一写入点）+ `:379-398`（`observe`）+ 已删 `l0/decision-card.ts:175-177` | **`rounds[]` 未按 ADR-V4-030 §8 退役（仍是 `input.ask` 差分推断），其答案来源已被删除**：`data-key="ask-option:*"` 的生产者随 `decision-card.ts` 消失，`#ask-submit` 委派分支也因 `#ask-fallback` 迁出 `#l0-decision` 而失效 ⇒ 从流内卡回答（**所有**正常回答路径）时 `pendingAnswer` 恒为 null，L1「已决策历史」行回落 `lastUserText`（上一条用户消息！）或「（无回答）」+ `canceled:true`，**把过程事实记错**。门禁 `l1.mjs:717-718` 只断言计数与「改选」标记，无文案断言 ⇒ 缺陷可长期存活 | C9 · C10 | ① 把 `rounds[]` 改为从 `project()` 的已终态 `askuser`/`auth` 卡派生（含 `answer` / `cancelReason` / `ts`），或让 `handleCardAction` 把答案回填 L1；② 删除死分支 `key.startsWith('ask-option:')` / `btn.id === 'ask-submit'`（或重新接线）；③ 补门禁：从流内卡回答后 `rounds[].chosen` 必须等于真实答案、取消必须 `canceled=true` 且原因可读 |
| **BLOCK-04** | `src/ui/sidepanel/cards/auth.ts:197-200`（`patchAuthCard` 造 `deps = { doc }`）+ `:64-84`（`auditEntry`） | **刚决策的 auth 卡（真实主路径）审计入口点了没反应**：`auditEntry` 的点击回调走 `deps.onCardAction?.(...)`，而 `patchAuthCard` 传入的 deps 无 `onCardAction`，且回调先 `event.preventDefault()`（连带拦掉 `href="#audit"` 的默认跳转）⇒ 无任何效果。门禁只断言 `.audit-entry` 文案含「审计」（`ask-auth-inflow.mjs:255`），**不断言可达性**。仅「面板重开 → 摘要重建卡」的冷路径可用 | C7 | ① `patchAuthCard` 接收并透传真实 deps（`patchCardNode` 已可由渲染器注入 `cardDeps()`），或把审计入口改由渲染器统一追加；② 补门禁：点击 `.audit-entry` 后 `[data-l2-view="audit"]` 必须可见（并在 `l2-view` 关闭断言） |

---

## 5. 改进建议

| # | 位置 | 问题 | 对应 Cx | 严重度 | 建议 |
|---|------|------|:--:|:--:|------|
| **I-01** | `src/ui/sidepanel/stream-plaintext.ts:43-54 / 70-74 / 102-105` | ADR-V4-034 §5 的「生成侧工厂约束」层**未接线**：`STREAM_FIELD_WHITELIST`、`assertStreamCopySafe` 零调用点（含测试），`label()` 工厂只被测试调用；生产代码在 `chat-state.ts:306/358/371`、`stream-model.ts:537` **直接写 `label`** ⇒ 声明「label 只能通过工厂产出」与实现不符（零明文实际仍由摘要侧 `assertDigestSafe` 兜住，红线未破） | C6 · C13 | 中 | 要么把生产写 `label` 全部改走工厂，要么把该层降级为「已登记未接线」，并给 `STREAM_FIELD_WHITELIST` 加一条机核消费点（如 `assertDigestSafe` 反向引用），否则两份白名单会漂移 |
| **I-02** | `src/ui/sidepanel/view-model.ts:408-417` + `sidepanel.ts:651-653` | `askFlowView` 是 ADR-V4-032 §4 的「ONE definition」，但**无产品消费者**（只有测试 seam）；`turnStuck = pending && openAsks === 0` 把「正常处理中」标成 stuck，语义会在被接线时误用 | C8 · C13 | 中 | 接线到 composer / 推荐 chip 的实际门控（v4-4 落地时），并把 `turnStuck` 重定义为「pending ∧ openAsks=0 ∧ 无在途回复」或直接删除 |
| **I-03** | `src/ui/sidepanel/cards/askuser.ts:137-161`（展开态）+ `density-scope.ts:48/71` | HO-1 的「最坏合计 = 4 + 4 = 8」**只在收起态成立**：choice 卡展开 `#ask-fallback` 后 = 3 选项 + 末项 + input + 提交 + 取消 = **7 可点 > MAX_CLICKABLES_PER_CARD(6)**；两张卡都展开 = **14 > 8**，且展开态无任何门禁测量（`density.mjs` 的 `STREAM_CARDS_FN` 会计入可见 clickable）。另：choice 卡**收起态没有可见取消入口**，取消必须经「其他…（我来描述）」两步到达（shim C3 只对 text 卡断言取消入口存在，故未被拦） | C2 · C4 | 中 | ① 展开时收起点选项行（互斥披露），使单卡仍 ≤6；② 或把「choice 卡带展开兜底」登记为预算豁免并补一条展开态的反证；③ 给 choice 卡补一个常驻的次要取消入口（不影响 HO-1 的 4+4 论证时需重算） |
| **I-04** | `src/ui/sidepanel/cards/askuser.ts:88-163`（`buildForm` 无条件铸 id）+ `chat-state.ts`（`MAX_OPEN_ASKS=2`）+ `l0/shell.ts:92-104` / `sidepanel.ts:1336-1357` / `l1/panels.ts:255` | 两张 `askuser` 同开（模型允许，门禁 `ask-auth-inflow.test.ts:107-121` 即造此态）时 `#ask`/`#ask-prompt`/`#ask-options`/`#ask-fallback`/`#ask-input`/`#ask-submit`/`#ask-cancel`/`#ask-other` **成对重复**（HTML id 唯一性破坏）；auth 卡有 `doc.querySelectorAll('#confirm, #confirm-summary') → removeAttribute('id')` 去重守卫，askuser **没有**；所有 legacy id 读取方（`revealFallback`、`revealAskFallback`、L1 的 `pendingAnswer`）都取 DOM 首个匹配 ⇒ 交互可能落到另一张卡 | C2 | 中 | ① 与 auth 同构：铸 `#ask*` 前剥离既有同族 id（保证「最新打开者拥有 legacy id」）；② 或让两处 `revealFallback` 改为按 `data-card-key` 定位；③ 修正 `askuser.ts:20-26` 的失真注释 |
| **I-05** | `test/supersession-ledger.test.ts:926-931`（`leafScopeFiles`） | 叶段受判文件集 = **台账自身**（`modifiedRanges ∪ entries ∪ protectedRanges`）的 `test/**` 子集 ⇒ 判据是自指的：**从未登记过的文件永远进不了受判集**，其叶段删除行不可能被判红。实测：v4-3 有删除行的 test 文件 **16 个**，进受判集仅 **10 个**；`test/ui/stream.mjs`（v4-2 新建、v4-3 删 8 行、语义确有等价重锚）既不在叶段 scope、也不在 base 相对 entries（`187c205` 时该文件不存在）⇒ **未登记未受判**。build §4.1「按规则复算订正为 33 文件**全集**」的「全集」实为「台账已引用集」 | C11 | 中 | ① scope 改为「`git diff leafBase..worktree` 触及的 `test/**`」∪ 台账登记集（真正的 diff 驱动，去自指）；② 或把 16 个文件全部登记进 `scope.files`，使判据覆盖 v4-3 的真实删除面 |
| **I-06** | `src/ui/sidepanel/chat-state.ts:210-211`（reduceChat `case 'error'` 置 `pending:false`） | 回合因**错误**结束时 `pending` 由 `reduceChat` 直接置假，**绕过** stream 分支的 `case 'pending'` ⇒ 未终态卡不结算（与 `done` 路径不一致：一个结算成 timeout，一个完全不管）。`repro2.mjs` 场景 3 实测：`error` 后 `pending=false` 且 open ask 仍打开 | C1 · C8 | 低 | 把「未终态卡结算」挂在 `pending` 真→假的**转移**上（而非仅 `pending` action），并给 error 路径一个独立 reason（如 `aborted`） |
| **I-07** | `src/ui/sidepanel/chat-state.ts:293-301 / 326-337` | `cardIdForRequest` 会为**已终态**的卡返回 cardId（终止事件不带 `requestId`，匹配的是开卡事件），配合 `terminalDecision` 的 `?? lastOpenCardId(kind)` 回退：无 `requestId` 的调用（如测试 seam `clearAsk()`、`ask-resolved`）会静默结算「最后一张同 kind 的卡」；`clearAsk()` 因 kind 固定 `askuser` **无法结算 auth 卡**，循环 `MAX_OPEN_ASKS+1` 次后静默退出。当前仅影响测试 seam 与未来调用者（终态冻结保护了重复终态） | C1 · C13 | 低 | ① `cardIdForRequest` 只认「无终态事件」的卡；② 无 `requestId` 时拒绝结算（fail-closed）；③ `clearAsk` 按 kind 集合遍历 |
| **I-08** | `src/ui/sidepanel/cards/auth.ts:91-110`（`consequencePreview`） | 预演把 `view.payload.label ?? view.payload.prompt`（confirm 卡的 `prompt` = SW 摘要，形如 `将删除书签：<书签标题>（不可逆）`，可含页面/书签文本甚至 URL query）代入静态模板 —— 与 ADR-V4-034 §2「范围与后果预演 … 不含命令参数体 / URL query / 页面文本」的表述不符（**仅渲染、不入摘要**，故零明文红线未破） | C7 | 低 | 要么把代入值限制为已净化的 `label`（走 `label()` 工厂），要么把该差异如实登记（渲染面允许回显用户可见文本，但 ADR 的措辞需订正） |

---

## 6. 复跑与独立复算（原文证据）

### 6.1 本机只读复跑（5 项）

| 门禁 | 命令 | 结果 | 与 build §5 登记 |
|------|------|:--:|:--:|
| typecheck | `npx tsc --noEmit` | rc=0（无输出） | 一致 |
| node 全量 | `npm test` | `ℹ tests 937 / ℹ pass 937 / ℹ fail 0` | 一致（937） |
| 取代台账 | `npm run test:supersession` | `ℹ tests 31 / pass 31 / fail 0`；含 `ℹ v4 entries 可定位性：155 条逐条命中`、`ℹ v4 叶段判据：2 个叶段 · 受判文件 66 个 · 全部逐字登记`、`ℹ v4 叶段 schema：2 个叶段的 scope 逐叶复算一致（规则集 33 文件）` | 一致（31） |
| 元门禁 | `npm run test:gate-integrity` | `ℹ tests 12 / pass 12 / fail 0` | 一致（12） |
| 设计契约 | `npm run test:design-contract` | `ℹ tests 6 / pass 6 / fail 0` | 一致（6） |

### 6.2 门禁账（Chromium 段，读日志）

`/tmp/opencode/v4-gate-logs/v4-3-r2/summary.txt`：22 行逐项 `exit=0`，末行 `---- FAIL=0 ----`。关键计数：`npm-test 937/0`、`supersession 31/0`、`gate-integrity 12/0`、`zero-injection 27/0`、`page-input 102/0`、`l0 216/0`、`l1 108/0`、`l2 73/0`、`density 171/0`、`journey 167`、`insight 116`、`binding 192`、`hardening 24`、`e2e PASS`、`ask-auth 49/0`、`stream 63/0`、`design-contract 6/0`、`l1-reverse 9 条注入→FAIL→sha256 还原→PASS`、`l2-reverse 10 条`、`rp-v4-09 PASS`。反证日志同时在盘：`rp-ledger-row-fail.log` / `rp-ledger-row-pass.log`。

### 6.3 台账独立复算（`python3`，不依赖门禁实现）

| 复算对象 | 结果 |
|---------|------|
| `V43-E-*` entries | **71 条**；`oldTitle` 在 `git diff 0f8a1fb..HEAD` 的叶段删除行中命中 **71/71**；`newTitle` 在当前文件可定位 **71/71**；`reason` ≥40 字符 **71/71** |
| `leafBases[1]`（v4-3 @ `0f8a1fb`）登记行 vs 实测 | 10 文件 72 行，与 `git diff --numstat` **逐文件相等**：`size-baseline 19 / l0.mjs 22 / size-budget 7 / l1.mjs 9 / density.mjs 5 / ref-wiring 4 / size-growth 3 / gate-integrity 1 / sidepanel.test 1 / insight.mjs 1` |
| 两个叶段每组 `count` vs 清单长度 | 19/19 与 10/10 组 **全部相等**（无橡皮图章） |
| 抽查（随机 3 条） | `V43-E-42`（l0.mjs `fallbackHidden` 选择器重锚）、`V43-E-20`（size-baseline 字节数重 pin）、`V43-E-51`（l0.mjs 控件计数改锚）——`oldTitle/newTitle/reason` 三要素可逐条定位 |
| 覆盖面差异（I-05） | v4-3 有删除行的 `test/**` 文件 **16** 个，叶段受判集 **10** 个；未受判 6 个中 `supersession-ledger.test.ts`（28 行）有 build §8 的显式理由，`stream.mjs`（8 行）/ `density-thresholds.test.ts`（2 行）/ `size-ruling-vol3.test.ts`（2 行）无任何登记或说明 |

### 6.4 体积 / 红线独立复核

`ls -l dist`：`sidepanel.js 440,698`（= 登记值；ceiling `floor(440698×1.05) = 462,732`，余量 22,034 B）、`content.js 177,076`、`pick-layer.js 33,900`（与冻结值逐字节一致）。`git diff --stat` 对 `src/background/**`（含 `ask-bridge.ts`）、`src/content/**`、`manifest.json`、`policy.ts`、`auto-authorize.ts` 在整段 `0f8a1fb..1fb26bb` 上**全为空**；R2 段 `3eea886..1fb26bb` 对 `src/**` 亦为空；`git status --porcelain` 审查前为空。

### 6.5 缺陷复现脚本（只读，不入库）

- `/tmp/opencode/v43-review/repro1.mjs`：驱动真实 `dist-test` reducer 走「后台 ask → `supersededAsk` → 取代留痕 → 引用回合 ask → `done`」，输出 E 步 `ref-round-ref_1 → cancelled(timeout)` + 系统行「提问超时未答」（BLOCK-02 证据）。
- `/tmp/opencode/v43-review/repro2.mjs`：`confirm` 卡打开 → 会话切换 ⇒ `terminal=cancelled(superseded)`，调用真实 `authFixedText/decisionState` 得「已批准」/`pending`（BLOCK-01 证据）；另含「回答后 `done` 不被改写 ✓」与「`error` 结束不结算 ✗」（C1 正例 / I-06）。

---

## 7. 未能验证的项（如实列出，不用推断填坑）

1. **真机竞态时序**（BLOCK-02 的触发概率）：`done` 与引用回合卡创建的先后由消息调度与 `pickInput.highlight` 往返时延决定，静态分析只能证明「两条顺序都可能」，**未在真实 Chromium 上测出复现率**——建议 validate 用 journey/insight 夹具注入一个「pending 中拾取」场景实测。
2. **选择器／文本摘要类明文**：`refLabel` / `tool` / `askRequestId` 等字段的零明文依赖 `assertDigestSafe`；本轮只复核了谓词与字段集，未构造「恶意 `requestId`（含 URL query）」的端到端落库实验。
3. **`maxDigest`/LRU 与 v4-3 终态卡的交互**（HO-2）：只核了措辞与 `truncationRules ↔ DIGEST_FIELDS` 的机核结论（`test:supersession` 通过），未独立构造面板重开 × 多段会话的截断实验。
4. **Chromium 门禁 16 项未在本轮复跑**（严格串行纪律 + 一次一个 Chromium 的资源约束），只做了日志核对；其中 l0/l1/l2/density/journey/insight/binding/hardening/e2e 由 build §5 与 `summary.txt` 双证据背书。

---

## 8. 结论

**结论**: **❌ 不通过**

| 指标 | 结果 |
|------|------|
| 审查通过率 | **30.8%**（4/13） |
| 阻塞问题数 | **4**（BLOCK-01 假批准 / BLOCK-02 假超时·引用回合被冻结 / BLOCK-03 已决策历史记错答案 / BLOCK-04 审计入口不可达） |
| 规范符合性偏差 | **4** 项（AC-CHAT-014 部分 / AC-CHAT-015 / AC-CHAT-016 + ADR-V4-030 §8 & build TASK-707 的 `rounds[]` 声明） |
| 可进入 validate | **否**（建议先修 BLOCK-01~04；BLOCK-01 属安全语义面，优先级最高） |

**理由**：本叶的**主体工程**是扎实的——事件化状态机、固化契约的结构性不可二次、取代台账逐行可机核（71/71）、体积五要素、红线零改动、22 项门禁 rc=0 与独立复跑一致，这些都经得起审查。但「留痕即事实」是本叶的立身之本，而当前有 **两条假事实**（auth 卡显示「已批准」、面板自有 ask 被写成「超时未答」）、**一条记错的答案**（L1 已决策历史）和 **一个失效的验收面**（审计入口），四者都发生在真实产品路径上且**全部逃过了 22 项门禁**。因此判 ❌ 不通过，建议按 §4 修复后重跑受影响门禁（至少 `npm test` + `test:ask-auth` + `test:l1` + `test:density`）并补 5 条缺口断言（§2 C10 盲区），再进入 `@sddu-validate`。

---

## 9. 状态文件关联提醒（§8.2）

本叶 `state.json` 的 `files` 原缺 `review` / `reviewReport` 字段（状态机未自动登记）。本轮已在 `files` 中补 `review` 与 `reviewReport` 两条路径指向本目录 `review.md` / `review-report.md`；父 `state.json` 的 `childrens[]` 中 v4-3 的 `phase` 由 `tasked` 同步为 `builded`（R2 报告遗留同步项，用户指令）。若状态机后续重写 `state.json`，请确认这两个字段与父级 phase 未被回退。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1：C1~C13 逐项结论 + BLOCK-01~04 + I-01~I-08 + 5 项只读复跑 + 台账独立复算 + 2 个复现脚本 + AC 逐条证据 + 结论 ❌） | 2026-09-19 | SDDU Review Agent |
