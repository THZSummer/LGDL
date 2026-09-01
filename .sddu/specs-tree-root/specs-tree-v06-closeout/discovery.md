# 问题挖掘报告：specs-tree-v06-closeout（v0.6 收口五件套 F-01~F-05）

> **文档定位**: SDDU 问题挖掘报告 — v0.6 发布前置收口五件套的现状基线核实（轻量模式，ROADMAP 已定义缺陷范围，无访谈）
> **前置依赖**: ROADMAP v1.2.0（F-01~F-05 缺陷定义）+ V2 重构（d03dca4）已完成、9 包体系 420 测试全绿
> **创建人**: SDDU Discovery Agent
> **创建时间**: 2026-09-01
> **版本**: v1.0
> **更新人**: SDDU Discovery Agent
> **更新时间**: 2026-09-01
> **更新说明**: 初始创建（轻量基线核实：5 项缺陷现状 / 修复边界 / 风险，全部代码证据实测，未照搬 ROADMAP 旧描述）

## 0. 执行摘要（轻量模式说明）

本阶段为**轻量 discovery**：ROADMAP 已定义 5 项缺陷的精确范围，不做访谈，核心任务是**对 V2 重构后的现状做实测核实**，产出「现状 → 修复边界 → 风险」基线，直接移交 spec。

**V2 后核实结论（关键变化）**：
- F-01：CI 已含新包（web-cli-base / lgdl-web-cli / lgdl-web-op-cli），但 **lgdl-router 仍是唯一缺失包**（paths + build 步骤均缺）→ 缺陷成立。
- F-03：**断裂点比 ROADMAP 描述更彻底**——V2 group-as-node 后 parser 已拒绝旧 `groups:` 顶层节，renderer 仍发射 `groups[i]`，locate.ts 按顶层 `groups:` 解析 → **点击分组盒/泳道必然无法定位**（不是「可能」）。
- F-04：web-fetch 已归 web-cli-base（provider.ts:17 导入确认），OpenAI 兼容端点 tools 数组**仍缺 WEB_FETCH_TOOL**（注释明确「W-D1 现场保留」）→ 缺陷 V2 后仍存在。
- F-05：jumpToIssue 返回 void、preview-click 无条件假成功 → 缺陷仍存在。
- F-02：`.github/workflows/` 仅 1 个 deploy-pages.yml，无任何 CI 测试工作流。

## 1. 问题定义
> 5 项缺陷及业务影响，回答"为什么需要关注"

| 核心问题 | 业务影响 | 不解决的成本 |
|---------|---------|------------|
| F-01（G1）deploy-pages.yml 缺 lgdl-router 包构建 | v0.6 合入 main 后 Pages 构建失败（render 依赖 router，CI 全新 checkout 下 router 无 dist → tsc 失败），线上工作台直接下线 | 发布阻塞（P0，合入前置） |
| F-02（G2）无 CI 测试工作流 | 420 测试全绿但仅人肉触发，无回归护栏 | 后续任何改动无自动化兜底（ROADMAP 风险 9 依赖 F-02 兜底 web-cli 抽取回归） |
| F-03（R-D2）分组盒/泳道点击定位跨包断裂 | 分组图（flowchart 分组 / datastream 泳道 / gantt 泳道）点击无跳转；AI `preview-click groups[i]` 假成功——「输出不可信任」直接违背语义优先公理（ROADMAP:232） | 核心场景二（分组交互）受损，且是 V2 group-as-node 引入的回归 |
| F-04（W-D1）web-fetch 未注册进 OpenAI 兼容端点 tools | 5 个可直连厂商中 4 个（deepseek/qwen/tencent/openai）+ volc 3 端点（实际 7 个 OpenAI 兼容配置）的 AI 无法调用 fetch 取上下文 | AI-first 能力通道缺失（P1） |
| F-05（W-D3）preview-click 假成功反馈 | AI 定位失败仍收到「✓ 已定位」→ AI 与用户被误导继续错误操作；与 F-03 同一交互路径的放大器 | AI 助手可信度受损（P1，随 F-03 同批修） |

## 2. 用户画像
> 受影响角色与场景（轻量模式：无访谈，依据 ROADMAP 与代码证据归纳）

| 用户角色 | 典型场景 | 关键痛点 | 当前应对方式 |
|---------|---------|---------|------------|
| 发布/维护者 | v0.6 合入 main 触发 Pages 部署 | F-01：构建必然失败（render 缺 router dist） | 未合入（F-01 被列为合入前置） |
| Web 工作台用户 | 点击分组盒/泳道期望跳转编辑器源码 | F-03：点击无任何反应（locateIssue 返回 null 静默失败） | 忍受（手动找源码） |
| AI 助手（agent 循环） | `preview-click groups[i]` 定位刚改的节点/分组 | F-05：假成功反馈误导后续操作 | 无（静默假成功，最危险） |
| AI 助手（4/5 可直连厂商） | 需要 fetch 网页上下文 | F-04：OpenAI 兼容端点 tools 无 fetch，AI 无法取上下文 | 只走 Claude 端点或用 web-cli 命令代替 |
| 开发团队 | 任何改动后的回归验证 | F-02：测试全绿但无 CI 自动执行 | 人肉触发（ROADMAP 原文「仅人肉触发」） |

## 3. 问题清单
> 5 项缺陷逐项：现状（代码证据，V2 后实测）/ 修复边界 / 测试联动。全部证据为 2026-09-01 实测。

### 3.1 F-01（G1）deploy-pages.yml 缺 router 包构建 — Q-001

**现状（V2 后实测，缺陷成立）**：
- `.github/workflows/deploy-pages.yml:6-13` paths 触发清单：lgdl-web / lgdl-core / lgdl-layout / lgdl-render / lgdl-web-cli / lgdl-web-op-cli / web-cli-base — **缺 `packages/lgdl-router/**`**
- `.github/workflows/deploy-pages.yml:39-40` build 步骤：`npm run build --workspace @lgdl/lgdl-core --workspace @lgdl/lgdl-layout --workspace @lgdl/lgdl-render --workspace @lgdl/web-cli-base --workspace @lgdl/lgdl-web-cli --workspace @lgdl/lgdl-web-op-cli` — **缺 `@lgdl/lgdl-router`**
- **致命链**：`packages/lgdl-render/package.json` dependencies 含 `@lgdl/lgdl-router ^0.5.0` → CI 全新 checkout 中 router 无 dist → render 的 `tsc` 构建失败（TS2307）→ Pages 构建失败
- V2 变化核实：CI 已纳入 3 个新包（web-cli-base/lgdl-web-cli/lgdl-web-op-cli），**router 是 9 包体系中唯一缺失者**
- 修复参照：`packages/lgdl-web/package.json` `predev` 已给出正确构建序（core→layout→**router**→render→web-cli-base→web-cli→web-op-cli），router 在 render 之前

**修复边界**：仅改 `.github/workflows/deploy-pages.yml` 两处——① paths 增加 `- 'packages/lgdl-router/**'`；② build 步骤在 render **之前**插入 `--workspace @lgdl/lgdl-router`。无源代码/测试改动。

**风险**：低。① router 构建位置必须先于 render（写错顺序构建仍失败）；② 需以 deploy-pages.yml:40 同命令手动验证一次。

### 3.2 F-02（G2）落地 CI 测试工作流 — Q-002

**现状（V2 后实测）**：
- `.github/workflows/` 仅 1 个 workflow（deploy-pages.yml），**无任何 CI 测试工作流**
- 根 `package.json:11-13`：`test: npm run test --workspaces`（可一键全包测试）
- 各包 test 脚本实测（两类模式）：
  - **自编译模式**（test 脚本内 `tsc src/*.test.ts --outDir dist-test ... && node --test dist-test/*.test.js`，无需先 build 正式 dist）：lgdl-core（parser/mutations 2 文件）、lgdl-render（ascii/svg 2）、lgdl-router（router 1）、lgdl-web-cli（commands/exec/help/operations/protocol/tools 6）、lgdl-web-op-cli（handlers/next-actions/ops/tool 4）、web-cli-base（llm/protocol/web-fetch 3）
  - **dist 依赖模式**（`node --test dist/**/*.test.js`，需先 build）：lgdl-cli、lgdl-layout — **src 下无任何 *.test.ts**（实测 node --test 空匹配 exit 0 真空通过，不阻塞 CI）
  - **lgdl-web**：`tsc src/locate.test.ts src/snap.test.ts src/ai/provider.test.ts src/ai/lgdl-web.test.ts ... && node --test ...`（显式测试清单，**运行时 import @lgdl/* 包 → 必须先 build 依赖包 dist**）
- ROADMAP 所述「核心 4 包测试已全绿」实测对应：core + render + router + layout（layout 现无测试文件，实际为 core/render/router/web-cli-base/web-cli/web-op-cli 6 包有测试）

**修复边界**：新建 CI 测试 workflow（如 `.github/workflows/ci.yml`）：checkout → setup-node(node 20, cache npm) → `npm ci --no-audit --no-fund` → **按依赖序 build 全量**（复用 deploy-pages.yml:40 命令或 lgdl-web predev 顺序）→ `npm run test --workspaces`。可选：paths 过滤（7 个 web 相关包路径）；lgdl-cli/lgdl-layout 无测试可显式排除或空跑容忍。

**风险**：中低。① **lgdl-web 测试依赖其他包 dist** — CI 必须先 build 再 test（跳过 build 会 TS2307 失败）；② npm workspaces 顺序非拓扑 — 建议「build 全量 → test 全量」两阶段而非逐包串行；③ lgdl-cli/lgdl-layout 空测试脚本在部分 Node 版本/glob 环境下行为差异（当前 Node 20 实测 exit 0）。

### 3.3 F-03（R-D2 + C-D2）分组盒/泳道点击定位跨包断裂 — Q-003

**现状（V2 后实测，断裂比 ROADMAP 描述更彻底）**：
- **group-as-node 已落地**：core parser 拒绝旧 `groups:` 顶层节（`packages/lgdl-core/src/parser.ts:54-55`「`groups` in the input is NOT accepted」）；groups 是 nodes 中 `kind: group` 节点（`types.ts:185`、`groups.ts:5`、`parser.test.ts:45-52`、`examples/group-node-demo.lgdl:15-26`）→ **现代文档不存在顶层 `groups:` 节**
- **renderer 发射**：`deriveGroups(doc)` 取分组（`lgdl-render/src/index.ts:438,1017`），三处发射 `groups[i]` loc：分组盒 `data-lgdl-loc="groups[${groupIdx}]"`（index.ts:585，groupIdx=原文档序 indexOf）、datastream 泳道 `groups[${i}]`（index.ts:549）、gantt 泳道 `groups[${gi}]`（index.ts:1064，均为 deriveGroups 文档序）
- **group 节点不进节点渲染循环**：layout 输入已过滤 `kind !== 'group'`（index.ts:183,222）→ 节点循环（index.ts:606-652）只为普通节点发射 `nodes[docIdx]`，分组盒**没有** `nodes[i]` loc 兜底
- **locate.ts 解析**：按顶层 section 扫描（`lgdl-web/src/locate.ts:67-79`，`trimmed.startsWith(section + ':')`）→ 现代语法无 `groups:` 节 → `groups[i]` 解析返回 null
- **断裂闭环**：预览点击（App.tsx:470-474 `onLocate`）与 issue 列表点击（App.tsx:1261）→ jumpToIssue（App.tsx:927-937）→ locateIssue null → 静默无跳转
- **locate.test.ts fixture（C-D2 同步点）**：当前 fixture 为**旧语法**（`locate.test.ts:6-33`：顶层 `groups:` 节 + `contains: [user, order]` 行内列表；82-88 行断言 `groups[0]` / `groups[0].contains[1]`）——该 fixture 语法已不被 parser 接受，与现代语法脱节

**修复边界**（ROADMAP:206 两条候选，二选一或组合）：
- **方案 A（renderer 改发射）**：`lgdl-render/src/index.ts` 3 处（549/585/1064）改发射 group 节点在 `doc.nodes` 的索引 `nodes[i]`（用 `doc.nodes.indexOf(groupNode)`，与节点循环 609 行同法）；locate.ts 无需改（`nodes[i]` 已支持）；**必须同步** `lgdl-render/src/svg.test.ts:166-191`（190 行断言 `data-lgdl-loc="groups[0]"` 会失效）
- **方案 B（locate.ts 支持 group 节点）**：`lgdl-web/src/locate.ts` 增加「`groups[i]` → nodes 节中第 i 个 `kind: group` 节点」解析；renderer 不改
- **C-D2（两方案均需）**：`locate.test.ts` fixture 现代语法化（groups 改为 nodes 中 `kind: group` + `contains`），同步/新增 group 节点相关断言；若选方案 A 还需在 svg.test.ts 补 `nodes[i]` 断言

**风险**：中（ROADMAP 风险 7 明确点名）。① 方案 A 必须同步 svg.test.ts:190 断言（测试先行，ROADMAP:337）；② C-D2 必须同步 locate.test.ts:82-88 旧语法断言；③ 嵌套分组（group contains group，parser.test.ts:154）时 boxes 分层渲染，click 命中最上层元素——需保证 box 元素发射自身 group 的 loc（现状已按 groupIdx 原序，注意保留）；④ 泳道（datastream/gantt）无嵌套问题但索引语义需与 group box 统一。

### 3.4 F-04（W-D1）web-fetch 注册进 OpenAI 兼容端点 tools — Q-004

**现状（V2 后实测，缺陷仍存在）**：
- **web-fetch 已归 web-cli-base**：`provider.ts:17` `import { chat as llmChat, WEB_FETCH_TOOL } from '@lgdl/web-cli-base'`（中性化改名 web-fetch，V2 完成）
- **注册逻辑**（`provider.ts:246-290` `chat()`）：`isClaude` 分支（250-267）注册 **3 工具**（WEB_CLI + WEB_OP + WEB_FETCH）；**OpenAI 兼容端点分支（268-279）只注册 2 工具（WEB_CLI + WEB_OP），缺 WEB_FETCH_TOOL** → W-D1 缺陷 V2 后仍存在
- `provider.ts:248` 注释自证：「W-D1 现场保留，F-04 修复点不移动」
- 影响面：PROVIDERS 中 openai/deepseek/qwen/tencent/volc/volc-coding/volc-plan 共 7 个 OpenAI 兼容配置全部受影响，仅 claude 可用 fetch

**修复边界**：仅改 `provider.ts:268-279` OpenAI 兼容分支 tools 数组，追加 WEB_FETCH_TOOL 条目（与 Claude 分支 263-266 同构）；可选小重构（提取公共 tools 构造避免双份），非必需。

**测试联动**：`provider.test.ts`（188 行）**无 tools 注册断言**（13 个用例全部围绕 PROVIDERS/localStorage 读写，不涉及 chat/tools）→ 现有测试不受影响，但**存在测试缺口**：修复无直接单测覆盖，建议 spec 阶段考虑导出 tools 构造逻辑或加注册断言（chat 会真调 LLM，需避免直接调用）。

**风险**：低-中。① 与三工具分发（FR-023，web-cli-base llm.ts 执行分发）交互：OpenAI 端点工具数 2→3 后，需验证 llmChat 对工具分发无「工具数」假设（web-cli-base/src/llm.test.ts 现有覆盖）；② 注册顺序：fetch 放数组末尾与 Claude 分支一致，避免影响 tool_choice 优先序；③ 与 F-03/F-05 无直接代码耦合（ROADMAP:135），但同属 web 回归面。

### 3.5 F-05（W-D3）preview-click 假成功反馈 — Q-005

**现状（V2 后实测，缺陷仍存在）**：
- `App.tsx:927-937` `jumpToIssue` 返回 **void**，三处静默失败：① editorViewRef 为空 return；② `locateIssue` 返回 null return；③ location 为空 return —— 调用方无法感知失败
- `App.tsx:1009-1014` `preview-click` handler：有 loc 参数即**无条件返回**「✓ 已定位到 X（编辑器已跳转）」——即使 locate 实际失败
- 对照组：`preview-hover`（App.tsx:1015-1028）失败时返回「✖ 未找到元素 X」→ preview-click 是唯一假成功路径
- AI 侧影响：`ai/prompts.ts:53` 引导 AI 用 `preview-click` 定位刚改的节点/分组 → 假成功会误导 AI 继续错误操作（ROADMAP:232「假成功=输出不可信任」）

**修复边界**：`App.tsx` 两处联动——① `jumpToIssue` 改返回 boolean（成功 dispatch → true；editor 未挂载 / 无 location / locate 失败 → false）；② `preview-click` handler 按 boolean 区分反馈（成功「✓ 已定位到 X」/ 失败「✖ 未定位到 X（locate 失败）」）。受益面：F-03 修复后分组定位失败时 AI 同样获得真实反馈。

**测试联动**：无直接单测（App.tsx 为 React 组件无测试文件）→ 依赖 lgdl-web test 清单中 locate.test.ts（locate 层）保持绿；交互层行为靠 validate 手测/实测。

**风险**：低。① jumpToIssue 返回类型 void→boolean 不影响现有调用点（App.tsx:1214/1218 onLocate 与 1261 onClick 均忽略返回值）；② preview-click 返回文本变化属正向（AI 反馈更真实）；③ 与 F-03 共享同一 locate 链路（ROADMAP:296 建议同批交付）。

## 4. 竞品参考

**不适用** — 本 Feature 为内部缺陷收口（发布前置），5 项均为已知缺陷修复，无竞品调研需求（ROADMAP 未涉及竞品对照，scope.out 已排除开源决策）。

## 5. 假设与风险

### 5.1 关键假设

| # | 假设内容 | 验证方式 |
|---|---------|---------|
| A-001 | F-01 修复后 deploy-pages.yml 构建命令在 CI 全新 checkout 可跑通（render 依赖 router 的 dist 已由同命令先构建） | 本地以 deploy-pages.yml:40 同命令 + 干净 node_modules 验证；或合入 main 后观察 Pages 构建 |
| A-002 | F-02 CI 采用「build 全量 → test 全量」两阶段可复现当前 420 全绿 | CI 工作流首跑对比本地 `npm run test --workspaces` 结果 |
| A-003 | F-03 方案选择（A renderer 改发射 vs B locate.ts 支持）由 spec/plan 阶段定，本阶段仅记录两方案边界 | 待 spec/plan 决策 |
| A-004 | F-04 修复后 OpenAI 兼容端点工具数 2→3 不影响 llmChat 执行分发（web-cli-base 无工具数假设） | web-cli-base/src/llm.test.ts 现有用例 + validate 实测 |
| A-005 | 「420 测试全绿」基线在修复前成立（本次未重跑，依据 state.json 记录） | F-02 CI 首跑即验证 |

### 5.2 主要风险

| # | 风险描述 | 影响程度 |
|---|---------|---------|
| R-001 | F-03 方案 A 改 renderer loc 发射 → svg.test.ts:190 断言（`data-lgdl-loc="groups[0]"`）失效；方案 B 改 locate.ts → locate.test.ts:82-88 旧语法断言失效 | 中（测试必须同步，测试先行） |
| R-002 | F-03 与 F-05 共享 locate 链路（render→locate→feedback），任一侧修复可能影响另一侧（如 jumpToIssue 返回值被 F-03 的 nodes[i] 解析结果依赖） | 中（同批交付，ROADMAP:296） |
| R-003 | F-04 与三工具分发（FR-023）交互：OpenAI 端点加 fetch 后工具数 2→3，分发行为需回归验证 | 低-中 |
| R-004 | F-02 CI 若先 test 后 build，lgdl-web 测试 TS2307 失败（依赖其他包 dist） | 中（两阶段顺序是硬约束） |
| R-005 | F-01 router 构建位置错误（render 之后）→ 构建仍失败 | 低 |
| R-006 | C-D2 fixture 现代语法化若误改行号/内容，locate.test.ts 既有断言（如 lineSpan 引用）连锁失效 | 中（fixture 行号是断言参数，改动需逐条核对） |

## 6. 下一步建议

| 优先级 | 事项 | 说明 |
|--------|------|------|
| 高 | F-01 先行（G1，合入 main 前置） | 发布阻塞项，改动最小（仅 CI yml 两处），先修解锁合入 |
| 高 | F-03 + F-05 + C-D2 同批（source-loc 链路健康化） | 同一条 render→locate→feedback 链路（ROADMAP:296），测试先行：先现代语法化 locate.test.ts fixture，再定 F-03 方案 A/B |
| 中 | F-04（W-D1）fetch 注册一行修复 | 与 F-03/F-05 无直接耦合，可并行；建议补 tools 注册断言（现无覆盖） |
| 中 | F-02（G2）CI 测试工作流 | 作为全量回归护栏，落地后为上述修复提供自动验证；注意 build→test 两阶段顺序 |
| 后续 | 上述修复落定后转 spec Agent | `@sddu-spec specs-tree-v06-closeout`，重点细化 F-03 方案选择与测试联动清单 |

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：5 项缺陷 V2 后现状实测核实（文件:行号证据）+ 修复边界 + 风险 | 2026-09-01 | SDDU Discovery Agent |
