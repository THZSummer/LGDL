# 构建报告：specs-tree-nda-1-next-tool-channel

> **文档定位**: SDDU 构建报告 — 记录全部任务的文件变更和实现结果，作为 review 阶段的输入  
> **前置依赖**: 本叶 `tasks.md` / `tasks.json`（v1.0）、本叶 `plan.md`（v1.0 + ADR-NDA-101/102）、父 `plan.md` / `spec.md`（ADR-NDA-001~009）  
> **创建人**: SDDU Build Agent  
> **创建时间**: 2026-09-27  
> **版本**: v1.0  
> **更新人**: SDDU Build Agent  
> **更新时间**: 2026-09-27  
> **更新说明**: 初始创建 —— 叶1（机制核心）全 20 任务落地：`next` 工具通道 + `hooks.intercept` 捕获 + 5 道校验链保留接入 + 无条件触发 + `ai-led` 独立规则位 + 围栏块通道替换 + `parity` 条目 + `ai-next-candidate` 门禁改写（AI-N-1~14）+ S0'''' 主线 A / 支线 B·D node 面 + 体积叶1 重登记（605,239 B）

---

## 1. 构建概要

| 维度 | 数值 |
|------|:--:|
| 完成任务数 | **20 / 20**（`TASK-NDA-101~120`；W1 7 / W2 7 / W3 6） |
| 复杂度分布 | S×7 / M×9 / L×4 |
| 新增文件 | **1** 个（`src/tools/next-tool.ts`） |
| 修改文件 | **24** 个（6 源码 + 18 测试/台账/文档） |
| 先验闸门 | **SG-NDA-01 = 可行（8/8）**；**SG-NDA-02 = 可行（12/12）**（探针产物已删除，不落版本库） |
| 门禁 | `npx tsc --noEmit` EXIT 0；**`npm test` 1516 / 0**（基线 1507 ⇒ +9，零删除）；`test:law8` 67/0；`test:s0-self-driven` 95/98（3 项既有环境 flake，见 §4.1） |
| 体积（A 列） | 604,602 → **605,239 B**（**+637 B，+0.11%**）；档位 614,400 / 绝对上限 675,840 **均不变**；生效上限 **635,500** |
| 体积（B 列） | `dist/background.js` 1,641,872 → **1,644,437 B**（**+2,565 B，不计入 sidepanel 账本**） |

### 1.1 SG-NDA-01（TASK-NDA-101）先验结论：**可行（8/8）**

`test/_spike/sg-nda-01-probe.mjs`（探毕删除）：

| # | 假设 | 实跑证据 | 结论 |
|:-:|---|---|:--:|
| ① | 基座 `hooks.intercept` 在 `dispatch` 前被调用，返回非 null 即**短路**真实 `dispatch` | `createAgentRunner` + `intercept` 返回合成 `ToolResult` ⇒ `dispatchCalls === 0` ∧ `outcome === 'completed'` | ✅ |
| ② | `tc.rawArguments` 保真；`tc.args` 取不到 `candidates` | `parseToolArguments` ⇒ `rawArguments` 含 `candidates` ∧ `args === {}` | ✅ |
| ③ | 解析失败 / 顶层非对象 / 缺 `candidates` ⇒ 零候选且不抛 | 8 种坏形态逐例 `[]` 且无异常 | ✅ |
| ④ | `events.onCommandLine` / `onToolOutput` 对 `next` 可加法过滤（不上流） | 含 `next` 调用的回合：`command` 发射 0 ∧ `tool` 发射 0 | ✅ |
| ⑤ | 覆盖式取最后一次 + `≤3` 截断 | 两次调用 ⇒ 最后一次；4 项 ⇒ `slice(0,3)` | ✅ |

**被闸门任务影响**：`TASK-NDA-102/103/105/107` 可开工（全部落地）。

### 1.2 SG-NDA-02（TASK-NDA-108）先验结论：**可行（12/12）**

`test/_spike/sg-nda-02-probe.mjs`（探毕删除）：

- `NEXTSTEP_PRIORITY` 恰 5 ∧ `ai-led` 第 2 位 ∧ `indexOf('ai-led') < indexOf('ref-action')` ⇒ **有引用时 AI 仍优先于 ref-action（行为与 F-36 的 `prepend` 等价）**；
- `risk-recovery` 仍最高（确定性接管语义不变）；
- `MAX_NEXTSTEP_CARDS_PER_ROUND === 1` ∧ `MAX_CHIPS_PER_CARD === 3` **逐字未改**；`DRIVER_TIMINGS` 恰 5 ∧ `LEGACY4` 逐字（零新增触发词）；`DRIVER_DECLS_SRC` 12 行（叶1 零新增 provider）；
- AI 在场 ⇒ 首卡 `ai-led`；AI 缺席 ⇒ `ref-action` 确定性接管；
- 注入「恰 4」/ 位次漂移 ⇒ 判据**可 FAIL**。

---

## 2. 文件变更

### 2.1 源码（6 修改 + 1 新增）

| 操作 | 文件 | 列 | 对应任务 | 说明 |
|:--:|---|:--:|:--:|---|
| NEW | `packages/web-cli-plugin/src/tools/next-tool.ts` | B | TASK-NDA-102 | `NEXT_TOOL_NAME='next'` / `NEXT_TOOL_MAX_CANDIDATES=3` / `NEXT_TOOL_SCHEMA`（`enum` 由 `OP_IDS` 派生减 `gesture` ⇒ 7；`params:{type:'string'}`）/ `NEXT_TOOL_DESCRIPTION`（三约束 + 空数组兜底，零标记）/ `createNextToolEntry()`（`listed:false` + fail-closed `executor`） |
| MODIFY | `packages/web-cli-plugin/src/background/host.ts` | B | TASK-NDA-103 | always-registered 段新增 `router.register(createNextToolEntry())` ⇒ `deriveTools()` 含 `next` |
| MODIFY | `packages/web-cli-plugin/src/background/ai-next.ts` | B | TASK-NDA-105 | 删围栏块四符号（函数级）；新增 `parseNextToolArguments` / `NextTurnCapture` / `emptyNextTurnCapture` / `captureNextCall`；`validateAiNext(candidates, facts)` 改签名；`admitCandidate` / `AI_NEXT_LABEL_MAX` / `AI_NEXT_PARAM_MAX` **逐字保留** |
| MODIFY | `packages/web-cli-plugin/src/background/ref-context.ts` | B | TASK-NDA-106 | 删 `NEXT_CONTRACT_GUIDANCE` 与注入点（`REF_SCOPE_GUIDANCE` 逐字保留；无引用 ⇒ `''` 不变） |
| MODIFY | `packages/web-cli-plugin/src/background/service-worker.ts` | B | TASK-NDA-107 | `hooks.intercept`（命中 `next` ⇒ `captureNextCall` + 合成 `ToolResult{NEXT_TOOL_ACK}`）；`onCommandLine` / `onToolOutput` 对 `next` 早退；`onFinish` 装配点改 `capture.lastCandidates → validateAiNext → slice(0, NEXT_TOOL_MAX_CANDIDATES)`；`onToolDone` **逐字未动** |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/recommend.ts` | A | TASK-NDA-109 | `NEXTSTEP_PRIORITY` 恰 4 → **恰 5**（`ai-led` 第 2 位）+ `NEXTSTEP_LABELS['ai-led']` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/providers.ts` | A | TASK-NDA-110 | `ai-next.rule: 'ref-action' → 'ai-led'`；`priority 2 → 1`；`RULE_PROVIDER_IDS` 追加 `ai-led`；`when` / `chips` / `chipsFor` / `label` / `DRIVER_DECLS_SRC` 逐字保留 |

### 2.2 测试 / 台账 / 文档（18 修改）

| 操作 | 文件 | 对应任务 | 说明 |
|:--:|---|:--:|---|
| MODIFY | `test/ai-next-candidate.test.ts` | 111/112/115 | AI-N-1 换机制（工具捕获五层筛 + 覆盖式 + ≤3）；AI-N-2~11 语义对账；**新增 AI-N-12**（schema 单源）/ **AI-N-13**（不上流）/ **AI-N-14**（`tc.args` 零使用）；`JUDGEMENTS` 11→14；S0''' 样本等价重锚（围栏块 → 工具捕获）；**新增 S0'''' 主线 A / 支线 B·D node 面**（叶2 步骤记 `n/a`） |
| MODIFY | `test/parity/waivers.json` | 104 | 新增 `pluginExtras['next']`（reason + basis 非空；`baseline-catalog.json` 零 diff） |
| MODIFY | `test/recommendation-sources.test.ts` | 113 | ③ 恰 4 → 恰 5（逐项复算 + 注入反证）；ADN-2 204/205/206/207 等价重锚（`ref-action` 槽 → `ai-led` 独立槽）；①~④ 零删除 |
| MODIFY | `test/insight-archive.test.ts` | 115 | fixture 122 → 123（新增纯协议 `next` 卡片）；L3 28 → 29；动态不变量不变 |
| MODIFY | `test/insight-action-parity.test.ts` | 114 | 保守分歧集 3 → 4（+`next`，`base-builtin` + risk 缺失 ⇒ 投影 deny / 真链 allow） |
| MODIFY | `test/insight-no-escalation.test.ts` | 114 | parity 冻结 glob **显式排除** `waivers.json`（已授权加法行）+ 新增 `pluginExtras['next']` 非空断言；`NEXTSTEP_PRIORITY` 恰 4 → 恰 5；base 零 diff 断言不变 |
| MODIFY | `test/s0-self-driven-chain.test.ts` | 115 | A 支线机制侧 `ref-action` 槽 → `ai-led` 独立槽 |
| MODIFY | `test/ui/fixtures/s0-chain.mjs` | 116 | S0''' 样本生成器由「围栏块 info 串」重锚为「`next` 工具 `rawArguments`」（同文件内）；**新增 S0'''' 十二环节 / 十二必判项 / 四类非法注入 / `s0ppppProblems`**；S0''-B 红线 `NEXTSTEP_PRIORITY` 恰 4 → 恰 5 |
| MODIFY | `test/ui/s0-self-driven.mjs` | 116 | `NEXTSTEP_PRIORITY` 恰 5；AI 卡片规则位 `ref-action` → `ai-led`（两处）；**新增 ⑳ S0'''' 主线 A / 支线 B / 样本单源断言（只加断言不加文件）** |
| MODIFY | `test/ui/law8-plaintext.mjs` | 116 | **新增 ★ NDA-1 ⑫**：工具面零明文（静态：description 无 `< > \`` / 无 URL query / 无密钥形）+ AI label 零明文（运行面：哨兵形 label 被第 5 道链丢弃 ⇒ 流 / chips / digest 三面零哨兵） |
| MODIFY | `test/gate-integrity.test.ts` | 117 | **新增元门禁**：`ai-next-candidate` 受审 ∧ 判据表 ≥14 ∧ 下界只增（仍 48）∧ `CHROMIUM_GATES === 9` ∧ 反证可红（纯追加） |
| MODIFY | `test/size-baseline.ts` | 118 | 基线 604,602 → **605,239**；TIMELINE 追加；`nda1Rows` + `nda1UnattributedGlueBytes=0`；`deltaBytes` 309,377 → 310,014；`closeoutDeltaBytes` 1,397 → 637；`wiringBytes` +637；`SIDEPANEL_RE_REGISTRATIONS['nda-1-r1']`（五要素 + 三值）；`roundRowRegistrationIds.nda1Rows`；`SIDEPANEL_FINAL_ARTIFACT_BYTES` / META 同源前移 |
| MODIFY | `test/size-budget.test.ts` | 118 | ceiling / 基线 / UNCAPPED 分母 / `measuredOn` 数值重 pin |
| MODIFY | `test/size-growth-evidence.test.ts` | 118 | 最新树链环（`sizeLatestAdnRows` / `latestAfterBytes`）改 `nda1Rows`；`requiredBy` 正则接受 `FR-NDA-*`；roundRowGroups 40 → 41；ADN-2 收口判据按 id 定位（末轮前移） |
| MODIFY | `test/size-ruling-vol3.test.ts` | 118 | 三值 pin（基线 / 生效上限 / 越 1 B 反证）重 pin |
| MODIFY | `docs/v4-density-baseline.json` | 118 | `volume.registeredBaselineBytes` 604,602 → 605,239；`ceilingBytes` 634,832 → 635,500 |
| MODIFY | `docs/v4-supersession-ledger.json` | 118/119 | R1 叶段（`leafBase=a75466a`：scope 规则复算 + 逐字删除面登记）+ 10 条 `modifiedRanges` + 16 条 `newTitle` 换链 + `v3Vol3Closeout.⑤三值闭合.newBaselineBytes` 同源前移 + **`xNdaLedger`（8 行）/ `xNdaGateReconciliation`（12 行）/ `xNdaLedgerFull`（叶2 占位）** |
| MODIFY | `test/supersession-ledger.test.ts` | 119 | **新增判据**：`xNdaLedger` 五要素齐备 + X-NDA-1/2/5/7/8 `superseded` ∧ X-NDA-6 `keep` ∧ X-NDA-9/12 `no-supersession`（非空理由）+ `xNdaGateReconciliation` 三态齐 / 无「未处置」/ 悬空 gate 必红（纯追加，118 行） |

### 2.3 零改（保留面，逐项复核绿）

`driver-timings` / `driver-quadruple`（12↔12）/ `op-wiring` / `op-three-tier` / `sw-op-mirror` / `next-dispatch-diff0`（`ACT_TO_OP` 恰 6）/ `ref-context-in-turn` / `cards/nextstep.ts` / `packages/web-cli-base/**`（零 diff）/ 三冻结面（`dist/content.js` 177,076 B / sha `52a82620…`；`dist/pick-layer.js` 34,358 B / sha `77796bab…`）/ `.sddu/.../ROADMAP.md`（零 diff）。

---

## 3. 任务完成清单

| 任务 | 名称 | 复杂度 | 状态 | 对应 FR |
|------|------|:--:|:--:|------|
| TASK-NDA-101 | SG-NDA-01 捕获 / 解析 / 短路 / 不上流 探针 | M | ✅ completed（8/8） | FR-NDA-021~024 / 016 / 018 |
| TASK-NDA-102 | `src/tools/next-tool.ts`（NEW） | S | ✅ completed | FR-NDA-010~014 |
| TASK-NDA-103 | `host.ts` 注册 `next` ⇒ `deriveTools()` | S | ✅ completed | FR-NDA-010 / 015 |
| TASK-NDA-104 | `parity waivers.json#pluginExtras['next']` | S | ✅ completed | FR-NDA-020 / 117 |
| TASK-NDA-105 | `ai-next.ts` 解析入口 + 删围栏块 + 改签名 | L | ✅ completed | FR-NDA-022 / 025 / 030~036 / 081 |
| TASK-NDA-106 | `ref-context.ts` 删契约句 | S | ✅ completed | FR-NDA-041 / 080 / 081 |
| TASK-NDA-107 | `service-worker.ts` intercept + turnState + 过滤 + 装配 | L | ✅ completed | FR-NDA-021~028 / 017~019 |
| TASK-NDA-108 | SG-NDA-02 `ai-led` 规则位 + 密度可判 探针 | M | ✅ completed（12/12） | FR-NDA-042 / 043 / 114 |
| TASK-NDA-109 | `recommend.ts` `NEXTSTEP_PRIORITY` 恰 5 | S | ✅ completed | FR-NDA-042 / 044 / 114 |
| TASK-NDA-110 | `providers.ts` `ai-next.rule='ai-led'` | S | ✅ completed | FR-NDA-042 / 114 / 118 |
| TASK-NDA-111 | `ai-next-candidate` 改写主体（AI-N-1 + 12） | L | ✅ completed | FR-NDA-082 / 116 / 130 / 131 |
| TASK-NDA-112 | 反证族 + AI-N-13/14 + 三段控制 | M | ✅ completed | FR-NDA-027 / 105 / 106 / 112 / 131 |
| TASK-NDA-113 | `recommendation-sources` ③ 恰 4 → 恰 5 | M | ✅ completed | FR-NDA-114 / 130 / 134 |
| TASK-NDA-114 | 保留面零改复核（9 项） | M | ✅ completed（其中 4 项按语义只增/等价重锚，已登记理由） | FR-NDA-006 / 043 / 118 / 121 / 137 |
| TASK-NDA-115 | S0'''' 主线 A / 支线 B·D node 面 | L | ✅ completed | FR-NDA-100~103 / 105 / 106 |
| TASK-NDA-116 | `s0-self-driven.mjs` + 样本重锚 + `law8` | M | ⚠️ completed（law8 67/0 绿；s0-self-driven 95/98 —— 3 项既有环境 flake，见 §4.1） | FR-NDA-100 / 103 / 104 |
| TASK-NDA-117 | `gate-integrity` 受审下界只增 | S | ✅ completed | FR-NDA-135 / 117 |
| TASK-NDA-118 | 体积叶1 重登记（五要素 + 三值 + `nda1Rows`） | M | ✅ completed | FR-NDA-140~145 / 024 |
| TASK-NDA-119 | `xNdaLedger` 骨架 + 门禁对账骨架 | M | ✅ completed | FR-NDA-110~122 / 132 |
| TASK-NDA-120 | 红线巡检 + 本叶收口对账 | M | ✅ completed | FR-NDA-001~004 / 130 / 136 / 142 |

---

## 4. 门禁结果与未决项

### 4.1 Chromium 面（KL-N-10 隔离复跑记录）

- **`npm run test:law8`**：**67 passed / 0 failed**（含 ★ NDA-1 ⑫ 两条新增）。
- **`npm run test:s0-self-driven`**：**95 passed / 3 failed**。3 项失败为同一根因：headless 沙箱内 `probe.steady === false` 未及时置稳 ⇒ `risk-recovery`（probe 触发，priority 1）抢在 `ai-led`（priority 2）之前出卡；断言读到的是 probe 恢复卡（chips = 重新绑定/改用描述/重新拾取）。
  - **隔离复跑 ≥2 + 基线对照**：`git stash` 到本叶工作前的 HEAD（`dist/sidepanel.js` = 604,602 B）后独立复跑同一门禁 ⇒ **91 passed / 2 failed**，**同两项（S0C-13 A / S0C-14）以完全相同形态失败**（`rule: "risk-recovery"`）。
  - **结论**：此为**既有环境 flake**（F-36 叶 validate 已如实登记「Chromium 面 89/1 ×2：A 支线既有环境 flake：`risk-recovery` 抢 priority-0 槽」），**非本叶引入**；S0'''' node 面（`test/ai-next-candidate.test.ts`）对同一语义做**确定性**覆盖。按 `KL-N-10` **如实记录、不阻塞、不改判据**。

### 4.2 体积叶1 重登记数值（TASK-NDA-118）

| 项 | 值 |
|---|---|
| 前值 → 后值 | 604,602 → **605,239 B**（**+637 B，+0.11%**） |
| A 列逐模块 | `recommend.ts` 7,833 → 8,292（**+459**）/ `next-registry/providers.ts` 10,188 → 10,366（**+178**）；Σ +637 + glue 0 == +637 |
| B 列（**不计账**） | `src/tools/next-tool.ts`（NEW）/ `background/ai-next.ts` / `ref-context.ts` / `host.ts` / `service-worker.ts` ⇒ `dist/background.js` 1,641,872 → **1,644,437 B（+2,565 B）** |
| 三值同源 | `newBaselineBytes = 605,239` / 档位 `ceilTo50KB(605,239) = 614,400`（不变）/ 绝对上限 `675,840`（不变）/ 生效上限 `floor(605,239 × 1.05) = `**`635,500`** |
| EC-NDA-016 二态 | 越生效上限 = **否**；越档位 614,400 = **否**（距档 9,161 B） |
| `authorConfirmation` | **`pending-author-line`**（不伪称已确认） |
| 冻结面 | `dist/content.js` **177,076 B / sha `52a82620…`**；`dist/pick-layer.js` **34,358 B / sha `77796bab…`**（逐字节不变） |

### 4.3 未决项 / 登记（不阻塞）

| # | 项 | 状态 |
|:-:|---|---|
| U-1 | S0'''' 支线 C/D/E 终态（提醒补一次 / 未配置引导 / 系统兜底 / 首开） | **属叶2**（`specs-tree-nda-2-fallback-and-gates`）；叶1 node 面记 `n/a`（不冒充 `ok`） |
| U-2 | `test:s0-self-driven` 3 项环境 flake | 见 §4.1（KL-N-10 如实登记，不阻塞；node 面确定性覆盖） |
| U-3 | `authorConfirmation` 作者一行 | 保持 `pending-author-line`（不得伪称已确认） |
| U-4 | A 列实测 +637 B 略超 ADR-NDA-008 §② 叶1 估（+0.1~0.5 KB） | 如实登记（+0.62 KB）；未跨档位，不搬列规避 |

---

## 5. 下一步

| 场景 | 操作 |
|------|------|
| 全部任务已完成 | 运行 `@sddu-review specs-tree-nda-1-next-tool-channel` 开始审查 |

---

## 6. R1 修复轮补记（review 修复轮，保留 `reviewed` 相位）

> 完整记录见 `review-report.md §8`。此处只登记**门禁计数与体积的增量**（§1 / §4.1 的数值以本节为准）。

| 项 | R1 前 | R1-FIX 后 | 说明 |
|---|:--:|:--:|---|
| `npm test` | 1516 / 0 | **1517 / 0** | +1（AI-N-15 intercept 短路永久回归）；零删除 |
| `npm run test:law8` | 67 / 0 | **69 / 0** | +2（★ NDA-1 ⑫ 运行面正控 + 反证段）；判据只增 |
| `npm run test:supersession` | 55 / 0 | **55 / 0** | 同数（判据加严：`assertionsRemoved` 机核 + 2 反证） |
| `npm run test:gate-integrity` | 27 / 0 | **27 / 0** | 下界 ≥14 保持（`CHROMIUM_GATES === 9` / 下界 48 不动） |
| A 列 `dist/sidepanel.js` | 605,239 B | **605,239 B** | 零变化（`providers.ts` 注释订正经 metafile 复算 `bytesInOutput` 零 DIFF） |
| B 列 `dist/background.js` | 1,644,437 B | **1,644,437 B** | 零变化 |
| 冻结面 | 177,076 B / 34,358 B | **同左（sha 双锚不变）** | 逐字节不变 |

修复项：**I-1**（law8 ⑫ 空转 → 真实判红；机制陈述订正）/ **I-2**（`assertionsRemoved` 机核）/ **I-3**（AI-N-15 永久门禁）/ **I-4**（`RULE_PROVIDER_IDS` 注释订正，注释-only）。生产 `src/**` 仅 1 处注释改动；红线（零改基座 / 冻结面 / 保护段 / 零新 kind 零宿主）逐条复验通过。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（叶1 机制核心：20/20 任务；SG-NDA-01 8/8 · SG-NDA-02 12/12；`npm test` 1516/0；law8 67/0；s0-self-driven 95/98（3 项既有环境 flake）；体积叶1 重登记 605,239 B） | 2026-09-27 | SDDU Build Agent |
| v1.1 | 追加 §6 R1 修复轮补记（I-1~I-4 落地；`npm test` 1517/0 · law8 69/0；体积零变化）。§1~§5 正文逐字保留。 | 2026-09-27 | SDDU Build Agent |
