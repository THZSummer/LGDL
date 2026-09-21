# 任务分解：specs-tree-v5-3-chrome-face（V5-3 授权 chip + 可拖动宽度 + 死端守护 + 法八机核；末叶 / 收口叶）

> **文档定位**: SDDU 任务清单（**末叶 / 收口叶 = 实施承载**）— **24 个原子任务**（`TASK-V5-153~176` / 叶内别名 `V53-01~24`），按 **`ADR-V5-012 §1` v5-3 七波** 展开；**权威跨切契约见父 `../plan.md` + `../ADR-V5-001~012-*.md` + 父 `../tasks.md`**
> **前置依赖**: 本叶 `plan.md` v1.0（`ADR-V5-006` / `007` / `009` / `010` / `012`(收口侧) + §5 文件影响）+ **上游叶 v5-1**（注册表 / 管线 / 双契约 / `BLOCKED_TERMINALS` / `data-op`）+ **上游叶 v5-2**（9 op 落地 / `op.authorize`·`op.revoke`·`op.rebind` / 掩码卡 / S2 断流样本 `test/ui/fixtures/s2-chain.mjs`）+ 父/本叶 `spec.md` v1.0 + 父 `../discovery.md` v1.0（R-ALLN-006 / 007 / 008 / 009 / 010 / 906 / 907 / 908）
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-22
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-09-22
> **更新说明**: 初始创建（24 原子任务 / 7 波；W1 法八四面机核判据先立 → W2 `error` 出生带恢复区 → W3 死端守护门禁 + S2 主验收 → W4 授权 chip 唯一载体 + 零双写五条 → W5 `data-narrow` + 三档 radio 零残留 → W6 密度口径解耦 + 台账重锚（X5）→ W7 共享面收口（journey / 体积终轮 / 台账 / 全门禁 + E2E）；含 **1 个 spikeGate**（`153`，SG-4）与每任务**红线检查点**四段清单）

---

## 0. 红线与纪律（本叶，**继承父 N1~N25 与父 §16 十二条**）

### 0.1 四段代号（父 `tasks.md §0` 定义，逐字一致）

| 代号 | 面 | 内容（逐字守线） |
|:--:|---|---|
| **F1** | 冻界面 | `design/**` 四 sha 零触碰；12 kind `CARD_TYPES` 零扩展；**`#auth-state` / 管理详情必须在流外**（零宿主） |
| **F2** | 冻界面 | `src/content/**` / `dist/content.js`（177,076 B / `52a82620…`）/ `dist/pick-layer.js`（33,900 B / `5f567d7e…`）零改动 |
| **F3** | 冻界面 | `KIND_SET` 逐字零新增；判定链内容哈希 pin；`manifest.json` 零 diff |
| **F4** | 冻界面 | `docs/v3-supersession-ledger.json` 零 diff + `zeroDiffFiles` 8 项逐字节 |
| **F5** | 冻界面 | `packages/web-cli-base/**` / `.opencode/opencode.json` / `ROADMAP.md`（含 F-29 区段）零改动；不碰 `main`；无新依赖；path-limited `git add` |
| **T-a** | 阈值面 | 密度阈值 **`7/15 · 9/20 · 17/35` 逐字不动**；豁免**只认 `hidden`**；`DENSITY_EXCLUDED_SUBTREES = ['#stream']` 单源；防滥用（单卡 ≤6 / 首屏 ≤2 / 合计 ≤8 / 欢迎卡 ≤1 / 文案 ≤8 行）；`registeredCells 31` **不删格** |
| **T-b** | 阈值面 | `STREAM_HEIGHT_RATIO_MIN = 0.65`（**只允许上调**；本叶**不得下调**）+ `logClientHeightFloor` + `streamRatioSpike` |
| **T-c** | 阈值面 | `SIDEPANEL_CEILING == floor(baseline × 1.05)`（无 cap）；`SIDEPANEL_CEILING_CAP === 'record-only'`；**档位 512,000 不下移**；绝对上限 `563,200`；`authorConfirmation.status === 'pending-author-line'`（**不得伪称已确认**） |
| **T-d** | 阈值面 | `MAX_CHIPS_PER_CARD = 3` / `MAX_OPEN_ASKS = 2` / `ASK_CANCEL_REASONS` 4 项 / `MAX_CLICKABLES_PER_CARD = 6` / `NEXTSTEP_SOURCE_WHITELIST` 7 项零扩项 |
| **T-e** | 阈值面 | `ACT_TO_OP` 6 行唯一权威（本叶消费，不回退） |
| **L-a** | 台账面 | `docs/v4-supersession-ledger.json`（`protectedRanges` / `supersessionChain` / `protectedSupersession` / `modifiedRanges[]` / `redlineRemap[]` / `designContractChanges[]` / `knownGap` / `v3Vol3Closeout`） |
| **L-b** | 台账面 | `docs/v4-density-baseline.json`（`tiers` 等价重锚 + `v5Ledger` **逐格留痕** + `riskIncrementRegistry` 4 溯源字段 `rulingId`·`rulingDate`·`approvedBy`·`reason` **缺一 FAIL**） |
| **L-c** | 台账面 | `test/size-baseline.ts` 五要素 + `_HISTORY` + `_TIMELINE` + `SIDEPANEL_RE_REGISTRATIONS` + `SIDEPANEL_GROWTH_BREAKDOWN`（**三叶合计**收口） |
| **C-1** | 契约面 | 12 kind 契约 / `BORN_FROZEN_KINDS` **语义不动**（恢复区是**出生铸造**，不是事后 patch）；**不加 kind** |
| **C-2** | 契约面 | `op-table` 同源（本叶只消费） |
| **C-3** | 契约面 | `BLOCKED_TERMINALS` **恰 5 项单源**：本叶**只消费** v5-1 的单源 + 复核「声明恰一次」 |
| **C-4** | 契约面 | `ACT_TO_OP` 唯一权威；chip 只读 `data-op`（黄 chip 产的 next 卡必带 `data-op="op.authorize"`） |
| **C-5** | 契约面 | F / G 双契约各冻各的（**禁止混池**）；保护段处置**必须显式二选一** |
| **C-6** | 契约面 | 义务表 ↔ 注册表一致（本叶只读） |
| **C-7** | 契约面 | `statusbar.ts` 仍为**状态栏唯一写入者**（J1~J4）；`REGISTERED_STRUCTURAL_HOSTS = []`（chip / 管理详情**不在流内**）；`op.turn` 唯一 `requestTurn`；SW 内 `.request(` 零命中 |

### 0.2 纪律（逐字继承）

| # | 纪律 | 守线任务 |
|---|------|---------|
| 1 | **断言零删除零降级、计数只增不减**（**唯一例外** = 保护段显式八步取代 + 台账留痕） | 全任务；重点 `169` / `171` / `172` / `173` / `175` |
| 2 | **反证必须实跑**（注入 → FAIL → **逐字节 sha256 还原** → PASS）；禁「删属性充数 / 换口径充数 / 自我裁决」 | `155` / `158` / `161` / `168` / `173` / `175` |
| 3 | **门禁严格串行**（一次一个 Chromium，`finally` 自清 profile）；日志 `tee` 全量 | `155` / `161` / `169` / `173` / `176` |
| 4 | `KL-N-10` / `test:ui #54g`：首轮异常**隔离复跑 ≥2**、日志全量、仍红**如实登记不阻塞收口** | `176` |
| 5 | 停机规则（父 §7 9 条）命中 ⇒ 停下上报（**禁静默改 pin / 禁放宽阈值 / 禁下调 0.65**） | `153` / `168` / `173` / `174` |
| 6 | `git add` path-limited；不 force push；不合 `main`；无新依赖 | `176` |
| 7 | **人工面逐项标注**（拖固体感 / 读屏 / 双主题 / 320px / 真机 S2 走查 = `⏳` / `PASS`，**不得冒充**） | `176` |
| 8 | **`#auth-state` 与 `#risk-chips` 同行 `flex-wrap`**（尽量不新增行 ⇒ 保 journey 保护段） | `163` / `164` / `167` |
| 9 | **诚实登记**：280–640 拖动 = **设计稿契约**（G 127 断言），产品侧**不实现拖动手柄**（Chrome 控制侧栏宽度）⇒ 必须在文档显式登记，防被误读为「089 未实现」 | `168` / `172` / `176` |

### 0.3 编号与规模

| 项 | 值 |
|---|---|
| 全局编号段 | **`TASK-V5-153~176`**（24 条；与 v5-1 `101~122` / v5-2 `123~152` 连续、零冲突） |
| 叶内别名 | `V53-01~24` |
| 任务总数 / 波数 | **24 / 7** |
| 规模分布 | **S×1 / M×14 / L×9** |
| spikeGate | **SG-4 = `TASK-V5-153`**（5 类阻塞 headless 驱动 seam → 闸 `159` / `160`） |
| 体积预算（本叶） | 逐项 **3,000 B**（`ADR-V5-011 §1` #8+#9+#10+#11）+ 胶水分摊 250 = **3,250 B**；**收口承担三叶合计 17,600 B 登记**（父 `tasks.md §4.1`） |

### 0.4 本叶提交区间

| 区间 | 波 | 内容 | 原子性 |
|:--:|:--:|---|---|
| **A** | W1 | 法八四面机核（判据先立） | 独立提交 |
| **B** | W2 | `error` 出生带恢复区 | 独立提交 |
| **C** | W3 | 死端守护门禁 + S2 主验收 | 独立提交（`159`→`160`→`161` 相关） |
| **D** | W4 | 授权 chip 唯一载体 + 零双写五条 | **终态状态栏 DOM** 必须与 `163`~`166` **同区间**（改了 DOM 未重锚门禁 ⇒ 不得单独提交） |
| **E** | W5 | `data-narrow` + 三档 radio 零残留 | 独立提交 |
| **F** | W6 | 密度口径解耦 + 台账重锚（X5） | 独立提交 |
| **G** | W7 | 共享面收口（**单一原子区间**：journey / 体积 / 台账 / 全门禁互为依据） | **`173`~`176` 必须落在同一 commit 区间** |

> 失败 ⇒ 回滚该区间整段并重跑受影响门禁；**不跨区间回滚**。

---

## 1. 依赖拓扑总览

```
[前置] v5-1 + v5-2 全绿（TASK-V5-101~152）+ 本叶 plan.md（ADR-V5-006/007/009/010/012收口侧）+ 父 tasks.md（跨切红线 / 预算 / 停机）

Wave 1 ── 法八四面机核（判据先立）（区间 A）        ※ 153 只读探针；154 → 155 串行（同文件）
  TASK-V5-153 [S] spikeGate-4：5 类阻塞 headless 驱动 seam 探针     ← 闸门 → 159/160
  TASK-V5-154 [L] law8-plaintext.mjs 骨架：SENTINEL + 面 ①②③
  TASK-V5-155 [M] 面 ④（DOM value + 全部属性）+ 提交后清空 + 四类反证 + 受审追加

Wave 2 ── error 出生带恢复区（区间 B）             ※ 156 → 157 → 158
  TASK-V5-156 [M] stream-model.ts error.payload.recovery 渲染打通
  TASK-V5-157 [M] cards/error.ts 出生铸造恢复区（阻塞类带 / 非阻塞不带）
  TASK-V5-158 [M] test/ui/stream.mjs 增断言 + 「出生后不 patch」反证

Wave 3 ── 死端守护门禁 + S2 主验收（区间 C）       ※ 159 → 160 → 161；162 可并行
  TASK-V5-159 [L] no-dead-end.mjs：5 类阻塞逐类 + nextOf 双形态判据
  TASK-V5-160 [L] 死端 = 0 同屏扫描 + S2 全链主验收（消费 v5-2 样本）
  TASK-V5-161 [M] 双向注入反证 + 逐字节还原
  TASK-V5-162 [M] host-registry 零宿主反向判据 + gate-integrity 受审追加

Wave 4 ── 授权 chip 唯一载体 + 零双写五条（区间 D，**原子**）  ※ 163 → 164 → 165 → 166
  TASK-V5-163 [M] index.html #auth-state 净新增 + 管理详情 DOM
  TASK-V5-164 [L] statusbar.ts 两态写入（唯一写入者 + J1~J4）
  TASK-V5-165 [L] 零双写五条（view-model / risk-rail / L2 站点行）
  TASK-V5-166 [M] 黄 / 绿 chip 点击行为 + 四词扫描断言

Wave 5 ── data-narrow + 三档 radio 零残留（区间 E） ※ 167 → 168；169 依赖 167/168
  TASK-V5-167 [M] ResizeObserver → data-narrow（360/361）+ 窄屏样式块
  TASK-V5-168 [M] 三档 radio 零残留 + R-V5-106 反证（宽视口 + 窄面板）
  TASK-V5-169 [M] l0.mjs / density.mjs 等价重锚（#auth-state 计数 + 边界 + J1~J4）

Wave 6 ── 密度口径解耦 + 台账重锚（X5）（区间 F）   ※ 170 → 171 → 172
  TASK-V5-170 [M] density-thresholds.test.ts 阈值逐字 + data-narrow 边界 + 单源声明
  TASK-V5-171 [L] 密度登记格口径解耦（控件计数）+ 31 格逐格留痕
  TASK-V5-172 [M] density-baseline tiers 重锚 + v5Ledger + X5 取代台账条目

Wave 7 ── 共享面收口（区间 G，**单一原子区间**）    ※ 173 → 174 → 175 → 176
  TASK-V5-173 [L] journey 保护段处置（保段首选 / 第三次八步）+ 计数守恒 ≥171 + RP-V4-08
  TASK-V5-174 [L] 体积终轮（三叶合计）+ 五要素 + V3-VOL-3 三值同源 + 档位闸门
  TASK-V5-175 [M] supersession 台账一致性（X5 + designContractChanges + knownGap）+ gate-integrity 收口
  TASK-V5-176 [L] 收尾：全门禁串行 + e2e 汇总 + 人工面清单逐项 + 计数只增对账
```

**关键路径（严格串行，24 任务）**：
`153 → 154 → 155 → 156 → 157 → 158 → 159 → 160 → 161 → 162 → 163 → 164 → 165 → 166 → 167 → 168 → 169 → 170 → 171 → 172 → 173 → 174 → 175 → 176`
**旁路闸门**：`153`（SG-4）→ 闸 `159` / `160`（seam 不足 ⇒ **回 v5-1 补 provider 的可注入 `when(ctx)`**，禁以人工判据替代）。
**可并行（文件不相交）**：`162 ∥ 159~161`（`host-registry.test.ts` 与 `no-dead-end.mjs` 不相交）；`168 ∥ 167` 的准备（保守串行）。

---

## 2. 任务列表

### TASK-V5-153（V53-01）: **spikeGate-4** —— 5 类阻塞终态 headless 驱动 seam 探针
| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | v5-2 全绿（9 op + S2 样本） |
| **执行波次** | 1（区间 A） |
| **对应 FR / AC** | FR-ALLN-010 / 011 / 015 · AC-ALLN-002 |
| **ADR / 风险** | ADR-V5-009 §3 · **R-ALLN-014** |
| **并行度** | 与 `154` / `155` 完全并行（只读探针，**不落版本库**） |
| **闸门语义** | **spikeGate**：结论决定 `TASK-V5-159` / `160` 能否直落 |

**输入**: `ADR-V5-009 §3` 5 类驱动路径表（`site.unauthorized` → 绑定未授权 origin（既有 binding seam）；`llm.unconfigured` → 清空 key-store（`clearLlm` 等价）；`perm.missing` → 授权 origin + 未授予可选能力；`binding.stale` → 注入 `site.bindingStale = true` 的 state 载荷（**seam 由既有 `state` 消息承载**）；`ref.all-invalid` → 驱动全部引用 stale（既有 ref seam））；`ADR-V5-009 §决策`（**若 seam 不足，须回到 v5-1 补 provider 的可注入 `when(ctx)`，不得以人工判据替代**）。

**动作**（`/tmp/opencode/v5-spike/` 内，只读仓库 + 临时副本）:
1. 逐类核对 **seam 可得性**：5 类各自给出「驱动入口 == 既有 seam 名称 + file:line」或「缺口」。
2. 对 `binding.stale` / `ref.all-invalid` 重点验证 `when(ctx)` 的**可注入性**（state 载荷可构造）。
3. 逐类验证**渲染后同帧可断言**（`dispatch → render()` 同步；无定时器）——「N = 0」口径成立。
4. 记录失败判据（seam 不可得 / 需异步轮询 / 需人工判据）。

**产出**: 探针报告（`seam-available` 或 `report-to-orchestrator` + 逐类 seam 映射表 + 缺口清单）；结论写入 `state.json#v5-3.spikes[]`。

**验收标准（可机核）**:
- [ ] 5 类逐类有「seam 名称 + file:line」或显式缺口条目
- [ ] `binding.stale` / `ref.all-invalid` 的 `when(ctx)` **可注入**（构造载荷成功）
- [ ] 「同步渲染、同帧可断言」结论成文（无 sleep / 无 poll）
- [ ] 结论二值之一且带证据；`git status --short` **零输出**

**红线检查点**: 冻界面 `F1` / `F2` / `F3`；阈值面 `T-d`；契约面 `C-3`（单源消费）；台账面 `L-a`（**禁改 pin / 禁写台账**）。

**验证命令**:
```bash
mkdir -p /tmp/opencode/v5-spike && node /tmp/opencode/v5-spike/blocked-seam-probe.mjs | tee /tmp/opencode/v5-gate-logs/w13-spike-blocked-seam.log
git status --short   # 必须为空
```

---

### TASK-V5-154（V53-02）: `test/ui/law8-plaintext.mjs` 骨架 —— `SENTINEL` + 面 ①（流内 payload）②（digest）③（审计面）
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V5-153 |
| **执行波次** | 1（区间 A） |
| **对应 FR / AC** | FR-ALLN-023 · **AC-ALLN-003** · **N24** |
| **ADR / 风险** | ADR-V5-010 §1 / §2 · **R-ALLN-008 / 906** |
| **并行度** | W1 串行中段 |

**输入**: `ADR-V5-010 §1`（`SENTINEL = 'sk-v5-law8-' + <高熵后缀>`，**故意**匹配 `stream-plaintext.ts#label()` 的 secret 形状 ⇒ 一旦泄漏进 `label()` 会**抛错**，第二重信号）；§2 面 ①②③ 判据；§4（与 `test:zero-injection`（27）**互补、分别计数，不混池**）。

**动作**:
1. 新建 `test/ui/law8-plaintext.mjs`（Chromium 门禁，**串行**）：哨兵 → 掩码卡（v5-2 `135`）→ 提交（v5-2 `136`）。
2. **面 ①**：`#stream` 全子树 `textContent` + 每个卡 `CardView.payload` 序列化 ⇒ 哨兵**零命中**。
3. **面 ②**：`chrome.storage.local` 中 `stream-digest` 键的全部值 ⇒ 哨兵**零命中** ∧ digest **含 `••••••`**。
4. **面 ③**：`#view-audit` 行 + 审计存储（既有事件）**两面**都扫 ⇒ 哨兵**零命中** ∧ 含 `{opId, ts, result, maskedLength}`。
5. **key 直写断言**：值直达 key-store **恰 1 调用点**（与 v5-2 `136` 对齐）。

**产出**: `law8-plaintext.mjs`（哨兵 + 面 ①②③）。

**验收标准（可机核）**:
- [ ] 面 ① / ② / ③ **逐面**断言存在且可 FAIL（每面 `expectFailPattern`）
- [ ] 面 ② 判据含「digest **含 `••••••`**」（不只零命中）
- [ ] 面 ③ 覆盖**审计渲染 + 审计存储两面**
- [ ] key 直写调用点 == **1**（与 `136` 同源读数）
- [ ] 与 `test:zero-injection`（27）**分别计数**（不混池）

**红线检查点**: 冻界面 `F1` / `F2` / `F3`；阈值面 `T-d`；契约面 `C-1`（掩码走既有 `askuser` 扩形）/ `C-7`；台账面 `L-a`（只读）。

**验证命令**:
```bash
node packages/web-cli-plugin/test/ui/law8-plaintext.mjs 2>&1 | tee /tmp/opencode/v5-gate-logs/w13-law8-abc.log   # 串行：一次一个 Chromium
```

---

### TASK-V5-155（V53-03）: 法八面 ④（**DOM value + 全部元素属性**）+ 提交后清空 + **四类注入反证** + 受审追加
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-154 |
| **执行波次** | 1（区间 A 末位） |
| **对应 FR / AC** | FR-ALLN-023 / 024 / 121 · **AC-ALLN-003 / 021** |
| **ADR / 风险** | ADR-V5-010 §2 ④ / §3 / §4 · **R-ALLN-906**（四面被缩窄回三面） |
| **并行度** | W1 末位 |

**输入**: `ADR-V5-010 §2 ④`（`#panel` 内**每个元素**的 `value` / `defaultValue` / `placeholder` / `title` / `aria-label` / `aria-description` / **全部 `attributes`（含 `data-*`）**；`input[type=password][data-secret]` 的 `value` 在提交后**清空**）；§3 对抗反证 ①~⑤ + 还原；§4（`gate-integrity` 受审集合追加）。

**动作**:
1. 面 ④：遍历 `#panel` 内**每个元素**的 `attributes` **逐项**（**不是白名单子集**）⇒ 哨兵零命中；提交后 `data-secret` input 的 `value` **清空**。
2. `maskedLength` 只以**长度类别**（如 `8+`）落固化区，不落原始长度。
3. **四类注入反证**（+ 第 5 条 `label()` 抛错作为第二重信号）：①→流 ②→digest ③→审计 ④→属性；逐条实跑 FAIL（`expectFailPattern` 记载）→ **逐字节 sha256 还原** → PASS。
4. `test/gate-integrity.test.ts`：追加 `law8-plaintext` 入受审集合（**只追加**）；`zero-injection ≥27` 与本法八门禁**分别计数**。
5. 存储侧边界**显式登记**（out-of-scope；**不得被误读为「存储已加密」**，`NG-ALLN-017`）。

**产出**: `law8-plaintext.mjs`（面 ④ + 反证）+ `gate-integrity` 受审追加 + 存储侧边界登记。

**验收标准（可机核）**:
- [ ] 面 ④ 遍历「**全部** `attributes`」（非白名单子集）∧ 提交后 `value` **清空**
- [ ] 4 类注入逐条实跑：FAIL（`expectFailPattern`）→ 逐字节还原（sha256 前后相同）→ PASS
- [ ] 第 5 信号：哨兵经 `label()` ⇒ **抛错**（既有守卫）
- [ ] `EXPECTED_AUDITED_FILES` ⊇ `law8-plaintext.mjs`（只追加）∧ `zero-injection ≥27` 独立计数
- [ ] 存储侧边界声明存在 ∧ 无「存储已加密」类断言 / 文案

**红线检查点**: 冻界面 `F1` / `F2`；阈值面 `T-d`；契约面 `C-1`（不加 kind）；台账面 `L-a`（只读）。

**验证命令**:
```bash
node packages/web-cli-plugin/test/ui/law8-plaintext.mjs 2>&1 | tee /tmp/opencode/v5-gate-logs/w13-law8-d.log
npm run test:zero-injection --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w13-zero-injection.log   # 串行
npm run test:gate-integrity --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w13-gate-integrity-law8.log
```

---

### TASK-V5-156（V53-04）: `stream-model.ts` —— `error.payload.recovery` 渲染打通
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-155 |
| **执行波次** | 2（区间 B） |
| **对应 FR / AC** | FR-ALLN-012 · AC-ALLN-002 |
| **ADR / 风险** | ADR-V5-002 §3（执行侧渲染）/ 009 · R-ALLN-006 |
| **并行度** | W2 首位（`157` 依赖） |

**输入**: `ADR-V5-002 §3`（`stream-model.ts` 的 `error` payload 增**可选** `recovery?: readonly {text, opId}[]` —— **字段已在 v5-1 `101` 声明类型位**，本任务打通渲染链路）；`ADR-V5-009`（阻塞类判定**唯一源自** `BLOCKED_TERMINALS`）。

**动作**:
1. `stream-model.ts`：`error` payload 的 `recovery` 字段流经 reduce / render 时**不被裁剪**；阻塞类判定**从 `BLOCKED_TERMINALS` 派生**（**禁止散落字符串**）。
2. 非阻塞类 `error` ⇒ `recovery` 缺省（渲染零变化 ⇒ 回滚友好）。
3. 反证：去掉铸造期 `recovery` ⇒ v5-3 `161` 死端门禁 FAIL（双向注入 ②）。

**产出**: `stream-model.ts`（`recovery` 渲染打通）。

**验收标准（可机核）**:
- [ ] `error.payload.recovery` 可选 ∧ 缺省时不改变既有渲染（零回归）
- [ ] 阻塞类判定派生自 `BLOCKED_TERMINALS`（源文本：无第二个 5 字面量集合）
- [ ] `BORN_FROZEN_KINDS` **逐字不变**（`error` 仍在集内）
- [ ] 反证：去 `recovery` ⇒ `161` FAIL（联测）

**红线检查点**: 冻界面 `F1`（`CARD_TYPES` 零扩展）；阈值面 `T-d`；契约面 `C-1` / `C-3`；台账面 `L-a`（只读）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
npm run test:stream --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w14-error-recovery-wire.log
```

---

### TASK-V5-157（V53-05）: `cards/error.ts` —— **出生铸造**恢复区（阻塞类带 / 非阻塞不带）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-156 |
| **执行波次** | 2（区间 B） |
| **对应 FR / AC** | FR-ALLN-012 · **AC-ALLN-002** · **NG-ALLN-001** |
| **ADR / 风险** | ADR-V5-002 §3 · **R-ALLN-006**（出生冻结 vs 行内恢复） |
| **并行度** | W2 串行 |

**输入**: `ADR-V5-002 §3`（`cards/error.ts` 铸造期：若 `view.payload.recovery?.length` ⇒ 气泡**后**追加 `next-chips`，每 chip `data-act="next"` + `data-op`；否则**不带任何 chip**；**不触碰 `BORN_FROZEN_KINDS`**：恢复区是**出生铸造的一部分**（同一 `createErrorCard` 调用内完成），卡出生后仍**只追加、不 patch**）。

**动作**:
1. `cards/error.ts`：`createErrorCard` 铸造期内完成恢复区渲染（**同一调用内**；非事后 patch）。
2. 阻塞类 ⇒ chips 带 `[data-act="next"][data-op]`；非阻塞类 ⇒ **零 chip**。
3. 反证：① 把恢复区改为**事后 patch** ⇒ 「出生后不 patch」断言 FAIL；② 非阻塞类带上 chip ⇒ FAIL。

**产出**: `cards/error.ts`（出生铸造恢复区）。

**验收标准（可机核）**:
- [ ] 阻塞类 `error` 卡**行内**含 `[data-act="next"][data-op]`（可定位）
- [ ] 非阻塞类 `error` 卡**零 chip**
- [ ] 恢复区在 `createErrorCard` **同一调用内**完成（源文本可判；无 patch 路径）
- [ ] `BORN_FROZEN_KINDS` 未改 ∧ 「出生后不 patch」断言绿
- [ ] 反证两条实跑 ⇒ FAIL → 还原 PASS

**红线检查点**: 冻界面 `F1`（12 kind 零扩展）；阈值面 `T-d`（`MAX_CHIPS_PER_CARD = 3`）；契约面 `C-1` / `C-3` / `C-4`；台账面 `L-a`（登记 O-009 落层条目）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
npm run test:stream --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w14-error-birth-recovery.log
```

---

### TASK-V5-158（V53-06）: `test/ui/stream.mjs` **增**断言（`error` 行内恢复）+ 「出生后不 patch」反证
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-157 |
| **执行波次** | 2（区间 B 末位） |
| **对应 FR / AC** | FR-ALLN-012 / 115（X6）· AC-ALLN-002 / 021 |
| **ADR / 风险** | ADR-V5-002 / 012 · R-ALLN-006 |
| **并行度** | W2 末位 |

**输入**: `FR-ALLN-115`（`test/ui/stream.mjs`（63）等价重锚并**增**断言（`error` 行内恢复））；`X6` 等价重写形态 ④（`error` 行内恢复 = **铸造期**属性）。

**动作**:
1. `test/ui/stream.mjs`（基线 63）：**增**断言 —— ① 阻塞类 `error` 行内含 chip；② 非阻塞类零 chip；③ 铸造期完成（非 patch）；④ 点击 chip 另起 next 卡 / ask 卡（**不 patch 原卡**）。
2. 计数 **只增**（≥63）；每处改写登记 `modifiedRanges[]`。
3. 反证：把恢复区改为事后 patch ⇒ FAIL（逐字节还原 ⇒ PASS）。

**产出**: `test/ui/stream.mjs`（增断言）+ `modifiedRanges[]` 条目 + 反证留证。

**验收标准（可机核）**:
- [ ] `test:stream ≥63`（**只增**）；新增断言 ≥4 条
- [ ] 「出生后不 patch」可 FAIL 反证存在（`expectFailPattern`）
- [ ] `modifiedRanges[]` 每处改写有 `oldId` / `reason ≥40` / `leaf:'v5-3'`

**红线检查点**: 冻界面 `F1`；阈值面 `T-d`；契约面 `C-1` / `C-5`（F/G 契约不动）；台账面 `L-a`（`modifiedRanges[]`）。

**验证命令**:
```bash
npm run test:stream --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w14-stream-error-add.log
```

---

### TASK-V5-159（V53-07）: `test/ui/no-dead-end.mjs` —— 5 类阻塞**逐类** + `nextOf(el)` 双形态判据
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V5-158 · `153`（**SG-4 = `seam-available`**） |
| **执行波次** | 3（区间 C） |
| **对应 FR / AC** | FR-ALLN-010 / 011 / 015 · **AC-ALLN-002** · N22 |
| **ADR / 风险** | ADR-V5-009 §1 / §2 · R-ALLN-006 |
| **并行度** | 与 `162` 并行（文件不相交） |
| **闸门依赖** | **`153` = `report-to-orchestrator` ⇒ 本任务暂停上报** |

**输入**: `ADR-V5-009 §2`（`nextOf(el) = el.querySelector('[data-op]')` **形态①** ?? 后续同场景可见兄弟中「最近的」`[data-msg-type="nextstep"]` 且其内 `querySelector('[data-op]')` 非空 **形态②**；`deadEnd(el) = nextOf(el) === null`）；`ADR-V5-009 §1`（`BLOCKED_TERMINALS` **唯一枚举源** + 「声明恰一次」扫描）。

**动作**:
1. 新建 `test/ui/no-dead-end.mjs`（Chromium 门禁，**串行**；**单点落地** —— v5-2 只交付样本与 seam，守 `FR-ALLN-004`）。
2. 阻塞枚举**唯一源自 `BLOCKED_TERMINALS`**（消费 v5-1 单源）+ 复核「声明恰一次」扫描。
3. 5 类**逐类**驱动（按 `153` 的 seam 映射表）⇒ `deadEnd(el) === false`（**逐类**断言）。
4. `nextOf` 双形态**都能命中**（形态① / 形态② 各出证据）。
5. `test/gate-integrity.test.ts`：追加本门禁入受审集合（只追加）。

**产出**: `test/ui/no-dead-end.mjs`（5 类逐类 + 双形态）+ `gate-integrity` 受审追加。

**验收标准（可机核）**:
- [ ] 5 类阻塞**逐类** `deadEnd === false`（5 组读数）
- [ ] `nextOf` 形态① 与 形态② **各至少 1 例命中**（双形态覆盖）
- [ ] 阻塞枚举源 == `BLOCKED_TERMINALS`（唯一）+ 「声明恰一次」扫描绿
- [ ] `EXPECTED_AUDITED_FILES` ⊇ `no-dead-end.mjs`

**红线检查点**: 冻界面 `F1` / `F2`；阈值面 `T-d`；契约面 `C-3` / `C-4`；台账面 `L-a`（只读）。

**验证命令**:
```bash
node packages/web-cli-plugin/test/ui/no-dead-end.mjs 2>&1 | tee /tmp/opencode/v5-gate-logs/w15-no-dead-end-classes.log   # 串行
```

---

### TASK-V5-160（V53-08）: **死端 = 0** 同屏扫描 + **S2 全链主验收**（消费 v5-2 样本）
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V5-159 |
| **执行波次** | 3（区间 C） |
| **对应 FR / AC** | FR-ALLN-011 / 016 / 015 · **AC-ALLN-001 / 002** |
| **ADR / 风险** | ADR-V5-009 §2 / §5 · R-ALLN-014 |
| **并行度** | W3 串行 |

**输入**: `ADR-V5-009 §2`（**死端 = 0**：`#stream` 内所有阻塞卡 `deadEnd` 全为 false）；§5（S2 全链首验收 = `no-dead-end.mjs` **复用** S2 全链；断言死端 = 0；浏览器原生权限弹窗体感入人工面）。

**动作**:
1. **死端 = 0**：同屏扫描 `#stream` 内所有阻塞卡 ⇒ `deadEnd` 全 false；计数 `=== 0`。
2. **S2 全链主验收**：直接 `import` v5-2 的 `test/ui/fixtures/s2-chain.mjs`（**同一份样本，不复制**）⇒ 10 环节逐环节 + 死端 = 0。
3. **N = 0 口径**：在阻塞态状态派发之后**立即**断言（**不 poll、不 sleep**）；若某类需异步（如 probe 恢复）⇒ 断言点后移到其状态派发之后，仍要求**同屏**（无新阻塞卡插入期间）。
4. 人工面登记：浏览器原生权限弹窗体感 = `⏳ 未执行`（`PENDING_TIMEOUT`）。

**产出**: 死端 = 0 读数 + S2 全链主验收读数表 + 人工面条目。

**验收标准（可机核）**:
- [ ] `#stream` 阻塞卡死端计数 **=== 0**
- [ ] S2 10 环节逐环节读数存在（含 ⑤ 授权 next 产出 / ⑩ 拾取 next 产出）
- [ ] N = 0 口径：**无** `sleep` / `poll`（源文本判据）
- [ ] 人工面：浏览器原生权限弹窗体感 = **`⏳ 未执行`**（非 `PASS`）

**红线检查点**: 冻界面 `F1` / `F2`；阈值面 `T-d`；契约面 `C-3`；台账面 `L-a`（只读）。

**验证命令**:
```bash
node packages/web-cli-plugin/test/ui/no-dead-end.mjs 2>&1 | tee /tmp/opencode/v5-gate-logs/w15-no-dead-end-s2.log   # 串行
```

---

### TASK-V5-161（V53-09）: **双向注入反证**（新增阻塞无 next / 已有 next 被删）+ 逐字节还原
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-160 |
| **执行波次** | 3（区间 C） |
| **对应 FR / AC** | FR-ALLN-015 / 121 · **AC-ALLN-002 / 021** |
| **ADR / 风险** | ADR-V5-009 §4 · R-ALLN-013 |
| **并行度** | W3 串行 |

**输入**: `ADR-V5-009 §4`（① **新增阻塞态却无 next**：向 `BLOCKED_TERMINALS` 注入第 6 项（无对应 provider）⇒ 门禁 FAIL；② **已有 next 被删**：移除某阻塞 `error` 卡的铸造期 `recovery` ⇒ 门禁 FAIL；两者随后**逐字节还原** ⇒ PASS（记录 sha256 前后相同））。

**动作**:
1. 注入 ①：临时向 `BLOCKED_TERMINALS` 加第 6 项（无 provider）⇒ 门禁**必 FAIL**；逐字节还原 ⇒ PASS（sha 前后相同）。
2. 注入 ②：临时移除某阻塞 `error` 的铸造期 `recovery` ⇒ 门禁**必 FAIL**；逐字节还原 ⇒ PASS。
3. 记录两段证据（日志全量）；**无「不再 FAIL 的判据」**遗留。
4. `test/gate-integrity.test.ts`：双向反证条目纳入受审说明（只追加）。

**产出**: 双向注入反证留证（两段证据 × 2）+ sha256 前后读数。

**验收标准（可机核）**:
- [ ] 注入 ① ⇒ FAIL ∧ 还原后 sha256 **逐字节相同** ∧ PASS
- [ ] 注入 ② ⇒ FAIL ∧ 还原后 sha256 **逐字节相同** ∧ PASS
- [ ] 两条注均在**声明的位置**生效（`expectFailPattern` 记载）
- [ ] 无「恒绿判据」遗留

**红线检查点**: 冻界面 `F1` / `F3`；阈值面 `T-d`；契约面 `C-3`；台账面 `L-a`（只读）。

**验证命令**:
```bash
node packages/web-cli-plugin/test/ui/no-dead-end.mjs 2>&1 | tee /tmp/opencode/v5-gate-logs/w15-no-dead-end-bidirectional.log   # 串行
```

---

### TASK-V5-162（V53-10）: `test/host-registry.test.ts` —— chip / 分隔条**不在流内**（零宿主反向判据）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-159 |
| **执行波次** | 3（区间 C 末位） |
| **对应 FR / AC** | FR-ALLN-085（chip 在流外）· AC-ALLN-015 · **N17** |
| **ADR / 风险** | ADR-V5-006 / 007 · **R-ALLN-011** |
| **并行度** | 与 `159`~`161` 并行（文件不相交） |

**输入**: `NG-ALLN-016` / `N17`（`REGISTERED_STRUCTURAL_HOSTS = []` 保持；本 Feature 新增状态栏 chip / 分隔条**不在流内**）；`ADR-V5-007 §1`（产品侧**无宽度切换控件 / 无拖动手柄** ⇒ 无流内固定容器）。

**动作**:
1. `test/host-registry.test.ts`：**反向判据** —— `REGISTERED_STRUCTURAL_HOSTS === []` ∧ 任意深度零 `[data-host]` ∧ `#auth-state` / 管理详情 / 分隔条**均不在 `#stream` 子树**。
2. 反证：向 `#stream` 注入 `li[data-host="x"]` ⇒ FAIL（逐字节还原 ⇒ PASS）。
3. `test/gate-integrity.test.ts`：追加（只追加）。

**产出**: `test/host-registry.test.ts`（零宿主反向判据）+ 反证留证。

**验收标准（可机核）**:
- [ ] `REGISTERED_STRUCTURAL_HOSTS.length === 0` ∧ `#stream` 子树 `[data-host]` 计数 **== 0**（任意深度）
- [ ] `#auth-state` / 管理详情 / 分隔条**不在** `#stream` 子树（逐项断言）
- [ ] 反证：注入 `li[data-host]` ⇒ FAIL → 逐字节还原 ⇒ PASS

**红线检查点**: 冻界面 `F1`（零宿主）；阈值面 `T-a`（`DENSITY_EXCLUDED_SUBTREES` 单源零 diff）；契约面 `C-7`；台账面 `L-a`（只读）。

**验证命令**:
```bash
npm test --workspace @lgdl/web-cli-plugin -- host-registry 2>&1 | tee /tmp/opencode/v5-gate-logs/w15-host-registry.log
```

---

### TASK-V5-163（V53-11）: `index.html` —— `#auth-state` **净新增**（`#risk-chips` 之前）+ 管理详情 DOM
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-162 |
| **执行波次** | 4（区间 D，**原子区间**首） |
| **对应 FR / AC** | FR-ALLN-085 / 088 / 092 · **AC-ALLN-012 / 015** |
| **ADR / 风险** | ADR-V5-006 §1 / §3 · **R-ALLN-007** · R-V5-105 |
| **并行度** | W4 首位（`164` / `165` / `166` 依赖） |

**输入**: `ADR-V5-006 §1`（在 `#region-statusbar` 内、`#risk-chips` **之前**插入 `#auth-state`（**净新增**；`body`-direct 祖先链，**不进 `#stream`**，守 `N17` 零宿主）；§3（绿态点击 ⇒ 展开**管理详情**（按需面、**默认折叠** `data-density-exempt`），含 `op.revoke` 与 `op.rebind` 入口）。

**动作**:
1. `index.html`：`#region-statusbar` 内、`#risk-chips` **之前**插入 `#auth-state`（净新增）。
2. 布局：`#auth-state` 与 `#risk-chips` **同行 `flex-wrap`**（尽量**不新增行** ⇒ 保 journey 保护段）。
3. 管理详情容器：默认折叠（`hidden` + `data-density-exempt`），含 `op.revoke` / `op.rebind` 入口（**流外**）。
4. `#risk-chips` 本体与 J1~J4 结构**零改**。

**产出**: `index.html`（`#auth-state` + 管理详情 DOM）。

**验收标准（可机核）**:
- [ ] `#auth-state` 为 `#region-statusbar` 后代 ∧ 位于 `#risk-chips` **之前** ∧ **不在 `#stream`** 子树
- [ ] `#auth-state` 与 `#risk-chips` **同行**（同一 flex 行；`flex-wrap` 生效）
- [ ] 管理详情默认可折叠（`hidden`）∧ 含两入口（`op.revoke` / `op.rebind`）
- [ ] `#risk-chips` 本体零改 ∧ J1~J4 相关 id 零改

**红线检查点**: 冻界面 `F1`（零宿主；12 kind 零扩展）；阈值面 `T-a`（管理详情默认折叠 ⇒ **不计默认密度**）；契约面 `C-7`；台账面 `L-a`（登记授权态下移条目）。

**验证命令**:
```bash
node -e "const h=require('fs').readFileSync('packages/web-cli-plugin/src/ui/sidepanel/index.html','utf8');const a=h.indexOf('id=\"auth-state\"'),r=h.indexOf('id=\"risk-chips\"');if(a<0||r<0||a>r)throw new Error('#auth-state must precede #risk-chips');console.log('#auth-state: net-new ok')"
```

---

### TASK-V5-164（V53-12）: `statusbar.ts` —— 两态**恒显其一**；仍是**唯一写入者**
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V5-163 |
| **执行波次** | 4（区间 D） |
| **对应 FR / AC** | FR-ALLN-085 / 092 · **AC-ALLN-012 / 015** |
| **ADR / 风险** | ADR-V5-006 §1 · R-ALLN-007 · **R-V5-105** |
| **并行度** | W4 串行 |

**输入**: `ADR-V5-006 §1`（`statusbar.ts` **仍是状态栏唯一写入者**：`render(view, opts)` 增写 `#auth-state` 的 `data-auth="yellow"|"green"` + 文案 + `aria-label`；状态 ≡ `ctxOf(scene).site.authorized`；两态**逐字**：黄 `未授权 · 零注入` / 绿 `已授权 · supported`；**两态恒显其一**（**永不 `hidden`**））；现状 `statusbar.ts:1-70`（J1 永不折叠 / J2 有风险才显 chips / J3 祖先无折叠 / J4 视图切换不触碰）。

**动作**:
1. `statusbar.ts` 增写 `#auth-state`（两态 + `data-auth` + `aria-label`）；状态源 = `ctxOf(scene).site.authorized`。
2. **两态恒显其一**（永不 `hidden`）；两态文案**逐字**。
3. **J1~J4 逐条不破**；`#region-statusbar` 本体永不带 `hidden`；`#risk-chips` 有风险时无 `hidden`（J2 语义不变）。
4. 反证：让 `#auth-state` 在零风险时 `hidden` ⇒ FAIL（违「状态不是风险」）。

**产出**: `statusbar.ts`（两态写入）+ J1~J4 断言。

**验收标准（可机核）**:
- [ ] `#auth-state` 常显（**永不 `hidden`**）∧ 两态文案逐字命中（`未授权 · 零注入` / `已授权 · supported`）
- [ ] `data-auth` ∈ `{'yellow','green'}`；场景默认值 S1/S2/S5/S6 = 黄、S3/S4/S7 = 绿（可判 7 场景）
- [ ] 状态 ≡ `ctxOf(scene).site.authorized`（同源断言）
- [ ] J1~J4 逐条绿 ∧ `#region-statusbar` 本体永不带 `hidden` ∧ `#risk-chips` 语义不变
- [ ] 反证：零风险时 `#auth-state` 被 `hidden` ⇒ FAIL

**红线检查点**: 冻界面 `F1` / `F2`；阈值面 `T-a`（6 ≤ 7）/ `T-b`（**保 ≥0.65**）；契约面 `C-7`（唯一写入者）；台账面 `L-a`（只读）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
npm run test:l0 --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w16-statusbar-authstate.log   # 串行
```

---

### TASK-V5-165（V53-13）: **零双写五条** —— `view-model` 去授权态 + `risk-rail` 拆分 + L2 站点行指向
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V5-164 |
| **执行波次** | 4（区间 D） |
| **对应 FR / AC** | FR-ALLN-086 / 092 · **AC-ALLN-012** · **N23** |
| **ADR / 风险** | ADR-V5-006 §2 · **R-ALLN-007 / 907** · **R-V5-105** |
| **并行度** | W4 串行 |

**输入**: `ADR-V5-006 §2` 零双写五条（① `toolbarDigest` 去掉 `auth` 段（只留 `site · session`）；② 四词「未授权 / 已授权 / 零注入 / supported」在**工具栏区零出现**（`band.statusText` 去掉 `已授权/未授权`，保留 `发现=…`；`band.llm` / `policy` 不动）；③ `RISK_CLASSES` 拆为 `RAIL_RISK_CLASSES = ['probing','hardline','confirm','staleRef']`（4）+ 新增 `AUTH_STATES` 单源（`unauthorized` **不再进 `#risk-chips`**）；④ 状态栏第一行 `L2_BAR_TEXT = '状态：按需视图 · 点开看计数'` **已无**授权态 ⇒ 只需断言钉死；⑤ L2 树视图站点行改指向「状态见状态栏授权 chip」（**台账不复制状态**））。

**动作**:
1. `view-model.ts`：`toolbarDigest` 去 `auth` 段；`band.statusText` 去授权态词（保留其余）。
2. `l0/risk-rail.ts`：`RAIL_RISK_CLASSES`（4）+ `AUTH_STATES` 拆分；rail 授权类**零残留**。
3. L2 站点行改指向 chip（**不复制状态值**）。
4. **四词扫描范围** = `#region-toolbar` 子树 ∪ `#statusbar-text` ∪ `#risk-chips` ∪ rail 容器；唯一命中 = `#auth-state`。
5. 反证：任一处重新出现授权态 ⇒ FAIL。

**产出**: `view-model.ts` / `risk-rail.ts` / L2 站点行改写 + 四词扫描断言 + 反证留证。

**验收标准（可机核）**:
- [ ] ① `toolbarDigest` 只含 `origin · 会话`（无 `auth` 段）② 四词在工具栏区**零出现** ③ `RAIL_RISK_CLASSES.length === 4` ∧ `unauthorized` 不在 rail ④ 状态栏第一行零授权态 ⑤ L2 站点行**指向 chip**（不复制值）
- [ ] 四词扫描：**唯一命中 = `#auth-state`**
- [ ] 反证：工具栏 / rail / 第一行任一处重现已授权态 ⇒ FAIL

**红线检查点**: 冻界面 `F2`；阈值面 `T-a`（默认可点 6 ≤ 7；`unauthorized` 子场景**总可点数不变**）/ `T-b`；契约面 `C-7`；台账面 `L-a`（登记零双写条目）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
npm run test:l0 --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w16-zero-double-write.log   # 串行
```

---

### TASK-V5-166（V53-14）: 黄 / 绿 chip 点击行为（黄 → 流内产 next；绿 → 管理详情）+ **四词扫描**断言
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-165 |
| **执行波次** | 4（区间 D 末位） |
| **对应 FR / AC** | FR-ALLN-087 / 088 · **AC-ALLN-012** |
| **ADR / 风险** | ADR-V5-006 §3 · **NG-ALLN-019**（不得跳转设置页） |
| **并行度** | W4 末位 |

**输入**: `ADR-V5-006 §3`（**黄态点击** → 流内产出「授权当前站点」next 卡（`data-op="op.authorize"`，P0 恢复）+ 追加一条系统事件行；**不跳走、不换面板**；**绿态点击** → 展开**管理详情**（按需面、默认折叠 `data-density-exempt`）；**不跳走**；展开后默认屏读数仍 ≤7）。

**动作**:
1. 黄 chip 点击 ⇒ `#stream` 新增 next 卡（含 `data-op="op.authorize"`）+ 一条系统行；**视图 / 面板零切换**。
2. 绿 chip 点击 ⇒ 展开管理详情（默认折叠 ⇒ 展开才显）；展开后默认屏读数 ≤7；键盘可达。
3. 反证：① 点击只切视图 ⇒ FAIL（`NG-ALLN-019`）；② 点击跳设置页 ⇒ FAIL。
4. 四词扫描断言（`165` 落地）在本任务复核。

**产出**: `sidepanel.ts`（黄 / 绿点击接线）+ 零跳转断言 + 展开密度断言。

**验收标准（可机核）**:
- [ ] 黄点击 ⇒ `#stream` 新增含 `data-op="op.authorize"` 的 next 卡 + 系统行 ∧ **面板 / 视图零切换**
- [ ] 绿点击 ⇒ 管理详情展开 ∧ 默认折叠（`data-density-exempt`）∧ 展开后默认屏 ≤7 ∧ 键盘可达
- [ ] 反证两条实跑 ⇒ FAIL → 还原 PASS
- [ ] 四词扫描唯一命中 = `#auth-state`

**红线检查点**: 冻界面 `F1` / `F2` / `F3`；阈值面 `T-a`（6 ≤ 7 / 展开 ≤7）/ `T-b`；契约面 `C-4`（next 卡带 `data-op`）/ `C-7`；台账面 `L-a`（只读）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
npm run test:l0 --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w16-auth-chip-click.log   # 串行
```

---

### TASK-V5-167（V53-15）: `ResizeObserver` → `data-narrow`（360/361）+ 窄屏样式块
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-166 |
| **执行波次** | 5（区间 E） |
| **对应 FR / AC** | FR-ALLN-090 / 114（X5）· AC-ALLN-013 · EC-ALLN-014 / 015 |
| **ADR / 风险** | ADR-V5-007 §1 · **R-V5-106**（`matchMedia` 误判）/ R-ALLN-908 |
| **并行度** | W5 首位（`168` / `169` 依赖） |

**输入**: `ADR-V5-007 §1`（`ResizeObserver` 监听 `#panel` **实际宽度** ⇒ `panel[data-narrow]`：**≤360 → `"true"`** / **≥361 → `"false"`**（边界 360/361 逐值断言）；窄屏样式（照 G 稿仅样式层）：`[data-narrow="true"] .view-btn .view-label { display:none }`；`.site-summary .site-origin { max-width:96px }`；`.site-summary .site-session { display:none }`；320px 零水平溢出 + Tab 序 / `:focus-visible` 不退化）。

**动作**:
1. `ResizeObserver` 观测 **`#panel` 实际宽度**（**不得**用 `matchMedia` 看视口）。
2. `data-narrow` 置值：360 → `"true"` / 361 → `"false"`（**双值断言**）。
3. 窄屏样式块（仅样式层，复用既有窄屏样式语言 ⇒ `ADR-V5-011 §3` 减体积优先级 4：**不新建样式语言**）。
4. 反证（`R-V5-106`）：**宽视口 + 窄面板** ⇒ `data-narrow === true`（若用 `matchMedia` 则该反证必红）。
5. 320px 零水平溢出 + `:focus-visible` 不退化。

**产出**: `sidepanel.ts`（`ResizeObserver`）+ 样式块 + 双值断言 + 反证留证。

**验收标准（可机核）**:
- [ ] 宽度 **360 ⇒ `data-narrow === "true"`** ∧ **361 ⇒ `"false"`**（双值断言）
- [ ] 反证：宽视口 + 窄面板 ⇒ `data-narrow === true`（`matchMedia` 实现必红）
- [ ] 320px 无水平溢出 ∧ Tab 序 / `:focus-visible` 不退化
- [ ] 样式块复用既有窄屏样式语言（无新样式依赖）

**红线检查点**: 冻界面 `F1`（零宿主；样式层不动 DOM）；阈值面 `T-a`（`registeredCells` 不删格）/ `T-b`（**0.65 不下调**）；契约面 `C-7`；台账面 `L-a`（只读）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
node -e "const s=require('fs').readFileSync('packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts','utf8');if(/matchMedia/.test(s)&&/data-narrow/.test(s))throw new Error('data-narrow must use ResizeObserver, not matchMedia');if(!/ResizeObserver/.test(s))throw new Error('ResizeObserver missing');console.log('data-narrow: ResizeObserver ok')"
```

---

### TASK-V5-168（V53-16）: 三档 radio **零残留** + 「产品侧零宽度切换控件」+ **R-V5-106 反证**
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-167 |
| **执行波次** | 5（区间 E） |
| **对应 FR / AC** | FR-ALLN-089（设计稿契约侧）/ 090 / 114 · AC-ALLN-013 |
| **ADR / 风险** | ADR-V5-007 §1 / §3 · **R-V5-106 / 908** · **NG-ALLN-019** |
| **并行度** | W5 串行 |

**输入**: `ADR-V5-007 §1`（**产品侧本就零 radio**（`grep` 实测 0 命中）⇒ 判据 =「**产品侧零宽度切换控件**」扫描（新增断言））；§3（**诚实登记**：280–640 / ARIA `separator` / 键盘 / clamp / 双击复位 / rAF 合并 = **G 稿契约**（`design-contract` 门禁冻结 127 断言），产品侧**不实现拖动手柄**；必须在收口文档 / `knownLimitations` 邻域**显式登记**）。

**动作**:
1. 新增断言：「产品侧零宽度切换控件」（`src/ui/sidepanel/**` 零 `data-width` / 零三档 `radio` / 零 `WIDTH_MIN` / 零拖动手柄）。
2. 反证：注入一个三档 `radio` ⇒ FAIL；注入 `matchMedia` 版 `data-narrow` ⇒ FAIL（`R-V5-106`）。
3. **诚实登记**：产品侧宽度由 Chrome 控制；G 稿拖动手柄为设计演示，产品侧承接的是 `data-narrow` 兜底与密度口径解耦（落 `knownLimitations` 邻域 + 收口文档）。
4. G 契约侧由 `design-contract`（v5-1 `118` 已入册）保证 127 断言 ⇒ 本任务只做**对账**（不重登）。

**产出**: 三档 radio 零残留断言 + 两条反证 + 诚实登记文本。

**验收标准（可机核）**:
- [ ] 产品侧零宽度切换控件（5 项扫描逐项零命中）
- [ ] 反证两条：注入三档 radio ⇒ FAIL；`matchMedia` 版 ⇒ FAIL（逐字节还原 ⇒ PASS）
- [ ] 诚实登记存在（「产品侧无拖动」+「设计稿契约侧归属」）∧ 与 G 契约对账一致
- [ ] `test:ui`（journey）/ `l0` / `density` **计数 ≥ 基线**

**红线检查点**: 冻界面 `F1`（`design/**` 零改动；G 契约 `C-5`）；阈值面 `T-a`；契约面 `C-5`（不重登 G）；台账面 `L-a`（只读）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
git diff --quiet -- packages/web-cli-plugin/design && echo 'design/: zero-diff ok'
npm run test:ui --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w17-no-width-control.log   # 串行
```

---

### TASK-V5-169（V53-17）: `test/ui/l0.mjs`（244）/ `density.mjs`（232）等价重锚
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-168 |
| **执行波次** | 5（区间 E 末位） |
| **对应 FR / AC** | FR-ALLN-091 / 092 / 120 · AC-ALLN-012 / 014 / 015 / 020 |
| **ADR / 风险** | ADR-V5-006 / 007 · R-ALLN-009 / 013 |
| **并行度** | W5 末位（W6 前置） |

**输入**: `FR-ALLN-120` ①⑫⑬⑭（`test/ui/l0.mjs`（244）/ `density.mjs`（232）/ `journey.mjs`（171）等价重锚）；`ADR-V5-006 §4`（工具栏可点 5 + `#auth-state` 1 = **6 ≤ 7**；S6 = 5 + 1（auth）+ 1（rail 风险）= **7 ≤ 7**；`unauthorized` 子场景**总可点数不变**）。

**动作**（**逐点判定，禁按名批量替换**）:
1. `l0.mjs`（244）：`:71-83` 零宿主结构判据保留 + **`#auth-state` 两态 + 零双写四词扫描 + J1~J4** 断言（**增**）；计数 ≥244。
2. `density.mjs`（232）：`#auth-state` **计入默认可点**（6 ≤ 7）+ `data-narrow` 边界（360/361）+ 逐格留痕；计数 ≥232。
3. 每处改写登记 `modifiedRanges[]`；反证 ≥2 条（注入零风险时 `#auth-state` 被 `hidden` ⇒ FAIL；注入工具栏四词 ⇒ FAIL）。

**产出**: `l0.mjs` / `density.mjs` 等价重锚 + `modifiedRanges[]` + 反证留证。

**验收标准（可机核）**:
- [ ] `test:l0 ≥244` ∧ `test:density ≥232`（**只增**）
- [ ] 「默认可点 6 ≤ 7」∧「S6 = 7 ≤ 7」∧「`unauthorized` 子场景总可点数不变」三条读数存在
- [ ] 四词扫描 + J1~J4 断言在位
- [ ] 反证 ≥2 条实跑 ⇒ FAIL → 逐字节还原 ⇒ PASS

**红线检查点**: 冻界面 `F1` / `F2`；阈值面 `T-a`（**逐字不动**）/ `T-b`；契约面 `C-7`；台账面 `L-a`（`modifiedRanges[]` 登记）。

**验证命令**:
```bash
npm run test:l0 --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w17-l0-remap.log       # 串行
npm run test:density --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w17-density-remap.log   # 串行
```

---

### TASK-V5-170（V53-18）: `test/density-thresholds.test.ts` —— 阈值逐字 + `data-narrow` 边界 + 单源声明
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-169 |
| **执行波次** | 6（区间 F） |
| **对应 FR / AC** | FR-ALLN-091 / 114（X5）· **AC-ALLN-014** |
| **ADR / 风险** | ADR-V5-007 §2 · R-ALLN-009 / 908 |
| **并行度** | W6 首位（`171` / `172` 依赖） |

**输入**: `ADR-V5-007 §2`（阈值 `default 7/15 · firstRun 9/20 · risk 17/35` **逐字不动**；豁免**只认 `hidden`**；`DENSITY_EXCLUDED_SUBTREES = ['#stream']` **单源不动**；`registeredCells: 31` 保留，**新增** `data-narrow` 边界 2 格与宽度不变性 1 组；`STREAM_HEIGHT_RATIO_MIN = 0.65` **只允许上调**）。

**动作**:
1. `density-thresholds.test.ts`：阈值 6 值**逐字**（不可数值化放宽）；豁免只认 `hidden`；`DENSITY_EXCLUDED_SUBTREES` **单源声明**（全仓唯一）。
2. `data-narrow` 边界（**360 / 361 双值**）+ 宽度不变性（宽度变化**不改变控件计数**）断言（**增**）。
3. 计数 **只增**；反证：把阈值改数值化「≥7」⇒ FAIL。

**产出**: `density-thresholds.test.ts`（阈值逐字 + 边界 + 单源）+ 增断言。

**验收标准（可机核）**:
- [ ] 阈值 `7/15 · 9/20 · 17/35` **逐字**（字面比对，非数值断言）
- [ ] `DENSITY_EXCLUDED_SUBTREES` **单源**（全仓唯一声明点）
- [ ] `data-narrow` 360/361 双值 + **宽度 → 控件计数不变**（不变性 1 组）
- [ ] `STREAM_HEIGHT_RATIO_MIN === 0.65` **未下调**

**红线检查点**: 冻界面 `F1`；阈值面 `T-a`（**逐字 + 单源**）/ `T-b`（0.65 只上调）；契约面 `C-7`；台账面 `L-b`（只读；`172` 登记）。

**验证命令**:
```bash
npm test --workspace @lgdl/web-cli-plugin -- density-thresholds 2>&1 | tee /tmp/opencode/v5-gate-logs/w18-density-thresholds.log
```

---

### TASK-V5-171（V53-19）: 密度登记格**口径解耦**（格 = 控件计数）+ 31 格**逐格留痕**
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V5-170 |
| **执行波次** | 6（区间 F） |
| **对应 FR / AC** | FR-ALLN-091 / 114（X5）· **AC-ALLN-014** · O-ALLN-007 |
| **ADR / 风险** | ADR-V5-007 §2 · R-ALLN-009 |
| **并行度** | W6 串行 |

**输入**: `ADR-V5-007 §2`（**口径 = 控件计数**（`#panel` 内非 `[hidden]` 子树的 `button/a/input/select/textarea/[tabindex≠-1]`），与视口 / 面板宽度**解耦**；**320px 仍为验收锚点**（不变量测量点，逐格断言保留）；400 / 520 档按等价口径保留或**显式重锚 + 逐格留痕**（**不删格、不改数值**，只追加「宽度 → 控件计数不变」的等价说明 + `v5Ledger`）；31 登记格（28 机对 + 3 名义）**计数只增不减**）。

**动作**:
1. 实现 / 固化「登记格 = 控件计数」口径（与宽度解耦）。
2. 31 登记格**逐格**：保留原值 + 追加等价说明（**不删格、不改数值**）。
3. `320px` 锚点：逐格断言保留；`400 / 520` 档等价重锚（或显式登记）。
4. `#auth-state` 计入默认密度后**仍 ≤7**。
5. 反证：把「宽度变化」引入格计数 ⇒ FAIL（解耦判据）。

**产出**: 密度口径解耦实现 / 判据 + 31 格逐格留痕表。

**验收标准（可机核）**:
- [ ] `registeredCells === 31` ∧ **无格被删除** ∧ 原数值**零改**
- [ ] 「宽度 → 控件计数不变」判据存在且可 FAIL
- [ ] `320px` 锚点逐格断言保留
- [ ] `#auth-state` 计入后默认读数 **≤7**
- [ ] 反证：宽度耦合 ⇒ FAIL

**红线检查点**: 冻界面 `F1`；阈值面 `T-a`（**31 格 / 阈值 / 豁免口径逐字逐格不动**）/ `T-b`；契约面 `C-7`；台账面 `L-b`（`v5Ledger` 逐格留痕）。

**验证命令**:
```bash
npm run test:density --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w18-density-decouple.log   # 串行
node -e "const d=require('./packages/web-cli-plugin/docs/v4-density-baseline.json');const n=d.registeredCells??d.v5Ledger?.registeredCells;console.log('registeredCells:',n)"
```

---

### TASK-V5-172（V53-20）: `docs/v4-density-baseline.json` `tiers` 重锚 + `v5Ledger` + **X5 取代台账条目**
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-171 |
| **执行波次** | 6（区间 F 末位） |
| **对应 FR / AC** | FR-ALLN-114（X5）/ 116 / 120 · **AC-ALLN-014 / 018** |
| **ADR / 风险** | ADR-V5-007 / 012 · R-ALLN-009 / 010 |
| **并行度** | W6 末位 |

**输入**: `X5` 台账落点（`docs/v4-density-baseline.json` 新台账（前后值 / 日期 / 来源 / 理由 / 历史保留）+ `tiers` 重锚留痕；`modifiedRanges[]`）；`ADR-V5-007 §2`（**不删格、不改数值**，只追加）；`riskIncrementRegistry` 4 溯源字段 `rulingId`·`rulingDate`·`approvedBy`·`reason`（**缺一 FAIL**）。

**动作**:
1. `docs/v4-density-baseline.json`：`tiers` **等价重锚**（追加说明，历史值保留）+ **`v5Ledger`** 逐格留痕（31 格 + `data-narrow` 边界 2 格 + 宽度不变性 1 组）。
2. **X5 取代台账条目**：`docs/v4-supersession-ledger.json#modifiedRanges[]` 追加 X5 逐行（`{file, lines, oldId, decision:'equivalent-rewrite', reason ≥40, leaf:'v5-3'}`）。
3. `riskIncrementRegistry` 4 溯源字段齐备（缺一 FAIL）。
4. 反证：删一格 / 改一数值 ⇒ FAIL；`rulingId` 缺失 ⇒ FAIL。

**产出**: `v4-density-baseline.json`（`tiers` + `v5Ledger`）+ X5 台账条目 + 反证留证。

**验收标准（可机核）**:
- [ ] `tiers` 历史值**零删零改**（只追加说明）；`v5Ledger` 逐格留痕 ≥31
- [ ] X5 条目在 `modifiedRanges[]` ∧ 五要素齐备 ∧ `reason ≥40`
- [ ] `riskIncrementRegistry` 4 溯源字段齐备（缺一 FAIL）
- [ ] 反证：删格 / 改数值 / 缺 `rulingId` ⇒ 逐项 FAIL

**红线检查点**: 冻界面 `F1` / `F4`；阈值面 `T-a` / `T-b`；契约面 `C-5`；台账面 `L-a`（X5 条目）/ `L-b`（`tiers` + `v5Ledger`）。

**验证命令**:
```bash
npm run test:supersession --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w18-x5-ledger.log   # 串行
python3 -c "import json;d=json.load(open('packages/web-cli-plugin/docs/v4-density-baseline.json'));print('v5Ledger cells:',len(d.get('v5Ledger',{}).get('cells',[])))"
```

---

### TASK-V5-173（V53-21）: journey 保护段处置 —— **保段（首选）或第三次八步显式取代**
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V5-172 |
| **执行波次** | 7（区间 G，**单一原子区间**） |
| **对应 FR / AC** | FR-ALLN-122 / 123 / 120 · **AC-ALLN-018 / 020** · **N12** |
| **ADR / 风险** | ADR-V5-012 §2 · **R-ALLN-010** · R-ALLN-015 |
| **并行度** | W7 首位（`174` / `175` / `176` 依赖） |

**输入**: `ADR-V5-012 §2`（**保段策略（首选）**：`#auth-state` 与 `#risk-chips` **同一行 `flex-wrap`** ⇒ 状态栏高度**尽量不新增行** ⇒ `#region-stream` 高度比保持 ≥0.65 ⇒ **保段**（sha `cc79f413…` + `startByte 43054` 双不变）；**若 Chromium 实测证明行高变化导致 `#15b` 越限** ⇒ 走**第三次八步显式取代**（① 记录 old ② 逐段决策 ③ 同编号等价改写 ④ 登记 `modifiedRanges[]` ⑤ 写入新 pin ⑥ **计数守恒 ≥171** ⑦ `redlineRemap[]` 追加 ⑧ RP-V4-08 反证；`supersessionChain[]` 追加**第 4 链节**）；**必须显式二选一**，不得含糊）。

**动作**:
1. Chromium 实测 `#15a`~`#15q`（含 `#15b` 高度比 ≥65%）⇒ 判定**保段成立**或**越限**。
2. **保段路径**：`protectedRanges[0]` sha `cc79f413…` ∧ `startByte 43054` ∧ 240 行**双不变**；`modifiedRanges[]` 登记**段外**改写（320 锚点 + 360/361 边界）。
3. **取代路径（若越限）**：八步逐条留痕（新 pin + `supersessionChain` 第 4 链节（`supersededFrom` 指直接前驱 `cc79f413…`）+ `redlineRemap[]` + **计数守恒 ≥171**）。
4. **RP-V4-08 反证实跑（八步第 ⑧ 步 / 保段亦跑）**：段内改 1 byte ⇒ **必红**；段外改 1 byte ⇒ 不红；逐字节还原 ⇒ PASS。
5. 收口报告**明写**「保段（sha 不变）」或「第三次取代（链节 + `redlineRemap[]`）」。

**产出**: 保护段处置结论（二选一）+ 段外 `modifiedRanges[]` + RP-V4-08 反证留证 + `supersessionChain`（若取代）。

**验收标准（可机核）**:
- [ ] **显式二选一**结论存在（保段 or 取代，**不得含糊**）
- [ ] 保段：sha `cc79f413…` ∧ `startByte 43054` ∧ 240 行**双/三不变**；取代：新 pin + 第 4 链节 + `redlineRemap[]`
- [ ] `test:journey ≥171`（计数守恒）
- [ ] RP-V4-08 实跑：段内 1 byte ⇒ FAIL；段外 1 byte ⇒ 不红；逐字节还原 ⇒ PASS
- [ ] `knownGap ↔ status` 一致性绿

**红线检查点**: 冻界面 `F1` / `F4`；阈值面 `T-b`（`STREAM_HEIGHT_RATIO_MIN = 0.65` **只上调**）；台账面 `L-a`（pin / `supersessionChain` / `modifiedRanges` / `redlineRemap`）；契约面 `C-5`（**显式二选一**）/ `C-1`–`C-7`（本任务只读复核，零触碰）。

**验证命令**:
```bash
npm run test:ui --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w19-journey-protection.log   # 串行
npm run test:supersession --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w19-journey-ledger.log   # 串行
```

---

### TASK-V5-174（V53-22）: **体积终轮**（**三叶合计**）+ 五要素 + V3-VOL-3 三值同源 + 档位闸门
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V5-173 |
| **执行波次** | 7（区间 G） |
| **对应 FR / AC** | FR-ALLN-130~134 · **AC-ALLN-022 / 023** · **N3 / N4** |
| **ADR / 风险** | ADR-V5-011 · **R-ALLN-001** / R-ALLN-910 |
| **并行度** | W7 串行 |

**输入**: `ADR-V5-011 §1`（Σ 预算 **17,600 B**；余量 **24,926 B**）；§2 越限分级预案（4 级）；`ADR-V5-012 §4`（体积五要素：各叶登记自身增量；**收口合计在 v5-3**）；`v3Vol3Closeout` 三值（`newBaselineBytes` 同源前移 / 档位 512,000 / 绝对上限 563,200）。

**动作**:
1. `npm run build` ⇒ `stat -c %s dist/sidepanel.js`；metafile **逐模块 Δ 归因**（`Σ 逐模块 Δ + 未归因 == 登记增量`）。
2. **三叶合计**登记：`test/size-baseline.ts` 五要素（`previousBaselineBytes` → `newBaselineBytes` / 日期 / 来源 / 理由）+ `_TIMELINE` **只追加** + `SIDEPANEL_GROWTH_BREAKDOWN` 三叶条目 + `SIDEPANEL_RE_REGISTRATIONS`。
3. **V3-VOL-3 三值同源**：`v3Vol3Closeout`（`newBaselineBytes` 同源前移）∧ 档位 **512,000 不变** ∧ 绝对上限 **563,200 不变**；`authorConfirmation.status === 'pending-author-line'`（**不得伪称已确认**）。
4. **档位闸门**：`ceilTo50KB(newBaseline) === 512_000 ⟺ 460,801 ≤ newBaseline ≤ 512,000`（**档位不下移**）；越限按 §2 分级处置；越 563,200 ⇒ **停机上报**。
5. `SIDEPANEL_CEILING_CAP === 'record-only'`（**不设自缚装置**）。

**产出**: 体积终轮（三叶合计）五要素 + metafile 归因 + 三值同源 + 档位闸门读数。

**验收标准（可机核）**:
- [ ] 五要素齐备 + `Σ 逐模块 Δ + 未归因 == 登记增量`（算术可复算）
- [ ] `v3Vol3Closeout` 三值同源 ∧ 档位 512,000 / 绝对上限 563,200 **不变**
- [ ] `SIDEPANEL_CEILING_CAP === 'record-only'` ∧ `authorConfirmation.status === 'pending-author-line'`（**未被伪称**）
- [ ] 档位闸门算术成立（不下移）；若越限分级处置条目存在
- [ ] `test:size-ruling-vol3 ≥12` ∧ 红线逐字节（`content.js` / `pick-layer.js`）

**红线检查点**: 冻界面 `F2`（红线逐字节）；阈值面 `T-c`（**上限公式 / cap / 档位 / 绝对上限 / authorConfirmation**）；台账面 `L-a`（`v3Vol3Closeout`）/ `L-c`（五要素 + `_TIMELINE` + `_HISTORY`）；契约面 `C-1`–`C-7`（本任务只读复核，零触碰）。

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-plugin
stat -c %s packages/web-cli-plugin/dist/content.js packages/web-cli-plugin/dist/pick-layer.js packages/web-cli-plugin/dist/sidepanel.js
npm run test:size-budget --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w19-size-budget.log
npm run test:size-ruling-vol3 --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w19-size-ruling-vol3.log
```

---

### TASK-V5-175（V53-23）: `test/supersession-ledger.test.ts` 台账一致性（X5 + `designContractChanges` + `knownGap`）+ `gate-integrity` 收口
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-174 |
| **执行波次** | 7（区间 G） |
| **对应 FR / AC** | FR-ALLN-123 / 116 / 121 / 125 · **AC-ALLN-017 / 018 / 021** |
| **ADR / 风险** | ADR-V5-012 §4 / §5 · R-ALLN-013 · **R-V5-110** |
| **并行度** | W7 串行 |

**输入**: `ADR-V5-012 §4`（四类共享面「**恰一次**」登记：体积 / `design-contract` / journey / 取代台账 ⇒ **禁止两叶各改一次同一条目**）；`FR-ALLN-123`（`status ↔ knownGap` 一致性：`status = 'complete-steps-1-8'` ⇒ 该字段为空或仅声明闭环）；`FR-ALLN-125`（新门禁全部入 `test:gate-integrity` 受审集合）。

**动作**:
1. `test/supersession-ledger.test.ts`：**X5 条目** + **`designContractChanges` 对账**（v5-1 已登 G 条目 ⇒ 本叶**只对账不重登**）+ `knownGap ↔ status` 一致性 + 保护段处置（与 `173` 结论一致）。
2. **共享面「恰一次」对账**：体积（`174`）/ `design-contract`（v5-1 `118`/`119`）/ journey（`173`）/ 取代台账（v5-1 X3·X4·X6-chip + v5-2 X1·X2 + v5-3 X5）—— 逐项确认**无重复登记**。
3. `test/gate-integrity.test.ts`**收口**：8 个新门禁**逐项**在受审集合内（`no-dead-end` / `law8-plaintext` / `next-registry` / `next-obligation-table` / `next-dispatch-diff0` / `op-wiring` / `sw-op-mirror` / `op-protocol`）；任一未纳入 ⇒ FAIL。
4. 反证：删一条 X5 条目 ⇒ FAIL；新门禁移出受审集合 ⇒ FAIL。

**产出**: `supersession-ledger.test.ts`（X5 + 对账 + `knownGap`）+ 共享面恰一次对账表 + `gate-integrity` 收口证据。

**验收标准（可机核）**:
- [ ] `test:supersession ≥35`；X5 条目可核；`designContractChanges` **未被二次登记**
- [ ] `status ↔ knownGap` 一致性绿
- [ ] `test:gate-integrity ≥13` ∧ **8 个新门禁逐项在受审集合内**
- [ ] 共享面「恰一次」对账表（4 类 × 登记叶）无重复项
- [ ] 反证两条实跑 ⇒ FAIL → 逐字节还原 ⇒ PASS

**红线检查点**: 冻界面 `F1` / `F4`；阈值面 `T-c`；契约面 `C-5`；台账面 `L-a`（全字段）/ `L-b` / `L-c`。

**验证命令**:
```bash
npm run test:supersession --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w19-supersession-final.log   # 串行
npm run test:gate-integrity --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w19-gate-integrity-final.log   # 串行
```

---

### TASK-V5-176（V53-24）: 收尾 —— 全门禁串行 + `e2e` 汇总 + 人工面清单逐项 + 计数只增对账
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V5-175 |
| **执行波次** | 7（区间 G 末位） |
| **对应 FR / AC** | FR-ALLN-003 / 004 / 120 / 121 / 124 / 125 · **AC-ALLN-019 / 020 / 021 / 024 / 025** |
| **ADR / 风险** | ADR-V5-012 §5 · R-ALLN-013 / 015 · **R-V5-110** |
| **并行度** | W7 末位（**本 Feature 收口**，不可并行） |

**输入**: 父 `tasks.md §6`（24 门禁守恒总表 + 8 新门禁）；父 `tasks.md §7`（停机规则 9 条）；`AC-ALLN-024`（人工面逐项标注：浏览器原生权限弹窗体感 / 授权 chip 两态观感 / 拖动宽度体感与性能 / 绿态管理详情手感 / 双主题 / 320px / 键盘 / 读屏（掩码输入 + chip）/ 真机 S2 断流走查）。

**动作**:
1. **全门禁串行复跑**（`test` / `test:ui` / `test:binding` **绝不并发**；一次一个 Chromium；`finally` 自清 profile）；日志 `tee` 全量落盘（禁截断）。
2. 计数只增对账：逐门禁「基线 → 实测」（**24 项**）；任一门禁 < 基线（除保护段显式取代且已留痕）⇒ **停机**。
3. **`e2e` 汇总**：`e2e = PASS` + `npm test ≥1045`；3 叶收尾均绿（`AC-ALLN-025`）。
4. **人工面清单逐项标注**：9 项逐项 `⏳ 未执行` 或 `PASS`（**不得冒充 PASS**）。
5. 反证留证完整性核对：每条改动 / 新增判据有「注入 FAIL → 逐字节还原 PASS」两段证据；**无「不再 FAIL 的判据」**。
6. `KL-N-10` / `test:ui #54g`：隔离复跑 ≥2、日志全量、仍红**如实登记不阻塞收口**。
7. `state.json`（本叶 + 父）→ `phase:'tasked'`；`TREE.md` 更新；`git add` **path-limited**。

**产出**: 全门禁串行日志 + 24 项计数对账表 + `e2e` 汇总 + 人工面清单（9 项逐项）+ 反证留证清单 + `state.json` / `TREE.md` 更新。

**验收标准（可机核）**:
- [ ] 全门禁串行复跑**全绿**（日志全量落盘，无截断）
- [ ] 24 项计数 **≥ 基线**（`npm test ≥1045` / `l0 ≥244` / `density ≥232` / `journey ≥171` / `stream ≥63` / `ask-auth ≥61` / `recommendation ≥59` / `binding ≥192` / `insight ≥116` / `page-input ≥108` / `ref-pick-wiring ≥11` / `design-contract ≥13` / `supersession ≥35` / `gate-integrity ≥13` / `zero-injection ≥27` / `size-ruling-vol3 ≥12` / `l1 ≥116` / `l2 ≥74` / `hardening ≥24` / `l1-reverse ≥9` / `l2-reverse ≥10` / `e2e = PASS`）
- [ ] 人工面 **9 项**逐项标注（`⏳` / `PASS`，**不得冒充**）
- [ ] 反证留证齐备；**无「不再 FAIL 的判据」**
- [ ] 共享面「恰一次」登记确认（体积 / `design-contract` / journey / 取代台账）
- [ ] `git status --short` 仅含本 Feature 目录 + 预期实施面

**红线检查点**: 冻界面 `F1`–`F5`（逐项）；阈值面 `T-a`–`T-e`（逐项）；台账面 `L-a`–`L-c`；契约面 `C-1`–`C-7`。

**验证命令**:
```bash
mkdir -p /tmp/opencode/v5-gate-logs
npm test --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w19-v53-node-all.log
npm run test:ui --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w19-v53-ui-all.log        # 串行
npm run test:binding --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w19-v53-binding.log  # 串行
npm run test:e2e --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w19-v53-e2e.log         # 串行
git status --short
```

---

## 3. 任务汇总

| 统计项 | 数值 |
|--------|:--:|
| 总任务数 | **24** |
| S 级（简单） | 1（`153`） |
| M 级（中等） | 14（`155`–`158` / `161` / `162` / `163` / `166`–`170` / `172` / `175`） |
| L 级（复杂） | 9（`154` / `159` / `160` / `164` / `165` / `171` / `173` / `174` / `176`） |
| 执行波次 | **7** |
| spikeGate | **1**（`153`，SG-4） |
| 提交区间 | 7（A–G；**D / G 为原子区间**） |
| 体积预算（本叶） | 逐项 3,000 B + 胶水 250 = **3,250 B**；**收口承担三叶合计 17,600 B 登记** |
| 新增门禁 | 2（`no-dead-end` / `law8-plaintext`）+ `gate-integrity` 受审收口（8 新门禁逐项） |
| 人工面 | 9 项（逐项 `⏳` / `PASS`） |

## 4. 执行策略

| 波次 | 任务 | 策略 |
|:--:|------|------|
| 1 | `153`–`155` | **半并行**：`153`（SG-4 只读探针）∥ `154`；`155` 依赖 `154`（同文件 `law8-plaintext.mjs`） |
| 2 | `156`–`158` | **串行**（`stream-model` → `cards/error` → `stream.mjs`） |
| 3 | `159`–`162` | **半并行**：`159 → 160 → 161` 串行；`162` ∥（`host-registry.test.ts` 文件不相交） |
| 4 | `163`–`166` | **串行**（**原子区间 D**：终态状态栏 DOM 与零双写 / 点击行为互为依据） |
| 5 | `167`–`169` | **串行**（`167 → 168 → 169`） |
| 6 | `170`–`172` | **串行**（`170 → 171 → 172`） |
| 7 | `173`–`176` | **串行**（**原子区间 G**：journey / 体积 / 台账 / 全门禁互为依据，不得中间单独提交） |

**波内门禁纪律**：`test` / `test:ui` / `test:binding` **绝不并发**；日志落 `/tmp/opencode/v5-gate-logs/`。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V5-3 末叶 / 收口叶 24 原子任务 / 7 波 / 7 提交区间（**D / G 为原子区间**）：W1 **spikeGate-4**（5 类阻塞 headless 驱动 seam）+ `law8-plaintext.mjs` 四面机核（② digest 含 `••••••`；③ 审计渲染 + 存储**两面**；④ **全部元素属性**逐项 + 提交后 `value` 清空）+ 四类注入反证 → W2 `error` **出生铸造**恢复区（`BORN_FROZEN_KINDS` 不动）→ W3 死端守护门禁（5 类逐类 + `nextOf` 双形态 + **死端 = 0** + S2 主验收消费 v5-2 样本 + 双向注入）+ `host-registry` 零宿主反向判据 → W4 `#auth-state` 净新增 + 两态恒显其一 + **零双写五条** + 黄 / 绿点击（**不跳走**）→ W5 `ResizeObserver` → `data-narrow`（360/361）+ 三档 radio 零残留（**诚实登记「产品侧无拖动」**）→ W6 密度登记格**口径解耦**（格 = 控件计数，320 锚点，31 格**逐格留痕不删格**）+ X5 台账 → W7 **共享面收口**（journey **保段首选 / 必要时第三次八步** + 体积**三叶合计**终轮 + V3-VOL-3 三值同源 + 台账一致性 + 全门禁串行 + `e2e` + **人工面 9 项逐项标注**）。**本轮只做 tasks**：零 `src`/`test`/`dist`/`docs`/`design`/ROADMAP 改动；未跑门禁 / 构建 / Chromium。 | 2026-09-22 | SDDU Tasks Agent |
