# 验证报告：specs-tree-v5-3-chrome-face（V5-3 授权 chip + 可拖动宽度 + 死端守护 + 法八机核）

> **文档定位**: SDDU 验证报告 — 逐项记录自主验证的执行结果，作为工作流终点
> **验证策略**: `validate.md`（V1~V9 场景矩阵 + 五维度指引 + §0 低风险订正清单）
> **前置依赖**: `validate.md` v1.0、本叶 `spec.md` v1.0、`review-report.md` v2.0（R2 **✅ 通过**，HEAD `19c3beb`）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-22
> **验证轮次**: **R1（对抗优先·独立复算）**
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-22
> **更新说明**: 初始创建。对象 = 工作树（reviewed HEAD `c4d157c` + §4 低风险订正）；**结论 ✅ 通过**（0 阻塞 / 0 失败 / 0 严重漂移；残余 6 项观察，非阻塞）

---

## 1. 验证概要

| 维度 | 数值 |
|------|:--:|
| 验证场景数（V1~V9） | **9**（9 族，内含 81 条自写探针断言 + 15 项门禁 + typecheck/build） |
| 自写对抗探针断言 | **81 / 81 通过**（runtime 41 + 静态 40） |
| 门禁复跑 | **15 / 15 全绿**（+ `typecheck` 0 + 构建退出码 0） |
| 失败（❌） | **0** |
| 无法执行（⏭️） | **9 项人工面**（headless 不可合成，如实标注）+ **1 项不适用**（产品侧无拖动手柄，见 §5 N-1） |
| 阻塞问题 | **0** |
| 严重漂移 | **0** |
| FR 覆盖 | **27 / 27 = 100%** |
| NFR 覆盖 | **9 / 9 = 100%**（NFR-008 的读屏子面如实入人工面） |
| EC 覆盖 | **10 / 10 = 100%** |
| 结论 | **✅ 通过** |

**对象 / 基线**：验证对象 = 工作树（reviewed HEAD `c4d157c` + 本轮 6 文件低风险订正 + 重建产物）；叶基线 `leafBase = 9b262ae`；对照基线（R1 报告对象）= `b0a679e`。

---

## 2. 逐项验证结果（V1~V9）

| # | 验证对象 | 验证步骤（摘要） | 预期结果 | 实测结果 | 判定 |
|---|---------|---------|---------|---------|:--:|
| **V1** | 门禁全量 + 对账 | 串行复跑 15 项门禁 + typecheck + 构建；与 review R2/build 声明值对账 | 全绿 + 计数只增 | npm **1181/0** · law8 **25/0** · dead-end **39/0** · auth-chip **37/0** · insight **118 PASS** · density **242/0** · l0 **248/0** · journey **171 PASS** · binding **192 PASS** · stream **73/0** · zero-injection **28/0** · supersession **36/0** · gate-integrity **15/0** · size-ruling-vol3 **12/0** · design-contract **19/0** · typecheck **0** · build **547,558 B** | ✅ |
| **V2** | 授权 chip 终局对抗 | 四路切换 + 唯一载体全 UI + L2 指针 + 黄/绿点击 + 6/7 | 全成立 | **18/18** 断言绿（见 §3.2） | ✅ |
| **V3** | 死端守护对抗 | 5 类逐类 + 第 6 类注入红 + 还原绿 + S2 十环节 | deadEnd=0；注入红 | **10/10** 绿（第 6 类自有判据 `deadEnds≥1` 如实判红） | ✅ |
| **V4** | 法八四面 + 侧信道 | 真实掩码写入 → 四面 + 类别列 + 侧信道 + key 直写 | 四面零命中；类别非值 | **8/8** 绿（哨兵 19 字符 → `8+`，原始长度 19 不落审计/流） | ✅ |
| **V5** | X5 密度连续口径 | 阈值/31 格/v5Ledger（静态）+ 宽度解耦与边界（Chromium） | 阈值不动；计数解耦 | 静态 **5/5** + runtime **4/4** 绿（280/460/640 控件计数恒 6；360→true / 361→false） | ✅ |
| **V6** | 保护段三值复算 | journey/binding 字节切片 sha + 行数 + 锚点 | 逐字节命中 | **5/5** 绿（journey 240 行 / `cc79f413…`；binding `be9ad0e9…`） | ✅ |
| **V7** | 红线与冻结面 | 自算 sha + `git diff 9b262ae..HEAD` + KIND_SET 冻结 | 逐字节；零 diff | **16/16** 绿（含 `zero-injection.mjs` 变更 = 本叶主责等价重锚且已登记） | ✅ |
| **V8** | 体积三值同源 + 越限红 | 独立复算式 + 机读载体 + 注入/还原双向 | 同源；越限即红 | **10/10** 绿（越限注入 ⇒ FAIL；逐字节还原 ⇒ PASS） | ✅ |
| **V9** | spec AC 全锚 + 共享面 | state 锚点 × spec 文本交叉复算 | 全覆盖；恰一次 | **4/4** 绿（13 AC / 27 FR 全覆盖，含范围记法） | ✅ |

### 2.1 对抗红绿表（如实）

| 对抗面 | 注入 / 驱动 | 期望 | 实测 | 判定 |
|--------|------------|------|------|:--:|
| **V2 路① 授权** | `discover A` → `authorize A` | 黄 → 绿（逐字 / 恒显） | `yellow→green`，两态逐字命中 | ✅ 绿 |
| **V2 路② 撤销** | `revoke A` | 绿 → 黄 | 回黄态逐字 | ✅ 绿 |
| **V2 路③ 会话切换** | `discover A(绿)` → `discover B` → `discover A` | 绿 → 黄 → 绿（不缓存） | 三态逐次命中；B 黄时四区/非 settings 面零第二投影 | ✅ 绿 |
| **V2 路④ 重绑** | 绿态 `select=op.rebind` + `change` | 不跳走 + chip 不破 | `#view-host` / `#settings-view` 可见性不变；详情回折叠 | ✅ 绿 |
| **V2 唯一载体** | 语义位 `[data-auth]` 全 UI 计数 + 四区四词/短语 + 全 UI text-node 超集分类 | 恰 1 = chip；四区零命中 | `authSlotCount=1`（`#auth-state`）；`regionHits=[]`；`nonSettingsHits=[]` | ✅ 绿 |
| **V2 L2 指针** | 真实 `openTreeView()` → `tree-fab` → 站点行 | 零授权态值 + 指针 + 计算可见 | `authStateValues=[]`、行文案零「已授权/未授权」、`data-auth-pointer="#auth-state"`、`getClientRects().length>0` | ✅ 绿 |
| **V2 黄/绿点击** | 黄点击 / 绿点击 | 产 `op.authorize` next + 系统行 / 展开详情 | 黄：`cards` 含 `op.authorize` + 系统行；绿：详情展开、两入口、`aria-expanded=true` | ✅ 绿 |
| **V2 6 ≤ 7** | 默认屏 / 展开屏控件计数 | 6 / 7 | `closed=6`、`expanded=7` | ✅ 绿 |
| **V3 5 类逐类** | `blockedError(class)` × 5（自有 `nextOf` 判据） | 每类 `deadEnd=false` | 5/5 `deadEnds=0`（`total≥1`） | ✅ 绿 |
| **V3 第 6 类注入** | `blockedError('disk.full')`（无 provider） | 自有判据**必红** | `sixthChips=0 ∧ deadEnds≥1`（如实判红） | ✅ 红（预期红） |
| **V3 还原** | 重置 + 合法类 | 必绿 | `deadEnds=0`（判据双向、非恒真） | ✅ 绿 |
| **V3 S2 十环节** | ①绑定 ②探测 ③黄态 ④✖行内 next ⑤`op.authorize` next | 各环节读数成立 | 逐环节读数命中，死端 0 | ✅ 绿 |
| **V4 面① 流内 payload** | 掩码写入哨兵 | 零命中 | `#stream` text/html + 5 payload 零命中 | ✅ 绿 |
| **V4 面② digest** | 同上 | 零命中 ∧ 含掩码 | 零命中；`••••••` 出现 | ✅ 绿 |
| **V4 面③ 审计** | 同上 | 渲染+存储零命中 ∧ 列 ⊆ 八列 | 零命中；无越界列；`maskedRows≥1` 且类别 ∈ {`8+`,`8-`} | ✅ 绿 |
| **V4 面④ DOM value + 全属性** | 同上 | 逐项零命中 ∧ 提交后清空 | 零命中；掩码输入 `value=''` | ✅ 绿 |
| **V4 侧信道** | 原始长度数值（19）落点扫描 | 不落审计单元格 / 掩码事实文案 | `rawInCells=false ∧ rawNearMask=false` | ✅ 绿 |
| **V4 key 直写** | 哨兵落点 | 只在 key-store | 仅 key-store 面命中；`keyStore.save(` 恰 1 处 | ✅ 绿 |
| **V5 宽度解耦** | 280 / 460 / 640 采样 | 控件计数不变 | 三点 `clickables` 相等；280 无水平溢出 | ✅ 绿 |
| **V5 `data-narrow` 边界** | 280 / 360 / 361 | true / true / false | `280=true`、`360=true`、`361=false` | ✅ 绿 |
| **V5 窄屏不隐藏 chip** | 280 时读 `#auth-state.hidden` | `false` | `false`（非以 `hidden` 充数） | ✅ 绿 |
| **V8 越限注入** | 基线临时压到 `500_000`（ceiling 525,000 < 实测 547,558） | `size-budget` **必 FAIL** | 编译+运行 ⇒ 断言失败（`AssertionError`） | ✅ 红（预期红） |
| **V8 逐字节还原** | `git`-级还原 | 恢复 PASS | 门禁恢复 PASS + 文件逐字节一致 | ✅ 绿 |

> **如实说明**：首轮探针曾报 **7 条红**，**全部为探针自身实现缺陷**（我逐条定位并修复，非产物缺陷）：①chip 祖先容器 `textContent` 误报（改用 text-node 遍历）；②chip 详情态未复位导致的「展开/折叠」判定倒置；③L2 树未先走 `openTreeView()` 导致「计算可见」判据在未布局状态下判红；④侧信道正则误匹配 `ms` 延时数值；⑤⑥⑦ V7/V8/V9 的三处探针口径错误（`zero-injection.mjs` 被误列为红线、`KIND_SET` 正则、`ceilTo50KB` 派生式、spec 范围记法）。**修复后 81/81 全绿**。其中 ③ 恰好**独立复现了 O-R2-1 所担心的弱判据**：未布局（祖先 `hidden`）时节点仍 `isConnected` ⇒ 旧 `noteVisible` 会判通过 —— 故本轮一并硬化（见 §4）。

### 2.2 三种「如实红」

| 面 | 注入 | 结果 |
|---|------|------|
| V3 第 6 类阻塞 | `disk.full`（无 provider 恢复面） | 自有判据 `deadEnds=1` ⇒ **判红**（证明死端判据非恒绿） |
| V8 体积越限 | 基线 500,000 ⇒ ceiling 525,000 < 547,558 | `size-budget` **FAIL** ⇒ **判红**（证明预算门禁非恒绿） |
| V2/V4 还原段 | 逐字节还原 | 恢复 PASS/零命中 ⇒ **判绿**（双向、非空转） |

---

## 3. 验证详细信息

### 3.1 测试覆盖（V1）

| 门禁 / 命令 | build/review 声明 | 本轮独立复跑 | 判定 |
|---|---|:--:|:--:|
| `npm test` | 1181 / 0 | **1181 / 0** | ✅ |
| `test:law8` | 25 / 0 | **25 / 0** | ✅ |
| `test:dead-end` | 39 / 0 | **39 / 0** | ✅ |
| `test:auth-chip` | 37 / 0 | **37 / 0** | ✅ |
| `test:insight` | 118 PASS | **118 PASS** | ✅ |
| `test:density` | 242 / 0 | **242 / 0** | ✅ |
| `test:l0` | 248 / 0 | **248 / 0** | ✅ |
| `test:ui`（journey） | 171 PASS | **171 PASS** | ✅ |
| `test:binding` | 192 PASS | **192 PASS**（第 3 轮隔离复跑；前两轮 CDP flake 见 §5 N-2） | ✅ |
| `test:stream` | 73 / 0 | **73 / 0** | ✅ |
| `test:zero-injection` | 28 / 0 | **28 / 0** | ✅ |
| `test:supersession` | 33（v4 台账旧值）→ 本轮 36 | **36 / 0** | ✅ |
| `test:gate-integrity` | 15 / 0 | **15 / 0** | ✅ |
| `test:size-ruling-vol3` | 12 / 0 | **12 / 0** | ✅ |
| `test:design-contract` | 19 / 0 | **19 / 0** | ✅ |
| `npx tsc --noEmit` | 0 | **0** | ✅ |
| `npm run build` | 547,558 B 可复现 | **547,558 B**（红线 sha 不变） | ✅ |

**FR 覆盖账（27/27）**：见 `validate.md` §3.1 的逐条 FR → Vx 映射；每条 FR 均有 ≥ 1 个 Vx 且实测通过（典型：FR-086 → V2 唯一载体 + V9 指针锚；FR-015 → V3 5 类 + 第 6 类注入；FR-023 → V4 四面 + 侧信道；FR-114/116 → V5 31 格 + V9 台账；FR-130~134 → V8 三值同源 + 越限红）。

**NFR 覆盖账（9/9）**：NFR-001/002 → V2（不跳走）+ V5（边界/解耦）；NFR-003/011 → V4；NFR-004 → V1/V3/V5（单源声明 + 门禁）；NFR-005 → V8；NFR-006 → V1（journey/l0 兼容面）；NFR-007 → V2~V4/V8 的 `expectFailPattern` + 双向反证；NFR-008 → V2（`aria-expanded`/`aria-controls`）+ 读屏子面如实入人工面；**覆盖率 100%**。

### 3.2 接口数据（V2~V4 实时读数）

| 检查项 | spec 要求 | 实测 | 一致？ |
|--------|----------|------|:--:|
| `#auth-state[data-auth]` | ∈ {yellow, green}，两态逐字 | 黄 `未授权 · 零注入` / 绿 `已授权 · supported`；`authSlotCount=1` | ✅ |
| 授权态语义位唯一性 | 全 UI 恰 1 处 = chip | `authSlotIds=["auth-state"]`；工具栏区 0 | ✅ |
| 四区四词/两态短语 | 零命中 | `regionHits=[]`（黄/绿/切换后三轮均空） | ✅ |
| L2 站点行 | 零授权态值 + 指针 | `authStateValues=[]`；`pointerTargets=["#auth-state"]` | ✅ |
| 指针说明运行期可见 | 存活 + 可见 | `isConnected=true` ∧ `getClientRects().length>0`（O-R2-1 强化） | ✅ |
| 黄点击 | 流内 `op.authorize` next + 系统行 | `cards` 含 `op.authorize`；`sysRows≥1`；不跳走 | ✅ |
| 绿点击 | 管理详情（`op.revoke`/`op.rebind`） | `ops=[op.revoke, op.rebind]`；`aria-expanded=true`；不跳走 | ✅ |
| 密度（默认/展开） | 6 ≤ 7 | 6 / 7 | ✅ |
| 死端（5 类） | `deadEnd=false` | 5/5 `deadEnds=0` | ✅ |
| 审计行四元组 | `{action,time,result,maskedLength}` | `tuple=true`；类别 ∈ {`8+`,`8-`} | ✅ |
| key 直写 sink | 恰 1 处 | `keyStore.save(` = 1 | ✅ |

### 3.3 构建脚本（V1 / V8）

| 命令 | 退出码 | 输出摘要 | 结果 |
|------|:--:|---------|:--:|
| `npm run build` | 0 | `dist/sidepanel.js` 547,558 B / `content.js` 177,076 B / `pick-layer.js` 33,900 B | ✅ |
| `npx tsc --noEmit` | 0 | 无诊断 | ✅ |
| `sha256sum dist/content.js` | — | `52a82620…`（逐字节不变） | ✅ |
| `sha256sum dist/pick-layer.js` | — | `5f567d7e…`（逐字节不变） | ✅ |

### 3.4 性能边界（V5 / V8）

| NFR / EC | 要求 | 实测 | 偏差 | 达标？ |
|---|---|---|---|---|
| NFR-005 体积 | ≤ 生效上限 `574,935` B | 547,558 B（距上限 27,377 B） | N/A | ✅ |
| NFR-002 / EC-014 `data-narrow` | 360→true / 361→false | 280=true / 360=true / 361=false | N/A | ✅ |
| FR-090/091 宽度解耦 | 控件计数不随宽度变 | 280/460/640 三点计数相等（= 6） | N/A | ✅ |
| EC-021 越限 | 越限必红 | 压至 500,000 ⇒ FAIL | N/A | ✅ |
| FR-089 拖动 280–640（产品侧） | 产品侧落点 = `data-narrow` + clamp 观测 | 产品侧无拖动手柄 | **不适用**（见 §5 N-1） | ⏭️ |

### 3.5 漂移检测（V6 / V7 / V9）

| 漂移类型 | 检测命令 / 方法 | 结果 |
|---------|-------------|------|
| 孤立代码（有代码无需求） | 6 文件订正的变更集审查 + §7 红线逐条 | ✅ 无（唯一 `src` 订正 = `risk-rail.ts` 类型位注释 + `index.html` 删重复句，均可溯源到 FR/AC/观察项） |
| 需求缺失（有需求无代码） | 27 FR × 承接点交叉复算 | ✅ 无（V9 全锚抽验通过） |
| 规格漂移（spec 被修改） | `git diff 9b262ae..HEAD -- spec.md / state.json` | ✅ 无（本叶 spec.md 未被实现期改写；R1 的口径回写发生在 spec §4 注，属 review 修复轮的**追加解释**，非需求变更） |
| 红线逐字节 | `dist/content.js` / `dist/pick-layer.js` / `design/**` / `manifest.json` / 判定链 / v3 台账 / ROADMAP | ✅ 全部零 diff / sha 命中 |
| 保护段 | journey `43054..58287` / `cc79f413…` / 240 行；binding `107780..115930` / `be9ad0e9…` | ✅ 逐字节命中（保段，未第三次取代） |

---

## 4. 验证脚本执行记录（ADR-003）

> 脚本由 validate Agent 自主编写并直接执行（不走 task→build）。路径 = 用户指定探针目录 `/tmp/opencode/v5-3-validate/`（等价于 ADR-003 的 `/tmp/sddu-validate-<feature>-<ts>/` 约定）。

| 脚本文件 | 用途 | 对应场景 | 退出码 | 关键输出 |
|---------|------|:--:|:--:|---------|
| `adv-runtime.mjs` | 授权 chip 四路切换 / 唯一载体全 UI / L2 指针 / 死端 5 类+第 6 类注入 / 法八四面+侧信道 / 宽度解耦与 `data-narrow` 边界（一次 Chromium，真实 dist + 真实 SW） | V2 / V3 / V4 / V5(runtime) | **0** | `41 passed / 0 failed`（V2 18 / V3 10 / V4 8 / V5 4 / 无异常 1） |
| `adv-static.mjs` | 密度阈值/31 格/v5Ledger、journey+binding 保护段 sha 复算、红线 sha + `git diff` + KIND_SET 冻结、体积三值同源 + **越限注入红/还原绿**、spec AC 锚点抽验 | V5(static) / V6 / V7 / V8 / V9 | **0** | `40 passed / 0 failed` |
| 门禁日志（registry 快照） | 15 项门禁 + typecheck + build 的完整绿 run 日志（供 `test:supersession` 的 counts↔日志同源机核） | V1 | 0 | `/tmp/opencode/v4-gate-logs/v5-3-validate/registry/{test-l0,test-density,test-run,test-supersession-run}.log` |

**扰动可还原**：V8 越限注入在 `finally` 中逐字节还原（还原后文件重新复算一致 + 门禁恢复 PASS）；`dist-adv-test/` 临时编译目录已删除；`git status` 仅含 §4 的 6 个预期变更文件，零残留/零未跟踪。

### 4.1 §0 review 建议订正的落地与复验

| # | 订正 | 落地 | 复验 |
|---|------|------|------|
| **O-R2-1** | `test/ui/insight.mjs#I-20a3`：`noteVisible` 补 `hidden !== true ∧ getClientRects().length > 0` | 已改（等价强化，断言数不变） | `test:insight` **118/0**；探针 V2 独立复算 `noteVisibleStrong=true` |
| **O-R2-2** | `index.html#tree-drawer`：删除与 `TREE_AUTH_POINTER_NOTE` 逐字相同的指针句（单源化） | 已改（保留极简占位，守住 L0 ⑧「非空摘要」判据） | `test:l0` **248/0** · `test:insight` **118/0** · `test:density` **242/0**；`grep 本台账不复制状态值 src/ui/sidepanel/index.html` = **0** |
| **O-1** | `docs/v4-supersession-ledger.json#counts` 前移：l0 216→**248** · density 171→**242** · insight 116→**118** · journey 167→**171** · nodeTestRuntime 947→**1181** · stream 63→**73** · supersession 33→**36** + `source` 同源日志 | 已改（floor 不动；`source.observedLine/observed/log` 同步） | `test:supersession` **36/0**（counts↔日志同源机核 checked；`npm test` 1181/0） |
| **O-2** | `risk-rail.ts#RISK_COPY.unauthorized` 口径护栏 | 以**类型位注释**落地（编译期擦除 ⇒ **0 运行时字节**，守体积五要素） | `npm run build` ⇒ `sidepanel.js` **547,558 B 不变**；`test:l0` 248/0 |
| **O-3** | `reanchorV5.previousExpectation` 追加 `narrativeCorrection`（只追加不改写历史） | 已改 | `test:density` **242/0** · `test:supersession` **36/0** |
| **滞后登记** | `tasks.json`：`TASK-V5-167~176` 补 `status=completed` + `meta.phase=validated`；父 `../state.json#childrens[v5-3].phase` `specified → validated` | 已改 | 见 §6 |

---

## 5. 观察项（不阻塞）

| # | 位置 | 观察 | 建议 | 状态 |
|---|------|------|------|:--:|
| **N-1** | 产品侧（`sidepanel.ts` / `index.html`） | **产品侧无 280–640 拖动手柄**（Chrome 控制侧栏宽度）—— FR-ALLN-089 的「拖动」在产品侧无对应物；产品侧承接 = `ResizeObserver` 观测实际宽度 → `data-narrow` + 密度口径解耦。已由 plan §2.4 / build 诚实登记，非「089 未实现」 | 维持登记（设计稿契约侧由 G 127 断言覆盖）；如需产品侧手柄须回父 spec 立项 | 如实登记（本报告 §3.4 标「不适用」） |
| **N-2** | `test:binding`（KL-N-10） | 第 1/2 轮出现 CDP socket 环境性 flake（headless Chromium 争用 ⇒ `readyState=3`），第 3 轮隔离复跑 **192 PASS** | 维持 ≥2 轮隔离复跑纪律（已在 V1 执行） | 已隔离复跑通过 |
| **N-3** | `#settings-view`（`settings/panel.ts` / `settings/view.ts` / `view-model.ts#pickReason`） | 存在「未授权 / 已授权」**解释性文案**（`能力权限说明` / 站点分区提示 / 拾取禁用原因），属**独立按需面**、对 leafBase 零 diff（预存在）、**不在 ADR-V5-006 §2 登记的四区扫描范围**内，亦非授权态常显载体 | 无需改；如后续要收紧为「全 UI 四词禁」须先回父 ADR 登记扫描范围（当前口径 = 授权态**语义位** `[data-auth]` 唯一 + 两态逐字短语） | 观察（非缺陷） |
| **N-4** | `docs/v4-supersession-ledger.json#counts.source.log` | 本轮登记的 `source.log` 指向 `/tmp/opencode/v4-gate-logs/v5-3-validate/registry/`（机器本地临时路径）；换机 / 清理后 `test:supersession` 对该四项**显式 skip**（不静默通过） | 保持「恒在层 + 同源层」两层判定；长期快照可迁入仓库（后续波次） | 观察 |
| **O-R2-1'** | 同 §4.1 | 硬化后的 `noteVisible` 判据更强（非恒真）；探针独立复算确认「计算可见」成立 | — | 已闭环 |
| **O-R2-2'** | 同 §4.1 | `#tree-drawer` 指针句已单源（`src/ui/sidepanel/index.html` 命中 0）；保留极简占位以守住 L0 ⑧ 判据（豁免未扩大） | — | 已闭环 |

---

## 6. 阻塞问题

**0 个。**

---

## 7. 结论

**结论**: ✅ **通过**

**指标达标矩阵**：

| 指标 | 要求 | 实测 | 达标？ |
|------|------|------|:--:|
| FR 测试覆盖 | 100% | **27/27 = 100%** | ✅ |
| NFR 测试覆盖 | ≥ 80% | **9/9 = 100%** | ✅ |
| EC 边界覆盖 | ≥ 80% | **10/10 = 100%** | ✅ |
| 构建退出码 | 0 | **0**（`sidepanel.js` 547,558 B；红线 sha 不变） | ✅ |
| 阻塞问题数 | 0 | **0** | ✅ |
| 严重漂移项 | 0 | **0** | ✅ |
| 对抗红绿非空转 | 注入必红 / 还原必绿 | **V3 注入红 · V8 越限红 · 还原绿**（81/81 探针断言通过） | ✅ |
| 人工面 | 不冒充 PASS | **9 项 `⏭️`** 如实标注 | ✅ |

**理由**：review R2 的放行前提（0 阻塞）成立，且本轮**不采信声明、独立复算**：① **门禁全量**（15 项）串行复跑与 review/build 声明值逐项一致（npm 1181/0 · insight 118/0 · l0 248/0 · density 242/0 · binding 192 PASS …）；② **对抗面 81/81** 全绿 —— 授权 chip 的四路状态切换、全 UI 唯一载体、L2 指针（含**计算可见**）、死端 5 类 + 第 6 类注入**如实判红**、法八四面 + `maskedLength` **类别非值** + 侧信道零泄漏、密度宽度解耦与 `data-narrow` 边界；③ **红线与保护段逐字节**（content/pick-layer sha、journey 240 行 / `cc79f413…`、binding `be9ad0e9…`）；④ **体积三值同源**（547,558 / 574,935 / 563,200 / 619,520）并以**越限注入必红 + 逐字节还原必绿**证明预算门禁非空转。review 建议的 5 项低风险订正（O-R2-1/O-R2-2/O-1/O-2/O-3）与 2 项滞后登记已落地并复验通过——其中 O-2 为守体积五要素改走**类型位注释**（0 运行时字节），O-R2-2 以「删重复句 + 保留极简占位」实现单源化且未触碰 L0 ⑧ 豁免。残余 6 项均为观察项（产品侧无拖动手柄 / binding 环境 flake / settings 面解释性文案 / 临时日志路径 / 两项已闭环订正），**不阻塞**。

**Feature 可关闭**：是（末叶 / 收口叶；父 Feature `specs-tree-web-cli-plugin-v5-all-in-next` 三叶全部 validated）。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（validate R1，对抗优先）：V1 门禁全量 15 项对账 + V2~V9 自写探针 81 断言全绿；V3/V8 注入如实判红、还原判绿；红线/保护段/体积三值独立复算；review 建议 5 项低风险订正 + 2 项滞后登记落地复验；**结论 ✅ 通过**（0 阻塞 / 0 失败 / 6 观察 / 人工面 9 项 `⏭️`） | 2026-09-22 | SDDU Validate Agent |
