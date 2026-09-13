# 构建报告：specs-tree-web-cli-plugin-v2-insight（web-cli-plugin v2「any insight」· P0 收口 + v2 整体收口）

> **文档定位**: SDDU 构建报告 —— **v2 P0 收口（第 10 轮）+ v2 整体收口（第 11 轮）**。本文件由 `sddu-build` 代行产出，汇总 V2-1 / V2-2 / V2-3 三个 P0 叶子的交付结论，以及 V2-4（P1）与 v2 整体收口（四叶全 `validated`）与本轮文档/状态收口、遗留项登记动作。
> **容器体例声明（重要）**: **父 Feature 为轻量规范容器，不执行 tasks/build/review/validate** —— 本文件与父目录下的 `review-report.md` / `validate-report.md` 一样，是**聚合报告**，由作者/编排器直接指派产出，**不表示父 Feature 进入了 build 流程**；父 `state.json` 保持 `phase=tasked` / `workflow=4.tasks` / `agent=sddu-tasks` 不变。
> **前置依赖**: 父 `spec.md`（FR-V2-001~065 / NFR-V2-001~010 / EC-V2-001~016 / AC-V2-001~012）、父 `plan.md`（ADR-V2-001~015）、三叶 `build.md` + `state.json`、`review-report.md`（R1，⚠️ 有条件通过）、`validate-report.md`（R1，✅ 通过）。
> **创建人**: SDDU Build Agent（代行收口）
> **创建时间**: 2026-09-13
> **版本**: v2.0
> **更新人**: SDDU Build Agent
> **更新时间**: 2026-09-13
> **更新说明**: v2 整体收口（四叶 phase 全 validated；含 V2-4 P1）+ flake 修复（#AP#5b 相位窗口 + tabs harness 时序）+ 完整日志落盘纪律 + 遗留项全量登记（13 项人工面 + T1 + 已知偶发 + 口径 + 未合并/未发布）

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

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | P0 收口报告（第 10 轮）：三叶 phase builded→validated（父保持轻量规范容器）；review R1 ⚠️ 有条件通过 / validate R1 ✅ 通过；3 处文档偏差订正/登记；人工面（V2-H-A~D / V2-H-1~6 / T1 缺口）未执行如实登记；本轮零 `src/`/`test/` 改动、未跑 Chromium 门禁（原因已登记）。 | 2026-09-13 | SDDU Build Agent（代行收口） |
| v2.0 | **v2 整体收口报告（第 11 轮）**：四叶（V2-1/V2-2/V2-3/V2-4）phase 全部 `validated`（父保持轻量规范容器；V2-4 P1 本轮由 builded→reviewed→validated）；review P0 R1 ⚠️ / V2-4 R1 ⚠️（均 0 阻塞）；validate P0 R1 ✅ / V2-4 R1 ✅（均 0 阻塞）；门禁串行实跑全绿（tsc 0 error / 插件 646·0 fail / insight 70 / ui 167 / hardening 24 / binding 180×3 / e2e PASS / 全仓 1629·1628 pass·0 fail·1 skip，base 483 零回归）；体积 content.js 零增长 1,073,453 B / sidepanel 1,132,748 B（ceiling 1,189,385）/ background 1,403,170 B；**修 #AP#5b 相位窗口 flake + 新观测修 tabs #7m3/#7m4/#7o/#7o2 harness 时序 flake**（零产品逻辑改动、断言只增不减/不减）；新增 `docs/dev.md` §6.1 完整日志落盘纪律（D-V24-06）；遗留项全量登记（人工面 13 项 + T1 缺口 + 已知偶发 + 口径 D-V24-01/02/08 + 未合并/未发布）；零改动核验（base/policy/auto-authorize/manifest/v1 目录/journey.mjs）。 | 2026-09-13 | SDDU Build Agent（代行收口） |
