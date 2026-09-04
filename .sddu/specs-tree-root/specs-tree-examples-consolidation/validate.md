# 验证策略：specs-tree-examples-consolidation（示例图整合）

> **文档定位**: SDDU 验证策略（ADR-004 双文件之一）— 自主定义 V1~VN 验证场景矩阵（验证对象 / 步骤 / 预期结果 / 维度 / 方法），作为 validate-report.md 的执行依据
> **前置依赖**: spec.md v1.0（14 FR / 5 NFR / 7 EC / D-001~D-004）、plan.md v1.0（DSL 终态 / 文件影响 24 项 / 快照 5 判据 / ADR-001）、build.md v1.0（TASK-001~010 + EC-001 作者裁决偏差 2 项）、review.md v1.0 + review-report.md v1.0（C1~C17：16 ✅ / 1 ⚠️ / 0 ❌ / 阻塞 0，结论 ⚠️ 有条件通过 → 可进 validate，前提 = 作者追认偏差② spec 例外）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-04
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-04
> **更新说明**: 初始创建 — 从 spec（FR/NFR/EC）+ plan（终态 DSL/判据）+ review（C12 偏差②/IMP-1~4）自主提取验证对象，定义 V1~V15 验证场景（14 FR 全覆盖 + 5 NFR + EC-001~007 覆盖），五维度方法（测试覆盖/接口数据/构建脚本/性能边界/漂移检测）

## 1. 前置检查
> 启动验证前必须满足的条件（角色 §4）

| 检查项 | 状态 |
|--------|:--:|
| review-report.md 存在且结论可进 validate（C1~C17：16 ✅/1 ⚠️/0 ❌/阻塞 0；⚠️ 有条件通过，条件 = 作者追认偏差② NFR-001 例外） | ✅（追认以 validate 指令授权 + 引擎修复后全量回归作为验收动作，报告登记） |
| 可执行环境：Node.js（本机 v24.15.0；CI 基准 Node 20 另取 v20.19.0 运行时实测）、npm workspaces、dist 已构建 | ✅ |
| 本 Feature NFR 类别核查 | 5 NFR 均为 兼容/可维护/一致性/确定性 类，**无性能/安全类 NFR** → 按 Feature 类型自适应跳过性能压测，边界语义由 EC 场景承担 |

## 2. Feature 类型判定与验证维度取舍

**Feature 类型**：代码 + 产物资产混合类（examples.ts/镜像/测试 3 处源码 + 脚本 2 + 引擎例外 1 文件 + 磁盘/golden 生成资产）→ 采用**全维度**验证（§5.1~§5.5），各维度至少 1 个 Vx：

| 维度 | 承担场景 | 说明 |
|------|---------|------|
| 测试覆盖（§5.1） | V6/V7/V8/V10/V11 | kind-coverage / matrix-a / matrix-b / snapshot / 全仓 suite |
| 接口数据（§5.2） | V1/V2/V3/V4 | 四面一致 = 本 Feature 的"接口/数据契约"（examples.ts↔镜像↔磁盘↔golden）；DSL parse 契约 |
| 构建脚本（§5.3） | V13/V15 | gen-examples/render-one 链路 + dist 依赖 + 全仓 test 编译（tsc）即类型构建门 |
| 性能边界（§5.4） | V12 + 全 EC | 无性能 NFR → 标注「不适用」；引擎 keep-on-canvas 影响边界（零波及论证）、EC-001/EC-002/EC-007 边界语义实测 |
| 漂移检测（§5.5） | V5/V9/V12/V14/V15 | git diff 范围核验、六 svg 0 diff、spec 漂移、孤立代码/需求缺失 |

## 3. V1~VN 验证场景矩阵

| 场景 | 验证对象（FR/NFR/EC/产物） | 验证步骤 | 预期结果 | 维度 | 方法 |
|:--:|------|---------|---------|:--:|:--:|
| V1 | FR-001 / FR-014② examples.ts 缩编 11→9 终态 | 抽取 examples.ts 条目 → 断言 id 序 / EXAMPLES[0] / 无 microservices/login-flow 残留 → 9 条 source 逐条 parseLgdl valid → 提取 type 断言 9 id × 9 type 一一映射、类型集合不变 | entries=9、id 序 = D-001 序、EXAMPLES[0]=architecture、9/9 parse valid、type 集合 = {arch,datastream,er,gantt,flowchart,mindmap,sequence,state,uml-class} | 接口数据 | 自主脚本 s1（lgdl-core dist parse） |
| V2 | FR-009 / EC-004 / NFR-002 镜像 examples-sources.ts 逐字一致 | 抽取镜像 9 条 source ↔ examples.ts 9 条逐字比对 + id 序 + 头注释 "9 source" + 禁 import web（静态） | 镜像 9/9 逐字一致、序一致、无 "11 source" 残留、无 import web | 接口数据 | 自主脚本 s2 |
| V3 | FR-006 / FR-008 / NFR-002 磁盘三件套与单一事实源 | ls 计数 .lgdl/.svg/.png 各 9 → 磁盘 .lgdl ↔ examples.ts source 逐字 9/9 → 文件集合与 EXAMPLES id 集相等（无孤儿/缺漏） | 三件套 9/9/9、.lgdl 逐字 9/9、无 12 删除组残留 | 接口数据 | 自主脚本 s2 |
| V4 | FR-011 / NFR-003 golden manifest 对齐 | 解析 manifest：ids.length=9、与镜像同序、files 键齐、无时间戳字段 → 逐 id sha256 双校验 svg 文件 | manifest ids 9 同序 + sha256 9/9 与文件一致 + 无时间戳 | 接口数据 | 自主脚本 s2 + snapshot 测试 |
| V5 | FR-005 / FR-013② 保留 6 图零改动 + matrix 测试零改动 | git diff examples.ts 中 6 例（architecture/datastream/mindmap/sequence/state/uml-class）source 零字符变化 + matrix-a/b.test.ts / App.tsx git diff 空 | 6 例 source 零 diff；matrix-a/b/App.tsx 零改动 | 漂移检测 | git diff 审阅 |
| V6 | FR-003 / D-003 / EC-001 / OQ-6 er 增强 | source 级：parse er → 5 实体 + 16 typed members + promotion + amount-note(kind note) + 6 边（5 带基数 + 1 note→order）+ edges[0]=user→order + 基数 token 全集 {1,0..1,0..*,1..*,*}（n:m 双多）；渲染级：er.svg 含 typed 行文本/促销实体/便签 label；矩阵级：matrix-a er audit 0 违例（含 *..* 未断言组合门） | 结构与 D-003 表一致；渲染文本就位；A 档 er 0 违例 | 测试覆盖 + 接口数据 | 自主脚本 s3/s4 + matrix-a 实测 |
| V7 | FR-004 / D-004 / ADR-001 / EC-002 gantt 增强 | source 级：parse gantt → launch duration=0、7 任务（含 doc/retro）→ 逐边数值验算：链式 gap≈0 ×4 / test→doc 目标在左（10<18）/ test→retro gap≥20（20）；渲染级：gantt.svg 含 `18d +0d` 里程碑文本（EC-002 语义锚点）、milestone 1、依赖边 6；矩阵级：kind-coverage milestone 菱形 r=9 断言通过 + matrix-a gantt 0 违例 | duration=0 语义与三型数值验算全过；`18d +0d` 实测确认；菱形形状不回归 | 测试覆盖 + 接口数据 | 自主脚本 s3/s4 + kind-coverage/matrix-a 实测 |
| V8 | FR-002 / D-002 / 偏差①终态 ecommerce-flow 嵌套 | source 级：parse → 5 group、14 业务节点、17 边、platform contains=[shopping]（偏差①终态）⊃ shopping ⊃ browse/cart 嵌套链；渲染级：ecommerce-flow.svg group rect=5、platform 外框完整含 shopping 内框、trade 等平铺不入框、组框顶 ≥0（偏差② keep-on-canvas 生效点）；kind-coverage 嵌套断言（rect 5 + 外含内）通过 | 结构=偏差①裁决终态；渲染几何外含内成立；keep-on-canvas 生效（platform y=-10→0）；matrix-a 0 违例 | 测试覆盖 + 接口数据 | 自主脚本 s3/s4 + kind-coverage/matrix-a 实测 |
| V9 | FR-010 / FR-011 / NFR-003 / NFR-005 / EC-007 快照纪律 + 确定性 | ①普通模式跑完全仓后 git diff golden = 仅 3 svg + manifest（无静默写盘新增）；②六 svg 0 diff 显式核验；③`LGDL_UPDATE_SNAPSHOTS=1` 显式重建 → 重建前后三 svg sha 不变（幂等）；④manifest 无时间戳；⑤Node 20.19.0 运行时复跑 lgdl-render（CI 基准）确认快照字节+sha 双校验全绿（跨版本确定性） | 普通模式零写盘、六 svg 0 diff、显式重建 sha 不变、Node20 全绿 → EC-007 未触发 | 漂移检测 + 构建 | git diff + sha256 + Node20 实测 |
| V10 | FR-012 / NFR-004 kind-coverage 迁移等价 + 测试守恒 | ①git diff 逐处核验 login-flow→ecommerce-flow 迁移显式可见（无静默删断言）；②er typed 行文本断言适配；③gantt milestone 菱形断言未动；④守恒：静态 `test(` 声明级计数 HEAD=当前；kind-coverage 测试数 11→11；执行级缩减 −4 恰归因 snapshot/matrix-a 遍历 11→9 | 迁移语义等价、无删/弱化；声明级 493=493；kind 11=11 | 测试覆盖 | git diff + 计数比对 |
| V11 | FR-014① / FR-013① 全仓回归 | `npm run test --workspaces` 实测 + 逐包计数 + matrix-a 9 条 audit 0 违例（含 er/gantt/ecommerce 专项）+ matrix-b B1~B12 全绿（B10 state 对照组）+ snapshot 9 条双校验 + kind-coverage 11 条 | 全仓 0 fail（1 预置 skip=B11 env 门控）；A 档 9/9 clean | 测试覆盖 | npm workspaces 实测 |
| V12 | 偏差② / C12 / NFR-001 / EC-001 引擎 keep-on-canvas 修复复核 | ①git diff lgdl-layout/src/index.ts 代码走查（nestedTopShift 同构递归、deficit 补足、仅嵌套越界触发）；②动态影响面：含普通组图（architecture/state/uml-class/datastream）golden 六 svg 0 diff + matrix-b B 档（含 B3/B4a/B4b 组 fixture）全绿 → 零波及实证；③修复生效点：ecommerce-flow platform 框顶 y=0（V8）；④矩阵全量 0 违例回归 | 真实修复 + 影响面零波及 + 回归全绿 → IMP-1 追认动作完成 | 性能边界 + 漂移检测 | git diff + golden/matrix 实测 |
| V13 | FR-007 / FR-008 / EC-006 生成链路 | ①render-one.mjs 对 /tmp 副本 er.lgdl 冒烟 → svg(+png) 产出；②gen-examples.mjs 全量运行 exit 0 → 9 例逐一输出；③运行前后 examples/ git 状态零新增变更（字节幂等 = 确定性）；④单行转义格式保持（V1 parse 9/9 + 逐字一致兜底 EC-006） | 链路修复生效、exit 0、重生成幂等、无解析失败 | 构建脚本 | node 脚本实测 |
| V14 | NFR-001 / NG-001~007 / EC-003 引擎零 diff 例外范围 + scope.out 漂移 | ①git diff 引擎 4 包 src = 仅 lgdl-layout/src/index.ts（例外）；render/core/router 业务 src 0 diff；②变更文件集 ⊆ spec 明列 + layout 例外；③README/docs/op-cli 零改动确认 + 已知引用失效清单收集（EC-003/OQ-1~3 移交作者） | 例外范围闭合、零越界、引用失效清单登记 | 漂移检测 | git diff 全仓扫 |
| V15 | FR-014⑤ 总验收综合 | 四面（web/镜像/磁盘/golden）9 集对齐汇总（V1~V4 结果合流）+ 磁盘 9 svg ↔ golden 9 svg 字节 cmp + 类型守恒 + 无孤立代码/需求缺失 + spec 漂移检查（D-002 文字 vs 终态 [shopping] 偏差登记） | 四面逐字 9 集对齐、9 svg 字节一致、漂移 0 严重项 | 漂移检测 + 构建 | 综合脚本 + cmp |

## 4. FR / NFR / EC → Vx 覆盖映射

| FR/NFR/EC | 对应场景 | FR/NFR/EC | 对应场景 |
|-----------|:--:|-----------|:--:|
| FR-001 | V1 | FR-008 | V3/V13 |
| FR-002 | V8 | FR-009 | V2 |
| FR-003 | V6 | FR-010 | V9 |
| FR-004 | V7 | FR-011 | V4/V9 |
| FR-005 | V5 | FR-012 | V10 |
| FR-006 | V3 | FR-013 | V5/V11 |
| FR-007 | V13 | FR-014 | V1/V11/V15 |
| NFR-001 | V12/V14 | NFR-004 | V10 |
| NFR-002 | V2/V3 | NFR-005 | V9 |
| NFR-003 | V4/V9 | — | — |
| EC-001 | V6/V7/V8/V12 | EC-005 | V3（git 历史可恢复说明） |
| EC-002 | V7（`18d +0d` 语义锚点实测） | EC-006 | V13（parse 失败退出码非 0 + 逐字兜底） |
| EC-003 | V14（引用失效清单登记） | EC-007 | V9（Node20 实测） |
| EC-004 | V2（镜像漂移兜底） | — | — |

> 质量门槛核对：每个 FR ≥ 1 Vx（FR-001~FR-014 → V1~V15 全覆盖）✅；五验证维度每维 ≥ 1 ✅；性能维度「不适用」已标注原因（无性能 NFR）。**无法在本环境执行项**：无（Node 20 经下载运行时实测覆盖，EC-007 无需降级）。

## 5. 执行环境与方法约定

- **仓库根**：`/home/usb/wks/gits/GitHub/LGDL`（git HEAD = 引擎缺陷修复全流程产物，Feature 变更全在未提交工作树 → git diff 可完整审阅变更集）
- **运行时**：本机 Node v24.15.0（nvm）+ 临时 Node v20.19.0（/tmp，对齐 ci.yml Node 20 基准）
- **验证脚本**（ADR-003，存于 `/tmp/sddu-validate-specs-tree-examples-consolidation-20260902/`，不污染仓库源码）：
  - `s1-parse-id-type.mjs` → V1
  - `s2-four-side.mjs` → V2/V3/V4
  - `s3-content-verify.mjs` → V6/V7/V8 source 级
  - `s4-svg-features.mjs` → V6/V7/V8 渲染级
- **测试命令**：`npm run test --workspaces`（全仓）、`LGDL_UPDATE_SNAPSHOTS=1 npm test`（lgdl-render 显式重建）、Node20 直跑 `dist-test/*.test.js`

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建 — V1~V15 场景矩阵（14 FR 全覆盖 + 5 NFR + EC-001~007）；Feature 类型自适应 = 代码+产物混合类全维度；性能维度标注「不适用」并说明；review IMP-1 追认以 validate 授权指令 + 全量回归为验收动作 | 2026-09-04 | SDDU Validate Agent |
