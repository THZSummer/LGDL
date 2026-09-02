# 任务分解：specs-tree-render-gate（补全 LGDL 门禁测试用例）

> **文档定位**: SDDU 任务清单 — 将技术方案分解为可并行执行的原子任务，作为 build 阶段的输入
> **前置依赖**: plan.md（技术方案：4 ADR / 测试架构 / 23 项文件变更 / 快照生成流程 / CI 接入 / 风险矩阵）、spec.md（12 FR / 6 NFR / 8 EC / D-001~006）
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-02
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-09-02
> **更新说明**: 初始创建 — 按「helper 先行 → 矩阵/快照/自测并行 → B 档顺序追加 → 总回归」分解为 13 任务 4 波次；覆盖 plan §5 全部 23 项文件变更（ADR-001~004 已在 plan 阶段落盘，不重复建档）+ 快照首建 + 审计自测 + CI 验证；实测基线：render 21 例全绿、全仓 437、dist/index.js sha256=2ec5c0a5…

## 0. 范围与前置说明

- **本 Feature 形态 = 纯测试代码编写**（无 src 业务改动，NG-001/NFR-001）：交付物全部落在 `packages/lgdl-render/` 测试侧 + 测试资产 + tsconfig 一行 exclude。
- **ADR-001~004 已完成**（plan 阶段落盘，见目录 ADR-*.md），本 tasks 不再为其建档，任务直接引用其决策。
- **23 项文件变更全覆盖映射**：test-support 4 文件（TASK-001/003/004/005）+ 6 个测试文件（TASK-006/007/008/009/010/011→012 共编 matrix-b.test.ts）+ golden 11 svg + manifest（TASK-009）+ tsconfig exclude 一行（TASK-002）。
- **零改动面**（验收在 TASK-013 统一核查）：render `package.json`、`.github/workflows/ci.yml`、引擎 4 包 src 业务文件、examples/ 磁盘产物（NG-002/NG-005）。
- **tasks 阶段微决策**（供 review 复核）：
  1. plan §6.2 提及的 `snapshot 模块 compareOne(id, svg)` 不落地为 snapshot.test.ts 导出——B3/B4a/B4b/B9 语义锁文档无 golden 资产 id，跨 `*.test.ts` import 会触发 node --test 双进程重复注册副作用。**实现替代**：matrix-b 内以「二次渲染字节一致（引擎确定性 A-002）+ 元素级现状断言」锁定现状（TASK-011/012）；golden 资产保持 plan §2.2/ADR-003 的 11 组上限，如需把 B 语义锁文档升级为字节级跨提交基线 → build/validate 阶段经 EC-008 审批扩展 manifest ids。
  2. B7（U-2：gantt 依赖垂直段穿条风险）与 B9（`_other` 无底框）若实测现真红 → 走 EC-001 降级记录，不修引擎、不放宽审计（plan §9 R-005/R-011）。

## 1. 依赖拓扑总览
> 任务依赖关系和执行顺序（helper 先行 → 矩阵/快照/自测并行 → B 档同文件顺序追加 → 总回归）

```
Wave 1 ─── helper 先行（无依赖，全并行；test-support 四模块 + tsconfig 一行）
  TASK-001 [L]  geometry-audit.ts（Violation/AUDIT_TOL + 轻量 SVG 解析 + G1~G5）
  TASK-002 [S]  tsconfig.json exclude 追加 "src/test-support"
  TASK-003 [M]  examples-sources.ts（A 档 11 源受管镜像，DO NOT EDIT）
  TASK-004 [M]  matrix-docs-b.ts（B1~B10+B11 DSL 注册表 + meta 注释头）
  TASK-005 [M]  render-harness.ts（parse→layout→render 统一基座 + 模块级缓存）

Wave 2 ─── 核心链路组装（依赖 Wave1，6 任务并行，测试文件零重叠）
  TASK-006 [M]  geometry-audit.test.ts（五类正反例 ≥10，依赖 TASK-001）
  TASK-007 [M]  degraded-paths.test.ts（退化 3 场景 fixture，依赖 TASK-001）
  TASK-008 [M]  matrix-a.test.ts（FR-001 自举 + A 档 11 例，依赖 TASK-001/003/005）
  TASK-009 [M]  snapshot.test.ts + 首建 golden 11 组 + manifest（依赖 TASK-003/005）
  TASK-010 [M]  kind-coverage.test.ts（kind 覆盖核对表 9 格，依赖 TASK-001/003/004/005）
  TASK-011 [L]  matrix-b.test.ts ① B1~B5（依赖 TASK-001/004/005）

Wave 3 ─── B 档续篇（同一文件顺序追加）
  TASK-012 [M]  matrix-b.test.ts ② B6~B10 + B11（依赖 TASK-011）

Wave 4 ─── 收口（依赖全部测试任务）
  TASK-013 [M]  总回归 + CI 验证 + 守恒 ≥437 + NFR 验收
```

**关键路径**：`TASK-001 → TASK-011 → TASK-012 → TASK-013`（Wave 1→2→3→4，4 段）。Wave 2 其余任务（006~010）均与 011 并行，最迟 Wave 2 完成；012 与 013 为串行尾段。理论最短周期 = 4 波次；若仅交付 A 档/自测（不含 B 档），关键路径可收缩为 `TASK-001/003/005 → TASK-008/009 → TASK-013`（3 波次，B 档可后补）。

**并行窗口**：Wave 1 五任务零依赖零文件重叠；Wave 2 六任务文件零重叠（geometry-audit.test / degraded-paths / matrix-a / snapshot / kind-coverage / matrix-b 各占一文件），可任意顺序或并行执行。

## 2. 任务列表
> 每个任务的详细定义（验收标准均引用具体测试名/文件/命令，可自动化验证）

### TASK-001: test-support/geometry-audit.ts（G1~G5 + SVG 轻量解析 + 容差常量）
> 审计核心 helper（FR-005 / ADR-004），全部矩阵/快照/自测/退化消费方共享；独立实现，不 import router/render 运行函数

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | 无 |
| **执行波次** | 1 |
| **对应 FR** | FR-005、ADR-004、D-003 |

**描述**: 新建 `packages/lgdl-render/src/test-support/geometry-audit.ts`（非 `*.test.ts`，不进 build dist，ADR-001）。导出类型与常量：`ViolationKind = 'G1'|'G2'|'G3'|'G4'|'G5'`、`Violation { type, element, detail, docRef? }`、`AUDIT_TOL`（orthoTolPx:0.51 / canvasPadPx:1 / labelPadPx:2 / cardinalityOffsetPx:22 / groupHeaderH:30 / groupPad:20，命名导出供 EC-008 校准）、`auditGeometry(doc: LgdlDocument, layout: LayoutResult, svg: string): Violation[]`。内置轻量 SVG 解析器（扫描式标签/属性正则 + `<g>` 嵌套栈记录祖先 class 链 + data-lgdl-loc + text 内容捕获；仅类型 import core/layout）。按 plan §6.1/D-003 表实现：
- **G1**：双源（LayoutResult 全数值字段 + SVG rect/circle/line/polygon/path d/text 数值属性）parse 后 `!Number.isFinite` 或 path d 非法 token → 报；硬判定无容差。
- **G2**：仅连边祖先 class ∈ {lgdl-edge, lgdl-aggregate-edge, lgdl-dep, lgdl-message} 的 `<path>`(M/L 段)/`<line>`；任一段 `min(|dx|,|dy|) > 0.51` → 报；path 含 C/Q/A 等非 M/L 命令 → fail-safe 报「无法判定段」；节点形状/defs marker 不审。
- **G3**：连边水平/垂直段 × 障碍框（LayoutResult.nodes bbox + SVG 提取 lgdl-group/lgdl-lane rect），内部相交（开区间、长度>0）→ 报；端点节点/所属组豁免（嵌套 contains 递归）；贴边/零长段不判。
- **G4**：全部 `<text>` 估宽 bbox（CJK≈1.0fs / Latin≈0.62fs / 行高 fs+4 / text-anchor 定 x 向）+ 四周外扩 2px 与任一**非宿主**框相交 → 报；宿主豁免按 g class ∈ 节点类/组类；基数 22px 外置不误报。
- **G5**：全部几何元素（defs 子树豁免）超出 viewBox 外扩 1px → 报；datastream 节点 bbox 须完整落入泳道列 x∈[laneX-1, laneX+261]，无 lane rect 覆盖（`_other`/`_default`）→ 降级画布检查（EC-003）。
- 定位串（NFR-003）：`G3 lgdl-edge nodes[2] d="M …" 段 (120,84)->(300,84) 穿 nodes[5] 框` 风格；docRef 优先取 data-lgdl-loc。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/lgdl-render/src/test-support/geometry-audit.ts |

**验收标准**:
- [ ] 文件存在且导出 ViolationKind / Violation / AUDIT_TOL / auditGeometry，类型经 tsc 严格模式零错误（见验证命令）
- [ ] AUDIT_TOL 六常量值与 D-003/plan §6.1 逐字一致（0.51 / 1 / 2 / 22 / 30 / 20）
- [ ] G1~G5 五类判定各自有实现入口且规则与 D-003 表逐行对应（G2 选择器仅四连边 class；G3 半开区间/豁免；G4 宿主豁免/2px 扩边；G5 viewBox 权威 + defs 豁免 + 泳道降级）
- [ ] 未 import 任何 router/render 运行函数（ADR-004 独立实现）——grep 无 `@lgdl/lgdl-router` 运行时引用
- [ ] 语义正确性由 TASK-006（≥10 正反例）与 TASK-008~012（A/B 档 0 违例实测校准）全绿共同证明

**验证命令**:
```bash
cd packages/lgdl-render
npx tsc --noEmit --module nodenext --moduleResolution nodenext --target es2022 --strict --esModuleInterop --skipLibCheck src/test-support/geometry-audit.ts
grep -n "lgdl-router\|lgdl-render.*from.*index" src/test-support/geometry-audit.ts  # 应无运行时 import（类型 import 除外）
```

### TASK-002: tsconfig exclude 追加 "src/test-support"
> ADR-001 唯一配置面改动：保证 build 产物 dist 与改动前逐字节一致（helper 不进发布产物）

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | 无 |
| **执行波次** | 1 |
| **对应 FR** | FR-011、ADR-001、NFR-001 |

**描述**: 在 `packages/lgdl-render/tsconfig.json` 的 `exclude` 数组追加 `"src/test-support"`（tsconfig.json:17-20，现为 `["src/**/*.test.ts", "dist"]`）。测试编译是命令行模式（package.json:16 带文件参数的 tsc）忽略 tsconfig，不受影响。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | packages/lgdl-render/tsconfig.json |

**验收标准**:
- [ ] git diff 仅新增 1 行 exclude 条目，无其他配置变化
- [ ] `npm run build --workspace @lgdl/lgdl-render` 成功；`packages/lgdl-render/dist/` 下无 `test-support/` 目录或文件（find 校验）
- [ ] build 后 `sha256sum packages/lgdl-render/dist/index.js` == `2ec5c0a573124d1b918a4e0db5c70c85cfe2b9a0b51761b3c25180b7310550e3`（改动前基线，NFR-001）

**验证命令**:
```bash
npm run build --workspace @lgdl/lgdl-render
find packages/lgdl-render/dist -name "test-support" -o -name "geometry-audit*" | wc -l   # 期望 0
sha256sum packages/lgdl-render/dist/index.js
git diff -- packages/lgdl-render/tsconfig.json
```

### TASK-003: test-support/examples-sources.ts（A 档 11 源受管镜像）
> FR-002/FR-008 输入源（ADR-002）：从 lgdl-web/src/examples.ts 逐字复制 11 个 EXAMPLES source，render 包内自洽闭合

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | 无 |
| **执行波次** | 1 |
| **对应 FR** | FR-002、FR-008、ADR-002 |

**描述**: 新建 `packages/lgdl-render/src/test-support/examples-sources.ts`，导出 `EXAMPLES_SOURCES: { id: string; source: string }[]`（文档序 11 条），内容从 `packages/lgdl-web/src/examples.ts` 的 11 个 EXAMPLES 条目 **source 逐字复制**（保持双引号转义原文，语义逐字节等价）。文件头注释：`DO NOT EDIT — 同步源：packages/lgdl-web/src/examples.ts（单一事实源）` + 同步规程（变更后人工复制 → 随 golden 重建 review diff 核对，ADR-002/R-008）。禁止 import lgdl-web（成环，ADR-002）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/lgdl-render/src/test-support/examples-sources.ts |

**验收标准**:
- [ ] 文件头含 `DO NOT EDIT` 声明与同步源路径注释
- [ ] 导出 EXAMPLES_SOURCES 长度 = 11，id 集合 = {architecture, microservices, datastream, er, gantt, login-flow, ecommerce-flow, mindmap, sequence, state, uml-class}，顺序与 lgdl-web/src/examples.ts 数组文档序一致
- [ ] 每条 source 与 lgdl-web EXAMPLES[i].source 字符串内容一致（build 期一次性脚本逐条比对，见验证命令；review 阶段 git diff 抽查）
- [ ] 无 `@lgdl/lgdl-web` import（grep 校验）
- [ ] tsc 严格模式类型零错误

**验证命令**:
```bash
cd packages/lgdl-render
npx tsc --noEmit --module nodenext --moduleResolution nodenext --target es2022 --strict --esModuleInterop --skipLibCheck src/test-support/examples-sources.ts
grep -c "lgdl-web" src/test-support/examples-sources.ts        # 期望仅注释行含同步源路径，无 import
node -e "const m=require('fs').readFileSync('src/test-support/examples-sources.ts','utf8'); const ids=[...m.matchAll(/id: \"([a-z-]+)\"/g)].map(x=>x[1]); console.log('mirror ids:', ids.length, ids.join(','));"
```
> source 逐条一致性：由 build 在 TASK-009 快照首建前用一次性 node 脚本从 lgdl-web/src/examples.ts 提取 11 source 与镜像比对（允许头注/格式差异除外），差异为零方可继续；同时 TASK-008/009 全绿反向证明镜像与引擎兼容。

### TASK-004: test-support/matrix-docs-b.ts（B 档 DSL 文档注册表）
> FR-003 输入源（plan §7 表）：B1~B10(+B11) 合法现代 DSL 文本 + meta（type/qRefs/意图/语义锁），注释头可追溯（NFR-006/FR-004）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | 无 |
| **执行波次** | 1 |
| **对应 FR** | FR-003、FR-004、NFR-006 |

**描述**: 新建 `packages/lgdl-render/src/test-support/matrix-docs-b.ts`，导出注册表（如 `MATRIX_DOCS_B: BDocMeta[]`），每条 = `{ id, type, title, qRefs, intent, semanticLock, source }` + 文件内注释头标注 type/qRefs/意图/预期。文档设计按 plan §7 表逐行：**B1** flowchart 8 形状 kind 混排 + 双向边 A→B/B→A + 中英 label（E2，Q-004/Q-012）；**B2** uml-class 混 kind + entity members 全字段（折叠 E3）；**B3** mindmap root 两分支其一被 group contains（Q-013，group 语义锁 U-1）；**B4a** sequence 3 参与者 + group(contains 1) + 消息链 + 1 条 from=groupId 边（EC-004）；**B4b** gantt 2 分区 group（各含任务）+ 任务依赖 + 1 条 group→task 边（EC-004）；**B5** flowchart 1 group 含若干节点 + 组外节点 + edges 含 g→组外节点（聚合边三态补全 g→n，Q-005）；**B6** 1 源 → 3 同 label target + 1 异 label target（扇出合并，Q-006）；**B7** gantt attrs.start 负值（-3 起）+ 三依赖对 gap≥20 / gap≈0 / 目标在左（Q-008/D4，U-2）；**B8** er entity×3(members) + decision/note 混入 + 基数 1/0..1/0..\*/1..\* 双向（Q-007/E2）；**B9** datastream 2 真实 group（各含节点）+ 未分组节点触发 `_other` 合成列（Q-009/EC-003）；**B10** state 两用例：(a) 多入口（2 个 in-degree 0）(b) 纯环全体 in-degree≥1（Q-011）；**B11** flowchart ~130 无 group 节点链式边（Q-001，P2，meta 标 optional + LGDL_MATRIX_B11 启用语义）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/lgdl-render/src/test-support/matrix-docs-b.ts |

**验收标准**:
- [ ] 注册表含 11 条（B1~B10 + B11），每条含 id/type/title/qRefs/intent/semanticLock/source 字段；每条 source 为 parser 可接受的合法现代 DSL（parser 接受性由 TASK-011/012 实测，若某文档非法 → 修正 DSL 而非降级断言）
- [ ] qRefs 与 plan §7 表 Q-xxx 映射一致；B3/B4a/B4b/B9 标 semanticLock=true；B11 标 optional（P2 + `LGDL_MATRIX_B11`）
- [ ] 文件内注释头（type/qRefs/意图/预期）完整，评审可追溯（NFR-006）
- [ ] tsc 严格模式类型零错误

**验证命令**:
```bash
cd packages/lgdl-render
npx tsc --noEmit --module nodenext --moduleResolution nodenext --target es2022 --strict --esModuleInterop --skipLibCheck src/test-support/matrix-docs-b.ts
node -e "const m=require('fs').readFileSync('src/test-support/matrix-docs-b.ts','utf8'); console.log('id 字段数:', (m.match(/id: '/g)||[]).length);"  # ≥11
```

### TASK-005: test-support/render-harness.ts（全链路统一基座）
> FR-001 基座：矩阵/快照/kind 三方共享的 renderDoc + 模块级渲染缓存

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | 无 |
| **执行波次** | 1 |
| **对应 FR** | FR-001、FR-002 |

**描述**: 新建 `packages/lgdl-render/src/test-support/render-harness.ts`，导出 `renderDoc(source: string, id?: string): Promise<{ doc, layout, svg }>`：`parseLgdl(source)` → 断言 `doc.valid`（invalid 即抛带 issues 的错误）→ `await layoutDocument(doc)` → `renderSvg(doc, layout)` → 返回三元组。模块级 `Map<docId, svg>` 渲染缓存（同进程同文档 id 只渲一次，跨矩阵/快照/kind 复用）。相对 `.js` 扩展 import（NodeNext + rewriteRelativeImportExtensions，同 svg.test.ts:3 `./index.js` 先例；test-support 经 import 图进 dist-test 而非测试入口，ADR-001）。**禁手造 LayoutResult fixture**（唯一例外 = TASK-007 degraded-paths）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/lgdl-render/src/test-support/render-harness.ts |

**验收标准**:
- [ ] renderDoc 对合法 DSL 返回 {doc, layout, svg}，svg 为字符串（渲染确定性）；invalid 输入抛错且错误含 parse issues
- [ ] 模块级缓存存在：同 docId 二次调用命中（不重复渲染，可通过渲染计数或时间观察；缓存键 = id ?? source 全量）
- [ ] import 面 = `@lgdl/lgdl-core`/`@lgdl/lgdl-layout`（parse/layout 运行时）+ render `./index.js`（renderSvg）——不 import 任何内部未导出函数
- [ ] 链路自举证明：TASK-008 首条 FR-001 最小文档用例（2 节点 1 边 inline DSL）走通 parse→layout→render 且 0 违例
- [ ] tsc 严格模式类型零错误

**验证命令**:
```bash
cd packages/lgdl-render
npx tsc --noEmit --module nodenext --moduleResolution nodenext --target es2022 --strict --esModuleInterop --skipLibCheck src/test-support/render-harness.ts
# 链路自举实测见 TASK-008 验收（matrix-a.test.ts 首用例）
```

### TASK-006: geometry-audit.test.ts（审计自测：五类正反例 ≥10）
> FR-006：证明判定口径不哑火（违规必报）也不误报（健康不报）；合成 (doc, layout, svg) 直接驱动 auditGeometry（ADR-004，非真实渲染）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-001 |
| **执行波次** | 2 |
| **对应 FR** | FR-006、ADR-004 |

**描述**: 新建 `packages/lgdl-render/src/geometry-audit.test.ts`（顶层 *.test.ts，顶层 glob 自动收集，FR-011）。≥10 正反例 = 5 类 × (1 违规必报 + 1 健康不报)：**G1** NaN/Infinity 坐标必报 vs 全有限不报（含 path d 非法 token 必报）；**G2** 45° 斜段连边必报 vs 15° 锚点量化偏移 ≤0.51px 不报 + 节点形状 path（entity 圆柱 A 弧）不报；**G3** 边穿第三方节点框必报 vs 贴边（半开区间）不报 / 自身端点节点豁免不报 / 零长段不报；**G4** edge label 压节点框必报 vs 宿主内标签不报 / 基数 22px 外置 + 2px 扩边不误报；**G5** 元素越 viewBox 必报 vs 1px 数字舍入容忍内不报 + defs 子树不报 + 节点越泳道列必报。合成 SVG 直接构造（不必真实渲染）；每条 test() 命名含类型与正/反语义（如 `G3 必报: 边水平段穿第三方节点框`），断言 violations 命中/不含对应 type+element（NFR-003 定位串检查）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/lgdl-render/src/geometry-audit.test.ts |

**验收标准**:
- [ ] ≥10 条 test()（5 类各 ≥1 必报 + ≥1 不报）；全绿
- [ ] 必报用例断言 violations 包含预期 type 且 element/定位串非空（NFR-003 可定位）
- [ ] 健康用例断言 violations 不含该类误报（如 G3 贴边、G4 宿主、G5 defs 均不报）
- [ ] 合成输入不依赖真实渲染（直接构造 (doc, layout, svg)）；测试名含正/反语义
- [ ] 单跑该文件与全 workspace test 均绿（既有 21 例不受影响）

**验证命令**:
```bash
npm run test --workspace @lgdl/lgdl-render
# 或单文件（先由上面命令编译出 dist-test）：
node --test dist-test/geometry-audit.test.js
```

### TASK-007: degraded-paths.test.ts（退化/兜底路径专项）
> FR-007/Q-010：矩阵内唯一允许合成 LayoutResult fixture 的例外；3 场景断言输出无 NaN/斜段/越界且不抛

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-001 |
| **执行波次** | 2 |
| **对应 FR** | FR-007、EC-005、D-005 |

**描述**: 新建 `packages/lgdl-render/src/degraded-paths.test.ts`。合成 LayoutResult fixture（含布局/路由中间态）直接驱动 renderSvg/router 导出，3 场景：
1. **routeDefault 零长退化**（render/index.ts:948-956）：构造零长连边数据 → renderSvg 不抛，输出含退化处理路径；auditGeometry 判定 G3 零长不判穿、G1/G5 兜底无违例。
2. **A* 无解 → orthogonalize 回退**（router/index.ts:219-220）：密集障碍 + 受限 bounds 逼近无解 → 断言输出有限坐标/正交段/不抛异常；若无法 100% 复现「无解」分支 → 降级断言（有限/正交/不抛，不依赖特定分支命中），并在文件注释记录开放问题 #5 实证结论。
3. **routeRectilinear fallback**（router/index.ts:592-602）：构造使 fallback 生效的输入 → 不抛 + 输出无 NaN/非正交段（G2 过）+ 越界检查（G5 过）。
既有 router.test.ts 8 例保持绿，作为退化覆盖基线（FR-007 验收）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/lgdl-render/src/degraded-paths.test.ts |

**验收标准**:
- [ ] ≥3 条 test()（三场景各 1），命名含场景（如 `退化场景 1: routeDefault 零长`）
- [ ] 场景 1/3：renderSvg 不抛异常，audit 输出无 G1/G2/G5 违例
- [ ] 场景 2：输出有限/正交/不抛（红则降级为断言有限/正交/不抛，注释记录 #5）
- [ ] 文件头注释说明 fixture 例外授权（FR-007/D-005）与开放问题 #5 结论
- [ ] 全 workspace test 绿（router.test.ts 8 例保持绿）

**验证命令**:
```bash
npm run test --workspace @lgdl/lgdl-render
node --test dist-test/degraded-paths.test.js
```

### TASK-008: matrix-a.test.ts（A 档 11 例全链路 + FR-001 自举）
> FR-001/FR-002（E1 type 穷举）：每条 = 真实 EXAMPLES_SOURCES[i].source → renderDoc → auditGeometry → 0 违例；快照一致由 TASK-009 承担（职责分离）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-001、TASK-003、TASK-005 |
| **执行波次** | 2 |
| **对应 FR** | FR-001、FR-002、E1 |

**描述**: 新建 `packages/lgdl-render/src/matrix-a.test.ts`。首条 = **FR-001 最小文档自举**（2 节点 1 边 inline DSL → renderDoc → auditGeometry 0 违例，验证基座链路可用）。随后 **A 档 11 条 test()**（每条独立 test 名含文档 id，如 `A 档 architecture: 全链路审计 0 违例`），输入 = `EXAMPLES_SOURCES[i].source`，断言 = `assert.deepEqual(auditGeometry(doc, layout, svg), [])`。**不做快照字节比对**（FR-007 职责分离，由 TASK-009 承担，避免同源重复渲染两处断言）。全部为真实 DSL 文本全链路，禁手造 fixture。Q-xxx 覆盖：Q-002（全链路）、Q-003（mindmap/sequence/gantt/datastream/state/arch 六类图）、Q-005（g→g/n→g 聚合）、Q-012（login-flow 2 层嵌套 group）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/lgdl-render/src/matrix-a.test.ts |

**验收标准**:
- [ ] 12 条 test()（1 基座自举 + 11 A 档）全绿；A 档每条断言 violations deepEqual []
- [ ] test 名含文档 id 或自举标识，失败可定位（NFR-003）
- [ ] 全部用例经 renderDoc 基座（无手造 fixture 冒充）；代码 grep 无 `LayoutResult` fixture 字面量
- [ ] 单跑该文件与全 workspace test 均绿

**验证命令**:
```bash
npm run test --workspace @lgdl/lgdl-render
node --test dist-test/matrix-a.test.js
```

### TASK-009: snapshot.test.ts + golden 首建（11 svg + manifest）
> FR-008/FR-009/FR-010/ADR-003：字节 + sha256 双校验 + manifest 完整性 + env 显式更新门（写后自断言）；一次性首建 11 组资产

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-003、TASK-005 |
| **执行波次** | 2 |
| **对应 FR** | FR-008、FR-009、FR-010、ADR-003 |

**描述**: 新建 `packages/lgdl-render/src/snapshot.test.ts` + 首建资产目录。测试结构：`before` 读 manifest（路径 `new URL('../../test-assets/golden/', import.meta.url)`，ADR-003 决策 2，不依赖 process.cwd）；**11 条 id 粒度 test()**（如 `snapshot architecture: 字节+sha 双校验`）：渲染串（renderDoc(EXAMPLES_SOURCES[i].source) 的 svg）=== `{id}.svg` 文件字节 **且** `sha256(渲染串) === manifest.files[id]`（node:crypto）；**manifest 完整性 test**：ids 长度 11、files 键集齐且无多余、version===1；**普通模式零写分支**（无 LGDL_UPDATE_SNAPSHOTS 时代码不存在任何写盘路径）。env 更新门：`LGDL_UPDATE_SNAPSHOTS=1` 时测试改写 11 svg + manifest 后**立即重渲自断言**（写后红即失败，防坏基线入库）。manifest 无时间戳/环境信息（确定性，可 git diff）。**首建流程（build 执行）**：① 普通模式跑（预期 snapshot 红：资产缺失）→ ② `LGDL_UPDATE_SNAPSHOTS=1` 建档 → ③ 移除 env 普通模式全绿（建档自证重渲染与基线逐字节一致）→ ④ git diff 人工核对镜像与 11 资产，独立 commit（FR-009 规程）。基线 = 当前引擎（2026-09-02 dist）重渲染字节，不采用漂移 7/11 的磁盘 .svg（D-002）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/lgdl-render/src/snapshot.test.ts |
| NEW | packages/lgdl-render/test-assets/golden/architecture.svg |
| NEW | packages/lgdl-render/test-assets/golden/microservices.svg |
| NEW | packages/lgdl-render/test-assets/golden/datastream.svg |
| NEW | packages/lgdl-render/test-assets/golden/er.svg |
| NEW | packages/lgdl-render/test-assets/golden/gantt.svg |
| NEW | packages/lgdl-render/test-assets/golden/login-flow.svg |
| NEW | packages/lgdl-render/test-assets/golden/ecommerce-flow.svg |
| NEW | packages/lgdl-render/test-assets/golden/mindmap.svg |
| NEW | packages/lgdl-render/test-assets/golden/sequence.svg |
| NEW | packages/lgdl-render/test-assets/golden/state.svg |
| NEW | packages/lgdl-render/test-assets/golden/uml-class.svg |
| NEW | packages/lgdl-render/test-assets/golden/manifest.json |

**验收标准**:
- [ ] snapshot.test.ts 含 11 条 id 粒度 test + ≥1 条 manifest 完整性 test（12 条）；全绿
- [ ] 双校验实现：字节相等 && sha256 相等；人为改动 1 个 svg 文件 → 对应 test 红且无自动覆盖路径（普通模式无写分支）
- [ ] 资产目录含 11 svg + manifest.json；manifest `{"version":1,"ids":[11 个 id],"files":{id:sha256hex}}`，**无时间戳字段**
- [ ] 首建三步走自证：env 建档后移除 env 普通模式全绿（重渲染与基线逐字节一致，0 diff）
- [ ] env 更新门：`LGDL_UPDATE_SNAPSHOTS=1` 写后立即自断言，写坏即红

**验证命令**:
```bash
npm run test --workspace @lgdl/lgdl-render                # ① 普通模式：snapshot 预期红（资产缺失），其余绿
LGDL_UPDATE_SNAPSHOTS=1 npm run test --workspace @lgdl/lgdl-render   # ② 建档 + 写后自断言全绿
npm run test --workspace @lgdl/lgdl-render                # ③ 去 env 普通模式全绿（自证 0 diff）
ls packages/lgdl-render/test-assets/golden/ | wc -l        # 期望 12（11 svg + manifest）
```

### TASK-010: kind-coverage.test.ts（kind 覆盖核对表动态断言 9 格）
> FR-004/D-001 核对表：不做静态死表，渲染核对文档 → 对 SVG 做真实绘制断言（对照 render SHAPES/FILL/STROKE 分派），9 格全覆盖

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-001、TASK-003、TASK-004、TASK-005 |
| **执行波次** | 2 |
| **对应 FR** | FR-004、D-001 |

**描述**: 新建 `packages/lgdl-render/src/kind-coverage.test.ts`。渲染 kind 覆盖核对表（plan §6.2 表）列出的文档，做元素级真实绘制断言（对照 render SHAPES 分派 render/index.ts:56-164 / shapeKindFor :456-457），9 格：

| kind | 核对文档 | 动态断言 |
|------|---------|---------|
| start/end（药丸） | login-flow、ecommerce-flow、architecture、state、B1 | `<g class="lgdl-node">` 内 `<rect rx≈node.width/2>` |
| process | A 全部 + B1 | `<rect rx=6>` |
| decision（菱形） | login-flow、ecommerce-flow、B1/B8 | `<polygon points=4顶点>` = node bbox 四边中点 |
| entity（圆柱） | er、architecture、datastream、B1/B8 | path d 含 `A` 圆弧段；er members 行文本存在 |
| note（折角） | architecture、microservices、B1/B8 | path d 含折角 `L x+w,y+12` |
| state（回退 process） | state、B1 | 断言回退：`<rect>` 且无 polygon/path（SHAPES 无 state 键） |
| milestone | gantt、B1、B7 | gantt：`lgdl-gantt-milestone` 内 `<polygon>` 菱形；非 gantt（B1）：回退 `<rect>` |
| group（容器/泳道） | architecture/microservices、login-flow(2 层)、state、datastream、uml-class、ecommerce-flow、gantt、B3/B4a | `<g class="lgdl-group/lgdl-lane/lgdl-gantt-lane">` + rect 存在且 contains 成员节点框在其内（login-flow 断言外层含内层嵌套 ≥2） |
| 无 kind（回退 process） | mindmap、B1 | `<rect rx=6>` |

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/lgdl-render/src/kind-coverage.test.ts |

**验收标准**:
- [ ] ≥9 条 test()（覆盖 9 格），每格命名含 kind（如 `kind 覆盖: entity 圆柱 A 弧真实绘制`）；全绿
- [ ] 断言为元素级定位（class/坐标/d 段，NFR-003），非 includes 字符串粗断言
- [ ] state 格断言**回退**语义（rect 且无 polygon/专属 path）；无 kind 格断言回退 process
- [ ] group 格断言容器框 contains 成员（login-flow 2 层嵌套外含内）；引用 B 档文档（B1/B3/B4a/B7/B8）来自 TASK-004 注册表
- [ ] 全 workspace test 绿

**验证命令**:
```bash
npm run test --workspace @lgdl/lgdl-render
node --test dist-test/kind-coverage.test.js
```

### TASK-011: matrix-b.test.ts ①（B1~B5 语义断言 + 审计 0 违例）
> FR-003 前半（等价类文档 B1~B5）：每文档 test() = 审计 0 违例 + 文档专属语义断言（折叠/锁定/元素存在性，plan §7 表）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-001、TASK-004、TASK-005 |
| **执行波次** | 2 |
| **对应 FR** | FR-003（B1~B5）、FR-004、EC-004、Q-004/Q-005/Q-012/Q-013 |

**描述**: 新建 `packages/lgdl-render/src/matrix-b.test.ts` **首段**（本任务写 B1~B5，TASK-012 同文件追加 B6~B11；文件头注释含等价类归属说明 E1~E6，NFR-006）。逐文档 test()（test 名含 id）：输入 = `MATRIX_DOCS_B[i].source` → renderDoc → auditGeometry 0 违例 + 文档专属断言：
- **B1**（flowchart 8 kind 混排 + 双向边）：decision polygon / entity 圆柱 A 弧 / note 折角真实出现；state/milestone 回退 rect；双向边对 A→B 与 B→A 均渲染（lgdl-edge 存在）；中英 label 文本存在。
- **B2**（uml-class 折叠）：无 polygon/pill/圆柱 path（全部 `<g class="lgdl-class">` 卡片）；members 行与 data-lgdl-loc nodes[i].members[j] 定位存在。
- **B3**（mindmap+group，Q-013/U-1）：渲染不炸 + 折叠（decision 叶为圆角 rect 无 polygon）+ 审计 0 + **双渲染字节一致**（语义锁现状；group 绘制行为 ⚠️ U-1 不强断言——以快照/双渲染为准，plan R-009）。
- **B4a**（sequence+group，EC-004）：渲染不炸 + `lgdl-participant` 数 = 3（group 不产生参与者头）+ 审计 0 + 双渲染一致（消息漏画不判违例）。
- **B4b**（gantt+聚合边，EC-004）：渲染不炸 + `lgdl-dep` 数 = 任务间依赖数（group→task 不成 dep）+ 审计 0 + 双渲染一致。
- 语义锁实现注：B3/B4a/B4b 属「静默忽略/漏画不判违例」语义锁文档，现状锁定 = 二次渲染确定性 + 元素级断言（不扩 manifest 11 上限，见 §0 微决策 1；EC-004 中「快照」以双渲染字节一致承载）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/lgdl-render/src/matrix-b.test.ts（首段 B1~B5；TASK-012 追加） |

**验收标准**:
- [ ] B1~B5 各 1 条 test()（5 条）全绿；每条断言审计 0 违例
- [ ] B1 形状真实出现断言通过（decision/entity/note 非回退、state/milestone 回退、双向边两向均渲染）
- [ ] B2 折叠断言通过（无 polygon/pill/圆柱 path；members 行 data-lgdl-loc 存在）
- [ ] B4a/B4b 元素计数断言通过（participant=3 / dep=任务依赖数）；B3/B4a/B4b 双渲染一致断言通过
- [ ] 文件头注释含 qRefs/等价类归属（NFR-006）；全 workspace test 绿

**验证命令**:
```bash
npm run test --workspace @lgdl/lgdl-render
node --test dist-test/matrix-b.test.js
```

### TASK-012: matrix-b.test.ts ②（B6~B10 + B11 追加）
> FR-003 后半：同文件追加 B6~B10 语义断言 + B11 P2 env 开关；语义锁 B9 现状

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-011（同文件顺序追加） |
| **执行波次** | 3 |
| **对应 FR** | FR-003（B6~B11）、Q-006/Q-007/Q-008/Q-009/Q-011 |

**描述**: 在 `matrix-b.test.ts` **追加** B6~B10 逐文档 test() + B11 skip 用例：
- **B6**（扇出标签合并，Q-006）：同 label 文本渲染次数 = 1（owner 一次，render/index.ts:776-803/880-890 合并语义）+ 异 label 各一次。
- **B7**（gantt 依赖三型 + 负日期，Q-008/D4/U-2）：负日期条不从轴外起；gap≥20 / gap≈0（target.start=source.end）/ 目标在左绕行 三段全正交（G2 过）+ 审计 0 违例；文档按「垂直段落空列」构造，构造不出走 EC-001 降级记录（R-011）。
- **B8**（er 基数全枚举 + 混 kind，Q-007/E2）：基数文本锚点 22px 外置不压框（G4）+ 关系 label 与基数互不压 + decision/note 在 er mode 真实绘制 + 审计 0。
- **B9**（datastream `_other` 混合态，Q-009/EC-003）：lgdl-lane rect 数 = 2（`_other` 无底框现状锁）+ `_other` 列节点走画布检查降级 + 审计 0 + 双渲染一致（记录开放 #7 实证结论到文件注释）。
- **B10**（state 多入口/零入口，Q-011）：两用例 (a) 多入口 (b) 纯环——均无 `<g class="lgdl-initial">` 元素 + 审计 0；对照 = A 档 state 有 initial（可在本文件引用断言或注释指向 matrix-a/snapshot）。
- **B11**（P2，Q-001 大图 grid）：`test('B11 …', { skip: !process.env.LGDL_MATRIX_B11 })`（~130 节点链式边，默认 skip 不进 ≤60s 预算 NFR-004）。
- B 档注册表文档来自 TASK-004（本任务不改 registry 文件）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | packages/lgdl-render/src/matrix-b.test.ts（追加 B6~B11 段） |

**验收标准**:
- [ ] B6~B10 各 1 条 test()（5 条）全绿；B11 注册（默认 skip）
- [ ] B6 合并断言通过（同 label 渲染 1 次 + 异 label 各 1）；B8 基数不压框（G4 0 违例）通过
- [ ] B7 三段全正交 + 负日期不越轴；若红 → 按 EC-001 记录降级（注释说明，不修引擎）
- [ ] B9 lane rect=2 + 审计 0 + 双渲染一致通过；注释记录 `_other` 无底框实证结论（开放 #7）
- [ ] B10 两用例无 lgdl-initial 通过；B11 默认 skip（无 LGDL_MATRIX_B11 时不执行）
- [ ] 全 workspace test 绿（含默认 skip B11 计数 6 条注册）

**验证命令**:
```bash
npm run test --workspace @lgdl/lgdl-render
node --test dist-test/matrix-b.test.js
LGDL_MATRIX_B11=1 npm run test --workspace @lgdl/lgdl-render   # 可选：B11 启用态核验（不计常规时长预算）
```

### TASK-013: 总回归 + CI 验证 + 测试守恒 + NFR 验收
> FR-011/FR-012 + NFR-001~006 收口：全量测试绿、守恒 ≥437、dist 零变化、ci.yml/package.json 零 diff、时长 ≤60s

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-006、TASK-007、TASK-008、TASK-009、TASK-010、TASK-011、TASK-012 |
| **执行波次** | 4 |
| **对应 FR** | FR-011、FR-012、NFR-001、NFR-002、NFR-003、NFR-004、NFR-005、NFR-006 |

**描述**: 收口验证（不改任何文件，除非发现收集面问题触发 EC-007 最小调整并记录）：
1. **render 门禁**：`npm run test --workspace @lgdl/lgdl-render` 全绿（新增 ~57 例 + 既有 21 例）。
2. **全仓回归**：`npm run test --workspaces` 全绿（CI 同款；ci.yml build 七包后跑 test，本 Feature 不新增 workflow）。
3. **守恒（FR-012）**：`grep -ro "test(" packages --include="*.test.ts" | wc -l` ≥ 437（预计 ≈494 = 437 + 12 A + 11 B + 12 快照 + ≥10 审计 + 9 kind + 3 退化）；`git diff` 无既有 *.test.ts 删除/弱化行。
4. **NFR-001 旁路**：`sha256sum packages/lgdl-render/dist/index.js` == 基线 `2ec5c0a5…`（TASK-002 已记录）；`git status --porcelain` 仅新增测试/资产 + tsconfig 一行；ci.yml 与 render package.json 无 diff。
5. **NFR-003 可定位**：人为在 1 个矩阵文档注入 1 处违例（如 B1 某边改 45°）→ 失败信息含违例类型 + element + 文档位置 → 撤销注入恢复绿。
6. **NFR-004 时长**：`time npm run test --workspace @lgdl/lgdl-render` ≤ 60s（B11 默认 skip）。
7. **NFR-006 可追溯**：评审抽查 ≥3 文档注释（B 档注册表 qRefs/意图、matrix-b 文件头、matrix-a test 名）完整。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| — | 无新增/修改（仅验证；若触发 EC-007 收集面调整则另记最小改动） |

**验收标准**:
- [ ] render 门禁与全仓 workspaces 测试全绿；ci.yml 无 diff
- [ ] 守恒计数 ≥ 437（记录实测值，预计 ≈494），git diff 无既有断言删除/弱化
- [ ] dist/index.js sha256 与基线一致；git status 新增文件面符合预期（测试 + 资产 + tsconfig 一行）
- [ ] NFR-003 注入实测通过（失败信息可定位）；NFR-004 时长 ≤60s 记录
- [ ] render package.json 零改动确认（git diff 空）

**验证命令**:
```bash
npm run test --workspace @lgdl/lgdl-render
npm run test --workspaces
grep -ro "test(" packages --include="*.test.ts" | wc -l          # ≥437
sha256sum packages/lgdl-render/dist/index.js                      # == 2ec5c0a573124d1b918a4e0db5c70c85cfe2b9a0b51761b3c25180b7310550e3
git diff -- .github/workflows/ci.yml packages/lgdl-render/package.json   # 空
time npm run test --workspace @lgdl/lgdl-render                    # ≤60s（B11 skip）
```

## 3. 任务汇总
> 任务数量、复杂度和波次的统计总览

| 统计项 | 数值 |
|--------|:--:|
| 总任务数 | 13 |
| S 级 (简单) | 1（TASK-002） |
| M 级 (中等) | 10（TASK-003~010、TASK-012、TASK-013） |
| L 级 (复杂) | 2（TASK-001、TASK-011） |
| 执行波次 | 4 |

新增用例预期：审计自测 ≥10 + 退化 3 + A 档 12 + 快照 12 + kind 9 + B 档 11（B1~B10 逐文档 10 + B11 注册默认 skip）≈ **57 条** → 全仓 437 → 预计 ≈494（FR-012）。

## 4. 执行策略
> 各波次的执行说明 + 并行窗口 + 关键路径

| 波次 | 任务 | 策略 |
|:--:|------|------|
| 1 | TASK-001, TASK-002, TASK-003, TASK-004, TASK-005 | 并行执行（helper 先行：audit / 镜像 / 注册表 / 基座 / tsconfig 互不依赖、文件零重叠） |
| 2 | TASK-006, TASK-007, TASK-008, TASK-009, TASK-010, TASK-011 | 并行执行（依赖 Wave 1；六测试文件零重叠，可任意顺序） |
| 3 | TASK-012 | 顺序执行（matrix-b.test.ts 同文件追加，必须 TASK-011 完成后） |
| 4 | TASK-013 | 收口（依赖全部测试任务；纯验证，改动为零） |

**并行窗口**：
- **窗口 A（Wave 1）**：TASK-001∥002∥003∥004∥005 —— 5 路并行，全零依赖。
- **窗口 B（Wave 2）**：TASK-006∥007∥008∥009∥010∥011 —— 6 路并行，均在 helper（Wave 1）就绪后启动；其中 006/007 仅依赖 TASK-001（audit），可最先启动；008/009 依赖镜像+基座；010 依赖注册表。
- 说明：同一 Wave 任务由 build 逐任务认领时无先后约束；TASK-009（快照首建）建议先于 011/012 完成以便 A 档语义锁定可交叉验证，但**非硬依赖**。

**关键路径**：`TASK-001 → TASK-011 → TASK-012 → TASK-013`（4 波次）。Wave 2 内最长任务为 TASK-011（L）；若 build 优先交付 A 档/快照/自测（008/009/006），门禁核心（几何审计 + 快照回归）在 Wave 2 末即可全绿，B 档（011/012）与收口（013）构成完整路径。风险与降级预案（EC-001/EC-008）见 plan §9 R-005/R-009/R-010/R-011，build 遇真红一律记录上报，不修引擎、不放宽审计。

## 修订记录
> 记录本文档的版本变更历史

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建 — 13 任务 4 波次分解：覆盖 plan §5 全部 23 项文件变更（ADR 已在 plan 落盘）+ 快照首建流程 + 审计自测 + CI/守恒收口；记录 2 项 tasks 微决策（compareOne 不落地、语义锁以双渲染承载）；实测基线 render 21 绿 / 全仓 437 / dist hash 2ec5c0a5… | 2026-09-02 | SDDU Tasks Agent |
