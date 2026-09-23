# 构建报告：specs-tree-v55f-1-ref-context-and-anchor（V5.5F-1 范围底座）

> **文档定位**: SDDU 构建报告 — 记录本轮（**R1 = W1+W2**，`TASK-V55F-101~115`）的文件变更、实现结果与门禁读值，作为 review / R2 的输入
> **前置依赖**: 本叶 `tasks.md` / `tasks.json`（29 任务 / 4 波；W1/W2 blockers）、本叶 `plan.md` v1.0、父 `plan.md` + `ADR-SGO-001/002/003`（另读 006/007 做落点判定）
> **创建人**: SDDU Build Agent
> **创建时间**: 2026-09-24
> **版本**: v1.0（R1 = W1+W2）
> **更新人**: SDDU Build Agent
> **更新时间**: 2026-09-24
> **更新说明**: 初始创建 —— R1（W1+W2）落地：SG-SGO-01 / SG-SGO-03 先验闸门 + `chat` type-only refs 载荷 + 回合发起快照 + SW 系统段基座/追加段 + 范围读数单源（法九四值 + 唯一判定函数）+ confirm 面越界拦 + 留痕单源 + 两枚新 node 门禁（`ref-context-in-turn` / `law9-scope-reading`）+ X-SGO-5 等价重锚。**体积逐叶重登记（`TASK-V55F-129`）与 X 台账 `modifiedRanges[]`（`TASK-V55F-125`）按任务书留 R2**，见 §5/§7。

---

## 1. 构建概要

| 维度 | 数值 |
|------|:--:|
| 完成任务数 | **15 / 15**（本轮范围 = `TASK-V55F-101~115`，W1+W2）；全叶 29 任务中 `116~129` 属 W3/W4，本轮**未开工** |
| 复杂度分布 | S×2（`102` / `105`） / M×10（`101` / `103` / `106` / `108` / `109` / `110` / `111` / `112` / `114` / `115`） / L×3（`104` / `107` / `113`） |
| 新增文件 | **5 个**（源码 3：`l1/ref-scope.ts` / `background/ref-turn.ts` / `background/ref-context.ts`；门禁 2：`test/ref-context-in-turn.test.ts` / `test/law9-scope-reading.test.ts`） |
| 修改文件 | **8 个**（源码 5：`messaging.ts` / `service-worker.ts` / `turn-queue.ts` / `l1/ref-store.ts` / `sidepanel.ts`；门禁 3：`test/l1-ref-validity.test.ts` / `test/ui/l1.mjs` / `test/ui/page-input.mjs`） |
| 先验闸门 | **SG-SGO-01 = 可行（9/9）** · **SG-SGO-03 = 可机核（3/3）**；探针产物已删（`test/_spike/` 不入库） |
| 测试计数 | `npm test` **1330 → 1352**（新增 22 用例：`ref-context-in-turn` 9 + `law9-scope-reading` 12 + `X-SGO-5` 1）；**1345 pass / 7 fail** —— 7 项**全部**属**体积收口 + X 台账**家族（W4 的 `TASK-V55F-125`/`129`），本轮按任务书**未开工**，见 §5 |
| A 列体积 | `dist/sidepanel.js` **578,623 → 585,732 B**（**+7,109 B ≈ 6.94 KiB**；本叶 A 列预算 **6.0~9.0 KB**、上界 10.35 KB ⇒ **未越预算 / 未越上界 / 未越生效上限 607,554**） |
| B 列体积（**不计账**） | `dist/background.js` **1,617,969 → 1,621,013 B**（**+3,044 B**；系统段组装 / 载荷校验 / `ref-turn` / `turn-queue` 优先落 SW 侧，FR-SGO-121） |
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
| TASK-V55F-116~129 | W3（`--ref` 锚定包装 / 失配 EC）+ W4（S0′ 双面 / X 台账 / 门禁治理 / 体积重登记） | — | ⏳ **未开工（留 R2，按任务书）** | — |

---

## 4. 门禁对账

> 严格串行；日志全量落在 `/tmp/opencode/v4-gate-logs/v55f-1-r1/`。

| 门禁 | 基线 | 本轮 | 结论 |
|---|---|:--:|---|
| `npm run typecheck` | 绿 | **绿** | 无类型错误 |
| `npm run build` | 绿 | **绿** | 4 产物 + `build-meta.json` 生成 |
| `npm test`（全部 node 门禁） | 1330 / 0 | **1352 / 1345 pass / 7 fail** | +22 用例只增；7 红**全部**为体积收口 + X 台账家族（见 §5） |
| `op-wiring`（调用点计数） | 13/0 | **13 / 0** | `requestTurn(` 恰 2 ∧ 主流程 diff = 0 |
| `ref-context-in-turn`（新） | — | **9 / 0** | 载荷 / 基座 / 零漂移 / 掩码 / 通道 |
| `law9-scope-reading`（新） | — | **12 / 0** | 法九四值 / 写闸 / 三段控制 / 真源切片 / 双向反证 |
| `l1-ref-validity` | 20/0 | **21 / 0** | deny 方向逐字不动 + X-SGO-5 增量 |
| `insight-no-escalation` | 17/0 | **17 / 0** | base 零 diff ∧ `zeroDiffFiles` 9 项哈希 pin |
| `test:l1`（Chromium 真面板） | 120/0 | **131 / 0** | +11 范围锚读数断言；运行期计数 131 ≥ 下界 111 |
| `test:page-input`（Chromium 真页面） | 118/0 | **125 / 0** | +7 断言（真实手势拾取 ⇒ 范围锚） |
| `test:dead-end` | 49/0 | **49 / 0** | 计数不减（未触碰阻塞面） |
| `test:law8`（法八四面） | 36/0 | **36 / 0** | **零降级**（新注入路径同为四面扫描面） |
| 红线巡检 | — | **绿** | `content.js` 177,076 / `52a82620…`；`pick-layer.js` 34,358 / `77796bab…`；base 零 diff；`KIND_SET` 40；`requestTurn(` 2；`manifest.json` 零 diff |
| `test:binding` | 192/0 | **⏳ 环境性失败** | 首跑 `ERR:CDP socket not open`（启动期，非断言面）；隔离复跑未落日志（如实记录，不伪造绿）。**本轮零改动 binding 面文件 + 保护段由 `supersession-ledger` 判据守护** |
| `test:journey` | 171/0 | **未跑（零改动）** | 未触及 `journey.mjs` / 其受控面；保护段 `43054..58287` / `cc79f413…` 由台账判据守护 |

---

## 5. 体积五要素（**测量并登记输入；重登记留 R2**）

> 口径（ADR-SGO-007 / `TASK-V55F-129`）：**A 列** = `sidepanel.js` 净增（计账）；**B 列** = `background.js` 净增（**不计账**，优先落 SW 侧）。本轮**只测量与报告**，`test/size-*` 的常量重登记、时间线追加、metafile 逐模块归因与 EC-SGO-022 二态**按任务书留 R2**。

| 要素 | 值 |
|---|---|
| **① 前值 / 后值** | A 列：**578,623 B → 585,732 B**（**+7,109 B ≈ 6.94 KiB**）· B 列：**1,617,969 B → 1,621,013 B**（**+3,044 B**，不计账） |
| **② 日期** | 2026-09-24（R1 = W1+W2） |
| **③ 来源 / 命令 / 测量者** | `packages/web-cli-plugin/dist/sidepanel.js` / `npm run build`（esbuild `metafile: true` ⇒ `dist/build-meta.json`）/ SDDU Build Agent（`stat` + `build-meta.json`） |
| **④ 理由** | A 列 = 本叶要求的新模块 `l1/ref-scope.ts`（读数单源 + 快照投影 + 写闸裁决）+ 4 处既有模块接线（`sidepanel.ts` 载荷构建 / 写闸 / 留痕 / seam、`l1/ref-store.ts` 只读谓词 + 访问器）；B 列 = `ref-context.ts` NEW / `ref-turn.ts` NEW / `service-worker.ts` 系统段工厂 + 载荷校验 + 单源接线 / `turn-queue.ts` 快照 / `messaging.ts` type-only（零字节） |
| **⑤ 历史保留** | `SIDEPANEL_BASELINE_BYTES_HISTORY` / `_TIMELINE` / `SIDEPANEL_RE_REGISTRATIONS` 的既有条目**本轮零改动**（重登记连同 578,623 入册的动作留 R2） |
| **预算对照** | A 列预算 **6.0~9.0 KB**（上界 10.35 KB）⇒ **未越**；生效上限 **607,554 B**（`floor(578,623 × 1.05)`）⇒ 585,732 未越；档位 **614,400** ⇒ 未跨；绝对上限 **675,840** ⇒ 未越；`authorConfirmation` 保持 **`pending-author-line`**（**不得伪称已确认**） |

### 5.1 本轮 7 项红的归因（**均为 W4 的体积收口 / X 台账家族，按任务书未开工**）

| 红 | 位置 | 触发原因 | 闭环任务 |
|---|---|---|---|
| `V2-2 size: built sidepanel.js stays within the regression ceiling` | `size-budget.test.ts` | 登记基线 578,623 ≠ 实测 585,732 | `TASK-V55F-129` |
| `R6 缺陷快修轮体积定稿：五要素齐备 ∧ …` | `size-ruling-vol3.test.ts` 家族 | 终轮五要素未随产物前移 | `TASK-V55F-129` |
| `V3-VOL-1 ③ growth: the real esbuild metafile agrees with the recorded breakdown` | `size-growth-evidence.test.ts` | `out.bytes` / 最新一轮 rows `afterBytes` 未随产物前移 | `TASK-V55F-129` |
| `V3-VOL-1 ③ growth: the registered input-module count equals the real metafile inputs (I8)` | `size-growth-evidence.test.ts` | `inputs` 92 ≠ 94（新增 2 个模块） | `TASK-V55F-129` |
| `V3-VOL-1 ③(V4-1) growth: the v4-1 round afterBytes must match the real metafile (I9)` | `size-growth-evidence.test.ts` | 最新一轮 rows 未换锚 | `TASK-V55F-129` |
| `V4.5-1 R3 growth: 终轮（Δ=0）…（Σ Δ 可核）` | `size-growth-evidence.test.ts` | Δ=0 终轮常量未前移 | `TASK-V55F-129` |
| `V5.5-3 红线终核 12 项`（红线③） | `supersession-ledger.test.ts` | `dist/sidepanel.js` ≠ 登记基线（三冻结面之一） | `TASK-V55F-129` + `TASK-V55F-125` |

> **为什么不在 R1 直接重登记**：`test/size-*.ts` 是 **v4 叶段受判文件**（8 个 `leafBases` 的 `scope.files` 均含 `size-baseline.ts` / `size-budget.test.ts` / `size-growth-evidence.test.ts` / `size-ruling-vol3.test.ts`），修改它们会产生**未登记删除行**（`ledger(V4 段)` 判据），必须先落 `modifiedRanges[]`（`TASK-V55F-125`，W4）。故 125 + 129 **同轮**在 R2 完成。**R1 已把「修改即触发未登记删除」的两处（`test/l1-ref-validity.test.ts` / `test/ui/l1.mjs`）改为纯追加**，`ledger(V4 段)` 两判据已回绿（见 §4）。

---

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

---

## 8. 下一步

| 场景 | 操作 |
|------|------|
| 本叶继续（R2） | `@sddu-build` 续做 **W3**（`TASK-V55F-116~121`：`--ref` 解析链 + 失配 EC + `dom-ref-anchor` 门禁）与 **W4**（`122~129`：S0′ 双面 + **X 台账 `modifiedRanges[]`（125）** + 门禁治理（128）+ **体积逐叶重登记（129，闭环本轮 7 项红）**） |
| 全部任务完成后 | 运行 `@sddu-review specs-tree-v55f-1-ref-context-and-anchor` 开始审查 |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（**R1 = W1+W2**，`TASK-V55F-101~115`）：SG-SGO-01 可行（9/9）+ SG-SGO-03 可机核（3/3）；`chat` type-only refs 载荷 + 回合发起快照 + SW 系统段基座/追加段 + 法九读数单源 + confirm 面越界拦 + 留痕单源；2 枚新 node 门禁（`ref-context-in-turn` 9 / `law9-scope-reading` 12）；X-SGO-5 等价重锚（`l1` 131 / `page-input` 125 只增）；`npm test` 1330 → 1352（1345 pass / 7 fail，7 红全部为体积收口 + X 台账家族，留 R2）；A 列 +7,109 B（预算内，重登记留 R2）/ B 列 +3,044 B（不计账）；红线四面逐项绿 | 2026-09-24 | SDDU Build Agent |
