# Feature Specification：specs-tree-web-cli-plugin-v2-insight（web-cli-plugin v2「any insight」——把能力变得可见/可控）

> **文档定位**: SDDU 需求规范 — 定义功能需求、非功能需求和边界情况，作为 plan 阶段的输入
> **前置依赖**: 本仓库 **无 discovery.md**（作者已批准**从 spec 阶段直接切入**，跳过 discovery）——本规范的一手输入 = `ROADMAP.md` §二 v0.8「F-27 web-cli-plugin v2「any insight」」小节（**作者原始诉求逐字留存** + **作者五项口径裁决 2026-09-13** + 可投影面清单 + 子 Feature 拆分 V2-1~V2-4 + 交付门槛 + 风险登记 R-V2-1~5）+ 仓库实测（`packages/web-cli-plugin/src/**` 状态源逐文件核实，见 §2.5）
> **创建人**: SDDU Spec Agent
> **创建时间**: 2026-09-13
> **版本**: v2.0
> **更新人**: SDDU Spec Agent（v2.0 = **R2 需求修订轮**，编排器代作者决策，2026-09-13 授权；v1.1 由 SDDU Tasks Agent 最小订正；v1.2 由 SDDU Build Agent 最小订正）
> **更新时间**: 2026-09-13
> **更新说明**: v2.0 **R2 需求修订轮（post-validate 修订，不回退 phase）**——作者 2026-09-13 报出 v2 交付偏差，逐字反馈见 §2.2b：① 「连接树」被实现为**按维度分组的扁平列表**（非树形、不可逐层展开）② 树内命令**完全不可操作**。本版据此**显式反转**原裁决⑤ / NG-V2-001 / ADR-V2-011 的命令级部分：新增 **REV2 组 FR-V2-070~079**（真层级树 + 多归属主链 + 展开语义 + 逐层可操作 + 用户覆盖层 + 硬底线 clamp + deny 控件分层 + 偏差文案清除 + 覆盖面分列）、**AC-V2-020~027**，并对 `FR-V2-010/013/015/021/036/050/052/060/061/064`、`G-V2-002/005`、`NG-V2-001`、`AC-V2-005/012` 做**范围重定/取代标注**（历史叙述全部保留，标注「以现状为准」）。**phase 不回退**（父 tasked / 四叶 validated 原样）；反转来源与决策登记见 §2.2b / §11.4；修订记录见文末。以下为历史说明（**保留**）：v1.2 **最小订正 `FR-V2-023` 与 §2.5 的 `65.5%` 残留口径**（v1.1 只改了 `AC-V2-002` ⑤，两处仍残留 65.5%）：统一为「稳态 `clientHeight` ≥589px 主断言 + 占比 ≥65.0% 次断言」，来源/原因见两处注记与 ADR-V2-006；仅这两处数字口径，其余条文不变。v1.1 **最小订正 `AC-V2-002` ⑤**（`#log` 稳态高度口径：占比 ≥65.5% → `clientHeight` ≥589px 主断言 + 占比 ≥65.0% 次断言；原因/来源见该 AC 处注记与 ADR-V2-006；仅此一处 AC，其余条文不变）。v1.0 初始创建。**v2 立项**：作者已批准 web-cli-plugin v2（主题「any insight」，ROADMAP 登记为 F-27）= v0.8 同一版本位内第二 Feature（同批叠加）。本规范以 **4 个叶子子 Feature（V2-1~V2-4）** 承载，父 Feature 为轻量规范容器（**父 Feature 不执行 tasks/build/review/validate**——SDDU 规则）。编号采用 **FR-V2-xxx / NFR-V2-xxx / EC-V2-xxx / AC-V2-xxx 独立前缀**，与 v1（FR-001~FR-055 / NFR-001~010 / EC-001~026 / AC-001~012）**零冲突**。v1 的 `specs-tree-web-cli-plugin` 保持 `phase=validated` / `status=tracked` **原样不动、不回退、不改写**。**本规范只写需求（spec 层）**：不写技术方案（ADR 留给 @sddu-plan）、不写代码、不排任务。

---

## 1. 元数据

| 字段 | 值 |
|------|-----|
| Feature ID | specs-tree-web-cli-plugin-v2-insight（web-cli-plugin v2「any insight」，ROADMAP F-27） |
| 名称 | web-cli-plugin v2「any insight」——把插件当前对用户完全不可见的四维度连接状态与全部 CLI 命令处置档，聚合到一棵**可就地操作的悬浮连接树**里 |
| 优先级 | P0（P0 闭环 = V2-1 + V2-2 + V2-3）/ P1（V2-4） |
| 目标版本 | v0.8（**同一版本位内第二 Feature，同批叠加**，作者裁决 2026-09-13；不另占 roadmap 版本位） |
| 分支 | `feature/web-cli-plugin`（与 v1 同分支继续堆，随 v1 一起合入/发布） |
| 上游/底座 | `packages/web-cli-plugin` v1（`specs-tree-web-cli-plugin`，phase=validated / status=tracked，**只读参与、不改写**）——v2 零新权限、零注入、不碰 `packages/web-cli-base/**`、无新依赖 |
| 目录深度 | depth=1（父 Feature，轻量规范容器）；子 Feature = 4 个**叶子**（depth=2，见 §10） |
| 相关干系人 | 作者（单一维护者，本次立项人 + 五项口径裁决人）；插件使用者（需要「看得见、控得住」的终端用户）；下游 @sddu-plan / @sddu-tasks / @sddu-build / @sddu-review / @sddu-validate |

---

## 2. 上下文

### 2.1 需求之源（**作者原始诉求逐字留存，不得转述走样**）

> 出处：`ROADMAP.md` §二 v0.8「F-27」小节（v1.19.0 素材增补，2026-09-13）。以下为作者原文**逐字引文**，作为本 spec 的一手输入。

> 主题：**any insight**

> 原始痛点：总共授权的哪些网站，哪些没有授权，哪些要取消授权，总共授权了哪些浏览器的操作、哪些还没有授权，取消授权，总共有哪些 cli 命令，那些 allow、哪些 ask、哪些 delay，总共连接了哪些 llm，都全部是个黑盒，用户不可见，要求把这些所有的内容都聚合到一起。可查看，可操作，**不允许放到设置面板里面**，要操作简单，**悬浮一个连接树，所有的连接能力都放到里面**

**一句话价值主张（ROADMAP 原话）**：v1 解决「**把能力做出来**」（插件能在任意声明 web-cli 的站点上驱动业务），v2 解决「**把能力变得可见、可控**」——现在是「黑盒，用户不可见」。

**四维度**（作者诉求的显式枚举，v2 聚合对象）：

| # | 维度 | 作者原话要点 |
|---|------|-------------|
| ① | **站点授权面** | 已授权站点 / 未授权站点 / **要取消授权**的站点（取消授权须可操作） |
| ② | **浏览器操作权限面** | 哪些能力已授权、哪些未授权、**可撤销**（静态 `permissions` + `optional_permissions` + 隐私开关 + `tabs-setting`） |
| ③ | **CLI 命令全清单** | **每条命令**的处置档（作者口径 `allow` / `ask` / **`delay`** —— 作者已澄清 `delay` 就是现有 `deny` 的作者口径别名） |
| ④ | **LLM 连接面** | 总共连接了哪些 LLM（BYOK 多厂商 key-store / 多会话） |

**交互硬约束（作者原话）**：❌ **不允许放进设置面板** · ✅ **悬浮一个"连接树"**（所有连接能力都放进去）· ✅ **可查看 + 可操作**（撤销/取消授权等要在树里可执行，不只是只读展示）· ✅ **操作简单**。

### 2.2 作者五项口径裁决（2026-09-13，**下游 spec 不得重新讨论**）

> 出处：ROADMAP §二 v0.8「F-27」作者五项口径裁决。以下为**红线输入**，本规范逐条贯彻，不重开讨论。

| # | 争议点 | 作者裁决 | 本规范贯彻方式 |
|---|--------|---------|----------------|
| ① | **`delay` 的语义** | **就是 `deny`** | 命令档案按作者三档 `allow` / `ask` / `delay(=deny)` 呈现；**不新增档位、不放宽判定链**（`deny` 仍 fail-closed、`denyPriority` 不变）；文案**同一处并标**「`delay`（= `deny`，fail-closed，非可配置档位；与命令间 `delayMs` 无关）」（FR-V2-054 + AC-V2-010） |
| ② | **悬浮载体形态** | **侧栏常驻悬浮入口 + 树抽屉** | 不做页面注入悬浮层（FR-V2-020/021 + NG-V2-003）；零注入、零新权限、不加重 `content.js`（FR-V2-002 + NFR-V2-002/003） |
| ③ | **与 v1 设置面板的关系** | **连接树 = 新增独立悬浮面；设置面板保持现状** | **不推翻 v1 第 6.5 轮（TASK-033）**；树是**并列新面**（既非「塞进设置面板」、也非「取代设置面板」）；仅允许**复用实现** `src/ui/settings/{view,ops,panel,styles}.ts`（**复用实现 ≠ 放进设置面板**）（FR-V2-004 + AC-V2-008）；不改 `options.html` |
| ④ | **v2 与 v1 的合并/发布关系** | **同一 v0.8 内第二 Feature（同批叠加）** | 同分支 `feature/web-cli-plugin` 继续堆；v1 保持 `phase=validated` / `status=tracked` 不动；v2 走完整 SDDU 全流程后**同样不合 main、不发布**（合入与发布由作者执行）（FR-V2-001/005 + AC-V2-009）；**不产生 v1/v2 两次独立发布** |
| ⑤ | **撤销粒度** | **站点级 + 能力级** | 树内可撤销 = 站点取消授权（工具面即时移出）+ 可选能力（`bookmarks` / `downloads` / `notify` / `clipboard`）单能力撤销；**不做命令级策略覆盖**（作者未选，明确排除，NG-V2-001）；静态 `permissions`（`tabs` / `scripting` 等）**技术上不可逐项 remove**（需停用/卸载扩展）→ 只做隐私开关 + **如实披露「不可逐项撤销」**（FR-V2-038 + AC-V2-005）。**⚠️【R2·2026-09-13 需求反转，以现状为准】** 本行「不做命令级策略覆盖」**已被作者 2026-09-13 最新指令推翻**（逐字反馈见 §2.2b）——现改为**做命令级用户覆盖层**（工具级 + 子命令级，`allow`/`ask`/`deny`，受硬底线 clamp，FR-V2-074~077）；**站点级 + 能力级撤销语义不变**；静态 `permissions` 不可逐项撤销亦不变。**原依据 = 裁决⑤；新依据 = 作者 2026-09-13 反馈（§2.2b）**「不同层级都应该可以操作，dom 要可以设置为 ask 或 allow 或 deny，dom read-state 也要支持设置」。 |

### 2.2b R2 修订输入：作者 2026-09-13 偏差反馈（**逐字留存，不得转述走样**）

> **背景**：v2 四叶（V2-1/V2-2/V2-3/V2-4）均已 `phase=validated` 后，作者在审验中报出**交付偏差**。本 spec 做 **post-validate 修订轮（R2）**：**不回退 phase、不稀释既有记录**，在父/相关叶 `state.json` 追加 `revisionRounds.R2`；本版据此**显式反转**原裁决⑤ / NG-V2-001 / ADR-V2-011 的命令级部分（**不假装「一直如此」**）。
> **授权**：作者已授权编排器自行决策（2026-09-13）——本轮**不再向作者提问**，开放点由编排器裁决并标注「编排器代作者决策（2026-09-13 授权）」。

**作者原始反馈（逐字引文，含原始标点/错别字，不得改动）**：

> 有个问题，需要修复下偏差，连接树的实现有偏差，所谓"连接树"，1、至少是树形的展示吧，当前是列表，不合适，如：连接数=》授权的站点=》站点xxx，连接树=》支持的命令=》系统内置命令=》dom=》dom xxx，等等，定义好树的形状，按找归属，逐层展开，才方便用户查阅、理解；2、连接要可以操作，当前完全不能操作，例如：dom
> 来源 内置（base-builtin） · 命令间隔 delayMs=0ms（与 delay 档无关） · 处置 ask
> ask（需确认）
> 只读展示：命令级策略不可在树内修改（不提供命令级写入）
> dom read-state
> 来源 内置（base-builtin） · 命令间隔 delayMs=0ms（与 delay 档无关） · 处置 allow
> allow（默认放行） ，不同层级都应该可以操作，dom要可以设置为ask 或 allow 或 deny，dom read-state 也要支持设置；

**已核实的偏差证据（代码真值，作为本修订的一手依据）**：

| # | 偏差 | 代码真值（file:line） |
|---|------|----------------------|
| D-R2-01 | **形状**：树被实现为「按维度分组的扁平列表」，**无父子层级、不可逐层展开**（与 spec 声称的「四层分组视图」在**可展开树形**上不符） | `src/ui/tree/tree-view.ts:509-525` 构建 `groups[]`（每 dimension 一组，组内 `rows` 为**扁平行**）；`src/ui/tree/tree-drawer.ts:601-613` 渲染为「分组标题 + 平铺 `group.rows`」 |
| D-R2-02 | **不可操作**：树内命令**完全不能操作**（所有命令无写入控件） | `src/insight/command-catalog.ts:142-145` `controlsFor()` 对**所有**命令返回 `[{kind:'none', label:'只读展示：命令级策略不可在树内修改（不提供命令级写入）'}]`；`src/ui/tree/tree-view.ts:251-254` 对 `action==='deny'` 恒返回 `controls:[]` |
| D-R2-03 | **根因**：立项时那轮问答的**裁决⑤「撤销粒度 = 站点级 + 能力级，不做命令级策略覆盖」** → 落成 **NG-V2-001** + **ADR-V2-011（`deny` 不可关 = 渲染模型结构保证）** + `deny ⇒ controls: []` | §2.2⑤ / §3.2 NG-V2-001 / 父 `plan.md` ADR-V2-011；`src/ui/tree/tree-view.ts:250-254` |

**编排器代作者决策（2026-09-13 授权）**：

| 编号 | 决策 | 落点 |
|------|------|------|
| **D-OVERRIDE-2** | 新增**用户覆盖层**：优先级 **硬底线（不可覆盖）> 用户覆盖 > 默认 risk 档**；持久化、可恢复默认（单条 + 全部）、幂等、失败可读、零静默失败、审计（零明文）、变化即时生效并有可见后果 | FR-V2-075、AC-V2-024 |
| **D-OVERRIDE-3** | **硬底线不可覆盖（clamp）**：`evaluate` 永不 allow / 未授权 origin 仍 deny（S1）/ 未知非法 risk 仍 fail-closed deny（S3）/ 破坏性子命令保底 `ask` / `ui`·`state`·`external` 档不得被覆盖放宽；**`dom` 与 `dom read-state` 不在红线内 → allow/ask/deny 三档全可用** | FR-V2-076、AC-V2-025、§5.7 逐档结论表 |
| **D-OVERRIDE-4** | **多归属处理**：站点×命令、能力×命令为多对多 → 采用**主归属链 + 交叉引用徽标**（如「亦被 N 个站点引用」），**不得无限复制节点**；任一归属可下钻到同一节点 | FR-V2-071、AC-V2-021 |
| **D-OVERRIDE-5** | **展开状态**：根 + 一级默认展开，深层默认收起；展开/收起状态**会话内保持**；键盘可达 + `aria-expanded` | FR-V2-072、AC-V2-022 |
| **D-OVERRIDE-6** | **`AC-V2-005` 范围重定**：allow 单调性（`allowAfter ⊆ allowBefore`）**只约束撤销/关断类动作**；用户显式覆盖是**独立的、被审计的放宽通路**，**不得**用 allow 单调性否定它；另立覆盖类 AC | §8 AC-V2-005 注 + AC-V2-023~026 |

### 2.3 目标用户

| 用户角色 | 场景 | 诉求 |
|---------|------|------|
| 插件使用者（终端用户） | 装了插件、配了 LLM key，但不知道插件到底连了哪些站点/能力/命令 | 一眼看清「连了什么、能做什么、风险在哪」，并能就地收回授权 |
| 隐私/安全敏感用户 | 不放心「后台悄悄留着授权」 | 可查看已授权/未授权站点与能力，**可取消/可撤销**，撤销后有可见后果（回执 + 工具面证据 + 审计） |
| 误授权用户 | 曾对某站点授权、或开了写操作自动授权 | 能快速找到并**站点级/能力级**收回，且明确「撤销 = 回到更保守，不是放宽」 |
| 作者（单一维护者） | 需要 v2 与 v1 同批、零新权限、零注入、不碰 base | 结构清晰（父 + 4 叶子子 Feature）、v1 记录不被稀释、门禁可自动验证 |

### 2.4 与 v1 的关系（同批叠加边界）

- v1（`specs-tree-web-cli-plugin`）是**底座**：v2 的**全部状态源与操作实现 v1 已交付**（见 §2.5），v2 本质是**只读投影 + 聚合 + 侧栏悬浮 UI + 就地调用既有 ops**。
- v1 是**只读参与**：v2 **不得改写、不得回退、不得往 v1 的 `state.json` 追加 v2 内容**；v1 收口记录（基础 16/16 + post-validate TASK-017~040 + review R3/R5 + validate R2/R4 + NFR-007 未达成登记 D31）**原样保留**（FR-V2-001 + AC-V2-009）。
- 合入/发布：v2 **不合 main、不发布**（随 v1 由作者一并执行）；**不产生两次独立发布**。
- **红线**：不碰 `main`、不 force push、path-limited `git add`（禁 `git add -A`/`.`）、禁改 `.opencode/opencode.json`、**禁改 `packages/web-cli-base/**`**、无新依赖。

### 2.5 现状基础（**可投影面核实结果，逐文件实测，非新增设计**）

> 本节为「v2 零新权限、零注入」的**物质基础**：四维度的状态源与大部分操作实现 v1 已交付。以下为**读文件核实**结果（2026-09-13，分支 `feature/web-cli-plugin`）。

**① 站点授权面**

| 事实 | 代码真值（file:line） |
|------|----------------------|
| per-origin 记录模型 | `src/security/origin-store.ts`：`OriginRecord{origin, authorized, trust:'untrusted'\|'trusted', authorizedAt?, updatedAt, note?}`；存储键 `web-cli:origins`；方法 `list/get/authorize/revoke/setTrust/isAuthorized/trustOf`；变更写审计（`origin-authorize`/`origin-revoke`） |
| 宿主权限三操作 | `src/platform/extension-env.ts`：`requestOriginPermission` / `requestOriginPermissionDetailed` / `hasOriginPermission` / `removeOriginPermission` / `originPermissionPattern` |
| 授权↔注入对账 | `src/background/content-script-registry.ts`：`registerSiteContentScript` / `unregisterSiteContentScript` / `reconcileSiteContentScripts`（授权即注册、撤销即注销、启动对账） |
| 既有管理工具 | `src/tools/admin-tools.ts`：`admin_origin-authorize` / `admin_origin-revoke` / `admin_origin-list` / `admin_descriptor-show` / `admin_audit-export` / `admin_llm-config` |
| 既有撤销通路 | `src/background/service-worker.ts`：`revoke` 消息 → `removeOriginPermission(origin)` + content script 注销 + `okResponse({revoked, hostPermissionRemoved, contentScript})`；`src/ui/sidepanel/sidepanel.ts:1041` 已有侧栏撤销调用与可读回执 |

**② 浏览器能力面**

| 事实 | 代码真值（file:line） |
|------|----------------------|
| 静态权限面 | `manifest.json`：静态 `permissions = [activeTab, scripting, storage, sidePanel, tabs]`；`optional_permissions = [bookmarks, downloads, notifications, clipboardRead, clipboardWrite]`；`optional_host_permissions = [http://*/*, https://*/*]` |
| 可选能力映射 | `src/platform/capability-permissions.ts`：`OPTIONAL_CAPABILITIES = ['bookmarks','downloads','notify','clipboard']`；`OPTIONAL_CAPABILITY_PERMISSIONS`（bookmarks→`bookmarks`；downloads→`downloads`；notify→`notifications`；clipboard→`clipboardRead`+`clipboardWrite`）；`OPTIONAL_CAPABILITY_TOOL`；`OPTIONAL_CAPABILITY_LABEL`；`hasCapabilityPermission` / `requestCapabilityPermissionOnGesture`（**仅扩展页手势内同步发起，SW 绝不调用**）/ `removeCapabilityPermission`（`permissions.remove` 无需手势）/ `changeTouchesCapability` |
| 隐私开关（6） | `src/background/capability-setting.ts`：`bookmarksRead`(默认 **true**) / `bookmarksWrite`(默认 **false**) / `downloadsRead`(默认 **true**) / `notify`(默认 **true**) / `clipboardRead`(默认 **false**) / `clipboardWrite`(默认 **true**)；存储键 `web-cli:capability-settings`；`save(patch)` |
| 标签页开关 | `src/background/tabs-setting.ts`：`enabled` 默认 true；存储键 `web-cli:tabs-enabled`；关闭 → `tabs` 从 `deriveTools()` 移除 |
| 即时移出工具面 | `src/background/host.ts:186/551`：`suppressCapability(cap, suppressed)`；消息 `capabilities` / `capability-changed` |
| 既有 ops | `src/ui/settings/ops.ts`：`loadCapabilities` / `setCapabilityPrivacy` / `notifyCapabilityPermissionChanged` / **`revokeCapability`（`chrome.permissions.remove` 无需手势 → 重对账 → 工具移出 + `optional-permission/revoked` 审计，失败返回可读原因）** / `loadTabsSetting` / `setTabsSetting` |

**③ CLI 命令档案面**

| 事实 | 代码真值（file:line） |
|------|----------------------|
| 站点声明工具的风险重算 | `src/tools/declared-tools.ts`：`SAFE_READ_VERBS` / `DESTRUCTIVE_VERBS` / `effectiveRisk`（站点 `riskHint` 不采信）/ `isDestructiveInvocation` / `hasDestructiveVerb` / `isSafeReadOnlyTool` |
| 插件风险默认表 + 三策略 | `src/security/policy.ts`：`PLUGIN_RISK_DEFAULTS`（read→**allow**、write/external/ui/state→**ask**、evaluate→**deny**）；S1 未授权 origin → deny；S2 声明 untrusted 危险档 → ask、未知档 → deny；S3 非法/未知 risk → deny；`denyPriority: true` |
| 工具面真值 | base `router.deriveTools()`（含插件注册的 site/admin/tabs/bookmarks/downloads/notify/clipboard 工具） |
| `delayMs`（撞词对象，须消歧） | base `delay.ts` `DelayGate`：`delayMs` 缺省继承全局 / `0`=免除 / 钳制 [0,5000]；插件 `src/background/host.ts:258` 当前 **`delayMs: 0`（全局关闭）**——**与作者口径 `delay`(= deny) 不是同一所指** |
| 对账基线 | `test/parity/baseline-catalog.json`：`toolCount = 34`、子命令合计 **142**、`provenance.commit = 2ddc922…`（main）；由 `test/parity.test.ts` 双向 + 子命令级对账（新增/丢失即失败）；豁免表 `test/parity/waivers.json` |

**④ LLM 连接面**

| 事实 | 代码真值（file:line） |
|------|----------------------|
| BYOK 存储 | `src/llm/key-store.ts`：存储键 `web-cli:llm`；`PersistedKeys{active, providers, maxRounds}`；`load/save/loadProvider/clear(providerId?)/maskedConfig` |
| 零明文投影 | `src/llm/status.ts`：`LlmStatusSummary{configured, providerId, providerName, model}`——**刻意不复制任何 key 材料** |
| 厂商表（8） | `src/llm/providers.ts`：deepseek / qwen / volc / volc-coding / volc-plan / tencent / openai / claude（含 `browserDirect`） |
| 多会话 | `src/background/session-store.ts`：`sessionIdForOrigin` / `groups` / `MAX_SESSIONS=20` LRU / `createGroup` / `addOriginToGroup` / `removeOrigin` / `deleteGroup` |
| 既有消息面 | `src/background/messaging.ts`：`llm-config` / `llm-status` / `llm-test` / `sessions` / `session-switch` / `session-group` / `session-changed` / `capabilities` / `capability-changed` 等 |

**授权与撤销的判定真值（横切）**

| 事实 | 代码真值（file:line） |
|------|----------------------|
| 自动授权 + 4 条硬底线 | `src/security/auto-authorize.ts`：`AutoAuthSettings{read(默认 true), write(默认 false)}`；`decideAutoAuthorization` 的硬底线——①未授权 origin 仍 deny（S1）②未知/缺失/非法 risk 仍 deny（S3 fail-closed）③`evaluate` 仍 deny ④破坏性写仍 `ask`（`hardDeny`）；`ui`/`state`/`external` 本轮无自动开关 |
| 审计 | `src/security/audit-sink.ts`：存储键 `web-cli:audit`、容量 `DEFAULT_AUDIT_CAPACITY = 500`、零明文；导出入口 `admin_audit-export` |
| 侧栏布局基线（量化） | `docs/dev.md` §11.3（真实 dist + CDP，视口 400×900）：`#log` `flex-grow=1`；`#log` 稳态高度 **589px（实测占比 65.44%；主断言口径 ≥589px / 次断言口径 ≥65.0%，来源 AC-V2-002 / ADR-V2-006）**；`composer` 底边 − 视口底 **+8px（贴底）**；水平溢出 400px / 320px 均 **0**；三区 = `#panel-top` / `#panel-main(#log 唯一滚动区)` / `#panel-bottom`（`#composer` 为**末元素**，D-079 前科修复） |
| 滚动跟随策略 | `src/ui/sidepanel/scroll-policy.ts`：`BOTTOM_THRESHOLD_PX = 48`（D-087~D-089 前科修复） |
| 体积基线守卫先例 | `test/perf-baseline.ts`：`content.js` 基线 `1,073,453 B`、容差 5%、上限 `1,127,125 B`、目标预算 **64 KiB（未达成 D31）**；`readArtifactSize` 只吞 `ENOENT`，其余错误必须抛出（第 9 轮修 perf-budget 虚绿门禁的做法） |
| 当前 dist 实测（2026-09-13） | `content.js` 1,073,453 B；**`sidepanel.js` 1,068,165 B**；`background.js` 1,372,225 B；`options.js` 978,471 B；`options.html` 14,570 B |

---

## 3. 目标与非目标

### 3.1 目标 (Goals)

| # | 目标描述 |
|---|---------|
| G-V2-001 | **四维度一眼可见（any insight）**：把站点授权面 / 浏览器能力面 / CLI 命令档案面 / LLM 连接面聚合为一棵**可就地操作的悬浮连接树**——「全部是个黑盒，用户不可见」的痛点被解除 |
| G-V2-002 | **可查看 + 可操作 [R2 扩范围，以现状为准]**：树内不只只读展示，还要能**就地**执行 ① 站点级 / 能力级撤销/取消授权 ② **命令级用户覆盖**（工具级 + 子命令级，`allow`/`ask`/`deny`，受硬底线 clamp），且两者**均有可见后果**（回执 + 工具面证据 + 审计）〔R2 前仅 ①；扩范围依据 = §2.2b 作者反馈；FR-V2-074/075〕 |
| G-V2-003 | **操作简单 + 不放进设置面板**：侧栏常驻悬浮入口 + 树抽屉（少层级、可直达、可检索/过滤）；树是**并列独立新面**，v1 设置面板保持现状 |
| G-V2-004 | **零新权限、零注入、零 base 改动**：静态 `permissions` 零新增、无 `<all_urls>`、无静态 `content_scripts`、不加重 `content.js`、不碰 `packages/web-cli-base/**`、无新依赖 |
| G-V2-005 | **树是「可见性 + 撤销 + 受硬底线约束的命令级覆盖」面；硬底线永不放宽 [R2 范围重定，以现状为准]**：**撤销/关断**通路只调用既有 fail-closed 通路，**永不放宽**；**命令级用户覆盖**为**另一条独立通路**（可放宽**非硬底线**条目），但**必须经硬底线 clamp**——`evaluate` 永不 allow / 未授权 origin 仍 deny / 未知非法 risk 仍 fail-closed deny / 破坏性保底 `ask` / `ui`·`state`·`external` 不得被覆盖放宽（安全红线，含反向断言）〔R2 前为「树不是提权面、永不放宽」；收窄表述依据 = §2.2b + D-OVERRIDE-3；FR-V2-060/061/064/075/076〕 |
| G-V2-006 | **不许静默失败/假成功**：新增操作的回执必须可读（成功/失败原因），静态 `permissions` 不可逐项撤销必须**如实披露**（延续 v1 不静默传统） |
| G-V2-007 | **不稀释 v1 记录**：v1 `specs-tree-web-cli-plugin` 保持 `phase=validated` / `status=tracked` 原样不动；v2 用新 Feature 目录承载；同批叠加不产生两次独立发布 |

### 3.2 非目标 (Non-Goals)

| # | 明确不做 |
|---|---------|
| NG-V2-001 | ~~**不做命令级策略覆盖**~~ **【R2·2026-09-13 作废/改写，以现状为准】** 原依据 = 作者裁决⑤「撤销粒度 = 站点级 + 能力级，**不做命令级策略覆盖**」（作者 2026-09-13 最新指令已**反转**，逐字反馈见 §2.2b）。**改写后**：**做命令级用户覆盖层**（工具级 + 子命令级，`allow`/`ask`/`deny`；归 FR-V2-074/075，受硬底线 clamp FR-V2-076）；**替代的新非目标 = NG-V2-001R**：**不做无审计的命令级放宽、不做绕过硬底线的覆盖**（FR-V2-076/077 + AC-V2-025/026 钉死）。原「若未来要做须单开 Feature + 安全评审」不再适用（R2 轮即在该路线上落地，并含安全 clamp 设计） |
| NG-V2-002 | **不做静态 `permissions` 逐项撤销**（Chrome 需停用/卸载扩展，技术不可行 → 只做隐私开关 + 如实披露，**不假装可撤销**） |
| NG-V2-003 | **不做页面注入悬浮层**（作者裁决②未选；与 v1 无 `<all_urls>` / 无静态 `content_scripts` 红线冲突） |
| NG-V2-004 | **不做树内改绑 LLM 配置（写路径）**（v1 侧栏已能配置；v2 先做「可见 + 断开」；改绑是否入树由作者另行批准——默认不做，避免与设置面板职责重叠） |
| NG-V2-005 | **不重写框架 / 不改判定链**：不改 `security/policy.ts` 判定链、`PLUGIN_RISK_DEFAULTS`、`auto-authorize.ts` 4 条硬底线；不碰 `packages/web-cli-base/**`；不改 `manifest.json` 静态权限面 |
| NG-V2-006 | **不改 `options.html` / 不做设置面板重构**：不推翻 v1 TASK-033（设置进侧栏面板内视图、零跳转）；树仅**复用实现**，不改变设置面板归属 |
| NG-V2-007 | **不解决 v1 遗留未达成项**：不触碰 `content.js` 1.07MB（超 64KB ≈16×，D31）、不薄壳化 `options.html`；v2 反而**要求不加重** `content.js` |
| NG-V2-008 | **不新增依赖、不引入新权限**（含 `notifications`/`clipboardWrite` 之外的一切新权限；这两个已由 v1 以 `optional_permissions` 落地） |
| NG-V2-009 | **不合 main、不发布**（作者执行）；不 force push；禁 `git add -A`/`.`；禁改 `.opencode/opencode.json` |
| NG-V2-010 | **不修改 v1 的任何文件**（`specs-tree-web-cli-plugin/**` 只读；含 discovery/spec/plan/tasks/build/review/validate/state.json 全部） |

> **【R2 NG 清单修订纪律 · 2026-09-13】** 本次**只作废/改写 `NG-V2-001`**（依据作者 2026-09-13 反馈反转，见 §2.2b）。**其余 NG 不得被顺手放开**，**仍然成立**：NG-V2-002（静态权限假撤销）、NG-V2-003（页面注入层）、NG-V2-004（树内改绑 LLM）、**NG-V2-005（不重写框架 / 不改判定链 / 不改 `riskDefaults` / 不改 4 硬底线 / 不碰 base）**、NG-V2-006（不改 options / 设置面板重构）、NG-V2-007（不解决 v1 遗留未达成项）、NG-V2-008（不新增依赖权限）、NG-V2-009（不合 main 不发布）、NG-V2-010（不改 v1 文件）。**对 NG-V2-005 的 R2 澄清（不放开，仅澄清边界）**：命令级用户覆盖层是**新增的独立层**，**不修改** `security/policy.ts` 判定链本体、**不修改** `PLUGIN_RISK_DEFAULTS`、**不修改** `auto-authorize.ts` 4 条硬底线；覆盖层在**判定链之后、以 clamp 方式**生效（硬底线优先，FR-V2-076）。该澄清**不构成**对 NG-V2-005 的放宽。

---

## 4. 用户故事

| # | 作为… | 我想要… | 以便… |
|---|-------|---------|-------|
| US-V2-001 | 插件使用者 | 打开侧栏就能悬浮看到「哪些站点已授权 / 没授权 / 可取消」，并就地取消 | 不再对「后台留着哪些授权」一无所知 |
| US-V2-002 | 隐私敏感用户 | 看清静态权限与可选能力（bookmarks/downloads/notify/clipboard）各自状态，并单能力撤销 | 精确收回某一项能力，而不必停用整个扩展 |
| US-V2-003 | 谨慎用户 | 看到**每一条** CLI 命令的处置档 `allow`/`ask`/`delay(=deny)` + risk + 来源 + `delayMs`，并理解 `deny` 的三种成因 | 知道「哪些命令会被自动放行、哪些要确认、哪些永远拒绝」 |
| US-V2-004 | BYOK 用户 | 看到「到底连了哪些 LLM」（厂商/模型/是否已配置，零明文 key），并能断开 | 掌握自己的模型连接面 |
| US-V2-005 | 误操作用户 | 撤销/关断后有清晰回执、能看到工具面已移除的证据、能去审计入口核对 | 确信「撤销真的生效了」，不是假成功 |
| US-V2-006 | 安全责任人 | 确信树内操作**只收紧不放宽**（撤销后 `evaluate` 仍 deny、破坏性仍 ask、`clipboard read` 仍 ask） | 敢用这个「可操作」的树 |
| US-V2-007 | 作者（单一维护者） | v2 与 v1 同批、零新权限、零注入、不碰 base，且 v1 收口记录不被稀释 | 一次合入发布，结构清晰可审计 |
| US-V2-008 | 插件使用者 **[R2 新增]** | 在**真正的树形层级**里**按归属逐层展开/收起**查阅（站点 → 该站点支持的命令 → 工具 → 子命令；或 命令 → 系统内置命令 → `dom` → `dom read-state`） | 一眼看懂「这个能力属于谁、下面还有什么」，而不是在一堆扁平行里找不到归属 |
| US-V2-009 | 谨慎用户 **[R2 新增]** | **在工具级与子命令级就地设置**该命令的处置（`allow` / `ask` / `deny`，如 `dom`、`dom read-state`），并确信**硬底线不会被自己误放宽** | 既能按自己的偏好收放命令，又不会把 `evaluate` / 未授权 origin / 未知 risk / 破坏性操作放开 |

---

## 5. 功能需求 (FR)

> 编号约定：**FR-V2-xxx**（独立前缀，与 v1 FR-001~FR-055 零冲突）——本 Feature 共 **53 条 FR**（编号 `FR-V2-001`~`FR-V2-079`，分组间留空号，非 79 条）。分组：**GOV**（基线与范围纪律）/ **TREE**（连接树数据模型与状态投影，V2-1）/ **UI**（悬浮连接树 UI 与交互，V2-2）/ **OPS**（撤销与取消授权操作面，V2-3）/ **ARC**（命令档案浏览器，V2-4）/ **SEC**（安全红线，横切）/ **REV2**（**R2 需求修订组：连接树真层级树 + 命令级用户覆盖层**，FR-V2-070~079，横切 V2-1~V2-4）。
> 标注规则：**[裁决]** = 作者五项口径裁决红线（§2.2）；**[红线]** = 安全红线（必须落成 FR + 反向断言 AC）；**[R2]** = 2026-09-13 R2 修订轮新增/改写（依据 §2.2b 作者偏差反馈，**逐字留存**）；未标注 = 基于已裁红线可直接测试。

### 5.1 GOV — 基线与范围纪律

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-V2-001 | **v1 记录保护 + 新 Feature 目录承载 [裁决④]**：v2 以**新 Feature 目录** `specs-tree-web-cli-plugin-v2-insight` 承载；v1 `specs-tree-web-cli-plugin` 保持 `phase=validated` / `status=tracked` **原样不动**——**不得回退、不得改写、不得往 v1 的 `state.json` 追加 v2 内容**；v1 收口记录（基础 16/16 + post-validate TASK-017~040 + review R3/R5 + validate R2/R4 + NFR-007 未达成 D31）原样保留。**父 Feature 为轻量规范容器，不执行 tasks/build/review/validate**；4 个子 Feature 均为**叶子** | v1 `state.json` 的 `phase`/`status`/`updatedAt` 与收口前一致（diff 零变更）；v2 全部内容在新目录；父 `state.json` 的 `childrens` 记录 4 个叶子子 Feature；无任何 v1 文件被 v2 收口动作覆盖 | P0 |
| FR-V2-002 | **零新权限 / 零注入 / 不动 base [裁决②]**：`manifest.json` **静态 `permissions` 零新增**（维持 `activeTab,scripting,storage,sidePanel,tabs`）；不引入 `<all_urls>` / `*://*/*` 静态注入；**不新增静态 `content_scripts`**；**不加重 `content.js`**；不改 `packages/web-cli-base/**`；无新依赖 | `manifest.json` 静态权限面 diff 为空；`dist/content.js` 体积**不增长**（≤ v1 基线 `1,073,453 B`）；`packages/web-cli-base/**` git diff 为空；`package.json` 依赖零新增 | P0 |
| FR-V2-003 | **additive 复用 v1 状态源与 ops [裁决④]**：投影只读复用 v1 状态源；操作只调用 v1 既有 ops（`removeOriginPermission` + 对账 / `removeCapabilityPermission` + `onRemoved` / `capabilitySetting.save` / `autoAuth.clear` / key-store 清除 / session-store 分组）；**不改** `policy.ts` 判定链 / `riskDefaults` / 4 条硬底线 | 复用面清单（对照 v1 导出面）；无判定链/policy 文件 diff；无上游 base 文件被复制分叉 | P0 |
| FR-V2-004 | **与 v1 设置面板的边界 [裁决③]**：连接树 = **新增独立悬浮面**（并列），**不推翻** v1 TASK-033「设置进侧栏面板内视图」；**不放进设置面板**、**不取代设置面板**；仅允许**复用实现** `src/ui/settings/{view,ops,panel,styles}.ts`（**复用实现 ≠ 放进设置面板**）；**不改 `options.html`** | 树与设置面板是两个可分别打开的界面（并列非嵌套）；`options.html` git diff 为空；设置面板既有入口/行为零回归（v1 相关断言零删减） | P0 |
| FR-V2-005 | **版本位与提交纪律 [裁决④]**：同 `v0.8` 同一版本位内第二 Feature（同批叠加）；**不合 main、不发布**；提交 path-limited（只加新建 v2 目录 + 最小 ROADMAP 追加）；不 force push；禁 `git add -A`/`.`；禁改 `.opencode/opencode.json` | 分支 `feature/web-cli-plugin`；`main` HEAD 仍为 `2ddc922…`；提交只含预期路径；`git add -A` 零使用 | P0 |

### 5.2 TREE — 连接树数据模型与状态投影（V2-1）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-V2-010 | **四层分组视图（森林）模型 [作者确认 2026-09-13]〔R2·形式被 FR-V2-070 取代，以现状为准〕**：以「本插件」为根，聚合**四个并列分组**（站点 / 能力 / 命令 / LLM）；允许**跨层引用**（命令节点标注来源站点、能力节点标注依赖的 Chrome 权限）；界面**如实说明「不是严格单根树」**。**⚠️【R2·2026-09-13】** 本条的「四个并列分组 + 扁平行」形式**已不足以满足作者要求**（作者要求**真树形、按归属逐层展开**）——**实现形态由 FR-V2-070 取代**（四个维度仍为一级分组，但**组内必须是有父子层级、可逐层展开的树**，不再是扁平 `rows`）；**FR-V2-010 的维度划分/跨层引用语义保留**，「非严格单根树」的诚实说明改为**「按归属的层级树 + 多归属交叉引用」**（FR-V2-071） | 树模型含四分组根节点 + 跨层引用字段；模型为**确定性投影**（同输入同输出快照）；UI 明示维度归属说明；**层级可展开（FR-V2-070/072）** | P0 |
| FR-V2-011 | **站点授权面投影**：投影每站点的 `origin` / 是否已授权 / `trust`（untrusted/trusted）/ `authorizedAt`；来源 = `OriginStore.list()`；已授权 / 未授权 / **可取消授权**三态可辨 | 站点节点字段与 `OriginStore` 真值一致；未授权站点可见（不是「看不见」）；「可取消授权」态仅在 `authorized=true` 时出现 | P0 |
| FR-V2-012 | **浏览器能力面投影**：投影**静态 `permissions`**（activeTab/scripting/storage/sidePanel/tabs）+ **`optional_permissions`**（bookmarks/downloads/notifications/clipboardRead/clipboardWrite）+ **6 个隐私开关**（capability-setting）+ **`tabs` 开关**（tabs-setting）；每项三态清晰（已授权 / 未授权 / **可撤销**） | 能力节点覆盖静态权限 + 4 可选能力 + 6 开关 + tabs 开关；状态经 `hasCapabilityPermission` / 开关真值投影；静态权限项**不得**显示「可撤销」 | P0 |
| FR-V2-013 | **CLI 命令档案投影**：投影**每条命令**（工具 + 子命令）的处置档 `allow` / `ask` / `delay(=deny)` + risk 档 + **来源**（base 内建 / 站点声明 `site_*` / 插件 `admin_*`·`tabs`·`bookmarks`·`downloads`·`notify`·`clipboard`）+ `delayMs` + **当前是否被开关/授权状态抑制**。**⚠️【R2·2026-09-13 扩字段，以现状为准】** 须**分列**给出：① **默认档**（risk 档派生）② **用户覆盖生效档**（覆盖经 clamp 后的实际值，FR-V2-075/076）③ **该节点是否可覆盖** 与 **不可覆盖原因**（硬底线类别：evaluate / S1 / S3 / 破坏性保底 / ui·state·external）；**分级**：工具级与子命令级各自独立投影（FR-V2-074） | 命令节点真值对齐 `deriveTools()` + registry（不重不漏）；处置档由 `PLUGIN_RISK_DEFAULTS` + S1/S2/S3 + 开关抑制态推导；来源标注正确（见 FR-V2-055）；**默认档 / 覆盖生效档分列断言；可覆盖性 + clamp 原因字段与 FR-V2-076 结论表一致** | P0 |
| FR-V2-014 | **LLM 连接面投影**：投影 `configured` / `providerId` / `providerName` / `model`（复用 `llm/status.ts` 零明文投影）+ 多会话与分组（`session-store`）；**零明文 key**；**树内改绑 LLM 的写路径默认不做**（NG-V2-004） | LLM 节点字段 == `LlmStatusSummary`；投影输出 grep 零命中 key 材料；树内无「改绑/编辑 key」操作入口 | P0 |
| FR-V2-015 | **投影确定性 + 对账（不重不漏）〔R2·口径分列，以现状为准〕**：树中命令集合 **==** `deriveTools()` + registry 真值 + `test/parity/baseline-catalog.json` 基线（**34 工具 / 142 子命令**）；新增/丢失命令即失败；投影为**确定性快照**。**⚠️【R2·2026-09-13】** 口径**分列**（不得混同、不得夸大）：**实时投影面** = **28 工具 / 94 子命令 = 122 卡**（树内实际渲染/可操作面）；**parity 基线** = **34 工具 / 142 子命令**（对账基线，独立口径）；替代口径 `accounted` 只作门禁背书、**不渲染**（D-V24-08）。见 FR-V2-079 | 单测：树命令集合与真值的双向集合等价（不重不漏）；确定性快照（两次投影一致）；与 parity 基线对齐（142 子命令逐条可列）；**实时面 122 卡与基线 34/142 分列断言**；「已全部渲染」类表述零命中 | P0 |
| FR-V2-016 | **投影只读、零副作用、`state` 消息 additive 兼容**：投影为**纯读**（不改任何存储/不触发任何操作）；不渲染 UI；`state` 消息面**additive 扩展**（旧消费者零破坏）。**⚠️【R2·2026-09-13 边界澄清】** 投影**仍为纯读**；命令级**覆盖写入**是 V2-3 的**独立操作通路**（FR-V2-075），**不得**混入投影函数；投影只**读取**覆盖层以给出「覆盖生效档」（FR-V2-013） | 投影调用前后存储 diff 为空、无审计新增；`state` 消息旧字段语义零变更（回归断言）；投影纯函数化（可单测） | P0 |
| FR-V2-017 | **空态与降级可读**：无活跃站点 / 无已授权站点 / 未配置 LLM / 无命令（异常）等空态必须给出**可读**说明与下一步提示；投影读失败降级为可读态，**不静默** | 各空态均渲染可读文案（断言 ≥3 类空态）；storage 读失败有可读降级（EC-V2-013） | P0 |

### 5.3 UI — 悬浮连接树 UI 与交互（V2-2）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-V2-020 | **侧栏常驻悬浮入口（FAB/浮动按钮）[裁决②]**：在**侧栏内**提供常驻悬浮入口，可开合「树抽屉」；**不做页面注入悬浮层**；**不放进设置面板** | `test:ui`（真实 dist）：悬浮入口存在且可点击开合；入口位于侧栏 DOM（非页面注入）；不在设置面板视图内 | P0 |
| FR-V2-021 | **树抽屉：四维度层级导航 + 状态徽标 + 操作简单〔R2·改为真层级树，以现状为准〕**：抽屉内按四维度层级导航、显示状态徽标（已授权/未授权/可撤销/deny 成因）；**少层级、可直达**（关键操作 ≤2 次点击）。**⚠️【R2·2026-09-13】** 导航**必须为真树形**——**按归属逐层展开/收起**（FR-V2-070），**不得再是「分组标题 + 扁平列表」**；层级路径可读（FR-V2-073）；命令节点**逐层可操作**（FR-V2-074） | 抽屉四维度可见；状态徽标与真值一致；从入口到任一撤销/覆盖操作的层级 ≤2；**层级树可逐层展开/收起**；空态/降级可读 | P0 |
| FR-V2-022 | **检索/过滤（只读过滤，不改真值）**：可按维度/关键字检索或过滤树节点；过滤只影响展示，**不改变投影真值、不改变任何授权状态** | 过滤后展示集合正确；过滤前后存储/授权状态 diff 为空；命令档案可按 34/142 检索 | P1 |
| FR-V2-023 | **侧栏布局不回退 [红线·量化]**：悬浮入口/抽屉**不遮挡 composer**；**消息区（`#log`）高度不回退**；**窄侧栏零水平溢出**；明暗适配；复用 v1 三区 flex 全高布局与 `scroll-policy`（48px 跟随） | `test:ui` **实测量化断言只增不减**（§8 AC-V2-002 给出精确阈值）：`#log` `flex-grow=1`、稳态 `clientHeight` **≥589px（主断言）且占比 ≥65.0%（次断言）**、composer 底边−视口底 ∈ **[0, +8px]**、入口与 composer boundingRect **不相交**、400px/320px 水平溢出 **=0**；v1 既有 `#15a~#15q` 断言零删减〔**测量条件注（D-V22-01 口径订正，2026-09-13，V2-3 最小订正）：主/次阈值按「去镀铬稳态」测量**（隐藏 `#site-hint`/`#onboarding`/`#discovery-notice`/`#consent-slot`/`#send-reason`），当日实测 **674px / 74.9%** ≥ 589px / 65.0%；另按 **v1 口径**（仅隐藏导航条）断言 `#log ≥405px`（v1 自身 `>45vh` 下限）证明**零回归**，并以抽屉**开/关逐字段相等（drift=0）**证明覆盖层不改变任何稳态几何。**原「589px = 65.5%」为 TASK-023 历史记录（早于 FR-052 自动授权块落地），不再单独作为今日阈值**〕 | P0 |
| FR-V2-024 | **入口可发现 + 不干扰 + 既有契约零回归**：入口常驻但**不遮挡交互**（可折叠/可最小化）；抽屉可关闭；**不改 v1 既有元素 ID / `.entry-*` 选择器**（测试门禁零回归） | 入口高 z-index 但不拦截 composer/交互（点击穿透/占位断言）；抽屉可关；既有 DOM id/类零重命名（grep 断言） | P0 |
| FR-V2-025 | **两通路文案钉死 + 偏差文案清除 [红线]〔R2·范围重定，以现状为准〕**：树内文案须**分列声明两条通路**——① **撤销/关断 = 回到更保守，不放宽任何门禁**；② **命令级覆盖 = 用户显式、被审计的放宽，但硬底线不可覆盖（经 clamp）**。**⚠️【R2·2026-09-13】** 原偏差文案「只读展示：命令级策略不可在树内修改（不提供命令级写入）」**必须被替换**（FR-V2-078）；**硬底线 `deny`（evaluate/S1/S3）节点仍无控件**（FR-V2-077），并展示不可覆盖原因；**非硬底线 `deny` 及普通命令节点有 allow/ask/deny 控件**（FR-V2-074） | UI 文案含两条通路声明（断言 grep）；偏差文案零命中；硬底线 `deny` 节点无控件 + 原因可读；非硬底线命令节点控件齐备（断言） | P0 |

### 5.4 OPS — 撤销与取消授权操作面（V2-3）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-V2-030 | **站点取消授权（站点级）[裁决⑤]**：树内可就地取消某站点授权——调用**既有** `removeOriginPermission(origin)` + `OriginStore.revoke` + content-script 注销 + 对账；工具面**即时移出**该站点工具 | `test:binding`（真实 dist + 真实站点）：取消授权 → 该站点工具**即时**从 `deriveTools()` 移出 + 审计；`host_permissions` 移除有回执 | P0 |
| FR-V2-031 | **可选能力单能力撤销（能力级）[裁决⑤]**：调用**既有** `removeCapabilityPermission` + `permissions.onRemoved` 对账 + `capability-changed` 推送 → 对应工具**即时移出** `deriveTools()` + `optional-permission/revoked` 审计；失败给可读原因 | `test:binding`：撤销 bookmarks/downloads/notify/clipboard 任一 → 工具即时移出 + 派发被可读拒绝 + 审计；`remove` 失败不静默（可读错误） | P0 |
| FR-V2-032 | **隐私开关翻转**：调用**既有** `capabilitySetting.save`（6 开关）与 `tabs-setting`；关闭即从 `deriveTools()` 移除该工具组（`enabled` 语义，不静默保留）；再次开启即恢复 | 6 开关 + tabs 开关可翻转；关闭 → 工具移出 + 派发被拒；再开启恢复；开关状态与工具面一致（断言） | P0 |
| FR-V2-033 | **按 origin 自动授权关断**：调用**既有** `autoAuth.clear(origin)`（读+写都关）；**撤销自动授权 ≠ 撤销站点授权**（授权与自动授权独立维度） | 一键关断后该 origin 读/写自动授权均为 false；站点授权状态不变（断言）；下一次同档位调用恢复 `ask`（EC-V2-016） | P0 |
| FR-V2-034 | **LLM 断开（清 key）**：调用既有 key-store 清除（BYOK）；回执可读；不静默失败 | 断开后 `maskedConfig().hasKey === false`；回执可读；清除失败有可读原因 | P1 |
| FR-V2-035 | **会话组解散（可选）**：调用既有 `session-store.deleteGroup` / `removeOrigin`；**分组只共享对话、不代表互相授权**（文案明示） | 解散后会话键与成员列表正确回退；文案明示「分组≠授权」；不触及任何 origin 授权 | P1 |
| FR-V2-036 | **撤销/关断只走既有 fail-closed 通路 [红线]〔R2·范围限定，以现状为准〕**：**撤销/关断类**操作面（站点取消授权 / 能力撤销 / 开关 / 自动授权关断 / LLM 断开 / 会话组）**只能调用既有 fail-closed 通路**，**永不放宽** `riskDefaults` / 4 条硬底线；**不得**新增任何绕过门禁的旁路。**⚠️【R2·2026-09-13 范围限定】** 本条**只管撤销/关断通路**；**命令级用户覆盖是另一条独立通路**（FR-V2-075，属「有意的、被审计的放宽」），**不得**用本条否定它，也**不得**用 `AC-V2-005` 的 allow 单调性去否定它（见 AC-V2-005 注）。覆盖通路**仍受硬底线 clamp**（FR-V2-076） | 操作面代码只调用既有 ops（评审 + 单测）；无新增 policy/gate 旁路（grep）；撤销路径不得改变 `PLUGIN_RISK_DEFAULTS`；**覆盖通路与撤销通路代码/审计可分辨** | P0 |
| FR-V2-037 | **撤销后有可见后果（三件套）[作者确认 2026-09-13]**：① **回执**（成功/失败原因可读）② **工具面已移除的证据**（树内可查该工具已不在 `deriveTools()`）③ **审计入口**（`admin_audit-export` 可查对应事件） | 撤销后三件套均可验证（`test:binding` + 单测）；回执含成功/失败可读原因；工具面证据可查；审计事件可查（不强制渲染在树内，但入口可达） | P0 |
| FR-V2-038 | **静态 `permissions` 不可逐项撤销，如实披露 [裁决⑤/红线]**：静态权限项（tabs/scripting/activeTab/storage/sidePanel）**不得显示为可撤销**；必须**如实披露**「技术上不可逐项撤销，需停用/卸载扩展」；只提供隐私开关（tabs-setting / capability-setting） | UI 文案对静态权限给出「不可逐项撤销」说明（断言）；静态权限项无撤销按钮；不假装可撤销 | P0 |
| FR-V2-039 | **不引入静默失败 / 假成功 [红线]〔R2·扩到覆盖通路，以现状为准〕**：所有新增操作回执必须可读（成功/失败原因 + 下一步）；失败不得渲染为成功；不得 bare `catch` 吞错。**⚠️【R2·2026-09-13】** 明确**涵盖命令级覆盖**（设置/恢复默认/全部恢复失败均须可读；clamp 命中须可读说明「被硬底线拒绝/降级」；**不得**把 clamp 后的降级结果静默渲染为「已设为 allow」） | 失败路径返回可读原因（断言 ≥3 类，**含覆盖类失败**）；无 bare `catch` 吞断言（grep + 评审）；失败不显示成功态；clamp 降级可读 | P0 |
| FR-V2-040 | **撤销需显式意图（防误触）**：站点取消授权 / 能力撤销 / LLM 断开等不可逆或高影响操作须**显式确认**（确认摘要含作用对象 + 后果），拒绝即不执行、fail-closed | 不可逆操作触发确认（断言）；确认摘要可读；拒绝后零操作；取消授权类操作入审计 | P1 |

### 5.5 ARC — 命令档案浏览器（V2-4）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-V2-050 | **每条命令有档（34 工具 / 142 子命令）〔R2·口径分列，以现状为准〕**：对账基线每一条工具与子命令**逐条有档**：`allow` / `ask` / `delay(=deny)` + risk 档 + 来源 + `delayMs` + 抑制态。**⚠️【R2·2026-09-13】** 与 FR-V2-015/079 口径一致：**实时投影面 28 工具 / 94 子命令 = 122 卡**为树内可渲染/可操作面；**parity 基线 34/142** 为独立对账口径；`accounted` 只作门禁背书、不渲染；**禁止「34/142 已全部渲染」类表述** | 单测/对账门禁：**142 子命令逐条有档**（覆盖率 100%）；工具 34/34；无遗漏、无多余；**实时面 122 卡与基线分列断言；无夸大** | P1 |
| FR-V2-051 | **`deny` 三成因显式分列可读**：`deny` 必须分列三种成因——① 未授权 origin（S1）② 未知/缺失/非法 risk（S3 fail-closed）③ `evaluate` 设计硬底线；另标注 `auto-authorize` 的 `hardDeny` | 命令档案对每个 `deny` 标注成因类别（S1/S3/evaluate/hardDeny）；分类正确率单测覆盖；未知 risk 归 S3 | P1 |
| FR-V2-052 | **不把「硬底线 `deny`」渲染成可关的开关 [红线]〔R2·范围重定，以现状为准〕**：**硬底线 `deny`**（evaluate / S1 未授权 / S3 未知非法 risk / fail-closed）**不可放宽**，**仍无开关/无覆盖控件**，并**可读展示不可覆盖原因**；`delay`（= `deny`）**档位本身不可配置**（FR-V2-054/078 消歧保留）。**⚠️【R2·2026-09-13 部分取代】** 原「档案**只读展示**，**无任何命令级覆盖操作**」**被反转**——**非硬底线 `deny`**（用户自设 deny 等）与普通命令**有 allow/ask/deny 控件**（FR-V2-074/077）；`denyPriority` 语义不变 | 硬底线 `deny` 节点无控件 + 原因可读（断言）；非硬底线 `deny`/普通命令有控件且可改回（断言）；无**绕过 clamp** 的写入路径（grep）；`denyPriority` 语义不变 | P0 |
| FR-V2-053 | **与 parity 同源机器对账**：档案真值与 `policy.ts` / `auto-authorize.ts` 真值一致；与 `test/parity.test.ts` **同源**——新增/丢失命令即失败；判定表机器校验 | 命令档案判定表与 `policy.ts`/`auto-authorize.ts` 一致（单测）；parity 门禁双向 + 子命令级；新增/丢失即 FAIL | P1 |
| FR-V2-054 | **`delay` 撞词消歧文案 [裁决①/作者确认 2026-09-13]**：同一处并标「`delay`（= `deny`，fail-closed，**非可配置档位**；与命令间 `delayMs` 无关）」；`delayMs` 列独立展示并与 `delay` 档语义区分 | 文案断言含完整消歧句；`delayMs` 与档位分列展示；无任何「第三档位」暗示 | P0 |
| FR-V2-055 | **来源标注**：每条命令标注来源——base 内建 / 站点声明 `site_*` / 插件 `admin_*`·`tabs`·`bookmarks`·`downloads`·`notify`·`clipboard` | 来源标注与注册真值一致（单测）；`site_*` 标注所属站点 origin；插件工具来源分类正确 | P1 |
| FR-V2-056 | **抑制态标注 + 可检索/过滤**：命令标注「当前是否被开关/授权状态抑制」（如 tabs 开关关、能力未授权/撤销、站点未授权）；可按档位/risk/来源检索过滤 | 抑制态与 `deriveTools()` 真值一致（单测）；检索/过滤可用且只读 | P1 |

### 5.6 SEC — 安全红线（横切，**必须落成 FR + 反向断言 AC**）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-V2-060 | **树是「可见性 + 撤销 + 受约束覆盖」面，硬底线不是提权面 [红线]〔R2·范围重定，以现状为准〕**：树内**撤销/关断**只调用既有 fail-closed 通路；**命令级覆盖**为独立通路，但**永不放宽** `riskDefaults`、4 条硬底线、`clipboard read` 状态档、`bookmarks remove` 自动授权排除——覆盖**必须经硬底线 clamp**（FR-V2-076）。**⚠️【R2·2026-09-13】** 原「树内**永不放宽**」的**绝对口径**收窄为「**硬底线永不放宽；非硬底线条目可由用户显式、被审计地放宽**」 | 安全专项单测 + 反向断言（AC-V2-005 / AC-V2-025）；无绕过 clamp 的放宽路径（grep/评审）；文案显式声明两条通路 | P0 |
| FR-V2-061 | **4 条硬底线不变，且不可被命令级覆盖绕过 [红线]〔R2·clamp 强化，以现状为准〕**：①未授权 origin 仍 `deny`（S1）②未知/缺失/非法 risk 仍 `deny`（S3 fail-closed）③ `evaluate` 仍 `deny`（设计硬底线）④破坏性写仍 `ask`（denylist，不纳入写自动）。**⚠️【R2·2026-09-13】** 追加**覆盖方向的反向断言**：即使用户显式覆盖为 `allow`，上述 4 条**仍按原硬底线生效**；`ui`/`state`/`external` 档不得被覆盖放宽（逐档结论表见 §5.7） | 反向断言：**覆盖为 allow 后** `evaluate` 仍 deny / 破坏性仍 ask / 未授权仍 deny / 未知 risk 仍 deny；`riskDefaults` 与 4 硬底线代码零 diff；clamp 结论表逐档单测 | P0 |
| FR-V2-062 | **`clipboard read` 状态档永不自动放行 + `bookmarks remove` 不纳入自动授权 [红线]**：`clipboard` 读为 `state` 档，「读操作自动」开启仍 `ask`；`bookmarks remove` 破坏性，写自动开启仍 `ask` | 反向断言：撤销后 / 自动授权开启时 `clipboard read` 仍 `ask`、`bookmarks remove` 仍 `ask`；`decideAutoAuthorization` 硬底线零改动 | P0 |
| FR-V2-063 | **撤销路径不得成为放宽门禁的旁路 [红线·安全复核]〔R2·边界澄清，以现状为准〕**：安全复核「**撤销路径不得成为放宽门禁的旁路**」；**撤销/关断**通路**不得**新增任何改变判定结果的路径。**⚠️【R2·2026-09-13】** 命令级**覆盖**通路**是一条显式、可逆、被审计、被 clamp 的正式通路，不是「旁路」**——判定「旁路」的标准 = **是否显式且被审计 + 是否经硬底线 clamp + 是否可恢复默认**；三者齐备即**不算旁路**。**禁止**任何**未审计 / 绕过 clamp / 不可恢复**的判定改写路径 | 安全复核记录（plan/spec 层登记）；单测证明**撤销前后**判定链真值不变（仅状态收紧）；覆盖通路具备「审计 + clamp + 可恢复」三件套（AC-V2-024/025） | P0 |
| FR-V2-064 | **未知/非法 risk fail-closed 展示为 `deny` 且不可被覆盖为 `allow` [红线]〔R2·clamp，以现状为准〕**：投影遇未知/非法 risk 一律展示为 `deny`（S3），**不可关**、**不可覆盖为 `allow`**。**⚠️【R2·2026-09-13】** 明确点名：展示为 `deny`/`s3` 的条目（如 `sleep` / `web-cli-help`，D-V21-02）**不在可覆盖集合内**——即使用户在树内设 `allow`，clamp 后仍 `deny`，且须**可读说明不可覆盖原因** | 未知 risk 命令展示 `deny` + 成因 S3（断言）；**覆盖为 allow 仍 deny（反向断言）**；硬底线节点无控件（FR-V2-077） | P0 |
| FR-V2-065 | **投影与审计零明文 [红线]**：树投影与新增审计**零明文**——不含 LLM key / 剪贴板内容 / 通知正文 / 页面数据；沿用 v1 脱敏口径 | 投影输出与审计 grep 零命中 key/剪贴板/通知明文（断言）；只记长度/路径等非敏感派生量 | P0 |

### 5.7 REV2 — R2 需求修订组（连接树真层级树 + 命令级用户覆盖层，FR-V2-070~079）

> **来源**：作者 2026-09-13 偏差反馈（**逐字引文见 §2.2b**）+ 编排器代作者决策 **D-OVERRIDE-2~6**（2026-09-13 授权）。本组横切 V2-1（模型）/ V2-2（UI）/ V2-3（操作）/ V2-4（档案）；**取代/作废**标注见各条与 §2.2⑤ / §3.2 NG-V2-001 / §8 AC-V2-005 注。

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-V2-070 | **连接树必须是真树形（层级 + 逐层展开/收起）[R2·取代 FR-V2-010 的实现形态]**：树按**归属（ownership）逐层分组、逐层可展开/收起**；形状须能表达作者两例——① `连接树 → 授权的站点 → 站点 xxx → （该站点）支持的命令 → 工具 → 子命令`；② `连接树 → 支持的命令 → 系统内置命令 → dom → dom read-state`；同类：`连接树 → 浏览器能力 → 可选能力/静态权限/隐私开关 → 具体条目`；`连接树 → LLM 连接 → 会话/分组 → 具体条目`。**不得再是「按维度分组的扁平列表」**（D-R2-01） | 模型/渲染模型为**父子层级**（非扁平 `rows`）；两个作者示例的**层级链逐层可展开/收起**；扁平列表形态零残留（断言，`test:ui`） | P0 |
| FR-V2-071 | **多归属（站点×命令、能力×命令为多对多）→ 主归属链 + 交叉引用徽标 [R2·D-OVERRIDE-4]**：**不得无限复制节点**；每个节点有**唯一主归属链**（`site_*` 命令主归属=所属站点；base/插件命令主归属=命令面按来源分组；能力工具主归属=能力面；LLM 主归属=LLM 面）；被其他归属引用时以**交叉引用徽标**呈现（如「亦被 N 个站点引用」），并**可从任一归属下钻到同一节点** | 多归属节点在树中**唯一**（节点 id 唯一，非复制）；主归属 + 交叉引用徽标可验证；从非主归属下钻可定位同一节点（断言） | P0 |
| FR-V2-072 | **展开状态语义 + 键盘可达 [R2·D-OVERRIDE-5]**：默认展开层级 = **根 + 一级默认展开，深层默认收起**；展开/收起状态**会话内保持**（同一抽屉会话内不因重投影丢失）；**键盘可达**（方向键/Enter 展开收起）且每层节点带 `aria-expanded` | 默认展开层级断言；会话内保持断言；键盘可展开/收起 + `aria-expanded` 正确（`test:ui`） | P0 |
| FR-V2-073 | **层级路径可读 + 大树可读性 [R2]**：逐层展开时**层级路径可读**（面包屑或等价的层级缩进语义）；在 **122 卡（28 工具 / 94 子命令）** 实时投影面下可逐层定位、归属语义不塌陷 | 层级路径可读断言；122 卡下逐层展开可定位；长文案零水平溢出（320px） | P0 |
| FR-V2-074 | **逐层可操作（工具级 + 子命令级）[R2·作者显式要求]**：命令面**至少两级**可设 `allow` / `ask` / `deny`——**工具级**（如 `dom`）与**子命令级**（如 `dom read-state`）；两级的**最终生效值**均经硬底线 clamp（FR-V2-076）后生效；工具级与子命令级**各自独立**（子命令可覆盖工具级默认） | `dom` 可设 allow/ask/deny；`dom read-state` 可设 allow/ask/deny（**作者示例必须达成**）；工具级与子命令级设置分别生效并可验证（AC-V2-023） | P0 |
| FR-V2-075 | **用户覆盖层 [R2·D-OVERRIDE-2]**：新增**用户覆盖层**，优先级 = **硬底线（不可覆盖）> 用户覆盖 > 默认 risk 档**；**持久化**（重载后仍在）；**可恢复默认（单条 + 全部）**；**幂等**；失败**可读**、**零静默失败**；**审计（零明文）**；覆盖变化**即时生效**并影响实际判定与工具面（**有可见后果**） | 覆盖持久化；单条/全部恢复默认可用；重复设置幂等；失败可读原因；覆盖变更入审计且零明文；覆盖后下一同档调用按新值执行 + 工具面/档案即时反映（AC-V2-024） | P0 |
| FR-V2-076 | **硬底线不可覆盖（clamp）[R2·D-OVERRIDE-3·红线 + 反向断言]**：① `evaluate` 档（`eval-js` / `page-eval` / `subagent` 等）**永不 allow**（v1 已永久冻结）② **未授权 origin 仍 deny（S1）** ③ **未知/非法 risk 仍 fail-closed deny（S3）** → 展示为 `deny`/`s3` 的条目（如 `sleep` / `web-cli-help`，D-V21-02）**不可被覆盖为 allow** ④ **破坏性子命令保底 `ask`**（沿用 v1 硬底线：破坏性操作即使用户覆盖为 `allow` 仍 `ask`）⑤ `ui` / `state` / `external` 档的既有语义**不得被覆盖放宽**（逐档结论表见下）。**`dom` / `dom read-state` 不在红线内 → allow/ask/deny 三档全可用** | 反向断言（AC-V2-025）：覆盖为 allow 后 `evaluate` 仍 deny / 未授权 origin 仍 deny / 未知 risk 仍 deny / 破坏性仍 ask / `ui`·`state`·`external` 不得为 allow；逐档 clamp 结论表单测；`PLUGIN_RISK_DEFAULTS` / 4 硬底线代码零 diff | P0 |
| FR-V2-077 | **`deny` 节点控件语义反转（区分硬底线 / 非硬底线）[R2·部分取代 ADR-V2-011]**：**硬底线 deny**（evaluate / S1 / S3 / fail-closed）→ **仍无控件**（不可放宽），并**可读展示不可覆盖的原因**；**非硬底线 deny**（用户自设 deny 等）→ **有控件**，可改回 `allow`/`ask`。**取代原「`deny ⇒ controls: []` 恒成立」**（原 ADR-V2-011 的该部分由 plan 重开/替代） | 硬底线 deny 节点零控件 + 不可覆盖原因可读（断言）；非硬底线 deny 节点有 allow/ask 控件且可改回（断言）；分层断言；`denyPriority` 语义不变 | P0 |
| FR-V2-078 | **删除偏差文案 + 保留 `delay` 消歧 [R2]**：spec 与 UI 中「**不提供命令级写入**」「**只读展示：命令级策略不可在树内修改**」的表述**必须被替换**（偏差产物）；`delay`（= `deny`）的**消歧措辞保留**（单源 `TREE_NO_ESCALATION_NOTE`，见 ADR-V2-019），并须与「命令级可覆盖」新语义**相容**——**可覆盖的是「命令的策略值」，不是 `delay` 档位**（`delay`/`deny` 仍非可配置档位） | grep：偏差文案零命中；`delay` 消歧句仍完整（单源 + 内容哈希 pin）；无「第三档位」暗示 | P0 |
| FR-V2-079 | **覆盖面口径分列、不得夸大 [R2]**：树内命令面覆盖**实时投影面（当前 28 工具 / 94 子命令 = 122 卡）**；**parity 基线（34 工具 / 142 子命令）**为**独立口径分列**；两者与 P0 一致；**禁止**「34/142 已全部渲染」类表述 | 实时面 122 卡逐条可有控件；基线 34/142 与实时面 28/94 分列展示（`accounted` 口径不渲染）；「已全部渲染」类表述零命中（断言） | P0 |

**硬底线 clamp 逐档结论表（D-OVERRIDE-3，**必须逐档落成单测**）**

| 档 / 类别 | 默认处置 | 可覆盖为 `allow` | 可覆盖为 `ask` | 可覆盖为 `deny` | 结论 |
|-----------|:--:|:--:|:--:|:--:|------|
| `read` 档（非硬底线，如 `dom read-state`） | allow | ✅ | ✅ | ✅ | **三档全可用** |
| `write` 档·非破坏性（如 `dom` 工具级） | ask | ✅（用户显式、被审计的放宽） | ✅ | ✅ | **三档全可用** |
| 破坏性子命令（`DESTRUCTIVE_VERBS` / `hardDeny`） | ask | ⚠️ 可设但 **clamp 为 `ask`** | ✅ | ✅ | **保底 `ask`，不可放宽为 `allow`** |
| `ui` 档 | ask | ❌ 不得放宽 | ✅ | ✅ | **不可覆盖为 `allow`**（收紧仍可） |
| `state` 档（含 `clipboard read`） | ask | ❌ 不得放宽 | ✅ | ✅ | **不可覆盖为 `allow`**（收紧仍可） |
| `external` 档 | ask | ❌ 不得放宽 | ✅ | ✅ | **不可覆盖为 `allow`**（收紧仍可） |
| `evaluate` 档（`eval-js` / `page-eval` / `subagent`） | deny | ❌ | ❌ | ❌ | **不可覆盖（永不 `allow`）** |
| 未授权 origin（S1） | deny | ❌ | ❌ | ❌ | **不可覆盖（仍 deny）** |
| 未知/非法 risk（S3，如 `sleep` / `web-cli-help`） | deny | ❌ | ❌ | ❌ | **不可覆盖（fail-closed）** |
| **`dom`（工具级）** | ask | ✅ | ✅ | ✅ | **三档全可用（作者示例）** |
| **`dom read-state`（子命令级）** | allow | ✅ | ✅ | ✅ | **三档全可用（作者示例）** |

> **【R2 说明 · 2026-09-13】** 表中「可覆盖为 `ask`/`deny`」对 `ui`/`state`/`external` 属**收紧方向**（不放宽），保留可用；「❌ 不得放宽」仅指**不得覆盖为 `allow`**（编排器代作者决策，2026-09-13 授权）。**`dom` / `dom read-state` 不在任何红线内**，作者示例的 `ask`/`allow`/`deny` 三档设置**必须全部可达**。

---

## 6. 非功能需求 (NFR)

| ID | 类别 | 需求描述 | 验收标准 |
|----|------|---------|---------|
| NFR-V2-001 | 性能·体积守卫 | **`sidepanel.js` 设基线回归守卫**：树 UI/投影会加大 `sidepanel.js`（v1 当前实测 **1,068,165 B**）——守卫 **基线 ≠ 目标预算**（沿用 v1 第 9 轮修 perf-budget 虚绿门禁做法：`catch` **只吞 `ENOENT`**、其余错误必须抛出；**反证自测**：故意超限必须 FAIL）；基线在 build 后实测登记，不得以基线值宣布任何目标达成 | 体积守卫单测（含反证自测）；超限即 FAIL；基线值与测量日期/来源登记；目标预算与回归基线**分列记录** |
| NFR-V2-002 | 零注入 | **不加重 `content.js`**：零注入方案（侧栏 + 树抽屉）**不得**改变页面注入面；`dist/content.js` ≤ v1 基线 `1,073,453 B`（**不触碰 NFR-007 未达成项 D31**） | `content.js` 体积断言（≤ 基线）；静态 `content_scripts` 零新增；无 `<all_urls>` |
| NFR-V2-003 | 权限最小化 | **静态 `permissions` 零新增**（维持 5 项）；不新增任何权限/依赖 | `manifest.json` 静态权限 diff 为空；依赖零新增（`package.json`） |
| NFR-V2-004 | 布局回归（量化） | **侧栏布局不回退**：composer 贴底、`#log` 高度不回退、窄侧栏零水平溢出（精确阈值见 AC-V2-002）；断言**只增不减** | `test:ui` 量化断言全绿；v1 既有断言零删减 |
| NFR-V2-005 | 性能 | 树投影与侧栏渲染开销受控：投影为纯读、不阻塞侧栏主流程；抽屉按需渲染；无操作时常驻开销最小 | 投影同步耗时受控（单测基准）；抽屉关闭态无额外渲染；无长任务阻塞 |
| NFR-V2-006 | 安全·隔离 | 投影/审计零明文（key/剪贴板/通知/页面数据）；key 不进树、不进审计；站点脚本不可读取插件状态 | 明文 grep 零命中；key 不进投影（断言） |
| NFR-V2-007 | 可用性 | 操作简单、文案可读（用户语言，非技术术语）；关键状态（已授权/未授权/可撤销/deny 成因/`delay` 消歧）用户可见 | 文案评审；可读断言；从入口到撤销 ≤2 次点击 |
| NFR-V2-008 | 可测试性 | 机械可验证面最大化（投影快照 / 142 子命令对账 / 撤销链 / 布局量化）；**真实浏览器人工面显式清单** | 可自动化面覆盖；人工面清单明确（悬浮观感/拖动/动画/明暗/长文案拥挤） |
| NFR-V2-009 | 门禁纪律 | **串行**跑 `test` / `test:ui` / `test:binding`（本仓库 **OOM 前科，绝不并发**）；全仓 0 fail；`web-cli-base` 483 零回归 | 门禁串行执行记录；全仓 0 fail；base 483 零回归 |
| NFR-V2-010 | 上游零改动 | `packages/web-cli-base/**` git diff 为空；上游既有行为零回归；`tsc` 0 error | git diff 断言；base 测试零回归；`tsc --noEmit` 0 error |
| NFR-V2-011 | 可访问性 **[R2 新增]** | 树形层级**键盘可达**：方向键/Enter 展开收起、焦点可见、每层节点 `aria-expanded` 正确；层级路径对读屏可理解 | `test:ui` 键盘遍历 + `aria-expanded` 断言；焦点可见断言 |
| NFR-V2-012 | 覆盖层数据完整性 **[R2 新增]** | 用户覆盖层**持久化 + 幂等 + 可恢复默认（单条/全部）**；覆盖变更**审计零明文**；**失败不产生半写状态**（要么生效要么可读失败） | 持久化/幂等/恢复默认单测；审计零明文 grep；半写防护断言 |

---

## 7. 边界情况 (EC)

| ID | 场景 | 处理方式 |
|----|------|---------|
| EC-V2-001 | 无活跃站点 / 无绑定 origin 时打开树 | 树仍可打开，站点分组显示可读空态与「下一步」（点图标授权 / 切到目标站点）；不报错、不静默 |
| EC-V2-002 | 站点取消授权时 `removeOriginPermission` 失败 | **可读失败原因** + 下一步；`OriginStore.revoke` 与内容脚本注销**分别如实报告**（不因一项失败而假装全部成功）；入审计 |
| EC-V2-003 | 取消授权成功但 content-script 注销/对账失败 | 授权状态已撤销（如实呈现），注销失败**单独可读披露** + 对账重试提示；不静默、不把失败渲染成成功 |
| EC-V2-004 | `removeCapabilityPermission` 失败或上下文不支持（`chrome.permissions.remove` 不存在） | 返回可读「当前上下文不支持…」；能力状态**保持不变**（不假装已撤销）；入审计 |
| EC-V2-005 | `permissions.onRemoved` 事件竞态（撤销后事件晚到/先到） | 显式 `permission-changed` 重对账兜底——工具仍**即时移出** + 审计落地（即便事件竞态）；重复对账幂等 |
| EC-V2-006 | 静态 `permissions` 被请求撤销（技术不可行） | 显示「不可逐项撤销，需停用/卸载扩展」的**如实披露**；**不提供**撤销按钮；只给隐私开关（FR-V2-038） |
| EC-V2-007 | LLM 未配置 / 清除 key 失败 | 未配置显示可读空态 + 配置指引（不显示假连接）；清除失败给可读原因，`hasKey` 状态不假装翻转 |
| EC-V2-008 | 投影时 `chrome.storage` 读失败 | 降级为可读态（不静默、不把读失败当作「空/已撤销」）；沿用 v1 各 store 的 fail-safe 默认（不因读失败而放宽） |
| EC-V2-009 | 树中命令集合与 `deriveTools()` / 基线漂移（新增/丢失） | 对账门禁 **FAIL**（新增/丢失命令即失败）；树以 `deriveTools()` + registry 为真值；不掩盖漂移 |
| EC-V2-010 | 命令 risk 未知/非法/缺失 | 展示为 `deny` + 成因 S3 fail-closed（不可关）；与 `policy.ts` 真值一致 |
| EC-V2-011 | 会话组解散影响正在进行的对话 | 解散后会话键正确回退、成员列表同步；**不静默丢历史**（如有待决 `confirm`/`ask-user` 按 v1 EC-019 fail-closed 处理）；明示「分组≠授权」 |
| EC-V2-012 | 窄侧栏 / 长文案 / 长站点名导致的水平溢出 | 零水平溢出（320px 断言）；`overflow-wrap:anywhere` 等既有约定复用；长文案截断/换行可读 |
| EC-V2-013 | 树打开状态下后台状态变化（他处撤销/开关变更/会话切换） | 树订阅既有状态推送（如 `capability-changed`/`session-changed`/`probe-changed`）**即时重投影**；不显示陈旧状态；无法订阅时给出刷新路径 |
| EC-V2-014 | 用户在树内快速重复点击撤销 | 幂等处理（重复撤销返回可读「已撤销」而非假成功/报错刷屏）；不产生重复审计噪音 |
| EC-V2-015 | 用户误读「可操作 = 可提权」 | 文案显式声明「撤销/关断 = 收紧，不放宽」；`delay`/`deny` 无开关；AC-V2-005 反向断言钉死 |
| EC-V2-016 | 关闭自动授权后下一次同档位调用 | 立即恢复人工 `ask`（无需重启/重载）；审计体现设置变更（`auto-authorize/disabled`）与后续 `confirm`；**不撤销站点授权** |
| EC-V2-017 | **[R2] 用户覆盖命中硬底线（如把 `evaluate` / `sleep` / 未授权 origin 条目设为 `allow`）** | **clamp 生效**：最终仍按硬底线（`deny` / 保底 `ask`）执行；**可读说明「被硬底线拒绝/降级，不可覆盖」**；**不静默、不假装已 allow**（FR-V2-039/076） |
| EC-V2-018 | **[R2] 覆盖层存储读失败 / 写失败** | **fail-safe**：读失败**不当作「无覆盖」以外的放宽**——按默认 risk 档 + 可读披露「覆盖暂不可读」；写失败**不产生半写状态**，回执可读原因；**绝不因失败而放宽**（沿用 EC-V2-008 精神） |
| EC-V2-019 | **[R2] 多归属节点从非主归属下钻** | 下钻到**同一节点**（节点 id 一致、路径可读），**不产生副本**；交叉引用徽标显示引用数（FR-V2-071） |
| EC-V2-020 | **[R2] 后台重投影时用户正在逐层展开** | 展开/收起状态**会话内保持**（不因重投影复位）；新增/消失节点如实更新（不显示陈旧节点）；性能受控（NFR-V2-005） |

---

## 8. 验收标准（总体验收清单）

> **重点**：本清单显式包含 ① **安全反向断言**（AC-V2-003/005）② **侧栏回归量化断言**（AC-V2-002）③ **体积基线守卫**（AC-V2-006）。所有门禁**串行**执行，**绝不并发**。**[R2 追加]** ④ **树形/可操作性新增 AC-V2-020~027**（真层级树 / 多归属 / 展开可访问 / 命令级覆盖 / 覆盖工程属性 / 硬底线 clamp / deny 控件分层 / 偏差文案清除）；**AC-V2-005 范围已重定**（allow 单调性只管撤销/关断）。

| # | 验收项 | 验证方式（可自动化优先） | 关联 |
|----|--------|--------------------------|------|
| AC-V2-001 | **V2-1 投影正确性**：四层分组（森林）模型确定性快照；树命令集合 == `deriveTools()` + registry（不重不漏）；零明文（无 key/剪贴板/通知内容）；`state` 消息 additive 兼容 | node 单测：确定性投影快照；双向集合对账；明文 grep 零命中；`state` 消息回归断言 | FR-V2-010~017, NFR-V2-006 |
| AC-V2-002 | **V2-2 悬浮树 UI + 侧栏布局回归量化**（`test:ui`，真实 dist，视口 **400×900**，**断言只增不减**）：① 悬浮入口存在且可开合；② 抽屉四维度可见 + 状态徽标；③ 空态/降级可读；④ **`#log` `flex-grow = 1`**（非 45vh 硬编码）；⑤ **`#log` 稳态 `clientHeight` ≥589px（主断言）且占比 ≥65.0%（次断言，v1 基线 65.44% 留 0.44pp 余量）**（不得回退）；⑥ **`composer` 底边 − 视口底 ∈ [0, +8px]**（贴底，**不得为负 = 不得被挤出视口**，D-079 回归）；⑦ **悬浮入口 boundingRect 与 `#composer` boundingRect 不相交**（无遮挡）；⑧ **文档级水平溢出 = 0**（400px 与 **320px** 窄栏）；⑨ v1 既有 `#15a~#15q` 断言**零删减** | `npm run test:ui`（串行）：上述 ①~⑨ 全绿；既有断言计数**只增不减** | FR-V2-020~025, NFR-V2-004/007 |
| AC-V2-003 | **V2-3 撤销与取消授权链**（`test:binding`，真实 dist + 真实站点）：站点取消授权 → 工具面**即时移出** + 审计；可选能力 `permissions.remove` → 工具移出 + 审计；开关关断 → `deriveTools()` 无该工具；**硬底线不被撤销面绕过** | `npm run test:binding`（串行）：三类撤销链 + 反向断言（见 AC-V2-005）全绿 | FR-V2-030~040, NFR-V2-009 |
| AC-V2-004 | **V2-4 命令档案齐全**：**142 子命令逐条有档**（工具 34/34）；判定表与 `policy.ts` / `auto-authorize.ts` 真值一致；`deny` 三成因（S1/S3/evaluate + hardDeny）分类正确；与 `test/parity.test.ts` 同源，新增/丢失命令即失败 | node 单测 + 对账门禁：142 子命令覆盖率 100%；判定表一致性；deny 分类正确；parity 双向 FAIL 能力 | FR-V2-050~056, NFR-V2-008 |
| AC-V2-005 | **安全红线反向断言（原文钉死）〔R2·范围重定，见下注〕**：撤销/关断后——**① 未授权 origin 仍 `deny`（S1）**；**② 未知/非法 risk 仍 `deny`（S3 fail-closed）**；**③ `evaluate` 仍 `deny`**；**④ 破坏性写仍 `ask`**；**⑤ `clipboard read`（state 档）仍 `ask`（永不自动放行）**；**⑥ `bookmarks remove` 仍 `ask`（不纳入写自动）**；且 `PLUGIN_RISK_DEFAULTS` / 4 硬底线代码**零 diff**。**⚠️【R2·2026-09-13 范围重定】** 本条的 **allow 单调性（`allowAfter ⊆ allowBefore`）只约束「撤销/关断类动作」**；**用户显式覆盖是一次「有意的、被审计的放宽」，属另一条独立通路（FR-V2-075），不得用 allow 单调性否定它**；覆盖类另立 AC-V2-023~026 | 单测：撤销/关断/自动授权开启等各状态下逐条反向断言（①②③④⑤⑥）；`policy.ts`/`auto-authorize.ts` git diff 为空；**allow 单调性仅在撤销/关断场景断言，覆盖场景另测（AC-V2-024/025）** | FR-V2-036/060~065/076, NFR-V2-006 |
| AC-V2-006 | **体积基线守卫（基线 ≠ 目标预算）**：`sidepanel.js` 设回归基线（build 后实测登记，v1 当前 1,068,165 B）+ 容差；`content.js` **不增长**（≤ 1,073,453 B）；守卫**只吞 `ENOENT`**、其余错误必须抛出；**反证自测**（故意超限必须 FAIL）；**不得以基线值宣布 NFR-007 目标达成** | node 单测：基线守卫 + 反证自测；`content.js` 体积断言；目标预算与回归基线分列记录 | NFR-V2-001/002 |
| AC-V2-007 | **零新权限 / 零注入 / 不动 base / 不改 options**：`manifest.json` 静态权限 diff 为空；无 `<all_urls>` / 无新增静态 `content_scripts`；`packages/web-cli-base/**` diff 为空；`options.html` diff 为空；依赖零新增 | git diff 断言 + grep 断言 + `package.json` 依赖核对 | FR-V2-002/004, NFR-V2-002/003/010 |
| AC-V2-008 | **树 ≠ 设置面板（边界）**：树与设置面板是两个可分别打开的并列界面；树可在**不打开设置面板**的情况下使用；设置面板既有入口/行为零回归 | `test:ui`：树独立开合断言；设置面板回归断言零删减；`options.html` 零 diff | FR-V2-004, NG-V2-006 |
| AC-V2-009 | **v1 记录保护**：v1 `state.json` 的 `phase`/`status`/`updatedAt` 零变更；v2 全部内容在新目录；父 Feature 未执行 tasks/build/review/validate；4 子 Feature 均为叶子 | git diff 断言（v1 目录零变更）；父/子 `state.json` 结构核对 | FR-V2-001, G-V2-007 |
| AC-V2-010 | **`delay` 撞词消歧**：命令档案文案同一处并标「`delay`（= `deny`，fail-closed，非可配置档位；与命令间 `delayMs` 无关）」；`delayMs` 独立列示；无「第三档位」暗示 | UI/档案文案 grep 断言；`delayMs` 与档位分列展示断言 | FR-V2-054, EC-V2-015 |
| AC-V2-011 | **门禁串行 + 全仓 0 fail**：`test` / `test:ui` / `test:binding` **串行**执行；全仓 0 fail；`web-cli-base` **483 零回归**；`tsc` 0 error | 串行执行记录 + 基线核对 + `tsc --noEmit` | NFR-V2-009/010 |
| AC-V2-012 | **范围纪律（NG 核验）〔R2·NG-V2-001 已作废/改写，见 §3.2〕**：**原 NG-V2-001（不做命令级覆盖）作废/改写**（依据作者 2026-09-13 反转，NG-V2-001R = 不做无审计的命令级放宽 / 不做绕过硬底线的覆盖）。**其余 NG 逐项核验未越界且未被顺手放开**：不做静态权限假撤销（002）/ 不做页面注入层（003）/ 不做树内改绑 LLM（004）/ 不改判定链·不改 `riskDefaults`·不改 4 硬底线·不碰 base（005）/ 不改 options·不重构设置面板（006）/ 不解决 NFR-007 遗留项（007）/ 不新增依赖权限（008）/ 不合 main 不发布（009）/ 不改 v1 文件（010）。**且命令级覆盖必须经硬底线 clamp（不得越界为「绕过硬底线」）** | NG 清单逐项 grep/评审；**NG-V2-001R 未越界（无无审计放宽 / 无绕过 clamp 路径）**；其余 NG（002~010）越界项为零 | NG-V2-001/001R、NG-V2-002~010, §3.2 |
| AC-V2-020 | **[R2] 真树形层级 + 逐层展开（作者两例逐层验证）**：模型/渲染为父子层级（非扁平列表）；**作者示例①** `连接树 → 授权的站点 → 站点 xxx → 该站点支持的命令 → 工具 → 子命令` 与**示例②** `连接树 → 支持的命令 → 系统内置命令 → dom → dom read-state` 的**每一层均可展开/收起**且叶子可定位 | `test:ui`（真实 dist）：两例逐层展开断言；扁平列表形态零残留；`test:insight`：模型为层级结构（非 `rows` 扁平） | FR-V2-010/021/070 |
| AC-V2-021 | **[R2] 多归属主链 + 交叉引用徽标（不复制节点）**：多归属节点在树中**唯一**；主归属链明确；交叉引用徽标（如「亦被 N 个站点引用」）正确；从非主归属下钻到**同一节点** | node 单测：节点 id 唯一性 + 主归属判定；`test:ui`：交叉引用徽标 + 下钻同一节点 | FR-V2-071, EC-V2-019 |
| AC-V2-022 | **[R2] 展开状态 + 键盘可达 + 层级路径可读**：根 + 一级默认展开、深层默认收起；会话内保持；键盘可展开收起 + `aria-expanded`；层级路径（面包屑/缩进语义）可读；122 卡下可逐层定位 | `test:ui`：默认展开断言 / 会话保持断言 / 键盘遍历 + `aria-expanded` / 路径可读 / 122 卡逐层定位 | FR-V2-072/073, NFR-V2-011, EC-V2-020 |
| AC-V2-023 | **[R2] 命令级覆盖可达（作者示例必须达成）**：工具级（`dom`）与子命令级（`dom read-state`）**均可设 `allow`/`ask`/`deny`**；两级各自独立生效；覆盖后**实际判定 + 工具面/档案即时反映**（有可见后果） | `test:insight`/单测：`dom` 三档设置生效；`dom read-state` 三档设置生效；覆盖后下一同档调用按新值执行；档案/树即时反映 | FR-V2-074/075, EC-V2-017 |
| AC-V2-024 | **[R2] 覆盖层工程属性**：**持久化**（重载后仍在）/ **恢复默认（单条 + 全部）** / **幂等** / 失败**可读**且**零静默失败** / **审计零明文** / **无半写状态** | node 单测 + 集成：持久化 / 单条恢复 / 全部恢复 / 重复设置幂等 / 失败路径可读（≥3 类）/ 审计零明文 grep / 半写防护 | FR-V2-075/039, NFR-V2-012, EC-V2-018 |
| AC-V2-025 | **[R2] 硬底线 clamp 反向断言（原文钉死）**：即使用户把条目覆盖为 `allow`——**① `evaluate` 仍 `deny`**；**② 未授权 origin 仍 `deny`（S1）**；**③ 未知/非法 risk 仍 `deny`（S3，含 `sleep` / `web-cli-help`）**；**④ 破坏性子命令仍保底 `ask`**；**⑤ `ui`/`state`/`external` 档不得变为 `allow`**；逐档结论表**逐行单测** | 单测：逐档覆盖为 allow 后反向断言（①~⑤）；逐档 clamp 结论表逐行；`PLUGIN_RISK_DEFAULTS` / 4 硬底线代码零 diff；clamp 降级可读 | FR-V2-061/064/076, NFR-V2-006 |
| AC-V2-026 | **[R2] `deny` 控件分层**：**硬底线 deny** 节点**零控件** + **不可覆盖原因可读**；**非硬底线 deny** 节点**有 allow/ask 控件**且可改回；无绕过 clamp 的写入路径 | `test:ui`/`test:insight`：硬底线节点零控件 + 原因文案；非硬底线节点控件齐备 + 可改回；grep 无绕过 clamp 写入 | FR-V2-052/077, EC-V2-017 |
| AC-V2-027 | **[R2] 偏差文案清除 + `delay` 消歧保留 + 覆盖面不夸大**：「不提供命令级写入」「只读展示：命令级策略不可在树内修改」**零命中**；`delay` 消歧句仍完整（单源 `TREE_NO_ESCALATION_NOTE`，内容哈希 pin）；实时面 122 卡 vs 基线 34/142 **分列**；「34/142 已全部渲染」类表述**零命中** | grep 断言（偏差文案零命中 / 消歧句完整 / 夸大表述零命中）；口径分列断言 | FR-V2-078/079/050, ADR-V2-019 |

> **【AC-V2-005 范围重定注 · R2 · 2026-09-13 · 来源：作者 2026-09-13 反馈 + 编排器代作者决策 D-OVERRIDE-6】** 本条（原「安全红线反向断言」）在实现门禁中被用于「**allow 单调性 `allowAfter ⊆ allowBefore`**」。**R2 起必须限定范围**：allow 单调性**只约束撤销/关断类动作**（站点取消授权 / 能力撤销 / 开关关断 / 自动授权关断 / LLM 断开 / 会话组解散）；**用户显式命令级覆盖是一次「有意的、被审计的放宽」**（FR-V2-075），属**另一条独立通路**，**不得**用 allow 单调性去否定它。**覆盖类验收另立 AC-V2-023~026**（覆盖可达 / clamp 生效 / 可恢复 / 幂等 / 审计）。**原 AC-V2-005 的 ①~⑥ 反向断言全部保留**（作为撤销/关断场景的硬底线证明）。

> **【AC-V2-002 口径订正 · 2026-09-13 · 来源 ADR-V2-006（编排器代作者决策，2026-09-13 授权）】** 本条 ⑤ 原为「`#log` 稳态高度占比 **≥65.5%**」，但 v1 实测基线 `589/900 = **65.44% < 65.5%**`——逐字执行会在 v1 基线上**必然失败**（属**口径自相矛盾**，非布局回归）。故订正为「**`#log` 稳态 `clientHeight` ≥589px（主断言，绝对量）且占比 ≥65.0%（次断言，保守下限）**」：589px 与 `composer ∈[0,+8px]` 均为**可证伪硬阈值**，门禁不因此空洞。订正依据 = 父 `plan.md` **ADR-V2-006**（侧栏不回退量化口径 + §3.3 口径说明 + §5 D10 决策登记）。**本次仅订正 AC-V2-002 本条**，其余 FR/NFR/EC/AC 条文不变。

> **【AC-V2-002 测量条件补注 · 2026-09-13 · D-V22-01（V2-3 最小补注；不删除原有数值）】** 本条 ⑤ 的 589px / 65.0% 阈值须在明确的**测量条件**下执行：**(a) 去镀铬稳态**（隐藏 `#site-hint`/`#onboarding`/`#discovery-notice`/`#consent-slot`/`#send-reason`）= `test:insight` 主/次断言口径，当日实测 **674px / 74.9%**（≥ 589px / 65.0% 通过）；**(b) v1 口径**（仅隐藏导航条）= 另加断言 `#log ≥405px`（v1 自身 `>45vh` 下限），证明**零回归**；**(c) 抽屉开/关逐字段相等（drift=0）**证明 V2-2 覆盖层不改变稳态几何。来源/明细 = `docs/dev.md` §11.3 口径订正注 + `specs-tree-v2-2-floating-tree-ui/build.md` §5.1/§6。**本补注只增不改，原数值全部保留**。

---

## 9. 明确不做项（登记以防范围蔓延）

| # | 明确不做 | 依据 |
|---|---------|------|
| NG-V2-001 | ~~**命令级策略覆盖**（树内改单条命令的 allow/ask/deny）~~ **【R2·2026-09-13 作废/改写，以现状为准】** —— 原依据 = 作者裁决⑤未选；**已被作者 2026-09-13 最新指令反转**（逐字见 §2.2b）。**改写后新非目标 NG-V2-001R = 不做无审计的命令级放宽 / 不做绕过硬底线的覆盖** | FR-V2-074~077（做覆盖）+ FR-V2-076/AC-V2-025（clamp 不可绕过）；依据 = §2.2b 作者反馈 + 编排器代作者决策 D-OVERRIDE-2/3（2026-09-13 授权） |
| NG-V2-002 | **静态 `permissions` 逐项撤销**（假装可撤销） | Chrome 需停用/卸载扩展，技术不可行；只做隐私开关 + 如实披露 |
| NG-V2-003 | **页面注入悬浮层**（在站点页面注入悬浮树） | 作者裁决②未选；与 v1 无 `<all_urls>` / 无静态 `content_scripts` 红线冲突；未授权站/`chrome://` 无法注入 |
| NG-V2-004 | **树内改绑 LLM 配置（写路径）** | v1 侧栏已能配置；v2 默认只做「可见 + 断开」；改绑入树需作者另行批准 |
| NG-V2-005 | **重写框架 / 改判定链 / 改 `riskDefaults` / 改 4 硬底线 / 碰 base** | 安全红线（FR-V2-003/036/060/061）；红线「禁改 `packages/web-cli-base/**`」 |
| NG-V2-006 | **改 `options.html` / 设置面板重构 / 推翻 TASK-033** | 作者裁决③；复用实现 ≠ 放进设置面板 |
| NG-V2-007 | **解决 v1 遗留未达成项**（`content.js` 1.07MB / `options.html` 未薄壳化） | v2 反而要求**不加重** `content.js`；未达成项 D31 登记原样保留 |
| NG-V2-008 | **新增依赖 / 新增权限** | 零新权限、零注入、无新依赖（FR-V2-002） |
| NG-V2-009 | **合 main / 发布 / force push / `git add -A` / 改 `.opencode/opencode.json`** | 提交纪律（FR-V2-005） |
| NG-V2-010 | **修改 v1 的任何文件**（`specs-tree-web-cli-plugin/**`） | v1 记录保护（FR-V2-001） |

---

## 10. 子 Feature 拆分与交付顺序

> **结构（作者确认 2026-09-13）**：**父 Feature（轻量规范容器）+ 4 个叶子子 Feature**。子目录**直接嵌套**在父目录下，命名遵循 `specs-tree-<子特性名>`，**不使用 `children/` 等中间目录**。**父 Feature 不执行 tasks/build/review/validate**；4 个子 Feature 均为**叶子**（可独立走 SDDU 全流程）。**交付顺序 P0 先行**：V2-1 → V2-2 → V2-3 为 P0 闭环（「可见 + 可操作」）；V2-4 为 P1 后段。

| 子 Feature | 目录 | 目标 | 覆盖 FR（父 spec） | 优先级 | 建议进入阶段 |
|-----------|------|------|-------------------|:--:|-------------|
| **V2-1 连接树数据模型与状态投影** | `specs-tree-v2-1-connect-tree-model/` | 把四维度聚合为**单一可投影的树模型**（确定性「当前状态 → 树节点」映射与快照），供全部 UI 消费；**纯读、零副作用、不渲染 UI**；**[R2] 输出真父子层级 + 多归属主链 + 覆盖生效档/clamp 原因** | FR-V2-010~017 + **[R2] FR-V2-070/071/079（模型侧）** | **P0** | plan（R2 重走） |
| **V2-2 悬浮连接树 UI 与交互** | `specs-tree-v2-2-floating-tree-ui/` | 侧栏**常驻悬浮入口**（FAB / 浮动按钮）+ **树抽屉**：四维度层级导航、检索/过滤、状态徽标、**操作简单**（少层级、可直达）；**[R2] 真层级树逐层展开/收起 + 键盘可达 + 层级路径可读 + 两通路文案** | FR-V2-020~025 + **[R2] FR-V2-072/073/077/078（UI 侧）** | **P0** | plan（R2 重走） |
| **V2-3 撤销与取消授权操作面** | `specs-tree-v2-3-revoke-ops/` | 树内**就地执行**：站点取消授权 / 可选能力单能力撤销 / 隐私开关 / 自动授权关断 / LLM 断开 / 会话组解散；**撤销后有可见后果**（回执 + 工具面证据 + 审计）；**[R2] 命令级用户覆盖层（工具级 + 子命令级，allow/ask/deny，持久化/恢复默认/幂等/审计）+ 硬底线 clamp** | FR-V2-030~040、FR-V2-060~065 + **[R2] FR-V2-074/075/076（操作侧）** | **P0** | plan（R2 重走） |
| **V2-4 命令档案浏览器** | `specs-tree-v2-4-command-archive/` | **每条 CLI 命令**的处置档档案（`allow`/`ask`/`delay(=deny)` + risk + 来源 + `delayMs` + 抑制态）；`deny` 三成因分列可读；可检索/过滤；**[R2] 默认档 vs 覆盖生效档分列 + deny 控件分层 + 覆盖面口径分列** | FR-V2-050~056 + **[R2] FR-V2-077/079（档案侧）** | **P1**（后段） | plan（R2 重走） |

**子 Feature 边界（做什么 / 不做什么）**

| 子 Feature | ✅ 做什么 | ❌ 不做什么 |
|-----------|----------|-------------|
| V2-1 | 四维度 → 树模型确定性投影快照；命令集合对账（== `deriveTools()` + registry）；零明文；`state` 消息 additive 扩展；**[R2] 真父子层级模型 + 多归属主链/交叉引用 + 默认档与覆盖生效档分列 + clamp 原因字段** | 不改 `policy.ts` 判定链 / `riskDefaults` / 4 硬底线；不新增权限；不碰 base；不渲染 UI；不做任何写操作（含覆盖写入——归 V2-3） |
| V2-2 | 侧栏内渲染悬浮入口 + 树抽屉（复用 v1 三区 flex 全高布局与 `ui/settings/*` **实现**）；明暗适配；窄侧栏零水平溢出；空态/降级可读；**[R2] 真层级树逐层展开/收起 + 键盘可达 + 层级路径可读 + 两通路文案 + 偏差文案清除** | 不做页面注入悬浮层；不放进设置面板；不改 `options.html`；不遮挡 composer；不做写操作（撤销/覆盖操作面归 V2-3） |
| V2-3 | 复用既有 ops 就地撤销（站点级 + 能力级 + 开关 + 自动授权关断 + LLM 断开 + 会话组）；回执 + 工具面证据 + 审计入口；静态权限不可撤销如实披露；**[R2] 命令级用户覆盖层（工具级 + 子命令级）** | ~~不做命令级策略覆盖~~（**【R2 作废，以现状为准】**）；**[R2 新约束] 不做无审计的放宽、不做绕过硬底线 clamp 的覆盖**；不新增权限；不放宽硬底线；不假装静态权限可撤销；不引入静默失败/假成功 |
| V2-4 | 34 工具 / 142 子命令逐条有档；deny 三成因分列；与 parity 同源机器对账；`delay` 消歧；可检索/过滤；**[R2] 默认档 vs 覆盖生效档分列 + deny 控件分层 + 覆盖面口径分列（实时面 122 卡 vs 基线 34/142，不夸大）** | 不把**硬底线** `deny` 渲染成可关开关；**[R2] 非硬底线 `deny` 可改回（有控件）**；不预设站点 runtime 行为（档案只读真值）；不做绕过 clamp 的写入 |

**里程碑（ROADMAP M-V2-1~4 对齐）**：M-V2-1 只读连接树可查（V2-1 + V2-2）→ M-V2-2 树内可就地操作（V2-3）→ M-V2-3 命令档案齐全（V2-4）→ M-V2-4 v2 收口（**不合 main、不发布**）。

---

## 11. 开放问题

### 11.1 本次立项已向作者确认的问题（2026-09-13，均已答复，不再开放）

| # | 问题 | 作者答复（**已确认**） | 规范落点 |
|---|------|----------------------|---------|
| 1 | 「连接树」是严格树还是森林/分组视图 | ✅ **四层分组视图 / 森林**（以「本插件」为根的四个并列分组，允许跨层引用，并如实说明「不是严格树」）。**⚠️【R2·2026-09-13 已被作者最新指令修正，以现状为准】** 作者 2026-09-13 反馈要求「**至少是树形的展示**」「**按归属逐层展开**」→ 现为**真父子层级树 + 多归属主链**（四个维度仍为一级分组）；森林/分组语义保留，但**组内必须有可逐层展开的父子层级** | FR-V2-010、AC-V2-001、**[R2] FR-V2-070/071** |
| 2 | 树内 UI 文案用作者词 `delay` 还是 v1 的 `deny` | ✅ **同处并标**「`delay`（= `deny`，fail-closed）」 | FR-V2-054、AC-V2-010 |
| 3 | 撤销后的「可见后果」面是否含审计入口 | ✅ **三项都给**：回执 + 工具面已移除证据 + 审计入口（`admin_audit-export`） | FR-V2-037、AC-V2-003 |
| 4 | 最终 Feature 命名 | ✅ **`specs-tree-web-cli-plugin-v2-insight`** | §1、FR-V2-001 |
| 5 | 结构：父 + 4 子 vs 单 Feature 4 波次 | ✅ **父 Feature + 4 叶子子 Feature** | §10、FR-V2-001 |

### 11.2 剩余待作者确认的建议值（**不阻塞 plan；若作者未答则按建议值执行**）

| # | 问题 | 建议值（标注为「待作者确认的建议值」） | 影响 |
|---|------|-----------------------------------|------|
| O-V2-001 | 树抽屉的默认开合状态（常驻入口是否默认展开） | **默认收起**（入口常驻、抽屉按需展开，避免挤压侧栏）。**[R2 澄清]** 本项指**抽屉整体**的开合；**不与** FR-V2-072「**树内节点**根 + 一级默认展开、深层默认收起」冲突——两者层级不同（抽屉开合 vs 节点展开/收起） | V2-2；与 AC-V2-002 布局断言相关 |
| O-V2-002 | 会话组解散是否纳入 P0（作者四维度未点名，ROADMAP 列在 OPS） | **归 P1**（FR-V2-035 标 P1；不阻塞 P0 闭环） | V2-3 范围 |
| O-V2-003 | LLM 断开（清 key）是否纳入 P0 | **归 P1**（FR-V2-034 标 P1；P0 闭环只要求「可见」LLM 面） | V2-3 范围 |
| O-V2-004 | `sidepanel.js` 体积容差取值 | **5%**（沿用 v1 `perf-baseline.ts` 口径）；基线在 build 后实测登记 | NFR-V2-001、AC-V2-006 |
| O-V2-005 | 树内操作是否需二次确认（FR-V2-040）的具体范围 | **不可逆/高影响操作（站点取消授权、能力撤销、LLM 断开）需确认；开关翻转不需确认**（开关可逆） | V2-3；与 EC-V2-014 相关 |

### 11.3 需 plan 承接的技术开放点（不阻塞本 spec）

| # | 技术开放点 | 本规范约束 |
|---|-----------|-----------|
| P-V2-01 | 树模型的**数据结构与投影实现**（如何从四维度确定性生成快照） | FR-V2-010~017 只定义语义与验收边界；实现归 plan（ADR） |
| P-V2-02 | 悬浮入口/树抽屉的 **DOM/CSS 实现与布局接入方式** | FR-V2-020~025 定义交互与布局约束（含量化阈值）；实现归 plan |
| P-V2-03 | 投影/操作的**消息面 additive 扩展形态** | FR-V2-016 要求 additive 兼容；具体消息形态归 plan |
| P-V2-04 | `sidepanel.js` 体积守卫的**基线登记与门禁实现** | NFR-V2-001 定义「基线 ≠ 目标预算」与反证自测要求；实现归 plan |
| P-V2-05 | 撤销回执/审计入口在树内的**呈现形态** | FR-V2-037 定义三件套可验证；呈现实现归 plan |
| P-V2-06 | 命令档案与 `parity.test.ts` 的**同源对账实现** | FR-V2-053 定义同源与双向 FAIL；实现归 plan |
| P-V2-07 **[R2]** | **树形结构的数据结构**（如何从四维度快照生成父子层级 + 主归属/交叉引用） | FR-V2-070/071 只定义形状与验收边界；实现归 plan（ADR，**须重开/替代 ADR-V2-011 的命令级部分**） |
| P-V2-08 **[R2]** | **用户覆盖层的存储/生效/审计实现**（存储键、clamp 计算位置、additive 消息面） | FR-V2-075/076 定义优先级与 clamp 语义；具体实现归 plan |
| P-V2-09 **[R2]** | **展开状态与键盘可达的 DOM 实现**（树组件形态、`aria-expanded`、焦点管理） | FR-V2-072/073 + NFR-V2-011 定义交互与可访问性边界；实现归 plan |

### 11.4 R2 修订轮登记与裁决（2026-09-13，**编排器代作者决策，2026-09-13 授权**）

| # | 项 | 裁决 / 登记 |
|---|----|-----------|
| R2-D-01 | **偏差确认** | 作者反馈 2 项偏差**成立**（D-R2-01 扁平列表 / D-R2-02 完全不可操作），evidence 见 §2.2b |
| R2-D-02 | **需求反转** | 原裁决⑤「不做命令级策略覆盖」+ NG-V2-001 + ADR-V2-011（命令级部分）**显式反转**；**不假装一直如此**；原条文保留并标注「以现状为准」 |
| R2-D-03 | **覆盖层优先级** | 硬底线（不可覆盖）> 用户覆盖 > 默认 risk 档（D-OVERRIDE-2） |
| R2-D-04 | **硬底线 clamp 逐档结论** | 见 §5.7 结论表；`dom` / `dom read-state` 三档全可用（作者示例必须达成） |
| R2-D-05 | **多归属处理** | 主归属链 + 交叉引用徽标（不复制节点）（D-OVERRIDE-4） |
| R2-D-06 | **展开状态** | 根 + 一级默认展开，深层默认收起；会话内保持；键盘可达 + `aria-expanded`（D-OVERRIDE-5） |
| R2-D-07 | **AC 范围重定** | AC-V2-005 的 allow 单调性只管撤销/关断；覆盖另立 AC-V2-023~026（D-OVERRIDE-6） |
| R2-D-08 | **phase 处理** | **不回退 phase**（父 tasked / 四叶 validated 原样）；按 v1 先例做 post-validate 修订轮：在父/相关叶 `state.json` 追加 `revisionRounds.R2`；后续 plan/tasks/build/review/validate **重走** |
| R2-D-09 | **下游待办** | @sddu-plan 须**重开 ADR 面**（真树形模型 + 覆盖层 + clamp + deny 控件分层 + 偏差文案替换），并以 `revisionRounds.R2`（`revertedItems` / `newFrIds` / `newAcIds` / `authorFeedbackVerbatim`）为输入；不得回改 v1 / 不碰 base / 不合 main |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| **v2.0** | **R2 需求修订轮（post-validate 修订；不回退 phase；依据作者 2026-09-13 偏差反馈，逐字见 §2.2b）**：① **新增 §2.2b**（作者逐字反馈 + 偏差证据 D-R2-01~03 + 编排器代作者决策 D-OVERRIDE-2~6）；② **反转**原裁决⑤ / `NG-V2-001`（命令级覆盖：不做 → 做，含硬底线 clamp）+ `ADR-V2-011` 的命令级部分（**部分取代**）；③ **新增 §5.7 REV2 组 `FR-V2-070~079`**（真层级树 / 多归属主链 / 展开语义 / 层级路径可读 / 逐层可操作 / 用户覆盖层 / 硬底线 clamp 逐档结论表 / deny 控件分层 / 偏差文案清除 + delay 消歧保留 / 覆盖面口径分列）；④ **新增 `AC-V2-020~027`** + **`AC-V2-005` 范围重定注**（allow 单调性只管撤销/关断）；⑤ 改写 `G-V2-002/005`、`FR-V2-010/013/015/016/021/025/036/039/050/052/060/061/063/064`、`AC-V2-012`、§9 `NG-V2-001`、§10 覆盖与边界、§11.2 `O-V2-001` 澄清、§11.3/§11.4；⑥ 新增 `NFR-V2-011/012`、`EC-V2-017~020`。**历史叙述全部保留并标注「以现状为准」**；其余条文不重写。**不动 v1 / 不碰 base / 不合 main / phase 不回退** | 2026-09-13 | SDDU Spec Agent（R2 修订，编排器代作者决策 2026-09-13 授权） |
| v1.3 | **最小补注 `AC-V2-002` / `FR-V2-023` 的测量条件**（D-V22-01，V2-3 build 阶段）：明确阈值必须在「去镀铬稳态」（实测 674px / 74.9%）与「v1 口径」（另断言 `#log ≥405px` 零回归 + 开/关 drift=0）下执行；来源 = `docs/dev.md` §11.3 口径订正注 + V2-2 `build.md` §5.1/§6。**只增不改**：原有 589px / 65.0%（及历史 65.5%）数值全部保留。仅这两处条文，其余不变 | 2026-09-13 | SDDU Build Agent（编排器代作者决策，2026-09-13 授权） |
| v1.2 | **最小订正 `FR-V2-023` 与 §2.5 的 `65.5%` 残留口径**（v1.1 已订正 `AC-V2-002` ⑤，但 `FR-V2-023` 验收列与 §2.5「侧栏布局基线（量化）」仍残留「占比 ≥65.5%」/「589px = 65.5%」）：两处统一为「稳态 **`clientHeight` ≥589px（主断言）且占比 ≥65.0%（次断言）**」，并注明订正原因与来源（589/900 = **65.44% < 65.5%**，逐字断言在 v1 基线必然失败；来源 **ADR-V2-006**，口径与 `AC-V2-002` 完全一致）。**仅改这两处数字口径**，不改其他条文、不改 v1 任何文件 | 2026-09-13 | SDDU Build Agent（编排器代作者决策，2026-09-13 授权） |
| v1.1 | **最小订正 `AC-V2-002` ⑤**：`#log` 稳态高度口径由「占比 **≥65.5%**」订正为「**`clientHeight` ≥589px（主断言）且占比 ≥65.0%（次断言，v1 基线 65.44% 留 0.44pp 余量）**」，并在该 AC 处注明订正原因与来源（**ADR-V2-006**，编排器代作者决策 2026-09-13 授权）。**仅改这一处 AC 条文**，其余 FR/NFR/EC/AC 不变；不改 v1 任何文件 | 2026-09-13 | SDDU Tasks Agent |
| v1.0 | 初始创建（作者批准**从 spec 阶段直接切入**，跳过 discovery）。以 `ROADMAP.md` §二 v0.8「F-27」小节为**一手输入**（**作者原始诉求逐字留存** + **作者五项口径裁决 2026-09-13** + 可投影面清单 + 子拆分 + 风险 R-V2-1~5）；**逐文件核实可投影面**（origin-store / extension-env / content-script-registry / capability-permissions / capability-setting / tabs-setting / host.suppressCapability / auto-authorize / policy / declared-tools / parity baseline 34·142 / key-store / status / providers / session-store / audit-sink / perf-baseline / docs/dev 布局量化）。**结构（作者确认）**：父 Feature + **4 叶子子 Feature**（V2-1~V2-4），父 Feature 为轻量规范容器（不执行 tasks/build/review/validate）。**编号**：FR-V2-001~065 / NFR-V2-001~010 / EC-V2-001~016 / AC-V2-001~012，**与 v1 FR-001~FR-055 等零冲突**。**安全红线**落成 FR-V2-060~065 + **反向断言 AC-V2-005**（撤销后 evaluate 仍 deny / 破坏性仍 ask / 未授权仍 deny / 未知 risk 仍 deny / clipboard read 仍 ask / bookmarks remove 仍 ask）；**侧栏回归量化断言** AC-V2-002（`#log` ≥65.5% / composer 底边−视口底 ∈[0,+8px] / 入口与 composer 不相交 / 400·320px 零水平溢出，断言只增不减）；**体积基线守卫** NFR-V2-001 + AC-V2-006（基线 ≠ 目标预算；只吞 ENOENT；反证自测；content.js 不增长）；**`delay` 撞词消歧** FR-V2-054 + AC-V2-010。**v1 记录保护**：`specs-tree-web-cli-plugin` 保持 `phase=validated` / `status=tracked` 原样不动。**本文档只写需求（spec 层）**：不写技术方案、不写代码、不排任务 | 2026-09-13 | SDDU Spec Agent |
