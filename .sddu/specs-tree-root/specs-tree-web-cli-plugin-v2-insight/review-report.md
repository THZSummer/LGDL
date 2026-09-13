# 审查报告：specs-tree-web-cli-plugin-v2-insight（web-cli-plugin v2「any insight」· P0 = V2-1 / V2-2 / V2-3）

> **文档定位**: SDDU 审查报告（父 Feature 目录承载；**父 Feature 为轻量规范容器**，本报告汇总 V2-1/V2-2/V2-3 三个 P0 叶子的审查执行结果），作为 validate 阶段的输入
> **审查策略**: 本报告 §2 自主定义 C1~C22 审查清单（父 `spec.md` FR-V2-xxx / NFR-V2-xxx / EC-V2-xxx / AC-V2-xxx + 父 `plan.md` ADR-V2-001~015 + 实际产物）。**注**：本 Feature 目录未单独产出 `review.md` 策略文件（父 Feature 不执行 review；本报告由作者直接指派对 P0 三叶子执行），C1~C22 清单即在本报告内定义并可复核
> **前置依赖**: 父 `spec.md`（FR-V2-001~065 / NFR-V2-001~010 / EC-V2-001~016 / AC-V2-001~012）、父 `plan.md`（ADR-V2-001~015）、V2-1/V2-2/V2-3 `tasks.md` + `build.md` + `state.json`、实际代码与测试产物
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-13
> **审查轮次**: R1（P0：V2-1 `f564f44`+`ee5be97` / V2-2 `a1f9453`+`d2f2676` / V2-3 `f45c124`）
> **版本**: v1.0
> **更新时间**: 2026-09-13

---

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 提交区间 | `9f55d1b`（spec 立项）→ `f45c124`（V2-3 build）；V2 改动 60 文件 / +13714 −32 |
| 审查项总数 | 22（C1~C22） |
| 通过 | 21 |
| 改进（建议/提示，非阻塞） | 6 条建议 + 3 条提示（去重后归入 §7） |
| 阻塞问题 | **0** |
| 结论 | **⚠️ 有条件通过（0 阻塞）** |

**方法（本仓库 OOM 前科 → 静态为主 + 门禁串行，绝不并发）**：以**静态读码 / grep / 跨文件比对 / git diff** 为主；**门禁串行逐一执行**，**仅跑 node 单测**，**未跑** Chromium 类门禁（`test:ui` / `test:insight` / `test:binding` / `test:e2e` / `test:hardening`）——内存可用仅 ~947MB、仓库曾 ~1.5GB OOM，如实标注「未跑 + 原因」，不冒充其运行结果。

**本审查实际读/跑了什么（可复核）**：
- **读**：父/子 `spec.md`、父 `plan.md` ADR-V2-001~015、三个叶子 `build.md`/`state.json`、`docs/{dev,smoke-checklist}.md`、`ROADMAP.md`；源码 `src/insight/**`（6 文件）、`src/ui/tree/**`（4 文件）、`src/background/{insight-protocol,messaging,state-message,host,service-worker}.ts`、`src/ui/sidepanel/{sidepanel.ts,index.html}`；测试 `test/{insight-projection,insight-determinism,insight-catalog,insight-no-escalation,insight-security,tree-ops,tree-view,size-budget}.test.ts`、`test/size-baseline.ts`、`test/ui/{insight,binding}.mjs` 追加段。
- **跑（串行，node 单测；逐文件从 `dist-test/` 运行，不引用 build 声明）**：`size-budget`(8) / `insight-no-escalation`(12) / `insight-security`(5) / `insight-catalog`(6) / `insight-determinism`(5) / `tree-ops`(10) / `tree-view`(8) / `insight-projection`(20) —— **74 tests / 74 pass / 0 fail**。
- **跑（git 只读核验）**：`git diff --quiet` 退出码（见 §4/§5）、`git diff --stat/--numstat`、`git rev-parse main`、`git log`。
- **未跑**：Chromium 类门禁（见上）；`npm test`（全量 tsc+node）未整体复跑，改以逐文件运行新测试。

---

## 2. 逐项审查结果（C1~C22）

| # | 维度 | 审查对象 / 基准 | 结论 | 证据（file:line） | 严重度 |
|---|------|----------------|:----:|-------------------|:--:|
| **C1** | 安全红线 | 写路径=**封闭 7 动作白名单**，无默认写入分支 / 无 `grant` / 无命令级动作 | ✅ PASS | `TREE_ACTION_IDS` 恰 7 值：`src/ui/tree/tree-ops.ts:38-46`；`isTreeActionId` 运行时白名单：`:51-53`；`run()` 白名单外→`zeroOutcome` 零操作：`:276-282`；`switch` 无 `default:` 写入分支、类型不可达兜底仍零写入：`:295-312`；`grep grant|permissions.request` 仅命中**注释**：`:8`（`test/tree-ops.test.ts:182` 反向断言 `grant-origin`/`request-permission`/`command-allow` 非法） | 无 |
| **C2** | 安全红线 | `deny` 命令 `controls` 恒 `[]`；静态权限 `revocable:false` + 无 revoke 控件——**渲染模型层强制 + DOM 层无可渲染开关** | ✅ PASS | 渲染模型：`commandControls` deny⇒`[]`、非 deny 仅保留 `kind:'none'`：`src/ui/tree/tree-view.ts:251-254`；`capabilityControls` 静态⇒`[]`、可选仅已授予给 `revoke`、开关给 `toggle`：`:257-263`；`siteControls` 未授权⇒`[]`：`:269-280`。投影真值：静态 `revocable:false`+`controls:[]`：`src/insight/capability-catalog.ts:116-121`；命令 `controlsFor(deny)=[]`：`src/insight/command-catalog.ts:142-145`。DOM：`tree-drawer.ts` 只从 `row.controls` 生成、`kind==='none'` 渲染为 `<span>` 非按钮：`:286-309`；全树 `innerHTML` **0**（grep 空）。测试：`test/ui/insight.mjs:470-474,532-537`（真实 DOM `denyWithControls===0`） | 无 |
| **C3** | 安全红线 | 4 条硬底线 + `clipboard read` state 档 + `bookmarks remove` 不纳入自动授权：`policy.ts`/`auto-authorize.ts` **零 diff** | ✅ PASS | **本审查独立跑** `git diff --quiet 9f55d1b~1..f45c124 -- src/security/policy.ts src/security/auto-authorize.ts` → **exit 0**（区间级，非仅 worktree）；`PLUGIN_RISK_DEFAULTS` pinned：`test/insight-no-escalation.test.ts:66-75`；`AUTO_AUTH_DEFAULTS` pinned：`:181-183`；硬底线 pinned 逐条：`:185-211` | 无 |
| **C4** | 安全红线 | `AC-V2-005` 六条反向断言**真实作用于真实判定链**（`createPluginPolicyConfig`+`decideAutoAuthorization`+`host.dispatch`+`onAsk` spy），非自建 mock 自证 | ✅ PASS | `test/insight-security.test.ts` 用**真实** `createWebCliHost`（内部真实 `createPluginPolicyConfig`）+ **真实** `host.dispatch`：`:167-225`；`onAsk` spy 计数分类 allow/ask/deny：`:172-175,214-225`；六条断言：`:266-277`；撤销/关断后复验：`:289-310`；`decideAutoAuthorization` 纯决策面复验：`:283-286`。**唯一 mock 是 transport/ops（撤销动作的注入接缝）**，判定链本体为真实 | 无 |
| **C5** | 安全红线 | allow 单调性 `allowAfter ⊆ allowBefore` 的**计算方法有效、非空洞**（非决策表被自身实现构造） | ✅ PASS | 全表 9 条真实 ctx 跑真实 dispatch：`:82-92,216-225`；`subsetOf` 用 Set 判子集：`:249-252`；**逐条**「before≠allow ⇒ after≠allow」直接非升级断言：`:348-355`；**非空洞证明**（`changed[]` 必须真变化且从不为 allow）：`:316-331,356-360`；撤销后 `site-read`/`site-write-auto` 由 allow→deny、`bookmarks-remove` ask→deny 均真变化 | 无 |
| **C6** | 门禁真伪 | `size-budget.test.ts`：只吞 `ENOENT`、反证自测真会 FAIL、基线≠目标预算（`targetMet:null`） | ✅ PASS | **本审查实跑 8/8 pass**；只吞 ENOENT 实现：`test/perf-baseline.ts` `readArtifactSize`（`test/size-budget.test.ts:93-122` 注入 `ENOENT`/`EACCES`/裸 `Error` 断言）；反证自测：`:64-91`（`ceiling+1` 与 `1_073_454` 必须 FAIL + `assert.throws`）；`targetBudgetBytes/targetMet===null`：`:124-134`；v1 D31 不重定义：`:136-147`。**真实产出对账**：`dist/content.js=1,073,453B`（**恰等于** `CONTENT_MAX_BYTES` → 零增长成立）、`dist/sidepanel.js=1,110,744B`（见 §7 W4） | 无 |
| **C7** | 门禁真伪 | `insight-no-escalation`：`git diff --quiet` 冻结 + pinned 判定表——真会 FAIL；无 bare catch 吞断言 | ✅ PASS（附 1 建议） | **本审查实跑 12/12 pass**；`gitDiffStatus` 非零即 `assert.equal(...,0)` 失败、非 exit-num 错误直接抛出：`:92-103`；pinned 判定表：`:66-75,181-211`。**机制独立验证**：`git diff --quiet 9f55d1b~1 -- src/background/host.ts` → **exit 1**（差异确实触发）；`git diff --quiet HEAD -- policy.ts` → exit 0。**建议见 W3**：该门禁为 worktree-vs-index/HEAD，**不能**捕获「已提交的改动」 | 低 |
| **C8** | 门禁真伪 | 各新测试无 `assert.ok(true)` 空断言 / 永不触发分支 / 被 try-catch 吞掉的断言 | ✅ PASS | 全量 grep `assert.ok(true)`/`assert(true)`/`assert.pass` = **0**；`insight-*.test.ts`/`tree-*.test.ts`/`size-budget`/`ui/insight.mjs`/`ui/binding.mjs` 内 bare `catch {}` = **0**（唯一命中为 no-escalation 的门禁**字符串**与注释）；`size-budget` 的 dist 缺失为**显式 `t.skip` + 可见文案**（非静默 pass）：`:40-44,51-54` | 无 |
| **C9** | 测试零降级 | v1 `journey.mjs` **文件零改动**；`binding.mjs` **append-only（0 删除行）**；`#19*`/`#20*` 零冲突、`#21a…` 无撞号；v1 断言计数只增 | ✅ PASS | `git diff --stat ... -- test/ui/journey.mjs` **空**；`binding.mjs` `--numstat` = **222 / 0**（纯追加）；追加段单一插入点 `@@ -1358,6 +1358,228 @@`（位于 `phase1` 末尾、`#20f` 之后、`#10/#10b` 之前）；新编号 `#21a/#21a2/#21b…#21n`（含 `#21j/#21k`），与既有 `#19a~#19l`/`#20a~#20f` 零冲突；`check(` 计数 164→**181**（+17，只增）；新增段不改 v1 状态依赖（置末，其后仅 `#10/#10b` 页异常检查） | 无 |
| **C10** | 权限面 | `manifest.json` 零改动；`src/insight/**` 无 `chrome.*` 越权读、无写 store、无 `apiKey` | ✅ PASS | `git diff 9f55d1b~1..f45c124 -- manifest.json` **空**；`grep chrome\. src/insight/ src/ui/tree/` **0 命中**；`src/insight` 无 `create{OriginStore,CapabilitySettingStore,TabsSettingStore,StorageAuditSink,ChromeAsyncKv,ChromeSessionKv}` 导入、无 `../background/` 导入；无 `apiKey`（`test/insight-no-escalation.test.ts:37-57,130-151,213-221` 实跑通过） | 无 |
| **C11** | 零明文 | 回执/审计/投影输出不含 key 明文 / 剪贴板内容 / 通知正文 / URL query / bookmark 标题 | ✅ PASS | `tree-receipt.ts` 无 `catch`、只透传既有 `OpResult.text`（v1 已掩码）：`:1-17,108-137`；`tree-ops.ts` 只透传 ops 结果、不构造敏感量：`:1-19`；投影只消费 `LlmStatusSummary`（零明文）：`project-tree.ts:132-182`；序列化快照零明文断言：`test/insight-projection.test.ts:454-468`（`/sk-|apiKey|token/`、clipboard/notification/`?q=`/路径 全 0）；no-escalation 零明文段实跑通过 | 无 |
| **C12** | 无静默失败 | 撤销失败可读；`tree-ops` 失败路径 `kind:'err'` 且**不产生部分写入**；确认被拒**零操作** | ✅ PASS | 站点撤销**分别**如实报告 `revoked`/`hostPermissionRemoved`/`contentScript`：`tree-ops.ts:207-220`；transport 异常/后台失败/缺 target → `kind:'err'`：`:195,202,204,225,236,246,255,267`；确认未显式 ⇒ `zeroOutcome`（不发消息/不调 ops）：`:287-293`；`finish()` 中 `unverifiedEvidence` 不冒充已移除：`tree-receipt.ts:70-78`。单测：`test/tree-ops.test.ts:219-228`（白名单外零写入）、`:234-250`（未确认零操作）、`:272-305`（≥4 类可读失败）、`:321-337`（证据来自重拉实测） | 无 |
| **C13** | 确定性/对账 | `project-tree` 纯函数（无 `chrome.*` / 无 IO）；hash 稳定（`builtAt` 不进 hash）；34 工具 / 142 子命令对账**真与 v1 parity 同源** | ✅ PASS | 纯投影：`project-tree.ts:274-344`；hash 输入不含 `builtAt`：`:317-327`；同源单一基线模块：`catalog-reconcile.ts:19-20,81-88`（**不新建第二份基线**）；V2 与 v1 引用**同一路径字面量**锚定：`test/insight-catalog.test.ts:241-248`；34/142 + 全 SHA provenance：`:185-194`；双向对账 + 反证（丢 `dom`/`chrome screenshot`/加新工具）：`:208-239`。实跑 5/5 + 6/6 pass | 无 |
| **C14** | 规范符合 | `FR-V2-023`/`AC-V2-002` 口径订正后**内部无残留矛盾**（grep 全目录 `65.5%`/`589` 等） | ⚠️ WARN | 父 `spec.md` 的 `AC-V2-002`（`:322,324`）+ `FR-V2-023`（`:218`）+ `§2.5`（`:131`）已统一为「≥589px 主 + ≥65.0% 次 + 去镀铬测量条件」。**残留（未订正）**：子 `specs-tree-v2-2-floating-tree-ui/spec.md:56,88` 与 `state.json:20`、`ROADMAP.md` v1.20.0 素材行仍写「≥65.5%」；均属**历史/叶子快照**、非今日阈值（父 spec 为权威） | 低 |
| **C15** | 架构一致 | ADR-V2-001~015 无被实现违背（含 ADR-V2-008 撤销面白名单/导入约束） | ✅ PASS | 纯投影(001/002/003)、additive 消息(004)、覆盖式 FAB/抽屉(005)、量化口径(006)、体积守卫(007)、白名单编排(008)、三件套回执(009)、同源 parity(010)、渲染结构保证(011)、V2-4 预留位(012)、二次确认(013)、`delayConfig()` 只读 accessor(014)、导入白名单/禁改面(015) 逐条比对实现一致。**D-V23-01 偏离 plan §6「既有 case 零改动」**（见 §3）但有 ADR-V2-008 + FR-V2-030 支撑并已披露 | 无 |
| **C16** | 文档漂移 | `docs/{dev,smoke-checklist,capability-matrix,compliance}.md`、各 `build.md`、`state.json`、`ROADMAP.md` 与实现一致；v1 目录零改动 | ✅ PASS（附 1 提示） | `docs/dev.md` §11.3 追加 D-V22-01 口径订正表（**只增不改**，历史 `589px=65.5%` 保留）：`dev.md:507-512`；`smoke-checklist.md` §5/§6 新增 v2 人工面 + 偏差披露：`:81-110`；v1 SDDU 目录 `git diff --quiet ... -- specs-tree-web-cli-plugin/` → **exit 0**。**提示 W5**：`specs-tree-v2-2-floating-tree-ui/build.md:119` 的 before 值 `1,065,389` 与同文件 `:124`/`spec`/`dev.md` 的 `1,068,165` 不一致（+20,000 为整数，见 §7） | 低 |
| **C17** | 红线 | `packages/web-cli-base/**` 零改动、无新依赖、`.opencode/opencode.json` 未提交、无 force push、`main` 未动 | ✅ PASS | `git diff --quiet ... -- packages/web-cli-base` → **exit 0**；`git diff --stat -- '**/package.json'` 仅 `+1` 行（`test:insight` script，**依赖零新增**，无 lockfile 变更）；`git diff --name-only ... -- .opencode/opencode.json` **空**；`main` = `2ddc92299ad10cfe0ea2b65403243a45ce7fb041`（未动）；区间内 **0 merge commit**；`origin/feature/web-cli-plugin == f45c124`（未 force push） | 无 |
| **C18** | 贴边处置 | **D-V21-01**（`insight-*` 不入共享 `KIND_SET`，改 `insight-protocol.ts` 独立校验）独立复核 | ✅ PASS（有保留） | `insight-protocol.ts:13-22` 的校验强度（`typeof kind==='string' && set.has`）**等同**原 `isPluginMessage`：`messaging.ts:75-79`；SW 入口用**并集**放行：`service-worker.ts:2237`（`!isPluginMessage && !isInsightMessage` ⇒ 拒绝），**无「未校验即放行」**；两集合**不相交**、并集 == 受支持 kind 集。content.js 实测 `1,073,453B` **零增长**，手法达成立项红线。**保留**：新增未被任何单测导入的独立校验路径，缺一致性/行为测试（见 W2） | 低 |
| **C19** | 贴边处置 | **D-V22-01**（陈旧基线 589px → 「去镀铬稳态」674px/74.9%）独立复核 | ✅ PASS（有保留） | 条件**明确定义且可复现**（同一段 JS：隐藏 `#site-hint`/`#onboarding`/`#discovery-notice`/`#consent-slot`/`#send-reason`）：`test/ui/insight.mjs:168-208`；已写进父 `spec.md:218,324` + `dev.md:507-512` + `smoke-checklist.md`，**只增不改、历史保留**。零回归由**更强**独立断言承担：v1 口径 `#log ≥405px`：`insight.mjs:386-392`、抽屉开/关**逐字段 drift==0**：`:539-552`、`flex-grow==='1'`+溢出 0：`:240-264`、320px 窄栏：`:570-587`。**保留**：de-chromed 589px 为口径选择后的结果，且 v1 口径仅断言 ≥405px（实测 418px，余量 13px）而无 pinned v1 基线（见 W6） | 低 |
| **C20** | 贴边处置 | **D-V23-01**（`service-worker.ts` `case 'revoke'` 追加一行 `host.deactivateSite()`）是否必要且最小 | ✅ PASS | 仅当被撤销 origin == 当前绑定 origin 时触发：`service-worker.ts:1769`；复用既有 `deactivateSite()`（注销 site 工具、清 descriptor，**幂等**）：`host.ts:485-491`；**只收紧**（工具出 `deriveTools()`）、不新增 `case`/消息/判定路径；未授权 origin 经 tab-follow 不会重注册。**必要且最小**：无既有其它通路能在绑定 origin 被撤销后即时清空 router 站点工具（`revoke` 处理器原先只做 content-script 注销 + `OriginStore.revoke` + 停 autoProbe） | 无 |
| **C21** | 贴边处置 | 能力撤销「成功路径」未被 V2-3 binding 自动化——覆盖缺口是否如实、是否真有覆盖 | ✅ PASS（附 1 提示） | 如实披露：`test/ui/binding.mjs` 追加段 `#21j/#21k` 断言**失败路径**（预授为静态权限→`permissions.remove` 不可移除→可读失败 + 不假成功），无控件时 `observe(...跳过：如实记录，不伪造 PASS)`（diff 段），**无假绿**。底层成功链有 v1 既有自动化：`#0l`（真实 `permissions.remove` 解析 true）/`#0m`（`contains=false`）/`#0n`（工具移出 `deriveTools`）/`#0o`（撤销审计）：`test/ui/binding.mjs:544-562`。**提示 T1**：v1 断言覆盖「权限 API→工具面」链，但**未**覆盖「树 `revokeCapability`→该链」的真实端到端（树侧仅单测 + 失败路径 e2e） | 低 |
| **C22** | 贴边处置 | `test:ui` 首跑 `#3c` 偶发失败 / NFR-007 墙钟偶发（V2-1 轮 288ms）——环境抖动 vs 新引入 | ✅ PASS | `#3c` 位于 v1 `journey.mjs`（**v2 零改动**）：`journey.mjs:366`「全新安装显示尚未配置 API Key 提示」，依赖异步 storage 就绪，抖动为 v1 既有；NFR-007 墙钟阈值抖动 v1 既有（R5 已登记、隔离重跑通过）。两者均**已如实登记**（V2-2/V2-3 `build.md`/`state.json`），**非 v2 新引入**、**不遮** | 无 |

---

## 3. 五项「贴边处置」独立复核结论（接受 / 不接受 + 理由）

1. **D-V21-01（`insight-*` 不入 `KIND_SET`）→ ✅ 接受（附建议 W2）**。校验强度等同、SW 入口并集放行、无未校验放行；两集合不相交。为守 `content.js` 零增长红线（实测 1,073,453B 恰等上限）而引入**第二条校验路径**，手法正当性成立（union 为编译期零成本，仅 `KIND_SET` 数组才占 runtime 字节），**未掩盖真实体积问题**：`background.js` 增长 `+30,186B`（v1 1,372,225 → 1,402,411）为投影/快照代码本应所属，`content.js` 1.07MB（超 64KB ≈16×，D31）**不在 v2 范围**（NG-V2-007）且未伪装解决。**保留**：`isInsightMessage` 无任何单测、两路径一致性无门禁 → 建议加一条 pin 测试。
2. **D-V22-01（去镀铬稳态）→ ✅ 接受（附建议 W6）**。条件**明确定义、可复现、已写入 spec/AC**（父 `spec.md:324` + `dev.md` + smoke-checklist），**只增不改、历史数值全保留**，不构成「改数字让门禁变绿」（589/65.0% 仍为硬下限，且去镀铬下实测 674px 远超）。**但**：589px 原为 TASK-023 时代口径，当日仅隐藏导航条时 `#log=418px` → 该「不回退」绝对量已不可比；「无回归」实际由 **`≥405px`（v1 自身下限）+ 开/关 drift=0** 承担。`drift=[]` 证明的是**同一 build 内抽屉开关不改几何**，**不等于** v2 相对 v1 无回退；`≥405px` 距实测 418px 仅 13px 余量 → 存在「平均通过、小幅回退仍绿」的盲区。**建议**：登记 v1 同条件 raw 实测（418px/46.4%）为 pinned 基线并断言 v2 raw ≥ 该基线。
3. **D-V23-01（`deactivateSite()` 一行）→ ✅ 接受**。经复核：仅绑定 origin 被撤销时触发、复用既有幂等 seam、**只收紧**、不新增判定路径，与 ADR-V2-008（撤销面=既有 ops 白名单编排、永不新增判定路径）一致；**无副作用/回归**（`deactivateSite` 只清 router 注册与描述符，不解授权、不写审计）。**必要且最小**：FR-V2-030 要求「工具面即时移出」，而 v1 `revoke` 处理器原无任何清 router 站点工具的路径；树侧无其它既有通路可替代。**轻微偏离** plan §6「既有 case 零改动」的字面，但已被 ADR-V2-008 覆盖并如实披露（D-V23-01）——**不改判**。
4. **能力撤销成功路径缺口 → ✅ 接受（附提示 T1）**。缺口**如实披露**且 binding 追加段**无假绿**（无控件时显式 `observe 跳过`，不伪造 PASS）；「成功移除→工具即时移出」在 v1 `#0l/#0m/#0n/#0o` **确有其自动化**（真实 `permissions.remove` + `contains=false` + 工具移出 + 审计）。**保留**：树侧 `revokeCapability` 的**真实端到端成功**未被自动化（仅单测 + 失败路径 e2e），建议 validate 补一条或依赖人工面 V2-H-4。
5. **偶发失败（`#3c` / NFR-007 墙钟）→ ✅ 接受**。均为 **v1 既有脆弱点**（`journey.mjs` 与 `perf-budget` 在 v2 前即存在，R5 已登记墙钟抖动），v2 **未新增**该不稳定；且**已如实登记**（build.md/state.json），未遮掩。**建议**：validate 若复跑，沿用「首跑抖动 → 隔离重跑」的登记法，不把抖动当功能回归，也不隐去。

---

## 4. 安全红线逐条独立验证结果（最高优先）

| 底线 | 判定 | 本审查证据（不引用 build 自述） |
|------|:--:|------|
| 写路径 = 封闭 7 动作白名单 / 无默认写入 / 无 `grant` | ✅ | `tree-ops.ts:38-53,276-314`；`grep -n "grant\|permissions.request" tree-ops.ts` 仅注释行 `:8` |
| `deny` 节点 `controls` 恒 `[]` | ✅ | `tree-view.ts:251-254` + `command-catalog.ts:142-145` + DOM `tree-drawer.ts:286-309`；真实 DOM 断言 `insight.mjs:532-537` |
| 静态权限 `revocable:false` + 无 revoke 控件 | ✅ | `capability-catalog.ts:116-121` + `tree-view.ts:257-263`；`test/insight-projection.test.ts:507-514` |
| **`git diff --quiet`（本审查实跑退出码）** | ✅ | `9f55d1b~1..f45c124 -- policy.ts auto-authorize.ts` = **0**；`-- manifest.json` = **0**；`-- packages/web-cli-base` = **0**；`-- specs-tree-web-cli-plugin/` = **0**；对照：`9f55d1b~1 -- host.ts` = **1**（证明机制有效） |
| ① 未授权 origin 仍 `deny`（S1） | ✅ | `insight-security.test.ts:266`（真实 dispatch）；`policy.ts:73-84`（零 diff） |
| ② 未知/非法 risk 仍 `deny`（S3 fail-closed） | ✅ | `insight-security.test.ts:268`；`decideAutoAuthorization` hardDeny：`:199-201,285` |
| ③ `evaluate` 仍 `deny` | ✅ | `insight-security.test.ts:270,284`；`policy.ts:47`（`evaluate:'deny'`，零 diff） |
| ④ 破坏性写仍 `ask`（非自动） | ✅ | `insight-security.test.ts:272-273`；且断言**零** `auto-authorize/allow` 审计：`:279-282` |
| ⑤ `clipboard read` state 档永不自动放行 | ✅ | `insight-security.test.ts:275`；no-escalation `ui/state/external` 永不 auto-allow：`:202-208` |
| ⑥ `bookmarks remove` 不纳入写自动 | ✅ | `insight-security.test.ts:277`；撤销后 `notEqual(after,'allow')`：`:309` |
| **AC-V2-005 断言真实性** | ✅ | 真实 `createWebCliHost` + 真实 `host.dispatch` + 真实 `onAsk` spy 分类（`insight-security.test.ts:108-240`）；判定链本体非 mock（mock 仅注入 ops/transport 撤销接缝） |
| **allow 单调性有效性** | ✅ | `allowAfter ⊆ allowBefore`（Set 子集 `:249-252`）+ 逐条非升级直断 `:348-355` + `changed[]` 非空洞 `:356-360` + 幂等二次收敛 `:364-374`；实跑 5/5 pass |
| **SW 零 `permissions.request`（tree 面）** | ✅ | `src/ui/tree/**` 无 `permissions.request`（grep 空）；`tree-ops.ts:158` 注释声明 revoke-only |

**结论：安全红线结构性成立，零放宽、零绕过、零假绿。**

---

## 5. 门禁真伪复核（有无虚绿 / 空断言 / bare catch；能否真 FAIL）

| 门禁 | 本审查实跑 | 反证 / 可证伪性 | 虚绿风险 |
|------|:--:|------|:--:|
| `size-budget` | ✅ 8/8 | 内置反证 `ceiling+1`/`1_073_454` 必须 FAIL + `assert.throws`；`ENOENT`-only 经注入 `EACCES`/裸 `Error` 断言 | 无 |
| `insight-no-escalation` | ✅ 12/12 | `git diff` 非零即断言失败、异常直接抛；判定表 pinned；**机制经退出码实测** | 无（但冻结语义弱，见 W3） |
| `insight-security` | ✅ 5/5 | 六条反向断言 + 单调性非空洞 | 无 |
| `insight-catalog` | ✅ 6/6 | 丢 `dom`/`chrome screenshot` + 加 `brand-new-tool` 必须被拦 | 无 |
| `insight-determinism` | ✅ 5/5 | hash 跨 `builtAt` 全等 + 集合乱序 hash 不变 | 无 |
| `insight-projection` | ✅ 20/20 | 静态权限/开关键与 manifest/默认值锚定；零副作用 diff 空；零明文 | 无 |
| `tree-ops` | ✅ 10/10 | 白名单外零写入 spy 计数 = 0；未确认零操作；失败 kind:'err' | 无 |
| `tree-view` | ✅ 8/8 | 纯渲染模型结构保证 | 无 |

- **无 `assert.ok(true)` 式空断言**（全量 grep 0）。
- **无 bare `catch {}` 吞断言**（新测试 grep 0；`size-budget` 的 dist 缺失为显式 `t.skip`）。
- **两门禁确实能 FAIL**：`size-budget` 反证自测真抛（本审查实跑）；`insight-no-escalation` 的 `git diff` 机制经退出码独立验证（差异 → exit 1）。
- **测试副本 / 距真实 dist**：`insight.mjs`/`binding.mjs` 均加载真实 `dist/`（dist 存在性检查，缺失即 exit 1）；`binding` 临时副本偏差沿用 v1 既有披露。

---

## 6. 测试零降级核验证据

| 项 | 证据 |
|----|------|
| v1 `journey.mjs` 零改动 | `git diff --stat 9f55d1b~1..f45c124 -- test/ui/journey.mjs` → **空** |
| `binding.mjs` append-only | `git diff --numstat` = **222 / 0**（0 删除行）；单一插入点 `@@ -1358,6 +1358,228 @@`（`phase1` 末，`#20f` 后） |
| 编号无冲突 | 新增 `#21a/#21a2/#21b…#21n`（含 `#21j/#21k`）；与既有 `#19a~#19l`/`#20a~#20f` 零冲突（追加段注释亦声明 TD-V23-01） |
| v1 断言计数只增 | `check(` 164（base）→ **181**（+17）；追加段后 v1 的 `#10/#10b` 仍在 |
| v1 单测零删减 | 新测试全部落**新文件**（8 个）；v1 `parity.test.ts`/`parity/**`/`perf-*`/`journey.mjs` 零 diff（`insight-no-escalation.test.ts:117-123` 含 `test/parity` 零 diff 断言） |
| `index.html`/`sidepanel.ts` 追加 | v2 仅 append（build 声明），本审查未逐行核验其 0 删除；`options.html` 零 diff（`git diff --stat` 空，C17） |

---

## 7. 问题清单

### 阻塞问题：0 个
未发现安全底线违规、无功能阻断、无未审批权限、无判定链改动、无 base/v1/main 越界。

### 建议（非阻塞，低）

| # | 项 | 严重度 | 为何不阻塞 |
|---|----|:--:|------|
| **W1** | **口径订正残留**：子 `specs-tree-v2-2-floating-tree-ui/spec.md:56,88` 与 `state.json:20`、`ROADMAP.md` v1.20.0 素材行仍写「≥65.5%」，与已订正的父 `spec.md`/ADR-V2-006 不一致 | 低 | 父 spec 为权威权威条文；残留属历史/叶子快照，代码门禁不受影响。建议下一轮文档打扫补一条「以父 spec 为准」指针（不删历史） |
| **W2** | **`insight-protocol` 缺测试**：新增独立校验路径无任何单测导入；两校验集合（`KIND_SET` ∪ `INSIGHT_KIND_SET` == 受支持 kind）一致性无门禁 | 低 | 当前并集 == 受支持集，且 SW 入口并集放行、无未校验放行；属**可维护性/防漂移**建议。建议加 1 条 pin 测试 + `isInsightMessage` 非法输入拒绝断言 |
| **W3** | **冻结门禁语义偏弱**：`insight-no-escalation` 的 `git diff --quiet`（worktree-vs-index/HEAD）在提交后恒 0，**不能**捕获「已提交的 policy/auto-authorize 改动」 | 低 | 已有 `PLUGIN_RISK_DEFAULTS`/`AUTO_AUTH_DEFAULTS`/硬底线行为 pin 兜底；且本审查以**区间级** `git diff --quiet 9f55d1b~1..f45c124` 独立证实零 diff。建议改为「对照 v1 validated 提交（如 `5f86853`）」或文件哈希 pin |
| **W4** | **sidepanel 基线未随 V2-3 重登**：`SIDEPANEL_BASELINE_BYTES=1,085,389`（V2-2 值）≠ 实际 `dist/sidepanel.js=1,110,744`（V2-3 值）；守卫经 `1,139,658` 上限仍通过，但有效余量 ~29KB 大于声明的 5% | 低 | 非假绿（未掩盖违规），且 V2-3 `build.md` 已如实披露「V2-2 基线 + 5% 容差」。建议 V2-4 前把基线重登为当前实测并注明日期 |
| **W5** | **V2-2 `build.md` 体积 before 数字不一致**：`:119` 写 `1,065,389 → 1,085,389 (+20,000)`，同文件 `:124`/父 spec §2.5/`dev.md:190` 为 `1,068,165`（差 2,776B；且 v1→v2 实增 `17,224B` 被记为整数 `+20,000`） | 低 | 代码真值 `size-baseline.ts` 正确；属文档内部数字不自洽 |
| **W6** | **「无回归」缺 pinned v1 同条件基线**：`insight.mjs` 仅断言 raw `#log ≥405px`（实测 418px，余量 13px），无「v2 raw ≥ v1 raw（418px）」的对照断言 | 低 | `flex-grow=1` + 溢出 0 + 开/关 drift=0 + 覆盖层为 absolute 子元素，结构上回退风险低。建议登记 v1 raw 实测并加对照断言，消除该盲区 |

### 提示（非阻塞，低）

| # | 项 | 说明 |
|---|----|------|
| **T1** | 树侧能力撤销**成功**端到端未自动化 | v1 `#0j~#0o` 覆盖「权限 API→工具面」链；树 `revokeCapability`→该链仅单测 + 失败路径 e2e。建议 validate 补自动化或明确归人工面 V2-H-4 |
| **T2** | `pushInsightChanged()` 用 `void ... .catch(() => {})` | 火并忘推送的最佳努力语义（无接收方为正常态），与既有 `capability-changed` 推送同款；**不在** `insight-no-escalation` 的扫描目录内，故不被其 bare-catch 门禁触及。建议注释点明「推送失败无接收者属正常」以免被视为吞错 |
| **T3** | 投影 `deriveAction` 为**策略映射的再实现**（只读消费 `PLUGIN_RISK_DEFAULTS`） | 当前 S2 ask 档 ⊂ `riskDefaults` ask 档，故 action 等价；等价性依赖 policy 冻结，未机器钉死「投影 action == 真实 policy action」。可选地加一条 cross-check |

---

## 8. 未覆盖项 / 偏差（如实）

- **未独立跑 Chromium 类门禁**（`test:ui` / `test:insight` / `test:binding` / `test:e2e` / `test:hardening`）：内存可用仅 ~947MB、仓库曾 ~1.5GB OOM → 遵守「串行/绝不并发」纪律**未跑**。故 `AC-V2-002` 量化/`AC-V2-003` 撤销链/`AC-V2-008` 树独立开合/`AC-V2-011` 全仓 0 fail 的**运行结果**以 build 声明为准，**不冒充其 PASS**；其**断言存在性与逻辑**经本审查静态逐条核验（§2 C9、§3.2、`insight.mjs`/`binding.mjs` 全文阅读）。
- **未整体复跑 `npm test`**：改以逐文件运行 8 个新测试（74/74 pass）。全量测试总数（build 声明插件 599 / v1 577 零删减 +22）未独立核对；`web-cli-base 483 零回归`未复跑（`packages/web-cli-base` 零 diff 已证实，故计数结构性守恒）。
- **未深查**：`tree-drawer.ts` 全部 DOM 事件/焦点管理的逐行正确性（属 validate 动手面）；`index.html`/`sidepanel.ts` 追加段的 0 删除行（build 声明 append-only，本审查仅核验 `options.html`/`journey.mjs`/`binding.mjs` 的 diff 事实）。
- **本 Feature 目录无独立 `review.md` 策略文件**：C1~C22 清单直接定义于本报告 §2；`state.json` 的 `files.review` 字段无有效指向（父 Feature 不执行 review）。若收口需严格对齐 ADR-004 双文件，建议补一份 `review.md` 或在收口注记中说明。
- **headless 无法覆盖**：真实授权弹窗 / 原生 `tabs.goBack/goForward` / 剪贴板真读焦点 / 悬浮观感/动画/明暗/窄栏字重 / 多显示器 DPI — 沿用 `smoke-checklist.md` §5/§6 人工面 V2-H-A~D / V2-H-1~6，**未冒充 PASS**。

---

## 9. 总体结论

**结论：⚠️ 有条件通过（0 阻塞；6 建议 + 3 提示，均低）**

| 指标 | 结果 |
|------|------|
| V2-1 / V2-2 / V2-3 P0 覆盖 | 投影(FR-V2-010~017) / 悬浮树(FR-V2-020~025) / 撤销面(FR-V2-030~040 + SEC) **均有实现与对应门禁断言** |
| 安全红线（§4 逐条） | **全部 PASS**：封闭 7 动作白名单 / deny 不可关 / 静态权限不可撤销 / 4 硬底线 + clipboard read + bookmarks remove 零放宽 / 判定链零 diff（区间级 exit 0）/ AC-V2-005 断言真实 / allow 单调性非空洞 |
| 门禁真伪（§5） | 8 门禁实跑 **74/74 pass**；两关键门禁**可 FAIL**；无空断言 / 无 bare-catch 吞断言 / 无虚绿 |
| 测试零降级（§6） | v1 `journey.mjs` 零改动；`binding.mjs` 222/0 append-only；编号零冲突；断言计数只增 |
| 权限面 / 红线 | manifest 零 diff / base 零 diff / 无新依赖 / `.opencode/opencode.json` 未提交 / main 未动 / 无 force push —— 全 PASS |
| 文档漂移 | ⚠️ 口径订正残留（W1）+ V2-2 build.md 数字不自洽（W5），均低、代码为真值 |
| 新增阻塞 | **0** |

**判定理由**：v2 的三项 P0 交付本质是「只读投影 + 覆盖式悬浮 UI + 就地调用既有 fail-closed ops」。经**独立读码 + 区间级 git diff + 8 门禁实跑**核验：安全红线**结构性成立**（写路径封闭白名单、无默认写入分支、无 `grant`、判定链文件零 diff、AC-V2-005 六条反向断言作用于真实判定链且 allow 单调性非空洞）；`content.js` 实测恰等上限（零增长）、`manifest`/`base`/v1 目录/options 零 diff、依赖零新增；测试零降级（append-only + 编号无冲突 + 只增）。四项「贴边处置」（协议拆分 / 去镀铬口径 / service-worker 一行 / 能力撤销成功路径缺口）**逐项接受**——均为在硬红线约束下的**披露充分、最小、只收紧**的取舍，未发现假绿或掩盖。剩余 6 建议 + 3 提示均为**文档口径/防漂移/门禁加固**层面，**不阻塞**进入 validate；其中 W1/W5 建议在下一轮文档打扫一并订正，W3/W6 建议在 validate 补对照断言。据此判为**有条件通过**（非「通过」），可进入 `@sddu-validate` 动手验证。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | R1 审查：web-cli-plugin v2 P0（V2-1 `f564f44`/`ee5be97` + V2-2 `a1f9453`/`d2f2676` + V2-3 `f45c124`，区间 `9f55d1b..f45c124`）。C1~C22 逐项；安全红线逐条独立验证（区间级 `git diff --quiet` 退出码 / AC-V2-005 真实性 / allow 单调性有效性）；门禁真伪复核（8 门禁实跑 74/74 + 反证能力）；测试零降级证据；五项贴边处置独立复核（D-V21-01 / D-V22-01 / D-V23-01 / 撤销成功路径缺口 / 偶发失败）；问题清单 6 建议 + 3 提示。**结论 ⚠️ 有条件通过（0 阻塞）** | 2026-09-13 | SDDU Review Agent |

---

# 审查报告（续 · R2 段）：web-cli-plugin v2 真层级树 + 命令级覆盖层

> **文档定位**: 本段为**追加轮次 R2**（post-validate 修订轮）的审查执行结果，**不覆盖 R1**（R1 段见上方）
> **审查策略**: 本段自主定义 **C1~C22（R2）** 审查清单（父 `spec.md` v2.0 §5.7 `FR-V2-070~079` + `AC-V2-020~027` + `NG-V2-001R` + `NFR-V2-011/012` + `EC-V2-017~020`；父 `plan.md` §9/§10 `ADR-V2-024~033`；实际产物）
> **前置依赖**: 父 `spec.md`（v2.0）/ `plan.md`（v2.0）/ `build.md`（R2 第 1、2 轮）；V2-1/V2-2/V2-3/V2-4 R2 修订；代码与测试产物
> **审查创建时间**: 2026-09-13
> **审查区间**: `a955a7f`（R2 spec）→ `ff32683`（R2 build 第 2 轮 + hash 回填），含 `7617687`（plan）/ `76d0d61`（tasks）/ `ce60fd1` + `493f9d0`（build 1）/ `e35d852` + `ff32683`（build 2）

## R2-1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 提交区间 | `a955a7f`（R2 spec）→ `ff32683`；R2 改动 60 文件 / +9329 −584（含 R2 spec/plan/tasks/build 文档） |
| 审查项总数 | 22（C1~C22 R2） |
| 通过 | 19 |
| 改进（非阻塞） | 4 建议（A1~A4）+ 8 提示（A5~A8 / T1~T4） |
| 阻塞问题 | **0** |
| 结论 | **⚠️ 有条件通过（0 阻塞）** |

**方法（本仓库 OOM 前科 → 静态为主 + 门禁串行，绝不并发）**：以**静态读码 / grep / 跨文件比对 / 独立哈希与计数复算**为主；**仅串行实跑 node 门禁**（`npm test`）；**未跑** Chromium 类重门禁（`test:ui` / `test:insight` / `test:binding` / `test:e2e` / `test:hardening`）——遵守「串行/一次一个/绝不并发」纪律，其运行结果以 build 落盘日志为据并**如实标注「未由本审查重跑」**，不冒充。

**本审查实际读/跑了什么（可复核）**：
- **读（R2 产物）**：父 `spec.md`（v2.0 §5.7/§2.2b/§8/§9）、父 `plan.md`（§9 技术设计 + §10 `ADR-V2-024~033` 全文）、父/四叶 `build.md`（R2 第 1、2 轮）、`state.json`（`revisionRounds.R2`）、`docs/{dev,smoke-checklist,capability-matrix}.md`。
- **读（代码）**：`src/security/command-override.ts`（445 行全文）、`src/insight/ownership-tree.ts`（355 行全文）、`src/insight/{tree-model,command-catalog,project-tree,build-snapshot,archive-catalog}.ts`、`src/background/{host,service-worker,messaging,insight-protocol,state-message}.ts`、`src/ui/tree/{tree-view,tree-drawer,tree-ops}.ts`、`src/ui/sidepanel/index.html`（R2 增量）、base `src/{permission,dom-tools}.ts`、`src/tools/declared-tools.ts`。
- **读（测试）**：`test/{insight-tree-hierarchy,command-override,insight-override-security,tree-view,tree-ops,insight-archive,insight-no-escalation}.test.ts`、`test/{size-baseline,size-budget}.test.ts`、`test/ui/{insight,binding}.mjs`（R2 增量逐段）。
- **跑（串行，node 单测）**：`npm test`（插件）→ **690 tests / 690 pass / 0 fail / EXIT=0**（完整日志 `/tmp/opencode/r2-npmtest.log`，本审查生成）；含 R2 新增 `command-override`(16) / `insight-override-security`(10) / `insight-tree-hierarchy`(12) 与 `insight-archive` / `tree-ops` / `tree-view` / `insight-no-escalation` 全部 pin 断言。
- **跑（只读核验）**：`sha256sum src/security/{policy,auto-authorize}.ts`、`git diff --stat/--name-only`（base/manifest/package/content/journey/v1）、`git diff -U0 | grep -E '^-[^-]'`（取代台账）、独立复算 `TREE_ACTION_IDS`/`TREE_NO_ESCALATION_NOTE`/tree 模块 sha256（node）、静态计数 `check(`/`test(`。
- **未跑**：`test:ui` / `test:insight` / `test:binding` / `test:e2e` / `test:hardening`（Chromium 类，重；本审查内存纪律下不跑）——其结论引用 build 落盘日志 `/tmp/opencode/r2-2/logs/final-04/05/07c/08.log`（本审查已抽读核验关键行，见 R2-3）。

---

## R2-2. 逐项审查结果（C1~C22 R2）

| # | 维度 | 审查对象 / 基准 | 结论 | 证据（file:line / 命令） | 严重度 |
|---|------|----------------|:----:|--------------------------|:--:|
| **C1** | 代码质量 | `command-override.ts` clamp 引擎：纯函数、`clampReason` 完备、无硬编码魔法值 | ✅ PASS | `clampActionForRisk`（:95-113）/`resolveCommandPolicy`（:130-156）纯函数 + kv 注入零 `chrome.*`；`ClampReason` 7 值穷举；`policy.ts`/`auto-authorize.ts` **零 import**（:5-7 声明，实码未导入） | 无 |
| **C2** | 代码质量 | 存储生命周期：单键整对象写 / 无半写 / 写成功才提交内存 / 串行队列 / 同值幂等 / 读失败降级 / 审计零明文 | ✅ PASS | `createCommandOverrideStore`（:299-444）；`enqueue` 串行（:310-318）；`persist` 后 `entries=next`（:380）；同值 early-return 不写不审计（:368-370）；读失败 `entries=new Map()`+degraded（:336-341）。实跑 `command-override` 16/16（含半写 :352-362 / 并发 :364-381 / 读降级 :383-395 / 弱文档 :397-410 / 审计零明文 :412-430） | 无 |
| **C3** | 规范符合 | **FR-V2-070 真树形**：父子层级（非扁平 `rows`）+ 扁平零残留 | ✅ PASS（附偏差 A3） | `buildOwnershipTree` 输出嵌套 `children`（ownership-tree.ts:218-334）；UI 无 `.rows`/无扁平 fallback（`buildTreeRows` :684-694 恒用 `snapshot.ownershipTree.root`）；真实 DOM #I-20b 逐层 `支持的命令→系统内置命令→dom→dom read-state` 通过；#I-20c 惰性收起。`meta.modelNote` 旧「森林」文案未渲染（DOM `#I-11a` 零命中） | 低 |
| **C4** | 规范符合 | **FR-V2-071 多归属不复制** | ✅ PASS（附建议 A2） | `cap:opt:bookmarks` 全树恰 1（`collectOwnershipNodes` 过滤 `nodeId` 长度=1，insight-tree-hierarchy.test.ts:177-178）、`mainOwner='capability'`（:179）、`crossRefCount>=1` + 可读「亦被…命令面」（:180-184）；全树 `nodeId` 唯一（:161-168）；跨引用下钻同一 `nodeId`（`ownershipNodeFor` :348-349）。**无「复制后去重」迹象**：site-declared 命令以 `claimed` 只落站点面（ownership-tree.ts:243-249/273） | 低 |
| **C5** | 规范符合 | **FR-V2-072/073 展开语义 + 键盘 + 路径 + 122 卡** | ✅ PASS | `aria-expanded`/`aria-level`/roving tabindex（tree-drawer.ts:576-616）、代理 keydown（:708-771）、面包屑（:683-692）、会话展开集重投影回放（#I-20g）；#I-20f 键盘 Home/End/ArrowLeft/Right/Up；#I-20e 面包屑五级路径；122 卡下可定位 | 无 |
| **C6** | 规范符合 | **FR-V2-074/075 逐层可操作 + 用户覆盖层工程属性** | ✅ PASS | 工具级 `dom` 三档（insight-tree-hierarchy.test.ts:209-215）、子命令级 `dom read-state` 三档（:218-222）；覆盖即时生效（#I-20g/h）；覆盖链真实 dispatch（insight-override-security.test.ts:219-238）；工程属性见 C2 | 无 |
| **C7** | 规范符合 | **FR-V2-076 硬底线 clamp 逐档** | ✅ PASS（附建议 A1/A5） | 逐档单测：`command-override.test.ts:110-142`；真实链反证 ①~⑤（insight-override-security.test.ts:125-213）；`dom click`（ui）恒不放宽（:258-263 实跑 pass） | 无 |
| **C8** | 规范符合 | **FR-V2-077 deny 控件分层** | ✅ PASS | 硬底线 `overridable:false ⇒ controls:[]` + `clampReason` 可读（command-catalog.ts:199-228；tree-drawer.ts:635-638）；非硬底线 deny 保持 3 控件可改回（tree-view.test.ts:273-306）；DOM 断言 #I-12a/#I-12b/#I-18e | 无 |
| **C9** | 规范符合 | **FR-V2-078 偏差文案清除 + `delay` 消歧保留** | ✅ PASS（附提示 A7） | `grep '不提供命令级写入\|只读展示：命令级策略不可在树内修改' src/` **零命中**；`TREE_NO_ESCALATION_NOTE` 含两通路 + `delay` 消歧（tree-view.ts:64-69），sha256 pin `cfe96e8a…`（本审查独立复算一致）；`TREE_MODEL_NOTE` 重写 | 低 |
| **C10** | 规范符合 | **FR-V2-079 覆盖面分列不夸大** | ✅ PASS | `coverage.live` vs `coverage.baseline` 分列（project-tree.ts:329-343）；`accounted` 不入渲染；「已全部渲染」类表述零命中；archive 头 `liveCards`（tree-drawer.ts:871-877） | 无 |
| **C11** | 规范符合 | **NG-V2-001R 未越界**（不做无审计/绕 clamp 的放宽） | ✅ PASS | 唯一写通路 `command-policy-set`/`-reset`（tree-ops.ts:304/333；`grep` 仅此两处发送）；审计类型 `command-policy` 可分辨（audit-sink.ts:40-43）；clamp 在 SW 判定链强制（C14） | 无 |
| **C12** | 架构一致 | `ADR-V2-024~033` 无被实现违背 | ✅ PASS | 024 组合式（host.ts:298-317 `withCommandOverride`）；025 逐档（command-override.ts）；026 存储（同文件）；027 白名单/pin；028 纯归属树；029 role=tree/惰性；030 分层；031 取代台账；032 分列+文案；033 体积/门禁纪律——逐条比对实现一致 | 无 |
| **C13** | 架构一致 | **判定链零改动**：`policy.ts`/`auto-authorize.ts` 内容哈希 = P0 pin | ✅ PASS | 本审查独立 `sha256sum`：`policy.ts=bfcb2edeceae…c89a8`（= `POLICY_TS_SHA256`）、`auto-authorize.ts=1096d065dac6…ef4b`（= pin）；`insight-no-escalation` W3 反证（单字节篡改必须 FAIL）实跑通过；快照 `meta.hash` 输入不含 R2 追加字段（project-tree.ts:323-333） | 无 |
| **C14** | 安全红线 | **服务端强制（UI 不可绕过）**：伪造消息/直注入仍被 clamp | ✅ PASS | ⑧a：`store.set` 直注入 → 真实 `host.dispatch` 仍拒绝（insight-override-security.test.ts:305-316）；⑧b **非空洞反证**：naive「UI-only 无条件 allow」策略在真实 `createCommandRouter` 下**确实放行**（:318-336），真实 host 拒绝（:339-344）。判定链用真实 `createWebCliHost`+`createPluginPolicyConfig`，非自建 oracle | 无 |
| **C15** | 安全红线 | 白名单 **7→9** + 无默认写入 + 无 `grant`/命令级越界 | ✅ PASS | `TREE_ACTION_IDS` 恰 9（本审查独立复算 JSON sha256=`71f743ed…`，与 pin 一致）；`run()` 白名单外→`zeroOutcome` 零写入、`switch` 无 `default` 写分支（tree-ops.ts:352-410）；负例 `grant-origin`/`request-permission`/`command-allow` 非法（tree-ops.test.ts:188-204） | 无 |
| **C16** | 安全红线 | **零放宽**：AC-V2-005 范围重定后 ①~⑥ 仍成立 + AC-V2-025 ①~⑤ | ✅ PASS | 4 硬底线/evaluate/S1/S3/破坏性/ui·state·external 全覆盖反证（insight-override-security.test.ts:125-264，本审查实跑 pass）；`riskDefaults`/硬底线代码零 diff（sha256 pin） | 无 |
| **C17** | 测试质量 | **断言取代台账**：old→new 有据 / 总数不减 / 硬底线只增 / `journey.mjs` 零改 | ⚠️ 见 R2-5 | 10 处旧 test 标题均有 S1~S11/S13~S16 old→new（build.md §9.4/§4）；W4 size 旧断言由 `R2-V22-05` 重登记取代（size-budget.test.ts）；node `test(` 646→690、`check(` insight 57→75（运行期 102）/binding 185→197（运行期 192）；`journey.mjs` diff **0 行**。**字面 `removed=0` 不成立**（见 A4） | 低 |
| **C18** | 测试质量 | 新门禁真伪：无空断言 / 无 bare catch / 反证真抛 / 冻结用 sha256 | ✅ PASS | 新测试 `assert.ok(true)`=0、`catch`=0；`assertPinnedHash` 反证 `assert.throws(/内容哈希漂移/)`（insight-no-escalation.test.ts:378-399；insight-archive.test.ts 同款）；冻结主用内容 sha256（legacy `git diff --quiet HEAD` 仅保留并注释，见 T1）；`insight.mjs`/`binding.mjs` 断言非空洞（DOM 计数 + 真实落盘） | 无 |
| **C19** | 测试质量 | **作者两例真实 DOM + 布局多状态** | ✅ PASS（附偏差 A3） | 示例②逐层真实 DOM（#I-20b）+ 惰性（#I-20c）；示例①真实 DOM 展开到「工具」（#I-20a，最深可展层偏差已披露）；多状态布局守卫 关/开/深展开/收起 drift=0（#I-05~10 / #I-20i~k / #I-19h），阈值 589px / 65.0% / composer∈[0,8] / 400·320px 零溢出为真实数值（insight.mjs:52-55,305-320） | 低 |
| **C20** | 权限/红线 | 零新权限/零新依赖/manifest/base/content/v1 零改动 | ✅ PASS | 本审查独立：`git diff --stat a955a7f^..ff32683 -- packages/web-cli-base manifest.json package.json src/content` **空**；`dist/content.js=1,073,453 B`（= 上限，零增长）；`package.json` 依赖段零 diff；v1 目录零 diff | 无 |
| **C21** | 文档一致 | `dev.md`/`smoke-checklist.md`/`capability-matrix.md` 与实现一致 | ⚠️ 见 R2-8 | `dev.md` §8.2 体积回填（历史保留）；`capability-matrix.md` 未涉及白名单口径（零改动，不冲突）；`smoke-checklist.md` 新增 §8，但 §5（仍写 70 断言）与 §7（仍写「档案是只读展示面」）**未同步**（见 A6） | 低 |
| **C22** | 门禁运行 | node `npm test` 独立复跑；UI/binding 未重跑 | ✅ PASS（如实） | `npm test` **690/690·0 fail·EXIT=0**（本审查）；`test:insight`/`test:binding`/`test:ui` 未由本审查重跑（OOM 纪律），引用 build 落盘日志并抽读关键行（见 R2-3/R2-6），**不冒充** | 无 |

---

## R2-3. 关键点独立复核（15 项）

| # | 关键点 | 判定 | 独立依据 |
|:--:|--------|:----:|----------|
| 1 | 作者两例真实 DOM 逐层展开 / 扁平零残留 | **接受（示例②完整；示例①部分，已披露）** | 示例②：#I-20b 断言 `支持的命令`(aria-expanded=true)→`系统内置命令`→`dom`→`dom read-state` 均在真实 DOM；#I-20c 收起后子节点**不在 DOM**（惰性）。示例①：#I-20a 真实 DOM 到「工具」层；**「工具→子命令」真实 DOM 未达成**——`paramsToSchema` 不产出 `subcommand.enum` → `projectToolSurface` 的 site 工具 `subcommands=[]`（service-worker.ts:1572-1583；declared-tools.ts:91-112），该层由示例② + node 模型（insight-tree-hierarchy.test.ts:126-143）证明。扁平零残留：`grep '\.rows' src/` 于 tree 面 0 命中；`TREE_MODEL_NOTE` 无「森林」；#I-11a 真实 DOM 零「森林」 |
| 2 | 多归属不复制（`cap:opt:bookmarks`） | **接受** | 全树恰 1（test:177-178）；`mainOwner='capability'`；`crossRefCount>=1`；徽标可读「亦被…命令面」；`nodeId` 全树唯一（test:161-168）；下钻解析同一 `nodeId`。site-declared 命令被 `claimed` 收归站点面、命令面剔除（ownership-tree.ts:243-284）——**无「复制后去重」假象**（唯一性由结构保证，非事后去重） |
| 3 | clamp 反证①~⑤作用于真实判定链 | **接受** | `insight-override-security.test.ts` 用真实 `createWebCliHost`（内部真实 `createPluginPolicyConfig` + `withCommandOverride`）+ 真实 `host.dispatch`；①~⑧b 在本审查 `npm test` 中全 pass（日志行 315-324）；**唯一 mock 为 ops/transport 接缝**，判定链本体真实 |
| 4 | `dom`/`ui` 档张力（最重要） | **自洽、安全、非规避**（详见 R2-4） | clamp 按**被调用子命令的 effective risk**（router.ts:543 `subcommandRisks[sub] ?? entry.risk`）；`dom`=allow 时 `dom click`（ui）仍 ask（真实 dispatch：insight-override-security.test.ts:258-263 实跑 pass）；`ui` 档 allow→`null` 落回基线 `riskDefaults['ui']='ask'`，**不可放宽**。**残留风险 = A1**（no-widen 档节点层收紧控件缺失），非阻塞 |
| 5 | 服务端强制反证⑧a/⑧b 真实非空洞 | **接受** | ⑧a 直注入 `store.set` → 真实 dispatch 仍拒；⑧b `assert.equal(naiveRes.ok,true)` 证明「UI-only 无条件 allow」**确实会放行**（真实 `createCommandRouter`），对照真实 host 拒绝——反证承重墙成立 |
| 6 | 存储生命周期逐条 | **接受** | 无半写（:352-362 断言内存不变 + **零落盘**）；写成功才提交（:380）；串行队列无丢更新（:364-381 并发 3 写后 `a=deny` 胜出 + 落盘==内存）；同值幂等不写不审计（:285-301）；读失败视为无覆盖（:383-395）；恢复默认可逆（:303-335）；审计零明文（:412-430 `/apiKey\|clipboard\|notification\|title=\|body=\|https?:\/\//` 零命中） |
| 7 | 白名单 9 + pin 纪律 | **接受** | `TREE_ACTION_IDS` 恰 9、JSON sha256 `71f743ed…`（本审查 node 复算一致）；无默认写分支；无 grant/命令级越界；pin `TREE_NO_ESCALATION_NOTE=cfe96e8a…`、`tree-view.ts=b4392d65…`、`tree-ops.ts=4163a6cb…`（本审查 `sha256sum` 复算一致）；pin 注释含**旧值/新值/日期/来源/理由/历史保留**（insight-archive.test.ts:92-119）；`insight-archive` 反证「扩一个动作必须改变哈希」仍有效（:721-722） |
| 8 | deny 控件分层 + 档案类名隔离 | **接受（正当隔离）**（详见 R2-6） | 硬底线行零 `[data-action-id]` + `.tree-clamp-reason`（tree-drawer.ts:635-638；#I-12a 真实 DOM）；非硬底线 3 档；**两路径同一写通路**（tree-drawer 仅调 `deps.actions.run`，`grep makeMessage/transport` 于 tree-drawer=0 命中，唯一发送在 tree-ops）；档案用 `.tree-archive-policy*`（无 `data-action-id`）→ `#I-19g` 保持；#I-21e 证明档案真实落盘 |
| 9 | D-R2B-02 未知/非法 risk → deny | **接受** | `clampActionForRisk`：`risk undefined/invalid && desired==='allow' → 'deny'`（command-override.ts:101-105）；test ③ `sleep`/`web-cli-help` 覆盖 allow → 真实 dispatch `ok=false`、`asked=0`（实跑 pass）——**无「改 deny 实际仍 allow」**；与 `AC-V2-025③` 一致。模型侧 `hardFloor='s3-unknown-risk'` → `overridable=false` 零控件（D-R2B-02 如实登记） |
| 10 | 布局守卫多状态 | **接受（未重跑 UI，依据 build 日志抽读）** | 状态：关(#I-05~10)/开(#I-05~10)/深展开(#I-20i/j)/收起(#I-20k)/档案开(#I-19h)；drift 字段 `logFlexGrow/logClientHeight/logRatio/composerGapToBottom/docOverflowX/logOverflowX` 全 0；阈值真实 589px/65.0%/composer∈[0,+8]/320px；build 日志 `final-04` 显示 `#I-20j/#I-20k … drift=0` 且 **PASS 102**。**本审查未重跑 `test:insight`** |
| 11 | 断言取代台账 | **数量只增成立；字面 `removed=0` 不成立** | 独立复算 `git diff -U0 \| grep '^-[^-]'`（test+src）=**470 行删除**，其中 test 面删除行含 10 处 `test('…')` 标题与约 40 处 `assert.*` 行；每条旧 title 均有 S 编号 old→new（`command-allow` 负例保留）；总数：node `test(` 646→690、`insight.mjs check(` 57→75、`binding.mjs check(` 185→197、`journey.mjs` **0 行 diff**；硬底线/安全断言保留并强化（sha256 pin + clampReason）。**结论见 A4** |
| 12 | 安全红线零放宽 | **接受** | 独立 `sha256sum`：`policy.ts=bfcb2ede…`✓、`auto-authorize.ts=1096d065…`✓；`manifest.json`/base/v1/content 零 diff；`content.js=1,073,453 B`（零增长）；无新依赖 |
| 13 | 门禁真伪（空断言/bare catch/冻结/反证） | **接受** | 新测试无 `assert.ok(true)`/无 `catch`；`src/` 无 bare catch（`grep -E 'catch\s*(\([^)]*\))?\s*\{\s*\}'` 于 insight/ui-tree 0 命中）；冻结主用 sha256（内容哈希），legacy `git diff HEAD` 仅保留并注释（T1）；反证 `assert.throws` 真抛（sha256 篡改 / 判定表弱化） |
| 14 | `binding.mjs` flake（2/3） | **判为环境抖动，非真缺陷**（详见 R2-6） | flake 落于**既有** `#33B1`（设置视图渲染）/`#3d~#3f`（discovery），与 R2 无关；`binding.mjs` R2 diff **append-only（0 删除行）**，未改这两段逻辑；build 日志 `final-07`/`final-07b` 显示失败点即上述两段、`final-07c` **PASS 192**。**残留**：2/3 频率偏高（T4） |
| 15 | 文档一致性 | **⚠️ 有漂移（提示 A6）** | `dev.md` 一致；`capability-matrix.md` 零改动不冲突；`smoke-checklist.md` §8 新增澄清，但 **§5 仍写「test:insight 70 断言」**（实测 102）、**§7 仍写「档案是只读展示面…无任何命令级控件」**（R2 已可操作），仅靠 §8 事后指针，**存在读者误读风险** |

---

## R2-4. `dom`/`ui` 档张力判定（关键点 4）

**判定：口径自洽、安全，不构成对 spec `ui` 档「不得放宽」约束的规避。**

- **口径**：clamp 判据 = **被调用 `(tool, subcommand)` 的 effective risk**（`router.ts:543`），而非工具级 `entry.risk`。`dom` 工具级仅作**设置载体/继承**（`overridable:true`），每个子命令按各自风险再 clamp（ADR-V2-025 §3）。
- **安全验证（独立）**：设 `cmd:dom=allow` 后，`dom click`（`subcommandRisks['click']='ui'`）经 clamp `ui && allow → null` 落回 `riskDefaults['ui']='ask'` → 真实 `host.dispatch` **仍 ask**（`insight-override-security.test.ts:258-263`，本审查实跑 pass）。即**不存在**「工具级 `dom`=allow 意外放宽 `dom` 下 ui/破坏性子命令」的路径；破坏性子命令同理（`allow`→`null`→保底 `ask`）。
- **是否规避 spec**：spec §5.7 `ui` 行「❌不得放宽为 allow」= **运行时不可放宽**——本实现满足（allow 被 clamp，绝不 allow）；`dom`/`dom read-state` 三档全可达（作者示例）由容器载体 + read 档实现。故**不构成规避**。
- **残留风险（A1，非阻塞）**：spec §5.7 对 `ui`/`state`/`external`/破坏性标注「✅ 可覆盖为 ask/deny（收紧仍可）」，但投影层 `resolveCommandPolicy` 对这些档返回 `overridable:false ⇒ controls:[]`（command-override.ts:106-111/151-155；command-catalog.ts:227）→ **节点层无收紧控件**；呈现上把「no-widen」与「hard floor（零控件）」合并。运行时收紧仍可用（`clamp` 对非 allow 返回 desired；test ⑤/④ 已验证 ask/deny 生效），且可经**工具级载体**收紧（如 `dom=deny` 传导至 `dom click`）；但**叶子 ui/state/external 工具无任何树内收紧入口**。方向恒为收紧，**无安全风险**，属功能/条文一致性问题——**不阻塞**，建议后续为 no-widen 档暴露 ask/deny 控件或在 spec/ADR 显式登记「有意收窄」。

---

## R2-5. 断言取代台账独立核验

| 项 | 本审查核验 | 结果 |
|----|-----------|:--:|
| 旧 test 标题是否有 old→new | 10 处被删 `test('…')` 标题对应 S1/S2/S3/S4/S5/S6/S7/S8/S9/S10/S11/S13/S14/S15/S16 台账 | ✅ 有据（size W4 另由 R2-V22-05 取代） |
| 逐文件是否有**净减少** | `insight-archive 26→28`、`insight-no-escalation 17→17`、`size-budget 14→14`、`tree-ops 10→12`、`tree-view 8→10`、新增 3 文件（16/12/10） | ✅ 无文件减少 |
| 总数不减 | node `test(` **646→690**（本审查静态复算；运行 `npm test`=690）；`insight.mjs check(` **57→75**（运行期 102）；`binding.mjs check(` **185→197**（运行期 192） | ✅ 只增 |
| 硬底线/安全断言只增 | `POLICY_TS_SHA256`/`AUTO_AUTHORIZE_TS_SHA256`/判决表快照 pin **不变**；deny 分层由「一律零控件」改为「硬底线零控件 + 非硬底线可改回」，**硬底线零控件 + clampReason 保留并强化**；#I-12a 新增 | ✅ |
| `journey.mjs` 零改动 | `git diff a955a7f^..ff32683 -- test/ui/journey.mjs` = **0 行** | ✅ |
| **字面 `removed=0`** | 区间删除行 **470**（test+src）；test 面含 `assert.*` 删除约 40 行 | ❌ **字面不成立**（见 A4；实质=「无未取代删除 + 总数不减」） |
| 计数台账基线数字 | build 记 node「686→690」；本审查静态复算 **646→690**；v2 收口 build 另记「616/616」——三处不一致 | ❌ 基线数字不可复现（A8） |

---

## R2-6. `binding.mjs` flake 判定 + 档案控件类名隔离判定

**binding flake → 判为「环境抖动」，不判缺陷。** 依据：① flake 断言 `#33B1`（面板设置视图渲染）/`#3d~#3f`（discovery）均**非 R2 代码路径**，R2 未触碰该逻辑；② `git diff` 显示 `binding.mjs` R2 改动为**纯追加**（0 删除行），未改这两段；③ build 落盘 `final-07`（#33B1 失败）/`final-07b`（#3d 失败）/`final-07c`（**PASS 192**）显示**不同**失败点，符合时序抖动而非确定性缺陷；④ 本审查未重跑（OOM 纪律），未发现「复跑绿掩盖真问题」的证据。**残留**：2/3 频率偏高（T4）——建议后续为该 harness 加就绪等待以降低抖动，但**不阻塞**。

**档案控件类名隔离 → 判为「正当的类名隔离」，非规避取巧。** 依据：① R2 **显式反转** FR-V2-052 原「档案只读展示、无任何命令级覆盖」→ 规格上允许档案卡对**可覆盖**条目承载控制（AC-V2-026）；② 若复用 `.tree-control`/`data-action-id` 会与 `#I-19g` 冲突，故采**自有类** `.tree-archive-policy*`（无 `data-action-id`），但**写入路径仍唯一**（`deps.actions.run`→tree-ops→`command-policy-set`，`#I-21e` 真实落盘证据）；③ 新增能力有**独立**断言 `#I-21a~e`（硬底线零 `[data-policy]` + 原因；可覆盖三档；默认/生效分列；真实写），未靠「让旧断言继续绿」来隐藏回归；④ 决策在 build §2、smoke-checklist §8 显式登记。**保留**：`#I-19g` 标签仍写「安全红线」而其语义已收窄为「档案不复用树行控件类」，叠加 §7 stale 文案，存在误读风险（T3/A6）。

---

## R2-7. 门禁真伪结论（有无虚绿 / 空断言 / bare catch / 冻结机制 / 反证）

| 门禁（R2 相关） | 本审查 | 可证伪性 | 虚绿风险 |
|------|:--:|------|:--:|
| `command-override` | ✅ 16/16（实跑） | §5.7 逐档表 + 半写/并发/降级/弱文档/审计 pin | 无 |
| `insight-override-security` | ✅ 10/10（实跑） | ①~⑧b 真实 dispatch；⑧b naive 策略**确实放行**（非空洞） | 无 |
| `insight-tree-hierarchy` | ✅ 12/12（实跑） | 真层级反证（扁平化→FAIL）、唯一性、hash 输入零变化 | 无 |
| `insight-archive` | ✅（实跑，含 pin） | `TREE_ACTION_IDS` 9 值 sha256；扩动作必变哈希；硬底线零 `policyControl` 反证 | 无 |
| `insight-no-escalation` | ✅（实跑） | 内容哈希 pin + 单字节篡改 `assert.throws` + 判定表弱化 FAIL | 无（legacy `git diff HEAD` 弱冻结保留，T1） |
| `tree-ops` / `tree-view` | ✅（实跑） | 白名单 9/唯一映射/无默认写；硬底线零控件结构保证 | 无 |
| **空断言 / bare catch** | 新测试 `assert.ok(true)`=0；新 `src/` bare catch=0 | — | 无 |
| **冻结机制** | 主用**内容 sha256**（`assertPinnedHash`）；`git diff --quiet HEAD` 仅 legacy 保留+注释 | — | 无（附 T1） |
| **反证是否真抛** | `assert.throws(/内容哈希漂移/)` 对篡改文本/弱化判定表（insight-no-escalation.test.ts:378-399；insight-archive 同款） | — | 无 |

**结论：R2 新增/改动门禁无虚绿、无空断言、无 bare-catch 吞断言；冻结以内容哈希为准；反证真抛。**

---

## R2-8. 问题清单（R2）

### 阻塞问题：**0 个**
未发现安全底线违规、无绕过 clamp 的放宽路径、无判定链改动、无 base/v1/main 越界、无新增权限/依赖。

### 建议（非阻塞）

| # | 项 | 严重度 | 为何不阻塞 |
|---|----|:--:|------|
| **A1** | **no-widen 档节点层收紧缺失**：spec §5.7 对 `ui`/`state`/`external`/破坏性标「✅ 可覆盖为 ask/deny」，但投影把这些档与硬底线合并为 `overridable:false ⇒ controls:[]`，节点层无收紧控件；叶子 ui/state/external 工具无树内收紧入口（ADR-V2-025 §5「ask/deny 生效」与 ADR-V2-030 §2 存在口径不一致） | 中（低风险） | 方向恒为收紧、无放宽风险；运行时 tighten 生效、且可经工具级载体内收紧；作者示例不受影响 |
| **A2** | **AC-V2-021 UI 侧「从非主归属下钻到同一节点」未实现**：`crossRefs` 仅渲染为纯文本（tree-drawer.ts:641-642），无点击跳转；`test:ui` 未断言下钻（仅模型 `ownershipNodeFor` 覆盖） | 中 | 节点唯一性/主归属/徽标计数均由模型与 node 门禁钉死；缺失 UI 跳转不影响安全与数据正确性 |
| **A3** | **AC-V2-020 作者示例①「工具→子命令」真实 DOM 未达成**：site 工具 schema 无 `subcommand` enum → 快照 `subcommands=[]`；仅示例② + node 模型覆盖该层 | 低 | 已如实披露（build §2/§8、smoke §8）；层级能力本身由示例② 与模型证明 |
| **A4** | **取代台账口径「removed=0」字面不成立**：区间删除 470 行（含 10 test 标题 + ~40 assert 行），实为「显式 old→new 取代 + 总数只增 + 硬底线只增」 | 低 | 每条旧断言均有 S 编号替代，无「未取代删除」；安全断言只增 |

### 提示（非阻塞）

| # | 项 | 说明 |
|---|----|------|
| **A5** | `isCommandDestructive` 采用**整串精确匹配**，弱于 v1 分段判据（`dom set-text/fill/type` 等 write 档可被放宽为 allow）；与 ADR-V2-025「末段」对现有子命令等价，但与 v1 `isDestructiveInvocation` 分段语义不同。建议补一条受影响子命令集合的固化断言 |
| **A6** | `smoke-checklist.md` §5 仍写「test:insight 70 断言」（实测 102）、§7 仍写「档案是只读展示面…无任何命令级控件」（R2 已可操作）；仅 §8 事后澄清，存在读者误读风险。建议在 §5/§7 加「以 §8 为准」指针（不删历史） |
| **A7** | `INSIGHT_MODEL_NOTE`（含「森林/非严格树」旧措辞）仍保留在快照 `meta.modelNote`（未渲染，但随 `insight-tree` 消息下发）；FR-V2-078 若计 payload 则残留，建议注释点明「仅历史/哈希输入，不渲染」 |
| **A8** | 断言计数台账基线数字不可复现：build 记 node「686→690」，本审查静态复算 **646→690**，v2 收口 build 另记「616/616」；不变式（只增/无文件减少）成立，建议订正台账基线 |
| **T1** | legacy `git diff --quiet HEAD` 弱冻结仍保留（真实冻结由 sha256 承担，已注释登记）——无风险，建议后续删除或改区间冻结 |
| **T2** | `ArchiveCard.policyControl` 由门禁消费、渲染层自 `overridable` 重建按钮（同一写通路，非两套实现）；建议渲染消费 `policyControl` 以防两处漂移 |
| **T3** | `#I-19g` 标签仍写「安全红线」，语义已收窄为「档案不复用 `.tree-control`/`data-action-id`」；建议补注已收窄，避免被读成「档案只读」 |
| **T4** | `test:binding` 本轮 2/3 flake（`#33B1`/`#3d`）判为环境抖动、非 R2 缺陷；频率偏高，建议为既有 harness 就绪等待稳定化 |

---

## R2-9. 未覆盖项 / 偏差（如实）

- **未由本审查重跑 Chromium 类门禁**（`test:ui` / `test:insight` / `test:binding` / `test:e2e` / `test:hardening`）：遵守 OOM 纪律（串行/绝不并发）。故 `AC-V2-020/021/022`（真实 DOM）与 `AC-V2-024`（binding 覆盖链）的**运行结果**以 build 落盘日志为据，并抽读核验（`final-04` PASS 102 含 #I-19g/#I-20b/#I-20a/#I-21e；`final-07c` PASS 192）——**不冒充本审查的 PASS**；其**断言存在性与逻辑**经静态全文阅读（R2-2/R2-3）。
- **未逐行核验** `tree-drawer.ts` 全部焦点/DOM 事件管理的运行期正确性（属 validate 动手面）；`index.html` R2 增量为**纯 CSS**（本审查已确认无脚本/无凭据）。
- **未实跑** browser-level 的 `binding #22a~l` 三档链（含真实二次确认）——仅读码 + build 日志。
- **headless 不可覆盖**：真实键盘体感 / 读屏 / 原生弹窗 / 320px 拥挤度 / 展开动效——沿用 `smoke-checklist.md` §8 `V2-H-10~14`（`⏳ 待人工`，未冒充 PASS）。
- **偏差**：A1~A8 / T1~T4（均非阻塞）。

---

## R2-10. 总体结论

**结论：⚠️ 有条件通过（0 阻塞；4 建议 + 8 提示）**

| 指标 | 结果 |
|------|------|
| R2 需求覆盖（FR-V2-070~079） | 10/10 有实现与对应门禁断言（C3~C10） |
| 安全红线（R2） | **全部 PASS**：判定链零改动（sha256 独立复算）/ 服务端 clamp 承重（⑧a/⑧b 非空洞）/ 白名单 9 无默认写无 grant / 零放宽（①~⑤）/ 无新权限依赖 |
| 规范符合率 | <100%（A1 no-widen 档节点收紧缺失；A2 UI 下钻缺失；A3 示例①子命令层未真实 DOM）——**均非安全方向** |
| 代码质量（C1/C2） | ✅ 纯函数/kv 注入/无半写/串行/幂等/降级/审计零明文 |
| 架构一致（C12/C13） | ✅ ADR-V2-024~033 一致；判定链零 diff |
| 测试质量（C17~C19） | ✅ 数量只增、硬底线只增、journey 零改、反证真抛；⚠️ 字面 removed=0 不成立（A4）、台账基线数字不一致（A8） |
| 权限/红线（C20） | ✅ manifest/base/content/v1/依赖零改动；`content.js` 零增长 |
| 门禁运行（C22） | node `npm test` 独立 **690/690·0 fail**；UI/binding 未重跑（如实） |
| 新增阻塞 | **0** |

**判定理由**：R2 的核心是「真层级树（不复制节点）+ 命令级用户覆盖层（服务端 clamp）」。本审查以**独立读码 + 独立哈希/计数复算 + node 门禁实跑**核验：clamp 判据取**被调用子命令的 effective risk**、`dom`=allow 时 `dom click`（ui）**仍 ask**（真实 dispatch 验证）——`dom`/`ui` 张力**自洽、安全、非规避**（残留 A1 为保守方向的条文不一致）；服务端强制反证 ⑧a/⑧b **真实非空洞**；存储生命周期六项**逐条成立**；白名单 7→9 与 pin（`71f743ed…`/`cfe96e8a…`/tree 模块）**独立复算一致**、old→new+日期+理由+历史齐备；判定链文件 sha256 仍等于 P0 pin、base/manifest/content/v1/依赖零 diff。`binding` 2/3 flake 判为**环境抖动（非真缺陷）**；档案控件类名隔离判为**正当隔离（非规避）**——两者均在报告中留残留风险但**不阻塞**。剩余 4 建议 + 8 提示为**条文一致性 / UI 完整性 / 文档口径 / 防漂移**层面，**不阻塞**进入 validate。据此判为 **⚠️ 有条件通过**，可进入 `@sddu-validate` 动手验证（重点复核 A1/A2/A3 与真实 Chromium 面）。

**R2 审查记录**：本 R2 段 + `state.json`（`revisionRounds.R2.review`）随本轮 review 提交（`feature/web-cli-plugin`）；提交 hash 与 push 输出见交付摘要（本轮对话）。

---

## 修订记录（R2 追加）

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | R1 审查（P0 = V2-1/V2-2/V2-3），见上 | 2026-09-13 | SDDU Review Agent |
| **v2.0** | **R2 审查（追加，不覆盖 R1）**：区间 `a955a7f`（R2 spec）→ `ff32683`（R2 build 2 + hash 回填）。C1~C22（R2）逐项；15 项关键点独立复核（作者两例/多归属/clamp 真实链/`dom`·`ui` 张力/服务端强制/存储生命周期/白名单+pin/deny 分层+档案类隔离/D-R2B-02/布局多状态/取代台账/零放宽/门禁真伪/binding flake/文档一致）；`dom`·`ui` 张力判为**自洽安全非规避**；取代台账**字面 removed=0 不成立**（A4）；`binding` flake 判为**环境抖动**；档案类名隔离判为**正当隔离**；门禁真伪无虚绿、反证真抛。node `npm test` **690/690·0 fail**（本审查实跑），Chromium 类未重跑（如实）。问题清单 **0 阻塞 + 4 建议 + 8 提示**。**结论 ⚠️ 有条件通过（0 阻塞）** | 2026-09-13 | SDDU Review Agent |
