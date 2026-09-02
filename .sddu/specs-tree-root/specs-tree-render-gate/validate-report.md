# 验证报告：specs-tree-render-gate（补全 LGDL 门禁测试用例）

> **文档定位**: SDDU 验证报告 — 逐项记录自主验证的执行结果，作为工作流终点
> **验证策略**: validate.md（V1~V12 验证场景 + 五维度指引）
> **前置依赖**: validate.md、spec.md（12 FR/6 NFR/8 EC）、review-report.md（R1，17 通过/1 警告/0 阻塞，结论 ✅ passed）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-02
> **验证轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-02
> **更新说明**: 初始创建 — V1~V12 全部动态执行（跑 npm test / 单跑各测试文件 / git diff 取证 / 独立注入脚本实测穿边与 EC-001 双向 / 快照篡改实验），结论 ✅ 通过

## 1. 验证概要
> 验证结果的量化总览

| 维度 | 数值 |
|------|:--:|
| 验证项总数 | 12（V1~V12） |
| 通过 | 12 |
| 失败 | 0 |
| 无法执行 | 0 |
| 阻塞问题 | 0 |

## 2. 逐项验证结果（V1~V12）
> 对照 validate.md 中定义的验证场景，逐项执行并记录实测结果

| # | 验证对象 | 验证步骤 | 预期结果 | 实测结果 | 判定 |
|---|---------|---------|---------|---------|:--:|
| V1 | 旁路零 src 改动（NFR-001/NG-001） | git status/diff + dist sha256 | src 零 diff；dist hash 不变；配置面仅 tsconfig +1 | `git status` 仅 M tsconfig.json + 8 未跟踪新增项；四包 src `git diff` 空；`dist/index.js` sha256=`2ec5c0a5…` 与基线逐字一致；ci.yml/package.json 零 diff | ✅ |
| V2 | render 门禁全绿 + 时长（FR-011/NFR-004） | `npm run test --workspace @lgdl/lgdl-render` + 计时 | 93 注册全绿；≤60s | **93 tests / 92 pass / 1 skip(B11) / 0 fail**；`node --test` 7.24s，npm 包装 ≈11s | ✅ |
| V3 | 全仓 npm test（FR-011/CI 等价） | `npm run test --workspaces` | exit 0 | **exit 0**（各包 267/93/8/35/79/11/14 全绿，0 fail） | ✅ |
| V4 | A 档矩阵 + FR-001 自举（FR-001/002） | 单跑 matrix-a.test.js | 12 pass | **12 tests / 12 pass / 0 fail**（含 4 档 EC-001 已知集精确断言） | ✅ |
| V5 | B 档矩阵（FR-003/EC-003/EC-004） | 单跑 matrix-b.test.js | 13 注册：B1~B10ab 绿 + B11 skip | **13 tests / 12 pass / 1 skip(B11) / 0 fail**（B1~B10a/b 语义锁/折叠断言全过） | ✅ |
| V6 | kind 覆盖 9 格（FR-004） | 单跑 kind-coverage.test.js | 11 pass | **11 tests / 11 pass / 0 fail**（9 格逐格元素级断言全过） | ✅ |
| V7 | 审计自测 + 退化专项（FR-006/007） | 单跑 geometry-audit + degraded-paths | 21 pass + 3 pass | **audit 21/21 pass（≥10 裕度）；degraded 3/3 pass** | ✅ |
| V8 | 快照字节 + 可再生成（FR-008/010） | snapshot.test + 独立比对 + env 重建 | 11 组双校验绿；独立比对 11/11；重建后 sha 零变化 | snapshot 12/12 pass；独立脚本 **11/11 svg↔manifest sha 一致**、files 键齐、无时间戳；`LGDL_UPDATE_SNAPSHOTS=1` 重建前后 sha `diff` 为空 | ✅ |
| V9 | 审计有效性——穿边注入（FR-005/NFR-003） | 独立脚本注入 G3 | 基线 0；注入后 G3 查出且定位 | 基线 0（不误报）；注入穿 llm 水平段后 **1 条 G3**：`lgdl-edge edges[0] 段 (581,68)->(739,68) 穿 llm 框 (580,40,160x56)`，element/detail/docRef 全定位 | ✅ |
| V10 | EC-001 已知集精确断言非放宽（EC-001） | 独立双向探针 P1~P4 | P1 精确匹配；P2/P3 双向红；P4 定位完整 | P1 ✅（真实 er violations=1 G4@edges[0]，element 含基数文本）；P2 ✅（模拟引擎修复 violations=[] → 红提示收编）；P3 ✅（注入新增 G3 → 2>1 红）；P4 ✅（type=G3 docRef=edges[0] element 含段坐标） | ✅ |
| V11 | 快照篡改即红 + 无静默更新（FR-009/EC-002） | 篡改 er.svg → 跑测试 → 恢复 | 篡改红；普通模式无写盘；恢复全绿 | 篡改 viewBox 宽 +1（sha `2e6b8d47…`→`41d640f5…`）→ snapshot **11 pass/1 fail（er 红）**；普通模式重跑后篡改文件 sha 不变（无静默写盘）；恢复后 **92 pass/0 fail** | ✅ |
| V12 | review 4 项改进 + 漂移检测（C18） | 逐项核对 + 对照扫描 | 4 项改进标注状态；无漂移 | 见 §3.5：改进 1 低危保留待作者（不阻塞）；改进 2/3/4 作者范畴；孤立代码/需求缺失/规格漂移均 0 | ✅ |

> ⏭️ 无无法执行项（全部场景在本地真实执行；无外部 API/DB 依赖）。

## 3. 验证详细信息
> 按验证维度展开的详细执行结果

### 3.1 测试覆盖
> 运行测试套件的结果（实测命令输出摘要）

| 需求 ID | spec 描述 | 测试用例 | 执行结果 | 覆盖率 |
|---------|----------|---------|:--:|:--:|
| FR-001 | 全链路门禁基座 | matrix-a.test.ts::FR-001 基座自举 | ✅ | 已覆盖 |
| FR-002 | A 档 11 事实源矩阵 | matrix-a.test.ts::A 档 11 例（循环注册） | ✅ | 已覆盖 |
| FR-003 | B 档等价类矩阵 | matrix-b.test.ts::B1~B10a/b（registry 13 条） | ✅ | 已覆盖 |
| FR-004 | 矩阵组织/kind 核对表 | kind-coverage.test.ts::9 格 11 例 | ✅ | 已覆盖 |
| FR-005 | geometry-audit helper | geometry-audit.test.ts::21 例 + V9 注入实测 | ✅ | 已覆盖 |
| FR-006 | 审计自测正反例 ≥10 | geometry-audit.test.ts（21 例，≥10 裕度） | ✅ | 已覆盖 |
| FR-007 | 退化/兜底路径专项 | degraded-paths.test.ts::3 场景 | ✅ | 已覆盖 |
| FR-008 | golden 快照建档 | snapshot.test.ts::manifest + 11 组双校验 | ✅ | 已覆盖 |
| FR-009 | 快照回归禁静默更新 | snapshot.test.ts（env 门）+ V11 篡改实验 | ✅ | 已覆盖 |
| FR-010 | 快照可再生成 | V8 env 重建前后 sha diff=0 | ✅ | 已覆盖 |
| FR-011 | 门禁落入 npm test/CI | V2 93 注册全绿 + V3 全仓 exit 0 + ci.yml 零 diff | ✅ | 已覆盖 |
| FR-012 | 测试守恒 ≥437 | 全仓 `grep -ro "test(" … \| wc -l` = **499**（437→499，零删除零弱化，git diff 无既有 *.test.ts 改动） | ✅ | 已覆盖 |

### 3.2 数据面（快照字节 + 审计输出，Feature 无 API/DB）
> 实际比对测试资产与审计输出，对比 spec 定义

| 检查项 | 调用方式 | 预期 | 实测 | 一致？ |
|--------|---------|------|------|:--:|
| 11 golden svg ↔ manifest sha | 独立 node 脚本（crypto sha256） | 11/11 一致 | **11/11 一致**（architecture=b9d6396a… / er=2e6b8d47… 等，manifest version=1、ids 11、files 键齐、无时间戳） | ✅ |
| 镜像 ↔ web examples.ts | node 提取比对 | 11 条 source 逐字节一致 | **11/11 逐字节一致**（ADR-002 无镜像漂移） | ✅ |
| audit 输入→输出（G3 穿边） | 独立注入脚本（mindmap 真实渲染） | 基线 0；注入穿边报 G3 | 基线 0 → 注入后 1 条 G3 定位 llm 框（见 V9） | ✅ |
| EC-001 已知集（er 档） | 独立双向探针 | violations 恰 = known 1 条 | P1 精确 1 条 G4@edges[0] + element 含 `>1</text>` | ✅ |

### 3.3 构建脚本
> 构建、lint、类型检查执行结果（本 Feature 纯测试侧：无 lint/tsc --noEmit 全仓入口，以 npm test 编译链路 + git diff 为证）

| 命令 | 退出码 | 耗时 | 输出摘要 | 结果 |
|------|:--:|------|---------|:--:|
| `npm run test --workspace @lgdl/lgdl-render` | 0 | ≈11s（node --test 7.24s） | 93 tests / 92 pass / 1 skip / 0 fail | ✅ |
| `npm run test --workspaces` | 0 | — | 全仓 0 fail（267/93/8/35/79/11/14） | ✅ |
| `sha256sum packages/lgdl-render/dist/index.js` | 0 | — | `2ec5c0a5…` 与基线逐字一致（NFR-001 旁路） | ✅ |
| `git diff` 四包 src / ci.yml / package.json | 0 | — | 空 diff（零业务/配置改动；tsconfig exclude +1 行为唯一 modify） | ✅ |
| dist/ 泄漏检查 | 0 | — | `ls dist/` 无 test-support/audit/matrix 条目（ADR-001 exclude 生效） | ✅ |

### 3.4 性能边界
> NFR 性能指标实测 + EC 边界实测

| NFR/EC | 指标要求 | 实测值 | 偏差 | 达标？ |
|-----|---------|-------|------|:--:|
| NFR-004 | render test ≤60s | 7.24s（node --test，93 用例；npm 包装含 tsc ≈11s） | 远优于预算 | ✅ |
| NFR-005 | 快照跨环境确定性 | env 重建前后 12 资产 sha 全部一致（diff 空） | 无 | ✅ |
| EC-001 | 已知缺口 4 项 = 精确已知集 | matrix-a 12/12 pass；双向探针 P2/P3 证实「修复即红/回归即红」非放宽 | 无 | ✅ |
| EC-002 | 快照漂移处置 | V11：篡改→红；普通模式无静默覆盖；恢复→绿 | 无 | ✅ |
| EC-003 | `_other` 合成泳道降级 | B9 pass（lane rect=2 现状锁 + 画布降级 audit 0） | 无 | ✅ |
| EC-004 | mindmap/sequence/gantt 怪角语义锁 | B3/B4a/B4b pass（双渲染一致 + 0 违例） | 无 | ✅ |
| EC-005 | 零长/退化路径 | degraded 3/3 pass（routeDefault/A* 无解/fallback） | 无 | ✅ |
| EC-007 | 收集面不足 | 未触发：顶层 glob 自动收录（package.json/ci.yml 零 diff） | 无 | ✅ |
| EC-008 | 容差校准 | AUDIT_TOL 六常量零放宽（V10 P1 element 含 `>1</text>` 定位证实 22px 基数外置口径生效） | 无 | ✅ |

### 3.5 漂移检测
> 实现与规范的偏离扫描

| 漂移类型 | 检测命令/方法 | 结果 |
|---------|-------------|------|
| 孤立代码（有代码无需求） | 新增 6 测试 + 4 test-support + 12 资产 ↔ spec FR-001~012 映射核对 | ✅ 无（全部落在 FR/D-001/ADR-001~004 范围内） |
| 需求缺失（有需求无代码） | FR-001~012 逐项 ↔ 测试文件落点核对（§3.1） | ✅ 无（12 FR 全绿） |
| 规格漂移（spec 被修改） | git status/diff + 产物对照 | ✅ 无（spec.md 未动；state.notes 未改） |
| review 改进建议跟踪 | 逐项核对 review-report.md §5 | 见下表（0 阻塞） |

**review 4 项改进建议跟踪**：

| # | 改进建议 | 现状（validate R1 实测） | 判定 |
|---|---------|------------------------|:--:|
| 1 | kind-coverage.test.ts:152 恒真断言 `approx(cx-(cx),0,0.001)` | 代码仍在（152 行确认）；该用例主体（菱形 4 顶点 + 2r=18 断言）有效，恒真断言为冗余无效代码，不影响用例结论 | ⚠️ 低危保留，待作者（不阻塞） |
| 2 | B2-LR 引擎缺陷另立 Feature 修复后恢复原组合覆盖 | registry intent 注释完整记录 B2-LR；引擎缺陷本 Feature 不修（NG-004） | ✅ 已记录，待作者另立 Feature |
| 3 | G4 口径同步 plan §6.1（gantt-lane 除外） | 实现口径 G4_CONTAINER_CLASSES 不含 lgdl-gantt-lane（代码 60 行确认）；V10 实测无漏报误报 | ✅ 口径正确，plan 文档同步待作者 |
| 4 | Feature 产物提交规程（快照独立 commit） | 22 产物 + tsconfig 改动均未提交（git status untracked）；代码侧禁静默已实现（V11 实证） | ✅ 作者统一提交范畴 |

## 4. 验证脚本执行记录
> ADR-003 落地：validate Agent 自主编写并直接执行的验证脚本记录
> 脚本存放路径：`/tmp/sddu-validate-specs-tree-render-gate-20260902/`

| 脚本文件 | 用途 | 对应场景 | 退出码 | 关键输出 |
|---------|------|:--:|:--:|---------|
| v-g3-inject.mjs | G3 穿边注入：mindmap 基线 0 → 注入穿 llm 水平段 → audit 必报 G3 | V9 | 0 | 基线 0；注入后 1×G3 `穿 llm 框 (580,40,160x56)`，docRef=edges[0] |
| v-ec001-nfr003.mjs | EC-001 已知集双向探针 P1~P4 + NFR-003 定位 | V10 | 0 | P1 精确 1 条 G4@edges[0] ✅；P2 修复即红 ✅；P3 回归即红 ✅；P4 type/docRef/element 齐全 ✅ |
| v-snapshot-bytes.mjs | 磁盘 11 svg ↔ manifest sha 独立比对 + files 键集齐 + 无时间戳 | V8 | 0 | 11/11 一致；files 键齐；无时间戳 |
| golden-before.sha / golden-after.sha | `LGDL_UPDATE_SNAPSHOTS=1` 重建前后 12 资产 sha 快照 diff | V8 | 0 | diff 为空（确定性） |
| （快照篡改实验） | er.svg viewBox 篡改 + cp 备份 + 恢复 | V11 | 0/1 | 篡改 sha `41d640f5…` → snapshot er 红（1 fail）；普通模式无写盘；恢复后 sha=`2e6b8d47…` 全绿 |

## 5. 阻塞问题
> 必须修复后才能通过验证的问题

| # | 位置 | 问题 | 对应 Vx | 修复建议 |
|---|------|------|:--:|---------|
| — | — | 无 | — | — |

## 6. 结论

**结论**: ✅ 通过

**指标达标矩阵**：

| 指标 | 要求 | 实测 | 达标？ |
|------|------|------|:--:|
| FR 测试覆盖 | 100%（12/12） | 12/12 全绿 | ✅ |
| NFR 测试覆盖 | ≥80%（6 项） | 6/6 达标 | ✅ |
| 构建退出码 | 0 | 0（render + 全仓 npm test） | ✅ |
| 阻塞问题数 | 0 | 0 | ✅ |
| 漂移项 | 0 | 0（改进建议非漂移，0 阻塞） | ✅ |

**理由**: V1~V12 全部动态执行通过，全部基于实测数据：
1. **旁路零改动实证**（V1）：git diff 四包 src 零改动、`dist/index.js` sha256=`2ec5c0a5…` 与基线一致、配置面仅 tsconfig exclude +1 行、ci.yml/package.json 零 diff、dist 无 test-support 泄漏。
2. **门禁全绿 + 守恒**（V2/V3/V4/V5/V6/V7）：render 93 注册（92 pass + 1 skip B11 P2）≈7.2s ≤60s；全仓 npm test exit 0；A 档 12 + B 档 12+1skip + kind 11 + audit 21 + degraded 3 逐文件全绿；全仓 `test(` 437→**499**（≥437，零删除零弱化）。
3. **审计有效性（用户重点 ①）**（V9/V10）：注入穿边场景 → audit 必报 G3 且 element/detail/docRef 完整定位（NFR-003）；EC-001 已知集双向探针证实「精确已知集断言」非放宽——引擎修复致违例消失即红（提示收编）、新增违例即红（漏报拦截）。
4. **快照字节一致性（用户重点 ②）**（V8/V11）：磁盘 11 svg↔manifest sha 独立比对 11/11；篡改 1 个快照 → snapshot 测试即红；普通模式无静默更新路径（篡改文件 sha 运行前后不变）；恢复后全绿；`LGDL_UPDATE_SNAPSHOTS=1` 重建前后 sha diff=0（确定性 + FR-010 可再生成）。
5. **漂移**（V12）：无孤立代码/需求缺失/规格漂移；review 4 项改进全部跟踪——1 项低危恒真断言待作者（不阻塞，不影响用例有效性），3 项作者范畴。

> 遗留（非阻塞，待作者）：① kind-coverage.test.ts:152 恒真断言（改进 1）；② EC-001 已知缺口 4 项裁决（引擎修复即红收编）；③ B2-LR layered.ts 缺陷另立 Feature；④ G4 口径同步 plan §6.1；⑤ Feature 22 产物 + tsconfig 统一提交（含快照独立 commit）。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1）— V1~V12 全部动态执行：穿边注入/EC-001 双向探针/快照篡改实验/独立字节比对/env 重建 diff 均通过；结论 ✅ 通过（FR 12/12、NFR 6/6、构建 0、阻塞 0、漂移 0） | 2026-09-02 | SDDU Validate Agent |
