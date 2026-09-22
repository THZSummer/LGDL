# ADR-V55-004: 答案驱动化（`applyRefAction` / `submitDescribe` / 迟到后台 ask）+ `commandSends` 消费面登记

## 状态
ACCEPTED

## 背景

三条「用户已表达的话」的结算路径，**全部**止于「记录」而**不产生驱动**（X-SELF-5 / X-SELF-6 / GAP-02/03/04）：

| 根因 | 现状（`file:line`） | 事实 |
|---|---|---|
| R1 / R2 | `sidepanel.ts:2557-2588`（`:2587`）+ `:2177-2189`；`l1/ref-store.ts:280-291`（`:290` `sends += 1;`） | 引用回合 ask 的答案走 `applyRefAction`，**只裁决 + 计数** |
| R6 | `sidepanel.ts:2541-2546` + `:3260` | 「改用描述」只 `dispatch({type:'ask-resolved'})`，**从不 send / 从不驱动**（旁路死端） |
| A3 | `service-worker.ts:2813-2822`（`askBridge.settle` 未命中 ⇒ `errorResponse`） | 后台 ask 在回合结束后到达 ⇒ **裸错误响应**（用户的答案被静默丢弃） |

spec：FR-SELF-022 / 025 / 026 / 027 / 028、N-SELF-023（「答案必产生驱动」不可让渡）、X-SELF-5/6、AC-SELF-003/010/011。

## 决策

### 1. `applyRefAction` = **裁决 + 驱动**（调用点仍恰 1）

```ts
// 伪代码（语义级）：有效性裁决**逐字保留**（fail-closed 判定链零触碰）
function applyRefAction(refId, action) {
  const outcome = l1?.dispatchRefAction(refId, action);      // 既有唯一入口（恰好一处 dispatchRefAction( 调用）
  if (!outcome) { /* fail-closed（逐字保留） */ }
  if (!outcome.allowed) { dispatch({type:'notice', text:`✖ ${outcome.reason}`}); return outcome; }  // EC-SELF-006：走既有阻塞终态 + 可达 next
  // ★ 新增：有效 ⇒ 把答案交给驱动者层（这是 X-SELF-5 的「语义重定义」本体）
  registerSuspension({ terminal: 'answered-ref', driverId: 'ref-action', instruction: action, evidence: refEvidence(refId) });
  nextAfterSettle({ kind: 'answered', terminal: 'answered-ref' });   // ADR-V55-001 §5，调用点不增
  return outcome;
}
```

- **`commandSends` 保留 + 显式登记消费面**（**不退役**）：
  - 口径（COR-1 订正）：`src/` 侧 **1 处只读投影消费者**（`l1/panels.ts:451` `report().commandSends`）+ 测试侧 **3 处**（`test/ui/l1.mjs:516-519` / `test/ui/page-input.mjs:241` / `test/l1-ref-validity.test.ts:171,175,437`）；
  - **零驱动语义消费者** —— 这条断言**保留**，并且新增一条更强的：`sends` 递增**不足以**满足「答案产生驱动」（ADR-V55-003 §4 / FR-SELF-132）；
  - 选择「保留」而非「退役」的理由：退役要走取代登记并触碰 3 个测试文件的既有断言（**有删除风险**），而保留 + 登记是**零删除**路径（NG-SELF-008 / N-SELF-011）。

### 2. `submitDescribe` 补齐驱动（空描述口径**逐字保留**）

| 输入 | 行为 |
|---|---|
| 空 / 纯空白 | **卡内校验、零副作用**（不投递、不改状态、不产回执、**不驱动**、**不入终态**）—— 与现状逐字一致（EC-SELF-007） |
| 非空 | `ask-resolved` 留痕（既有）**＋** `registerSuspension({terminal:'describe-submitted'})` **＋** `nextAfterSettle({kind:'answered', terminal:'describe-submitted'})` |

### 3. 后台 ask **迟到作答**：固化 + 可达 next（**不裸 `errorResponse`**）

- **SW 侧**（`ask-bridge` / `service-worker.ts`，**background.js ⇒ 零 sidepanel 字节**）：
  `settle()` 未命中（回合已结束）不再返回裸错误；改为回 `okResponse({ settled: false, late: true, requestId })`。
- **面板侧**：收到 `late` ⇒ ① **固化事实**（系统行：「回合已结束，未接住这条答案」——零明文，不落答案文本）；② 调
  `nextAfterSettle({kind:'answered-late'})` ⇒ 由驱动者产出可达 next（**重发该答案 / 重新提问 / 改用描述** 三选一，由既有 provider + `op.describe` 承载）；③ **不记 `answered-bg`**（ADR-V55-003 §4 口径④）。
- **不许伪造「接住」**：`askBridge` 的 `pending` 语义零改写；失败路径如实说明「未接住」（R-SELF-008 / R-SELF-908 的同族纪律）。

### 4. 幂等与去重（NFR-SELF-010）

- 去重键 = `driverId + ctx 摘要`（单源常量，ADR-V55-009 §2）；同因重复结算 ⇒ **不产生第二条驱动**（连续两次求值 ⇒ 产出数不增，反证注入必 FAIL）。
- `resolvePending(requestId)` 的「同一 ask 不得二次 resolve」语义**保留不动**（`pipeline.ts:84-89`）。

## 后果

**正面**
- 会话 B 的因果链（答完 → 无驱动）被逐环节切断：**答案文本成为悬置任务输入 + 驱动输入**（FR-SELF-132 的「可判命中」）。
- 三条路径共用**同一个** `nextAfterSettle` + **同一个** 悬置登记点 ⇒ 单源可机核，不新增调用点。
- 迟到答案从「裸错误」变为「固化 + 出口」，且**零新增 kind / 零新增 op**。

**负面 / 代价**
- `applyRefAction` 现在有**两个副作用**（悬置登记 + 触发求值）；实现者若把驱动写在 `submitAskFor` 里而不是 `applyRefAction` 里，会让「无效引用也产生驱动」（EC-SELF-006 违规）⇒ 判据：**驱动分支必须在 `outcome.allowed === true` 之后**（源码序断言）。
- 迟到答案的固化行会**增加系统行条数**（`stream.mjs` / `l0.mjs` / `density.mjs` 的计数类断言需等价重锚 + 增，逐格留痕，**阈值逐字不动**）。
