# ADR-ADN-006: 护栏、预算与留痕（PD-ADN-006 裁决 · 零第二阈值）

## 状态
ACCEPTED（承父 spec §5.7 GUARD FR-ADN-060~065 · §11 DC-ADN-009/013 · §12 X-ADN-11 · N-ADN-026 · PD-ADN-006）

## 背景

`guard.ts` 是**六常量单源**（频次 6/10min · 同因去重 · 静默 60 s · 冷却 10 s · 链深 2 · 回合预算 8）+ 关断偏好 `web-cli:proactive`（默认 ON）。`verdict('deterministic')` 恒放行（主题① 不受总开关控制）。`noteProactive` **只在**自动成回合成功后记账（`ai-drive.ts` / `sidepanel.ts#driveAnsweredTurn`）。

留痕三要素单源 = `driverTraceLine`（`ai-drive.ts:85`）+ 抑制行 `driverSuppressedLine`；`MANUAL_DRIVER_ID='manual'`（∉ 声明表，两值可判）。

## 决策

### ① 驱动者 id / evidence 字段名（PD-ADN-006 裁决）

| 项 | 定案 | 理由 |
|---|---|---|
| `driverId` | **`ai-next`** | = provider id ⇒ DQ-1「声明表 ↔ 注册表双向包含」零额外桥接 |
| `timing` | **`idle`**（复用第 3 时机） | 结题挂点即 `idle`（R8 先例） |
| `evidence` | **`['session.aiNext']`** | 与 `ai-next.when` 的 when-scope **同源**（DQ-3）；`session` 前缀已登记 ⇒ DT-6 绿 |
| 拒绝行 | `driver=ai-next \| timing=idle \| evidence=session.aiNext \| blocked=<codes>` | codes 为**原因码闭集**，**零值**（零明文） |

`DRIVER_DECLS_SRC` 新增**第 12 行**（旧 11 行**逐字保留**）：

```ts
'ai-next': { driverId:'ai-next', timings:['idle'], moments:['turn-end'], driverClass:'ai-driven', priority:2, evidence:['session.aiNext'] },
```

- `driverClass: 'ai-driven'` ⇒ 具自动按下权（但受 `pressDecision` 档位约束：仅 `auto` 档）；
- 双向包含 11↔11 → **12↔12**（DQ-1/DQ-3 同步；X-ADN-7 = 已发生，叶1 落地）。

### ② 拒绝留痕：**单源新增一个行构造**（与 `driverSuppressedLine` 同构）

在 `next-registry/ai-drive.ts` 紧邻 `driverSuppressedLine` 新增：

```ts
export function driverBlockedLine(driverId: string, timing: string, evidence: readonly string[], blocked: string): string {
  return `${driverTraceLine(driverId, timing, evidence)} | blocked=${blocked}`;
}
```

- **恰一处**声明（与 `pressCandidate` 内既有 `${trace} | blocked=` 拼装同形；`pressCandidate` 可改用本函数，行为逐字不变）；
- 面板在 `done` 分支消费 `msg.aiNext.blocked` 时写**一行**（codes 去重 join），**零值 / 零明文**；
- 反证：「留痕里出现候选 label / params 值 ⇒ 必红」。

### ③ 「提案」不消耗回合预算（N-ADN-026）

- AI 候选的**产出 / 显示**不调用 `noteProactive`（产出复用刚结束回合的输出、零额外 LLM 调用 ⇒ 不构成「主动发起」）；
- **只有自动成回合**（`pressCandidate` 成功）才消耗预算（既有 `driveAnsweredTurn` 路径，语义不变）；
- 反证双向：「产出候选 ⇒ 预算不变」+「自动成回合 ⇒ 预算 −1」。

### ④ 关断偏好涵盖 AI next（两相；X-ADN-11 = 已发生，叶2 落地）

一处偏好 `web-cli:proactive` 同时管辖：

- **显示相**：`maybeRecommend` 注入 `session.aiNext` 前检查 `proactivity.enabled()`（OFF ⇒ **不注入** ⇒ AI 候选不显示；主题① 确定性仍工作、手输仍可用）；
- **按下相**：AI 候选的自动按下经既有 `pressCandidate` 的 `guardAllowed` 缝（`verdict('ai', key)` OFF ⇒ `blocked:guard`）。

反证：「关断后仍显示 / 仍自动按下 ⇒ 必红」。

### ⑤ 零第二阈值（R-ADN-007）

- 校验器 / 合并层 / `ai-next` provider **不得**自带频次 / 冷却 / 链深 / 预算常量；
- 唯一的显示上限 `AI_NEXT_LABEL_MAX = 48`（显示截断）与 `AI_NEXT_PARAM_MAX = 128`（参数元数据上限）**不是**六常量语义的阈值（不参与打扰控制判定）——登记为「显示/结构上限」，**不得**被读作第二份护栏阈值；
- 反证：「在 `background/ai-next.ts` 或 `providers.ts` 写入频次/预算常量 ⇒ 必红」（源码扫描）。

### ⑥ 自动按下路径 diff = 0 / 在飞仲裁保持

- AI 候选自动按下仍经 `pressCandidate` → `dispatchChipAction`（恰 1 处）→ `op.turn` 槽；`requestTurn(` **恰 1**；
- 撞车 ⇒ `blocked:busy`，不排队；`ARBITRATION_RESULTS` 四值逐字不动。

## 后果

- 留痕「三要素 + blocked 原因码」全链零明文、可判、可回溯；两值可判（`ai-next` vs `manual`）保持；
- **代价**：`ai-drive.ts` +一个行构造（数十字节）；`providers.ts` +第 12 行声明；
- **判据**：`proactivity-guard` 保留 + 加严（提案不耗预算双向断言）；`op-wiring` ⑦ 保留；新门禁断言 evidence 登记 + 零第二阈值源码扫描。
