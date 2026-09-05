# 验证策略：specs-tree-web-cli-base-framework（web-cli-base 框架化：CommandRouter 路由下沉 + domain-neutral 能力归属）

> **文档定位**: SDDU 验证策略 — 指导 validate Agent 执行自主验证的场景和方法；验证结果见 validate-report.md
> **前置依赖**: spec.md（24 FR 五组 / 8 NFR / 12 EC / AC-001~012 + D-001~D-006）、plan.md（技术方案 + ADR-001~004 + 文件影响面）、review.md（C1~C28 + O1~O6）、review-report.md（⚠️ 有条件通过：28/28 PASS、阻塞 0、改进 4（IMP-1~4））
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-05
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-05
> **更新说明**: 初始创建 — 基于 spec AC-001~012 + plan ADR-001~004 + review C1~C28 结论 + review 改进 4 项（IMP-1/2/4 前置处理、IMP-3 记遗留），自主定义 V1~V12 验证场景（代码类 Feature 全维度：测试覆盖 + 接口数据 + 构建 + 性能边界 + 漂移检测）

## 1. 验证概要

| 维度 | 数值 |
|------|:--:|
| 验证对象 | 4 改动包（web-cli-base / lgdl-web-cli / lgdl-web-op-cli / lgdl-web）+ 全仓 9 包回归 |
| 验证场景 | V1~V12（五维度：测试覆盖 / 接口数据 / 构建 / 性能边界 / 漂移检测交叉覆盖） |
| 验证基线 | git 工作区当前状态（build 产物，全部未提交）+ spec.md 2026-09-05 v1.0 + review-report.md v1.0 |
| 动态验证 | 全仓 npm test 真实执行 + 4 包 tsc --noEmit + lgdl-web vite build + 专项脚本（DelayGate/deriveTools/闭环冒烟/零 schema 请求 wire 断言） |
| Feature 类型 | 代码类（全维度验证） |
| 前置条件 | ✅ review-report.md 状态 = ⚠️ 有条件通过（阻塞 0；IMP-1/IMP-2/IMP-4 前置处理见 §2，IMP-3 记录遗留） |

## 2. review 改进项前置处理（IMP-1~4）

> 作者指令：IMP-1/IMP-2 若可在不破坏门禁前提下顺手处理则处理并记录，否则记录为遗留；IMP-3/IMP-4 在报告中注明是否处理。以下为 validate 阶段的处理决策（执行结果见 validate-report.md V12 + §4 脚本记录）。

| # | 改进项（review-report §5 记录） | 严重度 | validate 处理决策 |
|---|------------------------------|:--:|------------------|
| IMP-1 | provider.ts:252 + llm.ts:85/:170：chat 空 tools 仍发 `tools: []` 字段 → 个别 OpenAI 兼容网关可能报错；与 provider.ts:237「testConnection 零 schema 请求（R-011）」文档意图不符 | 低（兼容风险） | ✅ 顺手处理：llm.ts 两协议路径（Anthropic/OpenAI 兼容）tools 为空时**省略 tools 字段**（不改型 LlmConfig 可选语义——config.tools 保持必传数组，仅 wire 层条件化）；用本地 mock 端点动态断言 wire 格式（无 tools 字段 / 有 tools 时携带），验证零 schema 请求意图达成 |
| IMP-2 | runner.ts:153-164：hooks.intercept/onToolDone（场景注入，AiPanel next-actions JSON.parse、onApply 写回）或自定义 dispatch 抛异常可穿透 run() → onFinish 不触发（lgdl-web pending 卡死面） | 低 | ✅ 顺手处理：runner per-tool 循环 try/catch（intercept/dispatch 异常转 ok:false + 稳定文案，复用 router EC-012 风格；onToolDone 异常吞掉不阻断）+ runner.test 增补 2 例专项（异常设防/不炸循环/onFinish 必达） |
| IMP-3 | spec.md FR-014/EC-005 字面「完成时刻」vs delay.ts:49-55 实现「执行起点」措辞漂移（O1 复核确认为合法实现口径，非行为偏差） | 低（文档） | ⏭️ 记录为遗留：属 spec 收口措辞对齐，非代码问题；validate 以验收式（起点间隔 = max(delayMs, 执行耗时)）实测确认行为正确（V6），spec 措辞更新移交整体收口 |
| IMP-4 | router.ts:114-119：构造传 NaN（typeof number 非有限值）→ clampDelayMs(NaN)=0 但 `clamped !== rawDelay`（NaN≠0）→ 触发「delayMs=NaN 超出合法域」语义含糊警告噪音 | 低 | ✅ 顺手处理：告警条件加 `Number.isFinite(rawDelay)` —— NaN/±Infinity 走静默关闭分支（与 delay.ts clampDelayMs 注释「NaN/非数字→0」语义对齐），有限值超界仍钳制+警告一次（EC-009 行为不变） |

## 3. 自主验证场景（V1~VN）

**验证对象来源**：
- `spec.md`：AC-001~012（总体验收）+ FR-001~024（五组 RTR/UPL/DLY/REG/IN）+ NFR-001~008 + EC-001~012 + D-001~D-006
- `plan.md`：ADR-001~004 + §2.3~2.8 设计契约 + §4.2 测试策略（D-005 增删有据）
- `review-report.md`：C1~C28 静态结论（28 PASS）+ O1~O6 口径复核 + IMP-1~4
- 构建产物代码实况：4 包 src + test + package.json

**Feature 类型自适应**：代码类 Feature → 全五维度验证（§5.1 测试覆盖 + §5.2 接口数据 + §5.3 构建 + §5.4 性能边界 + §5.5 漂移检测）。性能维度说明：本 Feature NFR 无数值型性能指标（无并发/响应时间/吞吐阈值），NFR-006 为语义性要求（delayMs=0 零等待、派生幂等）→ 由 delay.test 零开销用例 + 幂等断言 + V6 时钟注入脚本承接；无法在无浏览器/无 API Key 环境执行的动态项显式标注 ⏭️（真实 AI 实战闭环，见 V10 说明）。

| # | 验证对象 | 验证步骤 | 预期结果 | 验证维度 | 验证方法 |
|---|---------|---------|---------|:--:|:--:|
| V1 | AC-009/NFR-005 全仓测试门禁 | ① `npm test`（root → 9 workspace 依序真实执行）逐包汇总；② 记录各包 tests/pass/fail | 9 包 0 失败（lgdl-render 1 env-skip 为既有 LGDL_MATRIX_B11 门控，与本次无关）；总数与 build.md 581 基线核对 | 测试覆盖 | npm test（真实执行） |
| V2 | NFR-007/AC-010 类型完整性 | ① `npx tsc --noEmit -p` × 4 改动包（web-cli-base / lgdl-web-cli / lgdl-web-op-cli / lgdl-web） | 4 包退出码 0、零错误 | 构建 | tsc --noEmit |
| V3 | NFR-007/AC-010 lgdl-web 场景构建 | ① `npm run build --workspace @lgdl/lgdl-web`（vite build） | 退出码 0、dist 产物生成（chunk 体积/外部化 warning 为既有提示非错误） | 构建 | vite build |
| V4 | AC-009 base 新机制专项测试（router/delay/runner/sleep） | ① `npm test --workspace @lgdl/web-cli-base`；② 逐文件抽核 router.test / delay.test / runner.test / sleep.test 通过数与关键断言 | 全绿；router.test ≥13 / delay.test 10 / runner.test ≥11 / sleep.test ≥12（实测数记录于报告）；专项覆盖 FR-001~006/009/010/013~017/020/021/EC-001~005/009~012 | 测试覆盖 | node --test 逐文件计数 |
| V5 | AC-009/AC-006/AC-007 业务注册 + 场景组装专项（tool-entry ×2 / session） | ① lgdl-web-cli `tool-entry.test.ts`（5 例）；② lgdl-web-op-cli `tool-entry.test.ts`（4 例）；③ lgdl-web `session.test.ts`（9 例，派生顺序/delay 600/web-fetch 承接/help 一览） | 3 包全绿；session.test:41-47 断言派生顺序=[lgdl-web-cli,lgdl-web-op-cli,web-fetch,sleep,web-cli-help]（AC-006）；tool-entry 断言 schema/executor/next-actions 不特判 | 测试覆盖 | node --test 逐文件 |
| V6 | AC-005/FR-013~017/EC-005/EC-009 DelayGate 最小间隔语义动态验证 | 脚本（fake clock 注入真实编译产物 delay.ts/router.ts）：① 首分发不等待；② 连续两命令起点间隔 = max(delayMs, 执行耗时)（含慢命令执行耗时 > delayMs 场景）；③ 模拟 sleep delayMs:0 长等待 3000 后不追加；④ sleep 短 200 补齐至 600（追加 400）；⑤ 未注册名不经 gate；⑥ 非法值钳制 [0,5000]+一次警告；⑦ stats/onDelay 观测；⑧ 默认 0 零等待 | 全部断言通过；与 spec FR-014 验收式（间隔=max(delayMs,执行耗时)）、EC-005 两场景、EC-009 一致（O1「执行起点」口径复核为合法实现选择，非偏差） | 性能边界 | 自主脚本（/tmp）+ 引用 delay.test/router.test 既有断言 |
| V7 | AC-006/FR-005/FR-008 schema 派生顺序 + AC-003 单一数据源四链 + EC-010 help | 脚本：① 真实组装 lgdl-web session（createAiSession + 真实 lgdl-web-cli/op-cli tool-entry + 内建 3）断言 deriveTools 顺序 = 旧 provider.test:191 等价 + 幂等；② 空业务 router（仅内建）派生/冒烟（AC-001/EC-004）；③ 注册假工具一处 → schema/help/dispatch/前缀四链可见（AC-003）；④ web-cli-help dispatch 一览（4 工具）/详情/未知工具文案（EC-010） | 断言通过；deriveTools 顺序与旧 provider.test:191（业务 2 + 内建 3）等价 | 接口数据 | 自主脚本 + router.test/session.test 既有断言 |
| V8 | NFR-001/008/FR-012/AC-001/011/012 中性纯度 grep 门禁 | ① base/src grep `react` import（router/delay/runner 专项 + 全 src）；② base grep `@lgdl/` import；③ base grep README-CLI/lgdl/web/workbench 残留文案；④ lgdl-web/src grep 删除面（toolCallToCommand / buildTools / opRegistry.execute / parseSleepCommand 特判 / HelpAggregator / ai/lgdl-web / 深导入 `@lgdl/lgdl-web-cli/lgdl`）；⑤ 全仓 grep help-aggregator/lgdl-web.test 源码残留 | 全部 CLEAN（零命中，文档化注释除外） | 漂移检测 | grep 脚本 |
| V9 | AC-007/NFR-003/FR-022/023 场景收敛（AiPanel/App 同批原子 TASK-011） | ① 读 AiPanel.tsx：无 tc.name 分发/前缀映射/sleep 特判/help 聚合器/深导入——经 session.runAgent 驱动（events→appendMessage、hooks→intercept next-actions + onToolDone onApply）；② 读 App.tsx：aiSession useMemo 单一组装点 + opRegistry 19 handler 注入 createOpCliToolEntry + sourceRef/aiSettingsRef 间接；③ git status 核对 AiPanel/App 同批（工作区同次变更）；④ lgdl-web 渲染面保留（web-cli 命令块/胶囊/pre 工具输出/guideDoc/pending） | 分发面删除零残留；组装点单一可指认；渲染保留面在 | 漂移检测 | read + grep + git status |
| V10 | AC-008/FR-006/024/EC-006/007 runner 驱动闭环行为等价（机械面冒烟） | 脚本：真实 createAiSession（真实 lgdl-web-cli 工具 + 注册 copy-source 的 op registry + 真实 router delay 600）经 runAgent 跑脚本化 LLM 两轮：第 1 轮 assistant 文本 + 工具调用（mutation add-node）→ 断言 ① 事件序列 assistantText→commandLine→toolOutput→…→finish；② 第 2 轮 turns 含 tool 结果按 toolCallId 回填 + changed/source 经 onToolDone 回调 + run-local source 推进；③ 单工具失败（未注册名 dispatch）→ 失败聚合 + 纠正 user turn 不吞后续（EC-006/007） | 断言通过；消息事件流与 runner.test 既有期望一致（机械闭环行为等价） | 接口数据 | 自主脚本（/tmp，真实编译产物） |
| V11 | NFR-005/AC-009 D-005 测试增删合法性 | ① git status 核对删除面 4 文件（base+lgdl-web help-aggregator ×2 / lgdl-web.ts / lgdl-web.test.ts）；② provider.test.ts 无 buildTools 顺序用例（grep + 读文件 D-005 注释）；③ 承接落点存在：session.test 派生顺序断言 + web-fetch dispatch 2 例（data URL 成功/缺 path）；④ lgdl-web/package.json test 列表与文件实况一致 | 删除有据、承接等价（同一 executeWebFetch 路径）、列表一致 | 漂移检测 | git status + read + grep |
| V12 | review IMP-1/2/4 处理确认 + 门禁复核 | ① IMP-1：本地 mock OpenAI 兼容端点 + Anthropic 端点动态断言 wire 格式（tools 空 → 请求体无 tools 字段；有 tools → 携带），零外部凭证；② IMP-2：runner.test 增补 2 例专项通过；③ IMP-4：NaN/Infinity 静默、有限值超界钳制+一次警告（router.test EC-009 不回退）；④ IMP-3 记录遗留；⑤ 处理后 4 包 tsc + base/lgdl-web 测试重跑全绿（不破坏门禁） | 修复生效、门禁不破、遗留项明示 | 测试覆盖 + 接口数据 | 自主脚本（mock 端点）+ npm test + tsc |

> **无法执行项说明（⏭️ 预备标注）**：① AC-008「真实 AI 实战闭环」（浏览器 AI 会话 + 真实模型 + 用户可感知消息流对比）需 lgdl-web UI 环境 + 厂商 API Key——validate 无浏览器/无凭证，机械面闭环由 V10 脚本承接、真实闭环移交整体收口人工清单（review §7 同口径）；② IMP-1「testConnection 各厂商端点实测」需真实厂商凭证——以本地 mock 端点 wire 断言 + 代码路径核验承接，真实端点实测移交收口人工清单。

## 4. 测试覆盖预期矩阵

### 4.1 功能需求 (FR) — 覆盖率目标 100%（24/24）

| 需求 ID | spec 描述 | 验证场景 | 覆盖率 |
|---------|----------|:--:|:--:|
| FR-001 | 统一工具注册模型（ToolEntry 单一数据源） | V4, V7 | 已覆盖 |
| FR-002 | 统一分发执行契约（dispatch→ToolResult+changed/source） | V4, V7 | 已覆盖 |
| FR-003 | 未知工具名显式报错（去静默兜底） | V4, V7 | 已覆盖 |
| FR-004 | 注册表自举查询（has/names/derive*/listHelp/helpFor） | V4, V7 | 已覆盖 |
| FR-005 | deriveTools 顺序契约（业务注册序 + 内建置末） | V4, V5, V7 | 已覆盖 |
| FR-006 | 中性 agent 循环上收 base（AgentRunner） | V4, V10 | 已覆盖 |
| FR-007 | deriveCommand 前缀派生（去兜底） | V4 | 已覆盖 |
| FR-008 | schema 收集/组装下沉（provider→router 派生） | V2, V5, V7 | 已覆盖 |
| FR-009 | sleep function-calling 原生接入（executeSleepFromArgs） | V4 | 已覆盖 |
| FR-010 | help 聚合注册即得（listHelp/helpFor） | V4, V5, V7 | 已覆盖 |
| FR-011 | 死接线收敛（lgdl-web.ts 删除） | V8, V11 | 已覆盖 |
| FR-012 | base 文案 LGDL 残留清理 | V8 | 已覆盖 |
| FR-013 | delay 统一挂点（dispatch 入口跨全部工具） | V4, V6 | 已覆盖 |
| FR-014 | 最小间隔语义（=max(delayMs, 执行耗时)）+ sleep 不叠加 | V4, V6 | 已覆盖 |
| FR-015 | delayMs 配置与默认（base 0 / 场景 600 / 钳制 5000） | V5, V6 | 已覆盖 |
| FR-016 | 单工具声明免除/覆盖（sleep delayMs:0） | V4, V6 | 已覆盖 |
| FR-017 | sleep 保留分工 + delay 静默 + 观测（stats/onDelay/时钟） | V4, V6 | 已覆盖 |
| FR-018 | lgdl-web-cli 整体注册为一个工具 | V5, V10 | 已覆盖 |
| FR-019 | lgdl-web-op-cli 注册接入（OpHandlerRegistry 角色移交） | V5, V9, V10 | 已覆盖 |
| FR-020 | 内建命令自动注册（3 内建一次登记四得） | V4, V7 | 已覆盖 |
| FR-021 | 唯一工具名集合（注册表外无第二维护处） | V4, V8 | 已覆盖 |
| FR-022 | lgdl-web 单一路径组装（session.ts） | V5, V9 | 已覆盖 |
| FR-023 | AiPanel 分发/特判面删除 | V8, V9 | 已覆盖 |
| FR-024 | AI 闭环用户可感知行为等价 | V10（机械面）；真实闭环 ⏭️ 移交收口 | 部分覆盖（机械面） |

### 4.2 非功能需求 (NFR) — 覆盖率目标 100%（8/8）

| 需求 ID | spec 描述 | 验证场景 | 覆盖率 |
|---------|----------|:--:|:--:|
| NFR-001 | base 零 LGDL 依赖/文案 | V8 | 已覆盖 |
| NFR-002 | 依赖方向（业务→base 单向无环） | V2, V8 | 已覆盖 |
| NFR-003 | 破坏性重构边界（删除面零残留） | V8, V9 | 已覆盖 |
| NFR-004 | 单一数据源（五元信息无第二维护处） | V4, V7 | 已覆盖 |
| NFR-005 | 测试门禁（D-005 等价/更优 + 全绿） | V1, V11 | 已覆盖 |
| NFR-006 | 性能（delayMs=0 零开销；派生幂等） | V4, V6 | 已覆盖（语义性，无数值阈值） |
| NFR-007 | 类型与构建完整性 | V2, V3 | 已覆盖 |
| NFR-008 | runner 环境无关（零 react import） | V4, V8 | 已覆盖 |

## 5. 验证执行说明

- **验证方式**：全仓/逐包测试真实执行 + tsc/vite 构建真实执行 + 自主脚本（fake clock / 真实组装 / mock 端点）动态验证 + 静态 read/grep/git 核验。
- **验证脚本（ADR-003）**：自主编写，存放于 `/tmp/sddu-validate-specs-tree-web-cli-base-framework-<timestamp>/`，报告 §4 逐项记录（文件名/用途/对应场景/退出码/关键输出）。
- **结论标准**（§6）：FR 覆盖率 100%、NFR 覆盖率 ≥80%、构建退出码 0、漂移 0、阻塞 0 → ✅ 通过；非阻塞遗留（IMP-3 等文档项）→ ⚠️ 有条件通过；否则 ❌ 不通过。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：基于 spec AC-001~012 + plan ADR-001~004 + review C1~C28/IMP-1~4 定义 V1~V12 场景矩阵（测试覆盖 4 / 接口数据 2 / 构建 2 / 性能边界 1 / 漂移检测 3 交叉覆盖）；IMP-1/2/4 前置处理决策记录入 §2（IMP-3 记遗留）；性能维度说明（语义性 NFR 无数值阈值）；真实 AI 闭环/testConnection 真实端点 ⏭️ 移交收口人工清单 | 2026-09-05 | SDDU Validate Agent |
