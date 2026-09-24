# 任务分解：specs-tree-ian-1-free-input-next（IAN-1 流内自由输入 next 通道：新面 + 通道 + 迁移）

> **文档定位**: SDDU 任务清单（**叶级切片**）— 父 `../tasks.md`（v1.0 总览）在本叶的落地；作为 build 阶段的输入
> **前置依赖**: 本叶 `plan.md` v1.0 + 父 `../plan.md` v1.0（含 `ADR-IAN-001/002/003/008/009/010`）+ 父 `../spec.md` v1.0 + 本叶 `spec.md` v1.0
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-25
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-09-25
> **更新说明**: 初始创建（IAN-1 叶任务：**27 任务 / 3 波**（`TASK-IAN-101~127`；S×4 / M×19 / L×4）+ 2 个 spikeGate（SG-IAN-01/02）+ 1 个新 node 门禁 `free-input-next`（FIN-1~8）+ S0''-A 双面 + 体积叶1 正增量重登记）

---

## 0. 结构登记（**首叶 / 底座叶**）

| 项 | 内容 |
|---|---|
| 叶定位 | **首叶 / 底座叶**（`deliveryOrder: 1` / `dependsOn: []` / P0）；**先立新面**（叶1 不删 `#composer`） |
| 与叶2 关系 | 叶1 **全绿（validated）** 后叶2 方可启动（`BLK-IAN-9`；`R-IAN-901` / `N-IAN-027`） |
| 本叶**不做** | `#composer` 退役（叶2）/ 法四修订（叶2）/ 保护段决策（叶2）/ `requestTurn(` 恰 1 落地（叶2）/ 18 门禁终态重锚（叶2） |
| 本叶**不变** | `requestTurn(` 计数（叶1 仍恰 **2**）/ `KIND_SET` 40 / 12 kind / `ACT_TO_OP`（恰 6）/ `NEXTSTEP_PRIORITY`（恰 4）/ `turn-queue.ts`（diff=0） |
| 模板偏差 | 模板 §5.4 / §8 建议 5~15 任务 ⇒ 本叶 **27**（与 F-34 叶1 29 同量级，显式登记，理由见 §3） |
| 编号空间 | `TASK-IAN-101~127`；与 `TASK-IAN-2xx`（叶2）连续不交叠 |

---

## 1. 依赖拓扑总览（3 波）

```
W01 ─── 形态与末端项（可并行区：102 ∥ 103；106 ∥ 107）
  TASK-IAN-101 [M] spike  SG-IAN-01（先验闸门，最前）
  TASK-IAN-102 [S] providers.ts free-input provider + 驱动者声明
  TASK-IAN-103 [S] dispatch.ts SET_A_PROTOCOL_ACTIONS 8→9
  TASK-IAN-104 [M] recommend.ts 末端项注入 + 零死端 floor + payload
  TASK-IAN-105 [M] cards/nextstep.ts 末端项渲染（非 .next-chip）
  TASK-IAN-106 [M] gate   next-dispatch-diff0 D0-5/D0-7 重锚
  TASK-IAN-107 [M] gate   recommendation.mjs 末端项断言（只增）

W02 ─── 通道与手输（依赖 W01；可并行区：111 ∥ 114）
  TASK-IAN-108 [M] spike  SG-IAN-02（先验闸门，最前）
  TASK-IAN-109 [M] cards/askuser.ts free-input 语义分支
  TASK-IAN-110 [L] sidepanel.ts openFreeInputCard + handleCardAction 分支
  TASK-IAN-111 [S] ai-drive.ts MANUAL_DRIVER_ID
  TASK-IAN-112 [M] 手输 trace + 让位语义（槽外）+ 空提交可读提示
  TASK-IAN-113 [M] 提交经 op.turn 槽（不新增 requestTurn( 直连）
  TASK-IAN-114 [S] view-model.ts 引导文案改指（叶1 侧）
  TASK-IAN-115 [M] a11y focus + 键盘路径
  TASK-IAN-116 [L] gate   free-input-next FIN-1~6 + 反证

W03 ─── R6 / 回填 / 验收（收口轮；可并行区：125 ∥ 126）
  TASK-IAN-117 [M] R6 双入口并存（composer 逐字保留）+ 在飞不硬禁用
  TASK-IAN-118 [M] 流内回填支持（仅当为空 / 卡收起重展开 / 双载体并存）
  TASK-IAN-119 [M] gate   turn-arbitration TA-4 等价重锚
  TASK-IAN-120 [M] gate   r6-ty + sidepanel-view 重锚
  TASK-IAN-121 [M] gate   free-input-next FIN-7/8 + 三段控制 + 真源切片
  TASK-IAN-122 [M] gate   gate-integrity 下界只增 free-input-next
  TASK-IAN-123 [L] gate   S0''-A node 面
  TASK-IAN-124 [L] gate   S0''-A Chromium 面 + 样本单源扩展
  TASK-IAN-125 [M] gate   红线巡检（三冻结面 / 载体 / base / 判定链 / 法八 / 特权）
  TASK-IAN-126 [M] doc    体积叶1 重登记（五要素 + 三值 + 逐模块 + EC-IAN-016）
  TASK-IAN-127 [M] doc    门禁对账骨架 + X-IAN-7 叶1 侧台账骨架（收口）
```

**关键路径**：`101 → 102 → 104 → 105 → 108 → 109 → 110 → 113 → 116 → 117 → 118 → 119 → 121 → 122 → 123 → 124 → 126 → 127`

---

## 2. 任务列表

### TASK-IAN-101: SG-IAN-01 `op.turn` 槽承载自由输入可行性探针（先验闸门）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | spike（`SG-IAN-01`） |
| **前置依赖** | 无 |
| **执行波次** | 1 |
| **对应 FR** | FR-IAN-016 / 020 / 021 / 006 |
| **对应 ADR** | ADR-IAN-002 / 008 |

**涉及文件**: `packages/web-cli-plugin/test/_spike/sg-ian-01-probe.mjs`（SPIKE，探毕删除）

**验收标准**:
- [ ] `dispatchChipAction('op.turn', text)` → `runOp('op.turn')` → `bindPanelOps.turn` → `requestTurn` 链路可达
- [ ] 叶1 `requestTurn(` 仍恰 2；叶2 重锚口径 `OP_CALLSITE_SET.op.turn.callSites 2→1` 可预演
- [ ] 零新增 op / `ACT_TO_OP` 仍恰 6；特权 op 不触达
- [ ] 结论 ∈ {可行/不可行}；探针产物不进入提交

**被闸门任务**: `109 / 110 / 111 / 112 / 113 / 116`（不可行 ⇒ 暂停上报）

**验证命令**:
```bash
# 探针自跑（不入库）；结论写入本叶 build.md
node packages/web-cli-plugin/test/_spike/sg-ian-01-probe.mjs
```

---

### TASK-IAN-102: `providers.ts` 注册 `free-input` provider + 驱动者声明

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **类型** | implementation |
| **前置依赖** | TASK-IAN-101 |
| **执行波次** | 1 |
| **对应 FR** | FR-IAN-010 / 011 / 017 |
| **门禁** | `next-dispatch-diff0` |

**涉及文件**: `src/ui/sidepanel/next-registry/providers.ts`（MODIFY）

**验收标准**:
- [ ] `free-input` provider 恰一行（`when` 恒真 / `chips:['free-input']` / `textOf:()=>['自由输入…']`）；`DRIVER_DECLS_SRC` 同步一条（双向包含满足）
- [ ] provider 10 → 11；零新 kind / 零新 op；`NEXTSTEP_PRIORITY` 仍恰 4
- [ ] `timing ⊆ DRIVER_TIMINGS`；`evidence ⊆ CTX_FIELD_SERVICE`

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- next-dispatch-diff0 driver-quadruple
```

---

### TASK-IAN-103: `dispatch.ts` `SET_A_PROTOCOL_ACTIONS` +`'free-input'`（8→9）

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **类型** | implementation |
| **前置依赖** | TASK-IAN-101 |
| **执行波次** | 1 |
| **对应 FR** | FR-IAN-010 |
| **门禁** | `next-dispatch-diff0` |

**涉及文件**: `src/ui/sidepanel/next-registry/dispatch.ts`（MODIFY）

**验收标准**:
- [ ] `SET_A_PROTOCOL_ACTIONS` 恰 +1（8→9），含 `'free-input'`；两集互斥不变
- [ ] `ACT_TO_OP` **逐字不动**（仍恰 6 行）；`OP_TO_ACT` / `OPS_BY_ID` / 9 op 清单零改
- [ ] 零第二 `act→op` 表

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- next-dispatch-diff0
```

---

### TASK-IAN-104: `recommend.ts` 末端项单点注入 + 零死端 floor + payload 布尔字段

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | implementation |
| **前置依赖** | TASK-IAN-101 / 102 |
| **执行波次** | 1 |
| **对应 FR** | FR-IAN-010 / 013 / 014 |
| **门禁** | `test:recommendation` / `test:dead-end` |

**涉及文件**: `src/ui/sidepanel/recommend.ts`（MODIFY）

**验收标准**:
- [ ] 末项注入**单源** = `recommendNextStep`；恒最末（结构序 + 文本序）
- [ ] 零死端 floor：无其他候选（`suppression ∈ {empty,safety}` ∧ `!busy` ∧ 间隔已过）⇒ 铸造仅含终端的**最小推荐卡**（EC-IAN-001）
- [ ] `MAX_NEXTSTEP_CARDS_PER_ROUND = 1` 语义不变；`NEXTSTEP_PRIORITY` 逐字不动（仍恰 4）
- [ ] payload 增一个布尔字段（加法字段，非新 kind）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- recommendation dead-end recommendation-sources
```

---

### TASK-IAN-105: `cards/nextstep.ts` 末端项渲染（`.next-chips` 之后，非 `.next-chip`）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | implementation |
| **前置依赖** | TASK-IAN-104 |
| **执行波次** | 1 |
| **对应 FR** | FR-IAN-012 / 014 |
| **门禁** | `test:density` |

**涉及文件**: `src/ui/sidepanel/cards/nextstep.ts`（MODIFY）

**验收标准**:
- [ ] 终端项独立 `data-act='free-input'`，**不进** `.next-chip` 类（在飞不被 `syncNextstepPending` 禁用）
- [ ] 终端项**不进** `MAX_CHIPS_PER_CARD` 预算（仍 =3）；单卡可点 ≤ 4 ≤ 6
- [ ] 终端项是 `<button>` 非输入框（默认屏可见输入框 = 0）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- density-thresholds
```

---

### TASK-IAN-106: `test/next-dispatch-diff0.test.ts` D0-5 / D0-7 等价重锚

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | gate |
| **前置依赖** | TASK-IAN-102 / 103 / 104 |
| **执行波次** | 1 |
| **对应 FR** | FR-IAN-010 / 100 |
| **门禁** | `next-dispatch-diff0` |

**涉及文件**: `test/next-dispatch-diff0.test.ts`（MODIFY）

**验收标准**:
- [ ] D0-5：集 A 只增（8→9）且 `'free-input'` 可在集 A 声明处定位
- [ ] D0-7：`known` 集等价重锚为 `opId ∪ ACT_TO_OP 值 ∪ ACT_TO_OP 键 ∪ 集 A 协议动作`
- [ ] D0-1 继续承重（`handleCardAction` 体不得含集 B 字面量、必须含全部集 A 字面量）；`ACT_TO_OP` 仍恰 6
- [ ] 反证：移除集 A 中 `'free-input'` ⇒ D0-1 必红；逐字节还原

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- next-dispatch-diff0
```

---

### TASK-IAN-107: `test/ui/recommendation.mjs` 末端项断言（只增）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | gate |
| **前置依赖** | TASK-IAN-104 / 105 |
| **执行波次** | 1 |
| **对应 FR** | FR-IAN-010 / 014 |
| **门禁** | `test:recommendation`（≥72） |

**涉及文件**: `test/ui/recommendation.mjs`（MODIFY）

**验收标准**:
- [ ] 末端项存在 ∧ 恒为推荐卡最末 ∧ 不填任何输入 ∧ 不越预算
- [ ] 既有「chip 提交不填 `#input`」断言逐字保留；计数 ≥72（只增）
- [ ] 反证：末端项与 `.next-chips` 同序 ⇒ 必红

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run test:ui -- recommendation
```

---

### TASK-IAN-108: SG-IAN-02 `askuser` 第二语义分支不破载体探针（先验闸门）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | spike（`SG-IAN-02`） |
| **前置依赖** | TASK-IAN-102 / 103 |
| **执行波次** | 2 |
| **对应 FR** | FR-IAN-011 / 017 / 015 |
| **对应 ADR** | ADR-IAN-002 / 001 |

**涉及文件**: `packages/web-cli-plugin/test/_spike/sg-ian-02-probe.mjs`（SPIKE，探毕删除）

**验收标准**:
- [ ] 独立 `requestId='free-input'` 与 `ref-describe` / text-ask 可区分（存在性判定独立，不与 `ensureTextAskCard` 合流）
- [ ] 复用 `.ask-fallback` 家系（id / 互斥披露 / focus 零第二套机制）；`#ask-input` 文档级唯一
- [ ] `KIND_SET` 40 / 12 kind / `REGISTERED_STRUCTURAL_HOSTS=[]` 不动；零新 id 家系
- [ ] 结论 ∈ {可行/不可行}；探针产物不进入提交

**被闸门任务**: `109 / 110 / 116`

**验证命令**:
```bash
node packages/web-cli-plugin/test/_spike/sg-ian-02-probe.mjs
```

---

### TASK-IAN-109: `cards/askuser.ts` free-input 卡内输入语义分支（幂等查询）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | implementation |
| **前置依赖** | TASK-IAN-101 / 108 |
| **执行波次** | 2 |
| **对应 FR** | FR-IAN-011 / 015 / 017 |
| **门禁** | `free-input-next` |

**涉及文件**: `src/ui/sidepanel/cards/askuser.ts`（MODIFY）

**验收标准**:
- [ ] free-input 卡 = `askuser` kind + `askKind:'text'` + `prompt:'自由输入…'` + `requestId:'free-input'`（出生即展开）
- [ ] 按 `requestId` 的**纯查询**（零第二 DOM 路径 / 零新 id 家系）
- [ ] `op.describe` 有值相 ⇒ `submitDescribe`（本地结算、不成回合）逐字不变
- [ ] `KIND_SET` 40 / 12 kind 逐字不动

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- free-input-next host-registry messaging
```

---

### TASK-IAN-110: `sidepanel.ts` `openFreeInputCard` + `handleCardAction` 集 A / requestId 分支

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **类型** | implementation |
| **前置依赖** | TASK-IAN-101 / 108 / 109 |
| **执行波次** | 2 |
| **对应 FR** | FR-IAN-011 / 015 / 016 |
| **门禁** | `free-input-next` |

**涉及文件**: `src/ui/sidepanel/sidepanel.ts`（MODIFY）

**验收标准**:
- [ ] `handleCardAction` 集 A 分支处理 `'free-input'`（同构 `choose-other`/`reanchor`/`hover`；分支体只比对本地 helper，**不引入集 B 字面量**）
- [ ] `openFreeInputCard`：已有 free-input 卡 ⇒ 复用 + `setCardFallbackOpen(form,true)` + focus（卡收起重展开）；否则铸造
- [ ] 按 `requestId` 路由：`'free-input'` ⇒ 手输回合分支；其它 ⇒ `submitAskFor` 结算路径逐字不变
- [ ] 反证：free-input 卡与 ref-describe 卡**共用 `requestId`** ⇒ 必红

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- free-input-next next-dispatch-diff0
```

---

### TASK-IAN-111: `ai-drive.ts` `MANUAL_DRIVER_ID='manual'` 单源常量

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **类型** | implementation |
| **前置依赖** | TASK-IAN-108 |
| **执行波次** | 2 |
| **对应 FR** | FR-IAN-022 / 024 |
| **门禁** | `free-input-next` |

**涉及文件**: `src/ui/sidepanel/next-registry/ai-drive.ts`（MODIFY）

**验收标准**:
- [ ] `MANUAL_DRIVER_ID = 'manual'` 恰一处声明（与 `driverTraceLine` 同源）
- [ ] `MANUAL_DRIVER_ID ∉ listDriverDecls()`（反向不相交断言）
- [ ] `evidence` 只写 ctx 字段名，不写用户内容 / Key / URL

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- free-input-next driver-quadruple
```

---

### TASK-IAN-112: 手输 trace（`driver=manual`）+ 让位语义（槽外）+ 空提交可读提示

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | implementation |
| **前置依赖** | TASK-IAN-110 / 111 |
| **执行波次** | 2 |
| **对应 FR** | FR-IAN-022 / 023 / 018 |
| **门禁** | `free-input-next` |

**涉及文件**: `src/ui/sidepanel/sidepanel.ts`（MODIFY）

**验收标准**:
- [ ] 手输路径写 `driver=manual` 留痕行（`driverTraceLine` 复用，零新字段）；AI 自主按 `op.turn` **不产生**该行（EC-IAN-013）
- [ ] 让位语义 `proactivity.noteUserTurn()` 在手输路径、**`requestTurn` 函数体外**（切片断言）；反证「移入 `requestTurn` ⇒ 必红」
- [ ] 空 / 纯空白提交：不产生空回合且**不静默**（notice 可读行，零新增 kind）
- [ ] 法八：输入文本仅走 `chat` `user` 载荷

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- free-input-next op-wiring
```

---

### TASK-IAN-113: 提交经 `op.turn` 槽（不新增 `requestTurn(` 直连）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | implementation |
| **前置依赖** | TASK-IAN-101 / 110 |
| **执行波次** | 2 |
| **对应 FR** | FR-IAN-016 / 020 / 021 / 025 |
| **门禁** | `free-input-next` / `op-wiring` |

**涉及文件**: `src/ui/sidepanel/sidepanel.ts`（MODIFY）

**验收标准**:
- [ ] 提交经 `dispatchChipAction('op.turn', value)` → `runOp` → `bindPanelOps.turn` → `requestTurn`
- [ ] 叶1 `requestTurn(` 调用点**仍恰 2**（FIN-3 计数不增判据）
- [ ] 不触达特权 op；零散落输入面 / 第二提交点

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- op-wiring free-input-next capability-wiring
```

---

### TASK-IAN-114: `view-model.ts` 引导文案改指（叶1 侧）+ `AskFlowView` 语义锚

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **类型** | implementation |
| **前置依赖** | TASK-IAN-108 |
| **执行波次** | 2 |
| **对应 FR** | FR-IAN-056 |
| **门禁** | `sidepanel-view` |

**涉及文件**: `src/ui/sidepanel/view-model.ts`（MODIFY）

**验收标准**:
- [ ] `ONBOARDING_TEXTS[4]` 改指流内 next「自由输入…」项（语义与流内入口一致）
- [ ] `AskFlowView` 语义锚不含流外面引用；文案不指向已废面
- [ ] 零新增常量

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- sidepanel-view
```

---

### TASK-IAN-115: a11y — focus 卡内 input + Tab 序无悬空 + 键盘提交/取消

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | implementation |
| **前置依赖** | TASK-IAN-110 |
| **执行波次** | 2 |
| **对应 FR** | FR-IAN-019 / 045 |
| **门禁** | `free-input-next` |

**涉及文件**: `src/ui/sidepanel/sidepanel.ts`（MODIFY）/ `src/ui/sidepanel/cards/askuser.ts`（MODIFY）

**验收标准**:
- [ ] 展开即 `focus()` 到卡内 input（复用 `setCardFallbackOpen` / `setAskFallbackOpen(doc,true)` 先例）
- [ ] Tab / Shift+Tab 无悬空焦点；Enter 提交；Escape / 取消可达（EC-IAN-010）
- [ ] 「无悬空焦点」断言（focus 归属可判）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- free-input-next
```

---

### TASK-IAN-116: `test/free-input-next.test.ts` 新门禁骨架（FIN-1~6 + 反证）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **类型** | gate |
| **前置依赖** | TASK-IAN-109 / 110 / 112 / 113 |
| **执行波次** | 2 |
| **对应 FR** | FR-IAN-010 / 013 / 020 / 022 / 023 |
| **门禁** | `free-input-next`（新） |

**涉及文件**: `test/free-input-next.test.ts`（NEW）

**验收标准**:
- [ ] `FIN-1` 末端项存在且恒最末；`FIN-2` 零死端 floor；`FIN-3` 唯一提交点（不增 `requestTurn(`）
- [ ] `FIN-4` 手输可判（`MANUAL_DRIVER_ID` 写入手输留痕 ∧ `∉ listDriverDecls()` ∧ AI 不写）；`FIN-5` 让位语义槽外；`FIN-6` 空提交不静默
- [ ] 每条判据含 `expectFailPattern`（禁恒真）+ **独立 `requestId` 反证（共用 ⇒ 必红）**
- [ ] `KIND_SET` 40 / 12 kind / 零宿主逐字

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- free-input-next
```

---

### TASK-IAN-117: R6 双入口并存（composer submit 逐字保留可用）+ 在飞不硬禁用

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | implementation |
| **前置依赖** | TASK-IAN-113 |
| **执行波次** | 3 |
| **对应 FR** | FR-IAN-030 / 031 / 071 |
| **门禁** | `r6-ty-experience-fix` |

**涉及文件**: `src/ui/sidepanel/sidepanel.ts`（MODIFY）

**验收标准**:
- [ ] 叶1 双入口：新流内入口（`op.turn` 槽）+ 旧 composer submit **逐字保留可用**（中间态保护，N-IAN-027）
- [ ] 在飞时 free-input 终端不被 pending 硬禁用；提交照常下发 → SW 有界仲裁
- [ ] `turn-queue.ts` 裁决逻辑 **diff = 0**
- [ ] 反证：ian-1 破坏旧入口（三 id 任一不可用）⇒ 必红

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- r6-ty-experience-fix op-wiring
```

---

### TASK-IAN-118: 流内回填支持（`busy-rejected` 迁卡内：仅当为空 / 卡收起重展开 / 双载体并存）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | implementation |
| **前置依赖** | TASK-IAN-117 |
| **执行波次** | 3 |
| **对应 FR** | FR-IAN-032 / 033 |
| **门禁** | `turn-arbitration` |

**涉及文件**: `src/ui/sidepanel/sidepanel.ts`（MODIFY）

**验收标准**:
- [ ] `busy-rejected` 三分支：卡在 / 卡收起（重展开 + focus）/ 卡不存在（按需铸造并回填）
- [ ] 三语义逐字不变：① 不丢原话 ② **仅当输入处为空**（不覆盖） ③ 有可读行
- [ ] 叶1 保留 `#input` 回填（双载体并存可判）；`QUEUED_TURN_TEXT` / `BUSY_REJECTED_*` 文案逐字保留
- [ ] 反证：回填覆盖非空 ⇒ 必红

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- turn-arbitration free-input-next
```

---

### TASK-IAN-119: `test/turn-arbitration.test.ts` TA-4 等价重锚（双载体可判 + 删回填仍必红）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | gate |
| **前置依赖** | TASK-IAN-118 |
| **执行波次** | 3 |
| **对应 FR** | FR-IAN-033 / 100 |
| **门禁** | `turn-arbitration`（≥6） |

**涉及文件**: `test/turn-arbitration.test.ts`（MODIFY）

**验收标准**:
- [ ] TA-4 回填载体判据保留（`draftInput.value = rejected` ∧ `length===0`）并对流内载体可判
- [ ] 「删回填仍必红」保留（`PANEL.replace(回填语句,'')` ⇒ 红）
- [ ] 计数 ≥6（只增）；三条语义断言保留

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- turn-arbitration
```

---

### TASK-IAN-120: `r6-ty-experience-fix.test.ts` + `sidepanel-view.test.ts` 在飞不硬禁用 → 流内输入面

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | gate |
| **前置依赖** | TASK-IAN-117 |
| **执行波次** | 3 |
| **对应 FR** | FR-IAN-030 / 054 |
| **门禁** | `r6-ty-experience-fix` / `sidepanel-view` |

**涉及文件**: `test/r6-ty-experience-fix.test.ts`（MODIFY）/ `test/sidepanel-view.test.ts`（MODIFY）

**验收标准**:
- [ ] r6-ty `:169-173` 等价重锚为「在飞不硬禁用**流内**输入面」；`:325` `requestTurn` 计数叶1 仍 2
- [ ] sidepanel-view `:115-120`（R6 在飞可提交）→ 流内输入面
- [ ] 原判据不改处逐字保留；计数只增

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- r6-ty-experience-fix sidepanel-view
```

---

### TASK-IAN-121: `free-input-next.test.ts` FIN-7/8 + 三段控制 + 真源切片

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | gate |
| **前置依赖** | TASK-IAN-116 / 118 |
| **执行波次** | 3 |
| **对应 FR** | FR-IAN-033 / 018 / 064 |
| **门禁** | `free-input-next` |

**涉及文件**: `test/free-input-next.test.ts`（MODIFY）

**验收标准**:
- [ ] `FIN-7` 回填不覆盖（仅当为空；非空只留痕；卡收起 ⇒ 重展开）；`FIN-8` 法八（仅走 `chat` `user`；卡固化不回显值）
- [ ] 三段控制 `ok` / `violated` / `n/a` 逐态可达（`n/a` 不冒充 `ok`，禁恒真）；真源切片读生产模块
- [ ] 反证族实跑：注入 ⇒ FAIL ⇒ 逐字节还原（sha256 前后相同）⇒ PASS
- [ ] 全部判据计数只增

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- free-input-next
```

---

### TASK-IAN-122: `test/gate-integrity.test.ts` `EXPECTED_AUDITED_FILES` 只增 `free-input-next`

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | gate |
| **前置依赖** | TASK-IAN-116 / 121 |
| **执行波次** | 3 |
| **对应 FR** | FR-IAN-105 |
| **门禁** | `gate-integrity`（≥19） |

**涉及文件**: `test/gate-integrity.test.ts`（MODIFY）

**验收标准**:
- [ ] `EXPECTED_AUDITED_FILES` 下界只增 `free-input-next`（叶1 = +1）
- [ ] 既有下界（`V5_*` / `V551_*` / `V552_*` / `V553_*` / `V55F_*`）逐字保留；`CHROMIUM_GATES === 9` 逐字不动
- [ ] 计数 ≥19（只增）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- gate-integrity
```

---

### TASK-IAN-123: S0''-A node 面（`s0-self-driven-chain.test.ts` + `free-input-next.test.ts`）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **类型** | gate |
| **前置依赖** | TASK-IAN-117 / 118 / 121 |
| **执行波次** | 3 |
| **对应 FR** | FR-IAN-070 / 071 / 072 |
| **对应 ADR** | ADR-IAN-009 |

**涉及文件**: `test/s0-self-driven-chain.test.ts`（MODIFY）/ `test/free-input-next.test.ts`（MODIFY）

**验收标准**:
- [ ] S0''-1~10 node 面逐环节可判（含中间态 = 双入口）
- [ ] **S0''-A 双入口各跑通一轮**（旧 composer submit ∧ 新卡内输入均成回合）；双回填载体均可判（互不覆盖）
- [ ] 样本单源 = `test/ui/fixtures/s0-chain.mjs`（扩展，不新增样本文件）
- [ ] 真源切片（不用假 provider / 桩）；反证「ian-1 破坏旧入口 ⇒ 必红」

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- s0-self-driven-chain free-input-next
```

---

### TASK-IAN-124: S0''-A Chromium 面 + 样本单源扩展（`s0-self-driven.mjs` 只加断言）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **类型** | gate |
| **前置依赖** | TASK-IAN-123 |
| **执行波次** | 3 |
| **对应 FR** | FR-IAN-070 / 071 / 074 |
| **对应 ADR** | ADR-IAN-009 |
| **门禁** | `s0-self-driven`（≥70） |

**涉及文件**: `test/ui/s0-self-driven.mjs`（MODIFY）/ `test/ui/fixtures/s0-chain.mjs`（MODIFY）

**验收标准**:
- [ ] 真面板：点末端项 → `#ask-fallback` 可见 + `#ask-input` 获 focus → 真键入 → 真点提交 → 流内 `user` 行；旧 `#composer` submit 仍可用
- [ ] **只加断言不加文件**（`CHROMIUM_GATES === 9` 不动）；样本单源
- [ ] 人工面 M1 / M2 / M5 逐项 `⏳ 未执行`，不得冒充 PASS
- [ ] 计数 ≥70（只增）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run test:ui -- s0-self-driven
```

---

### TASK-IAN-125: 红线巡检（三冻结面 / 载体 / base / 判定链 / 法八 / 特权）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | gate |
| **前置依赖** | TASK-IAN-113 / 121 |
| **执行波次** | 3 |
| **对应 FR** | FR-IAN-112 / 017 / 025 |
| **门禁** | `insight-no-escalation` / `test:law8`（≥36） |

**涉及文件**: `test/insight-no-escalation.test.ts`（MODIFY）/ `test/ui/law8-plaintext.mjs`（MODIFY）

**验收标准**:
- [ ] `content.js` 177,076 B / `52a82620…`；`pick-layer.js` 34,358 B / `77796bab…`
- [ ] `KIND_SET` 40 / 12 kind / 零宿主；`manifest.json` 零 diff；`packages/web-cli-base/**` 零 diff
- [ ] 判定链 `zeroDiffFiles` pin 绿；特权 op 恒 gesture + SW 永不 `.request(`
- [ ] `test:law8 ≥36`（零降级）；留痕零用户内容值扫描零命中

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- insight-no-escalation && npm run test:ui -- law8-plaintext
```

---

### TASK-IAN-126: 体积叶1 重登记（五要素 + V3-VOL-3 三值 + 逐模块行 + EC-IAN-016 二态）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | doc |
| **前置依赖** | TASK-IAN-122 / 123 / 124 / 125 |
| **执行波次** | 3 |
| **对应 FR** | FR-IAN-110 / 113 / 114 |
| **门禁** | `test:size-ruling-vol3`（≥12） |

**涉及文件**: `test/size-baseline.ts`（MODIFY）/ `test/size-budget.test.ts`（MODIFY）/ `test/size-ruling-vol3.test.ts`（MODIFY）

**验收标准**:
- [ ] A 列本叶**正增量**实测登记（预算 +2.5~4.5 KB，上界 +15% = +2.9~+5.2 KB）+ 五要素齐备 + 时间线只追加
- [ ] V3-VOL-3 三值同源前移；`SIDEPANEL_CEILING_CAP` 保持 record-only
- [ ] 逐模块归因（`ian1Rows`：providers / dispatch / ai-drive / recommend / nextstep / askuser / sidepanel / view-model + 未归因胶水；Σ 逐模块 Δ + 未归因 == 登记增量）
- [ ] EC-IAN-016 二态显式；`authorConfirmation = pending-author-line`（不得伪称）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test -- size-budget size-ruling-vol3
```

---

### TASK-IAN-127: 门禁对账骨架 + X-IAN-7 叶1 侧台账骨架（本叶收口）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | doc |
| **前置依赖** | TASK-IAN-119 / 120 / 121 / 122 / 126 |
| **执行波次** | 3 |
| **对应 FR** | FR-IAN-100 / 102 |
| **门禁** | `test:supersession`（≥42） |

**涉及文件**: `packages/web-cli-plugin/docs/v4-supersession-ledger.json`（MODIFY）/ `test/supersession-ledger.test.ts`（MODIFY）

**验收标准**:
- [ ] X-IAN-7 叶1 侧（回填载体双载体并存）台账条目骨架（老条目逐字保留；文件只追加）
- [ ] 本叶门禁对账骨架（18 门禁中本叶触碰项的 old→new 骨架；终态由叶2 收口）
- [ ] 断言零删除零降级、计数只增；`test:supersession ≥42`
- [ ] 本叶全门禁**串行**全绿 + 收口（`KL-N-10` 隔离复跑 ≥2 / 如实记录）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test && npm run test:ui -- recommendation s0-self-driven
```

---

## 3. 任务汇总

| 统计项 | 数值 |
|--------|:--:|
| 总任务数 | **27** |
| S 级（简单） | 4（102 / 103 / 111 / 114） |
| M 级（中等） | 19 |
| L 级（复杂） | 4（110 / 116 / 123 / 124） |
| 执行波次 | **3** |
| spikeGate | 2（SG-IAN-01 / SG-IAN-02） |
| 新增门禁 | 1（`free-input-next`） |

> **模板偏差登记**：模板建议 5~15 任务；本叶 27。理由：① 父 `plan.md §7.3` 估 ~26；② 过并破坏「每任务独立可验证」；③ 与 F-34 叶1（29）/ v5.5-1（25）同量级；④ 27 = 可原子执行单元。

---

## 4. 执行策略

| 波次 | 任务 | 策略 |
|:--:|------|------|
| 1 | `101`~`107` | `101` 先验闸门最前；`102 ∥ 103`（文件不相交）→ `104` → `105` → `106 ∥ 107` |
| 2 | `108`~`116` | `108` 先验闸门最前；`109 → 110 → 113`；`111 ∥ 114`；`112` 后于 `110/111`；`115` 后于 `110`；`116` 后于 `109/110/112/113` |
| 3 | `117`~`127` | `117 → 118 → 119 → 121`；`120` 后于 `117`；`122` 后于 `116/121`；`123 → 124`（样本单源）；`125 ∥ 126`；`127` 末位 |

**提交区间**：A（W1）/ B（W2）/ C（W3，收口轮）——各区间内任务完成后波次提交；**门禁严格串行**；反证必实跑 + 逐字节还原。

---

## 5. 红线守线清单（本叶）

| 红线 | 守线任务 | 判据 |
|---|---|---|
| 三冻结面（`content.js` / `pick-layer.js` / `KIND_SET` 40） | `125` / `126` | `stat` + sha256 + 长度断言 |
| 12 kind / 零宿主 | `102` / `108` / `109` / `125` | `host-registry` / `messaging` |
| `ACT_TO_OP` 恰 6 / `NEXTSTEP_PRIORITY` 恰 4 | `103` / `104` / `106` | 逐字断言 |
| 唯一输入载体 / 唯一提交点（叶1 计数不变） | `109` / `110` / `113` / `116` | 唯一载体 + `requestTurn(` 仍 2 |
| 手输可判 / consent 不被 AI 代答 | `111` / `112` / `116` | 两值 + 注入必红 |
| 法八四面零明文 | `112` / `116` / `121` / `125` | `law8 ≥36` |
| `turn-queue.ts` 零 diff | `117` / `118` | diff = 0 |
| base 零 diff / 判定链零触碰 | `125` | `insight-no-escalation` |
| 保护段（本叶不动） | `127` | `journey ≥171` / `binding ≥192` |
| 中间态保护（叶1 双入口） | `117` / `123` / `124` | S0''-A |

---

## 6. spikeGate 结论义务

| 代码 | 任务 | 假设 | 被闸门任务 | 停止规则 |
|---|---|---|---|---|
| `SG-IAN-01` | `101` | `op.turn` 槽承载自由输入可行 | `109/110/111/112/113/116` | 不可行 ⇒ 暂停上报（禁新增直连 / 禁改走 `submitDescribe`） |
| `SG-IAN-02` | `108` | `askuser` 第二语义分支不破载体 | `109/110/116` | 不可行 ⇒ 暂停上报（禁新增 kind / id 家系 / 改 `KIND_SET`） |

结论须以「假设 / 探针方法 / 实跑证据 / 结论」四要素写入本叶 build 记录；探针产物不落版本库。

---

## 7. 体积（本叶）

**A 列（`dist/sidepanel.js`）目标口径 +2.5~+4.5 KB**（逐模块归因见 §2 `TASK-IAN-126`）；B 列 0（不计账）；C 列零容差。**收口重登记 = `TASK-IAN-126`**（五要素 + 三值 + EC-IAN-016 二态）。`authorConfirmation` 保持 `pending-author-line`。

---

## 8. 未落地 / 待测点（禁预填）

| # | 主题 | 状态 | 归属 |
|:--:|---|---|---|
| `IAN-P-001` | A 列本叶实测净增 + 是否触发升档 | `pending-measurement` | `126` |
| `IAN-P-002` | `free-input-next` 三段控制可达性 | `pending-measurement` | `121` |
| `IAN-P-003` | 人工面 M1 / M2 / M5 | `pending-human` | `124` |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（IAN-1 叶任务：**27 任务 / 3 波**（`TASK-IAN-101~127`；S×4 / M×19 / L×4）+ 2 个 spikeGate（SG-IAN-01/02）+ 1 个新 node 门禁 `free-input-next`（FIN-1~8）+ S0''-A 双面（node `123` + Chromium `124`，样本单源）+ 体积叶1 正增量重登记 `126`。**关键纪律**：#composer 本叶不删；`requestTurn(` 本叶仍恰 2；法四本叶不动 | 2026-09-25 | SDDU Tasks Agent |
