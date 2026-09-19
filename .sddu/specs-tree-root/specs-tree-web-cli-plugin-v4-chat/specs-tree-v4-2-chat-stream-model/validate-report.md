# 验证报告：specs-tree-v4-2-chat-stream-model

> **文档定位**: SDDU 验证报告 — 逐项记录自主验证的执行结果，作为工作流终点
> **验证策略**: `validate.md`（V1~V8 场景矩阵 + 五维度方法）
> **前置依赖**: `validate.md`、本叶 `spec.md`、`plan.md`、`build.md` v1.1、`review-report.md`（⚠️ 有条件通过 / 0 阻塞 / I-01~I-12）、父 `plan.md` ADR-V4-002
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-19
> **验证轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-19
> **更新说明**: 初始创建（R1 独立动态验证：20 项门禁独立复跑 + RP-V4-09；append-only / 零明文 / 渲染器 DOM 三条对抗探针；I-01 注入反证；红线逐字节复核；F-01~F-03 + N-01~N-03）；结论 ⚠️ 有条件通过 / 0 阻塞

---

## 1. 验证概要

| 维度 | 数值 |
|------|:--:|
| 验证场景总数 | **8**（V1~V8） |
| 通过 | **7**（V1* / V2 / V3 / V4 / V5 / V6 / V7 / V8 — V1 含 1 项环境性抖动） |
| 失败 | **0**（v4-2 自身产物） |
| 无法执行 | **0** |
| 独立探针断言 | **62**（V2 18 + V2browser 6 + V3 14 + V5 13 + V4/V7 15 − 重复计 4 → 见 §4） |
| 阻塞问题 | **0** |
| 发现（F） | **3**（中 1 / 低 2，全部非阻塞，两处属 v4-3 前向义务） |
| 备注（N） | **3**（环境性门禁抖动 1 / 文档口径 2） |

**被验基线**：仓库 `/home/usb/wks/gits/GitHub/LGDL` · 分支 `feature/web-cli-plugin` · HEAD `24da8b3` · diff 基线 `203261e`。验证开始/结束时 `git status --porcelain` 均为空（源码零扰动；`dist/**` 为 gitignored 构建产物）。

**纪律声明**：本轮**只写验证产物**（`validate.md` / `validate-report.md` / `state.json` / `TREE.md`）；一切对源码/台账的注入均用 sha256 前后对照证明逐字节复原。Chromium 探针严格串行（一次一个实例、一个页面 target、`finally` `SIGKILL`）。

---

## 2. 逐项验证结果（V1~V8）

| # | 验证对象 | 验证步骤（摘要） | 预期 | 实测 | 判定 |
|---|---------|---------|------|------|:--:|
| **V1** | 20 项门禁 + RP-V4-09 | `run-gates.sh` 严格串行重跑；逐项退出码/计数落盘 | 全绿且与台账同源 | **20/21 绿**；`binding` 3 次独立重跑均失败且**失败项每次不同**（见 N-01） | ⚠️ |
| **V2** | append-only 命脉 | node 对抗 21 + 真实 DOM 探针 6 | 冻结真/终态不可解/seq 不重复/淘汰一致 | ①~④ 冻结真、终态不可解除、I-06 双键去重生效、淘汰 DOM==project；**暴露 F-01/F-02** | ✅* |
| **V3** | 零明文命脉 | node 对抗 14 | 正文零落库 / 截断不夹带 / LRU 无残留 | 14/14；**暴露 F-03（边界残留）** | ✅ |
| **V4** | 迁移与切换 | node 迁移/切换/降级 9 + 渲染器 ESM 5 | 不炸/元数据零损/降级占位/登记一致 | 15/15 通过 | ✅ |
| **V5** | 卡预算与渲染 | Chromium 独立注入 13 | 合计 9>8 红 / 单卡 6 绿 7 红 / 终态冻结 / 形态 guard | 13/13 通过（红绿如实） | ✅ |
| **V6** | 修复落地抽查 | I-01 注入反证（2 变体）+ I-06 + KL-N-09 + 体积 | 判据非恒真；登记真实；体积同源 | 全部通过；I-01 两变体均 FAIL→还原 sha 一致→30/0 | ✅ |
| **V7** | 规范符合性 | AC-CHAT-001~003/010/011/020 逐条取机器证据 | 逐条成立 | 见 §3.6，逐条 ✅ | ✅ |
| **V8** | 红线终核 | 不动面 diff + 保护段 sha + 逐字节产物 | 零 diff / 零改 | 12/12 通过 | ✅ |

> \* V2 的两条 finding 为**潜在不变式缺口**（无产品可达破解），不改变「无产品路径破坏 append-only」的事实判定；分级见 §7。

---

## 3. 验证详细信息

### 3.1 测试覆盖（独立复跑，非引用）

| 门禁 | 命令 | 实测 | 基线 | 退出码 |
|------|------|------|:--:|:--:|
| 类型 | `npm run typecheck` | 0 error | 0 | 0 |
| 构建 | `npm run build` | 5 产物 / sidepanel **425,094 B** | — | 0 |
| node 全量 | `npm test` | **920 / 0 / skipped 0** | 881 → 920 | 0 |
| 取代台账 | `npm run test:supersession` | **30 / 0** | 28 → 30 | 0 |
| 元门禁 | `npm run test:gate-integrity` | **12 / 0** | 12 | 0 |
| 零注入 | `npm run test:zero-injection` | **27 / 0** | 27 | 0 |
| 页面即输入 | `npm run test:page-input` | **102 / 0** | 102 | 0 |
| L0 | `npm run test:l0` | **212 / 0** | 210 → 212 | 0 |
| L1 | `npm run test:l1` | **108 / 0** | 108 | 0 |
| L2 | `npm run test:l2` | **73 / 0** | 73 | 0 |
| 密度 | `npm run test:density` | **171 / 0**，产物 425,094 | 171 | 0 |
| journey | `npm run test:ui` | **167 / 0** | 167 | 0 |
| insight | `npm run test:insight` | **116 / 0** | 116 | 0 |
| binding | `npm run test:binding` | **见 N-01（3 次均失败，失败项不同）** | 192 | **1** |
| hardening | `npm run test:hardening` | **24 / 0** | 24 | 0 |
| e2e | `npm run test:e2e` | PASS | PASS | 0 |
| 设计契约 | `npm run test:design-contract` | **6 / 0**（shim **60 / 0**） | 6 | 0 |
| L1 反证 | `npm run test:l1-reverse` | **9 条** 注入→FAIL→sha256 逐字节还原→PASS | 9 | 0 |
| L2 反证 | `npm run test:l2-reverse` | **10 条** 同口径 | 10 | 0 |
| 流（新增） | `npm run test:stream` | **63 / 0** | 63 | 0 |
| 密度反证 | `npm run test:density -- --reverse RP-V4-09` | **9 / 0**（两段真会红） | 9 | 0 |
| （旁证） | `node design/ui-redesign/option-f-shim.mjs` | **60 / 0** | 60 | 0 |
| （旁证） | `node --test dist-test/test/sidepanel-view.test.js` | **38 / 0** | 38 | 0 |

日志全量落盘：`/tmp/opencode/v4-validate-v4-2/gates/`（`manifest.tsv` 逐项记退出码）。

**FR 覆盖矩阵（16/16 = 100%）**：

| FR | 机器证据 | 判定 |
|----|---------|:--:|
| FR-CHAT-020 | `stream-model.test.ts` ①②③⑤；V2-①（冻结）/③（seq）/⑤（无 null 消失） | ✅ |
| FR-CHAT-021 | taxonomy 测试 + V7-1/4（12 = 7+5，layer 全覆盖） | ✅ |
| FR-CHAT-022 | `stream.mjs` ③⑦；V5-D（固化区 + `.ts` + `[hidden]`） | ✅ |
| FR-CHAT-023 | `stream.mjs` ③「卡内零撤销控件」；V5-D | ✅ |
| FR-CHAT-024 | `stream-model.test.ts` ②；V4-2（tool/ok/ms 保留）；`truncationRules` 机核 | ✅ |
| FR-CHAT-025 | `stream-model.test.ts` ③⑤；V2-②（终态存续） | ✅ |
| FR-CHAT-026 | V7-6（零 stream kind 进入 `KIND_SET`）+ V8-6（background 零 diff） | ✅ |
| FR-CHAT-030 | `stream.mjs` ①（12 型 `li[role=listitem]` 挂 `#stream`） | ✅ |
| FR-CHAT-031 | `stream.mjs` ①（`ai` markdown / `user` 对侧） | ✅ |
| FR-CHAT-032 | `stream.mjs` ①②（`.msg-system` + `.card-head .ts`） | ✅ |
| FR-CHAT-033 | `stream.mjs` ①（`ref` `data-ref-state`/`data-ref-num`）+ V7-3 | ✅ |
| FR-CHAT-034 | `stream.mjs` ①（`.next-chip`）+ V5-B/C | ✅ |
| FR-CHAT-035 | `stream.mjs` ②（工具名/✓✖/ms/预览/折叠 + `.cmd`/`.msg-thinking`/`.entry-error`/`.msg-notice`） | ✅ |
| FR-CHAT-036 | `design-contract` 6/0 + shim 60/0 + V7-2（模型顺序 == 设计稿） | ✅ |
| FR-CHAT-037 | `stream.mjs` ⑦（`role=log`/`listitem`/`.ts`/`aria-live`/`hidden`）+ V7-5 | ✅ |

**NFR 覆盖矩阵（7/7 = 100%）**：

| NFR | 机器证据 | 判定 |
|-----|---------|:--:|
| NFR-CHAT-001 | `stream-model.test.ts` ①~⑥；V2②（回放等价/终态存续） | ✅ |
| NFR-CHAT-003 | `stream.mjs` ④（节点引用 `===`）⑤（48px）⑧（≈320 卡）；V2④(浏览器) | ✅ |
| NFR-CHAT-004 | `stream.mjs` ⑦ | ✅ |
| NFR-CHAT-009 | V1 串行 + 全量日志 + RP-V4-09 实跑 FAIL→还原→PASS | ✅ |
| NFR-CHAT-010 | `design-contract` 6/0 + shim 60/0 | ✅ |
| NFR-CHAT-011 | `cards/shared.ts` 480/10 单源 + `stream.mjs` ② | ✅ |
| NFR-CHAT-012 | `stream-persistence.test.ts` + V3（14/14） | ✅ |

### 3.2 接口数据实测

| 检查项 | spec/契约要求 | 实测 | 一致？ |
|--------|----------|---------|:--:|
| `DIGEST_FIELDS` | 恰 11 字段、无自由文本 | 11 字段；越界字段（`body`）注入 ⇒ 抛错 | ✅ |
| 摘要落库字节 | 不含正文/URL query/密钥/标记 | 5 类敏感串注入后内存 + store 字节扫描**零命中**（`leaked=[]`） | ✅ |
| `truncationRules[panel-reopen].kept` | == `DIGEST_FIELDS` 逐字段 | 逐字段相等；删登记/`kept` 脱钩均 ⇒ `test:supersession` FAIL | ✅ |
| 降级重建正文 | 仅 `（历史摘要）`，不造正文 | `digestToEvents` 全事件 `text===（历史摘要）` | ✅ |
| `dist/build-meta.json` | sidepanel 425,094 / inputs 69 | `bytes=425094`；抽 3 模块 `bytesInOutput` = 登记值；`inputs=69` | ✅ |
| LRU 20 | 只留最近 20；淘汰物理删除 | 25 → 留 20 淘汰 5；被淘汰 key `get===undefined`；残留扫描零命中 | ✅ |

### 3.3 构建脚本

| 命令 | 退出码 | 输出摘要 | 结果 |
|------|:--:|---------|:--:|
| `npm run typecheck` | 0 | 0 error | ✅ |
| `npm run build` | 0 | 5 产物；`sidepanel 425,094 B` | ✅ |
| `node design/ui-redesign/option-f-shim.mjs` | 0 | 60 passed / 0 failed | ✅ |

`sidepanel 425,094 ≤ ceiling 446,348`（`floor(425,094×1.05)`，容差 5% 未动）。

### 3.4 性能与边界

| 对象 | 要求 | 实测 | 达标？ |
|------|------|------|:--:|
| `project()` 320 卡 | < 250ms 且回放稳定 | `test/perf-budget.test.ts` 绿（门禁 3 内） | ✅ |
| 单卡可点 | ≤6 | 6 ⇒ 绿；7 ⇒ 红（V5-C） | ✅ |
| 首屏合计可点 | ≤8 | 两卡 4+5=9 ⇒ 合计红、单卡仍绿（V5-B） | ✅ |
| 首屏卡数 | ≤2 | 2 ⇒ 绿（V5-B） | ✅ |
| 终态 DOM | patch 后逐字不变 | 追加非法改写事件后 `outerHTML` 逐字不变（V5-D） | ✅ |
| `bound` 淘汰 | 仅非当前段 system/notice；DOM 同步 | 淘汰 8 张 DOM 节点全灭（`destroyed=8`）、DOM==project；受保护卡 detach 保身份（V2④） | ✅ |
| 320/400/520 零水平溢出 | =0 | `stream.mjs` ⑥ 绿 | ✅ |

### 3.5 漂移检测

| 漂移类型 | 检测方法 | 结果 |
|---------|-------------|------|
| 孤立代码（有代码无需求） | 新增 13 模块 ↔ FR 对照；导出符号引用扫描 | ✅ 无孤儿模块；**1 个未使用的导出 helper `hasSegment`（inline 等价逻辑在 `chat-state.ts`）** → N-02 |
| 需求缺失（有需求无代码） | 16 FR ↔ 测试/探针矩阵 | ✅ 无（16/16 有证据） |
| 规格漂移（spec 被修改） | `git log`/`git diff` 本叶 `spec.md` | ✅ 无（最后提交 = 立项 `a7af431`，HEAD 零 diff） |
| 计划交付物偏差 | plan §5/§2.5 vs 产物 | ⚠️ `view-model.ts`/`appendSystem`/`cards/command.ts` 三处未落地 —— **已由 build §11 偏差 7/8/9 显式登记**（review I-03 修复轮） |

### 3.6 规范符合性（AC 逐条）

| AC | 机器证据（本轮独立取） | 判定 |
|----|---------|:--:|
| AC-CHAT-001 | `stream.mjs` ⑦ `ol#stream[role=log]` + 正序追加；V7-5 `src/ui/sidepanel/index.html` `role="log"` | ✅ |
| AC-CHAT-002 | `stream.mjs` ① 12 卡型逐型存在 + ② 过程族 5 形态字段；taxonomy 12=7+5 | ✅ |
| AC-CHAT-003 | `stream.mjs` ③ 操作前→后（`data-answered`/`data-decision` + form hidden + `.card-fixed` + `.ts` + `aria-live`）；V5-D | ✅ |
| AC-CHAT-005 | `stream.mjs` ③ 卡内零「撤销」控件；V5-D askuser 固化后无撤销 | ✅ |
| AC-CHAT-010 | `stream-model.test.ts` ③回放等价 + ⑤取消/取代后原卡仍在；V2-②/⑤ | ✅ |
| AC-CHAT-011 | `stream-model.test.ts` ④ `system`/`notice` 无终态但生来冻结；`stream.mjs` ①② | ✅ |
| AC-CHAT-020 | V7-6（`KIND_SET` 中零 stream kind）+ V8-6（`src/background/**` 零 diff） | ✅ |
| AC-CHAT-022 | `stream.mjs` ⑦（role/lsititem/`.ts`/`aria-live`/`hidden`） | ✅ |
| AC-CHAT-023 | V1 20/21 绿（1 环境性抖动，见 N-01）+ 反证实跑 + 日志落盘 | ⚠️ |
| AC-CHAT-025 | `design-contract` 6/0 + shim 60/0；V7-2 顺序 == 设计稿 | ✅ |
| EC-CHAT-003 | V4-1/2/3（旧格式不炸、切换元数据零损、截断登记一致） | ✅ |
| EC-CHAT-004 | `stream.mjs` ⑥ | ✅ |
| EC-CHAT-006 | `stream.mjs` ⑧ + perf-budget | ✅ |
| EC-CHAT-009 | `stream.mjs` ⑦ | ✅ |
| EC-CHAT-013 | 0 阻塞、红线零 diff、20/21 门禁绿 | ⚠️（绑定 N-01） |

---

## 4. 验证脚本执行记录

> ADR-003 落地：验证脚本由 validate Agent 自主编写并直接执行，不走 task→build 流程。产出路径（用户指定）：`/tmp/opencode/v4-validate-v4-2/`；门禁日志在 `gates/`，探针输出在 `attest/`。

| 脚本文件 | 用途 | 对应场景 | 退出码 | 关键输出 |
|---------|------|:--:|:--:|---------|
| `run-gates.sh` | 20 项门禁 + RP-V4-09 严格串行复跑，逐项落盘 + `manifest.tsv` 记退出码 | V1 | 0 | 20/21 rc=0；binding rc=1（见 N-01） |
| `probe-appendonly.mjs` | append-only 对抗（冻结真伪 / 终态解除 / seq 回退与重复注入 / bound 内存一致） | V2 | 0 | 18/21（3 项为 F-01/F-02 的对抗命中，非探针错误） |
| `probe-zero-plaintext.mjs` | 零明文对抗（正文塞敏感串读回扫描 / 80 边界夹带 / LRU 残留） | V3 | 0 | 14/14（F-03 为边界观察） |
| `probe-migration-taxonomy.mjs` | 旧格式迁移 / 切换元数据 / 降级重建 + taxonomy & AC 锚点 | V4 / V7 | 0 | 15/15 |
| `probe-v5-budget-render.mjs` | 真实 dist 卡预算注入 + 终态冻结 + 形态 guard（自研收集器 + 独立解析 caliber） | V5 | 0 | 13/13 |
| `probe-render-esm.mjs` + `esm-probe/probe.html` | 真实浏览器 DOM 直驱**真实编译渲染器**，补足无测试 seam 可及的 `bound` destroy / detach / re-attach 路径 | V2④(浏览器) / V4 | 0 | 6/6（`destroyed=8`，节点身份 `===`） |
| `probe-volume-redline.py` | 体积五要素 + metafile 抽模块 + 保护段 sha + 红线逐字节 | V6 / V8 | 0 | 12/12 |
| `I01-runA/B/C`（内联 python 注入 + 门禁） | 删 `truncationRules` → FAIL；`kept` 脱钩 → FAIL；还原 sha 一致 → 30/0 | V6-I-01 | A=1/B=1/C=0 | 两变体均按预期判红，还原逐字节一致 |

**扰动可还原证据**：`attest/sha-before.txt` vs 结束时 sha —— `stream-model.ts` / `stream-digest.ts` / `stream-render.ts` / `chat-state.ts` / `sidepanel.ts` / `dist/content.js` / `dist/pick-layer.js` **逐字节相同**；台账注入后复原 sha256 = `32e352b7…`（与注入前一致）；`git status --porcelain` 恒为空。

---

## 5. 对抗探针结果（红绿如实）

### 5.1 V2 append-only（4 组）

| 组 | 对抗动作 | 预期 | 实测 | 判定 |
|:--:|---------|------|------|:--:|
| ① | 运行时改写已入列事件（`seq`/`payload.text`/`delete`/`defineProperty`/数组 `push`·`splice`/`state.seq`） | 冻结 ⇒ 抛 TypeError 且值不变 | 6 类全 TypeError，值保全；**但 `payload.options` 数组未被冻结 → 事件/CardView/caller 三处均可改写，`project()` 结果随之改变** | ❌（F-01） |
| ② | terminal 置位后追加非终态事件 / 异终态事件 / 重投影 / 删终态事件 | 终态不可解除、payload 不再折叠、数组删除被拒 | 全部成立（`terminal=completed` 恒定、payload 冻结快照不变、`splice` 抛错） | ✅ |
| ③ | `seq` 回退与重复注入（`stream-merge`：重复 `cardId` / 重复 `seq`） | 必须被拒或可检测 | 重复 `cardId`/`seq` 均跳过（I-06 双键生效）；**但「小于当前最大值且未占用」的 seq（实测 `0`）仍被接纳 → 事件数组逆序** | ⚠️（F-02） |
| ④ | `bound` 淘汰后内存与 DOM 一致性（node + 真实浏览器 DOM） | 淘汰后 DOM==project、`dropped` 可见、受保护卡不淘汰、切回同节点重挂 | `dropped=8`；`destroyed=8` 且被淘汰节点全灭；受保护/非当前段卡 **detach 保身份**（`nodeFor === survivorNode`）；切回重挂同一节点；终态 DOM 逐字稳定 | ✅ |

### 5.2 V3 零明文（3 组）

| 组 | 对抗动作 | 预期 | 实测 | 判定 |
|:--:|---------|------|------|:--:|
| ① | 往 `payload.text`/`prompt`/`options`/`answer`/`refLabel` 塞正文·URL query·密钥·命令参数体·`<b>` 标记 → 落库 + 读回扫描 | 摘要无任何此串 | 内存与 store 字节扫描 `leaked=[]`；仅白名单键产出；源码零 `payload.text` 读点 | ✅ |
| ② | `label` 80 字符边界夹带（敏感词在第 60/71/85 位；URL query 跨界；`askRequestId` 污染） | 80 内必抛；超界被截掉不夹带；id 污染 fail-closed | 60 位（完整在界内）⇒ 抛「密钥」；85 位 ⇒ 截掉无残留；`askRequestId` 带 query ⇒ 抛；**71 位 ⇒ 截断后落库含 `sk-ABCDEF`（密钥前 9 字符）** | ⚠️（F-03） |
| ③ | LRU 20 淘汰后 storage 残留扫描 | 仅留 20；淘汰物理删除；无正文残留 | 25→20、淘汰 5 且 `get===undefined`；marker 残留扫描零命中 | ✅ |

### 5.3 V5 卡预算与渲染（3 组）

| 组 | 注入 | 预期 | 实测 | 判定 |
|:--:|------|------|------|:--:|
| B | 两卡 **5 + 4 = 9** 可点 | 合计 >8 ⇒ 红；单卡仍绿 | 合计红（`9>8`）；单卡各自 ≤6 绿；首屏卡数 2 ≤2 | ✅ |
| C | 单卡 **6** / **7** 可点 | 6 绿、7 红 | 6 ⇒ 单卡绿；7 ⇒ 单卡红 | ✅ |
| D | 终态后再注入同卡事件（tool 非法改写 / askuser 异终态） | 终态卡 patch 不可变，DOM 逐字不变 | `outerHTML` 逐字不变、`data-frozen="true"`、`HACK`/`999` 未出现、「撤销」不出现 | ✅ |

---

## 6. 阻塞问题

| # | 位置 | 问题 | 对应 Vx | 修复建议 |
|---|------|------|:--:|---------|
| — | — | **无（0 个阻塞）** | — | — |

> 判定说明：F-01/F-02/F-03 为**潜在不变式缺口 / 启发式边界**，产品当前无可达破解路径（`chat-state` 产出 payload 无数组；无消费者改写；摘要不读 `options`/`text`）；N-01 为**环境性门禁抖动**（三次失败项互异、`binding.mjs` 与基线零 diff、历史 v4-1-r2 亦失败）。均不构成「未覆盖 FR / 构建失败 / 严重漂移 / 安全语义被破」，故记非阻塞。

---

## 7. 发现清单（F-xx / N-xx）

| # | 级别 | 位置 | 说明 | 证据 / 处置 |
|---|:--:|------|------|------|
| **F-01** | 中 | `stream-model.ts#appendEvent` / `#project`（浅 `Object.freeze` + 浅拷贝） | `payload.options` / `payload.chips` 是数组，**未被冻结**：`appendEvent` 后仍可通过 ① 事件引用 ② `project()` 返回的 `CardView` ③ 调用方原数组**三处改写**；实测改写后 `project()` 输出变化 → 违反 spec G1 / FR-CHAT-020「不可变 + 可回放」字面（review C1「载荷全链 freeze」对嵌套值不成立）。产品当前无写入者（`chat-state` 产出 `text/tool/ok/ms/label` 标量），故为**潜在不变式破损**。 | 建议在 `appendEvent` 与 `project` 对 `options`/`chips` 做 `Object.freeze([...arr])`；**v4-3 落 ask 流内化（options/chips 将成为真实 payload）前必须处置**。非阻塞。 |
| **F-02** | 低 | `chat-state.ts#stream-merge`（I-06 修复的残余） | 双键去重只拦「**已占用**」的 `cardId`/`seq`；对「小于当前最大值且**未占用**」的 `seq`（实测 `0`）仍接纳，事件数组出现逆序 seq，破坏「单调不复用」的排序不变式。产品路径受 `restoreStreamDigest` 的「该 session 无事件」守卫收窄，暂无可达破解。 | 建议 `stream-merge` 增加 `seq > max(state.seq−1, …)` 或仅在 `events.length===0` 时可达断言；非阻塞。 |
| **F-03** | 低 | `stream-digest.ts#sanitizeLabel`（先 `slice(0,80)` 再扫描） | 敏感词跨 80 字符边界时，截断结果只保留其**前缀**（实测 `sk-ABCDEF` = 密钥前 9 字符），因 SECRET 正则要求 `sk-` 后 ≥8 字符而不触发。80 内完整命中仍正确抛错、>80 完整截掉。产品 `label` 由 `chat-state` 构造为工具名/会话分隔符，非阻塞。 | 建议对**完整 label** 先扫一遍（或对截断结果加前缀模式检测）；属启发式 guard 的边界加固，非语义破。 |
| **N-01** | 环境 / 中 | `test/ui/binding.mjs`（V1 门禁 #14） | 本轮 3 次独立重跑**均失败且失败项互异**：R1 `#54B10 下载记录`；R2 `#3d/#3e/#3f discovery`；R3 `#7d/#7e tabs list --full`。`binding.mjs` 对基线 `203261e` **零 diff**、其保护段 active pin sha 复核未改；同一门禁在今日 build（08:32）与 reviewfix（09:58）跑均绿；历史 `v4-1-r2` 亦曾 FAILED(7)。结论：**环境性时序抖动，非 v4-2 回归**。 | 建议将 binding 的 3 处时序断言（下载读取/discovery/tabs--full）加有界重试或显式就绪等待；不计入本叶失败。 |
| **N-02** | 低 | `stream-model.ts#hasSegment` | 导出的 `hasSegment()` 除单测注释提及外**无消费者**；`chat-state.ts#history` 内联了等价 `events.some(...)`。 | 低危孤儿导出，可随 v4-3 内联或接线；不影响门禁。 |
| **N-03** | 低 | `build.md` §10 / §15.3（对齐台账） | 文档引用 journey 保护段 `42766..54004`（v4-1 的 `supersededFrom` 旧 pin），而台账 **active** pin 为 `43054..55259`（本轮已独立复核 active sha `e2b500df…` 逐字节命中，旧 pin 由 `supersededFrom` 保留）。属引用历史 pin 的口径文字问题。 | 建议 build/台账注明「active vs superseded 两 pin」；不影响红线判定。 |

---

## 8. 计数对账（本轮实测 vs 台账 `counts.currentRuntime` vs build §15.3）

| 口径 | 台账 | build §15.3 | 本轮实测 | 一致？ |
|------|:--:|:--:|:--:|:--:|
| nodeTestRuntime | 920 | 920 | **920** | ✅ |
| supersession | 30 | 30 | **30** | ✅ |
| stream | 63 | 63 | **63** | ✅ |
| l0 | 212 | 212 | **212** | ✅ |
| l1 | 108 | 108 | **108** | ✅ |
| l2 | 73 | 73 | **73** | ✅ |
| density | 171 | 171 | **171** | ✅ |
| journey | 167 | 167 | **167** | ✅ |
| insight | 116 | 116 | **116** | ✅ |
| hardening | 24 | 24 | **24** | ✅ |
| sidepanelView | 38 | — | **38** | ✅ |
| binding | 192 | 192 | **未复现（3 次失败）** | ✗（N-01） |
| gate-integrity | 12 | 12 | **12** | ✅ |
| zero-injection | 27 | 27 | **27** | ✅ |
| page-input | 102 | 102 | **102** | ✅ |
| design-contract | — | 6 | **6**（shim 60） | ✅ |
| l1-reverse / l2-reverse | — | 9 / 10 | **9 / 10** | ✅ |
| RP-V4-09 | — | 9 | **9** | ✅ |

> **差异总计 1 项**：`binding` 台账登记 192，本轮 3 次重跑均在 192 断言中于不同点失败（无一项固定失败）→ 判为环境性抖动（N-01），非计数口径错误。其余 17 口径**逐项同源**。

---

## 9. 结论

**结论**: ⚠️ **有条件通过**（0 阻塞；7/8 场景通过；3 项非阻塞发现 + 1 项环境性门禁抖动）

**指标达标矩阵**：

| 指标 | 要求 | 实测 | 达标？ |
|------|------|------|:--:|
| FR 测试覆盖 | 100% | **100%（16/16）** | ✅ |
| NFR 测试覆盖 | ≥ 80% | **100%（7/7）** | ✅ |
| 构建退出码 | 0 | 0（sidepanel 425,094 ≤ 446,348） | ✅ |
| 接口一致性 | — | 6/6 项（白名单/落库/截断登记/降级/metafile/LRU） | ✅ |
| 漂移项 | 0 严重 | 0 严重；2 项登记级（计划交付物偏差已登记 + 1 孤儿 helper） | ✅ |
| 阻塞问题数 | 0 | **0** | ✅ |
| 红线 | 零 diff / 逐字节 | content 177,076·pick-layer 33,900·`KIND_SET`/SW/manifest/design/security 零 diff；保护段 active pin sha 命中 | ✅ |
| 门禁 | 全绿 | **20/21**（binding 环境性抖动） | ⚠️ |

**理由**：

1. **两条命脉经得起打假**：① **append-only**——事件/载荷/数组/state 全链 `Object.freeze`；6 类改写全 TypeError；终态由首个 terminal 事件唯一决定、无解除路径；`bound` 仅淘汰非当前段 `system`/`notice`，淘汰后 **DOM==project()** 且受保护卡 detach 保身份、切回重挂同一节点（真实浏览器 DOM 直驱真实渲染器证实）。② **零明文**——`digestEntryOf` 不读 `payload.text`；白名单 11 字段唯一出口、落库/读回双重校验；正文/URL query/密钥/标记注入后字节扫描**零命中**；LRU 淘汰无残留。
2. **修复落地真实**：I-01 `truncationRules` 机核非恒真（删登记 / `kept` 脱钩两变体均判红，还原逐字节一致后 30/0）；I-06 双键去重生效；`KL-N-09` 台账真实存在；体积与 metafile 同源。
3. **红线与不动面零 diff**：`content.js` 177,076 / `pick-layer.js` 33,900 逐字节未变；`src/content/**`/`src/background/**`/`manifest.json`/`design/**`/`security`/`options` 零 diff；`CHROMIUM_GATES.length===9` 未动；保护段 active pin sha 逐字节命中。
4. **但存在非阻塞偏差**：F-01（嵌套数组未冻结，破「不可变」字面）为本轮最重要的前向义务——**v4-3 落 ask 流内化（options/chips 成为真实 payload）前必须处置**；F-02/F-03 为低危边界加固；N-01 为 binding 门禁的环境性时序抖动（三次失败项互异、基线零 diff、历史同现象）。据此判定 **⚠️ 有条件通过**（不判 ❌：无未覆盖 FR、无构建失败、无严重漂移、无产品可达安全语义破）。

**前向义务移交**：F-01 → v4-3（ask/auth 流内化前置）；N-01 → 门禁稳定性（binding 三处时序断言加就绪等待/有界重试）。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1）：V1~V8 独立动态验证；20 项门禁 + RP-V4-09 复跑对账；append-only/零明文/渲染器 DOM 三条对抗探针；I-01 注入反证；红线逐字节复核；F-01~F-03 + N-01~N-03；结论 ⚠️ 有条件通过 / 0 阻塞 | 2026-09-19 | SDDU Validate Agent |
