# 构建报告：specs-tree-ian-2-abolish-composer（IAN-2 废除 `#composer` + 法四修订：DOM 真退役 + 判据重锚）

> **文档定位**: SDDU 构建报告 — 记录本叶 **R1（W04+W05+W06 核心）+ R2（W06 收口轮）** 的文件变更、实现结果与终态对账，作为 review / validate 阶段的输入
> **前置依赖**: 本叶 `tasks.md` v1.0 / `plan.md` v1.0 / `spec.md` v1.0；父 `../plan.md`（`ADR-IAN-004~010`）；叶1 `../specs-tree-ian-1-free-input-next/`（validated）
> **创建人**: SDDU Build Agent
> **创建时间**: 2026-09-25
> **版本**: v3.0（R2 收口 + **review R1 修复轮**：2 BLOCK + 4 I 闭环）
> **更新人**: SDDU Build Agent
> **更新时间**: 2026-09-26
> **更新说明**: ① R2 收口（TASK-IAN-220/222/223/225）：**T220 三 Chromium 门禁法四等价重锚落地**（`insight.mjs` / `l0.mjs` / `l1.mjs`）—— 走**显式 supersession 登记**（三文件**不在** `protectedRanges` ⇒ 不入八步；登记载体 = `redlineRemap[]` 新条目 + 新叶段 `R2-W6` 逐字删除面 + `modifiedRanges[IAN2R2-MR-*]`），**禁止静默解冻降级红线**（`zeroDiffFiles === 9` 逐字不动）；断言只升不降（118→125 / 248→251 / 120→132，零删除）· T222 终态面（node + Chromium 已落 / M3·M4 ⏳ 如实登记）· T223 红线终核 + `KL-N-10` 隔离复跑 · T225 台账终态；门禁 `npm test` 1437 → **1441 / 0**；`test:supersession` 45 → **48 / 0**。② **review R1 修复轮**（§9，commit `9ffbea8`）：**BLOCK-01 法四 old→new 逐字台账 + 半修必红判据**（`law4InplaceRevision` + `L4-7`）· **BLOCK-02 X-IAN 编号语义冲突**（叶1 → `L1-SUP-1~7` + `mapsToParent`；`xIianLedgerFull` 补齐父 §12 X-IAN-1~7 逐条）· **I-01~04** 逐项处置 · 收口缺口（叶段 `R2-W6` `scope.files` **34→35**，逐叶复算唯一红转绿）；门禁 `npm test` 1441 → **1443 / 0**（`supersession` 48 → **49 / 0**；`law4` 5 → 6）。

---

## 1. 构建概要

| 维度 | 数值 |
|------|:--:|
| 本轮范围 | **R2 = W06 收口轮（TASK-IAN-220 / 222 / 223 / 225；R1 已完成 201~219 / 221 / 224）** |
| 完成任务 | **25 / 25**（201~225；R1 19 项 + R2 4 项 + R1 遗留部分项收口） |
| 复杂度分布 | S×0 / M×20 / L×5（叶终态） |
| 新增文件 | 1（R1：`test/law4-input-as-next.test.ts`；R2 零新增源码/门禁文件 —— **只加断言不加文件**） |
| 修改文件（R2） | 7（`test/ui/{insight,l0,l1}.mjs` / `test/supersession-ledger.test.ts` / `test/size-baseline.ts` / `test/size-ruling-vol3.test.ts` / `docs/v4-supersession-ledger.json`；探针 `test/_spike/*` 探毕删除） |
| 门禁（node） | 1437 → **1441 / 0**（+4，零删除） |
| 门禁（Chromium） | insight **125**（118→+7）/ l0 **251**（248→+3）/ l1 **132**（120 登记值 → 131 R1 实测 → **132**） |
| 冻结面 | `dist/content.js` 177,076 B / sha `52a82620…` · `dist/pick-layer.js` 34,358 B / sha `77796bab…` · `manifest.json` 零 diff · `packages/web-cli-base/**` 零 diff · `turn-queue.ts` 零 diff（**R2 逐项复核，零容差**） |
| 体积（A 列） | 599,125 → **598,577 B**（**净负 −548 B**）；两叶 Σ **+6,631 B**（详见 §5） |

### 1.1 SG-IAN-03（TASK-IAN-213，先验闸门「可行」；R1 结论沿用，R2 复核）

| 要素 | 结论 |
|---|---|
| **假设** | journey 保护段八步取代可行 ∧ binding 段前等长补偿可行（`ADR-IAN-007 §①/②`） |
| **探针方法** | 读生产真源 `test/ui/{journey,binding}.mjs`；按锚点定位保护段 → 计 `startByte/endByte/lineCount/sha256`；计段内 `composer` 引用数 |
| **实跑证据（R2 复核）** | journey：新 pin `43484..59347 / 249 行 / sha 7b309258…` 由 `test:supersession` 机核 + journey `#15c` 在门禁内实跑绿（`33-journey.log:81`）。binding：段内零字节、sha `be9ad0e9…`、`startAnchor` 字节偏移 **= 107780** 双绿（`test:supersession` 专条 + `34d-binding-rerun2.log` binding PASS 192） |
| **结论** | **可行（4/4）**；BLK-IAN-3 未触发；探针产物不落版本库 |

---

## 2. 文件变更

### 2.1 源码（`src/**`）

| 操作 | 文件路径 | 任务 | 说明 |
|:--:|------|:--:|------|
| MODIFY | `src/ui/sidepanel/index.html` | 202 | 删 `<form id=composer>`（含 `#input`/`#send`）+ **6 条 CSS** + 出流注释；三区 CSS `body.settings-open …` **逐字不变** |
| MODIFY | `src/ui/sidepanel/l0/shell.ts` | 201 | 停引：`revealFallback`/`hideFallback` 去 `composer.hidden` 写入面（只 `setAskFallbackOpen`） |
| MODIFY | `src/ui/sidepanel/sidepanel.ts` | 203/204/207/208/210 | 删 `syncComposerVisibility()`+两调用点 / `let fallbackOpen` / `$('send').disabled` writer / `#composer` submit 监听；测试钩子重锚；draft 重锚到流内 `#ask-input`；`busy-rejected` 载体唯一化 |
| MODIFY | `src/ui/sidepanel/view-model.ts` | 208 | `AskFlowInput.hasOrigin`；`sendDisabled = !hasOrigin`（禁用仅异常态）；引导改指 |
| MODIFY | `src/ui/sidepanel/disclosure.ts` | 206 | `NEVER_FOLDABLE` 删 `'composer'`（**14→13**） |
| MODIFY | `src/ui/sidepanel/host-registry.ts` | 206 | `RETIRED_CONTAINER_IDS` 追加 `#composer`/`#input`/`#send`（**13→16**，`].sort()` 收尾） |
| MODIFY | `stream-render.ts` / `cards/nextstep.ts` / `recommend.ts` / `stream-model.ts` / `next-registry/ops.ts` / `pick-input.ts` / `chat-state.ts` / `settings/view-switch.ts` | 203/206 | 陈留注释同步（`ops.ts` 的 `requestTurn(` 计数说明改**恰 1**） |
| — | **R2 对 `src/**` 零改动** | 220~225 | T220/T222/T223/T225 全部落在 `test/**` + `docs/**` ⇒ 体积 Δ 0（见 §5） |

### 2.2 测试与门禁（`test/**`）—— R2 部分

| 操作 | 文件路径 | 任务 | 说明 |
|:--:|------|:--:|------|
| MODIFY | `test/ui/insight.mjs` | 220 | **法四等价重锚**：`v3RevealComposer` → `v3RevealStreamInput`（哨兵 = `.ask-fallback` 展开）；`L2_STABLE_FIELDS` 的 `composerGapToBottom` → `streamInputCount`；`MEASURE`/`RAW_MEASURE` 增 `law4RetiredIdHits` / `streamInput*` / `visibleInputCountOutsideView` 读面，`composerGapToBottom` **显式消解登记**（`composerDissolved` + reason，不得静默 null）；`checkLayout` 三条 composer 派生判据逐条等价重锚（三 id 零命中 / 流内卡可用且不越界 / FAB∩输入卡无遮挡）；新增 `#I-23a~c2` + `#I-13a3`。**118 → 125** |
| MODIFY | `test/ui/l0.mjs` | 220 | **法四等价重锚**：`geometryProbe` / ③ skeleton probe 的 composer 读面 → `law4RetiredIdHits` + `streamInput*`；③⑪ 四条 composer 判据等价重锚；`RETIRED_CONTAINERS` 13 → **16**（+3 反向断言）；**解析器结构修正**（`RETIRED_CONTAINER_IDS` 以 `].sort());` 收尾 ⇒ 括号配平提取，判据语义不变）。**248 → 251** |
| MODIFY | `test/ui/l1.mjs` | 220 | **法四等价重锚 + 收紧**：⑨「可见文本输入 ≤2（卡内兜底 + 兜底 composer）」→「**≤1**（流内唯一载体）」+ 新增「三 id DOM 零命中」+「唯一可见输入面在 `#stream` 内且 `elementFromPoint` 命中自身」。**131 → 132** |
| MODIFY | `test/supersession-ledger.test.ts` | 217/225 | 新增 3 条机核：`xIianLeaf2Problems`（X-IAN-8~11 逐条 + decision + counterCheck 可定位 + 反证）· `xIianLeaf2GateProblems`（≥18 门禁三态 / `assertionsRemoved=0` / 反证）· T220 redlineRemap + RL-10 语义注记（三文件不在 `zeroDiffFiles`）。**45 → 48** |
| MODIFY | `test/size-baseline.ts` | 224/225 | 新增 `SIDEPANEL_IAN2_FINAL_ROUND`（id `ian-2-r2` / direction `unchanged` / Δ 0 / 五要素终值 / 两叶 Σ / EC-IAN-016 三态 / 冻结面复核），与 `SIDEPANEL_RE_REGISTRATIONS['ian-2-r1']` 同源衔接 |
| MODIFY | `test/size-ruling-vol3.test.ts` | 225 | 新增叶2 终值机核：Δ=0 ∧ direction=unchanged ∧ 终值/ceiling 同源 ∧ 五要素齐备 ∧ 三值同源 ∧ **EC-IAN-016 三态皆否** ∧ 两叶 Σ = +6,631 ∧ 作者确认占位。**+1 用例** |

### 2.3 台账与文档

| 操作 | 文件路径 | 任务 | 说明 |
|:--:|------|:--:|------|
| MODIFY | `.sddu/.../specs-tree-web-cli-plugin-v4-chat/spec.md`（`:116`/`:225`/`:385`） | 214 | **唯一授权例外**：法四三处**原地修订**为「输入即 next：自由文本输入是流内 next 的一个选项；**流外零输入面**」（不升格法十；三处一致，半修即红） |
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` | 215/217/220/224/225 | `redlineRemap` **7→8**（T220 三文件法四重锚，「法四修订连带、非注入面漂移」）· **新叶段** `specs-tree-ian-2-abolish-composer(R2-W6)` @ `cea2922`（scope 33 文件 / 87 行逐字登记 / 3 文件）· `modifiedRanges` **+19 段**（`IAN2R2-MR-0~18`）· `counts` 前移（insight 125 / l0 251 / l1 132 / supersession 48 / nodeTestRuntime 1441；l0·density·supersession·nodeTestRuntime 四项 `source` 同源快照）· `rl10ZeroDiffNote` · `xIianLedgerLeaf2`（X-IAN-8~11）· `xIianGateReconciliationLeaf2`（**20 行**三态对账 + 人工面 ⏳）· `knownLimitations` KL-IAN2-01~03 · `knownGaps` 追加 · `v3Vol3Closeout.steps['⑨IAN-2 R2 收口重登记']`（五要素 + 两叶 Σ + EC-IAN-016 三态 + 三冻结面） |
| MODIFY | `packages/web-cli-plugin/docs/v4-density-baseline.json` | 224 | `volume.registeredBaselineBytes` 599,125 → **598,577**；`ceilingBytes` 629,081 → **628,505** |

---

## 3. 任务完成清单（25 / 25 终态）

| 任务 | 名称 | 复杂度 | 状态 |
|------|------|:--:|:--:|
| TASK-IAN-201 | 停引（`l0/shell.ts` 去流外 `composer.hidden` 写点，保留调用） | M | ✅ R1 |
| TASK-IAN-202 | DOM / CSS 退役（三 id + 6 条 CSS + 出流注释） | M | ✅ R1 |
| TASK-IAN-203 | 写者消解（`syncComposerVisibility` / `fallbackOpen` / `#send` writer / submit 监听） | L | ✅ R1 |
| TASK-IAN-204 | 测试钩子重锚（只操作卡内，无死写点） | M | ✅ R1 |
| TASK-IAN-205 | `op-wiring` 等价重锚（`requestTurn(` 恰 2→1 + 反证，与删面同轮） | M | ✅ R1 |
| TASK-IAN-206 | 登记退役（`NEVER_FOLDABLE` 14→13 / `RETIRED_CONTAINER_IDS` 13→16） | M | ✅ R1 |
| TASK-IAN-207 | 四处兜底收敛终态（只展开卡内；`op.describe` 有值相不变） | M | ✅ R1 |
| TASK-IAN-208 | `view-model.ts` 重锚族（`sendDisabled` 仅异常态 / draft 重锚 / 引导） | M | ✅ R1 |
| TASK-IAN-209 | `#send-reason` 保留 + 判据重锚（非恒真） | M | ✅ R1 |
| TASK-IAN-210 | R6 唯一化（入口 / 回填载体唯一到流内）+ TA-4 重锚 | M | ✅ R1 |
| TASK-IAN-211 | node 门禁重锚族（7 文件） | M | ✅ R1 |
| TASK-IAN-212 | W2 回归 + 反证还原记录（`npm test` / sha256 前后相同） | M | ✅ R1 |
| TASK-IAN-213 | SG-IAN-03 journey 八步取代预演（先验闸门） | M | ✅ R1（可行 4/4）/ 🔁 R2 复核 |
| TASK-IAN-214 | 法四三处原地修订（`:116` / `:225` / `:385`） | M | ✅ R1 |
| TASK-IAN-215 | 台账（新 pin / chain / 八步 / `redlineRemap` 6→7 / `modifiedRanges`） | M | ✅ R1 |
| TASK-IAN-216 | `test/law4-input-as-next.test.ts` 新门禁（L4-1~6） | L | ✅ R1 |
| TASK-IAN-217 | `supersession-ledger` 重锚 / 保留（RL-07 恰 1 等） | M | ✅ **R2 收口**（X-IAN-8~11 结构化 11 行终态） |
| TASK-IAN-218 | journey 保护段八步显式取代 | L | ✅ R1 |
| TASK-IAN-219 | binding 保护段 keep 字节中立 | L | ✅ R1（R2 双绿复核） |
| TASK-IAN-220 | Chromium 门禁等价重锚族（insight / l0 / l1） | M | ✅ **R2 落地**（118→125 / 248→251 / 120→132） |
| TASK-IAN-221 | `gate-integrity` 下界只增 `law4-input-as-next` | M | ✅ R1（R2 复跑 24/0） |
| TASK-IAN-222 | S0''-B 终态样板（node + Chromium） | L | ✅ **R2 终态**（node 面 + `s0-self-driven` **82**；人工面 M3/M4 ⏳ 如实登记） |
| TASK-IAN-223 | 红线守账巡检 + `KL-N-10` 隔离复跑 | M | ✅ **R2 落地**（§4.2 / §6.2） |
| TASK-IAN-224 | 体积叶2 净负重登记（五要素 + 两叶 Σ） | M | ✅ R1 + **R2 终值重登记**（§5） |
| TASK-IAN-225 | 18 门禁三态对账 + 交接（末位收口） | M | ✅ **R2 落地**（§4.3 20 行三态 + 叶2 交接口） |

---

## 4. 门禁对账（R2 实测；严格串行；日志 `/tmp/opencode/v4-gate-logs/ian-2-r2/`，同源快照 `…/ian-2-r2/registry/`）

### 4.1 计数与主门禁

| 门禁 | R1 | **R2 实测** | 判定 |
|------|:--:|:--:|:--:|
| `npm test`（node） | 1437 / 0 | **1441 / 0** | ✅ **+4**（零删除） |
| `test:insight` | 118 | **125** | ✅ **+7**（T220 重锚 + 新断言族） |
| `test:l0` | 248 | **251** | ✅ **+3**（容器册 16 的反向断言 +3） |
| `test:l1` | 131（登记值 120 滞后） | **132** | ✅ **+1**（≤2→≤1 收紧 + 三 id + 无遮挡） |
| `test:journey` | 171 | **171** | ✅ 保段（新 pin `7b309258…` / `43484..59347` / 249 行；`#15c` 在门禁内实跑绿） |
| `test:binding` | 192 | **192** | ✅ 保段（sha `be9ad0e9…` + `startByte` 107780 双绿；2 次环境红 → 隔离复跑 PASS，见 §6.2） |
| `test:recommendation` | 79 | **79** | ✅ 保段 |
| `test:s0-self-driven` | 82 | **82** | ✅ S0''-B 终态 |
| `test:density` | PASS（242） | **242 / 0** | ✅ 保段（R2 复核，`source` 快照重登记） |
| `test:law8` | 60（≥36） | **60 / 0** | ✅ 零降级 |
| `test:hardening` | 24（隔离复跑） | **24 / 0** | ✅ 保段（`zeroDiffFiles` 冻结面，零 diff） |
| `test:l2` | 74（复跑 env 红） | **74 / 0** | ✅ **首轮即绿**（R1 的 env 红未复现） |
| `test:l2-reverse` | env 红 | **10/10 PASS** | ✅ **给足时限即绿**（R1 红因外层超时打断，非门禁失败） |
| `test:l1-reverse` | PASS | **9/9 PASS** | ✅ 保段 |
| `test:page-input` | PASS | **125 / 0** | ✅ 保段 |
| `test:zero-injection` | PASS | **28 / 0** | ✅ 保段（冻结面） |
| `test:auth-chip` | PASS | **37 / 0** | ✅ 保段 |
| `test:no-dead-end` | PASS | **53 / 0** | ✅ 保段 |
| `test:e2e` | PASS | **PASS**（R8 full chain） | ✅ 保段 |
| `test:gate-integrity` | PASS（23） | **24 / 0** | ✅ 下界只增；**`CHROMIUM_GATES === 9` 不动** |
| `test:supersession` | 45 / 0 | **48 / 0** | ✅ +3（X-IAN-8~11 / 门禁三态 / 14 叶段 scope + 逐字登记） |
| `test:size-budget` / `size-growth-evidence` / `size-ruling-vol3` | PASS | **PASS** | ✅ 登记值 == 实测 598,577；叶2 终值机核 +1 |

> `counts` 同源机核（N-04）：l0 / density / supersession / nodeTestRuntime **4 项逐条与门禁日志相等（`skip 0`）**。

### 4.2 T223 红线终核（全项）

| 红线 | 判据 | R2 实测 |
|---|---|---|
| 三冻结面 | `stat` + sha256 | `content.js` **177,076 B / `52a82620…`** ✅ · `pick-layer.js` **34,358 B / `77796bab…`** ✅ · `sidepanel.js` **598,577 B**（终值） |
| 零 diff 面 | `git diff` | `manifest.json` / `packages/web-cli-base/**` / `src/background/turn-queue.ts` **零 diff**；`src/**` R2 零改动 ✅ |
| `KIND_SET` / kind / 宿主 | `insight-no-escalation` | `KIND_SET` **40** / **12 kind** / **零宿主** ✅ |
| 特权手势 | 恒 `gesture` ∧ SW 永不 `permissions.request` | `insight-no-escalation` V55F-1 扩面 ✅ |
| 容器册 / 折叠白名单 | `NEVER_FOLDABLE` 13 ∧ `RETIRED_CONTAINER_IDS` 16 | `l0-disclosure` / `host-registry` / `density-thresholds` / `l0` ⑧（16 项逐项零残留）✅ |
| 法四（真退役） | 三 id DOM 零命中（非 hidden）+ 注入必红 | `law4-input-as-next` L4-1~6（含注入 `<form id=composer hidden>` 必红）✅ |
| 保护段 | journey 八步新 pin / binding keep | `test:supersession` 专条 + journey/binding 实跑 ✅ |
| 法八零降级 | `test:law8 ≥36` | **60 / 0** ✅ |
| 体积诚实登记 | 严格口径 + 两叶 Σ | §5 ✅ |
| 断言零删除零降级 | 三态对账无减少项 | §4.3（20 行 `assertionsRemoved=0`）✅ |

### 4.3 18 门禁三态对账（T225 终态；台账载体 `xIianGateReconciliationLeaf2`）

- **保留 `kept`（3）**：`insight-tree-hierarchy` · `binding.mjs`（保段 keep）· `hardening.mjs`（冻结面）。
- **等价重锚 `equivalent-reanchor`（13）**：`op-wiring` · `turn-arbitration` · `r6-ty-experience-fix` · `sidepanel-view` · `density-thresholds` · `host-registry` · `settings` · `size-baseline` · `recommendation.mjs` · `s0-self-driven.mjs` · `l1.mjs` · `gate-integrity` · `supersession-ledger`。
- **显式取代 `explicit-supersession`（4）**：`insight.mjs` · `journey.mjs` · `l0.mjs` · `law4-input-as-next`（新增门禁）。
- **合计 20 行**，`assertionsRemoved = 0`（**零删除零降级**）；**间接面**（`notify-tools` / `settings-help` / `system-merge` / `parity/baseline-catalog`）逐项复核为 **kept**（无三 id 引用面）。
- **人工面**：M3 / M4（及 M1/M2/M5）逐项 **`⏳ 未执行`**（headless 不可合成，**不冒充 PASS**；`KL-IAN2-01`）。

---

## 5. 体积五要素（A 列 = `dist/sidepanel.js`，**叶2 终值定稿**）

| 要素 | 终值 |
|---|---|
| **① 实测（唯一来源）** | `stat -c %s dist/sidepanel.js` → **598,577 B**（= R1 终值；**R2 Δ = 0**，`src/**` 零字节改动） |
| **② 前后值** | 599,125 → **598,577 B**（**−548 B / −0.09%**，**净负轮**） |
| **③ 日期 / 来源 / buildCommand / measuredBy** | 2026-09-25 / `packages/web-cli-plugin/dist/sidepanel.js` / `npm run build --workspace @lgdl/web-cli-plugin` / SDDU IAN-2 R1+R2（`SIDEPANEL_RE_REGISTRATIONS['ian-2-r1']` + `SIDEPANEL_IAN2_FINAL_ROUND`（`ian-2-r2`，Δ 0）） |
| **④ 逐模块归因** | `ian2Rows`：`sidepanel.ts` 114,667→**114,149（−518）** / `l0/shell.ts` 3,286→**3,087（−199）** / `disclosure.ts` 6,481→**6,465（−16）** / `view-model.ts` 24,622→**24,759（+137）** / `host-registry.ts` 9,273→**9,321（+48）**；**Σ −548 + glue 0 == −548**；R2 轮逐模块行 = ∅ + glue 0 == Δ 0 |
| **⑤ 档位 / 绝对上限 / 生效上限 / 作者确认** | 档位 `ceilTo50KB(598,577) =` **614,400 未变**；绝对上限 **675,840 未变**；生效上限 629,081 → **628,505**（`floor(598,577 × 1.05)`）；**EC-IAN-016 三态**：越生效上限 = **否** / 越档位 = **否** / 越绝对上限 = **否**；`authorConfirmation` 保持 **`pending-author-line`**（**不伪称已确认**） |

### 5.1 两叶 Σ 对照

| 叶 | 区间 | 增量 |
|---|---|---|
| 叶1 `specs-tree-ian-1-free-input-next` | 591,946 → 599,125 | **+7,179 B**（越叶预算 +7,179 已如实登记 `ian-1-r2.reason`） |
| 叶2 `specs-tree-ian-2-abolish-composer` | 599,125 → 598,577 | **−548 B**（净负） |
| **两叶 Σ** | 591,946 → **598,577** | **+6,631 B**（落在父 `ADR-IAN-010` 两叶合计 +5.0~+9.0 KB 带内） |

> ⚠️ **口径如实登记（不停机）**：A 列净负 −548 B 落在**严格口径**（−1.2~+0.3 KB）之内，但**未达** A 列目标带（−2.5~−1.0 KB）。按 `FR-IAN-115` / `R-IAN-908` 显式登记「为什么删面没有更大净负」：① DOM/CSS 退役经 `build.mjs:95` `copyFile` 进 `dist/sidepanel.html`，**不进** `sidepanel.js` 账本（`ADR-IAN-010 §③`）；② 本轮同时新增重锚成本（`hasOrigin` + `sendDisabledReason` 分流 + draft 空安全载体），抵消部分删除收益。**不删判据 / 不放宽容差 / 不搬码规避**。

---

## 6. R2 偏差 / 裁决点 / 受阻（如实登记）

### 6.1 T220 重锚路径（编排器裁决落地）

R1 曾以「须解冻冻结的 `docs/v3-supersession-ledger.json`（v4 `zeroDiffFiles` 成员）⇒ 会降级 RL-10」为由把三文件回退留 R2。R2 实测裁决：**三文件（`insight.mjs` / `l0.mjs` / `l1.mjs`）根本不在 `zeroDiffFiles`（9 项）内**，且 v4 台账自身已有「叶段 + 逐字删除面」登记机制（R1 已用于 `journey.mjs` / `binding.mjs` / `density-thresholds.test.ts` 等）⇒ **无需任何解冻**，`zeroDiffFiles.length === 9` 逐字不动（RL-10 零降级）。落地方式 = **显式 supersession 登记**：

1. `redlineRemap[]` **+1 条**（`from` = 三文件旧读面；`to` = 三 id 零命中 + 流内唯一输入面；`reason` = 「法四修订连带、非注入面漂移」+ 明写「不在 `zeroDiffFiles`」；`status: landed`）；
2. **新叶段** `specs-tree-ian-2-abolish-composer(R2-W6)` @ `cea2922`（scope 按规则复算 **33 文件**；逐字登记 **87 行 / 3 文件**：insight 60 / l0 26 / l1 1）；
3. `modifiedRanges` **+19 段**（`IAN2R2-MR-0~18`，base `c2c0e0d` 相对逐行区间；`l0.mjs` / `l1.mjs` 在 base 时刻不存在 ⇒ 0 删除行、无需登记）；
4. `rl10ZeroDiffNote`（三文件不在冻结面 ⇒ 不解冻；若将来列入，则重锚须走显式解冻登记）。

**断言只升不降**：insight 118→**125**（+7）· l0 248→**251**（+3）· l1 131→**132**（+1）；旧 `#composer` 相关断言**逐条等价重锚**（无一条裸删）—— insight 3 条检查槽改成「三 id 零命中 / 流内卡可用不越界 / FAB∩输入卡无遮挡」+ 显式消解登记；l0 ③⑪ 四条改成结构判据（不存在 > hidden）+ 容器册 +3；l1 ⑨ 由 ≤2 **收紧**为 ≤1 + 2 条新增。

### 6.2 `KL-N-10` 家族隔离复跑（T223）

- `test:binding`：串行批次内 **2 次红**（`#8d/#8e tabs switch 二次确认` 未出 + `#confirm-allow` 缺失；诊断 `CDP socket not open (readyState=3)` ⇒ 浏览器/渲染进程早死，**非断言语义失败**）⇒ 隔离复跑 **PASS 192/192**；**HEAD 对照**（`git stash` 后同命令）**亦 PASS 192** ⇒ 与本轮改动**无因果**。
- `test:l2` **74 / 0**（R1 的 env 红未复现）；`test:l2-reverse` **10/10 PASS**（首轮被外层 15 min 超时打断、**非门禁失败** —— 台账判据单次 ~2 min，给足时限即绿）；`test:hardening` **24 / 0**；`test:e2e` **PASS**。
- 处置：**如实登记**（`KL-IAN2-02`，新增「CDP socket 早死」变体）+ 隔离复跑 + 不阻塞收口；未改任何判据。

### 6.3 其他

1. **人工面**：M1~M5 / M3 / M4 均 `⏳ 未执行`（headless 不可合成）——`KL-IAN2-01` / `xIianGateReconciliationLeaf2.manualFaces`，**不冒充 PASS**。
2. **`counts` 前移的据实订正**：`nodeTestRuntime` 1246 → **1441**、`l1` 120 → **132**（含 R1 实测 131 的滞后订正，历史值逐字保留于 `noteHistory`）；`l0` 248 → **251**、`insight` 118 → **125**、`supersession` 45 → **48**；l0/density/supersession/nodeTestRuntime 四项 `source` 指向 `registry/` 快照（**实时 tee 目标纪律**：登记路径不得指向正在运行的 log）。
3. **`docs/v3-supersession-ledger.json`**：**零 diff**（未触碰）。
4. **`docs/v4-density-baseline.json`**：仅 `volume.registeredBaselineBytes` / `ceilingBytes` 与代码同源前移；其余字段零触碰。
5. **R2 零新增门禁文件**：`CHROMIUM_GATES === 9` 不动；「只加断言不加文件」纪律保持。

---

## 7. 下一步 / 移交（叶2 交接口）

| 场景 | 操作 |
|------|------|
| 全部任务已完成（25/25） | 运行 `@sddu-review specs-tree-ian-2-abolish-composer` 开始代码审查 |
| review 关注点 | ① T220 三文件重锚的**等价性论证**（三 id 零命中 vs 旧 hidden 语义、流内卡几何等价是否覆盖原「不越界 / 不遮挡」三条）；② `redlineRemap` + 新叶段 + `modifiedRanges` 三处登记是否构成**完整**取代台账；③ l1 ⑨ 由 ≤2 收紧为 ≤1 是否在任何合法产品态下会误红 |
| validate 关注点 | ① 串行全量复跑（含 `test:l2-reverse` 给足时限）；② 体积终值 598,577 与 `stat` 实测逐字节；③ 三冻结面 sha256；④ `KL-N-10` 隔离复跑与 `KL-IAN2-02` 登记一致性 |
| R2 遗留（非阻塞） | 人工面 M3/M4（`pending-human`，需真机手势 / 视觉确认）；`authorConfirmation` 保持 `pending-author-line`（待作者一行） |

---

## 8. 反证（注入必红）摘要 — R2 增补

| # | 反证形态 | 判据 | 结果 |
|---|---|---|---|
| ⑨ | 三 id 任一回流 DOM（法四重锚后） | `law4-input-as-next` L4-1 / l0 ⑧ 容器册 16 / insight `#I-23a` / l1 ⑨ | ✅ 必红 |
| ⑩ | 注入 `<form id=composer hidden>` | `law4` L4-1 / S0''-B2 / journey `#15c` / **insight `#I-23a` · l0 ⑧** | ✅ 必红 |
| ⑪ | l0 门禁清单与产品 `RETIRED_CONTAINER_IDS` 漂移（13 vs 16） | l0 ⑧ I-05 对账①（括号配平提取） | ✅ 必红 |
| ⑫ | 抽掉 X-IAN-8~11 任一条 / decision 非法 / counterCheck 悬空 | `xIianLeaf2Problems` | ✅ 必红 |
| ⑬ | 门禁对账 `assertionsRemoved ≠ 0` / 三态非法 / 缺 old→new / <18 行 | `xIianLeaf2GateProblems` | ✅ 必红 |
| ⑭ | 叶段注入一条未登记删除行（R2-W6 段） | v4 叶段逐字集合相等判据 | ✅ 必红 |
| ⑮ | 叶2 终值机核：direction 与 Δ 不一致 / 三态任一为「是」/ 两叶 Σ ≠ +6,631 | `size-ruling-vol3` 新用例 | ✅ 必红 |

> 反证均**实跑**（node judge 打源码切片 / Chromium 打真实 DOM），真源码零触碰。

---

## 9. 修复轮（review R1 闭环：BLOCK-01 / BLOCK-02 + I-01~04 + 收口缺口）

> **触发**: `review-report.md` v1.0（31 项：27 ✅ / 1 ⚠️ / 2 ❌ → **2 BLOCK** / 4 I / 0 O，结论 ❌ 不通过）。
> **口径**: 本轮**只改 `docs/*.json` + `test/**`**（`src/**` **零改动** ⇒ 冻结面 / `zeroDiffFiles` / 体积 598,577 全部不受影响）；登记日 2026-09-25 / 提交 `9ffbea8`（2026-09-26）。
> **载体**: commit `fix(web-cli-plugin): ian-2 修复轮——法四台账/X-IAN 编号语义/4I`（显式逐文件 add，5 文件 `+598 / −50`）。

### 9.1 BLOCK 闭环

| # | 根因（review） | 闭环动作 | 机核载体 |
|---|------|------|------|
| **BLOCK-01** | 法四原地修订无 `{old 逐字 / new 逐字 / 理由 / 日期 / 落点}` 台账条目；「半修即红」无判据（全仓无门禁读 `v4-chat/spec.md`） | ① 台账新增顶层 **`law4InplaceRevision`**（id `X-IAN-1`）：法四 `old` / `new` / `coreSentence` 逐字 + `reason` + `date` + `anchors[3]`（`v4-chat/spec.md` `:116` 法则表 / `:225` FR-CHAT-014 / `:385` AC-CHAT-007）+ `counterCheck`；② `xIianLedgerFull.rows[X-IAN-1]` 同源登记；③ 新门禁 **`law4-input-as-next` L4-7**：读三锚核心句逐字比对 ∧ 台账 old→new 逐字比对（**改一处 / 缺一处 ⇒ 必红**） | `law4-input-as-next` L4-7（`test/**` 实跑）· `xIianLedgerFull.X-IAN-1` · `law4InplaceRevision` |
| **BLOCK-02** | 叶1 `xIianLedger` 以 `X-IAN-1~7` 登记了与父 `../spec.md §12` **完全不同**的语义（`X-IAN-1` 法四被错误占用）；父 §12 `X-IAN-1~7` 条目缺位（仅完成 X-IAN-8~11，且行字段缺 `old/new/落点`） | ① 叶1 行**改名 `L1-SUP-1~7`** + 逐行 `mapsToParent`，新增 `numberingPolicy` / `renameNote`，老登记文本（decision/owner/counterCheck/evidence）**逐字保留**；② 新增 **`xIianLedgerFull`**：父 §12 `X-IAN-1~7` 逐条 `{id, old 逐字, new 逐字, decision, counterCheck, reason, date, anchors}`（`X-IAN-1` 法四同 BLOCK-01）；③ `xIianLedgerLeaf2.rows[X-IAN-8~11]` 补齐 `old/new/date/anchors` | `supersession-ledger` 三条新机核（下条）· `xIianLedger`（重命名）· `xIianLedgerFull` · `xIianLedgerLeaf2` |

**新增/替换的 supersession 机核**（`test/supersession-ledger.test.ts`，`48 → 49`）：
- `ledger(V4 段 · IAN-1): L1-SUP-1~7 逐条登记 ∧ mapsToParent 消解编号冲突 ∧ counterCheck 可定位`；
- `ledger(V4 段 · IAN-2): X-IAN-8~11 逐条登记 ∧ 全部「已发生」∧ old/new/日期/落点齐备`（替换原弱形态条目，**等价升级非裸删**）；
- `ledger(V4 段 · IAN-2): 父 §12 X-IAN-1~11 并集收口（**缺条 / ID 冲突 / 空字段 ⇒ 必红**）`。

### 9.2 I 项处置（review §5）

| # | 位置 | 处置 |
|---|------|------|
| **I-01** | `docs/v4-density-baseline.json#volume.effectiveCeilingRule` 陈旧 `602,095` | 字段尾部**追加**「〖IAN-2 R2（2026-09-25，review R1 I-01 订正）〗当前生效上限 = **628,505 B**（= `min(675,840, floor(598,577 × 1.05))`），权威复算见 `size-ruling-vol3`」；历史链（含陈旧 602,095）**逐字保留**；本字段**零判据读取**（订正仅为消除误读） |
| **I-02** | `test/settings.test.ts:191` 断言文案 `'composer draft restored'`（陈旧） | 改为 `'in-card draft restored'`（**纯文案**，断言值 / 结构不变；载体已重锚流内 `#ask-input`） |
| **I-03** | `xIianGateReconciliationLeaf2` 的 `settings` 行 `disposition=equivalent-reanchor`（与实际不符：`test/settings.test.ts` 断言未重锚） | disposition 改 **`kept`**，`after` 注明「生产侧注释重锚见 `src/ui/settings/view-switch.ts`；门禁 mock 本身 carrier-agnostic」；`assertionsRemoved` 保持 0 |
| **I-04** | `xIianLedgerLeaf2.rows[*]` 缺 `old 逐字 / new 逐字 / 日期 / 落点 file:line` | 与 BLOCK-01/02 **一次修复覆盖**：`rows[*]` 补齐 `old/new/date/anchors`（`xIianLedgerFull` 同规格） |

### 9.3 收口缺口（本轮唯一增补）

- 载体：`docs/v4-supersession-ledger.json` 叶段 `specs-tree-ian-2-abolish-composer(R2-W6)` 的 `scope.files` **34 → 35**，按字典序增补 `packages/web-cli-plugin/test/supersession-ledger.test.ts`（该文件在本轮被改写 ⇒ 进入 `git diff cea2922` 的删除面 ⇒ 按 `leafScopeFilesFor()` 规则复算**必须**入册）。
- 效果：`ledger(V4 段): 每个叶段的 schema 与 scope 必须逐叶复算（不得手工收窄）` **由红转绿**（修复前 `test:supersession` = 48 pass / **1 fail**，恰为本条；`leafBase=cea2922` 的删除面复算 = 35 文件）。与逐叶复算一致，非手工放宽。

### 9.4 门禁对账（修复轮实测 · 串行）

| 门禁 | R2（review 时） | **修复轮实测** | 判定 |
|------|:--:|:--:|:--:|
| `npm test`（node，全量） | 1441 / 0 | **1443 / 0** | ✅ **+2**（`law4` +1 / `supersession` +1，零删除） |
| `test:supersession` | 48 / 0 | **49 / 0** | ✅ **+1**（BLOCK-01/02 三条新机核 ∧ 唯一红转绿） |
| `law4-input-as-next` | 5 / 0 | **6 / 0** | ✅ **+1**（L4-7 三处一致机核） |
| `test:settings` | PASS | **15 / 0** | ✅ 保段（I-02 文案订正不改语义） |
| `test:size-ruling-vol3` | 13 / 0 | **13 / 0** | ✅ 保段（体积 598,577 不动 ⇒ 叶2 终值机核恒绿） |
| `test:gate-integrity` | 24 / 0 | **24 / 0** | ✅ 保段（下界只增；`CHROMIUM_GATES === 9` 不动） |

> `src/**` 零改动 ⇒ 三冻结面（`content.js` 177,076 B / `pick-layer.js` 34,358 B / `sidepanel.js` 598,577 B）sha / 体积、journey·binding 保护段、`zeroDiffFiles` 9 项**逐字节不受影响**（本轮未触碰）。

### 9.5 反证（注入必红）摘要 — 修复轮增补

| # | 反证形态 | 判据 | 结果 |
|---|---|---|---|
| ⑯ | 法四三处**只改一处 / 缺一处**（半修） | `law4` L4-7（读 `v4-chat/spec.md` 三锚核心句逐字比对） | ✅ 必红 |
| ⑰ | 台账 `law4InplaceRevision` 的 `old/new` 逐字与 spec 锚不符 / `date` 非法 | `law4` L4-7（old→new 逐字 + 台账字段合法性） | ✅ 必红 |
| ⑱ | 叶1 行 ID 与父 §12 冲突 / 缺 `mapsToParent` / `counterCheck` 悬空 | `supersession`「L1-SUP-1~7 逐条 + mapsToParent」 | ✅ 必红 |
| ⑲ | 父 §12 `X-IAN-1~11` **缺条 / ID 冲突 / 空字段** | `supersession`「并集收口」 | ✅ 必红 |
| ⑳ | 叶段 `scope.files` 手工收窄（少 1 文件） | `supersession`「逐叶 scope 复算」（本轮实例：补前 **1/70 红**） | ✅ 必红 |

> 反证均**实跑**（node judge 打台账字段 / 读 `.sddu` spec 锚 / 真源码切片），真源码零触碰。

### 9.6 修复轮结论

- **BLOCK-01 / BLOCK-02 闭环**（台账条目齐备 + 三条独立机核 + 反证 ⑯~⑲）；
- **I-01~04 全部处置**（clean 文案 / disposition 订正 / 字段补齐 / 陈旧口径订正，均**只增不改史**）；
- **收口缺口闭合**（叶段 `R2-W6` `scope.files` 34→35，逐叶复算唯一红转绿）；
- 全量 `npm test` **1443 / 0**（1441 基线 + 2，只增），`src/**` / 冻结面 / `zeroDiffFiles` 零触碰 ⇒ **可进入 review R2**。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0（R1） | R1 = W04+W05+W06 核心：SG-IAN-03 可行 4/4 · 停引删面 8 步 · 四处兜底收敛 + `#send-reason`/`sendDisabled`/draft 重锚 · 法四三处原地修订 + `law4-input-as-next` 新门禁 · journey 八步显式取代 · binding keep · 体积净负 −548 B · 门禁 1431 → **1437 / 0** · 偏差：`insight/l0/l1` 三 Chromium 重锚误判「须解冻 v3 台账」而回退留 R2。 | 2026-09-25 | SDDU Build Agent |
| v2.0（R2） | R2 = W06 收口轮：**T220 三文件法四等价重锚落地**（显式 supersession 登记：`redlineRemap` 7→8 + 新叶段 `R2-W6` 87 行逐字 + `modifiedRanges` +19 段；`zeroDiffFiles` 9 不动、RL-10 零降级；断言只升不降 118→125 / 248→251 / 120→132）· T217 台账终态（X-IAN-8~11）· T222 S0''-B 终态（M3/M4 ⏳）· T223 红线终核 + `KL-N-10` 隔离复跑（binding 环境红→PASS；l2-reverse 10/10）· T225 20 行门禁三态对账 + 体积终值五要素 + 两叶 Σ +6,631 + EC-IAN-016 三态 · 门禁 1437 → **1441 / 0**（supersession 45 → **48 / 0**）。**25/25 终态**。 | 2026-09-25 | SDDU Build Agent |
| v3.0（review R1 修复轮） | review R1（2 BLOCK + 4 I）闭环：**BLOCK-01** 法四 old→new 逐字台账（`law4InplaceRevision`）＋「半修即红」判据（`law4` 新增 L4-7 三处一致机核）· **BLOCK-02** 叶1 行改名 `L1-SUP-1~7` + `mapsToParent` 消解编号冲突 ∧ `xIianLedgerFull` 补齐父 §12 `X-IAN-1~7` 逐条 ∧ `xIianLedgerLeaf2` 补 `old/new/日期/落点` · **I-01~04**（陈旧口径订正 / 文案 / disposition / 字段补齐，只增不改史）· 收口缺口：叶段 `R2-W6` `scope.files` **34→35**（逐叶复算唯一红转绿）。门禁 `npm test` 1441 → **1443 / 0**（`supersession` 48 → **49 / 0**；`law4` 5 → 6；`settings` 15/0 · `size-ruling-vol3` 13/0 · `gate-integrity` 24/0）。`src/**` / 冻结面 / `zeroDiffFiles` 零触碰。 | 2026-09-26 | SDDU Build Agent |
