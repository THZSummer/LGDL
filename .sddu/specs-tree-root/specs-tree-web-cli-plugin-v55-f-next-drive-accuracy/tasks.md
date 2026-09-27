# 任务分解：specs-tree-web-cli-plugin-v55-f-next-drive-accuracy（web-cli-plugin v0.11.4「next 驱动机制的准确落地」；父 Feature 统领性任务总览）

> **文档定位**: SDDU 任务清单（**父 / 跨切总览与索引**）— 记录 **6 波总表**、**2 叶 41 任务索引**（`TASK-NDA-101~120` / `201~221`）、跨切红线（`N-NDA-001~030` / `X-NDA-1~12` / 共享面）→ 任务映射、**体积分列预算逐叶分摊对照表（A 列 nda-1 +0.1~0.5 KB / nda-2 +0.6~1.4 KB；Σ +0.7~+1.9 KB；spec §5.14.1 保守包线 +0.8~+2.4 KB 为判据口径；B 列不计账；C 列零容差；距档 9,798 B）**、共享面「恰一次」登记、S0'''' 五支线双面落点、3 个 spikeGate（`SG-NDA-01~03`）、**门禁三态（新增断言 / 等价重锚 / 保留）逐条任务化** + 门禁守恒总表、红线任务化 + 停机规则，以及 build / review / validate 二维时序。**本文件不含可执行任务正文**（父为轻量规范容器，不承接 build / review / validate；任务正文见 2 叶 `tasks.md` / `tasks.json`）
> **前置依赖**: 本目录 `plan.md` v1.0（跨切契约 + `ADR-NDA-001~009` 索引 + §5 文件影响 A/B/C 分列 + §6 风险 20 条 + §7 ADR + §7.1 PD-NDA-001~011 裁决 + §7.2 PD-NDA-012~015 新登记）+ `spec.md` v1.0（**102 FR / 16 NFR / 25 EC / 32 AC / 22 NG / 10 US / 8 G / DC-NDA-001~014 / N-NDA-001~030 / X-NDA-1~12 / §5.14.1 体积分列预算表 / §9.5 门禁处置 23 行 / §14 2 叶拆分**）+ `discovery.md` v1.0 + 2 叶 `plan.md` v1.0 + 2 叶 `spec.md` v1.0 + 4 叶级 ADR（`ADR-NDA-101/102/201/202`）
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-27
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-09-27
> **更新说明**: 初始创建（父总览：**2 叶 × 6 波 × 41 任务**（`TASK-NDA-101~120` / `201~221`，两叶连续编号）+ 跨切红线（`N-NDA-001~030` / `X-NDA-1~12`）→ 任务映射 + **体积分列预算逐叶分摊 + 波内登记点 + EC-NDA-016 三分支任务化** + 共享面「恰一次」登记 + **S0'''' 五支线双面落点表** + 3 个 spikeGate（`SG-NDA-01~03`；覆盖两个最高风险点：`hooks.intercept` 捕获 + `rawArguments` 解析 / nudge 回调内续呼）+ **门禁三态（新增断言 / 等价重锚 / 保留）逐条任务化 + 间接面对面账** + 门禁守恒总表 + 红线任务化 + 停机规则 14 条 + 二维时序）。**本轮只做 tasks**：不写代码、不改 `src/**`·`test/**`·`dist/**`·`docs/**`·`design/**`·ROADMAP，不改上游 SDDU 目录，不动 `main`、不 force push，**不跑门禁 / 构建 / Chromium**，**未调用任何受管 Provider**（routing.v1 = `local_or_compute → none`）。

---

## 0. 结构登记（**2 叶 Feature**）

| 项 | 内容 |
|---|---|
| 父 Feature 定位 | **轻量规范容器**（父 `spec.md §14.2` 末段）：`depth=1`；**不承接** build / review / validate；`childrens` 结构不变；**不产父级可执行任务**（`FR-NDA-002`） |
| 叶数量 | **2 叶**（`depth=2` / `leaf:true` / `deliveryOrder` 1..2 / `dependsOn: nda-1 → nda-2`） |
| 交付顺序 | `specs-tree-nda-1-next-tool-channel` → `specs-tree-nda-2-fallback-and-gates`（**硬串行**，叶间不可并行，父 `spec.md §14.1` 三条论证） |
| 为何 3 波 + 3 波 | 沿用两叶 `plan.md §8` 的执行序骨架：nda-1 = **W1 工具通道与捕获 → W2 触发/规则位/门禁改写 → W3 验收/体积/台账骨架**；nda-2 = **W1 分相与提醒 → W2 异常闭集与系统兜底 → W3 验收与治理** |
| 本轮父产物偏差 | 父产出 `tasks.md` / `tasks.json`（**总览型：0 条可执行任务**）—— 父 `spec.md §14.2` 未列父 `tasks.json`；与 v5 / v5.5 / F-34 / F-35 / F-36 先例同口径**显式登记**，可整篇作废而不牵连叶（叶对父的引用 = 「父 FR/AC + `ADR-NDA-0xx` 编号」，不依赖父 `tasks` 物理存在性） |
| ADR 所有权 | `ADR-NDA-001/002/003/004` → nda-1（机制安全核心）；`005/006/007` → nda-2；`008/009` → 两叶各落各式（nda-1 出表 + B 列归因 / nda-2 终态 Σ 与保护段）；`ADR-NDA-101/102` → nda-1 新增；`ADR-NDA-201/202` → nda-2 新增 |
| 编号空间 | `TASK-NDA-1xx`（叶1 `101~120`）/ `TASK-NDA-2xx`（叶2 `201~221`）；与 `TASK-001~040` / `TASK-2xx~3xx` / `TASK-4xx` / `TASK-5xx~8xx` / `TASK-V45-1xx` / `TASK-V5-1xx` / `TASK-V55-1xx~320` / `TASK-V55F-1xx~2xx` / `TASK-IAN-1xx~2xx` / **`TASK-ADN-1xx~2xx`（F-36）** **零冲突**（本 Feature 用 `NDA` 命名空间；**本轮实测**：`.sddu/**` 全库 `TASK-NDA` 零命中 = measured-zero） |
| 波次 | **6 波**（`W01~W06` 全局波序）；叶内 nda-1 `W1~W3` / nda-2 `W1~W3` |
| 两叶串行理由 | nda-2 依赖 nda-1 已建立**工具通道 + `intercept` 捕获 + 5 道校验链接入 + 围栏块替换**：叶2 在叶1 `validated` 前不得启动，否则「工具能产出候选而校验链接入未就位」的中间态会裸放工具参数触达特权 / 不可逆面（`R-NDA-001` / `R-NDA-905` / `N-NDA-021`）（父 `spec.md §14.1` 三条论证） |

### 0.1 模板偏差登记（**任务数 > 15**）

| 项 | 内容 |
|---|---|
| 模板建议 | agent 模板 §5.4 / §8「任务数量控制在 5~15 个之间」 |
| 本轮实际 | **41**（叶1 20 / 叶2 21）；叶1 20（> 15）、叶2 21（> 15） |
| 理由 | ① 编排器排布要求「两叶硬串行 + 每任务挂验收判据 + 红线任务化 + spikeGate 覆盖最高风险点」；② 过并会破坏「**每任务独立可验证**」；③ 与 F-36 父先例（50）/ F-35 父先例（52）/ F-34 父先例（45）同口径显式登记；④ 41 = **可原子执行单元**（≈1 文件内 1 项可验证改动 + 其判据），**不是** LLM 调用数；⑤ 对齐两叶 `plan.md §8` 交付物（nda-1 11 项 → 20；nda-2 10 项 → 21） |

### 0.2 spikeGate 命名偏差登记

两叶 `plan.md` 与 13 个 ADR **未命名** spikeGate 代号。本轮按**编排器排布要求**（明确要求覆盖「`hooks.intercept` 捕获 + `rawArguments` 解析」与「nudge 回调内续呼」两个最高风险点）落为**先验闸门** 3 个：`SG-NDA-01`（叶1 W1：捕获 + `rawArguments` 严格解析 + 合成 `ToolResult` 短路 dispatch + 不上流）/ `SG-NDA-02`（叶1 W2：`ai-led` 独立规则位等价重锚 + 密度 / 门禁可判）/ `SG-NDA-03`（叶2 W1：nudge `chat` 回调内续呼 + 有界 + 零计数漂移）。探针产物**不落版本库**（`packages/web-cli-plugin/test/_spike/` 探毕删除）。

### 0.3 tasks 级波次细化登记（与叶 `plan.md §8` 的显式差异）

| 项 | 内容 |
|---|---|
| 差异 1 | 叶1 `plan.md §8` 的步 3（校验链接入）与步 1~2 分列；tasks 级把**解析入口 + 围栏块删除 + `validateAiNext` 改签名**合入 **W1 单任务**（`TASK-NDA-105`），并把「`intercept` 接线 + 流面过滤 + 装配改造」合入（`TASK-NDA-107`）—— 因为 `parseNextToolArguments` / `validateAiNext` / `intercept` 三者共享同一 `turnState` 契约，拆开会产生**不可编译的中间态**（违背「每任务独立可验证」） |
| 差异 2 | 叶1 步 5（门禁改写 + 反证族）在 tasks 级拆为 **4 个任务**（`111` 改写主体 + AI-N-1/12 / `112` 反证族 + AI-N-13/14 / `113` `recommendation-sources` ③ / `114` 保留面零改复核），落 **W2**（与规则位重锚同轮，保证每波收口有可测对象） |
| 差异 3 | 叶2 步 7（门禁重锚 + 保护段 + 台账终态）在 tasks 级把**保护段 `keep` 决策**并入台账终态任务（`TASK-NDA-218`），把**门禁守恒终态对账**独立为 `TASK-NDA-220`（共享面「恰一次」+ 收口轮终局） |
| 未变 | 两叶的波次数（各 3）与叶间硬串行**不变**；父 `plan.md` / ADR 的语义与顺序**不变**；仅任务归属与同轮约束细化 |

---

## 1. 波次总表（6 波 · 2 叶硬串行）

| 全局波 | 叶 | 叶内波 | 名称 | 任务 | 任务数 | 规模 |
|:--:|:--:|:--:|---|---|:--:|---|
| **W01** | nda-1 | W1 | 工具通道与捕获（`tools/next-tool.ts` NEW + `host.ts` 注册 + `parity` 条目 + `ai-next.ts` 解析入口/删围栏块 + `ref-context.ts` 删提示句 + `service-worker.ts` `intercept`/`turnState`/events 过滤/装配；**SG-NDA-01**） | `101`–`107` | 7 | S×4 / M×1 / L×2 |
| **W02** | nda-1 | W2 | 触发与门禁改写（`ai-led` 规则位 + `NEXTSTEP_PRIORITY` 恰 5 + provider `rule` + `ai-next-candidate` 改写 + 反证族 + `recommendation-sources` ③ + 保留面零改复核；**SG-NDA-02**） | `108`–`114` | 7 | S×2 / M×4 / L×1 |
| **W03** | nda-1 | W3 | 验收与登记（S0'''' 主线 A / 支线 B·D node + Chromium 断言增量/样本重锚 + `gate-integrity` 下界 + 体积叶1 重登记 + X-NDA 骨架 + 红线巡检）（收口轮） | `115`–`120` | 6 | S×1 / M×4 / L×1 |
| **W04** | nda-2 | W1 | 分相与提醒（`free-input.when` 分相 + 未配置引导复核 + `next-drive-policy.ts` `shouldNudge`/`NUDGE_TEXT` + SW `chat` 回调 nudge + `free-input-next` 重锚 + R8/零死端保留；**SG-NDA-03**） | `201`–`207` | 7 | S×2 / M×4 / L×1 |
| **W05** | nda-2 | W2 | 异常与兜底（`abnormalVerdict` 闭集 + `AiNextPayload.abnormal?` + SW `onFinish(outcome)` 装配 + `llm.abnormal` 第 13 行 + 面板只消费 + `driver-quadruple`/`next-registry` 12→13 + 四处恰 N 不动 + AI-N-15 + 首开零改确认） | `208`–`215` | 8 | S×1 / M×7 / L×0 |
| **W06** | nda-2 | W3 | 验收与治理（S0'''' 支线 C/D/E 终态 + Chromium 面 + X-NDA 台账终态 + 保护段 `keep` + 体积叶2 重登记 + 两叶 Σ + 门禁守恒终态对账 + 红线巡检/人工面）（收口轮·终局） | `216`–`221` | 6 | S×0 / M×5 / L×1 |
| **合计** | 2 叶 | — | — | `TASK-NDA-101~221` | **41** | **S×10 / M×25 / L×6** |

**跨叶次序**：`W01~W03`（nda-1 全绿 / `validated`）→ `W04~W06`（nda-2）。叶间**硬串行**（裁决 `BLK-NDA-9`）。

---

## 2. 两叶任务索引（41 条；正文见各叶 `tasks.md`）

### 2.1 nda-1 `specs-tree-nda-1-next-tool-channel`（**20 · `TASK-NDA-101~120` · 3 波**）

| 任务 | 波 | 规模 | 类型 | 标题 | 关键判据 / 门禁 |
|---|:--:|:--:|---|---|---|
| `101` | W1 | M | spike | **SG-NDA-01** `intercept` 捕获 + `rawArguments` 严格解析 + 合成 `ToolResult` 短路 dispatch + 不上流 可行性探针 | 零改基座 / 零新 kind 可预演 |
| `102` | W1 | S | impl | `src/tools/next-tool.ts`（NEW）：工具名 / schema（enum 派生 7）/ `description` 三约束 / `listed:false` / fail-closed `executor` | schema 与 `AiNextCandidate` 同构 |
| `103` | W1 | S | impl | `host.ts` always-registered 段注册 `next` ⇒ `deriveTools()` 含 `next` | 既有注册行零改 |
| `104` | W1 | S | impl | `test/parity/waivers.json#pluginExtras['next']`（reason + basis 非空） | 位置订正 `COR-NDA-6` / 旧条目逐字 |
| `105` | W1 | L | impl | `ai-next.ts`：`parseNextToolArguments`（NEW）+ 删围栏块四符号 + `validateAiNext(candidates,facts)` 改签名 + `admitCandidate` 逐字保留 | 5 道链语义零变 / `tc.args` 零使用 |
| `106` | W1 | S | impl | `ref-context.ts` 删 `NEXT_CONTRACT_GUIDANCE` 与注入（`REF_SCOPE_GUIDANCE` 保留） | 触发无条件（提示侧） |
| `107` | W1 | L | impl | `service-worker.ts`：`hooks.intercept` 接线 + `turnState`（覆盖式）+ events 过滤（`onCommandLine`/`onToolOutput`）+ `onFinish` 装配改造 | 短路 dispatch / `next` 不上流 / 未配置不下发 |
| `108` | W2 | M | spike | **SG-NDA-02** `ai-led` 独立规则位等价重锚 + 密度 / 门禁可判探针 | 行为等价（AI 仍优先 `ref-action`） |
| `109` | W2 | S | impl | `recommend.ts` `NEXTSTEP_PRIORITY` 恰 5（`ai-led` 第 2 位）+ `NEXTSTEP_LABELS.ai-led` | 逐项值可复算 |
| `110` | W2 | S | impl | `providers.ts` `ai-next.rule='ai-led'` + `RULE_PROVIDER_IDS` 追加 + `DRIVER_DECLS_SRC` 逐字 | `when` 逐字不变 / 恰 12 保持（叶1） |
| `111` | W2 | L | gate | `ai-next-candidate` 改写：AI-N-1 换机制 + AI-N-2~11 语义对账 + AI-N-12（schema 单源） | `assertionsRemoved = 0` |
| `112` | W2 | M | gate | `ai-next-candidate` 反证族：五类注入必红 + AI-N-13（不上流）+ AI-N-14（`tc.args` 零使用）+ 真源切片 / 三段控制 | 注入 ⇒ FAIL ⇒ 逐字节还原 |
| `113` | W2 | M | gate | `recommendation-sources` ③ 恰 4 → 恰 5 等价重锚 + 注入「恰 4」必红 | ①~④ 零删除 / 白名单恒 5 |
| `114` | W2 | M | gate | 保留面零改复核（`driver-timings` 恰 5 / `driver-quadruple` 12↔12 / `op-wiring` 计数 / `op-three-tier` / `sw-op-mirror` / `next-dispatch-diff0` / `insight-no-escalation` / `ref-context-in-turn` / `cards/nextstep`） | 零改 = 绿；若红 = 实现缺陷 |
| `115` | W3 | L | gate | **S0'''' 主线 A / 支线 B / 支线 D** node 面（真源切片 + 双向反证 + 三段控制） | 非法候选逐类 `blocked=` 且不渲染 |
| `116` | W3 | M | gate | `test/ui/s0-self-driven.mjs` + `fixtures/s0-chain.mjs` 样本重锚（只加断言）+ `law8-plaintext.mjs` 零明文面 | `CHROMIUM_GATES === 9` |
| `117` | W3 | S | gate | `gate-integrity` 受审下界只增（改写门禁入集合） | 下界 ≥ 前值 / Chromium 恰 9 |
| `118` | W3 | M | doc | 体积叶1 重登记（五要素 + 三值 + `nda1Rows` + B 列不计账 + EC-NDA-016 二态） | 禁预填 / `authorConfirmation` 不得伪称 |
| `119` | W3 | M | doc | `xNdaLedger` 骨架（X-1/2/5/7/8 superseded + X-6/9/12 keep/no-supersession）+ `xNdaGateReconciliation` 叶1 行 | 老条目逐字 / 计数只增 |
| `120` | W3 | M | doc | 红线巡检 + 本叶收口对账（零改基座 / 冻结面 / 断言零删除 / 停机规则） | 三冻结面零容差 / `assertionsRemoved = 0` |

### 2.2 nda-2 `specs-tree-nda-2-fallback-and-gates`（**21 · `TASK-NDA-201~221` · 3 波**）

| 任务 | 波 | 规模 | 类型 | 标题 | 关键判据 / 门禁 |
|---|:--:|:--:|---|---|---|
| `201` | W1 | M | spike | **SG-NDA-03** nudge `chat` 回调内续呼 + 有界 + 零计数漂移 可行性探针 | 同回合 / 会话零污染 |
| `202` | W1 | M | impl | `background/next-drive-policy.ts`（NEW）：`shouldNudge` 五条件 + `NUDGE_TEXT` | 纯函数 / `nudgeUsed` 首闸 |
| `203` | W1 | S | impl | `providers.ts` `free-input.when` 分相（`!risk.includes(LLM_BLOCKED_RISK)` ∧ `session.busy` 保留） | 两相可判 / DQ-3 同源 |
| `204` | W1 | L | impl | `service-worker.ts` `chat` 回调接线（`configured` 单源 + nudge 续呼 + 局部 turn + `nudgeUsed` 先置位） | 零新增 `requestTurn(`/`nextAfterSettle` |
| `205` | W1 | S | impl | 未配置确定性引导复核（`llm.unconfigured` → `OPS_RECOVERY_ROWS` → `op.llm-config` 可达 + 零 token 不破） | 零新增引导面 |
| `206` | W1 | M | gate | `free-input-next` 分相重锚（FIN-0~9 只增 + 双向反证非恒真） | 已配置相恒常驻不回归 |
| `207` | W1 | M | gate | `r8-open-next-entry` 保留零改 + `no-dead-end` 未配置相覆盖（只增） | R8-1~6 绿且零改 |
| `208` | W2 | M | impl | `next-drive-policy.ts` `abnormalVerdict` 闭集三情 + `definition.ts` `AI_ABNORMAL_CODES` + `AiNextPayload.abnormal?`（type-only 单源） | 恰一处声明 / ∉ `KIND_SET` |
| `209` | W2 | M | impl | `service-worker.ts` `onFinish(outcome)` 消费 + `abnormal` 附加 + `hasAiNext` 扩展 + 事件作用域一次性 | 缺席 ⇒ 现状逐字 |
| `210` | W2 | M | impl | `providers.ts` `llm.abnormal` 第 13 行 + `LLM_ABNORMAL_RISK` + `DRIVER_DECLS_SRC` 第 13 行 + 文案分相 | chip = `op.llm-config`（零新 op） |
| `211` | W2 | M | impl | `sidepanel.ts` `noteLlmAbnormalFact` + `risk` 折叠 + `consumeAiNext` 只消费 | 面板零第二分类器 |
| `212` | W2 | M | gate | `driver-quadruple` 12→13 + `next-registry` NR-10 12→13（逐项同集 + 幽灵行必红） | 判据可 FAIL |
| `213` | W2 | M | gate | 四处恰 N 不动（`BLOCKED_TERMINALS` 5 / `OPS_RECOVERY_PROVIDER_IDS` 2 / `RECOVERY_PROVIDER_IDS` 5 / `DRIVER_TERMINALS` 4 / `PROACTIVE_MOMENTS` 7 / `DRIVER_TIMINGS` 5 / `NEXT_SOURCE_NAMES` 7） | `llm.abnormal` 不入三集合 |
| `214` | W2 | M | gate | `ai-next-candidate` **AI-N-15**：`shouldNudge` 有界 + `abnormalVerdict` 三情 + 两文案相异 + 分相非恒真 | 新增断言只增 |
| `215` | W2 | S | doc | 首开零行为改动确认 + `PD-NDA-001` / `PD-NDA-016` 登记 | R8 地板不动 |
| `216` | W3 | L | gate | **S0'''' 支线 C / D / E 终态** node 面（注入必红 + 逐字节还原） | 四相全覆盖 |
| `217` | W3 | M | gate | Chromium 面：`s0-self-driven.mjs` + `recommendation.mjs` + `law8-plaintext.mjs`（只加断言）+ 人工面 `⏳` | `CHROMIUM_GATES === 9` |
| `218` | W3 | M | doc | `xNdaLedger` 终态（X-3/4/10/11）+ `xNdaLedgerFull` 全 12 条 + 保护段 `keep` 决策 | 保护段双绿（sha + `startByte`） |
| `219` | W3 | M | doc | 体积叶2 重登记 + **两叶 Σ** + EC-NDA-016 三分支终态 | `authorConfirmation=pending-author-line` |
| `220` | W3 | M | gate | 门禁守恒终态对账（三态齐 / `assertionsRemoved = 0` / 间接面 / 串行 / `KL-N-10` 隔离复跑 ≥2） | `CHROMIUM_GATES === 9` |
| `221` | W3 | M | doc | 红线巡检 + 人工面 M1~M6 如实登记 + 本叶收口对账 | 不冒充 PASS |

---

## 3. 体积分列预算逐叶分摊（**A/B/C 列；距档 9,798 B**）

**统一前提（`ADR-NDA-008` §①②；`spec §5.14.1`；本轮只读复核、未复跑）**：A 列基线 `dist/sidepanel.js` **604,602 B**（`size-baseline.ts:389`）· 生效上限 `floor(604,602 × 1.05) = `**`634,832 B`**（余量 **30,230**）· **档位 614,400 B**（**距档 9,798 B，薄**）· 绝对上限 **675,840 B** · `authorConfirmation = pending-author-line`（**未闭合义务**）· C 列冻结面 `content.js` **177,076 B** / `pick-layer.js` **34,358 B** / `KIND_SET` **40** · B 列 `dist/background.js`（**不计入 sidepanel 账本**）。

| 预算口径 | 叶1（nda-1 工具通道 + 捕获 + 门禁改写） | 叶2（nda-2 分相 + 提醒 + 兜底 + 重锚） | Σ | +15% 缓冲 | 结论 |
|---|--:|--:|--:|--:|---|
| **A 列（sidepanel 净增；plan 工程估算）** | **+0.1 ~ +0.5 KB** | **+0.6 ~ +1.4 KB** | **+0.7 ~ +1.9 KB** | **+0.8 ~ +2.2 KB** | 距档 **9,798** ⇒ **正常口径不触发升档**；生效上限余量 30,230 ⇒ 远未越 |
| **A 列判据包线（`spec §5.14.1` 保守口径，**评审取此**) | 薄接线 | 分相 / 兜底接线 + 重锚 | **+0.8 ~ +2.4 KB** | **+0.9 ~ +2.8 KB** | 判据口径取**更紧者**（`ADR-NDA-008 §②` 口径与纪律 ③） |
| **B 列（`background.js`，不计账）** | **+1.3 ~ +4.0 KB**（工具 def + `intercept` + 捕获/校验 + 装配；含 `ref-context` 负增量） | **+1.9 ~ +3.6 KB**（提醒编排 + 异常判定 + 兜底接线 + 分相终态） | **+3.2 ~ +7.6 KB** | — | **不计入 sidepanel 账本**（B 列优先的唯一理由 = 旁路档位压力） |
| **2.8× 最坏（A Σ plan 上界 1.9 KB）** | — | — | **≈5.3 KB** | **≈6.1 KB** | 仍 < 9,798（余量 ≈3.7 KB） |
| **2.8× 最坏（A Σ 包线上界 2.4 KB，**判据取此**) | — | — | **≈6.7 KB** | **≈7.7 KB** | **仍 < 9,798，但余量仅 ~2.1 KB（薄）⇒ 预置 EC-NDA-016 + 作者一行** |

**波内标注（逐波落地项与增量归因）**：
- nda-1 **W01**：工具 def + 注册 + `parity` + 解析入口 + 删围栏块 + `ref-context` 删句 + SW 接线（**B 列主体，不计账**；A 列 ≈ 0）⇒ A 列薄。
- nda-1 **W02**：`NEXTSTEP_PRIORITY` 恰 5 + provider `rule` 字面量（**A 列叶1 主体，+0.1~0.5 KB**）⇒ `TASK-NDA-118` 收口登记。
- nda-1 **W03**：门禁 / 断言 / 体积重登记（**A 列薄 + 登记**）。
- nda-2 **W04**：分相 `when`（A 列微）+ nudge（**B 列**）。
- nda-2 **W05**：`llm.abnormal` 第 13 行 + 面板 risk 折叠 + `definition` 闭集（**A 列叶2 主体，+0.6~1.4 KB**）⇒ 落完立即实测，再进门禁重锚（`plan §8` 步序纪律）。
- nda-2 **W06**：验收 / 台账 / 体积 Σ（**登记 + 记账**）⇒ `TASK-NDA-219` 收口登记（含两叶 Σ）。

**逐叶收口重登记点**：nda-1 `W03` ⇒ `TASK-NDA-118`（A 列叶1 正增量 + 五要素 + 三值 + 逐模块行 `nda1Rows` + B 列不计账标注）；nda-2 `W06` ⇒ `TASK-NDA-219`（A 列叶2 + 五要素 + 三值 + `nda2Rows` + **两叶 Σ** + EC-NDA-016 三分支）。

**越限 EC-NDA-016 任务化（逐分支；`TASK-NDA-118` / `TASK-NDA-219` 承载）**：

| 分支 | 触发 | 动作 |
|---|---|---|
| ① | 越**生效上限** `> 634,832` | **显式重登记基线**（`SIDEPANEL_BASELINE_BYTES` 同源前移 + 五要素 + 三值），**不触发档位、不需作者一行** |
| ② | 越**档位 614,400** | 走 **EC 显式升档路径**（档位 → `ceilTo50KB(实测)`；绝对上限 → 档位 × 1.10）+ **作者一行** |
| ③ | 越**绝对上限 675,840** | **停止实现并请示作者** |
| — | `authorConfirmation` | 保持 `pending-author-line`，**不得伪称已确认**（`N-NDA-013`） |

**减体积优先级（越预算时按序执行）**：① 复用既有 `nextstep` 渲染面（**零新渲染面**）；② 复用既有文案 / 静态模板；③ 元组化声明数据；④ 纯记账 / 判定下移 `background.js`（不计账，须过 `FR-NDA-145` 反证：**不得为绕门禁搬码**）；⑤ **显式登记**未落地项（**绝不以删判据 / 放宽容差 / 静默下调档位实现**）。

**B 列优先的诚实登记（`R-NDA-906` / §5.14.1 口径③）**：捕获 / 解析 / 5 道校验 / 装配 / nudge 编排 / 异常判定落 `background`（不计账）；但 **B 列优先 ≠ B 列无成本** —— 本总表**同时**给出 B 列预算（叶1 +1.3~4.0 KB / 叶2 +1.9~3.6 KB），收口如实登记；**不得**把 A 列改动搬进 B 列规避账本。

---

## 4. 共享面「恰一次」登记（`FR-NDA-002 / 005 / §16 第 12 条`；**禁止两叶各改一次**）

| 共享面 | 主责叶 | 任务 | 检查 |
|---|---|---|---|
| **体积** | 各叶登记自身增量；两叶 Σ 在叶2 | `TASK-NDA-118` / `TASK-NDA-219` | 五要素 + 三值同源 + 逐模块归因（Σ 逐模块 Δ + 未归因 == 登记增量）+ B 列不计账显式登记 + EC-NDA-016 二态/三态 |
| **门禁对账** | 叶1 骨架 / 叶2 终态 | `TASK-NDA-119` / `TASK-NDA-220` | 三态齐（保留 / 等价重锚 / 显式取代）+ 间接面逐条确认 + `assertionsRemoved=0` + `CHROMIUM_GATES === 9` |
| **取代台账** | 各叶各登各的条目（台账文件只追加） | `TASK-NDA-119` / `TASK-NDA-218` | 叶1 登 X-1/2/5/7/8 + X-6/9/12；叶2 增 X-3/4/10/11 + `xNdaLedgerFull` 终态；老条目逐字保留 |
| **保护段** | 叶2（本 Feature 预期零改动 ⇒ `keep` 字节中立） | `TASK-NDA-218` | journey `[43484,59347)` sha `7b309258…` / binding `[107780,115930)` sha `be9ad0e9…`；`startAnchor`/`endByte`/sha 双绿；**零改动**两文件 |
| **S0'''' 双面** | 样本单源（`test/ui/fixtures/s0-chain.mjs` 重锚，禁第二份）；node 叶1 落主/B/D，Chromium 叶1 只加断言；叶2 五支线终态 | `TASK-NDA-115` / `116` / `216` / `217` | 两侧独立计数禁互相掩盖；真源切片读生产模块（禁假 provider / 桩，`R-NDA-909`） |
| **人工面** | 各叶各登本叶项 | `TASK-NDA-116` / `TASK-NDA-221` | M1~M6 逐项 `⏳ 未执行` / `PASS`，不得冒充 PASS；v5.5 / F-34 / F-35 / F-36 人工面零改写 |
| **零新 LLM 往返（主链）** | 两叶共同不破（叶1 建、叶2 保持；**提醒轮 = 唯一有界例外，恰 1**） | `TASK-NDA-105` / `107` / `111` / `204` / `214` | `recommend.ts` 源码零 `fetch(`·`chrome.`·时钟；`recommendation-sources` ④ 保持绿；提醒往返 ≤1 |
| **`shared/op-table.ts` 双面** | 叶1 一次做完读面（捕获 / 校验读同一单源）；两侧镜像 | `TASK-NDA-105` / `TASK-NDA-114` | `sw-op-mirror` 绿；A/B 侧副本都记（B 侧不计账） |
| **`DRIVER_DECLS_SRC` 手写第二源** | 叶1 逐字不动（恰 12）；叶2 加第 13 行（恰 13） | `TASK-NDA-110` / `TASK-NDA-210` / `212` | `evidence` 与 `when` 实读同源（DQ-3）；「恰 12」只由叶2 重锚一次 |

---

## 5. S0'''' 五支线双面落点表（`spec §5.11` / `FR-NDA-100~106`）

| 支线 | 场景 | 期望 | node 面（叶1 建 / 叶2 终态） | Chromium 面（只加断言） |
|---|---|---|---|---|
| **A 主线** | 已配 ∧ `done` ∧ LLM 调 `next` 工具产出合法候选 | 过 5 道校验 ⇒ chips（≤3）∧ 单卡 ∧ 已配置终端恒最末 | `TASK-NDA-115`（骨架，叶1） | `s0-self-driven.mjs`（`TASK-NDA-116` → `TASK-NDA-217`） |
| **B 被拦** | 已配 ∧ 非法候选（幻觉 op / `gesture` op / 越界 ref / param 越界 / label 越界） | 逐类 `blocked=<code>` + **可读留痕**（零明文）∧ **不渲染为 chip** ∧ 注册表兜底 + 终端 | `TASK-NDA-115` | 同上 |
| **C 未产出（提醒用尽）** | 已配 ∧ 提醒轮仍无 `next` / 解析失败 / 空数组 | 零合法候选 ⇒ 确定性产卡（含 floor）+ **系统兜底推荐** | `TASK-NDA-216`（叶2） | `TASK-NDA-217` |
| **D 未配置** | 未配 LLM | **零候选产出（零网络 / 零 token）+ 不下发工具** + 确定性「去配置 LLM」引导 ∧ **无自由输入终端** | `TASK-NDA-115`（叶1 只证「不下发」）→ `TASK-NDA-216`（终态） | `TASK-NDA-217` |
| **E 首开** | 首开（`authorized ∧ configured`） | **确定性**路径（capability-discovery + 终端）∧ 零 LLM 往返依赖 ∧ 让位 `firstRun`（零双卡） | `TASK-NDA-216` | `TASK-NDA-217` |

**S0''''-1~12 步映射**：1 工具产出结构化候选（`intercept` 捕获）/ 2 无条件触发（无引用仍驱动 ∧ 未配置不驱动）/ 3 提醒补一次（有界；再未捕获 ⇒ 不再提醒）/ 4 未配置 ⇒ 确定性引导 ∧ **无** `.next-terminal` / 5 已配置 ⇒ 终端恒在（恒最末）/ 6 非法候选被拦 + 留痕（四类各 `blocked=`）/ 7 系统兜底三情形各 ⇒ `op.llm-config` 可达 / 8 判定分层（`confirm`：`admit=true ∧ press=blocked:tier`；`gesture`：`admit=false`）/ 9 围栏块通道已替换（单一产出通道）/ 10 零新增载体（`KIND_SET` 40 / 12 kind / 零宿主 / `ACT_TO_OP` 6）/ 11 首开确定性 / 12 留痕三要素 + 零明文。**驱动经既有测试缝注入已解析候选 / 捕获态**（`__v3.testing` 测试缝，非生产第二入口，`NFR-NDA-013`）。

---

## 6. spikeGate 清单与结论义务

| 代码 | 任务 | 叶/波 | 假设（被验证者） | 被闸门任务 | 结论义务 / 停止规则 |
|---|---|---|---|---|---|
| **SG-NDA-01** | `TASK-NDA-101` | nda-1 / W1 | **`hooks.intercept` 捕获可行 + `tc.rawArguments` 严格 `JSON.parse` 保真 + 合成 `ToolResult` 短路真实 `dispatch` + `next` 不上流**：`tc.args` 零使用（`parseToolArguments` 丢数组）；解析失败 ⇒ 未产出不抛错；流面零 `command` / 零 `tool:'next'`；**零改基座 / 零新 kind** | `102` / `103` / `105` / `107` / `111` / `112` | 不可行 ⇒ **暂停上报**；**禁**读 `tc.args` / 禁改基座 / 禁新增 kind / 禁让 `next` 走真实 dispatch |
| **SG-NDA-02** | `TASK-NDA-108` | nda-1 / W2 | **`ai-led` 独立规则位与 F-36 行为等价可证 + 密度 / 门禁可判**：`ai-led` 位次高于 `ref-action` ⇒ 有引用时 AI 仍优先；`when` 逐字不变；`NEXTSTEP_PRIORITY` 恰 5 逐项可复算；`MAX_NEXTSTEP_CARDS_PER_ROUND=1` / `MAX_CHIPS_PER_CARD=3` / 密度阈值 7/15·9/20·17/35 逐字不动 | `109` / `110` / `113` / `114` / `118` | 不可行 ⇒ **暂停上报**；**禁**新增第 6 规则位 / 禁多卡 / 禁抬密度阈值 / 禁绕过 `candidateRules` |
| **SG-NDA-03** | `TASK-NDA-201` | nda-2 / W1 | **nudge 可在 SW `chat` 回调内同回合续呼且零计数漂移**：`nudgeUsed` 每回合局部（有界恰一次）；nudge turn 不进会话（`session.snapshot()` 可判）；零新增 `requestTurn(`/`nextAfterSettle`/`runChatTurn(` 调用点；`DRIVER_TIMINGS` 恰 5 | `202` / `204` / `206` / `213` / `214` | 不可行 ⇒ **暂停上报**；**禁**新增回合容器 / 禁改 `onToolDone` 语义 / 禁新增计数调用点 / 禁进会话历史 |

**结论义务（全部 3 个）**：spike 结论须以「假设 / 探针方法 / 实跑证据 / 结论（可行 / 不可行）」五要素写入对应叶的 build 记录；**结论 = 不可行 / 不可构造** ⇒ 对应「被闸门任务」**不得开工**，且按停止规则上报（`blockers`）。**探针产物不落版本库**（`test/_spike/` 探毕删除）。

---

## 7. 门禁三态总表（**新增断言 / 等价重锚 / 显式取代 / 保留；禁漏项**）

> **基线口径（诚实登记）**：基线数引自 `spec §9.5` + `ADR-NDA-009 §④`（引自 F-36 收口 + 本轮只读实测，**本轮未复跑**）。⇒ **重锚一律按「断言语义 + 语义增量」**，不按陈旧字面量；收口按实测同源前移。**无新增门禁文件**（`ai-next-candidate` 为**改写**）；**`CHROMIUM_GATES === 9` 逐字不动**。

### 7.1 三态逐条清单（25 行 + 间接面）

| # | 层 | 门禁 | F-37 起点基线（引用） | 三态 | 处置要点 | 承载任务 |
|:-:|:-:|---|--:|---|---|---|
| 1 | node | `test/ai-next-candidate.test.ts` | 族内（F-36 AI-N-1~11） | **显式取代（改写）+ 新增断言** | AI-N-1 围栏块 → 工具捕获；AI-N-2~11 语义对账；**+AI-N-12**（schema 单源）/ **+AI-N-13**（不上流）/ **+AI-N-14**（`tc.args` 零使用）/ **+AI-N-15**（叶2：nudge 有界 + 异常三情 + 分相） | `111` / `112` / `214` |
| 2 | node | `test/parity.test.ts` + `test/parity/waivers.json` | 族内 | **等价重锚（间接）** | `pluginExtras['next']`（reason + basis 非空；**位置订正 `COR-NDA-6`**）；`baseline-catalog.json#toolCount` 34 **零改** | `104` |
| 3 | node | `test/recommendation-sources.test.ts` | 族内 | **显式取代** | ③ `NEXTSTEP_PRIORITY` 恰 4 → **恰 5**（逐项复算 + 注入「恰 4」必红）；①~④ 白名单恒 5 / 真值 7 **零删除** | `113` |
| 4 | node | `test/driver-timings.test.ts` | 族内 | **保留** | DT-2 恰 5 / DT-3 旧 4 逐字 / DT-4 调用点 / 零新增触发词 | `114` / `220` |
| 5 | node | `test/driver-quadruple.test.ts` | 恰 12 | **等价重锚** | 12↔12 → **13↔13**（`llm.abnormal` 第 13 行 + 逐项同集 + 幽灵行必红） | `212` / `220` |
| 6 | node | `test/op-wiring.test.ts` | 14 | **保留** | `requestTurn(` 恰 1 / `maybeRecommend` 1·8 / `nextAfterSettle` 1·10 **零变** | `114` / `213` / `220` |
| 7 | node | `test/turn-arbitration.test.ts` | 7 | **保留** | 四值逐字；nudge 无独立回合 ⇒ 更强满足 | `204` / `214` / `220` |
| 8 | node | `test/op-three-tier.test.ts` | 族内 | **保留** | `tierOf` 派生式 + 特权恒 `gesture`；零第二档位表 | `105` / `111` / `114` |
| 9 | node | `test/proactivity-guard.test.ts` | 族内 | **保留** | 六常量单源；nudge 不绕护栏；零第二阈值 | `204` / `213` |
| 10 | node | `test/sw-op-mirror.test.ts` | 族内 | **保留** | 双面一致（捕获 / 校验读同一单源） | `105` / `114` |
| 11 | node | `test/gate-integrity.test.ts` | 24 | **等价重锚** | 受审下界**只增**（改写门禁入集合）；`CHROMIUM_GATES === 9` 逐字不动 | `117` / `220` |
| 12 | node | `test/r8-open-next-entry.test.ts` | R8 新 | **保留** | 首开入口单源 / 复用 `'idle'` / 零死端 floor / 让位 `firstRun`；**零改** | `207` / `215` |
| 13 | node | `test/free-input-next.test.ts` | 22 | **显式取代** | 恒真 → `risk.llmBlocked` 分相（两相各可判 + 双向反证）；已配置相**仍恒常驻**；FIN-0~9 只增 | `203` / `206` |
| 14 | node | `test/supersession-ledger.test.ts` | 53（F-36 收口） | **保留 + 新增** | `xNdaLedger` / `xNdaGateReconciliation` / `xNdaLedgerFull` 判据 + 保护段决策 | `119` / `218` |
| 15 | node | `test/insight-no-escalation.test.ts` | 族内 | **保留** | `../web-cli-base` 零 diff（只复用 `intercept` 缝） | `114` / `120` |
| 16 | node | `test/size-baseline.ts` / `size-ruling-vol3.test.ts` | 13 | **等价重锚 / 新增登记** | 逐叶五要素 + 三值 + 逐模块 `nda1Rows`/`nda2Rows` + 两叶 Σ + B 列不计账 + EC-NDA-016 | `118` / `219` |
| 17 | node | `test/next-dispatch-diff0.test.ts` | 族内 | **保留** | 集 B 零 per-op 分支 + `ACT_TO_OP` 恰 6 | `114` |
| 18 | node | `test/driver-terminals.test.ts` / `blocked-terminals.test.ts` | 族内 | **保留** | `DRIVER_TERMINALS` 4 / `BLOCKED_TERMINALS` 5 / `OPS_RECOVERY_PROVIDER_IDS` 2 / `RECOVERY_PROVIDER_IDS` 5 **均未变** | `213` |
| 19 | node | `test/next-registry.test.ts` | 族内 | **等价重锚（间接）** | NR-10 声明行 12 → **13**；NR-0 顶层 7 源保持 | `212` |
| 20 | Chromium | `test/ui/s0-self-driven.mjs` + `fixtures/s0-chain.mjs` | 族内 | **等价重锚 + 断言增量** | 样本重锚为「工具捕获」；五支线断言；**只加断言不加文件** | `116` / `217` |
| 21 | Chromium | `test/ui/recommendation.mjs` | 79 | **等价重锚** | AI 候选渲染 / 分相终端 / 兜底 chip | `217` |
| 22 | Chromium | `test/ui/law8-plaintext.mjs` | 60 | **等价重锚（零降级）** | 工具参数 / label / 留痕零明文面 | `116` / `217` |
| 23 | Chromium | `test/ui/journey.mjs` | 171 | **保留（保护段 keep）** | **零改动** ⇒ 字节中立双绿 | `218` |
| 24 | Chromium | `test/ui/binding.mjs` | 192 | **保留（保护段 keep）** | **零改动** ⇒ 字节中立双绿 | `218` |
| 25 | Chromium | `test/ui/{l0,l1,no-dead-end}.mjs` | 251 / 132 / 53 | **保留 / 等价重锚** | 零死端**新增未配置相与异常相覆盖**（只增）；法八零降级 | `217` |

> **间接 / 对账面（不计入上表主项，逐条确认无遗漏）**：`test/op-protocol.test.ts` / `test/next-obligation-table.test.ts`（`ai-next` 静态 `chips`）/ `test/chat-events.test.ts` / `test/settings.test.ts` / `test/design-contract.test.ts`（契约计数）/ `test/ref-context-in-turn.test.ts`（`COR-NDA-12`：只断言 `REF_SCOPE_GUIDANCE` ⇒ 删契约句**零门禁代价**）/ `test/capability-wiring.test.ts`（特权恒 `gesture`）。**`CHROMIUM_GATES === 9` 不动**（**不新增 Chromium 门禁文件**）。**`assertionsRemoved = 0`**。

### 7.2 新增 / 改写 / 新增登记（**无新增门禁文件**）

| 类别 | 项 | 叶 | 承载任务 | 关键判据 |
|---|---|:--:|---|---|
| **改写门禁（1 文件）** | `test/ai-next-candidate.test.ts`（AI-N-1 换机制 + AI-N-1~11 语义对账） | 叶1（+叶2 增量） | `111` / `112` / `214` | `assertionsRemoved = 0` + 对账表（按**断言语义**，非行数） |
| **新增断言** | **AI-N-12~14**（叶1）+ **AI-N-15**（叶2） | 叶1 / 叶2 | `111` / `112` / `214` | 每条可 FAIL + 三段控制 |
| **新增门禁条目（非文件）** | `test/parity/waivers.json#pluginExtras['next']` | 叶1 | `104` | reason + basis 非空；反证「删条目 ⇒ 必红」 |
| **新增登记（非门禁）** | `SIDEPANEL_GROWTH_BREAKDOWN += nda1Rows / nda2Rows` + `SIDEPANEL_BASELINE_BYTES_TIMELINE` 追加 | 叶1 / 叶2 | `118` / `219` | 五要素 + 三值同源 + 算术机核 |

> 该改写门禁须由 `test/gate-integrity.test.ts` 的受审下界**只增**（`TASK-NDA-117` / `TASK-NDA-220`）；**`CHROMIUM_GATES === 9` 逐字不动**。

### 7.3 门禁基线守恒（**只增不减**）

`npm test` **≥1507**（`state.json#domainBaseline.npmTestCount = 1507`，**引自 F-36 closeout 自报；本轮未复跑**）· `op-wiring` **14**（`requestTurn(` **恰 1** 不动）· `gate-integrity` 24→**≥25** · `supersession` **≥53** · `free-input-next` **≥22** · `turn-arbitration` **≥7** · `density` **≥242** · `size-ruling-vol3` **≥13** · `driver-quadruple` **13↔13** · `next-registry` NR-10 **13** · `law8` **≥60** · `no-dead-end` **≥53** · `recommendation` **≥79** · `l0` **≥251** · `l1` **≥132** · `journey` **≥171**（保护段 keep）· `binding` **≥192**（保护段 keep）· `s0-self-driven` **≥前值** · `r8-open-next-entry`（保留）· `e2e` **PASS** · `CHROMIUM_GATES` **=== 9**。

> 基线引自 `spec §9.5` + `state.json#domainBaseline`（**本轮未复跑**）。**唯一例外** = 保护段按台账**显式取代**并留痕（本 Feature **预期零改动** ⇒ `keep` 字节中立，无需八步取代）。

---

## 8. 红线任务化与停机规则（**14 条**）

### 8.1 红线 → 任务映射（`N-NDA-001~030` / 编排红线）

| 红线组 | 内容（逐字口径） | 承载任务 |
|---|---|---|
| **零改基座**（`N-NDA-007` / `NFR-NDA-005`） | `packages/web-cli-base/**` 零 diff；**只复用** `llm.ts` function calling + `runner.ts` `hooks.intercept`；不 import base 实现（`import type` 仅类型） | `101` / `107` / `114` / `120` / `220` |
| **判定链零触碰**（`N-NDA-018`） | `src/security/policy.ts` / `auto-authorize.ts` `zeroDiffFiles` 9 项哈希 pin | `114` / `120` / `221` |
| **冻结面零容差**（`N-NDA-001/002` / `FR-NDA-142`） | `content.js` 177,076 B / `pick-layer.js` 34,358 B（字节 + sha 双锚） | `118` / `120` / `219` / `221` |
| **零新增载体**（`N-NDA-003/004`） | `KIND_SET` 40 逐字 / 12 kind 契约 / `REGISTERED_STRUCTURAL_HOSTS = []` / `ACT_TO_OP` 恰 6 | `102` / `105` / `111` / `112` / `208` / `214` / `220` |
| **法八四面零明文**（`N-NDA-009`） | 候选 `label` / `params` / **工具参数** / 留痕**不回显值**；合成 `ToolResult.output` 为常量 | `102` / `105` / `112` / `116` / `217` |
| **特权恒手势 + consent 不可代答**（`N-NDA-010/011/016/017`） | `op.authorize` / `op.perm.request` 恒 `gesture`（连提案都拒；且不入 schema `enum`）；`confirm` 由用户作答 | `102` / `105` / `111` / `112` / `210` / `213` |
| **门禁守恒**（`N-NDA-012` / `FR-NDA-130/134/135`） | 断言零删除零降级、计数只增；三态齐（禁漏项）；`assertionsRemoved = 0`；无新增 Chromium 门禁文件 | `111` / `112` / `113` / `114` / `117` / `119` / `206` / `212` / `213` / `214` / `220` |
| **保护段逐段决策**（`N-NDA-015`） | journey / binding `keep`（字节中立双绿）或八步显式取代 + 台账；**禁静默改写** | `218` |
| **单源不可旁路**（`N-NDA-021/022/023` / `NFR-NDA-013`） | 唯一产出通道（`next` 工具）+ 唯一校验器（5 道链）+ 唯一档位单源（`tierOf`）+ 唯一按下路径（`pressCandidate`）+ 唯一分相判据（`risk.llmBlocked`）+ 唯一异常判定（SW）+ 唯一修复 op（`op.llm-config`） | `105` / `107` / `110` / `112` / `114` / `203` / `208` / `210` / `211` |
| **提醒有界**（`N-NDA-024`） | 提醒恰一次；递归 / 自触发 ⇒ FAIL | `202` / `204` / `214` |
| **未配置不得显示自由输入 / 不得被推荐「配置新 LLM」**（`N-NDA-025/026`） | 词表分相（未配置 vs 异常）；两相双向反证 | `203` / `206` / `210` / `214` |
| **首开零 LLM 依赖**（`N-NDA-028`） | 首开 / ready 路径不引 LLM 往返依赖；首屏必有引导 / 终端 | `207` / `215` / `217` |
| **载荷加法字段缺席 ⇒ 现状逐字**（`N-NDA-029`） | `aiNext` / `abnormal` 缺席时面板行为逐字 | `111` / `209` / `214` |
| **未发生取代如实登记**（`N-NDA-030`） | `no-supersession` + 非空理由；留空 / 伪造 ⇒ FAIL | `119` / `218` |
| **纪律**（`N-NDA-020` / `§16`） | 不碰 `main` / 不 force push / path-limited `git add` / 无新依赖 / 不改 `.opencode/opencode.json` / `.sddu` 外零触碰 / ROADMAP 零 diff / `F-29` 区段一字不动 | 各叶 build / validate 记录（`120` / `221` 巡检） |

### 8.2 停机规则

| # | 触发 | 动作 |
|:--:|---|---|
| 1 | `dist/content.js` ≠ **177,076 B** / `52a82620…` 或 `dist/pick-layer.js` ≠ **34,358 B** / `77796bab…` | **立即停机**（`N-NDA-001/002` 零容差） |
| 2 | `manifest.json` / `packages/web-cli-base/**` 出现 diff | 停机（`N-NDA-007` / `NFR-NDA-005`） |
| 3 | `KIND_SET` 新增任一字符串 / 第 13 kind / 新宿主 / 新 variant | 停机（`N-NDA-003/004` / `EC-NDA-017`） |
| 4 | 出现第二产出通道（围栏块影子产出）/ 第二校验器 / 第二档位表 / 第二分相判据 / 第二异常判定 | 停机（`N-NDA-021/022` / `NFR-NDA-013` / `R-NDA-902/915`） |
| 5 | 判定链（`policy.ts` / `auto-authorize.ts`）内容哈希变化 | 停机（`N-NDA-018`） |
| 6 | 反证恒绿（注入后仍 PASS）/ 判据恒真 | 停机；重写注入点（`FR-NDA-131` / 纪律第 6 条） |
| 7 | `SG-NDA-01/02/03` 结论 = 不可行 / 不可构造 | 被闸门任务**不得开工**（见 `blockers`） |
| 8 | 体积越**绝对上限** / 静默改档位 / `authorConfirmation` 被伪称 | 停机（硬墙）；升档须**显式**登记（`ADR-NDA-008` / `EC-NDA-016`） |
| 9 | 任一门禁计数 < 基线（除保护段显式取代且已留痕） | 停机；还原并重锚 |
| 10 | 未过 5 道校验的候选进 chips / 被执行；`gesture` op 被放行 / 被写入 schema `enum`；`confirm` 被拒可见 | 停机（`N-NDA-021` / `R-NDA-901/905`） |
| 11 | 特权 op 非 `gesture` / SW 调用 `.request(` / AI 自动按下 `confirm`（含 consent 代答与兜底推荐代答） | 停机（`N-NDA-011/017`） |
| 12 | 提醒发生 ≥2 次 / nudge 进会话历史（`session.snapshot()` 含 nudge 文本）/ 新增 `requestTurn(` 或 `nextAfterSettle` 调用点 | 停机（`N-NDA-024` / `X-NDA-11` = `no-supersession`） |
| 13 | 未配置相显示自由输入终端 / 已配置相终端被删 / 未配置被推荐「配置新的 LLM」 | 停机（`N-NDA-008/025/026`） |
| 14 | 首开引入 LLM 往返依赖 / 提案被记账成回合预算 / A 列改动搬 B 列规避账本 | 停机（`N-NDA-028` / `FR-NDA-145`） |

---

## 9. 二维时序：build / review / validate 策略（**设计在 build 前可启动**）

### 9.1 三阶段在每叶的时序

| 叶 | build（波内） | review（叶收口前） | validate（叶收口） |
|---|---|---|---|
| **nda-1** | `W01`(工具 def/注册/parity/解析入口/围栏块删除/SW 接线 + **SG-NDA-01**) → `W02`(规则位/门禁改写/反证族 + **SG-NDA-02**) → `W03`(S0'''' 主/B/D node / Chromium 断言增量 / `gate-integrity` / 体积叶1 / X-NDA 骨架) | 判据真空审查（AI-N-* **禁恒真** + 三段控制）+ 单源审计（工具恰 1 / `intercept` 恰 1 / 校验器恰 1 / `tierOf` 单源）+ 注入反证完整性（未校验候选进 chips / 第二解析面 `tc.args` / 围栏块重现 / label 泄漏） | S0'''' 主/B/D node 面实跑 + 门禁守恒对账 + 体积叶1 正增量 + 漂移检测（`KIND_SET` 40 / 12 kind / `ACT_TO_OP` 6 / `enum` ↔ `OP_IDS`+`tierOf` / `maxItems` ↔ `MAX_CHIPS_PER_CARD` / `ai-next.rule` ↔ `ai-led`） |
| **nda-2** | `W04`(分相/nudge + **SG-NDA-03**) → `W05`(异常闭集/兜底 provider/12→13/四处恰 N/AI-N-15) → `W06`(S0'''' 终态/台账终态/保护段 keep/体积 Σ/门禁守恒) | 分相审查（两相双向反证；已配置恒常驻不回归）+ 有界审查（`nudgeUsed` 首闸 / 会话零污染）+ 重锚纪律审查（12→13 逐项同集、断言零删除、老台账保留）+ 双判审查（面板零第二分类器） | 全门禁逐条复跑 + S0'''' 五支线终态（注入必红 + 逐字节还原）+ X-NDA-1~12 台账终态（未发生者 `no-supersession` + 理由非空）+ 保护段双绿 + 体积叶2 + 两叶 Σ + `e2e` PASS + 漂移检测（台账 ↔ 判据 / 保护段 pin / 规则表 ↔ provider ↔ `DRIVER_DECLS_SRC` / 两文案相异） |

### 9.2 review 前置判据（build 前已钉死）

1. **禁恒真**：`AI-N-*` / S0'''' / 分相 / 有界每条判据必须可注入违反面 + 三段控制（`ok` / `violated` / `n/a`）；`n/a` 不冒充 `ok`。
2. **禁纸面**：工具定义**单源**（`tools/next-tool.ts`）；捕获**单源**（`tc.rawArguments`）；校验器**单源**（`ai-next.ts`）；档位**单源**（`tierOf`）；判定**单源**在 SW（`next-drive-policy.ts`）；修复 op **唯一**（`op.llm-config`）。
3. **禁假绿**：S0'''' 走**生产模块真源切片**（不用假 provider / 桩跳过真实捕获与校验，`R-NDA-909`）。
4. **禁放宽**：`NEXTSTEP_PRIORITY` 恰 5 / 12→13 / 分相重锚均为**等价重锚**（附反证），非放宽；老台账条目逐字保留；`requestTurn(` **恰 1 不动**。
5. **禁代答**：AI 不得代答 / 代填 / 自动提交 `confirm` consent（含兜底推荐，`N-NDA-017`）。
6. **禁静默**：保护段哈希变更须八步 / 台账（本 Feature 预期 `keep`）；`no-supersession` 不得留空 / 不得伪造「已取代」。

### 9.3 validate 前置判据（build 前已钉死）

| 判据 | 检查 |
|---|---|
| EXIST | 产物存在 + 无 TODO / 桩；`tools/next-tool.ts` / `next-drive-policy.ts` 非空 |
| SUBSTANCE | 非空实现 + 关键路径覆盖（`AI-N-1~15` / S0''''-1~12 五支线 / `TASK-NDA-1xx~2xx` 全任务） |
| ANTI-PATTERN | 反模式检测 + **反证恒绿检测**（注入后仍 PASS ⇒ 缺陷）+ 恒真判据检测 |
| WIRING | 接线真实（无孤岛）+ `deriveTools()` 含 `next` + 受审集合下界只增 + 计数只增 + `assertionsRemoved = 0` |
| DRIFT | 契约漂移（`enum` ↔ `OP_IDS`+`tierOf` / `maxItems` ↔ `MAX_CHIPS_PER_CARD` / `ai-next.rule` ↔ `ai-led` / `DRIVER_DECLS_SRC` 13↔13 / `evidence` ↔ `when` 实读 / `AI_ABNORMAL_CODES` 恰一处 / 两文案相异 / `KIND_SET` 40 / 保护段 pin / 两叶 Σ 体积 / X-NDA 台账 ↔ 判据） |

---

## 10. 每叶验收门禁清单（摘要；逐项见各叶 `tasks.md`）

- **nda-1**（W3 收口 `TASK-NDA-120`）：`typecheck` · `build` · `npm test ≥1507` · **`ai-next-candidate`（改写：AI-N-1~14）** · `parity`（`pluginExtras['next']`） · `recommendation-sources`（③ 恰 5；①~④ 零删除） · `driver-timings`（恰 5） · `driver-quadruple`（12↔12 保持） · `op-wiring`（`requestTurn(` **恰 1** 不动） · `op-three-tier` · `sw-op-mirror` · `next-dispatch-diff0` · `ref-context-in-turn` · `insight-no-escalation`（base 零 diff） · `gate-integrity ≥25`（`CHROMIUM_GATES === 9`） · `test:law8 ≥60`（零降级） · `test:s0-self-driven` · `test:supersession ≥53`（骨架） · `size-*` + `test:size-ruling-vol3 ≥13`（叶1 登记） · `test:dead-end ≥53` · `test:recommendation ≥79`
- **nda-2**（W3 收口 `TASK-NDA-221`）：`typecheck` · `build` · `npm test ≥1507` · `free-input-next ≥22`（分相重锚） · `r8-open-next-entry`（零改全绿） · `driver-quadruple`（13↔13） · `next-registry`（NR-10 13） · `blocked-terminals` / `driver-terminals`（四处恰 N 不动） · `op-wiring` / `driver-timings` / `turn-arbitration` / `proactivity-guard`（零变） · `ai-next-candidate`（AI-N-15） · `supersession-ledger`（终态 + 保护段） · `test:journey ≥171`（keep） · `test:binding ≥192`（keep） · `test:recommendation ≥79` · `test:s0-self-driven` · `test:law8 ≥60` · `test:dead-end ≥53` · `test:l0/l1 ≥251/132` · `gate-integrity ≥25` · `size-*` + `test:size-ruling-vol3 ≥13` + **两叶 Σ** · `e2e` PASS

---

## 11. 未落地 / 待测点（禁预填）

| # | 主题 | 状态 | 归属任务 | 规则 |
|:--:|---|---|---|---|
| `NDA-P-001` | A 列（叶1）实测净增 + 是否触发档位上调 | `pending-measurement` | `TASK-NDA-118` | 禁预填；二态显式（越生效上限 ⇒ 重登记 / 越档位 ⇒ EC-NDA-016 + 作者一行 / 未越 ⇒ 如实登记） |
| `NDA-P-002` | 改写后 `ai-next-candidate` 三段控制 ok/violated/n/a 可达性 | `pending-measurement` | `TASK-NDA-112` | 禁预填；`n/a` 不得冒充 `ok` |
| `NDA-P-003` | 人工面 M1（AI 候选真机相关性）/ M2（工具产出稳定性体感）/ M3（提醒体感）/ M4（系统兜底体感）/ M5（未配置体感）/ M6（读屏） | `pending-human` | `TASK-NDA-116` / `TASK-NDA-221` | 逐项 `⏳ 未执行` / `PASS`，不得冒充 PASS |
| `NDA-P-004` | `authorConfirmation` 的作者一句外部确认（跨叶共享） | `pending-author-line` | `TASK-NDA-118` / `TASK-NDA-219` | 不得伪称已确认（`N-NDA-013`） |
| `NDA-P-005` | `SG-NDA-02` 探针：`ai-led` 位次与 F-36 行为等价（有引用时 AI 仍优先）可判性 | `pending-measurement` | `TASK-NDA-108` | 禁预填；不可行 ⇒ 暂停上报（禁第 6 规则位 / 禁抬密度阈值） |
| `NDA-P-006` | A 列（叶2）实测净增 + 两叶 Σ + 是否触发档位上调（与 plan 预算偏差） | `pending-measurement` | `TASK-NDA-219` | 禁预填；偏差须显式登记 |
| `NDA-P-007` | `params`（`string` 口径）本轮「仅元数据不参与派发」的已知限制是否被后续轮扩展 | `deferred` | `TASK-NDA-102`（登记） | 不得静默扩卡协议（`COR-NDA-7` / `PD-NDA-012` 诚实登记） |
| `NDA-P-008` | 门禁基线字面量与仓内实况不一致（如 `supersession` 引自 53 / `npm test` 引自 1507） | `resolved-tasks` | `TASK-NDA-117` / `TASK-NDA-220` | 按**断言语义 + 语义增量**重锚，**不照抄陈旧字面**；收口同源前移 |
| `NDA-P-009` | `KL-N-10` 家族 flake（`s0-self-driven` / `recommendation` / `binding` 相位） | `pending-measurement` | `TASK-NDA-120` / `TASK-NDA-220` | 隔离复跑 ≥2 + 日志全量；仍红如实记录不阻塞收口（`EC-NDA-025`） |
| `NDA-P-010` | plan 工程估算（A Σ +0.7~+1.9 KB）与 `spec §5.14.1` 保守包线（+0.8~+2.4 KB）并存 | `resolved-tasks` | `TASK-NDA-118` / `TASK-NDA-219` | **判据口径取更紧者 = spec 包线**（`ADR-NDA-008 §②` 口径③）；偏差如实登记 |
| `NDA-P-011` | `PD-NDA-016`（nudge 时点比 spec 字面早一步；`stop()` 窗口内至多多发一次） | `registered` | `TASK-NDA-215` | 如实登记为已知偏差；`stop()` 窗口有界 ≤1 |
| `NDA-P-012` | `pluginExtras` 位置订正（`waivers.json` 而非 `baseline-catalog.json`） | `resolved-tasks` | `TASK-NDA-104` | 按实际位置落地（`COR-NDA-6`）；`baseline-catalog.json#toolCount` 34 零改 |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（F-37 父任务总览：**2 叶 × 6 波 × 41 任务**（`TASK-NDA-101~120` / `201~221`；S×10 / M×25 / L×6）+ 波次总表 + 两叶任务索引 + 跨切红线（`N-NDA-001~030` / `X-NDA-1~12`）→ 任务映射 + **体积分列预算逐叶分摊（A 列 nda-1 +0.1~0.5 KB / nda-2 +0.6~1.4 KB；Σ +0.7~+1.9 KB；判据取 spec §5.14.1 保守包线 +0.8~+2.4 KB；B 列 +3.2~+7.6 KB 不计账；2.8× 最坏 ≈7.7 KB；距档 9,798 不升档）+ 波内登记点 + EC-NDA-016 三分支任务化** + 共享面「恰一次」登记（体积 / 门禁 / 台账 / 保护段 / S0'''' / 人工面 / 零新 LLM 往返 / `op-table` 双面 / `DRIVER_DECLS_SRC`）+ **S0'''' 五支线双面落点表** + 3 个 spikeGate（`SG-NDA-01` 捕获+`rawArguments` 解析+短路+不上流 / `SG-NDA-02` `ai-led` 规则位等价重锚+密度可判 / `SG-NDA-03` nudge 回调内续呼+有界；覆盖两个最高风险点）+ **门禁三态 25 行逐条任务化 + 无新增门禁文件 + 间接面对面账** + 门禁守恒总表（`npm test ≥1507` / `CHROMIUM_GATES === 9`）+ 红线任务化 + 停机规则 14 条 + build/review/validate 二维时序 + 未落地 / 待测点 12 项。**本轮只做 tasks**：`.sddu` 外零触碰；未跑门禁 / 构建 / Chromium；未调用任何受管 Provider（routing.v1 = `local_or_compute → none`） | 2026-09-27 | SDDU Tasks Agent |
