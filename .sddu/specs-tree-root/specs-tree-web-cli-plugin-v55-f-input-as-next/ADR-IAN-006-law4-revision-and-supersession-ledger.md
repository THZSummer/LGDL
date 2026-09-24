# ADR-IAN-006: 法四原地修订 + supersession 台账 old→new + X-IAN-1~11 逐条处置

## 状态
ACCEPTED（承父 spec §5.7 LAW4 / §5.9 SUPERSEDE / §12 映射 / DC-IAN-007 / O-IAN-007 / N-IAN-005·006）

## 背景

法四（旧）只禁「常驻输入框」，**默许**「流外按需输入框」——这正是本 Feature 要加严的那一处。O-IAN-007 裁决 = **原地修订**（`v4-chat/spec.md` 三处），**不升格法十**；**必须** old→new 逐字入 supersession 台账（唯一授权例外，不是静默改写）。

**三处落点（实测）**：`.sddu/specs-tree-root/specs-tree-web-cli-plugin-v4-chat/spec.md:116`（法则表）/ `:225`（FR-CHAT-014）/ `:385`（AC-CHAT-007）。

**old（逐字，父 spec §5.7 / FR-IAN-060）**：
> **输入按需出现**：无常驻输入框（沿用 E 的「页面即输入」主线）；`ask-user` text 型输入框只在问题卡内出现，卡内还有「其他…（我来描述）」兜底

**new（逐字）**：
> **输入即 next**：自由文本输入是流内 next 的一个选项；**流外零输入面**

## 决策

**① 修订执行序（叶2，与实现同轮完成，不得拆轮——§16 第 11 条）。**

| 序 | 步 | 判据 |
|:-:|---|---|
| 1 | 读三处原文**逐字**（`git show <leaf1-head>:…`）+ 记录落点行号 | 三处 old 逐字与 §5.7 一致 |
| 2 | 三处**同轮**改为 new 口径（措辞可因体例微调，**语义逐字等价**） | 三处一致；**半修即红** |
| 3 | 台账新增条目：`{ old 逐字, new 逐字, 理由, 日期, 落点 file:line }`（落 `docs/v4-supersession-ledger.json`，新增 `xIanLedger` 段） | 台账条目存在 + 一致性门禁绿 |
| 4 | `redlineRemap[]` **追加**一条（`composer 贴底/出流 → 流外零输入面`）；老 6 条（含「composer 贴底」两条）**逐字保留** | 老条目逐字保留；`redlineRemap.length` 6 → 7（`≥3` 断言不动，另加「X-IAN-1 条目存在」判据） |
| 5 | 新法四机核门禁 `test/law4-input-as-next.test.ts` 读**生产真源** | 双向反证 + 注入必红 + 三段控制 + 真源切片（ADR-IAN-008） |
| 6 | 判据重锚清单逐条落地（l0 ③⑪ / journey #15c / insight #I-08b / binding :69 / density / sidepanel-view） | ADR-IAN-008 18 行表逐条 old→new |

**② X-IAN-1~11 逐条处置（**取代 / 等价重锚 / 未发生**，与实现同轮）。**

| X | 现状（逐字要点） | 处置 | 落点（门禁 / 文件） | 叶 | 状态 |
|---|---|---|---|---|---|
| **X-IAN-1** | 法四「输入按需出现」（`:116,:225,:385`） | **原地修订 + old→new 台账**（§①②） | `v4-chat/spec.md` 三处 + `supersession-ledger.json#xIanLedger` + 新法四门禁 | 2 | **已发生** |
| **X-IAN-2** | `#composer`/`#input`/`#send` 为**保留（兼容读取面）**（`host-registry.ts:144-146`；`density-thresholds:115-116`） | **入退役面**（DOM 真退役）；PRESERVED 注释移除三项 | `host-registry.ts` + `density-thresholds` 等价重锚 | 2 | **已发生** |
| **X-IAN-3** | 「`#composer` **不得**入 `RETIRED_CONTAINER_IDS`」反证（`density-thresholds:775`） | **重锚为「必须入册」**（`#composer`/`#input`/`#send` 三项；13 → 16）；**非恒真**（注入回 DOM ⇒ 零宿主判据红） | `density-thresholds:775` / `host-registry:262` | 2 | **已发生** |
| **X-IAN-4** | `<form id=composer hidden>` + body 尾 + 「之后无布局元素」+「三 id 不在 `#stream`」（`density-thresholds:389-409,776` / `sidepanel-view:657-659` / `journey` #15c / `l0` ③⑪ / `insight` #I-08b / `binding:69`） | **等价重锚**为「三 id 均不在 DOM ∧ 流内输入卡存在可用」 | 六面逐条 old→new（ADR-IAN-008） | 2 | **已发生** |
| **X-IAN-5** | `#I-08`（`#composer` 贴底 ∈[0,+8px]）/ `#I-09`（`#tree-fab` ∩ `#composer` = 0）（`insight.mjs:18-19,358-382,461-471,655`） | **消解**（元素不存在 ⇒ 几何读面无对象）**且显式登记**（非删断言）；新增「流内输入卡几何可判」等价判据 | `insight.mjs` 逐条重锚 + 台账 | 2 | **已发生** |
| **X-IAN-6** | `requestTurn(` **恰 2**（`op-wiring:127-134,361`） | **重锚为恰 1**（唯一生产输入提交点 = `op.turn` 槽）+ 反证 | `op-wiring.test.ts` `OP_CALLSITE_SET.op.turn.callSites 2→1` | 2 | **已发生**（叶1 仍 2；叶2 落地恰 1） |
| **X-IAN-7** | `busy-rejected` 回填 `#input`（`turn-arbitration:49,60` / `sidepanel.ts:3984-3991`） | **重锚到流内输入**（语义不变：不丢原话 / 不覆盖 / 有可读行）+ 卡收起 ⇒ 重展开 | `turn-arbitration` TA-4（**删回填仍必红**） | 1 支持 / 2 唯一化 | **已发生** |
| **X-IAN-8** | draft `#input`（`sidepanel.ts:1337-1341` / `settings.test.ts:191`） | **重锚到流内输入载体**（PD-IAN-006 裁决；二择留台账） | `settings.test.ts:191` 等价重锚 | 2 | **已发生** |
| **X-IAN-9** | `NEVER_FOLDABLE` 含 `'composer'`（`disclosure.ts:69,147,164`） | **退役**（元素不存在 ⇒ 无需永不折叠）；计数 14 → 13 + 算术注释订正 | `disclosure.ts` + `l0-disclosure.test.ts:211` | 2 | **已发生** |
| **X-IAN-10** | 首装引导「在**输入框**输入指令并发送」（`view-model.ts:350`） | **改指**流内 next「自由输入…」 | `view-model.ts:350` + 断言重锚 | 2 | **已发生** |
| **X-IAN-11** | `binding.mjs` `DIAG_SELECTORS` 含 `composer` + 真实键入 `#input`/`#send`（`:115,905,1034-1096`） | **重锚**诊断面到流内输入；真实键入路径等价（不删路径）；**保护段 keep 字节中立**（相关读面全在段前 <107780） | `binding.mjs` + 保段判据 | 2 | **已发生** |

> **未发生取代**：本轮评估后**无** X 项可判「未发生」——1~11 均有可定位的现状判据与可落地的等价重锚。台账仍须逐条给状态列（`superseded` / `no-supersession`），**不得留空 / 不得伪造**（FR-IAN-091）。若某条在 build 实测中被证「天然仍成立」⇒ 当轮改为 `no-supersession` 并写明理由。

**③ 反「静默改写」纪律**：三处修订 diff 必须**逐行**入台账（old 行 / new 行 / 落点 file:line）；`redlineRemap ≥3` 老条目逐字保留（`supersession-ledger.test.ts:1452` 继续承重）；**不得**用「放宽阈值 / 删除断言 / 静默改常量」替代等价重锚。

## 后果

- 正面：法条与实现一致（「流外零输入面」可机核）；历史可追溯（old→new + 台账）；法则清单不断裂（法四仍是法四）。
- 代价：`v4-chat/spec.md` 成为本 Feature **唯一**授权的上游改写面（D7 / N-IAN-005 例外），须严格逐字 + 台账；`supersession-ledger.test.ts` 与 `insight-tree-hierarchy.test.ts` 需新增 X-IAN-1 一致性判据。
- 反证族：三处只改一处（半修）⇒ 必红；台账缺 old/new ⇒ 一致性门禁红；老 `redlineRemap` 被改写 ⇒ 必红；法四门禁恒真（注入 `#composer` 不红）⇒ 必红（ADR-IAN-008）。

## 影响文件（预估）

| 操作 | 文件 | 说明 |
|:--:|---|---|
| MODIFY | `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v4-chat/spec.md`（`:116` / `:225` / `:385`） | **唯一授权例外**：法四三处原地修订（v4 上游产物，D7 / N-IAN-005 例外） |
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` | `xIanLedger` 段（X-IAN-1~11 逐条）+ `redlineRemap[]` 追加 + journey 新 pin / binding keep |
| MODIFY | `test/supersession-ledger.test.ts` | X-IAN-1 一致性 + 老 remap 保留 + journey 八步记录判据 |
| MODIFY | `test/insight-tree-hierarchy.test.ts` | 取代纪律先例引用（保留）+ 本轮 journey 取代登记 |
