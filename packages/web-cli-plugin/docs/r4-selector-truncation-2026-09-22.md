# R4 缺陷修复轮 —— 引用「出生即失效」：选择器截断根修 + 诊断分离 + 捕获回环校验止血

- **Feature**：`specs-tree-web-cli-plugin-v3-ui`（收口后缺陷修复轮，与 R1/R2/R3 同一登记口径）
- **日期**：2026-09-22
- **HEAD（leafBase）**：`953a2ed`
- **分支**：`feature/web-cli-plugin`
- **作者裁决**：根修 + 止血，**含解冻 `dist/pick-layer.js`**

---

## 1. 缺陷（诊断结论）

| # | 事实 | 位置 |
|---|------|------|
| D-A | 存储 / 查询用选择器被**截断成非法 CSS**：`joined.slice(0, 120) + '…'`（真机选择器实测 **121** 字） | `src/content/ref-capture.ts#selectorFor:238-239`（修前） |
| D-B | CSS 解析器**抛错**与「0 命中」被同吞为 `{status:'missing'}` | `src/content/ref-capture.ts#resolveRef:337-341`（修前） |
| D-C | 判定链据 `missing` 报 **D1 `dom-gone`**（「目标元素已不存在」）⇒ **引用出生即死**（目标仍在页面上） | `src/ui/sidepanel/l1/ref-validity.ts#evaluateRefValidity` |
| D-D | SW 镜像同算法（`ref-rescue.ts#selectorFor:205-221`，`ref-rescue.test.ts:140` 钉字符 parity） | `src/background/ref-rescue.ts` |
| D-E | 夹具全用 `#id` 短路 ⇒ 门禁从未覆盖 >120 场景，且 `ref-capture.test.ts:101/131` 反把截断**钉成断言** | `test/ref-capture.test.ts` |

**根因**：截断把「展示层」的手段用在了「存储 / 查询层」的事实上；诊断把「捕获缺陷」与「元素不存在」折叠成同一个观测。

---

## 2. 修法

### 2.1 根修（① 选择器永不截断 / ② 诊断分离）

| 面 | 变更 | 文件 |
|----|------|------|
| 页面侧口径 | `selectorFor` **永不截断**；新增 `SELECTOR_STORE_MAX = 512`（超限回退 **compact** 链：丢 `tag.class` 类片段、保留每级 `:nth-of-type` 与 `#id`/`[data-*]` 锚点）；新增 `selectorForDisplay` 承载**展示层**截断（`SELECTOR_MAX = 120` 语义收窄为展示上限） | `src/content/ref-capture.ts` |
| 观测 | `resolveRef` 把 `invalid-selector`（解析器抛错）与 `missing`（0 命中）/`ambiguous`（>1）**分开返回** | `src/content/ref-capture.ts` |
| SW 镜像 | 同一算法等价副本（同字回环 + 同一 `SELECTOR_STORE_MAX`）；`observeIdentity` 同步分开 `invalid-selector` | `src/background/ref-rescue.ts` · `src/background/service-worker.ts` |
| 判定链 | 维度词表**只增**一条 `invalid-selector` + 独立文案；结论方向不变（仍 `invalid`，fail-closed 未放松）；救援挂载面扩到 D1 的两个面 | `src/ui/sidepanel/l1/ref-validity.ts` |
| 展示层 | `displaySelector` 单点（证据行 + 卡标签）；页面浮层标签改走 `selectorForDisplay` | `src/ui/sidepanel/l1/ref-store.ts` · `src/content/pick-overlay.ts` |

新文案（逐字，与 `dom-gone` **不同词**）：

```
dom-gone          ：引用 {n} 的目标元素已不存在（选择器解析失败或元素被替换）
invalid-selector  ：引用 {n} 的选择器语法非法（捕获缺陷，已自动修复/请重新拾取）
```

### 2.2 止血（③ 捕获回环校验）

`sidepanel.ts#acceptCapture`：捕获观测为 `missing` / `invalid-selector` 时

1. **只读**文本候选探测（与摘要同源归一化，SW 侧 `ref-rescue` 路由，同一产品发送方 = 面板）：
   - **唯一匹配** ⇒ 取 SW 现算的**完整**选择器，走**同一条**摄取管线（`pickInput.reanchor(..., { silent: true })`）重判 ⇒ 得到**可用**引用（重锚语义前移到捕获时）；
   - **仍失败** ⇒ **不铸造**出生即死的引用：写一行可读系统事件（唯一通道）+
     `maybeRecommend('pick', { force: true })`（引导 next，法七不破）。系统事件逐字：

```
捕获的选择器无法解析，已放弃该引用，请重新拾取或改用描述
```

### 2.3 展示层与存储层分离（回归面）

- 存储 / 查询值 = **完整合法选择器**（永不 `…`）；
- 展示值 = `selectorForDisplay` / `displaySelector`（120 口径，与修前渲染**逐字相同**）。

---

## 3. 验收证据

### 3.1 新夹具回环（>120 字出生即命中）

夹具：深链 + 哈希类名 + 混合标签 + **目标无 id**（`#app > section.hero-hash-…:nth-of-type(1) > …`，实测 **169** 字）。

- Node（`test/ref-capture.test.ts`，自带受限语法匹配器）：`selectorFor(el)` 无 `…` ∧ `querySelector` 命中**捕获元素本身**且**唯一命中**；
- Chromium（`test/ui/page-input.mjs` ⑰，真实 DOM）：

```
✔ R4 ①：真实 DOM 上 >120 字选择器不截断（无省略号 ∧ 长度 >120 ∧ 不抛错）
✔ R4 ①：回环断言 —— querySelector(selectorFor(el)) 命中捕获元素本身（唯一命中）
   payload: {"sel":"#r4-deep-host > section.css-a1b2c3d4e5f6a1b2c3d4e5f6-1:nth-of-type(1) > …",
             "len":221,"hit":true,"threw":false,"count":1,"ellipsis":false}
```

- `>512` 字场景（Node）：回退 compact 链 = `#root-anchor > p:nth-of-type(1) > i:nth-of-type(1) > b:nth-of-type(2)`（合法 ∧ 回环命中）。

### 3.2 诊断分离（非法选择器 ≠ 元素不存在）

- Node（`test/l1-ref-validity.test.ts`）：`{status:'invalid-selector'}` ⇒ `invalid` / 维度 `invalid-selector` / 文案逐字；与 `dom-gone` 文案**不相等**；
- Chromium（`test/ui/l1.mjs` ⑦ 维度循环新增 `invalid-selector` 行）：判定 + 风险位三通道 + 可读原因**逐字** + 卡内恢复区。

### 3.3 止血路径（页面即输入门禁 ⑰）

```
✔ R4 ②止血（missing + 文本唯一）：不铸造出生即死的引用 —— 引用被自动重锚 ⇒ 卡为 valid 且选择器换成完整值
✔ R4 ②止血：修复路径不产生失效行（旧行为 = 出生即死的 stale 卡 + 「已失效」行）
✔ R4 ③止血（missing + 无匹配）：拒铸 —— 零引用卡（出生即死的引用不再存在）
✔ R4 ③止血：拒绝也有出路 —— 可读系统事件逐字（唯一通道）+ 推荐生产者被真实咨询（非静默丢弃）
✔ R4 ④：invalid-selector 观测同样被捕获回环校验拦下（修复 ⇒ valid）
✔ R4 前置（负控）：无匹配文本 ⇒ 探针 candidates=0（不是空转）；唯一文本 ⇒ candidates=1 ∧ unique
✔ R4 前置（负控）：唯一候选给出 SW 现算的完整选择器（#host-btn，非截断值）
```

### 3.4 两段证伪（注入 → 必红 → 逐字节还原（sha256）→ 必绿）

日志目录 `/tmp/opencode/v4-gate-logs/r4-selector-fix/falsify/`。

**① 回退截断**（`selectorFor` 还原成 `slice(0,120)+'…'`；`pick-layer.js 34,358 → 34,242 B`）：

```
✖ R4 ①：>120 字的选择器不截断（无省略号）且回环命中捕获元素本身
✖ R4 ①：超过存储上限（>512 字）时回退 compact 链 —— 仍然合法 ∧ 仍然回环命中
✖ R4 ①（Chromium）：{"sel":"#r4-deep-host > …:nth-of-type(1…","len":121,"hit":null,"threw":true,"ellipsis":true}
            ⇒ ▶ v3-4 页面即输入门禁: 116 passed / 2 failed
还原：ref-capture.ts sha256 98c18484329e91719b620de141dca98633267c72a5a95f4677218ed1fb0b8caf（前后相同）
      ⇒ node 10/10 pass，页面即输入 118 passed / 0 failed
```

**② 回退诊断分离**（`resolveRef` 折回 `missing` + 判定分支短路）：

```
✖ R4 judge: invalid-selector 是独立维度与独立文案（与 dom-gone 不同词），且仍 fail-closed
✖ TASK-402 · resolveRef 只报告观测到的身份标记（缺标记 ⇒ 不冒充）
✖ ⑦ invalid-selector → 判定 invalid（维度被逐维注入） — {"verdict":"unknown",
   "reason":"无法确认引用 3 的目标是否仍然有效（目标元素已被同类新元素替换（身份标记不匹配））—— 按失效处理"}
✖ ⑦ invalid-selector → 可读原因指到该维（逐字）
            ⇒ ▶ L1 运行时门禁: 118 passed / 2 failed
还原：ref-capture.ts sha256 98c18484… / ref-validity.ts sha256 115879b7…（前后相同）
      ⇒ node 27/27 pass，L1 门禁 120 passed / 0 failed
```

**③ 回退捕获回环校验**（`acceptCapture` 不再拦截；`sidepanel.js 549,609 → 548,715 B`）：

```
✖ R4 ②止血（missing + 文本唯一）— {"cardCount":1,"states":["stale"], … "rows":["系统事件…已失效：…目标元素已不存在…"]}
✖ R4 ②止血：修复路径不产生失效行
✖ R4 ③止血（missing + 无匹配）：拒铸 —— 零引用卡
✖ R4 ③止血：拒绝也有出路 —— 可读系统事件逐字 + 推荐生产者被真实咨询
✖ （另有 1 条同源）        ⇒ ▶ v3-4 页面即输入门禁: 113 passed / 5 failed
还原：sidepanel.ts sha256 803f45d5c6334f83dc7fe9273f68b354b261c04751a399a40608d58f308d2ba1（前后相同）
      ⇒ 页面即输入 118 passed / 0 failed
```

> ⚠️ ③ 的 PASS 段曾出现 **1 次** F-01 夹具前置的偶发红（`rescue: null`，即页面侧回读不可达；随后 5 次复跑 118/0）。
> 处置：在 F-01 夹具前**显式建立前提**（活动 tab + `pick-layer-inject`），不再依赖上一段用例的残留状态（去 flaky，未减弱任何断言）。

---

## 4. 体积对账（三产物）

| 产物 | 修前 | 修后 | Δ | 处置 |
|------|------|------|---|------|
| `dist/content.js` | 177,076 B（sha `52a82620…`） | **177,076 B（sha `52a82620…`）** | **0 B** | **逐字节不动**（本修不碰 content script） |
| `dist/pick-layer.js` | 33,900 B（sha `5f567d7e…`） | **34,358 B** | **+458 B（+1.35%）** | **显式解冻重登记**（`PICK_LAYER_RE_REGISTRATIONS['r4-selector-fix']` 五要素；容差仍 **0**，`+1 B` @ 34,359 必 FAIL） |
| `dist/sidepanel.js` | 547,558 B | **549,609 B** | **+2,051 B（+0.37%）** | 中间轮五要素重登记（`SIDEPANEL_RE_REGISTRATIONS['r4-selector-fix']`）；档位 `563,200` 与绝对上限 `619,520` **均未变**，生效上限 = `min(619,520, floor(549,609 × 1.05) = 577,089) = 577,089` |

sidepanel 逐模块归因（真实 `dist/build-meta.json` bytesInOutput，Σ +2,051 + glue 0 == 登记增量）：

| 模块 | before | after | Δ | 承载 |
|------|--------|-------|---|------|
| `src/ui/sidepanel/sidepanel.ts` | 96,037 | **97,036** | +999 | 捕获回环校验 + 拒铸路径 + 展示层截断接线 |
| `src/ui/sidepanel/l1/ref-validity.ts` | 8,897 | **9,639** | +742 | `invalid-selector` 维度 + 文案 + 救援挂载面 |
| `src/ui/sidepanel/l1/ref-store.ts` | 5,949 | **6,169** | +220 | `displaySelector` 单点 + 证据行 / 卡标签展示面 |
| `src/ui/sidepanel/pick-input.ts` | 8,315 | **8,405** | +90 | `reanchor(..., { silent })`（捕获时修复只写一行事实） |

pick-layer（页面侧产物）承载：`ref-capture.ts` 去截断 + `SELECTOR_STORE_MAX` + compact 回退 + `selectorForDisplay` + `resolveRef` 的 `invalid-selector`；`pick-overlay.ts#describe` 展示面改道。

---

## 5. 门禁复跑与计数对账

| 门禁 | 结果 | 计数（修前 → 修后） |
|------|------|--------------------|
| `npm test`（node） | **1186 passed / 0 failed** | 1181 → **1186**（+5 条 R4 用例） |
| `test:supersession` | 36 / 36 | 36（只改 JSON 登记字段） |
| `test:l0` | 248 / 0 | 248（不变） |
| `test:l1` | **120 / 0** | 111 → **120**（新增 1 维度 × 4 条 check） |
| `test:l2` | 74 / 0 | 73 → **74** |
| `test:density` | 242 / 0 | 242（31 格与阈值零改动） |
| `test:ui`（journey） | 171 assertions PASS | 171（不变） |
| `test:insight` | 118 assertions PASS | 118（不变） |
| `test:binding` | 见 §6（环境受限） | 192（隔离复跑 192/192） |
| `test:hardening` | 24 assertions PASS | 24 |
| `test:stream` | 73 / 0 | 73 |
| `test:page-input` | **118 / 0** | 108 → **118**（+10 条 R4 check） |
| `test:recommendation` | **65 / 0** | 60 → **65**（夹具口径变更后复绿） |
| `test:ref-pick-wiring` / `test:size-ruling-vol3` / `test:design-contract` / `test:gate-integrity` | 11 / 12 / 19 / 15 PASS | 不变 |
| `test:law8` / `test:dead-end` / `test:auth-chip` / `test:zero-injection` | 25 / 39 / 37 / 28 PASS | 不变 |
| `test:l1-reverse` / `test:l2-reverse` | **反证全套 PASS**（9 / 10 条） | 不变（l2 的 RP-V33-05 红文本已按新基线 549,609 命中） |
| `test:e2e` | PASS | — |

台账同步（`docs/v4-supersession-ledger.json`）：

- 新增叶段 `leafBases[r4-selector-fix]`（leafBase `953a2ed`，60 行逐字登记 / 8 文件，scope 由规则复算）；
- 新增 3 条 `modifiedRanges`（`R4-MR-ref-capture-test` / `R4-MR-l1-reason` / `R4-MR-size-baseline`）；
- 新增 2 条 `unfrozenZeroDiffFiles`（`src/content/ref-capture.ts` / `src/content/pick-layer.ts`，理由 + 日期 + 来源 + 复入门禁 + `frozenBy`）；
- `counts` 抽样口径（l0 / density / nodeTestRuntime / supersession）带**日志 + 正则 + 观测行**同源；
- 静态口径读数全量复算 1450 / 1192 / 1180（只增，仍作下界）。

**断言零删减**：`ref-capture.test.ts` 的两条截断口径断言按**登记口径变更**重锚（`SELECTOR_MAX` 仍是展示上限 120；存储上限新增 `SELECTOR_STORE_MAX = 512`；`resolveRef` 抛错分支 `missing` → `invalid-selector`），被替换的旧行**逐字登记**于 `leafBases[r4-selector-fix].registeredUncoveredLines`；夹具口径变更（`page-input.mjs` F-01 / `recommendation.mjs` ⑪）同样逐字登记，**判据集一条未改**（卡数 / 序号 / 失效行 / 逐字文案全部保留）。

---

## 6. 登记的环境性 flake（如实）

1. **`test:binding`**：本轮复跑中出现 `#54B7 chrome.bookmarks 目标书签确实删除` 与 `#8d tabs switch 二次确认 / #confirm-allow not found` 两类失败，诊断落盘显示 `CDP socket not open (readyState=3)`（浏览器进程已退出）。**对照实验**：把本轮改动 `git stash` 后在**基线树**上复跑 ⇒ 同样失败（2/2，`/tmp/opencode/v4-gate-logs/r4-selector-fix/baseline-binding-{1,2}.log`）⇒ 与本轮改动**无因果**；本轮早先一次隔离复跑为 **192/192 PASS**。环境指标：内存 11 GB / 0 free、load average 4.5–9.1（KL-N-10 同源）。
2. **`test:l0`**：`test:v3` 串行链中 `⑨ FR-V3-015 反证（FAIL 段）` 偶发未检出（`— []`），隔离复跑 **248/0**（`/tmp/opencode/v4-gate-logs/r4-selector-fix/test-l0-rerun.log`）；同链条上其余门禁全绿。
3. **`test:page-input` F-01 前置**：见 §3.4 ③ 的脚注（已去 flaky）。

---

## 7. 红线核对

| 红线 | 状态 |
|------|------|
| `dist/content.js` 逐字节不动 | ✔ 177,076 B / sha `52a82620…`（`test/pick-layer-budget.test.ts` 联动断言） |
| `manifest.json` / `KIND_SET` / 阈值 / design 契约冻结面 | ✔ 零改动（`test/zero-injection` / `test/design-contract` / `test:gate-integrity` 全绿） |
| journey / binding 保护段 | ✔ 未触碰 |
| `test/**` 断言只增 | ✔ 计数 1181 → 1186 / l1 111 → 120 / page-input 108 → 118（台账逐行登记替换行） |
| `.sddu/` 不动 | ✔ 本修不改 `.sddu` |
| 禁 `git add -A` | ✔ 逐文件 `git add` |
