# 技术计划：specs-tree-ian-2-abolish-composer（IAN-2 废除 `#composer` + 法四修订：DOM 真退役 + 判据重锚）

> **文档定位**: SDDU 技术方案（**叶级切片**）— 父 `../plan.md`（v1.0）在本叶的适用范围与落地口径；作为本叶 tasks 阶段的输入
> **前置依赖**: 父 `../spec.md` v1.0 + 父 `../plan.md` v1.0（含 `ADR-IAN-004` ~ `ADR-IAN-010`）+ 本叶 `spec.md` v1.0 + **叶1 `../specs-tree-ian-1-free-input-next/plan.md`（强依赖：流内输入面必须先建立）**
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-24
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-24
> **更新说明**: 初始创建（IAN-2 叶技术方案：停引 → 删面执行序 + 写者消解 + 登记退役 + 四处兜底收敛终态 + `#send-reason`/`sendDisabled`/draft/引导重锚 + 法四原地修订 + 台账 + 18 门禁重锚 + 保护段决策 + S0''-B + 体积净负重登记）

---

## 1. 前置检查

| 检查项 | 状态 | 证据 |
|--------|:--:|------|
| 本叶 `spec.md` 存在 | ✅ | `spec.md`（263 行，v1.0） |
| 父 `spec.md` / `plan.md` 存在 | ✅ | `../spec.md`（863 行）/ `../plan.md`（v1.0，含 ADR-IAN-001~010） |
| **上游叶依赖** | ⚠️→✅ | `dependsOn: ["specs-tree-ian-1-free-input-next"]`；**叶1 `validated` 后方可启动**（否则出现「无输入可用」窗口 ⇒ N-IAN-027 / R-IAN-901） |
| 外部 API 文档缓存 | ✅ N/A | 零外部 API / 零新依赖 |
| 法四落点确认 | ✅ | `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v4-chat/spec.md:116 / :225 / :385`（实测行号） |
| 保护段实测 | ✅ | journey `43054..58287`（段内 ≥10 处 `composer`）⇒ 取代；binding `107780..115930`（段内 0 处）⇒ keep |
| 写入范围 | ✅ | 本叶 SDDU 目录 + build 阶段授权的 `v4-chat/spec.md` 三处 + 台账；本阶段零 `src`/`test` 改动 |

---

## 2. 架构分析（本叶）

**本叶的验收锚**：把「流外面」**真退役**（DOM 移除，非 `hidden`），并把**立法（法四）+ 门禁强度**同步重锚 —— **断言零删除零降级**（唯一例外 = 保护段显式取代 + 台账留痕）。

**执行序（8 步，**先停引、再删面**；承父 `ADR-IAN-004` §①）**：

| 序 | 步 | 落地 | 判据 |
|:-:|---|---|---|
| 1 | **停引** | `l0/shell.ts` `revealFallback/hideFallback` 去 `composer.hidden=false/true`；保留 `revealAskFallback` 的 `l0?.revealFallback()` 调用（只做 `setAskFallbackOpen`） | 调用链零流外面；四处入口展开卡内；反证「重新级联 ⇒ 双输入面 ⇒ 红」 |
| 2 | **DOM / CSS 退役** | 删 form/input/button + 6 条 CSS + 出流注释；三区 CSS `:670-672` 逐字不变 | 三 id 零命中（非 `hidden`）；无死 CSS |
| 3 | **写者消解** | 删 `syncComposerVisibility`（+`:2245`/`:3616`）+ `fallbackOpen`（+`:2896`/`:856`）+ `:2270` `#send` writer；settings 提前 return 无需护栏；陈留注释同步 | 标识符/函数零命中；注释无「保留 `#composer`」 |
| 4 | **登记退役** | `NEVER_FOLDABLE` 14→13；PRESERVED 去三项；`RETIRED_CONTAINER_IDS` 13→**16**；`RETIRED_HOST_ATTRS` 宿主值 4 项不动 | 容器册 = 16；`NEVER_FOLDABLE` 不含 `'composer'` |
| 5 | **重锚** | `#send-reason` 保留非恒真；`sendDisabled` 重锚流内；**draft 重锚**（PD-006）；引导改指 | 父 `ADR-IAN-005` 表逐条 |
| 6 | **通道唯一化** | `requestTurn(` 恰 1；R6 入口/回填唯一化；TA-4 重锚 | 父 `ADR-IAN-002/003/008` |
| 7 | **立法** | 法四三处原地修订 + old→new 台账 + 法四门禁 | 父 `ADR-IAN-006` |
| 8 | **门禁 / 保护段 / S0'' / 体积** | 18 门禁三态 + journey 八步取代 + binding keep + S0''-B + 净负重登记 | 父 `ADR-IAN-007/008/009/010` |

---

## 3. 方案对比（本叶拆除策略）

| 维度 | **方案 A：停引 → 删面 → 登记 → 重锚 → 立法（推荐）** | 方案 B：先删 DOM 再逐处修引用 | 方案 C：`hidden` 退化为不可见 |
|---|---|---|---|
| 描述 | 按 8 步序；先停附带 reveal，再删元素与写者，最后重锚与立法 | 先删 `index.html` 元素，再逐个修编译/运行时错误 | 保留元素，加 CSS `display:none` |
| 优点 | 每步可判、可回滚；无「运行期引用已删元素」的中间破窗 | 删除早、反馈快 | 改动最小 |
| 缺点 | 步骤多（8 步） | 中间态编译红 / 运行期 null 引用（`syncComposerVisibility` 等仍写） | **撞 N-IAN-025**（真退役非 `hidden`）；面仍在且可被历史路径拉出 |
| 风险 | R-IAN-001/910（重锚纪律，有 ADR） | R-IAN-902（半修）+ 中间态破坏 | 主题落空；法四门禁必红 |
| 工作量 | 3 波 / ~24 任务 | 3 波（返工多） | **不达标** |

**推荐：方案 A**（理由见父 `ADR-IAN-004` §决策）。

---

## 4. 本叶设计定案（父 ADR 的叶内落地）

| # | 落地项 | 定案 | 判据锚 |
|:-:|---|---|---|
| 1 | 停引 | 保留 `l0?.revealFallback()` 调用，shell 只操作卡内（PD-IAN-007） | `ADR-IAN-005` §① |
| 2 | DOM/CSS 退役 | 三 id 零命中；6 条 CSS 移除；**DOM/CSS 不进 sidepanel.js 账本**（诚实口径） | `ADR-IAN-004` §①/§②；`ADR-IAN-010` §③ |
| 3 | 写者消解 | 删 `syncComposerVisibility` / `fallbackOpen` / `#send` writer；钩子重锚为只操作卡内；三缺陷**结构性消解** | `ADR-IAN-004` |
| 4 | `NEVER_FOLDABLE` | 14 → **13**（去 `'composer'`）+ 注释算术订正 | `ADR-IAN-005` §⑥ |
| 5 | `RETIRED_CONTAINER_IDS` | 13 → **16**（`#composer`/`#input`/`#send` 全入册）；`RETIRED_HOST_ATTRS` 逐字不动 | `ADR-IAN-005` §⑥ |
| 6 | 兜底收敛终态 | 四入口只展开卡内；去「双 reveal」；`op.describe` 有值相逐字不变 | `ADR-IAN-005` §① |
| 7 | `#send-reason` | 保留在 `#region-statusbar` + 判据非恒真 | `ADR-IAN-005` §② |
| 8 | `sendDisabled` | 重锚流内输入面（禁用仅异常态；在飞不硬禁用） | `ADR-IAN-005` §③ |
| 9 | draft | **重锚**到流内输入载体（PD-IAN-006） | `ADR-IAN-005` §④ |
| 10 | 引导 | `ONBOARDING_TEXTS[4]` 改指流内 next 项 | `ADR-IAN-005` §⑤ |
| 11 | `requestTurn(` | 恰 1（唯一生产输入提交点 = `op.turn` 槽）+ 反证 | `ADR-IAN-002` §②；`ADR-IAN-008` #1 |
| 12 | R6 唯一化 | 入口/回填载体唯一化到流内；TA-4 重锚（删回填仍必红） | `ADR-IAN-003` |
| 13 | 法四修订 | 三处一致（`:116`/`:225`/`:385`）+ old→new 台账 + 新门禁 | `ADR-IAN-006` |
| 14 | 18 门禁 | 三态齐逐条处置（父 `ADR-IAN-008` 表） | `ADR-IAN-008` |
| 15 | 保护段 | journey 八步取代（新 pin）/ binding keep 字节中立 | `ADR-IAN-007` |
| 16 | S0''-B | 旧面零可达（元素不存在非 hidden）+ 注入必红 | `ADR-IAN-009` §② |
| 17 | 体积 | 叶2 **净负**重登记；非负则如实说明（FR-IAN-115） | `ADR-IAN-010` §③ |

---

## 5. 文件影响分析（本叶）

| 操作 | 文件路径 | 说明 |
|:--:|---|---|
| MODIFY | `src/ui/sidepanel/index.html` | 删 form/input/button + 6 条 CSS + 出流注释；三区 CSS 不动 |
| MODIFY | `src/ui/sidepanel/sidepanel.ts` | 删 `syncComposerVisibility` / `fallbackOpen` / `#send` writer；钩子重锚；draft 重锚；注释同步 |
| MODIFY | `src/ui/sidepanel/l0/shell.ts` | `revealFallback/hideFallback` 只操作卡内 |
| MODIFY | `src/ui/sidepanel/disclosure.ts` | `NEVER_FOLDABLE` 14 → 13 + 算术注释 |
| MODIFY | `src/ui/sidepanel/host-registry.ts` | PRESERVED 去三项 + `RETIRED_CONTAINER_IDS` 13 → 16 + dispositions |
| MODIFY | `src/ui/sidepanel/view-model.ts` | `sendDisabled` / `AskFlowView` 语义锚（引导文案叶1 侧） |
| MODIFY | `src/ui/sidepanel/stream-render.ts` | 陈留注释同步 |
| MODIFY | `src/ui/sidepanel/cards/askuser.ts` | `free-input` 卡幂等查询（终态化，若需） |
| NEW | `test/law4-input-as-next.test.ts` | L4-1~6（DOM 零命中 / 入册 / 默认屏零可见 / 卡内可用 / 禁恒真 / 真源切片） |
| MODIFY | `test/op-wiring.test.ts` | `requestTurn(` 恰 2 → 恰 1 + 反证 |
| MODIFY | `test/turn-arbitration.test.ts` / `test/r6-ty-experience-fix.test.ts` / `test/sidepanel-view.test.ts` | R6 / 回填等价重锚 |
| MODIFY | `test/density-thresholds.test.ts` / `test/host-registry.test.ts` / `test/l0-disclosure.test.ts` / `test/settings.test.ts` | `:389-409`/`:754-776`/`:787-814,864` / 13→16 / 14→13 / draft 重锚 |
| MODIFY | `test/supersession-ledger.test.ts` / `test/insight-tree-hierarchy.test.ts` | X-IAN-1 一致性 + journey 新 pin 链 + binding keep + 先例引用 |
| MODIFY | `test/size-baseline.ts` | 叶2 五要素 + V3-VOL-3 三值 + 逐模块行（净负或如实非负） |
| MODIFY | `test/gate-integrity.test.ts` | `EXPECTED_AUDITED_FILES` 只增 `law4-input-as-next`；`CHROMIUM_GATES === 9` 不动 |
| MODIFY | `test/ui/{insight,journey,l0,binding,recommendation,s0-self-driven}.mjs` + `test/ui/fixtures/s0-chain.mjs` | 6 Chromium 门禁等价重锚 + S0''-B |
| MODIFY | `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v4-chat/spec.md` | **唯一授权例外**：法四三处原地修订 |
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` | `xIanLedger` + journey 新 pin / binding keep + `redlineRemap` + `modifiedRanges` |
| MODIFY | 本叶 `state.json` / `TREE.md` | 阶段推进 |

---

## 6. 风险评估（本叶）

| # | 风险 | 等级 | 缓解 |
|---|---|:--:|---|
| R-IAN-001 | 门禁 / 保护段重锚纪律被破坏（最高危） | 高 | 先出逐条重锚清单（执行序 1 前）；journey 八步 / binding keep；台账留痕 |
| R-IAN-003 | `requestTurn(` 恰 2 冲突 | 高 | 显式取代 X-IAN-6（恰 1 + 反证） |
| R-IAN-002 | R6 回填回归（唯一化侧） | 高 | TA-4 **重锚非删除**（删回填仍必红）；卡收起重展开 |
| R-IAN-006 | 法四台账不完整 | 中高 | 老 `redlineRemap ≥3` 保留 + 新增 old→new；三处一致 |
| R-IAN-010 | e2e / binding 诊断面牵动 + 保护段 | 中高 | 诊断面替换 + 真实键入等价；保护段逐段决策 |
| R-IAN-011 | `#send-reason` 误删 | 中 | 保留 + 判据重锚（非恒真） |
| R-IAN-005 | 体积（叶2 目标净负） | 中高 | 逐模块归因；如实登记为负或显式说明非负 |
| R-IAN-902 | 「真退役」被实现成 `hidden` | 高 | DOM 零命中断言 + 注入必红 |
| R-IAN-903 | 法四判据恒真 | 中高 | 三段控制 + 双向反证 + 真源切片 |
| R-IAN-908 | 净值非负却谎报净负 | 中高 | 逐模块归因 + 严格口径显式登记 |
| R-IAN-910 | 18 门禁处置漏项 | 中高 | 按断言 / 选择器逐条 + 三态齐 + 间接面对账 |
| R-IAN-917 | DOM/CSS 删面被误算入 sidepanel 体积 | 中高 | `ADR-IAN-010` §③ 显式口径（`copyFile` 独立产物） |
| R-IAN-918 | journey `#15c` 只删不断言 | 高 | 同编号等价改写（三 id 零命中）+ 计数只增 |
| R-IAN-919 | binding 段前补偿不足 ⇒ `startByte ≠ 107780` | 中高 | 等长补偿 + startByte 显式断言 + 反证；逃生口 = 走八步 |
| R-IAN-920 | 法四三处只改一处 | 高 | 三处一致判据（半修即红） |
| R-IAN-921 | draft 重锚到不存在的 `#ask-input` | 中 | 空安全读 + 空写零副作用 + EC-IAN-011 |

---

## 7. 交付物与执行序（供 tasks 参考，**非需求**）

**交付物（9 项）**：① `index.html` 三 id + 6 CSS 退役；② 双写者/锁存/设置态护栏消解；③ 兜底收敛终态 + `#send-reason`/`sendDisabled`/draft/引导重锚；④ 法四三处修订 + 台账；⑤ 法四门禁 + `requestTurn(` 恰 1 重锚；⑥ 18 门禁处置 + 2 保护段决策；⑦ S0''-B 终态样板；⑧ 体积叶2 净负重登记；⑨ 本叶 plan/tasks/build/review/validate 产物。

**执行序（3 波，承父 §2.4 八步）**：
1. **W1 拆除**：停引（步1）→ DOM/CSS 退役（步2）→ 写者消解 + 钩子重锚（步3）→ 登记退役（步4）。
2. **W2 重锚与唯一化**：`#send-reason`/`sendDisabled`/draft/引导（步5）→ 通道唯一化 + R6 唯一化 + TA-4（步6）→ 相关 node 门禁等价重锚。
3. **W3 立法 / 门禁 / 保护段 / 验收**：法四三处修订 + 台账 + 法四门禁（步7）→ 18 门禁重锚 + journey 八步取代 + binding keep + S0''-B（步8）→ 体积净负重登记。

**Gate 硬要求**：`npm test` / `test:ui` / `test:binding` **严格串行**（一次一个 Chromium；`finally` 自清 profile）；新增 `test/law4-input-as-next.test.ts` 入 `gate-integrity` 下界（只增）；**不新增 Chromium 门禁文件**；反证必实跑 + 逐字节还原（sha256）；`KL-N-10` flake 处置 = 隔离复跑 ≥2 / 日志全量 / 仍红如实记录不阻塞收口。

---

## 8. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（IAN-2 叶 plan：§1 前置检查（含叶1 强依赖 + 法四落点 + 保护段实测）· §2 本叶架构（停引 → 删面 8 步执行序）· §3 三方案对比（推荐 A）· §4 17 项设计定案（映射父 ADR-IAN-002~010）· §5 文件影响 ~20 项 · §6 风险 16 条 · §7 交付物 9 项 + 3 波执行序） | 2026-09-24 | SDDU Plan Agent |
