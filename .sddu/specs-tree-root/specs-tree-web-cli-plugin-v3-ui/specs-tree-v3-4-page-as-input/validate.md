# 验证策略：specs-tree-v3-4-page-as-input

> **文档定位**: SDDU 验证策略（**V1~V16 场景矩阵**）— 定义本叶「验证什么、怎么验证、什么算通过」；执行结果见 `validate-report.md`
> **前置依赖**: 本叶 `spec.md` v1.1（§4 FR-V3-060~072 + §7.1 AC-CONV-1/2）· 父 `../spec.md`（§5.5 / §8.4 / NFR-V3-003~007）· 本叶 `plan.md`（ADR-V3-030~036）· 本叶 `review.md`（C1~C43）/ `review-report.md`（R1：**❌ 不通过，2 阻塞**；其后 build 修复轮 R1/R2 已处置）· `build.md` v1.2（§11 修复轮 / §12 R2 轮）· 先例 v3-1/v3-2/v3-3 的 `{validate,validate-report}.md`
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-17
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-17
> **更新说明**: 初始创建（V1~V16 场景矩阵；**独立复现、不复用被验证方脚本作唯一证据**；探针只写 `/tmp/opencode/v3-validate-v34/`，Chromium 一次一个、profile 自清）

---

## 1. 验证概要

| 维度 | 数值 |
|------|:--:|
| 被验证 Feature 类型 | **代码类**（页面侧 `src/content/pick-*.ts` + SW `pick-layer-*` 路由 + 侧栏引用接线）→ **全五维度验证**（测试覆盖 / 接口·数据 / 构建脚本 / 性能·边界 / 漂移检测），另加**登记册保真**与**人工面**两类专项 |
| 验证场景数 | **V1~V16**（16 条；其中 V15 人工面 = `⏳ 未执行`、如实登记） |
| 覆盖 FR | FR-V3-060~072 = **13 / 13**（每 FR ≥ 1 Vx）+ **AC-CONV-1/2**（N-06 硬性追加） |
| 覆盖 NFR | NFR-V3-003~007（体积 / 按需注入 / 侧栏线 / 权限零新增 / 零注入）· NFR-V3-008/016（只读投影）· NFR-V3-009/011（键盘可达）· NFR-V3-012/013/014（门禁串行·可 FAIL·计数不减）· NFR-V3-015（人工面 ⏳）· NFR-V3-018（内容 pin） = **门禁级全覆盖** |
| 覆盖 EC | EC-V3-003（零注入）· EC-V3-005（探测期不发命令）· EC-V3-006（元素消失）· EC-V3-007（SW 恢复，**仅读码 + 边界登记**）· EC-V3-012（余量 0 冲突）· EC-V3-013（全门禁绿）· EC-V3-014（多 tab/origin）· EC-V3-017（样式污染 / 原生菜单出口） |
| 验证维度覆盖 | 测试覆盖（V1/V7/V16）· 接口/数据（V2/V3/V5/V6/V13）· 构建脚本（V8/V9）· 性能/边界（V3/V12）· 漂移检测（V4/V7/V10/V11/V14）—— **五维度均 ≥1 条** |
| 本轮轮次 | R1（对照 HEAD `1e2e1a1`，起点 `e528563`） |

**独立复现原则（本轮强制）**：

1. **不复用被验证方的脚本作唯一证据**：BLOCK-1 的 `/app` 注入、零注入五探针、I-02 复活路径、三条退让 / I-03 焦点、I-01② 竞态，全部由我在 `/tmp/opencode/v3-validate-v34/` **自写的探针**（自写 CDP 客户端 + 自写判据 + 自写夹具）独立复现；`/tmp/opencode/v3-gate-logs/**` **只作待核对的「声称」**，不作证据。
2. **自写测量实现**：密度 C1~C4 由我按 `docs/v3-density-baseline.json#caliber` 的**口径定义**重新实现（**不 import** `density-metrics.mjs`），逐格与登记值对照。
3. **R2-1 专项清扫（本轮最高价值）**：对**全部 Chromium 门禁**做静态提取（自写扫描器：`check()` 条件分类 + `ok`-only 站点抽取）并逐条判定「是否可被『行为落在错误目标上』蒙混」，必要时抽样动态验证。
4. **反证必须真跑**：`pick-layer +1B @33,901`、`content.js +1B @177,077` 由我自己 `printf` 一字节 → 必须 FAIL → 按 sha256 还原；零注入强制注入反证、`A7` 落点反证同样自跑。
5. **门禁照跑但结论只建立在我的实测上**：严格串行、一份一进程、全量日志落盘、profile 自清（v3-3 教训：`/tmp` tmpfs 曾被 576 个 profile 占满）。
6. **不推断填坑**：跑不动的场景 → `⏭️ 未执行`；人工面 → `⏳ 未执行`；发现不一致以我的实测为准并深挖。

---

## 2. 自主验证场景（V1~V16）

**验证对象来源**：`spec.md` §4/§5/§6/§7/§7.1 + 父 `../spec.md` §5.5/§8.4 + `plan.md`（ADR-V3-030~036）+ 实际产物（`src/content/pick-*.ts` · `src/background/service-worker.ts` · `src/ui/sidepanel/{sidepanel.ts,pick-input.ts}` · `test/ui/{page-input,zero-injection}.mjs` · `test/{pick-layer-budget,size-baseline,supersession-ledger,gate-integrity}.*` · `docs/v3-{supersession-ledger,density-baseline}.json` · `dist/*`）+ `build.md` v1.2 / `review-report.md` 的**待核对声称清单**。

| # | 验证对象 | 验证步骤 | 预期结果 | 验证维度 | 验证方法 |
|---|---------|---------|---------|:--:|:--:|
| **V1** | 门禁可执行性与计数（NFR-V3-012/013/014） | 严格串行（一次一个 Chromium）复跑 18 项 + 体积四线 + 零改动核对；逐份提取退出码 + 计数与登记值对照 | `typecheck 0` · `build 177076/33900/362777` · `npm test 795/795/0 skipped` · `supersession 14` · `density 127` · `l0 164` · `l1 103` · `l2 71` · `l1-reverse 9` · `l2-reverse 10` · `page-input 78` · `zero-injection 27` · `journey 167` · `insight 116` · `binding 192` · `hardening 24` · `e2e PASS` · `gate-integrity 12` | 测试覆盖 | 自写串行 runner（全量日志 `/tmp/opencode/v3-validate-v34/gates/`，无 tail 截断） |
| **V2** | **BLOCK-1 修复（`tabOrigin`）独立复现**（FR-V3-060~072 生产可达性 / AC-V3-022） | 自写探针：授权 origin 的**带路径**页 `${origin}/app` 激活后 → 面板发 `pick-layer-inject` → 断言 ① `ok:true` ② 回包 `data.tabId` 指向的 tab **真的持层**（防「ok:true 但注入落到别的 tab」）③ `data.origin` == 真 origin ④ 该 tab 隔离世界 `__wcliPickLayer === 'object'` ⑤ Shadow host == 1 ⑥ 该 tab 上右键被接管（行为级）；另测另一 tab 是否为注入目标 | ①~⑥ 全真；回包 tabId ∈ 同 origin 且该 tab 持层 | 接口/数据 + 漂移 | 自写 Chromium 探针（自写 CDP 客户端 + 自写夹具服务器） |
| **V3** | **零注入五探针 + 反证 + 未覆盖态**（FR-V3-067 / NFR-V3-007 / AC-V3-018 / EC-V3-003/014） | 未授权 origin（`localhost`，无 host permission）：① 无 `pick-layer` 注册（含注册扫描**负控**）② Chrome 层注入被拒且原因可读 ③ 无监听/无 Shadow host ④ 右键不拦截 ⑤ 面板明示零注入 + 入口禁用；**反证**：强制 document_start 注入 → 五探针必须翻红。另测两条**未覆盖态**：(a) 撤销后同 origin **另一 tab** 是否同样卸载；(b) 面板对「活动未授权页 vs 已授权 bound 会话」的披露是否自洽、已授权 tab 是否被误拆 | 五探针全零 + 反证翻红；两态均无残留 / 无自相矛盾披露 | 接口/数据 + 性能边界 | 自写探针（`chrome.scripting` 直测 + 主世界 DOM 判据 + `Page.addScriptToEvaluateOnNewDocument` 反证） |
| **V4** | **I-02 复活路径**（FR-V3-067 / ADR-V3-030） | 自写探针：真实产物 + `Page.addScriptToEvaluateOnNewDocument`（= `document_start`）→ 立即 `unmount()` → 正常加载完成 → 断言 `shadowHosts === 0`；前置负控：`documentElement === null`（证明延迟追加**真被武装**）；载体用**未授权** hostname（防「面板在场 ⇒ 自动注入」污染） | ① 负控成立 ② 加载完成后 Shadow host **恒 0** ③ 无层标记 | 漂移检测 | 自写 Chromium 探针 |
| **V5** | **三条退让 + I-03 焦点还原 + 宿主共存**（FR-V3-064 / FR-V3-069 / NFR-V3-009/011 / EC-V3-017） | 自写探针（真实 `Input.dispatchMouseEvent`/`KeyEvent`）：① 仅授权站点生效（未授权见 V3）② 菜单 5 项含「交给页面原生菜单」③ 选中该出口后**下一次**右键交还页面（不 `preventDefault` 且宿主监听器收到）④ 之后恢复拦截 ⑤ `Esc` / 点击空白关闭且不执行动作 ⑥ 宿主自带 `contextmenu` 监听器仍收到事件 ⑦ 焦点还原：**右键落点=输入框**时，`Esc` 后 `activeElement.id === 'host-input'` | ①~⑦ 全真；一次性退让不是永久退让 | 接口/数据 | 自写探针（真实输入事件 + 隔离世界状态读取） |
| **V6** | **I-01②「失去授权 ⇒ 下一次交互自行卸载」的可达性 + 稳定性**（FR-V3-067 / EC-V3-007） | ① 控制组：直接下发 `pick-layer-env(authorized:false)` → 下一次右键必须卸载；② 竞态组：同上后调用**产物自身**的 `refresh()`（= `refreshState → ensureInjected → pick-layer-inject`，会重推 `authorized:true`）→ 观察自检是否失效；③ 静态核：全仓 `pick-layer-env` 的**生产发送点**（谁能送出 `authorized:false`） | ① 必须成立；②③ 若「自检可被产物自身的重注入覆盖」或「生产无 `env(false)` 发送点」→ **登记为发现（分级）** | 接口/数据 + 漂移 | 自写探针 + 全仓 grep |
| **V7** | **R2-1 专项：全部门禁「只断言 ok」形态清扫**（NFR-V3-013 / AC-V3-011/012） | 自写静态扫描器（① 提取每个 `check(label, cond)` 的 `cond` ② 分类「裸真值」与「仅 `ok` 字段」③ 输出来源窗口）逐条判定「是否可被『行为落在错误目标上』蒙混」；对可疑站点做抽样动态验证；覆盖 `journey/insight/binding/hardening/density/l0/l1/l2/l1-reverse/l2-reverse/page-input/zero-injection/e2e` 全部 Chromium 门禁 | 若发现可蒙混站点 → **登记（含 文件:行 + 分级 + 修复建议）**；若全钉死 → 给出扫描方法与覆盖证据 | 测试覆盖 + 漂移 | 自写 node 扫描器 + 抽样动态验证 |
| **V8** | **体积四线 + 33,900 重登记 + `+1B` 反证**（NFR-V3-003/004/005 / AC-V3-015/016） | ① `stat` 实测三条产物；② 报名值 vs 实测（`PICK_LAYER_BASELINE_BYTES` / `FINAL` / `CEILING`、`SIDEPANEL_BASELINE_BYTES` / `CEILING`）逐项；③ `PICK_LAYER_BASELINE_BYTES_HISTORY` 含 32,391 且 `PICK_LAYER_RE_REGISTRATIONS` 链条**首尾相接**、末项 == 当前登记值（机器断言）；④ **`printf ' '` 追加 1 字节 → `33,901` 必须 FAIL → sha256 逐字节还原 → 必须 PASS**；⑤ `content.js +1B @177,077` 同法 | ①②③ 自洽；④⑤ EXIT=1 且命中判据文本，还原后 sha256 一致 | 构建脚本 + 漂移 | 直接命令 + `node --test` + 自跑 `+1B` |
| **V9** | **逐文件字节归因独立复现**（NFR-V3-004 / ADR-V3-031） | 自建 `/tmp` 沙箱（复制 `src/content/*.ts`；esbuild 自写调用、`absWorkingDir` 固定）→ 逐个把 4 个文件回退到 **R2 前**（`1e1b798`）版本重新打包 → 该文件贡献 = 交付态字节 − 回退态字节；核对「登记册 / 台账声明的分布」与「`build.md` 声明的分布」哪个是**实测** | 分布可复现；若登记册声明与实测不符 → **登记为发现（保真）** | 构建脚本 | 自写 esbuild 归因脚本 + `git show` 取历史文件 |
| **V10** | **台账 / 保护域 / 取代登记**（AC-V3-011/012/014） | ① `V34-*` / `V34R2-*` / `V34F-*` 逐条 `newTitle` 可定位（自写 literal+regex 复算）；② 「他叶 `registeredUncoveredLines` 追加 12 行」逐行与叶起点 `bf5773d` 对照 + 该字段既有分组是否**只增未改**；③ 两个 `protectedRanges` 字节区间 sha256 独立复算；④ `entries` 是否有**被改写**的既有条目（逐条 JSON 等值比较）；⑤ 叶段删除行覆盖（门禁 + 我的复算） | ①②③④⑤ 成立或偏差被**如实登记** | 漂移检测 | 自写 python（JSON 等值比较 + 字节 hash + `git show`） |
| **V11** | **零改动红线**（NFR-V3-003/006/018 / AC-V3-017） | 独立 `sha256sum` / `stat` / `git diff`：`content.js` 三冻结源 hash == pin、`dist/content.js` == 177,076 且 sha == 既有值、`manifest.json` 零 diff 且无 `contextMenus`、无 `externally_connectable`、判定链 `ref-validity.ts` 零 diff、`package.json` 依赖零新增、阈值逐字 `7/15·9/20·17/35`、主界面无常驻输入框、`main` 仍在 `2ddc922`、工作树干净 | 全部逐字不变 / 零 diff | 漂移检测 | 直接命令 |
| **V12** | **密度独立复测（自写口径）**（NFR-V3-003 关联 / AC-V3-001~004 复用） | 按登记册口径定义**自写** C1/C2/C3/C4 实现；用产品 seam 构造 `default` / `firstRun` / `risk(hardline)` 三档 × 320/400/520 共 **9 格** → 与 `docs/v3-density-baseline.json` 登记格**逐格对照**；附幂等复测 + `default` 稳态（`#notice`）前置负控 | 9/9 逐格相等；`default` 三视口 `7 可点 / chars 220` 零漂移 | 性能/边界 | 自写 Chromium 探针（自写口径实现，不 import 被测口径） |
| **V13** | **AC-CONV-1/2 生产接线**（spec §7.1 / N-06 硬性） | ① `setEnv` 的**生产**调用点是否唯一且由 `render()` 调用（独立 grep + 读码）；② `dispatchRefAction(` 全仓调用点是否唯一（独立 grep）；③ env 字段是否来自**页面实报**（`documentId`/`navSeq`）与 SW 派生的声明 hash；④ 缺字段是否 fail-closed | ①② 唯一且非 seam；③ 来源真实；④ fail-closed | 接口/数据 | 独立 grep + 读码 + 门禁实跑（`ref-wiring` 用例） |
| **V14** | **文档 / 登记册数字漂移** | 把 `build.md` v1.2 / `review-report.md` / 台账 / 基线 / 体积登记册的每个可核算数字与我的实测逐项对照（含百分比、`floor` 公式、归因分布） | 声明值 == 实测；不一致即登记（含方向与可执行修复） | 漂移检测 | 自写 python / grep 对照 |
| **V15** | 人工面 6 项（NFR-V3-015 / AC-V3-025） | 拾取观感 / 拖动体感 / 右键菜单观感 / 宿主真实兼容 / 多显示器 / 高 DPI | `⏳ 未执行`（如实登记，**不冒充 PASS**） | — | — |
| **V16** | **反证完整性与元门禁**（NFR-V3-012/013/018） | ① 复跑 `l1-reverse`（9）/ `l2-reverse`（10）确认「注入 → FAIL → sha256 复原 → PASS」；② 复跑 `gate-integrity` 12/12 并独立复算受审文件集合；③ 复跑 `supersession` 14/14；④ 核对 in-gate 反证模式清单条数 | 全绿且条数 == 声称 | 测试覆盖 | 直接命令 + 自写复算 |

---

## 3. 通过标准（本叶）

| 条件 | 要求 |
|------|------|
| 功能需求覆盖 | FR-V3-060~072 **13/13** 有可执行判据且通过；AC-CONV-1/2 两条硬性项独立成立 |
| 非功能需求覆盖 | 门禁级 NFR 全绿；人工面（NFR-V3-015）如实 `⏳` |
| 构建通过 | `typecheck` / `build` / 体积四线退出码 0 |
| 门禁 | 19 项串行全绿且计数**只增不减**（`page-input` ≥78 期望 78/0） |
| 严重漂移 | **0** 项（文档/登记册的保真偏差按级登记，不掩盖） |
| 阻塞问题 | **0** 项 |
| 结论类型 | ✅ 通过（全部达标）/ ⚠️ 有条件通过（非阻塞偏差）/ ❌ 不通过（未覆盖 FR / 构建失败 / 严重漂移） |
