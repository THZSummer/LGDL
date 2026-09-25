# 验证报告：specs-tree-ian-1-free-input-next

> **文档定位**: SDDU 验证报告 — 逐项记录**动手验证**（R1）的执行结果，作为工作流终点
> **验证策略**: `validate.md`（V1~V8 场景矩阵 + 五维度 + AC 逐条映射）
> **前置依赖**: `validate.md` · `spec.md`（v1.0）· `plan.md`（v1.0）· `build.md`（v2.0 · R1+R2 叶1 收口）· `review-report.md`（v1.0 R1 · **✅ 通过 / 0 BLOCK / 3 I / 2 O**）
> **验证对象**: `feature/web-cli-plugin` @ **`537813d`**（R1 `e76f455` + R2 `2aa58ab`；任务 **27/27**）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-25
> **验证轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-25
> **更新说明**: 初始创建（叶1 流内自由输入 next 通道动态验证：V1~V8 全绿 / **0 阻塞** / 0 严重漂移；亲跑 node `npm test` **1431/0 ×2** + 自研 Chromium 行为级 16/0 + Chromium 全量门禁 + 注入抽验 ×2 + 三冻结面/体积/红线终核）

---

## 1. 验证概要

| 维度 | 数值 |
|------|:--:|
| 验证项总数 | **8**（V1~V8） |
| 通过 | **8** |
| 失败 | 0 |
| 无法执行 | 0（人工面 M1/M2/M5 属**人工面**，按规范显式登记 `⏳`，不计入 Vx 失败） |
| 阻塞问题 | **0** |
| 新增观察项 | 1（V-01，非阻塞） |
| 注入抽验 | 2 处（均必红，逐字节还原） |

> 结论：**✅ 通过** —— FR 100% / NFR 100% 映射，构建退出码 0，0 阻塞，0 严重漂移。

---

## 2. 逐项验证结果（V1~V8）

| # | 验证对象 | 验证步骤 | 预期结果 | 实测结果 | 判定 |
|---|---------|---------|---------|---------|:--:|
| **V1** | S0''-A node 面（TASK-IAN-123） | `npm test` 取 `s0-self-driven-chain` 的 S0PP-A 三用例 | 双入口并存 + 双回填载体 + 反证族 ×7 + 真源切片 | ✔ S0PP-A node 面（旧 `#composer` 三 id 在位 ∧ 新入口经 `op.turn` 槽成回合）· ✔ 反证族（破坏旧入口 / 回填覆盖非空 / 在飞禁用终端 / 撞红线 ⇒ 必红 → 还原 PASS）· ✔ 真源切片（零第二回合入口 ∧ 既有 S0/S0′ 环节逐字保留） | ✅ |
| **V2** | S0''-A Chromium 面（TASK-IAN-124） | `npm run test:s0-self-driven` | 81/0；S0C-12 真面板双入口各跑通一轮 + 双回填互不覆盖 + 样本单源 + 人工面 ⏳ | **81 passed / 0 failed**；S0C-12：末端项在位恒最末（非 `.next-chip`）· 卡内输入展开获焦 · 真键入 ⇒ 真提交 ⇒ 流内 `user` 行逐字 · 法八固化不回显 · 旧 `#composer` 三 id 可用 ∧ submit 成回合 · 双回填载体并存 ∧ 不覆盖非空 · 共享判据七条全绿 ∧ 反证必 FAIL · 样本单源 ∧ M1/M2/M5 `⏳ 未执行` | ✅ |
| **V3** | R6 迁移行为级（review **I-03**） | 自研 `ian1-behavior.mjs`（真 DOM + 真 reducer + 真生产消息处理器；`/tmp/sddu-validate-ian-1-20260925-104704/`） | pending 点终端可用 · `queued` 可读行 · 空提交 notice · 双回填三分支 · Enter/Escape | **16 passed / 0 failed**：V-B1 在飞 chips `disabled=true` ∧ 终端 `disabled=false`（判别性）· V-B2 在飞点终端展开 + `#ask-input` 获焦 · V-B3 在飞真提交 ⇒ 流内 `user` 行逐字 + 真派 `chat`（含原话）+ 手输留痕 `driver=manual` + SW `queued` ⇒ 「已排队」可读行 · V-B4 空提交零 user 行 ∧ 零 chat ∧ 「输入为空」notice · V-B5①/②/③ 双载体三分支互不覆盖 · V-B6 Enter 提交 = 点击等价 ∧ Escape ⇒ `data-answered="cancelled"` | ✅ |
| **V4** | 提交通道行为级 | 亲数 `requestTurn(` + `op-wiring` + `FIN-3/4/5` + 行为级留痕 | `requestTurn(` == 2；集 B 入口 == 1；手输 ∉ 声明集；让位槽外 | `requestTurn(` 调用点 = `sidepanel.ts:3888`（composer）∧ `:3915`（`bindPanelOps.turn`）⇒ **恰 2**；`op-wiring` **14/0**；`FIN-3`（经 `dispatchOp('op.turn')`）· `FIN-4`（`MANUAL_DRIVER_ID='manual'` 单源 ∧ **∉** 11 声明 id）· `FIN-5`（`noteUserTurn` 在 `requestTurn` 体外）；行为级手输留痕 `driver=manual` | ✅ |
| **V5** | 卡内输入安全（独立 requestId / 法八 / a11y） | 注入 A + `test:law8` + `FIN-8` 哨兵 + 行为级键盘 | 共用 requestId ⇒ 必红；law8 60/0 含 ⑩；a11y 全绿 | **注入 A**（`FREE_INPUT_REQUEST_ID → 'ref-describe'`）：`free-input-next` **20 pass / 2 fail** —— `FIN-0`（`卡内输入必须有独立 requestId`）∧ `FIN-8`（`对照：普通 answer 卡确实回显`）**双红**；`test:law8` **60/0**（含 ⑩-①~④ 自由输入零明文 + 反证 payload 1→≥2）；`FIN-8` 真源切片（`askFixedText` 真调用 + `FIN8_SENTINEL` 不回显）；a11y 由 V-B2/V-B6 行为级覆盖 | ✅ |
| **V6** | 门禁全量亲跑 + 注入抽验 | `npm test` ×2 + Chromium 全量 + 对账骨架 + 注入 B | 基线 1431；全量保段；注入 B 必红 | **`npm test` 1431/0**（注入前）×**1431/0**（注入还原后）；Chromium：s0 **81/0** · law8 **60/0** · journey **171** · binding **192** · recommendation **79/0**（首跑 78/1 见 V-01，隔离复跑 ×3 PASS）· dead-end **53/0** · density **242/0** · insight **118** · hardening **24** · l0/l1/l2 **248/131/74** · auth-chip **37/0** · zero-injection **28/0** · page-input **125/0** · e2e **PASS**；node：`gate-integrity` **23/0** · `supersession` **45/0** · `op-wiring` **14/0** · size 三件套 **47/0（skipped 0）**；**注入 B**（`submitFreeInput` 直连 `requestTurn(`）：`free-input-next` **20/2**（`FIN-3` 报 `requestTurn( 必须仍恰 2（实测 2927, 3889, 3916）`）∧ `op-wiring` **8/6** | ✅ |
| **V7** | 红线 / 体积 / 冻结面终核 | sha/stat + `git diff` + `ian1-probe.mjs` 常数探针 | 三冻结面逐字节不变；零 diff；40/12/6/9/手势；五要素同源；越叶预算诚实 | `content.js` **177,076 B / `52a826205553…`** · `pick-layer.js` **34,358 B / `77796babd9c9…`**（与 build 双锚一致）；`turn-queue.ts` / `service-worker.ts` / `web-cli-base/**` / `manifest.json` **零 diff**；`dist/sidepanel.js` = **599,125 B** == 登记；`KIND_SET` **40** · **12** kind · 零宿主；`ACT_TO_OP` **6** ∧ 集 A **9**（`free-input` ∈ 集 A ∧ **∉** `ACT_TO_OP`）· provider **11** · `NEXTSTEP_PRIORITY` **4**；特权 op `op.authorize`/`op.perm.request` = **gesture**（`op.turn` = auto）；体积五要素 **599,125 / 629,081 / 614,400 / 675,840 / `pending-author-line`**（容差 5% · cap `record-only`） | ✅ |
| **V8** | 漂移与孤立代码检测 + I·O 处置 | `git diff` spec/plan + 新增文件核 + FR 映射 + 改进项处置 | 零规格漂移；R2 零新增；FR 全覆盖；3 I + 2 O 处置 | `spec.md` / `plan.md` 在叶范围 **零 diff**（仅 `tasks.json` 按 build §2.4 登记修改）；叶内新增文件**只** `test/free-input-next.test.ts`（**R2 零新增**，`test/ui/fixtures/` 仅 `s0-chain.mjs` / `s2-chain.mjs`）；9 组 FR 全映射；I-03 闭环 + I-01/I-02 登记 N + O-01/O-02 登记 N | ✅ |

---

## 3. 验证详细信息

### 3.1 测试覆盖

#### 3.1.1 功能需求（FR）— 覆盖率 **100%**（47/47 切片）

| FR 切片 | 要点 | 测试用例 / 判据 | 结果 | 覆盖率 |
|---|---|---|---|:--:|:--:|
| GOV 001~007 | 结构 / 纪律 / 红线编成 / 门禁治理 | `gate-integrity 23/0` · `supersession 45/0` · `npm test 1431` | ✅ | 已覆盖 |
| FIM 010 | 末端项存在 | `FIN-1` · `recommendation ⑰` · S0C-12 | ✅ | 已覆盖 |
| FIM 011 / 012 | 卡内输入就地展开 / 不常驻 | S0C-12 · `recommendation ⑰`（终端点击不填 `#input`）· V-B2 | ✅ | 已覆盖 |
| FIM 013 | 零死端 | `FIN-2`（floor）· `dead-end 53/0` | ✅ | 已覆盖 |
| FIM 014 | 恒最末 / 预算显式 | `FIN-1`（结构序）· `recommendation ⑰`（≤3 chips） | ✅ | 已覆盖 |
| FIM 015 | `op.describe` 有值相不变 | `FIN-0`（独立 requestId）· `askFixedText` 真源 | ✅ | 已覆盖 |
| FIM 016 / 020 | 提交经 `op.turn` 槽 | `FIN-3` · `op-wiring 14/0` · V-B3 | ✅ | 已覆盖 |
| FIM 017 | 零新增载体 | `FIN-0` · `insight 118` · V7 探针 | ✅ | 已覆盖 |
| FIM 018 | 法八零明文 | `law8 60/0`（⑩）· `FIN-8` | ✅ | 已覆盖 |
| FIM 019 | a11y | S0C-12（focus）· V-B2/V-B6（Enter/Escape） | ✅ | 已覆盖 |
| CHAN 021 | `requestTurn(` 不变 | `FIN-3`（恰 2）· 亲数 | ✅ | 已覆盖 |
| CHAN 022 | 手输 driver 两值 | `FIN-4` · V-B3 行为级 | ✅ | 已覆盖 |
| CHAN 023 | 让位语义槽外 | `FIN-5` | ✅ | 已覆盖 |
| CHAN 024 / 025 | 注入必红 / 特权 gesture | 注入 A/B · V7 tier 探针 | ✅ | 已覆盖 |
| R6Q 030 | SW 队列零 diff | `git diff turn-queue.ts` = 0 · `TA-8` | ✅ | 已覆盖 |
| R6Q 031（叶1） | 双入口并存 | S0PP-A node + S0C-12 · V-B1 | ✅ | 已覆盖 |
| R6Q 032 / 033 | 流内回填 / 不覆盖 | `FIN-7` · `TA-8` · V-B5 | ✅ | 已覆盖 |
| CONV 050 / 052 | 兜底入口流内载体内接线 | `handleCardAction('free-input')` 单路 · S0C-12 | ✅ | 已覆盖 |
| S0'' 070 / 071 / 072 / 074 | 中间态样板（node+Chromium）· 人工面 | S0PP-A · S0C-12 · M1/M2/M5 ⏳ | ✅ | 已覆盖 |
| SUPERSEDE 086（叶1） | `busy-rejected` 流内回填可判 | `FIN-7` · V-B5 · `supersession 45/0` | ✅ | 已覆盖 |
| GATE 100~106（骨架） | 只增 / 反证 / 新门禁 / 串行 | `gate-integrity 23/0` · `supersession 45/0` · 0 删除 | ✅ | 已覆盖 |
| VOL 110~115（叶1） | 五要素 / 冻结面 / 越限 EC / 重登记 | size 三件套 47/0 · V7 | ✅ | 已覆盖 |

#### 3.1.2 非功能需求（NFR）— 覆盖率 **100%**（12/12 映射；NFR-IAN-009 的 Tab 序为结构覆盖）

| NFR | 口径 | 判据 | 结果 | 覆盖率 |
|---|---|---|:--:|:--:|
| NFR-IAN-001 | ≤ 生效上限 | size-budget（登记 == 实测 599,125） | ✅ | 已覆盖 |
| NFR-IAN-002 / 003 | 特权恒 gesture / 不被代答 | 探针 tier（`gesture`）+ 注入 B | ✅ | 已覆盖 |
| NFR-IAN-004 | 法八四面零明文 | `law8 60/0`（⑩） | ✅ | 已覆盖 |
| NFR-IAN-005 | base 零 diff / 判定链零触碰 | `git diff` 零 diff | ✅ | 已覆盖 |
| NFR-IAN-006 | 兜底不放松 fail-closed | `FIN-2`（safety 保持不推荐）· `dead-end 53` | ✅ | 已覆盖 |
| NFR-IAN-007 | 零新增载体 | 探针 40/12/零宿主 | ✅ | 已覆盖 |
| NFR-IAN-008 | 「作答 / 描述」语义逐字不变 | `FIN-0` · `FIN-8` 对照 | ✅ | 已覆盖 |
| NFR-IAN-009 | focus 落卡内 / Tab 序无悬空 | S0C-12 + V-B2（focus）/ V-B6（键盘） | ✅ | 部分（Tab 序为结构覆盖） |
| NFR-IAN-011 | 零死端只增必绿 | `dead-end 53/0` | ✅ | 已覆盖 |
| NFR-IAN-012 | 门禁串行 / 无新依赖 | 串行亲跑 + `opencode.json` 零改 | ✅ | 已覆盖 |
| NFR-IAN-014 | 扩展点固定（一 provider + 一卡内载体 + 一槽） | 探针 provider 11 / 集 A 9 / `requestTurn(` 2 | ✅ | 已覆盖 |

#### 3.1.3 边界情况（EC）— 覆盖率 **100%**（14/14）

| EC | 口径 | 判据 | 结果 |
|---|---|---|:--:|
| EC-IAN-001 | 无候选仍可达 | `FIN-2` · `dead-end 53/0` | ✅ |
| EC-IAN-002 | 在飞不硬禁用（queued/busy-rejected） | V-B1 / V-B3（行为级） | ✅ |
| EC-IAN-003 | `busy-rejected` 回填 / 卡收起重展开 / 仅当为空 | V-B5①/②/③ · `FIN-7` · `TA-8` | ✅ |
| EC-IAN-004 | 空提交不空回合且不静默 | V-B4 · `FIN-6` | ✅ |
| EC-IAN-005 | 凭据形值仅走 `chat user` | `law8 ⑩` · `FIN-8` | ✅ |
| EC-IAN-007 | text ask 卡与终端并存不互扰 | `FIN-0`（requestId 分流）· V-B5 | ✅ |
| EC-IAN-009 | 中间态双入口 + 双回填 | V1 / V2 | ✅ |
| EC-IAN-010 | 键盘无悬空焦点 | V-B2 / V-B6 | ✅ |
| EC-IAN-012 / 013 | AI 撞车仲裁 / AI 不产生手输留痕 | `FIN-4`（AI 写 candidate id）· `TA-8` | ✅ |
| EC-IAN-014 | 窄视口不溢出 / 密度不动 | `density 242/0` | ✅ |
| EC-IAN-015 | flake ⇒ 隔离复跑 ≥2 如实记录 | recommendation 隔离复跑 ×3（V-01）· binding 首跑即 PASS | ✅ |
| EC-IAN-016 | 越限显式路径 | 三档均「否」+ 越叶预算显式登记（§5-V-01 无关） | ✅ |
| EC-IAN-018 | 注入：AI 代填 / 自动提交 ⇒ 必红 | 注入 A/B 必红 | ✅ |

### 3.2 接口与数据实测（生产读数）

| 检查项 | spec / plan 要求 | 实测结果 | 一致？ |
|---|---|---|:--:|
| `requestTurn(` 调用点 | 叶1 仍恰 2 | `sidepanel.ts:3888` · `:3915`（注释不计）⇒ **2** | ✅ |
| 集 B 分发入口 `dispatchChipAction(` | 恰 1 | `op-wiring` 14/0 断言 | ✅ |
| `ACT_TO_OP` | 恰 6 | **6**（`next/repick/describe/authorize/rebind/help`） | ✅ |
| 集 A `SET_A_PROTOCOL_ACTIONS` | 8 → 9 | **9**（末项 `free-input`）；`free-input ∉ ACT_TO_OP` | ✅ |
| 注册表 provider 数 | 11（含 `free-input`） | **11** ∧ `free-input` provider 在位 | ✅ |
| `NEXTSTEP_PRIORITY` | 4 | **4** | ✅ |
| `MANUAL_DRIVER_ID` | `'manual'` ∧ ∉ 声明集 | `'manual'`；声明 id **11**（含 `free-input`），`manual ∉` | ✅ |
| 特权 op 档位 | 恒 `gesture` | `op.authorize=gesture` · `op.perm.request=gesture`（`op.turn=auto`） | ✅ |
| 冻结面 sha | `content.js 177,076/52a82620…` · `pick-layer.js 34,358/77796bab…` | 逐字节一致 | ✅ |
| 冻结面零 diff | base / manifest / `turn-queue.ts` / `service-worker.ts` | `git diff` = 0 | ✅ |
| 体积五要素 | 599,125 / 629,081 / 614,400 / 675,840 / `pending-author-line` | 全同源（`SIDEPANEL_BASELINE_BYTES=599_125` · `SIDEPANEL_FINAL_ARTIFACT_BYTES=599_125` · `SIDEPANEL_CEILING=629_081` · `TIER=614_400` · `PENDING_ABSOLUTE_CAP.absoluteCeilingBytes=675_840` · cap `record-only`） | ✅ |
| 台账 | `xIianLedger` 7 行 · 门禁对账 11 行（断言零删除） | **7** / **11**（`assertionsRemoved` 全 0） | ✅ |
| 越叶预算登记 | 如实、不停机、不伪称 | `ian-1-r2` 登记 `baselineAfterBytes=599_125` · `ceilingAfterBytes=629_081` · `direction='raised'` · `assertionNonRemovalEntries` 存在；`authorConfirmation` 保持 `pending-author-line` | ✅ |

### 3.3 构建脚本

| 命令 | 退出码 | 输出摘要 | 结果 |
|------|:--:|---------|:--:|
| `npm run typecheck`（`tsc --noEmit`） | 0 | 无错误 | ✅ |
| `npm run build`（`node build.mjs`） | 0 | `dist/sidepanel.js 585.1kb` · content/pick-layer 生成 | ✅ |
| `npm test`（`tsc test/*.test.ts` + `node --test`） | 0 | **1431 pass / 0 fail / 0 skipped** | ✅ |
| size 三件套（`size-budget` + `size-ruling-vol3` + `size-growth-evidence`） | 0 | **47/47 · skipped 0**（登记 == 实测 599,125） | ✅ |

### 3.4 性能与边界（EC 行为级）

| 项 | 要求 | 实测 | 达标？ |
|---|---|---|:--:|
| EC-IAN-002 在飞提交 | 不硬禁用，走 SW 仲裁（`queued`/`busy-rejected`） | pending 时 chips `disabled=true` ∧ 终端 `disabled=false`；提交 ⇒ `user` 行 + `chat` 派出；`queued` ⇒ 「已排队」可读行 | ✅ |
| EC-IAN-003 回填三分支 | 仅当为空 / 卡收起重展开 / 卡不存在铸造 | V-B5①/②/③ 逐态可判，双载体互不覆盖 | ✅ |
| EC-IAN-004 空提交 | 零空回合 ∧ 非静默 | 零 user 行 ∧ 零 chat ∧ 「输入为空」notice | ✅ |
| EC-IAN-010 键盘 | Enter 提交 / Escape 取消 / focus | Enter 等价点击 ∧ Escape ⇒ `cancelled` ∧ 展开即 focus | ✅ |
| EC-IAN-014 密度 | 阈值不动 | `density 242/0` · `l0 248/0` | ✅ |
| EC-IAN-016 体积三档 | 越档显式路径 | 三档均「否」（599,125 < 628,196 < 614,400 < 675,840） | ✅ |
| NFR-IAN-001 | ≤ 生效上限 | 599,125 ≤ 629,081 | ✅ |

### 3.5 漂移检测

| 漂移类型 | 检测命令/方法 | 结果 |
|---------|-------------|------|
| 孤立代码（有代码无需求） | `git diff --name-status eade31d..HEAD` + FR 映射 | ✅ 无（12 个 `src` 变更全部映射至 FR-IAN-010~033 / 050~052 / 086；无新增 `src` 模块） |
| 需求缺失（有需求无代码） | spec §4 九组 FR 逐条对照实现位置 | ✅ 无（47/47 切片有实现 + 判据） |
| 规格漂移（spec 被修改） | `git diff eade31d..HEAD -- spec.md plan.md` | ✅ 无（`spec.md` / `plan.md` 零 diff；仅 `tasks.json` 按 build §2.4 登记 `unfilledPoints` 结算） |
| 样本双源（第二份 fixture） | 新增文件核 + `fixtures/` 目录 | ✅ 无（R2 **零新增文件**；仅 `test/free-input-next.test.ts`，样本单源 `s0-chain.mjs`） |

---

## 4. 验证脚本执行记录

> ADR-003：以下脚本由 validate Agent 自主编写并直接执行，存放于
> `/tmp/sddu-validate-ian-1-20260925-104704/`；**真源码零触碰**（注入脚本自带 `trap` 逐字节还原）。

| 脚本文件 | 用途 | 对应场景 | 退出码 | 关键输出 |
|---------|------|:--:|:--:|---------|
| `ian1-behavior.mjs` | R6 迁移行为级（pending/queued/空提交/双回填/键盘）；真 DOM + 真 reducer + 真生产消息处理器 | V3 | 0 | **16 passed / 0 failed** |
| `inject-a.sh` | 注入 A：`FREE_INPUT_REQUEST_ID → 'ref-describe'`（独立 requestId 退化）⇒ FIN-0/FIN-8 必红；`trap` 还原 | V5 | 1（预期红） | `free-input-next` **20 pass / 2 fail**（FIN-0 + FIN-8） |
| `inject-b.sh` | 注入 B：`submitFreeInput` 内直连 `requestTurn(`（绕过 `op.turn` 槽）⇒ FIN-3 / op-wiring 必红；`trap` 还原 | V6 | 1（预期红） | `free-input-next` **20/2**（`requestTurn(` 实测 3 处）· `op-wiring` **8/6** |
| `ian1-probe.mjs` | 红线 / 体积 / 台账常数亲核（读编译产物 + 源码切片 + JSON） | V7 | 0 | `KIND_SET 40` · `12 kind` · `ACT_TO_OP 6` · 集 A `9` · provider `11` · `PRIORITY 4` · `manual ∉ decls` · `599125/629081/614400/675840` · `xIianLedger 7` · 对账 `11` |

> 日志目录：`/tmp/opencode/v4-gate-logs/ian-1-validate/`（build 01 · npmtest 02 · s0 03 · law8 04 · recommendation 05/05b~05d · dead-end 06 · gate-integrity 07 · supersession 08 · journey 09 · binding 10 · op-wiring 11 · behavior 12/12b/12c · 注入 13/14 · npmtest-after-inject 15 · density/insight/hardening/l0/l1/l2/auth-chip 16-* · probe 17 · size 18 · zero-injection/page-input/e2e 19-*）。
> 注入后均 `git status` 空（工作区零残留），并对还原树复跑 `npm test` **1431/0**。

---

## 5. 阻塞问题

| # | 位置 | 问题 | 对应 Vx | 修复建议 |
|---|------|------|:--:|---------|
| — | — | **无（0 BLOCK）** | — | — |

### 5.1 观察项（非阻塞，不计入阻塞）

| # | 位置 | 观察 | 对应 Vx | 建议 |
|---|------|------|:--:|------|
| **V-01** | `test/ui/recommendation.mjs` ④ | 本验证轮**首跑** `78 passed / 1 failed`：`④ settled 态必有可行动卡且规则 ∈ 闭集` 读数 `{"produced":{"produced":1,"rule":null,"terminal":true}}` —— 该段 `recommend('empty')` 在**无任何 provider 候选**时命中 IAN-1 零死端 floor ⇒ 产出 `rule=null` 的「仅含终端」最小卡，而既有闭集断言只认四规则。**隔离复跑 ×3 全 79/0**（与 review/build 登记一致）。 | V6 | 非产品缺陷（floor 卡是 EC-IAN-001 的**预期行为**）；根因是 ④ 的 `empty` 夹具依赖站点/探测**实时状态**。建议叶2 / 门禁 owner 让 ④ 状态无关（夹具强制候选）或把「仅含终端 floor 卡」纳入可接受读数，以消除冷启动首跑歧义。 |

---

## 6. 结论

**结论**: **✅ 通过**

**指标达标矩阵**：

| 指标 | 要求 | 实测 | 达标？ |
|------|------|------|:--:|
| FR 测试覆盖 | 100% | **47/47 = 100%** | ✅ |
| NFR 测试覆盖 | ≥ 80% | **12/12 = 100%**（NFR-IAN-009 Tab 序为结构覆盖） | ✅ |
| EC 覆盖 | — | **14/14 = 100%** | ✅ |
| 构建退出码 | 0 | typecheck/build/`npm test` 均 **0** | ✅ |
| 阻塞问题数 | 0 | **0** | ✅ |
| 严重漂移 | 0 | **0**（spec/plan 零 diff · 无孤立代码 · 无需求缺失） | ✅ |
| 门禁基线 | 1431/0 | **1431/0 ×2**（注入前 / 还原后） | ✅ |
| 三冻结面 | 逐字节不变 | `52a82620…` / `77796bab…` 双锚一致 | ✅ |
| 体积五要素 | 同源 | 599,125 / 629,081 / 614,400 / 675,840 / `pending-author-line` | ✅ |
| 注入抽验 | ≥ 2 且必红 | 2/2 必红，逐字节还原 | ✅ |
| 人工面 | 如实登记 | M1/M2/M5 = **⏳ 未执行**（`IAN-P-003 pending-human`） | ✅ |

**理由**：
1. **S0''-A 中间态双面独立复刻**（V1/V2）：node 面 S0PP-A 三用例（真管线回合 + 反证族 ×7 + 真源切片）与 Chromium 面 S0C-12（真面板双入口各跑通一轮 + 双回填互不覆盖 + 样本单源 + 人工面 ⏳）全绿；R2 **零新增文件**、样本单源 `s0-chain.mjs` 核实。
2. **R6 迁移行为级**（V3，含 review I-03）：自研行为级探针 **16/16** —— 在飞 pending 时 chips 被禁用而终端**不**被禁用（判别性），点终端仍展开获焦，真提交产生 `user` 行 + 真派 `chat` + 手输留痕 `driver=manual`，SW `queued` ⇒ 「已排队」可读行；空提交非静默且零空回合；双回填三分支互不覆盖；Enter/Escape 等价点击。
3. **提交通道**（V4）：`requestTurn(` **恰 2**（composer + `op.turn` 槽），`op-wiring 14/0`，`FIN-3/4/5` 通过；`manual` 与 AI 声明 id（含 `free-input`）**两值可判**。
4. **卡内输入安全**（V5）：独立 `requestId` 退化注入 ⇒ `FIN-0` + `FIN-8` **双红**（亲测）；`law8 60/0`（含 ⑩ 四面零明文）；a11y 行为级全绿。
5. **门禁全量**（V6）：`npm test 1431/0` ×2；Chromium 全量保段（s0 81 · law8 60 · journey 171 · binding 192 · recommendation 79 · dead-end 53 · density 242 · insight 118 · hardening 24 · l0/l1/l2 248/131/74 · auth-chip 37 · zero-injection 28 · page-input 125 · e2e PASS）；注入 B（`requestTurn(` 直连）⇒ FIN-3 / op-wiring 必红后还原。
6. **红线 / 体积终核**（V7）：三冻结面逐字节不变；base/manifest/`turn-queue`/SW 零 diff；`KIND_SET 40` / `12 kind` / 零宿主 / `ACT_TO_OP 6` ∧ 集 A 9 / 特权恒 `gesture`；体积五要素同源 **599,125 / 629,081 / 614,400 / 675,840 / `pending-author-line`**；**越叶预算（整叶 +7,179 B ≈ 7.01 KiB）如实登记、不停机、不伪称已确认**（`ian-1-r2` 登记 + cap `record-only`）。
7. **漂移**（V8）：`spec.md` / `plan.md` 零 diff，无孤立代码 / 需求缺失；review **I-03 由 V3 行为级闭环**，**I-01（plan §5 漏列 4 连带文件）/ I-02（`v4-density-baseline.json` 注记字段未刷新）登记为非阻塞 N 项**（见 §7）；review O-01（ADR floor 措辞）/ O-02（node 旧入口为接线判据）登记为非阻塞 N 项。

---

## 7. review 改进项处置（3 I / 2 O 归并）

| review 项 | 类别 | 处置 | 依据 |
|---|:--:|---|---|
| **I-01** | 文档一致性（plan §5 漏列 4 连带文件：`next-registry/ops.ts` / `stream-model.ts` / `chat-state.ts` / `stream-plaintext.ts`） | **登记为 N-01（非阻塞）**；build §6-A-2/§8 已如实登记为「文件清单外连带重锚」；不阻塞验证。 | 非功能偏差，零判据影响；review 建议「后续叶 plan 一并列出 / 交叉引用」 |
| **I-02** | 文档一致性（`docs/v4-density-baseline.json` 的 `effectiveCeilingRule` 等注记字段停留旧轮次 573,424 / 602,095，与同文件 `registeredBaselineBytes=599125` 并存易误读） | **登记为 N-02（非阻塞）**；`volume.registeredBaselineBytes=599125` / `ceilingBytes=629081` / `authorConfirmation=pending-author-line` 已与代码同源；本叶对该文件**零触碰**（`density 242/0` 保段）。 | 权威值以 `registeredBaselineBytes` + `test/size-baseline.ts` 为准；review 建议后续轮统一刷新 |
| **I-03** | 测试完备性（在飞终端可用 / 空提交非静默缺行为级驱动） | **✅ 已由 V3 闭环**：自研行为级探针 16/16（pending 判别性 / `queued` 可读行 / 空提交 notice / 双回填三分支 / Enter-Escape）。 | 本验证轮新增行为级证据 |
| **O-01** | ADR-IAN-001 §① floor 口径措辞过宽（`{'empty','safety'}` vs 落地仅 `empty`） | **登记为 N-03（非阻塞）**；落地保 fail-closed（`safety` 不走 floor），review 判定正当。 | 建议叶2 / 规范侧收窄措辞 + 登记 `safety` 语义 |
| **O-02** | S0''-A node 面「旧入口跑通一轮」为接线判据（非 DOM 真回合） | **登记为 N-04（非阻塞）**；真 DOM 双回合由 Chromium S0C-12 承载（V2 已亲跑）。 | build §6-B-3 已显式登记，`s0ppProblems` 文档说明 |
| **V-01** | （validate 新增）recommendation ④ 首跑 flake（floor 卡 vs 闭集断言） | **登记为 V-01 观察项（非阻塞）**；隔离复跑 ×3 全绿。 | 见 §5.1 |

> 归并结论：**3 I** = 1 闭环（I-03）+ 2 登记 N（I-01 / I-02）；**2 O** = 2 登记 N（O-01 / O-02）；validate 另新增 1 观察（V-01）。**无阻塞项**，不改变结论。

---

## 附录 A — 门禁亲跑对账（R1 验证轮）

| 门禁 | 类型 | 亲跑结果 | build/review 登记 | 判定 |
|------|:--:|:--:|:--:|:--:|
| `npm test` | node | **1431 / 0 / skipped 0**（×2） | 1431 / 0 | ✅ 一致 |
| `free-input-next` | node | 22 / 0（`FIN-0~9` + 元判据） | 22 / 0 | ✅ 一致 |
| `op-wiring` | node | **14 / 0**（`requestTurn(` == 2） | 14 / 0 | ✅ 一致 |
| `gate-integrity` | node | **23 / 0** | 23 / 0 | ✅ 一致 |
| `supersession` | node | **45 / 0** | 45 / 0 | ✅ 一致 |
| size 三件套 | node | **47 / 0（skipped 0）** | PASS | ✅ 登记 == 实测 |
| `test:s0-self-driven` | Chromium | **81 / 0** | 81 | ✅ 一致 |
| `test:law8` | Chromium | **60 / 0** | 60 | ✅ 一致 |
| `test:ui`（journey） | Chromium | **171** | 171 | ✅ 保段 |
| `test:binding` | Chromium | **192**（首跑即 PASS） | 192 | ✅ 保段 |
| `test:recommendation` | Chromium | 首跑 78/1 ⇒ **隔离复跑 ×3 = 79 / 0**（V-01） | 79 | ✅ 与登记一致 |
| `test:dead-end` | Chromium | **53 / 0** | 53 | ✅ 保段 |
| `test:density` | Chromium | **242 / 0** | 242 | ✅ 保段 |
| `test:insight` | Chromium | **118** | 118 | ✅ 保段 |
| `test:hardening` | Chromium | **24** | 24 | ✅ 保段 |
| `test:l0` / `test:l1` / `test:l2` | Chromium | **248 / 131 / 74** | 248 / 131 / 74 | ✅ 保段 |
| `test:auth-chip` | Chromium | **37 / 0** | 37 | ✅ 保段 |
| `test:zero-injection` | Chromium | **28 / 0** | PASS | ✅ 保段 |
| `test:page-input` | Chromium | **125 / 0** | 125 | ✅ 保段 |
| `test:e2e` | Chromium | **PASS**（R8 全链） | PASS | ✅ 保段 |
| IAN-1 行为级（自研） | Chromium | **16 / 0** | —（validate 新增） | ✅ |

## 附录 B — 注入抽验记录

| 注入 | 锚点 | 变更 | 预期红点 | 实测 | 还原 |
|---|---|---|---|---|---|
| **A** | `src/ui/sidepanel/cards/askuser.ts` | `FREE_INPUT_REQUEST_ID = 'free-input'` → `'ref-describe'` | `FIN-0`（独立 requestId）· `FIN-8`（固化不回显） | **20 pass / 2 fail**：`FIN-0` `卡内输入必须有独立 requestId` · `FIN-8` `对照：普通 answer 卡确实回显`（free-input 分支退化 ⇒ 回显哨兵） | `git checkout` 还原，`git status` 空 |
| **B** | `src/ui/sidepanel/sidepanel.ts` | `submitFreeInput` 内新增 `requestTurn(text);`（直连绕过 `op.turn` 槽） | `FIN-3`（计数恰 2）· `op-wiring`（唯一调用点集合） | `free-input-next` **20 pass / 2 fail**（`requestTurn(` 实测 `2927, 3889, 3916`）· `op-wiring` **8 pass / 6 fail** | 同上 |

> 两处注入均**先必红、后逐字节还原**；还原后 `npm test` 复跑 **1431/0**。

## 附录 C — 环境与约束

- 运行环境：`linux` · Node `v24.15.0` · Chromium `.pw-browsers/chromium-1234/chrome-linux64/chrome`（headless=new）。
- 门禁**严格串行**（一次一个 Chromium，`finally` 自清）；`dist/` / `dist-test/` 均被 `.gitignore` 忽略，亲跑未污染工作区（`git status` 空）。
- `.sddu` 外零产品代码改动；注入脚本临时改写 `src/**` 并逐字节还原（`trap`）。
- 人工面 **M1 / M2 / M5 = ⏳ 未执行**（headless 不可合成，不得冒充 PASS）；`IAN-P-003 = pending-human` 保持。
- routing.v1 = `local_or_compute` → `none`（本验证仅本地命令 / 脚本，未调用受管 Provider）。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0（R1） | 初始验证报告：V1~V8 全绿 / **0 阻塞**；亲跑 node `npm test` **1431/0 ×2** + 自研 Chromium 行为级 **16/0**（闭环 review I-03）+ Chromium 全量（s0 81 · law8 60 · journey 171 · binding 192 · recommendation 79 · dead-end 53 · density 242 · insight 118 · hardening 24 · l0/l1/l2 248/131/74 · auth-chip 37 · zero-injection 28 · page-input 125 · e2e PASS）+ node 对账（gate-integrity 23 · supersession 45 · op-wiring 14 · size 47 skipped 0）+ 注入抽验 ×2（requestId 共用 / `requestTurn(` 直连，均必红并还原）+ 三冻结面 sha 双锚 + 体积五要素同源 599,125 / 629,081 / 614,400 / 675,840 / `pending-author-line` · 越叶预算诚实登记；review 3 I + 2 O 归并（I-03 闭环 · I-01/I-02/O-01/O-02 登记 N）+ 新增观察 V-01。 | 2026-09-25 | SDDU Validate Agent |
