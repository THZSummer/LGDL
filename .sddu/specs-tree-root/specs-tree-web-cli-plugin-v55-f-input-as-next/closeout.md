# F-35 web-cli-plugin v0.11.2「输入即 next：废除流外输入框」——全 Feature 总账（父收口）

> **Feature**: `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v55-f-input-as-next/`（父 = 轻量规范容器）
> **收口轮次**: v55-f-input-as-next 父收口（三轮合一：ian-1 叶收口 + ian-2 叶收口 + 父收口，第 1 轮）
> **日期**: 2026-09-26 ｜ **授权**: 编排器代作者决策（作者已授权编排器代行决策、SDDU 全流程自行调度）｜ **代行**: sddu-build
> **分支 / HEAD**: `feature/web-cli-plugin` @ 父收口前 `a5b9ded`（叶2 validate 收口轮后提交）；`main` = `2ddc922`，**未动**
> **口径**: 本文件的数字**一律取自两叶 build / review / validate 产物**（不重跑门禁、不编造）；本轮为**纯文档 / 状态收口**，零 `src/`、零 `test/`、零 `docs/`、零两叶产物实义改动；抽查与源核对见 §3 脚注。

---

## 1. 一句话结论

**v0.11.2「输入即 next：废除流外输入框」完成**：父 + 两叶全部收口，**两叶 phase 全部 `validated`**（`status=completed`），**主题达成 = 把作者裁决「废除流外独立输入框」兑现为「输入即 next；流外零输入面」**——① **自由文本输入成为流内 next 的一个选项**（新 provider `free-input` 恒真 + `recommendNextStep` 单点注入**恒最末终端** + 零死端 floor + 点开就地展开**卡内输入**（复用 `.ask-fallback` 家系，独立 `requestId=free-input`），**不新增常驻输入框 / 不新增 kind / 不新增宿主**）；② **提交唯一经 `op.turn` 槽**（叶1 中间态 `requestTurn(` 仍恰 2 → 叶2 终态**恰 1**）；③ **`#composer` / `#input` / `#send` DOM 真退役**（元素**不存在** ≠ `hidden`）+ 双写者 / `fallbackOpen` 锁存 / 设置态护栏一并消解；④ **四处兜底入口全部收敛卡内**（`.ask-fallback`，去「双 reveal」）；⑤ **R6 排队迁移流内**（有界队列语义保留；入口与草稿回填载体迁流内，回填不覆盖新输入）；⑥ **法四原地修订**（old「输入按需出现：无常驻输入框…」→ new「输入即 next：自由文本输入是流内 next 的一个选项；**流外零输入面**」，三处一致 + old→new 逐字台账 + 半修必红）；⑦ **S0″ 双面机器化**（S0″-A 中间态双入口并存保护 / S0″-B 终态三 id 零命中）。**作者裁决「不打破 all-in-chat / next 主线」被完整兑现且可机核。**

**未闭合义务（不得伪称已确认）**：体积 `authorConfirmation.status` 仍为 **`pending-author-line`（待作者一行）**——**承接 v5.5 两次升档的历史确认事项**（`512,000→563,200 / →619,520`；`563,200→614,400 / →675,840`）；**本 Feature 段无新增升档**（未跨档位、未触 EC-IAN-016 三分支）。**不合 main、不发布**（v1/v2/v3/v4/v4.5/v5/v5.5/v5.5.1/**v0.11.2（F-35）** 均在 `feature/web-cli-plugin`，合入 / 发布由作者决定）。

---

## 2. 交付了什么（面向使用者的五句话）

1. **想自由输入时，不用离开聊天流**：推荐卡**按需**出现一个**恒最末终端**「自由输入…」（非 `.next-chip`，**不常驻**），点开**就地展开卡内输入**（复用既有 `.ask-fallback` 家系；`askuser` kind 内**第二语义分支**，独立 `requestId='free-input'`，与 `ref-describe` 互不干扰）；**无任何候选时**仍可达（**零死端 floor**，`suppression==='empty'` 铸「仅含终端」最小卡）。
2. **输入即 next，提交走同一条回合通道**：卡内输入提交**唯一经既有 `op.turn` 槽**（`bindPanelOps.turn → requestTurn`），**不新增注册表外直连**；叶1 中间态 `requestTurn(` 仍恰 2（旧 `#composer` 提交点保留）→ 叶2 终态**恰 1**（唯一生产输入提交点 = `op.turn` 槽）。
3. **流外不再有任何输入面**：`#composer` / `#input` / `#send` **DOM 真退役**（`id="…"` 零命中，**元素不存在**，不是 `hidden`）；双写者（`syncComposerVisibility` / l0 `revealFallback` 直写）/ `fallbackOpen` 锁存 / 设置态漏调三处护栏**结构性消解**；四处兜底入口（末项「其他…（我来描述）」/ `op.describe` 无值相 / L1 面板 / `bindPanelOps.describe` 空值）**全部收敛到卡内 `.ask-fallback`**（停止附带 reveal 流外面）。
4. **排队与草稿行为不变、载体迁流内**：SW **有界队列语义保留**（`turn-queue.ts` 零 diff；溢出明确拒绝）；在飞时**终端不被硬禁用**（终端是 `.next-terminal` 非 `.next-chip`，在飞走 SW 仲裁 `queued`/`busy-rejected`）；`busy-rejected` **草稿回填迁流内**（仅当为空 ⇒ 不覆盖 / 卡收起 ⇒ 重展开 + focus / 卡不存在 ⇒ 按需铸造）；`#send-reason` 保留在状态栏但**断言重锚**（状态提示 ≠ 输入面）；首装引导改指流内「自由输入…」。
5. **安全与红线不退化**：**法四原地修订**（不升格法十）+ old→new 逐字台账 + **半修即红**（`law4-input-as-next` L4-7 读 `v4-chat/spec.md` 三锚 `:116`/`:225`/`:385` 逐字比对）；**法八零明文**（卡内输入文本仅走 chat user 载荷，**卡固化不回显**；`law8` ⑩ 含自由输入零明文）；**特权 op 恒 `gesture`**（提交路径不触达特权 op）；**手输 / AI 驱动留痕两值可判**（`driver='manual'` ∉ 声明驱动者 id 域）；**冻结面 `content.js` / `pick-layer.js` 逐字节未动**。

---

## 3. 两叶一览表

| # | 叶子 Feature | 范围（一句话） | 关键产出 | 验证（实测） | 收口 commit |
|:-:|--------------|----------------|----------|--------------|-------------|
| 1 | `specs-tree-ian-1-free-input-next`（IAN-1，**27 任务 / 3 波**，首叶 / 底座叶，交付序 1/2） | 流内「自由输入…」next 项（provider + 恒最末终端 + 零死端 floor）+ 卡内输入第二语义分支 + 提交经 `op.turn` 槽 + 手输 `driver=manual` 两值可判 + 让位语义槽外 + 零新增 kind/宿主 + R6 双入口并存 + 流内草稿回填 + a11y（focus / Enter / Escape）+ S0″-A 中间态双面 + 新 node 门禁 `free-input-next` + 体积正增量重登记 | `src/ui/sidepanel/next-registry/providers.ts`（free-input provider）· `recommend.ts`（恒最末终端 + floor）· `cards/nextstep.ts`（`.next-terminal`）· `cards/askuser.ts`（第二语义分支 + 幂等纯查询 + Enter/Escape + 固化不回显）· `sidepanel.ts`（`openFreeInputCard` / `submitFreeInput` / `restoreFreeInputDraft` / 取消）· `view-model.ts`（引导改指）· `stream-model.ts`/`chat-state.ts`（`nextstepTerminal` 加法字段）· `stream-plaintext.ts`（`ASK_COPY.freeInputSubmitted`）· `next-registry/ops.ts`/`dispatch.ts`（集 A 8→9）· `test/free-input-next.test.ts`（NEW）· `test/ui/fixtures/s0-chain.mjs`（S0″-A 段） | **✅ 通过（review R1：26 Cx / 23 ✅ / 3 ⚠️ / **0 BLOCK** / 3 I / 2 O；validate R1：V1~V8 全绿 / 0 阻塞 / 新增观察 V-01）**；`free-input-next` **22/0**（FIN-0~9）· `op-wiring` **14/0**（`requestTurn(` 恰 2）· `turn-arbitration` **7/0**（TA-8）· `gate-integrity` 15 → **23/0** · `supersession` 42 → **45/0** · `recommendation` 72 → **79/0** · `law8` 52 → **60/0**（含 ⑩）· Chromium `s0-self-driven` 70 → **81/0**（`S0C-12` 中间态双入口真面板）+ 自研行为级 **16/16**（闭环 review I-03）；`npm test` **1395 → 1431/0**（首叶段 **+36**）；**体积 591,946 → 599,125 B（+7,179；越叶预算 +2.5~4.5 KB ⇒ 如实登记不停机）**；**SG-IAN-01 / 02 全可行** | `537813d`（validate；收口轮 **N-01~N-05**：父收口 5 / 本叶已闭环 I-03 / 人工面 M1·M2·M5） |
| 2 | `specs-tree-ian-2-abolish-composer`（IAN-2，**25 任务 / 3 波**，末叶 / 拆除叶，交付序 2/2，**硬依赖叶1**） | `#composer` DOM 真退役 + 双写者/锁存/设置态护栏消解 + 四处兜底收敛终态 + `#send-reason`/`sendDisabled`/draft/引导重锚 + **法四原地修订三处 + old→new 逐字台账** + `requestTurn(` 恰 1 + R6 唯一化 + 18 门禁三态对账 + 保护段决策（journey 八步取代 / binding keep）+ 体积净负重登记 + S0″-B 终态 | `index.html`（三 id 退役 + CSS 清理）· `sidepanel.ts`（去写者 / `restoreFreeInputDraft` 唯一 / draft 重锚卡内 / 引导）· `l0/shell.ts`（只操作卡内）· `disclosure.ts`（`NEVER_FOLDABLE` 14→13）· `host-registry.ts`（`RETIRED_CONTAINER_IDS` 13→16）· `view-model.ts`（`sendDisabled` 重锚）· `test/law4-input-as-next.test.ts`（NEW，L4-1~7）· `docs/v4-supersession-ledger.json`（`law4InplaceRevision` + `xIianLedgerFull` + `xIianLedgerLeaf2` + 门禁对账）· `.sddu/.../v4-chat/spec.md`（法四三处）· `test/ui/{insight,l0,l1}.mjs`（T220 法四等价重锚） | **⚠️→✅（review R1：31 Cx / 27 ✅ / 1 ⚠️ / 2 ❌ = 2 BLOCK + 4 I → 修复轮 `9ffbea8` → R2 **0 阻塞** / BLOCK-01/02 亲注入闭环 / I-01~04 闭环 / 残留 1 I-R2-01；validate R1：V1~V12 全绿 / 0 阻塞 / I-R2-01 闭环 / 2 环境性 flake）**；`law4-input-as-next` **6/0**（L4-1~7）· `supersession` 45 → 48 → **49/0** · `gate-integrity` 23 → **24/0** · Chromium `s0-self-driven` 81 → **82/0**（S0″-B 终态）· `insight` 118 → **125** · `l0` 248 → **251** · `l1` 120 → **132** · `law8` **60**；`npm test` **1431 → 1443/0**（末叶段 **+12**）；**体积 599,125 → 598,577 B（净负 −548；未达目标带 −2.5~−1.0 KB ⇒ 如实登记）**；**SG-IAN-03 可行** | `a5b9ded`（validate；收口轮 **N-01~N-03**：本叶已闭环 I-R2-01 / 父收口 N-02·N-03 / 人工面 M3·M4） |

> **任务总量**：27 + 25 = **52 任务 / 6 波**（叶1 3 波 / 叶2 3 波）；叶间**硬串行** `ian-1（validated）→ ian-2`（先立流内输入面与唯一通道，再拆旧面 —— 交付序安全）；**3 个 spikeGate**（SG-IAN-01 `op.turn` 槽承载自由输入 / SG-IAN-02 `askuser` 第二语义分支不破载体 / SG-IAN-03 journey 八步字节账预演）**全可行**；每叶收尾**全门禁必须绿**。父 = 轻量规范容器（`phase=tasked → validated` / **不承接 build / review / validate**，产出总览型 `tasks.md` / `tasks.json`）。母体口径：**80 FR / 14 NFR / 18 EC / 20 NG / 10 US / 8 G / 27 AC / 11 DC**；10 ADR（ADR-IAN-001~010）；PD-IAN-001~009 全部裁决；DC-IAN-001~011 全部落定。

> **抽查数字与源核对（本轮）**：① `npm test` **1443** ↔ 两叶产物（叶1 `1431/0` → 叶2 validate-report §3.3 独立复跑 **1443/0/0**）**一致**；② `dist/sidepanel.js` **598,577 B** ↔ 源 `packages/web-cli-plugin/test/size-baseline.ts` 五要素终值（叶2 build §5 + `ian2Rows`；`authorConfirmation = pending-author-line`）**一致**（本轮 `git diff` 对 `packages/**` 零改动，未移动该锚）；③ **档位 614,400 / 绝对上限 675,840 / 生效上限 628,505** ↔ 叶2 build §5 + `test/size-ruling-vol3`（同源）**一致**（历史两次升档值 `563,200→614,400`、`619,520→675,840` 与 `pending-author-line` 逐字保留，未被改写）；④ **法四三锚 `:116`/`:225`/`:385`** ↔ `docs/v4-supersession-ledger.json#law4InplaceRevision`（old/new 逐字 + `anchors[3]`）+ `law4` L4-7 **一致**；⑤ **journey pin `7b309258…` / binding keep `be9ad0e9…`** ↔ `test:supersession` 逐字节复算 **一致**。

---

## 4. 门禁总账（末轮实测原文，计数只增不减）

| 门禁 | 末轮实测 | 备注 |
|------|:--:|------|
| `npm test`（node 全量） | **`1443 / 0 / skip 0`** | F-35 起点 **1395** → **1443**（**F-35 段 +48**：1395 → 叶1 **1431**（+36）→ 叶2 **1443**（+12）） |
| `free-input-next`（**新 1**，node） | **22 / 0** | FIN-0~9 共 **10 条判据** + 元判据 `JUDGEMENTS.length===10` + 逐条 `expectFailPattern` + 反证（forged 源 / 合成伪造体；真源码零触碰）：独立 `requestId` / floor / 恒最末 / `op.turn` 槽唯一 / `manual` ∉ 声明集 / 让位槽外 / 空提交非静默 / 回填不覆盖 / 法八固化不回显 |
| `law4-input-as-next`（**新 2**，node） | **6 / 0** | L4-1 三 id 零命中 / L4-2 入册 16 / L4-3 零可见输入 / L4-4 卡内可用 / L4-5 三段控制（`n/a` 不冒充 `ok`）/ L4-6 真源切片 / **L4-7 三处一致机核（半修必红）**；3 条反向注入全绿必红 |
| `s0-self-driven`（Chromium S0″ 面） | **82 / 0** | **S0″-A 中间态**：叶1 70 → **81/0**（`S0C-12` 真面板点末端项 → `#ask-input` 获焦 → 真键入 → 真提交成回合 → 旧 `#composer` 仍可用 → 双回填互不覆盖）（首轮 **81/1** 环境 flake ⇒ 隔离复跑 ×2 转绿，KL-N-10）；**S0″-B 终态**：叶2 **82/0**（三 id DOM 零命中，`html_sha256=ba9f3248…`） |
| `s0-self-driven-chain`（node S0″ 面）+ 自研行为级 | **S0PP-A 三用例 + 16 / 0** | 叶1 node 面真管线回合（`bindPanelOps` + `dispatchOp('op.turn')`）∧ 反证族 ×7 ∧ 真源切片；叶2 独立复刻 node 面（`retired_id_hits=[]` / `remint_hits=[]` / 注入 `<form id=composer hidden>` 检出）；validate 自研 `ian1-behavior.mjs` **16/16** |
| `test:supersession`（元台账） | **49 / 0** | **红线终核**（content / pick-layer / `KIND_SET` 40 / 特权恒 gesture / consent 不代答 / `requestTurn(` 恰 1 / 法八 / 零宿主 / `zeroDiffFiles` 9 项 / manifest / `pending-author-line`）；`law4InplaceRevision` + `xIianLedgerFull` X-IAN-1~7 + `xIianLedgerLeaf2` X-IAN-8~11（并集恰 11）+ X-IAN 缺条 / ID 冲突 / 空字段 ⇒ 必红（42 → 45 → **49**） |
| `test:gate-integrity`（元门禁） | **24 / 0** | 受审集合只增（19 → 22 → **23** → **24**）；`free-input-next` ∧ `law4-input-as-next` 在册；`CHROMIUM_GATES === 9` **逐字不动** |
| `test:law8` | **60 / 0** | 法八四面零明文（52 → **60**）；⑩ 自由输入零明文（payload 恰 1 命中 ∧ 卡固化不回显 ∧ digest / 审计 / DOM 属性零命中）；**52 段零降级** |
| `test:insight`（Chromium） | **125** | ★ 只增（118 → **125**；T220 三文件法四**等价重锚**，`composerGapToBottom` 显式消解登记 `composerDissolved:true`） |
| `test:l0` · `test:l1`（Chromium） | **251 / 132** | ★ 只升不降（l0 248 → **251**；l1 120 → 131 → **132**）：⑧ 退役容器册 13→16 + ③⑪ 法四等价重锚 / ⑨ 可见文本输入上限 ≤2 → **≤1** + 三 id 零命中 + 唯一可见输入面在 `#stream` 内 |
| `test:ui`（journey） | **171 PASS** | **保护段八步显式取代**：段 `[43484, 59347)` len **15863** / **249 行** / sha **`7b309258aab783e7…`**（新 pin；`supersessionChain` 4 节相邻 `supersededFrom` 连续；`countEvidence.ian2.measured = 171` 只增） |
| `test:binding` | **192 PASS**（保护段字节级双绿） | **保护段 keep 字节中立**：段 `[107780, 115930)` len **8150** / sha **`be9ad0e9…`** / `startByte=107780` / 段内 `composer`·`#input`·`#send` = **0/0/0**；**环境性 flake**（CDP socket 早死，高载所致，见 §7） |
| `test:recommendation` · `test:dead-end` | **79 / 0 · 53 / 0** | ★ 只增（recommendation 72 → **79**：⑰ 终端点击不填 `#input`；dead-end **53** 保段） |
| `test:density` · `test:l2` · `test:hardening` | **242 / 74 / 24** | 只增（density 242 保段：退役容器册 + 三 id 死规则零残留） |
| `test:auth-chip` · `test:zero-injection` · `test:page-input` | **37 / 28 / 125** | 只增 / 保段 |
| `test:op-wiring` · `test:turn-arbitration` · `test:insight-no-escalation` | **14 / 0 · 7/0(TA-8) · 21 / 0** | ★ 重锚 / 扩面：`op-wiring` 唯一调用点集合（叶2 `OP_CALLSITE_SET.op.turn.callSites = 1`）；TA-4/TA-8 载体唯一化 + 三反证；`insight-no-escalation` IAN-1 面扩 + 特权恒 gesture |
| `test:settings` · `test:size-ruling-vol3` | **15 / 0 · 13 / 0** | draft 载体 mock carrier-agnostic（文案 `'in-card draft restored'`）/ 体积终值机核 |
| `npm run typecheck` / `npm run build` / `test:e2e` | **0 error / EXIT=0 / PASS** | fixture + LGDL Workbench 全链 |

**纪律**：门禁**严格串行**（一次一个 Chromium，`finally` 自清 profile）；日志 `tee` 全量落盘（`/tmp/opencode/v4-gate-logs/ian-{1,2}-*/`）；计数**只增不减**、断言**零删除零降级**（本 Feature **发生了保护段第四次取代 —— journey 八步显式取代（新 pin）**；binding **keep 字节中立**；取代均有台账 old→new 留痕、逐行 `assertionsRemoved=0`）。

> **新门禁 2（父 Feature 级）**：`free-input-next` / `law4-input-as-next`（**2 枚 node**，纳入 `EXPECTED_AUDITED_FILES` / `gate-integrity` 下界，改名 / 删除即 FAIL）；`CHROMIUM_GATES === 9` **未动**（只追加先例，零新增 Chromium 门禁文件）。
>
> **18 门禁三态处置（逐条）**：母体 18 门禁 = node 10 + Chromium 8；**叶1 11 行骨架 → 叶2 20 行终态**（`xIianGateReconciliation` 骨架 11 行 + `xIianGateReconciliationLeaf2` 20 行）：**kept 4** / **equivalent-reanchor 12** / **explicit-supersession 4**，**逐行 `assertionsRemoved = 0`**（零删除零降级）；另升级既有门禁 `supersession` 42→49 · `gate-integrity` 23→24 · `law8` 52→60 · `insight` 118→125 · `l0` 248→251 · `l1` 131→132 · `s0-self-driven` 70→81→82 · `recommendation` 72→79。

---

## 5. 体积总账 + 未升档 + 作者行确认

| 产物 | 末轮登记值 | F-35 段变化 | 说明 |
|------|:--:|:--:|------|
| `dist/content.js` | **177,076 B** | **0（零容差，全程未动）** | sha256 `52a82620…` 逐字节不变（输入面全在面板侧，冻结面零触碰） |
| `dist/pick-layer.js` | **34,358 B** | **0（零容差，全程未动）** | sha256 `77796bab…` 逐字节不变 |
| `dist/sidepanel.js` | **591,946 → 598,577 B** | **+6,631 B（≈ 6.48 KiB）** | 逐叶五要素重登记（叶1 正增量 `+7,179` / 叶2 净负 `−548`），每轮均披露前后值 / 日期 / 来源 / 构建命令 / 理由 / 历史保留 + 逐模块 metafile 归因（`ian1Rows` / `ian1R2Rows` / `ian2Rows`） |
| **档位 `tiers`** | **614,400 B** | **未动（本 Feature 段无升档）** | 未跨档位（598,577 < 614,400，余量 **15,823 B**） |
| **绝对上限** `absoluteCeilingBytes` | **675,840 B** | **未动** | `= 614,400 × 1.10` |
| 生效上限 | **628,505 B** | `floor(598,577 × 1.05)` | 容差 **5% 未动**；现余量 **29,928 B**（距生效上限） |
| **`authorConfirmation`** | **`pending-author-line`（⏳ 待作者一行）** | — | **未伪称已确认**；承接 v5.5 两次升档的历史确认事项（见下），作者一行可否决改值 |

**sidepanel 增长链（F-35 段，逐叶实测）**：
`591,946`（F-35 起点）→ **599,125**（叶1 收口，Δ **+7,179** ≈ 7.01 KiB）→ **598,577**（叶2 收口，Δ **−548 B**）= **+6,631 B ≈ 6.48 KiB**。

**逐叶预算结算（诚实登记）**：

| 叶 | 叶预算 | 叶上界 | 实测 | 超预算 | 超上界 | 处置 |
|---|--:|--:|--:|--:|--:|---|
| ian-1 | +2.5~4.5 KB（父 §5.11.1 分列预算） | 4.5 KB（预算上界） | **+7,179 B ≈ 7.01 KiB** | **越（+2,679 B > +4.5 KB）** | 越预算上界（但未跨档位） | **显式诚实登记、不停机**（`ian-1-r2` 登记 + cap `record-only`；不删判据 / 不放宽容差 / 不静默降档） |
| ian-2 | −2.5~−1.0 KB（目标净负） | — | **−548 B** | — | — | **未达目标带**（落严格口径 −1.2~+0.3 KB 内）⇒ **如实登记不伪称**；根因 = DOM/CSS 经 `copyFile` 不进 JS 账本 + 重锚成本 |
| **合计** | +0.0~+3.5 KB（Σ×1.15 预期） | 距档 22,454 B | **+6,631 B ≈ 6.48 KiB** | — | — | 两叶 Σ 在父 `plan.md` §5.11 正常口径内 ⇒ **不触发升档**（未跨档位、未触 EC-IAN-016 三分支） |

### 体积档位（作者行确认事项 —— 显著提示，承接 v5.5 两次升档）

| # | 触发轮 | 档位 | 绝对上限 | 生效上限 | 依据 |
|:-:|--------|------|---------|---------|------|
| 1 | **v5-2 R1（F-32，2026-09-22）** | `512,000 → 563,200` | `→ 619,520` | `floor(547,558×1.05) = 574,935` | F-32 父收口 §5（越档位停机 → 编排器裁决① → 显式升档） |
| 2 | **v55-2 小修轮（F-33，2026-09-23）** | `563,200 → 614,400` | `619,520 → 675,840` | `floor(573,424×1.05) = 602,095` | ADR-V55-011 §4（`ceilTo50KB(563,780) = 614,400 > 563,200`；「谁先越谁登记」） |
| — | **F-34（v5.5.1，2026-09-24）** | **未动** | **未动** | `floor(591,946×1.05) = 621,543` | 未跨档位 ⇒ 无新增升档 |
| — | **F-35（本 Feature，2026-09-26）** | **未动** | **未动** | `floor(598,577×1.05) = 628,505` | 未跨档位、未触 **EC-IAN-016** 三分支 ⇒ **无新增升档**（ian-1 越**叶**预算但未越**档位**） |

> **给作者的一句话（显著提示，累计清单）**：**体积档位已两次升档**（累计 `512,000 → 614,400`、绝对上限 `563,200 → 675,840`）——**均由 v5.5（F-33）及更早轮次触发，本 Feature（F-35）未新增升档**。现行产物 **598,577 B**，距档位余量 **15,823 B**、距绝对上限余量 **77,263 B**、距公式生效上限余量 **29,928 B**。**`authorConfirmation.status` 仍为 `pending-author-line`（⏳ 待作者一行确认 / 否决）** —— 本文件与各叶台账**均未伪称已确认**；作者一行可否决改值。F-35 段的 `pending-author-line` 为**承接历史确认事项**（非本 Feature 新增未闭合义务）。

---

## 6. 取代台账 X-IAN-1~11（两叶逐项终态，显式取代，判据等价重写，零静默删除）

> **来源**：`docs/v4-supersession-ledger.json#law4InplaceRevision`（法四修订）+ `#xIianLedgerFull`（X-IAN-1~7）+ `#xIianLedgerLeaf2`（X-IAN-8~11）+ 叶1 `#xIianLedger`（叶内序号 `L1-SUP-1~7` + `mapsToParent`）；`test:supersession` **49/0**。
> **终态 = 11 / 11 已发生（`superseded`）**；**法四 = X-IAN-1，已发生并落账（`law4InplaceRevision` 五要素齐 + 三锚 + L4-7 半修必红）**。

| 编号 | 取代前（old 逐字，摘要） | 取代后（new 逐字，摘要） | 载体 / 反证 | 状态 |
|:--:|------|------|------|:--:|
| **X-IAN-1** | 法四「输入按需出现：无常驻输入框；ask-user text 输入框只在问题卡内出现，卡内还有「其他…（我来描述）」兜底」 | 法四「**输入即 next**：自由文本输入是流内 next 的一个选项；**流外零输入面**」（**原地修订**，不升格法十） | `law4InplaceRevision`（`old`/`new` 逐字 + `coreSentence` + `reason` + `date` + `anchors[3]` = `:116`/`:225`/`:385`）+ `law4` **L4-7**（半修 / 缺一处 ⇒ 必红；亲注入 `:225` 回退 ⇒ FAIL ⇒ 逐字节还原 ⇒ 复绿） | ✅ 已发生 |
| **X-IAN-2** | `#composer`/`#input`/`#send` 为**保留（兼容读取面）**（`host-registry.ts:144-146` + `density-thresholds.test.ts` 保留面反证） | **入退役面**（DOM 真退役，非 `hidden`）；PRESERVED 移三项 ⇒ `RETIRED_CONTAINER_IDS` 13 → **16**，保留面反证 → 退役面判据 | `host-registry.test.ts` ∧ `law4` L4-1/L4-2（id=`…` 零命中 ∧ 入册 16） | ✅ 已发生 |
| **X-IAN-3** | 「`#composer` **不得**入 `RETIRED_CONTAINER_IDS`」反证（`density-thresholds.test.ts:775`） | **入退役容器册**（本体真退役）：三 id 逐 id 在册，长度 13 → **16**；反证**重锚**为「必须入册」（`expectFailPattern` 可 FAIL） | `density-thresholds.test.ts` ∧ `law4` L4-2（移出 `#input` 入册 ⇒ 必红） | ✅ 已发生 |
| **X-IAN-4** | `<form id="composer" hidden>` + `body` 尾 + 「之后无布局元素」断言（density / sidepanel-view / journey #15c / l0 ③⑪ / insight #I-08b / binding） | **等价重锚**为「**流外零输入面**（三 id 均不在 DOM）」+「流内输入卡存在且可用」；六面逐条 old→new，断言计数只增，注入 `#composer` ⇒ 必红 | `law4` L4-1/L4-3/L4-4 ∧ `density-thresholds.test.ts` ∧ `sidepanel-view.test.ts` ∧ journey / l0 / insight / binding 六面 | ✅ 已发生 |
| **X-IAN-5** | `insight.mjs` `#I-08` `composerGapToBottom` 贴底 / `#I-09` FAB∩composer 几何断言 | 随元素退役**等价重锚** / **显式消解登记**（`composerDissolved:true` + reason，**非静默 null**）；`insight` 118 → **125**（只升不降） | `test/ui/insight.mjs` ∧ `redlineRemap[7]`（T220，`status=landed`，明写「**不在** `zeroDiffFiles`」） | ✅ 已发生 |
| **X-IAN-6** | `requestTurn(` **恰 2**（`op-wiring.test.ts:128-133`） | **重锚恰 1**（唯一生产输入提交点 = `op.turn` 槽；`sidepanel.ts:3899` 实调用点 1 处 + 1 定义）；反证「本地 op 误接 `requestTurn` ⇒ 必红」 | `test/op-wiring.test.ts` `OP_CALLSITE_SET.op.turn.callSites: 1` ∧ `law4` L4-* ∧ `free-input-next` FIN-3 | ✅ 已发生 |
| **X-IAN-7** | `busy-rejected` 草稿回填 `#input`（`turn-arbitration.test.ts` TA-4） | **载体迁移到流内**（`restoreFreeInputDraft` **唯一**实现，经 `askFormNodeOf` 卡内 `.ask-form`；仅当为空 ⇒ 不覆盖 / 卡收起 ⇒ 重展开 / 卡不存在 ⇒ 按需铸造）；`turn-queue.ts` **零 diff** | `turn-arbitration` TA-4 / TA-8（三反证）∧ `free-input-next` FIN-7 ∧ `S0C-12` 真 DOM 双回填 | ✅ 已发生 |
| **X-IAN-8** | 设置 ⇄ chat 草稿保持 `#input`（`sidepanel.ts:1337-1341` / `settings.test.ts:191`） | draft 载体**重锚**到流内 free-input 卡 `#ask-input`（空安全；卡不存在 ⇒ 按需铸造）；流外 `#input` 写点零命中 | `settings.test.ts`（`'in-card draft restored'`）∧ TA-4 ∧ `sidepanel.ts:1360-1371` | ✅ 已发生 |
| **X-IAN-9** | `NEVER_FOLDABLE` 含 `'composer'`（`disclosure.ts:164`） | **退役**：移除 `'composer'`（14 → **13**）；断言**非恒真**（集合不含 composer 且长度恰 13） | `l0-disclosure.test.ts` ∧ `disclosure.ts:154-168` | ✅ 已发生 |
| **X-IAN-10** | 首装引导「在**输入框**输入指令并发送」（`view-model.ts:350`） | **改指**流内 next「自由输入…」项（`ONBOARDING_TEXTS[4]`）；引导不断言已退役元素 id，改判流内入口可达 | `sidepanel-view.test.ts` ∧ `onboarding-deterministic.test.ts` ∧ `view-model.ts:356` | ✅ 已发生 |
| **X-IAN-11** | `binding.mjs` `DIAG_SELECTORS` 含 `composer` + 真实键入 `#input`/`#send` | **重锚到流内输入卡**（`#ask-input`/`#ask-submit`，**路径不删**）；**保护段 keep 字节中立**（sha `be9ad0e9…` / `startByte 107780` 双绿） | `test/ui/binding.mjs` ∧ `binding-wiring.test.ts` ∧ `test:supersession` 保护段专条 | ✅ 已发生 |

> **叶1 内部序号（不占父编号）**：`xIianLedger` 7 行 = `L1-SUP-1~7`（3 `superseded`（推荐面集 A 8→9 / 零死端 floor / 草稿回填双载体）+ 4 `no-supersession`（`op.turn` 槽 / 特权 op / 载体零新增 / SW 队列）+ `mapsToParent` 消解与父 §12 的编号冲突）；叶2 review R1 **BLOCK-02** 即为此编号语义冲突的修复源（修复轮改名 + `mapsToParent` + `xIianLedgerFull` 补齐父 §12）。

---

## 7. 过程中抓到的真问题（本流程的价值证明，不粉饰）

1. **ian-1 越叶预算（+7,179 B > 预算上界 +4.5 KB）**：父 §5.11.1 分列预算按「新 provider + 卡内输入 + R6 迁移」估 +2.5~4.5 KB，实测整叶 **+7,179 B ≈ 7.01 KiB**（逐模块 `ian1Rows` Σ + glue 0）；**如实登记、不停机、不删判据、不放宽容差**（`ian-1-r2` 登记 + cap `record-only`）；档位未跨（父 spec EC-IAN-016 三档均「否」）。
2. **ian-2 净负未达目标带（−548 B vs 目标 −2.5~−1.0 KB）**：删面负增量被「卡内输入 / 重锚成本 + DOM/CSS 经 `copyFile` 不进 JS 账本」抵消；落在严格口径 −1.2~+0.3 KB 内 ⇒ **如实登记不伪称**（build §5 / validate V10）。
3. **review 2 BLOCK（ian-2 review R1）：法四台账与 X-IAN 编号语义**——**BLOCK-01** 法四原地修订的 old→new 逐字台账缺失 + 「半修即红」**无判据载体**（全仓无门禁读 `v4-chat/spec.md`）；**BLOCK-02** `xIianLedger`（叶1）以 `X-IAN-1~7` 登记了与父 §12 **完全不同**的语义 ⇒ 「法四」等父编号**被错误占用 / 缺位**，叶2 `TASK-IAN-215` 验收仅完成 X-IAN-8~11（4/11）。修复轮 `9ffbea8` **未触碰 `src/**` / 冻结面 / `zeroDiffFiles` / 体积**（只改 `docs/*.json` + `test/**`）：`law4InplaceRevision` 五要素 + `law4` L4-7 三处一致机核 + 叶1 改名 `L1-SUP-1~7` + `mapsToParent` + `xIianLedgerFull` 逐条；R2 **亲注入闭环**（半修 `:225` ⇒ 必红 ⇒ 逐字节还原；缺条 / ID 冲突 / 空字段逐项必红）。
4. **`/tmp` 被 Chromium profile 撑爆致推送失败（环境 / 运维真问题）**：门禁与自研脚本长期在 `/tmp` 落盘 Chromium profile / 日志快照，terabyte 级残留曾致 `git push` 因本地环境不可写而失败；处置 = 清理 `/tmp` 后再执行 commit / push（本轮 push 前置清理，一次性通过）；**登记为环境性运维问题**（非产品缺陷 / 非规范偏差）。
5. **binding / journey / recommendation flake 家族（KL-N-10）**：① Chromium `s0-self-driven` ⑦A 首轮 **81/1**（headless 探测相位未定，`rule=null`）⇒ 隔离复跑 ×2 = **82/0**（判据本体 S0C-12 首轮即全绿）；② `test/binding.mjs` 串行批次 4 次红（失败项互异，诊断 `CDP socket not open (readyState=3)`；机器并发高载）——**保护段字节级**经 `test:supersession` 双绿（sha `be9ad0e9…` + `startByte 107780` + 3 反证），build / review 均实测 **192 PASS**；③ `recommendation` ④ 首跑 78/1（`empty` 夹具命中 floor ⇒ `rule=null`）⇒ 隔离复跑 ×3 = **79/0**。**均如实登记、不伪称首跑绿；不动任何判据**（见 §9 移交项 N-02 / N-03 / N-05）。
6. **保护段第四次取代的设计权衡（journey 八步）**：`#15c` 语义（`#composer` 贴底 / hidden）与「流外零输入面」**互斥** ⇒ journey 段必须显式取代（新 pin `7b309258…`）而非保段；`supersessionChain` 4 节相邻连续 + `countEvidence` 只增（171）；binding 段零读面 ⇒ **keep 字节中立**（`startByte` 等长补偿）。取代登记完整（`redlineRemap` 7→8 + 新叶段 `R2-W6` 87 行逐字 + `modifiedRanges` +19 段）。

---

## 8. deferred / 已知限制清单（逐条，如实登记，不冒充已修）

| # | 项 | 来源 | 状态 |
|:-:|----|------|:--:|
| 1 | `plan.md` §5 文件影响分析漏列 4 个连带改动文件（`next-registry/ops.ts` / `stream-model.ts` / `chat-state.ts` / `stream-plaintext.ts`） | 叶1 review **I-01** → **N-01** | deferred（父收口登记；后续叶 plan 列出或交叉引用） |
| 2 | `docs/v4-density-baseline.json` 注记字段（`effectiveCeilingRule` / `directionalAlert`）停留旧轮次，与 `registeredBaselineBytes` 并存易误读 | 叶1 review **I-02** → **N-02** | deferred（后续轮刷新或显式标注「历史链」） |
| 3 | `ADR-IAN-001 §①` floor 措辞过宽（`{'empty','safety'}` vs 落地仅 `empty`；`safety` 保 fail-closed） | 叶1 review **O-01** → **N-03** | deferred（规范侧收窄措辞 + 登记 `safety` 语义；落地口径判为正当） |
| 4 | `S0″-A` node 面「旧入口跑通一轮」为**接线判据**（非 DOM 真回合；真回合由 Chromium S0C-12 承载） | 叶1 review **O-02** → **N-04** | deferred（已显式登记，禁脚本绿冒充链路可判） |
| 5 | `recommendation` ④ `empty` 夹具依赖站点 / 探测实时状态（首跑 flake） | 叶1 validate **V-01** → **N-05** | deferred（门禁 owner；建议 ④ 状态无关化或纳入 floor 卡可接受读数） |
| 6 | `s0-self-driven` ⑦A headless 探测相位 flake | 叶2 validate **N-1** → **N-02** | deferred（KL-N-10 家族；隔离复跑绿） |
| 7 | `test/binding` CDP 早死环境红 | 叶2 validate **N-2** → **N-03** | deferred（建议空闲机复跑确认；保护段字节级双绿） |
| 8 | 人工面 M1~M5 未执行 | 父 spec §9.4 | ⏳（见 §9.2；headless 不可合成，不冒充 PASS） |
| 9 | `authorConfirmation.status = pending-author-line` | 承接 v5.5 两次升档 | 未闭合义务（作者一行可否决改值） |
| 10 | `F-29`（A2A 候选）未立项未排期 | ROADMAP 未来方向候选 | 保持原样不动（本轮区段字节未动） |
| 11 | 外部竞品调研未执行 | 父 spec `O-IAN-010` 裁决「不需要」 | 明确 deferred（非缺陷） |

---

## 9. 两叶移交项汇总（owner = 父收口全清单 + 人工面清单 ⏳）

### 9.1 owner = 父收口（登记 / 口径 / 环境类，全清单）

| 叶 | N 项 | 内容 | 处置 |
|---|:--:|------|------|
| 叶1 | **N-01** | plan §5 漏列 4 连带文件 | deferred（§8-1） |
| 叶1 | **N-02** | `v4-density-baseline.json` 注记字段陈旧 | deferred（§8-2） |
| 叶1 | **N-03** | `ADR-IAN-001` floor 措辞 | deferred（§8-3） |
| 叶1 | **N-04** | `S0″-A` node 接线判据 | deferred（§8-4） |
| 叶1 | **N-05** | `recommendation` ④ 首跑 flake | deferred（§8-5；门禁 owner） |
| 叶2 | **N-02** | `s0-self-driven` ⑦A 相位 flake | deferred（§8-6） |
| 叶2 | **N-03** | `test:binding` CDP 环境红 | deferred（§8-7；建议空闲机复跑） |

> **本叶已闭环（非 N）**：叶1 review **I-03**（在飞终端可用 / 空提交非静默）→ validate **V3** 行为级 **16/16** 闭环；叶2 review R1 **BLOCK-01/02** + **I-01~I-04** → 修复轮 `9ffbea8` + R2 复核闭环；叶2 **I-R2-01**（counts 滞后）→ validate **V11** 前移 48→49 / 1441→1443 闭环。

### 9.2 人工面清单（全部 `⏳ 未执行`，不冒充 PASS）

| # | 人工面 | 说明 | 状态 |
|:-:|--------|------|:--:|
| 1 | **M1 · 「自由输入…」可发现性**（叶1） | 真机上作者是否一眼看到并明白它即自由输入入口 | ⏳ 未执行 |
| 2 | **M2 · 时隐时现困扰是否消失**（叶1） | 「输入框时隐时现」问题在真机上的体感是否消失 | ⏳ 未执行 |
| 3 | **M3 · 卡内输入真机键盘手感 / 焦点流转观感**（叶2） | Tab / Shift+Tab / Esc 的真机体验与焦点流转 | ⏳ 未执行 |
| 4 | **M4 · 读屏可用性**（叶2） | 卡内输入 + `#send-reason` 状态行的可朗读性 | ⏳ 未执行 |
| 5 | **M5 · 排队体感**（叶1） | 在飞时输入的反馈（`queued` / `busy-rejected`）是否足够明确 | ⏳ 未执行 |

> **注**：headless 不可合成（真实手势 / 键盘手感 / 读屏 / 人工观感）；本轮为**纯文档 / 状态收口（零代码 / 测试改动）**，未跑门禁 / 构建 / Chromium。人工面逐项标注 `⏳`，**不得冒充 PASS**（`IAN-P-003` / `IAN-P-007`）。v5 / v5.5 / v5.5.1 人工面清单**零改写、并列不覆盖**。

---

## 10. 建议的下一步

**A. 真机验收（最高优先，D 级亲验）**
1. **真机验收 S0″（本 Feature 的核心验收锚）**：
   - **终态**：新面板（无 `#composer`）**全链只走流内面** —— 推荐卡末尾见「自由输入…」⇒ 点开 ⇒ 卡内输入获焦 ⇒ 键入 ⇒ 提交成回合 ⇒ 流内 `user` 行逐字；四处兜底（「其他…（我来描述）」/ `op.describe` 无值相 / L1 面板 / `describe` 空值）**均只展开卡内输入，不再出现流外输入框**；
   - **中间态保护**（如按序回放）：旧 `#composer` 与新流内入口**均可提交**、双回填**互不覆盖**；
   - **排队**：在飞提交 ⇒ SW 仲裁（`queued` ⇒ 「已排队」可读行 / `busy-rejected` ⇒ 草稿回填流内、不覆盖新输入）。

**B. 作者一行决策（阻塞性最低、但必须由作者给出）**
2. **体积档位历史确认 / 否决**（承接 v5.5）：档位 **614,400**（累计 `512,000 → 614,400`）/ 绝对上限 **675,840**（累计 `563,200 → 675,840`）/ 生效上限 **628,505**（现行产物 598,577 B）；本 Feature **未新增升档**（ian-1 越叶预算但未越档位）。`authorConfirmation.status` 仍 `pending-author-line` —— **作者可一行否决改值**；确认后该义务才算真正闭合。
3. **合 main / 发布时机由作者决定**：v1（F-14）/ v2（F-27）/ v3（F-28）/ v4（F-30）/ v4.5（F-31）/ v5（F-32）/ v5.5（F-33）/ v5.5.1（F-34）/ **v0.11.2（F-35）** 均在 `feature/web-cli-plugin`，**未合 main、未发布**（`main` = `2ddc922` 未动）。ROADMAP 已按 **v0.11.2 patch 主题**登记（`输入即 next：废除流外输入框`），文档版本 `1.31.0 → 1.32.0`。

**C. 后续候选（非阻塞）**
4. **F-29（A2A 候选）**：未立项未排期，本轮一字未动；如要推进需作者立项。
5. **v5.6 / 后续候选**（若作者提出）：叶1 N-01~N-05 / 叶2 N-02~N-03 的登记口径与 flake 治理 · 人工面真机走查（M1~M5）· 环境性 flake 家族（KL-N-10）系统性治理。

---

## 11. 主题达成自评（对照作者裁决「废除流外独立输入框」）

> **口径**：主题 = 作者裁决「**废除流外独立输入框**」+ 编排指示范畴 —— **作者明确裁决「不打破 all-in-chat / next 主线」**（即：自由输入仍必须是 **next 流内闭环** 的一个选项，而非退回流外输入框）。本 Feature 的题眼 = 把「流外独立输入框」（`#composer`，唯一自由文本→回合面且住在流外）**真退役**，同时**不丢失自由文本输入能力**——把它变成**流内 next 的一个终端选项**。

| 维度（主题） | 达成度 | 证据 |
|---|---|---|
| **法四修订「输入即 next；流外零输入面」** | ✅ **达成且机核** | `law4InplaceRevision`（X-IAN-1）old→new **逐字** + 三锚 `:116`/`:225`/`:385` 三处一致 + `law4` **L4-7 半修必红**（亲注入 `:225` 回退 ⇒ FAIL ⇒ 逐字节还原 ⇒ 复绿）；**原地修订、不升格法十**（O-IAN-007 裁决兑现） |
| **`#composer` 真退役（元素不存在 ≠ hidden）** | ✅ **达成且双向反证** | `index.html` 三 id `id="…"` **零命中**（63 个 id，`html_sha256=ba9f3248…`）；`RETIRED_CONTAINER_IDS` **16**（三 id 全入）/ `NEVER_FOLDABLE` **13**（无 composer）；反向注入 `<form id=composer hidden>` **必红**（node 独立复刻检出 + `law4` L4-1 FAIL）；去注释全 `src` 扫 `composer` = **2 处**均为登记册声明（非输入面） |
| **四处兜底收敛卡内** | ✅ **达成** | 调用链 `revealAskFallback → ensureTextAskCard + l0?.revealFallback() → setAskFallbackOpen(doc,true)`（**卡内唯一**）；四处入口（`sidepanel.ts:225/1544/2346/3904`）全收敛，**停止附带 reveal 流外面**；`S0C-12` 真面板绿 |
| **自由输入 provider 恒最末终端 + `op.turn` 槽提交** | ✅ **达成且唯一通道** | provider `free-input`（`when` 恒真）+ `recommendNextStep` 单点注入恒最末（`.next-terminal` ≠ `.next-chip`）+ 零死端 floor；提交**唯一经 `op.turn` 槽**（`submitFreeInput` 体无 `requestTurn(`）；`ACT_TO_OP` 仍恰 **6** ∧ 集 A **8→9**（`free-input` ∉ `ACT_TO_OP`）；注入「直连 `requestTurn(`」⇒ **FIN-3 / op-wiring 必红** |
| **`requestTurn(` 恰 1（终态）** | ✅ **达成且计数承重** | 叶1 中间态 **恰 2**（旧 `#composer` + `op.turn` 槽）→ 叶2 终态 **恰 1**（`sidepanel.ts:3899`，唯一生产输入提交点 = `op.turn` 槽）；`op-wiring` `OP_CALLSITE_SET.op.turn.callSites = 1`；反证「本地 op 误接 `requestTurn` ⇒ 必红」 |
| **R6 排队迁移流内（语义不变）** | ✅ **达成且行为级** | `turn-queue.ts` **零 diff**（`TURN_QUEUE_MAX=1` / 三路径 / 溢出明确拒绝逐字不变）；在飞**终端不硬禁用**（非 `.next-chip`，走 SW 仲裁）；`busy-rejected` 草稿回填**迁流内**（`restoreFreeInputDraft` 唯一，仅当为空 / 卡收起重展开 / 卡不存在铸造；流外 `#input` 写点零命中）；`ian1-behavior.mjs` **16/16** + TA-4/TA-8 |
| **自由输入 = 流内 next 的一个选项（不破 all-in-chat/next）** | ✅ **达成且零新增载体** | `KIND_SET` **40 逐字** ∧ `CARD_TAG_LABELS` **12** ∧ `REGISTERED_STRUCTURAL_HOSTS === []`；卡内输入**复用 `askuser` kind 第二语义分支**（独立 `requestId='free-input'`，与 `ref-describe` 互不干扰；退化注入 ⇒ **FIN-0 + FIN-8 双红**）；零新增常驻输入框 / 零新增 kind / 零新增宿主 |
| **安全边界（法八 + 手输可判 + 特权恒 gesture + 冻结面）** | ✅ **达成且四项亲核** | 法八四面零明文（`law8` **60/0** 含 ⑩；卡固化**不回显**用户文本）；手输 `driver='manual'` ∉ 11 声明驱动者 id（两值可判，同值注入必红）；特权 op 恒 `gesture`（`op.turn` 仍 `auto`；提交路径不触达）；`content.js` / `pick-layer.js` **全程逐字节未动**；`turn-queue.ts` / `service-worker.ts` / `web-cli-base/**` / `manifest.json` 零 diff |
| **S0″ 双面机器化（中间态 + 终态）** | ✅ **达成** | **S0″-A 中间态**：node `S0PP-A` 三用例（真管线回合 + 反证族 ×7 + 真源切片）+ Chromium `S0C-12` **81/0**（双入口各跑通一轮 + 双回填互不覆盖 + 样本单源）；**S0″-B 终态**：node 独立复刻（三 id 零命中 + 注入检出）+ Chromium **82/0**；样本单源 `s0-chain.mjs`（R2 零新增文件） |
| **剩余面（人工观感）** | ⏳ **待真机** | 见 §9.2（headless 不可合成 M1~M5）；**不冒充 PASS** |

**达成结论**：作者裁决「**废除流外独立输入框**」+「**不打破 all-in-chat / next 主线**」**全部达成且可 FAIL 反证**（法四半修必红 / 注入 `#composer` 必红 / 注入 `requestTurn(` 直连必红 / `requestId` 退化必红 / 全部逐字节还原）；剩**人工观感**未执行，**不冒充 PASS**。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（v55-f-input-as-next 父收口 R1，三轮合一）：两叶 validated 汇总 + 主题达成结论（法四修订「输入即 next；流外零输入面」/ `#composer` 真退役（元素不存在非 hidden）/ 四处兜底收敛卡内 / 自由输入 provider 恒最末终端 + `op.turn` 槽提交 / `requestTurn(` 恰 1 / R6 排队迁移流内）+ 数字总账（npm 1395→1443 · F-35 段 +48 · sidepanel 591,946→598,577 · 两叶 Σ +6,631 · 新门禁 2 + 18 门禁三态处置 + 既有门禁升级 + S0″ 双面 + journey 八步取代（新 pin `7b309258…`）/ binding keep）+ **未升档（档 614,400 / 生效 628,505 / 绝对 675,840）+ `pending-author-line` 承接 v5.5 两次升档** + X-IAN-1~11 两叶终态（**11/11 已发生**，法四 X-IAN-1 已落账）+ 过程真问题 6 条（含 `/tmp` 被 Chromium profile 撑爆致推送失败 / ian-1 越叶预算 / ian-2 净负未达目标带 / review 2 BLOCK 台账编号冲突 / flake 家族 / 保护段第四次取代）+ deferred/已知限制 11 条 + 两叶移交项汇总（owner=父收口 全清单 + 人工面清单 ⏳ M1~M5）+ 建议下一步 + 主题达成自评 | 2026-09-26 | SDDU Build Agent |
