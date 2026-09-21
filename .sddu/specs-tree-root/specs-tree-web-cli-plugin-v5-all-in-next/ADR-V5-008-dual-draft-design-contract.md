# ADR-V5-008: 双稿双 shim `design-contract`（F 冻结 + G 新增）

## 状态
ACCEPTED

## 背景

现状（本轮只读复核）：

- `test/design-contract.test.ts`（243 行 / 6 个 `test(...)`）**只冻结 F**：`SHIM_SHA256 = 8ca5db6f…`、`DRAFT_SHA256 = 49ce27fc…`、`SHIM_CHECK_CALLS = 60`、`SHIM_CHECK_DECLARATIONS = 1`、`ASSERTION_MAP`（60 行，`A1`~`I1` 九组）。
- **G 稿与 G shim 不在任何门禁内**：`grep -rn option-g test/ src/ docs/` = **0 命中**（Q-ALLN-013 契约真空）。
- G 稿实测：`option-g-all-in-next.html` 273,621 B / sha `a7c0a77a…`；`option-g-shim.mjs` 88,529 B / sha `d0107ecb…`，`^check('` 调用点 **127** 处（本轮实测分组：A6 / B5 / C8 / D6 / E7 / F11 / G8 / H7 / I17 / J5 / K3 / L4 / M23 / N17 = **127**），id 形如 `A1`…`N17`（`^check\('([A-Z]\d+)\s` 可完整抽取）。
- `docs/v4-supersession-ledger.json#designContract.designContractChanges = []`。

N21：F 契约**必须继续成立**，不得静默替换。FR-ALLN-100~103 要求**双稿双 shim 并存**。

## 选项

| 选项 | 形态 | 优点 | 缺点 |
|---|---|---|---|
| **A F 冻结不动 + G 以**并列常量组**新增**（选） | F 4 常量 + 映射逐字保留；新增 `G_*` 常量 + `G_ASSERTION_MAP`（127 行）+ 平行 test 块 | 双契约各冻各的；零混池；计数 6 → ≥12 | 常量与 test 块有重复句式（用共享 helper 缓解，但**不改 F 常量/断言名**） |
| B 用 G 替换 F | 只维护一份 | 代码最少 | N21 破；F 历史契约失守（SUPERSEDED 需走台账八步，且 NG-ALLN-010 禁） |
| C 把 F 与 G 的断言合成一个池（共享计数） | 看似简洁 | **计数相加 ⇒ 一侧失效时门禁仍绿**（R-ALLN-909） |

## 决策

**采用 A**。结构（`test/design-contract.test.ts`，**F 部分逐字不动**）：

```ts
/* ── F 契约（冻洁；逐字不动） ── */
const SHIM_SHA256 = '8ca5db6f…';  const DRAFT_SHA256 = '49ce27fc…';
const SHIM_CHECK_CALLS = 60;      const SHIM_CHECK_DECLARATIONS = 1;
const ASSERTION_MAP: … = [ /* 60 行 A1~I1 */ ];

/* ── G 契约（v5 新增；与 F 并列，各冻各的） ── */
const G_SHIM  = resolve(PKG, 'design/ui-redesign/option-g-shim.mjs');
const G_DRAFT = resolve(PKG, 'design/ui-redesign/option-g-all-in-next.html');
const G_SHIM_SHA256 = 'd0107ecbbd56edfe19592e256a66d27fb3d1c5c1a2d87c1773364f4520e609ce';
const G_DRAFT_SHA256 = 'a7c0a77ac6253e32d1ccef894f32eb8d0dc2d10c99f145261a69ebc699cc83c9';
const G_SHIM_CHECK_CALLS = 127;   const G_SHIM_CHECK_DECLARATIONS = 1;
const G_ASSERTION_MAP: … = [ /* 127 行，A1~N17，clause/owner 逐条 */ ];
```

新增 test 块（**F 的 6 个 test 名与断言句式不改**）：

| 新 test | 判据 |
|---|---|
| G shim 实跑 | `node option-g-shim.mjs` 退出码 0 ∧ 输出含 `127 passed` / `0 failed` |
| G shim sha | `G_SHIM_SHA256` 逐字节 |
| G 稿 sha | `G_DRAFT_SHA256` 逐字节 |
| G 计数口径 | `G_SHIM_CHECK_DECLARATIONS == 1` ∧ `G_SHIM_CHECK_CALLS == 127` ∧ `check(` 子串 == 128 |
| G 映射表 | 127 行 ∧ id 序列 == 从 G shim 抽取的序列（`^check\('([A-Z]\d+)\s`）∧ clause/owner 非空 ∧ 覆盖 A~N 十四组 |
| G 卡分类学 | G shim 的 `CARD_TYPES` == 7 主类（顺序敏感）∧ G 稿每类有 `data-msg-type=` 样例 |
| **混池防御**（新） | F 断言 id 集 ∩ G 断言 id 集 = ∅ **或**两侧各自独立计数（禁止「F 绿或 G 绿则绿」）；注入「G shim 改 1 byte」⇒ 必 FAIL |

- **共享 helper**：把「实跑 + sha + 计数 + 映射」抽为 `assertDraftContract({name, shim, draft, shimSha, draftSha, calls, decl, map, groups})`；F 与 G **各调用一次**，两侧断言**独立计数**（R-ALLN-909 的机制化防御）。F 的 6 个 test 名保留（可改为调用 helper 但仍各自 `test(...)`）。
- **台账登记**：`docs/v4-supersession-ledger.json#designContract.designContractChanges`：`[] → [{ object:'option-g-all-in-next.html + option-g-shim.mjs', before:null, after:{ draftSha:G_DRAFT_SHA256, shimSha:G_SHIM_SHA256, assertions:127, groups:14 }, date:'2026-09-22', reason:'X4 / FR-ALLN-101~102：G 稿入 design-contract，与 F 并存不替换' }]`。
- **G 稿零改动**（D7 / N20 / FR-ALLN-103）：`git diff --quiet -- packages/web-cli-plugin/design` 通过。

## 后果

**正面**：设计-实现一致有**机器证据**（G 127/127 入门禁）；F 契约继续成立（N21）；契约真空（Q-ALLN-013 / R-ALLN-005）消除。

**代价 / 风险**：`test:design-contract` 计数 **6 → ≥13**（只增）；`G_ASSERTION_MAP` 127 行需逐条 clause/owner（工作量集中于 v5-1，但一次性）；G shim 实跑引入一次 `node` 子进程（与 F 同构，成本已知）。R-ALLN-909（混池）由「两侧独立计数 + 交集断言」机制化防御。

## 影响 FR

FR-ALLN-100 / 101 / 102 / 103 / 113 / 120；N20 / N21；X4；AC-ALLN-016 / 017 / 020。

## 回滚

删除 `G_*` 常量 / `G_ASSERTION_MAP` / G 侧 test 块，并把台账 `designContractChanges` 还原为 `[]` —— F 侧**从未改动**。回滚后 `test:design-contract` 回到 6 断言（不出现「计数下降」因为整个 G 块是新增）。
