# 技术计划：specs-tree-v55f-2-batch-consent（V5.5F-2 任务级批量授权）

> **文档定位**: SDDU 技术方案（**叶级切片 / 末叶**）— 父 `../plan.md`（v1.0）与本目录 `../ADR-SGO-004~008-*.md` 在**本叶**的适用范围与承载条文；作为本叶 tasks 阶段的输入
> **前置依赖**: **叶1** `../specs-tree-v55f-1-ref-context-and-anchor/`（**硬依赖**：范围读数 + 锚定解析；须 `validated`）+ 父 `../spec.md`（v1.0）+ `../discovery.md`（v1.0）+ 本目录 `spec.md`（v1.0）+ v5.5 三叶 `validated`（`tierOf` / op 三档 / `auth` 6 终态 / 12 kind / 零宿主）
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-24
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-24
> **更新说明**: 初始创建（V5.5F-2 批量授权叶 plan：写入计划（系统聚合）+ 计划指纹 + 一次用户手势 + 计划外逐条回落 + 逐条审计零明文 + 中途可中止 + 特权 op 恒不入批 + 批量变体注入必红 + WIDEN 二择）

---

## 1. 前置检查

| 检查项 | 状态 | 证据 |
|--------|:--:|------|
| 本叶 `spec.md` 存在 | ✅ | `spec.md`（251 行，v1.0，2026-09-23，`phase=specified`） |
| 父 `spec.md` / `plan.md` | ✅ | `../spec.md`（931 行）+ `../plan.md`（v1.0，本批同产） |
| **叶1 硬依赖** | ⚠️ **须 `validated`** | 范围读数（`in-scope` / `out-of-scope-*`）与锚定解析（`[data-wcli-ref="ref_n"]`）是「计划内 / 计划外」的唯一判据；叶1 未落地 ⇒ 本叶不得启动（**串行**） |
| 上游依赖已满足 | ✅ | `test/supersession-ledger.test.ts`（RL-06）+ `test/op-three-tier.test.ts`（OT-⑩）现判据（须**扩**批量变体，非替换）；`cards/auth.ts` 静态三段模板先例 |
| 承载父 FR 切片 | ✅ | **≈21 条**（BATCH 040~050 / WIDEN 060~063 / TRACE 081·082 / S0′ 093 / SUPERSEDE 103·105·107） |
| 分支 / HEAD | ✅ | `feature/web-cli-plugin` / `bb82bc6` 之上（叶1 落地后的 HEAD） |
| 写入范围 | ✅ | 仅 SDDU 本 Feature 目录（本叶 `plan.md`）；**零产品代码改动** |

## 2. 本叶架构分析

### 2.1 本叶要交付的三条主链

```
① 边界先行：RL-06 / OT-⑩ 扩批量变体注入必红 + 特权 op 不入批机核（先把「不许」钉死）
② 计划与指纹：runChat 捕获单条 assistant 消息的 toolCalls → batch-plan.buildPlan（in-scope set-text）
   → 指纹（逐字节入哈希）→ 一次真实手势（既有 auth 卡）→ 计划内准入 / 计划外逐条回落
③ 零明文与正向路径：计划正文仅 UI 渲染文本（非 payload）+ 凭据形掩码 + 审计零明文
   + WIDEN ask-user 二择（out-of-scope-authorized 转值 + 入留痕）+ 中止 / 部分完成如实
```

### 2.2 数据流（本叶）

| 面 | 变更方向 | 关键契约 | ADR |
|---|---|---|---|
| 计划生成 | 无 → **系统聚合** | 单条 assistant 消息的全 `toolCalls` 中 **in-scope set-text**；N≥2 出卡 / N==1 逐条 / N==0 不出（PD-SGO-005） | SGO-004 |
| 计划载体 | 无 → 既有 `confirm-request` + 既有 `auth` kind | type-only `question.plan`；**零新增 kind / 宿主** | SGO-004 |
| 指纹 | 无 → **逐字节入哈希、摘要出账** | `sha256(canonical(selector ∧ actionType ∧ fromDigest ∧ toText))`（PD-SGO-006） | SGO-004 |
| 授权 | 逐条 → **一次真实手势 + 计划外回落** | 条目键集准入；一次点击不放开无限写 | SGO-004 |
| 特权 op | 恒不入批 | `tierOf` 单源不改；「SW 永不 `.request(`」不变 | SGO-004 |
| 零明文 | 审计只记字段名 / 计数 / 指纹摘要 | 计划正文仅 textContent（渲染用字段，非 `payload`）+ 掩码 | SGO-004 |
| 扩围 | 无 → **ask-user 二择** | 复用既有 `askuser`；`authorized` 只由用户确认产生 + 入留痕 | SGO-005 |

### 2.3 执行序（供 tasks 参考，**不是需求**）

> 承叶 spec §8.4「**边界先行：注入反证先落**」（DC-SGO-005）。

| 波 | 范围 | 任务（估） |
|:-:|---|:--:|
| **W1** | 边界先行：RL-06 / OT-⑩ 批量变体注入必红（043/049/103）+ 特权不入批（045）+ 载体零新增（041） | ~5 |
| **W2** | 计划结构 + 指纹 + 准入 + 计划外回落（040/042/044）+ 零明文（046/050）+ 中止 / 逐条（047/048） | ~7 |
| **W3** | WIDEN 二择（060~063）+ 留痕（081/082）+ S0′ 批量分支（093）+ X 台账（103/105/107）+ 体积重登记 | ~4 |

### 2.4 X-SGO 逐条处置（本叶）

| X | 处置 | 落地 | 状态 |
|---|---|---|---|
| **X-SGO-4** | 逐条 → 任务级批量；`RL-06` / OT-⑩ **扩批量变体并注入必红**；`law8` 36 不降级；`auth` 6 终态保持 | `test/supersession-ledger.test.ts` + `test/op-three-tier.test.ts` + `law8` + `test/batch-consent.test.ts` | **已发生** |
| **X-SGO-6** | **优先以「读数」承载**（**不新增终态字面量**） | `test/driver-terminals.test.ts`（第二声明 ⇒ FAIL）+ `law7x-ext` 绿 | **读数承载、词汇未扩张**（如实登记） |
| **X-SGO-7** | 主流程调用点走既有槽扩张（diff = 0） | `test/op-wiring.test.ts` 计数复合读数 | **未发生取代**（如实登记 ✅，共享台账叶1 承接） |

### 2.5 红线继承（本叶主责）

N-SGO-005（特权 op 恒 gesture）· N-SGO-006（consent 不得被 AI 代答，**含批量变体**）· N-SGO-009/010（`KIND_SET` 40 / 12 kind / 零宿主）· N-SGO-011（法八四面）· N-SGO-012（法七不退化 / 零死端）· N-SGO-013（不新增终态字面量）· N-SGO-015（断言只增）· N-SGO-025（批量卡不得 AI 代答 / 代填 / 自动放行）· N-SGO-026（计划清单零明文口径）· N-SGO-030（升档须作者一行）。逐条承载见父 `plan.md §2.6`。

## 3. 方案对比（本叶关键取舍）

| 维度 | **方案 A：系统聚合计划 + 既有 `auth` 卡 + 逐字节哈希（推荐）** | 方案 B：AI 独立出计划消息 + 新载体 | 方案 C：只把计划展示、仍需逐条点 |
|---|---|---|---|
| 描述 | 计划 = 单条 assistant 消息的 in-scope set-text；指纹逐字节入哈希；一次手势 | AI 先输出一份「计划」→ 新 payload / 可能新 kind | 展示 N 条计划，但每条仍逐条批准 |
| 优点 | 计划与实际写入**同源**（不漂移）；零新载体；解 42 连点 | 计划可独立演进 | 改动最小 |
| 缺点 | `confirm.ts` 升级为计划感知桥（B 列） | 计划可能漂移（R-SGO-906）；撞 `KIND_SET` / 12 kind | **不解 42 连点**（US-SGO-004 未达） |
| 风险 | R-SGO-001（有一次性手势 + 计划外回落兜底） | R-SGO-007 + R-SGO-906 | 需求未达 |
| 工作量 | 3 波 / ~16 任务 | 越界（新载体需新门禁） | ~2 波（不达标） |

## 4. 推荐方案

**推荐：方案 A**。理由：计划与真实写入**同源**是「不可能漂移」的结构性保证（R-SGO-906 消除）；一次真实手势 + 计划外回落 + 特权不入批三者叠加，是「解 42 连点」与「不弱化红线⑥」的**唯一同时满足**形态（DC-SGO-005）；零新增载体（复用 `auth` + `confirm-request`）。

## 5. 本叶文件影响分析

> 共 **≈11 项**（src 5 / test 6）。

### 5.1 `src/**`（本叶 5 项；列标 A=计账 / B=不计账）

| 操作 | 文件路径 | 说明 | 列 |
|:--:|---|---|:--:|
| NEW | `packages/web-cli-plugin/src/background/batch-plan.ts` | 计划结构 + **指纹**（逐字节入哈希）+ 准入（`buildPlan` / `planFingerprint` / `admitEntry`；纯函数） | B |
| MODIFY | `.../background/service-worker.ts` | 捕获单条 assistant 消息全 `toolCalls`；计划 holder；接 `confirm` 桥 | B |
| MODIFY | `.../security/confirm.ts` | 计划感知桥（指纹准入 + 计划外逐条回落 + 零明文审计）；**单条路径逐字不变** | B |
| MODIFY | `.../ui/sidepanel/chat-state.ts` | `auth` 卡**渲染用**计划字段（与 `payload` 同级、不在 payload 内）；零新增 kind | A |
| MODIFY | `.../ui/sidepanel/cards/auth.ts` | 计划行渲染（textContent + 凭据形掩码；静态三段模板口径；展示上限 8 行） | A |
| MODIFY | `.../ui/sidepanel/sidepanel.ts`（与叶1 共面） | `confirm-request` 计划 passthrough + WIDEN 二择接线 + 留痕 | A |
| **NOOP** | `packages/web-cli-base/**` / `src/content/**` / `manifest.json` | 零 diff（显式登记） | — |

### 5.2 `test/**`（本叶 6 项）

| 操作 | 文件路径 | 说明 |
|:--:|---|---|
| NEW | `test/batch-consent.test.ts` | 计划构建 / 指纹口径 / 准入 / 计划外回落 / 中止 / 特权不入批 / 审计零明文（BC-1~BC-7） |
| MODIFY | `test/supersession-ledger.test.ts` | **RL-06 扩批量变体**（AI 代答计划注入 ⇒ 必红）+ X-SGO-4/6/7 条目 |
| MODIFY | `test/op-three-tier.test.ts` | **OT-⑩ 扩批量变体**（`tierOf` 逐 op 不变） |
| MODIFY | `test/capability-wiring.test.ts` | 新增「批量路径不触达特权 op / SW 永不 `.request(`」断言 |
| MODIFY | `test/ui/law8-plaintext.mjs` | 批量计划零明文 + 掩码（**36 断言零降级、计数只增**） |
| MODIFY | `test/ui/fixtures/s0-chain.mjs` + `test/ui/s0-self-driven.mjs` | S0′-7/8 批量分支（一次手势覆盖计划内全部 + 计划外回落 + 二择；**只加断言不加文件**） |
| MODIFY | `test/ui/no-dead-end.mjs` | WIDEN 二择后零死端（49 只增） |
| MODIFY | `test/size-baseline.ts` | 本叶收口实测重登记（五要素 + 三值 + metafile 归因） |
| MODIFY | `test/gate-integrity.test.ts` | 若新增 node 门禁则下界只增；`CHROMIUM_GATES === 9` 不动 |

### 5.3 `docs/**` 与 SDDU（本叶）

| 操作 | 文件路径 | 说明 |
|:--:|---|---|
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` | X-SGO-4/6 条目 + X-SGO-7（未发生）+ 批量变体 `redlineRemap[]` |
| MODIFY | `../state.json` + `state.json`（本叶） | phase → `planned`；phaseHistory 追加 |
| MODIFY | `../TREE.md` + 本叶 `TREE.md` | 由 `sddu-tree` 定向更新 |

## 6. 本叶风险评估

| # | 风险 | 等级 | 缓解（⇒ ADR） |
|---|---|:--:|---|
| **R-SGO-001** | 批量授权被误用为「AI 代答 consent」的合法外衣（**唯一红线级**） | 高 | 边界先行（W1）：RL-06 / OT-⑩ 扩批量变体注入必红（SGO-004 §4） |
| R-SGO-005 | 计划清单撞破法八 | 高 | 正文仅 UI 渲染 + 掩码 + 审计只记摘要（SGO-004 §7） |
| R-SGO-007 | `KIND_SET` / 12 kind / 零宿主被撞 | 高 | 复用 `auth` + `confirm-request` + type-only（SGO-004 §2） |
| R-SGO-006 | 体积越档 | 中高 | A 列 3.5~5.5 KB；本叶收口重登记（SGO-007） |
| R-SGO-905 | 正文写进 digest / 审计 | 高 | 审计只记字段名 + 计数 + 指纹摘要（SGO-004 §7） |
| R-SGO-906 | 指纹判成「形状相同即放行」 | 中高 | 指纹含**文本对**（逐字节入哈希）；计划 = 真实 toolCalls（SGO-004 §1/§3） |
| R-SGO-907 | 二择被实现为 AI 自答 / 默认整页 | 高 | 确认必须真人手势 + 入留痕（SGO-005 §2/§3） |
| R-SGO-910 | 体积评估被跳过 | 中高 | 先预算后落地 + 本叶重登记（SGO-007） |
| R-SGO-914 | 计划正文写进 `CardView.payload` | 高 | 渲染用字段（非 payload）+ 新零明文断言（SGO-004 §7） |
| R-SGO-915 | 「系统聚合」实现为跨回合累积 | 中高 | 计划边界 = 单条 assistant 消息（SGO-004 §1） |
| R-SGO-916 | 指纹批准前漂移仍放行 | 中高 | 批准时重校验入范围集合 ⇒ 显式失败（SGO-004 §3） |
| R-SGO-920 | 叶1 未落地即排叶2 | 中高 | 硬依赖 + 串行（本叶 §1 前置检查） |

## 7. 本叶 ADR 引用

| ADR | 标题 | 本叶承责范围 |
|---|---|---|
| ADR-SGO-004 | 任务级批量授权 | 全（§1~§11） |
| ADR-SGO-005 | 扩围征询 | 全（§1~§6；叶1 提供读数 + 转值底座） |
| ADR-SGO-006 | S0′ 双面机器化 | §1~§4（批量分支 S0P-7/8） |
| ADR-SGO-007 | 体积分列预算 | 本叶 A 列 3.5~5.5 KB + 收口实测重登记 |
| ADR-SGO-008 | PD-SGO-001~007 裁决 | PD-005/006/007 在本叶落点 |

## 8. 本叶体积预算

| 项 | 预算 | 上界（+15%） | 对照依据 |
|---|--:|--:|---|
| A 列（`sidepanel.js` 净增） | **3.5~5.5 KB** | 4.0~6.3 KB | v5.5-3 R2 面板接线 +6,889 B（本叶面板侧更小） |
| B 列（`background.js`，不计账） | 3.0~5.0 KB | — | `batch-plan.ts` + `confirm.ts` + `service-worker.ts` 全落 SW |

> 本叶收口**即测即登记**（父 FR-SGO-125）：五要素 + V3-VOL-3 三值同源前移 + metafile 逐模块归因；`authorConfirmation` 保持 `pending-author-line`（不伪称已确认）。**两叶 Σ A 列 9.5~14.5 KB**（+15% 16.7 KB）≤ 余量 28,931 B ⇒ 正常口径不触发升档；2.8× 最坏 ⇒ 预置 EC-SGO-022 升档路径 + 作者一行。

## 9. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V5.5F-2 批量授权叶 plan）：承载父 FR ≈21 条切片；交付 3 条主链（边界先行 / 计划与指纹 / 零明文与正向路径）；执行序 3 波（注入反证先落）；X-SGO 逐条处置（4 已发生 / 6 以读数承载 / 7 未发生）；文件影响 ≈11 项；风险 12 条；体积 A 列 3.5~5.5 KB；**硬依赖叶1（串行）** | 2026-09-24 | SDDU Plan Agent |
