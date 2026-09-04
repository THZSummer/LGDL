# 构建报告：specs-tree-examples-consolidation（示例图整合）

> **文档定位**: SDDU 构建报告 — 记录全部任务的文件变更和实现结果，作为 review 阶段的输入
> **前置依赖**: tasks.md v1.1（任务清单）、plan.md v1.0（技术方案）、spec.md v1.0（需求规范）
> **创建人**: SDDU Build Agent
> **创建时间**: 2026-09-04
> **版本**: v1.0
> **更新人**: SDDU Build Agent
> **更新时间**: 2026-09-04
> **更新说明**: 初始创建 — TASK-001~010 全部完成，含 EC-001 作者裁决偏差 2 项

## 1. 构建概要
> 本次构建的整体统计

| 维度 | 数值 |
|------|:--:|
| 完成任务数 | 10 / 10 |
| 复杂度分布 | S×3 / M×6 / L×1 |
| 新增文件 | 1（build.md 本报告） |
| 修改文件 | 源码/测试/脚本 7 个 + 磁盘产物 27 个 + golden 5 个 + 删除 38 个（详见 §2） |
| 波次 | 6/6 全部执行 |

**验证总览**：
- 全仓 `npm run test --workspaces`：**0 fail**（lgdl-core 267 / lgdl-render 95（1 预置 skip=B11 env 门控）/ matrix-a+b+kind-coverage 35 / lgdl-router 79 / 其余 8+11+14 等）
- matrix-a 9 条 **audit 0 违例**（含 er n:m 双多、gantt 里程碑+依赖三型、ecommerce platform 嵌套）+ er edges[0]=user→order / uml-class edges[1] 专项穿体断言通过
- matrix-b 对照组全绿（B10 state 单入口 initial 不受影响）
- 四面一致：examples.ts ↔ 镜像 examples-sources.ts ↔ 磁盘 examples/*.lgdl ↔ golden manifest ids **9/9 逐字对齐**（无孤儿无缺漏）
- 9 id × 9 type 一一映射，类型集合不变：arch/datastream/er/gantt/flowchart/mindmap/sequence/state/uml-class

## 2. 文件变更
> 本次构建涉及的全部文件操作（含源码、测试、产物等所有类型）

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| MODIFY | `packages/lgdl-web/src/examples.ts` | TASK-001 | 11→9：删 microservices/login-flow 2 条目；er/gantt/ecommerce-flow 3 source 终态改写；保留 6 例逐字零 diff |
| MODIFY | `scripts/gen-examples.mjs` | TASK-002 | 4 处旧包路径 → packages/lgdl-core\|lgdl-layout\|lgdl-render/dist、lgdl-web/src |
| MODIFY | `scripts/render-one.mjs` | TASK-002 | 3 处 import 旧包路径 → lgdl-* |
| MODIFY | `packages/lgdl-render/src/test-support/examples-sources.ts` | TASK-003 | 镜像 11→9（删 2 + er/gantt/ecommerce 3 条逐字同步）；头注释 11→9 source |
| MODIFY | `packages/lgdl-render/src/kind-coverage.test.ts` | TASK-004 | login-flow 3 处断言换档 ecommerce-flow + er typed 行文本适配 + 核对表引用同步（无删/弱化） |
| MODIFY | `packages/lgdl-render/src/snapshot.test.ts` | TASK-005 | 计数/文案 11→9（:73 ids.length 9） |
| DELETE | `examples/{arch-ecommerce,datastream-log,er-orders,flowchart-auth,gantt-saas-roadmap,group-node-demo,mindmap-product,sequence-order,state-order,uml-class-order,microservices,login-flow}.{lgdl,svg,png}` | TASK-007 | 删 12 组三件套 36 文件 |
| MODIFY | `examples/{architecture,datastream,er,gantt,ecommerce-flow,mindmap,sequence,state,uml-class}.{lgdl,svg,png}` | TASK-008 | gen-examples 重生成 9 组三件套（磁盘 .lgdl 与 examples.ts 逐字 9/9） |
| DELETE | `packages/lgdl-render/test-assets/golden/{login-flow,microservices}.svg` | TASK-009 | 孤儿快照删除 |
| MODIFY | `packages/lgdl-render/test-assets/golden/{er,gantt,ecommerce-flow}.svg` + `manifest.json` | TASK-009 | LGDL_UPDATE_SNAPSHOTS=1 显式重建 9 组（ids 9） |
| KEEP | `packages/lgdl-render/test-assets/golden/{architecture,datastream,mindmap,sequence,state,uml-class}.svg` | TASK-009 | 重建后字节 0 diff 自证 ✓ |
| MODIFY | `packages/lgdl-layout/src/index.ts` | 偏差-2 | **作者裁决引擎微修复**：layoutGrouped 嵌套组框顶 keep-on-canvas（详见 §5 偏差-2） |

### 2.1 三例增强终态内容（9 图类型不变，一一映射）

| 图（id / type） | 终态增强内容 |
|---|---|
| er / er | 5 实体（user/order/product/order-item/promotion）members 全带 type（bigint/varchar/decimal/int 16 行 typed）；amount-note note 混 kind 便签；6 条边——5 条带基数覆盖 **1 / 0..1 / 0..* / 1..* / \*..\*（n:m 双多 promotion↔product）** + 1 条 note→order 无基数约束边；**edges[0]=user→order 守序** |
| gantt / gantt | launch 里程碑 `attrs.duration: 0`（文本 `18d +0d`）；新增 doc（文档编写 start10 dur2）/ retro（发布复盘 start38 dur4）2 process 节点 → 7 任务行；6 依赖边覆盖三型——gap≈0 链 ×4（research→design→develop→test→launch，target.start=source.end）+ **目标在左** test→doc（10<18）+ **gap≥20** test→retro（38−18=20） |
| ecommerce-flow / flowchart | 新增 platform（电商平台 / group / contains [shopping]）外组 → 5 组；platform ⊃ shopping ⊃ browse/cart **2 层嵌套**；14 业务节点 + 17 边零改动（偏差-1：contains 由 4 域缩为 [shopping]，见 §5） |

## 3. 任务完成清单
> 每个任务的完成状态

| 任务 | 名称 | 复杂度 | 状态 | 对应 FR |
|------|------|:--:|:--:|------|
| TASK-001 | examples.ts 内容面 11→9（删 2 例 + er/gantt/ecommerce-flow source 终态改写） | L | ✅ completed | FR-001~FR-005 |
| TASK-002 | 脚本包路径修复（gen-examples.mjs 4 处 + render-one.mjs 3 处） | S | ✅ completed | FR-007 |
| TASK-003 | examples-sources.ts 镜像同步 11→9（逐字 + 头注释） | M | ✅ completed | FR-009 |
| TASK-004 | kind-coverage.test.ts 断言换档（login-flow→ecommerce-flow）+ er typed 适配 | M | ✅ completed | FR-012 |
| TASK-005 | snapshot.test.ts 计数断言 11→9 | S | ✅ completed | FR-010 |
| TASK-006 | matrix-a / matrix-b 零改动复核（只读验证） | S | ✅ completed | FR-013 |
| TASK-007 | examples/ 磁盘删 12 组三件套（10 孤儿 + microservices/login-flow，36 文件） | M | ✅ completed | FR-006 |
| TASK-008 | 磁盘重生成 9 组三件套（dist 构建 → gen-examples → 双向比对） | M | ✅ completed | FR-008 / NFR-002 |
| TASK-009 | golden 快照重建 + git diff 审阅（5 判据） | M | ✅ completed | FR-011 / NFR-003 / NFR-005 |
| TASK-010 | 全仓验收（四面一致 + 测试守恒 + 引擎零 diff 边界） | M | ✅ completed | FR-014 / NFR-001~004 |

## 4. 测试覆盖
> 每任务验证方式与结果（build 阶段全绿；运行时断言改动经 TASK-009 golden 重建后自证）

| 任务 | 验证 | 结果 |
|:--:|------|:--:|
| TASK-001 | 正则抽取 9 条 source → parseLgdl valid + id 序断言 + er/gantt/ecommerce 内容断言脚本 | ✅ 9/9 valid，序正确 |
| TASK-002 | grep 旧路径无匹配 + /tmp 冒烟渲染 | ✅ svg 产出 692x440 |
| TASK-003 | lgdl-render build:test + 双向比对脚本（镜像↔web 逐字） | ✅ 9/9 一致 |
| TASK-004 | build:test + node --test kind-coverage（11 tests） | ✅ 全绿（迁移后 + gantt 菱形原样） |
| TASK-005 | grep 无 11 残留 + build:test | ✅ 编译通过 |
| TASK-006 | matrix-a 9 条 + matrix-b 全绿 + git status 零改动 | ✅（偏差-1/-2 修复后 0 违例） |
| TASK-007 | ls 计数 9/9/9 + 残留断言循环 | ✅ |
| TASK-008 | gen-examples 退出码 0 + 磁盘↔examples.ts 逐字 9/9 + 无孤儿 | ✅ |
| TASK-009 | LGDL_UPDATE_SNAPSHOTS=1 重建 → 普通模式复跑（manifest 9 ids + 9 双校验）+ git diff 五判据 | ✅ 全绿 |
| TASK-010 | `npm run test --workspaces` + 四面一致脚本 + type 映射 + git diff 审阅 | ✅ 0 fail |

## 5. 偏差与裁决记录
> EC-001 / 作者裁决全过程（build 中遇到 plan 未覆盖实际情况的记录）

**背景**：TASK-006 matrix-a 对增强后的 ecommerce-flow 报真实几何违例（仅该例红；er/gantt 增强 0 违例）。逐级排查结论如下。

| # | 现象（实证） | 根因 | 裁决 |
|:--:|------|------|------|
| 1 | spec D-002「platform contains 4 域」触发 matrix-a 真实违例：G2（聚合边 trade→fulfillment/fulfillment→after-sale 退化斜线 `M 400,1376 L 196,1696`）、G4（聚合边 label 压 platform 框）、G5（platform 框顶 -10 越界） | 引擎 `routeRectilinear` 障碍集（routeBoxesAgg，render index.ts:798-805）只豁免两个端点组自身、**不含端点组的祖先组**：platform 整框成障碍且包住两端点 → 全部正交候选被 `pathCrosses` 拒 → 落入直线 fallback（斜段）。login-flow 旧载体能过是因 auth→backend fallback 直线恰好正交且框小 | **作者裁决「platform 仅包 shopping（推荐）」**：`contains: [shopping]`。保留 5 组 + platform⊃shopping 2 层嵌套 A 档载体，kind-coverage 断言（rect 5 + 外含内）不变，17 边/14 节点零改动；D-002「contains 4 域」字样记入偏差（电商平台包装购物域，聚合边保持跨域平铺路由） |
| 2 | 偏差-1 后 v_shopping 仍残留 1 个 G5：platform 框顶 `(380,-10,240,340)` 越 viewBox 顶 10px | 引擎布局 `layoutGrouped` 画布 bounds 只把**顶层**组 super-node 计入（lgdl-layout/src/index.ts:319-324），**嵌套组**（contains 只含组的组）无 super-node 未计入；组框标题 50px > 画布顶部预留 40px（GRAPH_MARGIN）。4 域中 shopping 是唯一非聚合端点组（可套但 10px 越界）；trade/fulfillment/after-sale 全是聚合端点（套任一 → G2）→ 纯内容 DSL 无解 | **作者裁决「引擎微修复（解除零 diff）」**：`packages/lgdl-layout/src/index.ts` layoutGrouped 新增嵌套组框顶 keep-on-canvas——按 renderer computeGroupBox 同构递归（组框顶 = min(member 顶) − 50）求全部组框 deficit，<0 时整体下移补足。效果：platform 框顶 -10→0，platform 完整含 shopping（实测 rect [380,0,240,340] ⊃ [400,50,200,270]）；仅在存在嵌套组且确实越界时生效，其余 8 图 + B 档 fixture 布局字节零影响（golden 六 svg 0 diff 自证） |
| 3 | golden 审阅判据 4 ecommerce 项按偏差-1 调整为：「platform 外框完整含 shopping 内框（2 层嵌套），trade/fulfillment/after-sale 平铺不入 platform 框」 | 与偏差-1 联动 | 记录调整 |
| 4 | 磁盘非增强 6 组（architecture/datastream/mindmap/sequence/state/uml-class）重生成后 .svg/.png 字节变化 | 修正 render-gate D-002 记录的历史磁盘漂移 7/11（snapshot.test.ts:5 注释佐证）；验收以「磁盘 .lgdl ↔ examples.ts 逐字一致 + .svg 为当前引擎渲染字节」为口径（FR-008），不以旧磁盘字节为基线；golden 六 svg 0 diff 自证不受影响 | 记录（plan §5.6 已预见） |
| 5 | PNG 重生成依赖 | @resvg/resvg-js 未安装；以 `npm i --no-save @resvg/resvg-js` 临时安装（仅 node_modules，package.json/package-lock 零改动）；gen-examples 对 PNG 缺失的容错逻辑（:47-55）未动 | 记录 |

**未改项确认**：引擎 4 包 src 除偏差-2 单文件单点外零 diff；README/docs/op-cli 文档串零 diff；App.tsx 零 diff（EXAMPLES[0]=architecture 无感）；matrix-a/matrix-b 两测试文件零 diff；gantt milestone 菱形断言（duration=0 不影响 kind）、datastream 泳道、mindmap 无 kind 断言均未动。

## 6. 下一步

| 场景 | 操作 |
|------|------|
| 全部任务已完成 | 运行 `@sddu-review specs-tree-examples-consolidation` 开始审查 |

## 修订记录
> 记录本文档的版本变更历史

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建 — TASK-001~010 全部完成（6 波次）；偏差记录 5 项（EC-001 作者裁决 2 项：D-002 contains→[shopping] + lgdl-layout 引擎微修复例外） | 2026-09-04 | SDDU Build Agent |
