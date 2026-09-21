# Directory: .sddu/specs-tree-root/specs-tree-web-cli-plugin-v5-all-in-next/specs-tree-v5-1-next-registry-pipeline/

## 目录简介
本叶 = v5 的**首叶**，交付「可以让后续操作『注册即接入』的那一层」：`NextProvider` / `NextOp` 接口（Definitio...

## 目录结构
```
specs-tree-v5-1-next-registry-pipeline/
├── TREE.md          # 本文件 - 目录导航
├── build.md          # 构建报告：specs-tree-v5-1-next-registry-pipeline（R1 = TASK-V5-101~113 · R2 = TASK-V5-114~122）
├── plan.md          # 技术计划：specs-tree-v5-1-next-registry-pipeline（V5-1 NextProvider 注册表 + op 管线；首叶）
├── review.md          # 审查策略：specs-tree-v5-1-next-registry-pipeline
├── review-report.md          # 审查报告：specs-tree-v5-1-next-registry-pipeline
├── spec.md          # Feature Specification：specs-tree-v5-1-next-registry-pipeline（V5-1 NextProvider 注册表 + op 管线）
├── state.json          # 状态文件 (✅ 已完成)
├── tasks.json          # 任务清单 (机器可读)
├── tasks.md          # 任务分解：specs-tree-v5-1-next-registry-pipeline（V5-1 NextProvider 注册表 + op 管线；首叶）
├── validate.md          # 验证报告：specs-tree-v5-1-next-registry-pipeline
└── validate-report.md          # 验证报告：specs-tree-v5-1-next-registry-pipeline
```

## 文件说明
| 文件 | 说明 | 状态 |
|------|------|------|
| build.md | 构建报告：specs-tree-v5-1-next-registry-pipeline（R1 = TASK-V5-101~113 · R2 = TASK-V5-114~122） — 探针脚本 `/tmp/opencode/v5-spike/g-shim-probe.mjs`，日志 `/tmp/opencode/v4-gate-logs... | ✅ 存在 |
| plan.md | 技术计划：specs-tree-v5-1-next-registry-pipeline（V5-1 NextProvider 注册表 + op 管线；首叶） — 把「操作」变成注册表条目、把「分发」变成查表、把「设计-实现一致」变成机器证据。**本叶不落地 9 个 op 的业务能力**（那是 v5-2），只落地「o... | ✅ 存在 |
| review.md | 审查策略：specs-tree-v5-1-next-registry-pipeline — 1. **迁移等价性（X3 核心）**：以 `git show 036ad03~1:recommend.ts` 为基线，逐条重算旧 4 规则（`activ... | ✅ 存在 |
| review-report.md | 审查报告：specs-tree-v5-1-next-registry-pipeline — 审查报告：specs-tree-v5-1-next-registry-pipeline | ✅ 存在 |
| spec.md | Feature Specification：specs-tree-v5-1-next-registry-pipeline（V5-1 NextProvider 注册表 + op 管线） — 本叶 = v5 的**首叶**，交付「可以让后续操作『注册即接入』的那一层」：`NextProvider` / `NextOp` 接口（Definitio... | ✅ 存在 |
| state.json | 状态文件 | ✅ 已完成 |
| tasks.json | 任务清单（机器可读） | ✅ 存在 |
| tasks.md | 任务分解：specs-tree-v5-1-next-registry-pipeline（V5-1 NextProvider 注册表 + op 管线；首叶） — [前置] 父 plan.md（ADR-V5-001~012 索引）+ 本叶 plan.md（ADR-V5-001/002机制侧/008）+ spec.md... | ✅ 存在 |
| validate.md | 验证报告：specs-tree-v5-1-next-registry-pipeline — 本叶无 HTTP API / DB，故模板 §4「接口与数据实测」按**模块接口契约**执行：`NextProvider`/`NextOp` 形状（V2）... | ✅ 存在 |
| validate-report.md | 验证报告：specs-tree-v5-1-next-registry-pipeline — 验证报告：specs-tree-v5-1-next-registry-pipeline | ✅ 存在 |

## Feature 状态
| 字段 | 值 |
|------|-----|
| Feature ID | N/A |
| Phase | 验证完成 (7/7) |
| Status | ✅ 已完成 |

## 上级目录
- [返回上级](../TREE.md)
- [返回首页](../../TREE.md)
