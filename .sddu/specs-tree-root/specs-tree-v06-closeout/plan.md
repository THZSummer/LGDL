# 技术方案：specs-tree-v06-closeout（v0.6 收口五件套 F-01~F-05）

> **文档定位**: SDDU 技术方案（轻量版）— 5 项缺陷修复的实施设计，聚焦迁移/实施细节
> **前置依赖**: discovery.md v1.0（现状/修复边界/风险基线）+ spec.md v1.0（11 FR / 4 NFR / 6 EC / D-001 方案 A / 3 项开放问题）
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-01
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-01
> **更新说明**: 初始创建 — 轻量 plan（5 项实施设计 + 决策表 + 风险矩阵 + 工作量）；所有引用行号 2026-09-01 代码实测核对

## 1. 执行摘要

5 项缺陷修复（F-01~F-05）实施设计全部落定，关键决策：

| 开放问题 | 决策 | 理由（摘要） |
|---------|------|------------|
| Q-① F-04 补测方案 | **提取 `buildTools()` 公共构造函数 + provider.test.ts 单测断言**（validate 实测为兜底） | chat() 真调 LLM 不可直接测 → 组装逻辑提取为纯函数是唯一可单测路径；双份组装漂移正是缺陷根因，公共函数结构性防再犯；spec NG-005 已授权「可选小重构除外」 |
| Q-② F-02 CI 触发范围 | **MVP 全量简化**（push: main + pull_request，不设 paths 过滤；注释留后续优化） | 本项目 F-01 正是 paths 漏配引发的缺陷——收窄触发有历史教训；9 包测试全跑成本分钟级可接受；逻辑最简 |
| Q-③ F-03 索引反查实现 | **按 id `findIndex`**（非 Map 预建） | 现成先例 index.ts:595（initial 伪状态同款模式）；三处发射点独立替换、零共享状态；deriveGroups 保持文档序 → 反查结果即文档序索引，语义一致；单文档节点数十~百级，O(n) 开销可忽略 |

**无新增 ADR**：D-001（F-03 方案 A）已于 spec 定案；开放问题①②③为实施级决策，记录于本 plan §3 决策表，不单独生成 ADR 文件。

## 2. 前置验证

- ✅ spec.md 存在（`specs-tree-v06-closeout/spec.md`，201 行）
- ✅ 外部 API 文档：不适用（5 项均为内部缺陷修复，无外部服务引用）
- ✅ 全部引用行号 2026-09-01 代码实测核对（见各节「核实」）

## 3. 实施设计

### 3.1 F-01（低风险，P0）deploy-pages.yml 补 lgdl-router 构建

**核实**：`.github/workflows/deploy-pages.yml` — paths 清单（:6-13）含 lgdl-web/core/layout/render/web-cli/web-op-cli/web-cli-base 七包，**缺 lgdl-router**；build 步骤（:39-40）含 core/layout/render/web-cli-base/web-cli/web-op-cli 六包，**缺 router**。顺序参照已核实：`packages/lgdl-web/package.json` predev = core→layout→**router**→render→web-cli-base→web-cli→web-op-cli。

**改动文件**：`[MODIFY] .github/workflows/deploy-pages.yml`（2 处）

1. **paths 触发**（:6-13）：在 `- 'packages/lgdl-render/**'`（:10）之后插入 `- 'packages/lgdl-router/**'`（paths 顺序不敏感，放 render 后与 build 顺序对齐）
2. **build 命令**（:39-40）：在 `--workspace @lgdl/lgdl-layout` 与 `--workspace @lgdl/lgdl-render` **之间**插入 `--workspace @lgdl/lgdl-router`；期望最终命令：
   ```
   npm run build --workspace @lgdl/lgdl-core --workspace @lgdl/lgdl-layout --workspace @lgdl/lgdl-router --workspace @lgdl/lgdl-render --workspace @lgdl/web-cli-base --workspace @lgdl/lgdl-web-cli --workspace @lgdl/lgdl-web-op-cli
   ```
3. （可选低优）:39 步骤 name「Build core, layout, render, …」补 router 字样，保持描述与命令一致

**测试影响**：无（纯 CI 配置改动，不触碰源码/测试）。

**回归验证**：本地 `npm ci`（干净 node_modules）后以新命令手动跑通（render 的 TS2307 消失）；F-02 ci.yml 首跑再次覆盖同命令。

### 3.2 F-02（中风险，P1）新建 CI 测试工作流 ci.yml

**核实**：`.github/workflows/` 仅 deploy-pages.yml 一个 workflow（2026-09-01 实测 ls）；根 `package.json` scripts：`test: npm run test --workspaces`；`lgdl-web` test 脚本 = tsc 显式编译 4 个测试文件（locate/snap/provider/lgdl-web）+ `node --test`，运行时 import `@lgdl/*` → **必须先 build 依赖包 dist**；`lgdl-cli`/`lgdl-layout` src 下无 `*.test.ts`（空匹配 exit 0，Node 20 实测，EC-005）。

**改动文件**：`[NEW] .github/workflows/ci.yml`

**设计（Q-② 决策：MVP 全量简化）**：

```yaml
name: CI Tests

on:
  push:
    branches: [main]
  pull_request:
  # TODO(v0.7): 按包过滤收窄触发范围（paths: 7 个 web 相关包路径，与 deploy-pages.yml 对齐）
  # 说明：MVP 刻意全量触发——F-01 正是 paths 漏配引发的缺陷，全量触发防再犯；9 包测试成本分钟级可接受

permissions:
  contents: read

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci --no-audit --no-fund

      # 按依赖序 build 全量（单一事实源：与 deploy-pages.yml:39-40 修复后命令一致，即 lgdl-web predev）
      - name: Build all packages (dependency order)
        run: npm run build --workspace @lgdl/lgdl-core --workspace @lgdl/lgdl-layout --workspace @lgdl/lgdl-router --workspace @lgdl/lgdl-render --workspace @lgdl/web-cli-base --workspace @lgdl/lgdl-web-cli --workspace @lgdl/lgdl-web-op-cli

      - name: Run all package tests
        run: npm run test --workspaces
```

**结构决策**：
- **单 job 合并**（build+test 不分离）：build 产物无需跨 job 传递（无 artifact 需求）；合并天然满足「build→test」顺序硬约束（R-004）；NFR-004「步骤数 ≥5 且无逐包嵌套循环」满足（6 步）。
- **两阶段硬约束**：先 build 全量 → 再 test 全量（lgdl-web 测试 import `@lgdl/*` 依赖 dist，写反必 TS2307；npm workspaces 顺序非拓扑，不得逐包串行）。
- **空测试包**：lgdl-cli / lgdl-layout 空跑 exit 0，CI 容忍（注释说明，Node 20 基准，NFR-001）。

**测试影响**：新增 CI 入口，不改变任何测试内容；首跑 = 420 基线自动化闸门。

**回归验证**：workflow 首跑（push/PR）全绿且与本地 `npm run test --workspaces` 结果一致。

### 3.3 F-03（中风险，P0）分组盒/泳道点击定位跨包断裂（方案 A，测试先行）

**核实**（2026-09-01 实测）：
- 发射点三处：`lgdl-render/src/index.ts:549`（datastream 泳道 `groups[${i}]`，i 来自 `groups.forEach((group, i)`）；`:585`（分组盒 `groups[${groupIdx}]`，:583 `groupIdx = groups.indexOf(group)`，:581-582 注释「loc 用原始文档序非绘制排序」）；`:1064`（gantt 泳道 `groups[${gi}]`，gi 同时用于 :1044 laneFills 取色）
- 守卫先例：`:427` `edgeIdx >= 0 ? data-lgdl-loc=... : ''`；`:595-599` initial 伪状态 `doc.nodes.findIndex((n) => n.id === initialId)` + `initIdx >= 0` 守卫（**findIndex by id 现成同款模式**）
- deriveGroups（`lgdl-core/src/groups.ts:24-33`）确认返回**新构造 LgdlGroup 对象**（`{id, contains, label?, attrs?}`，非 doc.nodes 节点引用）→ 必须按 id 反查
- svg.test.ts fixture（:166-175）：nodes = [a, b, g1(kind: group, contains:['a'])] → **g1 文档序索引 2**；断言 :190 `groups[0]`、:192 `locs.length >= 4`（nodes[0]/nodes[1]/edges[0]/groups[0] 现为 4 个 → 改后 nodes[2] 仍 4 个，保持成立）
- locate.test.ts fixture（:6-33）顶层 `groups:` 节（:24-26）+ 断言（:82-91 `groups[0]`/`groups[0].contains[1]`）为旧语法；locate.ts 已原生支持 `nodes[i]`（:10-11）与 `nodes[i].contains[j]`（:12-13 + locateListValue :156-177）→ 方案 A 下 locate.ts **零改动**

**改动文件**：
- `[MODIFY] packages/lgdl-render/src/index.ts`（3 处发射 + 1 个模块级 helper）
- `[MODIFY] packages/lgdl-render/src/svg.test.ts`（:190 断言 + 新增残留断言）
- `[MODIFY] packages/lgdl-web/src/locate.test.ts`（fixture 现代语法化 + 断言逐条更新）

**3.3.1 测试先行步骤（TDD 红绿节奏）**：

| 步骤 | 动作 | 预期 |
|------|------|------|
| S1 | locate.test.ts fixture 现代语法化 + 断言改 `nodes[i]`（详见 3.3.3） | `npm run test --workspace @lgdl/lgdl-web` 绿（locate.ts 通用路径已支持 nodes[i] → 此步验证 locate 侧兼容性，无红期） |
| S2 | svg.test.ts:190 断言 `groups[0]` → `nodes[2]`（+ 新增「无 groups[ 残留」断言） | `npm run test --workspace @lgdl/lgdl-render` **红**（renderer 仍发射 groups[0]）← 真正的 TDD 红锚点 |
| S3 | 改 renderer 三处发射（3.3.2） | render 测试**绿**；确认无 `data-lgdl-loc="groups[` 残留 |
| S4 | 全仓 `npm run test --workspaces` | 420 基线不降（NFR-001） |

**3.3.2 renderer 修改（index.ts）**：

模块级新增 helper（renderGeneral 与 renderGantt 共用；LgdlGroup 类型 :471 已导入，无需补 import）：

```ts
// F-03: group 节点在 doc.nodes 的文档序索引。
// deriveGroups 返回新构造对象（无节点引用）→ 按 id 反查；findIndex >= 0 守卫与 :427/:595 同款模式。
const groupNodeIdx = (doc: LgdlDocument, group: LgdlGroup): number =>
  doc.nodes.findIndex((n) => n.kind === 'group' && n.id === group.id);
```

三处发射逐一替换（统一 `idx >= 0` 守卫，防未来合成元素进入发射路径）：

| 位置 | 现状 | 改为 |
|------|------|------|
| :549 datastream 泳道 | `data-lgdl-loc="groups[${i}]"` | `data-lgdl-loc="nodes[${idx}]"`（`const idx = groupNodeIdx(doc, group)`；i 保留用于 laneX/fill） |
| :585 分组盒 | `data-lgdl-loc="groups[${groupIdx}]"`（:583 `groupIdx = groups.indexOf(group)`） | `data-lgdl-loc="nodes[${idx}]"`；:583 的 groupIdx 删除（仅 :585 使用，删除避免 lint 未用变量）；:581-582 注释更新为「nodes[i] 用原始文档序索引，非绘制排序」 |
| :1064 gantt 泳道 | `data-lgdl-loc="groups[${gi}]"` | `data-lgdl-loc="nodes[${idx}]"`（gi 保留用于 :1044 laneFills 取色） |

守卫语义（EC-001）：datastream 合成 `_default` 泳道只进 boxOf 计算（:465-466 lanes），不进入发射循环（:545 为 `groups.forEach`）→ 天然无 loc；三处 findIndex 守卫为双保险，与 :427 `edgeIdx >= 0` 同模式。

嵌套分组（EC-002）：派生 groups 含嵌套时 boxes 分层绘制（:556-576 orderedGroups），每 box 发射**自身 group** 的 findIndex 索引 → 内层 box 点击跳内层 group 节点行，保留现状行为；泳道（datastream/gantt）无嵌套，索引语义与分组盒统一（均文档序）。

**3.3.3 locate.test.ts fixture 现代语法化（行号逐条核对）**：

删除 :24-26 顶层 `groups:` 节（`'groups:'` / `'  - id: g1'` / `'    contains: [user, order]'`），在 nodes 节 order 节点（:15-17）后追加 g1 group 节点。**新 fixture 行号表（断言参数基准）**：

```
 1: type: uml-class           （不变）
 2: title: 示例               （不变）
 3: (空)                      （不变）
 4: nodes:                    （不变）
 5:   - id: user              （不变）
 6:     label: 用户            （不变）
 7:     kind: entity          （不变）
 8:     members:              （不变）
 9:       - kind: attribute   （不变）
10:         name: id           （不变）
11:         type: int          （不变）
12:       - kind: method       （不变）
13:         name: login        （不变）
14:         params: "(pwd: string)"  （不变）
15:   - id: order             （不变）
16:     label: 订单            （不变）
17:     kind: entity          （不变）
18:   - id: g1                ← 新（g1 节点，nodes 文档序索引 2）
19:     kind: group           ← 新
20:     contains: [user, order] ← 新（由原 :26 平移）
21: (空)                      ← 新
22: edges:                   ← 原 :19 下移 3 行
23:   - from: user            ← 原 :20
24:     to: order             ← 原 :21
25:     label: 拥有            ← 原 :22
```

**断言逐条更新（新旧映射）**：

| 现断言（行号） | 改为 | 新 lineSpan |
|--------------|------|------------|
| :51 `nodes[0]` | 不变 | line 5 |
| :53 / :60 `nodes[1]` | 不变 | line 15 |
| :64 / :65 `nodes[0].members[0/1]` | 不变 | line 9 / 12 |
| :69 / :70 deep paths | 不变 | line 12 / 9 |
| :76-79 label 值 span | 不变 | 值 span 语义 |
| :83 `edges[0]` | 不变（loc 字符串），**lineSpan 20 → 23** | line 23 |
| :84 `groups[0]` | → `nodes[2]` | line 25 → **line 18** |
| :88-90 `groups[0].contains[1]` | → `nodes[2].contains[1]`（'order' 值 span） | line 20 内联列表 |
| :94-95 line 2 | 不变 | line 2 |
| :102 `nodes[9]` null | 不变（g1 加入后 nodes 共 3 项，nodes[9] 仍越界 null ✓） | — |

**新增断言（建议，FR-006 验收覆盖）**：
- `locateIssue(SRC, 'nodes[2]')` → lineSpan(18)（group 节点行定位）
- `locateIssue(SRC, 'nodes[2].contains[0]')` → 'user'（行 20 内联列表成员定位）
- fixture 可解析验证：实施时用 `parseLgdl(SRC)`（或等价的 parser 导入断言）确认现代语法被 parser 接受（FR-006 验收）

**3.3.4 svg.test.ts 断言同步**：

- :190 `data-lgdl-loc="groups[0]"` → `data-lgdl-loc="nodes[2]"`（fixture :172 g1 为第 3 节点，文档序索引 2）
- 新增（NFR-003 直接单测）：`assert.ok(!svg.includes('data-lgdl-loc="groups['), 'no stale groups[] loc')`
- :192 `locs.length >= 4` 保持成立（nodes[0]/nodes[1]/edges[0]/nodes[2] = 4 个 ✓）

**测试影响**：svg.test.ts 断言 1 改 + 1 增；locate.test.ts fixture + 断言更新（含新增 2 条）；locate.ts 零改动。

**回归验证**：`npm run test --workspace @lgdl/lgdl-render --workspace @lgdl/lgdl-web`；全仓 `--workspaces`；validate 实测（FR-007）：group-node-demo 类现代文档渲染后点击分组盒/泳道 → 编辑器跳转 group 节点源码行。

### 3.4 F-04（低-中风险，P1）web-fetch 注册进 OpenAI 兼容端点 tools

**核实**：`provider.ts` — :17 import WEB_FETCH_TOOL（web-cli-base）；:248 注释自证「W-D1 现场保留」；:249 isClaude 仅 :249-250 使用（grep 确认无其他引用）；:250-267 Claude 分支 3 工具；:268-279 OpenAI 兼容分支仅 2 工具（缺 WEB_FETCH）；:280-289 llmChat 调用。工具名常量已核实：`'lgdl-web-cli'`（lgdl-web-cli/src/tools.ts:19）、`'lgdl-web-op-cli'`（lgdl-web-op-cli/src/tool.ts:21）、`'web-fetch'`（web-cli-base/src/tools.ts:19）。provider.test.ts 现有 13 用例全部围绕 PROVIDERS/localStorage，不涉及 chat/tools（:1-60 已核实）。

**改动文件**：
- `[MODIFY] packages/lgdl-web/src/ai/provider.ts`（提取 buildTools + chat() 简化）
- `[MODIFY] packages/lgdl-web/src/ai/provider.test.ts`（+2 用例）

**3.4.1 实施（Q-① 决策：提取 buildTools 公共构造 + 单测）**：

1. **provider.ts** 在 chat() 之前（:246 前）新增模块级导出函数：
   ```ts
   /** 三工具同构组装——Claude 与 OpenAI 兼容端点共用（F-04：消除双份组装漂移，OpenAI 端点补齐 web-fetch）。 */
   export function buildTools(): { name: string; description: string; parameters: unknown }[] {
     return [
       { name: WEB_CLI_TOOL.function.name, description: WEB_CLI_TOOL.function.description, parameters: WEB_CLI_TOOL.function.parameters },
       { name: WEB_OP_TOOL.function.name, description: WEB_OP_TOOL.function.description, parameters: WEB_OP_TOOL.function.parameters },
       { name: WEB_FETCH_TOOL.function.name, description: WEB_FETCH_TOOL.function.description, parameters: WEB_FETCH_TOOL.function.parameters },
     ];
   }
   ```
2. **chat() :249-279** 三元分支整体替换为 `const tools = buildTools();`；isClaude（:249）删除（grep 确认无其他引用）；:248 注释更新为「三工具统一组装（F-04：OpenAI 兼容端点补齐 WEB_FETCH_TOOL，与 Claude 端点对齐）」
   - 边界解读：spec「不改动 isClaude 分支（263-266）」= 不改变 Claude 端点行为——Claude 分支 3 工具内容原样进入 buildTools()，行为等价；OpenAI 分支 2→3 工具即修复本体（FR-008 验收）
   - 工具顺序：WEB_CLI → WEB_OP → WEB_FETCH（fetch 末尾，与现 Claude 分支一致，避免 tool_choice 优先序变化）
3. **provider.test.ts** 新增用例（import buildTools）：
   ```ts
   test('F-04: buildTools exposes all three tools in stable order', () => {
     const tools = buildTools();
     assert.deepEqual(tools.map((t) => t.name), ['lgdl-web-cli', 'lgdl-web-op-cli', 'web-fetch']);
   });

   test('F-04: OpenAI-compatible endpoints share the three-tool set (claude parity)', () => {
     const nonClaude = PROVIDERS.filter((p) => p.id !== 'claude');
     assert.equal(nonClaude.length, 7); // openai/deepseek/qwen/tencent/volc/volc-coding/volc-plan
     for (const p of nonClaude) assert.ok(p.baseURL, `${p.id} is OpenAI-compatible`);
     // 工具集一致由 chat() 统一走 buildTools() 的结构保证（代码审查点）
   });
   ```
   （第二用例断言 7 个非 claude provider 均为 baseURL 型 OpenAI 兼容配置；工具集一致由 chat() 统一调用 buildTools() 的结构保证）

**测试影响**：provider.test.ts +2 用例（现有 13 用例不受影响——不 import chat/buildTools）；provider.test.ts 的 tsc 编译验证 buildTools 导出存在（若测试先行会红，建议与实现同 commit 或测试先行同 F-03 节奏）。

**回归验证**：`npm run test --workspace @lgdl/lgdl-web --workspace @lgdl/web-cli-base`（llm.test.ts 现有分发用例覆盖工具数变化，FR-009）；validate 实测 OpenAI 兼容端点 tools 列表含 web-fetch。

### 3.5 F-05（低风险，P1）preview-click 假成功反馈修复

**核实**：`App.tsx` — :927-937 jumpToIssue 三处静默 return（:929 editor 空/location 空、:931 span null）；:1009-1014 preview-click 无条件成功（:1012 忽略 jumpToIssue 返回值）；:1015-1028 preview-hover 失败文案（:1024）含 `groups[0]`（EC-003 连带项）；调用点 :1214/:1218（onLocate prop，TS 允许返回 boolean 函数赋给 void 返回位）与 :1261（onClick 忽略返回值）均兼容。

**改动文件**：`[MODIFY] packages/lgdl-web/src/App.tsx`（3 处联动）

1. **jumpToIssue :927-937** 返回类型 `void` → `boolean`：
   ```ts
   const jumpToIssue = useCallback((location: string | undefined): boolean => {
     const view = editorViewRef.current;
     if (!view || !location) return false;      // ① editor 未挂载 / location 缺失
     const span = locateIssue(view.state.doc.toString(), location);
     if (!span) return false;                    // ② locate 失败（含现代语法下 groups[i] 等无效 loc）
     view.dispatch({ selection: { anchor: span.from }, effects: EditorView.scrollIntoView(span.from, { y: 'center' }) });
     view.focus();
     return true;                                // ③ 成功
   }, []);
   ```
2. **preview-click :1009-1014** 按返回值反馈：
   ```ts
   reg.register('preview-click', (args) => {
     const loc = args.loc;
     if (!loc) return '✖ preview-click 需要 loc 参数（如 nodes[3]）';
     const ok = jumpToIssue(loc);
     return ok ? `✓ 已定位到 ${loc}（编辑器已跳转）` : `✖ 未定位到 ${loc}（locate 失败）`;
   });
   ```
3. **EC-003 连带（plan 确认：随 F-03 同批改）**：preview-hover :1024 失败文案 `（试试 nodes[3] / edges[1] / groups[0]）` → `（试试 nodes[3] / edges[1]）`（方案 A 后 SVG 不存在 groups[0] 元素，示例去掉避免误导）

**调用点兼容**：:1214/:1218/:1261 零改动（均已核实忽略返回值 / 类型兼容）。

**测试影响**：无直接单测（React 组件无测试文件）；locate.test.ts 保持绿（locate 层单测覆盖，F-03 同批）。

**回归验证**：`npm run build --workspace @lgdl/lgdl-web`（vite build 类型检查）；validate 手测三态：loc 缺失 → 参数文案；loc 无效（如 `groups[0]` 现代语法）→ 「✖ 未定位到（locate 失败）」；loc 有效 → 「✓ 已定位」；issue 列表点击仍正常跳转。

## 4. 风险矩阵

| # | 风险 | 影响 | 缓解措施 |
|---|------|------|---------|
| R-001 | F-03 方案 A 改 renderer → svg.test.ts:190 断言失效（`groups[0]` → `nodes[2]`） | 中 | **测试先行**（S2 先改断言红 → S3 改 renderer 绿）；断言字符串变化已在 3.3.4 精确定义 |
| R-002 | F-03 与 F-05 共享 locate 链路，任一侧修复影响另一侧（jumpToIssue 返回值依赖 locateIssue 解析结果） | 中 | **同批交付**（F-03 + F-05 同一实施批次）；全仓回归；validate 端到端实测 |
| R-003 | F-04 工具数 2→3 与 web-cli-base llmChat 三工具分发（FR-023）交互 | 低-中 | buildTools 单测 + llm.test.ts 现有分发用例回归（FR-009）+ validate 实测端点 tools 列表 |
| R-004 | F-02 CI 若先 test 后 build → lgdl-web 测试 TS2307（依赖其他包 dist） | 中 | ci.yml 单 job 顺序 steps 硬约束（build 全量 → test 全量）；review 检查步骤顺序 |
| R-005 | F-01 router 构建位置错误（render 之后）→ 构建仍失败 | 低 | 插入位置明确为 layout 与 render 之间；验收含本地同命令验证；顺序对照 lgdl-web predev |
| R-006 | locate.test.ts fixture 现代语法化导致行号连锁失效（行号是 lineSpan 断言参数） | 中 | **新 fixture 行号表逐条核对**（3.3.3 已给出完整新旧映射）；实施后全量运行 locate 用例验证 |
| R-007（新增） | buildTools 提取后 provider.test.ts tsc 编译依赖新导出符号 | 低 | 测试与实现同 commit（或测试先行红→绿）；导出名稳定（buildTools） |
| R-008（新增） | isClaude 变量删除引发 lint/类型问题 | 低 | 已 grep 确认仅 :249-250 使用；实施时再 grep 复核一次 |
| R-009 | CI 环境与本地差异（Node 版本/glob 行为，lgdl-cli/lgdl-layout 空测试） | 低 | Node 20 基准（与 setup-node 版本一致）；空跑 exit 0 已实测；失败时以本地结果对照（A-002） |

## 5. 工作量估算

| 项 | 内容 | 估时 |
|----|------|------|
| F-01 | deploy-pages.yml 两处（paths + build） | 0.25h |
| F-02 | 新建 ci.yml（含结构决策） | 1h |
| F-03 | fixture 行号核对 + 双测试同步 + renderer 3 处发射（测试先行） | 3h |
| F-04 | buildTools 提取 + chat 简化 + 2 用例 | 1h |
| F-05 | jumpToIssue 返回值 + preview-click 反馈 + hover 文案 | 0.75h |
| 回归 | 全仓 test --workspaces + 各包专项 + validate 手测 | 0.5h |
| **合计** | | **≈ 6.5h（约 1 人日）** |

## 6. 回归验证总表（NFR 验收映射）

| 验证 | 命令/方式 | 覆盖 |
|------|----------|------|
| NFR-001 全仓测试守恒 | `npm run test --workspaces` | 420 基线不降；svg/locate/provider 新断言全过 |
| NFR-002 对外接口零破坏 | `npm run build --workspace @lgdl/lgdl-web` | F-05 返回类型变化编译通过；F-04 chat 签名不变 |
| NFR-003 loc 输出语义可信 | svg.test.ts 新增 `!includes('data-lgdl-loc="groups[')` 断言 | renderer 无 groups[ 残留 |
| NFR-004 CI 效率 | ci.yml 步骤数 ≥5、无嵌套循环（设计已满足，6 步） | F-02 两阶段 |
| F-01 合入前置 | 本地 npm ci + 修复后 build 命令跑通 | deploy-pages.yml 修复有效性 |
| F-02 CI 首跑 | ci.yml push/PR 触发 | 420 基线自动化闸门 |
| F-03 端到端（FR-007） | validate：现代文档点击分组盒/泳道 → 跳转 group 源码行 | render→locate 链路打通 |
| F-04 端点实测（FR-009） | validate：OpenAI 兼容端点 tools 含 web-fetch | 7 配置能力对齐 |
| F-05 交互三态 | validate 手测（缺失/失败/成功反馈 + issue 列表点击） | AI 反馈真实 |

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建 — 轻量 plan：5 项实施设计（含精确改动点文件:行号）+ 开放问题 ①②③ 决策表 + 风险矩阵（6 项迁移 + 2 项新增）+ 工作量 ≈6.5h | 2026-09-01 | SDDU Plan Agent |
