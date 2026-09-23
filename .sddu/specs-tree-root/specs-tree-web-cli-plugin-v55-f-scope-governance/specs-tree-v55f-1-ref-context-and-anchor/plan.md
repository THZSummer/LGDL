# 技术计划：specs-tree-v55f-1-ref-context-and-anchor（V5.5F-1 范围底座：引用事实进回合 + 范围读数 + ref 锚定）

> **文档定位**: SDDU 技术方案（**叶级切片 / 首叶**）— 父 `../plan.md`（v1.0）与本目录 `../ADR-SGO-001~008-*.md` 在**本叶**的适用范围与承载条文；作为本叶 tasks 阶段的输入
> **前置依赖**: 父 `../spec.md`（v1.0）+ `../discovery.md`（v1.0）+ 本目录 `spec.md`（v1.0）+ 上游 v5.5 三叶 `validated` + R6 `74d76c1`（只读复用）
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-24
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-24
> **更新说明**: 初始创建（V5.5F-1 范围底座叶 plan：引用事实进回合（`chat` type-only `refs`）+ 系统段基座/追加段 + **范围读数单源（法九）** + `--ref` 锚定（仅写命令）+ 失配 fail-closed + 留痕扩字段 + **S0′ 双面样板** + 门禁治理 + 体积逐叶重登记）

---

## 1. 前置检查

| 检查项 | 状态 | 证据 |
|--------|:--:|------|
| 本叶 `spec.md` 存在 | ✅ | `spec.md`（262 行，v1.0，2026-09-23，`phase=specified`） |
| 父 `spec.md` / `plan.md` | ✅ | `../spec.md`（931 行，v1.0）+ `../plan.md`（v1.0，本批同产） |
| 上游依赖已满足 | ✅ | v5.5 三叶 `validated`（驱动者层 / 悬置单源 / 法七扩展 / 三档清分 / 12 kind / 零宿主）；R6 `74d76c1`（`reobserveAfterWrite` / `observeIdentity` 可复用；产物零改写） |
| 叶1 依赖 | ✅ | `dependsOn: []`（底座叶，无前序叶） |
| 承载父 FR 切片 | ✅ | **≈62 条**（GOV 001~006 / REFCTX 010~019 / SCOPE 020~028 / ANCHOR 030~038 / LAW9 070~077 / TRACE 080·083·084 / S0′ 090·091·092·094 / SUPERSEDE 100·101·102·104·106 / GATE 110~116 / VOL 120~125） |
| 分支 / HEAD | ✅ | `feature/web-cli-plugin` / `bb82bc6`（F-34 spec 产物之上） |
| 写入范围 | ✅ | 仅 SDDU 本 Feature 目录（本叶 `plan.md`）；**零 `src`/`test`/`dist`/`docs`/`design` 改动** |

## 2. 本叶架构分析

### 2.1 本叶要交付的四条底座

```
① 引用事实进回合：requestTurn（唯一构建点）→ chat{user, refs?}（type-only）→ runChat(s,user,refs)
   → system = SYSTEM_PROMPT（基座，逐字）+ refContextSegment（追加段：引用事实 + 法则引导）
② 范围读数单源（法九）：l1/ref-scope.ts —— SCOPE_READINGS（4 值）+ scopeReading(facts)（唯一判定）
   + 判定输入两路（--ref 命中 / selector 命中）vs 活跃引用集合；越界写在 confirm 面 fail-closed 拦
③ --ref 锚定：wrapDomEntryForAnchor（plugin 侧包装，base 零 diff）→ --ref n → [data-wcli-ref="ref_n"]
   → live 单节点闸（observeIdentity 单一实现；nodeCount === 1）→ 基线 executor；失配四类非静默
④ S0′ 双面样板：ty.md 原案重放（node + Chromium 双面，样本单源）+ 双向反证（去注入 ⇒ no-ref 必红）
```

### 2.2 数据流（本叶）

| 面 | 变更方向 | 关键契约 | ADR |
|---|---|---|---|
| 回合载荷 | `{user}` → `{user, refs?}`（type-only） | 唯一构建点 = `requestTurn`（`sidepanel.ts:304`）；`requestTurn(` 仍恰 2 | SGO-001 |
| 引用快照 | ref-store → 回合载荷（回合发起时快照） | `turnRefsOf(records)`（`ref-scope.ts` 单源）；只取 `verdict === 'valid'` ∧ `!retired`；凭据形 `textDigest` 掩码；SW 引用唯一来源 = 回合载荷 | SGO-001 |
| 系统段 | 静态常量 → 基座 + 追加段 | `SYSTEM_PROMPT` 逐字保留；无引用 ⇒ 追加段 = `''` | SGO-001 |
| 范围读数 | 新增 | `SCOPE_READINGS` / `scopeReading` 恰一处；`no-ref` ≠ `in-scope` | SGO-002 |
| 越界写 | 无判据 → confirm 面拦截 | `out-of-scope-unauthorized` ⇒ fail-closed（deny + 可达 next）；判定链零触碰 | SGO-002 |
| 工具面 | base 零 ref → plugin 侧包装 | `--ref` 仅 `set-text`；`risk` 不放宽；base 零 diff | SGO-003 |
| 留痕 | 三要素 → 三要素 + 范围字段名 | `SCOPE_TRACE_FIELDS` + `scopeReadingTrace`（机器枚举，零用户内容值） | SGO-002 |
| 门禁 | 新增法九 + 载荷 + 锚定 + S0′ node 面 | node 下界只增；`CHROMIUM_GATES === 9` 不动 | SGO-006 |

### 2.3 执行序（供 tasks 参考，**不是需求**）

> 承叶 spec §8.4「**先定读数再定法则**」（DC-SGO-007）；先落**边界**（失配 / 零引用）再落正向路径。

| 波 | 范围 | 任务（估） |
|:-:|---|:--:|
| **W1** | 口径与载荷（FR-SGO-010~014）+ SW 组装（015~017）+ 留痕（080/083/084） | ~8 |
| **W2** | 读数单源（021/024）+ 法九门禁（070~077）+ 越界拦（025~027） | ~9 |
| **W3** | `--ref` 包装（030~036）+ 失配 EC（001~003/015~017）+ 失效可判（038） | ~7 |
| **W4** | S0′ 双面（090~092/094）+ X 台账（100/101/102/104/106/107）+ 门禁治理（110~116）+ 体积重登记（120~125） | ~6 |

### 2.4 X-SGO 逐条处置（本叶）

| X | 处置 | 落地 | 状态 |
|---|---|---|---|
| **X-SGO-1** | 允许回合携带引用上下文（type-only；两入口同口径） | `test/op-wiring.test.ts`（原判据不改）+ `test/ref-context-in-turn.test.ts` | **已发生** |
| **X-SGO-2** | 常量基座 + 每回合追加段；新增判据（不读提示词） | `test/law9-scope-reading.test.ts` + `test/ref-context-in-turn.test.ts` | **已发生** |
| **X-SGO-3** | plugin 侧包装；base 零 diff 不解冻；risk 不放宽 | `test/dom-ref-anchor.test.ts` + `insight-no-escalation` | **已发生** |
| **X-SGO-5** | 增设「作为范围锚」的解析读数；deny 方向不动 | `test/ui/l1.mjs` / `page-input.mjs`（只增）+ 新读数双向反证 | **已发生** |
| **X-SGO-7** | 主流程调用点走既有槽扩张（diff = 0） | `test/op-wiring.test.ts` + 计数复合读数 | **未发生取代**（如实登记 ✅） |

> 台账条目与判据重锚**同轮完成**（FR-SGO-107 / 112），不得拆到「下一轮补」。

### 2.5 红线继承（本叶主责）

N-SGO-001~004（冻结面 / 体积三值）· N-SGO-007/008（base 零 diff / 判定链零触碰）· N-SGO-009/010（`KIND_SET` 40 / 12 kind / 零宿主）· N-SGO-011（法八四面）· N-SGO-014（调用点计数）· N-SGO-015（断言只增）· N-SGO-016（保护 pin）· N-SGO-017（串行 / `CHROMIUM_GATES === 9`）· N-SGO-024/028/029（法九禁恒真 / 读数唯一声明 / 无引用零漂移）· N-SGO-027（`--ref` 不得进 base）· N-SGO-030（升档须作者一行）。逐条承载见父 `plan.md §2.6`。

## 3. 方案对比（本叶关键取舍）

| 维度 | **方案 A：既有面内扩张 + 读数单源 + plugin 包装（推荐）** | 方案 B：新增「范围层」+ 第三载荷通道 | 方案 C：只改提示词 |
|---|---|---|---|
| 描述 | refs 走既有 `chat` type-only 字段；读数落 `ref-scope.ts`；`--ref` 走 plugin 侧包装；越界写走 confirm 面拦 | 新增通道 / kind 承载引用；范围判定独立调度 | 只把法则写进 `SYSTEM_PROMPT` |
| 优点 | `KIND_SET` 40 不动 / base 零 diff / 主流程 diff = 0 可机核 | 概念边界直观 | 改动最小 |
| 缺点 | 工作量集中在判据（4 门禁 + 台账） | 撞 `content.js` 零容差 / 12 kind | 零机核；`--ref` / 读数缺失 |
| 风险 | R-SGO-002/003/004（逐条有承载） | R-SGO-007（载体被撞） | 主题未交付 |
| 工作量 | 4 波 / ~30 任务 | 越界（新载体需新门禁） | ~3 波（不达标） |

## 4. 推荐方案

**推荐：方案 A**。理由：唯一能同时满足「`KIND_SET` 40 不动 / base 零 diff / 主流程 diff = 0 / 法九可机核」的形态；读数单源 + 载荷 type-only + plugin 包装三者共同把「引用即范围」变成**静态可判事实**（承父 `plan.md §4`）。

## 5. 本叶文件影响分析

> 操作含义：**NEW** 新增 / **MODIFY** 修改 / **NOOP** 显式零改动。共 **≈21 项**（src 10 / test 10 / docs 1）。

### 5.1 `src/**`（本叶 10 项；列标 A=计账 / B=不计账）

| 操作 | 文件路径 | 说明 | 列 |
|:--:|---|---|:--:|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l1/ref-scope.ts` | 范围读数单源（4 值 + `scopeReading` + `ScopeFacts` 形状 + `turnRefsOf` 快照投影 + `SCOPE_TRACE_FIELDS` / `scopeReadingTrace`） | A |
| MODIFY | `.../l1/ref-store.ts` | 只读取用（活跃有效引用访问器；判定语义零改） | A |
| MODIFY | `.../ui/sidepanel/sidepanel.ts` | `requestTurn` 唯一载荷构建点；confirm 处范围闸（越界拦 + 可达 next）；范围留痕行 | A |
| MODIFY | `.../background/messaging.ts` | **type-only** `ChatRefFact` / `ChatRefTurnPayload`（`KIND_SET` 40 不动） | B |
| NEW | `.../background/ref-context.ts` | 系统段追加段组装 + 回合载荷运行时校验 | B |
| NEW | `.../background/ref-turn.ts` | 当前回合活跃引用单源（refs / tabId / observe 缝；每回合 set / clear） | B |
| NEW | `.../background/ref-observe.ts` | `observeIdentity` 单一实现（service-worker 与 tools 共用） | B |
| MODIFY | `.../background/service-worker.ts` | `case 'chat'` 读 refs；`runChat(s,user,refs)`；系统段工厂；ref-turn set/clear | B |
| MODIFY | `.../background/turn-queue.ts` | `QueuedTurn.refs` | B |
| NEW | `.../src/tools/dom-anchor.ts` | `wrapDomEntryForAnchor`（覆写 schema + 替换 executor；解析后交基线 executor） | B |
| MODIFY | `.../src/tools/browser-tools.ts` | `dom` 条目接线包装层（base 零 diff） | B |
| **NOOP** | `packages/web-cli-base/**` / `src/content/**` / `manifest.json` | 零 diff（显式登记） | — |

### 5.2 `test/**`（本叶 10 项）

| 操作 | 文件路径 | 说明 |
|:--:|---|---|
| NEW | `test/law9-scope-reading.test.ts` | 法九门禁（node）：四必判项 + 双向反证 + 三段控制 + 真源切片 |
| NEW | `test/ref-context-in-turn.test.ts` | 载荷 type-only / 两入口同构建点 / `KIND_SET` 40 / 系统段基座逐字 / 零引用零漂移 / 凭据掩码 |
| NEW | `test/dom-ref-anchor.test.ts` | `--ref` 词法 / 互斥 / 序号越界 / 单节点闸 / 失配 EC 族 / `risk` 不放宽注入 |
| MODIFY | `test/s0-self-driven-chain.test.ts` | S0′ 逐环节（node 面）+ 双向反证 |
| MODIFY | `test/ui/fixtures/s0-chain.mjs` | S0′ 样本扩展（node + Chromium 共用同一份） |
| MODIFY | `test/ui/s0-self-driven.mjs` | S0′ Chromium 面（**只加断言不加文件**） |
| MODIFY | `test/gate-integrity.test.ts` | node 门禁下界只增（`law9-scope-reading`）；`CHROMIUM_GATES === 9` 不动 |
| MODIFY | `test/op-wiring.test.ts` | 原判据不改（`requestTurn` 恰 2）+ 复合读数（`maybeRecommend` 1/7 · `nextAfterSettle` 1/10） |
| MODIFY | `test/supersession-ledger.test.ts` | X-SGO-1/2/3/5 条目（已发生）+ X-SGO-7（未发生） |
| MODIFY | `test/ui/l1.mjs` / `test/ui/page-input.mjs` / `test/l1-ref-validity.test.ts` | X-SGO-5 等价重锚（读数双向反证；deny 方向逐字不动） |

### 5.3 `docs/**` 与 SDDU（本叶）

| 操作 | 文件路径 | 说明 |
|:--:|---|---|
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` | `modifiedRanges[]`（X-SGO-1/2/3/5）+ **X-SGO-7 未发生取代显式登记** + `protectedRanges[]` 保段 |
| MODIFY | `test/size-baseline.ts` | 本叶收口实测重登记（五要素 + V3-VOL-3 三值 + metafile 归因；时间线只追加） |
| MODIFY | `../state.json` + `state.json`（本叶） | phase → `planned`；phaseHistory 追加 |
| MODIFY | `../TREE.md` + 本叶 `TREE.md` | 由 `sddu-tree` 定向更新 |

## 6. 本叶风险评估

| # | 风险 | 等级 | 缓解（⇒ ADR） |
|---|---|:--:|---|
| R-SGO-002 | 范围漂移不可判 + 恒真断言 | 高 | 先定读数（W2）再定法则；四必判项各带反证（SGO-002） |
| R-SGO-003 | base 零 diff 被撞 | 高 | plugin 侧包装；`insight-no-escalation` 必绿（SGO-003） |
| R-SGO-004 | 失配静默 ⇒ 写错节点 | 高 | 单节点闸 + 四类非静默（SGO-003） |
| R-SGO-006 | 体积越档 | 中高 | A 列 6.0~9.0 KB；本叶先测先登记（SGO-007） |
| R-SGO-008 | 载荷扩张引发门禁重锚 | 中高 | 唯一构建点 + 调用点计数不变（SGO-001） |
| R-SGO-901 | 读数与引用判定双源漂移 | 中高 | 读数只消费 `verdict`，不重判（SGO-002） |
| R-SGO-902 | type-only 被实现成新 kind | 高 | `KIND_SET` 长度 + `content.js` sha（SGO-001） |
| R-SGO-903 | 读数恒真 | 中高 | 三段控制 + 四必判项（SGO-002） |
| R-SGO-904 | 包装层放宽 risk | 高 | 逐字段对照 base + 降档注入必红（SGO-003） |
| R-SGO-908 | 无引用回合漂移 | 中高 | 逐字 baseline（SGO-001） |
| R-SGO-909 | S0′ 脚本绿而非链路可判 | 中高 | 真源切片 + 双向反证（SGO-006） |
| R-SGO-910 | 体积评估被跳过 | 中高 | 先预算后落地 + 逐叶重登记（SGO-007） |
| R-SGO-911 | 范围闸落错面（撞 `zeroDiffFiles`） | 高 | 拦截只在 confirm 面（SGO-002 §4） |
| R-SGO-912 | refs 被实现为中途再读取 / 第二通道 | 中高 | 唯一构建点 + SW 唯一来源 = 回合载荷（SGO-001 §3） |
| R-SGO-913 | live 单节点闸被误读为每回合重观测 | 中 | 口径显式区分（SGO-003 §5） |
| R-SGO-917 | 留痕「零值」口径与「扩围可读」矛盾 | 中 | caliber 显式登记（SGO-002 §5） |
| R-SGO-919 | S0′ Chromium 面新增门禁文件 | 中 | 只加断言不加文件（SGO-006 §3） |

## 7. 本叶 ADR 引用

| ADR | 标题 | 本叶承责范围 |
|---|---|---|
| ADR-SGO-001 | 引用事实进回合 | 全（§1~§9） |
| ADR-SGO-002 | 范围读数单源（法九）+ 判定输入 + 门禁 | 全（§1~§7；§4 越界拦为本叶交付，二择卡叶2） |
| ADR-SGO-003 | `--ref` 锚定解析链 | 全（§1~§9） |
| ADR-SGO-006 | S0′ 双面机器化 | §1~§7（批量分支 S0P-7/8 叶2 增） |
| ADR-SGO-007 | 体积分列预算 | 本叶 A 列 6.0~9.0 KB + 收口实测重登记 |
| ADR-SGO-008 | PD-SGO-001~007 裁决 | PD-001/002/003/004 在本叶落点 |

## 8. 本叶体积预算

| 项 | 预算 | 上界（+15%） | 对照依据 |
|---|--:|--:|---|
| A 列（`sidepanel.js` 净增） | **6.0~9.0 KB** | 6.9~10.35 KB | R6 快修轮（6 文件）+5,199 B；本叶 1 新模块 + 4 改动 |
| B 列（`background.js`，不计账） | 5.0~8.0 KB | — | 系统段 / `--ref` / 载荷校验落 SW |

> 本叶收口**即测即登记**（父 FR-SGO-125）：五要素 + V3-VOL-3 三值同源前移 + metafile 逐模块归因；`authorConfirmation` 保持 `pending-author-line`（不伪称已确认）。

## 9. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V5.5F-1 范围底座叶 plan）：承载父 FR ≈62 条切片；交付 4 条底座（引用进回合 / 法九读数 / `--ref` 锚定 / S0′ 双面）；执行序 4 波（先读数后法则 / 先边界后正向）；X-SGO 逐条处置（1/2/3/5 已发生；7 未发生）；文件影响 ≈21 项；风险 17 条；体积 A 列 6.0~9.0 KB | 2026-09-24 | SDDU Plan Agent |
