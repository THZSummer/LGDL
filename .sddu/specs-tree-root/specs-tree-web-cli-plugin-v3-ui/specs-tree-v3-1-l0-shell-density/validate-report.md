# 验证报告：specs-tree-v3-1-l0-shell-density

> **文档定位**: SDDU 验证报告 — 逐项记录自主验证的执行结果，作为工作流终点
> **验证策略**: `validate.md`（V1~V12 验证场景 +
> 五维度指引；**独立复现原则**）
> **前置依赖**: `validate.md`、本叶 `spec.md` v1.0、父 `../spec.md`（§8.1~8.2 / §9 权威口径）、`build.md` v1.1、`review-report.md` R1（22 通过 / 16 改进 / **0 阻塞**，passed）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-16
> **验证轮次**: R1（首轮）
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-16
> **更新说明**: 初始创建（R1 全量执行：**独立复现**密度/风险/反证/台账/红线/门禁；发现 8 项被验证方未登记的问题）

---

## 0. 关键结论摘要（先读这一段）

| # | 问题 | 结论 |
|---|------|------|
| 1 | 被验证方声称的 **25 个密度登记格**（9 强制 + 15 风险 + worst） | ✅ **逐格完全一致**（我自写口径独立复现，0 个差值） |
| 2 | 「同源硬证明」 | ✅ **成立**，但**仅对 E 稿自带的 `window.__density()` 成立**（我自写口径 ≡ 稿件自带函数，逐项相等）；❌ **不能复现"公布数字"** E `7/10/47/6` / D `80/144/391/5`（我实测 E `7/12/51/6`、D `79/145/392/5`，落差已在基线登记） |
| 3 | 风险位是否存在被验证方未覆盖的隐藏路径 | ⚠️ **不存在「产品自身可隐藏」的路径**（控制器白名单抛错 / 祖先闭包探针 / 全收起 / L2 打开 全部实测拦住）；但发现**探针覆盖面缺口** F7（`visibility:hidden`/`opacity:0` 祖先不被检出，当前产物无此路径） |
| 4 | 反证是否真实 | ✅ 6 条反证**全部独立重跑成功**：扰动均落在门禁真读路径上；FAIL 段真 FAIL；还原段 sha256 **逐字节复原**（RP-05 副本 65≥65、RP-06 content.js `52a82620…`、I1 源文件 sha256 复原且重建回 295,225） |
| 5 | 台账是否存在未被覆盖的被修改区间 | ⚠️ **存在 3 条未逐行登记的删除行**（F1：门禁按 *hunk 重叠* 而非 *按行包含* 判定，`size-budget.test.ts` old 272/273、`insight-archive.test.ts` old 771）→ AC-V3-011「任何删除行必须命中台账」的**机器强制力不足**；无功能/安全影响 |
| 6 | 门禁复跑 | ✅ 11 条**严格串行**复跑全部**退出码 0**，计数与声称**逐项一致**（732/11/105/134/167/108/192/24/PASS） |
| 7 | 未验证项 | ⏳ 人工面 6 项（headless 不可合成）如实登记「未执行」；**不计入 PASS** |
| 8 | 本次独立发现的新问题 | **8 项**（0 阻塞；1 项中severity = 体积 AC 数值与 spec 登记值矛盾；其余为低severity：台账逐行覆盖 3 处、台账 3 个登记数字不可复现、build.md §1 台账计数失真、「24 登记格」高估 2 格、FR-V3-015「各带计数」未满足、风险探针覆盖面缺口、阶段 F 检查名与断言不等价） |

**结论：⚠️ 有条件通过（0 阻塞）** —— 核心验收锚点（AC-V3-001~010 密度/风险/可发现性）经**独立复现**全部达标；红线零改动经独立 hash 复核成立；但存在 1 项需编排器/作者显式裁决的 **spec 与产物数值矛盾**（AC-V3-016 的 `≤279,825` 与本叶 `state.json#gateSet` 的同一数字，已被显式重登记为 `306,099`）与 7 项低severity 登记/门禁强度问题。

---

## 1. 验证概要

| 维度 | 数值 |
|------|:--:|
| 验证项总数 | **12**（V1~V12）+ 8 条独立新增检查 = **20** |
| 通过 | **18** |
| 失败（非阻塞偏差） | **2**（V6 台账逐行覆盖 partial、V11 数字漂移） |
| 无法执行 | **1**（V12 人工面：headless 不可合成，如实登记 ⏳） |
| 阻塞问题 | **0** |

---

## 2. 逐项验证结果（V1~V12）

| # | 验证对象 | 验证步骤（摘要） | 预期结果 | 实测结果 | 判定 |
|---|---------|---------|---------|---------|:--:|
| V1 | 密度 3 档 × 3 视口（9 强制格） | 自写口径探针（Chromium 真产物，default/firstRun × 320/400/520）+ 夹具幂等复测 | 9 格 ≤ 上限且 == 登记值 | default `7/6/18/6`·`7/7/19/6`·`7/7/19/6`；firstRun `7/12/25/6` ×3；**与登记值 0 差值**；幂等 true | ✅ |
| V2 | 风险 5 子场景 × 3 视口（15 格）+ worst + 增量归属 | 同上；自写增量归属（按 key 比对 base/risk） | 15 格 ≤ 17/35；归属违规 0 | 15 格全部命中登记值；worst `9/13/25/6`；**myΔ违规 = 0（15/15）** | ✅ |
| V3 | 风险位永不折叠 + 主动隐藏对抗 | 祖先闭包探针 + 7 条隐藏尝试 + 破坏性确认闭包 | 无「藏起来且不报」路径 | 5 类风险行全可见；`close('risk-rail')` 抛错；`collapseAll()` 后仍可见；L2 打开仍可见；3 条硬改路径均被探针检出；破坏性确认 3 控件 `hiddenAnc=[]` 且不在 `#l1-more`；**发现 F7 探针缺口（visibility/opacity）** | ✅（含 F7） |
| V4 | 口径同源 + 阈值单源 + 反作弊 | 自写口径测 E/D 稿 + E 稿自带 `__density()` + 常量 pin + 禁用 API | 同源逐项相等；阈值逐字 | E：自写 `7/12/51/6/375` ≡ 稿件 `__density()` `interactive7 chars375 lines12 blocks51 regions6`（**逐项相等**）；D `79/145/392/5`；阈值 7/15·9/20·17/35 逐字一致；7 条 caliber pin 全部命中；禁用 API 零命中 | ✅ |
| V5 | 反证 RP-01/03/05/06/08 + I1 | 独立重跑 + 扰动位置核验 + sha256 复原 | 全 FAIL→还原→PASS | 详见 §3.4；6/6 成立 | ✅ |
| V6 | 台账非橡皮图章 | 逐 **行** 归属 + newTitle 定位 + oldTitle 消失 + protectedRanges 字节 hash + zeroDiff + 计数 | 无未登记修改 | newTitle 15/15 可定位；oldTitle 全部消失；protectedRanges 2/2 sha256 独立复算一致（11,238B/185 行、8,150B/184 行）；zeroDiffFiles 11/11 真 0 diff；**`modifiedRanges` 漏登 3 条删除行（F1）** | ⚠️ |
| V7 | 体积 + 红线零改动 + 构建可复现 | sha256/stat/git diff + 重建 | 全零漂移 | content.js `177,076` / `52a82620…`（重建后**字节与 hash 均复原**）；sidepanel.js `295,225`；manifest/options/base/依赖 **0 diff**；判定链 + content 三 hash = pin；**发现 F8（ceiling 与 spec 登记值矛盾）** | ✅（含 F8） |
| V8 | 门禁串行 + 计数 | 11 条串行复跑 | 全 0 且计数 ≥ 下界 | 全 0；计数逐项一致（§3.3） | ✅ |
| V9 | L0 行为契约（FR-V3-010~015/019/020/021/023/024/026） | 自写 DOM 探针 | 逐条成立 | 除 **FR-V3-015「各带计数」未满足（F6，`设置` 入口无计数）** 外全部成立；N 可派生（5 选项→N=4、3 选项→N=2） | ⚠️ |
| V10 | EC 边界抽查（002/003/005/008/009/010/015） | 自写探针 | 逐条成立 | 320px `scrollWidth=320=innerWidth`；常驻元素集合 320≡400（差集为空）；明暗 token 不同且展开态保持；未授权/探测中禁用 + 零注入文案；硬底线零允许控件；密度门禁超预算可 FAIL（RP-01/02 实跑） | ✅ |
| V11 | 文档/台账 vs 实测数字漂移 | 逐数字对照 | 无不一致 | **发现 4 处数字不一致（F2/F3/F4/F5）** + 1 处 spec 数值矛盾（F8） | ⚠️ |
| V12 | 人工面如实登记 | 文档核对 | 二值且不冒充 PASS | build.md §3.2 六项全为 `⏳ 未执行`；未冒充 PASS | ✅（**⏳ 未执行**，不计入 PASS 总量） |

---

## 3. 验证详细信息

### 3.1 测试覆盖

| 需求 ID | spec 描述 | 测试/门禁落点 | 执行结果 | 覆盖率 |
|---------|----------|--------------|:--:|:--:|
| FR-V3-010 | 三件事三区默认态可见 | `l0.mjs` ① + 自写探针（三区可见 + origin 可读） | ✅ | 已覆盖 |
| FR-V3-011 | 决策卡唯一 / 推荐 ≤2 / N 真值可复算 | `l0.mjs` ② + 自写探针（N=3=data-count；**改选项列表 → N 4→2 随之变**） | ✅ | 已覆盖（**行为断言**） |
| FR-V3-012 | 末项逐字 + 兜底框就地展开/收起 | `l0-disclosure.test.ts` + `l0.mjs` + 自写探针（末项逐字、为 `#l1-more-options` 末位、hidden→shown→hidden） | ✅ | 已覆盖 |
| FR-V3-013 | 默认态可见输入框 = 0 | `l0.mjs` ③ + 自写探针（实测 `[]`） | ✅ | 已覆盖 |
| FR-V3-014 | 拾取入口 + 未授权/探测中禁用 + 零注入 | `density.mjs` 阶段 C 尾 + 自写探针（两状态各 1 次） | ✅ | 已覆盖 |
| FR-V3-015 | 状态栏一行 + ≤4 入口**各带计数** | `status-bar.ts` + `l0.mjs` ⑥ | ⚠️ `设置` 入口**无计数**（`count:-1 → data-count="n/a"`），且 `l0.mjs` ⑥ 对豁免目标的断言退化为「计数 **或** 标签」 | **部分覆盖**（F6） |
| FR-V3-016 | 风险位独立常驻 | `density.mjs` 阶段 C + `l0.mjs` ④ + 自写探针（`#risk-rail.parentElement === body`） | ✅ | 已覆盖 |
| FR-V3-017 | 三通道（文字/徽标/图标） | `l0-disclosure.test.ts#assertThreeChannels` + `l0.mjs` ④⑨ + 自写探针 | ✅ | 已覆盖 |
| FR-V3-018 | 破坏性确认不参与折叠 | `l0.mjs` ⑤ + 自写对抗（3 控件 `hiddenAnc=[]`、不在 `#l1-more`） | ✅ | 已覆盖 |
| FR-V3-019 | 硬底线零允许控件 + 解释 ≤1 次 | `l0.mjs` + 自写探针（风险位内可点控件 0、`allowCount=0`） | ✅ | 已覆盖 |
| FR-V3-020 | 可发现性遍历 | `l0.mjs` ⑥（遍历全部 `[aria-controls]`，实测 10 个）+ 自写遍历（可见 4 个全部达标） | ✅ | 已覆盖 |
| FR-V3-021 | L1 ≤1 / L2 ≤2 步可达 + 默认 hidden | `l0.mjs` ⑥ reach + 静态契约 `density-thresholds.test.ts` | ✅ | 已覆盖 |
| FR-V3-022 | 三档 × 三视口密度预算 | `density.mjs` 阶段 B/C + **自写口径复核** | ✅ | 已覆盖 |
| FR-V3-023 | 展开态记忆 | `l0-disclosure.test.ts` 往返 + `window.__v3.disclosure.snapshot/restore` | ✅ | 已覆盖 |
| FR-V3-024 | 收起一律 `hidden` + ARIA 成对 | `disclosure.ts` 抛错语义 + 单测 + 静态门禁 + 自写遍历 | ✅ | 已覆盖 |
| FR-V3-026 | 明暗双主题可读 | `l0.mjs` ⑨（22 条）+ 自写探针（token 变化 + 展开态保持） | ✅ | 已覆盖 |

**FR 覆盖率：16/16 = 100%**（1 项部分覆盖：FR-V3-015 的「各带计数」）。

| NFR | 落点 | 结果 |
|-----|------|:--:|
| NFR-V3-001 密度预算 | `density.mjs`（9 强制格）+ 自写复核 | ✅ |
| NFR-V3-002 可机器复算 + 同源 | `density.mjs` 阶段 A + `density-thresholds.test.ts` + 自写同源复算 | ✅ |
| NFR-V3-005 体积基线/ceiling | `size-budget.test.ts` + `insight-archive.test.ts` + 自写字节/hash 复核 | ⚠️ 合规但 **AC 数值被突破**（F8） |
| NFR-V3-006 manifest 零新增 | `supersession-ledger.test.ts#zeroDiffFiles` + 自写 `git diff` | ✅ |
| NFR-V3-009 双主题 | `l0.mjs` ⑨ + 自写探针 | ✅ |
| NFR-V3-010 320–560 零溢出 | `l0.mjs` + `insight.mjs` + 自写探针（320/400） | ✅ |
| NFR-V3-011 无障碍 | `disclosure.ts` + 单测 + 静态 + 自写 ARIA 遍历 | ✅ |
| NFR-V3-012 门禁串行 + 日志 | 本轮 11 条串行、日志全量落盘（无 tail 截断） | ✅ |
| NFR-V3-013 门禁能真 FAIL | RP-V3-01/02/03/04/05/06/08 + I1 独立重跑 | ✅ |
| NFR-V3-014 断言零删除零降级 | `supersession-ledger.test.ts` + **自写逐行审计** | ⚠️ 3 条删除行未逐行登记（F1） |
| NFR-V3-015 人工面如实登记 | build.md §3.2 + 本报告 §5 | ✅（⏳ 未执行） |
| NFR-V3-017 零新增依赖 / 不改 base | `git diff`（依赖段 / `web-cli-base/**`） | ✅ |
| NFR-V3-018 sha256 pin / catch 不吞 | 判定链 + `src/content/**` 三 hash；`_v3-helpers.mjs#finish()` 失败即非 0 退出 | ✅ |

**NFR 覆盖率：13/13 = 100%**（2 项部分：NFR-V3-005 数值矛盾、NFR-V3-014 逐行覆盖）。

### 3.2 接口与数据（DOM / ARIA 契约，替代本 Feature 无网络 API 的接口面）

| 检查项 | spec 要求 | 实测结果 | 一致？ |
|--------|----------|---------|:--:|
| 默认态可见文本输入框 | FR-V3-013：= 0（含 `input:not([type])`/`textarea`） | `[]` | ✅ |
| 决策卡数 / 推荐选项数 / N | FR-V3-011：1 / ≤2 / 真值可复算 | `1 / 2 / N=3（folded 2 + 末项 1，== data-count）`；改选项列表（5→3）→ `N 4→2` | ✅ |
| 末项文案与位置 | FR-V3-012：逐字「其他…（我来描述）」+ 末位 | `其他…（我来描述）`，`#l1-more-options.lastElementChild.id === 'ask-other'` | ✅ |
| 状态栏高度 | FR-V3-015：一行 | 30.39px（= 18.4 行盒 × 1 + 10px padding + 边框）→ **单行文本** | ✅ |
| L2 入口 | FR-V3-015：≤4 个，**各带计数** | 4 个；`连接树 · 0` / `命令目录 · 0` / `审计 · 0` / **`设置`（无计数）** | ⚠️（F6） |
| `[aria-controls]` 遍历 | AC-V3-010：文字 + 成对 + 目标含摘要/计数 | 总 10 个；可见 4 个全部 `aria-expanded` 成对 + 非空标签 + 目标存在；空摘要目标 = `view-host`（骨架期**显式登记豁免**） | ✅ |
| 硬底线风险位 | FR-V3-019：零「允许/放行」控件 | 风险位内可点控件 `0`；文案含「不提供「允许」选项」 | ✅ |
| 破坏性确认闭包 | FR-V3-018/EC-V3-015 | `#confirm` / `#confirm-allow` / `#confirm-deny` 三者 `hiddenAnc=[]`、`inMoreOptions=false` | ✅ |
| `#risk-rail` 定位 | FR-V3-016：独立分区 + 最上层 | `#risk-rail.parentElement === document.body`（body 首个子元素） | ✅ |
| C4 常驻分区数 | AC-V3-007：只登记不上限 | 6（`risk-rail` / `panel-top` / `panel-main` / `l0-statusbar` / `panel-bottom` / `<script>`） | ✅（已登记） |

### 3.3 构建脚本与门禁（**严格串行**，一次一个 Chromium，日志全量落盘 `/tmp/opencode/v3-validate/`）

| # | 命令 | 退出码 | 实测计数 | 声称 | 日志 |
|:--:|---|:--:|---|---|---|
| 1 | `npx tsc --noEmit` | **0** | 0 error | 0 error | `10-typecheck.log` |
| 2 | `npm run build` | **0** | content `177,076` / sidepanel `295,225` | 同 | `11-build.log` |
| 3 | `npm test` | **0** | tests **732** / pass 732 / fail 0 / skipped 0 | 732 | `12-npm-test.log` |
| 4 | `npm run test:supersession` | **0** | tests **11** / pass 11 | 11 | `13-supersession.log` |
| 5 | `npm run test:density` | **0** | **105** passed / 0 failed（阶段 A~F） | 105 | `20-test-density.log` |
| 6 | `npm run test:l0` | **0** | **134** passed / 0 failed | 134 | `23-test_l0.log` |
| 7 | `npm run test:ui` | **0** | **167** assertions | 167 | `23-test_ui.log` |
| 8 | `npm run test:insight` | **0** | **108** assertions | 108 | `24-test_insight.log` |
| 9 | `npm run test:binding` | **0** | **192** assertions | 192 | `24-test_binding.log` |
| 10 | `npm run test:hardening` | **0** | **24** assertions | 24 | `25-test_hardening.log` |
| 11 | `npm run test:e2e` | **0** | PASS | PASS | `26-test_e2e.log` |

**构建可复现性（独立复算）**：`npm run build` 前后 `dist/content.js` **字节与 sha256 完全一致**（`177,076` / `52a8262055…`）；`dist/sidepanel.js` 字节一致（`295,225`，sha256 因构建时间戳注入而不同，属预期）。`dist/**` 为 gitignored，工作区 `git status` 始终为空。

**串行纪律核验**：11 条按上表顺序逐条执行，任一时刻只有 1 个 Chromium 进程；无并发；日志完整落盘（无 tail 截断）。

### 3.4 性能与边界（反证 + EC）

**反证（独立重跑，扰动位置 + FAIL 段 + 还原段三段核验）**

| 反证 | 扰动位置（是否门禁真读路径） | FAIL 段实测 | 还原段实测 | 判定 |
|---|---|---|:--:|---|:--:|
| **RP-V3-01**（+1 可点） | 真 DOM：`document.body.appendChild(<button id=rp01>)` —— 正是门禁测量根 | `✖ C1 8 > 7`（FAIL） | 移除后 7 → PASS；6/0 退出 0 | ✅ |
| **RP-V3-03**（CSS 隐身不降计数） | 真元素 `#l0-ref-toggle` 的 `style`（真实计入 C1 的元素） | 4 变体计数**均不下降**；`hidden=true` 才降 1 | 还原后 7；10/0 退出 0；**我用自写口径独立复现同一结论** | ✅ |
| **RP-V3-05**（删 1 条断言） | `--files-override` 副本（门禁**同一** `countChecks` + 台账下界） | 副本 64 < 65 → `AssertionError`（退出 1） | 逐字节副本 65 ≥ 65 → 11/0（退出 0）；原文件 sha256 `d5c55fe4…` 未变 | ✅ |
| **RP-V3-06**（`content.js` +1B） | 真产物 `dist/content.js`（体积门禁真读） | `177,077 > 177,076` → 2 条断言 FAIL（退出 1） | 还原 → `177,076` / `52a8262055…` → 16/0（退出 0） | ✅ |
| **RP-V3-08**（篡改基线） | **真** `docs/v3-density-baseline.json`（阶段 F 真读，非副本） | `default@400.clickables: 实测 7 ≠ 登记 8` → FAIL | 还原后 sha256 与 `git HEAD` 一致 → PASS；8/0 | ✅ |
| **I1 反证**（移除修复） | 真源 `src/ui/sidepanel/l0/decision-card.ts` 早退分支 → 重建 → 真门禁 | `✖ ② I1：无卡态第二次 render 后 #l0-more 仍 hidden`（`moreHidden:false`）→ 133/1（退出 1） | 还原源文件（sha256 `2e14e49d…` 复原）→ 重建 → sidepanel 回 **295,225** → 134/0（退出 0）；`git status` 空 | ✅ |

> 与 build 声称的差异（如实登记）：build 的 `RP-I1.log` 记 2 条 FAIL，我复现为 **1 条 FAIL** —— 我的扰动只还原了**早退分支**（`applyMore()` → `foldedCount <= 0`），未同时还原 `shell.ts` 的双写入者；因此只有「第二次 render」路径暴露。**结论不变**（门禁真能捕获该缺陷）。

**EC 边界抽查（自写探针）**

| EC | 要求 | 实测 | 达标？ |
|---|---|:--:|:--:|
| EC-V3-008 | 320px 零水平溢出 + 不删常驻元素 | `scrollWidth 320 ≤ innerWidth 320`；常驻元素集合 320≡400（双向差集均空） | ✅ |
| EC-V3-009 | 主题切换可读 + 展开态不重置 | 明 `rgb(255,255,255)` / 暗 `rgb(11,17,32)`；`#topbar` 展开态切换前后均 `true` | ✅ |
| EC-V3-002 | 硬底线零允许控件 | 见 §3.2 | ✅ |
| EC-V3-003 | 未授权零注入提示 + 拾取禁用 | `pickDisabled=true` + 风险位含「页面侧零注入」 | ✅ |
| EC-V3-005 | 探测中禁用 + 不发命令 | `pickDisabled=true` | ✅ |
| EC-V3-010 | 超预算门禁 FAIL | RP-01（+1 可点）/ RP-02（阈值 7→6）实跑 FAIL | ✅ |
| EC-V3-015 | 破坏性确认期间全折叠仍可见 | `collapseAll()` 后风险行仍可见；`#confirm` 闭包无折叠容器 | ✅ |

### 3.5 漂移检测

| 漂移类型 | 检测方法 | 结果 |
|---------|-------------|------|
| 孤立代码（有代码无需求） | 逐导出符号引用图（`src/ui/sidepanel/{disclosure,l0/*}.ts`） | ✅ 无真死代码（I3/I14 已清理 `partitionDecisionOptions` / `MAX_VISIBLE_RECOMMENDED` / `hasDiff` / `RISK_DETAIL_ENTRY_LABEL`；余下「仅本文件引用」的导出均为内部使用或类型） |
| 需求缺失（有需求无代码） | FR-V3-010~024 + 026 逐项映射 | ✅ 16/16 有实现（FR-V3-015 的「各带计数」部分缺失，F6） |
| 规格漂移（spec/plan/tasks 被修改） | `git diff 3e370fd HEAD -- spec.md plan.md tasks.md tasks.json`（含父 spec/plan/discovery） | ✅ **0 diff**（设计稿 `design/**` 亦为 0 diff） |
| 代码面漂移（新增/修改文件） | `git diff 24a4f38..HEAD --name-status` | ✅ 与 build.md §2.1/§2.2 的 16 新增 / 11 修改一致（16/11 与 I16 订正后一致） |

---

## 4. 验证脚本执行记录（ADR-003）

> 约定路径：`/tmp/opencode/v3-validate/`（`/tmp/**`，**不入版本库**；本机 `/tmp/sddu-validate-*` 未被占用，改用编排器指定的 `v3-validate` 目录）

| 脚本 / 日志 | 用途 | 对应场景 | 退出码 | 关键输出 |
|---|---|:--:|:--:|---|
| `probe-lib.mjs` | **自写** C1~C4 度量实现（按父 §9.1 原文重写）+ 自写风险祖先闭包探针 + 夹具驱动 | V1~V4 | — | 与 `test/ui/density-metrics.mjs` **无 import 关系** |
| `probe-density.mjs` | 25 个登记格独立复现 + 夹具非对称复核 + 7 条风险隐藏对抗 + 破坏性确认闭包 + E/D 稿同源 | V1/V2/V3/V4 | 0 | `ALL 25 CELLS MATCH`；`myΔ违规=0`；E 稿同源逐项相等 |
| `probe-ec.mjs` | FR/EC DOM-ARIA 行为探针 + 独立 RP-03 + 探针缺口搜索 | V9/V10 | 0 | 18 检查 / **2 FAIL**（FR-V3-015 计数、探针缺口 F7） |
| `my-probe-results.json` / `my-ec-results.json` | 上述两探针的机读结果 | V1~V4/V9/V10 | — | 原始数字留档 |
| `12-npm-test.log` … `26-test_e2e.log` | 11 条门禁串行日志（全量，无截断） | V8 | 0 | §3.3 表 |
| `21-RP-V3-0{1,3,8}.log` / `27-RP-V3-05-{fail,pass}.log` / `28-RP-V3-06-{fail,pass}.log` / `29-RP-I1-l0-{fail,pass}.log` | 反证 FAIL→还原→PASS 全过程 | V5 | 1 / 0（成对） | §3.4 表 |
| `30-ledger-audit.txt` / `31-ledger-audit2.txt` | 独立台账审计（逐行归属 / newTitle / protectedRanges / zeroDiff / 计数） | V6 | — | 3 条未登记删除行（F1）；3 个登记数字不可复现（F2/F3） |
| `40-gate-summary.md` | 门禁复跑汇总表 | V8 | — | 见 §3.3 |

---

## 5. 未验证项（如实列出，**不计入 PASS**）

| # | 项 | 原因 | 状态 |
|---|---|---|:--:|
| 1 | 主题观感（明暗两套真实视觉观感） | headless 不可合成（主观观感） | ⏳ 未执行 |
| 2 | 动画体感（过渡 / 滚动手感） | headless 不可合成 | ⏳ 未执行 |
| 3 | 窄栏真实体感（320px 真实侧栏拖拽） | 本验证以 `Emulation.setDeviceMetricsOverride` 模拟，非真实拖拽 | ⏳ 未执行 |
| 4 | 多显示器 / 高 DPI | 环境无多屏 / 高 DPI | ⏳ 未执行 |
| 5 | 原生权限弹窗的真实键盘/鼠标体感 | headless 无原生弹窗（binding/e2e 日志已登记该偏差） | ⏳ 未执行 |
| 6 | 真实 Chromium 侧栏（非 tab 打开）中的输入法 / 焦点真实体感 | 门禁以 `chrome.tabs.create(sidepanel.html)` 打开，非真实侧栏 | ⏳ 未执行 |

> 与 build.md §3.2 的 6 项**逐项一致**；无冒充 PASS。

---

## 6. 独立发现的新问题（被验证方未登记；本报告最有价值的部分）

> 分级：🔴 阻塞 / 🟠 中 / 🟡 低 / 🔵 观察。**本轮 0 🔴**。

| # | 级别 | 位置 | 问题 | 证据 | 建议 |
|---|:--:|---|---|---|---|
| **F1** | 🟠 | `test/supersession-ledger.test.ts:273-281`（覆盖率判定）；`docs/v3-supersession-ledger.json#modifiedRanges` | AC-V3-011 要求「受保护文件的**任何删除行**必须命中台账」，但门禁实现为 **hunk 与已登记区间的「重叠」判定**（`hunk.end >= range.start && hunk.start <= range.end`），不是**按行包含**。结果：**3 条删除行未被逐条登记** —— `test/size-budget.test.ts` old **272**（测试标题行）与 **273**（`assert.equal(SIDEPANEL_CEILING, Math.floor(SIDEPANEL_BASELINE_BYTES * (1 + SIDEPANEL_BASELINE_TOLERANCE)));`）、`test/insight-archive.test.ts` old **771**（`assert.equal(SIDEPANEL_CEILING, Math.floor(SIDEPANEL_BASELINE_BYTES * 1.05));`），仅因同 hunk 相邻行已登记而整 hunk 通过 | `30-ledger-audit.txt` / `31-ledger-audit2.txt`（独立复算）；门禁 `✔ 既有门禁文件零删除` 仍 PASS | ① 判定改为**按行**：登记行集合必须 ⊇ 实际删除行集合（`deletedLinesText` 逐行匹配或行号集合包含）；② 按实测补齐上述 3 行的 `modifiedRanges` 条目（语义上已由 V31-S11/S12 取代，属登记补齐而非放宽） |
| **F2** | 🟡 | `docs/v3-supersession-ledger.json#counts.nodeTestRuntime.currentRuntime` | 登记 **731**，实测（`npm test` 与我本轮运行、以及修复轮 `npm-test.log`）**732** → 登记值与产物差 1 | `grep "^ℹ tests" 12-npm-test.log` = 732；`/tmp/opencode/v3-gate-logs/v3-1-fix/npm-test.log` = 732；build.md §5.3 = 732 | 订正为 732（方向不越界，仍 ≥ 646 下界） |
| **F3** | 🟡 | `docs/v3-supersession-ledger.json#staticCalibers.nodeTestStatic` | 登记「含点号前缀 830 / 排除点号前缀 740」，**不可复现**：我按两种读法实测 `\btest\(` = **833**、`(?<![\w.])test\(` = **741**（均 ≥ 下界 646，方向安全） | `31-ledger-audit2.txt` | 重新复算并订正；或写明确切正则（当前 note 未给出可复算的正则，导致口径不可核） |
| **F4** | 🟡 | `build.md §1`（取代台账行） | 记「`modifiedRanges`（26 条）+ `entries`（9 条）+ `zeroDiffFiles`（12 项）」，实际为 **37 / 15 / 11** —— §5 记录 I4 增补了条目，但 §1 未同步（I16 只订正了文件计数 13/12→16/11） | `python3` 复算台账（30-ledger-audit.txt） | §1 的台账计数同步到最终值，或标注为「v3-1 首轮快照 / 见 §5」 |
| **F5** | 🟡 | `test/ui/density.mjs`（阶段 F 日志与注释）、`build.md §5.1 I8` | 「**24** 登记格」高估 **2**：阶段 F 实际机器比对 **22** 格 = 6（default/firstRun × 3）+ 15（风险子场景）+ 1（worst）；「24」= 9 强制格（含 3 个从未单独测量的 risk 视口格）+ 15，属重复计数。断言本身诚实（打印 `F 22 个登记格`） | `20-test-density.log`：`✔ F 22 个登记格实测 == 基线登记值` 与同文件 `· 基线比对：24 格 + …` 并存 | 统一为 22（或说明「9 强制格含 3 个由 worst-of-15 代表的 risk 格」） |
| **F6** | 🟡 | `src/ui/sidepanel/view-model.ts:660`、`src/ui/sidepanel/index.html:1124`、`test/ui/l0.mjs:456` | FR-V3-015 要求展开后「≤4 个 L2 入口，**各带计数**」，但 `设置` 入口 `count: -1` → `data-count="n/a"`、标签无数字；`l0.mjs` ⑥ 对豁免目标的断言写成 `countInTarget !== '' || entry.text.length > 0`（**计数或标签二选一**），故「各带计数」这条 FR 实际上**没有任何门禁断言** | `22-my-ec.log`：`FAIL | FR-V3-015 ≤4 L2 entries each with a count` | 二选一：① 给 `设置` 一个真值计数（如设置项数）；② 把 `设置无计数` 作为**显式登记豁免**（与 `view-host` 的 `v3SkeletonExemptions` 同法），并把 `l0.mjs` 的断言拆成「有计数的入口必须计数与真值同源」+「豁免入口必须在登记集合内」 |
| **F7** | 🟡 | `test/ui/density.mjs#riskVisibleExpr` / `test/ui/l0.mjs` 风险探针（及我的探针同构实现） | 「风险永不折叠」的可见性判据 = 祖先无 `hidden` + 不在 L1/L2 容器 + `rect.height > 0`；**`visibility:hidden` / `opacity:0` 祖先不影响 rect 高度** → 探针仍判 `ok=true`（实测 `#risk-rail.style.visibility='hidden'` → `ok=true, h=81`；`opacity:0` 同）。密度口径 C1 **明确不豁免** visibility/opacity，故两个口径的「可见性」覆盖面不一致。**当前产物无此 CSS 路径**，故**非现网缺陷**，属**机器兜底覆盖面缺口** | `22-my-ec.log`：`FAIL | PROBE-GAP search …` | 探针补一项：祖先链 `getComputedStyle` 的 `visibility !== 'hidden' && opacity !== '0'`（或直接把 C1 的「仅 `hidden` 豁免」口径复用到风险探针） |
| **F8** | 🟠 | 本叶 `spec.md §5 NFR-V3-005 / §7 AC-V3-016`、本叶 `state.json#independence.gateSet`、`test/size-baseline.ts`、`docs/v3-density-baseline.json#volume` | **spec 登记的 `sidepanel.js` ceiling = 279,825 B**（基线 266,500），而产物/代码/机读登记均为 **295,225 B / ceiling 306,099 B**（相对 spec 登记值 **+26,274 B，+9.4%**）。重登记本身满足 NFR-V3-005 的「显式」要求（前后值 266,500→291,523→295,225、日期、来源、理由、历史保留 `HISTORY`/`TIMELINE`/`previousBaselineBytes`；**容差 5% 未放宽**；I6 轮新增 `SIDEPANEL_CEILING_CAP` 使 ceiling **只降不升**，有效余量 5.00%→3.68%），但 **AC-V3-016 的字面数值已被产物突破**，且本叶 `spec.md` 与 `state.json` 未同步 → 形成「spec 说 A、产物是 B」的登记矛盾 | `11-build.log` / `stat` = 295,225；`size-baseline.ts` = `SIDEPANEL_BASELINE_BYTES 295_225` / `CEILING_CAP 306_099` / `SIDEPANEL_CEILING = min(309,986, 306,099) = 306,099`；`git diff 3e370fd HEAD` 对 spec.md **0 diff** | 由编排器/作者**显式裁决**并落一处登记：① 认可重登记 → 同步 `spec.md §5/§7` 与 `state.json#gateSet` 的数字（并保留前后值），或② 记为经验收豁免项。**注意**：用户侧口径「ceiling 未抬高」仅对 **I6 那一轮**成立（291,523→295,225 时 ceiling 保持 306,099）；对**整轮 v3-1** 而言相对 spec 登记值是抬高的 |
| **F9** | 🔵 | `test/ui/density.mjs:555-559` | 阶段 F 检查名「F 产物字节 ≤ 体积上限（**ceiling 未因登记保真被抬高**）」与其断言（`artifactBytes <= registry.ceilingBytes`）**不等价** —— 该断言只是「产物在上限内」，真正的「未抬高」证明在 `size-budget.test.ts`（V31-S12 `SIDEPANEL_CEILING <= previousCeilingBytes` + cap）。检查名有过度声明风险 | 读源码 + `20-test-density.log` | 检查名改为「产物字节 ≤ 机读上限」，并在注释指向 V31-S12 作为「未抬高」的唯一证明 |

**另有 2 项「用户侧/被验证方已知风险」的独立复核结论（非新问题，但值得记录）**：

| # | 结论 |
|---|------|
| K-1 | **夹具非对称确认为真且可复现**：`default@320` 登记值（194 chars / 18 blocks / 6 lines）来自**会话内第一次夹具运行**；同一 fixture 第二次运行起，产品弹出 `#notice`（`页面已导航：会话上下文失效，请重新授权/重连（不静默续接）`，29 字符）→ 我实测 steady-state 320 = **223 / 19 / 7**，与 400/520 完全一致，差值 = 29 chars = `#notice`。故该登记格是**夹具时序产物**（偏宽松：6 ≤ 15），其可复现性依赖阶段 B 的固定顺序（320→400→520）。**并且** `#notice` 在会话内是**持续存在**的（非"瞬时"），文档措辞宜订正。基线 json 已按「只登记不粉饰」登记 `fixtureAsymmetry`，方向正确。 |
| K-2 | **几何余量 7px 确认**：阶段 F 在**本轮我的运行**中重新测量 `#log.clientHeight = 495px`（default@400 含待答卡最坏情形），与登记来源值一致，≥ 登记下界 488px（余量 7px）。`insight.mjs` 的 PASS 摘要已改为从单源 `LOG_CLIENT_HEIGHT_FLOOR` 插值（不再打印 589px）。 |
| K-3 | **deferred 3 条复核**：`RP-02b/03/04` 读取侧为副本/内联副本 —— **属实**（RP-03 的 `c1Probe` 是 C1 逻辑的内联副本；RP-04 驱动的是 density 侧探针而非 l0 门禁探针）；但我用**自写口径**独立复现了 RP-03 的实质结论，故该 deferred 不削弱本轮判定。`package.json -2 行`：实测确为 2 处改写（`test` / `test:binding` 两行在被追加内容后重新出现），非受保护文件、且 NG-V3-008（零新增依赖）成立，已在台账 `zeroDiffFiles` 之外如实标注 —— 与 deferred 一致。 |

---

## 7. 阻塞问题

| # | 位置 | 问题 | 对应 Vx | 修复建议 |
|---|------|------|:--:|---------|
| — | — | **无（0 个阻塞）** | — | — |

> 判定依据：核心验收锚点 AC-V3-001~010（密度 / 风险永不折叠 / 可发现性）经**独立复现**全部达标；红线（manifest / 判定链 / `src/content/**` / 内容 bundle / 依赖 / `web-cli-base`）经独立 hash 与 diff 复核**零漂移**；门禁串行复跑全绿。F8 虽为中severity，但其性质是**已被显式登记的重登记与 spec 字面数值的矛盾**（NFR-V3-005 明文允许显式重登记），需裁决登记而非修复功能，故不构成阻塞。

---

## 8. 结论

**结论**: ⚠️ **有条件通过（0 阻塞）**

**指标达标矩阵**：

| 指标 | 要求 | 实测 | 达标？ |
|------|------|------|:--:|
| FR 测试覆盖 | 100% | **16/16 = 100%**（FR-V3-015 部分覆盖：`设置` 无计数，F6） | ✅ |
| NFR 测试覆盖 | ≥ 80% | **13/13 = 100%**（2 项部分：NFR-V3-005 数值矛盾 F8、NFR-V3-014 逐行覆盖 F1） | ✅ |
| 构建退出码 | 0 | typecheck / build / 11 条门禁 **全 0** | ✅ |
| 阻塞问题数 | 0 | **0** | ✅ |
| 漂移项 | 0 | **8 项新增发现 + 3 项已知风险复核**（0 🔴 / **2 🟠** / 5 🟡 / 1 🔵） | ⚠️ |
| 独立复现一致率 | — | 密度 25/25 格**逐格一致**；反证 6/6 **实跑成立**；红线 hash 100% 一致；门禁计数 9/9 一致 | ✅ |
| 未验证项 | 如实登记 | 人工面 6 项 `⏳ 未执行`（不冒充 PASS） | ✅ |

**理由**：

1. **核心验收经独立复现成立**——我用**自己写的 C1~C4 度量实现**（不 import 被测口径）在真实构建产物上独立测得 **25 个登记格与声称值逐格完全一致**（含 default/firstRun/risk 15 子场景/worst），增量归属违规 **0**；E 稿的「同源硬证明」经我独立复算**成立**（自写口径 ≡ 稿件自带 `window.__density()` 逐项相等）。
2. **反证真实**——RP-V3-01/03/05/06/08 + I1 六条独立重跑，扰动均落在门禁真读路径上，FAIL 段真 FAIL、还原段 sha256 逐字节复原（`content.js 52a82620…`、`l0.mjs d5c55fe4…`、`decision-card.ts 2e14e49d…`、baseline 与 `git HEAD` 一致），重建后 `sidepanel.js` 回到登记值 295,225。
3. **红线零改动成立**——`policy.ts` / `auto-authorize.ts` / `src/content/**` 三文件 sha256 与 pin 逐位一致；`manifest.json` / `options.html` / `packages/web-cli-base/**` / 依赖段 0 diff；`content.js` 177,076 无容差且可从源码**字节级重建**。
4. **门禁串行复跑全绿且计数一致**——11 条严格串行、日志全量落盘，计数 732/11/105/134/167/108/192/24/PASS 与声称逐项一致。
5. 但发现 **8 项被验证方未登记的问题**，其中 2 项中severity：**F8**（`sidepanel.js` ceiling 的 spec 登记值 279,825 与产物/代码 306,099 矛盾，需显式裁决并同步 `spec.md`/`state.json`）与 **F1**（取代台账门禁按 hunk 重叠而非按行判定，3 条删除行未被逐条登记 → AC-V3-011 的机器强制力不足）。二者**均不影响功能/安全/红线**，且 F8 的重登记在 NFR-V3-005 明文允许范围内（容差未放宽、ceiling 在 I6 轮只降不升），故按 **⚠️ 有条件通过** 处理。

**建议后续动作（按优先级）**：

1. **（🟠 建议先做）** 由编排器/作者对 F8 显式裁决：认可重登记则同步 `spec.md §5/§7` 与 `state.json#independence.gateSet` 的 `sidepanel` 数值（保留 266,500 → 291,523 → 295,225 历史）。
2. **（🟠）** F1：把台账门禁的覆盖率判定改为**按行包含**，并补齐 `size-budget.test.ts` old 272/273、`insight-archive.test.ts` old 771 三条登记。
3. **（🟡）** F2/F3/F4/F5：订正台账与 build.md 的 4 处登记数字（731→732；830/740→833/741 或给出可复算正则；§1 台账计数 26/9/12→37/15/11；「24 格」→22 格）。
4. **（🟡）** F6：给 `设置` 入口补真值计数，或把「设置无计数」登记为显式豁免并让 `l0.mjs` 断言可 FAIL。
5. **（🟡）** F7：风险可见性探针补 `visibility`/`opacity` 判定（与密度 C1 口径对齐）。
6. **（🔵）** F9：阶段 F 检查名与断言对齐。
7. **（交接 v3-2/v3-3）** K-1：把密度夹具做成确定性（每格复现同一稳态或显式关闭 `#notice` 瞬时态），届时应按重登记流程把 `default@320` 收紧为 223/19/7（方向 = 收紧）。

---

## 9. 纪律核验（本轮）

| 项 | 结果 |
|---|---|
| 是否修改源码/测试/文档/配置 | **否**（唯一写入为 `dist/**`（gitignored）由 `npm run build` 重建；I1 反证期间对 `decision-card.ts` 的扰动已**逐字节还原**，sha256 `2e14e49d…` 复原，`git status` 为空） |
| 是否 `git add` / `commit` / `push` | **否**（HEAD 仍为 `76d4154`，无新提交） |
| `main` 是否被改动 | **否**（`main = 2ddc922`，与 v3-1 起点一致） |
| 探针存放位置 | `/tmp/opencode/v3-validate/`（**不入版本库**） |
| Chromium 并发 | **无**（一次一个，严格串行） |
| 人工面 | 6 项 `⏳ 未执行`，未冒充 PASS |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1）：**独立复现** 25 个密度登记格（逐格一致）+ 6 条反证（含 I1）实跑 FAIL→还原→PASS + 台账逐行审计 + 红线 hash 复核 + 11 条门禁串行复跑；V1~V12 全部执行；8 项独立新发现（2 🟠 / 5 🟡 / 1 🔵，**0 阻塞**）；人工面 6 项如实登记 ⏳。结论 ⚠️ 有条件通过 | 2026-09-16 | SDDU Validate Agent |

---

## 10. 收口轮处置登记（**追加，不改任何原文**，由 sddu-build 收口轮追加）

> **追加时间**：2026-09-16 ｜ **追加人**：SDDU Build Agent（validate 收口轮）
> **性质**：本报告 §1~§9 的**原文一字未改**；本节只登记 F1~F9 与本报告 K-1 的**处置结果**（证据指向 `build.md §6`）。
> **编排器裁决**（执行依据）：F8 订正不豁免；F1 改按行包含判定；F6 优先真值计数、否则按 `#view-host` 同法登记豁免并断言豁免边界；
> F7 探针补判定与 C1 对齐；F2/F3/F4/F5/F9 逐条订正为可复现值；夹具做成确定性后按「收紧」流程重登记 320 格（历史保留）。

| 项 | 处置 | 落点 | 可 FAIL 的反证（实跑结果） |
|---|------|------|--------------------------|
| **F1** 🟠 | ✅ **订正为按行包含判定** + 补登 3 行（`size-budget.test.ts` old 272/273、`insight-archive.test.ts` old 771，条目 `V31-MR-F1`） | `test/supersession-ledger.test.ts`（`deletionLines()` + 逐行判据 + 「逐行判定数 > 0」防空转）；`docs/v3-supersession-ledger.json#modifiedRanges`（37 → 39） | ✅ 移出 `[272,273]` → **FAIL**（逐行打印 `old 272`/`old 273`）→ 还原（sha256 `2b0e58f0…` 复原）→ **11/0 PASS** |
| **F2** 🟡 | ✅ 订正 `counts.nodeTestRuntime.currentRuntime` 731 → **732**（实测；写入复现命令） | `docs/v3-supersession-ledger.json` | ✅ 由「计数只增不减」用例持续约束（732 ≥ 646） |
| **F3** 🟡 | ✅ 订正 830/740 → **833 / 741**（确切正则 `\btest\(` / `(?<![\w.])test\(`），并登记第三种读法 `^test\(` = **732**（与运行期 `ℹ tests` 相等）；三读法写入 `readings` 由门禁**机器复算** | 同上 `#staticCalibers.nodeTestStatic.readings`；`test/supersession-ledger.test.ts` | ✅ 机器复算不等即 FAIL（首跑真实命中一次 `834 ≠ 833`，已订正注释） |
| **F4** 🟡 | ✅ `build.md §1` 台账计数 26/9/12 → **39/15/11**（原文保留于同节订正注） | `build.md §1` | ✅ 复算命令可核（`python3` 读台账 JSON） |
| **F5** 🟡 | ✅「24 登记格」→ **22**（改为机器计算 `comparedCells`，断言/日志/返回值同源；原文与说明保留于 `build.md §5.1 I8` 订正注） | `test/ui/density.mjs#stageF` | ✅ 任一格实测 ≠ 登记即 FAIL（阶段 F 首跑曾真实检出 `risk(staleRef).lines` 漂移） |
| **F6** 🟡 | ✅ **走登记豁免路线**（真值在 L0 层派生不出：设置视图懒挂载 + `l0ViewModel()` 纯函数；写死魔数被禁；改 `src/**` 会让 F8 钉死的 295,225 B 失效），并在门禁中断言**豁免边界**（豁免集合 ⊆ 登记集合且数量不得增长）+ 三个计数入口必须「入口标签 ≡ data-count ≡ 状态栏摘要」三处同源 | `test/ui/l0.mjs §⑥b`；`docs/v3-supersession-ledger.json#v3SkeletonExemptions#settings-count` | ✅ **实跑 FAIL→还原→PASS**：篡改 `#l2-entry-tree[data-count]` `0→99` → 判据报「三处不同源」；还原 `0` → 判据为空（`23-test_l0-round3.log`） |
| **F7** 🟡 | ✅ 探针**上移为口径单源**（两门禁共用）并补 `visibility:hidden` / `opacity:0` 祖先判定（与 C1「只豁免 `hidden`」对齐）；视口判据取更严版；新增 `RP-V3-09` | `test/ui/density-metrics.mjs#riskVisibilityProbeSource`（+ `.d.mts`）；`density.mjs` / `l0.mjs`；台账 `v3CaliberPins` +2 | ✅ **RP-V3-09 实跑 10/0**：两属性各 FAIL（`祖先链含 CSS 隐身`）+ 「旧判据仍判通过」对照 + 还原 PASS（`21-RP-V3-09.log`） |
| **F8** 🟠 | ✅ **按裁决订正，不豁免**：本叶 spec §5/§7、本叶 plan、本叶 state#gateSet(+history)、父 spec 3 处、父 plan 5 处、父 state `sizeGuards`(+history) 一律改为 `≤306,099（基线 295,225）`，**每处逐字保留历史行** | 见 `build.md §6.6` 的原文 diff | ✅ 阈值 7/15 · 9/20 · 17/35 与 ceiling **均未抬高**（`SIDEPANEL_CEILING_CAP` 只降不升；V31-S12 断言 `ceiling ≤ previousCeilingBytes`） |
| **F9** 🔵 | ✅ 阶段 F 检查名与断言对齐（「产物字节 ≤ 机读体积上限」），注释指向 `test/size-budget.test.ts` 的 V31-S12 作为「未抬高」的唯一证明 | `test/ui/density.mjs#stageF` | ✅ +1B 反证（RP-V3-06）覆盖体积门禁 |
| **K-1** | ⚠️ 夹具已做成**确定性两遍**（每格同一稳态 + 每格断言 + 默认档三视口逐项相等）；`#notice` 措辞订正为「会话内持续存在」；`default@320` 重登记 **194/18/6 → 223/19/7**（历史值逐字保留在 `tiers.default["320"].previous`） | `test/ui/density.mjs#resetFixture/assertFixtureSettled`；`docs/v3-density-baseline.json` | ✅ 每格稳态断言（24 条）+ 默认档三视口相等（1 条）；旧夹具在第一类断言上即 FAIL |

**两点需编排器知悉（如实上报，不粉饰）**：

1. **A6 的张力**：K-1 的处置使 `default@320` 的登记值**上调**（194/18/6 → 223/19/7）。理由：`#notice` 在会话内**持续存在**（validate 独立复测确认），194/18/6 是「第一格专属未稳态」的**欠测**、不可复现；要让登记值「只降」必须把夹具改成「永不带 notice」，而清零 `state.notice` 在门禁侧无真实通路（DOM 清空会被下一次 render 覆盖，本轮实测），只能改 `src/**` 增加 seam —— 那会破坏 A1/F8 已裁决钉死的 295,225 B。**阈值与 ceiling 未动、历史值保留**；替代方案（每格新开面板页）已评估并列于 `build.md §6.3`。
2. **未改动的同类残留**：三个兄弟叶（v3-2/v3-3/v3-4）的 spec/state/tasks 与父 `discovery.md` 仍含旧 `279,825` —— **超出本轮裁决范围**（裁决只点名本叶 spec §5/§7、本叶 state#gateSet 与父 spec/plan），故**未**改动，建议各叶开工时按同一方式同步。

**结论（收口轮后）**：本报告 §1~§9 的 **0 阻塞** 结论不变；F1~F9 中 **8 项已订正/已加机器强制力**，K-1 已做确定性修复（含 1 处数值上调的如实上报）；门禁严格串行全 0，**计数只增不减**（density 105 → **127**、l0 134 → **137**，其余不变）；红线零漂移。重跑 `@sddu-validate` 可复核。
