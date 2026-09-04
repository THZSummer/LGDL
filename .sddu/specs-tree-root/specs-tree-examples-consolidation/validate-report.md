# 验证报告：specs-tree-examples-consolidation（示例图整合）

> **文档定位**: SDDU 验证报告（ADR-004 双文件之二）— 逐项记录 V1~V15 验证执行结果（验证对象 / 步骤 / 预期 / 实测 / 判定）+ 脚本执行记录（ADR-003）+ 问题清单 + 总结论，作为 validate 阶段唯一有效产出
> **验证策略**: validate.md v1.0（V1~V15 场景矩阵 + FR/NFR/EC 覆盖映射）
> **前置依赖**: spec.md v1.0、plan.md v1.0、build.md v1.0、review.md v1.0 + review-report.md v1.0（C1~C17：16 ✅ / 1 ⚠️ / 0 ❌，可进 validate）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-04
> **验证轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-04
> **更新说明**: R1 初始执行 — 动态实测（Node v24.15.0 全仓 509 tests 0 fail + Node v20.19.0 跨版本快照全绿 + 四面逐字比对 + 显式重建幂等 + gen-examples/render-one 链路实测 + git diff 漂移扫描）

## 1. 验证概要

| 维度 | 数值 |
|------|:--:|
| 验证场景总数 | 15（V1~V15） |
| ✅ 通过 | 15 |
| ❌ 失败 | 0 |
| ⏭️ 无法执行 | 0（Node 20 经下载 v20.19.0 运行时实测覆盖，无需走 EC-007 降级） |
| 阻塞问题 | 0 |
| 严重漂移 | 0 |

**执行环境**：仓库根 `/home/usb/wks/gits/GitHub/LGDL`；git HEAD = `1c0c558`（引擎缺陷修复全流程产物），本 Feature 全部变更位于未提交工作树（git diff 可完整审阅）；本机 Node v24.15.0 + 临时 Node v20.19.0（对齐 ci.yml Node 20 基准）；4 包 dist 已构建（dist 为 gitignore 产物，lgdl-layout dist 时间戳晚于 src 80s = 引擎修复已编译入 dist）。

## 2. 逐项验证结果（V1~V15）

| 场景 | 验证对象 | 预期结果 | 实测结果 | 判定 |
|:--:|---------|---------|---------|:--:|
| V1 | FR-001/FR-014② examples.ts 终态 | entries=9、id 序=D-001、EXAMPLES[0]=architecture、parse 9/9 valid、9×9 type 映射不变 | **s1 全过**：9/9 parse valid，id 序 = architecture,datastream,er,gantt,ecommerce-flow,mindmap,sequence,state,uml-class（D-001 一致）；EXAMPLES[0]=architecture；type 集合 = {arch,datastream,er,flowchart,gantt,mindmap,sequence,state,uml} 9 类不变；无 microservices/login-flow 残留 | ✅ |
| V2 | FR-009/EC-004/NFR-002 镜像一致 | 镜像 9/9 逐字、序一致、头注释 9 source、无 11 残留、禁 import web | **s2 全过**：web↔镜像 9/9 逐字一致 + id 序一致；头注释 "9 source"；无 "11 source"；镜像 :12 注释明示禁止 import web（静态走查） | ✅ |
| V3 | FR-006/FR-008/NFR-002 磁盘三件套 | .lgdl/.svg/.png 各 9、磁盘 .lgdl ↔ examples.ts 逐字 9/9、集合相等无孤儿 | **s2 全过**：三件套 9/9/9（27 文件）；磁盘 9 .lgdl 与 web source 逐字一致（0 差异）；文件集合与 EXAMPLES id 集完全相等；12 删除组（10 孤儿 + microservices/login-flow）无残留；EC-005：9 孤儿 .svg/.png 历史产物经 git 历史可完整恢复，无额外归档 | ✅ |
| V4 | FR-011/NFR-003 golden manifest | manifest ids 9 同序、files 键齐、sha256 9/9、无时间戳 | **s2 全过**：manifest ids=9 且与 web 同序；files 键齐无多余；逐 id sha256 与文件 9/9 一致；无 timestamp/env 字段（snapshot.test.ts:86 断言通过） | ✅ |
| V5 | FR-005/FR-013② 保留 6 图 + matrix 测试零改动 | 6 例 source 零字符变化、matrix-a/b/App.tsx 零改动 | git diff examples.ts 中 6 保留例相关改动行 = **0**（20 个 +/- 行全部归属删 microservices/login-flow + 改 er/gantt/ecommerce-flow）；matrix-a.test.ts / matrix-b.test.ts / App.tsx git diff 空 | ✅ |
| V6 | FR-003/D-003/EC-001/OQ-6 er 增强 | 结构与 D-003 一致 + 渲染就位 + matrix-a er 0 违例 | **s3/s4 全过**：5 实体（user/order/product/order-item/promotion）typed members **16 行**（bigint/varchar/decimal/int）；amount-note kind=note；6 边（5 带基数 + 1 note→order 约束边）；edges[0]=user→order（label 拥有 1→0..*）守序；基数 token 全集 {1,0..1,0..*,1..*,*} 齐（promotion↔product *..* 双多 n:m）；er.svg 实测 typed 行文本 5/5（`id: bigint` 等）+ 促销 label + amount-note label + lgdl-node×6；**A 档 er 全链路审计 0 违例**（OQ-6 双多组合门通过，未走 EC-001 上报） | ✅ |
| V7 | FR-004/D-004/ADR-001/EC-002 gantt 增强 | duration=0、三型数值验算、`18d +0d` 文本、菱形不回归 | **s3/s4 全过**：launch duration=0、7 任务（research/design/develop/doc/test/retro/launch）；逐边验算：gap≈0 链 ×4（research→design 3=0+3 / design→develop 6=3+3 / develop→test 14=6+8 / test→launch 18=14+4）✓、目标在左 test→doc（doc.start 10 < test.end 18）✓、gap≥20 test→retro（38−18=20 ≥20）✓；gantt.svg 实测 `18d +0d` 文本就位（**EC-002 语义锚点实测确认**，与 spec/plan 预期一致）+ process 条×6 + milestone×1 + 依赖边×6；kind-coverage milestone 菱形 r=9 断言原样通过（duration=0 不影响 kind 判定）；A 档 gantt 0 违例 | ✅ |
| V8 | FR-002/D-002/偏差① ecommerce-flow 嵌套 | 5 group、14 节点、17 边、platform ⊃ shopping、外含内、框顶≥0 | **s3/s4 全过**：5 group（shopping/trade/fulfillment/after-sale/platform）、14 业务节点、17 边零改动；platform kind=group **contains=[shopping]**（偏差① EC-001 作者裁决终态）⊃ shopping ⊃ browse/cart 嵌套链成立；ecommerce-flow.svg 实测 group rect=5（交易域/履约域/售后域/电商平台/购物域），platform rect=(380,0,240,340) **完整包含** shopping rect=(400,50,200,270)，trade/fulfillment/after-sale 平铺不入 platform 框；组框顶 y=0 ≥0（**偏差② keep-on-canvas 修复生效点：-10→0**）；kind-coverage 嵌套组断言（lgdl-group rect=5 + 外含内）通过；A 档 ecommerce-flow 0 违例（含聚合边 trade→fulfillment 正交） | ✅ |
| V9 | FR-010/FR-011/NFR-003/NFR-005/EC-007 快照纪律 + 确定性 | 普通模式零写盘、六 svg 0 diff、显式重建幂等、Node20 一致 | ①普通模式全仓跑后 golden git diff = 恰 3 svg M + manifest M + 2 D（无任何新增写盘变更）；②architecture/datastream/mindmap/sequence/state/uml-class **六 svg git 0 diff**（逐文件 `git diff --quiet` ✓）；③`LGDL_UPDATE_SNAPSHOTS=1` 显式重建后三 svg sha **不变**（er `d6fab77f…` / gantt `cdadf51c…` / ecommerce-flow `b11de7b8…` = 幂等确定性自证），重建运行 95 tests / 94 pass / 1 skip / 0 fail；④manifest 无时间戳（确定性可 diff）；⑤**Node v20.19.0 复跑 lgdl-render：95 tests / 94 pass / 1 skip（B11）/ 0 fail**，snapshot 10 条（manifest + 9 例字节+sha 双校验）与 A 档 9 条 audit 全绿 → **CI Node 20 与本地快照字节一致，EC-007 未触发** | ✅ |
| V10 | FR-012/NFR-004 kind-coverage 迁移 + 守恒 | 迁移显式可见无删/弱化、计数守恒 | git diff kind-coverage.test.ts：login-flow 引用删 **8** 处 / ecommerce-flow 引用增 **8** 处（start/end browse、decision validate、嵌套 platform/shopping、核对表 4 行），er typed 行文本适配断言（`>id: bigint</text>` 等）在位，gantt milestone 菱形 / datastream 泳道 / mindmap 无 kind 断言零改动；**测试守恒实测**：静态 `test(` 声明级 HEAD=当前=**493**（零删零增）；kind-coverage 测试数 11=11（迁移不缩）；执行级缩减 −4 恰归因 snapshot 遍历 11→9（−2）+ matrix-a 遍历 11→9（−2），全仓实测当前 **509**（HEAD 推算 513），守恒成立 | ✅ |
| V11 | FR-014①/FR-013① 全仓回归 | 全仓 0 fail、A 档 9/9 clean、matrix-b 全绿 | **`npm run test --workspaces` 实测：EXIT 0**。逐包：lgdl-cli 0 / lgdl-core **267** / lgdl-layout 0 / lgdl-render **95**（94 pass + 1 skip）/ lgdl-router 8 / lgdl-web 35 / lgdl-web-cli 79 / lgdl-web-op-cli 11 / web-cli-base 14 → **合计 509 tests / 508 pass / 0 fail**；唯一 skip = B11 flowchart 130 节点 grid（`LGDL_MATRIX_B11=1` env 门控，预置 P2 项，与本次变更无关）；A 档 9 例全链路审计 **0 违例**（er/gantt/ecommerce-flow 三增强图全 clean + er edges[0]=user→order / uml-class edges[1]=order→payment 专项断言通过）；matrix-b B1~B12 全绿（B10a/B10b state 对照组成立）；snapshot 9 例双校验 + kind-coverage 11 条全绿 | ✅ |
| V12 | 偏差②/C12/NFR-001/EC-001 引擎 keep-on-canvas 复核 | 真实修复、零波及、回归全绿 | git diff lgdl-layout/src/index.ts = **+36 行单点**（nestedTopShift 闭包：按 renderer computeGroupBox 同构递归 frameTopOf = min(成员顶) − 50，deficit = max(0, −top) 时整体下移 finalPos.y；含 seen 防环；注释说明根因与零影响论证）。**动态影响面实证**：含普通组图（architecture 3 组 / state 3 分区组 / uml-class 2 域 / datastream 2 泳道）golden 四 svg 重建后字节 0 diff（V9）+ matrix-b B 档（B3 mindmap+group / B4a sequence+group / B4b gantt 分区组等组 fixture）全绿 → **仅嵌套越界图生效，零波及实证成立**；修复生效点 platform 框顶 y=0（V8，G5 从几何上消除）；矩阵全量 0 违例（V11）。**IMP-1 追认动作**：作者 validate 指令明确以「keep-on-canvas 修复后全量回归 + 矩阵 0 违例」为验收 → 全量回归全绿，追认完成（登记 state notes）。**性能边界**：修复为单次遍历 O(组×成员)、读后一次性位移，非热路径 → 无可测性能影响 | ✅ |
| V13 | FR-007/FR-008/EC-006 生成链路 | render-one 冒烟产出、gen-examples exit 0、重生成幂等 | render-one.mjs 对 /tmp 副本 er.lgdl 冒烟：**成功产出 svg（1391×661）+ png（41948 B）**；gen-examples.mjs 全量运行 **EXIT 0**，9 例逐一输出 .lgdl/.svg/.png（@resvg/resvg-js 在位，PNG 生成）；运行前后 examples/ git 状态 **54 行零差异**（= 重生成字节幂等，确定性自证）；9/9 parse valid + 磁盘逐字一致（V1/V3）兜底 EC-006（无解析失败，脚本未走错误分支） | ✅ |
| V14 | NFR-001/NG-001~007/EC-003 引擎零 diff 例外 + scope.out | 变更集闭合、零越界、引用清单登记 | 引擎 4 包 src：**lgdl-layout/src/index.ts（+36）唯一例外**，lgdl-core / lgdl-router / lgdl-render（src/index.ts 等业务文件）**0 diff**（render 包 diff 仅 kind-coverage/snapshot 测试 + examples-sources 镜像）；git 变更文件集 = examples.ts / examples-sources.ts / kind-coverage / snapshot / golden(3 M + manifest M + 2 D) / gen-examples / render-one / examples 磁盘 / lgdl-layout 例外 —— **⊆ spec FR-001~FR-013 明列 + 已授权例外**；README.md / docs/ / op-cli 源码零改动；**EC-003 已知引用失效清单登记**（scope.out 移交作者，OQ-1/OQ-2/OQ-3）：README.md:21 login-flow 图库格 / :29 microservices 图库格（png+源码 404）、:37-39 AI 评审孤儿说明段；op-cli ops.ts:57 / tool.ts:45 `--id login-flow` 示例串；.sddu/docs-tree-root web-ai助手.md:37 + source.md:61 + docs-overview.md:29 "11 个内置示例" | ✅ |
| V15 | FR-014⑤ 总验收综合 | 四面 9 集对齐 + svg 字节一致 + 漂移 0 严重 | **四面汇总**：examples.ts ↔ 镜像 9/9 逐字（V2）+ 磁盘 .lgdl 9/9 逐字（V3）+ golden manifest ids 9 同序 sha256 9/9（V4）= 四面 9 集对齐；**磁盘 9 svg ↔ golden 9 svg 逐文件 cmp 9/9 字节一致**；9 id × 9 type 一一映射（V1）；孤立代码 0 / 需求缺失 0 / 严重规格漂移 0（D-002 文字 vs 终态 [shopping] 为已记录作者裁决偏差 IMP-3，非静默漂移） | ✅ |

## 3. FR / NFR 覆盖矩阵

### 3.1 FR 覆盖（14/14 = 100%）

| FR | spec 描述 | 对应场景 | 结果 |
|----|----------|:--:|:--:|
| FR-001 | examples.ts 缩编 11→9 + parse 9/9 | V1 | ✅ 通过 |
| FR-002 | ecommerce-flow 补 2 层嵌套 group | V8 | ✅ 通过 |
| FR-003 | er 增强（typed/促销/note/基数五值/edges[0]） | V6 | ✅ 通过 |
| FR-004 | gantt 增强（duration=0 + 依赖三型） | V7 | ✅ 通过 |
| FR-005 | 其余 6 图 source 零 diff | V5 | ✅ 通过 |
| FR-006 | 磁盘删 12 组三件套 | V3 | ✅ 通过 |
| FR-007 | gen-examples/render-one 包路径修复 | V13 | ✅ 通过 |
| FR-008 | 磁盘重生成 9 组 + 逐字一致 | V3/V13 | ✅ 通过 |
| FR-009 | examples-sources.ts 镜像同步 11→9 | V2 | ✅ 通过 |
| FR-010 | snapshot.test.ts 硬断言 11→9 | V9 | ✅ 通过 |
| FR-011 | golden 11→9 显式重建 + diff 审阅 + 六 svg 0 diff | V4/V9 | ✅ 通过 |
| FR-012 | kind-coverage 断言换档 + er typed 适配 | V10 | ✅ 通过 |
| FR-013 | matrix-a/b 联动复核（零改动） | V5/V11 | ✅ 通过 |
| FR-014 | 总验收（四面 9 集 + 测试全绿 + 约束满足） | V1/V11/V15 | ✅ 通过 |

### 3.2 NFR 覆盖（5/5 = 100%）

| NFR | 类别 | 对应场景 | 实测 | 达标 |
|-----|------|:--:|------|:--:|
| NFR-001 | 兼容/旁路 | V12/V14 | 引擎 4 包 src 仅 layout 例外 +36（已追认）；9/9 parse valid；dist 与 src 同步构建 | ✅ |
| NFR-002 | 单一事实源守恒 | V2/V3 | 镜像 9/9、磁盘 .lgdl 9/9 逐字一致；文件集合与 EXAMPLES 相等 | ✅ |
| NFR-003 | 快照纪律 | V4/V9 | 普通模式零写盘；重建仅 LGDL_UPDATE_SNAPSHOTS=1；manifest 无时间戳 | ✅ |
| NFR-004 | 测试同步守恒 | V10 | 声明级 493=493；执行级 −4 恰归因遍历 11→9；迁移显式无删/弱化 | ✅ |
| NFR-005 | 重建幂等/跨环境稳定 | V9 | 显式重建 sha 不变；**Node 20.19.0 实测快照全绿**（CI Node 20 一致） | ✅ |

### 3.3 性能/安全 NFR

本 Feature 无性能/安全类 NFR（5 NFR 均为兼容/可维护/一致性/确定性）→ 按 Feature 类型自适应标注「不适用，跳过性能压测」；边界语义由 EC-001/002/007 实测承担（见 §2 V7/V9/V12）。

## 4. 验证脚本执行记录（ADR-003）

脚本目录：`/tmp/sddu-validate-specs-tree-examples-consolidation-20260902/`（不污染仓库源码）

| 脚本/日志 | 用途 | 对应场景 | 退出码 | 关键输出 |
|----------|------|:--:|:--:|------|
| `s1-parse-id-type.mjs` | examples.ts 条目抽取 + id/type 断言 + 9/9 parse | V1 | 0 | 9/9 parse valid；序一致；type 集合 9 类不变 |
| `s2-four-side.mjs` | 四面逐字比对（web↔镜像↔磁盘 .lgdl）+ manifest sha256 | V2/V3/V4 | 0 | 3×「OK … 9/9」+ 四面一致汇总 |
| `s3-content-verify.mjs` | 三增强图 source 级结构与数值断言 | V6/V7/V8 | 0 | gantt 三型验算 / er 5 实体 16 typed + 基数五值 / ecommerce 5 group 14n 17e |
| `s4-svg-features.mjs` | golden svg 渲染级特征（`18d +0d`/typed/group rect/外含内/框顶） | V6/V7/V8 | 0 | gantt 里程碑文本就位；er typed 5/5；platform(380,0,240,340) ⊃ shopping(400,50,200,270) |
| `full-test.log` | 全仓 `npm run test --workspaces` 实测输出 | V11/V9 | 0 | 509 tests / 508 pass / 0 fail / 1 skip（B11 env 门控） |
| `update-snapshot.log` | `LGDL_UPDATE_SNAPSHOTS=1` lgdl-render 显式重建 | V9 | 0 | 95 tests / 94 pass / 0 fail / 1 skip；重建后 sha 与重建前一致 |
| `node20-render.log` | Node v20.19.0 直跑 lgdl-render dist-test | V9/NFR-005 | 0 | 95 tests / 94 pass / 1 skip（B11）/ 0 fail；TAP `1..95` |
| `gen-examples.log` | gen-examples.mjs 全量重生成 | V13 | 0 | 完成：9 个示例从 examples.ts 生成（含 PNG） |
| `examples-status-before/after.txt` | 重生成前后 examples/ git 状态比对 | V13 | diff 空 | 幂等自证（54 行零差异） |

## 5. 动态数据汇总

| 数据点 | 实测值 |
|--------|------|
| 全仓测试（Node 24.15.0） | **509 tests / 508 pass / 0 fail / 1 skip**（skip = B11 env 门控预置）；EXIT 0 |
| lgdl-render 包测试 | 95（94 pass + 1 skip B11），含 snapshot 10 + matrix-a 10 + matrix-b 14 + kind-coverage 11 + ascii 14 + svg 7 + geometry-audit 26 + degraded 3 |
| Node 20.19.0 复跑（CI 基准） | 95 tests / 94 pass / 1 skip / 0 fail → 快照跨版本字节一致（EC-007 未触发） |
| 测试守恒 | 静态 `test(`：HEAD 493 = 当前 493；执行级 HEAD 513 → 当前 509（−4 = snapshot 11→9 + matrix-a 11→9） |
| 四面逐字比对 | examples.ts ↔ 镜像 9/9；examples.ts ↔ 磁盘 .lgdl 9/9；manifest ids 9 同序 + sha256 9/9；磁盘 9 svg ↔ golden 9 svg cmp 9/9 一致 |
| golden 显式重建幂等 | er `d6fab77f…` / gantt `cdadf51c…` / ecommerce-flow `b11de7b8…`：LGDL_UPDATE_SNAPSHOTS=1 重建前后 sha 不变 |
| 六 svg 零 diff | architecture/datastream/mindmap/sequence/state/uml-class：普通模式与显式重建后均 git 0 diff |
| gantt 三型数值 | gap≈0×4（research→design 3=0+3 … test→launch 18=14+4）；目标在左 test→doc 10<18；gap≥20 test→retro 38−18=20 |
| er 渲染特征 | typed 行文本 `id: bigint` 等 5/5；lgdl-node×6（5 实体 + 1 note）；基数锚点 0..1/0..*/1..* 文本在位 |
| ecommerce 渲染几何 | platform rect=(380,0,240,340) ⊃ shopping rect=(400,50,200,270)；5 group；聚合边正交；框顶 y=0（keep-on-canvas 生效） |
| 引擎 diff | lgdl-layout/src/index.ts +36 行（唯一业务例外）；core/router/render 业务 src 0 diff |
| 生成链路 | render-one er.lgdl → svg 1391×661 + png 41948 B；gen-examples EXIT 0 + 重生成 git 零新增变更 |

## 6. 问题清单

### 6.1 阻塞问题

无（0 项）。

### 6.2 改进项跟踪（review 4 项 → validate 处置）

| # | 改进项（review 来源） | validate 处置 | 状态 |
|:--:|------|------|:--:|
| IMP-1 | 偏差② 引擎 keep-on-canvas 修复越 NFR-001 scope.out，validate 前须作者书面追认（review C12，高优） | 作者 validate 指令明确以「keep-on-canvas 修复后全量回归 + 矩阵 0 违例」为验收动作 → V11/V12 全量回归全绿（509 tests 0 fail、A 档 9/9 0 违例、matrix-b 全绿）→ **追认完成**；登记 state notes（授权 + 范围 = lgdl-layout/src/index.ts layoutGrouped 单点） | ✅ 关闭 |
| IMP-2 | 聚合边障碍豁免缺端点组祖先组引擎缺陷未登记 KNOWN（review C13） | **登记 KNOWN-EXC-001**：routeRectilinear 障碍集（render index.ts:798-805 区域）只豁免两端点组自身、不含端点组祖先组 → 嵌套组 ⊃ 聚合边时祖先框成障碍 → 正交候选全拒 → 直线 fallback。本 Feature 以 platform contains=[shopping] 规避（FR-002 锚点全保持）；login-flow 旧载体通过系几何巧合。移交 specs-tree-engine-defect-fixes 后续 Feature（不修引擎 NG-004） | 登记（移交） |
| IMP-3 | spec.md D-002 文字「contains: [shopping, trade, fulfillment, after-sale]」与终态 `[shopping]` 不一致（review 改进 #3） | 需求基线 spec.md 不改（validate 无 spec 修改权）；偏差已在 build.md §5 偏差-1 与 state notes 双记录；登记待作者决策/后续 Feature 同步 spec 文字 | 登记（待作者） |
| IMP-4 | lgdl-layout 包零测试资产（本次引擎改动零直接单测，仅 golden/matrix 间接覆盖；review 改进 #1/#4） | 复核确认：lgdl-layout src 无 *.test.ts（`node --test` 空匹配 exit 0），keep-on-canvas 行为现由 ecommerce-flow golden（字节）+ matrix-a（G5 audit）间接覆盖；建议 engine-defect-fixes 或后续 Feature 补 layoutGrouped 嵌套组 keep-on-canvas 直接单测 | 登记（建议） |

### 6.3 记录项（scope.out 移交作者，不阻塞）

| # | 内容 | 依据 |
|:--:|------|------|
| 1 | README.md:21 login-flow / :29 microservices 图库格 png+源码 404；:37-39 AI 评审孤儿说明段失效 | EC-003 / OQ-1 |
| 2 | .sddu/docs-tree-root 三处 "11 个内置示例"（web-ai助手.md:37 / source.md:61 / docs-overview.md:29）待刷新 | EC-003 / OQ-2 |
| 3 | op-cli 文档串 ops.ts:57 / tool.ts:45 `--id login-flow`（纯元数据非行为依赖） | OQ-3 |
| 4 | matrix-docs-b.ts:13 B 档注记（"engine 贴边走线另 Feature 修复"）与本 Feature 引擎例外不同源 | review §5.3 #3 |
| 5 | EC-002 语义：里程碑文本实测为 `18d +0d`，与 spec/plan 预期一致 → 若作者期望"零宽时间点不显示时长文本"走 OQ-5 另立引擎微调 Feature | EC-002 |

## 7. 结论

### 7.1 指标达标矩阵

| 条件 | 要求 | 实测 | 达标 |
|------|------|------|:--:|
| 功能需求覆盖率 | 100%（每 FR 有验证且通过） | 14/14（100%） | ✅ |
| 非功能需求覆盖率 | ≥ 80% | 5/5（100%，无性能类 NFR 已标注） | ✅ |
| 构建通过 | 退出码 0 | 全仓 test EXIT 0 + gen-examples/render-one EXIT 0 + Node20 EXIT 0 | ✅ |
| 严重漂移 | 0 项 | 0（孤立代码 0 / 需求缺失 0 / 规格漂移 0；KNOWN-EXC-001 为已登记缺陷移交项） | ✅ |
| 阻塞问题 | 0 项 | 0 | ✅ |

### 7.2 总结论

**结论**: ✅ **通过** — Feature 可关闭 🎉

**核心理由**（全部动态实测，非静态采信）：
1. **四面一致**：examples.ts ↔ 镜像 ↔ 磁盘 .lgdl ↔ golden manifest **9 集逐字对齐**（s2 + manifest sha256 9/9 + 磁盘 9 svg ↔ golden 9 svg cmp 字节一致）；9 id × 9 type 映射不变、无孤儿无缺漏；
2. **三增强图正确性**：er（5 实体 16 typed + note 混 kind + 6 边基数五值含 *..* n:m 双多、edges[0] 守序）、gantt（duration=0 + 三型逐边数值验算 + `18d +0d` 文本锚点实测）、ecommerce-flow（platform ⊃ shopping 外含内 + 聚合边正交）全部 source 级 + 渲染级 + 矩阵级三重验证通过；
3. **快照纪律**：普通模式零写盘、六 svg 字节 0 diff、显式重建幂等（sha 不变）、Node 20.19.0 跨版本实测一致（EC-007 未触发、NFR-005 达标）；
4. **测试守恒**：静态声明级 493=493、执行级 −4 恰归因遍历 11→9、kind-coverage 迁移等价无删/弱化；**全仓 509 tests / 0 fail**（唯一 skip = B11 env 门控预置）；
5. **引擎偏差② 复核**：keep-on-canvas 修复为真实修复（platform 框顶 -10→0 几何消除 G5），影响面零波及实证（六 svg 0 diff + B 档全绿），作者追认动作完成（全量回归 0 违例为验收）；
6. **零越界**：变更集 ⊆ spec 明列 + 已授权例外；改进项 IMP-1~4 全部登记处置（KNOWN-EXC-001 移交 engine-defect-fixes；IMP-3 spec 文字同步待作者；IMP-4 lgdl-layout 直接单测建议）。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | R1 初始执行 — V1~V15 全过（15 ✅ / 0 ❌ / 0 ⏭️）；全仓 509 tests 0 fail + Node20 跨版本快照全绿；四面逐字 9/9；golden 显式重建幂等；gen-examples/render-one 链路实测；KNOWN-EXC-001 登记 + IMP-1~4 处置；结论 ✅ 通过 | 2026-09-04 | SDDU Validate Agent |
