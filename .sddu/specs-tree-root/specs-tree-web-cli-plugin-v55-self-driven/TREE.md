# Directory: .sddu/specs-tree-root/specs-tree-web-cli-plugin-v55-self-driven/

## 目录简介
web-cli-plugin v5.5「self / ai-driven：让助手像助手」需求规范 —— 把作者主题（**没有配置 LLM 时由系统代码流程...

## 目录结构
```
specs-tree-web-cli-plugin-v55-self-driven/
├── TREE.md          # 本文件 - 目录导航
├── ADR-V55-001-driver-registry-timing-source.md          # ADR-V55-001: 驱动者 = 注册表 provider + 声明表（`drivers.ts`）；主流程 diff = 0 机核
├── ADR-V55-002-answered-timing-and-refaction-reanchor.md          # ADR-V55-002: `'answered'` 时机源扩张 + `ref-action` 抑制的**时机侧**等价重锚（X-SELF-2 读法①）
├── ADR-V55-003-driver-terminal-vocabulary-law7x.md          # ADR-V55-003: 驱动者终态词汇（法七扩展）+「必有下一个驱动者」三段控制门禁
├── ADR-V55-004-answer-driven-suspension.md          # ADR-V55-004: 答案驱动化（`applyRefAction` / `submitDescribe` / 迟到后台 ask）+ `commandSends` 消费面登记
├── ADR-V55-005-s0-self-driven-chain-machine.md          # ADR-V55-005: S0 全链机器化（样本单源 + node/Chromium 双面 + A/B 双分支分层）
├── ADR-V55-006-llm-configured-predicate-runchat-pregate.md          # ADR-V55-006: 配置探测判据（3 字段确定性组合）+ `runChat` 前置判据落 SW
├── ADR-V55-007-deterministic-onboarding-flow-resume.md          # ADR-V55-007: 确定性引导流（步骤单源）+ 悬置任务单源 + 配置完成自动续接
├── ADR-V55-008-op-three-tier-partition.md          # ADR-V55-008: op 三档清分的**派生式单源**（`tierOf`）+ 新 op 归档机核
├── ADR-V55-009-proactivity-guard-trio-and-killswitch.md          # ADR-V55-009: 护栏三件套（六常量单源）+ 关断 / 否决 + 载体零新增
├── ADR-V55-010-concurrency-arbitration.md          # ADR-V55-010: 并发仲裁（有界队列 1 + 明确告知 + 草稿恢复）与 SW / panel 分工
├── ADR-V55-011-volume-budget-and-tier-crossing.md          # ADR-V55-011: 体积预算（三叶分列 + 15% 缓冲）+ 跨档位**显式升档**预案
├── ADR-V55-012-supersession-ledger-and-leafs.md          # ADR-V55-012: X-SELF-1~7 取代台账 + 门禁等价重锚 + **每叶验收门禁清单** + 保护段与波次
├── discovery.md          # 问题挖掘报告：specs-tree-web-cli-plugin-v55-self-driven
├── plan.md          # 技术计划：specs-tree-web-cli-plugin-v55-self-driven（web-cli-plugin v5.5「self / ai-driven：让助手像助手」；父 Feature 统领性技术方案）
├── spec.md          # Feature Specification：specs-tree-web-cli-plugin-v55-self-driven（web-cli-plugin v5.5「self / ai-driven：让助手像助手」）
├── state.json          # 状态文件 (🟢 tracked [tasked])
├── tasks.json          # 任务清单 (机器可读)
├── tasks.md          # 任务分解：specs-tree-web-cli-plugin-v55-self-driven（web-cli-plugin v5.5「self / ai-driven：让助手像助手」；父 Feature 统领性任务总览）
├── specs-tree-v55-1-driver-layer/          # 本叶 = v5.5 的**首叶 / 底座叶**，交付「可以让『用户已表达意图』之后**有人接手**」
├── specs-tree-v55-2-deterministic-onboarding/          # 本叶 = v5.5 的**次叶**，交付作者主题① 的完整形态：**「没有配置 LLM 时：由系统代
└── specs-tree-v55-3-ai-driven-orchestration/          # 本叶 = v5.5 的**末叶 / 收口叶**，交付作者主题② 的完整形态：**「已配置 LLM 时
```

## 文件说明
| 文件 | 说明 | 状态 |
|------|------|------|
| ADR-V55-001-driver-registry-timing-source.md | ADR-V55-001: 驱动者 = 注册表 provider + 声明表（`drivers.ts`）；主流程 diff = 0 机核 — v5（F-32）已把「下一步**是什么**」做成管线强制保证，但「下一步**由谁按**」仍是用户： | ✅ 存在 |
| ADR-V55-002-answered-timing-and-refaction-reanchor.md | ADR-V55-002: `'answered'` 时机源扩张 + `ref-action` 抑制的**时机侧**等价重锚（X-SELF-2 读法①） — 1. `RecommendTrigger` = **恰 4 项**（`sidepanel.ts:1791`：`'pick'|'stale'|'idle'|... | ✅ 存在 |
| ADR-V55-003-driver-terminal-vocabulary-law7x.md | ADR-V55-003: 驱动者终态词汇（法七扩展）+「必有下一个驱动者」三段控制门禁 — 法七原形（v5）：5 类**阻塞终态**（`BLOCKED_TERMINALS` 恰 5，`definition.ts:34-41`）流内必有可达 nex... | ✅ 存在 |
| ADR-V55-004-answer-driven-suspension.md | ADR-V55-004: 答案驱动化（`applyRefAction` / `submitDescribe` / 迟到后台 ask）+ `commandSends` 消费面登记 — 三条「用户已表达的话」的结算路径，**全部**止于「记录」而**不产生驱动**（X-SELF-5 / X-SELF-6 / GAP-02/03/04）： | ✅ 存在 |
| ADR-V55-005-s0-self-driven-chain-machine.md | ADR-V55-005: S0 全链机器化（样本单源 + node/Chromium 双面 + A/B 双分支分层） — S0 = **本 Feature 的验收锚**，地位与 v5 之 S2 等价。真机 22:49（`platform.deepseek.com`）序列逐字： | ✅ 存在 |
| ADR-V55-006-llm-configured-predicate-runchat-pregate.md | ADR-V55-006: 配置探测判据（3 字段确定性组合）+ `runChat` 前置判据落 SW — 现状（R5 / B1 / B2 / B3）： | ✅ 存在 |
| ADR-V55-007-deterministic-onboarding-flow-resume.md | ADR-V55-007: 确定性引导流（步骤单源）+ 悬置任务单源 + 配置完成自动续接 — 作者主题① 逐字：**「没有配置 LLM 时：由系统代码流程驱动用户去配置 LLM」** ⇒ **零 LLM 调用、零 token、同输入同路径**。 | ✅ 存在 |
| ADR-V55-008-op-three-tier-partition.md | ADR-V55-008: op 三档清分的**派生式单源**（`tierOf`）+ 新 op 归档机核 — 「AI 可以主动发起哪些 op」**当前零清单**（Q-SELF-010）；而主动性一旦放开，最容易的越界就是「让 AI 顺手把授权也办了」 | ✅ 存在 |
| ADR-V55-009-proactivity-guard-trio-and-killswitch.md | ADR-V55-009: 护栏三件套（六常量单源）+ 关断 / 否决 + 载体零新增 — 主动性一旦成立，会引入**三个全新的成本 / 稳定性面**：**token 消耗**、**主动跨轮**、**自触发环**（Q-SELF-013 / R-S... | ✅ 存在 |
| ADR-V55-010-concurrency-arbitration.md | ADR-V55-010: 并发仲裁（有界队列 1 + 明确告知 + 草稿恢复）与 SW / panel 分工 — 现状（R3 / C5 / X-SELF-7）：`chatBusy` 单飞（`service-worker.ts:879-885`）—— 并发第二条**被丢... | ✅ 存在 |
| ADR-V55-011-volume-budget-and-tier-crossing.md | ADR-V55-011: 体积预算（三叶分列 + 15% 缓冲）+ 跨档位**显式升档**预案 — ⇒ **预算低估约 2 倍**，导致 v5-2 R1 **越档位**、必须由编排器裁决**显式升档**（512,000 → 563,200；绝对上限 → ... | ✅ 存在 |
| ADR-V55-012-supersession-ledger-and-leafs.md | ADR-V55-012: X-SELF-1~7 取代台账 + 门禁等价重锚 + **每叶验收门禁清单** + 保护段与波次 — 本 Feature 触碰 7 条被门禁**逐字钉住**的既有红线（X-SELF-1~7），且新增 ≥6 个门禁。spec 纪律（FR-SELF-107 /... | ✅ 存在 |
| discovery.md | 问题挖掘报告：specs-tree-web-cli-plugin-v55-self-driven — web-cli-plugin v5.5「self / ai-driven：让助手像助手」问题挖掘报告 —— 把作者主题（**没有配置 LLM 时由系统代码... | ✅ 存在 |
| plan.md | 技术计划：specs-tree-web-cli-plugin-v55-self-driven（web-cli-plugin v5.5「self / ai-driven：让助手像助手」；父 Feature 统领性技术方案） — v5（F-32）已把「下一步**是什么**」做成管线强制保证（`BLOCKED_TERMINALS` 恰 5 + 死端守护门禁 + S2 十环节全链）；但... | ✅ 存在 |
| spec.md | Feature Specification：specs-tree-web-cli-plugin-v55-self-driven（web-cli-plugin v5.5「self / ai-driven：让助手像助手」） — web-cli-plugin v5.5「self / ai-driven：让助手像助手」需求规范 —— 把作者主题（**没有配置 LLM 时由系统代码流程... | ✅ 存在 |
| state.json | 状态文件 | 🟢 tracked [tasked] |
| tasks.json | 任务清单（机器可读） | ✅ 存在 |
| tasks.md | 任务分解：specs-tree-web-cli-plugin-v55-self-driven（web-cli-plugin v5.5「self / ai-driven：让助手像助手」；父 Feature 统领性任务总览） — `npm test` 1181 · `law8` 25 · `dead-end` 39 · `auth-chip` 37 · `l0` 248 · `de... | ✅ 存在 |

## Feature 状态
| 字段 | 值 |
|------|-----|
| Feature ID | N/A |
| Phase | 任务分解 (4/7) |
| Status | 🟢 tracked [tasked] |

## 上级目录
- [返回上级](../TREE.md)
- [返回首页](../../TREE.md)
