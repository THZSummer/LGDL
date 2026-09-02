# Directory: .sddu/specs-tree-root/specs-tree-render-gate/

## 目录简介
discovery 摸底（源码只读实测 2026-09-02）确认三大核心问题成立，全部带代码证据：

## 目录结构
```
specs-tree-render-gate/
├── TREE.md          # 本文件 - 目录导航
├── ADR-001-test-support-placement.md          # ADR-001: 测试侧代码落位与编译边界（test-support 目录 + tsconfig exclude）
├── ADR-002-examples-source-mirror.md          # ADR-002: A 档 11 源获取策略（render 包内受管镜像，禁跨包反向依赖）
├── ADR-003-golden-assets-and-update-gate.md          # ADR-003: golden 快照资产格式与更新门（test-assets + 字节/sha 双校验 + env 显式重建）
├── ADR-004-audit-datasource-independence.md          # ADR-004: 几何审计数据源与独立实现策略（SVG 为真值 + 不复用 router 运行函数）
├── build.md          # 构建报告：specs-tree-render-gate（补全 LGDL 门禁测试用例）
├── discovery.md          # 问题挖掘报告：specs-tree-render-gate（补全 LGDL 门禁测试用例）
├── plan.md          # 技术方案：specs-tree-render-gate（补全 LGDL 门禁测试用例 — 几何审计 + golden 快照）
├── review.md          # 审查策略：specs-tree-render-gate（补全 LGDL 门禁测试用例）
├── review-report.md          # 审查报告：specs-tree-render-gate（补全 LGDL 门禁测试用例）
├── spec.md          # Feature Specification：specs-tree-render-gate（补全 LGDL 门禁测试用例）
├── state.json          # 状态文件 (✅ 已完成)
├── tasks.json          # 任务清单 (机器可读)
├── tasks.md          # 任务分解：specs-tree-render-gate（补全 LGDL 门禁测试用例）
├── validate.md          # 验证策略：specs-tree-render-gate（补全 LGDL 门禁测试用例）
└── validate-report.md          # 验证报告：specs-tree-render-gate（补全 LGDL 门禁测试用例）
```

## 文件说明
| 文件 | 说明 | 状态 |
|------|------|------|
| ADR-001-test-support-placement.md | ADR-001: 测试侧代码落位与编译边界（test-support 目录 + tsconfig exclude） — spec FR-005 要求 geometry-audit helper「放 render 包测试支持代码，非 src 业务导出，不进包 exports」... | ✅ 存在 |
| ADR-002-examples-source-mirror.md | ADR-002: A 档 11 源获取策略（render 包内受管镜像，禁跨包反向依赖） — spec FR-002/FR-008 要求 A 档 11 例的输入 = `EXAMPLES[i].source`（examples.ts 单一事实源），快... | ✅ 存在 |
| ADR-003-golden-assets-and-update-gate.md | ADR-003: golden 快照资产格式与更新门（test-assets + 字节/sha 双校验 + env 显式重建） — spec 开放问题 #3「快照资产落位与重建入口细节」待 plan 决策；FR-008（11 组 {id}.svg + sha256 manifest 建... | ✅ 存在 |
| ADR-004-audit-datasource-independence.md | ADR-004: 几何审计数据源与独立实现策略（SVG 为真值 + 不复用 router 运行函数） — spec D-003 已钉死五类判定（G1~G5）以「最终 SVG 元素解析」为真值（LayoutResult.edges 只是中心线初值，最终折线在 r... | ✅ 存在 |
| build.md | 构建报告：specs-tree-render-gate（补全 LGDL 门禁测试用例） — 1. **A 档 4 文档各 1 处已知违例（EC-001，matrix-a.test.ts 以「精确已知集」断言，引擎修复后该集变空即红提示收编回 cl... | ✅ 存在 |
| discovery.md | 问题挖掘报告：specs-tree-render-gate（补全 LGDL 门禁测试用例） — `flowchart | mindmap | uml-class | arch | datastream | sequence | er | state ... | ✅ 存在 |
| plan.md | 技术方案：specs-tree-render-gate（补全 LGDL 门禁测试用例 — 几何审计 + golden 快照） — 门禁是**旁路测试**：对 `parseLgdl → layoutDocument → renderSvg` 的既有输出做断言，不触碰 render/la... | ✅ 存在 |
| review.md | 审查策略：specs-tree-render-gate（补全 LGDL 门禁测试用例） — 审查策略：specs-tree-render-gate（补全 LGDL 门禁测试用例） | ✅ 存在 |
| review-report.md | 审查报告：specs-tree-render-gate（补全 LGDL 门禁测试用例） — 无（阻塞问题数 = 0）。 | ✅ 存在 |
| spec.md | Feature Specification：specs-tree-render-gate（补全 LGDL 门禁测试用例） — discovery 摸底（源码只读实测 2026-09-02）确认三大核心问题成立，全部带代码证据： | ✅ 存在 |
| state.json | 状态文件 | ✅ 已完成 |
| tasks.json | 任务清单（机器可读） | ✅ 存在 |
| tasks.md | 任务分解：specs-tree-render-gate（补全 LGDL 门禁测试用例） — 1. plan §6.2 提及的 `snapshot 模块 compareOne(id, svg)` 不落地为 snapshot.test.ts 导出——... | ✅ 存在 |
| validate.md | 验证策略：specs-tree-render-gate（补全 LGDL 门禁测试用例） — 验证策略：specs-tree-render-gate（补全 LGDL 门禁测试用例） | ✅ 存在 |
| validate-report.md | 验证报告：specs-tree-render-gate（补全 LGDL 门禁测试用例） — 1. **旁路零改动实证**（V1）：git diff 四包 src 零改动、`dist/index.js` sha256=`2ec5c0a5…` 与基线... | ✅ 存在 |

## Feature 状态
| 字段 | 值 |
|------|-----|
| Feature ID | N/A |
| Phase | 验证完成 (7/7) |
| Status | ✅ 已完成 |

## 上级目录
- [返回上级](../TREE.md)
- [返回首页](../../TREE.md)
