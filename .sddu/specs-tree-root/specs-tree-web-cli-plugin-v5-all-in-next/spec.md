# Feature Specification：specs-tree-web-cli-plugin-v5-all-in-next（web-cli-plugin v5「All-in-Next 聊天即操作台」）

> **文档定位**: SDDU 需求规范 — 定义功能需求、非功能需求和边界情况，作为 plan 阶段的输入
> **前置依赖**: 本目录 `discovery.md` v1.0（2026-09-22）——问题清单 **Q-ALLN-001~014**（核心 5 / 次要 5 / 潜在 4）/ 假设 **A-ALLN-001~010** / 风险 **R-ALLN-001~016** / 开放问题 **O-ALLN-001~012** / 现状基线 §7.1（全量 `file:line` 证据）/ 红线继承 **N1~N21** + 显式取代 **X1~X6** / 门禁影响面预判 §7.3
> **直接输入**: ① 作者主题指示（2026-09-21，逐字）② 真机断流现场（23:12:51~23:12:59，逐字）③ 作者 5 裁决 + ⑧ 反馈（已确认）④ 编排器代作者决策 D1~D7 + 开放问题裁决（O-001~O-012，2026-09-22 定稿）
> **设计基准**: `packages/web-cli-plugin/design/ui-redesign/option-g-all-in-next.html`（sha256 `a7c0a77ac6253e32d1ccef894f32eb8d0dc2d10c99f145261a69ebc699cc83c9`，273,621 B / 4,308 行）+ `option-g-shim.mjs`（sha256 `d0107ecbbd56edfe19592e256a66d27fb3d1c5c1a2d87c1773364f4520e609ce`，88,529 B，**本轮实跑 127 passed / 0 failed，退出码 0**）；F 稿基准 `option-f-chat-stream.html`（`49ce27fc…`）+ `option-f-shim.mjs`（`8ca5db6f…`，60 断言，`test/design-contract.test.ts` 冻结）**双稿并存**
> **创建人**: SDDU Spec Agent
> **创建时间**: 2026-09-22
> **版本**: v1.0
> **更新人**: SDDU Spec Agent
> **更新时间**: 2026-09-22
> **更新说明**: 初始创建（web-cli-plugin v5「All-in-Next 聊天即操作台」需求规范：父 Feature = 轻量规范容器 + **3 个叶子子 Feature**（依存序）；含编排器对 O-ALLN-001~012 十二条开放点的逐条裁决落位 + X1~X6 显式取代的判据等价重写映射 + N1~N21 红线继承逐条承载）

web-cli-plugin v5「All-in-Next 聊天即操作台」需求规范 —— 把作者主题（**所有需要用户操作的地方都在 chat 里以 next 的方式闭环，不允许跳来跳去**）转成可验收的需求：**新增法七（一切操作皆 Next，禁止死端）+ 法八（值不入流）**；把每类操作抽象为 **web-op 操作清单（9 个 op）**，由 **NextProvider 插件注册表**（契约 v2 七点）驱动，统一管线 **next chip →（参数? 流内 ask 卡）→（同意? 流内 auth 卡）→ execute → 流内回执**；授权态**下移状态栏常显 chip** 作为唯一载体；侧栏宽度改**连续可拖动 280–640**。编号一律 `FR-ALLN-*` / `NFR-ALLN-*` / `EC-ALLN-*` / `AC-ALLN-*` / `NG-ALLN-*`（与 v1/v2/v3/v4/v4.5 零冲突）。**父 Feature 定位 = 轻量规范容器**（不承接 build/review/validate，不产出 tasks.json），实施由 **3 个叶**按依存序承接。

**题眼（本 Feature 名 `all-in-next` 的语义）**：v4 把「一切交互皆消息」做成了行为、v4.5 把流做成了纯时间序，但**「下一步」这件事仍然不保证**——真机上「未授权」阻塞终态之后**流内零可达 next**（死端）。v5 的题眼 = **把「下一步」从「各 provider 自愿提供」升级为「管线强制保证」**：阻塞终态出现后，流内**必然**存在可达的下一步；而这条保证之所以能长期成立，靠的不是多加几个分支，而是把操作收进**可逆注册的插件注册表**（新增操作 = 注册插件，主流程 diff = 0）。

---

## 1. 元数据

| 字段 | 值 |
|------|-----|
| Feature ID | specs-tree-web-cli-plugin-v5-all-in-next（web-cli-plugin v5「All-in-Next 聊天即操作台」，ROADMAP **F-32**） |
| 名称 | web-cli-plugin v5「All-in-Next 聊天即操作台」——法七（一切操作皆 Next，禁止死端）+ 法八（值不入流）+ web-op 统一管线（9 op）+ NextProvider 插件注册表（契约 v2 七点）+ 授权态下移状态栏常显 chip + 连续可拖动宽度（280–640） |
| 优先级 | P0（核心） |
| 目标版本 | **v0.10.0**（「AI 增强与生态」既有规划段 = **同版并列新主题**；ROADMAP 实测 `v0.10.0` 8 处命中但**均非 Feature 登记**；登记留给收口。措辞区分于 v0.9.1（维护段）与 v0.9.0（三主题并列）。**ROADMAP 登记由收口执行**——本阶段一字未改） |
| 分支 | `feature/web-cli-plugin`（与 v1/v2/v3/v4/v4.5 同分支继续堆；**不合 main、不发布**；`main` 未动 = `2ddc922`） |
| 当前 HEAD | `4c1dbe1`（2026-09-22，discovery 产物）；基线产物 `dist/sidepanel.js` = **498,521 B** |
| 上游/底座 | v1 `specs-tree-web-cli-plugin`（F-14）+ v2 `specs-tree-web-cli-plugin-v2-insight`（F-27）+ v3 `specs-tree-web-cli-plugin-v3-ui`（F-28）+ v4 `specs-tree-web-cli-plugin-v4-chat`（F-30）+ v4.5 `specs-tree-web-cli-plugin-v45-f-regularization`（F-31）—— 全部**只读复用、零改写** |
| 目录深度 | depth=1（父 Feature，轻量规范容器）；子 Feature = **3 个叶**（depth=2，见 §14） |
| 叶子 | ① `specs-tree-v5-1-next-registry-pipeline`（契约 v2 注册表 + op 管线 + act→opId + 瘦分发 + 双契约 + 证明义务机核）→ ② `specs-tree-v5-2-ops-first-batch`（9 op 落地 + SW 执行器 + `optional_permissions` + 掩码 llm-config + settings 收编 + **断流首验收**）→ ③ `specs-tree-v5-3-chrome-face`（授权 chip + 可拖动宽度 + 密度连续口径 + 死端守护门禁 + 法八机核）**依存序，必须串行** |
| 相关干系人 | 作者（插件当前唯一真实用户 + 立项人 + 唯一决策者；**已授权编排器代行决策、全流程自行调度**，2026-09-21 定稿确认）；编排器（D1~D7 + O-001~O-012 裁决）；下游 @sddu-plan / @sddu-tasks / @sddu-build / @sddu-review / @sddu-validate |
| 关联问题 | Q-ALLN-001~005（核心）/ Q-ALLN-006~010（次要）/ Q-ALLN-011~014（潜在） |
| 关联风险 | R-ALLN-001~016（discovery 继承）+ R-ALLN-901~910（spec 新增，见 §15.2） |

---

## 2. 上下文

### 2.1 立项来源（**作者原话逐字，不得转述走样**）

| # | 作者原话（逐字） | 落地形态 |
|---|---|---|
| Q1 | 「所有的用户授权、权限申请、绑定、浏览器权限申请、LLM配置等，都要支持抽象成web-op-cli（类似LGDL的lgdl-web-op-cli），都要支持一站式在chat里面闭环」 | §5.5 **web-op 操作清单（9 op）** + §5.4 **NextProvider 契约 v2 七点** |
| Q2 | 「所有的下一步需要用户操作的地方，都要支持在chat里面以next的方式和用户交互完成，不允许让用户跳来跳去」 | §5.2 **法七「一切操作皆 Next，禁止死端」** + §9.1 **S2 断流样板机器化首验收**（AC-ALLN-001） |

### 2.2 真机断流现场与四层根因（**逐字保留，不美化**）

```
23:12:51 ✓ 已绑定站点 https://open.bigmodel.cn，正在自动探测 web-cli 声明。
23:12:51 站点探测状态变化：已按相位变化登记（稳态不重复）｜正在自动探测…
23:12:51 下一步推荐：重新绑定当前标签页 / 重新拾取 / 改用描述
23:12:57 ✓ 已重新绑定当前标签页：https://open.bigmodel.cn
23:12:59 ✖ 页面侧不可用：未授权站点 https://open.bigmodel.cn：页面侧零注入
```

| # | 根因（设计稿头注逐字要点） | 仓库侧证据（`file:line`） | 本规范承载 |
|:-:|---|---|---|
| **R1** | 授权 chip 仅存在于 R-ONBOARDING（首装态）——非首装的未授权会话里，没有任何 provider 会给出「授权本站点」的推荐 | `src/ui/sidepanel/recommend.ts:296-307`（谓词含 `firstRun`） | FR-ALLN-013 / 085 |
| **R2** | risk-recovery 三动作（重绑 / 重拾 / 描述）无一能解除「未授权」——推荐看似给了出路，实际是三条死路 | `recommend.ts:208-214`（`RECOVERY_CHIP_ORDER.site = ['rebind','repick','describe']`，无 `authorize`）；`:112-134` | FR-ALLN-012 / 013 |
| **R3** | ✖ 错误行不带恢复入口——错误行「裸奔」 | `src/ui/sidepanel/cards/error.ts:1-27`（只渲染 `bubble.textContent`，零 chip）；`stream-model.ts:129-140`（`error ∈ BORN_FROZEN_KINDS`） | FR-ALLN-012 |
| **R4** | 结果是死端：阻塞终态（未授权）出现后，流内不存在任何可达的 next | 综合 R1~R3；`service-worker.ts:2197` → `pick-input.ts:189` → `l0/shell.ts:153-163`（风险位一行，无恢复入口）；`sidepanel.ts:1993`（救援失败只 `dispatch({type:'notice'})`） | FR-ALLN-010~016 |

### 2.3 作者裁决（**已确认，2026-09-21**）与 ⑧ 反馈

| # | 裁决 | 本规范承载 |
|---|---|---|
| ① | **manifest 允许新增 `optional_permissions`**（运行时按需申请浏览器权限；**安装期权限不变**） | FR-ALLN-110（X1）/ 043 / NFR-ALLN-009 |
| ② | **敏感值掩码卡内输入 + 零明文留痕**（法八） | FR-ALLN-020~024 |
| ③ | **设计稿 F 式交互 HTML + shim 契约**（已定稿冻结；体例逐节镜像 F） | FR-ALLN-100~102（X4） |
| ④ | **设置视图保留为管理面**（法六不变：chat 是入口之一，不是替代） | FR-ALLN-075~078（收编，不是替代） |
| ⑤ | **真机断流缺陷并入 G 首验收场景**（S2 = 断流样板，首验收） | FR-ALLN-016 / AC-ALLN-001 |
| ⑧ | 「『未授权 · 零注入』『已授权 · supported』这两项如果属于状态，那就放到最下面的状态栏，上面属于工具、菜单栏，不应该放这两个。」 | FR-ALLN-085~088（授权态下移状态栏常显 chip，零双写） |

### 2.4 设计基准与冻结（**本轮实测 sha256 / 断言实跑**）

| 冻结对象 | 大小 / 行数 | sha256（本轮实测） | 机核状态 |
|---|---|---|---|
| `design/ui-redesign/option-g-all-in-next.html` | **273,621 B** / 4,308 行 | `a7c0a77ac6253e32d1ccef894f32eb8d0dc2d10c99f145261a69ebc699cc83c9` | 待入契约（本 Feature，FR-ALLN-101） |
| `design/ui-redesign/option-g-shim.mjs` | **88,529 B** | `d0107ecbbd56edfe19592e256a66d27fb3d1c5c1a2d87c1773364f4520e609ce` | **实跑 127 passed / 0 failed**（退出码 0）；`check(` 调用点 127 处 + 1 处声明 |
| `design/ui-redesign/option-f-chat-stream.html` | — | `49ce27fc1daba083cc361639d3d0a1ad991b961f0fa0f45fc016815e0fe2e526` | **已冻结**（`test/design-contract.test.ts:71 DRAFT_SHA256`），**不得替换**（N21） |
| `design/ui-redesign/option-f-shim.mjs` | — | `8ca5db6f7a152c2890814cff2fe58dc11345338890b26de62b3355837f591ed4` | **已冻结**（`:70 SHIM_SHA256` / `:73 SHIM_CHECK_CALLS = 60`），**不得替换**（N21） |

**G shim 断言分组（127 条，实测分区计数）**：

| 组 | 条数 | 语义 |
|---|:--:|---|
| §A | 6 | 三区结构继承（与 F 逐字同口径） |
| §B | 5 | 12 kind 卡继承（7 主类 + 5 过程卡；零新增） |
| §C | 8 | `askuser` 扩形（`secret` / `form` / `choice`）+ 操作前 → 操作后固化 |
| §D | 6 | `auth` / consent 卡：批准 / 拒绝 → 固化 |
| §E | 7 | **法八 值不入流**（哨兵值在流内 / digest / 全属性零出现） |
| §F | 11 | **法七 一切操作皆 Next，禁止死端**（5 类阻塞逐一 + ✖ 行不裸奔） |
| §G | 8 | chip ↔ op 绑定（`data-op`）+ op 管线四态 |
| §H | 7 | NextProvider 注册表视察器（N→N+1→N / 重复 id loud） |
| §I + §I2 | 9 + 8 | 场景切换 / 密度 / 宽度主题 / 风险 chip / 视图；**可拖动分隔条**（280–640 · ARIA separator · 键盘 · clamp） |
| §J | 5 | 死端对比表 / 演进表 / 架构区 |
| §K | 3 | 收尾：默认态复位 + 交付物硬约束 |
| §L | 4 | 场景闭环补强（S1 / S4 / S5 + 场景键一致性） |
| §M | 23 | **授权态下移**（工具栏零四词 · 常显 chip 两态原文 · 黄 → 流内产 next · 绿 → 管理详情 · 零双写 · 6 ≤ 7 对账 · §M20/§M21 真实浏览器回归） |
| §N | 17 | **架构依据回注**：deepseek-harness 已核实引用 + Cordis 出处 + **契约 v2 七点**逐点 ≥1 条 |
| **合计** | **127** | — |

> **G 与 F 的关系（约束，不是需求）**：G **继承** F 的设计令牌 / 组件样式语言 / 双主题 / 三区骨架（`header[role=toolbar] > main[role=log] > footer[role=contentinfo]`，结构语义与顺序逐字不变）/ 法一~法五与密度口径 / 12 kind 卡类型学与固化契约；G **新增**法七 / 法八两条法则，并**修订**工具栏构成（授权态下移）。**v5 不触碰 `design/**`**——G 稿是本轮唯一权威基准，实现服从设计稿，不是设计稿服从实现。

### 2.5 编排器代作者决策承接（**定论，直接作为需求约束，不重新讨论**）

| # | 决策（discovery §0.5 逐字） | 本规范承载体 |
|---|---|---|
| D1 | **作者已授权编排器代行决策、SDDU 全流程自行调度** | §16 纪律；§11 裁决记录 |
| D2 | **Feature 目录 = `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v5-all-in-next/`** | §1 / §14 |
| D3 | **ROADMAP 编号 = F-32**（本轮实测 ROADMAP 0 命中；`F-29` A2A 候选保持原样不动） | §1 / NG-ALLN-013 |
| D4 | **版本位 = v0.10.0（新主题，与「AI 增强与生态」并列；不是维护段）**；登记留给收口 | §1 |
| D5 | **范围 = 法七无死端 + web-op 管线与 NextProvider 注册表 + 浏览器权限 / LLM 配置 / 撤销流内闭环 + 授权态下移状态栏 + 可拖动宽度** | §3.1 / §5 |
| D6 | **纪律：`.sddu/**` 只写本 Feature 目录；不改任何 `src/`、`test/`、`dist/`、`design/`、`docs/` 与 ROADMAP**（spec 阶段 = 纯文档阶段，零运行时验证） | §16 / NG-ALLN-013 / NG-ALLN-014 |
| D7 | **设计稿已定稿冻结**（`05f612e` 三轮优化终稿 + 127 断言全绿）；**不修改、不重排设计稿** | NG-ALLN-018 / FR-ALLN-100 |

### 2.6 编号命名空间声明（**强制**）

| 命名空间 | 本 Feature 使用 | 历史占用（**零冲突，禁止复用**） |
|---|---|---|
| 功能需求 | `FR-ALLN-###` | v1 `FR-001~055`；v2 `FR-V2-001~079`；v3 `FR-V3-001~087`；v4 `FR-CHAT-001~094`；v4.5 `FR-V45-001~093` |
| 非功能需求 | `NFR-ALLN-###` | v1 `NFR-001~010`；v2 `NFR-V2-*`；v3 `NFR-V3-*`；v4 `NFR-CHAT-*`；v4.5 `NFR-V45-001~008` |
| 边界情况 | `EC-ALLN-###` | v1 `EC-001~026`；v2 `EC-V2-*`；v3 `EC-V3-*`；v4 `EC-CHAT-*`；v4.5 `EC-V45-001~013` |
| 验收标准 | `AC-ALLN-###` | v1 `AC-001~012`；v2 `AC-V2-*`；v3 `AC-V3-*`；v4 `AC-CHAT-*`；v4.5 `AC-V45-001~022` |
| 非目标 | `NG-ALLN-###` | v2 `NG-V2-*`；v3 `NG-V3-*`；v4 `NG-CHAT-*`；v4.5 `NG-V45-001~017` |
| 其他 | `G-ALLN-###` / `US-ALLN-###` / `DC-ALLN-###`（裁决记录）/ `R-ALLN-9xx`（spec 新增风险）；`Q-ALLN-###` `A-ALLN-###` `R-ALLN-0xx` `O-ALLN-###` `X1~X6` `N1~N21`（沿用 discovery） | — |

### 2.7 目标用户

> **口径声明（如实）**：本 Feature 的受影响用户 = **插件的唯一真实使用者（作者本人）+ 唯一决策者**，与 v3/v4/v4.5 同一事实基础。**本规范不编造用户调研数据**。

| 角色 | 场景 | 本 Feature 的改善目标 |
|------|------|---------------------|
| **作者（插件唯一真实用户 + 唯一决策者）** | 真机侧栏：打开未授权新站点（非首装）→ 绑定 → 自动探测 → 未授权 → ✖；或想配置 LLM / 申请浏览器权限 / 撤销授权 | ① **不再有死端**：每个阻塞终态后流内必有可达 next（S2 断流场景从「功能到此为止」变为「一步闭环」）；② **不再跳来跳去**：授权 / 权限申请 / LLM 配置 / 撤销都在流内以 next 闭环，设置视图退回管理面 |
| **未来使用者（尚未存在，仅作推理边界）** | 非首装会话（已装插件、未授权新站点） | **R1 的直接受害者**在 v5 后获得授权入口（`site.unauthorized` 常驻候选）。**登记为假设 `A-ALLN-002`，标注「待验证」——不得据此声称普适收益** |
| **下游维护者（AI Agent / 未来重构者）** | 需要回答「新增一种需要用户操作的入口，要改哪些文件？」 | 答案变成「**注册一个 provider + 自带测试**」——`handleCardAction` 分发器 **per-op diff = 0** 由机核强制；扩张不再被架构锁死（Q-ALLN-003） |

### 2.8 现状事实核对（**spec 阶段只读复核，零运行时验证**）

| # | 事实 | 证据（`file:line`） | 本规范用途 |
|:-:|---|---|---|
| A1 | 候选来源 = **4 条手写规则**（`risk-recovery` > `ref-action` > `onboarding` > `capability-discovery`） | `recommend.ts:52` + `:272-320` | FR-ALLN-030~038 / 112 |
| A2 | 动作语义 = `NEXTSTEP_ACTS` **6 项闭集**（逐字 `['next','repick','describe','authorize','rebind','help']`），被门禁**逐字**钉死 | `recommend.ts:194` + `test/local-act-wiring.test.ts:269` + `test/recommendation-sources.test.ts:281` | FR-ALLN-056 / 112（X3） |
| A3 | chip 绑 `data-act`（动作字符串），**不是** opId | `cards/nextstep.ts:59` | FR-ALLN-057 / 115（X6） |
| A4 | 点击分发 = `handleCardAction` **手写 switch（16 个 `if` 分支）** + 兜底「将在 v4-3 / v4-4 落地」告知 | `sidepanel.ts:184-277`（兜底在 `:275`） | FR-ALLN-058 |
| A5 | 真值源白名单 **7 项**（`ref`/`session`/`site`/`catalog`/`probe`/`risk`/`onboarding`）+ 模块 import 白名单（仅 `./stream-plaintext.js`） | `recommend.ts:59-74` + `test/recommendation-sources.test.ts` | FR-ALLN-030 / 120 |
| A6 | 恢复触发集 5 项（`refInvalid`/`declarationInvalid`/`hardFloor`/`site`/`probe`）；`RECOVERY_CHIP_ORDER.site` 无 `authorize` | `recommend.ts:98-105, 208-214` | FR-ALLN-013 |
| A7 | 单卡 chip 上限 3 / 每回合推荐卡上限 1 / 最小间隔 10 s（防抖） | `recommend.ts:43, 46, 56` | NFR-ALLN-001 / EC-ALLN-010 |
| A8 | `error` 卡只渲染文本气泡，**零 chip / 零控件**；`error ∈ BORN_FROZEN_KINDS`（只追加、除 bound 外不移除） | `cards/error.ts:1-27` + `stream-model.ts:129-140` | FR-ALLN-012（O-009 落层裁决） |
| A9 | 12 kind = 7 主类（`ai/user/nextstep/askuser/auth/system/ref`）+ 5 过程卡（`tool/command/thinking/error/notice`）；`askuser` 现有型 choice / text / confirm（**无 secret / 无 form**） | `stream-model.ts:72-78` + `cards/askuser.ts:74-228` | NG-ALLN-001 / FR-ALLN-020 |
| A10 | 6 个终态 + `MAX_OPEN_ASKS = 2` + `ASK_CANCEL_REASONS`（`user`/`timeout`/`superseded`/`aborted`） | `stream-model.ts:86-121` | EC-ALLN-010 |
| B1 | 设置视图 **8 个分区**；`SettingsOps` 单口暴露 **17 个设置操作** | `settings/sections.ts:35-44` + `settings/ops.ts:122-149` | FR-ALLN-075~078 / 049 |
| B2 | LLM 配置面（`#settings-provider` / `#settings-apiKey` / `#settings-model` / `#settings-baseURL` / `#settings-maxRounds` / 保存 / 测试连接 / 清除） | `settings/panel.ts:130-179` | FR-ALLN-042 / 075 |
| B3 | 唯一手势权限申请路径（`requestCapabilityPermissionOnGesture`）；门禁明确「SW 永不调用 `.request(`」 | `platform/capability-permissions.ts` + `settings/panel.ts` + `test/capability-wiring.test.ts:51-58` | FR-ALLN-043 / EC-ALLN-007 |
| C1 | `PluginMessageKind` / `KIND_SET` 定义在 `background/messaging.ts`，被 `content-script.ts` **直接 import** ⇒ 打进 `content.js`；历史实测往 `KIND_SET` 加 6 个字符串 = `content.js` **+307 B** | `messaging.ts:103-141` + `content-script.ts:20` + `content/pick-protocol.ts:9-15` | FR-ALLN-067（X2） |
| C2 | 既有先例：`command-policy` / `pick-layer-*` / `ref-rescue` **type-only**，不进 `KIND_SET`，运行时校验落独立模块 | `messaging.ts:68-89` + `insight-protocol.ts:29-41` + `pick-protocol.ts:51-61` | FR-ALLN-067 |
| D1 | 状态栏 = `#region-statusbar` + `#statusbar-text` + `#risk-chips`，**单一写入者**（J1 永不折叠 / J2 有风险才显 chips / J3 祖先无折叠 / J4 视图切换不触碰） | `statusbar.ts:1-70` | FR-ALLN-085~088 / 092 |
| D2 | 工具栏摘要含授权态（`band.origin` 文案 + `已授权` / `未授权`）；风险 rail 含条件性 `unauthorized` chip | `view-model.ts:824, 894-902` + `l0/risk-rail.ts:29-40` | FR-ALLN-086（零双写） |
| D3 | 密度豁免唯一声明点 = `#stream`；阈值 `default 7/15 · firstRun 9/20 · risk 17/35`；31 登记格（28 实测 + 3 名义） | `density-scope.ts:29-60` + `docs/v4-density-baseline.json#thresholds` | FR-ALLN-091 / 114（X5） |
| D4 | 零宿主判据：`REGISTERED_STRUCTURAL_HOSTS = []`（v4.5 清零）；「任意深度零 `[data-host]` / `[data-transitional-host]`」 | `host-registry.ts:105, 187, 200` | FR-ALLN-121 / NG-ALLN-016 |
| E1 | `manifest.json`：静态 `permissions` 5 项 `['activeTab','scripting','storage','sidePanel','tabs']` / `optional_permissions` **5 项**（`bookmarks`/`downloads`/`notifications`/`clipboardRead`/`clipboardWrite`）/ `host_permissions` 6 条 / `optional_host_permissions` 2 条（`http://*/*` `https://*/*`）/ `minimum_chrome_version` 116 | `manifest.json` + `test/capability-wiring.test.ts:20-50` | FR-ALLN-110（X1）/ EC-ALLN-007 |
| F1 | 体积：`dist/sidepanel.js` = **498,521 B**；生效上限 **523,447 B** = `floor(498,521 × 1.05)`；余量 **24,926 B（+5.00%）**；距档位 **13,479 B**；距绝对上限 **64,679 B** | `test/size-baseline.ts:301` + `test/size-budget.test.ts:47,53` | FR-ALLN-130~134 |
| F2 | 档位 **512,000 B** / 绝对上限 **563,200 B**（= 档位 × 1.10）；`SIDEPANEL_CEILING_CAP = record-only`；`authorConfirmation.status = pending-author-line` | `docs/v4-supersession-ledger.json#v3Vol3Closeout` | FR-ALLN-131~132 |
| F3 | 红线产物：`dist/content.js` **177,076 B** / sha `52a826205553b46a896ccad54225d63ba62f5f7fe7c969a9bc2e655448d5b5f6`；`dist/pick-layer.js` **33,900 B** / sha `5f567d7ededc58183afe4ce45e3293b68204dfbe788dc6b9fb09bdc6e0d13e59` | 本轮实测 | FR-ALLN-133 / AC-ALLN-022 |
| G1 | `design-contract` 门禁只冻结 **F**（`SHIM_CHECK_CALLS = 60` + F 双 sha）；`designContractChanges = []` | `test/design-contract.test.ts:60-73` + `docs/v4-supersession-ledger.json` | FR-ALLN-100~103（X4） |
| G2 | G 稿与 G shim **不在任何门禁内**（`grep -rn option-g test/ src/ docs/` = **0 命中**） | discovery 实测 | FR-ALLN-101 |
| H1 | 门禁计数（**引自 v4.5 收口总账 §3.1，spec 阶段未复跑**）：`npm test` **1045** · supersession **35** · gate-integrity **13** · zero-injection **27** · design-contract **6** · ref-pick-wiring **11** · size-ruling-vol3 **12** · l0 **244** · l1 **116** · l2 **74** · density **232** · journey **171** · insight **116** · binding **192** · hardening **24** · stream **63** · ask-auth **61** · recommendation **59** · page-input **108** · l1-reverse **9** · l2-reverse **10** · e2e PASS | v4.5 `closeout.md` §3.1 | AC-ALLN-020 / 025 |
| H2 | 保护 pin：journey `43054..58287` / sha `cc79f413…` / **240 行**（`supersessionChain` 3 链节）；binding `107780..115930` / sha `be9ad0e9…`（`decision = keep`） | `docs/v4-supersession-ledger.json#protectedRanges` | FR-ALLN-122 / AC-ALLN-018 |

### 2.9 与上游 Feature 的关系（**边界**）

- **只读复用**：三区 flex 布局与 `#view-host` 视图替换机制；流内卡族（`cards/index.ts#CARD_TYPES`）；单系统事件通道（`system-events.ts`：净化 / 去重 5000 ms / 限速 20 行·分钟 / `持续：` 前缀）；`askuser` / `auth` 终态机（6 终态 + `MAX_OPEN_ASKS = 2`）；`ref` 卡与 `l1/ref-store`；`l2/counts` 计数单源；设置视图 `SETTINGS_SECTION_IDS` 单源；`authorizeCurrentSite()` 单一入口先例（f-fidelity-fix 轮 FIX-1）。
- **零改写**：v1~v4.5 的 spec/plan/tasks/build/review/validate 产物一字不动；`docs/v3-supersession-ledger.json` 为**冻结历史，不得解冻**。
- **继承义务**：取代台账八步机制（`docs/v4-supersession-ledger.json`）；体积五要素重登记 + 披露算术机核；密度 31 格台账机制；RP 反证机制；`KL-N-10` / `KL-N-08` 已知识别；门禁严格串行纪律。

---

## 3. 目标与非目标

### 3.1 目标 (Goals)

| # | 目标描述 |
|---|---------|
| G-ALLN-001 | **无死端（法七）**：5 类阻塞终态（未授权 / 未配置 / 权限缺失 / 绑定失效 / 引用全失效）在流内**必有可达的下一步动作**；✖ 错误行**不裸奔**（行内带恢复 chip）；死端判定 N = 0（同屏紧随），死端 = 0 可机核。 |
| G-ALLN-002 | **一站式闭环（不跳来跳去）**：授权 / 浏览器权限申请 / LLM 配置 / 撤销与管理 / 拾取 / 描述 / 帮助 / 回合发起，共 **9 个 op** 全部在流内以 next 闭环完成；设置视图**保留为管理面**（法六不变），但不再是这些操作**唯一**入口。 |
| G-ALLN-003 | **值不入流（法八）**：敏感值（API Key 等）经**掩码输入卡**直达存储；流内只留「事实 + 时间戳 + 掩码长度」；`digest` / 审计 / DOM value **四面零明文**可机核。 |
| G-ALLN-004 | **架构可扩张（anything-is-plugin）**：操作收进 **NextProvider 插件注册表**（契约 v2 七点：可逆注册 / 依赖声明式 / 优先级显式化 / 分发模式公开契约 / 失败语义分级 / Seam 三件套 / 证明义务表）；**新增操作 = 注册一个 provider**，`handleCardAction` 分发器 **per-op diff = 0** 由静态机核强制。 |
| G-ALLN-005 | **状态归属清晰**：授权态**下移状态栏常显 chip**，成为授权态全 UI **唯一常显载体**；工具栏四词零出现；风险 rail 授权类并入（**零双写**）；默认可点 **6 ≤ 7** 不破法五。 |
| G-ALLN-006 | **形态贴近真实使用**：侧栏宽度改为**连续可拖动 280–640**（ARIA `separator` + 键盘可达 + clamp + 双击复位），窄屏兜底改由 `data-narrow`（≤360px）触发；密度**登记格口径与宽度解耦**（格 = 控件计数），320px 仍为验收锚点。 |
| G-ALLN-007 | **治理面收口**：G 稿 + 127 断言**入 `design-contract` 门禁**（与 F 的 60 断言**并存**，F 冻结不替换）；X1~X6 六项显式取代全部走**判据等价重锚**（不失断言力、计数只增）；`designContractChanges` 显式登记。 |
| G-ALLN-008 | **首验收机器化**：真机 S2 断流样板（23:12:51~23:12:59）在 headless 下**全链复刻**为回归判据（绑定 → 未授权 → ✖ 阻塞 → 授权 next → auth 卡 → execute → ✓ 回执 → 探测恢复 → 拾取 next），断言「**死端 = 0**」；浏览器原生弹窗体感如实入人工面。 |

### 3.2 非目标 (Non-Goals)

| # | 明确不做 |
|---|---------|
| NG-ALLN-001 | **不新增卡类型**：12 kind = 7 主类 + 5 过程卡契约不动；`askuser` **扩形**（`secret` / `form`）与「回执复用固化区 + 系统行」都落在既有 taxonomy 内（设计稿 §⑧）。 |
| NG-ALLN-002 | **不改三区法则本身**（法一~法五 / 工具栏 ≤5 可点 / 流 = 唯一交互面 / 状态栏永不折叠）；G 只在法七 / 法八**新增**两条，并**修订工具栏构成**（授权态下移）。 |
| NG-ALLN-003 | 不改 `src/content/**` / `dist/content.js` / `dist/pick-layer.js`（**零容差冻结**：177,076 B / 33,900 B 逐字节）。 |
| NG-ALLN-004 | 不动判定链（`src/security/policy.ts` / `auto-authorize.ts`，内容哈希 pin）与 `zeroDiffFiles` 冻结面（9 项）；`docs/v3-supersession-ledger.json` **零 diff**。 |
| NG-ALLN-005 | **不新增安装期静态权限**：`manifest.permissions` / `host_permissions` / `content_scripts` 逐字不变；**只放开 `optional_permissions`**（作者裁决①）；不得新增 `<all_urls>` / `*://*/*`；`minimum_chrome_version` 保持 116。 |
| NG-ALLN-006 | **不改 `KIND_SET`**：`op-*` 消息族走 **type-only** 先例（不进 `KIND_SET`，运行时校验落独立模块）。若主张进 `KIND_SET`，须先证 `content.js` **逐字节零增长**（默认禁止）。 |
| NG-ALLN-007 | **不放宽任何阈值与口径**：密度 `7/15 · 9/20 · 17/35` 逐字不动；豁免只认 `hidden`；防滥用（单卡 ≤6 / 首屏 ≤2 / 合计 ≤8 / 欢迎卡 ≤1）不动；`STREAM_HEIGHT_RATIO_MIN = 0.65` **只允许上调**；chips ≤3 / 每回合 ≤1 张推荐卡不动。 |
| NG-ALLN-008 | **不删除、不降级任何断言**；唯一例外 = 保护段按台账 **显式八步取代**并留痕（**不是静默删除**）；断言计数**只增不减**。 |
| NG-ALLN-009 | **不设自缚装置**：`SIDEPANEL_CEILING_CAP` 保持 `record-only`（V3-VOL-1 ② 教训）；不引入新 cap。 |
| NG-ALLN-010 | **不静默替换 F 冻结常量**（N21）：F 的 `DRAFT_SHA256` / `SHIM_SHA256` / `SHIM_CHECK_CALLS = 60` / `ASSERTION_MAP` 必须继续成立。 |
| NG-ALLN-011 | **不收编会话 / 分组 / tabs 设置 / 诊断 / 主题 / 告警**（O-001 裁决：登记为 `deferred`，不阻塞本 Feature）；设置视图其余操作零改动。 |
| NG-ALLN-012 | **不做外部竞品调研**（O-012 裁决：登记「未执行，不阻塞」；**不编造竞品结论**）。 |
| NG-ALLN-013 | 不改 `ROADMAP.md`（F-32 / v0.10.0 登记留给收口）；`F-29`（A2A 候选）区段**一字不动**。 |
| NG-ALLN-014 | 不改 `packages/web-cli-base/**`；无新依赖；不合 main、不发布、不 force push；`git add` 必须 path-limited（**禁 `git add -A` / `.`**）；禁改 `.opencode/opencode.json`。 |
| NG-ALLN-015 | **不新增真值源**：注册表候选只读既有 state 字段；不新增 LLM 产物、不新增网络 / 隐私 / 成本面；不新增静态权限。 |
| NG-ALLN-016 | **不做 L2 视图内部重构**（tree / commands / audit 三视图既有内容不动）；不改零宿主判据（`REGISTERED_STRUCTURAL_HOSTS = []` 保持；本 Feature 新增状态栏 chip / 分隔条**不在流内**）。 |
| NG-ALLN-017 | **存储侧加密 / 生命周期不在本 Feature**（O-010 裁决：只保证**流内零明文**；存储侧边界显式登记为 out-of-scope，**不得被误读为「存储已加密」**）。 |
| NG-ALLN-018 | **不静默改设计稿**：`design/**` 与 shim 改动须同时满足 127 断言 + 更新 sha 常量 + 台账登记；**不修改、不重排 G 稿**（D7）。 |
| NG-ALLN-019 | **不把「恢复入口」实现为跳转设置页 / 打开视图**：法七要求 next **流内可达**；跳走不算达标（作者 Q2 逐字「不允许让用户跳来跳去」）。 |
| NG-ALLN-020 | **不以自动判据冒充人工验收**：浏览器原生权限弹窗体感 / 拖动性能 / 读屏 / 真机观感等 headless 不可合成项，逐项标注 `⏳ 未执行` 或 `PASS`，**不得冒充 PASS**。 |

---

## 4. 用户故事

| # | 作为… | 我想要… | 以便… |
|---|-------|---------|-------|
| US-ALLN-001 | 作者（未授权新站点，非首装） | 在流里看到「✖ 页面侧不可用：未授权站点 …」时，**同一行就有「授权当前站点」**，点它就能完成授权并继续 | 我不必猜「哪里能授权」，也不会卡在一个没有出口的终态上（真机断流不再复现） |
| US-ALLN-002 | 作者（想配置 LLM） | 在 chat 里被推荐「配置 LLM」，回答厂商 / 模型 / **掩码输入 API Key**，就完成配置 | 我不必离开流去设置页，而且**Key 不会留在聊天记录里**（法八） |
| US-ALLN-003 | 作者（想让插件能读剪贴板 / 书签） | 在 chat 里被推荐「申请浏览器权限」，勾选权限项 → 确认 → 浏览器弹窗 → 回执（**批准或拒绝都固化**） | 授权路径只有一条，拒绝也不是死端（法七对拒绝同样成立） |
| US-ALLN-004 | 作者（想撤销某项授权） | 在 chat 里点「撤销」，看到**不可逆说明**，确认后拿到回执与审计入口 | 高风险操作在流内有确认与留痕，不必去三个不同地方找撤销 |
| US-ALLN-005 | 作者（想知道当前授权状态） | 状态栏常显一枚 chip（黄「未授权 · 零注入」/ 绿「已授权 · supported」），点黄就产出授权 next，点绿就展开管理详情 | 状态归状态栏、工具归工具栏；同一状态**只有一个家**，不会三处投影各说各话 |
| US-ALLN-006 | 作者（长会话 / 拖侧栏） | 拖动侧栏左缘在 280–640 之间自由调宽（键盘也能调），窄到 ≤360 自动收敛 | 面板宽度贴合我当下的窗口，而不是只能三档切换 |
| US-ALLN-007 | 下游维护者（AI Agent / 未来重构者） | 新增一种「需要用户操作的地方」时，只**注册一个 provider** + 自带测试 | 主流程（`handleCardAction` 分发器）**一行都不用改**，且「有没有死端」由管线保证而不是靠我记得加分支 |
| US-ALLN-008 | 下游维护者（治理） | 「设计-实现一致」有**机器证据**（G 稿 127 断言入门禁）；六项旧红线被取代时**判据等价重锚**而非放宽 | 我不会把「实现偏离设计稿」或「依赖数悄悄变少」当成绿 |

---

## 5. 功能需求 (FR)

> 每组前缀含义：**GOV** 立案与纪律 / **LAW7** 法七无死端 / **LAW8** 法八值不入流 / **CONTRACT** 契约 v2 七点 / **OPS** 9 个 op / **PIPE** 管线与 act→opId / **SW** 执行器与消息族 / **SETTINGS** 设置面收编 / **CHROME** 授权 chip·宽度·密度 / **DESIGN** 双稿双 shim 契约 / **SUPERSEDE** X1~X6 显式取代 / **GATE** 门禁等价重锚与台账 / **VOL** 体积与 V3-VOL-3。

### 5.1 GOV — 立案、结构与纪律（横切）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-ALLN-001 | 本 Feature 使用独立编号空间 `FR-ALLN-*` / `NFR-ALLN-*` / `EC-ALLN-*` / `AC-ALLN-*` / `NG-ALLN-*`；ROADMAP 编号 **F-32**、版本位 **v0.10.0（同版并列新主题）** 仅在本规范登记，**不在本轮写入 ROADMAP**（留给收口） | `grep -c "F-32" ROADMAP.md` 仍为 0；ROADMAP 文件零 diff（`git diff --quiet -- .sddu/specs-tree-root/ROADMAP.md`） | P0 |
| FR-ALLN-002 | 父 Feature 为**轻量规范容器**（`depth=1`，不承接 build/review/validate，不产出 tasks.json）；实施由 **3 个叶**按依存序承接：`v5-1-next-registry-pipeline` → `v5-2-ops-first-batch` → `v5-3-chrome-face` | 父目录只含 `discovery.md` / `spec.md` / `TREE.md` / `state.json` + 3 个叶目录；叶 `state.json` `leaf:true` / `parent=specs-tree-web-cli-plugin-v5-all-in-next` / `deliveryOrder` 1..3 | P0 |
| FR-ALLN-003 | **断言零删除零降级、计数只增不减**：任何门禁断言只能**等价重写为新语义**（数量不减）或走**保护段显式取代**（唯一例外，须台账留痕） | 各门禁计数 ≥ 基线（§9.5 逐项清单）；`npm test ≥1045` | P0 |
| FR-ALLN-004 | **三叶共享面必须一次做完**：体积五要素重登记 / journey 结构重锚 / `design-contract` 登记 / 取代台账八步，四者被 ≥2 叶触碰 ⇒ **不可分叶**，须在同一轮以统一口径完成并留痕 | 四类共享面各自**恰一次**登记（台账 / 门禁可核）；无「两叶各改一次同一条目」 | P0 |
| FR-ALLN-005 | **本阶段（spec）零运行时验证**：所有数字与 `file:line` 均引自已入库产物与源码（discovery §7.1 + 本规范 §2.8）；未跑任何门禁 / 构建 / Chromium | 本轮 `git status --short` 仅含本 Feature 目录；`git diff --quiet -- packages/web-cli-plugin` 通过 | P0 |

### 5.2 LAW7 — 法七 一切操作皆 Next，禁止死端

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-ALLN-010 | **阻塞终态 5 类闭集**（设计稿法七逐字）：未授权 / 未配置 / 权限缺失 / 绑定失效 / 引用全失效。该闭集必须有**唯一声明源**（单一常量），任何「阻塞终态」判定都从它派生（禁止散落的字符串字面量） | 闭集常量从源文本抽取后恰为 5 项；「声明恰一次」扫描绿；新增阻塞类必须改单源 ⇒ 相关判据同步红 / 绿 | P0 |
| FR-ALLN-011 | **阻塞终态必有可达 next**：任一阻塞终态出现后 **N = 0 秒内**（同屏紧随），流内**必然存在**可达的下一步动作——形式为 ① 阻塞卡**行内**含 next chip，或 ② 其后**最近的同场景可见兄弟节点**是 `[data-msg-type="nextstep"]` 且含带 `data-op` 的 chip | 5 类阻塞**逐类**断言「行内或紧随存在可达 next」；判据可 FAIL 反证（移除该 chip ⇒ FAIL） | P0 |
| FR-ALLN-012 | **`error` 过程卡出生即带恢复区**（O-009 落层裁决）：错误行的恢复 chip 是**出生铸造的一部分**（不是事后改写）⇒ 阻塞类 `error` **出生即带恢复区**，非阻塞类**不带**。**append-only 冻结语义不破**：卡出生后仍只追加、不 patch；点击另起 next 卡 / ask 卡 | `cards/error.ts` 铸造路径区分「阻塞类（带恢复区）/ 非阻塞类（不带）」；阻塞类 `error` 卡行内含 `[data-act="next"][data-op]`；`BORN_FROZEN_KINDS` 语义与「出生后不 patch」断言全绿；反证：去掉铸造期恢复区 ⇒ 判据 FAIL | P0 |
| FR-ALLN-013 | **`site.unauthorized` 常驻候选**（修正 R1）：凡 `site.active ∧ !authorized` 即产出候选（**与 `firstRun` 无关**）；授权入口不再只存在于首装态 | 非首装未授权会话下，`site.unauthorized` provider 的 `when(ctx)` 返回 true 且 chips 含 `op.authorize`；反证：注入 `firstRun=false` 仍须产出 | P0 |
| FR-ALLN-014 | **拒绝不是死端**：consent（auth 卡）被拒绝 / 浏览器权限被拒 / ask 取消，均须**固化**该事实（留痕）并给出可达的后续 next（**不重试同一授权、不改既有授权**） | 拒绝路径断言「固化 + 可达 next」；`ASK_CANCEL_REASONS` 4 项闭集语义不变；反证：拒绝后无 next ⇒ FAIL | P0 |
| FR-ALLN-015 | **死端守护门禁**：① 阻塞态枚举逐类断言 ② N = 0 内 next 存在断言 ③ **死端 = 0** 判据（同屏扫描）④ ✖ 行不裸奔；门禁对「新增阻塞态却无 next」与「已有 next 被删」**双向**变红 | 新门禁（node + Chromium 两面）全绿；双向注入反证各 FAIL → 还原 PASS；判据纳入 `gate-integrity` 受审集合 | P0 |
| FR-ALLN-016 | **S2 断流样板机器化首验收**（O-005 裁决）：真机 23:12:51~23:12:59 序列在 headless 下**全链复刻**——绑定 → 自动探测 → 未授权 → ✖ 阻塞 → 授权 next 产出 → auth 卡 → execute → ✓ 回执 → 探测恢复 → 拾取 next 产出；断言「**死端 = 0**」 | 全链机器化判据（headless）全绿；**浏览器原生权限弹窗体感**入人工面清单（`⏳` / `PASS`，不得冒充 PASS）；真机序列 5 环节逐环节可判（死端 1 → 0） | P0 |

### 5.3 LAW8 — 法八 值不入流

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-ALLN-020 | **敏感值唯一入口 = 掩码输入卡**：值只存在于 `<input type="password" data-secret="true">`（`askuser` **扩形** `secret`，卡内按需出现，法四不变）；全仓不得存在第二个可输入敏感值的流内入口 | 掩码输入卡存在且 `type="password"` / `data-secret="true"`；`askuser` kind **未新增**（是扩形）；「敏感值输入入口恰一处」扫描绿 | P0 |
| FR-ALLN-021 | **值直达 key-store**：提交路径（`answerSecret()` 等价物）**只向存储投递**，不经流内中转、不进 payload、不落流内节点；断言「**key 直写 key-store**」 | 提交路径机核：值入存储调用点**恰一处**；流内 payload 零值（见 FR-ALLN-023）；反证：在流内中转值 ⇒ FAIL | P0 |
| FR-ALLN-022 | **流内只留事实**：固化区只写「**事实 + 时间戳 + 掩码长度**」；`digest` 行只写 `••••••`；与法二切分明确——留痕的是**事实**（何时 / 哪个 op / 成功与否 / 掩码长度），不是**值** | 固化区字段集合 = {opId, ts, maskedLength, result}；`digest` 含 `••••••`；不得出现完整值 / 值前缀 | P0 |
| FR-ALLN-023 | **四面零明文机核**（O-010 裁决）：把哨兵值写入掩码输入 → 提交 → 断言 **① 流内 payload ② digest ③ 审计面 ④ DOM value / 全部元素属性**均**不含**该哨兵；且 `digest` 含 `••••••` | 四面逐面断言（`#stream` / `#view-audit` / `#digest-list` / 全部元素属性扫描）零命中；哨兵值对抗反证（若把值写入任一面 ⇒ FAIL）。*注：设计稿 §E 为 3 面 + 属性，本规范**加严为四面机核*** | P0 |
| FR-ALLN-024 | **存储侧边界口径显式登记**：本 Feature 只保证**流内零明文**；存储侧加密 / 生命周期 / 轮换**不在本 Feature 范围**，须在文档与口径面显式登记（不得被误读为「存储已加密」） | 口径说明面 / 收口文档含该边界声明；`NG-ALLN-017` 在验收中对账；无「存储已加密」类断言或文案 | P0 |

### 5.4 CONTRACT — NextProvider 契约 v2 七点（**逐点 FR 化**）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-ALLN-030 | **R1 可逆注册**：`registerNextProvider(def, opts?)` 返回**幂等** `unregister()`；注册 → 计数 N+1 → 卸载 → N 的完整往返成立；重复卸载结果一致（不再减） | 往返读数 N→N+1→N 机核；disposer 幂等断言（连续两次 unregister ⇒ 计数不变）；反证：非幂等 disposer ⇒ FAIL | P0 |
| FR-ALLN-031 | **R2 依赖声明式**：每个 provider 的 `deps` 必须 ⊆ `SERVICES`；注册时校验，**未知依赖 = loud 失败**；活跃集内**顺序来自服务依赖就绪**（不来自列表位置） | `deps ⊆ SERVICES` 校验断言 + 未知 deps 注入反证（FAIL 且 loud）；「依赖就绪定序」判据与列表位置置换测试（置换列表不改变顺序） | P0 |
| FR-ALLN-032 | **R3 优先级显式化**：`priority` 必填（0 恢复 / 1 引导 / 2~3 发现）+ `prepend`（同优先级置前）；覆盖走 `{overwrite:true}` 按 **id 定位整行**替换（**计数不变**） | priority 缺失 ⇒ FAIL；prepend 语义断言；按 id 覆盖后计数不变 + 该行被替换（非追加）机核 | P0 |
| FR-ALLN-033 | **R4 分发模式公开契约**：管线每个挂载点公开自己的模式（能拦截 / 改写的挂 `waterfall`；纯观测挂 `emit`）；provider 的 `mode` 必须 ∈ 模式集合（**非法即 loud**） | 挂载点 × 模式表（`next` / `params` / `consent` / `execute` = `waterfall`；`receipt` = `emit`）机核；provider `mode` 越集注入反证 ⇒ loud FAIL | P0 |
| FR-ALLN-034 | **R5 失败语义分级（三级）**：① chip 执行异常 → **单卡边界捕获**（产出流内错误卡 + 恢复 next，法七不破，不打断同屏其他卡）② provider 注册失败 → **loud**（重复 id / 未知 deps / 非法 mode / chips 悬空，一律拒绝注册并红显，**绝不静默覆盖或静默默认**）③ 改状态操作 → **执行前快照、失败整体回滚**（`op.llm-config` 凭据表 / `op.perm.request` 权限表 / `op.revoke` 授权·权限·凭据三表） | 三级逐级断言 + 逐级注入反证（① execute 抛错仍出恢复 next；② 重复 id 拒绝且红显；③ 快照失败回滚后旧状态逐字段不变） | P0 |
| FR-ALLN-035 | **R6 Seam 三件套**：一个能力 seam 要成立，**Definition**（`NextProvider` 接口形状）/ **Provider**（注册表）/ **Consumer**（`handleCardAction` 分发器）三者齐备且同表登记 | 三件套存在性断言（接口形状字段集 / 注册表实例 / 分发器唯一消费入口）；缺任一件 ⇒ FAIL | P0 |
| FR-ALLN-036 | **R7 证明义务表**：每个功能（opId）映射到四要素（功能名 / 触发 provider / 管线挂载点与模式 / 失败语义）；首批 **9 个 op 各一行**；表尾登记**明示契约义务**「新增 provider 只改注册表条目，`handleCardAction` 分发器 diff = 0」 | 义务表 9 行 + 四要素齐备；表尾明示义务存在；未映射四要素的 op **不允许进注册表**（校验断言） | P0 |
| FR-ALLN-037 | **证明义务表静态机核**（O-002 裁决）：以**测试断言**强制「注册表 ↔ 义务表一致」——行数相等、`opId` 集相等、四要素逐项非空、chips 无悬空（每个 chip 的 `opId` 都在注册表内） | 一致性机核断言全绿；注入「义务表多一行 / 注册表多一个 op / chips 悬空」三类反证各 FAIL | P0 |
| FR-ALLN-038 | **注册表形态 = 纯 TS 注册**（O-002 裁决）：`NextProvider` / `NextOp` 接口 + `registerNextProvider()` **纯 TS** 落地；**不做外部 JSON 声明式配置**（不引入新加载面） | 注册表由 TS 单点写入（唯一 `REGISTRY.push` / 替换点）；仓库**零** provider JSON 加载面；反证：新增 JSON 声明加载 ⇒ FAIL | P0 |

### 5.5 OPS — web-op 操作清单（首批 **9 个 op**，O-001 裁决）

> 每个 op = `{opId, 风险级, params?, consent?, execute, receipt}`；**统一管线**见 §5.6。设计稿首批 8 个 op **全量保留**，`op.turn` 为编排器按「chips 即指令的发回合入口」补入的第 9 个（O-001）。

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-ALLN-040 | **`op.authorize` 授权当前站点**：风险级 = 低·可撤销（`op.revoke` 可逆）；params = 无（默认当前标签页 origin）；**consent 必需**（auth 卡 + 后果预演）；execute = 登记授权、开启页面侧登记式注入；receipt = 固化区 + 系统行「✓ 授权已生效」 | op 注册表条目四要素齐备；授权后 origin 授权登记生效；**执行层 = SW**（origin 权限，见 FR-ALLN-066）；回执两件套可达 | P0 |
| FR-ALLN-041 | **`op.rebind` 重新绑定**：风险级 = 低·幂等；params = 无（取当前标签页）；**无 consent**（幂等读操作）；execute = 重新读取当前标签页并登记；receipt = 系统行「✓ 已重新绑定当前标签页」 | 与既有 `#rebind` **同一生产入口**（单一调用点，FR-ALLN-078）；chip 点击**零 `requestTurn`**、不受 `pending` 门控、不写输入框 | P0 |
| FR-ALLN-042 | **`op.llm-config` LLM 配置**：风险级 = 中·写凭据（可覆盖）；params = 厂商（choice）+ 模型 + **API Key（`secret` 掩码）**；**consent 必需**（auth 卡「写入本机凭据 · 零明文入流」）；execute = 测试连接 → **掩码写入存储**；receipt = 工具卡 + 系统行「✓ 已配置 LLM（掩码 · 零明文）」；**失败快照回滚**（旧配置不变） | 三参数采集流转正确；掩码卡满足 FR-ALLN-020~023；快照回滚（测试连接失败 ⇒ 旧配置逐字段不变） | P0 |
| FR-ALLN-043 | **`op.perm.request` 浏览器权限申请**：风险级 = 中·浏览器权限（扩展**不能静默回收**）；params = 权限项（**`form` 多选**，来自 `optional_permissions`）；**consent 必需**（consent 卡 + 浏览器原生弹窗）；execute = 运行时申请（`permissions.request`）；receipt = 工具卡 + 系统行（**批准 / 拒绝都固化**）；失败快照回滚 | `form` 扩形多选卡存在；权限项**逐项**来自 `optional_permissions`（FR-ALLN-110）；批准 / 拒绝两路径均固化；如实说明「回收须用户在浏览器确认」（**不做静默回收的虚假承诺**） | P0 |
| FR-ALLN-044 | **`op.revoke` 撤销**：风险级 = **高·不可逆**（引用 / 授权随之失效）；params = 目标（choice：站点授权 / 浏览器权限 / LLM 凭据）；**consent 必需**（确认卡 + 不可逆说明）；execute = 撤销并同步登记（浏览器权限需用户在浏览器确认）；receipt = 系统行「✓ 已撤销…」+ **审计入口**；**三表快照回滚** | 确认卡含不可逆说明；三表（授权 / 权限 / 凭据）快照 + 失败整体回滚断言；回执带审计入口 | P0 |
| FR-ALLN-045 | **`op.pick` 页面拾取**：风险级 = 低·只读；params = 无（进入拾取态）；**无 consent**；execute = 开启拾取态，等待页面点击；receipt = 引用卡（新引用序号递增） | 与既有拾取**同一入口**（单一调用点）；取消 / 超时 → 错误卡 + 恢复 next（EC-ALLN-005）；零 `requestTurn` | P0 |
| FR-ALLN-046 | **`op.describe` 描述替代**：风险级 = 低·只读；params = 描述文本（ask 卡 `text`）；**无 consent**；execute = 用描述代替引用继续；receipt = 系统行 + 新引用 / 回答固化 | 与既有 `submitDescribe` **同一入口**；**空描述 ⇒ 卡内校验、零副作用**（不产回执、不改状态） | P0 |
| FR-ALLN-047 | **`op.help` 看看能做什么**：风险级 = 低·只读；params = 无；**无 consent**；execute = 列出当前 ctx 下**可达的 op**；receipt = `notice` / 系统行（**不回写任何授权**） | 输出 = 当前 ctx 可达 op 列表（由注册表 `when(ctx)` 派生，**不硬编码**）；零回写断言 | P1 |
| FR-ALLN-048 | **`op.turn` 发回合（chips 即指令）**：风险级 = 低；params = 指令文本（chip 自带语义）；**无 consent**；execute = 经 **`requestTurn` 单一入口**发起一次用户回合；receipt = 既有流内回合留痕 | `op.turn` 是**唯一**经 `requestTurn` 的 op；其余 op 一律**零 `requestTurn`**（机核）；旧 `act:'next'` 的等价映射见 FR-ALLN-056 | P0 |
| FR-ALLN-049 | **会话 / 分组不收编**（O-001 裁决）：会话切换、分组、tabs 设置、诊断、主题、告警**不进首批 op**；显式登记为 `deferred`（含触发条件） | 首批 op 清单**恰 9 项**（无第 10 项）；`state.json#pendingObligations` 含 deferred 登记条目；`settings/ops.ts` 其余操作零改动（FR-ALLN-077） | P0 |

### 5.6 PIPE — 统一管线与 act → opId

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-ALLN-055 | **统一管线四态**：`next chip →（参数? 流内 ask 卡）→（同意? 流内 auth 卡）→ execute → 流内回执`；每个 op 声明自己经过哪些态；管线对 9 个 op **唯一**（无 per-op 旁路） | 四态在 9 op 上逐条可判；「管线唯一」断言（不存在第二条执行路径）；`params` / `consent` 缺省语义正确（无 params 不插 ask；无 consent 不插 auth） | P0 |
| FR-ALLN-056 | **act → opId 等价映射**（O-008 裁决，X3）：旧 6 act 逐条等价重锚——`next → op.turn` / `repick → op.pick` / `describe → op.describe` / `authorize → op.authorize` / `help → op.help` / `rebind → op.rebind`；映射表为**唯一权威**并被机核 | 映射表常量机核（6 行、双向可查）；每条：旧 act 的既有判据在 opId 语义下**等价成立**（无能力丢失）；旧 act 无「无对应 op」的悬空项 | P0 |
| FR-ALLN-057 | **chip 绑 opId**：chip 渲染 `data-op`（= opId）；`data-act` 若保留则降为**渲染别名**（不得与 opId 冲突、不得作为分发依据） | chip 元素含 `data-op` 且值 ∈ 注册表 opId 集；分发只读 `data-op`；反证：以 `data-act` 分发 ⇒ FAIL | P0 |
| FR-ALLN-058 | **瘦分发（分发器 diff = 0）**：`handleCardAction` 只做**一次查表**（`OPS_BY_ID[opId]` → `execute()`），**零 per-op 分支**；新增 provider / 注册 / 卸载 / 重复 id 四种操作下，分发器源码 **diff = 0** | 分发器源码抽取判据：无 per-op `if` / `switch` 分支（分支数 = 0）；四种操作下分发器文件哈希不变；反证：加一个 per-op 分支 ⇒ FAIL | P0 |
| FR-ALLN-059 | **本地只读 op 语义对齐**（ADR-V4-038 §5 继承）：`op.pick` / `op.describe` / `op.rebind` / `op.help` / `op.authorize` 的既有「本地动作」语义（**零回合、不受 `pending` 门控、复用单一生产入口**）在 op 词汇下**逐条保持**；仅 `op.turn` 经 `requestTurn` | 本地 op 的 deny 集不误伤（`pending` 门控下仍可执行）；每个本地 op 各有布线门禁（仿 `authorize-chip-wiring`）：唯一调用点 + 无 `requestTurn` + ≥3 条伪造反证 | P0 |

### 5.7 SW — 特权 op 执行器与 `op-*` 消息族（O-003 / X2）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-ALLN-065 | **双层执行器**（O-003 裁决）：① **panel-local op** 在面板侧执行（`op.rebind` / `op.pick` / `op.describe` / `op.help` / `op.turn`）② **特权 op** 经 **SW 执行器**执行（origin 权限与浏览器权限不得在面板侧直接申请） | 每个 op 的 `execute` 层次归属在注册表条目中**显式**（panel / SW）；分层归属与实现一致；反证：面板侧直接申请 origin 权限 ⇒ FAIL | P0 |
| FR-ALLN-066 | **特权 op 清单**：`op.authorize`（origin 权限，复用 `requestOriginPermissionDetailed` 单一入口）与 `op.perm.request`（`permissions.request`）走 SW；SW 侧 `requestCapabilityPermissionOnGesture` 语义保持（**授权手势仍须在用户手势路径内**，不等同于放开 SW 静默申请） | 特权 op 清单**恰 2 项**；origin 权限调用点唯一；面板侧零 `.request(` 直接调用（`test/capability-wiring.test.ts:51-58` 语义**等价改写**后仍成立） | P0 |
| FR-ALLN-067 | **`op-*` 消息族 = type-only**（X2）：新增消息族走 `command-policy` / `pick-layer-*` / `ref-rescue` 先例——**不进 `KIND_SET`**，运行时校验落**独立模块**；`content-script.ts` 的 import 边不得因此模块而把消息定义打进 `content.js` | `KIND_SET` 内容**零新增**（逐字对比）；`content.js` **逐字节零增长**（177,076 B + sha 命中）；运行时校验模块独立存在且被 SW / 面板两侧引用；反证：把 `op-*` 加进 `KIND_SET` ⇒ `content.js` 尺寸判据 FAIL | P0 |
| FR-ALLN-068 | **SW 侧小型注册表镜像契约**：SW 执行器侧维护**与面板侧同构的最小契约镜像**——`id` / 分发模式 / 失败语义 / 审计；镜像与面板侧一致性由机核保证（不得两套语义漂移） | SW 镜像的字段集 = {id, mode, fail, audit}；与面板注册表**同源**（同一常量 / 同一校验函数）；一致性断言 + 漂移注入反证 | P0 |
| FR-ALLN-069 | **`content.js` 红线**：`dist/content.js` = **177,076 B** / sha256 `52a82620…`；`dist/pick-layer.js` = **33,900 B** / sha256 `5f567d7e…`（**零容差**） | 两项逐字节 / 逐哈希核验；`src/content/**` 零 diff；`test:content` / `pick-layer-budget` 全绿 | P0 |

### 5.8 SETTINGS — 设置面收编（O-004 / Q-ALLN-010）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-ALLN-075 | **重叠 4 类收编**（O-004 裁决）：`settings/ops.ts` 中与 op 重叠的 **4 类**（`authorize` / `revoke` / `rebind` / `llm-config`）**收编**为 op **单一执行入口**——设置面板按钮与 chat chip **都是 op 触发器**（**零双路径**） | 4 类操作各自**唯一执行入口**；设置面板按钮调用该入口（不再自实现执行路径）；反证：设置面板另起一条执行路径 ⇒ 判据 FAIL | P0 |
| FR-ALLN-076 | **零双写（执行面）**：同一 op 不得存在两条执行 / 留痕路径；收编面与 chat 面产生的**留痕一致**（同 opId / 同回执形态） | 每个收编 op 的留痕格式单一（同源构造）；「执行入口恰一处」扫描；两入口同时触发的留痕可区分来源但格式同构 | P0 |
| FR-ALLN-077 | **其余设置操作不动**：除 4 类收编外，`SettingsOps` 其余操作（LLM 状态 / tabs / capabilities 其余 / sessions / diag 等）**零改动**；设置视图 8 分区结构不动（法六：chat 是入口之一，不是替代） | `settings/ops.ts` 其余操作行为与签名零变化；8 分区 `SETTINGS_SECTION_IDS` 计数不变；`test:settings` / `test:l2-counts` 全绿 | P0 |
| FR-ALLN-078 | **单一调用点机核**：每个收编 op 的唯一执行入口有静态布线门禁（仿 `test/authorize-chip-wiring.test.ts`）：① 能力 / 动作请求**唯一调用点** ② 单一入口调用点集合显式登记 ③ **无 `requestTurn`**（除 `op.turn`）④ ≥3 条伪造反证可 FAIL | 布线门禁逐 op 存在且全绿；反证实跑 FAIL → 还原 → PASS；与 op 清单**同源**（清单改一处，门禁同步红 / 绿） | P0 |

### 5.9 CHROME — 授权 chip / 可拖动宽度 / 密度口径（O-006 / O-007 / X5）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-ALLN-085 | **授权 chip 状态栏常显两态**：`#auth-state` 常显，黄态逐字「**未授权 · 零注入**」（页面侧未注入）/ 绿态逐字「**已授权 · supported**」（声明 `web-cli/0.2` 校验通过）；**两态恒显其一**（零风险也有——它是**状态**不是风险） | `#auth-state` 常显（永不 `hidden`）；两态原文逐字命中；状态 ≡ `ctxOf(scene).site.authorized`（与注册表视察器同源）；场景默认值 S1/S2/S5/S6 = 黄、S3/S4/S7 = 绿 | P0 |
| FR-ALLN-086 | **授权态全 UI 唯一常显载体（零双写）**：① 工具栏摘要只留 `origin · 会话` ② 四词「未授权 / 已授权 / 零注入 / supported」在**工具栏区零出现** ③ 风险 rail 的条件性「未授权」chip **并入**该 chip，rail 只承载其余风险类 ④ 状态栏第一行只写会话 / 队列事实（不写授权态） ⑤ L2 树视图站点行改指向「状态见状态栏授权 chip」（**台账不复制状态**） | 五条逐条机核（四词扫描范围 = 工具栏区 + 状态栏第一行 + rail）；rail 授权类零残留；「授权态常显载体恰一处」扫描绿；反证：任一处重新出现授权态 ⇒ FAIL | P0 |
| FR-ALLN-087 | **黄态点击 → 流内产出授权 next**（法七：一切操作皆 Next）：点击黄 chip 在流内产出「授权当前站点」next 卡（`op.authorize` · P0 恢复）+ 追加一条系统事件行；**不跳走、不更换面板** | 点击后 `#stream` 新增 next 卡（含 `data-op="op.authorize"`）+ 一条系统行；视图 / 面板**零切换**断言；反证：点击只切视图 ⇒ FAIL | P0 |
| FR-ALLN-088 | **绿态点击 → 管理详情**：点击绿 chip 展开管理详情（**按需面**、默认折叠），含 `op.revoke`（撤销授权）与 `op.rebind`（重新绑定）入口；点击同样**不跳走** | 管理详情含两入口；默认折叠（`data-density-exempt`，不计默认密度）；展开后默认屏读数仍 ≤7；键盘可达 | P0 |
| FR-ALLN-089 | **可拖动宽度 280–640**：侧栏左缘分隔条（ARIA `role="separator"` + `aria-orientation` + `aria-valuenow` / `aria-valuemin` / `aria-valuemax`）；键盘 `←/→` ±10 · `Home`/`End` 到边界 · **双击复位 400**；clamp 到 `[280, 640]`；拖动只改写 `:root --panel-w`，`pointermove` 经 `requestAnimationFrame` 合并为每帧一次写入 | 分隔条 ARIA 四属性齐备；键盘五操作逐条断言；clamp 边界（279→280 / 641→640）；双击复位 400；rAF 合并判据（连续 `pointermove` 不产生多帧写入） | P0 |
| FR-ALLN-090 | **窄屏兜底改由 `data-narrow`**（X5）：`#panel[data-narrow="true"]`（当前宽度 **≤360px**）触发窄屏样式（隐藏视图文字标签 / 压缩站点 origin）；**原三档宽度 radio（320 / 400 / 520）删除** | `data-narrow` 触发阈值 = 360（边界 360 → true / 361 → false）；三档 radio 在 DOM 中**零残留**；窄屏样式断言 | P0 |
| FR-ALLN-091 | **密度登记格口径与宽度解耦**（O-007 裁决）：登记格口径 = **控件计数**（与视口宽度解耦）；**320px 仍为验收锚点**（既有三视口断言中 320 档保留为不变量测量点，400 / 520 档按等价口径保留或重锚）；测量口径（豁免只认 `hidden` / 阈值不变）**不变** | 320px 档读数断言保留；「登记格 = 控件计数」判据（宽度变化不改变控件计数）；阈值 `7/15 · 9/20 · 17/35` 逐字不动；31 登记格逐格留痕或显式登记不变项 | P0 |
| FR-ALLN-092 | **状态栏单写者结构与密度不破**：`statusbar.ts` 仍为**单一写入者**（J1 永不折叠 / J2 有风险才显 chips / J3 祖先无折叠 / J4 视图切换不触碰）；授权 chip 计入默认密度后 **工具栏 5 + 授权 chip 1 = 6 ≤ 7** | J1~J4 判据逐条不破；默认可点 = 6 ≤ 7（S6 = 5 + 2 = 7 亦不破）；`#risk-chips` 语义不变（有风险时无 `hidden`） | P0 |


### 5.10 DESIGN — 双稿双 shim 设计契约（O-011 / X4）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-ALLN-100 | **双稿双 shim 并存**（O-011 裁决）：**F 契约冻结不替换**（`option-f-chat-stream.html` `49ce27fc…` + `option-f-shim.mjs` `8ca5db6f…` + `SHIM_CHECK_CALLS = 60` + F 的 `ASSERTION_MAP` 60 行），**同时新增 G 契约** | F 四项常量逐字不变；G 契约新增且两者**各冻各的**；反证：替换 / 删除 F 常量 ⇒ FAIL（N21） | P0 |
| FR-ALLN-101 | **G 稿 + 127 断言入 `design-contract` 门禁**：新增 G 的 `DRAFT_SHA256 = a7c0a77a…` / `SHIM_SHA256 = d0107ecb…` / `G_SHIM_CHECK_CALLS = 127` / G 的 `ASSERTION_MAP`（**127 行**）；门禁须同时校验 F（60）与 G（127），且「断言 id 集 == 从 shim 抽出的 id 集」对 G **同样成立** | 门禁实跑 F 60/60 + G 127/127；G 侧「调用点 127 + 声明 1」「id 集相等」「映射表 127 行」逐条断言；注入「G shim 改 1 byte」反证 ⇒ FAIL | P0 |
| FR-ALLN-102 | **`designContractChanges` 登记**：G 入契约须在 `docs/v4-supersession-ledger.json#designContractChanges` **显式登记**（从空数组变为含 G 条目），含（对象 / 前后 sha / 断言数 / 日期 / 理由） | 台账条目存在且五要素齐备；`test:design-contract` + `test:supersession` 全绿；台账前后可复算 | P0 |
| FR-ALLN-103 | **G 稿内容零改动**（D7 / N20）：本 Feature **不修改、不重排** G 稿与 shim；若确需改动，须同时满足 127 断言 + 更新 sha 常量 + 台账登记（**禁静默改断言**） | `git diff --quiet -- packages/web-cli-plugin/design` 通过（本轮零改动）；若改须五件套齐备（shim 断言 / 双 sha / 计数 / 映射表 / 台账） | P0 |

### 5.11 SUPERSEDE — X1~X6 显式取代（**判据等价重锚，不是放宽**）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-ALLN-110 | **X1 允许新增 `optional_permissions`**（作者裁决①）：运行时按需申请浏览器权限；**安装期静态 `permissions` 逐字不变**（`['activeTab','scripting','storage','sidePanel','tabs']`）；`host_permissions` 6 条不变；无 `<all_urls>` / 无静态 `content_scripts`；`minimum_chrome_version` = 116；新增 / 沿用的可选权限项须有**最小必要论证** | 静态集合逐字断言（等价改写后仍钉死）；可选集合按新增项**等价重锚**（不是放宽为「任意」）；最小集论证在文书中存在；`test:capability-wiring` / `binding-wiring` / `auto-session-wiring` / `test:binding` 全绿 | P0 |
| FR-ALLN-111 | **X2 `op-*` 消息族 type-only**：默认**不进 `KIND_SET`**（见 FR-ALLN-067）；**若**主张进 `KIND_SET`，须先证 `content.js` **逐字节零增长**（默认禁止） | 见 FR-ALLN-067 / 069；`KIND_SET` 内容逐字**零新增** | P0 |
| FR-ALLN-112 | **X3 act 闭集 6 项 → op 注册表**（作者 Q1 + 设计稿 §①/§④/§⑦）：chip 绑 `data-op`；候选由注册表纯谓词产生；`handleCardAction` 分发器 per-op diff = 0；`NEXTSTEP_ACTS` 闭集被**注册表 opId 集**取代（映射见 FR-ALLN-056） | 见 FR-ALLN-056~058；旧闭集判据（`test/local-act-wiring.test.ts:269` / `recommendation-sources.test.ts:281` 逐字钉死）**等价重写为 opId 集**判据且计数不减 | P0 |
| FR-ALLN-113 | **X4 G 稿 + 127 断言入契约**（作者裁决③ + D7）：见 §5.10；**F 冻结不得静默替换**（N21） | 见 FR-ALLN-100~103 | P0 |
| FR-ALLN-114 | **X5 密度三档视口 → 连续宽度**（设计稿 ② + 三轮优化）：分隔条 + ARIA + 键盘 + clamp + 双击复位；窄屏兜底 `data-narrow`（≤360）；**登记格口径与宽度解耦**（O-007），320px 仍为验收锚点，阈值逐字不动 | 见 FR-ALLN-089~091；`test:density` / `test:l0` / `test:journey` / `density-thresholds` 等价重锚后全绿；`docs/v4-density-baseline.json#tiers` 三档读数按等价口径重锚 + 留痕 | P0 |
| FR-ALLN-115 | **X6 `data-act` → `data-op` + 注册表候选 + 统一管线 + error 行内恢复**：设计稿 F→G 变化点第 1 / 4 行的落地（见 FR-ALLN-012 / 055~058） | 见 FR-ALLN-012 / 057；`test/ui/stream.mjs`（63）/ `ask-auth-inflow.mjs`（61）等价重锚并**增**断言（`secret` / `form` 扩形 + `error` 行内恢复） | P0 |
| FR-ALLN-116 | **六项取代一律「等价重锚」**：不得以「放宽阈值 / 删除断言 / 静默改常量 / 静默替换冻结对象」落地；每项须：① 台账明文登记 ② 判据力不降（可逐条对账）③ 计数不减 ④ ≥1 条注入反证 | §12 映射表逐项有落点；六项各自有台账条目 + 判据对账；反证留证（注入 → FAIL → 还原 → PASS） | P0 |

### 5.12 GATE — 门禁等价重锚与台账

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-ALLN-120 | **门禁等价重锚（清单，改写 ≠ 删除）**：至少覆盖 ① `test/recommendation-sources.test.ts`（源白名单 7 / 规则表 / 闭集逐字）② `test/local-act-wiring.test.ts`（闭集同源 + 本地 act 槽）③ `test/authorize-chip-wiring.test.ts`（单一入口）④ `test/ui/recommendation.mjs`（59）⑤ `test:ref-pick-wiring`（11）⑥ `test/capability-wiring.test.ts`（静态 5 / 可选 / host 6 / SW 禁 `.request(`）⑦ `test/binding-wiring.test.ts` ⑧ `test/auto-session-wiring.test.ts` ⑨ `test/ui/binding.mjs`（192）⑩ `test/content.test.ts` / `pick-layer-budget.test.ts` / `insight-protocol.test.ts` ⑪ `test/ui/stream.mjs`（63）/ `ask-auth-inflow.mjs`（61）⑫ `test/ui/l0.mjs`（244）⑬ `test/ui/density.mjs`（232）⑭ `test/ui/journey.mjs`（171）⑮ `test/density-thresholds.test.ts` ⑯ `test/l2-counts.test.ts` + `test/ui/l2.mjs` ⑰ `test/host-registry.test.ts` ⑱ `test/design-contract.test.ts`（6）⑲ `test/supersession-ledger.test.ts`（35）⑳ `test/size-*` + `test:size-ruling-vol3`（12） | 上述门禁全部**改写而非删除**；每处新判据可 FAIL 反证 + 声明 `expectFailPattern`；对应门禁计数 ≥ 基线（§9.5） | P0 |
| FR-ALLN-121 | **反证不空转（两段证伪）**：每条被改动 / 新增判据必须 ① 注入违反面 → **实跑 FAIL** ② **逐字节还原**（sha256 前后相同）→ 实跑 PASS；**不得「删属性充数 / 换口径充数 / 自我裁决自我验收」**（v4.5 BLOCK-02 教训）；注入点若被搬走必须**重写注入点** | 每条判据留有「注入 FAIL → 还原 PASS」两段证据（日志全量）；无「不再 FAIL 的判据」遗留；注入文件 sha256 前后逐字节相同 | P0 |
| FR-ALLN-122 | **保护段处置**：journey 保护段 `43054..58287` / sha `cc79f413…` / **240 行**（`supersessionChain` 3 链节）**保段或走八步显式取代**（① 记录 old ② 逐段决策 ③ 同编号等价改写 ④ 登记 `modifiedRanges[]` ⑤ 写入新 pin ⑥ **计数守恒 ≥171** ⑦ `redlineRemap[]` 追加 ⑧ RP-V4-08 反证）；binding 保护段 `107780..115930` / sha `be9ad0e9…`（`decision = keep`）**保段**；段外读授权 / 站点面 / 状态栏的断言**等价改写 + 逐行登记** | 保护段 sha 不变（保段）或显式取代留痕（二选一，须显式声明）；段外改写逐行登记且计数不减；RP-V4-08 反证实跑（段内 1 byte 必红 / 段外不红 / 逐字节还原） | P0 |
| FR-ALLN-123 | **`knownGap` 一致性机核**：新增取代条目必须让 `test/supersession-ledger.test.ts` 的 `status ↔ knownGap` 一致性检查保持绿（`status = complete-steps-1-8` ⇒ 该字段为空或仅声明闭环） | `test:supersession` 全绿；新增条目 `oldPin` / `newPin` / `supersededFrom` 链式可机核 | P0 |
| FR-ALLN-124 | **门禁严格串行 + `KL-N-10` 纪律**：`test` / `test:ui` / `test:binding` **绝不并发**（一次一个 Chromium，`finally` 自清 profile）；首轮异常**隔离复跑 ≥2**、日志全量、**仍红如实记录不阻塞收口**（不伪造串行绿） | 全部门禁串行复跑日志（落盘全量）；`KL-N-10` / `test:ui #54g` 按纪律处置 | P0 |
| FR-ALLN-125 | **门禁受审集合更新**：新增门禁（死端守护 / 法八四面零明文 / 证明义务表机核 / op 布线门禁 / 注册表往返）必须纳入 `test:gate-integrity` 受审集合 | `test:gate-integrity ≥13` 且新增门禁逐项在受审集合内；「新门禁未纳入受审」⇒ FAIL | P0 |

### 5.13 VOL — 体积与 V3-VOL-3 纪律

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-ALLN-130 | **体积五要素重登记**：任何 byte 变化 ⇒ 强制重登记（前后值 / 日期 / 来源 / 理由 / 历史保留 + 构建命令 + 逐模块 metafile 归因，**Σ 逐模块 Δ + 未归因胶水 == 登记增量**） | `test/size-budget` / `test/size-growth-evidence` 全绿；metafile 归因 Σ 可复算 | P0 |
| FR-ALLN-131 | **生效上限与 cap 纪律**：`sidepanel.js` ≤ 生效上限 = `min(563,200, floor(baseline × 1.05))`（当前 = **523,447 B**）；单轮容差 **5%** 未动；`SIDEPANEL_CEILING_CAP` 保持 **`record-only`**（**不设自缚装置**） | `SIDEPANEL_CEILING == floor(baseline × 1.05)` 严格成立（无 cap）；`SIDEPANEL_CEILING_CAP === 'record-only'` | P0 |
| FR-ALLN-132 | **V3-VOL-3 三值同源**：`newBaselineBytes` 随现行基线**同源前移**；档位 **512,000 B** 与绝对上限 **563,200 B**（= 档位 × 1.10）**不变**；`authorConfirmation.status` 保持 `pending-author-line`（**不得伪称已确认**） | `docs/v4-supersession-ledger.json#v3Vol3Closeout` 三值一致 + `test:size-ruling-vol3 ≥12` 全绿；`authorConfirmation.status` 枚举值合法且未被静默改写 | P0 |
| FR-ALLN-133 | **红线冻结面逐字节复核**：`dist/content.js` 177,076 B / `52a82620…`；`dist/pick-layer.js` 33,900 B / `5f567d7e…`；`design/**` 双稿双 shim **四 sha**；判定链（`policy.ts` / `auto-authorize.ts`）内容哈希；`docs/v3-supersession-ledger.json` **零 diff** | 上述逐字节 / 逐哈希核验通过；`src/content/**` 零 diff | P0 |
| FR-ALLN-134 | **体积预算前移评估**：余量仅 **24,926 B（+5.00%）**、距档位 **13,479 B**，本 Feature 新增面（注册表 + 9 op + 掩码 / 表单扩形 + 状态栏 chip + 分隔条）**可能越限** ⇒ 须先做净增上下界评估；若越限，触发五要素重登记 + **档位上调**义务（`authorConfirmation` 走占位规则，**不得伪称已确认**），并把「是否拆叶控体积」作为显式决策登记 | 评估产物存在（上下界 + 依据）；越限路径的登记口径明确；`PENDING_ABSOLUTE_CAP` 与 `authorConfirmation.status` 未被静默改写；**禁止在预算未评估前排「全量落地」** | P0 |

---

## 6. 非功能需求 (NFR)

| ID | 类别 | 需求描述 | 验收标准 |
|----|------|---------|---------|
| NFR-ALLN-001 | 性能 | 授权 chip / 分隔条 / op 管线不得使首屏渲染 / 滚动跟随 / 视图往返变差；`#region-stream` 高度占比 **≥65.0%**（**只允许上调**）；拖动只改写单条自定义属性且 rAF 合并（**不作性能承诺**，如实登记体感） | `journey #15b`（门槛 `STREAM_HEIGHT_RATIO_MIN = 0.65`）全绿；滚动跟随断言全绿；rAF 合并判据绿；人工面登记拖动体感（AC-ALLN-024） |
| NFR-ALLN-002 | 可用性 | 320px 窄栏零水平溢出；≤360px `data-narrow` 兜底收敛；键盘 Tab 序与 `:focus-visible` 不退化；分隔条完整键盘可达（`←/→` ±10 · `Home`/`End` · 双击复位） | `journey` 320px 断言全绿；`data-narrow` 边界（360/361）断言；键盘断言全绿；`#stream` 仍 `role=log` |
| NFR-ALLN-003 | 安全 | **流内零明文**（四面机核，FR-ALLN-023）；净化面（URL query / secret 形状 / 命令参数体 / raw markup 抛错）语义不变；新增属性承载（如 chip `title`）**同过净化** | FR-ALLN-023 四面断言全绿；`test:zero-injection ≥27`；属性面注入 secret 反证必抛错 |
| NFR-ALLN-004 | 可维护性 | **单源 + 机核**：注册表 / 证明义务表 / 阻塞态枚举 / op 清单 / 模式表 / 密度阈值 / 取代映射表各自**恰一处**声明，且由门禁从源文本抽取机核（不得靠注释与人工对账） | 「声明恰一次」扫描全绿（各单源）；任一处出现第二声明确实红（反证） |
| NFR-ALLN-005 | 体积 | `sidepanel.js` 在生效上限内；任何 byte 变化走五要素重登记 + 披露算术机核；**不设新 cap** | FR-ALLN-130 / 131 全绿；`SIDEPANEL_CEILING_CAP === 'record-only'` |
| NFR-ALLN-006 | 兼容性 | 既有 id / ARIA 读取契约不破：`#composer` / `#input` / `#send`（journey / binding / `requestTurn`）、`#settings-back` / `#open-settings` / `#authorize` / `#rebind`、`#risk-rail` / `#risk-chips` / `#region-statusbar` / `#statusbar-text`、`#l2-title` / `#l2-count`、`#view-host` / `#l2-back` | 兼容读取面逐 id 断言存在且语义不变（新增 `#auth-state` / 分隔条为**净新增**，不改既有 id 语义） |
| NFR-ALLN-007 | 可测试性 | 每条新 / 改判据都必须**可 FAIL**（可注入违反面）并声明 `expectFailPattern`；不得引入不可证伪的断言形态 | 每条新 / 改判据留有反证证据（FR-ALLN-121） |
| NFR-ALLN-008 | 无障碍 | 授权 chip 两态可读且可键盘触发；掩码输入读屏可达（`type=password` + `data-secret` + 标签）；分隔条 ARIA `separator` 四属性齐备；`aria-live` 语义不因 chip 新增而丢失 | chip 键盘可达断言；掩码输入 ARIA 断言；分隔条 ARIA 四属性断言；读屏走查列入人工面（AC-ALLN-024） |
| NFR-ALLN-009 | 权限最小化 | `optional_permissions` 新增 / 沿用项须论证「**最小必要**」且不引入新安全面；安装期静态面**零漂移**；浏览器权限**不可静默回收**如实说明 | FR-ALLN-110 全绿；最小集论证存在；「回收须用户确认」口径在 UI / 文档一致 |
| NFR-ALLN-010 | 可逆性 / 一致性 | 注册可逆（幂等 disposer）；改状态 op 有快照 / 回滚（不留半完成态）；两侧注册表（面板 / SW 镜像）语义一致 | FR-ALLN-030 / 034 / 068 全绿；回滚后状态逐字段不变断言；镜像漂移注入反证 FAIL |
| NFR-ALLN-011 | 可观测性 | 审计面记录「何时 / 哪个 op / 成功与否 / 掩码长度」，且**零明文**；审计入口从回执可达 | 审计字段集合断言（含 `opId` / `ts` / `result` / `maskedLength`）；零明文同 FR-ALLN-023；回执 → 审计入口可达 |
| NFR-ALLN-012 | 可演进性 | 新增一种「需要用户操作的地方」的改动面 = **注册表条目 + 自带测试**（分发器 diff = 0）；并有判据防止「回归到 per-op 分支」 | FR-ALLN-058 全绿；「新增 provider 演练」判据（注册一个样例 provider，分发器文件哈希不变） |

---

## 7. 边界情况 (EC)

| ID | 场景 | 处理方式 |
|----|------|---------|
| EC-ALLN-001 | **重复 provider id 注册** | **拒绝注册并 loud 红显**（`data-state="fail"`），**绝不静默覆盖或静默默认**；现有行不变（R5 ② / FR-ALLN-034） |
| EC-ALLN-002 | **未知 `deps`（不在 `SERVICES`）** | 注册时报错并 loud 失败；该 provider 不进活跃集；错误串可读（R2 / FR-ALLN-031） |
| EC-ALLN-003 | **非法 `mode`（∉ 模式集合）** | 同上 loud 失败；模式集合为唯一权威（R4 / FR-ALLN-033） |
| EC-ALLN-004 | **chips 悬空**（chip 的 opId 不在 op 清单） | 注册失败并 loud；证明义务表机核同时捕获（FR-ALLN-037） |
| EC-ALLN-005 | **chip execute 抛错 / 拾取取消 / 超时** | **单卡边界捕获**：只影响该卡 → 产出流内错误卡 + 恢复 next（法七不破），不打断同屏其他卡（R5 ① / FR-ALLN-034 / 045） |
| EC-ALLN-006 | **consent 被拒绝** | 固化「已拒绝」事实（**非异常、不 loud**）+ 给出可达的后续 next；**不重试同一授权、不改既有授权**（FR-ALLN-014） |
| EC-ALLN-007 | **浏览器原生权限弹窗（headless 不可合成）** | `chrome.permissions.request` 在 headless 下 `PENDING_TIMEOUT` ⇒ 该环节**只走人工面**（`⏳ 未执行` / `PASS`，**不得冒充 PASS**）；机器化部分止于「params 卡 → consent 卡 → 申请调用点」（R-ALLN-014） |
| EC-ALLN-008 | **浏览器权限被拒** | 与 EC-ALLN-006 同口径：**固化「已拒绝」**（非异常、不 loud）+ 可达 next；如实说明**不能静默回收**（FR-ALLN-043） |
| EC-ALLN-009 | **掩码输入为空 / 取消** | **卡内校验、零副作用**（不投递存储、不改既有凭据、不产回执）；取消走 `ASK_CANCEL_REASONS` 既有语义（`user` / `timeout` / `superseded` / `aborted`）。**`op.describe` 空描述**同为「卡内校验、零副作用」（FR-ALLN-046） |
| EC-ALLN-010 | **`MAX_OPEN_ASKS = 2` 与管线多卡冲突** | op 管线的 `params` / `consent` 卡计入 `MAX_OPEN_ASKS`；达上限时**不新开 ask**，改为排队 / 合并提示（具体算法由 plan 定），**不得静默丢弃**（FR-ALLN-055 / A10） |
| EC-ALLN-011 | **`op.revoke` 失败** | 授权 / 权限 / 凭据**三表快照**整体回滚；回执如实报失败 + 恢复 next；**不留半完成态**（FR-ALLN-034 ③ / 044） |
| EC-ALLN-012 | **LLM 连接测试失败** | 凭据表快照回滚（**旧配置逐字段不变**）；错误卡 + 恢复 next（**不裸奔**）；掩码值零明文（FR-ALLN-042 / 034 ③） |
| EC-ALLN-013 | **非首装未授权会话**（R1 场景） | `site.unauthorized` 常驻候选 ⇒ 流内产出 `op.authorize` next（**与 `firstRun` 无关**）；✖ 行行内带恢复 chip（FR-ALLN-013 / 012） |
| EC-ALLN-014 | **`data-narrow` 边界值** | 宽度 **= 360** → `data-narrow="true"`；**= 361** → `false`；窄屏样式切换不产生水平溢出（FR-ALLN-090 / NFR-ALLN-002） |
| EC-ALLN-015 | **拖动到极值 / 键盘边界** | clamp 到 `[280, 640]`（279 → 280、641 → 640）；`Home` → 280 / `End` → 640；双击复位 400；键盘与拖动结果一致（FR-ALLN-089） |
| EC-ALLN-016 | **设置面板按钮与 chat chip 并发触发同一 op** | 单一执行入口 ⇒ 第二次触发不产生第二条执行路径；留痕格式同构、来源可区分；不得出现「双写」或重复回执（FR-ALLN-075 / 076） |
| EC-ALLN-017 | **`pending` 门控下的本地 op** | 本地只读 op（`op.pick` / `op.describe` / `op.rebind` / `op.help` / `op.authorize`）**不受 `pending` 门控**、零 `requestTurn`；仅 `op.turn` 经 `requestTurn`（FR-ALLN-059） |
| EC-ALLN-018 | **取代台账状态非法 / `knownGap` 不一致** | `status = complete-steps-1-8` 时 `knownGap` 必须为空或仅声明闭环，否则门禁 FAIL（FR-ALLN-123） |
| EC-ALLN-019 | **会话切换 / 视图往返中的面板状态** | 授权 chip 状态随 ctx **重算**（不缓存过期值）；分隔条宽度在视图往返中存活；管理详情展开态不跨视图泄漏（FR-ALLN-085 / 089） |
| EC-ALLN-020 | **注册表卸载后再注册（往返）** | 幂等 disposer：`N → N+1 → N` 后重复卸载**不再减**；再注册同一 id 得到一致顺序（FR-ALLN-030 / 032） |
| EC-ALLN-021 | **体积越限** | 越限 ⇒ 走五要素重登记 + 档位上调义务（显式登记），**不得**静默放宽上限 / 也不得引入自缚 cap；`authorConfirmation` 保持占位口径（FR-ALLN-131 / 132 / 134） |

---

## 8. 开放问题

> **口径**：discovery §7.4 的 **O-ALLN-001~012 十二条**在本阶段**全部裁决**（status 一律 `ruled`）；落位见 §11。裁决依据 = 编排器代作者决策（D1：作者已授权编排器代行决策、全流程自行调度）。

| # | 问题 | 状态 |
|---|------|:--:|
| 1 | **O-ALLN-001 op 首批范围边界**（8 op vs 补充 vs 全量收编） | **已裁决**（DC-ALLN-001：设计稿 8 op + **`op.turn`** = **9 op**；会话 / 分组**不收编**，登记 `deferred`；落地 FR-ALLN-040~049） |
| 2 | **O-ALLN-002 注册表形态**（纯 TS vs JSON；证明义务表静态登记） | **已裁决**（DC-ALLN-002：**纯 TS 注册**（`NextProvider` / `NextOp` + `registerNextProvider()` 幂等 unregister）；契约 v2 七点全落地；**证明义务表 = 静态机核**（测试断言注册表 ↔ 义务表一致）；**不做外部 JSON 声明**；落地 FR-ALLN-030~038） |
| 3 | **O-ALLN-003 SW 端 op 执行器 + `op-*` 消息族落点** | **已裁决**（DC-ALLN-003：**双层**——panel-local op 面板执行 / 特权 op（`op.authorize` origin 权限 · `op.perm.request`）经 **type-only `op-*` 消息族**走 SW 执行器，SW 侧小型注册表镜像契约（id / 分发模式 / 失败语义 / 审计）；**`KIND_SET` 不动**；落地 FR-ALLN-065~069） |
| 4 | **O-ALLN-004 `settings/ops.ts` 与 op 管线关系** | **已裁决**（DC-ALLN-004：重叠 **4 类**（authorize / revoke / rebind / llm-config）**收编**为 op **单一执行入口**——设置面板按钮与 chat chip 都是 op 触发器（**零双路径**）；其余设置操作不动；落地 FR-ALLN-075~078） |
| 5 | **O-ALLN-005 断流首验收 AC 形态** | **已裁决**（DC-ALLN-005：**机器化主验收**——headless 全链复刻 S2（绑定 → 未授权 → ✖ 阻塞 → 授权 next 产出 → auth 卡 → execute → ✓ 回执 → 探测恢复 → 拾取 next 产出，断言「死端 = 0」）+ **浏览器权限弹窗体感入人工面**；落地 FR-ALLN-016 / AC-ALLN-001 / AC-ALLN-024） |
| 6 | **O-ALLN-006 状态栏授权 chip 归属与零双写口径** | **已裁决**（DC-ALLN-006：按 G 稿 §M 口径——**状态栏常显两态 chip = 授权态全 UI 唯一载体**（风险 rail auth 类**并入**）；黄点击 → 产出授权 next；绿点击 → 管理详情（`op.revoke` / `op.rebind` 入口）；**零双写机核**（四词工具栏零出现）；落地 FR-ALLN-085~088 / 092） |
| 7 | **O-ALLN-007 密度口径与连续宽度** | **已裁决**（DC-ALLN-007：**登记格口径与宽度解耦**（格 = 控件计数）；**320px 仍为验收锚点**；`data-narrow`（≤360）兜底样式；X5 取代登记但**测量口径不变**（阈值逐字不动）；落地 FR-ALLN-089~091 / 114） |
| 8 | **O-ALLN-008 `NEXTSTEP_ACTS` → opId 取代方式** | **已裁决**（DC-ALLN-008：chip `data-op` = opId；旧 6 act **等价映射**（`next→op.turn` / `repick→op.pick` / `describe→op.describe` / `authorize→op.authorize` / `help→op.help` / `rebind→op.rebind`）；`local-act-wiring` / `recommendation-sources` 判据**等价重锚**（X3 / X6）；落地 FR-ALLN-056 / 057 / 112 / 115） |
| 9 | **O-ALLN-009 `error` 卡行内恢复落层** | **已裁决**（DC-ALLN-009：error 事件 / 卡保持 append-only 冻结；**阻塞类 error 出生即带恢复区**（chip 区是**出生铸造的一部分**，非事后改写——**不违 append-only**）；非阻塞 error **不带**；落地 FR-ALLN-012） |
| 10 | **O-ALLN-010 法八存储侧边界与机核面** | **已裁决**（DC-ALLN-010：**流内 payload / digest / 审计 / DOM value 四面零明文机核 + key 直写 key-store 断言**；**存储侧加密 / 生命周期登记为 out-of-scope**（不得误读为「存储已加密」）；落地 FR-ALLN-021~024 / NG-ALLN-017） |
| 11 | **O-ALLN-011 G 稿是否入 `design-contract` 门禁** | **已裁决**（DC-ALLN-011：**双稿双 shim**——F 60 冻结**不替换** + G 127 **新增** + `designContractChanges` 登记（X4）；落地 FR-ALLN-100~103 / 113） |
| 12 | **O-ALLN-012 是否需要外部竞品调研** | **已裁决**（DC-ALLN-012：**不做**；登记「未执行，不阻塞」；**不编造结论**；落地 NG-ALLN-012） |

> **裁决记录**：DC-ALLN-001~012 的逐条理由见 §11。**无遗留未决需求**——所有开放点已裁决并落位到具体 FR / AC / EC / NG。

---

## 9. 验收标准（总体验收清单，含门禁映射）

> **口径**：每条 AC 必须**可验收**（可机核或可实跑），并标注承载门禁。**核心验收 = AC-ALLN-001 / 002 / 003 / 004 / 005 / 006**。

### 9.1 核心验收（法七 / 法八 / 契约 / 取代）

| ID | 验收标准 | 承载门禁 |
|----|---------|---------|
| **AC-ALLN-001** | **断流样板机器化主验收（O-005）**：headless 全链复刻 S2——① 绑定 → ② 自动探测 → ③ 未授权 → ④ ✖ 阻塞 → ⑤ 授权 next 产出 → ⑥ auth 卡 → ⑦ execute → ⑧ ✓ 回执 → ⑨ 探测恢复 → ⑩ 拾取 next 产出；断言「**死端 = 0**」；**浏览器原生弹窗体感入人工面**（`⏳` / `PASS`，不得冒充 PASS） | 新断流门禁（node + Chromium）+ `test:stream`（等价重锚）+ 人工面清单 |
| **AC-ALLN-002** | **死端守护门禁**：5 类阻塞终态**逐类**断言「行内或同屏紧随存在可达 next」；`N = 0`；**死端 = 0**；✖ 行不裸奔；**双向**注入反证（新增阻塞无 next ⇒ FAIL；已有 next 被删 ⇒ FAIL） | 新死端守护门禁（纳入 `gate-integrity`）+ 注入反证 |
| **AC-ALLN-003** | **法八四面零明文**：哨兵值 → 掩码输入 → 提交 → **① 流内 payload ② digest ③ 审计面 ④ DOM value / 全部属性**均不含哨兵；`digest` 含 `••••••`；**key 直写 key-store**（单一投递点）；存储侧边界显式登记 | 新法八机核（四面 + 属性扫描）+ `test:zero-injection ≥27` + 反证 |
| **AC-ALLN-004** | **契约 v2 七点逐条**：R1 可逆注册（N→N+1→N + 幂等）· R2 `deps ⊆ SERVICES` + 依赖就绪定序 · R3 `priority`/`prepend` + 按 id 整行覆盖（计数不变）· R4 挂载点 × 模式表 + `mode` 合法校验 · R5 三级失败语义（① 单卡边界 ② 注册 loud ③ 快照回滚）· R6 Seam 三件套 · R7 义务表 9 行 + 明示契约义务 | 注册表机核（新门禁）+ 逐点注入反证 |
| **AC-ALLN-005** | **证明义务表静态机核 + 分发器 diff = 0**：注册表 ↔ 义务表**行数 / opId 集 / 四要素 / 无悬空 chips** 一致；`handleCardAction` 零 per-op 分支；注册 / 卸载 / 覆盖 / 重复 id 四种操作下分发器文件哈希不变 | 义务表一致性机核 + 分发器源码判据（新门禁）+ 反证 |
| **AC-ALLN-006** | **X1~X6 六项显式取代全部等价重锚**：每项有台账条目 + 判据对账（力不降）+ 计数不减 + ≥1 注入反证；**无「放宽 / 删除 / 静默改常量 / 静默替换冻结对象」** | §12 映射表逐项落点 + 台账 + 各门禁计数对账 |

### 9.2 功能验收（op / 管线 / 执行器 / 设置面 / 界面面）

| ID | 验收标准 | 承载门禁 |
|----|---------|---------|
| AC-ALLN-007 | **9 个 op 逐条**（风险级 / params / consent / 执行层 / 回执）：`op.authorize` / `op.rebind` / `op.llm-config` / `op.perm.request` / `op.revoke` / `op.pick` / `op.describe` / `op.help` / `op.turn` 五要素齐备且与设计稿 §③（+ `op.turn` 补入）一致 | 注册表 + 义务表机核 + 逐 op 断言 |
| AC-ALLN-008 | **统一管线四态唯一**：9 op 全部经 `next →（params?）→（consent?）→ execute → receipt`，无 per-op 旁路；`params` / `consent` 缺省语义正确 | 管线机核 + 反证（旁路 ⇒ FAIL） |
| AC-ALLN-009 | **act → opId 映射 + chip `data-op` + 瘦分发**：6 条映射逐条等价成立；分发只读 `data-op`；分发器 diff = 0 | `recommendation-sources` / `local-act-wiring`（等价重锚）+ 新分发器判据 |
| AC-ALLN-010 | **双层执行器 + `op-*` type-only + SW 镜像**：特权 op 清单恰 2 项；`KIND_SET` 逐字零新增；`content.js` 177,076 B 逐字节命中；SW 镜像字段集 = {id, mode, fail, audit} 且同源 | `test:content` / `pick-layer-budget` / `insight-protocol`（等价重锚）+ 镜像一致性机核 |
| AC-ALLN-011 | **设置面收编零双路径**：4 类重叠操作各自唯一执行入口；设置面板按钮与 chat chip 同调；其余设置操作零改动；单一调用点机核（含本地 op 布线门禁） | `test/authorize-chip-wiring`（等价重锚）+ 新布线门禁 + `test:settings` / `l2-counts` |
| AC-ALLN-012 | **授权 chip 两态与零双写**：`#auth-state` 常显两态原文逐字；工具栏四词零出现；rail auth 类并入；状态栏第一行不写授权态；L2 台账指向 chip；**默认可点 6 ≤ 7** | `test/ui/l0.mjs`（244，等价重锚）+ `density.mjs`（232）+ 四词扫描 + 反证 |
| AC-ALLN-013 | **可拖动宽度**：280–640 + ARIA `separator` 四属性 + 键盘（`←/→` ±10 / `Home`/`End` / 双击复位 400）+ clamp + rAF 合并 + `data-narrow`（360/361 边界）；三档 radio 零残留 | `test/ui/journey.mjs`（171）/ `l0.mjs` / `density.mjs`（等价重锚）+ 新宽度判据 |
| AC-ALLN-014 | **密度口径不变**：阈值 `7/15 · 9/20 · 17/35` 逐字不动；豁免只认 `hidden`；登记格 = 控件计数（与宽度解耦）；320px 锚点保留；`#auth-state` 计入默认密度后仍 ≤7 | `test/density-thresholds.test.ts` + `density.mjs` + `docs/v4-density-baseline.json` 台账留痕 |
| AC-ALLN-015 | **状态栏单写者结构不破**：J1~J4 逐条；`#region-statusbar` 本体永不带 `hidden`；`#risk-chips` 有风险时无 `hidden`；`#auth-state` 为净新增且不破坏「单一写入者」结构 | `test/ui/l0.mjs` / `density.mjs` + `statusbar` 相关断言 |

### 9.3 设计契约与取代台账

| ID | 验收标准 | 承载门禁 |
|----|---------|---------|
| AC-ALLN-016 | **双契约**：F 四项常量（`DRAFT_SHA256` / `SHIM_SHA256` / `SHIM_CHECK_CALLS = 60` / 60 行映射）逐字不变；G 四项新增（`a7c0a77a…` / `d0107ecb…` / `127` / 127 行映射）；门禁实跑 F 60/60 + G 127/127 | `test:design-contract ≥6`（等价重锚 + 增 G 侧） |
| AC-ALLN-017 | **`designContractChanges` 登记**：从空数组变为含 G 条目（对象 / 前后 sha / 断言数 / 日期 / 理由）；台账可复算 | `test:design-contract` + `test:supersession`（登记完整性） |
| AC-ALLN-018 | **保护段处置留痕**：journey `43054..58287` / `cc79f413…` / 240 行**保段或八步显式取代**（`modifiedRanges[]` + `redlineRemap[]` + 计数守恒 ≥171 + RP-V4-08 反证）；binding `107780..115930` / `be9ad0e9…` **保段**；段外改写逐行登记 | `test:supersession ≥35` + `test:journey ≥171` + RP-V4-08 实跑 |
| AC-ALLN-019 | **门禁等价重锚清单逐项**（§5.12 FR-ALLN-120 的 20 项）：全部改写而非删除；每处可 FAIL 反证 + `expectFailPattern`；注入点被搬走必须重写 | 各门禁 + 反证留证 |
| AC-ALLN-020 | **测试总数只增**：`npm test ≥1045`；`l0 ≥244` / `density ≥232` / `journey ≥171` / `stream ≥63` / `ask-auth ≥61` / `recommendation ≥59` / `binding ≥192` / `insight ≥116` / `page-input ≥108` / `ref-pick-wiring ≥11` / `design-contract ≥6` / `supersession ≥35` / `gate-integrity ≥13` / `zero-injection ≥27` / `size-ruling-vol3 ≥12` / `l1 ≥116` / `l2 ≥74` / `hardening ≥24` / `l1-reverse ≥9` / `l2-reverse ≥10`（**逐项 ≥ 基线**） | `npm test` 全量 + 各门禁计数对账 |
| AC-ALLN-021 | **反证不空转**：每条改动 / 新增判据有「注入 FAIL → 逐字节还原 PASS」两段证据（日志全量）；无「不再 FAIL 的判据」遗留 | 反证留证（FR-ALLN-121） |

### 9.4 红线、体积与人工面

| ID | 验收标准 | 承载门禁 |
|----|---------|---------|
| AC-ALLN-022 | **红线逐字节**：`content.js` 177,076 B / `52a82620…`；`pick-layer.js` 33,900 B / `5f567d7e…`；`design/**` **四 sha**（F 双 + G 双）；判定链内容哈希；`docs/v3-supersession-ledger.json` 零 diff；`src/content/**` 零 diff | `test:content` / `pick-layer-budget` / `test:design-contract` / `zero-injection` + 逐字节核验 |
| AC-ALLN-023 | **体积与 V3-VOL-3**：`sidepanel.js ≤ 523,447 B`（生效上限）或走五要素重登记 + 档位上调义务显式登记；`SIDEPANEL_CEILING_CAP === 'record-only'`；档位 512,000 / 绝对上限 563,200 不变；`authorConfirmation.status` **未被伪称已确认** | `test:size-budget` + `size-growth-evidence` + `size-ruling-vol3 ≥12` |
| AC-ALLN-024 | **人工面清单逐项标注**（`⏳ 未执行` 或 `PASS`，**不得冒充 PASS**）：浏览器原生权限弹窗体感 / 授权 chip 两态观感 / 拖动宽度体感与性能 / 绿态管理详情手感 / 双主题 / 320px / 键盘 / 读屏（掩码输入 + chip）/ 真机 S2 断流走查 | 收口文档的人工面清单（逐项状态） |
| **AC-ALLN-025** | **每叶收尾全门禁绿 + 计数只增基线**：3 个叶**各自**在收尾时（a）全门禁串行复跑全绿（b）各门禁计数 ≥ 基线（c）无断言删除 / 降级（保护段显式取代除外）（d）反证留证齐备。父 Feature 的最终验收 = **3 叶全绿** + 共享面（体积 / journey / design-contract / 取代台账）恰一次登记 | 3 叶各自的收尾门禁日志 + 计数对账 + 父级共享面登记对账 |

### 9.5 门禁基线清单（**计数只增，逐项对账**）

| 门禁 | 基线 | 本 Feature 预期 | 门禁 | 基线 | 本 Feature 预期 |
|---|---:|:--:|---|---:|:--:|
| `npm test`（node 全量） | 1045 | ≥1045（增） | `test:l0` | 244 | ≥244（增） |
| `test:density` | 232 | ≥232（等价重锚 + 增） | `test:ui`（journey） | 171 | ≥171（增） |
| `test:stream` | 63 | ≥63（增） | `test:ask-auth` | 61 | ≥61（增） |
| `test:recommendation` | 59 | ≥59（等价重锚 + 增） | `test:binding` | 192 | ≥192（等价重锚） |
| `test:insight` | 116 | ≥116 | `test:page-input` | 108 | ≥108 |
| `test:ref-pick-wiring` | 11 | ≥11（等价重锚） | `test:design-contract` | 6 | >6（F+G 双侧） |
| `test:supersession` | 35 | ≥35（新条目） | `test:gate-integrity` | 13 | ≥13（新门禁受审） |
| `test:zero-injection` | 27 | ≥27 | `test:size-ruling-vol3` | 12 | ≥12 |
| `test:l1` | 116 | ≥116 | `test:l2` | 74 | ≥74 |
| `test:hardening` | 24 | ≥24 | `test:l1-reverse` | 9 | ≥9 |
| `test:l2-reverse` | 10 | ≥10 | `e2e` | PASS | PASS |


---

## 10. 问题覆盖矩阵（14 问题 → FR 逐条可追溯）

| 问题（discovery） | 级别 | 承载 FR | 承载 AC | 说明 |
|---|:--:|---|---|---|
| **Q-ALLN-001** 死端：阻塞终态之后流内零可达 next（法七不成立） | 核心 | FR-ALLN-010 / 011 / 012 / 013 / 014 / 015 / 016 | AC-ALLN-001 / 002 | 阻塞闭集 + 必有 next + ✖ 行出生带恢复 + 常驻候选 + 拒绝非死端 + 守护门禁 + S2 首验收 |
| **Q-ALLN-002** 用户操作面散落在 chat 之外（跳来跳去） | 核心 | FR-ALLN-040~049 / 055 / 075 / 087 / 088 | AC-ALLN-007 / 008 / 011 / 012 | 9 op 流内闭环 + 管线四态 + 设置面收编 + chip 点击产 next |
| **Q-ALLN-003** 架构不可扩张：新增操作必须改主流程 | 核心 | FR-ALLN-030~038 / 056~059 / 112 / 115 | AC-ALLN-004 / 005 / 009 | 契约 v2 七点 + 证明义务机核 + 瘦分发 + act→opId |
| **Q-ALLN-004** 敏感值没有流内入口，法二与法八未切分 | 核心 | FR-ALLN-020~024 | AC-ALLN-003 | 掩码卡 + 值直达存储 + 四面零明文 + 存储侧边界登记 |
| **Q-ALLN-005** 授权态多处投影，且非首装会话无授权入口 | 核心 | FR-ALLN-013 / 085~088 / 092 | AC-ALLN-012 / 015 | 授权态下移唯一载体 + 零双写 + 非首装常驻候选 |
| **Q-ALLN-006** 浏览器权限申请无处可申请（流内） | 次要 | FR-ALLN-043 / 066 / 110 | AC-ALLN-007 / 010 | `op.perm.request`（form 多选 + consent + 原生弹窗 + 双固化）+ `optional_permissions` |
| **Q-ALLN-007** 撤销 / 管理操作在流内无闭环 | 次要 | FR-ALLN-044 / 088 | AC-ALLN-007 / 012 | `op.revoke`（高风险确认 + 三表回滚 + 审计入口）+ 绿 chip 管理详情 |
| **Q-ALLN-008** 真机断流无法回归（无判据） | 次要 | FR-ALLN-015 / 016 | AC-ALLN-001 / 002 | 死端守护门禁 + S2 机器化 |
| **Q-ALLN-009** `error` 卡「只追加 / 出生冻结」与「行内带恢复 chip」冲突 | 次要 | FR-ALLN-012 | AC-ALLN-002 | O-009：出生铸造带恢复区（不违 append-only） |
| **Q-ALLN-010** 设置视图（管理面）与 chat（操作面）单一执行入口纪律缺位 | 次要 | FR-ALLN-075~078 | AC-ALLN-011 | 4 类重叠收编 + 零双路径 + 唯一调用点机核 |
| **Q-ALLN-011** 体积余量只有 24,926 B，本 Feature 体量远超前几轮 | 潜在 | FR-ALLN-130~134 | AC-ALLN-023 | 五要素 + 上限公式 + V3-VOL-3 三值 + **预算前移评估** |
| **Q-ALLN-012** `content.js` 零余量与 `op-*` 消息族通路冲突 | 潜在 | FR-ALLN-067 / 069 / 111 | AC-ALLN-010 / 022 | type-only 消息族 + 逐字节零增长红线 |
| **Q-ALLN-013** `design-contract` 门禁只冻结 F，G 稿「不在任何门禁内」（契约真空） | 潜在 | FR-ALLN-100~103 / 113 | AC-ALLN-016 / 017 | 双稿双 shim + G 入契约 + `designContractChanges` 登记 |
| **Q-ALLN-014** 可拖动宽度会改写密度测量口径（三档 → 连续） | 潜在 | FR-ALLN-089~091 / 114 | AC-ALLN-013 / 014 | 分隔条 + `data-narrow` + 登记格口径解耦（320 锚点保留） |

**覆盖结论**：14/14 问题各有 ≥1 条 FR + ≥1 条 AC 承载；无「有问题无需求」与「有需求无来源」的双向缺口。

---

## 11. 开放点裁决落位表（O-ALLN-001~012 → 条文）

| 开放点 | 裁决（DC-ALLN-0xx） | 落位 FR / AC / EC / NG | 落位结构（原文依据） |
|---|---|---|---|
| **O-ALLN-001** op 首批范围 | 设计稿 **8 op** + **`op.turn`** = **9 op**；会话 / 分组**不收编**（`deferred`） | FR-ALLN-040~049；AC-ALLN-007 | 设计稿 §③（8 op 表）；作者 Q1「等」的外扩边界由本裁决钉死 |
| **O-ALLN-002** 注册表形态 | **纯 TS 注册**（`NextProvider`/`NextOp` + `registerNextProvider()` 幂等 unregister）；**证明义务表 = 静态机核**（注册表 ↔ 义务表一致）；**不做 JSON** | FR-ALLN-030~038；AC-ALLN-004 / 005 | 设计稿 §①（`{id, deps, priority, prepend, mode, fail, when, chips, dispose}` 示意）+ §⑦ 表尾明示义务 |
| **O-ALLN-003** SW 端执行器 | **双层**：panel-local op 面板执行；特权 op（`op.authorize` origin / `op.perm.request`）经 **type-only `op-*`** 走 SW 执行器 + SW 侧**小型注册表镜像契约**（id / 模式 / 失败语义 / 审计）；`KIND_SET` 不动 | FR-ALLN-065~069；AC-ALLN-010 | 设计稿 §④（挂载点 × 模式）+ §⑤（失败语义）；`messaging.ts:68-89` type-only 先例 |
| **O-ALLN-004** `settings/ops.ts` 关系 | 重叠 **4 类**（authorize / revoke / rebind / llm-config）**收编**为 op 单一执行入口（设置按钮与 chat chip 都是 op 触发器，**零双路径**）；其余不动 | FR-ALLN-075~078；AC-ALLN-011；EC-ALLN-016 | `settings/ops.ts:122-149`（17 操作）；FIX-1 `authorizeCurrentSite()` 先例 |
| **O-ALLN-005** 断流首验收 | **机器化主验收**（headless 全链 S2，断言死端 = 0）+ **浏览器权限弹窗体感入人工面** | FR-ALLN-016；AC-ALLN-001 / 024 | 设计稿死端对比表（5 环节）+ `option-g-shim.mjs` §F / §J |
| **O-ALLN-006** 授权 chip 归属 | 按 G 稿 §M：`#auth-state` **状态栏常显两态** = 授权态全 UI **唯一载体**（rail auth 类**并入**）；黄 → 产 next；绿 → 管理详情；**零双写机核** | FR-ALLN-085~088 / 092；AC-ALLN-012 / 015 | 设计稿「授权态的归属」（唯一常显载体 / 四词工具栏零出现 / 两态原文 / 零双写 / 6 ≤ 7） |
| **O-ALLN-007** 密度与连续宽度 | **登记格口径与宽度解耦**（格 = 控件计数）；**320px 仍为验收锚点**；`data-narrow`（≤360）兜底；X5 取代但**测量口径不变** | FR-ALLN-089~091 / 114；AC-ALLN-013 / 014 | 设计稿「密度口径（法五，与 F 完全一致）」+「已知取舍：连续宽度让窄屏兜底不再有档位边界」 |
| **O-ALLN-008** act → opId | chip `data-op` = opId；旧 6 act **等价映射**（`next→op.turn` / `repick→op.pick` / `describe→op.describe` / `authorize→op.authorize` / `help→op.help` / `rebind→op.rebind`）；判据**等价重锚** | FR-ALLN-056 / 057 / 112 / 115；AC-ALLN-009 | 设计稿变化点第 4 行（chip 绑 opId）+ §⑦ 证明义务表 |
| **O-ALLN-009** `error` 行内恢复落层 | error 事件 / 卡保持 **append-only 冻结**；**阻塞类 error 出生即带恢复区**（chip 区是出生铸造的一部分，**非事后改写**）；非阻塞 error 不带 | FR-ALLN-012；AC-ALLN-002 | 设计稿变化点第 1 行（`error` 行内带恢复 chip + 紧随恢复 next）+ 法七「✖ 行不裸奔」 |
| **O-ALLN-010** 法八边界与机核面 | **流内 payload / digest / 审计 / DOM value 四面零明文** + **key 直写 key-store** 断言；**存储侧登记 out-of-scope** | FR-ALLN-021~024；AC-ALLN-003；NG-ALLN-017 | 设计稿「法八验收口径」+「已知取舍：掩码输入无法证伪存储侧明文」 |
| **O-ALLN-011** G 稿入契约 | **双稿双 shim**：F 60 冻结**不替换** + G 127 **新增** + `designContractChanges` 登记 | FR-ALLN-100~103 / 113；AC-ALLN-016 / 017 | `test/design-contract.test.ts:60-73`（双 sha + 60 + 60 行映射）+ 台账 `designContractChanges = []` |
| **O-ALLN-012** 外部竞品调研 | **不做**（登记「未执行，不阻塞」，不编造结论） | NG-ALLN-012 | discovery §4.1（dsh 已核实对标 + 仓库内 `lgdl-web-op-cli` 参照） |

### 11.1 裁决记录（DC-ALLN-001~012 理由一句话）

| # | 裁决 | 落地条文 | 理由（一句话） |
|---|---|---|---|
| **DC-ALLN-001** | 9 op（设计稿 8 + `op.turn`）；会话 / 分组 deferred | FR-ALLN-040~049 | 作者 Q1 的「一站式闭环」需要「chips 即指令」的发回合入口（否则「next chip → 回合」缺一环）；而会话 / 分组不属「需要用户操作的阻塞 / 配置 / 管理」面，收编会把范围与体积一起打开 |
| **DC-ALLN-002** | 纯 TS 注册 + 义务表静态机核 | FR-ALLN-030~038 | 设计稿 §① 已是 TS 示意；JSON 声明会引入**新加载面**（违反 NG-ALLN-015 不新增真值源 / 新面），且义务表「功能 → 机制」的一致性可以用测试断言直接机核，无需运行时声明 |
| **DC-ALLN-003** | 双层执行器 + type-only `op-*` | FR-ALLN-065~069 | origin / 浏览器权限**只能在 SW 或用户手势路径内**申请（`capability-wiring` 已钉死「SW 永不 `.request(`」的先例语义须等价保留）；`KIND_SET` 在 `content.js` 零余量通路内 ⇒ 只能走 type-only |
| **DC-ALLN-004** | 4 类重叠收编 + 单一执行入口 | FR-ALLN-075~078 | FIX-1 已证明「单一生产入口」是消除双写的正确形态；v4.5 的双写教训（同一事实两个版本）绝不能以「chat op + 设置页实现」重演 |
| **DC-ALLN-005** | 机器化主验收 + 弹窗入人工面 | FR-ALLN-016；AC-ALLN-001 | headless 下 `chrome.permissions.request` 不可合成（`PENDING_TIMEOUT`）⇒ 把可机核的部分**全部机核**、把不可合成的部分**如实登记为人工面**（不冒充 PASS） |
| **DC-ALLN-006** | 状态栏常显 chip = 唯一载体 | FR-ALLN-085~088 / 092 | 作者 ⑧ 反馈逐字：「如果属于状态，那就放到最下面的状态栏」；G 稿 §M 已把「零双写 / 两态原文 / 6 ≤ 7」全部机核（23 条），本规范只需把它落成验收 |
| **DC-ALLN-007** | 登记格口径与宽度解耦；320 锚点 | FR-ALLN-089~091 / 114 | 密度登记格统计的是**控件数**而不是宽度；连续宽度只改变「哪些样式生效」⇒ 把口径与宽度解耦可让 31 格与阈值**逐字不动**，同时用 `data-narrow` 机核窄屏兜底 |
| **DC-ALLN-008** | 6 act 等价映射为 opId | FR-ALLN-056 / 057 / 112 / 115 | op 词汇必须是**唯一权威**（否则「新增操作要改闭集」的旧病复发）；等价映射保证既有能力零丢失、门禁可逐条重锚 |
| **DC-ALLN-009** | error 出生即带恢复区 | FR-ALLN-012 | append-only 约束的是「出生之后不再被改写」；把恢复区放进**铸造期**既满足法七（✖ 行不裸奔）又不触碰冻结语义（卡出生后仍不 patch） |
| **DC-ALLN-010** | 四面零明文 + 存储侧 out-of-scope | FR-ALLN-021~024；NG-ALLN-017 | 设计稿 §E 已机核 3 面 + 属性；再加「审计面」成四面更严；存储侧加密是**另一件事**（不是 UI 稿能证明的），必须显式登记以免被误读为「已加密」 |
| **DC-ALLN-011** | 双稿双 shim（F 不替换 + G 新增） | FR-ALLN-100~103 / 113 | N21 要求 F 契约继续成立；G 是本轮唯一权威基准却「不在任何门禁内」⇒ 必须入契约，且**不能以替换 F 的方式**入 |
| **DC-ALLN-012** | 不做外部竞品调研 | NG-ALLN-012 | 本 Feature 是既有设计的形态收口 + 架构约束对标（dsh 已核实七点），不是交互模型选型；无外部参照不构成论证缺口 |

---

## 12. X1~X6 显式取代 → 判据等价重写映射表（**映射摘要**）

> **口径**：**「显式取代」≠「放宽」**。每项的判据都必须**等价重锚**（断言力不降、计数只增），并留台账。下表给出「取代内容 → 原名门禁 → 等价重写后的判据形态 → 台账落点」。

| # | 既有红线（现状逐字） | 取代内容 | 原名门禁（须等价重写） | **等价重写后的判据形态（摘要）** | 台账落点 |
|---|---|---|---|---|---|
| **X1** | **「manifest 零改动 / 零新增静态权限」**：`capability-wiring.test.ts:26-29` 静态集合逐字 + `:35-38` 可选集合逐字 5 项 + `:50` host 6 条 | **允许新增 `optional_permissions`**（作者裁决①）：安装期静态 `permissions` **逐字不变** | `capability-wiring.test.ts` / `binding-wiring.test.ts:50-58` / `auto-session-wiring.test.ts:81-94` / `test/ui/binding.mjs`（192） | ① 静态集合仍**逐字**断言（5 项，不因新增可选而放开）② 可选集合改为**显式名单 + 新增项逐项在册**（不是「长度 ≥5」这类放宽）③ `host_permissions` 6 条与「无 `<all_urls>` / 无静态 `content_scripts`」不变 ④ 「SW 永不 `.request(`」语义**等价保留**（改为「特权 op 经 SW 执行器 + 手势路径」）⑤ 新增权限项配**最小必要论证** | v4 取代台账 `modifiedRanges[]` + `designContractChanges` 邻域；每项判据对账 |
| **X2** | **「SW / `KIND_SET` 零新 kind」**：`KIND_SET` 被 `content-script.ts:20` 打进 `content.js`（零余量；历史 +307 B） | **G 新增 `op-*` 消息族**（**默认 type-only**；若进 `KIND_SET` 须证逐字节零增长） | `content.test.ts` / `pick-layer-budget.test.ts` / `insight-protocol.test.ts`（同源先例） | ① `KIND_SET` 内容**逐字对比零新增** ② `content.js` **逐字节 / 逐 sha** 不变（177,076 B）③ 新族走**独立运行时校验模块**（与 `command-policy` / `pick-layer-*` / `ref-rescue` 同源）④ 「加进 `KIND_SET` 即红」的反证存在 | 台账 + `test:content` 反证留证 |
| **X3** | **act 闭集 6 项**：`NEXTSTEP_ACTS` 逐字 `['next','repick','describe','authorize','rebind','help']`，被两处门禁**逐字**钉死 | **契约 v2 的 op 注册表（`act` = `opId`）**：chip 绑 `data-op`；候选由注册表纯谓词产生；分发器 **per-op diff = 0** | `recommendation-sources.test.ts` / `local-act-wiring.test.ts` / `authorize-chip-wiring.test.ts` / `test/ui/recommendation.mjs`（59）/ `test:ref-pick-wiring`（11） | ① 旧「闭集 6 项」判据重写为「**注册表 opId 集**」判据（9 项，且新增 op 自动纳入 —— 判据力**上升**而非下降）② 源白名单 7 项语义保留（注册表候选仍只读既定 state 字段）③ 本地 act 槽重写为「**本地 op 槽**」（`op.pick` / `op.describe` / `op.rebind` / `op.help` / `op.authorize`）/ 无 `requestTurn` / 不受 `pending` 门控 ④ 单一入口判据按 op 逐条保留（4 类收编后调用点唯一） | 台账 `modifiedRanges[]` 逐行 + 各门禁计数对账 |
| **X4** | **`design-contract` 只冻结 F**（`SHIM_CHECK_CALLS = 60` + F 双 sha）；`designContractChanges = []` | **G 稿 + 127 断言入契约**（F **并存不替换**） | `test/design-contract.test.ts`（6） | ① F 四项常量**逐字不变**（N21 反证：替换 ⇒ FAIL）② 新增 G 四项（`a7c0a77a…` / `d0107ecb…` / `127` / 127 行映射）③ G 侧同构判据（调用点 127 + 声明 1 / id 集相等 / 映射表 127 行）④ 双契约**各冻各的**，互不覆盖 | `docs/v4-supersession-ledger.json#designContractChanges`（空数组 → 含 G 条目） |
| **X5** | **密度三档视口（320 / 400 / 520）+ 原三档宽度 radio** | **连续可拖动宽度 280–640**：ARIA `separator` + 键盘 + clamp + 双击复位；窄屏兜底改 `data-narrow`（≤360） | `test/ui/density.mjs`（232）/ `l0.mjs`（244）/ `journey.mjs`（171）/ `density-thresholds.test.ts` + `docs/v4-density-baseline.json#tiers` | ① **阈值逐字不动**（`7/15 · 9/20 · 17/35`）② 豁免口径只认 `hidden` 不变 ③ 登记格 = **控件计数**（与宽度解耦）⇒ 320 档保留为**不变量测量点**，400 / 520 档按等价口径保留或显式重锚（**逐格留痕**）④ 新增 `data-narrow` 边界（360/361）与宽度 ARIA / 键盘 / clamp 判据（**增**）⑤ 三档 radio **零残留** | `docs/v4-density-baseline.json` 新台账（前后值 / 日期 / 来源 / 理由 / 历史保留）+ `tiers` 重锚留痕 |
| **X6** | **推荐 chip 绑动作字符串（`data-act`）· 候选来自手写规则 · 分发为手写 switch** | 同 X3 的一体两面：`chip ↦ opId`（`data-op`）+ 注册表候选 + 统一管线四态；`error` 卡**行内**带恢复 chip（法七） | 见 X3 + `test/ui/stream.mjs`（63）/ `ask-auth-inflow.mjs`（61） | ① chip 只读 `data-op`（`data-act` 降为渲染别名，不得作分发依据）② 候选来源重写为「注册表纯谓词」（`when(ctx)` 单测）③ 分发器 16 分支 → **零 per-op 分支**（diff = 0 判据）④ `error` 行内恢复 = **铸造期**属性（`stream.mjs` 断言**增**）；`askuser` `secret` / `form` 扩形断言**增** | 台账 + `test:stream` / `ask-auth` 计数对账（只增） |

**X 项落地纪律（逐条强制）**：① 每项**不得**以「放宽阈值 / 删除断言 / 静默改常量 / 静默替换冻结对象」落地（FR-ALLN-116）② 每项配 ≥1 条注入反证（注入 → FAIL → 逐字节还原 → PASS）③ 每项判据力可**逐条对账**（旧判据 → 新判据映射可核）④ 每项在台账有明文条目（`modifiedRanges[]` / `designContractChanges` / 密度台账）。

---

## 13. 红线继承表（N1~N21 逐条承载）

> **口径**：N1~N21 为 discovery §7.2 认定的**约束**（不是需求）；本规范**不得改写数值或放宽口径**，逐条给出承载条文与验收锚点。

| # | 红线（**逐字**） | 本规范承载 | 验收锚点 |
|---|---|---|---|
| N1 | `dist/content.js` = **177,076 B**，sha256 `52a826205553b46a896ccad54225d63ba62f5f7fe7c969a9bc2e655448d5b5f6`（**零容差**） | FR-ALLN-069 / 133；NG-ALLN-003 | AC-ALLN-022 |
| N2 | `dist/pick-layer.js` = **33,900 B**，sha256 `5f567d7ededc58183afe4ce45e3293b68204dfbe788dc6b9fb09bdc6e0d13e59`（**零容差**） | FR-ALLN-069 / 133；NG-ALLN-003 | AC-ALLN-022 |
| N3 | `sidepanel.js` ≤ 生效上限 **523,447 B** = `floor(498,521 × 1.05)`；单轮容差 **5%** 未动；`SIDEPANEL_CEILING_CAP` 保持 **`record-only`** | FR-ALLN-131 / 134；NG-ALLN-009 | AC-ALLN-023 |
| N4 | V3-VOL-3 三值：档位 = **512,000 B**、绝对上限 = **563,200 B**（= 档位 × 1.10）、`newBaselineBytes` 随现行基线**同源前移**；`authorConfirmation.status ∈ {pending-author-line, confirmed, overridden-by-author}`，**不得伪称已确认** | FR-ALLN-132 / 134 | AC-ALLN-023 |
| N5 | 密度阈值 **7/15 · 9/20 · 17/35 逐字保留**；豁免口径**只认 `hidden`**；防滥用单卡 ≤6 / 首屏 ≤2 / 合计 ≤8 / 欢迎卡 ≤1 | FR-ALLN-091 / 114；NG-ALLN-007 | AC-ALLN-014 |
| N6 | **`STREAM_HEIGHT_RATIO_MIN = 0.65`（只允许上调）**；`journey #15b`「`#region-stream` 高度占比 ≥65.0%」 | NFR-ALLN-001 | AC-ALLN-013 / 020 |
| N7 | **风险位永不折叠**（`#region-statusbar` 本体永不带 `hidden`；`#risk-chips` 有风险时无 `hidden`）；状态栏 J1~J4 单写者结构 | FR-ALLN-092 | AC-ALLN-015 |
| N8 | **安装期静态权限零变化**：`manifest.permissions` 逐字 `['activeTab','scripting','storage','sidePanel','tabs']`；`host_permissions` 6 条；无 `<all_urls>` / 无 `*://*/*` / 无静态 `content_scripts`；`minimum_chrome_version` = `116` | FR-ALLN-110；NG-ALLN-005 | AC-ALLN-012 邻域（权限面）/ AC-ALLN-022 |
| N9 | **判定链零触碰**：`src/security/policy.ts` / `src/security/auto-authorize.ts` 在 `zeroDiffFiles` 冻结（内容哈希 pin） | FR-ALLN-133；NG-ALLN-004 | AC-ALLN-022 |
| N10 | `src/ui/options/index.html` 在 v3 台账 `zeroDiffFiles` 内（v4.5 已走一次**显式解冻**：纯文案单行 + 范围门禁）；**v3 台账为冻结历史，不得解冻** | FR-ALLN-133；NG-ALLN-004 | AC-ALLN-022 |
| N11 | **断言零删除零降级、计数只增不减**（唯一例外 = 保护段按台账 **显式取代**并留痕，**不是静默删除**） | FR-ALLN-003 / 116 / 120；NG-ALLN-008 | AC-ALLN-019 / 020 |
| N12 | 保护 pin：journey **`43054..58287` / sha `cc79f413…` / 240 行**（`supersessionChain` 3 链节）；binding **`107780..115930` / sha `be9ad0e9…`**（`decision = keep`） | FR-ALLN-122 | AC-ALLN-018 |
| N13 | **门禁严格串行**（一次一个 Chromium，`finally` 自清 profile；`test` / `test:ui` / `test:binding` **绝不并发**） | FR-ALLN-124 | AC-ALLN-020 / 024 |
| N14 | 纪律：**不碰 `main`、不 force push、path-limited `git add`（禁 `git add -A` / `.`）、禁改 `.opencode/opencode.json`、禁改 `packages/web-cli-base/**`、无新依赖**；**不合 main、不发布** | §16；NG-ALLN-014 | §16 纪律表 |
| N15 | 取代台账 `knownGap` 一致性：`status = complete-steps-1-8` 时该字段**必须为空或仅声明闭环**（`test/supersession-ledger.test.ts` 机核强制） | FR-ALLN-123 | AC-ALLN-018 |
| N16 | `F-29`（A2A 候选）**未立项未排期，保持原样不动**（ROADMAP 相关区段一字不动） | NG-ALLN-013 | AC-ALLN-001 邻域（纪律）/ §16 |
| N17 | **零新增流内固定宿主**：`REGISTERED_STRUCTURAL_HOSTS = []` + 「任意深度零 `[data-host]` / `[data-transitional-host]`」判据（v4.5 刚建立） | NG-ALLN-016；FR-ALLN-085（chip / 分隔条**不在流内**） | AC-ALLN-015 邻域（零宿主） |
| N18 | `KL-N-10` 处置纪律：首轮异常**隔离复跑 ≥2**、日志全量、**仍红如实记录不阻塞收口**（不伪造串行绿） | FR-ALLN-124 | AC-ALLN-024 |
| N19 | **12 kind 契约不动**（7 主类 + 5 过程卡）；回执复用固化区 + 系统行，**不新增卡类型** | NG-ALLN-001；FR-ALLN-020（扩形非新 kind） | AC-ALLN-003 / 007 |
| N20 | 设计稿已定稿冻结（`05f612e`，127 断言全绿）；`design/**` 改动须同时满足 127 断言 + 更新 sha 常量 + 台账登记（**禁静默改断言**） | FR-ALLN-103；NG-ALLN-018 | AC-ALLN-016 |
| N21 | **`design-contract` 门禁只冻 F（60 断言）**，不得因 v5 而**静默替换** F 的冻结常量（F 契约须继续成立） | FR-ALLN-100 / 103；NG-ALLN-010 | AC-ALLN-016 |

**spec 新增红线（本阶段识别，与 N 同等级）**：

| # | 红线（本规范新增） | 承载 | 理由 |
|---|---|---|---|
| **N22** | **`handleCardAction` 分发器零 per-op 分支**（diff = 0）：该文件不得因新增 provider / op 而改变 | FR-ALLN-058；NFR-ALLN-012 | 「新增 provider 只改注册表条目」是本 Feature 的**明示契约义务**（设计稿 §⑦ 表尾）；无此判据则该义务不可机核 |
| **N23** | **`#auth-state` 为授权态全 UI 唯一常显载体**：四词（未授权 / 已授权 / 零注入 / supported）在工具栏区零出现；rail 授权类零残留 | FR-ALLN-086 | 作者 ⑧ 反馈 + 零双写；历史上「同一状态三处投影」正是 R1 根因 |
| **N24** | **流内零明文四面**（payload / digest / 审计 / DOM value 与全部属性） | FR-ALLN-023 | 法八的**可核判据**；仅靠净化面不等于「零明文可核」 |
| **N25** | **`op.turn` 是唯一经 `requestTurn` 的 op**；其余 op 零 `requestTurn` | FR-ALLN-048 / 059 | 「本地动作零回合」约束（ADR-V4-038 §5）在 op 词汇下的等价形态 |

---

## 14. 子 Feature 拆分与交付顺序

### 14.1 结构裁决（**3 叶，依存序，串行**）

| 项 | 裁决 | 理由 |
|---|---|---|
| 父 Feature | `specs-tree-web-cli-plugin-v5-all-in-next`，`depth=1`，**轻量规范容器**（不承接 tasks/build/review/validate，不产出 `tasks.json`） | v3-ui / v4-chat / v4.5 先例 |
| 子 Feature | **3 叶**：① `specs-tree-v5-1-next-registry-pipeline` ② `specs-tree-v5-2-ops-first-batch` ③ `specs-tree-v5-3-chrome-face` | 见下 |
| 拆分依据 | 四类共享面（体积重登记 / journey 结构重锚 / `design-contract` 登记 / 取代台账）被 ≥2 叶触碰 ⇒ **共享面必须一次做完**（FR-ALLN-004）；但**注册表与管线**（架构层）、**9 op 落地**（功能层）、**界面面**（形态层）三者的**取代对象 / 门禁主面 / 台账条目**互不重叠，具备独立成叶的判据 | 与 discovery §6.3 的 4 叶草案不同：本规范按**编排器结构裁决**合为 3 叶（`v5-4` 内容并入 `v5-3`） |
| 串行理由 | `v5-2` 的 9 op 依赖 `v5-1` 的注册表 / 管线接口；`v5-3` 的授权 chip 点击行为 / 管理详情依赖 `v5-2` 的 `op.authorize` / `op.revoke` / `op.rebind` 落地 | 依赖方向明确，叶间不可并行 |
| 否决的拆分草案 | discovery §6.3 的 **4 叶**（`v5-1-no-dead-end` / `v5-2-web-op-pipeline` / `v5-3-in-chat-ops` / `v5-4-auth-chip-and-width`） | ① 「法七无死端」**不是独立层**：它的机制基础在注册表 / 管线（`v5-1`），首验收在 `v5-2`，守护门禁在 `v5-3` ⇒ 独立成叶会造成「同一判据三叶各改一次」；② 授权 chip 与可拖动宽度同为**界面面形态**（同一次 density / l0 / journey 门禁重锚）⇒ 合为 `v5-3` |

### 14.2 交付顺序与叶职责

| 顺序 | 叶 | 职责 | 依赖 |
|:--:|---|---|---|
| 1 | **`specs-tree-v5-1-next-registry-pipeline`**（P0） | **契约 v2 注册表 + op 管线 + act→opId + 瘦分发 + 双契约 + 证明义务机核**：`NextProvider` / `NextOp` 接口（Definition）+ 注册表（Provider）+ `handleCardAction` 单次查表（Consumer）；契约 v2 七点（FR-ALLN-030~038）；统一管线四态（FR-ALLN-055）；act→opId 映射 + chip `data-op` + 瘦分发 diff = 0（FR-ALLN-056~058）；本地 op 语义对齐（FR-ALLN-059）；死端守护的**机制基础**（阻塞态枚举单源 + 候选可达性，FR-ALLN-010 / 011 / 013 的注册表侧）；**双稿双 shim 入契约**（FR-ALLN-100~103）+ X3 / X4 / X6（chip 侧）取代等价重锚（FR-ALLN-112 / 113 / 115） | —（P0，首个） |
| 2 | **`specs-tree-v5-2-ops-first-batch`**（P0） | **9 op 落地 + SW 执行器 + `optional_permissions` + 掩码 llm-config + settings 收编 + 断流首验收**：9 个 op 五要素（FR-ALLN-040~049）；SW 双层执行器 + `op-*` type-only + SW 镜像（FR-ALLN-065~069）；`optional_permissions` 放开（FR-ALLN-110 / X1）；掩码 `secret` 卡 + 值直达存储 + 流内只留事实（FR-ALLN-020~022）；settings 4 类收编 + 单一调用点（FR-ALLN-075~078）；拒绝非死端（FR-ALLN-014）；**S2 断流样板机器化首验收**（FR-ALLN-016 / AC-ALLN-001） | v5-1（注册表 / 管线接口是前置） |
| 3 | **`specs-tree-v5-3-chrome-face`**（P0） | **授权 chip + 可拖动宽度 + 密度连续口径 + 死端守护门禁 + 法八机核**：`error` 出生带恢复区（FR-ALLN-012）+ **死端守护门禁**（FR-ALLN-015）；`#auth-state` 两态 + 零双写 + 黄 / 绿点击行为（FR-ALLN-085~088 / 092）；可拖动宽度 + `data-narrow` + 密度口径解耦（FR-ALLN-089~091 / X5 = FR-ALLN-114）；**法八四面零明文机核 + key 直写 key-store 断言**（FR-ALLN-023 / 024）；体积收口（FR-ALLN-130~134） | v5-2（授权 chip 的点击行为 / 管理详情依赖 `op.authorize` / `op.revoke` / `op.rebind` 已落地） |

### 14.3 FR → 叶 覆盖矩阵（**每条 FR 恰属一叶的「主责面」；共享面另标**）

| FR 组 | FR 编号 | 主责叶 | 共享面 |
|---|---|---|---|
| GOV | FR-ALLN-001~005 | 父（结构 / 纪律）；各叶各自执行 | 体积 / journey / design-contract / 台账 |
| LAW7 | FR-ALLN-010 / 011 / 013 | **v5-1**（阻塞闭集单源 + 候选可达性机制） | — |
| LAW7 | FR-ALLN-012 / 015 | **v5-3**（error 出生带恢复 + 死端守护门禁） | `test:stream` |
| LAW7 | FR-ALLN-014 / 016 | **v5-2**（拒绝非死端 + S2 断流首验收） | `test:stream` / `test:ask-auth` |
| LAW8 | FR-ALLN-020 / 021 / 022 | **v5-2**（掩码卡 + 值直达存储 + 流内只留事实） | `test:ask-auth` |
| LAW8 | FR-ALLN-023 / 024 | **v5-3**（四面零明文机核 + 存储侧边界） | `test:zero-injection` |
| CONTRACT | FR-ALLN-030~038 | **v5-1** | — |
| OPS | FR-ALLN-040~049 | **v5-2** | — |
| PIPE | FR-ALLN-055~059 | **v5-1** | `test:recommendation` / `local-act-wiring` |
| SW | FR-ALLN-065~069 | **v5-2** | `test:content` / `pick-layer-budget` |
| SETTINGS | FR-ALLN-075~078 | **v5-2** | `test:settings` / `l2-counts` |
| CHROME | FR-ALLN-085~092 | **v5-3** | `test:l0` / `density` / `journey` |
| DESIGN | FR-ALLN-100~103 | **v5-1** | `test:design-contract` / 台账（**共享面**） |
| SUPERSEDE | FR-ALLN-110 / 111 | **v5-2**（X1 / X2） | `capability-wiring` / `content` |
| SUPERSEDE | FR-ALLN-112 / 113 / 115 | **v5-1**（X3 / X4 / X6-chip 侧） | `recommendation` / `design-contract` |
| SUPERSEDE | FR-ALLN-114 | **v5-3**（X5） | `density` / `journey` |
| SUPERSEDE | FR-ALLN-116 | 父（纪律）+ 各叶各自对账 | 台账 |
| GATE | FR-ALLN-120~125 | 各叶按主责面；父级共享面（journey / 台账 / 体积）**一次做完** | **共享面** |
| VOL | FR-ALLN-130~134 | **共享面**（各叶按自身增量登记；收口在 v5-3） | **共享面** |

**覆盖结论**：父 §5 全部 **80 条 FR** 各有主责叶；**无「无主 FR」**；**共享面（体积 / journey / `design-contract` / 取代台账）明确标注为「一次做完」**（FR-ALLN-004）。


---

## 15. 风险登记（discovery 继承 R-ALLN-001~016 + spec 新增 R-ALLN-901~910）

### 15.1 继承风险（discovery §5.2，逐条保留等级与预登记证据）

| # | 风险 | 等级 | 承载条文 / 应对 |
|---|---|:--:|---|
| R-ALLN-001 | **体积越限**：余量仅 **24,926 B（+5.00%）**、距档位 **13,479 B**；本 Feature 新增面远超前几轮 ⇒ 极可能触发重登记并可能需**上调档位**（`authorConfirmation.status = pending-author-line` **不得伪称已确认**） | **高** | FR-ALLN-130~134；AC-ALLN-023；**禁止在预算未评估前排「全量落地」** |
| R-ALLN-002 | **`content.js` 红线通路**：`op-*` 消息族若进 `KIND_SET` 会增长 `content.js`（历史 +307 B / 6 字符串，零余量） | **高** | FR-ALLN-067 / 069 / 111；AC-ALLN-010 / 022；EC-ALLN-003 邻域 |
| R-ALLN-003 | **权限面安全评审 + manifest 判据精确集合**：静态 5 / 可选 5 / host 6 / 「SW 永不 `.request(`」被判据**逐字**钉死；新增 / 改动 optional 项须**等价改写判据**（不是放宽）+ 最小集论证 | **高** | FR-ALLN-110 / 066；NFR-ALLN-009；AC-ALLN-010 / 012 |
| R-ALLN-004 | **注册表取代既有推荐器**：4 规则 + `NEXTSTEP_ACTS` 6 项逐字闭集 + `handleCardAction` 16 分支 + 源白名单 7 项，牵动 4 个门禁（`recommendation-sources` / `local-act-wiring` / `authorize-chip-wiring` / `recommendation.mjs`）——「建议迁移量」最大 | **高** | FR-ALLN-030~038 / 056~058 / 112；AC-ALLN-004 / 005 / 009 / 019 |
| R-ALLN-005 | **design-contract 契约真空**：G 稿与 127 断言不在任何门禁内 ⇒ 实现偏离设计稿机器不可发现 | **高** | FR-ALLN-100~103；AC-ALLN-016 / 017 |
| R-ALLN-006 | **`error` 卡「出生冻结」契约冲突**：法七要求 ✖ 行**行内**带恢复 chip，而 `error ∈ BORN_FROZEN_KINDS` | **中高** | FR-ALLN-012（O-009 落层：出生铸造）；AC-ALLN-002 |
| R-ALLN-007 | **状态栏授权 chip 归属与双写面**：授权态同时存在于工具栏摘要与风险 rail；下移 = ≥3 处改口径 + 零双写判据 | **中高** | FR-ALLN-086 / 092；AC-ALLN-012 / 015 |
| R-ALLN-008 | **「值不入流」实现层可核性**：需哨兵扫描 + 对抗反证（v4.5 三类「反证恒绿」教训） | **中高** | FR-ALLN-023 / 121；AC-ALLN-003 / 021 |
| R-ALLN-009 | **密度口径变更（三档 → 连续宽度）**：31 登记格 / 三视口断言 / `data-narrow` / `STREAM_HEIGHT_RATIO_MIN = 0.65`（只上调）可能连锁 | **中** | FR-ALLN-091 / 114；AC-ALLN-013 / 014 |
| R-ALLN-010 | **保护段第三次取代**：journey 保护段（`cc79f413…` / 240 行 / 3 链节）若被改流或状态栏结构波及 ⇒ 可能需第三次八步取代 + `redlineRemap[]` 追加 + 计数守恒 | **中高** | FR-ALLN-122 / 123；AC-ALLN-018 |
| R-ALLN-011 | **零宿主判据的守门**：v4.5 刚把 `REGISTERED_STRUCTURAL_HOSTS` 清零并要求「任意深度零 `[data-host]`」；op 管线 / 恢复卡 / chip / 分隔条若引入流内固定容器即违反 | **中** | NG-ALLN-016；FR-ALLN-085（chip / 分隔条**不在流内**）；AC-ALLN-015 |
| R-ALLN-012 | **双入口漂移**（chat op 与设置页 ops 并存）：同一操作两条执行路径 ⇒ 行为 / 留痕漂移 | **中高** | FR-ALLN-075~078；AC-ALLN-011；EC-ALLN-016 |
| R-ALLN-013 | **断言只增的门禁规模**：24 门禁基线**只增不减**；新增判据叠加 + 等价重锚 | **中** | FR-ALLN-003 / 120；AC-ALLN-019 / 020 / 025 |
| R-ALLN-014 | **真机浏览器权限弹窗 headless 不可合成**（`PENDING_TIMEOUT`）⇒ S2 场景中「浏览器原生弹窗」一环只能人工验收 | **中** | FR-ALLN-016；EC-ALLN-007；AC-ALLN-024 |
| R-ALLN-015 | **串行门禁纪律 + 既知环境性 flake**（`KL-N-10`：`test:binding` 首轮偶发红；`test:ui #54g`）⇒ 重构轮会被误读为回归 | **低** | FR-ALLN-124；AC-ALLN-024 |
| R-ALLN-016 | **`optional_permissions` 最小集论证缺位**：若新增权限项，需论证「最小必要」且不引入新安全面 | **中** | FR-ALLN-110；NFR-ALLN-009；AC-ALLN-010 |

### 15.2 spec 新增风险

| # | 风险 | 等级 | 说明 / 应对 |
|---|---|:--:|---|
| **R-ALLN-901** | **注册表声明与实际 provider 集合漂移**：义务表写了但注册表没有 / 注册表有但义务表缺行 / chips 悬空 ⇒ 「证明义务」变成纸面 | 中高 | FR-ALLN-037 / 036；AC-ALLN-005（三类注入反证） |
| **R-ALLN-902** | **`deps` 声明式依赖的定序被「列表位置」悄悄绕过**（写 `deps` 但仍按数组顺序求值） | 中 | FR-ALLN-031；AC-ALLN-004（列表位置置换测试） |
| **R-ALLN-903** | **模式公开契约被混用**：把应当 `emit` 的观测点接成 `waterfall`（或反之）⇒ 管线行为不可预期 | 中 | FR-ALLN-033；AC-ALLN-004（越集 / 混用反证） |
| **R-ALLN-904** | **快照回滚只覆盖单表**：`op.revoke` 涉及授权 / 权限 / 凭据三表，若只回滚其中一表会留下**跨表半完成态** | 中高 | FR-ALLN-034 ③ / 044；EC-ALLN-011（三表整体回滚断言） |
| **R-ALLN-905** | **`op.turn` 与本地 op 的 `requestTurn` 边界被侵蚀**：为了「方便」让某个本地 op 也走 `requestTurn`（拖延 / 假回合） | 中 | FR-ALLN-048 / 059；N25；AC-ALLN-009（零 `requestTurn` 机核） |
| **R-ALLN-906** | **法八「四面」被缩窄回「三面」**：审计面与 DOM value 面若不落判据，值可能从属性或审计面泄漏 | 中高 | FR-ALLN-023；AC-ALLN-003（四面 + 属性扫描） |
| **R-ALLN-907** | **授权 chip 的「状态」与「事实」被重新混为一谈**（把 chip 当成第二条留痕路径 ⇒ 双写复辟） | 中 | FR-ALLN-086（角色口径：chip = 当前状态 / 流内 = 事实发生）+ N23；AC-ALLN-012 |
| **R-ALLN-908** | **`data-narrow` 阈值与 clamp 边界不一致**（如 360 与 361 之间出现样式跳变 / 抖动） | 低 | FR-ALLN-090；EC-ALLN-014；AC-ALLN-013 |
| **R-ALLN-909** | **双契约门禁把 F 与 G 的断言 id 混池**（id 冲突 / 计数相加导致 F 或 G 单独失效时门禁仍绿） | 中 | FR-ALLN-100 / 101；AC-ALLN-016（两侧各自独立计数） |
| **R-ALLN-910** | **体积评估被跳过**（先实现后登记）⇒ 发现越限时已无可回退 | 中高 | FR-ALLN-134；AC-ALLN-023；纪律 §16 第 9 条 |

---

## 16. 纪律与验证契约

| # | 纪律 | 依据 |
|:-:|---|---|
| 1 | **`.sddu/**` 只写本 Feature 目录**；本阶段（spec）零改动 `src/` `test/` `dist/` `docs/` `design/` 与 ROADMAP | D6 / FR-ALLN-005 |
| 2 | **path-limited `git add`**（禁 `git add -A` / `.`）；不 force push；不合 main；不发布；无新依赖；不改 `packages/web-cli-base/**`；不改 `.opencode/opencode.json` | N14 / NG-ALLN-014 |
| 3 | **门禁严格串行**（`test` / `test:ui` / `test:binding` **绝不并发**；一次一个 Chromium；`finally` 自清 profile；1.5 GB 机器 OOM 前科） | N13 / FR-ALLN-124 |
| 4 | **`KL-N-10` 处置纪律**：首轮异常**隔离复跑 ≥2**、日志全量、**仍红如实记录不阻塞收口**（不伪造串行绿） | N18 / FR-ALLN-124 |
| 5 | **断言零删除零降级、计数只增不减**（唯一例外：保护段显式取代 + 台账留痕） | N11 / FR-ALLN-003 |
| 6 | **反证必须实跑**：注入 → FAIL（声明 `expectFailPattern`）→ 逐字节还原（sha256 前后相同）→ PASS；禁止「删属性充数 / 自我裁决自我验收 / 换口径放松」 | R-ALLN-008 / FR-ALLN-121 |
| 7 | **人工面如实登记**：浏览器原生弹窗体感 / 拖动性能 / 读屏 / 真机观感等 headless 不可合成项逐项标注 `⏳ 未执行` 或 `PASS`，**不得冒充 PASS** | R-ALLN-014 / AC-ALLN-024 / NG-ALLN-020 |
| 8 | **本阶段（spec）零运行时验证**：所有数字与 `file:line` 均引自已入库产物与源码（discovery §7.1 + §2.8）；未跑任何门禁 / 构建 / Chromium | D6 / FR-ALLN-005 |
| 9 | **体积预算先评估后落地**：先出净增上下界与越限路径口径，再排落地；`PENDING_ABSOLUTE_CAP` / `authorConfirmation` **不得静默改写** | R-ALLN-001 / R-ALLN-910 / FR-ALLN-134 |
| 10 | **设计稿坐标 = 唯一权威**：实现服从 G 稿；`design/**` 与 shim **零改动**（若改须五件套齐备）；G 稿 sha 由门禁冻结 | D7 / N20 / N21 / FR-ALLN-103 |
| 11 | **取代与实现同轮完成**：X1~X6 的台账登记与判据重锚**不得**拆到「下一轮补」 | FR-ALLN-116 / X 落地纪律 |
| 12 | **三叶串行 + 共享面一次做完**：`v5-1 → v5-2 → v5-3`；体积 / journey / `design-contract` / 取代台账四类共享面**恰一次**登记 | FR-ALLN-002 / 004 |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（web-cli-plugin v5「All-in-Next 聊天即操作台」/ 方案 G 需求规范）：**父 Feature = 轻量规范容器 + 3 叶**（`v5-1-next-registry-pipeline` → `v5-2-ops-first-batch` → `v5-3-chrome-face`，依存序串行）；**O-ALLN-001~012 十二条开放点全部裁决**（status 一律 `ruled`，DC-ALLN-001~012）；**FR 80 条**（GOV 5 / LAW7 7 / LAW8 5 / CONTRACT 9 / OPS 10 / PIPE 5 / SW 5 / SETTINGS 4 / CHROME 8 / DESIGN 4 / SUPERSEDE 7 / GATE 6 / VOL 5）；**NFR 12** / **EC 21** / **AC 25**（核心 = 001 断流机器化 / 002 死端守护 / 003 法八四面零明文 / 004 契约 v2 七点 / 005 义务表机核 + diff = 0 / 006 X1~X6 等价重锚）/ **NG 20**；**X1~X6 显式取代 → 判据等价重写映射表**（§12）；**N1~N21 红线继承逐条承载 + N22~N25 spec 新增红线**（§13）；R-ALLN-001~016 继承 + R-ALLN-901~910 新增（§15）；门禁基线清单 24 项（§9.5）；3 叶 FR 覆盖矩阵（§14.3）。**设计基准**：G 稿 `a7c0a77a…`（273,621 B）+ G shim `d0107ecb…`（127/127 实跑绿），与 F 稿 `49ce27fc…` / F shim `8ca5db6f…`（60）**双稿并存** | 2026-09-22 | SDDU Spec Agent |

