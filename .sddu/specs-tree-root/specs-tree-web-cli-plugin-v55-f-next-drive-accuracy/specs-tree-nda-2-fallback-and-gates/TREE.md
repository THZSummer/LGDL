# Directory: .sddu/specs-tree-root/specs-tree-web-cli-plugin-v55-f-next-drive-accuracy/specs-tree-nda-2-fallback-and-gates/

## 目录简介
**终态（2026-09-27 父收口）：phase=validated / status=completed（21/21）** —— 未配置确定性引导 + 自由输入分相 + 提醒补一次 + LLM 异常兜底链 + 首开边界 + 门禁/体积重锚；`npm test` 1517 → **1525/0** · `sidepanel.js` 605,239 → **606,652 B**（+1,413，越叶预算 13 B 如实登记）· `ai-next-candidate` **28/0** · `supersession` 56/0 · `gate-integrity` 27/0 · `size-ruling-vol3` 14/0 · `law8` 72/0 · `dead-end` 56/0 · `recommendation` 85 · `insight`/`e2e` PASS · 作者口径端到端独立复核 **22/0** · SG-NDA-03 可行（18/18）· review ⚠️ 0 阻塞（I-1 `abnormalVerdict` 空候选误判已修 + 两条注入必红）/ validate ⚠️ 0 阻塞 · 全 Feature 总账见 ../`closeout.md`。原简介：父规范 §2.2 的**未配置路径偏颇 + 异常兜底缺位 + 门禁/体积治理面**全部落在本叶：F-36 让 `free-input` provider ...

## 目录结构
```
specs-tree-nda-2-fallback-and-gates/
├── TREE.md          # 本文件 - 目录导航
├── ADR-NDA-201-abnormal-fact-carrier-and-transport.md          # ADR-NDA-201: 异常事实的承载与传输（`AiNextPayload.abnormal?` + SW 单源判定）
├── ADR-NDA-202-gate-count-reanchor-and-open-protected-decisions.md          # ADR-NDA-202: 门禁计数等价重锚的具体数值与首开 / 保护段处置（含 `driver-quadruple` 12→13）
├── build.md          # 构建报告：specs-tree-nda-2-fallback-and-gates
├── plan.md          # 技术计划：specs-tree-nda-2-fallback-and-gates（NDA-2 未配置确定性引导 + 自由输入分相 + 提醒补一次 + LLM 异常兜底链 + 首开边界 + 门禁/体积重锚：兜底与判据叶）
├── review.md          # 审查报告：specs-tree-nda-2-fallback-and-gates（审查策略）
├── review-report.md          # 审查报告：specs-tree-nda-2-fallback-and-gates（审查执行报告）
├── spec.md          # Feature Specification：specs-tree-nda-2-fallback-and-gates（NDA-2 未配置确定性引导 + 自由输入分相 + 提醒补一次 + LLM 异常兜底链 + 首开边界 + 门禁/体积重锚：兜底与判据叶）
├── state.json          # 状态文件 (✅ 已完成)
├── tasks.json          # 任务清单 (机器可读)
├── tasks.md          # 任务分解：specs-tree-nda-2-fallback-and-gates（NDA-2 未配置确定性引导 + 自由输入分相 + 提醒补一次 + LLM 异常兜底链 + 首开边界 + 门禁/体积重锚；叶2 = 末叶 / 兜底与判据叶）
├── validate.md          # 验证策略：specs-tree-nda-2-fallback-and-gates（V1~V14 场景矩阵）
└── validate-report.md          # 验证报告：specs-tree-nda-2-fallback-and-gates（R1 执行报告）
```

## 文件说明
| 文件 | 说明 | 状态 |
|------|------|------|
| ADR-NDA-201-abnormal-fact-carrier-and-transport.md | ADR-NDA-201: 异常事实的承载与传输（`AiNextPayload.abnormal?` + SW 单源判定） — 系统兜底需要面板知道「本回合 LLM 异常」这一事实。可用信号有三处，但**都不完整**： | ✅ 存在 |
| ADR-NDA-202-gate-count-reanchor-and-open-protected-decisions.md | ADR-NDA-202: 门禁计数等价重锚的具体数值与首开 / 保护段处置（含 `driver-quadruple` 12→13） — 本叶引入**一个**新 provider（`llm.abnormal`，ADR-NDA-007 §③，复用 `op.llm-config`）。复核发现这会... | ✅ 存在 |
| build.md | 构建报告：specs-tree-nda-2-fallback-and-gates — `packages/web-cli-base/**`（零 diff）/ `.sddu/specs-tree-root/ROADMAP.md`（零 diff... | ✅ 存在 |
| plan.md | 技术计划：specs-tree-nda-2-fallback-and-gates（NDA-2 未配置确定性引导 + 自由输入分相 + 提醒补一次 + LLM 异常兜底链 + 首开边界 + 门禁/体积重锚：兜底与判据叶） — 技术计划：specs-tree-nda-2-fallback-and-gates（NDA-2 未配置确定性引导 + 自由输入分相 + 提醒补一次 + LL... | ✅ 存在 |
| review.md | 审查报告：specs-tree-nda-2-fallback-and-gates（审查策略） — 审查报告：specs-tree-nda-2-fallback-and-gates（审查策略） | ✅ 存在 |
| review-report.md | 审查报告：specs-tree-nda-2-fallback-and-gates（审查执行报告） — 审查报告：specs-tree-nda-2-fallback-and-gates（审查执行报告） | ✅ 存在 |
| spec.md | Feature Specification：specs-tree-nda-2-fallback-and-gates（NDA-2 未配置确定性引导 + 自由输入分相 + 提醒补一次 + LLM 异常兜底链 + 首开边界 + 门禁/体积重锚：兜底与判据叶） — 父规范 §2.2 的**未配置路径偏颇 + 异常兜底缺位 + 门禁/体积治理面**全部落在本叶：F-36 让 `free-input` provider ... | ✅ 存在 |
| state.json | 状态文件 | ✅ 已完成 |
| tasks.json | 任务清单（机器可读） | ✅ 存在 |
| tasks.md | 任务分解：specs-tree-nda-2-fallback-and-gates（NDA-2 未配置确定性引导 + 自由输入分相 + 提醒补一次 + LLM 异常兜底链 + 首开边界 + 门禁/体积重锚；叶2 = 末叶 / 兜底与判据叶） — Wave 1 ─── 分相与提醒（B 列为主） | ✅ 存在 |
| validate.md | 验证策略：specs-tree-nda-2-fallback-and-gates（V1~V14 场景矩阵 + 五维度指引） | ✅ 存在 |
| validate-report.md | 验证报告：specs-tree-nda-2-fallback-and-gates（R1 执行报告；⚠️ 有条件通过 / 0 阻塞） | ✅ 存在 |

## Feature 状态
| 字段 | 值 |
|------|-----|
| Feature ID | F-37 |
| Phase | 验证完成 (7/7) |
| Status | ✅ 已完成 |

## 上级目录
- [返回上级](../TREE.md)
- [返回首页](../../TREE.md)
