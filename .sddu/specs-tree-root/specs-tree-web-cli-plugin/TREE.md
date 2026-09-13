# Directory: .sddu/specs-tree-root/specs-tree-web-cli-plugin/

## 目录简介
作者立项口径（discovery §0.1）：**「提供浏览器插件，web-cli-plugin，配置完大模型的 key 之后，就支持借助打开的网站的 w...

## 目录结构
```
specs-tree-web-cli-plugin/
├── TREE.md          # 本文件 - 目录导航
├── build.md          # 构建报告：specs-tree-web-cli-plugin（web-cli-plugin，v0.8）
├── discovery.md          # 问题挖掘报告：web-cli-plugin（浏览器插件）
├── plan.md          # 技术计划：specs-tree-web-cli-plugin（web-cli-plugin：独立于 LGDL 的浏览器插件——v0.8 主题「浏览器插件孵化」）
├── review.md          # 审查策略：specs-tree-web-cli-plugin（web-cli-plugin，v0.8 · P0 最小可用集）
├── review-report.md          # 审查报告：specs-tree-web-cli-plugin（web-cli-plugin，v0.8 · P0 最小可用集）
├── spec.md          # Feature Specification：specs-tree-web-cli-plugin（web-cli-plugin：独立于 LGDL 的浏览器插件——v0.8 主题「浏览器插件孵化」）
├── spike-mv3-gkey.md          # 波0 验证门：MV3 平台约束最小验证 + G-KEY 端点验证（TASK-001 / TB-0A+TB-0D）
├── spike-protocol-pilot.md          # 波0：协议本质澄清 + 最小试点启动（TASK-002 / TB-0B+TB-0C）
├── state.json          # 状态文件 (✅ 已完成)
├── tasks.json          # 任务清单 (机器可读)
├── tasks.md          # 任务分解：web-cli-plugin（浏览器插件，v0.8 主题「浏览器插件孵化」）（specs-tree-web-cli-plugin）
├── validate.md          # 验证报告：specs-tree-web-cli-plugin（web-cli-plugin，v0.8 · P0 最小可用集）
└── validate-report.md          # 验证报告：specs-tree-web-cli-plugin（web-cli-plugin，v0.8 · 全量 P0+P1+P2）
```

## 文件说明
| 文件 | 说明 | 状态 |
|------|------|------|
| build.md | 构建报告：specs-tree-web-cli-plugin（web-cli-plugin，v0.8） — 新建 `packages/web-cli-plugin/docs/release.md`：首版渠道 = 本地 unpacked + 自托管/未打包分发；`... | ✅ 存在 |
| discovery.md | 问题挖掘报告：web-cli-plugin（浏览器插件） — 1. **优先消费问题清单**：§3 的 Q-001~Q-020 是 spec 的问题输入；核心 8 项（Q-001~Q-008）应作为 spec 范围界... | ✅ 存在 |
| plan.md | 技术计划：specs-tree-web-cli-plugin（web-cli-plugin：独立于 LGDL 的浏览器插件——v0.8 主题「浏览器插件孵化」） — 1. 前置检查：逐条验收 Gate-D 并记录（未达门槛 → **不下线**，EC-016）。 | ✅ 存在 |
| review.md | 审查策略：specs-tree-web-cli-plugin（web-cli-plugin，v0.8 · P0 最小可用集） — 审查策略：specs-tree-web-cli-plugin（web-cli-plugin，v0.8 · P0 最小可用集） | ✅ 存在 |
| review-report.md | 审查报告：specs-tree-web-cli-plugin（web-cli-plugin，v0.8 · P0 最小可用集） — 但存在 **2 个阻塞问题**： | ✅ 存在 |
| spec.md | Feature Specification：specs-tree-web-cli-plugin（web-cli-plugin：独立于 LGDL 的浏览器插件——v0.8 主题「浏览器插件孵化」） — 作者立项口径（discovery §0.1）：**「提供浏览器插件，web-cli-plugin，配置完大模型的 key 之后，就支持借助打开的网站的 w... | ✅ 存在 |
| spike-mv3-gkey.md | 波0 验证门：MV3 平台约束最小验证 + G-KEY 端点验证（TASK-001 / TB-0A+TB-0D） — 波0 验证门：MV3 平台约束最小验证 + G-KEY 端点验证（TASK-001 / TB-0A+TB-0D） | ✅ 存在 |
| spike-protocol-pilot.md | 波0：协议本质澄清 + 最小试点启动（TASK-002 / TB-0B+TB-0C） — 发现（三通道） → 声明读取 + 版本协商 + 完整性/信任 → 用户授权（per-origin） | ✅ 存在 |
| state.json | 状态文件 | ✅ 已完成 |
| tasks.json | 任务清单（机器可读） | ✅ 存在 |
| tasks.md | 任务分解：web-cli-plugin（浏览器插件，v0.8 主题「浏览器插件孵化」）（specs-tree-web-cli-plugin） — grep -cE "PASS|FAIL|降级" .sddu/specs-tree-root/specs-tree-web-cli-plugin/spike... | ✅ 存在 |
| validate.md | 验证报告：specs-tree-web-cli-plugin（web-cli-plugin，v0.8 · P0 最小可用集） — 验证报告：specs-tree-web-cli-plugin（web-cli-plugin，v0.8 · P0 最小可用集） | ✅ 存在 |
| validate-report.md | 验证报告：specs-tree-web-cli-plugin（web-cli-plugin，v0.8 · 全量 P0+P1+P2） — 未判「✅ 通过」的原因（均为非阻塞）： | ✅ 存在 |

## Feature 状态
| 字段 | 值 |
|------|-----|
| Feature ID | N/A |
| Phase | 验证完成 (7/7) |
| Status | ✅ 已完成 |

## 上级目录
- [返回上级](../TREE.md)
- [返回首页](../../TREE.md)
