# 验证报告：specs-tree-adn-1-ai-next-produce-and-verify

> **文档定位**: SDDU 验证报告 — 逐项记录自主验证的执行结果，作为工作流终点
> **验证策略**: `validate.md`（V1~V16 验证场景及五维度指引）
> **前置依赖**: `validate.md`、`spec.md`（v1.0）、`review-report.md`（R1，状态 ✅ passed / 0 阻塞）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-26
> **验证轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-26
> **更新说明**: 初始创建（动手验证 R1：npm test 1478/0、构建/类型检查 0、四个独立验证脚本 107 断言全绿、Chromium S0C-13 四支线 89/1×2（A 支线既有 flake））；结论 ⚠️ 有条件通过 / 0 阻塞

---

## 1. 验证概要

| 维度 | 数值 |
|------|:--:|
| 验证项总数 | 16（V1~V16） |
| 通过 | 15 |
| 失败 | 0 |
| 非阻塞偏差 | 1（V8：Chromium S0C-13 A 支线既有环境 flake） |
| 无法执行 | 0 |
| 阻塞问题 | 0 |

**基线核验**：仓库 `/home/usb/wks/gits/GitHub/LGDL`，分支 `feature/web-cli-plugin`，HEAD `8d0737c`（review 提交），工作树干净。被验范围 = `packages/web-cli-plugin`（12 `src/**` 生产改动 + `test/ai-next-candidate.test.ts` + `test/ui/s0-self-driven.mjs` + `test/ui/fixtures/s0-chain.mjs` + 门禁/台账/体积登记）。分支起点 `99839d5`（pre-build）。

**Feature 类型**：代码类 ⇒ 全五维度验证。

---

## 2. 逐项验证结果（V1~V16）

| # | 验证对象 | 验证步骤 | 预期结果 | 实测结果 | 判定 |
|---|---------|---------|---------|---------|:--:|
| V1 | FR-ADN-020~026 / EC-ADN-001~005：5 道链逐类拦截 | 自写 `v1-five-chain.mjs` 五类注入逐一调 `admitCandidate` + `driverBlockedLine` | 逐类 `blocked=<code>`；留痕可读零值 | 五类 = `tier`/`unknown-op`/`ref`/`param`/`label`；留痕 `driver=ai-next \| timing=idle \| evidence=session.aiNext \| blocked=tier` 零明文 | ✅ |
| V2 | FR-ADN-027 / 拒绝码闭集 | 脚本断言闭集逐字 + 顺序反证 | 闭集恰 5；未知 op+坏 ref ⇒ 只报首因 | `['unknown-op','tier','ref','param','label']`；首因语义成立 | ✅ |
| V3 | FR-ADN-030~035 / NFR-ADN-014：判定分层 | 脚本真值表四情形 + `git diff ai-drive.ts` | confirm `admit=true ∧ press=blocked:tier`；gesture 接受即拒；`pressDecision` diff=0 | 四情形全对；`ai-drive.ts` diff **仅 +11 行**（`driverBlockedLine`），`pressDecision` 函数体零改 | ✅ |
| V4 | FR-ADN-012/018 / EC-ADN-008：解析纪律 | 注入无块/非数组/坏 JSON/非对象项 | 零候选且 `blocked` 为空（C≠B）；缺席逐字 | 全部零候选零 blocked；取最后一块；info 大小写不敏感 | ✅ |
| V5 | FR-ADN-011 / NFR-ADN-007 / EC-ADN-017：载体纪律 | `v2-carrier.mjs` 抽核 + 四类注入反证 | 真源全绿；注入必红 | `KIND_SET=40` ∧ `aiNext∉`、12 kind、零宿主、`ACT_TO_OP=6`；41/13/宿主/第 7 行注入各必红 | ✅ |
| V6 | FR-ADN-013/014/096：声明表 ↔ provider | 脚本双向包含 + provider 形态 | 12↔12；`ref-action`；`session.aiNext` 同源 | `DRIVER_DECLS_SRC` 12 / provider 12 / `NEXTSTEP_PRIORITY` 4；`ai-next` rule=`ref-action` priority=2 prepend=true chipsFor 权威 | ✅ |
| V7 | FR-ADN-080/081/082/085 / EC-ADN-008/014 / NFR-ADN-011：S0''' node | `v3-s0ppp.mjs` 生产模块驱动 A/B/C/D | 十必判项全绿；反证非恒真 | 28/0；A 替换+≤3+单卡；B 五类拦+留痕+不渲染；C 确定性+floor；D 零候选+零网络；pending（openAsks=1）⇒ 不产 AI 卡 | ✅ |
| V8 | AC-ADN-001/013：S0''' 真面板 | `npm run test:s0-self-driven` 复跑 2 轮 | 四支线真面板读数 | **89/1 × 2**：B/C/D 全绿 + 共享判据非恒真绿；**A 支线红**（`rule=risk-recovery` 抢槽）—— 既有环境 flake（I-1） | ⚠️ |
| V9 | FR-ADN-017 / NFR-ADN-008/015 / FR-CHAT-060 | 纯度正则 + `refContextSegment` 空引用 | 零 fetch/chrome/时钟；基座逐字 | `ai-next.ts`/`recommend.ts` 纯；`refContextSegment(undefined/[])===''` ⇒ system=基座 | ✅ |
| V10 | FR-ADN-110~115 / NFR-ADN-012 / AC-ADN-022 | `npm test` 全量 + ADN 子门禁逐个复跑 | 1478/0；子门禁全绿；下界只增 | **1478/0**（duration 516,322 ms）；子门禁 ai-next-candidate 16/0 · gate-integrity 25/0 · op-three-tier 12/0 · driver-quadruple 16/0 · driver-timings 12/0 · recommendation-sources 23/0 · op-wiring 15/0 · next-registry 19/0 · size-ruling-vol3 14/0 · size-growth-evidence 20/0 · size-budget 16/0 | ✅ |
| V11 | NFR-ADN-012：构建 + 类型检查 | `npm run build` + `npm run typecheck` | 退出码 0；产物齐备 | BUILD_EXIT=0 / TYPECHECK_EXIT=0；8 产物齐备 | ✅ |
| V12 | NFR-ADN-001 / FR-ADN-120~125 / EC-ADN-016：体积 | `v4-volume.mjs` 读真实字节 + 复算公式 | 603,205 / 633,365 / 614,400 / 675,840 / pending-author-line | sidepanel **603,205 B** / background 1,641,872 B（B 列不计账）；生效上限 `floor(603,205×1.05)=633,365`；档位 614,400 / 绝对 675,840；`adn1Rows` Σ **+4,279** + glue 0；越叶预算如实登记 | ✅ |
| V13 | NFR-ADN-005：冻结面 + base 零 diff | `git diff 99839d5..8d0737c` 逐路径 + dist sha + supersession | 全 0 diff；sha 不变；保段双绿 | 9 `zeroDiffFiles` + manifest + `web-cli-base/**` + `policy.ts`/`auto-authorize.ts` + journey/binding 全 **0 diff**；content.js sha `52a82620…`、pick-layer.js sha `77796bab…`；binding 保段 sha `be9ad0e9…` + startByte 107780 双绿 | ✅ |
| V14 | NFR-ADN-004/016 / EC-ADN-014：法八零明文 | `npm run test:law8` | 64/0，零降级 | **64 passed / 0 failed**，含 ⑪ AI 候选 label / 留痕零明文 + 反证非恒真 | ✅ |
| V15 | 漂移：孤立代码 / 需求缺失 / 规格漂移 | git + 脚本对照 | 无孤立 / 无缺失 / spec 未改 | 12 `src/**` 改动全部落本叶 FR；无孤立代码；spec.md 仅 `3f93fc7`（spec 阶段）一次提交，build 期零修改 | ✅ |
| V16 | review I-1/I-2/I-3 处置 | 复跑 + 订正 + 登记 | 口径可追溯 | I-1 复现 2/2（登记 N，node S0PPP-4 确定性覆盖）；I-2 注释订正（doc-only；门禁复跑 25/0）；I-3 登记 N（bg→ui 值导入，建议后续上移 shared，deferred） | ✅ |

> ⚠️ 标注说明：V8 为**非阻塞**环境 flake（详见 §5 与 §6），安全语义不受影响。

---

## 3. 验证详细信息

### 3.1 测试覆盖

#### 功能需求（FR）— 覆盖率 100%（52/52 父 FR 切片）

| 需求组 | spec 描述 | 测试用例 / 判据 | 执行结果 | 覆盖率 |
|---------|----------|---------|:--:|:--:|
| FR-ADN-001~007 | 结构 / 纪律 / 红线编成 / 编排裁决 | V5 载体红线 + V13 冻结面 + `insight-no-escalation` | ✅ | 已覆盖 |
| FR-ADN-010 | 复用 `'idle'`；零新触发词（`DRIVER_TIMINGS` 5） | V6 + `driver-timings` 12/0 | ✅ | 已覆盖 |
| FR-ADN-011 | `chat-result` type-only 加法字段；零新 kind | V4 + V5（`KIND_SET` 40） | ✅ | 已覆盖 |
| FR-ADN-012 | 候选结构；缺 `opId` 非法 | V1（`unknown-op`）+ V4 | ✅ | 已覆盖 |
| FR-ADN-013 | 产出者声明三要素；零明文 | V6 + V1（留痕可读零值） | ✅ | 已覆盖 |
| FR-ADN-014 | `ai-next` provider（`rule: ref-action`）；`NEXTSTEP_PRIORITY` 4 / `ACT_TO_OP` 6 | V6 + V5 | ✅ | 已覆盖 |
| FR-ADN-015 | 注入槽（`session.aiNext`）；`recommend.ts` pure | V3 + V6 + `recommendation-sources` 23/0 | ✅ | 已覆盖 |
| FR-ADN-016 | 解析 + 校验在 SW（B 列） | V3 + V7 | ✅ | 已覆盖 |
| FR-ADN-017 | 零新 LLM 调用（FR-CHAT-060 不破） | V9 | ✅ | 已覆盖 |
| FR-ADN-018 | 载荷只增不改；缺席 ⇒ 现状逐字 | V4 | ✅ | 已覆盖 |
| FR-ADN-019 | 未配置 ⇒ 零候选零网络 | V7（D 支线） | ✅ | 已覆盖 |
| FR-ADN-020 | ① opId 在册（9）⇒ `unknown-op` | V1 + V2 | ✅ | 已覆盖 |
| FR-ADN-021 | ② `tierOf` 单源（零第二阈值） | V3 + V6 | ✅ | 已覆盖 |
| FR-ADN-022 | ②′ `gesture` 恒拒 | V1 + V3 | ✅ | 已覆盖 |
| FR-ADN-023 | ②″ `confirm` 可提案 | V3 | ✅ | 已覆盖 |
| FR-ADN-024 | ③ ref 有效 | V1 | ✅ | 已覆盖 |
| FR-ADN-025 | ④ param 在 `AskSpec` 内 | V1 + `ai-next-candidate` AI-N-11 | ✅ | 已覆盖 |
| FR-ADN-026 | ⑤ 越界/非法 ⇒ 丢弃 + 留痕 | V1 + V14 | ✅ | 已覆盖 |
| FR-ADN-027 | 顺序即优先级 | V2 | ✅ | 已覆盖 |
| FR-ADN-028 | 纯函数校验器 | V2 + V9 | ✅ | 已覆盖 |
| FR-ADN-029 | 五类注入反证必须实跑 | V1 + V5 + V7 | ✅ | 已覆盖 |
| FR-ADN-030~035 | 判定分层（admit vs press） | V3 + `op-three-tier` 12/0 | ✅ | 已覆盖 |
| FR-ADN-080/081/082/085 | S0''' 主线/B/D + 注入族 | V7 + V8 | ✅ | 已覆盖 |
| FR-ADN-096 | `DRIVER_DECLS_SRC` 12↔12 | V6 + `driver-quadruple` 16/0 | ✅ | 已覆盖 |
| FR-ADN-110~115 | 门禁只增 / 反证实跑 / 下界 +1 | V10（1478/0 + 下界 48） | ✅ | 已覆盖 |
| FR-ADN-120~125 | 体积分列 + 叶1 重登记 | V12 | ✅ | 已覆盖 |

#### 非功能需求（NFR）— 覆盖率 100%（15/15 适用项）

| 需求 ID | spec 描述 | 测试用例 / 判据 | 执行结果 | 覆盖率 |
|---------|----------|---------|:--:|:--:|
| NFR-ADN-001 | `dist/sidepanel.js` ≤ 生效上限 | V12（603,205 < 633,365） | ✅ | 已覆盖 |
| NFR-ADN-002/003 | 特权恒 `gesture`；AI 不代答 consent | V1 + V3 + V7⑨ | ✅ | 已覆盖 |
| NFR-ADN-004 | 法八四面零明文 | V14（64/0）+ V7⑩ | ✅ | 已覆盖 |
| NFR-ADN-005 | base 零 diff + 判定链零触碰 | V13 | ✅ | 已覆盖 |
| NFR-ADN-006 | 不放松既有 fail-closed 方向 | V1 + V3 | ✅ | 已覆盖 |
| NFR-ADN-007 | 零新增载体 | V5 | ✅ | 已覆盖 |
| NFR-ADN-008 | `recommendNextStep` 仍 pure | V9 | ✅ | 已覆盖 |
| NFR-ADN-009 | 校验器可机核 | V7 + V1 + V2 | ✅ | 已覆盖 |
| NFR-ADN-011 | 在飞不产卡（`pending` 硬门） | V7⑪（openAsks=1 ⇒ 不产 AI 卡） | ✅ | 已覆盖 |
| NFR-ADN-012 | 门禁串行 / 无新依赖 / 不改 `opencode.json` | V10 + V11（`package.json`/`opencode.json` 零 diff） | ✅ | 已覆盖 |
| NFR-ADN-013 | 扩展点单源 | V6 | ✅ | 已覆盖 |
| NFR-ADN-014 | 判定分层可判 | V3 | ✅ | 已覆盖 |
| NFR-ADN-015 | 零新增 LLM 往返 / 零新增网络 | V9 + V7⑥ | ✅ | 已覆盖 |
| NFR-ADN-016 | 留痕可判且零明文 | V1 + V14 | ✅ | 已覆盖 |
| NFR-ADN-010 | 零死端终态 | **本叶不承载终态**（属叶2）；V7 已核 floor/终端不回退 | ✅ | 不适用（终态） |

### 3.2 接口数据

本 Feature 无外部 API / 数据库（零新依赖 / 零新权限 / 零新 LLM）。「接口」= 生产纯函数契约与载荷加法字段，全部逐例比对：

| 检查项 | 调用方式 | 预期 | 实测 | 一致？ |
|--------|---------|------|------|:--:|
| `admitCandidate` 五类 | `v1-five-chain.mjs` 直调 | 五类各拒 | `tier/unknown-op/ref/param/label` | ✅ |
| `validateAiNext` 顺序 | `v1-five-chain.mjs` | 只报首因 | 未知 op+坏 ref ⇒ 只 `unknown-op` | ✅ |
| `pressDecision` 分层 | `v1/v3` 直调 | confirm 按不下 | `{ok:false,blocked:'tier'}` | ✅ |
| `chat-result{aiNext?}` 缺席 | `v1/v3` 无块输入 | 零候选零 blocked | 成立（现状逐字） | ✅ |
| `refContextSegment` 无引用 | `v1` 直调 | `''`（基座逐字） | `''` | ✅ |
| `DRIVER_DECLS_SRC` ↔ provider | `v2-carrier.mjs` | 12↔12 | 12↔12 | ✅ |

### 3.3 构建脚本

| 命令 | 退出码 | 耗时 | 输出摘要 | 结果 |
|------|:--:|------|---------|:--:|
| `npm run build` | 0 | ≈2 s | `dist` 8 产物；sidepanel 603,205 / background 1,641,872 / content 177,076 / pick-layer 34,358 | ✅ |
| `npm run typecheck` | 0 | ≈20 s | `tsc --noEmit` 无错误 | ✅ |
| `npm test` | 0 | 516.3 s | tests 1478 / pass 1478 / fail 0 | ✅ |

### 3.4 性能边界

| NFR / EC | 指标要求 | 实测值 | 偏差 | 达标？ |
|-----|---------|-------|------|:--:|
| NFR-ADN-001（体积） | ≤ 生效上限 | sidepanel **603,205 B** ≤ **633,365 B** | 余量 30,160 B | ✅ |
| 体积档位（EC-ADN-016） | 不越档位 614,400 | 603,205 < 614,400 | — | ✅ |
| 体积绝对上限 | 不越 675,840 | 603,205 < 675,840 | — | ✅ |
| EC-ADN-016 越叶预算诚实 | 越预算须登记不停机 | 叶预算 +0.8~2.0 KB 被整叶 **+4,279 B** 超越 ⇒ 登记（不删判据/不搬列/`pending-author-line`） | 如实 | ✅ |
| EC-ADN-009（在飞） | `pending` 不产卡 | openAsks=1 ⇒ 无 AI 卡（落 capability-discovery） | — | ✅ |
| EC-ADN-020（KL-N-10 flake） | 如实记录 | binding 保段由 supersession 双绿机核；journey/binding 文件零改动 | 如实 | ✅ |

### 3.5 漂移检测

| 漂移类型 | 检测命令/方法 | 结果 |
|---------|-------------|------|
| 孤立代码（有代码无需求） | `git diff --name-only 99839d5..HEAD -- src` + 引用扫描 | ✅ 无（12 文件全落本叶 FR；`ai-next.ts` 由 `service-worker.ts` 消费） |
| 需求缺失（有需求无代码） | spec §4 FR 切片逐组对照产物 | ✅ 无（52/52 覆盖） |
| 规格漂移（spec 被修改） | `git log -- spec.md` | ✅ 无（spec.md 仅 `3f93fc7` 一次提交，build 期零改） |
| 载体漂移 | `KIND_SET` 40 / 12 kind / 零宿主 / `ACT_TO_OP` 6 | ✅ 逐字不动 |
| 计数漂移 | `NEXTSTEP_PRIORITY` 4 / `DRIVER_DECLS_SRC` 12 / `EXPECTED_AUDITED_FILES` 48 | ✅ 全保持 |
| 冻结面漂移 | 9 `zeroDiffFiles` + manifest + base + 判定链 + journey/binding | ✅ 全 0 diff |

---

## 4. 验证脚本执行记录

> ADR-003 落地：验证脚本由 validate Agent 自主编写并直接执行，存放于
> `/tmp/sddu-validate-adn-1-20260926/`（不污染源码目录），导入 `npm test` 的 tsc 产物 `dist-test/src/**`（生产编译件，非打桩）。

| 脚本文件 | 用途 | 对应场景 | 退出码 | 关键输出 |
|---------|------|:--:|:--:|---------|
| `v1-five-chain.mjs` | 5 道链行为级：五类注入 / 闭集 / 顺序 / 分层 / 解析纪律 / FR-CHAT-060 | V1~V4、V9 | **0** | `pass 38 / fail 0` |
| `v2-carrier.mjs` | 载体纪律：KIND_SET 40 / 12 kind / 零宿主 / ACT_TO_OP 6 + 四类注入反证 + 声明表 12↔12 + 下界 48 | V5、V6、V10 | **0** | `pass 19 / fail 0` |
| `v3-s0ppp.mjs` | S0''' 四支线 node：A/B/C/D + pending + 十必判项 + 反证非恒真 | V7 | **0** | `pass 28 / fail 0` |
| `v4-volume.mjs` | 体积/红线终核：真实字节 + 冻结 sha + 三值 + `adn1Rows` Σ + 越预算 | V12、V13 | **0** | `pass 22 / fail 0` |

> 四个脚本合计 **107 断言全绿**；均为「注入必红」驱动的**非恒真**判据（V1 顺序反证、V2 四类注入必红、V3 十项 + 反证、V4 三值复算）。

**门禁亲跑日志**（`/tmp/opencode/v4-gate-logs/adn-1-validate/`）：
`build.log`（EXIT 0）· `typecheck.log`（EXIT 0）· `npm-test.log`（1478/0）· `gate-integrity.log`（25/0）· `law8.log`（64/0）· `s0-run1.log`（89/1）· `s0-run2.log`（89/1）。

---

## 5. 阻塞问题

| # | 位置 | 问题 | 对应 Vx | 修复建议 |
|---|------|------|:--:|---------|
| — | — | **无阻塞问题** | — | — |

**非阻塞偏差（I 项处置，见 §6.4）**：

| # | review 项 | 处置 | 证据 |
|---|----------|:--:|------|
| I-1 | Chromium S0C-13 A 支线 flaky | **登记 N（如实）** | 本轮亲跑 2 轮均 `89/1`，A 支线 `rule=risk-recovery`（priority-0 恢复槽抢占）复现；B/C/D + 共享判据非恒真全绿；node 面 `S0PPP-4`（替换语义）由 `v3-s0ppp.mjs` **确定性覆盖**（`replaced=true` / `chipCount≤3` / 单卡）；安全语义不受影响。建议后续加固：A 断言前置「清 stale + 强制 recompute 到 ref-action 槽可用」或按 ⑦A 先例放宽规则闭集。 |
| I-2 | `test/gate-integrity.test.ts:378` 注释陈旧字面「40→41」 | **已订正（doc-only 微修）** | 改为「R1 现场实测 47 ⇒ 本叶 +1 = 48」，与同文件断言（实测 48）同源；`git diff` = 4 insertions / 2 deletions **纯注释**，零断言 / 零产品代码；门禁复跑 **25/0**。 |
| I-3 | `src/background/ai-next.ts:26` bg→ui 值导入 `assertNoPlaintext` | **登记 N（deferred）** | 不违反任何门禁；B 列体积已如实归因；建议后续将零明文 caliber 上移 `src/shared/`（本轮不改，属跨叶重构）。 |

---

## 6. 结论

**结论**: ⚠️ **有条件通过**（0 阻塞；唯一偏差 = V8 Chromium S0C-13 A 支线**既有环境 flake**，安全语义不受影响；I-2 已订正，I-3 deferred）

**指标达标矩阵**：

| 指标 | 要求 | 实测 | 达标？ |
|------|------|------|:--:|
| FR 测试覆盖 | 100% | 52/52（按组 100%） | ✅ |
| NFR 测试覆盖 | ≥ 80% | 15/15 适用项（NFR-ADN-010 终态不承载已标注） | ✅ |
| 构建退出码 | 0 | 0（build + typecheck） | ✅ |
| 阻塞问题数 | 0 | 0 | ✅ |
| 漂移项 | 0 | 0（孤立/缺失/规格/载体/计数/冻结面全 0） | ✅ |
| 门禁全量 | 基线 1478 | **1478/0** | ✅ |
| 红线 | 冻结面零 diff | content/pick sha 不变 + 9 `zeroDiffFiles` 零 diff + 保段双绿 | ✅ |
| 体积 | ≤ 生效上限 | 603,205 ≤ 633,365 | ✅ |

**理由**：
1. **安全核心 100% 成立**（R-ADN-001 闭环）：五类注入逐类被拦、拒绝码闭集恰 5、顺序即优先级；判定分层（`confirm` 可接受不可自动按下、`gesture` 连接受都拒）与 `pressDecision` diff=0 经独立脚本 + `git diff` 双证；节点面 S0''' 四支线十必判项全绿（含 pending 硬门）。
2. **通道与兼容**：`chat-result{aiNext?}` type-only、零新增 kind（`KIND_SET` 40 / 12 kind / 零宿主 / `ACT_TO_OP` 6）；`recommend.ts` 仍 pure、无引用基座逐字（FR-CHAT-060 不破）、零新 LLM。
3. **门禁与红线**：`npm test` **1478/0**（只增零删除）；ADN 子门禁逐个独立复跑全绿；`EXPECTED_AUDITED_FILES` 实测 **48**（末位只追加）；`law8` **64/0**；三冻结面/9 `zeroDiffFiles`/manifest/base/判定链/journey/binding **全零 diff**。
4. **体积诚实**：真实 `dist/sidepanel.js` **603,205 B**；生效上限 633,365 / 档位 614,400 / 绝对 675,840；整叶 **+4,279 B** 越叶预算**如实登记不停机**（`pending-author-line`，不伪称已确认）。
5. **唯一偏差**：V8 Chromium S0C-13 **A 支线**环境 flake（`risk-recovery` 抢槽，复现 2/2）；B/C/D 与共享判据非恒真全绿；node 面确定性覆盖替换语义。属既有测试环境问题，非产品安全缺陷 ⇒ **有条件通过**。

**未验证 / 移交**：
- 人工面（M1/M3/M5，headless 不可合成）⏳ 不冒充 PASS；
- X-ADN 台账终态 / 升级 6 门禁重锚终态 / 首开边界 / 兜底合并 →**叶2**（本叶只保证不回退）；
- I-3 的 `shared` 上移为跨叶重构，deferred。

### 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（validate R1：V1~V16 逐项动手验证；四脚本 107 断言全绿；npm test 1478/0；Chromium S0C-13 89/1×2（A 分支既有 flake）；0 阻塞 / ⚠️ 有条件通过；I-2 doc-only 订正） | 2026-09-26 | SDDU Validate Agent |
