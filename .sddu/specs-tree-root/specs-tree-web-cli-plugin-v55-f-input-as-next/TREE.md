# Directory: .sddu/specs-tree-root/specs-tree-web-cli-plugin-v55-f-input-as-next/

## 目录简介
web-cli-plugin v5.5.2「输入即 next（input-as-next）：废除流外独立输入框」需求规范 —— 把作者裁决（**废除流外独...

## 目录结构
```
specs-tree-web-cli-plugin-v55-f-input-as-next/
├── TREE.md          # 本文件 - 目录导航
├── ADR-IAN-001-free-input-next-shape.md          # ADR-IAN-001: 流内「自由输入…」next 面形态（provider + 恒最末终端 + `data-act` 命名 + 零死端）
├── ADR-IAN-002-card-input-and-turn-channel.md          # ADR-IAN-002: 卡内输入载体与提交通道（`.ask-fallback` 家系第二语义分支 + `op.turn` 槽 + 手输 driver）
├── ADR-IAN-003-r6-queue-and-draft-migration.md          # ADR-IAN-003: R6 排队 / 草稿回填迁移（入口迁流内 + 回填载体迁卡内 + 不覆盖）
├── ADR-IAN-004-abolish-composer-execution-order.md          # ADR-IAN-004: `#composer` 废弃执行序（停引 → 删面）与写者消解
├── ADR-IAN-005-fallback-convergence-and-reanchors.md          # ADR-IAN-005: 四处兜底入口收敛终态 + `#send-reason` / `sendDisabled` / draft / 引导重锚
├── ADR-IAN-006-law4-revision-and-supersession-ledger.md          # ADR-IAN-006: 法四原地修订 + supersession 台账 old→new + X-IAN-1~11 逐条处置
├── ADR-IAN-007-protected-segments-decision.md          # ADR-IAN-007: 保护段逐段决策（journey 八步取代 / binding keep 字节中立）
├── ADR-IAN-008-gate-reanchor-list.md          # ADR-IAN-008: 门禁等价重锚清单（18 门禁三态 + 2 新门禁设计 + `CHROMIUM_GATES === 9` 不动）
├── ADR-IAN-009-s0pp-dual-face-validation.md          # ADR-IAN-009: S0'' 双面验证设计（终态 10 步 + 中间态保护 + 「元素不存在非 hidden」机核）
├── ADR-IAN-010-volume-split-budget.md          # ADR-IAN-010: 体积分列预算（逐叶分列 + 逐模块归因 + 距档 22,454 + EC-IAN-016 预置）
├── discovery.md          # 问题挖掘报告：specs-tree-web-cli-plugin-v55-f-input-as-next
├── plan.md          # 技术计划：specs-tree-web-cli-plugin-v55-f-input-as-next（web-cli-plugin v0.11.2「输入即 next：废除流外独立输入框」；父 Feature 统领性技术方案）
├── spec.md          # Feature Specification：specs-tree-web-cli-plugin-v55-f-input-as-next（web-cli-plugin v5.5.2「输入即 next：废除流外独立输入框」）
├── state.json          # 状态文件 (🟢 tracked [tasked])
├── tasks.json          # 任务清单 (机器可读)
├── tasks.md          # 任务分解：specs-tree-web-cli-plugin-v55-f-input-as-next（web-cli-plugin v5.5.2「输入即 next：废除流外独立输入框」；父 Feature 统领性任务总览）
├── specs-tree-ian-1-free-input-next/          # 父规范 §2.2~§2.5 的**新面根因**全部落在本叶：「自由输入」作为 next 选项的形态缺
└── specs-tree-ian-2-abolish-composer/          # 父规范 §2.2~§2.5 的**废面根因**全部落在本叶：`
```

## 文件说明
| 文件 | 说明 | 状态 |
|------|------|------|
| ADR-IAN-001-free-input-next-shape.md | ADR-IAN-001: 流内「自由输入…」next 面形态（provider + 恒最末终端 + `data-act` 命名 + 零死端） — ACCEPTED（裁决 PD-IAN-001 / PD-IAN-004 / PD-IAN-005；承父 spec FR-IAN-010~014 / DC-... | ✅ 存在 |
| ADR-IAN-002-card-input-and-turn-channel.md | ADR-IAN-002: 卡内输入载体与提交通道（`.ask-fallback` 家系第二语义分支 + `op.turn` 槽 + 手输 driver） — ACCEPTED（裁决 PD-IAN-002 / PD-IAN-003；承父 spec FR-IAN-011 / 015~025 / §5.3 CHAN ... | ✅ 存在 |
| ADR-IAN-003-r6-queue-and-draft-migration.md | ADR-IAN-003: R6 排队 / 草稿回填迁移（入口迁流内 + 回填载体迁卡内 + 不覆盖） — ACCEPTED（承父 spec §5.4 R6Q FR-IAN-030~034 / DC-IAN-004 / X-IAN-7；叶1 支持 / 叶2 唯一化） | ✅ 存在 |
| ADR-IAN-004-abolish-composer-execution-order.md | ADR-IAN-004: `#composer` 废弃执行序（停引 → 删面）与写者消解 — ACCEPTED（承父 spec §5.5 ABOL FR-IAN-040~049 / DC-IAN-003 / §14.2 叶2 执行序 ①~⑤） | ✅ 存在 |
| ADR-IAN-005-fallback-convergence-and-reanchors.md | ADR-IAN-005: 四处兜底入口收敛终态 + `#send-reason` / `sendDisabled` / draft / 引导重锚 — ACCEPTED（承父 spec §5.6 CONV FR-IAN-050~056 / DC-IAN-005·006 / PD-IAN-006·007·008） | ✅ 存在 |
| ADR-IAN-006-law4-revision-and-supersession-ledger.md | ADR-IAN-006: 法四原地修订 + supersession 台账 old→new + X-IAN-1~11 逐条处置 — ACCEPTED（承父 spec §5.7 LAW4 / §5.9 SUPERSEDE / §12 映射 / DC-IAN-007 / O-IAN-007... | ✅ 存在 |
| ADR-IAN-007-protected-segments-decision.md | ADR-IAN-007: 保护段逐段决策（journey 八步取代 / binding keep 字节中立） — ACCEPTED（裁决 PD-IAN-009 / COR-IAN-1；承父 spec FR-IAN-103 / AC-IAN-021 / N-IAN-01... | ✅ 存在 |
| ADR-IAN-008-gate-reanchor-list.md | ADR-IAN-008: 门禁等价重锚清单（18 门禁三态 + 2 新门禁设计 + `CHROMIUM_GATES === 9` 不动） — ACCEPTED（承父 spec §5.10 GATE / §9.3 / §9.5 / §12 / FR-IAN-100~106 / N-IAN-012·... | ✅ 存在 |
| ADR-IAN-009-s0pp-dual-face-validation.md | ADR-IAN-009: S0'' 双面验证设计（终态 10 步 + 中间态保护 + 「元素不存在非 hidden」机核） — ACCEPTED（承父 spec §5.8 S0'' / FR-IAN-070~074 / AC-IAN-001 / §9.4 人工面 / R-IAN-909） | ✅ 存在 |
| ADR-IAN-010-volume-split-budget.md | ADR-IAN-010: 体积分列预算（逐叶分列 + 逐模块归因 + 距档 22,454 + EC-IAN-016 预置） — ACCEPTED（承父 spec §5.11 / §5.11.1 / FR-IAN-110~115 / DC-IAN-009 / ADR-V55-011 口径） | ✅ 存在 |
| discovery.md | 问题挖掘报告：specs-tree-web-cli-plugin-v55-f-input-as-next — web-cli-plugin「**输入即 next（input-as-next）**」问题挖掘报告 —— 把作者裁决（**废除流外独立输入框；自由文本输入... | ✅ 存在 |
| plan.md | 技术计划：specs-tree-web-cli-plugin-v55-f-input-as-next（web-cli-plugin v0.11.2「输入即 next：废除流外独立输入框」；父 Feature 统领性技术方案） — v5（F-32）把「一切操作皆 next 流内闭环」立法；v5.5（F-33）把「下一步由谁按」转移到系统 / AI 侧；F-34（v5.5.1）把「下一... | ✅ 存在 |
| spec.md | Feature Specification：specs-tree-web-cli-plugin-v55-f-input-as-next（web-cli-plugin v5.5.2「输入即 next：废除流外独立输入框」） — web-cli-plugin v5.5.2「输入即 next（input-as-next）：废除流外独立输入框」需求规范 —— 把作者裁决（**废除流外独... | ✅ 存在 |
| state.json | 状态文件 | 🟢 tracked [tasked] |
| tasks.json | 任务清单（机器可读） | ✅ 存在 |
| tasks.md | 任务分解：specs-tree-web-cli-plugin-v55-f-input-as-next（web-cli-plugin v5.5.2「输入即 next：废除流外独立输入框」；父 Feature 统领性任务总览） — `npm test` **1394** · `op-wiring`（`requestTurn(` 恰 2→**恰 1**）· `turn-arbitrat... | ✅ 存在 |

## Feature 状态
| 字段 | 值 |
|------|-----|
| Feature ID | N/A |
| Phase | 任务分解 (4/7) |
| Status | 🟢 tracked [tasked] |

## 上级目录
- [返回上级](../TREE.md)
- [返回首页](../../TREE.md)
