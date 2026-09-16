# 验证报告（验证策略）：specs-tree-v3-3-l2-on-demand-views

> **文档定位**: SDDU 验证策略 — 指导 validate Agent 执行自主验证的场景和方法；验证结果见 `validate-report.md`（R1）
> **前置依赖**: 本叶 `spec.md` v1.0 · 父 `../spec.md`（§5.4 / §8.3 / §8.4 / §10 权威条文）· 本叶 `plan.md`（ADR-V3-025~029）· 本叶 `review.md`（C1~C44）/ `review-report.md`（R1：**❌ 不通过，1 阻塞 F-01**；其后 build 修复轮已处置并经本轮独立复现确认为真） · `build.md` v1.1（含 §9 修复轮）· v3-1 / v3-2 先例（`../specs-tree-v3-1-l0-shell-density/{validate,validate-report}.md`、`../specs-tree-v3-2-l1-disclosure-refs/{validate,validate-report}.md`）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-16
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-16
> **更新说明**: 初始创建：V1~V16 验证场景矩阵（**独立复现，不复用被验证方脚本作唯一证据**；探针只写 `/tmp/opencode/v3-validate-v33/`）

---

## 1. 验证概要

| 维度 | 数值 |
|------|:--:|
| 被验证 Feature 类型 | **代码类 / 侧栏 UI 归属迁移 + 门禁元装置**（产品代码 `src/ui/sidepanel/l2/*` + `l0/*` + `index.html`；门禁 `test/ui/l2.mjs` / `l2-reverse.mjs` / `reverse-proof-judge.mjs` / `gate-integrity.test.ts` R4 / `l2-counts.test.ts`；机读台账 / 密度 / 体积登记册）→ **全五维度验证** |
| 验证场景数 | **V1~V16**（16 条） |
| 覆盖 FR | FR-V3-045~054 = **10 / 10**（每 FR ≥ 1 Vx） |
| 覆盖 NFR | NFR-V3-001/002/005/006/008/009~014/016/018 = **13 / 14 门禁级**（NFR-V3-015 人工面 → `⏳ 未执行`） |
| 覆盖 EC | EC-V3-002/003/008/009/011/013/014/016 |
| 验证维度覆盖 | 测试覆盖 · 接口/数据（产品 seam 契约）· 构建脚本 · 性能与边界 · 漂移检测（**五维度均 ≥1 条**） |
| 本轮轮次 | R1 |

**独立复现原则（本轮强制）**：

1. **F-01 必须自己复现**：形态 B（`node dist-test/test/supersession-ledger.test.js --files-override <同 basename 副本>`）由我在 `/tmp/opencode/v3-validate-v33/rp-f01/` 自建副本独立重做，**不使用被验证方的 `/tmp/opencode/v3-gate-logs/**` 作唯一证据**；同时独立复现形态 A（历史错误调用）与还原后的 `11/11`。
2. **新防呆必须被主动攻击**：我自写 14 条对抗样本（`attack-judge.mjs`）直接 `import` 判定器，逐形态尝试「因错而红」；另以 `attack-r4a.mjs` 攻击元门禁 R4a 的**声明侧**（注释 / 字符串字面量 / 过宽模式 / 短占位）。若绕过成功即登记为发现。
3. **自写测量实现**：密度 C1~C4 口径（非 `hidden` 祖先子树 ∩ (`BUTTON|A|INPUT|SELECT|TEXTAREA` ∨ `tabindex ≠ -1`)；`chars = Σ 自身直接文本去空白`；`行 = ⌈chars ÷ 34⌉`；`分区 = body 一级非 hidden 子元素`）由我在 `/tmp/opencode/v3-validate-v33/my-density-probe.mjs` **独立重写**，**不 import** `density-metrics.mjs` 的 `DENSITY_MEASURE_SOURCE`。
4. **自写交互与探针**：L2 四视图的「≤2 次交互 / 返回 / 零占用 / 单滚动 / 风险位可见 / 9 动作 / 零控件 / 计数同源」由我自己的点击序列与 DOM 判据（`my-l2-probe.mjs` / `my-catalog-probe.mjs` / `my-views-probe.mjs`）独立测量，**不 import** `test/ui/l2.mjs`。仅 Chromium 进程启动与 CDP 传输复用 `test/ui/_v3-helpers.mjs`（**如实披露**：传输复用 ⇒ 本轮的独立性是「测量实现 + 判据 + 驱动状态」级，不是 v3-2 的「自写 CDP 客户端」级）。
5. **被验证方的门禁照跑**（作为「它们自己说」的证据并核对计数），但**结论只建立在我的独立复现上**；不一致时以我为准并深挖。
6. **不推断填坑**：Chromium 一次只跑一个（NFR-V3-012 串行纪律）；内存/环境不足而无法执行的项 → 如实登记 `⏭️ 未执行`；人工面 → `⏳ 未执行`。

---

## 2. 自主验证场景（V1~V16）

**验证对象来源**：

- `spec.md`（本叶 §4 FR-V3-045~054 / §5 NFR 落点 / §6 EC / §7 验收锚点 AC-V3-010~025）+ 父 `../spec.md`（§5.4 / §8.3 / §8.4 / §10）
- `plan.md`（ADR-V3-025 视图替换 / 026 计数真值派生 / 027 命令目录 / 028 fab·drawer 归属迁移 / 029 取代策略）
- 实际产物：`src/ui/sidepanel/{index.html,sidepanel.ts,view-model.ts,l0/*,l2/*}` · `src/ui/settings/sections.ts` · `test/ui/{l2,l2-reverse,insight,l0}.mjs` · `test/{reverse-proof-judge.mjs,l2-counts.test.ts,gate-integrity.test.ts}` · `test/size-*` · `docs/v3-{supersession-ledger,density-baseline}.json` · `dist/*`
- **不采信**：`build.md` / `review-report.md` / `state.json` / `/tmp/opencode/v3-gate-logs/**` 的任何数字（仅作「待核对声称」清单，见 §3）

| # | 验证对象 | 验证步骤 | 预期结果 | 验证维度 | 验证方法 |
|---|---------|---------|---------|:--:|:--:|
| **V1** | 门禁可执行性与计数（NFR-V3-012/013/014） | 严格串行（一次一个 Chromium）复跑 16 项 + 体积三线；逐份提取退出码 + 计数，与登记值逐项对照 | 全 `exit=0`；`typecheck 0 err · build ✓ · npm test 776 · supersession 11 · density 127 · l0 164 · l1 103 · l2 71 · journey 167 · insight 116 · binding 192 · hardening 24 · e2e PASS · gate-integrity 12 · l1-reverse 9 · l2-reverse 6` | 测试覆盖 | 自写串行 runner（全量日志落盘 `/tmp/opencode/v3-validate-v33/gates/`） |
| **V2** | **F-01 独立复现**（NFR-V3-013 / AC-V3-011/012） | ① 自建同 basename 副本删 1 条 `check(` → 形态 B 直跑 → 断言 FAIL 段**必须**含 `67 < 台账下界 68 —— 删除断言未登记` 且含 `--files-override <我自己的副本路径>`；② 扫描启动错误标记必须为 0；③ 形态 A（历史错误调用）复现 `ERR_MODULE_NOT_FOUND`；④ 无 override 直跑 `11/11`；⑤ 真文件零改动 | ① `EXIT=1` + 预期文本 + override 分支真执行；② 0 命中；③ `EXIT=1` 且含 `ERR_MODULE_NOT_FOUND`；④ `11/11 exit=0`；⑤ `check(` 仍 68 | 测试覆盖 + 性能边界 | 自建 `/tmp` 副本 + 真实命令 |
| **V3** | **新防呆对抗（本轮重点）**（NFR-V3-013） | ① 我自写 14 条对抗样本（启动错误 + 预期文本 / 无关位置 / 过宽模式 / 大小写 / 换行拆断 / 列表外环境错误 / OOM / CDP 超时 / 无失败标记…）直判；② 跑判定器 `--selftest`（5 夹具）；③ 走查 `gate-integrity` R4a~R4d 的真实接线；④ `attack-r4a.mjs` 攻击声明侧正则 | ② 5/5 且负控被判无效；① 与 ④ 若发现可绕过形态 → **登记为发现**（含可复现步骤 + 修复建议） | 测试覆盖 + 漂移检测 | 自写对抗脚本 + 直接 `import` 判定器 |
| **V4** | **计数真值派生（打假：看似派生实则写死）**（FR-V3-046 / EC-V3-016） | ① 自写双向实验：读 `deriveCounts()` 与**独立真值**（`insight-tree.meta.counts`）→ 经既有通道**新增一个已授权站点** → 计数变化量必须 == 真值变化量；② 审计计数 == `audit-export` 回包长度且随环缓冲增长而移动；③ 全文搜索退化路径：默认值回退 / `catch` 回退常量 / 首渲染占位 / 超时兜底固定值；④ 四类计数各自来源（`deriveCounts()` / `CATALOG_BASELINE_META` / audit 回包 / `sections.ts` 登记表）逐项核对 | ①② 全部相等；③ **硬编码路径须为空**；④ 每个真值有唯一来源且可复算 | 接口/数据 + 漂移检测 | 自写 Chromium 探针（产品 seam）+ 全仓 grep |
| **V5** | **语义迁移未削弱**（FR-V3-052 / ADR-V3-028） | ① `#tree-fab` 默认 `hidden`、视图内被揭示；② `#tree-drawer` `role=region` / `aria-modal` 移除 / `aria-haspopup` 删除 / `position:static`；③ 独立枚举 `#I-*` 标识集合差（应为 LOST=0 / NEW=8）；④ `sidepanel-view.test.ts` 零 diff；⑤ 几何阈值 `LOG_MIN_HEIGHT/LOG_MIN_RATIO/COMPOSER_GAP` 逐字不变；⑥ 分/块/cards 计数不降 | ①~⑥ 全部成立；差异只允许「同编号迁移 + 新增」 | 漂移检测 + 接口/数据 | 自写探针 + `git diff` + 集合运算 |
| **V6** | **密度 `chars` −3 是否合规（打假：掩盖回升）**（NFR-V3-001/002） | ① `git diff cf2af32..HEAD -- test/ui/density-metrics.mjs` 必须为 0（测量源码零行改动）；② 独立复算该 −3 的字符来源；③ 核 `previous` 是否逐格保留 + 方向；④ 判断理由是否成立；⑤ 被移出的文本是否真的进入默认 `hidden` 的入口面板 | ① 0 行；② 逐字对上；③ 保留且 `tighten-only`；④ 理由可机器复现；⑤ 确实在 `hidden` 子树内 | 漂移检测 + 性能边界 | 直接命令 + 自写探针 |
| **V7** | **体积三线 + 增量归因**（NFR-V3-005 / AC-V3-016） | ① 实测 `dist/*` 字节与登记值逐项相等；② 自跑 `size:attribution -- --rev cf2af32 --rev WORKTREE` 复现 Δ 与逐模块表；③ 核 `Σ per-module` + 未归因胶水 == Δ；④ 核必需占比与「未解释字节」；⑤ 核 Feature 累计增幅算法（起点、是否漏轮） | ① `content.js 177,076`（无容差）/`sidepanel.js 349,925` == 登记 ≤ `367,421`；② 逐行一致；③④⑤ 自洽 | 构建脚本 + 漂移检测 | 直接命令 + 自跑归因工具 |
| **V8** | **L2 四视图默认零占用 + ≤2 次交互 + 返回**（FR-V3-045/047/048） | 自写探针：① 默认态四 `[data-l2-view]` 的 `hidden` 属性链与可见数；② 我自己的点击序列 `#l0-statusbar` → `#l2-entry-*` → `#l2-back`（四视图各一轮）；③ 每视图实测「面板级滚动容器数」「`#log` 是否被替换」「风险位是否可见」；④ 返回后复原 | ① 可见数 = 0 且全部为 `hidden` 属性（非 CSS 隐身）；② 2 次交互恰一视图可见；③ 树上恰 1 个滚动容器 + 风险位可见；④ 返回后复原 | 接口/数据 + 性能边界 | 自写 Chromium 探针（自写点击序列与判据） |
| **V9** | **四视图内容真值（非空骨架）**（FR-V3-049/051/052/053、AC-V3-026） | ① tree：`ul[role=tree]` + treeitem/`aria-level` + 面包屑 + `[data-action-id] ⊆ 9 白名单` + 零 `allow` 控件；② commands：渲染卡数 == `deriveCounts().commands.live` + **零表单控件** + 硬底线卡可选项集为空 + 只可收紧卡无 `allow` + 9 动作只读列表顺序；③ audit：条目/白名单文案；④ settings：`.wc-section` == 登记表（7） | ①~④ 全部成立且非空转 | 接口/数据 | 自写探针（产品 seam + 真实点击） |
| **V10** | **取代台账逐行审计**（AC-V3-011/012/014） | 自写 python（比门禁更严）：① `newTitle` 逐条可定位；② base 相对删除行逐行命中；③ **叶相对**（`bf5773d..HEAD`）删除行是否登记（base 相对判据的结构盲区）；④ 两个 `protectedRanges` 字节 hash 独立复算；⑤ `v3SkeletonExemptions` 两条的「按登记条件删除」是否合规；⑥ `v3RevealComposer` 有界重试（V33F-S12）是否补登 | ①②④⑤⑥ 成立；③ 的残留须**被文档如实登记**，否则记为发现 | 漂移检测 | 自写 python + `git diff -U0` |
| **V11** | **零改动红线**（NFR-V3-006/018 / AC-V3-017） | 独立 `sha256sum` / `stat` / `git diff`：`dist/content.js` + `src/content/**` 三 hash + 判定链两 hash + `manifest.json` 零 diff 且无 `contextMenus` + 依赖段零新增 + 阈值逐字 `7/15·9/20·17/35` + 主界面无常驻输入框 + 风险位不可折叠 | 全部逐字不变 / 零 diff | 漂移检测 | 直接命令 |
| **V12** | **密度独立复测（自写口径）**（NFR-V3-001/002、AC-V3-001~004） | 自写测量实现测 `default` / `firstRun` × 320/400/520（6 格，夹具两遍达稳态）→ 与登记格逐项对照；并断 `default` 三视口 `chars` 相等 | 6/6 逐格相等；`default` `C1=7 · chars=220` 三视口相等 | 性能边界 | 自写 Chromium 探针（自写口径，不 import 被测口径） |
| **V13** | **文档 / 登记册数字漂移** | 把 `build.md` / `review-report.md` / `state.json` / 机读台账·基线·体积登记册里的每个数字与我的实测逐项对照 | 声明值 == 实测；不一致即登记（含方向） | 漂移检测 | 自写 python / grep 对照 |
| **V14** | **人工面如实登记**（NFR-V3-015 / AC-V3-025） | 读 spec/build/state 的人工面清单，核对是否二值（PASS / 未执行） | 逐项「⏳ 未执行」，不得冒充 PASS | 漂移检测 | 文档核对 |
| **V15** | **ROADMAP 登记范围**（纪律） | `grep F-29`：是否只在「未来方向候选（未立项）」小节 + 修订记录 | 不得挂到任何已排期版本 | 漂移检测 | 直接命令 |
| **V16** | **验证纪律**（本轮边界） | `git status --porcelain` 前后、`git rev-parse HEAD/main`、探针路径、是否 `git add`/`commit` | 未改源码/测试/文档/配置；未 commit；`main` 未动；HEAD 不变；实验只在 `/tmp` | 漂移检测 | 直接命令 |

> **质量门槛自查**：FR 10 项 → V4/V5/V8/V9 逐项覆盖（FR-V3-045→V8、046→V4、047→V8、048→V8、049→V9、050→V9(+V1 的 ⑨)、051→V9、052→V5/V9、053→V9、054→V8/V12）；五维度各 ≥1（测试覆盖 V1/V2/V3、接口数据 V4/V5/V8/V9、构建 V7、性能边界 V2/V6/V8/V12、漂移 V3/V4/V6/V7/V10/V11/V13/V14/V15/V16）；不可验证项 = 人工面（V14，如实登记 ⏳，不计入 PASS）。

---

## 3. 逐项对照基线（被验证方声称的事实，**待独立核对**）

| # | 声称 | 来源 | 独立核对方式 |
|---|------|------|-------------|
| C-1 | 20 项门禁全绿：`776 / 11 / 127 / 164 / 103 / 71 / 167 / 116 / 192 / 24 / e2e PASS / 12 / l1-reverse 9 / l2-reverse 6` | `build.md §1/§9.2`、`state.json phaseNote` | V1 自跑串行链 + 逐份计数 |
| C-2 | F-01 已订正：形态 B 下 FAIL 段含 `67 < 台账下界 68 —— 删除断言未登记`、override 分支真执行、还原 `11/11` | `build.md §9.1` | V2 自建副本独立复现（不复用其日志） |
| C-3 | 新增 `expectFailPattern` 防呆 + 判定器 `--selftest` 5 夹具 + 负控 `RP-V33-03-NEG` 被判无效 + 元门禁 R4a~R4d | `build.md §9.3`、`gate-integrity` | V3 自写对抗 + 自跑 selftest + 自跑 l2-reverse |
| C-4 | 四类计数从真值派生；`{live,baseline}` 分列；`null ≠ 0`；硬编码即 FAIL | `build.md §4`、`review-report §2` | V4 自写双向实验 + 写死路径搜索 |
| C-5 | 语义迁移零削弱：FAB 默认 hidden、drawer `role=region`/`aria-modal` 移除/`position:static`、`#I-*` LOST=0/NEW=8、`sidepanel-view.test.ts` 零 diff、阈值零放宽 | `build.md §2/§9.4`、`review-report §4` | V5 自写探针 + 集合运算 + `git diff` |
| C-6 | 密度 22 格 `chars` 逐格 −3（tighten-only，前值保留）；测量源码 `DENSITY_MEASURE_SOURCE` 零行改动 | `docs/v3-density-baseline.json`、`build.md §5.3` | V6 + V12（自写口径 6 格复测） |
| C-7 | `sidepanel.js 349,925 == 登记 ≤ 公式 ceiling 367,421`；累计 Δ=54,700（必需 98.7% / 未解释 684 B）；Feature 累计 +31.30% | `test/size-baseline.ts`、`build.md §5.1/§5.2/§9.5` | V7 实测 + 自跑归因 + 算法复核 |
| C-8 | 四视图默认零占用（`hidden` 链）；≤2 次交互；返回复位；单滚动容器；L2 期间风险位可见 | `build.md §4`、`test:l2` | V8 自写探针（自写点击序列） |
| C-9 | 目录卡 122 / 分列实时 vs 基线 / 硬底线零控件 / 零提权 / 9 动作固定序 / 零明文 | `build.md §4`、`test:l2 ⑧⑨` | V9 自写探针逐项复测（含卡数口径） |
| C-10 | 台账 `V33-S1~S14` + `V33F-S1~S14`；base 相对删除行全命中；两个受保护区段 hash 不变 | `docs/v3-supersession-ledger.json` | V10 自写 python（含叶相对盲区探测） |
| C-11 | 红线零改动：`content.js 177,076` + `52a82620…`、`src/content/**` 三 hash、判定链两 hash、`manifest.json` 零 diff、无 `contextMenus`、无新依赖、无常驻输入框、风险位不可折叠、阈值逐字 | `build.md §7`、`review-report §8` | V11 直接命令 |
| C-12 | `review-report R1 = ❌ 不通过（1 阻塞 F-01）`，修复轮已处置；F-01 的修复真实有效 | `review-report §1`、`state.json phaseNote` | V2 / V3；另核 review-report 无 R2 |
| C-13 | 人工面（树逐层展开观感 / 窄栏长路径 / 键盘体感 / 明暗观感）如实登记未执行 | `build.md` / `state.json` | V14 |
| C-14 | `ROADMAP` 新增 F-29 仅在「未来方向候选（未立项）」 | `ROADMAP.md` | V15 |

---

## 4. 验证执行纪律（本轮）

| 纪律 | 要求 | 落地 |
|------|------|------|
| 独立测量 | 自写测量实现 / 自写点击序列 / 自写判据 | `my-density-probe.mjs`（自写 C1~C4）/ `my-l2-probe.mjs` / `my-catalog-probe.mjs` / `my-views-probe.mjs` / `audit-ledger*.py` |
| 传输复用的如实披露 | CDP 传输与 Chromium 启动复用 `test/ui/_v3-helpers.mjs`（独立性低于 v3-2 的「自写 CDP 客户端」级） | §1 原则 4 |
| 探针路径 | 只写 `/tmp/**`，**不入版本库** | `/tmp/opencode/v3-validate-v33/` |
| 反证可还原 | 自建副本 + 运行后核对真文件 sha256 | V2 / V3 |
| 门禁串行 | 一次只起一个 Chromium，**绝不并发** | V1 串行 + 各探针独立串行 |
| 不改产物 | 不修改源码/测试/文档/配置；不 `git add`/`commit`/`push`；不动 `main` | 仅 `dist/**`、`dist-test/**`（gitignored）被构建重建；`state.json` 按协议推进并在报告中披露 |
| 不冒充 PASS | 人工面 / 环境不可合成项 → 如实登记 | V14 + §7 未验证项 |

---

## 5. 结论（策略侧）

**结论**: 策略已定稿，等待报告侧逐项执行 → 见 `validate-report.md` R1。

> **ADR-004 流程说明（如实披露）**：按 ADR-004，`validate.md` 应先产出并经用户确认，再执行 `validate-report.md`。本轮由编排器在**同一次指令**中显式要求「产出 `validate.md` + `validate-report.md`」并给出完整验证清单（即已预授权执行），故策略与报告在**同一轮**产出；策略矩阵在报告中逐项回填，二者可逐格互查。

## 6. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：V1~V16 自主验证场景矩阵（代码类 Feature → 全五维度）；独立复现原则（自写口径 + 自写探针/点击序列 + 独立反证 + 主动攻击新防呆）；对照基线 C-1~C-14 | 2026-09-16 | SDDU Validate Agent |
