# 审查报告：specs-tree-examples-consolidation（示例图整合）

> **文档定位**: SDDU 审查报告（ADR-004 双文件之二）— 逐项记录 C1~C17 审查执行结果，作为 validate 阶段的输入
> **审查策略**: review.md v1.0（C1~C17 审查清单 + 偏差② 判定分档）
> **前置依赖**: spec.md v1.0、plan.md v1.0、build.md v1.0、tasks.md（10/10 completed）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-04
> **审查轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-04
> **更新说明**: R1 初始执行 — 读整合后代码 + git diff + 静态核验（含 sha256 双校验与逐字比对）；2 项 build 偏差重点复核

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查项总数 | 17 |
| 通过 | 16 |
| 警告 | 1 |
| 失败 | 0 |
| 阻塞问题 | 0 |

## 2. 逐项审查结果（C1~C17）

| # | 审查对象 | 审查基准 | 评估 | 发现 | 严重程度 |
|---|---------|---------|:--:|------|:--:|
| C1 | examples.ts 缩编 11→9 | FR-001 / D-001 / plan §5.1 | ✅ | git diff 确认删除 microservices/login-flow 2 条目；脚本实测 9 条目 id 序 = architecture,datastream,er,gantt,ecommerce-flow,mindmap,sequence,state,uml-class（D-001 序一致）；EXAMPLES[0]=architecture 未动；文件头 "THE single source of truth" 注释保留；磁盘 .lgdl ↔ examples.ts source 逐字一致 9/9 | — |
| C2 | ecommerce-flow 2 层嵌套 + 偏差①（contains [shopping]） | FR-002 / D-002 / build 偏差-1 | ✅ | 源含 `platform`（label 电商平台 / kind group / contains: [shopping]）；golden ecommerce-flow.svg 实测 5 个 lgdl-group（nodes[14~18] = shopping/trade/fulfillment/after-sale/platform）；platform rect (380,0,240,340) ⊃ shopping rect (400,50,200,270)（外含内成立）；业务节点 14 个 + 17 边零改动（source diff 仅新增 platform 声明段）；聚合边 trade→fulfillment `M 400,1386 L 196,1386 L 196,1706` 正交（无 G2 退化斜线）。偏差① 详析见 C13 | 见 C13 |
| C3 | er 增强 | FR-003 / D-003 | ✅ | source 与 D-003 表逐字段一致：5 实体（user/order/product/order-item/promotion）16 行 typed members（bigint/varchar/decimal/int）；amount-note kind:note 便签 + note→order 无基数约束边；5 条带基数边覆盖 1 / 0..1 / 0..* / 1..* / n:m 双多（edges[3] 使用 0..1 / edges[4] 覆盖 *..*）；edges[0]=user→order（label 拥有，1→0..*）守序。er.svg 实测 nodes[0..5]=用户/订单/商品/订单项/促销/便签，行文本 `id: bigint` 等 typed；edges[0] path `M 180,92...` 存在 | — |
| C4 | gantt 增强 | FR-004 / D-004 / ADR-001 | ✅ | source：launch duration:0；新增 doc(start10/dur2)/retro(start38/dur4)（ADR-001 节点化构造）；6 边。数值逐边验算：research→design 3=0+3 ✓ / design→develop 6=3+3 ✓ / develop→test 14=6+8 ✓ / test→launch 18=14+4 ✓（gap≈0 链 ×4）；test→doc doc.start10 < test.end18（目标在左）✓；test→retro 38−18=20 ≥20（gap≥20）✓。gantt.svg 实测 7 任务行、milestone 菱形 1 个、文本 `18d +0d` 就位、6 条 lgdl-dep 依赖边（edge4 向左绕行 724→510→248 目标在左几何成立；edge5 长距 724→744→1248 gap≥20） | — |
| C5 | 保留 6 图 source 零 diff | FR-005 / FR-013② | ✅ | git diff examples.ts 中 architecture/datastream/mindmap/sequence/state/uml-class 6 例 source 无任何字符变化（diff 仅含删 2 + 改 3）；镜像保留 6 条 0 diff；matrix-b.test.ts git diff 零改动（B10 state 对照组 + :249-251 原样） | — |
| C6 | 磁盘删 12 组三件套 | FR-006 | ✅ | `ls examples/*.lgdl|svg|png` 各 9；git status 确认 12 组（arch-ecommerce/datastream-log/er-orders/flowchart-auth/gantt-saas-roadmap/group-node-demo/mindmap-product/sequence-order/state-order/uml-class-order/microservices/login-flow）全部 .lgdl/.svg/.png 删除；残留 grep 空 | — |
| C7 | 脚本包路径修复 | FR-007 / EC-006 | ✅ | gen-examples.mjs 4 处（:3 注释 + :15/:16/:17/:20 import/read）+ render-one.mjs 3 处（:12-14）全部 → lgdl-core/lgdl-layout/lgdl-render/lgdl-web 现路径；全仓旧路径残留 grep 仅命中 lgdl-web-cli-base 历史迁移注释（非本链路依赖，零行为影响）；PNG 容错逻辑未动 | — |
| C8 | 磁盘重生成 9 组 + 逐字一致 | FR-008 / NFR-002 | ✅ | 脚本实测 9/9 磁盘 .lgdl 与 examples.ts source 逐字一致；磁盘 6 组非增强 svg 与 golden 字节一致（architecture/datastream/mindmap/sequence/state/uml-class 逐一 cmp ✓）；PNG 经 --no-save 临时装 @resvg/resvg-js 重生成（package.json/lock 零改动，build 偏差-5 记录） | — |
| C9 | 镜像 examples-sources.ts 11→9 | FR-009 / ADR-002 | ✅ | git diff 确认删 microservices/login-flow 2 条 + er/gantt/ecommerce-flow 3 条逐字同步（与 examples.ts 终态 source 逐字一致，无 import web 成环）；头注释 "11 source"→"9 source"；保留 6 条原始行零改写（diff 仅 10 行 = 3 改 + 2 删 + 1 注释） | — |
| C10 | snapshot.test.ts 断言 11→9 | FR-010 / NFR-003 | ✅ | :73 ids.length 断言 11→9（错误文案同步）；文件头/注释 11→9；无 "11 source"/"length, 11" 等残留；更新门 `LGDL_UPDATE_SNAPSHOTS === '1'` 才写盘（:51-67），普通模式无写盘分支（静态走查确认） | — |
| C11 | golden 显式重建 + diff 审阅 5 判据 | FR-011 / NFR-003 / NFR-005 | ✅ | 判据① 变更集上界：git 变更 ⊆ 明列文件 + lgdl-layout 例外（偏差②）；② 仅 er/gantt/ecommerce-flow 3 svg 变更 + 删 login-flow/microservices 2 svg，architecture/datastream/mindmap/sequence/state/uml-class 6 svg **字节 0 diff**（逐文件 `git diff --quiet` 确认）；③ manifest ids 9 + files 键齐 + version 1 + 无时间戳；④ 三 svg diff 内容核验（er 含促销/typed/基数五值；gantt 含 `18d +0d`/7 任务/6 边；ecommerce 含 platform y=0 5 组 + 正交聚合边）；⑤ sha256 双校验 **9/9 一致**（node 实测 manifest.files ↔ 文件） | — |
| C12 | 偏差② 复核：引擎 keep-on-canvas 修复 | NG-003/004 / NFR-001 / EC-001 | ⚠️ | **真实修复，非绕过门禁**（代码走查 + 影响面论证见 §5.1）；但属 spec 明列 scope.out 越界（引擎 src 改动），需作者在 validate 前追认 NFR-001 例外（详见 §5.1 偏差② 专项） | 高（记录项，非阻塞） |
| C13 | 偏差① 复核：platform contains [shopping] | EC-001 / FR-002 / build 偏差-1 | ✅ | **裁决合理**：4 域全包触发真实违例，根因 = 引擎 routeRectilinear 聚合边障碍豁免不含端点组的祖先组（平台整框成障碍 → 正交候选全拒 → 直线 fallback）；login-flow 旧载体通过系几何巧合（fallback 恰正交 + 框小）。收窄为 [shopping] 后 FR-002 验收锚点全部保持（rect 5、platform⊃shopping 外含内、kind-coverage 断言不变、matrix-a 0 违例），D-003/D-004 覆盖语义零降级；未修引擎未放宽审计（合规于 NG-004）。**引擎缺陷本身未登记 KNOWN**（改进建议） | 低（改进） |
| C14 | 文件影响对齐 + 无越界 | FR-014⑤ / NG-001~007 / plan §5.8 | ✅ | git status/diff 全仓扫描：变更 = examples 磁盘 9 组（删 12 + 重生成）、examples.ts、examples-sources.ts、kind-coverage/snapshot.test.ts、golden（3 改 2 删 + manifest）、gen-examples/render-one.mjs、lgdl-layout/src/index.ts（偏差② 例外）；**零改动确认**：README.md / docs/ / lgdl-web-op-cli（ops.ts/tool.ts 文档串）/ App.tsx / matrix-a.test.ts / matrix-b.test.ts / lgdl-core / lgdl-render/src/index.ts / lgdl-router。9 id × 9 type 一一映射不变（type 集合 = arch/datastream/er/gantt/flowchart/mindmap/sequence/state/uml-class） | — |
| C15 | 单行转义格式 + 源码编辑质量 | FR-001 / EC-006 / NFR-002 | ✅ | examples.ts source 保持单行 `\n` 转义字符串（gen-examples 正则硬解析兼容：磁盘 9 .lgdl 双向逐字一致实证 parse/抽取链路未破坏）；镜像同步禁 import web（ADR-002 遵守）；无硬编码计数残留；注释保留 | — |
| C16 | kind-coverage 断言迁移等价 | FR-012 / NFR-004 | ✅ | git diff 逐处比对 FR-012 清单：① start/end 药丸 login-flow/'start'→ecommerce-flow/'browse'（断言强度同款 rx=w/2）；② decision 'verify'→'validate'（同款 4 顶点判定）；③ 嵌套组 login-flow frontend/auth→ecommerce-flow platform/shopping、rect 计数 3→5（同款外含内判据）；④ er members 行文本 → typed（`>id: bigint</text>` 等，断言等价不弱化）；⑤ 文件头核对表 4 行同步；**无静默删断言**（diff 中每处迁移显式可见）；gantt milestone 菱形 r=9 断言（:138-154）与 datastream 泳道/mindmap 无 kind 用例零改动 | — |
| C17 | 测试质量综合 | NFR-003/005 / FR-013 / 门槛 | ✅ | 测试文件齐全（kind-coverage/snapshot/matrix-a/matrix-b/geometry-audit/degraded-paths/ascii/svg）；matrix-a 遍历随 EXAMPLES_SOURCES 自动 9 条 + er edges[0]=user→order、uml-class edges[1] 专项断言保留（:131-132，源码确认）；manifest 无时间戳/env 字段（确定性可 diff）；更新门单点写盘；build 声称全仓 0 fail（core 267/render 95/matrix 35/router 79，review 静态采信、validate 复验）。**注意项**：lgdl-layout 包无测试文件（引擎改动依赖 render 侧 golden/matrix-a 间接覆盖，直接单测缺失 → 改进建议 4） | 低（改进） |

## 3. 审查维度汇总

| 审查维度 | 审查项数 | 通过 | 警告 | 失败 | 通过率 |
|---------|:--:|:--:|:--:|:--:|:--:|
| 代码质量 | 1（C15 + C9 内嵌） | 2 | 0 | 0 | 100% |
| 规范符合性 | 11（C1~C11） | 11 | 0 | 0 | 100% |
| 架构一致性 | 3（C2 内嵌 / C12 / C13 + C14 部分） | 3 | 1 | 0 | 100%（C12 计 ⚠️ 记录项） |
| 测试质量 | 2（C16 / C17） | 2 | 0 | 0 | 100% |

## 4. 阻塞问题

无（0 项）。

> 偏差② 不判阻塞的理由：该引擎修复为**真实修复**（消除嵌套组框顶 -10 越界的 G5 违例，非删断言/放宽审计/静默重建），影响面与声称一致（golden 六 svg 0 diff + B 档无嵌套组 fixture 实证零波及），且 build.md/state.json 双处记录「EC-001 作者裁决」。按 review.md §3 判定分档 → ✅ 通过档，但因其属 spec 明列 scope.out（NG-003/NG-004/NFR-001），升级为**高优改进项 IMP-1**，要求作者在 validate 前书面追认例外。

## 5. 问题清单

### 5.1 build 偏差① 复核结论 — platform contains 4 域 → [shopping]

**判定：✅ 合理（作者裁决采纳正确）**

| 复核问题 | 结论（证据） |
|---------|------|
| 4 域全包为何违例？ | build 实证 + 代码走查：聚合边 trade→fulfillment/fulfillment→after-sale 的端点是 platform 子组，但引擎 `routeRectilinear` 障碍集只豁免两端点组自身、不含端点组的祖先组（render index.ts:798-805 区域）→ platform 整框成障碍且包住端点 → 全部正交候选被 `pathCrosses` 拒绝 → 直线 fallback（`M 400,1376 L 196,1696` 斜段）→ G2/G4/G5 |
| 引擎 bug 还是示例设计不当？ | **引擎缺陷为主**：嵌套组 ⊃ 聚合边的组合在引擎障碍豁免逻辑中无一般性支持（login-flow 能过是 auth→backend fallback 恰好正交 + 框小的几何巧合，非通用能力）；示例设计（platform 包 4 域）语义上合理，但触发了未声明支持的引擎边界 |
| 收窄 [shopping] 是否合理？ | ✅ 合理：FR-002 验收锚点（lgdl-group rect 数 5 + platform 外框完整含 shopping 内框 + matrix-a 0 违例）**全部保持**；2 层嵌套 A 档载体不流失（platform ⊃ shopping ⊃ browse/cart 链仍成立）；14 节点 17 边零改动；聚合边恢复正交（golden 实测）；D-003/D-004 覆盖语义零降级；未修引擎/未放宽审计（合规 NG-004 + EC-001「最小调整」路径） |
| 遗留建议 | 引擎缺陷本身（聚合边障碍豁免缺祖先组）未登记 KNOWN 上报 → 建议移交 specs-tree-engine-defect-fixes 系列（改进 IMP-2） |

### 5.2 build 偏差② 复核结论 — 引擎微修复 layoutGrouped keep-on-canvas（重点）

**判定：⚠️ 真实修复、影响面可控、author 裁决记录充分 → 记高优改进项（validate 前须作者追认 spec 例外）**

| 复核问题 | 结论（证据） |
|---------|------|
| 是否真实修复 vs 绕过门禁？ | **真实修复**。代码走查：`nestedTopShift()` 按 renderer `computeGroupBox` 同构递归（render index.ts:564-565 `y = min(ys) − pad(20) − 标题(30)` ↔ 修复代码 `Math.min(...tops) − 50`）求全部组框顶；仅当存在组框顶 < 0 时取最大 deficit 整体下移 `finalPos.y`。修复后 platform rect y=−10→0、完整含 shopping（golden 实测 (380,0,240,340) ⊃ (400,50,200,270)），G5 违例从几何上消除。**无**删矩阵断言、**无**放宽 auditGeometry、**无**静默更新基线（golden 经 LGDL_UPDATE_SNAPSHOTS=1 显式重建）→ 非绕过门禁 |
| 影响面是否如声称？ | ✅ 与声称一致。触发条件 = 存在「contains 只含组」的嵌套组且其递归框顶 < 0。**普通组（contains 含节点）不触发**：其成员 y 已含 padY=50 偏移，框顶 = super-node 顶 ≥ 0（layoutGrouped :255-261 super-node 含 padX/padY 40/50 预留）。B 档检索：matrix-docs-b.ts 组均为单层（contains 普通节点 t1-t4/a-b-c 等），无组⊃组 fixture（ascii.test.ts:157 的 nested-group 用例走 renderAscii 独立布局，不经过 layoutGrouped）。实证：golden 6 svg（含 arch 3 组/state 3 分区/uml 2 域等普通组图）重建后字节 0 diff ✓ |
| 是否应剥离为独立 Feature？ | **建议保留 + author 追认**（而非剥离）：①修复与 D-002 嵌套增强强耦合——不修则 ecommerce-flow platform 框顶越界 10px，纯 DSL 无解（shopping 是唯一非聚合端点组可套、套聚合端点组即 G2），FR-002「2 层嵌套 A 档载体」将无法以 0 违例落地；②影响面已证仅嵌套越界图、零波及其它 8 图与 B 档；③改动 36 行单点、与 renderer 同构、防御性（seen 防环）良好。**但** spec NG-003/NG-004/NFR-001 明列引擎零改动 + scope.out 列引擎缺陷修复——按 Feature 边界理想应走 specs-tree-engine-defect-fixes；现实取舍下保留可接受，条件 = 作者在 validate 前书面追认 NFR-001 例外（更新 spec 或 state notes）并建议补 lgdl-layout 直接单测 |
| build 声称「作者裁决」记录是否充分？ | ✅ 充分（可追溯）：build.md §5 偏差-1/-2 均以「作者裁决」列明裁决内容与理由（含 4 域全包触发违例的逐级排查、shopping 唯一可套论证、仅嵌套越界图生效论证）；state.json notes build 段同步记录「偏差记录（EC-001 作者裁决，2 项）」。双记录完备 → 非 build 擅自扩大范围 |
| 代码质量评估 | 可读性良好（注释解释根因与零影响论证）、职责内聚（nestedTopShift 闭包内单函数）、与 renderer computeGroupBox 常数同源（−50 = pad20 + 标题30）、遍历 O(组×成员) 可忽略。小瑕疵：`void cy` 残留于 kind-coverage milestone 断言（历史既有非本次引入） |

### 5.3 其它问题记录

| # | 位置 | 问题 | 严重程度 |
|---|------|------|:--:|
| 1 | lgdl-layout/src/index.ts:308-342 | 引擎改动无 lgdl-layout 包直接单测（该包无测试文件），回归保护仅靠 render 侧 golden/matrix-a 间接覆盖 | 低 |
| 2 | er/gantt/ecommerce 增强后 op-cli 文档串（ops.ts:57/tool.ts:45 --id login-flow）、README 引用失效 | 属 OQ-1/OQ-3 已知待作者决策（scope.out 保持，未越界） | 低（记录） |
| 3 | matrix-docs-b.ts:13 | B 档仍引用「engine 贴边走线另 Feature 修复」注记，与本 Feature 引擎例外不同源（B 档缺陷未动） | 低（记录） |

## 6. 改进建议

| # | 位置 | 问题 | 对应 Cx | 建议 |
|---|------|------|:--:|------|
| 1 | spec NFR-001 / build 偏差② | 引擎 keep-on-canvas 修复属 spec 明列 scope.out（NG-003/NG-004/NFR-001），author 裁决仅记录于 build.md/state，spec.md 本身未登记例外 | C12 | **validate 前作者书面追认**：更新 spec.md NFR-001 例外条款（或 state.json notes 显式登记授权 + 范围）+ 建议补 lgdl-layout 直接单测（嵌套组框顶 keep-on-canvas 行为断言） |
| 2 | render routeRectilinear 障碍集 | 聚合边障碍豁免不含端点组祖先 → 引擎缺陷未登记 KNOWN | C13 | 将缺陷（嵌套组 ⊃ 聚合边组合路由障碍豁免缺失）登记为已知缺口，移交 specs-tree-engine-defect-fixes 后续 |
| 3 | spec D-002 描述 vs 终态 | spec 文字「contains: [shopping, trade, fulfillment, after-sale]」与终态 `[shopping]` 不一致（build 偏差-1 已记录但 spec 未同步） | C2/C13 | spec.md D-002 增补偏差注记或由 author 在 review 后确认采纳终态 |
| 4 | lgdl-layout 测试资产 | 引擎包零测试文件（含本次改动零直接测试） | C17 | 在 engine-defect-fixes 或本 Feature 后续补充 layoutGrouped 嵌套场景单测 |

## 7. 结论

**结论**: ⚠️ **有条件通过**

| 指标 | 结果 |
|------|------|
| 审查通过率 | 16/17（94%）；失败 0 |
| 阻塞问题数 | 0 |
| 规范符合性偏差 | 1 项（偏差② = 有 author 裁决记录的 NFR-001 例外，非无记录越界） |
| 可进入 validate | **是**（前提：作者追认偏差② spec 例外，即改进项 IMP-1） |

**理由**: 14 项 FR 实现与 spec 验收全部一致（9 图 9 类型映射不变、四面 examples.ts↔镜像↔磁盘↔golden 9 集逐字对齐、三增强图正确性经 source 逐字比对 + golden svg 静态核验、快照纪律 5 判据全过、测试断言守恒迁移等价、磁盘无孤儿 9/9/9）；build 偏差① 裁决合理（FR-002 锚点全保持 + 未修引擎未降审计）；偏差② 引擎修复**真实有效**（非绕过门禁）且影响面与声称一致，author 裁决记录双处完备，但因其触碰 spec 明文 scope.out（NG-003/NG-004/NFR-001），按高优改进项 IMP-1 要求作者在 validate 前书面追认 NFR-001 例外（含建议补 lgdl-layout 直接单测）。无阻塞问题，可进入 validate 动手验证（validate 应重点：① 复跑全仓测试核 build「0 fail」声明 ② CI Node 20 快照一致性 ③ EC-002 里程碑 `18d +0d` 文本语义确认 ④ 偏差② 引擎改动后 matrix-a/B 档全量回归）。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | R1 初始执行 — 17 项审查（16 ✅/1 ⚠️/0 ❌）+ 偏差① 复核（合理）+ 偏差② 复核（真实修复、影响面可控、裁决记录充分、建议保留+追认）+ 改进 4 项 + 结论 ⚠️ 有条件通过 | 2026-09-04 | SDDU Review Agent |
