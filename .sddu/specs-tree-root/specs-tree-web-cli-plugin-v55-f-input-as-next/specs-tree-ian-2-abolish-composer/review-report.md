# 审查报告：specs-tree-ian-2-abolish-composer

> **文档定位**: SDDU 审查报告 — 逐项记录自主审查的执行结果，作为 validate 阶段的输入
> **审查策略**: `review.md`（C1~C31 审查清单及四维度指引）
> **前置依赖**: `review.md`（策略）· `spec.md`（v1.0）· `plan.md`（v1.0）· `tasks.md`（v1.0 · 25 任务）· `build.md`（v2.0 · R1+R2 · 25/25）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-25
> **审查轮次**: R1 + **R2**
> **版本**: v1.1
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-26
> **更新说明**: ① 初始创建（叶2 首轮审查 R1：亲跑 node + Chromium 全量门禁；三冻结面 sha；protective segment 逐字节复算；法四三处逐字核；台账全字段检索 → 2 BLOCK / 4 I / 0 O）。② **R2 复审**（修复轮 `9ffbea8` 后 · HEAD `f787cab`）：BLOCK-01/02 **亲注入闭环**（半修必红 / 缺条·ID冲突·空字段必红）+ I-01~04 复核 + 全量复扫 + 红线终核 + `npm test` 亲跑 **1443/0** → 0 阻塞 / **1 残留 I**（结论 ⚠️ 有条件通过，见 §R2）

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
| **v1.1（R2）** | **R2 复审（修复轮 `9ffbea8` 后 · HEAD `f787cab`）**：BLOCK-01 **亲注入闭环**（`law4InplaceRevision` 三锚逐字核 + L4-7 半修 `:225` ⇒ 必红 ⇒ 还原字节 identity 绿）· BLOCK-02 **亲注入闭环**（叶1 `L1-SUP-1~7`+`mapsToParent` · `xIianLedgerFull` X-IAN-1~7 字段齐 · `xIianFullLedgerProblems` 缺条/ID冲突/空字段逐项必红 ⇒ 还原绿）· I-01~04 复核 ✅ · 全量复扫（叶段 `R2-W6` scope.files **35** 与逐叶复算一致 + R1 抽核）· 红线终核（三冻结面 / `zeroDiffFiles` 9 / `KIND_SET` 40 / 12 kind / 特权 gesture / journey pin `7b309258…` / binding keep `be9ad0e9…` / 体积 598,577）· `npm test` **1443 / 0 / 0** · `supersession` **49/0**。→ **0 阻塞 / 2 BLOCK 闭环 / 1 残留 I**；结论 ⚠️ 有条件通过 | 2026-09-26 | SDDU Review Agent |

---

## R2 复审（闭合轮 · 2026-09-26）：BLOCK-01/02 闭环亲核 + 全量复扫 + 红线终核

> **触发**: 本报告 R1 判 ❌（2 BLOCK + 4 I）→ build 修复轮 commit `9ffbea8`（build.md v3.0 §9）→ 本 R2 复审。
> **复审范围**: ① BLOCK-01/02 闭环**亲注入**核（必红 + 还原绿）；② I-01~04 复核；③ 全量复扫（R1 通过项抽核 + 修复轮新引入风险）；④ 红线终核；⑤ `npm test` 亲跑。
> **口径**: `review.md` 策略 C1~C31 不变，逐项重核；**`.sddu` 外零触碰**（本轮仅读 + 临时注入并**逐字节还原** + 追加本报告）。对象 HEAD `f787cab`（修复提交 `9ffbea8`）。

### R2.1 审查概要

| 指标 | 数值 |
|------|:--:|
| R1 阻塞闭环 | **2 / 2**（BLOCK-01 ✅ · BLOCK-02 ✅） |
| R1 改进闭环 | **4 / 4**（I-01 ✅ · I-02 ✅ · I-03 ✅ · I-04 ✅） |
| R2 新残留 | **1**（I-R2-01 · 非阻塞） |
| R2 阻塞 | **0** |
| 结论 | ⚠️ **有条件通过** |

| 亲跑门禁（本机实测 · 本轮） | 实测 | 基线 | 判定 |
|------|:--:|:--:|:--:|
| `npm test`（node，全量） | **1443 / 0 / skip 0** | 1443 | ✅ |
| `test:supersession` | **49 / 0** | 48（+1） | ✅ |
| `law4-input-as-next` | **6 / 0**（含新增 L4-7） | 5（+1） | ✅ |
| `test:gate-integrity` | **24 / 0** | 24 | ✅ |
| `test:size-ruling-vol3` | **13 / 0** | 13 | ✅ |
| `insight-no-escalation`（node） | **21 / 0** | 21 | ✅ |
| `test:settings` | ✅（在 `npm test` 内） | PASS | ✅ |

### R2.2 BLOCK-01 闭环亲核（法四 old→new 逐字台账 + 半修即红）

**① 台账条目（亲读 `docs/v4-supersession-ledger.json#law4InplaceRevision`）**：`id=X-IAN-1` · `law=法四` · `old` 逐字 · `new` 逐字 · `coreSentence` · `reason`（≥20 字，明写「O-IAN-007 裁决 = 原地修订 / 不升格法十」）· `date=2026-09-25` · `anchors[3]` = `{v4-chat/spec.md:116 法则表}` · `{:225 FR-CHAT-014}` · `{:385 AC-CHAT-007}` · `counterCheck` = `law4-input-as-next` L4-7。**ADR-IAN-006 §①步3 五要素齐备**（`old/new/理由/日期/落点 file:line`）。

**② 三锚真源逐行核**：`v4-chat/spec.md` `:116` / `:225` / `:385` 三行**均逐字含**核心句「`自由文本输入是流内 next 的一个选项；**流外零输入面**`」。

**③ 机核 L4-7 亲注入（半修必红 ⇒ 还原绿）**：

| 步骤 | 操作 | 结果 |
|:--:|------|------|
| baseline | `node --test dist-test/test/law4-input-as-next.test.js` | **6 / 6 ✅** |
| **注入** | 把 `spec.md:225`（FR-CHAT-014）核心句回退为「输入按需出现：无常驻输入框」 | L4-7 **✖ FAIL** · 精确报 `.sddu/.../v4-chat/spec.md:225 缺法四新条文核心句（半修 / 未修 ⇒ 必红）` |
| 还原 | `git checkout --` 该 spec + 与备份 `diff -q` | **byte-identical** ✅ · 复跑 **6 / 6 ✅** |

**结论**：BLOCK-01 **闭环**——台账 old→new 逐字 + 三锚一致 + 半修必红（有真实判据载体，不再是「无载体」）。

### R2.3 BLOCK-02 闭环亲核（X-IAN 编号语义 + 父 §12 X-IAN-1~11 逐条）

**① 叶1 `xIianLedger`**：行 id 全部为 `L1-SUP-1~7`（**零** `X-IAN-\d+` 占用）；逐行 `mapsToParent`（`null` / `X-IAN-2` / `X-IAN-7`）；新增 `numberingPolicy` + `renameNote`；老登记文本（decision/owner/counterCheck/evidence）**逐字保留**。

**② `xIianLedgerFull`（X-IAN-1~7）**：逐条 `{id, decision, owner, old 逐字, new 逐字, reason, date, counterCheck, anchors}`，与父 `../spec.md §12` 语义逐条对齐：X-IAN-1 法四 / 2 PRESERVED 入退役面 / 3 入册反证 / 4 body 尾·六面重锚 / 5 insight 几何消解 / 6 `requestTurn(` 恰 1 / 7 TA-4 载体唯一化。

**③ `xIianLedgerLeaf2`（X-IAN-8~11）**：Draft 载体 / `NEVER_FOLDABLE` / 首装引导 / binding，均补齐 `old/new/reason/date/anchors`（**I-04** 同步覆盖）。

**④ 机核 `xIianFullLedgerProblems` 亲注入**（导入编译产物 + 真台账数据）：

| 注入 | 期望 | 实测 |
|------|:--:|:--:|
| baseline（并集 X-IAN-1~11） | 绿 | **0 problems ✅** |
| 缺条（抽 X-IAN-3） | 红 | ✅ 命中 `X-IAN-3` |
| ID 冲突（叶1 回退 `X-IAN-1`） | 红 | ✅ 命中「编号冲突」 |
| 空字段（X-IAN-4 `new=''`） | 红 | ✅ 命中「new 逐字」 |
| 空字段（X-IAN-5 `anchors=[]`） | 红 | ✅ 命中「落点」 |
| 还原 | 绿 | **0 problems ✅** |

> 同批：叶1 机核 `xIianLedgerProblems` baseline **0**；`L1-SUP-1→X-IAN-1` ⇒ 红「编号冲突」；`xIianLeaf2Problems` baseline **0**，抽 `X-IAN-8` ⇒ 红；`xIianLeaf2GateProblems` baseline **0**。

**结论**：BLOCK-02 **闭环**——编号语义冲突消解（叶1 改名 + `mapsToParent`）、父 §12 `X-IAN-1~11` 并集恰 11 条、字段齐备、缺条/ID 冲突/空字段逐项必红。

### R2.4 I-01~04 复核

| # | 复核点 | 实测 | 判定 |
|---|------|------|:--:|
| I-01 | `v4-density-baseline.json#volume.effectiveCeilingRule` 尾部追加「〖IAN-2 R2（2026-09-25，review R1 I-01 订正）〗当前生效上限 = **628,505 B**（= `min(675,840, floor(598,577 × 1.05))`）」；历史链（含陈旧 602,095）**逐字保留**；`registeredBaselineBytes=598577` / `ceilingBytes=628505` 同源 | ✅ 文本已含 628,505；陈旧链保留 | ✅ |
| I-02 | `test/settings.test.ts:191` 断言文案 → `'in-card draft restored'`（值/结构不变） | ✅ 逐字命中 | ✅ |
| I-03 | `xIianGateReconciliationLeaf2` `settings` 行 `disposition='kept'`（after 注明生产侧注释重锚 + 门禁 mock carrier-agnostic）；`assertionsRemoved` 保 0 | ✅ 实测 kept；全 20 行 removed 全 0 | ✅ |
| I-04 | 叶2 `xIianLedgerLeaf2.rows[*]` 补齐 `old/new/reason/date/anchors` | ✅ X-IAN-8~11 四行字段齐备 | ✅ |

### R2.5 全量复扫（R1 通过项抽核 + 新引入风险）

- **R1 通过项抽核**（重核数值见 R2.6）：C1 三 id DOM 零命中 / C4 `NEVER_FOLDABLE` 13 ∧ `RETIRED_CONTAINER_IDS` 16 / C15 `requestTurn(` 真调用 1 / C17 `CARD_TAG_LABELS` 12 ∧ 零宿主 / C24 journey pin / C25 binding keep / C26 体积 / C27 冻结面——**全绿**。
- **修复轮 scope 缺口**：叶段 `specs-tree-ian-2-abolish-composer(R2-W6)` `scope.files` = **35**（含 `packages/web-cli-plugin/test/supersession-ledger.test.ts`），与 `test:supersession` 的「逐叶 scope 复算」机核实测**一致**（该段 35 文件；叶1 段 50 / 46，叶2 R1 段 48）；R1 的「逐叶复算唯一红」已转绿。✅
- ▌**新发现（I-R2-01）**：修复轮新增 2 条 node 用例（`supersession` 48→**49** / `law4` 5→**6** ⇒ `npm test` 1441→**1443**），但台账 `counts.supersession.currentRuntime` 仍 **48**、`counts.nodeTestRuntime.currentRuntime` 仍 **1441**（`source.observed`/`observedLine` 同）；`git show 9ffbea8 -- docs/v4-supersession-ledger.json` **无 `currentRuntime` 改动**。N-04「counts↔日志同源」机核因 `/tmp/.../ian-2-r2/registry/*.log` 快照缺失而 **skip**（设计如此 ⇒ `npm test` 仍 1443/0 绿），故属**登记口径滞后**而非门禁失败。**非阻塞**。
- **历史陈述（note，不计 N）**：`build.md §4.3`（R2 段）三态分布为 kept 3 / equivalent-reanchor 13；I-03 后台账实为 **kept 4 / equivalent-reanchor 12 / explicit-supersession 4**（= 20 行）。§9.2 I-03 已显式登记该变更，§4.3 属修复前历史快照（建议加一行指针，不改史）。
- **台账独占**：全 JSON 遍历，仅 `xIianLedgerFull`（1~7）与 `xIianLedgerLeaf2`（8~11）占用 `X-IAN-\d+`（叶1 已消解）✅。

### R2.6 红线终核

| 红线 | 判据 | R2 实测 |
|------|------|------|
| 三冻结面 | `stat` + `sha256sum` | `content.js` **177,076 B / `52a826205553b46a…`** ✅ · `pick-layer.js` **34,358 B / `77796babd9c93893…`** ✅ · `sidepanel.js` **598,577 B** ✅ |
| 零 diff 面 | `git diff 0d0fd85..HEAD` | `manifest.json` / `packages/web-cli-base/**` / `turn-queue.ts` **零 diff**；`src/**` 自 `cea2922` **零 diff** ✅ |
| `zeroDiffFiles` | 台账 + 门禁 | 恰 **9** 项（含 `v3-density-baseline` / `v3-supersession-ledger` / `manifest` / `src/content` / 三 security 文件 / `hardening` / `zero-injection`）逐项零 diff ✅ |
| `KIND_SET` / kind / 宿主 | 生产常量直读 + 门禁 | `KIND_SET` **40** · `CARD_TAG_LABELS` **12** kind · `REGISTERED_STRUCTURAL_HOSTS` **`[]`** ✅ |
| 特权手势 | `insight-no-escalation` | **21 / 0**（恒 `gesture` ∧ SW 永不 `permissions.request`）✅ |
| 法四（真退役） | `index.html` + `law4` | 三 id `id="…"` **零命中**（≠ `hidden`）；`RETIRED_CONTAINER_IDS` **16**（`composer`/`input`/`send` 全入）✅；`NEVER_FOLDABLE` **13**（无 `composer`）✅；`requestTurn(` 真调用 **1**（`sidepanel.ts:3899`）✅ |
| journey pin | 逐字节复算 | `bytes[43484:59347)` len **15863** sha **`7b309258aab783e7…`** ✅（起/止锚文本吻合） |
| binding keep | 逐字节复算 | `bytes[107780:115930)` len **8150** sha **`be9ad0e983670137…`** ✅；段内 `composer`/`#input`/`#send` = **0 / 0 / 0** ✅ |
| 体积诚实登记 | `stat` + 台账 | **598,577 B**；`registeredBaselineBytes` / `ceilingBytes`=628,505 同源 ✅ |
| 台账仅两段占 X-IAN | 全 JSON 遍历 | 仅 `xIianLedgerFull` + `xIianLedgerLeaf2` ✅ |

### R2.7 残留登记（N）

| # | 级别 | 位置 | 问题 | 建议 |
|---|:--:|------|------|------|
| **I-R2-01** | 改进 | `docs/v4-supersession-ledger.json#counts.{supersession,nodeTestRuntime}` | 修复轮后计数**滞后**（`supersession` 48 vs 实测 **49**；`nodeTestRuntime` 1441 vs 实测 **1443**），`source.observed`/`observedLine` 同滞；N-04 因快照日志缺失 **skip** ⇒ 非门禁失败 | 随下一登记轮**前移** `currentRuntime` + `source.observed`/`observedLine`（指向新 `registry/` 同源快照）；或显式注明「留待下一轮登记」 |

> **O（观察）级**：0。`build.md §4.3` 三态分布为修复前历史快照（§9.2 I-03 已登记变更），属 note 而非缺陷。

### R2.8 结论

**结论**: ⚠️ **有条件通过**

| 指标 | 结果 |
|------|------|
| R1 BLOCK 闭环 | **2 / 2**（BLOCK-01/02 亲注入必红 + 还原绿） |
| R1 改进闭环 | **4 / 4**（I-01~04） |
| R2 阻塞 | **0** |
| R2 残留 | **1**（I-R2-01 counts 登记滞后，非阻塞） |
| 红线 | **全绿**（三冻结面 / `zeroDiffFiles` 9 / `KIND_SET` 40 / 12 kind / gesture / journey pin / binding keep / 体积 598,577） |
| 可进入 validate | **是**（建议 validate 前顺手前移 counts，或在其报告中登记 I-R2-01） |

**理由**: 修复轮 `9ffbea8` **未触碰 `src/**` / 冻结面 / `zeroDiffFiles` / 体积**，只改 `docs/*.json` + `test/**`；R1 的 2 个 P0 登记缺口（法四 old→new 逐字台账 + 半修判据；X-IAN 编号语义冲突 + 父 §12 条目缺位）已以**可机核 + 反证必红**方式闭环，4 个改进项逐项处置。全量门禁亲跑 **1443 / 0 / 0**（`supersession` **49/0** · `law4` **6/0**），红线逐项复算零容差。唯一残留 I-R2-01 为**台账 counts 登记口径滞后**（非阻塞、非功能/规范偏离），建议在 validate 前或下一登记轮一并前移。
