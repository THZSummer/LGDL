# 构建报告：specs-tree-v3-2-l1-disclosure-refs

> **文档定位**: SDDU 实施构建报告 — 记录本叶实际落地的代码/门禁/体积证据
> **前置依赖**: 本叶 `spec.md` / `plan.md` / `tasks.md`（10 任务 / 6 波）+ 父 `spec.md`（FR-V3-030~040 / AC-V3-008~010 / AC-V3-022 / AC-V3-023）+ 父 `plan.md`（ADR-V3-001~012）+ v3-1 落地先例
> **创建人**: SDDU Build Agent
> **创建时间**: 2026-09-16
> **版本**: v1.0
> **更新说明**: 初始创建（逐任务实施 + 逐门禁实跑；**含一条红线冲突的显式上报**，见 §5.2）

---

## 1. 构建概要

| 维度 | 数值 |
|------|------|
| 完成任务数 | **10 / 10**（TASK-201~210；Waves 1→6 按序） |
| 复杂度分布 | S×4（202/203/206/209）/ M×6（201/204/205/207/208/210）/ L×0 |
| 新增文件 | **10**（5 src：`l1/{ref-validity,ref-store,local-tree,receipt,panels}.ts`；2 test：`test/l1-ref-validity.test.ts`、`test/ui/l1.mjs`；其余见 §2） |
| 修改文件 | **17**（建设轮 13 + 修复轮 4；**I-05 回填订正，2026-09-16 修复轮 R2**：建设轮 13 = 见 §2.2 表；修复轮追加 4 = `build.mjs` / `test/density-thresholds.test.ts` / `test/ui/density.mjs` / `test/ui/l0.mjs`（内容见 §9 与 §9.6，本轮已回填进 §2.2 表）。口径来源：`git diff --stat e45ca53..HEAD -- packages/web-cli-plugin` = 10 新增 / 17 修改） |
| 波次 | 6 波按序完成；门禁严格串行（一次一个） |

### 1.1 门禁结果（逐条串行，日志见 `/tmp/opencode/v3-gate-logs/v3-2/`）

| 门禁 | 结果 | 计数 / 说明 |
|------|------|-------------|
| `npm run typecheck` | ✅ 0 error | — |
| `npm run build` | ✅ | `content.js` **177,076**（零改动，= 上限）· `sidepanel.js` **327,679**（见 §5.2） |
| `npm test` | ⚠️ **743 用例 / 742 passed / 1 failed** | 唯一失败 = 体积 ceiling 冲突（§5.2，**如实 FAIL，未放宽**）；新增 11 个判定/存储单测 |
| `npm run test:supersession` | ✅ 11 passed / 0 failed | 按行台账判定全命中；`V32-S1~S5` + `V32-MR` 追加；`protectedRanges` hash 不变 |
| `npm run test:l1`（本叶新门禁） | ✅ **88 passed / 0 failed** | 8 类 ≤1 次 + 不遮挡 + 五维 + unknown + 阻断 + 两恢复 + 回执三件套 + 可发现性 + 局部树 + 历史 + 密度往返 |
| `npm run test:density` | ⚠️ **126 passed / 1 failed（共 127 检查，与 v3-1 同数）** | 唯一失败 = 「产物 ≤ 机读上限」（§5.2）；22 格机器比对 ✅（重登记后逐格相等）、体积登记值 == 实测产物 ✅、默认/首装/其余风险格与 worst **零漂移** |
| `npm run test:l0` | ✅ **157 passed / 0 failed** | v3-1 为 137 → 只增 |
| `npm run test:insight` | ✅ **108** assertions（不变） | `UI insight PASS`；**未修改**该门禁（取代量 0） |
| `npm run test:ui`（journey） | ✅ **167** assertions（不变） | `UI journey PASS`；**未修改** |
| `npm run test:binding` | ✅ **192** assertions（不变） | `binding PASS`；**未修改** |
| `npm run test:hardening` | ✅ **24** assertions | `hardening PASS` |
| `npm run test:e2e` | ✅ **PASS**（exit=0） | 全链路（含既有 deviation 登记：headless goBack/forward 的已知限制） |
| 体积三线 | ⚠️ **红线冲突** | `content.js` 177,076 ✅（sha256 pin 不变）；`sidepanel.js` 327,679 > **冻结 ceiling 306,099**（+21,580） |
| 零改动核对 | ✅ | `manifest.json` / `src/content/**` 三 hash / `src/security/{policy,auto-authorize}.ts` / `web-cli-base/**` / `design/**` / `main` 全 0 diff |
| 人工面（动画 / 高亮 / 读屏体感） | ⏳ **未执行** | 如实登记，不冒充 PASS |

## 2. 文件变更

### 2.1 新增

| 操作 | 文件路径 | 任务 | 说明 |
|:--:|------|:--:|------|
| NEW | `src/ui/sidepanel/l1/ref-validity.ts` | TASK-201 | **唯一判定权威**：五维 + 三态（`valid`/`invalid`/`unknown`）+ 唯一放行点 `isRefUsable = verdict === 'valid'` + 逐维可读原因（模板逐字 pin）；纯函数、无 `chrome.*`/`document`/时钟 |
| NEW | `src/ui/sidepanel/l1/ref-store.ts` | TASK-202 | 引用 id 单源 `ref_<n>`（**单调、失效不重用**，`reset()` 亦不重置序号）+ 事实字段集 + 截断口径（80/120）+ 受保护派发 `dispatch()`（守卫为第一句）+ `retireUnusable()` |
| NEW | `src/ui/sidepanel/l1/local-tree.ts` | TASK-203 | 局部树：复用 v2 `ownership-tree` 的 `path` 主归属链裁剪 **≤3** 节点（硬上限）+ 交叉引用徽标（不复制节点）；`src/insight/**` 只读复用（0 diff） |
| NEW | `src/ui/sidepanel/l1/receipt.ts` | TASK-204 | 回执三件套投影（摘要 / 证据行白名单 / 审计出口）+ 零明文 fail-closed 扫描 + 目标去参截断；语义复用 v2 `tree-receipt`（不新建模型） |
| NEW | `src/ui/sidepanel/l1/panels.ts` | TASK-205/206 | L1 挂载与渲染：8 类内容、组展开镜像、chip 失效标记、阻断、两条恢复路径、回执重拉、局部树注入、历史跟踪 |
| NEW | `test/l1-ref-validity.test.ts` | TASK-201/202 | 11 个纯 Node 用例（三态 / 五维 / 不确定即失效 / 文案逐字 / 截断 / id 单调 / 阻断 / 局部树 / 回执 / 白名单） |
| NEW | `test/ui/l1.mjs` | TASK-207 | L1 运行时门禁（88 断言；单 Chromium 实例、单 page target、日志全量落盘） |

### 2.2 修改

| 操作 | 文件路径 | 任务 | 说明（**只增不改语义**） |
|:--:|------|:--:|------|
| MODIFY | `src/ui/sidepanel/index.html` | TASK-205 | 追加 8 个 `[data-l1-panel]` 容器（默认 `hidden`）+ 5 个带 ARIA 成对的类触发器 + 手势表 + 后果两段模板（`<template>`，静态文案落 markup 以省 bundle）+ `#l0-receipt-summary`（L0 常驻、默认 hidden）+ chip 失效徽标（sibling）；`#topbar` 加 `max-height:40vh` 内部滚动块（在 `#panel-top` 内，不进 `#panel-main` 滚动容器口径） |
| MODIFY | `src/ui/sidepanel/disclosure.ts` | TASK-205 | 白名单**追加** 5 个 L1 面板 id（4 → 9 个目标）+ 对应 5 条 wiring；`#risk-rail` 仍在白名单外（`assertFoldable` 仍抛错） |
| MODIFY | `src/ui/sidepanel/view-model.ts` | TASK-205 | 追加 L1 契约纯函数：`L1_PANEL_IDS`（8 类可枚举）/ `L1_GESTURE_COUNT` / `isDestructiveOption` / `decisionHistoryLabel`；`L0Input.staleRefReason` + `L0View.staleRef`（动态失效行的载体） |
| MODIFY | `src/ui/sidepanel/sidepanel.ts` | TASK-205/206 | 挂载 L1 + `l1Input()` + 渲染顺序（L0 → L1）+ `window.__v3.testing.l1(op, ...)` 单一派发器（测试面）；`setRisk('staleRef')` 改走**真实判定**（注入事实 + 分辨率）；`reset()` 同时清 L1 态 |
| MODIFY | `src/ui/sidepanel/l0/shell.ts` | TASK-206 | `renderRiskRail(doc, risks, view.staleRef ?? undefined)`（1 行；风险位仍由 `l0/risk-rail.ts` 唯一写入） |
| MODIFY | `src/ui/sidepanel/l0/risk-rail.ts` | TASK-206 | `renderRiskRail` 增加可选 `staleRef` 覆盖（**数据**，不是第二套模板）：失效行写出「哪一维触发」的可读原因；三通道与非空文本校验不变；覆盖参与重绘签名 |
| MODIFY | `package.json` | TASK-208 | 追加 `test:l1`；`test:v3` 串行链插入 `test:l1`；**依赖段零 diff** |
| MODIFY | `test/l0-disclosure.test.ts` | TASK-205 | 展开态快照按**全部** 9 个目标重 pin + 新增「快照覆盖白名单全部目标」断言（断言只增不减） |
| MODIFY | `test/{size-baseline,size-budget,insight-archive}.test.ts` | TASK-209 | 体积基线按真实产物显式重登记（327,679）+ 方向敏感断言重 pin（见 §5.2 披露） |
| MODIFY | `docs/v3-density-baseline.json` | TASK-209 | 风险 `staleRef` 三格 `chars` 244 → 254（唯一漂移，前后值 + 日期 + 理由）；`volume.registeredBaselineBytes` 跟随真实产物（ceiling **未抬高**） |
| MODIFY | `docs/v3-supersession-ledger.json` | TASK-208 | **只追加**：`V32-S1~S5` entries + `V32-MR` modifiedRanges ×2 + 计数复算（743 / 752 / 844）+ `v3GateFloors` 增 `l1.mjs: 55` + `pureAdditionFiles` 增 2 文件 |

**修复轮追加的 4 个修改文件（I-05 回填，2026-09-16 修复轮 R2；口径 = `git diff --stat e45ca53..HEAD`）**：

| 操作 | 文件路径 | 轮次 | 说明（**只增不改语义**） |
|:--:|------|:--:|------|
| MODIFY | `build.mjs` | v3-2 修复轮 | 为替代守卫 ③ 产出 `dist/build-meta.json`（esbuild `metafile: true`），使「逐模块增长正当性」可被 `test/size-growth-evidence.test.ts` 机器复核（+10 行） |
| MODIFY | `test/density-thresholds.test.ts` | v3-2 修复轮 | 裁决 V3-VOL-1 ② 后按公式 ceiling 重 pin（cap 已撤销）+ 新增「cap 之上必须 PASS」「`ceilingCapRole === 'record-only'`」同源断言（断言只增不减） |
| MODIFY | `test/ui/density.mjs` | v3-2 修复轮 | **纯追加注释**（`V32-S10`）：阶段 F 旧注释指向 `V31-S12` 的指针在 cap 撤销后失真 → 指向四条替代守卫；**零删除行**、检查名未改 |
| MODIFY | `test/ui/l0.mjs` | v3-2 修复轮 | **纯插入**（`V32-S11`）：⑥b 内联反证前先等 `#l0-statusbar` 子树 DOM 静默（去抖，绝不挂死）；判据本体 / 断言数量 / 阈值 / `check(` 计数（68 == 台账下界）均未动 |

> 注（§9.2 方法段的复现限缩，如实登记）：§9.2 方法段写着「实测两棵树 `dist/content.js` 同为 177,440 B」——该句来自修复轮的**中间版** `size-attribution.mjs`（它会同时构建 content 入口）。**HEAD 版**工具只构建 `sidepanel` 单一入口（`entryPoints` 单值），故该句无法用现行命令复现；`Δ = 32,454 B` 与逐模块分解本身**已复现**（见 §10.4）。

**明确未改**：`manifest.json` · `src/security/**`（判定链 sha256 不变）· `src/content/**`（三 hash 不变）· `src/insight/**`（只读复用）· `packages/web-cli-base/**` · `options.html` · `design/**` · `main` · 依赖段。

## 3. 测试覆盖（需求 → 证据）

| 需求 | 落地证据（可复现命令） |
|------|------|
| FR-V3-030 不遮挡 | `test/ui/l1.mjs` ②：展开后 `#risk-rail` 与 `#l0-decision` 均在视口内 + 与展开区交面积 0 + `#panel-main` 内滚动容器仍只有 `#log` |
| FR-V3-031 8 类逐类 ≤1 次 | ①：8 个 `[data-l1-panel]` 全部默认 `hidden`，逐类「默认 hidden → 1 次点击后可见且有非空内容」；另证一次点击 `#l0-status-band` 同时展开 ①④⑤⑥⑦ |
| FR-V3-032 两段必填 + 不可逆声明 | ③：4 选项 → 4 块，每块含「会发生什么」「不会发生什么」；破坏性选项显示不可逆性声明，非破坏性不显示 |
| FR-V3-033 证据四要素 + 只读 | ⑪：`#l1-ref-rows` 四要素齐备、证据层写入控件 = 0、零提权控件 = 0 |
| FR-V3-034 局部树 ≤3 + 全局树入口 | ⑪：注入 v2 形状快照 → 4 条链被裁到 3、含当前节点、交叉引用徽标、`#l1-local-tree-global` 存在且 `openL2('tree')` 可达 |
| FR-V3-035 历史 N 可复算 + 零副作用 | ⑪：答一问 → 1 步；再问同一 prompt → 2 步且 `changed=true`；展开前后引用态逐字不变 |
| FR-V3-036 五维 + 不确定即失效 | ⑦：五维逐一注入 → `invalid` + 维度命中 + 文案逐字；5 个 unknown 场景（事实缺失 / 页面不可达 ×2 / 歧义 / 被替换）→ `unknown` 且被阻断；单测覆盖三态、环境不可得、`navSeq` 缺失等 11 例 |
| FR-V3-037 常驻 + 可读原因 + 阻断 | ⑦/⑧：风险行三通道齐备、`aria-disabled="true"`、`#l0-pick` 改写为「重新拾取」；失效态派发**计数增量为 0**，同引用在 `resolved` 时放行（非空转对照） |
| FR-V3-038 两条恢复路径 | ⑨：「改用描述」打开既有 `#ask` 兜底输入（无新输入框）；「重新拾取」产生**新 id**（失效 id 不重用）且恢复后判定 `valid` |
| FR-V3-039 回执三件套 | ⑩：`refreshSeq` 1 → 2（**真重拉**）、三件齐备、L0 摘要常驻可见、证据 8 行白名单、审计出口指向 L2 |
| FR-V3-040 入口文字 + 摘要/计数 | ⑪：8 个入口文字非空 + `data-count` 为真值（手势 4 ≡ 表行数、选项 4、回执行 8、…） |
| FR-V3-071 引用 id 四处贯穿 | `ref-store` 单源（单测：`ref_1/ref_2` 单调 + reset 后不重用）；chip / 证据行 / 风险行共用同一 `refId`（风险行经 `staleRef` 覆盖，glyph 一致） |
| NFR-V3-001/002 密度不回归 | ⑫：展开/收起往返后 320/400/520 三档仍达标（复用 v3-1 单源口径）；`test:density` 默认档实测 **223 chars / 7 可点 / 7 行 / 19 块 / 6 区**，与登记值逐格相等（三视口） |
| NFR-V3-005 体积 | §5.2（**红线冲突，已上报**） |
| NFR-V3-008/016 只读投影 + 零明文 | `assertNoPlaintext` fail-closed 扫描（单测含正反例）+ ⑩ 零明文实测；URL 去参（`targetDigest` 单测） |
| NFR-V3-012/013/014 串行 / 能真 FAIL / 计数不减 | 门禁严格串行（§1.1）；本叶新断言全部可 FAIL（反证见 §6）；`npm test` 743 ≥ 646、l0 157 ≥ 137、l1 88（新） |
| AC-V3-008/009 风险常驻 | `test:l0` 157/0（v3-1 的 5 类 × 2 场景断言全过，含 `staleRef` 的真实事件源现在生效） |

## 4. 任务完成清单

| 任务 | 状态 | 交付 |
|------|:--:|------|
| TASK-201 判定 + 单测 | ✅ | `l1/ref-validity.ts` + `test/l1-ref-validity.test.ts`（11 例） |
| TASK-202 引用 id 单源 | ✅ | `l1/ref-store.ts`（单调 id / 截断 / 受保护派发） |
| TASK-203 局部树 | ✅ | `l1/local-tree.ts`（≤3 硬上限） |
| TASK-204 回执三件套 | ✅ | `l1/receipt.ts`（零明文扫描） |
| TASK-205 L1 八类就地展开 | ✅ | `l1/panels.ts` + `index.html` + `disclosure.ts` + `view-model.ts` + `sidepanel.ts` |
| TASK-206 失效呈现与阻断 + 两恢复 | ✅ | `panels.ts` + `l0/{shell,risk-rail}.ts` + chip/pick 改写 |
| TASK-207 L1 运行时门禁 | ✅ | `test/ui/l1.mjs`（88/0） |
| TASK-208 门禁取代 + 台账 | ✅ | `package.json`（`test:l1`）+ 台账**只追加**（`V32-S1~S5` / `V32-MR`）；`insight.mjs` **未改**（见 §5.3，实测无需前置展开，取代量为 0） |
| TASK-209 体积核对 + 重登记 | ✅（触发） | `test/size-baseline.ts` + `docs/v3-density-baseline.json` 显式重登记（§5.2） |
| TASK-210 收口 | ⏳ 部分 | 门禁串行实跑完成（§5.1）；人工面如实「未执行」；**体积冲突待编排器裁决** |

## 5. 门禁、体积与冲突

### 5.1 串行实跑日志

| 门禁 | 日志 | 结果 |
|------|------|------|
| typecheck / build | `/tmp/opencode/v3-gate-logs/v3-2/` | ✅ |
| `npm test` | 同上（743 用例） | ⚠️ 1 failed（体积冲突） |
| `test:supersession` | 同上 | ✅ 11/0 |
| `test:l1` | `l1.log`（+ round1~6 迭代日志） | ✅ 88/0 |
| `test:density` | `density-round1.log` | ⚠️ 124/3（失败 = 体积/F 段） |
| `test:l0` | `l0b.log` | ✅ 157/0 |
| `test:insight` / `test:ui` / `test:binding` / `test:hardening` / `test:e2e` | 同目录（`insight.log` / `journey.log` / `binding.log` / `hardening.log` / `e2e.log`） | 见 §5.3 |

### 5.2 ⚠️ 红线冲突（**必须裁决**）：`sidepanel.js` 超出被冻结的 ceiling

> ✅ **已裁决并已执行（2026-09-16，编排器裁决 V3-VOL-1）**：本小节保留为**冲突当时的历史上报原文**（逐字不改）；
> 裁决与执行结果见 **§9 修复轮**。要点：① 批准基线显式重登记至实测 327,679 B；② 撤销自加 cap（该 cap 非 spec/作者要求），
> 判定恢复为公式 `floor(baseline × 1.05)` = 344,062 B；③ 以四条替代守卫（公式 / 显式重登记登记册 / 增长正当性证据 / >15% 方向性告警）取代之。
> 因此本小节末尾「需要的裁决」已由编排器给出，`npm test` 与 `test:density` 的 2 处红灯**已按裁决消除**（不再放宽任何东西：容差 5% 未动、断言零删减）。

| 项 | 值 |
|----|----|
| 本叶新增代码量 | `sidepanel.js` 295,225 → **327,679 B**（+32,454 B）——其中新模块 5 个（`l1/*`）≈ 23 KB，其余为 `view-model` / `sidepanel` 接线 / `disclosure` 白名单 |
| 冻结 ceiling | **306,099 B**（`SIDEPANEL_CEILING_CAP`，红线 ⑧「只降不升」） |
| 差额 | **+21,580 B（超出 7.05%）** |
| 已做的诚实处置 | 登记值 == 实测产物（327,679）✅；`ceilingDirection: 'held'`、`previousBaselineBytes: 295,225`、历史值全保留 ✅；容差 5% 不变 ✅；**断言零删减**（方向敏感断言按真实值重 pin，台账 `V32-S1/S2`）✅；`content.js` 177,076 零改动 ✅ |
| 未做的（红线禁止） | ❌ 未抬高 `SIDEPANEL_CEILING_CAP`；❌ 未放宽容差；❌ 未把 L1 代码搬到 `sidepanel.js` 之外绕开门禁；❌ 未删断言 |
| 实际后果 | `npm test` 的「实测 ≤ cap」断言、`test:density` 阶段 F 的「产物 ≤ 机读上限」断言**如实 FAIL**；其余 742 个 node 用例与全部功能门禁绿 |
| 需要的裁决 | ① 把 `SIDEPANEL_CEILING_CAP` 抬高至 ≥ 327,679 B（建议 `min(floor(baseline×1.05), previousCeiling)` 之外的显式裁决值 344,000 量级）；**或** ② 削减本叶范围（例如把 L1 渲染整体延后/改由 v3-3 承接）。**本叶按红线「若某目标只能靠放宽达成 → 停下如实上报」处理，未自行放宽。** |

> 说明（为何不是「实现太胖」）：五维 fail-closed 判定 + 可读原因文案 + id 单源 + 回执三件套 + 局部树 + 八类渲染的**最小实现**本身就 ≈ 11.8 KB（仅 4 个必需模块的 bundle 实测），而剩余 ceiling 余量仅 10.87 KB —— 即使完全去掉渲染与接线也无法容纳。已做的减重：静态文案全部落 `sidepanel.html`（不在 `sidepanel.js` 口径内）、测试只写 `test/**`（不进 bundle）、诊断面收敛为单一派发器。**红线冲突因此是刚性的，不是优化不足。**

### 5.3 取代面与密度

- **取代量 = 0 的前置展开**：`test/ui/insight.mjs` / `journey.mjs` / `binding.mjs` **未修改**。原因是本叶把 L1 内容全部落在 `hidden` 子树内、且 `#topbar` 家族 / `#tree-*` 家族 id 零重命名 —— 既有门禁断言的 DOM 契约未变，实测无需「最小前置展开」。台账 `counts.insight.note` 的 union 口径（`insight + l1 + l2 ≥ 108`）仍成立：`insight.mjs` 108 + `l1.mjs` 88（l2 未建按 0）。
- **密度唯一漂移**：`risk(staleRef)@{320,400,520}.chars: 244 → 254`（+10：可读原因 + chip 徽标 + pick 改写）。C1/C2/C3/C4 逐项不变（7 / 8 / 20 / 6），阈值 **17/35 未动**，风险增量归属违规 **0**。默认档三视口 **223/7/7/19/6 与登记值逐格相等**（零漂移）。登记按 `directionNote` 的「放宽须显式登记」流程落 `docs/v3-density-baseline.json`（前后值 + 日期 + 理由 + 历史保留）。

## 6. 反证（能真 FAIL）

| 反证 | 机制 | 结果 |
|------|------|------|
| 五维逐维 → 同一引用在同一环境放行 | `⑧` 段：`resolved` 放行且计数 +1；`missing` 阻断且计数不变 | ✅ 判据非恒真 |
| `unknown` 必阻断 | 5 个不确定场景全判 `unknown` 且 `commandSends` 不增 | ✅ |
| 密度口径 | `test:density` 既有 RP-V3-01/03/04/08/09 全部 PASS（未修改门禁） | ✅ |
| 台账按行判定 | `test:supersession`（`--files-override` 判据 + 逐行命中） | ✅ |
| 体积 +1 B | `evaluateSidepanelSize(CEILING + 1).ok === false`（在当前 ceiling 上重跑） | ✅ |
| 计数只增不减 | `npm test` 743 / l0 157 / l1 88 / density 124 | ✅ |

> ⏳ **未执行**：本叶**未**对每条新关键断言做「注入扰动 → FAIL → 逐字节还原 → PASS」的独立实跑（时间/上下文预算不足）；已在 §7 如实登记，不得当作 PASS。

## 7. 人工面（如实登记）

| 项 | 状态 |
|----|------|
| 展开/收起动画体感 | ⏳ **未执行** |
| 引用高亮（页面侧）体感 | ⏳ **未执行**（页面侧采集归 v3-4） |
| 读屏真实体感 | ⏳ **未执行** |

## 8. 下一步

1. ~~**编排器裁决 §5.2 的体积红线冲突**~~ → ✅ 已裁决（V3-VOL-1）并已按裁决执行，见 **§9**；`npm test` / `test:density` 已全绿。
2. 裁决后 → `@sddu-review specs-tree-v3-2-l1-disclosure-refs`（体积裁决已落定，review 不会再看到已披露的红灯：全门禁绿见 §9.4）。
3. 本叶的 known limitation（v3-1 A6 遗留）：**每格新开面板页以彻底消除 `#notice` 干扰** —— 未处理（改动 `src/**` 会破坏已钉死的体积登记值），建议由后续叶或编排器统一裁决。
4. 新增 known limitation（本轮登记，不修）：`test/ui/density.mjs` 阶段 F 的**检查名/旧注释**仍指向 `V31-S12` 作为「未抬高」的唯一证明 —— 该指针在 cap 撤销后已失真；本轮以 **V32-S10（纯追加注释，零删除）** 纠正并指向四条替代守卫。为避免在 v3-1 已验收门禁文件里删行，未改写既有检查名。

---

## 9. 修复轮（2026-09-16，编排器裁决 **V3-VOL-1** 执行记录）

> 本轮 = 「解决体积红线冲突（按裁决）+ 补齐逐断言反证 + 全门禁复跑至绿」。
> 日志目录：`/tmp/opencode/v3-gate-logs/v3-2-fix/`（**全量落盘，无 tail 截断丢弃原文**）。

### 9.1 裁决执行：cap 撤销 + 四条替代守卫

| 裁决项 | 落地证据（文件 · 断言 · 命令） |
|--------|------------------------------|
| **① 公式判定**（`ceiling = floor(baseline × 1.05)`，容差 5% 不变） | `test/size-baseline.ts`：`SIDEPANEL_CEILING = Math.floor(SIDEPANEL_BASELINE_BYTES × 1.05)` = **344,062 B**；`evaluateSidepanelSize()` **去掉 cap 形参**。断言：`SIDEPANEL_CEILING === SIDEPANEL_CEILING_UNCAPPED` + `=== 344_062`（`test/size-budget.test.ts`）。反证：`344,063 → FAIL`（`19-RP-sidepanel-ceiling-fail.log`）→ 还原 → `16/0 PASS`（`20-…-pass.log`） |
| **② 撤销 `SIDEPANEL_CEILING_CAP` 判定作用**（改为纯记录） | `SIDEPANEL_CEILING_CAP_RECORD = 306_099` + `SIDEPANEL_CEILING_CAP_ROLE = 'record-only'`（旧名保留为别名）；判定路径不再读取它。可 FAIL 断言：`evaluateSidepanelSize(306_099 + 1).ok === true` 且 `.ceilingBytes === SIDEPANEL_CEILING`（cap 之上 PASS ⇒ cap 不在判定里）；`insight-archive` / `density-thresholds` / `size-budget` / `size-growth-evidence` 四处同源断言 |
| **② 显式重登记披露登记册** | `SIDEPANEL_RE_REGISTRATIONS`（3 轮：`v3-1` / `v3-1-i6` / `v3-2`），每轮含 **前后值 + 日期 + 来源 + `buildCommand` + `measuredBy` + 理由 + 「断言零删减」台账条目 + 逐字保留的历史值 + 公式候选值**；门禁 `test/size-growth-evidence.test.ts` 断言字段齐备 / 链条首尾相接（`rounds[i].before === rounds[i-1].after`）/ 日期单调 / 末项 == 当前基线 == 实测产物 / `_HISTORY`·TIMELINE 逐字保留 / 台账条目可定位（无悬空） |
| **③ 增长正当性证据** | `SIDEPANEL_GROWTH_BREAKDOWN` + `npm run size:attribution`（`test/size-attribution.mjs`，**可复现**：`--rev cf2af32 --rev 615bd0f`）；门禁 `test/size-growth-evidence.test.ts` 用**真实 esbuild metafile**（`dist/build-meta.json`，由 `build.mjs` 产出）逐模块复核，并断言 47 个输入模块路径互不相同、共享模块只出现一次且 Δ=0、未归因胶水 <1% |
| **④ 方向性守卫（>15% 必须回报）** | `evaluateConsecutiveReRegistrationGrowth()`：同 Feature **连续两轮功能轮**累计增幅 > 15% ⇒ `warning !== null`（文本含「**必须显式回报编排器**」）。**当前状态已触发**：`v3-1`（266,500 → 295,225）+ `v3-2`（295,225 → 327,679）= **+22.96% > 15%**。门禁断言：当前必须触发（`verdict.warning !== null` + 百分比可读）+ **可 FAIL 反证**（合成两轮 +6% 不告警；同数据阈值调到 1% 必须告警；单轮不告警）+ 告警与 `SIDEPANEL_BASELINE_META.consecutiveGrowthAlert` / `docs/v3-density-baseline.json#volume.directionalAlert` **同源** |
| **④ 不变项** | `content.js` 177,076 B 无容差（sha256 `52a82620…`，16/0）；密度阈值 `7/15·9/20·17/35` **逐字未动**；判定链两文件 sha256 不变；`manifest.json` 零新增权限（sha256 `57e6407e…`） |
| **⑤ 密度订正保留** | `docs/v3-density-baseline.json` 的 `risk(staleRef)@{320,400,520}.chars 244 → 254` 订正记录**保留**（裁决 ⑤ 接受）；阈值/口径未动、风险增量归属违规 0、默认档零漂移（22 格机器比对逐格相等） |

**告警原文（门禁实跑输出，`03-npm-test.log`）**：
`⚠️ 体积方向性告警（裁决 V3-VOL-1 ④）：Feature specs-tree-web-cli-plugin-v3-ui 内连续两轮重登记 v3-1（266,500 B → 295,225 B）+ v3-2（295,225 B → 327,679 B）累计增幅 22.96% > 15% —— **必须显式回报编排器**（不得无声膨胀）；累计 +61,179 B；增量构成见 SIDEPANEL_GROWTH_BREAKDOWN。`

### 9.2 `dist` 增量构成分析（327,679 B 由哪些模块构成）

**方法**：esbuild metafile `bytesInOutput`，在**几何完全相同**的两棵沙箱里分别构建 v3-1 树（`git archive cf2af32 packages/web-cli-plugin/src`）与 v3-2 树（`615bd0f`），`absWorkingDir` 深度与 `@lgdl/web-cli-base` 位置一致 ⇒ 模块注释路径长度这一构建噪声在两边相同（实测两棵树 `dist/content.js` 同为 177,440 B；`sidepanel.js` 差值 = **32,454 B**，与登记基线之差**逐字节相等**）。
**复现**：`npm run size:attribution --workspace @lgdl/web-cli-plugin -- --rev cf2af32 --rev 615bd0f`（输出见 `13-…`/`attribution.md`）。

| 模块 | v3-1 B | v3-2 B | Δ B | 类别 | 需求来源 |
|---|---:|---:|---:|---|---|
| `src/ui/sidepanel/l1/panels.ts` | — | 13,729 | **+13,729** | 新必需模块 | FR-V3-031/032/037/038/039 |
| `src/ui/sidepanel/l1/ref-validity.ts` | — | 5,255 | **+5,255** | 新必需模块 | FR-V3-036（五维 + 不确定即失效） |
| `src/ui/sidepanel/l1/ref-store.ts` | — | 3,340 | **+3,340** | 新必需模块 | FR-V3-071/037 |
| `src/ui/sidepanel/l1/receipt.ts` | — | 2,833 | **+2,833** | 新必需模块 | FR-V3-039 + NFR-V3-008/016 |
| `src/ui/sidepanel/l1/local-tree.ts` | — | 658 | **+658** | 新必需模块 | FR-V3-034 |
| `src/insight/ownership-tree.ts` | — | 341 | **+341** | 新必需模块（首次被侧栏引用，**共享** v2 主归属链） | FR-V3-034 |
| `src/ui/sidepanel/sidepanel.ts` | 44,845 | 48,849 | +4,004 | 接线（L1 挂载 + 单一派发器） | FR-V3-031~040 |
| `src/ui/sidepanel/disclosure.ts` | 4,547 | 5,318 | +771 | 接线（白名单 4→9 + 5 条 wiring） | FR-V3-031 |
| `src/ui/sidepanel/view-model.ts` | 17,123 | 17,778 | +655 | 接线（L1 契约纯函数 + staleRef 载体） | FR-V3-031/037/040 |
| `src/ui/sidepanel/l0/risk-rail.ts` | 5,665 | 6,058 | +393 | 接线（失效行可读原因；唯一写入者不变） | FR-V3-037 |
| `src/ui/sidepanel/l0/shell.ts` | 3,351 | 3,376 | +25 | 接线（透传 staleRef） | FR-V3-037 |
| `src/ui/tree/tree-drawer.ts` | 39,779 | 39,887 | +108 | **归因位移**（源码未改） | esbuild 分摊位移 |
| `src/ui/settings/panel.ts` | 37,040 | 37,111 | +71 | **归因位移**（源码未改） | 同上 |
| `src/ui/tree/tree-view.ts` | 21,240 | 21,267 | +27 | **归因位移**（源码未改） | 同上 |
| `src/build-info.ts` | 207 | 212 | +5 | **归因位移**（源码未改） | 同上（**I-04 订正，2026-09-16 修复轮 R2**：本行原记 `232 → 237` —— 该绝对值取自修复轮的**中间版** `test/size-attribution.mjs`（其 `define __BUILD_STAMP__` 与 HEAD 版不同 ⇒ 本模块 `bytesInOutput` 差 25 B，且其 `unattributed` 为 1,751 而非 230），**用 HEAD 版工具不可复现**。现按 HEAD 版工具实测订正为 **`207 → 212`（Δ 不变，仍为 +5）**；复现：`npm run size:attribution --workspace @lgdl/web-cli-plugin --silent -- --rev cf2af32 --rev 615bd0f`（本轮实跑原文：`| src/build-info.ts | 207 | 212 | +5 | GROWN |`、`unattributed runtime glue Δ = 230 B`，日志 `/tmp/opencode/v3-gate-logs/v3-2-fix2-attribution.txt`）。历史值 `232 / 237` 逐字保留） |
| `src/insight/archive-catalog.ts` | 13,175 | 13,179 | +4 | **归因位移**（源码未改） | 同上 |
| `src/ui/settings/view.ts` | 13,222 | 13,225 | +3 | **归因位移**（源码未改） | 同上 |
| `src/ui/sidepanel/markdown.ts` | 13,417 | 13,419 | +2 | **归因位移**（源码未改） | 同上 |
| `src/ui/tree/tree-receipt.ts` | 2,719 | 2,719 | **0** | 共享（**复用非复制**） | 回执语义复用 v2 |
| 其余 28 个模块（含 base SDK） | — | — | **0** | 未变 | — |

**汇总**：新必需模块 **26,156 B**（80.6%）+ 接线 **5,848 B**（18.0%）= **32,004 B（98.6%）**；归因位移 **220 B**（源码未改，仅因新引用者导致 esbuild 分摊变化）+ 未归因运行时胶水 **230 B**（esbuild helper 不归属任何输入）；四类之和 = **32,454 B** = 输出字节增量。
**无重复/冗余代码判据**：① 输入模块 **41 → 47**，路径**互不相同**（esbuild 按路径去重，复制会出现第二份不同路径）；② 共享的 v2 模块 `tree-receipt.ts` **Δ=0**、`tree-model.ts` **Δ=0**（复用而非复制）；③ 源码变更集经 `git diff --name-status cf2af32 615bd0f -- …/src` 核验为 **5 新增 + 6 修改**，与上表「新必需 + 接线」行**一一对应**，归因位移行的源码**不在**变更集内。
**结论**：增长来自本叶 spec 必需模块，**不是**冗余/重复代码。

### 9.3 逐断言反证（注入 → 必须 FAIL → 逐字节还原（sha256 复原）→ PASS）

驱动：`npm run test:l1-reverse`（`test/ui/l1-reverse.mjs`）。**扰动施加在门禁真读的产物上** —— `test/ui/l1.mjs` 载入的就是 `dist/sidepanel.js` / `dist/sidepanel.html`；「扰动后门禁真的失败」本身就是「门禁读的正是这份字节」的证明（非旁路/副本自证；未使用 `/tmp` 副本判据）。日志 `13-rp-l1-reverse.log`。

| 反证 | 断言 | 注入（产物字节级） | FAIL 段证据（门禁 `✖` 行） | sha256 复原 | 还原后 |
|---|---|---|---|---|---|
| RP-L1-A | ⑦ 五维 → **可读原因逐字** | `…目标元素已不存在` 追加 1 字节 | `✖ ⑦ dom-gone → 可读原因指到该维（逐字） — …已不存在X（…） ≠ …已不存在（…）` | ✔ | PASS |
| RP-L1-B | ⑦ **5 个 `unknown` 场景** → 「无法确认…按失效处理」 | `无法确认引用` → `无法核对引用` | 5 条 `✖ ⑦ 不确定场景「…」→ 可读原因写明「无法确认…按失效处理」`（事实缺失/无 resolution/unreachable/歧义/被替换） | ✔ | PASS |
| RP-L1-C | ⑧ **阻断**：失效引用命令发送计数增量 = 0 | 唯一判定权威 `evaluateRefValidity` 恒返回 `valid` | `✖ ⑦ dom-gone → 判定 invalid…`、`✖ ⑧ 失效引用被阻断…` 等（判定权威失效 ⇒ 五维/unknown/阻断同时破） | ✔ | PASS |
| RP-L1-D | ⑧ **非空转对照**：`resolved` 放行计数真的 +1 | `sends += 1` → `sends += 0` | `✖ ⑧ 有效引用可动作（非空转对照：计数真的会动） — {goodAllowed:true,goodSent:true,before:0,…}`（`before` 不再 ≥1） | ✔ | PASS |
| RP-L1-E | ⑨ 恢复路径①「改用描述」打开既有兜底输入 | describe 点击 handler → 空操作 | `✖ ⑨ 「改用描述」走既有 #ask 兜底输入 …fallbackOpen:false…` | ✔ | PASS |
| RP-L1-F | ⑨ 恢复路径②「重新拾取」产生 NEW id + 回到 `valid` | `repick()` 早退 | `✖ ⑨ 「重新拾取」产生 NEW id…`、`✖ ⑨ 恢复后引用回到 valid 态…`（`afterIds:["ref_14"]` 未新增） | ✔ | PASS |
| RP-L1-G | ⑩ 回执三件套「**重拉为真**」（refreshSeq 1 → 2） | `refreshSeq += 1` → `+= 0` | `✖ ⑩ 证据来自真实重拉… — {seq1:0,seq2:0,…}` | ✔ | PASS |
| RP-L1-H | ① **8 类就地展开 ≤1 次交互**（DOM 契约） | `data-l1-panel=` → `data-l1-panel-x=`（8 处） | `✖ ① 恰好 8 个 [data-l1-panel] 且 id 集合与契约一致 — {"ids":[],…}` + 8 条逐类展开 `✖` | ✔ | PASS |

**纵深防御观察（诚实记录）**：阻断是**双层**实现（panels 侧 `isRefUsable` + ref-store 侧 `dispatch` 重新判定）。首次尝试只关掉 ref-store 一层（`if (view.verdict !== "valid")` → `if (false)`）时门禁**仍 PASS**（`13-rp-l1-reverse-round0.log`）—— 这本身是「第二层独立生效」的证据；RP-L1-C 因此从**判定权威单点**入手（两层同时失效）。
**`unknown` 非空转对照（独立可复现）**：门禁 ⑧ 段对**同一引用**先 `resolved`（放行，`commandSends` +1）再 `missing`（阻断，计数不变）；本轮的 RP-L1-D 正是它的**可 FAIL 反证**（把计数递增拿掉 → 对照立刻红灯）。复现：`node test/ui/l1.mjs`（⑧ 段输出含 `before/after` 计数）。
**最终产物复原核对**：反证结束后 `dist/sidepanel.js` / `dist/sidepanel.html` sha256 与原始构建**逐字一致**（驱动内置 final check）。

**既有反证复跑（一套）**：

| 反证 | FAIL 段 | 还原后 | 日志 |
|---|---|---|---|
| RP-V3-01（+1 可点元素） | `C1 8 > 7` → 门禁 FAIL，6 断言中 FAIL 段命中 | 还原 → 6/0 PASS | `14-RP-V3-01.log` |
| RP-V3-03（CSS 隐身不计豁免 / hidden=true 才降 1） | 4 变体对照 | 10/0 PASS | `14-RP-V3-03.log` |
| RP-V3-04（风险行移入 L1 → AC-V3-008/009 必须 FAIL） | 移入 hidden 后断言 FAIL | 5/0 PASS | `14-RP-V3-04.log` |
| RP-V3-05（删 1 条断言） | `--files-override` 副本 `67 < 台账下界 68 —— 删除断言未登记`，exit=1 | 逐字节副本 `68 ≥ 68` → 11/0 PASS；原 `test/ui/l0.mjs` sha256 `3fefa133f05df46e0d0c83909d38439208e0b3ba53841f4d05f12041f3b0a23f`（含本轮 **V32-S11 纯插入**去抖，见 §9.6.6）未变 | `15-…-fail.log` / `16-…-pass.log` |
| RP-V3-06（`content.js` +1 B） | `177,077 > 177,076` → 2 条 FAIL，exit=1 | 还原 `177,076` / sha256 `52a82620…` → 16/0 PASS | `17-…-fail.log` / `18-…-pass.log` |
| RP-V3-08（篡改真基线） | 比对 FAIL（可读诊断） | sha256 复原 → 8/0 PASS | `14-RP-V3-08.log` |
| RP-V3-09（风险位 CSS 隐身探针） | 各隐身变体 FAIL | 10/0 PASS | `14-RP-V3-09.log` |
| I1（还原 pre-fix 早退分支） | `test:l0` **156/1 FAIL**：`✖ ② I1：无卡态第二次 render 后 #l0-more 仍 hidden… {"moreHidden":false,…}` | `decision-card.ts` sha256 `2e14e49d…` 复原 + 重建 `327,679` → **157/0 PASS** | `22-I1-fail.log` / `24-I1-pass.log` |
| RP-V3-VOL-1①（**新增**：公式 ceiling +1 B） | `344,063 > 344,062`（`超出 1B`，诊断点名「公式判定，无 cap」）exit=1 | 还原 `327,679` / sha256 复原 → 16/0 PASS | `19-…-fail.log` / `20-…-pass.log` |

### 9.4 门禁结果（严格串行，一次一个；全绿）

| # | 门禁 | 结果 | 计数（对照 v3-1 / v3-2 建设轮） | 日志 |
|---|---|---|---|---|
| 1 | `npm run typecheck` | ✅ exit=0 | 0 error | `01-typecheck.log` |
| 2 | `npm run build` | ✅ exit=0 | `content.js` 177,076 · `sidepanel.js` 327,679 | `02-build.log` |
| 3 | `npm test` | ✅ exit=0 | **754 / 754 / 0 failed**（743 → 只增） | `03-npm-test.log` |
| 4 | `npm run test:supersession` | ✅ exit=0 | **11 / 0** | `04-supersession.log` |
| 5 | `npm run test:density` | ✅ exit=0 | **127 / 0**（127 → 不变）· 三档 × 三视口全 PASS · 22 格机器比对零漂移 · 产物 327,679 ≤ 上限 344,062 | `05-density.log` |
| 6 | `npm run test:l0` | ✅ exit=0 | **157 / 0** | `06-l0.log` |
| 7 | `npm run test:l1` | ✅ exit=0 | **88 / 0** | `07-l1.log` |
| 8 | `npm run test:ui`（journey） | ✅ exit=0 | **167** assertions | `08-ui-journey.log` |
| 9 | `npm run test:insight` | ✅ exit=0 | **108** assertions | `09-insight.log` |
| 10 | `npm run test:binding` | ✅ exit=0 | **192** assertions | `10-binding.log` |
| 11 | `npm run test:hardening` | ✅ exit=0 | **24** assertions | `11-hardening.log` |
| 12 | `npm run test:e2e` | ✅ exit=0 | PASS | `12-e2e.log` |
| 13 | 体积三线 | ✅ | `content.js` **177,076**（sha256 `52a826205553b46a896ccad54225d63ba62f5f7fe7c969a9bc2e655448d5b5f6`，无容差/不可重登记）；`sidepanel.js` 实测 **327,679** = 登记 **327,679** ≤ ceiling **344,062**（= `floor(327,679 × 1.05)`，容差 5%）；`sidepanel.js` 本次构建 sha256 `1bdcdd591f7f29e804159f14d60914568dc9c0ab77ed756b377807faf7badf0a`（**随构建戳变化，字节数恒定** —— 见 §9.6.4） | `00-exitcodes.txt` |
| 14 | 零改动核对 | ✅ | `manifest.json` `57e6407e…` · `src/content/**` 三 hash `a7290031…` / `7df782b3…` / `5737c40a…`（与 pin 逐字相同）· `src/security/{policy,auto-authorize}.ts` `bfcb2ede…` / `1096d065…` · `packages/web-cli-base/**` / `design/**` / `main` 工作区零改动 | `00-exitcodes.txt` |
| 15 | 反证全套复跑 | ✅ | RP-V3-01/03/04/08/09 + RP-V3-05 + RP-V3-06 + I1 + **RP-L1-A~H（本叶新反证）** + RP-V3-VOL-1① 全部 PASS（见 §9.3） | `13-…` ~ `24-…` |
| 16 | 人工面 | ⏳ **未执行** | 展开动画体感 / 引用高亮体感 / 读屏真实体感 —— 如实登记，不冒充 PASS | — |

**密度三档 × 三视口（`05-density.log` 阶段 E 原文）**：`default 320/400/520 = 7/7 · 7/15 · 19 块 · 6 区 PASS`（**默认档与登记值逐格相等，零漂移**）；`firstRun 320/400/520 = 7/9 · 12/20 · 25 · 6 PASS`；`risk worst = 9/17 · 13/35 · 25 · 6 PASS`；几何下界实测 495px ≥ 登记 488px。

### 9.5 红线核验

| 红线 | 结果 |
|---|---|
| 不改 `main` / v1 SDDU / 已收口 v2 SDDU | ✅ 零改动（`main` 未动） |
| v3-1 已验收产物「只增不减」 | ✅ 全部为**只增**：`test/ui/l0.mjs` 本轮**纯插入**一段「篡改前等 DOM 静默」的去抖（`V32-S11`，零删除行、`check(` 计数仍 68 == 台账下界；原因见 §9.6.6）；`l1.mjs` / `journey.mjs` / `binding.mjs` 未改；density.mjs 仅**追加注释**（零删除行）；对 size-baseline / size-budget / insight-archive / density-thresholds 的改动均为**方向敏感重 pin + 新增断言**（台账 `V32-S6` / 重记条目明列） |
| `packages/web-cli-base/**` / `src/content/**` 三冻结文件 / 判定链两文件 / `manifest.json` 权限段 / `.opencode/opencode.json` / `design/**` | ✅ 零改动（sha256 见 §9.4/14） |
| 冻结用 sha256 内容 pin（**未用** `git diff --quiet HEAD`） | ✅ 体积/源码/权限/判定链全部 sha256 核对 |
| 门禁串行 | ✅ 一次一个（`run-main-gates.sh` 顺序执行，逐条 exit code 落盘） |
| **禁 `git add -A`** | ✅ 逐文件 path-limited `git add` |
| 无新增依赖 | ✅ `package.json` 依赖段零 diff（仅 scripts 追加 `test:l1-reverse` / `size:attribution`） |
| 未新增权限 | ✅ `manifest.json` sha256 `57e6407e…` 未变 |
| 主界面无常驻输入框 | ✅ `#ask` 兜底输入默认 hidden、无新增输入控件（`l1-reverse` RP-L1-E 覆盖） |
| 风险位仍不可折叠 | ✅ `#risk-rail` 仍在 `disclosure.ts` 白名单外、`assertFoldable` 仍抛错；RP-V3-04 复跑 PASS（把风险行移入折叠容器 → 断言必 FAIL） |
| 计数只增不减 | ✅ npm test 743 → **754**；l0 157 → 157；density 127 → 127；l1 88 → 88；supersession 11 → 11；journey/insight/binding/hardening 不变；台账 `staticCalibers` readings 754/765/858（≥ 646 下界） |
| 推送方式 | ✅ `git push https://github.com/THZSummer/LGDL.git HEAD:refs/heads/feature/web-cli-plugin`（不改 remote、不 force push） |

### 9.6 本轮未完成 / deferred / 风险项

1. **人工面 3 项**（展开动画 / 引用高亮 / 读屏体感）：⏳ 未执行（如实登记；无自动化替代）。
2. **A6 known limitation**（每格新开面板页以彻底消除 `#notice` 干扰）：仍登记为已知限制，**未改 `src/**`**（裁决 ⑥ 留后续叶统一裁决）。
3. **density 阶段 F 旧指针**（检查名/注释指向 `V31-S12`）：以 V32-S10 纯追加注释纠正，未删改 v3-1 既有行（见 §8.4）。
4. **`sidepanel.js` sha256 随构建戳变化**：`__BUILD_STAMP__` 注入 ISO 时间戳 ⇒ 每次 build 的 `sidepanel.js` **sha256 不同但字节数恒定**（327,679）；体积判据是**字节数**（登记值 == 实测产物），源码/权限/判定链/`content.js` 才用 sha256 pin。
5. **方向性告警仍是告警而非红灯**：按裁决 ④ 的措辞「可读告警**或**断言」实现为「必须存在且可 FAIL 的告警 + 同源登记」，不阻断交付；若编排器希望它升级为**硬失败**（阻断提交），属下次裁决。
6. **`test/ui/l0.mjs` 去抖纯插入（台账 `V32-S11`，需 review 关注）**：⑥b 的内联反证（篡改 `data-count` → **立刻**复读）在 CPU 争用下会与一次尚未完成的重渲染赛跑（重渲染把常驻计数写回 ⇒ 篡改在复读前被还原 ⇒ **负载相关假红** `[]`）。修复轮的串行链实测出现 **1 次**（`06-l0.log` 那一轮：156/1），单跑 3/3 与去抖后 2/2 均绿。处理方式 = 在篡改前**纯插入**一段「等 `#l0-statusbar` 子树 DOM 静默（MutationObserver + 200ms 静默 + 1500ms 硬上限，绝不挂死）」。**判据本体、断言数量、阈值与 `check(` 计数（68 == 台账下界）均未改动**；因插入导致 `l0.mjs` sha256 由 `4b7b580d…` 变为 `3fefa133…`（历史值保留在 v3-1 报告与本 §9 记录中）。
7. **`binding.mjs` 一次瞬时红 + 退出码疑点（预先存在，非本叶引入，需编排器/后续叶关注）**：修复轮的**第二轮**串行链中 `binding` 出现 3 条瞬时失败（`#3d discovery 走到 supported` / `#3e 活跃站点 origin 正确` / `#3f 站点工具面已装配`，依赖 `http://localhost:5173` 站点发现握手，疑似 SW/注入就绪竞态），但该轮 `$?` 记到 **0**（**门禁把 FAILED 打成了绿**）。随后**独立复跑 4 次（1 直跑 + 3 循环）全部 PASS 192/192 exit=0**，最终串行链亦 PASS 192/192（`10-binding.log`，`✖` 计数 0）。本叶**未**改动 `test/ui/binding.mjs`（v2 已验收门禁、含 `protectedRanges` 字节 pin）；「失败未传播到退出码」是**该门禁自身的完整性疑点**，如实登记、不在本叶修复范围内，建议后续叶专门核查（复现线索：失败轮日志 `10-binding.log` 以 `binding FAILED (3)` 结尾且**未**出现 `诊断已落盘` 行，随后进程以 0 退出）。
8. **`dist/` 为 gitignored 产物**：体积/复现证据以「字节数 + sha256」记录，但 `sidepanel.js` 的 sha256 随构建戳变化（§9.6.4），故体积类判据一律以**字节数**为准（`content.js`/`manifest.json`/判定链/`src/content/**` 才用 sha256 内容 pin）。


## 10. 修复轮 R2（2026-09-16，review R1 的 F-01 + I-01~I-10 处置）

> 本轮 = 「修 F-01（门禁不可 FAIL 的跨叶真缺陷）+ 新增**元门禁**防复发 + I-01~I-10 逐条处置 + 全门禁与反证全重复跑至绿」。
> 日志目录：`/tmp/opencode/v3-gate-logs/v3-2-fix2/`（**全量落盘，无 tail 截断丢弃原文**）。

### 10.1 F-01 修复：`test/ui/binding.mjs` 的失败必须传进退出码

**根因（review §2 已定位，本轮复核一致）**：`await dumpDiagnostics(...)` 先于 `process.exit(1)`；
`dumpDiagnostics → captureRuntimeSummary → evaluate → connectCdp().send()` 对 **CLOSED** 的 CDP
socket **永不 settle**（消息永不到达、`ws.send()` 也不抛）⇒ `exit(1)` 不可达 ⇒ 事件循环耗尽后 Node
以 **0** 自然退出 ⇒ **断言失败被打成绿**。

**四条最小修复（全部为纯插入；相对 base `c2c0e0d` 仍 0 删除行；`check(` 计数 192 不变；未放宽任何断言）**：

| # | 落点（文件:行，修复后编号） | 内容 |
|---|---|---|
| ① | `test/ui/binding.mjs:2334`（断言失败分支）· `:2345`（`main().catch`） | `process.exitCode = 1;` **提到** 两处 `await dumpDiagnostics(...)` **之前** —— 退出码在任何可能挂死的 await 之前定死 |
| ② | `test/ui/binding.mjs:139-156`（`dumpDiagnostics`） | 诊断自带 **15s 硬上限**：`const __hardStop = setTimeout(() => { …; process.exit(1); }, 15_000);` + `finally { clearTimeout(__hardStop); }` ⇒ 被 await 的调用**自终止**，永不无限挂起 |
| ③ | `test/ui/binding.mjs:181-206`（`connectCdp`） | `send()`：`readyState !== 1` **直接拒答**；每次请求 **20s 超时拒答**（结算后 `pending.has(id)` 为假 ⇒ 计时器空转，`unref()` 不持有事件循环）；socket `close` **立刻拒结全部 pending**（`ws.addEventListener('close', …)`） |
| ④ | 验收（实跑，原文见 10.2） | 副本强制 1 条必红断言 → **退出码必须非 0**；还原（sha256 逐字）→ PASS 192 / 退出码 0 |

### 10.2 F-01 动态证伪（原文留证）

**强制变红**（在 `test/ui/binding.mjs` 的副本上把 `AP#7` 的期望改成 `false && …`，其余逐字节相同）：

```text
$ python3 …  # check(false && (rr.tools ?? []).includes('site_delayed-status'), 'AP#7 …')
$ timeout 900 node test/ui/binding.mjs > /tmp/opencode/v3-gate-logs/v3-2-fix2/f01-forced-red.log 2>&1; echo $?
1
$ tail -12 f01-forced-red.log
binding FAILED (4):
  - #3d discovery 走到 supported（well-known / html-link / handshake）
  - #3e 活跃站点 origin 正确
  - #3f 站点工具面已装配（site_lgdl-web-cli）
  - AP#7 延迟就绪后站点工具面自动装配
✖ binding 诊断已落盘（完整栈 + DOM 摘要）：/tmp/opencode/r2-3/logs/binding-diagnostics-1789520473394.log
{
  "sw": "ERR:CDP socket not open (readyState=3): Runtime.evaluate",
  "unauth-page": "ERR:CDP socket not open (readyState=3): Runtime.evaluate",
  "panel": "ERR:CDP socket not open (readyState=3): Runtime.evaluate",
  "panel-phase1": "ERR:CDP socket not open (readyState=3): Runtime.evaluate",
  "panel-autoprobe": "ERR:CDP socket not open (readyState=3): Runtime.evaluate"
}
EXIT=1
```

> **对照**：修复前同一注入的实测是 `binding FAILED (4)` + **EXIT=0**（review §2.2 实验 C）。
> 现在失败**真的**打进退出码（`EXIT=1`）。

**「诊断已落盘」修活**：历史上该设施自加入起**一次也没成功过**（review §2.2 旁证）。本轮实跑中它**真的落盘**：

```text
✖ binding 诊断已落盘（完整栈 + DOM 摘要）：/tmp/opencode/r2-3/logs/binding-diagnostics-1789520473394.log
$ ls -l /tmp/opencode/r2-3/logs/
-rw-rw-r-- 1 usb usb 3037 Sep 16 09:01 binding-diagnostics-1789520473394.log
```

并且摘要里的 `ERR:CDP socket not open (readyState=3)` 正是 ③ 的机制在起作用 —— 原先的「静默挂死」变成了**明确拒答**（于是诊断得以继续、文件得以落盘）。

**还原后必须仍 PASS**：

```text
$ cp <pristine> test/ui/binding.mjs && sha256sum -c …          # 62e5ad0dc5478ce7253fd85b820a56425302289342c865bc1523181cddec9e93  test/ui/binding.mjs: OK
$ timeout 900 node test/ui/binding.mjs …; echo $?
0
$ tail -2 f01-restored-pass.log
binding PASS — 192 assertions：真实 dist + 真实 http://localhost:5173 + mock LLM，…
EXIT=0
```

> **如实登记（本轮实测到的既有抖动）**：强制变红那一轮除注入的 `AP#7` 外，**还**出现 `#3d/#3e/#3f` 三条
> 站点发现握手相关的瞬时失败（修复前同轮只出现 1 条注入失败 —— 抖动本就在，只是此前被「失败打成绿」掩盖）。
> 还原后单跑 **PASS 192 / 0 ✖**；串行链 `10-binding.log` 亦 **192 PASS / exit=0**。该抖动即 `§9.6.7` 登记的已知项，
> 未在本轮修复范围内（属站点/SW 就绪竞态，非断言逻辑）。

### 10.3 元门禁（新增，防这类缺陷再回来）

**文件**：`test/gate-integrity.test.ts`（无 Chromium，`npm test` 内自动运行；另有 `npm run test:gate-integrity` 供串行链单跑）。

**受审集合**：8 个 Chromium 门禁（`test/ui/{journey,insight,binding,l0,l1,density,hardening}.mjs` + `test/e2e/fullchain.mjs`）
+ `test/ui/l1-reverse.mjs`（反证驱动）+ `test/ui/_v3-helpers.mjs`（共享 CDP 客户端）= **10 个文件**；
「集合完整」本身受断言（改名/删除 ⇒ 元门禁失败；`CHROMIUM_GATES.length === 8`）。

**三条静态检测（+1 条派生）实现**：

| 规则 | 判据（结构化） | 失败示例 |
|---|---|---|
| **R1a** 退出码优先 | 对每个 `process.exit(` / `process.exitCode =` 语句 i：取其**最近的前一条实质语句** j，若 j 是独立 `await` 语句，则必须 ① 该 await 被显式限时（`Promise.race/all/allSettled(`）**或** ② j 的前一条实质语句是非零退出码赋值（`process.exitCode = 1` / `process.exit(1)`） | F-01 历史形态（`await dumpDiagnostics(...)` 直接挡在 `process.exit(1)` 前）必须命中 |
| **R1b** 诊断必须**有界** | 凡依赖 ①-b 逃生条款（「退出码已定死」）的独立 `await callee(...)`：`callee` 在同文件内的函数体必须安装 `setTimeout(... process.exit(...))` 硬上限 | «把 `dumpDiagnostics` 的 `setTimeout` 拿掉» 必须命中 |
| **R2** 失败计数 ↔ 退出码 | 含 `FAILED (` / `failures.push(` / `✖ ` 的文件必须存在显式退出路径（`process.exit(1)` / `process.exitCode = <非零>` / `finish()` + 其 `_v3-helpers.mjs` 失败分支同步 `process.exit(1)`） | «有 `FAILED (2)` 但无任何退出码路径» 必须命中 |
| **R3** CDP send 有界 | 每个 `send(method, params…)` 实现体（1400 字窗口）必须含 `readyState` **且** 含 `setTimeout(`；文件必须含 `addEventListener('close', … reject(` | «无界 send» 必须命中 **R3×3** |

**自身的反证（元门禁必须能 FAIL）**：

```text
$ # ① 合成夹具：F-01 历史形态 → 必须命中 R1a；已防御形态 → 不得误报；无界 dumpDiagnostics → 必须命中 R1b
$ # ② 真实脚本副本注入：把「await 挡在退出码之前」注入 /tmp 副本（不动仓库文件）→ 审计必须报红
$ SDC_GATES_ROOT=/tmp/opencode/v3-gate-logs/v3-2-fix2/meta-inject node --test dist-test/test/gate-integrity.test.js; echo $?
1
$ grep -A2 "R1a" 96-meta-gate-negative.log
✖ 元门禁 R1a/R1b/R2/R3：真实门禁脚本全部通过（…）
    test/ui/binding.mjs:2337 [R1a] 第 2336 行的独立 await 挡在退出码赋值之前且未加超时（前一行：await sleep(1);）
$ node --test dist-test/test/gate-integrity.test.js; echo $?      # 真实根 ⇒ PASS（6/6）
0
```

**动态证伪覆盖（如实登记，不冒充全量）**：

- **有真实动态证伪**：`test/ui/binding.mjs`（§10.2 的 F-01 反证：强制变红 → exit=1 → 还原 → PASS 192）；`test/ui/l1.mjs`（`RP-L1-A~H + RP-L1-C2` 九条，每条 `FAIL 段 exit=1` + sha256 逐字还原 + 还原后 PASS）。
- **仅静态覆盖（元门禁硬编码登记为 `STATIC_ONLY_GATES`，并在日志里打印）**：`journey.mjs` / `insight.mjs` / `l0.mjs` / `density.mjs` / `hardening.mjs` / `e2e/fullchain.mjs`。为它们逐个做「强制变红」需要各一次 Chromium 实跑（~4 min / 次、内存 ~1.5 GB 串行约束）—— **本轮未执行**，故不声称已动态证伪。

**CDP 客户端加固覆盖面（R3 全绿）**：`binding.mjs` / `journey.mjs` / `insight.mjs` / `hardening.mjs` / `e2e/fullchain.mjs` / `_v3-helpers.mjs`（l0/l1/density 共用）= **6/6 全部**加 `readyState` + 20s 超时 + `close` 拒结（均为纯插入、断言与判据零改动）。其中 `hardening.mjs` 与 `e2e/fullchain.mjs` 原属台账 `zeroDiffFiles`（v3-1 登记的「零改动」集合）—— 为满足用户对**所有** CDP `send()` 的加固要求，二者已**显式移入 `pureAdditionFiles`** 并逐条登记（`V32-S13`/`V32-S14`，各 +16/-0 行）。**红线未后退**：`zeroDiffFiles` 里真正的红线文件（`src/content/**` 三冻结文件、`src/security/{policy,auto-authorize}.ts`、`manifest.json`、`options.html`、`sidepanel-view.test.ts`、`perf-budget.test.ts`）**全部保留且仍为 0 行 diff**（`04-supersession.log` 绿）。

### 10.4 I-01~I-10 逐条处置

| # | 级别 | 处置 | 证据 |
|---|:--:|------|------|
| I-01 | 中 | ✅ **已修**：`test/ui/l1.mjs` 的恒真占位断言 `check(…, true, …)` → **真断言**（注入快照后局部树必须是主归属链**尾部切片**：当前节点在末位、祖先在前、超上限标记 `truncated`、`empty === false`）。**未删除任何断言**（`check(` 调用点数 55 → 60，只增）；括注的错误指针（「由 ⑫ 覆盖」）一并订正 | `07-l1.log` 99/0；`RP-L1-C2` 与 ⑪ 段断言同段可 FAIL |
| I-02 | 中 | ✅ **已修（结构 pin + 动态证伪；行为型不可观测已机器证明）**：内层 `ref-store.dispatch` 的 guard 在**产品唯一调用点**下与外层 `isRefUsable` 同源同参（同一 `evaluateRefValidity`、同一 env、同一 record，且外层先判先返回）⇒「只弱化内层」**行为不可观测**。因此运行时 pin 落在产物字节：⑧ 段新增 2 条（guard 存在且唯一 + guard 位于唯一 `sends += 1` 之前），**并新增 `RP-L1-C2` 把可失败性做实**（只把内层 guard 改成 `if (false)` ⇒ 门禁 ⑧ 立刻 FAIL，`FAIL 段 exit=1`） | `13-rp-l1-reverse.log`：`RP-L1-C2 → exit=1`，`✖ ⑧ 内层阻断 guard 在产物字节中存在且唯一 … guardHits=0`；`✖ ⑧ 内层 guard 位于唯一的 sends += 1 自增之前 … guard@-1`；行为侧另有 `test/l1-ref-validity.test.ts` 的 Node 运行时用例 |
| I-03 | 中 | ✅ **已修**：本叶 `spec.md` NFR-V3-005 按**与前两轮相同的方式**显式订正（`~~306,099 B~~ → **344,062 B**`、`~~295,225 B~~ → **327,679 B**`，注明「经裁决 V3-VOL-1 订正 / cap 降级为纯记录 / 四条替代守卫」，历史值 279,825·306,099·266,500·295,225 **逐字保留**）；**父 `spec.md`（3 处）与父 `plan.md`（5 处）同步订正** | 见 §10.5 |
| I-04 | 低 | ✅ **已修**：`build.md §9.2` 的 `src/build-info.ts` 行原记 `232 → 237`（来自修复轮**中间版**工具，HEAD 版不可复现）→ 按 HEAD 版工具实测订正为 **`207 → 212`（Δ 不变 = +5）**，并注明工具版本/命令与历史值；附本轮实跑原文 | `npm run size:attribution --silent -- --rev cf2af32 --rev 615bd0f` → `| src/build-info.ts | 207 | 212 | +5 | GROWN |`、`unattributed … = 230 B`（`v3-2-fix2-attribution.txt`） |
| I-05 | 低 | ✅ **已修**：`build.md §1` 的「修改文件 13」→ **17**（建设轮 13 + 修复轮 4），并在 §2.2 补 4 行回填表（`build.mjs` / `density-thresholds.test.ts` / `ui/density.mjs` / `ui/l0.mjs`，各注轮次与内容）；口径来源 `git diff --stat e45ca53..HEAD` = 10 新增 / 17 修改 | build.md §1 / §2.2 |
| I-06 | 低 | ✅ **已修**：`docs/v3-density-baseline.json#volumeBaselineSeparation.note` 的 v3-1 陈述（295,225 / 306,099「未被抬高」）显式订正为裁决后的状态（327,679 / `floor(327,679×1.05)` = 344,062 / cap record-only / 四守卫），历史值逐字保留；`feature` 字段由 v3-1 叶名订正为父 Feature 名（多叶共用，历史值保留于字段内） | `docs/v3-density-baseline.json`（`05-density.log` 读 `volume` 段仍逐格相等） |
| I-07 | 低 | ✅ **已修**：`l1.mjs` ① 段把**已采集但弃用**的 `trigger.getAttribute('aria-expanded')` 改为显式判据（8 类各一条：点击后 `aria-expanded === 'true'`） | `07-l1.log`（断言 88 → 99，含 8 条 `aria-expanded` 断言） |
| I-08 | 低 | ✅ **已修**：补 **EC-V3-015** 直接断言（⑧ 段后新增一节）：强制 `confirm` 风险 → `collapseAll()` → 断言「8 个 `[data-l1-panel]` 全 hidden」+「确认卡可见 + 其选项全可见」+「`#risk-rail` 可见 + 其 `confirm` 风险行可见 + 风险位不在任何折叠容器内」 | `07-l1.log`（`EC-V3-015 确认期间折叠披露层后…` PASS） |
| I-09 | 低 | ⏭️ **deferred（附理由）**：`ref-store.reset()` / `testing.reset()` 是**测试/夹具级复位**，**生产路径不调用**（`grep -rn "\.reset()" src/` 仅命中 `sidepanel.ts:366/368`（`setRisk('staleRef')` 夹具）与 `:446`（`__v3.testing.reset()`）），真实会话切换走 `session-switch` 消息且**不触碰引用存储**；引用有效性在 origin/session 变化时由 `judge()` 经 D2 维度判 `invalid`（不静默丢弃）。故 EC-V3-007「不得静默丢弃」在**会话切换**面上不存在需要补提示的生产路径。若编排器判定仍需 UI 提示，属产品改动（新增文案 = 改 `dist/sidepanel.js` 字节 + 体积重登记），建议单独裁决 |
| I-10 | 低 | ✅ **已修**：`_v3-helpers.mjs` 的 `send()` 同法加固（并扩大到**全部 6 个** CDP 客户端：`binding` / `journey` / `insight` / `hardening` / `e2e/fullchain` / `_v3-helpers`）—— 见 §10.3 | 元门禁 R3 全绿（`13-gate-integrity.log`） |

### 10.5 I-03 体积 AC 订正原文（diff；历史逐字保留）

```diff
# .sddu/…/specs-tree-v3-2-l1-disclosure-refs/spec.md（NFR-V3-005）
- | **NFR-V3-005** | `sidepanel.js` ≤ ~~279,825~~ → **306,099 B**（基线 ~~266,500~~ → **295,225 B**）（基线 266,500）；… cap 只降不升） |
+ | **NFR-V3-005** | `sidepanel.js` ≤ ~~279,825~~ → ~~306,099 B~~ → **344,062 B**（基线 ~~266,500~~ → ~~295,225 B~~ → **327,679 B**）（基线 266,500）；…
+   （**裁决订正 2026-09-16，经裁决 V3-VOL-1 订正**：`~~306,099 B~~ → **344,062 B**`（= `floor(327,679 × 1.05)`）、
+   `~~295,225 B~~ → **327,679 B**`（实测产物）；**cap 已降级为纯记录**（`SIDEPANEL_CEILING_CAP_ROLE = 'record-only'`，不参与判定；
+   值 306,099 保留为历史记录）；**判定 = 公式 ceiling + 四条替代守卫**（① 公式 `floor(baseline × 1.05)`；② 显式重登记登记册；
+   ③ 增长正当性证据（逐模块归因）；④ 同 Feature 连续两轮 >15% 方向性告警，**当前已触发 +22.96% 并已回报编排器**）。
+   历史值 279,825 / 306,099 / 266,500 / 295,225 逐字保留；容差 5% 未变、阈值 7/15·9/20·17/35 未动、断言零删减） |
```

- **历史行是否逐字保留**：✅ 是 —— 原文的 `（基线 266,500）`、`（**开工订正 2026-09-16**：… cap 只降不升）` 与所有 `~~旧值~~` 均**原样保留**，新订正以**追加**的方式接在其后（与前两轮 `279,825 → 306,099`、`266,500 → 295,225` 的写法一致）。
- **父 spec / 父 plan 同步**：父 `spec.md` 3 处（§4 体积行 / §NFR-V3-005 / §AC-V3-016，各追加同一条订正括注）、父 `plan.md` 5 处（§体积（硬）/ §C 段 / §预估增量 / §R3-04 / §体积重登记条目）。均只**追加**订正、原文逐字保留。

### 10.6 门禁结果（严格串行，一次一个；**全绿**）

| # | 门禁 | 退出码 | 计数（对照 v3-2 修复轮 R1） | 日志 |
|---|---|---|---|---|
| 1 | `npm run typecheck` | ✅ 0 | 0 error | `01-typecheck.log` |
| 2 | `npm run build` | ✅ 0 | `content.js` **177,076**（不变）· `sidepanel.js` **327,679**（不变） | `02-build.log` |
| 3 | `npm test` | ✅ 0 | **760 / 760 / 0 failed**（754 → 只增，+6 元门禁） | `03-npm-test.log` |
| 4 | `npm run test:supersession` | ✅ 0 | **11 / 0** | `04-supersession.log` |
| 5 | `npm run test:density` | ✅ 0 | **127 / 0**（不变）· 三档 × 三视口全 PASS · 22 格零漂移 · 产物 327,679 ≤ 344,062 | `05-density.log` |
| 6 | `npm run test:l0` | ✅ 0 | **157 / 0** | `06-l0.log` |
| 7 | `npm run test:l1` | ✅ 0 | **99 / 0**（88 → 只增，+11：8×aria + I-02×2 + EC-V3-015×1） | `07-l1.log` |
| 8 | `npm run test:ui`（journey） | ✅ 0 | **167** assertions（不变） | `08-ui-journey.log` |
| 9 | `npm run test:insight` | ✅ 0 | **108** assertions（不变） | `09-insight.log` |
| 10 | `npm run test:binding` | ✅ 0 | **192** assertions（不变，`✖ 0`，**exit=0 现在真的是证据**） | `10-binding.log` |
| 11 | `npm run test:hardening` | ✅ 0 | **24** assertions | `11-hardening.log` |
| 12 | `npm run test:e2e` | ✅ 0 | PASS | `12-e2e.log` |
| 13 | **`npm run test:gate-integrity`（新增）** | ✅ 0 | **6 / 6 / 0**（元门禁） | `13-gate-integrity.log` |
| 14 | 体积三线 | ✅ | `content.js` **177,076**（sha256 `52a826205553b46a896ccad54225d63ba62f5f7fe7c969a9bc2e655448d5b5f6`，无容差）；`sidepanel.js` **327,679** = 登记值 ≤ ceiling **344,062** | `00-exitcodes.txt` |
| 15 | 零改动核对 | ✅ | `manifest.json` `57e6407e…` · `src/content/**` `a7290031…`/`7df782b3…`/`5737c40a…` · 判定链 `bfcb2ede…`/`1096d065…`（全部与 pin 逐字相同）；`web-cli-base/**` / `design/**` 工作区零改动 | `00-exitcodes.txt` |
| 16 | 反证全套 | ✅ | RP-L1-A~H + **RP-L1-C2** 9/9（`13-rp-l1-reverse.log`，`EXIT=0`，末行「最终产物复原核对 ✔」）· RP-V3-01（6/0）· RP-V3-03（10/0）· RP-V3-04（5/0）· RP-V3-08（8/0）· RP-V3-09（10/0）· RP-V3-05（`67 < 68 —— 删除断言未登记` exit=1 → 逐字节副本 `68 ≥ 68` exit=0）· RP-V3-06（`177,077 > 177,076` 3 条 FAIL exit=1 → 还原 sha256 后 760/0 exit=0）· I1（预修复形态 → l0 **155/2** exit=1 → 还原 `decision-card.ts` sha256 `2e14e49d…` → **157/0** exit=0）· **F-01 反证**（10.2）· **元门禁反证**（10.3） | `13-…`~`97-…` |
| 17 | 人工面 | ⏳ **未执行** | 展开动画体感 / 引用高亮体感 / 读屏真实体感 —— 如实登记，不冒充 PASS | — |

**计数只增不减核对**（对照用户给出的基线）：插件 **754 → 760** ✅ · supersession **11 → 11** ✅ · density **127 → 127** ✅ · l0 **157 → 157** ✅ · l1 **88 → 99** ✅ · journey **167 → 167** ✅ · insight **108 → 108** ✅ · binding **192 → 192** ✅ · hardening **24 → 24** ✅ · **新增** gate-integrity **6**；台账 `v3GateFloors.l1.mjs` 55 → **60**、`counts.nodeTestRuntime` 754 → **760**、`staticCalibers.readings` 754/765/858 → **760/771/884**（70 份文件）。

### 10.7 红线核验（本轮）

| 红线 | 结果 |
|---|---|
| 密度阈值恒 `7/15·9/20·17/35` | ✅ `test/ui/density-metrics.mjs` **零改动**（`git status` 无该文件；`05-density.log` 三档 × 三视口全 PASS、默认档零漂移） |
| `content.js` 177,076（无容差、三冻结文件零改动） | ✅ 实测 **177,076**、sha256 `52a82620…` 不变；`src/content/**` 三 hash 逐字不变 |
| `manifest.json` 零新增权限、无 `contextMenus` | ✅ sha256 `57e6407e…` 不变（`04-supersession.log` 的 `zeroDiffFiles` 绿） |
| 判定链 sha256 不变 | ✅ `policy.ts=bfcb2ede…`、`auto-authorize.ts=1096d065…` |
| 测试只增不减、断言只强不弱 | ✅ 计数全部只增（见 10.6）；I-01 的恒真断言换成**真断言**（未删）；l1 `check(` 55 → 60 |
| 风险位仍 L0 常驻不可折叠 | ✅ `#risk-rail` 仍在 disclosure 白名单外；RP-V3-04（把风险行移入折叠容器 → 断言必 FAIL）复跑 PASS；新 EC-V3-015 断言亦要求 `railInFoldable === false` |
| 主界面**无常驻输入框** | ✅ 本轮未改 `index.html`；`#ask`/`#ask-fallback` 仍默认 `hidden`（RP-L1-E 覆盖） |
| 禁 `git add -A` | ✅ 逐文件 path-limited `git add`（见 §10.8） |
| 无新增依赖 | ✅ `package.json` 仅 scripts 追加 `test:gate-integrity`（+ `test:v3` 串行链插入）；依赖段零 diff |
| 冻结用 sha256 内容 pin（**未用** `git diff --quiet HEAD`） | ✅ 全部 sha256 核对（`00-exitcodes.txt`） |
| 门禁串行（一次一个） | ✅ `run-main-gates.sh` 顺序执行，逐条 exit code 落盘 |
| 不改 `main`/v1/v2 SDDU/`web-cli-base/**`/`src/content/**`/判定链/`manifest.json` 权限段/`.opencode/opencode.json`/`design/**` | ✅ 工作区零改动（`git status --porcelain` 只列本轮有意修改的 14 个文件 + 2 个 review 产物 + 1 个新元门禁） |
| 推送方式 | ✅ `git push https://github.com/THZSummer/LGDL.git HEAD:refs/heads/feature/web-cli-plugin`（不改 remote、不 force push） |

### 10.8 本轮未完成 / deferred / 风险项

1. **人工面 3 项**（展开动画 / 引用高亮 / 读屏体感）：⏳ 未执行（如实登记，无自动化替代）。
2. **I-09 `reset()` 语义**：**deferred**（理由见 §10.4）；如需 UI 提示属产品改动 + 体积重登记，建议单独裁决。
3. **元门禁的静态覆盖面**（`journey`/`insight`/`l0`/`density`/`hardening`/`e2e`）：未做「逐门禁强制变红」的 Chromium 实跑（~4 min/次 × 6，内存 ~1.5 GB 串行约束）⇒ 它们只有静态覆盖 + `batch` 级证据（`l1`/`binding` 有真实动态反证）。已在元门禁内**硬编码登记**（`STATIC_ONLY_GATES`）并在日志打印。
4. **`binding.mjs` 站点发现抖动（既有，非本轮引入）**：强制变红轮出现 `#3d/#3e/#3f` 瞬时失败（站点 `http://localhost:5173` / SW 就绪竞态）。**注意语义变化**：修复前这类抖动会被「打成绿」，现在会**如实红**（exit=1）。还原后单跑与串行链均 192/0 绿。未修（属既有抖动，非本叶断言逻辑）。
5. **`sidepanel.js` sha256 随构建戳变化**：体积判据是**字节数**（327,679）；`dist/` 为 gitignored 产物。本轮多次重建（含 I1 反证的两次重建）后字节数恒定。
6. **`build.md §9.2` 方法段的 `dist/content.js` 同为 177,440 B 一句**：HEAD 版 `size-attribution.mjs` 只构建 sidepanel 入口，**无法复现**（review §13.3 已列为未能复核项）→ 已在 §2.2 末尾如实登记为复现限缩；`Δ = 32,454` 与逐模块分解**已复现**（§10.4 I-04 行）。
7. **`zeroDiffFiles` 由 11 → 9**（移出 `test/ui/hardening.mjs` 与 `test/e2e/fullchain.mjs`）：为满足「所有 CDP `send()` 加固」而做，二者为**测试驱动脚本**（非产品面/非红线文件），改动是**纯插入**且已逐条登记（`V32-S13`/`V32-S14`）。真正的红线文件全部保留在 `zeroDiffFiles` 且仍 0 行 diff。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.2 | **修复轮 R2（review R1 的 F-01 + I-01~I-10）**：① **F-01 修复**（`binding.mjs` 失败分支的 `await dumpDiagnostics` 挂在 CLOSED CDP socket 上 ⇒ `process.exit(1)` 不可达 ⇒ 退出码 0 把失败打成绿）：`process.exitCode = 1` 提到两处 await 之前 + `dumpDiagnostics` 15s 硬上限 + `send()` readyState/20s 超时/`close` 拒结（**纯插入、相对 base 0 删除行、`check(` 192 不变**）；**实跑验收** 强制变红 → `EXIT=1`、还原 → PASS 192 / `EXIT=0`，并把历史从未成功过的「诊断已落盘」修活；② **新增元门禁** `test/gate-integrity.test.ts`（+ `test:gate-integrity`）：R1a 退出码优先 / R1b 诊断有界 / R2 失败计数耦合退出码 / R3 CDP send 有界，审计 8 个 Chromium 门禁 + 反证驱动 + 共享 CDP 客户端；四重可失败性证明（合成夹具 / 真实副本注入 / `SDC_GATES_ROOT` 外部反证 exit=1 / 真实根 PASS）；③ **I-01~I-10** 逐条处置（I-01 真断言、I-02 内层 pin + 新反证 RP-L1-C2、I-03 spec/plan 显式订正、I-04/05/06/07/08/10 修复、I-09 deferred 附理由）；④ 全门禁串行复跑至绿（**760/11/127/157/99/167/108/192/24/e2e/6**）+ 反证全套（RP-L1-A~H+C2 9/9、RP-V3-01/03/04/05/06/08/09、I1、F-01、元门禁）；计数只增不减、红线零改动 | 2026-09-16 | SDDU Build Agent |
| v1.0 | 初始创建：10 任务实施完成、6 波按序、门禁串行实跑（l1 88/0、l0 157/0、supersession 11/0、npm test 743 中 742 绿）、密度唯一漂移 = staleRef `chars` 244→254（阈值与默认档零漂移）、体积按真实产物显式重登记（327,679 / ceiling 未抬高）并**如实上报红线冲突 +21,580 B** | 2026-09-16 | SDDU Build Agent |
| v1.1 | **修复轮（执行编排器裁决 V3-VOL-1）**：① cap 撤销（降级为纯记录字段），判定恢复公式 `floor(baseline × 1.05)` = 344,062 B；② 四条替代守卫落地（公式 / 显式重登记登记册 / 增长正当性证据 + `npm run size:attribution` / >15% 方向性告警——**已触发 +22.96% 并已回报**）；③ 补齐**逐断言反证**（RP-L1-A~H：注入 → FAIL（逐条 `✖` 留证）→ sha256 逐字节还原 → PASS）+ 既有反证全套复跑（RP-V3-01/03/04/05/06/08/09 + I1 + RP-V3-VOL-1①）；④ 全门禁复跑至绿（754/11/127/157/88/167/108/192/24/e2e，**0 红灯**），计数只增不减；⑤ `dist` 增量构成分析表（+32,454 B 逐模块归因，98.6% 由必需模块/接线解释，无重复代码）；⑥ 密度订正 244→254 保留 | 2026-09-16 | SDDU Build Agent |
