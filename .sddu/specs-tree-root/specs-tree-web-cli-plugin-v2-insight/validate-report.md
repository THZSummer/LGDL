# 验证报告：specs-tree-web-cli-plugin-v2-insight（web-cli-plugin v2「any insight」· P0 = V2-1 / V2-2 / V2-3）

> **文档定位**: SDDU 验证报告（父 Feature 目录承载；**父 Feature 为轻量规范容器**，本报告汇总 V2-1/V2-2/V2-3 三个 P0 叶子的**动手验证**结果）。作为工作流终点产物。
> **验证策略**: 本报告 §2 自主定义 V1~V18 验证场景（父 `spec.md` FR-V2-xxx / NFR-V2-xxx / EC-V2-xxx / AC-V2-xxx + 父 `plan.md` ADR-V2-001~015 + 三叶 `build.md` + 实际产物 + `review-report.md` C1~C22/W1~W6/T1~T3）。
> **前置依赖**: 父 `spec.md`（FR-V2-001~065 / NFR-V2-001~010 / EC-V2-001~016 / **AC-V2-001~012**）、父 `plan.md`（ADR-V2-001~015）、V2-1/V2-2/V2-3 `build.md` + `state.json`、`review-report.md`（R1，⚠️ 有条件通过）、实际代码/测试/dist 产物。
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-13
> **验证轮次**: R1（P0：V2-1 `f564f44`/`ee5be97` + V2-2 `a1f9453`/`d2f2676` + V2-3 `f45c124`；修复轮 `2f9b2ff`/`26a5ca6`/`ccf621d`）
> **提交区间**: `9f55d1b`（v2 spec 立项）→ `ccf621d`（修复轮收尾）；父 Feature 未执行 tasks/build/review/validate（本报告由作者直接指派）
> **版本**: v1.0
> **更新时间**: 2026-09-13

---

## 1. 验证概要

| 维度 | 数值 |
|------|:--:|
| 验证场景 | 18（V1~V18；门禁实跑 8 + AC 端到端 + 反证实跑 4 + 安全面 + 诚实性 + 文档） |
| 通过 | 16 |
| 失败 | 0 |
| 未执行 / 不适用 | 2（**AC-V2-004 = V2-4 命令档案，P1 不在本轮验收范围**；人工面 V2-H-* 未执行） |
| 阻塞问题 | **0** |
| 非阻塞偏差 | 3（2 处文档陈旧数字 + 1 处 hardening 重建 dist；均低） |
| 结论 | **✅ 通过（0 阻塞）** |

**关键实测数字**：`tsc` **0 error**；插件 `npm test` **616/616 · 0 fail**；`test:insight` **52 断言 PASS**；`test:ui` **167 断言 PASS**（首跑无 `#3c` 抖动）；`test:hardening` **24 断言 PASS**；`test:binding` **180 断言 PASS**；`test:e2e` **PASS**；全仓 `npm test` **1599 tests / 1598 pass / 0 fail / 1 skip**（`web-cli-base` **483/483** 零回归）；`dist/content.js = 1,073,453 B`（**恰等于硬上限 → 零增长**）；`dist/sidepanel.js = 1,110,744 B`（= 新基线，ceiling 1,166,281）。

**方法（本仓库曾 ~1.5GB OOM → 门禁严格串行、绝不并发）**：本 Agent **独立动手执行**（不引用 build/review 的声明作为结论）——按 `tsc --noEmit` → 插件 `npm test` → `test:insight` → `test:ui` → `test:hardening` → `test:binding` → `test:e2e` → 全仓 `npm test` **逐项串行复跑**，每项确认进程退出后再跑下一项；另在可完整还原的前提下做了 3 项**就地反证实跑**（篡改判定链文件 / 篡改 dist 体积 / 删除 parity 基线条目 → FAIL → 完整还原 → PASS）。日志与备份存 `/tmp/sddu-validate-web-cli-plugin-v2-20260913-173405/`。

**内存实况**：启动时 `free -m` = total 7422 / available **942 MB**、无 swap。全部 8 项门禁**均未 OOM、未被杀、未超时**。

---

## 2. 逐项验证场景结果（V1~V18）

| # | 验证对象 | 验证步骤 | 预期结果 | 验证维度 | 验证方法 | 判定 |
|:--:|------|---------|---------|:--:|:--:|:--:|
| **V1** | 插件类型 | `npm run typecheck`（tsc --noEmit） | 0 error | 构建 | 自动化 | ✅ |
| **V2** | 插件单测/安全面（56 文件） | 插件 `npm test` | 0 fail | 测试覆盖 | 自动化 | ✅ |
| **V3** | 侧栏悬浮树 + 布局量化（V2-2） | `test:insight`（真实 dist + CDP，400×900，开/关两态） | ①~⑧ 全绿 | 接口/性能/边界 | 自动化 | ✅ |
| **V4** | v1 UI 旅程零回归（V2-2 红线） | `test:ui`（journey.mjs，v2 零改动文件） | 全绿、v1 断言零删减 | 测试覆盖 | 自动化 | ✅ |
| **V5** | 加固三维 | `test:hardening` | A/B/C 全绿 | 边界 | 自动化 | ✅ |
| **V6** | 真站点撤销/绑定链（V2-3） | `test:binding`（真实 dist + 真实站点 + mock LLM） | 站点撤销/开关关断/失败可读全绿 | 接口 | 自动化 | ✅ |
| **V7** | 真实 dist 全链 E2E | `test:e2e` | 场景 A fixture + B Workbench | 接口 | 自动化 | ✅ |
| **V8** | 全仓回归零降级 | root `npm test`（--workspaces） | 0 fail；base 483 零回归 | 测试覆盖 | 自动化 | ✅ |
| **V9** | AC-V2-001 投影正确性（V2-1） | node 单测：forest/determinism/catalog/state-additive/zero-plaintext | 确定性快照 + 双向对账 + 零明文 | 测试覆盖 | 自动化 | ✅ |
| **V10** | AC-V2-005 六条反向断言 + allow 单调性 | `insight-security.test.ts`（真实 host + 真实 dispatch + 真实判定链） | 六条 fail-closed 全绿 + 非空洞单调 | 安全 | 自动化 | ✅ |
| **V11** | AC-V2-006 体积守卫（含反证） | `size-budget.test.ts` + **实文件篡改反证** | content 零增长；超限真 FAIL | 构建/反证 | 自动化 | ✅ |
| **V12** | W3 判定链内容哈希冻结门禁真伪 | **就地篡改 `policy.ts`（+1 空格）→ FAIL → 完整还原 → PASS** | 真 FAIL、可还原 | 反证 | 自动化 | ✅ |
| **V13** | parity/catalog 对账门禁真伪 | **就地删除基线 `dom` 条目 → FAIL → 完整还原 → PASS** | V2 门禁 + v1 parity 双双 FAIL | 反证 | 自动化 | ✅ |
| **V14** | no-escalation 无空断言/无 bare catch | grep + 内置反证自测实跑 | 0 空断言、0 bare catch、反证真抛 | 反证/漂移 | 自动化 | ✅ |
| **V15** | 安全面（区间 diff / 权限 / 写路径 / deny⇒[] / 零明文） | `git diff --quiet` 区间级 + manifest 实读 + 源码 grep + 实跑断言 | 零新增、写路径封闭 | 安全 | 脚本+手动 | ✅ |
| **V16** | 诚实性（人工面 / T1 / T3 口径 / 内建分歧） | 实跑输出 + 文档逐条复核 | 未执行如实、口径如实、分歧显式钉死 | 漂移 | 手动 | ✅ |
| **V17** | 文档一致性抽样（只报告不修） | grep/diff 对照实现 | 无未标注口径矛盾 | 漂移 | 脚本 | ✅（附 2 低龄陈旧数字） |
| **V18** | 孤立代码 / 需求缺失 / 规格漂移 | parity 双向 + catalog 双向 + git log | 0 漂移 | 漂移 | 脚本 | ✅ |

---

## 3. 门禁实跑原文（A：串行，逐项退出码/计数）

| # | 门禁 | 命令 | 退出码 | 实测原文摘要 |
|:--:|------|------|:--:|------|
| G1 | 插件类型检查 | `npm run typecheck`（tsc --noEmit） | **0** | 0 error；耗时 13s（`START 17:21:13 → END 17:21:26`） |
| G2 | 插件单测/安全面 | `npm test` | **0** | `ℹ tests 616 / pass 616 / fail 0 / cancelled 0 / skipped 0`（duration 61164ms） |
| G3 | 悬浮树 UI + 布局量化 | `npm run test:insight` | **0** | `UI insight PASS — 52 assertions`；布局原文：`{"innerHeight":900,"innerWidth":400,"logFlexGrow":"1","logClientHeight":674,"logRatio":74.9,"composerGapToBottom":8,"fabComposerArea":0,"docOverflowX":0,"logOverflowX":0,"drawerOverflowX":0,"drawerHidden":true,"fabExpanded":"false"}` |
| G4 | v1 UI 旅程（Chromium） | `npm run test:ui` | **0** | `UI journey PASS — 167 assertions`；`#13 侧栏页 0 未捕获异常`、`#13b 0 console error`、`#10/#10b options 0 异常/0 console error`；**首跑无 `#3c` 抖动** |
| G5 | 加固三维（Chromium） | `npm run test:hardening` | **0** | `hardening PASS — 24 assertions`（A 非扩展守卫 / B 未声明协议说明 / C 未重载构建不一致；C#4 默认跳过）⚠️ 该门禁**会中途重建 dist**（build stamp 变），详见 §7 偏差 |
| G6 | 真站点绑定/撤销链（Chromium） | `npm run test:binding` | **0** | `binding PASS — 180 assertions`；`#0g … = PENDING_TIMEOUT`；`#21o/#21o2/#21o3/#21o4 跳过（如实记录，不伪造 PASS）` |
| G7 | 真实 dist 全链 E2E（Chromium） | `npm run test:e2e` | **0** | `R8 E2E PASS — real dist full chain: fixture (AC-010) + LGDL Workbench (AC-009)`；`captureVisibleTab yields a real PNG dataURL (len 107374)` |
| G8 | 全仓回归 | `npm test`（root，--workspaces） | **0** | 逐 workspace：cli 0/0 · core 267/267 · layout 0/0 · render **95 tests / 94 pass / 0 fail / 1 skip** · router 8/8 · lgdl-web 31/31 · lgdl-web-cli 84/84 · op-cli 15/15 · **web-cli-base 483/483** · **web-cli-plugin 616/616**。**合计 1599 tests / 1598 pass / 0 fail / 1 skip** |

> **无 OOM / 无被杀 / 无超时**：8 项门禁均正常退出；未出现需循环重试的情形。`test:ui` 的既有 `#3c` 单点偶发本轮**未复现**（首跑即全绿）；`perf-budget` NFR-007 墙钟阈值本轮亦**未抖动**（全仓 g8 中通过）。

---

## 4. AC-V2-001~012 逐条对照

| AC | 验收项 | 验证手段 | 实测证据（原文/命令） | 判定 |
|----|--------|---------|----------------------|:--:|
| **AC-V2-001** | V2-1 投影正确性（森林/确定性/双向对账/零明文/state additive） | node 单测 | `V2-1 forest shape: version 1, root label, modelNote honestly says non-strict tree, fixed group order`；`V2-1 determinism` ×5（含 `builtAt is NOT part of the hash input`）；`V2-1 catalog: tree command set == deriveTools() + registry (bidirectional, no dup)`；`V2-1 zero plaintext: serialized snapshot/summary never carries key / clipboard / notification / query material`；`V2-1 state additive: existing keys unchanged; insight is an optional additive field`；`insight-projection` 20/20 | ✅ |
| **AC-V2-002** | V2-2 悬浮树 UI + 侧栏布局回归量化（①~⑨） | `test:insight`（G3） | ① `#I-01a/#I-02a/#I-15a~c` FAB 存在且可开合→PASS；② `#I-02b` 四维度（site/capability/command/llm，固定序）+ `#I-03` 徽标→PASS；③ `#I-04` 空态/降级可读→PASS；④ `#I-05~10` `flex-grow === '1'`→PASS；⑤ `#I-05~10` 稳态 `clientHeight **674px** ≥589` + 占比 **74.9% ≥65.0%**→PASS；⑥ composer 底边−视口底 **+8 ∈[0,+8]**→PASS；⑦ `#tree-fab ∩ #composer` 交面积 **0**→PASS；⑧ 文档级水平溢出 **0**（400px）+ `#I-16a/#I-16b` 320px 关/开态零溢出→PASS；⑨ v1 `#15a~#15q` 由 `test:ui` 独立守护、`journey.mjs` 区间 **零改动**→PASS | ✅ |
| **AC-V2-003** | V2-3 撤销与取消授权链 | `test:binding`（G6） | `#21b` 真实撤销控件（button）→`#21d` 拒绝确认=零操作（无 origin-revoke 审计）→`#21f` 站点取消授权即时生效→`#21g` 站点工具**即时移出 `deriveTools()`**→`#21i` 重拉实测→`#21h` 写 origin-revoke 审计；`#21l/#21m` 开关关断→工具即时移出；`#21n` 再开启恢复；可选能力：`#0l` 真实 `permissions.remove`→`#0n` 工具面不再含 bookmarks→`#0o` `optional-permission/revoked` 审计；失败路径 `#21j/#21k` | ✅ |
| **AC-V2-004** | V2-4 命令档案齐全（142 子命令逐条有档） | — | **未跑**：V2-4 为 **P1**（`state.json` childrens 标注 priority=P1 / phase=specified，无 tasks/build），**本轮 P0 验收范围不含**。V2 相关的命令投影/对账由 AC-V2-001/005 覆盖（28 工具·94 子命令实时面）；142 子命令基线由 v1 `parity.test.ts` 守护 | ⏭️ 不适用 |
| **AC-V2-005** | 安全红线六条反向断言 + 零 diff | `insight-security.test.ts`（真实判定链） | 自动授权**读+写皆开**时：① `site-unauthorized`=**deny**（S1）；② `site-unknown`=**deny**（S3）；③ `site-evaluate`=**deny**；④ `site-destructive`/`site-sub-destructive`=**ask**（且 `auto-authorize/allow` 审计 **0** 条）；⑤ `clipboard-read`=**ask**；⑥ `bookmarks-remove`=**ask**。撤销/关断后复验（`clear-auto-auth` / `revoke-capability`）六条仍成立；`allowAfter ⊆ allowBefore` 对**全部 7 动作**成立且 `changed[]` **非空洞**；`policy.ts`/`auto-authorize.ts` **内容哈希**与区间 diff 双零 | ✅ |
| **AC-V2-006** | 体积基线守卫（基线 ≠ 目标预算） | `size-budget.test.ts` + 实文件反证 | `SIDEPANEL_BASELINE_BYTES=1,110,744`（历史 1,068,165/1,085,389 保留）· `ceiling=1,166,281` · `CONTENT_MAX_BYTES=1,073,453`；实测 `content.js=1,073,453`（恰等上限，**零增长**）· `sidepanel.js=1,110,744`（= 基线）；`targetBudgetBytes/targetMet=null`（基线≠目标）；只吞 ENOENT（注入 EACCES/裸 Error 必抛）；**实文件 +1 字节 → 双 FAIL**（见 §5 RP-2） | ✅ |
| **AC-V2-007** | 零新权限 / 零注入 / 不动 base / 不改 options | `git diff --quiet` 区间级 + manifest 实读 | `packages/web-cli-base` exit **0**；`manifest.json` exit **0**；`options.html` exit **0**；`package.json` exit **1** 但**仅新增 `test:insight` 脚本、依赖零新增、`package-lock.json` 零 diff**；`<all_urls>` 零、静态 `content_scripts` 零 | ✅ |
| **AC-V2-008** | 树 ≠ 设置面板（边界） | `test:insight` + `test:ui` + options 零 diff | `#I-01b` FAB/抽屉位于 `#panel-main` 内（非页面注入、非设置视图）；`#I-02a` 点击 FAB 独立开抽屉；`options.html` 区间零 diff；设置面板回归由 v1 `#33f~#33o`/`journey.mjs`（零改动）守护 | ✅ |
| **AC-V2-009** | v1 记录保护 | 区间 `git diff --quiet` | `.sddu/specs-tree-root/specs-tree-web-cli-plugin`（v1 目录）exit **0**；v2 全部内容在新目录；4 子 Feature 均为叶子（`childrens[].leaf=true`）；父 `state.json` 未执行 tasks/build/review/validate | ✅ |
| **AC-V2-010** | `delay` 撞词消歧 | `test:insight` + `tree-view.test.ts` | `#I-11b` `delay`(= deny, fail-closed) 与命令间 `delayMs` 消歧文案**同处**；`V2-2 tree-view: pinned wording (model note + no-escalation / delay disambiguation)`；`delayMs` 与档位分列（`command-catalog` delayMs 独立字段） | ✅ |
| **AC-V2-011** | 门禁串行 + 全仓 0 fail + base 483 + tsc 0 | G1~G8 串行记录 | 8 项串行、**全部 exit 0**；`web-cli-base 483/483`；`tsc` 0 error；全仓 0 fail（1 个既有 skip 属 render，与 v2 无关） | ✅ |
| **AC-V2-012** | 范围纪律（NG-V2-001~010） | 逐项 grep/diff | ① 命令级覆盖：`tree-ops` 无命令级动作、`commandControls` 仅 `kind:'none'`；② 静态权限假撤销：`capability-catalog` `revocable:false` + `controls:[]`；③ 页面注入层：无 `<all_urls>`/无静态 `content_scripts`；④ 树内改绑 LLM：无改绑写路径（Only 断开）；⑤ 改判定链：`policy.ts`/`auto-authorize.ts` 区间与哈希双零；⑥ 改 options：`options.html` 零 diff；⑦ 不解决 NFR-007：`CONTENT_BUNDLE_TARGET_BYTES=64KiB`、`targetMet=false` 保留 D31；⑧ 新增依赖/权限：零；⑨ 不合 main 不发布：`main=2ddc922` 未动、无 merge；⑩ 不改 v1 文件：v1 目录零 diff | ✅ |

---

## 5. 反证实跑结果（C：本仓库有「虚绿门禁」前科 → 主动反证）

> 全部反证在**不影响最终工作区**的前提下进行：先备份，篡改 → 实跑 → **完整还原** → 复跑确认 PASS。收尾 `git status --porcelain` **为空**（证明零残留）。

| # | 反证对象 | 做了什么 | 篡改后结果 | 还原后结果 | 判定 |
|:--:|---------|---------|-----------|-----------|:--:|
| **RP-1** | **W3 内容哈希冻结门禁**（`insight-no-escalation`） | 就地 `src/security/policy.ts` **追加 1 个空格**（pin `bfcb2e…` → `7c3cf5…`） | 冻结用例 **FAIL（exit 1）**，报错原文：`AssertionError: src/security/policy.ts 内容哈希漂移：7c3cf5d796c6f8bee980b3a3d98ee755d70aefc47096fb3fbff8351389f5fc2a ≠ 钉死值 bfcb2edeceae19a27384aef6608e9f2ae9c3a0f6c1e5d3618f277164bb3c89a8`（tests 2 / pass 1 / fail 1） | `git checkout` 还原 → 哈希回到 pin → **2/2 PASS**；`git status --porcelain` 空 | ✅ 真 FAIL |
| **RP-2** | **size-budget 守卫** | 就地对 `dist/content.js` **+1 字节**（1,073,453→1,073,454）、对 `dist/sidepanel.js` **+55,538 字节**（1,110,744→1,166,282 > ceiling 1,166,281） | 两条 built-size 用例 **双 FAIL（exit 1）**：`content.js 体积回归：实测 1073454B > 回归上限 1073453B（零注入红线：不增长，无容差）；超出 1B`；`sidepanel.js 体积回归：实测 1166282B > 回归上限 1166281B（基线 1110744B × 1.05 容差；基线 ≠ 目标预算）；超出 1B` | `cp` 备份回写 → 字节复原 → **2/2 PASS** | ✅ 真 FAIL |
| **RP-3** | **parity / catalog 对账门禁** | 就地删除 `test/parity/baseline-catalog.json` 的 `dom` 工具（34→33） | `insight-catalog` **FAIL**：`no unregistered LLM-facing tool` / `a dropped tool must be reported as missing`；**v1 `parity.test.ts` 同时 FAIL**：`插件新增了未登记的面向 LLM 的工具：dom` / `toolCount must match tools.length`（合跑 14 tests / 8 pass / **6 fail**） | `git checkout` 还原 → 14/14 PASS；`git status --porcelain` 空 | ✅ 真 FAIL（**同源证明**：V2 门禁与 v1 parity 引用同一基线，双双失败） |
| **RP-4** | **`insight-no-escalation` 空断言/吞错** | 全量 grep + 内置反证自测实跑 | `assert.ok(true)`/`assert(true)`/`assert.pass` 在 `test/` **零命中**；`src/insight/**` + `src/ui/tree/**` bare `catch {}` **零命中**；6 条内置 REVERSE PROOF **6/6 pass**（含 `assert.throws(/内容哈希漂移/)`） | 不适用（未篡改） | ✅ 无空洞 |

> **未做反证实跑项**：无。4 项均完成实跑（RP-1/RP-2/RP-3 为**实文件篡改后完整还原**，RP-4 为 grep + 内置反证自测）。

---

## 6. 安全面核验（D：实跑/实读，不采信转述）

### 6.1 区间级 `git diff --quiet`（`9f55d1b~1..ccf621d`，非 worktree-vs-HEAD）

| 路径 | 退出码 | 判定 |
|------|:--:|:--:|
| `packages/web-cli-base` | **0** | ✅ 零改动 |
| `packages/web-cli-plugin/src/security/policy.ts` | **0** | ✅ 判定链零改动 |
| `packages/web-cli-plugin/src/security/auto-authorize.ts` | **0** | ✅ 判定链零改动 |
| `packages/web-cli-plugin/manifest.json` | **0** | ✅ 权限面零改动 |
| `.sddu/specs-tree-root/specs-tree-web-cli-plugin`（v1 SDDU 目录） | **0** | ✅ v1 记录保护 |
| `packages/web-cli-plugin/options.html` | **0** | ✅ 不改 options |
| `packages/web-cli-plugin/package.json` | **1** | ⚠️ 仅新增 `test:insight` 脚本；**依赖零新增、lockfile 零 diff**（见下） |

**工作区收尾**：`git status --porcelain` **空**（反证明完整还原）；`main = 2ddc92299ad10cfe0ea2b65403243a45ce7fb041`（未动）；`HEAD == origin/feature/web-cli-plugin == ccf621d`（**未 force push**）；区间内 **0 merge commit**；`.opencode/opencode.json` 区间内 **未出现**；区间 diff 内无明文 `sk-…`。

### 6.2 权限面（静态实读 `manifest.json`）

| 检查项 | 实测 | 判定 |
|------|------|:--:|
| 静态 `permissions` | 恰为 `activeTab, scripting, storage, sidePanel, tabs`（= v1 批准集，**零新增**） | ✅ |
| `optional_permissions` | `bookmarks, downloads, notifications, clipboardRead, clipboardWrite`（v1 既有，非 v2 新增） | ✅ |
| `<all_urls>` / 静态 `content_scripts` | **均无**（`grep` 零命中） | ✅ |
| 未批权限（history/cookies/DNR/debugger/tabGroups） | 源码零命中（唯一 `history` 命中为 `chat-state.ts` 的**消息类型** `{type:'history'}`，非权限） | ✅ |

### 6.3 写路径封闭（读码 + grep）

| 检查项 | 证据 | 判定 |
|------|------|:--:|
| 封闭 7 动作白名单 | `TREE_ACTION_IDS` 恰 7 值：`revoke-origin / revoke-capability / set-capability-toggle / set-tabs-toggle / clear-auto-auth / disconnect-llm / dissolve-group`（`tree-ops.ts:38-46`）；`isTreeActionId` 运行时白名单（`:51-53`） | ✅ |
| 无默认写入分支 | `run()` 白名单外→`zeroOutcome` 零操作（`:276-282`）；`switch` 7 case **无 `default:`**、类型不可达兜底仍零写入（`:295-313`）；`grep -nE "default\s*:"` **零命中** | ✅ |
| 无 `grant` / 无命令级动作 | `grep -rnE "\bgrant\b|permissions\.request" src/ui/tree src/insight` → **仅 1 处注释**（`tree-ops.ts:8`）；`src/ui/tree/**` 无 `chrome.*` | ✅ |

### 6.4 `deny ⇒ controls:[]` 与静态权限 `revocable:false`（模型层 + DOM 层）

| 层 | 证据 | 判定 |
|------|------|:--:|
| 渲染模型（命令） | `commandControls`: `if (node.action === 'deny') return []`（`tree-view.ts:251-254`）+ `controlsFor(deny)=[]`（`command-catalog.ts:142-145`） | ✅ |
| 渲染模型（能力） | 静态权限 `revocable:false` + `controls:[]`（`capability-catalog.ts:116-121`）；`capabilityControls` 静态→`[]`（`tree-view.ts:258`）；未授权站点→`[]`（`siteControls:270`） | ✅ |
| DOM 层 | `tree-drawer.ts` 只从 `row.controls` 生成；`kind==='none'` 为 `<span>` 非按钮；全树 `innerHTML` **0**；实跑真实 DOM `denyWithControls === 0`（`insight.mjs` `#I-12`/`#I-18e`） | ✅ |

### 6.5 零明文 / 无静默失败

| 检查项 | 实测证据 | 判定 |
|------|---------|:--:|
| 投影/回执/审计零明文 | `V2-1 zero plaintext: serialized snapshot/summary never carries key / clipboard / notification / query material`（`/sk-|apiKey|token/`、clipboard-content、notification-body、`?q=` 全 0）；`FR-054 bookmarks audit: zero plaintext`；`FR-055 confirm scrub: clipboard/notify content is replaced before the summary + audit`；`audit-sink: masks plaintext args` | ✅ |
| 无静默失败/假成功 | `tree-ops: failures are readable kind:err (transport throw / transport error / missing target)`；`tree-ops: an ops-level failure surfaces verbatim as kind:err (never a success state)`；`tree-ops: needsConfirmation matches the whitelist; unconfirmed ⇒ zero operation`；`tree-ops: repeated revoke is idempotent + readable`；binding `#21j/#21k`（能力撤销失败可读、不假成功） | ✅ |

---

## 7. 诚实性核验（E）+ W1~W6 复核

### 7.1 人工面 V2-H-*（**未执行 → 如实列入人工面**）

- **V2-H-A~D**（悬浮观感/动画/明暗、窄栏字重拥挤、多显示器 DPI、键盘焦点遍历）：`smoke-checklist.md` §5 全部标 **`⏳ 待人工`**，本轮**未执行**。
- **V2-H-1~6**（真实授权弹窗、原生 goBack/goForward、剪贴板真读焦点、真实 `permissions.remove` 回执观感、`chrome://extensions` 外部撤销实时刷新、窄栏二次确认可读性）：`smoke-checklist.md` §6 全部标 **`⏳ 待人工`**，本轮**未执行**。
- 结论：headless（Chrome for Testing 151）无法合成真实手势/权限弹窗，**未冒充 PASS**。

### 7.2 T1 缺口（树侧能力撤销**成功**路径）

- 实跑 `test:binding` 输出原文：`#21o/#21o2/#21o3/#21o4 跳过（如实记录，不伪造 PASS）：headless 无法合成原生 grant 手势 → chrome.permissions.request = PENDING_TIMEOUT；树侧「能力撤销成功」端到端因此保持人工面 V2-H-4，失败路径已由 #21j/#21k 覆盖。`；`#0g … = PENDING_TIMEOUT`。
- 底层「权限 API→工具面」链在 v1 既有自动化 `#0l/#0m/#0n/#0o` 真实可证；树侧成功端到端归 **人工面 V2-H-4**。**处置如实、未伪造**。

### 7.3 T3 覆盖范围口径

- 文档口径如实：**实时投影面 = 28 工具 / 94 子命令（122 命令节点）**（`insight-action-parity.test.ts` 用真实 `createPluginPolicyConfig` + 真实 `PermissionGate` 逐条比对）；**parity 基线 = 34 工具 / 142 子命令**（`insight-catalog.test.ts` / v1 `parity.test.ts`）。
- 两者口径**分列、未混同、无夸大**：catalog 门禁覆盖 34/142 基线双向等价；action-parity 门禁覆盖运行时 28/94 投影面的策略一致性 + 站点域矩阵。实跑：`T3 parity: every projected command action equals the real judgment chain`、`the only divergence is the pinned conservative (stricter) class`、`reachable site domain ... matches the real chain`、`REVERSE PROOF: a manufactured projection/runtime mismatch is detected` 全 PASS。

### 7.4 3 个 base 内建分歧（投影 deny / 运行时 allow）已**显式钉死**

- `web-fetch` / `sleep` / `web-cli-help` 三个 base 内建 risk 缺失：投影展示为 `deny/s3`（fail-closed 保守），真实 gate 对非 site 缺失 risk 走 `riskDefaults['read']`（运行时 allow）。
- 该**保守方向分歧显式钉死**（V2-1 `build.md` D-V21-02 + T3 段），且 `T3 parity: the only divergence is the pinned conservative (stricter) class` 断言**仅此三工具、仅此方向**；其它任何分歧 FAIL。**未掩盖**。

### 7.5 W1~W6 逐条复核

| # | review 项 | 复核结论 | 证据 |
|:--:|---------|:--:|------|
| **W1** | 口径残留（子 V2-2 spec/state + ROADMAP 仍 65.5%） | ✅ **已修（口径残留清零）** | 子 V2-2 `spec.md:56,88` + `state.json:20` + `ROADMAP.md` v1.20.0 行均已订正为「≥589px 主 + ≥65.0% 次（去镀铬，来源 ADR-V2-006）**以现状为准**」，历史 65.5% 保留并显式注记；全 v2 目录 `65.5` 命中**均为历史/订正注记**，无未标注矛盾 |
| **W2** | `insight-protocol` 缺测试 | ✅ **已修** | 新增 `test/insight-protocol.test.ts`（6 测试）：additive kinds 恰两个、合法通过、非法/缺字段/类型错/非对象拒绝、**校验强度等同 `KIND_SET`**、SW 入口无未校验放行；实跑 6/6 PASS |
| **W3** | 冻结门禁语义弱（worktree-vs-HEAD 提交后恒 0） | ✅ **已修（换真闸门）** | 新增 SHA-256 **内容哈希冻结**（`policy.ts` / `auto-authorize.ts`）+ 720 行**判定表快照哈希**；**实文件 +1 空格 → 真 FAIL**（见 §5 RP-1）；仍保留原 git diff 断言（只增不减） |
| **W4** | sidepanel 基线未随 V2-3 重登 | ✅ **已修（显式重登记）** | `SIDEPANEL_BASELINE_BYTES 1,085,389 → 1,110,744`、ceiling `1,139,658 → 1,166,281`；历史值 `[1,068,165, 1,085,389]` 保留在 history 数组；`previousBaselineBytes` + 「必须显式记录上调」断言；`CONTENT_MAX_BYTES` **不变**；+2 门禁 + 随新 ceiling 反证 |
| **W5** | V2-2 build.md 体积 before 数字不自洽（1,065,389 vs 1,068,165） | ✅ **已修** | V2-2 `build.md:119/124` 订正为 `1,068,165 → 1,085,389（+17,224）`，加 W5 脚注说明来源/测量时点，**保留历史行并注「以本订正为准」** |
| **W6** | 「无回归」缺 pinned v1 同条件基线 | ✅ **已修** | `insight.mjs` 新增 `#I-06c`（pinned v1 raw `#log ≥410px`，钉死 418px，容差 8px）+ `#I-06d`（占比 `≥45.4%`，钉死 46.4%），**不降低**既有 405px 下限（只加不减）；实跑 PASS |
| **T2** | `pushInsightChanged` 静默吞异常 | ✅ **已修（去静默）** | `T2 no-escalation: pushInsightChanged has no silent empty catch and logs a diagnostic`（断言旧式 `.catch(()=>{})` 消失 + 有诊断日志 + 注释声明 no state faked）实跑 PASS |

---

## 8. 文档一致性抽样（F：只报告、不修）

| 文档 | 与实现一致？ | 备注 |
|------|:--:|------|
| 父 `spec.md`（FR-V2-023 / AC-V2-002 / §2.5） | ✅ | 口径已统一为「≥589px 主 + ≥65.0% 次 + 去镀铬测量条件」；历史 65.5% 保留并注记 |
| 父 `plan.md`（ADR-V2-001~015） | ✅ | ADR-V2-006 口径说明 + D10 与 spec/实现一致 |
| 三叶 `build.md` | ✅ | W1/W4/W5 订正落地；门禁计数与实测一致（插件 616 / insight 52 / ui 167 / hardening 24 / binding 180） |
| `state.json`（父 + 3 叶） | ✅（父 phase 仍 tasked，叶 builded） | 父 `phaseNote` 保留 tasks 叙述（历史）；叶 `phase=builded` 未被本轮污染 |
| `ROADMAP.md` v1.20.0 素材行 | ✅ | 65.5% 已订正并注「以现状为准」 |
| `docs/dev.md` §11.3 口径订正表 | ✅ | D-V22-01 订正注（只增不改，历史 589px=65.5% 保留并注「以现状为准」） |
| `docs/smoke-checklist.md` §5/§6 人工面 | ⚠️ 低 | `:84` 仍写 `test:insight`「**45 断言**」，实测为 **52 断言**（陈旧数字，未在修复轮更新）；人工面清单本身与实现一致 |
| `docs/dev.md` §8.2 体积表 | ⚠️ 低 | `:190` `dist/sidepanel.js = 1,068,165 B`（标「记录」，系 v1 时点）；v2 后实测 1,110,744 B，未回填（仅报告，不阻塞） |

> **残留 `65.5%` 扫描**：v2 目录内全部命中均为**历史/订正注记**（显式标「以现状为准 / 历史保留」），无未标注矛盾。**无残留旧体积数字被当作当前真值**（`1,065,389` 已订正；`1,068,165` 为 v1 历史并标注）。

---

## 9. 偏差与人工面清单（如实，不冒充 PASS）

**非阻塞偏差（3，均低）**：

1. **`test:hardening` 会中途重建 `dist`**：G5 运行时输出 `C#3 重新 build 后刷新页面（未重载扩展）`，`dist` build stamp 由 `2026-09-13T09:05:42Z` → `09:25:16Z`。复核 `dist/content.js` / `sidepanel.js` **字节数不变**（1,073,453 / 1,110,744），非功能影响；仅说明该门禁对 `dist` 非纯只读（既有行为，非 v2 引入）。
2. **`smoke-checklist.md:84` 陈旧断言数**「45 断言」应为 52（见 §8）。
3. **`dev.md:190` 体积表** `sidepanel.js = 1,068,165 B` 为 v1 时点，未回填 v2 实测（见 §8）。

**人工面（headless 不可合成，未执行）**：V2-H-A~D（悬浮观感/动画/明暗/窄栏/DPI/键盘焦点）；V2-H-1~6（真实授权弹窗、原生 goBack/goForward、剪贴板真读焦点、真实 `permissions.remove` 回执观感、外部撤销实时刷新、窄栏二次确认可读性）。**T1 缺口**（树侧能力撤销成功端到端）归 V2-H-4。

**既有脆弱点（非本轮引入，如实标注）**：`test:ui` 的 `#3c` 单点偶发（v1 `journey.mjs`，v2 零改动）本轮**未复现**；`perf-budget` NFR-007 墙钟阈值（250ms）本轮**未抖动**。若后续轮复现，应隔离重跑并记为「既有抖动、非功能回归」。

---

## 10. 验证脚本执行记录（ADR-003）

> 存放路径：`/tmp/sddu-validate-web-cli-plugin-v2-20260913-173405/`（仓库零污染；`dist/`、`dist-test/` 均 gitignore）。所有脚本由本 Agent 自主编写并直接执行，未走 task→build 流程。

| 脚本/日志 | 用途 | 对应场景 | 退出码 | 关键输出 |
|------|------|:--:|:--:|---------|
| `/tmp/sddu-validate-v2-plugin-test.log` | 插件 `npm test` | V2 | 0 | tests 616 / pass 616 / fail 0 |
| `/tmp/sddu-validate-v2-insight.log` | `test:insight`（Chromium） | V3/AC-V2-002 | 0 | UI insight PASS — 52 assertions；`logClientHeight=674 / ratio=74.9 / composerGap=8 / fabArea=0` |
| `/tmp/sddu-validate-v2-ui.log` | `test:ui`（Chromium） | V4 | 0 | UI journey PASS — 167 assertions |
| `/tmp/sddu-validate-v2-hardening.log` | `test:hardening`（Chromium） | V5 | 0 | hardening PASS — 24 assertions |
| `/tmp/sddu-validate-v2-binding.log` | `test:binding`（Chromium） | V6/AC-V2-003 | 0 | binding PASS — 180 assertions；`#21o*` 跳过 |
| `/tmp/sddu-validate-v2-e2e.log` | `test:e2e`（Chromium） | V7 | 0 | R8 E2E PASS（A + B） |
| `/tmp/sddu-validate-v2-repo-test.log` | 全仓 `npm test` | V8/AC-V2-011 | 0 | 1599 tests / 1598 pass / 0 fail / 1 skip |
| `AC-node-gates.log` | 10 个 V2 门禁单测合跑 | V9~V11/V14 | 0 | 91 tests / 91 pass / 0 fail |
| `RP-builtin-reverseproof.log` | 内置反证自测（no-escalation/size/catalog） | V12~V14 | 0 | 6 REVERSE PROOF / 6 pass |
| `RP1-tamper.log` / `RP1-restored.log` | **W3 哈希冻结反证**（就地篡改 `policy.ts`，`policy.ts.bak` 备份） | V12 | 1 → 0 | 篡改 FAIL（哈希漂移）→ 还原 2/2 PASS |
| `RP2-tamper.log` / `RP2-restored.log` | **size-budget 反证**（`content.js.bak`/`sidepanel.js.bak` 备份） | V11 | 1 → 0 | +1 字节双 FAIL → 还原 2/2 PASS |
| `RP3-tamper.log` / `RP3-restored.log` | **parity/catalog 反证**（`baseline-catalog.json.bak` 备份） | V13 | 1 → 0 | 删 `dom` → V2 门禁 + v1 parity 共 6 FAIL → 还原 14/14 PASS |
| `RP4-noescalation-protocol.log` | no-escalation + insight-protocol 实跑 | V14/W2 | 0 | 23 tests / 23 pass |

**工作区零污染**：全部就地反证已完整还原；收尾 `git status --porcelain` **空**。

---

## 11. 阻塞与结论

**阻塞问题：0。**

**结论：✅ 通过**

| 指标 | 要求 | 实测 | 达标？ |
|------|------|------|:--:|
| 功能需求覆盖率（P0：FR-V2-010~017 / 020~025 / 030~040 / 060~065） | 100% | 三叶 P0 FR 均有实现与对应实跑门禁断言（§4） | ✅ |
| 非功能需求覆盖率（NFR-V2-001~010，除 V2-4 相关） | ≥ 80% | 体积/零注入/权限/布局/安全/可测试/门禁/上游全部有实跑或区间 diff 证据 | ✅ |
| 构建通过 | 退出码 0 | `tsc` **0**；8 门禁全 exit 0 | ✅ |
| 严重漂移 | 0 | 0 孤立代码 / 0 需求缺失 / 判定链零 diff / v1 目录零 diff | ✅ |
| 阻塞问题 | 0 | **0** | ✅ |
| 安全红线（AC-V2-005 六条 + 写路径封闭） | 全 PASS | 六条反向断言 + 单调性非空洞 + 7 动作白名单 + `deny⇒[]`（模型+DOM） | ✅ |
| 反证有效（真会 FAIL） | ≥ 3 项 | W3 哈希冻结 / size-budget / parity 对账 **均实文件反证并完整还原** | ✅ |
| 测试零降级 | v1 journey 零改动、binding append-only | `journey.mjs` diff 空；`binding.mjs` **+283 / −0**；`parity`/`perf-*` 零 diff；断言只增 | ✅ |
| 全仓回归 | 0 fail；base 483 零回归 | 1599 tests / **0 fail** / base **483** / plugin **616** | ✅ |
| 人工面诚实性 | 未执行不冒充 | V2-H-A~D / V2-H-1~6 全 `⏳ 待人工`；T1 缺口如实；T3 口径分列 | ✅ |

**判定理由**：v2 三项 P0 交付本质是「只读投影 + 覆盖式悬浮 UI + 就地调用既有 fail-closed ops」。经**本 Agent 独立动手复跑**（8 门禁严格串行、全程未 OOM）：`tsc` 0 error、插件 **616/616 · 0 fail**、`test:insight` **52 断言**（`#log 674px/74.9%`、composer 贴底 +8、FAB∩composer=0、400·320px 零溢出、开/关 drift=0）、`test:ui` **167**、`test:hardening` **24**、`test:binding` **180**、`test:e2e` **PASS**、全仓 **1599 tests / 0 fail（base 483 零回归）**。**安全红线**以实跑断言逐条证实：AC-V2-005 六条反向断言作用于**真实判定链**（真实 `createWebCliPluginConfig` + 真实 `host.dispatch` + 真实 `decideAutoAuthorization`），`allowAfter ⊆ allowBefore` **非空洞**；写路径为**封闭 7 动作白名单、无默认写入分支、无 `grant`/`permissions.request`**；`deny⇒controls:[]` 与静态权限 `revocable:false` 在**模型层 + 真实 DOM 层**双成立。**反证实跑**（本仓库有虚绿前科）证明三类关键门禁**真会 FAIL**：篡改 `policy.ts` 一空格→哈希冻结 FAIL、dist 超限 1 字节→size FAIL、删基线一条目→V2 门禁 + v1 parity 双双 FAIL，且**全部完整还原、工作区收尾 clean**。红线全 PASS（区间级 base/policy/auto-authorize/manifest/options/v1 目录 exit 0；无 `<all_urls>`/无静态 `content_scripts`/未批权限零出现；依赖零新增；`main` 未动；未 force push）。review 的 6 建议 + 3 提示（W1~W6 + T1~T3）**逐条复核确认已修或已如实披露**（W1/W4/W5/W6 换真闸门或显式订正，T1/T2/T3 显式钉死）。剩余 3 项均为**低龄文档陈旧数字/门禁副作用**，不阻塞。故判为 **✅ 通过（0 阻塞）**——Feature 可关闭，叶子可推进后续流程（仍不合 main、不发布，由作者执行）。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | R1 验证：web-cli-plugin v2 P0（V2-1 `f564f44`/`ee5be97` + V2-2 `a1f9453`/`d2f2676` + V2-3 `f45c124`；区间 `9f55d1b..ccf621d`）。V1~V18 场景；8 门禁串行实跑全 exit 0；AC-V2-001~012 逐条对照（AC-V2-004=V2-4 P1 不适用）；4 项反证实跑（W3 哈希冻结 / size-budget / parity 对账 / no-escalation 空洞性）——就地篡改→FAIL→完整还原→PASS；安全面区间 diff 退出码 + 权限/写路径/`deny⇒[]`/零明文；W1~W6 逐条复核；人工面与 T1/T3/内建分歧诚实性核验。**结论 ✅ 通过（0 阻塞；3 低龄文档/副作用偏差）** | 2026-09-13 | SDDU Validate Agent |
