# 技术计划：specs-tree-v55-3-ai-driven-orchestration（V5.5-3 主题② AI 驱动编排 + 治理收口）

> **文档定位**: SDDU 技术方案（**末叶 / 收口叶**）—— 本叶承载的父 FR/NFR/EC/AC 的**实施切片**；权威跨切契约见父 `../plan.md` + `../ADR-V55-008/009/010/011/012`
> **前置依赖**: 本叶 `spec.md` v1.0 + 父 `../spec.md` / `../plan.md` + **前置叶 `v55-1`**（驱动者层底座 / `'answered'` 时机 / 候选恒由注册表产出）+ **`v55-2`**（配置判据 = 唯一分流依据；主题① 确定性对照面）
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-22
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-22
> **更新说明**: 初始创建（V5.5-3 叶 plan：AI 经既有 `op.turn` 槽启动回合（`requestTurn` 仍恰 2）+ op 三档清分（派生式 5/2/2）+ 护栏三件套（六常量单源）+ 并发仲裁（有界队列 1 + 留痕 + 草稿回填）+ 留痕三要素 + 否决/关断 + 零新增载体 + **三叶共享面收口**）

---

## 1. 前置检查

| 检查项 | 状态 | 证据 |
|--------|:--:|------|
| 本叶 `spec.md` 存在 | ✅ | `spec.md`（284 行，v1.0） |
| 前置叶 v55-1 / v55-2 产物 | ⏳（按叶序） | 本叶**只消费**：候选恒由注册表产出 / 时机源 / 配置判据（唯一分流依据）/ 确定性对照面 |
| 上游 v5 底座（只读复用） | ✅ | `op-wiring.test.ts#requestTurnProblems`（**不改**）· `ops.ts#IMPL`（9 op 的 risk/consent/layer）· `bindPanelOps.turn`（`op.turn` 槽）· `recommend.ts`（防抖三常量 / `NEXTSTEP_PRIORITY`）· `host-registry.ts`（零宿主）· `messaging.ts`（`KIND_SET` 40）· `docs/{v3,v4}-supersession-ledger.json` · `test/size-baseline.ts` · `test/gate-integrity.test.ts` |
| 外部 API 文档缓存 | ✅ N/A | 零外部 API / 零新依赖 / 零新权限 |
| 保护 pin（本轮复算） | ✅ | journey `cc79f413…` 双绿；binding `be9ad0e9…` 双绿 |
| 体积基线 | ✅ | 以 v55-1/v55-2 收口后的实测基线为准（投影 561,509 B） |

## 2. 本叶范围与架构影响

**做**：① 派生式三档清分（`shared/op-table.ts` 的 `tierOf` + 物化表 + 与 `IMPL` 一致性机核；**零新增 op**）；② 按下策略 `pressCandidate`（`auto` 档**唯一**自动按下点；`confirm`/`gesture` 恒不自动；AI 不自造候选）；③ AI / 系统经**既有** `op.turn` 槽启动回合（`requestTurn(` **仍恰 2**）；④ 护栏三件套（六常量单源 + 越限抑制 + 留痕 + 未落地登记二态）；⑤ 并发仲裁（**有界队列 1 + 明确告知 + 草稿回填**；AI 撞车不发起）；⑥ 留痕三要素（既有 `system` 行，单源 `driverTraceLine`，零明文）；⑦ 否决 / 关断（既有 consent `reject` + 既有设置管理面开关；默认 **ON** 显式登记）；⑧ **三叶共享面收口**（体积五要素 + 跨档位登记 · journey/binding 保护段 · 取代台账 · `knownGap` · 人工面汇总）。

**不做**：主题① 引导内容（v55-2）/ 驱动者层底座（v55-1）/ 新增 `requestTurn` 调用点 / 新增求值入口 / 新增 op（**否决**：会破 5/2/2，ADR-V55-008 §4）/ 新增 kind·宿主·`KIND_SET` 项·静态权限 / 触碰判定链 / 删除 v5 已建门禁。

**关键设计定案（引用）**：ADR-V55-008（派生式清分）· ADR-V55-009（护栏六常量 + 按下策略 + 关断否决 + 载体零新增）· ADR-V55-010（并发仲裁 + SW/panel 分工）· ADR-V55-012（台账 / 保护段 / 每叶门禁清单）。

## 3. 文件影响分析（本叶）

| 操作 | 文件路径 | 说明 |
|:--:|---|---|
| NEW | `src/ui/sidepanel/next-registry/guard.ts` | 护栏六常量 + 链深度/去重/静默/冷却 + 关断偏好（单源） |
| NEW | `src/ui/sidepanel/next-registry/ai-drive.ts` | `pressCandidate` 单源 + 留痕三要素 + `driverClass` 权限矩阵 |
| MODIFY | `src/shared/op-table.ts` | `+ hasConsent` / `tierOf()` / 物化 `OP_TIER_TABLE`（**派生式**） |
| MODIFY | `src/ui/sidepanel/sidepanel.ts` | 自动按下接线（`'answered'` 时刻）+ 仲裁续传（留痕 + 草稿回填）+ 否决/关断 |
| MODIFY | `src/ui/settings/panel.ts` | 主动性开关（既有分区内，**零新增分区 / 零新增必需 id**） |
| MODIFY | `src/background/service-worker.ts` | **有界仲裁队列**（`TURN_QUEUE_MAX = 1` + 入队/drain/溢出明确拒绝）（SW bundle，零 sidepanel 字节） |
| MODIFY | `src/background/chat-events.ts` | 仲裁结果闭集 4 项（type-only 语义） |
| NEW | `test/op-three-tier.test.ts` / `test/proactivity-guard.test.ts` / `test/turn-arbitration.test.ts` | 3 个新 node 门禁 |
| MODIFY | `test/{op-wiring,capability-wiring,sw-op-mirror,op-protocol,supersession-ledger,gate-integrity,size-*}.test.ts` / `test/ui/{journey,binding,l0,density,stream,ask-auth-inflow}.mjs` | 等价重锚 + 计数只增（journey / binding **保段优先**） |
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` | X-SELF-7 条目 + 逐项对账 + （若跨档位）`v3Vol3Closeout` 三值同源重登记 |
| MODIFY | `packages/web-cli-plugin/docs/v4-density-baseline.json` | 仅当体积越档位 ⇒ `volume` 段显式升档登记（31 格与阈值**逐字不动**） |
| MODIFY | `packages/web-cli-plugin/package.json` | `test:v3` 串行链追加新门禁（**无新依赖**） |
| **NOOP** | `src/content/**` / `KIND_SET` / `manifest.json` / `docs/v3-supersession-ledger.json` / `ROADMAP.md` / `design/**` | 零 diff（显式） |

## 4. 实施序（5 波；供 `@sddu-tasks` 参考，非需求）

| 波 | 内容 | 完成判据 |
|:--:|---|---|
| **W1** 清分 | `tierOf` + 物化表 + 与 `IMPL` 一致性 | **先证** 5/2/2 与 `layer`/`consent` 一致；新 op 未归档 ⇒ FAIL；改 `consent`/`layer` ⇒ 清分同步变（不可能脱钩） |
| **W2** 按下 | `pressCandidate` + `driverClass` 矩阵 + `op.turn` 槽复用 | **先证** `requestTurn(` 仍恰 2；`auto` 档唯一按下点；`confirm`/`gesture` 不可自动（逐档反证） |
| **W3** 仲裁 | SW 有界队列 + 溢出行 + 面板留痕/草稿回填 | 用户输入零丢失（三条路径）；队列恒 ≤1；仲裁闭集 4 项；AI 撞车不发起 |
| **W4** 护栏 + 留痕 + 关断 | 六常量 + 越限抑制 + `driverTraceLine` + 开关/否决 | 六项单源（散落零命中）；越限抑制 + 反证；关断后零 AI 主动且**主题① 仍工作**；载体零新增（12 kind / 零宿主 / `KIND_SET` 40） |
| **W5** 共享面收口 | 保护段 → 台账 → `knownGap` → 体积五要素（+跨档位登记）→ 全 Feature 计数对账 → 人工面汇总 | journey/binding **保段双绿**（或八步留痕）；台账条目逐项；`supersession` ≥36；全门禁串行全绿；人工面逐项 `⏳`/`PASS`（**v5 人工面 9 项零改写**） |

## 5. 本叶验收门禁清单

`typecheck` · `build` · `npm test`（≥1181 增）· `op-wiring`（**`requestTurn(` 仍恰 2**）· `local-act-wiring` · `authorize-chip-wiring` · `capability-wiring`（`.request(` 语义等价保留）· `sw-op-mirror`（≥5）· `op-protocol`（≥6，`KIND_SET` 40 逐字）· `test:auth-chip`（≥37）· `test:l0`（≥248）/ `test:density`（≥242，阈值逐字）· `test:journey`（≥171，**保段优先**）· `test:binding`（≥192，**保段**）· `test:stream`（≥73）· `test:ask-auth`（≥71）· `test:dead-end`（≥39）· `test:insight`（118）/ `hardening`（24）/ `l1`（116）/ `l2`（74）/ `l1-reverse`（9）/ `l2-reverse`（10）/ `ref-pick-wiring`（11）/ `page-input`（108）/ `zero-injection`（28）/ `design-contract`（19）· `e2e` PASS · **新 3 门禁**（三档清分 / 护栏 / 仲裁）· `test:gate-integrity`（≥15 增，`CHROMIUM_GATES === 9` 逐字）· `size-*` + `test:size-ruling-vol3`（12）· `test:supersession`（≥36）

**共享面义务（**三叶恰一次**收口）**：① 体积五要素（含**跨档位显式升档**或如实登记「本 Feature 未跨档位」）；② journey `43054..58287` + binding `107780..115930` 保护段（**保段**或八步取代留痕）；③ 取代台账（X-SELF-7 + 逐项对账 + `knownGap` 一致性）；④ 人工面汇总（三叶面逐项 `⏳`/`PASS`，**v5 人工面 9 项零改写**）。

## 6. 体积预算（本叶）

| 构成 | 预算 | 上界 |
|---|--:|--:|
| `guard.ts` NEW 1,700 · `ai-drive.ts` NEW 1,400 · `shared/op-table.ts` 300 · `sidepanel.ts` 2,000 · `settings/panel.ts` 350 · `dispatch/recommend` 150 | **5,900** | **7,600** |

累计投影：561,509 → **567,409** ⇒ **越已登记档位 563,200（+4,209 B）** ⇒ 收口轮按 ADR-V55-011 §4 走**显式升档**
（档位 → `ceilTo50KB(567,409)` = **614,400**；绝对上限 → **675,840**；`newBaselineBytes` 同源前移；`authorConfirmation` 保持 **`pending-author-line`**，**不得伪称已确认**）。
若实测**未**越档位 ⇒ **如实登记「未跨档位」**（二态显式，不制造升档条目）。

## 7. 风险评估（本叶）

| # | 风险 | 等级 | 缓解 |
|---|---|:--:|---|
| **R-SELF-001** | **安全边界被「主动性」侵蚀（最高危）** | 高 | 派生式清分（改 `layer`/`consent` ⇒ 清分同步）+ 特权恒 `gesture` + 逐档注入反证（ADR-V55-008） |
| **R-V55-104** | 自动按下越档（`confirm`/`gesture` 被按下 / AI 代答 consent） | 高 | 唯一按下点 + `tierOf === 'auto'` 硬判 + 反证：把 `confirm` 档交给 `pressCandidate` ⇒ FAIL |
| R-SELF-002 | 门禁取代面（`requestTurn` 恰 2 / `chatBusy` / 清分相关） | 高 | **读法①**（diff = 0）；X-SELF-1 如实登记「未发生取代」 |
| R-SELF-004 / R-SELF-907 | token/自触发环无判据 / 护栏「只写不判」 | 中高 | 六常量单源 + 越限抑制断言 + 链深度截断 + 反证；未落地须显式登记 |
| **R-V55-106/107** | 仲裁队列无界 / 草稿回填失效 | 中高 | 队列硬上限 1 + 溢出明确拒绝 + **回填断言**（非空输入**不覆盖**） |
| R-SELF-906 | 清分与 `IMPL` 脱钩 | 中高 | **派生式**（结构性不可能脱钩）+ `hasConsent` 一致性断言 |
| **R-V55-110** | 跨档位时静默改 `authorConfirmation` | 中高 | 枚举合法性机核 + 文书禁「档位已确认」表述；本叶收口轮**显式**升档 |
| R-SELF-011 | 门禁规模只增（本叶新增 3 门禁 + 逐项对账） | 中 | `V55_NEW_GATE_FILES` 只增 + 串行纪律 |
| R-SELF-910 | 体积评估被跳过 | 中高 | 五要素重登记 + 逐模块 metafile 归因（ΣΔ + glue == 登记增量） |
| R-SELF-010 | `KL-N-10` 环境 flake 被误读为回归 | 低 | 隔离复跑 ≥2 + 如实登记（不伪造串行绿） |

## 8. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V5.5-3 叶 plan：派生式三档清分 / `pressCandidate` 单源 / `op.turn` 槽复用（`requestTurn` 仍恰 2）/ 护栏六常量 / 并发仲裁有界队列 1 + 草稿回填 / 留痕三要素 / 关断否决 / 三叶共享面收口；5 波；预算 5,900 B（上界 7,600）；累计 567,409 **预计越档位 +4,209** ⇒ 显式升档预案，`pending-author-line` 不伪称确认） | 2026-09-22 | SDDU Plan Agent |
