# 构建报告：specs-tree-web-cli-plugin-v2-insight（web-cli-plugin v2「any insight」· P0 收口 + v2 整体收口 + R2 第 1~3 轮）

> **文档定位**: SDDU 构建报告 —— **v2 P0 收口（第 10 轮）+ v2 整体收口（第 11 轮）**。本文件由 `sddu-build` 代行产出，汇总 V2-1 / V2-2 / V2-3 三个 P0 叶子的交付结论，以及 V2-4（P1）与 v2 整体收口（四叶全 `validated`）与本轮文档/状态收口、遗留项登记动作。
> **容器体例声明（重要）**: **父 Feature 为轻量规范容器，不执行 tasks/build/review/validate** —— 本文件与父目录下的 `review-report.md` / `validate-report.md` 一样，是**聚合报告**，由作者/编排器直接指派产出，**不表示父 Feature 进入了 build 流程**；父 `state.json` 保持 `phase=tasked` / `workflow=4.tasks` / `agent=sddu-tasks` 不变。
> **前置依赖**: 父 `spec.md`（FR-V2-001~065 / NFR-V2-001~010 / EC-V2-001~016 / AC-V2-001~012）、父 `plan.md`（ADR-V2-001~015）、三叶 `build.md` + `state.json`、`review-report.md`（R1，⚠️ 有条件通过）、`validate-report.md`（R1，✅ 通过）。
> **创建人**: SDDU Build Agent（代行收口）
> **创建时间**: 2026-09-13
> **版本**: v2.0
> **更新人**: SDDU Build Agent
> **更新时间**: 2026-09-13
> **更新说明**: v2 整体收口（四叶 phase 全 validated；含 V2-4 P1）+ flake 修复（#AP#5b 相位窗口 + tabs harness 时序）+ 完整日志落盘纪律 + 遗留项全量登记（13 项人工面 + T1 + 已知偶发 + 口径 + 未合并/未发布）；**R2 第 1 轮（§9）/ 第 2 轮**；**R2 第 3 轮（review 修复轮 A1~A4 + A6/A7/T4）** 见文末。

---

## 1. 构建概要

| 维度 | 数值 |
|------|:--:|
| 范围 | **v2 P0 三叶**：V2-1 连接树数据模型与状态投影 / V2-2 悬浮连接树 UI 与交互 / V2-3 撤销与取消授权操作面 |
| 完成任务数 | **30 / 30**（V2-1 9 + V2-2 11 + V2-3 10；波次 V2-1 Wave 1~5 → V2-2 Wave 6~9 → V2-3 Wave 10~13 串行） |
| 复杂度分布 | S×7 / M×18 / L×5（三叶合计） |
| 收口动作 | **纯文档 + 状态收口**：三叶 `state.json` phase 推进；父 `state.json` 进度更新；`TREE.md` 刷新；`ROADMAP.md` 交付结论最小追加；`docs/` 3 处偏差订正/登记 |
| 代码/测试变更 | **零**（本轮不碰 `src/`、`test/`）—— 见 §6 零 diff 核验 |
| 测试基线 | 插件 **616/616 · 0 fail**；`test:insight` **52**；`test:ui` **167**；`test:hardening` **24**；`test:binding` **180**；`test:e2e` **PASS**；全仓 **1599 tests / 1598 pass / 0 fail / 1 skip**（base **483** 零回归） |
| 体积 | `content.js` **1,073,453 B（零增长）**；`sidepanel.js` **1,110,744 B**（ceiling 1,166,281） |
| 审查/验证 | review R1 **⚠️ 有条件通过（0 阻塞，`39cd0a1`）** / validate R1 **✅ 通过（0 阻塞，`9f55d1b..ccf621d`）** |
| 授权 | 编排器代作者决策（2026-09-13 授权） |

---

## 2. 文件变更（本轮收口）

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| MODIFY | `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v2-insight/specs-tree-v2-1-connect-tree-model/state.json` | `phase` builded→**validated**；`workflow`→`7.validate`；`agent`→`sddu-validate`；新增 `closeout`（review/validate/修复轮/门禁基线/人工面）；`phaseNote` 追加收口记录 |
| MODIFY | `.../specs-tree-v2-2-floating-tree-ui/state.json` | 同上；`closeout` 另记 W1/W4/W5/W6 修复项与 `test:hardening` 已知副作用 |
| MODIFY | `.../specs-tree-v2-3-revoke-ops/state.json` | 同上；`closeout` 另记 T1/T2/W3 修复项与 T1 缺口 |
| MODIFY | `.../specs-tree-web-cli-plugin-v2-insight/state.json` | 父：`childrens` 三叶 phase→`validated`（V2-4 保持 `specified`）；新增 `closeout`（P0 交付 / P1 待做 / review·validate / 测试基线 / 偏差订正 / 人工面 / 收口纪律）；`notes` + `phaseNote` 追加收口注；`artifacts`/`files` 登记本 `build.md`；**父 phase 保持 tasked（轻量规范容器）** |
| MODIFY | `.../specs-tree-web-cli-plugin-v2-insight/TREE.md`（+ 三叶 TREE.md） | 由 `sddu-tree` Skill 重新生成，反映三叶 `validated` + V2-4 `specified` |
| NEW | `.../specs-tree-web-cli-plugin-v2-insight/build.md` | 本文件（P0 聚合收口报告） |
| MODIFY | `.sddu/specs-tree-root/ROADMAP.md` | 最小追加 F-27 P0 交付结论（§二 v0.8 F-27 + v1.21.0 素材增补行 + 修订记录 v1.21.0 行）；不删既有叙述 |
| MODIFY | `packages/web-cli-plugin/docs/smoke-checklist.md` | §5：`test:insight` 断言数 45→**52**（历史保留，以现状为准） |
| MODIFY | `packages/web-cli-plugin/docs/dev.md` | §8.2：`sidepanel.js` 体积回填 **1,110,744 B**（注明日期/来源/ceiling，历史保留）；§10 登记 `test:hardening` 重建 `dist` 已知副作用；§20 变更记录新增 3.2 行 |
| — | `packages/web-cli-plugin/src/**`、`test/**` | **零改动**（未纳入本轮变更） |

---

## 3. 任务完成清单（三叶交付状态）

| 叶子 | 名称 | 任务 | 优先级 | phase | 状态 | 对应 FR |
|------|------|:--:|:--:|:--:|:--:|------|
| V2-1 | 连接树数据模型与状态投影 | 9（Wave 1~5） | P0 | ✅ **validated** | tracked | FR-V2-010~017 |
| V2-2 | 悬浮连接树 UI 与交互 | 11（Wave 6~9） | P0 | ✅ **validated** | tracked | FR-V2-020~025 |
| V2-3 | 撤销与取消授权操作面 | 10（Wave 10~13） | P0 | ✅ **validated** | tracked | FR-V2-030~040 + FR-V2-060~065 |
| V2-4 | 命令档案浏览器 | 10（Wave 14~17） | P1 | ✅ **validated** | tracked | FR-V2-050~056 |

> **phase 逐级记录**：三叶 `builded → reviewed → validated`（review R1 ⚠️ 有条件通过 0 阻塞 → validate R1 ✅ 通过 0 阻塞 → 修复轮 `2f9b2ff`/`26a5ca6`/`ccf621d`），最终落 `validated`；`status` 保持 `tracked`（**不合 main、不发布**）。
> **V2-4（P1）收口（第 11 轮，2026-09-13）**：`builded → reviewed → validated`（review R1 ⚠️ 有条件通过 0 阻塞，`be44295`；validate R1 ✅ 通过 0 阻塞，`983790a`/`4d15cff`），最终落 `validated`。**v2 四叶现全部 `validated`**（见 §8）。

---

## 4. 低龄偏差订正/登记（validate R1 报告的 3 处）

| # | 位置 | before | after | 处置 |
|:--:|------|------|------|------|
| 1 | `packages/web-cli-plugin/docs/smoke-checklist.md` §5（原 `:84`） | `test/ui/insight.mjs`「**45 断言**」 | 「**52 断言**」〔原记 45 系 V2-2 时点；修复轮新增 `#I-06c`/`#I-06d` 后实测 52，**以现状为准**〕 | ✅ 已订正（历史保留） |
| 2 | `packages/web-cli-plugin/docs/dev.md` §8.2（原 `:190`） | `dist/sidepanel.js = 1,068,165 B`（v1 时点，未回填） | `dist/sidepanel.js = **1,110,744 B**`〔初测 15.1 KB；v1 时点 1,068,165 B；V2-2 时点 1,085,389 B；**2026-09-13 v2 P0 收口回填**（来源 `stat -c %s dist/sidepanel.js`；基线 = 1,110,744 B / ceiling = 1,166,281 B；**以现状为准**）〕 | ✅ 已回填（历史保留） |
| 3 | `test:hardening`（`test/ui/hardening.mjs` C 场景） | 会**中途重建 `dist`**（build stamp 变化；此前未登记） | 在 `docs/dev.md` §10 + 本 `build.md` 如实登记为**已知副作用**（build stamp `2026-09-13T09:05:42Z` → `09:25:16Z`；**字节数不变** `1,073,453`/`1,110,744`；**属既有行为、非 v2 引入**）；**不改 hardening 逻辑** | ✅ 已登记 |

---

## 5. 人工面登记（**未执行，不冒充 PASS**）

> headless（Chrome for Testing 151）**无法合成真实手势 / 原生权限弹窗**；以下人工面本轮**未执行**，一律标 `⏳ 待人工`，**未冒充 PASS**。清单同步见 `docs/smoke-checklist.md` §5/§6。

| 组 | 人工面 | 状态 |
|----|--------|:--:|
| **V2-H-A~D**（V2-2） | A 悬浮观感 / 抽屉进入退出动画 / 明暗主题观感；B 长站点名·长文案·320px 窄栏字重与拥挤度；C 多显示器 / 高 DPI 下 FAB 位置观感；D 键盘 / 焦点遍历真实体感（Tab / Esc / 焦点回归） | ⏳ 未执行 |
| **V2-H-1~6**（V2-3） | 1 真实授权弹窗（`chrome.permissions.request`）；2 原生 `tabs.goBack`/`goForward`；3 剪贴板真读焦点；4 真实用户手势下 `permissions.remove` 浏览器回执观感；5 `chrome://extensions` 外部撤销后树内实时刷新观感；6 窄栏 / 长站点名下二次确认文案可读性 | ⏳ 未执行 |
| **T1 缺口**（V2-3） | 树侧**能力撤销成功**端到端：headless `chrome.permissions.request = PENDING_TIMEOUT` → `test:binding` `#21o*` 如实 observe 跳过；成功分支代码就位，归**人工面 V2-H-4**；失败路径已由 `#21j`/`#21k` 覆盖 | ⏳ 缺口登记 |

---

## 6. 门禁与核验（本轮）

| 核验项 | 命令 | 结果 |
|------|------|:--:|
| `src/` + `test/` 零 diff | `git diff --quiet -- packages/web-cli-plugin/src packages/web-cli-plugin/test` | **exit 0（零 diff）** —— 证明本轮未碰代码/测试 |
| 工作区范围 | `git status --porcelain` | 仅含本轮预期文档/状态文件（见 §2） |
| Chromium 门禁 | — | **未跑**（原因：本轮零 `src/`、零 `test/` 改动，无代码/测试变更需复验）—— **如实标注，不冒充通过** |

> **基线来源**：以下数字引用 **validate R1（`9f55d1b..ccf621d`）的实跑结论**（`validate-report.md` §3 G1~G8 串行全 exit 0），本轮未重复执行：插件 `npm test` **616/616·0 fail**、`test:insight` **52 断言**、`test:ui` **167**、`test:hardening` **24**、`test:binding` **180**、`test:e2e` **PASS**、全仓 **1599/1598 pass/0 fail/1 skip**（base **483**）。

---

## 7. 下一步

| 场景 | 操作 |
|------|------|
| P0 三叶已 validated | 可由作者决定：推进 V2-4（P1）`@sddu-plan`；或按作者要求合入/发布（**不合 main、不发布由作者执行**） |
| 人工面 | 由作者在真实 Chrome 执行 `smoke-checklist.md` §5/§6 的 `V2-H-*`（含 T1 缺口人工面 V2-H-4） |
| 门禁复跑 | 任何后续 `src/`、`test/` 改动后，须按 `tsc → npm test → test:insight → test:ui → test:hardening → test:binding → test:e2e → 全仓 npm test` **串行**复跑（绝不并发；本仓库有 OOM 前科） |

---

## 8. v2 整体收口（第 11 轮，2026-09-13）

> **四叶子 Feature 全部 `validated`（status=tracked）**；父 Feature 仍为轻量规范容器（phase=tasked / workflow=4.tasks / agent=sddu-tasks，不进入 build/review/validate）。授权 = 编排器代作者决策（2026-09-13 授权）。

### 8.1 四叶结论

| 叶子 | 名称 | 优先级 | phase | review | validate | 任务 |
|------|------|:--:|:--:|------|------|:--:|
| V2-1 | 连接树数据模型与状态投影 | P0 | ✅ validated | R1 ⚠️ 有条件通过 0 阻塞 | R1 ✅ 通过 0 阻塞 | 9 |
| V2-2 | 悬浮连接树 UI 与交互 | P0 | ✅ validated | R1 ⚠️ 有条件通过 0 阻塞 | R1 ✅ 通过 0 阻塞 | 11 |
| V2-3 | 撤销与取消授权操作面 | P0 | ✅ validated | R1 ⚠️ 有条件通过 0 阻塞 | R1 ✅ 通过 0 阻塞 | 10 |
| V2-4 | 命令档案浏览器 | P1 | ✅ validated | R1 ⚠️ 有条件通过 0 阻塞（`be44295`） | R1 ✅ 通过 0 阻塞（`983790a`/`4d15cff`） | 10 |

- review 汇总：P0 R1 ⚠️ 有条件通过 0 阻塞（`39cd0a1`，6 建议 W1~W6 + 3 提示 T1~T3）；V2-4 R1 ⚠️ 有条件通过 0 阻塞（`be44295`）。
- validate 汇总：P0 R1 ✅ 通过 0 阻塞（`9f55d1b..ccf621d`）；V2-4 R1 ✅ 通过 0 阻塞（`983790a`/`4d15cff`）。

### 8.2 测试基线与体积（本轮串行实跑，完整日志落盘）

| 门禁 | 结果 | 日志 |
|------|------|------|
| `tsc --noEmit` | **0 error** | `/tmp/v24closeout/01-typecheck.log` |
| 插件 `npm test` | **646/646 · 0 fail** | `/tmp/v24closeout/02-plugin-test.log` |
| `test:insight` | **70 断言 PASS** | `/tmp/v24closeout/03-insight.log` |
| `test:ui` | **167 断言 PASS**（`#3c` 绿） | `/tmp/v24closeout/04-ui.log` |
| `test:hardening` | **24 断言 PASS** | `/tmp/v24closeout/05-hardening.log` |
| `test:binding` ×3 | **180/180 ×3**（`#AP#5b` 全绿） | `/tmp/v24closeout/07-binding-fixed-run1..3.log` |
| `test:e2e` | **PASS** | `/tmp/v24closeout/08-e2e.log` |
| 全仓 `npm test` | **1629 tests / 1628 pass / 0 fail / 1 skip**（base **483** 零回归） | `/tmp/v24closeout/09-repo-test.log` |

体积：`content.js` **1,073,453 B（零增长）**；`sidepanel.js` **1,132,748 B**（ceiling 1,189,385）；`background.js` **1,403,170 B**。

### 8.3 本轮 flake 修复（如实）

| # | 现象 | 根因（读码判定） | 处置 |
|:--:|------|------|------|
| 1 | `test:binding` `#AP#5b` 偶发（验证方 R 定位） | 轮询谓词未限定相位；`nextDelayMs` 仅 `phase==='waiting'` 输出，命中 `probing` 窗口即 undefined | 谓词收紧为 `p.phase === 'waiting' && p.retries >= 1 && p.lastClass === 'temporary'`（**编号沿用、断言不减**）；**未改 `src/discovery/auto-probe.ts` 可观察行为**；修后 ×3 全绿 |
| 2 | `test:binding` `#7m3/#7m4/#7o/#7o2` 偶发（**本轮新观测**：2 跑连败、之后 3 跑绿） | **harness 时序**：自建标签页 `status==='complete'` → `followActiveTab` → `switchSession`，会话切换把确认窗口内的**待决二次确认按「拒绝」取消**（FR-048 / EC-019）；机器负载高时 complete 事件迟到，落在 mute/move 确认窗口内 | harness 先等 4 个自建标签页 `status==='complete'` 再操作（**无断言增删**）；修后 ×3 全绿。**非产品缺陷**（跟随导航是既有设计） |

### 8.4 遗留项登记（不藏）

**A. 人工面未执行（13 项，headless 不可合成；如实登记，未冒充 PASS）**

| 组 | 项 | 状态 |
|----|----|:--:|
| V2-H-A~D（V2-2，4 项） | A 悬浮观感/抽屉动画/明暗主题；B 长站点名·长文案·320px 窄栏字重；C 多显示器/高 DPI 下 FAB 位置；D 键盘/焦点遍历真实体感 | ⏳ 未执行 |
| V2-H-1~6（V2-3，6 项） | 1 真实授权弹窗；2 原生 `goBack`/`goForward`；3 剪贴板真读焦点；4 真实 `permissions.remove` 回执观感；5 `chrome://extensions` 外部撤销实时刷新；6 窄栏二次确认可读性 | ⏳ 未执行 |
| V2-H-7~9（V2-4，3 项） | 命令档案逐条有档观感 / deny 三成因可读性 / 检索过滤体感 | ⏳ 未执行 |
| T1 缺口 | 树侧**能力撤销成功**端到端（headless `chrome.permissions.request=PENDING_TIMEOUT`）；归人工面 V2-H-4，失败路径已由 `test:binding` `#21j`/`#21k` 覆盖 | ⏳ 缺口登记 |

**B. 已知偶发**

- `test:ui` `#3c`：单点偶发（本轮未复现）。
- `perf-budget` NFR-007：墙钟阈值（250ms）负载下偶发抖动（本轮未抖动）。
- `test:hardening`：启动 / CDP 就绪类（D-V24-06；本轮未复现 → 判环境抖动）。
- `test:binding` `#AP#5b`：**本轮已修**（谓词限定 `phase==='waiting'`）。
- `test:binding` `#7m3/#7m4/#7o/#7o2`：**本轮新观测并修**（等待自建标签页加载完成；无断言增删）。

**C. 口径与登记项**

- **D-V24-08**：运行时 `accounted` 为**计数口径**（carded ∪ waived 行级并集 = 100%），UI 不渲染，禁止夸大。
- **D-V24-01**：`service-worker` **+1 行动态导入**（`catalogMeta` 注入，唯一 additive 运行时面）。
- **D-V24-02**：**5 条钉死分歧**（base 内建 `web-fetch`/`sleep`/`web-cli-help` risk 缺失的保守方向）。
- **D-V24-06**：`test:hardening` 会中途重建 `dist`（build stamp 变化、字节数不变）——已知副作用；门禁日志须完整落盘（`docs/dev.md` §6.1）。

**D. 未合并 / 未发布**

- v2 与 v1 均在 **`feature/web-cli-plugin`**；**不合 main、不发布**（合入与发布由作者决定/执行）。
- v1 收口记录（`specs-tree-web-cli-plugin`，`phase=validated` / `status=tracked`）**原样保留、不回退**。

### 8.5 零改动核验（本轮）

| 核验项 | 结果 |
|------|:--:|
| `packages/web-cli-base/**` 零 diff | `git diff --quiet -- packages/web-cli-base` → **exit 0** |
| `src/security/policy.ts` SHA-256 === P0 pin | `bfcb2edeceae19a27384aef6608e9f2ae9c3a0f6c1e5d3618f277164bb3c89a8` ✅ |
| `src/security/auto-authorize.ts` SHA-256 === P0 pin | `1096d065dac63d56e36285bf499eee041acdc3e323d4c7215df3981af7d0ef4b` ✅ |
| `manifest.json` 零 diff | ✅（未改动） |
| v1 SDDU 目录（`specs-tree-web-cli-plugin/**`）零 diff | ✅（只读） |
| `test/ui/journey.mjs` 零改动（v1 门禁） | SHA-256 `f5380c1ef00d61c8570b122fe37b080672a53fd95ec3fd0c6c92a3c36c25d976` ✅ |

---

## 9. R2 实施构建（第 12 轮 · R2 build 第 1 轮：R2-Wave 1 + Wave 2）

> **范围**：仅 **V2-1 模型层（R2-V21-01~05，Wave 1/5）** + **V2-3 覆盖引擎（R2-V23-01~06，Wave 2/5）**；**不做** V2-2 UI（R2-V22-*）与 V2-4 档案（R2-V24-*）。
> **授权**：编排器代作者决策（2026-09-13 授权）+ R2；开放点自行裁决并逐条登记为 D-R2B-01~08。
> **纪律**：不碰 `main` / 不碰 `packages/web-cli-base/**`（红线）/ 不改 v1 SDDU / 不碰 `options.html` / 无新依赖 / 零新权限 / 门禁严格串行（一次一个）/ 完整日志落盘（`docs/dev.md` §6.1）。
> **phase**：不回退（父 `tasked` / 四叶 `validated` 原样）；本轮在父 + V2-1/V2-3 叶 `state.json` 追加 `revisionRounds.R2.buildRounds[0]`。

### 9.1 逐任务完成清单

| 任务 | 内容 | 状态 | 证据 |
|------|------|:--:|------|
| R2-V21-01 | 纯归属树 `src/insight/ownership-tree.ts`（真父子层级 + 主归属链 + 交叉引用；不复制节点；快照扁平面不动） | ✅ | `test/insight-tree-hierarchy.test.ts`（作者两例逐层枚举 / nodeId 唯一 / 多归属 / 扁平面不变 / 反证） |
| R2-V21-02 | `tree-model.ts` additive 字段（`defaultAction`/`overrideAction?`/`effectiveAction`/`overridable`/`clampReason?`；`ControlKind+'command-policy'`；`TreeActionId+2`）+ `command-catalog.ts` 默认/生效分列 + 分层控件 + 偏差文案删除 | ✅ | 偏差文案 `grep -rn` **零命中**；`tree-view.test`/`insight-archive` 全绿；`insight-projection` deny⇒controls:[] 零回归 |
| R2-V21-03 | `project-tree.ts` 注入 `overrides` + 覆盖面分列（live vs baseline）+ 派生 `ownershipTree`（**不进 `meta.hash` 输入**） | ✅ | `insight-tree-hierarchy`：determinism/hash 重算/coverage 分列 + 反证 |
| R2-V21-04 | `build-snapshot.ts` 透传 `overrides`（薄 builder，纯读零副作用） | ✅ | 投影前后存储 diff 为空；`insight-determinism` 零回归 |
| R2-V21-05 | 模型门禁 `test/insight-tree-hierarchy.test.ts`（AC-V21-008~010）+ 既有门禁零回归核验 | ✅ | 11 tests；`removed=0`（git diff --unified=0 删除行=0 + 解析器反证） |
| R2-V23-01 | `src/security/command-override.ts`：`withCommandOverride`（重排 `[S1,S3,override,S2]`）+ `resolveCommandPolicy`/`clampActionForRisk`（硬底线 > 覆盖 > 默认；只收紧） | ✅ | `test/command-override.test.ts` 逐档表；`policy.ts`/`auto-authorize.ts` sha256 不变 |
| R2-V23-02 | 覆盖存储/生命周期（键 `web-cli:command-policy`；单键整对象原子写 + 串行队列 + 无半写 + 同值幂等 + 读失败降级 + 恢复默认单条/全部 + 审计 `command-policy` 零明文） | ✅ | `test/command-override.test.ts`（persist/inherit/idempotent/reset/no-half-write/race/read-fail/audit） |
| R2-V23-03 | `host.ts` 组合（`policy: withCommandOverride(createPluginPolicyConfig(deps, guardedOnAsk), {...})` + `commandOverrides` 注入） | ✅ | `test/insight-override-security.test.ts` ⑦（显式 ask 不被 auto-allow 吞掉 + 基线零变化） |
| R2-V23-04 | 覆盖消息面（`service-worker.ts` 3 cases + `messaging.ts`/`insight-protocol.ts` additive；`pushInsightChanged`；`state.insight.overrideCount`） | ✅ | additive kind 未加入 `KIND_SET`（content.js 恒 1,073,453 B）；`command-policy*` 经既有校验点 |
| R2-V23-05 | `tree-ops.ts` 白名单 **7 → 9** + 两分支 + 保留「无默认写入分支」兜底 + 放宽类条件确认 | ✅ | `test/tree-ops.test.ts` S1/S2/S3；`insight-no-escalation` S12 |
| R2-V23-06 | 覆盖门禁 `test/command-override.test.ts` + `test/insight-override-security.test.ts`（AC-V2-024/025 全项 + 反向断言①~⑤ + 服务端强制反证） | ✅ | 24 tests（10 security + 14 override）；真实 `host.dispatch` |
| R2-V23-07 | `test/ui/binding.mjs` 追加 `#22a…` | ⏸ 留待下一轮（按本轮指令**不**追加 #22a，保持既有 180 零删改） | — |

> V2-2（R2-V22-01~06）与 V2-4（R2-V24-01~05）**未在本轮范围内** → 未完成（见 §9.8）。

### 9.2 文件变更

| 操作 | 文件 | 说明 |
|:--:|------|------|
| NEW | `packages/web-cli-plugin/src/insight/ownership-tree.ts` | 纯归属树（`buildOwnershipTree` / `collectOwnershipNodes` / `ownershipNodeFor` / `ownershipPathFor`；零 IO/零 chrome） |
| NEW | `packages/web-cli-plugin/src/security/command-override.ts` | clamp + 组合 + kv 注入 store（零 `chrome.*`） |
| NEW | `packages/web-cli-plugin/test/insight-tree-hierarchy.test.ts` | 模型门禁（11 tests） |
| NEW | `packages/web-cli-plugin/test/command-override.test.ts` | 覆盖存储/lifecycle 门禁（14 tests） |
| NEW | `packages/web-cli-plugin/test/insight-override-security.test.ts` | clamp 反向断言 + 服务端强制（10 tests） |
| MODIFY | `src/insight/tree-model.ts` | additive 字段/联合扩展 + `CoverageSplit` + `ownershipTree`/`coverage` |
| MODIFY | `src/insight/command-catalog.ts` | 分列 + 分层控件（删偏差文案）+ `overrides` 注入 |
| MODIFY | `src/insight/project-tree.ts` | `overrides` + `coverage` + 派生 `ownershipTree`（hash 输入不变） |
| MODIFY | `src/insight/build-snapshot.ts` | 透传 `overrides`（薄 builder） |
| MODIFY | `src/security/audit-sink.ts` | additive 审计类型 `command-policy` |
| MODIFY | `src/background/host.ts` | `withCommandOverride` 组合 + `guardedOnAsk` + `commandOverrides` 注入 |
| MODIFY | `src/background/service-worker.ts` | `commandPolicy` 单例 + load + 3 cases + 投影注入 + `overrideCount` |
| MODIFY | `src/background/messaging.ts` | additive 3 kind（**未**加入 `KIND_SET`） |
| MODIFY | `src/background/insight-protocol.ts` | additive kind 校验（`ADDITIVE_MESSAGE_KINDS`） |
| MODIFY | `src/ui/tree/tree-ops.ts` | 白名单 9 + `set/reset-command-policy` 分支 + 放宽类确认 |
| MODIFY | `src/ui/tree/tree-view.ts` | `TREE_NO_ESCALATION_NOTE` 两通路重写 + `commandPolicyNeedsConfirmation` + `TreeActionTarget` 扩展 |
| MODIFY | `test/tree-ops.test.ts` / `test/tree-view.test.ts` / `test/insight-no-escalation.test.ts` / `test/insight-archive.test.ts` | 按 §9.4 显式取代（`removed=0`） |

### 9.3 关键实现与证据

**A. 真树形（FR-V2-070/071，AC-V2-020/021）**

- 作者示例①逐层枚举（实跑 `ownershipPathFor(snapshot.ownershipTree,'cmd:site_notes#list')`）：
  `连接树 → 授权的站点 → 站点 https://a.test → 支持的命令 → site_notes → site_notes list`
- 作者示例②逐层枚举（`cmd:dom#read-state`）：
  `连接树 → 支持的命令 → 系统内置命令 → dom → dom read-state`
- **不复制节点**：全树 `id` 唯一（Set.size === length）；snapshot-backed `nodeId` 唯一。
- **多归属**：`cap:opt:bookmarks` `mainOwner=capability`、`crossRefCount>=1`（命令面引用，徽标「亦被 1 处引用（命令面）」）；`cmd:bookmarks` 交叉引用下钻解析到**同一** `nodeId`。
- **扁平面未变**：`groups[2].children` 仍为无 `children` 的扁平 `CommandNode`；`meta.hash` 重算与不带 `ownershipTree` 的输入一致；含 `ownershipTree` 的哈希 ≠ `meta.hash`（证明树不进 hash 输入）。
- 反证：清空 face 的孙层 → 层级谓词 `maxDepth>=4` 为 false，断言必须拒绝。

**B. 覆盖引擎接入点（FR-V2-076，ADR-V2-024/025）**

- 接入点（`src/background/host.ts#createWebCliHost`）：
  `policy: withCommandOverride(createPluginPolicyConfig({...}, guardedOnAsk), { resolveOverride, isDestructive })`
- 策略链顺序（按 name 锚定，缺一抛错）：`[S1-origin-authorization, S3-fail-closed, command-override, S2-untrusted-declared]`；无覆盖时覆盖策略返回 `null` → 与 R2 前逐字节一致。
- clamp 逐档实现（`resolveCommandPolicy` 模型侧 / `clampActionForRisk` 判定链侧，逐档单测）：

| 档 / 类别 | 默认 | 覆盖 allow | 覆盖 ask | 覆盖 deny | 判据 |
|-----------|:--:|:--:|:--:|:--:|------|
| read（`dom read-state`） | allow | ✅ allow | ✅ ask | ✅ deny | `risk==='read'` |
| write·非破坏性（`dom type`） | ask | ✅ allow | ✅ ask | ✅ deny | `risk==='write' && !destructive` |
| 破坏性写（`dom remove`） | ask | ⚠️ clamp→null（保底 ask） | ✅ ask | ✅ deny | `DESTRUCTIVE_VERBS.has(sub)` |
| ui（`dom click`） | ask | ❌ null（不放宽） | ✅ ask | ✅ deny | `risk==='ui'` |
| state / external | ask | ❌ null | ✅ ask | ✅ deny | `risk==='state'\|'external'` |
| evaluate | deny | ❌ null | ❌ null | ❌ null | `risk==='evaluate'`（首行硬拒绝） |
| 未知/非法 risk（S3，sleep/web-cli-help） | deny | ⚠️ 返回 deny（更保守） | ✅ ask | ✅ deny | `!isToolRisk(risk)` |
| 未授权 origin（S1） | deny | ❌ 不可达（S1 先短路） | — | — | 顺序 `[S1,S3,override,S2]` |
| `dom`（工具级容器） | ask | ✅ 可设（继承） | ✅ | ✅ | 容器 `overridable:true`，子命令按各自 effective risk 再 clamp |

- **冻结文件 sha256（自算，未变）**：`policy.ts=bfcb2edeceae19a27384aef6608e9f2ae9c3a0f6c1e5d3618f277164bb3c89a8`；`auto-authorize.ts=1096d065dac63d56e36285bf499eee041acdc3e323d4c7215df3981af7d0ef4b`。

**C. 覆盖存储生命周期（FR-V2-075，ADR-V2-026）**：单键 `web-cli:command-policy`（`{version:1, entries:{[commandId]:{action,updatedAt}}}`）；`cmd:<t>#<s>` > `cmd:<t>` > 默认；单键整对象原子写 + 串行队列 + 写成功才提交内存（无半写）+ 同值幂等（不写/不审计）+ 读失败降级为「无覆盖」+ 恢复默认（单条/全部）+ 审计 `command-policy` 零明文（与 revoke/auto-authorize 可分辨）。

**D. 服务端强制反证（AC-V2-025，ADV-V23-06）**：真实 `host.dispatch` 上——
① `x-evaluate` 覆盖 allow 仍 deny（asked=0）；② 未授权 origin 覆盖 allow 仍 deny（S1 先短路）；③ `sleep`/`web-cli-help` 覆盖 allow 仍 deny；④ `x-destructive#remove` 覆盖 allow 仍 ask（asked=1）、`#go` 同层 allow 放行；⑤ `x-ui`/`x-state`/`x-external` 覆盖 allow 不 allow（落基线 ask）、覆盖 deny 直接拒绝；⑥ `dom`/`dom read-state` 三档实跑 + `dom click`（ui）恒不放宽；⑦ 显式 ask 不被写自动授权静默放行（有覆盖 → 人工确认；无覆盖 → 写自动放行，基线不变）；⑧ **伪造消息/绕过 UI**：`store.set(...)` 直注入 → dispatch 仍 clamp；反证 naive UI-only 无条件 allow 策略会放行（证明 clamp 是承重墙）。

### 9.4 断言取代台账（removed=0；总数只增）

> **〔R2 修复轮订正（2026-09-13，A4；「removed=0」原表述保留为历史）〕**：R2 审查（`5d9e6f1`）独立核验显示**字面 `removed = 0` 不成立**（区间删除 470 行，含 10 处 `test('…')` 标题 + ~40 处 `assert.*`）。订正口径 = 「**无未取代删除 + 总断言数不减 + 硬底线/安全断言只增**」；逐条 old→new 见 `packages/web-cli-plugin/docs/r2-supersession-ledger.json`（S1~S18 + S19/S19b/S20），机器门禁见 `test/insight-tree-hierarchy.test.ts`。下表历史值**原样保留**（供对照）。

| # | old（文件 :: 断言） | new（替代） | 备注 |
|---|----|----|----|
| S1 | `tree-ops.test.ts :: the action union is closed at exactly 7 values` | `… exactly 9 values（R2 supersession S1）` | 保留 `grant-origin`/`request-permission`/`command-allow` 负例（D-R2B-01） |
| S2 | `tree-ops.test.ts :: each of the 7 actions maps to exactly one existing path` | `… each of the 9 actions …（R2 supersession S2）` | 新增 `set-command-policy→command-policy-set`、`reset-command-policy→command-policy-reset` 唯一映射断言 |
| S3 | `tree-ops.test.ts :: needsConfirmation matches the whitelist` | `…（R2 supersession S3）` + 放宽类条件确认新测试 | 1:1 + 净增 |
| S7 | `tree-view.test.ts :: needsConfirmation is correct for all 7 actions` | `… all 9 actions（R2 supersession S7）` + `commandPolicyNeedsConfirmation` 5 断言 | 联合扩展强依赖的最小连带 |
| S9 | `insight-archive.test.ts :: TREE_ACTION_IDS is exactly 7 values` | `… exactly 9 values（R2 supersession S9）` + pin 显式更新 | pin old→new 见 §9.6 |
| S10 | `insight-archive.test.ts :: TREE_NO_ESCALATION_NOTE sha256 pin` | pin 显式更新（两通路 + `delay` 消歧保留） | 反证段保留 |
| S12 | `insight-no-escalation.test.ts :: tree-ops.ts has NO write verb outside the closed whitelist` | 9 个动作 id + 两个新增唯一通路 + 仍禁 grant/request | 硬底线断言只增 |
| — | `insight-archive.test.ts :: TREE_MODULE_SHA256`（tree-view/tree-ops） | 显式更新 pin（连带走查，非 S 编号） | ADR-V2-027 pin 流程 |

- **断言计数台账**：`test()` 646 → **686（+40，fail 0）**；`assert.*`/`assertPinnedHash` 出现次数 3059 → **3345（+286）**；`test:insight` 70 / `test:ui` **167** / `test:hardening` 24 / `test:binding` **180**（零删减）。
- **硬底线/安全断言只增**：`policy`/`auto-authorize` 内容哈希 pin、决策表快照 pin、`PLUGIN_RISK_DEFAULTS` pin、parity 零 diff **不变** + 追加 AC-V2-025 反向断言（`insight-override-security`）。

### 9.5 门禁原文（严格串行，一次一个）
| # | 命令 | 结果 | 完整日志 |
|:--:|------|------|------|
| 1 | `npm run typecheck` | **0 error · EXIT=0** | `/tmp/opencode/r2-1/logs/02-typecheck.log` |
| 2 | `npm test`（插件） | **tests 686 / pass 686 / fail 0 · EXIT=0** | `/tmp/opencode/r2-1/logs/07-npm-test.log` |
| 3 | `npm run test:insight` | **PASS — 70 assertions · EXIT=0** | `/tmp/opencode/r2-1/logs/09-test-insight.log` |
| 4 | `npm run test:ui` | **PASS — 167 assertions · EXIT=0** | `/tmp/opencode/r2-1/logs/10-test-ui.log` |
| 5 | `npm run test:hardening` | **PASS — 24 assertions · EXIT=0**（会重建 dist） | `/tmp/opencode/r2-1/logs/11-test-hardening.log` |
| 6 | `npm run test:binding` | **PASS — 180 assertions · EXIT=0** | `/tmp/opencode/r2-1/logs/12-test-binding.log` |
| 7 | `npm run test:e2e` | **PASS — EXIT=0** | `/tmp/opencode/r2-1/logs/13-test-e2e.log` |
| 8 | `npm test`（全仓） | **EXIT=0**（core 267 / render 94+1skip / router 8 / web 31 / web-cli 84 / web-op-cli 15 / base 483 / plugin 686；fail 0） | `/tmp/opencode/r2-1/logs/14-full-npm-test.log` |

> 未跑项：无（8 项全跑）；无被杀/OOM。
>
> **复验轮（D-R2B-09 修正后）**：8 项门禁再次串行全绿，原文日志 `/tmp/opencode/r2-1/logs/16-*` ~ `23-*`（typecheck 16 / npm test 17 / insight 18 / ui 19 / hardening 20 / binding 21 / e2e 22 / 全仓 23）。

### 9.6 pin 显式更新（前值 / 后值 / 日期 / 来源 / 理由）
| pin | old | new | 理由 |
|-----|-----|-----|------|
| `TREE_ACTION_IDS_JSON_SHA256` | `e5c65cc3…d073` | `71f743ed…c1ac` | 白名单 7→9 |
| `TREE_NO_ESCALATION_NOTE_SHA256` | `d37fecff…abce` | `cfe96e8a…45d3` | FR-V2-078 两通路重写（保留 `delay` 消歧） |
| `src/ui/tree/tree-view.ts` | `023f9fc0…8fd5` | `9beb26ea…c744` | 文案 + 确认纯函数 + target 扩展 |
| `src/ui/tree/tree-ops.ts` | `abf9cdab…9257` | `4163a6cb…d658` | 白名单 9 + 两分支 + 放宽类确认 |

日期 2026-09-13；来源 = `feature/web-cli-plugin` R2 build 第 1 轮实测（`sha256sum`）。

### 9.7 D 编号（本轮决策 / 偏差）
- **D-R2B-01**：S1 负例 `command-allow` 保留（plan 措辞按字面不成立）——更严，断言只增。
- **D-R2B-02**：未知/非法 risk 覆盖 allow → 策略返回 `deny`（plan 写 null，但 null 会落回基线 allow，与「仍 deny」矛盾）；无覆盖仍 null（逐字节一致）。
- **D-R2B-03**：破坏性判据 = `risk==='write' && DESTRUCTIVE_VERBS.has(<调用子命令>)`；不采用「未知→true」默认（否则 `dom read-state` 误判）。
- **D-R2B-04**：`ui`/`state`/`external`/破坏性 在模型层 `overridable:false` + 零控件 + `clampReason`（按 R2-V21-02 acceptance）；服务端仍允许其 ask/deny 收紧、只禁 allow。
- **D-R2B-05**：`dom` 工具级按「容器/设置载体」`overridable:true`，由被调用子命令 effective risk 再 clamp（ADR-V2-025 §9.3 口径）；`dom read-state` 三档可达，`dom click` 恒不放宽。
- **D-R2B-06**：`tree-view.test.ts` S7 最小连带（联合扩展强依赖）；S4/S5/S6/S8 留待 V2-2。
- **D-R2B-07**：`insight-archive` S9/S10 + `TREE_MODULE_SHA256` 两文件 pin 本轮连带更新（被修改文件的冻结 pin 强依赖）；S11 留待 V2-4。
- **D-R2B-09**：交叉引用徽标**单条化**（`crossRefLabels` 由 1..N 累计多条 → 单条「亦被 N 处引用（面）」；`crossRefCount` 语义不变）。首次提交后复验修正，**全 8 项门禁复跑全绿**（日志 16~23）。
- **D-R2B-08**：`sidepanel.js` 实测 **1,138,591 B**（基线 1,132,748，+5,843 B ≈ +0.52%）≤ ceiling 1,189,385 → **本轮无需重登记**；`content.js` 恒 **1,073,453 B**（零增长）。

### 9.8 未完成 / 降级 / 风险
- **R2-V23-07**（`binding.mjs #22a…`）：未做（本轮指令明确留给下一轮）→ 覆盖链的 Chromium 端到端证据待补；服务端 clamp 已由 node 层真实 `host.dispatch` 覆盖。
- **V2-2 R2（R2-V22-01~06）**：真层级树 **DOM** 渲染 / 键盘 / 面包屑 / 分层控件 / 两通路文案展示 / `test:insight` 追加 —— 本轮模型层已就绪（`ownershipTree` + `command-policy` 控件描述已产出），UI 层**仍渲染扁平 `rows`**（`tree-view.commandControls` 仍过滤旧 `kind==='none'` → 覆盖控件暂不在 DOM 出现）。
- **V2-4 R2（R2-V24-01~05）**：档案分层 / 默认-生效分列 / 覆盖面分列 / S11 —— 未做。
- **风险**：V2-1/V2-3 的 R2 取代项跨叶（S9/S10/TREE_MODULE pin 在 V2-4 测试文件、S7 在 V2-2 测试文件）已在本轮**最小连带**处理，后续轮不得回退；`sidepanel` 体积尚未包含 V2-2 树 DOM 增重，下一轮需按 ADR-V2-033 评估是否重登记。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | P0 收口报告（第 10 轮）：三叶 phase builded→validated（父保持轻量规范容器）；review R1 ⚠️ 有条件通过 / validate R1 ✅ 通过；3 处文档偏差订正/登记；人工面（V2-H-A~D / V2-H-1~6 / T1 缺口）未执行如实登记；本轮零 `src/`/`test/` 改动、未跑 Chromium 门禁（原因已登记）。 | 2026-09-13 | SDDU Build Agent（代行收口） |
| v2.0 | **v2 整体收口报告（第 11 轮）**：四叶（V2-1/V2-2/V2-3/V2-4）phase 全部 `validated`（父保持轻量规范容器；V2-4 P1 本轮由 builded→reviewed→validated）；review P0 R1 ⚠️ / V2-4 R1 ⚠️（均 0 阻塞）；validate P0 R1 ✅ / V2-4 R1 ✅（均 0 阻塞）；门禁串行实跑全绿（tsc 0 error / 插件 646·0 fail / insight 70 / ui 167 / hardening 24 / binding 180×3 / e2e PASS / 全仓 1629·1628 pass·0 fail·1 skip，base 483 零回归）；体积 content.js 零增长 1,073,453 B / sidepanel 1,132,748 B（ceiling 1,189,385）/ background 1,403,170 B；**修 #AP#5b 相位窗口 flake + 新观测修 tabs #7m3/#7m4/#7o/#7o2 harness 时序 flake**（零产品逻辑改动、断言只增不减/不减）；新增 `docs/dev.md` §6.1 完整日志落盘纪律（D-V24-06）；遗留项全量登记（人工面 13 项 + T1 缺口 + 已知偶发 + 口径 D-V24-01/02/08 + 未合并/未发布）；零改动核验（base/policy/auto-authorize/manifest/v1 目录/journey.mjs）。 | 2026-09-13 | SDDU Build Agent（代行收口） |
| v3.0 | **R2 实施构建第 1 轮（第 12 轮）**：R2-Wave 1（V2-1 真层级树：`ownership-tree.ts` + `tree-model`/`command-catalog`/`project-tree`/`build-snapshot`）+ R2-Wave 2（V2-3 覆盖引擎：`command-override.ts` SW 侧 clamp/存储生命周期 + `host`/`service-worker`/`messaging`/`insight-protocol`/`tree-ops` 接线 + 白名单 7→9）；3 新测试文件（35 tests）；门禁串行全绿（typecheck 0 / 插件 npm test 686 0 fail / insight 70 / ui 167 / hardening 24 / binding 180 / e2e PASS / 全仓 EXIT=0）；断言取代 S1/S2/S3/S7/S9/S10/S12 + pin 显式更新（removed=0、总数只增）；`policy`/`auto-authorize` sha256 不变、content.js 零增长、base/manifest/options 零 diff；未完成 V2-2/V2-4 R2 与 `binding #22a`（如实登记）。 | 2026-09-13 | SDDU Build Agent |
| v4.0 | **R2 第 3 轮（review 修复轮，消化 `5d9e6f1` R2 审查的 4 建议 + 关键提示）**：A1 no-widen 档叶子收紧控件（三层：硬底线零控件 / tightenOnly ask+deny 无 allow / 可覆盖三档；服务端 clamp 零改动）、A2 跨归属交叉引用可交互下钻（`crossTargets` + `.tree-link` + `navigateToNodeId`，节点不复制）、A3 示例①「工具→子命令」达成（`toolSubcommands` 以 `subcommandRisks` 回退，不改 base/`declared-tools.ts`）、A4 取代台账口径订正（字面 removed=0 不成立 → 无未取代删除 + 机器台账 `docs/r2-supersession-ledger.json`）、A6 文档漂移订正、A7 `meta.modelNote` 旧措辞订正 + 防回潮断言、T4 binding 失败诊断 + 就绪等待；门禁串行全绿（typecheck 0 / 插件 **693·0 fail** / insight **108** / ui **167** / hardening **24** / binding **192×2（0/2 flake）** / e2e PASS / 全仓 EXIT=0，base 483 零回归）；`policy`/`auto-authorize` sha256 不变、`content.js` 零增长、base/manifest/v1/journey 零 diff。 | 2026-09-13 | SDDU Build Agent |

---

## R2 第 2 轮（2026-09-13，sddu-build；编排器代作者决策（2026-09-13 授权）+ R2）

> 范围：R2-Wave 3（V2-2 真层级树 UI）+ R2-Wave 4（V2-4 档案分层）+ R2-Wave 5 部分（V2-3 `binding #22a…`、体积显式重登记、文档/人工面）。**phase 不回退**（父 `tasked` / 四叶 `validated` 原样）。

### 1. 逐任务完成情况（commit e35d852）

| 任务 | 状态 | 落点 |
|------|:--:|------|
| R2-V22-01 `tree-view.ts` 嵌套渲染模型 + command-policy 控件 + 两通路文案 | ✅ | `buildTreeRows` 消费 `snapshot.ownershipTree`（消费归属树，非扁平 `rows`），输出嵌套 `TreeRow`（`children` + `depth`/`kind`/`nodeId`）；命令行默认/生效分列 + `clampReason(Label)` + 恰 3 个 `command-policy` 控件（`overridable`）或零控件（硬底线）；`TREE_MODEL_NOTE` 重写为「按归属的层级树 + 多归属主链 + 交叉引用徽标（不复制节点）」；`CLAMP_REASON_LABEL` 新增；`TREE_NO_ESCALATION_NOTE` 保持 R2-1 的两通路 + `delay` 消歧（pin 不变） |
| R2-V22-02 `tree-drawer.ts` 自建 `role=tree` + 键盘 + 展开集 + 面包屑 + 分层控件 + clamp 原因 + 放宽类确认 | ✅ | `<ul role=tree>/<li role=treeitem>`（`createElement`/`textContent`，**零 `innerHTML`**）；`aria-expanded`/`aria-level`/`aria-selected` + roving tabindex；代理 `keydown`（↑↓←→/Enter/Space/Home/End）；`expanded`/`collapsed` 会话保持（重投影回放）；`#tree-breadcrumb` 层级路径；惰性渲染（收起不建 DOM，不虚拟化）；deny 分层 DOM（硬底线零 `[data-action-id]` + `.tree-clamp-reason`；可覆盖 3×`button[data-policy]` + 有覆盖时「恢复默认」）；放宽方向 `commandPolicyNeedsConfirmation` → `#tree-confirm`；写路径唯一 `tree-ops.run`；过滤时命中路径自动展开（内容过滤可见） |
| R2-V22-03 `test/tree-view.test.ts` 取代 S4~S8 | ✅ | S4/S5/S6/S7/S8 显式 old→new；新增非硬底线 deny 保持控件 + 模型层示例②路径；`removed=0`（node `test(` 686→**690**） |
| R2-V22-04 `test/ui/insight.mjs` `#I-20a…` + 取代 S13~S16 | ✅ | `#I-11a~c`（取代 S13）、`#I-12a/b`（取代 S14）、`#I-18e` 分层（取代 S15）、`#I-02a` 真树（取代 S16）；新增 `#I-20a0/a~k`（作者两例逐层展开/收起 + 惰性 + 面包屑 + 键盘 + 覆盖即时生效 + 多状态布局守卫）；`check(` 57→**75**（运行期 **102** 断言） |
| R2-V22-05 体积显式重登记 + content.js 零增长 + 源码哈希 pin | ✅ | `SIDEPANEL_BASELINE_BYTES` 1,132,748 → **1,159,856**（实测）；`HISTORY` 追加 1,132,748；`SIDEPANEL_CEILING` **1,217,848**；容差 5% 不变；`targetBudgetBytes/targetMet` 仍 `null`；`CONTENT_MAX_BYTES=1,073,453` + `CONTENT_SOURCE_SHA256` 三文件 pin 不变 |
| R2-V22-06 文档回填 + 人工面登记 | ✅ | `docs/dev.md` §8.2 体积回填（历史保留）+ 修订 3.5；`docs/smoke-checklist.md` 新增 §8（`V2-H-10~14`，`⏳ 待人工`）；`capability-matrix.md` 未涉及白名单口径 → 零改动 |
| R2-V24-01 `archive-catalog.ts` 分层 + 默认/生效分列 | ✅ | `ArchiveCard` 追加 `defaultAction/overrideAction/effectiveAction/overridable/clampReason(Label)/policyControl`（硬底线卡**无** `policyControl`）；`READ_ONLY_NOTE` 改为分层语义；模块**仍无写导入**（grep 无 `tree-ops`/写面） |
| R2-V24-02 `tree-drawer.ts` 档案卡分层控件 | ✅ | 档案卡渲染 `.tree-archive-policy*`（自有类，无 `data-action-id`）→ 同一 `tree-ops.run`；默认/生效分列字段；保持 `.tree-archive` 零 `.tree-control`/零 `button[data-action-id]`（`#I-19g` 红线） |
| R2-V24-03 `test/insight-archive.test.ts` 取代 S9~S11 + pin | ✅ | S9/S10 pin 保持（白名单 9 / 文案哈希）；S11 改为分层断言（硬底线零 `policyControl` + 可读原因；可覆盖有描述）+ 默认/生效分列；`TREE_MODULE_SHA256['src/ui/tree/tree-view.ts']` 显式更新 9beb26ea… → **b4392d65…**；`test(` 计数不减 |
| R2-V24-04 `test/ui/insight.mjs` `#I-21a…` | ✅ | `#I-21a~e`（硬底线零 `[data-policy]` + 原因；可覆盖三档；默认/生效分列；P0 红线保持；档案写入走同一 tree-ops 路径落盘） |
| R2-V23-07 `test/ui/binding.mjs` 追加 `#22a…` | ✅ | `#22a~l`（三档 deny/ask/allow → 真实 dispatch 生效〔权限被拒 / 二次确认 / 免确认执行〕→ reset → chrome.storage 持久化）；既有 `#0…/#19…/#20…/#21…` 零删改；`check(` 185→**197**（运行期 **192** 断言） |

**未做/留待下一轮**：R2-Wave 6 收口（`R2-V24-05` 的 S1~S18 计数台账总核；本轮已实质执行大半，收口文档可随后补）。

### 2. 关键设计裁决（编排器代作者决策（2026-09-13 授权）+ R2）

- **D-R2B-02 延续**：未知/非法 risk 的覆盖 allow → 策略返回 `deny`（不是 plan 字面的 null）；UI 侧体现为 `s3-unknown-risk` 硬底线行（零控件 + `.tree-clamp-reason`）。
- **档案控件类名隔离（新裁决）**：`R2-V24-02` 要求档案卡渲染分层控件并走同一 tree-ops，但 §9.8 未把 `insight.mjs #I-19g`（`.tree-archive` 零 `.tree-control`/零 `button[data-action-id]`）列入取代清单 → 采用**自有类** `.tree-archive-policy*`（无 `data-action-id`）兼顾两者；既满足档案分层可操作，又保持 P0 红线与 ledger-clean 取代。
- **作者示例①真实 DOM 最深可展层偏差**：declared site tool 的 schema（`src/tools/declared-tools.ts#paramsToSchema`）**不暴露 `subcommand` enum` → 真实 dist 下 site 工具节点无子命令子层；`#I-20a` 展开到「工具」层，「工具→子命令」层由示例②（base-builtin `dom → dom read-state`）与 node 门禁 `insight-tree-hierarchy`（注入含子命令的 site 工具）证明；`docs/smoke-checklist.md` §8 已如实登记。**〔R2 修复轮 A3 校准（2026-09-13）〕**：该边界**已消除**——插件侧 `service-worker#projectToolSurface` 从站点工具的 `subcommandRisks`（由 `decl.subcommands` 生成）回退解析子命令枚举（**不改 base、不改 `declared-tools.ts`**），真实 DOM 下 `站点 → 支持的命令 → site_notes → site_notes list / show` 逐层可展（`#I-20a2`）；见本文件 §R2 第 3 轮 A3。
- **布局守卫与站点夹具的互斥**：绑定站点会合法地增加面板镀铬高度（实测去镀铬 `#log` 674→583px），故**站点夹具在全部 AC-V2-002 布局断言之后**才绑定（脚本末尾），避免以夹具状态污染 baseline。
- **`TREE_NO_ESCALATION_NOTE` 未再改**：R2-1 已重写为两通路 + `delay` 消歧，pin `cfe96e8a…` 保持；本轮仅改 `TREE_MODEL_NOTE`（森林偏差清零）。

### 3. 门禁（**严格串行，一次一个**；完整日志 `/tmp/opencode/r2-2/logs/`）

| # | 命令 | 退出码 | 结果 | 日志 |
|:--:|------|:--:|------|------|
| 0 | `npm run build --workspace @lgdl/web-cli-plugin` | 0 | `content.js` 1,073,453 B（零增长）/ `sidepanel.js` 1,159,856 B / `background.js` 1,429,603 B | `final-01-build.log` |
| 1 | `npm run typecheck` | 0 | 0 error | `final-02-typecheck.log` |
| 2 | 插件 `npm test` | 0 | **690 tests / 690 pass / 0 fail**（基线 686 → +4） | `final-03-npm-test.log` |
| 3 | `npm run test:insight` | 0 | **PASS — 102 assertions**（基线 57 → 102；`check(` 57→75） | `final-04-test-insight.log` |
| 4 | `npm run test:ui` | 0 | **PASS — 167 assertions**（v1 journey 零删减） | `final-05-test-ui.log` |
| 5 | `npm run test:hardening` | 0 | **PASS — 24 assertions** | `final-06-test-hardening.log` |
| 6 | `npm run test:binding` | 0 | **PASS — 192 assertions**（基线 180 → 192；`check(` 185→197）。⚠️ 前两次运行遇**环境 flake**（`#33B1` 设置视图渲染 / `#3d` discovery），第三次全绿 | `final-07-test-binding.log`（flake）/ `final-07b`（flake）/ `final-07c`（PASS） |
| 7 | `npm run test:e2e` | 0 | **PASS — 真实 dist full chain（fixture + LGDL Workbench）** | `final-08-test-e2e.log` |
| 8 | 全仓 `npm test` | 0 | lgdl-core 267 / lgdl-render 95（94 pass·1 skip）/ lgdl-router 8 / lgdl-web 31 / lgdl-web-cli 84 / lgdl-web-op-cli 15 / **web-cli-base 483** / **web-cli-plugin 690**；**fail 0** | `final-09-full-npm-test.log` |

### 4. 断言取代台账（removed=0；实测计数）

> **〔R2 修复轮订正（2026-09-13，A4）〕**：字面 `removed=0` 经 R2 审查复核**不成立**，订正为「无未取代删除 + 总数不减 + 硬底线只增」；机器台账见 `packages/web-cli-plugin/docs/r2-supersession-ledger.json`。本表历史值保留。

| # | 旧 | 新 | 证据 |
|:--:|----|----|------|
| S4 | `tree-view.test.ts a non-deny command still gets no write control` | `…overridable command rows expose allow/ask/deny; hard-floor rows expose none` | 节点 test 686→690 |
| S5 | `all 142 … deny ⇒ controls===[]` | `hard-floor deny (S3) ⇒ controls===[]` + 非硬底线 deny 保持控件 | 同上 |
| S6 | `pinned wording` | 归属层级树 + 两通路 + `delay` 消歧 | 同上 |
| S7 | `needsConfirmation … 7 actions` | `… all 9 actions` | R2-1 已落；保持 |
| S8 | `deny rows … filtered out` | `hard-floor stay control-free; overridable keep controls` | 节点 test |
| S9/S10 | `insight-archive` 白名单 7 / 旧文案 pin | 9 值 pin（`71f743ed…`）/ 文案 pin（`cfe96e8a…`）保持 + `tree-view.ts` pin 显式更新 | `insight-archive.test.ts` |
| S11 | `FORBIDDEN_CARD_KEYS on deny cards` | 硬底线卡零 `policyControl` + 可读原因；可覆盖卡有描述；仍无写导入 | 同上 |
| S13 | `insight.mjs #I-11a` | `#I-11a~c` | `#I-11a/b/c` |
| S14 | `#I-12` | `#I-12a/b` | 分层 |
| S15 | `#I-18e` | 分层版 `#I-18e` | `hardFloorWithControls===0 && withThree>=1` |
| S16 | `#I-02a` | 真树根 + 可展开面默认展开 | `#I-02a` |
| S17 | `binding.mjs` `#21a…` | **不变** | `#22a…` 之后追加 |
| S18 | `test:ui` v1 `#15a~#15q` / `journey.mjs` | **不变** | `journey.mjs` 零 diff；`test:ui` 167 |

### 5. 零改动核验

- `packages/web-cli-base/**` / `src/security/policy.ts`（sha256 `bfcb2ede…`）/ `src/security/auto-authorize.ts`（sha256 `1096d065…`）/ `manifest.json` / `src/content/**`（三文件内容哈希不变，`dist/content.js` 1,073,453 B 零增长）/ `test/parity/**` + `parity.test.ts` / `test/ui/journey.mjs` / v1 SDDU 目录 / `.opencode/opencode.json` / `package.json`（依赖段）**全部 `git diff --quiet` 零 diff**。
- 零新权限 / 零新依赖 / `options.html` 未改。

### 6. 体积

| 对象 | 前 | 后 | 结论 |
|------|----|----|------|
| `dist/content.js` | 1,073,453 B | 1,073,453 B | **零增长**（源码哈希 pin 不变） |
| `dist/sidepanel.js` | 1,138,591 B（工作区实测，非登记基线） | 1,159,856 B | 显式重登记：基线 1,132,748 → 1,159,856（+27,108 B），ceiling 1,189,385 → 1,217,848，容差 5% 不变，HISTORY 追加 1,132,748 |

### 7. 人工面（`⏳ 待人工`，未冒充 PASS）

`docs/smoke-checklist.md` §8 `V2-H-10~14`：① 树逐层展开观感 ② 长路径/320px 窄栏面包屑 ③ 键盘操作体感 ④ 覆盖后即时生效观感（三档 + 二次确认）⑤ deny 分层与 clamp 原因可读。headless 不可合成真实手势/原生弹窗，一律如实登记。

### 8. 已知偏差 / flake

- `test:binding` 本轮前两次为**环境 flake**（`#33B1` 设置视图渲染、`#3d` discovery；内存吃紧下 Chromium 启动/加载时序抖动），第三次全绿；未改测试逻辑掩盖。
- `#I-20a` 最深可展层偏差见 §2（declared site tool 无 subcommand enum）。
- `docs/smoke-checklist.md` §7 既有「只读展示面」表述按 R2 部分取代，未删改既有条目，改以 §8 口径澄清。

---

## R2 第 3 轮（2026-09-13，sddu-build；编排器代作者决策（2026-09-13 授权）+ R2）

> **范围**：消化 R2 review（`5d9e6f1`）的 **4 建议（A1~A4）+ 关键提示（A6/A7/T4）**。
> **纪律**：只加固/补齐、**不放宽安全边界**；`content.js` **零增长**；`policy.ts`/`auto-authorize.ts` sha256 **不变**；不碰 `main`/`packages/web-cli-base/**`/v1 SDDU/`options.html`；无新依赖；门禁严格串行、完整日志落盘。**phase 不回退**（`revisionRounds.R2.buildRounds` 追加本轮记录）。

### 1. 逐项 before → after（A1~A4 / A6 / A7 / T4）

| # | before | after | 证据 |
|---|--------|-------|------|
| **A1** | `ui`/`state`/`external`/破坏性档在投影层与硬底线**合并**为 `overridable:false ⇒ controls:[]` → 叶子层**无树内收紧入口** | 新增**三层**：**硬底线**（evaluate / S1 / S3）仍 `controls:[]` + `clampReason` 可读；**只可收紧**（`tightenOnly:true`）给 **ask/deny 两档**（**结构上过滤掉 allow**）+ `clampReason` 可读；**可覆盖**仍 3 档 | `command-override.ts#resolveCommandPolicy` 增 `tightenOnly` + `TIGHTEN_ONLY_ACTIONS`；`command-catalog.ts` 按层产出控件；`tree-view.ts#commandControls` 对 tighten-only 过滤 `allow`；`tree-drawer.ts` 写 `data-tighten-only`；`archive-catalog.ts#policyControl` 同步（tighten-only → ask/deny） |
| **A1（服务端）** | — | **不放宽**：`clampActionForRisk` **零改动**（ui/state/external/破坏性对 `allow` 仍返回 `null`/clamp，对 `ask`/`deny` 原样放行） | 新增 `test/command-override.test.ts`「A1 tighten-only never offers allow；server honours ask/deny」；`test:insight` `#I-20d`/`#I-20d2`/`#I-21b2` 真实 DOM |
| **A2** | `crossRefs` 为**纯文本**，UI 侧不可下钻 | 新增**出站**交叉引用 `crossTargets` + `.tree-link[data-target-node-id]`（点击 / **Enter / Space**）→ `navigateToNodeId()` 展开祖先链并聚焦到**同一 `nodeId` 的唯一主归属实例**（**不复制节点**） | `ownership-tree.ts#computeCrossTargets`；`tree-view.ts` 透传 `crossTargets`；`tree-drawer.ts#navigateToNodeId`；`test:insight` `#I-22a~c`（真实 DOM + 键盘 + `copies===1`）；node `R2 hierarchy (A2)` |
| **A3** | 站点工具的 schema 不暴露 `subcommand` enum → 真实 DOM 无「工具→子命令」子层；示例①只到「工具」层 | **选路线 ①（低成本、插件侧可行）**：`projectToolSurface` 以 `subcommandRisks` 的键**回退**解析子命令枚举（站点工具的 `subcommandRisks` 由 `decl.subcommands` 生成）→ 真实 DOM 达成 `站点 → 支持的命令 → site_notes → site_notes list / show`；**不改 base、不改 `declared-tools.ts`** | 新增纯函数 `command-catalog.ts#toolSubcommands` + `service-worker.ts#projectToolSurface` 调用；`test/insight-tree-hierarchy`（A3 单测）；`test:insight` `#I-20a2`（真实 DOM） |
| **A4** | 台账口径写「`removed=0`」——R2 审查独立核验**字面不成立**（区间删除 470 行，含 10 处 `test('…')` 标题 + ~40 处 `assert.*`） | **订正为**「**无未取代删除（every removed assertion has an old→new ledger entry）+ 总断言数不减 + 硬底线/安全断言只增**」；**保留原「removed=0」表述并标注订正**（build §9.4/§4、plan §9.8、ADR-V2-031 相关段落历史保留）；补**机器可核验台账** | `docs/r2-supersession-ledger.json`（S1~S18 + S19/S19b/S20 + 计数前后）；`test/insight-tree-hierarchy.test.ts`（受保护文件删除行必须命中台账 old 行 + `journey.mjs` 零 diff + `test(` ≥ 646） |
| **A6** | `smoke-checklist.md` §5 仍写「70 断言」；§7 仍写「档案只读展示面…无任何命令级控件」 | §5 追加「R2 修复轮实测 **102**」（历史 45/52/70 保留）；§7 追加「R2 起部分取代」澄清（零删改既有条目）；顺带校准 `V2-H-14`（只可收紧 ask/deny / 硬底线零控件）与 §8（A3 达成） | `docs/smoke-checklist.md` §5/§7/§8 |
| **A7** | `INSIGHT_MODEL_NOTE`（快照 `meta.modelNote`）仍含旧「四维度分组视图（森林）…非严格单树」 | 订正为与真层级树一致的措辞（「按归属的层级树…同一节点不复制」）；**补断言防旧措辞回潮** | `tree-model.ts#INSIGHT_MODEL_NOTE`；`test/insight-projection.test.ts`（S20：`/按归属的层级树/`、`森林`/`非严格单树` 零命中、`/同一节点不复制/`） |
| **T4** | `test:binding` 上轮 2/3 flake（`#33B1`/`#3d`），无失败时诊断 | 新增失败诊断（**完整栈** + 失败时面板/DOM 摘要，落盘 `R2_LOG_DIR`）；`#3d` 就绪等待 60→120×300ms、`#33B1` 60→120×250ms + 点击前显式等 `#open-settings` **（只加等待，不放宽断言）** | `test/ui/binding.mjs`（`diagnostics`/`captureRuntimeSummary`/`dumpDiagnostics`）；本轮 binding **0/2 flake**（新增诊断未触发） |

### 2. 文件变更

| 操作 | 文件 | 说明 |
|:--:|------|------|
| MODIFY | `src/security/command-override.ts` | `CommandPolicyResolution.tightenOnly` + `TIGHTEN_ONLY_ACTIONS`（clamp **零改动**） |
| MODIFY | `src/insight/command-catalog.ts` | 三层控件；`toolSubcommands`（A3）；`tightenOnly` 落节点 |
| MODIFY | `src/insight/tree-model.ts` | `CommandNode.tightenOnly?`；`INSIGHT_MODEL_NOTE` 订正（A7） |
| MODIFY | `src/insight/ownership-tree.ts` | `CrossRefTarget` + `crossTargets`（A2） |
| MODIFY | `src/insight/archive-catalog.ts` | 档案卡分层（tighten-only ask/deny）+ `READ_ONLY_NOTE` 校准 |
| MODIFY | `src/ui/tree/tree-view.ts` | `TreeRow.tightenOnly/crossTargets` + 控件分层 |
| MODIFY | `src/ui/tree/tree-drawer.ts` | `data-tighten-only` + `.tree-link` 下钻 + 档案控件消费 `policyControl` |
| MODIFY | `src/background/service-worker.ts` | `projectToolSurface` 用 `toolSubcommands`（A3 回退） |
| NEW | `docs/r2-supersession-ledger.json` | 机器可核验取代台账（A4） |
| MODIFY | `test/{insight-tree-hierarchy,tree-view,command-override,insight-archive,insight-projection}.test.ts` | A1/A2/A3/A7/台账门禁（S19/S19b/S20） |
| MODIFY | `test/ui/insight.mjs` / `test/ui/binding.mjs` | `#I-20a2/#I-20d/#I-20d2/#I-21b2/#I-22a~c`；T4 诊断 + 就绪等待 |
| MODIFY | `docs/smoke-checklist.md` | A6 |

### 3. 门禁（**严格串行，一次一个**；完整日志 `/tmp/opencode/r2-3/logs/`）

| # | 命令 | 退出码 | 结果 | 日志 |
|:--:|------|:--:|------|------|
| 0 | `npm run build --workspace @lgdl/web-cli-plugin` | 0 | `content.js` 1,073,453 B（**零增长**）/ `sidepanel.js` 1,162,942 B / `background.js` 1,432,228 B | `00-build.log` |
| 1 | `npm run typecheck` | 0 | **0 error** | `01-typecheck.log` |
| 2 | 插件 `npm test` | 0 | **693 tests / 693 pass / 0 fail**（R2 基线 690 → +3） | `02-plugin-test.log` |
| 3 | `npm run test:insight` | 0 | **PASS — 108 assertions**（R2 基线 102 → +6：`#I-20a2`/`#I-20d2`/`#I-21b2`/`#I-22a~c`） | `03-insight.log` |
| 4 | `npm run test:ui` | 0 | **PASS — 167 assertions**（journey 零删减） | `04-ui.log` |
| 5 | `npm run test:hardening` | 0 | **PASS — 24 assertions**（会重建 dist，已知副作用） | `05-hardening.log` |
| 6 | `npm run test:binding` ×2 | 0 / 0 | **PASS — 192 assertions ×2（0/2 flake）** | `06-binding-run1.log` / `06-binding-run2.log` |
| 7 | `npm run test:e2e` | 0 | **PASS — 真实 dist full chain（fixture + LGDL Workbench）** | `07-e2e.log` |
| 8 | 全仓 `npm test` | 0 | core 267 / render 95（94 pass·1 skip）/ router 8 / web 31 / web-cli 84 / web-op-cli 15 / **base 483** / **plugin 693**；**fail 0** | `08-full-repo-test.log` |

> 未跑项：无（8 项全跑）；无被杀/OOM。日志全文落盘，未做 `tail` 截断丢弃。

### 4. 本轮新增取代（S19/S19b/S20）

| # | old | new | 理由 |
|---|-----|-----|------|
| S19 | `insight.mjs #I-20d`：`dom click`（ui）零控件 | `#I-20d`：`dom click` ask/deny 两档（无 allow）+ 原因可读；`#I-20d2` 叶子收紧层断言 | A1 |
| S19b | `insight-archive.test.ts`：hard-floor = `overridable !== true` | hard-floor = `overridable !== true && tightenOnly !== true`；tighten-only 卡 ask/deny | A1 |
| S20 | `insight-projection.test.ts`：modelNote `/四维度分组视图（森林）/` + `/非严格单树/` | 层级树措辞 + 旧措辞零回潮断言 | A7 |

> pin 显式更新（日期/理由见测试文件注释）：`src/ui/tree/tree-view.ts` `b4392d65…` → **`b0075d15…`**（A1/A2 触发的强依赖）。`content.js` 源码哈希 pin 不变（零增长）。

### 5. 零改动核验（本轮）

| 核验项 | 结果 |
|------|:--:|
| `packages/web-cli-base/**` 零 diff | ✅ `git diff --quiet` exit 0 |
| `src/security/policy.ts` sha256 === pin | ✅ `bfcb2edeceae…c89a8` |
| `src/security/auto-authorize.ts` sha256 === pin | ✅ `1096d065dac6…ef4b` |
| `manifest.json` / `options.html` 零 diff | ✅ |
| v1 SDDU 目录零 diff | ✅ |
| `test/ui/journey.mjs` 零 diff | ✅（台账门禁亦断言区间+工作区 0 行） |
| `dist/content.js` 零增长 | ✅ 1,073,453 B |

### 6. 未完成 / 降级 / 风险（如实）

- **未由 R2 第三轮修 T1/T2/T3/A5/A8**（R2 提示项，非本轮指令范围）：legacy `git diff --quiet HEAD` 弱冻结仍保留（真实冻结由 sha256 承担）；`ArchiveCard.policyControl` 现已由渲染层消费（T2 顺带覆盖）；`#I-19g` 标签措辞（T3）与 `isCommandDestructive` 整串匹配（A5）、计数基线数字（A8）未动。
- **T4 残留**：本轮 binding 0/2 flake，但根因未定位（仅增强诊断与就绪等待）；若后续复现，诊断已落盘 `R2_LOG_DIR/binding-diagnostics-*.log`。
- **人工面**：`smoke-checklist.md` §8 `V2-H-10~14` 观感/键盘体感仍 `⏳ 待人工`（headless 不可合成）。
- **未合并/未发布**：仍在 `feature/web-cli-plugin`，不合 main、不发布。
