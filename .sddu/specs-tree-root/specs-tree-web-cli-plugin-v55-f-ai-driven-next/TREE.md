# Directory: .sddu/specs-tree-root/specs-tree-web-cli-plugin-v55-f-ai-driven-next/

## 目录简介
web-cli-plugin v5.5.3「AI 驱动 next（AI-driven next）」需求规范 —— 把作者裁决（**有连接 LLM 则 AI...

## 目录结构
```
specs-tree-web-cli-plugin-v55-f-ai-driven-next/
├── TREE.md          # 本文件 - 目录导航
├── ADR-ADN-001-candidate-channel-and-protocol.md          # ADR-ADN-001: AI next 候选的产出通道与提示/解析协议（PD-ADN-002 / PD-ADN-003 裁决）
├── ADR-ADN-002-five-chain-validation-and-sw-location.md          # ADR-ADN-002: 5 道校验链与 SW 侧落点（PD-ADN-004 裁决 · 单源复用）
├── ADR-ADN-003-admit-vs-press-tier-layering.md          # ADR-ADN-003: 「候选接受判定」与「按下判定」分层（`admitCandidate` vs `pressDecision`）
├── ADR-ADN-004-injection-and-merge-caliber.md          # ADR-ADN-004: 注入与合并口径（`chipsFor` 加法契约 · 单卡位 · 前 N ≤3 · R6 扩展 · 替换）
├── ADR-ADN-005-fallback-first-open-boundary.md          # ADR-ADN-005: 确定性兜底、零死端与首开边界（PD-ADN-001 裁决）
├── ADR-ADN-006-guards-budget-traces.md          # ADR-ADN-006: 护栏、预算与留痕（PD-ADN-006 裁决 · 零第二阈值）
├── ADR-ADN-007-s0pp-dual-face-validation.md          # ADR-ADN-007: S0''' 双面验证设计（四支线 + 注入反证族 · 只加断言）
├── ADR-ADN-008-volume-split-budget.md          # ADR-ADN-008: 体积分列预算（A/B/C 列 · 距档 15,474 · 不触发升档）
├── ADR-ADN-009-gate-reanchor-list.md          # ADR-ADN-009: 门禁等价重锚清单（新增 1 + 升级 6 + 间接 · 保护段 keep）
├── ADR-ADN-010-supersession-ledger-x-adn.md          # ADR-ADN-010: X-ADN-1~11 取代台账与保护段决策（逐条终态）
├── discovery.md          # 问题挖掘报告：specs-tree-web-cli-plugin-v55-f-ai-driven-next
├── plan.md          # 技术计划：specs-tree-web-cli-plugin-v55-f-ai-driven-next（web-cli-plugin v0.11.3「AI 驱动 next」；父 Feature 统领性技术方案）
├── spec.md          # Feature Specification：specs-tree-web-cli-plugin-v55-f-ai-driven-next（web-cli-plugin v5.5.3「AI 驱动 next：LLM 结构化产出 next 候选 + 确定性注册表退居兜底与安全闸」）
├── state.json          # 状态文件 (🟢 tracked [planned])
├── specs-tree-adn-1-ai-next-produce-and-verify/          # 父规范 §2.2~§2.3 的**新通道根因 + 安全缺口**全部落在本叶：AI 结构化产出 nex
└── specs-tree-adn-2-deterministic-fallback-and-merge/          # 父规范 §2.2~§2.3 的**回归风险面 + 判据治理面**全部落在本叶：确定性注册表的**兜底
```

## 文件说明
| 文件 | 说明 | 状态 |
|------|------|------|
| ADR-ADN-001-candidate-channel-and-protocol.md | ADR-ADN-001: AI next 候选的产出通道与提示/解析协议（PD-ADN-002 / PD-ADN-003 裁决） — ACCEPTED（承父 spec §5.1 CHAN / §5.2 FR-ADN-010~019 · §11 DC-ADN-002/003/016 · §... | ✅ 存在 |
| ADR-ADN-002-five-chain-validation-and-sw-location.md | ADR-ADN-002: 5 道校验链与 SW 侧落点（PD-ADN-004 裁决 · 单源复用） — ACCEPTED（承父 spec §5.3 VERIFY FR-ADN-020~029 · §11 DC-ADN-004/006/012 · §12 X-... | ✅ 存在 |
| ADR-ADN-003-admit-vs-press-tier-layering.md | ADR-ADN-003: 「候选接受判定」与「按下判定」分层（`admitCandidate` vs `pressDecision`） — ACCEPTED（承父 spec §5.4 TIER FR-ADN-030~035 · §11 DC-ADN-005 · §13.2 N-ADN-016 ... | ✅ 存在 |
| ADR-ADN-004-injection-and-merge-caliber.md | ADR-ADN-004: 注入与合并口径（`chipsFor` 加法契约 · 单卡位 · 前 N ≤3 · R6 扩展 · 替换） — ACCEPTED（承父 spec §5.6 MERGE FR-ADN-050~056 · §5.2 FR-ADN-014/015 · §11 DC-ADN... | ✅ 存在 |
| ADR-ADN-005-fallback-first-open-boundary.md | ADR-ADN-005: 确定性兜底、零死端与首开边界（PD-ADN-001 裁决） — ACCEPTED（承父 spec §5.5 FALLBACK FR-ADN-040~046 · §5.8 OPEN FR-ADN-070~073 · §1... | ✅ 存在 |
| ADR-ADN-006-guards-budget-traces.md | ADR-ADN-006: 护栏、预算与留痕（PD-ADN-006 裁决 · 零第二阈值） — ACCEPTED（承父 spec §5.7 GUARD FR-ADN-060~065 · §11 DC-ADN-009/013 · §12 X-ADN-1... | ✅ 存在 |
| ADR-ADN-007-s0pp-dual-face-validation.md | ADR-ADN-007: S0''' 双面验证设计（四支线 + 注入反证族 · 只加断言） — ACCEPTED（承父 spec §5.9 S0''' FR-ADN-080~085 · §9.1 AC-ADN-001 · §9.4 人工面 · §11... | ✅ 存在 |
| ADR-ADN-008-volume-split-budget.md | ADR-ADN-008: 体积分列预算（A/B/C 列 · 距档 15,474 · 不触发升档） — ACCEPTED（承父 spec §5.12 VOL FR-ADN-120~125 · §5.12.1 分列预算表 · §11 DC-ADN-012 · ... | ✅ 存在 |
| ADR-ADN-009-gate-reanchor-list.md | ADR-ADN-009: 门禁等价重锚清单（新增 1 + 升级 6 + 间接 · 保护段 keep） — ACCEPTED（承父 spec §5.11 GATE FR-ADN-110~117 · §9.5 门禁处置与计数对账 · §12 X-ADN-6 · N... | ✅ 存在 |
| ADR-ADN-010-supersession-ledger-x-adn.md | ADR-ADN-010: X-ADN-1~11 取代台账与保护段决策（逐条终态） — ACCEPTED（承父 spec §5.10 SUPERSEDE FR-ADN-090~101 · §12 X-ADN 映射表 · §11 DC-ADN-... | ✅ 存在 |
| discovery.md | 问题挖掘报告：specs-tree-web-cli-plugin-v55-f-ai-driven-next — web-cli-plugin「**AI 驱动 next（AI-driven next）**」问题挖掘报告 —— 把作者裁决（**「有连接 LLM 的情况下... | ✅ 存在 |
| plan.md | 技术计划：specs-tree-web-cli-plugin-v55-f-ai-driven-next（web-cli-plugin v0.11.3「AI 驱动 next」；父 Feature 统领性技术方案） — v5（F-32）把「一切操作皆 next 流内闭环」立法；v5.5（F-33）把「**下一步由谁按**」转移到系统 / AI 侧（`pressCandid... | ✅ 存在 |
| spec.md | Feature Specification：specs-tree-web-cli-plugin-v55-f-ai-driven-next（web-cli-plugin v5.5.3「AI 驱动 next：LLM 结构化产出 next 候选 + 确定性注册表退居兜底与安全闸」） — web-cli-plugin v5.5.3「AI 驱动 next（AI-driven next）」需求规范 —— 把作者裁决（**有连接 LLM 则 AI... | ✅ 存在 |
| state.json | 状态文件 | 🟢 tracked [planned] |

## Feature 状态
| 字段 | 值 |
|------|-----|
| Feature ID | N/A |
| Phase | 设计 (3/7) |
| Status | 🟢 tracked [planned] |

## 上级目录
- [返回上级](../TREE.md)
- [返回首页](../../TREE.md)
