# 审查报告：specs-tree-v5-2-ops-first-batch（V5-2 首批 9 op 落地 + SW 执行器 + 断流首验收）

> **文档定位**: SDDU 审查报告 — 逐项记录自主审查的执行结果，作为 validate 阶段的输入
> **审查策略**: `review.md`（C1~C58 自主清单 + 四维度锚点 + 方法学）
> **前置依赖**: `review-report.md` R1（3 BLOCK / 15 I）· `spec.md` · `plan.md`（ADR-V5-002/003/004/005/011 + 父 ADR-V5-001~012）· `build.md` R1+R2+R3（review 修复轮）· 上游叶 v5-1 `build.md §6·§8`
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-22
> **审查轮次**: **R2（复审：R1 三阻塞闭环 + 修复轮新引入风险）**
> **版本**: **v2.0**
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-22
> **更新说明**: R2 复审。审查对象 = HEAD `13b7d76`（fix 提交）/ 基线 `5abe0a1`（R1 报告）；修复轮 diff 全量扫描 `5abe0a1..13b7d76`。**结论由 ❌ 不通过 → ✅ 通过**：BLOCK-01~03 全部闭环（含独立复跑探针 12/13/14 + 两段证伪），无新阻塞，5 项低危观察登记（N-01~N-05）。R1 内容见 commit `5abe0a1`。

---

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查项总数 | 58（C1~C58，沿用 `review.md` 自主清单） |
| 通过 | 45 |
| 警告 | 13 |
| 失败 | 0 |
| 阻塞问题 | **0**（R1 为 3） |
| R2 新发现 | 5（全部低危；无阻塞 / 无高危 / 无中危） |
| 独立复跑门禁 | 6 项抽跑（全绿）+ 2 项补跑 + 独立探针 13/13 |

**结论摘要**：R1 的三项阻塞均已在 `13b7d76` 闭环，且**可独立复现**——① BLOCK-01：载荷透传在 panel/settings/options 三面同执行体真实落储，未绑定 seam 一律 loud 失败（假成功消灭）；② BLOCK-02：`{ok:false}` 走 `failed` 结算 + 三表整体回滚，`EC-ALLN-011`/`NFR-ALLN-010` 生产可达；③ BLOCK-03：`BLOCKED_P0_MAP` 5/5 landed 且修复 provider 真实注册/接线，S2 两类阻塞 ctx 不再与恢复态同构且逐类断言 + 反证。修复轮自身的 diff 扫描未发现双路径回归；journey 21 项 latent 修复正确（真机 171 PASS）。红线/保护段/manifest/`src/content/**`/v3 台账逐字节或零 diff 不变。残留 5 项低危（重复失败行、注释时效、options 面无快照 seam 等），均不阻塞。

## 2. 逐项审查结果（C1~C58 · R2 复审口径）

> 说明：未受修复轮影响的条目沿用 R1 判定（标 `=`，并注明 R1 结论）；受影响的条目给出 **R2 复验证据**。恢复闭环的条目以「**闭环**」标注。

| # | 审查对象 | 审查基准 | R1 | R2 | 发现（R2） | 严重程度 |
|---|---------|---------|:--:|:--:|------|:--:|
| C1 | 命名/可读性/纯数据职责 | 项目宪法 | ✅ | ✅(=) | 新模块 `op-bodies.ts` 职责单一（与面无关的执行体 + 注入原子），无 chrome/DOM 泄漏 | 低 |
| C2 | 函数职责单一（派生表、单源） | plan §2.4 | ✅ | ✅(=) | 派生链未受扰动；`sw-op-mirror` ② 复跑绿 | 低 |
| C3 | 错误处理与失败语义（`ok:false`/回滚） | FR-042/043/044 · EC-ALLN-011 | ❌ | ✅ | **闭环（BLOCK-02）**：`buildOp.execute` 原样返回 `OpOutcome`；`runOp` 在 `!out.ok` 时 `rollback(snap)` + `settle('failed')`；独立探针：注入半完成失败 ⇒ `settled=["failed"]` ∧ `db==before`（回滚 1 次）。反证（短路回滚）判据能红 | 低 |
| C4 | 无硬编码（文案/参数序列单源） | FR-047 | ✅ | ✅(=) | 单源未变；`opReceiptText` 现优先取执行体 receipt | 低 |
| C5 | 无冗余逻辑/死代码 | NFR-004 | ⚠️ | ⚠️ | **I-02 落地**：`settings/ops.ts` 四类原生分支删除（零原生语句）。残留（R1 同源，低）：`ops.ts#SW_LAYER_REFUSAL` 对 sw op 经 `execSw` 不可达；`collectOpParams` 的 `op.describe` 分支因 `params:null` 经管线不可达 | 低 |
| C6 | 注释与实现一致 | FR-048/043 | ⚠️ | ⚠️ | **I-10/I-08/I-09 落地**（`ops.ts` requestTurn 注释、`op-protocol` consentToken 降级、SW-M④ 文案）。残留：`settings/ops.ts` `dispatchOp` docstring 仍称执行体在 `next-registry/ops.ts`（今在 `settings/op-bodies.ts`）——**N-02** | 低 |
| C7 | `op.authorize` 五要素 + 两段握手 | FR-040/065/066 | ✅ | ✅(=) | 未受扰动；`authorizeOrigin` 单例 | 低 |
| C8 | `op.rebind` 无 params/consent + 零 requestTurn | FR-041 | ✅ | ✅(=) | 未受扰动 | 低 |
| C9 | `op.llm-config` 三参数流转 + 掩码写存储 + 失败回滚 | FR-042 · AC-007 | ❌ | ✅ | **闭环（BLOCK-01）**：IMPL row 转发 `c.value`；`buildOp` 返回执行体 `OpOutcome`；三面（panel/settings/options）同执行体真实落储（探针：`saved=1 / apiKey=sk-r2-probe / maxRounds=33`）；缺 key ⇒ `{ok:false,reason:'llm-key-missing'}` 零落储 | 低 |
| C10 | `op.perm.request` form 多选 + 双固化 + 快照回滚 + 在册校验 | FR-043/110 | ⚠️ | ✅ | **闭环**：拒绝路径不再写成功回执（走 `failed` 结算）；`I-07` SW `auditCapability` 接线（grant/deny 各 1 条审计断言）。残留：拒绝时失败行**重复写 1 次**（同一 channel）——**N-01** | 低 |
| C11 | `op.revoke` 三目标 + 不可逆确认 + 审计入口 + 三表回滚 | FR-044 · AC-011 | ❌ | ✅ | **闭环（BLOCK-02）**：`permission-still-held` 等 `{ok:false}` ⇒ 失败结算 + 整体回滚（探针复现）；不再写「✓ 已撤销」假回执 | 低 |
| C12 | `op.pick` 复用单一入口 + 取消/超时恢复 | FR-045 · EC-005 | ✅ | ✅(=) | 未受扰动 | 低 |
| C13 | `op.describe` `params` 五要素齐备 | FR-046 · AC-007 | ⚠️ | ⚠️ | 维持 R1 裁决②/I-01（`#ask-fallback` 单所有者）；残留口径项（建议入 spec AC 注） | 低 |
| C14 | `op.help` 由 `when(ctx)` 派生 | FR-047 | ✅ | ✅(=) | 未受扰动 | 低 |
| C15 | `op.turn` 唯一 `requestTurn` | FR-048 · N22/N25 | ✅ | ✅(=) | OP-W③ 复跑绿（7/0） | 低 |
| C16 | 会话/分组 `deferred` 登记 + 首批恰 9 op | FR-049 | ✅ | ✅(=) | `OP_DESCRIPTORS.length===9`；父 PO-ALLN-001 在册 | 低 |
| C17 | 拒绝非死端（固化 + 可达 next） | FR-014 · EC-006/008 | ⚠️ | ✅ | **闭环**：`cancelled`/`rejected`/`failed` 三态均为**唯一**收口（不再叠加成功回执），`panelReachableNext` 触发 | 低 |
| C18 | S2 断流首验收（死端=0 / 5 类驱动真实 / ✖ 行不裸奔） | FR-016 · AC-001 | ⚠️ | ✅ | **闭环（BLOCK-03）**：`blockedStateCtx('llm.unconfigured'/'perm.missing') !== recoveredCtx()`（探针 + 反证）；`s2-deadend-chain` 下沉**逐类**修复 op 断言（`EXPECTED_REPAIR` 5 行）。残留：S2 ① 的「10 环节逐环节可判」仍为读数计数级（未做环→读数映射机核），登记 v5-3 | 低 |
| C19 | 掩码卡唯一入口 | FR-020 | ✅ | ✅(=) | `askuser.ts` 复用同一 triad；`maskedLength` 改类别后渲染一致 | 低 |
| C20 | 值直达 key-store（恰一处 sink） | FR-021 · ADR-V5-010 §1 | ⚠️ | ⚠️ | 维持 R1 登记（`writeCredentials` 共享，形式偏差） | 低 |
| C21 | 流内只留事实（长度**类别**） | FR-022 · ADR-V5-010 §2 | ⚠️ | ✅ | **I-04 落地**：`MaskedLengthCategory`（`8+`/`8-`）替代原始长度；`submitSecret` 内取类别（数字不出函数）；`src` 内无第二处数值型 `maskedLength` | 低 |
| C22 | 双层执行器（layer 显式） | FR-065 | ✅ | ✅(=) | 未受扰动 | 低 |
| C23 | 特权 op 恰 2 + 手势路径语义保留 | FR-066 | ✅ | ✅(=) | `SW_OP_DESCRIPTORS.length===2`；SW 零 `.request(` | 低 |
| C24 | `op-*` type-only（KIND_SET 零新增 + content.js 逐字节） | FR-067/111 | ✅ | ✅(=) | OP-P①/②/③/④ 复跑绿；`content.js` 177,076 / `52a82620…` | 低 |
| C25 | SW 侧镜像契约 {id,mode,fail,audit} 同源 | FR-068 | ✅ | ✅(=) | `sw-op-mirror` 5/0（含 I-09 新增 grant/deny 审计断言） | 低 |
| C26 | 红线逐字节（content/pick-layer + src/content 零 diff） | FR-069 · AC-022 | ✅ | ✅(=) | 独立复算命中（见 §4） | 低 |
| C27 | settings/options 4 类收编为 op 单一执行入口 | FR-075/076 | ❌ | ✅ | **闭环（BLOCK-01）**：options 面 `bindPanelOps` 绑同一执行体（`opBodies`）；未绑 seam ⇒ `panel-hook-missing:<opId>` loud；`settings/ops.ts` 零原生语句。残留：options 面无 snapshot/restore 原子 ⇒ 其失败回滚为 no-op（**N-04**，单 sink 原子写故无半完成态） | 低 |
| C28 | 其余设置操作零改动 | FR-077 | ✅ | ✅(=) | `SETTINGS_SECTION_IDS` 8 项；未受扰动方法逐字 | 低 |
| C29 | 单一调用点机核 + ≥3 反证 | FR-078 | ✅ | ✅(=) | `op-wiring` 7/0（5 判据 + 3 反证） | 低 |
| C30 | X1：manifest 零 diff + 显式名单 + 在册 | FR-110 · NFR-009 | ✅ | ✅(=) | manifest 零 diff；`capability-wiring` X1⑤ 复跑绿 | 低 |
| C31 | X2：`op-*` 默认禁入 KIND_SET | FR-111 | ✅ | ✅(=) | 见 C24 | 低 |
| C32 | 取代一律等价重锚 | FR-116 | ✅ | ✅(=) | `supersession` 35/0；R3 新增条目 + 逐字登记 + 换链同步 | 低 |
| C33 | 断言零删除零降级、计数只增 | FR-003 | ✅ | ✅(=) | `npm test` 1165→**1172/0**；三处测试 diff 均为等价重锚 + **新增**断言（`sidepanel-view`/`recommendation-sources`/`sw-op-mirror`） | 低 |
| C34 | 门禁等价重锚清单逐项 | FR-120 · AC-019 | ⚠️ | ⚠️ | R3 补跑 R1 列出的未跑面（l0/l1/l2/journey/insight/page-input/zero-injection）；残留：门禁表口径仍需与 `test:v3` 全链对齐 | 低 |
| C35 | 反证不空转（两段证伪） | FR-121 | ✅ | ✅(=) | OP-W×3 / SW-M③ / OP-P④ / X1×2 / **NP-11、NP-5b、BT-3、S2 各新增反证** 均实测可红 | 低 |
| C36 | 门禁严格串行 + KL-N-10 | FR-124 | ⚠️ | ⚠️ | 维持 R1 登记（binding 环境性 flake；R3 复跑 192/0） | 低 |
| C37 | 新门禁纳入 gate-integrity | FR-125 | ✅ | ✅(=) | `gate-integrity` 14/0（随 `npm test`） | 低 |
| C38 | 体积五要素 | FR-130 · ADR-V5-011 §2 | ⚠️ | ⚠️ | 第三轮五要素齐（535,821→**542,150**，Σ+6,294+glue 35 == +6,329）。残留：ADR v5.1 注 / 父 PO-ALLN-005 仍锚 R2 基线（生效上限 562,612），未刷新为 569,257 ——**N-03** | 低 |
| C39 | 红线冻结面逐字节复核 | FR-133 | ✅ | ✅(=) | `content.js`/`pick-layer.js`/`manifest`/`src/content/**`/v3 台账零 diff；`design-contract` 19/0 | 低 |
| C40 | NFR-009 权限最小化 | NFR-009 | ✅ | ✅(=) | 静态 permissions 5 项；consent 文案含「不做静默回收」 | 低 |
| C41 | NFR-010 改状态 op 有快照/回滚 + 镜像一致 | NFR-010 | ❌ | ✅ | **闭环（BLOCK-02）**：`snapshot.ts` 三表整体回滚 + **生产失败路径可达**（探针 `db==before`；生产 `threeTableAdapters()` 3 表在册）。残留：permission 表 restore 仅 reconcile（Chrome 仅手势可授）——**N-05** | 低 |
| C42 | NFR-011 可观测性 | NFR-011 | ⚠️ | ✅ | **I-07 落地**：`service-worker.ts` `op-exec` 注入 `auditCapability`（复用 `optional-permission` 单源）；grant/deny 各 1 条断言 | 低 |
| C43 | NFR-002/008 320px + 键盘/读屏可达 | NFR-002/008 | ⚠️ | ⚠️ | 断言在位；R2 独立复跑 `journey` **171 PASS**（含 0 console error）；`density`（320px）未独立复跑 | 低 |
| C44 | EC-005/006 取消与拒绝固化 | EC-005/006 | ⚠️ | ✅ | **闭环**：固化语义唯一（见 C17） | 低 |
| C45 | EC-009 掩码空值/取消零副作用 | EC-009 | ✅ | ✅(=) | `submitSecret` 空值零存储；类别位不引入副作用 | 低 |
| C46 | EC-011 三表整体回滚（禁单表） | EC-011 · R-904 | ❌ | ✅ | **闭环（BLOCK-02）**：非抛错失败与抛错同一收口；独立探针回滚 1 次 + 零半完成态；反证可红 | 低 |
| C47 | EC-012/016 连接失败回滚 + 双入口单一执行 | EC-012/016 | ⚠️ | ✅ | **闭环**：`types` 透传执行体 outcome；options 面执行体落地；`llmConfig` 内部凭据回滚保留 | 低 |
| C48 | ADR-V5-002 管线四态唯一 | ADR-V5-002 §1 | ⚠️ | ✅ | `SettleState` 增第四态 `failed`；`op.execute(` 侧栏恰 1 调用点（NP-9 复跑绿） | 低 |
| C49 | ADR-V5-003 SW 执行器 + type-only + 同源 + 握手 | ADR-V5-003 | ⚠️ | ⚠️ | 维持 R1 I-08（`consentToken` 存在性校验；扩自面等价暴露，如实降级措辞已落） | 低 |
| C50 | ADR-V5-004 最小集 + form 同源 | ADR-V5-004 | ✅ | ✅(=) | X1 复跑绿 | 低 |
| C51 | ADR-V5-005 4 类收编 + consent 载体登记 | ADR-V5-005 | ❌ | ✅ | **闭环（BLOCK-01）**：「同执行体、不同 consent 载体」机核成立（三面共用 `op-bodies.ts`）；`settings/ops.ts` 零原生语句 | 低 |
| C52 | ADR-V5-011 档位升档 + 绝对上限口径 | ADR-V5-011 §2 | ⚠️ | ⚠️ | **I-06 落地**（ADR 追加 v5.1 订正注：绝对上限 = 档位×1.10，正文不改写）。残留：注内生效上限行锚 R2 值（**N-03**） | 低 |
| C53 | 文件影响分析对齐（plan §5） | plan.md §5 | ⚠️ | ⚠️ | 维持 R1；修复轮新增 `settings/op-bodies.ts` 亦未登记回 plan §5 文件影响（低） | 低 |
| C54 | 测试文件存在性 | build.md R3 | ✅ | ✅(=) | 新增 `next-pipeline.test.ts` 扩 190 行；S2 fixture 扩 60 行 | 低 |
| C55 | 核心逻辑路径覆盖 | ADR-V5-002/003 | ✅ | ✅(=) | 四态（含 `failed`）+ NP-11/NP-5b 覆盖 | 低 |
| C56 | 边界与错误场景覆盖 | EC 族 | ⚠️ | ⚠️ | **改善**：回滚生产可达判据已补（NP-5b）。残留：S2 10-beat 映射未机核（**C18 同源**） | 低 |
| C57 | 断言有效性（弱/陈旧/恒真） | FR-121 | ⚠️ | ⚠️ | **I-09 落地**（SW-M④ 文案订正 + commit 分支断言）。残留：S2 ① 计数级断言（**C18 同源**） | 低 |
| C58 | 门禁独立复跑一致性 | FR-003 · AC-025 | ⚠️ | ✅ | 口径统一为 `node --test` 汇总：独立复跑 **1172 tests / 0 fail**（与 build R3 同口径） | 低 |

## 3. 审查维度汇总

| 审查维度 | 审查项数 | 通过 | 警告 | 失败 | 通过率 |
|---------|:--:|:--:|:--:|:--:|:--:|
| 代码质量（C1~C6） | 6 | 4 | 2 | 0 | 66.7% |
| 规范符合性（C7~C47） | 41 | 33 | 8 | 0 | 80.5% |
| 架构一致性（C48~C53） | 6 | 3 | 3 | 0 | 50.0% |
| 测试质量（C54~C58） | 5 | 3 | 2 | 0 | 60.0% |
| **合计** | **58** | **45** | **13** | **0** | **77.6%** |

> R1 基线：29✅ / 22⚠️ / 7❌ / 3 阻塞（通过率 50.0%）。R2 全部 13 项警告均为**低危残留**（多数为 R1 已登记项或文档时效），**无阻塞、无高/中危**。

## 4. 独立复跑与对抗探针（R2）

| # | 门禁 / 探针 | 命令 | R2 读数 | 判定 |
|:--:|------|------|:--:|:--:|
| 1 | node 全量 | `npm test` | `tests 1172 / pass 1172 / fail 0`（EXIT=0） | ✅ 与 build R3 同口径（+7，断言零删除） |
| 2 | op 管线 | `node --test dist-test/test/next-pipeline.test.js` | **20/0**（含 NP-11 BLOCK-01、NP-5b BLOCK-02 + 两段证伪） | ✅ |
| 3 | 阻塞终局 | `node --test dist-test/test/blocked-terminals.test.js` | **9/0**（BT-3 5/5 landed + 反证） | ✅ |
| 4 | 推荐（Chromium） | `npm run test:recommendation` | **65 passed / 0 failed** | ✅ |
| 5 | 体积裁决 | `node --test dist-test/test/size-ruling-vol3.test.js` | **12/0** | ✅ 三值同源 |
| 6 | op 接线 | `node --test dist-test/test/op-wiring.test.js` | **7/0**（5 判据 + 3 反证） | ✅ |
| 7 | 补跑：SW 镜像 | `node --test dist-test/test/sw-op-mirror.test.js` | **5/0**（I-07/I-09 断言） | ✅ |
| 8 | 补跑：journey（Chromium 真机） | `npm run test:ui` | **171 PASS**（0 未捕获异常 / 0 console error） | ✅ 修掉 R2 收编引入的 21 项 latent 失败 |
| 9 | **独立复审探针**（自研，不复用仓库测试） | `node /tmp/opencode/v5-2-review-r2/probe.mjs` | **13/13**（BLOCK-01 三面 + 缺缝 loud；BLOCK-02 回滚/反证；BLOCK-03 provider/ctx/非同构；红线） | ✅ |
| 10 | 重复行反证探针 | `node /tmp/opencode/v5-2-review-r2/probe2.mjs` | `op.perm.request` 拒绝 ⇒ notices **= 2**（同一文案两行） | ⚠️ **N-01** |
| 11 | 红线产物 | `stat` + `sha256sum` | `content.js` 177,076 / `52a82620…`；`pick-layer.js` 33,900 / `5f567d7e…`；`sidepanel.js` **542,150** | ✅ 一致 |
| 12 | 冻结面 diff | `git diff 8526ef8 -- manifest.json src/content docs/v3-supersession-ledger.json` | 全空（零 diff）；`5abe0a1..13b7d76 -- src/content` 空 | ✅ |
| 13 | KIND_SET | 源码块扫描（OP-P① 复跑） | 40 项 / `'op-` 字面量 **0** | ✅ |

**修复轮 diff 全量扫描（`5abe0a1..13b7d76`，26 源/测试文件 + 4 台账/文档）**：
- **双路径回归检查**：`op-bodies.ts` 为**唯一**执行体实现（面板/options/设置三面共用）；`settings/ops.ts` 仅在无 op 管线时（单测 seam）调同一 body，生产走 `dispatchOp` ⇒ **无双执行**。`buildOp.execute` 已无 `(run?.(ctx), OK)` 丢弃形态。
- **journey 21 项 latent 修复正确性**：根因 = options 面 `bindPanelOps` 钩子名错配（`llmConfigForm` → `llmConfig`）+ 回执文案改由执行体透出（`OpOutcome.receipt`）+ 权限撤销判据按权限面重锚；真机 `test:ui` **171 PASS** 证实修复正确，非放宽断言（diff 为等价重锚 + 新增断言）。
- **静态扫描**：`git diff 5abe0a1..13b7d76 -- src/content` 空；无新增 `data-op`/per-op 分支（NP-8 复跑绿）。

## 5. 阻塞问题

**无。** R1 的 3 项阻塞均已闭环：

| R1 阻塞 | 位置 | 闭环证据（R2） |
|---|------|------|
| BLOCK-01 载荷丢失 / 假成功 | `next-registry/ops.ts` row + `buildOp`；`settings/op-bodies.ts`（新增）；`options.ts` | 探针 9/13：#1~#5 全绿（三面真实落储 + 缺缝 loud + `{ok:false}` 不升为成功）；NP-11 + 两段证伪 |
| BLOCK-02 失败语义不落地 | `pipeline.ts` `runOp`；`sidepanel.ts` 三表原子 | 探针 #6~#8：`{ok:false}` ⇒ `settle='failed'` ∧ `db==before` ∧ 无成功回执；短路反证可红；NP-5b |
| BLOCK-03 承接项悬空 / 驱动同构 | `blocked-terminals.test.ts`；`providers.ts`；`s2-chain.mjs`；`recommend.ts` | 探针 #9~#12：5/5 landed、chips 真实接线、`when` 由派生风险类驱动、两类 ctx 非同构；BT-3 9/0 + S2 逐类 + 反证 |

## 6. 改进建议（R2 新发现 · 全部低危）

| # | 位置 | 问题 | 对应 Cx | 建议 |
|---|------|------|:--:|------|
| N-01 | `sidepanel.ts` `#permRequest`（≈:1456-1458） + `pipeline.ts:115` `defaultSettle('failed')` | 面板钩子与管线结算同走 `notice` channel ⇒ `op.perm.request` 拒绝时**同一失败回执写 2 行**（探针实测 notices=2） | C10 | 二选一：面板钩子不再自行 dispatch（回执由管线统一透出），或管线对 sw op 的 `failed` 不重复写（保留一条事实行） |
| N-02 | `settings/ops.ts:85-91`（`dispatchOp` docstring） | 仍称执行体「lives exactly once (in `next-registry/ops.ts`'s table)」——今在 `settings/op-bodies.ts`（I-10 同类注释漂移） | C6 | 订正 docstring 指向 `settings/op-bodies.ts` |
| N-03 | `size-budget.test.ts:53`；`ADR-V5-011` v5.1 注；父 `state.json#PO-ALLN-005` | 体积登记时效：测试注释写 `floor(541,505 × 1.05)`（值实为 `floor(542,150 × 1.05)=569,257`）；ADR 注与 PO 仍锚 R2 基线 535,821（生效上限 562,612），未含修复轮 +6,329 | C38/C52/C6 | 注释订正分母；ADR 注与 PO 追加修复轮行（生效上限 569,257）；档位/绝对上限（563,200/619,520）不变 |
| N-04 | `options.ts` `bindPanelOps`（无 `snapshotTables`/`restoreTables`） | options 面 `dispatchOp` 失败路径回滚为 **no-op**（`panelSnapshot` 返回空快照）；因四类执行体写入均单 sink 原子，无半完成态，故为口径项非缺陷 | C27 | 登记为「options 面无跨表快照原子」；如需真回滚再注入两原子（或在 ADR-V5-005 注） |
| N-05 | `op-bodies.ts` `#revoke`（permission 循环）+ `snapshot.ts` permission.write | `permission` 目标多能力撤销中途失败时，整体回滚对 permission 表**只能 reconcile**（Chrome 仅手势可授）⇒ 已移除能力不可真回滚；机制已触发（诚实失败行），残余为平台限制 | C41 | 在 consent 文案/ADR 保留「回收须浏览器确认」口径；如需强一致，改为逐能力独立 op（一次一个，失败即止，不跨能力）并登记 |

## 7. 结论

**结论**: ✅ **通过**（R1 `❌ 不通过` → R2 `✅ 通过`）

| 指标 | 结果 |
|------|------|
| 审查通过率 | 77.6%（45 / 58） |
| 阻塞问题数 | **0** |
| R2 新发现 | 5（全部低危；无高/中危） |
| 红线/冻结面 | `content.js` / `pick-layer.js` / `manifest` / `src/content/**` / v3 台账 **逐字节或零 diff 不变** |
| 可进入 validate | **是** |

**理由**：

1. R1 三项阻塞**全部闭环且可独立复现**——自研探针 13/13（不复用仓库测试）覆盖三面载荷透传、缺缝 loud、失败结算 + 整体回滚 + 反证、provider 真实注册与派生驱动、S2 非同构，另加仓库两段证伪（NP-11 / NP-5b / BT-3 / S2）。修复方向为**局部修正**（`op-bodies.ts` 提取 + `buildOp` 返回 outcome + `runOp` 失败收口 + providers 接线），未推倒本叶架构。
2. 修复轮 diff 全量扫描未发现**双路径回归**：执行体单源、`settings/ops.ts` 零原生语句、`op.execute(` 与 per-op 分支配额不变；journey 21 项 latent 修复经真机 171 PASS 证实正确（等价重锚 + 新增断言，零删除）。
3. 门禁抽跑 6 项全绿（npm 1172/0 · next-pipeline 20/0 · blocked-terminals 9/0 · recommendation 65/0 · size-ruling-vol3 12/0 · op-wiring 7/0），补跑 journey 171 PASS / sw-op-mirror 5/0；红线与保护面逐字节不变。
4. R2 新发现 5 项均为低危（1 项重复失败行、3 项注释/登记时效、1 项平台限制口径），不落空任何 FR/NFR/EC，**不阻塞 validate**；建议在 validate 前顺手订正 N-01/N-02/N-03（零风险文档/文案级），N-04/N-05 登记即可。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | R1 静态审查：C1~C58 逐项 + 8 项独立复跑 + 3 类对抗探针；**3 阻塞 / 15 改进；结论 ❌ 不通过**（见 commit `5abe0a1`） | 2026-09-22 | SDDU Review Agent |
| **v2.0** | **R2 复审**（HEAD `13b7d76` / 基线 `5abe0a1`）：BLOCK-01~03 全部闭环（独立探针 13/13 + 两段证伪）；修复轮 diff 全量扫描（无双路径回归；journey 21 latent 修复正确，真机 171 PASS）；门禁抽跑 6 项 + 补跑 2 项全绿；红线/冻结面逐字节不变；新增 5 项低危观察（N-01~N-05）。**结论 ✅ 通过（0 阻塞，可进 validate）** | 2026-09-22 | SDDU Review Agent |
