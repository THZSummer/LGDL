# ADR-SGO-006: S0′ 双面机器化（`ty.md` 原案重放 + 双向反证 + 真源切片 + 人工面如实登记）

## 状态
ACCEPTED

## 背景

**S0′ 的地位**：本 Feature 的**首验收场景**，地位 = v5.5 之 **S0**（`test/ui/s0-self-driven.mjs`）/ v5 之 **S2**。它是**第一现场证据 `ty.md`（1963 行）的原案重放**：

```
拾取引用 ①（refNum=1，出生有效）→ 答「原地翻译为中文」→ 自动成回合（载荷含引用事实）
→ SW 系统段 = 基座 + 追加段（引用事实 + 法则引导）
→ 范围读数 = in-scope（本次目标 = 引用目标）
→ 只改写引用目标恰 1 处（改写处数 ≤ 引用数）
→ 若批量计划：一次手势覆盖计划内全部（计划外逐条回落）
→ 若需扩大范围：先 ask-user 二择（选「整页」⇒ 读数转 out-of-scope-authorized + 入留痕）
→ 完成交代如实（清单条数 == 实际改写处数）
→ 留痕行独立成行且含范围读数字段名（不含值）
```

**决定性反证**（承 §0.2 / ADR-SGO-001 背景）：AI 已读到 `data-wcli-ref="ref_1"` 且恰 1 命中**仍未锚定** ⇒ S0′ 的机核必须证「范围受限」，而不是「AI 恰好好心」。

**spec 裁决（FR-SGO-090~094 / AC-SGO-001 / 013 / 014；R-SGO-909）**：S0′ 全链**机器化**（node + Chromium 双面；样本单源）；核心断言「**改写处数 ≤ 引用数（除非 authorized）**」；**双向反证**（去注入 ⇒ 读数为空必红）；人工观感项逐项 `⏳ 未执行`，**不冒充 PASS**。

## 决策

### 1. 样本单源（禁第二份样本）

- **扩展** `test/ui/fixtures/s0-chain.mjs`（node 面与 Chromium 面**共用同一份**）：新增 S0′ 范围内核拍：
  - `ref-in-turn`（③ 拾取后：载荷含引用事实 `refNum=1` / `refState=valid` / `selector` 非空）
  - `scope-inject`（⑤ 作答后：系统段 = 基座 + 追加段）
  - `read-in-scope`（读数 = `in-scope`）
  - `write-1`（`set-text` 目标 = `[data-wcli-ref="ref_1"]`；**改写处数 = 1**）
  - `no-injection`（**反证拍**：去掉范围注入 ⇒ 读数 = `no-ref`）
- 既有 `S0_CHAIN` 10 环节**逐字保留**（只增不减）；新增拍追加在既有链之后 / 归类到既有环节读数。

### 2. node 面：扩展 `test/s0-self-driven-chain.test.ts`

| 判据 | 内容 | `expectFailPattern` |
|---|---|---|
| `S0P-1-refs-in-turn` | 回合载荷含引用事实且**可判命中**（`refNum` / `refState=valid` / `selector` 非空） | S0′：回合载荷必须含引用事实且可判命中 |
| `S0P-2-system-append` | 系统段 = 基座（5 条条款逐字）+ 追加段；**零引用 ⇒ `system === 基座`（逐字）** | S0′：系统段必须为基座 + 追加段；无引用必须逐字等于基座 |
| `S0P-3-read-in-scope` | 读数 = `in-scope`（本次目标 = 引用目标） | S0′：引用目标内的写必须判 `in-scope` |
| `S0P-4-writes-le-refs` | **改写处数 ≤ 引用数**（未授权时；本场景 = 1 ≤ 1） | S0′：未授权时改写处数不得超过引用数 |
| `S0P-5-authorized-branch` | 需扩围 ⇒ 读数转 `out-of-scope-authorized` + 入留痕；否则改写处数 > 引用数即红 | S0′：扩围必须由用户批准产生 `out-of-scope-authorized` 且入留痕 |
| `S0P-6-trace` | 留痕行独立成行且含范围读数**字段名**（`scope.reading` / `scope.authorized`） | S0′：留痕必须独立成行且含范围读数字段名（不含用户内容值） |
| `S0P-7-bidirectional` | **双向反证**：去注入 ⇒ 读数 `no-ref` ⇒ 必红；逐字节还原（sha256）⇒ PASS | S0′ 双向反证：去掉范围注入后读数必须为空 / `no-ref`（否则必红） |
| `S0P-8-honest-report` | 完成交代清单条数 == 实际改写处数 | S0′：完成交代必须如实（清单条数 == 实际改写处数） |

### 3. Chromium 面：扩展 `test/ui/s0-self-driven.mjs`（**只加断言不加文件**）

- 真面板驱动：绑定 → 拾取引用 → 作答 → 自动成回合 → 断言：
  - 回合载荷含引用事实（经面板可读面 / 测试钩子读取）；
  - 系统段追加段在位（真面板驱动路径）；
  - **恰 1 处** `dom set-text` 命中 `[data-wcli-ref="ref_1"]`（真页面上写 1 个节点）；
  - 留痕行含范围字段名；
  - 批量分支（叶2 增）：一次手势覆盖计划内全部 + 计划外逐条 + 二择。
- **`CHROMIUM_GATES === 9` 逐字不动**（`s0-self-driven.mjs` 已在受审集合内 ⇒ **只加断言**）。

### 4. 双向反证（决定性，FR-SGO-092 / AC-SGO-013）

```
注入（去掉范围注入）⇒ 声明 expectFailPattern 的段实跑 FAIL
⇒ 逐字节还原（sha256 前后相同）⇒ PASS
```

至少两组：
1. **去范围注入** ⇒ 机制读数 = `no-ref`（AI 无法判范围）⇒ 若门禁仍 PASS ⇒ 恒真缺陷；
2. **构造未授权越界写**（引用 = 1，目标 ∉ 引用集合，未征询）⇒ 读数 = `out-of-scope-unauthorized` 且被拦。

**禁止**：删属性充数 / 自我裁决 / 换口径放松（FR-SGO-111）。

### 5. 真源切片（FR-SGO-072 / R-SGO-909）

- node 判官读**生产路径真源**：`src/ui/sidepanel/l1/ref-scope.ts`（读数模块）+ `src/ui/sidepanel/sidepanel.ts`（载荷构建 / 写闸切片）+ `src/background/ref-context.ts`（系统段切片）；
- **不读**测试自建常量 / 不读 `dist` 副本；
- 反证：改动生产真源（如把 `no-ref` 改判 `in-scope`）⇒ 必红。
- **禁「脚本绿而非链路可判」**：判据必须走生产模块，而非用假 provider 跳过真实读数与包装（承 v5-2 review BLOCK-03 教训）。

### 6. 保护段与门禁（N-SGO-016 / N-SGO-017）

- `test/ui/journey.mjs` 保护段 `43054..58287`（240 行，sha `cc79f413…`）/ `test/ui/binding.mjs` 保护段 `107780..115930`（sha `be9ad0e9…`）：**保段优先**（`decision = keep` 前提不得静默改写）；若确需取代 ⇒ 走八步 + 留痕。
- 门禁**严格串行**（`test` / `test:ui` / `test:binding` 绝不并发；一次一个 Chromium；`finally` 自清 profile）。
- 法九门禁 = **node** ⇒ 入 `gate-integrity` node 下界（只增）；Chromium 门禁文件数 **9 不动**。

### 7. 人工面如实登记（FR-SGO-094 / AC-SGO-026）

| # | 人工项 | 判据来源 | 本轮状态 |
|:-:|---|---|:--:|
| M1 | 「AI 是否真的把『原地』理解为引用目标」（语义遵从观感） | 真机观感（S0′ 机核只证读数与改写处数） | `⏳ 未执行` |
| M2 | 42 张连点疲劳是否消失（体感） | 作者体感（叶2） | `⏳ 未执行` |
| M3 | 批量计划卡在真机的可读性 / 可否决性 | 作者观感（叶2） | `⏳ 未执行` |
| M4 | SPA 重渲染下锚定失败提示的实际可理解度 | 真机观感 | `⏳ 未执行` |

> **不冒充 PASS**：headless 不可合成项逐项标注 `⏳ 未执行`；机核部分（读数 / 改写处数 / 双向反证）**机器可验**，两部分**分开陈述**。

## 后果

**正面**
- S0′ 把真机母缺陷现场**机器化**为一条可回归样板（对位 v5.5 之 S0 / v5 之 S2）。
- 「改写处数 ≤ 引用数」是**范围受限**的直接判据；双向反证保证不写成脚本绿。
- 样本单源（node + Chromium 共用）⇒ 两面不可互相掩盖（承 R-V55-111 教训）。

**负面 / 代价**
- node 与 Chromium 两面都要扩断言（工作量集中在判据）；Chromium 面需真面板驱动 `dom set-text --ref`。
- 「AI 语义遵从」这类观感**无法** headless 合成 ⇒ 必须诚实地留在人工面（M1），不得用机核冒充。

**被否决的替代**
- **只做 node 面**（跳过真面板）：S0′ 退化为纯逻辑判，无法证「真链路可判」。
- **新增 Chromium 门禁文件**：撞 `CHROMIUM_GATES === 9`（N-SGO-017）。
- **用测试自建常量判读数**：真源切片失效（R-SGO-909）。

**判据锚**：`test/s0-self-driven-chain.test.ts` · `test/ui/s0-self-driven.mjs` · `test/ui/fixtures/s0-chain.mjs` · `test/gate-integrity.test.ts`（受审集合只增）· `test/ui/journey.mjs` / `binding.mjs`（保段）。
