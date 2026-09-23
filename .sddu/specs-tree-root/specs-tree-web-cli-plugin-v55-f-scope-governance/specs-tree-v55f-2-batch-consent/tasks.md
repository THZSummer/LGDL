# 任务分解：specs-tree-v55f-2-batch-consent（V5.5F-2 任务级批量授权）

> **文档定位**: SDDU 任务清单（**叶级切片 / 末叶**）— 将本叶 `plan.md` v1.0（父 `../plan.md` + `ADR-SGO-004~008` 在本叶的承载条文）分解为**原子任务**，作为本叶 build / review / validate 的输入
> **前置依赖**: **叶1** `../specs-tree-v55f-1-ref-context-and-anchor/`（**硬依赖**：范围读数 + 锚定解析；须 `validated`）+ 本目录 `plan.md` v1.0 + `spec.md` v1.0（承载父 FR ≈21 条切片）+ 父 `../plan.md`（跨切契约 / 红线 / 体积分列预算 / 7 波骨架）+ 父 `../spec.md` v1.0（**88 FR / 14 NFR / 22 EC / 26 AC / 22 NG / §12 X-SGO-1~7 / §13 N-SGO-001~030 / §9.5 门禁基线**）+ `../ADR-SGO-004~008-*.md`
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-24
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-09-24
> **更新说明**: 初始创建（V5.5F-2 批量授权叶任务：**16 任务 / 3 波**（`TASK-V55F-201~216`；S×1 / M×13 / L×2）；**边界先行**（W1 注入反证先落）；1 个新 node 门禁（`batch-consent`）；S0′ 批量段落 W3；体积逐叶重登记在 W3 收口轮）

---

## 0. 结构登记（**末叶 / 批量授权叶**）

| 项 | 内容 |
|---|---|
| 叶定位 | **末叶**（父 `spec.md §14.1`）：`leaf:true` / `depth:2` / `deliveryOrder: 2` / `dependsOn: [specs-tree-v55f-1-ref-context-and-anchor]`；承载**唯一红线级风险** R-SGO-001 |
| **硬依赖** | 叶1 **须 `validated`**：范围读数（`in-scope` / `out-of-scope-*`）与锚定解析（`[data-wcli-ref="ref_n"]`）是「计划内 / 计划外」的**唯一判据**；叶1 未落地 ⇒ 本叶**不得启动**（叶间**串行**，R-SGO-920） |
| 承载父 FR | **≈21 条**（BATCH 040~050 / WIDEN 060~063 / TRACE 081·082 / S0′ 093 / SUPERSEDE 103·105·107） |
| 波数 | **3 波**（叶内 `W1~W3`；父 `plan.md §7.3` 骨架 = 3） |
| 编号空间 | `TASK-V55F-201~216`；与 `TASK-V55F-1xx`（叶1）/ `TASK-V55-*` / `TASK-V45-*` / `TASK-V5-*` / `TASK-0xx~8xx` **零冲突** |
| 模板偏差登记 | agent 模板 §5.4 / §8 建议 5~15 任务；本叶 **16**（S×1 / M×13 / L×2），略超上界 1 条。理由：① 父 `plan.md §7.3` 估 ~16；② 与 v5.5-2（16）**同量级同口径**；③ 过并破坏「每任务独立可验证」；④ 16 = 可原子执行单元 |
| 执行序纪律 | **边界先行：注入反证先落**（先证明「不许」，再放开批量，DC-SGO-005 / 叶 `spec.md §8.4`） |

### 0.1 S0′ 批量段编号裁决（**偏差显式登记**）

叶 `plan.md §2.4` 记「S0′-7/8 批量分支」，而 `ADR-SGO-006 §2` 把 `S0P-7`（双向反证）/ `S0P-8`（如实交代）用于 **node 面**。本 tasks **显式裁决**：

| 编号 | 归属 | 内容 |
|---|---|---|
| `S0P-1~S0P-8` | **叶1**（node 面，`TASK-V55F-123`） | 范围内核 + 双向反证（`S0P-7`）+ 如实交代（`S0P-8`） |
| `S0P-B1~S0P-B3` | **叶2**（Chromium 面，`TASK-V55F-214`） | 一次手势覆盖计划内全部 / 计划外回落 / 二择 + 中止可判 |

→ 冲突**显式登记**，不制造假条目、不改写 ADR。

---

## 1. 依赖拓扑总览

```
W1 ── 边界先行（interval A；201 ∥ 202 ∥ 203 → 204 → 205）
  TASK-V55F-201 [M] RL-06 扩批量变体（AI 代答计划注入 ⇒ 必红）
  TASK-V55F-202 [M] OT-⑩ 扩批量变体（tierOf 逐 op 不变）
  TASK-V55F-203 [M] 特权 op 不入批机核 + 「SW 永不 .request(」判据
  TASK-V55F-204 [S] 载体零新增（计划经 type-only 字段 + 复用既有 auth kind）
  TASK-V55F-205 [M] test/batch-consent.test.ts 新门禁骨架（BC-1~BC-7）

W2 ── 计划与指纹 + 准入/回落 + 零明文 + 中止（interval B）
  TASK-V55F-206 [M] batch-plan.ts 计划结构 + buildPlan（系统聚合）
  TASK-V55F-207 [M] batch-plan.ts planFingerprint（逐字节入哈希、摘要出账）
  TASK-V55F-208 [M] batch-plan.ts admitEntry + 准入 / 计划外回落 / 漂移
  TASK-V55F-209 [M] service-worker.ts 批次 toolCalls 捕获 + 计划 holder + confirm 桥接线
  TASK-V55F-210 [L] security/confirm.ts 计划感知桥（指纹准入 + 计划外回落 + 零明文审计）
  TASK-V55F-211 [M] 计划卡渲染（chat-state.ts 渲染用字段 + cards/auth.ts 计划行）
  TASK-V55F-212 [M] 中止 + 部分完成如实 + 逐条保留（cancelled 语义保持）

W3 ── WIDEN 二择 + 批量留痕 + S0′ 批量段 + 台账 + 体积收口（interval C 收口轮）
  TASK-V55F-213 [M] WIDEN 二择接线 + out-of-scope-authorized 转值 + 批量留痕
  TASK-V55F-214 [L] S0′ 批量段（S0P-B1~B3）—— 一次手势 / 计划外回落 / 二择
  TASK-V55F-215 [M] X-SGO-4/6/7 台账 + 法八批量零明文只增
  TASK-V55F-216 [M] 体积本叶重登记 + 本叶收口

关键路径：201 → 204 → 205 → 206 → 207 → 208 → 209 → 210 → 211 → 212 → 213 → 214 → 215 → 216
```

---

## 2. 任务列表

### TASK-V55F-201: RL-06 扩批量变体（AI 代答计划注入 ⇒ 必红）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | 无（叶2 入口条件 = 叶1 `validated`） |
| **执行波次** | W1 |
| **对应 FR** | FR-SGO-049 / 103 |

**描述**: `test/supersession-ledger.test.ts` 的 `RL-06-consent-no-proxy` **原判据不改**，**扩批量变体**：把「AI 建议计划即视为同意」/「AI 代答计划」/「自动展开」三类变体逐一注入 ⇒ **必红**（`expectFailPattern`）；`pressDecision` 实判据保持。**台账与重锚同轮完成**。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/supersession-ledger.test.ts` |

**验收标准**:
- [ ] `RL-06` 原判据**不改**（不删 / 不降级）；批量变体注入 **必红**（FR-SGO-049 / AC-SGO-005）
- [ ] 「AI 建议计划即视为同意」任何变体 ⇒ FAIL（N-SGO-025）
- [ ] 注入 ⇒ FAIL ⇒ 逐字节还原（sha256）⇒ PASS

**验证命令**:
```bash
cd packages/web-cli-plugin && npx tsx --test test/supersession-ledger.test.ts
```

**门禁**: `supersession`

---

### TASK-V55F-202: OT-⑩ 扩批量变体（`tierOf` 逐 op 不变）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | 无 |
| **执行波次** | W1 |
| **对应 FR** | FR-SGO-049 / 103 |

**描述**: `test/op-three-tier.test.ts` 的 OT-⑩ **扩批量变体**：`tierOf` **逐 op 对照不变**（特权 op `op.authorize` / `op.perm.request` **恒 `gesture`**）；批量机制**不得**改变档位裁决；原判据不改 + 注入反证。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/op-three-tier.test.ts` |

**验收标准**:
- [ ] `tierOf` 逐 op 对照**不变**（衍生式 5/2/2 保持）；原判据不改（N-SGO-005）
- [ ] OT-⑩ 批量变体注入 ⇒ **必红**（AC-SGO-005）
- [ ] 忠实登记 `auth` 6 终态语义保持

**验证命令**:
```bash
cd packages/web-cli-plugin && npx tsx --test test/op-three-tier.test.ts
```

**门禁**: `op-three-tier`

---

### TASK-V55F-203: 特权 op 不入批机核 + 「SW 永不 `.request(`」判据
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | 无 |
| **执行波次** | W1 |
| **对应 FR** | FR-SGO-045 |

**描述**: `test/capability-wiring.test.ts` 新增：批量路径**不触达**特权 op（`op.authorize` / `op.perm.request`）；「**SW 永不调用 `.request(`**」语义**等价保留**（计数不减）；注入「把 `op.authorize` 塞入计划」⇒ **必红**。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/capability-wiring.test.ts` |

**验收标准**:
- [ ] 批量路径不触达特权 op（FR-SGO-045 / NFR-SGO-002）
- [ ] `.request(` 计数**不减**（语义等价保留）；注入 ⇒ 必红
- [ ] 特权 op **恰 2 恒 `gesture`**（N-SGO-005）

**验证命令**:
```bash
cd packages/web-cli-plugin && npx tsx --test test/capability-wiring.test.ts
```

**门禁**: `capability-wiring`

---

### TASK-V55F-204: 载体零新增（计划经 type-only 字段 + 复用既有 `auth` kind）
| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-V55F-201, TASK-V55F-202, TASK-V55F-203 |
| **执行波次** | W1 |
| **对应 FR** | FR-SGO-041 / 063 |

**描述**: `background/messaging.ts` **只增 type-only** 计划字段（`question.plan` 形状 / 条目形状），复用既有 `confirm-request` + 既有 `auth` kind；二择复用既有 `askuser`。**零新增卡类型 / kind / 宿主**：`KIND_SET` **40 逐字**、12 kind 不动、`REGISTERED_STRUCTURAL_HOSTS === []`、`MAX_OPEN_ASKS = 2` / `ASK_CANCEL_REASONS` 4 逐字。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/background/messaging.ts` |

**验收标准**:
- [ ] `KIND_SET` 40 逐字；12 kind 契约不动；零新增宿主（FR-SGO-041 / N-SGO-009/010）
- [ ] `MAX_OPEN_ASKS = 2` / `ASK_CANCEL_REASONS` 4 项逐字（FR-SGO-063）
- [ ] type-only ⇒ 零运行时字节；`content.js` 零容差不受影响

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && npx tsx --test test/host-registry.test.ts
```

**门禁**: `host-registry`

---

### TASK-V55F-205: `test/batch-consent.test.ts` —— 新门禁骨架（BC-1~BC-7 先红后绿）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55F-204 |
| **执行波次** | W1 |
| **对应 FR** | FR-SGO-040~050 / 093 |

**描述**: 新建 **node 门禁** `test/batch-consent.test.ts`：先落 `BC-1-build` / `BC-2-fingerprint` / `BC-3-admit` / `BC-4-drift` / `BC-5-privileged` / `BC-6-zero-plaintext` / `BC-7-abort` **判据声明 + 注入反证**（**边界先行，先红后绿**）；真源切片读生产模块；禁恒真。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/batch-consent.test.ts` |

**验收标准**:
- [ ] `BC-1~BC-7` 判据逐条声明（ADR-SGO-004 §11）；每条带 `expectFailPattern`（禁恒真）
- [ ] 真源切片读生产模块（`batch-plan.ts` / `confirm.ts` / `service-worker.ts`），**不读**测试自建常量 / `dist` 副本
- [ ] 先红后绿（W1 声明 → W2 实现转绿）

**验证命令**:
```bash
cd packages/web-cli-plugin && npx tsx --test test/batch-consent.test.ts
```

**门禁**: `batch-consent`（node；入 `gate-integrity` 受审集合，见 `216`）

---

### TASK-V55F-206: `batch-plan.ts` —— 计划结构 + `buildPlan`（系统聚合）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55F-204, TASK-V55F-205 |
| **执行波次** | W2 |
| **对应 FR** | FR-SGO-040 / 041 |

**描述**: 新建 `background/batch-plan.ts`（B 列，纯函数）`buildPlan(toolCalls, refs)`：计划**边界 = 单条 assistant 消息**的全 `toolCalls` 中 **in-scope `set-text`**；`N≥2 出卡` / `N==1 逐条` / `N==0 不出`（**PD-SGO-005** 系统聚合）；**跨轮即新计划**（禁跨回合累积，R-SGO-915）；空计划**不空弹**。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/background/batch-plan.ts` |

**验收标准**:
- [ ] 计划 = 单条 assistant 消息的 `toolCalls`（确定性）；仅 in-scope `set-text`（ADR-SGO-004 §1）
- [ ] `N≥2 / N==1 / N==0` 三分支；跨越轮次即新计划（禁跨回合累积）
- [ ] 空计划不空弹；单条计划不得因批量机制改变单条语义（EC-SGO-013）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && npx tsx --test test/batch-consent.test.ts
```

**门禁**: `batch-consent`

---

### TASK-V55F-207: `batch-plan.ts` —— `planFingerprint`（逐字节入哈希、摘要出账）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55F-206 |
| **执行波次** | W2 |
| **对应 FR** | FR-SGO-042 |

**描述**: `planFingerprint` = `sha256(canonical(selector ∧ actionType ∧ fromDigest ∧ toText))` —— **逐字节入哈希**（含**文本对**，PD-SGO-006 裁决）；**摘要出账**（零明文）；**空白改动 ⇒ 指纹变**（**不放宽**）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/background/batch-plan.ts` |

**验收标准**:
- [ ] 指纹 = 目标集合 ∧ 动作类型 ∧ **文本对**（逐字节入哈希）（FR-SGO-042 / R-SGO-906）
- [ ] 空白改动 ⇒ 指纹**变**（不放宽）；归一化后判相等 ⇒ FAIL（`BC-2`）
- [ ] 出账**只记摘要**（零明文，FR-SGO-046）

**验证命令**:
```bash
cd packages/web-cli-plugin && npx tsx --test test/batch-consent.test.ts
```

**门禁**: `batch-consent`

---

### TASK-V55F-208: `batch-plan.ts` —— `admitEntry` + 准入 / 计划外回落 / 漂移
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55F-207 |
| **执行波次** | W2 |
| **对应 FR** | FR-SGO-042 / 044 / 049 |

**描述**: `admitEntry`：计划内条目键 ∈ 已批准集 ⇒ **放行**；**计划外第 N+1 条 ⇒ 逐条回落**（一次点击**不得**放开无限写）；批准前目标集合**漂移** ⇒ **显式失败** + 重新出计划（EC-SGO-014）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/background/batch-plan.ts` |

**验收标准**:
- [ ] 计划内放行 / 计划外逐条回落（FR-SGO-044 / EC-SGO-012；`BC-3`）
- [ ] 批准前漂移 ⇒ **显式失败**（不静默按旧指纹放行）+ 重新出计划（EC-SGO-014 / R-SGO-916；`BC-4`）
- [ ] 一次点击**不放开无限写**；注入「计划外被放行」⇒ 必红

**验证命令**:
```bash
cd packages/web-cli-plugin && npx tsx --test test/batch-consent.test.ts
```

**门禁**: `batch-consent`

---

### TASK-V55F-209: `service-worker.ts` 批次 `toolCalls` 捕获 + 计划 holder + confirm 桥接线
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55F-206 |
| **执行波次** | W2 |
| **对应 FR** | FR-SGO-040 / 041 |

**描述**: `service-worker.ts` 在 `runChat` 的 `chat` 回调内**一处**捕获单条 assistant 消息全 `toolCalls`；计划 **holder 单源**；接既有 `confirm` 桥（复用 `confirm-request`）。**不新增 kind / 宿主**；`requestTurn(` 仍**恰 2**。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/background/service-worker.ts` |

**验收标准**:
- [ ] 捕获点在 `runChat` `chat` 回调内**恰一处**（ADR-SGO-004 §11 后果）
- [ ] 计划 holder 单源；复用 `confirm-request` + 既有 `auth` kind（零新增载体）
- [ ] `requestTurn(` 仍恰 2（不新增主流程调用点）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && grep -rn "requestTurn(" src/ui/sidepanel/sidepanel.ts | wc -l
```

**门禁**: `batch-consent`

---

### TASK-V55F-210: `security/confirm.ts` —— 计划感知桥（指纹准入 + 计划外回落 + 零明文审计）
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V55F-208, TASK-V55F-209 |
| **执行波次** | W2 |
| **对应 FR** | FR-SGO-042 / 044 / 046 / 049 |

**描述**: `security/confirm.ts` 从「单条桥」**升级为计划感知桥**（B 列）：**指纹准入** + **计划外逐条回落** + **零明文审计**（只记 工具 / 结果 / 计数 / 指纹摘要 / 字段名）；**单条路径逐字不变**（`permission.ts:16,157,333` 理由串逐字）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/security/confirm.ts` |

**验收标准**:
- [ ] 计划内一次手势放行；计划外逐条回落（FR-SGO-044 / AC-SGO-015）
- [ ] 审计只记字段名 / 计数 / 指纹摘要（**零明文**）（FR-SGO-046 / R-SGO-905；`BC-6`）
- [ ] **单条路径逐字不变**（`confirm.ts:84-156` 既有行为零回归）；非批次仍逐条批准（FR-SGO-048）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && npx tsx --test test/batch-consent.test.ts
```

**门禁**: `batch-consent`

---

### TASK-V55F-211: 计划卡渲染（`chat-state.ts` 渲染用字段 + `cards/auth.ts` 计划行）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55F-209 |
| **执行波次** | W2 |
| **对应 FR** | FR-SGO-050 / 046 / 048 |

**描述**: `chat-state.ts`：`auth` 卡的**渲染用**计划字段（与 `payload` **同级、不在 `payload` 内**）；`cards/auth.ts`：计划行渲染（**`textContent`** + **凭据形掩码**；静态三段模板口径；**展示上限 8 行 + 诚实计数行**，PD-SGO-007）。**零新增 kind**。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/chat-state.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/cards/auth.ts` |

**验收标准**:
- [ ] 计划字段与 `payload` **同级**（**不在 `payload` 内**）（R-SGO-914 消除）
- [ ] 仅 `textContent` 渲染；凭据形掩码；展示上限 8 行 + 诚实计数行（FR-SGO-050 / PD-SGO-007）
- [ ] 法八四面零明文（正文不进 payload 值 / digest 值 / 审计值 / DOM 属性）（N-SGO-026）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && npm run build && npm run test:ui -- --grep law8-plaintext
```

**门禁**: `law8-plaintext`

---

### TASK-V55F-212: 中止 + 部分完成如实 + 逐条保留（`cancelled` 语义保持）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55F-210 |
| **执行波次** | W2 |
| **对应 FR** | FR-SGO-047 / 048 |

**描述**: 批量计划可被用户**中止** ⇒ `cancelled` 终态 + **部分完成如实留痕** + **零死端**；第 k 条失败 ⇒ **如实报告失败条目** + 部分完成留痕（**不得谎报整批成功**）；`auth` 6 终态语义逐字保持。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/cards/auth.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` |

**验收标准**:
- [ ] 中止 ⇒ `cancelled` + 部分完成留痕 + 零死端（FR-SGO-047 / EC-SGO-011；`BC-7`）
- [ ] 中途失败 ⇒ 如实报告失败条目（不谎报整批成功）（EC-SGO-009）
- [ ] `auth` 6 终态语义逐字不变；非批次写入仍逐条批准（FR-SGO-048）

**验证命令**:
```bash
cd packages/web-cli-plugin && npx tsx --test test/batch-consent.test.ts && npx tsx --test test/ask-auth-inflow.test.ts
```

**门禁**: `no-dead-end`

---

### TASK-V55F-213: WIDEN 二择接线 + `out-of-scope-authorized` 转值 + 批量留痕
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55F-210, TASK-V55F-211, TASK-V55F-212 |
| **执行波次** | W3 |
| **对应 FR** | FR-SGO-060~063 / 081 / 082 |

**描述**: `sidepanel.ts` / `chat-state.ts`：越界写前经**既有** `ask-user-request` 提**二择**（「仅引用范围内」/「整页」）—— 复用既有 `askuser` kind（**零新卡类型 / 宿主**）；用户选「整页」⇒ 记录本回合 `authorized=true` ⇒ 读数转 `out-of-scope-authorized` + **入留痕**；**`authorized` 只由真实用户点击写入**（SW / AI 路径**无**写入面）；拒绝 / 取消 ⇒ 越界写被拒（fail-closed）+ 可达 next（**零死端**）。**批量留痕**：指纹摘要 + 条目数 + 手势事实 + 逐条结果计数（零明文）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/chat-state.ts` |

**验收标准**:
- [ ] 二择复用既有 `askuser`（零新 kind / 宿主）；`MAX_OPEN_ASKS = 2` / `ASK_CANCEL_REASONS` 4 逐字（FR-SGO-063）
- [ ] 「整页」⇒ 只由**用户确认**产生 `out-of-scope-authorized` + 入留痕；**AI 自填 authorized 注入 ⇒ 必红**（FR-SGO-061 / R-SGO-907）
- [ ] 拒绝 / 取消 ⇒ **零死端**（`no-dead-end` 49 **只增**）；零视图切换（FR-SGO-062 / EC-SGO-006）
- [ ] 批量留痕（指纹摘要 + 条目数 + 手势事实 + 逐条结果计数，零明文）（FR-SGO-081/082）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run build && npm run test:ui -- --grep no-dead-end
```

**门禁**: `no-dead-end`

---

### TASK-V55F-214: S0′ 批量段（S0P-B1~B3）—— 一次手势覆盖计划内全部 + 计划外回落 + 二择
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V55F-213 |
| **执行波次** | W3 |
| **对应 FR** | FR-SGO-093 |

**描述**: 扩展 S0′ 双面以覆盖批量分支（**共用叶1 的样本单源**，**只加断言不加文件**）：`S0P-B1` 一次手势覆盖计划内全部；`S0P-B2` 计划外逐条回落；`S0P-B3` 二择 + 中止可判。**`CHROMIUM_GATES === 9` 逐字不动**。**编号裁决**见 §0.1（`S0P-7/8` 保留 node 面，批量段用 `S0P-B1~B3`）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/ui/fixtures/s0-chain.mjs` |
| MODIFY | `packages/web-cli-plugin/test/ui/s0-self-driven.mjs` |
| MODIFY | `packages/web-cli-plugin/test/s0-self-driven-chain.test.ts` |

**验收标准**:
- [ ] `S0P-B1~B3` 三项可判（含各自反证）（FR-SGO-093 / ADR-SGO-006）
- [ ] **只加断言不加文件**；`CHROMIUM_GATES === 9`（R-SGO-919）；样本单源（禁第二份样本）
- [ ] 中止可判（`cancelled` + 部分完成留痕）；人工面 **M2**（连点疲劳体感）/ **M3**（批量计划卡可读性 / 可否决性）标 `⏳ 未执行`

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run build && npm run test:ui -- --grep s0-self-driven
```

**门禁**: `s0-self-driven`（Chromium；计数只增）

---

### TASK-V55F-215: X-SGO-4/6/7 台账 + 法八批量零明文只增
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55F-201, TASK-V55F-205, TASK-V55F-213, TASK-V55F-214 |
| **执行波次** | W3 |
| **对应 FR** | FR-SGO-103 / 105 / 107 |

**描述**: `docs/v4-supersession-ledger.json`：X-SGO-4（逐条 → 任务级批量）**已发生**条目 + `redlineRemap[]`（扩断言，非替换）；X-SGO-6 = 「**以读数承载、词汇未扩张**」**如实登记**（不制造假条目）；X-SGO-7 = **未发生取代**（共享台账，叶1 已登记主体）。`test/ui/law8-plaintext.mjs` **只增**批量计划零明文 + 掩码断言。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` |
| MODIFY | `packages/web-cli-plugin/test/ui/law8-plaintext.mjs` |

**验收标准**:
- [ ] X-SGO-4 已发生（`RL-06` / OT-⑩ 扩批量 + `redlineRemap[]`）；`law8` 36 不降级、`auth` 6 终态保持（FR-SGO-103）
- [ ] X-SGO-6「以读数承载、未扩张」如实登记（不新增终态字面量）（FR-SGO-105 / N-SGO-013）
- [ ] X-SGO-7 未发生（与叶1 共享台账一致）；`law8` **零降级、计数只增**（FR-SGO-046/050）

**验证命令**:
```bash
cd packages/web-cli-plugin && npx tsx --test test/supersession-ledger.test.ts && npm run build && npm run test:ui -- --grep law8-plaintext
```

**门禁**: `supersession` / `test:law8`

---

### TASK-V55F-216: 体积本叶重登记 + 本叶收口
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55F-215 |
| **执行波次** | W3（收口轮） |
| **对应 FR** | FR-SGO-120~125 |

**描述**: 本叶**即测即登记**：A 列（`sidepanel.js`）本叶实测净增（预算 **3.5~5.5 KB**，上界 **4.0~6.3 KB**）+ **五要素** + **V3-VOL-3 三值同源前移** + **metafile 逐模块归因**；时间线**只追加**。**两叶 Σ** 对照（正常口径 Σ 9.5~14.5 KB（+15% 16.7 KB）≤ 余量 28,931 ⇒ **不触发升档**）；**越档位二态显式**（EC-SGO-022 + 作者一行）；`authorConfirmation` 保持 `pending-author-line`。门禁治理：`V55F2_NODE_GATE_FILES ≥1`（`batch-consent`）+ 收口对账 + `e2e` PASS。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/size-baseline.ts` |
| MODIFY | `packages/web-cli-plugin/test/size-budget.test.ts` |
| MODIFY | `packages/web-cli-plugin/test/size-growth-evidence.test.ts` |
| MODIFY | `packages/web-cli-plugin/test/size-ruling-vol3.test.ts` |
| MODIFY | `packages/web-cli-plugin/test/gate-integrity.test.ts` |

**验收标准**:
- [ ] A 列本叶实测净增 + 五要素 + 时间线只追加（FR-SGO-125）；两叶 Σ 对照显式
- [ ] V3-VOL-3 三值同源前移；`cap` 保持 `record-only`；`authorConfirmation = pending-author-line`（不得伪称已确认）
- [ ] `V55F2_NODE_GATE_FILES ≥1`（`batch-consent` 入受审集合）；`CHROMIUM_GATES === 9` 逐字（FR-SGO-115）
- [ ] 越生效上限 / 越档位二态显式（EC-SGO-022）；`e2e` PASS；本叶全门禁串行全绿 + 收口

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run build && npx tsx --test test/size-ruling-vol3.test.ts test/gate-integrity.test.ts && npm run e2e
```

**门禁**: `test:size-ruling-vol3` / `gate-integrity` / `e2e`

---

## 3. 任务汇总

| 统计项 | 数值 |
|--------|:--:|
| 总任务数 | **16** |
| S 级（简单） | **1**（`204`） |
| M 级（中等） | **13** |
| L 级（复杂） | **2**（`210` / `214`） |
| 执行波次 | **3**（W1~W3） |
| 新增 node 门禁 | **1**（`batch-consent`） |
| spikeGate | **0**（本叶无先验闸门；边界先行由 W1 注入反证先落承载） |

## 4. 执行策略

| 波次 | 任务 | 策略 |
|:--:|------|------|
| **W1** | `201`–`205` | **边界先行**：`201` ∥ `202` ∥ `203`（三文件不相交）；`204` 须后于三者；`205` 骨架最后（先红后绿） |
| **W2** | `206`–`212` | `206 → 207 → 208` 严格串行（同文件 `batch-plan.ts`）；`209` ∥ `206` 准备、后于 `208`；`210` 后于 `208`+`209`；`211` ∥ `212`（`chat-state`/`cards` 与 `sidepanel` 部分重合 → 串行） |
| **W3** | `213`–`216` | `213 → 214`（`sidepanel.ts` 共享，串行）；`215` 后于 `201`/`205`/`213`/`214`；`216` **末位收口** |

**提交区间（interval）**：`A` = W1（边界先行）/ `B` = W2（计划/指纹/准入/零明文/中止）/ `C` = W3（**收口轮**：二择 + S0′ 批量段 + 台账 + 体积收口）。

**可并行组**：
- `Q1`：`201` ∥ `202` ∥ `203`（`supersession-ledger.test.ts` / `op-three-tier.test.ts` / `capability-wiring.test.ts` 不相交）
- `Q2`：`206` ∥ `209` 的前置准备（`batch-plan.ts` 与 `service-worker.ts` 不相交）

**硬串行保留**：门禁严格串行（一次一个 Chromium，绝不并发）（N-SGO-017）。

## 5. 本叶验收门禁清单（收口轮 `216`）

`typecheck` · `build` · `npm test ≥1330` · **`batch-consent`（新）** · `test:supersession ≥37` · `op-three-tier`（`tierOf` 逐 op 不变）· `capability-wiring`（`.request(` 计数不减）· `host-registry`（零宿主）· `test:gate-integrity ≥19`（`CHROMIUM_GATES === 9`）· `test:law8 ≥36`（零降级）· `test:dead-end ≥49` · `s0-self-driven ≥59` · `test:auth-chip ≥37` · `test:ask-auth ≥78` · `test:stream ≥76` · `size-*` + `test:size-ruling-vol3 ≥12` · `e2e` PASS

> **保护段**（共享面，叶1 主责）：journey `43054..58287` / binding `107780..115930` **保段优先**；本叶若触及 ⇒ 逐行登记 + 计数只增。

## 6. 体积预算（本叶）

| 项 | 预算 | 上界（+15%） | 对照依据 |
|---|--:|--:|---|
| **A 列**（`sidepanel.js` 净增） | **3.5~5.5 KB** | 4.0~6.3 KB | v5.5-3 R2 面板接线 **+6,889 B**（本叶面板侧更小）；`chat-state.ts` / `cards/auth.ts` / `sidepanel.ts` |
| **B 列**（`background.js`，**不计账**） | 3.0~5.0 KB | — | `batch-plan.ts` + `security/confirm.ts` + `service-worker.ts`（批次捕获）**全落 SW 侧** |

**逐叶收口重登记**：`TASK-V55F-216`（五要素 + V3-VOL-3 三值 + metafile 归因 + **两叶 Σ 对照**）。

**越限 EC-SGO-022 任务化**：同叶1；**两叶 Σ** 正常口径 9.5~14.5 KB（+15% 16.7 KB）≤ 余量 28,931 ⇒ **不触发升档**；2.8× 最坏 ≈46.7 KB ⇒ 预置 EC-SGO-022（**本叶不触发**）。`authorConfirmation = pending-author-line`。

## 7. review / validate 策略（build 前已设计）

| 阶段 | 前置判据（build 前钉死） |
|---|---|
| **review** | ① **红线⑥ 不侵蚀**：一次真实手势 + 计划指纹 + 计划外回落 + 特权不入批（批量变体注入必红）；② **零明文**：计划正文**仅 UI 渲染文本**（非 `payload` 值 / `digest` / 审计 / DOM 属性）+ 掩码；③ **禁漂移**：计划 = 真实 `toolCalls`（同源）+ 批准前漂移显式失败；④ **禁代答**：`authorized` 只由真实用户点击写入；⑤ 计数只增（`law8` 36 零降级 / `tierOf` 逐 op 不变 / `.request(` 不减） |
| **validate** | EXIST（无 TODO / 桩）· SUBSTANCE（非空实现 + BC-1~7 覆盖）· ANTI-PATTERN（反证恒绿检测：AI 代答计划 / 自填 authorized / 计划外放行 三类注入）· WIRING（无孤岛 + `batch-consent` 入受审集合 + 计数只增）· DRIFT（契约漂移：计划条目 ↔ 指纹输入、`tierOf` ↔ 特权 op、两叶 Σ 体积） |

**二维时序**：`W1`(边界先行) → `W2`(计划/指纹/准入/回落/零明文/中止) → `W3`(二择/S0′ 批量段/台账/体积) —— review 在 `W3` 收口前（红线⑥ + 法八 + 授权语义审查）；validate 在 `W3` 收口（BC-1~7 实跑 + S0′ 批量段 + `e2e` + 漂移检测）。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V5.5F-2 批量授权叶任务：**16 任务 / 3 波**（`TASK-V55F-201~216`；S×1 / M×13 / L×2）；**边界先行**（W1 RL-06 / OT-⑩ / 特权不入批注入反证先落）；1 个新 node 门禁（`batch-consent` BC-1~7）；S0′ 批量段落 W3（`S0P-B1~B3`，编号裁决显式登记）；体积逐叶重登记 `216`（A 列 3.5~5.5 KB + 两叶 Σ 对照 + EC-SGO-022 二态）。**本轮只做 tasks**：零 `src`/`test`/`dist`/`docs`/`design`/ROADMAP 改动；未跑门禁 / 构建 / Chromium | 2026-09-24 | SDDU Tasks Agent |

---

## 8. 执行进度（**R1 = W1 + W2**，`TASK-V55F-201~212`）

> 本轮 build 只做 **R1（W1+W2）**；W3（`TASK-V55F-213~216`：WIDEN 二择 / S0′ 批量段 / 台账 / 体积收口）留 R2。

| 波 | 任务 | 状态 | 证据 |
|:--:|------|:--:|------|
| W1 | `TASK-V55F-201` RL-06 扩批量变体 | ✅ completed | `test/supersession-ledger.test.ts` 追加 1 用例 + `bulkConsentProxyProblems`（三类注入必红；AI/LLM 侧零审批写入点；on-disk 注入 `ai-drive.ts` ⇒ FAIL ⇒ 逐字节还原 ⇒ PASS） |
| W1 | `TASK-V55F-202` OT-⑩ 扩批量变体 | ✅ completed | `test/op-three-tier.test.ts` 追加 1 用例 + `bulkAdmitProblems`（`tierOf` 逐 op 不变；特权入批必红） |
| W1 | `TASK-V55F-203` 特权 op 不入批机核 | ✅ completed | `test/capability-wiring.test.ts` 追加 1 用例 + `batchPrivilegedProblems`（计划模块零特权标识 / 零 `.request(`；`.request(` 计数不减；on-disk 注入 ⇒ FAIL ⇒ 还原 ⇒ PASS） |
| W1 | `TASK-V55F-204` 载体零新增 | ✅ completed | `messaging.ts` 只增 type-only `BatchPlanWireEntry` / `BatchPlanWire` / `ConfirmPlanQuestionExt`；`KIND_SET` 40 逐字；zero 运行时字节 |
| W1 | `TASK-V55F-205` `batch-consent` 新门禁 | ✅ completed（**7 / 0**） | `test/batch-consent.test.ts`：BC-1~7 逐条 `expectFailPattern` + 注入反证；真源切片读生产模块；已入 `EXPECTED_AUDITED_FILES` |
| W2 | `TASK-V55F-206` `batch-plan.ts` 计划结构 + `buildPlan` | ✅ completed | 单条 assistant 消息的 in-scope `dom set-text`；`N≥2 / N==1 / N==0`；跨轮不累积；空计划不空弹 |
| W2 | `TASK-V55F-207` `planFingerprint` | ✅ completed | `sha256:` + `sha256Hex(canonical(selector ∧ actionType ∧ fromDigest ∧ toText))`；空白改动 ⇒ 指纹变；出账只记摘要 |
| W2 | `TASK-V55F-208` `admitEntry` + 回落 / 漂移 | ✅ completed | 计划内放行 / 计划外逐条回落 / 批准前漂移显式失败（`test/batch-consent.test.ts` BC-3/BC-4 + on-disk 注入必红） |
| W2 | `TASK-V55F-209` SW 批次 `toolCalls` 捕获 + holder + 桥接线 | ✅ completed | `runChat` 的 `chat` 回调内**恰一处** `batchConsent.setPlan(await buildPlan(res.toolCalls, refs))`；`finally` `clear()`；`requestTurn(` 仍恰 2 |
| W2 | `TASK-V55F-210` `confirm.ts` 计划感知桥 | ✅ completed | 指纹准入 + 计划外回落 + 零明文审计（只记 `fingerprintDigest` / `batchEntries`）；单条路径逐字不变（`plan` 缺省 ⇒ 既有行为） |
| W2 | `TASK-V55F-211` 计划卡渲染 | ✅ completed | `stream-model.ts` `CardView.plan?`（**与 `payload` 同级**）+ `chat-state.ts` 渲染用字段 + `cards/auth.ts` 计划行（`textContent` + `maskRefDigest` 掩码 + 上限 8 行 + 诚实计数行） |
| W2 | `TASK-V55F-212` 中止 + 部分完成如实 | ✅ completed | `markCancelled` ⇒ 计划内拒绝 + `AUTH_PLAN_ABORT_TEXT` 如实交代（不谎报整批成功）+ 拒绝留痕（零明文）；`auth` 6 终态语义逐字 |

**门禁（R1 实测）**：`typecheck` 绿 · `build` 绿 · `npm test` **1386 用例（1379 pass / 7 fail）** · `batch-consent` **7/0** · `test:law8` **46/0** · `test:dead-end` **49/0** · `journey` **171** · `binding` **192** · `l0` **248** · `l1` **131** · `stream` **76** · `auth-chip` **37** · `ask-auth` **78** · `s0-self-driven` **65** · `e2e` PASS。
7 项红 = **6 体积/红线 pin 家族**（登记基线滞后于产物；**逐叶重登记属 W3 `TASK-V55F-216`**，R1 如实红并归因）+ **1 预提交 worktree 漂移**（`zeroDiffFiles` 巡检对未提交改动敏感，提交后自愈）。

**体积（R1 实测）**：A 列 **585,732 → 589,033 B（+3,301 B ≈ 3.22 KiB）**；B 列 **1,627,424 → 1,635,675 B（+8,251 B，不计账）**；三冻结面 `content.js` 177,076 / `pick-layer.js` 34,358 逐字节不变。
