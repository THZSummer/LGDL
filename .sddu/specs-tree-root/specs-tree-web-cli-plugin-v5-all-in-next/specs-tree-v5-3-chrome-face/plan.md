# 技术计划：specs-tree-v5-3-chrome-face（V5-3 授权 chip + 可拖动宽度 + 死端守护 + 法八机核；末叶 / 收口叶）

> **文档定位**: SDDU 技术方案（叶子切片）—— 记录本叶的实施切入点、落地形状、文件影响与波次；**权威跨切契约见父 `../plan.md` + `../ADR-V5-001~012-*.md`**
> **前置依赖**: 父 `../spec.md` / `../discovery.md` / `../plan.md` + **上游叶 v5-1**（注册表 / 管线 / 双契约 / `BLOCKED_TERMINALS` / `data-op`）+ **上游叶 v5-2**（9 op 落地 / `op.authorize`·`op.revoke`·`op.rebind` / 掩码卡 / 断流样本）+ 本叶 `spec.md` v1.0
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-22
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-22
> **更新说明**: 初始创建（V5-3 末叶 / 收口叶技术方案：授权 chip 两态与零双写 / `data-narrow` 与密度口径解耦 / `error` 出生恢复区 / 死端守护门禁 / 法八四面机核 / X5 取代 / 父级共享面收口；主责 **ADR-V5-006 / 007 / 009 / 010 / 012（收口侧）**；7 波 / ~24 任务）

---

## 1. 前置检查

| 检查项 | 状态 | 证据 |
|--------|:--:|------|
| 本叶 `spec.md` 存在 | ✅ | `specs-tree-v5-3-chrome-face/spec.md`（248 行，v1.0） |
| 上游叶 v5-1 / v5-2 交付 | ✅ 计划态 | 父 `../plan.md` §7.2（v5-1 5 波 / v5-2 7 波）；本叶**只消费**（不改注册表语义与 op 执行体） |
| 外部 API 文档缓存 | ✅ N/A | 零外部 API；拖动性能 / 读屏 / 弹窗体感 = 人工面（EC-ALLN-007） |
| 保护 pin（本轮实测） | ✅ | journey `43054..58287` / `cc79f413…` / 240 行；binding `107780..115930` / `be9ad0e9…`（keep） |
| 分支 / HEAD | ✅ | `feature/web-cli-plugin` / `ea47ffd` |
| 写入范围 | ✅ | 仅本叶 SDDU 目录 |

---

## 2. 架构分析（本叶）

### 2.1 本叶题眼

**状态归位**（授权态唯一常显载体 + 零双写）+ **宽度真实且口径不动摇**（产品侧 `data-narrow` + 密度口径解耦）+ **两条新法则落成门禁**（法七死端守护 / 法八四面零明文）+ **共享面收口**（体积五要素三叶合计 / journey 保护段 / 双契约 / 取代台账一致性）。

### 2.2 授权态下移（ADR-V5-006）

| 面 | 现状 | 本叶 |
|---|---|---|
| 工具栏摘要 | `site · auth · session`（`view-model.ts:824`）+ `band.statusText` 含「已授权/未授权」（`:900`） | **只留 `origin · 会话`**；四词工具栏零出现 |
| 风险 rail | `RISK_CLASSES` 5 类含 `unauthorized`（`risk-rail.ts:29-40`） | `RAIL_RISK_CLASSES`(4) + `AUTH_STATES` 拆分；rail 授权类零残留 |
| 状态栏 | 第一行 `L2_BAR_TEXT`（无授权态）+ `#risk-chips` | 新增 `#auth-state`（**净新增**，`#risk-chips` 之前）常显两态 |
| L2 台账 | — | 站点行改指向「状态见状态栏授权 chip」（不复制状态值） |

- 单写者：`statusbar.ts` 仍是**状态栏唯一写入者**（J1~J4 保持）；`#auth-state` 与 `#risk-chips` **同行 `flex-wrap`**（尽量不新增行 ⇒ 见 §2.4）。
- 密度：工具栏 5 + auth chip 1 = **6 ≤ 7**；`unauthorized` 子场景总可点数**不变**（原 rail chip 1 → 新 auth chip 1）⇒ 台账逐格可保留。

### 2.3 死端守护门禁（ADR-V5-009）与法八四面（ADR-V5-010）

```
no-dead-end.mjs：5 类阻塞逐类（site.unauthorized / llm.unconfigured / perm.missing / binding.stale / ref.all-invalid）
  → nextOf(el) = el.querySelector('[data-op]') ?? 紧随同场景可见 [data-msg-type=nextstep] [data-op]
  → 逐类 deadEnd === false；死端 == 0；双向注入（新增阻塞无 next / 已有 next 被删）各 FAIL → 还原 PASS
  → 复用 S2 全链（v5-2 样本）作为 AC-ALLN-001 的主验收

law8-plaintext.mjs：哨兵（故意匹配 secret 形状）→ 掩码卡 → 提交
  → ① #stream + CardView.payload ② digest（含 ••••••）③ 审计面（渲染 + 存储）④ #panel 全元素 value/全部属性
  → 四面零命中；value 直达 key-store 恰 1 调用点；四类注入反证
```

### 2.4 宽度与密度（ADR-V5-007，X5）

- 产品侧**无宽度切换控件**（本轮实测 `grep` 0 命中）；280–640 拖动 = **设计稿契约**（G 127 断言 → design-contract 门禁）。
- 产品侧落点 = `ResizeObserver` 观测 `#panel` 实际宽度 → `data-narrow`（≤360 `true` / ≥361 `false`）+ 窄屏样式；**密度登记格 = 控件计数**（与宽度解耦）；320px 仍为锚点；阈值 / 31 格 / `STREAM_HEIGHT_RATIO_MIN` 逐字逐格不动。
- 诚实登记：产品侧宽度由 Chrome 控制 ⇒ 「拖动」在产品侧无对应物（收口文档显式登记，防被误读为「089 未实现」）。

### 2.5 共享面收口（ADR-V5-004 / 012）

体积五要素（**三叶合计**）+ journey 保护段（**保段优先 / 必要时第三次八步**）+ 双契约（v5-1 已登，本叶对账）+ 取代台账一致性（X5 条目 + `knownGap`）**各恰一次**。

---

## 3. 方案对比（本叶）

| 维度 | **A `#auth-state` 净新增 + `data-narrow` + 两新门禁**（选） | B 复用 `#risk-chips` 承载授权 chip | C 产品侧实现 280–640 拖动手柄 |
|---|---|---|---|
| 描述 | 状态归状态栏；rail 授权类并入；宽度用 `ResizeObserver` | 零新 DOM | 面板内手柄改宽度 |
| 优点 | 零双写可机核；J1~J4 与 6 ≤ 7 同时成立 | 省 DOM | 「照做设计稿」 |
| 缺点 | 状态栏或 +18px（须同行布局避让） | 与 J2「有风险才显 chips」冲突 ⇒ 授权 chip 被 `hidden`，违「两态恒显其一」 | Chrome 侧栏宽度不受页面控制 ⇒ **假控件** |
| 风险 | R-ALLN-010（保护段）受控 | R-ALLN-907 成真（状态 / 风险混同） | 与设计稿语义不符 + 多一套联动 |
| 工作量 | ~7 波 / ~24 任务 | ~2 波，**不达标** | ~5 波，**语义错** |

## 4. 推荐方案

**推荐 A**。理由：作者 ⑧ 反馈逐字要求「状态 → 状态栏」；`#auth-state` 作为 `#risk-chips` 的**兄弟节点**才能同时满足 J2（零风险时 chips 隐藏）与「两态恒显其一」（N23）；G 稿 §M 已把「零双写 / 两态原文 / 6 ≤ 7」全部机核，本叶只需落成验收。

---

## 5. 文件影响分析（本叶）

| 操作 | 文件路径 | 说明 |
|:--:|---|---|
| MODIFY | `src/ui/sidepanel/index.html` | `#auth-state` 净新增（状态栏内、`#risk-chips` 之前）+ 管理详情 DOM |
| MODIFY | `src/ui/sidepanel/statusbar.ts` | 增写 `#auth-state`（两态 + `data-auth` + `aria-label`）；仍是唯一写入者 |
| MODIFY | `src/ui/sidepanel/view-model.ts` | `toolbarDigest` / `band.statusText` 去授权态；管理详情 view（默认折叠 `data-density-exempt`） |
| MODIFY | `src/ui/sidepanel/l0/risk-rail.ts` | `RAIL_RISK_CLASSES`(4) + `AUTH_STATES` 拆分 |
| MODIFY | `src/ui/sidepanel/cards/error.ts` | 阻塞类**出生铸造**恢复区（`recovery` chips） |
| MODIFY | `src/ui/sidepanel/stream-model.ts` | `error.payload.recovery` 渲染打通（字段已在 v5-1 声明） |
| MODIFY | `src/ui/sidepanel/sidepanel.ts` | `data-narrow` 的 `ResizeObserver` + 黄 / 绿 chip 点击（产 next / 管理详情） |
| NEW | `test/ui/no-dead-end.mjs` | 死端守护（5 类 + N=0 + 死端=0 + 双向反证）+ S2 全链主验收（AC-ALLN-001） |
| NEW | `test/ui/law8-plaintext.mjs` | 法八四面零明文 + 全属性扫描 + 哨兵四类反证 |
| MODIFY | `test/ui/l0.mjs`（244） | 授权 chip 两态 + 零双写四词扫描 + J1~J4 |
| MODIFY | `test/ui/density.mjs`（232） | `#auth-state` 计数 + `data-narrow` + 逐格留痕 |
| MODIFY | `test/ui/journey.mjs`（171） | 320 锚点 + 360/361 边界；**保护段保段或八步取代** |
| MODIFY | `test/ui/stream.mjs`（63） | `error` 行内恢复（**增**断言） |
| MODIFY | `test/density-thresholds.test.ts` | 阈值逐字 + 单源声明 + `data-narrow` 边界 |
| MODIFY | `test/host-registry.test.ts` | chip / 分隔条**不在流内**（零宿主反向判据） |
| MODIFY | `test/gate-integrity.test.ts` | 死端 / 法八两新门禁纳入受审集合 |
| MODIFY | `test/supersession-ledger.test.ts` | X5 条目 + `protectedRanges` 处置 + `redlineRemap[]` + `knownGap` |
| MODIFY | `docs/v4-supersession-ledger.json` | X5 `modifiedRanges[]` + 保护段处置 + `v3Vol3Closeout` 三值同源（三叶合计） |
| MODIFY | `docs/v4-density-baseline.json` | `tiers` 等价重锚 + `v5Ledger` 逐格留痕（31 格不删） |
| MODIFY | `test/size-baseline.ts` | 五要素重登记（三叶合计） |
| MODIFY | `package.json` | `test:v3` 串行链追加 `test:dead-end` / `test:law8`（**串行**） |

---

## 6. 风险评估（本叶）

| # | 风险 | 等级 | 缓解 |
|---|---|:--:|---|
| R-ALLN-007 | 状态栏授权 chip 归属与双写面（≥3 处改口径） | 中高 | 零双写五条 + 四词扫描（含 rail）+ 反证 |
| R-ALLN-006 | `error` 出生冻结 vs 行内恢复 chip | 中高 | 出生铸造；`BORN_FROZEN_KINDS` 不动；反证 |
| R-ALLN-008 | 法八可核性（反证恒绿三类教训） | 中高 | 四面 + **全属性**逐项 + 逐面反证 |
| R-ALLN-009 | 密度口径变更连锁 | 中 | 口径解耦 + 320 锚点 + 逐格留痕 |
| R-ALLN-010 | 保护段第三次取代 | 中高 | **保段优先**（`#auth-state` 同行不增行）+ 八步预案（ADR-V5-012） |
| R-ALLN-011 | 零宿主判据 | 中 | chip / 分隔条在流外（`host-registry` 断言） |
| R-ALLN-001 | 体积（收口叶承担三叶合计登记） | 高 | 五要素 + 四级越限预案（ADR-V5-011） |
| R-ALLN-906 | 法八四面被缩窄回三面 | 中高 | 四面逐面断言（含审计面） |
| R-ALLN-907 | chip「状态」与流内「事实」混同 | 中 | 角色口径 + N23 |
| R-ALLN-908 | `data-narrow` 与 clamp 边界不一致 | 低 | 360/361 双值断言 |
| R-V5-105 | rail 授权态双写回归 | 中 | 四词扫描范围含 rail；rail 授权类零残留 |
| R-V5-106 | `matchMedia` 误判（看视口非面板宽度） | 中 | 必须 `ResizeObserver` 观测 `#panel`；宽视口 + 窄面板反证 |
| R-V5-110 | 新门禁未纳入 `gate-integrity` | 中 | 受审集合显式追加 |

---

## 7. 生成的 ADR（本叶主责）

| ADR | 标题 | 本叶落地切入点 |
|---|---|---|
| **ADR-V5-006** | 授权 chip + 零双写五条 | 全条 |
| **ADR-V5-007** | 宽度产品侧落点 + 密度口径解耦（X5） | 全条 |
| **ADR-V5-009** | 死端守护门禁 | 全条（+ S2 主验收） |
| **ADR-V5-010** | 法八四面零明文机核 | 全条 |
| **ADR-V5-012** | 波次与保护段 | **收口侧**（journey 保段 / 第三次八步 / 共享面恰一次 / 三叶合计体积） |

（`error` 出生恢复区的**渲染**落在本叶（ADR-V5-002 的执行侧已在 v5-2）；体积预案见 ADR-V5-011。）

---

## 8. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V5-3 末叶 / 收口叶技术方案：`#auth-state` 常显两态 + 零双写五条 + 黄 / 绿点击 + `ResizeObserver`→`data-narrow` + 密度口径解耦（X5 等价重锚）+ `error` 出生恢复区 + 死端守护门禁（含 S2 主验收）+ 法八四面机核 + 三叶合计体积与 journey 保护段收口；7 波 / ~24 任务；主责 ADR-V5-006 / 007 / 009 / 010 / 012（收口侧）） | 2026-09-22 | SDDU Plan Agent |
