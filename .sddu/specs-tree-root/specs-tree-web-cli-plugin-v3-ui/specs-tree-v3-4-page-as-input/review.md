# 审查策略（C1~C43）：specs-tree-v3-4-page-as-input

> **文档定位**: SDDU 审查策略 — 指导 review Agent 执行自主审查的清单和方法；审查结果见 `review-report.md`
> **前置依赖**: 本叶 `spec.md`（v1.1；FR-V3-060~072 / §7.1 AC-CONV-1·2）+ `plan.md`（ADR-V3-030~036）+ `tasks.md`/`tasks.json`（TASK-401~415）+ `build.md`（v1.0）+ 父 `../spec.md`（权威条文 §5.5 / §8.4 / §6 NFR-V3-003~007）+ 父 `../plan.md` + `../discovery.md`（R-UI-001/004/008）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-17
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-17
> **更新说明**: 初始创建（43 项自主审查清单；覆盖 4 维度 + 证据/文档保真 + 本轮 10 项安全面重点打假）

---

## 1. 审查概要（策略侧）

| 维度 | 数值 |
|------|:--:|
| 审查对象文件数 | 34 个（`git show --stat be54b70` 全量：13 新增 + 18 修改 + 3 SDDU 产物；另只读核对 6 个零改动红线文件） |
| 审查项总数（C1~C43） | 43 |
| 复现实验 | `npm test`（795）· `test:supersession`（14）· `test:gate-integrity`（12）· `test:zero-injection`（20）· `test:page-input`（46）实跑；**2 次受控 Chromium 证伪实验**（/tmp 副本，串行、profile 自清）；纯函数复算（守卫/体积/归因） |
| 重点打假 | 10 项（零注入未覆盖态 / teardown 残留 / 两世界桥来源校验 / AC-CONV 独立性 / 三退让语义 / 守卫语义变更性质 / 他叶登记字段触碰 / 体积重登记归因 / 虚绿门禁 / 文档数字保真） |
| 通过 / 警告 / 失败 | 见 `review-report.md` |

## 2. 自主审查清单（C1~C43）

**审查对象来源**：
- `spec.md`：FR-V3-060~072（13 条）+ §7.1 AC-CONV-1/2 + NFR-V3-003~018 本叶落点 + EC-V3-003/005/006/007/012/013/014/017 → 逐项核验实现完整性与正确性
- `plan.md`：ADR-V3-030~036 + §5 文件影响分析 + V34-O-* 开放项裁决 → 架构遵循性
- `build.md`：§1 门禁数字 / §1.1 spike / §1.3 披露 / §2 文件清单 / §4 需求→证据 / §5 体积与密度 / §6 反证 / §7 零改动 / §8 人工面 → 覆盖完整性与数字保真
- `src/content/pick-*.ts` · `src/content/ref-capture.ts` · `src/ui/sidepanel/pick-input.ts` · `src/background/{service-worker,messaging}.ts` · `src/ui/sidepanel/{sidepanel,l0/shell,l1/panels,view-model}.ts` · `index.html` · `build.mjs` → 代码质量
- `test/{ref-capture,ref-wiring,zero-injection,pick-layer-budget,size-baseline,size-budget,size-growth-evidence,insight-protocol}.ts` · `test/ui/{page-input,zero-injection,l1}.mjs` · `docs/v3-supersession-ledger.json` · `docs/v3-density-baseline.json` · `package.json` → 测试质量与台账/数字保真

**四维度指引 + 第五维（证据/文档保真）**，叠加本轮 10 项安全面重点打假：

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法 |
|---|---------|---------|---------|---------|
| C1 | 四项交互（Alt 悬停 / Alt 拖动 / 右键 / 拖选）**逐项**各生成 1 引用 + 1 选择题 | FR-V3-060 / AC-V3-022 | 规范符合性 | 读 `page-input.mjs` ① 段判据逐条 + 实跑 `test:page-input`（46/0） |
| C2 | 拾取结果**不是**常驻输入框（`#ask-fallback` 持隐藏，自由文本只在末项） | FR-V3-061 | 规范符合性 | 读 `sidepanel.ts#acceptCapture` + `page-input` ② + 走查 `index.html` `#composer` 默认态 |
| C3 | 唯一高亮（结构上不可能画两个）+ 撤销零残留 + 拾取期间命令发送 = 0 | FR-V3-062 | 规范符合性 | 读 `pick-overlay.ts`（单一 `.outline` 节点） + `pick-layer.ts`（无命令通道） + `page-input` ③④ 实跑原文 |
| C4 | Alt 拖动**两路径**：落点生成引用 / 未落点零副作用 | FR-V3-063 | 规范符合性 | 读 `pick-input.ts#onDrop/onDragOver` + `pick-layer.ts#onPointerUp/onDragEnd`；`page-input` ⑤ |
| C5 | 右键**三退让**逐条（仅已授权 / 原生菜单出口一次性 / Esc 与点击空白即关）+ manifest 零新增 | FR-V3-064 / AC-V3-017 | 规范符合性 | 读 `pick-menu.ts` + `service-worker.ts` 闸门；`page-input` ⑥ + 受控 Chromium 探针（nativeOnce 两次右键实测） |
| C6 | 拖选气泡出现 + ≥1 动作候选 + 选择后生成引用与选择题；输入区不出现；宿主选区不被破坏 | FR-V3-065 | 规范符合性 | 读 `pick-layer.ts#onMouseUp` + `pick-overlay.ts#showBubble`；`page-input` ⑦ |
| C7 | chip ↔ 角标**同序号**、双向 hover 互相高亮 | FR-V3-066 | 规范符合性 | 读 `sidepanel.ts`（mark/highlight + `data-ref-hover`）+ `pick-layer.ts#onHighlight/armPlus`；`page-input` ⑧ |
| C8 | **按需注入 + 未授权零注入**（不注册 / 不注入 / 不渲染 / 不拦截右键）；**重点打假 ①：枚举全部注入·注册·监听路径并尝试找绕过态** | FR-V3-067 / NFR-V3-007 / AC-V3-018 | 规范符合性 | 全仓 `grep executeScript/registerContentScripts/addListener` 独立枚举 + 读 `service-worker.ts#pick-layer-inject` 双闸门 + **受控 Chromium 探针**（授权态 A/B、撤销态、多 tab 残留态） |
| C9 | 未授权 / 探测中：L0 风险位明示「页面侧零注入」+ 无任何页面侧拾取 UI + 入口禁用（原因可读） | FR-V3-068 / EC-V3-003/005 | 规范符合性 | 读 `view-model.ts#l0ViewModel` + `l0/shell.ts`（风险行）+ `pick-input.ts`（benign 分类）；实跑 `test:zero-injection`（20/0） |
| C10 | 宿主样式污染下可读 + 不吞宿主非目标事件（含**焦点**面） | FR-V3-069 / EC-V3-017 | 规范符合性 | 读 `pick-overlay.ts` CSS（`all:initial`）+ `pick-layer.ts` 五规则注释与实现；`page-input` ⑨ + 受控 Chromium 探针读 `document.activeElement` |
| C11 | 手势表条目数 = 实现手势数（双向相等；单源渲染；不许多列） | FR-V3-070 | 规范符合性 | 读 `view-model.ts#L1_GESTURE_LABELS` 唯一清单 + `panels.ts#renderGestures` + `index.html` tbody 空壳；`page-input` ⑩ |
| C12 | 引用 id 贯穿四处一致（页面角标 / 侧栏 chip / 证据层 / 失效风险行） | FR-V3-071 | 规范符合性 | 读 `ref-capture.ts#markRef` / `ref-store` 单源 + `acceptCapture`（id 回填页面）；`page-input` ⑧ |
| C13 | `manifest.json` 零 diff 断言（含无 `contextMenus` / 无静态 `content_scripts` / 无 `web_accessible_resources`） | FR-V3-072 / AC-V3-017 | 规范符合性 | `git diff --numstat` + 读 `test/zero-injection.test.ts` ① + SW 注入前授权闸门源码断言 |
| C14 | **AC-CONV-1**：真实 env 注入点（生产路径，非测试 seam）+ 字段来源真实 + 缺字段 fail-closed | spec §7.1 AC-CONV-1 | 规范符合性 | 读 `sidepanel.ts#syncRefEnv`（render 调用点）+ `pick-input.ts#judgeEnv` + `service-worker.ts#declarationEnv`（sha256 真实摘要）；实跑 `test/ref-wiring.test.ts` + 独立复现「抹掉生产调用点 ⇒ 判据变 0」 |
| C15 | **AC-CONV-2**：唯一动作入口走 `dispatchRefAction`（首句 guard）+ 全仓唯一调用点 + 引用回合走同一入口 | spec §7.1 AC-CONV-2 | 规范符合性 | 独立 `grep -rn "dispatchRefAction" src/`（调用点计数） + 读 `submitAsk`/`applyRefAction` + 反证（伪造第二调用点必须 FAIL） |
| C16 | `dist/content.js` ≤ 177,076 B（**无容差**）+ `CONTENT_SOURCE_SHA256` 三 pin | NFR-V3-003 / AC-V3-015 | 规范符合性 | `stat` 实测 + `sha256sum` 对 pin + 读 `pick-layer-budget.test.ts` 反证段 + 反证日志原文 |
| C17 | `sidepanel.js` 显式重登记披露（五要素 / 容差 5% 未动 / cap record-only / 断言零删减 / 逐模块归因可复现） | NFR-V3-005 / AC-V3-016 / ADR-V3-011 | 规范符合性 | `stat` 实测 + 读 `size-baseline.ts`（常量/pin/归因表）+ 用编译产物复算 ceiling 与四类分解 |
| C18 | 权限与依赖零新增（manifest / `package.json` dependencies） | NFR-V3-006 / AC-V3-017 | 规范符合性 | `git diff` + `grep contextMenus` + 读 `zero-injection.test.ts` 冻结集合 |
| C19 | 登记式零注入「能真 FAIL」（CDP 强制注入反证 + 未授权 SW 拒绝可读） | NFR-V3-007/013 / AC-V3-018 | 规范符合性 | 实跑 `test:zero-injection` + 读反证段（marker/shadowHosts/intercepted 三项翻红 + unmount 归零） |
| C20 | 门禁计数只增不减（node 646→795 / journey 167 / insight 108→116 / binding 192 / sidepanel-view 38）+ 日志完整 | NFR-V3-012/014 / AC-V3-011~013 | 规范符合性 | 实跑 `npm test`（795/0 skipped）+ `/tmp/opencode/v3-gate-logs/v3-4/*.log` 逐门禁摘要对照 build.md §1.2 |
| C21 | EC 落点逐条：元素消失撤销高亮 / SPA 导航 navSeq / 多 tab 与 origin 切换 / SW 恢复 / 中间态红灯 / 余量 0 冲突 | spec §6 EC-V3-003/005/006/007/012/013/014/017 | 规范符合性 | 读 `pick-layer.ts`（`bumpNav`/`history` 包装/`unmount`）+ `pick-input.ts`（identity 缓存/fail-closed）+ 台账 `V34-*` |
| C22 | 拾取不产生判定路径 / 零提权控件 / 零审计明文 | AC-V3-019 / NFR-V3-008/016 | 规范符合性 | 读 `pick-layer.ts`（无 `dispatch`/无命令）+ `pick-bridge.ts`（facts only）；`page-input` ④ 命令计数 0 |
| C23 | ADR-V3-030 遵循：第 5 bundle + `executeScript` 按需注入 + 双触发 / 幂等（单一 marker）/ teardown / 失败降级 + 「按需」语义边界登记 | ADR-V3-030 | 架构一致性 | 读 `build.mjs` 第 5 entry + `pick-layer.ts` 尾部 install + `pick-input.ts` 双触发 + `service-worker.ts` teardown 调用点；build.md §9 边界登记 |
| C24 | ADR-V3-031 遵循：`content.js` 字节冻结守线 + 新 artifact 独立硬上限 + **不合并计数** | ADR-V3-031 | 架构一致性 | 读 `size-baseline.ts#PICK_LAYER_*`（tolerance 0 / disambiguation）+ `pick-layer-budget.test.ts` ③ 独立性断言 |
| C25 | ADR-V3-032 遵循：路线 1（零新增权限）+ 三退让 + `role=menu`/roving tabindex 键盘语义 + 不提供剪贴板项 | ADR-V3-032 | 架构一致性 | 读 `pick-menu.ts` 全文（`MENU_ITEM_KEYS` 5 项 / 无复制项）+ 受控 Chromium 探针（nativeOnce / Esc） |
| C26 | ADR-V3-033 遵循：open Shadow DOM 双向隔离 + `all:initial` + 唯一 host 选择器 + z-index + 五条不吞规则；**重点打假 ③：两世界职责边界与消息来源校验** | ADR-V3-033 | 架构一致性 | 读 `pick-overlay.ts`/`pick-layer.ts`/`pick-bridge.ts`；`grep postMessage/window.parent` + manifest `externally_connectable` 核查 + 主世界/隔离世界指纹探针 |
| C27 | ADR-V3-034 遵循：共享 `ref-capture.ts` 口径（稳定优先 / ≤6 级 / 截断 80·120 / `data-wcli-ref` / 只报观测）+ 手势表双向一致 | ADR-V3-034 | 架构一致性 | 读 `ref-capture.ts` 全文 + `ref-capture.test.ts`（与 `ref-store` 常量逐字相等）+ 全仓检索「第二份捕获实现」 |
| C28 | ADR-V3-035 遵循：spike S1~S4 先行且全过；未走 D1/D2；降级路径未实现属登记项 | ADR-V3-035 | 架构一致性 | 读 `/tmp/opencode/v3-gate-logs/v3-4/spike-evidence.json` 原文 + build.md §1.1/§9.5 |
| C29 | ADR-V3-036 遵循：取代 = binding 页面侧**同编号最小改写** + 新增零注入/体积/交互门禁；不删既有安全断言 | ADR-V3-036 | 架构一致性 | `git diff` binding.mjs（应 0 行）+ 台账 `entries[V34-*]` 逐条 + 受保护区 hash 断言 |
| C30 | 文件影响对齐：plan §5 预期文件 vs 实际 diff（无遗漏 / 无多余 / 无未声明改动） | plan §5 / build.md §2 | 架构一致性 | `git show --stat be54b70` 逐文件 ↔ build.md §2.1/§2.2 清单比对（含**清单失真**核查） |
| C31 | **重点打假 ⑥**：方向性守卫由「最后两轮」改「最差连续两轮」的性质（收紧 or 偷换）+ 数学单调性 + 误报路径 + 是否配反证 | NFR-V3-005 / 裁决 V3-VOL-1 ④ | 架构一致性 | 读 `size-baseline.ts#evaluateConsecutiveReRegistrationGrowth` 全文 + 用编译产物对真实 `SIDEPANEL_RE_REGISTRATIONS` 复算 worst-pair + 读 `size-growth-evidence.test.ts` 反证段 |
| C32 | 可读性 / 职责单一（pick-* 六模块边界；`op()` 单一门禁派发器；无重复实现） | 项目宪法 / ADR-V3-030/034 | 代码质量 | 逐文件走查 + `grep` 重复实现（截断 / 选择器 / 菜单行表） |
| C33 | 错误处理完善：不静默失败（注入失败→可读原因 / benign 分类 / 载荷解析失败提示）；异常路径覆盖 | FR-V3-068 / NFR-V3-015 | 代码质量 | 读 `pick-input.ts#inject/onDrop` + `service-worker.ts#pickLayerTarget` 错误分支 + `pick-layer.ts` 防御式 `query` |
| C34 | 无硬编码值 / 无死代码 / **资源清理完整性**（unmount 是否清全部监听·定时器·历史包装·桥）；**重点打假 ②** | §5.1 / FR-V3-062 / ADR-V3-030 | 代码质量 | 逐行读 `pick-layer.ts#unmount` / `pick-overlay.ts#unmount` + **受控 Chromium 探针**（teardown 后再右键/再探测、document_start 卸载后残留） |
| C35 | 测试存在性 + 真实断言（795 用例 / 0 skipped；page-input 46 / zero-injection 20 断言真判行为） | §5.4 / NFR-V3-013 | 测试质量 | 实跑 `npm test` / `test:page-input` / `test:zero-injection` + 逐条读 check 标签与判据 |
| C36 | 边界与错误场景覆盖（0 长度选区 / 16 进制边界截断 / 不可编辑区 / 失败降级 / 选择器非法 / 载荷非法） | §5.4 | 测试质量 | 读 `ref-capture.test.ts` 7 例 + `page-input` ⑦⑪ + `pick-layer-budget.test.ts` |
| C37 | 反证真 FAIL（+1B 体积三段 / 三 pin / 零注入强制注入 / AC-CONV「非恒真」/ 方向性守卫越线） | NFR-V3-013/018 | 测试质量 | 逐条读反证段 + 实跑（`test:page-input`/`zero-injection` 内嵌反证 + `/tmp/.../RP-V3-0*.log`） |
| C38 | **重点打假 ⑨**：两个新门禁被元门禁**自动纳入**（扫目录推导生效）+ 无虚绿形态（`assert.ok(true)` / `|| true` / `catch {}` 包断言 / 过宽 skip / 提前 `exit(0)`） | NFR-V3-012/014 | 测试质量 | 实跑 `test:gate-integrity`（12/12）+ 独立复算 `discoverGateFiles` 集合 + 全 diff 虚绿模式扫描 |
| C39 | **重点打假 ①⑨ 夹具代表性**：门禁夹具 URL 形态是否覆盖真实页面（根路径 vs 带路径）；「全绿」是否只是夹具选择的结果 | NFR-V3-013 / AC-V3-022 | 测试质量 | 读 `page-input.mjs`/`zero-injection.mjs` 的 fixture 与导航 URL + **受控 Chromium A/B 探针**（`/` vs `/app`） |
| C40 | **重点打假 ⑩**：`build.md` 每个数字与实测一致（795/20/46/127/164/103/71/167/116/192/24/12/32,391/362,777/380,915/+36.13%/8,606） | build.md / §5 方法论 | 证据保真 | 实跑三处 + 门禁日志逐条对照 + 编译产物复算 |
| C41 | **重点打假 ⑦**：台账完整性（`V34-*` 逐条 newTitle 可定位 / oldTitle 已消失 / 未登记删除行 = 0 / protectedRanges hash / 他叶 `registeredUncoveredLines` 追加 12 行真实性 / 未登记修改区间） | AC-V3-011/012 / ADR-V3-036 | 证据保真 | 读 `supersession-ledger.json` + 独立用 `git show <leafBase>:<file>` 复算 12 行 + 独立枚举 be54b70 删除行与台账覆盖集合比对 |
| C42 | **重点打假 ⑧**：体积重登记数字自洽（结构化字段 vs 散文/注释/台账/密度登记册）；Feature 累计算法（从 266,500 起算、无漏轮） | NFR-V3-005 / §1.10 | 证据保真 | `stat` + 读 `size-baseline.ts` 全量数字字段 + `docs/v3-density-baseline.json` + ledger `V34-S10/S11/S12` + `grep` 幽灵值 |
| C43 | 红线与纪律零改动：`content.js` 逐字节 / 三冻结 hash / 判定链未动 / `main` 未动 / 主界面无常驻输入框 / 风险位不可折叠 / 人工面 6 项如实 ⏳ / 未 `git add -A` | spec §2.2 不做清单 / NFR-V3-015 / 父 AC-V3-025 | 规范符合性 + 纪律 | `git diff --numstat`（红线六类）+ `git log main` + 读 build.md §7/§8 + `git status` 干净度 |

> **质量门槛（数量基线法）**：FR 13 条（FR-V3-060~072）→ 每条 ≥ 1 个 Cx（C1~C13）+ AC-CONV-1/2（C14/C15）+ NFR/EC/AC（C16~C22）+ 架构（C23~C31）+ 代码质量（C32~C34）+ 测试质量（C35~C39）+ 证据保真（C40~C42）+ 纪律（C43）= **43 ≥ max(13, 4)**；
> 四维度均 ≥ 1 条（规范符合性 22 · 架构一致性 9 · 代码质量 3 · 测试质量 5；证据保真/纪律按第五维单列）。
> 无法审查项（若出现）在 `review-report.md` 中显式标注「不适用」并说明原因。

## 3. 审查方法学（本叶特有）

1. **结构化安全枚举**：不接受「门禁绿 = 零注入成立」，改为独立枚举全部「注入 / 注册 / 监听 / 右键拦截」代码路径，并对「未授权 / 曾授权已撤销 / 授权流程中 / 另一 tab 已授权本 tab 未授权 / 声明探测中」五个状态逐一判定。
2. **必要证伪实验**：只在 `/tmp/**` 副本进行，Chromium **一次一个**、`finally` 内自清 profile 与临时 dist；每次实验前 `df -h /tmp` + `pgrep` 核查。
3. **数字三源交叉**：`build.md` 数字 × 门禁日志原文 × 编译产物（`dist/*` + `build-meta.json` + `size-baseline` 常量）三源比对，任一不一致即记为「保真缺陷」。
4. **台账自证反演**：对台账的每一条声明做独立反演（`git show <base>:<file>` 复算删除行、`grep` 复算调用点唯一性、编译产物复算体积与百分比），不采信台账自述。

## 4. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：43 项自主审查清单（FR 13 / AC-CONV 2 / NFR·EC·AC 7 / 架构 9 / 代码质量 3 / 测试质量 5 / 证据保真 3 / 纪律 1）；四维度 + 第五维（证据/文档保真）+ 本轮 10 项安全面重点打假；审查方法学（结构化安全枚举 / 受控证伪 / 数字三源交叉 / 台账自证反演）。 | 2026-09-17 | SDDU Review Agent |
