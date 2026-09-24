# ADR-IAN-004: `#composer` 废弃执行序（停引 → 删面）与写者消解

## 状态
ACCEPTED（承父 spec §5.5 ABOL FR-IAN-040~049 / DC-IAN-003 / §14.2 叶2 执行序 ①~⑤）

## 背景

`#composer`（`<form id="composer" hidden><input id="input"><button id="send" type="submit">`，`index.html:1419-1422`）是**唯一**「自由文本 → 发起回合」的流外面，其显隐「与历史相关而非与状态相关」：

| 缺陷 | 事实 | 位置 |
|---|---|---|
| **D-A 双写者** | 护栏 `syncComposerVisibility()`（`composer.hidden = !(fallbackOpen && chatVisible)`）vs 无条件直写 `l0.revealFallback/hideFallback`（`composer.hidden = false/true`），不经护栏 | `sidepanel.ts:2884-2891` / `l0/shell.ts:90-105` |
| **D-B 锁存无生产复位** | `let fallbackOpen = false`；置真 = `revealAskFallback()`；**唯一复位 = 测试钩子** `hideFallback()`；生产路径（`render()` / `openL2View` / 视图切换）均不复位 | `sidepanel.ts:2883,2893-2898,854-858` |
| **D-C 设置态漏隐藏** | `openL2View('settings')` 提前 return 不调护栏；`body.settings-open` CSS 只隐藏三区，不含 `#composer` | `sidepanel.ts:3607-3616` / `index.html:670-672` |
| 附带 writer | `revealAskFallback → l0?.revealFallback()` **无条件** reveal `#composer`（四处兜底入口的次级通道） | `sidepanel.ts:2893-2895` |
| 陈留注释 | `sidepanel.ts:1107-1108` / `l0/shell.ts:96-99` / `stream-render.ts:66-71` / `index.html:1414-1418` | 逐条 |

## 决策

**① 执行序（叶2 内，**先停引、再删面**，逐步可判）。**

| 序 | 步 | 落地 | 判据 |
|:-:|---|---|---|
| 1 | **停引**（先于删面） | 删 `l0/shell.ts` `revealFallback/hideFallback` 内的 `composer.hidden = false/true` 写入；保留 `revealAskFallback()` **仍调用** `l0?.revealFallback()`（该调用从此只做 `setAskFallbackOpen`）⇒ 「调用保留、流外写入删除」（PD-IAN-007 裁决：**保留调用**，让 shell 只操作卡内 ⇒ 唯一载体成立，且调用链零流外面） | `l0/shell.ts` 无 `composer` 写入；四处入口展开的是卡内输入；反证「重新级联 ⇒ 双输入面 ⇒ 必红」 |
| 2 | **DOM / CSS 退役** | `index.html` 删 `<form id=composer>…</form>`（含 `#input`/`#send`）+ 6 条 CSS（`#composer` `:577` / `#input` `:578-587` / `#input::placeholder` / `#input:disabled` / `#send` `:591-598` / `#send:hover`）+ 出流注释 `:1414-1418`；`body.settings-open` 三区 CSS `:670-672` **逐字不变** | 三 id 零命中（真退役，非 `hidden`）；无死 CSS；`:670-672` 逐字 diff=0 |
| 3 | **写者消解** | 删 `syncComposerVisibility()` 及两调用点（`render()` `:2245` / `openL2View` 非 settings `:3616`）；删 `let fallbackOpen`（`:2883`）及全部读写（`:2896` / `:856`）；删 `($('send') as HTMLButtonElement).disabled = buttons.sendDisabled`（`:2270`）；`:3607-3613` settings 提前 return 无需护栏（面不存在）；其余陈留注释同步（`sidepanel.ts:1107-1108` / `stream-render.ts:66-71`） | 标识符 / 函数零命中；`#send` writer 零命中；注释无「保留 `#composer`」类 |
| 4 | **登记退役** | `disclosure.ts#NEVER_FOLDABLE` 删 `'composer'`（14 → **13**，`:69/:144-148/:150-166` 注释算术订正）；`host-registry.ts:144-146` PRESERVED 注释移除三项；`RETIRED_CONTAINER_IDS` **追加三项**（13 → **16**，ADR-IAN-005 §③）；`RETIRED_HOST_ATTRS` 的宿主值 `'composer'` **逐字保留不动**（`data-host` 值 ≠ 容器 id） | `NEVER_FOLDABLE` 不含 `'composer'`；容器册长度 = 16；宿主值列表仍 4 项逐字 |
| 5 | **重锚** | `#send-reason` 保留 + 判据重锚；`sendDisabled` 重锚到流内面；draft 重锚；引导文案改指（ADR-IAN-005） | 逐条 old→new（ADR-IAN-005 表） |
| 6 | **通道唯一化** | `requestTurn(` 恰 1；R6 入口 / 回填载体唯一化；TA-4 重锚 | ADR-IAN-003 |
| 7 | **立法** | 法四三处原地修订 + 台账 + 法四门禁 | ADR-IAN-006 |
| 8 | **门禁 / 保护段 / S0'' / 体积** | 18 门禁三态 + journey 八步取代 + binding keep + S0''-B + 净负重登记 | ADR-IAN-007/008/009/010 |

**② 三缺陷「一并消解」而非「修缺陷保面」**：面移除后 D-A（无第二 writer）、D-B（无锁存）、D-C（无面可漏隐藏）**结构性不复存在**——本裁决**不**为它们保留任何独立快修路径（NG-IAN-001）。

**③ 测试钩子处置（FR-IAN-045）**：`__v3.testing.revealFallback/hideFallback`（`sidepanel.ts:851-858`）**重锚为只操作卡内**（`revealFallback()` → `revealAskFallback()`；`hideFallback()` → `l0?.hideFallback()`（只 `setAskFallbackOpen(false)`）），**不自持锁存**（删 `fallbackOpen = false; syncComposerVisibility();` 两行）⇒ 无死写点 / 空转钩子；钩子仍驱动卡内展开/收起（可判）。

**④ `settings` 路径**：`:3607-3613` 的提前 return **保留原结构**（不新增调用）；因面不存在，无需护栏。**不得**借机改动三区语义（`:670-672` 逐字）。

## 后果

- 正面：删除面 > 新增收敛接线 ⇒ 体积**净负**（ADR-IAN-010）；显隐可判性从「依赖历史」变为「面不存在」。
- 风险 / 缓解：
  - 「真退役被实现成 `hidden` / `display:none` / 迟挂载」（R-IAN-902）⇒ 法四门禁 `DOM 零命中` + 注入 `#composer` 必红（ADR-IAN-008）；
  - `#send` 元素消失导致 `:2270` writer 与 `view-model.buttonStates.sendDisabled` 脱钩 ⇒ 保留 `buttonStates.sendDisabled` 语义（仅异常态）但**不再有 `#send` 写点**；`#send-reason` 仍读同一 `sendDisabledReason`（ADR-IAN-005）。

## 影响文件（预估）

| 操作 | 文件 | 说明 |
|:--:|---|---|
| MODIFY | `src/ui/sidepanel/index.html` | 删 form/input/button + 6 条 CSS + 出流注释；三区 CSS 不动 |
| MODIFY | `src/ui/sidepanel/sidepanel.ts` | 删 `syncComposerVisibility`/`fallbackOpen`/`#send` writer；钩子重锚；注释同步 |
| MODIFY | `src/ui/sidepanel/l0/shell.ts` | `revealFallback/hideFallback` 只操作卡内 |
| MODIFY | `src/ui/sidepanel/disclosure.ts` | `NEVER_FOLDABLE` 14 → 13 + 注释算术 |
| MODIFY | `src/ui/sidepanel/host-registry.ts` | PRESERVED 去三项 + `RETIRED_CONTAINER_IDS` 13 → 16 + dispositions |
| MODIFY | `src/ui/sidepanel/stream-render.ts` | 陈留注释同步 |
