# 审查报告：specs-tree-v5-2-ops-first-batch（V5-2 首批 9 op 落地 + SW 执行器 + 断流首验收）

> **文档定位**: SDDU 审查报告 — 逐项记录自主审查的执行结果，作为 validate 阶段的输入
> **审查策略**: `review.md`（C1~C58 自主清单 + 四维度锚点 + 本轮方法学）
> **前置依赖**: `spec.md`（本叶 34 条 FR 切片）/ `plan.md`（ADR-V5-002/003/004/005 + 父 ADR-V5-001~012）/ `build.md`（R1+R2）/ 上游叶 v5-1 `build.md §6·§8`（承接项）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-22
> **审查轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-22
> **更新说明**: 初始创建（静态审查 R1，审查对象 = HEAD `245e0a2` / 分支 `feature/web-cli-plugin`；本叶 30/30 任务、`phase=builded`）

---

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查项总数 | 58（C1~C58） |
| 通过 | 29 |
| 警告 | 22 |
| 失败 | 7 |
| 阻塞问题 | **3** |
| 独立复跑门禁 | 8 项（全部实跑，日志 `/tmp/opencode/v5-2-review/logs/`） |
| 红线复核 | `content.js` 177,076 B / `52a82620…`；`pick-layer.js` 33,900 B / `5f567d7e…`（独立复算命中） |

**结论摘要**：功能面与红线面大面积达标（9 op 注册、SW type-only 通路、X1/X2 等价重锚、settings 收编机制、S2 seam 判据、体积五要素与档位登记均在位）；但**「收编后的执行体在非 chat 面不可达/失败态语义不落地」**两类缺陷可复现，直接落空 FR-042 / 044 / 075 / 076 / EC-ALLN-011 与 NFR-ALLN-010，故判 **❌ 不通过**。

## 2. 逐项审查结果（C1~C58）

| # | 审查对象 | 审查基准 | 评估 | 发现 | 严重程度 |
|---|---------|---------|:--:|------|:--:|
| C1 | 命名/可读性/纯数据职责（`op-table.ts` 107 行 / `ops.ts` 375 行 / `pipeline.ts` 214 行 / `snapshot.ts` 84 行） | 项目宪法 | ✅ | 单源派生链清晰：`OP_DESCRIPTORS` → `OPS_BY_ID` / `SW_OPS`；无 chrome/DOM 泄漏进纯数据模块 | 低 |
| C2 | 函数职责单一（派生表、单源） | plan §2.4 / NFR-ALLN-004 | ✅ | `OP_PARAM_SEQUENCE` / `OP_CALLSITE_SET` / `REACHABLE` 均单点声明；`sw-op-mirror` ②复跑绿（9 行恰一处） | 低 |
| C3 | 错误处理与失败语义（`ok:false` / 回滚触发） | FR-042/043/044 · EC-ALLN-011 · ADR-V5-002 §1 | ❌ | **探针实测**：`runOp` 对 `execute`/`execSw` 返回 `{ok:false}` 仍以 `settle(op,'completed')` 收口（写成功回执）；非抛错失败**回滚 0 次**（期望 1）；`buildOp` 的 `(run?.(ctx), OK)` 把面板执行体的 `OpOutcome` 丢弃 ⇒ 失败一律升为成功 | **阻塞** |
| C4 | 无硬编码（文案/参数序列单源） | FR-047 · ADR-V5-002 §2 | ✅ | `ASK_COPY` / `opReceiptText` / `reachableOpIds`（由 `when(ctx)` 派生）均单源；`OP_PARAM_SEQUENCE` 无第二份列表 | 低 |
| C5 | 无冗余逻辑/死代码 | NFR-ALLN-004 | ⚠️ | `settings/ops.ts` 仍保留 4 类的原生实现分支（`:254/:265/:287/:314` `store.*`、`:423 removeCapabilityPermission`、`:478 auto-auth clear`）；`sidepanel.ts#collectOpParams` 的 `op.describe` 分支因 `params:null` 不可达；`ops.ts#SW_LAYER_REFUSAL` 对 sw op 不可达（pipeline 走 `execSw`） | 中 |
| C6 | 注释与实现一致 | FR-048 · FR-043 | ⚠️ | `ops.ts:31` 注释称「本文件恰含 1 处 `requestTurn(`」，实测该文件 **0 处调用**（仅注释）；`op-protocol.ts:73-77` 称「SW 拒绝不在册 permission」，SW 侧只校验「非空字符串」；`sw-op-mirror` SW-M④ 文案「执行体未落地（v5-2 R2 补）」已陈旧 | 中 |
| C7 | `op.authorize` 五要素 + SW 裁决/手势两段握手 | FR-040 / FR-065/066 | ✅ | risk=low / params 无 / consent 必需（后果预演文案）/ layer=sw / receipt「✓ 授权已生效」；`authorizeOrigin` 单例被 legacy 与 op 共用 | 低 |
| C8 | `op.rebind` 无 params/consent + 复用 `#rebind` + 零 requestTurn | FR-041 | ✅ | `IMPL['op.rebind']` params/consent 皆 null；`rebindCurrentTab` 恰 1 调用点（OP-W①复跑绿） | 低 |
| C9 | `op.llm-config` 三参数流转 + 掩码写存储 + 失败回滚 | FR-042 / AC-ALLN-007 | ❌ | **探针实测**：`dispatchOp('op.llm-config', {value:'{"providerId":…}'}, 'settings'/'options')` 实际以 `PANEL.llmConfig(undefined)` 调用（IMPL row 为零参箭头 `ops.ts:289`）⇒ **表单值不落存储**，且回执 `{"ok":true}` +「✓ 已配置 LLM（掩码 · 零明文）」= 假成功。settings 面还会误走「连接测试」分支并吞掉 `{ok:false}` | **阻塞** |
| C10 | `op.perm.request` form 多选 + 双固化 + 快照回滚 + 在册校验 | FR-043 / FR-110 | ⚠️ | form 选项与 `OPTIONAL_CAPABILITIES` 同源（X1 复跑绿）+ 「回收须你在浏览器确认」如实文案 + `unregisteredCapabilityIds` 在册校验在位；但**用户拒绝后** pipeline 仍写「✓ 已处理浏览器权限申请」成功回执（C3/B-02），且 SW 侧 `deps.auditCapability` 未接线 | 高 |
| C11 | `op.revoke` 三目标 + 不可逆确认 + 审计入口 + 三表回滚 | FR-044 / AC-ALLN-011 | ❌ | 三目标/不可逆文案/审计入口文案在位；但 **探针实测**：panel 执行体返回 `{ok:false}`（如 `permission-still-held`）→ `runOp` 返回 `{ok:true}` + 写「✓ 已撤销（不可逆）」（假回执），且**不触发回滚**；`revokeTarget` 多能力循环中途失败即 `return`，遗留跨表半完成态 | **阻塞** |
| C12 | `op.pick` 复用单一入口 + 取消/超时恢复 | FR-045 / EC-ALLN-005 | ✅ | `PANEL.pick` → `pickInput.requestPick`（OP-W① 登记 3 处调用点，与实现一致）；EC-005 错误卡恢复在 pipeline `errorWithRecovery` | 低 |
| C13 | `op.describe` `params` 五要素齐备 | FR-046 / AC-ALLN-007 | ⚠️ | **探针实测** `OPS_BY_ID['op.describe'].params === undefined`；文本采集由既有 `#ask-fallback` 卡承担（功能闭环），但声明式 `params`（FR-046 字面「params = 描述文本」）未落地 —— 已登记 + 裁决②（维持单所有者） | 中 |
| C14 | `op.help` 由 `when(ctx)` 派生（禁硬编码） | FR-047 | ✅ | `reachableOpIds` 每次调用遍历 `resolveOrder()`；S2 探针读数与推荐候选同源 | 低 |
| C15 | `op.turn` 唯一 `requestTurn`（其余 8 op 零） | FR-048 · N22/N25 | ✅ | 独立 `grep -n "requestTurn(" src/**`：声明 1（`sidepanel.ts:275`）+ 调用 2（`:3174` composer 提交 / `:3198` op 槽），其余 8 op 槽零；OP-W③ 复跑绿 | 低 |
| C16 | 会话/分组 `deferred` 登记 + 首批恰 9 op | FR-049 | ✅ | 父 `state.json#pendingObligations.PO-ALLN-001`（`deferred` + trigger + decidedBy）；`OP_DESCRIPTORS.length === 9`（第 10 项不存在） | 低 |
| C17 | 拒绝非死端（consent 拒/权限拒/ask 取消 → 固化 + 可达 next） | FR-014 · EC-006/008 | ⚠️ | `settle` 在 `cancelled`/`rejected` 写事实行并 `panelReachableNext`（S2 gate ④复跑绿）；但同一次失败还伴随 C3 的成功回执 ⇒ 固化语义自相矛盾（用户同时看到「已拒绝」与「✓ …已完成」） | 高 |
| C18 | S2 断流首验收（死端 = 0 / 5 类阻塞驱动真实性 / ✖ 行不裸奔） | FR-016 · AC-ALLN-001 | ⚠️ | 独立复跑 fixture：`deadEnds = 0`、5 类读数齐、✖ 行存在 `act='next'` 且 opId 已注册、反证可红；**但** `blockedStateCtx('perm.missing') === recoveredCtx()`（无权限事实源）⇒ 该类未被真实驱动；「10 环节逐环节可判」未机核（仅 6 条读数）；「5 类逐类可达 next」未逐类断言（全局 ≥1）；headless 10 环节全链归 v5-3（见 I-04/I-05） | 高 |
| C19 | 掩码卡唯一入口（`type=password`/`data-secret`，单一构造） | FR-020 | ✅ | `cards/askuser.ts:269-273` 复用同一 input/submit/cancel triad，`data-secret="true"` + `aria-label`；卡内可点 3（≤6）；全仓无第二处敏感值流内入口 | 低 |
| C20 | 值直达 key-store（值入存储调用点恰一处） | FR-021 · ADR-V5-010 §1 | ⚠️ | 唯一 `keyStore.save(` 在 `sidepanel.ts:1273#writeCredentials`；`submitSecret`（`:1281-1295`）携带用户值且只 `dispatch` 事实（`maskedLength`）。与 ADR 字面「submitSecret 内的 keyStore.save」不符（多一层 `writeCredentials` 共享给回滚/撤销），已登记（build R1 §6.2-⑧） | 低 |
| C21 | 流内只留事实（{opId, ts, maskedLength, result}，digest `••••••`） | FR-022 · ADR-V5-010 §2 | ⚠️ | `sidepanel.ts:1293` `maskedLength: secret.length` = **原始长度**入流内 payload/state；渲染层已类别化（`askuser.ts:118-120` → `8+`/`8-`，`ASK_COPY.secretWritten` 注释称「{n} 是类别」），但 ADR-V5-010 §2 要求「只以**长度类别**落固化区，不落原始长度」——payload 未类别化 | 中 |
| C22 | 双层执行器（layer 显式） | FR-065 | ✅ | `op-table.ts:79-89` 9 行 `layer`；`buildOp` 从 descriptor 取 layer（无第二份字面量） | 低 |
| C23 | 特权 op 恰 2 + 手势路径语义保留 | FR-066 | ✅ | `SW_OP_DESCRIPTORS.length === 2`（复跑绿）；SW `\.request\s*\(` **0 命中**；面板 `requestCapabilityPermissionOnGesture` 恰 1 调用点（在手势链内） | 低 |
| C24 | `op-*` type-only（`KIND_SET` 零新增 + `content.js` 逐字节） | FR-067/111 | ✅ | `KIND_SET` 逐字扫描 = 40 项、`'op-` 字面量 **0**；`dist/content.js` 177,076 B / sha `52a82620…` 命中；`op-protocol` OP-P①/③/④ 复跑绿（反证 +53 B） | 低 |
| C25 | SW 侧镜像契约 {id,mode,fail,audit} 同源 | FR-068 | ✅ | `SW_OPS` 由 `OP_DESCRIPTORS.filter(layer==='sw')` 派生、字段集恰 `{mode,fail,audit}`；「恰一处声明」扫描绿；SW-M③ 漂移反证可红 | 低 |
| C26 | 红线逐字节（content/pick-layer + `src/content/**` 零 diff） | FR-069 · AC-ALLN-022 | ✅ | 独立复算命中（见 §1）；`git diff 8526ef8 -- src/content` 空 | 低 |
| C27 | settings/options 4 类收编为 op 单一执行入口（零双路径） | FR-075/076 | ❌ | 三面均注入了 `dispatchOp`（`settings`/`options`/`panel`），但**执行体随面不同而缺失**：options.html 未 `bindPanelOps` ⇒ `PANEL={}`，`op.llm-config`/`op.revoke(auto-auth)` 返回 `{"ok":true}` 而**零副作用**（探针 B/D）；settings 面 llm-config 见 C9。另 `settings/ops.ts` 原生分支仍在（C5） | **阻塞** |
| C28 | 其余设置操作零改动（8 分区 + 签名/行为） | FR-077 | ✅ | `SETTINGS_SECTION_IDS` 仍 8 项；`loadLlm`/`loadLlmStatus`/`loadTabsSetting`/`setCapabilityPrivacy`/`loadAutoAuth`/`setAutoAuth`/`loadSessions`/`groupAction`/`runDiagnostics`/`testConnection`/`clearLlm` 未改 | 低 |
| C29 | 单一调用点机核 + ≥3 伪造反证 | FR-078 | ✅ | `test/op-wiring.test.ts` 复跑：5 判据绿 + 3 条反证实跑可红（复制调用点 / 误接 requestTurn / pending 门控） | 低 |
| C30 | X1：manifest 零 diff + 显式名单 + 新增项在册 | FR-110 · NFR-009 | ✅ | `git diff 8526ef8 -- manifest.json` 空；`capability-wiring` X1⑤ 复跑（`deepEqual` 5 项 + 在册分支空集通过 + 2 条反证）；`host_permissions` 6 / `minimum_chrome_version 116` 不变 | 低 |
| C31 | X2：`op-*` 默认禁入 `KIND_SET`（含注入反证） | FR-111 | ✅ | 见 C24；`insight-protocol` 入口守卫扩为五校验面（台账 V52R1-E-01 登记） | 低 |
| C32 | 取代一律等价重锚（台账登记 + 计数不减 + 反证） | FR-116 | ✅ | `supersession` 35/0 复跑；台账 v5-2 叶段：10 文件 / 122 行逐字登记 + V52R1-E-01 / V52R2-E-01 / 10 条 `modifiedRanges`；`binding.mjs` 保护段 sha 独立复算 = `be9ad0e9…` | 低 |
| C33 | 断言零删除零降级、计数只增 | FR-003 | ✅ | `npm test` 1130 → **1165/0**；`stream` 63→68；`ask-auth` 61→71；`recommendation` 65；`binding` 192；台账删除行仅等价重锚 | 低 |
| C34 | 本叶主张门禁等价重锚清单逐项 | FR-120 · AC-ALLN-019 | ⚠️ | `capability-wiring`/`binding-wiring`/`auto-session-wiring`/`insight-protocol`/`content`/`pick-layer-budget`/`authorize-chip-wiring`/`op-wiring`/`sw-op-mirror`/`op-protocol` 均在位；**但 R2 门禁表未列** `test:page-input` / `test:zero-injection` / `insight` / `journey` / `l1` / `l2` / `e2e`（本审查独立补跑 page-input 108/0、zero-injection 27/0 绿） | 中 |
| C35 | 反证不空转（两段证伪） | FR-121 · AC-ALLN-021 | ✅ | 逐门禁反证据实跑：OP-W ×3、SW-M③、OP-P④、X1 ×2、S2 反证、size 反证；本审查独立复跑确认门禁非恒真 | 低 |
| C36 | 门禁严格串行 + KL-N-10 纪律（`test:binding`） | FR-124 · R-ALLN-015 | ⚠️ | 独立复跑 `test:binding`：首轮 `#6l` FAIL（诊断 `CDP socket not open`，环境性）→ 复跑 **192/0 PASS**；与 build R2 §R2-5-⑧ 登记同源（如实登记，不冒充串行全绿） | 低 |
| C37 | 新门禁纳入 `gate-integrity` 受审集合 | FR-125 | ✅ | `EXPECTED_AUDITED_FILES` 追加 `op-protocol`/`op-wiring`/`s2-deadend-chain`；`gate-integrity` 14/0 复跑；`CHROMIUM_GATES` 仍 9 | 低 |
| C38 | 体积五要素（前后值/日期/来源/理由/历史保留 + metafile 归因） | FR-130 · ADR-V5-011 §2 | ⚠️ | 两轮五要素齐备（R1 507,315→518,543 / R2 →535,821）+ Σ 逐模块 + glue 算术闭合（+17,229+49 = 17,278）+ `_TIMELINE`/`RE_REGISTRATIONS` 追加 + 根因登记（预算低估 ≈2×）；**但**绝对上限随档位一并上调与 ADR 冲突（见 C52），未解释字节绝对口径 1,500→2,500 属放宽（I-05） | 中 |
| C39 | 红线冻结面逐字节复核（含 `design/**` / 判定链 / v3 台账） | FR-133 | ✅ | `git diff --stat 8526ef8`：`manifest.json` / `src/content/**` / `docs/v3-supersession-ledger.json` 零 diff；`design-contract` 19/0（4 sha 冻结）复跑 | 低 |
| C40 | NFR-009 权限最小化（静态面零漂移 + 不可静默回收如实说明） | NFR-ALLN-009 | ✅ | 静态 `permissions` 5 项逐字；consent 文案含「回收也须你在浏览器确认，插件不做静默回收」；`op.revoke` 用 `contains` 复读实测（不假成功） | 低 |
| C41 | NFR-010 改状态 op 有快照/回滚 + 两侧镜像语义一致 | NFR-ALLN-010 | ❌ | `snapshot.ts` 三表整体回滚实现正确（`SNAPSHOT_TABLE_NAMES` 3 表、缺表抛错、无 `break/continue`），**但生产失败路径不触发它**（C3/C46）：改状态 op 失败时无半完成态防护 | **阻塞** |
| C42 | NFR-011 可观测性（{opId,ts,result,maskedLength} + 回执→审计入口） | NFR-ALLN-011 | ⚠️ | 回执带审计入口文案；SW `auditCapability` 接缝在 `service-worker.ts:2164-2171` **未传入**（`deps.auditCapability` 永远 undefined）⇒ `op.perm.request` 的 SW 侧审计不落；审计记录仅面板侧 | 中 |
| C43 | NFR-002/008 320px 零溢出 + 掩码/form 卡键盘与读屏可达 | NFR-ALLN-002/008 | ⚠️ | 掩码卡（`type=password` + `aria-label` + `data-secret`）/ form 卡（`aria-label` 逐项）断言在位；但 R2 未复跑 `journey`/`density`，本审查亦未独立复跑（Chromium 预算）——**未独立复核** | 低 |
| C44 | EC-005/006 取消与拒绝固化（非异常、不 loud） | EC-ALLN-005/006 | ⚠️ | `ASK_CANCEL_REASONS` 4 项闭集不变；S2 探针证 `cancelled`/`rejected` 固化行 + 可达 next；但同一路径再写成功回执（C3）不满足「固化语义唯一」 | 高 |
| C45 | EC-009 掩码空值/取消零副作用 | EC-ALLN-009 | ✅ | `submitSecret`（`:1285-1289`）空值 → `notice` + `settle(undefined)`，零存储写入；`op.describe` 空描述走既有卡内校验 | 低 |
| C46 | EC-011 三表整体回滚（禁单表） | EC-ALLN-011 · R-ALLN-904 | ❌ | **探针实测**：非抛错的失败路径 `rollback` 调用数 = **0**（`revokeTarget` 返回 `{ok:false}` 而非抛错；`pipeline.ts:182-187` 仅 `catch` 内回滚）⇒ EC-ALLN-011 在生产失败路径不可达（仅单测注入式可达） | **阻塞** |
| C47 | EC-012/016 连接失败回滚 + 双入口并发单一执行 | EC-ALLN-012/016 | ⚠️ | `PANEL.llmConfig` 内部 `restoreCredentials()`（同一 `writeCredentials` sink）真实回滚凭据；`opReceiptText` 回执同源构造；但返回值被 `buildOp` 丢弃（C3），且 options 面无执行体（C27） | 中 |
| C48 | ADR-V5-002 管线四态唯一 + `params`/`consent` 缺省语义 | ADR-V5-002 §1 | ⚠️ | `op.execute(` 在 `src/ui/sidepanel/**` 恰 1 调用点（NP-9 复跑绿）；无 params ⇒ 跳过 / 无 consent ⇒ 放行语义正确；**但**第四态（失败）未落地为独立收口（C3） | 高 |
| C49 | ADR-V5-003 SW 执行器 + type-only + 双侧同源 + 两段握手校验 | ADR-V5-003 | ⚠️ | 执行器/handshake/`probe` 只读/`commit` 唯一提交点/SW 零 `.request(` 均成立；**但** `consentToken` 仅「非空字符串」存在性校验（`op-protocol.ts:94-96`），未与真实 consent 卡/发送方绑定；`op-exec` 由任意扩展上下文可伪造（带 `gestureResult.granted:true` 即 commit 授权）——与 legacy `authorize`（`hostPermissionGranted`）等价暴露，非本叶新引入，但 ADR 措辞「无 consent ⇒ 不得执行」强于实现 | 中 |
| C50 | ADR-V5-004 最小集 + `form` 选项同源 | ADR-V5-004 | ✅ | 首批 0 项新增 + 显式名单 + 在册分支；`OPTIONAL_CAPABILITY_FORM_OPTIONS` 由 `OPTIONAL_CAPABILITIES` 派生（集合相等复跑绿） | 低 |
| C51 | ADR-V5-005 4 类收编 + options consent 载体登记 | ADR-V5-005 | ❌ | 「同执行体、不同 consent 载体」在 options 面**不成立**（无 execute body，C27）；ADR §1 判据「`settings/ops.ts` 内不再出现原生实现语句」未满足（C5）；`#authorize` 走 `dispatchOp(...,'settings')` 跳过流内 consent 卡的登记在 `knownGaps`/build 有记录（形式合规） | **阻塞** |
| C52 | ADR-V5-011 档位升档 + 绝对上限口径 + authorConfirmation 占位 | ADR-V5-011 §2 | ⚠️ | 档位 `ceilTo50KB(535,821) = 563,200`、绝对上限 `= 563,200×1.10 = 619,520`、生效上限 `min(619,520, floor(×1.05)=562,612)` 三值由常量同源推导（`size-ruling-vol3` 12/0 复跑）；`authorConfirmation.status` 保持 `pending-author-line`（不伪称，✓）；**但** ADR-V5-011 §2 明文「越档位 ⇒ **绝对上限 563,200 不变**」（R1 build §6.1 亦声明不变），实现把硬墙上调至 619,520，且 ADR 未补 `v5.1` 修订行（预案的修订义务未履行） | 中 |
| C53 | 文件影响分析对齐（plan §5 增删文件 vs 实际） | plan.md §5 | ⚠️ | 实际新增文件 5 个未在 plan §5 列出：`next-registry/snapshot.ts`、`test/op-wiring.test.ts`（plan 有列）、`test/s2-deadend-chain.test.ts`、`test/ui/fixtures/s2-chain.mjs`、`test/sw-op-mirror.test.ts`（有列）——实为 `snapshot.ts` + S2 三件（test/gate/fixture）未列；`op-table.ts` 计入 plan 但未计入「不进 sidepanel 的模块」说明的偏差（ADR-V5-011 §1 称计入 panel，实际计入 ✓） | 低 |
| C54 | 测试文件存在性（新增门禁/样本） | build.md R2 | ✅ | `op-protocol.test.ts` / `sw-op-mirror.test.ts` / `op-wiring.test.ts` / `s2-deadend-chain.test.ts` / `test/ui/fixtures/s2-chain.mjs` 均存在且复跑绿 | 低 |
| C55 | 核心逻辑路径覆盖（四态/opId/镜像/镜像漂移） | ADR-V5-002/003 | ✅ | OP-W①②③④⑤、SW-M①②③④、OP-P①②③④ 覆盖四态、opId 登记、镜像同源、漂移反证；`next-obligation-table` OT-1 双向 | 低 |
| C56 | 边界与错误场景覆盖（拒绝/取消/队列/回滚/空选择） | EC 族 | ⚠️ | 拒绝/取消/队列/空选择有断言；**回滚仅单测注入式覆盖**（`snapshot.ts` 纯函数），生产失败路径（C3/C46）无判据 ⇒ 覆盖假性完整；S2 `perm.missing` 未真实驱动（C18） | 高 |
| C57 | 断言有效性（弱断言/陈旧断言/恒真） | FR-121 | ⚠️ | 多数断言有效（含反证）；弱/陈旧点：SW-M④ 文案陈旧且实际触发原因是缺 `permission`（未覆盖 R2 落地的 commit 分支）；S2 判据①宣称「10 环节逐环节可判」但只断言 `S2_CHAIN.length===10` 与 `readings.length===6`；S2 ②宣称「逐类可达 next」但只做全局 `nextChips.length>0` | 中 |
| C58 | 门禁独立复跑一致性（计数/红线/保护段） | FR-003 · AC-ALLN-025 | ⚠️ | 8 项独立复跑（§4）；计数口径偏差：build R2 报 `npm test 1166/0`，独立复跑 `node --test` 汇总 **1165 tests / 0 fail**（`✔` 行数 1166）⇒ 口径未统一（R1 亦有同类偏差） | 低 |

## 3. 审查维度汇总

| 审查维度 | 审查项数 | 通过 | 警告 | 失败 | 通过率 |
|---------|:--:|:--:|:--:|:--:|:--:|
| 代码质量（C1~C6） | 6 | 3 | 2 | 1 | 50.0% |
| 规范符合性（C7~C47） | 41 | 23 | 13 | 5 | 56.1% |
| 架构一致性（C48~C53） | 6 | 1 | 4 | 1 | 16.7% |
| 测试质量（C54~C58） | 5 | 2 | 3 | 0 | 40.0% |
| **合计** | **58** | **29** | **22** | **7** | **50.0%** |

## 4. 独立复跑与对抗探针（门禁抽跑对账）

| # | 门禁 / 探针 | 命令 | 本轮读数 | 与 build 声明 |
|:--:|------|------|:--:|:--:|
| 1 | node 全量 | `npm test` | `tests 1165 / pass 1165 / fail 0`（EXIT=0） | ⚠️ R2 报 1166/0（口径差 1，见 I-12） |
| 2 | 未授权零注入 | `npm run test:zero-injection` | **27 passed / 0 failed** | R2 未复跑（本审查补跑，NFR-003 ≥27 达标） |
| 3 | 页面即输入 | `npm run test:page-input` | **108 passed / 0 failed** | R2 未复跑（本审查补跑） |
| 4 | binding（首轮） | `npm run test:binding` | **FAILED(1)**：`#6l 用户发送后无条件滚到底`（诊断 `CDP socket not open`） | 与 R2 §R2-5-⑧ KL-N-10 环境性 flake 同源 |
| 5 | binding（复跑） | `npm run test:binding` | **PASS — 192 assertions** | 一致（192） |
| 6 | ask-auth | `npm run test:ask-auth` | **71 passed / 0 failed** | 一致（71） |
| 7 | stream | `npm run test:stream` | **68 passed / 0 failed** | 一致（68） |
| 8 | recommendation | `npm run test:recommendation` | **65 passed / 0 failed** | 一致（65） |
| 9 | 红线产物 | `stat -c %s` + `sha256sum` | `content.js` 177,076 / `52a82620…`；`pick-layer.js` 33,900 / `5f567d7e…`；`sidepanel.js` 535,821 | 一致 |
| 10 | 保护段 | `sha256(binding.mjs[107780..115930))` | `be9ad0e983670137d4233349aede1cae0f0b6fdf26a050083761d30d52c6b936` | 一致 |
| 11 | KIND_SET | 源码块扫描 | 40 项 / `'op-` 字面量 **0** | 一致 |
| 12 | 委托面探针 | `dispatchOp('op.llm-config', {value:JSON}, 'settings'/'options')` | `PANEL.llmConfig(undefined)` → `{"ok":true}` | **新增反证（BLOCK-01）** |
| 13 | 失败语义探针 | 注入 `ok:false` / 抛错 | `op.revoke` → `{"ok":true}`；`op.perm.request` → settle `'completed'`；回滚 **0** 次 | **新增反证（BLOCK-02）** |
| 14 | S2 驱动探针 | 复跑 `test/ui/fixtures/s2-chain.mjs#judgeStates` | `deadEnds=0`；`perm.missing` ctx ≡ `recovered` ctx | **新增反证（BLOCK-03）** |

## 5. 阻塞问题

| # | 位置 | 问题 | 对应 Cx | 修复建议 |
|---|------|------|:--:|---------|
| 1 | `src/ui/sidepanel/next-registry/ops.ts:284-290`（IMPL row 零参箭头）、`:325`（`(run?.(ctx), OK)`）；`src/ui/sidepanel/sidepanel.ts:3220-3253`；`src/ui/settings/ops.ts:214-218/243-251` | **非 chat 面 op 执行体不可达 + 载荷丢失**：`dispatchOp('op.llm-config', {value: JSON}, 'settings'/'options')` 实际以 `PANEL.llmConfig(undefined)` 调用 ⇒ 表单值不落存储；`buildOp` 丢弃执行体返回的 `OpOutcome` ⇒ 恒 `{ok:true}` + 「✓ 已配置 LLM（掩码 · 零明文）」假成功；options.html 未 `bindPanelOps` ⇒ `op.revoke(auto-auth)`/`op.llm-config` 等零副作用假成功 | C9 / C27 / C51 | ① IMPL row 必须转发 ctx（`(c) => PANEL.llmConfig?.(typeof c.value === 'string' ? c.value : undefined)` 或把运行体改为接收 `ectx`）；② `buildOp` 必须把执行体的 `OpOutcome` 作为 `runOp` 返回值（禁止 `(run?.(ctx), OK)` 吞值）；③ options 面须有执行体（把 4 类 execute 体提到与面无关的模块，或 options 面退回 legacy 并显式登记）；④ 补 end-to-end 判据（settings/options 面保存后存储逐字段断言 + 假成功反证） |
| 2 | `src/ui/sidepanel/next-registry/pipeline.ts:180-189`；`src/ui/sidepanel/sidepanel.ts:1449-1489`（`revokeTarget` 返回 `{ok:false}`） | **失败语义不落地**：`execute`/`execSw` 返回 `{ok:false}` 时仍 `settle(op,'completed')`（写成功回执 `opReceiptText(opId,{ok:true})`）且**不回滚**；非抛错失败 ⇒ `rollback` 调用 0 次 ⇒ EC-ALLN-011 / NFR-ALLN-010 在三表回滚面不可达；`op.revoke` 多能力循环中途失败遗留跨表半完成态；`op.perm.request` 用户拒绝后同时出现「已拒绝」与「✓ …已完成」 | C3 / C11 / C41 / C46 / C17 / C44 | ① `runOp` 以 `out.ok` 选择 settle 状态（`completed` / `failed`）并在失败时执行 `rollback`；② `revokeTarget` 的多能力循环失败须抛错（或返回结构化失败并触发整体回滚）；③ 补判据：非抛错失败 ⇒ `rollback` 恰 1 次 + 无成功回执行（反证：删掉该分支必红） |
| 3 | `test/blocked-terminals.test.ts:185-198`（`BLOCKED_P0_MAP` 两行仍 `pending-v5-2`）；`test/ui/fixtures/s2-chain.mjs:72-73` | **承接项未闭环 + 首验收驱动失真**：v5-1 `build.md §6-③`（`llm.unconfigured` / `perm.missing` 的修复 provider，双射 5↔5）owner=本叶，R1 登记「随 TASK-V5-139 一并完成」，**R2 未落地亦未在 R2 报告登记** ⇒ owner 悬空 + 「30/30 全闭环」失真；且 S2 样本把 `perm.missing` 用与 `recovered` 完全相同的 ctx 驱动（无权限事实源）⇒ 该类「可达 next」读数不构成证据 | C18 / C10 / C16 | ① 补两行 provider（`chips` 含 `op.llm-config` / `op.perm.request`）并翻转 `status: 'landed'`；② 或在 R2/review 登记中显式改 owner/延期并说明对 FR-013 双射的影响；③ S2 样本补齐权限事实源（并入 7 源或新增注入面），使 `perm.missing` 与 `recovered` 不再同构 |

## 6. 改进建议（非阻塞）

| # | 位置 | 问题 | 对应 Cx | 建议 |
|---|------|------|:--:|------|
| I-01 | `src/ui/sidepanel/next-registry/ops.ts:269` | `op.describe` 未声明 `params`（FR-046 五要素不全 / AC-ALLN-007 偏差） | C13 | 已登记 + 裁决②（维持 `#ask-fallback` 单所有者）；建议把偏差写入 spec 的 AC 口径注（否则 validate 会再次判偏），或将「params 由既有单卡承担」纳入 `NextOp` 的等价形态定义 |
| I-02 | `src/ui/settings/ops.ts:254/265/287/314/423/478` | 4 类的**原生实现分支仍存在**（生产不可达），与 ADR-V5-005 §1 判据及 build R2「全部迁出」表述不符 | C5 / C51 | 删除 legacy 分支（或加 `/* unreachable in production */` + 门禁断言「dispatchOp 缺失 ⇒ 抛错」），并把「零原生语句」做成可机核判据 |
| I-03 | `src/ui/sidepanel/sidepanel.ts:1293` | `maskedLength = secret.length`（原始长度）入流内 payload；ADR-V5-010 §2 要求只落**长度类别** | C21 | 在 `submitSecret` 即落类别（如 `n >= 8 ? '8+' : '8-'`），把数值留在函数内；`chat-state`/`stream-model` 的 `maskedLength` 改为类别字符串 |
| I-04 | `test/ui/fixtures/s2-chain.mjs:72-73` | `perm.missing` 与 `recovered` 同 ctx；「10 环节逐环节可判」未机核；「5 类逐类可达 next」未逐类断言 | C18 / C56 / C57 | 补权限事实源（见 B-03）；把 10 环节 → 读数的映射表做成断言；把 next-chip 判据下沉到逐类 |
| I-05 | `test/size-growth-evidence.test.ts:248` | 未解释字节绝对口径 1,500 → 2,500 B 属**放宽**（相对 <2% 口径为 v4-2 既有，非本轮新增） | C38 | 保留放宽但把理由写实（模块数增长 → 胶水线性上界公式），去掉「更强判据」的过其实表述；或改用「<1% 且 <2,500 B」双门 |
| I-06 | `../ADR-V5-011-volume-budget.md:64` | 越档位预案明文「绝对上限 563,200 不变」，实现上调为 619,520 且 ADR 未补 `v5.1` 修订行；R1 build §6.1 亦称「绝对上限不变」 | C52 | 二选一：① 按预案保持 563,200（则 R2 需减体积）；② 修订 ADR（新增 `v5.1` 修订行 + 修正 §2 该行口径），并在 `authorConfirmation` 追加 v5-2 占位注 |
| I-07 | `src/background/service-worker.ts:2164-2171` | `execSwOp` 的 `auditCapability` 接缝未传入 ⇒ `op.perm.request` 的 SW 侧审计不落 | C42 | 补 `auditCapability` 实现（复用既有 audit 单源），并加断言「grant/deny 各 1 条审计」 |
| I-08 | `src/background/op-protocol.ts:94-96` / `service-worker.ts:2795` | `consentToken` 仅存在性校验；`op-exec` 无发送方校验 ⇒ 伪造 commit 可授权（与 legacy 等价，非新引入） | C49 | 至少把 token 与「已 resolve 的 consent 卡 id」绑定（面板侧生成一次性 nonce，SW 侧校验存在/一次性），并在 doc 中如实降级措辞 |
| I-09 | `test/sw-op-mirror.test.ts:132-133` | 陈旧文案「执行体未落地（v5-2 R2 补）」；实际触发原因是缺 `permission`，未覆盖 R2 落地的 commit 分支 | C57 | 更新文案 + 增两条：`op.perm.request` commit（grant/deny 各一）与缺 `permission` 拒绝 |
| I-10 | `src/ui/sidepanel/next-registry/ops.ts:31` | 注释「本文件恰含 1 处 `requestTurn(`」与实测（0 处调用）不符；R1 TASK-128 的「恰 1」判据属注释级满足 | C6 | 改为「本文件无 `requestTurn(` 调用；`op.turn` 经 `bindPanelOps.turn` 触达唯一入口」 |
| I-11 | `test/blocked-terminals.test.ts:181-198` | `llm.unconfigured` / `perm.missing` 仍 `pending-v5-2`（owner=本叶） | C18 | 见 B-03（本项与 B-03 同源，修复后此项闭合） |
| I-12 | build R2 §R2-4 / 本报告 §4 | 门禁计数口径不统一（build 1166 = `✔` 行数；`node --test` 汇总 1165 tests） | C58 | 统一采用 `node --test` 汇总口径并重登记（或注明 `✔` 行数含 suite 行） |
| I-13 | `docs/v4-supersession-ledger.json#entries[V52R2-E-01].reason` | reason 文本写「基线按裁决重登记为 518,543 B」，与 `newTitle`/实际值 535,821 不一致 | C32 | 订正 reason 为 535,821（或分 R1/R2 两条） |
| I-14 | 父 `state.json#pendingObligations.PO-ALLN-005` | 「体积净增最终值 + 是否触发档位上调」仍「待实测」，未随 R1/R2 实测与升档更新 | C38 | 更新为「已实测（+28,506 B）∧ 已触发档位上调（经裁决①）；绝对上限口径待 ADR 修订」 |
| I-15 | 本叶 `tasks.md` | 无任务状态字段（128 个未勾选 `[ ]`，为验收清单）；前置「所有任务 completed」仅可由 `state.json#r2Artifact` 判定 | C54 | 在 tasks.md 头部注明「状态以 state.json 为准」，或补状态列 |

## 7. 结论

**结论**: ❌ **不通过**

| 指标 | 结果 |
|------|------|
| 审查通过率 | 50.0%（29 / 58） |
| 阻塞问题数 | **3** |
| 规范符合性偏差 | 18 项（5 项失败 + 13 项警告，含 3 项与阻塞同源） |
| 可进入 validate | **否**（须先修复 BLOCK-01~03） |

**理由**：

1. 本叶的核心承诺是「**把操作搬进流 + 把入口收成一条路**」。机制面（9 op 注册、`op-table` 双侧同源、`op-*` type-only、X1/X2 等价重锚、S2 seam 判据、体积五要素与档位登记、红线逐字节、门禁反证）**大面积达标且可独立复现**（8 项复跑 + 3 类对抗探针）。
2. 但 **BLOCK-01**（收编后的执行体在非 chat 面不可达/载荷丢失 → 假成功）与 **BLOCK-02**（`ok:false` 被当成功、非抛错失败不回滚）直接落空 FR-042 / FR-044 / FR-075 / FR-076 / EC-ALLN-011 / NFR-ALLN-010，并会使 validate 的「设置面保存 / 撤销」「失败回滚」两类验收必然失败；二者均为**可复现的静态事实**（探针 12/13），非环境性。
3. **BLOCK-03**（v5-1 §6-③ 承接项 owner 悬空 + S2 `perm.missing` 驱动与恢复态同构）使「30/30 全闭环」与「5 类阻塞态逐类可达」两处声明失真。
4. 修复量集中在 `ops.ts`（row 转发 ctx + 返回 OpOutcome）、`pipeline.ts`（失败态 → settle/rollback）与 options 面执行体三处，属**局部修正**，不需要推倒本叶架构；建议 `@sddu-build` 出 R3 修复轮后重跑 review R2 → validate。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1 静态审查：C1~C58 逐项 + 8 项独立复跑 + 3 类对抗探针；3 阻塞 / 15 改进；结论 ❌ 不通过） | 2026-09-22 | SDDU Review Agent |
