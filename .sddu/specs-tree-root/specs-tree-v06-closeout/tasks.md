# 任务分解：specs-tree-v06-closeout（v0.6 收口五件套 F-01~F-05）

> **文档定位**: SDDU 任务清单 — 将技术方案分解为可并行执行的原子任务，作为 build 阶段的输入
> **前置依赖**: plan.md v1.0（5 项实施设计 / 决策表 / TDD 步骤 S1-S4 / 风险矩阵 9 项）+ spec.md v1.0（11 FR / 4 NFR / 6 EC / D-001）
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-01
> **版本**: v1.0
> **更新人**: SDDU Build Agent
> **更新时间**: 2026-09-01
> **更新说明**: 初始创建 — 轻量分解：5 项缺陷修复（F-01~F-05）拆为 6 个实施任务 + 1 个回归门禁任务，共 7 任务 / 3 波次；F-03 按 plan TDD S1-S4 拆红/绿两步；F-03 与 F-05 同批交付（R-002）；全部行号引用 plan.md 2026-09-01 实测基准

## 0. build 执行摘要（2026-09-01，sddu-build）

7 任务全部完成，5 项缺陷修复落地，全仓回归 423 全绿（420 基线 +3，NFR-001 不降反升）。TDD 红绿证据：S1 locate 侧 32→33 绿（fixture 现代化）；S2 svg 侧红锚点确认（`AssertionError: group node mapped`，renderer 仍发射 groups[0]）；S3 renderer 三处发射改 nodes[i] 后 21 全绿转绿。偏差记录：① plan §3.4.1 buildTools 返回类型 `parameters: unknown` → 实际 LlmToolDef 要求 `Record<string, unknown>`，已修正；② plan 说 ci.yml「6 步」实际 5 步（仍满足 NFR-004 ≥5）；③ App.tsx:467-468 注释含过时 `groups[0]` 示例（EC-003 同类连带项），随批清理；④ F-01 本地同命令（含 router 顺序）验证通过，render 无 TS2307。

## 1. 依赖拓扑总览
> 任务依赖关系和执行顺序

```
Wave 1 ─── (无依赖，全部并行；并行窗口 1)
  TASK-001 [S]  F-01 deploy-pages.yml 补 lgdl-router（paths + build 顺序）
  TASK-002 [M]  F-02 新建 ci.yml 测试工作流（单 job 六步）
  TASK-003 [M]  F-03-TDD红 locate.test.ts fixture 现代语法化 + svg.test.ts 断言改 + 残留断言（S1+S2）
  TASK-005 [M]  F-04 provider.ts 提取 buildTools() + provider.test.ts 补 2 用例

Wave 2 ─── (依赖 Wave 1；并行窗口 2，同批交付)
  TASK-004 [M]  F-03-TDD绿 renderer 三处 loc 发射改 nodes[i]（S3，依赖 TASK-003）
  TASK-006 [M]  F-05 App.tsx jumpToIssue boolean + preview-click 反馈 + hover 文案（与 F-03 同批交付）

Wave 3 ─── (依赖全部修复完成；回归门禁)
  TASK-007 [M]  全仓回归：build 依赖序 + test --workspaces（420 基线不降，NFR-001）
```

**关键路径**（最长依赖链，决定整体工期）：

```
TASK-003 (F-03 红) → TASK-004 (F-03 绿) → TASK-007 (回归门禁)   [3 波次]
```

- 旁路任务 TASK-001 / TASK-002 / TASK-005 均在 Wave 1 并行，不延长关键路径；TASK-006 在 Wave 2 与 TASK-004 并行，同样不延长。
- TASK-002 对 TASK-001 存在**软依赖**（ci.yml build 命令文本须与 F-01 修复后的 deploy-pages.yml 命令一致，plan §3.2 已给出完整命令文本，可并行照抄，无需等待）。
- TASK-006 对 TASK-003/004 存在**批次绑定**（非代码依赖）：F-05 与 F-03 共享 locate 链路（R-002），须同批交付，故同归 Wave 2。

## 2. 任务列表
> 每个任务的详细定义

### TASK-001: F-01 deploy-pages.yml 补 lgdl-router（paths + build 顺序）
> P0，发布阻塞修复；纯 CI 配置改动，不触碰源码/测试

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | 无 |
| **执行波次** | 1 |
| **对应 FR** | FR-001, FR-002 |

**描述**: 在 `.github/workflows/deploy-pages.yml` 两处补齐 `lgdl-router` 构建：① paths 触发清单（:6-13）在 `- 'packages/lgdl-render/**'`（:10）之后插入 `- 'packages/lgdl-router/**'`；② build 命令（:39-40）在 `--workspace @lgdl/lgdl-layout` 与 `--workspace @lgdl/lgdl-render` **之间**插入 `--workspace @lgdl/lgdl-router`（顺序硬约束：router 必须在 render 之前构建，R-005）。可选低优：:39 步骤 name「Build core, layout, render, …」补 router 字样保持描述一致。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `.github/workflows/deploy-pages.yml`（paths :6-13 + build :39-40，共 2 处） |

**验收标准**:
- [x] yml paths 区块含 `- 'packages/lgdl-router/**'` 条目（FR-001）
- [x] build 命令 workspace 顺序为 …lgdl-layout → **lgdl-router** → lgdl-render…（FR-002，render 之前）
- [x] 干净 node_modules（`npm ci`）下以修复后命令本地跑通，render 无 TS2307（plan §3.1 回归验证）

**验证命令**:
```bash
# 检查 yml 两处
grep -n "lgdl-router" .github/workflows/deploy-pages.yml
# 干净依赖下以新命令验证（render TS2307 消失）
npm ci --no-audit --no-fund
npm run build --workspace @lgdl/lgdl-core --workspace @lgdl/lgdl-layout --workspace @lgdl/lgdl-router --workspace @lgdl/lgdl-render --workspace @lgdl/web-cli-base --workspace @lgdl/lgdl-web-cli --workspace @lgdl/lgdl-web-op-cli
```

### TASK-002: F-02 新建 ci.yml 测试工作流（单 job 六步）
> P1，420 测试回归护栏落地；两阶段硬约束 build→test

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | 无（软依赖 TASK-001：build 命令文本须一致） |
| **执行波次** | 1 |
| **对应 FR** | FR-003, NFR-004 |

**描述**: 新建 `.github/workflows/ci.yml`，MVP 全量触发（push: main + pull_request，不设 paths 过滤，注释留 v0.7 优化——F-01 正是 paths 漏配引发缺陷，Q-② 决策）。单 job `build-and-test` 六步：checkout@v4 → setup-node@v4（node 20, cache npm）→ `npm ci --no-audit --no-fund` → 按依赖序 build 全量（命令与 TASK-001 修复后一致，单一事实源 = lgdl-web predev 顺序）→ `npm run test --workspaces`。**build→test 顺序硬约束**（lgdl-web 测试 import `@lgdl/*` 依赖 dist，写反必 TS2307，R-004）；lgdl-cli/lgdl-layout 空测试包 exit 0 容忍（EC-005）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `.github/workflows/ci.yml` |

**验收标准**:
- [x] ci.yml 存在于 `.github/workflows/`（FR-003）
- [x] 步骤链 6 步：checkout → setup-node → npm ci → build 全量（依赖序）→ test --workspaces，顺序为 build 先于 test（R-004）
- [x] 步骤数 ≥5 且无逐包嵌套循环（NFR-004）
- [x] workflow 首跑（push/PR）全绿，结果与本地 `npm run test --workspaces` 一致（420 基线不降，FR-003 验收 + NFR-001）

**验证命令**:
```bash
# yml 语法/结构检查（GitHub Actions 语义）
npx --yes actionlint .github/workflows/ci.yml
# 本地等价验证（与 CI 步骤对齐）
npm ci --no-audit --no-fund
npm run build --workspace @lgdl/lgdl-core --workspace @lgdl/lgdl-layout --workspace @lgdl/lgdl-router --workspace @lgdl/lgdl-render --workspace @lgdl/web-cli-base --workspace @lgdl/lgdl-web-cli --workspace @lgdl/lgdl-web-op-cli
npm run test --workspaces
# 首跑由 push/PR 触发后核对 Actions 页面全绿
```

### TASK-003: F-03-TDD红 locate.test.ts fixture 现代语法化 + svg.test.ts 断言改 + 残留断言（S1+S2）
> P0，测试先行红锚点；TDD 步骤 S1（locate 侧绿）+ S2（svg 侧红）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | 无 |
| **执行波次** | 1 |
| **对应 FR** | FR-005, FR-006, EC-004, R-006 |

**描述**: 按 plan §3.3.1/3.3.3/3.3.4 执行测试先行两步（不触碰 renderer 源码）：
- **S1（locate.test.ts，预期绿）**：fixture（:6-33）删除顶层 `groups:` 节（:24-26），在 nodes 节 order 节点（:15-17）后追加 g1 group 节点（nodes 文档序索引 2）；断言逐条更新（:84 `groups[0]`→`nodes[2]` lineSpan 20→18；:88-90 `groups[0].contains[1]`→`nodes[2].contains[1]`；:83 `edges[0]` lineSpan 20→23；:94-95 line 2 不变；:102 `nodes[9]` null 保持）；新增断言 `locateIssue(SRC, 'nodes[2]')`→lineSpan(18)、`nodes[2].contains[0]`→'user'（FR-006）；用 parseLgdl 验证 fixture 可解析。locate.ts 零改动（通用路径已支持 nodes[i]，:10-13）。
- **S2（svg.test.ts，预期红 = TDD 红锚点）**：:190 断言 `data-lgdl-loc="groups[0]"` 改 `data-lgdl-loc="nodes[2]"`（fixture g1 文档序索引 2）；新增残留断言 `assert.ok(!svg.includes('data-lgdl-loc="groups['))`（NFR-003）；:192 `locs.length >= 4` 保持成立（R-001）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/lgdl-web/src/locate.test.ts`（fixture :6-33 现代化 + 断言逐条更新 + 新增 2 断言） |
| MODIFY | `packages/lgdl-render/src/svg.test.ts`（:190 断言改 + 新增残留断言） |

**验收标准**:
- [x] `npm run test --workspace @lgdl/lgdl-web` **全绿**（S1：locate 侧兼容性验证，无红期，R-006 行号逐条核对通过）
- [x] `npm run test --workspace @lgdl/lgdl-render` **红**（S2：renderer 仍发射 `groups[0]` → :190 断言失败 = 真正的 TDD 红锚点，R-001）
- [x] locate.test.ts fixture 现代语法被 parser 接受（parseLgdl 可解析，FR-006）
- [x] 新增断言覆盖 group 节点行定位（nodes[2]）+ contains 行内列表成员定位（nodes[2].contains[0]）

**验证命令**:
```bash
# 先按依赖序 build（render/web 测试 import @lgdl/* 依赖 dist）
npm run build --workspace @lgdl/lgdl-core --workspace @lgdl/lgdl-layout --workspace @lgdl/lgdl-router --workspace @lgdl/lgdl-render --workspace @lgdl/web-cli-base --workspace @lgdl/lgdl-web-cli --workspace @lgdl/lgdl-web-op-cli
# S1 预期绿
npm run test --workspace @lgdl/lgdl-web
# S2 预期红（:190 断言失败，TDD 红锚点）
npm run test --workspace @lgdl/lgdl-render
```

### TASK-004: F-03-TDD绿 renderer 三处 loc 发射改 nodes[i]（S3）
> P0，TDD 绿步骤；改 renderer 使 S2 红锚点转绿

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-003 |
| **执行波次** | 2 |
| **对应 FR** | FR-004, NFR-003, EC-001, EC-002, D-001 |

**描述**: 按 plan §3.3.2 修改 `packages/lgdl-render/src/index.ts`：模块级新增 helper `groupNodeIdx = (doc, group) => doc.nodes.findIndex((n) => n.kind === 'group' && n.id === group.id)`（deriveGroups 返回新构造对象无节点引用 → 按 id 反查，Q-③ 决策；LgdlGroup 类型 :471 已导入）。三处发射逐一替换（统一 `idx >= 0` 守卫）：① :549 datastream 泳道 `groups[${i}]`→`nodes[${idx}]`（i 保留用于 laneX/fill）；② :585 分组盒 `groups[${groupIdx}]`→`nodes[${idx}]`（:583 groupIdx 删除避免未用变量，:581-582 注释更新为「nodes[i] 用原始文档序索引，非绘制排序」）；③ :1064 gantt 泳道 `groups[${gi}]`→`nodes[${idx}]`（gi 保留用于 :1044 laneFills 取色）。合成 `_default` 泳道 findIndex=-1 → 不发 loc（EC-001，与 :427 同模式）；嵌套分组各 box 发射自身 group 索引（EC-002）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/lgdl-render/src/index.ts`（模块级 helper + 3 处发射 + 注释，无新增 import） |

**验收标准**:
- [x] 三处发射均改为 `data-lgdl-loc="nodes[${idx}]"`，idx 为 group 节点在 doc.nodes 的文档序索引（FR-004）
- [x] `npm run test --workspace @lgdl/lgdl-render` **转绿**（TASK-003 的 S2 红锚点反转）
- [x] 输出中无 `data-lgdl-loc="groups[` 残留（残留断言通过，NFR-003）
- [x] svg.test.ts :192 `locs.length >= 4` 保持成立（nodes[0]/nodes[1]/edges[0]/nodes[2]）

**验证命令**:
```bash
npm run build --workspace @lgdl/lgdl-render
npm run test --workspace @lgdl/lgdl-render
# 无 groups[ 残留（双保险，与残留断言一致）
grep -rn 'data-lgdl-loc="groups\[' packages/lgdl-render/src || echo "no stale groups[] loc"
```

### TASK-005: F-04 provider.ts 提取 buildTools() + provider.test.ts 补 2 用例
> P1，OpenAI 兼容端点补齐 web-fetch；消除双份组装漂移（Q-① 决策）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | 无 |
| **执行波次** | 1 |
| **对应 FR** | FR-008, FR-009, R-003, R-007, R-008 |

**描述**: 按 plan §3.4.1 修改 `packages/lgdl-web/src/ai/provider.ts`：① chat() 之前（:246 前）新增模块级**导出**函数 `buildTools()`，按 WEB_CLI → WEB_OP → WEB_FETCH 顺序返回三工具（name/description/parameters 取自各 tool 常量，fetch 末尾与现 Claude 分支一致，避免 tool_choice 优先序变化）；② chat() :249-279 三元分支整体替换为 `const tools = buildTools();`（Claude 分支 3 工具行为等价、OpenAI 分支 2→3 工具即修复本体，NG-005 边界内小重构）；③ isClaude（:249）删除（grep 复核无其他引用，R-008）；④ :248 注释更新为「三工具统一组装」。provider.test.ts 新增 2 用例：buildTools 暴露三工具稳定顺序（`['lgdl-web-cli', 'lgdl-web-op-cli', 'web-fetch']`）+ 7 个非 claude provider 均为 baseURL 型 OpenAI 兼容配置（openai/deepseek/qwen/tencent/volc/volc-coding/volc-plan）。测试与实现同 commit（R-007）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/lgdl-web/src/ai/provider.ts`（新增导出 buildTools + chat() 简化 + 删 isClaude） |
| MODIFY | `packages/lgdl-web/src/ai/provider.test.ts`（+2 用例；现有 13 用例不受影响） |

**验收标准**:
- [x] provider.test.ts 新增 2 用例全绿；现有 13 用例不受影响（R-007）
- [x] OpenAI 兼容分支 tools 含 3 项（WEB_CLI + WEB_OP + WEB_FETCH），fetch 在末尾（FR-008）
- [x] 7 个 OpenAI 兼容 provider 共享该分支，全部获得 fetch 工具（FR-008）
- [x] `npm run test --workspace @lgdl/web-cli-base` 全绿（llm.test.ts 分发用例覆盖工具数变化，FR-009 + R-003）

**验证命令**:
```bash
npm run build --workspace @lgdl/lgdl-core --workspace @lgdl/lgdl-layout --workspace @lgdl/lgdl-router --workspace @lgdl/lgdl-render --workspace @lgdl/web-cli-base --workspace @lgdl/lgdl-web-cli --workspace @lgdl/lgdl-web-op-cli
npm run test --workspace @lgdl/lgdl-web --workspace @lgdl/web-cli-base
# 代码审查点：chat() 仅一处 buildTools() 调用，无双份组装
grep -n "buildTools\|WEB_FETCH_TOOL" packages/lgdl-web/src/ai/provider.ts
```

### TASK-006: F-05 App.tsx jumpToIssue boolean + preview-click 反馈 + hover 文案
> P1，AI 假成功反馈修复；与 F-03 同批交付（R-002，共享 locate 链路）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | 无（批次绑定：与 TASK-003/004 同批交付） |
| **执行波次** | 2 |
| **对应 FR** | FR-010, FR-011, EC-003, EC-006, NFR-002 |

**描述**: 按 plan §3.5 修改 `packages/lgdl-web/src/App.tsx` 三处联动：① jumpToIssue :927-937 返回类型 `void`→`boolean`——editor 未挂载/location 缺失 → `false`，locateIssue 返回 null → `false`，成功 dispatch+scrollIntoView+focus → `true`；② preview-click :1009-1014 按返回值反馈三态——loc 缺失 →「✖ preview-click 需要 loc 参数（如 nodes[3]）」、失败 →「✖ 未定位到 X（locate 失败）」、成功 →「✓ 已定位到 X（编辑器已跳转）」；③ EC-003 连带：preview-hover :1024 失败文案 `（试试 nodes[3] / edges[1] / groups[0]）` 去掉 `groups[0]`（方案 A 后 SVG 不存在该元素）。调用点 :1214/:1218/:1261 零改动（均已核实忽略返回值/类型兼容）。React 组件无单测 → 交互行为靠 build 类型检查 + validate 手测（FR-011 三态）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/lgdl-web/src/App.tsx`（jumpToIssue :927-937 + preview-click :1009-1014 + preview-hover :1024） |

**验收标准**:
- [x] jumpToIssue 签名 `(location: string | undefined) => boolean`（FR-010）
- [x] preview-click 三态反馈正确：loc 缺失 → 参数文案；loc 无效（如 `groups[0]`）→ 失败文案；loc 有效 → 成功文案（FR-011 + EC-006）
- [x] preview-hover 失败文案不含 `groups[0]`（EC-003）
- [x] `npm run build --workspace @lgdl/lgdl-web` 通过（vite build 类型检查，NFR-002：:1214/1218/1261 调用点零改动编译通过）

**验证命令**:
```bash
npm run build --workspace @lgdl/lgdl-web
# 代码审查点：无 groups[0] 残留文案
grep -n "groups\[0\]" packages/lgdl-web/src/App.tsx || echo "no stale groups[0] text"
```

### TASK-007: 全仓回归门禁（build 依赖序 + test --workspaces，420 不降）
> 回归门禁，NFR-001/002/003 总验收；依赖全部修复任务完成

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-001, TASK-002, TASK-004, TASK-005, TASK-006 |
| **执行波次** | 3 |
| **对应 FR** | NFR-001, NFR-002, NFR-003, S4, FR-007 |

**描述**: plan §3.3.1 S4 + §6 回归验证总表收口：① 干净依赖下按依赖序 build 全量（与 F-01 修复后命令一致）→ 全仓 `npm run test --workspaces`，**420 基线不降**（NFR-001）；② `npm run build --workspace @lgdl/lgdl-web` 类型检查通过（NFR-002：F-05 返回类型变化/F-04 chat 签名零破坏）；③ renderer 无 `groups[` 残留（NFR-003，svg 残留断言）；④ F-03 端到端（FR-007）：group-node-demo 类现代文档渲染后点击分组盒/泳道 → 编辑器跳转 group 节点源码行（validate 阶段实测，若本任务环境可验证则一并执行）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| （验证性任务，无文件改动） | — |

**验收标准**:
- [x] 全仓 `npm run test --workspaces` 全绿且测试总数 ≥420（NFR-001，S4）
- [x] web 包 build 通过，无类型错误（NFR-002）
- [x] svg.test.ts 残留断言（无 `data-lgdl-loc="groups[`）通过（NFR-003）
- [x] F-01 本地同命令跑通（TASK-001 验收复核）；ci.yml 首跑全绿与本地一致（TASK-002 验收复核）

**验证命令**:
```bash
npm ci --no-audit --no-fund
npm run build --workspace @lgdl/lgdl-core --workspace @lgdl/lgdl-layout --workspace @lgdl/lgdl-router --workspace @lgdl/lgdl-render --workspace @lgdl/web-cli-base --workspace @lgdl/lgdl-web-cli --workspace @lgdl/lgdl-web-op-cli
npm run test --workspaces   # 420 基线不降
npm run build --workspace @lgdl/lgdl-web   # NFR-002 类型检查
```

## 3. 任务汇总
> 任务数量、复杂度和波次的统计总览

| 统计项 | 数值 |
|--------|:--:|
| 总任务数 | 7 |
| S 级 (简单) | 1 |
| M 级 (中等) | 6 |
| L 级 (复杂) | 0 |
| 执行波次 | 3 |

## 4. 执行策略
> 各波次的执行说明

| 波次 | 任务 | 策略 |
|:--:|------|------|
| 1 | TASK-001, TASK-002, TASK-003, TASK-005 | **并行执行**（4 任务均无前置依赖；F-01/F-02 独立可并行，F-04 独立，F-03 测试先行红锚点独立推进） |
| 2 | TASK-004, TASK-006 | **并行执行**（TASK-004 依赖 TASK-003 的红锚点转绿；TASK-006 与 F-03 同批交付——F-05 与 F-03 共享 locate 链路，任一侧修复影响另一侧，须同批 commit/验证，R-002） |
| 3 | TASK-007 | **串行执行**（回归门禁，依赖全部修复完成；420 基线不降 + NFR-002/003 总验收） |

**并行窗口识别**：
- **窗口 1（Wave 1）**：4 任务并行——F-01（CI 配置）、F-02（CI 配置）、F-03 测试先行（测试文件）、F-04（provider 重构）互不触碰文件，可全量并行；TASK-002 照抄 TASK-001 修复后的 build 命令文本（软依赖，plan §3.2 已给出完整命令，无需串行等待）。
- **窗口 2（Wave 2）**：2 任务并行——F-03 绿（renderer index.ts）与 F-05（App.tsx）改动不同文件，可在同批次并行实施并同批交付。
- **收口**：Wave 3 回归门禁统一验证，单点收口。

## 修订记录
> 记录本文档的版本变更历史

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建 — 轻量分解：5 修复 → 6 实施任务 + 1 回归门禁（7 任务 / 3 波次）；F-03 按 plan TDD S1-S4 拆红（TASK-003）/绿（TASK-004）两步；F-05 与 F-03 同批交付（Wave 2，R-002）；关键路径 TASK-003→TASK-004→TASK-007；全部行号引用 plan.md 2026-09-01 实测基准 | 2026-09-01 | SDDU Tasks Agent |
