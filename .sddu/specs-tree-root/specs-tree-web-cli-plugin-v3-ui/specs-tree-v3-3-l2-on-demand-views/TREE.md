# Directory: .sddu/specs-tree-root/specs-tree-web-cli-plugin-v3-ui/specs-tree-v3-3-l2-on-demand-views/

## 目录简介
v2 已把**四维连接树 / 122 卡命令档案 / 撤销回执**压进同一屏，v1 已有**审计**与**设置**；作者反馈的本质是这些「底账」与「当前要...

## 目录结构
```
specs-tree-v3-3-l2-on-demand-views/
├── TREE.md          # 本文件 - 目录导航
├── build.md          # 构建报告：specs-tree-v3-3-l2-on-demand-views
├── review-report.md  # 审查报告 R1（1 阻塞 F-01 + I-01~I-05）
├── review.md          # 审查策略 C1~C44
├── plan.md          # 技术计划：specs-tree-v3-3-l2-on-demand-views（V3-3 L2 按需视图：树 / 命令 / 审计 / 设置）
├── spec.md          # Feature Specification：specs-tree-v3-3-l2-on-demand-views（V3-3 L2 按需视图：树 / 命令 / 审计 / 设置）
├── state.json          # 状态文件 (🟢 tracked [reviewed])
├── tasks.json          # 任务清单 (机器可读)
└── tasks.md          # 任务分解：specs-tree-v3-3-l2-on-demand-views（V3-3 L2 按需视图：树 / 命令 / 审计 / 设置）
```

## 文件说明
| 文件 | 说明 | 状态 |
|------|------|------|
| build.md | 构建报告（v1.1 = 修复轮）：含 §9 F-01 订正 / expectFailPattern 防呆 / I-01~I-05 逐条 / 门禁表 / 体积重登记 349,925 B | ✅ 存在 |
| review.md | 审查策略（C1~C44，Feature 级固定产物） | ✅ 存在 |
| review-report.md | 审查报告 R1：❌ 不通过（1 阻塞 F-01 证据缺陷 + 8 警告 → I-01~I-05；实现层 15 门禁全绿） | ✅ 存在 |
| plan.md | 技术计划：specs-tree-v3-3-l2-on-demand-views（V3-3 L2 按需视图：树 / 命令 / 审计 / 设置） — 1. **分列呈现**（EC-V3-016）：实时面与对账基线**两个数字**并列，各带标签（「实时面（当前工具面枚举）」「对账基线（parity 基线）... | ✅ 存在 |
| spec.md | Feature Specification：specs-tree-v3-3-l2-on-demand-views（V3-3 L2 按需视图：树 / 命令 / 审计 / 设置） — v2 已把**四维连接树 / 122 卡命令档案 / 撤销回执**压进同一屏，v1 已有**审计**与**设置**；作者反馈的本质是这些「底账」与「当前要... | ✅ 存在 |
| state.json | 状态文件（files.build/review/reviewReport 已登记） | 🟢 tracked [reviewed] |
| tasks.json | 任务清单（机器可读） | ✅ 存在 |
| tasks.md | 任务分解：specs-tree-v3-3-l2-on-demand-views（V3-3 L2 按需视图：树 / 命令 / 审计 / 设置） — Wave 1 ── 无依赖，4 路并行写入（纯函数/纯数据/独立视图模块，文件不相交） | ✅ 存在 |

## Feature 状态
| 字段 | 值 |
|------|-----|
| Feature ID | N/A |
| Phase | 已审查 (6/7) — 审查 R1 ❌ + 修复轮已完成（`phase=reviewed`，待 validate） |
| Status | 🟢 tracked [reviewed] |

## 上级目录
- [返回上级](../TREE.md)
- [返回首页](../../TREE.md)
