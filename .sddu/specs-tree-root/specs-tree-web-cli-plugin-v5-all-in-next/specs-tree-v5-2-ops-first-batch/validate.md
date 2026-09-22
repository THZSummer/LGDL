# 验证策略：specs-tree-v5-2-ops-first-batch（V5-2 首批 9 op 落地 + SW 执行器 + 断流首验收）

> **文档定位**: SDDU 验证策略 — 定义本叶的 V1~V9 验证场景与方法；逐项**实测**结果见 `validate-report.md`
> **前置依赖**: 本叶 `spec.md` v1.0（34 FR / 9 NFR / 11 EC / 11 AC）+ `review-report.md` v2.0（R2 结论 **✅ 通过**，HEAD `13b7d76`）+ `plan.md` v1.0 + 父 `../spec.md` §5.2/§5.3/§5.5/§5.7/§5.8/§5.11 + 父 ADR-V5-001~012
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-22
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-22
> **更新说明**: 初始创建（对抗优先的 V1~V9 场景矩阵；策略先于报告产出）

---

## 1. 验证概要

| 维度 | 目标 | 达标线 |
|------|------|:--:|
| FR 测试覆盖 | 34/34 条承载 FR 各 ≥ 1 个 Vx 且实测通过 | 100% |
| NFR 测试覆盖 | 9/9（NFR-008 的读屏子面如实入人工面） | ≥ 80% |
| EC 边界覆盖 | 11/11 逐条有实测证据或如实标注 | ≥ 80% |
| 构建 | `npm run build` 退出码 0 ∧ 冻结面逐字节可复现 | 退出码 0 |
| 对抗红绿 | 注入/伪造必须**判红**，还原必须**判绿**（非恒真） | 0 空转 |
| 严重漂移 | 0 项 | 0 |
| 阻塞问题 | 0 项 | 0 |
| 人工面 | 浏览器原生权限弹窗体感 / 读屏 = `⏳`（不冒充 PASS） | 如实 |

**Feature 类型判定**：**代码类**（`src/**` + `test/**` + 构建产物 + Chromium 真机门禁）⇒ 全五维度验证（测试覆盖 / 接口数据 / 构建 / 性能边界 / 漂移检测）。

---

## 2. 自主验证场景（V1~V9）

**验证对象来源**：
- `spec.md`：FR-ALLN-040~049 / 014 / 016 / 020~022 / 065~069 / 075~078 / 110·111·116 / 003 / 120·121·124·125 / 130·133 + 9 NFR + 11 EC + 11 AC
- `build.md`（R1/R2/修复轮）+ `review-report.md`（R2）中的**声明值**（门禁计数、红线 sha、体积三值、S2 读数）
- 实际产物：`src/**`（9 op / SW 执行器 / op-* 协议 / 掩码卡 / settings 收编）+ `dist/**`（红线与体积）+ `test/**` 门禁

**对抗优先原则**：每个「声明」都要有一条**可判红**的反证（删掉机制 ⇒ 同一判据必须 FAIL）；每条红线/体积/权限面都要**独立复算**（不复用仓库测试的断言，自写探针）。

| # | 验证对象 | 验证步骤 | 预期结果 | 验证维度 | 验证方法 |
|---|---------|---------|---------|---------|---------|
| **V1** | 门禁全量复跑 + 计数对账（AC-ALLN-025 / FR-003·120·124·125） | ① `npm test`；② `test:recommendation` / `test:stream` / `test:ask-auth`；③ 补跑 `test:binding`（KL-N-10 ≥2 轮）/ `test:l0` / `test:density` / `test:ui` / `test:zero-injection`；④ 与 build R2/修复轮声明值逐项对账 | 全绿 + 计数**只增**（npm 1172 / stream 68 / ask-auth 71 / recommendation 65 / binding 192 / l0 244 / density 232 / journey 171 / zero-injection 27） | 测试覆盖 + 构建 | 串行复跑（Chromium 门禁严格串行）+ 计数对账 |
| **V2** | 9 op 逐个**产品路径**真实驱动 + 三面同执行体（FR-040~049 / 065 / 075~078） | ① 读 `OP_DESCRIPTORS`（layer / mode / fail / audit）；② 对 9 个 op 逐个 `runOp(opId)`（**生产默认缝**，不经测试 seam），记录命中的唯一入口；③ 未绑定缝 ⇒ 必须 loud 失败；④ 四态/pending 门控；⑤ panel(`runOp`)/settings/options(`dispatchOp`) 三面写同一 store，比对落储值 | 9/9 命中各自唯一入口；空面 `panel-hook-missing:<opId>`（无假成功）；三面各 1 次真实落储且值一致 | 接口数据 + 测试覆盖 | 自写探针（真实 pipeline + 真实 op 表 + 真实 op-bodies） |
| **V3** | **S2 断流全链独立复刻**（FR-016 / FR-014 / AC-ALLN-001） | ① 10 环节形状 + `no-dead-end.mjs` 不存在（v5-3 单点）；② 5 类阻塞态**逐类**判可达 + 各有专属修复 op + 全 op 已注册；③ 两类 op-driven ctx ≠ 恢复态（非同构）；④ 真链 10 拍（绑定→探测→未授权→✖→授权 next→auth 卡→**真 SW 两段握手**→✓ 回执→探测恢复→拾取 next）；⑤ 拒绝路径「固化事实 ∧ 可达 next」；⑥ 删恢复面 ⇒ 判据必红 | 死端 = 0；逐类修复 op 命中；反证可红；拒绝非死端 | 测试覆盖 + 接口数据 | 自写探针（真实 fixture + 真实 recommend/pipeline/`execSwOp`） |
| **V4** | **SW 安全对抗**（FR-066·067·068 / FR-110·111 / NFR-009） | ① 7 类伪造 `op-exec`（无/空 consentToken、缺 `gestureResult`、非布尔 granted、坏 phase、非 op-* kind、null）⇒ 必须在执行体前拒绝；② 未注册 opId / 无目标 origin / 缺 permission ⇒ SW 拒绝；③ **probe 只读**（authorize 调用 0 次）而 commit 是唯一提交点；④ 抛错 commit 不留状态；⑤ `KIND_SET` 逐字 40 项 + 注入 `op-*` ⇒ 反证红；⑥ `src/content/**` 零 import 边；⑦ 发送方校验口径如实 | 伪造全拒；probe 零状态变更；注入必红 | 漂移检测 + 测试覆盖 | 自写探针（真实 op-protocol/op-executors + 真实源码块扫描） |
| **V5** | **法八入口对抗**（FR-020·021·022 / NFR-003 / AC-ALLN-003 入口侧） | ① 生产形状 `ask-resolved{answer:undefined, maskedLength:'8+'}` 经真实 reducer ⇒ payload/digest/DOM 固定区**不含值**；② 反向：带 `answer=<secret>` 的动作**必须泄漏**（判据非恒真）；③ 掩码卡 `type=password`+`data-secret`+aria；④ digest 白名单闭集 + label 藏密钥必抛；⑤ 值 sink 恰 1 处（`keyStore.save(`） | 值零可见；单一 sink；白名单 fail-closed | 接口数据 + 性能边界 | 自写探针（真实 reducer / askFixedText / digestEntryOf + 源码面扫描） |
| **V6** | **失败语义对抗**（FR-042·043·044 / EC-ALLN-011 / NFR-010） | ① 半完成失败体（写两表后 `{ok:false}`）经真实三表 snapshot/rollback ⇒ `settle='failed'` ∧ 三表 `db==before` ∧ 失败行（无 ✓）∧ 可达 next；② 反证：短路回滚 / 恒 completed ⇒ 必红；③ 真 `op-bodies.revoke('permission')` 中途「仍持有」⇒ **如实失败**（不假成功）；④ `op.perm.request` 拒绝路径事实行计数 | 零半完成态；失败不假成功；失败行数如实 | 测试覆盖 + 接口数据 | 自写探针（真实 pipeline + 真实 snapshot + 真实 op-bodies） |
| **V7** | **红线与冻结面**（FR-069·133 / AC-ALLN-022） | ① `dist/content.js` 177,076 B / sha `52a82620…`；② `dist/pick-layer.js` 33,900 / `5f567d7e…`；③ 保护段 `binding.mjs[107780..115930)` sha `be9ad0e9…`；④ `manifest.json` / `src/content/**` / `docs/v3-supersession-ledger.json` 对 v5-1 基线 `8526ef8` **零 diff**；⑤ `KIND_SET` 40 项 / `'op-` 字面 0 | 逐字节命中；零 diff | 漂移检测 + 构建 | 自写探针（自算 sha256 + `git diff`） |
| **V8** | **体积三值同源**（FR-130·133 / NFR-005 / ADR-V5-011） | ① `SIDEPANEL_BASELINE_BYTES == SIDEPANEL_FINAL_ARTIFACT_BYTES == dist/sidepanel.js`；② `569257 == floor(542150×1.05)`；③ `563200 == ceilTo50KB(542150)`；④ `619520 == round(563200×1.10)`；⑤ 生效上限 = `min(619520, 569257)`；⑥ `pending-author-line` 占位；⑦ **越限注入必红**（569,258 / 619,521） | 三值同源 + 越 1 B 即红 | 性能边界 | 自写探针（独立复算式 + 产物 stat） |
| **V9** | **spec AC 抽验**（AC-001 / 003 / 007 / 008 / 010 / 011 / 019 / 021 / 022 / 024 / 025 + X1/X2 等价重锚） | ① 四态唯一（`completed/cancelled/rejected/failed`）+ `op.execute(` 恰 1 调用点（`pipeline.ts#runOp`）+ `handleCardAction` 零 per-op 分支；② 特权恰 2 + `op-*` type-only + 镜像字段集；③ 逐 op 布线门禁实跑 + 3 条伪造反证；④ X1：manifest 零 diff + 显式名单 + 运行期在册集；⑤ X2：`KIND_SET` 零新增；⑥ AC-019 门禁清单在位；⑦ `expectFailPattern` 计数；⑧ 人工面 `⏳` 不冒充 | 全部成立且反证可红 | 测试覆盖 + 漂移检测 | 自写探针（真实门禁函数 + 源码扫描 + 台账 diff） |

> **质量门槛核对**：FR 34 条逐条落在 V2~V9（见 §3）；相关维度 5 个（测试覆盖 / 接口数据 / 构建 / 性能边界 / 漂移检测）各 ≥ 1 条 Vx；Vx = 9 ≥ max(34, 5)… 说明：本策略按**维度聚簇**设计（每个 Vx 是一族对抗场景，内含逐条 FR/AC 的子断言，实测见 `validate-report.md` §2~§3 的逐项表）。

---

## 3. FR / NFR / EC → Vx 映射（覆盖账）

### 3.1 FR（34 条）

| FR | 承接点 | 主判 Vx |
|---|---|---|
| FR-040 `op.authorize` | 五要素 + SW 两段握手 + 单一 `authorizeOrigin` | V2-B/D、V4-B/C、V3-D |
| FR-041 `op.rebind` | 无 params/consent + 零 `requestTurn` | V2-A/B、V9（requestTurn 恰 2） |
| FR-042 `op.llm-config` | 三参 + 掩码写存储 + 快照回滚 | V2-B/E、V6-A、V5 |
| FR-043 `op.perm.request` | form 多选 + 双固化 + 在册校验 | V2-B、V6-B/C、V9（X1） |
| FR-044 `op.revoke` | 三目标 + 不可逆 + 三表回滚 + 审计入口 | V2-B、V6-A/B |
| FR-045 `op.pick` | 复用拾取单一入口 + 取消恢复 | V2-B、V3-D |
| FR-046 `op.describe` | `text` 采参 + 复用 `submitDescribe` | V2-B |
| FR-047 `op.help` | 由 `when(ctx)` 派生（禁硬编码） | V2-B、V9（`op.execute(` 单点） |
| FR-048 `op.turn` | 唯一 `requestTurn` | V2-B、V9 AC-011 |
| FR-049 会话/分组 deferred + 首批恰 9 | `OP_DESCRIPTORS.length==9` | V2-A |
| FR-014 拒绝不是死端 | 固化事实 + 可达 next | V3-B/D、V6 |
| FR-016 S2 断流机器化首验收 | 10 环节 + 死端=0 | V3 全 |
| FR-020 掩码卡唯一入口 | `type=password` + `data-secret` | V5-B |
| FR-021 值直达 key-store（恰一处） | `keyStore.save(` 恰 1 | V5-D |
| FR-022 流内只留事实（长度**类别**） | `MaskedLengthCategory` | V5-A/B/C |
| FR-065 双层执行器（layer 显式） | 描述符 `layer` | V2-A |
| FR-066 特权恰 2 + 手势路径 | `SW_OP_DESCRIPTORS==2` + SW 零 `.request(` | V4-B/D、V9 |
| FR-067 `op-*` type-only | `KIND_SET` 零新增 + 独立校验 | V4-E/F |
| FR-068 SW 镜像 `{id,mode,fail,audit}` | 由单一 op 表派生 | V4-D |
| FR-069 `content.js` / `pick-layer.js` 逐字节 | 177,076 / 33,900 | V7 |
| FR-075 4 类收编为 op 单一执行入口 | 三面同执行体 | V2-E |
| FR-076 零双写（执行面） | 单一 body + 逐 op 布线门禁 | V2-E、V9 AC-011 |
| FR-077 其余设置操作不动 | `settings/panel.ts` 对 v5-1 零 diff + 8 分区 | V7④、V9 X1 |
| FR-078 单一调用点机核 + ≥3 反证 | `OP_CALLSITE_SET` + 3 伪造 | V9 AC-011 |
| FR-110 X1 权限面 | manifest 零 diff + 显式名单 + 在册 | V9 X1 |
| FR-111 X2 消息族 | `op-*` 默认禁入 `KIND_SET` | V4-E、V9 AC-010 |
| FR-116 取代一律等价重锚 | supersession 台账 + `modifiedRanges` | V1（supersession 随 `npm test`）、V7④ |
| FR-003 断言零删减、计数只增 | 计数只增 + 台账等价重锚登记 | V1 + 删除行审计（报告 §3.5） |
| FR-120 门禁等价重锚清单 | 10 主责门禁在位 | V9 AC-019 |
| FR-121 反证不空转（两段证伪） | `expectFailPattern` + 实跑反证 | V3-C、V4-E、V6-A、V9 AC-021 |
| FR-124 门禁严格串行 + KL-N-10 | 隔离复跑 ≥2 | V1（binding 两轮） |
| FR-125 新门禁纳入 `gate-integrity` | 14/0（随 `npm test`） | V1 |
| FR-130 / FR-133 体积五要素 + 红线 | 三值同源 + 逐字节 | V8、V7 |

### 3.2 NFR（9 条）

| NFR | 判据 | 主判 Vx |
|---|---|---|
| NFR-003 安全（流内零明文入口侧 + 零注入 ≥27） | 掩码类别 + digest 白名单 + `zero-injection 27/0` | V5、V1 |
| NFR-009 权限最小化 | 静态面零漂移 + 新增项在册 | V9 X1 |
| NFR-010 快照/回滚 + 镜像一致 | 三表整体回滚 + `sw-op-mirror` | V6-A、V4-D |
| NFR-011 可观测性 | `{opId, ts, result, maskedLength}` 零明文 + 审计入口可达 | V4-C、V5、V1 |
| NFR-006 兼容性（`#input/#send/#rebind/#authorize` + 设置 ids） | `journey 171` / `binding 192` | V1 |
| NFR-007 每条判据可 FAIL + `expectFailPattern` | 97 条声明 + 逐条实跑反证 | V9 AC-021 |
| NFR-002 320px 零溢出 + 键盘可达 | `journey` + `density 232` | V1 |
| NFR-008 无障碍（掩码/form 读屏可达） | aria + `type=password`；**读屏实感 = 人工面 ⏳** | V5-B、V1（人工面标注） |
| NFR-005 体积 ≤ 生效上限 + 五要素 | 542,150 ≤ 569,257 | V8 |

### 3.3 EC（11 条，抽验 5 条 + 登记 6 条口径）

| EC | 判据 | Vx |
|---|---|---|
| EC-005 拾取取消/超时 → 错误卡 + 恢复 next | V3-D、V6-A |
| EC-006 consent 被拒 → 固化 + 可达 next | V3-D |
| EC-007 原生弹窗 headless 不可合成 → 人工面 | V9 AC-024（`⏳`） |
| EC-008 权限被拒 → 固化 + 可达 next | V6-C |
| EC-009 掩码空值/取消零副作用 | V5（空值分支静态 + 类别位无副作用） |
| EC-010 `MAX_OPEN_ASKS` 超限入队不丢弃 | V2-D |
| EC-011 `op.revoke` 失败 → 三表整体回滚 | V6-A |
| EC-012 LLM 连接失败 → 凭据快照回滚 | V6-A（凭据表在快照内） |
| EC-013 非首装未授权 → `op.authorize` 可达 | V3-B（`site.unauthorized`） |
| EC-016 设置按钮与 chip 并发 → 单一执行入口 | V2-E |
| EC-017 `pending` 门控下本地 op 不受门控 | V2-D |

---

## 4. 验证维度与方法

| 维度 | 方法 | 落点 |
|------|------|------|
| 测试覆盖 | 复跑 node（`npm test`）与 Chromium 门禁并计数对账 | V1 / V2 / V3 / V6 / V9 |
| 接口数据 | 直接驱动生产模块（pipeline / op 表 / op-bodies / op-executors / reducer / digest），比对字段与语义 | V2 / V3 / V4 / V5 / V6 / V9 |
| 构建 | `npm run build` + 产物 stat + 冻结面 sha 复算（可复现性） | V7 / V8 / V1 |
| 性能边界 | 体积三值独立复算 + 越限注入判红 + pending 门控边界 | V8 / V2-D |
| 漂移检测 | 冻结面 `git diff`、`KIND_SET` 字面块、`src/content` import 边、台账 `modifiedRanges` | V4 / V7 / V9 |

**脚本约定**：验证脚本由本 Agent 自主编写并直接执行（ADR-003），存放于编排器指定探针目录 `/tmp/opencode/v5-2-validate/`（模板默认 `/tmp/sddu-validate-<feature>-<timestamp>/`；本次按编排器指令使用固定目录，日志在 `logs/`）。

---

## 5. 纪律

1. **扰动可还原**：所有注入/伪造只在探针内存或源码**副本**上进行；不修改仓库源码做对抗（唯一例外见 N-01 处置记录）。
2. **F / N 分级**：`F` = 实测已闭环（含等价重锚）；`N` = 登记的非阻塞残留（含修复路径）。
3. **判定三态**：`✅ 通过` / `⚠️ 有条件通过` / `❌ 不通过`；无法执行项标 `⏭️` 并说明原因。
4. **人工面**：浏览器原生权限弹窗体感 / 读屏实感 = `⏳`，**不得冒充 PASS**。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V1~V9 对抗优先场景矩阵；34 FR / 9 NFR / 11 EC / 11 AC 的 Vx 映射；五维度方法学；F/N 分级与人工面纪律） | 2026-09-22 | SDDU Validate Agent |
