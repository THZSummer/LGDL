# 问题挖掘报告：specs-tree-web-cli-base-v3（web-cli-base DOM 域纵深完备化：以「人类操作浏览器完整场景」为纲的场景→工具缺口审计）

> **文档定位**: SDDU 问题挖掘报告 — 以作者 2026-09-06 立项公理（OS agent = AI 帮人类操作 OS；web-cli-base = AI 帮人类操作浏览器 →「人类日常操作浏览器的完整场景，理论上都应有对应工具给 AI」，含 F12/爬虫等效）对 v2 九域工具集做**现状核实 + 场景→缺口系统化映射 + 边界界定**，作为 spec 阶段输入
> **前置依赖**: F-25（specs-tree-web-cli-base-v2，phase=validated，⚠️ 有条件通过——代码在 `feature/web-cli-base-v2` 分支、v0.7 版本位**未合入 main / 未发布**，2026-09-06）+ v2 代码事实（`packages/web-cli-base/src/`，工作树=feature/web-cli-base-v2）+ docs/research/agent-capabilities/SUMMARY.md + ROADMAP.md v1.9.0（F-25 登记）+ 作者 2026-09-06 v3 立项指令（核心定位与必须覆盖场景总纲）
> **创建人**: SDDU Discovery Agent
> **创建时间**: 2026-09-06
> **版本**: v1.0
> **更新人**: SDDU Discovery Agent
> **更新时间**: 2026-09-06
> **更新说明**: 初始创建

---

## 0. 本阶段说明（任务书对齐）

- **角色边界**：本阶段只做**现状盘点（只读）+ 问题挖掘 + 边界界定**，**不设计方案（plan 职责）、不写代码、不定义需求（spec 职责）**。§3.3 缺口清单与文末边界/开放点均为「问题域界定与设计域候选」，供 spec/plan 与作者裁决，非方案细节。
- **探查范围**：`packages/web-cli-base/src/`（dom-tools/platform/tools/save-file/eval-tools/session-tool/assembly/index 等，代码事实引用 `文件:行号`）、`packages/lgdl-web/src/ai/session.ts`（场景组装面）、`packages/lgdl-web-op-cli/src/tool.ts`（DOM 域 LGDL 形态先例）、F-25 全过程产物（discovery/spec/plan/validate-report）、`docs/research/agent-capabilities/`、ROADMAP.md。工作树分支 `feature/web-cli-base-v2`（git 核实），v2 代码已检出在库。
- **方法**：①核实 v2 九域能力与 DOM 域 7 子命令的真实实现状态（区分「真实实现 / 转译桩 / 工厂未接线」，§3.1/§3.2）；②以作者场景总纲为纲建「人类操作浏览器完整场景」清单（§3.3 L1~L5 + 横切），逐场景对照现有能力产出缺口清单（场景 / 浏览器原生对应 API / 现有能力现状 / 缺口性质）；③边界界定（浏览器生态位应做 vs OS 生态位代理 os-cli-base vs 同源 F-14 vs 安全面，§3.4）；④问题清单 Q-xxx → 边界映射 → 假设/风险 → 开放点 O-xxx。
- **输出格式**：用户自定义模板（`.sddu/templates/agents/output/sddu-discovery.md.hbs`）不存在；插件内置模板 `.opencode/plugins/sddu/templates/output/sddu-discovery.md.hbs` 存在（94 行 6 章骨架）。本文按「内置模板骨架 + v2 discovery 先例」衔接：模板 1~6 章 ↔ 本文 §1~§7 语义对应；§0/§3 为证据基座（与 v2 discovery 同构，`specs-tree-web-cli-base-v2/discovery.md:19` 同口径）。
- **上下文**：v2（F-25）SDDU 全流程已 validate（全仓 724 pass/0 fail，V13 真实浏览器冒烟八组实跑），但：①代码在 `feature/web-cli-base-v2` 分支未合 main、v0.7 版本位未发布（ROADMAP.md:50-51）；②真实浏览器闭环/React 集成/web-search 真实端点 3 项移交人工收口（validate-report.md:210-216）；③DOM 域 7 子命令中 hover/scroll/zoom/fullscreen 浏览器真实实现为转译桩（§3.2 关键证据）；④作者已确认缺失方向：「写入侧 + 元素级读取 + 表单键盘 + wait + 页面 evaluate」（任务书素材 1）。本 Feature 为 v3 立项（作者对话 2026-09-06），ROADMAP 尚未登记。

---

## 1. 问题定义

### 1.1 Feature 定位与设计公理（v3 立项指令，2026-09-06，作者原话口径）

作者核心定位（立项背景原文）：**OS agent = AI 帮人类操作系统；web-cli-base = AI 帮人类操作浏览器**。由此得出两条公理：

| # | 公理 | 内容（作者原话口径） |
|---|------|---------------------|
| A1 | **场景完备性** | 「人类日常操作浏览器的完整场景，理论上都应有对应工具给 AI」——凡人类能对浏览器做的（看、点、拖、存、截图、书签、改 DOM、爬取采集、导出数据），web-cli-base 都应提供工具 |
| A2 | **F12/爬虫等效性** | 凡人类靠 F12 开发者工具或爬虫才能做的，web-cli-base 也应提供等价工具 |

作者列举的**必须覆盖场景（查缺补漏总纲）**：
- **感知（眼）**：一眼看到所有文字、按钮、元素属性、交互状态
- **交互（手）**：点击、悬浮、长按、滚动、拖动
- **浏览器 chrome 操作**：保存文件、浏览器页面截图、收藏到书签、自动翻页、打印
- **进阶（F12 等效）**：修改某个元素的文字、表单填写、增加元素、删除元素、修改值/属性/样式
- **自动化采集（爬虫等效）**：自动翻页、收集页面数据、导出到 text/json/excel

> v2 已确认缺失清单（任务书素材 1 口径，v3 的已知问题主干）：**写入侧 + 元素级读取 + 表单键盘 + wait + 页面 evaluate**；§3.3 在作者总纲之上补全「人类操作浏览器常见场景」中可能遗漏的项（键盘输入、表单提交、元素几何/样式读取、脚本化查询 evaluate、打印、下载、历史/标签、通知等）。

### 1.2 作者决策与上游裁决（已确认立项依据，非待挖问题）

| # | 决策/背景 | 出处 |
|---|----------|------|
| D-1 | 上游 v2（F-25）已完成：九域浏览器原生工具集 + 权限门禁三者组合 + 46 FR 十三组；phase=validated（⚠️ 有条件通过），代码在 `feature/web-cli-base-v2` 分支、v0.7 位未合入发布 | ROADMAP.md:178-194；validate-report.md:186 |
| D-2 | v2 方向公理（D-5 延续）：面向浏览器生态位设计工具集，不照搬 OS read/write/bash/grep/glob；OS 能力代理未来 os-cli-base | v2 discovery.md:30-43（D-5/D-6） |
| D-3 | v2 边界 NG-003：DOM 自动化仅限**宿主应用自身同源页面**；第三方/跨域站点 = F-14（v1.1 线插件运行时）边界 | v2 spec.md:92（NG-003）；dom-tools.ts:129 |
| D-4 | v2 边界 NG-009：不做跨 origin 任意访问（SOP/CORS/CSP 架构级约束）；untrusted 内容不自动执行（FR-010/EC-007） | v2 spec.md:98（NG-009）；eval-tools.ts:11-13 |
| D-5 | v2 生态位纪律：OS 工具形态（真 shell/PTY/本地文件树/socket/stdio MCP/常驻守护）生产零命中（V15 grep 15/15）；base 零 LGDL/react 依赖、**零新增运行时依赖**（NFR-001/002） | validate-report.md:58（V15） |
| D-6 | v2 遗留：IMP-4（dom 工具级 risk:'ui' 覆盖只读子命令 read-state/snapshot，需 subcommand 维度权限）记遗留附实现建议——v3 写入工具群扩大前必须裁决 | validate-report.md:35（IMP-4） |
| D-7 | v2 遗留：真实 AI 闭环补跑（V4/AC-008）+ lgdl-web React 集成手测 + web-search 真实端点 3 项移交人工收口 | validate-report.md:210-216 |
| D-8 | （推论）v3 问题域 = **在 v2 九域架构不动的前提下，对 DOM/UI 域做纵深完备化**：补「人类操作浏览器」场景缺环（感知元素级/交互全谱/chrome 操作/读写/F12 等效/采集导出），跨域与扩展宿主内容仍不抢跑（F-14） | D-1~D-5 派生；任务书立项背景 |

### 1.3 核心问题与业务影响

| 核心问题 | 业务影响 | 不解决的成本 |
|---------|---------|------------|
| **「AI 帮人类操作浏览器」定位落空在 DOM 纵深**：v2 九域铺面完成，但 DOM 域只有 7 子命令且 4 个（hover/scroll/zoom/fullscreen）在真实浏览器面是转译桩、只读面只有「页级 innerText 快照」无元素级读取（Q-001/Q-002/Q-003） | 「看、点」两字承诺只有 click/read-state/snapshot 可用；悬浮/滚动/缩放/全屏在 lgdl-web 真实运行时直接报「不可用」 | 作者 A1/A2 公理悬空；v2 交付的 DOM 面在真实浏览器场景半残 |
| **写入侧与 F12 等效整体缺失**：改元素文字/值/属性/样式、增删元素、表单填写提交、页面 evaluate（console 等效）零工具（Q-003/Q-004/Q-006） | AI 只能「读与点」不能「改与填」——任何表单/编辑类人类日常场景（填表、改页面、调试）不可表达 | 与「人类能做的浏览器操作」代差集中于全部写场景；F14 消费端拿到的是单向 DOM 面 |
| **键盘/等待/交互全谱缺环**：type/组合键、wait-for（元素/条件/超时）无；双击/右键/长按/拖放/focus 无；scroll/hover 仅桩（Q-004/Q-005/Q-011） | 「交互（手）」场景清单大部分不可执行；AI 无同步原语只能 sleep 猜延时，采集翻页/动态加载循环不可靠 | 自动化采集/表单键盘/复杂交互场景全部依赖「运气时序」，行为不可复现 |
| **chrome 级操作缺环且边界未裁**：截图/书签/打印/历史导航/刷新零工具；save 工厂已建但 P2 未入场景注册（Q-007/Q-009）；书签/标签页无页面 API 需判不可行或 F-14 扩展宿主（§3.4） | 「保存文件/截图/收藏/打印」四 chrome 场景三缺一虚；P2 工厂「做了没人用」风险在 v3 重演 | 人类日常浏览器 chrome 操作无法委派给 AI；能力与场景注册断层 |
| **采集/结构化导出缺环**：无结构化抽取（表格/列表/链接），导出限 text 原样（save 无格式护栏），json/csv/excel 零类型化；采集数据无 trust 元数据（Q-008/Q-013/Q-014） | 爬虫等效场景（收集页面数据 → 导出）不可表达；即使能抽也无格式面与可信/规模护栏 | 「采集 + 导出」这一作者明列场景整段空缺 |
| **安全面随写/evaluate 扩大，权限粒度未配套**：v2 PRM 已建但 dom 为工具级 risk:'ui'（IMP-4 遗留）；页面 evaluate = 对宿主 DOM 任意执行，untrusted 门禁/风险分级/敏感字段策略需随 v3 升级裁决（Q-010/Q-014） | AI 获得「改宿主页 DOM/执行宿主 JS」能力而无子命令级护栏 → 误操作/注入面显著扩大 | 安全基线落后于能力面；写入工具群上线前无配套护栏则不敢启用 |

---

## 2. 用户画像与场景

| 用户角色 | 典型场景 | 关键痛点（原话/证据） | 当前应对方式 |
|---------|---------|-------------------|------------|
| 作者（单维护者/架构决策人） | 规划 web-cli-base v3；验证「人类操作浏览器完整场景都有工具」公理 | 「OS agent = AI 帮人类操作系统；web-cli-base = AI 帮人类操作浏览器」（v3 立项背景，原话）；「凡人类能对浏览器做的…web-cli-base 都应提供工具」（A1/A2 公理） | 以 v2 九域铺面 → v3 DOM 纵深迭代演进；素材 1 已人工确认 v2 缺「写入侧 + 元素级读取 + 表单键盘 + wait + 页面 evaluate」 |
| lgdl-web 工作台 AI 使用者 | 让 AI 在工作台/宿主页完成日常浏览器操作（填表、改 UI、采集页面数据、导出文件） | 不直接感知框架缺口，但承受后果：AI 只能点击/读整页文本，不能改元素、不能等元素出现、不能填表单、不能导出结构化数据 | 忍受；提示词兜底 + sleep 猜延时 |
| 未来 web-cli 消费端开发者（F-14/v1.1 线） | 把 web-cli-base 装进任意同源站点的宿主页面，搭「AI 操作本站」的 AI-CLI | v2 DOM 面只有点读快照三子命令真实可用；F12 级能力（改/查/填/evaluate）缺失 → 消费端做「AI 帮用户操作本站表单/编辑」无底座 | 场景未到；ROADMAP F-14 依赖 v1.1 线（ROADMAP.md:384-385） |
| 下游 spec/plan/validate Agent | 消费本 discovery.md 产出 spec | 需要「场景→缺口」系统化清单、缺口性质分类与作者对开放点（O-001~O-012）的裁决 | 本文件 §3.3/§3.4/§6.3 提供基线；O-xxx 供作者裁决 |

> 注：本 Feature 为框架能力补全，无终端用户访谈；「痛点原话」仅引用可溯源的项目内作者原话与代码/文档文案，不编造访谈记录。

---

## 3. 现状基线盘点与场景→缺口映射（证据：文件:行号）

### 3.1 v2（F-25）交付能力全貌：九域工具精确清单（已核实）

> 代码事实：base 在 `packages/web-cli-base/src/`；lgdl-web 场景组装在 `packages/lgdl-web/src/ai/session.ts`。**注册名 = 工具级；「工厂已建未接线」= base 已导出工厂但 lgdl-web 场景默认矩阵未注册。**

| 域 | 注册工具（精确名） | 形态/实现面 | 场景注册现状（lgdl-web session.ts） |
|----|-------------------|------------|:--:|
| 内建（元/时序/网络原语） | `web-fetch`（含 HTML→MD clean + untrusted 标记）/ `sleep` / `web-cli-help` | tools.ts:12-124；web-fetch.ts | ✅ 自动注册（router 内建，session.ts:155-159 之上） |
| REG 注册表 v2（横切） | 分组/命名空间/运行时注册/开关（非工具） | router.ts:287-330 | ✅ 已交付 |
| PRM 权限门禁（横切） | PermissionGate：allow/ask/deny + 策略对象 + allowed-tools + untrusted | permission.ts | ✅ 已交付（lgdl-web aiPolicy 注入） |
| DOC 内容对象 | `doc-read` / `doc-edit` | doc-tools.ts:262 | ✅ P0 矩阵默认开（assembly.ts:56-57） |
| STR 存储 | `storage`（list/read/write/remove，mem/IDB/OPFS 载体）/ `storage-quota` / `settings`（get/set/list/remove） | storage-tools.ts:200；settings.ts:220 | ✅ P0 默认开（assembly.ts:53-55） |
| SRC 检索 | `search-content` / `list-resources` | search-tools.ts:232-268 | ✅ P1 默认开（session.ts:179） |
| NET 网络 | `web-search`（条件开 BYOK）/ `save`（save/download 两路径）/ `stream`（ws/SSE P2） | web-search.ts:96；save-file.ts:83；stream.ts:135 | ⚠️ web-search 条件开（session.ts:207-216）；**save/stream 工厂已建未注册** |
| DOM/UI | `dom`（read-state/click/hover/scroll/zoom/fullscreen/snapshot 7 子命令）/ `ask-user` | dom-tools.ts:136-146；ask-user.ts | ✅ dom P1 开（写经 PRM risk:'ui'，session.ts:180）；ask-user 开（:181） |
| DOM/UI（P2） | `notify` / `clipboard` | notify.ts:80；clipboard.ts:71 | ❌ 工厂已建未注册（lgdl-web） |
| EXE 执行 | `eval-js` / `eval-wasm`（worker 沙箱，无 DOM 面）/ `exec-remote`（代理桥）/ `worker-session`（持久执行上下文） | eval-tools.ts:215；exec-remote.ts:85；worker-session.ts:132 | ⚠️ eval-js 注册但 `enabled:false`（session.ts:185）；**eval-wasm/exec-remote/worker-session 未注册** |
| TSK 任务 | `todo` / `goal` / `jobs` / `subagent`（subagent enabled:false） | todo.ts/goal.ts/jobs.ts/subagent.ts | ✅ todo/goal/jobs 开（session.ts:182-184）；subagent 禁用（:186） |
| SES 会话 | `session` / `context` | session-tool.ts:162；context-tool.ts:129 | ✅ P0 默认开（assembly.ts:58-59） |
| EXT 扩展 | MCP 客户端 `connectMcpSource`（Streamable HTTP）/ skill-loader（非工具，加载器） | mcp-client.ts:129；skill-loader.ts | ❌ 工厂已建，场景未接线（无 MCP/skill 配置 UI，NG-008 归场景） |
| LGDL 业务（C 档不动，NG-002） | `lgdl-web-cli`（17 子命令图内容操作）/ `lgdl-web-op-cli`（19 子命令 UI 操作，LGDL 形态 DOM 自动化） | lgdl-web-cli tools.ts；lgdl-web-op-cli tool.ts:21-54 | ✅ 场景注册（session.ts:160-161） |

> 注：v2 spec FR 口径「46 FR 十三组」中 FR-033 workflow 已按 S-04 后置裁剪（validate-report.md:81）；「九域」为 DOC/STR/SRC/NET/DOM/EXE/TSK/SES/EXT 业务域 + REG/PRM 横切 + LGDL/BSL 场景基线。**§3.1 全表事实与 v2 validate-report.md V8~V12 逐域验证一致。**

### 3.2 DOM 域深核：7 子命令真实实现状态（v3 最关键证据）

> **关键发现：7 子命令中仅 3 个在真实浏览器面有真实实现，其余 4 个是「最小桩/转译桩」**（浏览器面抛 NotFoundError「由浏览器面冒烟承接」）——v2 spec FR-022 的浏览器实现收口被声明为「真实浏览器冒烟承接」但未真正落地为可用实现。

| 子命令 | 现有语义 | 真实浏览器实现（platform.ts browserEnv domOps） | 实测证据 |
|--------|---------|----------------------------------------------|---------|
| `read-state` | 读宿主页 url/title | ✅ 真实（platform.ts:446-451，`location.href` + `document.title`） | V13④ 实跑输出 url/title（validate-report.md:56） |
| `snapshot` | DOM 文本快照 | ✅ 真实但**仅 `body.innerText` 截断 20000 字符**（platform.ts:474-478），无结构/无元素级/无分页续读 | V13④ snapshot 含 marker |
| `click` | CSS 选择器点击 | ✅ 真实（platform.ts:452-460，`querySelector().click()`；无坐标/无偏移/无文本定位/无双击） | V13④ `#v13-btn` → out 变 CLICKED-BY-DOM-TOOL |
| `hover` | CSS 选择器悬停 | ❌ **转译桩**：抛 NotFoundError「hover 真实事件派发由浏览器面冒烟承接（本实现为最小桩）」（platform.ts:461-464） | 无真实实现；node 面仅桩注入测试 |
| `scroll` | [selector] dx/dy 像素滚动 | ❌ **转译桩**：抛 NotFoundError「scroll 真实滚动由浏览器面冒烟承接」（platform.ts:465-467） | 无真实实现 |
| `zoom` | 页面缩放 percent | ❌ **转译桩**：抛 NotFoundError「zoom 由浏览器面冒烟承接」（platform.ts:468-470） | 无真实实现 |
| `fullscreen` | Fullscreen API 切换 | ❌ **转译桩**：抛 NotFoundError「fullscreen 由浏览器面冒烟承接（需用户手势授权）」（platform.ts:471-473） | 无真实实现（LGDL 形态 op-cli page-fullscreen 为 C 档另路） |

补充事实：
- DOM 工具**整体 risk:'ui'**（dom-tools.ts:141），read-state/snapshot 只读子命令同受门禁 → IMP-4 遗留（validate-report.md:35，附实现建议：permission 支持 subcommand 维度或场景策略对象）。
- 元素级能力（属性/样式/几何/交互状态/表单值/结构/任意元素读）在 PlatformDomOps 接口（platform.ts:86-101）与实现中**零方法**——接口只有页级 readState/snapshot + 4 交互。
- `eval-js` 是 **worker 沙箱**（无 DOM 面，worker 内结构性收窄 blocked，validate V13⑤）——**不存在宿主页 DOM 面 evaluate**。
- 同源边界声明（NG-003）在 dom help 明示：第三方/跨域 = F-14（dom-tools.ts:129）。

### 3.3 「人类操作浏览器完整场景」→ 工具缺口映射总表

> 列：**场景（人类操作/浏览器 API 等效）** / **浏览器原生对应 API** / **现有能力现状（v2 证据）** / **缺口性质**。
> 缺口性质图例：✅=已覆盖真实可用 ｜ 🟡=半成品（子命令存在但浏览器面=转译桩或语义窄）｜ ❌=缺失（需新增）｜ 🔲=工厂已建未场景接线 ｜ ⛔=不可承载（页面无 API，需扩展宿主/代理/判不可行）｜ ⚖️=边界待作者裁。作者总纲明列场景标「✓纲」，补全项标「★补」。

#### L1 感知（眼）——「一眼看到所有文字、按钮、元素属性、交互状态」

| 场景（✓纲=作者明列 / ★补=补全） | 浏览器原生对应 API | 现有能力现状（v2） | 缺口性质 |
|--------------------------------|-------------------|-------------------|:--:|
| ✓纲 看整页文字 | `innerText` / `textContent` | `dom snapshot` = `body.innerText` 截断 20k（platform.ts:474-478）；**无分页续读、无结构** | 🟡 半成品（语义升级：结构化/分段快照） |
| ✓纲 看按钮/链接/输入等可交互元素清单 | 遍历 + 交互属性（button/a/input…） | ❌ 无（snapshot 纯文本不区分可交互；无 aria 面） | ❌ 缺失（可交互元素清单/无障碍面） |
| ✓纲 看单个元素属性（href/class/data-*…） | `getAttribute` / `attributes` | ❌ 无（click/hover 仅内部用 selector，无可读出口） | ❌ 缺失（元素级读） |
| ✓纲 看交互状态（disabled/checked/selected/expanded） | property 反射 + aria | ❌ 无 | ❌ 缺失（元素级读） |
| ★补 读元素文本 `textContent`（单元素） | `textContent` | ❌ 无 | ❌ 缺失（元素级读） |
| ★补 读元素样式（computed/class） | `getComputedStyle` / `className` | ❌ 无 | ❌ 缺失（元素级读） |
| ★补 读元素几何/可见性/滚动位 | `getBoundingClientRect` / `scrollY` / offsetParent | ❌ 无 | ❌ 缺失（元素级读；坐标点击/截图裁切依赖） |
| ★补 读表单当前值 | `input.value` / `select.value` / `textarea.value` | ❌ 无 | ❌ 缺失（元素级读） |
| ★补 读页面状态（URL/标题，多字段） | `location` / `document.title` | ✅ `dom read-state` 真实（platform.ts:446-451），但仅 url/title 两字段 | 🟡 半成品（扩字段/安全上下文等） |
| ★补 读结构（子节点/outerHTML/链接集合） | `innerHTML` / `children` | ❌ 无（snapshot 仅文本；list-resources 是「内容集目录」非 DOM 结构） | ❌ 缺失 |
| ★补 定位/查找元素（存在性、数量、摘要） | `querySelectorAll` | ❌ 无独立 find 子命令（仅 click/hover 内部查询） | ❌ 缺失（find/query） |
| ★补 定位语法面 | CSS selector 仅 | — | ⚖️ 边界待裁（text=/role=/xpath 增补，O-011） |
| ★补 等待条件（元素出现/可见/消失/可交互） | MutationObserver / rAF 轮询（auto-wait 生态位） | ❌ 仅 `sleep` 固定延时（sleep.ts:79-109）；无 DOM 条件等待 | ❌ 缺失（wait，横切原语） |

#### L2 交互（手）——点击、悬浮、长按、滚动、拖动

| 场景（✓纲 / ★补） | 浏览器原生对应 API | 现有能力现状（v2） | 缺口性质 |
|-------------------|-------------------|-------------------|:--:|
| ✓纲 点击元素 | `HTMLElement.click()` / 事件派发 | ✅ `dom click`（selector）真实（platform.ts:452-460） | 🟡 半成品（缺坐标点击/相对偏移/文本定位/多击，见下） |
| ★补 双击 | `dblclick` 事件 | ❌ 无 | ❌ 缺失 |
| ★补 右键/上下文菜单 | `contextmenu` 事件 | ❌ 无 | ❌ 缺失 |
| ✓纲 悬浮 | pointer/mouse 事件派发（浏览器无原生 hover API） | `dom hover` 存在但浏览器面=**转译桩**（platform.ts:461-464） | ❌ 桩→真实实现（O-003） |
| ✓纲 长按 | `pointerdown` + 定时 | ❌ 无 | ❌ 缺失 |
| ✓纲 拖动（拖放） | DragEvent / Pointer 序列 | ❌ 无 | ❌ 缺失 |
| ✓纲 滚动 | `scrollBy` / `scrollTo` / `scrollIntoView` | `dom scroll` 存在但浏览器面=**转译桩**（platform.ts:465-467）；无 scroll-into-view | ❌ 桩→真实实现 + 升级（O-003） |
| ✓纲（chrome）自动翻页/翻屏 | scroll/click 组合 + wait | 原语不全：scroll 桩 + 无 wait + 无翻页采集循环 | ❌ 组合缺原语（L5 关联） |
| ★补 聚焦/失焦 | `focus()` / `blur()` | ❌ 无 | ❌ 缺失 |
| ★补 坐标点击（屏幕坐标/元素内坐标） | `elementFromPoint` | ❌ 无（依赖 L1 几何读取） | ❌ 缺失 |
| ★补 键盘输入（打字/快捷键/组合键） | `keydown/keypress/keyup`（合成，非可信） | ❌ 无任何键盘工具；op-cli 无；eval-js 无 DOM 面 | ❌ 缺失（type/press；React 受控组件兼容风险，O-006） |
| ★补 缩放/全屏 | CSS zoom / Fullscreen API | `dom zoom`/`dom fullscreen` 浏览器面=**转译桩**（platform.ts:468-473）；LGDL 形态 page-fullscreen 另路（op-cli C 档） | ❌ 桩→真实实现（O-003） |

#### L3 浏览器 chrome 操作——保存文件、截图、书签、翻页、打印

| 场景（✓纲 / ★补） | 浏览器原生对应 API | 现有能力现状（v2） | 缺口性质 |
|-------------------|-------------------|-------------------|:--:|
| ✓纲 保存文件（用户文件） | `showSaveFilePicker`（FSA）/ `a[download]` | `save` P2 工厂已建（save-file.ts:83-93，save/download 两路径 + 取消/拒绝转译 FR-009）——**未入 lgdl-web 场景矩阵** | 🔲 工厂未接线（随 v3/或独立收口入矩阵） |
| ✓纲 触发下载 | blob + `a[download]` | 同上 `save download` | 🔲 工厂未接线 |
| ✓纲 浏览器页面截图 | **页面无原生截图 API**（扩展 `captureVisibleTab` / CDP `Page.captureScreenshot` / html2canvas 类近似） | ❌ 无任何工具 | ⚖️ 边界待裁（近似绘制 vs CDP 侧 vs out；NFR-002 零依赖纪律冲突，O-004） |
| ✓纲 收藏到书签 | `chrome.bookmarks`（**浏览器扩展专属 API**，页面不可达） | ❌ 无 | ⛔ 不可承载（F-14 扩展宿主或判不可行，O-005） |
| ✓纲 打印 | `window.print()`（对话框需用户侧确认）/ 打印为 PDF 需 CDP | ❌ 无 | ⚖️ 边界待裁（触发对话框 vs PDF；手势约束，O-005） |
| ✓纲 自动翻页（语义上=翻页/翻屏采集） | 组合原语（next-click + wait + extract） | 无 wait/extract；scroll 桩 | ❌ 组合缺原语（O-007） |
| ★补 历史前进/后退 | `history.back()` / `history.forward()`（会话内） | ❌ 无 | ❌ 缺失（page-nav；宿主页会话历史） |
| ★补 刷新/重载 | `location.reload()` | ❌ 无（刷新=重载宿主 SPA，AI 会话上下文受破坏语义需裁） | ⚖️ 边界待裁（O-005） |
| ★补 通知 | Notification API | `notify` P2 工厂已建（notify.ts:80，授权三路转译）——**未入场景矩阵** | 🔲 工厂未接线 |
| ★补 剪贴板读写 | `navigator.clipboard.readText/writeText` | `clipboard` P2 工厂已建（clipboard.ts:71，roundtrip 已验证 V13③）——**未入场景矩阵** | 🔲 工厂未接线 |
| ★补 标签页/窗口管理（枚举/切换/新建） | **页面无枚举 API**（扩展 `chrome.tabs/windows`；window.open 仅 opener 有限控制） | ❌ 无 | ⛔ 不可承载（扩展宿主/F-14；或 os-cli-base 代理语义，O-005） |
| ★补 URL 导航/新开页面 | `location` / `window.open` | ❌ 无（跨域导航=离开宿主页、破坏 AI 运行上下文） | ⚖️ 边界待裁（宿主内路由 vs 新窗口 vs 跨域=F-14） |

#### L4 进阶读写（F12 等效）——改/增/删/填/执行

| 场景（✓纲 / ★补） | 浏览器原生对应 API | 现有能力现状（v2） | 缺口性质 |
|-------------------|-------------------|-------------------|:--:|
| ✓纲 修改某元素文字 | `textContent` | ❌ 无 | ❌ 缺失（写入侧） |
| ✓纲 修改值 | native value setter + input/change 事件序列（React 受控兼容技巧） | ❌ 无 | ❌ 缺失（写入侧；合成事件局限，O-006） |
| ✓纲 修改属性 | `setAttribute` / `removeAttribute` | ❌ 无 | ❌ 缺失（写入侧） |
| ✓纲 修改样式 | `style.cssText` / `classList` | ❌ 无 | ❌ 缺失（写入侧） |
| ✓纲 增加元素 | `createElement` + `append`/`insertBefore` | ❌ 无 | ❌ 缺失（写入侧） |
| ✓纲 删除元素 | `remove()` | ❌ 无 | ❌ 缺失（写入侧） |
| ✓纲 表单填写 | 值设置 + 事件；`requestSubmit` | ❌ 无（fill/select/checkbox/radio/textarea 全无） | ❌ 缺失（表单键盘；file input 程序化赋值判不可行，O-006/O-012） |
| ★补 表单提交 | `requestSubmit()` / 隐式提交 | ❌ 无 | ❌ 缺失 |
| ✓纲（作者已确认）页面 evaluate（F12 console 等效：任意查/改/执行） | 宿主 DOM 上下文执行 JS | ❌ **无**：`eval-js` 是 worker 沙箱「无 DOM 面」（validate V13⑤ blocked）；宿主 DOM 面 evaluate 零工具 | ❌ 缺失（最高风险档 + untrusted 门禁 + ask，O-002） |
| ★补 序列化整页/元素 HTML | `document.documentElement.outerHTML` | ❌ 无（snapshot 仅 innerText） | ❌ 缺失 |

#### L5 自动化采集（爬虫等效）——翻页、收集、导出

| 场景（✓纲 / ★补） | 浏览器原生对应 API | 现有能力现状（v2） | 缺口性质 |
|-------------------|-------------------|-------------------|:--:|
| ✓纲 收集页面数据（结构化抽取：表格/列表/卡片/链接/图片/元数据） | DOM 遍历 → 结构化序列化 | ❌ 无 extract 类工具；snapshot=纯文本 | ❌ 缺失（结构化抽取） |
| ✓纲 自动翻页采集循环 | 组合原语（next 点击 + wait + 增量抽取） | 原语缺 wait/extract；scroll 桩 | ❌ 组合缺原语（循环工具化 vs AI 编排边界，O-007） |
| ★补 无限滚动加载采集 | scroll-to-bottom + wait new content | scroll 桩 + 无 wait | ❌ 桩→真实 + wait |
| ✓纲 导出 text | Blob text → save/download | `save` 可承载 text 原样（save-file.ts） | 🔲 工厂未接线 |
| ✓纲 导出 json | 序列化 → Blob → save/download | 无格式护栏（save 仅原样内容） | ❌ 缺失（类型化导出格式面） |
| ✓纲 导出 csv | csv 序列化 | ❌ 无 | ❌ 缺失 |
| ✓纲 导出 excel | xlsx 生成（库）或轻量妥协 | ❌ 无 | ⚖️ 边界待裁（真 xlsx 库 vs csv/SSV 妥协；NFR-002 零依赖，O-007） |
| ★补 采集数据可信标记 | FR-010 trust 约定 | web-fetch/web-search/exec-remote 已带 trust（validate V7）；**页面采集数据无 trust 元数据出口** | 🟡 半成品（trust 元数据扩到采集面） |
| ★补 采集规模护栏（上限/分页/限速） | 预算控制 | search/web-fetch 有 maxBytes/maxHits（validate V9）；采集循环整体无护栏 | 🟡 半成品（护栏扩到采集/导出） |

#### 横切支撑（跨层，任何 DOM 场景都依赖）

| 场景 | 浏览器原生对应 API | 现有能力现状（v2） | 缺口性质 |
|------|-------------------|-------------------|:--:|
| 时序等待 | setTimeout（已有） | ✅ `sleep` 固定延时（sleep.ts） | ✅ 已覆盖（固定延时） |
| **条件等待** wait-for（元素出现/可交互/文本/网络空闲/超时） | MutationObserver + 轮询/超时（Playwright auto-wait 生态位） | ❌ 无 | ❌ 缺失（wait，v2 已确认缺项；L1/L2/L5 全部组合的前置） |
| 事件真实性 | `isTrusted`（合成事件恒 false） | —（知识面） | ⚖️ 工程约束公开：合成事件对框架绑定/React 受控组件的兼容局限（O-006，plan 处理） |
| DOM 读取预算 | 输出截断 | snapshot 20k 截断；search/web-fetch 预算护栏（EC-011） | 🟡 沿用既有预算语义扩展 |

> 汇总计数（§3.3，作者总纲 5 层 + 横切）：**明确缺失（❌）≈ 34 项**（含 4 个桩→真实实现、4 个格式/形态新面）、**工厂未接线（🔲）4 项**（save/notify/clipboard + 导出链路）、**不可承载（⛔）2 类**（书签/标签页·窗口）、**边界待裁（⚖️）7 项**（截图/打印/导航·刷新/定位语法/xlsx/合成事件/翻页循环工具化）。✅ 真实可用仅 4 项（web-fetch/sleep/help + dom 三子命令）。

### 3.4 边界界定（v3 问题域的 in/out/约束）

**→ 浏览器生态位应做（in，DOM/UI 域纵深）**
- 宿主页同源 DOM 全谱：元素级读取（属性/样式/几何/交互状态/表单值/结构/查找）+ 写入侧（text/value/attr/style/增/删）+ 表单（填写/提交）+ 交互全谱（双击/右键/长按/拖放/focus/键盘/坐标）+ wait 条件等待 + 页面 evaluate（F12 console 等效）+ HTML 序列化。
- 采集/导出面：结构化抽取、类型化导出（text/json/csv[/excel 待裁]）、规模/可信护栏、save/download 链路收口入场景矩阵。
- 页面内可承载的 chrome 语义：打印触发（window.print）、历史前进/后退、剪贴板、通知、全屏/缩放（补齐真实实现）。
- 机制约束延续：v2 架构（PlatformEnv 注入缝 / PRM 门禁 / registry 注册即得 / 场景矩阵）**只做 additive 扩展**（v2 FR-043 契约，zero 回归）；PlatformDomOps 接口扩展为设计域候选（platform.ts:86-101）。

**→ OS 生态位（out，代理未来 os-cli-base；v2 NG-001/D-2 延续）**
- 真 shell/PTY、本地文件树路径读写、进程/守护、系统级截图（跨应用）、系统通知的 OS 层、OS 文件管理器。**注意：书签/标签页/下载历史属浏览器 chrome 级（非 OS）→ 但页面内不可达，归「F-14 扩展宿主或判不可行」，不是 os-cli-base 职责**（§1.3 Q-007 边界澄清）。

**→ 同源约束（F-14 边界，NG-003/NG-009 延续，v3 不抢跑）**
- 全部 DOM 读/写/evaluate/采集执行目标 = **宿主应用自身同源页面**；第三方/跨域站点的 DOM 自动化、跨域导航、标签页级操作 = F-14（v1.1 插件运行时，ROADMAP.md:384）与扩展宿主；跨域只读采集走 web-fetch（受 CORS/SOP）。

**→ 安全面（v3 写入/evaluate 工具群的前提约束）**
- **权限门禁 risk 分级**：v2 PRM 已建（allow/ask/deny + 策略对象 + allowed-tools）；v3 写入侧工具统一 risk:write/ui 级；**页面 evaluate = 新增最高风险档**（宿主 DOM 任意执行）→ 默认 deny/ask 取向 + 场景策略覆盖；IMP-4 遗留（工具级→子命令级粒度）在 v3 扩大工具群前裁决（O-009）。
- **untrusted 门禁**（FR-010/EC-007 延续）：evaluate 输入默认 untrusted 拒执行（除非显式 trusted）；对来自网络/采集结果的内容执行前需可信声明；采集输出携带 trust 元数据。
- **合成事件局限**：非 `isTrusted` 合成事件对 React 受控组件/框架绑定可能无效 → native setter + 事件序列技巧为工程约束（记录，plan 处理）。
- **敏感字段策略**：密码/凭据类字段不读、回显脱敏、写入仅限显式 trusted 表单场景（O-012）。
- **用户手势授权转译**（FR-009 基建沿用）：剪贴板读/写、文件保存、通知、全屏、打印等浏览器授权失败 → 友好转译（platform.ts:169-211 已有）。
- **零新增依赖纪律**（NFR-002/V15）：截图/Excel/解析如需第三方库须作者裁决（O-004/O-007）。

### 3.5 与上游 v2 / v1.1 衔接点（v3 挂载候选面）

- **上游未发布态**：v2 在 `feature/web-cli-base-v2` 分支、v0.7 位待作者合入发布（ROADMAP.md:50-51）——v3 开发基线与版本落点依赖作者裁决（O-010）。
- **v2 收口项与 v3 边界**：①真实 AI 闭环补跑（AC-008，需 API Key）是 v3 写入工具行为基线的前置人工基线；②lgdl-web React 集成手测（AskDialog/SettingsPanel/恢复入口）影响 v3 新工具的 ask/矩阵接入；③**IMP-4 risk 子命令粒度**遗留直接阻塞 v3 写入工具群的安全默认取向；④**4 个 DOM 转译桩（hover/scroll/zoom/fullscreen）真实实现**归属 v2 收口清单 or v3 补齐（O-003）。
- **PlatformDomOps 扩展面**：v2 接口（platform.ts:86-101）7 方法 = v3 元素级读/写/键盘/wait/evaluate 的**天然扩展宿主**（additive 加方法/子命令，NFR-001 零 LGDL 依赖约束不变）。
- **场景矩阵扩展**：lgdl-web 组装点（session.ts:178-188）P1 扩域先例 = v3 新工具默认开关矩阵的挂载范式；P2 工厂（save/notify/clipboard）收口入矩阵为「零新代码先接线」低垂果实（O-008）。
- **与 F-14/v1.1**：v3 的 DOM 纵深（尤其页面 evaluate/采集）是 F-14 消费端（任意站点插件运行时）的机制底座——只做同源机制、不预设计跨域插件协议（不抢跑，v2 NG-003 延续）。

---

## 4. 问题清单与缺口

### 4.1 核心问题（直接阻断「AI 帮人类操作浏览器」公理落地）

| ID | 问题描述 | 影响范围 |
|----|---------|---------|
| Q-001 | **DOM 域 7 子命令仅 3 个真实可用，4 个为转译桩**：hover/scroll/zoom/fullscreen 在 browserEnv（platform.ts:461-473）抛 NotFoundError「由浏览器面冒烟承接」——lgdl-web 真实运行时调用即失败；v2 FR-022 浏览器实现收口未真正落地 | 全部 DOM 交互场景（L2）；作者「交互（手）」总纲半数不可执行 |
| Q-002 | **感知面只有「页级文本快照」无「元素级读取」**：snapshot=body.innerText 截断 20k（platform.ts:474-478）；属性/样式/几何/交互状态/表单值/结构/单元素文本/查找 全部零工具（PlatformDomOps 接口无元素级方法，platform.ts:86-101） | 感知（眼）总纲大半缺失；AI 行动决策无元素事实依据 |
| Q-003 | **写入侧整体缺失（F12 等效面为零）**：改文字/值/属性/样式、增元素、删元素、HTML 序列化无任何工具——v2「读写不平衡」：只能读与点，不能改与填 | 进阶（F12 等效）总纲整段空缺；表单/编辑类人类日常场景不可表达 |
| Q-004 | **键盘与表单能力缺失**：type/press/组合键、fill/select/checkbox/radio/提交全无；无键盘工具 = 无法模拟「人类打字填表」这一最高频浏览器操作 | 交互总纲 + 表单场景；AI 自动化表单/登录流程不可表达 |
| Q-005 | **条件等待（wait）缺失**：仅 sleep 固定延时（sleep.ts:79-109）；无 wait-for（元素出现/可交互/网络/超时）——动态页面（SPA 渲染/无限滚动/翻页加载）时序全靠猜 | L2/L5 全部组合场景（自动翻页/采集/动态加载）可靠性 |
| Q-006 | **宿主 DOM evaluate 缺失**：eval-js 是 worker 沙箱无 DOM 面（validate V13⑤）；「F12 console 等效」的页面 evaluate 零工具——脚本化查询/任意读写/调试面不可表达 | 进阶（F12 等效）最核心项；采集/复杂读取的万能原语 |
| Q-007 | **chrome 级操作缺环 + 边界未裁**：截图/书签/打印/历史导航/刷新零工具；书签/标签页·窗口无页面 API（扩展宿主）；save 工厂已建但 P2 未入场景（🔲） | chrome 操作总纲 5 项中 4 项缺/虚；能力边界需作者裁决 |
| Q-008 | **采集与结构化导出缺失**：无结构化抽取；导出限 text 原样；json/csv/excel 零类型化；采集数据无 trust/规模护栏 | 自动化采集总纲整段空缺；「收集→导出」价值链断裂 |

### 4.2 次要问题（影响中等 / 核心问题衍生）

| ID | 问题描述 | 影响范围 |
|----|---------|---------|
| Q-009 | **P2 工厂与场景接入断层**：save/notify/clipboard/stream/exec-remote/worker-session/MCP/skill 工厂已建但未入 lgdl-web 默认矩阵（session.ts:178-188 仅 P1 子集）；v3 新工具若同路径则「做了没人用」风险重演 | 全部 P2 面价值兑现（O-008） |
| Q-010 | **权限粒度与安全面不配套**：dom 整体 risk:'ui' 覆盖只读子命令（IMP-4 遗留，validate-report.md:35）；v3 写入 + evaluate 工具群上线前需 subcommand/工具级分级 + untrusted 门禁 + 敏感字段策略 | 安全基线；写入/evaluate 是否敢启用（O-009/O-012） |
| Q-011 | **组合交互缺环**：双击/右键/长按/拖放/focus/坐标点击/文本定位无；单元素几何读取缺 → 坐标类交互无基础 | L2 交互全谱的剩余项 |
| Q-012 | **v2 未发布依赖链**：上游在 feature 分支、v0.7 位未合入发布；真实 AI 闭环/React 集成/web-search 端点 3 项收口未完成即叠 v3 DOM 纵深 → 基线不稳 | 版本落点与排期（O-010） |
| Q-013 | **结构性快照/可访问性清单缺失**：AI 需要「可交互元素清单（按钮/链接/输入/状态）」做行动决策，现无等价物（无障碍树面未利用） | AI 决策质量；感知场景价值 |

### 4.3 潜在问题（影响小但可能恶化 / 信息不足待验证）

| ID | 问题描述 | 影响范围 |
|----|---------|---------|
| Q-014 | **采集/导出规模与格式无边界**：单次采集上限、分页/限速、csv/xlsx 格式面、trust 元数据均未定义；无护栏的采集循环可能拖垮宿主页或产出不可用数据 | 采集场景质量；性能（O-007） |
| Q-015 | **页面导航语义未定**：宿主 SPA 内跳转（history 路由）vs window.open 新窗口 vs 跨域导航（破坏 AI 上下文）；刷新/导航对会话（session/goal/jobs）影响未评估 | 导航/刷新类场景（O-005） |
| Q-016 | **合成事件局限的框架兼容风险**：非 isTrusted 事件对 React 受控组件（lgdl-web 自身）/现代框架绑定的有效性未验证——键盘/表单写入核心技巧需真实闭环验证（V4 前置） | 键盘/表单/写入工具可用性（O-006） |
| Q-017 | **截图/Excel 等第三方依赖引入风险**：html2canvas/xlsx 类库 vs v2 NFR-002「零新增运行时依赖」纪律冲突；evaluate 面若引库同样受 CSP/worker-src 约束 | 依赖纪律；CSP 面（O-004/O-007） |

### 4.4 边界界定初步映射（spec 输入；非方案）

**→ base 承接（候选 in，按作者裁决裁剪后）**
- DOM 域纵深（宿主页同源）：元素级读取（read-element/attr/style/geometry/state/form-value/find）+ 写入侧（set-text/value/attr/style + add/remove element）+ 表单（fill/submit）+ 键盘（type/press）+ 交互补全（dblclick/contextmenu/long-press/drag/focus/坐标）+ wait（条件等待）+ page-evaluate（宿主 DOM 面）+ snapshot 升级（结构化/分页/可交互清单）。
- 采集/导出面：extract（结构化抽取）、export（text/json/csv[+excel 待裁]）、规模/可信护栏；save/download 链路复用（P2 收口）。
- chrome 可承载子集：print 触发、history back/forward、clipboard/notify 场景收口、hover/scroll/zoom/fullscreen 真实实现补齐（O-003 归属裁决后）。
- 机制：PlatformDomOps 扩展（additive）、PRM 子命令粒度（O-009 裁决后）、untrusted/trust 扩展到 evaluate/采集输出。

**→ 场景侧（lgdl-web / 作者裁决）**
- v3 新工具默认注册矩阵（FR-039 扩域）；P2 工厂（save/notify/clipboard）收口开关；evaluate/写入类工具的 ask 策略与 UI 呈现；截图/打印等需用户手势的授权 UI 路径。

**→ 明确不做 / 天然不可承载（out，§3.4）**
- OS 生态位（os-cli-base 代理，NG-001 延续）；书签/标签页·窗口枚举/下载历史（浏览器扩展宿主 = F-14 线或判不可行，O-005）；跨域站点 DOM（F-14，NG-003）；file input 程序化注入（浏览器安全限制）；真 xlsx 若违反零依赖纪律（待裁）。

---

## 5. 竞品参考（事实记录，场景完备性视角，不做方案评价）

| 竞品/参照 | 是否处理过类似问题 | 处理方式（事实） | 与我们场景的差异 |
|----------|-------------------|----------------|----------------|
| Playwright / Puppeteer（浏览器自动化事实基线，知识面） | 是（DOM 自动化原语集最完整） | locator（CSS/text=/role=/xpath）+ action 原语（click/dblclick/hover/fill/press/check/selectOption/scroll/dragTo/focus）+ **auto-wait**（action 前自动等可交互）+ waitForSelector/loadState + page.evaluate + screenshot + page.pdf + emulation——**全套覆盖作者 5 层总纲** | 独立进程驱动浏览器（CDP 协议），非「宿主页内嵌工具集」；无 PRM/权限门禁/untrusted 概念；其**原语清单**是 v3「场景完备性」的事实参照，但实现宿主（页面内）与安全模型完全不同，不可照搬 |
| dsh（作者对标对象） | 部分 | 插件化工具包 + 三层任务 + skill/MCP（03-dsh.md）；**web 面仅 web_search + web_fetch，无 DOM 操作**（其生态位=本地进程+文件系统+PTY） | v3 是 dsh 未覆盖的「浏览器 DOM 纵深」——浏览器生态位 dsh 无对应，无直接参照，须自建 |
| Claude Code / opencode | 是（hooks/权限/skill/MCP 机制） | PreToolUse/PostToolUse + 权限三元组 + agent markdown；**无浏览器 DOM 工具**（本地 CLI 面） | 机制生态位（权限/hooks）v2 已吸收；DOM 场景无对应 |
| Anthropic computer-use 类（Computer Use / browser-use 路线，知识面） | 是（「AI 操作浏览器」另一路线） | **视觉路线**：截图 → 模型看 → 坐标点击/键盘；无结构化 DOM 读写的精确性 | 与 v3「DOM 结构化工具路线」是互补而非替代——视觉路线可作 v3 截图/坐标场景的参照事实，但精确读写/采集仍靠 DOM 结构化（记录事实，不推荐） |
| Selenium/WebDriver（知识面） | 是 | WebDriver 协议：元素定位 + 交互 + executeScript——历史上第一个「DOM 自动化标准」 | 同为远程协议驱动；executeScript = 页面 evaluate 的先行事实；无权限/可信分级 |
| WorkBuddy（调研报告 05） | 部分 | 桌面 agent：浏览器操作以连接器/技能承载，SKILL.md + allowed-tools 技能级权限 | allowed-tools 权限 v2 已吸收（FR-008）；浏览器 DOM 细节非其核心 |
| 仓库先例：v2（F-25） | 部分（铺面完成，纵深未做） | 九域工具 + PlatformEnv 缝 + PRM 门禁 + V13 真实浏览器冒烟（platform.ts/session.ts/validate-report） | v2 = v3 的机制底座与扩展宿主（§3.5）；DOM 转译桩/IMP-4/P2 未接线为 v3 直接问题面 |

> 注：以上只记录事实与差异，不推导「我们应该怎么做」（方案评估是 plan 职责）；Playwright/Selenium/computer-use 行为「知识面」标注，非本仓调研文档覆盖对象（本仓调研 = docs/research/agent-capabilities 9 框架，其 DOM 面为零）。

---

## 6. 假设与风险

### 6.1 关键假设

| # | 假设内容 | 验证方式 |
|---|---------|---------|
| A-001 | 作者 5 层场景总纲 + §3.3 补全项覆盖了「人类日常操作浏览器」的主要场景面（主观枚举完整性） | 作者对 §3.3 映射表评审；spec 阶段按层核验遗漏；lgdl-web/F-14 消费场景试点 |
| A-002 | v2 九域架构（PlatformEnv 缝/PRM/registry/场景矩阵）可 additive 承载 DOM 纵深，无需重写（v2 FR-043 契约延续） | spec 阶段评估 PlatformDomOps 扩展面与顺序契约兼容性 |
| A-003 | 同源宿主页 DOM 面（含页面 evaluate）足以覆盖 v3 场景主体价值，无需跨域能力 | lgdl-web 真实 AI 闭环（v2 遗留 AC-008 补跑）+ v3 场景试点 |
| A-004 | 合成事件 + native setter 足以驱动 lgdl-web（React）等现代框架的表单/键盘写入 | lgdl-web 真实闭环逐表单验证（O-006 前置试点） |
| A-005 | 浏览器「页面内可承载 chrome 子集」（打印/历史/剪贴板/通知/全屏）确如 §3.4 归类可承载；书签/标签页确不可承载 | 每项最小浏览器验证（chromium 冒烟，沿 V13 方法） |
| A-006 | v2 合入发布 + 真实闭环收口为 v3 前置；v3 在 v2 发布后基线之上开发 | 作者裁决版本时序（O-010） |
| A-007 | 采集/导出（爬虫等效）对 lgdl-web/未来消费端有真实价值场景（含数据规模假设） | 作者场景确认 + 试点（O-007） |

### 6.2 主要风险

| # | 风险描述 | 影响程度 |
|---|---------|---------|
| R-001 | **范围蔓延**：§3.3 五层 ≈34 缺失项 + P2 收口 + 权限粒度 + chrome 边界裁决若全收单 Feature，容量爆表——需波次拆分（O-001） | 高 |
| R-002 | **浏览器能力误判**：截图/打印/合成事件/React 兼容/书签承载判定若与浏览器真实行为不符 → 返工（§3.4 ⚖️/⛔ 项需最小验证） | 高 |
| R-003 | **安全面扩大失控**：页面 evaluate + DOM 写 = AI 可任意改宿主页/执行 JS/外泄数据；权限粒度（IMP-4）+ untrusted + 敏感字段不先行则不敢启用 | 高 |
| R-004 | **上游未合入漂移**：v3 基于 feature/web-cli-base-v2 分支开发，若 v2 合入 main 时重构/冲突 → 返工 | 中 |
| R-005 | **行为回归不可见**：真实 AI 闭环基线（v2 遗留 AC-008）未闭合即叠 DOM 写/evaluate，AI 自主改 DOM 的回归无人工基线 | 中 |
| R-006 | **schema/上下文膨胀**：v3 多工具多子命令全量进 deriveTools → 上下文预算与 tool_choice 漂移（沿用分组/启用集，validate V16 有基线） | 中 |
| R-007 | **依赖纪律冲突**：截图/Excel/evaluate 若需新依赖 vs NFR-002 零新增依赖 + CSP 约束 | 中 |
| R-008 | **新工具无消费方/无真实场景**：采集/书签等价值假设（A-007）未验证则工具「做了没人用」 | 低 |

### 6.3 待确认开放点（需作者裁决，供 spec 输入）

| # | 开放点 | 关联问题 |
|---|--------|---------|
| O-001 | **首批范围与波次**：§3.3 五层全谱 vs 先做核心面（元素级读取 + 写入 + 表单键盘 + wait + evaluate + 桩补真）？波次如何拆 | Q-001~Q-008/R-001 |
| O-002 | **页面 evaluate 形态与门禁**：宿主 DOM 面 evaluate（F12 console 等效，新工具）与 worker 沙箱 eval-js 的关系；risk 档位（最高档？）、trusted/untrusted 门禁、ask 默认取向、可执行代码来源白名单 | Q-006/Q-010/R-003 |
| O-003 | **v2 转译桩收口归属**：hover/scroll/zoom/fullscreen 真实浏览器实现——归 v2 收口清单（发布前）还是 v3 补齐？ | Q-001 |
| O-004 | **截图能力边界**：同源近似绘制（html2canvas 类，NFR-002 冲突）vs CDP/headless 侧 vs 元素截图（canvas/foreignObject）vs 判 out（OS/扩展生态位）？是否入 v3 | Q-007/R-002/R-007 |
| O-005 | **chrome 级能力裁决**：书签/标签页·窗口/下载历史 = 判不可行记录 or F-14 扩展宿主预留？打印 = window.print() 触发（用户侧确认）or PDF（CDP）；刷新/导航对 SPA AI 上下文破坏语义如何定 | Q-007/Q-015/R-002 |
| O-006 | **键盘/表单合成事件策略**：type/press 语义、React 受控组件（native setter）兼容路径、敏感字段（密码/凭据）读写行为准则 | Q-004/Q-016/R-002/R-003 |
| O-007 | **采集/导出边界**：结构化抽取形态（独立 extract vs evaluate 组合）、翻页循环工具化边界、单次规模上限、json/csv/excel 格式面（真 xlsx 库 vs 轻量妥协） | Q-008/Q-014/Q-017/R-001/R-007 |
| O-008 | **P2 场景接入收口**：save/notify/clipboard 是否随 v3 入 lgdl-web 默认矩阵（FR-039 扩域）与 ask/授权 UI 面 | Q-009 |
| O-009 | **权限 risk 子命令粒度**（IMP-4 遗留）：base permission 支持 subcommand 维度 or 场景策略对象先行；v3 写入/evaluate 默认 allow/ask/deny 取向 | Q-010/R-003 |
| O-010 | **版本落点与上游时序**：v3 排 v0.8 or 独立版本位？v2（v0.7）合入发布 + 真实闭环收口是否为 v3 硬前置？ROADMAP 登记 | Q-012/R-004/R-005 |
| O-011 | **元素定位语法面**：仅 CSS selector or 增 text=/role=/xpath（Playwright locator 生态位）——影响全部元素级工具的入参面 | Q-002/Q-003/Q-011 |
| O-012 | **快照/清单形态与预算**：可交互元素清单（含 aria/禁用态）输出预算与形式；结构化快照与 context 预算关系 | Q-002/Q-013/R-006 |

---

## 7. 下一步建议

| 优先级 | 事项 | 说明 |
|--------|------|------|
| 高 | 作者评审 §3.3 场景→缺口映射表（五层 + 横切）与缺口性质分类，确认总纲完整性（A-001） | Q-xxx/A-001（spec 基座） |
| 高 | 作者裁决 O-001（范围波次）与 O-010（版本落点/上游时序）——定 v3 主干与开发基线 | R-001/R-004 |
| 高 | 作者裁决 O-002/O-009（evaluate 门禁形态 + risk 子命令粒度 IMP-4）——定写入/evaluate 安全基线 | R-003 |
| 高 | 作者裁决 O-004/O-005（截图/chrome 级边界）与 O-003（v2 桩收口归属）——定边界与 v2 交互 | R-002/Q-001 |
| 中 | 以元素级读取 + 写入侧 + 表单键盘 + wait + evaluate + 桩补真为问题域主干进 spec（FR 级描述，不设计实现） | 本 Feature 主干 |
| 中 | v2 真实 AI 闭环补跑（AC-008）+ React 集成手测作为 v3 前置人工基线先行闭合（O-010 裁决后） | R-005 |
| 中 | 作者裁决 O-006/O-007/O-008/O-011/O-012（键盘策略/采集导出边界/P2 收口/定位语法/快照预算） | R-006/R-008 |
| 低 | 作者裁决后同步 ROADMAP 登记 v3（含 v2 发布状态） | Q-012 |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：以作者 2026-09-06 v3 立项公理（OS agent ↔ web-cli-base = AI 帮人类操作浏览器；A1 场景完备性/A2 F12·爬虫等效）盘点 v2 九域工具面（§3.1，精确到注册名/工厂/场景接线）+ DOM 域深核（§3.2，关键证据：7 子命令仅 3 真实、4 转译桩）+ 五层场景→缺口映射（§3.3，≈34 缺失/4 工厂未接线/2 不可承载/7 边界待裁）+ 边界界定（§3.4，in/out/同源 F-14/安全面）+ 问题清单（Q-001~Q-017）+ 开放点（O-001~O-012） | 2026-09-06 | SDDU Discovery Agent |
