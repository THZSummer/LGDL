# Directory: .sddu/specs-tree-root/specs-tree-web-cli-plugin-v4-chat/

## 目录简介
web-cli-plugin v4「聊天流统一承载」需求规范 —— 把侧栏从「L0/L1/L2 分区 + 浮层」重构为「**三区 + 聊天流统一承载**」...

## 目录结构
```
specs-tree-web-cli-plugin-v4-chat/
├── TREE.md          # 本文件 - 目录导航
├── closeout.md          # F-30 web-cli-plugin v4「聊天流统一承载」——全 Feature 总账（父收口）
├── discovery.md          # 问题挖掘报告：specs-tree-web-cli-plugin-v4-chat
├── plan.md          # 技术计划：specs-tree-web-cli-plugin-v4-chat（web-cli-plugin v4「聊天流统一承载」；父 Feature 统领性技术方案）
├── spec.md          # Feature Specification：specs-tree-web-cli-plugin-v4-chat（web-cli-plugin v4「聊天流统一承载」）
├── state.json          # 状态文件 (🟢 tracked [tasked])
├── tasks.json          # 任务清单 (机器可读)
├── tasks.md          # 任务分解（**总览与叶子映射，不承接执行**）：specs-tree-web-cli-plugin-v4-chat
├── specs-tree-v4-1-zone-shell-density/          # 本叶 = v4「聊天流统一承载」的**首个开工叶子**与共同基线：立「工具栏 / 聊天流 / 状态栏
├── specs-tree-v4-2-chat-stream-model/          # 本叶 = v4 的**模型与渲染地基**：把流事件模型做成不可变、单调、可回放的 append-on
├── specs-tree-v4-3-ask-auth-inflow/          # 本叶 = v4 的**承载层内化**：把 `ask-user`（choice/text）与破坏性二次
└── specs-tree-v4-4-ref-system-nextstep/          # 本叶 = v4 的**过程全景收口**：把引用生命周期、系统事件（6+ 通道归并）、下一步推荐三类过
```

## 文件说明
| 文件 | 说明 | 状态 |
|------|------|------|
| closeout.md | F-30 web-cli-plugin v4「聊天流统一承载」——全 Feature 总账（父收口） — 1. **三区布局**：`工具栏`（站点摘要只读 + 4 视图入口 + 主题切换，**可点 ≤5**，机器断言超限即抛错）/ `聊天流`（`ol#stre... | ✅ 存在 |
| discovery.md | 问题挖掘报告：specs-tree-web-cli-plugin-v4-chat — web-cli-plugin v4（F-30，方案 F 重构）问题挖掘报告 —— 核心问题 = **过程性交互（问答 / 授权申请 / 下一步推荐 / 系... | ✅ 存在 |
| plan.md | 技术计划：specs-tree-web-cli-plugin-v4-chat（web-cli-plugin v4「聊天流统一承载」；父 Feature 统领性技术方案） — web-cli-plugin v4 技术方案 —— 把侧栏从「L0/L1/L2 分区 + 浮层 + 独占决策槽」重构为「**工具栏 / 聊天流 / 状态栏... | ✅ 存在 |
| spec.md | Feature Specification：specs-tree-web-cli-plugin-v4-chat（web-cli-plugin v4「聊天流统一承载」） — web-cli-plugin v4「聊天流统一承载」需求规范 —— 把侧栏从「L0/L1/L2 分区 + 浮层」重构为「**三区 + 聊天流统一承载**」... | ✅ 存在 |
| state.json | 状态文件 | 🟢 tracked [tasked] |
| tasks.json | 任务清单（机器可读） | ✅ 存在 |
| tasks.md | 任务分解（**总览与叶子映射，不承接执行**）：specs-tree-web-cli-plugin-v4-chat — CP-0 [spike 闸门] TASK-501（v4-1 第一任务，不可跳过/不可后置） | ✅ 存在 |

## Feature 状态
| 字段 | 值 |
|------|-----|
| Feature ID | N/A |
| Phase | 任务分解 (4/7) |
| Status | 🟢 tracked [tasked] |

## 上级目录
- [返回上级](../TREE.md)
- [返回首页](../../TREE.md)
