# 审查报告：specs-tree-v4-1-zone-shell-density

> **文档定位**: SDDU 审查报告 — 逐项记录自主审查的执行结果，作为 validate 阶段的输入
> **审查策略**: `review.md`（C1~C8 审查清单 + FR→Cx 覆盖矩阵 + 四维度判据）
> **前置依赖**: `review.md`、本叶 `spec.md` / `plan.md` / `tasks.md` / `build.md`、父 `../spec.md` / `../plan.md`、`docs/v4-density-baseline.{md,json}`、`docs/v4-supersession-ledger.json`
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-19
> **审查轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-19
> **更新说明**: 初始创建（R1 全量静态审查 + 既有门禁只读复跑：C1~C8 逐项结论 + I1~I13 改进项 + 零改动核验 + 复跑证据）

---

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查项总数 | **8**（C1~C8） |
| 通过 | **3**（C5 / C6 / C7） |
| 警告 | **5**（C1 / C2 / C3 / C4 / C8） |
| 失败 | **0** |
| 阻塞问题 | **0** |
| 改进项 | **13**（I1~I13；中 5 / 低 8） |

**被审基线**：仓库 `/home/usb/wks/gits/GitHub/LGDL` · 分支 `feature/web-cli-plugin` · HEAD `6761447` · 本叶 diff 基线 `187c205`（leafBase）· `main` 未动。`git status --porcelain` 在本轮审查前后除本报告/策略与 `state.json` 外为空。

**纪律声明**：本轮**未修改**任何源码/测试/配置/既有文档；仅新增 `review.md` / `review-report.md` 并更新 `state.json`（完成协议）与 `TREE.md`（导航同步）。复跑门禁不改动产物（`dist/**` 与 `dist-test/**` 均为 gitignored 的构建产物；`test:density --reverse RP-V4-05` 未被本轮触发，故 `dist/pick-layer.js` 未被扰动）。

**本轮复跑过的门禁（真实执行，非引用）**：`npm test` → **849/849 pass / 0 fail / 0 skipped**；`test:supersession` → **20/20**；`test:gate-integrity` → **12/12**；`test:design-contract` → **6/6**（shim 实跑 60 passed / 0 failed）；`test:density` → **169 passed / 0 failed**（阶段 F 28 格机对 + 几何下界 + 产物字节）；`test:ui`（journey）→ **167 assertions PASS**（含 `#15b`/`#15c`）。另有独立只读复算：Python 复算保护段 sha256/byte/行数、`dist/build-meta.json` 逐模块核对、shim/draft sha256、`grep`/`stat` 零改动核验。

---

## 2. 逐项审查结果（C1~C8）

| # | 审查对象 | 审查基准 | 评估 | 发现（证据） | 严重程度 |
|---|---------|---------|:--:|------|:--:|
| C1 | 三区结构正确性 / 工具栏 ≤5 / 占位宿主 / `#log`→`#stream` | FR-CHAT-010/011/013、NFR-CHAT-004、ADR-V4-017/018、S7 | ⚠️ | **核心成立**：三区 body 直挂且文档序正确（`index.html:1175/1200/1375`；静态契约 `density-thresholds.test.ts:261-322`；运行期 `l0.mjs:229-241`）；`ol#stream[role=log]` 且 `#view-host` 为其兄弟；工具栏可点 runtime == **5**（`l0.mjs:245`，我复跑 density 日志「可点明细 = 4 入口 + #theme-toggle」）；`#log` 在 `src/`、`test/` 零残留（`getElementById('log')` / `'#log'` grep 0 命中；`#log` 字样仅存于注释：`index.html:269/956/1197`、`density-scope.ts:65`、`l1/panels.ts:31`；binding 保护段内保留合法）。**两处缺陷**：① 占位宿主实际 **4 个**（`index.html:1206/1271/1281/1319`；v4-3×2 + v4-4×2），而 `build.md §2` / `state.json.scope` / v4 台账 `knownGaps` 记「**5 个**」——第 5 个是 `grep -c` 命中的 CSS 注释 `index.html:1115`；门禁仅断言 `hostCount > 0`（`l0.mjs:240`）故不拦（I7）。② `#theme-toggle`（`index.html:1192`）带 `aria-expanded="false"` 但**无 `aria-controls`**，且 `theme.ts` 从不更新它（循环按钮不是展开器）；门禁 ⑧ 只遍历 `[aria-controls]` 元素，反向未覆盖（I12）。 | 低 |
| C2 | 密度重定标诚实性（单源 / 真封堵 / 31 格 / 两条红线取代合法性） | FR-CHAT-070~075、ADR-V4-020/021、父 ADR-V4-007 | ⚠️ | **单源真实**：字面量 `DENSITY_EXCLUDED_SUBTREES=Object.freeze(['#stream'])` 仅 `density-scope.ts:35` 一处（`CANONICAL_*`/`density-metrics.mjs` 走源码抽取；`density-thresholds.test.ts:570-589` 的「恰好一次 + 第二声明点扫描」可 FAIL）。**真封堵**：`assertChromeNotInStream()` 抛错（`density-scope.ts:78-93`）+ RP-V4-06 实跑两段（`density-reverse-RP-V4-06.log`：抛错 ∧ C1 不降 ∧ 还原）。**格值一致**：我复跑 `test:density` → 169/0，阶段 F「28 格实测 == 基线登记值」（`default` 181/181/184、`risk.worst` C1 6/C2 7/C3 17/C4 4/chars 227、`empty` 184/184/187、`riskDetailOpen` 239×3）；阈值 `7/15·9/20·17/35` 逐字不变（`density-thresholds.test.ts:188-197`）。**红线①「default 恰 7」→「恰 5」= 合法收紧**：旧断言 `measured.clickables === 7` 被 `=== 5 ∧ ≤7`（`density.mjs:528-532`）取代，5 < 7，方向收紧；且 stage F 逐格比对 `clickables`。**红线②「chars 三视口逐项相等」→「跨视口差 ≤8」= 实质降级**：v3 `density.mjs`（187c205:462-469）的确定性断言含 `r.measured.chars !== firstMeasured.chars`，v4（`density.mjs:560-576`）把 `chars` 移出相等集合、改为 `charsSpread <= 8`，且该语义变更**未进 `redlineRemap`、台账无对应 `entries`**；补偿面存在（stage F 的 `BASELINE_COMPARE_KEYS` 含 `chars`，逐格漂移仍会 FAIL），但「≤8 vs 实测 3」偏松且归因未证实（I6）。**计数口径**：「31 格」= `DENSITY_MATRIX_SIZE(9)+15+6+1`（`density.mjs:1422`）含 risk×3 名义格，实际机对 **28** 格，二者并存无说明（I10）。 | 中 |
| C3 | journey 取代完整性（pin / `#15b`/`#15c` 强度 / redlineRemap / RP-V4-08） | 父 ADR-V4-008、FR-CHAT-082、AC-CHAT-017 | ⚠️ | **pin 独立复算全等**：我用 Python 切片复算——新 pin `43054..55259`、194 行、sha256 `e2b500df9049f69979892076ad798fabfc4a638a3403902c7e57d7f1e1ac244f`；从 `187c205` 复现 old pin `42766..54004`、185 行、sha256 `6b45c3fa4027f75a97bb84e0f5d80446a8c316ca4cd6dd83b2fe939c0eb6ba63`（与台账逐字一致）。**强度不降**：`#15b` 由 `#log >45vh` 改为 `#region-stream ≥65%`（`journey.mjs:883`，门槛 45→65 收紧；region-stream ⊇ stream 且 view-host 恒 hidden ⇒ 语义等价）；`#15c` 由「composer 贴底 gap∈[0,12]」改为「默认屏零可见输入 ∧ `#composer.hidden`」（`journey.mjs:858-866`，法四显式取代，方向收紧）；段内 `check(` **22 == 22**、全文件 **170 == 170**（独立计数），我复跑 journey **167/0**. **redlineRemap 三条均 `landed`** 且带证据。**缺陷**：`redlineRemap[1]` 的 `from` 写「`#log` ≥589px（v2 继承）」——v3 末轮登记的几何下界是 **488px**（`docs/v3-density-baseline.json#logClientHeightFloor`），589px 在 v3-1 已被取代 ⇒ 台账「from」失真（I13）；`protectedSupersession.knownGap` 与 `status:"complete-steps-1-8"` **自相矛盾**（I1）。 | 低 |
| C4 | 体积五要素 / ceiling 公式 / metafile 归因 | 父 ADR-V4-010、V3-VOL-3、AC-V3-016 | ⚠️ | **五要素齐备**：`SIDEPANEL_RE_REGISTRATIONS['v4-1']` 含前/后值 375,102→385,319、日期 2026-09-19、source/buildCommand/measuredBy、reason、「断言零删减」台账条目 + `historyRetainedBytes`；`ceiling = floor(385,319×1.05) = 404,584`（我复算一致，`size-baseline.ts:349-351`）；`PENDING_ABSOLUTE_CAP` 仍 `resolved:false` 且未预填（`size-baseline.ts:1412-1419`）。**metafile 同源**：我独立读 `dist/build-meta.json`，`sidepanel.js` 输出 **385,319 B**；新模块 toolbar 3,111 / theme 2,937 / density-scope 1,783 / statusbar 976 与登记逐字一致；`rows` Δ 之和 89,496 + 未归因 598 == 累计 90,094（`size-growth-evidence.test.ts:196-209` 可 FAIL，`npm test` 未 skip）。**两处保真缺陷**：① `duplicationCheck` 仍称「输入模块数 **53** … R2 仍是 53 —— 不新增模块」，而真实 metafile 的 inputs = **57**（v4-1 新增 4 模块）（I8）；② `closeoutDeltaBytes: 10_217` 与 META/v4-1 reason 里本轮逐模块增量（sidepanel +1,177 / view-model +398 / risk-rail +1,288 / shell +161 / view-host +1 / disclosure −130 / status-bar −1,627）**无任何门禁断言**（I9）。 | 中 |
| C5 | 测试守恒与门禁账（D-005） | AC-CHAT-023、ADR-V4-023、NFR-CHAT-009 | ✅ | 台账 `counts` 与 D-005 逐项一致（l0 203/164、l1 108/103、l2 73/71、density 169/127、journey 167/167、insight 116/116、binding 192/192、sidepanelView 38/38、nodeTestRuntime 849/832）；`v4GateFloors` 与 `tasks.md` 只增口径一致。我复跑：`npm test` 849/849/0/**skipped 0**（⇒ metafile 断言未被 skip）、supersession 20、gate-integrity 12、design-contract 6、density 169、journey 167。**binding 抖动如实登记**：build.md §B.6 记录首轮 exit=1（`#7d/#7e` 真实 tabs 环境）+ 复跑 192/0，归因为宿主环境敏感、非本叶引入（本叶对 `test/ui/binding.mjs` 零 diff 保护段、`src/**` 零改动），未以放宽口径掩盖。l0/l1/l2/insight/hardening/e2e/zero-injection/page-input/l1-reverse/l2-reverse 本轮**引用落盘日志**（`v4-gate-logs/v4-1-r3/`），未逐一复跑（见 §7）。 | 低 |
| C6 | design-contract 双实现边界（R4-20） | AC-CHAT-025、FR-CHAT-036、父 ADR-V4-011 第 5 条 | ✅ | `design-contract.test.ts` **只判设计稿**（明确声明真实产物断言落 Chromium 门禁、两侧数字分列 `v4-density-baseline.json#designCaliber`）；6 条判据=实跑 shim 60/60 + shim sha256 冻结 + draft sha256 冻结 + 计数口径（60 调用点 + 1 声明 = 61 次 `check(`）+ 60 行映射表（id 集合由 shim 反抽，覆盖 A~I 九组）+ `CARD_TYPES` 7 主类顺序敏感。我独立复算 sha256：shim `8ca5db6f…`、draft `49ce27fc…`（二者未在本叶 diff 中，`git diff 187c205..6761447 -- design/` 为空）；实跑 `node design/ui-redesign/option-f-shim.mjs` → 60 passed / 0 failed；`npm run test:design-contract` → 6/6。**无混算**（`designCaliber` 仍是 v3 时代的 E/D 稿口径，属历史登记、不参与验收）。 | 低 |
| C7 | 红线零违反复核 | 本叶 `out`、父 ADR-V4-004/011 | ✅ | `git diff --stat 187c205..6761447` 全量核对：改动面 = `packages/web-cli-plugin/{src/ui/sidepanel/**,test/**,docs/**,package.json,design 未动}` + `.sddu/**`；`manifest.json` / `src/content/**` / `src/security/{policy,auto-authorize}.ts` / `src/background/**` / `src/ui/options/**` / `test/ui/{hardening,page-input,zero-injection}.mjs` **零 diff**。产物：`dist/content.js` **177,076 B** sha256 `52a82620…`（= spec pin）· `dist/pick-layer.js` **33,900 B** sha256 `5f567d7e…` · `dist/sidepanel.js` **385,319 B**（= 登记值）。`docs/v3-*` 逐字冻结未改。**零违规**。 | 低 |
| C8 | 规范符合性与 build 保真（AC 逐条 / 数字化校验 / 新模块错误路径） | spec §7、EC 组、NFR-CHAT-002/004/008/009/010 | ⚠️ | **AC 逐条**（证据强度见下「AC 映射」）：AC-CHAT-004 ✅（法一静态 half 成立，`density-thresholds.test.ts:311-321`）；005 ⚠️（无专门「零撤销控件」骨架断言，仅硬底线零允许控件 `l0.mjs:519` 间接覆盖）；006 ✅（`#authorize/#revoke/...` 落在 `#settings-view` 内（`index.html:1391-1440`）+ `l1.mjs:223-256` 可发现）；007 ✅（法四 + 五类 chips × 2 场景 `l0.mjs ③/⑤/④`）；008 ✅（`l0.mjs ②/⑨` + 静态插槽）；009 ✅（density 全绿 + RP-V4-01~07 + 反证日志）；022 ✅（`l0.mjs ⑩/⑬` 320/400 集合相等 + 零溢出 + 双主题 + 不只靠颜色）；023 ✅（19 门禁串行 + 反证实跑 + 日志落盘，build §B.6）；025 ✅（design-contract）。**缺口**：① 「第 6 个可点不可能」的实际拦截点是 `toolbar.ts:116-121` 的 `render()` 抛错，**无任何 FAIL 段驱动**（`l0.mjs ⑫` 只是自数元素 ==6，未调用 render/未观测抛错；density 默认上限 7 也不会因 6 个可点而红）（I4）；② 新模块 `theme.ts` 无 node 单测，**EC-CHAT-014（storage 读/写失败降级 auto 且不阻断）零覆盖**（runtime ⑬ 只测正常三态）（I5）；③ `build.md §B.3` ④ 称「语义由 **18 条** entries 给出」而台账 `V41-R3-E-*` 实测 **47 条**（I11）；④ `pureAdditionFiles` 中 `design-contract.test.ts` 仍 `status:"pending"`（I2）。 | 中 |

### 2.1 AC 映射（build.md / 门禁证据 → AC）

| AC | 机器证据 | 判定 |
|----|---------|:--:|
| AC-CHAT-004（法一静态） | `density-thresholds.test.ts:311-321`（工具栏/状态栏内零 `[data-msg-type=askuser/author/auth/nextstep]`） | ✅ |
| AC-CHAT-005（法二：骨架无越权入口） | `l0.mjs:505-520`（硬底线零「允许/放行」）+ disclosure 白名单抛错 | ⚠️ 部分（无「零撤销控件」专断言） |
| AC-CHAT-006（法三+法六） | `index.html:1391-1440` 归属 + `l1.mjs:223-256`（一次点击入设置视图 + 四分区可见 + 可逆） | ✅ |
| AC-CHAT-007（法四 + 风险永不折叠） | `l0.mjs ③`（法四）+ `④`（J1~J4）+ `⑤`（5 类 × 2 场景）+ journey `#15c` | ✅ |
| AC-CHAT-008（法五 + 工具栏准入） | `l0.mjs ②/⑨`（可点 5、只读摘要、四徽标三处同源）+ 静态插槽 5 + 反证 ⑫ | ✅ |
| AC-CHAT-009（密度新口径 + 反证） | 复跑 `test:density` 169/0（31 格口径）+ RP-V4-01~07 日志 + v4 基线 | ✅ |
| AC-CHAT-022（零溢出 + 双主题 + 无障碍） | `l0.mjs ⑩`（320/400 集合相等、overflowX=0）+ `⑬`（双主题差异 + 三通道 + 三态循环）+ journey `#15d/#15q` | ✅ |
| AC-CHAT-023（全门禁绿 + 反证 + 日志） | build §B.6 19 项 + §B.5 7 反证 + 日志目录；我复跑 6 项 | ✅ |
| AC-CHAT-025（设计契约条款化） | `design-contract.test.ts` 6/6（复跑）+ shim 60/60 | ✅ |
| EC-CHAT-004（320px 窄屏） | `l0.mjs ⑩` | ✅ |
| EC-CHAT-007（未授权站点零注入 + 可发现） | `density.mjs` 阶段 C 尾部（禁用 + 页面侧零注入）+ `zero-injection` 日志 | ✅（引用日志） |
| EC-CHAT-010（视图打开时 chips 并存） | `l0.mjs ④` J4（open/close 视图后 chips 仍可见） | ✅ |
| EC-CHAT-013（不留红灯） | 19/19 门禁绿 + TASK-501 前置闸门 | ✅ |
| EC-CHAT-014（主题失败降级） | `theme.ts:148-155` 实现；**无测试**（I5） | ⚠️ |

---

## 3. 审查维度汇总

| 审查维度 | 审查项数 | 通过 | 警告 | 失败 | 通过率 |
|---------|:--:|:--:|:--:|:--:|:--:|
| 代码质量（C1 局部 / C8） | 8* | 3 | 5 | 0 | 37.5% |
| 规范符合性（C1·C2·C8） | 8* | 3 | 5 | 0 | 37.5% |
| 架构一致性（C3·C4·C6·C7） | 8* | 3 | 5 | 0 | 37.5% |
| 测试质量（C2·C3·C5·C6·C8） | 8* | 3 | 5 | 0 | 37.5% |
| **合计（去重）** | **8** | **3** | **5** | **0** | **37.5%** |

> **说明**：本清单由用户指定为 C1~C8（每条**跨维度**），故上表按四维度各自统计 8 条（同一 Cx 计入其覆盖的每个维度），「合计（去重）」才是真实条目数。警告项全部为「登记保真 / 断言覆盖强度 / 归因证据」类，**无一项表现为门禁虚绿、阈值放宽或红线被破**（见 §6 零改动核验与 §5）。

---

## 4. 阻塞问题

| # | 位置 | 问题 | 对应 Cx | 修复建议 |
|---|------|------|:--:|---------|
| — | — | **无（0 个阻塞）** | — | — |

---

## 5. 改进建议

> 分级：**中** = 建议在 validate 前/随下轮修复处理；**低** = 可随 v4-2 顺手处理。全部附可执行修复方向。

| # | 级别 | 位置 | 问题 | 对应 Cx | 建议 |
|---|:--:|------|------|:--:|------|
| **I1** | 中 | `docs/v4-supersession-ledger.json#protectedSupersession` | `knownGap` 仍写「TASK-513 …**未完成**…不得视为已取代」，与同对象 `status:"complete-steps-1-8"` 及 `eightSteps[]` 逐条「已落地」**自相矛盾**（R3 未清理 R2 现场）；无门禁校验 | C3 | 删除/改写 `knownGap` 为「R3 已闭环（残余：无）」；给 `knownGap` 加一条「status=complete 时 must be 空或标注历史」的断言 |
| **I2** | 中 | `docs/v4-supersession-ledger.json#pureAdditionFiles` | `test/design-contract.test.ts` 仍带 `status:"pending"` + reason「TASK-514，本轮未完成」，R3 已完成 | C8 | 改为 `status:"complete"`（或删 status 字段）；`supersession-ledger.test.ts` 增加 status 枚举断言 |
| **I3** | 中 | `docs/v4-density-baseline.json#differencesFromV3[0]/[2]` | ① 「测量根：v3 = #panel-main（已退役）→ v4 = document.body」**与事实不符**（`docs/v3-density-baseline.json#caliber.measurementRoot` = `document.body`）；② 「几何口径：v3 = `#log` ≥589px」过时（v3 末轮登记 488px）。该数组是「换口径非放宽」的审计依据 | C4 | 改为「测量根不变（皆 document.body）；v4 新增豁免子树 #stream」；几何 from 改 488px（或注明 589 是 v1 锚） |
| **I4** | 中 | `src/ui/sidepanel/toolbar.ts:116-121` vs `test/ui/l0.mjs:807-830` | 「禁静默第 6 个可点」的真实拦截点是 `render()` 超限抛错，**无 FAIL 段驱动**：l0 ⑫ 只自数元素（`countAfter===6`），既未调用 `render()` 也未观测抛错；且 density 默认上限仍 7 ⇒ 6 个可点不会红 | C2·C8 | 在 l0 ⑫ 注入第 6 个 `[data-toolbar-slot]` 后**触发一次 render** 并断言抛出（或给 `countToolbarClickables`/`MAX_TOOLBAR_CLICKABLES` 加单测负例）；FAIL 段保留字面诊断 |
| **I5** | 中 | `src/ui/sidepanel/theme.ts`（新模块） | 无 node 单测；**EC-CHAT-014（storage 读/写失败 ⇒ 降级 auto 且不阻断）零覆盖**；runtime ⑬ 只覆盖正常三态循环与 data-theme 写入 | C5·C8 | 新增 `test/theme.test.ts`：`nextTheme`/`isThemeState` 边界、`applyTheme` 三态属性、`mountTheme` 注入「抛错 storage」断言降级 auto 且 `click` 不抛 |
| **I6** | 中 | `test/ui/density.mjs:556-576` + `docs/v4-density-baseline.json#knownLimitations[1]` | 「default chars 跨视口 181/181/184 归因于站点摘要 `nowrap+ellipsis` 少显示 3 字」**不足以解释全部差异**：CSS ellipsis 不改变 `textContent`；且**同一 320px 视口**下 `default`(181) 与 `empty`(184) 也差 3。容差取 8 而实测跨视口差仅 3（偏松） | C2 | 根因定位（逐元素 `elementsWithKeys.chars` diff）并在基线登记；把 `charsSpread` 容差收到实测上界（3）；若确为夹具差异则改写判据语义 |
| **I7** | 低 | `build.md §2` / `state.json.scope` / v4 台账 `knownGaps` | 占位宿主记「5 个」，实际 `li[data-transitional-host]` = **4 个**；第 5 个是 `grep -c` 命中的 CSS 注释（`index.html:1115`）；门禁只断言 `hostCount > 0`，不清点 | C1·C8 | 把 5 更正为 4（或补第 5 个宿主）；把 `l0.mjs:240` 改成「等于登记宿主数」以 machine-check v4-4 清零义务 |
| **I8** | 低 | `test/size-baseline.ts#SIDEPANEL_GROWTH_BREAKDOWN.duplicationCheck` | 仍称「输入模块数 **53** … R2 仍是 53 —— 不新增模块」，真实 `dist/build-meta.json` inputs = **57**（新增 toolbar/theme/density-scope/statusbar）；该字段正是「无重复/无冗余」判据 | C4 | 更新为 57 并写明本叶新增 4 个必需模块；`size-growth-evidence.test.ts` 可加 `paths.length` 与登记数相等的断言 |
| **I9** | 低 | `test/size-baseline.ts:831`（`closeoutDeltaBytes`）+ META/v4-1 reason 的本轮逐模块数字 | `closeoutDeltaBytes: 10_217` 与「本轮 sidepanel +1,177 / view-model +398 / risk-rail +1,288 / shell +161 / view-host +1 / disclosure −130 / status-bar −1,627」**无任何门禁断言**（测试只核累计 `rows` 的 `afterBytes`） | C4 | 增加本轮 `rows`（基准=375,102 树）并由 metafile 逐条复核；或显式标注「本轮逐模块数字为登记性叙述，未机核」 |
| **I10** | 低 | `test/ui/density.mjs:1419-1427` + `docs/v4-density-baseline.json#counts` | 「31 登记格」= 9 + 15 + 6 + 1，其中 9 里的 risk×3 无独立实测（由 15 子场景承载）；同一门禁 stage F 打印并比对的是 **28** 格 | C2·C4 | 注明「31 = 28 实测 + 3 名义（risk 行由子场景承载）」或把 headline 改为 28，消除双数并存 |
| **I11** | 低 | `build.md §附录 B.3` ④ | 称「语义由 **18 条** entries 逐条给出」，台账 `V41-R3-E-*` 实测 **47 条**（另：`build.md §2` 宿主计数 5 见 I7） | C8 | 按台账重算并订正 build.md 数字（或声明「以台账为权威、正文数字仅示意」） |
| **I12** | 低 | `src/ui/sidepanel/index.html:1192` | `#theme-toggle` 带 `aria-expanded="false"` 却**无 `aria-controls`**，`theme.ts` 亦从不更新它（循环按钮 ≠ 展开器）⇒ 悬空/失真 ARIA；门禁 ⑧ 只遍历 `[aria-controls]`（反向不覆盖）、⑬ 只读 `aria-pressed` | C1 | 删除该 `aria-expanded`（保留 `aria-pressed` + `data-theme-state` + 文案三通道）；l0 ⑧ 增加「有 aria-expanded 必有 aria-controls」的反向断言 |
| **I13** | 低 | `l0.mjs:775` / 台账 `redlineRemap[1]` / 基线 `differencesFromV3[2]` / `density.mjs:1071-1073` | 过时表述：① 继续以 **589px** 指代 v3 几何锚（v3 末轮为 **488px**）；② `density.mjs` RP-V3-08 注释称扰动对象是 `docs/v3-density-baseline.json`（R3 已改为 v4）；③ `size-budget.test.ts:250` 注释仍以 R1「六处既有模块」描述当前轮 | C3·C8 | 统一改 488px（或注明 589 为 v1 历史锚）；更新 RP-V3-08/size-budget 注释为 v4 口径 |

---

## 6. 零改动 / 复跑核验原文

### 6.1 零改动核验（红线）

```text
$ git diff --stat 187c205..6761447 -- packages/web-cli-plugin/manifest.json \
    packages/web-cli-plugin/src/content packages/web-cli-plugin/src/security \
    packages/web-cli-plugin/src/background packages/web-cli-plugin/src/ui/options \
    packages/web-cli-plugin/test/ui/hardening.mjs packages/web-cli-plugin/test/ui/page-input.mjs \
    packages/web-cli-plugin/test/zero-injection.mjs packages/web-cli-plugin/design
（空 = 零 diff）

$ git diff --stat 187c205..6761447 -- packages/web-cli-plugin/design/
（空 ⇒ 设计稿/shim 未改；L1 用是测试里冻结的 sha256）

$ sha256sum / stat
52a826205553b46a896ccad54225d63ba62f5f7fe7c969a9bc2e655448d5b5f6  dist/content.js   (177,076 B = pin)
5f567d7ededc58183afe4ce45e3293b68204dfbe788dc6b9fb09bdc6e0d13e59  dist/pick-layer.js (33,900 B)
d92935f2ff1d5844f33020737445a4f1530c5c23674e372c91836938cd808847  dist/sidepanel.js  (385,319 B = 登记值)

$ git diff --name-only 187c205..6761447 | grep -v '^.sddu/'
packages/web-cli-plugin/{docs/v4-density-baseline.json,.md,docs/v4-supersession-ledger.json,package.json,
  src/ui/sidepanel/{density-scope,disclosure,index.html,l0/risk-rail,l0/shell,l0/status-bar,
  l2/view-host,sidepanel,statusbar,theme,toolbar,view-model}.ts,
  test/{density-thresholds,design-contract,gate-integrity,insight-tree-hierarchy,l0-disclosure,
  sidepanel-view,size-baseline,size-budget,size-growth-evidence,size-ruling-vol3,supersession-ledger},
  test/ui/{binding,density-metrics.d.mts,density-metrics,density,insight,journey,l0,l1-reverse,l1,
  l2-reverse,l2}.mjs}
（无 manifest / content / security / background / options / dist 文件）
```

### 6.2 保护段 pin 独立复算（Python，非门禁代码）

```text
journey NEW:   start_byte=43054 end_byte=55259 lines=194 sha256=e2b500df9049f69979892076ad798fabfc4a638a3403902c7e57d7f1e1ac244f
journey OLD@187c205: start_byte=42766 end_byte=54004 lines=185 sha256=6b45c3fa4027f75a97bb84e0f5d80446a8c316ca4cd6dd83b2fe939c0eb6ba63
binding NEW:   start_byte=107780 end_byte=115930 lines=184 sha256=be9ad0e983670137d4233349aede1cae0f0b6fdf26a050083761d30d52c6b936
binding OLD@187c205: （与 NEW 逐字节相同）
⇒ 与台账 protectedRanges 四项（startByte/endByte/lineCount/sha256）逐字一致

段内 check(: journey 段 old=22 new=22；全文件 old=170 new=170（无断言删除）
```

### 6.3 门禁复跑（本机真实执行）

```text
$ npm test                      → tests 849 / pass 849 / fail 0 / skipped 0   （EXIT=0）
$ npm run test:supersession     → tests 20  / pass 20  / fail 0               （EXIT=0）
$ npm run test:gate-integrity   → tests 12  / pass 12  / fail 0               （EXIT=0）
$ npm run test:design-contract  → tests 6   / pass 6   / fail 0               （EXIT=0）
$ node test/ui/density.mjs      → density 门禁: 169 passed / 0 failed；阶段 F 28 格 + 748px ≥ 488 + 385,319B ≤ 404,584B（EXIT=0）
$ node test/ui/journey.mjs      → UI journey PASS — 167 assertions；#15a/#15b/#15c/#15d/#15e 全 ✔（EXIT=0）
$ node design/ui-redesign/option-f-shim.mjs → 60 passed / 0 failed
```

### 6.4 体积归因独立核对（真实 metafile）

```text
dist/build-meta.json: outputs[...sidepanel.js].bytes = 385319
toolbar 3111 · theme 2937 · density-scope 1783 · statusbar 976 · l0/status-bar 67 · disclosure 5188
l0/risk-rail 7698 · l0/shell 4158 · l2/view-host 3207 · view-model 19654 · sidepanel 62393
rows Δ 之和 89,496 + 未归因 598 == 累计 90,094 == 385,319 − 295,225 ✔
inputs 条目数 = 57（≠ duplicationCheck 登记的 53，见 I8）
```

---

## 7. 未能验证的项（如实列出，未用推断填坑）

1. **未逐一复跑** `test:l0` / `test:l1` / `test:l2` / `test:insight` / `test:binding` / `test:hardening` / `test:e2e` / `test:zero-injection` / `test:page-input` / `test:l1-reverse` / `test:l2-reverse`（内存/时间约束）：其运行期结论**引用** `/tmp/opencode/v4-gate-logs/v4-1-r3/*.log`（全量、未截断）与 build.md §B.6。
2. **未复跑 RP-V4-01~07 的 Chromium 驱动**（每条约一次 Chromium 运行）：本轮只读其日志（`density-reverse-RP-V4-0{1..7}.log`，各含 FAIL 段字面诊断 + 还原段）并核 `gate-integrity.test.ts` 的 R4b 模式断言（8 条）确实存在于源码。
3. **I6 的根因未定位**：chars 的「3 字」差异的**具体元素**未实测（需在 Chromium 内 dump `elementsWithKeys.chars`）；报告中的「同视口 fixture 差异」是**基线数字的比较结论**（default@320=181 vs empty@320=184），非运行时复现。
4. **I4 的缺陷未运行时复现**：`toolbar.ts` 抛错守卫「无 FAIL 段」是**静态推演**（l0 ⑫ 源码未调用 render/未断言抛出）。
5. 未核对 `firstRun` 档在后续叶的余量、未核对 `designCaliber` 的 E/D 稿复算（属历史登记，不参与本叶验收）。
6. 未审计 `dist/sidepanel.js` 增量构成以外的其它产物（SW bundle 未动，`src/background/**` 零 diff 已核）。

---

## 8. 结论

**结论**: ⚠️ **有条件通过**（0 阻塞，13 改进项，其中 5 项中severity）

| 指标 | 结果 |
|------|------|
| 审查通过率 | 3 / 8 = **37.5%**（警告 5，失败 0） |
| 阻塞问题数 | **0** |
| 规范符合性偏差 | **2** 项（AC-CHAT-005 无「零撤销控件」专断言；EC-CHAT-014 无测试）+ 3 项「登记保真数字级」需订正（I3/I8/I11） |
| 可进入 validate | **是**（0 阻塞；红线零改动；门禁与反证无虚绿；取代台账的字节级 pin 经独立复算） |

**理由**：
1. **红线与不动面经得起打假**：`content.js`（177,076 B / sha `52a82620…`）、`pick-layer.js`（33,900 B）、`manifest.json`、`src/content/**`、判定链、`src/background/**` 逐项零 diff；设计稿/shim 零改动且 sha256 与冻结常量一致。
2. **取代型变更经独立复算**：journey 新 pin 与 old pin 的字节/sha/行数由 Python 独立复算全等；段内与全文件 `check(` 计数零降（22/22、170/170）；`#15b` 门槛 45→65 **收紧**、`#15c` 法四显式取代；binding 保护段逐字节不变；`assertChromeNotInStream`/豁免单源/RP-V4-01~07 的 FAIL 段诊断逐条可读。
3. **密度与门禁自身无虚绿**：单源字面量仅一处 + 「第二声明点」扫描可 FAIL；我复跑 density 169/0（phase F 28 格 + 几何下界 + 产物字节）；`npm test` 849/849 且 **skipped 0**（体积归因 metafile 断言确实执行）。
4. **但存在 13 项非阻塞缺陷**，集中四类：① 取代台账/基线的**字段保真**（stale `knownGap`、`pending`、错误「测量根」、过时 589px，I1/I2/I3/I13）；② **断言覆盖强度**（chars 红线降级且归因未证、toolbar 抛错守卫无 FAIL 段、31 vs 28 计数，I6/I4/I10）；③ **新模块错误路径无测试**（EC-CHAT-014，I5）；④ **数字化保真**（宿主 5 vs 4、inputs 53 vs 57、「18 条 entries」vs 47，I7/I8/I9/I11）。它们不改变「本叶验收锚点已达标、可进入 validate」的事实判定，但按「有条件通过」处理：**建议先处理 I1~I6（尤其中severity 五条）再进入 `@sddu-validate`**；I7~I13 可随 v4-2 顺手收口。

## 9. 状态文件关联提醒（§8.2）

本叶 `state.json` 本轮由 review Agent 更新：`phase: builded → reviewed`，`files` 补 `build`/`review`/`reviewReport`，`phaseHistory` 追加 `reviewed` 条目（`updatedAt` 同步）。**注意**：本 Agent 无 `sddu_update_state` 工具，此次为**直接编辑**该 JSON；若状态机有权威口径，请以状态机复算为准。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1）：C1~C8 逐项结论；AC 逐条映射；I1~I13 改进项（中 5 / 低 8）；0 阻塞 / 8 项中 3 通过；保护段 pin 独立复算原文；6 项门禁本机复跑原文；metafile 独立核对；未验证项如实登记；结论 ⚠️ 有条件通过 | 2026-09-19 | SDDU Review Agent |
