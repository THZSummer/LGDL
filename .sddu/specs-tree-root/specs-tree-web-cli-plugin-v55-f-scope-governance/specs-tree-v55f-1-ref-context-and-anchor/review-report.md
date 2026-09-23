# 审查报告：specs-tree-v55f-1-ref-context-and-anchor

> **文档定位**: SDDU 审查报告 — 逐项记录自主审查的执行结果，作为 validate 阶段的输入
> **审查策略**: `review.md`（C1~C37 审查清单及四维度指引）
> **前置依赖**: `review.md`、本叶 `spec.md` v1.0（承载父 FR ≈62 条切片 / 15 NFR 面 / 20 EC 面 / 12 AC 锚点）、本叶 `plan.md` v1.0、父 `ADR-SGO-001~008`、本叶 `build.md` v2.0（R1+R2 全叶收口）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-24
> **审查轮次**: **R1**（全叶 29/29 任务完成后的首轮审查）
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-24
> **更新说明**: 初始创建（37 Cx 逐项；0 BLOCK / 2 I / 6 O；法九真源注入 + 锚定删闸注入 + base 零 diff + S0′ 双面 + npm/Chromium 亲跑；结论 ✅ 通过）

---

## 0. 审查范围与执行

| 项 | 值 |
|---|---|
| Feature | `specs-tree-v55f-1-ref-context-and-anchor`（V5.5F-1 范围底座 / 首叶；父 `specs-tree-web-cli-plugin-v55-f-scope-governance`） |
| 分支 / HEAD | `feature/web-cli-plugin` / `2e3f141`（R1 `68848af` + R2 `2e3f141`，**29/29 completed**，`state.phase = builded`） |
| 被审成品 | `dist/sidepanel.js` = **585,732 B**（A 列，实测 `stat -c %s`，与 `SIDEPANEL_BASELINE_BYTES` 同源）· `dist/background.js` = **1,627,424 B**（B 列，不计账）· `dist/content.js` **177,076 B** / sha `52a82620…` · `dist/pick-layer.js` **34,358 B** / sha `77796bab…`（逐字节冻结） |
| 亲跑 node 门禁 | `npm test` **1375 pass / 0 fail** · `law9-scope-reading` **12/0** · `ref-context-in-turn` **9/0** · `dom-ref-anchor` **7/0** · `s0-self-driven-chain` **24/0** · `gate-integrity` **20/0** · `op-wiring` **14/0** · `insight-no-escalation` **20/0** · `supersession` **39/0** · `l1-ref-validity` **21/0** |
| 亲跑 Chromium 门禁（串行） | `s0-self-driven` **65/0**（含 `S0P-C1~C5`）· `law8` **46/0**（36 段零降级）· `l1` **131/0** · `page-input` **125/0** · `ask-auth` **78/0**（偏差 5 复跑复核） |
| 亲跑构建 / 体积 | `npm run build` ⇒ `sidepanel.js` **585,732** · `background.js` **1,627,424** · `content.js` **177,076**（sha `52a826205553b46a896ccad54225d63ba62f5f7fe7c969a9bc2e655448d5b5f6`）· `pick-layer.js` **34,358**（sha `77796babd9c93893542195424d160e0877d8acca4142f8faf2232e217fbd575e`）；`build-meta.json` 输出 `inputs` 计数 = **94** |
| **亲注入复核（`.sddu` 外零残留）** | ① 真源 `ref-scope.ts` 把 `no-ref` 分支**改判 `in-scope`** ⇒ `law9` **4 红**（L9-2 / L9-8 / L9-114① / L9-114③）· `s0-self-driven-chain` **5 红**（含 S0P-7）⇒ `git checkout` 还原 ⇒ sha `9109b539…` **前后逐字节相同**、双双复绿。② 删 `dom-anchor.ts` **live 单节点闸**（多命中按首元素）⇒ `dom-ref-anchor` **2 红**（DRA-2 单节点闸 / DRA-5 交基线 executor）⇒ 还原 ⇒ sha `f1363fed…` 前后相同、复绿 7/0。 |
| 冻结面 / 不动面实测 | `git diff 68848af..2e3f141 -- packages/web-cli-base packages/web-cli-plugin/src/security packages/web-cli-plugin/src/content packages/web-cli-plugin/manifest.json` = **零行**；判定链哈希 pin（`policy.ts` / `auto-authorize.ts`）亲跑绿；`KIND_SET` **40 逐字**（`refs` 非 kind）；`zeroDiffFiles` **9 项**；12 kind **零宿主** |
| 亲核静态计数 | `requestTurn(` **恰 2**（`sidepanel.ts:3602` composer / `:3629` `bindPanelOps.turn` 槽）· 唯一构建点 `turnRefsOf(` 在 `requestTurn` 内**恰 1**（`:335`）· `maybeRecommend` 1/7 · `nextAfterSettle` 1/10 |
| 审查方式 | 静态分析为主 + 编排任务书点名的「亲注入 / 亲跑」7 组复核；所有注入**逐字节还原**，`git status` 终态干净 |

> **审查判定**：**0 BLOCK**；2 个 I（均为**台账 / 报告的如实性订正**，非代码 / 门禁缺陷）；6 个 O（已登记偏差 / 既有口径 / 设计取舍）。结论 = ✅ **通过**，可进入 validate。

---

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查项总数 | **37** |
| 通过（✅） | **35** |
| 警告（⚠️） | **2**（C12 / C29，对应 I-01 / I-02） |
| 失败（❌） | **0** |
| 阻塞问题 | **0** |
| 改进项（I） | **2**（I-01 / I-02） |
| 观察项（O） | **6**（O-01~O-06） |

---

## 2. 逐项审查结果（C1~C37）

| # | 审查对象 | 审查基准 | 评估 | 发现 | 严重程度 |
|---|---------|---------|:--:|------|:--:|
| C1 | `l1/ref-scope.ts` 四职责切分与可读性 | plan §2.1 / ADR-SGO-002 | ✅ | 投影（`turnRefsOf`）/ 读数（`SCOPE_READINGS`+`scopeReading`）/ 写闸（`scopeWriteGate`）/ 留痕（`SCOPE_TRACE_FIELDS`+`scopeReadingTrace`）各单职责；掩码口径与「页面文本可入上下文」注释写死；`scopeReading` 显式 `no-ref` 分支前置（:151） | 低 |
| C2 | `tools/dom-anchor.ts` 解析链纯函数 / 可读错误 + 指引 | ADR-SGO-003 §2 | ✅ | `resolveRefAnchor` 逐级 fail-closed（:119~146）；直接调用抽核 EC-SGO-001/002/003 与单节点通过，文案均含可读原因 + 可达 next；违反面绝不回退 `--selector`、绝不按首元素 | 低 |
| C3 | `ref-observe.ts` 单实现（无第二副本） | FR-SGO-033 | ✅ | `observeIdentity` 生产真源**恰一处**；SW（`service-worker.ts` 已删除私有副本，改同源 import）与 `tools/dom-anchor.ts` 双向 import；gate DRA-6 计数判据承重 | 低 |
| C4 | `sidepanel.ts` confirm 面范围闸接线 | FR-SGO-025/027/037 | ✅ | `confirm-request` 分支：仅 `dom set-text` 且**带目标**才进闸；`out-of-scope-unauthorized` ⇒ `confirm-response allow:false` + `confirm-resolved` + 可读理由 notice + 范围留痕行 + `return`；`in-scope`/`no-ref` 走既有 confirm 路径逐字不变（EC-SGO-008 不阻断） | 低 |
| C5 | 硬编码值单源（锚属性 / 子命令 / 读数词 / 留痕字段名） | N-SGO-028 | ✅ | `SCOPE_READINGS` 四值 + `scopeReading` **唯一声明**（`src/**` 扫描第二声明 ⇒ FAIL）；`REF_MARK_ATTR` / `REF_ANCHOR_SUBCOMMAND` / `anchorSelectorFor` / `SCOPE_TRACE_FIELDS` 各单源 | 低 |
| C6 | FR-SGO-001~006 主流程零扩张 | spec §4 / N-SGO-014 | ✅ | `requestTurn(` **恰 2**；`maybeRecommend` 1 定义 / 7 调用点；`nextAfterSettle` 1/10；`op-wiring`（含 `OP-W ⑨`）**14/0** 亲跑绿 | 低 |
| C7 | FR-SGO-010 / 011 type-only 7 字段 + `KIND_SET` 40 | spec §4 / N-SGO-009 | ✅ | `ChatRefFact` 7 字段（`refNum`/`refId`/`selector`/`refMark`/`textDigest`/`refState:'valid'`/`nodeCount?`）单声明；`KIND_SET` 抽取 = **40**；`refs` 不在其中；`ref-context-in-turn` **9/0** | 低 |
| C8 | FR-SGO-012 口径写死 + 凭据掩码 | spec §2.2 / EC-SGO-019 | ✅ | `maskRefDigest` = base `maskTextPayload` + 裸词元兜底（`CREDENTIAL_SHAPE`）；`turnRefsOf` 投影处**单点**掩码；`law8` **46/0**（⑧ 引用注入面零明文 + 掩码单点 + 反证） | 低 |
| C9 | FR-SGO-013 / 014 唯一构建点 + 两入口同口径 | spec §4 | ✅ | `requestTurn` 内 `turnRefsOf(` 恰 1（:335），`makeMessage('chat'` 恰 1；两调用点共用；`bindPanelOps.turn` 转发同一函数；注入第二构建点 ⇒ 必红（门禁内实跑） | 低 |
| C10 | FR-SGO-015 / 016 / 017 系统段基座 + 追加段 | spec §4 / N-SGO-029 | ✅ | `service-worker.ts:974` `system: () => SYSTEM_PROMPT + refContextSegment(refs)`；`refContextSegment([]) === ''` 直测成立 ⇒ 零引用 `system === SYSTEM_PROMPT` 逐字；`chat-runner.ts` 零改 | 低 |
| C11 | FR-SGO-018 / 019 只取 valid ∧ SW 唯一来源 | spec §4 / N-SGO-008 | ✅ | `isActiveRef` = `verdict==='valid' ∧ !retired`（单源谓词，只读不重判）；SW `case 'chat'` 只从 `message.refs` 读 + `validateRefPayload` 逐项剔除；SW 无 `ref-store` import（通道扫描承重） | 低 |
| C12 | FR-SGO-100~107 X-SGO-1~7 台账如实性 + `modifiedRanges` | spec §4 / FR-SGO-107 | ⚠️ | **rows 与 prose 计数口径不一致**：`xSgoLedger.rows` 实际 **4 条 `superseded`（X-SGO-1/2/3/5）+ 3 条 `no-supersession`（4/6/7）**（与 spec §4 / plan §2.4「1/2/3/5 已发生 + 7 未发生」一致），但台账 `note`、`build.md` §1/§2、`state.json` phaseHistory 均写「**3 已发生 / 4 未发生**」。台账 rows / 门禁 / `modifiedRanges`（12 项逐项）本身正确 ⇒ 仅**文字计数**失实。详见 **I-01** | 中 |
| C13 | FR-SGO-020~028 读数单源 + 四值 + 越界拦 | spec §4 / N-SGO-028 | ✅ | `SCOPE_READINGS`（4 值）单源 + `scopeReading` 唯一判定；`law9` **12/0**；`src/**` 扫描仅 `ref-scope.ts` 持有字面量（`sidepanel.ts` 命中仅为注释） | 低 |
| C14 | FR-SGO-030~038 `--ref` 锚定安全 | spec §4 / N-SGO-027 | ✅ | 仅 `set-text`（EC-SGO-017）/ 与 `--selector` 互斥（EC-SGO-015）/ 词法 / 越界（016）/ 失效（004）/ 合成锚 / live 单节点闸 / 交基线 executor；`risk` / `subcommandRisks` / 子命令集合逐字段 spread 自 base，模块内**零** `risk:` 字面量；`dom-ref-anchor` **7/0** | 低 |
| C15 | FR-SGO-070~077 法九门禁 | spec §4 | ✅ | 四必判项 + 三段控制（`ok`/`violated`/`n/a` 互异、`n/a` 单独计数）+ 真源切片（读生产模块、不读 `SYSTEM_PROMPT`）；**亲注入真源改判 `in-scope` ⇒ 4 红**（含 L9-8 / L9-114① 逐字节还原）；`CHROMIUM_GATES === 9` 由 `gate-integrity` 20/0 机核 | 低 |
| C16 | FR-SGO-080 / 083 / 084 留痕字段名 + 零值 | spec §4 / R-SGO-917 | ✅ | `scope.reading=<enum> \| scope.authorized=<actor>` 机器格式正则承重；`law8` ⑤ / `s0PProblems` S0P-6 双向判（含注入用户内容值 ⇒ 必红）；驱动者留痕三要素逐字未动 | 低 |
| C17 | FR-SGO-090~094 S0′ 全链 + 改写处数 ≤ 引用数 + 双向反证 | spec §4 / AC-SGO-013/014 | ✅ | node `S0P-1~8` **24/0** + Chromium `S0P-C1~C5` **65/0**；直接调用 `s0pProblems` 抽核：`writeCount 2 > refCount 1` ⇒ S0P-4 红、`reportedWrites 2 ≠ 1` ⇒ S0P-8 红、`noInjectionReading='in-scope'` ⇒ S0P-7 红（判据非恒真）；真源改判注入 ⇒ S0P-7 红 | 低 |
| C18 | FR-SGO-110~116 断言只增 / 受审集合 / 串行 | spec §4 / N-SGO-015/017 | ✅ | `gate-integrity` **20/0**（`V55F1_NODE_GATE_FILES` 3 枚在册 ∧ 目录扫描 ∧ 下界声明三命中；`CHROMIUM_GATES.length === 9`）；Chromium 门禁逐个人工串行亲跑 | 低 |
| C19 | FR-SGO-120~125 分列预算 + 五要素 + EC-SGO-022 二态 | spec §4 | ✅ | 实测 `sidepanel.js` **585,732** == 登记基线；`background.js` 1,627,424（B 列不计账）；ceiling = `floor(585,732×1.05)` = **615,018**；档位 614,400 / 绝对上限 675,840 未跨；`authorConfirmation` = `pending-author-line`（未伪称已确认） | 低 |
| C20 | NFR-SGO-001 判定公式唯一 | spec §5 | ✅ | `size-budget` / `size-ruling-vol3` 重 pin（615,018 / 615,019 必 FAIL）亲跑绿；`cap` 保持 `record-only`；容差 5% 未动 | 低 |
| C21 | NFR-SGO-004 法八四面零降级 | spec §5 | ✅ | `law8` **46/0**（⑧ 段 10 条新增；36 段断言零删减）；越界写请求不回显 / 留痕零值 / 凭据掩码单点 | 低 |
| C22 | NFR-SGO-005~014 冻结面 / 零新载体 / fail-closed | spec §5 / 父 §13 | ✅ | 三冻结面 sha 双锚（亲跑）；base 零 diff；`KIND_SET` 40；12 kind 零宿主（`supersession` 红线⑨）；读数单源；零每回合页面探测（live 闸仅每写一次，口径登记 R-SGO-913） | 低 |
| C23 | EC-SGO-001~004 / 008 / 015~020 逐条有实现 + 反证 | spec §6 | ✅ | `ANCHOR_ERRORS` 七条 + `SCOPE_WRITE_BLOCK_TEXT` 逐条可读；直接抽核 EC-SGO-001/002/003；`law9` L9-4/5/6 覆盖越界二态与写闸；EC-SGO-008 由 L9-6 显式（`no-ref` 不得阻断） | 低 |
| C24 | ADR-SGO-001 引用事实进回合 | ADR-SGO-001 §1~§9 | ✅ | type-only 单声明 / 唯一构建点 / SW 唯一来源 / type-only 零运行时字节（SG-SGO-01 探针 esbuild Δ=0 B 五要素登记）逐条落地 | 低 |
| C25 | ADR-SGO-002 读数单源 + 双轨 | ADR-SGO-002 §1~§7 | ✅ | 判据面 = `scopeReading`（不读 `SYSTEM_PROMPT`，门禁机核）；引导面 = `REF_SCOPE_GUIDANCE`（B 轨，不参与判据）；读数模块不被 SW import（读数单列） | 低 |
| C26 | ADR-SGO-003 plugin 侧包装 + base 零 diff | ADR-SGO-003 §1~§9 | ✅ | `browser-tools.ts` 改用 `wrapDomEntryForAnchor(createDomToolEntry(env), env)`；`git diff packages/web-cli-base` **零行**亲跑；`insight-no-escalation` 20/0 | 低 |
| C27 | ADR-SGO-006 S0′ 双面机器化 | ADR-SGO-006 §1~§7 | ✅ | 样本单源 = `test/ui/fixtures/s0-chain.mjs`（node 与 Chromium 共用同一份，无第二样本）；Chromium 面**只加断言不加文件**（`CHROMIUM_GATES === 9`）；人工面 M1/M4 标 `⏳ 未执行`（不冒充 PASS） | 低 |
| C28 | ADR-SGO-007 分列预算 | ADR-SGO-007 | ✅ | A 列 = `l1/ref-scope.ts`(NEW +2,572) + `sidepanel.ts`(+1,765) + `l1/ref-store.ts`(+149) + `../web-cli-base/dist/sensitive.js`(+2,584) + glue 39 = **+7,109**；B 列全部落 `background.js`（本产物零字节）；预算 6.0~9.0 KB 上界 10.35 KB 未越 | 低 |
| C29 | plan §5 文件影响对齐 + NOOP 真零 diff | plan §5.1~§5.3 | ⚠️ | NOOP 清单实测成立（base / content / manifest / `chat-runner.ts` / `policy.ts` / `auto-authorize.ts` 零 diff）；但 `build.md` §1 的**文件统计与复杂度分布与实测不符**：提交实测 **33 文件 = 新增 8 + 修改 25**（build 写「新增 9 / 修改 21」），R2 复杂度实测 **M×11 / L×3**（build 写「M×13 / L×3」）。代码与门禁本身无偏差。详见 **I-02** | 低 |
| C30 | 红线结构（三冻结面 / base / 判定链 / 特权手势 / 12 kind） | 父 §13 / N-SGO-001~011 | ✅ | `content.js` 177,076 / sha `52a82620…` ∧ `pick-layer.js` 34,358 / sha `77796bab…` 亲测；base 零 diff；判定链哈希 pin 绿；12 kind 零宿主；`KIND_SET` 40；`requestTurn(` 2 | 低 |
| C31 | 目录结构 / 模块落点（读数 A 列、SW/工具 B 列） | 项目宪法 / ADR-SGO-002 §1 | ✅ | `l1/ref-scope.ts` 只被面板 import（`sidepanel.ts`）；`background/ref-context.ts` 不 import 读数模块；`tools/dom-anchor.ts` 与 SW 同处 `background.js` bundle 共享 `refTurnHolder` 单例（零新通道） | 低 |
| C32 | 3 枚新 node 门禁存在 ∧ 入受审集合 | FR-SGO-077/115 | ✅ | `ref-context-in-turn` / `law9-scope-reading` / `dom-ref-anchor` 三文件存在、导出 `JUDGEMENTS`、在 `EXPECTED_AUDITED_FILES` 下界声明内；`gate-integrity` 20/0 | 低 |
| C33 | 判据非恒真 | tasks §7 review 策略 | ✅ | 三新门禁每条 `expectFailPattern` 非占位；每文件均含注入反证段（复制声明 / 加 kind / 改基座 / 删追加段 / 删构建点 / 降档 risk / 去单节点闸 / 改判读数）；亲注入两处实测红 | 低 |
| C34 | 边界 / 错误场景覆盖 | spec §6 | ✅ | 覆盖 0 命中 / 多命中 / 标记缺失 / 身份不一致 / 非 `set-text` / 互斥 / 词法（6 形态）/ 越界 / 失效 / 零引用 / 全非法载荷 / 排队快照；`law9` §四必判项 vs EC 逐条映射 | 低 |
| C35 | 断言有效性（真源切片读生产模块） | tasks §7 | ✅ | `law9.readSrcFiles()` / `s0` / `dom-ref-anchor` / `ref-context-in-turn` 均 `readFileSync(src/**)`；亲注入真源改判 ⇒ 门禁红（证明切片非橡皮图章）；三新门禁均含「元判据：`expectFailPattern` 非占位」 | 低 |
| C36 | 反证完整性（注入 ⇒ FAIL ⇒ 逐字节还原 sha 相同） | FR-SGO-111 / AC-SGO-018 | ✅ | 亲注入 2 处均「红 ⇒ `git checkout` ⇒ sha256 前后相同 ⇒ 复绿」（`ref-scope.ts` `9109b539…` / `dom-anchor.ts` `f1363fed…`）；`git status` 终态干净（`.sddu` 外零残留）；门禁内 L9-114 / S0P-7 亦断言生产文件零改写 | 低 |
| C37 | 计数只增 / 保护段 / 门禁串行 | N-SGO-015/016/017 | ✅ | 门禁读值对账：`l0 248` / `l1 131`（≥120）/ `page-input 125`（≥118）/ `dead-end 49` / `density 242` / `journey 171`（保段零字节）/ `insight 118` / `binding 192`（保段）；`CHROMIUM_GATES === 9`；Chromium 逐个人工串行 | 低 |

---

## 3. 审查维度汇总

| 审查维度 | 审查项数 | 通过 | 警告 | 失败 | 通过率 |
|---------|:--:|:--:|:--:|:--:|:--:|
| 代码质量（Q，C1~C5） | 5 | 5 | 0 | 0 | 100% |
| 规范符合性（S，C6~C23） | 18 | 17 | 1 | 0 | 94.4% |
| 架构一致性（A，C24~C31） | 8 | 7 | 1 | 0 | 87.5% |
| 测试质量（T，C32~C37） | 6 | 6 | 0 | 0 | 100% |
| **合计** | **37** | **35** | **2** | **0** | **94.6%** |

> 两条警告均为**文字 / 报告层面的如实性订正**（I-01 台账计数口径、I-02 build.md 统计口径），不涉及任何 FR/NFR/EC 的实现符合性、门禁强度或红线；**规范符合性偏差 = 0 项**。

---

## 4. 阻塞问题

**无（0 个）。** 未发现架构偏离、判据恒真、红线越界、base 被撞、静默失败或欺瞒性登记。

---

## 5. 改进建议（I）与观察项（O）

### 5.1 改进建议（非阻塞）

| # | 位置 | 问题 | 对应 Cx | 建议 |
|---|------|------|:--:|------|
| **I-01** | `docs/v4-supersession-ledger.json#xSgoLedger.note` · `build.md` §1/§2/§7 · 本叶 `state.json` phaseHistory（R2 条） | 「**3 已发生 / 4 未发生**」与 `xSgoLedger.rows` 实际（**4 `superseded`：X-SGO-1/2/3/5；3 `no-supersession`：X-SGO-4/6/7**）不一致；spec §4 / plan §2.4 的口径是「1/2/3/5 已发生 + 7 未发生」⇒ **rows 正确、prose 失实**。note 里「4 条未发生取代（4/6/7 与 5 的 deny 方向）」把「条目」与「方面」混用，易被读成 X-SGO-5 未发生 | C12 | 把三处 prose 订正为「**4 已发生（X-SGO-1/2/3/5）/ 3 未发生（X-SGO-4/6/7）**」；若要保留「X-SGO-5 的 deny 方向未变」的表述，请与 rows 的 `decision: superseded` 显式区分（如注明「条目级 = superseded（只增范围锚读数），其 deny 方向零触碰」）。**零代码 / 零门禁改动** |
| **I-02** | `build.md` §1（复杂度分布 / 新增文件 / 修改文件） | 与实测不符：① 复杂度分布写「R2：M×13 / L×3」，实测 R2 = **M×11 / L×3**（14 任务，tasks.md 总表 M×21 / L×6 拆分自洽）；② 文件统计写「新增 9 / 修改 21」，实测提交 **33 文件 = 新增 8 + 修改 25**（若把探毕删除的 `test/_spike/sg-sgo-02-probe.mjs` 计入「新增」则为 9，宜显式标注；「修改 21」与 R1 8 + R2 实测 17 不符） | C29 | 按 `git diff --stat dd98bf8..2e3f141` 与 `tasks.json` 复杂度表**实测订正**数字（或显式写明统计口径 = 含/不含已删探针、是否含跨轮重复修改）。**零代码 / 零门禁改动** |

### 5.2 观察项（非改进项，仅登记）

| # | 位置 | 观察 | 对应 Cx | 处置 |
|---|------|------|:--:|------|
| O-01 | `sidepanel.ts:3879` | 本叶写闸 `authorized: false` **恒值**：本叶无扩围确认路径（WIDEN 二择卡属叶2）⇒ confirm 面 fail-closed；`out-of-scope-authorized` 本叶只能由读数输入事实触达（门禁用例覆盖），生产路径叶2 接线后自然可达 | C13 / C23 | build.md 偏差登记 4 **已如实登记**；属设计取舍，非缺陷 |
| O-02 | `docs/v4-supersession-ledger.json#zeroDiffFiles` | `src/background/messaging.ts` 在 `zeroDiffFiles` 名单内，却在本叶被改（type-only 追加）；该 pin 的机核为 `git status --porcelain`（工作树 vs HEAD），对**已提交**改动不可见 ⇒ 语义弱于「哈希 pin」。此系 v3 台账既有口径（`messaging.ts` 自 v55-2 起已多次改动），**非本叶引入** | C30 | 建议后续把 `messaging.ts` 归入 `unfrozenZeroDiffFiles` 显式解冻，或澄清该 pin 语义；本叶不阻塞 |
| O-03 | 本叶 `state.json` | `files` 为**路径数组**，无 `files.review` 键 ⇒ 审查策略未按 §8.2 记录文件关联 | 流程 | 提醒用户 / 状态机注册 `files.review = …/review.md`；本 Agent 不直改状态机字段 |
| O-04 | `docs/v4-supersession-ledger.json#counts.supersession` | `currentRuntime = 36`（source 2026-09-23 `v55-1-fix`），而本叶实测 `test:supersession` = **39/0**（build.md §4 亦记 39/0）。该 registry 为防退化**下界**，规则「floor 不动、只增不减」⇒ 属登记滞后而非失实 | C18 | 不阻塞；可在下次 validate 收口时前移 |
| O-05 | `test/ui/s0-self-driven.mjs` `S0P-C2` | 系统段追加段判据 = **真产物字节切片 + 真源工厂文本断言**（非运行期合成读数）；「运行期零引用 ⇒ system 逐字等于基座」由 node 面 S0P-2 用**生产模块**判定 | C27 / C35 | build.md 偏差登记 7 **已如实登记**（两面分工），非缺陷 |
| O-06 | `test/ui/s0-self-driven.mjs` `S0P-C1` | 真面板给的 `refNum = 2`（本门禁前已拾取过一次），样本 canonical = 1；判据写成「与本次拾取**同源** ∧ `refState=valid` ∧ `selector` 非空」，canonical 1 由 node 面机核 | C17 | build.md 偏差登记 6 **已如实标注**（不伪称 refNum=1），非缺陷 |

### 5.3 R1→R2 偏差登记复核（编排点名项，4/4 成立）

| 偏差 | 复核结论 |
|---|---|
| **ask-auth 环境性** | ✅ 亲跑 `ask-auth` = **78/0** 绿；`build.md` 偏差登记 5 所述「`/tmp` 陈旧 Chromium profile 占满 ⇒ 启动期 CDP 失败、清理后隔离复跑绿」可复现（当前 `/tmp` 仍余陈旧 profile 7 个、占用 78%）；**不伪称首跑绿**，处置正当 |
| **S0′ `refNum = 2`** | ✅ 亲跑 `S0P-C1` 输出 `refNum=2 与本次拾取同源 … 样本 canonical = 1`，与偏差登记 6 逐字一致；node 面 `S0P` 元判据机核 canonical = 1；**如实标注、未伪造** |
| **7 项体积 / 红线 pin 红延至 R2** | ✅ 处置正当：`tasks.md` TASK-V55F-129 明确把「逐叶重登记」排在 **W4（R2 收口轮）**；R1 末的 7 红被逐条归因（`build.md §5.1/§5.2`），R2 以「登记基线 585,732 == 实测产物」+「真实 metafile 逐模块 94 输入 / 4 行归因 Σ+glue == +7,109」闭环；**未以放宽容差 / 删判据 / 静默降档**实现 |
| **体积口径诚实性** | ✅ A 列 +7,109 B ≈ 6.94 KiB 在预算 6.0~9.0 KB（上界 10.35 KB）内；B 列 1,627,424 B 明确**不计账**；EC-SGO-022 三分支均**未触发**；`authorConfirmation = pending-author-line`（未伪称已确认） |

---

## 6. 结论

**结论**: ✅ **通过**

| 指标 | 结果 |
|------|------|
| 审查通过率 | **94.6%**（35/37） |
| 阻塞问题数 | **0** |
| 规范符合性偏差 | **0 项**（FR / NFR / EC 实现逐块符合） |
| 改进项 | **2**（I-01 / I-02，均为台账 / 报告**文字如实性**订正，< 5） |
| 可进入 validate | **是** |

**理由**：
1. **法九读数诚实**——四值 + 判定函数**唯一声明**（`src/**` 第二声明 ⇒ FAIL）；三段控制 `ok`/`violated`/`n/a` 互异且 `n/a` 单独计数；**亲注入真源改判 `in-scope` ⇒ 4 红（含 S0P 面 5 红）⇒ 逐字节还原 sha `9109b539…` 相同 ⇒ 复绿**，证明判据非恒真。
2. **`--ref` 锚定安全**——**删 live 单节点闸（多命中按首元素）⇒ DRA-2 / DRA-5 红**（多命中会静默写入且交基线 executor）；失配 EC 家族逐条非静默（亲测 EC-SGO-001/002/003 文案含原因 + 可达 next）；`risk` / `subcommandRisks` 逐字段 spread 自 base，**base 亲跑零 diff**。
3. **S0′ 双面**——node `S0P-1~8` 24/0（S0P-4 改写处数 ≤ 引用数、S0P-7 双向反证 / sha 还原，均直接抽核承重）；Chromium `S0P-C1~C5` **65/0 只加断言**（`CHROMIUM_GATES === 9` 未动）。
4. **载荷与法八**——type-only 7 字段（`KIND_SET` 40 逐字、`refs` 非 kind）；留痕零值（字段名 + 机器枚举）；凭据掩码单点；`law8` **46/0**（36 段零降级）；`requestTurn(` 恰 2。
5. **体积 / 台账**——`npm run build` 亲测 `585,732 B` == 登记基线、五要素同源、`build-meta.json` 输入 94 / 逐模块归因 Σ+glue == +7,109；7 项 pin 红**真实闭环**；红线终核（三冻结面 sha 双锚 / base / 判定链 / 特权手势 / 12 kind / `KIND_SET` 40）**全绿**。
6. **无阻塞**——两处改进仅为**台账 / 报告的计数与统计文字失实**，不影响实现、门禁强度与红线；建议在 validate 前顺手订正（**零产品代码改动**）。

---

## 7. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V5.5F-1 范围底座叶审查报告 **R1**：37 Cx / 35 ✅ / 2 ⚠️ / 0 ❌ / 0 BLOCK / 2 I / 6 O；亲注入 2 处（法九真源改判 · 锚定删闸）+ 亲跑 node 10 门禁 + Chromium 5 项 + 构建体积实测 + 红线终核；结论 ✅ 通过） | 2026-09-24 | SDDU Review Agent |
