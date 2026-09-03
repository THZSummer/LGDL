# Directory: .sddu/specs-tree-root/specs-tree-engine-defect-fixes/

## 目录简介
门禁 feature（specs-tree-render-gate，b69bbbf）以「精确已知集断言」记录了引擎 **29 项几何违例**（matrix...

## 目录结构
```
specs-tree-engine-defect-fixes/
├── TREE.md          # 本文件 - 目录导航
├── build.md          # 构建报告：specs-tree-engine-defect-fixes（引擎缺陷修复 — 门禁暴露的渲染/布局/走线缺陷）
├── discovery.md          # 问题挖掘报告：specs-tree-engine-defect-fixes（引擎缺陷修复 — 门禁暴露项摸底）
├── plan.md          # 技术计划：specs-tree-engine-defect-fixes（引擎缺陷修复 — 三类缺陷选型 + 落地 + 迁移 + 收编）
├── review.md          # 审查策略：specs-tree-engine-defect-fixes（引擎缺陷修复）
├── review-report.md          # 审查报告：specs-tree-engine-defect-fixes（引擎缺陷修复）
├── spec.md          # Feature Specification：specs-tree-engine-defect-fixes（引擎缺陷修复 — 门禁暴露项收编回 clean）
├── state.json          # 状态文件 (✅ 已完成)
├── tasks.json          # 任务清单 (机器可读)
├── tasks.md          # 任务分解：specs-tree-engine-defect-fixes（引擎缺陷修复 — 门禁暴露的渲染/布局/走线缺陷）
├── validate.md          # 验证策略：specs-tree-engine-defect-fixes（引擎缺陷修复）
└── validate-report.md          # 验证报告：specs-tree-engine-defect-fixes（引擎缺陷修复）
```

## 文件说明
| 文件 | 说明 | 状态 |
|------|------|------|
| build.md | 构建报告：specs-tree-engine-defect-fixes（引擎缺陷修复 — 门禁暴露的渲染/布局/走线缺陷） — 构建报告：specs-tree-engine-defect-fixes（引擎缺陷修复 — 门禁暴露的渲染/布局/走线缺陷） | ✅ 存在 |
| discovery.md | 问题挖掘报告：specs-tree-engine-defect-fixes（引擎缺陷修复 — 门禁暴露项摸底） — 1. **collapseGridPath 允许"垂直穿过自身节点内部"的 L 捷径**：A*（router/index.ts:613-747）对自身节点... | ✅ 存在 |
| plan.md | 技术计划：specs-tree-engine-defect-fixes（引擎缺陷修复 — 三类缺陷选型 + 落地 + 迁移 + 收编） — 1. `detickPath`（router，输出级末端垂直化 + 贴边段 bump 修正）——routeEdge/routeRectilinear 出口... | ✅ 存在 |
| review.md | 审查策略：specs-tree-engine-defect-fixes（引擎缺陷修复） — 审查策略：specs-tree-engine-defect-fixes（引擎缺陷修复） | ✅ 存在 |
| review-report.md | 审查报告：specs-tree-engine-defect-fixes（引擎缺陷修复） — 审查报告：specs-tree-engine-defect-fixes（引擎缺陷修复） | ✅ 存在 |
| spec.md | Feature Specification：specs-tree-engine-defect-fixes（引擎缺陷修复 — 门禁暴露项收编回 clean） — 门禁 feature（specs-tree-render-gate，b69bbbf）以「精确已知集断言」记录了引擎 **29 项几何违例**（matrix... | ✅ 存在 |
| state.json | 状态文件 | ✅ 已完成 |
| tasks.json | 任务清单（机器可读） | ✅ 存在 |
| tasks.md | 任务分解：specs-tree-engine-defect-fixes（引擎缺陷修复 — 门禁暴露的渲染/布局/走线缺陷） — git status --short | ✅ 存在 |
| validate.md | 验证策略：specs-tree-engine-defect-fixes（引擎缺陷修复） — 验证策略：specs-tree-engine-defect-fixes（引擎缺陷修复） | ✅ 存在 |
| validate-report.md | 验证报告：specs-tree-engine-defect-fixes（引擎缺陷修复） — 1. **门禁归零是真实修复而非放宽判定**（V1/V7）：geometry-audit.ts（G1~G6 判定 + AUDIT_TOL 全常量）在 b6... | ✅ 存在 |

## Feature 状态
| 字段 | 值 |
|------|-----|
| Feature ID | N/A |
| Phase | 验证完成 (7/7) |
| Status | ✅ 已完成 |

## 上级目录
- [返回上级](../TREE.md)
- [返回首页](../../TREE.md)
