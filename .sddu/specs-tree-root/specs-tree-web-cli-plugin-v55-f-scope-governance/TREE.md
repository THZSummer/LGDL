# Directory: .sddu/specs-tree-root/specs-tree-web-cli-plugin-v55-f-scope-governance/

## 目录简介
web-cli-plugin v5.5.1「范围治理（scope governance）：引用即范围」需求规范 —— 把编排指示（**引用事实必须进回合 ...

## 目录结构
```
specs-tree-web-cli-plugin-v55-f-scope-governance/
├── TREE.md          # 本文件 - 目录导航
├── ADR-SGO-001-ref-context-in-turn.md          # ADR-SGO-001: 引用事实进回合（`chat` type-only `refs` + 系统段基座/追加段 + 回合发起时快照 + 留痕口径）
├── ADR-SGO-002-law9-scope-reading.md          # ADR-SGO-002: 范围读数单源（法九）+ 判定输入两路 + `law9-scope-reading` 门禁
├── ADR-SGO-003-ref-anchor-parse-chain.md          # ADR-SGO-003: `--ref <n>` 锚定解析链（plugin 侧包装 + live 单节点闸 + 失配 EC 家族）
├── ADR-SGO-004-batch-consent.md          # ADR-SGO-004: 任务级批量授权（系统聚合计划 + 指纹（逐字节入哈希）+ 一次手势 + 计划外回落 + 特权不入批 + 审计零明文）
├── ADR-SGO-005-widen-consult.md          # ADR-SGO-005: 扩围征询（`ask-user` 二择 + `out-of-scope-authorized` + 留痕 + 拒绝零死端）
├── ADR-SGO-006-s0p-dual-face.md          # ADR-SGO-006: S0′ 双面机器化（`ty.md` 原案重放 + 双向反证 + 真源切片 + 人工面如实登记）
├── ADR-SGO-007-volume-split-budget.md          # ADR-SGO-007: 体积分列预算（A/B/C 列 + 15% 缓冲 + 2.8× 最坏 + 逐叶重登记 + 升档 EC 路径）
├── ADR-SGO-008-open-points-rulings.md          # ADR-SGO-008: PD-SGO-001~007 裁决汇总（读命令 / 重观测 / 字段集 / 可见面 / 计划生成 / 指纹文本对 / 条目上限）
├── discovery.md          # 问题挖掘报告：specs-tree-web-cli-plugin-v55-f-scope-governance
├── plan.md          # 技术计划：specs-tree-web-cli-plugin-v55-f-scope-governance（web-cli-plugin v5.5.1「范围治理：引用即范围」；父 Feature 统领性技术方案）
├── spec.md          # Feature Specification：specs-tree-web-cli-plugin-v55-f-scope-governance（web-cli-plugin v5.5.1「范围治理：引用即范围」）
├── state.json          # 状态文件 (🟢 tracked [tasked])
├── tasks.json          # 任务清单 (机器可读)
├── tasks.md          # 任务分解：specs-tree-web-cli-plugin-v55-f-scope-governance（web-cli-plugin v5.5.1「范围治理：引用即范围」；父 Feature 统领性任务总览）
├── specs-tree-v55f-1-ref-context-and-anchor/          # 父规范 §2.1~§2.4 的**根因 A/B/C/D/E/F/H/I/J/K/L/N/O/P/Q/
└── specs-tree-v55f-2-batch-consent/          # 父规范 §2.3 根因 **G**（逐条授权链路：`security/confirm.ts:84-1
```

## 文件说明
| 文件 | 说明 | 状态 |
|------|------|------|
| ADR-SGO-001-ref-context-in-turn.md | ADR-SGO-001: 引用事实进回合（`chat` type-only `refs` + 系统段基座/追加段 + 回合发起时快照 + 留痕口径） — 在 `background/messaging.ts`（type-only 家系先例 = `ChatResultVariant`，`messaging.t... | ✅ 存在 |
| ADR-SGO-002-law9-scope-reading.md | ADR-SGO-002: 范围读数单源（法九）+ 判定输入两路 + `law9-scope-reading` 门禁 — 父 spec §5.3 / §5.7 / FR-SGO-020~028 / 070~077 裁决：范围法则**双轨** —— **机制范围读数 = 唯一判... | ✅ 存在 |
| ADR-SGO-003-ref-anchor-parse-chain.md | ADR-SGO-003: `--ref <n>` 锚定解析链（plugin 侧包装 + live 单节点闸 + 失配 EC 家族） — 1. refArg = String(tc.args?.ref ?? '').trim() | ✅ 存在 |
| ADR-SGO-004-batch-consent.md | ADR-SGO-004: 任务级批量授权（系统聚合计划 + 指纹（逐字节入哈希）+ 一次手势 + 计划外回落 + 特权不入批 + 审计零明文） — // background/batch-plan.ts（B 列，纯逻辑） | ✅ 存在 |
| ADR-SGO-005-widen-consult.md | ADR-SGO-005: 扩围征询（`ask-user` 二择 + `out-of-scope-authorized` + 留痕 + 拒绝零死端） — ADR-SGO-005: 扩围征询（`ask-user` 二择 + `out-of-scope-authorized` + 留痕 + 拒绝零死端） | ✅ 存在 |
| ADR-SGO-006-s0p-dual-face.md | ADR-SGO-006: S0′ 双面机器化（`ty.md` 原案重放 + 双向反证 + 真源切片 + 人工面如实登记） — 拾取引用 ①（refNum=1，出生有效）→ 答「原地翻译为中文」→ 自动成回合（载荷含引用事实） | ✅ 存在 |
| ADR-SGO-007-volume-split-budget.md | ADR-SGO-007: 体积分列预算（A/B/C 列 + 15% 缓冲 + 2.8× 最坏 + 逐叶重登记 + 升档 EC 路径） — 计算密集 / 判定密集的**新逻辑优先落 SW 侧**（不计账）： | ✅ 存在 |
| ADR-SGO-008-open-points-rulings.md | ADR-SGO-008: PD-SGO-001~007 裁决汇总（读命令 / 重观测 / 字段集 / 可见面 / 计划生成 / 指纹文本对 / 条目上限） — 父 spec §8 在 discovery `O-SGO-001~009` 全部裁决之外，另外登记了 **7 条「spec 阶段新识别 / 明确留待 pl... | ✅ 存在 |
| discovery.md | 问题挖掘报告：specs-tree-web-cli-plugin-v55-f-scope-governance — web-cli-plugin「**范围治理（scope governance）**」问题挖掘报告 —— 把作者编排指示（**引用事实必须进回合 / 引用即... | ✅ 存在 |
| plan.md | 技术计划：specs-tree-web-cli-plugin-v55-f-scope-governance（web-cli-plugin v5.5.1「范围治理：引用即范围」；父 Feature 统领性技术方案） — v5 把「下一步**是什么**」做成管线强制保证；v5.5 把「下一步**由谁按**」交给系统 / AI 侧。**v5.5.1 的题眼 = 「下一步按的范... | ✅ 存在 |
| spec.md | Feature Specification：specs-tree-web-cli-plugin-v55-f-scope-governance（web-cli-plugin v5.5.1「范围治理：引用即范围」） — web-cli-plugin v5.5.1「范围治理（scope governance）：引用即范围」需求规范 —— 把编排指示（**引用事实必须进回合 ... | ✅ 存在 |
| state.json | 状态文件 | 🟢 tracked [tasked] |
| tasks.json | 任务清单（机器可读） | ✅ 存在 |
| tasks.md | 任务分解：specs-tree-web-cli-plugin-v55-f-scope-governance（web-cli-plugin v5.5.1「范围治理：引用即范围」；父 Feature 统领性任务总览） — `npm test` **1330** · `journey` **171** · `binding` **192** · `s0-self-driven... | ✅ 存在 |

## Feature 状态
| 字段 | 值 |
|------|-----|
| Feature ID | N/A |
| Phase | 任务分解 (4/7) |
| Status | 🟢 tracked [tasked] |

## 上级目录
- [返回上级](../TREE.md)
- [返回首页](../../TREE.md)
