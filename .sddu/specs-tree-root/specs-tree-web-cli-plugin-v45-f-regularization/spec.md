# Feature Specification：specs-tree-web-cli-plugin-v45-f-regularization（web-cli-plugin v4.5「F 还原度转正」）

> **文档定位**: SDDU 需求规范 — 定义功能需求、非功能需求和边界情况，作为 plan 阶段的输入
> **前置依赖**: 本目录 `discovery.md` v1.0（2026-09-21）——问题清单 **Q-REG-001~012**（核心 4 / 次要 4 / 潜在 4）/ 假设 **A-REG-001~008** / 风险 **R-REG-001~015** / 开放问题 **O-REG-001~009** / 现状基线 §7.1（全量 `file:line` 证据）/ 红线清单 §7.2（N1~N18）/ 门禁影响面预判 §7.3
> **直接输入**: `packages/web-cli-plugin/docs/f-fidelity-fix-2026-09-20.md`（FIX-1~4 已落地 + §5 deferred 1~4）+ `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v4-chat/closeout.md` §7 deferred（1/2/8/9）
> **设计基准**: `packages/web-cli-plugin/design/ui-redesign/option-f-chat-stream.html`（sha256 `49ce27fc…`）+ `option-f-shim.mjs`（sha256 `8ca5db6f…`，60 断言）—— **本 Feature 不触碰 `design/**` 与 shim**，只让实现服从 F 稿纯形
> **创建人**: SDDU Spec Agent
> **创建时间**: 2026-09-21
> **版本**: v1.0
> **更新人**: SDDU Spec Agent
> **更新时间**: 2026-09-21
> **更新说明**: 初始创建（v4.5「F 还原度转正」需求规范：父 Feature = 轻量规范容器 + 1 个叶子子 Feature；含编排器对 O-REG-001~009 九条开放点的逐条裁决落位）

web-cli-plugin v4.5「F 还原度转正」需求规范 —— 把 F 方案（聊天流统一承载）的**结构性收尾**从「已登记为 deferred 的过渡形态」转为「可验收的纯形」：**5 条提示带的可见投影退役（单写化）**（事实面唯一）+ **4 个固定位置宿主退役（`ol#stream` 成为纯时间序卡列表）**（时间序不被结构打断），并附带入册 `options/index.html` 授权文案的显式解冻订正。编号一律 `FR-V45-*` / `NFR-V45-*` / `EC-V45-*` / `AC-V45-*` / `NG-V45-*`（与 v1/v2/v3/v4 零冲突）。**父 Feature 定位 = 轻量规范容器**（不承接 tasks / build / review / validate），实施由唯一叶子承载。

**题眼（本 Feature 名 `f-regularization` 的语义）**：v4 的收口结论是「F 的形态目标未完全达成，但残余已被登记为结构性遗留」，其制度依据是 `host-registry.ts:46-51` 把四个宿主逐字登记为「**permanent structural home now**」、理由是「**its content is pinned by protection gates**」——即**由门禁反推出形态的永久性**。v4.5 推翻这条推理链：**先让实现服从 F 稿的纯形，再让门禁去描述新形态**，而不是让形态停在门禁能读的位置。

---

## 1. 元数据

| 字段 | 值 |
|------|-----|
| Feature ID | specs-tree-web-cli-plugin-v45-f-regularization（web-cli-plugin v4.5「F 还原度转正」，ROADMAP **F-31**） |
| 名称 | web-cli-plugin v4.5「F 还原度转正」——F 方案的结构性收尾：5 条提示带退役可见投影（单写化）+ 4 个固定位置宿主时间序化（`ol#stream` = 纯时间序卡列表）+ FIX-5 空态噪音消解 + `options/index.html` 授权文案解冻订正 |
| 优先级 | P0 |
| 目标版本 | **v0.9.1**（v4 维护版本段；ROADMAP 实测 `v0.9.1` 零命中。措辞区分于 v0.9.0 三主题并列：v0.9.1 = **v4（F-30）的维护收尾**，不是新主题。**ROADMAP 登记由收口执行**——本阶段一字未改） |
| 分支 | `feature/web-cli-plugin`（与 v1/v2/v3/v4 同分支继续堆；**不合 main、不发布**；`main` 未动） |
| 当前 HEAD | `8a7e930`（2026-09-21，discovery 产物）；基线产物 `dist/sidepanel.js` = **480,026 B**（`test/size-baseline.ts:301 SIDEPANEL_BASELINE_BYTES = 480_026`） |
| 上游/底座 | v1 `specs-tree-web-cli-plugin`（F-14）+ v2 `specs-tree-web-cli-plugin-v2-insight`（F-27）+ v3 `specs-tree-web-cli-plugin-v3-ui`（F-28）+ v4 `specs-tree-web-cli-plugin-v4-chat`（F-30）—— 全部**只读复用、零改写** |
| 目录深度 | depth=1（父 Feature，轻量规范容器）；子 Feature = **1 个叶子**（depth=2，见 §12） |
| 叶子 | `specs-tree-v45-1-single-write-chronology`（唯一叶，承载两项核心 + 两项附带；两项核心共享同一次体积重登记与同一次 journey 结构重锚 ⇒ **不可分割**） |
| 相关干系人 | 作者（插件当前唯一真实用户 + 立项人；**已授权编排器代行决策、全流程自行调度**）；编排器（D1~D6 定论 + O-REG-001~009 裁决）；下游 @sddu-plan / @sddu-tasks / @sddu-build / @sddu-review / @sddu-validate |
| 关联问题 | Q-REG-001~004（核心）/ Q-REG-005~008（次要）/ Q-REG-009~012（潜在） |
| 关联风险 | R-REG-001~015（discovery 继承）+ R-REG-901~906（spec 新增，见 §14） |

---

## 2. 上下文

### 2.1 立项来源（**deferred 登记的逐字引用，不得转述走样**）

v4.5 **不是新增想法**，而是把 v4 收口时**已登记、已给出理由、已明确「结构性、需单独立项」**的 deferred 项转正。

| 来源 | 原话（逐字引用） | 落点 |
|---|---|---|
| `docs/f-fidelity-fix-2026-09-20.md` §5.3 | 「**strips 单写化**（退役可读投影、事件行为唯一面）—— 动保护门禁 pin 的容器，结构性，需单独立项。」 | 核心项 1 |
| `docs/f-fidelity-fix-2026-09-20.md` §5.4 | 「**宿主时间序化**（`decision` / `l1-panels` / `strips` 并入时间序）—— 同上，结构性，需单独立项。」 | 核心项 2 |
| `docs/f-fidelity-fix-2026-09-20.md` §5.1 | 「**FIX-5（空态 L1 噪音）—— deferred**。……隐藏 0 计数会同时改写 density 默认档 31 格与 L1 结构断言 ⇒ **门禁非零破坏**，按约定顺延。」 | 附带项 1（按「被核心 2 覆盖则消解」口径） |
| `docs/f-fidelity-fix-2026-09-20.md` §5.2 | 「**`src/ui/options/index.html` 的授权指引文案** —— 该文件在 v3 台账 `zeroDiffFiles` 中冻结（且 v3 台账为冻结历史，不得解冻）。**若要改需先走一次显式解冻登记，属治理动作**，本轮不做。」 | 附带项 2（O-REG-004 裁决：**解冻**） |
| `closeout.md` §7 deferred 1（N-05） | 「**N-05 重锚按钮不在流内卡内**……**升级条件：真机反馈需要卡内按钮 ⇒ 小改进项**。」 | 核心项 2 的裁决对象（O-REG-008：**关闭**） |
| `closeout.md` §7 deferred 8 | 「**V3-VOL-3 绝对上限的作者确认仍挂起**：`authorConfirmation.status = pending-author-line`……**属未闭合义务，不是已完成项**。」 | 风险预登记输入（R-REG-007 / FR-V45-092） |
| `closeout.md` §7 deferred 9 | 「**密度打开态类残余**（承 v3 口径）：……v4-1 起密度基线改为 31 登记格 + RP-V4-09，**打开态未新增登记格**。」 | 风险预登记输入（R-REG-008 / FR-V45-071） |
| `closeout.md` §7 deferred 2（`KL-N-10`） | 「**`test:binding` 环境性 flake**……**纪律**：串行 / 首轮异常隔离复跑 ≥2 / 日志全量 / 仍红如实记录不阻塞收口」 | 验证纪律继承（FR-V45-084 / §15） |

### 2.2 编排器代作者决策承接（**定论，直接作为需求约束，不重新讨论**）

| # | 决策（discovery §0.2 D1~D6 逐字） | 本规范承载体 |
|---|---|---|
| D1 | **作者已授权编排器代行决策、全流程自行调度**（spec/plan/tasks/build/review/validate 均按此口径） | §13 裁决记录 / §15 纪律 |
| D2 | **Feature 目录 = `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v45-f-regularization/`** | §1 / §12 |
| D3 | **ROADMAP 编号 = F-31**（实测 ROADMAP 中 0 命中；`F-29` A2A 候选保持原样不动） | §1 / NG-V45-012 |
| D4 | **版本位 = v0.9.1（v4 维护版本段）**；本轮实测零冲突，登记留给收口 | §1 |
| D5 | **范围 = 核心 2 项 + 附带 2 项** | §3.1 / §5 |
| D6 | **纪律：`.sddu/**` 只写本 Feature 目录；不改任何 `src/`、`test/`、`dist/`、`docs/`、`design/` 与 ROADMAP**（spec 阶段 = 纯文档阶段，零运行时验证） | §15 / NG-V45-012 / NG-V45-013 |

### 2.3 设计基准与 F 的「纯形」目标（**逐字口径，作为验收锚**）

设计基准 = `design/ui-redesign/option-f-chat-stream.html`（1,927 行 / S1~S7 场景）+ `option-f-shim.mjs`（60 断言），由 `test/design-contract.test.ts` **sha256 冻结**：

| 冻结对象 | sha256 | 事实 |
|---|---|---|
| `design/ui-redesign/option-f-chat-stream.html` | `49ce27fc1daba083cc361639d3d0a1ad991b961f0fa0f45fc016815e0fe2e526` | `test/design-contract.test.ts:70` 常量 `DRAFT_SHA256` |
| `design/ui-redesign/option-f-shim.mjs` | `8ca5db6f7a152c2890814cff2fe58dc11345338890b26de62b3355837f591ed4` | 同上 `SHIM_SHA256`（`SHIM_CHECK_CALLS = 60`） |

**三区法则（`option-f-chat-stream.html:31-73` 逐字要点）**：

- **工具栏**（顶部一行常驻）：只放 ① 站点摘要（读只读 status，不可点）② 常驻导航（树 / 命令 / 审计 / 设置 + 主题切换）；**可点元素合计 ≤5**；**禁止：任何一次性交互（问答 / 授权 / 推荐）出现在工具栏**。
- **聊天流**（主体，**唯一交互面**）：**追加式消息流，正序排列**，自动滚到底，可上滚回看（= 留痕）；**一切交互皆 7 类消息卡之一**。
- **状态栏**（底部常驻，**永不折叠**）：连接状态一行 + 活跃风险 chips；**永不折叠**。

**五法（F 稿 `:62-72` 逐字要点）与 v4.5 相关性**：

| 法则 | 逐字要点 | v4.5 相关性 |
|---|---|---|
| 法一 一切交互皆消息 | 问答 / 授权 / 推荐 / 系统事件一律入流；一次性交互禁止出现在工具栏或浮层 | 直接相关（宿主里的残留交互） |
| 法二 留痕即事实 | 卡片只固化不撤销；流 = 会话审计线索 | 直接相关（双写破坏「事实唯一面」） |
| 法三 三区各司其职 | 工具栏只放常驻导航与站点摘要；状态栏只放常驻状态与风险；**一切「过程」进流** | 直接相关（提示带 / 决策壳 = 过程未归流） |
| 法四 输入按需出现 | 无常驻输入框；ask-user text 输入框只在问题卡内 | 相关（`#composer` 保持 `hidden`，仅**物理位置出流**） |
| 法五 默认密度继承 | 默认屏可点 = 工具栏 + 状态栏合计 ≤7；**聊天流内容不计入默认密度** | 相关（豁免口径 = `#stream` 子树，**不变**） |

**「相对 E 的变化点」（F 稿 `:1487-1499` 逐字要点——F 纯形目标的验收锚）与 v4.5 现状差距**：

| # | E（渐进式披露） | F（聊天流统一承载） | v4.5 现状差距 | 本规范承载 |
|:-:|---|---|---|---|
| 1 | L0 只有「当前那一张决策卡」独占一个槽位，历史收进 L1「已决策历史」 | **对话历史 = 流本身**；当前题就是流里最新一条消息，旧卡原样留在上方 | 🔴 `#l0-decision` 宿主仍**独占槽位**（kicker / 更多选项 / 回执摘要 / 引用开关）+ `l1-panels` 的「已决策 0 步」仍与流并存 | FR-V45-020~022 / FR-V45-026 |
| 2 | 问答在决策卡槽位里就地完成，未入流 | ask-user 卡内联在流中，应答/取消后**固化不可逆** | 🟢 已达成（v4-3）；残余 = `#l1-more` / `#l1-consequences` 仍在决策壳内 | FR-V45-021 |
| 3 | 授权批准就地发生，事后在审计里查 | 权限申请卡入流，批准/拒绝固化 + 时间戳 + 「查看审计」跳转 | 🟢 已达成（v4-3）；残余 = `#notice` 回执仍双写 | FR-V45-010~013 |
| 4 | 引用失效住在 `#risk-rail`（常驻风险位） | 失效 = 系统事件行 + 失效引用卡（卡内「重新拾取 / 改用描述」）+ 状态栏 chip，**三处呼应** | 🟡 部分（N-05：一键重锚按钮在 **L1 面板**而非卡内） | FR-V45-021（O-REG-008 关闭 N-05） |
| 5 | 状态栏是「入口按钮」：点开是 L2 入口面板 | 状态栏右移为常驻状态 + 风险 chip；四个视图入口上移到工具栏 | 🟢 已达成（v4-1） | — |

> **推论（约束，不是需求）**：`design/**` 与 shim 是**同一契约的两面**，改动必须同时满足 shim 60/60 并更新常量 + 台账。**v4.5 不触碰 `design/**`**——本 Feature 修的是**实现层形态**，不是 12 卡类型学或三区法则本身。

### 2.4 编号命名空间声明（**强制**）

| 命名空间 | 本 Feature 使用 | 历史占用（**零冲突，禁止复用**） |
|---|---|---|
| 功能需求 | `FR-V45-###` | v1 `FR-001~055`；v2 `FR-V2-001~079`；v3 `FR-V3-001~087`；v4 `FR-CHAT-001~094` |
| 非功能需求 | `NFR-V45-###` | v1 `NFR-001~010`；v2 `NFR-V2-001~010`；v3 `NFR-V3-001~018`；v4 `NFR-CHAT-*` |
| 边界情况 | `EC-V45-###` | v1 `EC-001~026`；v2 `EC-V2-001~016`；v3 `EC-V3-001~017`；v4 `EC-CHAT-*` |
| 验收标准 | `AC-V45-###` | v1 `AC-001~012`；v2 `AC-V2-001~027`；v3 `AC-V3-001~027`；v4 `AC-CHAT-001~025` |
| 非目标 | `NG-V45-###` | v2 `NG-V2-001~009`；v3 `NG-V3-001~010`；v4 `NG-CHAT-*` |
| 其他 | `G-V45-###` / `US-V45-###` / `DC-V45-###`（裁决记录）/ `R-REG-9xx`（spec 新增风险）；`Q-REG-###` `A-REG-###` `R-REG-0xx` `O-REG-###`（沿用 discovery） | — |

### 2.5 目标用户

| 角色 | 场景 | 本 Feature 的改善目标 |
|------|------|---------------------|
| **作者（插件唯一真实用户 + 唯一决策者）** | 真机侧栏首屏（会话中 / 空态）；构造「页面原地翻译」链（ask-user 三连问 → 答 → 引用 1 失效 → 重新拾取 / 改用描述 → AI 追问） | ①「每一步交互都在聊天框留痕，作为事实依据」的**事实面唯一**（同一事实不再有两份可见投影：提示带 + 流内行）；② 流**不被 4 个固定位置宿主切段**，「对话历史 = 流本身」在第 1 条变化点上真正达成 |
| **未来的使用者（尚未存在，仅作推理边界）** | 首装首屏（无 site / 未授权 / 探测中） | 空态首屏不再被 6 个「0」稀释（FIX-5 消解）。**假设 A-REG-003 标注「待验证」——不得据此声称普适收益** |
| **下游维护者（AI Agent / 未来重构者）** | 需要回答「`ol#stream` 的哪些子节点是卡、哪些是固定结构」 | 答案变成「**全部都是卡**」（零宿主断言）：判据不再依赖「登记集合 == 实存集合」，而是「**实存集合 == ∅**」；「过渡态清零」这条 v4 自设义务（R4-18 / ADR-V4-005 §6）**可达** |

### 2.6 现状事实核对（**spec 阶段只读复核，零运行时验证**）

| # | 事实 | 证据（`file:line`） | 本规范用途 |
|:-:|---|---|---|
| A1 | `#stream` 有 **4 个** `li[data-host]` 直接子节点：`decision` / `composer` / `l1-panels` / `strips` | `src/ui/sidepanel/index.html:1239-1348` | FR-V45-020 / 061 |
| A2 | 卡被插入到 **composer 宿主之前** ⇒ DOM = `[decision][卡…][composer][l1-panels][strips]` | `stream-render.ts:66-71`（`messageAnchor()`）+ `:126-136`（反序 `insertBefore`） | FR-V45-024 |
| A3 | `decision` 宿主内容 = `#l0-kicker` + `#l0-more` + `#l0-receipt-summary` + `#l0-ref-toggle` + `#l0-ref-badge` + `#l1-more` + `#l1-consequences-toggle` + `#l1-consequences` + **`#l1-ref`（含 `#l1-ref-repick` / `#l1-ref-describe` / `#l1-ref-rescue` / `#l1-ref-reason`）** + `#l1-consequence-tpl` | `index.html:1244-1284` | FR-V45-021 / §11 |
| A4 | `l1-panels` 宿主内容 = `#l1-group` + 4 个触发器（`#l1-local-tree-toggle` / `#l1-history-toggle` / `#l1-receipt-toggle` / `#l1-gestures-toggle`）+ 各自 `hidden` 面板 | `index.html:1297-1333` | FR-V45-022 / §11 |
| A5 | `strips` 宿主内容 = `#env-guard` / `#site-hint`（`sh-title`/`sh-detail`/`sh-action`）/ `#onboarding` / `#discovery-notice`（`dn-title`/`dn-detail`）/ `#notice`；**`#send-reason` 不在 strips 内，在状态栏** | `index.html:1335-1345` + `index.html:1381-1389` | FR-V45-010 / §11 |
| A6 | `#composer` 保持 `hidden`（法四）；`#input` / `#send` 被 journey/binding 读取 | `index.html:1287-1292` + `host-registry.ts:59-64` | FR-V45-023 |
| A7 | 固定位置宿主曾造成**不可滚动到达**（`#l0-decision` 实测跑到视口上方 **−511px**） | `index.html:296-299`（v4-1 修订注释；**历史实测值，本轮未复现**） | FR-V45-020 |
| B1 | `STRIP_CHANNEL_KINDS` 登记 **6 条**绑定（`env-guard→env` / `site-hint→site` / `onboarding→firstRun` / `discovery-notice→probe` / `send-reason→send` / `notice→notice`） | `host-registry.ts:107-114` | FR-V45-015 |
| B2 | `strips` 宿主的 `reason` 逐字承认双写：「keep their readable **status projection**（protection gates pin …），but every fact is **ALSO append-recorded** through the one system channel」 | `host-registry.ts:74-76` | FR-V45-011 |
| B3 | 单通道 4 规则与常量：去重窗口 **5000 ms** / 速率上限 **20 行/分钟** / 「持续：」前缀 / `dropped` 不静默；`SYSTEM_EVENT_KINDS` 11 项闭集 | `system-events.ts:44-76` | FR-V45-012 |
| C1 | `REGISTERED_STRUCTURAL_HOSTS` = 4 条，全部 `transitional: false`；模块注释逐字「Each is a **permanent structural home now**」「the v4-1「过渡」reading **no longer applies**」 | `host-registry.ts:46-77` | FR-V45-060~062 |
| C2 | `RETIRED_HOST_IDS` 只剩 2 个 v4 早期容器（`l0-pick` / `l0-status-band`） | `host-registry.ts:89-92` | FR-V45-061 |
| C3 | `evaluateHostRegistry` 的 5 类问题串（登记缺失 / 未登记新增 / `transitional !== false` / 过渡标记非 0 / 已退役容器仍在 DOM） | `host-registry.ts:132-152` | FR-V45-062 |
| C4 | `l0.mjs` ⑧ 的 `EXPECTED_TRIGGERS` **12 条**（含 `l0-more` / `l0-ref-toggle` / `l1-consequences-toggle` / 4 个 `l1-*-toggle`）+ 逐条判据；`REGISTERED_TRANSITIONAL_HOSTS = 0` | `test/ui/l0.mjs:647-690` / `:71-83` | FR-V45-082 |
| C5 | `disclosure.ts` 三份声明：`COLLAPSIBLE_TARGETS`（7 项）/ `DISCLOSURE_WIRING`（7 对）/ `NEVER_FOLDABLE`（含 `'l0-decision'` / `'confirm'` / `'ask'` / `'composer'`） | `src/ui/sidepanel/disclosure.ts:66-106` | FR-V45-026 |
| D1 | 密度**唯一**豁免声明点 = `DENSITY_EXCLUDED_SUBTREES = ['#stream']`；三区壳根不豁免 | `density-scope.ts:35-42` | FR-V45-070 |
| D2 | 阈值 `default 7/15` · `firstRun 9/20` · `risk 17/35`；31 登记格（28 实测机对 + 3 名义） | `docs/v4-density-baseline.json#thresholds` / `#counts` | FR-V45-070 / 071 |
| D3 | 夹具稳态锚 = **`#notice` 存在且非 `hidden`**（逐字「the 29-char `#notice` of the settled session is present, not absent」） | `test/ui/density.mjs:310-364` | FR-V45-072 |
| E1 | 体积：`dist/sidepanel.js` = **480,026 B**；生效上限 **504,027 B** = `floor(480,026 × 1.05)`；`SIDEPANEL_CEILING_CAP = record-only`；`authorConfirmation.status = pending-author-line` | `test/size-baseline.ts:301,348-366,461` + `v4-chat/closeout.md` §5 | FR-V45-090~092 |
| E2 | 红线产物：`dist/content.js` **177,076 B** / sha `52a82620…`；`dist/pick-layer.js` **33,900 B** / sha `5f567d7e…` | discovery §7.1 E（本轮实测） | FR-V45-093 |

### 2.7 与 v1/v2/v3/v4 的关系（**边界**）

- **只读复用**：三区 flex 布局 / `#view-host` 视图替换机制（`#stream` 的 sibling，`hidden` 切换，同一时刻恰一个 `[data-l2-view]` 可见）/ 流内卡族（`cards/index.ts#CARD_TYPES`）/ `firstRunCard` 归并先例 / `system-events.ts` 单系统事件通道 / `ref` 卡与 `l1/ref-store` 语义 / `l2/counts` 计数单源 / 设置视图与 `SETTINGS_SECTION_IDS` 分区单源。
- **零改写**：v4 的 4 叶 spec/plan/tasks/build/review/validate 产物一字不动；`docs/v3-supersession-ledger.json` 为**冻结历史，不得解冻**（解冻登记落 v4.5 取代台账，见 FR-V45-052）。
- **继承义务**：取代台账八步机制（`docs/v4-supersession-ledger.json#protectedSupersession`）/ 体积五要素重登记 / 密度 31 格机制 / RP 反证机制 / `KL-N-08` `KL-N-10` 已知识别。

---

## 3. 目标与非目标

### 3.1 目标 (Goals)

| # | 目标描述 |
|---|---------|
| G-V45-001 | **事实面唯一（单写化）**：5 条提示带的可见投影退役，每条事实在可见面**恰出现一次**（流内系统事件行或流内卡）；流不再是「并列事实面之一」而是唯一事实面。 |
| G-V45-002 | **时间序纯形**：`ol#stream` 的子节点**全部**是追加式时间序卡，零固定位置宿主；卡不再被头尾结构包夹，F 变化点 1「对话历史 = 流本身」达成。 |
| G-V45-003 | **收口义务可达**：「过渡态清零」（R4-18 / ADR-V4-005 §6）从「制度上不可达」变为**可达且已达成**；判据能区分「过渡关闭」与「标记被删 / 登记为永久」。 |
| G-V45-004 | **可行动恢复留在恢复链上**：提示带的富内容（可点动作 / 退避策略）在退役投影后**不丢语义**，恢复入口仍可达（推荐卡规则扩展 + 设置视图详情），且**不新增任何宿主**。 |
| G-V45-005 | **空态首屏去噪**：空态 / 默认首屏不再被 0 计数控件占据（FIX-5 由核心 2 覆盖而消解）。 |
| G-V45-006 | **治理面收口**：`options/index.html` 授权指引文案与实现一致（显式解冻 + 订正 + 登记）；门禁从「描述旧形态」迁移为「描述新形态」，计数只增不减、反证不空转。 |

### 3.2 非目标 (Non-Goals)

| # | 明确不做 |
|---|---------|
| NG-V45-001 | **不得以隐藏（`hidden` / `display:none` / `visibility` / `opacity`）充数**：退役 = **DOM 语义真退役**（节点从 DOM 移除）。防 BLOCK-02 复辟（「删属性充数 / 自我裁决自我验收」）。 |
| NG-V45-002 | **不得新增任何宿主**：`li[data-host]`（含 `data-transitional-host`）在 `#stream` 内回归即结构性回归。 |
| NG-V45-003 | 不改 `src/content/**` / `dist/content.js` / `dist/pick-layer.js`（零容差冻结） |
| NG-V45-004 | 不动 SW / `KIND_SET` / 判定链（`src/security/policy.ts` / `auto-authorize.ts` 内容哈希 pin）/ `manifest.json`（零新增权限、无 `contextMenus`） |
| NG-V45-005 | 不碰 `design/**` 与 `option-f-shim.mjs`（双 sha256 冻结 + shim 60/60）；不改 12 卡类型学（`src/ui/options/index.html` 的**纯文案解冻**是唯一例外，见 FR-V45-050） |
| NG-V45-006 | 不改三区法则本身（工具栏 ≤5 可点 / 流 = 唯一交互面 / 状态栏永不折叠） |
| NG-V45-007 | **不放宽任何阈值与口径**：密度 `7/15 · 9/20 · 17/35` 逐字不动；豁免只认 `hidden`；防滥用 单卡 ≤6 / 首屏 ≤2 / 合计 ≤8 / 欢迎卡 ≤1 / 欢迎文案 ≤8 行不动；`STREAM_HEIGHT_RATIO_MIN = 0.65` **只允许上调** |
| NG-V45-008 | **不删除、不降级任何断言**；唯一例外 = 保护段按 ADR-V4-008 **显式八步取代**并留台账（不是静默删除）；断言计数**只增不减** |
| NG-V45-009 | **不设自缚装置**：`SIDEPANEL_CEILING_CAP` 保持 `record-only`；不引入新 cap（V3-VOL-1 ② 教训） |
| NG-V45-010 | **不预填 / 不静默改** V3-VOL-3 三值与 `authorConfirmation`（`pending-author-line` **不得伪称已确认**） |
| NG-V45-011 | **不做外部竞品调研**（O-REG-005：登记「未执行，不阻塞」；**不编造竞品结论**） |
| NG-V45-012 | 不改 `ROADMAP.md`（F-31 / v0.9.1 登记留给收口）；`F-29`（A2A 候选）区段**一字不动** |
| NG-V45-013 | 不改 `packages/web-cli-base/**`；无新依赖；不合 main、不发布、不 force push；`git add` 必须 path-limited（**禁 `git add -A` / `.`**）；禁改 `.opencode/opencode.json` |
| NG-V45-014 | **不做 L2 视图内部的重构**（tree / commands / audit 三视图既有内容不动）——仅允许**新增承载块**（局部树归因块 / 回执证据区 / 帮助分区 / 站点详情），不改既有内容 |
| NG-V45-015 | **不新增真值源**：推荐 / 详情 / 计数必须复用既有 state 字段与既有单源；不新增 LLM 产物、不新增网络 / 隐私 / 成本面；不新增静态权限 |
| NG-V45-016 | 不把「设置视图分区数」硬编码：新增「帮助」分区必须走 `SETTINGS_SECTION_IDS` 单源（FR-V3-046 口径） |
| NG-V45-017 | 不得用「把剩余宿主登记为永久」「删除过渡标记属性」「把容器换成 `hidden`」代替形态收口（判据必须能区分「过渡关闭」与「标记被删」） |

---

## 4. 用户故事

| # | 作为… | 我想要… | 以便… |
|---|-------|---------|-------|
| US-V45-001 | 作者（日常使用者） | 在侧栏看到「环境守卫 / 无活跃站点 / 探测态」这些事实**只出现一次**（留在流里、带时间戳） | 我能确认哪一份是权威留痕，不必在两份同义投影之间猜 |
| US-V45-002 | 作者（长会话使用者） | 上滚回看时，看到的是**连续的时间序卡序列**，中间不被「决策槽 / 已决策历史 / 提示带」这类固定块打断 | 「对话历史 = 流本身」成立，我不会漏掉被夹在固定结构里的内容（历史上曾发生过不可滚动到达） |
| US-V45-003 | 作者（风险恢复场景） | 引用失效 / 站点绑定失效时，**恢复入口就在我眼前的卡里**（重新拾取 / 改用描述 / 一键重锚 / 重新绑定当前标签页） | 恢复不需要先去别处找面板，恢复路径可达且位置一致（N-05 关闭） |
| US-V45-004 | 作者（空态首屏） | 首次打开 / 无活跃站点时，首屏**没有 6 个「0」** | 空态第一印象是「一眼看懂在哪 / 谁在管 / 下一步做什么」，不是计数噪音 |
| US-V45-005 | 作者（帮助与发现） | 想知道「页面交互有哪 6 个手势」时，能在**设置视图的「帮助」分区**看到，并能在首装推荐卡上一步打开它 | 静态帮助内容有确定归属（法则六「管理入视图」），不占首屏、不占流 |
| US-V45-006 | 下游维护者（AI Agent / 未来重构者） | 一眼判定「`ol#stream` 里有没有固定结构」，并让任何宿主的回归**立刻变红** | 形态不再被治理结构反向锁定；下一次重构面对的是一套「零宿主」判据 |

---

## 5. 功能需求 (FR)

> 每组前缀含义：**GOV** 立案与纪律 / **SINGLE** 核心 1 单写化 / **CHRONO** 核心 2 时间序化 / **RECOVERY** 可行动恢复入推荐卡 / **HELP** 手势 → 设置帮助分区 / **UNFREEZE** options 解冻订正 / **REGISTRY** host-registry 终态 / **DENSITY** 密度重算与显式取代 / **LEDGER** 取代台账与门禁重锚 / **VOL** 体积与 V3-VOL-3。

### 5.1 GOV — 立案、结构与纪律（横切）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-V45-001 | 本 Feature 使用独立编号空间 `FR-V45-*` / `NFR-V45-*` / `EC-V45-*` / `AC-V45-*` / `NG-V45-*`；ROADMAP 编号 **F-31**、版本位 **v0.9.1** 仅在本规范登记，**不在本轮写入 ROADMAP**（留给收口） | `grep -c "F-31"` / `"v0.9.1"` 在 ROADMAP 中仍为 0；ROADMAP 文件零 diff（`git diff --quiet -- .sddu/specs-tree-root/ROADMAP.md`） | P0 |
| FR-V45-002 | 父 Feature 为**轻量规范容器**（`depth=1`，不承接 build/review/validate，不产出 tasks.json）；实施由**唯一叶** `specs-tree-v45-1-single-write-chronology`（`depth=2` / `leaf:true`）承载 | 父目录只含 `discovery.md` / `spec.md` / `TREE.md` / `state.json` + 叶目录；叶 `state.json` `leaf:true` / `parent=specs-tree-web-cli-plugin-v45-f-regularization` | P0 |
| FR-V45-003 | **两项核心不可分割**：strips 单写化与宿主时间序化共享**同一次** `scope` 体积重登记与**同一次** journey 结构重锚 ⇒ 单叶承接、串行执行；若执行中发现必须再拆，须先回到本规范做显式取代登记 | 叶 `spec.md` 同时覆盖 §5.2 与 §5.3 两组 FR；交付顺序在叶 `state.json#deliveryOrder` 登记 | P0 |
| FR-V45-004 | **断言零删除零降级、计数只增不减**：任何门禁断言只能**等价重写为新语义**（数量不减）或走**保护段显式取代**（唯一例外，须台账留痕） | 各门禁计数 ≥ 基线（`npm test ≥1001` / `test:l0 ≥223` / `test:l1 ≥111` / `test:l2 ≥74` / `test:density ≥175` / `test:journey ≥167` / `test:insight ≥116` / `test:binding ≥192` / `test:hardening ≥24` / `test:page-input ≥106` / `test:stream ≥63` / `test:ask-auth ≥61` / `test:recommendation ≥56` / `test:ref-pick-wiring ≥11` / `test:size-ruling-vol3 ≥10` / `test:l1-reverse ≥9` / `test:l2-reverse ≥10` / `test:supersession ≥33` / `test:gate-integrity ≥12` / `test:design-contract ≥6` / `test:zero-injection ≥27`） | P0 |

### 5.2 SINGLE — 核心 1：5 条提示带单写化（可见面唯一）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-V45-010 | **5 条提示带的可见投影真退役**：`#env-guard` / `#site-hint` / `#onboarding` / `#discovery-notice` / `#notice` 的节点及其 `#stream` 内包裹层（`li[data-host="strips"]` + `.strips`）从 DOM **移除**（不是 `hidden`）。**`#send-reason` 不在退役面**（其归属是状态栏，法三「状态栏只放常驻状态与风险」不变） | 真机 / Chromium 断言：`getElementById` 对 5 个 id 全部返回 `null`；`#send-reason` 仍在 `#region-statusbar` 内且可按既有语义读取；`document.querySelectorAll('[data-host="strips"], .strips').length === 0` | P0 |
| FR-V45-011 | **事实唯一可见面**：每条提示事实在可见面**恰出现一次**（流内系统事件行或流内卡）；`#stream` 内外不得存在同义的第二份可见投影；`host-registry` 中任何「同时保留可读投影 + 已事件化」的绑定理由必须**从注册表移除**（B2 的逐字承认不得再成立） | 首屏三事实（env / site / probe）逐条断言「可见载体数 == 1」；`host-registry.ts` 源文本不再包含「ALSO append-recorded」式的双写理由 | P0 |
| FR-V45-012 | **单系统事件通道的 4 条规则语义逐字不变**：① 净化（`assertStreamPlaintext`：URL query / secret / 命令参数体 / raw markup 抛错）② 去重窗口 `SYSTEM_DEDUPE_WINDOW_MS = 5000`（`dedupeKey = kind + ':' + normalizedText`）③ 速率上限 `SYSTEM_ROWS_PER_MINUTE_CAP = 20`（溢出计 `dropped` 且**不静默**）④ 追加 `BORN_FROZEN` + 窗口外同事实以 `SYSTEM_CONTINUED_PREFIX = '持续：'` 再追加 | 常量值机核（源文本抽取）逐字等于 5000 / 20 / `'持续：'`；四条规则各配可 FAIL 反证 | P0 |
| FR-V45-013 | **富提示（site / probe）的承载**（O-REG-001 裁决落地）：① 事实载体 = **单行系统事件行**（`kind='site'` / `kind='probe'`，文案变化时追加，稳态不重复）② **可行动恢复**走推荐卡 `risk-recovery` 规则扩展（见 §5.4）③ **长文案（含探测退避重试策略全文）**降为行的 `title` 属性 + **设置视图站点分区**的详情；④ **不新增任何宿主** | ① `#stream` 内恰有 1 行承载该事实（单行、无第二段）② 恢复动作 chips 见 FR-V45-030/031 ③ 行的 `title` 非空且与设置站点详情**同源**（同一常量 / 同一派生函数，静态门禁断言单源）④ `li[data-host]` 计数 == 0 | P0 |
| FR-V45-014 | **`#onboarding` / `#discovery-notice` 的流内承载沿用 firstRun 卡先例**：`view-model.ts#firstRunCard` 已把两条提示带合并为流内卡，`terminable` 的「已终结」谓词（`!open`）**不得丢失**（归并不丢语义） | 首装态断言 firstRun 卡存在且携带原 v1 onboarding 标题（逐字）；`terminable` 谓词随 `open` 变化而变；提示带 DOM 已移除（FR-V45-010） | P0 |
| FR-V45-015 | **归并矩阵判据必须重写（不是放宽）**：`STRIP_CHANNEL_KINDS` 的「legacy id + 绑定 kind」判据（`test/density-thresholds.test.ts:715` 的「id 仍在 DOM」）与「退役可见投影」**正面矛盾** ⇒ 改为**新语义**：① 每条通道的 kind 有**唯一生产 emitter 调用点** ② 该 kind 的可见载体数为 1（FR-V45-011）③ `#send-reason` 的 id 仍在 DOM（它不在退役面） | 重写后的归并矩阵断言逐条可 FAIL 反证；`test/density-thresholds.test.ts` 中原「id 仍在 DOM」条目已被等价替换（计数不减） | P0 |

### 5.3 CHRONO — 核心 2：宿主时间序化（`ol#stream` 纯时间序卡列表）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-V45-020 | **`ol#stream` 成为纯时间序卡列表**：`#stream` 的直接子节点**全部**是追加式正序消息卡；**零** `li[data-host]`（任意深度零 `[data-host]` / `[data-transitional-host]`）；卡可上滚回看、自动滚到底（= 留痕）语义不变 | Chromium 断言：`#stream > li` 的 `data-msg-type` 计数 == 子节点总数；`#stream` 子树内 `[data-host]` / `[data-transitional-host]` 计数 == 0；`#15q` 320px 无水平溢出仍绿 | P0 |
| FR-V45-021 | **`decision` 壳退役 + 存活元素去向**（逐元素见 §11）：壳容器 `#l0-decision` 与 `li[data-host="decision"]` 从 DOM 移除；存活元素按语义归位——回执摘要 → 流内卡固化区（`auth` / `askuser` 卡，完整证据仍入审计视图）；引用证据 + 恢复路径 → `ref` 卡卡内证据区 / 恢复区（含 `#l1-ref-repick` / `#l1-ref-describe` / `#l1-ref-rescue` / `#l1-ref-reason`）；选项池 + 后果预演（含 `#l1-consequence-tpl` 三段模板）→ `askuser` / `auth` 卡内；`#l0-kicker` / `#l0-ref-badge` 随壳退役（角色名与失效标记由流内卡自身承载） | 上述每个存活元素在其**新卡内**可达（`getElementById` 命中新位置或等价新 id）；`#l0-decision` / `#l0-kicker` / `#l0-ref-badge` / `#l0-more` / `#l0-ref-toggle` / `#l0-receipt-summary` 在 DOM 中不存在；`#l1-ref-rescue` 语义「唯一文本匹配时可见」不变；N-05 关闭已在取代 / 收口文档登记 | P0 |
| FR-V45-022 | **`l1-panels` 组退役 + 4 开关去向**（逐元素见 §11）：① `#l1-history-toggle` / `#l1-history` **退役**（历史 = 流本身；`rounds[]` 已由 `project()` 的已终态 `askuser` / `auth` 卡事件派生 = 数据单源）；**已决策步数计数改在审计视图标题区呈现（恰一处）** ② `#l1-gestures-toggle` / `#l1-gestures` → 设置视图「帮助」分区（§5.5）③ `#l1-local-tree-toggle` / `#l1-local-tree`（含 `-rows` / `-hint`）→「树」视图（L2）只读归因块；`#l1-local-tree-global`（查看全局树）随之消解 ④ `#l1-receipt-toggle` / `#l1-receipt`（含 `-rows` / `-audit-summary`）→「审计」视图（L2）证据区；`#l1-receipt-audit`（查看审计）随之消解 | 4 个触发器与 4 个面板在 `#stream` 子树中不存在；计数（rounds）在审计视图标题区可读且**全仓仅一处**；迁入块在 `#view-host` 内可达且既有内容零改动（NG-V45-014） | P0 |
| FR-V45-023 | **`#composer` 出流（物理位置迁移，法四不变）**：`li[data-host="composer"]` 移除；`#composer` 迁 **`body` 尾部**并**保持 `hidden`**；`#composer` / `#input` / `#send` 的 **id 与 ARIA 全保留**（journey / binding / `requestTurn` 继续读取，兼容契约不变） | `#composer` 的 `parentElement === document.body`；`#composer.hidden === true`；`#stream` 子树不含 `#composer` / `#input` / `#send`；journey/binding 对 `#input` `#send` 的读取路径零改动 | P0 |
| FR-V45-024 | **卡的插入锚迁移**：`messageAnchor()` 不再依赖流内 composer 宿主（改为 `#stream` 本体尾部或等价锚）；卡仍为**追加式正序**，历史卡不被移动 / 不跳位 | `stream-render.ts` 源码不再查询 `li[data-host="composer"]`；`test:stream` 的追加式 / 同 `cardId` 同节点 / 正序断言全绿 | P0 |
| FR-V45-025 | **空态 / 默认首屏去噪（FIX-5 消解登记）**：0 计数控件（`更多选项（还有 0 个）` / `引用 0 条` / `归属（局部树）· 0 个节点` / `已决策 0 步` / `回执证据（0 行）`）不再恒驻首屏；**FIX-5 不独立成条 / 不成叶，登记为「已由核心 2 覆盖而消解」** | 空态 / 默认档首屏断言上述计数串零出现（或迁移面在 `#stream` 外且按其自身口径渲染）；收口文档须重述 FIX-5 的消解处置（**不得静默遗留**） | P0 |
| FR-V45-026 | **折叠声明与实存零漂移**：`disclosure.ts` 三份声明（`COLLAPSIBLE_TARGETS` / `DISCLOSURE_WIRING` / `NEVER_FOLDABLE`）随退役重写——`'l0-decision'` / `'confirm'` / `'ask'` / `'composer'` 条目按新形态收口（`#composer` **保留在 `NEVER_FOLDABLE`**：永不折叠 = 禁止折叠，与是否在流内无关，DC-V45-010）；**「风险位永不折叠」红线（`#region-statusbar` 本体永不带 `hidden`；`#risk-chips` 有风险时无 `hidden`）逐字不变** | `test/l0-disclosure.test.ts` 与 `COLLAPSIBLE_TARGETS.length` / `DISCLOSURE_WIRING.length` / `NEVER_FOLDABLE` 同源机核全绿（计数不减）；`#region-statusbar` / `#risk-chips` / `#risk-rail` / `#risk-detail` 的永不折叠断言逐字保留 | P0 |

### 5.4 RECOVERY — 可行动恢复走推荐卡规则扩展（O-REG-001 / FIX-1 先例）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-V45-030 | **`risk-recovery` 规则触发集扩展**：`site`（无活跃站点 / 绑定失效）与 `probe`（探测态异常 / 探测未就绪）类触发并入恢复触发集（与 `refInvalid` / `declarationInvalid` / `hardFloor` 同属 **priority 1**）；数据源仍限 `NEXTSTEP_SOURCE_WHITELIST` 的 7 项（**不新增真值源**） | `recommend.ts` 的恢复触发集常量机核；site / probe 触发下产出 `risk-recovery` 卡（含恢复 chips）；源白名单零扩项（`test/recommendation-sources.test.ts` 全绿） | P0 |
| FR-V45-031 | **恢复动作 chips（含「重新绑定当前标签页」）**：`risk-recovery` 卡至少提供「重新拾取」「改用描述」与**「重新绑定当前标签页」**（后者复用设置视图 `#rebind` 的**同一生产入口**，单一调用点）；chips 上限 `MAX_CHIPS_PER_CARD = 3`、单卡可点 ≤6、首屏卡 ≤2 **不变** | Chromium：site / probe 触发下卡内出现「重新绑定当前标签页」chip；点击走绑定入口且**不产生 user 回合**、不把文本写入输入框；可点计数不越限 | P0 |
| FR-V45-032 | **act 闭集终态（本规范定为唯一权威）**：`NEXTSTEP_ACTS = ['next', 'repick', 'describe', 'authorize', 'rebind', 'help']`；**本地动作**（`authorize` / `rebind` / `help`）与 `next` 的区别逐字保持 FIX-1 口径：不经 `requestTurn`、**不受 `pending` 门控**、复用单一生产入口；`data-act` 渲染由 `view.payload.nextstepActs` 透传 | act 闭集常量机核 == 6 项；deny 集不误伤本地动作；`cards/nextstep.ts` 的 `data-act` 渲染零改动可透传新值 | P0 |
| FR-V45-033 | **本地 act 布线门禁**：每个本地 act 各有静态布线门禁（仿 `test/authorize-chip-wiring.test.ts`）：① 该能力的权限 / 动作请求**唯一调用点** ② 单一入口的调用点集合显式登记 ③ 该 `handleCardAction` 分支**无 `requestTurn`** ④ 至少三条伪造反证可 FAIL ⑤ 与 act 闭集**同源** | 新门禁静态断言 + 反证实跑 FAIL → 还原 → PASS；与 act 闭集同源机核（闭集改一处，门禁同步红 / 绿） | P0 |

### 5.5 HELP — 手势说明迁设置视图「帮助」分区（O-REG-003）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-V45-040 | **设置视图新增「帮助」分区**承载 6 个页面手势表（表结构「手势 / 作用」保持；行内容由 `view-model.ts#L1_GESTURE_LABELS` 与 `GESTURE_EFFECTS` **单源**渲染）；分区计入 `SETTINGS_SECTION_IDS` **单源** ⇒ 设置入口计数随之**派生**（禁止硬编码，FR-V3-046 口径） | 设置视图内存在「帮助」分区且含 6 行手势表；`SETTINGS_SECTION_IDS.length` 与 `#settings-root > .wc-section` 实测计数、入口 `data-count` **三方同源**（`test/l2-counts.test.ts` + `test/ui/l2.mjs` 等价重锚后全绿）；行数 == `L1_GESTURE_LABELS.length` | P1 |
| FR-V45-041 | **onboarding 推荐卡「了解 6 个页面手势」chip 改为本地动作**：`act` 由 `'next'` 改为 `'help'`（**打开设置视图「帮助」分区**；不经 `requestTurn`、不受 `pending` 门控）；chip 文案逐字不变 | Chromium：点击该 chip **零 user 回合**、零输入框写入，且「帮助」分区可见（设置视图内定位 / 展开）；`test/ui/recommendation.mjs` 等价重锚后全绿 | P1 |
| FR-V45-042 | **帮助分区为只读、零可点控件**（静态帮助内容不引入交互面）；分区可由设置视图内发现（工具栏「设置」入口 → 设置视图 → 帮助分区）；键盘可达 | 分区内 `button` / `a` / `input` 计数 == 0；`#settings-view` 的键盘可达断言全绿；分区可见性断言可 FAIL 反证 | P1 |

### 5.6 UNFREEZE — `options/index.html` 授权文案显式解冻订正（O-REG-004）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-V45-050 | **显式解冻 `src/ui/options/index.html` 的「单文件文案行」**：v3 台账 `zeroDiffFiles` 的冻结面**缩窄**为该文件的**纯文案范围**（零结构 / 零权限 / 零依赖 / 零注入面改动）；解冻必须**显式登记**（v3 台账为冻结历史**不得解冻**，登记落 **v4.5 取代台账**或等价独立解冻登记条目） | 解冻登记条目存在且含（范围 / 理由 / 前后文案 / 日期 / 操作者）；`git diff --stat` 显示该文件**仅文案行**变化（无结构 / 权限 / 依赖 / 注入面 diff） | P1 |
| FR-V45-051 | **文案订正**：options 页的授权指引从已消失的位置（「在侧栏『授权当前站点』」）改为实际位置（**「设置 → 站点与授权」**，或推荐卡中的「授权当前站点」），与 FIX-2 已订正的其余 4 处同口径（`view-model.ts` / `web-fetch-tool.ts` / `session-follow.ts` / `service-worker.ts`） | 全仓文案一致：`grep` 「侧栏『授权当前站点』」零命中（`tree-ops.ts` 未声称具体位置者除外，其判定「指向成立」保持）；新文案与 FIX-2 口径逐字一致 | P1 |
| FR-V45-052 | **解冻后复跑不回归**：复跑 `test:zero-injection`（27 断言）与受本文件影响的语句面门禁，确认零注入 / 零权限 / 零依赖红线**不回归** | `test:zero-injection` ≥27 全绿且计数不减；`docs/v3-supersession-ledger.json` 零 diff（冻结历史未被改） | P1 |

### 5.7 REGISTRY — `host-registry` 终态：零宿主断言（O-REG-007）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-V45-060 | **零宿主断言**：判据从「登记集合 == 实存集合」改为「**实存集合 == ∅**」——`ol#stream` 子树内任何 `li[data-host]` 存在即**红**（含任意深度、含 `data-transitional-host`） | 反证：向 `#stream` 注入 1 个 `li[data-host]` ⇒ 门禁 FAIL；移除 ⇒ PASS（逐次实跑 + 逐字节还原）；真实 DOM 下断言 PASS | P0 |
| FR-V45-061 | **`RETIRED_HOST_IDS` 扩容收编全部旧宿主 + 旧宿主容器 id 零残留**：退役宿主值 `decision` / `composer` / `l1-panels` / `strips` 全部入册；旧容器 id（`#l0-decision` / `#l0-pick` / `#l0-status-band`）零 DOM 残留；**退役 = DOM 语义真退役**（不得以 `hidden` 充数） | 4 个宿主值 + 3 个容器 id 在 DOM 中为 `null`（或按新形态由等效新 id 承载时的显式登记映射）；对每个退役项配「重新引入即红」反证 | P0 |
| FR-V45-062 | **`evaluateHostRegistry` 5 类问题串必须有终态**：① 实存非空即红 ② 退役宿主值 / 容器 id 零残留 ③ `[data-transitional-host]` 计数 == 0 ④ 注册表降级为**反向判据**（「新增宿主必须走裁决」= 任何新增即红，无需先登记再比对）⑤ 双写理由条目从注册表移除（FR-V45-011）；`test/ui/l0.mjs:71-83` 的 `REGISTERED_TRANSITIONAL_HOSTS = 0` 升级为「**零宿主**」结构性判据 | 5 类问题串逐条可 FAIL 反证（含 5 组伪造 reading 反证，仿 v4-4 BLOCK-02 修法）；`evaluateHostRegistry` 仍为**纯函数单一判据**（panel / Chromium gate / node gate 同一实现） | P0 |

### 5.8 DENSITY — 密度基线重算与显式取代（O-REG-006）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-V45-070 | **口径零放宽**：`DENSITY_EXCLUDED_SUBTREES = ['#stream']` **单源不动**；豁免**只认 `hidden`**；阈值 `default 7/15` · `firstRun 9/20` · `risk 17/35` **逐字不动**；防滥用（单卡 ≤6 / 首屏 ≤2 / 合计 ≤8 / 欢迎卡 ≤1 / 欢迎文案 ≤8 行）不动；`assertChromeNotInStream()` 的双判据（标记 + 形态）方向性不变 | 阈值与常量从 `density-scope.ts` 源文本抽取后逐字等于基线；豁免声明点仍**全仓唯一**（「声明恰一次」扫描绿） | P0 |
| FR-V45-071 | **密度基线重算为 v4.5 新基线（显式取代，不静默改写）**：宿主退役 + 内容迁入 `#view-host`（**不豁免**）/ 设置视图 + `#composer` 出流 ⇒ 全部登记格按 **Chromium 实测重算**；`docs/v4-density-baseline.json` 追加 **v4.5 台账**（前后值 / 日期 / 来源 / 理由 / 历史保留）；`riskIncrementRegistry` 双向精确期望 + 溯源门槛字段（`rulingId` / `rulingDate` / `approvedBy` / `reason`）随新面重锚、**缺任一字段即 FAIL** | `test:density ≥175` 全绿（新读数）；台账前后值可复算；任何被改动的登记格在台账中**逐格留痕**（无静默改写）；阈值字段零 diff | P0 |
| FR-V45-072 | **夹具稳态锚迁移**：`#notice` 不再可作为「夹具已达稳态」的锚 ⇒ 稳态定义改由**构造**保证（**不得**变成依赖运行顺序）；**不得静默回退** closeout 轮 validate R1 F2/K-1 的夹具确定性修复口径 | `test/ui/density.mjs` 的 `settledProbe` / `assertFixtureSettled()` 重写后可 FAIL 反证（锚失效时确实红）；夹具在任意登记顺序下确定性一致（跨夹具顺序置换不产生新红） | P0 |
| FR-V45-073 | **反证不空转**：每条被改动的密度判据必须配**可 FAIL 反证**（RP-V4-01~09 复跑 + 注入点若被搬走必须**重写注入点**），流程 = 注入 → FAIL → 逐字节 sha256 还原 → PASS，并声明 `expectFailPattern` | 每条反证实跑留证（日志全量落盘，禁截断）；注入文件 sha256 前后逐字节相同；无「不再 FAIL 的判据」遗留 | P0 |
| FR-V45-074 | **迁出 / 迁入的方向性**：内容从 `#stream` 迁出时不得把常驻控件带入流内——`assertChromeNotInStream()`（`[data-chrome-control]` / `[data-toolbar-slot]` / `.view-btn` 出现在 `#stream` ⇒ 抛错）必须继续成立并被反证 | 反证：向 `#stream` 注入 `.view-btn` ⇒ 抛错；真实 DOM 下 `assertChromeNotInStream()` PASS | P0 |

### 5.9 LEDGER — 取代台账与门禁等价重锚

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-V45-080 | **journey 第二次八步显式取代**：active pin `43054..55259` / sha `e2b500df…`（`supersededFrom 6b45c3fa…`，leafBase `187c205`）按 ADR-V4-008 **八步**取代——① 记录 old ② 逐段决策 ③ 同编号等价改写（`#15a~#15q` 内结构 / 几何断言随 `#stream` 子节点集合变化重锚）④ 登记 `modifiedRanges[]` ⑤ 计算并写入新 pin ⑥ **计数守恒 ≥167** ⑦ `redlineRemap[]` 追加 ⑧ **RP-V4-08 反证**（段内改 1 byte 必红 / 段外改 1 byte 不红 / 逐字节还原）；`#15b` 的 `#region-stream` 高度占比下界 **≥65.0% 只允许上调** | `test:supersession ≥33` 全绿；`knownGap` 在 `status=complete-steps-1-8` 时为空或仅声明闭环（机核）；`test:journey ≥167` 全绿；八步逐项在台账留证 | P0 |
| FR-V45-081 | **binding 保护段处置**：保护段 `107780..115930` / sha `be9ad0e9…`（`decision = keep`）**本体可保持零 diff**；其**段外**直接读退役面的断言——`#4b/#4c` 读 `#notice` 的授权回执（`binding.mjs:896`）与 `AP#4b` 读 `#discovery-notice`（`binding.mjs:2256`）——必须**等价改写**并在 `modifiedRanges[]` **逐行登记**（同 v4-1 先例） | 保护段 sha 不变（保段）或显式取代留痕（二选一，须显式声明）；段外改写逐行登记且计数不减；`test:binding ≥192` 全绿（`KL-N-10` 按 §15 纪律处理） | P0 |
| FR-V45-082 | **各门禁等价重锚（新语义重写、数量不减）**：至少覆盖 ① `test/ui/l0.mjs` ⑧ `EXPECTED_TRIGGERS` 12 条与逐条判据（存在 / 非空文字 / ARIA 成对 / 目标含摘要或计数）② `test/ui/l0.mjs:874-875` 三视口结构集合（含 `l0-decision`）③ `disclosure.ts` 三份声明与 `test/l0-disclosure.test.ts` ④ `test/ui/l1.mjs` ②（展开几何不遮挡）/ ⑫（openAll/closeAll 往返）⑤ `test/ui/page-input.mjs` 的 L1 面板引用 ⑥ `test/ui/hardening.mjs:205,224-227`（`#env-guard` `hasGuard` / `guardShown` / `guardText`）+ `test/env-guard.test.ts` ⑦ `test/ui/journey.mjs:658-670` `#11c~#11e`（`#site-hint` 可见性 + 原因 + 动作文案）⑧ `test/ui/insight.mjs` 的 `#discovery-notice` / `#env-guard` 文本读取点 ⑨ `test/ui/recommendation.mjs` ⑬ 的 `#onboarding` 可见性前置（改读 firstRun 卡或 state）⑩ `test/system-merge.test.ts` 的「`#notice` 元素仍读到同一条事实」⑪ `test/density-thresholds.test.ts:715` 归并矩阵 | 上述门禁全部**改写而非删除**；每处新判据可 FAIL 反证；对应门禁计数 ≥ 基线（FR-V45-004） | P0 |
| FR-V45-083 | **`knownGap` 一致性机核**：新增取代条目必须让 `test/supersession-ledger.test.ts` 的 `status ↔ knownGap` 一致性检查保持绿（`status = complete-steps-1-8` ⇒ 该字段为空或仅声明闭环） | `test:supersession` 全绿且新增条目登记完整（`oldPin` / `newPin` / `supersededFrom` 链式保留可机核） | P0 |
| FR-V45-084 | **对抗优先（两段证伪纪律）**：每条被改动的判据都要 ① 注入违反面 → **实跑 FAIL**（声明 `expectFailPattern`）② **逐字节还原**（sha256 前后相同）→ 实跑 PASS；**不得「删属性充数 / 换口径充数 / 自我裁决自我验收」**（BLOCK-02 教训） | 每条判据留有「注入 FAIL → 还原 PASS」两段证据（日志全量）；无「判据空转」（反证不再 FAIL） | P0 |

### 5.10 VOL — 体积与 V3-VOL-3 纪律

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-V45-090 | **体积军规继承**：`dist/sidepanel.js` ≤ 生效上限 `floor(baseline × 1.05)`（当前 = **504,027 B**）；任何 byte 变化 ⇒ 强制**五要素重登记**（前后值 / 日期 / 来源 / 理由 / 历史保留 + 构建命令 + 逐模块 metafile 归因，**Σ 逐模块 Δ + 未归因胶水 == 登记增量**）；`SIDEPANEL_CEILING_CAP` 保持 `record-only`（**不设自缚装置**） | `test/size-budget.test.ts` / `test/size-growth-evidence.test.ts` 全绿；`SIDEPANEL_CEILING == floor(baseline × 1.05)` 严格成立（无 cap）；metafile 归因 Σ 可复算 | P0 |
| FR-V45-091 | **披露算术机核**：I-10 `validateReRegistrationDisclosure` 必须通过——元组前后值 / Δ / % 与登记字段**逐项相等**，且 `META.measuredBy` 与末条登记**同源** | `test/size-growth-evidence.test.ts` 的算术机核断言全绿（本轮若净减同样走登记，不例外） | P0 |
| FR-V45-092 | **V3-VOL-3 三值同源**：`newBaselineBytes` 随现行基线**同源前移**；档位 `ceilTo50KB(465,000)` = **512,000** 与绝对上限 **563,200**（= 512,000 × 1.10）**不变**；`authorConfirmation.status` 保持 `pending-author-line`（**不得伪称已确认**，closeout §7 deferred 8 属未闭合义务） | `docs/v4-supersession-ledger.json#v3Vol3Closeout` 三值一致 + `test/size-ruling-vol3.test.ts ≥10` 全绿；`authorConfirmation.status` 枚举值合法且未被静默改写 | P0 |
| FR-V45-093 | **红线冻结面逐字节复核**：`dist/content.js` = 177,076 B / sha256 `52a826205553b46a896ccad54225d63ba62f5f7fe7c969a9bc2e655448d5b5f6`；`dist/pick-layer.js` = 33,900 B / sha256 `5f567d7ededc58183afe4ce45e3293b68204dfbe788dc6b9fb09bdc6e0d13e59`；`design/**` 与 shim 双 sha 未动；`manifest.json` / 判定链（`policy.ts` / `auto-authorize.ts`）内容哈希未动 | 上述每一项逐字节 / 逐哈希核验通过（`src/content/**` 零 diff） | P0 |

---

## 6. 非功能需求 (NFR)

| ID | 类别 | 需求描述 | 验收标准 |
|----|------|---------|---------|
| NFR-V45-001 | 性能 | 形态收尾不得使首屏渲染 / 滚动跟随 / 视图往返变差；`#region-stream` 高度占比 **≥65.0%**（只允许上调） | `#region-stream` 占比的**断言面** = `journey #15b`（门槛 `STREAM_HEIGHT_RATIO_MIN = 0.65`，全绿）+ `#15p/#15r/#15s/#15t` 滚动跟随断言全绿；**`test:density` 的 `streamRatioSpike`（12/12 PASS，最差格 0.7273）是「记录」不是「断言」**（该字段只存在于 `docs/v4-density-baseline.json` 的 v4-1 spike 记录中，`test/ui/density.mjs` 无引用 / 无判据 ⇒ 不得当作 live 门禁回退判据）。〖review R1 I-04 回写：区分「记录（spike）vs 断言（`#15b`）」〗 |
| NFR-V45-002 | 可用性 | 320px 窄栏零水平溢出；键盘 Tab 序与 `:focus-visible` 不退化；`role=log` / `aria-live` 语义不因单写化而丢失 | `journey #15q`（320px）全绿；键盘断言全绿；`#stream` 仍 `role=log`；退役面的 live region（`role=status` / `aria-live`）语义由流内行 / 卡**等价承载**（不得整体消失） |
| NFR-V45-003 | 安全 | 长文案进 `title` 属性时**同样过零明文净化**（URL query / secret / 命令参数体 / raw markup 一律不得进入 DOM 属性）；系统事件行仍是净化后的单行明文 | 新增断言：`title` 内容经 `assertStreamPlaintext` 等价校验（注入 secret / URL query 反证必抛错）；`test:zero-injection ≥27` 全绿 |
| NFR-V45-004 | 可维护性 | **单源 + 机核**：豁免子树 / 阈值 / `SYSTEM_EVENT_KINDS` / act 闭集 / 手势列表 / 设置分区计数 / 退役宿主清单各自**恰一处**声明，且由门禁从源文本抽取机核（不得靠注释与人工对账） | 「声明恰一次」扫描全绿（各单源）；任一处出现第二声明确实红（反证） |
| NFR-V45-005 | 体积 | `sidepanel.js` 在生效上限内；任何 byte 变化走五要素重登记 + 披露算术机核；**不设新 cap** | FR-V45-090 / 091 全绿；`SIDEPANEL_CEILING_CAP === 'record-only'` |
| NFR-V45-006 | 兼容性 | 既有 id / ARIA 读取契约不破：`#composer` / `#input` / `#send`（journey / binding / `requestTurn`）、`#settings-back` / `#open-settings` / `#authorize` / `#rebind`、`#risk-rail` / `#risk-chips` / `#region-statusbar`、`#l2-title` / `#l2-count`、`#view-host` / `#l2-back` | 兼容读取面逐 id 断言存在且语义不变（退役面除外，其迁移映射见 §11） |
| NFR-V45-007 | 可测试性 | 每条新判据都必须**可 FAIL**（可注入违反面）并声明 `expectFailPattern`；不得引入不可证伪的断言形态 | 每条新 / 改判据留有反证证据（FR-V45-073 / 084） |
| NFR-V45-008 | 无障碍 | 长文案以 `title` 承载时，**不得**使该事实退化为「仅 hover 可见」——`title` 只是补充，事实文本仍须以可读文本存在于流内行 / 卡（读屏可达） | 新增断言：退役面的长文案在流内存在**可读文本**等价载体（不含仅 `title` 的形态）；读屏走查项列入人工面清单（AC-V45-022） |

---

## 7. 边界情况 (EC)

| ID | 场景 | 处理方式 |
|----|------|---------|
| EC-V45-001 | **空态 / 首装（0 事实）** | 不渲染任何空壳计数控件（0 计数控件零渲染）；不因退役而出现空白块；首屏只有工具栏 + 适度的流内欢迎 / 首装卡（欢迎卡 ≤1、首屏卡 ≤2 不变） |
| EC-V45-002 | **去重窗口边界** | 窗口内（<5000 ms）同 `kind:normalizedText` 不追加新行；窗口外同事实再出现 ⇒ 追加带 `持续：` 前缀的新行（事实**不丢**，只是窗口内不重复） |
| EC-V45-003 | **速率溢出** | 超过 20 行 / 滚动分钟时**不追加**、`dropped` 计数 +1 且**状态栏可读**（不静默）；溢出统计口径与基线一致 |
| EC-V45-004 | **探测退避重试（probe）** | 退避策略全文**只**进行的 `title` + 设置视图站点分区详情；流内保持**单行**事实；退避继续期间不刷屏（相位 / 文案变化才追加） |
| EC-V45-005 | **唯一文本匹配（引用重锚）** | `#l1-ref-rescue`（一键重锚）迁入 `ref` 卡恢复区后，语义「**唯一文本匹配时可见**」逐字不变；不唯一时不出现该按钮且原因文本（`#l1-ref-reason` 等价物）可读 |
| EC-V45-006 | **无活跃站点（site）** | 事实由三处呼应（法二不破：事实只 1 份可见）：① 流内系统事件行（`kind='site'`）+ 行 `title` ② 推荐卡 `risk-recovery` 的「重新绑定当前标签页」chip ③ 设置视图站点与授权分区详情；**不再有第 4 处可见投影** |
| EC-V45-007 | **长会话（流变长）** | `#stream` 保持纯卡序，无固定位置结构包夹；自动滚到底 + 上滚回看不被固定块打断；`#15q` 320px 无溢出；不开新滚动容器 |
| EC-V45-008 | **会话切换 / 视图往返** | `#composer` 迁 `body` 尾后，草稿与滚动位置在视图往返中仍存活；L2 视图往返后展开态与密度复原（既有断言保持）；迁入 `#view-host` 的内容（局部树归因块 / 回执证据区）不引入第二个滚动容器 |
| EC-V45-009 | **320px / 双主题 / 高 DPI** | 320px 零水平溢出；`auto→light→dark` 三态在迁入块（设置帮助分区 / 树木归因块 / 审计证据区）中可读；高 DPI 下描边与字号不退化（人工面 + 既有三宽度断言） |
| EC-V45-010 | **解冻面外零 diff** | 除 `src/ui/options/index.html` 的**纯文案行**之外，`zeroDiffFiles` 其余 8 项逐字节不变；`docs/v3-supersession-ledger.json` **零 diff**（冻结历史） |
| EC-V45-011 | **迁出 / 迁入的方向性** | 内容迁出 `#stream` 时不得把常驻控件（`[data-chrome-control]` / `[data-toolbar-slot]` / `.view-btn`）带入流内；迁入 `#view-host` 的内容进入**被测量面**（不豁免）且不越阈值 |
| EC-V45-012 | **反证注入点被搬走** | 注入点随形态迁移必须**重写注入点**（不得沿用旧位置导致反证恒绿）；重写后仍须「注入必红 → 还原必绿」 |
| EC-V45-013 | **`#notice` 的多重角色消解** | `#notice` 既承载授权回执（`binding` `#4b/#4c`）又是密度夹具稳态锚：退役时**两处同时迁移**（回执事实 → 流内行 / 审计视图；夹具锚 → 构造保证），不得只迁一处留下悬空 |

---

## 8. 开放问题

| # | 问题 | 状态 |
|---|------|:--:|
| 1 | **O-REG-001 富提示的详情面去向** | **已裁决**（DC-V45-001，落地 FR-V45-013 / 030 / 031 / 042；§11 逐元素映射） |
| 2 | **O-REG-002 已决策历史与流的关系** | **已裁决**（DC-V45-002，落地 FR-V45-022：退役 + 计数入审计视图标题） |
| 3 | **O-REG-003 手势说明去向** | **已裁决**（DC-V45-003，落地 FR-V45-040~042：设置视图「帮助」分区 + chip `act:'help'`） |
| 4 | **O-REG-004 `options/index.html` 是否解冻** | **已裁决**（DC-V45-004，落地 FR-V45-050~052：**解冻单文件纯文案** + 显式登记 + `zero-injection` 复跑） |
| 5 | **O-REG-005 是否需要外部竞品调研** | **已裁决**（DC-V45-005：**不做**，登记「未执行，不阻塞」，不编造结论） |
| 6 | **O-REG-006 密度耦合口径的实测裁决** | **已裁决**（DC-V45-006，落地 FR-V45-070~074：31 格**重算为新基线** + 台账显式取代 + 反证；阈值逐字不动；`#stream` 豁免单源不变） |
| 7 | **O-REG-007 `host-registry` 最终形态** | **已裁决**（DC-V45-007，落地 FR-V45-060~062：**流内宿主清零** + 注册表降级为「零宿主断言」+ `RETIRED_HOST_IDS` 扩容） |
| 8 | **O-REG-008 N-05 是否随之关闭** | **已裁决**（DC-V45-008，落地 FR-V45-021：`#l1-ref` 证据面板 + 恢复按钮**并入 `ref` 卡**恢复区，N-05 已知偏差消解 → **关闭**） |
| 9 | **O-REG-009 FIX-5 是否独立成条** | **已裁决**（DC-V45-009，落地 FR-V45-025：**消解**，被核心 2 覆盖，不单列 AC） |
| 10 | **`#composer` 迁 `body` 尾后的 `NEVER_FOLDABLE` 口径**：保留条目（法四下它不是可折叠面板）还是随「流内宿主清零」一并删除？ | **已裁决**（DC-V45-010：**保留** `'composer'` 条目——永不折叠集合的语义是「禁止折叠」，与是否在流内无关；FR-V45-026） |
| 11 | **局部树归因块与回执证据区的落点**（`#l1-local-tree-*` / `#l1-receipt-*` 的去向：迁 L2 视图 vs 空态隐藏） | **已裁决**（DC-V45-011：**迁 L2 视图**——法则六「管理入视图」，`#view-host` 机制已存在；FR-V45-022） |
| 12 | **密度重算的具体格数与差值** | **待实测**（plan/build 阶段以 Chromium 实测给出；本规范只定「显式取代 + 反证 + 阈值不动」的口径，**禁止预填未实测数值**） |
| 13 | **体积净增 / 净减的最终值** | **待实测**（同上：五要素登记在 build / 收口轮按实测填写；本规范只定上限与纪律） |

> **裁决记录**：DC-V45-001~011 的逐条理由见 §13。**待实测项（#12 / #13）不属于未决需求**——其口径已定（显式取代 + 反证 / 五要素纪律），只待实测数值。

---

## 9. 验收标准（总体验收清单，含门禁映射）

> **口径**：每条 AC 必须**可验收**（可机核或可实跑），并标注承载门禁。**核心验收 = AC-V45-001 / 002 / 014 / 015 / 016 / 017**。

### 9.1 核心验收（单写化 + 时间序化）

| ID | 验收标准 | 承载门禁 |
|----|---------|---------|
| **AC-V45-001** | **真机首屏三事实各恰出现一次**：首屏（首装 / 无活跃站点 / 探测中）的三条提示事实——① 环境守卫（`kind='env'`）② 无活跃站点原因（`kind='site'`）③ 探测态（`kind='probe'`）——每条在可见面**恰出现 1 次**（流内系统事件行或流内卡），`#stream` 内外不存在同义第二份可见投影 | `test:stream` + `test:journey`（首屏段）+ 新增「单写化」断言 + 反证 |
| **AC-V45-002** | **`ol#stream` 子节点全部为时间序卡**：`#stream` 子树内 `li[data-host]` / `[data-transitional-host]` 计数 == **0**；每个 `#stream > li` 都是带 `data-msg-type` 的消息卡；DOM 里 `#env-guard` / `#site-hint` / `#onboarding` / `#discovery-notice` / `#notice` / `#l0-decision` / `#l1-group` / `#composer` 全部为 `null` | `test:l0`（结构集合）+ `test:stream` + 零宿主断言（`evaluateHostRegistry`）+ 反证 |
| AC-V45-003 | 5 条提示带 DOM 真退役（**非 `hidden`**，节点不存在）；`#send-reason` 仍在状态栏且语义不变 | `test:hardening`（`#env-guard` 改写）+ `test:insight` + `test:journey`（`#11c~#11e` 改写）+ 新增「节点不存在」断言 |
| AC-V45-004 | 单通道 4 规则语义逐字不变（去重 5000 / 上限 20 / `dropped` 不静默 / `持续：` 前缀 + 净化抛错） | `test:system-merge`（等价重锚）+ 常量机核 + 反证 |
| AC-V45-005 | `#composer` 在 `body` 尾部且 `hidden`；`#input` / `#send` 可被 journey/binding 读取；`requestTurn` 通路不变 | `test:journey` + `test:binding`（读取面）+ 新增父节点断言 |
| AC-V45-006 | 空态 / 默认首屏不再有 0 计数控件恒驻（**FIX-5 消解登记**：不单列 AC，登记为「已由核心 2 覆盖」） | `test:density`（默认档新读数）+ `test:l0`（改写后触发器集合） |
| AC-V45-007 | `ref` 卡卡内恢复区可达：`#l1-ref-repick` / `#l1-ref-describe` / `#l1-ref-rescue`（唯一文本匹配时可见）/ 原因文本均在卡内；**N-05 关闭**已登记 | `test:ref-pick-wiring ≥11` + `test:ask-auth` + `test:page-input`（改写）+ 人工面（§9.4） |
| AC-V45-008 | 选项池 + 后果预演（`#l1-consequence-tpl` 三段模板）在 `askuser` / `auth` 卡内可达；回执摘要在卡内固化区 + 审计视图可达 | `test:ask-auth` + `test:stream` + `test:l2`（审计视图） |
| AC-V45-009 | 局部树归因块 / 回执证据区在 `#view-host` 内可达；`#l1-history` 退役且已决策步数计数在审计视图标题区**全仓唯一** | `test:l1`（改写）+ `test:l2 ≥74` + `test:page-input` |
| AC-V45-010 | 手势说明在设置视图「帮助」分区可达且行数 == 6；设置分区计数**三方同源**（源注册表 / 渲染计数 / 入口 `data-count`） | `test/l2-counts.test.ts` + `test/ui/l2.mjs` + `test:l0`（设置入口计数） |

### 9.2 推荐卡与解冻面

| ID | 验收标准 | 承载门禁 |
|----|---------|---------|
| AC-V45-011 | `risk-recovery` 扩展生效：site / probe 触发产出恢复卡（含「重新绑定当前标签页」chip）；act 闭集 == `['next','repick','describe','authorize','rebind','help']`；本地动作**零 `requestTurn`**、不受 `pending` 门控；每个本地 act 有布线门禁 + 反证 | `test:recommendation ≥56` + `test:recommendation-sources` + 新布线门禁（仿 `authorize-chip-wiring`）+ `test:ask-auth` |
| AC-V45-012 | onboarding chip「了解 6 个页面手势」`act='help'` ⇒ 点击打开设置「帮助」分区且**零 user 回合**、零输入框写入 | `test:recommendation` ⑭ 家族等价重锚 + 新断言 + 反证 |
| AC-V45-013 | `options/index.html` 仅**纯文案行**解冻 + 显式登记（v3 台账零 diff）+ `test:zero-injection ≥27` 复跑不回归 + 全仓文案一致 | `test:zero-injection` + `test:settings` + `git diff --stat` 人工核 |

### 9.3 门禁、登记与红线

| ID | 验收标准 | 承载门禁 |
|----|---------|---------|
| **AC-V45-014** | **journey 第二次八步显式取代**：新 pin 写入 + `supersededFrom` 链式保留 + `modifiedRanges[]` + `redlineRemap[]` + 计数守恒 **≥167** + RP-V4-08 反证（段内 1 byte 必红 / 段外不红 / 逐字节还原）；`#15b` ≥65.0% 只允许上调 | `test:supersession ≥33` + `test:journey ≥167` + RP-V4-08 实跑 |
| **AC-V45-015** | **binding 保护段保段或显式取代**：保护段 sha 不变（保段）或走显式取代留痕（二选一，须显式声明）；**段外**读退役面的断言等价改写并在 `modifiedRanges[]` **逐行登记**；计数不减 | `test:binding ≥192` + `test:supersession`（登记完整性） |
| **AC-V45-016** | **l0 / l1 / disclosure / density / system-merge 断言重写为新语义（数量不减）**：`test:l0 ≥223` / `test:l1 ≥111` / `test/l0-disclosure.test.ts` 计数不减 / `test:density ≥175` / `test:system-merge` 计数不减；每处改写可 FAIL 反证 | 上述门禁 + 反证留证 |
| **AC-V45-017** | **测试总数只增**：`npm test ≥1001` 且各门禁计数 ≥ 基线（FR-V45-004 清单逐项）；**零断言删除 / 零降级**（保护段显式取代除外，须台账留痕） | `npm test` 全量 + 各门禁计数对账 |
| AC-V45-018 | **密度基线重算为 v4.5 新基线**：台账显式取代（前后值 / 日期 / 来源 / 理由 / 历史保留）+ 阈值逐字不动 + `#stream` 豁免单源不动 + 每格改动留痕 + 反证不空转（含注入点重写） | `test:density ≥175` + `test/density-thresholds.test.ts` + RP 反证 |
| AC-V45-019 | **体积五要素 + ceiling 公式 + 披露算术机核 + V3-VOL-3 三值同源**：`sidepanel.js` ≤ `floor(baseline × 1.05)`；`SIDEPANEL_CEILING_CAP === 'record-only'`；档位 512,000 与绝对上限 563,200 不变；`authorConfirmation.status` **未被伪称已确认** | `test/size-budget` + `test/size-growth-evidence` + `test/size-ruling-vol3 ≥10` |
| AC-V45-020 | **红线逐字节**：`content.js` 177,076 B / `52a82620…`；`pick-layer.js` 33,900 B / `5f567d7e…`；`design/**` + shim 双 sha；`manifest.json` / 判定链内容哈希；`docs/v3-supersession-ledger.json` 零 diff | `test:design-contract ≥6` + `test:zero-injection` + 红线逐字节核验 |
| AC-V45-021 | **门禁严格串行 + `KL-N-10` 纪律**：`test` / `test:ui` / `test:binding` **绝不并发**；首轮异常隔离复跑 ≥2、日志全量、仍红如实登记**不阻塞收口**（不伪造串行绿） | 全部 24 项门禁串行复跑日志（落盘全量） |
| AC-V45-022 | **人工面清单逐项标注**（`⏳ 未执行` 或 `PASS`，**不得冒充 PASS**）：真机首屏单写化观感 / 流纯时间序滚动观感 / 卡内恢复区手感 / 设置帮助分区观感 / 双主题 / 320px / 键盘 / 读屏（`title` 承载长文案的可访问性） | 收口文档的人工面清单（逐项状态） |

### 9.4 核心验收与门禁的映射摘要（**四项高危门禁**）

| 门禁 | 当前的形态依赖 | v4.5 的验收要求 | 取代 / 重锚形态 |
|---|---|---|---|
| `test:journey`（≥167） | 保护段 `#15a~#15q` 读 `#stream` 直接子节点与顺序、`#15b` 高度占比、`#15p/#15r/#15s/#15t` 滚动跟随、`#15q` 320px | 保护段**第二次八步显式取代**（新 pin）+ `#15b` ≥65.0%（只上调）+ 段外 `#11c~#11e` 等价改写 | 取代台账 `protectedSupersession` + `redlineRemap[]` + RP-V4-08 反证 |
| `test:binding`（≥192） | 保护段 `#22a~#22l`（override chain）零依赖退役面；**段外** `#4b/#4c` 读 `#notice`、`AP#4b` 读 `#discovery-notice` | 保护段**保段**（sha `be9ad0e9…` 不变）或显式取代；段外**等价改写 + 逐行登记** | `modifiedRanges[]` 逐行（v4-1 先例） |
| `test:density`（≥175） | 夹具稳态锚 = `#notice` 存在且非 `hidden`；31 登记格 | 锚**改由构造保证**（不依赖运行顺序、不回退 F2/K-1 修复口径）；31 格**重算为新基线** + 台账显式取代 + 反证；阈值**逐字不动** | `docs/v4-density-baseline.json` v4.5 台账 + `RP-V4-*` 反证 |
| `test:supersession`（≥33） | `knownGap` ↔ `status` 一致性机核 + 八步 + RP-V4-08 | 新增取代条目后**全部一致性检查保持绿**；`status=complete-steps-1-8` ⇒ `knownGap` 为空或仅声明闭环 | 取代台账新增叶段（`v45-1@<HEAD>`） |

---

## 10. 问题覆盖矩阵（12 问题 → FR 逐条可追溯）

| 问题（discovery） | 级别 | 承载 FR | 承载 AC | 说明 |
|---|:--:|---|---|---|
| **Q-REG-001** 同一事实流内外双写（5 条提示带），事实面不唯一 | 核心 | FR-V45-010 / 011 / 012 / 013 / 014 / 015 | AC-V45-001 / 003 / 004 | 退役可见投影 + 单通道规则不变 + 富内容去向 + 归并判据重写 |
| **Q-REG-002** 流被 4 个固定位置宿主切段，时间序被结构打断 | 核心 | FR-V45-020 / 021 / 022 / 023 / 024 | AC-V45-002 / 005 / 007 / 008 / 009 | 宿主清零 + 存活元素去向 + `#composer` 出流 + 插入锚迁移 |
| **Q-REG-003** 过渡态被注册表固化为永久，收口义务在制度上被消解 | 核心 | FR-V45-060 / 061 / 062 | AC-V45-002 / 016 | 零宿主断言 + 退役清单扩容 + 5 类问题串终态 |
| **Q-REG-004** 空态 / 默认首屏被 0 计数控件占据 | 核心 | FR-V45-022（退役）/ FR-V45-025 | AC-V45-006 | 开关退役 = 恒驻消失；FIX-5 消解登记 |
| **Q-REG-005** `#l1-ref` 证据面板承载救援路径，位置与 F 稿「卡内」不一致（N-05） | 次要 | FR-V45-021 | AC-V45-007 | 证据 + 恢复并入 `ref` 卡 ⇒ N-05 **关闭** |
| **Q-REG-006** `#notice` 同时是授权回执可见面与密度夹具稳态锚 | 次要 | FR-V45-011 / 072 / 081 | AC-V45-015 / 018 | 两处角色同时迁移（回执 → 流内行 / 审计；锚 → 构造保证） |
| **Q-REG-007** `options/index.html` 授权文案过时但被冻结面保护 | 次要 | FR-V45-050 / 051 / 052 | AC-V45-013 | 显式解冻（纯文案）+ 订正 + `zero-injection` 复跑 |
| **Q-REG-008** 「已决策历史」与流本身语义重复 | 次要 | FR-V45-022 | AC-V45-009 | 历史面退役；`rounds[]` 单源不变；计数入审计视图标题 |
| **Q-REG-009** 体积余量只有 ~24 KB，重构可能净增 | 潜在 | FR-V45-090 / 091 / 092 / 093 | AC-V45-019 / 020 | 五要素 + 算术机核 + V3-VOL-3 三值 + 红线逐字节 |
| **Q-REG-010** 密度 31 登记格耦合面存在口径分歧 | 潜在 | FR-V45-070 / 071 / 072 / 073 | AC-V45-018 | 以 Chromium 实测重算 + 显式取代 + 反证；阈值不动 |
| **Q-REG-011** `journey` 保护段二次取代需重走八步 | 潜在 | FR-V45-080 / 083 | AC-V45-014 | 八步 + `knownGap` 一致性 + RP-V4-08 反证 |
| **Q-REG-012** `hardening` / `insight` 门禁对 strips 有独立正面断言 | 潜在 | FR-V45-082 | AC-V45-003 / 016 | 逐条等价改写（改写 ≠ 删除） |

**覆盖结论**：12/12 问题各有 ≥1 条 FR + ≥1 条 AC 承载；无「有问题无需求」与「有需求无来源」的双向缺口。

### 10.1 开放点裁决落位表（O-REG-001~009 → 条文）

| 开放点 | 裁决 | 落位 FR / AC | 落位结构 |
|---|---|---|---|
| O-REG-001 富提示详情 | 单行事实行 + 推荐卡恢复 chips + 行 `title` + 设置站点详情；**零新增宿主** | FR-V45-013 / 030 / 031；NFR-V45-003 / 008 | §11 行 29~33 |
| O-REG-002 已决策历史 | **退役**；历史 = 流本身；计数入审计视图标题（恰一处） | FR-V45-022；AC-V45-009 | §11 行 21~22 |
| O-REG-003 手势说明 | 迁设置视图**「帮助」分区**；chip `act:'help'` | FR-V45-040~042；AC-V45-010 / 012 | §11 行 26~27；§5.4 FR-V45-032 |
| O-REG-004 options 解冻 | **解冻单文件纯文案** + 显式登记 + `zero-injection` 复跑 | FR-V45-050~052；AC-V45-013 | §5.6；EC-V45-010 |
| O-REG-005 竞品调研 | **不做**，登记「未执行，不阻塞」 | NG-V45-011 | §13 DC-V45-005 |
| O-REG-006 密度口径 | 31 格**重算为新基线** + 台账显式取代 + 反证；阈值逐字不动；豁免单源不动 | FR-V45-070~074；AC-V45-018 | §5.8；§9.4 |
| O-REG-007 host-registry | **零宿主断言** + `RETIRED_HOST_IDS` 扩容 + `#composer` 出流（body 尾 hidden） | FR-V45-060~062 / 023；AC-V45-002 | §5.7；§11 行 35~36 |
| O-REG-008 N-05 | **关闭**（证据 + 恢复并入 `ref` 卡） | FR-V45-021；AC-V45-007 | §11 行 12~16 |
| O-REG-009 FIX-5 | **消解**（被核心 2 覆盖，不单列 AC） | FR-V45-025；AC-V45-006 | §13 DC-V45-009 |

---

## 11. 宿主与存活元素去向映射（**逐元素，plan/build 的施工图**）

> 口径：**退役** = 从 DOM 移除（不是 `hidden`）；**迁移** = 在新承载面可达（id 命中新位置或等价新 id，须显式登记）；**消解** = 功能由新面天然承载，原控件不再需要；**保留** = 零改动或仅新增单一生产入口。

### 11.1 `decision` 壳（`li[data-host="decision"]` + `#l0-decision`）

| # | 元素 | 现状职责 | 去向 | 承载判据 | 主要门禁冲击 |
|:-:|---|---|---|---|---|
| 1 | `li[data-host="decision"]` | 固定位置宿主 | **退役** | 宿主零计数 | `l0.mjs`（结构集合）/ 零宿主断言 |
| 2 | `#l0-decision` | 决策 / 回执 / 引用壳容器 | **退役** | `getElementById('l0-decision') === null` | `disclosure.ts#NEVER_FOLDABLE` / `l0.mjs:874-875` |
| 3 | `#l0-kicker` | 角色名（FIX-4 收敛为「决策 · 回执 · 引用」） | **退役**（角色名由流内卡自身承载；FIX-4 语义被取代，须在取代 / 收口文档登记） | kicker 零命中；卡自身语义断言 | `test:l0`（kicker 断言等价重锚） |
| 4 | `#l0-more`（「更多选项（还有 0 个）」） | 展开 `#l1-more` + `#l1-consequences` 的触发器 | **迁移** → `askuser` 卡内选项池展开（末项固定「其他…（我来描述）」语义保持） | 卡内可达 + 计数语义保留 | `l0.mjs` ⑧ / `disclosure.ts#DISCLOSURE_WIRING` / `l1/panels.ts` |
| 5 | `#l1-more` / `#l1-more-options` | 折叠选项池（`last.foldedOptions`） | **迁移** → `askuser` 卡内选项池 | 卡内可达；「无卡却还有 1 个」bug 不复现（单写者） | `l1.mjs` ②⑫ / `test:ask-auth` |
| 6 | `#l1-consequences-toggle` | 后果预演展开触发器 | **迁移** → `askuser` / `auth` 卡内后果预演区（自带展开） | 卡内可达 + `aria-expanded` / `aria-controls` 成对 | `l0.mjs` ⑧ / `test:ask-auth` |
| 7 | `#l1-consequences` | 后果预演内容容器 | **迁移** → 同上（卡内展开区） | 卡内可达 | `test:ask-auth` |
| 8 | `#l1-consequence-tpl`（三段模板） | 「会发生什么 / 不会发生什么 / 不可逆性声明」模板 | **迁移** → `askuser` / `auth` 卡内（**文案逐字不变**） | 三段文本逐字命中 | `test:ask-auth` |
| 9 | `#l0-receipt-summary` | 常驻回执摘要（`hidden` 直到有回执） | **迁移** → 流内卡固化区（`auth` / `askuser` 卡）+ **审计视图**（完整证据） | 卡内固化区可达；审计视图可达 | `l1.mjs` / `test:l2` / `test:binding` |
| 10 | `#l0-ref-toggle`（「引用 0 条」） | 展开引用证据面板 | **退役**（`ref` 卡卡内证据区自带展开） | 触发器零命中 | `l0.mjs` ⑧ / `disclosure.ts` |
| 11 | `#l0-ref-badge`（「失效」） | 失效角标（chip 的 **sibling**） | **退役** → 由 `ref` 卡卡内失效标记承载（**同级 sibling 语义**不得变成子节点） | 卡内失效标记断言 | `test:l1-reverse` / `test:ref-pick-wiring` |
| 12 | `#l1-ref`（引用证据面板） | 证据层只读投影（选择器 / 语义路径 / 文本摘要 / 捕获时间） | **迁移** → `ref` 卡卡内证据区（`#l1-ref-rows` / `#l1-ref-summary` 等价物） | 卡内可达 + 四要素齐全 | `l1.mjs` / `l1-reverse.mjs` / `test:page-input` / `l1-ref-validity.test.ts` |
| 13 | `#l1-ref-repick`（重新拾取） | 恢复路径 ① | **迁移** → `ref` 卡卡内恢复区 | 卡内可达 + 点击走拾取入口 | `test:ref-pick-wiring ≥11` |
| 14 | `#l1-ref-describe`（改用描述） | 恢复路径 ② | **迁移** → `ref` 卡卡内恢复区 | 卡内可达 + `submitDescribe` 结算（BLOCK-03 修）不回归 | `test:ref-pick-wiring` / `test:ask-auth` |
| 15 | `#l1-ref-rescue`（一键重锚） | 恢复路径 ③（**唯一文本匹配时可见**） | **迁移** → `ref` 卡卡内恢复区（**可见性谓词逐字不变**） | 卡内可达 + 非唯一时不可见 | `test:page-input` / `test:l1` / 人工面 |
| 16 | `#l1-ref-reason` | 恢复原因文本 | **迁移** → `ref` 卡卡内恢复区 | 卡内可读 | `test:page-input` |

### 11.2 `l1-panels` 组（`li[data-host="l1-panels"]` + `#l1-group`）

| # | 元素 | 现状职责 | 去向 | 承载判据 | 主要门禁冲击 |
|:-:|---|---|---|---|---|
| 17 | `li[data-host="l1-panels"]` / `#l1-group` | 固定位置宿主 + L1 内容层容器 | **退役** | 宿主零计数 + `#l1-group` 零命中 | 零宿主断言 / `l0.mjs` |
| 18 | `#l1-local-tree-toggle`（「归属（局部树）· 0 个节点」） | 展开局部树归因 | **迁移** → 「树」视图（L2）只读归因块（法则六「管理入视图」；DC-V45-011） | 树木视图内可达；0 计数不再恒驻首屏 | `l0.mjs` ⑧ / `l1.mjs` ②⑫ / `test:l2` |
| 19 | `#l1-local-tree`（+ `-rows` / `-hint`） | 局部树只读投影（≤3 节点 + 交叉引用） | **迁移** → 同上（`#view-host` 内） | 渲染内容不变；不引入第二滚动容器 | `test:page-input` / `test:l1` |
| 20 | `#l1-local-tree-global`（「查看全局树」） | 跳转 L2 树视图 | **消解**（已在树视图内，跳转无意义） | 控件移除且无悬空引用 | `test:page-input` |
| 21 | `#l1-history-toggle`（「已决策 0 步」） | 展开已决策历史 | **退役**（O-REG-002：历史 = 流本身） | 触发器与面板零命中 | `l0.mjs` ⑧ / `l1.mjs` ②⑫ / `disclosure.ts` |
| 22 | `#l1-history` / `#l1-history-rows` | 已决策历史只读投影（零副作用） | **退役**；**已决策步数计数 → 审计视图标题区（恰一处）** | `rounds` 派生计数在审计视图标题可读；全仓唯一 | `test:l2` / `test:l1` |
| 23 | `#l1-receipt-toggle`（「回执证据（0 行）」） | 展开回执完整证据 | **迁移** → 「审计」视图（L2）证据区 | 审计视图内可达；0 计数不再恒驻首屏 | `l0.mjs` ⑧ / `test:l2` |
| 24 | `#l1-receipt` / `#l1-receipt-rows` / `#l1-receipt-audit-summary` | 回执证据行 + 审计摘要 | **迁移** → 同上 | 行数与摘要语义不变 | `test:l2` / `test:binding` |
| 25 | `#l1-receipt-audit`（「查看审计（完整审计视图）」） | 跳转审计视图 | **消解**（已在审计视图内） | 控件移除且无悬空引用 | `test:l2` |
| 26 | `#l1-gestures-toggle`（「页面交互说明（6 个手势）」） | 展开手势表 | **迁移** → 设置视图「帮助」分区（O-REG-003） | 设置内可达；分区计数三方同源 | `l0.mjs` ⑧ / `test/l2-counts` / `test/ui/l2.mjs` |
| 27 | `#l1-gestures` / `#l1-gestures-rows`（表） | 手势 / 作用表（`L1_GESTURE_LABELS` 单源） | **迁移** → 同上（**表结构与 6 行逐字不变**；只读、零可点） | 6 行 == `L1_GESTURE_LABELS.length`；分区内 0 个可点 | `test:l0` / `test:page-input` |

### 11.3 `strips` 与 composer（`li[data-host="strips"]` / `li[data-host="composer"]`）

| # | 元素 | 现状职责 | 去向 | 承载判据 | 主要门禁冲击 |
|:-:|---|---|---|---|---|
| 28 | `li[data-host="strips"]` / `.strips` | 固定位置宿主 + 提示带容器 | **退役** | 宿主零计数 | 零宿主断言 |
| 29 | `#env-guard`（`role=alert`） | 环境守卫（非扩展上下文）一次性告警可见面 | **退役**（事实 → 流内系统事件行 `kind='env'`） | 节点零命中 + 行恰 1 条 | `test:hardening`（3 条正面断言改写）/ `env-guard.test.ts` |
| 30 | `#site-hint`（`sh-title` / `sh-detail` / `sh-action`） | 无活跃站点的可解释原因 + 下一步动作（富文本） | **退役**（事实 → 行 `kind='site'`；长文案 → 行 `title` + **设置视图站点与授权分区详情**；可行动恢复 → 推荐卡 `risk-recovery`「重新绑定当前标签页」chip） | 行恰 1 条 + `title` 与设置详情**同源** + chip 可达 | `test:journey #11c~#11e`（等价改写）/ `test:insight` |
| 31 | `#onboarding` | 首装步骤可见面 | **退役**（已由 `firstRunCard` 流内卡 + 行 `kind='firstRun'` 承载——**v4-4 先例**，归并不丢语义） | firstRun 卡存在 + `terminable` 谓词保持 | `test:recommendation` ⑬（改读卡 / state）/ `test:journey` |
| 32 | `#discovery-notice`（`dn-title` / `dn-detail`） | 探测状态 / 原因（两段）+ 退避重试语义 | **退役**（事实 → 行 `kind='probe'`；退避策略全文 → 行 `title` + 设置站点分区详情） | 行恰 1 条 + `title` 与详情同源 + 稳态不刷屏 | `test:binding` `AP#4b` / `test:insight` / `test:hardening` |
| 33 | `#notice`（`role=status`） | 授权回执可见面（+ 密度夹具稳态锚） | **退役**（回执事实 → 流内行 `kind='notice'` / 卡固化区 + 审计视图；**夹具锚 → 构造保证**） | 节点零命中 + 回执事实仍可读 + 夹具确定性由构造保证 | `test:binding` `#4b/#4c` / `test/ui/density.mjs` 锚 / `test:system-merge` |
| 34 | `#send-reason`（状态栏内） | 发送禁用原因（常驻状态） | **保留**（状态栏职责不变；`kind='send'` 事件化语义不变） | 元素仍在 `#region-statusbar` 内可按既有语义读取 | `test:l0`（状态栏断言） |
| 35 | `li[data-host="composer"]` | 固定位置宿主 | **退役** | 宿主零计数 | 零宿主断言 |
| 36 | `#composer` / `#input` / `#send` | 回合入口（法四下 `hidden`） | **迁 `body` 尾部 + 保持 `hidden` + id/ARIA 保留** | 父节点 == `body`；`hidden === true`；读取路径零改动 | `test:journey` / `test:binding` / `test:page-input` |
| 37 | `#rebind`（设置视图，**不在 strips**） | 重新绑定当前标签页（设置内动作） | **保留** + **新增本地生产入口单一调用点**（推荐卡 `rebind` chip 复用，FIX-1 `authorizeCurrentSite` 先例） | 唯一调用点机核 + chip 可达 + 零 `requestTurn` | 新布线门禁 / `test:settings` |

**映射结论**：**37 条去向**已逐条定案——**退役 19 / 迁移 13 / 消解 3 / 保留 2**；无「去向未定」元素；**新增宿主 = 0**。

---

## 12. 子 Feature 拆分与交付顺序

### 12.1 结构裁决（**单叶**）

| 项 | 裁决 | 理由 |
|---|---|---|
| 父 Feature | `specs-tree-web-cli-plugin-v45-f-regularization`，`depth=1`，**轻量规范容器**（不承接 tasks/build/review/validate，不产出 `tasks.json`） | v3-ui / v4-chat 先例 |
| 子 Feature | **唯一叶** `specs-tree-v45-1-single-write-chronology`（`depth=2` / `leaf:true`） | 两项核心（strips 单写化 + 宿主时间序化）+ 两项附带（FIX-5 消解 / options 解冻）**共享同一次 `scope` 体积重登记与同一次 journey 结构重锚** ⇒ **门禁迁移不可分割**；若拆两叶，两叶都会改同一条 journey 保护段与同一次体积登记（重复取代 / 冲突取代） |
| 否决的拆分草案 | discovery §6.3 的 3 叶草案（`v45-1-strips-single-write` / `v45-2-host-timeline` / `v45-3-options-unfreeze`） | ① 前两叶共享同一次 journey 取代与体积重登记 ⇒ 判据互不独立；② options 解冻（= 纯文案 1 行）体量不足以成叶；③ 单叶可让「零宿主 + 零投影」作为**同一套不变量**一次性验收 |

### 12.2 交付顺序与叶职责

| 顺序 | 叶 | 职责 | 依赖 |
|:--:|---|---|---|
| 1 | `specs-tree-v45-1-single-write-chronology` | 承载 §5.2 SINGLE（5 条提示带单写化）+ §5.3 CHRONO（4 宿主时间序化 + `#composer` 出流）+ §5.4 RECOVERY（风险恢复规则扩展）+ §5.5 HELP（手势 → 设置帮助分区）+ §5.6 UNFREEZE（options 纯文案解冻）+ §5.7 REGISTRY（零宿主断言）+ §5.8 DENSITY（基线重算）+ §5.9 LEDGER（journey 二次取代 / binding 段外 / 门禁重锚）+ §5.10 VOL（五要素 / V3-VOL-3） | —（P0，首且唯一） |

> 叶内**执行序**（供 plan/tasks 参考，**不是需求**）：① 先定「退役面 DOM 移除 + 归并判据重写」（SINGLE）→ ② 再「宿主清零 + 元素迁移 + `#composer` 出流」（CHRONO，含 `ref` 卡 / `askuser` 卡 / `auth` 卡 / L2 迁入块 / 设置帮助分区）→ ③ 然后「推荐卡恢复扩展 + act 闭集 + 布线门禁」（RECOVERY / HELP 的 chip 面）→ ④ options 解冻（独立、可并行准备）→ ⑤ 最后统一做「密度重算 + journey 取代 + 体积重登记」（共享收口面，**必须一次做完**）。

---

## 13. 裁决记录（O-REG-001~009 + spec 追加 DC-V45-010 / 011）

| # | 裁决 | 落地条文 | 理由（一句话） |
|---|---|---|---|
| **DC-V45-001**（承 O-REG-001） | **富提示详情**：系统事件行 = **单行事实载体**；**可行动恢复**走推荐卡 `risk-recovery` 规则扩展（`site` / `probe` 类触发入恢复触发集）；**长文案（退避策略全文）**降为行 `title` + 设置视图站点分区详情；**不新增任何宿主** | FR-V45-013 / 030 / 031 / 042；NFR-V45-003 / 008；§11 行 29~33 | 单行通道已在 v4-4 建好（去重 / 限速 / 净化），富内容只需「事实行 + 恢复入口 + 详情面」三件套；新增宿主会直接违反「零宿主」终态 |
| **DC-V45-002**（承 O-REG-002） | **已决策历史**：退役 L1 开关；**历史 = 流本身**（`rounds[]` 已单源于流投影）；已决策步数**计数入审计视图标题区（恰一处）** | FR-V45-022；AC-V45-009 | F 变化点 1 明写「对话历史 = 流本身」；`rounds[]` 在 v4-3 已由终态卡事件派生 ⇒ 数据单源已成立，只差投影退役 |
| **DC-V45-003**（承 O-REG-003） | **手势说明**迁设置视图**「帮助」分区**（法则六：管理入视图）；onboarding 推荐卡 chip 由 `next` 改 `act:'help'`（**本地动作**，打开该分区）；act 闭集**终态 = 6 项** | FR-V45-040~042 / 032；NG-V45-016 | 静态帮助内容既非 0 计数也非过程事实 ⇒ 按法则六归视图；FIX-1 已确立「本地动作 ≠ 聊天消息」先例，`help` 同口径扩容 |
| **DC-V45-004**（承 O-REG-004） | **解冻 `options/index.html`**：解冻范围 = **单文件纯文案行**（v3 `zeroDiffFiles` **缩窄**）；订正授权指引；**显式解冻登记**（落 v4.5 取代台账，v3 台账零 diff）；`test:zero-injection` 复跑确认不回归 | FR-V45-050~052；AC-V45-013 | 文档-实现不一致是真实缺陷（用户按 options 指引找不到入口）；把范围钉死在「纯文案」即可在不触碰零注入 / 零权限红线的条件下关闭 FIX-2 deferred |
| **DC-V45-005**（承 O-REG-005） | **不做外部竞品调研**，登记「**未执行，不阻塞**」（v4 先例 `O-CHAT-009`），**不编造结论** | NG-V45-011 | 本 Feature 是既有设计的形态收尾，不是交互模型选型；无外部参照不构成论证缺口 |
| **DC-V45-006**（承 O-REG-006） | **密度口径**：宿主退役后 **31 格重算为新基线**（v4.5 台账**显式取代** + 反证）；阈值 `7/15 · 9/20 · 17/35` **逐字不动**；`#stream` 豁免口径**不变**（`density-scope` 单源不动）；夹具锚改由**构造**保证 | FR-V45-070~074；AC-V45-018；NG-V45-007 | discovery Q-REG-010 的两读法并存 ⇒ 只认实测；「重算 + 显式取代 + 反证」既避免高估 / 低估工作量，也禁止静默改写登记册 |
| **DC-V45-007**（承 O-REG-007） | **`host-registry` 终态 = 流内宿主清零**：`ol#stream` 只含时间序卡；注册表**降级为「零宿主断言」**（任何 `li[data-host]` 存在即红）+ `RETIRED_HOST_IDS` **扩容收编全部旧宿主**；`#composer` **迁 `body` 尾部 hidden**（id/ARIA 保留——法四不变，仅物理位置出流） | FR-V45-060~062 / 023；AC-V45-002 | 「登记集合 == 实存集合」这条判据只能表达「形态被锁定」；改成「实存集合 == ∅」才能让 R4-18 的收口义务可达，同时让「新增宿主」成为即红事件 |
| **DC-V45-008**（承 O-REG-008） | **N-05 关闭**：`#l1-ref` 证据面板 + 恢复按钮（重新拾取 / 改用描述 / 一键重锚）**并入 `ref` 卡恢复区**（卡内可达 ⇒ 已知偏差消解） | FR-V45-021；AC-V45-007 | v4-4 的 N-05 之所以成立，唯一原因是按钮住在 L1 面板；面板退役后**唯一可达处就是卡内** ⇒ 偏差自然消解，无需新增控件（卡预算 / 密度登记格无需重审） |
| **DC-V45-009**（承 O-REG-009） | **FIX-5 消解**（被宿主时间序化覆盖，**不单列 AC**）；仅在收口文档登记「已由 v4.5-1 覆盖」 | FR-V45-025；AC-V45-006 | 0 计数控件的恒驻性来源正是 4 个固定位置宿主与决策壳；宿主清零后「隐藏 0 计数」这一动作本身不再存在 |
| **DC-V45-010**（spec 追加） | `'composer'` **保留**在 `NEVER_FOLDABLE`（永不折叠 = 禁止折叠，与是否在流内无关） | FR-V45-026 | 删条目会**削弱**一条红线（法四下 `#composer` 更不可折叠）；保留条目 + 新增「父节点 == body」断言 = 双判据 |
| **DC-V45-011**（spec 追加） | `#l1-local-tree-*` 与 `#l1-receipt-*` **迁 L2 视图**（树视图 / 审计视图），而非空态隐藏 | FR-V45-022；NG-V45-014 | 两者都是「既有事实的只读投影」（归因 / 证据），按法则六属视图职责；空态隐藏只会把噪音挪成「有时出现」，仍是固定位置思维；`#view-host` 机制已存在（零新机制） |

---

## 14. 风险登记（继承 R-REG-001~015 + spec 新增 R-REG-901~906）

### 14.1 继承风险（discovery §5.2，逐条保留等级与预登记证据）

| # | 风险 | 等级 | 承载条文 / 应对 |
|---|------|---:|---|
| R-REG-001 | `journey` 保护段需**二次八步显式取代** | 中高 | FR-V45-080 / 083；AC-V45-014 |
| R-REG-002 | `binding` **段外** `#notice` / `#discovery-notice` 断言需等价改写 + `modifiedRanges[]` 逐行登记 | 中高 | FR-V45-081；AC-V45-015 |
| R-REG-003 | `l0.mjs` `EXPECTED_TRIGGERS` 12 条与 `disclosure.ts` 三份声明**同源耦合**，断言零删除 ⇒ 只能等价重锚 | 中高 | FR-V45-026 / 082；AC-V45-016 |
| R-REG-004 | `l1.mjs` ②⑫ + `page-input.mjs` 依赖 4 个触发器可见性；「非空文字标签」判据与空态隐藏**正面冲突** | 中 | FR-V45-082；AC-V45-016 |
| R-REG-005 | `hardening` / `env-guard` 单测 / `journey #11c~#11e` 是「投影存在」的**正面断言** ⇒ 正面冲突，必须逐条等价改写 | 中高 | FR-V45-082；AC-V45-003 / 016 |
| R-REG-006 | 密度夹具稳态锚 = `#notice`；重写不得静默回退 closeout 轮的夹具确定性修复 | 中 | FR-V45-072；AC-V45-018 |
| R-REG-007 | 体积五要素重登记 + 算术机核 + V3-VOL-3 三值前移 + `authorConfirmation` 占位保持 | 中 | FR-V45-090~092；AC-V45-019 |
| R-REG-008 | 密度 31 登记格**分歧口径**导致工作量误估（`#stream` 豁免 vs f-fidelity-fix §5.1 表述） | 中 | DC-V45-006（只认实测）；FR-V45-071 |
| R-REG-009 | RP 反证 / 探针若**不再 FAIL** 即判据空转（BLOCK-02 同类教训） | 中高 | FR-V45-073 / 084；EC-V45-012 |
| R-REG-010 | `host-registry.ts` 自身「判据即结构」耦合体；「id 仍在 DOM」判据与退役投影**直接矛盾**，必须重写而非放宽 | 中高 | FR-V45-015 / 062 |
| R-REG-011 | 门禁自身形态漂移抬高元门禁成本；**串行纪律**（绝不并发） | 低 | §15；AC-V45-021 |
| R-REG-012 | `KL-N-10` binding 环境性 flake 被误读为回归 | 低 | §15 纪律；AC-V45-021 |
| R-REG-013 | `options/index.html` 解冻是治理动作，可能打开更大面（`zero-injection` 等） | 低 | FR-V45-050 / 052；EC-V45-010 |
| R-REG-014 | `STREAM_HEIGHT_RATIO_MIN = 0.65` 只允许上调；`journey #15b` 与 `l0.mjs:874-875` 结构集合可能需重锚 | 中 | FR-V45-080；NFR-V45-001 |
| R-REG-015 | 净增超 **24,001 B** 直接 FAIL（生效上限 504,027 B）；净减亦触发体积链登记 | 中 | FR-V45-090；NG-V45-007 |

### 14.2 spec 新增风险

| # | 风险 | 等级 | 说明 / 应对 |
|---|------|---:|---|
| **R-REG-901** | **`title` 属性成为新的零明文缺口**：长文案迁入 `title` 后，若不过净化校验，可能把 URL query / 片段带进 DOM 属性（既有净化只覆盖文本） | 中高 | NFR-V45-003（`title` 同过净化 + 注入反证）；AC-V45-004 / 017 |
| **R-REG-902** | **`#view-host` 不豁免 ⇒ 迁入内容进入密度被测量面**，可能把区壳读数推过阈值（阈值不得放宽） | 中 | FR-V45-070 / 071；EC-V45-011；AC-V45-018 |
| **R-REG-903** | **设置分区数变化引发连锁派生**（`SETTINGS_SECTION_IDS` 7 → 8 会改 `deriveCounts().settings` / 入口 badge / `test/l2-counts` / `test/ui/l2.mjs` 三方同源） | 中 | FR-V45-040；NG-V45-016；AC-V45-010 |
| **R-REG-904** | **act 闭集扩容可能误伤 deny 集安全边界**：新增本地 act 若被 deny 集误判或漏判，会出现「推荐被拦动作」或「本地动作被丢弃」 | 中 | FR-V45-031 / 032 / 033；AC-V45-011（deny 集不误伤本地动作 + 布线门禁） |
| **R-REG-905** | **`#rebind` 双入口**（设置按钮 + 推荐 chip）可能产生两套实现（漂移面） | 中 | FR-V45-031 / 033（单一生产入口 + 唯一调用点机核） |
| **R-REG-906** | **「零宿主」判据被空转绕过**：例如把宿主属性改名（`data-host` → 别的名字）或把结构塞进卡内 | 中高 | FR-V45-060（任意深度 + 任意 `li[data-host]` / `data-transitional-host`）+ NG-V45-001 / 017；AC-V45-002（反证：注入即红） |

---

## 15. 纪律与验证契约

| # | 纪律 | 依据 |
|:-:|---|---|
| 1 | **`.sddu/**` 只写本 Feature 目录**；spec 阶段零改动 `src/` `test/` `dist/` `docs/` `design/` 与 ROADMAP | D6 |
| 2 | **path-limited `git add`**（禁 `git add -A` / `.`）；不 force push；不合 main；不发布；无新依赖；不改 `packages/web-cli-base/**`；不改 `.opencode/opencode.json` | N15 / NG-V45-013 |
| 3 | **门禁严格串行**（`test` / `test:ui` / `test:binding` **绝不并发**；一次一个 Chromium；`finally` 自清 profile；1.5 GB 机器 OOM 前科） | N14 |
| 4 | **`KL-N-10` 处置纪律**：首轮异常**隔离复跑 ≥2**、日志全量、**仍红如实记录不阻塞收口**（不伪造串行绿） | N18 |
| 5 | **断言零删除零降级、计数只增不减**（唯一例外：保护段显式取代 + 台账留痕） | N12 / FR-V45-004 |
| 6 | **反证必须实跑**：注入 → FAIL（声明 `expectFailPattern`）→ 逐字节还原（sha256 前后相同）→ PASS；禁止「删属性充数 / 自我裁决自我验收 / 换口径放松」 | R-REG-009 / FR-V45-084 |
| 7 | **人工面如实登记**：观感 / 手势 / 权限弹窗 / 读屏等 headless 不可合成项逐项标注 `⏳ 未执行` 或 `PASS`，**不得冒充 PASS** | AC-V45-022 |
| 8 | **本阶段（spec）零运行时验证**：所有数字与 `file:line` 均引自已入库产物与源码（discovery §7.1 + 本规范 §2.6）；未跑任何门禁 / 构建 / Chromium | D6 |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（v4.5「F 还原度转正」需求规范）：父 Feature = 轻量规范容器 + **1 个叶子**（`specs-tree-v45-1-single-write-chronology`，否决 discovery 的 3 叶草案并登记理由）；**44 FR / 8 NFR / 13 EC / 22 AC / 17 NG / 6 US / 6 G**；**O-REG-001~009 九条开放点全裁决**（+ spec 追加 DC-V45-010 / 011）；新增 §11 宿主与存活元素去向映射（37 条逐元素：退役 19 / 迁移 13 / 消解 3 / 保留 2，新增宿主 0）；新增 §14 风险登记（继承 R-REG-001~015 + R-REG-901~906） | 2026-09-21 | SDDU Spec Agent |
