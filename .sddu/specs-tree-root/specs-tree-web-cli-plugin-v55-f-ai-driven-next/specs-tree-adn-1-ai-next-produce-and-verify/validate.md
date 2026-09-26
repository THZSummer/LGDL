# 验证策略：specs-tree-adn-1-ai-next-produce-and-verify

> **文档定位**: SDDU 验证策略 — 指导 validate Agent 执行自主验证的场景和方法；验证结果见 validate-report.md
> **前置依赖**: `spec.md`（v1.0）、`plan.md`（v1.0）、`build.md`（v1.1）、`review-report.md`（R1，状态 ✅ passed / 0 阻塞）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-26
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-26
> **更新说明**: 初始创建（自主从 spec 承载的父 FR ≈48 条切片 + NFR 16 条 + EC + 安全核心产物提取验证对象，设计 V1~V16 验证场景矩阵；Feature 类型 = 代码类，全五维度）

## 1. 验证概要（策略）

本叶为**代码类 Feature**（`src/background/ai-next.ts` NEW + 12 `src/**` MODIFY + 新 node 门禁 + Chromium 断言），故采用**全五维度**验证（测试覆盖 / 接口数据 / 构建 / 性能边界 / 漂移检测）。验证锚 = **安全核心**：把「LLM 结构化产出的下一步」变成受 **5 道校验链**约束、可注入、可判定的候选流，且不破坏确定性路径。

**验证对象来源**：
- `spec.md` §4 FR（父 FR ≈48 条切片：GOV/CHAN/VERIFY/TIER/S0'''/SUPERSEDE/GATE/VOL）、§5 NFR（16 条）、§6 EC（10 条）、§7 AC 锚点
- `build.md` 文件变更清单（R1 18 + R2 18）；`plan.md` §4 14 项设计定案
- 生产产物：`src/background/ai-next.ts`、`src/ui/sidepanel/next-registry/**`、`dist/`、`test/ai-next-candidate.test.ts`、`test/ui/fixtures/s0-chain.mjs`

**Feature 类型自适应**：代码类 ⇒ 全维度；模板/配置/文档维度不适用。

## 2. 自主验证场景（V1~V16）

| # | 验证对象 | 验证步骤 | 预期结果 | 验证维度 | 验证方法 |
|---|---------|---------|---------|:--:|:--:|
| **V1** | FR-ADN-020~026 / EC-ADN-001~005：5 道校验链逐类拦截 | 独立脚本对五类注入（gesture / 幻觉 op / 越界 ref / 越界 param / label 凭据）逐一调 `admitCandidate`；读 `driverBlockedLine` | 逐类 `blocked=<code>`；留痕可读零值 | 测试覆盖 | 自写 `v1-five-chain.mjs` |
| **V2** | FR-ADN-027 / AC-ADN-004：拒绝码闭集恰 5 + 顺序即优先级 | 脚本断言 `AI_NEXT_BLOCKED_CODES` 逐字闭集；注入「未知 op+越界 ref」「gesture+越界 ref」验证只报首因 | 闭集恰 5 枚；顺序不可交换 | 测试覆盖 | 自写 `v1-five-chain.mjs` |
| **V3** | FR-ADN-030~035 / AC-ADN-005 / NFR-ADN-014：判定分层 | 脚本断言 `confirm`：`admit=true ∧ pressDecision=blocked:tier`；`gesture`：接受层即拒；`auto`：可按下 | 接受 ≠ 按下；`pressDecision` 语义 diff=0 | 测试覆盖 | 自写 `v1-five-chain.mjs` + `git diff ai-drive.ts` |
| **V4** | FR-ADN-012/018 / EC-ADN-008：解析纪律与向后兼容 | 脚本注入无块 / 顶层非数组 / 非法 JSON / 非对象项；断言 `validateAiNext` 零候选且 `blocked` 为空 | 未产出（C）≠ 被拦（B）；缺席逐字 | 测试覆盖 | 自写 `v1-five-chain.mjs` |
| **V5** | FR-ADN-011 / NFR-ADN-007 / EC-ADN-017：载体纪律 | 独立 source-text 抽核 `KIND_SET` 40 / 12 kind / 零宿主 / `ACT_TO_OP` 6；注入第 41 kind / 第 13 kind / 新宿主 / 第 7 行 ACT | 真源全绿；四类注入各必红 | 漂移检测 | 自写 `v2-carrier.mjs` |
| **V6** | FR-ADN-013/014/096 / AC-ADN-010：声明表与 provider | 脚本读 `DRIVER_DECLS_SRC`（12）与 `builtinProviders()`（12）双向包含；`ai-next` 骑 `ref-action` + `chipsFor` | 12↔12；`evidence=session.aiNext`；`NEXTSTEP_PRIORITY` 恰 4 | 测试覆盖 | 自写 `v2-carrier.mjs` |
| **V7** | FR-ADN-080/081/082/085 / EC-ADN-008/014 / NFR-ADN-011：S0''' 四支线 node 面 | 独立脚本用**生产模块**驱动 A/B/C/D 四支线读数，跑共享判据 `s0pppProblems`；含 pending（openAsks>0）不产卡 | 十必判项全绿；反证非恒真 | 测试覆盖 | 自写 `v3-s0ppp.mjs` |
| **V8** | AC-ADN-001/013：S0''' 四支线真面板面 | 跑仓库 Chromium 门禁 `test:s0-self-driven`（S0C-13 A/B/C/D） | 四支线真面板读数；共享判据非恒真 | 测试覆盖 | `npm run test:s0-self-driven` |
| **V9** | FR-ADN-017 / NFR-ADN-008/015 / FR-CHAT-060：零新 LLM + 无引用基座逐字 | 脚本正则抽核 `ai-next.ts` / `recommend.ts` 纯度；`refContextSegment(undefined/[])===''` | 零 fetch/chrome/时钟；基座逐字 | 测试覆盖 + 漂移 | 自写 `v1-five-chain.mjs` |
| **V10** | FR-ADN-110~115 / NFR-ADN-012 / AC-ADN-022：门禁全量 + 只增 | `npm test`（基线 1478）+ ADN 相关子门禁逐个独立复跑（ai-next-candidate / gate-integrity / op-three-tier / …） | 1478/0；子门禁全绿；下界只增 | 构建 | npm test + `node --test` |
| **V11** | NFR-ADN-012：构建与类型检查 | `npm run build` + `npm run typecheck` | 退出码 0；产物齐备 | 构建 | npm scripts |
| **V12** | NFR-ADN-001 / FR-ADN-120~125 / EC-ADN-016：体积五要素 + 越叶预算诚实 | 脚本读真实 `dist/sidepanel.js` 字节 + `size-baseline` 登记；复算 `adn1Rows` Σ 与公式 | 603,205 / 633,365 生效 / 614,400 档 / 675,840 绝对 / pending-author-line；Σ=+4,279；越预算如实 | 性能边界 | 自写 `v4-volume.mjs` |
| **V13** | NFR-ADN-005：三冻结面 + base 零 diff + 9 zeroDiffFiles + journey·binding 保段 | `git diff 99839d5..HEAD` 逐路径机核；`dist` 冻结面重建 sha 比对；`supersession` 保段 | 全 0 diff；content/pick sha 不变；保段双绿 | 漂移检测 | git + npm test(supersession) |
| **V14** | NFR-ADN-004/016 / EC-ADN-014：法八零明文 | 跑 `test:law8`（含 ⑪ AI 候选 label / 留痕零明文面） | 64/0，零降级 | 测试覆盖 | `npm run test:law8` |
| **V15** | 漂移检测：孤立代码 / 需求缺失 / 规格漂移 | 扫描新增 `src` 文件引用面；对照 spec FR 清单；`git log spec.md` | 无孤立 / 无缺失 / spec 未改 | 漂移检测 | git + 脚本 |
| **V16** | review I-1/I-2/I-3 处置 | I-1 复跑 Chromium A 分支；I-2 注释订正（doc-only）+ 复跑门禁；I-3 登记 N | 处置口径可追溯 | 漂移检测 | 复跑 + `git diff` |

> **质量门槛（数量基线法）**：承载父 FR ≈48 条切片全部落入 V1~V15；NFR 16 条全部覆盖；五维度各有 ≥1 条 Vx。Vx 总数 16 = max(FR 组数, 维度数×1) 之上。

## 3. 测试覆盖策略

- **FR**：以「FR 组 → Vx」映射保证 100%（安全链 5 道、判定分层、载体、声明表、S0'''、门禁、体积各有专属 Vx）。
- **NFR**：16 条逐条落 Vx（NFR-ADN-010 的**终态断言**属叶2，本叶只保证不回退 ⇒ 标注「本叶不承载终态 / 已核不回退」）。
- 覆盖率以**行为级门禁通过**为准（本仓库无行覆盖率上报机制 ⇒ 覆盖率列以「已覆盖/未覆盖」判定，非百分比）。

## 4. 接口与数据验证策略

本 Feature **无外部 API / 无数据库**（零新依赖、零新权限、零新 LLM 往返）。「接口」= 生产模块的纯函数契约与 `chat-result` 载荷加法字段：
- `admitCandidate` / `validateAiNext` / `parseAiNextItems` / `pressDecision` / `driverBlockedLine` 的输入 → 输出逐例比对（V1~V4）；
- `chat-result{aiNext?}` 载荷加法字段：缺席 ⇒ 现状逐字（V4）；在场 ⇒ 面板只消费 `accepted`（V7/V8）。

## 5. 构建与脚本验证策略

- `npm run build`（dist 重建、五要素同源）；
- `npm run typecheck`；
- `npm test`（基线 1478，只增不减）；
- ADN 相关子门禁逐个独立复跑（避免聚合掩盖）。

## 6. 性能与边界验证策略

- **性能**：本 Feature 无运行时性能 NFR（NFR-ADN-001 是**体积**指标）⇒ 性能维度以**体积边界**承载：五要素 + 三值（档位 / 绝对上限 / 生效上限）+ 越叶预算诚实性 + EC-ADN-016 二态。
- **边界（EC）**：EC-ADN-001~005（注入越界）、008（未配置零产出）、009（在飞不产卡）、014（零明文）、016（体积）、017（载体注入）、018（AI 代答）、020（KL-N-10 flake 如实记录）。

## 7. 漂移检测策略

- **孤立代码**：新增 `src/**`（`ai-next.ts` 等）必须被生产路径 / 门禁引用 ⇒ 无孤立；
- **需求缺失**：spec §4 父 FR 切片逐组对照产物；
- **规格漂移**：`git log -- spec.md` 验证 build 期间 spec 未被修改；
- **载体 / 计数漂移**：`KIND_SET` 40 / 12 kind / 零宿主 / `ACT_TO_OP` 6 / `NEXTSTEP_PRIORITY` 4 / `DRIVER_DECLS_SRC` 12。

## 8. 结论判定策略

- ✅ 通过：FR 100% + NFR ≥80% + 构建 0 + 严重漂移 0 + 阻塞 0；
- ⚠️ 有条件通过：存在非阻塞偏差（如既有环境 flake / deferred 改进项）；
- ❌ 不通过：未覆盖 FR / 构建失败 / 严重漂移。

## 9. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V1~V16 验证场景矩阵；代码类 Feature 全五维度；安全核心为主锚） | 2026-09-26 | SDDU Validate Agent |
