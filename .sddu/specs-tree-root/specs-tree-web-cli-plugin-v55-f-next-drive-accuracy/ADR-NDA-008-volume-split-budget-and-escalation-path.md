# ADR-NDA-008: 体积分列预算与升档预案（A 距档 9,798 B / 2.8× 最坏 / EC-NDA-016 + 作者一行）

## 状态
PROPOSED

## 背景

A 列（`dist/sidepanel.js`）基线与档位**极紧**：

| 项 | 值 | 来源 |
|---|---|---|
| A 基线 | **604,602 B** | `test/size-baseline.ts:389`（`SIDEPANEL_BASELINE_BYTES = 604_602`） |
| 档位 | **614,400 B** | `size-baseline.ts:604-612` 登记段；**距档仅 9,798 B（薄）** |
| 生效上限 | `floor(604,602 × 1.05) =` **634,832 B**（余量 30,230 B） | 公式唯一；`SIDEPANEL_CEILING_CAP` 已降级为 `record-only`（`size-baseline.ts:563-571`） |
| 绝对上限 | **675,840 B** | `= 614,400 × 1.10` |
| 冻结面 C 列 | `content.js` **177,076 B** / `pick-layer.js` **34,358 B** / `KIND_SET` 40 | 零容差（`FR-NDA-142`） |
| `authorConfirmation` | `pending-author-line`（**未闭合义务**） | `docs/v4-supersession-ledger.json#v3Vol3Closeout` |
| 历史教训 | v5 plan 对 A 列**低估 2.8×**（实测 `ops.ts` 一项即 3,918 B） | `size-baseline.ts:678` 登记段 |

本 Feature 触：新工具 def + `intercept` 接线 + schema + 捕获/校验 + nudge 链 + 异常判定 + 兜底 provider + 分相接线 + 规则位重锚。**必须先出分列预算再排落地**（R-NDA-006 / FR-NDA-140 / NG-NDA-021）。

## 决策

### ① 列别定义（**唯一**归因口径）

| 列 | 产物 | 是否计入 sidepanel 账本 |
|:--:|---|:--:|
| **A** | `dist/sidepanel.js`（面板） | ✅ 计入（受档位 / 生效上限约束） |
| **B** | `dist/background.js`（SW） | ❌ **不计入**（旁路档位压力的唯一理由） |
| **C** | `dist/content.js` / `dist/pick-layer.js` | 零容差（逐字节 + sha 双锚） |

**B 列优先**（DC-NDA-013 / O-NDA-013）的落地依据：捕获 / 解析 / 5 道校验 / 装配 / nudge 编排 / 异常判定 / 兜底装配全在 `background`；SW 已持有 LLM 输出与该回合事实，面板**只接收已校验候选**（`service-worker.ts:1036-1042` → `sidepanel.ts:4224`）。

### ② 逐叶逐模块预算（**上界保守；以 spec §5.14.1 包线为准**）

| 叶 | 列 | 模块（NEW/MODIFY） | 预算（B） | 说明 |
|:--:|:--:|---|--:|---|
| 叶1 | A | `recommend.ts`（`NEXTSTEP_PRIORITY` 恰 5 + 标签 + 注释） | +80 ~ +250 | 规则表一项 + 标签一项 |
| 叶1 | A | `providers.ts`（`ai-next.rule` 字面量 + `RULE_PROVIDER_IDS`） | +40 ~ +120 | 字面量级 |
| 叶1 | A | `cards/nextstep.ts`（AI 候选渲染复用） | **0**（预期） | 复用既有 chip / `data-op` 单源分发；如需识别新态 ⇒ +0~+150 |
| 叶1 | A | **Σ 叶1** | **+120 ~ +520** | — |
| 叶1 | B | `tools/next-tool.ts` NEW（schema JSON 最占字节） | +1,000 ~ +1,900 | schema 逐字 + description 三句 + entry |
| 叶1 | B | `service-worker.ts`（intercept + 解析 + 捕获态 + events 过滤 + 装配改造） | +800 ~ +1,600 | 逻辑主体 |
| 叶1 | B | `ai-next.ts`（删围栏块 −350 / 改 `validateAiNext` + 解析入口 +250） | **−150 ~ +350** | 净中性 |
| 叶1 | B | `ref-context.ts`（删 `NEXT_CONTRACT_GUIDANCE` 与注入） | **−400 ~ −250** | 净负 |
| 叶1 | B | `host.ts`（注册一行） | +40 ~ +80 | — |
| 叶1 | B | **Σ 叶1（不计账）** | **+1,290 ~ +4,030** | — |
| 叶2 | A | `providers.ts`（`free-input.when` 分相 + `llm.abnormal` 行 + 文案） | +250 ~ +600 | 一行 provider ≈ 220~420 B |
| 叶2 | A | `sidepanel.ts`（`noteLlmAbnormalFact` + `risk` 折叠 + 消费点） | +200 ~ +500 | — |
| 叶2 | A | `definition.ts`（闭集常量 + `abnormal?` 字段） | +120 ~ +300 | type-only 词汇 + 常量 |
| 叶2 | A | **Σ 叶2** | **+570 ~ +1,400** | — |
| 叶2 | B | `next-drive-policy.ts` NEW（`shouldNudge` + `abnormalVerdict` + 常量 + `NUDGE_TEXT`） | +1,200 ~ +2,200 | 逻辑主体 |
| 叶2 | B | `service-worker.ts`（nudge 接线 + `outcome` 消费 + `abnormal` 附加） | +700 ~ +1,400 | — |
| 叶2 | B | **Σ 叶2（不计账）** | **+1,900 ~ +3,600** | — |

| 汇总 | 叶1 | 叶2 | Σ | +15% 缓冲 | 结论 |
|---|--:|--:|--:|--:|---|
| **A 列（计入）** | +0.1 ~ +0.5 KB | +0.6 ~ +1.4 KB | **+0.7 ~ +1.9 KB** | **+0.8 ~ +2.2 KB** | 距档 **9,798 B** ⇒ **正常口径不触发升档**；生效上限余量 30,230 B ⇒ 远未越 |
| **B 列（不计账）** | +1.3 ~ +4.0 KB | +1.9 ~ +3.6 KB | **+3.2 ~ +7.6 KB** | — | 不计入 sidepanel 账本 |
| **2.8× 最坏（A Σ 上界 1.9 KB）** | — | — | **≈5.3 KB** | **≈6.1 KB** | **仍 < 9,798 B**（余量 ≈3.7 KB）；但按 spec §5.14.1 的**保守包线（A Σ 上界 2.4 KB ⇒ 6.7 / 7.7 KB，余量 ~2.1 KB）** 取更紧者作为**判据口径** |

> **口径与纪律**：① 上表为 **plan 阶段估算（非承诺）**；② **每叶收口实测重登记**（`FR-NDA-144` 五要素 + 三值），**不得**以估算充当实测；③ 评审取 **spec §5.14.1 的保守包线**（A Σ +0.8~+2.4 KB / +15% 后 +0.9~+2.8 KB / 2.8× 最坏 ≈7.7 KB，余量 ~2.1 KB 薄）—— 本表的工程估算**不用于放宽**该包线；④ **不得**把 A 列改动搬进 B 列以规避门禁（`FR-NDA-145`）：归因必须**逐模块**（`size-attribution.mjs` metafile），且「为规避而搬列」⇒ 必红；⑤ B 列**不等于无成本**（只是不进 sidepanel 账本）。

### ③ 升档 / 越限路径（EC-NDA-016 三分支，**逐分支可判**）

| 触发 | 判定 | 处置 |
|---|---|---|
| 越**生效上限**（`floor(baseline×1.05)`，当前 634,832） | `measured > 634,832` | **显式重登记基线**（同源前移）：`SIDEPANEL_BASELINE_BYTES = measured` + `previousBaselineBytes` / `reRegisteredFrom` + 五要素（前后值 / 日期 / 来源 / 理由 / 历史保留，`SIDEPANEL_BASELINE_BYTES_TIMELINE` 只追加）+ 三值（`newBaselineBytes` / `absoluteCeilingBytes` / 生效上限）同源前移。**不需升档、不需作者一行** |
| 越**档位**（614,400） | `measured > 614,400` | **EC 显式升档路径**：① 重登记基线；② 档位上调到 `ceilTo50KB(measured)`；③ 绝对上限 → 档位 ×1.10；④ **作者一行**（`authorConfirmation.status: 'pending-author-line' → <作者确认后的值>`）；⑤ 台账（升档理由 / 日期 / 旧值保留）。**未闭合义务不得伪称已确认**（N-NDA-013 / FR-NDA-143） |
| 越**绝对上限**（675,840） | `measured > 675,840` | **停止实现 + 请示作者**（不允许自行突破绝对上限） |

- **判定公式唯一**：`SIDEPANEL_CEILING = floor(baseline × 1.05)`；`SIDEPANEL_CEILING_CAP` 保持 `record-only`（**不得**重新接回判定，`size-baseline.ts:559-571`）；
- **预置**：本 Feature **预先登记**「升档预案」与「作者一行路径」的存在与形态（本 ADR §③），**不预填** `authorConfirmation`（保持 `pending-author-line`）。

### ④ C 列零容差（**双锚**）

- 构建后 `stat -c %s` + `sha256sum`：`content.js` = 177,076 B / `pick-layer.js` = 34,358 B **前后一致**；
- `KIND_SET` 40 / 12 kind / `REGISTERED_STRUCTURAL_HOSTS = []` / `ACT_TO_OP` 6 逐字；
- 门禁：`test/insight-no-escalation.test.ts`（base 零 diff）+ 冻结面判据 + `law8-plaintext.mjs` 零降级。

### ⑤ 逐叶重登记义务（**不等两叶合计**）

| 叶 | 义务 |
|---|---|
| 叶1 | 收口时按**叶1 产物**实测重登记（五要素 + 三值 + `SIDEPANEL_GROWTH_BREAKDOWN` 追加 `nda1Rows`）；**B 列归因如实标注「不计账」** |
| 叶2 | 同上（`nda2Rows`）；并给出**两叶 Σ** 与 EC-NDA-016 三态（越生效上限 / 越档位 / 越绝对上限 = 是/否 逐项） |

## 备选方案

| 方案 | 处置 |
|---|---|
| 全落 A 列（面板侧捕获 / 判定） | ❌ A 列 +4~+8 KB ⇒ **越距档 9,798 B** ⇒ 直接触发升档（EC-NDA-016 分支 ②）+ 作者一行；且技术面更差（面板拿不到 `toolCalls` 交付点） |
| 把 A 列改动塞进 B 列（或反之）以规避门禁 | ❌ `FR-NDA-145` 明令禁止（归因逐模块 + 反证「搬列规避 ⇒ 必红」） |
| 先抬高 `SIDEPANEL_CEILING_CAP` 之类 cap | ❌ 该 cap 已是 `record-only`（`size-baseline.ts:563-571`），**不得**重新接回判定 |
| 用「gzip 后字节」替代原始字节 | ❌ 判据是原始字节（`readArtifactSize`，`perf-baseline.ts`）；换口径即说谎 |

## 后果

**正向**：
- 正常口径下 **A 列不触发升档**（余量 ≥ 7.5 KB；保守包线亦 ≥ 2.1 KB）⇒ 无新增「作者一行」义务；
- 归因逐模块 ⇒ 任何 A 列异常增长可立刻定位到模块；
- B 列承担机制主体 ⇒ 未来同类机制改动有可复制的低风险路径。

**风险（如实）**：
- 2.8× 最坏情形余量**薄（~2.1 KB）**⇒ 任一模块超估即可能越档；缓解 = 逐叶重登记 + 叶1 收口即时复核（不要等两叶合计）；
- v5 的 2 倍低估先例（`ops.ts` 一项即 3,918 B）说明**单个新模块可能显著超估**：`tools/next-tool.ts`（schema 字面量）与 `next-drive-policy.ts` 是两个最可能超估点 ⇒ tasks 阶段须给出「先落 B 列、后接线 A 列」的顺序，并在每步后实测。

## 落地判据（供 tasks/build）

1. `dist/sidepanel.js` 实测 ≤ 生效上限；判定公式唯一（`size-baseline` / `size-ruling-vol3` 绿）；
2. 逐叶登记条目存在且五要素齐备；算术机核绿（Σ 逐模块 + glue == 登记增量）；
3. `content.js` 177,076 B / `pick-layer.js` 34,358 B 的 `stat` + `sha256` 前后一致；
4. EC-NDA-016 三态逐项如实（是/否），`authorConfirmation` 读值断言（**不得**伪称已确认）；
5. 归因表逐模块 → 产物（`size-attribution.mjs`），反证「A 列改动搬 B 列规避 ⇒ 必红」。
