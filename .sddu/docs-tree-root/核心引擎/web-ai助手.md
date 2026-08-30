# 核心引擎 — web AI 助手深潜

> **文档定位**: sddu-docs-deepdive-web — @lgdl/web 包深潜：Web 工作台 SPA、浏览器内编译管线、CodeMirror 6 编辑器与诊断、data-lgdl-loc 点击定位（R-D2 归因定论）、AI 助手（多厂商接入 / 原生 function calling 三工具 / agent 循环 / 增量执行门禁）
> **输出文件名**: web-ai助手.md
> **数据来源**: 代码扫描生成（实读 `packages/web/src/` 全部源码：App.tsx 1273 行 + ai/ 8 文件 + locate/snap/examples + core serialize.ts/parser.ts/status.ts 交叉核实，当日实测测试 107/107 通过）
> **创建人**: sddu-docs Agent
> **创建时间**: 2026-08-30
> **版本**: v1.0（feature/group-as-node @ `15e5b6b`）
> **更新说明**: 初始创建（批次 2c web AI 助手深潜；承接批次 2b R-D2 归因定论 + R-D4 核实；核心引擎域收官）

---

## 1. 包定位：Web 工作台 SPA（private，不发布）

| 属性 | 值 |
|------|-----|
| **包名** | `@lgdl/web`（packages/web/） |
| **版本** | 0.5.0（package.json:3） |
| **定位** | LGDL web workbench — edit .lgdl in the browser, live render（package.json:4） |
| **发布形态** | `private: true`（package.json:6）——不发布 npm，构建产物部署 GitHub Pages（根级 G1 关联） |
| **技术栈** | React 18.3 + Vite 5.4 + TypeScript + **CodeMirror 6**（package.json:24-34） |
| **运行时依赖** | **core + layout + render 三包**（package.json:19-21）——**不依赖 cli**（依赖清单无 @lgdl/cli，双 CLI 物理分离 ADR-004 的 Web 侧印证） |
| **AI 依赖** | openai ^7.5.0 / @anthropic-ai/sdk ^0.120.0 / react-markdown ^10.1.0 / remark-gfm ^4.0.1（package.json:15,23,26-27） |
| **测试** | locate / snap / ops / provider / web-cli / next-actions / help 七文件，**当日实测 107/107 通过（1404ms）** |

**包内文件结构**：

| 文件 | 职责 | 规模 |
|------|------|------|
| `src/App.tsx` | 工作台主界面：编辑器 + 预览 + 编译管线 + AI 面板集成 + SVG/PNG 导出 + lgdl-web-op-cli 执行器 | 1273 行 |
| `src/ai/AiPanel.tsx` | AI 助手面板：agent 循环、消息渲染（markdown / 命令块 / next-actions 胶囊）、预置提示词 | 572 行 |
| `src/ai/provider.ts` | 多厂商接入层：8 厂商配置、API Key 管理（localStorage）、三工具 function 定义、chat() 双 SDK 适配、错误归类 | 581 行 |
| `src/ai/ops.ts` | lgdl-web-cli 执行器：结构化（function calling）与文本解析双入口、executeWebFetch、增量命令门禁链 | 376 行 |
| `src/ai/web-cli.ts` | lgdl-web-cli 协议解析器（文本形态，--doc 必填，与终端 lgdl-cli 完全分离） | 327 行 |
| `src/ai/help.ts` | --help 自文档（增量命令参数规格复用 core COMMANDS 注册表，单一数据源） | 322 行 |
| `src/ai/prompts.ts` | system prompt（表达 vs 执行协议 + 读多写少 + UI 参与 + next-actions 推荐） | 67 行 |
| `src/ai/SettingsPanel.tsx` | API 设置面板（服务商 / Key / 模型 / Base URL / 最大轮数 / 测试连接） | 207 行 |
| `src/ai/next-actions.ts` | next-actions 推荐解析（label + prompt 胶囊） | 35 行 |
| `src/locate.ts` | data-lgdl-loc / issue location → 源码字符区间（编辑器跳转） | 202 行 |
| `src/snap.ts` / `examples.ts` | 示例滑轨吸附纯函数 / 11 个内置示例（单一数据源，examples/ 产物由脚本生成） | — |

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

### 5.2 原生 function calling 三工具（tools 定义）

| 工具 | 定义 | 子命令 enum（provider.ts 行号） | 定位 |
|------|------|------|------|
| **lgdl-web-cli** | provider.ts:282-324 | 20 个：status/validate/init/convert + add/remove/update × node/edge/group + doc-info/get-node/get-edge/find-node/list-node-kinds/list-diagram-types/help | 图内容操作（改文档） |
| **lgdl-web-op-cli** | provider.ts:232-281 | 16 个：copy-source/toggle-editor/collapse-editor/expand-editor/export-svg/export-png/preview-zoom/preview-pan/preview-reset/preview-click/preview-hover/switch-example/list-examples/list-diagram-types/next-actions/help | UI 操作（与手动点击等效，**无 apply-source——绝不写源码**，:252 描述明示） |
| **lgdl-web-fetch** | provider.ts:330-358 | 独立基础工具（非 CLI 子命令），--path 必填 | 同源/URL 原始文本获取 |

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

### 5.4 执行层：ops.ts 增量门禁链（ADR-006/008 技术兜底）

**AI 无法绕过校验**——结构化执行链（ops.ts:80-253 `executeSubcommand`）：

```
buildOperation(subcommand, args, docType)   ops.ts:217   （core 命令注册表构造 op）
applyOperation(doc, op)                     ops.ts:229   （core 单一实现）
validate(r.document)                        ops.ts:239   ★ 门禁：不通过整体拒绝（:240-248）
serializeLgdl(r.document)                   ops.ts:249   （源码永远由序列化器写出）
→ onApply 写回编辑器 → compile              AiPanel.tsx:436-438
```

- **只读命令**（读多写少）：status/validate/doc-info/get-node/get-edge/find-node/list-* 走 core/queries.ts 单一实现（ops.ts:97-171），与终端 lgdl-cli 共享
- **文本双入口**：`executeCommands`（ops.ts:260-331）逐行解析 `lgdl-web-cli <sub> --doc <id> ...`，失败即停、`--doc` 与当前文档一致性校验（:309-317）
- **executeWebFetch**（ops.ts:52-71）：--path 必填（缺失即报错，:55），不改文档（changed 恒 false）
- **help 自文档**：function calling 入口 `subcommand==='help'` 走 webCliHelp（ops.ts:92-95）；文本入口 `--help` 优先级最高（web-cli.ts:58-66，clig.dev 约定）

### 5.5 next-actions 推荐 + markdown 渲染

- **next-actions**（AI 完成任务后推荐下一步）：op-cli `next-actions --actions '[{"label","prompt"}]'`（provider.ts:248-249 描述）→ AiPanel.tsx:414-423 解析 → `parseNextActions`（next-actions.ts:20-35 容错过滤）→ `NextActionsCard` 胶囊（AiPanel.tsx:213-243）→ 点击即把 prompt 作为用户指令发送——**「AI 推荐 → 用户点选 → AI 执行」闭环**；无合理下一步时 AI 不调用（prompts.ts:67）
- **markdown 渲染**：`ReactMarkdown` + `remarkGfm`（AiPanel.tsx:175-211）：GFM 表格/链接/行内代码；**协议层先行拆分**——chat（markdown 全渲染）与 web-cli（命令块）由消息 type 区分，不靠 markdown 解析猜执行（ADR-007 的 UI 侧呈现）；web-cli 命令块纯展示、**不执行**（执行已由 agent 循环完成，:516-519）
- **预置提示词**：18 个快捷胶囊（AiPanel.tsx:38-147：语法修复/自动优化/简化/各图类型创作/追加节点/整理分组/转换类型…），点击即发送

---

## 6. 测试基线：107 个测试（当日实测复验）

**当日实测**：`cd packages/web && npm test` → **107/107 通过（fail 0，1404ms）**。

| 文件 | 测试数 | 覆盖 |
|------|:--:|------|
| locate.test.ts | 10 | loc 解析（type/nodes/edges/groups/成员/深路径/line N/容错）——**groups 用例基于旧语法 fixture（R-D2 死路径，见 §4.2）** |
| snap.test.ts | 8 | 示例滑轨吸附纯函数（首/尾/中间/无跳过/钳制） |
| ops.test.ts | 27 | executeSubcommand/executeCommands 双入口、只读/增量/help/fetch、失败即停、doc 一致性 |
| provider.test.ts | 20 | 8 厂商配置、per-provider Key 隔离、localStorage 迁移/容错、classifyError、三工具 schema |
| web-cli.test.ts | 30 | 协议解析（op/status/query/help/fetch、--doc 必填、批处理失败即停、formatStatus） |
| next-actions.test.ts | 4 | actions JSON 解析容错 |
| help.test.ts | 8 | 三 CLI --help 自文档输出 |

> 测试编译脚本（package.json:11）：`tsc` 直编 + `node --test`，无测试框架依赖。

---

## 7. 与 ADR-006/007/008 的呼应（代码侧印证）

| ADR | 决策 | 代码印证 |
|-----|------|---------|
| **ADR-006**（AI 不写源码，只走增量命令） | AI 对图的一切修改只能通过 lgdl-web-cli 增量命令，绝不直接写 LGDL 源码文本；产物必须过 validate 门禁 | prompts.ts:57「**不存在 apply-source 命令——绝不直接写 LGDL 源码**」+ prompts.ts:19-21（不写源码/命令块）；op-cli 工具描述 :252 明示「no apply-source」；ops.ts:239-248 validate 门禁 + serializeLgdl 回写 |
| **ADR-007**（markdown 协议块升级为原生 function calling） | chat 文本（表达）与工具调用（执行）由 API 字段区分；tool 结果回传、失败反馈修正、轮数上限可调 | provider.ts:481-506（OpenAI tool_calls）/ :398-453（Claude tool_use）；AiPanel.tsx:394 三通道统一执行、:445 tool 角色回传、:441-446 失败修正、:362 MAX_ROUNDS |
| **ADR-008**（增量编辑协议，AI 永不整图重写） | LgdlOperation 9 种为唯一增量协议；applyOperation 单一实现；源码由序列化器写出 | ops.ts:217-249（buildOperation → applyOperation → validate → serializeLgdl）；web-cli.ts:1-20（协议解析器只供 web，与 lgdl-cli 共享 core 命令注册表）；web-cli.test.ts:17-27（op 结构化断言） |

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
| **W-D1** | provider.ts:504 vs :405-421 | **lgdl-web-fetch 对 OpenAI 兼容端点不可达**：OpenAI 兼容路径 `tools: [WEB_CLI_TOOL, WEB_OP_TOOL]`（:504）**未注册 WEB_FETCH_TOOL**，而响应 filter（:508-515）却允许该名字——模型不会被允许调用它；Claude 路径注册了三个工具（:405-421）。→ lgdl-web-fetch 实际**仅 Claude 可用**；deepseek/qwen/volc/tencent/openai 五个厂商的 AI 无法 fetch。provider.test.ts:245-250 只断言工具定义本身，未覆盖此注册差异。疑为 v0.5 演进（fetch-doc → 独立工具）时 OpenAI 路径漏注册 |
| **W-D2** | App.tsx:117-120, :166 | **补全词典旧语法残留**：`TOP_KEYS` 仍含 `'groups'`（:117）、`NODE_FIELDS` 含 `'group'` 节点字段（:118）、`GROUP_FIELDS`（:120）与 section 检测支持 `groups:`（:166）——均为 group-as-node 前的旧概念。core 侧实际字段集：DOC_FIELDS = title/type/nodes/edges/meta（parser.ts:28）、NODE_FIELDS = id/label/kind/members/attrs/contains（parser.ts:26）。→ 用户在 Web 编辑器补全出 `groups:` 或 `group:` 会命中 parser 的 Unknown field 错误（error-only，ADR-005 无静默降级，错误可见但体验差）。轻微 UI 残留，与 ADR-002 语义不一致 |
| **W-D3** | App.tsx:1003-1008 | **preview-click 假成功反馈**（R-D2 的直接放大器）：`jumpToIssue(loc)` 无返回值，locate 失败（null）时 handleWebOp 仍返回「✓ 已定位到 …（编辑器已跳转）」——即使修复 R-D2 的 groups 路径，其他不可定位 loc（如越界索引 `nodes[99]`）也会假成功。建议 jumpToIssue 返回 boolean 并让 handleWebOp 区分反馈 |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（批次 2c：web AI 助手深潜 · @lgdl/web；R-D2 归因定论 + R-D4 核实；核心引擎域收官） | 2026-08-30 | sddu-docs Agent |
