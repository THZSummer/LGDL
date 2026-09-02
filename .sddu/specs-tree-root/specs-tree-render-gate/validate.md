# 验证策略：specs-tree-render-gate（补全 LGDL 门禁测试用例）

> **文档定位**: SDDU 验证策略 — 指导 validate Agent 执行自主验证的场景和方法；验证结果见 validate-report.md
> **前置依赖**: spec.md（12 FR/6 NFR/8 EC/D-001~006）、review-report.md（R1：17 通过/1 警告/0 阻塞，结论 ✅ 通过）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-02
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-02
> **更新说明**: 初始创建 — 依据 spec FR/NFR/EC + plan（4 ADR / §10 回归总表）+ review-report C1~C18 + 用户指令（穿边注入实测 + 快照篡改实测）自主定义 V1~V12 验证场景；Feature 类型 = 代码类（纯测试代码、旁路门禁）

## 1. 验证概要
> 验证结果的量化总览（执行后回填，见 validate-report.md）

| 维度 | 实测数据 | 达标？ |
|------|---------|:--:|
| FR 测试覆盖 | 12/12（100%） | ✅ |
| NFR 测试覆盖 | 6/6（100%） | ✅ |
| 构建 | 退出码 0 | ✅ |
| 接口一致性 | 不适用（纯测试 Feature，无 API/DB；以快照字节 + 审计输出为数据面） | — |
| 漂移项 | 见 §7（执行后回填） | ✅ |
| 阻塞问题 | 0 项 | ✅ |

## 2. 自主验证场景（V1~V12）
> 验证 Agent 根据 spec/NFR/产物自主定义具体验证场景。Feature 类型 = **代码类**（新增 6 测试文件 + 4 test-support + 12 快照资产），但**产物本身即测试代码**，故验证以「测试执行有效性」为核心，接口/数据维度以快照字节与审计输出替代（无 API/DB 调用面）。

**验证对象来源**：
- `spec.md`：12 FR / 6 NFR / 8 EC / D-001~006 验收标准
- `review-report.md`：C1~C18 + 4 项改进建议（跟踪）
- `plan.md`：§10 回归验证总表（NFR 验收映射）
- 产物：`packages/lgdl-render/src/`（6 测试 + test-support 4）+ `test-assets/golden/`（12 资产）

| # | 验证对象 | 验证步骤 | 预期结果 | 验证维度 | 验证方法 |
|---|---------|---------|---------|---------|---------|
| V1 | **旁路零 src 改动**（NFR-001/NG-001/C1） | ① `git status --porcelain`；② `git diff` 四包 src（render/layout/router/core）零改动；③ `sha256sum dist/index.js` 与基线 `2ec5c0a5…` 一致；④ 配置面仅 tsconfig exclude +1 行 | src 业务零 diff；dist hash 不变；ci.yml/package.json 零 diff | 构建 + 漂移 | git 命令 + sha256 |
| V2 | **render 包门禁全绿 + 时长**（FR-011/NFR-004） | ① `npm run test --workspace @lgdl/lgdl-render`；② 计时 | 93 注册（92 pass+1 skip B11）全绿；时长 ≤60s | 测试覆盖 + 性能边界 | npm test + time |
| V3 | **全仓 npm test 全绿**（FR-011/CI 等价） | `npm run test --workspaces` | 退出码 0，全包无失败 | 测试覆盖 | npm test |
| V4 | **A 档矩阵 + FR-001 自举**（FR-001/FR-002/C6） | 单跑 `matrix-a.test.js` | 12 pass（FR-001 自举 1 + A 档 11 例）；audit 0 或已知集精确命中 | 测试覆盖 | node --test |
| V5 | **B 档矩阵**（FR-003/C7） | 单跑 `matrix-b.test.js` | 13 注册：B1~B10a/b 全绿 + B11 skip（P2 env 门）；语义锁/折叠断言通过 | 测试覆盖 | node --test |
| V6 | **kind 覆盖 9 格**（FR-004/D-001 核对表/C8） | 单跑 `kind-coverage.test.js` | 11 pass；start/end·process·decision·entity·note·state·milestone·group·无 kind 逐格真实绘制断言 | 测试覆盖 | node --test |
| V7 | **审计自测 + 退化专项**（FR-006/FR-007） | 单跑 `geometry-audit.test.js` + `degraded-paths.test.js` | 自测 21 pass（正反例 ≥10 裕度）；退化 3 pass | 测试覆盖 | node --test |
| V8 | **快照字节一致 + 可再生成**（FR-008/FR-010） | ① 单跑 `snapshot.test.js`（12 pass 双校验）；② 独立脚本磁盘 svg ↔ manifest sha 比对 11/11；③ `LGDL_UPDATE_SNAPSHOTS=1` 重建前后 sha diff | 11 组字节+sha 双校验绿；独立比对 11/11 一致；重建后 sha 零变化（确定性） | 测试覆盖 + 数据面 | node --test + 独立比对脚本 |
| V9 | **审计有效性——穿边注入**（FR-005/NFR-003 用户重点 ①） | 独立脚本：mindmap 真实渲染基线 0 违例 → SVG 注入一条穿第三方节点 llm 的水平连边段 → 再 audit | 基线 0（不误报）；注入后 ≥1 G3 且 element 含段坐标/detail 定位 llm 框（不哑火） | 接口/数据面（audit 输入输出） | 独立注入脚本 |
| V10 | **EC-001 已知集精确断言非放宽**（EC-001/C16 用户重点 ① 延伸） | 独立脚本复制 matrix-a assertAudit：P1 真实 er violations=1 G4@edges[0]；P2 模拟引擎修复 violations=[] → 红；P3 模拟新增违例（注入 G3）→ 红；P4 红消息含 type+element+docRef | P1 通过（精确匹配）；P2/P3 均红（修复/回归双向拦截）；P4 定位信息完整 | 接口/数据面 + 漂移 | 独立双向探针脚本 |
| V11 | **快照篡改即红 + 无静默更新**（FR-009/EC-002 用户重点 ②） | ① 备份 er.svg；② 篡改 viewBox 宽度 +1（sha 变化）；③ 单跑 snapshot.test.js → er 红；④ 普通模式重跑全量 → 篡改文件 sha 不变（无静默写盘）；⑤ 恢复备份 → 全绿 | 篡改后 snapshot er 变红（11 pass/1 fail）；普通模式无写路径；恢复后 92 pass/0 fail | 数据面 + 漂移 | 篡改实验 + node --test |
| V12 | **review 4 项改进跟踪 + 漂移检测**（review.md §5/C18） | ① 逐项核对 4 项改进现状（恒真断言位置/口径/提交规程）；② 孤立代码（新增文件 ↔ FR 映射）；③ 需求缺失（FR ↔ 测试落点）；④ 规格漂移 | 4 项改进逐一标注状态；无孤立代码/需求缺失/规格漂移 | 漂移 | git diff + grep + 对照 |

**质量门槛（数量基线法）**：FR 12 项 → V1~V12 每 FR ≥1 Vx（FR-001→V4、FR-002→V4、FR-003→V5、FR-004→V6、FR-005→V9、FR-006→V7、FR-007→V7、FR-008→V8、FR-009→V11、FR-010→V8、FR-011→V2/V3、FR-012→V2 守恒）；五维相关维度（测试覆盖/接口数据面/构建/性能边界/漂移）≥1 条 ✓；用户重点实测（穿边注入 + 快照篡改）映射 V9/V10/V11 ✓。

## 3. 测试覆盖验证
> 运行测试套件，统计覆盖率，逐项标注

### 3.1 功能需求 (FR) — 覆盖率 100%（执行后回填）
| 需求 ID | spec 描述 | 测试结果 | 覆盖率 |
|---------|----------|:--:|:--:|
| FR-001 | 全链路门禁测试基座 | V4 ✅ | 已覆盖 |
| FR-002 | A 档 11 事实源矩阵 | V4 ✅ | 已覆盖 |
| FR-003 | B 档等价类矩阵 | V5 ✅ | 已覆盖 |
| FR-004 | 矩阵组织与 kind 核对 | V6 ✅ | 已覆盖 |
| FR-005 | geometry-audit helper | V9 ✅ | 已覆盖 |
| FR-006 | 审计自测正反例 ≥10 | V7 ✅ | 已覆盖 |
| FR-007 | 退化/兜底路径专项 | V7 ✅ | 已覆盖 |
| FR-008 | golden 快照建档 | V8 ✅ | 已覆盖 |
| FR-009 | 快照字节回归禁静默 | V11 ✅ | 已覆盖 |
| FR-010 | 快照可再生成 | V8 ✅ | 已覆盖 |
| FR-011 | 门禁落入 npm test/CI | V2/V3 ✅ | 已覆盖 |
| FR-012 | 测试守恒 ≥437 | V2 ✅ | 已覆盖 |

### 3.2 非功能需求 (NFR) — 覆盖率 100%（执行后回填）
| 需求 ID | spec 描述 | 测试结果 | 覆盖率 |
|---------|----------|:--:|:--:|
| NFR-001 | 旁路零业务改动 | V1 ✅ | 已覆盖 |
| NFR-002 | 零语义改动 | V8（首建字节全绿即证）✅ | 已覆盖 |
| NFR-003 | 失败信息可定位 | V9/V10 ✅ | 已覆盖 |
| NFR-004 | render test ≤60s | V2 ✅ | 已覆盖 |
| NFR-005 | 快照跨环境确定性 | V8（重建前后 sha 一致）✅ | 已覆盖 |
| NFR-006 | 矩阵文档可追溯 | V5/V6 + review C9 ✅ | 已覆盖 |

## 4. 接口与数据实测
> 纯测试 Feature 无 API/DB；数据面 = 快照字节（V8/V11）+ 审计输出（V9/V10），见 validate-report.md

## 5. 构建与脚本验证
> 见 validate-report.md（V1 git diff / V2 npm test / V3 全仓）

## 6. 性能与边界验证
> NFR-004 时长（V2）+ EC-001 已知集（V10）+ EC-002 快照漂移（V11）+ EC-003 `_other` 降级（V5 B9）+ EC-004 语义锁（V5）+ EC-005 退化（V7）+ EC-007 收集面（V2）+ EC-008 容差（V10 AUDIT_TOL 零放宽）

## 7. 漂移检测
> 执行后回填（V12）

## 8. 结论
> 执行后回填（见 validate-report.md §6）

## 9. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建 — V1~V12 场景定义（12 FR 全映射 + 五维 + 用户重点穿边注入/快照篡改实测），等待执行产出 validate-report.md | 2026-09-02 | SDDU Validate Agent |
