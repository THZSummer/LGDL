# 验证报告：specs-tree-v3-2-l1-disclosure-refs

> **文档定位**: SDDU 验证报告 — 逐项记录自主验证的**执行结果**（本叶工作流终点），作为 validate 阶段唯一有效产出
> **验证策略**: `validate.md`（V1~V18 场景矩阵 + 独立复现原则 + 对照基线 C-1~C-14）
> **前置依赖**: `validate.md` · 本叶 `spec.md` · 本叶 `review.md` / `review-report.md`（R1：有条件通过、本叶 **0 阻塞**；F-01 跨叶缺陷 + I-01~I-10）· `build.md` v1.2（修复轮 R2）· v3-1 先例
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-16
> **验证轮次**: **R1**（HEAD `a22bfb8`，`phase=reviewed` → 本轮推进 `validated`）
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-16
> **更新说明**: 初始创建（R1 全量独立验证：F-01 独立证伪 + 元门禁三条规则独立触红 + 自写密度口径 21 格 + 自写 fail-closed 探针 + 回执重拉消息计数 + 台账自写审计 + 门禁串行复跑；含**新发现 N-01~N-13**）

---

## 1. 验证概要

| 维度 | 数值 |
|------|:--:|
| 验证项总数 | **18**（V1~V18） |
| 通过 | **15** |
| 有条件通过（含独立发现） | **2**（V3 / V17：元门禁可 FAIL 成立，但发现 3 处覆盖盲区） |
| 无法执行 | **1**（V16 人工面 → `⏳ 未执行`，不计入 PASS） |
| 阻塞问题 | **0** |
| FR 覆盖 | **13 / 13 = 100%**（其中 **9 条由我的独立探针直接复现**，4 条为「我复跑被验证方门禁」级） |
| NFR 覆盖 | **12 / 13 = 92%** 门禁级（其中 9 条独立复现；NFR-V3-009/010/011 的 **L1 展开态** 主题/溢出无独立探针 → 依赖门禁）；NFR-V3-015 人工面 ⏳ |
| EC 覆盖 | EC-V3-001 / 006 / 007 / 011 / 013 / 014 / 015 |
| 独立发现的新问题 | **13 条**（N-01~N-13；**无一项推翻本叶核心结论**） |

### 🔴 一句话结论

**⚠️ 有条件通过（0 阻塞）** —— 本叶**全部核心声称经我独立复现成立**（F-01 修复**真的**让门禁可 FAIL：我自建副本强制必红 → `EXIT=1` 且诊断真落盘、还原 → `PASS 192 / EXIT=0`；密度三档 × 三视口用**我自己写的口径**逐格等于声称值；fail-closed 五维 + **12 次不确定场景实测**（10 类）**全部阻断**且**未找到绕过路径**；台账无未覆盖删除行）。唯一需要跟进的是**新发现的元门禁自身覆盖盲区**（N-01~N-03：R1a 可被「中间语句」绕过、R1b 可被**注释**满足、R3 只查第一处 `send()`）以及**引用能力尚未接线到生产路径**（N-06：`setEnv` / `dispatchRefAction` 当前**唯一调用点是测试 seam**，须由 v3-4 承接两处接线）。

---

## 2. 逐项验证结果（V1~V18）

| # | 验证对象 | 验证步骤（摘要） | 预期结果 | 实测结果 | 判定 |
|---|---------|---------|---------|---------|:--:|
| **V1** | 13 条门禁串行复跑 + 计数 | 一次一个 Chromium；全量日志落盘 | 13/13 `exit=0`；计数 == 登记 | **13/13 `exit=0`**；`760/760/0 · 11/11/0 · 127/0 · 157/0 · 99/0 · 167 · 108 · 192 · 24 · e2e PASS · 6/6/0`（逐格 == 声称） | ✅ |
| **V2** | **F-01 独立证伪** | 自建 `/tmp` 副本注入 1 条必红断言 → 采集退出码 + 诊断落盘；还原（sha256 逐字）→ 复跑 | ① `EXIT != 0` + 诊断文件字节 > 0；② `192 PASS / EXIT=0` | ① **`EXIT=1`**、`binding FAILED (1)`、诊断 **976 B** 落盘且摘要含 `ERR:CDP socket not open (readyState=3)`（正是 F-01 的挂死条件）；② 副本 sha256 `62e5ad0d…` == 仓库文件 → **`PASS 192 / ✖ 0 / EXIT=0`**、无诊断文件 | ✅ |
| **V3** | **元门禁三条规则独立触红** | 自建副本分别注入 ①`await` 挡在退出码赋值前 ②`send()` 无 `setTimeout` ③失败计数与退出码脱钩 → `SDC_GATES_ROOT` 指向副本 → 元门禁必须红；还原 → 必须绿 | 3/3 红 + 还原 3/3 绿 | ① `exit=1` `[R1a] binding.mjs:2337` ② `exit=1` `[R3] _v3-helpers.mjs` ③ `exit=1` `[R2] journey.mjs`；真实根 `exit=0`、原始副本 `exit=0`；**但另发现 3 处覆盖盲区（N-01~N-03）** | ⚠️ |
| **V4** | L1 八类 ≤1 次交互 + 入口复用 + 默认档预算 | 自写探针：枚举 8 面板 → 逐类在 3 个 L0 候选中**自行发现**单次点击入口 → 默认档自测可点清单 | 8/8 恰一个候选可一次展开；可点 == 7 且无 L1 触发器 | **8/8 命中且各恰 1 个候选**（①④⑤⑥⑦←`#l0-status-band`；⑧②←`#l0-more`；③←`#l0-ref-toggle`，其余候选均无效）；默认档 **可点 = 7**（`#l0-status-band` / 2 个推荐选项 / `#l0-pick` / `#l0-more` / `#l0-ref-toggle` / `#l0-statusbar`），**清单内无任何 L1 触发器**；8 面板默认全 `hidden`；触发器文字非空 + `data-count` 为数字 + `aria-controls` 成对 | ✅ |
| **V5** | 五维 + 不确定即失效 | 自写探针逐维注入 + 10 类不确定场景（12 次实测） | 五维 `invalid`（维度命中、原因逐字）；不确定一律 `unknown` 且阻断 | **D1 `dom-gone` / D2 `origin-changed` / D3 `navigated`（docId 与 navSeq 各一）/ D4 `declaration-changed`（hash 与 version 各一）/ D5 `authorization-revoked` = 7/7 `invalid`**，原因与模板逐字一致；**12 次不确定场景实测全部 `unknown` 且阻断**（10 类场景：缺 selector / 缺 documentId / 缺 env 的 origin / 缺 env 的 authorized / 无 resolution / `unreachable` / `ambiguous` 状态 / `nodeCount=2` / `refMark` 不符 / 新建引用默认态；其中「缺 env 授权状态」「缺 documentId」两类各以两种构造各测一次，两次均 `unknown`） | ✅ |
| **V6** | 阻断不可绕过 | ① 失效态**穷举点击** 6 区域全部可见控件（**41 个**，含两条恢复入口 / `confirm-allow/deny` / `revoke` / `rebind`）→ 观测 `commandSends`；② 单入口静态核对 | 计数增量 0；唯一放行点确证 | ① `sends 0 → 0`，判定仍为 `invalid`，`stale=1`（**41 个控件无一放行**）；② `isRefUsable` 全仓**唯一**调用点 = `panels.ts:351`，`store.dispatch` **唯一**调用点 = `panels.ts:362`，`isRefUsable` 仅 `=== 'valid'` 放行；`reset()` 全部调用点均在 `installV3TestHooks()` 内（生产不可达） | ✅ |
| **V7** | 两条恢复路径 + 不静默丢弃 + id 不重用 | 失效态点「重新拾取」/「改用描述」；`reset()` 前后新建引用 | 新 id + `valid` + `stale=0`；旧记录保留；id 不重用 | 「重新拾取」→ `ref_23`（≠ `ref_22`）`valid`、`stale=0`；**旧记录 `ref_22` 仍在**（带可读原因）；「改用描述」→ 既有 `#ask-fallback` 可见（无新输入框）；`reset()` 后新建 = `ref_24`（**id 单调、跨 reset 不重用**） | ✅ |
| **V8** | 回执三件套 + 重拉为真 + 审计出口 | 连续两次 `pullReceipt`；**包装 `chrome.runtime.sendMessage` 计数 `insight-tree` 往返**；不存在工具名检验；零明文；点审计出口 | `refreshSeq` 1→2 且**真重拉**；三件齐备；L2 宿主可达 | `refreshSeq` **1 → 2**；**`insight-tree` 运行时消息 0 → 1**（证明是真重拉，而非自增计数器自证）；`tool='__definitely_absent_tool__'` → 「已不在工具面（deriveTools）」（证明证据取自已拉取的实时工具面）；`pieces = {summary:true, evidence:true, audit:true}`；L0 摘要常驻（`hidden=false` + 非空）；证据 8 行白名单；目标摘要 **去 query**（`…/x`）；点 `#l1-receipt-audit` → `#view-host.hidden false`、`#l2-entry-audit` 存在 | ✅ |
| **V9** | 密度 3 档 × 3 视口（自写口径） | 自写 C1~C4 + 自写夹具驱动，21 格逐格测量 + 幂等 + 稳态锚点 | 与登记值逐格相等 | **default `7/7·7/15·19·6`（chars 223）× 320/400/520 三格全等**；**firstRun `7/9·12/20·25·6`（387）三格全等**；risk 5 子场景 × 3 视口 15 格逐格 == 登记（`unauthorized 7/13·428` / `probing 7/8·253` / `hardline 7/8·249` / `confirm 9/8·272` / `staleRef 7/8·254`）；**worst `9/17·13/35·25·6`（428）**；每格两次测量幂等；稳态锚点 `#notice` 存在且长 29 | ✅ |
| **V10** | 风险位常驻（含 `staleRef` 本维） | 5 类 × 3 视口 → 自写可见性判据 | 15/15 常驻可见、三通道齐备 | **15/15 `ok=true`**（无 hidden 祖先、无折叠祖先、矩形完整落在视口内、文字+徽标+图标齐备、`visibility:visible`/`opacity:1`）；`#risk-rail` 自身不在任何 `[data-l1-panel]` 内 | ✅ |
| **V11** | 体积裁决合规 + 归因复现 | ① 搜索 cap 判定型用法 ② 纯函数反向守卫 ③ 实测产物 ④ 自跑 `size:attribution` | cap 纯记录；产物 ≤ ceiling；归因逐行一致 | ① `SIDEPANEL_CEILING_CAP*` 命中项**全部**为注释或「断言其不参与判定」（`ceilingCapRole==='record-only'`），`evaluateSidepanelSize()` **无 cap 形参**；② `344,062 → ok`、**`344,063 → 不 ok`**、**`306,100（cap+1）→ ok`**（cap 不在判定中）；③ `327,679 == 登记 == 实测 ≤ 344,062`；④ 自跑归因：`Δ=32,454`、`Σ per-module=+32,224`、未归因 230、新必需 **26,156 = 80.60%**、接线 5,848 = 18.0%、位移 220（逐行与登记表一致） | ✅ |
| **V12** | 零改动红线 | sha256 / stat / git diff | 全部逐字不变 | `dist/content.js` **177,076 / `52a82620…`**；`src/content/*` 三 hash = pin；`policy` `bfcb2ede…` / `auto-authorize` `1096d065…`；`manifest.json` `57e6407e…` **零 diff** + `contextMenus` **0** 命中；阈值逐字 `7/15 · 9/20 · 17/35`；`package.json` 依赖段零 diff；`#composer hidden`；本叶 **0 新增输入控件** | ✅ |
| **V13** | 取代台账逐行审计（自写 python） | `git diff -U0 c2c0e0d..HEAD` 逐行复算 | 无未覆盖删除行 / 无失真条目 / hash 复原 | `zeroDiffFiles` **9/9 真 0 行 diff**；`pureAdditionFiles` **9/9 真 `+N/−0`**（`hardening.mjs` **+16/−0**、`e2e/fullchain.mjs` **+16/−0**）；删除行逐行命中：`insight-archive 8` / `insight-tree-hierarchy 16` / `size-baseline 12` / `size-budget 31` / `insight.mjs 5` → **未覆盖 0**；`newTitle` 全部可定位、`oldTitle` 全部已消失；`protectedRanges` **hash + 起始字节偏移均复原**；**未登记却被修改的受保护区间 = 0** | ✅ |
| **V14** | 构建可交付与可重复 | 连续两次 `npm run build`；`typecheck` | 字节稳定、`typecheck 0` | `sidepanel.js` **327,679 → 327,679**（字节稳定）；`content.js` 稳定 **177,076 / `52a82620…`**；`sidepanel.js` sha256 因**构建戳**变化（`5efb6d9e…` → `ec5eda6e…`，字节不变）—— 与「体积登记 pin 字节、不 pin hash」的设计一致；`typecheck exit=0` | ✅ |
| **V15** | 文档数字漂移 | 逐项对照 `build.md` / `state.json` / 台账 / 基线 | 声明 == 实测 | **全部一致**：`760 · 11 · 127 · 157 · 99 · 167 · 108 · 192 · 24 · 6 · e2e PASS · 177,076 · 327,679 · 344,062 · +22.96% · 22 格 · 495≥488 · 32,454/26,156/5,848/220/230 · 80.6%`；R2 的四处订正（I-03 spec NFR-V3-005 / I-04 `build-info 207→212` / I-05 修改文件 17 / I-06 登记册 note+feature）**均已落盘**；仅余 1 处文档时点差（N-10） | ✅ |
| **V16** | 人工面如实登记 | 核对清单二值性 | 逐项「未执行」 | 展开动画体感 / 引用高亮体感 / 读屏真实体感 = **`⏳ 未执行`**（build.md §3.2 + state.json 一致，未冒充 PASS） | ⏭️ |
| **V17** | 元门禁受审集合完整性 + 自身强度 | 打印真实集合；合成源码驱动 `auditGateSource` 找盲区 | 集合 = 8 + 2；盲区必须登记 | 集合确证 = **8 个 Chromium 门禁 + `l1-reverse.mjs` + `_v3-helpers.mjs`**；`STATIC_ONLY_GATES` 6 个（动态反证仅 binding/l1）与声称一致；**成员断言近乎恒真**（`AUDITED_FILES` 由 `CHROMIUM_GATES` 派生）→ 新增第 9 个门禁不会被要求入集合（N-12）；合成用例证得 **3 类盲区**（N-01~N-03） | ⚠️ |
| **V18** | 验证纪律 | git 状态前后 / HEAD / main / 探针路径 | 未改源码测试文档、未 commit、main 未动 | HEAD **`a22bfb8`** 未变；`main == origin/main == 2ddc9229…`；验证期间 `git status --porcelain` 为空（`dist/**` 与 `dist-test/**` gitignored）；**未** `git add`/`commit`/`push`；探针全部在 `/tmp/opencode/v3-validate-v32/`；本轮新增产物仅 `validate.md` / `validate-report.md` + `state.json` 推进（见 §7 披露） | ✅ |

---

## 3. 验证详细信息

### 3.1 测试覆盖

#### (a) 门禁串行复跑原文（**我自己的**运行，严格一次一个 Chromium）

```text
$ bash /tmp/opencode/v3-validate-v32/run-gates.sh      # cwd = packages/web-cli-plugin
01-typecheck           exit=0  elapsed=10s
02-build               exit=0  elapsed=5s
03-npm-test            exit=0  elapsed=72s
04-supersession        exit=0  elapsed=2s
05-density             exit=0  elapsed=125s
06-l0                  exit=0  elapsed=23s
07-l1                  exit=0  elapsed=14s
08-ui-journey          exit=0  elapsed=37s
09-insight             exit=0  elapsed=17s
10-binding             exit=0  elapsed=175s
11-hardening           exit=0  elapsed=80s
12-e2e                 exit=0  elapsed=44s
13-gate-integrity      exit=0  elapsed=0s
（日志：/tmp/opencode/v3-validate-v32/{01..13}-*.log；完整未截断）
```

计数摘录（逐份日志尾）：

| 门禁 | 我的实测 | 登记声称 | 一致？ |
|------|---------|---------|:--:|
| `npm test` | `ℹ tests 760 / pass 760 / fail 0 / skipped 0` | 760 | ✅ |
| `test:supersession` | `tests 11 / pass 11 / fail 0` | 11 | ✅ |
| `test:density` | `127 passed / 0 failed` + `F 22 个登记格实测 == 基线登记值` + `几何下界 495 ≥ 488` + `产物 327,679 ≤ 344,062` | 127 | ✅ |
| `test:l0` | `157 passed / 0 failed` | 157 | ✅ |
| `test:l1` | `99 passed / 0 failed` | 99 | ✅ |
| `test:ui`（journey） | `167 assertions` | 167 | ✅ |
| `test:insight` | `108 assertions` | 108 | ✅ |
| `test:binding` | `192 assertions` | 192 | ✅ |
| `test:hardening` | `24 assertions` | 24 | ✅ |
| `test:e2e` | `R8 E2E PASS` | PASS | ✅ |
| `test:gate-integrity` | `tests 6 / pass 6 / fail 0` | 6 | ✅ |

#### (b) FR 覆盖（13 / 13 = 100%）

| 需求 | spec 关注点 | 验证证据 | 覆盖 | 独立复现？ |
|------|-----------|---------|:--:|:--:|
| FR-V3-030 | 展开不遮挡 L0（几何 + 交面积 0 + 单一滚动容器） | V1 `07-l1.log`（`②` 段 rail/card 在视口内 + 交面积 0） | ✅ | 门禁级 |
| FR-V3-031 | 8 类**逐类** ≤1 次交互 | **V4 自写探针**（8/8 单次点击可达，入口自行发现） | ✅ | **是** |
| FR-V3-032 | 「会发生/不会发生」两段必填 + 破坏性不可逆声明 | V1 `07-l1.log`（`③` 4 选项 → 4 块两段全 true；破坏性项显式声明） | ✅ | 门禁级 |
| FR-V3-033 | 证据四要素齐备 + 证据层只读（写入控件 0） | V1 `07-l1.log`（`⑪` 四要素 + `#l1-ref-rows` 内控件 0） | ✅ | 门禁级 |
| FR-V3-034 | 局部树 ≤3 + 父链 + 全局树入口 | V1 `07-l1.log`（`⑪` `count ≤ 3` + `#l1-local-tree-global` 存在） | ✅ | 门禁级 |
| FR-V3-035 | 「已决策 N 步」N 可复算 + 回看零副作用 | V1 `07-l1.log`（`⑪` 1→2 与 `rounds.length` 一致、展开前后 `refs` 逐字不变） | ✅ | 门禁级 |
| FR-V3-036 | 五维逐一可注入 + 不确定即失效 + 判定在侧栏侧 | **V5 自写探针**（7/7 `invalid` 维度命中 + 12/12 `unknown`）；判定模块零 `chrome.*`/`document`（V1 `04/03` + 源码只读） | ✅ | **是** |
| FR-V3-037 | 失效进常驻风险位 + 可读原因指维 + 阻断 + 不静默 | **V5/V6/V10**（原因逐字 + 15/15 常驻 + 41 控件穷举零放行 + 旧记录保留） | ✅ | **是** |
| FR-V3-038 | 两条恢复路径（≤1 次交互）+ 走既有兜底输入 | **V7** | ✅ | **是** |
| FR-V3-039 | 回执三件套逐件可达 | **V8**（`pieces` 全 true + L0 摘要常驻 + 审计出口到 L2 宿主） | ✅ | **是** |
| FR-V3-040 | 入口遍历断言（文字非空 + 摘要/计数非空） | **V4**（8 触发器文字 + `data-count` 数字 + `aria-controls`） | ✅ | **是** |
| FR-V3-071 | 引用 id 四处贯穿同一 `ref_<n>` | **V5/V7**（chip 文案「引用 1 条」↔ 风险行「引用 2 的目标元素…」同序号；单源 `ref_<seq>`） | ✅ | **是** |
| FR-V3-012 | 末项兜底输入复用 | **V7**（`#ask-fallback` 可见，无新输入框） | ✅ | **是** |

#### (c) NFR 覆盖（12 / 13 = 92% 门禁级）

| NFR | 关注点 | 证据 | 覆盖 |
|-----|-------|------|:--:|
| NFR-V3-001 / 002 | L0 默认态密度仍达标、不新增口径 | **V9/V10 自写口径 21 格逐格 == 登记** | ✅ 独立 |
| NFR-V3-005 | `sidepanel.js` 体积（裁决 V3-VOL-1） | **V11**（纯记录 cap + 公式 ceiling + 归因复现） | ✅ 独立 |
| NFR-V3-008 / 016 | 只读投影 / 零审计明文 / URL 去参 | **V8**（目标摘要去 query、证据 8 行白名单、证据层零控件） | ✅ 独立 |
| NFR-V3-009 / 010 / 011 | 明暗双主题 / 320–560px 零水平溢出 / 无障碍 | V1（`test:l0` 157 + `test:l1` 99 + `test:insight` 108 复跑通过内含主题/溢出/ARIA）；**L1 展开态的独立主题/溢出探针未做** | ⚠️ 门禁级 |
| NFR-V3-012 / 013 / 014 | 门禁串行 + 日志完整 + **能真 FAIL** + 计数不减 | **V1/V2/V3**（串行 13/13 `exit=0`；F-01 独立证伪；元门禁 3 规则独立触红） | ✅ 独立 |
| NFR-V3-015 | 人工面如实登记 | **V16** `⏳ 未执行` | ⏭️ |
| NFR-V3-018 | 冻结用 sha256 内容 pin | **V12**（逐字命中） | ✅ 独立 |

### 3.2 接口数据（产品 seam 契约实测）

| 检查项 | 期望（spec/口径） | 我的实测 | 一致？ |
|--------|------------------|---------|:--:|
| 判定三态 | `valid` 是唯一放行值 | `isRefUsable` 仅 `=== 'valid'`；`store.dispatch` 首句即 guard | ✅ |
| 五维判定顺序 | 固定且文档化（事实 → env → D2 → D5 → D3 → D4 → D1） | 逐维注入的 `dimension` 字段与之一致（`D4` 两种子情形均落 `declaration-changed`） | ✅ |
| `unknown` 5 类原因 | `missing-fact` / `env-unavailable` / `page-unreachable` / `ambiguous` / `replaced` | 12 个场景各自命中 5 类原因，文案与 `UNKNOWN_CAUSE_TEXT` 逐字一致 | ✅ |
| 阻断返回 | `{allowed:false, sent:false, reason}` | 失效/未知 19 例全部 `allowed=false` + `sendsDelta=0`；有效对照 `sendsDelta=1` | ✅ |
| 两条恢复路径 | 「重新拾取」新 id；「改用描述」走既有兜底 | `repickId=ref_23 ≠ ref_22`；`#ask-fallback.hidden=false` | ✅ |
| 回执三件套 | 摘要（L0 常驻）+ 证据（L1）+ 审计出口 | `pieces={summary,evidence,audit}` 全 true；`#l0-receipt-summary.hidden=false` | ✅ |
| **重拉为真** | 证据来自真实重拉 | **`insight-tree` 后台消息计数 `0 → 1`**（每调一次 `pullReceipt` 恰增 1）；不存在工具名 → 「已不在工具面」 | ✅ |
| 审计出口 | 可达 L2 审计视图 | 点 `#l1-receipt-audit` → `#l2-entry-audit` 存在且 `#view-host.hidden === false` | ✅ |
| L1 入口复用 | 只用既有 3 个 L0 披露 | 三个入口 = `#l0-status-band` / `#l0-ref-toggle` / `#l0-more`；本叶新增的 `#l0-*` id（`l0-receipt-summary`、`l0-ref-badge`）**非控件**（div/span，无 `tabindex`），默认档不计入可点 | ✅ |

### 3.3 构建脚本

| 命令 | 退出码 | 耗时 | 输出摘要 | 结果 |
|------|:--:|:--:|---------|:--:|
| `npm run typecheck` | 0 | 10s | `tsc --noEmit` 零错误 | ✅ |
| `npm run build` | 0 | 5s | `content.js 177,076` · `sidepanel.js 327,679` | ✅ |
| `npm run build`（第二次） | 0 | 5s | 字节不变（`327,679`），仅构建戳变化 | ✅ |
| `npm run test:supersession` | 0 | 2s | 11/11，逐行判据 + `protectedRanges` hash + `zeroDiffFiles` | ✅ |
| `npm run size:attribution -- --rev cf2af32 --rev 615bd0f` | 0 | ~2min | `Δ=32,454` / `+32,224` / 未归因 230（逐行与登记表一致） | ✅ |

### 3.4 性能边界

| 指标 | 要求 | 我的实测 | 达标？ |
|------|------|---------|:--:|
| default 密度（3 视口） | C1 ≤ 7 · C2 ≤ 15 | `7 / 7 / 7` · `7 / 7 / 7`（chars 223） | ✅ |
| firstRun 密度（3 视口） | C1 ≤ 9 · C2 ≤ 20 | `7` · `12`（chars 387） | ✅ |
| risk 最差（15 格 worst） | C1 ≤ 17 · C2 ≤ 35 | `9` · `13`（chars 428，C3 25 / C4 6） | ✅ |
| 22 个登记格 | 实测 == 登记 | 零漂移（我的 21 格 + `#notice` 稳态锚点全部一致） | ✅ |
| 风险位常驻 | 5 类 × 3 视口全可见 | `15/15 ok` | ✅ |
| 几何下界（`#log` clientHeight） | ≥ 488px | 门禁实测 **495px**（我复跑同值） | ✅ |
| 体积 | `sidepanel.js ≤ 344,062` | **327,679**（`344,063 → FAIL` 反向守卫成立） | ✅ |
| 退出码传播（F-01） | 失败 ⇒ 非 0 | **`EXIT=1`**（副本强制必红）；还原 `EXIT=0` | ✅ |

### 3.5 漂移检测

| 漂移类型 | 检测方法 | 结果 |
|---------|---------|------|
| **孤立代码**（有代码无需求） | 新增 5 个 `l1/*` 模块 ↔ FR-V3-030~040 逐条回映（函数/常量级） | ✅ 无孤立代码；但发现 **2 处未接线 seam**（N-06：`setEnv` / `dispatchRefAction` 唯一调用点在测试 seam） |
| **需求缺失**（有需求无代码） | FR-V3-030~040 + 071 + 012 逐条回代码定位 | ✅ 无缺失（13/13 有可执行断言） |
| **规格漂移**（spec/登记册被改） | `spec.md` NFR-V3-005 与裁决后值比对；`docs/v3-density-baseline.json#volume` 与 `volumeBaselineSeparation.note` 自洽性；台账 `newTitle/oldTitle` | ✅ **本叶 R2 的四处订正均已落盘且自洽**（spec 以 `~~旧值~~ → 新值` 显式保留历史；登记册 `feature` 字段与 note 已订正；`build-info 207→212` 与我的归因复现一致；`build.md §1` 修改文件 = 17）；仅余 1 处**时点差**：`review-report.md §5 第 11 条 ①`（R1 时点产物）仍描述「spec 未随裁决更新」，该问题已在 R2 修复（N-10） |

---

## 4. 验证脚本执行记录

> ADR-003 落地：以下脚本由 **validate Agent 自主编写并直接执行**（不走 task→build 流程）。
> 路径约定：本轮按编排器指定使用 **`/tmp/opencode/v3-validate-v32/`**（等价于模板的 `/tmp/sddu-validate-<feature>-<ts>/`，**不入版本库**）。

| 脚本文件 | 用途 | 对应场景 | 退出码 | 关键输出 |
|---------|------|:--:|:--:|---------|
| `run-gates.sh` | 13 条门禁**严格串行**复跑（一次一个 Chromium），全量日志落盘 + 退出码/耗时表 | V1 | 0（全绿） | `01..13 exit=0`；计数表见 §3.1(a) |
| `meta-probe.sh` | 元门禁独立触红：自建副本注入 R1a/R3/R2 三形态 + 覆盖盲区探针 + 还原核对（`SDC_GATES_ROOT`） | V3 / V17 | 0（脚本本身）；被测元门禁 `caseA/B/C exit=1`、`baseline/E exit=0` | `meta-caseA-r1a.log`（`[R1a] binding.mjs:2337`）、`meta-caseB-r3.log`（`[R3]`）、`meta-caseC-r2.log`（`[R2]`）、`meta-caseF-gap2.log`（**6/6 PASS，盲区确证**）、`meta-caseG-comment.log`（**6/6 PASS，盲区确证**） |
| `my-probe.mjs` | **自写 CDP 客户端 + 自写 C1~C4 测量实现 + 自写夹具驱动**：密度 21 格、L1 八类入口自行发现、默认档可点清单、fail-closed（五维 + 不确定 + 阻断 + 恢复 + id）、回执、风险位 15 格 | V4 / V5 / V6 / V7 / V8 / V9 / V10 | 0（`MYPROBE_DONE`） | `my-probe.log`（`MYPROBE_JSON …`）；关键行：`[default@400] C1=7 C2=7(chars 223) C3=19 C4=6`、`[risk worst] {clickables:9,lines:13,blocks:25,regions:6,chars:428}`、`[bypass] … sends 0 -> 0`、`[identity] ref_22→ref_23→ref_24` |
| `mini-probe.mjs` | 补测：env 字段缺失的 `unknown` + **`insight-tree` 消息计数证明「重拉为真」** + `pieces`/L0 摘要 | V5（补）/ V8（补） | 0（`MINI_DONE`） | `env-omits-authorized → unknown（阻断）`、`fact-documentId-empty → unknown（阻断）`、**`insight-tree messages 0 -> 1`**、`pieces {summary:true,evidence:true,audit:true}` |
| `f01-pkg/**`（自建副本 + 2 次运行） | F-01 独立证伪：副本注入必红断言 → 采集退出码 + 诊断落盘；还原 → 复跑 | V2 | ① 1 ② 0 | ① `f01-forced-red2.log`：`binding FAILED (1)` + `EXIT=1`；诊断 `f01-logs/binding-diagnostics-1789524907488.log` **976 B**，含 `ERR:CDP socket not open (readyState=3)`；② `f01-restored-pass2.log`：`binding PASS — 192 assertions` + `EXIT=0`（副本 sha256 `62e5ad0d…` 与仓库逐字相同） |
| 内联 python（台账审计） | 自写逐行台账复算（`git diff -U0` + 区间/标题覆盖 + hash 复算） | V13 | 0 | `uncovered_deletions: []`、`newTitle_missing: []`、`oldTitle_still_present: []`、`protectedRanges` hash+startByte 均 match |

---

## 5. 阻塞问题

| # | 位置 | 问题 | 对应 Vx | 修复建议 |
|---|------|------|:--:|---------|
| — | — | **阻塞问题 0 项** | — | — |

### 5.1 独立发现的新问题（非阻塞，分级）

| # | 级别 | 位置 | 问题（我的实测证据） | 建议修复 |
|---|:--:|------|------|---------|
| **N-01** | **中** | `test/gate-integrity.test.ts` R1a（`auditGateSource`） | **R1a 可被「中间语句」绕过**：它只检查 `process.exit*` 行的**紧邻上一行**是否为独立 `await`。我把 `process.exitCode = 1;` 删掉、在 `await dumpDiagnostics(…)` 与 `process.exit(1)` 之间插入一行 `console.error('（诊断返回）')`、并删除 `dumpDiagnostics` 的 15s 硬上限 → 元门禁 **6/6 PASS、`exit=0`**（`meta-caseF-gap2.log`），而该文件此刻正是「无界 await 挡在退出码之前」的 F-01 形态 | 改为**块级/窗口级**扫描：进入 `if (failures.length) {`（或任何 `FAILED (` 分支）后，要求「块内第一条 `await` 之前必须已出现 `process.exitCode = 1` / `process.exit(1)` / `finish()`」；或对 `EXIT_STATEMENT` 行向前扫整个块（不止 1 行） |
| **N-02** | **中** | 同上 R1b（`calleeIsSelfBounding`） | **R1b 可被注释满足**：删除 `dumpDiagnostics` 内真实的 `setTimeout(() => { process.exit(1) }, 15_000)`，仅留一行**注释**含 `setTimeout(() => { process.exit(1); }, 15_000);` → 元门禁 **6/6 PASS、`exit=0`**（`meta-caseG-comment.log`） | 先剥离注释（`//…` 与 `/*…*/`）再做 `calleeIsSelfBounding` 检测；并把 4000 字符窗口改为「函数体括号配平区间」 |
| **N-03** | 中低 | 同上 R3 | ① **只审计文件内第一处** `send(method, params` 的 1400 字符窗口 → 第二个无界 `send()` 实现完全不被发现（合成用例「first bounded + second unbounded」返回 `[]`）；② `addEventListener('close'…reject(` 是**文件级**正则 → 拒结**无关对象**也能满足（合成用例返回 `[]`） | ① `while ((at = source.indexOf('send(method, params', at+1)) >= 0)` 逐处检查；② 把 close 检查限定在「同一 client 作用域内存在 `pending` Map 且其 value 被 reject」 |
| **N-04** | **中** | `src/ui/sidepanel/l1/panels.ts:386`（`repick()`） | `repick()` **无条件硬编码** `resolution = { status: 'resolved', refMark: fresh.facts.refId, nodeCount: 1 }` —— 它**断言**「重拾成功」而不是**观测**它。当前无生产调用者（仅 `testing.l1('repick')`；UI 的「重新拾取」走 `#l0-pick` → v3-4），故不是当前缺陷；但若 v3-4 在真实捕获**失败**时调用它，会把失败伪造成 `valid`（**fail-open 面**） | 让 `repick(facts, resolution)` 由调用方传入真实观测（或明确改名/加注释「测试专用，生产须传 resolution」），并补一条断言禁止硬编码 `resolved` |
| **N-05** | 中低 | `src/ui/sidepanel/sidepanel.ts:447`（`testing.reset()`） | `reset()` 用 `setEnv({})`，而 `setEnv` 是**合并**语义 ⇒ **env 不会被清空**。我实测：先设过 `currentOrigin`，再「省略 `currentOrigin` + `reset()`」→ 该引用被判 **`valid` 且放行**（`mini-probe` 首轮 `env-omits-currentOrigin → valid`）。以 `reset()` 为前提写「env 缺失」类测试会被上一场景的 env 残留**掩盖**（我首轮两个用例即因此失真） | `reset()` 里显式清空（`setEnv` 增加 replace 变体或把各字段置 `undefined`）；并补一条门禁断言「env 清空后新建引用必须 `unknown`」 |
| **N-06** | 中低 | `src/ui/sidepanel/l1/panels.ts` + `sidepanel.ts` | **引用能力尚未接线到生产路径**：`setEnv` 的**唯一调用点**在 `installV3TestHooks()` 内（371/447/475 行）；`dispatchRefAction` 的**唯一调用点**是 `testing.l1('act')`（483 行）。即：真实产品今天没有任何地方注入 `currentOrigin/authorized/documentId/navSeq/declarationHash`，也没有「用引用发起动作」的入口 ⇒ 线上所有引用**恒为 `unknown`（被阻断）**。方向安全（fail-closed），且属本叶声明的边界（页面侧捕获归 v3-4），但**门禁绿灯覆盖的是测试 seam** | 在 **v3-4 spec** 把两件事写成硬性 AC：① 真实 env 注入点（origin / 授权 / documentId / navSeq / 声明 hash）；② 唯一的动作入口必须调用 `dispatchRefAction`（并在 v3-4 补运行时门禁） |
| **N-07** | 低 | `src/ui/sidepanel/l1/ref-validity.ts:124` | D4 仅**版本**变化时，可读原因渲染为「**站点声明已变化（decl-1 → decl-1）**」——模板只填 hash，用户看不出到底是 hash 还是 version 变了（我实测 `decl-version-only-change → invalid` 但原因 hash 前后相同） | `reasonFor` 增加 `declarationVersion` 占位（或改为「声明 hash/version 已变化」），并同步 pin 单测/门禁文案 |
| **N-08** | 低 | `src/ui/sidepanel/l1/panels.ts:375-387` | 退役（retire）记录的 `readableReason` **不冻结**：后续 `judge()` 会重写它。我实测 `ref_22` 的原因由「目标元素已不存在」变为「已被同类新元素替换（身份标记不匹配）」——记录**未丢弃**（满足「不得静默丢弃」），但原因被后来的判定覆盖，事后审计看到的原因不是当时那个 | 退役记录冻结最后一次失效原因（或在记录中保留 `reasonHistory`） |
| **N-09** | 低 | `l1/ref-validity.ts:233` | `resolution.status='resolved'` 且**缺** `nodeCount`、`refMark` 匹配 ⇒ 判 `valid`（设计如此：身份 = `data-wcli-ref` 标记；我实测 `resolved-without-nodeCount → valid`）。**非缺陷**，但该口径未在 spec 明写，v3-4 若以 `nodeCount` 为唯一判据会产生歧义 | 在 spec/口径处明写「身份判据 = `refMark` 相等；`nodeCount` 仅在给出且 ≠1 时判歧义」 |
| **N-10** | 低 | `build.md` §3/§5；`review-report.md` §5 第 11 条 | ① `build.md` 早期章节仍保留**建设轮**计数（`npm test 743` / `l1 88` / `density 124`），与 §9/§10 的最终值（760/99/127）并存，读者易误读；② `review-report.md §5-11 ①` 仍写「spec NFR-V3-005 未随裁决更新」，而该问题已由 R2 的 I-03 修复（R1 时点产物，未回填指针） | ① 早期章节加「建设轮口径」标注；② 在 review-report 末尾加一行「R2 已修复：I-03/I-04/I-05/I-06 均落盘」 |
| **N-11** | 低（方法论） | `test/ui/binding.mjs`（`cp(dist, extDir)` ×3） | 我最初把 `/tmp` 沙箱的 `dist` 做成**符号链接**，Node `cp()` 默认 `dereference` 会复制**链接本身** ⇒ 门禁对 `extDir/manifest.json` 的临时改写**穿透写回真实 `dist/manifest.json`**（我实测发生，导致第二轮 13 条断言失败；随后 `npm run build` + `git` 复核已复原，`dist/` 为 gitignored）。正常布局（真实目录）不受影响，我复跑的 `test:binding` 也是干净的 | `cp(dist, extDir, { recursive: true, dereference: true })` 或先 `realpath(dist)`；可在门禁内加一条「运行前后 `dist/manifest.json` sha256 不变」的自检 |
| **N-12** | 低 | `test/gate-integrity.test.ts` 测试 #0 | 「受审集合完整」断言**近乎恒真**：`AUDITED_FILES = [...CHROMIUM_GATES, …]` 是**派生**常量，故成员断言必然成立；真实强度只在「10 个文件存在」。若将来新增第 9 个 Chromium 门禁而忘记登记，元门禁**不会**报警 | 在测试 #0 中扫描 `test/ui/*.mjs` + `test/e2e/*.mjs`，断言「所有含 CDP `send(method, params` 或 `failures.push` 的脚本都在受审集合内」（集合由目录推导，不再由常量派生） |
| **N-13** | 信息（正面） | 基线 `default` 格 / 夹具 | 我独立复测确认：稳态 `#notice`（29 字符）**恒存在**，`default` 三视口逐项相等（`223/19/7`）—— 与登记一致，说明「夹具两遍法 + 稳态锚点」确有必要且有效；同时我把 `lines` 的 `⌈…⌉` 与 `⌊…⌋` 都算了（223/34 → 7 / 6），登记用的是 `⌈⌉`，口径一致 | 无需修复（记录用） |

---

## 6. 结论

**结论**: **⚠️ 有条件通过（0 阻塞）**

**指标达标矩阵**：

| 指标 | 要求 | 实测 | 达标？ |
|------|------|------|:--:|
| FR 测试覆盖 | 100% | **100%**（13/13；其中 9 条为独立探针复现） | ✅ |
| NFR 测试覆盖 | ≥ 80% | **92%**（12/13 门禁级；9 条独立复现；009/010/011 的 L1 展开态无独立探针） | ✅ |
| 构建退出码 | 0 | **0**（`typecheck` / `build` / 13 条门禁全 0） | ✅ |
| 阻塞问题数 | 0 | **0** | ✅ |
| 漂移项 | 0（严重） | **0 严重**；文档级时点差 1 处（N-10） | ✅ |
| 门禁可 FAIL（NFR-V3-013） | 必须能真红 | **F-01 独立证伪 `EXIT=1`**；元门禁 3/3 规则独立触红 | ✅ |
| 红线零改动 | 全部逐字不变 | `content.js 177,076/52a82620…`、三内容 hash、判定链两 hash、`manifest.json` 零 diff、阈值逐字、无新依赖、无常驻输入框 | ✅ |
| 人工面 | 如实登记 | 3 项 `⏳ 未执行`（不冒充 PASS） | ⏭️ |

**理由**：

1. **本叶核心声称 100% 经独立复现成立**：F-01 我用自己的副本独立证伪（强制必红 `EXIT=1` + 诊断 976 B 真落盘且捕获到 `readyState=3` 的 CLOSED socket —— 正是历史挂死条件；还原逐字 → `PASS 192 / EXIT=0`）；密度我用**自写口径**在 21 格逐格等于声称（`7/7·7/15·19·6`、`7/9·12/20·25·6`、worst `9/17·13/35·25·6`）；fail-closed 五维 + 12 次不确定场景实测**全部阻断**且 **41 控件穷举点击零放行**（未发现绕过路径）；台账自写 python 审计**无未覆盖删除行 / 无未登记修改**。
2. **唯一跟进面是新发现的元门禁自身盲区**（N-01~N-03）与**接线缺口**（N-06）：两者都**不推翻**本叶任何结论 —— N-01/N-02 证明的是「元门禁是启发式，不是结构保证」（F-01 的实际防线 `send()` 20s 超时 + close 拒结仍在，且 R1b 在我的第一次注入中**确实**抓住了缺陷）；N-06 属本叶声明内的边界（页面侧捕获归 v3-4），但必须在 v3-4 以硬性 AC 收敛。
3. 其余 10 项发现均为「覆盖强度 / 文案 / 文档时点 / 测试夹具健壮性」级，无一表现为实现偏差或红线被破。

**进入下一阶段判定**：本叶可视为**验证完成**（`phase=validated`）；N-01~N-03 建议作为元门禁加固项随 v3-3/v3-4 带入，N-06 必须写入 v3-4 spec。

---

## 7. 未能验证项（如实列出，不用推断填坑）

1. **人工面 3 项**（`⏳ 未执行`）：展开动画体感 / 引用高亮体感 / 读屏真实体感 —— headless 不可合成，与 build/state 登记一致，**不计入 PASS**。
2. **未被要求重跑的 `test:l1-reverse`**（用户清单未含）：该反证驱动会跑 8~9 次 Chromium（我按「一次一个、串行」纪律与时间预算选择不重复执行）；其结论我**仅以源码阅读 + 既有日志引用**看待（`l1-reverse.mjs` 确实注入 `dist/sidepanel.js|html` 并要求 `failRun.code !== 0`），**未作为我的独立证据**。等价替代：我用 `SDC_GATES_ROOT` 独立做了元门禁触红（V3），并用 `my-probe.mjs` 独立复现了 L1 八类与 fail-closed 行为。
3. **L1 展开态的明暗主题与 320–560px 零水平溢出**：无独立探针（依赖 `test:l0` / `test:l1` / `test:insight` 的既有守卫，且它们主要覆盖折叠态）→ NFR-V3-009/010/011 记为「门禁级」而非独立复现（与 review C17 的 ⚠️ 一致，未消散）。
4. **`FR-V3-032 / 033 / 034 / 035` 的产物级断言**为「我复跑被验证方门禁」级（`test:l1` 99/0），我**未**为其另写独立探针（用户清单未要求）；已在 §3.1(b) 逐条标注「门禁级」。
5. **两处跨叶协同面**：L2 审计视图**内容**（v3-3）、页面侧真实捕获与手势（v3-4）—— 本叶只到「入口可达 / 引用态可注入」。
6. **`docs/v3-density-baseline.json` 的叙述性字段**（`fixtureAsymmetry`、`measuredBy` 等）未逐字核对（非判定字段）。
7. **未复算 `state.json` 内 `staticCalibers` 的三种正则读数**（760/771/884）：仅核到运行期口径 `ℹ tests 760 / pass 760 / fail 0`（台账门禁在我复跑中 11/11 通过）。
8. **`sidepanel.js` 的 sha256 不可跨构建比对**（含构建戳）→ 我只验证了**字节数稳定**；跨构建 hash 一致性未验证（设计如此：体积登记 pin 字节）。

## 8. 纪律核验（如实披露本轮写入面）

```text
$ git rev-parse HEAD              → a22bfb83ff5f151ab920cd364d1ecf8b1a2b85bb（未变）
$ git rev-parse main origin/main   → 2ddc92299ad10cfe0ea2b65403243a45ce7fb041（同一、未动）
$ git status --porcelain           → 验证期间为空（仅本轮末尾新增 validate.md / validate-report.md + state.json 推进）
$ 未执行：git add / git commit / git push
$ 实验全部在 /tmp/opencode/v3-validate-v32/**（含自建副本、探针、日志）；未写入版本库
$ 未修改任何 src/** · test/** · docs/** · *.json 配置文件
$ 例外（按协议）：state.json 由本阶段推进 phase → validated + 登记 files.validate / files.validationReport（工具 sddu_update_state 本会话不可见，故直接写文件并在此披露）
$ TREE.md 目录导航**未更新**（本轮边界禁止改文档）→ 待编排器或 sddu-tree 步骤补：新增 validate.md / validate-report.md 两行 + Phase → validated
```

**自我披露（方法论）**：我最初把 `/tmp` 沙箱的 `dist` 做成符号链接，导致 `binding.mjs` 的临时 manifest 改写穿透写回真实 `dist/manifest.json`，第二轮因此出现 13 条**与产品无关**的失败（N-11）。我已用 `npm run build` 复原（`dist/manifest.json == manifest.json` 已复核为 `True`），并改用**真实目录副本**重做 F-01 两次运行，§3/§2-V2 的结论均取自修正后的运行。**未把该自伤结果当作缺陷登记为产品问题**。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1）：V1~V18 逐项结论 + 独立证据原文（门禁串行链 13/13、F-01 副本证伪 `EXIT=1`+诊断落盘、元门禁 3 规则独立触红 + 3 处盲区、自写口径密度 21 格、fail-closed 12 次不确定场景实测 + 41 控件穷举、`insight-tree` 消息计数证明重拉为真、台账自写逐行审计、体积归因复现）+ 阻塞 0 + 新发现 N-01~N-13 + 未验证项 8 条 + 纪律核验（含沙箱污染自披露与复原） | 2026-09-16 | SDDU Validate Agent |
