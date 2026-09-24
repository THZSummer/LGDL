# 技术计划：specs-tree-ian-1-free-input-next（IAN-1 流内自由输入 next 通道：新面 + 通道 + 迁移）

> **文档定位**: SDDU 技术方案（**叶级切片**）— 父 `../plan.md`（v1.0）在本叶的适用范围与落地口径；作为本叶 tasks 阶段的输入
> **前置依赖**: 父 `../spec.md` v1.0 + 父 `../plan.md` v1.0（含 `ADR-IAN-001` / `ADR-IAN-002` / `ADR-IAN-003` / `ADR-IAN-008` / `ADR-IAN-009` / `ADR-IAN-010`）+ 本叶 `spec.md` v1.0
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-24
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-24
> **更新说明**: 初始创建（IAN-1 叶技术方案：末端项形态 + 卡内输入语义分支 + `op.turn` 槽 + 手输 driver/让位 + R6 双入口 / 流内回填 + a11y + 新门禁 + S0''-A + 体积正增量登记）

---

## 1. 前置检查

| 检查项 | 状态 | 证据 |
|--------|:--:|------|
| 本叶 `spec.md` 存在 | ✅ | `spec.md`（268 行，v1.0） |
| 父 `spec.md` / `plan.md` 存在 | ✅ | `../spec.md`（863 行）/ `../plan.md`（v1.0，含 ADR-IAN-001~010 索引） |
| 上游叶依赖 | ✅ | `dependsOn: []`（首叶 / 底座叶） |
| 外部 API 文档缓存 | ✅ N/A | 零外部 API / 零新依赖 |
| 写入范围 | ✅ | 仅本叶 SDDU 目录（`plan.md` / `state.json` / `TREE.md`）；未跑门禁 / 构建 / Chromium |

---

## 2. 架构分析（本叶）

**本叶的验收锚**：把「想自由输入」搬进流内 next 闭环，且**在旧 composer 入口仍可用的前提下**（中间态保护）——「先立新面」这一步**不破坏现网行为**（N-IAN-027 / R-IAN-901）。

**落地结构（本叶切片）**：

```
src/ui/sidepanel/
├── next-registry/providers.ts   ← 注册 `free-input` provider + 驱动者声明（双向包含）
├── next-registry/dispatch.ts    ← `SET_A_PROTOCOL_ACTIONS` +`'free-input'`（ACT_TO_OP 不动）
├── next-registry/ai-drive.ts    ← `MANUAL_DRIVER_ID='manual'`（两值可判单源）
├── recommend.ts                 ← 末端项单点注入 + 零死端 floor（NEXTSTEP_PRIORITY 不动）
├── cards/nextstep.ts            ← 末端项渲染（非 `.next-chip` ⇒ 在飞不被禁用）
├── cards/askuser.ts             ← `free-input` 卡内输入语义分支（复用 `.ask-fallback` 家系）
├── sidepanel.ts                 ← `openFreeInputCard` + `handleCardAction` 分支 + 手输 trace/让位 + 流内回填支持
└── view-model.ts                ← 引导文案改指（叶1 侧）
```

**本叶不做的（父 §14.2 / 本叶 spec §2.2）**：`#composer` 退休 / 双写者 / 锁存 / 设置态护栏消解 / 法四修订 / 四处兜底**收敛终态** / `#send-reason`·`sendDisabled`·draft·引导**重锚终态** / `requestTurn(` 重锚落地 / 18 门禁重锚终态 / 2 保护段决策 / 取代台账终态。**本叶零删面 / 零改上游**。

---

## 3. 方案对比（本叶形态）

| 维度 | **方案 A：卡内终端 + 复用 `.ask-fallback` 家系 + `op.turn` 槽（推荐）** | 方案 B：新增流内输入行（独立于卡） | 方案 C：复用 `data-act='describe'` 开输入 |
|---|---|---|---|
| 描述 | 新 provider 产末端项；点击铸造 `askuser` 卡（`requestId='free-input'`）就地展开输入；提交经 `op.turn` 槽 | 在推荐卡下方新增一条常驻/按需输入行 | 点击即 `op.describe` 无值相 → `revealAskFallback()` → `ref-describe` 卡 |
| 优点 | 零新 op / kind / id 家系；唯一载体 + 唯一提交点；与「其他…（我来描述）」同构 | 概念直观 | 复用现成 `describe` 路径 |
| 缺点 | 需 1 个集 A 动作 + `recommendNextStep` 注入（2 门禁等价重锚） | 撞 N-IAN-021（第二输入面）+ 不常驻难保证 | **语义错位**：提交走 `submitDescribe`（本地结算、不成回合）⇒ 变成「描述」 |
| 风险 | R-IAN-911/912/913（形态陷阱，ADR-IAN-001 已排除） | R-IAN-907 / NFR-IAN-014 | R-IAN-904 / R-IAN-914（必红） |
| 工作量 | 3 波 / ~26 任务 | 3 波（越界） | **不达标** |

**推荐：方案 A**（理由见父 `ADR-IAN-001` §决策 / `ADR-IAN-002` §决策）。

---

## 4. 本叶设计定案（父 ADR 的叶内落地）

| # | 落地项 | 定案 | 判据锚 |
|:-:|---|---|---|
| 1 | 末端项形态 | provider `free-input`（`when` 恒真）+ `recommendNextStep` 单点注入恒最末 + 无候选 floor 铸卡 | `ADR-IAN-001`；FIN-1/FIN-2 |
| 2 | 卡内输入 | `askuser` kind + `requestId='free-input'`；`askKind:'text'` 出生即展开 + focus；**不与 `ensureTextAskCard` 合流** | `ADR-IAN-002` §①；FIN-3 |
| 3 | 提交通道 | `handleCardAction('answer')` 按 `requestId` 分支 → `dispatchChipAction('op.turn', text)` → `bindPanelOps.turn`；**不新增 `requestTurn(` 直连** | `ADR-IAN-002` §②；FIN-3（叶1 恰 2） |
| 4 | 手输 driver | `MANUAL_DRIVER_ID='manual'` 写入手输留痕；`∉ listDriverDecls()`；AI 不写该值 | `ADR-IAN-002` §③；FIN-4 |
| 5 | 让位语义 | `proactivity.noteUserTurn()` 在手输路径、**`requestTurn` 体外** | FIN-5 |
| 6 | R6 双入口 | 新流内入口 ∧ **composer submit 逐字保留可用**；双回填载体可判 | `ADR-IAN-003`；S0''-A |
| 7 | 流内回填 | `busy-rejected` 可回填卡内输入（仅当为空；卡收起 ⇒ 重展开）；叶1 `#input` 回填**保留** | `ADR-IAN-003`；FIN-7 |
| 8 | a11y | 展开即 focus 卡内 input（`setCardFallbackOpen` 先例）；Tab 序可达 + 键盘可提交/取消 | `ADR-IAN-002`；FIN-6 |
| 9 | 零死端 | 无其他候选时仍可达（floor 铸卡） | `ADR-IAN-001`；FIN-2 |
| 10 | 新门禁 | `test/free-input-next.test.ts`（FIN-1~8 + 反证 + 三段控制）入 `gate-integrity` 下界 | `ADR-IAN-008` §② |
| 11 | S0''-A | 双入口各跑通一轮 + 反证；node 面 + Chromium 面（`s0-self-driven.mjs` 只加断言） | `ADR-IAN-009` §② |
| 12 | 体积 | 叶1 **正增量如实登记**（A 列 +2.5~4.5 KB；逐模块归因） | `ADR-IAN-010` §② |

---

## 5. 文件影响分析（本叶）

| 操作 | 文件路径 | 说明 |
|:--:|---|---|
| MODIFY | `src/ui/sidepanel/next-registry/providers.ts` | `free-input` provider 行 + `DRIVER_DECLS_SRC` 一条 |
| MODIFY | `src/ui/sidepanel/next-registry/dispatch.ts` | `SET_A_PROTOCOL_ACTIONS` +`'free-input'`（`ACT_TO_OP` 不动） |
| MODIFY | `src/ui/sidepanel/next-registry/ai-drive.ts` | `MANUAL_DRIVER_ID` 单源常量 |
| MODIFY | `src/ui/sidepanel/recommend.ts` | 末端项注入 + 零死端 floor + payload 布尔字段 |
| MODIFY | `src/ui/sidepanel/cards/nextstep.ts` | 末端项渲染（非 `.next-chip`） |
| MODIFY | `src/ui/sidepanel/cards/askuser.ts` | `free-input` 卡内输入语义分支（幂等查询） |
| MODIFY | `src/ui/sidepanel/sidepanel.ts` | `openFreeInputCard` + `handleCardAction` 分支 + 手输 trace/让位 + 流内回填支持 |
| MODIFY | `src/ui/sidepanel/view-model.ts` | 引导文案改指（叶1 侧） |
| NEW | `test/free-input-next.test.ts` | FIN-1~8 判据 + 反证 + 三段控制 |
| MODIFY | `test/next-dispatch-diff0.test.ts` | D0-5 / D0-7 等价重锚 |
| MODIFY | `test/ui/recommendation.mjs` | 末端项断言（只增） |
| MODIFY | `test/ui/s0-self-driven.mjs` + `test/ui/fixtures/s0-chain.mjs` | S0''-A 断言（只加断言）+ 样本扩展 |
| MODIFY | `test/gate-integrity.test.ts` | `EXPECTED_AUDITED_FILES` 只增 `free-input-next` |
| MODIFY | `test/size-baseline.ts` | 叶1 五要素 + V3-VOL-3 三值 + 逐模块行 |
| MODIFY | 本叶 `state.json` / `TREE.md` | 阶段推进 |

---

## 6. 风险评估（本叶）

| # | 风险 | 等级 | 缓解 |
|---|---|:--:|---|
| R-IAN-002 | R6 排队/回填回归（叶1 侧） | 高 | 双入口 + 流内回填并存；回填仅当为空；TA-4 不删 |
| R-IAN-004 | `op.turn` auto 档 vs 手输混淆 | 高 | driver 两值 + 注入必红 + 让位语义槽外 |
| R-IAN-008 | `KIND_SET` / 12 kind / 零宿主被撞 | 高 | 复用 `askuser` kind + `.ask-fallback` 先例 |
| R-IAN-009 | a11y focus 断裂 | 中 | focus 落卡内先例 + 无悬空焦点断言 |
| R-IAN-005 | 体积（叶1 正增量） | 中高 | 先出 +2.5~4.5 KB 预算；叶1 收口重登记 |
| R-IAN-901 | 为赶进度提前删旧面 ⇒ 中间态窗口 | 高 | **本叶不删面**；S0''-A 双入口必绿 |
| R-IAN-904 | 卡内复用改掉「描述」语义 | 高 | 独立 `requestId='free-input'` + 反证 |
| R-IAN-906 | 手输 driver 与 AI 同值 | 中高 | 逐行两值断言 + 同值必红 |
| R-IAN-907 | 第二输入面以新形态回归 | 中高 | N-IAN-021「唯一载体」判据 |
| R-IAN-909 | S0'' 脚本绿而非链路可判 | 中高 | 真源切片 + 双向反证 |
| R-IAN-911 | 末端项被算进 `MAX_CHIPS_PER_CARD` ⇒ 既有规则卡被截断 | 中高 | 末端项独立 `data-act`（非 `.next-chip`）；`MAX_CHIPS_PER_CARD=3` 不动 |
| R-IAN-912 | `free-input` 做成独立 rule 候选 ⇒ 永不渲染 | 中高 | 不改 `NEXTSTEP_PRIORITY`；`recommendNextStep` 注入 |
| R-IAN-914 | `free-input` 与 `ref-describe` 共用 `requestId` ⇒ 变「描述」 | 高 | 独立 `requestId`；反证「共用 ⇒ 必红」 |
| R-IAN-915 | 手输提交新增 `requestTurn(` 直连 | 高 | 经 `op.turn` 槽；FIN-3 计数不增判据 |
| R-IAN-916 | `handleCardAction` 集 A 分支引集 B 字面量 ⇒ D0-1 红 | 中 | 分支只比对 `'free-input'`；D0-1 继续承重 |

---

## 7. 交付物与执行序（供 tasks 参考，**非需求**）

**交付物（8 项）**：① provider + 末端项渲染；② 卡内输入语义分支 + `op.turn` 槽接线；③ 手输 driver + 让位语义；④ 流内回填支持；⑤ a11y focus；⑥ 新 node 门禁 `free-input-next`；⑦ S0''-A 中间态样板（node + Chromium 增量）；⑧ 叶1 体积重登记 + 门禁对账骨架。

**执行序（3 波）**：
1. **W1 形态与末端项**：provider 注册 + 驱动者声明 + `SET_A_PROTOCOL_ACTIONS` + 注入/floor + 终端渲染 + D0-5/D0-7 等价重锚 + `recommendation.mjs` 增量。
2. **W2 通道与手输**：卡内语义分支 + `handleCardAction` 分支 + `op.turn` 槽 + `MANUAL_DRIVER_ID` + 让位语义 + 注入反证（FIN-3/4/5/6）+ a11y focus。
3. **W3 R6 / 回填 / 验收**：双入口并存 + 流内回填 + 不覆盖 + 卡收起重展开（FIN-7）+ 新门禁 FIN-1~8 + S0''-A 双面 + 体积叶1 重登记 + 骨架台账。

**Gate 硬要求**：`npm test` / `test:ui` 串行；新增 `test/free-input-next.test.ts` 入 `gate-integrity` 下界（只增）；**不新增 Chromium 门禁文件**；反证必实跑 + 逐字节还原。

---

## 8. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（IAN-1 叶 plan：§1 前置检查 · §2 本叶架构（先立新面 / 零删面）· §3 三方案对比（推荐 A：卡内终端 + 复用家系 + `op.turn` 槽）· §4 12 项设计定案（映射父 ADR-IAN-001/002/003/008/009/010）· §5 文件影响 15 项 · §6 风险 15 条 · §7 交付物 8 项 + 3 波执行序） | 2026-09-24 | SDDU Plan Agent |
