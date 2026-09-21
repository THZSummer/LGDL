# Directory: .sddu/specs-tree-root/specs-tree-web-cli-plugin-v5-all-in-next/

## 目录简介
web-cli-plugin v5「All-in-Next 聊天即操作台」需求规范 —— 把作者主题（**所有需要用户操作的地方都在 chat 里以 ne...

## 目录结构
```
specs-tree-web-cli-plugin-v5-all-in-next/
├── TREE.md          # 本文件 - 目录导航
├── ADR-V5-001-next-provider-registry.md          # ADR-V5-001: NextProvider/NextOp 注册表与瘦分发（契约 v2 七点 + recommend.ts 取代路径）
├── ADR-V5-002-op-pipeline-askuser-error-recovery.md          # ADR-V5-002: op 统一管线四态 + `askuser` 扩形 + 阻塞类 `error` 出生带恢复区
├── ADR-V5-003-sw-executor-op-messaging.md          # ADR-V5-003: SW 执行器 + `op-*` type-only 消息族 + 双侧注册表同源
├── ADR-V5-004-optional-permissions-minimal-set.md          # ADR-V5-004: `optional_permissions` 最小集（X1：首批 0 项新增 + 机制预留）
├── ADR-V5-005-settings-ops-consolidation.md          # ADR-V5-005: `settings/ops.ts` 4 类收编（单一执行体 + 零双路径）
├── ADR-V5-006-auth-chip-zero-double-write.md          # ADR-V5-006: 授权 chip（状态栏常显两态）+ 零双写五条
├── ADR-V5-007-width-data-narrow-density.md          # ADR-V5-007: 可拖动宽度的**产品侧落点** + 密度登记格口径解耦（X5）
├── ADR-V5-008-dual-draft-design-contract.md          # ADR-V5-008: 双稿双 shim `design-contract`（F 冻结 + G 新增）
├── ADR-V5-009-dead-end-guard-gate.md          # ADR-V5-009: 死端守护门禁（阻塞态枚举 + N=0 机核 + 双向反证）
├── ADR-V5-010-law8-four-face-plaintext-gate.md          # ADR-V5-010: 法八四面零明文机核（流 payload / digest / 审计 / DOM 属性）
├── ADR-V5-011-volume-budget.md          # ADR-V5-011: 体积预算（24,926 B 分配 + 越限预案）
├── ADR-V5-012-wave-plan-and-protection.md          # ADR-V5-012: 波次与实施序（3 叶 W 波 + 保护段第三次取代预案 + binding 避让）
├── discovery.md          # 问题挖掘报告：specs-tree-web-cli-plugin-v5-all-in-next
├── plan.md          # 技术计划：specs-tree-web-cli-plugin-v5-all-in-next（web-cli-plugin v5「All-in-Next 聊天即操作台」；父 Feature 统领性技术方案）
├── spec.md          # Feature Specification：specs-tree-web-cli-plugin-v5-all-in-next（web-cli-plugin v5「All-in-Next 聊天即操作台」）
├── state.json          # 状态文件 (🟢 tracked [tasked])
├── tasks.json          # 任务清单 (机器可读)
├── tasks.md          # 任务分解：specs-tree-web-cli-plugin-v5-all-in-next（web-cli-plugin v5「All-in-Next 聊天即操作台」；父 Feature 统领性任务总览）
├── specs-tree-v5-1-next-registry-pipeline/          # 本叶 = v5 的**首叶**，交付「可以让后续操作『注册即接入』的那一层」：`NextProvid
├── specs-tree-v5-2-ops-first-batch/          # 本叶 = v5 的**次叶**，交付「**一站式闭环真的能用**」：把 9 个 op（设计稿 8 个
└── specs-tree-v5-3-chrome-face/          # 本叶 = v5 的**末叶（收口叶）**，交付「**形态与判据同时收口**」：授权态**下移状态栏常
```

## 文件说明
| 文件 | 说明 | 状态 |
|------|------|------|
| ADR-V5-001-next-provider-registry.md | ADR-V5-001: NextProvider/NextOp 注册表与瘦分发（契约 v2 七点 + recommend.ts 取代路径） — 现状下「新增一种需要用户操作的地方」必须改 ≥4 处（discovery §7.1 A1~A5，本轮实测）： | ✅ 存在 |
| ADR-V5-002-op-pipeline-askuser-error-recovery.md | ADR-V5-002: op 统一管线四态 + `askuser` 扩形 + 阻塞类 `error` 出生带恢复区 — 父 spec §5.6 FR-ALLN-055 要求 9 个 op 走**唯一**管线 `next chip →（params? 流内 ask 卡）→（c... | ✅ 存在 |
| ADR-V5-003-sw-executor-op-messaging.md | ADR-V5-003: SW 执行器 + `op-*` type-only 消息族 + 双侧注册表同源 — 现状（本轮只读复核）： | ✅ 存在 |
| ADR-V5-004-optional-permissions-minimal-set.md | ADR-V5-004: `optional_permissions` 最小集（X1：首批 0 项新增 + 机制预留） — 现状（`manifest.json` 逐字 + `test/capability-wiring.test.ts:20-50`）： | ✅ 存在 |
| ADR-V5-005-settings-ops-consolidation.md | ADR-V5-005: `settings/ops.ts` 4 类收编（单一执行体 + 零双路径） — 现状（本轮只读复核）：`src/ui/settings/ops.ts:122-149` 的 `SettingsOps` 单口暴露 **17 个操作**；两... | ✅ 存在 |
| ADR-V5-006-auth-chip-zero-double-write.md | ADR-V5-006: 授权 chip（状态栏常显两态）+ 零双写五条 — 作者 ⑧ 反馈逐字：「『未授权 · 零注入』『已授权 · supported』这两项如果属于状态，那就放到最下面的状态栏，上面属于工具、菜单栏，不应该放这... | ✅ 存在 |
| ADR-V5-007-width-data-narrow-density.md | ADR-V5-007: 可拖动宽度的**产品侧落点** + 密度登记格口径解耦（X5） — G 稿把侧栏宽度从「三档（320 / 400 / 520）」改为**连续可拖动 280–640**（ARIA `role="separator"` + `... | ✅ 存在 |
| ADR-V5-008-dual-draft-design-contract.md | ADR-V5-008: 双稿双 shim `design-contract`（F 冻结 + G 新增） — 现状（本轮只读复核）： | ✅ 存在 |
| ADR-V5-009-dead-end-guard-gate.md | ADR-V5-009: 死端守护门禁（阻塞态枚举 + N=0 机核 + 双向反证） — 真机断流现场（23:12:51~23:12:59，逐字）： | ✅ 存在 |
| ADR-V5-010-law8-four-face-plaintext-gate.md | ADR-V5-010: 法八四面零明文机核（流 payload / digest / 审计 / DOM 属性） — 法八「值不入流」需要一个**可核判据**，而非仅靠净化面（R-ALLN-008：v4.5 有**反证恒绿**的三类教训——模板字面量语法错 / Trust... | ✅ 存在 |
| ADR-V5-011-volume-budget.md | ADR-V5-011: 体积预算（24,926 B 分配 + 越限预案） — 现状实测（本轮只读复核，引自已入库产物）： | ✅ 存在 |
| ADR-V5-012-wave-plan-and-protection.md | ADR-V5-012: 波次与实施序（3 叶 W 波 + 保护段第三次取代预案 + binding 避让） — 父 spec §14：父 Feature = 轻量规范容器（不承接 build/tasks.json），实施由 **3 叶依存序串行**承接（F-32）。... | ✅ 存在 |
| discovery.md | 问题挖掘报告：specs-tree-web-cli-plugin-v5-all-in-next — web-cli-plugin v5「All-in-Next 聊天即操作台」问题挖掘报告 —— 把作者主题（**所有需要用户操作的地方都在 chat 里以 ... | ✅ 存在 |
| plan.md | 技术计划：specs-tree-web-cli-plugin-v5-all-in-next（web-cli-plugin v5「All-in-Next 聊天即操作台」；父 Feature 统领性技术方案） — v4 把「一切交互皆消息」做成了行为，v4.5 把流做成了纯时间序，但**「下一步」仍不保证**：真机 23:12:59 的 ✖ 行之后**流内零可达 n... | ✅ 存在 |
| spec.md | Feature Specification：specs-tree-web-cli-plugin-v5-all-in-next（web-cli-plugin v5「All-in-Next 聊天即操作台」） — web-cli-plugin v5「All-in-Next 聊天即操作台」需求规范 —— 把作者主题（**所有需要用户操作的地方都在 chat 里以 ne... | ✅ 存在 |
| state.json | 状态文件 | 🟢 tracked [tasked] |
| tasks.json | 任务清单（机器可读） | ✅ 存在 |
| tasks.md | 任务分解：specs-tree-web-cli-plugin-v5-all-in-next（web-cli-plugin v5「All-in-Next 聊天即操作台」；父 Feature 统领性任务总览） — 任务分解：specs-tree-web-cli-plugin-v5-all-in-next（web-cli-plugin v5「All-in-Next 聊... | ✅ 存在 |

## Feature 状态
| 字段 | 值 |
|------|-----|
| Feature ID | N/A |
| Phase | 任务分解 (4/7) |
| Status | 🟢 tracked [tasked] |

## 上级目录
- [返回上级](../TREE.md)
- [返回首页](../../TREE.md)
