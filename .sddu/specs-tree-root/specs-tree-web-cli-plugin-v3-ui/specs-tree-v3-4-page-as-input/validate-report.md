# 验证报告（R1）：specs-tree-v3-4-page-as-input

> **文档定位**: SDDU 验证报告 — 逐项记录本轮的**实测**结果（不复用被验证方脚本作唯一证据）
> **验证策略**: `validate.md`（V1~V16 + 五维度 + 独立性原则）
> **前置依赖**: 本叶 `spec.md` v1.1 · `plan.md`（ADR-V3-030~036）· `review.md` / `review-report.md`（R1 ❌ 2 阻塞）· `build.md` v1.2（§11 R1 修复轮 / §12 R2 轮）· 父 `../spec.md` §5.5/§8.4 · v3-1/v3-2/v3-3 先例
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-17
> **验证轮次**: R1（对照 HEAD `1e2e1a1`；叶起点 `e528563`）
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-17
> **更新说明**: 初始创建：V1~V16 逐项实测；自写探针 41 + 19 断言全绿；门禁 19 项串行复跑（1 项 flaky 被独立复现）；登记册保真 3 项发现

---

## 1. 验证概要

| 维度 | 数值 |
|------|:--:|
| 被验证产物 | `dist/{content,pick-layer,sidepanel}.js` · `src/content/pick-*.ts` · `src/background/service-worker.ts`（`pick-layer-*` 路由）· `src/ui/sidepanel/{sidepanel.ts,pick-input.ts}` · 门禁 / 台账 / 登记册 |
| 验证场景 | **V1~V16**（V15 人工面 `⏳ 未执行`） |
| FR 覆盖 | FR-V3-060~072 **13/13** + **AC-CONV-1/2**（硬性） |
| 自写探针断言 | **41 + 19 = 60 条全部 PASS**（`probe-v34b.mjs` 41/0 · `probe-density.mjs` 19/0） |
| 门禁复跑 | **19 项**：18 项 EXIT=0；`test:page-input` **5 次运行 3 绿 2 红**（76/2 ↔ 78/0）—— **flaky 被独立复现并定因** |
| 独立复现的反证 | `pick-layer.js +1B @33,901` FAIL→还原 PASS · `content.js +1B @177,077` FAIL→还原 PASS · 零注入强制注入翻红 · I-02 复活探针 · 逐文件字节归因 |
| 独立发现的新问题 | **7** 项（1 中·登记册保真 / 1 中·门禁稳定性 / 1 中·修复可达性 / 4 低） |
| 结论 | **⚠️ 有条件通过**（0 阻塞；7 项非阻塞发现，其中 F1/F3/F4 建议收口前处置） |

**一句话结论**：BLOCK-1 的 `tabOrigin` 修复我**独立复现为真**（授权 `/app` 页 `ok:true` + 目标 tab 持层 + 隔离世界 marker + Shadow host + 右键接管；未授权 `/app` 仍零注入）；零注入五探针 + 未覆盖两态 + I-02 复活路径 + 三条退让 / I-03 焦点 + 密度 9 格**全部独立通过**；体积四线 / `+1B` 反证 / 零改动红线**逐字成立**。但 `test:page-input` 的 I-01②/I-01③ 断言**不稳定（2/5 红）**，且该自检在**生产路径上没有 `env(authorized:false)` 发送点**（撤销走 teardown，不推 env）⇒ 它没有真正闭合「teardown 丢失后已撤销的层继续拦右键」这个原始 hole；另有登记册保真 2 项（逐文件归因用预估冒充实测；`+10.25% / +22.95%` 残留）。

---

## 2. 逐项验证结果（V1~V16）

| # | 验证对象 | 判定 | 我的原始证据（摘要） |
|---|---------|:--:|------|
| **V1** | 门禁 19 项串行复跑与计数 | ✅ **PASS**（1 项 flaky，见 F3） | `typecheck 0 err EXIT=0` · `build 177076/33900/362777 EXIT=0` · `npm test ℹ tests 795 / pass 795 / fail 0 / skipped 0 EXIT=0` · `supersession 14/14` · `density 127/0` · `l0 164/0` · `l1 103/0` · `l2 71/0` · `l1-reverse 9 条全过` · `l2-reverse 10 条全过` · `zero-injection 27/0` · `journey 167` · `insight 116` · `binding 192` · `hardening 24` · `e2e PASS` · `gate-integrity 12/12`；**`page-input` 78/0 ×3、76/2 ×2**（红= I-01②/I-01③，见 F3） |
| **V2** | **BLOCK-1 独立复现**（`/app` 授权页） | ✅ **PASS** | 自写探针 `probe-final.log`：`A1 ok:true` · `A2 回包 tabId 的 tab 真持层（A7 诊断：两个同 origin tab hosts=1）` · `A3 origin == 真 origin` · `A4 隔离世界 marker === 'object'` · `A5 shadowHosts === 1` · `A6 contextmenu defaultPrevented === true`；未授权 `/app`：`A8 Chrome 拒绝（Cannot access…permission）` · `A9 SW 可读拒绝` · `A10/A11/A12 零注入` |
| **V3** | 零注入五探针 + 反证 + 未覆盖两态 | ✅ **PASS** | `A13 注册扫描负控（能看见控制注册）` · `A14 未授权 origin 无 pick-layer 注册` · `A15 强制 document_start 注入 ⇒ marker=object / hosts≥1 / intercepted=true（五探针翻红，可证伪）`；`A16 面板明示零注入 + 入口禁用`；`B1 两 tab 均有活层（负控）` → `B2a/B2b 撤销后两 tab 全零残留`；`B3b 面板披露自洽` · `B3c 未授权页仍零注入` · `B3d 已授权 tab 不被误拆` |
| **V4** | I-02 复活路径（自写探针） | ✅ **PASS** | `C1 负控：document_start 执行时 documentElement === null` · `C2 document_start 已挂载且 unmount 无异常` · `C3 readyState=complete ∧ shadowHosts === 0`（载体 = 未授权 `localhost`，规避「面板在场 ⇒ 自动注入」污染） |
| **V5** | 三条退让 + I-03 焦点 + 宿主共存 | ✅ **PASS** | `D0 前置：菜单已关且 nativeOnce=false` · `D2 菜单打开` · `D3 焦点确被自绘 UI 接管（负控）` · `D4 Esc 关闭` · **`D5 Esc 后 activeElement.id === 'host-input'`** · `D6 宿主自带 contextmenu 监听器计数 +1` · `D7 点空白关闭` · `D8 「交给页面原生菜单」可点且 nativeOnce=true` · `D9 下一次右键不拦截且宿主监听器收到` · `D10 之后恢复拦截` |
| **V6** | I-01② 自检可达性 + 竞态 | ⚠️ **有条件**（功能成立 / 生产不可达） | `E1 控制组：env(false) 后下一次右键即卸载 ✔` · `E3 竞态组：产物自身 `refresh()` → `ensureInjected` → `pick-layer-inject` **重推 `authorized:true`**，自检随即失效（marker=object / intercepted=true）✖（复现门禁 flake 机制）`；静态：生产仅 2 处 `pick-layer-env` 发送点，`pick-layer-inject` 未授权时**提前 return 不推 env**、`pick-layer-env` 的唯一调用者 `startPick()` 仅在 `inject()` 成功后执行 ⇒ **撤销路径不存在 `env(false)` 发送点** ⇒ 见 **F4** |
| **V7** | R2-1 全门禁「只断言 ok」清扫 | ✅ **PASS**（0 处可蒙混） | 自写扫描器覆盖 **13 个 Chromium 门禁**：`CLASS_A（裸真值）` = **7 处**（全部是 `Boolean(SW/panel/target)` **实体定位前置**，不构成行为判据）→ 不可蒙混；`ok`-only 条件站点 = **29 处**，逐条判定：密度类 = 纯函数判决（输入为**目标页**实测 DOM，且同格有数值钉死）/ DOM 探针绑定具体 tab / `page-input` BLOCK-1 已钉 `origin+tabId+marker+host+拦截` / `zero-injection` 的 `ok===false` 为 fail-closed 方向（错目标反而会 `ok:true` ⇒ FAIL）。**结论：全部门禁的 `ok` 断言均已配目标/效果级判据**；`tabs.sendMessage(tabId, …)` 调用点全部显式带 tabId（`binding:1575/2158`、`journey:1527`、`page-input:578/617`） |
| **V8** | 体积四线 + 33,900 重登记 + `+1B` 反证 | ✅ **PASS** | `stat`：`177076 / 33900 / 362777`；`content.js sha256 = 52a82620…`（与叶前一致，重建亦逐字节复现）；`PICK_LAYER_BASELINE_BYTES = PICK_LAYER_FINAL_ARTIFACT_BYTES = PICK_LAYER_CEILING = 33_900`、`HISTORY = [32_391]`、`RE_REGISTRATIONS` 链条 `[v3-4: 0→32,391] → [v3-4-fix2: 32,391→33,900]` 首尾相接（机器断言通过）；**`printf ' ' >> dist/pick-layer.js` ⇒ `33901` ⇒ `AssertionError: 登记 33900B ≠ 实测 33901B`，`ℹ tests 2 / pass 1 / fail 1 EXIT=1`；`cp` 还原 ⇒ `sha256sum -c` OK ⇒ `2/2 pass EXIT=0`**；`content.js +1B @177,077` ⇒ `content.js 177077B ≠ 177076B` FAIL ⇒ 还原 OK |
| **V9** | 逐文件字节归因独立复现 | ⚠️ **有条件**（实测分布 ≠ 登记分布） | 自写 esbuild 沙箱（逐文件回退到 **R2 前** `1e1b798`）：`pick-overlay +661 / pick-menu +389 / pick-layer +376 / pick-bridge +83 = +1,509`（Σ 与 `交付态 − 全部回退态` 逐字节相等）；**与 `build.md §12.1` 一致**，但**登记册 / 台账写的是 `+615/+504/+307/+83`（= R1 预估值）且声称「受控实验实测」** ⇒ 见 **F1** |
| **V10** | 台账 / 保护域 / 取代登记 | ⚠️ **有条件**（结构性成立 / 散文残留） | `V34-*` 34 条 + `V34R2-S1/S2/S3` 全部 `newTitle` 可定位（literal+regex 独立复算，**0 不可定位**）；「他叶 `registeredUncoveredLines` 追加 12 行」：**12/12 在叶起点 `bf5773d` 逐字存在**、既有 8 组**逐字未改**（JSON 等值比较 `identical=True`）+ 仅追加 1 组（`n=12`）；两个 `protectedRanges` 字节区间 sha256 **独立复算相等**（journey 185 行 / binding 184 行，anchors 均在）；`entries` 61→95：新增 34 条、无删除，**13 条既有条目被改写**（`V31-S6/S7/S10`、`V32-S1/S17`、`V33-S10~S13`、`V33F-S1~S4`）—— 逐条核对为「定位串随轮次重 pin」（如 `SIDEPANEL_BASELINE_BYTES = 362_777;`）+ reason 追加披露 ⇒ 合规；`V34-S3/S3b/S3c/S3d` 四条承接 `insight-protocol.test.ts` 已就位 |
| **V11** | 零改动红线 | ✅ **PASS** | 三冻结源 hash == `CONTENT_SOURCE_SHA256` 三项逐字；`manifest.json` 零 diff、`contextMenus` 0 次、无 `externally_connectable`；`ref-validity.ts` 零 diff；`package.json` 零 diff（无新增依赖）；阈值逐字 `default 7/15 · firstRun 9/20 · risk 17/35`；`#composer` 默认 `hidden`；`main = 2ddc922`（未动）、`HEAD = 1e2e1a1`；`git status --porcelain` 仅新增本报告与 `validate.md`（**唯一写入 = SDDU 产物**） |
| **V12** | 密度独立复测（自写口径 9 格） | ✅ **PASS** | 自写实现（不 import 被测口径）：`default@320/400/520 = 7/7/19/6/220` · `firstRun = 7/12/25/6/384` · `risk(hardline) = 7/8/--/--/246` —— **9/9 与 `docs/v3-density-baseline.json` 登记格逐项相等**；幂等（两次测量逐项相等）✔；`default` 稳态 `#notice` 前置负控 ✔ |
| **V13** | AC-CONV-1/2 生产接线 | ✅ **PASS** | 独立 `grep`：`dispatchRefAction(` **调用点恰 1 处**（`sidepanel.ts:1009`，定义 `panels.ts:381`、接口 `:125`）；`setEnv(` 生产调用点 = `sidepanel.ts:1030#syncRefEnv`（由 `:839 render()` 调用），其余 3 处均在 `installV3TestHooks()` seam 内；env 字段来源真实（`documentId/navSeq` 取自页面实报 `pick-layer-state`，`declarationHash` 取自 SW `declarationEnv()` 的 sha256 投影）；无 live layer 时**不报** document identity（fail-closed） |
| **V14** | 文档 / 登记册数字漂移 | ⚠️ **有条件** | 与实测一致：`795/14/127/164/103/71/167/116/192/24/12/27/78` + `9/10` · `33,900 / 362,777 / 380,915 (=floor(362,777×1.05))` · `+36.13%` · `+3.67%` · `+22.96%`(worst pair 22.956%) · `8,606` · `+1,509`；**不一致**：`size-baseline.ts:670` `+10.25%`（实测 **+10.44%**）、`:673` `+22.95%`（实测 **+22.96%**）、ledger 5 条 reason `+10.25%`；`build.md §12.4` / commit「in-gate 清单 4 → 9」实际 **8 → 13** ⇒ F2 / F7 |
| **V15** | 人工面 6 项（NFR-V3-015） | ⏳ **未执行** | 拾取观感 / 拖动体感 / 右键菜单观感 / 宿主真实兼容 / 多显示器 / 高 DPI —— 如实登记，**不冒充 PASS** |
| **V16** | 反证完整性与元门禁 | ✅ **PASS** | `l1-reverse`：`✔ 反证全套 PASS：9 条「注入 → FAIL → 逐字节还原（sha256 复原）→ PASS」`；`l2-reverse`：`✔ 10 条全部 …`；`gate-integrity 12/12`（`inGate` 清单实体 **13 条**）；`supersession 14/14`；`density --reverse` 内建 RP 全过（EXIT=0） |

---

## 3. 验证详细信息

### 3.1 🔴 BLOCK-1 独立复现（V2 — 我自己做的，不复用其日志）

自写探针 `probe-v34b.mjs`（自写 CDP 客户端 + 自写夹具服务器 + 自写判据；临时 `dist` 副本仅追加 `http://127.0.0.1/*` host permission，**JS 字节零改动**）：

```text
▶ A. BLOCK-1（授权 origin 的**带路径**页面 /app）
  ✔ A1 /app 上 pick-layer-inject 必须 ok:true
     · A2 诊断：inject→tabId=226964245；bound 会话={"active":{"tabId":226964245,"origin":"http://127.0.0.1:34101",…}}
  ✔ A3 注入目标 origin == 真 origin（不含路径）
  ✔ A4 /app 隔离世界 marker === object
  ✔ A5 /app Shadow host === 1
  ✔ A6 /app 右键被接管（行为级）
  ✔ A7 注入落点：返回 tabId 的 tab 确实持层
     · A7 诊断：[{"id":226964244,"url":"…/","hosts":1},{"id":226964245,"url":"…/app","hosts":1}]
▶ A'. 未授权 origin 的带路径页面（localhost，无 host permission）
  ✔ A8 Chrome 结构性拒绝注入（可读原因）
  ✔ A9 SW 对未授权带路径页返回可读拒绝
  ✔ A10/A11/A12 主世界 marker undefined / shadowHosts 0 / 右键不接管
  ✔ A13 注册扫描负控：同一扫描能看见注册     ✔ A14 未授权 origin 无 pick-layer 注册
  ✔ A16 面板对未授权页明示零注入 + 入口禁用（无 bound 会话态）
  ✔ A15 强制注入反证：五探针翻红（可证伪）
```

**判定**：BLOCK-1 的两段主张（「授权 origin 的带路径页必须可用」+「未授权带路径页仍零注入」）**均独立复现为真**；且「`ok:true` 但层落在别的 tab」这一蒙混形态被 **A2 诊断 + A7 持层集合**排除（回包 tabId 的 tab 持层；`A2` 的 tabId 在一次运行中为 bound 会话 tab —— 见 F5 观察）。

### 3.2 🛡️ R2-1 专项：全门禁「只断言 ok」清扫（V7 — 本轮最高价值项）

**扫描方法（自写，两步）**：

1. `scan-ok-assertions.mjs`：括号平衡解析每个 `check(label, cond, …)`，按正则把 `cond` 分为 **CLASS_A（裸真值 / `Boolean(x)`）** 与 CLASS_B（含比较 / 正则 / `.length` / 集合相等）。
2. `scan-ok-only.mjs`：抽出「条件里只出现 `ok` 且不含任何目标/效果钉死 token（`origin`/`tabId`/`selector`/`marker`/`shadowHosts`/`intercepted`/计数…）」的站点，并**原文打印前后 14 行**供逐条判定。

**覆盖**：`journey · insight · binding · hardening · density · l0 · l1 · l2 · l1-reverse · l2-reverse · page-input · zero-injection · e2e`（13 个 Chromium 门禁；`l1-reverse/l2-reverse` 为 runner 形态、无 `check(` 调用点，其判据在 `reverse-proof-judge.mjs` 的 `expectFailPattern` 命中判定上）。

**结果**：

| 类别 | 命中 | 判定 |
|------|:--:|------|
| CLASS_A（裸真值断言） | 7 | `Boolean(sw)` / `Boolean(panelTarget)` / `Boolean(reviveTarget)` / `Boolean(unPage)` / `Boolean(unPathPage)` / `label` —— **全是实体定位前置**（若实体缺失，后续行为断言必然连带失败）⇒ **不可蒙混** |
| 仅 `ok` 字段条件 | 29 | 逐条原文判定：① `density`（14 处）= 纯函数 `verdict.ok`，输入是**目标页**实测 DOM 且同格有 `C1/C2/C3/C4` 数值钉死；② `l0`（2 处）= 同页 `riskProbe.ok` 且 `detail` 打印三通道；③ `l1/l2`（2 处）= 目标页 `measured` + `limits` 数值打印；④ `page-input`（3 处）= BLOCK-1 已钉 `origin + tabId + marker + shadowHosts + intercepted + error 文案`；⑤ `zero-injection`（4 处）= `executeScript` 显式 `tabId` + 拒绝原因正则，方向 fail-closed；⑥ `e2e/binding/journey`（4 处）= 授权/绑定回执**同判据内**带 `data.origin` / `data.tabId` / `pattern` 钉死 ⇒ **全部已钉死** |

**结论**：**未发现「只断言 `ok` 且可被『行为落在错误目标上』蒙混」的站点**（0 处）；对应地，`page-input` 的 BLOCK-1 回归断言（R1 补）与 `zero-injection` 的带路径变体（R1 补）是**唯一两处曾经存在该形态的位置**，现已被 `origin/tabId/marker/host/拦截` 五重钉死。**风险并未消失，而是转移**：本轮新发现的 F3/F4 属「断言可被**并发行为**（产物自身的重注入）削弱」而非「目标未钉死」。

### 3.3 零注入未覆盖两态（V3）

```text
▶ B. 未覆盖态
  ✔ B1 前置（负控）：两个同 origin tab 都有活层且都拦截右键
  ✔ B2a 撤销后 /app tab 零残留（marker/host/拦截全零）
  ✔ B2b 撤销后 根路径 tab（**另一个 tab**）同样零残留     ← I-01① 广播 teardown 独立复现为真
  ✔ B3b 面板披露自洽（活动未授权页 vs 已授权 bound 会话，二者取其一，不得自相矛盾）
  ✔ B3c 未授权页仍零注入   ✔ B3d 已授权的那另一个 tab 不被误拆
```

`B3b` 在两轮运行中分别观测到两种投影（`未授权活动页` / `已授权 bound 会话`）—— 均自洽，故断言写成「二者取其一」而不是钉死单一投影（避免把我的夹具时序差异误判为产品缺陷）。

### 3.4 I-02 复活路径 + 三条退让 / I-03 焦点（V4 / V5）

```text
▶ C. I-02（载体 = 未授权 hostname localhost）
  ✔ C1 前置负控：脚本确在 document_start 执行      ✔ C2 document_start 已挂载且卸载无异常
  ✔ C3 加载完成后 Shadow host 必须为 0（不复活）
▶ D. 退让 + 焦点
  ✔ D5 I-03：Esc 后焦点回到原元素 host-input      ✔ D6 宿主自带 contextmenu 监听器仍收到事件
  ✔ D8/D9/D10 nativeOnce 一次性交还 → 之后恢复拦截
```

> **方法学如实登记**：D5 的判据要求**右键落点 = 原焦点元素**（输入框）。若右键落在别处，浏览器在 `mousedown` 阶段就已把输入框失焦（宿主自身行为），此时把焦点还原给「当时的 `activeElement`（BODY）」是既定行为 —— 我第一版探针因落点选在 `#box` 而误判，修正落点后 PASS（**该误判已自我纠正，不计为发现**）。

### 3.5 密度独立复测（V12 — 自写口径，9/9 格零漂移）

```text
     · default@320:      mine={"clickables":7,"chars":220,"lines":7,"blocks":19,"regions":6} registered 同
     · default@400/520:  同上（三视口逐项相等）
     · firstRun@320/400/520: mine={"clickables":7,"chars":384,"lines":12,"blocks":25,"regions":6} registered 同
     · risk(hardline)@320/400/520: mine={"clickables":7,"chars":246,"lines":8} registered 同
▶ v3-4 density probe: 19 passed / 0 failed
```

> 差异定位过程（我的口径 vs 登记值）曾出现 **−31 chars（default）/ −2 chars（firstRun、risk）**：前者 = 我的夹具漏了稳态 `#notice`（29 chars + 1 block + 1 line），补上「面板 reload → 二遍夹具」后消失；后者 = 我的夹具 origin 写 `http://`（登记夹具为 `https://`，-1）与 key 串差异，对齐后消失。**⇒ 9 格逐项相等，零漂移**。

### 3.6 体积四线 / `+1B` 反证 / 归因（V8 / V9）

```text
$ stat -c '%s %n' dist/{content,pick-layer,sidepanel}.js
177076 dist/content.js  33900 dist/pick-layer.js  362777 dist/sidepanel.js
$ printf ' ' >> dist/pick-layer.js && node --test dist-test/test/pick-layer-budget.test.js
ℹ tests 2 / ℹ pass 1 / ℹ fail 1     EXIT=1
  AssertionError [ERR_ASSERTION]: 登记 33900B ≠ 实测 33901B（按真实产物登记）
$ cp 备份还原 && sha256sum -c → OK → 2/2 pass EXIT=0
（content.js 同法：177077 ⇒ `content.js 177077B ≠ 177076B —— 本叶必须是逐字节零改动` EXIT=1 → 还原 OK）

# 逐文件归因（自写 esbuild 沙箱；回退基准 = R2 前 1e1b798）
src/content/pick-overlay.ts   reverted=33225  contribution=+661
src/content/pick-menu.ts      reverted=33497  contribution=+389
src/content/pick-layer.ts     reverted=33510  contribution=+376
src/content/pick-bridge.ts    reverted=33803  contribution=+83
sum = 1509 == delivered − all-reverted(32377) = 1509
```

**登记册上写的是 `+615/+504/+307/+83`**（`size-baseline.ts` JSDoc + `PICK_LAYER_RE_REGISTRATIONS['v3-4-fix2'].reason` + ledger `featureHistory.v3-4-fix2.perFileAttribution`）并与 `build.md §12.1`（`+661/+389/+376/+83`，明写「不沿用预估分布」）**冲突** ⇒ **F1**。

> **产物重建披露（如实）**：门禁复跑按清单先跑 `npm run build`（并随后被 `l1-reverse` / `l2-reverse` 的受控重建覆盖），因此 `dist/`（**未被 git 跟踪的构建产物**）被重新生成：
> `dist/content.js` sha256 = `52a82620…`、`dist/pick-layer.js` sha256 = `5f567d7e…` —— 与叶前**逐字节一致**；
> `dist/sidepanel.js` sha256 由 `5bb4985e…` 变为 `90c17edd…`，**字节数不变（362,777）**，差异来源为 `build.mjs` 注入的 `__BUILD_STAMP__`（源码零 diff、体积守卫与全部行为门禁均通过）。三个产物的**受守卫属性**（体积 / 冻结源 hash / 数量级）与本轮实测登记值逐项相等。

### 3.7 门禁 flaky 的定因（V1 落点 → F3 / F4）

```text
$ for i in 1..5: npm run test:page-input
run1 EXIT=1  76 passed / 2 failed   ← ✖ I-01② / ✖ I-01③
run2 EXIT=0  78 passed / 0 failed
run3 EXIT=0  78 passed / 0 failed
run4 EXIT=1  76 passed / 2 failed   ← 同一对断言（日志 page-input-run4.log 保留）
run5 EXIT=0  78 passed / 0 failed
```

**机制（我的探针 E 组给出确定性复现）**：`pick-input.ensureInjected()` → 面板发 `pick-layer-inject` → SW **无条件**在注入后下发 `pick-layer-env`（`authorized` 由 OriginStore 现算）⇒ 只要窗口期内发生一次 `refreshState()`（SW 的 `probe-changed` / `session-changed` 都会触发面板 `refreshState` → `ensureInjected`），门禁刚下发的 `authorized:false` 就被覆盖为 `true`，层不再自检卸载。**产物自身的行为是对的**（origin 确实仍被授权），被削弱的是**门禁断言**。

**更深的可达性问题（F4）**：`env(authorized:false)` 在**撤销路径上没有生产发送点**——`revoke` 处理只广播 `pick-layer-teardown`；`pick-layer-inject` 在未授权时**提前 return**（不推 env）；`pick-layer-env` 的唯一生产调用者 `startPick()` 只在 `inject()` 成功后才执行。因此 I-01② 自检**只能在「直接 `tabs.sendMessage`」这一测试通道上被触发**，无法保护它声称要保护的场景（teardown 丢失）。

### 3.8 台账 / 保护域 / 零改动（V10 / V11 关键原文）

```text
protectedRanges: journey.mjs sha256_match=True lines=185/185 anchors=True/True
                 binding.mjs sha256_match=True lines=184/184 anchors=True/True
registeredUncoveredLines（v3-3 叶段）：12/12 行在 bf5773d 逐字存在；既有 8 组 identical=True（只增未改）
entries: 61 → 95（新增 34 / 删除 0）；13 条既有条目被改写（逐条核对 = 定位串随轮次重 pin + reason 披露）
V34* newTitle 可定位：34/34（0 unlocatable）
manifest.json 零 diff · contextMenus=0 · externally_connectable=0 · ref-validity.ts 零 diff · package.json 零 diff
main=2ddc922 · HEAD=1e2e1a1 · git status 仅新增 validate.md/validate-report.md
```

---

## 4. 验证脚本执行记录（ADR-003）

**全部脚本位于 `/tmp/opencode/v3-validate-v34/`（不进入版本库）；日志位于 `…/gates/`、`…/plus1b/`、`…/probes/`；每个 Chromium 会话在 `finally` 内自清 profile；`/tmp` 用量全程 < 60%。**

| 脚本 / 命令 | 用途 | 对应场景 | 退出码 | 关键输出 |
|------|------|:--:|:--:|------|
| `run-gates.sh` / `run-gates2.sh` | 严格串行复跑门禁 + 体积/红线核对（全量日志、无截断） | V1/V11/V16 | 18×0 + 1×1（page-input 首轮） | `gates/SUMMARY.txt` 19 行 |
| `gates/page-input-run{2..5}.log` | flaky 复现（5 次） | V1/F3 | 0,0,1,0 | `76 passed / 2 failed` ×2 |
| `scan-ok-assertions.mjs` | `check()` 条件分类（CLASS_A/B） | V7 | 0 | `TOTAL CLASS_A=7`（13 门禁，CLASS_B=1,000+） |
| `scan-ok-only.mjs` | `ok`-only 站点抽取 + 原文窗口 | V7 | 0 | `TOTAL ok-only check sites: 29` + 逐条原文（`scan-ok-only.txt` 785 行） |
| `attribution.mjs` | 逐文件字节归因（自写 esbuild + `git show 1e1b798:`） | V9 | 0 | `+661/+389/+376/+83`，Σ=1,509（`attr/`） |
| `probe-v34b.mjs` | BLOCK-1 / 零注入 / 未覆盖态 / I-02 / 退让 / I-03 / env 竞态（自写 CDP + 自写夹具） | V2/V3/V4/V5/V6 | 0 | `41 passed / 0 failed`（`probe-final.log`） |
| `probe-density.mjs` | 自写密度口径 × 9 格逐格对照（自写 CDP + 产品 seam 驱动） | V12 | 0 | `19 passed / 0 failed`（`probe-density3.log`） |
| `plus1b/`（手工命令） | `pick-layer +1B@33,901` / `content.js +1B@177,077` 反证 + sha256 还原 | V8 | 1 → 0 | `AssertionError: 登记 33900B ≠ 实测 33901B` / `content.js 177077B ≠ 177076B`；还原 `sha256sum -c` OK |

---

## 5. 阻塞问题

**0 项**。无「未覆盖的 FR / 构建失败 / 严重漂移」；F1~F4 均为非阻塞（不影响产物行为与红线），但 **F1/F3/F4 建议在本叶收口前处置**。

---

## 6. 我独立发现的新问题（分级 + 可执行修复）

### F1（中，登记册保真 — 与 review BLOCK-2 同类，且发生在「修 BLOCK-2 的那一轮」）

- **位置**：`test/size-baseline.ts:717-722`（JSDoc）、`test/size-baseline.ts:747+`（`PICK_LAYER_RE_REGISTRATIONS['v3-4-fix2'].reason`）、`docs/v3-supersession-ledger.json#featureHistory.v3-4-fix2.perFileAttribution`
- **问题**：三处均以「**受控实验**：逐文件回退到 HEAD 后 `npm run build`，`stat` 读产物」为方法声明，但给出的分布是 **R1 当时的预估值** `+615/+504/+307/+83`；**实测分布是 `+661/+389/+376/+83`**（我的独立复现，与 `build.md §12.1` 及 commit message 一致，`build.md` 还明确写了「按本轮实测登记，不沿用预估分布」）。同一事实因此再次出现两个版本，且**被冒充的是「测量方法」本身**。
- **修复**：把三处的逐文件分布改为 `+661/+389/+376/+83`（并把「受控实验」的方法描述保留）；若希望从此不再漂移，可在 `pick-layer-budget.test.ts` 增加一条「`reason` 中的四个数字之和 == `baselineAfterBytes − baselineBeforeBytes`」的正则断言（低成本、可 FAIL）。

### F2（低，数字保真残留 — BLOCK-2 未覆盖到的散文）

- **位置**：`test/size-baseline.ts:670`（`（v3-3 + v3-4，+10.25%）`）、`:673`（`（v3-1 + v3-2 = +22.95%）`）、`docs/v3-supersession-ledger.json` 5 条 `reason`（`最后两轮（v3-3+v3-4）为 +10.25%`）
- **问题**：与实测算术冲突（`(362777−328476)/328476 = +10.44%`；`(327679−266500)/266500 = +22.956% → +22.96%`），且与**同文件** `:324/:325` 及 `docs/v3-density-baseline.json#volume.directionalAlert`（写 `+22.96%` / `+10.44%`）**自相矛盾**。
- **修复**：统一为 `+10.44%` / `+22.96%`；可选：把「相邻对最大增幅 == 22.96%」写成机器断言（`evaluateConsecutiveReRegistrationGrowth().cumulativePct.toFixed(2) === '22.96'` 已有断言，可再加一条「代码注释与基线 JSON 一致」的静态断言）。

### F3（中，门禁稳定性）— `test:page-input` 的 I-01②/I-01③ 断言 flaky

- **位置**：`test/ui/page-input.mjs`（I-01② 段 `envPushed → sleep(250) → layerProbe`；I-01③ 段紧接其后）
- **证据**：5 次运行 **2 次红**（`76 passed / 2 failed`，同一对断言；日志 `gates/page-input-run4.log`）；`build.md §12.5` 声称的 `78/0` 只是其中一次抽样。
- **机制**：见 §3.7（`ensureInjected → pick-layer-inject` 无条件重推 `authorized:true`；`probe-changed`/`session-changed → refreshState` 与之竞态）。
- **修复（门禁侧，推荐）**：I-01② 的载体换成**不是 bound/active 的第二个已授权 tab**（同 origin；该 tab 不会被面板的 `ensureInjected` 重推 env），或在该段开始前 `await` 面板进入静止（例如等待 `chrome.runtime.sendMessage({kind:'state'})` 连续两次返回同一 `probe.phase` 且非 `probing`），并断言「窗口期内未发生注入」的负控。
- **修复（产品侧，可选且更强）**：`pick-layer-inject` 只在 **env 与层内已知 env 不同** 时下发（或改为「env 变化才推」），这样「撤销 → 自检」的状态才稳定可观察。

### F4（中，修复可达性）— I-01② 的自检在**撤销路径上不可达**，未闭合其声称的 hole

- **位置**：`src/background/service-worker.ts` `case 'revoke'`（只 `teardownPickLayer(s, origin)`）· `case 'pick-layer-inject'`（未授权时提前 return，不推 env）· `src/ui/sidepanel/pick-input.ts:219`（`startPick()` 是 `pick-layer-env` 的唯一生产调用者，且仅在 `inject()` 成功后执行）
- **问题**：层侧自检需要收到 `pick-layer-env(authorized:false)`；而「撤销 + teardown 丢失」（I-01② 的目标场景）**恰好不会产生该消息** ⇒ 层仍持 `authorized:true`，继续拦截右键；自检只在测试通道（直接 `tabs.sendMessage`）上成立。
- **修复（择一）**：① 在 `revoke` 里对受影响 tabs **先下发 `pick-layer-env(authorized:false)`（或一个明确的 `revoked` 事实）再 teardown**，并把「teardown 丢失但 env 已送达 ⇒ 下一次交互自行卸载」写成可 FAIL 的门禁；② 或把层侧改为**主动拉取**（交互时向 SW 问一次授权，SW 现算 OriginStore）。
- **注**：方向仍 fail-closed（判定链 `authorized:false` 会阻断动作），故非阻塞；但「已撤销站点的层继续接管右键」本身是 FR-V3-067 / AC-V3-018 的字面违背。

### F5（低，观察 — 目标 tab 选择窗口）

- **位置**：`src/background/service-worker.ts#pickLayerTarget`（候选序 = bound 会话 tab → active tab）
- **证据**：一次运行中 `pick-layer-inject` 回包 `tabId` = **另一个同 origin tab**（bound 会话），而此时 /app 才是活动 tab；另一次运行则命中 /app。⇒ 切换同 origin 标签页后、`followActiveTab → bindOrigin` 完成前存在一个窗口，注入/高亮会落在**上一个**同 origin tab。
- **影响**：限同 origin（不会跨站），窗口短；但 `ref-highlight` 落在另一个 tab 属「行为落到非预期目标」。**建议**（可选）：当 bound 与 active 同 origin 时以 **active** 为准（一行判定）；或仅登记不改。

### F6（低，观察 — 焦点还原目标可能已脱离 DOM）

- **位置**：`src/content/pick-menu.ts#open/restoreFocus`
- **证据**：`previousFocus` 在 `open()` 时捕获；若页面在菜单开启期间移除该元素，`prev.focus()` 静默无效 ⇒ 焦点落回 `BODY`（我的探针首版正是因载体元素被 `remove()` 而观察到该行为）。
- **影响**：低（需宿主页面主动移除聚焦元素）；**修复**（可选）：`close()` 里 `if (!prev?.isConnected) return;` 或把焦点还给 `document.body` 之外的最近可聚焦祖先。

### F7（低，文档保真）

- **位置**：commit `1e2e1a1` message / `build.md §12.4`（「in-gate 模式清单 **4 → 9** 条」）
- **实测**：`test/gate-integrity.test.ts#inGate` 清单 —— `1e1b798`（R1 后）= **8** 条 → `HEAD`（R2 后）= **13** 条（R2 新增 5）。「4」是 R1 之前、「9」忽略了 R1 的 4 条。
- **修复**：文案改为「8 → 13」（或写「R2 新增 5 条，累计 13」）。

---

## 7. 未验证项（如实登记，不冒充 PASS）

1. **人工面 6 项**（拾取观感 / 拖动体感 / 右键菜单观感 / 宿主真实兼容 / 多显示器 / 高 DPI）—— `⏳ 未执行`（NFR-V3-015 要求如实登记，已满足）。
2. **真实第三方站点兼容**：全部动态验证都在本地 `127.0.0.1` / `localhost` 夹具上；未在真实站点（含 CSP / iframe / 复杂宿主样式）上跑。
3. **`risk` 档其余 4 个子场景**（`unauthorized` / `probing` / `confirm` / `staleRef`）我只独立复测了 `hardline` 一格；其余 4 个子场景的 12 格取自**被验证方门禁的实跑**（`density 127/0`），未逐格自测。
4. **EC-V3-007（扩展重载 / SW 休眠后不回放失效引用）**：无专门门禁，我只做了读码（`refreshState → ensureInjected` 重解析 + `judgeEnv` fail-closed），未构造 SW 回收实验。
5. **页面脚本 tamper 可利用性**（open shadow root 可被读写 / 事件可被合成 / 无 `isTrusted` 过滤）：仅静态判定「无命令通道 ⇒ 不越权」，未构造恶意页面实验（review I-07 已登记）。
6. **多轮稳定性**：`test:page-input` 的 flake 我只跑了 5 次（2 红）；未做更长回次的概率刻画。

---

## 8. 结论

**结论**：⚠️ **有条件通过**（0 阻塞；7 项非阻塞发现）

| 指标 | 要求 | 实测 | 达标 |
|------|------|------|:--:|
| FR 覆盖（FR-V3-060~072） | 13/13 有判据且通过 | **13/13**（自写探针 + 门禁） | ✅ |
| AC-CONV-1 / AC-CONV-2 | 生产唯一调用点 + fail-closed | `syncRefEnv`（render 调用）/ `dispatchRefAction` 唯一调用点 = `sidepanel.ts:1009` | ✅ |
| 非功能需求（门禁级） | 全绿 | 19 项复跑：18 项 EXIT=0 + **`page-input` flaky（F3）** | ⚠️ |
| 构建 / 体积四线 | EXIT=0 且 == 登记 | `177076 / 33900 / 362777`；`+1B` 反证 FAIL→还原 PASS | ✅ |
| 零注入（结构 + 反证） | 五探针全零 + 强制注入翻红 | 独立复现（A8~A15） | ✅ |
| 密度不回归 | 9 格零漂移 | 9/9 逐格相等（自写口径） | ✅ |
| 严重漂移 | 0 | 0（保真偏差 2 项已分级登记：F1/F2） | ✅ |
| 阻塞问题 | 0 | **0** | ✅ |
| 人工面 | 如实登记 | `⏳ 未执行` | ✅（如实） |

**理由**：

1. **BLOCK-1 修复为真**（独立复现）：授权 origin 的带路径页 `/app` 上 `ok:true` + 目标 tab 持层 + 隔离世界 marker + Shadow host + 右键接管；未授权带路径页仍结构性零注入；且「`ok:true` 但层落在别的 tab」被显式排除。
2. **安全面（零注入 / 零新增权限 / 体积冻结）全部独立成立**：五探针 + 反证、未覆盖两态、`+1B` 双反证、三冻结 hash、`manifest` 零 diff。
3. **有条件的部分**：`test:page-input` 的 I-01②/I-01③ 断言 **2/5 红**（F3），且其自检在撤销路径上**无生产触发点**（F4）—— 这不是产物行为缺陷（方向 fail-closed），但门禁的「全绿」不可稳定复现，且该修复未闭合它声称的场景。
4. **登记册保真仍有两项残留**（F1 逐文件归因用预估冒充实测；F2 `+10.25%/+22.95%`），属 R1 BLOCK-2 的同类问题、非阻塞但应处置。
5. 建议：**F1 / F3 / F4 同轮处置**（F1 = 3 处文案 + 1 条正则断言；F3 = 换载体 + 静止前置；F4 = `revoke` 先下发去授权事实再 teardown + 1 条可 FAIL 断言），F2/F5/F6/F7 可一并顺手修（纯文案 / 一行判定）。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1）：V1~V16 逐项实测；自写探针 **41 + 19 = 60** 断言全绿（BLOCK-1 / 零注入五探针 + 反证 / 未覆盖两态 / I-02 复活 / 三退让 + I-03 焦点 / env 竞态 / 密度 9 格）；门禁 19 项串行复跑（`page-input` **2/5 红**被独立复现并定因）；体积四线与 `+1B` 双反证实跑；逐文件归因独立复现；台账 / 保护域 / 零改动核对；**新发现 7 项**（F1 登记册逐文件归因用预估冒充实测 / F2 数字残留 / F3 门禁 flaky / F4 自检生产不可达 / F5 目标 tab 窗口 / F6 焦点目标可能脱离 DOM / F7 in-gate 清单条数文案）；**结论 ⚠️ 有条件通过，0 阻塞** | 2026-09-17 | SDDU Validate Agent |
