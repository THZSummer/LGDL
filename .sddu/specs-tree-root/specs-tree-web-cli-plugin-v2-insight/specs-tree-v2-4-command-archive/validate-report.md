# 验证报告：specs-tree-v2-4-command-archive（web-cli-plugin v2 V2-4 命令档案浏览器）

> **文档定位**: SDDU 验证报告（**叶子子 Feature**，v2 最后一个子 Feature，P1，**纯只读展示面**）— 动手验证执行结果，作为工作流终点产物。
> **验证策略**: 本报告 §2 自主定义 V1~V24 验证场景（从 `spec.md` FR-V2-050~056 / NFR-V24-001~005 / EC-V24-001~005 / AC-V24-001~007 + `plan.md` ADR-V2-016~023 + 实际产物 + `review-report.md` C1~C25/W1~W4/T1~T4 提取）；按 §5.1~§5.5 五维度方法论（测试覆盖 / 接口数据 / 构建脚本 / 性能边界 / 漂移检测）设计。**注**：本 Feature 目录沿用 P0 体例，未单独产出 `validate.md` 策略文件，V1~V24 场景矩阵直接定义于本报告 §2 并可复核。
> **前置依赖**: `spec.md`（v1.0）、`plan.md`（ADR-V2-016~023）、`tasks.md`/`tasks.json`、`build.md`（v1.0）、`review-report.md`（R1，**⚠️ 有条件通过 0 阻塞**）、P0 已 `validated` 的 V2-1/V2-2/V2-3、实际代码/测试/dist 产物。
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-13
> **验证轮次**: R1（提交区间 `2ede99c`（V2-4 tasks）→ `be44295`（V2-4 review）；含 build `72fefdf`）
> **版本**: v1.0
> **更新时间**: 2026-09-13

---

## 1. 验证概要

| 维度 | 数值 |
|------|:--:|
| 验证场景 | 24（V1~V24：门禁实跑 8 + AC/FR 端到端 8 + 反证实跑 5 + 安全面 1 + 诚实性 1 + 文档 1） |
| 通过 | 23 |
| 失败（最终） | **0** |
| 未执行 / 不适用 | 1（人工面 V2-H-7~9 + 承前 P0 的 V2-H-A~D/V2-H-1~6 + T1 缺口 —— headless 不可合成，**未冒充 PASS**） |
| 阻塞问题 | **0** |
| 非阻塞偏差 | 2（**本叶新观测**：`test:binding` `#AP#5b` 既有门禁时序偶发，2 跑 1 败 1 绿；**既有潜伏**：`test:hardening` 偶发本轮未复现）+ 4 建议 W1~W4 复核 |
| 结论 | **✅ 通过（0 阻塞）** |

**关键实测数字**：`tsc` **0 error**；插件 `npm test` **646/646 · 0 fail**（含新 `insight-archive` **26**）；`test:insight` **70 断言 PASS**；`test:ui` **167 断言 PASS**（首跑无 `#3c` 抖动）；`test:hardening` **24 断言 PASS**（首跑即绿）；`test:binding` 第 1 跑 **179/180（`#AP#5b` FAIL）** → 同 commit/同 dist 第 2 跑 **180/180 PASS**；`test:e2e` **PASS**；全仓 `npm test` **1629 tests / 1628 pass / 0 fail / 1 skip**（`web-cli-base` **483/483** 零回归）。三层口径**独立复算**：L1 **34/142** · L2 **20/88** · L3 **28/94=122**（distinct 23）· accounted 行级并集 **176/176=100%**。`dist/content.js = 1,073,453 B`（**零增长**）；`dist/sidepanel.js = 1,132,748 B`（= 新基线，ceiling **1,189,385**）。

**方法（本仓库曾 ~1.5GB OOM → 门禁严格串行、绝不并发）**：本 Agent **独立动手执行**（不引用 build/review 的声明作为结论）——按 `tsc --noEmit` → 插件 `npm test` → `test:insight` → `test:ui` → `test:hardening` → `test:binding` → `test:e2e` → 全仓 `npm test` **逐项串行复跑**，每项确认进程退出后再跑下一项；另做 **5 项就地反证实跑**（篡改 `carded` / 删基线一行 / 移除自动授权前置 / 篡改 dist 体积 / 篡改冻结源码 → FAIL → **完整还原** → PASS）。**每条门禁完整日志落盘**（本报告 §9 列全路径），**未使用 `tail -N` 截断**（响应 review W1/D-V24-06）。

**内存实况**：启动时 `free -m` = total 7422 / available **~850–995 MB**（无 swap）。全部门禁**均未 OOM、未被杀**；`test:binding` 第 1 次因 shell 工具默认 120s 超时被外层终止一次（非 OOM，进程日志停在阶段 1 `#19c`），**随即以 600s 超时完整重跑**（第 1 跑失败、第 2 跑绿，见 §3/§7）。

---

## 2. 逐项验证场景结果（V1~V24）

> 维度简称：覆盖=测试覆盖 · 接口=接口/数据 · 构建=构建/脚本 · 边界=性能/边界 · 漂移=漂移/结构/安全。

| # | 验证对象 | 验证步骤 | 预期结果 | 验证维度 | 方法 | 实测结果 | 判定 |
|:--:|------|---------|---------|:--:|:--:|------|:--:|
| **V1** | 插件类型 | `npm run typecheck`（tsc --noEmit） | 0 error | 构建 | 自动化 | 退出码 **0**，14s（`g1-typecheck.log`） | ✅ |
| **V2** | 插件单测/安全面 | 插件 `npm test` | 0 fail；含新 `insight-archive` 26 | 覆盖 | 自动化 | 退出码 **0**，76s；`tests 646 / pass 646 / fail 0`；archive **26** | ✅ |
| **V3** | V2-4 档案子视图 + 布局量化 | `test:insight`（真实 dist + CDP，400×900，开/关） | `#I-19a…h2` 全绿、默认关、档案容器零控件 | 接口/边界 | 自动化 | 退出码 **0**，19s；**70 断言 PASS**；`#I-19g` 零控件 | ✅ |
| **V4** | v1 UI 旅程零回归 | `test:ui`（journey.mjs，v2 零改动） | 全绿、v1 断言零删减 | 覆盖 | 自动化 | 退出码 **0**，46s；**167 断言 PASS**；`#3c` 首跑绿 | ✅ |
| **V5** | 加固三维 | `test:hardening` | A/B/C 全绿 | 边界 | 自动化 | 退出码 **0**，95s；**24 断言 PASS**（首跑即绿，**偶发未复现**） | ✅ |
| **V6** | 真站点绑定/撤销/自动探测链 | `test:binding`（真实 dist + 真实 `localhost:5173` + mock LLM） | 180 断言全绿 | 接口 | 自动化 | 第 1 跑 **FAIL 1（`#AP#5b`）179/180**；同 commit/dist 第 2 跑 **PASS 180/180**（见 §7） | ⚠️→✅ |
| **V7** | 真实 dist 全链 E2E | `test:e2e` | 场景 A fixture + B Workbench | 接口 | 自动化 | 退出码 **0**，54s；`R8 E2E PASS` | ✅ |
| **V8** | 全仓回归零降级 | root `npm test`（--workspaces） | 0 fail；base 483 零回归 | 覆盖 | 自动化 | 退出码 **0**，162s；**1629 tests / 1628 pass / 0 fail / 1 skip** | ✅ |
| **V9** | FR-V2-050 三层有档口径 | 从 `baseline-catalog.json`+`waivers.json`+真实模块**独立复算** | L1 34/142 · L2 20/88 · L3 28/94=122 · accounted 100% | 接口/覆盖 | 脚本 | 与实现/文档**逐项一致**（§5） | ✅ |
| **V10** | 防夸大（carded 只等于 L3） | 读码 + 独立枚举 + 解码 dist 全文 grep | carded=28/94 ≠ baseline 34/142；UI 无「已全部渲染」 | 漂移 | 脚本 | carded 非 baseline；dist 解码后「已全部渲染」恰 1 次且为**否定声明** | ✅ |
| **V11** | FR-V2-051 `deny` 三成因分列 | 读码 + 实跑 fixture | S1/S3/evaluate + auto 分层；`deny` 不可渲染成开关 | 接口 | 脚本 | `DENY_CAUSE_LABEL` 4 项；档案 `deny-cause` 与 `auto-auth` **两行分列**；`denyWithControls=0` | ✅（附 T1） |
| **V12** | FR-V2-052 只读（四层） | 键集合 + 模块导入 grep + 7 动作 + DOM 实跑 | 卡片无控件字段；无写导入；恰 7 值；DOM 0 控件 | 漂移/安全 | 脚本+自动化 | 卡片 15 键 ∩ 禁用 = ∅；9 条禁面零命中；7 值 sha 一致；`#I-19g` 零控件 | ✅ |
| **V13** | FR-V2-053 parity 同源 | 真实 `reconcileCatalog` 复算 + 常量漂移门禁 | 四字段全空；常量 === `loadBaseline()` | 接口 | 脚本 | 四字段全空；`CATALOG_BASELINE_META` 与真值一致（含 40 位 commit） | ✅ |
| **V14** | FR-V2-054 `delay` 单源 | 模块导入检查 + 内容哈希 + DOM 计数 | 恰 1 措辞源；全文档出现 1 次 | 漂移 | 脚本+自动化 | `archive-catalog` 零字面量；sha=`d37fecff…`；`#I-19e` 全文档 1 次 | ✅ |
| **V15** | FR-V2-055 来源标注 | 读码 + 站点 fixture 单测 | `sourceKind` 真值直映；`site_*` 标 origin | 接口 | 自动化 | A3 site fixture 全 7 卡标 origin；真实 dist 无站点→「0 张」分支（见 T4） | ✅（附 T4） |
| **V16** | FR-V2-056 抑制态 + 只读检索 | 读码 + 门禁 A6 + DOM | 抑制态与 `deriveTools()` 一致；检索只读收窄 | 接口 | 自动化 | A6 快照不变 + 真收窄；DOM `#I-19f1/f2` PASS | ✅ |
| **V17** | 反证：防夸大 | 篡改 `carded→baseline.tools` / 删基线一行 | 门禁**真 FAIL**；还原后 PASS | 漂移 | 脚本 | 见 §6 RP-B2a/RP-B2b（`34 !== 28`；`175 !== 176`） | ✅ |
| **V18** | 反证：A3 交叉断言 | 移除 `!origin ⇒ 不自动` 前置 | 站点域矩阵**真 FAIL**（不得从宽） | 漂移 | 脚本 | 16+ 格 `derived=true real=false`；还原绿 | ✅ |
| **V19** | 反证：体积守卫 | dist `sidepanel=ceiling+1` / `content=1,073,454` | 守卫**真 FAIL** | 边界 | 脚本 | 「超出 1B」双 FAIL；还原字节一致 PASS | ✅ |
| **V20** | 冻结机制 | 确认用 sha256 内容 pin（非 `git diff HEAD`）+ 独立复算 8 哈希 + 篡改源码 FAIL | 哈希 === pin；篡改真 FAIL | 漂移 | 脚本 | 8/8 哈希一致；`dom-agent +1B → A8 FAIL`；还原绿 | ✅ |
| **V21** | 空断言 / bare catch | grep 新测试与档案/树模块 | 0 空断言、0 bare catch、0 `try/catch`、0 `git diff HEAD` | 漂移 | 脚本 | 全部零命中（§6 RP-4） | ✅ |
| **V22** | 安全面 | 区间级 `git diff --quiet` + 实读 manifest/权限/依赖/体积/明文 | 冻结面零 diff；零新权限/依赖/模型改动/增长/明文 | 安全 | 脚本 | 见 §7（15 路径 exit 0；service-worker `1 0`） | ✅ |
| **V23** | 诚实性 | hardening 偶发判定 + W1~W4 复核 + accounted 口径 + 人工面 | 未执行不冒充；口径如实 | 漂移 | 手动 | 见 §8 | ✅ |
| **V24** | 文档一致性抽样 | dev.md/smoke-checklist 与 size-baseline/dist 三方对照 | 三方一致；历史值保留 | 漂移 | 脚本 | 四方数字一致（§9） | ✅ |

---

## 3. 门禁实跑原文（A：串行，逐项退出码/计数）

| # | 门禁 | 命令 | 退出码 | 耗时 | 实测原文摘要 | 完整日志 |
|:--:|------|------|:--:|:--:|------|------|
| G1 | 插件类型检查 | `npm run typecheck` | **0** | 14s | 0 error | `g1-typecheck.log`（56 B） |
| G2 | 插件单测/安全面 | 插件 `npm test` | **0** | 76s | `ℹ tests 646 / pass 646 / fail 0 / cancelled 0 / skipped 0`（archive ✔ ×26） | `g2-plugin-test.log`（658 行） |
| G3 | 档案子视图 + 布局量化 | `npm run test:insight` | **0** | 19s | `UI insight PASS — 70 assertions`；布局 `{"logClientHeight":674,"logRatio":74.9,"composerGapToBottom":8,"fabComposerArea":0,"docOverflowX":0}` | `g3-insight.log`（完整 70 ✔） |
| G4 | v1 UI 旅程 | `npm run test:ui` | **0** | 46s | `UI journey PASS — 167 assertions`；`#3c` 首跑绿；`#13/#13b` 0 异常/0 console error | `g4-ui.log`（完整 167 ✔） |
| G5 | 加固三维 | `npm run test:hardening` | **0** | 95s | `hardening PASS — 24 assertions`；**首跑即绿**；C 相位中途重建 dist（字节不变） | `g5-hardening-run1.log`（完整观测汇总） |
| G6 | 真站点绑定/撤销/自动探测 | `npm run test:binding` | **1 → 0** | 220s / 202s | 第 1 跑 `binding FAILED (1): #AP#5b`（179/180）；第 2 跑 `binding PASS — 180 assertions` | `g6-binding.log`（1 跑，完整）/ `g6-binding-run2.log`（2 跑，完整） |
| G7 | 真实 dist 全链 E2E | `npm run test:e2e` | **0** | 54s | `R8 E2E PASS — real dist full chain: fixture (AC-010) + LGDL Workbench (AC-009)` | `g7-e2e.log`（完整） |
| G8 | 全仓回归 | root `npm test`（--workspaces） | **0** | 162s | `cli 0/0 · core 267/267 · layout 0/0 · render 95/94/1s · router 8/8 · lgdl-web 31/31 · lgdl-web-cli 84/84 · op-cli 15/15 · web-cli-base 483/483 · web-cli-plugin 646/646` → **合计 1629 tests / 1628 pass / 0 fail / 1 skip** | `g8-repo-test.log`（1751 行） |

> **无 OOM / 无被杀 / 无超时（最终）**：8 项门禁全部正常退出。`test:ui` 既有 `#3c` 单点偶发本轮**未复现**；`perf-budget` NFR-007 墙钟阈值本轮**未抖动**（在 G8 中通过）。`test:hardening` 的 D-V24-06 偶发本轮**未复现**（首跑即绿，完整日志保留）。
>
> ⚠️ **G6 披露**：`test:binding` **第 1 次运行失败 1 项**（`#AP#5b`），随后的 600s 完整重跑在同一 commit（`be44295`）、同一 dist 字节下 **180/180 全绿**。经判定为**既有门禁时序偶发**（非本叶引入），详见 §7.1。此前 120s 默认超时下被外层终止的**半程运行**不计入门禁判定（进程无残留、端口无冲突）。

---

## 4. AC-V24-001~007 逐条对照

| AC | 验收项 | 验证手段 | 实测证据（原文/命令） | 判定 |
|----|--------|---------|----------------------|:--:|
| **AC-V24-001** | 142 子命令逐条有档（覆盖率 100%）；工具 34/34；无遗漏/无多余 | 独立复算 + 门禁 | L1 **34/142**（raw JSON + `CATALOG_BASELINE_META` + `countBaselineSubcommands` 三源一致）；L3 **28/94=122**；accounted 行级并集 **176/176=100%**，`missingRows=[]`，carded-only 68 + waived-only 108（交集 0）；A1/A2 门禁 26 test 全绿 | ✅ |
| **AC-V24-002** | `deny` 三成因分类正确（S1/S3/evaluate）+ hardDeny | 读码 + 门禁 | `command-catalog.ts:91/94/97/101` 产出 `s1-unauthorized`/`s3-unknown-risk`/`evaluate-floor`；`archive-catalog.ts:298` 恒等消费 `node.denyCause`；auto 层 `autoAuthHardLine` 全量 122 卡 + 站点域 **192 格矩阵** 0 分歧；V2-4 fixture 仅含 `s3-unknown-risk`（见 T1 继承 P0） | ✅（附 T1） |
| **AC-V24-003** | 判定表与 `policy.ts`/`auto-authorize.ts` 一致；parity 双向 FAIL 能力 | 独立复算 + 反证 | 真实 `reconcileCatalog` 四字段全空（`missing/missingSubs/unregistered/extraStale`）；A3 与真实 `decideAutoAuthorization` 全量/矩阵精确等值；**RP-A3 实跑**：移除前置 → 16+ 格 FAIL | ✅ |
| **AC-V24-004** | `deny`/`delay` 节点无开关控件；无命令级覆盖写入路径 | 结构 + DOM | `ArchiveCard` 15 键 ∩ `{controls,actionId,control,actionTarget}` = **∅**；档案模块 9 条禁面 grep 零命中；`denyWithControls=0`；`#I-19g` 真实 DOM 零 `.tree-control`/零 `button[data-action-id]`/零 checkbox | ✅ |
| **AC-V24-005** | `delay` 消歧文案完整；`delayMs` 独立列示；无「第三档位」暗示 | 单源 + DOM | `TREE_NO_ESCALATION_NOTE` 导入（`archive-catalog.ts:24`），模块零第二字面量；sha=`d37fecff…`；`delayMs` 独立字段 + `tree-drawer.ts` 独立列；`#I-19e` 全文档「非可配置档位」恰 1 次 | ✅ |
| **AC-V24-006** | 来源标注正确（含 `site_*` 所属 origin） | 单测 + 读码 | `sourceKind` 真值直映（`archive-catalog.ts:293`）；`originOf` 取 `crossLinks`；A3 站点 fixture 全 7 卡标 origin 且与真实链一致；真实 dist 无绑定站点 → 「0 张」如实计数（见 T4） | ✅（附 T4） |
| **AC-V24-007** | 抑制态与 `deriveTools()` 一致；检索/过滤只读可用 | 单测 + DOM | `suppressed`/`suppressionReason` 直映；A6 过滤前后快照 `JSON.stringify` 全等 + 真收窄；A1 `cardId+抑制态` 唯一；`#I-19f1/f2` PASS | ✅ |

---

## 5. 三层有档口径「独立复算」结果（B1：不引用 build 数字）

> 由本 Agent 自主编写 `recompute-three-layers.mjs`（导入 dist-test 真实模块 + 自写聚合）直接执行，退出码 0，输出 `b1-three-layers.json`。

| 层 | 本 Agent 独立复算 | build/review 声称 | 一致？ |
|----|------------------|------------------|:--:|
| **L1 对账基线** | `baseline-catalog.json`：`tools.length=34`、`subcommands 合计=142`、`toolCount=34`、provenance commit `2ddc92299ad10cfe0ea2b65403243a45ce7fb041`；模块常量同值；`countBaselineSubcommands=142` | 34/142，provenance 同 | ✅ |
| **L2 豁免登记** | `waivers.json` 独立聚合：**20 tools / 88 subs**；byStatus `mapped 4/39` · `not-applicable 9/29` · `baseline-disabled 6/16` · `delegated 1/4` | 20/88 + 同四组 | ✅ |
| **L3 实时投影面** | P0 同款 fixture 跑真实 `buildArchiveModel`：`cards=122`、`toolEntries=28`、`subcommands=94`、distinct tool names=**23**；`snapshot.meta.counts.commands=28 / subcommands=94` | 28/94=122，去重 23 | ✅ |
| **accounted（行级并集）** | 注入真实基线行/豁免行：**176/176=100%**，`missingRows=[]`；carded-only **68** + waived-only **108** + 交集 **0** | 176/176=100% | ✅ |
| **parity** | 真实 `reconcileCatalog`：`missing/missingSubs/unregistered/extraStale` **四字段全空** | 全空 | ✅ |

**`accounted` 运行时口径复核（D-V24-08）**：独立实跑 `buildArchiveModel(snapshot)`（**不注入** `coverageRows`）→ `accounted = {basis:"counts", baselineRows:176, coveredRows:176, missingRows:[], percent:100}`，即**声明式计数**（非运行时实测）；`basis='rows'` 仅在 node 门禁注入真值行时可得。**是否构成口径不实 → 否**：① 运行时 `accounted`/`coverage` **UI 不渲染**（`tree-drawer.ts` 中 `accounted`/`coverage` **零引用**，只渲染 `liveCounts`/`baselineLabel`/`parityLabel`/site-count）；② 头部为**动态构造**的「实时面 N 条目 / M 子命令 = K 卡」（实测无 deps 时 = `实时面 23 条目 / 0 子命令 = 23 卡`）+ 独立「对账基线 34/142（来源 2ddc922）」；③ 行级 100% 由门禁以真实基线行机器验证；④ `NO_EXAGGERATION_NOTE` 明示「只显示实时面卡数，不声称对账基线已全部渲染为卡」。**属如实标注的口径，非夸大。**

**防夸大（V10）**：`carded.tools=28 ≠ baseline.tools=34`、`carded.subcommands=94 ≠ baseline.subcommands=142`（A2 显式断言 `notEqual`）；解码 `dist/sidepanel.js` 全文（非 ASCII 以 `\uXXXX` 转义，本 Agent 解码后 grep）——「已全部渲染」**恰 1 次且仅位于否定句**「不声称对账基线已全部渲染为卡」，静态串 `34/142` / `142 卡` **零命中**。

---

## 6. 反证实跑结果（C：本仓库有「虚绿门禁」前科 → 主动反证实跑）

> 全部反证在**不影响最终工作区**前提下进行：先备份 → 篡改 → 实跑（编译 + 定向 `node --test`）→ **完整还原** → 复跑/对照确认。收尾 `git status --porcelain` **为空**（零残留）。

| # | 反证对象 | 做了什么 | 篡改后结果（原文） | 还原后结果 | 判定 |
|:--:|---------|---------|-------------------|-----------|:--:|
| **RP-B2a** | **防夸大（carded 冒充 L1）** | 就地改 `archive-catalog.ts`：`carded.tools = baseline.tools` | `A1 archive: …` **FAIL**：`AssertionError: 34 !== 28`；`A2 …` **FAIL**：`34 !== 28`（exit 1） | `git checkout` 还原（`diff -q` **字节一致**）→ 定向 A1/A2 **exit 0** | ✅ 真 FAIL |
| **RP-B2b** | **删基线一行** | 就地删 `baseline-catalog.json` 的 `lgdl-web-cli help` 子命令 | `A2 archive: every baseline row …` **FAIL**：`175 !== 176`；`A7 archive: …` **FAIL**：`142 !== 141`（exit 1） | 还原（字节一致）→ `git status` 空 | ✅ 真 FAIL |
| **RP-A3** | **A3 交叉断言（从宽）** | 就地移除 `autoAuthHardLine` 的 `!card.origin ⇒ false` 前置 | `A3 archive: site-domain matrix …` **FAIL**：`站点域矩阵必须逐格与真实判定链一致（不得从宽）` + 16 格 `group=site risk=evaluate|bogus|ui|state origin=false …: derived=true real=false`；`A3 … divergence classes` **FAIL**（exit 1） | 还原（字节一致）→ 定向 A3 **exit 0** | ✅ 真 FAIL |
| **RP-volume** | **体积守卫** | 就地改 dist：`content.js=1,073,454`（+1B）、`sidepanel.js=1,189,386`（= ceiling+1） | `V2-2 size: built sidepanel.js …` **FAIL**：`实测 1189386B > 回归上限 1189385B …；超出 1B`；`built content.js …` **FAIL**：`实测 1073454B > 回归上限 1073453B`（exit 1） | `cp` 备份回写（字节复原：1,073,453 / 1,132,748）→ **exit 0** | ✅ 真 FAIL |
| **RP-4** | **冻结机制 / 空断言 / bare catch** | ① 注 `dom-agent.ts` 追加 1 字节；② grep 空断言与裸 catch | ① `A8 archive: injected content sources + tree modules …` **FAIL**：`src/content/dom-agent.ts 内容哈希漂移：efe62b04… ≠ 钉死值 7df782b3…`（exit 1）；② `assert.ok(true)`/`assert(true)`/`assert.pass` **0**、裸 `catch {}` **0**、`try/catch` **0**、`git diff HEAD` 用法 **0** | ① `git checkout` 还原 → `sha256=7df782b3…` === pin；② 不适用 | ✅ 真 FAIL / 无空洞 |

> **未做反证实跑项**：无（5 项均完成实跑，且均**完整还原**）。**冻结机制确认**：V2-4 新增门禁 `test/insight-archive.test.ts` **全部冻结类断言使用 `sha256` 内容哈希**（A5/A8），文件首注释明示「禁 `git diff --quiet HEAD`」，**未使用** worktree-vs-HEAD 冻结（§6 反证证实其一字节改动即 FAIL）。

---

## 7. 安全面核验（D：实跑/实读，不采信转述）

### 7.1 区间级 `git diff --quiet`（`2ede99c..be44295`，**非 worktree-vs-HEAD**）

| 路径 | 退出码 | 判定 |
|------|:--:|:--:|
| `packages/web-cli-base` | **0** | ✅ 零改动 |
| `src/security/policy.ts` | **0** | ✅ 判定链零改动（哈希 === pin，见 7.4） |
| `src/security/auto-authorize.ts` | **0** | ✅ 判定链零改动 |
| `manifest.json` | **0** | ✅ 权限面零改动 |
| `.sddu/specs-tree-root/specs-tree-web-cli-plugin`（v1 SDDU 目录） | **0** | ✅ v1 记录保护 |
| `src/insight/tree-model.ts` / `tree-view.ts` / `tree-ops.ts` / `tree-receipt.ts` | **0** | ✅ **零模型改动** |
| `src/content/**` | **0** | ✅ content 零改动 |
| `test/parity/**` / `test/parity.test.ts` / `test/ui/journey.mjs` | **0** | ✅ parity / v1 旅程零改动 |
| `packages/web-cli-plugin/package-lock.json` / 根 `package-lock.json` / `package.json` | **0** | ✅ **无新依赖**（V2-4 未改 `package.json`） |
| `src/background/service-worker.ts` | **1**（预期） | numstat = **`1 0`**（仅 +1 行 `catalogMeta` 注入、0 删除、无既有行修改） |

**工作区收尾**：`git status --porcelain` **空**（全部反证完整还原）；`main = 2ddc92299ad10cfe0ea2b65403243a45ce7fb041`（未动）；**0 merge commit**（区间内）；`.opencode/opencode.json` 区间内**未出现**。

### 7.2 权限面（静态实读 `manifest.json`）

| 检查项 | 实测 | 判定 |
|------|------|:--:|
| 静态 `permissions` | 恰为 `activeTab, scripting, storage, sidePanel, tabs`（5 项，零新增） | ✅ |
| `optional_permissions` | `bookmarks, downloads, notifications, clipboardRead, clipboardWrite`（v1 既有） | ✅ |
| `<all_urls>` / 静态 `content_scripts` | manifest 与 `src/` 均**零命中** | ✅ |

### 7.3 零模型改动 / 零增长 / 零明文

| 检查项 | 证据 | 判定 |
|------|------|:--:|
| 零模型改动 | `tree-model/tree-view/tree-ops/tree-receipt` 区间零 diff；唯一 additive = `service-worker` `1 0` | ✅ |
| `catalogMeta` 不进快照 hash 输入 | `dist/background.js:32461` `hashStructure({version,root,groups,facets,counts,sources,degradations,modelNote})` **不含 `catalogMeta`**；`:32484` 仅在返回对象尾部 `...source.catalogMeta ? {catalogMeta} : {}` | ✅ |
| 单行动态导入语义等价（W2） | `dist/background.js:34607` 内联为 `catalogMeta: (await Promise.resolve().then(() => (init_catalog_meta(), catalog_meta_exports))).CATALOG_BASELINE_META`；`dist/` 仍 **7 文件**（无独立 chunk） | ✅ |
| 零增长 | `dist/content.js = 1,073,453 B`（=== `CONTENT_MAX_BYTES`）；`dist/sidepanel.js = 1,132,748 B` ≤ ceiling **1,189,385** | ✅ |
| 基线重登记齐备 | `measuredOn='2026-09-13'` / `source` / `buildCommand` / `reasons(note)` / `previousBaselineBytes=1,110,744` / `reRegisteredFrom='V2-3 1,110,744 B'` / `targetBudgetBytes=targetMet=null`；`HISTORY=[1,068,165,1,085,389,1,110,744]` 单调不减 | ✅ |
| 零明文 | `archive-catalog.ts`/`catalog-meta.ts` grep `sk-`/`apiKey`/`clipboard-content`/`notification-body`/`token`/`?q=` **零命中** | ✅ |

### 7.4 独立哈希复算（8 项，对照 pin）

| 文件/常量 | 本 Agent 独立 `sha256` | pin | 一致？ |
|------|------|------|:--:|
| `src/security/policy.ts` | `bfcb2edeceae19a27384aef6608e9f2ae9c3a0f6c1e5d3618f277164bb3c89a8` | 同（P0 pin） | ✅ |
| `src/security/auto-authorize.ts` | `1096d065dac63d56e36285bf499eee041acdc3e323d4c7215df3981af7d0ef4b` | 同（P0 pin） | ✅ |
| `src/content/content-script.ts` | `a72900313ab77c018961aa2b8e02bb1b630a9960c1b622f2a85addf543f99e82` | 同 | ✅ |
| `src/content/dom-agent.ts` | `7df782b349b32839d0ec25fa515ee293441f85f75242083dae37e5ccfd601e0f` | 同 | ✅ |
| `src/content/page-bridge.ts` | `5737c40a2014e7adf2bf4091a31a347af6600ecfea80f8882d52e9407191f4ac` | 同 | ✅ |
| `src/ui/tree/tree-view.ts` | `023f9fc0687fc7977353de58657d5d1c000ef9bb7cd9ad255f9ccb4629778fd5` | 同 | ✅ |
| `src/ui/tree/tree-ops.ts` | `abf9cdaba89ab63c7f0fa3f9b3ef9e829a702ec45b169de6e378eafacece9257` | 同 | ✅ |
| `src/ui/tree/tree-receipt.ts` | `484bf84f6f7eddf203f519826bb415399a5f4819c3e6e91329cd2b47430d3db6` | 同 | ✅ |
| `TREE_ACTION_IDS`（恰 7 值） | `sha256(JSON)=e5c65cc39397ae1abf0ca0e83ad2dd713866b84b1a505e7c3bf826902908d073` | 同 | ✅ |
| `TREE_NO_ESCALATION_NOTE` | `d37fecffb72ae33df8727a07a58d7f6ccca1455e923c5c962af8121806ababce` | 同 | ✅ |

**机制确认**：V2-4 新门禁以 **`sha256` 内容哈希**为冻结闸门（RP-4① 实跑证明一字节改动即 FAIL），**未**以提交后恒绿的 `git diff --quiet HEAD` 充当冻结。**W4 复核**：P0 既有 `test/insight-no-escalation.test.ts:108/177` 仍保留 `gitDiffHeadStatus`（worktree-vs-HEAD），但已由 P0 内容哈希 pin 兜底；V2-4 未越界修改（如实登记，见 §8.3 W4）。

---

## 8. 诚实性核验（E）+ W1~W4 复核

### 8.1 `test:hardening` 偶发（D-V24-06）本轮复现情况与判定

- **本轮结果**：**首跑即绿**（`hardening PASS — 24 assertions`，退出码 0），**未复现** build 记录的 D-V24-06 偶发（首次运行抛未捕获异常）。
- **完整日志证据**：`g5-hardening-run1.log`（**完整保留，未 `tail` 截断**）——含 A/B/C 三相位全部断言、`C#2` 构建标记 `2026-09-13T11:01:37Z` → `C#3` 重建后 `11:15:45Z`（揭示中途重建 dist）、`C#4` 默认跳过、观测汇总全文。
- **判定：环境抖动（Chromium 启动/CDP 就绪/中途重建时序类），非真缺陷；不阻塞。依据**：① 被测代码 `test/ui/hardening.mjs` 区间 **零 diff**，且 V2-4 未触及 `options.js` 源码（phaseA 仅加载 `options.html`）；② 本 Agent **同 commit 同 dist 首跑即绿**，与 build「复跑两次绿」一致；③ 仓库既有已知副作用（hardening 中途重建 dist）。**本轮未复现**即支持「环境类偶发」判定。
- **W1（日志截断）过程层消解**：本轮**每条门禁完整日志落盘**（§9 列全路径），未使用 `tail -N`，D-V24-06 所痛陈的「原始栈不可复原」在本轮**不发生**——这属**过程/诊断纪律**层面的消解（W1 针对的是 build 当时的日志捕获方式，非代码产物）。

### 8.2 本叶新观测：`test:binding` `#AP#5b` 既有门禁时序偶发（**非本叶引入**）

- **现象（完整原文）**：第 1 跑 `binding FAILED (1): #AP#5b 退避为有界序列（500ms 起，封顶 15s）`，捕获状态 `{"phase":"probing","attempts":2,"retries":1,"inFlight":true,"lastReason":"…HTTP 503…","lastClass":"temporary","lastKind":"transient"}`（**无 `nextDelayMs`**）；第 2 跑同 commit/同 dist `binding PASS — 180 assertions`。
- **根因（读码判定，非猜测）**：`src/discovery/auto-probe.ts:136` 仅当 `phase === 'waiting'` 时才在快照中输出 `nextDelayMs`；而 `test/ui/binding.mjs:1911` 的轮询谓词仅要求 `p.retries >= 1 && p.lastClass === 'temporary'`——该条件在 `phase='probing'`（第 2 次尝试 in-flight，`auto-probe.ts:175` 已置 `nextDelayMs=undefined`）时**同样成立**，故轮询可能命中 `probing` 窗口导致 `rp.nextDelayMs` 为 `undefined` → `#AP#5b` 误报。
- **是否本叶引入 → 否**：`test/ui/binding.mjs`、`src/discovery/auto-probe.ts`、`src/ui/sidepanel/view-model.ts`、`src/ui/sidepanel/chat-state.ts` 在 V2-4 区间（`2ede99c..be44295`）**全部零 diff**；与硬底/撤销/档案逻辑均无关联。
- **判定**：**既有测试harness 时序偶发（谓词过松），非 V2-4 缺陷、非产品缺陷**；**不阻塞**。建议（**N1**）：将谓词收紧为 `p.phase === 'waiting' && typeof p.nextDelayMs === 'number'`（或断言放宽为「若 provided 则 ≥500」并显式处理 probing 窗口）。

### 8.3 W1~W4 复核（review 建议，非阻塞）

| # | review 项 | 复核结论 | 证据 |
|:--:|---------|:--:|------|
| **W1** | `test:hardening` 失败日志 `tail -8` 截断（诊断纪律） | ✅ **过程层已消解**（本轮完整落盘，未截断）；hardening 本身未改 | §8.1 + §9 全日志路径 |
| **W2** | 指标型 AC 诱导单行动态导入 | ✅ **语义等价、无虚绿**；仍为低价值建议 | dist 内联（`background.js:34607`）、`dist/` 7 文件、`hashStructure` 不含 `catalogMeta`（§7.3） |
| **W3** | 运行时 `accounted` 为声明式计数（UI 不渲染） | ✅ **口径如实**：UI 零引用；运行时 basis='counts' 经独立实跑复核；行级 100% 由门禁机器验证 | §5 + `runtime-basis.mjs` |
| **W4** | P0 判定链冻结仍用 `git diff --quiet HEAD` | ✅ **如实登记**（P0 旧患）：`insight-no-escalation.test.ts:108/177` 仍在；已有内容哈希 pin 兜底；**V2-4 新增门禁未使用该弱模式** | §7.4 + grep |

### 8.4 人工面（headless 不可合成，**未执行，不冒充 PASS**）

- **V2-H-7~9**（档案长文案/320px 拥挤度、分组切换观感、真实站点 `site_*` 观感）：`smoke-checklist.md` §7 全部 **`⏳ 待人工`**，本轮**未执行**。
- **承前 P0 的 V2-H-A~D**（悬浮/动画/明暗、窄栏字重、多 DPI、键盘焦点）与 **V2-H-1~6**（真实授权弹窗、原生 goBack/goForward、剪贴板真读焦点、真实 `permissions.remove` 回执、外部撤销刷新、窄栏二次确认）：**未执行**（沿用 P0 结论）。
- **T1 缺口**（树侧能力撤销**成功**端到端）：`test:binding` 原文 `#21o/#21o2/#21o3/#21o4 跳过（如实记录，不伪造 PASS）… headless 无法合成原生 grant 手势 → chrome.permissions.request = PENDING_TIMEOUT`；归 **人工面 V2-H-4**。**本轮 `test:binding` 同样如实跳过，未伪造 PASS**。
- **T4**（真实 dist 无绑定站点）：`#I-19d` 走「0 张」分支（如实计数），`site_*` 正向 DOM 路径仅 node fixture 覆盖；已由 V2-H-9 兜底。

---

## 9. 文档一致性抽样（F：只报告、不修）+ 验证脚本执行记录（ADR-003）

### 9.1 文档三方一致（dev.md §8.2 / size-baseline.ts / dist 实测）

| 项 | `docs/dev.md` §8.2 | `test/size-baseline.ts` | `dist/` 实测 | 一致？ |
|----|:--:|:--:|:--:|:--:|
| `sidepanel.js` | 1,132,748 B | `SIDEPANEL_BASELINE_BYTES=1_132_748` | 1,132,748 B | ✅ |
| sidepanel ceiling | 1,189,385 B | `floor(1,132,748×1.05)=1,189,385` | 计算值 1,189,385 | ✅ |
| `content.js` | 1,073,453 B（零增长） | `CONTENT_MAX_BYTES=1_073_453` | 1,073,453 B | ✅ |
| `background.js` | 1,403,170 B | —（仅记录） | 1,403,170 B | ✅ |
| 历史值 | 1,068,165 / 1,085,389 / 1,110,744 保留 | `HISTORY` 同三项 | — | ✅ |
| `test:insight` 断言数 | 45/52/**70** 历史保留 | — | 实测 **70**（G3） | ✅ |
| 人工面 V2-H-7~9 | §7 `⏳ 待人工` | — | 未执行（如实） | ✅ |

### 9.2 验证脚本执行记录（ADR-003）

> 存放路径：`/tmp/sddu-validate-v2-4-20260913-191047/`（仓库零污染；`dist/`、`dist-test/` 均 gitignore）。脚本由本 Agent 自主编写并直接执行，未走 task→build 流程。

| 脚本/日志 | 用途 | 对应场景 | 退出码 | 关键输出 |
|------|------|:--:|:--:|---------|
| `g1-typecheck.log` | 插件 `tsc --noEmit` | V1 | 0 | 0 error |
| `g2-plugin-test.log` | 插件 `npm test` | V2 | 0 | tests 646 / pass 646 / fail 0（archive ✔×26） |
| `g3-insight.log` | `test:insight`（Chromium） | V3/AC-V24-005 | 0 | UI insight PASS — 70 assertions |
| `g4-ui.log` | `test:ui`（Chromium） | V4 | 0 | UI journey PASS — 167 assertions（`#3c` 绿） |
| `g5-hardening-run1.log` | `test:hardening`（Chromium） | V5/§8.1 | 0 | hardening PASS — 24 assertions |
| `g6-binding.log` / `g6-binding-run2.log` | `test:binding`（Chromium） | V6/§8.2 | **1 / 0** | 1 跑 FAILED(1)#AP#5b；2 跑 PASS 180 |
| `g7-e2e.log` | `test:e2e`（Chromium） | V7 | 0 | R8 E2E PASS（A + B） |
| `g8-repo-test.log` | 全仓 `npm test` | V8 | 0 | 1629 tests / 1628 pass / 0 fail / 1 skip |
| `recompute-three-layers.mjs` → `b1-three-layers.json` | 三层口径独立复算（导入真实模块） | V9/V12/V13 | 0 | L1 34/142 · L2 20/88 · L3 28/94=122 · accounted 176/176 |
| `card-keys.mjs` | `ArchiveCard` 键集合 + deny 无控件 | V11/V12 | 0 | 15 键 ∩ 禁用=∅；denyWithControls=0 |
| `runtime-basis.mjs` | 运行时 `accounted` 口径复核 | V23/§5 | 0 | basis=counts；liveLabel 动态构造 |
| `hashcheck.cjs` | 8 哈希 + 动作/文案 pin 复算 | V20 | 0 | 8/8 === pin |
| `rpB2a-tamper.log` / `rpB2a-restore.log` | 防夸大反证（carded→L1） | V17 | 1 → 0 | `34 !== 28` → 还原 PASS |
| `rpB2b-tamper.log` | 删基线一行反证 | V17 | 1 | `175 !== 176` / `142 !== 141` |
| `rpA3-tamper.log` | A3 前置移除反证 | V18 | 1 | 16 格 `derived=true real=false` |
| `rpVol-tamper.log` / `rpVol-restore.log` | 体积守卫反证 | V19 | 1 → 0 | 「超出 1B」双 FAIL → 还原 PASS |
| `rpFreeze-tamper.log` | 内容哈希冻结反证 | V20 | 1 | `dom-agent.ts 内容哈希漂移` |
| `sidepanel-decoded.js` | dist 解码后防夸大 grep | V10 | — | 「已全部渲染」恰 1 次（否定句） |
| `bak/` | 反证前备份（4 文件；全部还原） | V17~V20 | — | `git status` 收尾空 |

**工作区零污染**：全部就地反证已完整还原（`diff -q` 字节一致 / `git checkout`）；收尾 `git status --porcelain` **空**。

---

## 10. 偏差与人工面清单（如实）

**非阻塞偏差（2）**：
1. **【本叶新观测】`test:binding` `#AP#5b` 既有门禁时序偶发**：2 跑 1 败 1 绿；根因 = 轮询谓词未限定 `phase==='waiting'`，而 `nextDelayMs` 仅在 waiting 相位输出。**非 V2-4 引入**（相关文件区间零 diff）。建议 **N1**（收紧谓词）。
2. **【既有潜伏】`test:hardening` 偶发（D-V24-06）**：本轮**未复现**（首跑绿）；保留为已知既有风险。**W1**（日志截断）在本轮过程层已消解。

**人工面（headless 不可合成，未执行）**：V2-H-7~9（档案观感） + V2-H-A~D + V2-H-1~6（P0 承前）+ T1 缺口（树侧能力撤销成功端到端）归 V2-H-4。

**既有脆弱点（非本轮引入，如实标注）**：`test:ui` `#3c` 单点偶发、`perf-budget` NFR-007 墙钟阈值（250ms）本轮**均未复现**。

---

## 11. 阻塞与结论

**阻塞问题：0。**

**结论：✅ 通过（0 阻塞）**

| 指标 | 要求 | 实测 | 达标？ |
|------|------|------|:--:|
| 功能需求覆盖率（FR-V2-050~056） | 100% | 7/7 均有实现与实跑门禁断言（V9~V16） | ✅ |
| 非功能需求覆盖率（NFR-V24-001~005） | ≥ 80% | 5/5 有实现/实跑证据（只读结构 / 真值一致 / 可测试 / 零明文 / 可读性） | ✅ |
| 构建通过 | 退出码 0 | `tsc` **0**；8 门禁最终全 exit 0（binding 2 跑绿） | ✅ |
| 严重漂移 | 0 | 0 孤立代码 / 0 需求缺失 / 判定链零 diff / v1 目录零 diff | ✅ |
| 阻塞问题 | 0 | **0** | ✅ |
| 三层口径独立复算 | 与实现/文档一致 | 34/142 · 20/88 · 28/94=122 · 176/176=100% **逐项一致** | ✅ |
| 防夸大 | carded = L3，UI 无夸大 | carded=28/94 ≠ 34/142；dist 解码「已全部渲染」仅否定句 1 次 | ✅ |
| 反证有效（真会 FAIL） | ≥ 3 项 | 5 项实文件反证（防夸大 / 删基线 / A3 从宽 / 体积 / 哈希冻结）**均真 FAIL 并完整还原** | ✅ |
| 安全红线 | 零放宽 | 区间 diff 冻结面 exit 0 / `policy·auto` 哈希 === pin / manifest·lock 零 diff / 无新依赖 / DOM 零控件 / `TREE_ACTION_IDS` 恰 7 值内容哈希 | ✅ |
| 测试零降级 | append-only | `insight.mjs` `git diff -U0 \| grep '^-[^-]'` **空**；v1 journey/parity/perf 零 diff；`size-budget` 8 行为**显式重登记例外**（`D-V24-05`，断言结构零删减 42→63） | ✅ |
| 全仓回归 | 0 fail；base 483 零回归 | **1629 tests / 0 fail** / base **483** / plugin **646** | ✅ |
| 人工面诚实性 | 未执行不冒充 | V2-H-7~9 等全 `⏳ 待人工`；binding `#21o*` 如实跳过 | ✅ |

**判定理由**：V2-4 本质是「把 P0 已就绪的命令档案数据在既有抽屉内落地为**结构无控件的只读子视图**」。经**本 Agent 独立动手复跑**（8 门禁严格串行、全程未 OOM）：`tsc` 0 error、插件 **646/646**、`test:insight` **70**（`#I-19a…h2` 全绿、档案容器零控件）、`test:ui` **167**（`#3c` 绿）、`test:hardening` **24**（首跑绿）、`test:binding` **180**（2 跑绿）、`test:e2e` **PASS**、全仓 **1629 tests / 0 fail（base 483 零回归）**。**三层口径由本 Agent 从 `baseline-catalog.json`+`waivers.json`+真实模块独立复算**，数字（34/142 · 20/88 · 28/94=122 · 176/176=100%）与实现/文档**逐项一致**，且**不夸大**（carded 只等于 L3；UI 解码后无「已全部渲染」类表述；运行时 `accounted` 为门禁背书的计数口径且 UI 不渲染）。`deny` 分层派生与**真实**判定链全量 + **192 格矩阵**精确一致（RP-A3 证明其**从宽不得通过**）。**反证实跑**证明 5 类关键门禁**真会 FAIL**且**全部完整还原、工作区 clean**。安全红线零放宽（区间级 `git diff --quiet` 冻结面 exit 0；`policy.ts`/`auto-authorize.ts`/`content/**`/tree 模块 + `TREE_ACTION_IDS`/`TREE_NO_ESCALATION_NOTE` **8 哈希 === pin**；无新权限/依赖；`content.js` 零增长；`sidepanel` 显式重登记齐备）。review 的 W1~W4 复核确认**已如实消解/登记**；`test:hardening` 偶发本轮**未复现**。唯一「本叶新观测」为 `test:binding` `#AP#5b` **既有测试 harness 时序偶发**（相关文件区间零 diff、非 V2-4 引入，2 跑绿并给出根因与修复建议 N1），**不构成阻塞**。据此判为 **✅ 通过（0 阻塞）**——Feature 可关闭（仍不合 main、不发布，由作者执行）。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | R1 验证：web-cli-plugin v2 V2-4 命令档案浏览器（区间 `2ede99c`（tasks）→ `be44295`（review），含 build `72fefdf`）。V1~V24 场景；8 门禁串行实跑（tsc 0 / 646 / 70 / 167 / 24 / **binding 1→180** / E2E / 全仓 1629·0 fail）；AC-V24-001~007 逐条；三层口径**独立复算**（34/142·20/88·28/94=122·176/176）与防夸大核验；5 项反证实跑（防夸大/删基线/A3 从宽/体积/哈希冻结）——就地篡改→FAIL→完整还原→PASS；安全面区间 diff 退出码 + 8 哈希复算；诚实性（hardening 未复现 + binding `#AP#5b` 既有偶发根因 + W1~W4 + accounted 口径 + 人工面）；文档三方一致。**结论 ✅ 通过（0 阻塞；2 非阻塞偏差：binding #AP#5b 既有偶发 / hardening 潜伏偶发）** | 2026-09-13 | SDDU Validate Agent |
