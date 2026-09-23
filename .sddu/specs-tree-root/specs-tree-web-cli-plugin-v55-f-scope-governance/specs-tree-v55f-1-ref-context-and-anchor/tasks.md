# 任务分解：specs-tree-v55f-1-ref-context-and-anchor（V5.5F-1 范围底座：引用事实进回合 + 范围读数 + ref 锚定）

> **文档定位**: SDDU 任务清单（**叶级切片 / 首叶**）— 将本叶 `plan.md` v1.0（父 `../plan.md` + `ADR-SGO-001~008` 在本叶的承载条文）分解为**原子任务**，作为本叶 build / review / validate 的输入
> **前置依赖**: 本目录 `plan.md` v1.0 + `spec.md` v1.0（承载父 FR ≈62 条切片）+ 父 `../plan.md`（跨切契约 / 红线 / 体积分列预算 / 7 波骨架）+ 父 `../spec.md` v1.0（**88 FR / 14 NFR / 22 EC / 26 AC / 22 NG / §12 X-SGO-1~7 / §13 N-SGO-001~030 / §9.5 门禁基线**）+ `../ADR-SGO-001~008-*.md`
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-24
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-09-24
> **更新说明**: 初始创建（V5.5F-1 范围底座叶任务：**29 任务 / 4 波**（`TASK-V55F-101~129`；S×2 / M×21 / L×6）；3 个 spikeGate（SG-SGO-01/02/03）；4 个新 node 门禁中的 3 个（法九 / 载荷 / 锚定）；S0′ 双面落 W4；体积逐叶重登记在 W4 收口轮）

---

## 0. 结构登记（**首叶 / 底座叶**）

| 项 | 内容 |
|---|---|
| 叶定位 | **首叶 / 底座叶**（父 `spec.md §14.1`）：`leaf:true` / `depth:2` / `deliveryOrder: 1` / `dependsOn: []`；本叶承接本 Feature 的 build / review / validate |
| 下游 | 叶2 `specs-tree-v55f-2-batch-consent`（**硬依赖**本叶范围读数与锚定解析；**叶间串行**） |
| 承载父 FR | **≈62 条**（GOV 001~006 / REFCTX 010~019 / SCOPE 020~028 / ANCHOR 030~038 / LAW9 070~077 / TRACE 080·083·084 / S0′ 090·091·092·094 / SUPERSEDE 100·101·102·104·106 / GATE 110~116 / VOL 120~125） |
| 波数 | **4 波**（叶内 `W1~W4`；父 `plan.md §7.3` 骨架 = 4） |
| 编号空间 | `TASK-V55F-101~129`；与 `TASK-V55-*`（v5.5 三叶）/ `TASK-V45-*` / `TASK-V5-*` / `TASK-0xx~8xx` **零冲突** |
| 模板偏差登记 | agent 模板 §5.4 / §8 建议 5~15 任务；本叶 **29**（S×2 / M×21 / L×6）。理由：① 父 `plan.md §7.3` 估 ~30；② 过并破坏「每任务独立可验证」；③ 与 v5.5-1（25）/ v4.5-1（19）同量级显式登记；④ 29 = **可原子执行单元**（≈1 文件内 1 项可验证改动 + 其判据），**不是** LLM 调用数 |
| 执行序纪律 | **先定读数（法九）再定法则**（DC-SGO-007）；**先落边界（失配 / 零引用）再落正向路径**（叶 `spec.md §8.4`） |

### 0.1 tasks 阶段新增先验闸门（**偏差显式登记**）

父 `plan.md` / `ADR-SGO-001~008` **未命名** spikeGate 代号；本轮按**编排器任务书**指定的 `SG-SGO-01~03` 落为**先验闸门（spikeGate）**，探针产物**不落版本库**（`test/_spike/` 探毕删除）：

| 代码 | 任务 | 波 | 被验证假设 | 被闸门任务 |
|---|---|:--:|---|---|
| **SG-SGO-01** | `TASK-V55F-101` | W1 | type-only refs 载荷经 `messaging.ts` 单声明 + `requestTurn` 唯一构建点 + SW 零新通道 | `103` / `105` / `107` / `108` |
| **SG-SGO-02** | `TASK-V55F-116` | W3 | plugin 侧条目包装（base 零 diff）+ `observeIdentity` 复用为 live 单节点闸 | `117` / `118` / `119` / `121` |
| **SG-SGO-03** | `TASK-V55F-109` | W2 | 法九读数**双向反证可机核**（去注入 ⇒ `no-ref` 必红可构造；三段控制可达） | `110` / `113` / `114` |

---

## 1. 依赖拓扑总览

```
W1 ── 口径与载荷（interval A；101 ∥ 102→103→104→105→106→107→108 串行为主）
  TASK-V55F-101 [M] SG-SGO-01 载荷链可行性三断言探针（先验闸门·探针不入库）
  TASK-V55F-102 [S] messaging.ts type-only ChatRefFact / ChatRefTurnPayload
  TASK-V55F-103 [M] l1/ref-scope.ts 引用快照投影 turnRefsOf + 形状 + 掩码口径
  TASK-V55F-104 [L] sidepanel.ts requestTurn 唯一载荷构建点 + ref-store 只读取用
  TASK-V55F-105 [S] ref-turn.ts 当前回合活跃引用单源
  TASK-V55F-106 [M] ref-context.ts 系统段追加段 + 载荷运行时校验
  TASK-V55F-107 [L] service-worker.ts 读 refs + runChat 签名 + 系统段工厂 + turn-queue.refs
  TASK-V55F-108 [M] test/ref-context-in-turn.test.ts 新门禁（载荷形态）

W2 ── 读数单源 + 法九 + 越界拦 + 留痕（interval B）
  TASK-V55F-109 [M] SG-SGO-03 法九双向反证可机核探针（先验闸门）
  TASK-V55F-110 [M] l1/ref-scope.ts SCOPE_READINGS 4 值 + scopeReading 唯一判定
  TASK-V55F-111 [M] 越界拦：confirm 面范围闸（fail-closed + 可达 next）
  TASK-V55F-112 [M] 留痕单源 + 零值纪律（SCOPE_TRACE_FIELDS / scopeReadingTrace）
  TASK-V55F-113 [L] test/law9-scope-reading.test.ts 法九门禁（node）
  TASK-V55F-114 [M] 法九双向反证族（去注入 no-ref 必红 + 逐字节还原）
  TASK-V55F-115 [M] X-SGO-5 等价重锚（读数「作为范围锚」双向反证）

W3 ── `--ref` 锚定包装 + 失配 EC + 失效可判（interval C）
  TASK-V55F-116 [M] SG-SGO-02 包装 base 零 diff + live 闸复用探针（先验闸门）
  TASK-V55F-117 [M] ref-observe.ts observeIdentity 抽为单一实现
  TASK-V55F-118 [M] src/tools/dom-anchor.ts wrapDomEntryForAnchor
  TASK-V55F-119 [M] browser-tools.ts dom 条目接线包装层（base 零 diff）
  TASK-V55F-120 [M] 失配 EC 家族 + 失效可判（fail-closed 非静默）
  TASK-V55F-121 [M] test/dom-ref-anchor.test.ts 新门禁（含 risk 不放宽注入必红）

W4 ── S0′ 双面 + X 台账 + 门禁治理 + 体积重登记（interval D 收口轮）
  TASK-V55F-122 [L] S0′ 样本单源扩展 test/ui/fixtures/s0-chain.mjs
  TASK-V55F-123 [L] S0′ node 面 test/s0-self-driven-chain.test.ts（S0P-1~8）
  TASK-V55F-124 [L] S0′ Chromium 面 test/ui/s0-self-driven.mjs（只加断言不加文件）
  TASK-V55F-125 [M] X-SGO-1/2/3 台账 + X-SGO-7 未发生登记 + op-wiring 复合读数
  TASK-V55F-126 [M] 红线巡检：base 零 diff + 三冻结面 + 判定链 / 不动面
  TASK-V55F-127 [M] 法八四面只增（引用注入零明文 + 凭据掩码）+ 留痕零值扫描
  TASK-V55F-128 [M] 门禁治理收口（gate-integrity 受审集合下界只增 + 断言只增对账）
  TASK-V55F-129 [M] 体积逐叶重登记 + 本叶收口（五要素 + 三值 + EC-SGO-022 二态）

关键路径：101 → 102 → 103 → 104 → 106 → 107 → 108 → 109 → 110 → 111 → 113 → 114 → 116 → 117 → 118 → 119 → 120 → 121 → 122 → 123 → 124 → 128 → 129
```

---

## 2. 任务列表

### TASK-V55F-101: **SG-SGO-01** —— type-only 载荷链可行性三断言探针（先验闸门）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | 无 |
| **执行波次** | W1 |
| **对应 FR** | FR-SGO-010 / 013 / 019 / 006（父 §5.2 / §5.1） |

**描述**: 只读探针，验证「引用事实进回合」的**三条结构性假设**：① `chat` 载荷可经 `background/messaging.ts` **type-only 单声明**承载 `refs`，且 `KIND_SET` **40 项逐字不增**（type-only ⇒ 零运行时字节）；② `requestTurn` 内**唯一构建点**可同时覆盖**两条入口**（驱动者自动成回合经既有 `op.turn` 槽 / 手动 composer），且 `requestTurn(` **仍恰 2**；③ SW 的引用事实**唯一来源 = 回合载荷**（**零新通道** / 零每回合页面探测）。**探针产物不落版本库**。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| SPIKE | `packages/web-cli-plugin/test/_spike/sg-sgo-01-probe.mjs`（探毕删除，不落版本库） |

**验收标准**:
- [ ] 三断言逐条给出**探针方法 + 实跑证据 + 结论**：`KIND_SET` 40 逐字 / `requestTurn(` 恰 2 / SW 引用唯一来源 = 载荷（FR-SGO-010 / 013 / 019）
- [ ] 结论 ∈ {**可行** / **不可行**}；不可行 ⇒ **暂停上报**（禁新增引用通道 / 禁放宽 `requestTurn(` 计数 / 禁改动 `KIND_SET`）
- [ ] 探针产物**不进入提交**（`git status` 无 `test/_spike/`）

**验证命令**:
```bash
cd packages/web-cli-plugin && node -e "const s=require('fs').readFileSync('src/background/messaging.ts','utf8'); console.log((s.match(/KIND_SET/g)||[]).length)" && git status --short | grep -c "_spike" || true
```

**结论义务**: 以「假设 / 探针方法 / 实跑证据 / 结论（可行 / 不可行）/ 对下游影响」五要素写入本叶 build 记录；**结论 = 不可行** ⇒ `103` / `105` / `107` / `108` **不得开工**（`blockers` BLK-SGO-1）。

---

### TASK-V55F-102: `messaging.ts` —— type-only `ChatRefFact` / `ChatRefTurnPayload`
| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-V55F-101 |
| **执行波次** | W1 |
| **对应 FR** | FR-SGO-010 / 011 |

**描述**: 在 `background/messaging.ts`（type-only 家系先例 = `ChatResultVariant`）**恰一处**声明 `ChatRefFact`（字段集 **7 项**：`refNum` / `refId` / `selector` / `refMark` / `textDigest` / `refState` / `nodeCount?`）与 `ChatRefTurnPayload { refs?: readonly ChatRefFact[] }`。`refState` **只可能是 `'valid'`**。**不新增 kind**、不改消息结构（`PluginMessage` 已有索引签名）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/background/messaging.ts` |

**验收标准**:
- [ ] `ChatRefFact` / `ChatRefTurnPayload` **恰一处**声明；字段集 **7 项**（ADR-SGO-001 §1）
- [ ] `KIND_SET` **40 项逐字**不增；12 kind 契约不动（N-SGO-009）
- [ ] type-only ⇒ **零运行时字节**（`content.js` / `pick-layer.js` 零容差不受影响）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && node -e "const s=require('fs').readFileSync('src/background/messaging.ts','utf8'); if(!/ChatRefFact/.test(s)||!/ChatRefTurnPayload/.test(s)) process.exit(1)"
```

---

### TASK-V55F-103: `l1/ref-scope.ts` —— 引用快照投影 + 形状 + 掩码口径
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55F-101, TASK-V55F-102 |
| **执行波次** | W1 |
| **对应 FR** | FR-SGO-011 / 012 / 018 / 019 |

**描述**: 新建 `l1/ref-scope.ts`（A 列）：`turnRefsOf(records)` **恰一处**——只取 `verdict === 'valid' ∧ !retired`，把 `RefRecord` **投影**为 `ChatRefFact[]`（`refMark = refId` 单点铸造）；导出 `ScopeFacts` / `ScopeTarget` / `ScopeRef` 形状；口径写死（FR-SGO-012）：页面文本（`textDigest` / `selector`）**可**入 LLM 上下文；**凭据形** `textDigest` ⇒ 复用 `maskTextPayload` 掩码；留痕只含字段名。**读数只消费 `refState`，不重判 validity**（R-SGO-901）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l1/ref-scope.ts` |

**验收标准**:
- [ ] `turnRefsOf` **恰一处**；只取 `valid ∧ !retired`；**7 字段**投影；`refMark === refId`
- [ ] 凭据形 `textDigest` **掩码**（EC-SGO-019）；口径注释写死「页面文本可入上下文 / 凭据值不可 / 留痕只含字段名」
- [ ] 不重判 `valid/invalid/unknown`（deny 方向来自 `ref-validity.ts`）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && grep -c "turnRefsOf" src/ui/sidepanel/l1/ref-scope.ts
```

---

### TASK-V55F-104: `sidepanel.ts` `requestTurn` 唯一载荷构建点 + `ref-store.ts` 只读取用
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V55F-101, TASK-V55F-103 |
| **执行波次** | W1 |
| **对应 FR** | FR-SGO-013 / 014 / 015 |

**描述**: 在 `sidepanel.ts` `requestTurn` 内**恰一处**构建 refs 快照（`turnRefsOf(l1?.store().all() ?? [])`），随 `chat` 消息下发；**两条回合入口共用**该构建点（FR-SGO-013/014）；**零引用 ⇒ `refs` 字段缺席**（不是空数组，与现状逐字相同）。`l1/ref-store.ts` 只**改读取用**（活跃有效引用访问器 `verdict === 'valid' ∧ !retired`），**判定语义零改**。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/l1/ref-store.ts` |

**验收标准**:
- [ ] `requestTurn` 内**恰一处**构建 refs；两条入口（composer / `op.turn` 槽）同口径（FR-SGO-013/014）
- [ ] `requestTurn(` 调用点 **仍恰 2**（原判据不改，N-SGO-014）
- [ ] 零引用 ⇒ 字段**缺席**；`ref-store` 判定语义零改（`ref-validity` 方向不动）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && grep -rn "requestTurn(" src/ui/sidepanel/sidepanel.ts | wc -l
```

---

### TASK-V55F-105: `ref-turn.ts` —— 当前回合活跃引用单源
| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-V55F-102 |
| **执行波次** | W1 |
| **对应 FR** | FR-SGO-019 / 038 |

**描述**: 新建 `background/ref-turn.ts`（B 列）：当前回合**活跃引用单源**（holder 一并持有 `refs` + `tabId` + `observe` 缝）；每回合 `set` / `finally` `clear`。SW 的引用唯一来源 = 回合载荷（**零新通道**，FR-SGO-019）；`tabId` 供 `--ref` live 单节点闸同源取用（ADR-SGO-003 §3）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/background/ref-turn.ts` |

**验收标准**:
- [ ] 每回合 `set` / `clear`（`finally`）；**零跨回合漂移**
- [ ] holder 同时持有 `refs` + `tabId` + `observe` 缝；**零新增面板→SW 通道**
- [ ] 零每回合页面探测（NFR-SGO-008 / NG-SGO-013）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && node -e "const s=require('fs').readFileSync('src/background/ref-turn.ts','utf8'); if(!/clear/.test(s)) process.exit(1)"
```

---

### TASK-V55F-106: `ref-context.ts` —— 系统段追加段 + 回合载荷运行时校验
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55F-102 |
| **执行波次** | W1 |
| **对应 FR** | FR-SGO-015 / 016 / 017 |

**描述**: 新建 `background/ref-context.ts`（B 列）：`refContextSegment(refs)` —— **无 refs ⇒ `''`**（⇒ `system === SYSTEM_PROMPT` **逐字**）；有 refs ⇒ `'\n\n' + <引用事实行（refNum / selector / textDigest / refState / refMark）> + <法则引导文本>`。附**回合载荷运行时校验**（形状 / 正整数 `refNum` / 非空 `selector` / `refState === 'valid'`；非法项**逐项剔除**，不静默污染）。**`SYSTEM_PROMPT` 常量逐字保留为基座**。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/background/ref-context.ts` |

**验收标准**:
- [ ] 无 refs ⇒ 返回 `''`；有 refs ⇒ 追加段（事实行 + 引导）（FR-SGO-016）
- [ ] 运行时校验逐项剔除非法项（FR-SGO-015）；`SYSTEM_PROMPT` 基座**逐字**（5 条既有条款不改）
- [ ] 追加段是**引导**，判据**不读**提示词（ADR-SGO-002 §3；FR-SGO-022/023）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && grep -c "refContextSegment" src/background/ref-context.ts
```

---

### TASK-V55F-107: `service-worker.ts` 读 refs + `runChat` 签名 + 系统段工厂 + `turn-queue.refs`
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V55F-104, TASK-V55F-105, TASK-V55F-106 |
| **执行波次** | W1 |
| **对应 FR** | FR-SGO-015 / 016 / 017 |

**描述**: `service-worker.ts` `case 'chat'` 读 `message.refs` → 运行时校验 → `void runChat(s, user, refs)`；`system: () => SYSTEM_PROMPT + refContextSegment(refs)`（`chat-runner.ts` 已支持 `system: string | (() => string)` ⇒ **零改**）；回合开始 `ref-turn.set` / `finally` `clear`。`background/turn-queue.ts`：`QueuedTurn` 增 `refs`（排队回合**自带快照**，drain 出的回合用**入队时**快照，零跨回合漂移）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/background/service-worker.ts` |
| MODIFY | `packages/web-cli-plugin/src/background/turn-queue.ts` |

**验收标准**:
- [ ] `system` 工厂 = `SYSTEM_PROMPT`（基座逐字）+ `refContextSegment(refs)`（FR-SGO-016）
- [ ] 排队回合自带快照；`chat-runner.ts` **零改**；递归 `runChat(s, drained.user, drained.refs)`
- [ ] 零新增主流程调用点（`requestTurn(` 恰 2 / `maybeRecommend` 1/7 / `nextAfterSettle` 1/10）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && grep -c "refContextSegment\|refs" src/background/service-worker.ts
```

---

### TASK-V55F-108: `test/ref-context-in-turn.test.ts` —— 新门禁（载荷形态）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55F-102, TASK-V55F-104, TASK-V55F-106, TASK-V55F-107 |
| **执行波次** | W1 |
| **对应 FR** | FR-SGO-010 / 012 / 013 / 016 / 017 |

**描述**: 新建 **node 门禁** `test/ref-context-in-turn.test.ts`：载荷 type-only 单声明 / 两条入口同构建点 / `KIND_SET` 40 / 系统段基座 5 条逐字 / **零引用 ⇒ `system === 基座`（逐字）** / 凭据形掩码 / 零新通道（SW 引用唯一来源 = 载荷）。每条判据带 `expectFailPattern`。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/ref-context-in-turn.test.ts` |

**验收标准**:
- [ ] `KIND_SET` **40 逐字**；`requestTurn(` 恰 2（FR-SGO-010 / N-SGO-014）
- [ ] 无引用回合 → 系统段 == 基座（**逐字**）、载荷 / 留痕 / 卡面零漂移（FR-SGO-017 / N-SGO-029）
- [ ] 凭据形 `textDigest` 掩码（EC-SGO-019）；每条判据含注入反证（禁恒真）

**验证命令**:
```bash
cd packages/web-cli-plugin && npx tsx --test test/ref-context-in-turn.test.ts
```

**门禁**: `ref-context-in-turn`（node；入 `gate-integrity` 受审集合，见 `128`）

---

### TASK-V55F-109: **SG-SGO-03** —— 法九读数双向反证可机核探针（先验闸门）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55F-103 |
| **执行波次** | W2 |
| **对应 FR** | FR-SGO-070 / 071 / 092 |

**描述**: 只读探针，验证「法九读数**双向反证可机核**」：① **去注入 ⇒ 读数 `no-ref` 必红**可构造（`expectFailPattern` 形态）；② 三段控制 `ok` / `violated` / `n/a` **可达**（不是布尔）；③ **真源切片**（读生产模块 `l1/ref-scope.ts` / `sidepanel.ts`，**不读** `SYSTEM_PROMPT` / 测试自建常量）可得。**探针不入库**。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| SPIKE | `packages/web-cli-plugin/test/_spike/sg-sgo-03-probe.mjs`（探毕删除） |

**验收标准**:
- [ ] 给出「注入点 + 期望 FAIL 模式 + 还原口径」清单（至少两组：`no-ref` 改判 `in-scope` / 删写闸拦截）
- [ ] 三段控制 `ok` / `violated` / `n/a` 逐态可达（N-SGO-024）
- [ ] 结论 ∈ {**可机核** / **不可构造**}；不可构造 ⇒ **暂停上报**（禁以文档 / 提示词 / 恒真断言替代机核，DC-SGO-007）

**验证命令**:
```bash
cd packages/web-cli-plugin && git status --short | grep -c "_spike" || true
```

**结论义务**: 五要素入 build 记录；**结论 = 不可构造** ⇒ `110` / `113` / `114` **不得开工**（`blockers` BLK-SGO-3）。

---

### TASK-V55F-110: `l1/ref-scope.ts` —— `SCOPE_READINGS` 4 值 + `scopeReading` 唯一判定
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55F-109, TASK-V55F-103 |
| **执行波次** | W2 |
| **对应 FR** | FR-SGO-020~024 |

**描述**: 在 `l1/ref-scope.ts` **恰一处**声明 `SCOPE_READINGS`（4 值：`in-scope` / `out-of-scope-authorized` / `out-of-scope-unauthorized` / `no-ref`）+ `scopeReading(facts)` **唯一判定函数**；判定输入**两路**（写目标 = `--ref` 命中 ∨ `selector` 命中）vs **活跃引用集合** + `authorized` 事实。`no-ref` **≠** `in-scope`。**第二声明 ⇒ FAIL**（N-SGO-028）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/l1/ref-scope.ts` |

**验收标准**:
- [ ] 4 值词汇 + 判定函数 **恰一处**；散落零命中（第二声明 ⇒ FAIL）
- [ ] 两路命中（`--ref` / `selector`）；`no-ref` **不**判 `in-scope`
- [ ] `authorized` 只作**输入事实**（叶2 由真实用户点击写入；本叶只交付读数与转值底座）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && grep -rn "SCOPE_READINGS" src | wc -l
```

**门禁**: `law9-scope-reading`

---

### TASK-V55F-111: 越界拦 —— `sidepanel.ts` confirm 面范围闸（fail-closed + 可达 next）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55F-110 |
| **执行波次** | W2 |
| **对应 FR** | FR-SGO-025 / 026 / 027 / 037 |

**描述**: 在 `sidepanel.ts` **confirm 面**落范围闸：`out-of-scope-unauthorized` 的写 **fail-closed 拦下**（deny + 可读理由 + **可达 next**）；预留扩围缝（叶2 二择卡接线）。**判定链零触碰**（`policy.ts` / `auto-authorize.ts` **零 diff**，R-SGO-911 消除）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` |

**验收标准**:
- [ ] 越界未征询写 ⇒ **被拦**（deny）+ 可达 next（FR-SGO-025 / AC-SGO-009）
- [ ] `zeroDiffFiles` 9 项（含 `policy.ts` / `auto-authorize.ts`）哈希 pin 绿（N-SGO-008 / T3）
- [ ] `no-dead-end` 计数**不减**（49 起只增）；零视图切换（NFR-SGO-012）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && npx tsx --test test/insight-no-escalation.test.ts
```

---

### TASK-V55F-112: 留痕单源 + 零值纪律（`SCOPE_TRACE_FIELDS` / `scopeReadingTrace`）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55F-110 |
| **执行波次** | W2 |
| **对应 FR** | FR-SGO-080 / 083 / 084 |

**描述**: 在 `l1/ref-scope.ts` 导出 `SCOPE_TRACE_FIELDS` / `scopeReadingTrace` **单源**（字段名 + 机器枚举：读数词 / actor；**零用户内容值**）；`sidepanel.ts` 落范围**留痕行**（独立成行）。既有驱动者留痕三要素（`driverTraceLine`）**逐字不动**。口径显式登记（R-SGO-917）：「值」= 用户内容值；读数词 / actor / 计数属机器事实，可入留痕。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/l1/ref-scope.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` |

**验收标准**:
- [ ] 留痕行独立成行且含范围读数**字段名**（`scope.reading` / `scope.authorized`；**不含用户内容值**）（FR-SGO-080 / 083）
- [ ] 驱动者留痕三要素**逐字不动**；扩围事实可读（本叶只落读数侧，叶2 落转值）
- [ ] 逐行可机核（扫描断言零值命中）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && grep -rn "scope.reading\|SCOPE_TRACE_FIELDS" src | wc -l
```

---

### TASK-V55F-113: `test/law9-scope-reading.test.ts` —— 法九门禁（node）
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V55F-110, TASK-V55F-111 |
| **执行波次** | W2 |
| **对应 FR** | FR-SGO-070~077 |

**描述**: 新建 **node 门禁** `test/law9-scope-reading.test.ts`（对齐 `law7x-ext.test.ts` 形态）：`L9-1-four-values` / `L9-2-no-ref` / `L9-3-in-scope`（两路）/ `L9-4-unauthorized` / `L9-5-authorized` / `L9-6-write-gate`（生产写闸切片）/ `L9-7-not-tautology`（三段控制 `ok`/`violated`/`n/a`）/ `L9-8-source-slice`（真源切片）。**判据不读** `SYSTEM_PROMPT`；**不新增 Chromium 门禁文件**（`CHROMIUM_GATES === 9` 不动）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/law9-scope-reading.test.ts` |

**验收标准**:
- [ ] `L9-1~L9-8` 逐条判据齐备（ADR-SGO-002 §7）；每条带 `expectFailPattern`
- [ ] 三段控制返回 `'ok' | 'violated' | 'n/a'`（**非布尔**），`n/a` 单独计数（N-SGO-024 / 禁恒真）
- [ ] 真源切片读生产模块（`ref-scope.ts` / `sidepanel.ts` / `ref-context.ts`），**不读**测试自建常量 / `dist` 副本

**验证命令**:
```bash
cd packages/web-cli-plugin && npx tsx --test test/law9-scope-reading.test.ts
```

**门禁**: `law9-scope-reading`（node）

---

### TASK-V55F-114: 法九双向反证族（去注入 `no-ref` 必红 + 逐字节还原）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55F-113 |
| **执行波次** | W2 |
| **对应 FR** | FR-SGO-071 / 092 / 111 |

**描述**: 在法九门禁内落**双向反证族**（至少两组）：① 把 `no-ref` 分支**改判 `in-scope`** ⇒ 实跑 **FAIL**；② 删除写闸的越界拦截 ⇒ **FAIL**。每轮：注入 ⇒ FAIL（声明 `expectFailPattern`）⇒ **逐字节还原（sha256 前后相同）** ⇒ PASS。**禁**「删属性充数 / 自我裁决 / 换口径放松」。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/law9-scope-reading.test.ts` |

**验收标准**:
- [ ] 至少两组反证**实跑**记录（注入点 + FAIL 证据 + 还原 sha256）（FR-SGO-111 / AC-SGO-018）
- [ ] 反证**恒绿检测**：注入后仍 PASS ⇒ 视为缺陷（停机规则 7）
- [ ] 三段控制 `violated` 态由注入触发；`n/a` 态由中性输入触发

**验证命令**:
```bash
cd packages/web-cli-plugin && npx tsx --test test/law9-scope-reading.test.ts && sha256sum src/ui/sidepanel/l1/ref-scope.ts
```

---

### TASK-V55F-115: X-SGO-5 等价重锚（读数「作为范围锚」双向反证；deny 方向逐字不动）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55F-110, TASK-V55F-111 |
| **执行波次** | W2 |
| **对应 FR** | FR-SGO-100 / 104 |

**描述**: X-SGO-5 等价重锚：`valid/invalid/unknown` 的 **deny 方向逐字不动**（3 结果 / 6 维度 fail-closed 语义保留），**只增**「作为范围锚」的解析读数断言。扩 `test/ui/l1.mjs` / `test/ui/page-input.mjs` / `test/l1-ref-validity.test.ts` —— **只增不减**，旧计数断言保留为新语义的一部分。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/ui/l1.mjs` |
| MODIFY | `packages/web-cli-plugin/test/ui/page-input.mjs` |
| MODIFY | `packages/web-cli-plugin/test/l1-ref-validity.test.ts` |

**验收标准**:
- [ ] `deny` 方向**逐字不动**（`ref-validity` 3 结果语义不变）（NFR-SGO-006）
- [ ] 新增范围锚读数**双向反证**（旧断言保留）
- [ ] 计数只增不减（`l1` ≥120 / `page-input` ≥118）；改写 ≠ 删除

**验证命令**:
```bash
cd packages/web-cli-plugin && npx tsx --test test/l1-ref-validity.test.ts
```

**门禁**: `l1-ref-validity`

---

### TASK-V55F-116: **SG-SGO-02** —— plugin 包装 base 零 diff + live 闸复用可行性探针（先验闸门）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55F-105, TASK-V55F-110 |
| **执行波次** | W3 |
| **对应 FR** | FR-SGO-031 / 033 / 037 |

**描述**: 只读探针，验证 `--ref` 锚定链的**两条结构性假设**：① **plugin 侧条目包装**（`wrapDomEntryForAnchor`）可达且 `packages/web-cli-base/**` **零 diff**（`insight-no-escalation:147` 绿）；② `observeIdentity` 可从 `service-worker.ts` 私有函数**抽为单一实现**（`ref-observe.ts`），被 `service-worker` 与 `tools/dom-anchor` **同源 import**，支撑 **live 单节点闸**（`nodeCount === 1` 唯一通过）。**探针不入库**。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| SPIKE | `packages/web-cli-plugin/test/_spike/sg-sgo-02-probe.mjs`（探毕删除） |

**验收标准**:
- [ ] 给出「条目包装接线点 + base 零 diff 证据 + `observeIdentity` 抽取清单」三要素
- [ ] 结论 ∈ {**可行** / **不可行**}；不可行 ⇒ **暂停上报**（**禁**改 `packages/web-cli-base/**` / **禁**放宽 `risk`）
- [ ] 探针产物不进入提交

**验证命令**:
```bash
cd packages/web-cli-plugin && git status --short | grep -c "_spike" || true
```

**结论义务**: 五要素入 build 记录；**结论 = 不可行** ⇒ `117` / `118` / `119` / `121` **不得开工**（`blockers` BLK-SGO-2）。

---

### TASK-V55F-117: `ref-observe.ts` —— `observeIdentity` 抽为单一实现
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55F-116 |
| **执行波次** | W3 |
| **对应 FR** | FR-SGO-033 |

**描述**: 把 `service-worker.ts:1114` 的模块私有 `observeIdentity` **抽为单一实现** = NEW `background/ref-observe.ts` 导出 `observeIdentity(tabId, selector)`；`service-worker.ts` 与 `tools/dom-anchor.ts` **同源 import**（**禁第二份副本**）。闸是**只读**观测（`querySelectorAll` / `getAttribute` / `textContent`，**零 DOM 写**）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/background/ref-observe.ts` |
| MODIFY | `packages/web-cli-plugin/src/background/service-worker.ts` |

**验收标准**:
- [ ] `observeIdentity` **恰一处**实现；两处同源 import（第二副本 ⇒ FAIL）
- [ ] 只读观测零 DOM 写；`nodeCount === 1` 为**唯一通过条件**（FR-SGO-033 / AC-SGO-022）
- [ ] 口径显式登记：每写一次的只读身份观测 **≠** 每回合重观测（R-SGO-913）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && grep -rn "function observeIdentity\|export function observeIdentity" src | wc -l
```

---

### TASK-V55F-118: `src/tools/dom-anchor.ts` —— `wrapDomEntryForAnchor`
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55F-116, TASK-V55F-117 |
| **执行波次** | W3 |
| **对应 FR** | FR-SGO-030 / 031 / 032 |

**描述**: NEW `src/tools/dom-anchor.ts`（B 列）：`wrapDomEntryForAnchor(entry, env)` —— **schema 覆写**（增 `ref` 参数，`ref` 仅 `set-text` 生效）+ **executor 替换**（解析 `--ref` → 交**基线 `baseExecutor`**）；`risk` / `subcommandRisks` **逐字段 spread 自 base，永不放宽**。**零新子命令**（`--ref` 是参数，不是子命令）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/tools/dom-anchor.ts` |

**验收标准**:
- [ ] schema 覆写仅增 `ref`；**零新子命令**（`SUBCOMMANDS` 不动）（FR-SGO-030）
- [ ] 解析后**仍交基线 `baseExecutor`**；`risk` / `subcommandRisks` **逐字段对照 base 一致**（FR-SGO-032 / N-SGO-027）
- [ ] base 零 diff（`packages/web-cli-base/**` 零改动）（FR-SGO-031）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && node -e "const s=require('fs').readFileSync('src/tools/dom-anchor.ts','utf8'); if(!/wrapDomEntryForAnchor/.test(s)) process.exit(1)"
```

**门禁**: `dom-ref-anchor`

---

### TASK-V55F-119: `browser-tools.ts` —— `dom` 条目接线包装层
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55F-118 |
| **执行波次** | W3 |
| **对应 FR** | FR-SGO-031 / 037 |

**描述**: `browser-tools.ts:67` 接线：`entries.push(wrapDomEntryForAnchor(createDomToolEntry(env), env))`（**替换**裸 `createDomToolEntry`）。**不触达**判定链（`policy.ts` / `auto-authorize.ts`）⇒ `zeroDiffFiles` 9 项哈希 pin 绿。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/tools/browser-tools.ts` |

**验收标准**:
- [ ] 接线为包装层（`wrapDomEntryForAnchor(...)`），裸条目不再直接 push
- [ ] `insight-no-escalation` 绿（`gitDiffStatus(['../web-cli-base']) === 0`）（N-SGO-007）
- [ ] `zeroDiffFiles` 9 项零触碰（N-SGO-008 / T3）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && npx tsx --test test/insight-no-escalation.test.ts
```

**门禁**: `insight-no-escalation`

---

### TASK-V55F-120: 失配 EC 家族 + 失效可判（解析链逐级 fail-closed 非静默）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55F-118 |
| **执行波次** | W3 |
| **对应 FR** | FR-SGO-033 / 034 / 035 / 036 / 038 |

**描述**: 在 `dom-anchor.ts` 落**解析链逐级**（ADR-SGO-003 §2）：`--ref` 仅 `set-text` / 与 `--selector` 互斥 / 正整数字法 / 查当前回合快照 / `refState === 'valid'` / 合成 `[data-wcli-ref="ref_n"]` / live 单节点闸 / 交基线 executor。EC-SGO-001（0 命中）/ 002（多命中）/ 003（标记缺失）/ 004（失效）/ 015（同给）/ 016（越界）/ 017（读命令）**逐条非静默**。**绝不**回退 `--selector` / **绝不**按首元素。失效可判复用 R6 只读观测面，**不新增每回合探测**。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/tools/dom-anchor.ts` |

**验收标准**:
- [ ] EC-SGO-001/002/003/004/015/016/017 逐条**非静默**（可读错误 + 指引）（FR-SGO-034 / AC-SGO-007）
- [ ] 多命中**不按首元素**（区别于 base EC-002 语义）；0 命中**不回退** `--selector`
- [ ] 失效可判（FR-SGO-038）；**不新增每回合重观测**（NFR-SGO-008 / NG-SGO-013）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && grep -c "EC-SGO-\|引用锚定失败\|引用序号" src/tools/dom-anchor.ts
```

**门禁**: `dom-ref-anchor`

---

### TASK-V55F-121: `test/dom-ref-anchor.test.ts` —— 新门禁（含 risk 不放宽注入必红）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55F-118, TASK-V55F-119, TASK-V55F-120 |
| **执行波次** | W3 |
| **对应 FR** | FR-SGO-030~037 |

**描述**: 新建 **node 门禁** `test/dom-ref-anchor.test.ts`：词法 / 互斥 / 序号越界 / **单节点闸（0 / 多命中）** / 标记缺失 / 非 `set-text` 传 `--ref` / 与 `--selector` 同给 / **`risk` 降档注入 ⇒ 必红**（逐字段对照 `risk` 与 `subcommandRisks` 与 base 一致）/ 反证逐字节还原。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/dom-ref-anchor.test.ts` |

**验收标准**:
- [ ] 七类失配逐一判据 + 反证（FR-SGO-033~036）
- [ ] **`risk` 不放宽注入 ⇒ 必红**（FR-SGO-032 / R-SGO-904）；`nodeCount === 1` 唯一通过（AC-SGO-022）
- [ ] 逐字段对照 base；反证还原（sha256 前后相同）

**验证命令**:
```bash
cd packages/web-cli-plugin && npx tsx --test test/dom-ref-anchor.test.ts
```

**门禁**: `dom-ref-anchor`（node）

---

### TASK-V55F-122: S0′ 样本单源扩展 —— `test/ui/fixtures/s0-chain.mjs`
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V55F-108, TASK-V55F-115, TASK-V55F-121 |
| **执行波次** | W4 |
| **对应 FR** | FR-SGO-090 |

**描述**: **扩展** `test/ui/fixtures/s0-chain.mjs`（node 面与 Chromium 面**共用同一份**，**禁第二份样本**）：新增 S0′ 范围内核拍 —— `ref-in-turn`（载荷含引用事实）/ `scope-inject`（系统段 = 基座 + 追加段）/ `read-in-scope`（读数 = `in-scope`）/ `write-1`（`[data-wcli-ref="ref_1"]`；**改写处数 = 1**）/ `no-injection`（**反证拍**：去注入 ⇒ 读数 = `no-ref`）。既有 `S0_CHAIN` 10 环节**逐字保留**（只增不减）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/ui/fixtures/s0-chain.mjs` |

**验收标准**:
- [ ] 新增 5 拍（含反证拍 `no-injection`）；既有 `S0_CHAIN` 10 环节**逐字保留**（ADR-SGO-006 §1）
- [ ] **样本单源**：node + Chromium 共用同一份（**无第二份样本**）
- [ ] 纯数据 + 注入式依赖（与 `s2-chain.mjs` 同形）

**验证命令**:
```bash
cd packages/web-cli-plugin && node -e "import('./test/ui/fixtures/s0-chain.mjs').then(m=>{if(!m.S0_CHAIN)process.exit(1);console.log(Object.keys(m).length)})"
```

---

### TASK-V55F-123: S0′ node 面 —— `test/s0-self-driven-chain.test.ts`（S0P-1~8）
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V55F-122 |
| **执行波次** | W4 |
| **对应 FR** | FR-SGO-090 / 091 / 092 |

**描述**: 扩展 `test/s0-self-driven-chain.test.ts`（node 面）：`S0P-1-refs-in-turn` / `S0P-2-system-append`（零引用 ⇒ `system === 基座` 逐字）/ `S0P-3-read-in-scope` / **`S0P-4-writes-le-refs`（改写处数 ≤ 引用数）** / `S0P-5-authorized-branch` / `S0P-6-trace` / **`S0P-7-bidirectional`（去注入 ⇒ `no-ref` 必红 + 逐字节还原）** / `S0P-8-honest-report`（清单条数 == 实际改写处数）。真源切片读生产模块。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/s0-self-driven-chain.test.ts` |

**验收标准**:
- [ ] `S0P-1~S0P-8` 逐条判据（含 **`S0P-4` 改写处数 ≤ 引用数** / `S0P-7` 双向反证 / `S0P-8` 如实交代）（FR-SGO-091/092 / AC-SGO-013/014）
- [ ] 既有 S0 环节断言**逐字保留**（只增不减）；每条带 `expectFailPattern`
- [ ] 真源切片读生产模块（**不**用假 provider 跳过真实读数 / 包装，R-SGO-909）

**验证命令**:
```bash
cd packages/web-cli-plugin && npx tsx --test test/s0-self-driven-chain.test.ts
```

**门禁**: `s0-self-driven-chain`

---

### TASK-V55F-124: S0′ Chromium 面 —— `test/ui/s0-self-driven.mjs`（只加断言不加文件）
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V55F-123 |
| **执行波次** | W4 |
| **对应 FR** | FR-SGO-090 / 094 |

**描述**: 扩展 `test/ui/s0-self-driven.mjs`（Chromium 面，**真面板**）：绑定 → 拾取引用 → 作答 → 自动成回合 → 断言回合载荷含引用事实 / 系统段追加段在位 / **恰 1 处** `dom set-text` 命中 `[data-wcli-ref="ref_1"]` / 留痕行含范围字段名。**只加断言不加文件**（`CHROMIUM_GATES === 9` 逐字不动）。人工面 **M1 / M4** 标 `⏳ 未执行`。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/ui/s0-self-driven.mjs` |

**验收标准**:
- [ ] 真面板驱动：恰 1 处命中 `[data-wcli-ref="ref_1"]`；留痕含范围字段名（ADR-SGO-006 §3）
- [ ] **只加断言不加文件**；`CHROMIUM_GATES === 9`（N-SGO-017）；`s0-self-driven` 计数 ≥59 只增
- [ ] 人工面 M1（「原地」语义遵从观感）/ M4（SPA 锚定失败提示可理解度）逐项 `⏳ 未执行`，**不冒充 PASS**（AC-SGO-026）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run build && npm run test:ui -- --grep s0-self-driven
```

**门禁**: `s0-self-driven`（Chromium；计数只增）

---

### TASK-V55F-125: X-SGO-1/2/3 台账 + X-SGO-7「未发生取代」登记 + `op-wiring` 复合读数
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55F-113, TASK-V55F-114, TASK-V55F-121 |
| **执行波次** | W4 |
| **对应 FR** | FR-SGO-100 / 101 / 102 / 106 / 107 / 112 |

**描述**: `docs/v4-supersession-ledger.json` 落 X-SGO-1（载荷携带引用上下文）/ X-SGO-2（基座 + 追加段）/ X-SGO-3（plugin 侧包装）条目 + `modifiedRanges[]`；**X-SGO-7 = 未发生取代**如实登记（主流程 diff = 0）；`test/supersession-ledger.test.ts` 一致性门禁；`test/op-wiring.test.ts` **原判据不改**（`requestTurn(` 恰 2）+ 增「主流程 diff = 0」**复合读数**（`maybeRecommend` 1/7 · `nextAfterSettle` 1/10）。**台账与判据重锚同轮完成**（FR-SGO-107 / 112）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` |
| MODIFY | `packages/web-cli-plugin/test/supersession-ledger.test.ts` |
| MODIFY | `packages/web-cli-plugin/test/op-wiring.test.ts` |

**验收标准**:
- [ ] X-SGO-1/2/3 条目 + `modifiedRanges[]`；**X-SGO-7 未发生取代**显式登记（不制造假条目）（FR-SGO-107）
- [ ] `op-wiring` **原判据不改**（`requestTurn(` 恰 2）+ 复合读数不增（N-SGO-014）
- [ ] 台账与重锚**同轮**；`status ↔ knownGap` 一致性（本叶登记「未发生取代」）

**验证命令**:
```bash
cd packages/web-cli-plugin && npx tsx --test test/supersession-ledger.test.ts test/op-wiring.test.ts
```

**门禁**: `supersession` / `op-wiring`

---

### TASK-V55F-126: 红线巡检 —— base 零 diff + 三冻结面 + 判定链 / 不动面
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55F-119 |
| **执行波次** | W4 |
| **对应 FR** | FR-SGO-123 / 037 / 005 |

**描述**: 在 `test/insight-no-escalation.test.ts`（**只增巡检断言，原判据不改**）与构建后 `stat` / sha256 双锚落**红线巡检**：`packages/web-cli-base/**` 零 diff；`dist/content.js` **177,076 B** / `52a82620…`；`dist/pick-layer.js` **34,358 B** / `77796bab…`；`KIND_SET` **40 逐字**；`manifest.json` 零 diff；`zeroDiffFiles` 9 项哈希 pin 绿。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/insight-no-escalation.test.ts` |

**验收标准**:
- [ ] `content.js` **177,076 B** / `52a82620…`；`pick-layer.js` **34,358 B** / `77796bab…`（**零容差**）（N-SGO-001/002 / AC-SGO-023）
- [ ] `KIND_SET` **40 逐字**（N-SGO-009）；`manifest.json` 零 diff（T4）；base 零 diff（N-SGO-007）
- [ ] `zeroDiffFiles` 9 项（含 `policy.ts` / `auto-authorize.ts`）哈希 pin 绿（N-SGO-008）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run build && node -e "const fs=require('fs');const c=fs.readFileSync('dist/content.js');console.log(c.length)" && git diff --stat ../web-cli-base | wc -l
```

**门禁**: `insight-no-escalation`

---

### TASK-V55F-127: 法八四面只增（引用注入零明文 + 凭据掩码）+ 留痕零值扫描
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55F-108, TASK-V55F-112 |
| **执行波次** | W4 |
| **对应 FR** | FR-SGO-046 / 050 / 083 |

**描述**: `test/ui/law8-plaintext.mjs` **只增**：引用注入路径四**面**（①流内 payload ②digest ③审计面 ④DOM value 与全部属性）**零明文**；凭据形 `textDigest` **掩码**；留痕**只含字段名**。**36 断言零降级**。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/ui/law8-plaintext.mjs` |

**验收标准**:
- [ ] 36 断言**零降级**且必绿（NFR-SGO-004 / NG-SGO-006）；计数只增
- [ ] 引用注入四面零明文；凭据形值掩码（EC-SGO-019）
- [ ] 留痕 **零用户内容值** 扫描零命中（N-SGO-011）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run build && npm run test:ui -- --grep law8-plaintext
```

**门禁**: `test:law8`（计数只增；36 不降级）

---

### TASK-V55F-128: 门禁治理收口（`gate-integrity` 受审集合下界只增 + 断言只增对账）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55F-108, TASK-V55F-113, TASK-V55F-121, TASK-V55F-122, TASK-V55F-123, TASK-V55F-124 |

**描述**: `test/gate-integrity.test.ts` 追加本叶 node 门禁**下界**（`V55F_NODE_GATE_FILES` = `ref-context-in-turn` / `law9-scope-reading` / `dom-ref-anchor`，下界 **≥3**，**只增不减**）；`CHROMIUM_GATES === 9` 逐字不动；断言零删除零降级对账；门禁串行 + `KL-N-10` 隔离复跑 ≥2。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/gate-integrity.test.ts` |

**验收标准**:
- [ ] `V55F_NODE_GATE_FILES` 下界 **≥3**（只增）；3 枚新门禁逐项在受审集合内（FR-SGO-077 / 115）
- [ ] `CHROMIUM_GATES === 9` 逐字不动（N-SGO-017）；既有下界（`V5_*` / `V551_*` / `V552_*` / `V553_*`）逐字保留
- [ ] 断言零删除零降级（唯一例外 = 保护段显式取代 + 留痕）（N-SGO-015）；计数对账无减少项（AC-SGO-017）

**验证命令**:
```bash
cd packages/web-cli-plugin && npx tsx --test test/gate-integrity.test.ts
```

**门禁**: `gate-integrity`（node 下界只增；`CHROMIUM_GATES === 9`）

---

### TASK-V55F-129: 体积逐叶重登记 + 本叶收口（五要素 + 三值 + EC-SGO-022 二态）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55F-125, TASK-V55F-126, TASK-V55F-127, TASK-V55F-128 |
| **执行波次** | W4（收口轮） |
| **对应 FR** | FR-SGO-120~125 |

**描述**: 本叶**即测即登记**（不等两叶合计）：`test/size-baseline.ts` / `test/size-budget.test.ts` / `test/size-growth-evidence.test.ts` / `test/size-ruling-vol3.test.ts` 落 **A 列本叶实测净增**（预算 **6.0~9.0 KB**，上界 **10.35 KB**）+ **五要素**（前后值 / 日期 / 来源 / 理由 / 历史保留）+ **V3-VOL-3 三值同源前移** + **metafile 逐模块归因**（Σ 逐模块 Δ + 未归因 == 登记增量）；时间线**只追加**。**越生效上限 / 越档位二态显式**（EC-SGO-022）；`authorConfirmation` 保持 `pending-author-line`（**不得伪称已确认**，N-SGO-023）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/size-baseline.ts` |
| MODIFY | `packages/web-cli-plugin/test/size-budget.test.ts` |
| MODIFY | `packages/web-cli-plugin/test/size-growth-evidence.test.ts` |
| MODIFY | `packages/web-cli-plugin/test/size-ruling-vol3.test.ts` |

**验收标准**:
- [ ] A 列本叶实测净增登记 + 五要素齐备 + 时间线只追加（FR-SGO-125）
- [ ] V3-VOL-3 三值同源前移（档位 614,400 / 绝对 675,840 / `newBaselineBytes`）；`cap` 保持 `record-only`（N-SGO-003/004）
- [ ] 越生效上限 / 越档位**二态显式**（禁预填；越档位走 EC-SGO-022 + 作者一行）；`authorConfirmation = pending-author-line`
- [ ] 本叶全门禁（含 3 新 node 门禁）串行全绿 + 本叶收口

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run build && npx tsx --test test/size-ruling-vol3.test.ts test/size-budget.test.ts test/size-growth-evidence.test.ts
```

**门禁**: `test:size-ruling-vol3` / `size-*`

---

## 3. 任务汇总

| 统计项 | 数值 |
|--------|:--:|
| 总任务数 | **29** |
| S 级（简单） | **2**（`102` / `105`） |
| M 级（中等） | **21** |
| L 级（复杂） | **6**（`104` / `107` / `113` / `122` / `123` / `124`） |
| 执行波次 | **4**（W1~W4） |
| spikeGate | **3**（SG-SGO-01 / 02 / 03） |
| 新增 node 门禁 | **3**（`ref-context-in-turn` / `law9-scope-reading` / `dom-ref-anchor`） |

## 4. 执行策略

| 波次 | 任务 | 策略 |
|:--:|------|------|
| **W1** | `101`–`108` | `101` 先验闸门在**最前**；`102` 起为**降级串行**（`102 → 103 → 104 → 106 → 107 → 108`），`105` 可与 `104` 并行（文件不相交） |
| **W2** | `109`–`115` | `109` 先验闸门在最前；`110 → 111 → 113 → 114` 为**主链**；`112` 与 `111` 文件部分重合 → **串行**；`115` 文件不相交，可与 `112` 并行 |
| **W3** | `116`–`121` | `116` 先验闸门在最前；`117 → 118 → 119 → 120 → 121` **严格串行**（`dom-anchor.ts` 与 `service-worker.ts` 共享） |
| **W4** | `122`–`129` | `122 → 123 → 124` 严格串行（样本单源）；`125` / `126` / `127` 文件不相交可并行准备；`128` 须后于全部新门禁；`129` **末位收口**（须后于 `125~128`） |

**提交区间（interval）**：`A` = W1 / `B` = W2 / `C` = W3 / `D` = W4（**收口轮**，含体积登记 + 台账 + 门禁治理）。

**可并行组**：
- `P1`：`104` ∥ `105`（`sidepanel.ts`+`ref-store.ts` 与 `ref-turn.ts` 不相交）
- `P2`：`112` ∥ `115`（`ref-scope`/`sidepanel` 与 `l1.mjs`/`page-input.mjs`/`l1-ref-validity` 不相交）
- `P3`：`125` ∥ `126` ∥ `127`（`docs/*.json` + `supersession`/`op-wiring` 与 `insight-no-escalation` 与 `law8-plaintext.mjs` 不相交）

**硬串行保留**：门禁严格串行（一次一个 Chromium，绝不并发）；`test` / `test:ui` / `test:binding` 绝不并发（N-SGO-017）。

## 5. 本叶验收门禁清单（收口轮 `129`）

`typecheck` · `build` · `npm test ≥1330` · **`ref-context-in-turn`（新）** · **`law9-scope-reading`（新）** · **`dom-ref-anchor`（新）** · `op-wiring`（`requestTurn(` 仍恰 2 + 复合读数）· `insight-no-escalation`（base 零 diff）· `test:supersession ≥37` · `test:gate-integrity ≥19`（`CHROMIUM_GATES === 9`）· `test:law8 ≥36`（零降级）· `test:dead-end ≥49` · `l1-ref-validity`（deny 方向不动）· `test:l1 ≥120` · `test:page-input ≥118` · `s0-self-driven ≥59` · `s0-self-driven-chain` · `test:journey ≥171`（保段优先）· `test:binding ≥192`（保段）· `test:l0 ≥248` / `test:density ≥242` · `size-*` + `test:size-ruling-vol3 ≥12` · `content.test.ts`

> **保护段**（N-SGO-016 / 共享面）：journey `43054..58287` / `cc79f413…` 与 binding `107780..115930` / `be9ad0e9…` **保段优先**（段内零字节）；若须取代 ⇒ 走八步 + `modifiedRanges[]` + `redlineRemap[]` + 计数守恒。**本叶登记**：保段 or 取代**二态显式**（禁预填）。

## 6. 体积预算（本叶）

| 项 | 预算 | 上界（+15%） | 对照依据 |
|---|--:|--:|---|
| **A 列**（`sidepanel.js` 净增） | **6.0~9.0 KB** | 6.9~10.35 KB | R6 快修轮（6 文件）**+5,199 B**；本叶 1 新模块（`ref-scope.ts`）+ 4 改动 |
| **B 列**（`background.js`，**不计账**） | 5.0~8.0 KB | — | 系统段组装（`ref-context.ts`）/ `--ref` 包装（`src/tools/**`）/ 载荷校验 / `ref-turn` / `ref-observe` / `turn-queue` **优先落 SW 侧** |

**B 列优先落点（FR-SGO-121）**：`ref-context.ts` / `ref-turn.ts` / `ref-observe.ts` / `service-worker.ts` / `turn-queue.ts` / `messaging.ts`（type-only）/ `src/tools/dom-anchor.ts` / `src/tools/browser-tools.ts` —— **全部不计入 sidepanel 账本**。**A 列**仅 `l1/ref-scope.ts` / `l1/ref-store.ts` / `sidepanel.ts`（载荷构建 + 范围闸 + 留痕）。

**逐叶收口重登记**：`TASK-V55F-129`（五要素 + V3-VOL-3 三值 + metafile 归因；时间线只追加）。

**越限 EC-SGO-022 任务化**：越**生效上限**（607,554）⇒ 显式重登记基线（同源前移，仍不跨档位）；越**档位**（614,400）⇒ 走 EC 显式升档路径 + **作者一行**；越**绝对上限**（675,840）⇒ 停止并请示。`authorConfirmation = pending-author-line`，**不得伪称已确认**。**本叶不触发**（父 `plan.md §7.4`）。

**减体积优先级**：① 纯记账 / 判定逻辑下移 `background.js`（不计账）；② 元组化声明数据；③ 复用既有文案；④ 复用既有渲染面；⑤ **显式登记**未落地项（**绝不以删判据 / 放宽容差 / 静默降档实现**）。

## 7. review / validate 策略（build 前已设计）

| 阶段 | 前置判据（build 前钉死） |
|---|---|
| **review** | ① **禁恒真**：法九每条判据可注入违反面 + 三段控制（`ok`/`violated`/`n/a`）；② **禁纸面**：读数单源（第二声明 ⇒ FAIL）+ 载荷唯一构建点；③ **禁假绿**：S0′ 走生产模块真源切片（不用假 provider）；④ **禁放宽**：`risk` 逐字段对照 base + 注入必红；⑤ 反证完整性（每组注入点 + 还原 sha256） |
| **validate** | EXIST（无 TODO / 桩）· SUBSTANCE（非空实现 + 关键路径覆盖）· ANTI-PATTERN（反证恒绿检测）· WIRING（无孤岛 + 门禁受审集合 + 计数只增）· DRIFT（契约漂移：读数 4 值 ↔ 判定函数、`ChatRefFact` 7 字段 ↔ 门禁、保护段 pin） |

**二维时序**：`W1`(口径/载荷) → `W2`(读数/法九/越界拦) → `W3`(锚定/失配) → `W4`(S0′/台账/门禁/体积) —— review 在 `W4` 收口前（判据真空 + 注入反证完整性审查）；validate 在 `W4` 收口（S0′ 双面实跑 + 门禁守恒对账 + 保护段 + 漂移检测）。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V5.5F-1 范围底座叶任务：**29 任务 / 4 波**（`TASK-V55F-101~129`；S×2 / M×21 / L×6）；3 个 spikeGate（SG-SGO-01/02/03，plan 未命名、按编排器任务书登记为 tasks 阶段新增先验闸门）；3 个新 node 门禁（`ref-context-in-turn` / `law9-scope-reading` / `dom-ref-anchor`）；S0′ 双面落 W4（样本单源 `122` + node `123`（S0P-1~8）+ Chromium `124`）；体积逐叶重登记 `129`（A 列 6.0~9.0 KB + 五要素 + EC-SGO-022 二态）。**本轮只做 tasks**：零 `src`/`test`/`dist`/`docs`/`design`/ROADMAP 改动；未跑门禁 / 构建 / Chromium | 2026-09-24 | SDDU Tasks Agent |
