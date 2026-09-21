# 验证报告：specs-tree-v5-1-next-registry-pipeline

> **文档定位**: SDDU 验证策略 — 指导 validate Agent 执行自主验证的场景和方法；验证结果见 validate-report.md
> **前置依赖**: spec.md（本叶 v1.1，含 FR-ALLN-057 口径注 ①）、父 `../spec.md`、plan.md、review-report.md（R1，状态 ⚠️ 有条件通过 / 0 阻塞）、build.md v1.1（R1+R2）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-22
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-22
> **更新说明**: 初始创建（V1~V9 验证场景矩阵；对抗优先，独立复算；含 review R1 附条件 I-01/I-02/I-04 的订正验证）

## 1. 验证概要

| 维度 | 基准 | 达标线 |
|------|------|:--:|
| FR 测试覆盖 | 本叶承载 33 条 FR | 100%（每条 ≥1 个 Vx） |
| NFR 覆盖 | 本叶相关 7 条 NFR | ≥ 80%（目标 100%） |
| EC 覆盖 | 本叶相关 8 条 EC | 100% 抽验 |
| 构建 | `npm run build` / `npm run typecheck` / `npm test` | 退出码 0 |
| 漂移项 | 孤立代码 / 需求缺失 / 规格漂移 | 严重漂移 0 |
| 阻塞问题 | — | 0 |

**Feature 类型判定**：**代码类 Feature**（`src/**` 纯 TS 机制 + `test/**` 门禁 + `dist/**` 构建产物；无外部 API / DB）⇒ 走全维度验证；其中「接口数据」维度落在**模块接口契约**（`NextProvider`/`NextOp`/注册表/管线/双契约数据），而非 HTTP/DB。

## 2. 自主验证场景（V1~V9）

**验证对象来源**：本叶 `spec.md`（33 FR / 7 NFR / 8 EC / 10 AC）+ `plan.md`（ADR-V5-001/002/008）+ 实际产物（`src/ui/sidepanel/next-registry/**`、`test/next-*.test.ts`、`test/design-contract.test.ts`、`design/ui-redesign/option-g-*`、`dist/sidepanel.js`）。

**验证原则**：**对抗优先 / 独立复算**——不信任 build 自报计数，全部在本机 HEAD 产物上重跑；对每条「可机核」判据施加**真实扰动**（源码注入 / 产物注入 / 伪造数据），实证判据可 FAIL，再逐字节还原（sha256 校验）。

| # | 验证对象 | 验证步骤 | 预期结果 | 验证维度 | 验证方法 |
|---|---------|---------|---------|:--:|:--:|
| V1 | 全门禁计数对账（npm 1129 / design-contract 19 / next-* 63 / gate-integrity 14 / supersession 35 / l0 244 / density 232 / journey 171 / binding 192 / recommendation 65） | 独立跑 `npm test` + 各 `test:*` 门禁 + node `--test` 逐文件 | 计数与登记一致（唯 recommendation 登记 66 有偏差，见 I-01） | 测试覆盖 | 自动化 |
| V2 | 注册表对抗（R1/R2/R3）：往返幂等 / 按 id 整行覆盖 / 3 种注册序置换不变 / 重复 id loud / 悬空 chips 拒绝 / priority·prepend 仲裁 | 自写探针直接驱动 `registerNextProvider`/`resolveOrder`/`validateNextProvider` | 13 项全绿；悬空 chips 仅当 `setKnownOpIds` 打开才拒（产品 0 调用点，I-05 登记） | 接口数据 | 探针脚本 |
| V3 | 瘦分发对抗：注入集 B per-op 分支 / 删 `ACT_TO_OP` 一行 / 注入 `data-act` 回读 | 真实注入 `src/**` 或编译产物 → 跑 `next-dispatch-diff0` / `next-pipeline` → 还原 | 三种扰动均**必红**；四操作下 4 源文件 sha 不变 | 测试覆盖 + 漂移 | 注入 + 门禁 |
| V4 | 迁移等价：旧 4 规则（036ad03^ 逐字转录）vs 内置 provider 输出 | 22 组 ctx × (`candidateRules` + `recommendNextStep`) 逐字段对比；4 种抑制原因 | 逐字段相等；`site.unauthorized` 在 `firstRun=false ∧ !authorized` 下产出 | 接口数据 + 漂移 | 探针脚本 |
| V5 | 双契约对抗：F 60 逐字 / G 127 / F∩G=51 / 计数池隔离 | 独立 sha+计数+映射序列比对；真实注入 F shim 删行、G shim 加字节 | 三项计数命中；扰动必红；注一侧只红该侧 | 测试覆盖 + 漂移 | 探针 + 注入 |
| V6 | 统一管线对抗：四态 / unknown-op loud / pending 超限仲裁 / 快照回滚 | 直驱 `runOp` 四态 + FIFO + 回滚；`op.execute(` 单调用点源文本复算 | 四态有序结算；超限入队 + 系统行；回滚恰 1 次；单调用点 | 接口数据 + 边界 | 探针脚本 |
| V7 | 红线逐字节：产物冻结面 / 保护段（journey·binding）/ 阈值 / 台账 | sha256 + 字节段 + `git diff` 冻结面 + 阈值键比对 | 产物 sha 命中；保护段 sha+字节偏移命中；冻结面零 diff；阈值零改动 | 漂移 | 探针脚本 |
| V8 | 体积：507,315 ≤ 532,680（= floor(507,315×1.05)）；五要素链；越限注入 | 实测产物 + 登记链比对；注入 +30,000 B 到 `dist/sidepanel.js` | 判定达标；越限注入门禁**必红**；还原 sha 一致 | 性能边界 + 构建 | 探针脚本 |
| V9 | spec AC 抽验 + FR-ALLN-004 共享面「恰一次」 | AC 锚点在 spec 可定位；F/G shim 实跑；R1~R7 可机核；共享面登记计数 | 10/10 锚点；F 60/60 + G 127/127；designContractChanges=1 ∧ 体积登记=1 | 测试覆盖 + 接口数据 | 探针脚本 |

> **补充约定**：`review.md` 的 C1~C34 是**静态**审查；本矩阵只做**动态**验证（跑 / 注 / 算），不重复静态阅读；对 review 的 3 个 `⚠️`（C12/C17/C23）与 5 个改进项（I-01~I-05）设专项：
> - **I-01** → V1（recommendation 计数同源重测）
> - **I-04** → V2/V9（re-export 后的字节 Δ + 跨表 7 源机核）
> - **I-02** → V3/V9（`data-act` 零回读判据 + spec 口径注）
> - **I-03** → V4b + V7（`site.unauthorized` chips 部分落地，登记自紧）
> - **I-05** → V2-7（`setKnownOpIds` 产品调用点计数）

## 3. 覆盖计划（FR / NFR / EC）

- **FR（33 条）**：`FR-ALLN-003·004·010·011·013·030~038·055~059·100~103·112·113·115·116·120·121·123·125·130·133` — 每条映射到 V1~V9 至少 1 个场景（映射表见 validate-report.md §3.1）。
- **NFR（7 条）**：`NFR-ALLN-001（journey）·004（单源机核）·005（体积）·006（兼容面）·007（可 FAIL）·010（可逆+三级）·012（diff=0）` — 全覆盖。
- **EC（8 条）**：`EC-ALLN-001·002·003·004·005·017·018·020` — V2/V6/V7 抽验。

## 4. 接口与数据验证说明

本叶无 HTTP API / DB，故模板 §4「接口与数据实测」按**模块接口契约**执行：`NextProvider`/`NextOp` 形状（V2）、注册表 API（V2）、`runOp` 四态契约（V6）、`ACT_TO_OP` 双向映射（V3/V9）、双契约数据（V5）。

## 5. 构建与脚本验证说明

| 命令 | 用途 |
|------|------|
| `npm run build` | esbuild 产物 + 体积实测 |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | node 全量门禁（tsc 编译 + `node --test`） |
| `npm run test:<chromium-gate>` | 真实 dist 的 Chromium 行为门禁 |

## 6. 性能与边界验证说明

本叶**无 NFR 性能指标**（无并发/响应时延要求）；「性能边界」维度以 `test:density`（28 格 + 几何下界 488px）、`test:ui`（journey 171）、`test:binding`（192）与 `dist/sidepanel.js` 体积判定承载；EC 边界（重复 id / 未知 deps / 非法 mode / 悬空 chips / execute 抛错 / pending 门控 / 台账一致性 / 卸载重注册）由 V2/V6/V7 抽验。

## 7. 漂移检测计划

| 漂移类型 | 方法 |
|---------|------|
| 孤立代码 | 新增 `src/**` 模块 ↔ FR 映射逐条对账 |
| 需求缺失 | 33 FR ↔ 门禁/判据证据逐条对账（含 `pending-v5-2` 显式登记项） |
| 规格漂移 | `git diff` spec.md（本轮 I-02 授权加注需如实登记） |

## 8. 结论

**结论**: 待执行（本策略先行产出；执行结果见 validate-report.md R1）

## 9. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V1~V9 场景矩阵；对抗优先 + 独立复算；I-01~I-05 专项映射） | 2026-09-22 | SDDU Validate Agent |
