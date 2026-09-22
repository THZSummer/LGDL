# 任务分解：specs-tree-v55-2-deterministic-onboarding（V5.5-2 主题① 确定性系统流）

> **文档定位**: SDDU 任务清单（**次叶 / 主题① 叶**）— 将本叶技术方案分解为可并行执行的原子任务；跨切契约见父 `../tasks.md` + `../plan.md` + `ADR-V55-006/007`
> **前置依赖**: 本叶 `plan.md` v1.0 + 本叶 `spec.md` v1.0 + **前置叶 `specs-tree-v55-1-driver-layer`**（驱动者声明 / `'answered'` 时机 / 终态词汇 / 悬置登记入口）+ 父 `../plan.md` v1.0
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-22
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-09-22
> **更新说明**: 初始创建（V5.5-2 叶 16 任务 / 5 波：配置探测判据 3 字段 + `runChat` 前置判据 + 双源并存 + 4 步引导流单源 + 悬置任务单源 + 配置完成自动续接 + 两场景 + S0 分支 B 必判项）

---

## 1. 依赖拓扑总览

```
W1 判据（前置依赖 = v55-1 全绿）
  TASK-V55-201 [M] isLlmConfigured 3 字段判据
  TASK-V55-202 [S] onboarding-deterministic.test.ts 判据机核
  TASK-V55-203 [M] runChat 前置配置判据（先于 providerChat）

W2 前置判据 + 双源（依赖 W1）
  TASK-V55-204 [M] messaging.ts union type-only + chat-result payload variant
  TASK-V55-205 [M] 双源并存（被动保留 + 主动识别 fold 既有 risk）
  TASK-V55-206 [M] blocked-terminals(9 不变) + next-registry(16 增)

W3 双源 + 引导流（依赖 W2）
  TASK-V55-207 [M] onboarding-flow.ts 4 步单源
  TASK-V55-208 [M] op.llm-config op-direct chip + 零视图切换
  TASK-V55-209 [M] law8(25 增) + stream(73 增)

W4 悬置 + 续接（依赖 W3）
  TASK-V55-210 [M] suspension.ts 悬置任务单源
  TASK-V55-211 [L] 配置完成自动续接 + 失败回滚悬置保留
  TASK-V55-212 [M] 悬置单源扫描 + 失效重校验 + 空悬置非死端

W5 两场景 + S0 分支 B + 收尾（依赖 W4）
  TASK-V55-213 [M] 首装 / 已装未配两场景
  TASK-V55-214 [L] S0 分支 B 必判项（自动续接）
  TASK-V55-215 [M] 取消非死端 + 同因不重复
  TASK-V55-216 [L] 体积五要素 + X-SELF-3 台账 + 本叶收尾
```

---

## 2. 任务列表

### TASK-V55-201: `isLlmConfigured` —— 配置探测判据（3 字段）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | v55-1 全绿（叶间前置） |
| **执行波次** | W1 |
| **对应 FR** | FR-SELF-052（ADR-V55-006 §2） |

**描述**: 在既有 `src/llm/status.ts` 新增纯函数 `isLlmConfigured`：`hasKey ∧ providerId ∈ PROVIDERS ∧ model 非空`（后二者由 key-store 读归一化**结构性保证**）。**双侧可导入、零依赖、零 LLM、零网络**。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/llm/status.ts` |

**验收标准**:
- [ ] 3 字段判据单源；真值表覆盖（假阴 / 假阳）；后二者归一化不变量机核
- [ ] 零 LLM 调用 / 零网络；「不确定（依赖 LLM 输出）⇒ FAIL」反证（FR-SELF-047）
- [ ] 为**主题①↔主题② 唯一分流依据**（FR-SELF-052）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && npm test
```

### TASK-V55-202: `onboarding-deterministic.test.ts` —— 判据机核
| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-V55-201 |
| **执行波次** | W1 |
| **对应 FR** | FR-SELF-052（AC-SELF-007） |

**描述**: 新 node 门禁骨架：3 字段扫描 + 归一化不变量 + 假阴 / 假阳两类注入必红。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/onboarding-deterministic.test.ts` |

**验收标准**:
- [ ] 3 字段扫描绿；两类注入各 FAIL → 还原 PASS
- [ ] 门禁纳入受审集合（配 `TASK-V55-216`）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test
```

### TASK-V55-203: `runChat` 前置配置判据
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55-201 |
| **执行波次** | W1 |
| **对应 FR** | FR-SELF-040 / 041（ADR-V55-006 §3） |

**描述**: `service-worker.ts#runChat` 在 `chatBusy = true` **之前**做确定性配置判据（early return）；未配置 ⇒ `chat-result{ variant:'llm-unconfigured' }`，**不调 provider / 零 token**。判据**先于** `providerChat`（SW bundle，**零 sidepanel 字节**）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/background/service-worker.ts` |

**验收标准**:
- [ ] 源码序断言：判据**早于** `providerChat` 且 early return 在 `chatBusy = true` 之前（R-V55-106）
- [ ] 反证：删判据 ⇒ FAIL（复现 R5 被动式）；early return 位置错 ⇒ 第二次回合被误判忙 ⇒ FAIL

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && npm test
```

### TASK-V55-204: `messaging.ts` union type-only + payload `variant`
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55-203 |
| **执行波次** | W2 |
| **对应 FR** | FR-SELF-095（N-SELF-008 / T2） |

**描述**: `messaging.ts` union **type-only** 扩成员；`chat-result` 增 payload `variant`（**非** kind，**不进 `KIND_SET`**）。`KIND_SET` **40 项逐字不动**。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/background/messaging.ts` |

**验收标准**:
- [ ] `KIND_SET` 40 项逐字；union 扩成员**运行时零字节**
- [ ] `chat-result` payload `variant` 在侧；反证：把 `variant` 加进 `KIND_SET` ⇒ FAIL

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test && grep -c "KIND_SET" src/background/messaging.ts
```

### TASK-V55-205: 双源并存（`llm.unconfigured`）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55-203 / 204 |
| **执行波次** | W2 |
| **对应 FR** | FR-SELF-041（X-SELF-3 / AC-SELF-007/012） |

**描述**: 阻塞事实**双源并存**：被动观测（`noteLlmBlockedFact` 语义**保留**）+ 主动识别（确定性判据命中即成立），**折叠进既有 `risk` 源**、**幂等**（不产两条事实）。`OPS_RECOVERY_ROWS` / `BLOCKED_RECOVERY_TRIGGER`（**按终态键控**）**零改写**。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/providers.ts` |

**验收标准**:
- [ ] 两条路径**均**可产出同一终态词汇；幂等（不产两条事实 / 两条引导）
- [ ] 恢复链元素集与按终态键控形态**逐条不变**；反证：删被动路径 ⇒ FAIL（合法降级场景丢失）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test
```

### TASK-V55-206: `blocked-terminals` + `next-registry` 等价重锚
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55-205 |
| **执行波次** | W2 |
| **对应 FR** | FR-SELF-051 / 102 / 110（AC-SELF-013） |

**描述**: `blocked-terminals.test.ts`（9 **不变**，逐字）+ `next-registry.test.ts`（≥16 **增**）；`onboarding` provider 的 `when` / `chips` / `textOf` **语义零改写**（扩张不取代）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/blocked-terminals.test.ts` |
| MODIFY | `packages/web-cli-plugin/test/next-registry.test.ts` |

**验收标准**:
- [ ] `blocked-terminals` 9 逐字；`next-registry` ≥16；`R-ONBOARDING` 判据不减
- [ ] 注入反证 ≥1 处（FAIL → 还原 PASS）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test
```

### TASK-V55-207: `onboarding-flow.ts` —— 引导流 4 步单源
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55-206 |
| **执行波次** | W3 |
| **对应 FR** | FR-SELF-042（ADR-V55-007 §2） |

**描述**: 新建 `ONBOARD_STEPS` **恰 4 步**单源（识别 → 引导 → 采集 → 完成）+ 文案；采集**复用** `OP_PARAM_SEQUENCE['op.llm-config']` 既有 params 序列（**零新执行面 / 零新 op**）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/onboarding-flow.ts` |

**验收标准**:
- [ ] 步骤集合**恰一处**声明、**恰 4** 步、顺序确定；逐步可判（存在性 + 顺序）
- [ ] 反证：删任一步 ⇒ FAIL；复用既有 params 序列（无第二份）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && npm test
```

### TASK-V55-208: `op.llm-config` op-direct chip + 零视图切换
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55-207 |
| **执行波次** | W3 |
| **对应 FR** | FR-SELF-044 / 048（R-SELF-905） |

**描述**: 引导在**流内**产出「配置 LLM」`op.llm-config` op-direct chip（配置执行体**恒**既有 op，零第二写入路径）；**零视图切换 / 零 `#open-settings` 调用**（设置视图保留管理面，法六不变）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/onboarding-flow.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` |

**验收标准**:
- [ ] 引导路径零视图切换 / 零 `#open-settings` 断言；反证：把引导实现为打开设置页 ⇒ FAIL
- [ ] 配置执行入口**唯一**（`op.llm-config`）；「凭据写入 sink 恰一处」不减（AC-SELF-012）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test
```

### TASK-V55-209: `law8`(25 增) + `stream`(73 增)
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55-208 |
| **执行波次** | W3 |
| **对应 FR** | FR-SELF-049（N-SELF-010 / AC-SELF-012） |

**描述**: `test/ui/law8-plaintext.mjs` 增引导路径零明文断言（≥25）；`test/ui/stream.mjs` 增系统行 / 引导面断言（≥73）。阈值逐字不动。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/ui/law8-plaintext.mjs` |
| MODIFY | `packages/web-cli-plugin/test/ui/stream.mjs` |

**验收标准**:
- [ ] 两门禁计数 ≥ 基线（只增）；法八四面零明文**不退化**
- [ ] 反证：让引导路径把值落流内 ⇒ FAIL

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run test:law8 && npm run test:stream
```

### TASK-V55-210: `suspension.ts` —— 悬置任务单源
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55-208 |
| **执行波次** | W4 |
| **对应 FR** | FR-SELF-045 / 046（ADR-V55-007 §3，R-SELF-904） |

**描述**: 新建悬置任务**单源**：登记（谁在等 / 等什么 / 依据什么事实三要素）、`MAX_SUSPENSIONS = 1`、**有效期重校验**、续接入口。**单源登记**（第二处 ⇒ FAIL）；流内事实仍是唯一事实面。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/suspension.ts` |

**验收标准**:
- [ ] 「悬置任务单一登记点」扫描绿；`MAX=1` 常量单源
- [ ] 三要素齐备；有效期重校验（不制造假成功）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && npm test
```

### TASK-V55-211: 配置完成自动续接 + 失败回滚
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V55-210 |
| **执行波次** | W4 |
| **对应 FR** | FR-SELF-045 / 050（ADR-V55-007 §3/§4） |

**描述**: `op.llm-config` 成功回执后**自动续接**悬置任务（把触发配置的那次「已表达意图」作为回合输入 / 驱动重新按下）；**顺序机核**「回执在前、续接在后」。配置失败 ⇒ 快照回滚（旧配置逐字段不变）+ 错误卡 + 可达 next + **悬置保留**。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/suspension.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` |

**验收标准**:
- [ ] 事件序「回执 → 续接」机核；反证：删自动续接 ⇒ FAIL（复现「配完还要重说一遍」）
- [ ] 失败路径「回滚 + next + 悬置保留」断言；反证：配置失败仍续接 ⇒ FAIL

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test
```

### TASK-V55-212: 悬置单源扫描 + 失效重校验 + 空悬置非死端
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55-211 |
| **执行波次** | W4 |
| **对应 FR** | FR-SELF-045 / 046（AC-SELF-007） |

**描述**: 在 `onboarding-deterministic.test.ts` 增：悬置**单源扫描**（第二处 ⇒ FAIL）+ 失效重校验反证 + 空悬置**非死端**。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/onboarding-deterministic.test.ts` |

**验收标准**:
- [ ] 第二处登记 ⇒ FAIL（反证）；失效重校验（不制造假成功）
- [ ] 空悬置有可达 next（非死端）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test
```

### TASK-V55-213: 首装 / 已装未配两场景
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55-212 |
| **执行波次** | W5 |
| **对应 FR** | FR-SELF-043（AC-SELF-013，R-SELF-909） |

**描述**: 两场景**各自**产出配置引导 next：① 首装（`firstRun`，既有 `R-ONBOARDING` 单行引导**保留不取代**）② **已装未配**（`firstRun = false ∧ LLM 未配置`，**不得**依赖 `firstRun`）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/onboarding-flow.ts` |
| MODIFY | `packages/web-cli-plugin/test/onboarding-deterministic.test.ts` |

**验收标准**:
- [ ] 两场景各自断言；**注入 `firstRun = false` 仍须产出**；`R-ONBOARDING` 判据不减
- [ ] 分流互斥完备（未配置 ⇒ 零 AI 主动）；主题①② 不互相掩盖

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test
```

### TASK-V55-214: **S0 分支 B 必判项**（自动续接）
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V55-213（且 v55-1 `TASK-V55-119/120` 已全绿） |
| **执行波次** | W5 |
| **对应 FR** | FR-SELF-131（AC-SELF-001，ADR-V55-005 §3） |

**描述**: **S0 分支 B 必判项**：未配置 ⇒ 引导 ⇒ 掩码卡 ⇒ 完成 ⇒ **自动续接悬置任务** ⇒ 续接后回合留痕。在 `s0-self-driven.mjs` + `s0-self-driven-chain.test.ts` **增**（只增不改，共用 v55-1 的 `s0-chain.mjs` 单源）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/ui/s0-self-driven.mjs` |
| MODIFY | `packages/web-cli-plugin/test/s0-self-driven-chain.test.ts` |

**验收标准**:
- [ ] 「配置完成 ⇒ 自动续接」为**必判项**；反证：删自动续接 ⇒ FAIL
- [ ] 分支 B 与分支 A **两侧独立计数**（禁互相掩盖，R-V55-111）；共用同一样本单源

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test && node test/ui/s0-self-driven.mjs
```

### TASK-V55-215: 取消非死端 + 同因不重复
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55-214 |
| **执行波次** | W5 |
| **对应 FR** | FR-SELF-046（AC-SELF-007） |

**描述**: 用户取消 / 关闭引导 ⇒ **不重复弹同一条引导**（同因不重复）；继承 `maybeRecommendFirstRunEntry` 三纪律（**事件化 / 至多一次 / 事实到位**）；取消本身**必有可达 next**。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` |
| MODIFY | `packages/web-cli-plugin/test/onboarding-deterministic.test.ts` |

**验收标准**:
- [ ] 取消后不再产出同因引导（同会话内）；取消路径「固化 + 可达 next」
- [ ] 反证：取消后立即重复弹 ⇒ FAIL

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test
```

### TASK-V55-216: 体积五要素 + X-SELF-3 台账 + 本叶收尾
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V55-213 / 214 / 215 |
| **执行波次** | W5（收口轮） |
| **对应 FR** | FR-SELF-003 / 102 / 110 / 113 / 116 / 120~124（AC-SELF-020/026） |

**描述**: ① 体积**五要素重登记**（本叶增量 **+4,900**；时间线只追加；metafile 归因）；② 取代台账 **X-SELF-3 条目** + `modifiedRanges[]`（SW + 面板 fold 面逐行）+ `knownGap` 一致性；③ 本叶**收尾全门禁串行** + 计数只增对账 + 反证留证完整性 + 保护段双绿。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/size-baseline.ts` / `size-budget` / `size-growth-evidence` / `size-ruling-vol3` |
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` |
| MODIFY | `packages/web-cli-plugin/package.json`（`test:v3` 串行链追加主题① 门禁；**无新依赖**） |
| MODIFY | `packages/web-cli-plugin/test/gate-integrity.test.ts` |
| MODIFY | `.sddu/.../specs-tree-v55-2-deterministic-onboarding/TREE.md` / `state.json` |

**验收标准**:
- [ ] 五要素齐备；累计 **561,509**（距档位 1,691 ⚠️）；若 review 修复轮跨档位 ⇒ **显式升档登记**（不静默，`pending-author-line` 不伪称确认）
- [ ] X-SELF-3 条目 + `knownGap` 一致；`V55_NEW_GATE_FILES` 含 `onboarding-deterministic`
- [ ] 本叶全门禁**串行**复跑全绿；计数逐项 ≥ 基线；`content.js` / `pick-layer.js` 逐字节；`KIND_SET` 40 逐字；保护段双绿

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run test:v3
```

---

## 3. 任务汇总

| 统计项 | 数值 |
|--------|:--:|
| 总任务数 | 16 |
| S 级 (简单) | 1 |
| M 级 (中等) | 13 |
| L 级 (复杂) | 2 |
| 执行波次 | 5 |
| 新增门禁 | 1（主题① 场景门禁 `onboarding-deterministic`）+ S0 分支 B 必判项（增既有双面） |
| 体积预算 | 4,900 B（上界 6,300） |

## 4. 执行策略

| 波次 | 任务 | 策略 |
|:--:|------|------|
| W1 | 201–203 | 201 先于 202/203；203 依赖 201 的判据 |
| W2 | 204–206 | 204 与 205 可并行；206 依赖 205 |
| W3 | 207–209 | 串行（207 → 208 → 209） |
| W4 | 210–212 | 210 → 211 → 212 串行（悬置 → 续接 → 加固） |
| W5 | 213–216 | 213/214/215 依赖 W4；216 为收口轮（串行全门禁） |

## 5. 本叶验收门禁清单

`typecheck` · `build` · `npm test`（≥1181 增）· `blocked-terminals`（9 不变）· `next-registry`（≥16 增）· `ask-bridge` · `test:ask-auth`（≥71 增）· `test:stream`（≥73 增）· `test:law8`（≥25 增：引导路径）· `test:recommendation`（≥65）· `test:dead-end`（≥39）· `s2-deadend-chain`（6，**S0 并列**）· **S0 双面**（`test/s0-self-driven-chain.test.ts` + `test/ui/s0-self-driven.mjs`：**分支 B 必判项**）· **新主题① 场景门禁** · `test:supersession`（≥36 增）· `test:gate-integrity`（≥15 增）· `size-*` + `test:size-ruling-vol3`（12）

**共享面义务（本叶面）**：体积五要素重登记（本叶增量）· X-SELF-3 台账条目 · 悬置任务**单源登记**（第二处 ⇒ FAIL）· 保护段**保段**。

## 6. 体积预算（本叶）

| 构成 | 预算 | 上界 |
|---|--:|--:|
| `suspension.ts` 1,300 · `onboarding-flow.ts` 1,100 · `llm/status.ts` 120 · `sidepanel.ts` 2,300 | **4,900** | **6,300** |

累计投影：556,609 → **561,509**（**距档位 563,200 仅 1,691 B** ⚠️）。若 review 修复轮提前跨档位 ⇒ 按 ADR-V55-011 §4 **显式升档**（谁先越谁登记），`authorConfirmation` 保持 `pending-author-line`。登记任务 = `TASK-V55-216`。

## 7. review / validate 策略（build 前已设计）

| 阶段 | 前置判据 |
|---|---|
| review（收口前） | 双源一致性（`llm.unconfigured` 幂等）；悬置单源（第二处 ⇒ FAIL）；零 LLM 调用审计；零视图切换 |
| validate（收口） | 两场景实跑（`firstRun=false`）；S0 分支 B 必判项实跑；`law8`/`stream`/`ask-auth` 计数对账 |

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V5.5-2 叶 16 任务 / 5 波 / 1 新门禁 + S0 分支 B 必判项；预算 4,900 B 上界 6,300；累计 561,509 距档位 1,691 B） | 2026-09-22 | SDDU Tasks Agent |
