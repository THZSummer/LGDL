# ADR-SGO-003: `--ref <n>` 锚定解析链（plugin 侧包装 + live 单节点闸 + 失配 EC 家族）

## 状态
ACCEPTED

## 背景

**根因 C/D/E/F/N**：base `dom` 工具**零 `ref` 参数**（`packages/web-cli-base/src/dom-tools.ts:462-470` 只认 `--selector`/`--text`；`set-text` 属 write 组缺省 ask，`permission.ts:16,157,333`）；锚点其实已存在 —— `data-wcli-ref` = refId，写在**单一节点**上（`content/ref-capture.ts:67,370`，best-effort）；跨进程断层（引用表在面板、工具调用在 SW）；既有插件侧包装先例 = `src/tools/chrome-host.ts:206-235` （覆写 `schema` + 替换 `executor`，基线 `baseExecutor` 仍被调用）；base 零 diff 红线可机核（`test/insight-no-escalation.test.ts:147`）。

**spec 裁决（O-SGO-004 / DC-SGO-004 / FR-SGO-030~038 / NG-SGO-010）**：`--ref <n>`（序号，与 chip 文案同词汇）→ 选择器 **`[data-wcli-ref="ref_n"]`**；实现载体 = **plugin 侧包装**（**base 零 diff、不解冻**）；**单节点保证**；失配 / 失效 **fail-closed 且非静默**；**先落写命令 `set-text`**，读命令登记后续轮。

## 决策

### 1. 包装载体 = plugin 侧条目包装（base 零 diff）

- NEW `src/tools/dom-anchor.ts`（B 列）：`export function wrapDomEntryForAnchor(entry: ToolEntry, env: PlatformEnv): ToolEntry`。
- `browser-tools.ts:67` 接线：`entries.push(wrapDomEntryForAnchor(createDomToolEntry(env), env))`（替换裸 `createDomToolEntry`）。
- **schema 覆写**：`{...entry.schema, parameters: {...params, properties: {...props, ref: {type:'string', description:'引用序号（--ref <n> → [data-wcli-ref="ref_n"]）；与 --selector 互斥，仅 set-text'}}}}`。
- **executor 替换**：解析 ref → **交基线 `entry.executor`（`baseExecutor`）**；`risk` / `subcommandRisks` **逐字段 spread 自 base，永不放宽**（`browser-tools.ts:1-40` 头注释纪律；FR-SGO-032 / R-SGO-904）。
- **零新子命令**：`SUBCOMMANDS` 不动；`--ref` 是**参数**，不是子命令。

### 2. 解析链（executor 逐级，任何失败 ⇒ 非静默可读错误）

```
1. refArg = String(tc.args?.ref ?? '').trim()
2. refArg 非空 ∧ tc.subcommand !== 'set-text'  ⇒ EC-SGO-017（--ref 仅支持 set-text）
3. refArg 非空 ∧ selector 非空                    ⇒ EC-SGO-015（--ref 与 --selector 互斥，显式错误）
4. refArg 非空 ∧ !/^[1-9]\d*$/.test(refArg)       ⇒ 可读词法错误（引用序号须为正整数）
5. n = Number(refArg)
6. refs = getActiveRefs()            // ADR-SGO-001 §3 的当前回合快照（SW 单源）
   ref  = refs.find(r => r.refNum === n)          ⇒ 缺 ⇒ EC-SGO-016（引用序号不存在，fail-closed）
7. ref.refState !== 'valid'                        ⇒ EC-SGO-004（失效引用，不得沿用其选择器）
8. anchored = `[data-wcli-ref="ref_${n}"]`          // 合成锚（与 refId 命名一致，ref_<n>）
9. live 单节点闸（§3）                             ⇒ 非 resolved 或 nodeCount !== 1 ⇒ 失配（§4）
10. baseExecutor({ ...tc, args: { ...tc.args, ref: undefined, selector: anchored } })
```

- **绝不**静默回退到 `--selector` / **绝不**静默按首元素 / **绝不**静默改别处（FR-SGO-034）。

### 3. live 单节点闸（复用 `observeIdentity` 单一实现）

- `observeIdentity` 现为 `service-worker.ts:1114` 的模块私有函数（被 `ref-highlight` 的 `mark` / `observe` 两模式复用）。**抽为单一实现** = NEW `src/background/ref-observe.ts`（B 列）导出 `observeIdentity(tabId, selector)`；`service-worker.ts` 与 `tools/dom-anchor.ts` **同源 import**（禁第二份副本）。
- 闸判据（FR-SGO-033）：`status === 'resolved'` **且** `nodeCount === 1` **且** `refMark === ref.refId`（身份一致）。**`nodeCount === 1` 为唯一通过条件**。
- 闸是**只读**观测（`chrome.scripting.executeScript` 只读 `querySelectorAll` / `getAttribute` / `textContent`，**零 DOM 写**）。
- tabId 来源：与引用快照同源，经 `background/ref-turn.ts`（ADR-SGO-001 §3 的 holder 一并持有 `tabId`）；`runChat` 在回合开始时 set、`finally` clear。⇒ `src/tools/**` 与 `src/background/**` 同 bundle（`background.js`），**base 零 diff**。

### 4. 失配 / 失效 **fail-closed 且非静默**（EC 家族，逐条有判定）

| EC | 场景 | 处理 |
|---|---|---|
| **EC-SGO-001** | 0 命中（目标被移除 / `dom-gone`） | 可读错误（引用锚定失败：目标不存在）+ 指引（重拾取 / 查看引用证据）；**不回退 `--selector`**、不静默跳过 |
| **EC-SGO-002** | 多命中（≥2；同构节点） | 拒绝锚定（`nodeCount !== 1` 即失配）；**显式报告命中数**；**不按首元素**（区别于 base EC-002 的多匹配语义） |
| **EC-SGO-003** | `data-wcli-ref` 标记缺失（best-effort：frozen / SVG / SPA 重渲染） | 非静默：报告「引用标记不可用」+ 指引（`--selector` 显式锚定 / 重拾取）；**不静默改用语义路径** |
| **EC-SGO-004** | 引用已失效（`invalid` / `unknown`；3 结果 fail-closed） | **不入范围**（`refState !== 'valid'` ⇒ 不写进引用表）；**不沿用失效引用的选择器** |
| **EC-SGO-015** | `--ref` 与 `--selector` 同给 | **显式错误**（不静默择一） |
| **EC-SGO-016** | `--ref n` 超出引用表范围（引用不存在 / 已清空） | fail-closed + 非静默（引用序号不存在）+ 指引 |
| **EC-SGO-017** | `--ref` 用在读命令（`read-element` / `structure`） | 本阶段**不支持**（schema 声明了 `ref` 但仅 `set-text` 生效）；非 `set-text` 传 `--ref` ⇒ 显式错误；登记 PD-SGO-001 |

### 5. 观测口径显式登记（R-SGO-913）

`--ref` 的 live 单节点闸是**每写一次**的只读身份观测，**不是**「每回合一次只读重观测」。**NG-SGO-013 / NFR-SGO-008 的判据面向「引用注入」面**（回合载荷组装零额外页面探测）；写调用时的身份校验不属该面。⇒ 两条口径**显式区分**，避免被读成同一约束。

### 6. 先落写命令；读命令后置（FR-SGO-035 / NG-SGO-010 / PD-SGO-001）

- 本阶段**唯一**落地 `--ref` 的写命令 = `dom set-text`。
- 读命令（`read-element` / `structure`）**不加** `--ref` 语义（§2 第 2 级已拦）。
- PD-SGO-001 裁决 = **本阶段不做**，读命令登记后续轮（ADR-SGO-008）。

### 7. 失效可判（FR-SGO-038 / P1）

SPA 重渲染 / 路由跳转丢标记 ⇒ EC-SGO-003 **非静默**；可复用既有只读观测面（`reobserveAfterWrite` / `observeIdentity`）报告事实，**但不新增每回合重观测**（NG-SGO-013）。

### 8. 判定链零触碰（FR-SGO-037）

包装层是工具条目层，**不触达** `src/security/policy.ts` / `auto-authorize.ts`；`zeroDiffFiles` 9 项哈希 pin 机核必绿。

### 9. base 零 diff 机核 + risk 不放宽反证

- `test/insight-no-escalation.test.ts:147` 必绿（`gitDiffStatus(['../web-cli-base']) === 0`）。
- NEW `test/dom-ref-anchor.test.ts`（node）：词法 / 互斥 / 序号越界 / 单节点（0 / 多命中）/ 标记缺失 / 非 set-text / **risk 降档注入 ⇒ 必红**（逐字段对照 `risk` 与 `subcommandRisks` 与 base 一致）/ 反证逐字节还原。

## 后果

**正面**
- 写动作可按引用锚定（`--ref n` → 单节点），失配**不可能静默**（写错节点 R-SGO-004 结构性缓解）。
- base **零 diff 不解冻**（N-SGO-007）；`risk` 不放宽（R-SGO-904 可机核）。
- 单节点口径与既有 `observeIdentity` **同源**，无第二份副本（纪律「不新增第二声明」）。

**负面 / 代价**
- `dom` schema 的 `ref` 参数对读命令**语法可见但语义不可用** ⇒ 依赖 §2 第 2 级的显式拒绝（EC-SGO-017）；这是 base 零 diff 约束下的必然折中（读命令 schema 无法单独声明）。
- 每个 `set-text --ref` 多一次只读页面观测（有界 = 一次写一次）；已在 §5 显式登记口径。

**被否决的替代**
- **在 base 加 `--ref`**（NG-SGO-003）：撞 base 零 diff 跨包红线。
- **不加 live 闸、只信快照 `nodeCount`**：单节点保证退化为陈旧读数（FR-SGO-033 不满足）。
- **失配静默回退 `--selector` / 按首元素**（FR-SGO-034 明文禁止）：写错节点高危。

**判据锚**：`test/dom-ref-anchor.test.ts` · `test/insight-no-escalation.test.ts:147` · `test/ref-pick-wiring.test.ts`（投影点不增）· `test/ui/l1.mjs`（单节点口径）。
