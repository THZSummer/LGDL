# ADR-SGO-007: 体积分列预算（A/B/C 列 + 15% 缓冲 + 2.8× 最坏 + 逐叶重登记 + 升档 EC 路径）

## 状态
ACCEPTED

## 背景

**v5 的教训（逐字登记，承 ADR-V55-011）**：plan 预算表给 9 op 执行体 3,400 B，**实测仅 `ops.ts` 一项即 3,918 B**，面板接线另 +4,935 B ⇒ **预算低估约 2 倍**，导致 v5-2 R1 越档位、必须由编排器裁决**显式升档**。v55 三叶超预算 +6,015；R6 +5,199。本条 ADR 的存在理由 = **不再重犯**：先给**分列预算 + 上界 + 缓冲**，再排落地（FR-SGO-120~125 / R-SGO-006/910 / 纪律第 9 条）。

**现行口径（本轮只读复核，承 spec §5.12.1 / R6 登记）**：

| 项 | 值 | 来源 |
|---|--:|---|
| `dist/sidepanel.js` 登记基线 | **578,623 B** | `test/size-baseline.ts:351`（R6 登记 2026-09-23） |
| 生效上限 | **607,554 B** = `floor(578,623 × 1.05)` | `test/size-baseline.ts:522`（判定 = 公式唯一） |
| **余量（生效上限）** | **28,931 B** | 算术 |
| 已登记档位 | **614,400 B** | `test/size-baseline.ts:522` |
| 距档位 | **35,777 B** | 算术 |
| 绝对上限 | **675,840 B** = 档位 × 1.10 | V3-VOL-3 |
| 自缚装置 | `SIDEPANEL_CEILING_CAP` = **`record-only`**（不参与判定） | `:581` |
| 授权线 | `authorConfirmation.status` = **`pending-author-line`** | 台账（未闭合义务） |

## 决策

### 1. 分列预算（**A 计账 / B 不计账 / C 零容差**）

| 列 | 产物 | 叶1（范围底座）落地项 | 叶2（批量授权）落地项 | 计账 |
|:-:|---|---|---|:-:|
| **A** | `dist/sidepanel.js` | `l1/ref-scope.ts`（读数单源 + 快照投影）· `sidepanel.ts`（载荷构建 / 范围闸 / 留痕 / 二择接线）· `l1/ref-store.ts`（只读取用）· S0′ 断言支撑 | `chat-state.ts` / `cards/auth.ts`（计划渲染）· `sidepanel.ts`（计划 passthrough + 二择） | ✅ |
| **B** | `dist/background.js` | `service-worker.ts`（系统段组装 + 载荷签名 + active-refs 缝）· `ref-context.ts` / `ref-turn.ts` / `ref-observe.ts` · `src/tools/**`（包装 + 失配口径）· `turn-queue.ts` · `messaging.ts`（type-only） | `security/confirm.ts`（计划感知 + 指纹准入 + 计划外回落）· `batch-plan.ts` · `service-worker.ts`（批次捕获） | ❌ |
| **C** | `content.js` / `pick-layer.js` | **零触碰** | **零触碰** | 零容差 |

| 预算口径 | 叶1 | 叶2 | Σ | +15% 缓冲 |
|---|--:|--:|--:|--:|
| **A 列（sidepanel 净增）** | **6.0~9.0 KB** | **3.5~5.5 KB** | **9.5~14.5 KB** | **10.9~16.7 KB** |
| **B 列（background.js，不计账）** | 5.0~8.0 KB | 3.0~5.0 KB | 8.0~13.0 KB | — |
| **2.8× 最坏（A 列）** | — | — | **≈26.6~40.6 KB** | **≈30.6~46.7 KB** |

### 2. 缓冲校验（硬要求）

| 情形 | A 列 × 1.15 | 判定 |
|---|--:|:--:|
| **正常口径（预算上界）** | 14.5 KB × 1.15 = **16.7 KB** | ✅ ≤ 28,931 B（生效上限余量）且 ≤ 35,777 B（距档余量） |
| **2.8× 最坏** | 40.6 KB × 1.15 = **46.7 KB** | ⚠️ **可能跨档位 614,400** ⇒ 预置 EC-SGO-022 显式升档路径 + 作者一行（**本阶段不触发**） |

### 3. 充分利用 B 列（FR-SGO-121）

计算密集 / 判定密集的**新逻辑优先落 SW 侧**（不计账）：

| 逻辑 | 落点 | 列 |
|---|---|---|
| 系统段**追加段组装**（引用事实 + 法则引导） | `background/ref-context.ts` | B |
| `--ref` 解析 + live 单节点闸 | `src/tools/dom-anchor.ts` + `background/ref-observe.ts` | B |
| 回合载荷运行时校验 | `background/ref-context.ts` | B |
| 批量计划构建 / 指纹 / 准入 | `background/batch-plan.ts` + `security/confirm.ts` | B |
| 引用快照投影 + 范围读数 + 留痕单源 | `l1/ref-scope.ts` | **A**（唯一必须落面板的判定源 —— 面板持有 ref-store 且写闸在面板） |
| 载荷构建（唯一构建点）/ 范围闸 / 计划渲染 | `sidepanel.ts` / `chat-state.ts` / `cards/auth.ts` | **A** |

> **纪律**：**不得**为绕门禁把代码搬进 / 搬出 sidepanel（FR-SGO-121 逐字）；归因表逐模块 → 产物。

### 4. 逐叶收口实测重登记（FR-SGO-125，不等两叶合计）

- **叶1 落地后即测即登记**；叶2 落地后再登记。
- **登记五要素**：前后值 / 日期 / 来源 / 理由 / 历史保留 + V3-VOL-3 **三值同源前移**（`tierBytes` / `absoluteCeilingBytes` / `newBaselineBytes`）+ **metafile 逐模块归因**（Σ 逐模块 Δ + 未归因胶水 == 登记增量）。
- `SIDEPANEL_BASELINE_BYTES_TIMELINE` **只追加**（不改写历史）。

### 5. 越限路径 = EC-SGO-022 显式路径 + 作者一行（FR-SGO-122 / 124）

| 越限 | 动作 |
|---|---|
| 越**生效上限**（607,554） | 显式重登记基线（同源前移，仍不跨档位） |
| 越**档位**（614,400） | 走 **EC 显式升档路径**：档位 → `ceilTo50KB(实测)`；绝对上限 → 档位 × 1.10；**作者一行**；五要素重登记 |
| 越**绝对上限**（675,840） | **停止并请示作者** |

- `authorConfirmation` **不得**伪称已确认（N-SGO-023 / N-SGO-030）；`SIDEPANEL_CEILING_CAP` 保持 `record-only`。

### 6. 减体积优先级（越预算时**按序**执行；不触碰断言 / 容差 / 档位口径）

1. 把纯记账 / 判定逻辑下移 `background.js`（**不计账**）；
2. 元组化声明数据（v5 `ops.ts#IMPL` 先例：命名对象字面量每字段 ≈10 B 格式开销）；
3. 复用既有文案（系统行 / receipt / 静态三段模板），零新字符串；
4. 复用 `auth` 卡渲染面（计划行走既有渲染 + 一个渲染用字段）；
5. **显式登记未落地项**为未闭合义务 —— **绝不以删判据 / 放宽容差 / 静默下调档位实现**。

### 7. 冻结面零容差（FR-SGO-123 / N-SGO-001/002/009）

- `dist/content.js` **177,076 B**（sha `52a82620…`）/ `dist/pick-layer.js` **34,358 B**（sha `77796bab…`）—— **逐字节 + sha 双锚**；
- `KIND_SET` **40 项逐字**；
- 构建后 `stat` + sha256 前后一致；`content.test.ts` / `pick-layer-budget.test.ts` 绿。

### 8. 每叶的体积证据义务

| 义务 | 判据 |
|---|---|
| 五要素重登记（每叶增量） | `test/size-budget.test.ts` + `test/size-growth-evidence.test.ts` 全绿 |
| 逐模块归因 | `dist/build-meta.json` 的 `bytesInOutput`；Σ Δ + 胶水 == 登记增量 |
| 披露算术机核 | `validateReRegistrationDisclosure`（既有） |
| cap 纪律 | `SIDEPANEL_CEILING_CAP === 'record-only'` 且判定不含 cap |
| 红线零容差 | `content.js` / `pick-layer.js` 逐字节 + sha 双命中 |

## 后果

**正面**
- 体积从「事后惊喜」变为**事先有界**：分列预算 + 上界 + 15% 缓冲三层，正常口径明确**不触发升档**。
- B 列（SW 产物）承接系统段 / `--ref` / 批量判定 ⇒ 本 Feature 的主体逻辑**天然不计入 sidepanel 账本**。
- 2.8× 最坏有**显式升档预案**而非事后补救；`pending-author-line` 的占位语义被保住（不得伪称确认）。

**负面 / 代价**
- A 列读数模块（`ref-scope.ts`）**必须落面板**（面板持 ref-store 且写闸在面板）⇒ 占 A 列预算；若上界被突破，按 §6 优先级压缩（降不了则走 §5 升档路径）。
- 分列预算仍可能低估（v5 教训）⇒ 用**上界列 + 减体积优先级 + 2.8× 最坏预案**兜底；若上界也被突破（Σ×1.15 > 28,931）⇒ **停机上报**（走 V3-VOL-3 档位流程），**不静默**。

**被否决的替代**
- **静默放宽上限 / 静默改档位 / 引入新自缚 cap**：N-SGO-023 / NG-SGO-021。
- **把 B 列逻辑搬进 A 列规避 / 或把 A 列搬出以绕开门禁**：FR-SGO-121 明文禁止。
- **单叶合并登记**（无逐叶归因）：无法定位归因（v5 教训）。

**判据锚**：`test/size-baseline.ts`（逐叶重登记）· `test/size-budget.test.ts` / `size-growth-evidence.test.ts` / `size-ruling-vol3.test.ts` · `test/content.test.ts` / `pick-layer-budget.test.ts`。
