# Directory: .sddu/specs-tree-root/specs-tree-web-cli-plugin-v4-chat/specs-tree-v4-4-ref-system-nextstep/

## 目录简介
本叶 = v4 的**过程全景收口**：把引用生命周期、系统事件（6+ 通道归并）、下一步推荐三类过程全部涌入流内，并处置「面板侧拾取入口消失」带来的可发...

## 目录结构
```
specs-tree-v4-4-ref-system-nextstep/
├── TREE.md          # 本文件 - 目录导航
├── build.md          # 构建报告：specs-tree-v4-4-ref-system-nextstep
├── plan.md          # 技术计划：specs-tree-v4-4-ref-system-nextstep（V4-4 引用卡 / 系统事件行 / 推荐卡 + 拾取入口迁移）
├── review.md          # 审查报告：specs-tree-v4-4-ref-system-nextstep（V4-4 引用卡 / 系统事件行 / 推荐卡 + 拾取入口迁移）
├── review-report.md          # 审查报告：specs-tree-v4-4-ref-system-nextstep（V4-4 引用卡 / 系统事件行 / 推荐卡 + 拾取入口迁移）
├── spec.md          # Feature Specification：specs-tree-v4-4-ref-system-nextstep（V4-4 引用卡 / 系统事件行 / 推荐卡 + 拾取入口迁移）
├── state.json          # 状态文件 (✅ 已完成)
├── tasks.json          # 任务清单 (机器可读)
├── tasks.md          # 任务分解：specs-tree-v4-4-ref-system-nextstep（V4-4 引用卡 / 系统事件行 / 推荐卡 + 拾取入口迁移）
├── validate.md          # 验证报告：specs-tree-v4-4-ref-system-nextstep
└── validate-report.md          # 验证报告：specs-tree-v4-4-ref-system-nextstep
```

## 文件说明
| 文件 | 说明 | 状态 |
|------|------|------|
| build.md | 构建报告：specs-tree-v4-4-ref-system-nextstep — 唯一通道的纪律对两条自动来源同样生效：净化（明文 ⇒ 抛错，⑨）、去重窗口（⑧/⑥）、速率上限（`dropped` +1 且不追加，⑧）。**归并矩阵的 ... | ✅ 存在 |
| plan.md | 技术计划：specs-tree-v4-4-ref-system-nextstep（V4-4 引用卡 / 系统事件行 / 推荐卡 + 拾取入口迁移） — 本叶 = v4 的**过程全景收口**：把引用生命周期、系统事件（6+ 瞬时通道归并）、下一步推荐三类过程全部涌入流内，并处置「面板侧拾取入口消失」带来的... | ✅ 存在 |
| review.md | 审查报告：specs-tree-v4-4-ref-system-nextstep（V4-4 引用卡 / 系统事件行 / 推荐卡 + 拾取入口迁移） — 1. **代码质量** — 可读性、职责单一性、错误处理、无硬编码、无冗余 | ✅ 存在 |
| review-report.md | 审查报告：specs-tree-v4-4-ref-system-nextstep（V4-4 引用卡 / 系统事件行 / 推荐卡 + 拾取入口迁移） — 1. **BLOCK-01 闭环**：`maybeRecommend` 三处真实时机（拾取后 / 引用失效后 / 空闲=回合结束且 `openAsks==... | ✅ 存在 |
| spec.md | Feature Specification：specs-tree-v4-4-ref-system-nextstep（V4-4 引用卡 / 系统事件行 / 推荐卡 + 拾取入口迁移） — 本叶 = v4 的**过程全景收口**：把引用生命周期、系统事件（6+ 通道归并）、下一步推荐三类过程全部涌入流内，并处置「面板侧拾取入口消失」带来的可发... | ✅ 存在 |
| state.json | 状态文件 | ✅ 已完成 |
| tasks.json | 任务清单（机器可读） | ✅ 存在 |
| tasks.md | 任务分解：specs-tree-v4-4-ref-system-nextstep（V4-4 引用卡 / 系统事件行 / 推荐卡 + 拾取入口迁移） — [前置] v4-2 收口绿（CP-2：TASK-612）；v4-3 收口绿后执行门禁（CP-3，可并行分解） | ✅ 存在 |
| validate.md | 验证报告：specs-tree-v4-4-ref-system-nextstep — 验证报告：specs-tree-v4-4-ref-system-nextstep | ✅ 存在 |
| validate-report.md | 验证报告：specs-tree-v4-4-ref-system-nextstep — 1. **推荐链路（V2）**：四个生产时机（拾取后 / 引用失效后 / 空闲回合结束 / 真·首装）在**真实产品路径**下逐一驱动成功，`lastRe... | ✅ 存在 |

## Feature 状态
| 字段 | 值 |
|------|-----|
| Feature ID | N/A |
| Phase | 验证完成 (7/7) |
| Status | ✅ 已完成 |

## 上级目录
- [返回上级](../TREE.md)
- [返回首页](../../TREE.md)
