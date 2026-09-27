# ADR-NDA-202: 门禁计数等价重锚的具体数值与首开 / 保护段处置（含 `driver-quadruple` 12→13）

## 状态
PROPOSED

## 背景

本叶引入**一个**新 provider（`llm.abnormal`，ADR-NDA-007 §③，复用 `op.llm-config`）。复核发现这会打在两处**「恰 12」**的硬判据上：

```ts
// test/driver-quadruple.test.ts:233-235
assert.equal(DECL_IDS.length, 12, `${JUDGEMENTS[0].expectFailPattern}：声明表必须恰 12 行（11 + ai-next）`);
assert.equal(PROVIDER_IDS.length, 12, `${JUDGEMENTS[0].expectFailPattern}：注册表必须恰 12 行（11 + ai-next）`);
assert.deepEqual([...DECL_IDS].sort(), [...PROVIDER_IDS].sort(), '12↔12 必须逐项同集（不是只对数）');
// test/driver-quadruple.test.ts:376-378（DQ 终态复跑同一判据）
// test/next-registry.test.ts:264,315
assert.equal(decls.length, 12, '声明行必须恰 12（IAN-1 free-input + F-36/ADN-1 ai-next）');
```

同时，不得顺手放开**另外三处**「恰 N」（它们与本 Feature 无关，放开即红线）：

```ts
// test/blocked-terminals.test.ts
assert.equal(BLOCKED_TERMINALS.length, 5, '阻塞终态必须恰 5 类');        // :342
assert.equal(OPS_RECOVERY_PROVIDER_IDS.length, 2, 'op-driven 修复 provider 必须恰 2 个'); // :259,392
assert.equal(RECOVERY_PROVIDER_IDS.length, 5, 'P0 恢复 provider 必须恰 5 个');  // :384
// test/driver-terminals.test.ts
assert.equal(DRIVER_TERMINALS.length, 4);   // DTM-1
assert.equal(PROACTIVE_MOMENTS.length, 7);  // DQ-5
```

## 决策

### ① 计数重锚：**12 → 13**（只增；逐项同集不做「只对数」）

| 门禁 | 重锚 | 反证（判据必须能 FAIL） |
|---|---|---|
| `test/driver-quadruple.test.ts:233-235` | `13` ∧ `13` ∧ 逐项同集（`llm.abnormal` 在**两侧都在**） | ① 声明 13 / 注册 12 ⇒ 必红；② 反向 ⇒ 必红；③ 加一行 `ghost-driver`（只在声明）⇒ 必红；④ 集合同但顺序无关（保持 `sort()` 比对） |
| `test/driver-quadruple.test.ts:376-378`（DQ 终态） | 同 `13` | 同上 |
| `test/next-registry.test.ts:264` | `13` | 删 `llm.abnormal` 声明 ⇒ 必红 |
| `test/next-registry.test.ts:315` | `13` | 同上（还原 PASS 判据） |

新增声明行（`providers.ts#DRIVER_DECLS_SRC`）：

```ts
'llm.abnormal': {
  driverId: 'llm.abnormal',
  timings: ['idle'],            // 复用既有第 3 时机 ⇒ DRIVER_TIMINGS 恰 5 不动
  moments: ['turn-end'],        // 既有时刻 ⇒ PROACTIVE_MOMENTS 恰 7 不动
  driverClass: 'deterministic', // 确定性推荐（无自动按下权）
  priority: 0,
  evidence: ['risk'],           // ★ 与 when(ctx) 实读**同源**（DQ-3 从源文本抽 when-scope 比对）
},
```

### ② **不动的四处恰 N**（逐条守线）

| 集合 | 现值 | 本叶 |
|---|:--:|---|
| `BLOCKED_TERMINALS` | 恰 5 | **不动**（`llm.abnormal` 是**风险态** provider，不是阻塞终态；BT-1「5 个字面量恰一次」也不受影响） |
| `OPS_RECOVERY_PROVIDER_IDS` / `OPS_RECOVERY_ROWS` | 恰 2 | **不动**（不新增 op-driven 行；不把异常塞进 `llm.unconfigured` 行） |
| `RECOVERY_PROVIDER_IDS`（trigger 集） | 恰 5 | **不动**（不新增 `RecoveryTrigger`） |
| `DRIVER_TERMINALS` / `PROACTIVE_MOMENTS` / `DRIVER_TIMINGS` / `NEXT_SOURCE_NAMES` | 恰 4 / 7 / 5 / 7 | **不动** |

⇒ `blocked-terminals.test.ts` / `driver-terminals.test.ts` / `driver-timings.test.ts` / `next-registry.test.ts`（7 源断言）**零改**（若这些文件因其它断言需触碰 ⇒ 只增）。

### ③ 首开（open / ready）：**零行为改动**（`PD-ADN-001` 不转正）

| 面 | 现状（R8） | 本叶 |
|---|---|---|
| 首开入口 | `maybeRecommendOpenEntry()`（`sidepanel.ts:2324-2330`）复用 `'idle'`，两处调用点紧随 `maybeRecommendFirstRunEntry()` | **不碰** |
| 首屏内容 | 零死端 floor（仅含终端卡）或 `capability-discovery` 卡（带终端） | **不碰**（已配置 ⇒ 终端恒常驻，ADR-NDA-005 ⇒ 首屏仍含终端） |
| 未配置首开 | 未配置 ⇒ 现在（本叶后）**无终端** ⇒ 可达 next 由 `llm.unconfigured` 引导 chip 承接（`FR-NDA-091`） | **由 ADR-NDA-005 的分相自动承接**（同一 provider、同一事实源）⇒ 零额外首开代码 |
| 让位 `firstRun` | `firstRunCard.visible === !(configured ∧ authorized)`（零双卡） | **不碰**；`PD-ADN-001` **不转正** ⇒ 登记 `PD-NDA-001`（待后续轮） |
| 零 LLM 往返依赖 | 首屏不依赖网络 / 延迟 | **保持**（本叶不往首开入口加任何 LLM 依赖） |

**判据**：`test/r8-open-next-entry.test.ts` R8-1~6 **全绿且零改**（若红 = 实现缺陷，不改判据）。

### ④ 台账终态（`xNdaLedger` / `xNdaGateReconciliation` / `xNdaLedgerFull`）

- `xNdaLedger` 叶2 收口四行：`X-NDA-3`（未配置分相，superseded）、`X-NDA-4`（异常兜底，superseded/新增项）、`X-NDA-10`（首开保持，`no-supersession`）、`X-NDA-11`（计数，**`no-supersession`** —— 依据 ADR-NDA-006 的回调内 nudge）；叶1 已登记其余 8 行；
- `xNdaLedgerFull`：两叶合并终态（**已发生取代 7 / 保留 1（9 子项）/ 未发生取代 4**，逐条 `counterCheck`）；
- `xNdaGateReconciliation`：ADR-NDA-009 §④ 的 **25 行**逐条三态齐（**禁漏项**；间接面逐条确认）；
- **老条目（v3 / v4 / v4.5 / v5 / v5.5 / v5.5.1 / v5.5.2 / v5.5.3 / F-36 段）一律保留不动**（只追加）。

### ⑤ 保护段逐段决策（**默认 `keep`，字节中立**）

| 段 | 决策 | 判据 |
|---|---|---|
| journey `[43484,59347)` sha `7b309258…` | **`keep`** | `protectedPinFailures` 双绿（段本体 sha + 起始字节）+ `startByte` 显式断言；`modifiedRanges` 为空 |
| binding `[107780,115930)` sha `be9ad0e9…` | **`keep`** | 同上 |

- 若 build 实测**必须**触碰（例如新增断言落在段内）⇒ **八步显式取代**：old 可机核 → 等价改写 → `modifiedRanges` 逐行登记 → 新 pin（`supersededFrom` 指向前任）→ `protectedSupersession.history` 追加 → 理由 / 日期 → 台账 → `startByte` 断言更新；**禁静默改写**（`N-NDA-015`）。
- **禁止**为「避免哈希变更」删断言（`NG-NDA-019`）。

### ⑥ `KL-N-10` 环境性 flake 处置

- 门禁**严格串行**（`test` / `test:ui` / `test:binding` 绝不并发；一次一个 Chromium；`finally` 自清 profile）；
- 首轮异常 ⇒ **隔离复跑 ≥2**、日志全量、**仍红如实记录不阻塞收口**（不伪造串行绿，`EC-NDA-025` / `FR-NDA-136`）;
- 涉及面：`s0-self-driven` / `recommendation` / `binding` 相位（本 Feature 触前三者较深）。

## 备选方案

| 方案 | 处置 |
|---|---|
| 让 `llm.abnormal` **不注册为 provider**，改由既有 provider 的 `textOf(ctx)` 分相（provider 数仍 12、零重锚） | ⚠️ 零门禁代价，但把两个语义压进**一行**（`llm.unconfigured` 行承担「未配置」与「异常」两义）⇒ `when` 变成两个 risk 的并集、`chips` 同一 op、文案靠 `ctx` 分支；**结构上抹平分相**（R-NDA-904 风险升高、`N-NDA-026` 精神受挑战）。ADR-NDA-007 已以「分相干净」为由否决 |
| 把 12 改成「≥12」（放宽为下界） | ❌ 判据强度下降（`N-NDA-012` 禁降级）；重锚必须是**等价**（逐项同集 + 计数只增） |
| 新增第 6 个 blocked terminal 承载异常 | ❌ 破恰 5（`:342`）+ BT-1 双门禁；且语义不符（风险态 ≠ 阻塞终态） |
| 首开入口加「异常时也推兜底」 | ❌ `PD-ADN-001` 不转正（`NG-NDA-017`）；首屏可达性是 R8 的地板（`N-NDA-028`） |
| 保护段「顺手重排」以容纳断言 | ❌ 哈希静默变更（`N-NDA-015` 明禁） |

## 后果

**正向**：
- 计数重锚**显式、只增、逐项同集**，并配四条反证 ⇒ `R-NDA-914`（静默放宽）被结构性挡住；
- 四处无关的「恰 N」逐条守线（不因为一处重锚而顺手放开其它）；
- 首开与保护段**零行为改动 / 字节中立** ⇒ R8 地板与保护段哈希双绿；
- X-NDA-11 降为 `no-supersession` ⇒ 少一处重锚（净收益）。

**代价 / 风险**：
- 两处「恰 12」必须改（这是新增 provider 的**已知代价**，`COR-NDA-15` 已定位）；
- `DRIVER_DECLS_SRC` 加一行 ⇒ 需保证 `evidence:['risk']` 与 `when` 实读**同源**（DQ-3 从源文本抽 when-scope）⇒ build 时必须让 `docs.test.ts` / `driver-quadruple` 的 when-scope 抽取能解析 `llm.abnormal.when`（若抽取器对 `ctx.risk.includes(CONST)` 形式熟悉——`llm.unconfigured` 行已是同形，`providers.ts:138` ⇒ 预期零解析器改动）；
- 「恰 13」的失效风险：若后续再引入 provider，须再次重锚（可接受，判据仍可 FAIL）。

## 落地判据（供 tasks/build）

1. `DECL_IDS.length === 13 ∧ PROVIDER_IDS.length === 13 ∧ 逐项同集`；四条反证（声明多 / 注册多 / 幽灵行 / 少一行）各自必红；
2. `next-registry` NR-10 恰 13（两处）；`DRIVER_DECLS_SRC['llm.abnormal'].evidence === ['risk']` 且与 `when` 实读同源；
3. `BLOCKED_TERMINALS === 5` / `OPS_RECOVERY_PROVIDER_IDS === 2` / `RECOVERY_PROVIDER_IDS === 5` / `DRIVER_TERMINALS === 4` / `PROACTIVE_MOMENTS === 7` / `DRIVER_TIMINGS === 5` / `NEXT_SOURCE_NAMES === 7` **逐字未变**；
4. `test/r8-open-next-entry.test.ts` R8-1~6 绿且文件**零改**；零双卡判据绿；首屏无网络依赖；
5. `xNdaLedger*` 三键存在，老键逐字保留（`git diff` 只增）；`xNdaGateReconciliation` 25 行三态齐、无「未处置」；
6. 保护段双绿（sha + `startByte`）；`modifiedRanges` 为空或逐行登记；`assertionsRemoved === 0`。
