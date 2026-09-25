# R8 缺陷修复轮 — 首开面板零 next 死端（open / ready 入口）修复记录

- **日期**：2026-09-25
- **分支**：`feature/web-cli-plugin`（基线 HEAD `901df58`）
- **诊断结论**：首开（`authorized ∧ configured`）面板零 `recommendNextStep` 求值 ⇒ 末端「自由输入…」终端永不铸出 ⇒ **首屏无输入入口**（只读诊断，置信度 0.9）
- **性质**：真机暴露的 P3 缺陷快修（非新功能）；作者裁决「首开初始触发（复用既有 `idle`）+ 门禁重锚 + 首开稳态断言 + 体积五要素登记」
- **纪律**：测试只增（≥1443）；门禁串行 + 日志 `/tmp/opencode/v4-gate-logs/r8-open-next/`；三冻结面 / base 零 diff；体积五要素登记（越档登记不停机）；不动 `.sddu`。

---

## 基线（修复前）

| 项 | 值 |
|---|---|
| `npm test` | 1443 / 0 |
| `dist/sidepanel.js` | 598,577 B（生效上限 628,505 / 档 614,400 / 绝对 675,840 / `pending-author-line`） |
| `dist/content.js` | 177,076 B（sha `52a82620…`，冻结） |
| `dist/pick-layer.js` | 34,358 B（sha `77796bab…`，冻结） |
| journey 保护段 pin | `[43484,59347)` / sha `7b309258…`（`decision = keep`） |
| binding 保护段 pin | `[107780,115930)` / sha `be9ad0e9…`（`decision = keep`） |

---

## 根因（真机 01:38:33 序列，逐层）

```
首开面板：authorized = true ∧ configured = true
  → onboarding.visible = !(configured ∧ authorized) = false
    → maybeRecommendFirstRunEntry() 在 :2249 守卫处直接 return（firstRun 时机**无卡可铸**）
      → 无回合 ⇒ 'idle' 只在「回合结束 / 失败」时跑（:4057 / :4129）——冷启动没有回合
      → 无引用 ⇒ 'pick' / 'answered' 无从触发（:2787 / :2857 / :2097）
        → maybeRecommend（生产内核唯一入口）在冷启动**永不被调用**
          → recommendNextStep 不铸卡 ⇒ 末端「自由输入…」终端（只注入到**已铸卡**末端，
             cards/nextstep.ts）无处渲染
            → 恒真 when（providers.ts 的 free-input provider）无从兑现
              → **首屏无输入入口**（IAN-2 已真退役流外三 id ⇒ 流内输入卡是唯一输入面）
```

### 缺陷形态（修复前 `sidepanel.ts`）

`recommendNextStep` 的生产调用点只有 5 个时机驱动（`pick` / `stale` / `idle` / `firstRun` /
`answered`），且 **`firstRun` 是首开面板唯一可能触发的时机**——但它在
`authorized ∧ configured` 时被自己的可见性守卫挡在门外：

```
maybeRecommendFirstRunEntry():
  if (firstRunEntryHandled) return;
  if (!llmLoaded || !stateReplyApplied) return;
  const firstRun = firstRunCard(buildOnboarding({...}));
  if (!firstRun.visible) return;   // ← authorized ∧ configured ⇒ 直接 return，不消费入口
  firstRunEntryHandled = true;
  maybeRecommend('firstRun');
```

`firstRunCard.visible === onboarding.visible && currentStep !== null`，而引导 5 步的
`steps[0] = configured` / `steps[3] = authorized`：`configured ∧ authorized` ⇒ `visible === false`；
否则首个未完成步恒非空（`configured=false ⇒ 步1`；`configured ∧ !authorized ⇒ 步4`）⇒
**`firstRunCard.visible === !(configured ∧ authorized)` 恒成立**。

### 门禁为何全绿（绕过的层）

既有门禁只判「首装（未配置 / 未授权）⇒ onboarding 卡」与「有引用 / 有回合 ⇒ 卡」——
从未判「`authorized ∧ configured` 的**冷启动**（无回合 / 无引用）也必有卡」。这正是本轮的
新判据（R8 门禁 `R8-4` / `R8-5`）。

---

## 修法（1 项 + 1 项登记）

### 1. 首开 / ready 入口（`src/ui/sidepanel/sidepanel.ts`）

新增**一次性** `maybeRecommendOpenEntry()`，在**首个稳定点**求值一次：

```ts
function maybeRecommendOpenEntry(): void {
  if (openEntryHandled) return;
  if (!llmLoaded || !stateReplyApplied) return;
  // 首装面仍在 ⇒ 让位既有 firstRun 入口（onboarding 卡末端同样有终端）——两入口不同时铸。
  if (!state.authorized || !Boolean(llmSummary?.configured)) return;
  openEntryHandled = true;
  maybeRecommend('idle');   // ★ 复用既有 'idle' 时机（零新增触发词）
}
```

- **触发点（两稳定点）**：`eventizeChannels()` 尾（`refreshState` 应用 state 回包后）与
  `refreshLlmStatus()` 落地后——每个都**紧随** `maybeRecommendFirstRunEntry();`。判定要求
  `stateReplyApplied ∧ llmLoaded` 两事实到位（探测相位随 `state` 回包落地 ⇒ 该点即可读）；
  半加载面板不判。
- **让位 firstRun（零双卡）**：`firstRunCard.visible === !(configured ∧ authorized)` ⇒
  `!(configured ∧ authorized)` 时**不消费**本入口（返回），由同一事件化点紧随其后的
  `maybeRecommendFirstRunEntry()` 铸 onboarding 卡（终端由 `recommendNextStep` 注入其末端）。
  两入口**不同时铸**：终端注入在**任意被铸卡**上（含 onboarding 卡）。
- **复用既有 `'idle'` 时机**：不新增第 6 触发词 ⇒ `DRIVER_TIMINGS` 闭集仍**恰 5**
  （DT-2 / DT-3 逐字不动）；`maybeRecommend(` 调用点 **7 → 8**（如实登记）。
- **零死端 floor**：`authorized ∧ configured ∧ 探测未 ready` ⇒ 规则候选空 ⇒ 由既有 floor 铸
  「仅含终端」最小卡（`cards/nextstep.ts` 的 `.next-terminal[data-act="free-input"]`）⇒ 首屏必有入口。
  探测已 `ready` ⇒ `capability-discovery` 卡（同样带终端）。
- **有界**：一次面板生命至多一次（与 `firstRunEntryHandled` 同为**面板寿命事实**，
  `testing.reset()` **不**清——清掉会让 `reset()` 之后的迟到 `probe-changed → refreshState()`
  再铸一张卡，静默移动已登记的密度格）。生产者自身的 `pending` / 间隔 / 无候选门控仍是最后一道。

### 2. **deferred**：探测稳态补一次有界求值（本轮未做，登记理由）

诊断建议的「`probe-changed` 相位转 `ready` 后补一次求值，带出 capability-discovery chips」
本轮**不做**，理由是可复现的**夹具风险**（不是省略）：

- 该补求值必须保留一个 **`probe-pending` 相位态**（等待 ready），而密度夹具在
  `authorize()` **之后**才 `testing.reset()` 清流（`density.mjs#fixturePass`）。相位态若存活到
  `reset()` 之后，迟到的 `probe-changed → refreshState()` 会再铸一张卡，**静默移动
  `SETTLED_EXPECTED_CARDS` 已登记的精确卡数**（`default: 2` 等）——这正是
  `sidepanel.ts:1081-1087` 明写的同族 hazard。
- 本轮的**核心缺陷**（首屏无输入入口）已由单次求值 + 零死端 floor 完全闭合；capability chips
  在「探测已 ready 的首个稳定点」仍会带出（单次求值即产出 `capability-discovery`），
  未 ready 时首次交互后由既有 `'idle'` 时机接续。
- **F-36 边界**：「AI 推荐进 chips 层」是另一条线（把推荐做成 chips 的一种来源），与本轮的
  「首屏入口存在性」正交；本轮不触碰 chips 层的来源集合（`NEXTSTEP_PRIORITY` 仍恰 4 规则 /
  provider 集合与 `DRIVER_DECLS_SRC` 双向包含不动）。

---

## 注入反证（移除 open 入口 ⇒ 首开零卡必红，实测证据）

1. **源文判据反证**（`test/r8-open-next-entry.test.ts#R8-5`）：从真实 `sidepanel.ts` 源文本删掉
   两处 `maybeRecommendOpenEntry();` 调用点 ⇒ `openEntryWiringProblems()` 判红
   （`调用点实测 0 处 ≠ 2`）；把定义改名 ⇒ 定义计数判红；把时机换成 `'stale'` ⇒ R8-2 判红；
   逐字还原 ⇒ PASS。
2. **行为面反证**（`R8-4`）：冷启动可达性模型中，入口缺席 ⇒ 首开卡数 = 0（正是本缺陷）；
   入口在场 ⇒ `authorized ∧ configured ∧ 探测 probing` 恰 1 张**带终端**的 floor 卡、
   探测 `ready` ⇒ `capability-discovery` 卡且带终端。
3. **既有 Chromium 面**：`test:density`（242/0）、`test:l0`（251/0）、`test:l1`（132/0）、
   `test:l2`（74/0）、`test:ui`（journey 171 PASS，保护段 pin `7b309258…` 命中）、
   `test:s0-self-driven`（82/0）全部保持 —— open 入口在无 `configured ∧ authorized` 的夹具上
   恒让位，零卡数漂移。

---

## 门禁对账

| 门禁 | 基线 | 本轮 |
|---|---|---|
| `npm test` | 1443 / 0 | **1449 / 0**（+6：新 `test/r8-open-next-entry.test.ts` 六用例） |
| `driver-timings`（`maybeRecommend(` 计数） | 7 | **8**（DT-4 如实登记调用点增；闭集仍恰 5） |
| `op-wiring`（OP-W ⑥ / ⑨ 复合读数） | 7 | **8**（`requestTurn` 仍恰 1 / `nextAfterSettle` 1 定义 + 10 调用点） |
| `r6-ty-experience-fix`（主流程调用点） | 7 | **8** |
| supersession-ledger | 49 / 0 | **49 / 0**（6 行门禁改写 + 12 行体积登记逐字入账） |
| gate-integrity | 0 fail | **0 fail**（新 node 门禁纳入 `EXPECTED_AUDITED_FILES`） |
| journey（`test:ui`） | 171 | **171 PASS**（保护段 `7b309258…` 命中断言 171 逐字） |
| density | 242 | **242 / 0** |
| l0 / l1 / l2 | 248 / 131 / 74 | **251 / 132 / 74 / 0** |
| s0-self-driven | 82 | **82 / 0** |
| dead-end / law8 / auth-chip | 49 / 36 / 37 | **53 / 60 / 37 / 0**（IAN-2 后基线） |
| stream / ask-auth / insight / hardening | 76 / 78 / 118 / 24 | **76 / 78 / 125 / 24** |
| zero-injection / page-input | 28 / 125 | **28 / 125 / 0** |
| e2e | PASS | **PASS**（R8 E2E，real dist 全链） |
| recommendation | 79 | **79 PASS**（首跑 ⑭ 环境性 flake：授权握手回执未及；隔离复跑 79/0） |
| l1-reverse | 9 | **9 PASS**（注入 → FAIL → sha256 复原 → PASS） |
| l2-reverse | 10 | **超时（EXIT=124）**——已知限制（v55-3 validate 已登记），本轮**变更面零命中** |
| binding | 192 | 未跑（环境性 flake，KL-N-10 同族；保护段 `be9ad0e9…` 由 supersession 49/0 + 保护段 pin 独立机核兜底） |

---

## 体积五要素（**重登记**：sidepanel +349 B，未跨档位）

| 要素 | 值 |
|---|---|
| 前值 → 后值 | 598,577 → **598,926 B**（Δ +349；逐模块 = `sidepanel.ts` 114,149 → 114,498，Σ +349 + glue 0） |
| 档位 / 绝对上限 | **614,400 / 675,840 均不动**（598,926 < 614,400 ⇒ 未跨档位，无需升档） |
| 生效上限 | floor(598,926 × 1.05) = **628,872**（旧 628,505 上调） |
| EC-IAN-016 三态 | 越生效上限 = 否 / 越档位 = 否 / 越绝对上限 = 否 |
| 披露 / 占位 | `SIDEPANEL_CEILING_CAP_ROLE === 'record-only'`；`authorConfirmation` 保持 `pending-author-line`（不伪称已确认） |

- 三冻结面：`dist/content.js` 177,076 B（sha `52a82620…`）、`dist/pick-layer.js` 34,358 B
  （sha `77796bab…`）、`packages/web-cli-base/**` **逐字节不变**。

---

## 登记（deferred，不修）

| # | 面 | 现象 | 处理 |
|---|---|---|---|
| D1 | 探测稳态补一次有界求值 | 见上文 §修法 2：`probe-pending` 相位态跨 `testing.reset()` 会与密度夹具精确卡数冲突 | 本轮不做，登记理由；核心缺陷已闭合 |
| D2 | F-36「AI 推荐进 chips 层」 | 推荐来源集合扩张（与「首屏入口存在性」正交） | 不在本轮范围，单独 follow-up |
| D3 | `l2-reverse` 本机超时 | EXIT=124（既有已知限制，变更面零命中） | 如实登记，不冒充 PASS |

---

## 零触碰确认

- `packages/web-cli-base/**`（base）零 diff；`src/content/**` 零改动（`content.js` sha 复核）。
- `src/security/policy.ts` / `auto-authorize.ts`（判定链）未触达。
- `manifest.json` / `KIND_SET` 40 / 12 kind 零宿主 / 特权 op 恒 `gesture` / 法八（零明文）零改动
  （由 `test:gate-integrity` / `test:law8` / `test:supersession` 机核）。
- `.sddu/**` 零改动（R8 是缺陷轮，记录入 `packages/web-cli-plugin/docs/`）。
- 台账登记：`docs/v4-supersession-ledger.json` 追加 `R8-E-VOL-1` 条目 + 叶段逐字登记
  （`sidepanel` 无源码台账面；`test/driver-timings` / `op-wiring` / `r6-ty-experience-fix` /
  `size-*` 的改写行逐字入账）+ 体积指针 repoint；`docs/v4-density-baseline.json#volume` 同源重登记。
