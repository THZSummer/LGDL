# 任务分解：specs-tree-v55-1-driver-layer（V5.5-1 驱动者层 + 法七扩展底座）

> **文档定位**: SDDU 任务清单（**首叶 / 底座叶**）— 将本叶技术方案分解为可并行执行的原子任务；跨切契约见父 `../tasks.md` + `../plan.md` + `ADR-V55-001~005`
> **前置依赖**: 本叶 `plan.md` v1.0 + 本叶 `spec.md` v1.0 + 父 `../plan.md` v1.0（红线 / 体积预算 / 波次 / 门禁清单）
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-22
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-09-22
> **更新说明**: 初始创建（V5.5-1 叶 25 任务 / 4 波：声明单源 + 四元组机核 + `'answered'` 时机源 + `ref-action` 时机侧重锚 + 驱动者终态词汇 + 答案驱动化 + describe 补齐 + 迟到作答 + S0 样本单源与双面 + 6 新门禁）

---

## 1. 依赖拓扑总览

```
W1 声明单源 + SG-V55-01（无依赖，可并行）
  TASK-V55-101 [M] drivers.ts 声明单源
  TASK-V55-102 [M] terminals.ts 终态词汇单源
  TASK-V55-103 [S] RecommendTrigger 类型外移
  TASK-V55-104 [S] SG-V55-01 注册表内扩张三断言探针（先验闸门）
  TASK-V55-105 [M] driver-timings.test.ts 时机源单源门禁
  TASK-V55-106 [M] NextCtx 加法字段 + CTX_FIELD_SERVICE

W2 四元组 / 双向包含 / 终态词汇 + 受审集合（依赖 W1）
  TASK-V55-107 [M] providers.ts 驱动者行登记 + ref-action 时机声明
  TASK-V55-108 [M] driver-quadruple 四元组抽取机核
  TASK-V55-109 [M] 双向包含 + 悬空 + 三类注入反证
  TASK-V55-110 [M] driver-terminals 三段控制
  TASK-V55-111 [M] 时机 ↔ 驱动者映射 + 答完恰 ≥1 + 七类逐类
  TASK-V55-112 [S] gate-integrity 受审集合追加

W3 nextAfterSettle + 'answered' + 答案驱动化（依赖 W2）
  TASK-V55-113 [M] nextAfterSettle 单入口
  TASK-V55-114 [M] 'answered' 触发通路
  TASK-V55-115 [M] applyRefAction = 裁决 + 驱动
  TASK-V55-116 [M] submitDescribe 补齐驱动
  TASK-V55-117 [M] 后台 ask 迟到作答非死端
  TASK-V55-118 [M] X-SELF-4/5/6 等价重锚

W4 S0 双面 + 法七门禁 + 体积 + 收尾（依赖 W3；TASK-V55-119 为 SG-V55-02 先验闸门）
  TASK-V55-119 [S] SG-V55-02 S0 真链 seam 探针（先验闸门）
  TASK-V55-120 [L] s0-chain.mjs 样本单源（受 119 闸门）
  TASK-V55-121 [L] s0-self-driven-chain.test.ts node 面
  TASK-V55-122 [L] s0-self-driven.mjs Chromium 面（分支 A 机制侧 + 分支 B 识别侧）
  TASK-V55-123 [M] law7x-ext.test.ts 法七扩展门禁
  TASK-V55-124 [M] no-dead-end.mjs 判据升级
  TASK-V55-125 [M] 体积五要素 + 台账 + 本叶收尾
```

**叶内顺序铁律**（`plan.md §4`）：**先声明单源 → 再机核 → 再让「答完会重跑」可证 → 再落驱动语义**（若倒序，会先撞 `maybeRecommend` 调用点计数门禁）。

---

## 2. 任务列表

### TASK-V55-101: `drivers.ts` —— 驱动者声明单源
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | 无 |
| **执行波次** | W1 |
| **对应 FR** | FR-SELF-010~019 / 030~036（父 §5.2 / §5.4） |

**描述**: 新建驱动者声明**唯一**单源：`DRIVER_TIMINGS`（闭集 **5**，含 `'answered'`，旧 4 逐字）、`PROACTIVE_MOMENTS`（**恰 7** 类时刻）、`DRIVER_CLASS`（`'deterministic' | 'ai-driven'`）、`CTX_FIELD_SERVICE`（字段 → 既有 `NEXT_SERVICES` 服务面单一映射）、四元组抽取 helper（`driverId`/`timing`/`evidence`/`ops`）、去重键（`driverId + ctx 摘要`）、`timingOfSettle`。**只声明，不接主流程**。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/drivers.ts` |

**验收标准**:
- [ ] `DRIVER_TIMINGS` 元素**恰 5** 且含 `'answered'`，旧 4（`'pick'`/`'stale'`/`'idle'`/`'firstRun'`）**逐字**仍在（AC-SELF-009）
- [ ] `PROACTIVE_MOMENTS` **恰 7**；`DRIVER_CLASS` 每驱动者**恰属一类**（FR-SELF-012/017）
- [ ] 四元组可从源抽取；`CTX_FIELD_SERVICE` 为**唯一**映射表（FR-SELF-011/019）
- [ ] 零 `maybeRecommend(` / `requestTurn(` 新增（本任务不碰主流程）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && node -e "const s=require('fs').readFileSync('src/ui/sidepanel/next-registry/drivers.ts','utf8'); if(!/DRIVER_TIMINGS/.test(s)||!/PROACTIVE_MOMENTS/.test(s)) process.exit(1)"
```

### TASK-V55-102: `terminals.ts` —— 驱动者终态词汇单源（4）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | 无 |
| **执行波次** | W1 |
| **对应 FR** | FR-SELF-020 / 023（父 §5.3） |

**描述**: 新建**正交**单源 `DRIVER_TERMINALS`：`answered-ref` / `answered-op` / `answered-bg` / `describe-submitted`（**恰 4**）。导出与 `STREAM_TERMINALS`（**6 逐字不动**）的正交校验（交集为空）。**不得**改 `stream-model.ts` / `definition.ts` 既有常量。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/terminals.ts` |

**验收标准**:
- [ ] `DRIVER_TERMINALS` **恰 4** 项、第二声明零命中（ADR-V55-003）
- [ ] 与 `STREAM_TERMINALS` 6 项**交集为空**、6 项逐字未改（R-V55-103）
- [ ] 「已答」四口径（非取消且非空 = 已答 / 取消另记 / `ASK_CANCEL_REASONS` 4 项不变 / 后台迟到不记）显式导出（FR-SELF-023）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && node -e "const t=require('fs').readFileSync('src/ui/sidepanel/next-registry/terminals.ts','utf8'); if((t.match(/answered-/g)||[]).length<3) process.exit(1)"
```

### TASK-V55-103: `RecommendTrigger` 类型外移 re-export
| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-V55-101 |
| **执行波次** | W1 |
| **对应 FR** | FR-SELF-030 / 032（X-SELF-2 读法①） |

**描述**: 把 `RecommendTrigger` 类型从 `sidepanel.ts:1791` **移出**到 `drivers.ts` 单源，`sidepanel.ts` / `recommend.ts` 改 re-export。**零第二声明**、**零语义改写**（值集扩张在 TASK-V55-114 落）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/recommend.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` |
| MODIFY | `.../next-registry/drivers.ts` |

**验收标准**:
- [ ] 全仓 `RecommendTrigger` 类型**恰一处**定义（`drivers.ts`），其余为 re-export（FR-SELF-032）
- [ ] `sidepanel.ts` 原类型行外移，**旧 4 项逐字**；防抖三常量（`NEXTSTEP_MIN_INTERVAL_MS=10000` / 单卡 ≤3 / 每回合 ≤1）**逐字不动**（FR-SELF-034）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && grep -rn "type RecommendTrigger" src | wc -l
```

### TASK-V55-104: **SG-V55-01** —— 注册表内等价扩张三断言探针（先验闸门）
| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-V55-101 / 103 |
| **执行波次** | W1 |
| **对应 FR** | FR-SELF-100 / 030 / 033（ADR-V55-001/002） |

**描述**: **spikeGate**（只读探针，不落版本库）。验证三条假设：① AI 经**既有** `op.turn` 槽无用户按键可达，且 `requestTurn(` **仍恰 2**；② `RecommendTrigger` 值集 **4→5** 可行且旧 4 逐字、求值入口**仍恰 1 定义**；③ `nextAfterSettle` 单入口可承接 `'answered'`（定义恰 1）。输出「假设 / 探针方法 / 实跑证据 / 结论 / 对下游影响」五要素报告。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| NEW（临时探针，**不落版本库**） | `test/_spike/sg-v55-01-probe.mjs`（探毕删除） |

**验收标准**:
- [ ] 三断言各给出**实跑证据**（命令 + 输出）；`requestTurn(` 调用点计数 == 2；`maybeRecommend(` 1 定义 / 7 调用点（FR-SELF-015）
- [ ] 结论 ∈ {可行 / 不可行}；**不可行 ⇒ 暂停上报并触发 X-SELF-1/2 显式放宽路径**（读法②：具名入口集 + 等价重锚 + 台账留痕），**禁静默放宽**
- [ ] 探针产物**不进入**提交（`git status --short` 无新增探针文件）

**验证命令**:
```bash
cd packages/web-cli-plugin && grep -rn "requestTurn(" src/ui/sidepanel/sidepanel.ts | wc -l && grep -rn "maybeRecommend(" src | wc -l
```
**结论义务**: 写入本叶 build 记录；结论 = 不可行 ⇒ `TASK-V55-113/114/306` **不得开工**（BLK-V55-1）。

### TASK-V55-105: `test/driver-timings.test.ts` —— 时机源单源门禁
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55-101 / 103 |
| **执行波次** | W1 |
| **对应 FR** | FR-SELF-030 / 032 / 033 |

**描述**: 新 node 门禁（`JUDGEMENTS` + `expectFailPattern`，由 `NODE_GATE_MARKER` 自动纳入 `gate-integrity`）。机核：时机源**恰一处**声明 / **恰 5** 含 `'answered'` / 旧 4 逐字 / 散落字面量零命中 / 求值入口**恰 1 定义**。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/driver-timings.test.ts` |

**验收标准**:
- [ ] 5 条判据全绿；反证：删旧 4 任一项 / 新增第 5 项却未入单源 / 新增第二个推荐器 ⇒ 各 FAIL，还原 PASS（两段证据）
- [ ] 门禁纳入受审集合（配合 `TASK-V55-112`）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test
```

### TASK-V55-106: `NextCtx` 加法字段 + `CTX_FIELD_SERVICE` 登记
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55-101 |
| **执行波次** | W1 |
| **对应 FR** | FR-SELF-011 / 019（ADR-V55-001 §2.3 硬规则） |

**描述**: `definition.ts` 的 `NextCtx` **只允许加法**：既有 7 键不改名不删；新增 **1 个字段组** `session.proactive: { enabled: boolean; allowed: boolean }`（来源 = 持久偏好 + 护栏状态，属既有 `session` 服务面）。`drivers.ts#CTX_FIELD_SERVICE` 登记 `字段 → 服务`；注册校验对未登记字段 **loud 拦截**（EC-SELF-003）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `.../next-registry/definition.ts` |
| MODIFY | `.../next-registry/drivers.ts` |

**验收标准**:
- [ ] 既有 7 键**零改名 / 零删除**；新增字段**由既有服务面派生**且已登记（FR-SELF-011）
- [ ] 反证：加一个未登记字段 ⇒ 注册校验 **FAIL**；还原 PASS

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && npm test
```

### TASK-V55-107: `providers.ts` 驱动者行登记 + `ref-action` 时机声明
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55-101~103 / 106 |
| **执行波次** | W2 |
| **对应 FR** | FR-SELF-010 / 031（X-SELF-2） |

**描述**: 在 `providers.ts` 为既有 provider 补驱动者声明行（`driverClass` / `timings` / `moments` / `priority`）+ `ref-action` 的**时机声明**。**`ref-action.when` 行零改字节**（R-V55-102；答完 ⇒ 结算在同一次 dispatch 内完成 ⇒ `openAsks===0` 自然成立）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `.../next-registry/providers.ts` |

**验收标准**:
- [ ] 驱动者行登记完整；`when` 逐字**零改字节**（`git diff` 该行不改）
- [ ] 旧 4 时机语义逐条保留；`next-registry.test.ts` 计数 ≥16（只增）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test && git diff --stat -- src/ui/sidepanel/next-registry/providers.ts
```

### TASK-V55-108: `test/driver-quadruple.test.ts` —— 四元组抽取机核
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55-101 / 107 |
| **执行波次** | W2 |
| **对应 FR** | FR-SELF-011 / 016（AC-SELF-015） |

**描述**: 新 node 门禁：每个驱动者可机核四元组 `driverId` / `timing ∈ 时机闭集` / `evidence ⊆ NEXT_SERVICES 派生面` / `ops ⊆ 9 opId`（**无悬空**）。抽样自源文本（非人工对账）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/driver-quadruple.test.ts` |

**验收标准**:
- [ ] 四元组全绿；任一驱动者缺任一元 ⇒ FAIL（反证）；`chips` 悬空 ⇒ FAIL
- [ ] 与 `next-obligation-table`(≥10) 形态一致（复用 v5 义务表机核形态）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test
```

### TASK-V55-109: 双向包含 + 悬空 + 三类注入反证
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55-108 |
| **执行波次** | W2 |
| **对应 FR** | FR-SELF-010 / 019（N-SELF-022 / AC-SELF-002） |

**描述**: 机核「**驱动者集合 ≡ 注册表 provider 集合**」**双向包含**：`listProviders()` ↔ `DRIVERS` 键集。三类注入反证：**多一行**（表有注册表无）/**少一行**（注册表有表无）/**悬空**（chips 指向不存在 opId）各 FAIL → 还原 PASS。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/driver-quadruple.test.ts` |

**验收标准**:
- [ ] 双向包含断言绿；三类注入**各 FAIL** 且还原后 PASS（逐字节 sha256 前后相同）
- [ ] 悬空 chips ⇒ FAIL（FR-SELF-016）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test
```

### TASK-V55-110: `test/driver-terminals.test.ts` —— 三段控制（禁恒真）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55-102 |
| **执行波次** | W2 |
| **对应 FR** | FR-SELF-020~024（ADR-V55-003） |

**描述**: 新 node 门禁：终态词汇**恰 4** / 与 `STREAM_TERMINALS` **6 正交**（交集空 + 6 逐字）/ 第二声明 ⇒ FAIL。**三段控制（禁恒真）**：① 正常 ⇒ 绿 ② 端态存在但驱动者被移除 ⇒ **必红** ③ 端态不存在 ⇒ **不要求**。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/driver-terminals.test.ts` |

**验收标准**:
- [ ] 三段控制逐段实跑证据齐备；「已答」在取消 / 空值注入下**必不成立**（FR-SELF-023）
- [ ] `STREAM_TERMINALS` 6 逐字不变（R-V55-103）；`ASK_CANCEL_REASONS` 4 项逐字

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test
```

### TASK-V55-111: 时机 ↔ 驱动者映射表 + 「答完之后恰 ≥1 驱动者」
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55-107 / 108 |
| **执行波次** | W2 |
| **对应 FR** | FR-SELF-012 / 013 / 036 |

**描述**: 维护「时机源 × 驱动者」映射表（自源文本抽取机核）；七类时刻**逐类**断言「存在 ≥1 个驱动者归属」；断言「答完之后恰 ≥1 个驱动者接手」。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `.../next-registry/drivers.ts` |
| MODIFY | `packages/web-cli-plugin/test/driver-quadruple.test.ts` |

**验收标准**:
- [ ] 映射表行数 / 元素集与注册表**同源**一致；七类逐类绿（FR-SELF-012）
- [ ] 注入「映射表多一行 / 少一行 / 悬空 timing」三类反证**各 FAIL** → 还原 PASS（FR-SELF-036）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test
```

### TASK-V55-112: `gate-integrity` 受审集合追加
| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-V55-105 / 108 / 110 |
| **执行波次** | W2 |
| **对应 FR** | FR-SELF-115（AC-SELF-021） |

**描述**: `test/gate-integrity.test.ts` 追加本叶新 node 门禁到受审集合：`NODE_GATE_MARKER` 目录扫描**双命中** + `V55_NEW_GATE_FILES` 下界声明（本叶 ≥4）。**`CHROMIUM_GATES === 9` 逐字不动**。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/gate-integrity.test.ts` |

**验收标准**:
- [ ] `V55_NEW_GATE_FILES` 下界只增；本叶新门禁逐项在受审集合内；反证：移出一项 ⇒ FAIL
- [ ] `CHROMIUM_GATES === 9` 逐字（FR-SELF-115）；`test:gate-integrity` ≥15

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run test:gate-integrity
```

### TASK-V55-113: `nextAfterSettle` 单入口
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55-104（SG-V55-01 结论 = 可行）/ 107 / 111 |
| **执行波次** | W3 |
| **对应 FR** | FR-SELF-015 / 033（ADR-V55-001） |

**描述**: `reachableNext` → **`nextAfterSettle`** 重命名（**同一闭合**）；定义**恰 1**；`maybeRecommend(` **定义 1 / 调用点 7 不增**。`op-wiring` 增「主流程 diff = 0」复合读数（`requestTurn(` 仍恰 2 / `maybeRecommend` 1/7 / `nextAfterSettle` 1）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `.../next-registry/ops.ts` / `pipeline.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` |
| MODIFY | `packages/web-cli-plugin/test/op-wiring.test.ts` |

**验收标准**:
- [ ] `nextAfterSettle(` 定义恰 1；`maybeRecommend(` 定义 1 / 调用点 7；`requestTurn(` 恰 2（**原判据不改**）
- [ ] 反证：新增第 8 个 `maybeRecommend(` 调用点 ⇒ FAIL（R-V55-101）

**验证命令**:
```bash
cd packages/web-cli-plugin && grep -rn "nextAfterSettle(" src | wc -l && npm test
```

### TASK-V55-114: `'answered'` 触发通路
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55-113 |
| **执行波次** | W3 |
| **对应 FR** | FR-SELF-031 / 034 / 035（AC-SELF-009） |

**描述**: 在**既有**单一求值入口内新增 `'answered'` 触发点：**答完之后恰在一次 `'answered'` 求值内产出 next**（不新增调用点）。`test/ui/recommendation.mjs`（65→**增**）+ `test/recommendation-sources.test.ts`（时机集 ≥5 含 `'answered'` 且旧 4 逐字）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` |
| MODIFY | `packages/web-cli-plugin/test/recommendation-sources.test.ts` |
| MODIFY | `packages/web-cli-plugin/test/ui/recommendation.mjs` |

**验收标准**:
- [ ] 答完恰一次求值内产出 next；防抖三常量逐字不动（FR-SELF-034）
- [ ] 反证：把时机删掉 ⇒ FAIL（复现会话 B 静默，R-SELF-002）
- [ ] `test:recommendation` ≥65

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run test:recommendation && npm test
```

### TASK-V55-115: `applyRefAction` = 裁决 + 驱动（X-SELF-5）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55-114 |
| **执行波次** | W3 |
| **对应 FR** | FR-SELF-022 / 025 / 026（N-SELF-023 / AC-SELF-010） |

**描述**: `applyRefAction` 从「裁决 + 计数」重定义为「**裁决 + 驱动**」：有效 ⇒ 答案交 `nextAfterSettle({kind:'answered', terminal})` + 悬置任务登记（恰 1 处）；无效 ⇒ 既有阻塞终态 + 可达 next。**调用点仍恰 1**。`commandSends` **保留 + 显式登记消费面**（COR-1：1 只读投影 + 3 测试、零驱动语义）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` |
| MODIFY | `packages/web-cli-plugin/test/l1-ref-validity.test.ts` |

**验收标准**:
- [ ] 「有效 ⇒ 驱动」与「无效 ⇒ 阻塞终态 + 可达 next」两条路径逐条断言（FR-SELF-025）
- [ ] 「`sends` 递增**不足以**满足本判据」断言；`commandSends` 消费面登记与实测一致（FR-SELF-026）
- [ ] `test:l1`(116) / `test:page-input`(108) 计数不减；反证：恢复「只计数」⇒ FAIL

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run test:l1 && npm run test:page-input && npm test
```

### TASK-V55-116: `submitDescribe` 补齐驱动（X-SELF-6）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55-115 |
| **执行波次** | W3 |
| **对应 FR** | FR-SELF-027（AC-SELF-011） |

**描述**: `submitDescribe` 在 `ask-resolved` 留痕之后**必须**产生可判驱动（流内可达 next / 自动续接），**不得**止于 `dispatch`。空描述 ⇒ **卡内校验、零副作用、不入终态**（**逐字保留**）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` |
| MODIFY | `packages/web-cli-plugin/test/ui/ask-auth-inflow.mjs` |

**验收标准**:
- [ ] 「已交描述 ⇒ 驱动」链路机核；空描述零副作用 + **不入终态**（FR-SELF-027）
- [ ] `test:ask-auth` ≥71；反证：恢复「只 dispatch」⇒ FAIL

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run test:ask-auth
```

### TASK-V55-117: 后台 ask 迟到作答非死端
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55-115 |
| **执行波次** | W3 |
| **对应 FR** | FR-SELF-028（AC-SELF-011，ADR-V55-004 §3） |

**描述**: `askBridge.settle` 在回合已结束时返回 `{settled:false, late:true}`（SW bundle，**零 sidepanel 字节**）；流内**固化该事实**（「回合已结束，未接住该答案」）+ 给出**可达 next**（重发 / 重新提问 / 改用描述）。**不裸 `errorResponse`**、**不记「已答」**。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/background/service-worker.ts` / `ask-bridge.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` |
| MODIFY | `packages/web-cli-plugin/test/ask-bridge.test.ts` |

**验收标准**:
- [ ] 迟到路径「固化 + 可达 next」断言；与 FR-SELF-023 ④ 口径一致（不记已答）
- [ ] 反证：恢复为裸 `errorResponse`（无固化无 next）⇒ FAIL

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test
```

### TASK-V55-118: X-SELF-4/5/6 等价重锚
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55-115~117 |
| **执行波次** | W3 |
| **对应 FR** | FR-SELF-103 / 104 / 105 / 110 / 111（AC-SELF-016/017） |

**描述**: 三处既有门禁**等价重写为新语义**（改写 ≠ 删除）：`blocked-terminals`(9 逐字不变) / `next-registry`(≥16) / `test:law8`(≥25 增：留痕零明文)。每处留「注入 FAIL → 逐字节还原 PASS」两段证据。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/blocked-terminals.test.ts` / `next-registry.test.ts` |
| MODIFY | `packages/web-cli-plugin/test/ui/law8-plaintext.mjs` |

**验收标准**:
- [ ] 三处计数 ≥ 基线（只增）；无断言删除 / 降级
- [ ] 每处 ≥1 注入反证（实跑 FAIL + 还原 PASS + sha256 前后相同）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test && npm run test:law8
```

### TASK-V55-119: **SG-V55-02** —— S0 真链 seam 探针（先验闸门）
| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-V55-117 |
| **执行波次** | W4 |
| **对应 FR** | FR-SELF-130（ADR-V55-005 §1，R-SELF-908） |

**描述**: **spikeGate**（只读探针）。验证 headless 下 S0（真机 22:49 序列）可经**真实驱动路径**复刻（绑定→探测→拾取→ask→作答→**驱动**→双分支），**不得假 provider**。输出五要素报告。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| NEW（临时探针，**不落版本库**） | `test/_spike/sg-v55-02-probe.mjs`（探毕删除） |

**验收标准**:
- [ ] 给出可注入 seam 清单（`when(ctx)` / 驱动者产出 / 回合输入可判）；结论 ∈ {可行 / seam 不足}
- [ ] `git status --short` 无新增探针文件
- [ ] **seam 不足 ⇒ 回 v55-1 补可注入 `when(ctx)`**，禁以场景脚本假绿替代链路可判

**验证命令**:
```bash
cd packages/web-cli-plugin && node test/ui/fixtures/s2-chain.mjs 2>&1 | head -5
```
**结论义务**: 写入 build 记录；结论 = seam 不足 ⇒ `TASK-V55-120/121/122/214` **不得开工**（BLK-V55-2）。

### TASK-V55-120: `test/ui/fixtures/s0-chain.mjs` —— S0 样本单源
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V55-119（SG-V55-02 结论 = 可行） |
| **执行波次** | W4 |
| **对应 FR** | FR-SELF-130（ADR-V55-005 §1） |

**描述**: 新建 **S0 机器化样本单源**（**纯数据 + 注入式依赖**，`s2-chain.mjs` 同形）：覆盖 ① 绑定 → ② 探测 → ③ 拾取引用（`validCount ≥ 1`）→ ④ ask 登记 → ⑤ 作答「原地翻译为中文」已结算 → ⑥ 答案产生驱动 → ⑦ **双分支**（A 已配置 / B 未配置）→ ⑧ 终局。**node 面与 Chromium 面共用同一份样本**。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/ui/fixtures/s0-chain.mjs` |

**验收标准**:
- [ ] 逐环节纯数据可注入；A/B 双分支数据齐备；与 `s2-chain.mjs` 形态一致
- [ ] 样本被 `s0-self-driven-chain.test.ts` 与 `s0-self-driven.mjs` **共同引用**（单源，禁第二份样本）

**验证命令**:
```bash
cd packages/web-cli-plugin && node -e "import('./test/ui/fixtures/s0-chain.mjs').then(m=>console.log(Object.keys(m)))"
```

### TASK-V55-121: `test/s0-self-driven-chain.test.ts` —— S0 node 面
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V55-120 |
| **执行波次** | W4 |
| **对应 FR** | FR-SELF-130 / 131（AC-SELF-001） |

**描述**: S0 **node 面**门禁：①~⑧ **逐环节**独立断言 + 三条总判据「**答案不被丢弃** ∧ **静默窗口 = 0** ∧ **死端 = 0**」+ **两段证伪**（注入缺环节 ⇒ FAIL；还原 ⇒ PASS）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/s0-self-driven-chain.test.ts` |

**验收标准**:
- [ ] ①~⑧ 每环节有独立断言；三条总判据全绿
- [ ] 逐环节注入反证（缺环节 ⇒ FAIL）+ 逐字节还原 PASS
- [ ] `s2-deadend-chain`(6) 并列不动

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test
```

### TASK-V55-122: `test/ui/s0-self-driven.mjs` —— S0 Chromium 面（分支 A 机制侧 + 分支 B 识别侧）
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V55-121 |
| **执行波次** | W4 |
| **对应 FR** | FR-SELF-130 / 131（ADR-V55-005 §3 分层接线；R-V55-111） |

**描述**: S0 **Chromium 面**门禁（真面板）：绑定→拾取→作答→**驱动**→双分支→终局。**分支 A = 机制侧**（答案 ⇒ 悬置 / 回合输入**可判命中** + 可达 next；**不含**无按键端到端，后者属 v55-3）；**分支 B = 识别侧**（未配置 ⇒ 识别；引导流内容属 v55-2）。**两侧独立计数，禁互相掩盖**。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/ui/s0-self-driven.mjs` |

**验收标准**:
- [ ] 分支 A 机制侧判据绿（可判命中 + 可达 next）；分支 B 识别侧判据绿
- [ ] 两侧独立计数（禁双计数掩盖，R-V55-111）；与 node 面共用 `s0-chain.mjs`
- [ ] 门禁纳入受审集合（Chromium 面属既有 `test:ui` 链，`CHROMIUM_GATES === 9` 不动）

**验证命令**:
```bash
cd packages/web-cli-plugin && node test/ui/s0-self-driven.mjs
```

### TASK-V55-123: `test/ui/law7x-ext.test.ts` —— 法七扩展门禁
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55-110 / 115~117 |
| **执行波次** | W4 |
| **对应 FR** | FR-SELF-020~028（AC-SELF-003） |

**描述**: 新门禁：4 类「已表达意图」终态**逐类**断言（已答 ref-round / 已答 op-ask / 已答 bg-ask / 已交描述）+ **双向反证** + **禁恒真**（三段控制）。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/ui/law7x-ext.test.ts` |

**验收标准**:
- [ ] 4 类逐类断言绿；「新增终态无 next ⇒ FAIL」「已有 next 被删 ⇒ FAIL」双向反证
- [ ] 与 `driver-terminals.test.ts` 判据口径一致（同一正交单源）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test
```

### TASK-V55-124: `test/ui/no-dead-end.mjs` —— 判据升级
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55-123 |
| **执行波次** | W4 |
| **对应 FR** | FR-SELF-103（X-SELF-4 / N-SELF-019） |

**描述**: 死端守护门禁**判据升级**（不是改布尔值）：`BLOCKED_TERMINALS` **5 类逐字不减** + 新增 **4 类已表达意图终态**（`DRIVER_TERMINALS`）必有可达 next；**双向反证**。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/ui/no-dead-end.mjs` |

**验收标准**:
- [ ] 5 类阻塞判据**逐类保留**（N-SELF-019）；4 类已表达意图终态判据新增；计数 **39 → 增**
- [ ] 双向注入反证各 FAIL → 还原 PASS

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run test:dead-end
```

### TASK-V55-125: 体积五要素 + 台账 + 本叶收尾
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V55-118 / 124 |
| **执行波次** | W4（收口轮） |
| **对应 FR** | FR-SELF-003 / 110 / 113 / 116 / 120~124（AC-SELF-020/026） |

**描述**: ① 体积**五要素重登记**（本叶增量 **+7,000**；`SIDEPANEL_BASELINE_BYTES_TIMELINE` **只追加**；metafile 归因 Σ 逐模块 Δ + 未归因 == 登记增量；不加 cap / 不改容差）；② 取代台账本叶条目（X-SELF-2/4/5/6 + X-SELF-1「**未发生取代**」如实登记）+ `knownGap` 一致性；③ 本叶**收尾全门禁串行**复跑 + 计数只增对账 + 反证留证完整性 + 保护段双绿 + `TREE`/`state` 更新。

**涉及文件**:
| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/size-baseline.ts` / `size-budget` / `size-growth-evidence` / `size-ruling-vol3` |
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` |
| MODIFY | `packages/web-cli-plugin/package.json`（`test:v3` 串行链追加本叶新门禁；**无新依赖**） |
| MODIFY | `.sddu/.../specs-tree-v55-1-driver-layer/TREE.md` / `state.json`（由 `sddu-tree` 定向更新） |

**验收标准**:
- [ ] 五要素齐备；时间线只追加；`SIDEPANEL_CEILING_CAP === 'record-only'`；档位 563,200 / 绝对上限 619,520 **不变**
- [ ] X-SELF-1「未发生取代」**如实登记不留空**；`status = complete-steps-1-8` ⇒ `knownGap` 空或仅声明闭环
- [ ] 本叶全门禁**串行**复跑全绿；计数逐项 ≥ 基线；`content.js` 177,076 / `pick-layer.js` 34,358 逐字节；`KIND_SET` 40 逐字；保护段 journey / binding 双绿

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run test:v3
```

---

## 3. 任务汇总

| 统计项 | 数值 |
|--------|:--:|
| 总任务数 | 25 |
| S 级 (简单) | 2 |
| M 级 (中等) | 20 |
| L 级 (复杂) | 3 |
| 执行波次 | 4 |
| 新增门禁 | 6（时机源 / 四元组 / 终态词汇 / S0 node / S0 Chromium / 法七扩展） |
| spikeGate | 2（SG-V55-01 / SG-V55-02） |
| 体积预算 | 7,000 B（上界 9,000） |

## 4. 执行策略

| 波次 | 任务 | 策略 |
|:--:|------|------|
| W1 | 101–106 | 并行执行（文件不相交）；104 为**先验闸门**，结论失败 ⇒ 113/114/306 不得开工 |
| W2 | 107–112 | 并行执行（依赖 W1）；108/109/110/111 测试文件互不相交 |
| W3 | 113–118 | 串行为主（`'answered'` 通路上游依赖 113）；115–117 三条驱动路径可并行 |
| W4 | 119–125 | **119 先于 120–122**（闸门）；123/124 可并行；125 为收口轮（串行全门禁） |

## 5. 本叶验收门禁清单

`typecheck` · `build` · `npm test`（≥1181 增）· `op-wiring`（**`requestTurn(` 恰 2，原判据不改**）· `next-dispatch-diff0`（14 不变）· `next-obligation-table`（10）· `blocked-terminals`（9）· `recommendation-sources` · `local-act-wiring` · `l1-ref-validity` · `ask-bridge` · `test:dead-end`（≥39 **增**）· `test:recommendation`（≥65 增）· `test:ask-auth`（≥71 增）· `test:l1`（116）/ `test:page-input`（108）· `test:law8`（≥25）· `test:stream`（≥73 增）· `test:supersession`（≥36 增）· `test:gate-integrity`（≥15 增）· `size-*` + `test:size-ruling-vol3`（12）· **新 6 门禁**（时机源 / 四元组 / 终态词汇 / S0 双面 / 法七扩展）· `design-contract`（19）

**共享面义务（本叶面）**：体积五要素重登记（本叶增量，**不加 cap**）· 取代台账 X-SELF-2/4/5/6 条目 + X-SELF-1「未发生取代」如实登记 · `knownGap` 一致性 · 保护段**保段**（journey / binding 双绿）。

## 6. 体积预算（本叶）

| 构成 | 预算 | 上界 |
|---|--:|--:|
| `drivers.ts` 2,600 · `terminals.ts` 700 · `providers.ts` 900 · `sidepanel.ts` 2,400 · `recommend.ts` 200 · `definition/pipeline/dispatch` 200 | **7,000** | **9,000** |

累计投影：549,609 → **556,609**（**未越档位 563,200**；生效上限前移至 584,439）。越预算 ⇒ 按 ADR-V55-011 §5 减体积优先级执行，**不得**删判据 / 放宽容差 / 静默降档；未落地项须**显式登记**（登记任务 = `TASK-V55-125`）。

## 7. review / validate 策略（build 前已设计）

| 阶段 | 前置判据 |
|---|---|
| review（收口前） | 「已答」判据**禁恒真**（三段控制）；半驱动者复辟审计（`maybeRecommend` 1/7）；注入反证完整性（无恒绿） |
| validate（收口） | S0 node/Chromium 双面实跑；26 门禁守恒对账；保护段双绿；契约漂移（`providers` ↔ `DRIVERS`）检测 |

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V5.5-1 叶 25 任务 / 4 波 / 6 新门禁 / 2 spikeGate；预算 7,000 B 上界 9,000；累计 556,609 **未越档位**） | 2026-09-22 | SDDU Tasks Agent |
