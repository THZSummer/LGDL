# Directory: .sddu/specs-tree-root/specs-tree-web-cli-plugin-v55-f-next-drive-accuracy/

## 目录简介
web-cli-plugin v5.5.4 / v0.11.4「next 驱动机制修正（AI 驱动 next 的准确落地）」需求规范 **（父收口完成：父 + 2 叶 validated / completed，2026-09-27）** —— 把 F-36 立住的原则（**next 交给 AI 驱动**）校正到正确机制：**产出机制换轨**（`next` 工具 / function calling 经基座 `hooks.intercept` 捕获 + 合成 `ToolResult` 短路 dispatch，围栏块口述结构性替换）+ **触发范围无条件**（`ai-led` 独立规则位，`NEXTSTEP_PRIORITY` 恰 4→5）+ **未配置确定性「去配置 LLM」引导 + 不显示自由输入** + **LLM 异常兜底链**（提醒补一次（有界）→ `llm.abnormal` 系统兜底推荐配置新 LLM）+ **保留 F-36 正确资产**（5 道校验链 / 判定分层 / `tierOf` / `aiNext` 加法字段 / 终端恒常驻 / R6）；父 = 轻量规范容器（不承接 build/review/validate），两叶 `specs-tree-nda-1-next-tool-channel`（20 任务 / `next` 工具通道 + 无条件触发 + 5 道校验链接入）→ `specs-tree-nda-2-fallback-and-gates`（21 任务 / 未配置引导 + 分相 + 提醒 + 异常兜底 + 门禁/体积重锚）硬串行；`npm test` 1507 → **1525/0** · `sidepanel.js` 604,602 → **606,652 B**（两叶 Σ +2,050）· 体积未升档 · X-NDA 终态 7/1/4；全 Feature 总账见 `closeout.md`。

## 目录结构
```
specs-tree-web-cli-plugin-v55-f-next-drive-accuracy/
├── TREE.md          # 本文件 - 目录导航
├── ADR-NDA-001-next-tool-channel-and-schema.md          # ADR-NDA-001: `next` 工具产出通道与注册面（schema 单源 + `deriveTools()` 接线 + `parity` 条目）
├── ADR-NDA-002-intercept-capture-and-synthetic-result.md          # ADR-NDA-002: `hooks.intercept` 捕获、合成 `ToolResult`、流面过滤与同回合多调用合并口径
├── ADR-NDA-003-unconditional-trigger-and-ai-led-rule-slot.md          # ADR-NDA-003: 触发无条件与 `ai-led` 独立规则位（`NEXTSTEP_PRIORITY` 恰 4→5 等价重锚 + 密度重锚）
├── ADR-NDA-004-fence-channel-replacement-and-gate-rewrite.md          # ADR-NDA-004: 围栏块通道替换与 `ai-next-candidate` 门禁改写（等价或更强）
├── ADR-NDA-005-configured-predicate-and-free-input-phasing.md          # ADR-NDA-005: `configured` 单源判据与自由输入分相（零新 ctx 字段 / 零第二偏好键）
├── ADR-NDA-006-nudge-once-bounded-and-ring-proof.md          # ADR-NDA-006: 提醒补一次 —— `chat` 回调内续呼 + `nudgeUsed` 有界 + 防环 + 零计数漂移
├── ADR-NDA-007-abnormal-closed-set-and-system-fallback.md          # ADR-NDA-007: LLM 异常判定闭集 + 系统兜底 `llm.abnormal` provider（复用 `op.llm-config`，词表分相）
├── ADR-NDA-008-volume-split-budget-and-escalation-path.md          # ADR-NDA-008: 体积分列预算与升档预案（A 距档 9,798 B / 2.8× 最坏 / EC-NDA-016 + 作者一行）
├── ADR-NDA-009-supersession-ledger-redlines-and-protected-segments.md          # ADR-NDA-009: 取代台账 `X-NDA-1~12`、零改基座硬红线与保护段逐段决策
├── closeout.md          # F-37 web-cli-plugin v0.11.4「next 驱动机制修正（AI 驱动 next 的准确落地）」——全 Feature 总账（父收口）
├── discovery.md          # 问题挖掘报告：specs-tree-web-cli-plugin-v55-f-next-drive-accuracy
├── plan.md          # 技术计划：specs-tree-web-cli-plugin-v55-f-next-drive-accuracy（web-cli-plugin v0.11.4「next 驱动机制的准确落地」；父 Feature 统领性技术方案）
├── spec.md          # Feature Specification：specs-tree-web-cli-plugin-v55-f-next-drive-accuracy（web-cli-plugin v5.5.4「next 驱动机制的准确落地：围栏块口述 → next 工具（function calling）+ 无条件触发 + 未配置确定性引导 + LLM 异常兜底链」）
├── state.json          # 状态文件 (✅ 已完成)
├── tasks.json          # 任务清单 (机器可读)
├── tasks.md          # 任务分解：specs-tree-web-cli-plugin-v55-f-next-drive-accuracy（web-cli-plugin v0.11.4「next 驱动机制的准确落地」；父 Feature 统领性任务总览）
├── specs-tree-nda-1-next-tool-channel/          # **终态（2026-09-27 父收口）：phase=validated / status=comp
└── specs-tree-nda-2-fallback-and-gates/          # **终态（2026-09-27 父收口）：phase=validated / status=comp
```

## 文件说明
| 文件 | 说明 | 状态 |
|------|------|------|
| ADR-NDA-001-next-tool-channel-and-schema.md | ADR-NDA-001: `next` 工具产出通道与注册面（schema 单源 + `deriveTools()` 接线 + `parity` 条目） — F-36 用「尾随 `next` 围栏块 + 严格 JSON + 正则解析」承载 LLM 的 next 产出（`ref-context.ts:52-59`... | ✅ 存在 |
| ADR-NDA-002-intercept-capture-and-synthetic-result.md | ADR-NDA-002: `hooks.intercept` 捕获、合成 `ToolResult`、流面过滤与同回合多调用合并口径 — 基座 agent 循环在**执行每个 toolCall 之前**问一道缝（`packages/web-cli-base/src/runner.ts`）： | ✅ 存在 |
| ADR-NDA-003-unconditional-trigger-and-ai-led-rule-slot.md | ADR-NDA-003: 触发无条件与 `ai-led` 独立规则位（`NEXTSTEP_PRIORITY` 恰 4→5 等价重锚 + 密度重锚） — 两件事被 F-36 绑在一起，但**只有一件**是真的： | ✅ 存在 |
| ADR-NDA-004-fence-channel-replacement-and-gate-rewrite.md | ADR-NDA-004: 围栏块通道替换与 `ai-next-candidate` 门禁改写（等价或更强） — F-36 的产出通道 = **文本尾随围栏块**：提示句 `NEXT_CONTRACT_GUIDANCE`（`ref-context.ts:52-59`）... | ✅ 存在 |
| ADR-NDA-005-configured-predicate-and-free-input-phasing.md | ADR-NDA-005: `configured` 单源判据与自由输入分相（零新 ctx 字段 / 零第二偏好键） — 作者口径②逐字：「自由输入在没有 LLM 的场景下，**是不可行的**，只能给**确定性操作**」。可行性事实：未配置提交走零 token 路径（`ser... | ✅ 存在 |
| ADR-NDA-006-nudge-once-bounded-and-ring-proof.md | ADR-NDA-006: 提醒补一次 —— `chat` 回调内续呼 + `nudgeUsed` 有界 + 防环 + 零计数漂移 — 作者口径①逐字：「对话结束如果 LLM **没有调用 next 工具**，记得你要**提醒 LLM**，做好最后兜底」。现状**完全没有**提醒机制： | ✅ 存在 |
| ADR-NDA-007-abnormal-closed-set-and-system-fallback.md | ADR-NDA-007: LLM 异常判定闭集 + 系统兜底 `llm.abnormal` provider（复用 `op.llm-config`，词表分相） — 作者口径①逐字：「如果 LLM **始终无法给你 next（LLM 坏了等情况）**，那就应该由**系统给出兜底的推荐，推荐用户配置新的 LLM 等操作**」。 | ✅ 存在 |
| ADR-NDA-008-volume-split-budget-and-escalation-path.md | ADR-NDA-008: 体积分列预算与升档预案（A 距档 9,798 B / 2.8× 最坏 / EC-NDA-016 + 作者一行） — A 列（`dist/sidepanel.js`）基线与档位**极紧**： | ✅ 存在 |
| ADR-NDA-009-supersession-ledger-redlines-and-protected-segments.md | ADR-NDA-009: 取代台账 `X-NDA-1~12`、零改基座硬红线与保护段逐段决策 — 本 Feature 是**机制级修正**，与 F-36（v0.11.3，父 + 两叶 `validated/completed`）构成「**并列新主题 +... | ✅ 存在 |
| closeout.md | F-37 web-cli-plugin v0.11.4「next 驱动机制修正（AI 驱动 next 的准确落地）」——全 Feature 总账（父收口） — 1. **next 的产出改用真正的工具调用（function calling）**：LLM 结题时通过一个**模型原生 `next` 工具**给出下一步... | ✅ 存在 |
| discovery.md | 问题挖掘报告：specs-tree-web-cli-plugin-v55-f-next-drive-accuracy — web-cli-plugin「**next 驱动机制的准确落地**」问题挖掘报告 —— F-36 已把「next 产出权交给 AI」立了法，但**机制做偏... | ✅ 存在 |
| plan.md | 技术计划：specs-tree-web-cli-plugin-v55-f-next-drive-accuracy（web-cli-plugin v0.11.4「next 驱动机制的准确落地」；父 Feature 统领性技术方案） — F-36 把「next 产出权交给 AI」的**原则**立住了，把**机制**做偏了四处（spec §1 逐字）：① 文本 `next` 围栏块口述 + ... | ✅ 存在 |
| spec.md | Feature Specification：specs-tree-web-cli-plugin-v55-f-next-drive-accuracy（web-cli-plugin v5.5.4「next 驱动机制的准确落地：围栏块口述 → next 工具（function calling）+ 无条件触发 + 未配置确定性引导 + LLM 异常兜底链」） — web-cli-plugin v5.5.4「**next 驱动机制的准确落地**」需求规范 —— F-36 已把「next 产出权交给 AI」的**原则*... | ✅ 存在 |
| state.json | 状态文件 | ✅ 已完成 |
| tasks.json | 任务清单（机器可读） | ✅ 存在 |
| tasks.md | 任务分解：specs-tree-web-cli-plugin-v55-f-next-drive-accuracy（web-cli-plugin v0.11.4「next 驱动机制的准确落地」；父 Feature 统领性任务总览） — `npm test` **≥1507**（`state.json#domainBaseline.npmTestCount = 1507`，**引自 F-3... | ✅ 存在 |

## Feature 状态
| 字段 | 值 |
|------|-----|
| Feature ID | F-37 |
| 版本位 | v0.11.4（= v0.11.0 / F-33 主题的 patch 级跟进轮） |
| Phase | 验证完成 (7/7) |
| Status | ✅ 已完成（父 = 轻量规范容器；phase=validated / status=completed；2 叶全部 validated / completed） |

## 上级目录
- [返回上级](../TREE.md)
- [返回首页](../../TREE.md)
