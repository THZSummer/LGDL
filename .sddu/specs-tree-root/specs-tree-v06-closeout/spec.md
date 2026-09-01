# Feature Specification：specs-tree-v06-closeout（v0.6 收口五件套 F-01~F-05）

> **文档定位**: SDDU 需求规范 — 定义功能需求、非功能需求和边界情况，作为 plan 阶段的输入
> **前置依赖**: discovery.md（5 项缺陷 V2 后现状基线：修复边界 / 风险 / 测试联动，全部代码证据 2026-09-01 实测）+ ROADMAP v1.2.0（F-01~F-05 缺陷定义）
> **创建人**: SDDU Spec Agent
> **创建时间**: 2026-09-01
> **版本**: v1.0
> **更新人**: SDDU Spec Agent
> **更新时间**: 2026-09-01
> **更新说明**: 初始创建 — 轻量模式（缺陷范围已由 ROADMAP + discovery 定义，零访谈）；F-03 方案 A/B 自主决策定案（D-001，方案 A）；5 项修复要求 + 验收标准 + 边界 + 风险落盘

## 1. 元数据
> Feature 基本信息

| 字段 | 值 |
|------|-----|
| Feature ID | F-01~F-05（ROADMAP v1.2.0 收口五件套：G1 / G2 / R-D2+C-D2 / W-D1 / W-D3） |
| 名称 | v0.6 收口五件套（F-01~F-05） |
| 优先级 | F-01、F-03：P0（F-01 合入 main 前置，发布阻塞；F-03 语义优先公理回归）；F-02、F-04、F-05：P1 |
| 目标版本 | v0.6（发布前置收口；前置 V2 重构 d03dca4 已完成，9 包体系 420 测试全绿基线） |

## 2. 上下文
> 回顾问题背景和目标用户（轻量模式：无访谈，依据 discovery.md 基线归纳）

### 2.1 要解决的问题

V2 重构（d03dca4，9 包体系）完成后，ROADMAP v1.2.0 定义的 5 项发布前置缺陷经 discovery 实测核实**全部成立**（部分比 ROADMAP 描述更严重）：

| 核心问题 | V2 后现状（代码证据，2026-09-01 实测） | 业务影响 |
|---------|--------------------------------------|---------|
| F-01（G1）deploy-pages.yml 缺 lgdl-router 构建 | paths（deploy-pages.yml:6-13）与 build 步骤（:39-40）均缺 `lgdl-router`；render package.json dependencies 含 `@lgdl/lgdl-router` → CI 全新 checkout 下 router 无 dist → render tsc 构建必败（TS2307） | v0.6 合入 main 后 Pages 构建失败，线上工作台下线（发布阻塞，P0） |
| F-02（G2）无 CI 测试工作流 | `.github/workflows/` 仅 1 个 deploy-pages.yml，无任何测试 workflow；420 测试全绿仅人肉触发 | 无回归护栏，后续改动无自动化兜底 |
| F-03（R-D2）分组盒/泳道点击定位跨包断裂 | 断裂比 ROADMAP 描述更彻底：parser.ts:53-55 已拒旧 `groups:` 顶层节（group-as-node 落地），renderer 仍三处发射 `groups[i]`（index.ts:549 泳道 / 585 分组盒 / 1064 gantt 泳道），locate.ts:67-79 按顶层 `groups:` 节解析 → **现代文档点击分组必 null 静默失败** | 核心场景二（分组交互）受损，V2 引入的回归；AI `preview-click groups[i]` 假成功违背语义优先公理 |
| F-04（W-D1）web-fetch 未注册 OpenAI 兼容端点 | web-fetch 已归 web-cli-base（provider.ts:17），OpenAI 兼容分支 tools 数组（provider.ts:268-279）仍只注册 2 工具，缺 WEB_FETCH_TOOL（:248 注释自证「W-D1 现场保留」） | 7 个 OpenAI 兼容配置（openai/deepseek/qwen/tencent/volc/volc-coding/volc-plan）AI 无法 fetch 上下文，仅 claude 可用 |
| F-05（W-D3）preview-click 假成功反馈 | App.tsx:927-937 `jumpToIssue` 返回 void（三处静默失败）；App.tsx:1009-1014 `preview-click` 有 loc 即无条件返回「✓ 已定位」 | AI 定位失败仍被误导继续错误操作，AI 助手可信度受损（随 F-03 同批修） |

### 2.2 目标用户

| 用户角色 | 典型场景 | 关键痛点 |
|---------|---------|---------|
| 发布/维护者 | v0.6 合入 main 触发 Pages 部署 | F-01：构建必然失败，发布被阻塞 |
| Web 工作台用户 | 点击分组盒/泳道期望跳转编辑器源码 | F-03：点击无任何反应（locateIssue 返回 null 静默失败） |
| AI 助手（agent 循环） | `preview-click` 定位刚改的节点/分组 | F-05：假成功反馈误导后续操作（与 F-03 同一链路） |
| AI 助手（4/5 可直连厂商） | 需要 fetch 网页上下文 | F-04：OpenAI 兼容端点 tools 无 fetch |
| 开发团队 | 任何改动后的回归验证 | F-02：测试全绿但无 CI 自动执行 |

### 2.3 与现有功能的关系

- **上游依赖**：V2 重构（d03dca4）已完成——group-as-node（core parser/groups.ts）、9 包体系、web-fetch 归 web-cli-base 均已就位；本 Feature 只修消费方缺陷，**不改语言核心语义**；
- **F-03 依赖链**：render（发射 loc）→ locate（解析 loc）→ feedback（反馈成败）同一条 source-loc 链路（ROADMAP:296 建议同批交付）；
- **F-05 受益面**：F-03 修复后分组定位失败时 AI 同样获得真实反馈（F-05 与 F-03 共享 locate 链路）；
- **下游**：@sddu-plan（依赖本 spec.md 完成技术规划）。

## 3. 目标与非目标
> 明确需求范围，防止范围蔓延

### 3.1 目标 (Goals)

| # | 目标描述 |
|---|---------|
| G-001 | **F-01 修复**：deploy-pages.yml 补齐 lgdl-router 构建（paths + build 步骤，顺序先于 render）→ v0.6 合入 main 后 Pages 构建可跑通 |
| G-002 | **F-02 落地**：新建 CI 测试工作流（npm ci → 按依赖序 build → test --workspaces）→ 420 测试自动化回归护栏 |
| G-003 | **F-03 修复**：renderer 分组 loc 改发射 `nodes[i]`（方案 A，D-001）+ locate.test.ts fixture 现代语法化（C-D2）→ 分组盒/泳道点击定位恢复，loc 输出语义真实 |
| G-004 | **F-04 修复**：OpenAI 兼容端点 tools 数组补 WEB_FETCH_TOOL → 7 个 OpenAI 兼容配置 AI 获得 fetch 能力 |
| G-005 | **F-05 修复**：jumpToIssue 返回 boolean + preview-click 按结果反馈 → AI 不再被假成功误导 |
| G-006 | **零回归闭环**：全仓测试仍全绿（420 基线不降），新增/更新测试覆盖修复 |

### 3.2 非目标 (Non-Goals)

| # | 明确不做 |
|---|---------|
| NG-001 | 不新增任何业务功能（纯缺陷修复） |
| NG-002 | 不做 v0.7 及以后的工程（测试护栏全面补齐/文档零漂移等），F-02 仅落地 CI 测试工作流本身 |
| NG-003 | 不做开源决策（许可/命名/仓库/发布管道属 v1.1 范畴） |
| NG-004 | 不改语言核心语义：lgdl-core parser/types/groups 的 group-as-node 已就位，F-03 只改 render/locate/web 消费方 |
| NG-005 | 不重构 web 包依赖面：不改 provider.ts:246-290 之外的 chat() 组装结构（F-04 可选小重构除外，见 FR-007）；不改 AiPanel.tsx 调用点 |

## 4. 用户故事
> 以用户视角描述功能需求

| # | 作为… | 我想要… | 以便… |
|---|-------|---------|-------|
| US-001 | 发布/维护者 | deploy-pages.yml 补 lgdl-router 构建步骤与 paths 触发 | v0.6 合入 main 后 Pages 自动构建成功，工作台不因缺 router dist 下线 |
| US-002 | 开发团队 | CI 测试工作流在每次改动时自动跑全仓测试 | 420 基线回归有自动化兜底，缺陷不再靠人肉触发发现 |
| US-003 | Web 工作台用户 | 点击分组盒/泳道跳转到对应 group 节点源码行 | 快速定位分组定义，无需手动搜索源码 |
| US-004 | AI 助手（OpenAI 兼容端点） | OpenAI 兼容配置的 tools 含 web-fetch | 拿取网页上下文补齐对话信息，与 Claude 端点能力对齐 |
| US-005 | AI 助手（agent 循环） | preview-click 在定位失败时收到真实失败反馈 | 不基于「✓ 已定位」的假成功继续错误操作 |

## 5. 功能需求 (FR)
> 每个需求必须有唯一标识符且可测试；按缺陷分组（F-01~F-05），每项含修复要求 / 验收标准（可验证）/ 边界 / 风险。需求来源：discovery.md 基线（Q-001~Q-005），不臆造新范围。

### 组 1：F-01（G1）deploy-pages.yml 补 lgdl-router 构建（对应 discovery §3.1 Q-001）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-001 | **paths 触发清单补 lgdl-router**：`.github/workflows/deploy-pages.yml:6-13` paths 增加 `- 'packages/lgdl-router/**'` | yml paths 区块含 `packages/lgdl-router/**` 条目 | P0 |
| FR-002 | **build 步骤补 lgdl-router**：`.github/workflows/deploy-pages.yml:39-40` build 命令在 `@lgdl/lgdl-render` **之前**插入 `--workspace @lgdl/lgdl-router` | 命令 workspace 顺序为 …lgdl-layout → **lgdl-router** → lgdl-render…（render 之前）；本地以该命令 + 干净 node_modules 跑通（无 TS2307） | P0 |

**修复要求**：仅改 `.github/workflows/deploy-pages.yml` 两处（paths + build），无源代码/测试改动。build 顺序参照 `packages/lgdl-web/package.json` `predev`（core→layout→router→render→web-cli-base→web-cli→web-op-cli），router 在 render 之前。

**边界**：① 顺序是硬约束——router 必须在 render 之前构建（render 依赖 router dist，写错顺序构建仍失败）；② 不改动其他包构建位置与顺序。

**风险**：低。R-005（router 构建位置错误 → 构建仍失败）由验收标准的「本地同命令验证」兜底；R-001 不适用（无测试文件涉及）。

### 组 2：F-02（G2）落地 CI 测试工作流（对应 discovery §3.2 Q-002）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-003 | **新建 CI 测试工作流**：`.github/workflows/ci.yml`，步骤链：checkout → setup-node（node 20，cache npm）→ `npm ci --no-audit --no-fund` → **按依赖序 build 全量**（复用 deploy-pages.yml build 命令或 lgdl-web predev 顺序）→ `npm run test --workspaces`；可选：paths 过滤（7 个 web 相关包路径） | ci.yml 存在于 `.github/workflows/`；workflow 首跑（push/PR）全绿，结果与本地 `npm run test --workspaces` 一致（420 基线不降） | P1 |

**修复要求**：**两阶段硬约束**——「build 全量 → test 全量」，不得先 test 后 build（lgdl-web 测试脚本 import `@lgdl/*` 依赖包 dist，跳过 build 会 TS2307 失败，R-004）；不得逐包串行（npm workspaces 顺序非拓扑）。lgdl-cli / lgdl-layout 无测试文件（src 下无 *.test.ts，`node --test` 空匹配 exit 0），CI 容忍空跑或显式排除。

**边界**：① 触发范围建议含 push 与 pull_request，paths 可收窄到 7 个 web 相关包（lgdl-web/core/layout/render/router/web-cli-base/web-cli/web-op-cli，与 deploy-pages.yml paths 对齐）减少无关触发；② lgdl-cli/lgdl-layout 的空测试脚本在 Node 20 实测 exit 0，不阻塞 CI（当前环境 Node ≥20）。

**风险**：中低。R-004（build→test 顺序是硬约束，写反必败）；空测试脚本在部分 Node 版本/glob 环境下行为差异（以 Node 20 为基准，见 NFR-001）。

### 组 3：F-03（R-D2 + C-D2）分组盒/泳道点击定位跨包断裂（对应 discovery §3.3 Q-003）

> **设计决策记录 D-001（F-03 方案定案）**：discovery 标记的候选二选一，经工程合理性评估**选定方案 A（renderer 改发射 `nodes[i]`）**，理由：
> 1. **语义优先（项目核心公理，ROADMAP:232）**：现代文档模型 group 即 node（`kind: 'group'`，parser.ts:53-55 已拒旧 `groups:` 节），renderer 发射 `groups[i]` 是对**不存在语法**的引用——「输出不可信任」正是本缺陷的根源。`nodes[i]` 指向文档中真实的节点定义行，loc 语义真实。
> 2. **改动面最小**：方案 A 只动 1 个包（lgdl-render 3 处发射）+ 1 行测试断言（svg.test.ts:190，且该 fixture 已是现代语法，仅断言字符串变化）；方案 B 需在 locate.ts（202 行复杂解析器，含嵌套缩进/深层路径处理）新增「groups[i] → nodes 节第 i 个 kind: group 节点」特殊映射代码路径，且仍要做 C-D2 fixture 现代化。
> 3. **契约统一，零特殊映射**：方案 A 后 renderer 发射的全部 loc 均为 `nodes[i]`/`edges[i]` 文档序索引，locate.ts 契约保持单一简单（「nodes[i] = nodes 节第 i 个条目首行」）；方案 B 保留双格式（groups[i] 成为历史遗留别名），长期维护双解析路径。
> 4. **locate.ts 已原生支持**：`nodes[i]`（locate.ts:10-11）与 `nodes[i].contains[j]`（locate.ts:12-13，locateListValue :156-177 处理行内列表）均已在既有通用路径中实现，方案 A 复用零新增代码。
> 5. **测试联动直接因果**：svg.test.ts 的 fixture（:166-175）本身已含 `kind: 'group'` 现代节点，方案 A 下仅断言字符串 `groups[0]` → `nodes[2]` 一处更新；方案 B 不改 svg.test.ts 反而掩盖 renderer 仍在发射虚假 loc 的事实。

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-004 | **renderer 分组 loc 改发射 `nodes[i]`（方案 A）**：`packages/lgdl-render/src/index.ts` 三处 loc 发射改为 group 节点在 `doc.nodes` 的文档序索引 `nodes[i]`——① :549 datastream 泳道（`groups.forEach((group, i) => …)` 的 `groups[${i}]`）；② :585 分组盒（现 `groupIdx = groups.indexOf(group)`）；③ :1064 gantt 泳道（`groups[${gi}]`）。索引取该 group 节点在 doc.nodes 中的位置；**合成元素不发 loc**（datastream 无 group 时合成的 `_default` 泳道 index.ts:465 在 doc.nodes 无对应节点 → 不发 loc，沿用 :427 `edgeIdx >= 0` 守卫模式） | 现代语法文档（group-as-node）渲染后：分组盒/泳道元素 `data-lgdl-loc="nodes[i]"`，i 为该 group 节点在 nodes 节中的文档序索引；renderer 输出中不再出现 `data-lgdl-loc="groups[`；`npm run test --workspace @lgdl/lgdl-render` 全绿 | P0 |
| FR-005 | **svg.test.ts 断言同步（方案 A 直接因果）**：`packages/lgdl-render/src/svg.test.ts:190` 断言 `data-lgdl-loc="groups[0]"` 改为 `data-lgdl-loc="nodes[2]"`（fixture :167-175 中 g1 为第 3 个节点，文档序索引 2）；loc 数量断言（:192 `locs.length >= 4`）保持成立 | svg.test.ts 全绿；断言覆盖 nodes[i]（i=group）发射 | P0 |
| FR-006 | **locate.test.ts fixture 现代语法化（C-D2）**：`packages/lgdl-web/src/locate.test.ts:6-33` fixture 去掉顶层 `groups:` 节（:30-32），改为 nodes 节中追加 `kind: group` 节点（`- id: g1` / `kind: group` / `contains: [user, order]`）；断言同步：:82-88 的 `groups[0]` → 现代 group 节点的 `nodes[i]`（i 为 g1 在 nodes 节的文档序索引）、`groups[0].contains[1]` → `nodes[i].contains[1]`（定位 'order'）；新增 group 节点定位断言（含 contains 成员定位） | locate.test.ts 全绿；fixture 语法与 parser 接受的现代语法一致（可用 parseLgdl 验证 fixture 可解析）；断言覆盖 group 节点行定位 + contains 行内列表成员定位 | P0 |
| FR-007 | **端到端链路可验证**：F-03 修复后，renderer 发射的 `nodes[i]`（i=group）经 locateIssue 解析返回非 null DocSpan（链路 render→locate 打通） | validate 阶段实测：以 group-node-demo 类现代文档渲染后，点击分组盒/泳道 → 编辑器跳转到该 group 节点源码行；locateIssue(loc)`nodes[i]` 返回非 null | P0 |

**修复要求**：实现注意（D-001 约束）：`deriveGroups`（lgdl-core/src/groups.ts:24-33）返回**新构造的 LgdlGroup 对象**（`{ id, contains, label?, attrs? }`，非 doc.nodes 中的节点引用）→ 三处发射不能用 `doc.nodes.indexOf(group)`，需按 id 反查（如 `doc.nodes.findIndex((n) => n.kind === 'group' && n.id === group.id)`，deriveGroups 保持文档序故索引语义一致），或预计算 group 节点索引表（plan 定实现）；合成 `_default` 泳道索引为 -1 → 不发 loc（守卫）；分组盒保留「按原始文档序发射、不受绘制排序影响」的既有行为（index.ts:581-583 注释语义，绘制用 sorted order、loc 用文档序）。

**边界**：① 嵌套分组（group contains group，parser.test.ts:154）：boxes 分层绘制、内层在上，click 命中最上层元素 → 跳转内层 group 节点行（保留现状）；② 泳道（datastream/gantt）无嵌套问题但索引语义须与分组盒统一（均文档序）；③ **连带项（EC-003）**：App.tsx:1024 preview-hover 失败提示示例含 `groups[0]`——方案 A 后 SVG 不再存在该元素，示例文案需随批改为 `nodes[i]`（低优，plan 确认是否同批）；④ locate.test.ts fixture 行号是 lineSpan 断言参数，现代语法化后**逐条核对**行号（R-006）。

**风险**：中（ROADMAP 风险 7 点名）。R-001：svg.test.ts:190 / locate.test.ts:82-91 断言同步为硬依赖，测试先行；R-006：fixture 行号连锁失效，改动逐条核对；R-002：与 F-05 共享 locate 链路，任一侧修复影响另一侧 → 同批交付 + 回归（见组 5）。

### 组 4：F-04（W-D1）web-fetch 注册进 OpenAI 兼容端点 tools（对应 discovery §3.4 Q-004）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-008 | **OpenAI 兼容分支补 WEB_FETCH_TOOL**：`packages/lgdl-web/src/ai/provider.ts:268-279` OpenAI 兼容分支 tools 数组追加 WEB_FETCH_TOOL 条目（name/description/parameters 与 Claude 分支 :263-266 同构），置于数组**末尾**（工具顺序 WEB_CLI → WEB_OP → WEB_FETCH，与 Claude 分支一致，避免 tool_choice 优先序变化） | 代码审查 OpenAI 兼容分支 tools 含 3 项（WEB_CLI + WEB_OP + WEB_FETCH）；7 个 OpenAI 兼容 provider 配置（openai/deepseek/qwen/tencent/volc/volc-coding/volc-plan）共享该分支，全部获得 fetch 工具 | P1 |
| FR-009 | **工具数变化回归验证**：OpenAI 兼容端点工具数 2→3 后，web-cli-base llmChat 对工具分发无「工具数」假设（FR-023 三工具分发） | `npm run test --workspace @lgdl/web-cli-base --workspace @lgdl/lgdl-web` 全绿（llm.test.ts 现有分发用例覆盖）；validate 实测 OpenAI 兼容端点返回的 tools 列表含 fetch 工具 | P1 |

**修复要求**：仅改 `provider.ts:268-279` tools 数组（一行级追加），不动 providerById / llmChat 调用面与 AiPanel.tsx 调用点（NG-005）。可选小重构：提取公共 tools 构造函数避免 Claude/OpenAI 双份组装——非必需，若做则需保证两分支输出逐字段一致（FR-008 验收仍成立）。测试缺口（discovery §3.4：provider.test.ts 无 tools 注册断言）：chat() 会真调 LLM 不可直接调用 → 补测方案（导出 tools 构造逻辑 vs validate 实测）列入开放问题 Q-1，由 plan 阶段决策。

**边界**：① 注册顺序固定数组末尾（fetch 放最后，与 Claude 分支一致）；② 不改动 isClaude 分支（263-266）；③ 与 F-03/F-05 无代码耦合（ROADMAP:135），同属 web 回归面由 F-02 CI 兜底。

**风险**：低-中。R-003（工具数 2→3 与 llm 分发交互）：由 FR-009 回归验证兜底；provider.test.ts 现有 13 用例全部围绕 PROVIDERS/localStorage 读写，不涉及 chat/tools → 现有测试不受影响（但存在覆盖缺口，见 Q-1）。

### 组 5：F-05（W-D3）preview-click 假成功反馈修复（对应 discovery §3.5 Q-005）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-010 | **jumpToIssue 返回 boolean**：`packages/lgdl-web/src/App.tsx:927-937` `jumpToIssue` 改返回 `boolean`——成功 dispatch → `true`；editorViewRef 为空 / location 缺失 / locateIssue 返回 null（三处静默失败 return）→ `false` | 类型签名 `(location: string \| undefined) => boolean`；现有调用点（App.tsx:1214/1218 onLocate、:1261 onClick）均忽略返回值 → 编译通过且行为不变 | P1 |
| FR-011 | **preview-click 按结果反馈**：`App.tsx:1009-1014` `preview-click` handler 依据 jumpToIssue 返回值区分反馈——成功「✓ 已定位到 X（编辑器已跳转）」/ 失败「✖ 未定位到 X（locate 失败）」；loc 参数缺失仍返回原「✖ preview-click 需要 loc 参数（如 nodes[3]）」 | loc 缺失 → 参数缺失文案；loc 存在但 locate 失败（如 `groups[0]` 现代语法或越界索引）→ 失败文案；loc 存在且成功 → 成功文案；反馈风格与 preview-hover 失败分支（:1024「✖ 未找到元素 X」）一致 | P1 |

**修复要求**：App.tsx 两处联动修改（jumpToIssue 返回值 + preview-click 按值反馈）。jumpToIssue 返回类型 void→boolean 不影响任何现有调用点（discovery §3.5 风险①已核实，:1214/1218/1261 均忽略返回值）。受益面：F-03 修复后分组定位失败时 AI 同样获得真实反馈（共享 locate 链路）。

**边界**：① App.tsx 为 React 组件无测试文件 → 交互层行为靠 validate 手测/实测（依赖 lgdl-web test 清单中 locate.test.ts 保持绿，locate 层单测覆盖）；② 与 F-03 共享同一 locate 链路，**同批交付**（ROADMAP:296）；③ preview-click 返回文本变化属正向（AI 反馈更真实），无协议兼容负担。

**风险**：低。R-002（与 F-03 联动）：F-03 的 nodes[i] 解析结果被 jumpToIssue 的 locateIssue 调用依赖 → 同批交付 + 回归验证兜底。

## 6. 非功能需求 (NFR)
> 性能、安全、可用性等跨切面需求

| ID | 类别 | 需求描述 | 验收标准 |
|----|------|---------|---------|
| NFR-001 | 回归 | **全仓测试守恒**：5 项修复落地后，全仓 `npm run test --workspaces` 仍全绿，420 基线不降 | 本地 + F-02 CI 首跑均全绿；新增/更新测试（svg.test.ts 断言、locate.test.ts fixture 与断言）全部通过 |
| NFR-002 | 兼容 | **对外接口零破坏**：F-05 的 jumpToIssue 返回类型变化不影响现有调用点；F-04 不动 chat() 签名与 AiPanel 调用点；F-01/F-02 仅改 CI 配置不触碰源码 | 各包 build 通过；web 包编译（tsc/vite build）无类型错误 |
| NFR-003 | 可用性 | **loc 输出语义可信（语义优先）**：F-03 方案 A 后 renderer 发射的 loc 全部指向现代语法中真实存在的位置（nodes[i]/edges[i]） | renderer 输出中无 `groups[` 残留（FR-004 验收）；AI 侧 `preview-click` 反馈真实（FR-011 验收） |
| NFR-004 | 性能 | **CI 效率**：F-02 采用「build 全量 → test 全量」两阶段（非逐包串行），避免重复安装/构建放大 | ci.yml 步骤数 ≥5（checkout/setup-node/ci/build/test），无逐包嵌套循环 |

## 7. 边界情况 (EC)
> 异常场景和边界条件的处理方式

| ID | 场景 | 处理方式 |
|----|------|---------|
| EC-001 | datastream 无 group 节点 → 合成 `_default` 泳道（index.ts:465） | 合成元素在 doc.nodes 无对应 → 不发 `data-lgdl-loc`（FR-004 守卫，沿用 :427 edgeIdx>=0 模式），点击无跳转（与现状一致，无回归） |
| EC-002 | 嵌套分组（group contains group）点击重叠区域 | 分层绘制内层 box 在上 → 命中最上层元素 → 跳转内层 group 节点行；保留现状行为，各 box 发射自身 group 的 loc（文档序） |
| EC-003 | preview-hover 失败提示示例含 `groups[0]`（App.tsx:1024） | 方案 A 后 SVG 不再存在 `groups[0]` 元素 → 示例文案连带更新为 `nodes[i]`（低优，随 F-03 同批，plan 确认） |
| EC-004 | locate.test.ts fixture 现代语法化导致行号变化 | 行号是 lineSpan 断言参数（R-006）→ 改动后逐条核对全部行号引用（lineSpan 调用处与注释），新增行用新行号 |
| EC-005 | lgdl-cli / lgdl-layout 无测试文件（src 下无 *.test.ts） | F-02 CI 中 `node --test` 空匹配 exit 0（Node 20 实测）→ 容忍空跑或显式排除，不阻塞 CI |
| EC-006 | `preview-click` loc 为 `groups[i]`（AI 旧习惯或幻觉） | 现代语法下 locate 返回 null → FR-011 失败反馈「✖ 未定位到 X（locate 失败）」，AI 得到真实信号后改用 `nodes[i]`（与 F-03 修复联动，不再假成功） |

## 8. 开放问题
> 待决策事项和需要进一步调研的内容

| # | 问题 | 状态 |
|---|------|:--:|
| 1 | **F-04 测试缺口补测方案**：provider.test.ts 现无 tools 注册断言，chat() 会真调 LLM 不可直接调用 → 补测采用「导出 tools 构造逻辑加断言」还是「validate 实测为准」 | 待 plan 决策 |
| 2 | **F-02 CI 触发范围**：paths 过滤是否收窄到 7 个 web 相关包（与 deploy-pages.yml 对齐）减少无关触发，还是全仓路径触发 | 待 plan 决策 |
| 3 | **F-03 索引反查实现**：三处发射的 group→doc.nodes 索引用「按 id findIndex」还是「预计算索引表」（deriveGroups 返回新对象无节点引用的实现约束） | 待 plan 决策（实现细节，不影响需求） |

## 修订记录
> 记录本文档的版本变更历史

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建 — 轻量模式（缺陷范围由 ROADMAP + discovery 定义，零访谈）：5 组 FR（F-01~F-05）含修复要求/验收标准/边界/风险；F-03 方案 A/B 自主决策定案（D-001，方案 A：renderer 改发射 nodes[i]，理由 5 条入档）；总体验收 = 420 基线不降 + 新增/更新测试覆盖 | 2026-09-01 | SDDU Spec Agent |
