# 验证策略：specs-tree-v5-3-chrome-face（V5-3 授权 chip + 可拖动宽度 + 死端守护 + 法八机核；末叶 / 收口叶）

> **文档定位**: SDDU 验证策略 — 定义本叶的 V1~V9 验证场景与方法；逐项**实测**结果见 `validate-report.md`
> **前置依赖**: 本叶 `spec.md` v1.0（27 FR / 9 NFR / 10 EC / 13 AC）+ `review-report.md` v2.0（R2 结论 **✅ 通过**，HEAD `19c3beb` / 对照基线 `b0a679e` / leafBase `9b262ae`，残余 5 项观察）+ 本叶 `plan.md` v1.0 + 父 `../spec.md` §5.2/§5.3/§5.9/§5.11/§5.12/§5.13 + 父 `ADR-V5-006 / 007 / 009 / 010 / 011 / 012`（收口侧）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-22
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-22
> **更新说明**: 初始创建（对抗优先的 V1~V9 场景矩阵；策略先于报告产出。含 §0 review 建议的低风险订正清单）

---

## 0. 验证前置（review R2 的放行条件与低风险订正）

| # | 条件 | 状态 |
|---|------|:--:|
| P-1 | `review-report.md` 存在且状态 = `passed`（R2，0 阻塞 / 0 改进 / 5 观察） | ✅ |
| P-2 | 可执行环境：Node ≥ 20、`npx tsc`、`npm run build`、headless Chromium（`.pw-browsers/chromium-1234`） | ✅ |
| P-3 | 本叶基线 = leafBase `9b262ae`（v5-2 收口轮）；验证对象 = 工作树（reviewed HEAD `c4d157c` + 本轮订正） | ✅ |

### 0.1 review 建议的低风险订正（本轮一并落地并复验）

| # | 位置 | 订正 | 风险 | 复验 |
|---|------|------|:--:|------|
| **O-R2-1** | `test/ui/insight.mjs:1735`（`#I-20a3`） | `noteVisible` 补 `hidden !== true ∧ getClientRects().length > 0`（原判据只判「存在 ∧ 带指针 ∧ 文本匹配」；祖先 `hidden` 时节点仍 `isConnected` ⇒ 原判据在「未真正可见」时会通过） | 低 | `test:insight` 118/0（O-R2-1 强化后仍绿）；本轮对抗探针 V2 独立复算计算可见性 |
| **O-R2-2** | `src/ui/sidepanel/index.html:1275`（`#tree-drawer` 静态占位） | **删去与 `TREE_AUTH_POINTER_NOTE` 逐字相同的指针句**（同句两处字面量 → 单源化），保留极简占位 | 低 | `test:l0` 248/0（⑧ 非空摘要判据）、`test:insight` 118/0、`test:density` 242/0；`grep 本台账不复制状态值 src/ui/sidepanel/index.html` = 0 |
| **O-1** | `docs/v4-supersession-ledger.json#counts` | `currentRuntime` 前移（l0 216→248 / density 171→242 / insight 116→118 / journey 167→171 / nodeTestRuntime 947→1181 / stream 63→73 / supersession 33→36）+ `source` 同源日志 | 低 | `test:supersession` 36/0（含 counts↔日志同源机核）|
| **O-2** | `src/ui/sidepanel/l0/risk-rail.ts`（`RISK_COPY.unauthorized`） | 补「只可派生、禁止渲染」口径护栏 —— 走**类型位注释**（编译期擦除）⇒ **0 运行时字节**（非 minify 构建下普通注释会产生字节，故取等价 0 字节位置） | 低 | `npm run build` ⇒ `sidepanel.js` **547,558 B 不变**；`test:l0` 248/0 |
| **O-3** | `docs/v4-density-baseline.json#riskIncrementRegistry.reanchorV5.previousExpectation` | 追加 `narrativeCorrection`（只追加不改写历史；订正「R1 登记格」叙述笔误） | 低 | `test:density` 242/0 + `test:supersession` 36/0 |
| **滞后登记** | `tasks.json`（`TASK-V5-167~176` 缺 `status` + `meta.phase=tasked`）；父 `../state.json#childrens[v5-3].phase=specified` | 补齐 `status=completed` + `meta.phase=validated`；父子项 `phase/status` 前移 | 低 | 见 `validate-report.md` §4 |

---

## 1. 验证概要

| 维度 | 目标 | 达标线 |
|------|------|:--:|
| FR 测试覆盖 | 27/27 条承载 FR 各 ≥ 1 个 Vx 且实测通过 | 100% |
| NFR 测试覆盖 | 9/9（NFR-008 的读屏子面如实入人工面） | ≥ 80% |
| EC 边界覆盖 | 10/10 逐条有实测证据或如实标注 | ≥ 80% |
| 构建 | `npm run build` 退出码 0 ∧ 红线逐字节可复现 | 退出码 0 |
| 对抗红绿 | 注入/伪造必须**判红**，还原必须**判绿**（判据非恒真） | 0 空转 |
| 严重漂移 | 0 项 | 0 |
| 阻塞问题 | 0 项 | 0 |
| 人工面 | chip 两态观感 / 拖动体感 / 双主题 / 320px / 键盘 / 读屏 / 真机 S2 走查 等 9 项 = `⏳`（不冒充 PASS） | 如实 |

**Feature 类型判定**：**代码类**（`src/**` + `test/**` + 构建产物 + Chromium 真机门禁）⇒ 全五维度验证（测试覆盖 / 接口数据 / 构建 / 性能边界 / 漂移检测）。

**对抗优先原则**：每条 review/build **声明值**都要有一条**可判红**的反证（删掉机制 ⇒ 同一判据必须 FAIL）；每条红线 / 保护段 / 体积面都要**独立复算**（自写探针，不复用仓库门禁的断言实现）。

---

## 2. 自主验证场景（V1~V9）

**验证对象来源**：
- `spec.md`：FR-ALLN-012 / 015 / 023 / 024 / 085~092 / 114 / 116 / 003 / 004 / 120~125 / 130~134 + 9 NFR + 10 EC + 13 AC
- `plan.md`（技术设计 / §5 文件影响 / ADR-V5-006·007·009·010·012）+ `build.md`（R1/R2 + review 修复轮）+ `review-report.md`（R2 声明值：门禁计数 / 红线 sha / 保护段三值 / 体积五要素）
- 实际产物：`src/ui/sidepanel/**`（chip / 分隔条观测 / 密度口径）+ `src/ui/tree/**`（指针）+ `src/insight/**` + `src/security/**` + `dist/**`（红线与体积）+ `test/**` 门禁 + `docs/*.json` 台账

| # | 验证对象 | 验证步骤 | 预期结果 | 验证维度 | 验证方法 |
|---|---------|---------|---------|---------|---------|
| **V1** | 门禁全量 + 对账（AC-ALLN-025 / FR-003·120·124·125） | ① `npm test`；② `test:law8` / `test:dead-end` / `test:auth-chip` / `test:insight` / `test:density` / `test:l0`；③ 补跑 `test:ui`(journey) / `test:binding`（KL-N-10 隔离复跑）/ `test:stream` / `test:zero-injection` / `test:supersession` / `test:gate-integrity` / `test:size-ruling-vol3` / `test:design-contract` / `typecheck` / `build`；④ 与 review R2 + build 声明值逐项对账 | 全绿 + 计数**只增**（npm 1181 / law8 25 / dead-end 39 / auth-chip 37 / insight 118 / density 242 / l0 248 / journey 171 / binding 192 / stream 73 / zero-injection 28 / supersession 36 / size-ruling 12 / typecheck 0 / build 547,558 B） | 测试覆盖 + 构建 | 串行复跑（Chromium 门禁严格串行）+ 计数对账 |
| **V2** | **授权 chip 终局对抗**（FR-085~088·092 / AC-ALLN-012·015 / ADR-V5-006） | ① **两态切换四路**：授权（discover A → authorize A）/ 撤销（revoke A）/ **重绑**（绿态 `op.rebind`）/ **会话切换**（A→B→A 的 chip 重算）；② 两态逐字 + 永不为 `hidden`；③ **唯一载体全 UI 扫描**（授权态语义位 `[data-auth]` 恰 1 处 + 四区四词/两态短语零命中 + 全 UI text-node 超集分类）；④ **L2 树指针**（站点行零授权态值 + `[data-auth-pointer="#auth-state"]` + 指针说明**计算可见**）；⑤ 黄点击产 `op.authorize` next / 绿点击管理详情（默认折叠 / 展开 ≤ 7 / 不跳走）；⑥ 默认屏 6 ≤ 7 | 四路状态正确；唯一载体成立；指针成立且可见；点击语义正确；6/7 边界成立 | 接口数据 + 测试覆盖 | 自写对抗探针（真实 dist + 真实 SW / reducer，不 import 被测门禁实现） |
| **V3** | **死端守护对抗**（FR-015 / AC-ALLN-002·021 / ADR-V5-009） | ① 5 类阻塞（`site.unauthorized` / `llm.unconfigured` / `perm.missing` / `binding.stale` / `ref.all-invalid`）**逐类**驱动，用**自有** `nextOf/deadEnd` 判据读同帧 DOM；② **第 6 类注入**（`disk.full`，无 provider）⇒ 自有判据必红；③ 还原 ⇒ 必绿；④ **S2 十环节**逐环节驱动（本叶 ①~⑤ 段独立复算 + 十环节样本齐备） | 5 类 deadEnd=false；注入红 / 还原绿；S2 死端 0 | 测试覆盖 + 接口数据 | 自写对抗探针（自有判据实现，避免「用同一实现自证」） |
| **V4** | **法八四面 + `maskedLength` 侧信道对抗**（FR-023·024 / NFR-003·011 / AC-ALLN-003） | ① 真实掩码写入路径（`op.llm-config` → params(choice/text/**secret**) → `submitSecret` → keyStore）；② **四面**扫描（流内 payload / digest / 审计渲染+存储 / DOM value + **全部属性逐项**）；③ `maskedLength` 列 = **类别**（`8+`/`8-`）非原始长度；④ **侧信道扫描**：原始长度数值不落审计单元格 / 掩码事实文案；⑤ key 直写面恰 1 sink（`keyStore.save(`）；⑥ 提交后掩码输入清空 | 四面零命中；类别非数值；单 sink；值只落 key-store | 接口数据 + 漂移检测 | 自写对抗探针（真实路径 + 自有四面扫描实现）+ 源码面统计 |
| **V5** | **X5 密度连续口径**（FR-090·091·114 / NFR-002 / AC-ALLN-014 / EC-ALLN-014·015 / ADR-V5-007） | ① **阈值逐字**（default 7/15 · firstRun 9/20 · risk 17/35）+ v3 基线冻结；② `v5Ledger` **31 格**逐格留痕 + `narrowBoundary` 360/361 + `widthInvariance` 解耦；③ **宽度解耦**：280 / 460 / 640 三点默认屏控件计数**不变**；④ `data-narrow`：280→true / 360→true / **361→false**；⑤ 窄屏不隐藏 chip（非 `hidden` 充数）；⑥ 无水平溢出 | 阈值/格值不动；计数与宽度解耦；边界成对 | 性能边界 + 漂移检测 | 自写探针（Chromium 采样 + 台账复算） |
| **V6** | **保护段三值复算**（FR-122 / AC-ALLN-018 / ADR-V5-012） | ① journey 保护段 `43054..58287` sha `cc79f413…` / **240 行**独立切片复算；② binding 保护段 `107780..115930` sha `be9ad0e9…`；③ 锚点自洽 + `supersessionChain` 链式前驱；④ `protectedRanges` 全 `active` | 逐字节命中 + 行数/锚点自洽 | 漂移检测 | 自写探针（自读字节切片 + sha256） |
| **V7** | **红线与冻结面**（FR-069 / AC-ALLN-022 / 父 §2.2 out-of-scope 面） | ① `dist/content.js` 177,076 B / sha `52a82620…`；② `dist/pick-layer.js` 33,900 / `5f567d7e…`；③ 对 leafBase `9b262ae` 零 diff：`design/**` · `manifest.json` · `docs/v3-supersession-ledger.json` · `docs/v3-density-baseline.json` · `ROADMAP.md` · 判定链 `policy.ts` / `auto-authorize.ts` · `src/content/**` · `dist/content.js` · `dist/pick-layer.js` · `hardening.mjs`；④ `KIND_SET` 成员逐项冻结（40 项逐序相等）；⑤ `zero-injection.mjs` 变更 = **本叶主责等价重锚**（删除行逐字登记于 leafBase） | 逐字节命中；零 diff；变更已登记 | 漂移检测 + 构建 | 自写探针（自算 sha + `git diff` + 台账 diff） |
| **V8** | **体积三值同源 + 越限红**（FR-130~134 / NFR-005 / AC-ALLN-021·023 / ADR-V5-011） | ① `SIDEPANEL_BASELINE_BYTES == SIDEPANEL_FINAL_ARTIFACT_BYTES == stat(dist/sidepanel.js) == 547,558`；② 生效上限 = `floor(547,558 × 1.05) = 574,935`；③ 档位 = `ceilTo50KB(547,558) = 563,200`（派生式非魔数）；④ 绝对上限 = `round(563,200 × 1.10) = 619,520`；⑤ 机读载体 `docs/v4-density-baseline.json#volume.registeredBaselineBytes` 同源；⑥ `authorConfirmation = pending-author-line`（不伪称）；⑦ **越限注入必红**：基线临时压到 500,000（ceiling 525,000 < 实测）⇒ `size-budget` 必 FAIL，逐字节还原 ⇒ PASS | 三值同源 + 越限即红 + 还原即绿 | 性能边界 + 构建 | 自写探针（独立复算式 + 注入/还原双向） |
| **V9** | **spec AC 全锚抽验 + 共享面恰一次**（AC-ALLN-002·003·012·013·014·015·018·019·021·022·023·024·025 / FR-004） | ① 叶 `state.json` 的 **13 个 AC 锚点**逐一在 spec §7 出现；② 27 条 FR 逐一在 spec §4 出现（含范围记法 `FR-ALLN-130~134`）；③ 三核心 AC（002/003/012）在位；④ 共享面（体积五要素 / journey 保护段）在 spec 内显式登记；⑤ 三叶共享面在体积台账中**恰一次**（v5-3 reviewfix 为最新轮） | 锚点/FR 全覆盖；共享面恰一次 | 漂移检测 | 自写探针（spec 文本 × state 锚点交叉复算） |

> **质量门槛核对**：FR 27 条逐条落在 V2~V9（见 `validate-report.md` §3 映射表）；相关维度 5 个（测试覆盖 / 接口数据 / 构建 / 性能边界 / 漂移检测）各 ≥ 1 条 Vx；Vx = 9 = max(27,5) 起底不满足，故本策略按**维度聚簇**设计（每个 Vx 是一族对抗场景，内含逐条 FR/AC 的子断言；逐项读数见 `validate-report.md` §2~§3）。**无法验证项显式标注**：人工面 9 项 = `⏭️`（headless 不可合成，见 §4）；「产品侧 280–640 拖动手柄」= **不适用**（产品侧无对应物，Chrome 控制侧栏宽度 —— 见 `validate-report.md` §5 N-1）。

---

## 3. FR / NFR / EC → Vx 映射（覆盖账）

### 3.1 FR（27 条）

| FR | 承接点 | 主判 Vx |
|----|--------|:--:|
| FR-ALLN-085 | `#auth-state` 两态逐字 + 恒显 | V2 |
| FR-ALLN-086 | 唯一常显载体 + 零双写五条（含 ⑤ L2 指针） | V2 / V9 |
| FR-ALLN-087 | 黄点击产 `op.authorize` next + 系统行 + 不跳走 | V2 |
| FR-ALLN-088 | 绿点击管理详情（`op.revoke`/`op.rebind`，默认折叠，展开 ≤7） | V2 |
| FR-ALLN-089 | 可拖动宽度 280–640（ARIA / 键盘 / clamp / 复位 / rAF） | V5（产品侧落点 = `data-narrow`；见 §5 N-1） |
| FR-ALLN-090 | `data-narrow`（≤360）+ 三档 radio 删除 | V5 |
| FR-ALLN-091 | 密度口径解耦（格 = 控件计数 / 320 锚点 / 阈值不动） | V5 |
| FR-ALLN-092 | 状态栏单写者结构 + 6 ≤ 7 | V2 / V5 |
| FR-ALLN-012 | `error` 出生即带恢复区（阻塞类 / append-only） | V3 |
| FR-ALLN-015 | 死端守护门禁（5 类 + N=0 + 死端=0 + 双向反证） | V3 |
| FR-ALLN-023 | 法八四面零明文 + 全属性 + 哨兵反证 | V4 |
| FR-ALLN-024 | 存储侧边界口径显式登记 | V4 / V9 |
| FR-ALLN-114 / 116 | X5 显式取代 + 等价重锚对账 | V5 / V9 |
| FR-ALLN-003 | 断言零删除零降级、计数只增 | V1 |
| FR-ALLN-004 | 共享面恰一次登记（体积 / journey / design-contract / 台账） | V8 / V9 |
| FR-ALLN-120 | 门禁等价重锚（l0 / density / journey / stream / zero-injection / thresholds / host-registry） | V1 / V7 |
| FR-ALLN-121 | 反证不空转（两段证伪） | V2~V4 / V8 |
| FR-ALLN-122 | journey 保护段保段或八步取代 | V6 |
| FR-ALLN-123 | `knownGap` 一致性机核 | V1（`test:supersession`）/ V9 |
| FR-ALLN-124 | 门禁严格串行 + KL-N-10 纪律 | V1（binding 隔离复跑） |
| FR-ALLN-125 | 新门禁纳入 `gate-integrity` | V1（`test:gate-integrity` 15/0） |
| FR-ALLN-130~134 | 体积五要素（三叶合计）+ 生效上限 + V3-VOL-3 三值同源 + 红线 | V8 |

### 3.2 NFR（9 条）

| NFR | 承接点 | 主判 Vx |
|-----|--------|:--:|
| NFR-ALLN-001 | 首屏 / 滚动 / 视图往返不变差；rAF 合并 | V2（不跳走）/ V5 |
| NFR-ALLN-002 | 320px 零溢出 + `data-narrow` 360/361 + 键盘可达 | V5 |
| NFR-ALLN-003 | 流内零明文（四面）+ 净化面不变 | V4 |
| NFR-ALLN-004 | 单源 + 机核（阻塞枚举 / 阈值 / 四词范围恰一处声明） | V1 / V3 / V5 |
| NFR-ALLN-005 | `sidepanel.js ≤ 574,935`（生效上限） | V8 |
| NFR-ALLN-006 | 兼容读取面 id 语义不变（`#auth-state` 净新增） | V1（`test:l0` / `journey`）/ V7 |
| NFR-ALLN-007 | 每条新/改判据可 FAIL + `expectFailPattern` | V2~V4 / V8 |
| NFR-ALLN-008 | 无障碍：chip 两态可读可键盘触发 / 分隔条 ARIA / `aria-live` | V2（`aria-expanded`/`aria-controls`）+ 人工面读屏项 `⏳` |
| NFR-ALLN-011 | 审计面 `{opId, ts, result, maskedLength}` 且零明文 | V4 |

### 3.3 EC（10 条）

| EC | 承接点 | 主判 Vx |
|----|--------|:--:|
| EC-ALLN-014 | `data-narrow` 360→true / 361→false，无水平溢出 | V5 |
| EC-ALLN-015 | 拖动极值 / 键盘边界 / 复位（产品侧 = clamp 观测 + 窄屏边界） | V5 |
| EC-ALLN-013 | 非首装未授权：chip 黄态 + ✖ 行行内恢复 chip | V2 / V3 |
| EC-ALLN-019 | 会话切换 / 视图往返：chip 随 ctx 重算（不缓存） | V2（路③） |
| EC-ALLN-011 / 012 | `op.revoke` / LLM 失败回滚的审计 / digest 零明文面 | V4 |
| EC-ALLN-009 | 掩码输入取消 / 为空 ⇒ 流内零明文仍成立 | V4 |
| EC-ALLN-007 | 浏览器弹窗人工面（与 chip / 分隔条同列） | 人工面 `⏳`（§4） |
| EC-ALLN-018 | 取代台账 `knownGap` 一致性（收口叶最终校验） | V1（`test:supersession`）/ V9 |
| EC-ALLN-021 | 体积越限 ⇒ 五要素重登记 + 档位上调义务显式登记 | V8（越限红双向） |

---

## 4. 人工面（9 项，如实 `⏳`）

`chip 两态观感` / `拖动宽度体感与性能` / `绿态管理详情手感` / `双主题` / `320px` / `键盘` / `读屏（掩码输入 + chip）` / `浏览器原生权限弹窗体感` / `真机 S2 断流走查` —— headless 不可合成，**不得冒充 PASS**（owner = TASK-V5-176；详 `validate-report.md` §4）。

---

## 5. 结论判据

- ✅ **通过** — FR 覆盖 100% / NFR ≥ 80% / 构建 0 / 严重漂移 0 / 阻塞 0 / 对抗红绿非空转
- ⚠️ **有条件通过** — 非阻塞偏差（观察项）
- ❌ **不通过** — 未覆盖的 FR / 构建失败 / 严重漂移

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V5-3 末叶 / 收口叶：对抗优先的 V1~V9 场景矩阵 + §0 review 建议低风险订正清单 + FR/NFR/EC 覆盖账 + 人工面如实 `⏳`） | 2026-09-22 | SDDU Validate Agent |
