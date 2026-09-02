# 技术方案：specs-tree-render-gate（补全 LGDL 门禁测试用例 — 几何审计 + golden 快照）

> **文档定位**: SDDU 技术方案 — 测试架构设计 / 文件落位 / B 档专项文档设计 / 快照生成流程 / CI 接入 / 风险矩阵 / 工作量，作为 tasks 阶段的输入
> **前置依赖**: discovery.md v1.0（穷举空间 D1~D7 / 缺口 Q-001~Q-014 / 快照面 / 风险 7 项）+ spec.md v1.0（12 FR / 6 NFR / 8 EC / D-001~D-006 / 8 开放问题）
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-02
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-02
> **更新说明**: 初始创建 — 全部引用行号 2026-09-02 源码实测核对；4 个 ADR（ADR-001~004）落盘；开放问题 #3/#4/#5/#8 决策，未知处标注 U-1~U-3

## 1. 前置检查

| 检查项 | 状态 |
|--------|:--:|
| spec.md 存在（specs-tree-render-gate/spec.md，236 行） | ✅ |
| 外部 API 文档缓存 | ✅ 不适用（纯测试侧，无外部服务引用） |
| 引用行号代码实测核对 | ✅（下方各节标注「核实」；未知处 U-1~U-3） |
| 测试基线实测 | ✅ 全仓 `test(` 计数 = **437**（22 个 *.test.ts，2026-09-02 grep 实测），render 包 = 21（svg 7 + ascii 14） |

## 2. 架构分析

### 2.1 现状架构影响（只读消费，零业务改动）

门禁是**旁路测试**：对 `parseLgdl → layoutDocument → renderSvg` 的既有输出做断言，不触碰 render/layout/router/core 任何 src 业务文件（spec NG-001/NFR-001）。已核实引擎确定性成立（discovery §3.4-2：layout 无 Date.now/Math.random；渲染数字确定性序列化），SVG 字节快照可行。

与既有测试面的关系（实测）：
- render `package.json` test 脚本 = `tsc src/*.test.ts --outDir dist-test --module nodenext … && node --test dist-test/*.test.js`（package.json:16）——**顶层 glob** 收集；
- render src 现有 svg.test.ts（7 例，手造 LayoutResult fixture + includes 结构断言，从未调 layoutDocument，svg.test.ts:13-224）+ ascii.test.ts（14 例）；
- render tsconfig：include `["src"]`、exclude `["src/**/*.test.ts", "dist"]`（tsconfig.json:14-20）；dist/、dist-test/ 均 gitignored；
- 各包导出面：core `parseLgdl`（parser.ts:31，返回 `{document, issues, valid}`，types.ts:263-267）；layout `layoutDocument`（**async**，index.ts:120）+ `LayoutResult{nodes,edges,width,height}`（index.ts:19-43）；render `renderSvg`（index.ts:339）+ `renderAscii`；router 导出 `routeEdge/shapeEdgePoint/orthogonalize/routeRectilinear/segmentCrosses/pathCrosses` 等纯函数（router/index.ts:40-563）；
- CI（.github/workflows/ci.yml）：build 七包（core/layout/router/render/web-cli-base/lgdl-web-cli/lgdl-web-op-cli）→ `npm run test --workspaces`；**不含 lgdl-web** → render 测试不得反向依赖 web（ADR-002 依据）。

### 2.2 新增组件（全测试侧）

```
packages/lgdl-render/src/
├── test-support/                      # 共享纯模块（非 *.test.ts，不进 build dist —— ADR-001）
│   ├── geometry-audit.ts              # G1~G5 审计 + 容差常量 + SVG 轻量解析（FR-005，ADR-004）
│   ├── render-harness.ts              # parse→layout→render 统一基座（FR-001）+ 模块级渲染缓存
│   ├── examples-sources.ts            # A 档 11 源受管镜像（FR-002/FR-008，ADR-002）
│   └── matrix-docs-b.ts               # B 档 B1~B11 DSL 文档注册表（FR-003，含 meta：type/qRefs/意图/语义锁）
├── matrix-a.test.ts                   # A 档 11 例全链路 + FR-001 最小文档基座用例
├── matrix-b.test.ts                   # B 档 B1~B10（B11 env 开关）+ 语义锁定/折叠断言
├── snapshot.test.ts                   # golden 11 组字节+sha 双校验 + manifest 完整性（FR-008/009/010）
├── geometry-audit.test.ts             # 审计自测：五类正反例 ≥10（FR-006）
├── kind-coverage.test.ts              # kind 覆盖核对表动态断言（D-001 表，FR-003/FR-004）
└── degraded-paths.test.ts             # 退化/兜底路径专项（FR-007，矩阵内唯一 fixture 例外）
packages/lgdl-render/test-assets/golden/   # {id}.svg × 11 + manifest.json（ADR-003，tasks 建档生成）
packages/lgdl-render/tsconfig.json     # [MODIFY] exclude + "src/test-support"（ADR-001）
```

数据流：`matrix/snapshot/kind 测试 → render-harness → parseLgdl（core）→ layoutDocument（layout，async）→ renderSvg（render）→ 字节（快照比对）→ geometry-audit（SVG 解析为真值）→ 违例清单 → node:test assert`。审计对 `(doc, layout, svg)` 三元组独立判定，可被矩阵、快照、自测、退化路径四类消费方复用。

### 2.3 依赖关系

- 测试编译期：render 包内相对 import（test-support、src/index.js）+ `@lgdl/lgdl-core`/`@lgdl/lgdl-layout` 类型与运行时（dist，CI 先 build 后 test 已满足）；
- 运行时：`node:test`/`node:assert`/`node:crypto`(sha256)/`node:fs`(快照读) 全为 Node 内建；
- 不依赖：lgdl-web（反向成环，ADR-002）、磁盘 examples/*（D-002）、router/render 内部未导出函数（ADR-004）、gen-examples.mjs（NG-002）。

## 3. 方案对比

### 3.1 决策点 A：测试侧代码落位与编译边界

| 维度 | 方案 A：src/test-support + tsconfig exclude（ADR-001） | 方案 B：巨型单 *.test.ts 内联 | 方案 C：src 顶层普通 .ts helper |
|------|:--|:--|:--|
| 描述 | 共享纯模块放 src/test-support/（非 *.test.ts），测试相对 import；tsconfig exclude 追加一行；新测试全在 src 顶层 *.test.ts | helper/harness/docs 全部内联进 1 个超大 *.test.ts | helper 以非测试 .ts 放 src，不排除 |
| 优点 | 组织清晰（FR-004/NFR-006）；build dist 产物零变化；package.json test 脚本零改动 | 零配置改动 | 零配置改动、结构简单 |
| 缺点 | tsconfig 一行 exclude（FR-011 允许的最小组织调整，纳入 NFR-001 审计） | 单文件超千行难维护；文档/审计/矩阵无法独立演进；分工冲突 | helper 被 build 编入 dist（**测试支持代码进发布产物**，违背 NFR-001「不进包」精神）；export 面易误暴露 |
| 风险 | 低（tsconfig 仅影响 build exclude，测试编译是命令行模式不受影响——已核实） | 中（可读性回归、评审不可追溯） | 中-高（dist 污染/构建产物变更，FR-011 明文禁止） |
| 工作量 | 基准 | 同（但后续维护差） | 省 tsconfig 一行 |

### 3.2 决策点 B：A 档 11 源获取

| 维度 | 方案 A：受管镜像 fixture（ADR-002） | 方案 B：反向 import @lgdl/lgdl-web | 方案 C：读 examples/ 磁盘 .lgdl |
|------|:--|:--|:--|
| 描述 | render 包内 examples-sources.ts 逐字复制 EXAMPLES[i].source | 测试运行时 import lgdl-web 的 EXAMPLES | fs 读 examples/*.lgdl 文本 |
| 优点 | 测试自洽闭合；确定性；与断掉的 gen-examples 解耦 | 无镜像漂移（直接单一事实源） | 零复制 |
| 缺点 | 镜像与 web 源存在漂移窗口（R-008，低） | **不可行**：lgdl-web private:true 无 main/exports；CI 不 build web（ci.yml build 清单七包）；render 测试期 web dist 可能不存在；web 依赖 render 成环 | **违背 FR-008**「不依赖磁盘 .lgdl/.svg」（D-002 明文）；磁盘产物无人维护（10 孤儿 + 漂移 7/11 教训） |
| 风险 | 低（注释头 + review diff 抽查 + 快照以镜像为基线锁语义） | 高（构建时序脆弱、CI 必红） | 中-高（输入源不可信，与 spec 设计决策直接冲突） |
| 工作量 | 基准 | 低但不可用 | 低但违规 |

### 3.3 决策点 C：快照更新/重建机制

| 维度 | 方案 A：env 显式门（ADR-003） | 方案 B：独立重建 CLI/脚本 | 方案 C：npm script（render package.json） |
|------|:--|:--|:--|
| 描述 | `LGDL_UPDATE_SNAPSHOTS=1 npm run test --workspace @lgdl/lgdl-render` 写资产后自断言；普通模式无写分支 | 新增 scripts/gen-golden.mjs | package.json 加 `snapshots:update` |
| 优点 | 零脚本/零 package.json 改动；CI 不设 env 天然只读；FR-009 禁静默更新最强保证 | 语义独立 | 命令友好 |
| 缺点 | 更新与测试运行耦合（可接受：写后立即断言） | 新增脚本面（脚本蔓延，NG-002 精神冲突）；需维护参数 | package.json 脚本面改动（FR-011 只允许 test 脚本级最小调整） |
| 风险 | 低 | 中（CI/本地双入口易漂移） | 低-中（超出允许 diff 面） |
| 工作量 | 基准 | 多 ~0.5h | 多 ~0.25h |

## 4. 推荐方案

**推荐**：决策点 A/B/C 全部取**方案 A**（ADR-001/002/003 已落盘），几何审计独立实现（ADR-004）。

**理由**：
1. **约束匹配**：spec 全部硬约束（FR-011 收集面/不动 exports/构建产物、NFR-001 src 零 diff + dist/index.js 不变、NG-002 不加生成脚本、D-002 不依赖磁盘产物）只有三组方案 A 的组合能**同时**满足——方案 A 组把全部改动收敛到「新增测试文件 + 新增测试资产 + tsconfig 一行 exclude + 0 业务 diff」；
2. **组织可追溯**（NFR-006）：test-support 四模块 × 六测试文件按 FR 语义一一对应（FR-005→geometry-audit、FR-001→render-harness、FR-002/008→matrix-a/snapshot、FR-003→matrix-b、FR-004→kind-coverage、FR-006→geometry-audit.test、FR-007→degraded-paths），tasks/review 可直接核对；
3. **门禁独立视角**（ADR-004）：审计不复用 router/render 运行函数，避免「实现与门禁共享同一缺陷」——这正是 archify P1-1 教训（lessons-for-lgdl.md:114-125）在 LGDL 的落地；
4. **更新门最强**：env 显式 + 写后自断言 + manifest 确定性（无时间戳），CI 不可能静默覆盖基线（FR-009/EC-002）。

**B11 裁量（spec 开放问题 #8）**：默认 P2 可选——`LGDL_MATRIX_B11=1` 才启用（`test('B11…', {skip: !enabled})`），不计入常规时长预算（NFR-004 ≤60s 以默认矩阵为准）。

## 5. 文件影响分析

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| NEW | `.sddu/specs-tree-root/specs-tree-render-gate/ADR-001-test-support-placement.md` | 决策 A（本 Feature 过程产物） |
| NEW | `.sddu/specs-tree-root/specs-tree-render-gate/ADR-002-examples-source-mirror.md` | 决策 B（本 Feature 过程产物） |
| NEW | `.sddu/specs-tree-root/specs-tree-render-gate/ADR-003-golden-assets-and-update-gate.md` | 决策 C（本 Feature 过程产物） |
| NEW | `.sddu/specs-tree-root/specs-tree-render-gate/ADR-004-audit-datasource-independence.md` | 审计数据源决策（本 Feature 过程产物） |
| NEW | `packages/lgdl-render/src/test-support/geometry-audit.ts` | FR-005 审计 helper：Violation 类型、容差常量、SVG 轻量解析、G1~G5 判定（§6.1） |
| NEW | `packages/lgdl-render/src/test-support/render-harness.ts` | FR-001 基座：`renderDoc(source, id?)` = parse 断言 valid → await layoutDocument → renderSvg → 返回 {doc, layout, svg}；模块级 Map 缓存 |
| NEW | `packages/lgdl-render/src/test-support/examples-sources.ts` | FR-002/008 A 档 11 源镜像（ADR-002，从 lgdl-web/src/examples.ts 逐字复制，DO NOT EDIT 头注） |
| NEW | `packages/lgdl-render/src/test-support/matrix-docs-b.ts` | FR-003 B1~B10(+B11) DSL 注册表：{id, type, title, qRefs, intent, semanticLock, source}（§7） |
| NEW | `packages/lgdl-render/src/matrix-a.test.ts` | FR-001 最小基座用例 + A 档 11 例全链路（审计 0 违例）；每条 test() 独立定位 |
| NEW | `packages/lgdl-render/src/matrix-b.test.ts` | B1~B10 逐文档 test()（审计 0 违例 + 语义锁定/折叠断言 + B3/B4a/B4b/B9 快照锁现状） |
| NEW | `packages/lgdl-render/src/snapshot.test.ts` | FR-008/009/010：11 组字节+sha 双校验 + manifest 完整性 + env 更新门（ADR-003） |
| NEW | `packages/lgdl-render/src/geometry-audit.test.ts` | FR-006：五类判定正反例 ≥10（合成 (doc,layout,svg) 直接驱动 audit） |
| NEW | `packages/lgdl-render/src/kind-coverage.test.ts` | D-001 kind 覆盖核对表动态断言（§6.3） |
| NEW | `packages/lgdl-render/src/degraded-paths.test.ts` | FR-007：routeDefault 零长 / A* 无解→orthogonalize / routeRectilinear fallback 三场景（合成 LayoutResult fixture，唯一例外） |
| NEW | `packages/lgdl-render/test-assets/golden/{architecture,microservices,datastream,er,gantt,login-flow,ecommerce-flow,mindmap,sequence,state,uml-class}.svg` | FR-008 快照资产 ×11（tasks 建档：`LGDL_UPDATE_SNAPSHOTS=1` 一次性生成） |
| NEW | `packages/lgdl-render/test-assets/golden/manifest.json` | FR-008：`{version:1, ids, files:{id:sha256hex}}`（无时间戳，确定性） |
| MODIFY | `packages/lgdl-render/tsconfig.json` | exclude 追加 `"src/test-support"`（ADR-001；FR-011 允许的最小组织调整；唯一配置面改动） |
| — | `packages/lgdl-render/package.json` | **零改动**（既有顶层 glob 自动收集全部新 *.test.ts） |
| — | `.github/workflows/ci.yml` | **零改动**（FR-011 验收④，spec 明确不新增 workflow） |
| — | 引擎 4 包 src 业务文件 / dist 产物 / examples/ 磁盘文件 | **零改动**（NG-001/002/005，NFR-001 验收） |

> 注：快照资产 11 svg + manifest 为 build 阶段生成物（FR-008 建档），本 plan 仅定格式与流程（ADR-003）。

## 6. 测试架构设计

### 6.1 geometry-audit helper（FR-005，ADR-004）

签名与类型（按 spec FR-005）：
```ts
// src/test-support/geometry-audit.ts
export type ViolationKind = 'G1' | 'G2' | 'G3' | 'G4' | 'G5';
export interface Violation {
  type: ViolationKind;
  element: string;          // 定位串：class/坐标/d 段（NFR-003）
  detail: string;
  docRef?: string;          // 'nodes[i]' | 'edges[i]'（优先取 data-lgdl-loc）
}
export const AUDIT_TOL = {           // D-003 常量表，validate 校准走 EC-008
  orthoTolPx: 0.51, canvasPadPx: 1, labelPadPx: 2,
  cardinalityOffsetPx: 22, groupHeaderH: 30, groupPad: 20, // 仅文档化参照
} as const;
export function auditGeometry(doc: LgdlDocument, layout: LayoutResult, svg: string): Violation[];
```

判定实现要点（对应 D-003 表逐行，判定真值 = 解析后的最终 SVG）：

| 判定 | 数据源/选择器 | 规则 | 容差/豁免 |
|------|------|------|------|
| G1 非有限 | 双源：LayoutResult 全数值字段（nodes x/y/width/height、edges points、width/height）+ SVG rect/circle/line/polygon points/path d/text(x,y,font-size) 数值属性 | parse 后 `!Number.isFinite` 或 path d 非法 token（非 M/L 数字对）即报 | 无容差硬判定；path 数值含 NaN/Infinity 即报 |
| G2 斜段 | 仅连边：祖先 `<g class>` ∈ {lgdl-edge, lgdl-aggregate-edge, lgdl-dep, lgdl-message} 的 `<path>`(M/L 段)/`<line>` | 任一段 `min(|dx|,|dy|) > 0.51` 且另一向 >0.51 → 违例；path 含 C/Q/A 等非 M/L 命令 → fail-safe 报「无法判定段」 | 15° 锚点量化偏移 ≤0.51px 豁免；节点形状 path（entity 圆柱 A 弧/note 折角，render/index.ts:108-125）因在 lgdl-node g 内、不在选择器内 → 不审；defs marker polygon 不审 |
| G3 穿节点 | 连边 path 的水平/垂直段 × 障碍框 | 段与障碍框**内部**相交（开区间、长度>0）→ 违例；零长段不判 | 障碍 = ① LayoutResult.nodes bbox（节点形状取包围盒，与 routeBoxes render/index.ts:849-855 同源）② SVG 提取 lgdl-group/lgdl-lane rect（不复算 render 私有 computeGroupBox :481-518）。豁免：边自身 from/to 端点节点 + 拥有端点的组（嵌套 contains 递归，镜像 render groupsOwning :523-536）；贴边/重合不算（半开）；gantt 带（lgdl-gantt-lane）按组框语义计入、dep 端点所在带豁免（U-2 相关，见 §9） |
| G4 压框 | 全部 `<text>` | 估宽 bbox（CJK≈1.0fs、Latin≈0.62fs，行高 fs+4，镜像 labelBoxAt render/index.ts:246-251；text-anchor 定 x 向：middle=居中/start=左/end=右）与任一**非宿主**节点/组/泳道/带框相交（面积>0）→ 违例 | bbox 四周外扩 2px 后判交；宿主豁免：text 所在 `<g>` class ∈ {lgdl-node, lgdl-class, lgdl-participant, lgdl-gantt-bar, lgdl-gantt-milestone} → 宿主=该 LayoutResult 节点框；∈ {lgdl-group, lgdl-lane, lgdl-gantt-lane} → 宿主=同 g 内 rect 框；其余（edge/聚合/基数/轴/泳道头外）无宿主 → 不得压任何框；基数 22px 外置（render/index.ts:920-921）+ 2px 扩边 → 不应误报 |
| G5 越界 | 全部几何元素（rect/circle/line/polygon/path 外接/path d 顶点/text 估宽）；**defs 子树豁免**（模板非摆位几何） | 任一点超出 viewBox `0 0 W H` 外扩 1px → 违例；datastream：节点 bbox 须完整落入其泳道列 x∈[laneX-1, laneX+261]（列边界取 SVG lgdl-lane rect 按 x 序）；节点中心无 lane rect 覆盖（`_other`/`_default` 合成列）→ 降级画布检查（EC-003） | 画布 1px 数字舍入容忍；gantt/sequence 无泳道概念 → 仅画布 |

SVG 解析器：扫描式标签/属性正则 + `<g>` 嵌套栈（记录祖先 class 链 + data-lgdl-loc）+ text 内容捕获；对引擎机器生成标记（单行、属性双引号、无内嵌 `>`）确定适用；鲁棒性由自测（FR-006）锚定。定位串（NFR-003）示例：`G3 lgdl-edge nodes[2] d="M …" 段 (120,84)->(300,84) 穿 nodes[5] 框`。

### 6.2 验证矩阵测试组织（FR-001~FR-004）

- **基座复用**（FR-001）：render-harness 统一 `parse→layout→render→audit`，矩阵/快照/kind 三方共享；模块级缓存 `Map<docId, svg>` 避免同进程重复渲染；**矩阵用例一律真实 DSL 文本全链路**，禁手造 fixture（唯一例外 = degraded-paths.test.ts，FR-007 明示授权）。
- **A 档**（matrix-a.test.ts）：11 条 test()，每条 = EXAMPLES_SOURCES[i].source → 基座 → `assert.deepEqual(violations, [])`（FR-002）+ 快照一致由 snapshot.test.ts 承担（FR-007 职责分离，避免重复渲染两处断言）。首条附加 FR-001 最小基座用例（2 节点 1 边 inline DSL）验证链路自举。
- **B 档**（matrix-b.test.ts）：B1~B10 逐文档 test()，每条断言 = 审计 0 违例 + 文档专属语义断言（折叠/锁定/元素存在性，§7 表）；B3/B4a/B4b/B9 追加快照锁现状断言（调 snapshot 模块暴露的 compareOne(id, svg)，EC-004/EC-003 语义锁定）。
- **kind 覆盖核对表动态断言**（kind-coverage.test.ts，D-001 表 / FR-004）：不做静态死表，渲染核对表列出的 doc → 对 SVG 做**真实绘制断言**（对照 render SHAPES/FILL/STROKE 分派，render/index.ts:56-164）：

| kind | 核对文档 | 动态断言（元素级，NFR-003 可定位） |
|------|---------|------|
| start/end（药丸） | login-flow、ecommerce-flow、architecture、state、B1 | 该节点 `<g class="lgdl-node">` 内 `<rect rx≈node.width/2>`（render :58-73，pill） |
| process | A 全部 + B1 | `<rect rx=6>` |
| decision（菱形） | login-flow、ecommerce-flow、B1/B8 | `<polygon points=4顶点>`（render :84-104），顶点=node bbox 四边中点 |
| entity（圆柱） | er、architecture、datastream、B1/B8 | path d 含 `A` 圆弧段（render :108-116）；er members 行文本存在 |
| note（折角） | architecture、microservices、B1/B8 | path d 含折角顶点 `L x+w,y+12`（render :118-125） |
| state（回退 process） | state、B1 | **断言回退**：`<rect>` 且无 polygon/path（SHAPES 无 state 键，render :56-126/636-637） |
| milestone | gantt、B1、B7 | gantt：`<g class="lgdl-gantt-milestone">` 内 `<polygon>` 菱形（render :1136-1143）；非 gantt（B1）：回退 `<rect>` |
| group（容器/泳道） | architecture/microservices、login-flow(2 层)、state、datastream、uml-class、ecommerce-flow、gantt、B3/B4a | `<g class="lgdl-group/lgdl-lane/lgdl-gantt-lane">` + rect 存在且 contains 成员节点框在其内（嵌套 ≥2 由 login-flow 断言外层含内层） |
| 无 kind（回退 process） | mindmap、B1 | `<rect rx=6>`（shapeKindFor kind??process，render :456-457） |

- **Q-xxx 落点**：spec.md:160 映射表已全量覆盖（Q-001~Q-014 → FR-001~FR-012），plan 不新增范围；B 档注册表 meta 字段携带 qRefs 供评审追溯（NFR-006）。

### 6.3 快照测试（FR-008/009/010，ADR-003）

- snapshot.test.ts：`before` 读 manifest；11 条 test()（id 粒度定位）+ manifest 完整性 test（ids === 11、文件数、files 键齐）+ 普通模式只读守卫（无 LGDL_UPDATE_SNAPSHOTS 时任何写分支不存在）。
- 双校验：渲染串 === `{id}.svg` 字节 && sha256(渲染串) === manifest.files[id]。
- env 更新门：`LGDL_UPDATE_SNAPSHOTS=1` 时测试改写 11 svg + manifest 后**立即重渲自断言**（写后红即失败，防坏基线入库）。

## 7. B 档专项文档设计（FR-003，matrix-docs-b.ts + matrix-b.test.ts）

每个文档为**合法现代 DSL 文本**（parser 必须接受），文件内注释头标注 type/qRefs/意图/预期（NFR-006）：

| ID | type | 覆盖（等价类/缺口） | DSL 写法要点 | 预期验证 |
|----|------|------|------|------|
| B1 | flowchart | E2 全 kind 混排（Q-004/Q-012）；双向边/回边 | 8 形状 kind（start/end/process/decision/entity/note/state/milestone）混排 + 中英 label 混排 + 同对双向边 A→B/B→A | 审计 0 违例；decision polygon/entity A 弧/note 折角真实出现；state/milestone 回退 rect；双向边均渲染 |
| B2 | uml-class | E3 折叠（Q-004） | 混 kind：process/decision/note/无 kind + 1 entity(members 全字段)；LR 布局节点边 | 折叠成立：无 polygon/pill/圆柱 path（全部 `<g class="lgdl-class">` 卡片）；成员行与 data-lgdl-loc nodes[i].members[j] 存在；审计 0 违例 |
| B3 | mindmap | Q-013 group 语义锁（EC-004） | root 两分支，其一分支叶节点被 group contains | 渲染不炸 + 折叠（decision 叶也圆角 rect 无 polygon）+ 审计 0 违例 + 快照锁现状；group 绘制行为 ⚠️ U-1（render/index.ts:553-601 general 路径对 mindmap 亦画 group box，与 spec EC-004「被忽略」表述张力——不强断言，以快照为准） |
| B4a | sequence | Q-013 group 非参与者/聚合边漏画锁（EC-004） | 3 参与者 + group(contains 1 参与者) + 消息链 + 1 条 from=groupId 的边 | 渲染不炸 + lgdl-participant 数 = 3（group 不产生参与者头）+ 审计 0 违例 + 快照锁现状（消息漏画不判违例） |
| B4b | gantt | Q-013 聚合边漏画锁（EC-004） | 2 分区 group（各含任务）+ 任务依赖 + 1 条 group→task 边 | 渲染不炸 + lgdl-dep 数 = 任务间依赖数（group 边不成 dep）+ 审计 0 违例 + 快照锁现状 |
| B5 | flowchart | Q-005 聚合边 g→n（E5 三态补全；A 档已含 g→g、n→g） | 1 group 含若干节点 + 组外节点；edges 含 g→组外节点 | lgdl-aggregate-edge path 正交（d 仅 M/L、G2 过）+ label 白底 rect 存在 + 审计 0 违例 |
| B6 | flowchart | Q-006 扇出标签合并 | 1 源 → 3 同 label target + 1 异 label target | 同 label 文本渲染次数 = 1（owner 一次，render/index.ts:776-803/880-890 合并语义）+ 异 label 各一次 + 审计 0 违例 |
| B7 | gantt | Q-008 依赖三型 + D4 负日期（E5/Q-008） | 任务含 attrs.start 负值（-3 起，负日期归一 layout/index.ts:701-714）+ 三依赖对：gap≥20 / gap≈0（target.start=source.end）/ 目标在左（绕行 render/index.ts:1096-1113） | 审计 0 违例（G2/G5）；负日期条不从轴外起；依赖段全正交；⚠️ U-2（垂直段穿中间条风险——按"垂直段落空列"构造，构造不出走 EC-001 降级） |
| B8 | er | Q-007 基数全枚举 + E2 混 kind（decision/note/entity members） | entity×3（members）+ decision/note 混入 + 基数 1/0..1/0..*/1..* 双向（parser.ts:322-331 合法枚举） | 基数文本锚点 22px 外置不压框（G4）+ 关系 label 与基数互不压 + decision/note 在 er mode 真实绘制 + 审计 0 违例 |
| B9 | datastream | Q-009/EC-003 `_other` 混合态 | 2 真实 group（各含节点）+ 未分组节点（layout 合成 `_other` 尾列 layout/index.ts:602-616） | lane rect 数 = 2（`_other` 无底框现状锁定）；`_other` 列节点走画布检查降级（EC-003）；审计 0 违例 + 快照锁现状 + 记录开放问题 #7 实证结论 |
| B10 | state | Q-011 初始伪态多/零入口 | 两个用例：(a) 多入口状态机（2 个 in-degree 0 state）；(b) 纯环状态机（全体 in-degree≥1，findInitialState null render/index.ts:220-228） | 均无 `<g class="lgdl-initial">` 元素 + 审计 0 违例 + 单入口对照组（A 档 state 有 initial） |
| B11（P2） | flowchart | Q-001 大图 grid 边界（>120 节点，layout/index.ts:85/124-129/762-798） | ~130 无 group 节点链式边 | `LGDL_MATRIX_B11=1` 才启用（默认 skip）；审计 0 违例 + 时长另评估（NFR-004） |

## 8. 快照基线与再生成流程（FR-008/010，ADR-003）

```
首次建档（tasks 阶段，一次性）：
  1. 从 packages/lgdl-web/src/examples.ts 复制 11 源 → src/test-support/examples-sources.ts（ADR-002）
  2. 普通模式跑 render 测试 → 快照用例红（资产缺失，预期）
  3. LGDL_UPDATE_SNAPSHOTS=1 npm run test --workspace @lgdl/lgdl-render
     → 生成 test-assets/golden/{id}.svg × 11 + manifest.json（当前引擎重渲染为基线，D-002）
  4. 移除 env 再跑普通模式 → 全绿（建档自证：重渲染与基线逐字节一致，FR-008）
  5. git diff 人工核对镜像与 11 资产 → 独立 commit（FR-009 规程）
基线漂移处置（EC-002）：引擎后续合法改动致红 → 作者确认有意 → 步骤 3 显式重建 + 独立 commit
再生成（FR-010）：同步骤 3；manifest 确定性（无时间戳）→ 重建后 git diff 仅展示真实字节变化
禁静默更新（FR-009）：普通模式代码无写分支；CI 不设 env
```

## 9. 风险评估（R-001~R-007 逐一 + 新增）

| # | 风险 | 概率 | 影响 | 缓解措施（本 plan） |
|---|------|:--:|:--:|------|
| R-001 | 文档/示例与代码语义漂移；磁盘 .svg 漂移 7/11 | 高 | 高 | 快照对象集 = examples.ts 11 事实源 + **基线=当前引擎重渲染**（D-002/ADR-003），磁盘产物作废不入库；镜像 fixture 复制自 web 源而非磁盘 |
| R-002 | gen-examples.mjs 链路断 → 快照不可再生 | 高 | 高 | 快照再生链路与 gen-examples 解耦：镜像（ADR-002）+ env 重建门（ADR-003），从 examples.ts/镜像出发，不依赖磁盘 .lgdl/.svg |
| R-003 | 审计口径从零定义，估宽启发式脆弱 | 中 | 中 | D-003 常量入 AUDIT_TOL 命名导出；FR-006 ≥10 正反例自测（不哑火不误报）；11+10 文档实测校准；误报走 EC-008 作者批准调容差（如 labelPadPx 2→3），禁静默放宽 |
| R-004 | 矩阵体量失控 | 中 | 中 | D-001 E1~E6 等价类合并已定（A 11 + B ~10 ≈ 21~22）；kind×type 不笛卡尔积；B11 P2 env 开关；本 plan 落为 6 个测试文件固定结构 |
| R-005 | datastream `_other` 等无样例角落现真红 | 中 | 中 | EC-001 流程：合法文档 + 引擎真缺陷 → 不修引擎（NG-004），标记 xfail/移出全绿 + 记已知缺口 + 上报作者；不通过放宽审计掩盖。B9 已按「0 违例 + 快照锁现状」设计，若实测违例 → 走 EC-001/开放 #7 |
| R-006 | ascii/loc 范围未定义 | 低 | 低 | ascii 14 例为 ASCII 渲染（renderAscii 出口），本 Feature 门禁面 = renderSvg SVG 出口（spec 范围），ascii 不动、不入矩阵（记录） |
| R-007 | 全仓 437 只增不删守恒 | 低 | 低 | 本 plan 预计新增 ~57 条 test()（矩阵 A 12 + B 11 + 快照 12 + 审计自测 ≥10 + kind 覆盖 9 + 退化 3）→ 全仓 ≈494；零删除/零弱化（只新增文件）；FR-012/git diff review 核查 |
| R-008（新增） | examples-sources.ts 镜像与 web examples.ts 漂移 | 低 | 低 | DO NOT EDIT 头注 + 同步规程；review 阶段 diff 抽查；快照基线以镜像为锚 → 漂移不静默（下次显式重建才更新） |
| R-009（新增） | B3 mindmap+group 绘制行为与 spec EC-004 表述张力（U-1） | 中 | 低 | B3 断言不绑定「忽略 vs 绘制」具体语义，以「渲染不炸 + 折叠 + 0 违例 + 快照锁」为准；build 实测后若与 spec 表述冲突 → 记录并同步作者 |
| R-010（新增） | G3/G4 在 gantt/mindmap/sequence 专属几何上误报（U-2/U-3） | 中 | 中 | 障碍/宿主规则按 mode 分支建模（§6.1 表）；正反例先行 + A/B 档全量实测校准；真误报 → EC-008 作者批准调容差 |
| R-011（新增） | B7 gantt 依赖垂直段穿中间任务条（renderGantt 无避障 render/index.ts:1088-1117） | 中 | 中 | A 档 gantt 线性链已核对 0 穿（垂直段落空列）；B7 文档按空列构造；构造不出 → EC-001 降级记录，不修引擎 |

## 10. 回归验证总表（NFR 验收映射）

| 验证 | 命令/方式 | 覆盖 |
|------|----------|------|
| NFR-001 旁路零业务 diff | build 前后 `sha256sum packages/lgdl-render/dist/index.js` 一致 + `git status --porcelain` 仅新增测试/资产 + tsconfig 一行 | src 业务零 diff；dist 产物不变 |
| NFR-002 零语义改动 | 首次建档即证明当前引擎字节被完整记录（快照全绿）；引擎包无行为分支被触碰 | render/layout/router/core 行为不变 |
| NFR-003 可定位 | 人为注入 1 处违例 → 失败信息含违例类型+元素+文档（Violation.element/docRef）；快照失败含 id | 审计/快照失败信息（validate 实测） |
| NFR-004 时长预算 | `time npm run test --workspace @lgdl/lgdl-render` ≤60s（B11 默认 skip） | ~22 文档全链路 + sha + 自测 |
| NFR-005 确定性 | ci.yml Node 20（既有）下本地/CI 快照一致；若字节差 → EC-006 流程 | 快照跨环境稳定 |
| NFR-006 可追溯 | 评审抽查 ≥3 文档注释（qRefs/意图）完整；kind 覆盖核对表动态断言 9 格 | B 档注册表 + matrix-b 注释 + kind-coverage |
| FR-011 门禁 | `npm run test --workspace @lgdl/lgdl-render` 全绿 + `npm run test --workspaces` 全绿 + ci.yml 无 diff | 收集面零改动收录 |
| FR-012 守恒 | 落地后 `grep -ro "test(" packages --include="*.test.ts" | wc -l` ≥ 437（预计 ≈494）+ git diff 无既有断言删除/弱化 | 只增不删 |

## 11. 开放问题处置映射（spec §8）

| # | 问题 | 处置 |
|---|------|------|
| 1 | gen-examples.mjs 修复 + 磁盘重生成 | 保持待作者（NG-002，本 Feature 只建测试侧 golden） |
| 2 | examples/ 磁盘 10 孤儿处置 | 保持待作者（NG-005） |
| 3 | 快照资产落位与重建入口 | **已决策** → ADR-003（test-assets/golden + manifest + env 更新门） |
| 4 | 矩阵多文件结构与收集面 | **已决策** → ADR-001（顶层 *.test.ts + test-support，test 脚本零改动，EC-007 不触发） |
| 5 | Q-010 退化路径可构造性 | **plan 判定**：routeDefault 零长、routeRectilinear fallback 可用合成 LayoutResult fixture 稳定驱动 renderSvg（degraded-paths.test.ts 场景 1/3）；A* 无解→orthogonalize 兜底以 router.test.ts 既有 8 例 + 场景 2（密集障碍+受限 bounds 逼近无解）覆盖，无法 100% 复现「无解」分支 → 场景 2 若红则降级：断言输出有限/正交/不抛（不依赖特定分支命中），开放 #5 保持 open 至 validate 实测 |
| 6 | 目标版本 | 保持待作者 |
| 7 | `_other` 合成泳道无底框 | B9 实证后记录结论 → 保持待作者 |
| 8 | B11 大图 | **plan 裁量**：P2 可选，`LGDL_MATRIX_B11=1` 启用（默认 skip，不进 ≤60s 预算） |

## 12. 工作量估算

| 项 | 内容 | 估时 |
|----|------|------|
| test-support | geometry-audit（SVG 解析 + G1~G5 + 常量） | 4~5h |
| test-support | render-harness + examples-sources 镜像复制 + matrix-docs-b 注册表 | 2~2.5h |
| matrix-a + matrix-b | 22 文档用例 + 语义锁定/折叠断言 + kind 覆盖动态表 | 2.5~3h |
| snapshot | 快照比对 + manifest + env 更新门 + 首建 11 资产 | 1~1.5h |
| 自测/退化 | geometry-audit.test（≥10 正反例）+ degraded-paths（3 场景） | 1.5~2h |
| 收尾 | 全仓回归、守恒计数、dist hash 前后比对、NFR-003 注入实测 | 1h |
| **合计** | | **≈ 13~15h（约 2 人日）** |

## 13. 生成的 ADR

| ADR | 标题 | 状态 |
|-----|------|:--:|
| ADR-001 | 测试侧代码落位与编译边界（test-support + tsconfig exclude） | ACCEPTED |
| ADR-002 | A 档 11 源获取策略（render 包内受管镜像，禁跨包反向依赖） | ACCEPTED |
| ADR-003 | golden 快照资产格式与更新门（test-assets + 字节/sha 双校验 + env 显式重建） | ACCEPTED |
| ADR-004 | 几何审计数据源与独立实现策略（SVG 为真值 + 不复用 router 运行函数） | ACCEPTED |

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建 — 测试架构（audit 五判定实现语义 + 矩阵组织 + kind 动态核对表）/ 文件落位（test-support + 6 测试文件 + test-assets + tsconfig 一行）/ B 档 B1~B10 文档设计表 / 快照建档与 env 更新门流程 / CI 零改动接入 / R-001~R-007 + 4 项新增风险 / 工作量 ≈13~15h / 4 ADR（决策点 A/B/C 取方案 A + 审计独立实现） | 2026-09-02 | SDDU Plan Agent |
