# 审查报告：specs-tree-render-gate（补全 LGDL 门禁测试用例）

> **文档定位**: SDDU 审查报告 — 逐项记录自主审查执行结果（C1~C18），作为 validate 阶段的输入
> **审查策略**: review.md（C1~C18 审查清单 + 四维度指引）
> **前置依赖**: review.md、spec.md（12 FR/6 NFR/8 EC）、plan.md（4 ADR）、build.md（13/13 + 偏差记录）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-02
> **审查轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-02
> **更新说明**: 初始创建 — 静态审查全部 10 个产物文件 + 12 快照资产 + git diff/status 取证 + 镜像逐字节比对脚本；结论 ✅ 通过（17 通过 / 1 警告 / 0 失败 / 0 阻塞）

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查项总数 | 18 |
| 通过 | 17 |
| 警告 | 1 |
| 失败 | 0 |
| 阻塞问题 | 0 |

## 2. 逐项审查结果（C1~C18）

| # | 审查对象 | 审查基准 | 评估 | 发现 | 严重程度 |
|---|---------|---------|:--:|------|:--:|
| C1 | 旁路零运行时改动 | NFR-001/NG-001 | ✅ | `git status --porcelain`：仅 `M tsconfig.json`（+1 行 exclude）；6 顶层 test + test-support/ + test-assets/ 全 untracked 新增；render/router/layout/core src 业务文件零改动。`sha256sum dist/index.js` = `2ec5c0a5…` 与 tasks/state 基线逐字一致。ci.yml/package.json 无 diff | — |
| C2 | render-harness 基座 | FR-001 | ✅ | render-harness.ts:32-47 renderDoc = parseLgdl → valid 断言（含 issues 拼入错误信息）→ layoutDocument → renderSvg → 返回三元组；模块级缓存 Map（key = id ?? source）;52 行单责清晰 | — |
| C3 | geometry-audit 代码质量 | FR-005/NFR-003 | ✅ | 924 行分模块：轻量 SVG 解析器（parseSvgElements 扫描式 + `<g>` 栈 + data-lgdl-loc 继承）→ 几何工具 → 容器框提取 → G1~G5 各独立 audit* 函数 → auditGeometry 主入口。Violation.element 定位风格含 class/坐标/d 段/detail 说明（符合 NFR-003）；docRef 优先取 data-lgdl-loc | — |
| C4 | G1~G5 判定语义与容差常量 | D-003/EC-008 | ✅ | AUDIT_TOL 六常量 0.51/1/2/22/30/20 与 D-003 逐字一致且有自测锁定（geometry-audit.test.ts:303-310，防静默放宽）。逐行对照：G1 双源硬判定 ✓；G2 仅四连边 class + min(\|dx\|,\|dy\|)>0.51 + C/Q/A fail-safe 报 ✓；G3 开区间 + 端点节点/所属组（嵌套递归）豁免 + 贴边/零长不判 ✓；G4 宿主豁免（节点/容器/祖先/边端点容器）+ 2px 扩边 ✓；G5 viewBox ±1px + defs/anchors 豁免 + datastream 泳道列 + EC-003 无 lane 降级 ✓ | — |
| C5 | ADR-004 审计独立实现 | ADR-004 | ✅ | grep 确认 geometry-audit.ts import 面仅 `@lgdl/lgdl-core`、`@lgdl/lgdl-layout` 的**类型**（擦除无运行时依赖），零 router/render 运行时 import；独立实现 SVG 解析/相交/估宽（segmentCrosses 等只语义参照不复用） | — |
| C6 | A 档 11 事实源矩阵 | FR-002/E1/ADR-002 | ✅ | matrix-a.test.ts：FR-001 自举（inline 2 节点 1 边）12 注册全绿结构；11 例循环注册经 renderDoc 全链路。**镜像比对脚本实证**：examples-sources.ts 11 条 source 与 lgdl-web/src/examples.ts 逐字节一致（diff=0） | — |
| C7 | B 档矩阵 | FR-003/D-001 E2~E6/EC-004 | ✅ | registry 13 条（B1~B10a/b + B11）逐条对照 plan §7 表：type/qRefs/intent 一致；semanticLock=true = B3/B4a/B4b/B9；B11 optional。matrix-b.test.ts 每条 = renderDoc → audit 0 + 专属断言（B1 形状回退/双向边、B2 折叠+members 定位、B3/B4a/B4b/B9 双渲染一致、B6 合并计数、B7 三型依赖正交、B8 基数全枚举、B10a/b 无 initial + A 档对照组） | — |
| C8 | kind 覆盖核对表 9 格动态断言 | D-001 核对表/FR-004 | ✅ | kind-coverage.test.ts 11 条覆盖 9 格：start/end 药丸 rx=w/2（login-flow + state）、process rx=6、decision polygon 四顶点 = bbox 四边中点（数值级断言）、entity A 弧 + er members、note 折角 L x+w-12/x+w,y+12、state 回退（rect 无 polygon/path）、milestone gantt 菱形 r=9 与 flowchart 回退 rect、group 容器框 contains（architecture 3 组 + login-flow frontend 外框含 auth 内框嵌套 ≥2）、datastream/gantt lane、无 kind 回退 rx=6；全部元素级定位 | — |
| C9 | Q-xxx 映射与可追溯 | FR-004/NFR-006 | ✅ | registry 13 条 qRefs 与 spec.md:160 映射一致（Q-004~Q-013）；每条 intent 说明覆盖维度/等价类归属/设计意图；matrix-a/b、snapshot、degraded-paths 文件头注释含 Q-xxx 映射与 EC 授权（NFR-006 抽查 ≥3 满足） | — |
| C10 | 审计自测正反例 ≥10 | FR-006 | ✅ | geometry-audit.test.ts 21 条（≥10 裕度）：G1 必报 2 + 不报 1；G2 必报 3（45° 斜段/message line/fail-safe C 命令）+ 不报 2（15° 容差/形状 path）；G3 必报 1 + 不报 3（贴边/端点豁免/零长）；G4 必报 1 + 不报 2（宿主/22px 基数外置）；G5 必报 2（画布/泳道列）+ 不报 3（defs/1px 舍入/anchors）；+ AUDIT_TOL 锁定 1。必报断言查 type + element 定位串，健康断言 typeCount=0 | — |
| C11 | 退化/兜底专项 | FR-007/EC-005/D-005 | ✅ | degraded-paths.test.ts 3 场景：① routeDefault 零长（layout.edges 空 points → renderSvg 输出 M 0,0 不抛 + audit G1/G2/G3/G5 兜底 0）；② A* 无解→orthogonalize（全高墙 + 上下封边 100% 复现，穿墙输出为证 + 有限/正交断言）；③ routeRectilinear fallback（router 直驱固定阻塞布局 + renderSvg 端到端不抛）。文件头记录开放问题 #5 实证结论（fallback 无法经 DSL 传入） | — |
| C12 | golden 快照 | FR-008/FR-010/D-002 | ✅ | manifest.json 实测：version=1、ids 11（与镜像 id 集合一致）、files 11 项 64-hex sha256、**无 timestamp/createdAt/env 字段**。快照测试：11 条 id 粒度双校验（渲染串 === {id}.svg 字节 && sha256 === manifest.files[id]）+ manifest 完整性断言。11 svg 资产字节有效（4.9K~43K，viewBox/defs/lgdl-g 结构符合解析假定）。再生成链路 = 镜像 + env 重建，与断掉的 gen-examples.mjs 解耦 ✓ | — |
| C13 | 快照更新门禁静默 | FR-009/EC-002/ADR-003 | ✅ | snapshot.test.ts:51 `UPDATE = process.env.LGDL_UPDATE_SNAPSHOTS === '1'`；写分支唯一存在于 before() 且被 UPDATE 门包裹（mkdirSync/writeFileSync 仅 env 显式时执行）；写后立即由 11+1 断言自证（坏基线即红）。普通模式代码零写盘分支 → CI/`npm test` 不可能静默更新 | — |
| C14 | 门禁收集面/CI/时长 | FR-011/EC-007/NFR-004 | ✅ | 6 新测试全在 src 顶层 `*.test.ts`（顶层 glob `tsc src/*.test.ts` 自动收集，node --test dist-test/*.test.js 只跑 *.test.js 不跑 test-support）；package.json 与 ci.yml **零 diff**（git 核实）；tsconfig 唯一 modify = exclude +1 行。B11 默认 skip 不进 ≤60s 预算（EC-007 未触发） | — |
| C15 | 测试守恒 | FR-012/R-007 | ✅ | 全仓 `grep -ro "test(" packages --include="*.test.ts" \| wc -l` = **499** ≥ 437（实测）；git diff 确认既有 svg.test.ts/ascii.test.ts 零改动（零删除零弱化）；新增注册分解自洽（既有 21 + matrix-a 12 + matrix-b 13 + snapshot 12 + audit 21 + kind 11 + degraded 3 = 93，与 build 声明 92 pass+1 skip 一致） | — |
| C16 | build 偏差复核（重点） | EC-001/NG-004/build.md §3 | ✅ | 逐项取证：**① EC-001 已知缺口 4 项（er G4@edges[0]、uml-class G4@edges[1]、state G5@edges[5]、gantt G5@nodes[4]）= 精确已知集断言**（matrix-a KNOWN_A：`assert.equal(violations.length, known.length)` + 每项 type/docRef 命中 + element 文本片段防漂移）——引擎修复致违例变空 → length 断言红提示收编；引擎新引入违例 → length 超 → 红。**非放宽审计、非哑火** ✓；AUDIT_TOL 常量未动。**② B2-LR 如实记录**：registry B2 intent 注释完整记录 layered.ts LR 画布按 last-rank 高度估算致宽>高卡片重叠撑破画布的引擎缺陷实证，文档重构为单 rank 纵排零边验证折叠语义（NG-004 不修引擎，建议作者另立 Feature）✓。**③ G4 口径**：实现障碍 = 节点框 + lgdl-group/lgdl-lane 框（gantt-lane 背景带不计 G4 障碍、G3 仍计）；豁免 = 宿主节点框/宿主容器及祖先/边端点容器（含嵌套）——build.md 已记录理由，容差常量零放宽 ✓（口径与 plan §6.1 表「带框入 G4」字面有出入，建议 validate EC-008 确认后同步 plan）。**④ 快照独立 commit 未执行**：代码侧禁静默已实现（C13），Feature 全量 22 产物未 commit 属作者统一提交范畴（FR-009 规程），非代码缺陷。附项核对：B3 contains=leaf-b 规避 box 顶出画布（U-1 张力以双渲染锁现状）、B9 `_other` 无底框实证（lane rect=2 + legacy x>末泳道右缘断言）、B7 三型依赖正交 0 穿（U-2 规避成功）、开放 #5 实证更新、registry 13 条 ≥11、快照路径 ../test-assets 已修正 | — |
| C17 | ADR-001/002 落位 | ADR-001/ADR-002 | ✅ | dist/ 实测无 test-support 目录（exclude 生效，build dist 与改动前一致）；test-support 4 模块非 *.test.ts 非测试入口；examples-sources.ts 头注 `DO NOT EDIT — 同步源：packages/lgdl-web/src/examples.ts` + 同步规程；grep 确认无 `@lgdl/lgdl-web` import（仅注释提及） | — |
| C18 | 断言有效性抽查 | 测试质量方法论 | ⚠️ | kind-coverage.test.ts:152 `assert.ok(approx(cx - (cx), 0, 0.001))` 为**恒真断言**（x−x≡0，不校验任何几何性质）；同用例 `void cy` 表明里程碑中心 y 未参与断言。该用例主体（菱形 4 顶点 + 宽高 = 2r=18）有效，冗余断言不改变用例结论，但属无效测试代码。其余抽查（matrix-b B7 依赖段正交逐段断言、B6 合并计数、geometry-audit 必报 type+element 断言、matrix-a KNOWN_A）均有效 | 低 |

## 3. 审查维度汇总

| 审查维度 | 审查项数 | 通过 | 警告 | 失败 | 通过率 |
|---------|:--:|:--:|:--:|:--:|:--:|
| 代码质量 | 2 | 2 | 0 | 0 | 100% |
| 规范符合性 | 8 | 8 | 0 | 0 | 100% |
| 架构一致性 | 5 | 5 | 0 | 0 | 100% |
| 测试质量 | 3 | 2 | 1 | 0 | 66.7% |
| **合计** | **18** | **17** | **1** | **0** | **94.4%** |

## 4. 阻塞问题

无（阻塞问题数 = 0）。

## 5. 改进建议

| # | 位置 | 问题 | 对应 Cx | 建议 |
|---|------|------|:--:|------|
| 1 | packages/lgdl-render/src/kind-coverage.test.ts:152 | 恒真断言 `approx(cx - (cx), 0, 0.001)`（x−x≡0）+ `void cy`——里程碑菱形中心未真正参与校验 | C18 | 删除该断言，或改为校验菱形中心与 LayoutResult 里程碑节点 bbox 中心（cx≈node.x+w/2、cy≈node.y+h/2）重合，使「中心」语义真实被断言 |
| 2 | packages/lgdl-render/src/test-support/matrix-docs-b.ts:107-117（B2 intent） | B2 由「LR 布局混 kind + 节点边」重构为单 rank 纵排零边——uml-class LR + 宽>高卡片 + 节点边的组合在矩阵中留空缺（引擎 layered.ts LR 缺陷所致） | C16 | 作者另立 Feature 修复 LR 布局缺陷后，恢复 B2 原组合文档补回覆盖；registry intent 已记录 B2-LR 待办 |
| 3 | packages/lgdl-render/src/test-support/geometry-audit.ts:60（G4_CONTAINER_CLASSES） | G4 障碍排除 lgdl-gantt-lane 背景带（G3 仍计），与 plan §6.1 表「G4 障碍含带框」字面表述有出入（build.md 偏差③已记录理由：行/轴 label 落带内属设计行为） | C16 | validate 阶段按 EC-008 实测确认该口径无漏报后，将 plan §6.1 G4 表同步为「组/泳道框（gantt-lane 背景带除外）」避免后续实现/文档漂移 |
| 4 | Feature 产物（git 未提交） | build 偏差④：快照独立 commit 未执行；22 个产物文件（10 代码 + 12 资产）+ tsconfig 改动全部处于未提交状态 | C13/C16 | 作者 review 通过后按 FR-009/EC-002 规程提交——建议将快照资产/镜像（test-assets/golden + examples-sources.ts）与门禁代码拆分 commit，快照基线变更独立成 commit 以便回溯 |

## 6. 结论

**结论**: ✅ 通过

| 指标 | 结果 |
|------|------|
| 审查通过率 | 94.4%（17/18） |
| 阻塞问题数 | 0 |
| 规范符合性偏差 | 0 项 |
| 可进入 validate | 是 |

**理由**: 18 项审查 17 通过 1 警告 0 失败 0 阻塞。关键核验全部成立：① **旁路零 src 改动实证**（git status/diff + dist/index.js sha256 与基线一致 + 配置面仅 tsconfig 一行）；② **EC-001 已知缺口 4 项为精确已知集断言**（数量 + type/docRef + element 三重约束，引擎修复/新增违例均触发红，非放宽审计，AUDIT_TOL 常量零放宽）；③ **B2-LR 引擎缺陷如实记录不修**（NG-004 遵循，registry intent 完整记载，另立 Feature 建议已列）；④ G4 实现口径与容差常量经代码对照确认（口径差异列改进项供 validate 校准）；⑤ ADR-001~004 全部遵循（test-support 落位 / 镜像逐字节一致 / 快照 env 显式更新门 / 审计独立实现）；⑥ 矩阵 A 11 + B 13 条、kind 覆盖 9 格、快照 11 组双校验、自测 21 条、退化 3 场景、守恒 499 ≥ 437 全部符合 spec FR-001~012。唯一警告为 kind-coverage 1 处恒真断言（低，不改变用例有效性），已列改进建议。规范符合率 100%，满足「阻塞 0 + 改进 <5」通过标准，可进入 validate 阶段动手验证。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1）— 18 项逐项审查完成：17 通过 / 1 警告 / 0 失败 / 0 阻塞；build 偏差 4+6 项全部代码取证复核（EC-001 精确已知集 ✓ / B2-LR 如实记录 ✓ / G4 口径 ✓ / 快照 commit 待作者）；结论 ✅ 通过 | 2026-09-02 | SDDU Review Agent |
