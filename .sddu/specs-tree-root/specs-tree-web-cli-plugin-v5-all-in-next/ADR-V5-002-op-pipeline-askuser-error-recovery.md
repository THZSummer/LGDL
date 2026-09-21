# ADR-V5-002: op 统一管线四态 + `askuser` 扩形 + 阻塞类 `error` 出生带恢复区

## 状态
ACCEPTED

## 背景

父 spec §5.6 FR-ALLN-055 要求 9 个 op 走**唯一**管线 `next chip →（params? 流内 ask 卡）→（consent? 流内 auth 卡）→ execute → 流内回执`，无 per-op 旁路；§5.3 FR-ALLN-020~022 要求敏感值经**掩码输入卡**直达存储（法八）；§5.2 FR-ALLN-012 要求 ✖ 错误行**不裸奔**，但 `error ∈ BORN_FROZEN_KINDS`（`stream-model.ts:129-140`）与 `cards/error.ts:1-27`（只渲染 `bubble.textContent`，零 chip）冲突（R-ALLN-006 / O-009）。

现状事实（本轮只读复核）：`askKind` 现有型 `'choice' | 'confirm' | 'text'`（`stream-model.ts:186`），**无 `secret` / 无 `form`**；`MAX_OPEN_ASKS = 2` + `ASK_CANCEL_REASONS = ['user','timeout','superseded','aborted']`（`stream-model.ts:86-121`）；`cards/askuser.ts` 按 `askKind` 分支渲染。

## 选项

| 选项 | 形态 | 优点 | 缺点 |
|---|---|---|---|
| **A 管线集中在 `pipeline.ts` + `askuser` 扩形 + `error` 出生铸造恢复区**（选） | 单入口 `runOp(opId)`；`AskKind` 扩 `secret`/`form`（kind 不加）；`error.payload.recovery` 铸造期渲染 | 12 kind 契约不动（NG-ALLN-001）；append-only 不破（DC-ALLN-009）；管线唯一 | 管线需处理 `MAX_OPEN_ASKS` 冲突（EC-ALLN-010） |
| B 新增 `secret` / `form` / `error-recovery` 卡类型 | 新 kind | 各卡语义自洽 | 破 12 kind 契约；`CARD_TYPES` / `design-contract` / taxonomy 门禁全动；违 NG-ALLN-001 |
| C `error` 行**事后 patch** 加 chip | 先渲染 error 再补 chip | 实现最短 | 破 `BORN_FROZEN_KINDS`「出生后不 patch」语义；`test:stream` 冻结断言必红 |

## 决策

**采用 A**。

### 1. 统一管线四态（`pipeline.ts`，v5-1 交付机制、v5-2 交付 op 执行体）

```ts
export async function runOp(opId: string, ctx: OpCtx): Promise<OpOutcome> {
  const op = OPS_BY_ID[opId];                       // ① 单次查表
  if (!op) return fail('unknown-op', opId);         //    loud（不入注册表者不可分发）
  const params  = op.params  ? await collectParams(op, ctx)  : undefined;   // ② 无 params ⇒ 跳过
  if (params === REJECTED) return settle(op, 'cancelled', ctx);
  const consent = op.consent ? await collectConsent(op, ctx) : 'allow';     // ③ 无 consent ⇒ 放行
  if (consent === 'reject') return settle(op, 'rejected', ctx);             //    拒绝 ⇒ 固化 + 可达 next（不重试）
  const snap = isMutating(op) ? await snapshot(op, ctx) : undefined;        // ④ 快照（仅改状态 op）
  try {
    const out = op.layer === 'sw' ? await execSw(op, ctx) : await op.execute(ctx);
    await settle(op, 'completed', ctx, snap);                                // ⑤ 回执 = 固化区 + 系统行
    return out;
  } catch (err) {
    if (snap) await rollback(snap);                                          //    失败整体回滚
    return errorWithRecovery(op, 'card-boundary', err);                      //    + 出生带恢复区的错误卡
  }
}
```

- 「管线唯一」判据：`src` 中 `op.execute(` 的**调用点恰 1 处**（`pipeline.ts`）；每 op 的 `params` / `consent` 缺省语义正确（无则不插卡）。
- **`MAX_OPEN_ASKS` 冲突算法（EC-ALLN-010，本 ADR 定算法）**：`params`/`consent` 卡计入 `MAX_OPEN_ASKS`；达上限时**不新开 ask**，把该 op 压入 FIFO `pendingOps`，并在流内追加一行系统事件「还有 N 个待答，先答完再继续」（**不静默丢弃**）；`ask-resolved` 后 drain 队首。

### 2. `askuser` 扩形（模型层落法：12 kind **不加**，payload 扩）

| 层 | 文件 | 变更 |
|---|---|---|
| 形状 | `stream-model.ts:186` | `askKind?: 'choice' \| 'confirm' \| 'text' \| 'secret' \| 'form'`（**enum 扩值，非新 kind**）；`payload` 增 `secretLabel?` / `formOptions?: readonly {id,label,scope}[]` / `maskedLength?` |
| 渲染 | `cards/askuser.ts` | 新分支：`secret` → `<input type="password" data-secret="true" aria-label=…>`（+2 按钮）；`form` → 多选 checkbox 组（选项来自 `OPTIONAL_CAPABILITIES`，与 `op.perm.request` 同源）；`choice/text/confirm` **逐行不动** |
| 提交 | `sidepanel.ts` | 新增 `submitSecret(requestId, value)`：**值直达 `keyStore.save()`**，随后 `dispatch({type:'ask-resolved', requestId, answer: undefined})` 只落**事实**；空值 / 取消 ⇒ 卡内校验、零副作用（EC-ALLN-009，走 `ASK_CANCEL_REASONS`） |
| 固化 | `cards/askuser.ts` | 掩码卡固化文案 = 「已写入（掩码 · 零明文）+ 掩码长度 N + 时间戳」；**不出现值 / 值前缀** |

> **法八切分**：留痕的是**事实**（何时 / 哪个 op / 成功与否 / 掩码长度），不是**值**。`digest` 只写 `••••••`（ADR-V5-010 四面机核）。

### 3. 阻塞类 `error` 出生带恢复区（O-009 落层）

- `stream-model.ts` 的 `error` payload 增**可选** `recovery?: readonly { text: string; opId: string }[]`。
- `cards/error.ts` 铸造期：若 `view.payload.recovery?.length` → 在气泡**后**追加 `next-chips`，每 chip `data-act="next"` + `data-op`（`[data-op]`）；否则**不带任何 chip**（非阻塞类）。
- **不触碰 `BORN_FROZEN_KINDS`**：恢复区是**出生铸造的一部分**（同一 `createErrorCard` 调用内完成），卡出生后仍只追加、不 patch。
- 阻塞类判定**唯一源自** `BLOCKED_TERMINALS`（ADR-V5-001），禁止散落字符串。
- 反证：去掉铸造期 `recovery` ⇒ 死端门禁 FAIL（ADR-V5-009 双向注入 ②）。

## 后果

**正面**：9 op 一条管线；`secret` / `form` 落在既有 taxonomy（12 kind 不动）；✖ 行不再裸奔且 append-only 契约不破。

**代价 / 风险**：`test:stream`（63）/ `test:ask-auth`（61）需**增**断言（`secret`/`form` 扩形 + `error` 行内恢复），计数只增；`askuser` 卡内控件数需守 `MAX_CLICKABLES_PER_CARD = 6`（`secret` = 1 input + 2 btn = 3，`form` = ≤4 checkbox + 2 btn = 6，**恰好达上限** ⇒ 注册表侧断言「form 选项 ≤4」）。

## 影响 FR

FR-ALLN-012 / 014 / 020~022 / 055 / 059 / 015；EC-ALLN-005 / 006 / 009 / 010 / 011 / 012；N19 / N24；AC-ALLN-003（入口侧）/ 007 / 008。

## 回滚

`pipeline.ts` 与 `submitSecret` 为新增；`askKind` 扩值可回退为原 3 值（`cards/askuser.ts` 的 4 个新分支删除）；`error.payload.recovery` 为可选字段，回滚 = 不传该字段（渲染零变化），`BORN_FROZEN_KINDS` 从未改动。门禁回滚 = 删除新增断言（不留「不再 FAIL 的判据」，按 FR-ALLN-121）。
