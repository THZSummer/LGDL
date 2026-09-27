# Directory: .sddu/specs-tree-root/specs-tree-web-cli-plugin-v55-f-next-drive-accuracy/specs-tree-nda-1-next-tool-channel/

## 目录简介
**终态（2026-09-27 父收口）：phase=validated / status=completed（20/20）** —— 产出机制换轨（注册 `next` 工具 + `hooks.intercept` 捕获 + 合成 `ToolResult` 短路 dispatch + `rawArguments` 严格 JSON + `next` 不上流）+ 触发范围无条件（`ai-led` 规则位；`NEXTSTEP_PRIORITY` 恰 4→5）+ 5 道校验链逐字保留 + 围栏块通道结构性替换 + `parity` 新条目；`npm test` 1507 → **1517/0** · `sidepanel.js` 604,602 → **605,239 B**（+637，越叶估如实登记）· `law8` 69/0 · `supersession` 55/0 · `gate-integrity` 27/0 · `size-ruling-vol3` 14/0 · `ai-next-candidate` **14/0** · SG-NDA-01（8/8）/ SG-NDA-02（12/12）全可行 · review ⚠️ 0 阻塞（I-1 law8 ⑫ 虚绿判据已修 + 注入必红）/ validate ⚠️ 0 阻塞 · 全 Feature 总账见 ../`closeout.md`。原简介：父规范 §2.2 的**机制根因（产出机制 / 触发范围）+ 安全闸保留面**全部落在本叶：F-36 用「文本 `next` 围栏块 + 正则解析」冒充函...

## 目录结构
```
specs-tree-nda-1-next-tool-channel/
├── TREE.md          # 本文件 - 目录导航
├── ADR-NDA-101-capture-parameter-surface-and-parse-failure.md          # ADR-NDA-101: 捕获参数面与解析失败口径（`rawArguments` 严格 JSON；`tc.args` 零使用）
├── ADR-NDA-102-next-tool-not-on-stream.md          # ADR-NDA-102: `next` 工具调用不上流（events 加法过滤）与 `onToolDone` 语义不动
├── build.md          # 构建报告：specs-tree-nda-1-next-tool-channel
├── plan.md          # 技术计划：specs-tree-nda-1-next-tool-channel（NDA-1 `next` 工具产出通道 + 无条件触发 + 5 道校验链接入：机制核心）
├── review.md          # 审查报告：specs-tree-nda-1-next-tool-channel（审查策略）
├── review-report.md          # 审查报告：specs-tree-nda-1-next-tool-channel（审查执行报告）
├── spec.md          # Feature Specification：specs-tree-nda-1-next-tool-channel（NDA-1 `next` 工具产出通道 + 无条件触发 + 5 道校验链接入：机制核心）
├── state.json          # 状态文件 (✅ 已完成)
├── tasks.json          # 任务清单 (机器可读)
├── tasks.md          # 任务分解：specs-tree-nda-1-next-tool-channel（NDA-1 `next` 工具产出通道 + 无条件触发 + 5 道校验链接入：机制核心；叶1 = 首叶 / 底座叶）
├── validate.md          # 验证策略：specs-tree-nda-1-next-tool-channel
└── validate-report.md          # 验证报告：specs-tree-nda-1-next-tool-channel
```

## 文件说明
| 文件 | 说明 | 状态 |
|------|------|------|
| ADR-NDA-101-capture-parameter-surface-and-parse-failure.md | ADR-NDA-101: 捕获参数面与解析失败口径（`rawArguments` 严格 JSON；`tc.args` 零使用） — `next` 工具的调用参数是**嵌套结构**： | ✅ 存在 |
| ADR-NDA-102-next-tool-not-on-stream.md | ADR-NDA-102: `next` 工具调用不上流（events 加法过滤）与 `onToolDone` 语义不动 — 基座对**每次**工具调用都会向场景发三类事件（`packages/web-cli-base/src/runner.ts`）： | ✅ 存在 |
| build.md | 构建报告：specs-tree-nda-1-next-tool-channel — `driver-timings` / `driver-quadruple`（12↔12）/ `op-wiring` / `op-three-tier` /... | ✅ 存在 |
| plan.md | 技术计划：specs-tree-nda-1-next-tool-channel（NDA-1 `next` 工具产出通道 + 无条件触发 + 5 道校验链接入：机制核心） — 技术计划：specs-tree-nda-1-next-tool-channel（NDA-1 `next` 工具产出通道 + 无条件触发 + 5 道校验链接... | ✅ 存在 |
| review.md | 审查报告：specs-tree-nda-1-next-tool-channel（审查策略） — 审查报告：specs-tree-nda-1-next-tool-channel（审查策略） | ✅ 存在 |
| review-report.md | 审查报告：specs-tree-nda-1-next-tool-channel（审查执行报告） — 审查报告：specs-tree-nda-1-next-tool-channel（审查执行报告） | ✅ 存在 |
| spec.md | Feature Specification：specs-tree-nda-1-next-tool-channel（NDA-1 `next` 工具产出通道 + 无条件触发 + 5 道校验链接入：机制核心） — 父规范 §2.2 的**机制根因（产出机制 / 触发范围）+ 安全闸保留面**全部落在本叶：F-36 用「文本 `next` 围栏块 + 正则解析」冒充函... | ✅ 存在 |
| state.json | 状态文件 | ✅ 已完成 |
| tasks.json | 任务清单（机器可读） | ✅ 存在 |
| tasks.md | 任务分解：specs-tree-nda-1-next-tool-channel（NDA-1 `next` 工具产出通道 + 无条件触发 + 5 道校验链接入：机制核心；叶1 = 首叶 / 底座叶） — Wave 1 ─── 工具通道与捕获（B 列先行；A 列零增量） | ✅ 存在 |
| validate.md | 验证策略：specs-tree-nda-1-next-tool-channel — 验证策略：specs-tree-nda-1-next-tool-channel | ✅ 存在 |
| validate-report.md | 验证报告：specs-tree-nda-1-next-tool-channel — 1. **换轨是真换轨、且可判**：`next` 工具进入 `deriveTools()`（`parity` 反向机核）；`hooks.intercept... | ✅ 存在 |

## Feature 状态
| 字段 | 值 |
|------|-----|
| Feature ID | F-37 |
| Phase | 验证完成 (7/7) |
| Status | ✅ 已完成 |

## 上级目录
- [返回上级](../TREE.md)
- [返回首页](../../TREE.md)
