# ADR-IAN-007: 保护段逐段决策（journey 八步取代 / binding keep 字节中立）

## 状态
ACCEPTED（裁决 PD-IAN-009 / COR-IAN-1；承父 spec FR-IAN-103 / AC-IAN-021 / N-IAN-015 / §2.5B）

## 背景

两条**活跃保护 pin**（`docs/v4-supersession-ledger.json#protectedRanges` + `test/supersession-ledger.test.ts#protectedPinFailures`）：

| 段 | startByte | endByte | sha256（前 8） | status | decision | 判据 |
|---|--:|--:|---|---|---|---|
| journey | **43054** | **58287** | `cc79f413…` | active | `supersededFrom e2b500df…`（v4.5-1 第二次取代后重算） | sha 双绿 + start/end 字节偏移逐字节 |
| binding | **107780** | **115930** | `be9ad0e9…` | active | `keep`（`supersededFrom:null`） | sha 双绿 + `startAnchor` 字节偏移 = 107780 |

**COR-IAN-1**：discovery §7.4/§0.2 引用的 `42766..54004`（sha `6b45c3fa…`）是 **v3 原始 pin**（保留在 `supersessionChain` / `history[0]`，可复算）——**本轮重锚对象 = 当前活跃 pin**；旧 pin 作为历史链节保留，旧数字不改写。

**本轮只读实测（决定性）**：

| 探针 | journey（段 43054..58287） | binding（段 107780..115930） |
|---|---|---|
| 段内 `composer` 命中数 | **≥10 处**（含 `#15c` 的 `composerExists/composerHidden/composerParentIsBody/composerInStream/composerIsBodyTailLayout` + 几何 `composerGapToBottom` + `composer.getBoundingClientRect()`） | **0 处** |
| 段内 `#input`/`#send` 命中 | 经 `composer.parentElement` 间接 | **0 处** |
| 相关读面相对段的位置 | **全部在段内** | **全部在段前**（`composerHidden/inputDisabled` ≈ byte 4463；`DIAG_SELECTORS` 的 `'composer'` ≈ 6238；真实键入 `#input`/`#send` ≈ 58028 / 58258 / 61002 / 61072；段内唯一标记 `'#22a 树内检索定位…'` ≈ 109468） |
| 段内能否「字节中立」保住 | **不可能**：`#15c` 断言 `composerExists === true`，元素真退役后该断言必 FAIL ⇒ 段字节**必须**变 | **可能**：段内零读面，段前改写可用等长补偿使 `startAnchor` 仍 = 107780 |

## 决策

**① journey `43054..58287` / `cc79f413…` ⇒ 八步显式取代（supersede）。**

> 裁决依据 = 「元素真退役」与「断言 `composerExists === true`」**语义互斥**；这不是「放宽（拉掉断言）」，而是**同编号等价改写**（判据更强：元素不存在）。

八步（逐条可机核；承 ADR-V45-004 模板，与 v4.5-1 第二次取代同形）：

| 步 | 内容 | 证据锚 |
|:-:|---|---|
| ① 记录 old | 当前 pin `{43054..58287 / cc79f413… / 240 行 / supersededFrom e2b500df…}` **逐字写入** `protectedSupersession.history[]`（含本轮 eightSteps） | `history` 新节；旧节逐字保留 |
| ② 逐段决策 | journey = `supersede`（理由：`#15c` + 几何读面在段内，退役必然改段字节）；binding = `keep`（见 ②） | 本 ADR |
| ③ 同编号等价改写（强度不降） | `#15a`~`#15q` 保持编号；**`#15c` 改写**为「`#composer`/`#input`/`#send` 三 id 均不在 DOM ∧ 默认屏零可见 `input/textarea/select/[contenteditable]` ∧ 流内 `free-input` 卡内输入存在且可展开」；几何读面 `composerGapToBottom` **消解并显式登记**（元素不存在 ⇒ 无 gap 语义；**不得**静默 `null` 通过），新增「流内输入卡几何（不越出视口）」等价读面 | journey 新段 |
| ④ 登记 `modifiedRanges[]` | 段内改写逐条（base 相对行号区间 + `oldId:"#15c"` / `decision:"equivalent-rewrite"` / `reason` / `leaf`） | v4 台账 `modifiedRanges` |
| ⑤ 计算并写新 pin | `protectedRanges[journey]` 重算 `{startByte, endByte, sha256, lineCount, status:"active", supersededFrom: <本轮前 pin>, supersededOn, leafBase, oldPin}`；`supersessionChain[]` 追加一节（连续性 `chain[i].supersededFrom === chain[i-1].sha256`） | `supersession-ledger.test.ts` 链判据（`:930-1015` 同款） |
| ⑥ 计数守恒（只增） | `countMethod = "runtime-check-calls"`；journey 运行时 check **只增**（同编号改写 + 新增流内输入卡几何判据），`countEvidence` 记录实测值 | 台账 `countEvidence` |
| ⑦ `redlineRemap[]` 追加 | `composer 贴底 / 出流` → **「流外零输入面」**（含 `#15c` 语义迁移）；老 6 条逐字保留 | `redlineRemap` 6 → 7 |
| ⑧ RP-V4-08 反证复用实跑 | 段内改 1 byte ⇒ 新 pin sha 判据 FAIL；段外改 1 byte ⇒ 不红；删 1 条断言 ⇒ 计数下界 FAIL；逐字节还原（sha256 前后相同）⇒ PASS | 日志全量落盘 |

**② binding `107780..115930` / `be9ad0e9…` ⇒ keep（字节中立）。**

- 段内**零** `composer`/`#input`/`#send` 命中 ⇒ 本轮所有 binding 改写（`DIAG_SELECTORS` 去 `composer`、真实键入 `#input`/`#send` → 卡内输入）**全在段前**。
- 因此走 **v4.5-1 的 `keep` + 段前等长补偿先例**（binding 已有两处 `V45W2` 段前字节中立避让）：① sha 双绿（段本体不动）；② `startAnchor` 字节偏移**仍 = 107780**（补偿规则：改写长度差用**等长注释/空行**抵消）；③ 段外改写**逐行登记** `modifiedRanges[]` + `entries[].newTitle` 可在目标文件定位；④ 三反证（段内 1 byte ⇒ sha 红；段前 +1 byte 不补偿 ⇒ `startByte` 红；登记行改一字 ⇒ 不被覆盖 ⇒ hunk↔台账判据红）。
- **逃生口**：若 build 实测发现等长补偿不可行（例如改写必须净增/净减且无法抵消）⇒ 该段**改走 ② 的八步取代**（`decision:"supersede"` + 台账），**不得**静默改段。

**「先判后选」口径**：本轮**已判**（依据上述只读探针）——journey = 取代；binding = keep。任何与实测冲突的结论必须在 build 阶段以**实测字节**为准并回写本 ADR 对应行（台账同轮）。

## 后果

- 正面：保护段纪律**不降**（sha + 双字节偏移）；「元素不存在非 hidden」由 `#15c` 等价改写承载（判据更强）；binding 零段内改动 ⇒ 最小风险。
- 代价：journey 新 pin 变更属**显式取代**，须 `history`/`supersessionChain`/`modifiedRanges`/`redlineRemap` **四处同步**（漏一处 ⇒ 链判据 / 老 remap 保留判据红）；journey #15c 的三个 composer 布尔断言须换成「三 id 零命中」等价断言，**不得**只删不断言。
- 反证族：见 ①⑧ + ②④。

## 影响文件（预估）

| 操作 | 文件 | 说明 |
|:--:|---|---|
| MODIFY | `test/ui/journey.mjs` | 段内 `#15c` / 几何读面同编号等价改写（新 pin） |
| MODIFY | `test/ui/binding.mjs` | 段前 `DIAG_SELECTORS` + 真实键入重锚（等长补偿，段内零字节） |
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` | journey：history 新节 + protectedRanges 新 pin + supersessionChain + modifiedRanges + redlineRemap；binding：段外登记 |
| MODIFY | `test/supersession-ledger.test.ts` | journey 新 pin 链判据 + binding 双绿 keep 判据（老判据保留） |
