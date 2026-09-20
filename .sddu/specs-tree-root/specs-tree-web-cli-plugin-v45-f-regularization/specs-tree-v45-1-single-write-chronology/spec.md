# Feature Specification：specs-tree-v45-1-single-write-chronology（V4.5-1 单写化 + 宿主时间序化）

> **文档定位**: SDDU 需求规范（叶子切片） — 本叶承载的父 FR / NFR / EC / AC 的**实施范围切片**；权威条文见父 `../spec.md`
> **前置依赖**: 父 `../spec.md` v1.0（2026-09-21）+ 父 `../discovery.md` v1.0（2026-09-21，Q-REG-001~012 / R-REG-001~015 / O-REG-001~009 已全裁决）；设计基准 F 稿 + shim 60 断言（**只读、零触碰**）
> **创建人**: SDDU Spec Agent
> **创建时间**: 2026-09-21
> **版本**: v1.0
> **更新人**: SDDU Spec Agent
> **更新时间**: 2026-09-21
> **更新说明**: 初始创建（V4.5-1 叶子规范：单写化 + 宿主时间序化为**同一套不变量**一次性收口；含 37 条元素去向映射与四门禁处置口径）

本叶 = v4.5 的**唯一叶**，把两项核心（5 条提示带单写化 / 4 个固定位置宿主时间序化）与两项附带（FIX-5 消解 / `options/index.html` 纯文案解冻）**一次性收口**：让 `ol#stream` 成为纯时间序卡列表、让每条事实在可见面恰出现一次，再把门禁从「描述旧形态」迁移为「描述新形态」。**两项核心共享同一次体积重登记与同一次 journey 结构重锚 ⇒ 不可分割**（父 §12.1）。

---

## 1. 元数据

| 字段 | 值 |
|------|-----|
| Feature ID | specs-tree-v45-1-single-write-chronology（V4.5-1 单写化 + 宿主时间序化） |
| 父 Feature | specs-tree-web-cli-plugin-v45-f-regularization（depth=1，F-31，v0.9.1） |
| 名称 | V4.5-1 单写化 + 宿主时间序化——5 条提示带可见投影退役 + 4 宿主清零（`ol#stream` = 纯时间序卡列表）+ `#composer` 出流 + 风险恢复规则扩展 + 手势迁设置帮助分区 + `options` 纯文案解冻 + 零宿主断言 + 密度基线重算 + journey 二次取代 + 体积五要素 |
| 优先级 | P0 |
| 目标版本 | v0.9.1（v4 维护版本段；同批由收口登记 ROADMAP） |
| 目录深度 | depth=2（叶子，`leaf: true`） |
| 交付顺序 | **position = 1（首且唯一）**；叶内执行序见 §8.4 |
| 分支 / HEAD | `feature/web-cli-plugin` / `8a7e930`（spec 阶段起点） |
| 基线产物 | `dist/sidepanel.js` = **480,026 B**（生效上限 **504,027 B**） |
| 相关干系人 | 作者（唯一真实用户 + 决策者，已授权编排器代行决策）；编排器（O-REG-001~009 裁决）；下游 @sddu-plan / @sddu-tasks / @sddu-build / @sddu-review / @sddu-validate |
| 关联问题 | Q-REG-001~012（全量，本叶是唯一实施面） |
| 关联风险 | R-REG-001~015 + R-REG-901~906 |

---

## 2. 上下文与边界

### 2.1 上下文

v4（F-30）把「一切交互皆消息」做成了**行为**，但没有做成**形态**：`ol#stream` 里仍有 4 个固定位置宿主（`decision` / `composer` / `l1-panels` / `strips`）把时间序切段；5 条提示带的可见投影与流内系统事件行对同一事实双写；其中 4 条宿主还被 `host-registry.ts` 以「内容被保护门禁 pin」为理由登记为**永久结构宿主**（`host-registry.ts:46-51` 逐字「Each is a **permanent structural home now**」）。于是「F 的纯形」既没达成，**也在制度上被判定为已收口**（Q-REG-001~003）；同时空态首屏被 6 个 0 计数控件占据（Q-REG-004）。

本叶的工作 = **推翻这条由门禁反推出的合法性**：先让实现服从 F 稿纯形，再让门禁描述新形态。

### 2.2 范围（做 / 不做）

**做（in）**：

- 5 条提示带（`#env-guard` / `#site-hint` / `#onboarding` / `#discovery-notice` / `#notice`）可见投影**真退役**（DOM 移除，非 `hidden`）；`#send-reason` 保留（状态栏职责）。
- 单系统事件通道 4 规则语义（净化 / 去重 5000 ms / 限速 20 行·分钟 / 「持续：」前缀 + `dropped` 不静默）**逐字不变**。
- 富提示承载：单行事实行 + 推荐卡 `risk-recovery` 恢复 chips（含「重新绑定当前标签页」）+ 行 `title` + 设置视图站点分区详情；**零新增宿主**。
- 4 宿主清零：`decision` 壳 / `l1-panels` 组 / `strips` 包裹层 / `composer` 宿主的 DOM 移除；`#composer` 迁 `body` 尾部保持 `hidden`（id / ARIA 保留）。
- 37 条存活元素去向落地（父 §11）：退役 19 / 迁移 13 / 消解 3 / 保留 2。
- `risk-recovery` 触发集扩展（site / probe）；`NEXTSTEP_ACTS` 闭集终态 6 项；每个本地 act 布线门禁 + 反证。
- 手势说明迁设置视图「帮助」分区（`SETTINGS_SECTION_IDS` 单源派生）；onboarding chip `act:'help'`。
- `options/index.html` 纯文案解冻 + 订正 + 显式登记 + `test:zero-injection` 复跑。
- `host-registry` 零宿主断言 + `RETIRED_HOST_IDS` 扩容 + 5 类问题串终态。
- 密度基线按 Chromium 实测**重算为新基线** + v4.5 台账显式取代 + 反证；阈值与豁免口径**逐字不变**。
- journey 保护段**第二次八步显式取代**；binding 保护段保段或显式取代 + 段外逐行登记；各门禁等价重锚（数量不减）。
- 体积五要素重登记 + 披露算术机核 + V3-VOL-3 三值同源 + 红线逐字节复核。

**不做（out）**：

- 不碰 `src/content/**` / `dist/content.js` / `dist/pick-layer.js`；不动 SW / `KIND_SET` / 判定链 / `manifest.json`；不碰 `design/**` 与 shim；不改 12 卡类型学与三区法则本身。
- 不做 L2 视图内部重构（只允许新增承载块）；不新增真值源 / 不新增 LLM 产物 / 不新增权限。
- 不新增宿主；不以 `hidden` 充数；不放宽任何阈值；不删除 / 降级断言；不设自缚装置；不做竞品调研；不改 ROADMAP。
- 不承接 build/review/validate 之外的父级动作——本叶是**唯一叶**，全程承接。

### 2.3 与父规范的关系

- **权威条文 = 父 `../spec.md`**（§5.1~§5.10 / §11 / §13 / §15）。本叶只做**范围切片 + 实施口径**，不新增与父冲突的需求；若必须偏离，须先回父规范做显式取代登记。
- 父 §11 的 37 条元素去向映射 = 本叶的**施工图**；父 §9 的 22 条 AC = 本叶的**验收锚点**（§7 逐条对齐）。

---

## 3. 目标与非目标（本叶）

### 3.1 目标

| # | 目标 |
|---|------|
| LG-V45-1-001 | `ol#stream` 子节点全部为时间序卡（零 `li[data-host]`），F 变化点 1「对话历史 = 流本身」达成。 |
| LG-V45-1-002 | 每条提示事实在可见面恰出现一次；5 条提示带的可见投影真退役（非 `hidden`）。 |
| LG-V45-1-003 | 「过渡态清零」义务（R4-18 / ADR-V4-005 §6）**可达且已达成**（零宿主断言 + 退役清单扩容）。 |
| LG-V45-1-004 | 富内容与恢复路径不丢语义：卡内可达 + 推荐卡恢复 chips + 设置详情 + 行 `title`；零新增宿主。 |
| LG-V45-1-005 | 空态首屏去噪（FIX-5 消解）；`options` 授权指引与实现一致（显式解冻 + 登记）。 |
| LG-V45-1-006 | 门禁从旧形态迁移到新形态：计数只增不减、反证不空转、四门禁（journey / binding / density / supersession）处置留痕。 |

### 3.2 非目标（本叶）

继承父 §3.2 的 `NG-V45-001~017` 全部适用。**本叶额外强调**：

| # | 本叶明确不做 |
|---|-------------|
| LNG-V45-1-001 | 不把「宿主清零」实现为「宿主换名 / 宿主隐藏 / 结构塞进卡内」——零宿主判据必须能捕获任意深度与任意 `li[data-host]`（含改名前的等价形态）。 |
| LNG-V45-1-002 | 不把密度重算当作「重新登记一次读数」——被改动的每一格必须留痕 + 配可 FAIL 反证，注入点被搬走必须重写。 |
| LNG-V45-1-003 | 不把 journey 保护段「顺手改测试」——必须走八步取代（新 pin + `supersededFrom` 链式保留 + `modifiedRanges[]` + `redlineRemap[]` + 计数守恒 + RP-V4-08 反证）。 |
| LNG-V45-1-004 | 不以「先改实现后补台账」顺序落地——取代 / 登记与实现同轮完成（v4 的「登记反推永久性」教训）。 |

---

## 4. 功能需求（本叶承载的父 FR）

> 本叶承载父 §5 的**全部 44 条 FR**（唯一叶）。下表按父分组给出**本叶落地切入点**，需求条文以父为准。

| 父 FR | 本叶落地切入点 | 优先级 |
|---|---|---|
| FR-V45-001 / 002 / 003 / 004 | 编号空间与单叶结构登记；断言零删除 / 计数只增对账表 | P0 |
| FR-V45-010 | 5 条提示带 + `li[data-host="strips"]` + `.strips` 的 DOM 移除；`#send-reason` 保留 | P0 |
| FR-V45-011 | 首屏三事实（env / site / probe）恰 1 个可见载体；注册表双写理由移除 | P0 |
| FR-V45-012 | 单通道 4 规则常量与语义逐字不变（5000 / 20 / `持续：` / 净化） | P0 |
| FR-V45-013 | 富提示承载：行 `kind='site'` / `kind='probe'` + `title`（与设置详情同源）+ 恢复 chips | P0 |
| FR-V45-014 | `firstRunCard` 承载 onboarding / discovery-notice（`terminable` 谓词保持） | P0 |
| FR-V45-015 | 归并矩阵判据重写：唯一生产 emitter + 可见载体数 == 1 + `#send-reason` 仍在 DOM | P0 |
| FR-V45-020 | `#stream` 纯时间序卡判据（任意深度零 `[data-host]`） | P0 |
| FR-V45-021 | `decision` 壳退役 + 8 个存活元素去向（父 §11 行 1~16） | P0 |
| FR-V45-022 | `l1-panels` 组退役 + 4 开关去向（父 §11 行 17~27）；`rounds` 计数入审计视图标题 | P0 |
| FR-V45-023 | `#composer` 迁 `body` 尾 `hidden`（id / ARIA 保留） | P0 |
| FR-V45-024 | `messageAnchor()` 不再依赖流内 composer 宿主 | P0 |
| FR-V45-025 | FIX-5 消解登记（不单列 AC，收口文档重述） | P0 |
| FR-V45-026 | `disclosure.ts` 三份声明随退役重写；风险位永不折叠逐字保留；`'composer'` 保留在 `NEVER_FOLDABLE` | P0 |
| FR-V45-030 / 031 / 032 / 033 | `risk-recovery` 触发集扩展 + 「重新绑定当前标签页」chip + act 闭集 6 项 + 本地 act 布线门禁 | P0 |
| FR-V45-040 / 041 / 042 | 设置视图「帮助」分区（`SETTINGS_SECTION_IDS` 单源）+ chip `act:'help'` + 分区只读零可点 | P1 |
| FR-V45-050 / 051 / 052 | `options/index.html` 纯文案解冻 + 订正 + 显式登记 + `test:zero-injection` 复跑 | P1 |
| FR-V45-060 / 061 / 062 | 零宿主断言 + `RETIRED_HOST_IDS` 扩容 + 5 类问题串终态 | P0 |
| FR-V45-070~074 | 口径零放宽 + 基线重算显式取代 + 夹具锚改构造保证 + 反证不空转 + 迁入方向性 | P0 |
| FR-V45-080~084 | journey 二次八步取代 + binding 段外登记 + 11 处门禁等价重锚 + `knownGap` 一致性 + 两段证伪 | P0 |
| FR-V45-090~093 | 体积五要素 + 披露算术机核 + V3-VOL-3 三值同源 + 红线逐字节 | P0 |

---

## 5. 非功能需求（本叶相关）

| 父 NFR | 本叶关注点 | 验收锚点 |
|---|---|---|
| NFR-V45-001 | `#region-stream` 高度占比 ≥65.0%（只上调）；滚动跟随不回退 | `journey #15b` + `#15p/#15r/#15s/#15t` + `density streamRatioSpike` |
| NFR-V45-002 | 320px 零溢出；键盘序；`role=log` / `aria-live` 由流内行 / 卡等价承载 | `journey #15q` + 键盘断言 + `#stream[role=log]` |
| NFR-V45-003 | `title` 内容同过零明文净化（新增注入反证） | 新断言 + `test:zero-injection ≥27` |
| NFR-V45-004 | 各单源恰一处声明（豁免 / 阈值 / `SYSTEM_EVENT_KINDS` / act 闭集 / 手势列表 / 设置分区计数 / 退役宿主清单）+ 源文本抽取机核 | 「声明恰一次」扫描 + 反证 |
| NFR-V45-005 | `sidepanel.js` ≤ `floor(baseline × 1.05)`；cap 保持 `record-only` | `test:size-budget` + `test:size-growth-evidence` |
| NFR-V45-006 | 兼容读取面（`#composer` / `#input` / `#send` / `#settings-back` / `#rebind` / 状态栏 ids / `#l2-title` / `#l2-count` / `#view-host`） | 兼容面逐 id 断言 |
| NFR-V45-007 | 每条新 / 改判据可 FAIL 并声明 `expectFailPattern` | 反证留证（父 §15 第 6 条） |
| NFR-V45-008 | 长文案不得退化为「仅 `title` 可见」：流内须有可读文本等价载体 | 新断言 + 人工面读屏项 |

---

## 6. 边界情况（本叶相关）

父 `EC-V45-001~013` 全部适用；本叶执行时**重点验**：

| 父 EC | 本叶执行要点 |
|---|---|
| EC-V45-001 | 空态 / 首装：0 计数控件零渲染；欢迎卡 ≤1 / 首屏卡 ≤2 不变。 |
| EC-V45-002 / 003 | 去重窗口边界（5000 ms）与速率溢出（20 行·分钟，`dropped` 状态栏可读）——**规则逐字不变**，只搬家（投影退役）。 |
| EC-V45-004 | probe 退避策略全文只进 `title` + 设置站点详情；流内保持单行。 |
| EC-V45-005 | `#l1-ref-rescue` 迁入卡内后「唯一文本匹配时可见」逐字不变。 |
| EC-V45-006 | 无活跃站点：三个呼应面（流内行 / 恢复 chip / 设置详情）且**无第 4 处投影**。 |
| EC-V45-007 / 008 | 长会话纯卡序；`#composer` 出流后草稿 / 滚动位置在视图往返中仍存活。 |
| EC-V45-009 | 320px / 三主题 / 高 DPI 在迁入块（帮助分区 / 树木归因块 / 审计证据区）中的可读性。 |
| EC-V45-010 | 解冻面外 `zeroDiffFiles` 其余 8 项逐字节不变；v3 台账零 diff。 |
| EC-V45-011 | 迁出 / 迁入方向性：`assertChromeNotInStream` 继续成立；`#view-host` 内容进被测量面。 |
| EC-V45-012 | 注入点被搬走必须重写（否则反证恒绿 = 判据空转）。 |
| EC-V45-013 | `#notice` 两处角色（授权回执 + 夹具锚）**同时**迁移，不得只迁一处。 |

---

## 7. 验收标准（**验收锚点 = 父 AC 编号**）

> 本叶不做 AC 重编号；**验收锚点一律引用父 `../spec.md` §9 的 `AC-V45-*`**（22 条）。下表给出本叶的**执行序验收包**（何时验、验什么）。

| 执行序 | 验收包 | 父 AC 锚点 | 通过判据 |
|:--:|---|---|---|
| ① SINGLE | 投影退役 + 单写化 | AC-V45-001 / 003 / 004 | 首屏三事实各恰 1 次；5 个 id 为 `null`；`#send-reason` 保留；单通道 4 规则常量与反证 |
| ② CHRONO | 宿主清零 + 元素迁移 | AC-V45-002 / 005 / 007 / 008 / 009 | `[data-host]` 计数 == 0；`#composer` 在 `body` 尾且 `hidden`；`ref` 卡恢复区 / ask·auth 卡内 / L2 迁入块 / 审计标题计数全绿 |
| ③ RECOVERY / HELP | 推荐卡扩展 + 帮助分区 | AC-V45-010 / 011 / 012 | siteprobe 触发产出恢复卡；act 闭集 6 项 + 布线门禁；帮助分区 6 行 + chip `act:'help'` 零回合 |
| ④ UNFREEZE | options 纯文案 | AC-V45-013 | 仅文案行 diff + 登记 + `test:zero-injection ≥27` |
| ⑤ 收口 | 密度 / 取代 / 体积 | AC-V45-014 / 015 / 016 / 017 / 018 / 019 / 020 | journey 新 pin + ≥167；binding 保段或取代 + 段外逐行登记；各门禁计数只增；密度台账显式取代；体积五要素 + V3-VOL-3 三值；红线逐字节 |
| ⑥ 验证纪律 | 串行 + 人工面 + `KL-N-10` | AC-V45-021 / 022 | 24 门禁串行日志；`KL-N-10` 隔离复跑 ≥2；人工面逐项标注（不冒充 PASS） |

**核心验收（父 §9 口径）**：`AC-V45-001 / 002 / 014 / 015 / 016 / 017` —— 真机首屏三事实各恰出现一次 · `ol#stream` 全为时间序卡 · journey 第二次八步显式取代 · binding 保段或显式取代 · l0/l1/disclosure/density/system-merge 断言重写为新语义（数量不减）· 测试总数只增。

---

## 8. 独立性说明（**能独立做到全门禁绿**）

### 8.1 变更面

`src/ui/sidepanel/**`（`index.html` / `host-registry.ts` / `disclosure.ts` / `stream-render.ts` / `l1/panels.ts` / `recommend.ts` / `view-model.ts` / `sidepanel.ts` / `cards/{ref,askuser,auth,nextstep}.ts` / `l2/*` 承载块 / `system-events.ts` 常量面只读）+ `src/ui/settings/**`（新增「帮助」分区）+ `src/ui/options/index.html`（**纯文案行**）+ `test/**`（等价重锚 + 新门禁 + 反证）+ `test/size-baseline.ts`（五要素重登记）+ `docs/{v4-density-baseline,v4-supersession-ledger}.json`（显式台账）。

### 8.2 取代负荷（**高**）

- journey 保护段**第二次八步取代**（新 pin + `supersededFrom` 链式保留 + `modifiedRanges[]` + `redlineRemap[]` + 计数守恒 + RP-V4-08 反证）。
- binding 保护段**保段**（本体零 diff）或显式取代；**段外** `#4b/#4c` / `AP#4b` 等价改写 + 逐行登记。
- `docs/v4-density-baseline.json` 全格重算 + v4.5 台账显式取代；夹具稳态锚迁「构造保证」。
- 退役容器清单扩容（`host-registry`）+ 5 类问题串终态；`docs/v3-supersession-ledger.json` **零 diff**。

### 8.3 门禁集合（全绿要求，串行）

| 门禁 | 下界 | 门禁 | 下界 |
|---|---:|---|---:|
| `typecheck` | PASS | `test:journey` | ≥167 |
| `plugin npm test` | ≥1001 | `test:insight` | ≥116 |
| `test:l0` | ≥223 | `test:binding` | ≥192 |
| `test:l1` | ≥111 | `test:hardening` | ≥24 |
| `test:l2` | ≥74 | `test:page-input` | ≥106 |
| `test:density` | ≥175 | `test:stream` | ≥63 |
| `test:ask-auth` | ≥61 | `test:recommendation` | ≥56 |
| `test:ref-pick-wiring` | ≥11 | `test:supersession` | ≥33 |
| `test:size-ruling-vol3` | ≥10 | `test:l1-reverse` / `test:l2-reverse` | ≥9 / ≥10 |
| `test:zero-injection` | ≥27 | `test:design-contract` | ≥6 |
| `test:e2e` | PASS | `test:gate-integrity` | ≥12 |

**纪律**：严格串行（禁并发 Chromium）；日志全量落盘；反证必须实跑「注入 FAIL → 逐字节还原 → PASS」并声明 `expectFailPattern`；`KL-N-10` 隔离复跑 ≥2、仍红如实登记不阻塞收口。

### 8.4 叶内执行序（供 plan/tasks 参考，**非需求**）

① 退役面 DOM 移除 + 归并判据重写（SINGLE）→ ② 宿主清零 + 元素迁移 + `#composer` 出流（CHRONO）→ ③ 推荐卡恢复扩展 + act 闭集 + 布线门禁（RECOVERY / HELP）→ ④ `options` 解冻（可并行准备）→ ⑤ 密度重算 + journey 取代 + 体积重登记（**共享收口面，一次做完**）。

> **为什么必须一次做完**：体积五要素重登记与 journey 保护段取代都依赖**终态 DOM**；分两次做会产生「中间态取代」（多余台账条目 + 二次新 pin），并把同一段保护区改两遍（违背取代台账的「同编号等价改写」守恒口径）。

---

## 9. 开放问题（本叶）

| # | 问题 | 状态 |
|---|------|:--:|
| 1 | 密度重算的**具体格数与差值** | **待实测**（busy 轮以 Chromium 实测；父 DC-V45-006 已定口径：显式取代 + 反证 + 阈值不动；**禁止预填**） |
| 2 | 体积**净增 / 净减值** | **待实测**（五要素在收口轮按实测填写；上限与纪律已定） |
| 3 | `title` 承载长文案的**读屏体验**是否可接受 | **待人工面**（父 NFR-V45-008 / AC-V45-022；headless 不可合成） |
| 4 | 恢复 chips 是否需要第 4 个动作（`MAX_CHIPS_PER_CARD = 3` 上限内如何取舍「重新拾取 / 改用描述 / 重新绑定」） | **spec 已定闭集口径**（父 FR-V45-031：至少三项 + 卡上限 3 ⇒ 每触发场景按规则优先级取 ≤3）；**具体取舍由 plan 在规则表中定值** |

---

## 10. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V4.5-1 叶子规范：范围 = 父 §5.1~§5.10 全部 44 FR（唯一叶）；交付顺序 position=1；含 5 段执行序验收包与独立性说明；叶内执行序 = ① SINGLE → ② CHRONO → ③ RECOVERY/HELP → ④ UNFREEZE → ⑤ 收口（共享面一次做完）） | 2026-09-21 | SDDU Spec Agent |
