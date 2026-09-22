# Directory: .sddu/specs-tree-root/specs-tree-web-cli-plugin-v5-all-in-next/specs-tree-v5-2-ops-first-batch/

## 目录简介
本叶 = v5 的**次叶**，交付「**一站式闭环真的能用**」：把 9 个 op（设计稿 8 个 + `op.turn`）逐个注册到 `v5-1` 的...

## 目录结构
```
specs-tree-v5-2-ops-first-batch/
├── TREE.md          # 本文件 - 目录导航
├── build.md          # 构建报告：specs-tree-v5-2-ops-first-batch（R1 = TASK-V5-123~137 · 波 A~D 前段）
├── plan.md          # 技术计划：specs-tree-v5-2-ops-first-batch（V5-2 首批 9 op 落地 + SW 执行器 + 断流首验收；次叶）
├── review.md          # 审查策略：specs-tree-v5-2-ops-first-batch（V5-2 首批 9 op 落地 + SW 执行器 + 断流首验收）
├── review-report.md          # 审查报告：specs-tree-v5-2-ops-first-batch（V5-2 首批 9 op 落地 + SW 执行器 + 断流首验收）
├── spec.md          # Feature Specification：specs-tree-v5-2-ops-first-batch（V5-2 首批 9 op 落地 + SW 执行器 + 断流首验收）
├── state.json          # 状态文件 (✅ 已完成)
├── tasks.json          # 任务清单 (机器可读)
├── tasks.md          # 任务分解：specs-tree-v5-2-ops-first-batch（V5-2 首批 9 op 落地 + SW 执行器 + 断流首验收；次叶）
├── validate.md          # 验证策略：specs-tree-v5-2-ops-first-batch（V5-2 首批 9 op 落地 + SW 执行器 + 断流首验收）
└── validate-report.md          # 验证报告：specs-tree-v5-2-ops-first-batch（V5-2 首批 9 op 落地 + SW 执行器 + 断流首验收）
```

## 文件说明
| 文件 | 说明 | 状态 |
|------|------|------|
| build.md | 构建报告：specs-tree-v5-2-ops-first-batch（R1 = TASK-V5-123~137 · 波 A~D 前段） — 1. `IMPL['op.llm-config']` 的 row 由零参箭头 `() => PANEL.llmConfig?.()` 改为**转发 ctx... | ✅ 存在 |
| plan.md | 技术计划：specs-tree-v5-2-ops-first-batch（V5-2 首批 9 op 落地 + SW 执行器 + 断流首验收；次叶） — 把「用户需要操作的地方」搬进 chat（9 op + 统一管线）、把权限面**精确**放开（只 `optional_permissions`，本批 0 项... | ✅ 存在 |
| review.md | 审查策略：specs-tree-v5-2-ops-first-batch（V5-2 首批 9 op 落地 + SW 执行器 + 断流首验收） — 审查策略：specs-tree-v5-2-ops-first-batch（V5-2 首批 9 op 落地 + SW 执行器 + 断流首验收） | ✅ 存在 |
| review-report.md | 审查报告：specs-tree-v5-2-ops-first-batch（V5-2 首批 9 op 落地 + SW 执行器 + 断流首验收） — 审查报告：specs-tree-v5-2-ops-first-batch（V5-2 首批 9 op 落地 + SW 执行器 + 断流首验收） | ✅ 存在 |
| spec.md | Feature Specification：specs-tree-v5-2-ops-first-batch（V5-2 首批 9 op 落地 + SW 执行器 + 断流首验收） — 本叶 = v5 的**次叶**，交付「**一站式闭环真的能用**」：把 9 个 op（设计稿 8 个 + `op.turn`）逐个注册到 `v5-1` 的... | ✅ 存在 |
| state.json | 状态文件 | ✅ 已完成 |
| tasks.json | 任务清单（机器可读） | ✅ 存在 |
| tasks.md | 任务分解：specs-tree-v5-2-ops-first-batch（V5-2 首批 9 op 落地 + SW 执行器 + 断流首验收；次叶） — [前置] v5-1 全绿（TASK-V5-101~122）+ 本叶 plan.md（ADR-V5-002执行侧/003/004/005）+ 父 tasks... | ✅ 存在 |
| validate.md | 验证策略：specs-tree-v5-2-ops-first-batch（V5-2 首批 9 op 落地 + SW 执行器 + 断流首验收） — 1. **扰动可还原**：所有注入/伪造只在探针内存或源码**副本**上进行；不修改仓库源码做对抗（唯一例外见 N-01 处置记录）。 | ✅ 存在 |
| validate-report.md | 验证报告：specs-tree-v5-2-ops-first-batch（V5-2 首批 9 op 落地 + SW 执行器 + 断流首验收） — 1. **门禁与声明值逐项可复现**：node 1172/0、四张 Chromium 主门禁（recommendation 65 / stream 68 ... | ✅ 存在 |

## Feature 状态
| 字段 | 值 |
|------|-----|
| Feature ID | N/A |
| Phase | 验证完成 (7/7) |
| Status | ✅ 已完成 |

## 上级目录
- [返回上级](../TREE.md)
- [返回首页](../../TREE.md)
