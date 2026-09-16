# 验证报告（验证策略）：specs-tree-v3-2-l1-disclosure-refs

> **文档定位**: SDDU 验证策略 — 指导 validate Agent 执行自主验证的场景和方法；验证结果见 `validate-report.md`（R1）
> **前置依赖**: 本叶 `spec.md` v1.0 · 父 `../spec.md`（§5.3 / §8.2 / §8.4 权威条文）· 本叶 `plan.md`（ADR-V3-020~024 + ADR-V3-001~012）· 本叶 `review.md` / `review-report.md`（R1：**有条件通过、本叶 0 阻塞**；F-01 跨叶真缺陷 + I-01~I-10）· `build.md` v1.2（修复轮 R2）· v3-1 先例（`../specs-tree-v3-1-l0-shell-density/{validate,validate-report}.md`）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-16
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-16
> **更新说明**: 初始创建：V1~V18 验证场景矩阵（**独立复现，不复用被验证方脚本作唯一证据**；探针只写 `/tmp/opencode/v3-validate-v32/`）

---

## 1. 验证概要

| 维度 | 数值 |
|------|:--:|
| 被验证 Feature 类型 | **代码类**（`src/ui/sidepanel/{l1,l0}/*` 产品代码 + 新门禁/元门禁 + 机读台账/基线/登记册）→ **全五维度验证** |
| 验证场景数 | **V1~V18**（18 条） |
| 覆盖 FR | FR-V3-030~040 + FR-V3-071 + FR-V3-012 = **13 / 13**（每 FR ≥ 1 Vx） |
| 覆盖 NFR | NFR-V3-001/002/005/008/009~016/018 = **12 / 13 门禁级**（9 条为本轮**独立复现**，3 条为「我复跑门禁」级）；NFR-V3-015 人工面 → `⏳ 未执行` |
| 覆盖 EC | EC-V3-001 / 006 / 007 / 011 / 013 / 014 / 015 |
| 验证维度覆盖 | 测试覆盖 · 接口/数据（产品 seam 契约）· 构建脚本 · 性能与边界 · 漂移检测（**五维度均 ≥1 条**） |
| 本轮轮次 | R1 |

**独立复现原则（本轮强制）**：

1. **自写测量实现**：密度 C1~C4 口径（`非 hidden 祖先子树 ∩ (BUTTON|A|INPUT|SELECT|TEXTAREA ∨ tabindex≠-1)`、`行 = ⌈字符数 ÷ 34⌉`、`区块 = 自身直接文本非空`、`分区 = 根一级非 hidden 子元素`）由我在 `/tmp/opencode/v3-validate-v32/my-probe.mjs` **独立重写**，**不 import** `test/ui/density-metrics.mjs`，也不调用其 `DENSITY_MEASURE_SOURCE`；风险位可见性探针亦自写。
2. **自写 CDP 客户端与夹具驱动**：探针自带 WebSocket CDP 客户端与夹具驱动（不 import `test/ui/_v3-helpers.mjs`）；只通过产品自身 seam（`window.__v3.testing.*` + `discover/authorize/state` 消息 + `chrome.storage`）驱动状态。
3. **被验证方的门禁照跑**（作为「它们自己说」的证据），但**结论只建立在我的独立复现上**；不一致时以我为准并深挖。
4. **反证必须独立重做**：F-01 用**我自己**的 `/tmp` 副本注入必红断言（不复用被验证方日志结论）；元门禁用 `SDC_GATES_ROOT` 指向**我自建副本**注入三条缺陷形态。
5. **不推断填坑**：Chromium 一次只跑一个；内存/环境不足而无法执行的项 → 如实登记 `⏭️ 未执行`，禁止冒充 PASS。

---

## 2. 自主验证场景（V1~V18）

**验证对象来源**：

- `spec.md`（本叶 §4 FR-V3-030~040 / §5 NFR / §6 EC / §7 验收锚点 AC-V3-008~025）+ 父 `../spec.md`（§5.3 引用失效 / §8.2 回执三件套 / §8.4 密度口径 + §9 体积裁决）
- `plan.md`（ADR-V3-020 判定纯函数 / ADR-V3-021 入口复用 / ADR-V3-023 引用 id 单源 / ADR-V3-024 折叠器复用；ADR-V3-001~012 架构约束）
- 实际产物：`src/ui/sidepanel/{l1/*,l0/*,sidepanel.ts,view-model.ts,disclosure.ts,index.html}` · `test/**` · `docs/v3-{supersession-ledger,density-baseline}.json` · `dist/{content,sidepanel}.js` · `manifest.json`
- **不采信**：`build.md` / `review-report.md` / `/tmp/opencode/v3-gate-logs/**` 的任何数字（仅作「待核对声称」清单，见 §3）

| # | 验证对象 | 验证步骤 | 预期结果 | 验证维度 | 验证方法 |
|---|---------|---------|---------|:--:|:--:|
| **V1** | 门禁可执行性与计数（NFR-V3-012/013/014、AC-V3-011/012/013） | 严格串行（一次一个 Chromium）复跑 13 条门禁；逐份提取退出码 + 计数，与登记值逐项对照 | 13/13 `exit=0`；`npm test 760 · supersession 11 · density 127 · l0 157 · l1 99 · journey 167 · insight 108 · binding 192 · hardening 24 · gate-integrity 6 · e2e PASS` | 测试覆盖 | 自写串行 runner（全量日志落盘） |
| **V2** | **F-01 独立证伪**（NFR-V3-013、修复轮 R2 核心声称） | ① `/tmp` 副本注入 1 条必红断言 → 断言「退出码必须非 0」+「诊断真落盘（文件存在且字节 > 0）」；② 还原（sha256 逐字）→ PASS 192 / `exit=0` | ① `EXIT=1` + 诊断文件字节 > 0 + 上下文摘要含 `CDP socket not open (readyState=3)`；② `192 PASS` / `EXIT=0` / 无诊断文件 | 测试覆盖 + 性能与边界 | 自建 `/tmp` 副本 + 真实 Chromium（我自己的两次运行） |
| **V3** | **元门禁可 FAIL 与虚绿核查**（NFR-V3-013、新增 `test/gate-integrity.test.ts`） | ① 三条形态分别注入我自建副本（`await` 挡在退出码前 / CDP `send()` 无超时 / 失败计数与退出码脱钩）→ `SDC_GATES_ROOT` 指向副本 → 元门禁必须红；② 每条还原 → 必须 PASS；③ 核查受审集合是否真含 8 门禁 + 2 驱动、成员断言强度、规则覆盖盲区 | ① 3/3 `exit=1` 且命中对应规则；② 还原后 `exit=0`；③ 集合 = 10 文件确证；④ **盲区须被证伪或如实登记** | 测试覆盖 | 自建副本注入 + `SDC_GATES_ROOT` 外证 + `auditGateSource` 微用例 |
| **V4** | **L1 八类 ≤1 次交互 + 入口复用 + 默认档预算**（FR-V3-031/040、ADR-V3-021、AC-V3-010） | 自写探针：① 枚举 8 个 `[data-l1-panel]` 是否默认全 `hidden`；② 逐类**自行发现**能一次点击展开它的入口（在 `#l0-status-band`/`#l0-ref-toggle`/`#l0-more` 三个候选中穷举）；③ 默认档自测可点元素清单与计数；④ 触发器文字/计数/ARIA | ①② 8/8 恰有 1 个候选一次点击展开且内容非空；③ 可点 = 7 且**不含任何 L1 触发器**；④ 文字非空 + `data-count` 为数字 + `aria-controls` 成对 | 接口/数据 + 漂移检测 | 自写 Chromium 探针（独立测量实现） |
| **V5** | **引用失效 fail-closed：五维 + 不确定**（FR-V3-036/037、EC-V3-001/014） | 自写探针逐维注入（D1 `missing` / D2 跨站 / D3 docId·navSeq / D4 hash·version / D5 撤权）+ 10 类不确定场景（**12 次实测**：缺事实 / 缺 env 字段 / 不可达 / 歧义 / 替换 / 新建引用默认态） | 五维逐一 `invalid` 且**维度命中** + 逐字可读原因；`unknown` 一律**阻断**；`valid` 仅在同一引用被确证时出现 | 接口/数据 + 测试覆盖 | 自写探针（产品 seam） |
| **V6** | **阻断不可绕过**（FR-V3-037、NG-V32-002） | ① 失效态下**穷举点击** 6 个区域的全部可见控件（含两条恢复入口/确认允许拒绝/撤销授权等），观测命令发送计数；② 静态+运行期核对「唯一放行点」；③ 核查是否存在未走判定的调用链 | 计数增量恒为 0；`isRefUsable` 唯一调用点 + `store.dispatch` 唯一调用点；无绕过路径 | 漂移检测 + 接口/数据 | 自写对抗探针 + 全仓 grep |
| **V7** | **两条恢复路径 + 不静默丢弃 + id 不重用**（FR-V3-038/012、EC-V3-001） | ① 失效态 → 点「重新拾取」→ 新 id、回到 `valid`、`stale=0`；② 「改用描述」→ 既有兜底输入可见（无新输入框）；③ 旧记录是否保留且带原因；④ `reset()` 前后新建引用 id 是否重用 | ① 新 id ≠ 旧 id 且 `valid`；② 走 `#ask-fallback`；③ 旧记录**保留**；④ id 单调不重用 | 接口/数据 | 自写探针 |
| **V8** | **回执三件套 + 重拉为真 + 审计出口**（FR-V3-039、NFR-V3-008/016） | ① 连续两次 `pullReceipt` → `refreshSeq` 单调；② **包装 `chrome.runtime.sendMessage` 计数 `insight-tree` 往返**，证明是被真重拉而非自增计数器；③ 用**不存在的工具名**检验证据是否来自实时工具面；④ 三件齐备 + L0 摘要常驻 + 证据行白名单 + 零明文（URL 去参）；⑤ 点 `#l1-receipt-audit` → L2 宿主可见 | ① 1→2；② `insight-tree` 计数 +1；③ 「已不在工具面」；④ `pieces = {summary,evidence,audit}` 全 true、目标摘要无 query；⑤ `#view-host` 可见 | 接口/数据 + 性能与边界 | 自写探针（含消息计数包装） |
| **V9** | **密度独立测量：3 档 × 3 视口**（NFR-V3-001/002、AC-V3-001~004、FR-V3-030） | 自写测量实现在真实产物上逐格测 default / firstRun / risk（5 子场景）3 档 × 320/400/520；与登记基线逐格对照 + 夹具幂等 + 稳态锚点 | default `7/7·7/15·19·6`（chars 223）；firstRun `7/9·12/20·25·6`（387）；risk worst `9/17·13/35·25·6`（428）；22 格零漂移 | 性能与边界 | 自写 Chromium 探针 |
| **V10** | **风险位常驻（本叶的 staleRef 维）**（AC-V3-008/009、FR-V3-037） | 5 类风险 × 3 视口强制注入 → 自写可见性判据（无 hidden 祖先 / 无折叠祖先 / 矩形在视口内 / 三通道文字+徽标+图标 / `visibility`·`opacity` 未被隐身） | 15 格全部「常驻可见」 | 性能与边界 | 自写探针 |
| **V11** | **体积裁决合规 + 归因可复现**（NFR-V3-005、裁决 V3-VOL-1） | ① 全文搜索 `SIDEPANEL_CEILING_CAP` 的**判定型**用法；② 纯函数反向守卫：`344,062 → ok`、`344,063 → 不 ok`、`306,100（cap+1）→ ok`；③ 实测产物字节 == 登记值 ≤ ceiling；④ **我自跑** `size:attribution` 复现逐模块表与占比 | ① 零判定用法（纯记录）；② 三条如述；③ `327,679 == 登记 ≤ 344,062`；④ 逐行一致、新必需模块 80.6% | 构建脚本 + 漂移检测 | 直接命令 + 纯函数调用 + 自跑归因工具 |
| **V12** | **零改动红线**（NFR-V3-018、父 plan 红线） | 独立 `sha256sum` / `stat` / `git diff`：`dist/content.js`、`src/content/**` 三 hash、判定链两 hash、`manifest.json` 零 diff 且无 `contextMenus`、密度阈值逐字、依赖段零 diff、主界面无常驻输入框与零新增输入控件 | 全部逐字不变 / 零 diff | 漂移检测 | 直接命令 |
| **V13** | **取代台账逐行审计**（AC-V3-011、NFR-V3-014） | 自写 python 审计（比门禁更严）：① `zeroDiffFiles` 真 0/0；② `pureAdditionFiles` 真 `+N/−0`；③ 每条删除行**按 base 行号**命中台账区间或 `oldTitle`；④ `newTitle` 可定位 / `oldTitle` 已消失；⑤ `protectedRanges` 字节 hash 与起始偏移独立复算；⑥ 有无**未登记却被修改**的受保护区间 | 无未覆盖删除行、无失真条目、hash 复原 | 漂移检测 | 自写 python + `git diff -U0` |
| **V14** | **构建可交付与可重复**（NFR-V3-005） | `npm run build` 连续两次：产物字节稳定、`content.js` 字节/hash 稳定、`sidepanel.js` 仅构建戳变化；`typecheck` 退出码；体积三线 | 字节稳定、`typecheck 0` | 构建脚本 | 直接命令 |
| **V15** | **文档/登记册数字漂移**（C36 类） | 把 `build.md` / `review-report.md` / `state.json` / 机读台账·基线里的每个数字与我的实测逐项对照 | 声明值 == 实测；不一致即登记（含方向） | 漂移检测 | 自写 python 对照 |
| **V16** | **人工面如实登记**（NFR-V3-015、AC-V3-025） | 读 spec/build/state 的人工面清单，核对是否二值（PASS / 未执行） | 逐项「⏳ 未执行」，不得冒充 PASS | 漂移检测 | 文档核对 |
| **V17** | **元门禁受审集合完整性 + 元门禁自身强度**（NFR-V3-013） | ① 打印真实 `CHROMIUM_GATES`/`AUDITED_FILES`/`STATIC_ONLY_GATES`；② 核查成员断言是否近乎恒真；③ 用合成源码驱动 `auditGateSource`，寻找规则盲区（多条 `send()` / 注释满足有界性 / 中间语句阻断 R1a） | 集合 = 8 + 2 确证；盲区**必须**被记录为已知限制 | 测试覆盖 + 漂移检测 | 直接 import 编译产物 + 合成用例 |
| **V18** | **验证纪律**（本轮边界） | `git status --porcelain` 前后、`git rev-parse HEAD/main`、探针路径、是否 `git add`/`commit` | 未改源码/测试/文档/配置；未 commit；`main` 未动；HEAD 不变；实验只在 `/tmp` | 漂移检测 | 直接命令 |

> **质量门槛自查**：FR 13 项 → V2/V4/V5/V6/V7/V8/V9/V10/V11 逐项覆盖（≥1 条/FR）；五维度各 ≥1（测试覆盖 V1/V2/V3/V17、接口数据 V4/V5/V6/V7/V8、构建 V11/V14、性能边界 V2/V8/V9/V10、漂移 V12/V13/V15/V16/V18）；不可验证项 = 人工面（V16，如实登记 ⏳，不计入 PASS）。

---

## 3. 逐项对照基线（被验证方声称的事实，**待独立核对**）

| # | 声称 | 来源 | 独立核对方式 |
|---|------|------|-------------|
| C-1 | 门禁 `760 / 11 / 127 / 157 / 99 / 167 / 108 / 192 / 24 / 6 / e2e PASS` | build.md §1/§10、state.json phaseNote | V1 自跑串行链 + 逐份计数 |
| C-2 | F-01 已修：强制变红 `EXIT=1`、还原 PASS 192 / `EXIT=0`、「诊断已落盘」修活 | build.md §10.2 | V2 自建副本证伪（不复用其日志） |
| C-3 | 元门禁 6/6 且**可 FAIL**（R1a/R1b/R2/R3） | build.md §10.3 | V3 / V17 自建副本注入 + 合成用例 |
| C-4 | 8 类 L1 各类 ≤1 次交互；只复用 3 个既有 L0 披露；默认档可点仍 ≤7 | build.md §1、review-report §4.4 | V4 自写探针（自行发现入口） |
| C-5 | 五维逐一 `invalid` + 「不确定即失效」；双层阻断；无绕过 | review-report §4.3 | V5 / V6 |
| C-6 | 两条恢复路径可用、新 id 不重用、不静默丢弃 | review-report §4.3 | V7 |
| C-7 | 回执三件套 + `refreshSeq` 对应**真实重拉**；审计出口到 L2 | review-report §4.5 | V8（消息往返计数） |
| C-8 | 密度三档 × 三视口全过、22 格零漂移（default `7/7·7/15·19·6`、firstRun `7/9·12/20·25·6`、risk worst `9/17·13/35·25·6`） | build.md §10、基线 json | V9 / V10 自写口径 |
| C-9 | `sidepanel.js` 327,679 == 实测 ≤ ceiling 344,062；cap 纯记录；归因「新必需 80.6%」 | 裁决 V3-VOL-1 / 基线 json | V11 |
| C-10 | 红线零改动：`content.js` 177,076 / `52a82620…`、三内容 hash、判定链两 hash、`manifest.json` 零 diff、阈值 `7/15·9/20·17/35`、无新依赖、无常驻输入框 | review-report §8 | V12 |
| C-11 | 台账 `V31-S1~S15` + `V32-S1~S17`；`zeroDiffFiles` 9；`pureAdditionFiles` 9（含 `hardening.mjs` / `e2e/fullchain.mjs` 各 +16/−0）；`protectedRanges` 字节 hash | 台账 json / build.md §10 | V13 自写 python |
| C-12 | I-01~I-08 / I-10 已修、**I-09 deferred**（无生产 reset 调用面） | build.md §10.4 | 逐条定点核对 + grep |
| C-13 | 元门禁对 6 个门禁**仅静态覆盖**（如实登记） | gate-integrity 文档 / build.md §10.3 | V17 |
| C-14 | 人工面 3 项 ⏳ 未执行 | build.md / state.json | V16 |

---

## 4. 验证执行纪律（本轮）

| 纪律 | 要求 | 落地 |
|------|------|------|
| 独立测量 | 自写口径实现，不 import 被测口径/驱动 | `my-probe.mjs`（自写 CDP + 自写 C1~C4 + 自写风险可见性） |
| 探针路径 | 只写 `/tmp/**`，**不入版本库** | `/tmp/opencode/v3-validate-v32/` |
| 反证可还原 | 逐字节复原 + sha256 复核 | F-01 用「副本注入 → 运行 → 换回原文件 → sha256 比对」；元门禁用「自建副本根」 |
| 门禁串行 | 一次只起一个 Chromium，**绝不并发** | V1 串行 runner + V2/V4~V10 各自独立串行；`grep`/`read` 等轻量静态操作与门禁互不干扰 |
| 不改产物 | 不修改源码/测试/文档/配置；不 `git add`/`commit`/`push`；不动 `main` | 仅 `dist/**`（gitignored）被 `npm run build` 重建；`state.json` 按协议推进并在报告中披露 |
| 不冒充 PASS | headless 不可合成项 + 未能复现项 → 如实登记 | V16 + §7 未验证项 |

---

## 5. 结论（策略侧）

**结论**: 策略已定稿，等待报告侧逐项执行 → 见 `validate-report.md` R1。

> **ADR-004 流程说明（如实披露）**：按 ADR-004，`validate.md` 应先产出并经用户确认，再执行 `validate-report.md`。本轮由编排器在**同一次指令**中显式要求「产出 `validate.md` + `validate-report.md`」并给出完整验证清单（即已预授权执行），故策略与报告在**同一轮**产出；策略矩阵在报告中逐项回填，二者可逐格互查。

## 6. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：V1~V18 自主验证场景矩阵（代码类 Feature → 全五维度）；独立复现原则（自写口径 + 自写 CDP/夹具驱动 + 独立反证 + 逐字节还原）；对照基线 C-1~C-14 | 2026-09-16 | SDDU Validate Agent |
