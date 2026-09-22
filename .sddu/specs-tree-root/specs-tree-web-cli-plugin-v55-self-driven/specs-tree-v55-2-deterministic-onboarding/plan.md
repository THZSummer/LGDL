# 技术计划：specs-tree-v55-2-deterministic-onboarding（V5.5-2 主题① 确定性系统流）

> **文档定位**: SDDU 技术方案（**次叶 / 主题① 叶**）—— 本叶承载的父 FR/NFR/EC/AC 的**实施切片**；权威跨切契约见父 `../plan.md` + `../ADR-V55-006/007`
> **前置依赖**: 本叶 `spec.md` v1.0 + 父 `../spec.md` / `../plan.md` + **前置叶 `specs-tree-v55-1-driver-layer`**（驱动者声明 / `'answered'` 时机 / 驱动者终态词汇 / 悬置任务入口）
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-22
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-22
> **更新说明**: 初始创建（V5.5-2 叶 plan：配置探测判据（3 字段确定性）+ `runChat` 前置判据（SW bundle）+ 双源并存 + 多步引导流（4 步单源）+ 悬置任务单源 + 配置完成自动续接 + 首装/已装未配两场景 + S0 分支 B 必判项）

---

## 1. 前置检查

| 检查项 | 状态 | 证据 |
|--------|:--:|------|
| 本叶 `spec.md` 存在 | ✅ | `spec.md`（258 行，v1.0） |
| 前置叶 v55-1 产物 | ⏳（按叶序） | 本叶设计**只依赖** v55-1 的既定接口：驱动者声明 / `'answered'` 时机 / 终态词汇 / **悬置任务入口**（`registerSuspension`） |
| 上游 v5 底座（只读复用） | ✅ | `service-worker.ts#runChat` · `sidepanel.ts#{noteLlmBlockedFact,maybeRecommendFirstRunEntry,opAskResolvers}` · `next-registry/{providers,definition}.ts`（`OPS_RECOVERY_ROWS` / `BLOCKED_RECOVERY_TRIGGER`）· `settings/{sections,panel,ops,op-bodies}.ts` · 掩码卡 + `keyStore` · `test/ui/fixtures/s2-chain.mjs` |
| 外部 API 文档缓存 | ✅ N/A | 零外部 API / 零新依赖 / 零新权限 |
| 保护 pin（本轮复算） | ✅ | journey / binding 双绿 |
| 体积基线 | ✅ | 以 **v55-1 收口后的实测基线**为准（同源前移；投影 556,609 B） |

## 2. 本叶范围与架构影响

**做**：① `isLlmConfigured`（**3 字段**：`hasKey ∧ providerId ∈ PROVIDERS ∧ model 非空`，后二者由 key-store 读归一化**结构性保证**）落在既有 `src/llm/status.ts`（双侧可用、零依赖）；
② `runChat` **前置配置判据**（先于 `providerChat`，未配置 ⇒ `chat-result{ variant:'llm-unconfigured' }`，**不调 provider / 零 token**）；
③ 双源并存（被动观测保留 + 主动识别新增，**幂等**、同一终态词汇、`OPS_RECOVERY_ROWS`/`BLOCKED_RECOVERY_TRIGGER` 零改写）；
④ 多步引导流 **4 步单源**（识别 → 引导 → 采集 → 完成），采集**复用** `OP_PARAM_SEQUENCE['op.llm-config']`；
⑤ 悬置任务单源（`MAX_SUSPENSIONS = 1` + 三要素 + **有效期重校验**）+ 配置完成**自动续接**（S2「阻塞解除 → 自动恢复」范式）；
⑥ 首装 / 已装未配两场景（后者**不依赖 `firstRun`**）；⑦ 取消非死端 + 同因不重复；⑧ 零视图切换（流内闭环）；
⑨ S0 **分支 B 必判项** + 主题① 场景门禁。

**不做**：主题② 主动性与护栏（v55-3）/ 新造配置 op 或第二写入路径 / 引导跳设置页 / 凭据存储侧加密 / 依赖 LLM 的文案。

**关键设计定案（引用）**：ADR-V55-006（判据 3 字段 + 前置判据 + 双源 + 分流）· ADR-V55-007（4 步单源 + 悬置单源 + 续接顺序 + 两场景 + 不跳走）· ADR-V55-004（悬置登记入口由 v55-1 提供）· ADR-V55-010（续接的 press 载体）。

## 3. 文件影响分析（本叶）

| 操作 | 文件路径 | 说明 |
|:--:|---|---|
| NEW | `src/ui/sidepanel/next-registry/suspension.ts` | 悬置任务单源（登记 / `MAX=1` / 重校验 / 续接） |
| NEW | `src/ui/sidepanel/next-registry/onboarding-flow.ts` | 引导流 4 步单源 + 文案 + `op.llm-config` op-direct chip |
| MODIFY | `src/llm/status.ts` | `+ isLlmConfigured()`（3 字段；零依赖） |
| MODIFY | `src/background/service-worker.ts` | `runChat` 前置判据（**在 `chatBusy = true` 之前** early return）+ 新 payload 变体（SW bundle，零 sidepanel 字节） |
| MODIFY | `src/background/messaging.ts` | union **type-only** 扩成员（`KIND_SET` **40 不动**） |
| MODIFY | `src/ui/sidepanel/{sidepanel,next-registry/providers}.ts` | 变体处理 + fold 进既有 `risk` + 引导/续接接线（`onboarding` provider **零改写**） |
| NEW | `test/onboarding-deterministic.test.ts` | 主题① 场景门禁（判据 3 字段 / 源码序 / 两场景 / 零 LLM / 零视图切换 / 自动续接 / 失效重校验） |
| MODIFY | `test/{blocked-terminals,next-registry,ask-bridge,supersession-ledger,gate-integrity,size-*}.test.ts` / `test/ui/{ask-auth-inflow,stream,law8-plaintext,s0-self-driven}.mjs` / `test/s0-self-driven-chain.test.ts` | 等价重锚 + **S0 分支 B 必判项**（只增不改） |
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` | X-SELF-3 条目 + `modifiedRanges[]`（SW + 面板 fold 面逐行） |
| **NOOP** | `src/content/**` / `KIND_SET` / `manifest.json` / `docs/v3-supersession-ledger.json` / `ROADMAP.md` / `settings/**`（除面板开关面外） | 零 diff（显式） |

## 4. 实施序（5 波；供 `@sddu-tasks` 参考，非需求）

| 波 | 内容 | 完成判据 |
|:--:|---|---|
| **W1** 判据 | `isLlmConfigured` + 真值表 + 归一化不变量 + 零 LLM 机核 | 3 字段扫描绿；假阴/假阳两类注入必红 |
| **W2** 前置判据 | `runChat` 前置（**先于** `providerChat`；early return 在 `chatBusy = true` 之前）+ payload 变体 | 源码序断言 + 反证：删判据 ⇒ FAIL（复现 R5）；反证：early return 位置错 ⇒ 第二次回合被误判忙 ⇒ FAIL |
| **W3** 双源 + 引导流 | 主动识别 fold + 被动保留；`ONBOARD_STEPS` 4 步 + 复用既有 params 序列 | 幂等（不产两条事实/两条引导）；逐步可判 + 删步 ⇒ FAIL；零视图切换 |
| **W4** 悬置 + 续接 | `suspension.ts` + 成功回执 → 续接（顺序机核）+ 失败回滚且**悬置保留** | 「回执在前续接在后」事件序；失效重校验（不制造假成功）；空悬置非死端 |
| **W5** 两场景 + S0 分支 B + 收尾 | 首装 / 已装未配 + 取消非死端 + 分支 B 必判项 + 台账 + 体积五要素 + 全门禁串行 | 注入 `firstRun=false` 仍产出；「配置完成 ⇒ 自动续接」反证必红；计数只增；保护段双绿 |

## 5. 本叶验收门禁清单

`typecheck` · `build` · `npm test`（≥1181 增）· `blocked-terminals`（9 不变）· `next-registry`（≥16 增）· `ask-bridge` · `test:ask-auth`（≥71 增）· `test:stream`（≥73 增）· `test:law8`（≥25 增：引导路径）· `test:recommendation`（≥65）· `test:dead-end`（≥39）· `s2-deadend-chain`（6，**S0 并列**）· **S0 双面**（`test/s0-self-driven-chain.test.ts` + `test/ui/s0-self-driven.mjs`：**分支 B 必判项**）· **新主题① 场景门禁** · `test:supersession`（≥36 增）· `test:gate-integrity`（≥15 增）· `size-*` + `test:size-ruling-vol3`（12）

**共享面义务（本叶面）**：体积五要素重登记（本叶增量）· X-SELF-3 台账条目 · 悬置任务**单源登记**（第二处 ⇒ FAIL）· 保护段**保段**。

## 6. 体积预算（本叶）

| 构成 | 预算 | 上界 |
|---|--:|--:|
| `suspension.ts` NEW 1,300 · `onboarding-flow.ts` NEW 1,100 · `llm/status.ts` 120 · `sidepanel.ts` 2,300 | **4,900** | **6,300** |

累计投影：556,609 → **561,509**（**距档位 563,200 仅 1,691 B** ⚠️）。⇒ 本叶若出现 review 修复轮，**跨档位可能提前到本叶**：
预案（ADR-V55-011 §4）对**任一叶**成立（谁先越谁登记），`authorConfirmation` 保持 `pending-author-line`。

## 7. 风险评估（本叶）

| # | 风险 | 等级 | 缓解 |
|---|---|:--:|---|
| R-SELF-904 | 悬置任务成为**第二条事实通路**（双写） | 中高 | **单源登记**（恰 1 处）+ `MAX=1` + 有效期重校验；流内事实仍是唯一事实面 |
| R-SELF-905 | 引导「跳走」（省事打开设置页） | 中 | 零视图切换 / 零 `#open-settings` 断言 + 反证 |
| R-SELF-909 | 主题①② 互相掩盖 | 中 | 配置判据 = **唯一**分流依据 + 互斥完备断言 |
| R-SELF-002 | 门禁取代面（`runChat` / 阻塞事实 / op 恢复链） | 高 | `OPS_RECOVERY_ROWS` / `BLOCKED_RECOVERY_TRIGGER` **零改写**（含按终态键控形态） |
| R-SELF-902 邻域 | 主动识别被实现为「第二个事实源」⇒ 与被动观测漂移 | 中高 | 双源**同一终态词汇** + 幂等断言（EC-SELF-004） |
| **R-V55-106/107** | 前置判据的位置错误（`chatBusy` 泄漏）/ 假阴性配置判定 | 中高 | early return 源码序判据 + 归一化不变量机核 |
| R-SELF-006 / **R-V55-110** | 体积（本叶距档位仅 1,691 B） | 中高 | 减体积优先级（纯记账下移 SW）；跨档位**显式**登记预案 |

## 8. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V5.5-2 叶 plan：配置判据 3 字段 / `runChat` 前置判据 / 双源并存 / 4 步引导流单源 / 悬置任务单源 + 自动续接 / 两场景 / S0 分支 B 必判项；5 波；预算 4,900 B（上界 6,300）；累计 561,509 **距档位 1,691 B**，跨档位预案对任一叶成立） | 2026-09-22 | SDDU Plan Agent |
