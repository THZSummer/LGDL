# ADR-SGO-002: 范围读数单源（法九）+ 判定输入两路 + `law9-scope-reading` 门禁

## 状态
ACCEPTED

## 背景

父 spec §5.3 / §5.7 / FR-SGO-020~028 / 070~077 裁决：范围法则**双轨** —— **机制范围读数 = 唯一判据（机核）** + **提示词表述 = 引导**（门禁**不读**提示词）。若法则仅入 `SYSTEM_PROMPT`，则 `grep SYSTEM_PROMPT test/` = 0 ⇒ 零机核、改一行即静默失效（Q-SGO-010 / R-SGO-002）。故须**立法「法九：范围读数」**，形态对齐既有 **法七扩展**（`test/law7x-ext.test.ts`：四类逐类五段 + 双向反证 + 三段控制禁恒真 + 真源切片）与 **法八**（`test/ui/law8-plaintext.mjs`：per-face `expectFailPattern`）。

要求：四值**单源**（第二声明 ⇒ FAIL，N-SGO-028）；判定输入 = 「本次动作的目标集合」 vs 「引用解析集合」（**含 `--ref` 命中与 selector 命中两路**）；越界写**机制上必须被拦**（FR-SGO-025，fail-closed），但**不得**触碰判定链 `policy.ts` / `auto-authorize.ts`（N-SGO-008）与 base 权限档位。

## 决策

### 1. 模块落点：NEW `src/ui/sidepanel/l1/ref-scope.ts`（A 列，**恰一处**声明）

```ts
export const SCOPE_READINGS = Object.freeze([
  'in-scope', 'out-of-scope-authorized', 'out-of-scope-unauthorized', 'no-ref',
] as const);
export type ScopeReading = (typeof SCOPE_READINGS)[number];

export interface ScopeRef    { readonly refNum: number; readonly refId: string; readonly selector: string; }
export interface ScopeTarget { readonly selector: string; readonly refNum?: number; }
export interface ScopeFacts  { readonly targets: readonly ScopeTarget[]; readonly refs: readonly ScopeRef[]; readonly authorized: boolean; }

export function scopeReading(f: ScopeFacts): ScopeReading { /* 见 §2 */ }
export function turnRefsOf(records: readonly RefRecord[]): readonly ChatRefFact[];  // ADR-SGO-001 §2
export const SCOPE_TRACE_FIELDS = Object.freeze(['scope.reading', 'scope.authorized'] as const);
export function scopeReadingTrace(reading: ScopeReading, authorized: boolean): string; // 留痕行单源（§5）
```

- **第二声明 ⇒ FAIL**：门禁扫描 `src/**`，四个字面量在 `ref-scope.ts` 之外出现 ⇒ 判红（对齐 `terminals.ts` 唯一声明纪律）。
- 该模块**只被面板侧 import** ⇒ 只进 `sidepanel.js`（A 列）；SW 侧（系统段 / `--ref` 解析 / 批量判定）**不 import** 它（ADR-SGO-001 §4 的追加段是**引导**，读数由 `ref-scope.ts` 在面板侧计算）。⇒ 「读数单源」同时是「读数单列」。
- **R-SGO-901（双源漂移）结构性消除**：读数**只消费** store 的 `verdict`（`turnRefsOf` 过滤 `verdict === 'valid'`），**不重判** `valid/invalid/unknown`；3 结果 + 6 维度的 deny 方向（`ref-validity.ts`）**零触碰**（X-SGO-5）。

### 2. 判定语义（`in-scope` / `out-of-scope-authorized` / `out-of-scope-unauthorized` / `no-ref`）

```
scopeReading({targets, refs, authorized}):
  if (refs.length === 0) return 'no-ref';                       // ① 无活跃有效引用 ⇒ 无法判定（≠ in-scope）
  for (const t of targets):
    if (targetInRefs(t, refs)) continue;                         // ② 在范围内
    return authorized ? 'out-of-scope-authorized'                // ③ 越界但已获用户批准
                      : 'out-of-scope-unauthorized';             // ④ 越界且未征询
  return 'in-scope';

targetInRefs(t, refs) =
  (t.refNum !== undefined && refs.some(r => r.refNum === t.refNum))              // 路 A：--ref 命中
  || refs.some(r => t.selector === r.selector                                   // 路 B：selector 命中（存储选择器）
                || t.selector === `[data-wcli-ref="${r.refId}"]`);              // 路 B′：selector 命中（合成锚）
```

- **`no-ref` 语义 = 「无法判定」，不是 `in-scope`**（FR-SGO-021 逐字）；无引用回合**不得**因此阻断（EC-SGO-008）。
- `authorized` 是**输入事实**，**只由 §5 的用户确认产生**（ADR-SGO-005），**AI 不得自判 / 自填**（FR-SGO-026 / R-SGO-907）。
- `refs` 是 `ScopeRef[]`（`turnRefsOf` 的派生形状）；同一份快照在回合载荷与本读数间**单源**（ADR-SGO-001 §2）。

### 3. 双轨关系写死（FR-SGO-022 / 023）

| 轨 | 载体 | 门禁/实现读它吗 |
|---|---|---|
| **A 轨（判据）** | `scopeReading`（`ref-scope.ts`） | ✅ 门禁**真源切片**指向本模块（**不读** `SYSTEM_PROMPT`） |
| **B 轨（引导）** | 系统段**追加段**的自然语言法则 + 引用事实（`ref-context.ts`） | ❌ 门禁**不读**提示词；「门禁读提示词」视为实现错误 |

⇒ **反证**：删掉系统段追加段 ⇒ 法九门禁**仍须能判**（判据不依赖提示词）。

### 4. 越界写的**机制拦截**（FR-SGO-025）—— 落点 = confirm 面

- 拦截点在**面板的 `confirm-request` 处理分支**（`sidepanel.ts:3837`）：对 `dom set-text` 的写，读 `question.args.selector` / `question.args.ref` 构造 `ScopeTarget`，与 `turnRefsOf(store)` 的快照比较：
  - `out-of-scope-unauthorized` ⇒ 面板**返回 deny**（fail-closed）+ 可读理由 + **可达 next**（重拾取 / 回到引用范围内）；叶2 把该 deny 升级为 **WIDEN 二择**（ADR-SGO-005）。
  - `in-scope` / `no-ref` ⇒ **既有 confirm 路径逐字不变**。
- **明确不碰**：`policy.ts` / `auto-authorize.ts`（`zeroDiffFiles` 9 项哈希 pin）；base 风险档位（`set-text` 仍 `'write'` 缺省 ask）；`permission.ts` 理由串逐字不变。⇒ R-SGO-911 结构性消除。
- 拦截是**面板侧**判定 + 既有 confirm 应答面，**不是**新裁决链。

### 5. 留痕与可判性（FR-SGO-080~084）

- **字段名单源**：`SCOPE_TRACE_FIELDS = ['scope.reading','scope.authorized']`。
- **范围行单源**：`scopeReadingTrace(reading, authorized)` 产出机器格式 `scope.reading=<enum> | scope.authorized=<actor>`（`actor ∈ {'user','none'}`），经**既有** `notice`/系统行通道渲染（零新 kind）。
- **口径显式登记（caliber，R-SGO-917）**：留痕「**值**」的口径 = **用户内容值**（正文 / 译文 / 凭据 / 答案全文 / URL query）；**机器枚举读数词**（4 值之一）与 **actor**、**计数** / **指纹摘要**属**机器事实**，不受该口径约束。**依据**：FR-SGO-083 逐字把「值」定义为「正文 / 凭据值 / Key / token / 答案全文」；若把枚举词也算「值」，则 FR-SGO-081（扩围事实必须可从留痕读出）与 FR-SGO-080（不含值）**自相矛盾** ⇒ 以 081 的可读性为准，并在本 ADR 显式登记。**防退化锚**：范围行**永不**包含任何页面正文 / 译文 / 凭据值（门禁扫描断言）。
- **扩围事实（FR-SGO-081）**：`out-of-scope-authorized` 的产生 ⇒ 范围行含 `scope.reading=out-of-scope-authorized` + `scope.authorized=user`（可判）；审计同记（enum + actor）。
- **零值纪律不退化（FR-SGO-083）**：既不写正文，也不写凭据值。

### 6. PD-SGO-004 裁决：读数**不入**新的流内可见面

避免动密度预算与 12 kind 面（N-SGO-010）；读数经**留痕行** + **二择卡**（叶2）可达。若后续真机显示需要可见读数行，再单独立项。

### 7. 法九门禁设计：`test/law9-scope-reading.test.ts`（node，NEW）

**判据形态（对齐 `law7x-ext.test.ts`）**：

| 判据 | 内容 | `expectFailPattern` |
|---|---|---|
| `L9-1-four-values` | 四值单源 + 判定函数唯一声明（第二声明 ⇒ FAIL） | 范围读数四值必须在唯一模块声明（第二声明即红） |
| `L9-2-no-ref` | 无引用 ⇒ `no-ref`（**不得**判 `in-scope`） | 无引用回合必须判 `no-ref`（判 `in-scope` 即红） |
| `L9-3-in-scope` | 有活跃引用且目标 ∈ 集合 ⇒ `in-scope`（两路：`--ref` 命中 / selector 命中） | 目标在引用集合内必须判 `in-scope` |
| `L9-4-unauthorized` | 目标 ∉ 集合 ∧ 未征询 ⇒ `out-of-scope-unauthorized` | 未征询的越界必须判 `out-of-scope-unauthorized` |
| `L9-5-authorized` | 目标 ∉ 集合 ∧ 已批准 ⇒ `out-of-scope-authorized` | 已批准的越界必须判 `out-of-scope-authorized` |
| `L9-6-write-gate` | 生产写闸切片：`out-of-scope-unauthorized` 必被拦（deny）+ 可达 next | 未征询的越界写必须被机制拦下 |
| `L9-7-not-tautology` | **三段控制**（`ok` / `violated` / `n/a`）：正常 ⇒ `ok`；注入违反面 ⇒ `violated`；判据前提不成立 ⇒ `n/a`（单独计数） | 禁恒真：每条判据必须能 FAIL，且必须有必不判的中性输入 |
| `L9-8-source-slice` | 真源切片：读生产模块 + 写闸切片，**不读测试自建常量** | 改动生产真源（如 `no-ref` 改判 `in-scope`）必须红 |

**双向反证（实跑）**：注入 ⇒ FAIL（声明 `expectFailPattern`）⇒ **逐字节还原**（sha256 前后相同）⇒ PASS。至少两组：① 把 `no-ref` 分支改判 `in-scope`；② 删除写闸的越界拦截。**禁止**「删属性充数 / 自我裁决 / 换口径放松」。

**三段控制**：每条判据引擎返回 `'ok' | 'violated' | 'n/a'`（**不是布尔**）；`n/a` 单独计数、不与 PASS 混池（N-SGO-024）。

**门禁登记（FR-SGO-077 / N-SGO-017）**：本门禁是 **node** 门禁 ⇒ 纳入 `test/gate-integrity.test.ts` **受审集合**（node 下界**只增**）；**不新增 Chromium 门禁文件**（`CHROMIUM_GATES === 9` 逐字不动）。

## 后果

**正面**
- 范围法则从「文档条款 / 提示词」升为**可机核判据**（法九与法七 / 法七扩展 / 法八并列不重叠）。
- 四值**单源** + **两路命中**（`--ref` / selector）⇒ 判定输入明确、可双向反证、可注入违反面。
- 越界写**机制上被拦**（confirm 面），同时**不碰**判定链与 base 档位（R-SGO-911 消除）。

**负面 / 代价**
- 面板 confirm 分支新增一段判定逻辑（A 列少量字节）；叶2 会把该 deny 升级为二择卡（接线复用）。
- 留痕「零值」口径需按 §5 caliber 解读（已在 ADR 显式登记，供 review 复核）。
- `no-ref` 的中性语义须在门禁里以 `n/a` 段与 `in-scope` 区分，否则易写成恒真。

**被否决的替代**
- **纯提示词承载法则**（决策 ③ 不成立）：零机核（Q-SGO-010）。
- **把越界拦截做进判定链**（`policy.ts` / `auto-authorize.ts`）：撞 `zeroDiffFiles` 冻结（N-SGO-008）。
- **读数作为新流内可见面**（PD-SGO-004 ②）：动密度 / 12 kind 面。

**判据锚**：`test/law9-scope-reading.test.ts`（法九，node）· `test/gate-integrity.test.ts`（受审集合只增；Chromium = 9 不动）· `test/ui/l1.mjs` / `test/ui/page-input.mjs`（X-SGO-5 等价重锚）· `test/l1-ref-validity.test.ts`（deny 方向不动）。
