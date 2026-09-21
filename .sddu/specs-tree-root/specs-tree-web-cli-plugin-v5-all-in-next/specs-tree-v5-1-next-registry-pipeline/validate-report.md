# 验证报告：specs-tree-v5-1-next-registry-pipeline

> **文档定位**: SDDU 验证报告 — 逐项记录自主验证的执行结果，作为工作流终点
> **验证策略**: validate.md（V1~V9 验证场景 + 五维度指引）
> **前置依赖**: validate.md、本叶 spec.md v1.1、review-report.md（R1，状态 ⚠️ 有条件通过 / 0 阻塞）、build.md v1.1
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-22
> **验证轮次**: **R1（动态验证：独立复跑 / 真实注入 / 逐字节复算）**
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-22
> **更新说明**: 初始创建（HEAD `91a5ff8` 起步；含 review R1 附条件 I-01/I-02/I-04 的订正与再验证）

---

## 1. 验证概要

| 维度 | 数值 |
|------|:--:|
| 验证场景总数 | **9**（V1~V9；子断言 79 条） |
| 通过 | **9 / 9**（子断言 79/79 ✅） |
| 失败 | **0** |
| 无法执行 | **0**（人工面见 §5 N-03） |
| 阻塞问题 | **0** |
| 本轮闭环发现 | **4**（I-01 / I-04 / I-02 / 新 N-01，均已订正并再验证） |
| 遗留登记项 | **7**（N-02~N-08，全部有 owner / 已登记，不阻塞） |

**验证基线**：分支 `feature/web-cli-plugin`，HEAD **`91a5ff8`**（起步）→ **验证产物提交前工作树**（含 I-01/I-02/I-04 订正）。探针目录 `/tmp/opencode/v5-1-validate/`（probes / logs）。

**独立复算纪律**：所有计数均在本机 HEAD 产物上重跑（不采信 build 自报）；所有「可机核」判据均施加**真实扰动**（源码注入 / 编译产物注入 / 伪造数据）实证其可 FAIL，再逐字节还原并以 sha256 校验（见 §4）。

---

## 2. 逐项验证结果（V1~V9）

| # | 验证对象 | 验证步骤（摘要） | 预期结果 | 实测结果 | 判定 |
|---|---------|----------------|---------|---------|:--:|
| V1 | 全门禁计数对账 | `npm test` + 15 项 `test:*` + node `--test` 逐文件 | 与登记一致 | npm **1129/0**；node 子门禁全对标；**recommendation 实测 65（登记 66）⇒ I-01**；binding 2 跑 1 红（KL-N-10 flake） | ✅（含 1 登记偏差已订正） |
| V2 | 注册表对抗（R1~R3） | 自写探针直驱注册表 API（13 条） | 13/13 绿 | **13/13 ✅**；悬空 chips 仅 `setKnownOpIds` 打开后拒（产品调用点 **0**，I-05 登记） | ✅ |
| V3 | 瘦分发对抗 | 注入集 B 分支 / 删 `ACT_TO_OP` 行 / 注入 `data-act` 回读 | 三者必红 | **7/7 ✅**：注入分支→D0-1 红；删行→**编译期 TS2339** + 运行期 NP-6/D0-5 红；`data-act` 回读→D0-6 红；四操作 4 源文件 sha 不变 | ✅ |
| V4 | 迁移等价对抗 | 旧 4 规则逐字转录 vs 注册表输出（22 ctx 组 × 2 函数） | 逐字段相等 | **6/6 ✅**：22 组逐字段相等；4 抑制原因齐备；`site.unauthorized` 在 `firstRun=false ∧ !authorized` 产出 | ✅ |
| V5 | 双契约对抗 | F/G sha+计数+映射序列；注入 F 删行 / G 加字节 / 计数池注侧 | 计数命中 + 注入必红 + 隔离 | **10/10 ✅**：F 60/60、G 127/127、F∩G=**51**；F 删行→红；G +1B→红；注一侧只红该侧 | ✅ |
| V6 | 管线对抗 | `runOp` 四态 + unknown-op + pending 超限 + 回滚 | 13 条绿 | **13/13 ✅**：四态有序、拒绝不执行、超限入队+系统行、回滚恰 1 次、`op.execute(` 单调用点 | ✅ |
| V7 | 红线逐字节 | 产物 sha / 保护段 / 阈值 / 台账 / 冻结面 | 全命中 | **9/9 ✅**：content.js `52a82620…`、pick-layer.js `5f567d7e…`；journey `cc79f413…`+binding `be9ad0e9…` 段 sha 复算命中；冻结面零 diff | ✅ |
| V8 | 体积 | 实测 / 五要素链 / 越限注入 | ≤ 上限且注入必红 | **6/6 ✅**：507,315 ≤ 532,680；链 498,521→507,315 / 523,447→532,680；+30,000 B 注入→红；还原 sha 一致 | ✅ |
| V9 | spec AC 抽验 + FR-004 共享面 | AC 锚点 / shim 实跑 / R1~R7 / 共享面计数 | 全绿 | **8/8 ✅**：10 锚点齐；F 60 + G 127 实跑；R1~R7 各 ≥1 判据；designContractChanges=1 ∧ 体积登记=1 | ✅ |

---

## 3. 验证详细信息

### 3.1 FR 覆盖（本叶承载 33 条，覆盖 **33/33 = 100%**）

| FR | 落地切入点（spec §4） | 证据场景 / 门禁 | 结果 |
|---|---|---|---|
| FR-ALLN-030 | R1 可逆注册 | V2-1/V2-2；`next-registry` 16/0 | ✅ |
| FR-ALLN-031 | R2 依赖声明式 | V2-4/V2-6；NR-1 loud | ✅ |
| FR-ALLN-032 | R3 优先级 · 整行覆盖 | V2-3/V2-5 | ✅ |
| FR-ALLN-033 | R4 挂载点 × 模式 | V2-6/V6-8 | ✅ |
| FR-ALLN-034 | R5 失败三级 | V6-2/V6-3/V6-7 | ✅ |
| FR-ALLN-035 | R6 Seam 三件套 | V3（唯一分发入口）/ V9-3 | ✅ |
| FR-ALLN-036 | R7 义务表 9 行 + 表尾 | V9-3；`next-obligation-table` 10/0 | ✅ |
| FR-ALLN-037 | 义务表静态机核 | V9-3；OT-1~OT-5 | ✅ |
| FR-ALLN-038 | 纯 TS 注册（无 JSON 面） | V2-7（无 JSON 加载面，源码扫描） | ✅ |
| FR-ALLN-055 | 统一管线四态 | V6-1~V6-6 | ✅ |
| FR-ALLN-056 | act→opId 6 条双向 | V3（D0-5）/ V9-4 | ✅ |
| FR-ALLN-057 | chip `data-op`；分发只读 | V3-c（`data-act` 零回读）/ V9-4（渲染派生）；口径注 ① | ✅ |
| FR-ALLN-058 | 瘦分发 diff=0 | V3-a/V3-b/V3-d；`next-dispatch-diff0` 14/0 | ✅ |
| FR-ALLN-059 | 本地 op 语义对齐 | V6-6（不受 pending 门控）；`local-act-wiring` 15/0 | ✅ |
| FR-ALLN-010 | 阻塞终态 5 类单源 | V2-8；`blocked-terminals` 8/0 | ✅ |
| FR-ALLN-011 | 阻塞终态可达 next（机制侧） | V4b；BT-3 完备单射 | ✅ |
| FR-ALLN-013 | `site.unauthorized` 常驻候选 | V4b **when 侧 ✅**；**chips 侧部分**（`op.authorize` 缺，登记 pending-v5-2 ⇒ N-04） | ⚠️ 机制侧达标 / 验收后半登记 |
| FR-ALLN-100 | F 60 冻结不替换 | V5-1/V5-6 | ✅ |
| FR-ALLN-101 | G + 127 入册 | V5-1~V5-3/V5-7 | ✅ |
| FR-ALLN-102 | `designContractChanges` 登记 | V7-5/V9-5 | ✅ |
| FR-ALLN-103 | G 稿零改动 | V7-3（`design/**` 零 diff） | ✅ |
| FR-ALLN-112 | X3 act 闭集→opId 集 | V4；`recommendation-sources` 19/0 | ✅ |
| FR-ALLN-113 | X4 G 入契约 / F 不替换 | V5 | ✅ |
| FR-ALLN-115 | X6 chip `data-op` + 管线 | V9-4；`test:recommendation` ⑮ 65/0 | ✅ |
| FR-ALLN-116 | 等价重锚 4 条登记 | V7-5（4 条 `equivalent-rewrite`） | ✅ |
| FR-ALLN-003 | 零删除 / 计数只增 | V1（唯一增）；V5（F 零删） | ✅ |
| FR-ALLN-004 | 共享面恰一次 | V9-5（DC=1 ∧ 体积登记=1） | ✅ |
| FR-ALLN-120 | 门禁等价重锚 | V1（6 项重锚门禁全绿） | ✅ |
| FR-ALLN-121 | 反证不空转 | V9-6 + V3/V5/V8 注入 | ✅ |
| FR-ALLN-123 | `knownGap` 一致性 | V1；`test:supersession` 35/0 | ✅ |
| FR-ALLN-125 | 新门禁入受审集合 | V1；`test:gate-integrity` 14/0 | ✅ |
| FR-ALLN-130 | 体积五要素（本叶增量） | V8-2 | ✅ |
| FR-ALLN-133 | 红线逐字节 | V7-1/V7-2/V7-3 | ✅ |

### 3.2 非功能需求（本叶相关 7 条，覆盖 **7/7 = 100%**）

| NFR | 本叶关注点 | 证据 | 结果 |
|---|---|---|---|
| NFR-ALLN-001 | 首屏 / 滚动不变差 | `test:ui`（journey）171/0 | ✅ |
| NFR-ALLN-004 | 单源 + 机核 | V2-8 / V7 / V9-3（声明恰一次扫描） | ✅ |
| NFR-ALLN-005 | 体积 ≤ 生效上限 + 五要素 | V8（507,315 ≤ 532,680） | ✅ |
| NFR-ALLN-006 | 兼容读取面不破 | journey（`#input`/`#send`）+ binding（`#rebind`/`#authorize`）+ e2e PASS | ✅ |
| NFR-ALLN-007 | 每条判据可 FAIL 并声明 `expectFailPattern` | V9-6（6 门禁 judgement 表）+ V3/V5/V8 注入 | ✅ |
| NFR-ALLN-010 | 注册可逆 + 失败三级 | V2-1/V2-2 / V6-2/V6-3/V6-7 | ✅ |
| NFR-ALLN-012 | 可演进性（新增 provider diff=0） | V3-d（四操作 sha 不变） | ✅ |

### 3.3 接口数据（模块接口契约；本叶无外部 API/DB）

| 检查项 | spec 要求 | 实测 | 一致？ |
|---|---|---|---|
| `NextProvider` 形状 | `{id,deps,priority,prepend?,mode,fail,when,chips,textOf?,rule?,dispose?}` | 探针 13/13 驱动通过 | ✅ |
| `NextOp` 形状 / `OPS_BY_ID` | 6 注册 op + 3 pending | 6 键 + 义务表 9 行（3 `pending-v5-2`） | ✅ |
| 挂载点 × 模式表 | 4 `waterfall` + `receipt=emit` | V6-8 命中 | ✅ |
| `ACT_TO_OP` | 恰 6 行、双向可查 | V3（D0-5）/ V9-4 | ✅ |
| `designContractChanges` | `[] → [G 五要素]` | V7-5 / V9-5（1 条） | ✅ |

### 3.4 构建与脚本

| 命令 | 退出码 | 输出摘要 | 结果 |
|------|:--:|---------|:--:|
| `npm run build`（esbuild） | 0 | sidepanel 507,315 B；content 177,076 / pick-layer 33,900 逐字节不变 | ✅ |
| `npm run typecheck`（`tsc --noEmit`） | 0 | 无诊断 | ✅ |
| `npm test`（tsc + node --test） | 0 | **1130 / 0**（订正后；订正前 1129） | ✅ |
| `npm run test:e2e` | 0 | `R8 E2E PASS`（真实 dist 全链） | ✅ |
| `bash probes/*.mjs`（V2~V9） | 0 | 79/79 子断言 | ✅ |

### 3.5 性能边界（无 NFR 性能指标；以密度/几何/体积承载）

| 项 | 要求 | 实测 | 达标？ |
|---|---|---|---|
| 密度 28 格 + 几何下界 488px | 零漂移 | `test:density` 232/0 | ✅ |
| 体积 | ≤ 532,680 B | 507,315 B（余 25,365 B；本叶预算余 6 B） | ✅ |
| 越限边界 | 超上限必红 | +30,000 B 注入 ⇒ `size-budget` 红 | ✅ |
| 保护段 journey / binding | 段本土 sha + 字节偏移 | `cc79f413…` / `be9ad0e9…` 复算命中 | ✅ |

### 3.6 漂移检测

| 漂移类型 | 方法 | 结果 |
|---------|------|------|
| 孤立代码（有代码无需求） | `src/ui/sidepanel/next-registry/**` 6 模块 ↔ FR 对账 | ✅ 无（`obligation-table.ts` 刻意不入 bundle graph，有义务表 FR-036/037 承载） |
| 需求缺失（有需求无代码） | 33 FR ↔ 门禁证据 | ⚠️ 1 项**部分落地但显式登记**：FR-ALLN-013 的 `chips 含 op.authorize`（`pending-v5-2`，门禁自紧） |
| 规格漂移（spec 被修改） | `git diff` 本叶 spec.md | ⚠️ 1 处**授权加注**：FR-ALLN-057 口径注 ①（I-02；只加注、零实现/零需求变更） |
| 冻结面零 diff | `git diff 036ad03^..HEAD` | ✅ `src/content/**` / `design/**` / `v3-supersession-ledger.json` / `policy.ts` / `ROADMAP` 全零 diff |

---

## 4. 验证脚本执行记录

> ADR-003：验证脚本由 validate Agent 自主编写并直接执行；路径 `/tmp/opencode/v5-1-validate/`（probes/ + logs/）。扰动全部可还原（源码/产物注入后 sha256 校验复原）。

| 脚本文件 | 用途 | 对应场景 | 退出码 | 关键输出 |
|---------|------|:--:|:--:|---------|
| `probes/p-v2-registry.mjs` | 注册表对抗（往返/覆盖/置换/仲裁/loud/悬空） | V2 | 0 | `V2 SUMMARY: 13/13 pass`；`setKnownOpIds 产品调用点 = 0` |
| `probes/p-v3-dispatch.mjs` | 集 B 分支 + `data-act` 回读注入 + 四操作哈希 | V3(a/c/d) | 0 | `7/7 pass`；注入→`gateExit=1 patternHit=true`；还原 sha 一致 |
| `probes/p-v3b-act-del-row.mjs` | 删 `ACT_TO_OP` 一行（源码 + 编译产物两层） | V3(b) | 0 | `7/7 pass`；源码删行→tsc `TS2339`；产物删行→NP-6/D0-5 红 |
| `probes/p-v4-migration.mjs` | 旧规则 vs 注册表等价对比 + `site.unauthorized` | V4 | 0 | `6/6 pass`；`22 cases 逐字段相等`；`site.unauthorized produced (chips=rebind/repick/describe)` |
| `probes/p-v5-dual-contract.mjs` | F/G 双契约对抗 + 池隔离 | V5 | 0 | `10/10 pass`；`|F∩G|=51`；F 删行/G +1B 均红 |
| `probes/p-v6-pipeline.mjs` | `runOp` 四态 / FIFO / 回滚 / 单调用点 | V6 | 0 | `13/13 pass`；`rolled=1 tables=3` |
| `probes/p-v7-redlines.mjs` | 产物 sha / 保护段 / 阈值 / 台账 / 冻结面 | V7 | 0 | `9/9 pass` |
| `probes/p-v8-volume.mjs` | 体积 + 五要素 + 越限注入 | V8 | 0 | `6/6 pass`；`+30000B ⇒ gateExit=1` |
| `probes/p-v9-ac.mjs` | AC 抽验 + R1~R7 + 共享面计数 | V9 | 0 | `8/8 pass` |
| `run-ui-gates.sh` | Chromium 门禁串行复跑（density/l0/l1/l2/journey/stream/ask-auth/insight/hardening/page-input/zero-injection/ref-pick/l1-reverse/l2-reverse） | V1 | 0 | 全绿（见 §3.4 / §1） |
| `logs/*.log` | 全部原始日志（npm test、门禁、探针、订正前后） | V1~V9 | — | 可回溯 |

---

## 5. 阻塞问题与非阻塞发现

### 5.1 阻塞问题

| # | 位置 | 问题 | 对应 Vx | 修复建议 |
|---|------|------|:--:|---------|
| — | — | **无阻塞问题** | — | — |

### 5.2 本轮闭环发现（review R1 附条件 + 新发现；**已订正并再验证**）

| # | 级别 | 位置 | 问题 | 处置 | 再验证 |
|---|:--:|------|------|------|:--:|
| **I-01** | F | `build.md §5` / `state.json#r2Gates.recommendation` / R2 日志 | 登记 `test:recommendation = 66`，HEAD 产物实跑 **65**（⑮ 净 +6，非 +7） | 66→65（build.md 2 处 + state.json 2 处 + R2 phaseHistory）；build.md §5 追加「validate R1 订正」注 | 独立复跑 ×3 均 **65/0** ✅ |
| **I-04** | F | `src/ui/sidepanel/next-registry/definition.ts:44` | `NEXTSTEP_MIN_INTERVAL_MS` 与 `recommend.ts` 各声明一次（前者产品内无引用）⇒ 双源漂移缝；且 `NEXT_SOURCE_NAMES` ↔ `NEXTSTEP_SOURCE_WHITELIST` 无跨表相等机核 | ① 重复常量删一份改 **re-export**（`definition.ts` → `recommend.ts`）；② `test/recommendation-sources.test.ts` 新增 `crossTableSourceProblems()` 判据 + 1 条 test（含 3 条反证） | `npm run build` ⇒ sidepanel **507,315 B（Δ=0，tree-shaking 如预期）**；content/pick-layer sha 不变；新判据 19/0（含反证）✅ |
| **I-02** | F | 本叶 `spec.md` FR-ALLN-057 | spec 字面「分发只读 `data-op`」与实现（内存 `act→ACT_TO_OP` 桥接）口径不一 | 追加**口径注 ①**（`data-op` = 对外词汇锚 + 进程内桥接；判据 = `data-act` 零回读）；**只加注、零实现改动** | V3-c 注入回读 ⇒ D0-6 红 ✅；V9-4 渲染派生 ✅ |
| **N-01** | F | `state.json#v5-1.r1Artifact/r2Artifact.pickLayerJs.sha256`（2 处） | pick-layer sha 转写笔误：`5f567d7**dedc**58183…`（应为 `5f567d7**ededc**58183…`）——与父 spec / discovery / v3-4 build 的实测值不符 | 订正为实测值 `5f567d7ededc58183afe4ce45e3293b68204dfbe788dc6b9fb09bdc6e0d13e59` | 独立复算 sha256 命中 ✅（V7-1） |

> 说明：以上四项中，I-01/I-04/I-02 为本任务「预备：零/低字节订正」授权项；N-01 为验证过程新发现的**登记保真**笔误（零产品影响，仅 `state.json` 文档值）。

### 5.3 遗留登记项（非阻塞；全部有 owner / 机核自紧，不静默）

| # | 级别 | 事项 | owner | 依据 |
|---|:--:|------|------|------|
| N-02 | N | `test/size-budget.test.ts:53` 注释陈旧：`ceiling = floor(498,521 × 1.05)`，而断言值 532,680 实为 `floor(507,315 × 1.05)`（值正确，注释未随重登记更新） | v5-2（体积重登记轮） | V8-1；`process` 值 = 断言值 |
| N-03 | N | `test:binding` 环境性 flake（KL-N-10）：3 次运行中 1 次在 `#8d/#8e`（tabs switch 二次确认）红，2 次 192/0 绿；与本叶改动无因果 | —（已登记 KL-N-10） | V1；build/review 同源事实 |
| N-04 | N | FR-ALLN-013 `chips 含 op.authorize` 部分落地：`site.unauthorized.chips = [rebind, repick, describe]`（不含 `authorize`） | `specs-tree-v5-2-ops-first-batch` | V4b 实测；`blocked-terminals` BT-4 登记自紧（补上即要求翻转登记） |
| N-05 | N | EC-ALLN-004 注册期悬空 chips 拒绝的运行期未接线：`setKnownOpIds` 产品调用点 **0**（`KNOWN_OPS` 恒 `null`）；现仅静态门禁 `OT-4` 覆盖 | v5-2 | V2-7 实测；review I-05 |
| N-06 | N | `F ∩ G = 51`（id 集非空交集）为**必须记住的事实**：混池防御不得依赖互斥 | —（已入册） | V5-4；`design-contract` 混池防御断言 |
| N-07 | N | 未知 chip action 的处理由「旧 v4-3/v4-4 兜底 notice」改为静默（`dispatchChipAction` 返回 false 被忽略）——原有 15 个 action（集 A 8 + 集 B 7）已全部覆盖，静默路径仅对真正未知 action 可达 | —（已登记为行为变化） | `sidepanel.ts:229-232` + build/review §3.1 |
| N-08 | N | `test:recommendation` 属 Chromium 门禁（不在 `npm test` 内）⇒ 其计数需独立同源重测，不能由 `npm test` 推导 | —（口径） | V1 |

---

## 6. 结论

**结论**: ✅ **通过**

**指标达标矩阵**：

| 指标 | 要求 | 实测 | 达标？ |
|------|------|------|:--:|
| FR 测试覆盖 | 100% | **33/33 = 100%** | ✅ |
| NFR 覆盖 | ≥ 80% | **7/7 = 100%** | ✅ |
| 构建退出码 | 0 | build / typecheck / npm test / e2e 全 **0** | ✅ |
| 阻塞问题数 | 0 | **0** | ✅ |
| 漂移项（严重） | 0 | **0**（1 项部分落地显式登记 + 1 处授权加注） | ✅ |
| 体积 | ≤ 532,680 B | **507,315 B** | ✅ |
| 对抗注入可 FAIL | 全部可红 | 10 类注入全红（见 §2 V3/V5/V8） | ✅ |
| 红线逐字节 | 全命中 | content / pick-layer / 保护段 / 冻结面 全命中 | ✅ |

**理由**：本叶为纯 TS 机制叶，验证以**动态对抗**为主。九组场景 79 条子断言全部通过——契约 v2 七点逐点可机核（V2/V6/V9）；瘦分发 `diff = 0` 为静态事实且经三类真实注入实证（V3）；规则迁移 22 组 ctx 逐字段等价 + 断流修复（`site.unauthorized` 去 `firstRun`）注册表层可产出（V4）；双契约 F 冻结零删 / G 127 逐条与 shim 一致 / 混池隔离（V5）；管线四态唯一 + 回滚真实触发（V6）；红线逐字节与保护段复算命中（V7）；体积经 I-04 改 source 后 Δ 仍为 **0**（V8）；共享面恰一次登记（V9）。review R1 的 3 项附条件（I-01 计数、I-02 口径、I-04 双源）与本轮新发现 N-01（pick-layer sha 笔误）均已订正并再验证；遗留 7 项（N-02~N-08）全部为已登记的非阻塞项，其中 N-04/N-05 由 v5-2 承接且门禁自紧（补上即红）。

**可关闭条件**：Feature 可关闭；v5-2 需承接 N-04（`site.unauthorized` 补 `op.authorize` chip + 翻转登记）与 N-05（`setKnownOpIds` / `assertObligationCoverage` 运行期接线）。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1 动态验证：V1~V9 / 79 子断言全绿；I-01/I-02/I-04 订正 + N-01 新发现订正；0 阻塞 / 7 遗留登记项；结论 ✅ 通过） | 2026-09-22 | SDDU Validate Agent |
