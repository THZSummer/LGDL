# ADR-IAN-009: S0'' 双面验证设计（终态 10 步 + 中间态保护 + 「元素不存在非 hidden」机核）

## 状态
ACCEPTED（承父 spec §5.8 S0'' / FR-IAN-070~074 / AC-IAN-001 / §9.4 人工面 / R-IAN-909）

## 背景

S0'' 的地位 = F-34 之 S0′ / v5.5 之 S0 / v5 之 S2：**一条可机核样板**证明 ① 先立新面不破坏现网；② 终态旧面零可达；③ 门禁强度不降。要求**两段**（中间态 / 终态）、**双面**（node + Chromium）、**样本单源**、**双向反证**、**真源切片**。

**只读事实**：

| 面 | 事实 | 位置 |
|---|---|---|
| node 样板先例 | `test/s0-self-driven-chain.test.ts` + `test/ui/fixtures/s0-chain.mjs`（F-34 样本单源） | F-34 产物 |
| Chromium 样板 | `test/ui/s0-self-driven.mjs`（**既有文件，只加断言不加文件**） | `gate-integrity` `EXPECTED_AUDITED_FILES` 已含 |
| 中间态风险 | R-IAN-901（为赶进度提前删面 ⇒ 「无输入可用」窗口）；N-IAN-027 | 父 spec §15.2 |
| 脚本绿 ≠ 链路可判 | R-IAN-909 / v5-2 review BLOCK-03 教训 | — |

## 决策

**① 终态 10 步全链（S0''-1~10）双面机器化，样本单源。**

| 步 | 环节 | node 面判据 | Chromium 面判据（`s0-self-driven.mjs` 增量） |
|:-:|---|---|---|
| 1 | 拾取引用 | 引用事实 `validCount ≥ 1` | 真面板拾取命中 `[data-wcli-ref]` |
| 2 | 作答（ask 卡） | 答案结算 + 原话可读 | 卡内 `[data-act=answer]` 点击后 `data-answered=true` |
| 3 | **推荐区「自由输入…」末端项** → 卡内输入就地展开 | FIN-1（末端项存在且最末） | 点末端项后 `#ask-fallback` 可见 + `#ask-input` 获 focus；`KIND_SET` 40 不动 |
| 4 | **提交 ⇒ 成回合** | 经 `op.turn` 槽；`requestTurn(` 计数；`chat` `user` 载荷 = 输入原文 | 真键入卡内输入 → 真点提交 → 流内出现 `user` 行 |
| 5 | **在飞再输入 ⇒ `queued`** | 「已排队」行可读；回合结束自动发送 | 真面板排队留痕 |
| 6 | **队满 ⇒ `busy-rejected` ⇒ 回填** | 回填流内；**仅当为空**；卡收起 ⇒ 重展开；有可读行 | 真面板拒绝留痕 + 卡内输入值 = 被拒原话 |
| 7 | **流外零输入面** | L4-1（DOM 零命中）+ FIN 末端项 | `getElementById('composer') === null` ∧ `querySelector('#composer,#input,#send') === null` |
| 8 | **中间态保护 / 终态零可达** | 见 ② | 见 ② |
| 9 | **留痕 driver 区分** | FIN-4（两值可判 + 不同值） | 手输回合留痕 `driver=manual` 可读 |
| 10 | **零新增载体 + 红线** | `KIND_SET` 40 / 12 kind / `REGISTERED_STRUCTURAL_HOSTS=[]` / 法八四面零明文 | 同 node（真面板读数） |

- **样本单源**：node 与 Chromium **共用同一份样本**（承 `test/ui/fixtures/s0-chain.mjs`；本轮**扩展**该 fixture，**不新增样本文件**）。
- **只加断言不加文件**：Chromium 面全部落在既有 `test/ui/s0-self-driven.mjs`；`CHROMIUM_GATES === 9` 不动。

**② 中间态保护（**决定性**）。**

- **S0''-A（ian-1 完成后）**：**新旧两入口并存可用** ——
  - 旧入口：`composer` submit（`#input` + `#send`）→ `requestTurn`；
  - 新入口：free-input 卡内输入 → `op.turn` 槽 → `requestTurn`；
  - 判据：两入口**各跑通一轮**（都成回合）；**双回填载体均可判**（回填 `#input` ∧ 回填卡内输入，两者互不覆盖）；
  - 反证：**ian-1 破坏旧入口**（`#composer`/`#input`/`#send` 任一不可用）⇒ 必红（N-IAN-027 / R-IAN-901）。
- **S0''-B（ian-2 完成后）**：旧面**零可达**（元素**不存在**，非 `hidden`）——
  - 判据：`document.getElementById('composer') === null` ∧ `getElementById('input') === null` ∧ `getElementById('send') === null` ∧ `querySelector('#stream #composer, #stream #input, #stream #send') === null`；
  - **「元素不存在非 hidden」机核**：在 `#composer` 位置注入一个 `<form id=composer hidden>` ⇒ 法四门禁（L4-1）+ `host-registry` 退役判据**必红**；移除后**逐字节还原**（sha256）⇒ 绿。**禁止**以 `hidden` / `display:none` / 迟挂载充「退役」。
  - `body` 尾「最后一个布局元素 = `#composer`」断言**等价重锚**为「三 id 不存在 ∧ `body` 仍 flex 列」。
- **中间态不得被跳过**：叶1 的 `state.json` / 产物须含 S0''-A 通过证据；叶2 不得在叶1 未 `validated` 前启动（`dependsOn` 链 + 两叶串行）。

**③ 反证必实跑 + 真源切片。**

- 每条 S0'' 判据 ≥1 注入反证：注入 ⇒ 实跑 FAIL（`expectFailPattern`）⇒ **逐字节还原**（sha256 前后相同）⇒ PASS。
- **真源切片**：S0'' 读**生产真源**（`index.html` DOM / 卡内载体 / `op.turn` 槽 / SW 队列）；**不得**用假 provider / 桩跳过真实卡内输入与通道（R-IAN-909）；样本单源（`s0-chain.mjs`）只是**输入数据**，不是判据源。

**④ 人工面如实登记（不冒充 PASS）。**

| # | 人工项 | 叶 | 状态 |
|---|---|:--:|:--:|
| M1 | 「自由输入…」真机可发现性 / 可理解度 | 1 | `⏳ 未执行` |
| M2 | 「时隐时现」困扰是否消失（体感） | 1 | `⏳ 未执行` |
| M3 | 卡内输入真机键盘手感 / 焦点流转（Tab / Shift+Tab / Esc） | 2 | `⏳ 未执行` |
| M4 | 读屏可用性（卡内输入 + `#send-reason`） | 2 | `⏳ 未执行` |
| M5 | 排队体感（在飞输入的反馈是否明确） | 1 | `⏳ 未执行` |

## 后果

- 正面：验收锚「先立新面不破坏现网 + 终态旧面零可达 + 门禁强度不降」成为可机核事实；中间态窗口被独立验收（S0''-A）。
- 代价：node + Chromium 两面各 ~10 环节断言；Chromium 面须**严格串行**且 `KL-N-10` flake 处置（隔离复跑 ≥2 / 如实记录）；样本 fixture 扩展须保持 node/Chromium 同源。
- 反证族：见 ②③；另加「S0'' 用假 provider / 桩 ⇒ 真源切片判据红」。

## 影响文件（预估）

| 操作 | 文件 | 说明 |
|:--:|---|---|
| NEW | `test/free-input-next.test.ts` | S0''-A node 面（+ S0'' 全链 node 侧） |
| MODIFY | `test/s0-self-driven-chain.test.ts` | S0'' node 面（F-34 样板扩展） |
| MODIFY | `test/ui/fixtures/s0-chain.mjs` | **样本扩展**（node + Chromium 同源；不新增样本文件） |
| MODIFY | `test/ui/s0-self-driven.mjs` | S0''-A/-B Chromium 面（**只加断言不加文件**） |
