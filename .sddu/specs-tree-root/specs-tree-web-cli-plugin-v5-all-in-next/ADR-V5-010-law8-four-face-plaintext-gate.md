# ADR-V5-010: 法八四面零明文机核（流 payload / digest / 审计 / DOM 属性）

## 状态
ACCEPTED

## 背景

法八「值不入流」需要一个**可核判据**，而非仅靠净化面（R-ALLN-008：v4.5 有**反证恒绿**的三类教训——模板字面量语法错 / Trusted Types 下注入静默落空 / 断言口径过窄）。

现状可用的判据面（本轮只读复核）：

| 面 | 载体 | 现有守卫 |
|---|---|---|
| ① 流内 payload | `#stream` 卡 DOM + `state.stream.events[*].payload` | `stream-plaintext.ts#label()`（secret 形状抛错） |
| ② digest | `stream-digest.ts#upsertDigest` → `chrome.storage.local`（LRU 20） | `digestForViews` 白名单 |
| ③ 审计面 | `l2/audit.ts#buildAuditRows` / `#view-audit` | `NFR-ALLN-011` 字段集 |
| ④ DOM value + **全部元素属性** | `#panel` 内所有 `input.value` / `value` / `placeholder` / `title` / `aria-*` / `data-*` / 任意 attribute | 无 |

设计稿 §E 只机核 3 面 + 属性（7 条）；spec **加严为四面**（O-010 / NG-ALLN-017：存储侧加密 out-of-scope，只保证**流内零明文**）。

## 选项

| 选项 | 形态 | 优点 | 缺点 |
|---|---|---|---|
| **A 哨兵值四面对抗扫描 + key 直写单一投递点 + 逐面反证**（选） | 哨兵 → 掩码卡 → 提交 → 四面对抗扫描零命中；每条反证实跑 FAIL → 还原 PASS | 判据力最强；反证不空转（R-ALLN-008 三类教训逐一防御） | 需遍历全部元素属性（实现稍重） |
| B 只扫 `#stream.textContent` + digest | 实现最省 | 审计面 / 属性面泄漏不可发现（R-ALLN-906：四面被缩窄回三面） |
| C 复用 `label()` 抛错代替扫描 | 零新代码 | `label()` 只覆盖「secret 形状字符串」，`type=password` 的 `value` 不经它 ⇒ **假判据** |

## 决策

**采用 A**。

### 1. 哨兵与输入路径（v5-2 交付入口侧，v5-3 交付机核）

- 哨兵：`SENTINEL = 'sk-v5-law8-' + <高熵后缀>`（**故意**匹配 `stream-plaintext.ts#label()` 的 secret 形状 ⇒ 一旦泄漏进 `label()` 会**抛错**，形成第二重信号）。
- 输入路径：掩码卡（`askuser` 扩形 `secret`，ADR-V5-002）→ `submitSecret` → **值直达 `keyStore.save()`**。
- **key 直写断言**：`src` 中携带值的写存储调用点**恰 1 处**（`submitSecret` 内的 `keyStore.save`）；`src` 中 `SENTINEL` 的流通路径不经过 `reduce` / `payload` / `digest` / `dispatch`（静态扫描：值与 `dispatch(` 不共现）。

### 2. 四面机核（`test/ui/law8-plaintext.mjs`，新 Chromium 门禁，v5-3）

| 面 | 扫描对象 | 断言 |
|---|---|---|
| ① 流内 payload | `#stream` 全子树 `textContent` + 每个卡 `CardView.payload` 序列化 | 哨兵**零命中** |
| ② digest | `chrome.storage.local` 中 `stream-digest` 键的全部值 | 哨兵**零命中** ∧ digest **含 `••••••`** |
| ③ 审计面 | `#view-audit` 行 + 审计存储（`optional-permission/*` 等既有事件） | 哨兵**零命中** ∧ 含 `{opId, ts, result, maskedLength}` |
| ④ DOM value + **全部属性** | `#panel` 内**每个元素**的 `value` / `defaultValue` / `placeholder` / `title` / `aria-label` / `aria-description` / 全部 `attributes`（含 `data-*`）/ 掩码卡固化的 `••••••` | 哨兵**零命中**；`input[type=password][data-secret]` 的 `value` 在提交后**清空** |

- **口径诚实性**（防「断言口径过窄」）：④ 的「全部属性」= `element.attributes` 逐项（不是白名单子集）；③ 的审计面 = 审计渲染 + 审计存储**两面**都扫。
- **掩码长度**：`maskedLength` 只以**长度类别**（如 `8+`）落固化区，不落原始长度（缩窄侧信道）。

### 3. 对抗反证（每条实跑，FR-ALLN-121）

| 反证 | 注入 | 期望 |
|---|---|---|
| ①→流 | 把哨兵写进一张卡的 `payload.text` | ① FAIL |
| ②→digest | 把哨兵写进 `upsertDigest` 的条目 | ② FAIL |
| ③→审计 | 把哨兵写进审计行 detail | ③ FAIL |
| ④→属性 | 把哨兵写进某元素 `title` / `data-x` | ④ FAIL |
| ⑤→`label()` | 哨兵经 `label()` | 抛错（既有守卫，作为**第二重**信号） |
| 还原 | 逐字节还原 | 全 PASS（sha256 前后相同） |

### 4. 与既有 `test:zero-injection`（27）的关系

`zero-injection` 管**净化面**（URL query / secret 形状 / 命令参数体 / raw markup 抛错）；本 ADR 的机核管**值不入流**（四面零命中）。两者**互补**，判据纳入 `gate-integrity` 受审集合（`zero-injection ≥27` 与新增门禁**分别计数**，不混池）。

## 后果

**正面**：法八从「设计声明」变为**可机核事实**（四面 + 全属性）；R-ALLN-008 / R-ALLN-906 由面级反证机制化覆盖。

**代价 / 风险**：新 Chromium 门禁（串行纪律 N13）；遍历全部属性在一次扫描内的成本可控（面板元素数有限）；若实现把值留在 `input.value`（不清空）⇒ ④ 立即红。存储侧边界**显式登记为 out-of-scope**（不得被误读为「存储已加密」，NG-ALLN-017）。

## 影响 FR

FR-ALLN-020 / 021 / 022 / 023 / 024；NFR-ALLN-003 / 008 / 011；N24；AC-ALLN-003 / 021 / 024。

## 回滚

`law8-plaintext.mjs` 为新增 ⇒ 回滚 = 删除门禁 + 从 `gate-integrity` 受审集合移除。`submitSecret` 的「值直达 key-store」路径与掩码卡的 `type=password` 属性保留（法八**入口**侧由 v5-2 承担，与门禁解耦）。**不动** `zero-injection`（27）。
