# 验证报告：specs-tree-adn-2-deterministic-fallback-and-merge（验证策略）

> **文档定位**: SDDU 验证策略 — 指导 validate Agent 执行自主验证的场景和方法；验证结果见 validate-report.md
> **前置依赖**: spec.md（v1.0）、plan.md（v1.0）、build.md（v2.0，R1+R2）、review.md（v1.0）、review-report.md（v1.0，状态 **⚠️ 有条件通过 / 0 阻塞**）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-27
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-27
> **更新说明**: 初始创建（ADN-2 末叶验证策略：自主设计 V1~V18 验证场景矩阵，覆盖 FALLBACK / MERGE / GUARD / OPEN / S0''' / SUPERSEDE / GATE / VOL 八族父 FR 切片 + NFR + EC；含冻结面 / 保护段 / 门禁守恒 / 漂移四类红线机核）

---

## 0. Feature 类型判定与维度裁剪

| 判定项 | 实测 | 结论 |
|---|---|---|
| `src/**` 代码改动 | `git diff --name-only HEAD -- packages/web-cli-plugin/src` **空**（零字节） | 本叶**无产品代码改动** |
| 改动面 | 仅 `test/**`（13 文件）+ `docs/**`（2 文件）+ `.sddu/**` | **测试 / 门禁 / 台账类 Feature**（承 build 结论，动手复核） |
| 维度裁剪 | 测试覆盖（§5.1）✅ · 构建与脚本（§5.3）✅ · 性能与边界（§5.4）✅（体积 / 性能 NFR 在册）· 漂移与孤立代码（§5.5）✅ · 接口与数据（§5.2）→ **改核为「台账 / JSON 结构化数据一致性」**（本叶无 API / 数据库；X-ADN 台账 JSON 是可机核结构化数据） | 全维度覆盖（接口面等价重映射） |

> **风险重心**：本叶为「回归与判据叶」——验收对象不是产品行为本身，而是**判据强度不降 + 冻结面不破 + 兜底 / 终端 / 合并口径的机制判据可判**。故验证矩阵对「门禁守恒 / 保护段 / 冻结面 / 断言零删除 / 漂移」加重权重。

---

## 1. 验证概要（策略）

| 维度 | 覆盖设计 | 达标门槛 |
|------|---------|:--:|
| FR 测试覆盖 | 八族父 FR 切片（FALLBACK/MERGE/GUARD/OPEN/S0'''/SUPERSEDE/GATE/VOL）逐族 ≥1 Vx | 100% |
| NFR 测试覆盖 | NFR-ADN-001~008 / 010~013 / 015~016（14 条） | ≥80% |
| 构建 | typecheck + build + e2e | 退出码 0 |
| 数据一致性（接口面等价） | X-ADN 台账终态 + 体积登记 + 门禁受审下界 | 逐值一致 |
| 漂移项 | 冻结面 / 保护段 / spec·plan / 断言零删除 | 0 项 |
| 阻塞问题 | — | 0 项 |

---

## 2. 自主验证场景（V1~V18）

> **验证对象来源**：`spec.md` §4（父 FR 切片）/ §5（NFR）/ §6（EC）；`plan.md` §4（18 项定案）/ §5（文件影响）；`build.md`（R1+R2 门禁实测）；`docs/v4-supersession-ledger.json`（X-ADN 台账）；`test/**`（13 改动文件）；`dist/**`（三冻结面 / 体积）。
> **验证方法**：`npm test`（node 主套件）+ 各专用门禁（node / Chromium）+ **ADR-003 自编独立脚本**（冻结面 / 保护段 / 台账 / 漂移）+ `git` 数值对账。

| # | 验证对象 | 验证步骤 | 预期结果 | 验证维度 | 验证方法 |
|---|---------|---------|---------|---------|---------|
| **V1** | FR-ADN-040~046 / NFR-ADN-010/011：确定性兜底 / 终端恒常驻 / floor / 零死端 / 在飞不产卡 | 1. `npm test` 跑 `ai-next-candidate.test.ts` S0''' 四支线 + 反证；2. `test:dead-end` 门禁 | 四支线 A/B/C/D 逐条可判 ∧ 反证必红 ∧ dead-end 53/0 | 测试覆盖 | node `--test` + 门禁 |
| **V2** | FR-ADN-043 / EC-ADN-007/013：未配 ⇒ 纯确定性（零网络） | 1. `npm test` 跑 AI-N-10（ai-next 纯 + recommend 零 fetch/chrome/时钟）；2. node D 支线（`op.llm-config`） | 零 fetch/chrome/时钟 ∧ D 支线落确定性 | 测试覆盖 | node `--test` |
| **V3** | FR-ADN-050/051 / EC-ADN-006：同单卡位 + 前 N ≤3 + 截断 | 1. `npm test` 跑 ADN-2 204（4 候选 ⇒ 3/1 卡）；2. `test:recommendation` ①/②/⑰ | 4 候选 ⇒ chip=3 ∧ 卡=1 ∧ 反证 4 ⇒ 必红 | 测试覆盖 + 边界 | node `--test` + Chromium |
| **V4** | FR-ADN-052：`NEXTSTEP_PRIORITY` 恰 4（AI 骑 `ref-action` 位） | 1. `npm test` 跑 recommendation-sources 恰 4；2. `test:gate-integrity` 元门禁 | 规则表恰 4 ∧ 常量零改 ∧ SHA 双锚 | 测试覆盖 | node `--test` + 门禁 |
| **V5** | FR-ADN-053 / EC-ADN-012：R6 同因去重扩展覆盖 AI | 1. `npm test` 跑 ADN-2 206 + AI-N-9 | 命中已完成 digest ⇒ 压掉 ⇒ 确定性接管 ∧ 反证必红 | 测试覆盖 | node `--test` |
| **V6** | FR-ADN-054：单卡 / 3-chip / 密度阈值 7/15·9/20·17/35 逐字 | 1. `test:density` 门禁；2. `npm test` 跑 ADN-2 215 | density 242/0 ∧ 320px 视口不越阈 | 测试覆盖 + 边界 | 门禁 + node `--test` |
| **V7** | FR-ADN-055 / R-ADN-907：替换口径双向可判 | 1. `npm test` 跑 ADN-2 205（AI 在场无陈旧 chip / 缺席照旧）；2. AI-N-9 替换语义可达；3. Chromium s0-⑲ | 双向判据齐 ∧ 反证必红 | 测试覆盖 | node `--test` + Chromium |
| **V8** | FR-ADN-056：渲染零 per-op 分支（`ACT_TO_OP`/`OP_TO_ACT` 单源） | 1. `npm test` 跑 next-dispatch-diff0（15/0） | `ACT_TO_OP` 恰 6 ∧ 单点映射 ∧ diff 0 | 测试覆盖 | node `--test` |
| **V9** | FR-ADN-060~065：六常量同过 / 提案不耗预算 / 关断两相 / 零第二阈值 / 自动按下 diff0 / 在飞仲裁四值 | 1. `npm test` 跑 ADN-2 209（PG-8/9）、214（PG-10/11）、213（OW/DT 终态）；2. turn-arbitration | 六常量各恰 1 ∧ 提案零记账 ∧ 关断两相 ∧ 四值逐字 | 测试覆盖 | node `--test` |
| **V10** | FR-ADN-070~073 / EC-ADN-013：首开保持确定性（零 LLM 往返依赖 / 让位 firstRun） | 1. `npm test` 跑 ADN-2 211 | 结构上无 AI 初始 next ∧ `'aiNext' in session === false` ∧ 零双卡 | 测试覆盖 | node `--test` |
| **V11** | FR-ADN-083/084 / AC-ADN-001：S0''' 四支线终态双面 + 人工面如实 | 1. Chromium `test:s0-self-driven`（隔离复跑 ≥2）；2. `npm test` 跑 s0-self-driven-chain + ai-next-candidate 终态 | 四支线终端恒在 ∧ Chromium 只加断言（`CHROMIUM_GATES===9`）∧ 人工面 `⏳ 未执行` | 测试覆盖 + 数据（真面读数） | Chromium + node `--test` |
| **V12** | FR-ADN-090~101：X-ADN-1~11 台账终态（未发生者 `no-supersession`） | 1. `test:supersession` 门禁；2. **ADR-003 脚本** 独立复算 `xAdnLedgerFull` 11 行状态计数 | 已发生 4 / 未发生 6 / 等价重锚 1 ∧ 老条目逐字保留 ∧ `counterCheck` 可定位 | 数据一致性 | 门禁 + 独立脚本 |
| **V13** | FR-ADN-110~117：升级 6 门禁等价重锚 + 断言零删除 + 受审下界 | 1. `test:gate-integrity` 门禁；2. `git diff --numstat` 逐文件核断言零删除 | `assertionsRemoved===0` ∧ `CHROMIUM_GATES===9` ∧ 下界 ≥48 ∧ 零纯删除文件 | 构建 / 脚本 | 门禁 + git |
| **V14** | FR-ADN-121~125 / NFR-ADN-001 / EC-ADN-016：体积终态重登记 + 越限三态 | 1. `test:size-ruling-vol3` 门禁；2. **ADR-003 脚本** 独立复算 `floor(604602×1.05)` 与余量 | A 列 604,602 B ∧ 生效上限 634,832 ∧ 距档 9,798 ∧ 三态皆否 | 性能边界 | 门禁 + 独立脚本 |
| **V15** | NFR-ADN-004/005/007/008/012/013/015/016：法八零明文 / base 零 diff / 零新载体 / pure / 串行 / 零新增网络 / 留痕 | 1. `test:law8`（65/0）；2. `test:insight`（125/0）；3. `git diff` base/manifest 零命中；4. `npm test` 跑 AI-N-8/AI-N-10 | 四面零明文 ∧ 零 diff ∧ `KIND_SET` 40 / 12 kind / `ACT_TO_OP` 6 逐字 | 测试覆盖 + 漂移 | 门禁 + git + node `--test` |
| **V16** | 冻结面 / 保护段 / 规格漂移（红线） | 1. **ADR-003 脚本** 独立复算三冻结面 sha+bytes + 保护段区间 sha + `spec.md`/`plan.md`/`src`/journey/binding 零 diff | `content.js` 177,076/`52a82620…` ∧ `pick-layer.js` 34,358/`77796bab…` ∧ 两段保护位 keep 双绿 ∧ 零漂移 | 漂移 | 独立脚本 + git |
| **V17** | EC-ADN-020：环境 flake 隔离复跑（`KL-N-10` 同族 / 性能计时） | 1. 串行隔离复跑显红门禁 ≥2 轮；2. 与 HEAD 基线 / 历史登记比对 | 复跑成员轮换 ⇒ 环境性 ∧ 非本叶回归 ∧ 如实记录不阻塞 | 性能边界 | 隔离复跑 + 比对 |
| **V18** | 构建可交付：`typecheck` + `build` + `test:e2e` | 1. `npm run typecheck`；2. `npm run build`；3. `npm run test:e2e` | 三命令退出码 0 ∧ 构建后冻结面 / 体积不变 | 构建 / 脚本 | 命令 + 独立脚本复算 |

> **质量门槛核对**：八族父 FR 切片各 ≥1 Vx（V1~V14）；验证维度 ≥1 Vx/维度（测试覆盖 V1~V11/V15、接口·数据 V11/V12、构建脚本 V13/V18、性能边界 V3/V6/V14/V17、漂移 V15/V16）；Vx 总数 18 ≥ max(FR 族数 8, 维度数 5×1)。**合格**。
> **无法验证项**：`test:ui`（journey）/ `test:binding` **不在本轮必需门禁清单**（其保护段字节完整性由 `test:supersession` 机核 + V16 独立脚本覆盖）；手工 / 可视面（M1~M5）由 build 登记为 `⏳ 未执行`，headless 不可合成 ⇒ 本策略**不代判 PASS**（V11 内如实登记）。

---

## 3. 验证脚本计划（ADR-003）

| 脚本（计划） | 用途 | 对应场景 |
|---|---|---|
| `verify-frozen-protected.mjs` | 三冻结面 sha+bytes / 保护段区间 sha+行数 / 体积公式 / `CHROMIUM_GATES` / 漂移 git 探针 | V13 / V14 / V16 / V18 |
| `verify-ledger-assertions.mjs` | X-ADN 台账 11 行状态计数与 ID 并集 / `no-supersession` 理由非空 / 断言零删除 numstat | V12 / V13 |
| 门禁日志（`npm test` / 各 `test:*`） | 原始门禁读数落盘 | V1~V15 / V17 / V18 |

> 存放路径：`/tmp/sddu-validate-specs-tree-adn-2-<timestamp>/`；日志全量落盘（禁截断）。

---

## 4. 验证标准（策略）

| 条件 | 要求 |
|------|------|
| 功能需求覆盖率 | 100%（八族父 FR 切片逐族 ≥1 Vx 通过） |
| 非功能需求覆盖率 | ≥80%（14 条 NFR） |
| 构建通过 | `typecheck` / `build` / `e2e` 退出码 0 |
| 严重漂移 | 0 项 |
| 阻塞问题 | 0 项 |

**结论类型**：✅ 通过 / ⚠️ 有条件通过 / ❌ 不通过。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（ADN-2 末叶验证策略）：字号 V1~V18 场景矩阵（八族父 FR 切片 + NFR + EC + 冻结面 / 保护段 / 门禁守恒 / 漂移红线）；Feature 类型判定为「测试 / 门禁 / 台账类，`src` 零改动」；接口面等价重映射为「台账 JSON 数据一致性」；ADR-003 脚本计划 2 个；质量门槛合格 | 2026-09-27 | SDDU Validate Agent |
