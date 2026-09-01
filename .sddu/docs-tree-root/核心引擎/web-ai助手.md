# 核心引擎 — web AI 助手深潜

> **文档定位**: sddu-docs-deepdive-web — @lgdl/lgdl-web 包深潜：Web 工作台 SPA、浏览器内编译管线、CodeMirror 6 编辑器与诊断、data-lgdl-loc 点击定位（R-D2 归因定论）、AI 助手（多厂商接入 / 原生 function calling 三工具 / agent 循环 / 增量执行门禁）；V2 后补充 lgdl-web-cli / lgdl-web-op-cli / web-cli-base 三层结构
> **输出文件名**: web-ai助手.md
> **数据来源**: 代码扫描生成（实读 `packages/lgdl-web/src/` 全部源码：App.tsx 1273 行 + ai/ 6 文件 + locate/snap/examples + lgdl-web-cli / lgdl-web-op-cli / web-cli-base 源码 + lgdl-core serialize.ts/parser.ts/status.ts 交叉核实，当日实测测试 32/32 通过；V2 前基线为 107/107）
> **创建人**: sddu-docs Agent
> **创建时间**: 2026-08-30
> **版本**: v2.0（feature/group-as-node @ `d03dca4`，V2 9 包体系）
> **更新说明**: V2 更新——包名 @lgdl/web → @lgdl/lgdl-web（目录 packages/lgdl-web）；AI 执行层迁出：web-cli/ops/next-actions/web-fetch/help 全部迁入新包（lgdl-web-cli / lgdl-web-op-cli / web-cli-base）；测试 107 → 32；新增 §5.6 三层结构

---

## 1. 包定位：Web 工作台 SPA（private，不发布）

| 属性 | 值 |
|------|-----|
| **包名** | `@lgdl/lgdl-web`（packages/lgdl-web/，V2 由 `@lgdl/web` 更名，git mv 保留历史） |
| **版本** | 0.5.0（package.json:3） |
| **定位** | LGDL web workbench — edit .lgdl in the browser, live render（package.json:4） |
| **发布形态** | `private: true`（package.json:6）——不发布 npm，构建产物部署 GitHub Pages（根级 G1 关联） |
| **技术栈** | React 18.3 + Vite 5.4 + TypeScript + **CodeMirror 6**（package.json:24-34） |
| **运行时依赖** | **lgdl-web-cli + lgdl-web-op-cli + web-cli-base + lgdl-core + lgdl-layout + lgdl-render 六包**（V2：三工具自新源组装，不依赖 lgdl-cli——双 CLI 物理分离 ADR-004 的 Web 侧印证） |
| **AI 依赖** | openai ^7.5.0 / @anthropic-ai/sdk ^0.120.0 / react-markdown ^10.1.0 / remark-gfm ^4.0.1（package.json:15,23,26-27；SDK 直连已收敛——llm.ts 机制在 web-cli-base） |
| **测试** | locate / snap / provider / lgdl-web 四文件，**当日实测 32/32 通过**（V2 收敛：ops/web-cli/help/next-actions/web-fetch 迁出） |

**包内文件结构**（V2 变化：ai/ 目录从 8 文件收敛为 6 文件）：

| 文件 | 职责 | 规模 |
|------|------|------|
| `src/App.tsx` | 工作台主界面：编辑器 + 预览 + 编译管线 + AI 面板集成 + SVG/PNG 导出 + opRegistry 注入（V2：handleWebOp 16 分支 → OpHandlerRegistry 注册回调） | 1273 行 |
| `src/ai/AiPanel.tsx` | AI 助手面板：agent 循环、消息渲染（markdown / 命令块 / next-actions 胶囊）、预置提示词；V2 三工具分发（tc.name 判别 lgdl-web-cli / lgdl-web-op-cli / web-fetch） | 572 行 |
| `src/ai/provider.ts` | 多厂商接入层：8 厂商配置、API Key 管理（localStorage）、三工具组装（V2：WEB_CLI_TOOL 自 lgdl-web-cli / WEB_OP_TOOL 自 lgdl-web-op-cli / WEB_FETCH_TOOL 自 web-cli-base）、chat() 薄包装（V2：单列表 toolCalls） | 581 行 |
| `src/ai/lgdl-web.ts` | 接线组装（V2）：lgdlExecutor 自 lgdl-web-cli/lgdl、createExecutor 机制自 web-cli-base、fetch 行处理器（web-fetch 前缀） | 41 行 |
| `src/ai/prompts.ts` | system prompt（表达 vs 执行协议 + 读多写少 + UI 参与 + next-actions 推荐；V2 改述 web-fetch 中性名） | 67 行 |
| `src/ai/SettingsPanel.tsx` | API 设置面板（服务商 / Key / 模型 / Base URL / 最大轮数 / 测试连接） | 207 行 |
| `src/locate.ts` | data-lgdl-loc / issue location → 源码字符区间（编辑器跳转） | 202 行 |
| `src/snap.ts` / `examples.ts` | 示例滑轨吸附纯函数 / 11 个内置示例（单一数据源，examples/ 产物由脚本生成） | — |

> **V2 迁出面**（原 web/ai/ 下文件）：`web-cli.ts`（协议解析）→ lgdl-web-cli/protocol.ts；`ops.ts`（执行层）→ lgdl-web-cli/adapters/lgdl.ts（lgdlExecutor）；`help.ts`（webOpHelp/webFetchHelp）→ lgdl-web-op-cli/help.ts + web-cli-base/help.ts；`next-actions.ts` → lgdl-web-op-cli/next-actions.ts；`web-fetch.ts` → web-cli-base/web-fetch.ts（中性化改名 `web-fetch`）。

---

## 2. 编译管线：浏览器内 parseLgdl → layoutDocument → renderSvg

**与终端同一条管线**（render 文档 §1 已确认 cli render.ts:29,52 同样消费 `layoutDocument` + `renderSvg`）：

```
App.tsx:526  parseLgdl(source)            // core：解析 + error-only 校验
App.tsx:546  const layout = await layoutDocument(doc);   // layout 引擎（async 签名遗留，G6）
App.tsx:547  const svg = renderSvg(doc, layout);         // render：SVG 字符串
```

**关键机制**（App.tsx:520-580 `compile()`）：

| 机制 | 位置 | 说明 |
|------|------|------|
| **compileCache** | App.tsx:517-518, 559-563 | LRU 缓存（上限 50），按源码字符串键——防抖后相同源码复用渲染结果 |
| **300ms 防抖** | App.tsx:691-694 | 停止输入 300ms 后才重编译（`debouncedSource`） |
| **编译失败兜底** | App.tsx:565-579 | 引擎异常不崩页面：转 `内部错误: ...` 错误 issue（location: 'runtime'） |
| **lastGood 保留** | App.tsx:711-716, 1205-1227 | 语法错误时保留上次成功 SVG + 错误遮罩（可「知道了，继续查看」） |
| **compileIssues** | App.tsx:508-514 | **同步 parse-only**（不做 async layout）：供 CodeMirror lint 即时出红波浪线 |

**状态栏**（App.tsx:1144-1156）：错误数 / 节点·边数 / 画布尺寸 / 编译耗时。

---

## 3. 编辑器与诊断：CodeMirror 6

**编辑器装配**（App.tsx:637-672，EditorView 只创建一次，内容经 React state 回流）：

| 扩展 | 位置 | 职责 |
|------|------|------|
| `yaml()` + `lgdlHighlight` | App.tsx:646-647（定义 :25-29） | YAML 语法高亮 + LGDL 定制色（key 青、注释灰、非法红波浪） |
| `lgdlValueHighlight` | App.tsx:648（定义 :49-85） | 语义值着色：enum（type/kind 关键字）、数字、布尔、普通值——@lezer/yaml 把值全标 Literal，此 StateField 按内容重着色 |
| **`lgdlLinter`** | App.tsx:649（定义 :88-104） | **同步 parseLgdl 拿诊断**：`compileIssues(text)` → 每条 issue `locateIssue` 转字符区间 → 红波浪线（severity 全部 error——ADR-005 error-only 的 UI 呈现） |
| `lgdlAutocomplete` | App.tsx:650（定义 :138-232） | 补全：type/kind 枚举、from/to/contains 的节点 id 引用（`collectNodeIds` :127-135）、字段名（nodes/edges 上下文） |

**诊断跳转闭环**：issue 列表（App.tsx:1245-1258）点击 → `jumpToIssue(issue.location)` → `locateIssue` → 编辑器选中 + 滚动居中（App.tsx:927-937）。

---

## 4. data-lgdl-loc 点击定位 + R-D2 归因定论（承接批次 2b）

### 4.1 正常链路（节点/边）

```
点击预览 SVG 元素 → handleClick: closest('[data-lgdl-loc]')        App.tsx:470-474
  → onLocate(loc) → jumpToIssue → locateIssue(源码, loc)           App.tsx:927-937
  → locate.ts 解析 loc → DocSpan → 编辑器 selection + scrollIntoView
```

**renderer 发射面**（render 文档 §5 已列）：节点 `nodes[i]`（render/index.ts:652）、边 `edges[i]`（:753,:925）、uml-class 成员 `nodes[i].members[j]`（:984,:997）、**分组盒/泳道 `groups[i]`**（:549 泳道 / :585 分组盒 / :1064 甘特泳道，本批已逐行实读确认）。

**locate.ts 解析逻辑**（实读确认）：
- 格式正则（locate.ts:51）：`^(\w+)(?:\[(\d+)\])?(?:\.(\w+)(?:\[(\d+)\])?)?$`，深路径截尾到最近支持前缀（:53-60）
- **节查找只认顶层**（locate.ts:67-79）：`indent === 0` 且 `^\w+:` 且 `startsWith(section + ':')` —— `groups[0]` 会去源码找**顶层 `groups:` 行**
- 列表项按节自身缩进计数（:98-108），嵌套（members）不计入

### 4.2 R-D2 完整归因（本批实验定论）

**结论：Web 工作台点击分组盒/泳道无法定位到源码，且 AI 助手 preview-click 分组盒时「假成功」——跨包断裂确认。**

**归因链条**（5 环，环环实证）：

| # | 环节 | 证据 |
|---|------|------|
| 1 | renderer 发射 `data-lgdl-loc="groups[i]"`（分组盒/泳道/甘特泳道） | render/src/index.ts:549, :585, :1064（本批 grep + 实读确认）；svg.test.ts:190 专门断言 `data-lgdl-loc="groups[0]"` |
| 2 | Web 点击 → locateIssue('groups[i]') | App.tsx:470-474 → :927-937 → locate.ts:27 |
| 3 | locate.ts 按**顶层 `groups:` 节**查找 | locate.ts:67-79（只匹配 indent===0 的顶层键） |
| 4 | **现代文档（group-as-node）没有顶层 `groups:`**：parser 拒绝旧语法 + serializer 把 group 输出为 `kind: group` 节点 | parser.ts:28 `DOC_FIELDS = ['title','type','nodes','edges','meta']`（无 groups）；parser.ts:53-55 注释「legacy syntax is rejected loudly」；:67-75 unknown field 检查报 `Unknown document field "groups"`；serialize.ts:49-59 group 在 nodes: 块内输出 `kind: group` + `contains:` |
| 5 | 结果：locateIssue('groups[0]') 找不到 `groups:` 顶层行 → `sectionLine === -1` → 返回 **null** | locate.ts:79；本批实验实证（见下） |

**当日实测验证**（node 脚本直调 dist-test 产物 + core）：

```
现代文档（kind: group）parseLgdl valid: true
  locateIssue('groups[0]')              → null          ← 断裂
  locateIssue('nodes[2]')(g1 节点)       → {from:82,to:92} ← 可定位（修复方向佐证）
serializeLgdl 输出：含顶层 "groups:"？ false；含 "kind: group"？ true
旧语法文档（locate.test.ts fixture 形态）parseLgdl valid: false
  （Unknown document field "groups"；Edge references unknown target...）
  但 locateIssue('groups[0]') 在该文档上可定位 → 测试路径是死路径
```

**locate.test.ts fixture 现状**（locate.test.ts:24-26, 82-91）：SRC 常量仍含旧版 `groups:` 顶层节（`:24 groups:` / `:25 - id: g1` / `:26 contains: [user, order]`），`groups[0]` / `groups[0].contains[1]` 断言通过（:82-91）——**函数逻辑正确，但该文档形态在现代 parser 下根本不可解析**（parseLgdl 报 error），Web 工作台永远不会产生这种源码（11 个内置示例全为 `kind: group` 现代语法，examples.ts:18 等）。**测试覆盖的是死路径，未暴露 groups loc 断裂**。

**影响面**（Web 哪些交互受影响）：

| 交互 | 路径 | 影响 |
|------|------|------|
| 用户点击预览中**分组盒**（flowchart/arch/mindmap 等） | App.tsx:470-474 → locateIssue | ❌ 静默失败：无跳转、无提示 |
| 用户点击**泳道**（datastream / gantt 泳道） | 同上 | ❌ 同上 |
| **AI 助手 `preview-click --loc groups[0]`** | App.tsx:1003-1008 → jumpToIssue | ❌ **假成功**：jumpToIssue 内 span=null 静默返回（App.tsx:931），但 handleWebOp 仍返回「✓ 已定位到 groups[0]（编辑器已跳转）」——AI 收到成功反馈、编辑器实际未动，AI 后续据此断言「已跳转」会误导用户 |
| AI 助手 `preview-hover --loc groups[0]` | App.tsx:1009-1022 | ✅ 正常：querySelector(`[data-lgdl-loc="groups[0]"]`) 按属性命中 SVG 元素（renderer 发射的就是该属性），仅高亮不涉及 locate.ts |
| 节点/边/uml-class 成员点击定位 | `nodes[i]` / `edges[i]` / `nodes[i].members[j]` | ✅ 正常（现代文档 nodes: 节存在） |

**修复方向建议**（仅记录，未修改）：① render 分组盒/泳道 loc 改发射 `nodes[i]`（group 已是节点，renderer 有 groupIdx→node 索引映射的改动量最小）；② 或 locate.ts 增加「在 nodes: 节内解析 `kind: group` 节点」的支持；③ 同步更新 locate.test.ts fixture 为现代语法并补 `groups[i]` 断裂回归测试。

---

## 5. AI 助手核心

### 5.1 多厂商接入与 API Key 管理（provider.ts）

**8 个厂商**（provider.ts:41-50 `PROVIDERS`）：

| id | 厂商 | baseURL | 默认模型 | browserDirect |
|----|------|---------|---------|:--:|
| deepseek | DeepSeek | api.deepseek.com | deepseek-v4-flash | ✅ |
| qwen | Qwen 通义千问 | dashscope compatible-mode/v1 | qwen-plus | ✅ |
| volc | 火山方舟 · 通用 | ark v3 | doubao-seed-1-6-250615 | ❌ |
| volc-coding | 火山方舟 · Coding | ark coding/v3 | deepseek-v4-flash | ❌ |
| volc-plan | 火山方舟 · Agent Plan | ark plan/v3 | ark-code-latest | ❌ |
| tencent | 腾讯混元 | hunyuan v1 | hunyuan-turbo | ✅ |
| openai | OpenAI GPT | api.openai.com | gpt-4o-mini | ✅ |
| claude | Claude | null（原生 SDK） | claude-3-5-haiku-latest | ✅ |

- **browserDirect=false 拦截**（AiPanel.tsx:350-358 + SettingsPanel.tsx:106-111）：火山三端点 CORS 预检不允许认证头，浏览器直连被拦——选择即提示「换用可直连服务商；本地代理 lgdl serve 在 v0.6 提供」（provider.ts:34-37 头注释记录已实测的预检行为）
- **Key 存储**：localStorage `lgdl-ai-settings`（provider.ts:62），**系统不内置任何 key**（:4 注释），per-provider 独立保存、切换互不覆盖（:74-86, 106-122 测试），旧单对象格式自动迁移（:99-111）
- **连接测试**：`testConnection`（provider.ts:371-386）发最小请求验证 key/端点/CORS；错误归类 `classifyError`（:550-580：401/403 key 无效、404 火山端点提示换套餐、Connection error 提示 CORS/代理）

### 5.2 原生 function calling 三工具（V2 后自新源组装）

**V2 变化**：三个工具的**定义**迁出 web 包——WEB_CLI_TOOL 在 `@lgdl/lgdl-web-cli`（tools.ts，20 子命令逐字节保留）、WEB_OP_TOOL 在 `@lgdl/lgdl-web-op-cli`（tool.ts，OP_SUBCOMMANDS 动态生成 16 项）、WEB_FETCH_TOOL 在 `@lgdl/web-cli-base`（tools.ts，**中性化改名 `web-fetch`**）。lgdl-web 的 provider.ts 只做**组装**（import 三源 → chat() tools 参数）。

| 工具 | V2 定义源 | 子命令 enum | 定位 |
|------|------|------|------|
| **lgdl-web-cli** | @lgdl/lgdl-web-cli tools.ts | 20 个：status/validate/init/convert + add/remove/update × node/edge/group + doc-info/get-node/get-edge/find-node/list-node-kinds/list-diagram-types/help | 图内容操作（改文档） |
| **lgdl-web-op-cli** | @lgdl/lgdl-web-op-cli tool.ts | 16 个（OP_SUBCOMMANDS 派生）：copy-source/toggle-editor/collapse-editor/expand-editor/export-svg/export-png/preview-zoom/preview-pan/preview-reset/preview-click/preview-hover/switch-example/list-examples/list-diagram-types/next-actions/help | UI 操作（与手动点击等效，**无 apply-source——绝不写源码**） |
| **web-fetch** | @lgdl/web-cli-base tools.ts（V2 中性化改名） | 独立基础工具（非 CLI 子命令），--path 必填 | 同源/URL 原始文本获取 |

- OpenAI 兼容端点经 `chat.completions.create` + `tools:`（provider.ts:481-506），Claude 经 Anthropic `messages.create` + `tools:` input_schema（:398-453）
- 工具参数 `{ subcommand, args }` 平面化（--key value），`parseToolArguments`（:530-547）容错解析（非法 JSON 降级为空对象，执行层报缺参）

### 5.3 agent 循环（AiPanel.tsx chat()）

**入口**：send()（AiPanel.tsx:332-482），按轮递归 `step(round)`：

| 机制 | 位置 | 说明 |
|------|------|------|
| **MAX_ROUNDS** | AiPanel.tsx:362（`settings.maxRounds ?? 1000`）；默认常量 provider.ts:89 `DEFAULT_MAX_ROUNDS = 1000` | 防死循环；到顶自动停止（:373-376）；设置面板可调（SettingsPanel.tsx:167-179） |
| **使用指南自动加载** | AiPanel.tsx:286-299, 380-384 | 会话开始 fetch `lgdl/web/workbench/README-CLI.md` 附到 system（缓存幂等；失败不阻塞）——战略层知识，AI 无需再 fetch |
| **三通道统一执行** | AiPanel.tsx:394 `[...res.toolCalls, ...res.opCalls, ...res.fetchCalls]` | 一个 assistant 消息携带全部 toolCalls，tool 结果紧跟回传（:401-406, :443-445） |
| **失败反馈修正** | AiPanel.tsx:441-446 | 任一命令失败 → 追加 user 消息「上一条命令执行失败，请查看错误并修正命令后重试」（:450）→ 下一轮重试 |
| **LLM 调用失败重试一次** | AiPanel.tsx:464-476 | failCount ≥1 即停（网络/API 错误归类后展示）；错误信息也回喂 AI 修正（:474） |
| **工具分发** | AiPanel.tsx:413-442 | op-cli → onWebOp（App 执行）；fetch → executeWebFetch；web-cli → executeSubcommand |
| **写回编辑器** | AiPanel.tsx:436-438 | `exec.changed` → `onApply(exec.source)` → App applyAiSource（App.tsx:907-911：setSource + clear cache）→ 编译管线重跑 |

### 5.4 执行层：lgdl-web-cli 增量门禁链（ADR-006/008 技术兜底，V2 落点）

**AI 无法绕过校验**——结构化执行链（V2：lgdl-web-cli/adapters/lgdl.ts 组装 lgdlExecutor，机制骨架 web-cli-base/exec.ts）：

```
buildOperation(subcommand, args, docType)   lgdl-web-cli/commands.ts   （lgdl-web-cli 注册表构造 op）
applyOperation(doc, op)                     web-cli-base 泛型工厂 + lgdl-core mutations（V2 泛型化回留 base）
validate(r.document)                        web-cli-base/exec.ts:294   ★ 门禁：不通过整体拒绝（:294-299）
serializeLgdl(r.document)                   lgdl-core                  （源码永远由序列化器写出）
→ onApply 写回编辑器 → compile              AiPanel.tsx:436-438
```

- **只读命令**（读多写少）：status/validate/doc-info/get-node/get-edge/find-node/list-* 走 lgdl-core/queries.ts 单一实现（lgdl-web-cli 透传），与终端 lgdl-cli 共享
- **文本双入口**：`executeCommands` 逐行解析 `lgdl-web-cli <sub> --doc <id> ...`（lgdl-web-cli/exec.test.ts 22 例随迁），失败即停、`--doc` 与当前文档一致性校验
- **web-fetch**（V2 改名）：`executeWebFetch` 在 web-cli-base/web-fetch.ts——--path 必填（缺失即报错），不改文档（changed 恒 false）
- **help 自文档**：function calling 入口 `subcommand==='help'` 走 webCliHelp（lgdl-web-cli/help.ts）；文本入口 `--help` 优先级最高（clig.dev 约定）

### 5.5 next-actions 推荐 + markdown 渲染（V2 后 next-actions 迁 lgdl-web-op-cli）

- **next-actions**（AI 完成任务后推荐下一步）：op-cli `next-actions --actions '[{"label","prompt"}]'` → AiPanel 解析 → `parseNextActions`（**lgdl-web-op-cli/next-actions.ts** 容错过滤）→ `NextActionsCard` 胶囊 → 点击即把 prompt 作为用户指令发送——**「AI 推荐 → 用户点选 → AI 执行」闭环**；无合理下一步时 AI 不调用（prompts.ts:67）
- **markdown 渲染**：`ReactMarkdown` + `remarkGfm`（AiPanel.tsx:175-211）：GFM 表格/链接/行内代码；**协议层先行拆分**——chat（markdown 全渲染）与 web-cli（命令块）由消息 type 区分，不靠 markdown 解析猜执行（ADR-007 的 UI 侧呈现）；web-cli 命令块纯展示、**不执行**（执行已由 agent 循环完成）
- **预置提示词**：18 个快捷胶囊（AiPanel.tsx:38-147：语法修复/自动优化/简化/各图类型创作/追加节点/整理分组/转换类型…），点击即发送

### 5.6 V2 三层结构：lgdl-web-cli / lgdl-web-op-cli / web-cli-base（本批补充）

> V2（commit d03dca4）把 web AI 执行体系从「web 包内嵌」重构为「框架层 + 适配层」两层，web 包只剩接线。三层职责与证据：

| 层 | 包 | 职责 | 关键文件（代码证据） |
|----|-----|------|---------------------|
| **框架层** | `@lgdl/web-cli-base` | 纯机制：DomainApi<Op,Doc> 泛型契约、createExecutor 管线、createOperationApplier 泛型工厂、createBatchParser 骨架、chat/parseToolArguments/classifyError、web-fetch 通用工具 | exec.ts（DomainApi + ExecutorOptions 注入参数）、operations.ts（泛型工厂）、tools.ts（WEB_FETCH_TOOL 中性名 web-fetch）、web-fetch.ts |
| **适配层·图内容** | `@lgdl/lgdl-web-cli` | 9 命令注册表（COMMANDS）、LgdlOperation 协议 + lgdlDispatch、WEB_CLI_TOOL（20 子命令）、lgdl-web-cli 协议解析、webCliHelp、lgdlDomain/lgdlExecutor 组装单点 | commands.ts、operations.ts、protocol.ts、tools.ts、help.ts、adapters/lgdl.ts |
| **适配层·UI 操作** | `@lgdl/lgdl-web-op-cli` | OP_COMMANDS 单一数据源（16 条）→ OP_SUBCOMMANDS → WEB_OP_TOOL 动态生成、webOpHelp、next-actions、**OpHandlerRegistry 注入面**（register/has/execute） | ops.ts、tool.ts、help.ts、next-actions.ts、handlers.ts |
| **消费接线** | `@lgdl/lgdl-web` | AiPanel 三工具分发（tc.name 判别）、provider.ts 三源组装、App.tsx opRegistry 注册 16 个 React handler 回调（V2：handleWebOp 分支逐行复制为注册回调） | AiPanel.tsx:5,154,394,430、provider.ts:17-20、App.tsx opRegistry |

**执行管线迁移**（V2 关键动作）：web/ai/ops.ts 的执行链（executeSubcommand 全量）随 `adapters/lgdl.ts` 迁入 lgdl-web-cli；机制骨架（createExecutor/validate 门禁）留 web-cli-base 泛型化；web 侧经 `@lgdl/lgdl-web-cli/lgdl` 子路径消费 lgdlExecutor（AiPanel.tsx:5）。**handler 注入面**：lgdl-web-op-cli 定义 `OpHandlerRegistry`（纯协议，零 React/DOM），web App.tsx 用 useMemo 注册 16 个回调（依赖 source/downloadSvg/downloadPng/jumpToIssue/selectExample/applyAiSource），AiPanel 经 onWebOp 转发 registry.execute——「包定义协议、web 注入实现」的职责分离。

**依赖方向**：web-cli-base 零 @lgdl/*（deps 仅 openai/anthropic，FR-018 验收）；lgdl-web-cli → base + lgdl-core；lgdl-web-op-cli → base（仅类型，NFR-004 零 React/DOM grep 通过）；cli 9 mutation 命令 → lgdl-web-cli（R2/EC-002 核验点）。

---

## 6. 测试基线：32 个测试（V2 收敛，当日实测复验）

**V1 基线**：`cd packages/web && npm test` → 107/107（locate 10 + snap 8 + ops 27 + provider 20 + web-cli 30 + next-actions 4 + help 8）。

**V2 实测**：`cd packages/lgdl-web && npm test` → **32/32 通过（fail 0）**。迁出分布（守恒口径 388 重算）：

| 测试面 | V1 位置 | V2 落点 | 数量 |
|--------|--------|--------|:--:|
| ops.test（executeSubcommand/executeCommands 双入口、失败即停、doc 一致性） | web/ai/ops.test.ts | → **lgdl-web-cli/exec.test.ts** | 22 |
| web-cli.test（协议解析） | web/ai/web-cli.test.ts | → **lgdl-web-cli/protocol.test.ts**（26 例）+ web-cli-base（tokenizeCli 1 例） | 27 |
| provider.test（WEB_OP_TOOL schema） | web/ai/provider.test.ts | → **lgdl-web-op-cli/tool.test.ts** | 1 |
| provider.test（WEB_FETCH_TOOL） | web/ai/provider.test.ts | → **web-cli-base**（改名 web-fetch） | 1 |
| ai/help.test（webOpHelp） | web/ai/help.test.ts | → **lgdl-web-op-cli/ops.test.ts** | 3 |
| ai/help.test（webFetchHelp） | web/ai/help.test.ts | → **web-cli-base/help.test** | 1 |
| next-actions.test | web/ai/next-actions.test.ts | → **lgdl-web-op-cli/next-actions.test.ts** | 4 |
| web-fetch.test（前缀断言改名） | web/ai/web-fetch.test.ts | → **web-cli-base/web-fetch.test.ts** | 6 |
| locate + snap（零改动） | web/ | 留 lgdl-web | 18 |
| lgdl-web.test（fetch 行路由，前缀改名） | web/ai/lgdl-web.test.ts | 留 lgdl-web | 2 |
| **lgdl-web 实测合计** | — | locate 10 + snap 8 + provider 12 + lgdl-web 2 | **32** |

> 守恒验证：lgdl-web-cli 76 + lgdl-web-op-cli 11 + web-cli-base 14 + lgdl-web 32 + lgdl-core 258 + lgdl-router 8 + lgdl-render 21 = **420 例全绿（≥388 ✓）**，与 commit d03dca4 记载一致。

---

## 7. 与 ADR-006/007/008 的呼应（代码侧印证）

| ADR | 决策 | 代码印证 |
|-----|------|---------|
| **ADR-006**（AI 不写源码，只走增量命令） | AI 对图的一切修改只能通过 lgdl-web-cli 增量命令，绝不直接写 LGDL 源码文本；产物必须过 validate 门禁 | prompts.ts:57「**不存在 apply-source 命令——绝不直接写 LGDL 源码**」+ prompts.ts:19-21（不写源码/命令块）；op-cli 工具描述明示「no apply-source」；web-cli-base/exec.ts:294-299 validate 门禁 + serializeLgdl 回写（V2 落点） |
| **ADR-007**（markdown 协议块升级为原生 function calling） | chat 文本（表达）与工具调用（执行）由 API 字段区分；tool 结果回传、失败反馈修正、轮数上限可调 | provider.ts:481-506（OpenAI tool_calls）/ :398-453（Claude tool_use）；AiPanel.tsx:396 单列表 toolCalls 统一执行（V2：ChatResult 单列表）、:452 失败修正、:363 MAX_ROUNDS |
| **ADR-008**（增量编辑协议，AI 永不整图重写） | LgdlOperation 9 种为唯一增量协议；applyOperation 单一实现；源码由序列化器写出 | lgdl-web-cli/adapters/lgdl.ts（buildOperation → applyOperation → validate → serializeLgdl，V2 落点）；lgdl-web-cli/protocol.ts（协议解析器只供 web）；exec.test.ts 22 例随迁（op 结构化断言） |

---

## 8. 漂移与缺口（本批记录，未修改任何文件）

**承接核实（批次 2b 遗留，本批定论）**：

| # | 结论 |
|---|------|
| **R-D2** | **跨包断裂确认（完整归因见 §4.2）**：renderer 发射 `groups[i]`（render/index.ts:549,585,1064）→ web locate.ts 按顶层 `groups:` 节解析（locate.ts:67-79）→ group-as-node 文档无该节（parser.ts:28,53-55 拒绝旧语法；serialize.ts:49-59 输出 `kind: group` 节点）→ locateIssue 返回 null。**影响**：点击分组盒/泳道静默失败；**AI `preview-click --loc groups[i]` 假成功**（App.tsx:1003-1008 返回「✓ 已定位」但 jumpToIssue 实际未跳）。locate.test.ts:24-26 fixture 为旧语法死路径，未覆盖此断裂。实验实证：现代文档 `groups[0]`→null、`nodes[2]`→可定位（修复方向：render 改发射 nodes[i] 或 locate 支持 group 节点） |
| **R-D4** | **PNG 归因确认**：render/package.json:4 description「LGDL SVG/PNG renderer」中 PNG 确实由 **web 层导出**——App.tsx:874-897 `downloadPng`（SVG → Blob URL → Image → canvas 2× 白底 → `toDataURL('image/png')` → 下载 `${exampleId}.png`）；op-cli `export-png` / `export --format png`（App.tsx:965-967, :971-974）走同一函数。render 包自身只产 SVG/ASCII 字符串。**description 描述不精确（低优先级漂移），确认批次 2b 记录** |

**本批新发现**：

| # | 位置 | 说明 |
|---|------|------|
| **W-D1** | provider.ts:504 vs :405-421 | **web-fetch 对 OpenAI 兼容端点不可达**（V2 沿革，NG-005 明确不修复）：OpenAI 兼容路径 `tools: [WEB_CLI_TOOL, WEB_OP_TOOL]`（:504）**未注册 WEB_FETCH_TOOL**，而响应 filter（:508-515）却允许该名字——模型不会被允许调用它；Claude 路径注册了三个工具（:405-421）。→ web-fetch 实际**仅 Claude 可用**；deepseek/qwen/volc/tencent/openai 五个厂商的 AI 无法 fetch。provider.test.ts:245-250 只断言工具定义本身，未覆盖此注册差异。疑为 v0.5 演进（fetch-doc → 独立工具）时 OpenAI 路径漏注册（V2 保留现场） |
| **W-D2** | App.tsx:117-120, :166 | **补全词典旧语法残留**：`TOP_KEYS` 仍含 `'groups'`（:117）、`NODE_FIELDS` 含 `'group'` 节点字段（:118）、`GROUP_FIELDS`（:120）与 section 检测支持 `groups:`（:166）——均为 group-as-node 前的旧概念。core 侧实际字段集：DOC_FIELDS = title/type/nodes/edges/meta（parser.ts:28）、NODE_FIELDS = id/label/kind/members/attrs/contains（parser.ts:26）。→ 用户在 Web 编辑器补全出 `groups:` 或 `group:` 会命中 parser 的 Unknown field 错误（error-only，ADR-005 无静默降级，错误可见但体验差）。轻微 UI 残留，与 ADR-002 语义不一致 |
| **W-D3** | App.tsx:1003-1008 | **preview-click 假成功反馈**（R-D2 的直接放大器）：`jumpToIssue(loc)` 无返回值，locate 失败（null）时 handleWebOp 仍返回「✓ 已定位到 …（编辑器已跳转）」——即使修复 R-D2 的 groups 路径，其他不可定位 loc（如越界索引 `nodes[99]`）也会假成功。建议 jumpToIssue 返回 boolean 并让 handleWebOp 区分反馈 |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（批次 2c：web AI 助手深潜 · @lgdl/web；R-D2 归因定论 + R-D4 核实；核心引擎域收官） | 2026-08-30 | sddu-docs Agent |
| v2.0 | V2 更新：包名 @lgdl/lgdl-web（目录 packages/lgdl-web）；执行层迁出落点（lgdl-web-cli/adapters/lgdl.ts + web-cli-base/exec.ts:294 门禁）；三工具自新源组装 + web-fetch 中性化；新增 §5.6 三层结构（lgdl-web-cli / lgdl-web-op-cli / web-cli-base + handler 注入面）；测试基线 107 → 32（守恒 420 全绿） | 2026-09-01 | sddu-docs Agent |
