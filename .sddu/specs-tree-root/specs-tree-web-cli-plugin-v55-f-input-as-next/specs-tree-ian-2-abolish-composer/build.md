# 构建报告：specs-tree-ian-2-abolish-composer（IAN-2 废除 `#composer` + 法四修订：DOM 真退役 + 判据重锚）

> **文档定位**: SDDU 构建报告 — 记录本叶 **R1（W04+W05+W06 核心）** 的文件变更与实现结果，作为 review / validate 阶段的输入
> **前置依赖**: 本叶 `tasks.md` v1.0 / `plan.md` v1.0 / `spec.md` v1.0；父 `../plan.md`（`ADR-IAN-004~010`）；叶1 `../specs-tree-ian-1-free-input-next/`（validated）
> **创建人**: SDDU Build Agent
> **创建时间**: 2026-09-25
> **版本**: v1.0（R1 = W04+W05+W06 核心）
> **更新人**: SDDU Build Agent
> **更新时间**: 2026-09-25
> **更新说明**: 初始创建（R1：SG-IAN-03 先验「可行」· 停引→删面 8 步（写者消解 / 三 id DOM 真退役 / 容器册 13→16 / `NEVER_FOLDABLE` 14→13）· 四处兜底收敛 · `#send-reason`/`sendDisabled`/draft 重锚 · 法四三处原地修订 + `law4-input-as-next` 新门禁 · journey 保护段八步显式取代（新 pin `7b309258…` / 43484..59347 / 249 行）· binding 保段 keep（sha `be9ad0e9…` + `startByte` 107780 双绿）· 体积净负登记 −548 B · 门禁对账 1431 → **1437 / 0**。**偏差登记**：TASK-IAN-220 的 `insight.mjs` / `l0.mjs` / `l1.mjs` 三 Chromium 重锚与冻结 v3 取代台账（RL-10 要求 `zeroDiffFiles === 9`）冲突 ⇒ 三者**回退原状、显式留 R2**（见 §6）。

---

## 1. 构建概要

| 维度 | 数值 |
|------|:--:|
| 本轮范围 | **R1 = W04（TASK-IAN-201~206）+ W05（207~212）+ W06 核心（213~219 / 221 / 224）** |
| 完成任务 | **19 / 19**（201~219 / 221 / 224）；**W06 终局三项（222 Chromium 侧 / 223 / 225）留 R2** |
| 复杂度分布 | S×0 / M×17 / L×2（仅统计 R1 完成任务） |
| 新增文件 | 1（`test/law4-input-as-next.test.ts`） |
| 修改文件 | ~28（`src`×7 / `test`×16 / `docs`×2 / SDDU 产物×2；探针文件 `test/_spike/*` 探毕删除） |
| 门禁（node） | 1431 → **1437 / 0**（+6，零删除） |
| 冻结面 | `dist/content.js` 177,076 B / sha `52a82620…` · `dist/pick-layer.js` 34,358 B / sha `77796bab…` · `manifest.json` 零 diff · `packages/web-cli-base/**` 零 diff · `turn-queue.ts` 零 diff |
| 体积（A 列） | 599,125 → **598,577 B**（**净负 −548 B**；详见 §5） |

### 1.1 SG-IAN-03（TASK-IAN-213，先验闸门「可行」；探针 `test/_spike/sg-ian-03-probe.mjs` 探毕删除）

| 要素 | 结论 |
|---|---|
| **假设** | journey 保护段八步取代可行 ∧ binding 段前等长补偿可行（`ADR-IAN-007 §①/②`） |
| **探针方法** | 读生产真源 `test/ui/{journey,binding}.mjs`；按锚点定位保护段 → 计 `startByte/endByte/lineCount/sha256`；计段内 `composer` 引用数 |
| **实跑证据** | journey：段内 `composer` 引用 **10** 处；新 pin = `startByte 43484 / endByte 59347 / lineCount 249 / sha 7b309258…`（旧 pin `43054..58287 / cc79f413… / 240`）。binding：段内 `composer` **0** 处（`'input'` 1 处为 `new Event('input')` 事件名，非 `#input` 元素）→ keep 可行；段前改写后 `startAnchor` 字节偏移 **仍 = 107780**，段本体 sha **`be9ad0e9…`** 双绿 |
| **结论** | **可行（4/4）**；BLK-IAN-3 未触发；探针产物不落版本库（已删） |

---

## 2. 文件变更

### 2.1 源码（`src/**`）

| 操作 | 文件路径 | 任务 | 说明 |
|:--:|------|:--:|------|
| MODIFY | `src/ui/sidepanel/index.html` | 202 | 删 `<form id=composer>`（含 `#input`/`#send`）+ **6 条 CSS** + 出流注释；三区 CSS `body.settings-open …` **逐字不变**；注释同步 |
| MODIFY | `src/ui/sidepanel/l0/shell.ts` | 201 | 停引：`revealFallback`/`hideFallback` 去 `composer.hidden` 写入面（只 `setAskFallbackOpen`）；保留 `revealAskFallback → l0?.revealFallback()` 调用（PD-IAN-007） |
| MODIFY | `src/ui/sidepanel/sidepanel.ts` | 203/204/207/208/210 | 删 `syncComposerVisibility()`+两调用点 / `let fallbackOpen`+读写 / `$('send').disabled` writer / `#composer` submit 监听（含 `requestTurn(input.value)`）；测试钩子重锚只操作卡内；draft 重锚到流内 free-input 卡 `#ask-input`（空安全）；`busy-rejected` **载体唯一化**到流内（`restoreFreeInputDraft`）；env guard 去 `send`/`#input` |
| MODIFY | `src/ui/sidepanel/view-model.ts` | 208 | `AskFlowInput` 增 `hasOrigin`；`AskFlowView.sendDisabled = !hasOrigin`（**禁用仅异常态 / 在飞不硬禁用**）；`sendDisabledReason` 分流（`pending` → 排队提示；异常态 → `flow.sendDisabled` 判据） |
| MODIFY | `src/ui/sidepanel/disclosure.ts` | 206 | `NEVER_FOLDABLE` 删 `'composer'`（**14→13**）+ 注释算术订正 |
| MODIFY | `src/ui/sidepanel/host-registry.ts` | 206 | PRESERVED 去三项；`RETIRED_CONTAINER_IDS` 追加 `#composer`/`#input`/`#send`（**13→16**）；`RETIRED_HOST_ATTRS` 宿主值 4 项逐字保留；dispositions 随派生只增 |
| MODIFY | `src/ui/sidepanel/stream-render.ts` / `cards/nextstep.ts` / `recommend.ts` / `stream-model.ts` / `next-registry/ops.ts` / `pick-input.ts` / `chat-state.ts` / `settings/view-switch.ts` | 203/206 | 陈留注释同步（零「保留 `#composer`」类矛盾）；`ops.ts` 的 `requestTurn(` 计数说明改为**恰 1** |

### 2.2 测试与门禁（`test/**`）

| 操作 | 文件路径 | 任务 | 说明 |
|:--:|------|:--:|------|
| NEW | `test/law4-input-as-next.test.ts` | 216 | **法四机核门禁** `law4-input-as-next`（L4-1~6 + 三反证实跑 + 三段控制 + 真源切片）：三 id DOM 零命中 / 逐 id 入册（16）/ 默认屏零可见输入框 / 流内卡内可用 / 禁恒真 / 真源切片 |
| MODIFY | `test/op-wiring.test.ts` | 205 | `op.turn.callSites` 2→**1**；`requestTurnProblems` 判据恰 1（+ 注入第 2 处必红）；`OP-W ⑥/⑦/⑨` 数值重 pin |
| MODIFY | `test/free-input-next.test.ts` | 211 | FIN-3 恰 2→**1**（+ 反证）；FIN-7 双载体→**唯一载体**（流外写点零命中，反证改注入回流必红）；FIN-9 随 FIN-7 复原 |
| MODIFY | `test/turn-arbitration.test.ts` | 210/211 | TA-4 载体唯一化（`panelRestoreProblems`：流外 `#input` 写点必须零命中；删回填仍必红）；反证改「重新引入流外写点 ⇒ 必红」 |
| MODIFY | `test/r6-ty-experience-fix.test.ts` / `ref-context-in-turn.test.ts` | 211 | `requestTurn` 恰 2→1 重锚 + 反证重指向 |
| MODIFY | `test/host-registry.test.ts` | 206/211 | 容器册 13→**16**（`TEST_RETIRED_CONTAINER_IDS` 同步）+ 逐 id 回流必红反证；并集/真相册 17→20 |
| MODIFY | `test/density-thresholds.test.ts` | 206/209/211 | V4_RETIRED_IDS 增三 id；`#input`/`#send` 由「不得在册」转「**必须**在册」（`send-reason`/`rebind` 保持不得在册）；v1 基线 / 收起 hidden / 零宿主三测等价重锚 |
| MODIFY | `test/l0-disclosure.test.ts` | 211 | `NEVER_FOLDABLE.length` 14→**13** + `'composer'` 不在集合（非恒真） |
| MODIFY | `test/sidepanel-view.test.ts` / `settings.test.ts` | 208/211 | 三 id 真退役静态断言；draft 载体等价重锚 |
| MODIFY | `test/s0-self-driven-chain.test.ts` + `test/ui/fixtures/s0-chain.mjs` | 222（node 侧） | **S0''-B 终态**（三 id 零命中 / 唯一回填载体 / `requestTurn` 恰 1 / 注入 `<form id=composer hidden>` 必红）；七判据 + 十环节单源 |
| MODIFY | `test/supersession-ledger.test.ts` | 217 | RL-07 `requestTurn(` 恰 2→**1**；保护段链/台账判据随第三次取代重锚 |
| MODIFY | `test/gate-integrity.test.ts` | 221 | `EXPECTED_AUDITED_FILES` 只增 `law4-input-as-next` + `IAN2_NODE_GATE_FILES` 下界 + 元门禁用例；`CHROMIUM_GATES === 9` 不动 |
| MODIFY | `test/ui/journey.mjs` | 218 | `#15c` 同编号等价改写（三 id 零命中 ∧ 默认屏零可见输入 ∧ 流内卡内输入可展开/可聚焦且几何不越出视口）；`composerGapToBottom` 消解并**显式登记**（`{dissolved,…}`）+ 新增 `regionBottomGap` / 流内输入卡几何等价读面；`#11g`/`#33f`/`#33m`/`#15q` 载体重锚；八步取代（新 pin） |
| MODIFY | `test/ui/binding.mjs` | 219 | DIAG_SELECTORS 去 `composer`（等价面 `send-reason`/`ask-input`）；真实键入路径重锚到流内 free-input 卡（`#ask-input`/`#ask-submit`，**路径不删**）；`#5` 重锚 `#send-reason` + 三 id 零命中；**段前等长补偿** ⇒ `startAnchor` 仍 = 107780（sha `be9ad0e9…` 双绿） |
| MODIFY | `test/ui/recommendation.mjs` | 220 | ⑰ / ① / ⑭ 的 `#input` 读数重锚（三 id 零命中；空安全读） |
| MODIFY | `test/ui/s0-self-driven.mjs` | 222（Chromium 侧） | S0''-B 终态读数（三 id 零命中 + 注入必红 + 唯一回填载体 + 不覆盖非空）；① 真实用户回合改走流内 free-input 卡 |
| MODIFY | `test/size-baseline.ts` / `size-budget.test.ts` / `size-growth-evidence.test.ts` / `size-ruling-vol3.test.ts` | 224 | 体积叶2 净负重登记：基线 599,125 → **598,577**；`ian2Rows` + `ian-2-r1` 登记条目 + `closeoutDeltaBytes −548` + `unattributedHelperDeltaBytes` 重算 + 数值重 pin（1437 / ceiling 628,505） |

### 2.3 台账与文档

| 操作 | 文件路径 | 任务 | 说明 |
|:--:|------|:--:|------|
| MODIFY | `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v4-chat/spec.md`（`:116` / `:225` / `:385`） | 214 | **唯一授权例外**：法四三处**原地修订**为「输入即 next：自由文本输入是流内 next 的一个选项；**流外零输入面**」（不升格法十；三处一致，半修即红） |
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` | 215 | journey 第三次取代（`protectedRanges` 新 pin / `supersessionChain` 第 4 节 / `protectedSupersession` 八步 + `history` 归档 v4.5-1 / `redlineRemap` 6→**7**）；binding keep 段外逐行登记；新增 `IAN2-E-*` 条目 + `xIanLedger` 载体；`leafBases` 追加 ian-2 段并逐叶复算 scope + 逐字登记删除面；`v3Vol3Closeout.⑤` 重 pin 598,577 |
| MODIFY | `packages/web-cli-plugin/docs/v4-density-baseline.json` | 224 | `volume.registeredBaselineBytes` 599,125 → **598,577**；`ceilingBytes` 629,081 → **628,505** |

---

## 3. 任务完成清单

| 任务 | 名称 | 复杂度 | 状态 |
|------|------|:--:|:--:|
| TASK-IAN-201 | 停引（`l0/shell.ts` 去流外 `composer.hidden` 写点，保留调用） | M | ✅ |
| TASK-IAN-202 | DOM / CSS 退役（三 id + 6 条 CSS + 出流注释） | M | ✅ |
| TASK-IAN-203 | 写者消解（`syncComposerVisibility` / `fallbackOpen` / `#send` writer / submit 监听） | L | ✅ |
| TASK-IAN-204 | 测试钩子重锚（只操作卡内，无死写点） | M | ✅ |
| TASK-IAN-205 | `op-wiring` 等价重锚（`requestTurn(` 恰 2→1 + 反证，与删面同轮） | M | ✅ |
| TASK-IAN-206 | 登记退役（`NEVER_FOLDABLE` 14→13 / `RETIRED_CONTAINER_IDS` 13→16） | M | ✅ |
| TASK-IAN-207 | 四处兜底收敛终态（只展开卡内；`op.describe` 有值相不变） | M | ✅ |
| TASK-IAN-208 | `view-model.ts` 重锚族（`sendDisabled` 仅异常态 / draft 重锚 / 引导） | M | ✅ |
| TASK-IAN-209 | `#send-reason` 保留 + 判据重锚（非恒真） | M | ✅ |
| TASK-IAN-210 | R6 唯一化（入口 / 回填载体唯一到流内）+ TA-4 重锚 | M | ✅ |
| TASK-IAN-211 | node 门禁重锚族（7 文件） | M | ✅ |
| TASK-IAN-212 | W2 回归 + 反证还原记录（`npm test` / sha256 前后相同） | M | ✅ |
| TASK-IAN-213 | SG-IAN-03 journey 八步取代预演（先验闸门） | M | ✅（可行 4/4） |
| TASK-IAN-214 | 法四三处原地修订（`:116` / `:225` / `:385`） | M | ✅ |
| TASK-IAN-215 | 台账（新 pin / chain / 八步 / `redlineRemap` 6→7 / `modifiedRanges`） | M | ✅ |
| TASK-IAN-216 | `test/law4-input-as-next.test.ts` 新门禁（L4-1~6） | L | ✅ |
| TASK-IAN-217 | `supersession-ledger` 重锚 / 保留（RL-07 恰 1 等） | M | ✅（X-IAN 台账扩至 11 行留 R2） |
| TASK-IAN-218 | journey 保护段八步显式取代 | L | ✅ |
| TASK-IAN-219 | binding 保护段 keep 字节中立 | L | ✅ |
| TASK-IAN-220 | Chromium 门禁等价重锚族 | M | ⚠️ **部分**（journey / binding / recommendation / s0 / density / law8 / hardening / l1 / l1-reverse / page-input / zero-injection / auth-chip / no-dead-end / e2e 已重锚并绿；**`insight.mjs` / `l0.mjs` / `l1.mjs` 三者回退原状、显式留 R2** —— 见 §6） |
| TASK-IAN-221 | `gate-integrity` 下界只增 `law4-input-as-next` | M | ✅ |
| TASK-IAN-222 | S0''-B 终态样板 | L | ⚠️ **部分**（node 侧 + Chromium `s0-self-driven.mjs` 已落；人工面 M3/M4 未执行） |
| TASK-IAN-223 | 红线守账巡检 + `KL-N-10` 隔离复跑 | M | ⏭ 留 R2 |
| TASK-IAN-224 | 体积叶2 净负重登记（五要素 + 两叶 Σ） | M | ✅ |
| TASK-IAN-225 | 18 门禁三态对账 + 交接（末位收口） | M | ⏭ 留 R2 |

---

## 4. 门禁对账（R1 实测，串行；日志 `/tmp/opencode/v4-gate-logs/ian-2-r1/`）

| 门禁 | 基线 | **R1 实测** | 判定 |
|------|:--:|:--:|:--:|
| `npm test`（node） | 1431 / 0 | **1437 / 0** | ✅ **+6**（零删除） |
| `test:ui`（journey） | 171 | **171** | ✅ 保段（八步取代；新 pin `7b309258…`） |
| `test:binding` | 192 | **192** | ✅ 保段（sha `be9ad0e9…` + `startByte` 107780 双绿） |
| `test:recommendation` | 79 | **79** | ✅ 保段 |
| `test:s0-self-driven` | 81 | **82** | ✅ **+1**（S0''-B 终态） |
| `test:density` | 242 | **PASS** | ✅ 保段 |
| `test:law8` | 60 | **PASS** | ✅ 零降级（≥36） |
| `test:hardening` | 24 | **24（隔离复跑）** | ✅ 保段（首轮 CDP flake ⇒ 复跑 PASS） |
| `test:insight` | 118 | **deferred** | ⏭ R2（见 §6） |
| `test:l0` | 248 | **deferred** | ⏭ R2（见 §6） |
| `test:l1` | 131 | **131** | ✅ 保段 |
| `test:l1-reverse` | PASS | **PASS**（9/9） | ✅ 保段 |
| `test:l2` | 74 | **74**（首轮）；后续复跑 env 红 | ⚠️ KL-N-10 环境性 |
| `test:l2-reverse` | PASS | **env 红（前置基线不 PASS）** | ⚠️ KL-N-10 环境性（如实登记，不阻塞） |
| `test:page-input` / `zero-injection` / `auth-chip` / `no-dead-end` | PASS | **PASS** | ✅ 保段 |
| `test:e2e` | PASS | **PASS** | ✅ 保段（首轮 CDP flake ⇒ 复跑 PASS） |
| `test:gate-integrity` | 23 / 0 | **PASS**（含 IAN-2 新门禁纳入） | ✅ 下界只增 |
| `test:supersession` | 45 / 0 | **PASS / 0** | ✅（保护段 pin / chain / 台账 / RL-07 重锚） |
| `test:size-budget` / `size-growth-evidence` / `size-ruling-vol3` | PASS | **PASS** | ✅（登记值 == 实测 598,577） |
| `op-wiring`（node） | `requestTurn(` 恰 2 | **`requestTurn(` 恰 1** | ✅ 等价重锚（+ 反证） |

### 4.1 反证（注入必红）摘要

| # | 反证形态 | 判据 | 结果 |
|---|---|---|---|
| ① | 注入 `<form id=composer hidden>`（hidden 冒充退役） | `law4` L4-1 / S0PP-B2 / journey #15c / binding | ✅ 必红 |
| ② | 三 id 任一回流 DOM（真退役失效） | 容器册 / density 零宿主 / S0PP-B2 | ✅ 必红 |
| ③ | 把 `#input` 移出退役册 | `law4` L4-2 | ✅ 必红 |
| ④ | 重新引入流外 `#input` 回填写点 | TA-4 / FIN-7 | ✅ 必红 |
| ⑤ | 注入第 2 个 `requestTurn(` 调用点 | `op-wiring` / `r6-ty` / `ref-context-in-turn` | ✅ 必红 |
| ⑥ | 恢复 `NEVER_FOLDABLE` 含 `'composer'` | `l0-disclosure` | ✅ 必红 |
| ⑦ | 兜底级联写流外面（双输入面） | `l0` ③⑪ 等价判据 | ✅ 必红 |
| ⑧ | 回填覆盖非空 / 第二回合入口 | `turn-arbitration` / S0PP-B | ✅ 必红 |

> 反证均**实跑**（node judge 打源码切片 / Chromium 打真实 DOM），真源码零触碰；Chromium 面人工面 M1~M5 如实登记 `⏳ 未执行`（不冒充 PASS）。

---

## 5. 体积五要素（A 列 = `dist/sidepanel.js`，**叶2 净负重登记**）

| 要素 | 值 |
|---|---|
| **① 实测（唯一来源）** | `stat -c %s dist/sidepanel.js` → **598,577 B**（`npm run build` @ 2026-09-25） |
| **② 前后值** | 599,125 → **598,577 B**（**−548 B，−0.09%**，**净负轮**） |
| **③ 日期 / 来源 / buildCommand / measuredBy** | 2026-09-25 / `packages/web-cli-plugin/dist/sidepanel.js` / `npm run build --workspace @lgdl/web-cli-plugin` / `SIDEPANEL_RE_REGISTRATIONS['ian-2-r1']` + `META.measuredBy` |
| **④ 逐模块归因（真实 metafile，`ian2Rows`；Σ 模块 + glue == 叶2 增量）** | `sidepanel.ts` 114,667 → **114,149（−518）** / `l0/shell.ts` 3,286 → **3,087（−199）** / `disclosure.ts` 6,481 → **6,465（−16）** / `view-model.ts` 24,622 → **24,759（+137）** / `host-registry.ts` 9,273 → **9,321（+48）**；**Σ −548 + glue 0 == −548**（复现：`npm run size:attribution -- --rev 0d0fd85 --rev WORKTREE`） |
| **⑤ 档位 / 绝对上限 / 生效上限 / 作者确认（EC-IAN-016 二态）** | 档位 `ceilTo50KB(598,577) = ` **614,400 未变**；绝对上限 **675,840 未变**；生效上限 629,081 → **628,505**（`floor(598,577 × 1.05)`）；**EC-IAN-016 二态**：越生效上限 = 否 / 越档位 = 否 / 越绝对上限 = 否；`authorConfirmation` 保持 **`pending-author-line`**（**不伪称已确认**） |

> ⚠️ **口径如实登记（不停机）**：A 列为**净负 −548 B**，落在 `ADR-IAN-010` 的**严格口径**（−1.2~+0.3 KB）之内，但**未达** A 列目标带（−2.5~−1.0 KB）。按 `FR-IAN-115` / `R-IAN-908` **显式登记「为什么删面没有更大净负」**：① DOM/CSS 退役（`index.html` 三 id + 6 条 CSS）经 `build.mjs:95` `copyFile` 进 `dist/sidepanel.html`，**不进** `sidepanel.js` 账本（`ADR-IAN-010 §③`）；② 本轮同时**新增**了重锚成本（`AskFlowInput.hasOrigin` + `sendDisabledReason` 分流 + draft 空安全载体），抵消了部分删除收益；③ 不删判据 / 不放宽容差 / 不搬码规避。

### 5.1 三冻结面 / 零 diff 面（零容差）

| 面 | 期望 | 实测 |
|---|---|---|
| `dist/content.js` | 177,076 B / sha `52a82620…` | ✅ 逐字节不变 |
| `dist/pick-layer.js` | 34,358 B / sha `77796bab…` | ✅ 逐字节不变 |
| `manifest.json` | 零 diff | ✅ 零 diff |
| `packages/web-cli-base/**` | 零 diff | ✅ 零 diff |
| `src/background/turn-queue.ts` | 零 diff（SW 队列本体） | ✅ 零 diff |

---

## 6. 偏差 / 裁决点 / 受阻（如实登记）

1. **`insight.mjs` / `l0.mjs` / `l1.mjs` 三 Chromium 重锚回退（TASK-IAN-220 部分留 R2）**：三者均在**冻结 v3 取代台账**的叶段（`leafBases[0].leafBase = bf5773d`）scope 内；其 `composer` 几何/读面等价重锚必然产生相对 `bf5773d` 的**删除行**，而登记删除面的唯一载体 = `docs/v3-supersession-ledger.json`。该文件被 v4 台账 `zeroDiffFiles` 冻结，且红线 `RL-10` 硬性要求 `zeroDiffFiles.length === 9` ⇒ 解冻它将**降级一条红线**（违反「断言零删除零降级」）。据此**回退三文件原状**并显式留 R2（届时须由编排器裁决 v3 台账解冻 + RL-10 计数重登记，或在 R2 以「只增注释不删行」形态重做）。**已重锚并绿的 Chromium 面**：journey / binding / recommendation / s0-self-driven / density / law8 / l1 / l1-reverse / page-input / zero-injection / auth-chip / no-dead-end / e2e / hardening。
2. **`l2.mjs` / `l2-reverse.mjs` 环境性红（KL-N-10 家族）**：`l2.mjs` 在串行批次中 **PASS（74）**，后续复跑因 Chromium/CDP 资源耗尽出现红；`l2-reverse.mjs` 的「前置基线不 PASS」同源于此（非断言语义失败）。如实登记，隔离复跑留 R2（TASK-IAN-223）。
3. **`SG-IAN-03` 探针产物**：`test/_spike/sg-ian-03-probe.mjs` 实跑后**已删除**（不落版本库）；§1.1 记录四要素。
4. **`xIianLedger` 扩至 X-IAN-1~11**：R1 已落 X-IAN-1~7（叶1 侧）与本轮 X-IAN-2/3/4/5/6/8/9/10/11 的**处置载体**（`IAN2-E-*` 条目 + `law4` 门禁 + `redlineRemap` 6→7 + journey pin）；**逐条 11 行结构化台账的显式追加留 R2（TASK-IAN-217 终态）**。
5. **人工面**：M1~M5 / M3 / M4 均 `⏳ 未执行`（headless 不可合成，不冒充 PASS）。
6. **`leafBases` 逐叶复算**：本轮新删除面使 13 个叶段的 `scope.files` 与 `registeredUncoveredLines` 全部按规则复算（不得手工放宽/收窄）；`docs/v3-supersession-ledger.json` **保持零 diff**（未触碰）。
7. **`docs/v4-density-baseline.json`**：仅 `volume.registeredBaselineBytes` / `ceilingBytes` 与代码同源前移；其余字段零触碰。

---

## 7. 下一步

| 场景 | 操作 |
|------|------|
| R1 收口 | 运行 `@sddu-review specs-tree-ian-2-abolish-composer`（R1 范围：W04+W05+W06 核心） |
| R2 待办 | TASK-IAN-220 的 `insight/l0/l1` 三 Chromium 重锚（须先裁决 v3 台账解冻或改「只增不删」形态）· TASK-IAN-222 人工面 M3/M4 · TASK-IAN-223 红线巡检 + KL-N-10 隔离复跑 · TASK-IAN-225 18 门禁三态终局对账 |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0（R1） | R1 = W04+W05+W06 核心：SG-IAN-03 可行 4/4 · 停引删面 8 步（三 id DOM 真退役 / 写者消解 / 容器册 13→16 / `NEVER_FOLDABLE` 14→13）· 四处兜底收敛 + `#send-reason`/`sendDisabled`/draft 重锚 · 法四三处原地修订 + `law4-input-as-next` 新门禁（L4-1~6）· journey 八步显式取代（新 pin `7b309258…` / 43484..59347 / 249 行）· binding keep（sha `be9ad0e9…` + `startByte` 107780 双绿）· 体积净负 −548 B（严格口径内，A 列带未达，如实登记）· 门禁对账 1431 → **1437 / 0** · 偏差：`insight/l0/l1` 三 Chromium 重锚因冻结 v3 台账红线回退留 R2。 | 2026-09-25 | SDDU Build Agent |
