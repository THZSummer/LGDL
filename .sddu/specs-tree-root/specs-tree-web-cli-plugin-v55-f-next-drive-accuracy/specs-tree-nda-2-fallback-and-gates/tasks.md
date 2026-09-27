# 任务分解：specs-tree-nda-2-fallback-and-gates（NDA-2 未配置确定性引导 + 自由输入分相 + 提醒补一次 + LLM 异常兜底链 + 首开边界 + 门禁/体积重锚；叶2 = 末叶 / 兜底与判据叶）

> **文档定位**: SDDU 任务清单（**叶级可执行**）— 本叶 21 个原子任务 / 3 波 / 1 个先验闸门（`SG-NDA-03`：nudge `chat` 回调内续呼）；作为 build 阶段的输入（父总览见 `../tasks.md`）
> **前置依赖**: **叶1 `../specs-tree-nda-1-next-tool-channel/`（硬前置：工具通道 + `intercept` 捕获 + 5 道校验链接入 + 围栏块替换；须 `validated`）** + 本叶 `spec.md` v1.0（承载父 FR ≈42 条切片；交付 10 项；执行序 8 步）+ `plan.md` v1.0 + `ADR-NDA-201/202`（叶新增）+ 父 `../spec.md` v1.0 + `../plan.md` v1.0 + `ADR-NDA-005/006/007/008/009` + F-35 / R8 产物（free-input / floor / 首开入口）
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-27
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-09-27
> **更新说明**: 初始创建（叶2 tasks：**21 任务 / 3 波**（`TASK-NDA-201~221`；S×3 / M×16 / L×2）+ 1 个先验闸门（`SG-NDA-03`：nudge `chat` 回调内续呼 + 有界 + 零计数漂移；**编排器点名的两个最高风险点之一**）+ 显式取代 2（`free-input-next` 分相 / `ai-next-candidate` AI-N-15）+ 等价重锚 3（`driver-quadruple` 12→13 / `next-registry` NR-10 12→13 / `size-*` 两叶 Σ）+ 四处恰 N 不动 + S0'''' 五支线终态 + X-NDA-1~12 台账终态 + 保护段 `keep` + 体积叶2 重登记）。**叶间硬串行**：本叶以叶1 `validated` 为前置。**本轮只做 tasks**：`.sddu` 外零触碰；未跑门禁 / 构建 / Chromium；未调用任何受管 Provider（routing.v1 = `local_or_compute → none`）

---

## 0. 叶内结构登记

| 项 | 内容 |
|---|---|
| 叶职责 | **结构治理**：未配置 ⇒ 确定性「去配置 LLM」引导 + 不显示自由输入（分相单源 `KIND`/`risk.llmBlocked`）+ 提醒补一次（有界恰一次、防环）+ LLM 异常判定闭集三情 + 系统兜底 `llm.abnormal`（复用 `op.llm-config`）+ 首开保持确定性 + S0'''' 支线 C/D/E 终态 + 门禁逐条等价重锚（含保护段）+ 体积分列预算终态 + X-NDA 台账终态 |
| 不做（=`LNG-NDA-2-*`） | `next` 工具注册 / `intercept` 捕获 / 围栏块替换 / 规则位重锚（叶1）；5 道校验链 / 判定分层的首建（叶1）；新增 op / 动作 / 第二引导面；提醒无界 / 第二词表 / 首开 AI 化；断言删除 / 降级 / 保护段静默改写；新增 kind / 新宿主 |
| 波次 | `W1` 分相与提醒（7）→ `W2` 异常与兜底（8）→ `W3` 验收与治理（6） |
| 关键路径 | `201 → 202 → 204 → 206 → 208 → 209 → 210 → 211 → 212 → 214 → 216 → 217 → 218 → 220 → 221` |
| 可并行组 | `Q1`：`202 ∥ 203`（`next-drive-policy.ts` 与 `providers.ts` 不相交）；`Q2`：`205 ∥ 206`（引导复核与门禁重锚不相交，但复核结论喂 206）；`Q3`：`209 ∥ 210`（SW 与 `providers.ts` 不相交）；`Q4`：`213 ∥ 214`（集合守恒与判据扩容不相交）；`Q5`：`218 ∥ 219`（台账终态与体积登记不相交） |
| 体积责任 | **A 列主体**（`llm.abnormal` 行 + `free-input.when` 分相 + `definition.ts` 闭集 + 面板 risk 折叠：+0.6~1.4 KB）+ B 列主体（`next-drive-policy.ts` + SW 接线：+1.9~3.6 KB，不计账）；**W05 落完 A 列主体即实测**，再进 W06 门禁 / Σ |
| 提交区间（建议） | `A` = W1（B 列为主）；`B` = W2（A 列主体 ⇒ 落完即实测）；`C` = W3（收口轮·终局） |
| 门禁责任 | **显式取代 2**（`free-input-next` 恒真→分相 / `ai-next-candidate` AI-N-15）+ **等价重锚 3**（`driver-quadruple` 12→13 / `next-registry` NR-10 12→13 / `size-*` 逐叶 + Σ）+ **四处恰 N 不动**（`BLOCKED_TERMINALS` 5 / `OPS_RECOVERY_PROVIDER_IDS` 2 / `RECOVERY_PROVIDER_IDS` 5 / `DRIVER_TERMINALS` 4 / `PROACTIVE_MOMENTS` 7 / `DRIVER_TIMINGS` 5 / `NEXT_SOURCE_NAMES` 7）+ **保护段 keep** |
| 跨叶硬前置 | 叶1 `validated`（`BLK-NDA-9`）；`DRIVER_DECLS_SRC` 恰 12 由叶1 保持、由本叶**一次性**重锚为 13（`共享面恰一次`） |

---

## 1. 依赖拓扑总览

```
Wave 1 ─── 分相与提醒（B 列为主）
  TASK-NDA-201 [M] spike  SG-NDA-03 nudge chat 回调内续呼 + 有界 + 零计数漂移（先验闸门，最前）
  TASK-NDA-202 [M] impl   next-drive-policy.ts（NEW）shouldNudge + NUDGE_TEXT
  TASK-NDA-203 [S] impl   providers.ts free-input.when 分相
  TASK-NDA-205 [S] impl   未配置确定性引导复核（零新增面）
  TASK-NDA-204 [L] impl   service-worker.ts chat 回调 nudge 接线（依赖 201/202/203）
  TASK-NDA-206 [M] gate   free-input-next 分相重锚（FIN-0~9 只增）
  TASK-NDA-207 [M] gate   r8-open-next-entry 保留零改 + no-dead-end 未配置相覆盖

Wave 2 ─── 异常与兜底（A 列主体增长点）
  TASK-NDA-208 [M] impl   abnormalVerdict 闭集 + definition.ts AI_ABNORMAL_CODES + AiNextPayload.abnormal?
  TASK-NDA-209 [M] impl   service-worker.ts onFinish(outcome) + abnormal 附加 + hasAiNext 扩展
  TASK-NDA-210 [M] impl   providers.ts llm.abnormal 第 13 行 + LLM_ABNORMAL_RISK + DRIVER_DECLS_SRC 第 13 行
  TASK-NDA-211 [M] impl   sidepanel.ts noteLlmAbnormalFact + risk 折叠 + consumeAiNext 消费
  TASK-NDA-212 [M] gate   driver-quadruple 12→13 + next-registry NR-10 12→13
  TASK-NDA-213 [M] gate   四处恰 N 不动（7 个集合）+ llm.abnormal 不入三集合
  TASK-NDA-214 [M] gate   ai-next-candidate AI-N-15（有界 / 三情 / 两文案相异 / 分相非恒真 / 缺席逐字）
  TASK-NDA-215 [S] doc    首开零行为改动确认 + PD-NDA-001 / PD-NDA-016 登记

Wave 3 ─── 验收与治理（收口轮·终局）
  TASK-NDA-216 [L] gate   S0'''' 支线 C / D / E 终态 node 面
  TASK-NDA-217 [M] gate   Chromium 面（s0-self-driven / recommendation / law8 只加断言）+ 人工面 ⏳
  TASK-NDA-218 [M] doc    xNdaLedger 终态 + xNdaLedgerFull 全 12 条 + 保护段 keep 决策
  TASK-NDA-219 [M] doc    体积叶2 重登记 + 两叶 Σ + EC-NDA-016 三分支终态
  TASK-NDA-220 [M] gate   门禁守恒终态对账（三态齐 / 间接面 / 串行 / KL-N-10）
  TASK-NDA-221 [M] doc    红线巡检 + 人工面如实登记 + 本叶收口对账
```

**步序纪律（`plan §8`）**：`W1` 先落 **B 列**（`next-drive-policy.ts`）；`W2` 的 `llm.abnormal` provider 是本叶**唯一 A 列主体增长点** ⇒ 落完**立即实测**，再进 `W3` 的门禁重锚与体积 Σ（**避免「先重锚后超档」**）。

---

## 2. 任务列表

### TASK-NDA-201: **SG-NDA-03** nudge `chat` 回调内续呼 + 有界 + 零计数漂移 可行性探针（先验闸门）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | 叶1 `validated`（`BLK-NDA-9`） |
| **执行波次** | 1 |
| **对应 FR** | FR-NDA-060 / 061 / 062 / 063 / 064 |
| **对应 AC** | AC-NDA-008 |
| **对应 ADR** | ADR-NDA-006（§①~③⑤⑥） |
| **列别 / 类型** | B（探针不落库）/ spike |

**描述**: 探针验证「提醒可在 SW `chat` 回调内**同回合续呼**」：① `chat` 回调每轮被调用且拿到完整 `res`（含 `toolCalls`）；② 追加 nudge turn 后再调一次 `providerChat`，用**第二次结果**作为该轮结果返回（不新增回合容器）；③ nudge turn **不进会话**（`session.snapshot()` 不含 nudge 文本）；④ nudge 轮不触发第二次提醒（`nudgeUsed` 先置位）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| SPIKE | `packages/web-cli-plugin/test/_spike/sg-nda-03-probe.mjs`（探毕删除，不落版本库） |

**验收标准**:
- [ ] 可判：「无 `toolCalls` ⇒ 基座唯一去路是 `finish('completed')` / `finish('empty')`」；nudge 在同一次 `runChatTurn` 内
- [ ] 可判：`runChatTurn(` 调用点**仍 2**（`runChat` + drain）；`requestTurn(` 仍恰 1；`nextAfterSettle` 仍 1 定义 10 调用点
- [ ] 可判：nudge turn 只出现在**局部**数组（会话 `snapshot()` 不含 nudge 文本）
- [ ] 可判：`nudgeUsed` 每回合重新开始（`runChat` 局部对象）⇒ 每回合 nudge ≤1
- [ ] 结论 ∈ {可行 / 不可行}；五要素写入 build 记录；探针产物不落版本库

**验证命令**:
```bash
cd packages/web-cli-plugin && node test/_spike/sg-nda-03-probe.mjs
grep -c "runChatTurn(" packages/web-cli-plugin/src/background/service-worker.ts
grep -c "requestTurn(" packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts
```

---

### TASK-NDA-202: `background/next-drive-policy.ts`（NEW）— `shouldNudge` 五条件 + `NUDGE_TEXT`

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-NDA-201 |
| **执行波次** | 1 |
| **对应 FR** | FR-NDA-060 / 061 / 062 / 063 / 106 |
| **对应 AC** | AC-NDA-008 |
| **对应 ADR** | ADR-NDA-006（§②③） |
| **列别 / 类型** | B / impl |

**描述**: 新建**纯函数**模块：`shouldNudge({configured, toolCalls, hasReply, captured, nudgeUsed})`（五条件，顺序即语义优先级：`nudgeUsed` 首闸 ⇒ `!configured` ⇒ `captured` ⇒ `toolCalls !== 0` ⇒ `hasReply`）+ `NUDGE_TEXT`（两句：调用一次 + 空数组兜底）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/background/next-drive-policy.ts` |

**验收标准**:
- [ ] `shouldNudge` 纯函数（零 `chrome` / DOM / 时钟 / `fetch` / IO）；五条件真值表逐条可判
- [ ] `nudgeUsed === true ⇒ false`（**有界判据非恒真、可 FAIL**）；`!configured ⇒ false`（未配置相不提醒）；`captured ⇒ false`（已捕获不提醒）；`hasReply === false ⇒ false`（排除 empty 路径误提醒）
- [ ] `NUDGE_TEXT` 含两句（「请现在调用一次 `next` 工具」+「若无建议调用 `next` 并给空 `candidates` 数组」）；**零明文**（不携带用户正文 / 凭据）
- [ ] 模块**不** import `chrome` / 面板模块；可被 node 门禁直接调用（`FR-NDA-106`）
- [ ] 反证：忽略 `nudgeUsed` ⇒ 必红；删 `hasReply` ⇒ 必红（由 `TASK-NDA-214` 落判据）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck
grep -nE "chrome\.|document\.|fetch\(|Date\.now" packages/web-cli-plugin/src/background/next-drive-policy.ts || echo "PURE-OK"
```

---

### TASK-NDA-203: `providers.ts` `free-input.when` 分相（单源 `risk.llmBlocked`；保留 `session.busy` 读向）

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-NDA-201 |
| **执行波次** | 1 |
| **对应 FR** | FR-NDA-051 / 052 / 053 |
| **对应 AC** | AC-NDA-007 / 018 |
| **对应 ADR** | ADR-NDA-005（§①③） |
| **列别 / 类型** | A（+~0.1 KB）/ impl |

**描述**: `free-input.when` 由**恒真**改为分相：`!ctx.risk.includes(LLM_BLOCKED_RISK) && (ctx.session.busy === true || ctx.session.busy === false)` —— 未配置（risk 含 `llmBlocked`）⇒ 不铸终端；已配置 ⇒ 恒常驻。**零新 ctx 字段 / 零第二偏好键**（`NEXT_SOURCE_NAMES` 仍恰 7）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/providers.ts` |

**验收标准**:
- [ ] `when` 源文本含 `LLM_BLOCKED_RISK` **与** `session.busy`（两读都在 ⇒ DQ-3 when-scope ↔ `evidence` 同源保持）
- [ ] 未配置 ctx（`risk:['llmBlocked']`）⇒ `when === false`；已配置 ctx ⇒ `when === true`
- [ ] `chips: [FREE_INPUT_PROVIDER_ID]` / `textOf` 逐字保留；既有 12 行 provider 其余**零改**
- [ ] 与 `llm.unconfigured` 修复 provider **共享同一事实源与常量**（`providers.ts:138`）⇒ 分相不可能漂移
- [ ] 反证（由 `TASK-NDA-206` 落判据）：注入「恒真」⇒ 必红；注入「恒假」⇒ 必红

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck
grep -n "LLM_BLOCKED_RISK" -B4 -A4 packages/web-cli-plugin/src/ui/sidepanel/next-registry/providers.ts | head -40
```

---

### TASK-NDA-204: `service-worker.ts` `chat` 回调 nudge 接线（`configured` 单源 + 局部 turn + `nudgeUsed` 先置位）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-NDA-201 / 202 / 203 |
| **执行波次** | 1 |
| **对应 FR** | FR-NDA-060~066 |
| **对应 AC** | AC-NDA-008 / 015 |
| **对应 ADR** | ADR-NDA-006（§①④⑤⑥⑦） |

**描述**: 在 `runChat` 内把 `configured` 提为 const（单源，`isLlmConfigured` 于 `:945` 已算）+ 新增 `turnState.nudgeUsed`；`chat` 回调：`shouldNudge(...)` 为真 ⇒ **先置位** `nudgeUsed = true` ⇒ 追加 `NUDGE_TEXT` user turn **局部**调用 `providerChat` ⇒ 用第二次 `res` 作为该轮结果（同一 `deriveTools()` 工具面）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/background/service-worker.ts` |

**验收标准**:
- [ ] nudge 使用**同一** `deriveTools()` 与同一 provider cfg（同一产出通道，无第二解析器 / 第二校验器）
- [ ] nudge turn **不进会话**（`session.snapshot()` 可判）；`buildPlan` 用**最终** `res`（计划与实际写入同源）
- [ ] nudge 次数 ≤1（运行断言 + 源文本判据双面）；置位在调用**之前**（nudge 轮失败亦不会第二次）
- [ ] **零计数漂移**：`runChatTurn(` 2 / `requestTurn(` 恰 1 / `nextAfterSettle` 1 定义 10 调用点 / `maybeRecommend` 1 定义 8 调用点 **全未变**（`X-NDA-11` = `no-supersession`）
- [ ] 不绕护栏（`proactivity` 六常量零改；不增加自动成回合次数）；在飞 `pending` 硬门不动
- [ ] nudge 轮失败 ⇒ 异常上抛 ⇒ `finish('llm-failed')` ⇒ 系统兜底可达（由 `TASK-NDA-216` 端到端判）
- [ ] `turn-queue.ts` / `chat-runner.ts` **diff = 0**

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && npm test 2>&1 | grep -iE "op-wiring|driver-timings|turn-arbitration|not ok" | head
git diff --stat -- packages/web-cli-plugin/src/background/turn-queue.ts packages/web-cli-plugin/src/background/chat-runner.ts | tail -1  # 期望 0
```

---

### TASK-NDA-205: 未配置确定性引导复核（**零新增面**：`llm.unconfigured` → `OPS_RECOVERY_ROWS` → `op.llm-config` 可达）

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-NDA-203 |
| **执行波次** | 1 |
| **对应 FR** | FR-NDA-050 / 054 / 055 / 056 |
| **对应 AC** | AC-NDA-006 / 017 |
| **对应 ADR** | ADR-NDA-005（§②） |

**描述**: 复核既有链逐字可达（不新增 provider / op / 引导面）：`variant:'llm-unconfigured'` → 面板 detect + 悬置 + `noteLlmBlockedFact(false, true)` → `risk` 含 `llmBlocked` → `llm.unconfigured` provider → `chips:['op.llm-config']`（op-direct chip）；确认零 token 路径不破。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| 复核（预期零改） | `packages/web-cli-plugin/src/background/service-worker.ts`（`:945-956`） |
| 复核（预期零改） | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts`（`:4167-4194` / `:1484-1486` / `:2059-2062`） |
| 复核（预期零改） | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/providers.ts`（`:52-61` / `:131-141`） |

**验收标准**:
- [ ] 未配置 ⇒ `op.llm-config` 引导 chip **可达**；反证「未配置无引导 ⇒ 必红」
- [ ] 零 token / 零网络：未配置提交仍走 `variant:'llm-unconfigured'`（**不发起 provider 调用**）
- [ ] **零新增面**：`OPS_RECOVERY_ROWS` / `OPS_RECOVERY_PROVIDER_IDS` 仍恰 2；`BLOCKED_TERMINALS` 仍恰 5；未新增 op / 动作
- [ ] 未配置相文案仍为 `OPS_RECOVERY_ROWS[0].text`（「配置 LLM 凭据（写入本机 · 掩码）」）——与异常相文案**相异**（由 `TASK-NDA-214` 断言）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test 2>&1 | grep -iE "blocked-terminals|recovery|not ok" | head
```

---

### TASK-NDA-206: `free-input-next` 分相重锚（FIN-0~9 只增 + 双向反证非恒真）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-NDA-203 / 205 |
| **执行波次** | 1 |
| **对应 FR** | FR-NDA-051 / 052 / 053 |
| **对应 AC** | AC-NDA-007 / 018 |
| **对应 ADR** | ADR-NDA-005（§④）/ ADR-NDA-009（§④ 第 13 行） |

**描述**: `free-input-next.test.ts` 由「恒真」重锚为「**两相各可判**」：未配置 ctx ⇒ `when=false` ∧ 卡**无** `.next-terminal` ∧ `op.llm-config` 引导可达；已配置 ctx ⇒ `when=true` ∧ 卡**有** `.next-terminal`（恒最末）。FIN-0~9 判据**只增不删**。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/free-input-next.test.ts` |

**验收标准**:
- [ ] 两相判据均**非恒真**（各自可 FAIL）；已配置相**仍恒常驻**（恒最末，非 `.next-chip`、不进 `MAX_CHIPS_PER_CARD`）
- [ ] **反证 ①**「未配置仍显示自由输入 ⇒ 必红」（注入恒真）；**反证 ②**「已配置删终端 ⇒ 必红」（注入恒假）—— 各自 `sha256` 逐字节还原
- [ ] FIN-0~9 **零删除**；计数只增（`≥22`）
- [ ] `RL` 零死端：未配置相可达 next **由 `llm.unconfigured` 引导 chip 提供**（`FR-NDA-055`），非死端
- [ ] `r8-open-next-entry` 不受本任务影响（由 `TASK-NDA-207` 复核）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test 2>&1 | grep -iE "free-input|not ok" | head -20
```

---

### TASK-NDA-207: `r8-open-next-entry` 保留零改 + `no-dead-end` 未配置相覆盖（只增）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-NDA-206 |
| **执行波次** | 1 |
| **对应 FR** | FR-NDA-090~093 / 045 |
| **对应 AC** | AC-NDA-011 / 007 |
| **对应 ADR** | ADR-NDA-202（§③）/ ADR-NDA-005（§③） |

**描述**: 复核 `r8-open-next-entry` R8-1~6 **全绿且零改**（首开入口单源 / 复用 `'idle'` / 零死端 floor / 让位 `firstRun`）；在 `no-dead-end.mjs` **只增**未配置相与异常相覆盖断言（未配置 ⇒ 有引导 chip；异常相由 `W2` 补）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| 复核（预期零改） | `packages/web-cli-plugin/test/r8-open-next-entry.test.ts` |
| MODIFY（只增） | `packages/web-cli-plugin/test/ui/no-dead-end.mjs` |

**验收标准**:
- [ ] R8-1~6 **绿且文件零改**（若红 = 实现缺陷，**不改判据**）
- [ ] `no-dead-end` 新增未配置相覆盖（未配置 ⇒ 可达 `op.llm-config` 引导）；**只增不删**（`≥53`）
- [ ] 零双卡判据绿（`firstRunCard.visible === !(configured ∧ authorized)` 逐字不动）
- [ ] 首屏零 LLM 往返依赖

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test 2>&1 | grep -iE "r8-open|not ok" | head
cd packages/web-cli-plugin && npm run test:dead-end
```

---

### TASK-NDA-208: `abnormalVerdict` 闭集三情 + `definition.ts` `AI_ABNORMAL_CODES` + `AiNextPayload.abnormal?`（type-only 单源）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-NDA-204（叶1 `validated` 之延续） |
| **执行波次** | 2 |
| **对应 FR** | FR-NDA-070 / 071 / 075 |
| **对应 AC** | AC-NDA-009 |
| **对应 ADR** | ADR-NDA-007（§①②）/ ADR-NDA-201（§①②） |
| **列别 / 类型** | B（判定）+ A（`definition.ts` 常量：+120~300 B）/ impl |

**描述**: `next-drive-policy.ts` 增 `abnormalVerdict({outcome, accepted, blocked})`（有 `accepted` ⇒ `null`；`llm-failed` ⇒ `llm-failed`；`stopped` ⇒ `null`；`blocked > 0` ⇒ `all-blocked`；否则 `no-tool-call`）+ `definition.ts` 声明 `AI_ABNORMAL_CODES`（**恰一处**）与 `AiNextPayload.abnormal?: AiAbnormalCode`（加法可选；∉ `KIND_SET`）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/background/next-drive-policy.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/definition.ts` |

**验收标准**:
- [ ] 三情真值表（`no-tool-call` / `llm-failed` / `all-blocked`）逐条可判 + `accepted > 0 ⇒ null` + `stopped ⇒ null`
- [ ] `AI_ABNORMAL_CODES` **恰一处**声明；SW `import type` + 值导入同一常量（零第二份字面量 / 零第二词表）
- [ ] `abnormal?` 为 `aiNext` 的**子字段**（**零新 kind / 零新 variant / 零新宿主**；`KIND_SET` 40 / `ARBITRATION_RESULTS` 四值逐字）
- [ ] `abnormal` **只在非 null 时附加**，且此时 `accepted` 恰为空数组（反证「有 accepted 却带 abnormal ⇒ 必红」）
- [ ] 词表分相：与 `llm.unconfigured`（`llmBlocked` risk）**不混同**；不新写第二词根
- [ ] `NEXT_SOURCE_NAMES` 仍恰 7；`recommend.ts` 零新导入（模块白名单仍 5）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck
grep -rn "no-tool-call\|all-blocked" packages/web-cli-plugin/src | grep -v definition.ts || echo "SINGLE-SOURCE-OK"
```

---

### TASK-NDA-209: `service-worker.ts` `onFinish(outcome)` 消费 + `abnormal` 附加 + `hasAiNext` 扩展（事件作用域一次性）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-NDA-208 |
| **执行波次** | 2 |
| **对应 FR** | FR-NDA-070 / 073 / 074 / 019 |
| **对应 AC** | AC-NDA-009 / 002 |
| **对应 ADR** | ADR-NDA-201（§②③④） |

**描述**: `onFinish` 由忽略参数改为 `(outcome) => {...}`（`RunOutcome` 原生可得，**零改基座**）；装配 `aiNext = {accepted, blocked, abnormal?}`；`hasAiNext` 判据扩展为「`accepted.length > 0 || blocked.length > 0 || abnormal !== undefined`」；`abnormal` 为**本回合事件作用域**事实（一次性）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/background/service-worker.ts` |
| 复核（预期零改） | `packages/web-cli-plugin/src/background/chat-events.ts` |

**验收标准**:
- [ ] `onFinish` 接收并使用 `outcome`；`abnormal` 仅当 `abnormalVerdict !== null` 时附加
- [ ] **缺席 ⇒ 现状逐字**：正常回合（有候选）的 `chat-result` 字段集合与今天**逐字一致**（反证：总是附加空 `abnormal` ⇒ 必红）
- [ ] `ChatResultEvent.aiNext?` **逐字不改**（`abnormal` 是其子字段 ⇒ 零新 kind / 零新 variant）
- [ ] 事件作用域一次性：**第二次正常回合**不再出现 `llmAbnormal` 风险项 / 不再出现兜底 chip
- [ ] 零改基座（`RunOutcome` 只读消费）；零新增 LLM 往返

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && npm test 2>&1 | grep -iE "chat-events|messaging|not ok" | head
git diff --stat -- packages/web-cli-plugin/src/background/chat-events.ts | tail -1
```

---

### TASK-NDA-210: `providers.ts` `llm.abnormal` 第 13 行 + `LLM_ABNORMAL_RISK` + `DRIVER_DECLS_SRC` 第 13 行（文案分相）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-NDA-209 |
| **执行波次** | 2 |
| **对应 FR** | FR-NDA-072 / 073 / 075 / 076 |
| **对应 AC** | AC-NDA-009 |
| **对应 ADR** | ADR-NDA-007（§③⑤）/ ADR-NDA-202（§①） |
| **列别 / 类型** | A（+250~600 B 含分相；叶2 A 列主体）/ impl |

**描述**: 新增第 13 行 provider `llm.abnormal`（`rule:'risk-recovery'` / `priority:0` / `when: ctx => ctx.risk.includes(LLM_ABNORMAL_RISK)` / `chips:['op.llm-config']` / `textOf: () => ['配置新的 LLM（切换 / 重配）']`）+ `LLM_ABNORMAL_RISK = 'llmAbnormal'`（与 `LLM_BLOCKED_RISK` 同处单源）+ `DRIVER_DECLS_SRC['llm.abnormal']`（`timings:['idle']` / `moments:['turn-end']` / `driverClass:'deterministic'` / `priority:0` / `evidence:['risk']`）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/providers.ts` |

**验收标准**:
- [ ] chip = `op.llm-config`（**零新增 op / 零新增动作**）；`confirm` 档 ⇒ 由用户作答（AI 不代答 / 不自动按下）
- [ ] 文案分相：异常相「配置新的 LLM（切换 / 重配）」与未配置相「配置 LLM 凭据（写入本机 · 掩码）」**相异且各自在场**
- [ ] `evidence:['risk']` 与 `when` 实读**同源**（DQ-3 从源文本抽 when-scope 比对）
- [ ] **不入** `BLOCKED_TERMINALS`（仍恰 5）/ `OPS_RECOVERY_ROWS` 与 `OPS_RECOVERY_PROVIDER_IDS`（仍恰 2）/ `RECOVERY_PROVIDER_IDS`（仍恰 5）
- [ ] 兜底优先级：`risk-recovery` 档（`NEXTSTEP_PRIORITY` 第 1 档）⇒ 压过 AI 建议
- [ ] `DRIVER_DECLS_SRC` 由 12 行 → **13 行**（旧 12 行**逐字保留**），`DRIVER_TIMINGS` 仍恰 5（复用 `'idle'`）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck
grep -n "llm.abnormal\|LLM_ABNORMAL_RISK" packages/web-cli-plugin/src/ui/sidepanel/next-registry/providers.ts
```

---

### TASK-NDA-211: `sidepanel.ts` `noteLlmAbnormalFact` + `risk` 折叠 + `consumeAiNext` 只消费（零第二分类器）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-NDA-208 / 209 |
| **执行波次** | 2 |
| **对应 FR** | FR-NDA-073 / 074 |
| **对应 AC** | AC-NDA-009 |
| **对应 ADR** | ADR-NDA-007（§④）/ ADR-NDA-201（§③） |
| **列别 / 类型** | A（+200~500 B）/ impl |

**描述**: `consumeAiNext` 内 `if (aiNext?.abnormal) noteLlmAbnormalFact()`（与 `noteLlmBlockedFact` 同构：`observedAbnormal.add(LLM_ABNORMAL_RISK)`）；`maybeRecommend` 的同构处把 `observedAbnormal` 折进 `risks`（折进**既有 `risk` 源**，零新 ctx 字段）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` |

**验收标准**:
- [ ] `noteLlmAbnormalFact` 与既有 `noteLlmBlockedFact` 同构（事件作用域 Set；**一次性**，不持久化）
- [ ] **零第二分类器**：`abnormalVerdict` / `AI_ABNORMAL_CODES` 在 `sidepanel.ts` **零实现**（只 import `LLM_ABNORMAL_RISK`）；反证「面板写第二判定 ⇒ 必红」
- [ ] 不新增 `maybeRecommend` 调用点（复用 `consumeAiNext` 尾部既有调用）
- [ ] `NEXT_SOURCE_NAMES` 仍恰 7（`risk` 为既有源）；异常相推荐卡 = 兜底 chip + 已配置终端 ⇒ **零死端**
- [ ] 兜底推荐**不代答 consent**（`op.llm-config` 为 `confirm` 档，用户作答）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && npm test 2>&1 | grep -iE "recommendation-sources|not ok" | head
grep -n "abnormalVerdict\|AI_ABNORMAL_CODES" packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts || echo "NO-SECOND-CLASSIFIER-OK"
```

---

### TASK-NDA-212: `driver-quadruple` 12↔12 → **13↔13** + `next-registry` NR-10 12→13（逐项同集 + 幽灵行必红）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-NDA-210 |
| **执行波次** | 2 |
| **对应 FR** | FR-NDA-071 / 075 / 130 / 134 |
| **对应 AC** | AC-NDA-026 |
| **对应 ADR** | ADR-NDA-202（§①） |

**描述**: `driver-quadruple` 两处「恰 12」重锚为**恰 13**（声明表 ∧ 注册表 ∧ 逐项同集；`llm.abnormal` 在**两侧都在**）；`next-registry` NR-10 两处 12 → **13**。**不做「只对数」**；保留 `sort()` 集合同比对。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/driver-quadruple.test.ts` |
| MODIFY | `packages/web-cli-plugin/test/next-registry.test.ts` |

**验收标准**:
- [ ] `DECL_IDS.length === 13 ∧ PROVIDER_IDS.length === 13 ∧` 逐项同集；NR-10 两处 `=== 13`
- [ ] 四条反证各自必红：① 声明 13 / 注册 12；② 反向；③ 加幽灵行（只在声明）；④ 少一行
- [ ] `DRIVER_DECLS_SRC['llm.abnormal'].evidence === ['risk']` 且与 `when` 实读同源（DQ-3）
- [ ] 断言**零删除**，计数只增；`NEXT_SOURCE_NAMES` 仍恰 7（NR-0 保持）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test 2>&1 | grep -iE "driver-quadruple|next-registry|not ok" | head -20
```

---

### TASK-NDA-213: 四处恰 N 不动（7 个集合）+ `llm.abnormal` 不入三集合

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-NDA-210 / 212 |
| **执行波次** | 2 |
| **对应 FR** | FR-NDA-075 / 130 |
| **对应 AC** | AC-NDA-020 / 026 |
| **对应 ADR** | ADR-NDA-202（§②） |

**描述**: 逐条守线（**零改**）：`BLOCKED_TERMINALS` 恰 5 / `OPS_RECOVERY_PROVIDER_IDS`（+`OPS_RECOVERY_ROWS`）恰 2 / `RECOVERY_PROVIDER_IDS` 恰 5 / `DRIVER_TERMINALS` 恰 4 / `PROACTIVE_MOMENTS` 恰 7 / `DRIVER_TIMINGS` 恰 5 / `NEXT_SOURCE_NAMES` 恰 7；确认 `llm.abnormal` **不入**前三个集合（它是**风险态 recovery provider**，不是阻塞终态）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| 复核（预期零改） | `packages/web-cli-plugin/test/blocked-terminals.test.ts` |
| 复核（预期零改） | `packages/web-cli-plugin/test/driver-terminals.test.ts` |
| 复核（预期零改） | `packages/web-cli-plugin/test/driver-timings.test.ts` |

**验收标准**:
- [ ] 7 个集合计数**逐字未变**（5 / 2 / 2 / 5 / 4 / 7 / 5 / 7）；`npm test` 对应文件**零改且绿**
- [ ] `llm.abnormal` 不在 `BLOCKED_TERMINALS` / `OPS_RECOVERY_ROWS` / `RECOVERY_PROVIDER_IDS` 中（可判）
- [ ] 零第二阈值 / 零第二词表（源码扫描：无第二份提醒轮数上限、无第二份异常词根）
- [ ] `op-wiring`（`requestTurn(` 恰 1）/ `turn-arbitration`（四值逐字）/ `proactivity-guard`（六常量）**零改**

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test 2>&1 | grep -iE "blocked-terminals|driver-terminals|driver-timings|not ok" | head -20
git diff --stat -- packages/web-cli-plugin/test/blocked-terminals.test.ts packages/web-cli-plugin/test/driver-terminals.test.ts packages/web-cli-plugin/test/driver-timings.test.ts | tail -1
```

---

### TASK-NDA-214: `ai-next-candidate` **AI-N-15**（`shouldNudge` 有界 + `abnormalVerdict` 三情 + 两文案相异 + 分相非恒真 + 缺席逐字）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-NDA-208 / 210 / 211 / 212 |
| **执行波次** | 2 |
| **对应 FR** | FR-NDA-062 / 070 / 071 / 105 / 106 / 019 |
| **对应 AC** | AC-NDA-008 / 009 / 021 / 031 |
| **对应 ADR** | ADR-NDA-006（§②）/ ADR-NDA-007（§①⑤）/ ADR-NDA-202（§①） |

**描述**: 在本叶增量扩写 `test/ai-next-candidate.test.ts` 的 **AI-N-15**：`shouldNudge` 五条件真值表（含 `nudgeUsed=true ⇒ false` 有界性）+ `abnormalVerdict` 三情真值表（含 `stopped ⇒ null` / `accepted>0 ⇒ null`）+ 两文案相异 + 分相判据非恒真 + 「`abnormal` 缺席 ⇒ 面板行为逐字」+ 提醒往返 ≤1。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/ai-next-candidate.test.ts` |

**验收标准**:
- [ ] AI-N-15 逐条可判且**非恒真**（各自可注入违反面 ⇒ 必红 + `sha256` 还原）
- [ ] 反证：「提醒两次 / 无限续轮 ⇒ 必红」；「忽略 `nudgeUsed` ⇒ 必红」；「删 `hasReply` ⇒ 必红」；「删除 `llm.abnormal` provider ⇒ 兜底 chip 缺失 ⇒ 必红」；「把未配置 ctx 判成异常 ⇒ 必红」
- [ ] 两文案**不相同**且各自在场（未配置「配置 LLM 凭据…」/ 异常「配置新的 LLM（切换 / 重配）」）
- [ ] 提醒往返次数 **≤1**（源文本 + 运行断言双面）；`recommend.ts` 仍 pure（④ 保持绿）
- [ ] 三段控制（`ok` / `violated` / `n/a`）逐态可达；断言**只增**（沿叶1 的改写不减少项）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test 2>&1 | grep -iE "ai-next-candidate|AI-N-15|not ok" | head -20
```

---

### TASK-NDA-215: 首开零行为改动确认 + `PD-NDA-001` / `PD-NDA-016` 登记

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-NDA-207 |
| **执行波次** | 2 |
| **对应 FR** | FR-NDA-090~093 |
| **对应 AC** | AC-NDA-011 |
| **对应 ADR** | ADR-NDA-202（§③） |
| **列别 / 类型** | doc（登记） |

**描述**: 确认首开（open / ready）**零行为改动**（`maybeRecommendOpenEntry` / `firstRunCard` 不碰；未配置首开由分相自动承接）；登记 `PD-NDA-001`（首开 AI 化 **不转正**，`PD-ADN-001` 保持 deferred）与 `PD-NDA-016`（nudge 时点比 spec 字面早一步；`stop()` 窗口至多多发 1 次）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| 记录 | 本叶 build / validate 记录（`PD-NDA-001` / `PD-NDA-016` 登记条目） |

**验收标准**:
- [ ] `maybeRecommendOpenEntry` / `firstRunCard` **零改**（`git diff` = 0）
- [ ] `PD-NDA-001` 登记存在（首开确定性保持；`PD-ADN-001` 不转正）；`PD-NDA-016` 登记存在（时点偏差 + 有界 ≤1）
- [ ] 零双卡判据绿；首屏零 LLM 往返依赖
- [ ] 未配置首开由「去配置 LLM」引导承接（且无自由输入终端）

**验证命令**:
```bash
grep -n "maybeRecommendOpenEntry\|firstRunCard" packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts | head
cd packages/web-cli-plugin && npm test 2>&1 | grep -iE "r8-open|not ok" | head
```

---

### TASK-NDA-216: **S0'''' 支线 C / D / E 终态** node 面（注入必红 + 逐字节还原）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-NDA-214 |
| **执行波次** | 3 |
| **对应 FR** | FR-NDA-100 / 103 / 104 / 044 / 045 / 065 / 073 / 074 |
| **对应 AC** | AC-NDA-001 / 009 / 011 |
| **对应 ADR** | ADR-NDA-006（§⑦）/ ADR-NDA-007（§③）/ ADR-NDA-202（§③） |

**描述**: node 面机核 **支线 C**（提醒用尽仍无合法候选 ⇒ 确定性产卡含 floor + **系统兜底推荐**）、**支线 D**（未配置 ⇒ 零候选零网络 + 确定性「去配置 LLM」引导 + **无** `.next-terminal`）、**支线 E**（首开 ⇒ 确定性 + 零 LLM 往返 + 零双卡），并给出四相闭环（A 主线由叶1 建，本叶复核不回归）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/ai-next-candidate.test.ts`（S0'''' 终态侧断言） |
| 复核 | `packages/web-cli-plugin/test/s0-self-driven-chain.test.ts`（若存在 ⇒ 只增） |

**验收标准**:
- [ ] 支线 C：`no-tool-call` / `llm-failed` / `all-blocked` 三情形各 ⇒ `op.llm-config` 兜底 chip **可达** + 确定性候选 + 已配置终端（**零死端**）
- [ ] 支线 D：未配置 ⇒ 引导可达 ∧ 卡**无** `.next-terminal` ∧ 零 token / 零网络
- [ ] 支线 E：首开走确定性 ∧ 零 LLM 往返 ∧ 零双卡
- [ ] **注入必红**：「删兜底 provider」⇒ 无兜底 chip ⇒ 必红；「未配置仍显示自由输入」⇒ 必红；「提醒两次」⇒ 必红；「AI 代答 consent」⇒ 必红 —— 各附 `expectFailPattern` + 逐字节还原
- [ ] 真源切片（读生产模块；**禁**假 provider / 桩）；三段控制逐态可达

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test 2>&1 | grep -iE "s0|ai-next-candidate|not ok" | head -30
```

---

### TASK-NDA-217: Chromium 面（`s0-self-driven.mjs` + `recommendation.mjs` + `law8-plaintext.mjs` 只加断言）+ 人工面 `⏳`

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-NDA-216 |
| **执行波次** | 3 |
| **对应 FR** | FR-NDA-100 / 103 / 104 |
| **对应 AC** | AC-NDA-001 / 014 / 019 / 032 |
| **对应 ADR** | ADR-NDA-004（§③）/ ADR-NDA-202（§⑥） |

**描述**: `s0-self-driven.mjs` 加支线 C / D / E 终态断言；`recommendation.mjs` 等价重锚（分相终端 / 兜底 chip / AI 候选渲染）；`law8-plaintext.mjs` 零降级（兜底文案 / 留痕零明文）；**只加断言不加文件**；人工面 M1~M6 逐项 `⏳ 未执行`。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/ui/s0-self-driven.mjs` |
| MODIFY | `packages/web-cli-plugin/test/ui/recommendation.mjs` |
| MODIFY | `packages/web-cli-plugin/test/ui/law8-plaintext.mjs` |

**验收标准**:
- [ ] 断言**只加不删**；`CHROMIUM_GATES === 9` **不动**（不新增 Chromium 门禁文件）
- [ ] `recommendation.mjs`：已配置 ⇒ 终端恒最末；未配置 ⇒ 无终端 + 引导 chip；异常 ⇒ 兜底 chip
- [ ] `test:law8 ≥60` **零降级**；`test:recommendation ≥79`
- [ ] 人工面 M1~M6 逐项 `⏳ 未执行`（**不冒充 PASS**）；v5.5 / F-34 / F-35 / F-36 人工面零改写
- [ ] 门禁**串行**；`KL-N-10` 首轮异常 ⇒ 隔离复跑 ≥2 + 日志全量 + 仍红如实记录不阻塞

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run test:s0-self-driven && npm run test:recommendation && npm run test:law8
cd packages/web-cli-plugin && npm run test:gate-integrity
```

---

### TASK-NDA-218: `xNdaLedger` 终态（X-NDA-3/4/10/11）+ `xNdaLedgerFull` 全 12 条 + 保护段 `keep` 决策

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-NDA-216（叶1 `TASK-NDA-119` 骨架为本任务输入） |
| **执行波次** | 3 |
| **对应 FR** | FR-NDA-112 / 113 / 119 / 120 / 122 / 132 / 133 |
| **对应 AC** | AC-NDA-022 / 023 |
| **对应 ADR** | ADR-NDA-009（§①③④）/ ADR-NDA-202（§④⑤） |

**描述**: `xNdaLedger` 补叶2 四行（X-NDA-3 分相 superseded / X-NDA-4 新增兜底 superseded / X-NDA-10 首开 `no-supersession` / X-NDA-11 计数 `no-supersession`（依据 `ADR-NDA-006` 回调内 nudge，**由预登记降级**））；`xNdaLedgerFull` 两叶合并终态（**已发生取代 7 / 保留 1（9 子项）/ 未发生取代 4**，逐条 `counterCheck`）；`xNdaGateReconciliation` 全 25 行三态齐；**保护段 `keep` 决策**（journey `[43484,59347)` / binding `[107780,115930)`，**零改动 ⇒ 字节中立双绿**）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` |
| MODIFY | `packages/web-cli-plugin/test/supersession-ledger.test.ts`（只增判据） |

**验收标准**:
- [ ] `xNdaLedger` / `xNdaGateReconciliation` / `xNdaLedgerFull` 三键齐；每行含 `id`/`status`/`old`/`new`/`reason`/`date`/`landing`/`counterCheck`；`no-supersession` 的 `reason` **非空**
- [ ] `xNdaGateReconciliation` **25 行三态齐**（保留 / 等价重锚 / 显式取代），**无「未处置」项**；间接面逐条确认
- [ ] 老条目（v3 / v4 / v4.5 / v5 / v5.5 / F-34 / F-35 / F-36 段）**逐字保留**（`git diff` 只增）
- [ ] 保护段**零改动** ⇒ sha + `startByte` **双绿**；`modifiedRanges` 为空；`journey` / `binding` 两文件 `git diff` = 0
- [ ] `test:supersession ≥53`；`assertionsRemoved = 0`（保护段无取代 ⇒ 无需八步）
- [ ] `X-NDA-11` 台账写明「由 spec 预登记降级为 `no-supersession`」的判定依据

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run test:supersession
git diff --stat -- packages/web-cli-plugin/test/ui/journey.mjs packages/web-cli-plugin/test/ui/binding.mjs | tail -1  # 期望 0
```

---

### TASK-NDA-219: 体积叶2 重登记 + **两叶 Σ** + EC-NDA-016 三分支终态

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-NDA-217（叶1 `TASK-NDA-118` 为输入） |
| **执行波次** | 3 |
| **对应 FR** | FR-NDA-140 / 141 / 143 / 144 / 145 |
| **对应 AC** | AC-NDA-028 |
| **对应 ADR** | ADR-NDA-008（§②③⑤） |
| **列别 / 类型** | A（登记）/ doc |

**描述**: 按**叶2 产物**实测重登记（五要素 + 三值 + `SIDEPANEL_GROWTH_BREAKDOWN` 追加 `nda2Rows`）+ **两叶 Σ**（逐模块 Δ + 未归因 == Σ 登记增量）+ EC-NDA-016 **三分支逐项**（越生效上限 / 越档位 / 越绝对上限 = 是 / 否）+ B 列如实标注「不计账」。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/size-baseline.ts` |
| MODIFY | `packages/web-cli-plugin/test/size-growth-evidence.test.ts`（若涉及） |

**验收标准**:
- [ ] 叶2 五要素 + 三值同源前移；`nda2Rows` 逐模块；**两叶 Σ** 与逐模块归因算术机核绿
- [ ] EC-NDA-016 三分支逐项如实（**禁预填**，`NDA-P-006`）；越档须走 EC 显式路径 + 作者一行
- [ ] `authorConfirmation` 读值 = `pending-author-line`（**不得伪称已确认**）
- [ ] B 列（`next-drive-policy.ts` / `service-worker.ts`）标注「不计账」；反证「搬列规避 ⇒ 必红」
- [ ] 冻结面 `stat` + `sha256` 前后一致（`content.js` 177,076 B / `pick-layer.js` 34,358 B）
- [ ] `test:size-ruling-vol3 ≥13`；判据口径取 `spec §5.14.1` 保守包线（`NDA-P-010`）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run build && stat -c '%n %s' dist/sidepanel.js dist/background.js dist/content.js dist/pick-layer.js
cd packages/web-cli-plugin && npm run test:size-ruling-vol3 && npm run size:attribution
```

---

### TASK-NDA-220: 门禁守恒终态对账（三态齐 / 间接面 / `assertionsRemoved = 0` / 串行 / `KL-N-10`）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-NDA-212 / 213 / 214 / 218 / 219 |
| **执行波次** | 3 |
| **对应 FR** | FR-NDA-130 / 134 / 135 / 136 / 137 |
| **对应 AC** | AC-NDA-020 / 024 / 025 / 026 |
| **对应 ADR** | ADR-NDA-009（§④）/ ADR-NDA-202（§⑥） |

**描述**: 全门禁**终态对账**：三态齐（保留 / 等价重锚 / 显式取代）；间接面逐条确认；`assertionsRemoved = 0`（按**断言语义**，非行数）；`CHROMIUM_GATES === 9`；门禁**严格串行**记录；`KL-N-10` 隔离复跑 ≥2 记录；`gate-integrity` 受审下界只增。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| 复核 / 只增 | `packages/web-cli-plugin/test/gate-integrity.test.ts` |
| 记录 | 本叶 build / validate 门禁对账表 |

**验收标准**:
- [ ] 25 行 + 间接面**逐条三态齐**（无「未处置」）；`assertionsRemoved === 0`；计数**只增不减**
- [ ] `gate-integrity` 下界 ≥ 前值；`CHROMIUM_GATES === 9` 逐字
- [ ] 门禁**严格串行**（`test` / `test:ui` / `test:binding` 不并发；一次一个 Chromium；`finally` 自清 profile）执行记录齐备
- [ ] `KL-N-10`（`s0-self-driven` / `recommendation` / `binding`）首轮异常 ⇒ 隔离复跑 ≥2 + 日志全量 + 仍红**如实记录不阻塞收口**
- [ ] `npm test ≥1507` 或如实登记基线差异（`NDA-P-008`）；`e2e` PASS

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && npm run build && npm test
cd packages/web-cli-plugin && npm run test:gate-integrity && npm run test:supersession && npm run test:size-ruling-vol3
cd packages/web-cli-plugin && npm run test:e2e
```

---

### TASK-NDA-221: 红线巡检 + 人工面 M1~M6 如实登记 + 本叶收口对账

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-NDA-218 / 219 / 220 |
| **执行波次** | 3 |
| **对应 FR** | FR-NDA-003 / 004 / 104 / 130 / 142 |
| **对应 AC** | AC-NDA-027 / 029 / 032 |
| **对应 ADR** | ADR-NDA-009（§②③）/ ADR-NDA-202（§⑥） |

**描述**: 本叶收口轮：逐条巡检红线（零改基座 / 判定链零触碰 / 冻结面零容差 / 零新增载体 / 法八 / 特权恒 `gesture` / consent 不代答）+ 纪律（`.sddu` 外零触碰 / ROADMAP 零 diff / 不碰 `main` / path-limited `git add` / 无新依赖 / `.opencode/opencode.json` 零改 / `F-29` 区段一字不动）+ 人工面 M1~M6 如实登记 + 停机规则 14 条逐条确认。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| 巡检（无源码改动） | `packages/web-cli-plugin/**`（只读巡检） |
| 记录 | 本叶 build / validate 记录（人工面清单 + 收口对账） |

**验收标准**:
- [ ] `git diff --stat -- packages/web-cli-base/ .sddu/specs-tree-root/ROADMAP.md .opencode/opencode.json` = 0；`zeroDiffFiles` 9 项哈希 pin 不变
- [ ] `content.js` 177,076 B / `pick-layer.js` 34,358 B + sha 前后一致；`KIND_SET` 40 / 12 kind / 零宿主 / `ACT_TO_OP` 6 逐字
- [ ] 法八四面零明文不退化；特权 op 恒 `gesture`；consent（含兜底推荐）**不被 AI 代答**
- [ ] 人工面 M1~M6 逐项 `⏳ 未执行` / `PASS`，**不得冒充 PASS**
- [ ] 停机规则 14 条逐条确认未触发；触发项须停机上报（`blockers`）

**验证命令**:
```bash
git diff --stat -- packages/web-cli-base/ .sddu/specs-tree-root/ROADMAP.md .opencode/opencode.json | tail -1   # 期望 0
cd packages/web-cli-plugin && npm run test:law8 && npm run test:dead-end
```

---

## 3. 任务汇总

| 统计项 | 数值 |
|--------|:--:|
| 总任务数 | **21**（`TASK-NDA-201~221`） |
| S 级 (简单) | **3**（`203` / `205` / `215`） |
| M 级 (中等) | **16**（`201` / `202` / `206`~`214` / `217`~`221`） |
| L 级 (复杂) | **2**（`204` / `216`） |
| 执行波次 | **3**（W1 7 / W2 8 / W3 6） |
| spikeGate | **1**（`SG-NDA-03` = `TASK-NDA-201`） |
| 类型分布 | spike 1（`201`）/ impl 8（`202`/`203`/`204`/`205`/`208`/`209`/`210`/`211`）/ gate 8（`206`/`207`/`212`/`213`/`214`/`216`/`217`/`220`）/ doc 4（`215`/`218`/`219`/`221`）（合计 21） |
| 模板偏差 | 21 > 15（`../tasks.md §0.1` 已登记） |

## 4. 执行策略

| 波次 | 任务 | 策略 |
|:--:|------|------|
| **W1** | `201`（先验闸门，最前）→ `202` ∥ `203` → `205`；`204`（依赖 201/202/203）→ `206` → `207` | 先验闸门最前；`202` ∥ `203` 不相交可并行；`204` 是本叶 L 级接线（列向 B 列）；`206` / `207` 门禁收口。**只落 B 列**（A 列仅 `203` 微量） |
| **W2** | `208` → `209` → `210`；`211`；`212`；`213` ∥ `214`；`215` | `210` 是本波 A 列主体 ⇒ **落完立即实测**（在 `TASK-NDA-219` 前先量一次）；`213` ∥ `214` 不相交；`215` 为登记（可与 `214` 并行） |
| **W3** | `216` → `217`；`218` ∥ `219`；`220`；`221`（末位） | 收口轮·终局；`216` → `217` 硬序（node → Chromium）；`218` ∥ `219` 不相交；`220` 全门禁串行终态对账；`221` 末位（红线 + 人工面 + 停机确认） |

**停止规则（叶内）**：见 `../tasks.md §8.2` 全 14 条；本叶重点 = 规则 2（零改基座）/ 3（零新载体）/ 4（第二分类器 / 第二词表 / 第二引导面）/ 7（`SG-NDA-03` 不可行 ⇒ `202`/`204`/`206`/`213`/`214` 不得开工）/ 8（体积硬墙）/ 9（门禁降级：`assertionsRemoved = 0`）/ 12（提醒 ≥2 次 / 新增计数调用点）/ 13（未配置相显示终端 / 词表混同）。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（NDA-2 叶 tasks：**21 任务 / 3 波**（`TASK-NDA-201~221`；S×3 / M×16 / L×2）+ 1 个先验闸门（`SG-NDA-03`：nudge `chat` 回调内续呼 + 有界 + 零计数漂移；**编排器点名的两个最高风险点之一**）+ 显式取代 2（`free-input-next` 恒真→`risk.llmBlocked` 分相 / `ai-next-candidate` AI-N-15）+ 等价重锚 3（`driver-quadruple` 12↔12→13↔13 / `next-registry` NR-10 12→13 / `size-*` 两叶 Σ）+ **四处恰 N 不动（7 个集合）** + S0'''' 支线 C/D/E 终态（注入必红 + 逐字节还原）+ `xNdaLedger`/`xNdaLedgerFull`/`xNdaGateReconciliation` 终态 + 保护段 `keep`（字节中立双绿）+ 体积叶2 重登记 + 两叶 Σ + EC-NDA-016 三分支 + 门禁守恒终态对账 + 红线巡检 / 人工面 M1~M6 如实登记）。**本轮只做 tasks**：零 `src/test/dist/docs/design/ROADMAP` 改动；未跑门禁 / 构建 / Chromium；未调用任何受管 Provider（routing.v1 = `local_or_compute → none`） | 2026-09-27 | SDDU Tasks Agent |

---

## 5. 任务状态（build 收口登记）

> 来源：`build.md`（v1.0，2026-09-27）。**21 / 21 completed**；`assertionsRemoved = 0`；`npm test` 1517 → 1525。

| 任务 | 状态 | 落地证据（门禁 / 数值） |
|------|:--:|---|
| TASK-NDA-201 | ✅ completed | SG-NDA-03 **18/18 可行**（探针产物已删除，不落版本库） |
| TASK-NDA-202 | ✅ completed | `next-drive-policy.ts`；`PURE-OK` |
| TASK-NDA-203 | ✅ completed | `free-input.when` 分相（两读同在，DQ-3 绿） |
| TASK-NDA-204 | ✅ completed | `configured` 单源 + nudge 接线；计数零漂移（`runChatTurn(` 2 / `requestTurn(` 1 / `nextAfterSettle` 1 定义 10 调用点 / `maybeRecommend` 1 定义 8 调用点） |
| TASK-NDA-205 | ✅ completed | 未配置零新增面（`OPS_RECOVERY_*` 恰 2 / `BLOCKED_TERMINALS` 恰 5） |
| TASK-NDA-206 | ✅ completed | `free-input-next` 27 tests 全绿（分相 + 双向反证） |
| TASK-NDA-207 | ✅ completed | `r8-open-next-entry` 零改语义绿；`no-dead-end` **56/0**（53 → +3） |
| TASK-NDA-208 | ✅ completed | `AI_ABNORMAL_CODES` 恰一处；`SINGLE-SOURCE-OK` |
| TASK-NDA-209 | ✅ completed | `onFinish(outcome)` + `abnormal` 只在非 null 附加 |
| TASK-NDA-210 | ✅ completed | `llm.abnormal` 第 13 行；不入三集合（5 / 2 / 5） |
| TASK-NDA-211 | ✅ completed | 面板零第二分类器（注释剥离后零命中） |
| TASK-NDA-212 | ✅ completed | `driver-quadruple` 13↔13 / `next-registry` NR-10 13 |
| TASK-NDA-213 | ✅ completed | 7 个集合逐字未变 |
| TASK-NDA-214 | ✅ completed | `ai-next-candidate` 28 tests 全绿（判据表 15 → **18**） |
| TASK-NDA-215 | ✅ completed | 首开零行为改动（`git diff` = 0）；`PD-NDA-001` / `PD-NDA-016` 登记 |
| TASK-NDA-216 | ✅ completed | S0'''' 两叶并集覆盖全十二拍；叶2 五拍由 `n/a` 升 `ok` |
| TASK-NDA-217 | ⚠️ completed | law8 **72/0** · recommendation **85/0** · s0-self-driven **100/3**（3 项既有环境 flake，`KL-N-10` 如实登记） |
| TASK-NDA-218 | ✅ completed | `xNdaLedger` **12 行** + 对账 **25 行**三态齐 + `xNdaLedgerFull` **7/1/4** + 保护段 keep 双绿 |
| TASK-NDA-219 | ✅ completed | 605,239 → **606,652 B**（+1,413）；两叶 Σ A 列 **+2,050 B**；EC-NDA-016 三分支皆「否」 |
| TASK-NDA-220 | ✅ completed | `gate-integrity` 27/0 · `supersession` 56/0 · `size-ruling-vol3` 14/0 · `e2e` PASS |
| TASK-NDA-221 | ✅ completed | 红线逐条通过（零改基座 / 冻结面逐字节 / 保护段 keep / 零新载体 / 法八 / 特权恒 gesture） |

### 5.1 显式取代 / 等价重锚（终态）

- **显式取代 2**：`free-input-next`（恒真 → 分相）/ `ai-next-candidate`（`AI-N-1~15` → `1~18` + S0''' D 分相重锚 + S0'''' 叶2 升 `ok`）
- **等价重锚**：`driver-quadruple` 12↔12 → 13↔13 / `next-registry` NR-10 12 → 13 / `r8-open-next-entry` 分相 `when` / `onboarding-deterministic` OD-5 锚点 + OD-16 换链 / `s0-self-driven-chain` D 支线 / `size-budget` · `size-growth-evidence` · `size-ruling-vol3` · `density-thresholds` 三值 / `s0-self-driven` S0C-13 D
- **只增**：`no-dead-end` ND-11 / `law8-plaintext` ★ NDA-2 ⑬ / `recommendation` 分相 / `s0-self-driven` S0C-16 / `supersession-ledger` xNda 叶2
- **零改**：`gate-integrity` / `blocked-terminals` / `driver-terminals` / `driver-timings` / `op-wiring` / `turn-arbitration` / `proactivity-guard` / `journey` · `binding`（保护段 keep）
