# 构建报告：specs-tree-v55f-1-ref-context-and-anchor（V5.5F-1 范围底座）

> **文档定位**: SDDU 构建报告 — 记录本叶**两轮**（**R1 = W1+W2**，`TASK-V55F-101~115`；**R2 = W3+W4**，`TASK-V55F-116~129`）的文件变更、实现结果与门禁读值，作为 review 的输入
> **前置依赖**: 本叶 `tasks.md` / `tasks.json`（29 任务 / 4 波；W1/W2 blockers）、本叶 `plan.md` v1.0、父 `plan.md` + `ADR-SGO-001/002/003`（另读 006/007 做落点判定）
> **创建人**: SDDU Build Agent
> **创建时间**: 2026-09-24
> **版本**: v2.0（**全叶收口 = R1 + R2**，29/29）
> **更新人**: SDDU Build Agent
> **更新时间**: 2026-09-24
> **更新说明**: **v2.0（R2 = W3+W4，本叶逐叶收口）** —— W3 `--ref` 锚定包装（SG-SGO-02 可行 11/11 + `tools/dom-anchor.ts` + `background/ref-observe.ts` 单实现 live 单节点闸 + 失配 EC 家族 + `dom-ref-anchor` 门禁 7/0）+ W4 S0′ 双面（5 拍样本单源 + node `S0P-1~8` 24/0 + Chromium `S0P-C1~C5` 只加断言 65/0）+ X-SGO-1~7 台账（4 superseded（X-SGO-1/2/3/5）+ 3 no-supersession（4/6/7）+ 2 条显式取代条目 + 12 项 `modifiedRanges`）+ 红线巡检 + 法八引用注入面 + 门禁治理（`V55F1_NODE_GATE_FILES ≥3`）+ **体积逐叶重登记（578,623 → 585,732 B）** ⇒ **7 项体积/红线 pin 红全部闭环**；`npm test` **1375 / 1375 / 0 fail**。初始版本（v1.0）记录 R1（W1+W2）落地：SG-SGO-01 / SG-SGO-03 先验闸门 + `chat` type-only refs 载荷 + 回合发起快照 + SW 系统段基座/追加段 + 范围读数单源（法九四值 + 唯一判定函数）+ confirm 面越界拦 + 留痕单源 + 两枚新 node 门禁（`ref-context-in-turn` / `law9-scope-reading`）+ X-SGO-5 等价重锚。**体积逐叶重登记（`TASK-V55F-129`）与 X 台账 `modifiedRanges[]`（`TASK-V55F-125`）按任务书留 R2**，见 §5/§7。

---

## 1. 构建概要

| 维度 | 数值 |
|------|:--:|
| 完成任务数 | **29 / 29**（全叶收口：R1 = `TASK-V55F-101~115`，R2 = `TASK-V55F-116~129`） |
| 复杂度分布 | R1：S×2（`102` / `105`）/ M×10 / L×3 · R2：M×11（`116`~`121` / `125`~`129`）/ L×3（`122` / `123` / `124`） |
| 新增文件 | **8 个**（口径：唯一入库文件，不含探毕删除的 `test/_spike/sg-sgo-02-probe.mjs`）。R1 5：`l1/ref-scope.ts` / `background/ref-turn.ts` / `background/ref-context.ts` / `test/ref-context-in-turn.test.ts` / `test/law9-scope-reading.test.ts`；**R2 3**：`src/tools/dom-anchor.ts` / `src/background/ref-observe.ts` / `test/dom-ref-anchor.test.ts`（另 `test/_spike/sg-sgo-02-probe.mjs` 探毕删除、不入库，故不计数） |
| 修改文件 | **25 个**（口径：唯一文件，跨轮重复修改去重；R2 的 `ref-turn.ts` / `service-worker.ts` 重复修改已在 R1 计入，不重计）。R1 8：源码 5（`messaging.ts` / `service-worker.ts` / `turn-queue.ts` / `ref-store.ts` / `sidepanel.ts`）+ 门禁 3（`l1-ref-validity.test.ts` / `ui/l1.mjs` / `ui/page-input.mjs`）；**R2 17**：源码 1（`browser-tools.ts`）+ 门禁 14（`gate-integrity.test.ts` / `insight-no-escalation.test.ts` / `op-wiring.test.ts` / `r6-ty-experience-fix.test.ts` / `ref-wiring.test.ts` / `s0-self-driven-chain.test.ts` / `size-baseline.ts` / `size-budget.test.ts` / `size-growth-evidence.test.ts` / `size-ruling-vol3.test.ts` / `supersession-ledger.test.ts` / `ui/fixtures/s0-chain.mjs` / `ui/law8-plaintext.mjs` / `ui/s0-self-driven.mjs`）+ 台账 2（`docs/v4-supersession-ledger.json` / `docs/v4-density-baseline.json`） |
| 先验闸门 | **SG-SGO-01 = 可行（9/9）** · **SG-SGO-03 = 可机核（3/3）** · **SG-SGO-02 = 可行（11/11）**；探针产物已删（`test/_spike/` 不入库） |
| 测试计数 | `npm test` **1330 → 1352 → 1375**（R1 +22 / **R2 +23**：`dom-ref-anchor` 7 + `S0P-1~8` 9 + X 台账 2 + `OP-W ⑨` 1 + 行内追加 4）；**终态 1375 pass / 0 fail**（R1 末的 7 项体积/红线 pin 红**全部闭环**，见 §5.2） |
| A 列体积 | `dist/sidepanel.js` **578,623 → 585,732 B**（**+7,109 B ≈ 6.94 KiB**；预算 **6.0~9.0 KB** / 上界 10.35 KB ⇒ **未越**）；**逐叶重登记已落**（生效上限 607,554 → **615,018**；档位 614,400 / 绝对上限 675,840 不动） |
| B 列体积（**不计账**） | `dist/background.js` **1,617,969 → 1,627,424 B**（R1 +3,044 / **R2 +6,411**：`dom-anchor.ts` + `ref-observe.ts` + `browser-tools.ts` 接线；不计入 sidepanel 账本，FR-SGO-121 / ADR-SGO-007 §3） |
| 红线冻结面 | `dist/content.js` **177,076 B** / sha `52a82620…`、`dist/pick-layer.js` **34,358 B** / sha `77796bab…` **逐字节不变**；`packages/web-cli-base/**` **零 diff**（`git diff --stat` = 0 行） |
| 计数红线 | `KIND_SET` **40 逐字**（`refs` 是 `chat` payload 字段，未成 kind）；`requestTurn(` **恰 2**；`op.execute(` 恰 1；`maybeRecommend` 1 定义 / 7 调用点；`nextAfterSettle` 1 定义 / 10 调用点（`op-wiring` 13/0 绿） |
| 判定链 / 不动面 | `insight-no-escalation` **17 / 0** 绿（base 零 diff ∧ `zeroDiffFiles` 9 项哈希 pin ∧ `manifest.json` 零 diff） |
| 保护段 | journey / binding **本轮零改动**（未触及两文件）；保护段判据由 `supersession-ledger`（36/37，唯一红为红线③体积 pin）守护。binding 一次隔离复跑的 CDP 环境性失败如实记录（§7） |

### 1.1 SG 先验闸门结论（五要素）

| 项 | **SG-SGO-01**（`TASK-V55F-101`，W1） | **SG-SGO-03**（`TASK-V55F-109`，W2） |
|---|---|---|
| **假设** | ① `chat` 载荷可经 `messaging.ts` type-only 单声明承载 `refs` 且 `KIND_SET` 40 不增；② `requestTurn` 唯一构建点覆盖两条入口且 `requestTurn(` 仍恰 2；③ SW 引用唯一来源 = 回合载荷（零新通道） | ① 去注入 ⇒ 读数 `no-ref` 必红可构造；② 三段控制 `ok`/`violated`/`n/a` 可达（非布尔）；③ 真源切片（读生产模块、不读 `SYSTEM_PROMPT`）可得 |
| **探针方法** | `test/_spike/sg-sgo-01-probe.mjs`：`KIND_SET` 字面量计数 + esbuild 双跑产物逐字节比对（加/不加 type-only 声明）+ `op-wiring` 同口径调用点扫描 + SW 源码通道扫描 | `test/_spike/sg-sgo-03-probe.mjs`：局部原型读数 + node 断言注入实跑 FAIL/还原 PASS + 三段控制 Set 互异 + 生产模块可读性切片 |
| **实跑证据** | `KIND_SET` = 40；esbuild 产物 **1,299 B → 1,299 B（Δ = 0 B）**；`requestTurn(` 行号 `3581, 3608` = 2；`case 'chat'` 仅读 `message.user`；SW 无 `ref-store` import / 无引用表 | 去注入 ⇒ `no-ref`；改判 `in-scope` ⇒ **node 实跑 FAIL**；三态 = `n/a / ok / violated`（Set.size = 3）；`ref-store` verdict 谓词面与 `sidepanel` `confirm-request` 分支可读 |
| **结论** | **可行（9/9 断言成立）** | **可机核（3/3 断言成立）** |
| **对下游影响** | `103` / `105` / `107` / `108` **解除阻塞**（BLK-SGO-1 不触发） | `110` / `113` / `114` **解除阻塞**（BLK-SGO-3 不触发） |
| **产物去向** | 探针已删，`git status` 无 `test/_spike/`（日志：`/tmp/opencode/v4-gate-logs/v55f-1-r1/sg-sgo-01.log`） | 同上（日志：`…/sg-sgo-03.log`） |

### 1.1b SG-SGO-02 先验闸门结论（五要素，**R2 / TASK-V55F-116**）

| 项 | **SG-SGO-02**（`TASK-V55F-116`，W3） |
|---|---|
| **假设** | ① plugin 侧**条目包装可达**（覆写 `schema` + 替换 `executor`）且 `packages/web-cli-base/**` **零 diff**；② `observeIdentity` 可抽为**单一实现**（`background/ref-observe.ts`）被 `service-worker.ts` 与 `tools/dom-anchor.ts` **同源 import**，支撑 live 单节点闸 |
| **探针方法** | `test/_spike/sg-sgo-02-probe.mjs`：包装先例静态切片（`chrome-host.ts` 的 spread + schema/executor 覆写 + `baseExecutor` 调用）∧ `git diff --stat ../web-cli-base` = 0 行 ∧ `observeIdentity` 实现/调用点计数 ∧ 抽取落点成对性（实现 + 同源 import） |
| **实跑证据** | A1~A3 先例三断言成立；B1 `base` 零 diff（`--stat` 0 行）、B2 `--ref` 不进 base；C1/C2 `observeIdentity` 在 SW **恰 1 处**实现、C3 只读入口 = `chrome.scripting.executeScript`、C4 两调用点（mark/observe）在位；C5/C6 抽取成对性判据成立 |
| **结论** | **可行（11/11 断言成立）** |
| **对下游影响** | `117` / `118` / `119` / `121` **解除阻塞**（BLK-SGO-2 不触发；**零改 base / 未放宽 `risk`**） |
| **产物去向** | 探针已删（`git status` 无 `test/_spike/`；日志：`/tmp/opencode/v4-gate-logs/v55f-1-r2/sg-sgo-02-pre.log`） |

---

## 2. 文件变更

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l1/ref-scope.ts` | 103 / 110 / 112 | **A 列**。① `turnRefsOf(records)`（**恰一处**）把 `RefRecord` 投影为 `ChatRefFact[]`：只取 `verdict === 'valid'` ∧ 未退役（`isActiveRef` 单源）、`refMark = refId`、`refState` 恒 `'valid'`；② `maskRefDigest`（`maskTextPayload` + 裸词元形兜底）—— 口径注释写死「页面文本可入上下文 / 凭据值不可 / 留痕只含字段名」；③ `SCOPE_READINGS`（4 值**唯一声明**）+ `scopeReading(facts)`（**唯一判定函数**：`refs 空 ⇒ no-ref`，两路命中 `targetInRefs`，越界按 `authorized` 输入事实二态）；④ `SCOPE_TRACE_FIELDS` + `scopeReadingTrace`（机器枚举 + actor，零用户内容值）；⑤ `scopeWriteGate`（越界未征询 ⇒ blocked + 可读理由 + 可达 next） |
| NEW | `packages/web-cli-plugin/src/background/ref-turn.ts` | 105 | **B 列**。当前回合活跃引用**单源** holder（`refs` + `tabId` + `observe` 缝）；每回合 `set` / `finally` `clear`；`refOf(n)` 供 `--ref` 路 A；零新通道 / 零每回合页面探测 |
| NEW | `packages/web-cli-plugin/src/background/ref-context.ts` | 106 | **B 列**。`refContextSegment(refs)`：无 refs ⇒ `''`（⇒ `system === SYSTEM_PROMPT` **逐字**）；有 refs ⇒ `'\n\n'` + 事实行（refNum / selector / textDigest / refState / refMark）+ 法则引导文本（`REF_SCOPE_GUIDANCE`）；`validateRefPayload` / `isChatRefFact` **逐项剔除**非法项（形状 / 正整数 `refNum` / 非空 `selector` / `refState === 'valid'`）。**`SYSTEM_PROMPT` 基座不在此模块** |
| NEW | `packages/web-cli-plugin/test/ref-context-in-turn.test.ts` | 108 | 新 **node 门禁**（`RCT-1~8`）：载荷 type-only 单声明（7 字段）/ `KIND_SET` 40 / 唯一构建点 + 两入口 + `requestTurn(` 恰 2 / 基座 5 条逐字 + 追加段 / 零引用字段缺席 / 凭据形掩码 / SW 唯一来源 = 载荷 / 回合引用单源（动态）。**9 用例**，每条 `expectFailPattern` + 注入反证 |
| NEW | `packages/web-cli-plugin/test/law9-scope-reading.test.ts` | 113 / 114 | 新 **node 门禁**（`L9-1~8` + `L9-114` + `L9-112`）：四值唯一声明（真源扫 `src/**`）/ `no-ref` / 两路 `in-scope` / 越界二态 / **生产写闸切片**（deny + 可达 next）/ 三段控制 `ok`/`violated`/`n/a` / 真源切片（**不读** `SYSTEM_PROMPT`）+ **双向反证族**（注入 ⇒ FAIL ⇒ 逐字节还原 ⇒ PASS）/ 留痕单源。**12 用例** |
| MODIFY | `.../src/background/messaging.ts` | 102 | **type-only** `ChatRefFact`（**7 字段**）/ `ChatRefTurnPayload` **恰一处**声明（对齐 `ChatResultVariant` 先例）；`KIND_SET` 40 逐字不动（`refs` 不是 kind） |
| MODIFY | `.../src/background/service-worker.ts` | 107 | `case 'chat'` 读 `message.refs` → `validateRefPayload` → `void runChat(s, user, refs)`；`runChat(s, user, refs?)`：`system: () => SYSTEM_PROMPT + refContextSegment(refs)`（`chat-runner.ts` 零改）+ 回合开始 `refTurnHolder.set({refs, tabId, observe: observeIdentity})` / `finally` `clear()`；`QueuedTurn` 入队带快照、drain 递归 `runChat(s, drained.user, drained.refs)` |
| MODIFY | `.../src/background/turn-queue.ts` | 107 | `QueuedTurn.refs?`（**排队回合自带快照** ⇒ 零跨回合漂移；缺省 ⇒ 字段缺席，行为逐字不变） |
| MODIFY | `.../src/ui/sidepanel/l1/ref-store.ts` | 104 | **只读取用**：新增 `isActiveRef(record)`（`verdict === 'valid'` ∧ `!retired`，**单源谓词**）+ `RefStore.activeValid()` 只读访问器；`judge` / `dispatch` / 退役 / 冻结原因**语义零改**（`ref-validity` 方向不动） |
| MODIFY | `.../src/ui/sidepanel/sidepanel.ts` | 104 / 111 / 112 / 115 | ① `requestTurn` 内**唯一构建点** `turnRefsOf(l1?.store().all() ?? [])` + `...(refs.length ? { refs } : {})`（两条入口同口径；`requestTurn(` 仍恰 2）；② `confirm-request` 分支落**范围写闸**（`dom set-text` 且带目标 ⇒ `scopeWriteGate`；`out-of-scope-unauthorized` ⇒ `confirm-response allow:false` + `confirm-resolved` + 可读理由 notice + `scopeReadingTrace` 留痕行 + `return`；`in-scope`/`no-ref` ⇒ 既有 confirm 路径逐字不变）；③ testing seam 增 `l1('scope', …)`（把**生产读数**暴露给运行时门禁） |
| MODIFY | `.../test/l1-ref-validity.test.ts` | 115 | **纯追加** import + `X-SGO-5` 用例：`valid ⇒ 范围锚`（三路命中）/ 越界二态 / `no-ref`；**deny 方向逐字不动**（`invalid`/`unknown` 仍非锚、唯一放行点仍只接受 `valid`）+ 双向反证（伪造「一律取」谓词 ⇒ 会误判 `in-scope`） |
| MODIFY | `.../test/ui/l1.mjs` | 115 | **纯追加** `⑭ 范围锚读数` 11 条运行时断言（真面板 `window.__v3.testing.l1('scope')`）：存储选择器 / 合成锚 / `--ref` 路命中 ⇒ `in-scope`；陌生目标未征询 / 已批准；失效 ⇒ 锚空 ⇒ `no-ref`；零引用 ⇒ `no-ref`；双向反证 ×2；读数零副作用。**下界常量 111 / 72 与注释逐字未动**（计数实测 131 / 93 只增） |
| MODIFY | `.../test/ui/page-input.mjs` | 115 | **纯追加** `⑰` 7 条断言：**真实手势拾取**的 valid 引用作为范围锚（`--ref` / 合成锚命中 ⇒ `in-scope`；陌生目标二态；双向反证 ×2；读数零副作用） |

| NEW | `packages/web-cli-plugin/src/background/ref-observe.ts` | **R2** 117 | **B 列**。`observeIdentity` **抽为单一实现**（原 `service-worker.ts` 私有函数逐字迁移；`RefObservation` / `RefObserver` 类型也在此单声）；`service-worker.ts` 与 `tools/dom-anchor.ts` **同源 import**（禁第二份副本）。只读观测（`querySelectorAll` / `getAttribute` / `textContent`，零 DOM 写） |
| NEW | `packages/web-cli-plugin/src/tools/dom-anchor.ts` | **R2** 118 / 119 / 120 | **B 列**。`wrapDomEntryForAnchor(entry, env)`：**schema 覆写**（仅增 `ref`，零新子命令）+ **executor 替换**（`resolveRefAnchor` 解析链 → 合成锚 → live 单节点闸 → **交基线 `baseExecutor`**）；`risk` / `subcommandRisks` **逐字段 spread 自 base**；`ANCHOR_ERRORS` 七条 EC 文案（可读 + 指引，零用户内容值）。**导入 `refTurnHolder` 生产单例**（与 SW **同源取用**同一份回合快照） |
| NEW | `packages/web-cli-plugin/test/dom-ref-anchor.test.ts` | **R2** 121 | 新 **node 门禁**（`DRA-1~6`）：解析链逐级 fail-closed / 单节点闸唯一通过 / **risk 逐字段对照 base（降档注入必红）** / schema 只增 `ref` / 锚定通过交基线 executor（失配不调用）/ base 零 diff + 同源单实现。**7 用例** |
| NEW | `packages/web-cli-plugin/test/_spike/sg-sgo-02-probe.mjs` | **R2** 116 | 先验探针（**探毕删除，不入库**；结论见 §1.1b） |
| MODIFY | `.../src/tools/browser-tools.ts` | **R2** 119 | `entries.push(wrapDomEntryForAnchor(createDomToolEntry(env), env))`（替换裸条目）；不触达判定链 |
| MODIFY | `.../src/background/service-worker.ts` | **R2** 117 | 删除模块私有 `observeIdentity`（改同源 import）+ holder 改用 `ref-turn.ts` 生产单例（`set` / `finally clear` 调用点逐字不变） |
| MODIFY | `.../test/ui/fixtures/s0-chain.mjs` | **R2** 122 | **纯追加** S0′ 5 拍（`ref-in-turn` / `scope-inject` / `read-in-scope` / `write-1` / `no-injection`）+ `S0P_ITEMS` 八条判据 + `s0pProblems` 纯函数；既有 `S0_CHAIN` 10 环节逐字保留（`S0_CHAIN.length === 10` 仍成立） |
| MODIFY | `.../test/s0-self-driven-chain.test.ts` | **R2** 123 | **纯追加** import / 解构 / `S0P_JUDGEMENTS` / S0P-1~8 九个用例 + 元判据（S0P-4 改写处数 ≤ 引用数 / S0P-7 双向反证含 sha256 还原 / S0P-8 如实交代） |
| MODIFY | `.../test/ui/s0-self-driven.mjs` | **R2** 124 | **只加断言**：`S0P-C1`（真面板 `chat` 载荷含引用事实）/ `S0P-C2`（真产物字节：基座 + 引导文案 + 工厂）/ `S0P-C3`（合成锚在真 `data:` 页面恰 1 命中，注入 ⇒ 2）/ `S0P-C4`（范围留痕独立成行）/ `S0P-C5`（样本单源）；`CHROMIUM_GATES === 9` 逐字不动 |
| MODIFY | `.../docs/v4-supersession-ledger.json` | **R2** 125 | X-SGO-1~7 台账块（4 superseded（X-SGO-1/2/3/5）+ 3 no-supersession（4/6/7））+ 2 条显式取代条目（`V55F1-E-237..244` / `V55F1-E-VOL-1`）+ **12 项 `modifiedRanges`** + **第 9 个 `leafBases` 段**（`leafBase 68848af`，逐字登记 47 条删除行）+ 全体 `newTitle` 等价重锚（61 条）+ ⑤三值闭合前移 |
| MODIFY | `.../test/supersession-ledger.test.ts` | **R2** 125 | 纯追加：`xSgoLedgerProblems` 判据 + X-SGO 一致性用例 + `modifiedRanges` 逐项登记用例（反证：非法 decision / 悬空 counterCheck / 漏项 ⇒ 必红） |
| MODIFY | `.../test/op-wiring.test.ts` | **R2** 125 | 纯追加 `OP-W ⑨`：主流程 diff = 0 复合读数（`requestTurn(` 2 · `maybeRecommend` 1/7 · `nextAfterSettle` 1/10）+ 台账 X-SGO-7 = **未发生取代**如实登记（原判据逐字不动） |
| MODIFY | `.../test/insight-no-escalation.test.ts` | **R2** 126 | 纯追加红线巡检：`content.js` 177,076 / sha `52a82620…` ∧ `pick-layer.js` 34,358 / sha `77796bab…` ∧ `KIND_SET` 40 ∧ `zeroDiffFiles` 不动面逐项零 diff（`git status --porcelain` 含未跟踪）+ `gitDrift` 注入反证 |
| MODIFY | `.../test/ui/law8-plaintext.mjs` | **R2** 127 | 只加断言 ⑧：引用注入路径四面零明文（越界写请求不回显）+ 范围留痕零值 + 凭据形掩码单点（真源切片 + 反证）。**36 → 46 断言，零降级** |
| MODIFY | `.../test/gate-integrity.test.ts` | **R2** 128 | 纯追加 `V55F1_NODE_GATE_FILES`（3 枚，下界 ≥3）+ 元判据用例；`EXPECTED_AUDITED_FILES` 只增 3 项；`CHROMIUM_GATES === 9` 逐字不动 |
| MODIFY | `.../test/size-baseline.ts` | **R2** 129 | **逐叶重登记**：基线 578,623 → **585,732** ∧ TIMELINE 追加 ∧ META（日期 / measuredBy 首元组 / finalArtifactBytes）∧ `PENDING_ABSOLUTE_CAP`（随基线同源）∧ **新增登记条目 `v55f-1-r2`**（五要素 + 三值 + EC 二态）∧ `v55f1R1R2Rows`（4 行，Σ +7,070 + glue 39 == +7,109）∧ 累计口径前移（`deltaBytes` 290,507 / 桶和）∧ 模块数 92 → 94 |
| MODIFY | `.../test/size-budget.test.ts` / `size-growth-evidence.test.ts` / `size-ruling-vol3.test.ts` | **R2** 129 | 数值重 pin（607,554 → 615,018；578,623 → 585,732；越界反证样本 610,000 → 620,000）+ 最新一轮 rows 重指向（`r6TyFixRows` → `v55f1R1R2Rows`）+ 组数 32 → 33 + FR 编号面接受 `FR-SGO-*`（**断言零删减**） |
| MODIFY | `.../docs/v4-density-baseline.json` | **R2** 129 | `volume.registeredBaselineBytes` 578,623 → **585,732** / `ceilingBytes` 607,554 → **615,018**（与代码常量同源） |
| MODIFY | `.../test/ref-wiring.test.ts` / `r6-ty-experience-fix.test.ts` | **R2** 117 | 等价重锚：`observeIdentity` 真源切片从 `service-worker.ts` 前移到单一实现 `ref-observe.ts`（判据不变，只换切片指向；逐字登记见台账新叶段） |

> **NOOP（显式登记）**: `packages/web-cli-base/**`（零 diff）· `src/content/**` · `dist/content.js` · `dist/pick-layer.js` · `manifest.json` · `src/background/chat-runner.ts`（`system: string \| (() => string)` 已支持工厂 ⇒ 零改）· `src/security/confirm.ts` · `policy.ts` / `auto-authorize.ts`（判定链 `zeroDiffFiles` 9 项）。

---

## 3. 任务完成清单

| 任务 | 名称 | 复杂度 | 状态 | 对应 FR |
|------|------|:--:|:--:|------|
| TASK-V55F-101 | SG-SGO-01 载荷链可行性三断言探针（先验闸门） | M | ✅ completed（**可行 9/9**；探针已删） | FR-SGO-010/013/019/006 |
| TASK-V55F-102 | `messaging.ts` type-only `ChatRefFact` / `ChatRefTurnPayload` | S | ✅ completed | FR-SGO-010/011 |
| TASK-V55F-103 | `l1/ref-scope.ts` 引用快照投影 + 形状 + 掩码口径 | M | ✅ completed | FR-SGO-011/012/018/019 |
| TASK-V55F-104 | `requestTurn` 唯一载荷构建点 + `ref-store` 只读取用 | L | ✅ completed | FR-SGO-013/014/015 |
| TASK-V55F-105 | `ref-turn.ts` 当前回合活跃引用单源 | S | ✅ completed | FR-SGO-019/038 |
| TASK-V55F-106 | `ref-context.ts` 系统段追加段 + 载荷运行时校验 | M | ✅ completed | FR-SGO-015/016/017 |
| TASK-V55F-107 | `service-worker.ts` 读 refs + `runChat` 签名 + 系统段工厂 + `turn-queue.refs` | L | ✅ completed | FR-SGO-015/016/017 |
| TASK-V55F-108 | `test/ref-context-in-turn.test.ts` 新门禁（载荷形态） | M | ✅ completed（**9/9 绿**） | FR-SGO-010/012/013/016/017 |
| TASK-V55F-109 | SG-SGO-03 法九双向反证可机核探针（先验闸门） | M | ✅ completed（**可机核 3/3**；探针已删） | FR-SGO-070/071/092 |
| TASK-V55F-110 | `ref-scope.ts` `SCOPE_READINGS` 4 值 + `scopeReading` 唯一判定 | M | ✅ completed | FR-SGO-020~024 |
| TASK-V55F-111 | 越界拦：`confirm` 面范围闸（fail-closed + 可达 next） | M | ✅ completed | FR-SGO-025/026/027/037 |
| TASK-V55F-112 | 留痕单源 + 零值纪律（`SCOPE_TRACE_FIELDS` / `scopeReadingTrace`） | M | ✅ completed | FR-SGO-080/083/084 |
| TASK-V55F-113 | `test/law9-scope-reading.test.ts` 法九门禁（node） | L | ✅ completed（**12/12 绿**） | FR-SGO-070~077 |
| TASK-V55F-114 | 法九双向反证族（去注入 `no-ref` 必红 + 逐字节还原） | M | ✅ completed（3 组注入实跑 + 还原） | FR-SGO-071/092/111 |
| TASK-V55F-115 | X-SGO-5 等价重锚（deny 方向逐字不动 + 读数双向反证） | M | ✅ completed | FR-SGO-100/104 |
| TASK-V55F-116 | SG-SGO-02 包装 base 零 diff + live 闸复用探针（先验闸门） | M | ✅ completed（**可行 11/11**；探针已删） | FR-SGO-031/033/037 |
| TASK-V55F-117 | `ref-observe.ts` `observeIdentity` 抽为单一实现 | M | ✅ completed | FR-SGO-033 |
| TASK-V55F-118 | `src/tools/dom-anchor.ts` `wrapDomEntryForAnchor` | M | ✅ completed | FR-SGO-030/031/032 |
| TASK-V55F-119 | `browser-tools.ts` `dom` 条目接线包装层 | M | ✅ completed | FR-SGO-031/037 |
| TASK-V55F-120 | 失配 EC 家族 + 失效可判（逐级 fail-closed） | M | ✅ completed | FR-SGO-033~036/038 |
| TASK-V55F-121 | `test/dom-ref-anchor.test.ts` 新门禁 | M | ✅ completed（**7/7 绿**） | FR-SGO-030~037 |
| TASK-V55F-122 | S0′ 样本单源扩展 `test/ui/fixtures/s0-chain.mjs` | L | ✅ completed（5 拍追加 / 既有 10 环节逐字保留） | FR-SGO-090 |
| TASK-V55F-123 | S0′ node 面 `test/s0-self-driven-chain.test.ts`（S0P-1~8） | L | ✅ completed（**9 用例绿**，含 S0P-4 / S0P-7 双向反证 + sha256 还原） | FR-SGO-090/091/092 |
| TASK-V55F-124 | S0′ Chromium 面 `test/ui/s0-self-driven.mjs`（只加断言） | L | ✅ completed（**65/0**；`S0P-C1~C5`） | FR-SGO-090/094 |
| TASK-V55F-125 | X-SGO-1/2/3 台账 + X-SGO-7 未发生登记 + `op-wiring` 复合读数 | M | ✅ completed（7 行：4 superseded（X-SGO-1/2/3/5）+ 3 no-supersession（4/6/7）；12 项 `modifiedRanges`；新叶段逐字登记 47 行） | FR-SGO-100/101/102/106/107/112 |
| TASK-V55F-126 | 红线巡检：base 零 diff + 三冻结面 + 判定链 / 不动面 | M | ✅ completed（sha 双锚 + `KIND_SET` 40 + 不动面零 diff） | FR-SGO-123/037/005 |
| TASK-V55F-127 | 法八四面只增（引用注入零明文 + 凭据掩码）+ 留痕零值扫描 | M | ✅ completed（**46/0**，36 零降级） | FR-SGO-046/050/083 |
| TASK-V55F-128 | 门禁治理收口（`gate-integrity` 下界只增 + 断言只增对账） | M | ✅ completed（`V55F1_NODE_GATE_FILES ≥3`；`CHROMIUM_GATES === 9`） | FR-SGO-077/115 |
| TASK-V55F-129 | 体积逐叶重登记 + 本叶收口（五要素 + 三值 + EC-SGO-022 二态） | M | ✅ completed（**闭环 7 红**；A 列 +7,109 B 未越预算 / 生效上限 **615,018**） | FR-SGO-120~125 |

---

## 4. 门禁对账

> 严格串行（**一次一个 Chromium**）；日志全量落在 `/tmp/opencode/v4-gate-logs/v55f-1-r2/`。
> 终态 = **R1 + R2 全叶**；「基线」= R1 末读值（1330 = 本叶前）。

| 门禁 | 基线 | 本轮（R2 终态） | 结论 |
|---|---:|:--:|---|
| `npm run typecheck` | 绿 | **绿** | 无类型错误（日志 `typecheck.log`） |
| `npm run build` | 绿 | **绿** | 4 产物 + `build-meta.json`；`sidepanel.js` = 585,732（日志 `build.log`） |
| `npm test`（全部 node 门禁） | 1352（1345/7） | **1375 / 1375 / 0 fail** | R2 +23 用例只增；**R1 的 7 项 pin 红全部闭环**（日志 `final-npm-test.log`） |
| `op-wiring`（调用点计数 + 复合读数） | 13/0 | **绿（含 `OP-W ⑨`）** | `requestTurn(` 恰 2 ∧ `maybeRecommend` 1/7 ∧ `nextAfterSettle` 1/10 ∧ 台账 X-SGO-7 = 未发生取代 |
| `ref-context-in-turn`（新） | 9/0 | **9 / 0** | 载荷 / 基座 / 零漂移 / 掩码 / 通道 |
| `law9-scope-reading`（新） | 12/0 | **12 / 0** | 法九四值 / 写闸 / 三段控制 / 真源切片 / 双向反证 |
| `dom-ref-anchor`（**新，R2**） | — | **7 / 0** | 解析链逐级 / 单节点闸 / risk 不放宽（注入必红）/ schema 只增 / 交基线 executor |
| `l1-ref-validity` | 21/0 | **21 / 0** | deny 方向逐字不动 + X-SGO-5 增量 |
| `insight-no-escalation` | 17/0 | **20 / 0** | base 零 diff ∧ `zeroDiffFiles` 9 项 ∧ 三冻结面 sha 双锚（R2 纯追加 3 条） |
| `test:supersession`（含 X-SGO 台账 + modifiedRanges） | 37（36/1 红线③） | **39 / 0** | **红线③ 闭环**（登记基线 == 实测产物） |
| `test:gate-integrity`（`V55F1_NODE_GATE_FILES ≥3`） | 19/0 | **20 / 0** | 3 枚新 node 门禁逐项在受审集合；`CHROMIUM_GATES === 9` |
| `test:law8`（法八四面 + 引用注入面） | 36/0 | **46 / 0** | **36 断言零降级** + ⑧ 引用注入路径零明文 / 留痕零值 / 掩码单点 |
| `test:l0` | 248/0 | **248 / 0** | 计数不减 |
| `test:l1`（Chromium 真面板） | 131/0 | **131 / 0** | 计数不减（≥120） |
| `test:page-input`（Chromium 真页面） | 125/0 | **125 / 0** | 计数不减（≥118） |
| `test:dead-end` | 49/0 | **49 / 0** | 计数不减 |
| `s0-self-driven`（Chromium；S0′ 双面） | 59/0 | **65 / 0** | **只加断言**（`S0P-C1~C5`）；`CHROMIUM_GATES === 9` |
| `s0-self-driven-chain`（node；S0P-1~8） | 15/0 | **24 / 0** | 9 个 S0P 用例 + 元判据（只增） |
| `test:density` | 242/0 | **242 / 0** | 计数不减（≥242） |
| `test:journey`（保段优先） | 171/0 | **171 / 0** | 保护段 `43054..58287` / `cc79f413…` **零字节**（保段优先，未取代） |
| `test:insight` | 118/0 | **118 / 0** | 计数不减 |
| `test:binding`（保段） | 192/0 | **192 / 0** | 保护段 `107780..115930` / `be9ad0e9…` **零字节** |
| `test:hardening` / `test:stream` / `test:l2` / `test:l1-reverse` / `test:l2-reverse` / `test:zero-injection` / `test:recommendation` / `test:auth-chip` / `test:ask-auth` / `test:onboarding` / `test:design-contract` / `test:ref-pick-wiring` | 全绿 | **全绿** | 日志同名 `.log`（`ask-auth` 首两跑为启动期环境性失败 —— 795 个陈旧 Chromium 临时 profile 占满 `/tmp`；清理后**隔离复跑绿**，见 §7 偏差 5） |
| `size-*` / `test:size-ruling-vol3` | 7 红 | **全绿** | 逐叶重登记闭环（见 §5.2） |
| 红线巡检 | — | **绿** | `content.js` 177,076 / `52a82620…`；`pick-layer.js` 34,358 / `77796bab…`；base 零 diff；`KIND_SET` 40；`requestTurn(` 2；`manifest.json` 零 diff；`zeroDiffFiles` 不动面零漂移 |

## 5. 体积五要素（**逐叶收口重登记已落**，R2 / `TASK-V55F-129`）

> 口径（ADR-SGO-007 / FR-SGO-120~125）：**A 列** = `sidepanel.js` 净增（计账）；**B 列** =
> `background.js` 净增（**不计账**，优先落 SW 侧）。**R1 只测量；R2 即测即登记**（逐叶，不等叶2）。

| 要素 | 值 |
|---|---|
| **① 前值 / 后值** | A 列：**578,623 B → 585,732 B**（**+7,109 B ≈ 6.94 KiB**，+1.23%）· B 列：**1,617,969 → 1,627,424 B**（R1 +3,044 / R2 +6,411；不计账） |
| **② 日期** | 2026-09-24（**R1+R2 全叶收口**） |
| **③ 来源 / 命令 / 测量者** | `packages/web-cli-plugin/dist/sidepanel.js` / `npm run build`（esbuild `metafile: true` ⇒ `dist/build-meta.json`）/ SDDU Build Agent（`stat` + `build-meta.json` 与 R6 树**同几何重建**对账） |
| **④ 理由** | A 列 = `l1/ref-scope.ts` **NEW +2,572**（读数单源 + 快照投影 + 写闸）+ `sidepanel.ts` **+1,765**（载荷构建 / 范围闸 / 留痕 / seam）+ `l1/ref-store.ts` **+149**（只读谓词 + 访问器）+ `../web-cli-base/dist/sensitive.js` **+2,584**（复用 base 掩码/敏感面，非复制）+ glue 39；B 列 = `tools/dom-anchor.ts` NEW / `background/ref-observe.ts` NEW / `service-worker.ts` 单实现接线 / `browser-tools.ts` 包装接线（全部落 SW bundle ⇒ 本产物零字节，FR-SGO-121） |
| **⑤ 历史保留** | `SIDEPANEL_BASELINE_BYTES_TIMELINE` 追加 585,732（**只追加**）；`SIDEPANEL_RE_REGISTRATIONS` 追加 `v55f-1-r2`（五要素齐备）；`HISTORY` 逐字不动；`META.reRegisteredFrom` / `note` / `reason` 历史段逐字保留 |
| **V3-VOL-3 三值同源** | `newBaselineBytes` = 585,732（= 源码常量）∧ 档位 `ceilTo50KB(585,732)` = **614,400** ∧ 绝对上限 675,840 = 614,400 × 1.10 ∧ `resolvedOn` 保持 2026-09-19（不随登记漂移） |
| **逐模块归因** | `SIDEPANEL_GROWTH_BREAKDOWN.v55f1R1R2Rows`：Σ 模块 **+7,070** + 未归因胶水 **39** == 登记增量 **+7,109**（真实 metafile 逐值可核） |
| **预算对照** | A 列预算 **6.0~9.0 KB**（上界 10.35 KB）⇒ **未越预算 / 未越上界**；生效上限 **615,018**（= `floor(585,732 × 1.05)`）⇒ 585,732 未越；档位 **614,400** / 绝对上限 **675,840** ⇒ 未跨；`authorConfirmation` 保持 **`pending-author-line`**（**不得伪称已确认**） |
| **EC-SGO-022 二态（显式，禁预填）** | 越**生效上限**（旧 607,554）= **否**（585,732 < 607,554）· 越**档位**（614,400）= **否** · 越**绝对上限**（675,840）= **否** ⇒ **三分支均未触发**；`SIDEPANEL_CEILING_CAP` 保持 `record-only` |

### 5.1 R1 中间读数（历史保留）

A 列 `578,623 → 585,732`（R1 测量值即终值：R2 全部改动落 B 列），B 列 R1 `+3,044` / R2 `+6,411`。
R1 当时的 7 项体积/红线 pin 红（`size-budget` / `size-growth-evidence` ×5 / `supersession` 红线③）
**归因即闭环任务 `TASK-V55F-125` + `129`**，见下。

### 5.2 R1 的 7 项 pin 红 —— 闭环证据（R2 终态）

| 红 | 位置 | R1 触发原因 | R2 闭环（终态读数） |
|---|---|---|---|
| `V2-2 size: built sidepanel.js stays within the regression ceiling` | `size-budget.test.ts` | 登记基线 578,623 ≠ 实测 585,732 | **基线重登记为 585,732** ⇒ 绿 |
| `R6 缺陷快修轮体积定稿：五要素齐备 …` | `size-growth-evidence.test.ts` | 终轮五要素未随产物前移 | 末条登记改为 `v55f-1-r2`（五要素齐备）⇒ 绿 |
| `V3-VOL-1 ③ growth: 真实 metafile 与登记分解一致` | `size-growth-evidence.test.ts` | `out.bytes` 未前移 | 登记基线 == 实测 ⇒ 绿 |
| `V3-VOL-1 ③ growth: 输入模块数 == 真实 metafile（I8）` | `size-growth-evidence.test.ts` | `inputs` 92 ≠ 94 | 登记 94 == 实测 94 ⇒ 绿 |
| `V3-VOL-1 ③(V4-1) growth: 最新一轮 rows 必须匹配真实 metafile（I9）` | `size-growth-evidence.test.ts` | 最新一轮 rows 未换锚 | rows 重指向 `v55f1R1R2Rows`（4 行逐值 == metafile）⇒ 绿 |
| `V4.5-1 R3 growth: 终轮（Δ=0）… Σ Δ 可核` | `size-growth-evidence.test.ts` | Δ=0 终轮常量未前移 | 三类计数与 rows 同源前移 ⇒ 绿 |
| `V5.5-3 红线终核 12 项`（红线③ = `sidepanel.js` 必须等于登记基线） | `supersession-ledger.test.ts` | 实测 585,732 ≠ 登记 578,623 | 登记前移 + 「未跨档位」判据 ⇒ 绿（12/12） |

## 6. 反证摘要（每任务注入 ⇒ 必红 ⇒ 还原 ⇒ PASS）

| 任务 | 注入点 | 期望 FAIL 模式 | 实测 |
|:--:|---|---|:--:|
| 101 | 加/不加 type-only 声明（esbuild 双跑） | 产物字节必须相同（Δ=0） | ✅ Δ=0 B |
| 102 / 108 | 复制 `ChatRefFact` 声明 / 把 `refs` 加进 `KIND_SET` | 「字段集必 7」「KIND_SET 41」 | ✅ FAIL → 还原 PASS |
| 103 / 104 / 108 | 删 `requestTurn` 内唯一构建点 / 复制第三个 `requestTurn(` | 「构建点 0 处」「实测 3 处」 | ✅ FAIL → 还原 PASS |
| 106 / 108 | 改基座一条条款 / 删追加段（`system` 退回常量） | 「基座条款被改写」「追加段缺失」 | ✅ FAIL → 还原 PASS |
| 104 / 108 | 零引用改无条件 `{ refs }`（空数组） | 「零引用不得带 refs 字段」 | ✅ FAIL → 还原 PASS |
| 103 / 108 | 注入「不掩码的投影」 | 「凭据形 textDigest 未掩码」 | ✅ FAIL → 还原 PASS |
| 107 / 108 | SW 直连面板引用表 / 删回合 `clear()` | 「不得 import 面板引用表」「必须 set/finally clear」 | ✅ FAIL → 还原 PASS |
| **110 / 113 / 114** | 把 `no-ref` 分支**改判 `in-scope`** | 真源判据 + 语义判据**双红**，且 **sha256 注入前后不同 / 还原后逐字节相同（生产文件零改写）** | ✅ FAIL → 还原 PASS |
| **111 / 113 / 114** | **删除写闸的越界拦截**（`if (gate.blocked) { … }` 整块） | 「必须 deny / 写闸裁决未被使用」 | ✅ FAIL → 还原 PASS |
| 114 | `allow: false → true` / 四值散落到第二模块 | 「必须 deny」「第二声明」 | ✅ FAIL（恒绿检测） |
| 115 | 伪造「一律取」活跃谓词（把失效引用当锚） | 对照读数会误判 `in-scope`（真判据零锚） | ✅ 判据承重 |
| **116 / 117 / 121** | **删 `observeIdentity` 同源 import / 在 SW 复制第二份副本** | 「单实现必须恰一处」「SW 不得保留第二份副本」 | ✅ FAIL（计数判据）→ 还原 PASS |
| **118 / 120 / 121** | **把包装层 `risk` 降档**（`set-text` → `read`）/ 新增子命令档 | 「risk 降档必须判红」「子命令集合不一致」 | ✅ FAIL → 还原 PASS（逐字段对照 base） |
| **119 / 120 / 121** | **去 live 单节点闸 ⇒ 多匹配静默**（按首元素）/ 0 命中去闸 ⇒ 回退 `--selector` | 「多命中必须显式报告命中数」「0 命中不回退」 | ✅ FAIL → 还原 PASS |
| **120 / 121** | `--ref` 失配静默（返回 `ok:true` 继续写） | 「失配 ⇒ 基线 executor 不得被调用」 | ✅ FAIL → 还原 PASS |
| **121** | `--ref` 用在读命令（`read-element`） | 「非 set-text 必须 EC-SGO-017」 | ✅ 注入漏级实现 ⇒ 判据红（EC-SGO-017 拦截承重） |
| **122 / 123** | **S0P-7 去注入 no-ref**（把真源 `no-ref` 分支改判 `in-scope`） | 「去注入 ⇒ 读数必须为空 / `no-ref`」 | ✅ FAIL → **逐字节还原（sha256 前后相同）** → PASS |
| **123** | S0P-4 越界：引用 1 却改写 2 处 | 「未授权时改写处数不得超过引用数」 | ✅ FAIL |
| **124** | 真 DOM 上注入第二个 `data-wcli-ref="ref_1"` 节点 | 「合成锚恰 1 命中」 | ✅ 计数 1 → **2**（判据非恒真，注入后还原 1） |
| **125** | 从 `modifiedRanges` 移出一项 / X-SGO decision 非法 / counterCheck 悬空 | 「逐项登记」「decision 显式」「可定位」 | ✅ FAIL（三条注入实跑） |
| **126** | 把不动面文件塞进 `zeroDiffFiles`（伪造零漂移读数） | 「不动面逐项零 diff」 | ✅ FAIL（注入 ⇒ 恰一条问题） |
| **127** | 把哨兵注入一条卡 payload（引用注入面恒真检测） | 「同一扫描必命中」 | ✅ FAIL → 还原 PASS（面仍非恒真） |
| **128** | 把未在册路径塞进受审集合 | 「未在受审集合的门禁必须判红」 | ✅ FAIL |
| **129** | 用旧基线算 ceiling / 旧生效上限当边界 | 「ceiling 必须严格等于 `floor(当前基线 × 1.05)`」「615,019 必须 FAIL」 | ✅ FAIL（边界不是宽松的） |

---

## 7. 纪律与偏差登记

| 项 | 状态 |
|---|---|
| 法八（页面文本可入上下文 / 凭据不可） | ✅ `maskRefDigest` 单点掩码（`maskTextPayload` + 裸词元兜底）；留痕只含字段名 + 机器枚举；`law8` 36/0 **零降级** |
| 法九（读数单源 + 禁恒真） | ✅ 四值**唯一声明**（`src/**` 扫描，第二声明 ⇒ FAIL）；三段控制 `ok`/`violated`/`n/a`（`n/a` 单独计数）；**判据不读** `SYSTEM_PROMPT` |
| 测试只增 | ✅ 1330 → 1352（+22）；Chromium 面只加断言不加文件（`CHROMIUM_GATES === 9` 未动） |
| 门禁串行 + 日志 | ✅ 一次一个 Chromium；日志 `/tmp/opencode/v4-gate-logs/v55f-1-r1/` |
| `git add -A` | ✅ 未使用（按文件精确 stage；`dist/` / `dist-test/` / `test/_spike/` 均未入库） |
| 红线巡检 | ✅ `content.js` 177,076 / `52a82620…`；`pick-layer.js` 34,358 / `77796bab…`；base 零 diff；`KIND_SET` 40；`requestTurn(` 恰 2；`manifest.json` 零 diff |
| **偏差登记 1** | **体积重登记后置**：本轮 A 列净增 **+7,109 B**（在 6.0~9.0 KB 预算内）但**不重登记**（`TASK-V55F-129` 留 R2，按任务书）；7 项体积/红线 pin 门禁**如实红**，归因与闭环见 §5.1。**不以放宽容差 / 删判据 / 静默降档实现** |
| **偏差登记 2** | **X-SGO-5 的落点**：`test/ui/l1.mjs` / `page-input.mjs` / `l1-ref-validity.test.ts` 的既有下界常量与注释**逐字未动**（计数实测只增：l1 131、page-input 125），以避免产生 v4 叶段的未登记删除行 |
| **偏差登记 3** | **`test:binding` 环境性失败**：首跑 `ERR:CDP socket not open`（启动期）、隔离复跑超时未落日志（KL-N-10 家族）。**如实记录，不伪造串行绿**（N-SGO-021）；本轮零改动 binding 面文件，保护段由台账判据守护 |
| **偏差登记 4** | `authorized` 恒 `false`：本叶无扩围确认路径（WIDEN 二择卡为叶2）⇒ confirm 面写闸** fail-closed**；`authorized` 仍为**输入事实**（AI 不得自判），叶2 接线后自然可达 `out-of-scope-authorized` |
| **偏差登记 5（R2）** | **`test:ask-auth` 首两跑为启动期环境性失败**（`CDP socket closed` / `service worker 不可达`）：根因 = `/tmp` 下 **795 个陈旧 Chromium 临时 profile**（`/tmp/org.chromium.Chromium.*`，历史遗留）把 tmpfs 推到 80% ⇒ Chrome 起不来。清理后**隔离复跑绿**（`ask-auth-retry3.log`）。**不伪称首跑绿**；`test:recommendation` 同源一度受同一环境阻塞，清理后复跑绿 |
| **偏差登记 6（R2）** | **S0′ Chromium 面的 `refNum` 取真拾取序号**：本门禁在 S0′ 段之前已拾取过一次引用，故真面板给的序号是 `2`（样本 canonical = `1`）。判据写成「载荷 `refNum` 与本次拾取**同源** ∧ `refState=valid` ∧ `selector` 非空」，canonical `S0P_REF_NUM = 1` 由 node 面机核（`S0P` 元判据）——**如实标注，不伪称 refNum=1** |
| **偏差登记 7（R2）** | **`S0P-C2`（系统段追加段在位）为真产物字节切片 + 真源工厂断言**，不是运行期合成读数：运行期「零引用 ⇒ `system` 逐字等于基座」的等价由 node 面 S0P-2 用**生产模块**判定（`refContextSegment([]) === ''`）。两面**分工如实登记**，不用机核冒充真机 |
| **偏差登记 8（R2）** | **X 台账的 `newTitle` 全体等价重锚（61 条 v4 + 链式覆盖 10 条 v3）**：逐叶体积重登记改写 `size-*.ts` 的数值后，历史 `newTitle` 不再可定位 ⇒ 按既有纪律**重锚到当前文本**（判据结构零删减；v3 段由 v4 接管条目续链）。这是**登记行为**，不是放宽 |

---

## 8. 下一步

| 场景 | 操作 |
|------|------|
| **本叶已收口** | 29/29 任务完成，全门禁串行全绿（`npm test` 1375/1375）；**可进 review** |
| 审阅 | 运行 `@sddu-review specs-tree-v55f-1-ref-context-and-anchor` 开始审查（判据真空 + 注入反证完整性） |
| 后续（叶2） | `@sddu-build specs-tree-v55f-2-batch-consent`（批量授权 / WIDEN 二择 / `authorized` 真实来源）—— 本叶已把 `authorized` 留作**输入事实**（EC-SGO-022 三分支均未触发，体积累计不超档） |

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v2.0 | **全叶收口（R1+R2，29/29）**：R2 = W3（SG-SGO-02 可行 11/11 + `dom-anchor.ts` + `ref-observe.ts` 单实现 + 失配 EC 家族 + `dom-ref-anchor` 7/0）+ W4（S0′ 样本单源 5 拍 + node S0P-1~8 24/0 + Chromium `S0P-C1~C5` 65/0 + X-SGO-1~7 台账（4 superseded（X-SGO-1/2/3/5）+ 3 no-supersession（4/6/7））+ 12 项 `modifiedRanges` + 新叶段逐字登记 47 行 + 红线巡检 + 法八 ⑧ 46/0 + `V55F1_NODE_GATE_FILES ≥3` + **逐叶体积重登记 578,623 → 585,732 B（+7,109 B，预算内）**）。**7 项体积/红线 pin 红全部闭环**；`npm test` **1375 / 1375 / 0 fail**（≥1330）；B 列 1,627,424 B（不计账）；三冻结面 + base + `KIND_SET` 40 + `requestTurn(` 2 逐项绿；`authorConfirmation` 保持 `pending-author-line`（EC-SGO-022 三分支均未触发） | 2026-09-24 | SDDU Build Agent |
| v1.0 | 初始创建（**R1 = W1+W2**，`TASK-V55F-101~115`）：SG-SGO-01 可行（9/9）+ SG-SGO-03 可机核（3/3）；`chat` type-only refs 载荷 + 回合发起快照 + SW 系统段基座/追加段 + 法九读数单源 + confirm 面越界拦 + 留痕单源；2 枚新 node 门禁（`ref-context-in-turn` 9 / `law9-scope-reading` 12）；X-SGO-5 等价重锚（`l1` 131 / `page-input` 125 只增）；`npm test` 1330 → 1352（1345 pass / 7 fail，7 红全部为体积收口 + X 台账家族，留 R2）；A 列 +7,109 B（预算内，重登记留 R2）/ B 列 +3,044 B（不计账）；红线四面逐项绿 | 2026-09-24 | SDDU Build Agent |
