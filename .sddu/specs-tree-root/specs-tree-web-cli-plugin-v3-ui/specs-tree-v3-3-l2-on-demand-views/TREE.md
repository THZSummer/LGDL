# Directory: .sddu/specs-tree-root/specs-tree-web-cli-plugin-v3-ui/specs-tree-v3-3-l2-on-demand-views/

## 目录简介
v2 已把**四维连接树 / 122 卡命令档案 / 撤销回执**压进同一屏，v1 已有**审计**与**设置**；作者反馈的本质是这些「底账」与「当前要...

## 目录结构
```
specs-tree-v3-3-l2-on-demand-views/
├── TREE.md          # 本文件 - 目录导航
├── build.md          # 构建报告：specs-tree-v3-3-l2-on-demand-views
├── plan.md          # 技术计划：specs-tree-v3-3-l2-on-demand-views（V3-3 L2 按需视图：树 / 命令 / 审计 / 设置）
├── review.md          # 审查策略（C1~C44）：specs-tree-v3-3-l2-on-demand-views
├── review-report.md          # 审查报告：specs-tree-v3-3-l2-on-demand-views
├── spec.md          # Feature Specification：specs-tree-v3-3-l2-on-demand-views（V3-3 L2 按需视图：树 / 命令 / 审计 / 设置）
├── state.json          # 状态文件 (✅ 已完成)
├── tasks.json          # 任务清单 (机器可读)
├── tasks.md          # 任务分解：specs-tree-v3-3-l2-on-demand-views（V3-3 L2 按需视图：树 / 命令 / 审计 / 设置）
├── validate.md          # 验证报告（验证策略）：specs-tree-v3-3-l2-on-demand-views
└── validate-report.md          # 验证报告：specs-tree-v3-3-l2-on-demand-views
```

## 文件说明
| 文件 | 说明 | 状态 |
|------|------|------|
| build.md | 构建报告：specs-tree-v3-3-l2-on-demand-views — validate 的攻击证据：`attack-judge.mjs` 的 14 条样本里 **9 条绕过**判定器（均**未被本轮证据实际利用**），声明侧... | ✅ 存在 |
| plan.md | 技术计划：specs-tree-v3-3-l2-on-demand-views（V3-3 L2 按需视图：树 / 命令 / 审计 / 设置） — 1. **分列呈现**（EC-V3-016）：实时面与对账基线**两个数字**并列，各带标签（「实时面（当前工具面枚举）」「对账基线（parity 基线）... | ✅ 存在 |
| review.md | 审查策略（C1~C44）：specs-tree-v3-3-l2-on-demand-views — 审查策略（C1~C44）：specs-tree-v3-3-l2-on-demand-views | ✅ 存在 |
| review-report.md | 审查报告：specs-tree-v3-3-l2-on-demand-views — $ grep -nE "catch\s*\{\s*\}"  <19 files>                     → 0 命中 | ✅ 存在 |
| spec.md | Feature Specification：specs-tree-v3-3-l2-on-demand-views（V3-3 L2 按需视图：树 / 命令 / 审计 / 设置） — v2 已把**四维连接树 / 122 卡命令档案 / 撤销回执**压进同一屏，v1 已有**审计**与**设置**；作者反馈的本质是这些「底账」与「当前要... | ✅ 存在 |
| state.json | 状态文件 | ✅ 已完成 |
| tasks.json | 任务清单（机器可读） | ✅ 存在 |
| tasks.md | 任务分解：specs-tree-v3-3-l2-on-demand-views（V3-3 L2 按需视图：树 / 命令 / 审计 / 设置） — Wave 1 ── 无依赖，4 路并行写入（纯函数/纯数据/独立视图模块，文件不相交） | ✅ 存在 |
| validate.md | 验证报告（验证策略）：specs-tree-v3-3-l2-on-demand-views — 验证报告（验证策略）：specs-tree-v3-3-l2-on-demand-views | ✅ 存在 |
| validate-report.md | 验证报告：specs-tree-v3-3-l2-on-demand-views — 1. 自建副本：`cp test/ui/l2.mjs /tmp/opencode/v3-validate-v33/rp-f01/l2.mjs`（**同 b... | ✅ 存在 |

## Feature 状态
| 字段 | 值 |
|------|-----|
| Feature ID | N/A |
| Phase | 验证完成 (7/7) |
| Status | ✅ 已完成 |

## 上级目录
- [返回上级](../TREE.md)
- [返回首页](../../TREE.md)
