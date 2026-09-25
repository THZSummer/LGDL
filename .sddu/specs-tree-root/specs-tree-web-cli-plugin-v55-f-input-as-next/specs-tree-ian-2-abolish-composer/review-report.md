# 审查报告：specs-tree-ian-2-abolish-composer

> **文档定位**: SDDU 审查报告 — 逐项记录自主审查的执行结果，作为 validate 阶段的输入
> **审查策略**: `review.md`（C1~C31 审查清单及四维度指引）
> **前置依赖**: `review.md`（策略）· `spec.md`（v1.0）· `plan.md`（v1.0）· `tasks.md`（v1.0 · 25 任务）· `build.md`（v2.0 · R1+R2 · 25/25）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-25
> **审查轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-25
> **更新说明**: 初始创建（叶2 首轮审查：亲跑 node + Chromium 全量门禁；三冻结面 sha；protective segment 逐字节复算；法四三处逐字核；台账全字段检索 → 2 BLOCK / 4 I / 0 O）

---

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查项总数 | 31 |
| 通过 | 27 |
| 警告 | 1 |
| 失败 | 3（归并为 **2 个阻塞根因**：C10/C11 同源 → BLOCK-01；C13 → BLOCK-02） |
| 阻塞问题 | **2** |

| 亲跑门禁（本机实测 · 串行） | 实测 | 声明 | 判定 |
|------|:--:|:--:|:--:|
| `npm test`（node） | **1441 / 0 / skip 0** | 1441 / 0 | ✅ |
| `test:supersession` | **48 / 0** | 48 / 0 | ✅ |
| `test:gate-integrity` | **24 / 0** | 24 / 0 | ✅ |
| `test:s0-self-driven`（Chromium） | **82 / 0** | 82 / 0 | ✅ |
| `test:ui`（journey） | **171** | 171 | ✅ |
| `test:insight` | **125** | 125 | ✅ |
| `test:l0` | **251** | 251 | ✅ |
| `test:l1` | **132** | 132 | ✅ |
| `test:binding` | **192** | 192 | ✅ |
| `test:law8` | **60 / 0** | 60 / 0 | ✅ |
| `test:recommendation` | **79 / 0** | 79 / 0 | ✅ |
| `test:dead-end` | **53 / 0** | 53 / 0 | ✅ |
| `test:size-ruling-vol3` | **13 / 0** | PASS | ✅ |
| `insight-no-escalation`（node） | **21 / 0** | PASS | ✅ |
| `law4-input-as-next`（node） | **5 / 0** | L4-1~6 | ✅ |

---

## 2. 逐项审查结果（C1~C31）

| # | 审查对象 | 审查基准 | 评估 | 发现 | 严重程度 |
|---|---------|---------|:--:|------|:--:|
| C1 | DOM/CSS 真退役（三 id 元素不存在 ≠ `hidden`） | FR-IAN-040/041/049 | ✅ | `index.html` 中 `composer` 5 命中**全为注释**、零 `id="composer"`；`law4-input-as-next` L4-1 + `density-thresholds` ③ 双核「元素不存在 + 6 条 `#id{}` 死规则零残留」；注入 `<form id=composer hidden>` ⇒ L4-1 必红（实跑） | 低 |
| C2 | 双写者 / 锁存 / 设置态护栏消解 | FR-IAN-042/043/044 | ✅ | `syncComposerVisibility` / `fallbackOpen` 在 `src/**` **仅剩注释**（`sidepanel.ts:877/3023`）；`l0/shell.ts#revealFallback/hideFallback` 只 `setAskFallbackOpen` | 低 |
| C3 | 测试钩子重锚（只操作卡内） | FR-IAN-045 | ✅ | `sidepanel.ts:872-879` `revealFallback→revealAskFallback()` / `hideFallback→l0?.hideFallback()`（只 `setAskFallbackOpen(false)`），无死写点 | 低 |
| C4 | 登记退役（`NEVER_FOLDABLE` 14→13 ∧ 容器册 13→16 ∧ PRESERVED 移三项） | FR-IAN-046/047 | ✅ | 生产常量直读：`NEVER_FOLDABLE` = **13**（不含 `composer`；`disclosure.ts:154-168`）· `RETIRED_CONTAINER_IDS` = **16**（`composer`/`input`/`send` 全入；`].sort()`）· PRESERVED 注释已移三 id（`host-registry.ts:144-149`） | 低 |
| C5 | 陈旧注释同步（`FR-IAN-048` 四处） | FR-IAN-048 | ⚠️ | `sidepanel.ts:1107` / `l0/shell.ts:88-99` / `stream-render.ts:66-72` / `index.html:1414-1418` 已同步；**但 `test/settings.test.ts:191` 断言文案仍为 `'composer draft restored'`**（陈旧）。见 I-02 | 低 |
| C6 | 兜底收敛终态 + `op.describe` 有值相不变 | FR-IAN-050/051/052 | ✅ | 调用链 `revealAskFallback → ensureTextAskCard + l0?.revealFallback() → setAskFallbackOpen(doc,true)`（**卡内唯一**）；四处入口（`sidepanel.ts:225/1544/2346/3904`）全收敛，零流外面；`S0C-12` 真面板绿 | 低 |
| C7 | `#send-reason` 保留 + `sendDisabled` 仅异常态 | FR-IAN-053/054 | ✅ | `index.html:1321` `#send-reason` 保留于 `#region-statusbar`；`view-model.ts#sendDisabledReason` 显式「`pending` 不再硬禁用」（仅 `!hasOrigin` 异常态） | 低 |
| C8 | draft 重锚 + 引导改指 | FR-IAN-055/056 | ✅ | `sidepanel.ts:1360-1371` `getDraft/setDraft` 读写卡内 `#ask-input`（卡不存在 ⇒ `''`/空写零副作用）；`ONBOARDING_TEXTS[4]` = 「点「下一步推荐」卡末的「自由输入…」项…」 | 低 |
| C9 | 法四三处一致（逐字核心句） | FR-IAN-061 / AC-IAN-008 | ✅ | **亲核三行原文**：`:116` 法则表 / `:225` FR-CHAT-014 / `:385` AC-CHAT-007 核心句逐字一致 =「**输入即 next**：自由文本输入是流内 next 的一个选项；**流外零输入面**」（括号体例随行角色微调，语义等价） | 低 |
| C10 | 法四 old→new 逐字台账 ∧ 「半修即红」判据 | FR-IAN-060/062 · ADR-IAN-006 §①②③ · AC-IAN-008 | ❌ | **台账缺口**：`v4-supersession-ledger.json` 全文检索 `v4-chat/spec.md` = **0 命中**、`:116/:225/:385` = **0 命中**、new 条文逐字 = **1 命中（仅嵌入 `redlineRemap[7].reason`）** ⇒ **不存在** `{old 逐字 / new 逐字 / 理由 / 日期 / 落点 file:line}` 条目（ADR-IAN-006 §①步3 指定的 `xIanLedger` 段无该条）。**「半修即红」无载体**：`test/**` 无任何文件读 `v4-chat/spec.md`（`grep` 全仓 0 命中）⇒ 三处只改一处**不会**变红（ADR-IAN-006 §后果 的反证族缺项）。见 **BLOCK-01** | **阻塞** |
| C11 | 法四机核门禁 L4-1~6 | FR-IAN-064 | ✅ | `test/law4-input-as-next.test.ts`（5 用例）：L4-1 零命中 / L4-2 入册 16 / L4-3 零可见输入 / L4-4 卡内可用 / L4-5 三段控制（`n/a` 不冒充 `ok`）/ L4-6 真源切片；3 条反向注入全绿必红 | 低 |
| C12 | `redlineRemap` 追加 + 老条目逐字保留 | FR-IAN-062 | ✅ | `redlineRemap` = **8** 条（7→8）；第 8 条 = T220 三文件法四重锚，`status: landed`，reason 明写「**不在** `zeroDiffFiles`」；老 7 条逐字保留 | 低 |
| C13 | X-IAN-1~11 台账编号与逐条登记 | FR-IAN-080~091/102 · AC-IAN-010/020 | ❌ | **编号语义冲突 + 条目不齐**：父 `../spec.md §12` + `ADR-IAN-006` 定义 `X-IAN-1` = 法四…`X-IAN-6` = `requestTurn(` 恰 1；但台账 `xIianLedger`（叶1）的 `X-IAN-1~7` 登记的是**完全不同语义**（回合通道 / 特权 op / 载体 / 推荐面 / 零死端 / SW 队列 / 草稿回填），`X-IAN-1`「法四」在台账中被**错误占用**；叶2 `TASK-IAN-215` 验收「`xIanLedger` 段：X-IAN-1~11 逐条」**仅完成 X-IAN-8~11**（4/11），且行字段仅 `{id, decision, owner, counterCheck, evidence}`，缺 `old 逐字/new 逐字/日期/落点`。见 **BLOCK-02** | **阻塞** |
| C14 | X-IAN-8~11 终态登记 | FR-IAN-087~090/102 | ✅ | `xIianLedgerLeaf2`（X-IAN-8 draft / 9 NEVER_FOLDABLE / 10 引导 / 11 binding）逐条 `superseded` + `counterCheck` 可定位（`xIianLeaf2Problems` 反证：抽条/非法 decision/悬空 counterCheck ⇒ 必红，亲跑绿） | 低 |
| C15 | `requestTurn(` 恰 1 + `op-wiring` 重锚 | FR-IAN-021/085 | ✅ | `src/**` 实调用点 **1 处**（`sidepanel.ts:3899`）+ 1 定义（`:334`）；`test/op-wiring.test.ts` `OP_CALLSITE_SET.op.turn.callSites: 1`；反证「本地 op 误接 `requestTurn` ⇒ 必红」亲跑绿 | 低 |
| C16 | R6 唯一化 + TA-4 重锚 | FR-IAN-031/032/086 | ✅ | `restoreFreeInputDraft` 为唯一回填实现（`sidepanel.ts:2962`）；`turn-arbitration` TA-4/TA-8 判据「仅在卡内为空时 / 卡收起重展开 / 卡不存在按需铸造」+ 删回填必红（亲跑绿） | 低 |
| C17 | `ACT_TO_OP` 6 / 集 A 9 / 零新增载体 | FR-IAN-017 · NFR-IAN-007 | ✅ | 生产常量直读：`ACT_TO_OP` = **6**（`dispatch.ts:11`）· `SET_A_PROTOCOL_ACTIONS` = **9**（+`free-input`）；`insight-no-escalation` 亲跑：`KIND_SET` 40 / `CARD_TAG_LABELS` 12 / `REGISTERED_STRUCTURAL_HOSTS === []` | 低 |
| C18 | S0''-B 终态（node + Chromium） | FR-IAN-070/072/073/074 | ✅ | `test:s0-self-driven` **82/0**（含 `S0C-12 S0''-B 终态：三 id DOM 零命中` + 共享判据七条全绿 + 样本单源核）；node 面 `s0-self-driven-chain.test.ts` 在 `npm test` 内绿 | 低 |
| C19 | 反证非恒真（注入必红） | EC-IAN-017 · R-IAN-902 | ✅ | `law4` 反证①（注入 `<form id=composer hidden>` ⇒ L4-1 必红）/ 反证②（移出 `#input` 入册 ⇒ 必红）/ 反证③（注入可见 `<input>` ⇒ L4-3 必红）；`S0C-12 B 反证`（三 id 回流 / hidden 冒充 / 回填覆盖非空 ⇒ 共享判据 FAIL） | 低 |
| C20 | 人工面 M3/M4 如实登记 | AC-IAN-027 | ✅ | `xIianGateReconciliationLeaf2.manualFaces` = 「M3/M4：⏳ 未执行（headless 不可合成，**不冒充 PASS**；M1/M2/M5 同）」；`S0C-12` 运行期亦打印 M1/M2/M5 ⏳ | 低 |
| C21 | 18 门禁三态对账 + `assertionsRemoved=0` | FR-IAN-100~106 | ✅ | `xIianGateReconciliationLeaf2` = **20 行**（kept 3 / equivalent-reanchor 13 / explicit-supersession 4）**逐行 `assertionsRemoved=0`**；间接面四条（notify-tools/settings-help/system-merge/parity）逐项复核 kept；`xIianLeaf2GateProblems` 亲跑绿 | 低 |
| C22 | T220 三文件法四等价重锚 | FR-IAN-085/103/104 | ✅ | 三文件（`insight.mjs`/`l0.mjs`/`l1.mjs`）**不在** `zeroDiffFiles`（9 项**逐字不动**，`RL-10` 零降级）；登记载体齐：`redlineRemap` 第 8 条 + 新叶段 `R2-W6`（33 文件 scope / **87 行逐字** 60+26+1 / 3 文件）+ `modifiedRanges[IAN2R2-MR-0~18]`（**19 段**，亲数）；断言只升：118→**125** / 248→**251** / 120→**132**；`composerGapToBottom` **显式消解登记**（`composerDissolved:true` + reason，非静默 null，insight 运行期读数亲核） | 低 |
| C23 | `gate-integrity` 下界只增 | FR-IAN-105 | ✅ | `test/gate-integrity.test.ts` `EXPECTED_AUDITED_FILES` 含 `test/law4-input-as-next.test.ts`（`:281`）+ `IAN2_NODE_GATE_FILES`；`CHROMIUM_GATES.length === 9` 亲数（9）；亲跑 24/0 | 低 |
| C24 | journey 保护段八步显式取代 | FR-IAN-080~091 · ADR-IAN-007 §① | ✅ | **逐字节复算**：段 `[43484, 59347)` sha256 = `7b309258aab783e7943a7aa3b1b16c4a0e30969f070665497b5fa3d82f786e85`、**249 行**、起止锚文本匹配；`supersessionChain` 4 节且相邻 `supersededFrom` 连续；`countEvidence.ian2.measured = 171`（只增） | 低 |
| C25 | binding 保护段 keep 字节中立 | FR-IAN-083/090 · ADR-IAN-007 §② | ✅ | **逐字节复算**：段 `[107780, 115930)` sha256 = `be9ad0e983670137d4233349aede1cae0f0b6fdf26a050083761d30d52c6b936`（逐字相等）、段内 `composer`/`#input`/`#send` = **0/0/0**、`startByte = 107780`（段前等长补偿） | 低 |
| C26 | 体积叶2 净负 + 两叶 Σ | FR-IAN-112~115 · ADR-IAN-010 | ✅ | `stat` 亲测 `dist/sidepanel.js` = **598,577 B**；`v4-density-baseline.json` `registeredBaselineBytes` = 598,577 / `ceilingBytes` = 628,505 同源；净负 **−548 B**（599,125→598,577）；两叶 Σ = 591,946→598,577 = **+6,631 B**；**A 列目标带（−2.5~−1.0 KB）未达已如实登记**（严格口径内；DOM/CSS 经 `copyFile` 不进 JS 账本 + 重锚成本）；EC-IAN-016 三态皆「否」；`authorConfirmation` 保持 `pending-author-line` 不伪称 | 低 |
| C27 | 冻结面零容差 + 载体红线 | NFR-IAN-005/007/002/003 | ✅ | `sha256` 亲测：`content.js` 177,076 B / `52a82620…` ✅ · `pick-layer.js` 34,358 B / `77796bab…` ✅；`manifest.json`/`packages/web-cli-base/**`/`turn-queue.ts` `git diff` **零 diff**；特权 op 恒 gesture ∧ SW 永不 `permissions.request`（`insight-no-escalation` 亲跑） | 低 |
| C28 | 代码质量（可读性/职责/错误处理/硬编码/冗余） | §5.1 | ✅ | R1 源改 14 文件（+146/−168 行）；`view-model.ts`/`sidepanel.ts` 切片清晰、错误路径（无卡/空输入/无活跃站点）显式、无新魔法数；R2 对 `src/**` **零改动**（亲核 `git diff cea2922..HEAD -- src` 为空） | 低 |
| C29 | 测试质量（判据/反证/元判据/单源） | §5.4 | ✅ | 新门禁 `law4` 每条含 `expectFailPattern` + 注入实跑；`xIianLeaf2Problems`/`xIianLeaf2GateProblems` 均带反证（抽条/非法/悬空/`assertionsRemoved≠0`）；S0''-B 双面共用同一 `fixtures/s0-chain.mjs`（单源，无第二份）；三段控制禁恒真 | 低 |
| C30 | 架构一致性（文件影响 / 零改上游 / ADR） | plan §5 · NG-IAN-003~006 | ✅ | `git diff 0d0fd85..HEAD --stat` 与 plan §5 对齐（14 源 + 测试/台账 + `.sddu` 法四三处）；`turn-queue.ts` / base / 判定链零触碰；`NG-IAN-*` 无违反；未升格法十 | 低 |
| C31 | 台账完整性（`counts` / `knownLimitations` / 叶段 / `modifiedRanges`） | FR-IAN-102/114 | ✅ | `counts` 前移（insight 125 / l0 251 / l1 132 / supersession 48 / nodeTestRuntime 1441）与门禁日志同源；`KL-IAN2-01~03`（人工面 / CDP 早死变体 / 体积口径）登记；新叶段 `R2-W6` scope 33 文件复算 + `registeredUncoveredLines` 87 行；`knownGaps` 追加 | 低 |

---

## 3. 审查维度汇总

| 审查维度 | 审查项数 | 通过 | 警告 | 失败 | 通过率 |
|---------|:--:|:--:|:--:|:--:|:--:|
| 代码质量 | 5 | 4 | 1 | 0 | 80% |
| 规范符合性 | 11 | 10 | 0 | 1 | 91% |
| 架构一致性 | 5 | 4 | 0 | 1 | 80% |
| 测试质量 | 10 | 10 | 0 | 0 | 100% |
| **合计** | **31** | **27** | **1** | **2** | **87%** |

---

## 4. 阻塞问题

| # | 位置 | 问题 | 对应 Cx | 修复建议 |
|---|------|------|:--:|---------|
| **BLOCK-01** | `packages/web-cli-plugin/docs/v4-supersession-ledger.json`（缺 `xIanLedger` 条目）· `.sddu/.../v4-chat/spec.md`（读源面缺） | **法四原地修订的 old→new 逐字台账条目缺失**：三处已按新条文正确修订（C9 ✅），但 `{old 逐字 / new 逐字 / 理由 / 日期 / 落点 file:line}` **未入台账**（ADR-IAN-006 §①步3 指定 `xIanLedger` 段；全文检索 `v4-chat/spec.md` / `:116/:225/:385` = 0 命中）。连带 **FR-IAN-061「半修即红」无判据载体** —— 全仓无任何门禁读该 spec 文件 ⇒ 三处只改一处**不会**变红（违反 ADR-IAN-006 §后果「反证族」+ FR-IAN-091「取代与实现同轮完成」） | C10 | ① 在 `docs/v4-supersession-ledger.json` 增补「法四修订（X-IAN-1）」条目：`{old 逐字 =「输入按需出现：无常驻输入框…卡内还有「其他…（我来描述）」兜底」, new 逐字 =「输入即 next：自由文本输入是流内 next 的一个选项；流外零输入面」, reason, date, anchors: [{file: v4-chat/spec.md, line: 116}, {:225}, {:385}]}`；② 新增「三处一致」机核（读 `.sddu/.../v4-chat/spec.md` 三行核心句逐字比对；三处改一处 ⇒ 必红）+ 反证（改一处/删一处 ⇒ 判 FAIL）；③ 入 `test:supersession` 或 `law4-input-as-next` 下界 |
| **BLOCK-02** | `docs/v4-supersession-ledger.json#xIianLedger`（叶1）· `#xIianLedgerLeaf2`（叶2） | **X-IAN 编号语义冲突 + 父 §12 条目缺位**：`xIianLedger`（叶1）以 `X-IAN-1~7` 登记了与父 `../spec.md §12` / `ADR-IAN-006` **完全不同**的 7 项（回合通道 / 特权 op / 载体 / 推荐面 / 零死端 / SW 队列 / 草稿回填）⇒ `X-IAN-1`「法四」、`X-IAN-2`「PRESERVED」、`X-IAN-3`「入册反证」、`X-IAN-4`「body 尾断言」、`X-IAN-5`「几何」、`X-IAN-6`「`requestTurn(` 恰 1」在台账中**被错误占用/缺位**；叶2 `TASK-IAN-215` 验收「`xIanLedger` 段：X-IAN-1~11 逐条 {old/new/理由/日期/落点/status}」**仅完成 X-IAN-8~11**（且行字段缺 `old/new/落点`）⇒ 违反 FR-IAN-080/082/085/102、AC-IAN-010/020「X-IAN-1~11 逐条等价重锚 + 台账一一对应」 | C13 | ① 将叶1 `xIianLedger` 的行改名为叶内序号（如 `L1-SUP-1~7`）或显式加 `mapsToParent` 字段，消除与父 §12 `X-IAN-1~11` 的编号冲突；② 在 `xIianLedger`（或新增 `xIianLedgerFull`）按父 §12 编号补齐 `X-IAN-1~7` 逐条：`{id, old 逐字, new 逐字, decision, counterCheck, reason, date, anchors}`（`X-IAN-1` 法四 → 与 BLOCK-01 同一条；`X-IAN-2/3` → host-registry / density-thresholds；`X-IAN-4` → body 尾/六面；`X-IAN-5` → insight 几何消解；`X-IAN-6` → op-wiring 恰 1；`X-IAN-7` → TA-4）；③ 机核「每条 X 项 1 行 ∧ IDs == X-IAN-1~11 ∧ 每行有 old/new/落点」+ 反证（缺条/ID 冲突/空字段 ⇒ 必红） |

> 说明：两者均为**台账/判据登记**层面的 P0 规范符合性缺失；`src/**` 实现与全量门禁（1441 + 13 Chromium/node 组）**实测全绿**，故修复成本低（只改 `docs/*.json` + `test/**`，无需动 `src/**`，`zeroDiffFiles`/冻结面不受影响）。

---

## 5. 改进建议

| # | 位置 | 问题 | 对应 Cx | 建议 |
|---|------|------|:--:|------|
| 1 | `docs/v4-density-baseline.json#volume.effectiveCeilingRule` | 字段仍停留旧轮次 `602,095`（陈旧），与同文件 `registeredBaselineBytes: 598577` 并存易误读（承 IAN-1 review `I-02`；build §6.3 已声明「零触碰」属已知口径） | C26 | 在该字段尾部追加一行「当前生效上限 = 628,505（IAN-2 R2），权威复算见 `size-ruling-vol3`」，不动历史链 |
| 2 | `test/settings.test.ts:191` | 断言文案残留 `'composer draft restored'`（陈旧；载体已重锚 `#ask-input`，mock 本身 carrier-agnostic） | C5 | 文案改为 `'in-card draft restored'`（纯文案，断言结构不变） |
| 3 | `docs/v4-supersession-ledger.json#xIianGateReconciliationLeaf2`（`settings` 行） | 该行 `disposition = equivalent-reanchor`（before「draft 载体 = `#input`」），但 `test/settings.test.ts` **实际未改动**（亲核 `git diff` 无该文件）；改动仅在 `src/ui/settings/view-switch.ts`（注释）。disposition 与实际不符 | C21 | 该行 disposition 改 `kept`（或注明「生产侧注释重锚 + 门禁 carrier-agnostic 零改动」） |
| 4 | `docs/v4-supersession-ledger.json#xIianLedgerLeaf2.rows[*]` | 行字段仅 `{id, decision, owner, counterCheck, evidence}`，缺 `ADR-IAN-006 §①步3` 要求的 `old 逐字 / new 逐字 / 日期 / 落点 file:line`（与 BLOCK-01/02 同源） | C13 | 与 BLOCK-01/02 一并补齐字段（一次修复覆盖） |

> 无 O（观察）级遗留：本报告未发现「无法判定 / 描述模糊」项。

---

## 6. 结论

**结论**: ❌ **不通过**

| 指标 | 结果 |
|------|------|
| 审查通过率 | 87%（27/31） |
| 阻塞问题数 | **2**（BLOCK-01 法四 old→new 台账缺失 + 半修无判据；BLOCK-02 X-IAN-1~11 台账编号冲突/条目缺位） |
| 规范符合性偏差 | 2 项（FR-IAN-060~062 / AC-IAN-008；FR-IAN-080~091/102 / AC-IAN-010/020） |
| 可进入 validate | **否**（须先闭环 2 个 BLOCK 的台账/判据登记） |

**理由**: 叶2 的**实现与台账主体质量高**——`#composer` 三 id **真退役**（DOM 零命中 ≠ hidden，注入必红）、写者/锁存/设置态护栏结构性消解、四处兜底收敛终态、`requestTurn(` 恰 1、`ACT_TO_OP` 6 / 集 A 9、S0''-B 终态（Chromium **82/0**）、T220 三文件重锚登记完整（`redlineRemap` 8 / 新叶段 87 行逐字 / `modifiedRanges` 19）、保护段 journey 新 pin **逐字节复算吻合**（`7b309258…` / 43484..59347 / 249 行）、binding keep **逐字节中立**（`be9ad0e9…` / `startByte` 107780）、体积 **598,577 / 净负 −548** 诚实登记、三冻结面 sha 零容差、全量门禁亲跑 **1441 node + 82/171/125/251/132/192/60/79/53 Chromium 全绿**。

但 **法四修订的立法台账（X-IAN-1 old→new 逐字 + 三处一致判据）** 与 **X-IAN-1~11 编号语义** 存在 2 处 P0 规范符合性缺口（FR-IAN-060~062/080~091/102、AC-IAN-008/010/020、`TASK-IAN-215` 验收未达），且「半修即红」反证族无载体。按 §6 审查标准（阻塞 0 / 规范符合率 100%），判 **不通过**；修复仅需改 `docs/v4-supersession-ledger.json` + `test/**`（`src/**` 零改动，冻结面/`zeroDiffFiles` 不受影响），闭环后可复跑 `test:supersession` / `npm test` 再审入 validate。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（叶2 首轮审查 R1）：31 项（27 ✅ / 1 ⚠️ / 2 ❌ → 2 BLOCK）· 4 I · 0 O；亲跑 `npm test` 1441/0 + `supersession` 48/0 + `gate-integrity` 24/0 + S0''-B 82/0 + journey 171 + insight 125 + l0 251 + l1 132 + binding 192 + law8 60 + recommendation 79 + dead-end 53 + size-ruling-vol3 13/0 + insight-no-escalation 21/0 + law4 5/0；三冻结面 sha / journey·binding 保护段逐字节复算；结论 ❌ 不通过（BLOCK-01/02） | 2026-09-25 | SDDU Review Agent |
