# 验证报告：specs-tree-v3-1-l0-shell-density

> **文档定位**: SDDU 验证策略 — 指导 validate Agent 执行自主验证的场景和方法；验证结果见 `validate-report.md`（R1）
> **前置依赖**: 本叶 `spec.md` v1.0、父 `../spec.md`（§5.2 / §8.1~8.2 / §9 权威口径）、本叶 `plan.md`（ADR-V3-013~019）、本叶 `review.md` / `review-report.md`（R1：22 通过 / 16 改进 / **0 阻塞**，状态 passed）、`build.md`（v1.1 修复轮）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-16
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-16
> **更新说明**: 初始创建：V1~V12 验证场景矩阵（自主定义；**独立复现，不复用被验证方脚本作唯一证据**）

---

## 1. 验证概要

| 维度 | 数值 |
|------|:--:|
| 被验证 Feature 类型 | **代码类**（`src/ui/sidepanel/**` 产品代码 + 新增门禁测试 + 机读台账/基线） → **全五维度验证** |
| 验证场景数 | **V1~V12**（12 条） |
| 覆盖 FR | FR-V3-010~024 + FR-V3-026 = **16 / 16**（每 FR ≥ 1 Vx） |
| 覆盖 NFR | NFR-V3-001 / 002 / 005 / 006 / 009~015 / 017 / 018 = **13 / 13** |
| 覆盖 EC | EC-V3-002 / 003 / 005 / 008 / 009 / 010 / 015 |
| 验证维度覆盖 | 测试覆盖 · 接口/数据（DOM-ARIA 契约）· 构建脚本 · 性能与边界 · 漂移检测（**五维度均 ≥1 条**） |
| 本轮轮次 | R1 |

**独立复现原则（本轮强制）**：

1. 验证 Agent **自己写测量实现**（`/tmp/opencode/v3-validate/probe-lib.mjs` 的 C1~C4 口径按父 spec §9.1 原文独立重写，**不 import** `test/ui/density-metrics.mjs` 的 `DENSITY_MEASURE_SOURCE`），用**自己的数字**去核对被验证方的数字。
2. 被验证方的门禁脚本**照跑**（作为「它们自己说」的证据），但**结论只建立在独立复现之上**；不一致时以独立复现为准。
3. 反证必须**独立重跑**，并核验：① 扰动是否施加在门禁**真读**的路径上；② FAIL 段是否真 FAIL；③ 还原是否**逐字节复原**（sha256 比对）。
4. 人工面（headless 不可合成）一律 `⏳ 未执行`，**不计入 PASS**。

---

## 2. 自主验证场景（V1~V12）

**验证对象来源**：

- `spec.md`（本叶）+ 父 `../spec.md`：FR-V3-010~024 / FR-V3-026、NFR-V3-001~018、EC-V3-002~015、AC-V3-001~010 / 012 / 013 / 016 / 017 / 025 / 027、**§9.1 四项口径**与 **§9.3 六条反证**
- `plan.md`：ADR-V3-013~019（L0 骨架 / 决策卡 / 折叠器 / 密度单源 / 台账 / 体积重登记）
- `build.md` v1.1 + `review-report.md`（R1）：声称的事实清单（**待独立核对，不得直接采信**）
- 实际产物：`src/ui/sidepanel/**`、`test/ui/*.mjs`、`test/*.test.ts`、`docs/v3-*`、`dist/{content,sidepanel}.js`、`manifest.json`

| # | 验证对象 | 验证步骤 | 预期结果 | 验证维度 | 验证方法 |
|---|---------|---------|---------|:--:|:--:|
| **V1** | AC-V3-001/002/004、FR-V3-022、NFR-V3-001：**密度三档 × 三视口**（9 强制格） | 自建 Chromium 驱动 + **自写口径**：default / firstRun × 320/400/520 → 逐格测 C1/C2/C3/C4/chars，与登记值逐格对照 + 夹具幂等复测 | 9 格全部 ≤ 上限（7/15、9/20）且与登记值逐格相等 | 性能与边界 | 自写探针 `probe-density.mjs`（Chromium 真产物） |
| **V2** | AC-V3-003、FR-V3-016：**风险态 5 子场景 × 3 视口**（15 登记格）+ worst | 同上；每格先测 base（风险抑制）再测 risk；**自写增量归属实现**（按 key 对比 base/risk 的可点/文本块/字符增量，仅允许 `#risk-rail` / `[data-destructive-option]` / `[data-ref-stale]` 类）| 15 格 ≤ 17/35；worst 9/13/25/6；**增量违规 0** | 性能与边界 | 自写探针（独立口径 + 独立归属实现） |
| **V3** | AC-V3-008/009、FR-V3-016/017/018、EC-V3-015：**风险位永不折叠** | ① 5 类风险逐一强制 → 自写「祖先闭包」探针（无 `hidden` / 无 L1-L2 折叠容器 / 三通道齐备 / 渲染高度 > 0）；② **主动尝试隐藏**：直改 `row.hidden` / `#risk-rail.hidden` / 移入 `hidden [data-l1-panel]` / 把 `#risk-rail` 包进折叠层 / 走控制器 `close('risk-rail')` / `collapseAll()` 全收起 / 打开 L2 视图；③ 破坏性确认选项祖先闭包 | ②中任一「真能藏起来且门禁不报」即 FAIL；③无 `hidden` 祖先且不在 `#l1-more` | 漂移检测 + 性能与边界 | 自写对抗探针（`probe-density.mjs` / `probe-ec.mjs`） |
| **V4** | AC-V3-005、AC-V3-007、NFR-V3-002：**口径同源与阈值单源** | ① 用**自写口径**测 E/D 稿（root=`#panel`）；② 调 E 稿自带 `window.__density()` 对比；③ 读 `density-metrics.mjs` 的阈值/常量 pin；④ 反作弊 API 零命中 | 自写口径 ≡ E 稿 `__density()` 逐项相等；阈值与 §9.2 逐字一致；禁用 API 零命中；公布值落差**已登记** | 接口/数据 | 自写探针 + 静态核对 |
| **V5** | AC-V3-006/014/015、NFR-V3-013：**反证实跑** | 独立重跑 RP-V3-01 / 03 / 05 / 06 / 08 + **I1 修复反证**；逐条核验扰动位置、FAIL 段、还原段（sha256） | 每条 FAIL 段真 FAIL、还原段真 PASS、还原后 sha256 复原 | 测试覆盖 | 直接执行门禁 + 自写对照 |
| **V6** | AC-V3-011/012、NFR-V3-014：**取代台账非橡皮图章** | 独立 `git diff -U0 c2c0e0d..HEAD` 逐文件复算：① 逐 **行** 归属（比门禁更严）；② `entries[].newTitle` 可定位；③ `oldTitle` 已消失；④ `protectedRanges` 字节区间 sha256 独立复算；⑤ `pureAdditionFiles` 0 删除行；⑥ `zeroDiffFiles` 真 0 diff；⑦ 计数口径 | 无「未登记却被修改」的受保护区间；字节 hash 复原；计数只增不减 | 漂移检测 | 自写 python 审计（`30/31-ledger-audit*.txt`） |
| **V7** | AC-V3-015/016/017/027、NFR-V3-003/005/006/017/018：**体积与红线零改动** | 独立 `sha256sum` / `stat` / `git diff`：content.js 字节+hash、sidepanel.js 字节 vs 登记 vs ceiling、manifest/options.html/依赖/`web-cli-base` 零 diff、判定链 + `src/content/**` 三 hash = pin、构建**可复现性**（重建后字节/hash） | 全部零漂移；ceiling 与 spec 登记值的关系**显式说明** | 构建脚本 | 直接命令 + 重建复算 |
| **V8** | AC-V3-012/013/024、NFR-V3-012/014：**门禁串行 + 计数只增不减** | 严格串行（一次一个 Chromium）复跑 11 条门禁 + 独立统计计数，与声称值逐项对照 | 退出码全 0；计数 ≥ 下界（167/108/192/38/646）且与声称一致 | 测试覆盖 | 串行执行 + 日志全量落盘 |
| **V9** | FR-V3-010/011/012/013/014/015/019/020/021/023/024/026：**L0 行为契约** | 自写 DOM 探针：三区可见性、决策卡唯一/≤2 推荐/N 可复算且**可派生**、末项逐字且为末位、兜底框 hidden→shown→hidden、默认态可见输入框 = 0、拾取禁用态、硬底线零允许控件、遍历全部 `[aria-controls]`、状态栏一行 + ≤4 入口各带计数 | 逐条成立 | 接口/数据 | 自写探针 `probe-ec.mjs` |
| **V10** | EC-V3-002/003/005/008/009/010/015：**边界抽查** | 320px 零水平溢出 + 常驻元素集合 320≡400；明暗主题 token 变化 + 展开态保持；未授权/探测中风险行与禁用态；硬底线零允许；破坏性确认闭包 | 逐条成立 | 性能与边界 | 自写探针 |
| **V11** | NFR-V3-015：**文档/台账 vs 实测数字漂移** | 把 `build.md` / `review-report.md` / 台账 / 基线 json / spec 里**每一个数字**与我的实测/复算逐项对照 | 无不一致 → 任一不一致即登记（含方向与差值） | 漂移检测 | 自写 python 对照 |
| **V12** | AC-V3-025：**人工面如实登记** | 读 spec §5 NFR-V3-015 / §7 AC-V3-025 与 build.md §3.2，核对人工面清单状态 | 逐项为「未执行」或「PASS」二值，**不得冒充 PASS** | 漂移检测 | 文档核对 |

> **质量门槛自查**：FR 16 项 → V1/V2/V3/V4/V7/V9 逐项覆盖（≥1 条/FR）；五维度各 ≥1（测试覆盖 V5/V8、接口数据 V4/V9、构建 V7、性能边界 V1/V2/V3/V10、漂移 V3/V6/V11/V12）；不可验证项 = 人工面（V12，如实登记 ⏳，不计入 PASS）。

---

## 3. 逐项对照基线（被验证方声称的事实，**待独立核对**）

| # | 声称 | 来源 | 独立核对方式 |
|---|------|------|-------------|
| C-1 | default 三视口 `7/6/18/6`、`7/7/19/6`、`7/7/19/6` | build.md §1 / 基线 json | V1 自写口径逐格 |
| C-2 | firstRun 三视口 `7/12/25/6` | 同上 | V1 |
| C-3 | risk 最差 `9/13/25/6`；增量归属违规 0 | build.md §1 / 基线 json | V2 |
| C-4 | E 稿 `7/10/47/6`、D 稿 `80/144/391/5`；同源硬证明成立 | build.md §1 / 基线 json | V4 |
| C-5 | `content.js` 177,076 / sha256 `52a82620…`；`sidepanel.js` 295,225 ≤ ceiling 306,099（未抬高） | build.md §5.3 / 基线 json | V7 |
| C-6 | 门禁：npm test 732 · journey 167 · insight 108 · binding 192 · hardening 24 · density 105 · l0 134 · supersession 11 · e2e PASS | build.md §5.3 | V8 |
| C-7 | 台账 `V31-S1~S15`、`pureAdditionFiles`、`countCalibers`、`protectedRanges` 字节 hash；3 条 deferred | build.md §5 / 台账 | V6 |
| C-8 | I1~I8 + I9~I17 全修；`RP-02b/03/04` 读取侧为副本；`package.json -2 行` 不在台账覆盖面；几何余量仅 7px | build.md §5.2 | V5/V6/V11 |
| C-9 | default@320 与 400/520 的差来自夹具非对称（瞬时 `#notice` 29 字符） | 基线 json `fixtureAsymmetry` / state.json notes | V1/V11 |
| C-10 | `#log` clientHeight 实测 495 → 登记下界 488（余量 7px） | build.md §1 / 基线 json | V8（阶段 F 重测）+ V11 |
| C-11 | 人工面 6 项 ⏳ 未执行 | build.md §3.2 | V12 |

---

## 4. 验证执行纪律（本轮）

| 纪律 | 要求 | 落地 |
|------|------|------|
| 独立测量 | 自写口径实现，不 import 被测口径 | `probe-lib.mjs`（按父 §9.1 原文重写）+ `probe-density.mjs` / `probe-ec.mjs` |
| 探针路径 | 只写 `/tmp/**`，**不入版本库** | `/tmp/opencode/v3-validate/` |
| 反证可还原 | 逐字节复原 + sha256 复核 | RP-05/06/08 用副本或「副本+还原」；I1 用「源文件备份→扰动→还原→sha256 复核」 |
| 门禁串行 | 一次只起一个 Chromium，**绝不并发** | V8 逐条串行执行，日志全量落盘 |
| 不改产物 | **不修改任何源码/测试/文档/配置**；不 `git add` / `commit` / `push`；不动 `main` | 仅 `dist/**`（gitignored）被 `npm run build` 重建；结束 `git status` 为空、HEAD 未变 |
| 不冒充 PASS | headless 不可合成项 → ⏳ 未执行 | V12 |

---

## 5. 结论（策略侧）

**结论**: 策略已定稿，等待报告侧逐项执行 → 见 `validate-report.md` R1。

## 6. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：V1~V12 自主验证场景矩阵（代码类 Feature → 全五维度）；独立复现原则（自写度量实现 + 反证独立重跑 + 逐字节还原核验）；对照基线 C-1~C-11 | 2026-09-16 | SDDU Validate Agent |
