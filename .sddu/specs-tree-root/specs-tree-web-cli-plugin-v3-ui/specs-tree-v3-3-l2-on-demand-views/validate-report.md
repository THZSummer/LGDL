# 验证报告：specs-tree-v3-3-l2-on-demand-views

> **文档定位**: SDDU 验证报告 — 逐项记录自主验证的执行结果，作为工作流终点
> **验证策略**: `validate.md`（V1~V16 场景矩阵 + 五维度指引 + 独立复现原则）
> **前置依赖**: `spec.md` v1.0 · 父 `../spec.md`（§5.4 / §8.3 / §8.4 / §10）· `plan.md`（ADR-V3-025~029）· `review-report.md`（R1 = ❌ 不通过 / 1 阻塞 F-01；**其后 build 修复轮已处置，本轮独立复现确认修复为真**）· `build.md` v1.1 · v3-1 / v3-2 先例
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-16
> **验证轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-16
> **更新说明**: 初始创建：V1~V16 逐项实测（**结论只建立在我自己的独立复现上**）；主动攻击新防呆并登记 3 项新发现（2 中 1 低）+ 4 项低龄文档/覆盖观察；0 阻塞

---

## 1. 验证概要

| 维度 | 数值 |
|------|:--:|
| 验证项总数 | **16**（V1~V16） |
| 通过（✅） | **12** |
| 有条件通过 / 带发现（⚠️） | **4**（V3 / V10 / V13 / V6 各带非阻塞发现） |
| 失败（❌） | **0** |
| 无法执行（⏭️） | **0**（人工面为 `⏳ 未执行`，不列入 PASS） |
| 阻塞问题 | **0** |
| 被验证方门禁独立复跑 | **16/16 项 `exit=0`**（含 build / typecheck） |
| 我自写的验证脚本 | 8 个（`my-density-probe.mjs` / `my-l2-probe.mjs` / `my-counts-probe.mjs` / `my-views-probe.mjs` / `my-catalog-probe.mjs` / `attack-judge.mjs` / `attack-r4a.mjs` / `audit-ledger*.py`） |
| Chromium 运行次数 | **6 次串行**（门禁链内）+ **4 次自写探针**；**无并发** |

**结论一句话**：本叶的实质交付（四视图默认零占用 / 真值计数 / 视图替换与返回 / 树归属迁移 / 取代台账 / 体积显式重登记）在**我自己的复现**下**全部成立**，F-01 的修复**真实有效**；新防呆**能挡住 F-01 的历史形态**，但其判定面存在 **2 处中等强度可绕过形态**（均**未被本轮证据实际利用**）→ ⚠️ **有条件通过，0 阻塞**。

---

## 2. 逐项验证结果（V1~V16）

| # | 验证对象 | 验证步骤（摘要） | 预期结果 | 实测结果（原始证据） | 判定 |
|---|---------|---------|---------|---------|:--:|
| V1 | 门禁串行复跑 | 16 项逐条串行，全量日志落盘 | 全 `exit=0` + 计数与登记一致 | 见 §4 全表：`776/11/127/164/103/71/167/116/192/24/PASS/12/l1-reverse 9/l2-reverse 6` + `typecheck 0/build ✓` | ✅ |
| V2 | F-01 独立复现 | 自建副本删 1 条 `check(` → 形态 B / 形态 A / 还原 | FAIL 段含预期文本 + override 真执行 + 无启动错误；还原 `11/11` | 见 §3.1（含原文） | ✅ |
| V3 | **新防呆对抗** | 14 条自写对抗 + `--selftest` + R4a 声明侧攻击 | 若可绕过 → 记为发现 | `--selftest` 5/5 ✅、负控被判无效 ✅、真实反证判有效 ✅；**14 条中 9 条绕过**（未利用）→ 发现 **N-01 / N-02 / N-03** | ⚠️ |
| V4 | 计数真值派生 | 自写双向实验 + 写死路径搜索 + 四类真值源核对 | 变化量相等；无常量/回退/占位 | 新增 1 个已授权站点 → `sites 2→3`、`Σ 115→117`、`tree 115→117`（Δ 相等 ✅）；审计计数 `0→7` == `audit-export` 回包 7；写死路径搜索：**仅 `CATALOG_BASELINE_META`（对账基线常量，被 `insight-archive.test.ts` A7 pin 到 `loadBaseline()` 真值）+ `SETTINGS_SECTION_IDS`（登记表，被 `l2-counts.test.ts` 双向守卫）**，其余计数无回退路径 | ✅ |
| V5 | 语义迁移未削弱 | 属性 / id 集合 / 零 diff / 阈值 | 全成立 | `#tree-fab hidden` ✅（默认 hidden、视图内揭示）；`#tree-drawer` `role=region` ✅ / `aria-modal` = null ✅ / `aria-haspopup` 全仓 0 命中 ✅ / `position:static` ✅；`#I-*` **LOST=0 / NEW=8**（`#I-01e2,#I-01e3,#I-13a0,#I-13a1,#I-13a2,#I-14c0,#I-14d,#I-19a1`）；`sidepanel-view.test.ts` 在本叶区间**0 行 diff**；`LOG_MIN_HEIGHT=LOG_CLIENT_HEIGHT_FLOOR(488)` / `LOG_MIN_RATIO=54.0` / `COMPOSER_GAP=[0,8]` 逐字未动；`checkLayout` 与 `checkL2OpenLayout` **各 7 条**（迁移不降强度），关态几何断言原样保留 | ✅ |
| V6 | 密度 `chars −3` 合规 | 测量源码零改动 + 复算来源 + 理由 | 0 行改动；−3 可复算；理由成立 | `git diff cf2af32..HEAD -- test/ui/density-metrics.mjs` = **0 行**（`HEAD..HEAD` 亦 0；该文件最后一次改动在 v3-1 `098739a`）；−3 精确来自 `#l0-statusbar-text` 自身文本：`状态：树0·命令0·审计0·设置`(16) → `状态：按需视图·点开看计数`(13)；`previous.chars=223` 逐格保留 + `direction: tighten-only`；被移出的计数确实进入**默认 `hidden`** 的 `#l2-entries`（我实测 `entriesHidden=true`，摘要文本 `状态：树 113 · 命令 94/176 · 审计 2 · 设置 7`）→ 理由成立 | ✅（带观察 **N-07**） |
| V7 | 体积三线 + 归因 | 实测字节 + 自跑归因 + 算法复核 | 逐项相等；归因自洽 | `content.js 177,076`（sha `52a82620…` 与 pin 逐字节相等）+ `sidepanel.js 349,925` == 登记 ≤ `367,421`；自跑 `--rev cf2af32 --rev WORKTREE` → `Δ=54,700`、`Σ per-module=54,281`、`unattributed=419`（54,281+419=54,700 ✅）、必需占比 `54,016/54,700=98.75%≈98.7%`、未解释 `265+419=684 B`；Feature 累计 `(349,925−266,500)/266,500=+31.30%`（时间线 266,500→291,523→295,225→327,679→328,476→349,880→349,925 **无漏轮**）；`+18.51%` = `54,655/295,225`（v3-1 I6 基线起算，口径明写） | ✅ |
| V8 | L2 四视图零占用 / ≤2 交互 / 返回 | 自写点击序列 + 判据 | 零占用；2 次可达；返回复原 | 默认：四视图 `hidden=true`、可见数 0、`#view-host hidden`、`#l2-entries hidden`、`#tree-fab hidden`；`#l0-statusbar`(1) → `#l2-entry-{tree,commands,audit}`(2) → 恰 1 视图可见 + `#log.hidden=true` + 风险位可见（42px）+ 面板级滚动容器 = 1；`#l2-back` 返回 → `#log` 复原 + 视图全折叠 + `#view-host` 复原（四视图各一轮）；**settings 视图**：2 次可达 ✅、默认 `hidden` ✅，但走 v1 `body.settings-open` 开关（`#panel-main` 计算态 `display:none`，`#log` 无 `hidden` 属性）、由 `#settings-back` 返回 → 观察 **N-08** | ✅（带观察） |
| V9 | 四视图内容真值 | 自写探针逐项 | 非空骨架 + 零控件 + 分列 | tree：`ul[role=tree]` ✅ + `treeitem=31` + `aria-level ∈ {1,2,3}` + 面包屑 ✅ + `[data-action-id] = {revoke-origin, clear-auto-auth, set-capability-toggle, set-tabs-toggle} ⊆ 9 白名单` ✅ + 控件 29（非空转）✅ + `allow` 控件 0 ✅ + `#tree-fab` 视图内揭示 ✅；commands：渲染卡 **94 == `deriveCounts().commands.live` 94** ✅、**零表单控件** ✅、硬底线卡 **3** 且 `policyOptions` 全空 ✅、只可收紧卡 **42** 且无 `allow` ✅、9 动作只读列表**顺序逐字 == 白名单** ✅、文案无「已全部渲染」✅；audit：条目/白名单文案非空 ✅；settings：`#settings-root > .wc-section = 7` ✅（== `deriveCounts().settings`） | ✅ |
| V10 | 台账逐行审计 | 自写 python 两层 + hash + 豁免条件 | 逐行命中 / hash 复原 / 条件合规 | base 相对：受审 34 文件、**未覆盖删除行 = 0** ✅（与门禁一致）；`newTitle` **62/62** 可定位；两个 `protectedRanges` 字节 hash **独立复算相等**（journey `[42766,54004)` `6b45c3fa…` / binding `[107780,115930)` `be9ad0e9…`）；叶相对（`bf5773d..HEAD`）门禁文件删除行 **42** 条，其中 **28 条**（insight 13 + l0 15）不被 `entries` 的 `oldTitle`/登记文本覆盖 → 观察 **N-09**（盲区**已被台账 `v3ReverseProofExpectations.note` 与 `build.md §F-02` 明写**）；两个 `v3SkeletonExemptions` 的 `removalCondition` 均**由本叶交付物满足**（`#view-host` 已填充 / 设置计数已可从 `sections.ts` 派生）→ 删除合规；`V33F-S12` 逐字补登 `v3RevealComposer` 有界重试（oldTitle 两行与叶内删除行逐字一致）✅ | ⚠️（带观察 N-09 / N-10） |
| V11 | 零改动红线 | sha256 / diff / grep | 逐项零 diff | `content.js 177,076` + `52a82620…` ✅；`src/content/{content-script,dom-agent,page-bridge}.ts` = `a7290031… / 7df782b3… / 5737c40a…` ✅；`policy.ts bfcb2ede… / auto-authorize.ts 1096d065…` ✅；`manifest.json` 本叶区间 **0 diff** 且 `contextMenus` 0 命中 ✅；本叶 `package.json` 只增 3 条 script（`test:l2` / `test:l2-reverse` / `test:v3` 链），`dependencies`/`devDependencies` 零新增 ✅；阈值机读 `{default 7/15, firstRun 9/20, risk 17/35}` ✅；主界面可见文本输入框 **0**（`l0.mjs ③` 我复跑 ✔）+ `#composer` 默认 hidden ✅；`#risk-rail` 在 `NEVER_FOLDABLE` 且不在 `COLLAPSIBLE_TARGETS` ✅ | ✅ |
| V12 | 密度独立复测 | 自写口径 6 格 + 三视口相等 | 逐格 == 登记 | 见 §3.5：`default@320/400/520 = C1 7 / C2 7 / C3 19 / C4 6 / chars 220`，`firstRun@320/400/520 = 7/12/25/6/384` — **6/6 与登记格逐项相等**；`default` 三视口 `chars 220/220/220` 相等 | ✅ |
| V13 | 文档/登记册数字漂移 | 逐数字对照 | 声明 == 实测 | **19 项声明中 17 项逐字对上**；2 项残留旧值：`build.md §4`「l0 158 ≥ 157」（同文件 §1 与 §9.2 已订正为 160/164，实测 **164**）→ 发现 **N-05**；`build.md §1/§5.1` 保留 build 轮 `349,880/367,374` 而未就地指向 §9.5 的 `349,925/367,421`（§9.5 已明写「前值 → 新值」）→ 观察 **N-06**；`ledger.feature` 仍为「v3-1 + v3-2」未含 v3-3 → 发现 **N-04** | ⚠️ |
| V14 | 人工面如实登记 | 读清单核二值 | 逐项 ⏳ | `build.md`/`state.json` 的人工面（树逐层展开观感 / 窄栏长路径观感 / 键盘体感 / 明暗观感）**逐项登记未执行**，无冒充 PASS ✅ | ✅ |
| V15 | ROADMAP 登记范围 | grep | 只在未立项小节 | `F-29` 仅 3 处：§「未来方向候选（未立项）」标题/正文 + 修订记录 `v1.25.0`（明写「未立项未排期」）；**未出现在任何版本的承诺列表** ✅ | ✅ |
| V16 | 验证纪律 | git 前后状态 | 零改动 / 不动 main | `git status --porcelain` 运行前 **0**、运行后 **0**；每个门禁后单独复核仍 **0**；`HEAD 97f9e42` 未变、`main 2ddc922` 未动；未 `git add`/`commit`/`push`；探针全部落 `/tmp/opencode/v3-validate-v33/` ✅ | ✅ |

---

## 3. 验证详细信息

### 3.1 🔴 F-01 独立复现（V2 — 我自己做的，不复用其日志）

**步骤与原文**（探针 `/tmp/opencode/v3-validate-v33/rp-f01/`）：

1. 自建副本：`cp test/ui/l2.mjs /tmp/opencode/v3-validate-v33/rp-f01/l2.mjs`（**同 basename** `l2.mjs`），删 1 条 `check(`：
   `check('① \`#log\` 默认可见（会话记录仍是默认主区）', occ.logHidden === false, String(occ.logHidden));`
   → `check(` 计数 **68 → 67**（锚点命中次数 = 1，删除生效）。
2. **形态 B（正确调用）**：`node dist-test/test/supersession-ledger.test.js --files-override /tmp/opencode/v3-validate-v33/rp-f01/l2.mjs`
   - `EXIT=1`
   - 第 9/24 行：`✖ ledger: v3 新增门禁的运行时 check 计数不低于台账下界（--files-override 的判据）`
   - 第 25 行（**预期文本逐字命中，且带我自己的副本路径前缀 = override 分支真执行的证据**）：
     `AssertionError [ERR_ASSERTION]: --files-override /tmp/opencode/v3-validate-v33/rp-f01/l2.mjs: 运行时 check 计数 67 < 台账下界 68 —— 删除断言未登记`
   - `ℹ tests 11 / pass 10 / fail 1`
   - **启动错误扫描**：`grep -cE "ERR_MODULE_NOT_FOUND|Cannot find module|MODULE_NOT_FOUND|SyntaxError|EADDRINUSE|No such file"` = **0** ⇒ **不是「因错而红」**
3. **形态 A（历史错误形态，负控）**：`node --test dist-test/test/supersession-ledger.test.js --files-override <同副本>` → `EXIT=1`，第 5 行
   `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '…/rp-f01/_v3-helpers.mjs' imported from '…/rp-f01/l2.mjs'`，且第 22 行仍打印真文件的 `l2.mjs: 68 ≥ 68` ⇒ **证伪了 build 轮原记录的归因**（历史记录确为无效反证）。
4. **还原 / PASS 段**：`node dist-test/test/supersession-ledger.test.js` → `EXIT=0`，`ℹ tests 11 / pass 11 / fail 0`，`计数核对：l0 73≥73 / density 60≥60 / l1 64≥64 / l2 68≥68`。
5. **真文件零改动**：`git status --porcelain test/ui/l2.mjs` = 空；`sha256 0ffa77e0…`；`check(` = **68**。

**判定**：✅ F-01 的修复**真实有效**，且**不被启动错误解释**（三个必要条件全部独立满足）。build 轮原记录（无效反证）与修复轮记录（形态 B）的差异我也逐字核对了 `build.md §6/§6.1/§9.1`。

### 3.2 🛡️ 新防呆对抗（V3 — 本轮重点）

**(a) 判定器自身反证（我自跑）**：`node test/reverse-proof-judge.mjs --selftest` → **5 passed / 0 failed**，`exit=0`，输出含 `✔ 判定器自身反证 PASS：因错而红被判无效，真反证被判有效`。

**(b) 我自写的 14 条对抗（`attack-judge.mjs`，直接 `import` 判定器）** → **9 条被绕过**：

| 样本 | 形态 | 期望 | 实测 | 结论 |
|---|---|:--:|:--:|---|
| ATK-01 | 输出**同时**含 `ERR_MODULE_NOT_FOUND` 与预期文本 | invalid | invalid ✅ | 规则 4 生效（命中文本也在启动错误行时不豁免；启动错误在**同一输出**任一行即判无效） |
| ATK-02 | 预期文本出现在 **`✔`（通过行）** + 另一条真失败 | invalid | **valid ❌** | **绕过**：判定器只要求「某行命中」，**不要求该行是失败行** |
| ATK-03 | 预期文本出现在**说明性 `ℹ` 行**（回显判据文案）+ 无关失败 | invalid | **valid ❌** | 同上 |
| ATK-04 | 声明过宽正则 `/./` | invalid | **valid ❌** | 声明侧过宽 |
| ATK-05 | 声明过宽字面量 `'test'`（命中噪声行 `ℹ test harness started`） | invalid | **valid ❌** | 同上 |
| ATK-06 | 启动错误标记**大小写变体** `err_module_not_found` | invalid | **valid ❌** | 标记匹配大小写敏感 |
| ATK-07 | 启动错误标记被**换行拆断** | invalid | invalid ✅ | 同输出的另一行仍含 `Cannot find module` |
| ATK-08 | `ECONNREFUSED` / `Failed to launch chromium: EACCES`（**列表外**的环境类致命错误） | invalid | **valid ❌** | **绕过**：Chromium 启动失败类不在标记表 |
| ATK-09 | `FATAL ERROR: Reached heap limit … out of memory`（**列表外**） | invalid | **valid ❌** | **绕过**：OOM 类不在标记表 |
| ATK-10 | `Error: CDP socket not open (readyState=3) after 15000ms`（**列表外**） | invalid | **valid ❌** | **绕过**：**正是 v3-2 F-01 的 CDP 死亡形态** |
| ATK-11 | `exit=1` 且既无失败标记也无启动错误 | invalid | invalid ✅ | 规则 2 生效 |
| ATK-12 | 预期文本命中「`✖` 下一行」的**备注行** | invalid | **valid ❌** | 同 ATK-02 类 |
| ATK-13 | 真反证（对照） | valid | valid ✅ | 真阳性 |
| ATK-14 | 负控包装器（把真反证当负控判） | invalid | invalid ✅ | 包装器自身可失败 |

**(c) 声明侧（`attack-r4a.mjs`）**：R4a 的正则 `expectFailPattern:\s*(…)` + `length > 3` 对下列文本**全部算作合法声明**：
`// expectFailPattern: 'fake-a'`（注释）、`/* expectFailPattern: 'fake-b' */`（块注释）、`const doc = "expectFailPattern: /fake-c/"`（字符串字面量）、`expectFailPattern: '/../'`（过宽）、`expectFailPattern: '✖ '`（占位级）。
实测两个真实 harness 的声明数 = 下界（`l1-reverse` **9/9**、`l2-reverse` **6/6**，**无余量**）⇒ **本轮未被利用**。

**(d) 本轮证据是否被上述绕过实际污染**：**否**。我自己的 `test:l2-reverse` 运行（§4）逐条打印了命中行，6 条**全部命中各自预期断言自身的 `✖`/`AssertionError` 行**（例如 RP-V33-01 命中 `✖ ① \`#view-host\` 默认 hidden…`、RP-V33-02 命中 `✖ ③ 真值（新增一个已授权站点）变化后计数**确实随之变化**…`、RP-V33-05 命中 `AssertionError: 登记基线 349925B ≠ 实测产物 349926B`）；RP-V33-03-NEG **如期被判无效**（理由 = `同一输出里存在启动/加载错误（ERR_MODULE_NOT_FOUND）`）。

**⇒ 新发现 N-01（中）/ N-02（中）/ N-03（低）**，详见 §6。

### 3.3 计数真值派生（V4）

| 检查项 | 独立真值 | 实测 | 一致？ |
|---|---|---|---|
| `tree` 计数 | `insight-tree → meta.counts` 六维合计 | `115 == 115`（`{sites 2, capabilities 16, commands 23, subcommands 71, llms 1, sessions 2}`） | ✅ |
| `commands.live` | `counts.commands + counts.subcommands` | `94 == 23 + 71` | ✅ |
| `commands.baseline` | `CATALOG_BASELINE_META`（34+142，被 `insight-archive.test.ts` A7 pin 到 `loadBaseline()`） | `176` | ✅ |
| **改真值 → 计数变** | 经既有通道**新增 1 个已授权站点** | `sites 2→3`、`Σ 115→117`、`tree 115→117`，**Δ 相等**；`live` 不动（污染检查 ✅） | ✅ |
| `audit` 计数 | 既有 `audit-export` 回包长度 | `derived 7 == channel 7`；环缓冲增长后 `0 → 7` | ✅ |
| `settings` 计数 | `SETTINGS_SECTION_IDS.length` vs 渲染出的 `.wc-section` 数 | `derived 7 == rendered 7` | ✅ |
| 目录渲染卡数 | `deriveCounts().commands.live` | `94 == 94` | ✅ |
| **写死路径搜索** | 默认值回退 / `catch` 回退常量 / 首渲染占位 / 超时兜底固定值 | `treeNodeCount/liveCommandCount/baselineCommandCount` 未读到真值时返回 **`null`**（渲染 `…`，不冒充 `0`）；`refreshCatalogView` 快照缺失时渲染**显式不可用文案**（不显示陈旧态）；`refreshAuditView` 的 `catch` 返回 `null` 且**不写计数**；唯一常量是**对账基线**（登记为独立口径，有 A7 pin）与**设置分区登记表**（有双向守卫） | ✅ 无硬编码 |

**口径澄清（我实测推翻了一个「看起来像 bug」的怀疑）**：本夹具的 live 面是 **23 工具 / 71 子命令 = 94 卡**，故入口显示 `实时 94 卡 / 基线 176 行`、渲染 94 张卡 —— 与快照逐项相等；spec/task 引用的 `L3 122` 是 **P0 开发面 fixture** 的数字（28/94），**不是本夹具的验收值**。EC-V3-016 要求的「实时面 / 对账基线分列 + 如实登记差异」成立，且无「已全部渲染」类夸大表述。

### 3.4 语义迁移 / 台账 / 零改动（V5 / V10 / V11 关键原文）

- `#tree-drawer` 实测：`role=region`、`aria-modal=null`、`position=static`；`aria-haspopup` 在 `src` 与 `dist` **0 命中**（迁移为视图语义）。
- `#I-*` 集合差：`bf5773d` **90** 个 → HEAD **98** 个；`comm -23` = **空**（无标识丢失）；`comm -13` = **8** 个（与声称逐字一致）。
- `test/sidepanel-view.test.ts`：`git diff bf5773d..HEAD` = **0 行**（4 项布局契约原样）。
- `test/ui/density-metrics.mjs`：`git diff cf2af32..HEAD` = **0 行**，`git diff bf5773d..HEAD` = **0 行**。
- 受保护区段 hash（我独立复算字节区间）：`journey.mjs [42766,54004)` → `6b45c3fa4027f75a97bb84e0f5d80446a8c316ca4cd6dd83b2fe939c0eb6ba63` ✅；`binding.mjs [107780,115930)` → `be9ad0e983670137d4233349aede1cae0f0b6fdf26a050083761d30d52c6b936` ✅。
- 台账叶相对盲区：门禁文件在 `bf5773d..HEAD` 有删除行 **42** 条（insight 25 / l0 17）；其中 **28 条**落在 `entries.oldTitle` 覆盖之外（主要是 v3-1/v3-2 引入的**注释与判据管道行**，如 `deepDrift` / `stableFields` / `SKELETON_EXEMPT_TARGETS` 块）。**实质断言位**均被 `V33-S1~S9` / `V33F-S12` 的 `oldTitle` 逐字覆盖；盲区本身**已被如实登记**（`v3ReverseProofExpectations.note` + `build.md §F-02`）⇒ 记为观察 **N-09**，非隐瞒。

### 3.5 密度独立复测（V12 — 自写口径）

| 格 | 我实测（自写实现） | 登记值 | 一致？ |
|---|---|---|---|
| `default@320` | `C1 7 / C2 7 / C3 19 / C4 6 / chars 220` | 同 | ✅ |
| `default@400` | 同 | 同 | ✅ |
| `default@520` | 同 | 同 | ✅ |
| `firstRun@320` | `7 / 12 / 25 / 6 / 384` | 同 | ✅ |
| `firstRun@400` | 同 | 同 | ✅ |
| `firstRun@520` | 同 | 同 | ✅ |
| `default` 三视口相等 | `chars 220/220/220` | 要求相等 | ✅ |

夹具稳态锚点：每格 `#notice` 存在、可见、29 字符（与我复跑的 `density.mjs` 阶段断言一致）。

### 3.6 体积与归因（V7）

| 检查项 | 实测 | 登记 / 上限 | 一致？ |
|---|---|---|---|
| `dist/content.js` | **177,076 B**，sha `52a826205553b46a896ccad54225d63ba62f5f7fe7c969a9bc2e655448d5b5f6` | pin 177,076（无容差） | ✅ |
| `dist/sidepanel.js` | **349,925 B** | 基线 349,925 / ceiling 367,421（公式 `floor(×1.05)`，cap `record-only`） | ✅ |
| 自跑归因（`--rev cf2af32 --rev WORKTREE`） | `Δ 54,700`（`43,528 新必需 + 10,488 接线 + 265 位移 + 419 胶水`）；`Σ per-module 54,281` + `419` = `54,700` | 同 | ✅ |
| 必需占比 / 未解释字节 | `54,016/54,700 = 98.75%`；未解释 `684 B` | 98.7% / 684 B | ✅ |
| Feature 累计 | `(349,925−266,500)/266,500 = +31.30%`；时间线含 v3-1 / v3-1-I6 / v3-2 / v3-2 收口 / v3-3 / v3-3-fix 六轮 | 同 | ✅ |

> 说明：默认参数 `npm run size:attribution`（无 `--rev`）会做 **HEAD vs HEAD**（`Δ = 0`），**不能**用来复现增量表；可复现形态是 `--rev cf2af32 --rev WORKTREE`（登记册 `reproduceCommand` 与我实测一致）。此点已在 `build.md §5.2` 写明。

### 3.7 构建与脚本（V1 落点）

| 命令 | 退出码 | 计数 / 输出摘要 |
|---|:--:|---|
| `npm run typecheck` | 0 | 无输出（0 error） |
| `npm run build` | 0 | `content.js 172.9kb` / `sidepanel.js 341.7kb`；产物字节与登记值逐项相等 |
| `npm test` | 0 | `ℹ tests 776 / pass 776 / fail 0` |
| `npm run test:supersession` | 0 | `11/11`；`计数核对：l0 73≥73 / density 60≥60 / l1 64≥64 / l2 68≥68` |
| `npm run test:density` | 0 | `127 passed / 0 failed`；`default@320/400/520 C1=7 C2=7 C3=19 C4=6 chars=220`；阶段 F 22 格 == 基线 |
| `npm run test:l0` | 0 | `164 passed / 0 failed` |
| `npm run test:l1` | 0 | `103 passed / 0 failed` |
| `npm run test:l2` | 0 | `71 passed / 0 failed`（静态 `check(` = 68） |
| `npm run test:ui` | 0 | `167 assertions` |
| `npm run test:insight` | 0 | `116 assertions` |
| `npm run test:binding` | 0 | `192 assertions` |
| `npm run test:hardening` | 0 | `24 assertions` |
| `npm run test:e2e` | 0 | `R8 E2E PASS` |
| `npm run test:gate-integrity` | 0 | `ℹ tests 12 / pass 12`；含 R4c 实跑 `--selftest 5/0` |
| `npm run test:l1-reverse` | 0 | `9 条全绿`，最终 `sha256 与原始构建逐字一致` |
| `npm run test:l2-reverse` | 0 | `6 条全绿`（含负控判无效），最终 `sha256 复原 ✔` |

**计数对照（被验证方声称 → 我的实测）**：`776→776` ✅、`11→11` ✅、`127→127` ✅、`164→164` ✅、`103→103` ✅、`71→71` ✅、`167→167` ✅、`116→116` ✅、`192→192` ✅、`24→24` ✅、`e2e PASS→PASS` ✅、`12→12` ✅、`l1-reverse 9→9` ✅、`l2-reverse 6→6` ✅。**零不一致**。

---

## 4. 验证脚本执行记录

> ADR-003 落地：由本 Agent 自主编写并直接执行；全部落 `/tmp/opencode/v3-validate-v33/`（不入版本库）。

| 脚本 / 目录 | 用途 | 对应场景 | 退出码 | 关键输出 |
|---|---|:--:|:--:|---|
| `gates/01..18-*.log` | 门禁串行复跑（含 build / typecheck / 体积 / 归因），**全量日志** | V1 / V7 / V13 | 全 0 | 见 §3.7 表 |
| `rp-f01/{formA,formB,pass}.log` | **F-01 独立复现**（形态 B/A/还原） | V2 | 1 / 1 / 0 | `67 < 台账下界 68 —— 删除断言未登记` / `ERR_MODULE_NOT_FOUND` / `11/11` |
| `attack-judge.mjs` + `.out` | 14 条对抗判定器（含 5 个指定形态） | V3 | 0（打印结论） | `14 probes, 9 bypassed` |
| `attack-r4a.mjs` | 攻击 R4a **声明侧**正则 | V3 | 0 | 6/6 假声明被算作合法 |
| `judge-selftest.log` | 判定器 `--selftest` | V3 | 0 | `5 passed / 0 failed` |
| `my-density-probe.mjs` + `.out` | **自写口径**密度 6 格复测 | V12 | 0 | `all 6 cells match the registry` |
| `my-l2-probe.mjs` + `.out` | L2 四视图零占用 / ≤2 交互 / 返回（自写点击序列） | V8 | 0 | 见 §2 V8 行 |
| `my-views-probe.mjs` + `.out` | 逐视图全文档滚动容器普查 + `#log` 计算态 + settings 开关形态 | V8 / V6 | 0 | `tree/commands/audit: #log hidden=true`；`settings: #panel-main display:none` |
| `my-counts-probe.mjs` + `.out` | 计数真值与快照/归档口径对账 | V4 | 0 | `state.insight.counts = {…}` / `live cards 94` |
| `my-catalog-probe.mjs` + `.out` | 计数双向实验 + 目录/树只读事实 | V4 / V9 | 0 | `tree 115->117；sites 2->3`；`hard=3 withOptions=0`；`acts == 9 白名单` |
| `audit-ledger.py` / `audit-ledger-b.py` / `audit-ledger-c.py` + `.out` | 台账逐行审计（base 相对 / 叶相对 / hash / 豁免） | V10 | 0 | `base 相对未覆盖 = 0`；`LOST=0 / NEW=8`；hash 复原 |

---

## 5. 阻塞问题

| # | 位置 | 问题 | 对应 Vx | 修复建议 |
|---|------|------|:--:|---------|
| — | — | **无**（0 阻塞） | — | — |

---

## 6. 我独立发现的新问题（分级 + 可执行修复）

### N-01（中，防呆强度）— 判定器不要求「命中行本身是失败行」，「无关位置 + 另一处真失败」可被判为有效反证

- **位置**：`packages/web-cli-plugin/test/reverse-proof-judge.mjs:107-135`（`matchLine` + 返回 `valid: true`）。
- **可复现**（我自写样本 ATK-02，`attack-judge.mjs`）：
  ```
  expectFailPattern: '默认 hidden（视图宿主不是常驻 chrome）', exitCode: 1, output:
    ✔ ① 四视图默认零占用：默认 hidden（视图宿主不是常驻 chrome）
    ✖ ⑦ 树视图：9 动作白名单顺序不符（expected a,b got b,a）
  → 判定器输出 valid=true（理由「因该红而红」）
  ```
  同理 ATK-03（`ℹ` 说明行回显判据文案）/ ATK-12（`✖` 下一行的备注行）。
- **为何可达**：`test/ui/l2.mjs` 的 `check()` 对**通过行**也打印标题（`✔ <标题>`），而 `expectFailPattern` 正是**标题文本**。因此「注入没打中目标断言、另有别的断言红」时会**误判为有效**——而「注入没打中」正是反证机制本应捕获的情形（本轮 RP-V33-04 的 FAIL 段里就同时有两条无关测试变红，说明这类连带并不罕见）。
- **修复建议（小改）**：`matchLine` 的候选行必须**同时**满足「该行是失败行」——即要求同一行包含 `✖` / `not ok` / `AssertionError` / `FAILED (` 之一；并新增一条 selftest 负控（ATK-02 形态必须判 invalid）。这会让判定器从「文本出现过」升级为「该断言确实失败过」。

### N-02（中，防呆覆盖面）— 启动/环境错误标记表遗漏**整类 Chromium/CDP 失败**，而这正是 v3-2 F-01 的同形缺陷

- **位置**：`reverse-proof-judge.mjs:43-53`（`LAUNCH_ERROR_MARKERS`）；大小写敏感（`:65`）。
- **可复现**（ATK-08/09/10）：输出同时含「预期 `✖` 行」与
  `Error: connect ECONNREFUSED 127.0.0.1:9222` / `Failed to launch chromium: spawn /usr/bin/chromium EACCES` /
  `FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory` /
  `Error: CDP socket not open (readyState=3) after 15000ms`
  → 判定器**全部判 valid**（理由「因该红而红」）。ATK-06（标记小写变体）亦被绕过。
- **为何重要**：本叶新增的两条 harness 里，`test/ui/l2-reverse.mjs` 与 `test/ui/l1-reverse.mjs` 的大量反证都靠**真实 Chromium** 驱动；而 v3-2 的历史 F-01 之一正是「CDP 出错导致红」的形态。判定器对**加载错误**严防，却对**更常见的浏览器/内存/CDP 失败**零防御 ⇒ 「因错而红」的同形缺陷换一个失败域就能再次冒充反证。
- **修复建议**：① 扩充标记表（`ECONNREFUSED` / `CDP socket not open` / `EACCES` / `heap out of memory` / `FATAL ERROR` / `chromium` 启动失败 / `Timeout` 等），并**统一大小写折叠**后匹配；② 更强做法：harness 侧对每个 RP 记录「门禁自身的完成标记」（如 `▶ L2 运行时门禁: N passed` 或 `finish()` 的行）并要求它在 FAIL 段**出现**且**恰好缺失 1 条断言**——这样「红」必须由门禁正常走完后的断言失败产生。

### N-03（低，防呆声明侧）— 元门禁 R4a 以**源码正则计数**判定「声明下界」，注释 / 字符串字面量 / 过宽模式均可满足

- **位置**：`gate-integrity.test.ts:887`（`EXPECT_FAIL_PATTERN_RE`）+ `:894-902`（`declared.length >= caseFloor` + `pattern.length > 3`）。
- **可复现**（`attack-r4a.mjs`）：`// expectFailPattern: 'fake-a'`、`/* expectFailPattern: 'fake-b' */`、`const doc = "expectFailPattern: /fake-c/"`、`'/../'`、`'✖ '` 全部被算作「合法声明」（`length > 3` 不过滤前两者与 `/../`）。只要文件里同时存在**一次** `judgeReverseProof(` 调用与 import 行，R4a/R4b 就能被装饰性声明满足。
- **为何**：真实 harness 目前把声明写在 `CASES` 数组里（9/9、6/6 恰等于下界，**无余量**），故本轮未被利用。
- **修复建议**：① 先剥注释、排除字符串字面量再计数；② 要求声明值是**具体**的（如 `length >= 8` 且至少含一个非空白、非标点字符；或禁用以 `/` 包裹且能匹配「空行 / 单字符 / `test`」的模式）；③ 更稳做法：让 harness 暴露一个 `--list-cases` 输出（`id` + `expectFailPattern`），元门禁**执行**它并核对条数与模式质量，而不是读源码文本。

### N-04（低，登记册保真）— 台账 `feature` 字段未随本叶更新

- **位置**：`docs/v3-supersession-ledger.json#feature` = `"specs-tree-web-cli-plugin-v3-ui / specs-tree-v3-1-l0-shell-density + specs-tree-v3-2-l1-disclosure-refs"`。
- **问题**：本叶已新增 `V33-S1~S14` + `V33F-S1~S14`（28 条）与 `v3ReverseProofExpectations`，但 `feature` 字符串**未包含** v3-3 叶名（同文件 `counts.*.note` 里又逐条写了 v3-3）。门禁只断言 `feature.includes('v3-1')`，故不会红。
- **修复建议**：追加 `+ specs-tree-v3-3-l2-on-demand-views`（历史保留，只追加）；或把该字段改为数组并登记每叶贡献。

### N-05（低，文档数字保真）— `build.md §4` 仍写 `l0 158`，与同文件 §1 / §9.2 及实测（164）矛盾

- **位置**：`build.md:124`：`计数只增不减（nit 772 ≥ 764 / l0 158 ≥ 157 / insight 116 ≥ 108 / … / gate-integrity 9）`。
- **矛盾**：同文件 `:32` 已订正为 `157 → 160 → 164`；`:422` 写 `l0 160 → 164`、`gate-integrity 9 → 12`；我实测 `l0 = 164`、`gate-integrity = 12`。⇒ `:124` 的 `158` 与 `9` 均为**未被 I-03 五处订正覆盖的残留**（`9` 在 `:422` 有对照，`158` 全库无对照）。
- **修复建议**：把 `:124` 的 `l0 158 ≥ 157` 就地订正为 `l0 164 ≥ 157（历史 158 为修复前估值，见 §1）`，`gate-integrity 9` → `12`。

### N-06（低/信息，文档一致性）— `build.md §1/§5.1` 仍以 build 轮值 `349,880 / 367,374` 呈现「三线」，未就地指向 §9.5 的最终值

- **位置**：`build.md:28/42/133`（`sidepanel.js 349,880 == 登记基线；ceiling 367,374`）。
- **问题**：修复轮已在 `:376-384` 明写「前值 → 新值 349,880 → 349,925」并把 ceiling 抬到 367,421，`:415` 也写 `349,925 == 登记基线`；但 §1/§5.1 的**现值表**没有内联指针，读者可能把历史值当现值（对照：§5.2 的 `54,655` 有 §9.5 的对照）。实测现值 = `349,925 / 367,421`。
- **修复建议**：在 §1/§5.1 的侧栏行尾追加「（修复轮 → 349,925 / 367,421，见 §9.5）」。

### N-07（信息，覆盖边界）— 密度门禁未测量「L2 入口面板打开」态，而本次 −3 chars 正是把文本移入该未被测量的态

- **事实**：`default/firstRun/risk` 三档的 `disclosure` 指纹里 `l2-entries:false`（面板关闭）；`test/ui/density.mjs` 全文无 `l2-entries` 引用 ⇒ 面板打开态（承载 `#l2-entry-summary` + 四个带计数标签）**无密度登记格**。
- **判定**：**不构成违规**——常驻足迹确实下降（文本进入默认 `hidden` 子树），FR-V3-045 与 ≤7 预算都成立；且 ADR-V3-026 §6 明确「计数只出现在入口面板与视图标题，不得为展示计数在 L0 增常驻可点」。
- **建议**：若作者希望「密度不回归」覆盖到打开态，可新增一个登记格（或在 `l2.mjs` ④ 追加「面板打开态 C1/C2 ≤ 已登记上限」）。

### N-08（信息，范围边界）— 设置视图不在 `#view-host` 视图替换契约内（走 v1 `body.settings-open` 开关）

- **事实**（我实测）：`[data-l2-view="settings"]` = `#settings-view`，默认 `hidden` ✅、2 次交互可达 ✅、返回走 `#settings-back` ✅；但打开时 **`#panel-main` 计算态 `display:none`**（`#log` 无 `hidden` 属性）、其滚动容器 `#settings-view` 位于 `#panel-main` **之外**，故 `#l2-back` 不参与设置视图的关闭。
- **判定**：与 `FR-V3-051`（复用 v1 设置面板既有实现，只改默认可见性）**一致**，`test/ui/l2.mjs ⑩` 也显式断言「仍由 v1 返回按钮关闭」；但 `FR-V3-047` 的措辞（同一内容区替换 / 单滚动容器 / 顶部「← 返回」）对设置视图是**另一种实现**（CSS 层替换 + 自身返回按钮）。属**已实现但未在 spec/plan 显式登记的边界**。
- **建议**：在 spec §2.2/§7 或 plan ADR-V3-025 补一句「设置视图沿用 v1 视图开关（`body.settings-open` + `#settings-back`），四视图中的其三走 `#log ↔ #view-host` 替换」；或在文档侧明确「单滚动容器」判据的适用范围（`#panel-main` 内的三个视图）。

### N-09（低/信息，台账盲区，已被文档登记）— base 相对删除行判据看不到 v3-1/v3-2 之后引入的行

- **事实**：叶相对 `bf5773d..HEAD` 的门禁文件删除行 42 条中有 28 条不在 `entries.oldTitle` 覆盖内（insight 13 / l0 15，多为注释与判据管道行）。
- **判定**：**非隐瞒** —— `docs/v3-supersession-ledger.json#v3ReverseProofExpectations.note` 与 `build.md §F-02` 均**显式写明**该口径局限；实质断言位（`#I-01e` / `#I-20i/j/k` / `#I-05~10(开)` / `#I-14b/c` / `#I-19h` / `v3RevealComposer`）已逐条以 `oldTitle` 登记（我逐条比对一致）。
- **建议（可执行）**：把每叶的 `base` 串起来（`c2c0e0d → v3-1 → v3-2 → v3-3`），在台账中为每叶登记 `leafBase` 并让门禁**两段都算**（base 相对 + 叶相对），即可把 28 条盲区纳入判据。

### N-10（低，登记形态）— 两个骨架期豁免的**原始登记文本**未逐字保留（只保留摘要）

- **事实**：`v3SkeletonExemptions` 由「两条带 `removalCondition`/`notExempt`/`whyNotContent` 的条目」变为 `{_removedInV33:{…, history:{view-host, settings-count}}}`，原文可在 git 历史取回但**未逐字保留在本轮登记册**（对照：体积/密度登记册均要求「历史值逐字保留」）。
- **判定**：删除**合规**（两条 `removalCondition` 均被本叶交付物满足：`#view-host` 已填充、设置计数已可从 `sections.ts` 派生，且 `l0.mjs ⑥/⑥b` 的 `SKELETON_EXEMPT_TARGETS=[]` / `L2_COUNT_EXEMPT=[]` 被**断言为空**）。
- **建议**：在 `_removedInV33` 内保留原两条的 `why` / `removalCondition` 原文（或标注「原文见 `<commit>`」）。

---

## 7. 未验证项（如实登记，不冒充 PASS）

| 项 | 原因 | 状态 |
|---|---|---|
| 人工面：树逐层展开**观感** / 窄栏**长路径观感** / **键盘体感** / **明暗主题观感** / 读屏 | headless 不可合成（NFR-V3-015 明文要求如实登记） | `⏳ 未执行` |
| 真实用户「≤2 次交互」的**主观可发现性**（入口是否显而易见） | 同上（本轮只验证了**客观可达性**：2 次真实点击 + 计数可见） | `⏳ 未执行` |
| `test/ui/density.mjs --reverse` 的 6 条 RP（v3-1 承继） | 本轮未复跑（v3-3 未改 `density.mjs`：`git diff bf5773d..HEAD` = 0 行；其注册为 in-gate 例外且门禁自身在阶段内断言 FAIL 段文本） | `⏭️ 未复跑`（登记） |
| `test:binding` 的 **HARDENING_C4** 子阶段 | 上游门禁默认跳过（需 `HARDENING_C4=1`；v3-3 未改该门禁） | `⏭️ 未执行`（登记） |
| 「返回后 `activeElement` 回焦目标」 | build 修复轮如实 **deferred**（I-05⑤），本轮确认其仍在 build.md 中登记为 deferred | `⏭️ 已登记 deferred` |

---

## 8. 结论

**结论**: ⚠️ **有条件通过（0 阻塞）**

**指标达标矩阵**：

| 指标 | 要求 | 实测 | 达标？ |
|------|------|------|:--:|
| FR 测试覆盖 | 100%（每个 FR 有测试且通过） | **10/10 = 100%**（FR-V3-045~054，逐条落到 `test:l2` ①~⑩ / `test:insight` / `test:l0` / `l2-counts.test.ts` / 我自写探针） | ✅ |
| NFR 测试覆盖 | ≥ 80% | **13/14 = 92.9%** 门禁级（NFR-V3-015 人工面按纪律不计入 PASS） | ✅ |
| 构建退出码 | 0 | `typecheck 0` / `build 0` / 16 项门禁全 0 | ✅ |
| 阻塞问题数 | 0 | **0** | ✅ |
| 严重漂移 | 0 | **0**（无孤立代码、无需求缺失、`spec.md`/`plan.md` 本轮零改动；台账逐行判据 base 相对未覆盖 = 0） | ✅ |
| 计数只增不减 | 是 | `776 ≥ 764 / 164 ≥ 157 / 116 ≥ 108 / 192 / 167 / 24 / 12 ≥ 9 / 新增 l2(-reverse)` | ✅ |
| 红线零改动 | 是 | `content.js` + 三内容 hash + 判定链两 hash + `manifest.json` + 依赖段 + 阈值 + 无常驻输入框 + 风险位不可折叠 | ✅ |
| 新防呆有效性 | 必须能真 FAIL 且不被「因错而红」欺骗 | 能真 FAIL ✅、能挡历史 F-01 形态 ✅、负控判无效 ✅；但存在 **2 处中等级可绕过形态**（N-01 / N-02，**本轮未被利用**） | ⚠️ |
| 文档/登记册保真 | 声明值 == 实测 | 19 项声明中 17 项逐字对上；3 处残留旧值（N-04 / N-05 / N-06，均**非事实性夸大**，方向为「历史值未就地指向现值」） | ⚠️ |

**理由**：本叶的**实质交付**经我**独立复现**逐项成立且**零不一致**——四视图默认零占用（`hidden` 属性链）、≤2 次真实点击可达且返回可逆、计数与真值同源（含「改真值 → 计数等量变化」与「审计计数 == 既有通道回包长度」）、树归属迁移语义零削弱（`#I-*` LOST=0/NEW=8、4 契约零 diff、阈值零放宽）、台账 base 相对删除行 100% 命中且两个受保护区段 hash 复原、体积按真实产物显式重登记且增量归因自洽、红线零改动；**F-01（review R1 的唯一阻塞）的修复经我自建副本、正确调用形态、启动错误零命中、还原 11/11 四重独立确认，真实有效**。

未判「通过」的唯一原因是**非阻塞的强化空间**：本叶新增的「反证必须命中预期失败文本」防呆在判定面**可被两类形态绕过**（命中行不必是失败行 N-01；启动/加载错误标记表未覆盖 Chromium/CDP/OOM 类 N-02），以及 4 项文档/登记册残留与 3 项覆盖/边界观察。这些**未污染本轮证据**（我逐条核对了 6 条 RP 的命中行均为目标断言自身的失败行，负控如期判无效），故不构成阻塞；但建议按 §6 的建议实现加固（尤其 N-01 + N-02 属同一防线，合计约 30 行改动 + 2 条 selftest 负控），并把这 3 项（N-04/N-05/N-06）就地订正。

> **前置条件说明（如实披露）**：`review-report.md` 的 **R1 = ❌ 不通过（1 阻塞 F-01）**；其后 build 修复轮已处置且 `state.json phase=reviewed`。本轮**没有** R2 审查报告来独立确认 F-01 的关闭——**本轮 validate 的独立复现（§3.1）正是该确认**，故以「0 阻塞」推进到 `validated`。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1）：V1~V16 逐项实测；**F-01 独立复现**（形态 B 命中 `67 < 台账下界 68 —— 删除断言未登记` + override 真执行 + 启动错误 0 命中 + 还原 11/11）；**主动攻击新防呆**（14 条对抗 → 9 条可绕过，均未被利用；`--selftest` 5/5；负控判无效）；自写口径密度 6 格逐格对上；体积三线 + 归因自洽；台账 base 相对 0 未覆盖 + 两段 hash 复原；红线零改动；**0 阻塞**；新发现 N-01~N-03（2 中 1 低）+ 观察 N-04~N-10 | 2026-09-16 | SDDU Validate Agent |
