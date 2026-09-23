# 任务分解：specs-tree-v55-3-ai-driven-orchestration（V5.5-3 主题② AI 驱动编排 + 治理收口）

> **文档定位**: SDDU 任务清单（**末叶 / 收口叶**）— 将本叶技术方案分解为可并行执行的原子任务；跨切契约见父 `../tasks.md` + `../plan.md` + `ADR-V55-008~012`
> **前置依赖**: 本叶 `plan.md` v1.0 + 本叶 `spec.md` v1.0 + **前置叶 `v55-1`**（驱动者层底座 / `'answered'` 时机 / 候选恒由注册表产出）+ **`v55-2`**（配置判据 = 唯一分流依据）+ 父 `../plan.md` v1.0
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-22
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-09-22
> **更新说明**: 初始创建（V5.5-3 叶 20 任务 / 5 波：派生式三档清分 + `pressCandidate`（`op.turn` 槽复用）+ 并发仲裁有界队列 1 + 草稿回填 + 护栏六常量 + 留痕三要素 + 关断否决 + 三层共享面收口）

---

## 1. 依赖拓扑总览

```
W1 清分（前置依赖 = v55-1 + v55-2 全绿；TASK-V55-301 为 SG-V55-03 先验闸门）
  TASK-V55-301 [S] SG-V55-03 派生式清分可得性探针（先验闸门）
  TASK-V55-302 [M] op-table.ts tierOf + OP_TIER_TABLE（受 301 闸门）
  TASK-V55-303 [L] op-three-tier.test.ts 三档清分机核
  TASK-V55-304 [M] capability-wiring / sw-op-mirror 等价重锚

W2 按下（依赖 W1）
  TASK-V55-305 [M] ai-drive.ts pressCandidate 单源 + driverClass 矩阵
  TASK-V55-306 [L] op.turn 槽复用（requestTurn 仍恰 2）+ 分支 A 端到端
  TASK-V55-307 [M] 逐档反证（confirm/gesture 不可自动按下）

W3 仲裁（依赖 W2；TASK-V55-308 为 SG-V55-04 先验闸门）
  TASK-V55-308 [S] SG-V55-04 仲裁 SW 零字节 + 草稿回填 seam 探针（先验闸门）
  TASK-V55-309 [M] service-worker.ts 有界仲裁队列（受 308 闸门）
  TASK-V55-310 [M] 留痕 + 草稿回填
  TASK-V55-311 [L] turn-arbitration.test.ts 仲裁门禁

W4 护栏 + 留痕 + 关断（依赖 W3）
  TASK-V55-312 [M] guard.ts 护栏六常量单源
  TASK-V55-313 [M] 越限抑制 + 链深度截断 + driverTraceLine 留痕
  TASK-V55-314 [L] settings/panel.ts 主动性开关 + 关断否决
  TASK-V55-315 [M] proactivity-guard.test.ts 护栏门禁 + 载体零新增

W5 共享面收口（依赖 W4；TASK-V55-316 为 SG-V55-05 先验闸门）
  TASK-V55-316 [S] SG-V55-05 保护段保段可行性探针（先验闸门）
  TASK-V55-317 [L] journey.mjs 保段优先 + 段外登记
  TASK-V55-318 [M] binding.mjs 保段 + 段外登记
  TASK-V55-319 [L] 体积终轮（三叶合计）+ 跨档位显式升档登记
  TASK-V55-320 [L] 共享面收口（台账 / knownGap / 人工面 / 全门禁 + e2e）
```

---

## 2. 任务列表

### TASK-V55-301: **SG-V55-03** —— 派生式三档清分可得性探针（先验闸门）
| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | v55-1 + v55-2 全绿（叶间前置） |
| **执行波次** | W1 |
| **对应 FR** | FR-SELF-080 / 086（ADR-V55-008） |

**描述**: **spikeGate**（只读探针）。验证 `tierOf(d) = d.layer === 'sw' ? 'gesture' : (d.consent ? 'confirm' : 'auto')` 由既有 `layer`/`consent` **自动得 5/2/2** 且与 `ops.ts#IMPL` 逐字段一致（含 `op.turn` 归 `auto` 的理由）。输出五要素报告。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| NEW（临时探针，**不落版本库**） | `test/_spike/sg-v55-03-probe.mjs`（探毕删除） |

**验收标准**:
- [ ] 派生式自动得 **5/2/2** 且成员集与 spec §5.7 表一致；逐 op 与 `IMPL` 的 `riskLevel`/`consent`/`layer` 一致
- [ ] 结论 ∈ {可得 / 不可得}；**不可得 ⇒ 暂停上报**（禁引入手写清分清单，R-SELF-906）
- [ ] 探针产物不进提交

**验证命令**:
```bash
cd packages/web-cli-plugin && node -e "/* 读 ops.ts#IMPL 9 op 的 layer/consent 复算 5/2/2 */"
```
**结论义务**: 结论 = 不可得 ⇒ `TASK-V55-302/303` **不得开工**（BLK-V55-3）。

### TASK-V55-302: `op-table.ts` —— `tierOf()` + 物化 `OP_TIER_TABLE`
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55-301（SG-V55-03 结论 = 可得） |
| **执行波次** | W1 |
| **对应 FR** | FR-SELF-080（ADR-V55-008 §3） |

**描述**: `src/shared/op-table.ts` 增 `hasConsent` / `tierOf()` / 物化 `OP_TIER_TABLE`（**派生式**，9 行）。**零新增 op**（新 op 会破 5/2/2，ADR-V55-008 §4 否决）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/shared/op-table.ts` |

**验收标准**:
- [ ] `tierOf` 派生自既有 `layer`/`consent`；物化表自动得 **5/2/2** 且成员集逐字
- [ ] `OPS_BY_ID` 键集 / `MOUNT_MODE` **零新增**（T11）；改 `consent`/`layer` ⇒ 清分同步变（不可能脱钩）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && npm test
```

### TASK-V55-303: `test/op-three-tier.test.ts` —— 三档清分机核
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V55-302 |
| **执行波次** | W1 |
| **对应 FR** | FR-SELF-080~086（AC-SELF-005） |

**描述**: 新 node 门禁：清分表 = `{auto: 5, confirm: 2, gesture: 2}` 且成员集逐字；**特权 op 恰 2 恒 `gesture`**；与 `IMPL` 逐字段一致；`auto` 档**零三表写入**；**新 op 未归档 ⇒ FAIL**；逐档注入反证。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/op-three-tier.test.ts` |

**验收标准**:
- [ ] 5/2/2 + 成员集 + 逐字段一致；特权恰 2 恒 `gesture`（N-SELF-021）
- [ ] 注入「新增 op 未归档」⇒ FAIL；「新特权未归 gesture」⇒ FAIL；逐档注入各 FAIL → 还原 PASS

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test
```

### TASK-V55-304: `capability-wiring` / `sw-op-mirror` 等价重锚
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55-303 |
| **执行波次** | W1 |
| **对应 FR** | FR-SELF-081 / 086（AC-SELF-005） |

**描述**: `test/capability-wiring.test.ts`（`.request(` 语义**等价保留**、计数不减；「SW 永不 `.request(`」）+ `test/sw-op-mirror.test.ts`（≥5，三档清分加固）等价重写为三档语义。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/capability-wiring.test.ts` |
| MODIFY | `packages/web-cli-plugin/test/sw-op-mirror.test.ts` |

**验收标准**:
- [ ] 特权 op 清单恰 2；`.request(` 调用点唯一 + 手势路径断言（计数不减）
- [ ] `sw-op-mirror` ≥5；反证：AI 自动执行特权 op ⇒ FAIL

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test
```

### TASK-V55-305: `ai-drive.ts` —— `pressCandidate` 单源 + `driverClass` 权限矩阵
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55-304 |
| **执行波次** | W2 |
| **对应 FR** | FR-SELF-063 / 065（ADR-V55-010，FR-SELF-065） |

**描述**: 新建 `ai-drive.ts`：`pressCandidate` 单源 + `driverClass` 权限矩阵（仅 `'ai-driven'` 有权自动按下）+ `auto` 档**唯一**自动按下点。**候选恒由注册表 `when(ctx)` 产出**（AI **不自造候选**）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/ai-drive.ts` |

**验收标准**:
- [ ] 自动按下点**恰 1 处**；`driverClass` 矩阵机核（确定性驱动者无自动按下权）
- [ ] 反证：AI 产出非注册表 opId ⇒ FAIL（候选来源 = 注册表）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && npm test
```

### TASK-V55-306: `op.turn` 槽复用（`requestTurn` 仍恰 2）+ 分支 A 端到端
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V55-305 |
| **执行波次** | W2 |
| **对应 FR** | FR-SELF-060 / 064（AC-SELF-008，X-SELF-1 读法①） |

**描述**: 自动成回合恒经**既有** `op.turn` 槽：`pressCandidate('op.turn', text, {by})` → `dispatchChipAction` → `runOp` → `PANEL.turn` → `requestTurn`（**计数不变，仍恰 2**）。落 **S0 分支 A 端到端**（已配置 ⇒ **无需用户按键** ⇒ 自动成回合续流）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/ai-drive.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` |
| MODIFY | `packages/web-cli-plugin/test/op-wiring.test.ts` |

**验收标准**:
- [ ] `requestTurn(` **仍恰 2 处**（门禁原判据不改，X-SELF-1 未发生取代）；`maybeRecommend` 1/7 不增
- [ ] 分支 A 端到端：无需用户按键 ⇒ 流内出现回合留痕（含三要素）⇒ 续流
- [ ] 反证：新增第三个 `requestTurn(` 调用点 ⇒ FAIL

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test && npm run test:ui
```

### TASK-V55-307: 逐档反证（`confirm`/`gesture` 不可自动按下）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55-306 |
| **执行波次** | W2 |
| **对应 FR** | FR-SELF-082 / 085（N-SELF-021/025，AC-SELF-005/008） |

**描述**: 逐档注入反证：把 `confirm` 档 op（如 `op.llm-config`）交给 `pressCandidate` ⇒ FAIL；`gesture` 档（`op.authorize`/`op.perm.request`）AI 不可发起、不可代答 consent。**判定链（`zeroDiffFiles` 9 项）零触碰**。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/op-three-tier.test.ts` |

**验收标准**:
- [ ] 「AI 发起路径 ⊆（`auto` ∪ `confirm` 发起）」；「`gesture` 发起方 = 用户手势」机核
- [ ] 逐档注入各 FAIL → 还原 PASS；`zeroDiffFiles` 9 项内容哈希逐项命中

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test
```

### TASK-V55-308: **SG-V55-04** —— 仲裁 SW 零字节 + 草稿回填 seam 探针（先验闸门）
| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-V55-307 |
| **执行波次** | W3 |
| **对应 FR** | FR-SELF-061（ADR-V55-010 §4） |

**描述**: **spikeGate**（只读探针）。验证仲裁可落 `service-worker.ts`（SW bundle，**零 sidepanel 字节**）且「溢出明确拒绝 + 草稿回填（用户输入还给用户）」seam 可得。输出五要素报告。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| NEW（临时探针，**不落版本库**） | `test/_spike/sg-v55-04-probe.mjs`（探毕删除） |

**验收标准**:
- [ ] seam 清单（入队 / drain / 溢出拒绝 + 草稿回填 + 留痕）；结论 ∈ {可得 / 不可得}
- [ ] 不可得 ⇒ 暂停上报；**禁**退化为无界队列 / 静默丢弃（R-V55-106/107）
- [ ] 探针产物不进提交

**验证命令**:
```bash
cd packages/web-cli-plugin && grep -n "chatBusy" src/background/service-worker.ts | head
```
**结论义务**: 结论 = 不可得 ⇒ `TASK-V55-309/310/311` **不得开工**（BLK-V55-4）。

### TASK-V55-309: `service-worker.ts` —— 有界仲裁队列
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55-308（SG-V55-04 结论 = 可得） |
| **执行波次** | W3 |
| **对应 FR** | FR-SELF-061（X-SELF-7） |

**描述**: SW 侧有界仲裁队列：`TURN_QUEUE_MAX = 1` 常量单源 + 入队 / drain / **溢出明确拒绝**；单飞本身（同一时刻一个在飞回合）**保留**。**AI 主动撞车 ⇒ 不发起 + 留痕（不入队）**。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/background/service-worker.ts` |
| MODIFY | `packages/web-cli-plugin/src/background/chat-events.ts` |

**验收标准**:
- [ ] 队列**硬上限 1**（常量单源）；溢出路径 = 明确拒绝 + 草稿恢复（不静默）
- [ ] 仲裁结果 ∈ **闭集 4 项**（type-only 语义）；SW bundle ⇒ **零 sidepanel 字节**

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && npm test
```

### TASK-V55-310: 留痕 + 草稿回填
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55-309 |
| **执行波次** | W3 |
| **对应 FR** | FR-SELF-061 / 063（R-V55-107） |

**描述**: 面板侧接线：拒绝后 `#input.value === 被拒文本` **且**存在可读行（留痕）；「用户输入永不静默丢失」（排队 / 明确拒绝 + 草稿回填）。**零新增载体**（复用 `system` 行）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` |

**验收标准**:
- [ ] 上溢/下溢边界：空输入**不覆盖**；拒绝后草稿回填断言
- [ ] 反证：删掉回填 ⇒ FAIL；AI 撞车不发起 + 留痕

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run test:ui
```

### TASK-V55-311: `test/turn-arbitration.test.ts` —— 仲裁门禁
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V55-310 |
| **执行波次** | W3 |
| **对应 FR** | FR-SELF-061（AC-SELF-014） |

**描述**: 新 node 门禁：用户输入**零丢失**（三条路径：排队 / 明确告知 / 草稿回填）+ 队列恒 ≤1 + 仲裁闭集 4 项 + AI 撞车不发起；注入反证。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/turn-arbitration.test.ts` |

**验收标准**:
- [ ] 三条路径逐条断言；队列恒 ≤1；闭集 4 项
- [ ] 反证：用户输入被静默吞掉 ⇒ FAIL；队列无界 ⇒ FAIL

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test
```

### TASK-V55-312: `guard.ts` —— 护栏六常量单源
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55-311 |
| **执行波次** | W4 |
| **对应 FR** | FR-SELF-090~093（ADR-V55-009，R-V55-109） |

**描述**: 新建 `guard.ts`：频次 **6/10min**（滚动窗）/ 同因不重复（`driverId + ctx 摘要`）/ 静默期 **60 s** / 冷却 **= `NEXTSTEP_MIN_INTERVAL_MS` re-export（零新字面量）** / 链深度 **2** / 回合预算 **8**（口径 = 主动回合数，显式登记）。链深度 / 去重 / 静默 / 冷却状态单源。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/guard.ts` |

**验收标准**:
- [ ] 六常量**各单源**；散落零命中；冷却 **re-export**（无第二份 10_000）
- [ ] 反证：在别处写第二份常量 ⇒ FAIL

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && npm test
```

### TASK-V55-313: 越限抑制 + 链深度截断 + `driverTraceLine` 留痕
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55-312 |
| **执行波次** | W4 |
| **对应 FR** | FR-SELF-090~092 / 063（AC-SELF-006/008） |

**描述**: 越限 ⇒ **抑制 + 留痕**（非静默）；链深度达界 ⇒ 截断（达界本身**非死端**，转「需要你决定」next）；回合预算耗尽 ⇒ 停发（非死端）。`driverTraceLine` 单源：留痕三要素（`driverId` / `ts` / 依据摘要）**零明文**（复用既有 `system` 行）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/guard.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/ai-drive.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` |

**验收标准**:
- [ ] 越限抑制 + 反证；链深度截断；预算耗尽非死端
- [ ] 留痕三要素可读且零明文（摘要不含敏感值）；反证：去掉留痕 ⇒ FAIL

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run test:law8 && npm test
```

### TASK-V55-314: `settings/panel.ts` —— 主动性开关 + 关断否决
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V55-313 |
| **执行波次** | W4 |
| **对应 FR** | FR-SELF-068 / 069 / 094（ADR-V55-009） |

**描述**: 既有设置分区内新增主动性开关（**零新增分区 / 零新增必需 id**；默认 **ON** 显式登记）。关断后**所有** AI 主动停止；**主题① 不受总开关控制**（零 token / 确定性，显式登记）。否决 = 既有 consent `reject` / 中断（**零新 op / 零新协议动作**）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/settings/panel.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/guard.ts` |

**验收标准**:
- [ ] 复用既有 settings 存储与分区；键名单源；偏读一个函数（R-V55-108）
- [ ] 关断后「AI 主动零发起」+「主题① 仍工作」；默认值实现与文书**同源**

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && npm test
```

### TASK-V55-315: `test/proactivity-guard.test.ts` —— 护栏门禁 + 载体零新增
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55-314 |
| **执行波次** | W4 |
| **对应 FR** | FR-SELF-090~097（AC-SELF-006） |

**描述**: 新 node 门禁：六常量单源 + 散落零命中 + 越限抑制 + 关断 + 链深度截断 + 预算耗尽非死端 + **载体零新增**（12 kind / `REGISTERED_STRUCTURAL_HOSTS === []` / `KIND_SET` 40 逐字）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/proactivity-guard.test.ts` |

**验收标准**:
- [ ] 六项单源（散落零命中）+ 越限真抑制 + 关断后零主动且主题① 仍工作
- [ ] 载体零新增：12 kind / 零宿主 / `KIND_SET` 40 逐字；未落地须显式登记（N-SELF-026）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test
```

### TASK-V55-316: **SG-V55-05** —— 保护段保段可行性探针（先验闸门）
| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-V55-315 |
| **执行波次** | W5 |
| **对应 FR** | FR-SELF-112（ADR-V55-012，AC-SELF-018） |

**描述**: **spikeGate**（只读探针）。验证 journey `43054..58287` / sha `cc79f413…` 与 binding `107780..115930` / sha `be9ad0e9…` 在本 Feature 改动下可**保段**（段前偏移等长补偿预算）。输出五要素报告。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| NEW（临时探针，**不落版本库**） | `test/_spike/sg-v55-05-probe.mjs`（探毕删除） |

**验收标准**:
- [ ] 给出保段可行性结论（含段前偏移 / 等长补偿预算）；结论 ∈ {保段可得 / 需八步取代 / 不可行}
- [ ] journey 不可行 ⇒ 走**八步显式取代**；binding 不可行 ⇒ 暂停上报（`decision=keep`）
- [ ] 探针产物不进提交

**验证命令**:
```bash
cd packages/web-cli-plugin && grep -n "43054\|107780" test/ui/journey.mjs test/ui/binding.mjs | head
```
**结论义务**: 写入 build 记录；结论 = 不可行 ⇒ `TASK-V55-317/318` 按停止规则处置（BLK-V55-5）。

### TASK-V55-317: `journey.mjs` —— 保段优先 + 段外登记
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V55-316 |
| **执行波次** | W5 |
| **对应 FR** | FR-SELF-112（AC-SELF-018） |

**描述**: journey 保护段 `43054..58287` / 240 行 / 3 链节 **保段优先**；**保段** ⇒ 段内零字节；段外改写**逐行登记**且**计数守恒 ≥171** + RP-V4-08 反证。若必须改 ⇒ **八步显式取代**。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/ui/journey.mjs` |
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json`（仅取代时） |

**验收标准**:
- [ ] 段内零字节（sha + startByte 双不变）或八步取代留痕；段外逐行登记
- [ ] `test:journey` ≥171；RP-V4-08 实跑（段内 1 byte 必红 / 段外不红 / 逐字节还原）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run test:ui
```

### TASK-V55-318: `binding.mjs` —— 保段 + 段外登记
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55-316 |
| **执行波次** | W5 |
| **对应 FR** | FR-SELF-112（AC-SELF-018） |

**描述**: binding 保护段 `107780..115930` / sha `be9ad0e9…`（`decision = keep`）**保段**；段外改写**逐行登记**。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/ui/binding.mjs` |

**验收标准**:
- [ ] 段内零字节（sha + 偏移双不变）；`test:binding` ≥192
- [ ] 反证：段内 1 byte 改动 ⇒ RP-V4-08 必红

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run test:binding
```

### TASK-V55-319: 体积终轮（三叶合计）+ 跨档位显式升档登记
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V55-318 |
| **执行波次** | W5 |
| **对应 FR** | FR-SELF-120~124（AC-SELF-023/024，ADR-V55-011） |

**描述**: **体积终轮**：三叶合计五要素重登记（时间线只追加 + metafile 归因 ΣΔ + glue == 登记增量）；`size-baseline.ts` 五要素 + V3-VOL-3 三值同源；**跨档位显式升档登记**（档位 → `ceilTo50KB(实测)` / 绝对上限 → ×1.10 / 生效上限同源前移）；`authorConfirmation` 保持 `pending-author-line`（**不得伪称已确认**）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/size-baseline.ts` / `size-budget` / `size-growth-evidence` / `size-ruling-vol3` |
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json`（`v3Vol3Closeout` 三值同源） |
| MODIFY | `packages/web-cli-plugin/docs/v4-density-baseline.json`（仅越档位时 `volume` 段显式升档；31 格与阈值逐字不动） |

**验收标准**:
- [ ] 五要素齐备；`SIDEPANEL_CEILING_CAP === 'record-only'`；三值同源；`test:size-ruling-vol3` ≥12
- [ ] 越档位 ⇒ **显式**升档（非静默）；**未越 ⇒ 如实登记「未跨档位」**（二态）；`authorConfirmation.status` 枚举合法且未伪称确认
- [ ] 红线逐字节：`content.js` 177,076 / `pick-layer.js` 34,358 / 判定链哈希 / `docs/v3-supersession-ledger.json` 零 diff

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run size:attribution && npm run test:size-ruling-vol3
```

### TASK-V55-320: 共享面收口（台账 / `knownGap` / 人工面 / 全门禁 + e2e）
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V55-319 |
| **执行波次** | W5（收口轮·终局） |
| **对应 FR** | FR-SELF-003 / 004 / 107 / 113 / 114 / 115 / 116（AC-SELF-019/020/021/025/026） |

**描述**: **三叶共享面恰一次收口**：① 取代台账 X-SELF-1~7 **逐项对账**（X-SELF-1「未发生取代」如实登记）；② `knownGap` 一致性（`status = complete-steps-1-8` ⇒ 空或仅声明闭环）；③ **人工面汇总**（三叶面逐项 `⏳`/`PASS`，**v5 人工面 9 项零改写**，不得冒充 PASS）；④ **全 Feature 计数对账** + 全门禁**串行**复跑 + `e2e` PASS；⑤ 新增门禁入受审集合（`CHROMIUM_GATES === 9` 不动）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/supersession-ledger.test.ts` |
| MODIFY | `packages/web-cli-plugin/test/gate-integrity.test.ts` |
| MODIFY | `packages/web-cli-plugin/package.json`（`test:v3` 串行链追加本叶 3 新门禁；**无新依赖**） |
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` |
| MODIFY | `.sddu/.../specs-tree-v55-3-ai-driven-orchestration/TREE.md` / `state.json` |

**验收标准**:
- [ ] 台账 X-SELF-1~7 逐项 + `knownGap` 一致；`test:supersession` ≥36
- [ ] 人工面逐项 `⏳`/`PASS`，v5 9 项零改写；`test:gate-integrity` ≥15；`CHROMIUM_GATES === 9` 逐字
- [ ] 全门禁**串行**全绿 + `e2e` PASS；全 Feature 计数 ≥ §9.5 逐项基线；`ROADMAP.md` / `packages/web-cli-base/**` / `design/**` 零 diff

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run test:v3
```

---

## 3. 任务汇总

| 统计项 | 数值 |
|--------|:--:|
| 总任务数 | 20 |
| S 级 (简单) | 1 |
| M 级 (中等) | 8 |
| L 级 (复杂) | 11 |
| 执行波次 | 5 |
| 新增门禁 | 3（op-three-tier / proactivity-guard / turn-arbitration） |
| spikeGate | 3（SG-V55-03 / SG-V55-04 / SG-V55-05） |
| 体积预算 | 5,900 B（上界 7,600） |

### 3.1 build 完成登记（2026-09-23）

| 波次 | 任务 | 状态 | 轮次 |
|:--:|------|:--:|:--:|
| W1 | TASK-V55-301~304 | ✅ completed（SG-V55-03 = 可得） | R1 |
| W2 | TASK-V55-305~307 | ✅ completed | R1 |
| W3 | TASK-V55-308~311 | ✅ completed（SG-V55-04 = 可得；`turn-arbitration` 6 用例） | R2 |
| W4 | TASK-V55-312~315 | ✅ completed（`proactivity-guard` 7 用例；六常量单源） | R2 |
| W5 | TASK-V55-316~320 | ✅ completed（SG-V55-05 = 保段可得 ⇒ 317/318 零文件改写；S0-A 端到端双面 59/0；红线终核 12 项；体积定稿 Δ0 未跨档位） | R3 |

R2 出线：`npm test` **1312 / 0**（1299 + 13）；`dist/sidepanel.js` **573,424 B**（566,535 + 6,889）；`test:journey` 171 保段；`binding` 环境性 FAIL（KL-N-10，基线复现）。详见 `build.md` v1.1。

**R3 出线（W5 收口轮，2026-09-23）**：`npm test` **1319 / 0**（1312 + 7 只增）；`test:s0-self-driven` **59 / 0**（45 + 14 只增）；`test:supersession` **37**（+1：红线终核 12 项）；`test:gate-integrity` **19**（+1：V5.5-3 受审集合，`CHROMIUM_GATES === 9` 逐字不动）；**体积 Δ = 0**（`src/**` 零字节改动）⇒ 五要素终值 **573,424 / 602,095 / 614,400 / 675,840 / `pending-author-line`**，**未跨档位**（无需升档）；**SG-V55-05 = 保段可得**（journey `43054..58287` / binding `107780..115930` sha 双命中，两文件零 diff）；取代台账 X-SELF-1~7 三叶对账终态落 `docs/v4-supersession-ledger.json#xSelfLedgerCloseout`。详见 `build.md` v1.2 §8。

## 4. 执行策略

| 波次 | 任务 | 策略 |
|:--:|------|------|
| W1 | 301–304 | **301 先于 302/303**（闸门）；304 与 303 可并行 |
| W2 | 305–307 | 串行（305 → 306 → 307） |
| W3 | 308–311 | **308 先于 309–311**（闸门）；310/311 依赖 309 |
| W4 | 312–315 | 串行（312 → 313 → 314 → 315） |
| W5 | 316–320 | **316 先于 317/318**（闸门）；317/318 可并行；319 → 320（串行收口） |

## 5. 本叶验收门禁清单

`typecheck` · `build` · `npm test`（≥1181 增）· `op-wiring`（**`requestTurn(` 仍恰 2**）· `local-act-wiring` · `authorize-chip-wiring` · `capability-wiring`（`.request(` 语义等价保留）· `sw-op-mirror`（≥5）· `op-protocol`（≥6，`KIND_SET` 40 逐字）· `test:auth-chip`（≥37）· `test:l0`（≥248）/ `test:density`（≥242，阈值逐字）· `test:journey`（≥171，**保段优先**）· `test:binding`（≥192，**保段**）· `test:stream`（≥73）· `test:ask-auth`（≥71）· `test:dead-end`（≥39）· `test:insight`（118）/ `hardening`（24）/ `l1`（116）/ `l2`（74）/ `l1-reverse`（9）/ `l2-reverse`（10）/ `ref-pick-wiring`（11）/ `page-input`（108）/ `zero-injection`（28）/ `design-contract`（19）· `e2e` PASS · **新 3 门禁**（三档清分 / 护栏 / 仲裁）· `test:gate-integrity`（≥15 增，`CHROMIUM_GATES === 9` 逐字）· `size-*` + `test:size-ruling-vol3`（12）· `test:supersession`（≥36）

**共享面义务（三叶恰一次收口）**：① 体积五要素（含**跨档位显式升档**或如实登记「本 Feature 未跨档位」）；② journey `43054..58287` + binding `107780..115930` 保护段（**保段**或八步取代留痕）；③ 取代台账（X-SELF-7 + 逐项对账 + `knownGap` 一致性）；④ 人工面汇总（三叶面逐项 `⏳`/`PASS`，**v5 人工面 9 项零改写**）。

## 6. 体积预算（本叶）

| 构成 | 预算 | 上界 |
|---|--:|--:|
| `guard.ts` 1,700 · `ai-drive.ts` 1,400 · `shared/op-table.ts` 300 · `sidepanel.ts` 2,000 · `settings/panel.ts` 350 · 其余 150 | **5,900** | **7,600** |

**R3 终值（`TASK-V55-319` 定稿，二态显式）**：三叶合计实测 **573,424 B**（R1 +2,755 + R2 +6,889 + R3 **+0** = 本叶 **+9,644 B** ⇒ **超叶预算 5,900（超 3,744 B）∧ 亦越上界 7,600（超 2,044 B）**，逐条如实登记；超额全部发生在 R1/R2，根因 = 计划侧低估，R3 零增重）；**573,424 < 档位 614,400 ⇒ 「未跨档位」**（**无需升档**，档位 / 绝对上限 / 生效上限 602,095 三值同源未动）；`authorConfirmation` 保持 **`pending-author-line`**（**未伪称已确认**）。登记载体 = `test/size-baseline.ts#SIDEPANEL_V553_FINAL_ROUND`（`direction: 'unchanged'`，Δ 0）+ `docs/v4-density-baseline.json#volume.v553FinalRound`。

## 7. review / validate 策略（build 前已设计）

| 阶段 | 前置判据 |
|---|---|
| review（收口前） | 安全边界审查（R-SELF-001 最高危：越档 / 代答 consent）；护栏空转审计（越限真抑制）；仲裁有界性 |
| validate（收口） | 全 Feature 全门禁串行 + `e2e` PASS；体积终轮；保护段；台账；人工面逐项标注 |

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V5.5-3 叶 20 任务 / 5 波 / 3 新门禁 / 3 spikeGate；预算 5,900 B 上界 7,600；累计 567,409 **预计越档位 +4,209** ⇒ 显式升档预案） | 2026-09-22 | SDDU Tasks Agent |
