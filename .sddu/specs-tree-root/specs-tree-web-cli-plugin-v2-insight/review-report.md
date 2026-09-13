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
