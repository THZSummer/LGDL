# 审查报告：specs-tree-v3-2-l1-disclosure-refs

> **文档定位**: SDDU 审查报告 — 逐项记录自主审查的执行结果，作为 validate 阶段的输入
> **审查策略**: `review.md`（C1~C38 审查清单 + 五维度 + 门禁可失败性专项）
> **前置依赖**: `review.md`、`spec.md`（本叶 + 父）、`plan.md`、`build.md`、v3-1 先例
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-16
> **审查轮次**: **R1**（build + 修复轮产物 `e39a58f` 的首次独立静态审查）
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-16
> **更新说明**: 初始创建（R1 全量静态审查：C1~C38 逐项结论 + §1 虚绿疑点判定（受控证伪实验原文）+ 打假面判定 + 虚绿扫描原文 + 零改动核验原文 + 未能验证项）

---

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查项总数 | 38（C1~C38） |
| 通过 | 33 |
| 警告 | 5（C2 / C17 / C18 / C29 / C31） |
| 失败 | 0（本叶代码）· 1 项跨叶失败 F-01（`test/ui/binding.mjs` 门禁**不可 FAIL**） |
| 阻塞问题 | **0**（本叶交付无需重实现） |

### 🔴 一句话结论

**⚠️ 有条件通过（0 阻塞）** —— 本叶产物（代码 / 新门禁 / 体积裁决执行 / 台账 / 反证）经独立核对**全部成立**；`binding.mjs` 的「失败被打成绿」在 §2 被判为 **真缺陷（非日志假象）**，但该缺陷**预先存在于 v2 R2（`02ee715`）、非本叶引入、且不推翻本叶任何结论**，故不构成本叶阻塞，须在后续依赖其退出码的叶之前修复。

---

## 2. 🔴 §1 最高优先级：`binding.mjs` 虚绿疑点的独立判定

### 2.1 判定结果

| 问题 | 判定 |
|------|------|
| 「3 条瞬时失败但 `$?` 记为 0」是真缺陷还是日志/退出码传递假象？ | **真缺陷 —— 门禁内部缺陷，不是日志或 `$?` 采集假象** |
| 缺陷位置 | `test/ui/binding.mjs` 的 **失败尾段**：`await dumpDiagnostics(...)` **先于** `process.exit(1)`；`dumpDiagnostics` → `captureRuntimeSummary()` → `evaluate(cdp, ...)` → `connectCdp().send()` **无超时、无 close 监听**，在对已 CLOSED 的 CDP WebSocket 调用时 Promise **永不 settle** |
| 后果 | `process.exit(1)` 永不执行；事件循环耗尽 → Node **以 0 自然退出** → 断言失败**不打进退出码** |
| 首次引入 | **v2 R2 修复轮 `02ee715`**（`dumpDiagnostics` 加入之时），**v3-1 / v3-2 均未改动 `test/ui/binding.mjs`**（`git diff --stat e45ca53..HEAD -- …/binding.mjs` 为空） |
| 自报是否准确 | 修复轮 `build.md §9.6.7` 的自我披露**实质正确**（「门禁把 FAILED 打成了绿」「该门禁自身的完整性疑点」「失败轮日志以 `binding FAILED (3)` 结尾且未出现『诊断已落盘』行，随后进程以 0 退出」），本轮把根因定位到具体代码行 |

### 2.2 实验原文（三段，逐字）

#### 实验 A — 机制微实验（无 Chromium）：`/tmp/opencode/review-probe/ws-closed-send.mjs`

```
[A1] 等待 server 主动关闭后 readyState = 3（2 = CLOSED）
[A2] CLOSED 状态下 ws.send() 是否抛异常 = no（复刻 send() 行为）
[A3] pending Promise settle 状态 = never（永不 settle）
[A4] .catch() 是否运行 = no（若 never → dumpDiagnostics 的 try/catch 无法兜底）
Warning: Detected unsettled top-level await at file:///tmp/opencode/review-probe/ws-closed-send.mjs:65
[A5] 未 settle 的 await 挂起时，Node 自然退出码 = 13
EXIT=13
```
（`A5=13` 是**顶层 await** 特例；`binding.mjs` 用的是 `main().catch()` 形态，故需实验 B。）

#### 实验 B — 复刻 `binding.mjs` 尾段形态（无 Chromium）：`/tmp/opencode/review-probe/main-catch-shape.mjs`

```
binding FAILED (1):
  - AP#7 延迟就绪后站点工具面自动装配
EXIT=0
```
→ **`binding FAILED (N)` 打印完毕、无「诊断已落盘」行、退出码 0**，与 `build.md §9.6.7` 描述的失败轮签名**逐项一致**。

#### 实验 C — 受控证伪（真实 `binding.mjs` 副本 + 1 次 Chromium）

副本与原文件**逐字节相同**（sha256 `7bb9cc072c23e14d0c0e96ad29396cb2fc80e2b64e018ebafe3db92b562bfa5d`），
**唯一改动 1 行**（差异全文见下），其余零改动：

```diff
2250c2250
<     check(false, 'AP#7 延迟就绪后站点工具面自动装配', JSON.stringify(rr.tools));   # 副本（受控变红）
---
>     check((rr.tools ?? []).includes('site_delayed-status'), 'AP#7 延迟就绪后站点工具面自动装配', JSON.stringify(rr.tools));   # 仓库原文件
```

采集方式与 `run-main-gates.sh` 同构（**无管道**）：`timeout 900 node test/ui/binding.mjs > log 2>&1; echo $?`

```
EXIT=0  ELAPSED=269s
--- tail 8 ---
  · 阶段 3 临时 dist：host_permissions += http://127.0.0.1/*（JS 字节未改；headless 无原生弹窗）

binding FAILED (4):
  - AP#5 探测失败后自动进入退避重试（零点击）
  - AP#5b 退避为有界序列（500ms 起，封顶 15s）
  - AP#6 站点延迟就绪后自动探测到 supported（全程零点击）
  - AP#7 延迟就绪后站点工具面自动装配
--- FAILED count / diagnostics line ---
4
235:binding FAILED (4):
```
→ **断言失败被计入（4 条）且日志以 `binding FAILED (4)` 结尾，但进程退出码 = 0，且不出现「诊断已落盘」行**。
→ 判定：**真缺陷**（门禁对断言失败当前**不可 FAIL**）。

> 旁证：字符串「诊断已落盘」在**全部历史门禁日志中一次也未出现**（`grep -rl 诊断已落盘 /tmp/opencode` 仅命中源码与我本轮写的复刻脚本）→ T4 引入的诊断设施**自加入起从未成功执行过**。

### 2.3 可执行修复建议（最小、不放宽任何断言）

```js
// ① test/ui/binding.mjs —— 退出码必须在任何可能挂死的 await 之前定死
if (failures.length) {
  console.error(`binding FAILED (${failures.length}):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exitCode = 1;                                    // ← 关键 1 行
  await Promise.race([dumpDiagnostics('main: assertions failed'), sleep(15_000)]); // ← 诊断降级为尽力而为
  process.exit(1);
}
// ② 同一处修复 main().catch(...)（:2313 亦是 dumpDiagnostics 后 exit）

// ③ test/ui/binding.mjs connectCdp().send() —— 让 CLOSED / 超时不再"静默挂死"
send(method, params = {}, timeoutMs = 20000) {
  return new Promise((res, rej) => {
    if (ws.readyState !== 1 /* OPEN */) { rej(new Error(`CDP socket not open (${ws.readyState}): ${method}`)); return; }
    const id = ++seq;
    const t = setTimeout(() => { pending.delete(id); rej(new Error(`CDP timeout ${timeoutMs}ms: ${method}`)); }, timeoutMs);
    pending.set(id, { resolve: (v) => { clearTimeout(t); res(v); }, reject: (e) => { clearTimeout(t); rej(e); } });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
// ④ 附：ws.addEventListener('close', () => { for (const [, p] of pending) p.reject(new Error('CDP socket closed')); pending.clear(); });
```
**验收方式**（可复现）：把 `AP#7` 期望值改成 `false`（或任一等价必红断言）→ `node test/ui/binding.mjs; echo $?` 必须**非 0**；还原后必须 PASS 192。

### 2.4 影响面判定（是否波及 v3-1/v3-2 的 binding 192 结论）

| 对象 | 是否受影响 | 依据 |
|------|:--:|------|
| 本叶「`test:binding` 192 PASS」 | **不受影响（结论成立）** | 该 PASS 由**日志内容**独立佐证：`v3-2-fix/10-binding.log` 与 `v3-2/binding.log` 与 `v3-1-closeout/24-test_binding.log` 均为 `✔ 192` / `✖ 0` + `binding PASS` 行（我逐份计数复核） |
| v3-1「binding 192」 | **不受影响（结论成立），但其『exit=0』从来不是有效证据** | 同上；缺陷只意味着**真红会被打成绿**，不意味着 PASS 是假的 |
| 「`exit=0` ⇒ binding 通过」这一推理范式 | **完全失效**（缺陷前、缺陷后的全部 exit=0 记录均无语义） | 实验 C 直接证伪 |
| 本叶修复轮对失败轮的处理 | **处置正确**（如实登记 + 4/4 独立复跑 + 最终链 PASS；只是当时未定位到根因） | `build.md §9.6.7` + 我本轮定位 |

**是否仅特定瞬时路径？** —— **不是**。失败路径**只有一条**（`failures.length` 非空 → 尾段），任何断言失败、以及任何 phase 的 harness error，都汇聚到同一个 `await dumpDiagnostics` → 退出码 0。即：**在 dist/CHROME/站点三个前置检查之后，`binding.mjs` 当前不存在能以非 0 退出表达「断言失败」的路径**。

### 2.5 其它 Chromium 门禁的同类模式扫描（原文）

```text
$ python3 … （对 test/ui/*.mjs + test/e2e/*.mjs 扫描：process.exit 行前 4 行内存在 await 或 process.exitCode）
test/ui/binding.mjs:2305  exit-line='process.exit(1);'  preceding=["await dumpDiagnostics('main: assertions failed');"]
test/ui/binding.mjs:2313  exit-line='process.exit(1);'  preceding=['await dumpDiagnostics(`main: uncaught …`)']
（其余仅有 binding.mjs:484 的 ensureSite 前置分支，其 await sleep(250) 不会挂死，exit 语义正常）

$ grep -rn "process.exitCode" test/ src/          → 0 命中（全仓无此护栏）
$ grep -n "process.exit" test/ui/{journey,insight,l0,l1,density,hardening}.mjs
   journey.mjs:1581  process.exit(1);   // 同步，前一行仅 console.error    ✅ 可传播
   insight.mjs:1513  process.exit(1);   // 同步（注意 insight 使用顶层 `await main()`，但失败分支自身同步 exit）✅
   hardening.mjs:519 process.exit(1);   // 同步                              ✅
   l0/l1/density      → 经 _v3-helpers.mjs `finish()` → process.exit(1)（同步）✅
   l1-reverse.mjs:190/284 → 同步 exit(1)/exit(2)                            ✅
   e2e/fullchain.mjs      → 同步 exit(1)                                    ✅
```
**结论：`binding.mjs` 是 8 个 Chromium 门禁中唯一存在「失败不计入退出码」路径的文件**（也是唯一在失败前 `await` 的门禁）。
附带（非虚绿，仅健壮性）：`_v3-helpers.mjs:99-105` 的 `send()` 同样无超时/无 close 处理 —— 但 `finish()` 是**同步** `process.exit`，故不会虚绿；若运行中途 socket 断开，表现为**挂死**（由 `timeout` 兜成非 0），不是假绿。建议同法加固（低优先）。

---

## 3. 逐项审查结果（C1~C38）

| # | 审查对象 | 审查基准 | 评估 | 发现（含证据） | 严重程度 |
|---|---------|---------|:--:|------|:--:|
| C1 | L1 不遮挡 L0 | FR-V3-030 | ✅ | `l1.mjs` ② 断言 `railInView/cardInView` + `railCard=0 / cardGroup=0` + `#panel-main` 内滚动容器仅 `#log`；`07-l1.log` 88/0 | — |
| C2 | 8 类逐类 ≤1 次 + 无偷加 L0 入口 | FR-V3-031 / ADR-V3-021 | ⚠️ | ① 段 8 类逐一「默认 hidden → 1 次点击可见 + 非空文本」均 PASS；`ENTRY` 表**只**使用 3 个既有 L0 入口（`l0-status-band` / `l0-ref-toggle` / `l0-more`），**未新增 L0 入口**；默认档 C1 实测仍 = **7**（`05-density.log` 阶段 B/E），与登记值逐格相等 ⇒「没偷偷撑破默认档」成立。**但**：5 类（①④⑤⑥⑦）的「逐类」断言实际由**组展开**满足（一次点击同时展开 5 类，门禁第 210 行自述「L0 可点预算 7/7 满额，故入口复用」）——满足「每类 ≤1 次」的**字面要求**，但不构成「各入口相互独立」的证明（FR 未要求独立，故不判违规） | 低 |
| C3 | 两段必填 + 不可逆声明 | FR-V3-032 | ✅ | `l1.mjs` ③：4 选项→4 块、每块「会发生什么」「不会发生什么」全 true、破坏性项显示 `不可逆性声明：`、非破坏性项不显示 | — |
| C4 | 证据四要素 + 只读 | FR-V3-033 / NFR-V3-008 | ✅ | ⑪：四要素（稳定选择器/语义路径/文本摘要/捕获时间）齐备；`#l1-ref-rows` 内 button/input/select/textarea = 0，`[data-l1-panel] [data-write-op]` = 0 | — |
| C5 | 局部树 ≤3 + 父链 + 全局入口 | FR-V3-034 | ✅ | `local-tree.ts` 硬上限裁剪（单测「主归属链裁剪 ≤3 且不复制节点」）；`l1.mjs` 注入 v2 形状快照 → `count ≤ 3` 且 `labels.length === rows.length === count`、含当前节点、交叉引用徽标、`#l1-local-tree-global` 存在 | — |
| C6 | 历史 N 可复算 + 零副作用 | FR-V3-035 | ✅ | `panels.ts:300-319` observe 记录（含 `changed`）；⑪：1→2 与 `rounds.length` 一致、`changed=true` 命中、展开前后 `refs` 逐字不变 | — |
| C7 | 五维 + 不确定即失效 | FR-V3-036 / EC-V3-001 | ✅ | `ref-validity.ts:214-236` 判定顺序固定且文档化；五维逐一注入 → `invalid` + 维度命中 + 逐字文案（`l1.mjs` ⑦）；5 个 unknown 场景 → `unknown`；三态/环境不可得/`navSeq` 缺失等 11 例单测 | — |
| C8 | 常驻 + 可读原因 + 阻断 | FR-V3-037 | ✅ | ⑧：有效引用放行（计数 +1，非空转对照）、失效引用 `allowed=false` 且计数增量 0、可读原因非空、风险行三通道齐备、`#l0-ref-toggle` `aria-disabled=true`、`#l0-pick` 改写「重新拾取」；`#risk-rail` 仍在 `disclosure` 白名单外（`assertFoldable` 抛错） | — |
| C9 | 两条恢复路径 | FR-V3-038 / FR-V3-012 | ✅ | ⑨：「改用描述」→ 既有 `#ask-fallback`（`index.html:1155` 默认 hidden，无新输入框）；「重新拾取」→ **新 id**（`beforeIds` 不含新 id）且 `judge` 后回到 `valid`、`stale=0` | — |
| C10 | 回执三件套 + 重拉为真 | FR-V3-039 | ✅ | `panels.ts:392-419` `pullReceipt` 先 `refreshSeq += 1` 再 **`await deps.refreshSnapshot()`**（真实重拉）；⑩：`seq1=1/seq2=2`、三件齐备、L0 摘要常驻、8 行白名单、`#l1-receipt-audit`「查看审计」+ 点击 `#l2-entry-audit` 后 `#view-host` 可见。**限缩**：只证「L2 宿主被打开」，未证审计视图**内容**（L2 内容归 v3-3，属声明内边界） | 低 |
| C11 | 入口文字 + 计数 + ARIA | FR-V3-040 / AC-V3-010 | ✅ | ⑪：8 入口文字非空 + `data-count` 为真值（手势 4≡表行数、选项 4、回执行 8）；ARIA 成对由 `disclosure.apply` **结构性强制**（缺 `aria-expanded`/`aria-controls` 即抛 `DisclosureError`，且 `collapseAll()` 遍历全部 9 目标 → 缺失会使门禁以异常失败） | — |
| C12 | 引用 id 单源贯穿 | FR-V3-071 | ✅ | `ref-store.create` 单源 `ref_<n>`（单调、`reset` 不重置 `seq`）；单测覆盖；风险行经 `staleRef` 覆盖复用同一 id/glyph | — |
| C13 | 密度不回归 | NFR-V3-001/002 | ✅ | `05-density.log`：default 三视口 `7/7 · 7/15 · 19 · 6` 全 PASS、firstRun `7/9 · 12/20 · 25 · 6`、risk worst `9/17 · 13/35 · 25 · 6`；`F 22 个登记格实测 == 基线登记值`、`F 几何下界 495 ≥ 488`；`l1.mjs` ⑫ 三视口往返后仍达标 + 折叠态复原 | — |
| C14 | 体积裁决执行合规 | NFR-V3-005 / V3-VOL-1 | ✅ | 见 §5（C34 合并结论）：cap 仅出现在「记录/断言其不参与判定」的位置，零条件用法；公式 `floor(327,679×1.05) = 344,062` 与 `volume.ceilingBytes` 一致；实测 `content.js 177,076`/`sidepanel.js 327,679` | — |
| C15 | 只读 + 零明文 + 去参 | NFR-V3-008/016 | ✅ | `receipt.assertNoPlaintext` 在**构建器内**抛错（非依赖门禁记得跑）；`targetDigest` 去 `?#`+40 字截断；⑩ 实测证据文本无 `?k=v` / 无 `api[-_]?key` | — |
| C16 | 串行 + 日志 + 计数只增 | NFR-V3-012/013/014 / AC-V3-012 | ✅ | `run-main-gates.sh` 顺序执行且 `"$@" > log 2>&1; code=$?`（**无管道**，退出码真实）；`00-exitcodes.txt` 12/12 `exit=0`；计数：npm test 646→**754**、l0 137→157、density 127、l1 88(新)、supersession 11、journey/insight/binding/hardening 不变（均取自日志逐份复核） | — |
| C17 | 主题/溢出/无障碍 | NFR-V3-009/010/011 | ⚠️ | L1 的 ARIA 成对由控制器强制（见 C11）；但 `l1.mjs:193` 采集了 `trigger.getAttribute('aria-expanded')` 却在 :198 的判据中**未使用**（采集即弃），故「L1 触发器 aria-expanded 切换正确」**没有直接断言**；明暗主题与 320–560px 零溢出对本叶 L1 展开态**无独立断言**（依赖 v3-1/insight 既有守卫，且它们只覆盖折叠态） | 低 |
| C18 | EC 边界覆盖 | §6 EC 表 | ⚠️ | EC-001/007/011/013/014 有明确落点（判定/恢复/门禁 FAIL 语义/跨站/计数）；EC-006（操作中元素消失 → 不发命令 + 回执如实）由 `missing` 路径覆盖；**EC-V3-015（破坏性确认期间折叠披露层、风险行与确认选项仍在 L0 可见）未见本叶直接断言**（只有「风险位不可折叠」的结构保证） | 低 |
| C19 | 判定模块纯粹性 | ADR-V3-020 | ✅ | `ref-validity.ts`/`ref-store.ts`/`local-tree.ts` 无 `chrome.*`、无 `document`、无时钟读取（`capturedAt`/`now` 由调用方注入）；单测「同输入同输出 + 不修改入参」 | — |
| C20 | 错误处理 / 无静默吞 | §5.1 | ✅ | 全 `src/**` `catch {}` 命中 **0**；`disclosure.ts:154` 的 `catch { return null; }` 是**非法选择器回退**（目标存在性检查仍会抛 `DisclosureError`），非吞失败 | — |
| C21 | 无硬编码魔法值 | §5.1 | ✅ | `TEXT_DIGEST_MAX=80` / `SEMANTIC_PATH_MAX=120` 导出单源；`REASON_TEMPLATES` / `UNKNOWN_CAUSE_TEXT` 常量表逐字 pin（门禁逐字比对） | — |
| C22 | 无冗余/重复实现 | NFR-V3-014 | ✅ | 复现 `npm run size:attribution -- --rev cf2af32 --rev 615bd0f`：`Δ = 32,454 B`、`Σ per-module = +32,224`、未归因 230；`tree-receipt.ts Δ=0`、`tree-model.ts Δ=0`、`ownership-tree.ts` 首次引用 +341（**共享非复制**）；47 个输入模块路径互不相同 | — |
| C23 | 可读性 / 职责单一 | §5.1 | ✅ | `l1/` 五模块边界清晰（判定 / 状态 / 局部树 / 回执 / 渲染派发），模块头注释含需求编号与不变量；导出面窄（`createXxx` 工厂 + 纯函数 + 常量） | — |
| C24 | 纵深防御 | FR-V3-037 | ✅ | 双层：`panels.dispatchRefAction:351`（`isRefUsable`）+ `ref-store.dispatch:155-161`（重新判定 `verdict !== 'valid'`）；「只关一层仍 PASS」（`13-rp-l1-reverse-round0.log`）**不是纵深缺口**——内层另有**独立单测** pin（`test/l1-ref-validity.test.ts:156-168` dispatch 失效态零发送 + 正确态放行对照），且该单测经 `node --test` 真实传播退出码 | — |
| C25 | ADR 遵循 | plan/ADR-V3-020~024 等 | ✅ | 判定只在侧栏侧（页面侧只报原始事实，`RefResolution` 无 verdict 字段）；引用 id 单源；折叠器语言复用 v3-1（`collapseAll`/`expandMemory` 未另起一套）；无新权限 | — |
| C26 | 文件影响对齐 | plan 文件影响 + build §2 | ⚠️ | 真实 `git diff --stat e45ca53..HEAD` = **10 新增 / 17 修改**；`build.md §1` 的「新增 10」✓ 与「修改 13」仅在**建设轮口径**下成立，修复轮追加的 4 个修改文件（`build.mjs` / `density-thresholds.test.ts` / `density.mjs` / `l0.mjs`）**未回填该表**（内容在 §9 有记载） | 低 |
| C27 | 受保护面零删改 | NFR-V3-014 / AC-V3-011 | ✅ | **我实跑** `npm run test:supersession` → `ℹ tests 11 / pass 11 / fail 0`，含 `✔ 既有门禁文件零删除——**每一条删除行**必须逐行命中台账或 modifiedRanges`、`✔ entries[].newTitle 必须能在目标文件定位（防橡皮图章）`、`✔ protectedRanges 字节区间 hash 不变`、`✔ zeroDiffFiles 必须 0 行 diff`、`✔ 计数不吃下界（l0 68≥68 / density 60≥60 / l1 55≥55）` | — |
| C28 | 边界不越 | 父 §2.2 / 红线 | ✅ | `git diff e45ca53..HEAD` 未触及 `src/content/**`、`src/security/**`、`manifest.json`、依赖段、`main`；`src/insight/**` 只读复用（未改） | — |
| C29 | **新代码虚绿扫描** | NFR-V3-013 | ⚠️ | 原文见 §7：**发现 1 处恒真断言**（`test/ui/l1.mjs:473` `check(..., true, ...)`）。其余模式（`assert.ok(true)` / `|| true` / 空 `catch {}` / `skip`/`only` / 提前 `exit(0)` / 被 try 包住的断言）**0 命中** | 中 |
| C30 | 反证独立性 | NFR-V3-013 | ✅ | `l1-reverse.mjs` 注入的是**门禁真读的 `dist/sidepanel.js`·`dist/sidepanel.html`**（非副本/旁路），并要求 `failRun.code !== 0` **且** 出现 `✖` 且匹配期望断言，还原后 sha256 逐字且 PASS；`13-rp-l1-reverse.log`：A~H **8/8** `FAIL 段 exit=1 · 命中 ✔ · sha256 复原 ✔ · 还原后 PASS ✔`，末行 `最终产物复原核对：✔ sha256 与原始构建逐字一致`；既有 RP 复跑日志（01/03/04/08/09、05 67<68→68≥68、06 177,077→177,076、I1 156/1→157/0、VOL-1① 344,063→344,062）逐份核对有效 | — |
| C31 | 断言有效性 | §5.4 | ⚠️ | 非空转对照到位（`goodAllowed/before≥1` vs `badAllowed/after==before`；`seq1=1→seq2=2`；RP-L1-D/G 可打破）。**弱断言**：`check('⑪ 局部树注入…', true, …)`（同 C29）；`p.aria` 采集未用（同 C17）；`panels.ts:397` 无绑定工具时 `present = true`（语义上应为 `n/a`，该字段未进门禁断言，不构成虚绿） | 低 |
| C32 | 覆盖完整性 | §5.4 | ✅ | FR-V3-030~040 + 071 + 012 均至少一条可执行断言（`build.md §3` 映射表逐条回代码定位成立）；双层：11 个纯 Node 单测（`npm test`）+ 88 条运行时（`test:l1`）；`l1.mjs` 静态 `check(` 调用点 55 == 台账 floor 55 | — |
| C33 | **门禁退出码可传播性** | NFR-V3-013 | ❌ | 见 §2：`binding.mjs` **不可 FAIL**（真缺陷，预先存在）。本叶新门禁 `l1.mjs` 经 `finish()` 同步 `exit(1)`，**可 FAIL**（RP-L1-A~H 的 `FAIL 段 exit=1` 即其证据） | **高（跨叶）** |
| C34 | 体积裁决合规 + 归因可复现 | V3-VOL-1 | ✅ | 见 §5 打假面 4 | — |
| C35 | 台账非橡皮图章 | AC-V3-011 | ✅ | 见 §5 打假面 9 | — |
| C36 | 文档数字保真 | 证据链 | ⚠️ | 见 §5 打假面 11：**大多数数字逐一对上**；3 处不一致（spec 未随裁决更新 / density 登记册 stale note / build.md build-info 232·237 不可复现）+ 1 处（§2.2 表未回填） | 中 |
| C37 | 红线零改动 | 父 plan 红线 | ✅ | 见 §8 原文 | — |
| C38 | 审查纪律 | 本轮边界 | ✅ | 见 §9 | — |

---

## 4. 🎯 其余重点打假项判定

### 4.1 ✦ 体积裁决合规性（裁决 V3-VOL-1）

**(a) `SIDEPANEL_CEILING_CAP` 是否真的降级为纯记录（全文搜索确认无分支使用它做判据）—— ✅ 成立**

```text
$ grep -rn "SIDEPANEL_CEILING_CAP" src/ test/ --include=*.ts --include=*.mjs | grep -E "<=|>=|< |>|min\(|max\(|Math\."
test/size-baseline.ts:107: *   （注释，说明旧机制）
test/density-thresholds.test.ts:453:  assert.ok(baseline.volume.ceilingBytes > SIDEPANEL_CEILING_CAP_RECORD, …)      # 断言 cap 不是约束
test/size-budget.test.ts:68:  assert.ok(SIDEPANEL_CEILING > SIDEPANEL_CEILING_CAP_RECORD, …)                     # 同上
test/size-budget.test.ts:303:  … SIDEPANEL_CEILING > SIDEPANEL_CEILING_CAP_RECORD …                              # 同上
```
- 判定路径 `evaluateSidepanelSize()` **已删除 cap 形参**，ceiling 仅 = `Math.floor(baseline × 1.05)`；`SIDEPANEL_CEILING_UNCAPPED === SIDEPANEL_CEILING` 被断言（「判定里没有隐藏上限」的机器证据）。
- `SIDEPANEL_CEILING_CAP_ROLE = 'record-only'` 且别名 `SIDEPANEL_CEILING_CAP === SIDEPANEL_CEILING_CAP_RECORD`（值 306,099）被断言。
- **反向守卫**：`evaluateSidepanelSize(306,099 + 1).ok === true`（cap 之上仍 PASS ⇒ cap 不在判定中，4 处同源断言）。
- 密度门禁阶段 F 读的是 `baseline.volume.ceilingBytes`（= 344,062），不是 cap。
⇒ **cap 已无任何判定用法**。

**(b) 四条替代守卫是否真能 FAIL —— ✅ 成立（①②④ 有实跑/反向反证；③ 为数据驱动比较）**

| 守卫 | 能否 FAIL | 证据 |
|---|---|---|
| ① 公式 `floor(baseline×1.05)` | ✅ 实跑 | `19-RP-sidepanel-ceiling-fail.log`：`344,063 > 344,062` → 测试 `✖ V2-2 size: built sidepanel.js stays within the regression ceiling`；还原 → `20-…-pass.log` 16/0 |
| ② 重登记披露登记册 | ✅ 结构可 FAIL | `size-growth-evidence.test.ts` 4 个用例：字段齐备 / 链条首尾相接（`rounds[i].before === rounds[i-1].after`）/ 日期单调 / 末项 == 当前基线 == 实测产物 / `_HISTORY`·TIMELINE 逐字保留 / 台账条目可定位；任一字段缺失即断言失败 |
| ③ 增长正当性证据 | ✅（数据驱动，非恒真） | `size-growth-evidence.test.ts` 用**真实 esbuild metafile**（`dist/build-meta.json`）逐模块比对；实跑日志 `03-npm-test.log:635 ✔ V3-VOL-1 ③ growth: the real esbuild metafile agrees with the recorded breakdown (when built)`（`ℹ skipped 0` ⇒ 未走 skip 分支） |
| ④ >15% 方向性告警 | ✅ 有正反双向 | 正：当前 `warning !== null` + 百分比可读（`+22.96%`）；反：合成两轮 +6% → `warning === null`、单轮 → `null`、阈值调到 1% → 必须告警（`317/329` 行断言）。**告警非红灯**（build.md §9.6.5 已如实登记为「告警 + 同源登记」，按裁决措辞实现） |

**(c) 增长正当性证据可复现 —— ✅ 成立（我实跑复现）**

```text
$ cd packages/web-cli-plugin && npm run size:attribution --silent -- --rev cf2af32 --rev 615bd0f
base = cf2af32 (295510 B) · head = 615bd0f (327964 B) · Δ = 32454 B
… | src/ui/sidepanel/l1/panels.ts | — | 13729 | +13729 | NEW |
… | src/ui/sidepanel/l1/ref-validity.ts | — | 5255 | +5255 | NEW |
… | src/ui/sidepanel/l1/ref-store.ts | — | 3340 | +3340 | NEW |
… | src/ui/sidepanel/l1/receipt.ts | — | 2833 | +2833 | NEW |
… | src/ui/sidepanel/l1/local-tree.ts | — | 658 | +658 | NEW |
… | src/insight/ownership-tree.ts | — | 341 | +341 | NEW |
… | Σ per-module | | | **+32224** |
unattributed runtime glue Δ = 230 B
```
- 逐行与 `SIDEPANEL_GROWTH_BREAKDOWN.rows` / `build.md §9.2` 表**完全一致**；
- 求和自检：新必需 13,729+5,255+3,340+2,833+658+341 = **26,156** ✓；接线 4,004+771+655+393+25 = **5,848** ✓；归因位移 108+71+27+5+4+3+2+0 = **220** ✓；32,224 + 未归因 230 = **32,454** = Δ ✓；
- 百分比自检：26,156/32,454 = 80.6% ✓、5,848/32,454 = 18.0% ✓、32,004/32,454 = 98.6% ✓；累计 (327,679−266,500)/266,500 = **22.96%** ✓；`floor(327,679×1.05) = 344,062` ✓。
- **唯一出入**：`src/build-info.ts` 一行登记 `232 → 237`，HEAD 版工具实测 `207 → 212`（Δ 同 5）。原因：登记值取自修复轮**中间版**工具（该副本 sha256 `baa95a81…` ≠ HEAD `442a5d0e…`，其 `define __BUILD_STAMP__` 不同 ⇒ build-info 的 `bytesInOutput` 差 25 B，且其 `unattributed` 为 1,751 而非 230）。**Δ 与结论不变**，属登记保真问题（见 I-04）。

### 4.2 ✦ 逐断言反证 A~H 是否真 —— ✅ 全部成立

| 反证 | 扰动落点（门禁真读？） | FAIL 段真 FAIL？ | 还原逐字节？ | 备注 |
|---|---|---|---|---|
| RP-L1-A 五维逐字原因 | `dist/sidepanel.js`（`l1.mjs` 载入） | `exit=1 · 命中 ✔` | `sha256 复原 ✔` | 追加 1 字节使逐字比较失配 |
| RP-L1-B 5 个 unknown 文案 | 同上 | `exit=1 · ✔` | ✔ | 5 条 `✖` 同现 |
| RP-L1-C 阻断 | 同上 | `exit=1 · ✔` | ✔ | 从**判定权威单点**注入（见下） |
| RP-L1-D 非空转对照 | 同上 | `exit=1 · ✔` | ✔ | `sends += 1` → `+= 0` |
| RP-L1-E 改用描述 | 同上 | `exit=1 · ✔` | ✔ | handler → 空操作 |
| RP-L1-F 重新拾取 | 同上 | `exit=1 · ✔` | ✔ | `repick()` 早退 |
| RP-L1-G 重拉为真 | 同上 | `exit=1 · ✔` | ✔ | `refreshSeq += 1` → `+= 0` |
| RP-L1-H 8 类 DOM 契约 | `dist/sidepanel.html` | `exit=1 · ✔` | ✔ | 8 处属性改名 |

- **「扰动加了但门禁根本不读」的情形：0**。判据是双重的 —— 驱动要求 `failRun.code !== 0` **且**输出含 `✖` 且匹配期望断言；若门禁不读该字节，FAIL 段不可能出现 `✖`，驱动会记 `failures` 并以 `exit=1` 收尾。
- **还原是逐字节的**：从 `/tmp` pristine 备份回拷 + `sha256` 比对 + 循环结束 `finally` 再还原 + 末尾 `最终产物复原核对 ✔`。
- **「只关一层（ref-store 侧）门禁仍 PASS」是否说明纵深缺口？** —— **不构成缺陷，但确实说明该运行时门禁只 pin 外层**：内层 `ref-store.dispatch` 的阻断另有**独立单测**（`l1-ref-validity.test.ts:156-168`，含「valid 放行 + 计数真的会动」对照），而单测走 `node --test`，退出码传播正常。故单层回归**在单测层会被抓到**；运行时门禁对单层不敏感属**已知且合理的分层**（RP-L1-C 因此从判定权威单点注入，两层同时失效）。建议（I-02）：在 `l1.mjs` ⑧ 增一条直接驱动 `dispatch` 的阻断断言，把内层也纳入运行时门禁。

### 4.3 ✦ 引用失效 fail-closed 是否真 fail-closed —— ✅ 成立

| 打假子项 | 结论 | 证据 |
|---|---|---|
| `unknown` 与 `invalid` 是否**一律阻断** | ✅ | `isRefUsable()` 唯一接受 `'valid'`（`=== 'valid'`）；`panels.dispatchRefAction:351` 与 `ref-store.dispatch:155` 两处均要求 `verdict === 'valid'`；`ariaDisabled = verdict !== 'valid'` |
| 是否有绕过路径（未走 `isRefUsable` 的调用链 / UI 允许点击） | ✅ 无 | 全仓 grep：`isRefUsable` 调用点仅 `panels.ts:351`（**唯一动作入口**）；`store.dispatch` 仅由该处调用；chip 侧 `aria-disabled=true` + `#l0-pick` 文案改写由门禁 ⑦/⑧ 断言 |
| 五维判定是否有「事实缺失却判 valid」的路径 | ✅ 无 | `evaluateRefValidity` 前置两道闸：`REQUIRED_REF_FACTS` 缺失 → `unknown`；`env.currentOrigin` 缺失 → `unknown`；`env.authorized === undefined` → `unknown`；`documentId/navSeq` 缺失 → `unknown`；无 `resolution` 或 `unreachable` → `unknown`；`refMark !== refId` → `unknown('replaced')`；`nodeCount !== 1` → `unknown('ambiguous')`。**新建引用默认即 `unknown`**（`create` 用空 env 判定）⇒ 只能由一次能确认全部事实的 `judge` 才可能变 `valid` |
| 两条恢复路径是否可能「静默丢弃旧记录」 | ✅ 主路径不会 | `repick()` 调 `retireUnusable()`（**保留记录**、仅移出风险行，注释明示「删除即静默丢弃」被禁止）+ `create` 新 id；`reset()` 会清空记录 —— 但 `reset()` 是**会话/夹具级复位**（v3-1 契约），不是失效恢复路径；本叶未在 UI 暴露 reset，属可接受（见 I-09 供编排器定夺） |
| 「不确定即失效」的门禁证据 | ✅ | ⑧ D1 反证的**反向对照**：同引用 `resolved` 放行（计数 +1）/ `missing` 阻断（计数不变）⇒ 判据非恒真 |

### 4.4 ✦ L1 八类是否真的 ≤1 次交互 —— ✅ 成立（含两点如实限缩）

- 8 个 `[data-l1-panel]` **全部**默认 `hidden`（`:176`），逐类「1 次点击 → 可见 + 非空内容」8/8 PASS。
- **是否偷加 L0 入口**：`ENTRY` 表只引用 3 个**既有** L0 披露（`l0-status-band` / `l0-ref-toggle` / `l0-more`）；默认档密度 C1 实测 **= 7**（与登记值逐格相等，`F 22 个登记格` 断言），L1 面板不在 `#view-host` 内、其触发器默认位于 `hidden` 子树 ⇒ **默认档未被撑破**。
- **`#l0-status-band` 一次点击同时展开 5 类**：门禁第 210 行**显式断言并明示理由**（「L0 可点预算 7/7 满额，故入口复用」）。判定：**不违反 FR-V3-031**（要求「每类 ≤1 次交互」，而非「每类一个独立入口」）；不违反「可点预算」（预算由默认档 C1=7 度量且未变）；不违反「一张卡」原则（决策卡未被遮挡，② 段几何断言成立）。**限缩**：5 类的「逐类」断言由组展开满足，未证明各入口互不依赖（FR 未要求）→ C2 ⚠️。
- **FR-V3-040 计数落点**：`data-count` 落在**各面板自己的带标签触发器**上（`TRIGGER` 表），门禁校验「文字非空 + `data-count` 为纯数字 + 与真值同源（手势 4≡表行数、选项 4、回执行 8）」⇒ 落点正确，无「只有图标」入口。

### 4.5 ✦ 回执三件套「重拉为真」 —— ✅ 成立（审计出口部分限缩）

- `refreshSeq` **不是**自增计数器自证：`pullReceipt()` 先 `refreshSeq += 1`，再 `await deps.refreshSnapshot()`（真实重拉工具面），证据文本由本次拉取结果生成（「重拉实测（第 N 次）：tool 仍在/已不在工具面」）；RP-L1-G 用 `+= 1 → += 0` 打破该断言 ⇒ 判据可 FAIL。
- 三件齐备（摘要 / 证据 / 审计出口）由 `receiptPiecesPresent()` 计算并可 FAIL。
- 审计出口：`#l1-receipt-audit`「查看审计」→ 点击 `#l2-entry-audit` → `#view-host.hidden === false`（⑩）。**证到「L2 宿主可达」，未证审计视图内容**（L2 内容归 v3-3，属声明内边界）→ C10 限缩（低）。

### 4.6 ✦ 台账非橡皮图章 —— ✅ 成立

- **实跑**：`npm run test:supersession` → `ℹ tests 11 / pass 11 / fail 0`，其中机器判据包括：`entries[].newTitle 必须能在目标文件定位`（防橡皮图章）、`既有门禁文件零删除——每一条删除行必须逐行命中台账或 modifiedRanges`、`protectedRanges 字节区间 hash 不变（禁行号锚定）`、`zeroDiffFiles 必须 0 行 diff`、`v3 新增门禁 check 计数 ≥ 台账下界`。
- 本叶条目：`V32-S1~S11`（含 5 条 pure-addition：`l1.mjs` / `l1-ref-validity.test.ts` / `size-growth-evidence.test.ts` / `size-attribution.mjs` / `l1-reverse.mjs`）+ `V32-MR*` modifiedRanges；`pureAdditionFiles` 显式声明这些文件「相对 base 0 删除行」并**断言该事实**（避免恒真空转）。
- **「取代量 = 0」是否成立**：✅ 成立且**我独立复核** `git diff --stat e45ca53..HEAD -- test/ui/{journey,insight,binding}.mjs` → **空**；台账 `counts.journey/binding.note` 亦指向 pureAdditionFiles。`insight.mjs` 未改（它相对 base `c2c0e0d` 有删行，那是 v3-1 的账，与 v3-2 无关）。
- 未登记却被修改的受保护区间：**0**（门禁逐行判据 + `protectedRanges` hash 断言共同把守；`journey.mjs` #15x / `binding.mjs` #22* 区段 hash 未变）。

### 4.7 ✦ 无虚绿门禁（新代码）—— ⚠️ 1 处恒真断言，其余 0 命中（原文见 §7）

### 4.8 ✦ 文档数字保真 —— ⚠️ 多数逐一对上，3 处不一致（见 §5 第 11 条）

### 4.9 ✦ 红线零改动 —— ✅（原文见 §8）

---

## 5. 打假面逐项（用户清单 4~12 的对照结论）

| # | 打假项 | 判定 | 关键证据 |
|---|--------|:--:|------|
| 4 | 体积裁决合规性 | ✅ | 见 §4.1（cap 零判定用法 / 四守卫 / 归因复现逐行一致） |
| 5 | 逐断言反证 A~H + 纵深 | ✅ | 见 §4.2（8/8 真 FAIL、真逐字节还原；「只关一层」非缺陷，内层有独立单测） |
| 6 | fail-closed 真伪 | ✅ | 见 §4.3（无绕过路径；无「缺事实判 valid」路径） |
| 7 | L1 八类 ≤1 次交互 | ✅⚠️ | 见 §4.4（复用 3 个既有 L0 入口、默认档 C1=7 未变；5 类由组展开满足） |
| 8 | 回执「重拉为真」 | ✅ | 见 §4.5（`refreshSeq` 绑定真实 `refreshSnapshot()`；审计出口证到 L2 宿主可达） |
| 9 | 台账非橡皮图章 | ✅ | 见 §4.6（实跑 11/11 + newTitle 可定位 + 逐行删除命中 + 取代量 0 复核） |
| 10 | 无虚绿门禁（新代码） | ⚠️ | `l1.mjs:473` 恒真；其余模式 0 命中（§7） |
| 11 | 文档数字保真 | ⚠️ | **一致**：754/754/0（`ℹ tests 754 pass 754 fail 0`）· supersession 11 · density 127 · l0 157 · l1 88 · journey 167 · insight 108 · binding 192（`✔ 192 / ✖ 0`）· hardening 24 · e2e PASS · `content.js` 177,076 · `sidepanel.js` 327,679 · ceiling 344,062 · 26,156/5,848/220/230/32,454 · +22.96% · 22 格 · 几何 495≥488 · `risk(staleRef).chars 254`（prev 244）· v3-1 l0 = 137（`v3-1-closeout/23-test_l0.log`）。**不一致 3 处**：① **`spec.md` NFR-V3-005 仍写 ceiling 306,099 / 基线 295,225 且「cap 只降不升」**，与裁决后的 344,062 / 327,679 / cap record-only **矛盾**（spec 最后修改停在 `cf2af32`，早于修复轮 `4483fe6`）→ **中**；② `docs/v3-density-baseline.json#volumeBaselineSeparation.note` 仍描述 v3-1 I6 的「295,225 / ceiling 306,099 未被抬高」，与**同一文件** `volume`（327,679/344,062/cap record-only）自相矛盾 → 低；③ `build.md §9.2` 表中 `src/build-info.ts 232 → 237` 用 HEAD 版工具**不可复现**（实测 207 → 212，Δ 同）→ 低 |
| 12 | 红线零改动复核 | ✅ | 见 §8 |

---

## 6. 维度汇总

| 审查维度 | 审查项数 | 通过 | 警告 | 失败 | 通过率 |
|---------|:--:|:--:|:--:|:--:|:--:|
| 代码质量（C19~C24） | 6 | 6 | 0 | 0 | 100% |
| 规范符合性（C1~C18） | 18 | 15 | 3 | 0 | 83% |
| 架构一致性（C25~C28） | 4 | 3 | 1 | 0 | 75% |
| 测试质量（C29~C33） | 5 | 3 | 1 | 1 | 60% |
| 证据/文档保真（C34~C38） | 5 | 3 | 2 | 0 | 60% |
| **合计** | **38** | **33** | **5** | **1（F-01，跨叶）** | **87%** |

---

## 7. 虚绿扫描原文（C29 / 打假项 10）

```text
$ grep -rn "check([^;]*, true[,)]" test/ui/*.mjs
test/ui/l1.mjs:473:    check('⑪ 局部树注入：≤3 节点且含父链（由 ⑫ 的注入断言覆盖）', true, '见下方 inject 段');
        ↑ 恒真断言（占位）。真正的注入判据在同段 :508/:509 存在且可 FAIL；本条使 88 计数含 1 条不变量断言，
          且括注「由 ⑫ 的注入断言覆盖」指向错误（⑫ 是密度段，注入面在 ⑪ 段内）。→ I-01

$ grep -rn "assert\.ok(true\|assert(true\|assert\.equal(true, true" test/*.ts test/*.mjs    → 0 命中
$ grep -rn "|| true" src/ui/sidepanel/l1/ src/ui/sidepanel/sidepanel.ts src/ui/sidepanel/view-model.ts test/ui/l1.mjs test/l1-ref-validity.test.ts
                                                                                            → 0 命中
$ grep -rn "catch {}\|catch { }" src/                                                       → 0 命中
$ grep -rn "\.skip\|\.todo\|\.only" test/l1-ref-validity.test.ts test/ui/l1.mjs test/ui/l1-reverse.mjs
                                                                                            → 0 命中
$ grep -n "t.skip" test/size-growth-evidence.test.ts test/size-budget.test.ts
   size-growth-evidence.test.ts:228  t.skip('dist/build-meta.json not present — run `npm run build` …')
   size-budget.test.ts:75/97         t.skip('dist/sidepanel.js|content.js not present — build first …')
        ↑ 仅在产物缺失时跳过；实跑 `ℹ skipped 0` ⇒ 三个用例本次均真跑并通过 → 非过宽 skip
$ grep -rn "process.exit" test/ui/l1.mjs test/ui/l1-reverse.mjs test/l1-ref-validity.test.ts
   l1.mjs:553 process.exit(1)（main().catch）· l1-reverse.mjs:171/190/284 · 无提前 exit(0)
$ grep -rn "exit(0)" test/ build.mjs     → test/ui/_v3-helpers.mjs:74（finish() 的 PASS 分支，正常）· 无其它
$ grep -rn "process.exitCode" test/ src/ → 0 命中（全仓无该护栏，与 F-01 相关）
```

**结论**：本叶**新增/修改的代码**中只有 1 处恒真断言（`l1.mjs:473`，I-01）；不存在空吞异常、`|| true`、只 log 不断言、过宽 skip、提前 `exit(0)`、被 try/catch 包住的断言等虚绿模式。

---

## 8. 零改动核验原文（C37 / 打假项 12）

```text
$ sha256sum packages/web-cli-plugin/src/content/{content-script,dom-agent,page-bridge}.ts
a72900313ab77c018961aa2b8e02bb1b630a9960c1b622f2a85addf543f99e82  content-script.ts
7df782b349b32839d0ec25fa515ee293441f85f75242083dae37e5ccfd601e0f  dom-agent.ts
5737c40a2014e7adf2bf4091a31a347af6600ecfea80f8882d52e9407191f4ac  page-bridge.ts
        （与 size-baseline.ts 的 CONTENT_SOURCE_SHA256 pin 逐字相同）

$ sha256sum packages/web-cli-plugin/src/security/{policy,auto-authorize}.ts
bfcb2edeceae19a27384aef6608e9f2ae9c3a0f6c1e5d3618f277164bb3c89a8  policy.ts
1096d065dac63d56e36285bf499eee041acdc3e323d4c7215df3981af7d0ef4b  auto-authorize.ts
        （判定链 sha256 未变，与 build.md §9.4/14 声明一致）

$ sha256sum packages/web-cli-plugin/manifest.json packages/web-cli-plugin/dist/content.js
57e6407eacbcf9f979f9a5b1ef4aec4773760b1870c6818be9f1c1da425dc8a9  manifest.json
52a826205553b46a896ccad54225d63ba62f5f7fe7c969a9bc2e655448d5b5f6  dist/content.js

$ stat -c '%s %n' packages/web-cli-plugin/dist/{content,sidepanel}.js
177076 dist/content.js        327679 dist/sidepanel.js
$ sha256sum packages/web-cli-plugin/dist/sidepanel.js
1bdcdd591f7f29e804159f14d60914568dc9c0ab77ed756b377807faf7badf0a
        （= build.md §9.4/13 声明的同一次构建 sha256）

$ git diff c2c0e0d..HEAD -- packages/web-cli-plugin/manifest.json      → 空（零 diff）
$ grep -c contextMenus packages/web-cli-plugin/manifest.json …        → 0 命中
$ grep -n "clickables: 7\|lines: 15\|clickables: 9\|lines: 20\|clickables: 17\|lines: 35" \
        packages/web-cli-plugin/test/ui/density-metrics.mjs
248:  default: Object.freeze({ clickables: 7, lines: 15 }),
249:  firstRun: Object.freeze({ clickables: 9, lines: 20 }),
250:  risk: Object.freeze({ clickables: 17, lines: 35 }),
$ git diff c2c0e0d..HEAD -- packages/web-cli-plugin/package.json | grep -E '^[+-]\s*"' | grep -v scripts
        → 仅 scripts（dependencies 段零 diff ⇒ 无新增依赖）
$ grep -n 'id="composer" hidden' src/ui/sidepanel/index.html          → 1279: <form id="composer" hidden>
$ git diff e45ca53..HEAD -- src/ui/sidepanel/index.html | grep -iE '^\+.*<input|<textarea|contenteditable'
        → 0 命中（本叶 0 新增输入控件；`#ask` / `#ask-fallback` 默认 hidden）
$ git rev-parse main origin/main                                       → 2ddc9229… / 2ddc9229…（同一）
```

---

## 9. 审查纪律核验（C38）

```text
$ git status --porcelain          （审查进行中与结束时均为空）
（本轮仅新增 .sddu/…/specs-tree-v3-2-l1-disclosure-refs/review.md 与 review-report.md）
$ git rev-parse main → 2ddc92299ad10cfe0ea2b65403243a45ce7fb041（未动）
$ 本轮未执行 git add / commit / push
$ 全部实验均在 /tmp 沙盒：/tmp/opencode/review-probe/**（副本 sha256 与原文件相同：7bb9cc07…）
$ 未修改任何源码 / 测试 / 文档 / 配置；未跑 git add -A
```

---

## 10. 改进建议（非阻塞项，分级）

| # | 级别 | 位置 | 问题 | 对应 Cx | 建议 |
|---|:--:|------|------|:--:|------|
| F-01 | **高（跨叶，预先存在）** | `test/ui/binding.mjs:2305` / `:2313`（+ `send()` 无超时/无 close 监听） | 断言失败时 `binding.mjs` **退出码仍为 0**（门禁不可 FAIL）。**预先存在于 v2 R2 `02ee715`，v3-1/v3-2 均未改该文件** | C33 | ①`process.exitCode = 1` 提到 `await dumpDiagnostics` **之前**；②诊断加 `Promise.race(..., sleep(15_000))`；③`send()` 增加 close/timeout 拒答；④以「副本强制变红 → 要求非 0 退出」为验收。**修复前不得以「binding exit=0」作为任何叶的通过证据** | 
| I-01 | 中 | `test/ui/l1.mjs:473` | 恒真占位断言 `check(…, true, …)`，括注「由 ⑫ 的注入断言覆盖」指向错误段 | C29 / C31 | 删除该行（或改为对 `l1('report').localTree` 的真实判据）；删除后 `test:l1` 计数由 88 → 87，须同步 `v3GateFloors.l1.mjs` 55 → 54 并登记台账 |
| I-02 | 中 | `test/ui/l1.mjs` ⑧ 段 | 运行时门禁只 pin 外层（panels）阻断，内层（ref-store.dispatch）只有单测 pin | C24 | 增一条直接驱动 `dispatch` 的运行时阻断断言（或为内层补独立反证） |
| I-03 | 中 | `spec.md` NFR-V3-005（:108） | 数字与「cap 只降不升」**未随裁决 V3-VOL-1 更新**（现写 ≤306,099 / 基线 295,225），与 build/state 的 344,062 / 327,679 矛盾 | C36 | 显式订正为 `floor(327,679×1.05)=344,062` + 基线 327,679，并把「cap 只降不升」改写为「公式 ceiling + 四条替代守卫（cap 已降级为纯记录）」，历史值逐字保留 |
| I-04 | 低 | `build.md §9.2` 表 `src/build-info.ts` 行 | 登记 `232 → 237`，HEAD 版工具实测 `207 → 212`（Δ 同 5） | C36 | 用 HEAD 版工具重出该行（或注明该行来自中间版工具、绝对值为构建戳长度相关；Δ 不变） |
| I-05 | 低 | `build.md §2.2` 修改文件表 | 「修改文件 13」未含修复轮追加的 4 个修改文件（`build.mjs` / `density-thresholds.test.ts` / `density.mjs` / `l0.mjs`） | C26 | 回填该表为 17（或注明建设轮口径 13 + 修复轮 4） |
| I-06 | 低 | `docs/v3-density-baseline.json#volumeBaselineSeparation.note` | 仍写 v3-1 I6 的「295,225 / ceiling 306,099 未被抬高」，与同文件 `volume` 段矛盾（`feature` 字段亦仍为 v3-1 叶名） | C36 | 随 `volume` 段更新；必要时把 `feature` 改为父 Feature 名（该文件现由多叶共用） |
| I-07 | 低 | `test/ui/l1.mjs:193 / :198` | 采集 `trigger.aria-expanded` 但未参与判据（采集即弃） | C17 / C31 | 在 ① 的判据中加入 `aria-expanded === 'true'`（1 次点击后），使无障碍断言显式化 |
| I-08 | 低 | `test/ui/l1.mjs`（EC 覆盖） | EC-V3-015（破坏性确认期间折叠披露层，风险行与确认选项仍在 L0 可见）无直接断言 | C18 | 增一条：确认态下 `collapseAll()` 后 `#risk-rail` 与确认选项仍在 L0 可见 |
| I-09 | 低（供编排器） | `ref-store.reset()` / `sidepanel.reset()` | `reset()` 清空引用记录与 `commandSends`（会话/夹具级）；非失效恢复路径，但 UI 无「会话切换丢弃 N 条引用」的显式提示 | C8 | 若编排器认为 EC-V3-007 的「不得静默丢弃」也覆盖会话切换，则在切换处补一条可读提示 |
| I-10 | 低 | `_v3-helpers.mjs:99-105` | `send()` 同样无超时/无 close 处理（当前不虚绿，仅**挂死→timeout**） | C33 附带 | 与 F-01③ 同法加固（低优先） |

---

## 11. 阻塞问题

| # | 位置 | 问题 | 对应 Cx | 修复建议 |
|---|------|------|:--:|---------|
| — | — | **本叶交付：无阻塞问题（0 个）** —— 代码、新门禁、体积裁决执行、台账、反证、红线均成立 | — | — |
| F-01 | `test/ui/binding.mjs` | **跨叶阻塞级风险（不计入本叶阻塞）**：该门禁当前不可 FAIL，任何真红都会被记为绿 | C33 | 见 §2.3 四行修复方案；**须在 v3-3 / v3-4 或任何依赖其退出码的叶之前修复**（本叶未改该文件、其 192 PASS 已由日志内容独立佐证，故不阻塞本叶收口） |

---

## 12. 结论

**结论**: **⚠️ 有条件通过（0 阻塞）**

| 指标 | 结果 |
|------|------|
| 审查通过率 | 33 / 38 = 87%（+ 5 警告；本叶代码 0 失败） |
| 阻塞问题数 | **0**（本叶）· 1 项高严重度跨叶缺陷 F-01 |
| 规范符合性偏差 | 3 项（均为「覆盖强度/文档保真」级，非实现偏差） |
| 可进入 validate | **是** |

**理由**：
1. **§1 虚绿疑点已定案为真缺陷**（受控证伪实验原文见 §2.2：真实 `binding.mjs` 副本强制 1 条必红 → `binding FAILED (4)`、**EXIT=0**、无「诊断已落盘」行）。根因定位为「`await dumpDiagnostics` 挂在已 CLOSED 的 CDP socket 上 → `process.exit(1)` 不可达 → 事件循环耗尽 → 自然退出码 0」；该缺陷**预先存在（v2 R2 `02ee715`）、非本叶引入、非本叶文件**，且**不推翻** v3-1/v3-2 的 binding 192 结论（PASS 由日志内容 `✔192 / ✖0` 独立佐证）。故它列为**跨叶高严重度项 + 可执行修复建议**，不构成本叶阻塞。
2. 本叶的实质交付（fail-closed 判定、双层阻断、两条恢复、回执三件套与真实重拉、8 类就地展开且未撑破默认档、体积裁决四条守卫、取代台账逐行判据、A~H 逐断言反证真 FAIL 且真逐字节还原、红线零改动）经**独立核对全部成立**，其中体积归因表与 supersession 门禁由我**实跑复现**。
3. 剩余 10 项改进（1 中×3 + 低×7）均为**覆盖强度/文档保真**类，无一项表现为实现偏差或红线被破；建议在本叶内清除 I-01（恒真占位断言），其余随行。

---

## 13. 未能验证项（如实列出，不用推断填坑）

1. **未重跑任何 Chromium 类门禁**（`test:l1` / `test:density` / `test:l0` / `test:ui` / `test:insight` / `test:hardening` / `test:e2e`）：内存约束（本机 ~1.5 GB 曾 OOM，审查时 `available ≈ 2.6 GB`），且需与其它进程串行；这些门禁的结论**全部引用** `build.md` 与 `/tmp/opencode/v3-gate-logs/{v3-2,v3-2-fix}/*.log`（我逐份核对了计数行、`✖` 计数与 PASS 行）。
   - **本轮唯一实跑的 Chromium 运行**：§2.2 实验 C（**1 次**、269 s、`/tmp` 副本，未用仓库 `dist/`）。
2. **未独立复算台账 `staticCalibers.nodeTestStatic` 的三种正则读数**（733/741/732 与修复轮的 754/765/858）：仅核到运行期口径 `ℹ tests 754 / pass 754 / fail 0` 与 `skipped 0`。
3. **未复核 `build.md §9.2` 的「两棵树 `dist/content.js` 同为 177,440 B」**：HEAD 版 `size-attribution.mjs` 只构建 `sidepanel`（entryPoints 单一），该句来自修复轮中间版工具，无法用现行命令复现（`Δ=32,454` 本身已复现）。
4. **未逐条通读 `plan.md` 与父 `plan.md` 的全部 ADR 全文**：按 spec 条文 + 代码行为 + build 引用做了抽样对照（判定侧栏侧 / 引用单源 / 折叠器复用 / 无新权限 / 体积与台账口径）。
5. **未做 L1 展开态的明暗主题与 320–560px 溢出的独立运行时验证**（见 C17）：依赖 v3-1/insight 既有守卫（其覆盖折叠态）。
6. **未验证 `docs/v3-density-baseline.json#fixtureAsymmetry` 等叙述性字段**的逐字一致性（非判定字段）。
7. **未验证 v3-3 / v3-4 的协同面**（L2 视图内容、页面侧真实捕获）：明确不属本叶范围，本叶只提供入口（已由 ⑩/⑪ 断言存在）。
8. **未复跑人工面 3 项**（展开动画体感 / 引用高亮体感 / 读屏体感）：无自动化替代，build.md 与 state.json 均如实登记「⏳ 未执行」，我按「未执行」接受。

## 14. 交付联动提示（状态机）

- 本报告与 `review.md` 为本轮**新增产物**；本轮**未修改** `state.json`（遵循 v3-1 先例：审查轮不改状态文件）。
- 检查发现 `state.json.files` 目前**没有** `review` / `reviewReport` 键（v3-1 已含），也**没有** `build` 键。请由状态机/编排器在收口时补登记：
  `files.build = …/build.md`、`files.review = …/review.md`、`files.reviewReport = …/review-report.md`，并将 `phase` 置 `reviewed`（本会话内 `/tool sddu_update_state` 不可见，故未代执行）。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1）：§2 binding 虚绿定案（真缺陷）+ 三段实验原文 + 修复方案 + 影响面；C1~C38 逐项结论；打假面 4~12 对照；虚绿扫描原文；零改动 sha256 原文；纪律核验；F-01 + I-01~I-10；未能验证项 8 条 | 2026-09-16 | SDDU Review Agent |
