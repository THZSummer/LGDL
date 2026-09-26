# ADR-ADN-008: 体积分列预算（A/B/C 列 · 距档 15,474 · 不触发升档）

## 状态
ACCEPTED（承父 spec §5.12 VOL FR-ADN-120~125 · §5.12.1 分列预算表 · §11 DC-ADN-012 · §9.4 AC-ADN-026 · EC-ADN-016 · N-ADN-013）

## 背景（**本轮只读复核，未复跑**）

| 量 | 值 | 来源 |
|---|---|---|
| A 列基线 `dist/sidepanel.js` | **598,926 B** | `test/size-baseline.ts:381`（R8 `38565ac` 重登记 598,577 → 598,926） |
| 生效上限 | `floor(598,926 × 1.05) =` **628,872 B**（余量 **29,946**） | `size-baseline.ts:556` |
| 档位 | **614,400 B**（**距档 15,474 B**） | `size-baseline.ts`（`SIDEPANEL_CEILING` 记录链） |
| 绝对上限 | **675,840 B** | 同上 |
| `authorConfirmation` | **`pending-author-line`**（未闭合义务；**不得伪称已确认**） | 同上 |
| C 列冻结面 | `content.js` **177,076 B** / `pick-layer.js` **34,358 B** / `KIND_SET` 40 | 上游收口 + R8 |
| B 列 `dist/background.js` | 1,636,621 B（**不计入 sidepanel 账本**） | `size-baseline.ts` |

## 决策

### ① 列别与落点

| 列 | 产物 | 计入账本 |
|:-:|---|:-:|
| **A** | `dist/sidepanel.js`（`sidepanel.ts` / `recommend.ts` / `next-registry/*` / `cards/*` / `shared/op-table.ts` 的 A 侧副本） | ✅ |
| **B** | `dist/background.js`（`background/ai-next.ts`(NEW) / `service-worker.ts` / `ref-context.ts` / `chat-events.ts` / `shared/op-table.ts` 的 B 侧副本） | ❌ |
| **C** | `content.js` / `pick-layer.js` | 零容差（**零触碰**） |

### ② 逐叶分列预算（**先预算后落地**）

| 预算口径 | 叶1（adn-1 通道+校验链） | 叶2（adn-2 兜底+合并+重锚） | Σ | +15% 缓冲 | 结论 |
|---|--:|--:|--:|--:|---|
| **A 列（sidepanel 净增）** | **+0.8 ~ +2.0 KB** | **+0.5 ~ +1.5 KB** | **+1.3 ~ +3.5 KB** | **+1.5 ~ +4.0 KB** | 距档 15,474 ⇒ **不触发升档**（远未越生效上限余量 29,946） |
| **B 列（不计账）** | **+1.5 ~ +3.5 KB**（解析+5 道校验+留痕） | **+0.5 ~ +1.5 KB**（终态接线） | **+2.0 ~ +5.0 KB** | — | **不计入 sidepanel 账本**（B 列优先的**唯一**理由 = 旁路档位压力） |
| **2.8× 最坏（A 列 Σ 上界 3.5 KB，承 v5 低估教训）** | — | — | **≈9.8 KB** | **≈11.3 KB** | **仍 < 15,474 ⇒ 也不触发升档**（**预置 EC-ADN-016 + 作者一行**以防实测越界） |

**A 列逐模块归因（预算表，实测收口时五要素重登记）**：

| 模块 | 叶1 | 叶2 | 主要内容 |
|---|--:|--:|---|
| `ui/sidepanel/sidepanel.ts` | +0.3~0.8 KB | +0.2~0.6 KB | `done` 分支消费 `msg.aiNext` + 事件作用域单槽 + 关断门 + 替换/兜底接线 + 测试缝 |
| `ui/sidepanel/recommend.ts` | +0.2~0.4 KB | +0.2~0.4 KB | `RecommendInput.session.aiNext` + 透传 + `chipsFor` 解析 + AI 同因预过滤 |
| `ui/sidepanel/next-registry/providers.ts` | +0.2~0.4 KB | — | 第 12 行 provider + 第 12 行声明 + 注释订正（COR-ADN-4） |
| `ui/sidepanel/next-registry/definition.ts` | +0.1~0.3 KB | — | 3 个类型 + 2 个加法字段声明 |
| `ui/sidepanel/next-registry/ai-drive.ts` | +0.1~0.2 KB | — | `driverBlockedLine` 单源 |
| `ui/sidepanel/next-registry/ops.ts` | ~+0.05 KB | — | `reachableOpIds` 优先 `chipsFor` |
| `shared/op-table.ts`（A 侧副本） | +0.05~0.15 KB | +0.05~0.15 KB | `ask` descriptor 加法字段 + 一致性 |

**B 列逐模块归因**：`background/ai-next.ts` **NEW +1.0~2.5 KB** / `service-worker.ts` +0.2~0.5 KB（累积末条 assistant 文本 + `done` 装配）/ `ref-context.ts` +0.2~0.5 KB（产出契约句）/ `chat-events.ts` +0.05 KB（1 字段）/ `shared/op-table.ts`（B 侧副本）+0.05~0.15 KB。

### ③ 纪律

- 每叶收口**实测重登记**（五要素：前后值 / 日期 / 来源 / 理由 / 历史保留 + 三值 `newBaselineBytes` / `absoluteCeilingBytes` / 生效上限同源前移）；**B 列增量不计入 sidepanel 账本**并如实标注列别（FR-ADN-124）。
- **不得**把 A 列改动搬进 / 搬出以绕开门禁（FR-ADN-125；R-ADN-908 反证）。
- **B 列优先 ≠ B 列无成本**（R-ADN-908）；本 ADR 同时给出 B 列预算，收口如实登记。
- 越**生效上限** ⇒ 显式重登记基线（同源前移）；越**档位 614,400** ⇒ 走 **EC-ADN-016** 显式升档路径 + **作者一行**；越绝对上限 ⇒ 停止并请示作者；`authorConfirmation` **不得**伪称已确认（N-ADN-013）。

## 后果

- 正常口径与 2.8× 最坏口径**均不触发升档**（15,474 B 余量足够）——但**预置** EC-ADN-016 以防实测越界（不赌）；
- **口径诚实**：本表为 **spec/plan 阶段估算（非承诺）**；任何数字以收口实测为准。
