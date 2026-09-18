# 技术计划：specs-tree-web-cli-plugin-v4-chat（web-cli-plugin v4「聊天流统一承载」；父 Feature 统领性技术方案）

> **文档定位**: SDDU 技术方案 — 记录架构设计、方案对比和 ADR，作为 tasks 阶段的输入
> **前置依赖**: 父 `spec.md` v1.0（**权威条文单一事实源**：FR-CHAT-001~094（10 组）/ NFR-CHAT-001~012 / EC-CHAT-001~014 / AC-CHAT-001~025 / NG-CHAT-001~011 + §12 裁决记录）+ 父 `discovery.md` v1.0（Q-CHAT-001~013 / A-CHAT-001~009 / R-CHAT-001~016 / O-CHAT-001~009 / §7.1 全量 `file:line` 证据）+ 4 个叶子 `spec.md`（v4-1 / v4-2 / v4-3 / v4-4）；设计基准 `packages/web-cli-plugin/design/ui-redesign/option-f-chat-stream.html`（116,130 B / 1,927 行）+ `option-f-shim.mjs`（33,368 B，**60 断言 = 设计契约**，discovery 本轮实测 60 passed / 0 failed）；先例 = v3 `plan.md`（ADR-V3-001~036 + 取代台账 hunk↔台账映射 + 三段式密度门禁）；体积守卫 `test/size-baseline.ts`（V3-VOL-3 + `PENDING_ABSOLUTE_CAP` + 5% 公式）；取代台账 `docs/v3-supersession-ledger.json`（126 entries / 2 段 `protectedRanges` / `leafBases` 按行判定）
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-18
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-18
> **更新说明**: 初始创建（v4「聊天流统一承载」统领性技术方案：父 `plan.md` + 4 个叶子 `plan.md` 同批产出；**ADR-V4-001~040**（父承 001~016，4 叶承 017~040）；覆盖编排器 12 项技术设计必答 + 7 条 spec 新风险裁决的 ADR 显式消解；取代台账操作总表 + 体积策略总表）。**本任务只做 plan**：不写 tasks、不写代码、不改 `src/**`·`test/**`·`manifest.json`·`design/**`·`dist/**`、不改 v1/v2/v3 SDDU 目录、不改 ROADMAP（只登记）、不动 `main`、不 commit/push、**不跑门禁/构建/Chromium**、**未调用任何受管 Provider**（routing.v1 = `local_or_compute → none`）

web-cli-plugin v4 技术方案 —— 把侧栏从「L0/L1/L2 分区 + 浮层 + 独占决策槽」重构为「**工具栏 / 聊天流 / 状态栏**」三区 + **聊天流统一承载**：一切交互皆消息（7 主类 + 过程卡族），过程性问答 / 授权申请与决策 / 引用生命周期 / 系统事件 / 下一步推荐全部**入流留痕**（append-only + 终态冻结）。核心工程难点 = ① 在**不动面**（`content.js` 177,076 B 无容差 / `pick-layer.js` 33,900 B / 判定链 sha256 pin / `KIND_SET` 零 diff / manifest 零新增权限）下把 `#log` 的一次性全量重建换成**不可变事件流 + 增量渲染**；② 把密度口径从「`document.body` 全量计数」换成「**三区外壳 + 流内容子树豁免**」并新增**三条防滥用**，同时让豁免**不可被滥用为「把控件藏进流子树降密度」**；③ 在 journey 段 `42766..54004` **字节哈希冻结**、l0/l1 门禁断言**大面积落在被取代面**（R-CHAT-001 头号风险）的前提下做到**零删除、零降级、计数不减**；④ 收口时带值闭合 `PENDING_ABSOLUTE_CAP`（绝对上限 vs 5% 公式的优先级）。

---

## 1. 前置检查

| 检查项 | 状态 | 证据（本轮只读实测） |
|--------|:--:|------|
| 父 `spec.md` 存在 | ✅ | `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v4-chat/spec.md`，87,082 B / 601 行 |
| 4 个叶子 `spec.md` 存在 | ✅ | `specs-tree-v4-1-zone-shell-density/spec.md`（182 行）/ `v4-2-chat-stream-model`（181）/ `v4-3-ask-auth-inflow`（174）/ `v4-4-ref-system-nextstep`（189） |
| `discovery.md` 存在 | ✅ | 同目录 `discovery.md`，94,715 B / 480 行（含 §7.1 A~E 全量 `file:line` / §7.2 约束登记 / §7.3 门禁影响面 / §7.4 台账处置 / §7.6 叶子草案） |
| 设计契约存在且已机器化 | ✅ | `design/ui-redesign/option-f-chat-stream.html` 116,130 B；`option-f-shim.mjs` 33,368 B（60 断言 = 9 组 A~I；discovery 本轮实跑 60 passed / 0 failed） |
| 先例可读（v3 统领性 plan + 36 ADR + hunk↔台账门禁） | ✅ | `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v3-ui/plan.md`（762 行） |
| 体积守卫可读 | ✅ | `test/size-baseline.ts`（1,479 行）：`SIDEPANEL_BASELINE_BYTES = 375_102` / `SIDEPANEL_CEILING = 393_857` / `PENDING_ABSOLUTE_CAP{resolved:false, 三值 null}` / `CONTENT_MAX_BYTES = 177_076` / `PICK_LAYER_BASELINE_BYTES = 33_900` |
| 取代台账可读 | ✅ | `docs/v3-supersession-ledger.json`（3,451 行）：126 entries / `protectedRanges` 2 段 / `leafBases` 1 条 / `counts` 5 门禁 / `v3GateFloors` 4 文件 |
| 密度基线与口径单源可读 | ✅ | `docs/v3-density-baseline.json`（589 行，22 比对格）/ `test/ui/density-metrics.mjs`（485 行：`DENSITY_MEASURE_SOURCE` + `DENSITY_LIMITS` + `evaluateDelta` + `compareBaselineCells` + `BANNED_MEASURE_APIS`） |
| **外部 API 文档缓存** | ⚠️ **N/A（0 个外部服务 API）** | 见下方说明 |
| 红线基线核对 | ✅ | 分支 `feature/web-cli-plugin` @ `187c205`（2026-09-18）；`main = 2ddc922`（未动）；工作区干净；`dist/{content,pick-layer,sidepanel}.js` = 177,076 / 33,900 / 375,102 B（只读 `stat`，本轮未构建） |
| v1/v2/v3 SDDU 目录只读参与 | ✅ | `specs-tree-web-cli-plugin/**`、`...-v2-insight/**`、`...-v3-ui/**` 本轮零改动 |
| `packages/web-cli-base/**` / `manifest.json` / `design/**` / `dist/**` 本轮零改动 | ✅ | 本阶段只写本 Feature 目录 |
| 编排器裁决已收录为设计约束（D1~D7 + §12 O-CHAT-001~009 + 本轮 7 条新风险裁决） | ✅ | 见 §4「编排器决策登记」 |

**「外部 API 文档缓存」检查的适用性说明**（逐条举证，与 v3 同形）：

| 问题 | 结论 |
|------|------|
| spec 是否引用外部服务 API？ | **否**。扫描父 spec 全文：**0 个待新增的外部 HTTP API 调用**。唯一外部域 = `manifest.json#host_permissions` 的 6 个 LLM 供应商域 —— v1 已实现且本 Feature **零改动**（AC-CHAT-020 零 diff）。本 Feature 的推荐卡明确**禁止新增 LLM 侧产物**（FR-CHAT-060 / 裁决 5），因此连「新面」都不存在。 |
| 本 Feature 的真值来源是什么？ | **进程内状态源 + Chrome 扩展 API**（`chrome.storage` / `chrome.tabs` / `chrome.scripting` / `chrome.runtime`）+ 设计基准 HTML + 既有构建产物 + 既有 `insight/*` 只读投影。**不需要 `.sddu/api-docs/` 缓存**。 |
| O-CHAT-009（外部竞品调研）是否阻塞本 plan？ | **不阻塞**。父 spec §12 已裁决「**未执行，不阻塞**」；父 spec 与本 plan **均未据此编造任何竞品结论**（NG-CHAT-009）。 |
| 本阶段是否调用受管 Provider？ | **否**。本轮为 `routing.v1` 计划 `local_or_compute → none`（纯本地代码只读 + 本 Feature 目录写入）。**未调用** `doubao_search` / `datapro` / `openviking` / `supabase` 任一 Provider，也未使用任何原生 WebSearch / WebFetch。 |

### ⚠️ 偏差登记 1（父 `plan.md` 的产出 vs 父 spec 的容器定位）

父 spec §11 与 v2/v3 先例把父 Feature 定义为**轻量规范容器 + 聚合报告承载者**（父不承接 tasks / build / review / validate）。**本轮编排器指令明确要求「父 `plan.md` + 四叶 `plan.md`」**，并把 12 项**跨叶**技术设计必答（事件流模型 / 卡渲染架构 / 三区骨架 / 密度重定标 / journey 保护段 / ask 授权流内化 / 引用与系统与推荐 / 体积与冻结面 / 测试架构）交给父层。

1. **执行编排器指令**（产出父 `plan.md`）——这 12 项全部**跨叶**：`StreamEvent` 结构被 v4-2 定义、v4-3/v4-4 消费；密度口径被 v4-1 定义、其余三叶复用；`#stream`/`#region-*` 契约跨越全部 4 叶；取代台账与体积策略是**单一文件**的跨叶资产。若分散定义必然出现 4 套口径漂移。
2. **登记为偏差**（ADR-V4-001 + 本节），并**明确父的容器内核仍被遵守**：父**不产出** `tasks.md` / `tasks.json`；父**不承接** build / review / validate；实施仍全部由 4 个叶子承载；父 `state.json` 的 `depth=1` / `childrens` 结构不变。
3. 父 plan 的定位 = **接口与契约的定义者**（ADRs + 门禁口径 + 不动面守线 + 台账/体积策略），**不是**实施载体（不排任务、不写代码）。此偏差如实登记，供 `@sddu-review` / `@sddu-validate` 独立核验。
4. **可整篇作废而不牵连叶子**：4 个叶子对父的引用均为「父 ADR 编号 + 契约名」，不依赖父文件物理存在性。

### ⚠️ 偏差登记 2（v4-1 叶子门禁集合缺 l0/l1/l2 —— 本 plan 裁决增补，**收紧而非放松**）

| 项 | 事实 | 后果 | 本 plan 裁决 |
|---|------|------|-------------|
| v4-1 leaf spec §8「门禁集合（串行）」 | 列出 typecheck · plugin `npm test` · `test:ui` · `test:insight` · `test:binding` · `test:hardening` · `test:e2e` · `test:supersession` · `test:gate-integrity` · 新密度门禁 · 体积守卫 · `test:zero-injection` · `test:page-input` —— **未列 `test:l0` / `test:l1` / `test:l2`** | v4-1 落定三区骨架必然取代 `#l0-status-band` / `#l0-decision`（含 `#ask`/`#confirm` 宿主）/ `#l0-pick` / `#l0-more` / `#l0-ref-toggle` / `#risk-rail` / `#l0-statusbar` / `#l2-entries` / `#log` / `#composer` —— 而 `test/ui/l0.mjs`（叶下界 73）/ `test/ui/l1.mjs`（64）/ `test/ui/l2.mjs`（68）的断言**绝大多数落在这些被取代面上**（discovery §7.3：l0 「整文件重写 ~0~10% 存活」/ l1 「入口机制重写 ~10% 存活」/ l2 「中高存活，入口面板迁移」） | **v4-1 门禁集合必须增补 `test:l0` / `test:l1` / `test:l2`**，并在**同叶内**完成这三个门禁的等价改写与台账登记。理由：父 spec §10.3 / EC-CHAT-013「每叶收尾必须全门禁绿、**禁止把红灯遗留给下一叶**」是硬纪律，而**未纳入集合的门禁不是「绿灯」而是「未跑」** —— 照抄叶子 spec 的集合会让 v4-1 收尾时 l0/l1/l2 处于红灯或未跑状态，直接违反 EC-CHAT-013。**这是把门禁集合收紧（多跑 3 个、多做 3 份等价改写），不是放松**；父 spec §5.9 FR-CHAT-083「断言只增不减、只强不弱」允许收紧。落点 = **ADR-V4-011** + **ADR-V4-023**（v4-1 门禁清单）。 |

### ⚠️ 偏差登记 3（journey 保护段必须显式解除并新 pin）

父 spec §10.2 / FR-CHAT-081 / FR-CHAT-082 已授权「**逐段决策**」，并要求任何保护段哈希变更走取代台账（old→new + 理由 + 日期）。本 plan 的决策：**journey 段 `42766..54004` 显式取代并新 pin**（理由 = 该段逐字读取将被退役的 `#log` / `#composer`，语义上不可能字节不变）；**binding 段 `107780..115930` 逐段决策 = 保留 id 兼容、零改动**（后台/协议面，高存活）。操作流程见 **ADR-V4-008**。

---

## 2. 架构分析

### 2.1 现状基线（**本轮只读实测，逐文件核实**）

| 事实 | 值 | 来源 |
|------|-----|------|
| 侧栏 DOM | `src/ui/sidepanel/index.html` = **1,414 行 / 68,408 B / 109 个 `id`**；`<body>` 直接子元素 = `#risk-rail`(section) / `#panel-top`(header) / `#panel-main`(div) / `#l0-statusbar`(button) / `#l2-entries`(div) / `#panel-bottom`(div) / `#settings-view`(section) / `<script>` | 本轮实测 + `index.html:1122-1413` |
| 三区几何（现行） | `body{display:flex}`（列向）；`#panel-main{position:relative;flex:1 1 auto;min-height:0}`；`#log{flex:1 1 auto;min-height:0;overflow-y:auto}` = **唯一滚动容器**；`#panel-bottom{flex:0 0 auto}`，`#composer`（默认 `hidden`）为其末元素 | `index.html` + `test/sidepanel-view.test.ts:127-138` |
| L0 骨架（将被取代） | `#panel-top > #l0-status-band`（唯一可点）→ L1 `#topbar`；`#l0-decision`（`#l0-kicker` / `#ask` / `#ask-prompt` / `#ask-options` / `#ask-fallback` / `#ask-input` / `#ask-submit` / `#ask-cancel` / `#l0-pick` / `#l0-more` / `#l0-receipt-summary` / `#l0-ref-toggle` / `#l0-ref-badge` / `#l1-more` / `#l1-consequences` / `#l1-ref` / `#confirm`）；`#l0-statusbar` + `#l2-entries`（4 入口带计数）；`#risk-rail` body 直挂 | `index.html:1128-1367` |
| 消息流（将被取代） | `#log` 是 `div`（**不是** `ol[role=log]`）；`sidepanel.ts:809-833` 的 `render()` 每次 `log.textContent = ''` → **全量重建** → 逐条 `appendChild(renderEntry(...))`；空态写 `LOG_EMPTY_TEXT`；折叠记忆 `toolOpenState: Map<number,boolean>`（按 entry id） | `sidepanel.ts:809-833`、`:103-110` |
| 事件模型（缺什么） | `entries: ChatEntry[]` + `nextId` **已是 append-only 数据层**（`chat-state.ts:111-128`），但 `role` 4 类 / `kind` 4 类；`ask` / `confirm` 是**可变单槽 + 置 `null`**（`:72/:173-185`）；`notice`/`auditCount`/`probe`/`discoveryState` 是**末值标量** | `chat-state.ts:7-8,25-38,55-75,169-185` |
| 会话持久化 | `session-store.ts` 存 `StoredSession.history: ChatTurn[]`；`projectHistory()` **只投影** `role ∈ {user,assistant,tool,system}` + `text` → `kind` / `tool` / `ok` / `ms` **丢失**；`MAX_SESSION_TURNS = 40`，`boundHistory` 从 `user` 轮起截断；`MAX_SESSIONS = 20` LRU | `background/session-store.ts:76-81,28,274-289`；`background/chat-session.ts:16,58` |
| 会话切换 | `{type:'history'}` **整体替换** `entries`，tool 条目降级为 `kind:'tool'`（无卡元数据） | `chat-state.ts:188-195` |
| 引用注册表（可复用先例） | `createRefStore()`：`seq` 单调**永不复用**（含 `reset()` 后）；`retireUnusable()` 退役不删除；退役原因冻结；`repick()` 生成**新引用**、旧引用零改动 | `l1/ref-store.ts:117-130,158-176`；R3 先例见 `test/size-baseline.ts:255-260` |
| 视图替换机制（可复用） | `l2/view-host.ts`：`#view-host` 与 `#log` 是 `#panel-main` 内**兄弟**；打开视图 → `log.hidden = true` + `host.hidden = false` + 恰一个 `[data-l2-view]` 可见 + 标题/计数与入口同源（`l2/counts.ts`）+ 焦点入标题；返回 → 复原 + 快照恢复 + 回焦入口 | `l2/view-host.ts:70-148` |
| 折叠器（唯一通道） | `disclosure.ts`：`COLLAPSIBLE_TARGETS` 9 项白名单；`DISCLOSURE_WIRING` 9 组 trigger→target（每个 trigger 必须 `aria-expanded` + `aria-controls`）；`NEVER_FOLDABLE = ['risk-rail','confirm','l0-decision','ask','log','composer']`；`assertFoldable()` **抛错** | `disclosure.ts:60-125` |
| L1 触发器映射（将被取代） | `L1_TRIGGERS`：`l1-status→l0-status-band` / `l1-consequences→l1-consequences-toggle` / `l1-ref-evidence→l0-ref-toggle` / `l1-more→l0-more` / 其余 4 类各自 toggle —— **3 个 L0 触发器全部消失** | `l1/panels.ts:71-80` |
| 拾取复用点（将断裂） | `l1/panels.ts:259` `el('l1-ref-repick').addEventListener('click', () => pick.click())`；`pick` = `mountPickInput()` 的 `PickInputHandle`（`ensureInjected()` / `startPick()` / `highlight()` / `rescue()` / `reanchor()`） | `l1/panels.ts:259`；`pick-input.ts:53-88` |
| 决策历史（半 append-only） | `l1/panels.ts#rounds: DecisionRound[]`（仅内存、**只覆盖 ask**、默认 `hidden`）；闭合靠**差分 `input.ask` 字段推断**（`observe()`），非事件 | `l1/panels.ts:228,379-398` |
| 权限面 | 静态 `activeTab/scripting/storage/sidePanel/tabs`；可选 `bookmarks/downloads/notifications/clipboardRead/clipboardWrite`；**无 `contextMenus`**；无静态 `content_scripts` | `manifest.json` |
| `KIND_SET` 冻结面 | `background/messaging.ts` 的 `KIND_SET` 打包进 `dist/content.js`；先例：+6 个 kind 实测 **+307 B = 红线突破** → 新面一律走**独立校验器** | `content/pick-protocol.ts:9-12`；discovery §7.2 |
| 体积（硬） | `content.js` **177,076 B = `CONTENT_MAX_BYTES`（无容差，+1 B 即 FAIL）**；`pick-layer.js` **33,900 B**（零容差）；`sidepanel.js` **375,102 B**（基线）/ ceiling **393,857** = `floor(375,102 × 1.05)` | `test/size-baseline.ts:287-289,319,349,970-976,1101` |
| `PENDING_ABSOLUTE_CAP` | `resolved:false` + 三值全 `null`；`evaluatePendingAbsoluteCap()`：标记缺失 ⇒ FAIL / `resolved:false` 时**禁止预填** / `resolved:true` ⇒ 三值齐备 ∧ `absoluteCeilingBytes ≥ newBaselineBytes` ∧ `resolvedOn ∈ YYYY-MM-DD` | `size-baseline.ts:1359-1440` |
| v3 累计增长 | **+40.75%**（266,500 → 375,102）；最差相邻对 +22.96%；40% 停工线已被 **V3-VOL-3 撤销**（`enforced:false`），保留单轮五要素披露纪律 | `size-baseline.ts:401-414,1236-1285` |
| 门禁计数（台账登记口径） | journey **167** / insight **116**（下界 108）/ binding **192** / `sidepanel-view.test.ts` **38** / `nodeTestRuntime` **832**（下界 646）；叶下界 l0 **73** / l1 **64** / l2 **68** / density **60** | `docs/v3-supersession-ledger.json#counts` + `#gateFloors` + `#v3GateFloors` |
| 门禁运行时 `check(` 计点（本轮 `grep -c` 近似，**非运行期口径**，仅作量级参考，**不得作为登记值**） | journey 170 / l0 73 / l1 64 / l2 68 / density 60 / binding 197 / insight 96 / hardening 28 | 本轮 `grep -c`（登记以 `countMethod: runtime-check-calls` 为准） |
| 元门禁 | `CHROMIUM_GATES.length === 9`（字面量：journey/insight/binding/l0/l1/l2/density/hardening/e2e）；`EXPECTED_AUDITED_FILES` 为**下界**（可追加，**无长度断言**）；`page-input.mjs` / `zero-injection.mjs` / `l1-reverse.mjs` / `l2-reverse.mjs` **不在** `CHROMIUM_GATES` 内但由 marker 扫描自动纳入；`readReverseProofLedger()` **硬编码读 `docs/v3-supersession-ledger.json`**；`REVERSE_PROOF_HARNESSES` 2 条（caseFloor 9 / 10）；`STATIC_ONLY_GATES` 7 条 | `test/gate-integrity.test.ts:120-200,534-538,830-1000` |
| 既有断言的 DOM 耦合 | journey `querySelector` 32 / `getElementById` 134；insight 118 / 42；binding 25 / 63 | discovery §7.2 / v3 plan §2.1 |
| 设计契约（60 断言） | 9 组：A6（三区结构/语义/顺序）· B4（7 类卡 + 流挂载 + 富文本 + chips）· C11（ask-user 结构 + 操作前→后固化）· D7（auth 卡 + 两态固化）· E5（系统事件时间戳 + 引用失效/重拾）· F7（密度预算 + 法一/法四）· G7（三宽度 × 三主题）· H12（场景 S2~S7 + 视图替换 + 风险 chips 永不折叠）· I1（复位） | `option-f-shim.mjs:413-806` |
| 设计契约关键选择器 | `#region-toolbar` / `#region-stream` / `#region-statusbar` / `#stream`(`ol[role=log]`) / `#panel` / `#view-layer` / `#risk-chips` / `#theme-toggle` / `[data-msg-type]` / `.card-fixed` / `data-answered`(`true`/`cancelled`) / `data-decision`(`pending`/`approved`/`rejected`) / `data-ref-state`(`valid`/`stale`) / `data-ref-num` | `option-f-shim.mjs:413-806` |
| 设计稿密度函数 | `clickables(#region-toolbar) + clickables(#region-statusbar) ≤ 7` 且 `toolbar ≤ 5`；`isVisible` **只认 `hidden` 属性** | `option-f-chat-stream.html:1740-1786` |
| 保护段 1 | journey `42766..54004`（185 行，sha `6b45c3fa4027f75a97bb84e0f5d80446a8c316ca4cd6dd83b2fe939c0eb6ba63`，`#15a~#15q`，读 `#log`/`#composer` 几何 + `#15b` `opPct > 45` + `#15c` `composerGapToBottom ∈[0,12]`） | `docs/v3-supersession-ledger.json#protectedRanges` + `journey.mjs:803-1028` |
| 保护段 2 | binding `107780..115930`（184 行，sha `be9ad0e983670137d4233349aede1cae0f0b6fdf26a050083761d30d52c6b936`，`#22a~#22l` V2-3 R2 命令级覆盖链） | 同上 |
| 既有 helpers 事实 | `test/ui/{journey,insight,binding,hardening,l0,l1,l2,density}.mjs` **各自内联** `connectCdp/evaluate/check/realClick/waitFor`（v3 未抽共享模块；`_v3-helpers.mjs` 仅为 v3 新门禁自带） | v3 plan ADR-V3-003 第 5 条 |

### 2.2 目标架构总览（三区 + 统一流 + 视图替换）

```text
┌──────────────────────── 侧栏文档 sidepanel.html（同一文档，零导航） ────────────────────────┐
│ body（列向 flex；= 密度表达式根；口径 = 「三区外壳」∪ 排除子树 #stream）                      │
│                                                                                            │
│ ① [MODIFY] #panel-top → header#region-toolbar[role=toolbar][data-region=toolbar]            │
│      · .site-summary（role=status，只读 DIV，**不计可点预算**）= 站点/授权/信任/会话摘要        │
│      · 4 视图入口（#l2-entry-tree|commands|audit|settings，带 .badge 计数徽标，复用 counts）    │
│      · #theme-toggle（三态：跟随系统/浅色/深色）  ⇒ 可点 = 4 + 1 = **5**（≤5）                 │
│      · 法一：禁 ask-user / auth / nextstep 型卡（静态可核验）                                  │
│                                                                                            │
│ ② [MODIFY] #panel-main → main#region-stream[data-region=stream]                             │
│      · ol#stream[role=log]（追加式正序流，**唯一交互面**）  ← 取代 #log(div)（新 id）          │
│           └ 7 主类卡：ai / user / nextstep / askuser / auth / system / ref                    │
│           └ 过程卡族：tool / command / thinking / error / notice（ai 族子形态）                │
│           └ 每卡：li[data-msg-type=…][data-card-key=…] + .ts(HH:MM:SS) + data-* 固化态 + .card-fixed │
│      · #view-host（与 #stream 互斥的**视图替换宿主**，复用 l2/view-host.ts 同构替换）           │
│      · #scroll-bottom（流骨架层，流外 ⇒ **计入**密度）                                        │
│                                                                                            │
│ ③ [MODIFY] #l0-statusbar + #risk-rail → footer#region-statusbar[role=contentinfo]           │
│      · 连接状态一行（#statusbar-text）                                                        │
│      · **嵌套** #risk-chips（设计契约 id）> #risk-rail（v3 id 保留，探针/归属判据入口）        │
│        （**永不折叠**：状态栏本体无 hidden + chips 可见 + 视图打开后仍可见）                    │
│      · #risk-detail（chip 详情，默认 hidden ⇒ 不占默认密度）                                   │
│                                                                                            │
│ ④ [MODIFY] #settings-view（data-l2-view=settings）：法则六 —— 站点授权/撤销/会话与分组/        │
│      隐私开关/知情同意/自动授权/回执/设置项 **全部管理操作**归此（含未授权首装的授权入口）        │
│ ⑤ [RETIRE] #panel-bottom / 6 条 strips / #l0-decision / #l0-pick / #l0-more / #l0-ref-toggle │
│      → 被流内卡 + 系统事件行 + 设置视图取代（v4-1 同构迁入 → v4-2/3/4 换为卡组件）             │
│ ⑥ [RETIRE] #composer 常驻语义 → 法四「输入按需出现」（ask/auth 卡内输入为主）                  │
└────────────────────────────────────────────────────────────────────────────────────────────┘
        │ 面板内数据流（**全侧栏侧；SW / content 零改动**）
        ▼
┌──────────────── src/ui/sidepanel/**（唯一改动面） ──────────────────────────────────────────┐
│ [NEW] stream-model.ts     StreamEvent{seq,ts,kind,payload,terminal?,sessionId} 不可变 +       │
│                           createStreamState / appendEvent / project() → CardView[]（纯函数）  │
│ [NEW] stream-render.ts    增量渲染器：keyed by cardKey；append 新 li / patch 终态；**不清空**   │
│ [NEW] cards/*.ts          7 主类 + 过程卡族的 DOM 契约与固化契约（CARD_TYPES 单源登记）          │
│ [NEW] stream-digest.ts    摘要落库 schema（零明文白名单字段）+ bound + LRU（**面板侧写 storage**）│
│ [NEW] toolbar.ts          工具栏渲染（站点摘要只读 + 4 入口 + 主题）                            │
│ [NEW] statusbar.ts        状态栏渲染（连接状态 + 风险 chips + chip 详情 + 滚动定位流内卡）        │
│ [NEW] theme.ts            主题三态（data-theme + **已有 storage** 持久化 + 跟随系统降级）        │
│ [NEW] density-scope.ts    豁免子树单源 DENSITY_EXCLUDED_SUBTREES=['#stream'] + 三区外壳常量      │
│ [NEW] recommend.ts        推荐生产者（真值白名单）+ 规则表 + 优先级 + 上限 + 无候选不渲染        │
│ [MODIFY] chat-state.ts    entries+nextId **保留为派生视图**；ask/confirm 单槽 → 事件投影          │
│ [MODIFY] sidepanel.ts     render() 全量重建 → 增量；接线三区；管理操作入设置视图                  │
│ [MODIFY] view-model.ts    三区/卡/回合语义视图模型；sendDisabledReason 口径                    │
│ [MODIFY] disclosure.ts    白名单重定标（移除被取代目标，加入卡内目标）                          │
│ [MODIFY] l2/view-host.ts  #log→#stream 绑定 + 入口迁至工具栏                                   │
│ [REUSE 零改] scroll-policy.ts（BOTTOM_THRESHOLD_PX=48）· markdown.ts · l1/ref-store.ts（五维 +   │
│             序号单调 + 退役留痕）· l1/ref-validity.ts（fail-closed）· l1/receipt.ts（零明文）    │
│ [RETIRE]   l0/shell.ts（三区外壳取代）· l0/status-bar.ts（→ toolbar）· l0/decision-card.ts       │
│            （→ cards/askuser+auth）· l0/risk-rail.ts（→ statusbar chips）                       │
└────────────────────────────────────────────────────────────────────────────────────────────┘
        ▲ 既有 12 个 dispatch action 喂数据（**KIND_SET 零 diff**；若需新 kind → 独立校验器不进 KIND_SET）
        │
┌──────────────── 不动面（零 diff） ──────────────────────────────────────────────────────────┐
│ src/background/** 判定链 policy.ts / auto-authorize.ts（sha256 pin）· KIND_SET · ask-bridge 60s │
│ session-store.ts（v4 不落 SW 侧）· manifest.json · dist/content.js 177,076 B · pick-layer.js 33,900 B │
│ src/content/**（三文件内容 hash pin）· packages/web-cli-base/** · design/**（只读）· v1/v2/v3 SDDU │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 「三区不被反向污染 + 流豁免不被滥用」的**结构保证**（不是约定）

> 这是本 Feature 最容易被实现腐化的一条：只要有一个常驻导航/管理控件被移进流子树，密度预算就会被静默侵蚀（这正是 v4 新增 A3 反作弊要堵的后门）。用**结构 + 门禁**双向锁死。

| # | 结构保证 | 强制手段 |
|---|---------|---------|
| **S1 归属互斥（静态）** | 常驻导航/管理控件只能出现在 `#region-toolbar` / `#region-statusbar` / `#settings-view` 内；`#stream` 子树内**不得**存在任何 `[data-chrome-control]`；`#region-toolbar` / `#region-statusbar` **不得**是 `#stream` 的后代 | 静态门禁（`test/density-thresholds.test.ts`）：解析 `index.html`，断言上述两条 + `assertChromeNotInStream()` |
| **S2 豁免子树单源且冻结（静态）** | 豁免子树集合 = `DENSITY_EXCLUDED_SUBTREES = ['#stream']`，声明在 `src/ui/sidepanel/density-scope.ts`（**唯一**）；门禁从该文件读取，并在门禁内**再断言字面量相等** | 静态门禁：`density-scope.ts` 的常量 == 门禁内字面量；任何扩大 ⇒ FAIL（A3 反作弊） |
| **S3 测量源码不含布局/计算样式 API** | `DENSITY_MEASURE_SOURCE` 内**零命中** `getComputedStyle` / `offsetParent` / `getBoundingClientRect` / `aria-hidden`（继承 v3 `BANNED_MEASURE_APIS`） | 静态门禁（继承 + 重跑）；`riskVisibilityProbeSource` 是**探针**（必须用计算样式），与预算口径**分离** |
| **S4 唯一可见性判据** | 预算口径内**只有一处** `visibleIn(el)` = 「逐 `parentElement`，仅 `n.hidden === true` 返回 false」；CSS 隐身（`display/visibility/opacity/pointer-events`）、出视口、`aria-hidden` **一律不豁免** | 静态零命中断言 + RP-V4-04 反证（设 `display:none` → C1 不得下降） |
| **S5 防滥用三道（可 FAIL 反证）** | ① 单卡可点 ≤6 ② 首屏（空流欢迎态）卡片数 ≤2 ③ 欢迎卡 ≤1 张且卡内文本 ≤8 行（320px） | 逐卡计数门禁 + RP-V4-01/02/03 反证 |
| **S6 风险永不折叠 = 结构保证（语义新判据）** | `#region-statusbar` 本体无 `hidden`；`#risk-chips`（设计契约 id）与内层 `#risk-rail`（v3 id 保留，探针/归属判据入口）均无 `hidden`（零风险时 `#risk-chips` 收缩为一行、0 可点 chip）；任一类风险生效 ⇒ 有 chip 且可见；打开任意视图后 chips 仍可见；chip 详情展开**不占默认密度**；chip 点击滚动定位到流内相关卡 | `test/ui/l0.mjs`（重写）④⑤ + `test/ui/stream.mjs` 风险态 + 祖先闭包探针 |
| **S7 视图替换不改风险位** | `#region-statusbar` 是 `body` 直挂区（**不是** `#region-stream` 的后代），故视图替换（隐藏 `#stream`、显示 `#view-host`）无法触达它 | `test/ui/l2.mjs`（迁移断言）+ 祖先闭包探针 |

### 2.4 数据流变更（全部侧栏侧；SW / content 零改动）

**输入流（信息源，全部既有）**：`chrome.runtime` 消息 → `dispatch(action)`：`user` / `assistant` / `tool` / `command` / `error` / `pending` / `state` / `confirm` / `confirm-resolved` / `ask` / `ask-resolved` / `audit-count` / `history` / `notice`（**12 个 action 零删除**，只追加语义）。

**v4 转换层（新）**：

```text
dispatch(action)                                    ← 既有 action **零删除**
   └→ streamReducer(state, action) → StreamState {events: StreamEvent[], seq, openAsks, ...}
         · append-only：事件只追加；seq 单调不复用（跨会话切换**不重置**）
         · 终态冻结：terminal 一旦写入不可再改；后续事实 → 新事件行（system）或新卡（ref 重拾）
   └→ project(StreamState, RefStore, Probe, Counts) → CardView[]（纯函数、确定性 ⇒ 可回放等价）
   └→ streamRender(cards) → 增量 DOM（append 新卡 / patch 终态；**永不 textContent=''**）
   └→ statusbar.render(riskRows, connectionState) / toolbar.render(counts) / viewHost.syncCounts()
```

**用户流（写）**：卡内 chip / 输入框 / 授权按钮 → **同一生产入口**（`submitAsk` / `resolveConfirm` / `requestTurn`）→ 追加终态事件（`ask-answer` / `ask-cancel` / `auth-decision`）→ 复用既有 SW 通道回传（`ask-user-response` / `confirm-response`），**SW 侧语义零变更**。

**引用流（复用 R3 范式）**：页面侧 `pick-layer.js`（**零改动**）上报原始事实 → `l1/ref-store.ts`（**判定权威唯一**，五维 + fail-closed，**零语义变更**）→ v4 新增**投影点事件**（`ref` 事件携带 `{refId, refNum, state, why?}` + 指向 ref-store 的 `refId`）→ 流内 `ref` 卡；失效 → 旧卡冻结为 `stale` + 新 `system` 事件行 + 恢复路径；重拾/重锚 → **新 `ref` 卡**（`refNum+1`），旧卡零改动。

**持久化流（面板侧，零 SW 改动）**：`StreamState`（全量，内存）→ `stream-digest.ts` 投影为**零明文摘要**（字段白名单：`seq/ts/kind/terminal/cardKey/label(截断)/tool/ok/ms/refNum/askRequestId`）→ `chrome.storage.local`（**已有 `storage` 权限**；key 命名空间 `web-cli` 下 `stream-digest:<sessionId>`；**零新增权限**）→ 会话切换 / 面板重开时读回并**降级重建**（缺失正文显式登记为截断，不编造）。

**披露流（重定标）**：`disclosure.ts` 的 9 组 wiring 大部被取代 → 收敛为「卡内展开 + 设置视图内展开」；`NEVER_FOLDABLE` 语义保留并**扩展**为 `['region-statusbar','risk-chips','risk-rail','stream','view-host','settings-view']`（`#log`/`#composer`/`#panel-*` 退役 → 台账登记；`#risk-rail` **保留**为内层风险行容器）。

### 2.5 依赖关系图

```text
v4-1（三区骨架 + 工具栏/状态栏 + 风险 chips + 密度重定标 + 门禁重定标）
   │  前置：无（首个开工）    产出契约：三区 DOM id / DENSITY_EXCLUDED_SUBTREES /
   │                          CARD_TYPES 占位宿主 / view-host 同构替换 / 主题三态 / l0+l1+l2 重写
   ▼
v4-2（append-only 事件模型 + 增量渲染 + 7 主类 + 过程卡族 + 固化契约）
   │  前置：v4-1              产出契约：StreamEvent / project() / cardKey / cards 注册表 /
   │                          stream-digest / 增量渲染器 / appendSystem API
   ├──────────────────────────────┬──────────────────────────────┐
   ▼                              ▼                              │
v4-3（ask/授权卡流内化 +             v4-4（引用/系统/推荐卡 + 拾取入口迁移 +        │
      留痕固化 + 回合语义）                  V3-VOL-3 收口锚）                        │
   前置：v4-2（不依赖 v4-4）            前置：v4-2（与 v4-3 无强耦合）                │
   └──────────────┬───────────────────────┘                                       │
                  ▼                                                                │
        父级收口（V3-VOL-3 带值闭合 + 绝对上限 vs 5% 优先级；v4-4 收口轮执行）◄─────┘
外部依赖：**零新增**（零依赖 / 零权限 / 不改 base / 不改 SW / 不改 content / 不改判定链）
```

| 顺序 | 叶子 | 前置 | 「能独立做到全门禁绿」的理由 |
|:--:|------|------|----------------------------|
| 1 | **v4-1** | 无 | 只改侧栏骨架 + 门禁重定标；**同叶内**完成 l0/l1/l2 等价改写（偏差登记 2）与 journey 保护段新 pin；风险 5 态与三档密度**不依赖** v4-2/3/4（引用失效/风险态用**注入事件**构造，同 v3 先例） |
| 2 | **v4-2** | v4-1 | 纯模型 + 渲染层；不依赖 SW 契约变更（用既有 12 个 action 喂数据）；`KIND_SET` 零 diff 由「不新增 kind」保证 |
| 3 | **v4-3** | v4-2 | 依赖 v4-2 的事件模型与固化契约，但**不依赖** ref/system 两类卡的迁移（引用/系统卡在 v4-1 已同构迁入占位宿主，v4-4 才换实现） |
| 4 | **v4-4** | v4-2（建议 v4-3 之后串行门禁） | 与 v4-3 无强耦合；**父级收口锚在其收口轮执行**（体积 + 绝对上限） |

### 2.6 与 v1 / v2 / v3 的边界（不越界清单）

- **不**改 `src/security/policy.ts` / `src/security/auto-authorize.ts`（sha256 pin 不变）；硬底线（`evaluate` deny / 未授权 origin deny / 未知 risk deny）不可覆盖；破坏性子命令**保底 ask**；`clipboard read` / `bookmarks remove` 仍 ask；`clamp` 仍在 SW 侧强制。
- **不**改 `manifest.json`（静态权限 5 项 + 可选 5 项 / **无 `contextMenus`** / 无静态 `content_scripts`）；**不**新增 `web_accessible_resources`。
- **不**改 `src/background/messaging.ts` 的 `KIND_SET`（零 diff）；若 v4 需要新 kind → 沿用**独立校验器**（先例 `insight-protocol.ts` / `content/pick-protocol.ts`）。
- **不**改 `src/content/**`（三文件内容 hash pin 不变）；**不**改 `dist/content.js`（177,076 B 无容差）/ `dist/pick-layer.js`（33,900 B）。
- **不**改 `src/background/session-store.ts` / `chat-session.ts` / `ask-bridge.ts`（60 s 语义）；v4 的持久化落在**面板侧** `chrome.storage.local`，绕过 SW 契约面。
- **不**改 `packages/web-cli-base/**`；**不**改 `options.html`；**不**新增依赖。
- **不**推翻 v3 视觉语言与设计令牌（双主题对称）；**不**推翻 `l2/counts.ts` 计数单源 / `l1/ref-store.ts` 序号单调不复用与退役留痕 / `l1/ref-validity.ts` fail-closed / `l1/receipt.ts` 零明文 / `scroll-policy.ts` 48px 跟随。
- **不**改 v1/v2/v3 SDDU 目录（`state.json` / 追加内容 / phase 一律不动）；**不**改 `docs/v3-supersession-ledger.json` / `docs/v3-density-baseline.json`（**冻结为历史**）；**不**改 `ROADMAP.md` 文本（只登记）。
- **不**动 `main`；**不** commit / push；**禁** `git add -A`；**不**提交 `.opencode/opencode.json`。

### 2.7 不动面硬约束的落地位置（**逐条指到文件与门禁**）

| # | 约束 | 落地位置 | 守线机制 |
|---|------|---------|---------|
| **T1** | `content.js` **≤ 177,076 B（余量 0、无容差）** | **无一叶触碰**：`src/content/**` 三文件与 `build.mjs` 的 `content` entry **零改动** | 既有 `evaluateContentCeiling`（无容差）+ `CONTENT_SOURCE_SHA256` 三项 hash + RP-V4-05 反证（+1 B → FAIL） |
| **T2** | `pick-layer.js` **= 33,900 B（零容差）** | v4 全在侧栏侧；页面侧拾取层**零改动** | 既有 `PICK_LAYER_*` 守卫 + RP-V4-05 |
| **T3** | manifest **零新增权限**、**无 `contextMenus`**、无静态 `content_scripts` | `manifest.json` **零 diff** | `test/zero-injection.test.ts`（27 断言保持）+ manifest 字节零 diff 断言（AC-CHAT-020） |
| **T4** | 判定链 **sha256 pin 不得变**；`KIND_SET` 零 diff；`clamp` 在 SW 侧不变 | `src/security/**` / `src/background/messaging.ts` **零 diff**；UI 层新增一律**只读投影** | sha256 pin 核对 + `KIND_SET` 零 diff + 提权控件计数 = 0 + 伪造 `sendMessage` 不能突破 clamp 的负向断言 |
| **T5** | **零明文**（含流内留痕 + 摘要落库） | `stream-digest.ts` 字段白名单 + `l1/receipt.ts#assertNoPlaintext` 复用 + `l2/audit.ts` 白名单 + URL 去参 | 零明文门禁（AC-CHAT-021）+ 摘要 schema 断言（`test/stream-persistence.test.ts`） |
| **T6** | **风险永不折叠**（语义约束，不绑定位置） | `#region-statusbar` body 直挂 + **嵌套** `#risk-chips`（设计契约 id）> `#risk-rail`（v3 id 保留）+ 祖先闭包探针 | S6 + `test/ui/l0.mjs` ④⑤ + AC-CHAT-007 |

### 2.8 编排器指定的 12 项技术设计必答 → 设计落点与 ADR 索引（**逐项对照，不漏**）

| # | 必答议题 | 设计落点（一句话结论） | 承载 ADR |
|:--:|------|---------------------|---------|
| ① | **事件流模型**（不可变结构 / seq 单调不复用 / 会话切换语义 / 落库扩展 / `chat-state` 迁移路径） | `StreamEvent{seq,ts,kind,payload,terminal?,sessionId}` 不可变；`seq` 单调**跨会话不重置**、按 `sessionId` 分段；会话切换 = **事件流分段（内存全量段保留）+ 摘要落库读回**（过程事实不丢，工具卡元数据入摘要）；落库 = **摘要落库 + 内存全量**（否决全量落库）；`chat-state.entries+nextId` **保留为派生视图**（既有 action 零删除） | **ADR-V4-002 / ADR-V4-003**（父）· ADR-V4-024 / 028（v4-2） |
| ② | **卡渲染架构**（增量渲染 / 滚动锚定 / 320px 性能 / 卡↔view-model 映射 / 过程卡族归位） | `render()` 的 `textContent=''` → **keyed 增量渲染**（`Map<cardKey, HTMLElement>`；append 新 `li` / patch 终态；**永不清空**）；滚动复用 `scroll-policy`（48px）+ 锚定；320px 长卡折行/截断；卡 = `project()` 的纯投影；过程卡族 = AI 族 5 子形态，`tool` 卡保留工具名/ok/ms/预览/折叠记忆(480B/10 行) | **ADR-V4-004**（父）· ADR-V4-025 / 026 / 027（v4-2） |
| ③ | **三区骨架**（`index.html` 改造 / `#l0-decision`·`#l0-statusbar`·`#risk-rail` 去向 / 工具栏 ≤5 静态断言 / 四视图入口迁移） | `header#region-toolbar` → `main#region-stream > ol#stream[role=log]` → `footer#region-statusbar`；`#l0-decision` 同构迁入流内 `li`（v4-3 换卡）；`#l0-statusbar` + `#l2-entries` → 工具栏 4 入口（`#l2-entry-*` id 零重命名）；`#risk-rail` → 状态栏内**嵌套** `#risk-chips`（设计契约 id）> `#risk-rail`（v3 id 保留为风险行容器 ⇒ 探针与 `isRiskClassSource` **零逻辑改动**）；工具栏 ≤5 由静态门禁断言；四视图复用 `l2/view-host.ts` 同构替换（只改 `#log`→`#stream` 绑定） | **ADR-V4-005**（父）· ADR-V4-017 / 019 / 022（v4-1） |
| ④ | **密度门禁重定标实施**（测量根 / 流骨架豁免边界 / 单卡 ≤6·首屏 ≤2·欢迎卡 ≤8 行反证 / 新登记格集 / 旧 22 格处置） | 口径 = 「`document.body` 为表达式根 + `DENSITY_EXCLUDED_SUBTREES=['#stream']` 单源排除」；三区外壳（toolbar + statusbar + stream 骨架层）计入；**新登记格 31 格**（9 强制 + 15 风险 + 3 空态 + 3 风险详情展开 + worst 1）+ 阶段 F 比对 + 逐卡动态格；旧 22 格 = **冻结保留为 v3 历史 + v4 新文件重建 + 差异登记**（推荐） | **ADR-V4-006 / 007**（父）· ADR-V4-020 / 021（v4-1） |
| ⑤ | **journey 保护段操作流程**（old sha → 新断言集 → 台账登记字段 / v2 量化红线重定标） | journey `42766..54004` **显式取代 + 新 pin**：`#15a~#15q` 同编号等价改写（`#15b` ≥65% **语义保留**、`#15c` composer 贴底 → **法四「默认屏无可见常驻输入框」**显式取代、`getElementById('log')→('stream')`）；登记字段 = `{oldSha256, newSha256, supersededFrom, supersededOn, reason, decision}`；binding 段 **保留零改** | **ADR-V4-008**（父）· ADR-V4-023（v4-1） |
| ⑥ | **ask/授权流内化**（单槽 → 事件化状态机 / 全终态留痕 / 60s 与取消 / `supersededAsk` 升级 / `AskDialog`→卡组件 / **busy 语义**） | `ask`/`confirm` 单槽**不删除**（作为「当前未答卡」的便捷视图），但事实源 = 事件；终态枚举 `answered / canceled(user|timeout|superseded) / approved / rejected` **全部留痕**；`MAX_OPEN_ASKS = 2`（= R1 现场观测上限）；`pending` 只门控**发送新回合**与**推荐 chip**，**不门控**已有 ask 卡的提交（消除「永远卡在处理中」）；SW `ask-bridge` 60 s 语义**零变更**（面板侧投影） | **ADR-V4-030 / 031 / 032**（v4-3） |
| ⑦ | **引用卡/系统事件行/推荐卡**（ref-store 投影几处 / 6 strips + risk-rail 事件源归并通道 / 推荐生产者时机 / `#l0-pick` 消失后重拾救援入口迁移） | ref 投影 **三处 → 保持三处（重排：页面侧角标 / 流内 ref 卡含证据层 / 状态栏风险 chip）**——**不新增第四处**（否决：更多投影点 = 更多漂移面；R-CHAT-003 教训）；6 strips + risk-rail + 导航失效 + 探测态 → `appendSystem(kind, text)` 单一通道 → `system` 事件行（`HH:MM:SS` + 只追加 + 去重窗口 + 速率上限 + 丢弃计数登记）；推荐生产者时机 = 拾取后 / 引用失效后 / 空闲时 / 首装；`#l0-pick` 退役 → `requestPick()` **单一生产入口**（页面侧可达 + 未授权设置视图引导） | **ADR-V4-035 / 036 / 037 / 038**（v4-4） |
| ⑧ | **体积与冻结面**（各叶触碰面 / 每轮 5% 中间重登记 / V3-VOL-3 闭合序列） | v4 全在侧栏侧（`src/ui/sidepanel/**` + `index.html` + `test/**` + `docs/**` + `package.json#scripts`）；SW/content/判定链/`KIND_SET` **零触碰**；每叶收尾做**五要素中间重登记**（容差 5% 不动）；V3-VOL-3 由 v4-4 收口轮**带值闭合**（实测 → 上取整 50 KB 档 × 1.10 → 作者一句确认 → `resolved:true` 三值齐备） | **ADR-V4-010**（父）· ADR-V4-039 / 040（v4-4） |
| ⑨ | **测试架构**（l0 整文件重写 / l1 入口机制重写 / journey 迁移 / `sidepanel-view.test.ts` 4 契约重写 / 新门禁文件 / gate-integrity 登记联动 / shim 60 断言门禁化） | 保留**文件名**（l0.mjs/l1.mjs/l2.mjs/density.mjs）以保住 `v3GateFloors` 判据；**同叶内**重写并只增；新增 `test/ui/stream.mjs` / `test/ui/recommendation.mjs` 加入 `EXPECTED_AUDITED_FILES`（**不动 `CHROMIUM_GATES.length===9`**，沿用 `page-input.mjs` 先例）；新增 node 门禁 `test/stream-model.test.ts` / `stream-persistence.test.ts` / `recommendation-sources.test.ts` / `design-contract.test.ts`；反证走**in-gate 形态**（`density.mjs --reverse RP-V4-01..06`），登记为既有 in-gate 例外的**扩展**（不改 `readReverseProofLedger` 的硬编码路径） | **ADR-V4-011**（父）· ADR-V4-023（v4-1）· ADR-V4-029（v4-2） |
| ⑩ | **过程卡族固化语义**（append-only + 终态冻结；状态迁移允许） | `StreamEvent` **不可变**；「进行中→完成」= **追加后续事件**（`tool-result` / `thinking-done`）驱动**投影**更新，**不是**改写事件；卡 `terminal` 一旦写入即冻结，后续变化 = 新事件行 / 新卡 | **ADR-V4-012 / 013**（父）· ADR-V4-027（v4-2） |
| ⑪ | **AC-CHAT-016 授权回看单一归属** | 归 **v4-3**（confirm 授权卡 + 站点授权回看面）；v4-1 只提供**设置视图入口**（不含该 AC 验收）；v4-4 在引用/推荐上下文内**只读引用** v4-3 契约 | **ADR-V4-014**（父）· ADR-V4-033（v4-3） |
| ⑫ | **首屏 ≤2 / onboarding 冲突 + 空态欢迎卡边界 + 推荐真值派生 + 绝对上限优先级 + journey ≥65% 可达性** | 首装态 = **独立登记格（firstRun 档）**，onboarding/discovery-notice 以流内卡承载并计入该档；「首屏 ≤2」**只约束 default 档**；空态 = **独立登记格**（不与 default 混算）+ 欢迎卡 ≤1 张 / ≤8 行；推荐卡**禁止依赖设置项计数类真值**（白名单 7 项）；**绝对上限是硬墙、5% 公式是轮内软纪律**，并存时 `min(绝对上限, floor(当前×1.05))`；journey ≥65% **不裁决、要求前置 spike 验证**（不可达 → 停下上报，禁静默弱化） | **ADR-V4-007 / 010 / 015 / 016**（父）· ADR-V4-021 / 023（v4-1）· ADR-V4-037（v4-4） |

### 2.9 体积核算与中间重登记策略（守住不动面 + V3-VOL-3 收口）

**A. `dist/content.js`（177,076 B，无容差）**

| 项 | 结论 |
|---|---|
| v4 是否触碰？ | **否**。`src/content/{content-script,dom-agent,page-bridge}.ts` 零改动；`build.mjs` 的 `content` entry 定义不变 → 产物字节不变、`CONTENT_SOURCE_SHA256` 三项 hash 不变。**零容差红线通过「让它不变」而非「重登记」守住**。 |
| `KIND_SET` 是否会被触碰？ | **否（设计上排除）**。v4 的流事件全部是**面板内模型**，不新增 SW↔面板 kind；`appendSystem` 也只在面板内使用。若某叶发现必须新增 kind → **立即停下上报**，改走独立校验器 + 独立消息面（先例 `pick-protocol.ts`）。 |
| 守线门禁 | T1（无容差）+ T4（`KIND_SET` 零 diff + 三文件 hash pin）+ RP-V4-05（+1 B → FAIL） |

**B. `dist/pick-layer.js`（33,900 B，零容差）**

| 项 | 结论 |
|---|---|
| v4 是否触碰？ | **否**。页面侧拾取层（Shadow DOM / 手势 / 右键自绘 / 注入幂等）**零改动**；v4-4 只改**面板侧**的拾取入口归属（`requestPick()` 单一入口），页面侧入口保持可达。 |
| 守线门禁 | 既有 `PICK_LAYER_*`（零容差）+ `test/ui/page-input.mjs`（102）+ T2 |

**C. `dist/sidepanel.js`（基线 375,102 / ceiling 393,857 = ×1.05）**

| 叶 | 预估增量（**粗估，非承诺**） | 组成（净增 − 退役抵扣） | 中间重登记 |
|---|---|---|---|
| v4-1 | **+6~11 KB** | 净增：三区外壳 + toolbar/statusbar/theme + 密度豁免单源 + 归属迁移接线；净减：`#panel-top`/`#l0-status-bar`/`#l2-entries` 旧 wiring 与 `l0/shell.ts` 重写 | 是（五要素） |
| v4-2 | **+9~15 KB** | 净增：`stream-model` + `stream-render` + `cards/*` + `stream-digest`；净减：`render()` 全量重建逻辑退役 | 是（五要素） |
| v4-3 | **+4~7 KB** | 净增：`cards/askuser` + `cards/auth` + 状态机与超时投影；净减：`l0/decision-card.ts` 退役 | 是（五要素） |
| v4-4 | **+5~9 KB** | 净增：`cards/ref` / `cards/system` / `cards/nextstep` + `recommend.ts` + 通道归并；净减：6 strips wiring 退役 | 是（五要素）+ **收口带值闭合** |
| **合计** | **+24~42 KB → 预计 399,000~417,000 B** | 其中相当部分被「退役旧 wiring」抵扣（**净增低于源码量之和**） | — |

| 项 | 结论 |
|---|---|
| 降重杠杆（先用尽） | ① 静态骨架/模板落 `index.html`（**不在 `sidepanel.js` 守卫口径**）且在 `hidden` 子树内（不污染密度）；② 复用既有 `view-model.ts` / `l2/counts.ts` / `l1/ref-store.ts` / `scroll-policy.ts` / `markdown.ts`，**不新建重复渲染层**；③ `cards/*` 共用单一模板函数与单一 CSS class 体系，不为每卡型写一套；④ **不引入任何新依赖**（NG-CHAT-005）。 |
| 若仍超 ceiling | 按 ADR-V4-010 走**显式重登记**（五要素：前值 / 新值 / 日期 / 来源 + 构建命令 / 理由 + 历史保留），容差 5% 不变、断言零删减、`targetBudgetBytes`/`targetMet` 保持 `null`。**禁止**：放宽容差 / 删断言 / 用「基线 ≠ 目标预算」偷换。 |
| **V3-VOL-3 收口（v4-4）** | 见 ADR-V4-010 第 5~8 条 + ADR-V4-039：`PENDING_ABSOLUTE_CAP` 置 `resolved:true` + 三值齐备；`absoluteCeilingBytes = ceilTo50KB(B_final) × 1.10`；判定改为 `min(absoluteCeilingBytes, floor(currentBaseline × 1.05))`；`SIDEPANEL_CEILING_CAP` 保持 `record-only` **不被读取**。 |

---

## 3. 方案对比

> 结论集中在 §4；ADR 编号见 §7。

### 3.1 P-V4-01 事件流模型的「事件 vs 卡」关系

| 维度 | **方案 A：事件不可变 + 投影可变至终态（卡 = 纯投影）** | 方案 B：卡记录本身 append-only（完成时另加一张「完成卡」） | 方案 C：事件可变（`seq` 复用 + 原地改写 payload） |
|------|:--|:--|:--|
| 描述 | `StreamEvent` 写入即冻结；`project(events)` 产出 `CardView[]`；`tool-result` / `thinking-done` / `ask-answer` 是**新事件**，投影把它们并回同一 `cardKey` 的卡上；卡 `terminal` 一旦非空即冻结 | 每个事实一张新卡（「工具开始」「工具结束」两张卡） | 事件对象原地改字段；`render()` 从可变 state 重建 |
| 优点 | ① 事件日志真不可变 ⇒ **回放等价**（同一序列 ⇒ 同一可见流）② 「状态迁移允许」与「append-only」同时成立（**裁决 1 的精确实现**）③ 卡数 = 语义数（不翻倍）⇒ 保住首屏 ≤2 与长会话可读性 ④ 与 R3 的 ref-store 范式同构 | 事件与卡 1:1，实现最简 | 代码改动最小 |
| 缺点 | 投影层必须显式实现「终态冻结」不变式（需单测锁死） | 卡数翻倍 → **首屏 ≤2 / 长会话可读性直接冲突**；「工具名 + 状态 + 耗时 同卡」契约（FR-CHAT-035 / `journey.mjs#15g`）被拆散 | **直接违反 FR-CHAT-020**（不可变 / 无置 null 路径）与 NFR-CHAT-001（回放等价） |
| 风险 | 低（投影不变式可机器验证） | 中高（与两条 AC 冲突） | **不可接受** |
| 工作量 | 中 | 小 | 小但方向错 |

### 3.2 P-V4-02 流事件的持久化范围

| 维度 | **方案 A：摘要落库 + 内存全量（面板侧 `chrome.storage.local`）** | 方案 B：全量事件落库（`storage.session` / `local`） | 方案 C：纯内存（不落库） |
|------|:--|:--|:--|
| 描述 | 事件全量只在面板内存；落库一份**零明文摘要**（字段白名单），按 `sessionId` 分键，`bound` + LRU 20 会话；切换/重开时降级重建 | 事件（含 payload 全文）全量序列化落库 | 只保内存，面板关闭即丢 |
| 优点 | ① **零明文边界最易守**（白名单字段结构化，不含正文/参数体/URL query）② 与既有 `boundHistory`（40 轮）+ `MAX_SESSIONS`（20 LRU）纪律兼容，配额可控 ③ **不触碰 SW**（FR-CHAT-026 / `KIND_SET` 零 diff）④ 满足 NFR-CHAT-012「至少内存 append-only + 会话内可回放」 | 重开后流完全还原 | 零存储成本、零明文风险 |
| 缺点 | 重开后卡**正文**降级为截断摘要（**必须显式登记为截断规则**，禁静默） | ① 存储配额不可控（事件数 × payload）② **零明文风险最高**（payload 含 prompt / 命令摘要 / 引用文本）③ 需 SW 或额外通道配合会话归属 | 与 G-CHAT-003「授权可回看」张力；`EC-CHAT-003` 的截断规则仍要登记 |
| 风险 | 低（截断规则登记即可） | **高**（零明文 + 配额 + 体积不可控） | 中 |
| 工作量 | 中 | 中高 | 低 |

### 3.3 P-V4-03 会话切换语义

| 维度 | **方案 A：全局单调 `seq` + `sessionId` 分段 + 内存段保留** | 方案 B：切换即清空事件流（沿用 `history` 整体替换） | 方案 C：切换时把旧段全量落库后清内存 |
|------|:--|:--|:--|
| 描述 | `seq` 跨切换**不重置**；切换时追加 `system` 行「会话已切换」并开始新段；旧段事件**仍在内存**（可上滚回看），并按 `sessionId` 增量落摘要 | `entries` 与 `events` 同时清零后从 `history` 重建 | 切换前把旧段全量摘要落库再清内存 |
| 优点 | ① FR-CHAT-024「会话切换不得丢过程事实」**结构成立**（`tool`/`ok`/`ms` 都在内存事件里）② `seq` 全局单调 ⇒ 「id 单调不复用」无歧义 ③ 上滚可回看全部（含切换前） | 内存最省 | 内存最省 + 有留痕 |
| 缺点 | 内存随会话数增长 → 需 `boundStreamEvents`（如 2000 事件）并显式登记截断 | **直接违反 FR-CHAT-024**（`history` 丢 `ok`/`ms`/`tool`）；EC-CHAT-003 被破坏 | 切换时落库是同步阻塞点；重开前旧段不可回看 |
| 风险 | 低（截断规则登记 + 单测锁 bound） | **不可接受** | 中 |
| 工作量 | 中 | 小但方向错 | 中 |

### 3.4 P-V4-04 三区骨架的 DOM 迁移形态（`#log` / `#l0-decision` / `#risk-rail`）

| 维度 | **方案 A：同构迁入 + 逐步换实现（v4-1 保宿主与 id，后续叶换内容）** | 方案 B：v4-1 一次性删净旧 L0/L1 骨架，v4-2/3/4 从零重建 | 方案 C：保留 `#log`/`#l0-decision` 作兼容别名（双份 DOM） |
|------|:--|:--|:--|
| 描述 | v4-1 落三区骨架，把被取代的容器（`#ask`/`#confirm`/`#l1-ref` 证据层/`#l1-more`/`#l1-receipt`/`#l1-history`/`#l1-local-tree`/`#l1-gestures`）**同构迁入 `ol#stream` 内的 `li` 占位宿主**（id / 类名 / ARIA 对全保留，带 `data-transitional-host` 标记）；v4-2 引入事件模型与卡组件，v4-3/v4-4 逐个把宿主内容换为卡实现 | v4-1 删除全部旧骨架（含 ask/confirm 宿主），中间态由后续叶补齐 | `#log` 与 `#stream` 双份、`#l0-decision` 与流内卡双份，靠 CSS 择一显示 |
| 优点 | ① **每叶可独立全门禁绿**（EC-CHAT-013）：宿主先在，l0/l1 断言只需**重锚选择器 + 前置展开**，不需重写语义 ② 中间态**能力零丢失**（NG-CHAT-006）③ 取代面从「选择器重写」降为「重锚」（v3 S5 纪律延续）④ 每叶 diff 更小、台账更好登记 | 概念最干净（无过渡态） | 迁移期两端都能命中旧选择器 |
| 缺点 | 存在「占位宿主」过渡形态，需在台账与文档显式登记其**生命周期与退役叶**（R4-18 已给出结构性防护） | **v4-1 收尾时 ask/confirm 无宿主 ⇒ 功能断裂且 l0/l1 必然红灯 ⇒ 违反 EC-CHAT-013**；取代面一次性巨大，台账不可控 | **双份 DOM = 双源真相**（正是 R-CHAT-003 要避免的漂移源）；密度 C4 / 祖先闭包探针出现歧义 |
| 风险 | 低（过渡态可登记、可机器识别、可强制清零） | **高**（纪律违规） | **高**（口径歧义） |
| 工作量 | 中（分 4 叶摊薄） | 高（集中在 v4-1） | 中但成本在长期 |

### 3.5 P-V4-05 密度豁免的实现方式

| 维度 | **方案 A：单表达式 + 排除子树单源（`DENSITY_EXCLUDED_SUBTREES=['#stream']`）** | 方案 B：只测三区外壳三元素自身（`#region-*` 直接子元素） | 方案 C：把流子树设 `aria-hidden` / `display:none` 后测量 |
|------|:--|:--|:--|
| 描述 | 沿用 v3 的「CDP 注入单表达式 + 根表达式」骨架，新增「**祖先链命中排除子树即跳过**」；排除集合声明在 `src/ui/sidepanel/density-scope.ts`（唯一），门禁读取并**再断言字面量** | 测量根改为三个 `#region-*` 元素，逐元素测量后求和 | 靠 CSS / ARIA 让流内容「不可见」以从计数中消失 |
| 优点 | ① 口径**单源**（一处声明、门禁读取）② 复用 v3 实现骨架与反证判定器（spec §9.4 要求）③ C1~C4 定义完全继承（只改范围）④ 可做 A3 反作弊（S1/S2） | 语义字面同源 | 改动最小 |
| 缺点 | 需要「祖先链命中即跳过」的实现 + 一条静态断言（成本低） | 三根求和会**漏掉**「三区之外」的常驻元素（如 `#view-host` header / `#settings-view` 可见部分）→ 密度可被绕过 | **直接违反 FR-CHAT-071**（CSS/ARIA 隐身不豁免）+ v3 RP-V3-03 已证伪 |
| 风险 | 低 | 中（口径漏洞） | **不可接受** |
| 工作量 | 低 | 低 | 零 |

### 3.6 P-V4-06 旧 22 登记格的处置

| 维度 | **方案 A：v3 基线冻结为历史 + v4 新文件重建 + 差异登记（保留共存）** | 方案 B：原地改写 `docs/v3-density-baseline.json` 为 v4 口径 | 方案 C：删除 v3 基线文件 |
|------|:--|:--|:--|
| 描述 | 新建 `docs/v4-density-baseline.json`（新口径 + 31 格），v3 文件**逐字保留**并由 `test/density-thresholds.test.ts` 继续做 schema 保真断言；v4 文件内登记「与 v3 的差异与理由」 | 直接覆盖 v3 文件 | 删除 |
| 优点 | ① 逐字符合父 spec §9.4 / FR-CHAT-074「新建 v4 基线文件，不改写 v3 基线」② 历史可审计（v3→v4 口径变化可机器比对）③ 满足 R-CHAT-004 的「换口径重定标而非放宽」举证要求 | 单一文件 | 最少文件 |
| 缺点 | 两份文件并存（需在 v4 文件里显式说明**判定只读 v4**） | **违反 FR-CHAT-074**；v3 历史丢失；口径变化不可审计 | **违反纪律**（历史不可删） |
| 风险 | 低 | 中高（纪律违规） | 高 |
| 工作量 | 低 | 低 | 零 |

### 3.7 P-V4-07 journey ≥65% 可达性的处置

| 维度 | **方案 A：前置 S 级 spike 实测，不可达则停下上报（裁决 7）** | 方案 B：直接按 65% 写断言，若不达标再改 | 方案 C：把阈值下调到实测值 | 方案 D：把该断言移出保护段并删除 |
|------|:--|:--|:--|:--|
| 描述 | v4-1 第一任务 = TASK-401 同款 spike：三宽度 × 双主题 × 风险 chips 展开态实测「工具栏 + 状态栏占用高度」，验证流区 ≥65% 可达；**不可达 → 停下上报编排器** | 先实现，收口时若 FAIL 再议 | 由实现者自行下调阈值 | 删除该 v2 量化红线 |
| 优点 | ① 前置暴露不可达风险，避免 4 叶做完才发现 ② 上报路径明确（禁静默弱化）③ 与 v3 `ADR-V3-035` spike 先例同形 | 快 | 立刻变绿 | 立刻变绿 |
| 缺点 | 多一个 spike 任务（S 级，成本可控） | 可能返工 4 叶 | **静默弱化红线**（明确违反裁决 7） | **删除既有量化红线**（违反 FR-CHAT-082「语义保留」） |
| 风险 | 低 | 中高 | **不可接受** | **不可接受** |
| 工作量 | 低（spike） | 中 | 零 | 零 |

### 3.8 P-V4-08 新 Chromium 门禁与元门禁的挂载方式

| 维度 | **方案 A：新门禁加入 `EXPECTED_AUDITED_FILES`，`CHROMIUM_GATES` 保持 9** | 方案 B：把新门禁加入 `CHROMIUM_GATES`（9 → 11） | 方案 C：不加登记，靠 marker 扫描自动纳入 |
|------|:--|:--|:--|
| 描述 | `test/ui/stream.mjs` / `test/ui/recommendation.mjs` 追加进 `EXPECTED_AUDITED_FILES`（该常量**无长度断言**，扫描集合须为其超集）；`CHROMIUM_GATES` **保持 9** | 同时改 `CHROMIUM_GATES` 与 `assert.equal(len, 9)` | 什么都不做 |
| 优点 | ① **FR-CHAT-084「`CHROMIUM_GATES.length === 9` 保持」逐字满足** ② 新门禁仍被元门禁**强制审计**（R1a~R4d 全过）③ 沿用 `page-input.mjs` / `zero-injection.mjs` / `l1-reverse.mjs` / `l2-reverse.mjs` 既有先例 ④ 只增不减 | 语义上「已知门禁」集合更完整 | 零改动 |
| 缺点 | `CHROMIUM_GATES` 的字面列表不再包含全部 Chromium 门禁（**须在注释中如实说明**，否则会被读成遗漏） | **破坏 FR-CHAT-084 的字面约束**（需登记为偏差）；改 `assert.equal` 数值属「改判据」 | 新门禁若被改名/删除**不可见**（元门禁出现盲区） |
| 风险 | 低（注释如实登记即可） | 中（字面违规 + 判据变更） | 中高（保护盲区） |
| 工作量 | 低 | 低 | 零 |

---

## 4. 推荐方案

| 开放点 | 推荐 | 理由 |
|--------|------|------|
| P-V4-01 事件/卡关系 | **方案 A**（事件不可变 + 投影可变至终态） | 唯一同时满足 FR-CHAT-020（不可变/可回放）与裁决 1（状态迁移允许）的形态；且卡数不翻倍，保住首屏 ≤2 与长会话可读性 |
| P-V4-02 持久化范围 | **方案 A**（摘要落库 + 内存全量） | 零明文边界最易守 + 配额可控 + **不触碰 SW/KIND_SET**；NFR-CHAT-012 只要求「至少内存 + 会话内回放」；截断规则显式登记即可 |
| P-V4-03 会话切换 | **方案 A**（全局 seq + sessionId 分段 + 内存段保留 + bound 登记） | 唯一让 FR-CHAT-024（不丢工具元数据）**结构成立**的方案；`seq` 全局单调消除 id 口径歧义 |
| P-V4-04 骨架迁移 | **方案 A**（同构迁入 + 逐步换实现） | 唯一让**每叶独立全门禁绿**（EC-CHAT-013）与**能力零丢失**（NG-CHAT-006）同时成立的形态；把取代面从「语义重写」降为「选择器重锚」 |
| P-V4-05 密度豁免 | **方案 A**（单表达式 + 排除子树单源） | 复用 v3 骨架与反证判定器（spec §9.4）；豁免单源可反作弊（A3）；B 有口径漏洞、C 已被 v3 证伪 |
| P-V4-06 旧 22 格 | **方案 A**（冻结保留 + v4 新文件重建 + 差异登记） | FR-CHAT-074 的逐字要求；历史可审计（举证「换口径不是放宽」） |
| P-V4-07 journey ≥65% | **方案 A**（前置 spike + 不可达停下上报） | 裁决 7 的逐字要求；B 返工风险、C/D 属静默弱化（禁） |
| P-V4-08 门禁挂载 | **方案 A**（加入 `EXPECTED_AUDITED_FILES`，`CHROMIUM_GATES` 保持 9） | 唯一**逐字满足 FR-CHAT-084** 且不出现元门禁盲区的形态 |

**编排器决策登记（本轮定论，作为设计约束，不重新讨论）**：

| # | 事项 | 裁决 | 在本 plan 的承载体 |
|---|------|------|------------------|
| **D-P-V4-01** | 设计基准 | **F 稿 + shim 60 断言 = 设计契约**；A~E 稿存档保留、不推翻 | ADR-V4-005 / 006 / 013 |
| **D-P-V4-02** | 三区模型 | 工具栏（常驻导航，≤5 可点，禁一次性交互）+ 聊天流（`ol#stream[role=log]`，唯一交互面，append-only）+ 状态栏（连接状态 + 风险 chips，永不折叠） | ADR-V4-005 · ADR-V4-017/018/019（v4-1） |
| **D-P-V4-03** | 卡分类学 | **7 主类 + 过程卡族**（`tool`/`command`/`thinking`/`error`/`notice` 为 AI 族子形态）；全形态保留 + 适用固化契约；`CARD_TYPES` 扩展须登记设计契约变更 | ADR-V4-013 · ADR-V4-026/027（v4-2） |
| **D-P-V4-04** | 不动面（三元组 + 安全） | `content.js` 177,076 无容差 · `pick-layer.js` 33,900 · manifest 零新增权限且无 `contextMenus` · 判定链 pin · `KIND_SET` 零 diff · 风险永不折叠 · R1/R2/R3 语义 | ADR-V4-010 · §2.7（T1~T6） |
| **D-P-V4-05** | 密度新口径 | 测量根 = 三区外壳；**流内容不计入**；豁免边界只认 `hidden`；防滥用 ① 单卡 ≤6 ② 首屏 ≤2；阈值 `7/15 · 9/20 · 17/35` 保留并全部登记格重算 | ADR-V4-006/007 · ADR-V4-020/021（v4-1） |
| **D-P-V4-06** | 叶子拆分与顺序 | `v4-1 → v4-2 → {v4-3, v4-4}`（可并行分解、门禁严格串行）；每叶全门禁绿；V3-VOL-3 = 父级收口锚，由最后完成叶执行 | ADR-V4-011 · ADR-V4-023/039 |
| **D-P-V4-07** | 取代与体积纪律 | 取代走台账（按行判定 + 计数不减 + `leafBases` 双段）；每叶五要素中间重登记，容差 5% 不动；不设未经要求的自缚装置 | ADR-V4-009/010 · ADR-V4-040（v4-4） |

**编排器对 spec 阶段 7 条新风险的裁决（逐条 → ADR 显式消解，含风险编号）**：

| # | 风险 / 事项 | 裁决（定论） | 消解 ADR |
|---|------|------|---------|
| **1** | **过程卡族固化语义**（R-CHAT-006 的卡侧） | = **append-only + 终态冻结**：卡实体只追加不删除；进行中→完成的**状态迁移允许**（工具卡写 `ok`/`ms` 是状态迁移非撤销）；到达终态（已答 / 已批准 / 已拒绝 / 已失效 / 已完成）后冻结，后续变化 = 新事件行 / 新卡，**不改写终态卡** | **ADR-V4-012**（父）· ADR-V4-027（v4-2）· ADR-V4-030（v4-3） |
| **2** | **AC-CHAT-016 授权回看单一归属** | 归 **v4-3**（confirm 授权卡 + 站点授权回看面）；**v4-1 设置视图只提供入口、不含该 AC 验收**；v4-4 在引用/推荐上下文内展示授权状态时**只读引用 v4-3 契约** | **ADR-V4-014**（父）· ADR-V4-033（v4-3） |
| **3** | **首屏 ≤2 与 onboarding 冲突** | 沿用 v3 三档口径 —— **首装态独立登记格（firstRun 档）**；onboarding / discovery-notice **以流内卡承载并计入 firstRun 档**；「首屏 ≤2」**只约束 default 档** | **ADR-V4-007**（父，第 3 条）· ADR-V4-021（v4-1） |
| **4** | **空态欢迎文案边界** | 空态欢迎**必须收敛为 ≤1 张欢迎卡**，卡内文本 **≤8 行（320px，即 ≤272 字符）**；空态作为**独立登记格**纳入密度基线（**不与 default 混算**） | **ADR-V4-007**（父，第 4 条）· ADR-V4-021（v4-1） |
| **5** | **推荐卡真值派生约束** | 推荐卡**禁止依赖设置项计数类真值**（避开 v3 F6 豁免坑）；**只允许面板级可得真值**：引用状态 / 会话状态 / 站点授权态 / 命令档案静态面（+ 探测状态 / 五类风险 / onboarding 步骤） | **ADR-V4-015**（父）· ADR-V4-037（v4-4） |
| **6** | **绝对上限 vs 5% 公式优先级** | **绝对上限是硬墙，5% 公式是轮内软纪律**；二者并存时取 `min(绝对上限, floor(当前 × 1.05))`；V3-VOL-3 闭合后 absolute cap 生效即为此语义 | **ADR-V4-010**（父，第 5 条）· ADR-V4-039（v4-4） |
| **7** | **journey ≥65% 占比可达性** | **不裁决、要求前置验证**：v4-1 任务清单必须含一个 **S 级 spike**（TASK-401 同款）：三宽度 × 双主题 × 风险 chips 展开态下实测「工具栏 + 状态栏占用高度」，验证流区 ≥65% 可达；**若不可达 → 停下上报编排器**（显式取代 or 参数微调由编排器裁决，**不得静默弱化**） | **ADR-V4-016**（父）· ADR-V4-023（v4-1，spike 规程） |

---

## 5. 文件影响分析（聚合；叶子级明细见各叶 `plan.md` §5）

> 全部为**新增 + 追加**型改动；**零删除既有断言**（唯一允许的「改写」= 既有门禁文件的**同编号等价改写 + 台账登记**）。路径相对仓库根。**v4 全部改动落在侧栏侧**：`packages/web-cli-plugin/src/ui/sidepanel/**` + `test/**` + `docs/**` + `package.json`（仅 scripts）+ 本 Feature SDDU 目录。

| 操作 | 文件路径 | 说明 | 叶子 |
|:--:|------|------|:--:|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/stream-model.ts` | `StreamEvent` 不可变结构 + `StreamState` + `appendEvent` + `project()` 纯函数 + 终态冻结不变式 + `boundStreamEvents` | v4-2 |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/stream-render.ts` | keyed 增量渲染器（`Map<cardKey, HTMLElement>`；append/patch；**永不清空**）+ 滚动锚定接线 | v4-2 |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/cards/index.ts` | `CARD_TYPES` **单一登记**（7 主类 + 5 过程族）+ `data-msg-type` 契约 + 卡工厂注册表 | v4-2 |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/cards/{ai,user,system,tool,command,thinking,error,notice}.ts` | 卡组件（`.card-fixed` / `.ts` / `data-*` 固化契约；工具卡字段与折叠记忆 480B/10 行） | v4-2 |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/cards/{askuser,auth}.ts` | ask（choice/text）与授权卡（范围后果预演 + 审计入口 + 两态固化） | v4-3 |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/cards/{ref,system,nextstep}.ts` | 引用卡（有效/失效/恢复路径）/ 系统事件行 / 推荐卡（chips 即指令） | v4-4 |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/stream-digest.ts` | 摘要落库（零明文字段白名单 + bound + LRU + 会话切换还原 + 降级重建） | v4-2 |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/toolbar.ts` | 工具栏（站点摘要只读 + 4 视图入口带计数徽标 + 主题切换；准入 ≤5） | v4-1 |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/statusbar.ts` | 状态栏（连接状态一行 + 风险 chips + chip 详情 + 滚动定位流内卡） | v4-1 |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/theme.ts` | 主题三态（`data-theme` + **已有 `storage`** 持久化 + 失败降级跟随系统） | v4-1 |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/density-scope.ts` | **豁免子树单源** `DENSITY_EXCLUDED_SUBTREES=['#stream']` + 三区外壳常量 + `MAX_CLICKABLES_PER_CARD=6` / `MAX_FIRST_SCREEN_CARDS=2` / `MAX_WELCOME_CARDS=1` / `MAX_WELCOME_LINES=8` | v4-1 |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/recommend.ts` | 推荐生产者（真值白名单）+ 规则表 + 优先级 + 上限 + 无候选不渲染 + 安全边界 | v4-4 |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/index.html` | **三区骨架重构**（`header#region-toolbar` / `main#region-stream > ol#stream[role=log]` / `footer#region-statusbar`；`#l0-decision`/`#ask`/`#confirm`/`#l1-*` **同构迁入流内 `li` 宿主**并带 `data-transitional-host`；管理操作迁入 `#settings-view`；`id` 零重命名，**唯一例外** `#log` → `#stream`） | v4-1→v4-4 |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` | `render()` 全量重建 → 增量渲染接线；三区挂载；`submitAsk`/`resolveConfirm` → 终态事件；6 strips + `notice` → `appendSystem`；`requestPick()` 单一入口 | v4-1→v4-4 |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/chat-state.ts` | `entries+nextId` **保留为派生视图**（既有 12 个 action **零删除**）；`ask`/`confirm` 单槽语义保留为「当前未答卡」便捷视图 | v4-2 / v4-3 |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/view-model.ts` | 三区视图模型 + 卡视图模型 + 回合语义 + `sendDisabledReason` 口径 | v4-1→v4-4 |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/disclosure.ts` | 白名单重定标（移除退役目标，加入卡内/视图内目标）；`NEVER_FOLDABLE` 扩展为 `region-statusbar`/`risk-chips`/`risk-rail`/`stream`/`view-host`/`settings-view` | v4-1 |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/l2/view-host.ts` | `#log` → `#stream` 绑定；入口 `#l2-entry-*` 归工具栏；视图替换语义不变 | v4-1 |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/l1/ref-store.ts` | **仅追加**投影点事件接口（判定 / 序号 / 退役语义**零变更**） | v4-4 |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/l1/panels.ts` | 证据层/回执/局部树/手势/历史 → 流内卡与设置视图；`#l0-pick.click()` 复用点替换为 `requestPick()`；`rounds[]` 推断 → 事件派生 | v4-3 / v4-4 |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/pick-input.ts` | 暴露 `requestPick()` **单一生产入口**（`startPick()` 的薄封装；行为零变更） | v4-4 |
| RETIRE | `packages/web-cli-plugin/src/ui/sidepanel/l0/{shell,status-bar,decision-card,risk-rail}.ts` | 被三区外壳 / toolbar / cards / statusbar 取代 → 台账逐条登记 `old→new` | v4-1 / v4-3 |
| MODIFY | `packages/web-cli-plugin/test/ui/l0.mjs` | **整文件重写**（三区骨架 + 风险 chips 永不折叠 + 可点预算 + 豁免清单；下界 ≥73 只增） | v4-1 |
| MODIFY | `packages/web-cli-plugin/test/ui/l1.mjs` | **入口机制重写**（`L1_TRIGGERS` → 工具栏/设置视图/卡内展开；内容契约保留；下界 ≥64 只增） | v4-1 |
| MODIFY | `packages/web-cli-plugin/test/ui/l2.mjs` | 入口位置迁移断言 + 视图替换复核（下界 ≥68 只增） | v4-1 |
| MODIFY | `packages/web-cli-plugin/test/ui/density.mjs` | 口径根 + 排除子树 + **31 登记格** + 阶段 F 指向 v4 基线 + **in-gate 反证 RP-V4-01~06** | v4-1 |
| MODIFY | `packages/web-cli-plugin/test/ui/density-metrics.mjs` | 消费排除子树单源 + 新常量/新档（空态 / 风险详情展开）+ `evaluateCardBudget()` + `evaluateFirstScreen()` | v4-1 |
| MODIFY | `packages/web-cli-plugin/test/ui/journey.mjs` | **保护段显式取代 + 新 pin**（`#15a~#15q` 同编号等价改写；`#15b` ≥65% 语义保留；`#15c` → 法四）；计数 ≥167 | v4-1 |
| MODIFY | `packages/web-cli-plugin/test/density-thresholds.test.ts` | 工具栏 ≤5 静态断言 + 排除子树单源保真 + S1 归属互斥 + v3 基线 schema 保真（保留）+ v4 常量 | v4-1 |
| MODIFY | `packages/web-cli-plugin/test/sidepanel-view.test.ts` | 4 项布局契约**逐项等价或更强改写**（`#log` → `#stream`；`#panel-main` → `#region-stream`）；用例数 ≥38 | v4-1 / v4-2 |
| MODIFY | `packages/web-cli-plugin/test/gate-integrity.test.ts` | `EXPECTED_AUDITED_FILES` **追加**新门禁（**不动 `CHROMIUM_GATES.length === 9`**）；in-gate 反证例外**追加** RP-V4 说明 | v4-1 / v4-2 / v4-4 |
| MODIFY | `packages/web-cli-plugin/test/supersession-ledger.test.ts` | 读 v4 台账（与 v3 台账**并存**判定：v3 段冻结、v4 段按行判定 + `leafBases` 双段） | v4-1 |
| MODIFY | `packages/web-cli-plugin/test/size-baseline.ts` | 各叶五要素**中间重登记**；v4-4 收口轮 `PENDING_ABSOLUTE_CAP` **带值闭合** + `evaluateSidepanelSize` 改为 `min(绝对上限, floor(基线×1.05))` | v4-1→v4-4 |
| MODIFY | `packages/web-cli-plugin/test/size-ruling-vol3.test.ts` | **追加** `min()` 优先级断言 + 反证（**只增**） | v4-4 |
| MODIFY | `packages/web-cli-plugin/test/perf-budget.test.ts` | **追加**长会话（40 轮 × ~8 事件 ≈ 320 `li`）增量渲染不回退断言 | v4-2 |
| MODIFY | `packages/web-cli-plugin/package.json` | **追加** scripts：`test:stream` / `test:recommendation` / `test:ask-auth`（**依赖零新增**）；`test:v3` 链追加 v4 项 | v4-1→v4-4 |
| NEW | `packages/web-cli-plugin/test/stream-model.test.ts` | node：不可变 / `seq` 单调不复用 / 回放等价 / 终态冻结 / **无「置 null 消失」路径** / `boundStreamEvents` | v4-2 |
| NEW | `packages/web-cli-plugin/test/stream-persistence.test.ts` | node：摘要 schema / 零明文字段白名单 / LRU 与 bound / 会话切换还原与降级登记 | v4-2 |
| NEW | `packages/web-cli-plugin/test/ui/stream.mjs` | Chromium：7 主类 + 过程卡族渲染 + 固化契约 + 增量渲染（不清空）+ 滚动 + 320px + 无障碍 | v4-2 |
| NEW | `packages/web-cli-plugin/test/ask-auth-inflow.test.ts` | node：ask/auth 状态机全终态 + `MAX_OPEN_ASKS=2` + supersede 留痕 + 零明文 | v4-3 |
| NEW | `packages/web-cli-plugin/test/ui/ask-auth-inflow.mjs` | Chromium：ask 两型 / auth 两态固化 / 不可二次 / 超时·取消·取代留痕 / `aria-live` | v4-3 |
| NEW | `packages/web-cli-plugin/test/recommendation-sources.test.ts` | node：真值**白名单**（禁设置项计数类真值）+ 规则表可复算 + 上限 + 无候选不渲染 + 安全边界 | v4-4 |
| NEW | `packages/web-cli-plugin/test/ui/recommendation.mjs` | Chromium：chips 即指令（**同一生产入口**）+ 上限 + `pending` 门控 + 安全边界 + 系统事件行 | v4-4 |
| NEW | `packages/web-cli-plugin/test/design-contract.test.ts` | **AC-CHAT-025 门禁化**：实跑 `option-f-shim.mjs` 断言 60/60 + shim 文件 sha256 冻结 + `check(` == 60 + 60 条 → 规范条款映射表 60 行 | v4-1 |
| NEW | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` | **v4 取代台账**（v3 schema 沿用 + 接管声明 + `leafBases` + 计数下界 + `v3Vol3Closeout`） | v4-1 建，逐叶追加 |
| NEW | `packages/web-cli-plugin/docs/v4-density-baseline.json` + `docs/v4-density-baseline.md` | **新密度基线**（新口径 + 31 登记格 + 与 v3 的差异与理由 + 设计稿/真产物分列） | v4-1 建，逐叶追加 |
| NEW | `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v4-chat/plan.md` + 4 叶 `plan.md` | 本阶段产物 | plan |
| MODIFY | `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v4-chat/state.json` + 4 叶 `state.json` | `phase: specified → planned`；`phaseHistory` 追加；`artifacts` / `files` 追加 `plan.md` | plan |

**明确不改（门禁断言 diff 为空）**：`packages/web-cli-plugin/manifest.json` · `src/security/{policy,auto-authorize}.ts` · `src/content/**`（含 `content-script`/`dom-agent`/`page-bridge` 三文件 hash pin 与 `pick-layer` 全家） · `src/background/messaging.ts`（`KIND_SET`） · `src/background/ask-bridge.ts`（60 s 语义） · `src/background/session-store.ts` / `chat-session.ts`（**v4 不落 SW 侧**） · `src/ui/sidepanel/scroll-policy.ts` · `src/ui/sidepanel/markdown.ts` · `src/ui/sidepanel/l1/receipt.ts` · `src/ui/sidepanel/l1/ref-validity.ts` · `src/ui/sidepanel/l2/counts.ts` · `src/ui/sidepanel/l2/audit.ts` · `src/ui/sidepanel/l2/command-catalog.ts` · `packages/web-cli-base/**` · `src/ui/options/index.html` · `design/**` · `docs/v3-supersession-ledger.json` · `docs/v3-density-baseline.json` · `package.json#dependencies`/`devDependencies` · v1/v2/v3 SDDU 目录 · `.sddu/specs-tree-root/ROADMAP.md` · `.opencode/opencode.json` · `main` 分支。

---

## 6. 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|:--:|:--:|----------|
| **R4-01 journey 保护段语义失效（= R-CHAT-002）** | **高** | **极高** | ADR-V4-008 的**八步操作流程**：old sha 记录 → 逐段决策（journey 取代 / binding 保留）→ `#15a~#15q` 同编号等价改写（≥65% 语义保留、composer 贴底 → 法四）→ `modifiedRanges` 登记 → 新 pin 计算与写入 → 留存 `supersededFrom` → 反证实跑 → 计数 ≥167。**禁静默改写**（FR-CHAT-081 / EC-CHAT-012） |
| **R4-02 l0/l1 门禁大面积落在被取代面（= R-CHAT-001 头号风险）** | **高** | **极高** | ① **同构迁入**（ADR-V4-005 / P-V4-04 方案 A）把取代面从「语义重写」降为「选择器重锚 + 前置展开」；② `id` 零重命名（**唯一例外** `#log`→`#stream`）；③ **v4-1 门禁集合增补 l0/l1/l2**（偏差登记 2），把红灯在同叶内消掉；④ 每叶收尾**全门禁绿**（AC-CHAT-023 / EC-CHAT-013），禁留红灯 |
| **R4-03 密度豁免被滥用为「把控件藏进流子树降密度」（= R-CHAT-004）** | 中 | **极高** | S1/S2 结构保证 + A3 反作弊（RP-V4-06：把工具栏某入口移入 `#stream` → `assertChromeNotInStream()` FAIL 且 C1 不得下降）+ `DENSITY_EXCLUDED_SUBTREES` 单源冻结 + 静态字面量再断言 + 三条防滥用反证（单卡 ≤6 / 首屏 ≤2 / 欢迎卡 ≤1 且 ≤8 行） |
| **R4-04 风险「永不折叠」被实现腐化（= R-CHAT-005）** | 中 | 极高 | S6/S7：状态栏 body 直挂 + `#risk-chips` 容器 + 祖先闭包探针（无 `hidden` / 无 `[aria-expanded]` / 无折叠容器）+ 视图打开后仍可见 + `disclosure.ts` 白名单**排除** `region-statusbar`/`risk-chips`/`risk-rail` 并保留 `assertFoldable` 抛错 + RP-V4-07（把 chip 移入 `hidden` 容器 → FAIL） |
| **R4-05 append-only 与既有可变 state 迁移半途（= R-CHAT-006）** | 中高 | 高 | ADR-V4-002/003：`StreamEvent` 不可变 + `project()` 纯函数（回放等价单测锁死）；`entries+nextId` **保留为派生视图**（既有 action 零删除，降低迁移半径）；「终态冻结」用例化（`test/stream-model.test.ts`）；「无置 null 消失路径」专门断言 |
| **R4-06 ask 迁移后回合语义卡死（= R-CHAT-007）** | 中高 | 高 | ADR-V4-030/032：`MAX_OPEN_ASKS = 2`（= R1 现场上限）+ `pending` **只门控发送新回合与推荐 chip**、**不门控**已有 ask 卡提交 + SW `ask-bridge` 60 s 语义零变更（面板侧投影）+ supersede 路径 + 「不得出现永远处理中」场景断言（AC-CHAT-014） |
| **R4-07 流内留痕破零明文红线（= R-CHAT-008）** | 中高 | 高 | ADR-V4-034：摘要落库**字段白名单**（结构化，无正文/参数体/URL query）+ 复用 `l1/receipt.ts#assertNoPlaintext` + 审计白名单 + URL 去参 + `system` 事件行**只接受已净化文本**（渲染前再过一次白名单）+ `test/stream-persistence.test.ts` 零明文用例 |
| **R4-08 消息契约扩展触碰 `content.js` 冻结面（= R-CHAT-009）** | 中 | 高 | ADR-V4-029：设计上**不新增任何 SW↔面板 kind**（v4 全部为面板内模型 + 面板侧 storage）；`KIND_SET` 零 diff 断言；若某叶必须新增 kind → **停下上报**改走独立校验器（先例 `pick-protocol.ts:9-12`，+6 kind 实测 +307 B = 红线） |
| **R4-09 体积净增超 ceiling 且绝对上限未闭合（= R-CHAT-010）** | **高** | 中 | §2.9 的降重杠杆先用尽（静态骨架落 `index.html` / 复用既有纯投影 / 单模板卡体系 / 零新依赖）；每叶五要素**中间重登记**；v4-4 收口**带值闭合**（推导规则：实测值上取整 50 KB 档 × 1.10 + 作者确认）；`min(绝对上限, floor(基线×1.05))` 判定；`SIDEPANEL_CEILING_CAP` 保持 `record-only` 不被读取（NG-CHAT-007 / FR-CHAT-093） |
| **R4-10 工具栏准入规则缺失导致静默第 6 个可点（= R-CHAT-011）** | 中 | 中 | ADR-V4-018：准入规则 = 「与单次会话无关」∧ 属于 {四视图 / 主题 / 站点摘要}；满额 5 时新增必须**显式置换**（登记 old→new + 理由）；工具栏可点 ≤5 由**静态门禁**（`density-thresholds.test.ts` 解析 HTML）+ 运行时门禁（三宽度）双测 |
| **R4-11 拾取入口消失导致救援路径断裂（= R-CHAT-012）** | 中 | 中高 | ADR-V4-038：`requestPick()` **单一生产入口**（ref 卡「重新拾取」+ 设置视图引导都走它）+ 布线门禁（仿 `test/ref-wiring.test.ts` 的唯一调用点断言）+ 页面侧入口可达 + 未授权**零注入**（引导只在设置视图内，不注入） |
| **R4-12 分类学缺口丢既有过程形态（= R-CHAT-013）** | 中 | 中高 | ADR-V4-013 / ADR-V4-026：7 主类 + 过程卡族**单一登记**（`cards/index.ts`）；工具卡「工具名 + ✓/✖ + 耗时 + 预览 + 折叠记忆(480B/10 行)」逐字段保留断言；`CARD_TYPES` 扩展须登记设计契约变更（不静默改 shim） |
| **R4-13 固化态可交互性 / 无障碍回归（= R-CHAT-014）** | 中 | 中 | ADR-V4-004/026：固化 = `data-*` + `[hidden]` 切换 + `.ts` + `.card-fixed`；`aria-live` 播报固化结果；焦点移到固化区或下一合理位置；**收起内容不在 tab 序**；`:focus-visible` 可见；320px 流内长卡折行/截断零水平溢出（`test/ui/stream.mjs` + `test/ui/l0.mjs` 三宽度） |
| **R4-14 取代面过大导致台账变橡皮图章（= R-CHAT-015）** | 中高 | 高 | ADR-V4-009：沿用 v3 的**按行判定**（每条删除/改写行必须命中台账）+ `leafBases` **叶段双段审计**（消除 base→worktree 的叶段盲区）+ `entries[].newTitle` **必须可在目标文件定位** + 反证「删 1 条 → FAIL → 还原 → PASS」（RP-V4-08）；台账条目必须给出 **old→new + 理由 + 计数证据** |
| **R4-15 门禁资源约束导致 OOM / 轮次失控（= R-CHAT-016）** | 中 | 高 | 门禁**严格串行、一次一个 Chromium**（`test:v4` 链式 `&&`，无并发）；日志完整落盘 `/tmp/opencode/v4-gate-logs/*.log`（**禁 tail 截断**）；**本 plan 阶段不跑任何门禁 / 构建 / Chromium**；新增门禁数为 3 个 Chromium（`stream.mjs` / `ask-auth-inflow.mjs` / `recommendation.mjs`）+ 5 个 node（零 Chromium），控制在可承受轮次内 |
| **R4-16 元门禁因新门禁/新反证登记而失效** | 中 | 高 | ADR-V4-011 / P-V4-08：`EXPECTED_AUDITED_FILES` **只追加**；`CHROMIUM_GATES.length === 9` **不动**（沿用 `page-input.mjs` 先例）；反证走 **in-gate 形态**（`density.mjs --reverse RP-V4-*`）并**扩展**既有 in-gate 例外说明，**不改** `readReverseProofLedger()` 的硬编码台账路径；`test/gate-integrity.test.ts` 的任何改动都必须在 v4 台账登记且 `expectFailPattern` 声明数**只增** |
| **R4-17 v4-1 门禁集合缺 l0/l1/l2（**本 plan 新发现的执行层风险**）** | **高**（若照抄叶子 spec） | **极高** | 见 §1 偏差登记 2 + ADR-V4-011 第 2 条：v4-1 门禁集合**增补** `test:l0`/`test:l1`/`test:l2`，并在同叶内完成三者的等价改写与台账登记 |
| **R4-18 占位宿主的过渡生命期失控（**本 plan 新发现**）** | 中 | 中 | ADR-V4-005 第 6 条：占位宿主必须带 `data-transitional-host="<退役叶>"` 标记，并在 v4 台账登记其**退役叶**；门禁断言「**v4 收口时不得残留任何 `data-transitional-host`**」——结构性防止过渡态永久化 |
| **R4-19 门禁文件名/计数下界的跨台账口径漂移（**本 plan 新发现**）** | 中 | 中 | 保留门禁**文件名**（l0/l1/l2/density/journey/binding），使 `v3GateFloors` 与 v4 新下界能**同名叠加**；v4 台账的 `counts.<gate>.countMethod` 必须显式声明为 `runtime-check-calls`（消灭 v3/r2 的跨口径歧义）；`nodeTestRuntime` 下界 = `max(646, 实测)` 只增 |
| **R4-20 设计契约（shim）与真实产物**双实现漂移**（**本 plan 新发现**）** | 中 | 中 | ADR-V4-011 第 5 条：`test/design-contract.test.ts` 只校验**设计稿**（shim 60/60 + sha256 冻结 + 计数 60 + 映射表 60 行）；真实产物侧的等价断言**必须落在** `test/ui/{stream,ask-auth-inflow,recommendation,l0}.mjs`（逐条对应 shim 分组），且**设计稿数字与真实产物数字分列登记**（`docs/v4-density-baseline.json#designCaliber` 沿用 v3 A-UI-001 纪律） |

**最大技术风险（按影响排序，三条）**：

1. **R4-01 + R4-02（保护段 + l0/l1 取代面）**：journey 的 185 行保护段逐字读 `#log`/`#composer`，而 v4 退役这两个 id 的常驻语义；l0/l1 门禁的宿主全部消失。缓解 = **同构迁入**（把取代面降为选择器重锚）+ 保护段八步流程 + **v4-1 门禁集合增补**（R4-17 处置）+ 每叶全门禁绿。
2. **R4-03 + R4-04（密度豁免与风险不折叠的实现腐化）**：豁免子树是「把控件藏进流子树」的天然后门；风险位从顶部 rail 迁到底部 chips 容易被实现成「藏在展开里」。缓解 = 结构保证 S1/S2/S6/S7 + 三条防滥用反证 + 两条风险反证 + 豁免单源冻结。
3. **R4-09（体积净增 + 绝对上限闭合）**：v4 是净增 Feature，4 叶合计预估 +24~42 KB。缓解 = 降重杠杆先用尽 + 每叶五要素中间重登记 + v4-4 收口带值闭合 + `min()` 优先级明确 + 绝对上限**不得成为自缚装置**。

---

## 7. 生成的 ADR

> 本阶段共产出 **40 个 ADR（ADR-V4-001~040）**，与 v1 `ADR-001~018`、v2 `ADR-V2-001~033`、v3 `ADR-V3-001~036` **零编号冲突**。父 Feature 承 **ADR-V4-001~016**（统领性 / 跨叶 / 7 条新风险裁决），4 个叶子承 **ADR-V4-017~023 / 024~029 / 030~034 / 035~040**（正文见各叶 `plan.md` §7）。状态 = **ACCEPTED**（编排器代作者决策；设计基准、三区模型、卡分类学、不动面、密度新口径、叶子拆分、取代与体积纪律为定论），其中 ADR-V4-001 / ADR-V4-005 / ADR-V4-008 / ADR-V4-011 含**显式偏差或取舍登记**。

| ADR | 标题 | 状态 | 覆盖议题 |
|-----|------|:--:|------|
| ADR-V4-001 | 父 `plan.md` 的定位与「轻量规范容器」偏差登记（编排器指令优先；父仍不产出 tasks / 不承接 build·review·validate） | ACCEPTED（含偏差登记） | 治理 |
| ADR-V4-002 | 事件流模型：`StreamEvent` 不可变 + `seq` 单调不复用 + 终态冻结 + **摘要落库 / 内存全量**取舍 + `chat-state` 迁移路径 | ACCEPTED | ①②⑩ |
| ADR-V4-003 | 会话切换语义：`seq` 全局单调 + `sessionId` 分段 + **内存段保留** + `boundStreamEvents` 与截断规则显式登记 | ACCEPTED | ① |
| ADR-V4-004 | 卡渲染架构：`render()` 清空重建 → **keyed 增量渲染**（append/patch，永不清空）+ 滚动锚定 + 320px 性能 | ACCEPTED | ② |
| ADR-V4-005 | 三区骨架与 DOM 迁移总表；**同构迁入 + 占位宿主登记**；`#log`/`#composer` 退役 | ACCEPTED（含取舍与偏差登记） | ③ |
| ADR-V4-006 | 密度门禁重定标实施：口径 = 「`document.body` 表达式根 + `DENSITY_EXCLUDED_SUBTREES` 单源排除」；复用 v3 三段式骨架与判定器 | ACCEPTED | ④ |
| ADR-V4-007 | 密度**新登记格集（31 格）** + 三道防滥用 + **firstRun 独立格** + **空态独立格** + 旧 22 格处置 | ACCEPTED | ④⑫ |
| ADR-V4-008 | journey 保护段 `42766..54004` **显式取代 + 新 pin** 八步操作流程 + binding 段保留 + v2 量化红线重定标 | ACCEPTED（含偏差登记） | ⑤ |
| ADR-V4-009 | v4 取代台账 schema 与门禁：**接管声明** + 按行判定 + `leafBases` 双段 + 计数下界 + 「newTitle 可定位」+ 反证 | ACCEPTED | ⑨ |
| ADR-V4-010 | 体积与冻结面策略 + 每轮五要素中间重登记 + **V3-VOL-3 收口序列** + **绝对上限 vs 5% 优先级 `min()`** | ACCEPTED | ⑧⑫ |
| ADR-V4-011 | 测试架构与门禁重定标：保留门禁**文件名** + l0 整文件重写 / l1 入口机制重写 / journey 迁移 / `sidepanel-view` 4 契约等价改写 + 新门禁挂载 + shim 60 断言门禁化 | ACCEPTED（含偏差登记：v4-1 门禁集合增补 l0/l1/l2） | ⑨ |
| ADR-V4-012 | 过程卡族固化语义 = **append-only + 终态冻结**（状态迁移允许；终态后变化 = 新事件行 / 新卡） | ACCEPTED | ⑩ |
| ADR-V4-013 | 卡分类学：**7 主类 + 过程卡族（5 形态）**，单一登记 + 设计契约变更登记方式 | ACCEPTED | ②⑩ |
| ADR-V4-014 | **AC-CHAT-016 授权回看单一归属 = v4-3**；v4-1 只提供设置视图入口；v4-4 只读引用 v4-3 契约 | ACCEPTED | ⑪ |
| ADR-V4-015 | 推荐卡**真值派生约束**：白名单 + **禁设置项计数类真值** | ACCEPTED | ⑦⑫ |
| ADR-V4-016 | **journey ≥65% 占比可达性 = 前置 S 级 spike**；不可达 → **停下上报编排器**，禁静默弱化 | ACCEPTED | ⑤⑫ |

### ADR-V4-001: 父 `plan.md` 的定位与「轻量规范容器」偏差登记

## 状态
ACCEPTED（**含偏差登记**；依据 = 本轮编排器指令「产出父 `plan.md` + 四叶 `plan.md`」）

## 背景
父 spec §11 与 v2/v3 先例把父 Feature 定义为**轻量规范容器 + 聚合报告承载者**（父不产出 `plan.md`/`tasks.md`/`tasks.json`，不承接 build/review/validate）。但 v4 的 **12 项技术设计必答**（§2.8）全部跨叶：`StreamEvent` 结构由 v4-2 定义、v4-3/v4-4 消费；密度口径由 v4-1 定义、其余三叶复用；`#region-*`/`#stream` 契约跨越全部 4 叶；取代台账与体积策略是**单一文件**的跨叶资产。

## 决策
1. **产出父 `plan.md`**（本文件），定位 = **接口与契约的定义者**（ADRs + 门禁口径 + 不动面守线 + 台账/体积策略），**不是**实施载体（不排任务、不写代码）。
2. **容器内核仍严格遵守**：父**不产出** `tasks.md` / `tasks.json`；父**不承接** build / review / validate；实施全部由 4 个叶子承载；父 `state.json` 的 `depth=1` / `childrens` 不变。
3. 偏差**显式登记**于 §1「偏差登记 1」与本节，供 `@sddu-review` / `@sddu-validate` 独立核验。
4. 4 个叶子对父的引用均为「父 ADR 编号 + 契约名」，不依赖父文件的物理存在性 ⇒ 本文件可整篇作废而不牵连叶子。

## 后果
- 好处：跨叶契约单点定义，避免 4 套口径漂移；review 可一处核验不动面守线（T1~T6）与门禁设计。
- 代价：与父 spec §11 的容器字面冲突（已登记）；父目录多一份文档，须在 `state.json#files`/`artifacts` 如实登记。
- 边界：本决策**不**改变「父不承接 tasks/build/review/validate」的实质，也不改变「每叶独立全绿」要求。

### ADR-V4-002: 事件流模型（不可变 + 单调 + 终态冻结）与持久化取舍

## 状态
ACCEPTED（承 §12 裁决「卡分类学」与 R-CHAT-006；替代方案见 §3.1 / §3.2）

## 背景
现状 `entries: ChatEntry[]` + `nextId` **已是 append-only 数据层**（`chat-state.ts:111-128`），但 `role` 4 类 / `kind` 4 类，缺 ask/auth/ref/nextstep 条目类型；`ask`/`confirm` 是**可变单槽 + 置 `null`**（`:169-185`），即「解析即消失」——这正是 Q-CHAT-001 的模型层痛点。同时 F 稿要求「卡片只固化不撤销」，而**过程卡族**又需要「进行中 → 完成」的状态迁移（工具卡写 `ok`/`ms` 是状态迁移而非撤销）。两者若用同一个「可变/不可变」口径表达，必然二选一自相矛盾。持久化面另有约束：`session-store.ts#projectHistory()` 只投影 `{role,text}`，`kind`/`tool`/`ok`/`ms` 全丢；`KIND_SET` 打包进 `content.js`（+1 B 即 FAIL）。

## 决策
1. **事件结构（不可变）**：
   ```ts
   type StreamEventKind = 'ai'|'user'|'nextstep'|'askuser'|'auth'|'system'|'ref'
                        | 'tool'|'command'|'thinking'|'error'|'notice';   // 7 主类 + 过程卡族
   type StreamTerminal = 'answered'|'cancelled'|'approved'|'rejected'|'invalidated'|'completed';
   interface StreamEvent {
     seq: number;            // 单调递增、永不复用、跨会话切换**不重置**
     ts: number;             // epoch ms（时间戳唯一来源，禁用渲染期 now()）
     kind: StreamEventKind;
     cardId: string;         // 卡归属键（一次「往返」的所有事件共享同一 cardId → 同一张卡）
     sessionId: string;      // 事件归属会话（分段用）
     payload: StreamPayload; // 判别联合，按 kind；**不含敏感明文**（见 ADR-V4-034）
     terminal?: StreamTerminal;  // 终态事件专用；携带此字段的事件 = 该卡的终态事实
   }
   ```
2. **卡 = 纯投影**：`project(state, deps) → CardView[]`（确定性纯函数，无 `Date.now()` / 无随机 / 无 DOM）。`CardView` 携带 `{cardId, kind, seq(first/last), ts, terminal?, terminalSeq?, payload}`。
3. **终态冻结不变式**：`CardView.terminal` 一旦非空，任何后续 `project()` 结果**不得改变**它；「进行中 → 完成」的迁移由**后续事件**（`tool-result` / `thinking-done`）驱动，作用于 `terminal === undefined` 的卡；`terminal` 已写入的卡**只允许追加新事件行 / 新卡**。
4. **可回放等价**：同一 `StreamEvent[]` ⇒ 同一 `CardView[]`（`test/stream-model.test.ts` 断言）。**不存在**「解析即置 `null` 使条目从界面消失」的路径（同测专门断言「取消/超时/取代后原卡仍在 `project()` 结果里」）。
5. **持久化取舍 = 摘要落库 + 内存全量**（§3.2 方案 A）：
   - 内存：全量 `StreamEvent[]`（`boundStreamEvents` 上限，见 ADR-V4-003）。
   - 落库：`chrome.storage.local`（**已有 `storage` 权限**）下 `stream-digest:<sessionId>`，存**零明文摘要**数组，字段白名单 `{seq, ts, kind, cardId, terminal, label(≤80 字符截断), tool, ok, ms, refNum, askRequestId}`；**不含正文 / 命令参数体 / URL query / 页面文本**。
   - 面板关闭后重开：读回摘要并**降级重建**（正文位置显示「（历史摘要）」并保留 `seq`/`ts`/`terminal`）；该降级**显式登记**为截断规则（EC-CHAT-003 / V42-O-4），禁静默。
6. **`chat-state.ts` 迁移路径（最小半径）**：既有 12 个 action **零删除**；`chat-state` 的 `entries+nextId` **保留为派生视图**（`project()` 的逗号投影，供未迁移的既有断言/渲染路径共用）；新增 `stream` 字段与 `streamReducer`。**不重写 reducer 的既有 case**，只在其后追加事件化分支。这样 v4-2 可以在不改任何既有断言语义的前提下引入事件流（R-CHAT-006 的缓解）。
7. **否决**：卡记录自身 append-only（§3.1 方案 B，卡数翻倍且破坏工具卡同卡契约）、事件可变（方案 C，直接违反 FR-CHAT-020）、全量事件落库（§3.2 方案 B，零明文 + 配额 + 与 `KIND_SET` 张力）。

## 后果
- 「append-only」与「状态迁移允许」不再矛盾：**事件层不可变、投影层可变至终态**（裁决 1 的精确实现）。
- `seq` 是流条目的**唯一 id 口径**；引用仍用 `ref_<n>` 业务序号（O-CHAT-002①），两者通过 `payload.refId` 关联，不混用语义。
- 摘要落库让「授权记录可回看」（G-CHAT-003）跨面板重开成立，同时把零明文风险压到最小字段集（ADR-V4-034）。
- 代价：新增一个投影层与一个摘要层（两处需单测锁死）；`project()` 的确定性必须靠 `ts` 来自事件而非渲染期时间。

### ADR-V4-003: 会话切换语义（全局 seq + sessionId 分段 + 内存段保留）

## 状态
ACCEPTED（承 FR-CHAT-024 / EC-CHAT-003 / O-CHAT-002③；替代方案见 §3.3）

## 背景
现状 `{type:'history'}` **整体替换** `entries`，且把 tool 条目降级为 `kind:'tool'`（`ok`/`ms`/`tool` 元数据**丢失**，`chat-state.ts:188-195`）。这与 FR-CHAT-024「会话切换不得丢过程事实」**直接冲突**；EC-CHAT-003 允许「保留**或**显式登记截断规则」，但没有给出规则。同时 `seq` 若在切换时重置，会与「id 单调不复用」产生口径歧义。

## 决策
1. **`seq` 全局单调、跨会话切换不重置**；会话分段只用 `sessionId` 表达（消除「id 单调」的歧义）。
2. **切换 = 追加分段事实，不清空**：
   - 追加一条 `system` 事件行「会话已切换：<label>」（带 `HH:MM:SS`）；
   - 旧段事件**仍在内存**（`StreamState.events` 不清空），因此切换前的过程可上滚回看、tool 元数据**不丢**；
   - 按旧 `sessionId` 增量写摘要落库（幂等 upsert）。
3. **`boundStreamEvents(events, cap = 2000)`**：超出时**按会话分段**逐段淘汰**最旧的已终结 `system`/`notice` 行**，**永不淘汰**：① `askuser`/`auth` 的终态卡 ② `tool` 卡（含 `ok`/`ms`）③ `ref` 卡 ④ 当前会话段。淘汰计数写入状态栏（**不静默**），并在 v4 台账登记截断规则。
4. **`pending` 在切换时复位**（`pending = false`），未答卡按 ADR-V4-031 结算为 `cancelled(superseded)` 并留痕（**不静默丢弃**）。
5. **否决**：切换即清空（§3.3 方案 B，直接违反 FR-CHAT-024）、切换前全量落库后清内存（方案 C，同步阻塞且有回看断点）。

## 后果
- FR-CHAT-024 由**结构**保证（旧段事件在内存 + 摘要含 `tool`/`ok`/`ms`）而不是靠约定。
- 长会话内存需要 `bound` 兜底，故淘汰规则必须显式登记 + 单测（`test/stream-model.test.ts` 的 bound 用例）。
- 摘要是**跨会话**的持久化单元；`MAX_SESSIONS = 20` 的 LRU 语义与既有 `session-store` 保持一致（摘要按 `sessionId` 独立 LRU）。

### ADR-V4-004: 卡渲染架构（keyed 增量渲染 + 滚动锚定 + 320px）

## 状态
ACCEPTED（承 NFR-CHAT-003 / R-CHAT-014 / V42-O-3；替代方案见 §3.1/§3.4）

## 背景
现状 `render()` 每次 `log.textContent = ''` 再逐条 `appendChild`（`sidepanel.ts:809-833`）——**整树重建**。这在「会话内 40 轮 × 多事件」量级下既有性能问题，也把「追加式流」的语义优势抹掉（DOM 层每次从零开始）。折叠记忆靠 `toolOpenState: Map<number, boolean>`（`:103-110`）——证明「同一 id 稳定」这一前提**已存在**，可直接复用为 `cardKey` 维度。目标：`NFR-CHAT-003`（不整树重建）+ `NFR-CHAT-011`（长会话可读）+ EC-CHAT-006。

## 决策
1. **keyed 增量渲染器**（`stream-render.ts`）：
   - 持有 `Map<cardId, HTMLElement>` 与「已渲染 cardId 顺序数组」；
   - 每次拿到 `CardView[]` 后：**只 append 新增 cardId 的 `<li>`**（按 `seq` 正序）；对**已存在但终态字段变化**的卡执行**定向 patch**（只写 `data-*` / 固化区 / `.ts`）；**永不** `container.textContent = ''`、**永不** `replaceChildren()`；
   - 卡被 `bound` 淘汰时**整 `<li>` 移除**（唯一允许的 DOM 删除路径，且与 ADR-V4-003 的淘汰规则一致）。
2. **折叠记忆沿用**：`toolOpenState` 的键从 entry id 改为 `cardId`（语义等价，零行为变化）；折叠阈值 480 字符 / 10 行**单一来源**（不按卡型各写一套）。
3. **滚动**：复用 `scroll-policy.ts`（`BOTTOM_THRESHOLD_PX = 48`）+ `followToBottom`（双 rAF pin）；**不整树重建 ⇒ 不再需要在非跟随时回写 `scrollTop`**（现状 `render()` 的 `else log.scrollTop = prevTop` 可退役）；用户上滚期间追加新卡不得抢滚动（`scrollFollow.shouldFollow()` 保持权威）。
4. **"thinking" 特殊语义**：思考指示**不再是「append 后 remove」的瞬时元素**（那会违反 append-only）；改为 `thinking` 事件 + `thinking-done` 事件驱动同一 `cardId` 的卡从「思考中…」patch 为「已思考 N.Ns」（终态 `completed`）——既是留痕，也保住 FR-CHAT-035 的形态保留。
5. **320px 性能与可读**：`li` 内长内容按既有口径 `white-space: pre-wrap` + `overflow-wrap: anywhere` + `pre/table` 横向滚动；**可选**对已终结卡加 `content-visibility: auto`（仅当 spike/实测证明必要；一旦启用须在 v4 台账登记，并断言它不影响 `hidden` 语义与 `#stream` 高度占比）。

## 后果
- DOM 层与事件层同构：卡的增删只由 `cardId` 生命周期驱动，取代面在渲染层收敛为「append / patch / remove(bound)」三件事。
- 现有 `render()` 的「清空 + 重建 + `scrollTop` 回写」逻辑退役 ⇒ 取代面相对集中（`sidepanel.ts` 的单点函数），台账登记可控。
- 代价：增量渲染的状态（`Map`）必须在会话切换/视图往返时保持一致（视图替换只 `hidden`，不重建 ⇒ 天然一致）。

### ADR-V4-005: 三区骨架与 DOM 迁移总表（同构迁入 + 占位宿主）

## 状态
ACCEPTED（**含取舍与偏差登记**；承 D-P-V4-02；替代方案见 §3.4）

## 背景
F 稿与 shim A1~A6 要求 `header#region-toolbar[role=toolbar]` → `main#region-stream`（含 `ol#stream[role=log]`）→ `footer#region-statusbar[role=contentinfo]`。真实产物现状是 `#panel-top` / `#panel-main` / `#panel-bottom` + `#l0-decision` + `#l0-statusbar` + `#l2-entries` + `#risk-rail` / `#log`(div) / `#composer`。三区改造**必然**使 l0/l1/l2/journey 的门禁断言大面积落在被取代面（R-CHAT-001 / R-CHAT-003），而纪律要求**每叶全门禁绿**（EC-CHAT-013）。

## 决策
1. **规范骨架**（新 id）：
   ```html
   <header id="region-toolbar" data-region="toolbar" role="toolbar" aria-label="工具栏（常驻）">
     <div class="site-summary" role="status">…站点/授权/信任/会话摘要（只读）…</div>
     <button id="l2-entry-tree"     class="entry" type="button" aria-expanded="false" aria-controls="view-host">连接树 · …</button>
     <button id="l2-entry-commands" class="entry" type="button" aria-expanded="false" aria-controls="view-host">命令目录 · …</button>
     <button id="l2-entry-audit"    class="entry" type="button" aria-expanded="false" aria-controls="view-host">审计 · …</button>
     <button id="l2-entry-settings" class="entry" type="button" aria-expanded="false" aria-controls="settings-view">设置 · …</button>
     <button id="theme-toggle" type="button" aria-label="主题（跟随系统 / 浅色 / 深色）">◐</button>
   </header>
   <main id="region-stream" data-region="stream">
     <ol id="stream" role="log" aria-label="会话消息流（一切交互皆消息，只追加）"></ol>
     <div id="view-host" hidden>…[data-l2-view] 四视图…</div>
     <button id="scroll-bottom" type="button" hidden>回到底部 ↓</button>
   </main>
   <footer id="region-statusbar" data-region="statusbar" role="contentinfo" aria-label="状态栏（常驻，永不折叠）">
     <span id="statusbar-text">…连接状态一行…</span>
     <div id="risk-chips" hidden>
       <div id="risk-rail" aria-live="polite">…风险 chips（文字 + 徽标 + 图标）…</div>
     </div>
     <div id="risk-detail" hidden>…chip 详情 + 「本阶段不发命令、不改授权」披露语…</div>
     <div id="risk-detail" hidden>…chip 详情 + 「本阶段不发命令、不改授权」披露语…</div>
   </footer>
   ```
2. **DOM 迁移总表（逐 id 归属，`id` 零重命名，唯一例外 `#log`→`#stream`）**：

   | 现状 id / 结构 | v4 归属 | 处置 |
   |---|---|---|
   | `body`（`display:flex`） | 三区 shell 根 | 保留列向 flex；三区为 `body` 直挂（状态栏**不**在 `#region-stream` 内 ⇒ S7） |
   | `#panel-top`(header) | → `#region-toolbar`(header) | 复用 header 元素；`#panel-top` id 退役（台账登记） |
   | `#l0-status-band`（唯一可点） | → **移除**（站点摘要变只读） | `#status` / `#llm-status` / `#session-label` **id 保留**，文本迁入 `.site-summary`（`role=status`，非 button ⇒ 不计预算） |
   | `#topbar`（L1 状态面板） | → `#settings-view` 内「站点与授权」分区 | **法则六**；`#open-settings`/`#authorize`/`#revoke`/`#rebind`/`#audit`/`#audit-count`/`#session-box`/`#session-list`/`#group-name`/`#group-create`/`#group-select`/`#group-add`/`#more-actions`/`#llm-test-result`/`#l1-status-extra` **id 零重命名**，仅改归属容器 |
   | `#panel-main` | → `#region-stream`(main) | `#panel-main` id 退役（台账登记） |
   | `#l0-decision` 及 `#ask*` / `#confirm*` | → 流内 `li` **占位宿主**（`data-transitional-host="v4-3"`） | v4-1 同构迁入（内容与 id 全保留）；v4-3 换为 `cards/askuser`+`cards/auth` 并把宿主的 `data-transitional-host` 清空（**v4 收口时不得残留**） |
   | `#l0-pick` | → **移除**（`requestPick()` 单一生产入口） | R-CHAT-012 / ADR-V4-038；页面侧入口保持可达 |
   | `#l0-more` / `#l1-more` / `#l1-consequences` | → 流内 `li` 占位宿主（`data-transitional-host="v4-4"`） | v4-4 换为 `nextstep` 卡（卡内「更多选项」） |
   | `#l0-ref-toggle` / `#l0-ref-badge` / `#l1-ref`（证据层） | → 流内 `li` 占位宿主（`data-transitional-host="v4-4"`） | v4-4 换为 `ref` 卡（含证据层展开 + 两条恢复路径） |
   | `#l1-history` / `#l1-receipt` / `#l1-local-tree` / `#l1-gestures` | → 流内卡 / 设置视图 | `receipt` → 授权卡与流内回执；`local-tree`/`gestures` → 设置视图分区；`history` → **事件派生**（退役 `rounds[]` 推断） |
   | `#log`(div) | → `ol#stream[role=log]` | **唯一 id 重命名**（R-CHAT-003）；journey 保护段随之显式取代（ADR-V4-008） |
   | `#scroll-bottom` | `#region-stream` 骨架层（`#stream` 外） | **计入**密度（不属于流内容豁免） |
   | `#l0-statusbar` + `#l2-entries` | → 工具栏 4 入口（`#l2-entry-*` **id 零重命名**） | v4-1；`#l2-entry-summary` 文本迁 `.site-summary` |
   | `#view-host` + `[data-l2-view]` | `#region-stream` 内（与 `#stream` 互斥） | 复用 `l2/view-host.ts`（只改 `#log`→`#stream` 绑定 + 入口 id） |
   | `#risk-rail`(section, body 直挂) | → `#region-statusbar` 内**嵌套** `#risk-chips`（设计契约 id，外层）> `#risk-rail`（v3 id 保留，内层） | **两层容器同时满足设计契约（shim H5/H8 逐字断言 `#risk-chips`）与 v3 探针/归属判据（`#risk-rail` 选择器）**；行模板改为 chip 形态（文字 + 徽标 + 图标三通道保留）；取代面 = HTML 归属变更，**门禁判定逻辑零改动** |
   | `#panel-bottom` + 6 条 strips | → **移除**；语义迁 `system` 事件行 / 首装卡 | FR-CHAT-054；v4-4 落 `appendSystem` |
   | `#composer` / `#input` / `#send` | → 流内「按需输入」宿主（`hidden`） | **法四**（`#composer` 不再有常驻语义；`journey#15c` 的贴底断言被取代） |
   | `#settings-view` / `#settings-*` | 工具栏入口 → 视图替换 | 保留；设置项语义零改动 |
   | `#env-guard` / `#site-hint` / `#onboarding` / `#discovery-notice` / `#notice` / `#send-reason` / `#consent-slot` | → 首装卡（firstRun 档）+ `system` 事件行 + 设置视图 | 归并矩阵见 v4-4 ADR-V4-036；id 可保留为「事件生成器」的内部标记 |

3. **工具栏可点 ≤5**：`.site-summary`（只读，不计） + 4 视图入口 + `#theme-toggle` = **5**。
4. **四视图入口迁移**：复用 `l2/view-host.ts` **同构替换**（`#stream.hidden = true` + `#view-host.hidden = false` + 恰一个 `[data-l2-view]` 可见 + 标题/计数与入口同源）；`#l2-entry-settings` 仍指向 `#settings-view`（保持 per-target `aria-expanded` 配对）。
5. **`disclosure.ts` 重定标**：`COLLAPSIBLE_TARGETS` 移除退役目标（`topbar`→迁入 `settings-view` 后不再是折叠目标；`l1-*` 移除或改指卡内），新增卡内目标；`NEVER_FOLDABLE` = `['region-statusbar','risk-chips','risk-rail','stream','view-host','settings-view']`（语义 = 三区常驻面 + 风险容器 + 视图宿主不可折叠）。
6. **占位宿主的生命期纪律（R4-18 结构性防护）**：每个占位宿主必须带 `data-transitional-host="<退役叶>"`；v4 台账登记其**退役叶**；门禁断言「**v4 收口（v4-4 收尾）时 `document.querySelectorAll('[data-transitional-host]').length === 0`**」。
7. **否决**：v4-1 一次性删净旧骨架（§3.4 方案 B：中间态 ask/confirm 无宿主 ⇒ EC-CHAT-013 必然违反）、双份 DOM 兼容别名（方案 C：双源真相，与 R-CHAT-003 正面冲突）。

## 后果
- 取代面从「语义重写」降为「**选择器重锚 + 前置展开**」：l0/l1 断言改的是 `getElementById` 目标与展开步骤，测的语义不变（强度不降）。
- `#log`→`#stream` 是**唯一**的 id 重命名，冲击集中在 journey 保护段（ADR-V4-008 显式取代）与 `sidepanel-view.test.ts` 的 2 条静态 CSS 契约（ADR-V4-011 等价改写）。
- 代价：存在过渡态的 `data-transitional-host` 宿主（约 6 处），必须靠门禁在 v4-4 清零，否则过渡态永久化。

### ADR-V4-006: 密度门禁重定标实施（单源排除子树 + 复用 v3 骨架）

## 状态
ACCEPTED（承 D-P-V4-05 / FR-CHAT-070 / FR-CHAT-071 / R-CHAT-004；替代方案见 §3.5）

## 背景
现行口径测量根 = `document.body`（v3 `ADR-V3-001`），C1 可点元素逐字口径「非 `hidden` 祖先 ∧ (tag ∈ {BUTTON,A,INPUT,SELECT,TEXTAREA} ∨ tabindex ≠ -1)」。F 稿的**流内卡片含按钮**（`askuser` 选项 / `auth` 批准拒绝 / `nextstep` chips / `ref` 重拾）⇒ 沿用旧口径默认档必然爆表。F 稿法五因此明写「聊天流内容**不计入**默认密度」。父 spec §9.4 要求「复用密度门禁的**实现骨架与反证判定器**」。

## 决策
1. **表达式根不变**（`document.body`），**新增排除子树**：`DENSITY_EXCLUDED_SUBTREES = ['#stream']`（单源声明于 `src/ui/sidepanel/density-scope.ts`）。测量算法新增一步：**祖先链命中任一排除子树根 ⇒ 该元素（及其后代）跳过**（C1/C2/C3 与 `elementsWithKeys` 全部跳过）。
2. **三区外壳**（`#region-toolbar` + `#region-statusbar` + `#region-stream` 的**骨架层**，即 `#region-stream` 自身与 `#stream` 之外的部分：`#view-host` header、`#scroll-bottom`）**全部计入**默认密度。
3. **C1~C4 定义完全继承**（不放松）：唯一豁免仍是 `hidden` 属性；`display:none` / `visibility:hidden` / `opacity:0` / `pointer-events:none` / 出视口 / `aria-hidden` **一律不豁免**（FR-CHAT-071）。`BANNED_MEASURE_APIS` 静态零命中断言继承。`C2` 行宽常数 `34` 保留。
4. **复用 v3 三段式**：口径单源 = `test/ui/density-metrics.mjs`（扩展而非重写）；Chromium 门禁 = `test/ui/density.mjs`（重定标）；无 Chromium 常量/静态门禁 = `test/density-thresholds.test.ts`（追加 v4 断言，**保留** v3 基线 schema 保真断言）。
5. **阶段 F 指向 v4 基线**：`test/ui/density.mjs` 的阶段 F 机器比对改为读 `docs/v4-density-baseline.json`（v3 文件**不再参与判定**，仅作为历史 schema 保真对象）。
6. **设计稿/真实产物分列**：`docs/v4-density-baseline.json#designCaliber` 沿用 v3 A-UI-001 纪律（设计稿数字 ≠ 真实产物数字，分列登记，设计稿仅用于阶段 A 同源对账）。
7. **否决**：只测三区自身三元素（§3.5 方案 B：漏掉三区之外的常驻元素 ⇒ 口径漏洞）、靠 CSS/ARIA 隐身（方案 C：已被 v3 RP-V3-03 证伪且违反 FR-CHAT-071）。

## 后果
- 复算语义：`C1 = 可点元素数(排除 #stream 子树)`；三区骨架层的常驻导航仍被逐个数——**预算语义从「一次性交互」反转为「常驻导航」而总数仍 ≤7**（A-CHAT-003 在真实产物上的落地）。
- 排除子树是单源常量 + 静态字面量再断言 ⇒ A3 反作弊可机器判（S1/S2）。
- 阶段 F 指向切换后，v3 的 22 格不再参与判定（但 schema 保真断言保留）⇒ 口径变化可审计。

### ADR-V4-007: 密度新登记格集（31 格）+ 三道防滥用 + firstRun/空态独立格 + 旧 22 格处置

## 状态
ACCEPTED（承 D-P-V4-05 / FR-CHAT-072~075 / §12 裁决 3+4；替代方案见 §3.6）

## 背景
v3 登记格 = 9 强制格（3 档 × 3 视口）+ 15 风险格（5 子场景 × 3 视口）+ worst + 阶段 F 比对（共 22 比对格）。v4 换口径后**全部登记格需重算**，且新增两条防滥用（单卡 ≤6 / 首屏 ≤2）。另有两个语义缺口：① 首装态（onboarding/discovery-notice 生效中）在 F 下由**流内卡**承载 ⇒ 不能与 default 混算；② 空态（空流欢迎态）在 F 下由**欢迎卡**承载 ⇒ 需要自己的边界（裁决 3/4）。

## 决策
1. **阈值哲学保留**（FR-CHAT-074，只允许收紧）：`default ≤7/≤15` · `firstRun ≤9/≤20` · `risk ≤17/≤35`；档位**互斥且优先级 `risk > firstRun > default`**（继承 v3，消除假 FAIL）。
2. **新登记格集 = 31 格 + 阶段 F 比对 + 逐卡动态格**：

   | 组 | 格数 | 内容 |
   |---|---|------|
   | **9 强制格** | 3 档 × 3 视口（320/400/520 × 900） | default / firstRun / risk |
   | **15 风险格** | 5 子场景（未授权/探测中/硬底线被拦/破坏性待确认/引用失效）× 3 视口 | 强制判定取**最差**值 |
   | **3 空态格**（**新增，独立登记**） | `empty` × 3 视口 | **不与 default 混算**；判定加两条反滥用（首屏卡 ≤2、欢迎卡 ≤1 且 ≤8 行） |
   | **3 风险详情展开格**（**新增**） | `riskDetailOpen` × 3 视口 | chip 详情展开态：**不占默认密度**（详情在 `hidden` 的 `#risk-detail` 内）但需登记防漏 |
   | **worst 1** | risk worst-of-15 | 参与强制判定 |
   | **阶段 F 比对** | 全部格 vs `docs/v4-density-baseline.json` | 漂移 ⇒ FAIL（`compareBaselineCells`） |
   | **逐卡动态格** | 各档可见卡逐张 | `clickables(card) ≤ 6` |

3. **防滥用三道（逐条配可 FAIL 反证，FR-CHAT-075）**：
   - **A1 单卡 ≤6**：`MAX_CLICKABLES_PER_CARD = 6`。反证 **RP-V4-01**：在任意卡内注入第 7 个可点元素 → FAIL；移除后 PASS。
   - **A2 首屏 ≤2**：`MAX_FIRST_SCREEN_CARDS = 2`（**只约束 default 档的空流首屏**）。反证 **RP-V4-02**：空态注入第 3 张卡 → FAIL；移除后 PASS。
   - **A3 流豁免不可滥用**：排除子树单源冻结 + `assertChromeNotInStream()`（`[data-chrome-control]` 不得在 `#stream` 子树内）。反证 **RP-V4-06**：把 `#theme-toggle` 移入 `#stream` → FAIL 且 C1 **不得下降**（下降即说明豁免被用来降密度）。
   - **A4 CSS 隐身不豁免**（继承 v3 RP-V3-03）：反证 **RP-V4-04**：设 `display:none`/`visibility:hidden`/`opacity:0`/`pointer-events:none` → C1 **不得下降**；设 `hidden = true` → C1 **必须下降**。
   - **A5 欢迎卡边界**：`MAX_WELCOME_CARDS = 1`、`MAX_WELCOME_LINES = 8`（320px ⇒ ≤8 × 34 = **272 字符**）。反证 **RP-V4-03**：注入第 2 张欢迎卡 / 使其文本超过 8 行 → FAIL。
   - **A6 风险位不被藏进展开**：反证 **RP-V4-07**：把某风险 chip 移入 `hidden === true` 容器 → 祖先闭包探针 FAIL；还原后 PASS。
4. **首装态口径（裁决 3）**：onboarding / discovery-notice **以流内卡承载并计入 firstRun 档**；「首屏 ≤2」**只约束 default 档**（firstRun 档不受该约束）。firstRun 的独立登记格使「首装期卡片多」不被误判为默认密度超标。
5. **空态口径（裁决 4）**：空态 = **独立登记格**（`empty` 档，阈值同 default 的 `7/15`，但**独立成格不与 default 混算**）；空态欢迎必须收敛为 **≤1 张欢迎卡**且卡内文本 ≤8 行。
6. **旧 22 格处置（推荐 = §3.6 方案 A）**：
   - `docs/v3-density-baseline.json` **逐字冻结为 v3 历史**，**不改写**；**不参与 v4 判定**；
   - `docs/v4-density-baseline.json` **新建**（新口径 + 31 格 + `designCaliber` 分列）；
   - v4 文件内**显式登记**「与 v3 基线的差异与理由」（口径变化点逐条：测量根范围 / 排除子树 / 新增三组登记格 / 防滥用），方向声明为「**换口径重定标**，非放宽」；
   - v3 文件的 `caliber` / `thresholds` / 旧 22 格由 `test/density-thresholds.test.ts` **保留 schema 保真断言**（存在性 + 字段完整性 + 数值逐字），使「v3 历史未被改写」成为机器事实。
7. **否决**：原地改写 v3 基线（§3.6 方案 B，违反 FR-CHAT-074）、删除 v3 基线（方案 C，历史不可删）。

## 后果
- 登记格从 22 → **31**（+3 空态 +3 风险详情展开 + 3 组判定语义），全部可复算；每格 3 条判定（C1 ≤ 上限 / C2 ≤ 上限 / 增量归属）。
- 三条防滥用各有可 FAIL 反证与日志证据；A3 是「把控件藏进流子树」这一类原理性规避的**结构性**封堵。
- 首轮真实产物复测必须登记为基线（三档 × 三视口 + 空态 + 风险详情展开），并与设计稿数字**分列**。

### ADR-V4-008: journey 保护段显式取代 + 新 pin 八步操作流程

## 状态
ACCEPTED（**含偏差登记**；承 FR-CHAT-081 / FR-CHAT-082 / AC-CHAT-017 / R-CHAT-002；替代方案见 §3.7）

## 背景
`docs/v3-supersession-ledger.json#protectedRanges` 对 `test/ui/journey.mjs` 的**字节段 `42766..54004`**（185 行 / sha256 `6b45c3fa4027f75a97bb84e0f5d80446a8c316ca4cd6dd83b2fe939c0eb6ba63`，锚点 `startAnchor = "    const layout = await evaluate(sp, \`(() => {"`，`endAnchor = "#15q"`）做了 sha256 冻结；该段（`#15a~#15q`）逐字读取 `getElementById('log')` / `('composer')` 并按 `getComputedStyle` 断言 `#log` `flex-grow=1`、稳态高度占比（`#15b` `opPct > 45`）、`composer` 贴底（`#15c` `composerGapToBottom ∈ [0,12]`）、`#15e` 三区结构、`#15f~#15q` 消息卡/滚动/窄屏。v2 的 `AC-V2-002` / `FR-V2-023` / `NFR-V2-004` 把 `#log` 稳态占比 ≥65.0% / `clientHeight ≥589px` / composer 底边−视口底 ∈[0,+8px] 写成 P0 量化红线。v4 退役 `#log` 与 `#composer` 的常驻语义 ⇒ 该段**在语义上不可能字节不变**。父 spec 已授权「逐段决策 + 哈希变更必须台账留痕（old→new + 理由 + 日期）」。

## 决策
**八步操作流程（每步产出可核验产物，禁跳步、禁静默）**：

1. **记录 old**：把现状 `{file, startByte: 42766, endByte: 54004, sha256: 6b45c3fa…, lineCount: 185, startAnchor, endAnchor}` 逐字写入 `docs/v4-supersession-ledger.json#protectedSupersession`（v3 台账**不动**）。
2. **逐段决策**：
   - journey 段 → `decision: "supersede"`，`reason = "逐字读取被退役的 #log / #composer 常驻语义；v4 三区（#region-stream / #stream / 无常驻 composer）使字节不变在语义上不可能"`；
   - binding 段 `107780..115930`（sha `be9ad0e9…`，`#22a~#22l` V2-3 R2 命令级覆盖链）→ `decision: "keep"`，`reason = "属后台/协议面（高存活），v4 零触碰；保留 id 兼容，字节零改"`。
3. **`#15a~#15q` 同编号等价改写（强度不降）**：

   | 编号 | v3 断言 | v4 等价断言 | 强度论证 |
   |---|---|---|---|
   | `#15a` | `#log flex-grow === '1'` | `#region-stream` 的 `flexGrow === '1'` ∧ `#stream` 为 `#region-stream` 内唯一滚动区 | 同等（换成新三区锚点） |
   | `#15b` | `#log` 稳态高度占比 `> 45vh` | `#region-stream` rect.height / innerHeight **≥ 65.0%**（**v2 红线语义保留**） | **更强**（门槛 45 → 65） |
   | `#15c` | `composerGapToBottom ∈ [0,12]` | **法四**：默认屏 `#region-toolbar` / `#region-statusbar` / `#stream` 内**无可见常驻输入框**；`#composer` 若存在必须 `hidden === true` | **语义显式取代**（ADR-V4-016 的 spike 前置验证 ≥65% 可达性） |
   | `#15d` | 文档级零水平溢出 | 不变（`documentElement` 判定） | 同等 |
   | `#15e` | 三区结构 + 回到底部入口 | `#region-toolbar` / `#region-stream` / `#region-statusbar` 齐备 ∧ `#scroll-bottom` 存在 | 更强（新三区规范 id） |
   | `#15f~#15q` | 消息卡 / 工具卡字段 / 滚动策略 / 320px | `getElementById('log')` → `getElementById('stream')`；`log.textContent` → `stream.textContent`；其余语义不变 | 同等（选择器重锚） |

4. **登记 `modifiedRanges`**：把 `journey.mjs` 的改写区间写入 v4 台账 `modifiedRanges[]`，每条带 `{file, lines, oldId: "#15a~#15q", reason, leaf: "v4-1"}`。
5. **计算并写入新 pin**：改写后重新计算该段的 `{startByte, endByte, sha256, lineCount}`，写入 v4 台账 `protectedRanges[]`，并带 `{status: "active", supersededFrom: "6b45c3fa…", supersededOn: "<实测日期>", decision: "supersede"}`。
6. **计数守恒**：`journey.runtime ≥ 167`（`#15a~#15q` 为**同编号改写**，不减；若新断言拆分则**只增**）；`countMethod = "runtime-check-calls"` 显式声明（消灭 v3/r2 的跨口径歧义）。
7. **v2 量化红线重定标登记**：把「`#log` 稳态 ≥65.0% / `≥589px` / composer 贴底 ∈[0,+8px]」三条逐条登记 `redlineRemap[]`：① ≥65% → **语义保留**（`#15b` 新锚点）；② `≥589px` → **等价/更强替代**（`#region-stream` 高度占比 ≥65% + `#stream` clientHeight ≥ **v4-1 首轮实测下界**，只允许上调，登记于 v4 密度基线 `logClientHeightFloor` 同名字段）；③ composer 贴底 → **法四显式取代**（`#15c` 新义）。
8. **反证**：**RP-V4-08**（实跑）：删除 journey 中 1 条断言 → 取代台账 / 计数下界守卫**必须 FAIL**；还原后**必须 PASS**；全过程日志落盘（FAIL 段 + 还原后 PASS 段，**禁 tail 截断**）。另加**保护段哈希漂移反证**：人为改动新 pin 段 1 字节 → 台账门禁 FAIL（EC-CHAT-012）。

## 后果
- 「保护段不可静默改写」从约定变成**机器事实**：旧 sha 保留在台账、新 sha 参与判定、任何后续漂移都会 FAIL。
- 「composer 贴底」这条 v2 P0 红线被**显式取代而非删除**；`≥65%` 这条被**语义保留并抬高门槛**（45 → 65）——`AC-V2-002` 的**目的**（流区为主视觉）在 v4 下由更强约束承接。
- 代价：journey 保护段的 pin 从 1 段历史变为「1 段历史 + 1 段 active」，台账字段增加；后续任何对该段的改动都必须重新走本流程。

### ADR-V4-009: v4 取代台账 schema 与门禁（接管声明 + 按行判定 + leafBases 双段）

## 状态
ACCEPTED（承 FR-CHAT-080~085 / NFR-CHAT-007 / R-CHAT-015；替代方案见 §3.6 与 §3.8）

## 背景
v3 台账 `docs/v3-supersession-ledger.json` 已建立成熟的**按行判定**（受保护文件相对 base 的每条删除/改写行必须命中 `entries[].oldTitle` 或 `modifiedRanges`，否则 FAIL）、`counts.countMethod = runtime-check-calls` 口径显式化、`protectedRanges` 字节 hash pin、`pureAdditionFiles`、`leafBases` **叶段判据**（消除「base 之后引入又在叶内删除」的盲区）、`v3GateFloors` 叶下界。v4 的**删除行远多于 v3**（l0/l1 整层被取代），且 v3 台账必须**冻结为历史**（FR-CHAT-080：新建 v4 台账、不改写 v3 台账）。

## 决策
1. **落点**：`docs/v4-supersession-ledger.json`（与 v3 台账**并列不覆盖**），纳入版本库；`docs/v3-supersession-ledger.json` **逐字冻结**。
2. **schema（v3 沿用 + v4 扩展）**：
   - `version: "v4"` / `feature` / `base`（v4 起点 commit = `187c205`）/ `metric`；
   - **`takesOverFrom`（接管声明，必填）**：`{file: "docs/v3-supersession-ledger.json", mode: "frozen-history", supersededFiles[], note}` —— 显式声明「v3 台账的哪些受保护文件与下界由本台账接管后续取代」；
   - `counts`：每门禁 `{baselineRuntime, currentRuntime, countMethod: "runtime-check-calls", floor, note}`（**`countMethod` 唯一合法值**）；
   - `gateFloors`：`{journey: 167, insight: 108, binding: 192, sidepanelView: 38, nodeTestRuntime: max(646, 实测)}`（**只增不减**）；
   - `v4GateFloors`：按**文件名**登记叶下界（`test/ui/l0.mjs ≥ 73`、`l1.mjs ≥ 64`、`l2.mjs ≥ 68`、`density.mjs ≥ 60`），与 v3 同名叠加（**保留文件名**是 ADR-V4-011 的前提）；
   - `entries[]`：`{id, file, oldId, oldTitle, newId, newTitle, gate, reason, replacementExists, leaf}`；
   - `modifiedRanges[]` / `protectedRanges[]`（含 `status: active|superseded` + `supersededFrom`）/ `protectedSupersession`（ADR-V4-008 第 1~2 步产物）/ `redlineRemap[]`（v2 量化红线逐条）/ `zeroDiffFiles[]` / `leafBases[]` / `v4ReverseProofExpectations` / `v3Vol3Closeout`（ADR-V4-040 的收口证据）。
3. **门禁 = `test/supersession-ledger.test.ts`（扩展，非重写）**：
   - **双台账判定并存**：v3 段冻结（`protectedRanges` 2 段 hash **必须不变**；`counts` 快照只读）；v4 段按行判定（`git diff -U0 187c205..worktree`）；
   - **每条删除/改写 hunk 必须命中** v4 台账 → 未命中 = FAIL（FR-CHAT-085）；
   - `entries[].newTitle` **必须能在目标文件中定位**（防「先删后补理由」的橡皮图章）；
   - `protectedRanges[].status === 'active'` 的字节 hash 必须不变（含 ADR-V4-008 的新 pin）；
   - `counts.*.currentRuntime ≥ gateFloors.*` 且 `countMethod === 'runtime-check-calls'`；
   - `leafBases` **双段审计**（base→worktree + leafBase→worktree）沿用。
4. **反证 RP-V4-08**（实跑，`expectFailPattern` 声明）：① 删 1 条既有断言 → 计数下界守卫 FAIL；② 删 1 条且改台账为「已登记」→ 按行判定的 `newTitle` 可定位性 FAIL；③ 改动 active 保护段 1 字节 → hash FAIL；三者还原后 PASS，全日志落盘。
5. **元门禁联动**：新增 in-gate 反证（`density.mjs --reverse RP-V4-*`）登记为既有 `in-gate` 例外的**扩展说明**（追加文本，不改 `readReverseProofLedger()` 的硬编码台账路径）；`EXPECTED_AUDITED_FILES` 追加新门禁（ADR-V4-011 第 6 条）。
6. **禁止**：改容差 / 删断言 / 把 `newTitle` 写成无法定位的占位文本 / 把 v4 台账与 v3 台账合并（合并会破坏「v3 历史可审计」）。

## 后果
- 「删除行必须命中台账否则 FAIL」在 v4 上继续成立（hunk 级、机器事实），且 v3 历史保持可读。
- `countMethod` 唯一合法值 + `takesOverFrom` 显式声明 ⇒ 跨台账口径不再有歧义（R4-19 的缓解）。
- 代价：4 叶各自追加 `entries`/`modifiedRanges`，台账体量与审查成本上升；每叶收尾必须跑取代台账门禁（不得留红灯）。

### ADR-V4-010: 体积与冻结面策略 + 五要素中间重登记 + V3-VOL-3 收口序列 + min() 优先级

## 状态
ACCEPTED（承 FR-CHAT-090~094 / NFR-CHAT-006 / D-P-V4-07 / §12 裁决 6）

## 背景
`PENDING_ABSOLUTE_CAP{resolved:false, newBaselineBytes:null, absoluteCeilingBytes:null, resolvedOn:null}` + `evaluatePendingAbsoluteCap()`（标记缺失 ⇒ FAIL；`resolved:false` 时**禁止预填**；`resolved:true` 必须三值齐备 ∧ `absoluteCeilingBytes ≥ newBaselineBytes` ∧ `resolvedOn ∈ YYYY-MM-DD`）。`SIDEPANEL_CEILING = floor(基线 × 1.05)`（容差 5%）；`SIDEPANEL_CEILING_CAP` 已降级 `record-only`（V3-VOL-1 ② 的教训：**不设未经要求的自缚装置**）；`dist/content.js = CONTENT_MAX_BYTES = 177,076`（无容差）/ `pick-layer.js = 33,900`（零容差）。v4 是**净增** Feature（§2.9：+24~42 KB）。

## 决策
1. **冻结面（零触碰）**：`content.js` / `pick-layer.js` **不可重登记**（唯一路径 = 让它不变：`src/content/**` + `build.mjs` 零改动）；`manifest.json` / `KIND_SET` / 判定链 pin 零 diff。
2. **每次触碰 `sidepanel.js` 的轮次必须做五要素中间重登记**（各叶收尾内完成，不留下一叶）：
   `{measuredOn, newBaselineBytes, previousBaselineBytes, previousCeilingBytes, source(dist/sidepanel.js), buildCommand, reason(direction=raised 时必须写明「有意增重」的功能理由), measuredBy(叶子+轮次), reRegisteredFrom}`；旧值进 `SIDEPANEL_BASELINE_BYTES_HISTORY` + `_TIMELINE` + `SIDEPANEL_RE_REGISTRATIONS`；**容差 5% 不变**；`targetBudgetBytes`/`targetMet` 保持 `null`（禁止「目标达成」叙述回潮）；断言零删减；反证（+1 B → FAIL）在新值上重新驱动。
3. **`PENDING_ABSOLUTE_CAP` 在 v4-4 收口轮带值闭合**（ADR-V4-040 给出操作序列）：**实测 → 上取整 50 KB 档 × 1.10 → 作者一句确认 → `resolved:true` 三值齐备**；`resolvedOn` 用**实际实测日期**（`YYYY-MM-DD`）。**禁预填、禁静默删除标记**。
4. **各叶触碰面收窄声明**：v4 全部改动落在 **侧栏侧**（`src/ui/sidepanel/**` + `index.html` + `test/**` + `docs/**` + `package.json#scripts`）；**SW / content / 判定链 / `KIND_SET` 零触碰**（§2.6 / §2.7 T1~T6）。
5. **绝对上限 vs 5% 公式优先级（裁决 6，定论）**：
   - **绝对上限是硬墙，5% 公式是轮内软纪律**；
   - 二者并存时的判定 = `min(absoluteCeilingBytes, floor(currentBaselineBytes × 1.05))`；
   - V3-VOL-3 闭合后 absolute cap 生效即为此语义；实现 = `evaluateSidepanelSize()` 追加 `effectiveCeiling = Math.min(...)`（**收紧语义变更**，必须配**只增**的断言 + 反证：构造「≤ 绝对上限但 > 5% 公式」的格 → **必须 FAIL**，证明 5% 软纪律仍生效；再构造「≤ 5% 公式但 > 绝对上限」的格 → **必须 FAIL**，证明硬墙生效）；
   - `SIDEPANEL_CEILING_CAP` **不得**被读取（FR-CHAT-093 / NG-CHAT-007：绝对上限必须是「硬墙」，而**不是**「挡住合法功能的装置」——因此推导用「实测值 + 10% 余量」，不用「Feature 冻结上限」式自缚哲学）。
6. **否决**：预填 `PENDING_ABSOLUTE_CAP`（机制层 FAIL）、把 cap 重新接回判定（V3-VOL-1 ② 的回归）、放宽容差或删体积断言。

## 后果
- 不动面通过「让它不变」守住（最强形式）；`sidepanel.js` 通过**有据可查**的中间重登记逐步抬升，最终由收口轮一次性设置绝对硬墙。
- `min()` 语义让「绝对上限」与「5% 公式」同时有效，且两者互为补充（前者长期硬墙、后者轮内护栏）。
- 代价：4 叶各一次重登记 + 收口一次闭合；每次重登记必须逐模块归因（既有 `size:attribution` + `SIDEPANEL_GROWTH_BREAKDOWN` 机制可复用）。

### ADR-V4-011: 测试架构与门禁重定标（保留文件名 + 新门禁挂载 + shim 门禁化）

## 状态
ACCEPTED（**含偏差登记**：v4-1 门禁集合增补 l0/l1/l2；§1 偏差登记 2）

## 背景
v4 取代面最大的 5 个门禁：`journey.mjs`（167，**含保护段**）、`l0.mjs`（叶下界 73，**整文件重写**）、`l1.mjs`（64，**入口机制重写**）、`l2.mjs`（68，入口位置迁移）、`density.mjs`（60，**换口径重定标**）。元门禁的约束：`CHROMIUM_GATES.length === 9` 是**等值断言**且 FR-CHAT-084 要求「保持」；`EXPECTED_AUDITED_FILES` 是**下界**（可追加，无长度断言）；`readReverseProofLedger()` **硬编码**读 v3 台账；`REVERSE_PROOF_HARNESSES` 的 `expectFailPattern` 声明下界 ≥15。本机 ~1.5GB 内存，9 个 Chromium 门禁必须严格串行（R-CHAT-016）。

## 决策
1. **保留门禁文件名**：`test/ui/{journey,l0,l1,l2,density}.mjs` 与 `test/density-thresholds.test.ts`、`test/sidepanel-view.test.ts` **均不改名**，只在**同叶内重写内容**。理由：`v3GateFloors` 按文件名登记下界，改名会同时破坏「同名叠加」与「历史可审计」（R4-19 的缓解）。
2. **v4-1 门禁集合增补（偏差登记 2 的落地）**：v4-1 的收尾门禁清单 = 叶子 spec §8 原清单 **∪ `test:l0` ∪ `test:l1` ∪ `test:l2`**。理由：v4-1 取代 L0/L1 宿主 ⇒ 三者必然失效；不纳入集合等于「未跑」而非「绿灯」，违反 EC-CHAT-013。
3. **逐门禁策略**：

   | 门禁 | 基线 | v4 处置 | 计数 |
   |------|:--:|------|------|
   | `test/ui/journey.mjs` | 167 | 保护段 `#15a~#15q` **同编号等价改写 + 新 pin**（ADR-V4-008）；其余选择器重锚 | `≥ 167` |
   | `test/ui/l0.mjs` | 73 | **整文件重写**：三区骨架 + 工具栏 ≤5 + 状态栏 + 风险 chips 永不折叠 + 可点预算 + 豁免清单 + 可发现性 | `≥ 73` |
   | `test/ui/l1.mjs` | 64 | **入口机制重写**：`L1_TRIGGERS` → 工具栏/设置视图/卡内展开；**内容契约保留**（引用判定 / 回执 / 局部树 / 手势数据） | `≥ 64` |
   | `test/ui/l2.mjs` | 68 | 入口位置迁移（`#l2-entry-*` 在工具栏）+ 视图替换复核 + `#stream`↔`#view-host` 互斥 | `≥ 68` |
   | `test/ui/density.mjs` | 60 | 换口径（ADR-V4-006）+ 31 格（ADR-V4-007）+ 阶段 F 指向 v4 基线 + in-gate RP-V4-01~07 | `≥ 60` |
   | `test/sidepanel-view.test.ts` | 38 | **4 项布局契约逐项等价或更强改写**：① 三分区文档序 → 三区文档序（`#region-toolbar` → `#region-stream` → `#region-statusbar`）② `body{display:flex}` → 保留 ③ `#panel-bottom{flex:0 0 auto}` + `#composer` 末元素 → **法四**（`#composer` 非常驻 + 流内按需输入）④ `#log.empty:not(:has(> *))` → `#stream` 空态语义（等价重锚） | `≥ 38` |
   | `test/ui/binding.mjs` | 192 | **零改动**（保护段 2 保留；后台/协议面） | `≥ 192` |
   | `test/ui/insight.mjs` | 116 | 入口位置相关少量取代（视图本体与计数单源复用） | `≥ 108` |
   | `test/{zero-injection,page-input,hardening}.mjs` | 27 / 102 / 24 | 零改动（不动面） | 只增 |
   | `nodeTestRuntime` | 832 | 新增 5 个 node 门禁文件 ⇒ **只增** | `≥ max(646, 832)` |

4. **新门禁文件（新增 3 个 Chromium + 5 个 node）**：`test/ui/stream.mjs` · `test/ui/ask-auth-inflow.mjs` · `test/ui/recommendation.mjs`；`test/stream-model.test.ts` · `test/stream-persistence.test.ts` · `test/ask-auth-inflow.test.ts` · `test/recommendation-sources.test.ts` · `test/design-contract.test.ts`。
5. **shim 60 断言门禁化（AC-CHAT-025）**：`test/design-contract.test.ts` 断言：① 实跑 `node design/ui-redesign/option-f-shim.mjs` 退出码 0 且输出含 `60 passed` / `0 failed`；② shim 文件 sha256 == 常量（**设计契约冻结**）；③ `check(` 出现次数 == 60；④ 60 条断言 → 规范条款的**映射表 60 行**（与本测试内常量逐条对应，含 A1~I1 全覆盖）。**设计契约变更 = 改常量 + 登记**（禁静默改断言，FR-CHAT-036）。
6. **元门禁挂载（P-V4-08 方案 A）**：
   - `EXPECTED_AUDITED_FILES` **追加** `test/ui/stream.mjs` / `test/ui/ask-auth-inflow.mjs` / `test/ui/recommendation.mjs`（该常量**无长度断言**；扫描集合须为其超集）；
   - `CHROMIUM_GATES` **保持 9**（FR-CHAT-084 逐字满足；沿用 `page-input.mjs` / `zero-injection.mjs` / `l1-reverse.mjs` / `l2-reverse.mjs` 先例），并在注释中**如实说明**「已知门禁下界 ≠ 全部 Chromium 门禁」；
   - **反证走 in-gate 形态**（`density.mjs --reverse RP-V4-01~07`），登记为既有 `in-gate` 例外的**扩展说明**（追加文本）；**不改** `readReverseProofLedger()` 的硬编码台账路径；`expectFailPattern` 声明数**只增**（当前下界 ≥15）。
7. **真实产物 vs 设计稿分列**（R4-20 的缓解）：`test/design-contract.test.ts` 只校验**设计稿**；真实产物侧等价断言**必须**落在上述 Chromium 门禁，且两者数字分列登记（`docs/v4-density-baseline.json#designCaliber`）。
8. **门禁纪律**：`test:v4` **链式 `&&` 串行**（一次一个 Chromium，无并发）；日志 `tee` 到 `/tmp/opencode/v4-gate-logs/<gate>.log`（**禁 tail 截断**）；反证必须实跑 FAIL → 还原 → PASS；**本 plan 阶段不跑任何门禁 / 构建 / Chromium**。

## 后果
- 取代面被 5 个门禁的**同叶重写**吸收，计数下界只增；元门禁的 9 与 15 两条字面约束**均不被破坏**。
- 新增 3 个 Chromium 门禁使 `test:v4` 更长（约 +3 轮 Chromium），必须在排期里前置计入（R-CHAT-016）。
- 代价：`test/gate-integrity.test.ts` 需追加 `EXPECTED_AUDITED_FILES` 条目与例外说明文本 —— 该文件自身受取代台账与元门禁约束，必须只增不减并登记。

### ADR-V4-012: 过程卡族固化语义 = append-only + 终态冻结（裁决 1 消解）

## 状态
ACCEPTED（承 §12 裁决 1 / D-P-V4-03 / FR-CHAT-021~023 / FR-CHAT-035 / R-CHAT-006）

## 背景
「卡片只固化不撤销」（法二）与「过程卡族需要显示进行中→完成」（工具卡 `ok`/`ms` 后到）表面矛盾。若把「完成」实现为「改写原卡」，就与 append-only 冲突；若实现为「另加一张完成卡」，则卡数翻倍、破坏「工具名 + 状态 + 耗时 同卡」契约（`journey#15g`）并冲击首屏 ≤2。

## 决策
1. **两层分离**：**事件层不可变**（`StreamEvent` 写入即冻结）；**投影层可变至终态**（`CardView` 由事件序列推导）。
2. **状态迁移的定义**：「进行中 → 完成」= **追加后续事件**（`tool-result` / `thinking-done`），由 `project()` 把它们并回同一 `cardId` 的卡；**不是**改写任何已写入事件。
3. **终态冻结**：`CardView.terminal` 一旦非空（`answered` / `cancelled` / `approved` / `rejected` / `invalidated` / `completed`），任何后续 `project()` **不得**改变它；到达终态后的任何新事实只能落为 ① 新 `system` 事件行，或 ② 新卡（如 `ref` 重拾 → 新 `ref` 卡，`refNum+1`）。
4. **工具卡示例（精确语义）**：`tool-start` 事件（`payload.tool`, 无 `ok`/`ms`）→ 卡渲染为「工具名 + 进行中」；`tool-result` 事件（`payload.ok`, `payload.ms`）→ 同卡 patch 为「✓/✖ + 耗时」并置 `terminal='completed'`。信息字段（工具名 / `ok` / `ms` / 预览 / 折叠记忆 480B / 10 行）**逐项保留**（FR-CHAT-035）。
5. **思考指示同构**：`thinking` → `thinking-done`，终态 `completed`；**不得**实现为「append 后 remove」（那会引入 DOM 删除路径与留痕丢失）。
6. **DOM 层对应**：`stream-render` 的「patch」只允许修改**未终态**卡的字段；终态卡的 DOM 在 patch 写入后**冻结**（后续渲染不得再触碰其内部），由 `test/ui/stream.mjs` 断言（终态卡的 `outerHTML` 在后续渲染后不变）。
7. **否决**：「完成卡」形态（卡数翻倍）、事件可变（违反 FR-CHAT-020）、终态后可改写（违反法二 / FR-CHAT-023）。

## 后果
- 裁决 1 的「状态迁移允许、终态后冻结」有**唯一**的机器表达（事件层冻结 + 投影终态不变式），可被 `test/stream-model.test.ts` 与 `test/ui/stream.mjs` 双向锁死。
- 「撤销」在 v4 中**没有控件**，它是一条新的 `system` 事件行（FR-CHAT-023 / AC-CHAT-005）。
- 代价：投影层承担了「把多条事件合成一张卡」的复杂度；工具卡/思考卡的字段合并规则必须写在一处（`cards/index.ts` 的注册表），否则会漂移。

### ADR-V4-013: 卡分类学（7 主类 + 过程卡族 5 形态）与设计契约变更登记

## 状态
ACCEPTED（承 §12 裁决「卡分类学」/ D-P-V4-03 / FR-CHAT-021/030/036 / O-CHAT-008 / R-CHAT-013）

## 背景
F 稿与 shim `CARD_TYPES` 定 7 类：`ai / user / nextstep / askuser / auth / system / ref`。而现状 `#log` 内实际存在 5 种过程形态：**工具卡**（`details.tool-card` + `ok`/`ms`/预览/折叠）、**命令行**（`.cmd`）、**思考指示**（`.msg-thinking`）、**错误条目**（`.entry-error`）、**工具通知**（`.msg-notice`）。若把工具卡硬塞进 `ai`/`system` 会丢信息与既有门禁断言（TASK-023 能力）；若新增第 8/9 类又必须改设计契约。

## 决策
1. **分类学 = 7 主类 + 过程卡族（AI 消息族的子形态）**：

   | 层 | 成员 | 语义 |
   |---|---|---|
   | **7 主类** | `ai` / `user` / `nextstep` / `askuser` / `auth` / `system` / `ref` | 与 shim `CARD_TYPES` **逐字一致**（B1/H11） |
   | **过程卡族** | `tool` / `command` / `thinking` / `error` / `notice` | AI 消息族的子形态；**全部 append-only**、适用统一固化契约；**不丢失任何既有信息** |

2. **单一登记**：`src/ui/sidepanel/cards/index.ts` 导出 `CARD_TYPES`（12 项 = 7 + 5）与 `CARD_KIND_LAYER`（`primary` / `process`）+ 卡工厂注册表。任何扩展必须**显式登记**（FR-CHAT-036）。
3. **DOM 契约**：每张卡 = `<li data-msg-type="<kind>" data-card-key="<cardId>">`；固化态 = `data-*`（`data-answered` / `data-decision` / `data-ref-state`）+ `[hidden]` 切换表单/固化区 + `.ts`（`HH:MM:SS`）+ `.card-fixed`。过程卡族的 DOM 契约与主类**同一套**（不另立）。
4. **设计契约变更登记方式**：若需扩展 `CARD_TYPES`（例如未来新增 `action` 类）→ ① 改 shim 的 `CARD_TYPES` 与相应断言；② 更新 `test/design-contract.test.ts` 的 sha256 常量与计数（60 → N）；③ 在 v4 台账登记 `designContractChanges[]`；④ **禁静默改断言**。本 Feature **不扩展** 7 主类（O-CHAT-005 已否决第 8 类 `site`/`action`）。
5. **7 主类的归属锚点**：`ai`/`user` 富文本与对侧气泡（复用 `markdown.ts`）；`system` 单行 + 时间戳；`ref` 有效/失效 + 序号递增；`nextstep` chips 即指令；`askuser`/`auth` 由 v4-3 落业务态（v4-2 只提供渲染骨架与固化契约）。

## 后果
- 「不许丢弃任何既有过程形态」（NG-CHAT-006）被**类型清单**固定，且 5 种形态继续拥有各自的 DOM/断言。
- shim 的 60 断言**字面不变**（7 主类仍是 7）；过程卡族由项目门禁（`test/ui/stream.mjs`）承载 —— 设计稿契约与真实产物增强面**分离且都受门禁**。
- 代价：`CARD_TYPES` 语义从「F 稿 7 类」扩展为「12 项卡型清单」，文档与注释必须写清「主类 vs 过程族」以免被读成违反设计契约。

### ADR-V4-014: AC-CHAT-016 授权回看单一归属 = v4-3（裁决 2 消解）

## 状态
ACCEPTED（承 §12 裁决 2 / FR-CHAT-047 / AC-CHAT-016 / O-CHAT-005）

## 背景
AC-CHAT-016 有两个面：① 单次操作授权（`confirm`）的批准/拒绝在**流内**固化可读 + 时间戳 + 审计入口；② **站点级授权动作**在**设置视图**可发现与可读。v4-1 负责三区骨架与工具栏/设置视图入口，v4-3 负责 ask/授权卡流内化，v4-4 在引用/推荐上下文内可能展示授权状态。若三处都「各自实现授权回看」，会出现三套口径与三处重复断言。

## 决策
1. **AC-CHAT-016 的唯一验收归属 = v4-3**（confirm 授权卡的固化态 + 流内可回看 + 审计入口 + 与审计视图的分工 + 站点级授权在设置视图的可发现性由 v4-1 提供入口、由 v4-3 承担验收）。
2. **v4-1 的边界**：只提供**设置视图内**的「站点与授权」分区与工具栏入口（`#l2-entry-settings`）；**不**断言 AC-CHAT-016 的任何条款（避免同一 AC 在两叶重复验收造成口径分叉）。
3. **v4-4 的边界**：在引用/推荐上下文内展示授权状态时**只读引用 v4-3 契约**（`data-decision` / 审计入口 id），**不新建**授权展示组件、不新增断言所有权。
4. **v4-3 的承载**：`cards/auth.ts` + 设置视图「站点与授权」分区；`test/ui/ask-auth-inflow.mjs` 承载 AC-CHAT-016 的全部断言（含站点级授权在设置视图的可发现与可读）；`test/ask-auth-inflow.test.ts` 承载状态机侧。
5. **断言所有权登记**：在 v4 台账 `entries[]` 中为 AC-CHAT-016 的相关断言标注 `owner: "v4-3"`，供 review/validate 一处核对（禁三处重复）。

## 后果
- 同一 AC 只有一处验收 ⇒ 口径不分叉；v4-1/v4-4 的断言只覆盖各自范围。
- 代价：v4-1 的工具栏设置入口必须**先于** v4-3 存在（叶子顺序天然满足：v4-1 → v4-2 → v4-3）。

### ADR-V4-015: 推荐卡真值派生约束（裁决 5 消解）

## 状态
ACCEPTED（承 §12 裁决 5 / FR-CHAT-060 / O-CHAT-006 / A-CHAT-009）

## 背景
「下一步推荐」是本 Feature **唯一需要新增生产者**的内容类型。v3 曾对 `#l2-entries` 的计数设过豁免（settings 计数），而该豁免位成为「用计数低来掩盖控件多」的口子（v3 F6 豁免坑）。若推荐卡依赖设置项计数类真值，等于把该口子搬到推荐生产者上。父 spec 明定「不新增 LLM 侧产物」。

## 决策
1. **真值白名单（唯一允许的派生来源）**：
   - **引用状态**（`l1/ref-store`：有效数 / 失效数 / 最近一次重锚）
   - **会话状态**（活跃 `sessionId` 有无 / 未答卡数 / 当前段是否为空）
   - **站点授权态**（`authorized` / `trust`）
   - **命令档案静态面**（`insight/catalog-meta` 的 `toolCount` / `subcommandCount` 常量）
   - **探测状态**（`probe.phase` / `steady`）
   - **五类风险态**（未授权 / 探测中 / 硬底线被拦 / 破坏性待确认 / 引用失效）
   - **onboarding 步骤**（首装态专用）
2. **明确排除（禁）**：`l2/counts.ts#deriveCounts()` 的 **`settings` 分区渲染计数**；任何「因为某视图有 N 项所以推荐它」的计数派生；任何需要**新 LLM 调用**的内容（若必须 → 属新面，必须显式登记且**不在本 Feature 隐含**）。
3. **机器化**：`test/recommendation-sources.test.ts` 静态断言 `recommend.ts` 的**导入集合** ⊆ 白名单模块集合，且**不出现** `settings` / `deriveCounts(…).settings` 引用；规则表以常量导出并可复算（见 ADR-V4-037）。
4. **chips 即指令**：点击**直接发起回合**（与 composer 走**同一生产入口**，防旁路），不跳浮层、不复制到输入框。
5. **无候选不渲染**：候选集为空 ⇒ **不渲染** `nextstep` 卡（禁「下一步：无」式假推荐，EC-CHAT-008）。
6. **否决**：引入 LLM 侧产物（新面）、以设置项计数为真值（F6 豁免坑复现）、渲染空推荐卡。

## 后果
- 推荐的能力发现（G-CHAT-004）**不引入任何新网络/隐私/成本面**；生产者可被静态门禁约束。
- 若未来确需 LLM 侧推荐 → 必须另立 feature/ADR 并登记，本 Feature 不隐含。
- 代价：推荐范围被限制在「既有真值能表达」的集合内（这是刻意的：优先「可机器验证 + 零新面」）。

### ADR-V4-016: journey ≥65% 占比可达性 = 前置 S 级 spike（裁决 7 消解）

## 状态
ACCEPTED（承 §12 裁决 7 / FR-CHAT-082 / AC-CHAT-017 / R-CHAT-002）

## 背景
ADR-V4-008 把 v2 的「流区高度占比 ≥65%」作为**语义保留**的等价断言（`#15b`）承接。但 v4 的三区增加了工具栏（1 行 + 站点摘要）与状态栏（连接状态 + 风险 chips），在 **320px 窄屏 + 双主题 + 风险 chips 详情展开**的最坏态下，`#region-stream` 的高度占比是否真能 ≥65% **未经实测**。裁决 7 明确：**不裁决、要求前置验证**，不可达时停下上报，**不得静默弱化**。

## 决策
1. **v4-1 的第一任务必须是一个 S 级 spike**（TASK-401 同款模式，不可跳过、不可后置）：
   - **测量对象**：`#region-toolbar` 与 `#region-statusbar` 的**占用高度**（含风险 chips 详情展开态、含 `#scroll-bottom` 与 `#view-host` 侧骨架）；
   - **矩阵**：3 宽度（320 / 400 / 520）× 2 主题（明 / 暗）× 2 风险态（无风险 / 风险 chips 详情展开）= **12 格**；
   - **判据**：每格 `#region-stream` 的 `getBoundingClientRect().height / window.innerHeight ≥ 0.65`；
   - **产物**：12 格实测表（含最差格）+ 计算过程 + 落在 v4 台账 `entries[]`（`id: V41-SPIKE-401`）与 `docs/v4-density-baseline.json#streamRatioSpike`。
2. **若某格 < 65.0%** ⇒ **立即停下并向编排器上报**，附：① 实测表 ② 占用高度归因（工具栏 / 状态栏 / chips 详情各多少）③ 两个可选项（**显式取代**该红线并登记 old→new + 理由，或**参数微调**如状态栏压缩为单行 / chips 详情默认不占位）。
3. **禁止**（明确列禁）：① 静默把阈值下调到实测值；② 把 `#region-stream` 的高度改用「内容高度」而非 rect 高度来凑数；③ 删除该断言；④ 把 `#region-stream` 之外的元素算进占比分子。
4. **若 12 格全部 ≥65%** ⇒ spike 通过，`#15b` 直接按 `≥ 65.0%` 落断言（**不需要**编排器裁决），并在台账登记实测表作为「可达性证据」。
5. **顺序硬约束**：spike **不得**后置到 v4-1 收尾之后；其结论（可达 / 不可达）决定 `#15b` 的最终形态，因此必须先于 journey 保护段改写（ADR-V4-008 第 3 步的 `#15b` 行）。

## 后果
- `AC-V2-002` 的占比红线在 v4 下**要么被更强/等价承接（≥65% 实测通过），要么被显式取代（上报裁决）**——两种路径都不允许静默弱化。
- 若不可达，返工范围被限制在 v4-1（而不是 4 叶做完才发现），这是本 ADR 的核心价值。
- 代价：v4-1 的第一个任务不是写代码而是测量（S 级成本可控，且与 v3 的 `ADR-V3-035` spike 先例同形）。

---

## 8. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：v4「聊天流统一承载」**统领性技术方案**（父 + 4 叶同批）。**产出**：父 `plan.md`（本文件，含 §1~§8）+ 4 叶 `plan.md`；**ADR-V4-001~040**（父承 001~016，叶子承 017~023 / 024~029 / 030~034 / 035~040）。**覆盖编排器 12 项技术设计必答**（§2.8 逐项索引）与 **7 条 spec 新风险裁决**（§4 逐条 → ADR）。**关键裁决**：① 事件流模型 = 事件不可变 + 投影可变至终态（append-only + 终态冻结；`seq` 全局单调、`sessionId` 分段、内存段保留）；② 持久化 = **摘要落库 + 内存全量**（面板侧 `chrome.storage.local`，零 SW 改动 / `KIND_SET` 零 diff）；③ 渲染 = **keyed 增量渲染**（永不清空，append/patch/remove(bound) 三件事）；④ 三区骨架 = **同构迁入 + 占位宿主**（`data-transitional-host` + 收口清零门禁），`#log`→`#stream` 为唯一 id 重命名；⑤ 密度 = 「`document.body` 表达式根 + `DENSITY_EXCLUDED_SUBTREES=['#stream']` 单源排除」+ **31 登记格** + 三条防滥用（单卡 ≤6 / 首屏 ≤2 / 欢迎卡 ≤1 且 ≤8 行）+ 旧 22 格冻结为 v3 历史；⑥ journey 保护段 = **显式取代 + 新 pin 八步流程**（`#15b` ≥65% 语义保留、`#15c` composer 贴底 → 法四），binding 段保留零改；⑦ v4 取代台账 = `docs/v4-supersession-ledger.json`（`takesOverFrom` 接管声明 + 按行判定 + `leafBases` 双段 + `countMethod` 唯一合法值）；⑧ 体积 = 每叶五要素中间重登记 + 收口带值闭合 `PENDING_ABSOLUTE_CAP` + **`min(绝对上限, floor(基线×1.05))`** 优先级；⑨ 测试架构 = **保留门禁文件名** + v4-1 门禁集合**增补 l0/l1/l2** + 新门禁加入 `EXPECTED_AUDITED_FILES`（`CHROMIUM_GATES` 保持 9）+ in-gate 反证 + shim 60 断言门禁化。**偏差显式登记**：父 `plan.md` 产出与否（ADR-V4-001）、v4-1 门禁集合增补（ADR-V4-011）、journey 保护段取代（ADR-V4-008）、三区骨架的同构迁入取舍（ADR-V4-005）。**新发现执行层风险**：R4-17（v4-1 门禁集合缺 l0/l1/l2）/ R4-18（占位宿主生命期）/ R4-19（跨台账口径漂移）/ R4-20（设计契约与真实产物双实现漂移）。**本阶段只做 plan**：不写 tasks、不写代码、不改 `src/**`·`test/**`·`manifest.json`·`design/**`·`dist/**`·ROADMAP、不改 v1/v2/v3 SDDU 目录、不动 `main`、不 commit/push、**未跑任何门禁 / 构建 / Chromium**、**未调用任何受管 Provider**。 | 2026-09-18 | SDDU Plan Agent |
