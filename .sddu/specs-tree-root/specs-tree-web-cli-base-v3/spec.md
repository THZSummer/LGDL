# Feature Specification：specs-tree-web-cli-base-v3（web-cli-base v3：AI 操作浏览器的完整工具集——五层 DOM/UI 全谱补齐 + 子命令级权限分级 + evaluate 最高门禁）

> **文档定位**: SDDU 需求规范 — 定义功能需求、非功能需求和边界情况，作为 plan 阶段的输入
> **前置依赖**: discovery.md v1.0（Q-001~Q-017 / §3.3 五层场景→缺口映射 ≈34 缺失 / §3.4 边界界定 / O-001~O-012）+ 作者裁决（2026-09-06：核心定位 / O-001 五层全谱一次补齐 / O-010 v3 与 v2 同批 v0.7 / O-002 独立 evaluate + 最高门禁 / O-009 子命令级权限 risk，见 §2.2）+ 上游 v2 产物（spec.md 46 FR / plan.md 8 ADR / platform.ts / dom-tools.ts / validate-report.md）+ 调研 docs/research/agent-capabilities/SUMMARY.md
> **创建人**: SDDU Spec Agent
> **创建时间**: 2026-09-06
> **版本**: v1.0
> **更新人**: SDDU Spec Agent
> **更新时间**: 2026-09-06
> **更新说明**: 初始创建（作者 O-001/O-002/O-009/O-010 裁决为红线输入；O-003~O-008/O-011/O-012 以「建议态待确认」写入并整理访谈问题清单 §9.3；45 FR 九组 + 8 NFR + 14 EC + 12 AC）

## 1. 元数据
> Feature 基本信息

| 字段 | 值 |
|------|-----|
| Feature ID | specs-tree-web-cli-base-v3（web-cli-base v3，作者立项 2026-09-06） |
| 名称 | web-cli-base v3：AI 操作浏览器的完整工具集（以人类操作浏览器场景为纲的 DOM/UI 域纵深完备化） |
| 优先级 | P1（作者指令立项，非发布阻塞；v3 与 v2 同属 v0.7 同批发布，O-010） |
| 目标版本 | v0.7（与 v2 同批；v2 = v0.7 内第一个 Feature，v3 = 同批第二个 Feature，作者裁决 O-010） |
| 上游 | specs-tree-web-cli-base-v2（F-25，phase=validated ⚠️ 有条件通过，代码在 `feature/web-cli-base-v2` 分支、v0.7 位未合入发布）；specs-tree-web-cli-base-framework（F-23，v0.6.0 已发布） |
| 下游关联 | F-14 web-cli-plugin（v1.1 线）——本 Feature 的 DOM 纵深（元素级读写/evaluate/采集）为 F-14 消费端机制底座（只做同源机制、不预设计跨域插件协议，NG-002）；未来 os-cli-base（OS 生态位代理目标，非本 Feature 交付，NG-001） |

## 2. 上下文
> 回顾问题背景和目标用户

### 2.1 要解决的问题（五层场景缺环）

作者核心定位（立项背景原文）：**OS agent = AI 帮人类操作系统；web-cli-base = AI 帮人类操作浏览器**。由此得出两条公理（discovery §1.1）：

- **A1 场景完备性**：「人类日常操作浏览器的完整场景，理论上都应有对应工具给 AI」——凡人类能对浏览器做的（看、点、拖、存、截图、书签、改 DOM、爬取采集、导出数据），web-cli-base 都应提供工具。
- **A2 F12/爬虫等效性**：凡人类靠 F12 开发者工具或爬虫才能做的，web-cli-base 也应提供等价工具。

v2（F-25）已完成九域工具面铺展（46 FR 十三组 + PRM 门禁三者组合，724 pass/0 fail，V13 真实浏览器八组实跑），但 DOM/UI 域纵深存在系统性缺环（discovery §3.2/§3.3 证据）：

- **感知（L1）只有「页级文本快照」**：`dom snapshot` = `body.innerText` 截断 20k（platform.ts:474-478），无元素级读取（属性/样式/几何/交互状态/表单值/结构/查找全零，PlatformDomOps 接口无元素级方法 platform.ts:86-101）——AI 行动决策无元素事实依据（Q-002）。
- **交互（L2）半数不可执行**：7 子命令仅 3 个真实可用，hover/scroll/zoom/fullscreen 在 browserEnv 抛 NotFoundError「由浏览器面冒烟承接」（platform.ts:461-473，转译桩）；双击/右键/长按/拖放/focus/键盘全无（Q-001/Q-011）。
- **chrome 操作（L3）缺环 + 边界未裁**：截图/打印/历史导航/刷新零工具；save 工厂已建未入场景矩阵；书签/标签页·窗口为页面不可承载（⛔，扩展宿主/F-14）；通知/剪贴板 P2 工厂已建未接线（Q-007/Q-009）。
- **读写（L4，F12 等效）整体缺失**：改文字/值/属性/样式、增删元素、表单填写提交、页面 evaluate（console 等效）零工具；`eval-js` 是 worker 沙箱无 DOM 面（validate V13⑤）——不存在宿主页 DOM 面 evaluate（Q-003/Q-004/Q-006）。
- **采集（L5，爬虫等效）整段空缺**：无结构化抽取、无类型化导出（json/csv/excel）、无采集规模/可信护栏；原语（wait/extract/真实 scroll）缺失导致翻页循环不可靠（Q-005/Q-008/Q-014）。
- **横切**：条件等待 wait-for 缺失（仅 sleep 固定延时）；DOM 工具整体 risk:'ui' 覆盖只读子命令（IMP-4 遗留）——写入工具群扩大前必须子命令级分级（Q-010）；合成事件对 React 受控组件兼容性未验证（Q-016）。

**业务影响**：v2 交付的 DOM 面在真实浏览器场景「半残」（4 桩直接报不可用）；「AI 帮人类操作浏览器」承诺只能「读与点」不能「改与填与采」；安全基线落后于能力面（写入/evaluate 无配套护栏则不敢启用）。

### 2.2 作者裁决（本规范红线输入，非待澄清项）

| # | 裁决（出处：state.json notes + 任务书，2026-09-06） | 本规范贯彻方式 |
|---|----------------------------------------------------|----------------|
| R-01 | **核心定位**：web-cli-base = AI 操作浏览器的完整工具集；人类操作浏览器完整场景全覆盖（A1/A2 公理） | §5.3~§5.8 五层 FR 全谱；§2.5 场景→缺口口径 |
| R-02 | **O-001 五层全谱一次补齐**：感知/交互/chrome/读写/采集 ≈34 项缺项全收本 Feature（不波次砍范围，P0/P1/P2 排序承载） | §5 全部层 FR；§9.4 波次排序 |
| R-03 | **O-010 版本落点**：v3 与 v2 同属 v0.7（v0.7 内第二个 Feature 同批发布），v2 合入/收口与 v3 开发同批推进 | §1 目标版本；FR-004 |
| R-04 | **O-002 页面 evaluate**：独立 evaluate 工具 + 最高门禁（risk 最高档 + untrusted 拒执行），与 worker 沙箱 eval-js 语义区分 | FR-008 + FR-037；NG-010 |
| R-05 | **O-009 权限粒度**：子命令级权限 risk（只读免 ask、写/敏感走 ask/deny），修复 v2 IMP-4 遗留 | §5.2 FR-005~FR-008；FR-044 |

> 注：其余开放点（O-003~O-008/O-011/O-012）未裁决，本规范以「建议态（S-01~S-08，待作者确认）」写入对应 FR，访谈问题清单见 §9.3。

### 2.3 目标用户

| 用户角色 | 场景 | 诉求 |
|---------|------|------|
| 作者（单维护者/架构决策人） | 规划 v3；验证「人类操作浏览器完整场景都有工具」公理 | 五层全谱缺项收口 + 写入/evaluate 上线前安全基线（子命令级权限 + untrusted/敏感字段）落地为可测试规范；v2（v0.7）同批合入发布 |
| lgdl-web 工作台 AI 使用者 | 让 AI 在宿主页完成填表/改 UI/采集/导出/调试 | AI 能看元素、等元素、打字填表（React 受控兼容）、改 DOM、执行 console 等效查询、采集导出结构化数据；危险操作（evaluate/写/敏感字段）有确认护栏 |
| 未来 web-cli 消费端开发者（F-14/v1.1 线） | 把 web-cli-base 装进任意同源站点宿主页面搭「AI 操作本站」 | 拿到完整同源 DOM 机制底座（元素级读/写/evaluate/采集原语），权限契约场景可配 |
| 下游 spec/plan/validate Agent | 消费本规范 | FR/NFR/EC/AC 可测试可追溯（引用 discovery Q/O/R 编号与 v2 FR 编号）；建议态项（S-01~S-08）待作者确认后可冻结 |

### 2.4 与 v2 的衔接基线（v3 挂载面，代码事实）

- **v2 已交付（additive 承载面）**：dom 工具 7 子命令族（dom-tools.ts:22-24，read-state/click 真实、4 转译桩、snapshot 只读文本）；PlatformEnv.dom.ops 注入缝（platform.ts:86-101 PlatformDomOps 7 方法 + platform.ts:128-162 PlatformEnv 可选项 + `[k: string]: unknown` 自由扩展位）；PermissionGate（permission.ts:168-354：规则集 + 可插拔策略对象（含 subcommand 上下文 permission.ts:67-75）+ allowed-tools + riskDefaults；`defaultActionForRisk` read→allow、其余→ask）；lgdl-web 默认注册矩阵（session.ts:171-188，P0/P1 扩域先例）；save/notify/clipboard P2 工厂已建未接线。
- **v2 遗留移交（v3 前置/并行基线）**：①真实 AI 闭环补跑（AC-008，需 API Key）——v3 写入/键盘工具行为基线的前置人工基线；②lgdl-web React 集成手测（AskDialog/SettingsPanel/恢复入口）；③web-search 真实端点；④**IMP-4（dom 工具级 risk:'ui' 覆盖只读子命令）**→ v3 §5.2 直接修复；⑤4 个 DOM 转译桩真实实现 → v3 FR-003/016/017 补齐（建议态 S-01）；⑥DB 名/旧库清理（未发布无迁移）。
- **v3 挂载纪律（v2 FR-043 契约延续）**：全部新增能力以 ToolEntry 追加（新子命令/新工具/PlatformDomOps 加方法/enabled 等，缺省兼容）接入既有 CommandRouter，不重写九域架构；F-23 顺序契约/内建置末/delay gate 保持（FR-001）。
- **开发基线**：v3 基于 `feature/web-cli-base-v2` 分支代码位开发（O-010 同批 v0.7）；v2 合入 main 时若重构/冲突按 additive 最小冲突原则处理（R-004 风险，§2.2 衔接 + FR-004）。

### 2.5 场景→工具缺口口径（本规范问题域边界）

以 discovery §3.3 五层映射总表（L1~L5 + 横切支撑）为问题域基座：

| 层 | 人类场景（作者纲 + 补全） | 现状 | v3 处理 |
|----|--------------------------|------|---------|
| L1 感知（眼） | 整页文字/可交互清单/元素属性·样式·几何·状态·表单值/结构/查找/页面状态 | snapshot 纯文本截断；read-state 两字段 | §5.3 PER 升级 + 新增元素级读取族 |
| L2 交互（手） | 点击/悬浮/滚动/缩放/全屏/双击/右键/长按/拖放/focus/键盘 | 4 桩 + 4 缺 + 键盘全缺 | §5.4 INT 桩补真 + 全谱新增 |
| L3 chrome | 保存/下载/截图/打印/书签/翻页/历史/刷新/通知/剪贴板 | save/notify/clipboard 工厂未接线；截图/打印/导航缺 | §5.6 CHR 可承载子集 + P2 接线；书签/标签页 out（NG-003） |
| L4 读写（F12 等效） | 改文字/值/属性/样式/增删元素/表单填写提交/页面 evaluate | 写入侧全缺；无 DOM 面 evaluate | §5.7 WR 写入族 + fill + page-eval |
| L5 采集（爬虫等效） | 结构化抽取/自动翻页/导出 text·json·csv·excel/护栏 | 全缺 | §5.8 COL extract/export/护栏 |
| 横切 | 条件等待 wait-for | 仅 sleep | §5.5 WT wait 原语 |

## 3. 目标与非目标
> 明确需求范围，防止范围蔓延

### 3.1 目标 (Goals)

| # | 目标描述 |
|---|---------|
| G-001 | **五层全谱补齐（O-001）**：感知（元素级 DOM 读取）/交互（4 桩补真 + 长按双击右键拖放 focus 键盘）/chrome（截图打印导航保存下载）/读写（set-text·attr·style·value + fill + 增删元素 + 页面 evaluate）/采集（extract + 翻页 + 导出 text·json·csv）五层 ≈34 项缺项一次补齐，作者 A1/A2 公理在 DOM/UI 域落地 |
| G-002 | **子命令级权限 risk 分级（O-009，修复 v2 IMP-4）**：只读子命令免 ask（read-state/snapshot/read-element/find 等），写/敏感子命令走 ask/deny，默认取向场景可覆盖 |
| G-003 | **页面 evaluate 最高门禁（O-002）**：独立工具 + risk 最高档 + untrusted 拒执行，与 worker 沙箱 eval-js 语义公开区分；写入/evaluate 工具群上线即带护栏 |
| G-004 | **浏览器面真实实现收口**：4 个 DOM 转译桩（hover/scroll/zoom/fullscreen）在 browserEnv 补真实实现 + 新增能力浏览器面真实可用——v3 交付零转译桩，lgdl-web 真实运行时调用即用 |
| G-005 | **v2 契约零破坏 + 同批发布（O-010）**：全部新增 additive（v2 46 FR 行为零回归）；v3 与 v2 同属 v0.7 同批合入发布 |
| G-006 | **场景接入闭环防「做了没人用」**：v3 默认注册矩阵扩展 + P2 工厂（save/notify/clipboard）接线收口（O-008 建议态）+ evaluate/敏感字段 ask UI 呈现归场景 |
| G-007 | **安全面纪律**：合成事件局限工程公开（不承诺 isTrusted）；敏感字段（密码/凭据）读脱敏写受控；采集输出携带 trust 元数据与规模护栏 |

### 3.2 非目标 (Non-Goals)

| # | 明确不做 |
|---|---------|
| NG-001 | **OS 生态位能力（代理原则，v2 NG-001 延续）**：系统级截图（跨应用）、真 shell/PTY、本地文件树路径读写、进程/守护、OS 文件管理器——需要时代理给未来 os-cli-base |
| NG-002 | **F-14/v1.1 线内容不抢跑（v2 NG-003 延续）**：全部 DOM 读/写/evaluate/采集执行目标 = **宿主应用自身同源页面**；第三方/跨域站点 DOM 自动化、跨域导航、扩展宿主级能力 = F-14（v1.1 插件运行时），本 Feature 只做同源机制、不预设计跨域插件协议 |
| NG-003 | **书签/标签页·窗口/下载历史管理**：页面无原生 API（浏览器扩展专属）——不可承载（⛔），记录 out；归属 F-14 扩展宿主或判不可行，非 os-cli-base 职责（discovery §3.4 澄清） |
| NG-004 | **file input 程序化注入/赋值**：浏览器安全限制，不可承载（fill 对 `<input type=file>` 显式报不可用 + 引导用户侧选择） |
| NG-005 | **真 .xlsx 与第三方截图库缺省不引入**：与 v2 NFR-002「零新增运行时依赖」纪律冲突——缺省以 csv 达成「Excel 可打开」、截图以零依赖近似面（建议态 S-02/S-05，作者 O-004/O-007 裁决例外才引库） |
| NG-006 | **LGDL 特有语义（C 档）不动（v2 NG-002 延续）**：lgdl-web-cli 图内容语义、op-cli UI handler 语义、LGDL_SYSTEM_PROMPT/PRESET 等场景内容；lgdl-web-op-cli 仍为 LGDL 形态 DOM 自动化先例（机制可借鉴、内容不动） |
| NG-007 | **不承诺可信合成事件**：DOM 事件派发均为非 `isTrusted` 合成事件（浏览器安全模型），对依赖可信事件的框架绑定不承诺生效；只承诺标准事件序列派发 + React 受控组件兼容路径（native setter + input/change 事件，工程约束由 plan 承接） |
| NG-008 | **不重写 v2 九域架构**：全部新增 = ToolEntry 追加字段/新子命令/新工具/PlatformDomOps additive 方法；不做破坏性类型变更（v2 FR-043 契约） |
| NG-009 | **跨标签页/多窗口 DOM 并发操作**：本 Feature 单标签宿主页语义；多标签冲突/枚举 = F-14/扩展宿主（NG-003） |
| NG-010 | **worker 沙箱语义不混入页面 evaluate**：eval-js/eval-wasm 保持 worker 沙箱（无 DOM 面）；宿主 DOM 面执行 = 独立 page-eval 工具 + 最高门禁（R-04），两工具语义公开区分、互不替代 |

## 4. 用户故事
> 以用户视角描述功能需求

| # | 作为… | 我想要… | 以便… |
|---|-------|---------|-------|
| US-001 | lgdl-web 工作台 AI 使用者 | AI 能「看」页面：读单个元素的属性/文本/样式/位置/是否禁用、列出按钮与链接清单、确认某元素是否存在、等某元素出现后再操作 | AI 的下一步决策基于真实 DOM 事实而非猜（Q-002/Q-005 解） |
| US-002 | lgdl-web 工作台 AI 使用者 | AI 能「手」操作：真悬浮/滚动/缩放/全屏、双击/右键/长按/拖放/聚焦、打字/按组合键 | 悬停菜单/拖拽排序/表单键盘等人类日常交互可委派给 AI（Q-001/Q-004/Q-011 解） |
| US-003 | lgdl-web 工作台 AI 使用者 | AI 能「改与填」：改元素文字/值/属性/样式、增删元素、填表并提交，且改前危险操作先问我（只读不打扰） | 表单填写/页面编辑/F12 级操作可表达且安全可控（Q-003/Q-006/Q-010 解，IMP-4 修复） |
| US-004 | 作者/安全责任人 | 页面 evaluate 作为独立工具带最高档门禁：外部（网络/采集）来的代码缺省拒执行，宿主页执行前有确认 | 获得 F12 console 等效能力而不敞开注入面（Q-006/O-002 解） |
| US-005 | lgdl-web 工作台 AI 使用者 | AI 能采集页面数据（表格/列表）并导出 text/json/csv、自动翻页收集多页，且不拖垮页面 | 爬虫等效的「收集→导出」价值链在浏览器生态位落地（Q-008/Q-014 解） |
| US-006 | 作者/单维护者 | v3 全部能力与 v2 同批 v0.7 合入发布，DOM 面无转译桩；save/notify/clipboard 真正出现在 AI 会话里 | 「做了没人用」不重演；v2/v3 能力一次交付用户可见（O-008/O-010 解） |
| US-007 | 未来消费端开发者（F-14/v1.1 线） | 同源宿主页拿到元素级读/写/evaluate/采集全套机制与子命令级权限契约 | F-14 消费端做「AI 操作本站」有可直接挂载的机制底座 |

## 5. 功能需求 (FR)
> 每个需求必须有唯一标识符且可测试；按九组组织：BSL（v2 衔接基线）/ PRM（子命令级权限与 evaluate 门禁）/ PER（感知层 L1）/ INT（交互层 L2）/ WT（条件等待横切）/ CHR（chrome 操作层 L3）/ WR（读写层 L4）/ COL（采集层 L5）/ LGDL（lgdl-web 场景接入）
> 编号约定：本文 FR/NFR/EC/AC 编号为 v3 内编号；引用 v2 需求一律标「v2 FR-xxx」。
> 建议态标注 = 依赖 O-003~O-008/O-011/O-012 作者确认（§9.2 S-01~S-08 + §9.3 访谈清单）；未标注 = 基于已裁决策（R-01~R-05）可直接测试。

### 5.1 BSL — 与 v2 衔接与契约基线（v2 FR-043/045/046 延续 + O-003 建议态 + O-010 已裁）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-001 | **契约零破坏 + additive 扩展（v2 FR-043 延续）**：v3 全部新增能力（dom 新子命令/新工具/PlatformDomOps 加方法/enabled 等）以 ToolEntry **追加**形态接入既有 CommandRouter；F-23/v2 顺序契约（注册序 + 内建置末）、delay gate、ToolResult/ToolContext/dispatch/deriveTools 全部保持；v2 九域既有工具（含 dom 既有 7 子命令 read-state/click 真实实现、snapshot 既有调用）行为零回归 | v2 全仓专项测试零回归全绿（含 router/delay/permission/dom 7 用例）；新增字段/子命令缺省时行为与 v2 完全一致；deriveTools 顺序断言不漂移 | P0 |
| FR-002 | **PlatformDomOps/PlatformEnv 缝 additive 扩展**：元素级读/写/键盘/wait/evaluate/采集等新能力经 PlatformDomOps 或 PlatformDom/PlatformEnv 的**可选项**接入（接口加方法，缺省 undefined）；环境未注入 → 工具/子命令按禁用态或友好错误转译（沿用 v2 工具「ops 未注入」语义 dom-tools.ts:32-38）；node 面注入桩 + 浏览器面真实实现双轨保留 | 新增方法全缺省时既有平台代码编译零错误；node 面注入假 ops 全链单测；无注入面调用返回可读错误不中断 | P0 |
| FR-003 | **browserEnv 真实实现补全（4 桩 + 新能力浏览器面）**：browserEnv（platform.ts domOps）对 hover/scroll/zoom/fullscreen 4 个转译桩提供**真实 document/浏览器实现**（不再抛 NotFoundError），并对 v3 全部新能力方法提供浏览器面真实实现——lgdl-web 真实运行时调用即可用；授权失败仍走 FR-009 转译（v2 沿）【建议态 S-01（O-003）：桩补真归 v3，随 v0.7 同批发布，不在 v2 另起收口补丁】 | 真实浏览器（chromium，沿 V13 方法）逐子命令冒烟：hover/scroll/zoom/fullscreen 实际生效（事件触发/滚动位置/缩放值/全屏态断言）；新能力方法各 ≥1 真实用例 | P0 |
| FR-004 | **v2 收口基线承接 + 版本同批（O-010 已裁）**：v3 与 v2 同属 v0.7 同批发布（开发基线与 v2 代码位一致）；v2 遗留人工收口 3 项（真实 AI 闭环 AC-008、lgdl-web React 集成手测、web-search 真实端点）作为 v3 写入/键盘/evaluate 类工具验收的**前置或并行人工基线**（未闭合时相关 FR 验收标注「待基线」不阻塞其余） | validate 报告含：v2 收口项状态清单 + v3 验收基线关联表；v2/v3 同批发布登记（ROADMAP 同步） | P0 |

### 5.2 PRM — 子命令级权限 risk 分级模型 + evaluate 最高门禁（O-009/O-002 已裁）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-005 | **子命令级 risk 分级模型（O-009）**：注册条目可声明**子命令粒度 risk**（如 dom 工具：read-state/snapshot/read-element/find 等只读子命令 = 'read'；click/hover/scroll/zoom/fullscreen/set-*/fill/type/press 等 UI 副作用 = 'ui'/'write'）；PermissionGate 裁决管线（规则/策略/缺省取向）按子命令级 risk 评估；未声明子命令级 risk 的条目回退工具级 risk（v2 兼容）；ask 问题结构含子命令（v2 AskQuestion 已含 subcommand 字段，permission.ts:78-86） | 子命令级 risk 声明后：只读子命令按 'read' 缺省 allow（免 ask）、写子命令按 'ui'/'write' 缺省 ask；无声明工具行为与 v2 完全一致（回归断言）；ask 呈现含子命令名 | P0 |
| FR-006 | **base 权限规则 subcommand 维度匹配**：PolicyRule 增 subcommand 过滤面（glob 匹配，与既有 pattern/group/namespace/risk 正交，缺省不限）；与既有通道（v2 策略对象 StrategyCheckContext 已含 subcommand，permission.ts:67-75）共同构成双通道子命令级裁决；EC-014 deny 优先语义不变；审计 reason/ruleIndex 含子命令 | 规则 subcommand 匹配单测（命中/未命中/glob）；与工具级规则并存时优先级可预测（deny 优先）；审计记录含子命令 | P0 |
| FR-007 | **lgdl-web 默认子命令级策略（修复 v2 IMP-4）**：lgdl-web aiPolicy 注入子命令级默认取向——**只读子命令（read-state/snapshot/read-element/find/interactives/结构读取等）免 ask 放行；UI 写/敏感子命令（click/hover/scroll/zoom/fullscreen/双击/右键/长按/拖放/focus/type/press/set-*/fill/add/remove 等）默认 ask（场景可覆盖 deny）；evaluate 走 FR-008** | lgdl-web 真实会话中：调用 dom read-state/snapshot/read-element 不再触发 ask（IMP-4 修复验收）；调用 click/set-text 触发 ask；deny 规则命中即拒 + 审计 | P0 |
| FR-008 | **page-eval 最高档门禁（O-002）**：独立 evaluate 工具（page-eval）声明**最高风险档**（现有 ToolRisk 之外新增最高档位或场景策略显式 deny 缺省兜底，类型扩展由 plan 承接）；缺省裁决 = deny 或 ask（不允许静默 allow）；**untrusted 输入拒执行**——带 untrusted 来源标记（来自网络/采集/外部内容，v2 FR-010 语义）的代码缺省拒绝执行，仅显式 trusted（场景策略声明允许面）才放行；执行全程入审计（代码摘要/来源/裁决） | untrusted 代码 → ok:false + 「需 trusted 声明」可读错误（不降级执行）；trusted 代码在 ask 放行后执行成功；无策略默认 deny；审计记录含代码摘要与裁决来源 | P0 |

### 5.3 PER — 感知层（L1「眼」：元素级读取 / 结构化 DOM；Q-002/Q-013）

> 统一入参语义：元素级工具以 `selector`（定位语法面 O-011 建议态，见 FR-015）定位目标；读取类全部 risk:'read'（FR-005 免 ask）。

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-009 | **read-state 升级（多字段页面状态）**：dom read-state 在 url/title 基础上扩展可用字段（如 readyState/referrer/origin/lastModified/安全上下文等，浏览器可用性内自适配）；输出保持纯文本可读 + 结构化可解析 | 真实浏览器返回字段 ≥ url/title + 新增 ≥2 字段；既有 url/title 输出兼容（旧消费方不破坏） | P1 |
| FR-010 | **snapshot 结构化升级 + 分页预算（O-012 建议态 S-08）**：dom snapshot 输出两态——①纯文本态（body.innerText，兼容既有消费方）；②结构化段（可交互元素段/标题结构段可选）；支持分页续读（offset/limit）；默认预算 20k 字符保持 + maxLength 可配 + 截断标记（已截断/总长/续读提示）；既有缺省行为（无参 snapshot）输出不破坏 v2 消费方 | 无参 snapshot 与 v2 输出兼容（截断标记为附加元信息）；结构化段开启后含可交互条目；分页续读两页拼接等价全文；超预算截断标记正确 | P1 |
| FR-011 | **可交互元素清单（interactives）**：新增只读子命令/工具列出宿主页可交互元素（button/a[href]/input/select/textarea/[contenteditable] 等）摘要：标签文本/类型/关键状态（disabled/checked/selected/readonly）/可见性 + 可访问名（aria-label/title/关联文本）；支持过滤（类型/状态/文本包含）与分页；预算上限（默认条数可配）+ 截断提示 | 真实页面清单条目与 DOM 事实一致（抽样断言）；过滤/分页正确；预算超限截断标记；password 类输入只出类型不出值（FR-024 联动） | P1 |
| FR-012 | **read-element 元素级多面读取**：新增只读子命令读**单个**（selector 首匹配）元素：可选读取面 = attributes（指定或全部）/textContent/样式（computed 指定属性或全部/classList）/几何（getBoundingClientRect/可见性/滚动位）/交互状态（disabled/checked/selected/expanded/required）/表单值（input.value/select 选中/textarea.value，敏感字段脱敏 FR-024）；字段可选组合返回，输出结构化可解析；元素不存在 → 分类可读错误（EC-001） | 每读取面真实断言 ≥1（属性/文本/样式/几何/状态/表单值各一项）；字段组合选择生效；not found 错误可读；password 值脱敏 | P1 |
| FR-013 | **find/query 元素定位查询**：新增只读子命令做存在性/数量/摘要查询：selector 匹配数、匹配元素摘要（标签/文本前 N 字符/可见性/状态）、可选返回前 K 个的稳定索引或唯一化建议（供后续 click/read 定位）；用于行动决策前的事实确认 | 匹配数正确；摘要含标签+文本前缀；0 匹配返回 ok:true + 「未找到」计数（非错误，EC-001 区分）；预算护栏 | P1 |
| FR-014 | **结构/HTML 读取**：新增只读子命令读取元素结构（子节点概览/outerHTML）与页面集合（链接 href/图片 src/标题层级/表单控件清单）；整页序列化（documentElement.outerHTML）可选；输出预算护栏（截断 + 元信息）；用于「元素长什么样/页面结构如何」的结构感知（F12 Elements 等效读侧） | 单元素 outerHTML 与 DOM 一致；链接/图片集合计数与抽样正确；整页序列化预算截断标记；超大结构不拖垮输出 | P1 |
| FR-015 | **定位语法面（O-011 建议态 S-07）**：v3 全部元素级工具（read-element/find/click/fill/extract 等）统一 selector 入参；语法面 = CSS selector 基线 + **text= 增补**（`text=精确文本`/`text*=包含文本`，可配大小写/是否 trim）；role=/xpath 不做（role 信息经 interactives 清单 FR-011 输出；xpath 语义经 page-eval FR-037 可表达，记录 out）【待作者 O-011 确认】 | CSS 定位全链既有用例零回归；text= 精确/包含各 ≥1 真实用例；xpath/role 入参返回「不支持」可读错误（不静默当 CSS） | P1 |

### 5.4 INT — 交互层（L2「手」：4 桩补真 + 交互全谱 + 键盘；Q-001/Q-004/Q-011）

> 交互类子命令全部 risk:'ui'（UI 副作用，FR-005 分级 → 默认 ask）。合成事件真实性局限 = NG-007 工程公开。

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-016 | **hover/scroll 真实现（桩补真 1/2）**：dom hover 真实派发 pointer/mouse 事件序列（pointerover/pointerenter/mouseover/mouseenter 等，视平台能力）到目标元素；dom scroll 真实滚动（页面滚动 scrollBy/scrollTo 或元素 scrollIntoView/scrollTop 语义），支持 [selector] 与 dx/dy、可选 smooth/instant | 真实浏览器：hover 后目标元素 :hover 匹配/CSS hover 态生效（或自定义事件监听收到序列）；scroll 后滚动位置增量断言；桩时期 NotFoundError 消失 | P0 |
| FR-017 | **zoom/fullscreen 真实现（桩补真 3/4）**：dom fullscreen 真实调用 Fullscreen API（进入/退出 + fullscreenchange 断言；需要用户手势授权时失败转译 FR-009 路径）；dom zoom 以浏览器等效面实现（页面级缩放近似：根元素 zoom/transform 或按平台能力适配，实现语义 = 「视口内页面缩放 percent%」）+ 恢复默认 100%【S-01】 | 真实浏览器：fullscreen 进入/退出全屏态断言（授权允许路径）；zoom 后缩放近似生效 + 恢复默认；不支持环境返回可读降级（不抛桩错误） | P0 |
| FR-018 | **双击/右键事件**：dom 新增 dblclick（dblclick 事件序列：mousedown/up×2 + dblclick）与 contextmenu（右键上下文菜单事件）子命令，selector 定位；触发后目标处理函数生效 | 真实页面绑定监听断言收到对应事件序列；contextmenu 默认菜单行为可被 preventDefault 目标拦截（断言监听触发） | P1 |
| FR-019 | **长按/拖放**：dom 新增 long-press（pointerdown + 保持 ≥500ms + pointerup，可配时长）与 drag/drop（HTML5 DnD 事件序列 dragstart/dragover/drop/dragend 派发至源/目标 selector；拖放目标可用替代路径经 FR-037 派发兜底）；合成事件局限返回说明（NG-007/EC-007） | 真实页面监听断言收到长按序列（时长可配）；拖放监听断言收到 dragstart/drop 序列；目标不处理合成事件时返回可读提示（不中断会话） | P1 |
| FR-020 | **click 升级（坐标/偏移点击）**：dom click 在既有 selector 语义上可选支持元素内偏移（offsetX/offsetY，基于 FR-012 几何读取）或视口坐标（x/y → elementFromPoint 解析目标）点击；既有 selector-only 调用行为零回归 | 坐标/偏移点击命中预期元素（真实浏览器断言被点元素）；selector-only 旧用例零回归 | P1 |
| FR-021 | **focus/blur**：dom 新增 focus/blur 子命令（selector 定位；focus 前可聚焦性判定——tabindex/disabled/可聚焦元素，不可聚焦返回可读错误）；focus 后元素为 activeElement、blur 后失焦 | 真实页面 activeElement 断言；不可聚焦元素错误可读；focus 后键盘输入目标正确（FR-022 联动） | P1 |
| FR-022 | **type 文本键入（React 受控兼容）**：dom 新增 type 子命令：向目标（input/textarea/contenteditable，selector）键入文本——字符级 keydown/keypress（如平台支持）/input/keyup 事件序列；**React 受控组件兼容路径** = native value setter + input/change 事件序列（工程约束，实现由 plan 承接）；键入后值断言（真实闭环验证 lgdl-web React 受控表单值变更）【建议态 S-04（O-006）：兼容路径为必达验收，若真实闭环证明不可行则按 O-006 作者裁决降级】 | node 注入桩事件序列断言；真实浏览器（lgdl-web React 受控 input）键入后值变更 + onChange 触发；非受控原生 input 同样生效；对 contenteditable 插入文本生效 | P1 |
| FR-023 | **press 组合键**：dom 新增 press 子命令：单键/组合键派发（keydown→keyup 序列，支持修饰符 ctrl/alt/shift/meta 组合，如 Enter/Tab/Escape/箭头/常用快捷键）；目标 = 当前聚焦元素或先 focus selector；用于表单提交/焦点移动/快捷键场景 | 真实页面 keydown/keyup 监听断言（键码/修饰符正确）；Enter 在 input 中触发提交语义（表单 submit 监听断言）；Tab 顺序由浏览器默认行为承载时返回可读说明 | P1 |
| FR-024 | **敏感字段策略（O-006/O-012 建议态）**：密码/凭据类字段（input[type=password]/信用卡等敏感面）行为准则——**读侧**：read-element/快照/清单对敏感字段值不回显（占位符/长度/类型代替）；**写侧**：type/fill 写入敏感字段默认 ask + 需场景显式 trusted 声明（FR-005 分级 risk 最高敏感档）；审计与日志不回显敏感值；非敏感字段不受影响 | 敏感字段读回显脱敏断言（无明文值）；type 到 password 触发 ask；deny 后值不变；审计日志 grep 无明文 | P1 |

### 5.5 WT — 条件等待原语（横切；Q-005，v2 已确认缺项）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-025 | **wait 条件等待（wait-for）**：新增独立工具 wait（与既有 sleep 固定延时区分、sleep 语义不破坏）：条件等待 = 元素出现（selector 匹配）/可见（几何非零 + 非 display:none）/可交互（非 disabled 可见）/消失/文本出现（text=，O-011 语法面一致）；参数 timeout（默认值可配）+ 可选 interval/轮询策略（优先 MutationObserver，降级轮询）；命中返回 ok + 当前状态摘要；超时返回可读超时错误（含最后观察状态），不中断会话；可接受同时等待多条件任一/全部（可配） | SPA 动态渲染场景（延迟插入元素）真实断言命中；元素消失等待命中；超时错误含最后状态；与 sleep 并存零回归；采集翻页组合（L5）使用 wait 后可复现稳定 | P1 |

### 5.6 CHR — chrome 操作层（L3：页面内可承载 chrome 子集 + P2 接线；Q-007/Q-009/O-004/O-005/O-008 建议态）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-026 | **打印触发**：新增 chrome/dom 子命令触发打印（window.print()）；打印对话框由用户侧确认（页面语义）；不支持/静默失败环境返回可读说明；不做打印为 PDF（需 CDP/扩展侧，out 记录）【建议态 S-03（O-005）】 | 真实浏览器触发打印对话框（headless 环境断言调用可达 + 不可达返回可读说明）；授权转译不中断会话 | P2 |
| FR-027 | **历史导航/刷新**：新增子命令 history back/forward（会话内 history.back/forward，宿主 SPA 路由内可用）与 reload 刷新；**reload 语义** = 破坏性（重载宿主页、AI 会话上下文中断）→ 默认 ask（FR-005 分级 risk 高）+ 提示重载后需重新 read-state/恢复会话；URL 级跨域导航 out（NG-002）【建议态 S-03（O-005）】 | back/forward 在会话历史内导航断言（URL 变化）；reload 默认触发 ask、deny 后页面不刷新；允许后刷新 + 会话恢复路径可查 | P2 |
| FR-028 | **页面截图**：新增截图能力——视口级与元素级（selector）同源近似截图（canvas/foreignObject 序列化面，零新增依赖约束 NFR-002；CSP/安全失败按转译返回）；输出 = 截图数据（dataURL/二进制）可经 save/download 链路落盘；**整页级截图 out**（captureVisibleTab/CDP = F-14 扩展宿主/OS 生态位）【建议态 S-02（O-004）：若零依赖路径在真实浏览器不可达，本 FR 降级为 out 记录，由作者最终裁决】 | 真实浏览器视口/元素截图数据可生成且尺寸正确（允许近似度误差声明）；失败转译可读；整页级入参返回「不支持 + 归属说明」 | P2 |
| FR-029 | **save P2 接线 + 导出链路承载**：v2 save 工厂（save/download 两路径）入 lgdl-web 默认矩阵注册（FR-043 联动）；并作为 v3 导出（text/json/csv，FR-040）落盘链路（FSA 存用户文件 / blob 下载链）；用户手势授权失败转译（v2 FR-009 沿）；save 内容格式护栏（export 侧承担类型化，save 原样语义不变）【建议态 S-06（O-008）】 | 矩阵含 save（schema/help/dispatch 可查可调）；真实浏览器保存成功/用户拒绝两路断言；与 export 组合端到端落盘 | P2 |
| FR-030 | **notify/clipboard P2 接线**：v2 notify/clipboard 工厂（notify.ts/clipboard.ts）入 lgdl-web 默认矩阵——notify 默认开（授权失败转译）；clipboard 读=敏感面（默认 ask）/写=ask（FR-005 分级），roundtrip 断言；UI 呈现路径归场景（FR-044）【建议态 S-06（O-008）】 | 矩阵含 notify/clipboard；clipboard 读写真实浏览器 roundtrip（V13③ 方法延续）+ 读触发 ask；notify 授权两路转译 | P2 |

### 5.7 WR — 读写层（L4「F12 等效」：改/增/删/填/执行；Q-003/Q-006）

> 写入类子命令全部 risk:'ui'/'write'（FR-005 → 默认 ask）；所有写入后**可选回读校验**（read-element 值断言）。

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-031 | **set-text 改元素文字**：dom 新增 set-text 子命令：设置目标元素文本（textContent 覆盖语义，显式声明清空子节点）；写入后回读断言 | 真实页面元素 textContent 变更断言；子节点清空语义明确；selector 不存在 → EC-001 可读错误 | P1 |
| FR-032 | **set-attr/remove-attr 改属性**：dom 新增 set-attr/remove-attr 子命令：设置/移除目标元素属性（setAttribute/removeAttribute；data-*/aria-*/href/class 等均可）；写入后回读断言 | 真实页面属性 set/remove 断言；无效属性名（含非法字符）可读错误；回读一致 | P1 |
| FR-033 | **set-style 改样式**：dom 新增 set-style 子命令：元素样式写入——style.cssText 覆盖或单属性（style.xxx）设置 + classList add/remove/toggle；写入后 computed style 回读断言 | 真实页面 style/class 变更后 computed 断言；覆盖/增量两种语义明确区分；非法属性值可读错误 | P1 |
| FR-034 | **set-value 改表单值（React 受控兼容基元）**：dom 新增 set-value 子命令：对 input/textarea/select 设值——**native value setter + input/change 事件序列**（React 受控组件兼容基元，v2 FR-022 同源技巧）；与 fill（FR-035 类型化）分层：set-value = 底层值原语 | 真实页面（lgdl-web React 受控）值变更 + onChange 触发断言；原生元素值变更断言；敏感字段写走 FR-024 | P1 |
| FR-035 | **fill 表单类型化填写 + 提交**：dom 新增 fill 子命令：表单控件类型化填写——text/number/email/textarea（键入语义 FR-022 或 set-value 原语按控件选择）/select（按 option label 或 value 选中 + change）/checkbox/radio（按 checked 目标勾选）；支持一次性填多字段（selector→值映射）；可选 submit（requestSubmit 或隐式提交）提交整个表单；填写后逐字段回读断言；`<input type=file>` 显式不可用（NG-004） | 真实表单（含 lgdl-web React 受控面）多字段填写后各字段值断言；select 选中项断言；checkbox/radio 状态断言；submit 触发提交监听；file input 返回不可用说明 | P1 |
| FR-036 | **add/remove 元素（增删元素）**：dom 新增 add/remove 子命令：add = 创建元素（tag/文本内容/属性）+ 插入位置（append/prepend/insert before/after 指定 selector）；remove = 删除元素（selector，含移除后 DOM 断言）；写入后回读断言 | 真实页面增/删后 DOM 断言（存在性/顺序/内容）；插入位置四种语义各 ≥1 用例；remove 不存在的元素 → EC-001 | P1 |
| FR-037 | **page-eval 页面 evaluate（F12 console 等效）**：独立工具 page-eval（R-04/O-002）：在**宿主页同源 DOM/JS 上下文**执行任意表达式/脚本（等效 F12 console 对该页的权限：可读同源 DOM/存储、可改 DOM、可调用页面函数；跨域仍受 SOP，NG-002）；入参 = 代码 + 可选参数/表达式形态声明；返回序列化结果（JSON 可解析或文本）+ 预算截断；**执行全程受 FR-008 最高门禁**（untrusted 拒执行 + ask/deny + 审计）；运行时异常/超时/执行预算中止（EC-004）不拖垮宿主页；与 worker 沙箱 eval-js 语义公开区分（NG-010） | trusted + ask 放行路径执行成功（真实断言 DOM 变更/返回值正确）；untrusted 拒执行（FR-008 联动）；异常/超时返回可读错误且页面存活；返回序列化 + 预算截断标记；审计含代码摘要 | P1 |

### 5.8 COL — 采集层（L5「爬虫等效」：extract/翻页/导出/护栏；Q-008/Q-014/O-007 建议态）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-038 | **extract 结构化抽取**：独立 extract 工具（只读 risk:'read'）：声明式抽取——表格（table→行×列 JSON）/列表·卡片（list selector + 字段 selector 映射）/链接集合/图片集合/页面元数据（title/meta）；单次抽取规模上限 + 截断标记；抽取结果结构化可解析 + 携带来源上下文（当前 URL/时间）【建议态 S-05（O-007）：形态 = 独立工具（非 evaluate 组合），selectors 声明式】 | 真实页面表格/列表/链接/图片各 ≥1 抽取断言（结构与 DOM 事实一致）；规模上限触发截断标记；无匹配返回空集 + 说明（非错误） | P1 |
| FR-039 | **翻页采集原语组合（可复现循环）**：以 wait（FR-025）+ 真实 scroll/click + extract（FR-038）+ export（FR-040）原语，AI 编排下**多页采集循环可复现达成**（下一页按钮 selector → 点击 → wait 新内容 → 增量 extract → 循环）；**不新增独立翻页循环引擎工具**（循环 = AI 编排，受护栏 FR-042 约束；避免过度工具化）【建议态 S-05（O-007）】 | 真实多页列表场景（≥2 页）AI 编排采集：翻页后数据增量正确、无重复/遗漏；wait 命中后时序稳定；护栏（页数/条数上限）触发即中止且已采数据保留可导出 | P1 |
| FR-040 | **export 类型化导出（text/json/csv）**：export 工具按格式类型化导出：text（原样/拼接）、json（结构化数组 + 字段名 + 元数据头：来源 URL/采集时间/trust 标记）、csv（表头 + 行 + **转义护栏**——含逗号/引号/换行的字段正确转义）；经 save/download 链路（FR-029）落盘；无可用落盘面时返回可读降级 | text/json/csv 三格式输出断言（含特殊字符转义）；元数据头含来源与时间；落盘链路端到端（save 授权两路）；降级路径可读 | P1 |
| FR-041 | **export excel 边界**：真 .xlsx 导出**缺省不做**（需第三方库，NFR-002 零依赖冲突，NG-005）——以 csv（FR-040）达成「Excel 可打开」；.xlsx 入参返回「不支持 + csv 替代指引」；场景确需 xlsx 时经注入库扩展（作者另行裁决 O-007）【建议态 S-05】 | .xlsx 请求返回可读不支持说明 + csv 指引；注入库扩展点存在（plan 承接声明，不默认实现） | P2 |
| FR-042 | **采集护栏与 trust 元数据**：采集/抽取护栏——单次条数上限（默认可配）/翻页页数上限/限速间隔（两次采集间最小延时）/输出预算，超限中止且已采数据保留（EC-011）；**trust 元数据**——采集与导出结果携带来源标记（来源 URL/采集时间/可信级 untrusted，v2 FR-010 语义扩到采集面），下游消费方可识别外部数据面；敏感页面内容（含凭据文本）采集时按 FR-024 脱敏 | 护栏触发断言（上限/限速/中止保留）；导出文件/结构含 trust 元数据字段；含注入指令文本的采集结果在 AI 闭环不回显执行（提示注入护栏，v2 EC-007 语义延续） | P1 |

### 5.9 LGDL — lgdl-web 场景接入（Q-009/O-008 建议态 + ask UI 归场景）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-043 | **v3 默认注册矩阵扩展**：lgdl-web 组装点（session.ts）声明 v3 新增工具/子命令默认启用集：只读族（read-state 升级/snapshot 结构化/read-element/find/interactives/结构读取/extract）默认开；交互/写族（click 升级/双击右键长按拖放 focus/type/press/set-*/fill/add/remove）默认开但写经 PRM（FR-007 子命令级 ask）；wait 默认开；page-eval 默认关（场景策略显式开启 + FR-008 门禁，FR-045）；P2 接线项（save/notify/clipboard）按 O-008 建议态（S-06）入矩阵；矩阵变更单点生效 | 矩阵单测：启用集 → 派生 schema 与矩阵一致；默认关闭工具（page-eval 等）schema 不含/help 标注/派发报禁用（v2 FR-004 语义）；矩阵单点变更全链可见 | P1 |
| FR-044 | **ask/授权 UI 呈现扩展（归场景，base 无 UI）**：lgdl-web 场景 UI 对 v3 新裁决面呈现：子命令级 ask（含子命令名，FR-005/007）、page-eval 最高档 ask（含代码摘要）、敏感字段写入确认（FR-024）、save/截图/剪贴板授权路径提示（FR-029/028/030 转译）；base 只提供只读状态/事件面（v2 FR-007 onAsk 契约沿），无 UI 代码 | AI 闭环触发各 ask 场景 → 弹层呈现并完成裁决（allow/deny/超时三路）；base 无 UI 代码（grep 断言） | P1 |
| FR-045 | **lgdl-web page-eval 场景策略缺省**：lgdl-web aiPolicy 对 page-eval 声明缺省 deny（或 ask）+ trusted 代码来源白名单面（显式 trusted 声明才可执行）；untrusted（来自网络/采集内容的代码引用）拒执行呈现可读说明；默认取向场景可覆盖但不可低于「ask」（不可静默 allow） | 真实会话：page-eval 未声明 trusted → deny/ask；untrusted 内容引用 → 拒执行说明；场景显式 trusted 白名单放行路径可用；审计记录 | P1 |

## 6. 非功能需求 (NFR)
> 性能、安全、可用性等跨切面需求

| ID | 类别 | 需求描述 | 验收标准 |
|----|------|---------|---------|
| NFR-001 | domain-neutral 纯度 + 运行时依赖（v2 NFR-001/002 延续） | web-cli-base v3 新增面**零 LGDL 依赖、零 react、零业务依赖**；**零新增运行时依赖**（缺省；截图/xlsx 等如需第三方库须作者 O-004/O-007 例外裁决，NG-005）；浏览器面优先 Web 标准 API，无 Node/OS 专用运行时依赖 | 全仓 grep base 无 lgdl/react/业务 import 新增残留；package.json 依赖图谱核验无新增运行时依赖（或裁决例外清单存在）；base 独立构建 + 独立测试通过 |
| NFR-002 | 安全基线 | 权限无旁路（FR-005/008 grep 断言：写/evaluate 无绕过门禁实现）；untrusted 拒执行语义（FR-008/042）；敏感字段读脱敏/写受控/审计脱敏（FR-024）；子命令级裁决 + evaluate 全量审计（FR-005/008）；evaluate 最高档缺省不静默 allow（FR-008/045） | grep 无旁路实现；安全专项测试清单存在（untrusted/敏感字段/最高档裁决）；审计事件面单测通过；evaluate 代码摘要入审计 |
| NFR-003 | 上下文预算与 schema 膨胀 | v3 多子命令/工具全量 schema 体积与顺序受控（分组合并、开关默认生效，v2 FR-001/004 机制沿）；大输出（snapshot/read-element/interactives/extract/evaluate 结果）截断/分页/超时护栏有默认声明（PER/COL FR 预算值一致收敛）；wait 无额外常驻开销 | 全量派生数组体积/顺序对比 v2 断言（增量可测、tool_choice 不漂移）；大输出截断标记断言；evaluate/采集超限中止可测 |
| NFR-004 | 事件真实性与框架兼容 | 合成事件局限（isTrusted=false，NG-007）文档化于相关工具帮助面；React 受控组件兼容路径（native setter + 事件序列）为 type/fill/set-value 必达验收；lgdl-web 真实闭环（V4/AC-008 基线）逐表单验证 | 帮助面含局限声明；真实浏览器 lgdl-web React 受控表单 type/fill/set-value 值变更断言通过（或按 O-006 裁决降级记录）；验证记录无未声明差异 |
| NFR-005 | 测试门禁双轨（v2 NFR-006 延续） | base node 注入面（fake ops：document/事件/表单/授权）全绿 + 真实浏览器冒烟面（chromium，沿 V13 方法扩展 v3 能力清单）记录 + 全仓回归（v2 零回归）；等价/更优覆盖优先 | 全仓测试命令全绿（v2 基线 + v3 新增用例）；v3 专项测试清单（node 面）；真实浏览器冒烟清单（validate 报告）；改写记录可审计 |
| NFR-006 | 类型与构建完整性 | 全仓 tsc 零错误；vite build 零错误；base 导出面覆盖新能力类型（子命令 risk 声明/evaluate 门禁/PlatformDomOps 扩展面） | 构建命令零错误退出；base index 导出面清单含新能力类型 |
| NFR-007 | 性能 | wait 优先 MutationObserver（低轮询开销）；高开销 DOM 操作（snapshot/extract/整页序列化）预算护栏默认生效；无策略配置时 dispatch 零额外开销不变（v2 NFR-005 沿）；真实页面大 DOM（万级节点）下预算护栏不拖垮宿主 | 时钟注入断言 wait 轮询间隔/观察者路径；大 DOM 预算护栏单测；dispatch 无策略开销基线不回归 |
| NFR-008 | 可观测性/审计（v2 NFR-009 延续） | 子命令级权限裁决入审计（工具+子命令+裁决来源）；page-eval 执行审计（代码摘要/来源/裁决/结果摘要）；写操作审计（工具/子命令/selector）；审计记录与 session 恢复数据可关联 | 审计事件面单测（子命令/裁决字段）；evaluate 审计记录可查；写操作审计可回放 |

## 7. 边界情况 (EC)
> 异常场景和边界条件的处理方式

| ID | 场景 | 处理方式 |
|----|------|---------|
| EC-001 | 元素不存在 / 不可见 / 不可交互（selector 定位类工具） | 分类可读错误（not found / not visible / disabled / not interactable），会话不中断；find（FR-013）的 0 匹配 = ok:true + 计数（区分「查询」与「操作」语义） |
| EC-002 | selector 语法错误 / 非法（含 text= 语法错误） | 可读错误 + 语法指引；不把 text=/xpath 当 CSS 静默解析（FR-015）；匹配多个时操作类按首元素语义 + 提示（可经 find 精确化） |
| EC-003 | page-eval 收到 untrusted 输入（网络/采集来源内容） | 拒执行 + trusted 声明路径说明（FR-008），不静默降级执行、不截断执行；入审计 |
| EC-004 | page-eval 运行时异常 / 超时 / 死循环（执行预算） | 捕获/中止返回可读错误 + 部分结果（如可序列化）；宿主页不被拖垮（执行预算/异步超时实现由 plan 承接，需求级：必须可中止返回）；页面存活断言 |
| EC-005 | 敏感字段（password/凭据）读/回显/采集 | 值不回显（占位/长度/类型代替，FR-024）；type/fill 写敏感字段默认 ask + trusted；审计日志无明文（grep 断言）；采集结果含凭据文本时脱敏 |
| EC-006 | 合成事件对 React 受控组件不生效（值未同步） | native setter + input/change 事件序列兜底（FR-022/034/035）；仍失效返回「事件已派发但值可能未同步」提示（可验证点）；不静默声称成功——写入后回读校验不一致即报 |
| EC-007 | 拖放/长按/键盘等合成事件不被目标处理（isTrusted=false 局限） | 返回「已派发 + 合成事件局限说明」（NG-007）+ 备用路径建议（evaluate 派发 FR-037）；会话不中断、不假装可信生效 |
| EC-008 | 浏览器授权拒绝/不支持（全屏/剪贴板/保存/通知/打印/权限/截图安全） | v2 FR-009 友好转译（授权路径指引），会话不中断；AI 可据错误自愈（v2 EC-003 语义沿） |
| EC-009 | 刷新/导航破坏性操作（reload/退出宿主页） | reload 默认 ask（FR-027，EC-014 deny 优先）；允许后提示重新 read-state/恢复会话（session 恢复路径，v2 FR-034 联动）；历史 back/forward 会话内导航不触发 ask |
| EC-010 | 大页面/大输出（snapshot/read-element/interactives/extract/整页序列化/evaluate 结果） | 预算截断/分页/超时 + 输出元信息（长度/截断标记/续读提示），上下文预算受控（NFR-003）；分页续读语义（FR-010） |
| EC-011 | 采集不收敛（无限滚动不终止/下一页循环/超规模） | 护栏中止（页数/条数上限 + 限速，FR-042）；已采集数据保留可导出；中止原因可读 + 建议（调整 selector/上限） |
| EC-012 | 导出目标不可用（save 授权拒绝/xlsx 未注入/下载链禁用） | 可读降级：csv 替代 xlsx（FR-041）、下载链替代 FSA（FR-029）；不静默丢数据（v2 EC-004 语义沿） |
| EC-013 | 权限子命令级与工具级规则冲突 | deny 优先（v2 EC-014 语义沿）：子命令 allow 与工具 deny 冲突 → deny；冲突裁决入审计（FR-006） |
| EC-014 | 页面/文档失效（导航/刷新后旧句柄失效、DOM 替换后旧 selector 目标消失） | NotFoundError 转译（v2 platform.ts 既有）+ 建议重新 read-state/find 定位；wait 可用时先 wait 再操作（FR-025）；不静默操作错误目标 |

## 8. 验收标准（总体验收清单）
> 可验证的总体验收清单（五层覆盖 / v2 零回归 / 安全分级 / evaluate 门禁 / 场景接入 / 双轨验证）

| # | 验收项 | 验证方式 | 关联 |
|----|--------|---------|------|
| AC-001 | **v2 零回归 + additive 契约**：v2 46 FR 行为零回归（含 dom 既有 7 子命令既有用例）；新子命令/工具缺省不改变 v2 行为；顺序/置末/delay 契约保持 | v2 全仓专项测试零回归；deriveTools 顺序断言；F-23 顺序用例 | FR-001, NFR-005, G-005 |
| AC-002 | **感知层（PER）**：read-state 多字段 / snapshot 结构化+分页 / interactives / read-element 全读取面 / find / 结构读取在真实浏览器冒烟通过；预算护栏生效 | 真实浏览器逐子命令断言（V13 方法扩展）；node 注入面单测 | FR-009~014, G-001 |
| AC-003 | **交互层（INT）**：4 桩真实现（hover/scroll/zoom/fullscreen 实际生效）+ 双击/右键/长按/拖放/focus/click 坐标/type/press 在真实浏览器（含 lgdl-web React 受控面）实跑可用；桩错误消失 | 真实浏览器交互断言清单（V13 八组方法扩展）；React 受控表单闭环 | FR-016~023, G-004, NFR-004 |
| AC-004 | **等待原语**：wait 在动态渲染场景（SPA 延迟插入/无限滚动加载）真实命中 + 超时可读；sleep 语义零回归 | 真实浏览器动态场景断言；node 时钟注入 | FR-025, G-001 |
| AC-005 | **chrome 层**（按 O-004/O-005/O-008 裁决冻结）：save/notify/clipboard 入矩阵可用；打印/刷新导航/截图按裁决验收（cut 项记录 out + 归属） | 矩阵单测 + 真实浏览器授权两路断言 | FR-026~030, G-006 |
| AC-006 | **读写层（WR）**：set-text/attr/style/value + fill + add/remove 在真实表单/页面闭环通过（写入后回读断言）；React 受控填写值变更 | 真实浏览器写后回读断言；lgdl-web React 受控表单 | FR-031~036, G-001, NFR-004 |
| AC-007 | **evaluate 门禁端到端**：page-eval untrusted 拒执行 + trusted/ask 放行 + 执行成功 + 审计；与 worker 沙箱 eval-js 语义区分测试；无旁路 grep | 门禁专项单测（untrusted/ask/deny/超时）+ 真实浏览器执行断言 + 审计核验 | FR-008/037/045, NFR-002, G-003 |
| AC-008 | **采集层（COL）**：extract + 翻页循环（AI 编排原语）+ export text/json/csv 在真实多页列表端到端（含护栏触发 + 保留 + trust 元数据 + csv 转义） | 真实多页采集端到端断言；护栏触发断言；导出文件内容核验 | FR-038~042, G-001, G-007 |
| AC-009 | **子命令级权限（IMP-4 修复验收）**：只读子命令免 ask / 写子命令 ask / deny 矩阵在 lgdl-web 真实会话生效；v2 IMP-4 遗留关闭记录 | lgdl-web AI 闭环 ask 场景（allow/deny/超时三路）；策略单测；IMP-4 关闭登记 | FR-005~007, G-002, NFR-002 |
| AC-010 | **双轨测试 + 构建门禁**：node 注入面全绿（v3 专项）+ 真实浏览器冒烟清单（validate 报告）+ v2 全仓回归 + tsc/vite 零错误 | 全仓测试命令；专项清单；构建命令 | NFR-005/006, G-005 |
| AC-011 | **base 纯度 + 零新增依赖**：新增面无 lgdl/react/业务 import 与文案残留；依赖图谱无新增运行时依赖（或作者裁决例外清单） | grep 清单 + 依赖图谱核验 | NFR-001, NG-005 |
| AC-012 | **上下文预算**：全量 schema 体积/顺序对比 v2 可断言（tool_choice 不漂移）；大输出截断/分页/超时断言 | schema 体积专项（V16 方法延续）；大输出护栏断言 | FR-010/011/038, NFR-003 |

## 9. 开放问题与设计决策
> 待决策事项和需要进一步调研的内容；作者已裁（O-001/O-002/O-009/O-010）为红线输入；O-003~O-008/O-011/O-012 建议态 + 访谈问题清单供作者拍板

### 9.1 开放点状态总表（discovery §6.3）

| # | 开放点（discovery） | 状态 |
|---|--------------------|:--:|
| 1 | O-001 首批范围与波次（五层全谱 vs 核心面） | ✅ 已决策（R-02：五层全谱一次补齐；波次排序见 §9.4） |
| 2 | O-002 页面 evaluate 形态与门禁 | ✅ 已决策（R-04：独立工具 page-eval + 最高档 + untrusted 拒执行；FR-008/037/045） |
| 3 | O-003 v2 转译桩收口归属（hover/scroll/zoom/fullscreen） | ⏳ 建议态（S-01：归 v3 补齐，随 v0.7 同批）+ 访谈 I-01 |
| 4 | O-004 截图能力边界 | ⏳ 建议态（S-02：元素/视口同源近似入 v3 零依赖；整页 out）+ 访谈 I-02 |
| 5 | O-005 chrome 级能力裁决（书签/标签页/打印/刷新/导航语义） | ⏳ 建议态（S-03：打印触发 + 刷新 ask + 历史 back/forward 入；书签/标签页/下载历史 out）+ 访谈 I-03 |
| 6 | O-006 键盘/表单合成事件策略（type/press 语义 + React 受控 + 敏感字段） | ⏳ 建议态（S-04：native setter 兼容路径必达；敏感字段读脱敏写 ask）+ 访谈 I-04 |
| 7 | O-007 采集/导出边界（extract 形态/翻页循环/excel） | ⏳ 建议态（S-05：独立 extract；循环 AI 编排不工具化；excel→csv）+ 访谈 I-05 |
| 8 | O-008 P2 场景接入收口（save/notify/clipboard 入矩阵） | ⏳ 建议态（S-06：随 v3 入默认矩阵）+ 访谈 I-06 |
| 9 | O-009 权限 risk 子命令粒度（IMP-4） | ✅ 已决策（R-05：子命令级 risk；FR-005~007） |
| 10 | O-010 版本落点与上游时序 | ✅ 已决策（R-03：v3 与 v2 同批 v0.7；FR-004） |
| 11 | O-011 元素定位语法面 | ⏳ 建议态（S-07：CSS + text=；role/xpath out）+ 访谈 I-07 |
| 12 | O-012 快照/清单形态与预算（含敏感字段策略挂靠） | ⏳ 建议态（S-08：snapshot 两态+分页+预算；interactives 预算；敏感字段并入 S-04）+ 访谈 I-08 |

### 9.2 建议态汇总（已写入对应 FR，待作者确认后冻结）

| 建议态 | 内容 | 关联 FR |
|--------|------|---------|
| S-01（O-003） | 4 个 DOM 转译桩（hover/scroll/zoom/fullscreen）真实实现归 v3 补齐（browserEnv，FR-003/016/017），随 v0.7 与 v2 同批发布；不在 v2 另起收口补丁 | FR-003/016/017 |
| S-02（O-004） | 截图：元素级/视口同源近似入 v3（canvas/foreignObject 面，零新增依赖 NFR-002；CSP/安全失败转译）；整页级截图 out（captureVisibleTab/CDP = F-14 扩展宿主）；若零依赖路径真实不可达则本 FR 降级 out | FR-028 |
| S-03（O-005） | 打印 = window.print() 触发（用户侧确认对话框，不做 PDF）；历史 back/forward 入 v3（会话内）；刷新 reload = 破坏性默认 ask；书签/标签页·窗口/下载历史 = 不可承载记录 out（NG-003）；跨域导航 out（NG-002） | FR-026/027 |
| S-04（O-006） | type/press/fill/set-value 合成事件 + React 受控兼容 = native value setter + 事件序列（必达验收，工程约束 plan 承接）；敏感字段读脱敏/写默认 ask + trusted（O-012 敏感字段挂靠本项） | FR-022/023/034/035/024 |
| S-05（O-007） | extract = 独立声明式工具（非 evaluate 组合）；翻页采集循环不工具化（AI 用 wait/scroll/click/extract/export 原语编排 + 护栏 FR-042）；导出 text/json/csv 入 v3；真 xlsx out（csv 达成 Excel 可打开；注入库扩展点预留，另行裁决） | FR-038~041 |
| S-06（O-008） | save/notify/clipboard P2 工厂随 v3 入 lgdl-web 默认矩阵（save 开 + 导出链承载；clipboard 读/写 ask；notify 授权转译）——零新代码先接线低垂果实 | FR-029/030/043 |
| S-07（O-011） | 元素定位语法面 = CSS selector 基线 + text=（精确/包含）增补；role=/xpath out（role 信息经 interactives 清单输出；xpath 经 page-eval 可表达） | FR-015 |
| S-08（O-012） | snapshot 保持文本态兼容 + 结构化段可选 + 分页续读；预算 20k 字符默认 + maxLength 可配 + 截断标记；interactives 清单预算默认条数可配 + 过滤/分页 | FR-010/011 |

### 9.3 访谈问题清单（待作者拍板；供回传给用户裁决）

| # | 问题（一句话） | 建议默认 | 关联 |
|----|--------------|---------|------|
| I-01 | O-003：4 个 DOM 转译桩真实实现是否确认归 v3 补齐（随 v0.7 与 v2 同批发布），而不在 v2 另起收口补丁？ | 采纳 S-01 | FR-003/016/017 |
| I-02 | O-004：截图是否按「元素/视口级同源近似入 v3（零新增依赖）+ 整页级 out（F-14/扩展宿主）」执行？零依赖路径真实不可达时是否接受 FR-028 降级 out？ | 采纳 S-02 | FR-028, NG-005 |
| I-03 | O-005：chrome 级语义「打印=触发对话框、历史 back/forward 入、刷新 reload 默认 ask、书签/标签页/下载历史=不可承载 out」是否确认？ | 采纳 S-03 | FR-026/027, NG-003 |
| I-04 | O-006：type/press 合成事件 + React 受控兼容（native setter 路径为必达验收）与敏感字段「读脱敏/写默认 ask + trusted」是否确认？ | 采纳 S-04 | FR-022/023/024/034/035 |
| I-05 | O-007：采集边界「独立 extract 工具 + 翻页循环不工具化（AI 编排原语）+ 导出 text/json/csv + 真 xlsx out（csv 达成）」是否确认？ | 采纳 S-05 | FR-038~041 |
| I-06 | O-008：save/notify/clipboard P2 工厂是否随 v3 入 lgdl-web 默认矩阵（clipboard 读写 ask、save 承载导出链）？ | 采纳 S-06 | FR-029/030/043 |
| I-07 | O-011：元素定位语法是否确认「CSS 基线 + text= 增补，role=/xpath out」？ | 采纳 S-07 | FR-015 |
| I-08 | O-012：快照形态与预算是否确认「文本态兼容 + 结构化段可选 + 分页续读 + 20k 默认预算可配」？interactives 清单预算默认值是否可用（建议 200 条内）？ | 采纳 S-08 | FR-010/011 |

> 注：上述 8 项为「确认或调整」级问题——默认建议已按素材（discovery 边界界定、v2 先例、NFR-002 零依赖纪律、R-001~R-008 风险）推导并写入本规范 FR；作者逐项确认即可冻结，调整则仅波及对应 FR 的边界/语义措辞，不改变五层范围与整体结构。author 确认后本规范升 v1.1 冻结。

### 9.4 拆分建议与波次（默认按单 Feature + P0/P1/P2 波次推进）

- **范围纪律提醒**：五层全谱 ≈34 项 + 权限分级 + evaluate 门禁在单版本内容量大（45 FR），O-001 已裁「一次补齐」，由 P0/P1/P2 波次承载而非砍域（discovery R-001 风险缓解）。
- **波 1（P0）= 基座与护栏先立（8 FR）**：BSL 衔接（FR-001~004）+ PRM 子命令级权限与 evaluate 门禁（FR-005~008）——先立「契约基线 + 安全分级」两根柱子，任何写/evaluate 工具上线即有护栏；与 v2 同批合入动作同步。
- **波 2（P1）= 五层主体（31 FR）**：PER 感知（FR-009~015）+ INT 交互（FR-016~024）+ WT 等待（FR-025）+ WR 读写与 page-eval（FR-031~037）+ COL 抽取/翻页/导出护栏（FR-038/039/040/042）+ LGDL 接入面（FR-043~045）——核心价值层。
- **波 3（P2）= chrome/接线与 excel 边界（6 FR）**：CHR（FR-026~030 打印/导航/截图/P2 接线 save·notify·clipboard）+ COL excel 边界（FR-041）等建议态项——依赖作者 O-004/O-005/O-008 确认。
- **若作者裁 Wave 级拆分子 Feature**（v0.7 容量压力时）：按 `specs-tree-<子特性>` 命名直接嵌套于本 Feature 目录下，父级出轻量规范 + state.json childrens 记录；候选切分 = 「web-cli-base-v3-core（PER+INT+WR+WT+PRM，P0/P1）」与「web-cli-base-v3-chr-col（CHR+COL+LGDL 接线，P2）」；默认不拆分（O-001 一次补齐已裁，本规范按单 Feature 完整表达）。

## 修订记录
> 记录本文档的版本变更历史

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：以 discovery.md v1.0（Q-001~Q-017 / §3.3 五层映射 ≈34 缺失 / §3.4 边界 / O-001~O-012）+ 作者裁决（R-01~R-05：核心定位/O-001 五层一次补齐/O-010 同批 v0.7/O-002 evaluate 最高门禁/O-009 子命令级 risk）为红线输入；定义 45 FR 九组（BSL 4 / PRM 4 / PER 7 / INT 9 / WT 1 / CHR 5 / WR 7 / COL 5 / LGDL 3）+ 8 NFR + 14 EC + 12 AC；O-003~O-008/O-011/O-012 以建议态（S-01~S-08）写入并整理访谈问题清单（I-01~I-08）供作者拍板；波次排序 §9.4 | 2026-09-06 | SDDU Spec Agent |
