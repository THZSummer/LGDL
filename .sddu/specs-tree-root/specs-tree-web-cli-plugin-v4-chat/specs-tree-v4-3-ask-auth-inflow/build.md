# 构建报告：specs-tree-v4-3-ask-auth-inflow

> **文档定位**: SDDU 构建报告 — 记录全部任务的文件变更和实现结果，作为 review 阶段的输入
> **前置依赖**: 本叶 `tasks.md` v1.1（HO-1/HO-2）/ `plan.md`（ADR-V4-030~034）/ `spec.md`；v4-2 产物基线
> **创建人**: SDDU Build Agent
> **创建时间**: 2026-09-19
> **版本**: v2.0
> **更新人**: SDDU Build Agent
> **更新时间**: 2026-09-19
> **更新说明**: R2 收口轮 — 4 项机械重 pin 逐项闭环（取代台账逐行登记 / l1-reverse RP-L1-E / l2-reverse / npm test）+ 抽样口径按实测订正 + 全量 21 门禁 + RP-V4-09 全绿

## 1. 构建概要

| 维度 | 数值 |
|------|:--:|
| 完成任务数 | **11 / 11**（R1 源码产出 + R2 收口；TASK-711 由 ⚠️ 部分 → ✅） |
| 复杂度分布 | S×1 / M×7 / L×3 |
| 新增文件 | 5（`cards/askuser.ts` / `cards/auth.ts` / `stream-plaintext.ts` / `test/ask-auth-inflow.test.ts` / `test/ui/ask-auth-inflow.mjs`） |
| 修改文件（R1） | 18（sidepanel 侧 8 + test 侧 8 + `package.json` + docs 2） |
| 修改文件（R2） | 5（`docs/v4-supersession-ledger.json` + `test/supersession-ledger.test.ts` + `test/ui/l1.mjs` + `test/ui/density.mjs` + `test/gate-integrity.test.ts`） |
| R2 台账登记 | **新增 71 条 `V43-E-*` entries + 1 个叶段（72 条逐字删除行 / 10 文件）+ 9 条既有条目换锚** |

**终态事件表（6 终态 × 触发 × 固化形态 × 摘要白名单证明）**

| 终态 | 触发事件 | 卡状态 | 固化形态 | 摘要落库（白名单） |
|------|---------|--------|----------|-------------------|
| `answered` | `ask-answer{value}`（用户提交/选项） | `data-answered="true"` | 表单节点**移除** + `.card-fixed`「已答：{value}」+ `.ts` | 只 `askRequestId`+`terminal`；`answer` **不在** `DIGEST_FIELDS`（结构无自由文本） |
| `cancelled(user)` | `ask-cancel{reason:'user'}` | `data-answered="cancelled"` | 同上 +「已取消（不代填默认值）」 | `askRequestId`+`terminal` |
| `cancelled(timeout)` | 回合结束（`pending:false`）投影 | 同上 + `data-cancel-reason="timeout"` | 同上 **+ 系统行**「提问超时未答：已按未作答取消」 | 同 user |
| `cancelled(superseded)` | 第 3 张 / ref-round 优先 / 会话切换 | 同上 + `data-cancel-reason="superseded"` | 同上 **+ 系统行**「上一轮提问已被新的拾取回合取代」 | 同 user |
| `approved` | `auth-decision{approved}` | `data-decision="approved"` | 操作行**移除** + `.card-fixed`「已批准」+ `.ts` + `<a class="audit-entry">` | `askRequestId`+`terminal`；`summary` **不落** label |
| `rejected` | `auth-decision{rejected}` | `data-decision="rejected"` | 同上 +「已拒绝（不执行）」 | 同上 |

**零明文证明**：`stream-plaintext.ts#assertStreamPlaintext` 复用 `stream-digest.ts#assertNoPlaintext`（较宽口径：URL query / 密钥 / 命令参数体 / 原始标记）；`ASK_COPY` 全部常量过扫；`digestEntryOf` 不读 `answer`（`test/ask-auth-inflow.test.ts` ④ 机核）。

## 2. 文件变更

### 2.1 R1（功能实现，已提交 b58a52d / 3eea886）

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| MODIFY | `src/ui/sidepanel/stream-model.ts` | 701/704 | `MAX_OPEN_ASKS=2` / `REF_ROUND_PREFIX` / `AskCancelReason` / `openAskEntries` / `arbitrateOpenAsks` / `appendAskEvent` / `closeOpenAsks`；`payload.cancelReason` |
| NEW | `src/ui/sidepanel/cards/askuser.ts` | 702 | choice/text 两型 + 固化两态 + 终态结构性零控件（`patchAskuserCard` 移除表单） |
| NEW | `src/ui/sidepanel/cards/auth.ts` | 703 | 批准/拒绝 + `#l1-consequence-tpl` 预演 + 审计入口 + 两态固化 + `#confirm*` id 只在打开的卡上铸造 |
| NEW | `src/ui/sidepanel/stream-plaintext.ts` | 704 | 字段白名单 + `label` 工厂 + `ASK_COPY` 单源 + `cancelSystemLine` |
| MODIFY | `src/ui/sidepanel/cards/index.ts` | 701/702/703 | ask/auth 提取为独立模块；`patchCardNode` 仅终态改写 DOM |
| MODIFY | `src/ui/sidepanel/chat-state.ts` | 705 | `supersededAsk` 升级（`mustTrace`+`cardId`）；终态事件接线；超时/取代双留痕；会话切换结算；`REF_ROUND_PREFIX` 单源再导出 |
| MODIFY | `src/ui/sidepanel/sidepanel.ts` | 705/706 | 卡动作按 `cardId→requestId` 解析；`askFlow`/`timeoutOpenAsks` seam；授权审计入口；`revealAskFallback`；`clearAsk` 全结算 |
| MODIFY | `src/ui/sidepanel/view-model.ts` | 706 | `askFlowView`（pending 只门控新回合/推荐 chip，未终态卡可提交；`openAsks` 计数） |
| MODIFY | `src/ui/sidepanel/l0/shell.ts` | 707 | 退役 `mountDecisionCard`；`#l0-more` / `#l1-more-options` 单一写入者迁入；兜底输入/`#composer` reveal 控制 |
| RETIRE | `src/ui/sidepanel/l0/decision-card.ts` | 707 | 删除（台账登记） |
| MODIFY | `src/ui/sidepanel/index.html` | 707 | 移除 v4-3 两处 `data-transitional-host`（计数 = 0）；移除 `#ask*`/`#confirm*` 静态标记（改由卡片按需铸造）；保留 `#l0-decision` 容器 |
| NEW | `test/ask-auth-inflow.test.ts` | 708 | 12 用例：六终态 / 上限仲裁 / 无「永远处理中」/ 零明文正反 / R1 等价 |
| NEW | `test/ui/ask-auth-inflow.mjs` | 709 | 49 断言：卡渲染/交互/固化不可变/超时·取代留痕/AC-CHAT-016/320·400·520/零明文 |
| MODIFY | `test/ui/l0.mjs` / `test/ui/l1.mjs` / `test/ui/stream.mjs` / `test/ui/insight.mjs` | 710 | 同编号重锚（宿主清零、流内卡选择器、终态结构移除、composer reveal 语义） |
| MODIFY | `test/density-thresholds.test.ts` / `test/ref-wiring.test.ts` / `test/sidepanel.test.ts` | 707/710 | 退役 id 登记 / 单一入口源码断言 / `supersededAsk` 契约重锚 |
| MODIFY | `test/gate-integrity.test.ts` / `package.json` | 710 | `EXPECTED_AUDITED_FILES` 追加新门禁；`test:ask-auth` script |
| MODIFY | `test/size-baseline.ts` / `test/size-budget.test.ts` / `test/size-growth-evidence.test.ts` / `test/size-ruling-vol3.test.ts` | 711 | 体积五要素重登记（426,487 → 440,698 B，+3.33%；ceiling 462,732） |
| MODIFY | `docs/v4-density-baseline.json` / `docs/v4-supersession-ledger.json` | 711 | volume 重登记 + `V43-SVOL-1` 条目 |

### 2.2 R2（收口轮：机械重 pin，零功能改动）

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| MODIFY | `docs/v4-supersession-ledger.json` | 711 | ①新增 **71 条 `V43-E-*` entries**（逐行 oldTitle 逐字 + newTitle 定位 + 理由）；②新增 **`leafBases[1]`（v4-3 @ 0f8a1fb）**，登记 **72 条**逐字叶段删除行（10 文件）；③v4-1 `scope.files` 由手工收窄的 18 文件按规则复算订正为 **33 文件全集**；④**9 条既有条目换锚**（V41-R2-6/7/8/9、V42-E-VOL-2/3、V42-E-SVOL-1/2、V43-SVOL-1）；⑤抽样口径按实测订正（l0 212→216 / nodeTestRuntime 924→937 / supersession 30→31 / density 171），静态读数 1112 / 948 / 937 |
| MODIFY | `test/supersession-ledger.test.ts` | 711 | 「v4-1 是本叶唯一叶段」换段化为「逐叶追加 + 唯一性 + v4-1 保留」；**新增**「每个叶段的 schema 与 scope 逐叶复算」判据；把「v4 段删除行」判定与反证从 `leafBases[0]` 改为**逐叶段**；`oldTitle 真被删除` 判据改为**已登记叶段并集** |
| MODIFY | `test/ui/l1.mjs` | 710 | `#ask-fallback` 读取空安全（v4-3 起该节点由流内 ask 卡按需铸造）⇒ **RP-L1-E 注入靶重 pin**（注入 ⇒ 具名断言 FAIL，而非 TypeError「因错而红」） |
| MODIFY | `test/ui/density.mjs` | 711 | **RP-V4-09 反证期望值重 pin**：硬编码「合计 10 > 8」→ 动态「基线合计 + 10 > 8」（v4-3 的 choice ask 卡使基线不再是 0；实测基线 4 ⇒ 14） |
| MODIFY | `test/gate-integrity.test.ts` | 711 | R4b 的 in-gate 例外登记随 RP-V4-09 换锚（正则改为匹配模板字面量 `\$\{injectedTotal\}`），**登记不消失** |

## 3. 任务完成清单

| 任务 | 名称 | 复杂度 | 状态 | 对应 FR |
|------|------|:--:|:--:|------|
| TASK-701 | 终态事件 + `openAsks` + 仲裁 | M | ✅ 源码完成 | FR-CHAT-040/042/044/048 |
| TASK-702 | `cards/askuser.ts` | L | ✅ 源码完成 | FR-CHAT-040/041/042 |
| TASK-703 | `cards/auth.ts` | L | ✅ 源码完成 | FR-CHAT-045/046/047 |
| TASK-704 | 流内留痕零明文 | S | ✅ 源码完成 | FR-CHAT-049 |
| TASK-705 | `supersededAsk` 升级 + 接线 | M | ✅ 源码完成 | FR-CHAT-042/043/044 |
| TASK-706 | 回合语义 | M | ✅ 源码完成 | FR-CHAT-048 |
| TASK-707 | rounds[]/decision-card 退役 + 宿主清零 | M | ✅ 源码完成（`rounds[]` 仍由 events 派生） | FR-CHAT-040/047 |
| TASK-708 | `test/ask-auth-inflow.test.ts` | M | ✅ 12/12 PASS | — |
| TASK-709 | `test/ui/ask-auth-inflow.mjs` | L | ✅ 49/0 PASS | AC-CHAT-016 |
| TASK-710 | 联动门禁 | M | ✅ 全绿（l0/l1/l2/stream/insight/journey/binding/density/ask-auth 等） | FR-CHAT-084 |
| TASK-711 | 收口 | M | ✅ **本轮闭环**（台账逐行登记 + 反证重 pin + 抽样口径订正 + 21 门禁全绿） | FR-CHAT-094 |

## 4. R2 逐项闭环（4 项 + 反证）

### 4.1 supersession-ledger 逐行登记（原 §6.1）

| 项 | R1 现场 | R2 处置 | 证据 |
|---|---|---|---|
| `test/ui/l0.mjs` / `l1.mjs` / `size-*.ts` 等被杀行的逐行登记 | 未登记 ⇒ `npm test` 红 4 项 | **登记 71 条 `V43-E-*` entries**（oldTitle 逐字 = 被删原文；newTitle = 当前文件中的等价锚点，逐条机核可定位；理由 ≥40 字符，口径 = 判定链/宿主/体积三族） | `test:supersession` 31/0；`ℹ v4 entries 可定位性：155 条逐条命中` |
| `leafBases` 缺本叶段 | 只有 v4-1 @ 187c205 | 新增 **`leafBases[1]` = `specs-tree-v4-3-ask-auth-inflow` @ `0f8a1fb`**，逐字登记 **72 条**叶段删除行（10 文件；`size-baseline.ts` 19 / `l0.mjs` 22 / `l1.mjs` 9 / `size-budget` 7 / `density.mjs` 5 / `ref-wiring` 4 / `size-growth` 3 / `gate-integrity`·`sidepanel.test`·`insight` 各 1） | `ℹ v4 叶段判据：2 个叶段 · 受判文件 66 个 · 全部逐字登记` |
| v4-1 `scope.files` 手工收窄 | 18 文件（规则复算应为 33） | 按同一规则**复算订正为全集 33 文件**；新增「每个叶段的 schema 与 scope 逐叶复算」判据把该事实机核化 | `ℹ v4 叶段 schema：2 个叶段的 scope 逐叶复算一致（规则集 33 文件）` |
| 既有条目 newTitle 被 v4-3 取代 | 8 条悬空（V41-R2-6/7/8/9、V42-E-VOL-2/3、V42-E-SVOL-1/2）+ `V43-SVOL-1` oldTitle 为空 | 9 条**换锚**（newTitle 指向当前文本；`V43-SVOL-1` 补 `oldTitle` = 被取代的 426,487 行），理由 append-only | `test:supersession` 31/0 |
| **反证（登记后再删一行未登记的 ⇒ 必红）** | — | 从 `leafBases[1]` 的 l0.mjs 组**删除 1 条已登记行** ⇒ `test:supersession` **EXIT=1 / pass 30 · fail 1**，诊断逐字点名 `叶段删除行未登记 → fallbackHidden: document.getElementById('ask-fallback').hidden,`；**逐字节还原**后 **EXIT=0 / 31 · 0** | `rp-ledger-row-fail.log`（FAIL 段）+ `rp-ledger-row-pass.log`（PASS 段）；`cmp` 台账逐字节复原 ✔ |

### 4.2 l1-reverse RP-L1-E 重 pin（原 §6.2）

- **根因（真实、非门禁错）**：v4-3 起 `#ask-fallback` **不再常驻**，由流内 ask 卡按需铸造（`revealAskFallback()` 先建 text 卡再揭示）。`test/ui/l1.mjs` 的 ⑨ 直接 `document.getElementById('ask-fallback').hidden` ⇒ 注入 `revealFallback()` 为 no-op 后节点不存在 ⇒ **TypeError（门禁异常）**，判定器正确判「因错而红」。
- **重 pin**：l1.mjs 改为空安全读取（`fallbackNode ? fallbackNode.hidden === false : false`，语义不变：无兜底节点 = 未打开）；断言计数 **108 不变**。
- **证据**：`test:l1-reverse` **EXIT=0**，`✔ 反证全套 PASS：9 条断言全部「注入 → FAIL → 逐字节还原（sha256 复原）→ PASS」`；RP-L1-E 命中具名断言 `⑨ 「改用描述」走既有 #ask 兜底输入`。

### 4.3 l2-reverse 重 pin（原 §6.3）

- **根因**：RP-V33-03 / RP-V33-03-NEG / RP-V33-06 的 **PASS 段**调用取代台账门禁；R1 时台账红 4 项 ⇒ 还原后 PASS 段不 PASS（反证本身有效，缺的是还原基线）。
- **处置**：台账逐行登记完成后 PASS 段自然复原，**无需改 l2-reverse.mjs 本体的注入靶**。
- **证据**：`test:l2-reverse` **EXIT=0**，`✔ L2 反证全套 PASS：10 条全部「注入 → FAIL（命中 expectFailPattern）→ 逐字节还原（sha256）→ PASS」`。

### 4.4 npm test 全绿（原 §6.4 + 额外发现）

| 项 | R1 | R2 |
|---|---|---|
| `npm test` | 936 中 **4 红**（supersession 侧：v3 entries 链断裂 10 / v3 叶段 19 行 / v4 entries 换锚 8 条 / v4 段 20 行） | **937 / 937 全绿（0 fail）** |
| `test:supersession` | 30/4 | **31 / 0** |
| **额外发现（R2 新增，R1 §6 未登记）** | `test:density -- --reverse RP-V4-09` **FAIL**（R1 报告称复跑通过，实测期望值 `合计 10` 已被 v4-3 的 ask 卡基线取代 ⇒ `14 > 8`） | 一并重 pin（见 §4.4 / §5），`9 passed / 0 failed` |

> **口径**：R1 §6 的 4 项红与 R2 的 4 项重 pin 一一对应；另有 1 项 **R1 未登记**的 RP-V4-09 反证红在本轮一并处置（如实补记，不静默）。`npm test` 总数 936 → **937**（supersession 判据 +1，只增不减）。

## 5. 门禁全量账（严格串行 · 一次一个 Chromium · 日志全量落盘禁截断）

日志目录：`/tmp/opencode/v4-gate-logs/v4-3-r2/`（`summary.txt` 逐项记退出码）

| # | 门禁 | 命令 | 退出码 | 计数（原文） |
|:--:|------|------|:--:|------|
| 1 | typecheck | `npm run typecheck` | 0 | tsc --noEmit 通过 |
| 2 | build | `npm run build` | 0 | `dist/` 重建（sidepanel.js 440,698 B） |
| 3 | npm test | `npm test` | 0 | `ℹ pass 937 / ℹ fail 0` |
| 4 | supersession | `npm run test:supersession` | 0 | `ℹ pass 31 / ℹ fail 0`（counts 同源机核 4/4） |
| 5 | gate-integrity | `npm run test:gate-integrity` | 0 | `ℹ pass 12 / ℹ fail 0` |
| 6 | zero-injection | `npm run test:zero-injection` | 0 | `27 passed / 0 failed` |
| 7 | page-input | `npm run test:page-input` | 0 | `102 passed / 0 failed` |
| 8 | l0 | `npm run test:l0` | 0 | `216 passed / 0 failed` |
| 9 | l1 | `npm run test:l1` | 0 | `108 passed / 0 failed` |
| 10 | l2 | `npm run test:l2` | 0 | `73 passed / 0 failed` |
| 11 | density | `npm run test:density` | 0 | `171 passed / 0 failed` |
| 12 | journey | `npm run test:ui` | 0 | `167 passed / 0 failed` |
| 13 | insight | `npm run test:insight` | 0 | `116 passed / 0 failed` |
| 14 | binding | `npm run test:binding` | 0 | `192 assertions`（binding PASS） |
| 15 | hardening | `npm run test:hardening` | 0 | `24 assertions`（hardening PASS） |
| 16 | e2e | `npm run test:e2e` | 0 | 全链 PASS |
| 17 | ask-auth | `npm run test:ask-auth` | 0 | `49 passed / 0 failed` |
| 18 | stream | `npm run test:stream` | 0 | `63 passed / 0 failed` |
| 19 | design-contract | `npm run test:design-contract` | 0 | `ℹ pass 6 / ℹ fail 0` |
| 20 | l1-reverse | `npm run test:l1-reverse` | 0 | `9 条断言全部「注入 → FAIL → 还原 → PASS」` |
| 21 | l2-reverse | `npm run test:l2-reverse` | 0 | `10 条全部「注入 → FAIL → 还原 → PASS」` |
| 22 | RP-V4-09 复验 | `npm run test:density -- --reverse RP-V4-09` | 0 | `9 passed / 0 failed` |

**计数只增不减核对**：node 936 → **937**；supersession 30 → **31**；l0 212 → **216**；l1 108（=）；l2 73（=）；density 171（=）；journey 167（=）；insight 116（=）；binding 192（=）；hardening 24（=）；ask-auth 49（=）；stream 63（=）；page-input 102（=）；zero-injection 27（=）；门禁文件断言零删减。

**抽样口径台账订正（N-04 同源）**：`counts.l0` 212→**216**、`counts.nodeTestRuntime` 924→**937**、`counts.supersession` 30→**31**、`counts.density` 171（不变）；`source.log` 指向 `registry/` **快照**（同一状态的完整绿 run 副本，非实时 tee 目标）；静态读数复算 **1112 / 948 / 937**（`^test(` = 937 = `npm test` 实测，同源机核）。

**RP-V4-09（in-gate 反证）重 pin**：期望值由硬编码「合计 10 > 8」改为**动态** `基线合计 + 10`（v4-3 的 choice ask 卡使基线首屏合计可点为 4，见 HO-1 裁决）⇒ 注入 2×5 后实测 **14 > 8** 必须 FAIL，且归因仍是**合计**规则（单卡预算仍 PASS）；换锚后**逐条在门禁源码中的形态断言**（R4b 例外登记）随模板字面量更新，登记不消失。

## 6. 跨叶义务复算（HO-1 / HO-2）

### HO-1（首屏可见卡合计可点上限）—— **裁决原文**
> **裁决（v4-3 build，2026-09-19）**：**维持 `aggregateLimit` / `streamResidentClickableLimit = 8`，不提高、不放宽。**
> 依据（按真实产品态复算，非沿用）：v4-3 的 choice ask 卡只渲染 **≤3 个选项 + 末项「其他…（我来描述）」= 4 个可见可点**；`#ask-cancel` 与 `#ask-input/#ask-submit` 位于**默认收起**的 `#ask-fallback` 内（shim C4 / 法四），不计入默认屏可点；text 卡 = 输入 + 提交 + 取消 = 3；auth 卡 = 批准 + 拒绝 + 审计入口(`<a>`) = 3。
> 因此**两张 ask 卡同屏的最坏合计 = 4 + 4 = 8 ≤ 8**（不是 v4-2 预估的 5+5=10 —— v4-2 骨架把「取消」常驻，v4-3 把「取消」收进 fallback）。
> **反证（R2 实测复核）**：RP-V4-09 注入 2 张 × 5 可点卡 ⇒ 基线 4 + 10 = **14 > 8** 首屏预算 FAIL（`9 passed / 0 failed`）；`MAX_OPEN_ASKS=2` 由 `test/ask-auth-inflow.test.ts` ② 断言（第 3 张必 supersede 最旧）。
> **登记**：`docs/v4-density-baseline.json#knownLimitations` 追加 HO-1 结论条目。

### HO-2（面板重开截断规则 `scopeLimit` 复算）
> v4-3 把 ask/auth 落成**流内事件卡**后，`scopeLimit` 的临时收敛面（「自动读回只重放已终态 ask/auth 卡」）**仍成立且不再需要放宽**：v4-3 没有改变 `restoreStreamDigest` 的自动重放面（仍只重放 `terminal !== undefined` 的 `askuser`/`auth`），反而使「已终态决策卡」成为流一等公民。`truncationRules[scope=panel-reopen].kept` 仍与 `DIGEST_FIELDS` 逐字段相等（`test:supersession` 机核）。**差异登记**：`answer` / `cancelReason` **不新增**到 `kept`（保持零明文白名单不变）。

## 7. 宿主清零与红线核验

| 项 | 实测 |
|---|---|
| `index.html` `data-transitional-host="v4-3"` 计数 | **0**（v4-4 保留 **3**） |
| `ask-bridge.ts` diff | 0 行（零 diff） |
| `content.js` / `pick-layer.js` | **177,076 / 33,900 逐字节不变**（R2 复核） |
| `KIND_SET` / `SW` / manifest | 零改动 |
| sidepanel.js | **440,698 B** ≤ ceiling **462,732 B**（≤ +5%，公式 floor(440,698 × 1.05)） |
| `src/**` diff（R2） | **0 行**（本轮只改台账与测试，不碰产品字节） |
| journey / binding 保护段 | 字节零改（`protectedRanges` 逐字节机核通过） |
| 测试计数 | 只增不减（见 §5；本叶收口新增：supersession +1） |
| `git add -A` | 未使用（逐文件 `git add`） |

## 8. 未完成 / 风险

**无。** R1 登记的三类机械重 pin（§6.1~6.4 原文）已逐项闭环，全量 21 门禁 + RP-V4-09 复验全绿。

**已登记的**覆盖边界（诚实登记，非缺陷）：
1. `test/supersession-ledger.test.ts` **自身**不在叶段规则 scope 内（规则集由 **v3 台账**登记的 `test/**` 文件推出，该文件在 v3 段零出现）；它的删除行由 **base 相对判据**（v4 `modifiedRanges` / `entries`）承接，不由叶段判据判 —— 自判自身是循环，规则集不扩到判据文件。
2. v4-1 段 `scope.files` 的手工收窄（18 → 33）是**本轮按规则复算的订正**；订正后新增可见的删除行（`ref-wiring.test.ts` 4 / `sidepanel.test.ts` 1 等）已逐字登记，无遗漏。

## 9. 下一步

| 场景 | 操作 |
|------|------|
| 全部任务已完成 | 运行 `@sddu-review specs-tree-v4-3-ask-auth-inflow` 开始审查 |
| review 修复轮完成 | 运行 `@sddu-review specs-tree-v4-3-ask-auth-inflow` **复审**（R2） |

---

## 10. review 修复轮（R1 复审输入：BLOCK-01~04 + I-01~I-08 全量处置）

> **基线**：review-report.md（R1）@ HEAD `988855f`；本轮改动 = `src/ui/sidepanel/**` 10 文件 + `test/**` 9 文件 + 台账/基线 2 文件。
> **结论**：22 门禁全绿 + BLOCK 两段证伪 ×4 + I-03 展开态反证（in-gate + 产物级）。

### 10.1 阻塞逐条修法（BLOCK-01~04）

| # | 修法 | 位置 | 关键代码/契约 |
|---|------|------|---------------|
| **BLOCK-01** | `cancelled` 成为**独立终态语义**：`decisionState()` 返回 `'cancelled'`、`authFixedText()` 返回新常量 `ASK_COPY.authCancelled = '已取消（未授权，不执行）'`（单源）；三条路径（会话切换 `superseded` / 仲裁取代 `superseded` / 回合结束 `timeout`）都经同一映射 | `cards/auth.ts`（`decisionState` / `authFixedText`）、`stream-plaintext.ts`（新增 copy） | 「never a silent approve」重新结构性成立：`cancelled` 既不是 `pending` 也不是 `approved` |
| **BLOCK-02** | 回合结束与 60 s 超时**分离**：新增 `settleTurnEnd(state, at, reason)` —— 后台 ask（有 ask-bridge）按 `timeout` 结算（这是真实 60 s 到期的可观测形态）；**面板自有 ref-round ask（无 bridge / 无计时器）不结算**，只写一条「本轮已结束：引用提问仍在等待你的选择（不随回合结束取消）」系统行（**留痕，不静默、不假超时**）。`closeOpenAsks` 增加 `filter` 形参（会话切换仍结算全部） | `chat-state.ts`（`settleTurnEnd` / `case 'pending'`）、`stream-model.ts`（`closeOpenAsks(filter)`）、`stream-plaintext.ts`（`turnEndRefPending`） | 拾取 → 选择用途的链路不再间歇性断掉；**留痕**口径按 FR-CHAT-024 精神选择（卡保持可答 = 过程事实不冻结） |
| **BLOCK-03** | `rounds[]` 退役差值推断：`sidepanel.ts#decisionRounds()` 从 `project(state.stream)` 的**终态 askuser 卡**派生（`answered ⇒ payload.answer`；`cancelled ⇒ cancelReasonText(reason)`，可读）；`L1Input` 增加 `decisions`，`l1/panels.ts#observe` 只赋值不再推断；删除 `pendingAnswer` 与 `#l0-decision` 的 `ask-option:`/`ask-submit` 死委派（其生产者已随 `decision-card.ts` 退役） | `sidepanel.ts`、`l1/panels.ts`、`stream-plaintext.ts`（`cancelReasonText`） | 已决策历史 = 卡的事实，不再是 `lastUserText` / 「（无回答）」 |
| **BLOCK-04** | `patchCardNode` / `patchAuthCard` **透传真实 deps**（`stream-render.ts` 传 `cardDeps()`），审计入口的 `onCardAction` 不再为 `undefined`；`preventDefault()` 之后真的跳转 | `cards/index.ts`、`cards/auth.ts`、`stream-render.ts` | 刚决策的卡点审计 ⇒ `openL2View('audit')` ⇒ `[data-l2-view="audit"]` 可见 |

### 10.2 两段证伪原文（回退 ⇒ 红 / 修复 ⇒ 绿，逐字节还原 sha256）

**BLOCK-01**（回退 `cards/auth.ts` 的 cancelled 分支；`dist-test` 重编后跑 repro2）

```
回退：npm test ⇒ rc=1，2 条 FAIL（「BLOCK-01 假批准回归：三条真实路径…」「BLOCK-01 反向…」）
      test:ask-auth ⇒ rc=1，57 passed / 4 failed：
        ⑪ 被取代的 auth 卡渲染 data-decision=cancelled（不是 pending/approved） — {"decision":"pending","fixedText":"已批准",…}
        ⑪ 被取代的 auth 卡固化文案「已取消（未授权，不执行）」且不含「已批准」
        ⑪ 被取代的 auth 卡恰 1 张 cancelled、0 张 approved
        ⑪ 回合结束（真实超时）的 auth 卡同样渲染 cancelled + 「已取消」
      repro2（node /tmp/opencode/v43-review/repro2.mjs）：
        data-decision 渲染 = pending
        固化文案渲染     = 已批准        ← 与 R1 复现脚本逐字一致
修复：sha256(auth.ts)=cc545f27…（逐字节还原）
      npm test ⇒ rc=0（945 / 0）；test:ask-auth ⇒ rc=0（61 passed / 0 failed）
      repro2：data-decision 渲染 = cancelled / 固化文案渲染 = 已取消（未授权，不执行）
日志：BLOCK01-回退-npm-test.log · BLOCK01-回退-ask-auth.log · BLOCK01-修复-*.log
```

**BLOCK-02**（回退 `chat-state.ts` 的 `case 'pending'` 为 `closeOpenAskCards(…,'timeout')`）

```
回退：npm test ⇒ rc=1，1 条 FAIL（BLOCK-02 回归：面板自有 ref-round ask 在回合结束时**不结算、不写假超时**，且留痕）
      repro1（node /tmp/opencode/v43-review/repro1.mjs）：
        E. done 之后: [… {"rid":"ref-round-ref_1","term":"cancelled","reason":"timeout"}] open= 0
           SYS= […,"提问超时未答：已按未作答取消（不代填默认值）"]     ← R1 证据逐字复现（假超时）
修复：sha256(chat-state.ts)=fdf2c125…（逐字节还原）
      npm test ⇒ rc=0（945 / 0）
      repro1：E. done 之后: [… {"rid":"ref-round-ref_1"}] open= 1
             SYS= […,"本轮已结束：引用提问仍在等待你的选择（不随回合结束取消，不代填默认值）"]
日志：BLOCK02-回退-npm-test.log · BLOCK02-修复-npm-test.log
```

**BLOCK-03**（回退 `sidepanel.ts#decisionRounds` 的答案源为 `lastUserText`）

```
回退：test:l1 ⇒ rc=1，108 passed / 3 failed：
        ⑪ BLOCK-03：已决策历史的选择文案 = 流内卡的**真实答案** — [{…,"chosen":"（无回答）"},…]
        ⑪ BLOCK-03：取消轮必须 canceled=true 且原因可读（不是「（无回答）」）
        ⑪ BLOCK-03：历史行文案与卡的终态同源
修复：sha256(sidepanel.ts)=80f995e2…（逐字节还原）
      test:l1 ⇒ rc=0（111 passed / 0 failed）
日志：BLOCK03-回退-l1.log · BLOCK03-修复-l1.log
```

**BLOCK-04**（回退 `patchAuthCard` 的 deps 为 `{ doc: node.ownerDocument }`）

```
回退：test:ask-auth ⇒ rc=1，60 passed / 1 failed：
        ⑫ 点击审计入口后审计视图可见（真实跳转，不是死链） — {"before":false,"after":false}
修复：sha256(auth.ts)=cc545f27…（逐字节还原）
      test:ask-auth ⇒ rc=0（61 passed / 0 failed）
日志：BLOCK04-回退-ask-auth.log · BLOCK04-修复-ask-auth.log
```

### 10.3 I-01~I-08 处置

| # | 处置 | 说明 |
|---|------|------|
| **I-01** | **接线 + 删重**（选「接线」） | `label()` 工厂成为**生产路径**：`chat-state.ts` 的 `systemRow` / thinking / tool 三处 `label` 全部改走工厂（⇒ `assertStreamPlaintext` 有了生产消费点）；`assertStreamCopySafe()` 在 `stream-plaintext.ts` **模块求值期**执行（生产 import 即校验，fail-closed）；**删除** `STREAM_FIELD_WHITELIST`，改以 `STREAM_PERSISTED_FIELDS = DIGEST_FIELDS` 复用摘要侧唯一白名单（两份白名单不可能漂移） |
| **I-02** | **接线 + 删除** | `askFlowView()` 接为 **composer 真实消费点**：`renderSendReason()` 用它的 `sendDisabled` 决定禁用 + 用 `canSubmitOpenAsk` 在有待答卡时把文案补成「…；屏幕上的提问卡仍可提交。」；失真且无消费者的 `turnStuck` **删除**（`pending ∧ openAsks=0` 恰是「正常回复中」，正确判据需要本层不拥有的「无在途回复」，不得凭猜重定义） |
| **I-03** | **裁决：收紧（互斥披露），不设预算豁免** | `cards/askuser.ts#setCardFallbackOpen(cardForm, open)`：展开「其他…（我来描述）」即 `hidden` 掉选项行，收起即恢复。展开态单卡 = 4（输入+提交+取消+切换）、两卡展开合计 = 8 ≤ 8，与收起态**同一口径**。`l0/shell.ts#revealFallback`（L1「改用描述」入口）走同族函数。**可判定判据**：`test/ui/ask-auth-inflow.mjs` ⑪（收起态 ≤6 / 展开态 ≤6 / 两卡展开合计 ≤8 / 可见选项行 = 0）+ in-gate 反证；**展开态登记**：`docs/v4-density-baseline.json#knownLimitations`（HO-1 / I-03 条目）。**反证原文**见 §10.4 |
| **I-04** | 移植 auth 的守卫 | `buildForm` 铸 id 前先剥离既有 `#ask*` 全族（`LEGACY_ASK_ID` 清单单源）⇒「最新打开的卡拥有 legacy id」；修正 `askuser.ts` 失真注释（模型允许两张 askuser 同开） |
| **I-05** | 叶段 scope **去自指** | `test/supersession-ledger.test.ts` 新增 `testFilesWithDeletions(leafBase)`（`git diff --numstat <leafBase>` 的删除面）与 `leafScopeFilesFor(leafBase)` = 登记集 ∪ 本叶段删除面；v4 段 schema 判据改为**逐叶**复算。结果：`ui/stream.mjs`(8) / `density-thresholds.test.ts`(2) / `size-ruling-vol3.test.ts`(2) / `supersession-ledger.test.ts`(28) 由「不可见」变「受判」并逐字登记（v4-3 叶段 55 条） |
| **I-06** | 补 error 结算 | `case 'error'` 追加 `settleTurnEnd(…, 'aborted')`；新增 `AskCancelReason = 'aborted'` + `ASK_COPY.abortedSystem`（「回合因错误结束：该提问未作答即取消」）——原因不复用 `timeout` |
| **I-07** | 边界条件修复 | ① `cardIdForRequest` 只认**无终态事件**的卡；② `terminalDecision` 在**给了 requestId 却解析不到**时 **fail-closed**（不再回退「最后一张同 kind 的卡」）；③ `clearAsk` 按 `openAskEntries` 的种类分别派发（auth ⇒ `confirm-resolved`，askuser ⇒ `ask-resolved`），不再循环 `MAX_OPEN_ASKS+1` 后静默退出 |
| **I-08** | **登记**（选「改 ADR 登记」一侧，因 plan.md 属已完成产物不可改） | 差异登记于 `docs/v4-supersession-ledger.json#knownLimitations`：后果预演代入的是**卡片自身已显示的范围文本**（`payload.prompt`，与 `#ask-prompt` 同源），**仅渲染、不入摘要、不新增数据面**；ADR-V4-034 §2 「不含页面文本」的措辞按此校准为「不新增页面数据面」。代码注释同步说明 |

### 10.4 I-03 展开态反证（两段）

```
① in-gate（门禁内注入，§⑪ FAIL 段）：
   注入「选项行不收起」⇒ 判据必须 FAIL；还原 ⇒ PASS
② 产物级两段证伪（回退 setCardFallbackOpen 的收起逻辑）：
   回退：test:ask-auth ⇒ rc=1，57 passed / 4 failed：
        ⑪ 展开兜底后单卡仍 ≤6 — {"per":[7],"total":7,"visibleOptions":[3]}      ← HO-1 的 7 > 6
        ⑪ 展开兜底后可见选项行 = 0
        ⑪ 两卡同开且都展开：合计可点 ≤8 — {"per":[7,7],"total":14,…}            ← HO-1 的 14 > 8
        ⑪ (PASS 段) 还原互斥披露后判据必须 PASS
   修复：sha256(askuser.ts)=cad43291…（逐字节还原）⇒ rc=0（61 / 0）
   日志：I03-回退-ask-auth.log · I03-修复-ask-auth.log
```

### 10.5 新增/变更断言清单（只增不减）

| 文件 | 新增 | 说明 |
|------|:--:|------|
| `test/ask-auth-inflow.test.ts` | **+8 用例**（12 → 20） | BLOCK-01 假批准三路径 + 反向对照；BLOCK-02 真超时 + 面板自有 ask 不结算 + 会话切换反向；I-06 error 结算；I-07 fail-closed ×2（未知 requestId / 已终态卡 / clearAsk 种类契约）；常量单源改四条 reason |
| `test/ui/ask-auth-inflow.mjs` | **+12 断言**（49 → 61） | ⑪ BLOCK-01 假批准回归（被取代 / 回合结束）；⑫ BLOCK-04 审计入口真实跳转（点击前不可见 + 点击后可见）；⑪ I-03 展开态预算 4 条 + in-gate 反证 2 条 |
| `test/ui/l1.mjs` | **+3 断言**（108 → 111） | ⑪ BLOCK-03 答案源（两轮真实答案）+ 取消原因可读 + 行文案同源 |
| `test/gate-integrity.test.ts` | **+4 条 in-gate 形态登记** + 1 条例外登记 | BLOCK-01 / BLOCK-03 / BLOCK-04 / I-03 的 FAIL 形态必须存在于门禁源码（R4b 机核） |
| `test/supersession-ledger.test.ts` | 判据**覆盖增强**（计数不变） | 逐叶 diff 驱动 scope（I-05）；v4 段 schema 逐叶复算 |

### 10.6 门禁全量账（严格串行 · 一次一个 Chromium · 日志全量落盘）

日志目录：`/tmp/opencode/v4-gate-logs/v4-3-reviewfix/`（`summary.txt` 逐项记退出码；`registry/` 为同轮完整绿 run 副本，供台账 `counts.source.log` 同源机核）

| # | 门禁 | 命令 | 退出码 | 计数（原文） | 与上轮 |
|:--:|------|------|:--:|------|:--:|
| 1 | typecheck | `npm run typecheck` | 0 | tsc --noEmit 通过 | = |
| 2 | build | `npm run build` | 0 | `dist/` 重建（sidepanel.js 445,300 B） | +4,602 B |
| 3 | npm test | `npm test` | 0 | `ℹ pass 945 / ℹ fail 0` | 937 → 945 |
| 4 | supersession | `npm run test:supersession` | 0 | `ℹ pass 31 / ℹ fail 0` | = |
| 5 | gate-integrity | `npm run test:gate-integrity` | 0 | `ℹ pass 12 / ℹ fail 0` | = |
| 6 | zero-injection | `npm run test:zero-injection` | 0 | `27 passed / 0 failed` | = |
| 7 | page-input | `npm run test:page-input` | 0 | `102 passed / 0 failed` | = |
| 8 | l0 | `npm run test:l0` | 0 | `216 passed / 0 failed` | = |
| 9 | l1 | `npm run test:l1` | 0 | `111 passed / 0 failed` | 108 → 111 |
| 10 | l2 | `npm run test:l2` | 0 | `73 passed / 0 failed` | = |
| 11 | density | `npm run test:density` | 0 | `171 passed / 0 failed` | = |
| 12 | journey | `npm run test:ui` | 0 | `167 assertions` PASS | = |
| 13 | insight | `npm run test:insight` | 0 | `116 assertions` PASS | = |
| 14 | binding | `npm run test:binding` | 0 | `192 assertions` PASS | = |
| 15 | hardening | `npm run test:hardening` | 0 | `24 assertions` PASS | = |
| 16 | e2e | `npm run test:e2e` | 0 | 全链 PASS | = |
| 17 | ask-auth | `npm run test:ask-auth` | 0 | `61 passed / 0 failed` | 49 → 61 |
| 18 | stream | `npm run test:stream` | 0 | `63 passed / 0 failed` | = |
| 19 | design-contract | `npm run test:design-contract` | 0 | `ℹ pass 6 / ℹ fail 0`（shim 60/60） | = |
| 20 | l1-reverse | `npm run test:l1-reverse` | 0 | `9 条断言全部「注入 → FAIL → 还原 → PASS」` | = |
| 21 | l2-reverse | `npm run test:l2-reverse` | 0 | `10 条全部「注入 → FAIL → 还原 → PASS」` | = |
| 22 | RP-V4-09 复验 | `npm run test:density -- --reverse RP-V4-09` | 0 | `9 passed / 0 failed` | = |

**计数只增不减核对**：node 937 → **945**；l1 108 → **111**；ask-auth 49 → **61**；l0 216 / l2 73 / density 171 / journey 167 / insight 116 / binding 192 / hardening 24 / stream 63 / page-input 102 / zero-injection 27 / supersession 31 / gate-integrity 12 / design-contract 6 全部 **=**（零删减）。

### 10.7 体积五要素与红线（review 修复轮）

| 要素 | 值 |
|------|----|
| 基线 | 440,698 → **445,300 B**（+4,602 B，+1.04%；逐模块归因 `v43ReviewfixRows` Σ 5,898 + 胶水 −1,296） |
| ceiling | `floor(445,300 × 1.05)` = **467,565 B**（cap 仍 `record-only`） |
| 最终产物 | `dist/sidepanel.js` = **445,300 B**（登记值 == 实测产物，机核） |
| 历史值 | 440,698 / 426,487 / 425,094 … 全部逐字保留在 `SIDEPANEL_BASELINE_BYTES_TIMELINE` 与 `SIDEPANEL_RE_REGISTRATIONS`（含新条目 `v4-3-reviewfix`） |
| 归因 | 新增 `SIDEPANEL_GROWTH_BREAKDOWN.v43ReviewfixRows`（10 行，beforeBytes = v4-3 轮 afterBytes） |

| 红线 | 实测 |
|---|---|
| `content.js` / `pick-layer.js` | **177,076 / 33,900 逐字节不变** |
| `src/background/**` / `src/content/**` / `manifest.json` / `policy.ts` / `auto-authorize.ts` | **零 diff** |
| SW / `KIND_SET` / 判定链 / `ask-bridge.ts` | 零改动 |
| journey / binding 保护段 | 字节零改（`protectedRanges` 逐字节机核通过） |
| 台账 | `leafBases` 逐叶 scope 复算 + 逐字删除行集合相等（v4-3 段新增 55 条）；`entries` 新增 2 条 + 换锚 30 条（newTitle 定位 + oldTitle 真被删除双向机核） |
| `git add -A` | 未使用（逐文件 `git add`） |

### 10.8 本轮未完成 / 风险

**无。** 12 项处置全部落地；22 门禁 + 4 组两段证伪 + I-03 反证全绿。

**如实登记的边界**：① BLOCK-01 的三条路径中，「会话切换」在 DOM 门禁里由模型侧（`test/ask-auth-inflow.test.ts` 用真实 `decisionState`/`authFixedText`）判定，「被取代 / 回合结束」两条另在真实渲染路径上判定 —— 未为会话切换新增渲染层 seam（避免为非产品路径扩 seam）；② `askFlowView.canSubmitOpenAsk` 的文案消费点在 composer **提示行**（`#send-reason`），推荐 chip 的接线按 ADR-V4-032 仍归 v4-4。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（11 任务源码产出 + 终态事件表 + HO-1 裁决/反证 + HO-2 复算 + 宿主清零 + 体积五要素；如实登记 3 类未绿门禁） | 2026-09-19 | SDDU Build Agent |
| v2.0 | R2 收口轮：4 项机械重 pin 逐项闭环（台账 71 entries + 1 叶段 72 行 + 9 换锚；RP-L1-E 空安全重 pin；l2-reverse 还原基线复原；npm test 937/0）+ 抽样口径按实测订正 + 全量 21 门禁 + RP-V4-09 全绿 + 反证两段证据 | 2026-09-19 | SDDU Build Agent |
| v3.0 | **review 修复轮**：BLOCK-01~04 修法 + 两段证伪原文 ×4 + I-01~I-08 逐条处置（含 I-03 裁决与展开态判据/反证、I-05 叶段 scope 去自指）+ 新增断言清单 + 22 门禁全绿 + 体积五要素重登记（445,300 / 467,565） | 2026-09-19 | SDDU Build Agent |

