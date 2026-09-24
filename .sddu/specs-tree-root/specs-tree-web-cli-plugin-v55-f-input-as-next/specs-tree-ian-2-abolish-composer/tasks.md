# 任务分解：specs-tree-ian-2-abolish-composer（IAN-2 废除 `#composer` + 法四修订：DOM 真退役 + 判据重锚）

> **文档定位**: SDDU 任务清单（**叶级切片**）— 父 `../tasks.md`（v1.0 总览）在本叶的落地；作为 build 阶段的输入
> **前置依赖**: 本叶 `plan.md` v1.0 + 父 `../plan.md` v1.0（含 `ADR-IAN-004~010`）+ 父 `../spec.md` v1.0 + 本叶 `spec.md` v1.0 + **叶1 `../specs-tree-ian-1-free-input-next/plan.md`（强依赖：叶1 须 validated）**
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-25
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-09-25
> **更新说明**: 初始创建（IAN-2 叶任务：**25 任务 / 3 波**（`TASK-IAN-201~225`；S×0 / M×20 / L×5）+ 1 个 spikeGate（SG-IAN-03）+ 1 个新 node 门禁 `law4-input-as-next`（L4-1~6）+ S0''-B 双面 + 20 门禁三态重锚 + 体积叶2 净负重登记）

---

## 0. 结构登记（**末叶 / 拆除叶**）

| 项 | 内容 |
|---|---|
| 叶定位 | **末叶 / 拆除叶**（`deliveryOrder: 2` / `dependsOn: [ian-1]` / P0）；**先停引、再删面** |
| 硬依赖 | **叶1 `validated` 前不得启动**（否则「无输入可用」窗口 ⇒ `R-IAN-901` / `N-IAN-027`）；`BLK-IAN-9` |
| 本叶**不做** | 不新建输入面（叶1 已完成）/ 不改 SW 队列本体（`turn-queue.ts` diff = 0） |
| 本叶**不做拆分** | 法四三处修订 + old→new 台账 + 判据重锚 + 保护段**同轮完成**（`FR-IAN-091`；不得拆到「下一轮补」） |
| 模板偏差 | 模板 §5.4 / §8 建议 5~15 任务 ⇒ 本叶 **25**（含 18 门禁三态 + 立法台账 + 2 保护段，无法再并；显式登记，理由见 §3） |
| 编号空间 | `TASK-IAN-201~225`；与 `TASK-IAN-1xx`（叶1）连续不交叠 |
| **波次细化登记** | `op-wiring` 重锚（`requestTurn(` 恰 2→1）由父 `plan.md §7` 的 W2 前移至 **W1**（`TASK-IAN-205`）：`sidepanel.ts:3749` 监听绑定 `$('composer')`，DOM 移除必然同轮删监听 + `requestTurn(input.value)` 调用 ⇒ 物理计数 W1 已变 1；`FR-IAN-091` 同轮 + 每波收口门禁绿。步6 的 **R6 唯一化 + TA-4** 仍在 W2 |

---

## 1. 依赖拓扑总览（3 波）

```
W04 ─── 拆除（可并行区：201 ∥ 202；204 ∥ 205）
  TASK-IAN-201 [M] 停引（l0/shell.ts 去流外 composer.hidden 写点，保留调用）
  TASK-IAN-202 [M] DOM/CSS 退役（三 id + 6 CSS + 出流注释；三区 CSS 逐字不动）
  TASK-IAN-203 [L] 写者消解（syncComposerVisibility / fallbackOpen / #send writer / composer submit 监听）
  TASK-IAN-204 [M] 测试钩子重锚（只操作卡内，无死写点）
  TASK-IAN-205 [M] gate  op-wiring 等价重锚（恰 2→1 + 反证；与删面同轮）
  TASK-IAN-206 [M] 登记退役（NEVER_FOLDABLE 14→13 / RETIRED_CONTAINER_IDS 13→16 / 注释同步）

W05 ─── 重锚与唯一化（可并行区：207 ∥ 208 ∥ 209）
  TASK-IAN-207 [M] 四处兜底收敛终态 + op.describe 有值相不变（反证）
  TASK-IAN-208 [M] view-model.ts 重锚族（sendDisabled / draft / 引导）
  TASK-IAN-209 [M] gate  #send-reason 保留 + 判据重锚（非恒真）
  TASK-IAN-210 [M] R6 唯一化（入口/回填唯一到流内）+ TA-4 重锚
  TASK-IAN-211 [M] gate  node 门禁重锚族（7 文件）
  TASK-IAN-212 [M] gate  W2 回归 + 反证还原记录

W06 ─── 立法 / 门禁 / 保护段 / 验收（收口轮·终局；可并行区：214 ∥ 215；220 ∥ 221）
  TASK-IAN-213 [M] spike SG-IAN-03（先验闸门，最前）
  TASK-IAN-214 [M] doc   法四三处原地修订（v4-chat/spec.md:116/:225/:385）
  TASK-IAN-215 [M] doc   台账（xIanLedger + redlineRemap 6→7 + journey pin / binding keep + modifiedRanges）
  TASK-IAN-216 [L] gate  law4-input-as-next 新门禁（L4-1~6）
  TASK-IAN-217 [M] gate  supersession-ledger + insight-tree-hierarchy 重锚/保留
  TASK-IAN-218 [L] gate  journey 保护段八步显式取代
  TASK-IAN-219 [L] gate  binding 保护段 keep 字节中立
  TASK-IAN-220 [M] gate  Chromium 门禁重锚族 + l1/hardening 保留确认
  TASK-IAN-221 [M] gate  gate-integrity 下界只增 law4-input-as-next
  TASK-IAN-222 [L] gate  S0''-B 终态样板（node + Chromium）
  TASK-IAN-223 [M] gate  红线守账巡检 + KL-N-10 隔离复跑
  TASK-IAN-224 [M] doc   体积叶2 净负重登记 + 两叶 Σ + 严格口径如实
  TASK-IAN-225 [M] doc   18 门禁三态对账 + 人工面 M3/M4 登记 + 交接（末位收口）
```

**关键路径**：`201 → 202 → 203 → 205 → 207 → 208 → 210 → 211 → 213 → 214 → 215 → 216 → 217 → 218 → 219 → 222 → 223 → 224 → 225`

---

## 2. 任务列表

### TASK-IAN-201: 停引（`l0/shell.ts` 去流外 `composer.hidden` 写点，保留调用）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | 无（须叶1 validated） |
| **执行波次** | 1（全局 W04） |
| **对应 FR** | FR-IAN-042 / 051 / 052 |
| **门禁** | `test:l0` |

**涉及文件**: `src/ui/sidepanel/l0/shell.ts`（MODIFY）

**验收标准**:
- [ ] `revealFallback`/`hideFallback` 只操作卡内 `.ask-fallback`，**不再写** `composer.hidden`
- [ ] 保留 `revealAskFallback` 对 `l0?.revealFallback()` 的调用（PD-IAN-007）
- [ ] 四处入口展开卡内；反证「重新级联 ⇒ 双输入面 ⇒ 必红」；陈留注释同步

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- l0-disclosure && npm run test:ui -- l0
```

---

### TASK-IAN-202: DOM / CSS 退役（三 id + 6 条 CSS + 出流注释）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-IAN-201 |
| **执行波次** | 1 |
| **对应 FR** | FR-IAN-040 / 041 / 044 |
| **门禁** | `density-thresholds` |

**涉及文件**: `src/ui/sidepanel/index.html`（MODIFY）

**验收标准**:
- [ ] 删 `<form id=composer>`（含 `#input` / `#send`）+ 6 条 CSS + 出流注释
- [ ] 三 id 零命中（真退役，非 `hidden`）；无死 CSS
- [ ] 三区 CSS `:670-672` **逐字不变**（diff = 0）
- [ ] 严格口径登记：DOM/CSS 退役不进 `sidepanel.js` 账本（`ADR-IAN-010 §③`）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- density-thresholds sidepanel-view
```

---

### TASK-IAN-203: 写者消解（`syncComposerVisibility` / `fallbackOpen` / `#send` writer / composer submit 监听）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-IAN-201 / 202 |
| **执行波次** | 1 |
| **对应 FR** | FR-IAN-042 / 043 / 048 |
| **门禁** | `op-wiring` |

**涉及文件**: `src/ui/sidepanel/sidepanel.ts`（MODIFY）

**验收标准**:
- [ ] 删 `syncComposerVisibility()`（:2884-2891）及调用点（:2245 / :3616）；删 `fallbackOpen`（:2883）及全部读写（:2896 / :856）
- [ ] 删 `$('send').disabled` writer（:2270）；删 composer submit 监听（:3749-3760，含 `requestTurn(input.value)`）
- [ ] settings 提前 return 保留原结构、无需护栏（面不存在）
- [ ] 标识符 / 函数零命中；三缺陷结构性消解；陈留注释同步

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- op-wiring r6-ty-experience-fix sidepanel-view
```

---

### TASK-IAN-204: 测试钩子重锚（只操作卡内）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-IAN-203 |
| **执行波次** | 1 |
| **对应 FR** | FR-IAN-045 |
| **门禁** | `test:l0` |

**涉及文件**: `src/ui/sidepanel/sidepanel.ts`（MODIFY）

**验收标准**:
- [ ] `revealFallback()` → `revealAskFallback()`；`hideFallback()` → `l0?.hideFallback()`
- [ ] 删 `fallbackOpen = false; syncComposerVisibility();` 两行（不自持锁存）
- [ ] 钩子仍驱动卡内展开 / 收起（可判）；无死写点 / 空转钩子

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- l0-disclosure
```

---

### TASK-IAN-205: `test/op-wiring.test.ts` 等价重锚（`requestTurn(` 恰 2 → 恰 1 + 反证）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-IAN-203 |
| **执行波次** | 1 |
| **对应 FR** | FR-IAN-021 / 085 / 100 |
| **门禁** | `op-wiring` |

**涉及文件**: `test/op-wiring.test.ts`（MODIFY）

**验收标准**:
- [ ] `OP_CALLSITE_SET.op.turn.callSites` 2→1；判据恰 1（唯一生产输入提交点 = `op.turn` 槽）
- [ ] `expectFailPattern` 更新：注入第 2 个 `requestTurn(` ⇒ `requestTurnProblems` 必红
- [ ] `maybeRecommend` 1/7 · `nextAfterSettle` 1/10 原判据不改
- [ ] **与 DOM/写者删除同轮**（`FR-IAN-091`；波次细化见 §0）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- op-wiring
```

---

### TASK-IAN-206: 登记退役（`NEVER_FOLDABLE` 14→13 + `RETIRED_CONTAINER_IDS` 13→16 + 注释同步）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-IAN-203 |
| **执行波次** | 1 |
| **对应 FR** | FR-IAN-046 / 047 |
| **门禁** | `host-registry` / `test:density` |

**涉及文件**: `src/ui/sidepanel/disclosure.ts` / `host-registry.ts` / `stream-render.ts`（MODIFY）

**验收标准**:
- [ ] `disclosure.ts`：`NEVER_FOLDABLE` 删 `'composer'`（14→13）+ `:147` 注释算术订正
- [ ] `host-registry.ts`：PRESERVED 去三项；`RETIRED_CONTAINER_IDS` 13→**16**；`RETIRED_HOST_ATTRS` 宿主值 4 项**逐字保留**
- [ ] `RETIRED_HOST_DISPOSITIONS` 派生只增 3 条去向 + 反证元数据
- [ ] `stream-render.ts` 陈留注释同步

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- host-registry density-thresholds l0-disclosure
```

---

### TASK-IAN-207: 四处兜底收敛终态（E1~E4 只展开卡内；`op.describe` 有值相逐字不变）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-IAN-203 |
| **执行波次** | 2（全局 W05） |
| **对应 FR** | FR-IAN-050 / 051 / 052 |
| **门禁** | `test:l0` |

**涉及文件**: `src/ui/sidepanel/sidepanel.ts` / `l0/shell.ts`（MODIFY）

**验收标准**:
- [ ] E1~E4 全部只 reveal 卡内 `.ask-fallback`；`revealAskFallback` 调用链零流外面
- [ ] `op.describe` 有值相 ⇒ `submitDescribe` 逐字不变；反证「有值相发回合 ⇒ 必红」
- [ ] 「唯一载体」判据非恒真（任一入口触发后可见输入面恰 1 个 + 三 id 不在 DOM）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- l0-disclosure
```

---

### TASK-IAN-208: `view-model.ts` 重锚族（`sendDisabled` 仅异常态 + draft 重锚 + 引导改指）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-IAN-207 |
| **执行波次** | 2 |
| **对应 FR** | FR-IAN-054 / 055 / 056 |
| **门禁** | `settings` / `sidepanel-view` |

**涉及文件**: `src/ui/sidepanel/view-model.ts`（MODIFY）

**验收标准**:
- [ ] `buttonStates.sendDisabled` 语义保留（`!hasOrigin` 仅异常态）；`AskFlowView.sendDisabled` 重锚到流内输入面（在飞不硬禁用）
- [ ] draft：`getDraft/setDraft` 读写 free-input 卡 `#ask-input`（无卡 ⇒ `''` / 空写零副作用；空安全，EC-IAN-011）
- [ ] `ONBOARDING_TEXTS[4]` 改指流内 next 项；`sendDisabledReason` 可读原因保留

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- settings sidepanel-view view-model
```

---

### TASK-IAN-209: `#send-reason` 保留 + 判据重锚（在 `#region-statusbar` 内、非恒真）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-IAN-207 |
| **执行波次** | 2 |
| **对应 FR** | FR-IAN-053 |
| **门禁** | `test:density`（≥242） |

**涉及文件**: `test/density-thresholds.test.ts`（MODIFY）

**验收标准**:
- [ ] `#send-reason` 仍在 `#region-statusbar` 内；`host-registry:295-321` 保留要素逐字不动
- [ ] 判据「在状态栏内 + 单写 + 离开状态栏必红」逐条保留（非恒真）；反证：移出状态栏 ⇒ 必红
- [ ] 计数 ≥242（只增）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- density-thresholds
```

---

### TASK-IAN-210: R6 唯一化（入口 / 回填载体唯一到流内）+ TA-4 重锚

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-IAN-208 / 209 |
| **执行波次** | 2 |
| **对应 FR** | FR-IAN-031 / 032 / 033 / 034 |
| **门禁** | `turn-arbitration`（≥6） |

**涉及文件**: `src/ui/sidepanel/sidepanel.ts`（MODIFY）

**验收标准**:
- [ ] 删 `#input` 回填（:3984-3991）⇒ 唯一载体 = 卡内输入；TA-4 等价重锚（`freeInput.value = rejected` ∧ `length===0`），**删回填仍必红**保留
- [ ] `queued` / `busy-rejected` 留痕逐字保留；叶1 双载体消解
- [ ] `turn-queue.ts` 裁决逻辑 diff = 0

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- turn-arbitration r6-ty-experience-fix
```

---

### TASK-IAN-211: node 门禁重锚族（7 文件）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-IAN-210 |
| **执行波次** | 2 |
| **对应 FR** | FR-IAN-100 / 104 |
| **门禁** | `host-registry` / `test:density` / `settings` / `sidepanel-view` |

**涉及文件**: `test/turn-arbitration.test.ts` / `r6-ty-experience-fix.test.ts` / `sidepanel-view.test.ts` / `settings.test.ts` / `density-thresholds.test.ts` / `host-registry.test.ts` / `l0-disclosure.test.ts`（MODIFY）

**验收标准**:
- [ ] `ADR-IAN-008` #2/#3/#4/#5/#6/#9 逐条等价重锚（old→new 定位 + 反证）
- [ ] density `:389-409` → 三 id 不存在 ∧ body flex 列保留；`:754` 宿主值逐字；`:769/:775` → 「必须入册」；`:776` → 不存在
- [ ] host-registry 容器册 = 16 + `TEST_RETIRED_CONTAINER_IDS` 同步；sidepanel-view `:281` / `:657-659` 重锚
- [ ] l0-disclosure 14→13（非恒真）；settings `:191` draft 重锚；全部计数 ≥ 基线

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- turn-arbitration r6-ty-experience-fix sidepanel-view settings density-thresholds host-registry l0-disclosure
```

---

### TASK-IAN-212: W2 回归 + 反证还原记录（`npm test` 串行 + sha256 前后相同）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-IAN-211 |
| **执行波次** | 2 |
| **对应 FR** | FR-IAN-101 / 106 |
| **门禁** | `op-wiring` |

**涉及文件**: `test/`（仅记录 / 微调；不新增门禁文件）

**验收标准**:
- [ ] 本波触碰的 node 门禁逐条复跑全绿；计数 ≥ 基线；断言零删除零降级
- [ ] 反证族实跑记录：注入 ⇒ FAIL ⇒ 逐字节还原（sha256 前后相同）⇒ PASS
- [ ] 门禁严格串行；`KL-N-10` 隔离复跑 ≥2 + 日志全量

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test
```

---

### TASK-IAN-213: SG-IAN-03 journey 八步取代预演（先验闸门）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | spike（`SG-IAN-03`） |
| **前置依赖** | TASK-IAN-206 / 212 |
| **执行波次** | 3（全局 W06） |
| **对应 FR** | FR-IAN-103 |
| **对应 ADR** | ADR-IAN-007 |

**涉及文件**: `packages/web-cli-plugin/test/_spike/sg-ian-03-probe.mjs`（SPIKE，探毕删除）

**验收标准**:
- [ ] journey 段 `43054..58287` 内 `composer`/`#input`/`#send` 引用**逐条清单**（≥10 处，含 `#15c` 布尔 + 几何读面）；替换前后字节账可算
- [ ] binding 段 `107780..115930` 内零命中确认；段前等长补偿预演（`startAnchor` 仍 =107780 可算）
- [ ] 结论 ∈ {可行/不可行}；探针产物不落版本库

**被闸门任务**: `218 / 219`

**验证命令**:
```bash
node packages/web-cli-plugin/test/_spike/sg-ian-03-probe.mjs
```

---

### TASK-IAN-214: 法四三处原地修订（`v4-chat/spec.md:116 / :225 / :385` 逐字 old→new）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | doc |
| **前置依赖** | TASK-IAN-213 |
| **执行波次** | 3 |
| **对应 FR** | FR-IAN-060 / 061 / 080 |
| **门禁** | `law4-input-as-next` |

**涉及文件**: `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v4-chat/spec.md`（MODIFY，**唯一授权例外**）

**验收标准**:
- [ ] 先以 `git show` 读三处原文逐字 + 记录落点行号；三处**同轮**改为 new 口径
- [ ] old 逐字 =「输入按需出现：无常驻输入框…」；new 逐字 =「输入即 next：自由文本输入是流内 next 的一个选项；流外零输入面」
- [ ] **三处一致（半修即红）**；不升格法十

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- law4-input-as-next
```

---

### TASK-IAN-215: 台账（`xIanLedger` + `redlineRemap` 6→7 + journey 新 pin / binding keep + `modifiedRanges`）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | doc |
| **前置依赖** | TASK-IAN-214 |
| **执行波次** | 3 |
| **对应 FR** | FR-IAN-062 / 082 / 091 / 102 |
| **门禁** | `test:supersession`（≥42） |

**涉及文件**: `packages/web-cli-plugin/docs/v4-supersession-ledger.json`（MODIFY）

**验收标准**:
- [ ] 新增 `xIanLedger` 段：X-IAN-1~11 逐条 { old 逐字 / new 逐字 / 理由 / 日期 / 落点 `file:line` / status }（`superseded` / `no-supersession`，不留空）
- [ ] `redlineRemap[]` 追加一条（composer 贴底/出流 → 流外零输入面）；老 6 条**逐字保留**（6→7，`≥3` 断言不动）
- [ ] journey：history 新节 + 新 pin + `supersessionChain` + `modifiedRanges` + `redlineRemap`（四处同步）；binding：段外逐行登记 keep
- [ ] `knownGap` 一致性；老条目（v3/v4/v5/v5.5/F-34）一律保留不动

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- supersession-ledger insight-tree-hierarchy
```

---

### TASK-IAN-216: `test/law4-input-as-next.test.ts` 新门禁（L4-1~6 + 双向反证 + 三段控制 + 真源切片）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-IAN-214 |
| **执行波次** | 3 |
| **对应 FR** | FR-IAN-049 / 064 |
| **门禁** | `law4-input-as-next`（新） |

**涉及文件**: `test/law4-input-as-next.test.ts`（NEW）

**验收标准**:
- [ ] `L4-1` 三 id DOM 零命中（读生产真源 `index.html` + 运行时 DOM）；`L4-2` 三 id ∈ `RETIRED_CONTAINER_IDS`（长度 = 16）
- [ ] `L4-3` 默认屏零可见输入框；`L4-4` 流内输入卡存在可用（可展开 + focus）
- [ ] `L4-5` 三段控制禁恒真（`ok`/`violated`/`n/a` 逐态可达）；`L4-6` 真源切片（不读测试自建常量、不自我裁决）
- [ ] 反证：注入 `<form id=composer hidden>` ⇒ 必红；移除后逐字节还原 ⇒ 绿；移出入册 ⇒ 必红

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- law4-input-as-next
```

---

### TASK-IAN-217: `supersession-ledger.test.ts` + `insight-tree-hierarchy.test.ts` 重锚 / 保留

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-IAN-215 / 216 |
| **执行波次** | 3 |
| **对应 FR** | FR-IAN-062 / 100 |
| **门禁** | `test:supersession`（≥42） |

**涉及文件**: `test/supersession-ledger.test.ts` / `insight-tree-hierarchy.test.ts`（MODIFY）

**验收标准**:
- [ ] 老 `redlineRemap ≥3`（`:1452`）逐字保留；新增 X-IAN-1 一致性 + journey 新 pin 链 + binding keep 判据（`:930-1015` 同款链判据）
- [ ] `insight-tree-hierarchy :527/:656-657` 先例引用**保留** + 本轮 journey 取代登记
- [ ] 计数 ≥42（只增）；反证：老 remap 被改写 ⇒ 必红；链不连续 ⇒ 必红

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- supersession-ledger insight-tree-hierarchy
```

---

### TASK-IAN-218: journey 保护段八步显式取代

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-IAN-213 / 217 |
| **执行波次** | 3 |
| **对应 FR** | FR-IAN-103 / 083 |
| **门禁** | `test:journey`（≥171） |

**涉及文件**: `test/ui/journey.mjs`（MODIFY）

**验收标准**:
- [ ] `#15a~#15q` 保持编号；**`#15c` 同编号等价改写**为「三 id 均不在 DOM ∧ 默认屏零可见输入框 ∧ 流内 free-input 卡输入存在可展开」；**不得只删不断言**
- [ ] 几何读面 `composerGapToBottom` **消解并显式登记**（不得静默 `null` 通过）+ 新增流内输入卡几何等价读面
- [ ] 八步齐（①记录 old … ⑧RP-V4-08 反证实跑：段内 1 byte ⇒ sha 红；段外 1 byte ⇒ 不红；删 1 断言 ⇒ 计数下界 FAIL；还原 ⇒ PASS）
- [ ] 计数 ≥171（只增）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run test:ui -- journey
```

---

### TASK-IAN-219: binding 保护段 keep 字节中立

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-IAN-213 / 218 |
| **执行波次** | 3 |
| **对应 FR** | FR-IAN-090 / 103 |
| **门禁** | `test:binding`（≥192） |

**涉及文件**: `test/ui/binding.mjs`（MODIFY）

**验收标准**:
- [ ] `DIAG_SELECTORS` 去 `'composer'` + 真实键入 `#input`/`#send` → 卡内输入（**不删路径**）；`#send.disabled` → `#send-reason` 保留 + 在飞可提交
- [ ] 段 `107780..115930` **段内零字节**（sha `be9ad0e9…` 双绿）；段前等长补偿 ⇒ `startAnchor` 仍 = **107780**
- [ ] 段外改写逐行登记 `modifiedRanges[]`；三反证（段内 1 byte ⇒ sha 红；段前 +1 byte 不补偿 ⇒ startByte 红；登记行改一字 ⇒ hunk↔台账红）
- [ ] 逃生口：等长补偿不可行 ⇒ 改走八步取代（台账）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run test:binding
```

---

### TASK-IAN-220: Chromium 门禁等价重锚族（`insight` / `l0` / `recommendation` / `s0-self-driven` + `l1`/`hardening` 保留）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-IAN-216 / 219 |
| **执行波次** | 3 |
| **对应 FR** | FR-IAN-083 / 084 / 100 |
| **门禁** | `test:insight`（≥118）/ `test:l0`（≥248） |

**涉及文件**: `test/ui/insight.mjs` / `l0.mjs` / `recommendation.mjs` / `s0-self-driven.mjs`（MODIFY）

**验收标准**:
- [ ] insight：`#I-08`/`#I-09` 几何消解 + 显式登记（不得静默 `null`）；法四断言 → 默认屏零可见输入框；兜底展开 → 卡内输入可见
- [ ] l0：③ → 三 id 零命中 ∧ 默认屏零可见输入框；⑪ → `#ask-fallback` 可见 ∧ `#composer` 不存在；`:1321` → 输入面单一
- [ ] recommendation（≥72）/ s0-self-driven（≥70）驱动流内输入；`l1`（≥131）/ `hardening`（≥24）**保留**
- [ ] **只加断言不加文件**（`CHROMIUM_GATES === 9`）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run test:ui -- insight l0 recommendation s0-self-driven l1 hardening
```

---

### TASK-IAN-221: `gate-integrity.test.ts` 下界只增 `law4-input-as-next`

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-IAN-216 |
| **执行波次** | 3 |
| **对应 FR** | FR-IAN-105 |
| **门禁** | `gate-integrity`（≥19） |

**涉及文件**: `test/gate-integrity.test.ts`（MODIFY）

**验收标准**:
- [ ] `EXPECTED_AUDITED_FILES` 只增 `law4-input-as-next`（确认叶1 `free-input-next` 已在册）；下界 = 前值 + 2
- [ ] 既有下界逐字保留；`CHROMIUM_GATES === 9` 不动；不新增 Chromium 门禁文件
- [ ] 计数 ≥19（只增）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- gate-integrity
```

---

### TASK-IAN-222: S0''-B 终态样板（node + Chromium；「元素不存在非 hidden」机核 + 注入必红）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-IAN-218 / 220 |
| **执行波次** | 3 |
| **对应 FR** | FR-IAN-070 / 073 / 074 |
| **对应 ADR** | ADR-IAN-009 |

**涉及文件**: `test/s0-self-driven-chain.test.ts` / `test/ui/fixtures/s0-chain.mjs` / `test/ui/s0-self-driven.mjs`（MODIFY）

**验收标准**:
- [ ] S0''-B 终态：三 id DOM 零命中（非 `hidden`）∧ 唯一输入面 = 卡内 ∧ 法四新条文 ∧ driver 两值可判 ∧ 零新增载体
- [ ] 「元素不存在非 hidden」机核：注入 `<form id=composer hidden>` ⇒ 法四门禁 + host-registry 退役判据必红；移除后逐字节还原 ⇒ 绿
- [ ] body 尾断言等价重锚为「三 id 不存在 ∧ body 仍 flex 列」；样本单源；**只加断言不加文件**
- [ ] 人工面 M3 / M4 逐项 `⏳ 未执行`，不得冒充 PASS

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- s0-self-driven-chain && npm run test:ui -- s0-self-driven
```

---

### TASK-IAN-223: 红线守账巡检 + `KL-N-10` 隔离复跑

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-IAN-222 |
| **执行波次** | 3 |
| **对应 FR** | FR-IAN-112 / 017 / 025 / 106 |
| **门禁** | `insight-no-escalation` / `test:law8`（≥36） |

**涉及文件**: `test/insight-no-escalation.test.ts` / `test/ui/law8-plaintext.mjs`（MODIFY）

**验收标准**:
- [ ] `content.js` 177,076 B / `52a82620…`；`pick-layer.js` 34,358 B / `77796bab…`；`KIND_SET` 40 / 12 kind / 零宿主
- [ ] `manifest.json` 零 diff；`packages/web-cli-base/**` 零 diff；判定链 pin 绿；`turn-queue.ts` diff = 0
- [ ] 特权 op 恒 gesture + SW 永不 `.request(`；`test:law8 ≥36`（零降级）
- [ ] `KL-N-10` 隔离复跑 ≥2 + 日志全量（仍红如实记录不阻塞收口）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- insight-no-escalation && npm run test:ui -- law8-plaintext
```

---

### TASK-IAN-224: 体积叶2 净负重登记（五要素 + 三值 + 逐模块行 + 两叶 Σ + 严格口径如实 + EC-IAN-016 二态）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | doc |
| **前置依赖** | TASK-IAN-223 |
| **执行波次** | 3 |
| **对应 FR** | FR-IAN-110 / 113 / 114 / 115 |
| **门禁** | `test:size-ruling-vol3`（≥12） |

**涉及文件**: `test/size-baseline.ts` / `size-budget.test.ts` / `size-growth-evidence.test.ts` / `size-ruling-vol3.test.ts`（MODIFY）

**验收标准**:
- [ ] A 列本叶**净负**实测登记（目标 −2.5~−1.0 KB；**严格口径 −1.2~+0.3 KB**）+ 五要素 + 时间线只追加
- [ ] V3-VOL-3 三值同源前移；**两叶 Σ 对照**；逐模块归因（`ian2Rows`；Σ 逐模块 Δ + 未归因 == 登记增量）
- [ ] **严格口径 DOM/CSS 不计账显式登记**；非负 ⇒ 显式登记「为什么删面没有净负」+ 重新校准（`FR-IAN-115` / `R-IAN-908`）；不得搬码规避
- [ ] EC-IAN-016 二态显式；`authorConfirmation = pending-author-line`（不得伪称）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- size-budget size-ruling-vol3 size-growth-evidence
```

---

### TASK-IAN-225: 18 门禁三态对账 + 人工面 M3/M4 登记 + 叶2 交接口

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | doc |
| **前置依赖** | TASK-IAN-221 / 224 |
| **执行波次** | 3（收口轮·终局） |
| **对应 FR** | FR-IAN-100 / 104 / 074 |
| **门禁** | `gate-integrity`（≥19）+ `e2e` PASS |

**涉及文件**: `test/`（对账记录 / 台账微调；不新增门禁文件）

**验收标准**:
- [ ] 18 门禁三态齐逐条对账（保留 / 等价重锚 / 显式取代 + 台账）+ 间接面对账（notify-tools / settings-help / system-merge / parity baseline-catalog）无遗漏；断言计数只增无减少项
- [ ] 人工面 M3 / M4 逐项 `⏳ 未执行`（不得冒充 PASS）
- [ ] 叶2 全门禁**串行**全绿 + `e2e` PASS + 交接口（build/review/validate）+ 两叶 Σ 体积终值

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test && npm run test:ui && npm run test:binding && npm run e2e
```

---

## 3. 任务汇总

| 统计项 | 数值 |
|--------|:--:|
| 总任务数 | **25** |
| S 级（简单） | 0 |
| M 级（中等） | 20 |
| L 级（复杂） | 5（203 / 216 / 218 / 219 / 222） |
| 执行波次 | **3** |
| spikeGate | 1（SG-IAN-03） |
| 新增门禁 | 1（`law4-input-as-next`） |
| 门禁三态重锚 | 18（node 10 + Chromium 8） |

> **模板偏差登记**：模板建议 5~15 任务；本叶 25。理由：① 父 `plan.md §7.3` 估 ~24；② 18 门禁三态逐条 + 立法台账 + 2 保护段无法再并（并则破坏「每任务独立可验证」）；③ 与 F-34 叶2（16）同量级但本叶门禁重锚面更宽。

---

## 4. 执行策略

| 波次 | 任务 | 策略 |
|:--:|------|------|
| 1（W04） | `201`~`206` | `201 ∥ 202` → `203` → `204 ∥ 205` → `206`；**收口门禁绿**（op-wiring 恰 1 + 三 id 零命中 + 容器册 16） |
| 2（W05） | `207`~`212` | `207 ∥ 208 ∥ 209` → `210` → `211` → `212`（回归 + 反证还原） |
| 3（W06） | `213`~`225` | `213`（闸门最前）→ `214 ∥ 215` → `216` → `217` → `218` → `219` → `220 ∥ 221` → `222` → `223` → `224` → `225`（终局收口） |

**提交区间**：A（W04）/ B（W05）/ C（W06，收口轮·终局）。**门禁严格串行**（一次一个 Chromium；`finally` 自清 profile）；反证必实跑 + 逐字节还原；`KL-N-10` 隔离复跑 ≥2。

---

## 5. 18 门禁三态处置（本叶承载）

| # | 层 | 门禁 | 处置 | 任务 |
|:-:|:-:|---|---|---|
| 1 | node | `op-wiring` | 等价重锚（恰 2→1 + 反证） | `205` |
| 2 | node | `turn-arbitration` | 等价重锚（回填唯一化；删回填仍必红） | `210` / `211` |
| 3 | node | `r6-ty-experience-fix` | 等价重锚 | `211` |
| 4 | node | `sidepanel-view` | 等价重锚（三 id 不存在） | `211` |
| 5 | node | `density-thresholds` | 等价重锚（`:769/:775` 转「必须入册」；`#send-reason` 非恒真） | `206` / `209` / `211` |
| 6 | node | `host-registry` | 等价重锚（13→16） | `206` / `211` |
| 7 | node | `supersession-ledger` | 保留 + 新增（老 remap + X-IAN-1 + journey pin + binding keep） | `215` / `217` |
| 8 | node | `insight-tree-hierarchy` | 保留 + 取代登记 | `217` |
| 9 | node | `settings` | 等价重锚（draft） | `208` / `211` |
| 10 | node | `size-baseline` | 等价重锚 / 新增登记 | `224` |
| 11 | Chromium | `insight.mjs` | 显式取代 / 消解（非静默 `null`） | `220` |
| 12 | Chromium | `journey.mjs` | 等价重锚 + 保护段八步取代 | `218` |
| 13 | Chromium | `l0.mjs` | 等价重锚（③⑪） | `201` / `204` / `220` |
| 14 | Chromium | `binding.mjs` | 等价重锚 + 保段 keep | `219` / `220` |
| 15 | Chromium | `recommendation.mjs` | 等价重锚（不填输入） | `220` |
| 16 | Chromium | `s0-self-driven.mjs` | 等价重锚 + S0''-B 新增断言（只加断言） | `220` / `222` |
| 17 | Chromium | `l1.mjs` | 保留（若微调 ⇒ 等价重锚 + 台账） | `220` |
| 18 | Chromium | `hardening.mjs` | 保留 | `220` |

**间接 / 对账面**：`notify-tools.test.ts`（消息 `send()` ≠ `#send` 按钮）/ `settings-help.test.ts` / `system-merge.test.ts` / `parity/baseline-catalog.json`。**新门禁**：`law4-input-as-next`。**`CHROMIUM_GATES === 9` 不动**。

---

## 6. 红线守线清单（本叶）

| 红线 | 守线任务 | 判据 |
|---|---|---|
| 三冻结面 + `KIND_SET` 40 | `223` / `224` | `stat` + sha256 + 长度断言 |
| 12 kind / 零宿主 / 宿主值 4 项 | `206` / `216` / `223` | `host-registry` |
| `requestTurn(` 恰 1 | `205` / `210` | `op-wiring` + 反证 |
| 真实退役（非 hidden） | `202` / `216` / `222` | DOM 零命中 + 注入必红 |
| 法四三处一致 + 台账 | `214` / `215` / `217` | 半修即红 + old/new |
| 保护段（journey 八步 / binding keep） | `213` / `218` / `219` / `215` | 新 pin + startAnchor = 107780 |
| 法八零降级 / 特权恒 gesture | `223` | `test:law8 ≥36` / `capability-wiring` |
| base 零 diff / 判定链零触碰 | `223` | `insight-no-escalation` |
| 体积净负诚实登记 | `224` | 严格口径如实 / 两叶 Σ |
| 断言零删除零降级（保护段例外 + 台账） | `217` / `218` / `219` / `221` / `225` | 对账无减少项 |

---

## 7. spikeGate 结论义务

| 代码 | 任务 | 假设 | 被闸门任务 | 停止规则 |
|---|---|---|---|---|
| `SG-IAN-03` | `213` | journey 八步取代 + binding 段前等长补偿字节账可行 | `218` / `219` | 字节账不可行 ⇒ binding 改走八步取代（`ADR-IAN-007` 逃生口）；冲突 ⇒ 暂停上报 |

结论须以「假设 / 探针方法 / 实跑证据 / 结论」四要素写入本叶 build 记录；探针产物不落版本库。

---

## 8. 体积（本叶）

**A 列目标 −2.5~−1.0 KB（净负）**；**严格口径 −1.2~+0.3 KB**（DOM/CSS 经 `build.mjs:95` `copyFile` 进 `dist/sidepanel.html`，**不进** `sidepanel.js` 账本，`ADR-IAN-010 §③` 登记）；B 列 0；C 列零容差。**收口重登记 = `TASK-IAN-224`**（五要素 + 三值 + 两叶 Σ + EC-IAN-016 二态）。非负须显式说明（`FR-IAN-115` / `R-IAN-908`）。

---

## 9. 未落地 / 待测点（禁预填）

| # | 主题 | 状态 | 归属 |
|:--:|---|---|---|
| `IAN-P-004` | V3-VOL-3 升档作者一行（跨叶共享） | `pending-author-line` | `224` |
| `IAN-P-005` | SG-IAN-03 字节账（binding 补偿可行性） | `pending-measurement` | `213` |
| `IAN-P-006` | A 列叶2 实测净增（是否净负）+ 两叶 Σ | `pending-measurement` | `224` |
| `IAN-P-007` | 人工面 M3 / M4 | `pending-human` | `222` |
| `IAN-P-010` | `KL-N-10` 家族 flake | `pending-measurement` | `223` / `225` |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（IAN-2 叶任务：**25 任务 / 3 波**（`TASK-IAN-201~225`；S×0 / M×20 / L×5）+ 1 个 spikeGate（SG-IAN-03）+ 1 个新 node 门禁 `law4-input-as-next`（L4-1~6）+ S0''-B 双面 + 20 门禁三态重锚（18 门禁 + 2 新）+ 体积叶2 净负重登记 `224`。**波次细化**：op-wiring 重锚前移至 W1（`205`，与删面同轮）。**硬依赖叶1 validated** | 2026-09-25 | SDDU Tasks Agent |
