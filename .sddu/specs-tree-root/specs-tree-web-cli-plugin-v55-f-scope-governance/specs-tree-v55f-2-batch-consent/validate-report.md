# 验证报告：specs-tree-v55f-2-batch-consent（V5.5F-2 任务级批量授权）

> **文档定位**: SDDU 验证报告 — 逐项记录 V1~V9 的**实测**结果，作为本叶工作流终点
> **验证策略**: `validate.md` v1.0（V1~V9 对抗优先场景矩阵 + 五维度方法学）
> **前置依赖**: `spec.md` v1.0 · `review-report.md` v1.0（R1 **✅ 通过**，0 BLOCK / 4 I / 5 O；审查对象 HEAD `8ebd533`，I-01~I-04 于 `c0bac99` 微修闭环）· 本叶 `plan.md` v1.0 · 父 `plan.md` + ADR-SGO-004/005/006/007 · 叶1（**validated**）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-24
> **验证轮次**: **R1**（独立动态验证；对象 = HEAD `c0bac99`（review 微修后），基线 = 分支 `feature/web-cli-plugin`）
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-24
> **更新说明**: 初始创建（V1~V9 全绿；3 个自研探针 + 3 处源码注入逐字节还原；S0′ 批量段双面复刻；红线 / 体积独立复算命中；`binding` 首跑 KL-N-10 flake 隔离复跑绿，如实登记）

---

## 1. 验证概要

| 维度 | 数值 |
|------|:--:|
| 验证项总数 | 9（V1~V9，含 40+ 子断言 / 3 个自研探针 + 3 处源码注入） |
| 通过 | **9** |
| 失败 | 0 |
| 无法执行 | 1（人工面：M2 连点疲劳体感 / M3 批量计划卡真机可读性与可否决性 → `⏳`，按 AC-SGO-026 规定**不冒充 PASS**） |
| 阻塞问题 | **0** |
| 红线 / 冻结面 | **逐字节命中**（`content.js` 177,076 / `52a82620…`；`pick-layer.js` 34,358 / `77796bab…`；base / manifest / content src / `policy.ts` / `auto-authorize.ts` / `op-table.ts` 零 diff） |
| 载体 | `KIND_SET` 40 ∧ `CARD_TYPES` 12 ∧ `REGISTERED_STRUCTURAL_HOSTS === []` ∧ `MAX_OPEN_ASKS` 2 ∧ `ASK_CANCEL_REASONS` 4 ∧ `requestTurn(` 调用点恰 2 |
| 体积 | `sidepanel.js` **591,946 B** ≤ 生效上限 **621,543 B**（档位 614,400 / 绝对上限 675,840 / `pending-author-line`）；两叶 Σ **+13,323 B**（正常口径 9.5~14.5 KB） |
| 构建 | `tsc` 退出码 **0** · `build` 退出码 **0**（可复现）；`npm test` 退出码 **0**（**1394 / 0**） |

---

## 2. 逐项验证结果（V1~V9）

| # | 验证对象 | 验证步骤（摘要） | 预期结果 | 实测结果 | 判定 |
|---|---------|----------------|---------|---------|:--:|
| **V1** | 门禁全量复跑 + 计数对账（基线 1394） | ① `npm run typecheck` / `npm run build`；② `npm test`（node 全量）；③ 逐门禁单独复跑；④ 直接相关 / 保护段 Chromium 串行 | 全绿 + 计数只增 | `typecheck`=0 · `build`=0；`npm test` **1394 tests / 1394 pass / 0 fail**（exit 0，`duration_ms` 144,938）；逐门禁：supersession **42/0** · batch-consent **7/0** · op-three-tier **11/0** · capability-wiring **11/0** · host-registry **11/0** · gate-integrity **22/0** · s0-self-driven-chain **27/0** · law9 **14/0** · ref-context-in-turn **9/0** · op-wiring **14/0**；Chromium：s0-self-driven **70/0** · law8 **52/0** · dead-end **53/0** · stream **76/0** · auth-chip **37/0** · ask-auth **78/0** · journey **171 PASS** · binding **192 PASS**（首跑 KL-N-10 flake ⇒ 隔离复跑，见 §6 N-01） | ✅ |
| **V2** | **S0′ 批量段双面独立复刻** | ① node 面亲跑 `s0-self-driven-chain` 的 `S0P-B1~B3`（真源切片 = `batch-plan.ts`）；② Chromium 面亲跑 `s0-self-driven.mjs` 的 `S0C-11` / `S0P-C6`；③ 样本单源核对 | B1 一次手势覆盖计划内全部 + 计划外逐条回落；B2 改写 ≤ 引用（授权例外）；B3 二择 + 中止可判 | node **27/0**（含 `S0P-B1~B3` 正读 + 5 条反证：少放行 / 计划外不回落 / N<2 / 越权改写 / 二择缺失 / 中止不可判 / 留痕格式坏 / 留痕含用户内容值 ⇒ 各必红）；Chromium **70/0**，`S0P-C6` 实测：一条 `confirm-request{plan}` ⇒ **单张** auth 卡承载 N 行（仅 `textContent`）∧ 一次手势批准 ⇒ `batch.gesture=user ∧ batch.results=N/N`（零明文）∧ 扩围二择走既有 `askuser`；`S0P_B_ITEMS.length === 3 ∧ S0P_BEATS.length === 5`；人工面 M2/M3 = `⏳`（Chromium 内如实登记） | ✅ |
| **V3** | **安全边界行为级**（一次手势承重 / 指纹 / 漂移 / 特权 / AI 代答） | 自研探针 `probe-bridge-behavior.mjs`（驱动生产编译模块）+ 注入 A/B | 一次手势承重；指纹含文本对不可归一化绕过；漂移显式失败；特权不入批；AI 代答必红 | 探针 **16/16**：① 一次手势承重——计划 2 条 ⇒ 首次写 1 卡（含 2 行 `plan.entries`）⇒ 批准 ⇒ 计划内第 2 条**零再弹**（`captured.length===1`）；审计只记 `fingerprintDigest` + `batchEntries:2`（零明文正文）；② 指纹绑定——同目标改译文（`译文甲`→`译文丙`）/ 尾随空格 ⇒ 准入 = `fallback`（不静默放行），同目标同译文 ⇒ `admitted`；③ 漂移拒——批准后 `refs` 空 ⇒ `drift`（`BATCH_DRIFT_TEXT`）；目标不可解析 ⇒ 出普通单条卡（非静默放行）；④ 特权不入批——`op.authorize` / `op.perm.request` 调用**不入计划**（计划恰 1 条 `set-text`），桥对特权工具不返回 `admitted`；⑤ **注入 A**（AI 侧 `markApproved(`）⇒ `supersession` **41/1**（命中「AI 代答了计划审批」）；**注入 B**（`batch-plan.ts` 含 `op.authorize`）⇒ `capability-wiring` **10/1**（见 §3.2 / V6） | ✅ |
| **V4** | **扩围二择行为级** | 自研探针 `probe-widen.mjs`（`ref-scope` 生产模块 + 真源切片）+ Chromium `ND-10` | 整页 ⇒ `out-of-scope-authorized` + 留痕 + confirm 卡；拒绝 / 取消 ⇒ fail-closed 零死端 | 探针 **10/10**：`scopeReading` 四值逐值可判（`out-of-scope-authorized` / `out-of-scope-unauthorized` / `in-scope` / `no-ref`）；`scopeReadingTrace('out-of-scope-authorized', true) === 'scope.reading=out-of-scope-authorized \| scope.authorized=user'`；`isWidenWholePage` 只认「整页」字面量（取消 / 另一选项 ⇒ `false`）；**唯一写入面** `scopeWidenAuthorized = true` 全仓**恰 1 处**（注释不计）∧ 在 `if (isWidenWholePage(choice))` 分支内 ∧ 写入后落留痕 + 出 confirm 卡；AI/SW 侧 4 模块零写入面；Chromium `ND-10` **53/0**：整页 ⇒ 转值 `out-of-scope-authorized` + 入留痕 + 出 confirm 卡；拒绝扩大 ⇒ fail-closed（不写 + 可读理由 + 范围留痕）∧ 零死端（无阻塞载体 / 无开口 ask）；`ND-10 (FAIL 段)` 未确认扩围 ⇒ 必红 | ✅ |
| **V5** | **fallback 分支行为级（I-02 微修后）** | 自研探针 `probe-bridge-behavior.mjs` §V5（计划外写经桥） | 文案上屏 ∧ planGate 不推进 ∧ 不挂计划行 | 探针 **4/4**：计划外单条 ⇒ 出卡（不静默放行）；卡 `plan === undefined`（I-02 ①）；`reason` 含回落文案（I-02 ③，`BATCH_FALLBACK_TEXT`）；同意后 `consent.state()` 仍 **`pending`**（I-02 ②，不推进整批审批）；随后计划内首次写 ⇒ 仍出**计划卡**（fallback 未消耗批次授权，`state → approved`）；fallback 的 `ask` 审计如实 | ✅ |
| **V6** | **注入抽验（≥2）** | 3 处源码注入（A 运行时扫描 / B 运行时扫描 / C 行为级重编译）+ `git checkout` 逐字节还原 | 注入全红且逐字节可还原 | **注入 A**（`ai-drive.ts` 前置 `batchConsent.markApproved();`）⇒ `supersession` **41/1**（命中「AI 代答了计划审批（ai-drive.ts:markApproved(）」）；**注入 B**（`batch-plan.ts` 注入 `op.authorize`）⇒ `capability-wiring` **10/1**（「批量计划模块不得出现特权 op op.authorize」）；**注入 C**（`admitEntry` 计划外分支改 `admitted`，重编译）⇒ `batch-consent` **6/1**（`BC-3：… 期望 fallback 实测 admitted`）；三处均 `git checkout` 还原 ⇒ sha256 前后**逐字节相同**（A `28e7e49a…` / B、C `9e54049f…`）⇒ 复绿 `supersession 42/0` · `capability-wiring 11/0` · `batch-consent 7/0`；`git status` 终态**空** | ✅ |
| **V7** | **红线 / 冻结面 / 载体终核** | 自研探针 `probe-redline-size.mjs`（自算 sha256 + `git diff` + 生产模块导入） | 逐字节命中 / 零 diff；零新载体 | 探针 **8/8**：`content.js` **177,076 / sha `52a82620…`**；`pick-layer.js` **34,358 / sha `77796bab…`**；`web-cli-base/**` + `manifest.json` + `src/content/**` + `security/policy.ts` + `security/auto-authorize.ts` + `shared/op-table.ts` 对实现前基线 `850ae82` **零 diff**；`KIND_SET` **40**（无 `plan` kind）；`requestTurn(` 调用点**恰 2**（行 3756 / 3783）；`CARD_TYPES` **12** ∧ `REGISTERED_STRUCTURAL_HOSTS === []` ∧ `MAX_OPEN_ASKS` **2** ∧ `ASK_CANCEL_REASONS` **4**；特权 op **恰 2** 恒 `gesture`；`batch-plan.ts` 零特权标识 | ✅ |
| **V8** | **体积五要素 + 两叶 Σ** | 自研探针 `probe-redline-size.mjs` §V8（独立复算式 + 产物 stat + 归因核对） | 五要素同源；两叶 Σ 预算内；EC 未触发 | 探针 **6/6**：`SIDEPANEL_BASELINE_BYTES == 实测产物 == 591,946`；生效上限 `= min(675,840, floor(591,946×1.05)) = 621,543`（**未越**）；档位 614,400 / 绝对上限 `614,400×1.10 = 675,840` 自洽（**未跨**）；`authorConfirmation = pending-author-line`；两叶 Σ = 叶1 +7,109 + 叶2 +6,214 = **+13,323 B** 落在正常口径 9.5~14.5 KB；`v55f2R1R2Rows` 逐模块 Σ +6,214 == 登记增量；EC-SGO-022 三分支均未触发 | ✅ |
| **V9** | **漂移检测 + AC 映射** | `git diff`（spec / 冻结面）+ worktree 终态 + 文件对照 + AC 映射表 | 0 漂移；规格未动；无孤立 / 无缺失 | `spec.md` 对实现前基线 `850ae82` **零改动**（零规格漂移）；worktree `git status --porcelain` **空**；孤立代码扫描：本叶新增 `src/background/batch-plan.ts` 有 FR-SGO-040~045 归属（其余为 MODIFY）；需求缺失扫描：21 条 FR 切片逐条有承接点（§3.1）；AC 12 锚点逐条 → Vx 映射闭合（§3.4） | ✅ |

> **⏭️**：AC-SGO-026 的人工面 **M2（42 连点疲劳体感）/ M3（批量计划卡真机可读性 / 可否决性）** 属人工面 —— headless 不可合成，本轮**未执行**，标 `⏳`，**不冒充 PASS**（Chromium 门禁内已如实登记）。

---

## 3. 验证详细信息

### 3.1 测试覆盖（V1 / V2 / V4 / V6）

| 门禁 | build/review 声明 | 本轮实测 | 判定 |
|------|:--:|:--:|:--:|
| `npm test`（node 全量） | 1394 / 0 | **1394 / 1394 / 0**（exit 0） | ✅ |
| `supersession-ledger`（RL-06 扩批量） | 42 / 0 | **42 / 0** | ✅ |
| `batch-consent`（新，BC-1~7） | 7 / 0 | **7 / 0** | ✅ |
| `op-three-tier`（OT-⑩ 扩批量） | build §9.2 记 12/0 | **11 / 0**（`grep -c '^test('`=11） | ✅（**登记订正**，见 §6 O-01） |
| `capability-wiring`（特权不入批） | build §9.2 记 10/0 | **11 / 0**（`grep -c '^test('`=11） | ✅（**登记订正**，见 §6 O-01） |
| `host-registry` | 绿 | **11 / 0** | ✅ |
| `gate-integrity` | 22 / 0 | **22 / 0** | ✅ |
| `s0-self-driven-chain`（S0P-1~8 + S0P-B1~B3） | 27 / 0 | **27 / 0** | ✅ |
| `law9-scope-reading`（含 L9-9 扩围） | 14 / 0 | **14 / 0** | ✅ |
| `ref-context-in-turn` | 9 / 0 | **9 / 0** | ✅ |
| `op-wiring` | 14 / 0 | **14 / 0** | ✅ |
| `s0-self-driven`（Chromium，含 S0C-11） | 70 / 0 | **70 / 0** | ✅ |
| `test:law8`（Chromium，⑨ 批量面 52） | 52 / 0 | **52 / 0**（⑨-①~④ + FAIL/PASS 段） | ✅ |
| `test:dead-end`（Chromium，ND-10） | 53 / 0 | **53 / 0** | ✅ |
| `test:stream` | 76 / 0 | **76 / 0** | ✅ |
| `test:auth-chip` | 37 / 0 | **37 / 0** | ✅ |
| `test:ask-auth` | 78 / 0 | **78 / 0** | ✅ |
| `test:ui`（journey；保护段） | 171 / 0 | **171 PASS** | ✅ |
| `test:binding`（保护段） | 192 / 0 | **192 PASS**（首跑 KL-N-10 flake ⇒ 隔离复跑） | ✅ |
| `CHROMIUM_GATES.length` | 9 | **9**（逐字不动；`gate-integrity` 22/0 内机核） | ✅ |

**FR 覆盖账（承载父 FR 切片 21/21 = 100%）**：FR-SGO-040~050 / 060~063 / 081 / 082 / 093 / 103 / 105 / 107 逐条落于 V1~V9（映射见 `validate.md` §3.1），**无未覆盖项**。

**NFR 覆盖账（本叶相关 10/10 = 100%）**：`NFR-SGO-001 / 002 / 003 / 004 / 006 / 007 / 011 / 012 / 013 / 014` 逐条有实测判据（§3.2）。本叶**不承载** NFR-SGO-008 / 009（属叶1）—— 本轮未使其回退（叶1 门禁家族 `ref-context-in-turn` / `law9` / `host-registry` 复跑全绿）。

**EC 覆盖账（本叶子集 10/10 = 100%）**：`EC-SGO-005/006/009/010/011/012/013/014/021/022` 逐条有实测证据（§2 V2/V3/V4/V5/V8）。

### 3.2 行为级接口实测（V2 / V3 / V4 / V5）

| 检查项 | spec / 声明要求 | 实测结果 | 一致？ |
|--------|---------------|---------|:--:|
| 计划边界 | 单条 assistant 消息的 in-scope `dom set-text`；范围外不入计划 | `buildPlan` 2 in-scope + 1 越界 ⇒ 恰 2 条；`planMode` `N≥2`=`card` / `N==1`=`single` / `N==0`=`none` | ✅ |
| 一次手势承重 | 首次写 1 卡；批准后计划内后续写不再出卡 | 桥实测 `captured.length===1`（第二次计划内写零再弹） | ✅ |
| 指纹含文本对 | 目标集合 ∧ 动作类型 ∧ 文本对；尾随空格 ⇒ 变 | 改译文 / 尾随空格 ⇒ `fallback`（不归一化） | ✅ |
| 漂移显式失败 | 批准前目标集合变化 ⇒ `drift`（不静默按旧指纹放行） | `admitEntry(entry, {state:'approved'}, [])` ⇒ `drift` + `BATCH_DRIFT_TEXT` | ✅ |
| 特权恒不入批 | `op.authorize` / `op.perm.request` 无入批入口 | 特权调用不入计划；桥对特权工具不返回 `admitted`；`batch-plan.ts` 零特权标识 | ✅ |
| 计划外回落 | 第 N+1 条 ⇒ 逐条确认；一次点击不放开无限写 | `admitEntry` ⇒ `fallback`；桥出卡（不静默放行） | ✅ |
| fallback 分支（I-02） | 不挂计划行 / 文案上屏 / 不推进 `planGate` | 三项实测成立；随后计划内首次写仍出计划卡 | ✅ |
| 审计零明文 | 只记 `fingerprintDigest` / `batchEntries`（字段名 / 计数 / 摘要） | 审计串含指纹摘要 + `"batchEntries":2`；零命中正文 / 译文 / 原文摘要 | ✅ |
| 扩围转值 | 整页确认 ⇒ `out-of-scope-authorized`；未确认 ⇒ `out-of-scope-unauthorized` | 逐值实测成立 | ✅ |
| 扩围留痕 | `scope.reading=<enum> \| scope.authorized=user` | 逐字成立（零用户内容值） | ✅ |
| 唯一写入面 | `scopeWidenAuthorized = true` 恰 1 处 ∧ 真实点击值守卫 | 全仓恰 1 处（注释不计）+ `isWidenWholePage(choice)` 守卫 + AI/SW 零写入面 | ✅ |
| 结论 | 计划指纹绑定生效 | 内放行 / 外回落 / 漂移显式失败三态齐备 | ✅ |

### 3.3 构建脚本（V1 / V7）

| 命令 | 退出码 | 时长 | 输出摘要 | 结果 |
|------|:--:|------|---------|:--:|
| `npm run typecheck` | **0** | — | 无类型错误 | ✅ |
| `npm run build` | **0** | — | `dist/sidepanel.js` = **591,946** · `background.js` = **1,635,850** · `content.js` 177,076 · `pick-layer.js` 34,358（**可复现**：构建前后 stat / sha 不变） | ✅ |
| `npm test`（node 全量） | **0** | ≈ 145 s | tests 1394 / pass 1394 / fail 0 | ✅ |

### 3.4 性能与边界（V8）

| 判据 | 要求 | 实测 | 达标？ |
|------|------|------|:--:|
| `sidepanel.js` ≤ 生效上限 | 591,946 ≤ 621,543 | `floor(591,946×1.05) = 621,543`；591,946 未越 | ✅ |
| 档位 / 绝对上限 | 614,400 / 675,840 | `614,400×1.10 = 675,840`；591,946 均未跨 | ✅ |
| 两叶 Σ vs 预算 | 正常口径 9.5~14.5 KB | +7,109（叶1）+6,214（叶2）= **+13,323 B ≈ 13.0 KiB** | ✅ |
| 逐模块归因 | Σ rows + glue == 登记增量 | `v55f2R1R2Rows` Σ +6,214 + glue 0 == +6,214 | ✅ |
| 人工面体积口径 | 不越档位 / 不伪称 | `authorConfirmation = pending-author-line` | ✅ |
| EC-SGO-022 二态 | 越上限 / 越档位 / 越绝对上限 | 均 **否** ⇒ 三分支未触发 | ✅ |

### 3.5 漂移检测（V7 / V9）

| 漂移类型 | 检测命令/方法 | 结果 |
|---------|-------------|------|
| 孤立代码（有代码无需求） | 新增 `src/background/batch-plan.ts` ↔ spec §4 逐条对照 | ✅ 无（FR-SGO-040~045 归属） |
| 需求缺失（有需求无代码） | 承载父 FR 切片 21 条逐条找承接点 | ✅ 无 |
| 规格漂移（spec 被修改） | `git diff 850ae82..HEAD -- …/specs-tree-v55f-2-batch-consent/spec.md` | ✅ **空**（零改动） |
| 冻结面漂移 | `git diff 850ae82..HEAD -- base/manifest/content src/policy/auto-authorize/op-table` | ✅ **空**（零 diff） |
| 红线漂移 | 自算 sha256（content / pick-layer） | ✅ 逐字节命中 |
| 载体漂移 | `KIND_SET` 40 ∧ 12 kind ∧ 零宿主 ∧ `requestTurn(` 2 | ✅ 0 新增 |
| worktree 残留 | `git status --porcelain` | ✅ **空**（`.sddu` 外零残留） |

---

## 4. 验证脚本执行记录（ADR-003）

> 脚本由本 Agent 自主编写并**直接执行**（不走 task→build）；目录 = 编排器指定 `/tmp/opencode/v4-gate-logs/v55f-2-validate/`（模板默认 `/tmp/sddu-validate-<feature>-<timestamp>/`；本次按编排器指令使用固定目录）。

| 脚本文件 | 用途 | 对应场景 | 退出码 | 关键输出 |
|---------|------|:--:|:--:|---------|
| `probe-bridge-behavior.mjs` | 计划感知桥行为级：一次手势承重 / 指纹绑定 / 漂移拒 / 特权不入批 / fallback 分支 | V3 + V5 | 0 | **16/16**；计划内二次写零再弹；改译文/尾随空格 ⇒ fallback；refs 空 ⇒ drift；特权不入计划；fallback 文案上屏 ∧ `state` 仍 pending |
| `probe-widen.mjs` | 扩围二择转值判据 + 唯一写入面结构性复核 | V4 | 0 | **10/10**；四值逐值可判；留痕逐字；`scopeWidenAuthorized = true` 恰 1 处（注释不计）∧ 被点击值守卫 |
| `probe-redline-size.mjs` | 红线 / 冻结面 / 载体 / 体积五要素 / 两叶 Σ / 漂移独立复算 | V7 + V8 + V9 | 0 | **16/16**；sha 逐字节命中；零 diff；KIND_SET 40；requestTurn 2；591,946 / 621,543 / 614,400 / 675,840；两叶 Σ +13,323 |
| `inject-probe.sh` | 3 处源码注入 + 逐字节还原 + 复绿回执 | V6 | 0 | 注入 A ⇒ supersession 41/1；注入 B ⇒ capability-wiring 10/1；注入 C ⇒ batch-consent 6/1；还原 sha 相同 ⇒ 复绿 42/0 · 11/0 · 7/0；`git status` 空 |
| `injection-pre-shas.txt` | 注入前后 sha256 复核 | V6 | 0 | `ai-drive.ts 28e7e49a…` / `batch-plan.ts 9e54049f…` 前后相同 |
| `inject-A-ai-answer.log` · `inject-B-privileged.log` · `inject-C-fallback.log` | 注入后门禁红原始输出 | V6 | 1 | 命中判据片段（AI 代答 / 特权 op / BC-3 期望 fallback 实测 admitted） |
| `inject-restore-*.log` | 还原后复绿回执 | V6 | 0 | supersession 42/0 · capability-wiring 11/0 · batch-consent 7/0 |
| `npm-test.log` · `typecheck.log` · `build.log` | node 全量 / 类型 / 构建 | V1 | 0 | 1394/0 · 0 · 0（591,946） |
| `gate-*.log`（supersession / batch-consent / op-three-tier / capability-wiring / host-registry / gate-integrity / s0-self-driven-chain / law9-scope-reading / ref-context-in-turn / op-wiring） | 逐 node 门禁单独复跑 | V1 | 0 | 42/0 · 7/0 · 11/0 · 11/0 · 11/0 · 22/0 · 27/0 · 14/0 · 9/0 · 14/0 |
| `s0-self-driven.log` · `law8.log` · `no-dead-end.log` · `stream.log` · `auth-chip.log` · `ask-auth-inflow.log` · `journey.log` · `binding.log` / `binding-retry2.log` | Chromium 门禁串行复跑 | V1 / V2 / V4 | 0 | 70/0 · 52/0 · 53/0 · 76/0 · 37/0 · 78/0 · 171 · 192（首跑 1 flake ⇒ 复跑 PASS） |

---

## 5. 阻塞问题

**无（0 个）。** 未发现红线⑥（AI 代答 consent）被侵蚀、特权 op 入批、法八零明文破、载体新增（`KIND_SET` / kind / 宿主）、判据恒真、base 或冻结面被撞、体积上限越界或欺瞒性登记。

---

## 6. 非阻塞登记与 F/N/O 清单

| # | 来源 | 位置 | 问题 | 分级 | 处置 |
|---|------|------|------|:--:|------|
| **N-01** | 本轮 | `test/ui/binding.mjs` 首跑 | 阶段 1 `#8d/#8e` 处 `selector not found: #confirm-allow`；诊断落盘显示 `CDP socket not open`（与 KL-N-10 同族环境性 flake） | **N（登记）** | 清理陈旧 `/tmp/web-cli-*` fixture 后**隔离复跑 192/0 PASS**。**不伪称首跑绿**；与 build R2 偏差登记 2 / EC-SGO-021 同口径。 |
| **O-01** | 本轮 | `build.md` §9.2 | R2 终值表两行与实测不符：`op-three-tier` 记 **12/0**（实测 **11/0**）、`capability-wiring` 记 **10/0**（实测 **11/0**）；`grep -c '^test('` 实测 11 / 11，门禁实跑 11/0 / 11/0 | **O（登记）** | `review-report.md` §0 已按 11/0 · 11/0 如实记录（**review 侧无误**）；仅 `build.md` §9.2 两格数值抄录偏差。**零代码 / 零判据影响**（build §4 的 R1 基线列 11/0 · 9/0 亦与此同族）。建议随父收口一并订正 `build.md` §9.2 两格为 11/0 · 11/0。 |
| **O-02** | 本轮 | 脚本目录 | 采用编排器指定固定目录（`/tmp/opencode/v4-gate-logs/v55f-2-validate/`）而非模板默认时间戳目录 | **O（登记）** | 与 v55f-1 / v5-2 等前例一致；脚本与日志同目录，可回溯。 |
| **O-03** | 本轮 | `src/security/confirm.ts` | 桥层「指纹漂移」经由桥**不可直接触达**（`planEntryOf` 由**当前** refs 重推导 ⇒ 目标不可解析时 `entry` 为空 ⇒ 回落普通单条卡 = 需新鲜手势，仍 fail-closed）；`drift` 仅在 `admitEntry` 层可达（BC-4 已覆盖） | **O（登记）** | 属结构性的**安全兜底**（不是缺陷）：桥层不可解析 ⇒ 不静默放行。已由 V3 探针第 ③ 组实测（出普通单条卡、`plan===undefined`）。 |
| **O-04** | 本轮 | 人工面 | M2（42 连点疲劳体感）/ M3（批量计划卡真机可读性 / 可否决性）= `⏳` 未执行 | **O（登记）** | headless 不可合成，**不冒充 PASS**（AC-SGO-026 如实登记）。 |

**计数对账（F/N/O）**：`F = 0`（review 的 I-01~I-04 已在 `c0bac99` 微修闭环，本轮复核其成立：`cards/index.ts` 单行 import / `confirm.ts` fallback 显式分支 / `BATCH_RENDER_MAX` 已删 / `build.md` I-04 两处订正）· `N = 1`（N-01 环境性 flake，已隔离复跑绿）· `O = 4` · 阻塞 `0`。

> **review 微修复核（c0bac99）**：① I-01 —— `cards/index.ts` 两条 import 已拆回单行（`sidepanel.js` 591,946 字节不变）；② I-02 —— `confirm.ts` `fallback` 显式独立分支（V5 探针 4/4 实测）；③ I-03 —— 全仓 `grep BATCH_RENDER_MAX` = 0（展示上限单源保留 `AUTH_PLAN_RENDER_MAX`）；④ I-04 —— `build.md` §9.2 supersession 42/0（实测 `test:supersession` = 42/0）· §9.3 生效上限 621,543（实测复算一致）。

---

## 7. 结论

**结论**: ✅ **通过**

**指标达标矩阵**：

| 指标 | 要求 | 实测 | 达标？ |
|------|------|------|:--:|
| FR 测试覆盖 | 100% | 承载父 FR 切片 **21/21 = 100%**（逐条 Vx 映射） | ✅ |
| NFR 测试覆盖 | ≥ 80% | 本叶相关 **10/10 = 100%** | ✅ |
| EC 覆盖 | ≥ 80% | 本叶子集 **10/10 = 100%** | ✅ |
| 构建退出码 | 0 | **0**（`tsc` / `build` / `npm test` 均 0；冻结面 sha 逐字节命中） | ✅ |
| 严重漂移 | 0 | **0**（冻结面 / 红线 / `KIND_SET` / 载体全命中；spec 零改动；worktree 空） | ✅ |
| 阻塞问题数 | 0 | **0** | ✅ |
| 对抗判红 | 全类可红 | 注入 A/B/C（AI 代答 / 特权入批 / 计划外放行）**全红且逐字节还原后全绿**；门禁内反证段齐备 | ✅ |
| 人工面 | 不冒充 PASS | M2 / M3 = `⏳`（1 类无法执行，如实标注） | ✅ |

**理由**：

1. **V1 门禁与声明值逐项可复现**：`npm test` **1394/1394/0**（exit 0，基线 1394）；逐 node 门禁单独复跑计数（42 / 7 / 11 / 11 / 11 / 22 / 27 / 14 / 9 / 14）与 build/review 声明**逐字一致**（仅 `build.md` §9.2 两格数值抄录偏差，见 O-01，**零判据影响**）；直接相关 / 保护段 Chromium（s0-self-driven 70 / law8 52 / dead-end 53 / stream 76 / auth-chip 37 / ask-auth 78 / journey 171 / binding 192）全绿，`CHROMIUM_GATES === 9` 不动。
2. **V2 S0′ 批量段双面承重**：node 面 `S0P-B1~B3` 正读 + 5 条反证（少放行 / 计划外不回落 / N<2 / 越权改写 / 二择缺失 / 中止不可判 / 留痕格式坏 / 留痕含用户内容值 ⇒ 各必红）27/0；Chromium 面 `S0P-C6` 实测「一条 `confirm-request{plan}` ⇒ 单张 auth 卡 N 行 ∧ 一次手势 ⇒ `batch.gesture=user ∧ batch.results=N/N`」70/0；**B1 / B2 / B3 三项双面可判**，人工面 M2/M3 如实 `⏳`。
3. **V3/V6 安全边界承重（唯一红线级 R-SGO-001）**：自研探针实测一次手势承重（计划内二次写**零再弹**）、指纹含文本对**不可归一化绕过**（尾随空格 ⇒ 回落）、漂移**显式失败**、特权**恒不入批**；**3 处注入**（AI 侧 `markApproved(` / 特权标识入计划模块 / 计划外改放行）分别命中 `supersession`（41/1）· `capability-wiring`（10/1）· `batch-consent`（6/1），且**逐字节还原**（sha 相同）后三个门禁复绿、`git status` 空 —— 判据**非恒真**。
4. **V4 扩围二择正向可达且拒绝零死端**：`scopeReading` 四值逐值可判、`isWidenWholePage` 只认真实点击值、`scopeWidenAuthorized = true` **全仓恰 1 处**且被点击值守卫（AI/SW 零写入面）；Chromium `ND-10` 53/0 覆盖「整页 ⇒ `out-of-scope-authorized` + 入留痕 + confirm 卡」与「拒绝 ⇒ fail-closed + 可读理由 + 零死端」。
5. **V5 fallback 分支（I-02 微修后）行为级成立**：计划外回落卡**不挂计划行**、`BATCH_FALLBACK_TEXT` **文案上屏**、同意**不推进整批审批**（`state` 仍 `pending`），且判据本体（计划外不自动放行）未改。
6. **V7/V8/V9 红线 · 体积 · 漂移独立复算命中**：`content.js` 177,076 / `52a82620…`、`pick-layer.js` 34,358 / `77796bab…` 逐字节；base / manifest / content src / `policy.ts` / `auto-authorize.ts` / `op-table.ts` 零 diff；`KIND_SET` 40 / 12 kind / 零宿主 / `requestTurn(` 2 / 特权恰 2 恒 `gesture`；体积五要素同源（591,946 / 621,543 / 614,400 / 675,840 / `pending-author-line`），两叶 Σ **+13,323 B** 在正常口径内，EC-SGO-022 三分支未触发；`spec.md` 零改动、worktree 终态空。
7. **人工面如实**：M2 / M3 无 headless 合成路径，标 `⏳`，**不冒充 PASS**。

🎉 全部 7 阶段工作流已完成（discovery → spec → plan → tasks → build → review → **validate**）。

---

## 8. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1 动态验证：V1~V9 全绿 / 3 个自研探针 + 3 处源码注入逐字节还原；S0′ 批量段双面复刻；红线·冻结面·载体·体积五要素·两叶 Σ 独立复算命中；安全边界（AI 代答 / 特权入批 / 一次手势承重 / 指纹漂移）与扩围二择、fallback 分支行为级承重；`binding` 首跑 KL-N-10 flake 隔离复跑绿，如实登记；`build.md` §9.2 两格数值抄录偏差登记为 O-01；结论 ✅ 通过 / 0 阻塞） | 2026-09-24 | SDDU Validate Agent |
