# ADR-V5-006: 授权 chip（状态栏常显两态）+ 零双写五条

## 状态
ACCEPTED

## 背景

作者 ⑧ 反馈逐字：「『未授权 · 零注入』『已授权 · supported』这两项如果属于状态，那就放到最下面的状态栏，上面属于工具、菜单栏，不应该放这两个。」

现状 = 授权态**三处投影、零处常显可点**（本轮只读复核）：

| # | 位置 | 证据 |
|---|---|---|
| 1 | 工具栏摘要 `toolbarDigest` = `site · auth · session`（含「已授权/未授权」） | `view-model.ts:824`；`band.statusText` = `站点 … · ${'已授权'\|'未授权'}`（`:900`） |
| 2 | 风险 rail 条件性 `unauthorized` chip | `l0/risk-rail.ts:29-40`（`RISK_CLASSES` 5 类含 `unauthorized`） |
| 3 | 首装推荐卡（**仅 firstRun**） | `recommend.ts:296-307`（R1 根因） |

且授权入口**只在首装态** ⇒ 非首装未授权会话 = 死端（真机 S2）。`statusbar.ts:1-70` 现为**单一写入者**（J1 永不折叠 / J2 有风险才显 chips / J3 祖先无折叠 / J4 视图切换不触碰）。FR-ALLN-085~088 / 092 要求 `#auth-state` 状态栏常显两态 = 授权态**唯一常显载体**，零双写五条，且默认可点 **6 ≤ 7** 不破。

## 选项

| 选项 | 形态 | 优点 | 缺点 |
|---|---|---|---|
| **A `#auth-state` 作为 `#region-statusbar` 的净新增兄弟节点 + 授权态从工具栏/rail 退出**（选） | 状态归状态栏；`statusbar.ts` 仍为唯一写入者；rail 授权类并入 | 零双写可机核；J1~J4 保持；G 稿 §M 口径 | 状态栏高度可能 +18px（触及 journey 保护段，见 ADR-V5-012） |
| B 复用 `#risk-chips` 承载授权 chip | 零新 DOM | 与 J2「有风险才显 chips」冲突：零风险时授权 chip 会被 `hidden` ⇒ 违「两态恒显其一」；且把「状态」混成「风险」（LNG-V5-3-001） |
| C 保留工具栏摘要为授权态载体，只在状态栏**再**加一处 | 改动小 | 双写（N23 / R-ALLN-007 成真） |

## 决策

**采用 A**。四层落点：

### 1. DOM 与归属

- `src/ui/sidepanel/index.html`：在 `#region-statusbar` 内、`#risk-chips` **之前**插入 `#auth-state`（净新增；`body`-direct 祖先链，**不进 `#stream`**，守 N17 零宿主）。
- `statusbar.ts` **仍是状态栏唯一写入者**：`render(view, opts)` 增写 `#auth-state` 的 `data-auth="yellow"|"green"` + 文案 + `aria-label`；状态 ≡ `ctxOf(scene).site.authorized`（与注册表视察器同源）。
- 两态逐字：黄 `未授权 · 零注入` / 绿 `已授权 · supported`；**两态恒显其一**（永不 `hidden`）。

### 2. 零双写五条（逐条可机核）

| # | 要求 | 落点 |
|---|---|---|
| ① | 工具栏摘要只留 `origin · 会话` | `toolbarDigest` **去掉** `auth` 段（`site · session`） |
| ② | 四词「未授权 / 已授权 / 零注入 / supported」在**工具栏区零出现** | `band.statusText` 去掉 `已授权/未授权`（保留 `发现=…`）；`band.llm`/`policy` 不动 |
| ③ | 风险 rail 授权类**并入** chip，rail 只承载其余 | `RISK_CLASSES` 拆为 `RAIL_RISK_CLASSES = ['probing','hardline','confirm','staleRef']`（4）+ 新增 `AUTH_STATES` 单源；`unauthorized` 不再进 `#risk-chips` |
| ④ | 状态栏第一行只写会话 / 队列事实（不写授权态） | `L2_BAR_TEXT = '状态：按需视图 · 点开看计数'`（`view-model.ts:759`）**已无**授权态 ⇒ 只需断言钉死 |
| ⑤ | L2 树视图站点行改指向「状态见状态栏授权 chip」（**台账不复制状态**） | `l2` 站点行文案改为指向 chip（不渲染授权态值） |

- **四词扫描范围**（判据）= `#region-toolbar` 子树 ∪ `#statusbar-text` ∪ `#risk-chips` ∪ rail 容器；唯一命中 = `#auth-state`。反证：任一处重新出现授权态 ⇒ FAIL。
- **四词扫描口径（v5-3 review R1 I-01 回写；权威条文，不再只在 build.md）**：
  - 判据对象 = **授权态语义位**，不是「裸词全局禁」。语义位 = ① 机器可读位 `[data-auth]`（全 UI 恰 1 处 = `#auth-state`，工具栏区 0 处）＋ ② 状态栏两态**逐字短语**（`未授权 · 零注入` / `已授权 · supported`）。
  - `未授权 / 已授权 / 零注入` 三词按**裸词**扫描（工具栏区零出现，语义上只可能来自授权态）。
  - **`supported` 按短语扫描，不作裸词判定**：工具栏 `#status` 的 `发现=support` / `发现=supported` 是站点的**探测协议态**（连接事实，属连接状态，允许保留），与授权状态是两件事；把裸词 `supported` 全局禁会把这条无关事实误判为双写。
  - 该口径是**显式白名单式登记**（允许项被点名），不是静默放宽：`auth-chip.mjs` 同时以「`[data-auth]` 唯一 + 工具栏区零出现」的语义位判据兜底，并含**注入反证**（把 `data-auth` 塞进工具栏 ⇒ 语义位判据必红）。

### 3. 点击行为（法七：状态 → 动作）

- **黄态点击** → 流内产出「授权当前站点」next 卡（`data-op="op.authorize"`，P0 恢复）+ 追加一条系统事件行；**不跳走、不换面板**。
- **绿态点击** → 展开**管理详情**（按需面、默认折叠 `data-density-exempt`），含 `op.revoke`（撤销授权）与 `op.rebind`（重新绑定）入口；**不跳走**；展开后默认屏读数仍 ≤7。
- 管理详情**默认折叠** ⇒ 不计默认密度；`#auth-state` 本体计入默认可点。

### 4. 密度不破（6 ≤ 7）

- 工具栏可点 5 + `#auth-state` 1 = **6 ≤ 7**（S1/S2/S4）；S6 = 5 + 1（auth）+ 1（rail 风险）= **7 ≤ 7**（不破）。
- 关键等价点：`unauthorized` 风险子场景**总可点数不变**（原 = 工具栏 5 + rail 授权 chip 1 = 6；新 = 工具栏 5 + auth chip 1 = 6）⇒ `docs/v4-density-baseline.json` 的 `unauthorized` 子场景读数可**逐格保留**（只改载体），逐格留痕。

## 后果

**正面**：授权态唯一常显载体；非首装未授权会话获得常驻入口（R1 修正）；J1~J4 与 6 ≤ 7 同时成立。

**代价 / 风险**：状态栏高度可能 +18px ⇒ 直接冲击 journey 保护段（`#15b` 高度比 ≥65%）⇒ **本 ADR 要求 `#auth-state` 与 `#risk-chips` 同行 `flex-wrap` 布局**，尽量**不新增行**（`#region-stream` 高度比保 ≥0.65）；若实测仍越限，走 ADR-V5-012 的第三次八步取代。R-ALLN-007（双写面）由五条机核 + 四词扫描降为**受控**。

## 影响 FR

FR-ALLN-013 / 085 / 086 / 087 / 088 / 092；EC-ALLN-013 / 019；N7 / N17 / N23；AC-ALLN-012 / 015 / 014。

## 回滚

`#auth-state` 为净新增 ⇒ 回滚 = 删除该节点 + `statusbar.ts` 的写入分支，并把 `toolbarDigest` / `band.statusText` / `RISK_CLASSES` 还原（逐字节）。点击行为（产 next / 管理详情）删除即可。**不影响** `#risk-chips` 的 J2 语义（回滚后 rail 授权类恢复）。
