# ADR-IAN-008: 门禁等价重锚清单（18 门禁三态 + 2 新门禁设计 + `CHROMIUM_GATES === 9` 不动）

## 状态
ACCEPTED（承父 spec §5.10 GATE / §9.3 / §9.5 / §12 / FR-IAN-100~106 / N-IAN-012·019·024）

## 背景

本 Feature 是「删一个面」，与「门禁只增不减」存在**结构性张力**（Q-IAN-006）：钉在 `#composer`/`#input`/`#send`/`requestTurn(` 上的断言**必须**重锚（等价或更强），**不得**删除 / 降级 / 静默改数。**唯一例外** = 保护段按台账显式取代（ADR-IAN-007）。

**基线（承 F-34 closeout，本轮未复跑）**：`npm test` **1394** / `CHROMIUM_GATES === 9` / node 10 + Chromium 8 = **18 门禁**。

## 决策

### ① 18 门禁逐一处置（三态齐；**禁漏项**）

> 三态 = **保留** / **等价重锚** / **显式取代（+台账）**。每行含 old→new 定位与反证。

| # | 层 | 门禁 | old（钉死现状，`file:line`） | 处置 | new（等价重锚） | 反证 |
|:-:|:-:|---|---|---|---|---|
| 1 | node | `test/op-wiring.test.ts` | `:127-134` `requestTurn(` **恰 2**；`:76` `op.turn.callSites=2`；`:361` | **等价重锚** | 恰 **1**（唯一生产输入提交点 = `op.turn` 槽）；`OP_CALLSITE_SET.op.turn.callSites 2→1`；`expectFailPattern` 更新 | 注入第 2 个 `requestTurn(` 调用点 ⇒ 红 |
| 2 | node | `test/turn-arbitration.test.ts` | `:49,60` TA-4 回填 `#input`（`draftInput.value = rejected`）；`:123` 删回填反证 | **等价重锚** | 回填载体 → 流内卡内输入（`freeInput.value = rejected` + `length===0` 保留）；**删回填仍必红** | `PANEL.replace(回填语句,'')` ⇒ 红 |
| 3 | node | `test/r6-ty-experience-fix.test.ts` | `:169-173` 在飞不硬禁用 composer；`:185-196` `requestTurn` 不含 `buttonStates`；`:318-325` `requestTurn` 仍恰 2 | **等价重锚** | 在飞不硬禁用 → **流内输入面**；`:325` 计数叶1 仍 2 / 叶2 → 1 | 恢复 `pending ⇒ sendDisabled` ⇒ 红 |
| 4 | node | `test/sidepanel-view.test.ts` | `:115-120` R6 在飞可提交；`:281` `#input { flex:1 }` CSS；`:657-659` `<form id="composer" hidden>` | **等价重锚** | R6 → 流内输入面；`:281` → 「三 id 零命中 ∧ 卡内输入有等价布局」；`:657-659` → 「三 id 不存在」 | 注入 `#input` CSS ⇒ 红 |
| 5 | node | `test/density-thresholds.test.ts` | `:102/:115-116/:141` 保留面清单含 composer/input/send；`:389-409` body 尾 + hidden + 非 `#stream`；`:754-776` `RETIRED_HOST_ATTRS` 含 `composer` ∧ `:775` 不得入容器册 ∧ `:776` form hidden；`:787-814,864` `#send-reason` 保留 | **等价重锚** | `:389-409` → 「三 id 不存在 ∧ body flex 列保留」；`:754` 宿主值列表**逐字不变**；`:769` `input`/`send` 转「必须入册」；`:775` → 「必须入册」（13→16）；`:776` → 不存在；`:787-814,864` `#send-reason` 保留且**非恒真** | `#composer` 回流 ⇒ 红；`#send-reason` 离状态栏 ⇒ 红 |
| 6 | node | `test/host-registry.test.ts` | `:191` 零宿主反证含 `composer`；`:260` 宿主值 4 项；`:262` 容器册 13；`:282/:313` | **等价重锚** | PRESERVED 注释去三项；`RETIRED_CONTAINER_IDS` 13 → **16**；`TEST_RETIRED_CONTAINER_IDS` 同步 `.sort()` 比照 | 13 / 16 不符 ⇒ 红；注入容器 id ⇒ 红 |
| 7 | node | `test/supersession-ledger.test.ts` | `:1452` `redlineRemap ≥3`（含「composer 贴底」）；`history[0]` / 链判据 / 保护 pin | **保留 + 新增** | 老条目逐字保留；**新增** X-IAN-1 法四 old→new + journey 新 pin 链节 + binding keep；`redlineRemap` 6 → 7 | 老 remap 被改写 ⇒ 红；链不连续 ⇒ 红 |
| 8 | node | `test/insight-tree-hierarchy.test.ts` | `:527,:656-657` journey 保护段显式取代**先例**（段内逐字读 `#log`/`#composer`） | **保留**（先例引用）+ 本轮取代走八步 | 先例判据不动 | — |
| 9 | node | `test/settings.test.ts` | `:191` `composer draft restored`（`state.draft` 经 `getDraft/setDraft`） | **等价重锚** | draft 载体 → 流内输入（`#ask-input`）；`state.draft` 断言保留，源换载体 | 静默丢草稿 ⇒ 红 |
| 10 | node | `test/size-baseline.ts` | `:560,:1279,:1504-1506` v4.5 composer 出流登记；`:2237,:3098,:3177,:3246`；`SIDEPANEL_BASELINE_BYTES=591_946` | **等价重锚 / 新增登记** | 逐叶五要素重登记（ian-1 正 / ian-2 净负）+ V3-VOL-3 三值同源前移；旧条目逐字保留 | 算术不符 ⇒ 红；旧条目被删 ⇒ 红 |
| 11 | Chromium | `test/ui/insight.mjs` | `:18-19` `#I-08` 贴底 / `#I-09` FAB∩composer；`:70,:128,:358-382,:423-471,:655` | **显式取代 / 消解** | 几何读面 → 消解并**显式登记**（元素不存在）；`:127-129` 法四断言 → 「默认屏零可见输入框」；`:461-467` 兜底展开态 → 「卡内输入可见」 | 静默 `null` 通过 ⇒ 红（新判据） |
| 12 | Chromium | `test/ui/journey.mjs` | `:668` `#send.disabled`；`:843-885` `#15c`（**保护段内**）；`:1088,:1106,:1338,:1367` | **等价重锚** + **保护段八步取代** | `#15c` → 流外零输入面；`:668` → 流内输入面；新 pin（ADR-IAN-007） | 段内 1 byte ⇒ sha 红（保留） |
| 13 | Chromium | `test/ui/l0.mjs` | `:18,228,321,375-376` ③ composer hidden + body 尾 + 非 `#stream`；`:1076` ⑪ 默认 hidden；`:1081-1095` ⑪ 兜底展开后 `#ask-fallback` 与 `#composer` 均可见；`:1321` BLOCK-03 单写判据 | **等价重锚** | ③ → 「三 id 零命中 ∧ 默认屏零可见输入框」；⑪ → 「`#ask-fallback` 可见 ∧ `#composer` 不存在」；`:1321` → 「输入面单一（唯一载体）」 | 三 id 存在 ⇒ 红 |
| 14 | Chromium | `test/ui/binding.mjs` | `:49,:59,:69` `composerHidden` + `inputDisabled`；`:115` `DIAG_SELECTORS` 含 `composer`；`:905` `#send.disabled` + `#send-reason`；`:1034-1038` 真实键入 `#input` + `realClick #send`；`:1094-1096` | **等价重锚** + **保段 keep** | 诊断面 → 流内输入选择器；`:905` → `#send-reason` 保留 + 在飞可提交；`:1034-1038` → 卡内输入真实键入等价（**不删路径**）；段内零字节 + 段前等长补偿 | 段内 1 byte ⇒ sha 红（保留）；段前 +1 byte 不补偿 ⇒ startByte 红 |
| 15 | Chromium | `test/ui/recommendation.mjs` | `:146-161,:261,:296` chip 提交**不填** `#input` | **等价重锚** | chip 提交**不填卡内输入**；新增「末端项存在 ∧ 不填任何输入 ∧ 不越预算」 | 填输入 ⇒ 红 |
| 16 | Chromium | `test/ui/s0-self-driven.mjs` | `:900-902` 驱动 `#input` + `composer` submit 事件 | **等价重锚** + **新增 S0'' 断言（只加断言不加文件）** | `:900-902` → 驱动卡内输入 + `op.turn` 槽；S0''-1~10 双面断言 | 旧面驱动残留 ⇒ 红 |
| 17 | Chromium | `test/ui/l1.mjs` | 间接（经兜底入口 / 卡族） | **保留**（若因删面需微调 ⇒ 等价重锚 + 台账） | — | — |
| 18 | Chromium | `test/ui/hardening.mjs` | 间接 | **保留** | — | — |

**间接 / 对账面（不计入 18，逐条确认无遗漏）**：`test/notify-tools.test.ts`（6 命中多为消息 `send()`，**非 `#send` 按钮**，逐条区分）/ `test/settings-help.test.ts`（1）/ `test/system-merge.test.ts`（1）/ `test/parity/baseline-catalog.json`（对账基线登记）。**断言数对账**：F-34 后 `npm test` 1394 ⇒ 本轮只增（+2 node 门禁用例 + 各重锚新增用例），**无减少项**。

### ② 新 node 门禁设计（判据 + 反证 + 三段控制）

**`test/free-input-next.test.ts`（叶1 落地；承 `law7x-ext` / `law9` 形态）**

| ID | 判据 | 反证（`expectFailPattern`） |
|---|---|---|
| FIN-1 | 「自由输入…」末端项**存在**且恒为推荐卡最末（结构序在 `.next-chips` 之后 + payload `acts` 末项 = `'free-input'`） | 注入非末位 / 移除 ⇒ 必红 |
| FIN-2 | **零死端**：无其他候选（`suppression ∈ {empty,safety}` ∧ `!busy`）时仍铸造仅含末端项的最小卡 | 删 floor ⇒ 必红 |
| FIN-3 | **唯一提交点**：free-input 提交经 `op.turn` 槽；`sidepanel.ts` 的 `requestTurn(` 调用点**不增**（叶1 = 2，叶2 = 1） | 注入第 2 个 `requestTurn(` ⇒ 必红 |
| FIN-4 | **手输可判**：`MANUAL_DRIVER_ID` 写入手输留痕 ∧ `MANUAL_DRIVER_ID ∉ listDriverDecls()` ∧ AI 路径不写该值 | 手输写声明 id / AI 写 `manual` ⇒ 必红 |
| FIN-5 | **让位语义**：手输路径调用 `proactivity.noteUserTurn()` ∧ `requestTurn` 函数体内**无**让位调用（切片断言） | 移入 `requestTurn` ⇒ 必红 |
| FIN-6 | **空提交**：空 / 纯空白不产生空回合且**不静默**（有可读行） | 静默吞掉 ⇒ 必红 |
| FIN-7 | **回填不覆盖**：仅当输入处为空回填；非空只留痕；卡收起 ⇒ 重展开 | 覆盖非空 ⇒ 必红 |
| FIN-8 | **法八**：输入文本仅走 `chat` `user` 载荷；卡固化不回显值（`askFixedText` 只写 FACT） | 值入 payload/digest/审计/DOM ⇒ 必红 |

**`test/law4-input-as-next.test.ts`（叶2 落地；**法四机核**）**

| ID | 判据 | 反证 |
|---|---|---|
| L4-1 | **DOM 零命中**（读生产真源 `index.html` + 运行时 DOM）：`#composer`/`#input`/`#send` 均 `null` | 注入 `#composer` ⇒ 必红 |
| L4-2 | `#composer`/`#input`/`#send` ∈ `RETIRED_CONTAINER_IDS`（长度 = 16） | 移出入册 ⇒ 必红 |
| L4-3 | **默认屏零可见输入框**（真源切片：`index.html` 静态半 + 运行时 `hidden` 祖先闭包） | 注入可见 input ⇒ 必红 |
| L4-4 | **流内输入卡存在可用**（`free-input` 卡内 `.ask-fallback` 可展开 + focus） | 删卡内输入 ⇒ 必红 |
| L4-5 | **三段控制禁恒真**：每条判据在 `ok` / `violated` / `n/a` 三态下行为可判（`n/a` 不冒充 `ok`） | 恒真断言 ⇒ 视为缺陷（红） |
| L4-6 | **真源切片**：读生产源（`index.html` / `host-registry` / 卡内载体），**不读测试自建常量**、不自我裁决 | 指向测试常量 ⇒ 红 |

- 两门禁纳入 `test/gate-integrity.test.ts#EXPECTED_AUDITED_FILES` 下界（**只增**，+2）与 `gate-integrity` 受审集合。
- **`CHROMIUM_GATES === 9` 逐字不动**（**不新增 Chromium 门禁文件**）：S0'' 的 Chromium 面只在既有 `test/ui/s0-self-driven.mjs` **加断言**（承 `page-input.mjs` 先例）。

### ③ 反证与串行纪律（FR-IAN-101 / 106）

- **反证必须实跑**：注入 → FAIL（声明 `expectFailPattern`）→ **逐字节还原**（sha256 前后相同）→ PASS；禁「删属性充数 / 自我裁决 / 换口径放松」。
- **门禁严格串行**（`test` / `test:ui` / `test:binding` **绝不并发**；一次一个 Chromium；`finally` 自清 profile）；`KL-N-10` 处置 = 首轮异常**隔离复跑 ≥2**、日志全量、**仍红如实记录不阻塞收口**。

## 后果

- 正面：18 门禁三态齐、可对账；断言计数只增；「删面」不导致任何静默降强度；法四从「文档」变为「机核」。
- 代价：约 12 个门禁文件重锚（含 2 Chromium 面的真实键入路径与 1 保护段八步取代），是本 Feature 工作量最大的一块（预估 ~40% 任务量）。
- 风险：重锚写成恒真（R-IAN-903 / R-SGO-903 同形）⇒ 由 FIN/L4 的三段控制 + 双向反证结构性防止。

## 影响文件（预估）

| 操作 | 文件 | 说明 |
|:--:|---|---|
| NEW | `test/free-input-next.test.ts` / `test/law4-input-as-next.test.ts` | 2 新 node 门禁 |
| MODIFY | 上表 #1~#6、#9、#10（node 8 文件） | 等价重锚 |
| MODIFY | 上表 #7、#8 | 保留 + 新增 |
| MODIFY | 上表 #11~#16（Chromium 6 文件） | 等价重锚 + 新增断言 |
| MODIFY | `test/gate-integrity.test.ts` | `EXPECTED_AUDITED_FILES` 只增 2 项；`CHROMIUM_GATES` 不动 |
