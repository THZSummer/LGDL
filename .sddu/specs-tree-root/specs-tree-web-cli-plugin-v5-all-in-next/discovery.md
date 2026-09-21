# 问题挖掘报告：specs-tree-web-cli-plugin-v5-all-in-next

> **文档定位**: SDDU 问题挖掘报告 — 记录 web-cli-plugin v5「All-in-Next 聊天即操作台」（方案 G）的问题域、痛点、场景与事实证据，作为 spec 阶段的输入
> **前置依赖**: 无（工作流起点）；事实输入 = ① 作者主题指示（2026-09-21，逐字）+ 真机断流现场（23:12:51~23:12:59，逐字）② 设计基准 `packages/web-cli-plugin/design/ui-redesign/option-g-all-in-next.html`（定稿冻结，sha256 `a7c0a77a…`）+ `option-g-shim.mjs`（127/127 全绿，sha256 `d0107ecb…`）③ 作者 5 裁决（2026-09-21，已确认）④ 上游收口总账 `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v45-f-regularization/closeout.md`（F-31 / v4.5 终态 + 数字总账 + deferred）⑤ 仓库现状（分支 `feature/web-cli-plugin` @ `05f612e`，`packages/web-cli-plugin` 现行实现与门禁基线，本轮实测）⑥ 编排器代作者决策（2026-09-21 定稿确认：作者已授权编排器代行决策、全流程自行调度）
> **创建人**: SDDU Discovery Agent
> **创建时间**: 2026-09-22
> **版本**: v1.0
> **更新人**: SDDU Discovery Agent
> **更新时间**: 2026-09-22
> **更新说明**: 初始创建（web-cli-plugin v5「All-in-Next 聊天即操作台」/ 方案 G 问题挖掘）

web-cli-plugin v5「All-in-Next 聊天即操作台」问题挖掘报告 —— 把作者主题（**所有需要用户操作的地方都在 chat 里以 next 的方式闭环，不允许跳来跳去**）转成可验收的问题域：**新增法七（一切操作皆 Next，禁止死端）+ 法八（值不入流）**；核心问题 = 真机**死端**（未授权阻塞终态之后流内零可达 next）· 用户操作面**散落在设置视图 / options 页**（LLM 配置 / 授权 / 浏览器权限申请 / 撤销管理，chat 外才有入口）· 推荐器是**规则手写 + act 闭集 + 手分发 switch**（新增操作必须改主流程）· 敏感值**没有流内入口**（LLM Key 只能去设置页填）。

---

## 0. 立项来源、裁决与边界

> 本节记录立项的事实来源（作者指示 / 真机现场 / 设计定稿 / 作者裁决 / 编排器决策 / 仓库实测），供 spec 阶段追溯；不加入任何方案推断，不写需求条文。

### 0.1 作者立项记录（**原话逐字保留**）

| # | 作者原话（逐字） | 落地形态 |
|---|---|---|
| Q1 | 「所有的用户授权、权限申请、绑定、浏览器权限申请、LLM配置等，都要支持抽象成web-op-cli（类似LGDL的lgdl-web-op-cli），都要支持一站式在chat里面闭环」 | 设计稿 §③ **web-op 操作清单（首批 8 个 op）** + **NextProvider 插件注册表**（架构区 §①~§⑦） |
| Q2 | 「所有的下一步需要用户操作的地方，都要支持在chat里面以next的方式和用户交互完成，不允许让用户跳来跳去」 | 设计稿头注 **法七**「一切操作皆 Next，禁止死端」+ S2 断流样板（首验收）+ 死端对比表（死端 1 → 0） |

> **参照物事实（仓库内已存在，非引用外部）**：`lgdl-web-op-cli` 是 LGDL 仓库**既有独立包**（`packages/lgdl-web-op-cli`），是 LGDL 工作台的**UI 操作 CLI**（`OP_SUBCOMMANDS` 16 项：`copy-source` / `toggle-editor` / `export-svg` / `preview-click` / `next-actions` / `help` …；见 `docs/capability-matrix.md:19`、`test/parity/baseline-catalog.json:39,64`）。作者所说的「类似 lgdl-web-op-cli」= 把**插件自己**的操作（授权 / 权限 / 绑定 / LLM 配置）抽成同构的 **op 清单 + 统一管线**，而不是复用该包本身。

### 0.2 真机断流现场（**作者 2026-09-21 提供，逐字保留，不美化**）

```
23:12:51 ✓ 已绑定站点 https://open.bigmodel.cn，正在自动探测 web-cli 声明。
23:12:51 站点探测状态变化：已按相位变化登记（稳态不重复）｜正在自动探测…
23:12:51 下一步推荐：重新绑定当前标签页 / 重新拾取 / 改用描述
23:12:57 ✓ 已重新绑定当前标签页：https://open.bigmodel.cn
23:12:59 ✖ 页面侧不可用：未授权站点 https://open.bigmodel.cn：页面侧零注入
```

**断流根因（设计稿头注四层，逐条映射到仓库源码证据）**：

| # | 根因（设计稿逐字要点） | 仓库侧证据（本轮实测，`file:line`） |
|:-:|---|---|
| **R1** | 授权 chip 仅存在于 R-ONBOARDING（首装态）——非首装的未授权会话里，没有任何 provider 会给出「授权本站点」的推荐 | `src/ui/sidepanel/recommend.ts:296-307`：唯一带 `act:'authorize'` 的 chip 在 `onboarding` 规则内，谓词为 `input.onboarding.firstRun && pendingSteps.length > 0` ⇒ **非首装会话永不产出** |
| **R2** | risk-recovery 三动作（重绑 / 重拾 / 描述）无一能解除「未授权」——推荐看似给了出路，实际是三条死路 | `recommend.ts:208-214` `RECOVERY_CHIP_ORDER.site = ['rebind','repick','describe']`（无 `authorize`）；`:112-134` `activeRecoveryTrigger` 对 `site` 只在 `authorized === false` 时命中 ⇒ 卡片给出三条**不解除未授权**的动作 |
| **R3** | ✖ 错误行不带恢复入口 —— 错误行「裸奔」 | `src/ui/sidepanel/cards/error.ts:1-27`：`createErrorCard` 只渲染一个文本气泡（`bubble.textContent`），**零 chip / 零控件**；`stream-model.ts:129-140` 把 `error` 列入 `BORN_FROZEN_KINDS`（出生即冻结） |
| **R4** | 结果是死端：阻塞终态（未授权）出现后，流内不存在任何可达的 next | 综合 R1~R3：`未授权站点 …：页面侧零注入` 的事实来自 `src/background/service-worker.ts:2197`（`errorResponse`）→ `src/ui/sidepanel/pick-input.ts:189`（`state.unavailable = res.error`）→ `src/ui/sidepanel/l0/shell.ts:153-163` 渲染为**风险位一行**（`#l0-page-unavailable`），**无任何恢复入口**；另 `sidepanel.ts:1993` 的救援路径失败只 `dispatch({type:'notice'})`（一条告知，无 next） |

### 0.3 作者 5 裁决（**已确认，2026-09-21**；设计稿头注 ④ 逐字）

| # | 裁决 | 性质 |
|---|------|------|
| ① | **manifest 允许新增 `optional_permissions`**（运行时按需申请浏览器权限；**安装期权限不变**）——本稿以 `op.perm.request` 表达，权限项来自 `optional_permissions` | 定论（作者裁决） |
| ② | **敏感值掩码卡内输入 + 零明文留痕**（法八） | 定论（作者裁决） |
| ③ | **设计稿 F 式交互 HTML + shim 契约**（已定稿冻结；体例逐节镜像 F） | 定论（作者裁决，已完成） |
| ④ | **设置视图保留为管理面**（法六不变：chat 是入口之一，不是替代） | 定论（作者裁决） |
| ⑤ | **真机断流缺陷并入 G 首验收场景**（S2 = 断流样板，首验收） | 定论（作者裁决） |

**裁决 ⑧（作者 2026-09-21 反馈，逐字保留）**：「未授权 · 零注入」「已授权 · supported」这两项如果属于状态，那就放到最下面的状态栏，上面属于工具、菜单栏，不应该放这两个。→ 落地：授权态**下移状态栏常显 chip**；工具栏摘要只留 `origin · 会话`；四词在工具栏区零出现；风险 rail 的条件性「未授权」chip 并入该 chip（**零双写**）。

### 0.4 设计基准与冻结（**本轮实测 sha256 / 断言实跑**）

| 冻结对象 | 大小 / 行数 | sha256（本轮实测） | 机核状态 |
|---|---|---|---|
| `design/ui-redesign/option-g-all-in-next.html` | **273,621 B** / 4,308 行 | `a7c0a77ac6253e32d1ccef894f32eb8d0dc2d10c99f145261a69ebc699cc83c9` | **未入任何门禁**（见 §7.1 G） |
| `design/ui-redesign/option-g-shim.mjs` | **88,529 B** | `d0107ecbbd56edfe19592e256a66d27fb3d1c5c1a2d87c1773364f4520e609ce` | 实跑 **127 passed / 0 failed**（退出码 0）；`check(` 调用点 **127** 处 + 1 处 `function check(` 声明 |

> **口径声明**：本轮为 discovery，**未跑任何产品门禁 / 未跑 Chromium / 未构建**；唯一执行的程序是设计稿自带的 **Node DOM 垫片**（`node design/ui-redesign/option-g-shim.mjs`，零构建、零网络、零副作用、不改任何文件）——用途仅为核实「127 断言全绿」这一既有事实，**不构成产品运行时验证**。

**G 与 F 的关系（设计稿头注 ②，逐字要点）**：

- **继承** F 的 `:root` 设计令牌 / 组件样式语言 / 字体与滚动条口径 / 双主题切换器 / **三区骨架**（`header[role=toolbar] > main[role=log] > footer[role=contentinfo]`，结构语义与顺序逐字不变）/ **法一~法五**与密度口径（默认可点 = 工具栏 + 状态栏 ≤7）/ 卡类型学与固化契约。
- **G 新增两条法则（逐字）**：
  - **法七 一切操作皆 Next，禁止死端** —— 凡阻塞前进的终态（**未授权 / 未配置 / 权限缺失 / 绑定失效 / 引用全失效** 5 类），流内必须存在**可达的下一步动作**；错误行不裸奔（✖ 行必须**伴随或紧随**恢复 next；本稿取最严：**伴随 = 行内带恢复 chip**）。
  - **法八 值不入流** —— 敏感值（API Key 等）经**掩码输入卡**直达存储，流内只留「事实 + 时间戳」，digest / 审计**零明文**。与法二「留痕即事实」的切分：留痕的是**事实**（何时、哪个 op、成功与否、掩码长度），不是**值**。
- **修订（覆盖 F 的工具栏构成）**：F 的站点摘要 = `origin + 授权态`；G 把授权态**下移**状态栏常显 chip。
- **卡类型契约**：**12 kind = 7 主类 + 5 过程卡，零新增卡类型**；`askuser` **扩形**（`secret` 掩码 / `form` 表单）；操作回执**复用**既有固化区 + 系统行。
- **架构思想**：anything-is-plugin（`deepseek-ai/deepseek-harness`，**已 gh 核实**：`Everything is a Plugin.` / TypeScript / MIT / 基于 **Cordis** microkernel）——**NextProvider 契约 v2 七点** R1 可逆注册（disposer）· R2 依赖声明式（`deps ⊆ SERVICES`）· R3 优先级显式化（`priority`/`prepend`，覆盖按 id 定位整行）· R4 分发模式公开契约（`waterfall` 拦截改写 / `emit` 纯观测）· R5 失败语义分级（① 单卡边界捕获 ② 注册 loud ③ 改状态前快照回滚）· R6 Seam 三件套（Definition / Provider / Consumer）· R7 证明义务表（8 个 op 各一行 + 「新增 provider 只改注册表条目，`handleCardAction` 分发器 diff = 0」明示义务）。

**首批 8 个 web-op（设计稿架构区 §③ 逐字）**：`op.authorize`（低·可撤销，consent 必需）· `op.rebind`（低·幂等，无 consent）· `op.llm-config`（中·写凭据，params = 厂商 + 模型 + **API Key secret 掩码**，consent 必需，快照回滚）· `op.perm.request`（中·浏览器权限，params = **form 多选**，consent 必需 + 浏览器原生弹窗，快照回滚）· `op.revoke`（高·不可逆，params = 目标 choice，consent 必需 = 确认卡 + 不可逆说明，三表快照回滚）· `op.pick`（低·只读）· `op.describe`（低·只读）· `op.help`（低·只读）。

### 0.5 编排器代作者决策（2026-09-21 定稿确认；**已为定论，本报告直接作为约束记录，不重新讨论**）

| # | 决策 | 性质 |
|---|------|------|
| D1 | **作者已授权编排器代行决策、SDDU 全流程自行调度**（本轮及后续 spec/plan/tasks/build/review/validate 均按此口径） | 定论（作者授权，2026-09-21 定稿确认） |
| D2 | **Feature 目录 = `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v5-all-in-next/`**（承 v3-ui / v4-chat / v45-f-regularization 命名惯例：`v{代}-{主题}`；G = 第 5 代 UI 演进） | 定论 |
| D3 | **ROADMAP 编号 = F-32**；`F-29`（A2A 候选）保持原样不动、`F-30` / `F-31` 已用。**本轮实测复核：`F-32` 在 ROADMAP 中 0 命中**（见 §6.1） | 定论 + 本轮复核 |
| D4 | **版本位 = v0.10.0（新主题，非维护段）**；**本轮实测：`v0.10.0` 在 ROADMAP 中已存在 8 处命中（「AI 增强与生态」规划段，非 Feature 登记）** ⇒ 归属为**同版并列新主题**，登记留给收口（见 §6.2） | 建议（本轮冲突性已核验；登记留给收口） |
| D5 | **范围 = 法七无死端 + web-op 管线与 NextProvider 注册表 + 浏览器权限申请 / LLM 配置 / 撤销 流内闭环 + 授权态下移状态栏 + 可拖动宽度**（见 §1.3 范围表与 §1.4 非目标） | 定论 |
| D6 | **纪律：`.sddu/**` 只写本 Feature 目录；不改任何 `src/`、`test/`、`dist/`、`design/`、`docs/` 与 `ROADMAP.md`**（本轮为 discovery，零产品运行时验证） | 定论（本轮已遵守） |
| D7 | **设计稿已定稿冻结**（`05f612e` 三轮优化终稿 + 127 断言全绿）；本轮**不修改、不重排设计稿**，只做事实登记 | 定论（本轮已遵守） |

### 0.6 时间线一页（体积链 / 门禁链，供 spec 对齐口径）

| 时点 | 事件 | 与本 Feature 的关系 |
|---|---|---|
| v1（F-14）2026-09-12 | 插件基础 validated；`sidepanel.js` 基线 **266,500 B** | 体积链起点 |
| v2（F-27）2026-09-13 | any insight（连接树）：`1,132,748 B`（R2 收口） | 历史链 |
| v3（F-28）2026-09-17 | UI 渐进式披露（方案 E）：`266,500 → 362,777 B`；**V3-VOL-1**：自加硬上限撤销 → `record-only` | 体积判定公式来源 |
| v4（F-30）2026-09-20 | 聊天流统一承载（方案 F）：`266,500 → 479,021 B`；**V3-VOL-3 八步带值闭合**（`B_final = 465,000` / 档位 `ceilTo50KB = 512,000` / 绝对上限 `563,200 = 512,000 × 1.10`） | 绝对上限来源 |
| f-fidelity-fix 快修轮 2026-09-20 | FIX-1~FIX-4（授权 chip 直达 / 过时文案 / 工具栏 digest / kicker 收敛）；`479,021 → 480,026 B` | **授权 chip 单一入口先例**（`authorizeCurrentSite()`） |
| v4.5（F-31）2026-09-21 | F 还原度转正：5 条提示带单写化 + 4 宿主时间序化；`493,501 → 498,521 B`（ceiling **523,447**）；journey 保护段**第二次八步取代**（`supersessionChain` 3 链节） | **v5 的直接上游基线** |
| **v5（本轮起点）2026-09-22** | 本报告立项；方案 G 设计稿定稿冻结（`05f612e`） | — |

> **本轮实测复核（起点数字）**：`dist/sidepanel.js` = **498,521 B**（与 `test/size-baseline.ts:301 SIDEPANEL_BASELINE_BYTES = 498_521` 一致）；`dist/content.js` = **177,076 B**；`dist/pick-layer.js` = **33,900 B**；`main = 2ddc922`（未动）；工作树干净。

### 0.7 本阶段边界（discovery 职责声明）

- **负责**：挖掘问题、梳理问题、记录问题；输出问题清单 + 目标态描述 + 红线继承与显式取代清单 + 风险预登记 + 开放问题。
- **不负责**：不定义需求（不写「系统应支持 XXX」）、不分类 Must/Should/Could、不定义验收标准、不做方案评估与替代方案对比、不写 ADR、不排任务、不改代码。
- **本轮零产品运行时验证**：未跑 `npm test` / Chromium 门禁 / 构建；所有数字均来自**带 `file:line` 的源码、已入库产物与本轮只读实测**（§7.1 逐条给出），未自造实测值。唯一例外 = 设计稿 Node 垫片自检实跑（见 §0.4 口径声明）。

---

## 1. 问题定义

### 1.1 一句话问题陈述

> v4（方案 F）把「一切交互皆消息」做成了**行为**，v4.5 把流做成了**纯时间序**，但**「下一步」这件事仍然是不保证的**：真机上出现「未授权」阻塞终态之后，流内**不存在任何可达的 next**（✖ 行裸奔 + 推荐器的三动作无一路径可解除未授权 + 授权入口只在首装态）——即**死端**；同时**一半以上的「需要用户操作的地方」根本不经过 chat**（LLM 配置 / 浏览器权限申请 / 撤销与管理 / 绑定后的信任设置全部住在**设置视图 8 个分区**与 `options` 页），用户必须**跳来跳去**；而推荐器的实现形态（**规则手写 + `NEXTSTEP_ACTS` 6 项闭集 + `handleCardAction` 手写 switch 16 分支**）意味着**每新增一种操作都要改主流程**，「一站式在 chat 里闭环」在当前架构下无法扩张。

### 1.2 核心问题与业务影响

| 核心问题 | 业务影响 | 不解决的成本 |
|---------|---------|------------|
| **死端：阻塞终态之后流内零可达 next** | 真机 23:12:59 的「✖ 页面侧不可用：未授权站点 …」之后用户**无路可走**——不是「难用」，是**功能到此为止**；法七的「凡阻塞前进的终态必有可达 next」在现状下**不成立** | 每一次阻塞（未授权 / 未配置 / 权限缺失 / 绑定失效 / 引用全失效）都在流里留下一句没有出口的话；用户只有一个选择：**放弃或自己猜**（去设置页乱翻） |
| **用户操作面散落在 chat 之外（跳来跳去）** | LLM 配置在 `settings-llm`、站点授权在 `settings-auto-auth`、浏览器可选权限在 `settings-capabilities`、会话与分组在 `settings-sessions`、诊断在 `settings-diagnostics`，另有 `options.html` 独立管理页 ⇒ **chat 只承载了问答与授权两类**（v4 口径），其余操作必须**离开流** | 「一站式闭环」永远差一半；每新增一类操作就多一个「请去设置页」的指路，与作者主题**直接冲突**；操作留痕也断成两套（流内留痕 vs 设置页动作） |
| **新增操作必须改主流程（架构不可扩张）** | 推荐 chip 绑的是**动作字符串**（`data-act`，`cards/nextstep.ts:59`）而非**操作 id**；候选来自 **4 条手写规则**（`NEXTSTEP_PRIORITY`，`recommend.ts:52`）；点击分发是 **`handleCardAction` 的手写 switch**（16 个 `if` 分支，`sidepanel.ts:184-277`），最后还有一个「将在 v4-3 / v4-4 落地」的兜底告知（`:275`）⇒ **新增一个操作 = 改规则表 + 改闭集 + 改 switch + 改若干门禁** | 每加一个 op 成本线性上升，且**必然**有新死端（忘了加分支 = 假控件；忘了加规则 = 无入口）；「anything-is-plugin」的证明义务（分发器 diff = 0）在现状下**不可达** |
| **敏感值没有流内入口，法二与法八未切分** | LLM API Key 唯一的输入面是设置页 `#settings-apiKey`（`settings/panel.ts:153`，`type=password`）；流内**没有任何**敏感值输入形态（`askuser` 现只有 choice / text / confirm），也没有「值不入流」的零明文判据 | 「在 chat 里配置 LLM」无法实现；若硬把 Key 塞进流，会把**值**写进留痕（与法二正面对撞）⇒ 必须先有**法八**这条切分法则 |
| **授权态多处投影，入口还只在首装态** | 授权态现同时出现在：工具栏摘要（`view-model.ts:824,900` 的 `已授权 / 未授权` 与 `band.origin`）、风险位的条件性 `unauthorized` chip（`l0/risk-rail.ts:29-40`）、以及首装推荐卡（`recommend.ts:298-305`）⇒ 三处投影、零处常显可点；且**非首装未授权会话无任何授权入口**（R1） | 用户「看到」授权态却不理解哪里能改；核心问题 1 的 R1 根因直接由此产生；状态与工具语义混在工具栏（作者 ⑧ 反馈） |

### 1.3 v5 范围（**方案 G 的核心构成**）

| # | 项 | 性质 | 来源 | 目标态（**问题域描述，非需求**） |
|:-:|---|---|---|---|
| 核心 1 | **法七 无死端（禁止死端）** | 新法则 + 跨层（流 / 推荐 / 错误卡） | 作者 Q2 + 设计稿法七 + 真机 S2 | 5 类阻塞终态（未授权 / 未配置 / 权限缺失 / 绑定失效 / 引用全失效）在流内**必有可达 next**；`error` 过程卡**行内带恢复 chip**（✖ 行不裸奔）；死端判定 N = 0（同屏紧随） |
| 核心 2 | **web-op 统一管线 + NextProvider 插件注册表** | 架构（可扩张性） | 作者 Q1 + 设计稿架构区 §①~§⑦ | 每个 op = `{opId, 风险级, params?, consent?, execute, receipt}`；统一管线 **next chip →（参数? 流内 ask 卡）→（同意? 流内 auth 卡）→ execute → 流内回执**；候选由**注册表纯谓词**产生；**新增操作 = 注册插件，主流程 diff = 0**（契约 v2 七点全落） |
| 核心 3 | **浏览器权限申请流内闭环** | 新权限面 | 作者裁决① + 设计稿 `op.perm.request` | 浏览器权限从「设置页能力行」变为**流内可申请的 op**（form 多选 → consent 卡 → 浏览器原生弹窗 → 回执**批准/拒绝都固化**）；权限项来自 `optional_permissions`；**安装期静态权限不变**；浏览器侧不可逆性**如实说明**（回收须用户在浏览器确认） |
| 核心 4 | **LLM 配置流内闭环 + 法八 值不入流** | 新法则 + 新输入形态 | 作者裁决② + 设计稿 `op.llm-config` / 法八 | 掩码输入卡（`askuser` **扩形** `secret`）→ 值直达存储；流内只留「事实 + 时间戳 + 掩码长度」，`digest` / 审计**零明文**；改状态前快照 / 失败回滚 |
| 核心 5 | **授权态下移状态栏常显 chip** | 状态归属修订 | 作者 ⑧ 反馈 + 设计稿 §⑧ | 授权态全 UI **唯一常显载体 = 状态栏 chip**（黄 `未授权 · 零注入` / 绿 `已授权 · supported`）；黄态点击 → 流内产 `op.authorize` next 卡；绿态点击 → 管理详情（`op.revoke` / `op.rebind`）；**零双写**（风险 rail 的「未授权」chip 并入）；密度 **6 ≤ 7** 不破 |
| 核心 6 | **管理操作流内闭环（撤销 / 重绑）+ 设置视图保留管理面** | 高风险操作 | 作者裁决④ + 设计稿 `op.revoke` | 高风险操作（撤销）在流内以**确认卡 + 后果说明 + 回执**完成（不跳走）；**设置视图保留为管理面**（法六不变：chat 是入口之一，不是替代）；L2 台账**不复制状态**（站点行指向状态栏 chip） |
| 附带 1 | **可拖动侧栏宽度（280–640）** | 交互形态 | 设计稿 ② + 三轮优化 | 分隔条（ARIA `separator` + 键盘 ←/→ ±10 / Home / End / 双击复位 400）+ 密度**随宽度实时重算**；窄屏兜底改由 `#panel[data-narrow="true"]`（≤360px）触发；原三档宽度（320/400/520）radio **删除** |
| 附带 2 | **S2 断流样板 = 首验收场景** | 验收锚 | 作者裁决⑤ | 真机 23:12:51~23:12:59 序列在 G 稿内**逐环节可判**（死端 1 → 0）；5 个环节成为回归判据的形态（AC 形态见 O-ALLN-005） |

### 1.4 非目标（**明确排除**）

| 非目标 | 理由 |
|---|---|
| `src/content/**`（`content.js`）/ `pick-layer.js` | 字节冻结红线：`content.js` **177,076 B** / `pick-layer.js` **33,900 B**（v3 / v4 / v4.5 全程零触碰） |
| **A2A**（`F-29`） | 未立项未排期，**保持原样不动** |
| **12 kind 卡类型学**（含新增第 13 种卡） | 设计稿 §⑧ 明示**零新增卡类型**；`askuser` **扩形**（`secret` / `form`）与「回执复用固化区 + 系统行」都落在既有 taxonomy 内 |
| **三区法则本身**（法一~法五 / 工具栏 ≤5 可点 / 流唯一交互面 / 状态栏永不折叠） | G 继承 F，只在法七 / 法八**新增**两条；本 Feature 不改既有五法与三区结构 |
| `design/**` 与 `option-g-shim.mjs` 内容 | 设计稿已定稿冻结（D7）；改动需同时满足 127 断言并更新 sha 常量 + 台账（登记机制待 spec 裁决，O-ALLN-011） |
| **判定链**（`src/security/policy.ts` / `auto-authorize.ts`）与 `zeroDiffFiles` 冻结面 | 硬底线：判定链在 v3 台账 `zeroDiffFiles`（内容哈希 pin）；G 不碰安全判定 |
| **安装期静态权限**（`manifest.permissions` / `host_permissions` / `content_scripts`） | 作者裁决① 只放开 `optional_permissions`；静态安装面**零变化** |
| L2 视图**内部**（tree / commands / audit 三视图内容） | 不属本轮形态范围（除「设置视图保留管理面 / 台账不复制状态」的归属口径） |

---

## 2. 用户画像

> **口径声明（如实）**：本 Feature 的受影响用户 = **插件的唯一真实使用者（作者本人）+ 唯一决策者**，与 v3/v4/v4.5 同一事实基础。**本报告不编造用户调研数据**；「用户原话」栏引用作者既有指示与文档中保留的观测事实。

| 用户角色 | 典型场景 | 关键痛点（**原话 / 逐字事实**） | 当前应对方式 |
|---------|---------|-------------------|------------|
| **作者（唯一真实用户）+ 唯一决策者** | 真机侧栏：打开 `https://open.bigmodel.cn` → 绑定 → 自动探测 → 未授权 → ✖ | ①（本 Feature 母问题，逐字）「所有的下一步需要用户操作的地方，都要支持在chat里面以next的方式和用户交互完成，**不允许让用户跳来跳去**」②（本 Feature 母问题，逐字）「所有的用户授权、权限申请、绑定、浏览器权限申请、LLM配置等，都要支持抽象成web-op-cli…**一站式在chat里面闭环**」③（断流现场，逐字）「✖ 页面侧不可用：未授权站点 https://open.bigmodel.cn：页面侧零注入」之后**无任何可达 next** ④（⑧ 反馈，逐字）「『未授权 · 零注入』『已授权 · supported』这两项如果属于状态，那就放到最下面的状态栏，上面属于工具、菜单栏，不应该放这两个」 | 忍受 + 真机反馈驱动下一轮（**本轮把断流登记为首验收场景**） |
| **未来使用者（尚未存在，仅作推理边界）** | 非首装会话（已装插件、未授权新站点） | **R1 的直接受害者**：授权入口只在首装态存在 ⇒ 这类用户**根本没有授权入口**（不只是「多跳一次」） | 无（此角色尚不存在；**不得据此声称普适收益**——登记为假设 `A-ALLN-002`，标注「待验证」） |
| **下游维护者（AI Agent / 未来重构者）** | 需要回答「新增一种需要用户操作的入口，要改哪些文件？」 | 现状答案 = **规则表 + act 闭集 + `handleCardAction` switch + 若干门禁**（≥4 处），且门禁把 `NEXTSTEP_ACTS` **逐字 6 项**钉死（`local-act-wiring.test.ts:269`、`recommendation-sources.test.ts:281`） | 服从既有形态（即**扩张被现行架构锁死**） |

---

## 3. 问题清单

> 编号空间 `Q-ALLN-###`（ALLN = all-in-next）。核心 / 次要 / 潜在按「影响面 × 影响深度 × 影响频率」分级；每条标注信息来源。

### 3.1 核心问题

| ID | 问题描述 | 影响范围 |
|----|---------|---------|
| **Q-ALLN-001** | **死端：阻塞终态之后流内零可达 next（法七不成立）**。真机 23:12:59 的 ✖ 行之后，用户面对的是一个**没有出口的终态**：① **✖ 行裸奔**——`cards/error.ts:1-27` 的错误卡只渲染 `bubble.textContent`，**零 chip / 零控件**，且 `error` 属 `BORN_FROZEN_KINDS`（`stream-model.ts:129-140`）出生即冻结；② **推荐器给的三条动作无一路径可解除未授权**——`RECOVERY_CHIP_ORDER.site = ['rebind','repick','describe']`（`recommend.ts:212`），因为 `activeRecoveryTrigger` 只把 `site` 当作「有风险所以推荐恢复」，恢复动作表里根本没有 `authorize`；③ **授权入口不存在于该会话**——`act:'authorize'` 只在 `onboarding` 规则内（`:296-307`，谓词要求 `firstRun`）；④ 页面侧不可用的事实最终只落成风险位一行（`l0/shell.ts:153-163`，`#l0-page-unavailable`），**无恢复入口**；救援失败路径也只有一条 `notice`（`sidepanel.ts:1993`）。**佐证**：设计稿死端对比表第 2/3/4 行逐字判定「真机 = 死端」、G = 「有 next」。 | 全部阻塞场景（5 类）；影响深度 = **核心阻碍**（功能到此为止）；频率 = 每个未授权 / 未配置 / 权限缺失会话**持续复现** |
| **Q-ALLN-002** | **用户操作面散落在 chat 之外（跳来跳去）**。`SETTINGS_SECTION_IDS`（`settings/sections.ts:35-44`）8 个分区承载了几乎全部「需要用户操作」的面：`settings-llm`（LLM 配置，`panel.ts:130-179`：provider / apiKey / model / baseURL / maxRounds / 保存 / 测试连接 / 清除）· `settings-auto-auth`（站点与授权，`:193`）· `settings-tabs`（`:242`）· `settings-capabilities`（浏览器可选能力与撤销，`:261`）· `settings-sessions`（会话与分组，`:343`）· `settings-diagnostics`（`:370`）· `settings-compliance`（`:389`）· `settings-help`（`:412`，v4.5 追加）；另有独立管理页 `src/ui/options/index.html`（LLM Key / 能力撤销 / 合规说明）。`SettingsOps` 单口暴露 **17 个设置操作**（`settings/ops.ts:122-149`）。**chat 侧只有问答与授权两类**（v4 口径）⇒ 用户必须**离开流**才能配置、申请、撤销、诊断。**佐证**：作者 Q1/Q2 逐字（§0.1）；设计稿 F→G 变化点第 2 行：「F：授权 / 权限 / 绑定 / LLM 配置散落在页面与设置页，流只承载『问答与授权』」。 | 全部「配置类 / 管理类」场景；深度 = **明显痛点**（与作者主题正面冲突）；频率 = 持续 |
| **Q-ALLN-003** | **架构不可扩张：新增操作必须改主流程（anything-is-plugin 的证明义务在现状下不可达）**。三条耦合：① **候选来源 = 4 条手写规则**（`recommend.ts:52` `NEXTSTEP_PRIORITY = ['risk-recovery','ref-action','onboarding','capability-discovery']`），每条规则在 `candidateRules`（`:272-320`）内手写谓词与 chips；② **动作语义 = `NEXTSTEP_ACTS` 6 项闭集**（`recommend.ts:194`，逐字 `['next','repick','describe','authorize','rebind','help']`），且被门禁**逐字**钉死（`test/local-act-wiring.test.ts:269`、`test/recommendation-sources.test.ts:281`）；③ **点击分发 = `handleCardAction` 手写 switch**（`sidepanel.ts:184-277`，16 个 `if` 分支 + `:275` 的「将在 v4-3 / v4-4 落地」兜底告知）；chip 绑的是**动作字符串** `data-act`（`cards/nextstep.ts:59`），**不是操作 id**。⇒ 新增一个操作 = 改规则表 + 改闭集 + 改 switch + 改门禁（≥4 处），且遗漏任一处即产生**假控件 / 新死端**。 | 全部未来扩张；深度 = **核心阻碍**（架构天花板）；频率 = 每新增一类操作复现一次 |
| **Q-ALLN-004** | **敏感值没有流内入口，法二与法八未切分**。LLM API Key 的**唯一**输入面是设置页（`settings/panel.ts:153`，`type='password'` 的 `#settings-apiKey`）与 `options` 页；流内 12 kind 里**没有任何**敏感值输入形态（`askuser` 现只有 choice / text / confirm，`stream-model.ts:72-78`）。同时**没有「值不入流」的判据**——现有 digest / 审计 / 系统行**不存在**「敏感值零明文」的机核维度（`system-events.ts` 的净化面是针对 URL query / secret 形状 / raw markup 的抛错，属**输入拦截**，不等于**流内零明文的可核判据**）。 | LLM 配置 / 凭据类操作；深度 = **核心阻碍**（「在 chat 里配置 LLM」物理上不成立）；频率 = 持续 |
| **Q-ALLN-005** | **授权态多处投影，且非首装会话无授权入口**。授权态现出现在 ① 工具栏摘要（`view-model.ts:824` `const auth = input.authorized ? '已授权' : '未授权'` + `:900` 的 `band.origin` 文案）② 风险位条件性 chip（`l0/risk-rail.ts:29-40` 的 `unauthorized` 类 + `badge:'未授权'`）③ 首装推荐卡（`recommend.ts:298-305`）。⇒ **同一状态三处投影、零处常显可点**；且 ③ 只在首装存在（= Q-ALLN-001 的 R1 根因）。**佐证**：作者 ⑧ 反馈逐字（§0.3）；设计稿「授权态的归属（修订）」逐字：「授权态在本稿只有**一个常显载体** —— 状态栏常显 chip」、「四词在**工具栏区零出现**」。 | 全部会话；深度 = **明显痛点**（状态语义混乱 + 入口缺失）；频率 = 持续（状态恒显） |

### 3.2 次要问题

| ID | 问题描述 | 影响范围 |
|----|---------|---------|
| **Q-ALLN-006** | **浏览器权限申请无处可申请（流内）。** 可选能力（`bookmarks` / `downloads` / `notifications` / `clipboardRead` / `clipboardWrite`）的**申请手势只在设置视图**：`src/platform/capability-permissions.ts`（`requestCapabilityPermissionOnGesture`）+ `src/ui/settings/panel.ts`（`requestCapability(row)`）为唯一手势路径（门禁 `test/capability-wiring.test.ts:51-58` 明确「SW 永不调用 `.request(`」）；`SettingsOps.revokeCapability` / `setCapabilityPrivacy` 提供撤销与隐私开关。⇒ 想「在 chat 里申请浏览器权限」当前**没有任何入口**。 | 权限申请 / 撤销；深度 = 明显痛点；频率 = 偶发（需要该能力时） |
| **Q-ALLN-007** | **撤销 / 管理操作在流内无闭环。** 撤销当前分布在三处：`settings-capabilities`（`revokeCapability`，`chrome.permissions.remove`）、`settings-auto-auth`（`clearAutoAuth`）、连接树 `tree-view.ts:549`（站点级「已授权站点（可撤销授权）」）。流内**没有任何**撤销 / 高风险确认的 op 形态（v4 的 `auth` 卡只承载授权批准 / 拒绝，不含「撤销」这一不可逆语义）。 | 管理操作；深度 = 明显痛点（高风险操作缺流内确认与留痕）；频率 = 偶发 |
| **Q-ALLN-008** | **真机断流无法回归（无判据）。** 真机序列（23:12:51~23:12:59）当前**没有任何门禁 / 判据**能表达它：`test/ui/journey.mjs` 覆盖保护段与卡族，但**不存在**「阻塞终态之后 N=0 秒内流内必须有 next」这条判据；`test/ui/recommendation.mjs`（59 断言）覆盖推荐卡生产路径但**不覆盖「阻塞后有可达 next」**。⇒ 修了也可能再退化（无回归闸门）。 | 验收面；深度 = 明显痛点（判据缺失 = 缺陷可复发）；频率 = 持续 |
| **Q-ALLN-009** | **`error` 卡的「只追加 / 出生冻结」契约与「行内带恢复 chip」正面冲突。** `error` 在 `BORN_FROZEN_KINDS` 内（`stream-model.ts:129-140`），语义是「历史行、永不被 patch、除 bound 外不移除」；而法七要求 ✖ 行**行内**带恢复 chip（即卡内**有**可点控件，且可能在终态后**追加状态**）。⇒ 需要 spec 显式裁决「行内恢复」落在哪一层（卡壳 / 行内控件 / 紧随卡），且不得破坏冻结语义（O-ALLN-009）。 | `error` 卡契约 + stream 门禁（63）；深度 = 中；频率 = 一次性（本轮） |
| **Q-ALLN-010** | **设置视图（管理面）与 chat（操作面）之间的「单一执行入口」纪律缺位。** 裁决④ 保留设置视图 ⇒ 同一操作将**同时**存在两个入口（chat 的 op next + 设置页按钮），这正是 v4.5 刚清理掉的「双写」风险的同构形态（v4.5 教训：`#l0-receipt-summary` 退役清单与产品铸造点自相矛盾 ⇒ 判据时点依赖）。若两入口各自实现执行路径，必然漂移（FIX-1 的先例正是把 `#authorize` 的权限流抽成**单一入口** `authorizeCurrentSite()`）。 | 全部 op 的执行面；深度 = 中高（架构纪律）；频率 = 每个 op 一次 |

### 3.3 潜在问题

| ID | 问题描述 | 影响范围 |
|----|---------|---------|
| **Q-ALLN-011** | **体积余量只有 24,926 B，本 Feature 体量远超前几轮。** `sidepanel.js` 现 **498,521 B** ≤ 生效上限 **523,447 B**（= `floor(498,521 × 1.05)`）⇒ 余量 **24,926 B（+5.00%）**；距档位 **512,000 B** 余量 **13,479 B**；距绝对上限 **563,200 B** 余量 **64,679 B**。而 v5 要新增：注册表 + 8 个 op 执行器 + 掩码 / 表单卡扩形 + 状态栏常显 chip + 可拖动宽度（分隔条 + clamp + `data-narrow`）——**远超 24,926 B 的可能性很高**（v4 段单轮最差相邻对 +22.96%）。⇒ 触发五要素重登记 + V3-VOL-3 同源前移 + 档位可能上调（`authorConfirmation.status = pending-author-line` 保持，不得伪称已确认）。 | 体积门禁 + V3-VOL-3 三值同源 + 作者占位；深度 = 中高（可管理但**必须预算评估**）；频率 = 每轮 |
| **Q-ALLN-012** | **`content.js` 零余量与「op-* 消息族」的通路冲突。** `PluginMessageKind` / `KIND_SET` 定义在 `src/background/messaging.ts`（`:103-141`），而 **`content-script.ts:20` 直接 import 该模块** ⇒ 该模块被 **打进 `content.js`**（`build.mjs:58-66` 注释逐字：「folded into `content.js`, whose 177,076 B budget has zero headroom」）；历史上往 `KIND_SET` 加 6 个字符串曾实测 **+307 B**（`content/pick-protocol.ts:9-15` 逐字）。⇒ G 新增 `op-*` 消息族若进 `KIND_SET`，**直接撞 content.js 红线**；必须走既有先例（`command-policy` / `pick-layer-*` / `ref-rescue` 家系：**type-only，不进 KIND_SET，运行时校验落独立模块**，`messaging.ts:68-89`）。 | content.js 红线 + SW/面板协议；深度 = 中高（红线，但**有现成先例**）；频率 = 一次性 |
| **Q-ALLN-013** | **`design-contract` 门禁只冻结 F，G 稿 127 断言「不在任何门禁内」（契约真空）。** `test/design-contract.test.ts:60-73` 只解析 `option-f-shim.mjs` / `option-f-chat-stream.html`（`SHIM_CHECK_CALLS = 60`、`DRAFT_SHA256` / `SHIM_SHA256`），`docs/v4-supersession-ledger.json:8121 designContractChanges = []`。G 稿（273,621 B / 127 断言）**未被任何门禁引用**（仓库实测 `grep -rn option-g test/ src/ docs/` = **0 命中**）⇒ 若实现偏离 G 稿，**机器上不可发现**。 | design-contract（6）+ 设计契约登记机制；深度 = 中高（治理真空）；频率 = 一次性 |
| **Q-ALLN-014** | **可拖动宽度会改写密度测量口径。** 现密度口径基于**三档视口**（320 / 400 / 520，见 `docs/v4-density-baseline.json#tiers` 与 v4.5 的 31 登记格）；G 稿**删除**三档 radio，改为 **280–640 连续宽度** + `#panel[data-narrow="true"]`（≤360px）触发窄屏兜底。⇒ 31 登记格是否需要重算 / 是否新增「宽度无关性」判据 / `journey` 的三视口结构断言（320/400/520）是否需要扩展为连续口径——**两读法并存，必须由 spec 以 Chromium 实测裁决**（禁止按未验证断言排工作量）。 | density（232）+ l0（244）+ journey（171）；深度 = 中；频率 = 一次性（本轮） |

---

## 4. 竞品参考

### 4.1 外部竞品调研状态：🟠 **本轮未执行（如实登记，不编造结论）**

本 Feature 的架构对标物已在设计稿阶段**由作者指示完成 gh 核实**（`deepseek-ai/deepseek-harness`：描述 `DeepSeek Harness: Everything is a Plugin.` / TypeScript / MIT / 基于 Cordis microkernel；三条引用原文含出处文件名）。**除此之外未做外部竞品调研**（如「聊天式 agent 面板如何组织授权 / 权限 / 密钥配置」）。

> **不得**据此声称「竞品也这么做」或「无竞品这么做」。若 spec/plan 认为需要更广的外部参照，应显式登记为待调研项（§7.4 O-ALLN-012）。

### 4.2 仓库内可比参照（**事实，可核验；非竞品**）

> 本节只记录「本仓库已存在、已验收、可复用」的机制先例——它们是**事实**，不是推荐方案。

| 参照 | 事实 | 与 v5 的关系（只述差异，不评优劣） |
|---|---|---|
| **`@lgdl/lgdl-web-op-cli`（LGDL 工作台的 UI 操作 CLI，既有包）** | `OP_SUBCOMMANDS` **16 项**（`copy-source` / `toggle-editor` / `export-svg` / `preview-click` / `preview-hover` / `list-examples` / `next-actions` / `help` …），语义 = **UI 操作（与手动点击等效，绝不写源码）**；作为**站点声明工具**暴露（`site_lgdl-web-op-cli`，页面 RPC）；见 `docs/capability-matrix.md:19`、`test/parity/baseline-catalog.json:39,64`、`.sddu/docs-tree-root/核心引擎/web-ai助手.md:164-169` | 作者 Q1 的**参照物**：**「把操作抽成 op 清单 + 统一分发」这条路在 LGDL 侧已经跑通**（站点侧）；v5 是把它搬到**插件自身**（授权 / 权限 / 绑定 / LLM）。差异：LGDL 侧 op 是**页面 RPC**（无 consent / 无诚实权限约束），插件侧 op 涉及**权限 / 凭据 / 不可逆撤销** ⇒ 必须带 consent / 快照回滚 / 浏览器权限不可逆性说明 |
| **`authorizeCurrentSite()` 单一入口（f-fidelity-fix 轮，`sidepanel.ts:334-352`）** | 授权流从 `#authorize` 监听器内抽成**具名单一生产入口**，设置页按钮与推荐 chip **两处都调它**（`test/authorize-chip-wiring.test.ts` 断言单一调用点 / 零回合 / 不受 `pending` 门控）；`NEXTSTEP_ACTS` 因此扩为 4 项 | v5 的 `op.authorize` 是同一思想的**注册表化**版本；`Q-ALLN-010`（双入口纪律）直接复用该先例：**一个 op 一个执行入口** |
| **`system-events.ts` 单系统事件通道（v4-4）** | `appendSystem(kind, text, ts)`：①净化（`assertStreamPlaintext`：URL query / secret / 命令参数体 / raw markup 抛错）②去重窗口 `5000 ms` ③速率上限 `20 行/分钟` ④追加（`BORN_FROZEN`）；`STRIP_CHANNEL_KINDS` 逐条绑定通道→kind | **法八的现有防线**：净化面能拦「把 secret 形状塞进文本」，但**不等于**「零明文可核判据」（`Q-ALLN-004`）；G 的回执 / digest 走同一通道，需在此之上加「值不入流」判据 |
| **`askuser` / `auth` 终态机（v4-3，`stream-model.ts:86-121,368-478`）** | ask / auth 卡的「进行中 → 已结算」迁移、6 个终态（`answered/cancelled/approved/rejected/invalidated/completed`）、`MAX_OPEN_ASKS = 2` 仲裁、`ASK_CANCEL_REASONS` 4 项闭集 | op 管线四态（next → params → consent → execute → receipt）**全部可落在既有 ask / auth / tool / command / system 卡上**（设计稿 §⑧：零新增卡类型）；`secret` / `form` 是 `askuser` 的**扩形**而非新 kind |
| **`view-host` 视图替换机制（v3-3 / ADR-V3-025 / ADR-V4-022）** | `#view-host` 是 `#stream` 的**兄弟节点**；打开视图即 `hidden` 掉 `#stream`；同一时刻恰一个 `[data-l2-view]` 可见 | 裁决④ 的「设置视图保留管理面」**有现成机制**；但 `#view-host` **不在**密度豁免子树内（`density-scope.ts:38` 只豁免 `#stream`）⇒ 管理详情若落此面会进入密度预算（`Q-ALLN-014` 相关） |
| **`host-registry.ts` 零宿主判据（v4.5 后，`host-registry.ts:105`）** | `REGISTERED_STRUCTURAL_HOSTS = []`（v4.5 清零）；`RETIRED_HOST_IDS`（`:200`）与 `MIGRATED_CONTAINER_IDS`（`:187`）维持「任意深度零 `[data-host]` / `[data-transitional-host]`」 | v5 新增状态栏 chip / 分隔条**不在流内** ⇒ 零宿主判据**应保持**；但若 op 管线引入流内固定容器会**直接违反** v4.5 刚建立的判据（须 spec 显式裁决） |
| **取代台账机制（`docs/v4-supersession-ledger.json`）** | 八步取代（①记录 old ②逐段决策 ③同编号等价改写 ④登记 `modifiedRanges[]` ⑤计算并写入新 pin ⑥计数守恒 ⑦`redlineRemap[]` ⑧RP-V4-08 反证）；`supersessionChain` **3 链节**（`6b45c3fa… → e2b500df… → cc79f413…`）；`knownGap` 由 `test/supersession-ledger.test.ts` **机核强制** | v5 若改动流结构 / 状态栏结构 ⇒ 可能触发**第三次八步取代**（`R-ALLN-010`） |
| **设计契约冻结机制（`test/design-contract.test.ts`）** | 双 sha 冻结 + `SHIM_CHECK_CALLS = 60` + `ASSERTION_MAP` 60 行 + 「断言 id 集必须 == 从 shim 抽出的 id 集」+ 卡分类学逐字 | G 稿入契约**有现成机制**（`Q-ALLN-013` / O-ALLN-011）；改动必须同时更新常量 + 计数 + 映射表 + `designContractChanges` 登记 |

---

## 5. 假设与风险

### 5.1 关键假设

| # | 假设内容 | 验证方式 |
|---|---------|---------|
| **A-ALLN-001** | 5 类阻塞终态在现状下**没有一类**已有可达 next（法七的缺口是全面的，不只是「未授权」一例） | 逐类核对：未授权（`pick.unavailable` + `RECOVERY_CHIP_ORDER.site`，已证）/ 未配置 LLM（**无任何推荐规则**，`NEXTSTEP_PRIORITY` 4 规则不含 LLM，已证）/ 权限缺失（`capability-wiring` 只在设置页，已证）/ 绑定失效（`binding.stale` provider 在设计稿有，**实现侧当前未见** ⇒ 待 spec 复核）/ 引用全失效（`ref.stale` 有卡但卡内恢复是否覆盖「全失效」待复核）——**部分待验证** |
| **A-ALLN-002** | 非首装未授权会话是**真实存在**的用户路径（当前唯一用户是作者，尚无该路径的真机反馈） | 作者确认（一行）；本报告**不据此声称普适收益**——标注「待验证」 |
| **A-ALLN-003** | `op-*` 消息族可用**既有 type-only 先例**落地，不增长 `content.js` 一个字节 | 复跑 `npm run build` + `stat -c %s dist/content.js` == 177,076 B + sha 逐字节命中；`test/content.test.ts` / `pick-layer-budget.test.ts` 复跑——**待验证**（Q-ALLN-012） |
| **A-ALLN-004** | 在 `optional_permissions` 里**新增或沿用**权限项不会改变安装期静态面，且能通过既有门禁的等价改写 | `test/capability-wiring.test.ts:26-29` 静态集合逐字 + `:35-38` 可选集合逐字 + `binding-wiring.test.ts:50-58` + `auto-session-wiring.test.ts:81-94` 全绿；**待验证**（门禁判据须等价改写，不是放宽） |
| **A-ALLN-005** | NextProvider 注册表可**取代**（而非并存）现有 4 规则 + `NEXTSTEP_ACTS` 6 项闭集 + `handleCardAction` switch，且门禁可等价重锚 | 逐条对账 `test/recommendation-sources.test.ts`（源白名单 7 项 / 规则表 / 闭集逐字）+ `test/local-act-wiring.test.ts`（闭集同源 + 本地 act 槽）+ `test/authorize-chip-wiring.test.ts` + `test/ui/recommendation.mjs`（59 断言）——**待验证**（取代面是 v5 最大的门禁迁移） |
| **A-ALLN-006** | 法八的「流内零明文」可**机核**（哨兵值扫描 `#stream` / 审计面 / digest / 全部元素属性） | 设计稿 shim §E 组已有同构判据（哨兵 → 提交 → 扫描零命中 + digest 含 `••••••`）；实现层需 spec 给出等价判据 + 对抗反证——**待验证** |
| **A-ALLN-007** | 状态栏常显 chip 与「风险 rail 零双写 / 状态栏永不折叠 / 密度 6 ≤ 7」三者可同时成立 | `statusbar.ts` 现为**单一写入者**结构（J1~J4 机核）；新增 chip 需明确归属（新 DOM vs 复用 `#risk-chips`）——**待验证**（O-ALLN-006） |
| **A-ALLN-008** | 可拖动宽度（280–640 连续）不破坏 31 登记格与三视口断言（或可等价重锚） | Chromium 实跑 `npm run test:density` / `test:l0` / `test:ui` 前后对比；**禁止沿用未验证断言排工作量**（Q-ALLN-014 / O-ALLN-007） |
| **A-ALLN-009** | 体积在**单轮容差 5%（24,926 B）**内可完成，或可走显式重登记把档位 / 上限前移 | `npm run build` + `stat -c %s dist/sidepanel.js` + 逐模块 metafile 归因（五要素重登记）+ `test:size-ruling-vol3` 算术机核——**待验证**（Q-ALLN-011） |
| **A-ALLN-010** | 本轮 `.sddu/**` 只写本 Feature 目录、`src/` `test/` `dist/` `design/` 零改动，不影响任何既有门禁 | `git status --short` + `git diff --quiet -- packages/web-cli-plugin` 复核（本轮已遵守） |

### 5.2 主要风险（**Top5 见 §5.3；本条为全量登记**）

| # | 风险描述 | 影响程度 | 预登记证据 / 应对方向（**不作方案承诺**） |
|---|---------|:--:|---|
| **R-ALLN-001** | **体积越限**：余量仅 **24,926 B（+5.00%）**，距档位仅 **13,479 B**；本 Feature 新增面远超前几轮单轮增量 ⇒ 极可能触发重登记并可能需**上调档位**（`authorConfirmation.status = pending-author-line` **不得伪称已确认**） | **高** | `test/size-budget.test.ts:53`（`523447`）+ `test/size-baseline.ts:301`（`498_521`）+ `docs/v4-supersession-ledger.json#v3Vol3Closeout`（档位 512,000 / 绝对上限 563,200）+ `test/size-growth-evidence.test.ts`（逐模块 Σ + glue == 增量） |
| **R-ALLN-002** | **`content.js` 红线通路**：`op-*` 消息族若进 `KIND_SET` 会增长 `content.js`（历史 +307 B / 6 字符串，且**零余量**） | **高** | `src/background/messaging.ts:68-89`（type-only 先例）+ `src/content/pick-protocol.ts:9-15`（实测 +307 B）+ `build.mjs:58-66` + `test/content.test.ts` / `pick-layer-budget.test.ts` |
| **R-ALLN-003** | **权限面安全评审 + manifest 判据精确集合**：`test/capability-wiring.test.ts:26-29` 静态集合逐字 `['activeTab','scripting','sidePanel','storage','tabs']`、`:35-38` 可选集合逐字 5 项、`:50` `host_permissions.length === 6`、`:51` 「SW 永不 `.request(`」；新增 / 改动 optional 项须**等价改写判据**（不是放宽）+ 最小集论证 | **高** | 同上 + `test/binding-wiring.test.ts:50-58` + `test/auto-session-wiring.test.ts:81-94` + 设计稿「已知取舍」逐字（`op.perm.request` 只能申请、回收须用户在浏览器确认） |
| **R-ALLN-004** | **注册表取代既有推荐器**：`recommend.ts` 的 4 规则 + `NEXTSTEP_ACTS` 6 项逐字闭集 + `handleCardAction` 16 分支 switch + 源白名单 7 项，牵动 `test/recommendation-sources.test.ts` / `test/local-act-wiring.test.ts` / `test/authorize-chip-wiring.test.ts` / `test/ui/recommendation.mjs`（59）——「建议迁移量」**最大**；且取代与并存两种读法的门禁面完全不同 | **高** | `recommend.ts:52,59-74,98-105,194,208-224,272-320` + `sidepanel.ts:184-277` + `cards/nextstep.ts:59` + 上述四个门禁 |
| **R-ALLN-005** | **design-contract 契约真空**：G 稿与 127 断言**不在任何门禁内**（`option-g` 在 `test/` `src/` `docs/` 零命中）；若不入契约，实现偏离设计稿**机器不可发现** | **高** | `test/design-contract.test.ts:60-73`（只冻 F）+ `docs/v4-supersession-ledger.json:8121 designContractChanges = []` + `design-contract` 门禁 6 断言 |
| **R-ALLN-006** | **`error` 卡「出生冻结」契约冲突**：法七要求 ✖ 行**行内**带恢复 chip，而 `error ∈ BORN_FROZEN_KINDS`（只追加、不 patch） | **中高** | `stream-model.ts:129-140` + `cards/error.ts:1-27` + `test/ui/stream.mjs`（63）+ 设计稿「法七验收口径」逐字 |
| **R-ALLN-007** | **状态栏授权 chip 的归属与双写面**：`statusbar.ts` 现为**单一写入者**（J1~J4），授权态同时存在于工具栏摘要（`view-model.ts:824,900`）与风险 rail（`risk-rail.ts:29-40`）；下移 = 至少 3 处改口径 + 零双写判据 | **中高** | `statusbar.ts:1-70` + `view-model.ts:824,894-902` + `l0/risk-rail.ts:29-40` + `l0/shell.ts:115-172` + `test/ui/l0.mjs`（244）/ `density.mjs`（232） |
| **R-ALLN-008** | **「值不入流」的实现层可核性**：法八要求 digest / 审计 / 流内**零明文**，需哨兵扫描 + 对抗反证（v4.5 教训：**反证恒绿**的三类缺陷——模板字面量语法错 / Trusted Types 下注入静默落空 / 断言口径过窄） | **中高** | `system-events.ts`（净化面）+ `stream-digest.ts`（digest）+ `stream-plaintext.ts`（`label()` 密钥形状抛错）+ v4.5 closeout §4 第 6 条 |
| **R-ALLN-009** | **密度口径变更（三档 → 连续宽度）**：31 登记格 / 三视口断言 / `data-narrow` 判据 / `STREAM_HEIGHT_RATIO_MIN = 0.65`（只允许上调）可能连锁 | **中** | `docs/v4-density-baseline.json#tiers / #counts / #streamRatioSpike` + `density-scope.ts:29-60` + `test/ui/density.mjs` + `journey #15b` |
| **R-ALLN-010** | **保护段第三次取代**：journey 保护段现 pin `43054..58287` / sha `cc79f413…` / **240 行**（`supersessionChain` 3 链节）；binding `107780..115930` / sha `be9ad0e9…`（`decision = keep`）。若 v5 改动流或状态栏结构 ⇒ 可能需第三次八步取代 + `redlineRemap[]` 追加 + 计数守恒 | **中高** | `docs/v4-supersession-ledger.json#protectedRanges` + `test/supersession-ledger.test.ts`（35）+ `test:supersession` |
| **R-ALLN-011** | **零宿主判据的守门**：v4.5 刚把 `REGISTERED_STRUCTURAL_HOSTS` 清零并要求「任意深度零 `[data-host]`」；op 管线 / 恢复卡若引入流内固定容器即违反 | **中** | `host-registry.ts:105,187,200` + `test/host-registry.test.ts` + `test/ui/l0.mjs`（零宿主断言） |
| **R-ALLN-012** | **双入口漂移**（chat op 与设置页 ops 并存）：同一操作两条执行路径 ⇒ 行为 / 留痕漂移（FIX-1 先例的反面） | **中高** | `settings/ops.ts:122-149`（17 个设置操作）+ `sidepanel.ts:334-352`（单一入口先例）+ `test/authorize-chip-wiring.test.ts` |
| **R-ALLN-013** | **断言只增的门禁规模**：24 门禁基线（`npm test` **1045** · l0 **244** · density **232** · journey **171** · stream 63 · ask-auth 61 · recommendation 59 · page-input 108 · binding 192 · insight 116 · …）**只增不减**；本 Feature 新增判据会叠加大批量断言 + 可能的等价重锚 | **中** | v4.5 closeout §3.1（24/24 独立复跑全绿）+ §4 第 7 条（保护段 1 字节注入必红） |
| **R-ALLN-014** | **真机浏览器权限弹窗 headless 不可合成**（`chrome.permissions.request` 在 headless 下 `PENDING_TIMEOUT`，v2/v3 已登记同类缺口）⇒ 首验收的 S2 场景中「浏览器原生弹窗」一环只能人工验收 | **中** | v2 收口人工面 `T1 缺口`（tree 侧撤销成功路径）+ v3/v4.5 人工面清单（`⏳ 未执行` 不冒充 PASS） |
| **R-ALLN-015** | **串行门禁纪律 + 既知环境性 flake**（`KL-N-10`：`test:binding` 首轮偶发红且每次失败项不同；`test:ui #54g`）：重构轮会被误读为回归 | **低** | v4.5 closeout §5 deferred 1 + `docs/v4-supersession-ledger.json#knownLimitations`；纪律 = 隔离复跑 ≥2 / 日志全量 / 仍红如实记录不阻塞 |
| **R-ALLN-016** | **`optional_permissions` 最小集论证缺位**：若新增权限项，需论证「最小必要」且不引入新安全面；设计稿只以「权限项来自 `optional_permissions`」表达，未锁定清单 | **中** | 设计稿 `op.perm.request` 行（params = 权限项 form 多选）+ 作者裁决① + `test/capability-wiring.test.ts` |

### 5.3 风险预登记摘要（**Top5 + 门禁迁移量估计**）

> 口径：以下计数为**静态引用规模**（本报告逐条 `file:line` 给出的证据规模），用作**工作量上界**参考；**不是**「要改的断言数」（等价重锚可能一条多改）。**discovery 不做估算承诺**。

**Top5（按「阻塞程度 × 影响面」排序）**：

| 序 | 风险 | 为什么是 Top5 |
|:-:|---|---|
| 1 | **R-ALLN-004 注册表取代既有推荐器** | 决定 v5 是「新增层」还是「重构层」；牵动 4 个门禁 + 主流程 3 处（规则 / 闭集 / switch）；若读法错，工作量差一个量级 |
| 2 | **R-ALLN-002 + R-ALLN-003 消息族与权限面红线** | 两条都是**零容差红线**（`content.js` 177,076 B 零余量 / 静态安装面零漂移），且都有**现成先例可循**（type-only 家系 / 可选权限模型）——但判据必须**等价改写** |
| 3 | **R-ALLN-001 体积越限** | 余量 24,926 B 对「8 op + 注册表 + 掩码卡 + 状态栏 chip + 拖动宽度」**明显偏紧**；越限即触发 V3-VOL-3 重登记 + 作者占位义务 |
| 4 | **R-ALLN-005 design-contract 契约真空** | 设计稿是本轮唯一权威基准（作者已定稿冻结），却**不在门禁内** ⇒ 「设计-实现一致」当前无机器证据 |
| 5 | **R-ALLN-006 + R-ALLN-007 两条契约冲突面** | `error` 出生冻结 vs 行内恢复 chip；状态栏单写者 vs 授权态下移 —— 两处都是「看起来小、判据上大」的契约改动 |

**门禁迁移量估计（静态引用规模）**：

| 组 | 对象 | 涉及门禁文件数 | 主要门禁 |
|---|---|:--:|---|
| 推荐器 / 注册表 | `recommend.ts`（4 规则 / 6 act 闭集 / 源白名单 7 / 3 常量）+ `handleCardAction`（16 分支）+ `cards/nextstep.ts`（`data-act`） | **4~6** | `recommendation-sources.test.ts` / `local-act-wiring.test.ts` / `authorize-chip-wiring.test.ts` / `test/ui/recommendation.mjs`（59）/ `test:ref-pick-wiring`（11） |
| 权限面 | `manifest.json`（静态 5 / 可选 5 / host 6 / `optional_host_permissions`）+ `platform/capability-permissions.ts` + `settings/panel.ts` | **4** | `capability-wiring.test.ts` / `binding-wiring.test.ts` / `auto-session-wiring.test.ts` / `test/ui/binding.mjs`（192） |
| 消息族（红线） | `background/messaging.ts`（`PluginMessageKind` / `KIND_SET` / `makeMessage`）+ `content-script.ts` 的 import 边 | **3** | `content.test.ts` / `pick-layer-budget.test.ts` / `insight-protocol.test.ts`（同源先例） |
| 流 / 卡契约 | `stream-model.ts`（12 kind / `BORN_FROZEN_KINDS` / 6 终态）+ `cards/error.ts` + `cards/askuser.ts`（扩形） | **4~5** | `test/ui/stream.mjs`（63）/ `ask-auth-inflow.mjs`（61）/ `host-registry.test.ts` / `test/ui/l0.mjs`（244） |
| 状态栏 / 密度 | `statusbar.ts` + `l0/risk-rail.ts` + `view-model.ts`（`:824,900`）+ `density-scope.ts` | **5~6** | `test/ui/density.mjs`（232）/ `l0.mjs`（244）/ `journey`（171）/ `density-thresholds.test.ts` |
| 设计契约 | `test/design-contract.test.ts`（双 sha + `SHIM_CHECK_CALLS` + `ASSERTION_MAP`）+ `docs/v4-supersession-ledger.json#designContractChanges` | **2** | `test:design-contract`（6） |
| 保护 pin | journey `43054..58287` / `cc79f413…` / 240 行；binding `107780..115930` / `be9ad0e9…`（keep） | 2 段 | `supersession-ledger.test.ts`（35，八步 + RP-V4-08 + `knownGap` 机核） |
| 体积链 | `SIDEPANEL_BASELINE_BYTES=498_521` / ceiling `523_447` / `RE_REGISTRATIONS` / `GROWTH_BREAKDOWN` / `PENDING_ABSOLUTE_CAP` | 4 | `size-budget.test.ts` / `size-growth-evidence.test.ts` / `size-ruling-vol3.test.ts`（12） |
| 冻结红线 | `dist/content.js` 177,076 B / `dist/pick-layer.js` 33,900 B / `zeroDiffFiles`（policy.ts / auto-authorize.ts / options/index.html 等 9 项） | 3 | `content.test.ts` / `pick-layer-budget.test.ts` / `test:zero-injection`（27） |

---

## 6. 下一步建议

| 优先级 | 事项 | 说明 |
|--------|------|------|
| 高 | **先裁决 §7.4 的开放问题（O-ALLN-001~012）**，特别是 **O-ALLN-002（注册表形态）**、**O-ALLN-003（SW 端 op 执行器）**、**O-ALLN-004（`settings/ops.ts` 收编 / 并行）** | 三者决定 v5 的**结构层级**（新增层 vs 重构层）与叶拆分；不裁决则任务无法排 |
| 高 | **把 R-ALLN-002 / R-ALLN-003 两条红线写进 spec 的范围与验收** | `content.js` 零余量 + 静态权限零漂移 = **零容差**；且判据必须**等价改写**（不是放宽） |
| 高 | **体积预算评估（Q-ALLN-011）**：先算 `sidepanel.js` 净增上下界，再决定是否拆叶控体积 / 是否预登记档位调整 | 余量 24,926 B（距档位 13,479 B）；**禁止**在预算未评估前排「全量落地」 |
| 高 | **确认「断流首验收场景」的 AC 形态（O-ALLN-005）**：S2 五环节哪些可机器化、哪些属人工面（浏览器原生弹窗） | 作者裁决⑤ 明确首验收；headless 不可合成项须**如实登记，不冒充 PASS** |
| 中 | **对账 `error` 卡的「出生冻结」与「行内恢复」（Q-ALLN-009 / O-ALLN-009）** | 需 spec 显式裁决落层（卡壳 / 行内控件 / 紧随卡），不得破坏冻结语义 |
| 中 | **裁决 G 稿是否入 `design-contract` 门禁（Q-ALLN-013 / O-ALLN-011）** | 入 = 需新增双 sha 常量 + 127 行映射 + `designContractChanges` 登记；不入 = 需显式登记为「治理真空」并由其它判据兜底 |
| 中 | **实测澄清密度口径（Q-ALLN-014 / O-ALLN-007）**：三档 → 连续宽度的 31 格影响面 | Chromium 实测；禁止沿用未验证断言排工作量 |
| 中 | **`op-*` 消息族落点确认（O-ALLN-003）**：type-only vs `KIND_SET`（默认前者） | 走 `command-policy` / `pick-layer-*` 先例，运行时校验落独立模块 |
| 低 | **外部竞品调研（如需）**：若 spec/plan 认为「聊天式 agent 面板如何组织授权 / 权限 / 密钥配置」需要外部参照，显式登记为待调研项 | 本轮未执行，不编造结论（§4.1） |

### 6.1 F-32 占用复核结果（**本轮实测**）

| 项 | 实测命令 | 结果 |
|---|---|---|
| `F-30` / `F-31` | `grep -c` ROADMAP | 已占用（F-30 = v4-chat 已收口 / F-31 = v4.5 已收口） |
| **`F-32`** | `grep -c F-32 .sddu/specs-tree-root/ROADMAP.md` → **0** | **未占用**（ROADMAP 中 0 命中） |
| `F-32` 的仓库其他命中 | `grep -rn F-32 .`（排除 `node_modules` / `.git`）→ **1 处** | 唯一命中 = v4.5 `discovery.md:290` 的「`F-32` / `F-33` → 0 → 未占用（无需考虑）」表格行——**是文字说明，不是 Feature 登记，不构成占用** |
| `F-33` | `grep -c F-33 ROADMAP.md` → **0** | 未占用（备查） |
| **编号结论** | — | **登记为 F-32 即可，无需顺延**；本轮不改 ROADMAP（登记留给收口） |

### 6.2 版本位核验（**本轮实测**）

| 项 | 实测 | 结果 |
|---|---|---|
| ROADMAP 文档版本 | `> **文档版本**: 1.28.0` | — |
| **`v0.10.0`** | `grep -c v0.10.0 .sddu/specs-tree-root/ROADMAP.md` → **8** | **已存在但非 Feature 登记**：8 处全部属「**v0.10.0 = AI 增强与生态（原 v0.8→v0.9 内容整体后移；审视后立项）**」规划段与版本总览表行（`ROADMAP.md:59,476,480,816` 等）；该段为**待作者审视后立项的规划**，**尚无 F 编号、无 Feature 目录** |
| `v0.9.2` | `grep -c v0.9.2 ROADMAP.md` → **0** | 未占用（若走「维护段」命名可备选——但 G 是**新主题**，不属维护段） |
| 同版并列先例 | `v0.9.0` 现为**三主题并列**（工程质量与文档对齐 / F-28 v3-ui / F-30 v4-chat） | **有先例可循**：新主题可作为既有版本段的**并列主题**登记 |
| 版本位结论 | — | **建议采纳 `v0.10.0`（新主题，与「AI 增强与生态」并列；不是维护段）**；措辞建议区分于 v0.9.1（维护段）与 v0.9.0（三主题并列）。**登记留给收口**；`F-29` 区段一字不动；**本阶段不改 ROADMAP** |

### 6.3 建议的叶子拆分草案（**供 spec 参考；discovery 只提建议不执行**）

> 依据：四项核心的**取代对象 / 门禁面 / 台账条目**互不重叠，具备独立成叶的判据；但**四叶共享同一次体积重登记、同一次 journey 结构重锚与同一次 design-contract 登记** ⇒ **必须串行**（deliveryOrder 明确）。

| 叶 | 名称（建议） | 内容 | 依赖 |
|:-:|---|---|---|
| v5-1 | `specs-tree-v5-1-no-dead-end`（**法七 无死端**） | `error` 卡行内恢复 chip +「阻塞终态必有可达 next」判据（5 类逐类）+ `site.unauthorized` 常驻候选 + S2 断流样板的机核化（首验收） | —（P0） |
| v5-2 | `specs-tree-v5-2-web-op-pipeline`（**web-op 管线 + NextProvider 注册表**） | op 清单 / 四态管线 / 契约 v2 七点 / 注册表纯谓词 + 分发器 diff = 0；`NEXTSTEP_ACTS` 闭集 → opId 的取代与门禁等价重锚 | v5-1（共享推荐器取代面，须先定 provider 形态） |
| v5-3 | `specs-tree-v5-3-in-chat-ops`（**授权 / 权限 / LLM / 撤销 流内闭环**） | `op.authorize` / `op.perm.request`（optional_permissions 最小集）/ `op.llm-config`（掩码卡 + 法八零明文）/ `op.revoke`（高风险确认）+ 与设置视图管理面的**单一执行入口**纪律 | v5-2（op 管线是前置） |
| v5-4 | `specs-tree-v5-4-auth-chip-and-width`（**授权态下移 + 可拖动宽度**，可后置） | 状态栏常显 chip（黄 / 绿 + 点击行为 + 零双写 + 密度 6 ≤ 7）；可拖动宽度 280–640（ARIA `separator` + 键盘 + clamp + `data-narrow`）+ 密度口径重算 | v5-3（管理详情入口依赖 op.revoke / op.rebind）；P1 |

> **父 Feature** = 轻量规范容器（同 v3-ui / v4-chat / v4.5 先例：`phase=tasked`，`agent=sddu-tasks`，不承接 build/review/validate）。

---

## 7. 附录

### 7.1 现状基线（**全部带 `file:line` 证据；本轮实测**）

#### A. 真机断流的四层根因（核心 1 的对象）

| # | 事实 | 证据（`file:line`） |
|:-:|---|---|
| A1 | 唯一带 `act:'authorize'` 的 chip 在 `onboarding` 规则内，谓词含 `firstRun` ⇒ 非首装会话永不产出 | `src/ui/sidepanel/recommend.ts:296-307` |
| A2 | `site` 触发的恢复 chips = `['rebind','repick','describe']`（无 `authorize`） | `src/ui/sidepanel/recommend.ts:208-214` |
| A3 | `activeRecoveryTrigger` 只在 `input.site.authorized === false` 时命中 `site`（推荐出卡，但动作不解除未授权） | `src/ui/sidepanel/recommend.ts:112-134` |
| A4 | 推荐规则只有 4 条，**不含** LLM 未配置 / 浏览器权限缺失 | `src/ui/sidepanel/recommend.ts:52` + `:272-320` |
| A5 | `error` 卡只渲染文本气泡，**零 chip / 零控件**；`error ∈ BORN_FROZEN_KINDS` | `src/ui/sidepanel/cards/error.ts:1-27` + `src/ui/sidepanel/stream-model.ts:129-140` |
| A6 | 未授权站点页面侧不可用的错误文案来源 | `src/background/service-worker.ts:2197`（`未授权站点 …：页面侧零注入`）；救援路径 `:2272`（`救援零注入`） |
| A7 | 该事实在面板侧只落成 `pick.unavailable`，最终渲染为**风险位一行**（无恢复入口） | `src/ui/sidepanel/pick-input.ts:186-191` + `src/ui/sidepanel/l0/shell.ts:151-164`（`#l0-page-unavailable`） |
| A8 | 拾取不可用的可读原因（含「未授权：页面侧零注入，拾取层不存在」） | `src/ui/sidepanel/view-model.ts:839-845,909` |
| A9 | 救援失败只产出一条 `notice`（无 next） | `src/ui/sidepanel/sidepanel.ts:1993` |
| A10 | 风险位含条件性 `unauthorized` chip（badge「未授权」） | `src/ui/sidepanel/l0/risk-rail.ts:29-40` |

#### B. 跳来跳去：用户操作面的现状分布（核心 2 / 3 / 6 的对象）

| # | 事实 | 证据 |
|:-:|---|---|
| B1 | 设置视图 **8 个分区**（`settings-llm` / `-auto-auth` / `-tabs` / `-capabilities` / `-sessions` / `-diagnostics` / `-compliance` / `-help`） | `src/ui/settings/sections.ts:35-44` + `src/ui/settings/panel.ts:130,193,242,261,343,370,389,412` |
| B2 | LLM 配置面（provider / apiKey / model / baseURL / maxRounds / 保存 / 测试连接 / 清除） | `src/ui/settings/panel.ts:130-179`（`#settings-provider` / `#settings-apiKey:153` / `#settings-model` / `#settings-baseURL` / `#settings-maxRounds` / `#settings-save` / `#settings-test` / `#settings-clear`） |
| B3 | 站点级自动授权（按 origin 分档，含不可覆盖说明） | `src/ui/settings/panel.ts:193-240` |
| B4 | 浏览器可选能力（授权 / 撤销 / 隐私开关三态行） | `src/ui/settings/panel.ts:261-341` + `src/ui/settings/view.ts:107,134` |
| B5 | 会话与分组 / 诊断 / 合规 / 帮助 | `src/ui/settings/panel.ts:343,370,389,412` |
| B6 | `SettingsOps` 单口 **17 个操作**（LLM 4 + 状态 1 + tabs 2 + capabilities 4 + auto-auth 3 + sessions 2 + diag 1） | `src/ui/settings/ops.ts:122-149` |
| B7 | 独立管理页 `options.html`（LLM / 能力撤销 / 合规 / 可选权限说明） | `src/ui/options/index.html:153-155` 等 + `manifest.json:40`（`options_page`） |
| B8 | 唯一手势权限申请路径（SW 永不 `.request(`） | `src/platform/capability-permissions.ts` + `src/ui/settings/panel.ts`（`requestCapability(row)`）；门禁 `test/capability-wiring.test.ts:51-58` |
| B9 | 站点授权的页面侧入口（`requestOriginPermissionDetailed` + `makeMessage('authorize')`） | `src/ui/sidepanel/sidepanel.ts:334-352` + `src/platform/extension-env.ts:101-111` |
| B10 | 连接树内可就地撤销（站点级 / 能力级） | `src/ui/tree/tree-view.ts:549` |

#### C. 推荐器的实现形态（核心 2 的对象）

| # | 事实 | 证据 |
|:-:|---|---|
| C1 | 候选来源 = **4 条手写规则**（优先级：`risk-recovery` > `ref-action` > `onboarding` > `capability-discovery`） | `src/ui/sidepanel/recommend.ts:52` + `:272-320` |
| C2 | 动作语义 = `NEXTSTEP_ACTS` **6 项闭集**（逐字 `next/repick/describe/authorize/rebind/help`），并被门禁**逐字**钉死 | `src/ui/sidepanel/recommend.ts:194` + `test/local-act-wiring.test.ts:269` + `test/recommendation-sources.test.ts:281` |
| C3 | chip 绑 `data-act`（动作字符串），**不是** opId | `src/ui/sidepanel/cards/nextstep.ts:59` |
| C4 | 点击分发 = `handleCardAction` **手写 switch（16 个 `if` 分支）** + 兜底「将在 v4-3 / v4-4 落地」告知 | `src/ui/sidepanel/sidepanel.ts:184-277`（兜底在 `:275`） |
| C5 | 单卡 chip 上限 3 / 每回合推荐卡上限 1 / 最小间隔 10 s（防抖） | `src/ui/sidepanel/recommend.ts:43,46,56` + `test/recommendation-sources.test.ts:128-129` |
| C6 | 真值源白名单 **7 项**（`ref`/`session`/`site`/`catalog`/`probe`/`risk`/`onboarding`）+ 模块 import 白名单（仅 `./stream-plaintext.js`） | `src/ui/sidepanel/recommend.ts:59-74` + `test/recommendation-sources.test.ts` |
| C7 | 恢复触发集 5 项（`refInvalid`/`declarationInvalid`/`hardFloor`/`site`/`probe`） | `src/ui/sidepanel/recommend.ts:98-105` |

#### D. 卡类型学 / 流契约 / 状态栏（核心 4 / 5 / 6 的对象）

| # | 事实 | 证据 |
|:-:|---|---|
| D1 | **12 kind** = 7 主类（`ai/user/nextstep/askuser/auth/system/ref`）+ 5 过程卡（`tool/command/thinking/error/notice`）；`CARD_TYPES` 与 `STREAM_EVENT_KINDS` 同源 | `src/ui/sidepanel/stream-model.ts:72-78` |
| D2 | 出生冻结集含 `error` / `notice` / `system` / `ref` / `command` / `nextstep` / `ai` / `user`（只 `tool`/`thinking`/`askuser`/`auth` 可 patch） | `src/ui/sidepanel/stream-model.ts:129-140` |
| D3 | 6 个终态 + `MAX_OPEN_ASKS = 2` + `ASK_CANCEL_REASONS`（`user`/`timeout`/`superseded`/`aborted`） | `src/ui/sidepanel/stream-model.ts:86-121` |
| D4 | `askuser` 现有型：choice / text / confirm（**无 secret / 无 form**） | `src/ui/sidepanel/cards/askuser.ts:74-228` |
| D5 | 状态栏 = `#region-statusbar` + `#statusbar-text` + `#risk-chips`，**单一写入者**（J1 永不折叠 / J2 有风险才显 chips / J3 祖先无折叠 / J4 视图切换不触碰） | `src/ui/sidepanel/statusbar.ts:1-70` |
| D6 | 工具栏摘要含授权态（`band.origin` 文案 + `已授权` / `未授权`） | `src/ui/sidepanel/view-model.ts:824,894-902` |
| D7 | 密度豁免唯一声明点 = `#stream`；三区壳根不豁免；阈值 7/15 · 9/20 · 17/35 | `src/ui/sidepanel/density-scope.ts:29-60` + `docs/v4-density-baseline.json#thresholds` |
| D8 | 零宿主判据：`REGISTERED_STRUCTURAL_HOSTS = []`（v4.5 清零）；`RETIRED_HOST_IDS` / `MIGRATED_CONTAINER_IDS` 维持零 `[data-host]` | `src/ui/sidepanel/host-registry.ts:105,187,200` |
| D9 | 单系统事件通道（净化 / 去重 5000 ms / 速率 20 行每分钟 / 「持续：」前缀 / `dropped` 不静默） | `src/ui/sidepanel/system-events.ts`（模块注释 `:8-20` + 常量 `:44-58`） |

#### E. 消息族与 `content.js` 红线（核心 3 / 附带 1 的对象）

| # | 事实 | 证据 |
|:-:|---|---|
| E1 | `PluginMessageKind` / `KIND_SET` 定义在 `background/messaging.ts`，而 `content-script.ts` **import 该模块** ⇒ 打进 `content.js` | `src/background/messaging.ts:103-141` + `src/content/content-script.ts:20` |
| E2 | 既有先例：`command-policy` 家系 / `pick-layer-*` 家系 / `ref-rescue` **type-only**，不进 `KIND_SET`，运行时校验落独立模块 | `src/background/messaging.ts:68-89` + `src/background/insight-protocol.ts:29-41` + `src/content/pick-protocol.ts:51-61` |
| E3 | 历史实测：往 `KIND_SET` 加 6 个字符串 = `content.js` **+307 B**（红线） | `src/content/pick-protocol.ts:9-15` |
| E4 | 构建注释逐字：「folded into `content.js`, whose **177,076 B budget has zero headroom**」 | `build.mjs:58-66` |
| E5 | `manifest.json` 现状：静态 `permissions` 5 项 / `optional_permissions` **5 项**（`bookmarks` `downloads` `notifications` `clipboardRead` `clipboardWrite`）/ `host_permissions` 6 条 LLM 端点 / `optional_host_permissions` 2 条 | `manifest.json:11-36` |
| E6 | 门禁把上述集合**逐字**钉死（静态 5 / 可选 5 / host 6 / 无 `<all_urls>` / 无 `content_scripts` / `minimum_chrome_version: 116`） | `test/capability-wiring.test.ts:20-50` + `test/binding-wiring.test.ts:50-58` + `test/auto-session-wiring.test.ts:81-94` |

#### F. 体积与门禁基线（**本轮实测 + 引自 v4.5 收口总账**）

| # | 项 | 值 | 来源 |
|:-:|---|---|---|
| F1 | `dist/sidepanel.js` | **498,521 B** | 本轮实测 + `test/size-baseline.ts:301 SIDEPANEL_BASELINE_BYTES = 498_521` |
| F2 | 生效上限（公式） | **523,447 B** = `floor(498,521 × 1.05)` | `test/size-budget.test.ts:47,53` |
| F3 | 余量 | **24,926 B（+5.00%）**；距档位 **13,479 B**；距绝对上限 **64,679 B** | 计算（512,000 − 498,521 = 13,479；563,200 − 498,521 = 64,679） |
| F4 | 档位 / 绝对上限 | **512,000 B** / **563,200 B**（= 档位 × 1.10）；`authorConfirmation.status = pending-author-line` | `docs/v4-supersession-ledger.json#v3Vol3Closeout` + v4.5 closeout §3.2 |
| F5 | `dist/content.js` | **177,076 B** / sha256 `52a826205553b46a896ccad54225d63ba62f5f7fe7c969a9bc2e655448d5b5f6` | 本轮实测 |
| F6 | `dist/pick-layer.js` | **33,900 B** / sha256 `5f567d7ededc58183afe4ce45e3293b68204dfbe788dc6b9fb09bdc6e0d13e59` | 本轮实测 |
| F7 | 门禁计数（**引自 v4.5 收口总账，本轮未复跑**） | `npm test` **1045** · supersession **35** · gate-integrity **13** · zero-injection **27** · design-contract **6** · ref-pick-wiring **11** · size-ruling-vol3 **12** · l0 **244** · l1 **116** · l2 **74** · density **232** · journey **171** · insight **116** · binding **192** · hardening **24** · stream **63** · ask-auth **61** · recommendation **59** · page-input **108** · l1-reverse **9** · l2-reverse **10** · e2e PASS | v4.5 closeout §3.1 |
| F8 | 保护段 | journey `43054..58287` / sha `cc79f413…` / **240 行**（`supersessionChain` 3 链节 `6b45c3fa… → e2b500df… → cc79f413…`）；binding `107780..115930` / sha `be9ad0e9…`（`decision = keep`） | v4.5 closeout §3.2 + `docs/v4-supersession-ledger.json#protectedRanges` |

#### G. 设计契约覆盖（核心 1 的验收基准 / `Q-ALLN-013`）

| # | 事实 | 证据 |
|:-:|---|---|
| G1 | `design-contract` 门禁只冻结 **F**：`SHIM_CHECK_CALLS = 60` + `DRAFT_SHA256`（F 稿）+ `SHIM_SHA256`（F shim） | `test/design-contract.test.ts:60-73` |
| G2 | G 稿与 G shim **不在任何门禁内**（仓库实测 `grep -rn option-g test/ src/ docs/` = **0 命中**） | 本轮实测 |
| G3 | `designContractChanges` 现为**空数组**（无设计契约变更登记） | `docs/v4-supersession-ledger.json:8121` |
| G4 | G 稿自检实跑：**127 passed / 0 failed**（退出码 0）；`check(` 调用点 127 + 声明 1 | 本轮 `node design/ui-redesign/option-g-shim.mjs` |
| G5 | G 稿覆盖：三区结构继承 / 12 kind 继承 / 法七无死端（5 类阻塞 + ✖ 行不裸奔）/ 法八零明文 / chip↔op 绑定 / op 管线四态 / 注册表视察器与场景联动 / 死端对比表 / 密度 ≤7 / **授权态下移（§M）** / 可拖动宽度与双主题 / **架构依据回注（§N：dsh 已核实 + 契约 v2 七点）** | `design/ui-redesign/option-g-shim.mjs` 头注 + 尾行统计 |
| G6 | 已由真实浏览器（Chromium headless）实测过并修掉两处**只在真实浏览器暴露**的问题（`NodeList.filter` 不存在 ⇒ 改 `$$()`；系统行时间戳被挤成 2 字符 ⇒ `flex:0 0 auto; white-space:nowrap`），两处均有防回归机核（§M20 / §M21） | 设计稿「本稿的自检」逐字 |

### 7.2 干系人约束清单：**红线继承（N）** + **显式取代（X）**

> **本清单为约束（不是需求）**；spec 必须逐条落为 `NG-*` / `AC-*`，**不得改写数值或放宽口径**。

#### N. 红线继承（**逐字保留阈值 / 冻结面；来源 = v4.5 收口总账 + 本轮实测**）

| # | 红线（**逐字**） | 来源 |
|:-:|---|---|
| N1 | `dist/content.js` = **177,076 B**，sha256 `52a826205553b46a896ccad54225d63ba62f5f7fe7c969a9bc2e655448d5b5f6`（**零容差**） | v4.5 closeout §3.2 + 本轮实测 |
| N2 | `dist/pick-layer.js` = **33,900 B**，sha256 `5f567d7ededc58183afe4ce45e3293b68204dfbe788dc6b9fb09bdc6e0d13e59`（**零容差**） | 同上 |
| N3 | `sidepanel.js` ≤ 生效上限 **523,447 B** = `floor(498,521 × 1.05)`；单轮容差 **5%** 未动；`SIDEPANEL_CEILING_CAP` 保持 **`record-only`**（V3-VOL-1 ②：不设自缚装置） | `test/size-baseline.ts:348-366` + `test/size-budget.test.ts:47,53` |
| N4 | V3-VOL-3 三值：档位 = **512,000 B**、绝对上限 = **563,200 B**（= 档位 × 1.10）、`newBaselineBytes` 随现行基线**同源前移**；`authorConfirmation.status ∈ {pending-author-line, confirmed, overridden-by-author}`，**不得伪称已确认** | `docs/v4-supersession-ledger.json#v3Vol3Closeout` |
| N5 | 密度阈值 **7/15 · 9/20 · 17/35 逐字保留**；豁免口径**只认 `hidden`**；防滥用单卡 ≤6 / 首屏 ≤2 / 合计 ≤8 / 欢迎卡 ≤1 | `docs/v4-density-baseline.json#thresholds` + `density-scope.ts:47-60` |
| N6 | **`STREAM_HEIGHT_RATIO_MIN = 0.65`（只允许上调）**；`journey #15b`「`#region-stream` 高度占比 ≥65.0%」 | `docs/v4-supersession-ledger.json#redlineRemap[0]` |
| N7 | **风险位永不折叠**（`#region-statusbar` 本体永不带 `hidden`；`#risk-chips` 有风险时无 `hidden`）；状态栏 J1~J4 单写者结构 | `statusbar.ts:1-70` + `disclosure.ts`（`NEVER_FOLDABLE`） |
| N8 | **安装期静态权限零变化**：`manifest.permissions` 逐字 `['activeTab','scripting','sidePanel','storage','tabs']`；`host_permissions` 6 条；无 `<all_urls>` / 无 `*://*/*` / 无静态 `content_scripts`；`minimum_chrome_version` = `116` | `test/capability-wiring.test.ts:20-50` + `test/binding-wiring.test.ts:50-58` |
| N9 | **判定链零触碰**：`src/security/policy.ts` / `src/security/auto-authorize.ts` 在 `zeroDiffFiles` 冻结（内容哈希 pin） | `docs/v3-supersession-ledger.json#zeroDiffFiles`（9 项） |
| N10 | `src/ui/options/index.html` 在 v3 台账 `zeroDiffFiles` 内（v4.5 已走一次**显式解冻**：纯文案单行 + 范围门禁）；**v3 台账为冻结历史，不得解冻** | v4.5 closeout §2 附带 + `docs/v3-supersession-ledger.json` |
| N11 | **断言零删除零降级、计数只增不减**（唯一例外 = 保护段按台账 **显式取代**并留痕，**不是静默删除**） | v4.5 closeout §3.1 规律 |
| N12 | 保护 pin：journey **`43054..58287` / sha `cc79f413…` / 240 行**（`supersessionChain` 3 链节）；binding **`107780..115930` / sha `be9ad0e9…`**（`decision = keep`） | `docs/v4-supersession-ledger.json#protectedRanges` |
| N13 | **门禁严格串行**（一次一个 Chromium，`finally` 自清 profile；`test` / `test:ui` / `test:binding` **绝不并发**） | ROADMAP 立项纪律第 ④ 条 + v4.5 closeout §5 deferred 1 |
| N14 | 纪律：**不碰 `main`、不 force push、path-limited `git add`（禁 `git add -A` / `.`）、禁改 `.opencode/opencode.json`、禁改 `packages/web-cli-base/**`、无新依赖**；**不合 main、不发布** | ROADMAP 立项纪律第 ⑤⑥ 条 |
| N15 | 取代台账 `knownGap` 一致性：`status = complete-steps-1-8` 时该字段**必须为空或仅声明闭环**（`test/supersession-ledger.test.ts` 机核强制） | `docs/v4-supersession-ledger.json#protectedSupersession.knownGap` |
| N16 | `F-29`（A2A 候选）**未立项未排期，保持原样不动**（ROADMAP 相关区段一字不动） | v4.5 closeout §5 deferred 9 |
| N17 | **零新增流内固定宿主**：`REGISTERED_STRUCTURAL_HOSTS = []` + 「任意深度零 `[data-host]` / `[data-transitional-host]`」判据（v4.5 刚建立） | `host-registry.ts:105,187,200` + `test/host-registry.test.ts` |
| N18 | `KL-N-10` 处置纪律：首轮异常**隔离复跑 ≥2**、日志全量、**仍红如实记录不阻塞收口**（不伪造串行绿） | `docs/v4-supersession-ledger.json#knownLimitations` + v4.5 closeout §5 |
| N19 | **12 kind 契约不动**（7 主类 + 5 过程卡）；回执复用固化区 + 系统行，**不新增卡类型** | 设计稿 §⑧ + `stream-model.ts:72-78` |
| N20 | 设计稿已定稿冻结（`05f612e`，127 断言全绿）；`design/**` 改动须同时满足 127 断言 + 更新 sha 常量 + 台账登记（**禁静默改断言**） | 设计稿头注 + `test/design-contract.test.ts:158-211`（F 侧同构规则） |
| N21 | **`design-contract` 门禁只冻 F（60 断言）**，不得因 v5 而**静默替换** F 的冻结常量（F 契约须继续成立） | `test/design-contract.test.ts:60-73` |

#### X. **显式取代清单（作者已授权；须在 spec / 台账逐条显式登记，不得静默）**

> **口径**：**X1~X3 为编排器给定的三项须显式取代**的既有红线；**X4~X6 为本轮新识别**的、同样需要显式取代或显式裁决的既有形态。**「显式取代」≠「放宽」**——判据必须**等价重锚**（断言力不降、计数只增），并留台账。

| # | 既有红线（现状逐字） | 取代 / 裁决内容（作者授权依据） | 连带门禁（须等价重写，非放宽） |
|:-:|---|---|---|
| **X1** | **「manifest 零改动 / 零新增静态权限」**：`test/capability-wiring.test.ts:26-29` 静态集合逐字 + `:35-38` 可选集合逐字 5 项 + `:50` host 6 条 | **允许新增 `optional_permissions` 段**（作者裁决①）：运行时按需申请浏览器权限；**安装期静态 `permissions` 逐字不变**；静态面零漂移红线保留 | `capability-wiring.test.ts` / `binding-wiring.test.ts:50-58` / `auto-session-wiring.test.ts:81-94` / `test/ui/binding.mjs`（192） |
| **X2** | **「SW / `KIND_SET` 零新 kind」**：`messaging.ts:103-141` 的 `KIND_SET` 被 `content-script.ts:20` 打进 `content.js`（零余量；历史 +307 B） | **G 新增 `op-*` 消息族**（作者裁决①/② 的载体需求）——**默认走 type-only 先例**（不进 `KIND_SET`，运行时校验落独立模块，同 `command-policy` / `pick-layer-*` / `ref-rescue` 家系）；**若**主张进 `KIND_SET`，须先证 `content.js` **逐字节零增长**（默认禁止） | `content.test.ts` / `pick-layer-budget.test.ts` / `insight-protocol.test.ts`（先例） |
| **X3** | **act 闭集 6 项**：`NEXTSTEP_ACTS` 逐字 `['next','repick','describe','authorize','rebind','help']`，被 `test/local-act-wiring.test.ts:269` + `test/recommendation-sources.test.ts:281` **逐字**钉死 | **契约 v2 的 op 注册表（`act` = `opId`）**（作者 Q1 + 设计稿架构区 §①/§④/§⑦）：chip 绑 `data-op`；候选由注册表纯谓词产生；`handleCardAction` 分发器 **per-op diff = 0** | `recommendation-sources.test.ts` / `local-act-wiring.test.ts` / `authorize-chip-wiring.test.ts` / `test/ui/recommendation.mjs`（59）/ `test:ref-pick-wiring`（11） |
| **X4** | **`design-contract` 只冻结 F（`SHIM_CHECK_CALLS = 60` + F 双 sha）**；`designContractChanges = []` | **G 稿 + 127 断言入契约**（作者裁决③ + D7 定稿）：新增 G 的 `DRAFT_SHA256` / `SHIM_SHA256` / `G_SHIM_CHECK_CALLS = 127` / `ASSERTION_MAP`（127 行）+ `designContractChanges` 登记；**F 冻结不得静默替换**（N21） | `test/design-contract.test.ts`（6） |
| **X5** | **密度三档视口（320 / 400 / 520）+ 原三档宽度 radio** | **连续可拖动宽度 280–640**（设计稿 ② + 三轮优化）：分隔条 ARIA `separator` + 键盘 + clamp + 双击复位 400；窄屏兜底改由 `#panel[data-narrow="true"]`（≤360px）触发 | `test/ui/density.mjs`（232）/ `l0.mjs`（244）/ `journey.mjs`（171）/ `density-thresholds.test.ts` + `docs/v4-density-baseline.json#tiers` |
| **X6** | **推荐 chip 绑动作字符串（`data-act`）· 候选来自手写规则 · 分发为手写 switch** | 同 X3 的一体两面（设计稿 F→G 变化点第 1 / 4 行）：`chip ↦ opId`（`data-op`）+ 注册表候选 + 统一管线四态；`error` 卡**行内**带恢复 chip（法七） | 见 X3 + `test/ui/stream.mjs`（63）/ `ask-auth-inflow.mjs`（61） |

> **须注意的边界**：X1~X3 为**编排器给定的三项须显式取代**；X4~X6 为本轮**新识别**。**任何 X 项都不得以「放宽阈值 / 删除断言 / 静默改常量」的方式落地**。

### 7.3 门禁影响面预判（**迁移量估计，不是承诺**）

| 门禁 | 预判存活度 | 主要冲击点 |
|---|---|---|
| `npm test`（1045） | **中** | 新增注册表 / op 执行器 / 掩码扩形 / provider 判据；`recommend.ts` 单测面（`recommendation-sources.test.ts` / `local-act-wiring.test.ts` / `authorize-chip-wiring.test.ts`）**整体重写** |
| `test:ui` journey（171） | **低—中** | 保护段 `43054..58287`（240 行）**可能第三次八步取代**；段外 `#11c~#11e`、`#15*` 卡族 / 滚动跟随 / 320px 无溢出逐条受影响 |
| `test:l0`（244） | **低—中** | 授权态下移（工具栏摘要去授权态 + 状态栏新增 chip）+ 零宿主断言 + 三视口结构集合 |
| `test:density`（232） | **中** | 连续宽度口径（31 格 / `tiers` / `data-narrow`）；阈值**不得变**；夹具稳态锚 |
| `test:recommendation`（59） | **低** | 真实产品路径的推荐卡断言（规则 → provider 后逐条等价重锚） |
| `test:stream`（63）/ `ask-auth`（61） | **低—中** | `secret` / `form` 是 `askuser` 扩形 ⇒ 断言**增**；`error` 卡新增行内恢复 ⇒ 断言**增** |
| `test:binding`（192） | **中—高** | 权限申请 / 撤销的授权回执链（`#4b/#4c`）与保护段（keep）段外逐行登记 |
| `test:insight`（116） | **中** | 连接树站点行「状态见状态栏授权 chip」（台账不复制状态） |
| `test:page-input`（108）/ `ref-pick-wiring`（11） | **中** | `op.pick` / `op.describe` 取代既有 `repick` / `describe` 本地动作后，拾取单一入口判据需重锚 |
| `test:hardening`（24）/ `zero-injection`（27） | **高** | 不涉形态（权限面改动须复跑确认不回归） |
| `test:design-contract`（6） | **低** | 若 G 入契约则**增**（新增 G 侧判据 + 127 行映射表） |
| `test:supersession`（35） | **低** | `knownGap` 一致性 + 八步 + RP-V4-08；新增取代条目必须登记 |
| `test:size-*`（在 `test` 内 + `size-ruling-vol3` 12） | **低—中** | 强制五要素重登记 + 算术机核 + V3-VOL-3 三值前移 + 逐模块 metafile 归因 |
| `test:gate-integrity`（13）/ `e2e` | **高** | 新门禁需纳入受审集合 |
| `test:l1-reverse`（9）/ `l2-reverse`（10） | **中** | 反证**注入点**若被搬走，反证需重写（判据不得空转） |

### 7.4 开放问题清单（**给 spec 阶段裁决**）

| ID | 开放问题 | 为什么必须在 spec 裁决（不裁决的后果） | 候选（编排器预登记，**非方案评估**） |
|---|---|---|---|
| **O-ALLN-001** | **op 首批范围边界**：设计稿首批 **8 个 op**；作者主题说的是「**所有**用户授权、权限申请、绑定、浏览器权限申请、LLM 配置等」。**会话 / 分组 / tabs 设置 / 诊断 / 主题 / 告警**算不算「需要用户操作的地方」？ | 不裁决 ⇒ 范围无边界，「一站式闭环」被无限外扩 ⇒ 体积与门禁面失控（Q-ALLN-011） | ① 严格按 8 op（其余登记为 deferred）② 8 op + 少量明确补充（如会话切换）③ 全量收编（风险最高） |
| **O-ALLN-002** | **注册表形态**：`NextProvider` 用**纯 TS 注册**（设计稿示意）还是**外部声明式配置（JSON）**？注册表是否需「证明义务表」式静态登记（功能 → 触发 provider → 挂载点 / 模式 → 失败语义）？ | 不裁决 ⇒ `handleCardAction` diff = 0 的**契约义务**无法机核（设计稿 §⑤/§⑦）；「新增 provider 只改注册表条目」没有判据 | ① 纯 TS 注册 + node 门禁断言「分发器零 per-op 分支」② TS 注册 + 运行期 loud 校验 ③ 声明式 JSON（引入新加载面） |
| **O-ALLN-003** | **SW 端 op 执行器架构**：op 的 `execute()` 在**面板侧**还是 **SW 侧**执行？跨 context 如何保证**单一执行入口**（与 `settings/ops.ts` 的 transport 面关系）？`op-*` 消息族命名与 type-only 校验落点（X2）？ | 不裁决 ⇒ 架构分层不明，双入口漂移风险（Q-ALLN-010 / R-ALLN-012）；消息族可能误入 `KIND_SET`（R-ALLN-002） | ① 面板侧 op 执行器 + 复用既有 message kind ② SW 侧统一 op 执行器 + 新 type-only 消息族 ③ 混合（读面板 / 写 SW） |
| **O-ALLN-004** | **`settings/ops.ts`（17 个设置操作）与新 op 管线的关系**：**收编** / **并行** / **单一执行入口纪律**（一个 op 一个入口，设置页按钮与 chat chip 同调）？ | 不裁决 ⇒ 同一操作两条执行路径 ⇒ 行为 / 留痕 / 门禁漂移（FIX-1 先例的反面；v4.5 双写教训） | ① 收编 + 单一执行入口（与 FIX-1 先例一致）② 并行（须显式登记双写判据）③ 设置页降级为只读管理面 |
| **O-ALLN-005** | **断流首验收的 AC 形态**：S2 五环节（绑定 → 探测 → 未授权推荐 → ✖ 行 → 授权后自动续流）哪些可**机器化**（Chromium 门禁 / node 判据）、哪些属**人工面**（浏览器原生权限弹窗，headless `PENDING_TIMEOUT`）？真机 23:12 序列如何成为**回归测试**？ | 不裁决 ⇒ 首验收无法验收（作者裁决⑤ 的核心义务落空）；且可能以自动判据**冒充**人工验收（v4/v4.5 明令禁止） | ① 「阻塞后有可达 next」做 node + Chromium 判据 + 弹窗走人工面 `⏳` ② 全链 Chromium（弹窗不可合成 ⇒ 降级）③ 仅 node 判据 + 人工真机走查 |
| **O-ALLN-006** | **状态栏授权 chip 的归属**：新增独立常显 chip（新 DOM）还是**复用** `#risk-chips` / `#statusbar-text`？如何保持 `statusbar.ts` 的**单一写入者**结构与 J1~J4 判据？「零双写」的机核口径是什么（四词扫描范围）？ | 不裁决 ⇒ 状态栏单写者结构被打破（R-ALLN-007）；零双写无可核判据 | ① 新增 `#auth-state` 常显 chip（独立写入者，与 rail 分工）② 复用 `#risk-chips`（须证明不破坏「风险 chips」语义）③ 状态栏第一行内联（文本 + 可点） |
| **O-ALLN-007** | **密度口径与连续宽度**：31 登记格是否重算？「宽度无关性」是否新增判据？三视口（320/400/520）断言是否扩展为连续口径？`data-narrow`（≤360px）如何机核？ | 不裁决 ⇒ 工作量与验收面两读法并存（Q-ALLN-014 / A-ALLN-008） | ① 保留三档测量点 + 新增连续宽度**不变量**判据 ② 全量重算 31 格 ③ 仅新增 `data-narrow` 判据，其余登记为已知偏差 |
| **O-ALLN-008** | **`NEXTSTEP_ACTS` → opId 的取代方式**：闭集是否保留为 op 的**子集**（`act` 与 `opId` 共存期）？`op.pick` / `op.describe` 与既有本地动作（零回合、不受 `pending` 门控）语义如何对齐？ | 不裁决 ⇒ 既有「本地动作零回合」约束（ADR-V4-038 §5）与 op 管线的 `consent` / `params` 门控冲突 | ① op 为唯一词汇，`act` 退役 ② `act` 保留为 `opId` 的渲染别名 ③ 双词汇共存（须登记映射） |
| **O-ALLN-009** | **`error` 卡行内恢复的落层**：恢复 chip 放卡壳 / 行内 / 紧随卡？「出生冻结」`BORN_FROZEN_KINDS` 是否需为 `error` 开例外？点击后卡的终态如何留痕（不破坏「只追加」）？ | 不裁决 ⇒ 法七最严口径（伴随 = 行内带恢复 chip）无法落地或与冻结契约冲突（Q-ALLN-009） | ① 行内 chip + 卡不 patch（点击另起 next 卡）② 卡壳带 chip + `error` 移出冻结集 ③ 紧随恢复卡（放宽为「紧随」） |
| **O-ALLN-010** | **法八「值不入流」的存储侧边界与机核面**：设计稿「已知取舍」明说只能保证**流内零明文**；**存储侧加密 / 生命周期**是否在本 Feature 内？零明文的机核面（`#stream` / 审计 / digest / 全部属性 / 日志）如何界定？ | 不裁决 ⇒ 安全口径不清（可能被误读为「存储已加密」）；判据边界不清导致漏扫 | ① 仅流内零明文（哨兵扫描 4 面 + 属性）+ 存储侧登记为 out-of-scope ② 含存储侧 ③ 流内零明文 + 存储侧仅登记口径 |
| **O-ALLN-011** | **G 稿是否入 `design-contract` 门禁**（X4）：入则新增 G 侧常量 + 127 行映射；不入则须显式登记「治理真空」并由其它判据兜底 | 不裁决 ⇒ 设计-实现一致性无机器证据（Q-ALLN-013 / R-ALLN-005） | ① 入契约（F 与 G 并存，各冻各的）② 新建独立 G 契约门禁 ③ 不入，显式登记为已知偏差 + 其它判据兜底 |
| **O-ALLN-012** | **是否需要外部竞品调研**（「聊天式 agent 面板如何组织授权 / 权限 / 密钥配置 / 管理面」） | 若需要而未做 ⇒ 方案论证缺外部参照；若不需要而未显式裁决 ⇒ 后续可能被质疑遗漏 | ① 不需要（已有 dsh 已核实对标 + LGDL `lgdl-web-op-cli` 仓库内参照）② 需要，登记为待调研项（交付前完成） |

### 7.5 证据台账（文件级）

| 路径 | 用途 |
|---|---|
| `packages/web-cli-plugin/design/ui-redesign/option-g-all-in-next.html` | **设计基准（定稿冻结）**：法七 / 法八 + 12 kind 契约 + NextProvider 契约 v2（架构区 §①~§⑧）+ 8 op 清单 + 死端对比表 + 授权态归属 + 口径说明区 + 已知取舍 + 自检 |
| `packages/web-cli-plugin/design/ui-redesign/option-g-shim.mjs` | G 稿 Node DOM 垫片（**127 断言**：§A~§N 组；含 §F 死端判定 / §E 零明文 / §H 注册表 / §M 授权态下移 / §N 契约 v2） |
| `packages/web-cli-plugin/design/ui-redesign/index.html` | 设计稿画廊（G 的立项依据 / 一句话定位 / 两法则摘要；非交付 UI） |
| `packages/web-cli-plugin/src/ui/sidepanel/recommend.ts` | 推荐器（4 规则 / 6 act 闭集 / 恢复触发集 / 7 真值源白名单 / 3 常量） |
| `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` | `handleCardAction` 手写 switch（16 分支）+ `authorizeCurrentSite()` 单一入口 + `requestTurn` + 拾取 / 救援路径 |
| `packages/web-cli-plugin/src/ui/sidepanel/cards/{error,nextstep,askuser,auth,ref}.ts` | `error` 卡（无 chip）· `nextstep` chip（`data-act`）· `askuser` 现有型 · `auth` 卡 · `ref` 卡恢复区 |
| `packages/web-cli-plugin/src/ui/sidepanel/stream-model.ts` | 12 kind 契约 / 出生冻结集 / 6 终态 / `MAX_OPEN_ASKS` / 仲裁常量 |
| `packages/web-cli-plugin/src/ui/sidepanel/statusbar.ts` | 状态栏单写者结构（J1~J4） |
| `packages/web-cli-plugin/src/ui/sidepanel/l0/{shell,risk-rail}.ts` | 风险位（含 `unauthorized` chip）+ `#l0-page-unavailable` 行 |
| `packages/web-cli-plugin/src/ui/sidepanel/pick-input.ts` + `view-model.ts` | 拾取不可用事实链（`pick.unavailable` → 风险行 + 可读原因） |
| `packages/web-cli-plugin/src/ui/settings/{sections,panel,ops,view}.ts` | 设置视图 8 分区 + 17 个设置操作 + 能力三态行 + 授权记录 |
| `packages/web-cli-plugin/src/ui/options/index.html` | 独立管理页（LLM / 能力撤销 / 合规 / 可选权限说明） |
| `packages/web-cli-plugin/src/background/messaging.ts` | `PluginMessageKind` / `KIND_SET` / type-only 先例家系 |
| `packages/web-cli-plugin/src/content/{content-script,pick-protocol}.ts` | `content.js` 打进 `KIND_SET` 的证据链 + 历史 +307 B 实测 |
| `packages/web-cli-plugin/src/background/service-worker.ts` | 未授权站点零注入错误文案（`:2197`）/ 救援零注入（`:2272`） |
| `packages/web-cli-plugin/src/platform/{extension-env,capability-permissions}.ts` | 站点 host 权限申请（`permissions.request`）+ 能力权限手势助手（SW 禁调） |
| `packages/web-cli-plugin/src/ui/sidepanel/host-registry.ts` | v4.5 后零宿主判据（`REGISTERED_STRUCTURAL_HOSTS = []`）+ 退役 / 迁移容器清单 |
| `packages/web-cli-plugin/src/ui/sidepanel/system-events.ts` | 单系统事件通道（净化 / 去重 / 速率 / 「持续：」） |
| `packages/web-cli-plugin/manifest.json` | 静态 5 / 可选 5 / host 6 / `optional_host_permissions` 2 |
| `packages/web-cli-plugin/test/design-contract.test.ts` | 设计契约门禁（只冻 F：双 sha + 60 断言 + 60 行映射） |
| `packages/web-cli-plugin/test/{capability-wiring,binding-wiring,auto-session-wiring}.test.ts` | 权限面精确集合判据（静态 / 可选 / host / SW 禁 `.request(`） |
| `packages/web-cli-plugin/test/{recommendation-sources,local-act-wiring,authorize-chip-wiring}.test.ts` | 推荐器判据（源白名单 / 闭集逐字 / 单一入口） |
| `packages/web-cli-plugin/test/size-baseline.ts` + `test/size-budget.test.ts` | `SIDEPANEL_BASELINE_BYTES = 498_521` / `SIDEPANEL_CEILING = 523447` / 五要素登记册 / V3-VOL-3 三值 |
| `packages/web-cli-plugin/docs/v4-supersession-ledger.json` | 保护段八步 + active pins + `supersessionChain` + `redlineRemap` + `knownLimitations` + `v3Vol3Closeout` + `designContractChanges`（空） |
| `packages/web-cli-plugin/docs/v3-supersession-ledger.json` | `zeroDiffFiles`（9 项，含 `src/ui/options/index.html` / `policy.ts` / `auto-authorize.ts`）+ 冻结历史口径 |
| `packages/web-cli-plugin/docs/v4-density-baseline.json` | 阈值 / 31 登记格 / `tiers` 三档读数 / `riskIncrementRegistry` / `streamRatioSpike` |
| `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v45-f-regularization/closeout.md` | **v5 的直接上游**：24 门禁总账 / 体积与保护段 / deferred 清单 / 人工面清单 / F 还原度终评 |
| `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v4-chat/closeout.md` | v4 收口总账（F 方案的结构性遗留来源） |
| `.sddu/specs-tree-root/ROADMAP.md`（v1.28.0） | 编号空间与版本位（F-30 / F-31 占用事实；`F-32` / `F-33` 零命中；`v0.10.0` 规划段 8 处命中；文档版本 1.28.0） |

> **证据缺口（如实登记）**：① **真机截图 / 录屏未入库**——断流序列来自作者提供的**文字逐字记录**（设计稿头注保留），本报告不声称有截图证据；② **外部竞品调研未执行**（§4.1）；③ **门禁计数全部引自 v4.5 收口总账 §3.1**（本轮未跑门禁 / 构建 / Chromium，零产品运行时验证）；④ **`op.perm.request` 的浏览器原生弹窗路径为设计稿描述**（Chromium headless 不可合成，见 `R-ALLN-014`），本轮未做真机验证。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（web-cli-plugin v5「All-in-Next 聊天即操作台」/ 方案 G 问题挖掘）：作者主题逐字 2 条 + 真机断流现场逐字 + 四层根因（R1~R4）源码映射；设计基准冻结登记（G 稿 273,621 B / sha `a7c0a77a…`；shim 88,529 B / sha `d0107ecb…`；**127/127 实跑绿**）；**F-32 零占用核验**（ROADMAP 0 命中；仓库唯一命中 = v4.5 产物文字说明，不构成占用）+ **v0.10.0 版本位核验**（8 处命中均为「AI 增强与生态」规划段，非 Feature 登记 ⇒ 建议同版并列新主题，登记留给收口）；范围（核心 6 + 附带 2）+ 非目标 8 项；问题清单 Q-ALLN-001~014（核心 5 / 次要 5 / 潜在 4）；假设 A-ALLN-001~010；风险 R-ALLN-001~016（含 Top5 + 门禁迁移量估计）；**红线继承 N1~N21 + 显式取代 X1~X6**（X1 = manifest 允许 optional_permissions / X2 = `op-*` 消息族 type-only / X3 = act 闭集 → op 注册表 / X4 = G 入 design-contract / X5 = 三档 → 连续宽度 / X6 = chip `data-act` → `data-op`）；开放问题 O-ALLN-001~012；叶子拆分草案 4 叶（v5-1 ~ v5-4，串行）；现状基线 §7.1 A~G 全量 `file:line` 证据 | 2026-09-22 | SDDU Discovery Agent |
