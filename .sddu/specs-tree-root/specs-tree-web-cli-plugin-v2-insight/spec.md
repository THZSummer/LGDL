# Feature Specification：specs-tree-web-cli-plugin-v2-insight（web-cli-plugin v2「any insight」——把能力变得可见/可控）

> **文档定位**: SDDU 需求规范 — 定义功能需求、非功能需求和边界情况，作为 plan 阶段的输入
> **前置依赖**: 本仓库 **无 discovery.md**（作者已批准**从 spec 阶段直接切入**，跳过 discovery）——本规范的一手输入 = `ROADMAP.md` §二 v0.8「F-27 web-cli-plugin v2「any insight」」小节（**作者原始诉求逐字留存** + **作者五项口径裁决 2026-09-13** + 可投影面清单 + 子 Feature 拆分 V2-1~V2-4 + 交付门槛 + 风险登记 R-V2-1~5）+ 仓库实测（`packages/web-cli-plugin/src/**` 状态源逐文件核实，见 §2.5）
> **创建人**: SDDU Spec Agent
> **创建时间**: 2026-09-13
> **版本**: v1.2
> **更新人**: SDDU Spec Agent（v1.1 由 SDDU Tasks Agent 最小订正；v1.2 由 SDDU Build Agent 最小订正，编排器代作者决策授权）
> **更新时间**: 2026-09-13
> **更新说明**: v1.2 **最小订正 `FR-V2-023` 与 §2.5 的 `65.5%` 残留口径**（v1.1 只改了 `AC-V2-002` ⑤，两处仍残留 65.5%）：统一为「稳态 `clientHeight` ≥589px 主断言 + 占比 ≥65.0% 次断言」，来源/原因见两处注记与 ADR-V2-006；仅这两处数字口径，其余条文不变。v1.1 **最小订正 `AC-V2-002` ⑤**（`#log` 稳态高度口径：占比 ≥65.5% → `clientHeight` ≥589px 主断言 + 占比 ≥65.0% 次断言；原因/来源见该 AC 处注记与 ADR-V2-006；仅此一处 AC，其余条文不变）。v1.0 初始创建。**v2 立项**：作者已批准 web-cli-plugin v2（主题「any insight」，ROADMAP 登记为 F-27）= v0.8 同一版本位内第二 Feature（同批叠加）。本规范以 **4 个叶子子 Feature（V2-1~V2-4）** 承载，父 Feature 为轻量规范容器（**父 Feature 不执行 tasks/build/review/validate**——SDDU 规则）。编号采用 **FR-V2-xxx / NFR-V2-xxx / EC-V2-xxx / AC-V2-xxx 独立前缀**，与 v1（FR-001~FR-055 / NFR-001~010 / EC-001~026 / AC-001~012）**零冲突**。v1 的 `specs-tree-web-cli-plugin` 保持 `phase=validated` / `status=tracked` **原样不动、不回退、不改写**。**本规范只写需求（spec 层）**：不写技术方案（ADR 留给 @sddu-plan）、不写代码、不排任务。

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
| ⑤ | **撤销粒度** | **站点级 + 能力级** | 树内可撤销 = 站点取消授权（工具面即时移出）+ 可选能力（`bookmarks` / `downloads` / `notify` / `clipboard`）单能力撤销；**不做命令级策略覆盖**（作者未选，明确排除，NG-V2-001）；静态 `permissions`（`tabs` / `scripting` 等）**技术上不可逐项 remove**（需停用/卸载扩展）→ 只做隐私开关 + **如实披露「不可逐项撤销」**（FR-V2-038 + AC-V2-005） |

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
| G-V2-002 | **可查看 + 可操作**：树内不只只读展示，还要能**就地**执行站点级 / 能力级撤销/取消授权，且撤销后**有可见后果**（回执 + 工具面证据 + 审计） |
| G-V2-003 | **操作简单 + 不放进设置面板**：侧栏常驻悬浮入口 + 树抽屉（少层级、可直达、可检索/过滤）；树是**并列独立新面**，v1 设置面板保持现状 |
| G-V2-004 | **零新权限、零注入、零 base 改动**：静态 `permissions` 零新增、无 `<all_urls>`、无静态 `content_scripts`、不加重 `content.js`、不碰 `packages/web-cli-base/**`、无新依赖 |
| G-V2-005 | **树是「可见性 + 撤销」面，不是「提权」面**：撤销/关断只调用既有 fail-closed 通路，**永不放宽** `riskDefaults` / 4 条硬底线（安全红线，含反向断言） |
| G-V2-006 | **不许静默失败/假成功**：新增操作的回执必须可读（成功/失败原因），静态 `permissions` 不可逐项撤销必须**如实披露**（延续 v1 不静默传统） |
| G-V2-007 | **不稀释 v1 记录**：v1 `specs-tree-web-cli-plugin` 保持 `phase=validated` / `status=tracked` 原样不动；v2 用新 Feature 目录承载；同批叠加不产生两次独立发布 |

### 3.2 非目标 (Non-Goals)

| # | 明确不做 |
|---|---------|
| NG-V2-001 | **不做命令级策略覆盖**（作者裁决⑤未选，明确排除；若未来要做须单开 Feature + 安全评审） |
| NG-V2-002 | **不做静态 `permissions` 逐项撤销**（Chrome 需停用/卸载扩展，技术不可行 → 只做隐私开关 + 如实披露，**不假装可撤销**） |
| NG-V2-003 | **不做页面注入悬浮层**（作者裁决②未选；与 v1 无 `<all_urls>` / 无静态 `content_scripts` 红线冲突） |
| NG-V2-004 | **不做树内改绑 LLM 配置（写路径）**（v1 侧栏已能配置；v2 先做「可见 + 断开」；改绑是否入树由作者另行批准——默认不做，避免与设置面板职责重叠） |
| NG-V2-005 | **不重写框架 / 不改判定链**：不改 `security/policy.ts` 判定链、`PLUGIN_RISK_DEFAULTS`、`auto-authorize.ts` 4 条硬底线；不碰 `packages/web-cli-base/**`；不改 `manifest.json` 静态权限面 |
| NG-V2-006 | **不改 `options.html` / 不做设置面板重构**：不推翻 v1 TASK-033（设置进侧栏面板内视图、零跳转）；树仅**复用实现**，不改变设置面板归属 |
| NG-V2-007 | **不解决 v1 遗留未达成项**：不触碰 `content.js` 1.07MB（超 64KB ≈16×，D31）、不薄壳化 `options.html`；v2 反而**要求不加重** `content.js` |
| NG-V2-008 | **不新增依赖、不引入新权限**（含 `notifications`/`clipboardWrite` 之外的一切新权限；这两个已由 v1 以 `optional_permissions` 落地） |
| NG-V2-009 | **不合 main、不发布**（作者执行）；不 force push；禁 `git add -A`/`.`；禁改 `.opencode/opencode.json` |
| NG-V2-010 | **不修改 v1 的任何文件**（`specs-tree-web-cli-plugin/**` 只读；含 discovery/spec/plan/tasks/build/review/validate/state.json 全部） |

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

---

## 5. 功能需求 (FR)

> 编号约定：**FR-V2-xxx**（独立前缀，与 v1 FR-001~FR-055 零冲突）——本 Feature 共 **43 条 FR**（编号 `FR-V2-001`~`FR-V2-065`，分组间留空号，非 65 条）。分组：**GOV**（基线与范围纪律）/ **TREE**（连接树数据模型与状态投影，V2-1）/ **UI**（悬浮连接树 UI 与交互，V2-2）/ **OPS**（撤销与取消授权操作面，V2-3）/ **ARC**（命令档案浏览器，V2-4）/ **SEC**（安全红线，横切）。
> 标注规则：**[裁决]** = 作者五项口径裁决红线（§2.2）；**[红线]** = 安全红线（必须落成 FR + 反向断言 AC）；未标注 = 基于已裁红线可直接测试。

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
| FR-V2-010 | **四层分组视图（森林）模型 [作者确认 2026-09-13]**：以「本插件」为根，聚合**四个并列分组**（站点 / 能力 / 命令 / LLM）；允许**跨层引用**（命令节点标注来源站点、能力节点标注依赖的 Chrome 权限）；界面**如实说明「不是严格单根树」** | 树模型含四分组根节点 + 跨层引用字段；模型为**确定性投影**（同输入同输出快照）；UI 明示「四维度分组，非严格树」 | P0 |
| FR-V2-011 | **站点授权面投影**：投影每站点的 `origin` / 是否已授权 / `trust`（untrusted/trusted）/ `authorizedAt`；来源 = `OriginStore.list()`；已授权 / 未授权 / **可取消授权**三态可辨 | 站点节点字段与 `OriginStore` 真值一致；未授权站点可见（不是「看不见」）；「可取消授权」态仅在 `authorized=true` 时出现 | P0 |
| FR-V2-012 | **浏览器能力面投影**：投影**静态 `permissions`**（activeTab/scripting/storage/sidePanel/tabs）+ **`optional_permissions`**（bookmarks/downloads/notifications/clipboardRead/clipboardWrite）+ **6 个隐私开关**（capability-setting）+ **`tabs` 开关**（tabs-setting）；每项三态清晰（已授权 / 未授权 / **可撤销**） | 能力节点覆盖静态权限 + 4 可选能力 + 6 开关 + tabs 开关；状态经 `hasCapabilityPermission` / 开关真值投影；静态权限项**不得**显示「可撤销」 | P0 |
| FR-V2-013 | **CLI 命令档案投影**：投影**每条命令**（工具 + 子命令）的处置档 `allow` / `ask` / `delay(=deny)` + risk 档 + **来源**（base 内建 / 站点声明 `site_*` / 插件 `admin_*`·`tabs`·`bookmarks`·`downloads`·`notify`·`clipboard`）+ `delayMs` + **当前是否被开关/授权状态抑制** | 命令节点真值对齐 `deriveTools()` + registry（不重不漏）；处置档由 `PLUGIN_RISK_DEFAULTS` + S1/S2/S3 + 开关抑制态推导；来源标注正确（见 FR-V2-055） | P0 |
| FR-V2-014 | **LLM 连接面投影**：投影 `configured` / `providerId` / `providerName` / `model`（复用 `llm/status.ts` 零明文投影）+ 多会话与分组（`session-store`）；**零明文 key**；**树内改绑 LLM 的写路径默认不做**（NG-V2-004） | LLM 节点字段 == `LlmStatusSummary`；投影输出 grep 零命中 key 材料；树内无「改绑/编辑 key」操作入口 | P0 |
| FR-V2-015 | **投影确定性 + 对账（不重不漏）**：树中命令集合 **==** `deriveTools()` + registry 真值 + `test/parity/baseline-catalog.json` 基线（**34 工具 / 142 子命令**）；新增/丢失命令即失败；投影为**确定性快照** | 单测：树命令集合与真值的双向集合等价（不重不漏）；确定性快照（两次投影一致）；与 parity 基线对齐（142 子命令逐条可列） | P0 |
| FR-V2-016 | **投影只读、零副作用、`state` 消息 additive 兼容**：投影为**纯读**（不改任何存储/不触发任何操作）；不渲染 UI；`state` 消息面**additive 扩展**（旧消费者零破坏） | 投影调用前后存储 diff 为空、无审计新增；`state` 消息旧字段语义零变更（回归断言）；投影纯函数化（可单测） | P0 |
| FR-V2-017 | **空态与降级可读**：无活跃站点 / 无已授权站点 / 未配置 LLM / 无命令（异常）等空态必须给出**可读**说明与下一步提示；投影读失败降级为可读态，**不静默** | 各空态均渲染可读文案（断言 ≥3 类空态）；storage 读失败有可读降级（EC-V2-013） | P0 |

### 5.3 UI — 悬浮连接树 UI 与交互（V2-2）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-V2-020 | **侧栏常驻悬浮入口（FAB/浮动按钮）[裁决②]**：在**侧栏内**提供常驻悬浮入口，可开合「树抽屉」；**不做页面注入悬浮层**；**不放进设置面板** | `test:ui`（真实 dist）：悬浮入口存在且可点击开合；入口位于侧栏 DOM（非页面注入）；不在设置面板视图内 | P0 |
| FR-V2-021 | **树抽屉：四维度层级导航 + 状态徽标 + 操作简单**：抽屉内按四维度层级导航、显示状态徽标（已授权/未授权/可撤销/deny 成因）；**少层级、可直达**（关键操作 ≤2 次点击） | 抽屉四维度可见；状态徽标与真值一致；从入口到任一撤销操作的层级 ≤2；空态/降级可读 | P0 |
| FR-V2-022 | **检索/过滤（只读过滤，不改真值）**：可按维度/关键字检索或过滤树节点；过滤只影响展示，**不改变投影真值、不改变任何授权状态** | 过滤后展示集合正确；过滤前后存储/授权状态 diff 为空；命令档案可按 34/142 检索 | P1 |
| FR-V2-023 | **侧栏布局不回退 [红线·量化]**：悬浮入口/抽屉**不遮挡 composer**；**消息区（`#log`）高度不回退**；**窄侧栏零水平溢出**；明暗适配；复用 v1 三区 flex 全高布局与 `scroll-policy`（48px 跟随） | `test:ui` **实测量化断言只增不减**（§8 AC-V2-002 给出精确阈值）：`#log` `flex-grow=1`、稳态 `clientHeight` **≥589px（主断言）且占比 ≥65.0%（次断言）**、composer 底边−视口底 ∈ **[0, +8px]**、入口与 composer boundingRect **不相交**、400px/320px 水平溢出 **=0**；v1 既有 `#15a~#15q` 断言零删减〔**测量条件注（D-V22-01 口径订正，2026-09-13，V2-3 最小订正）：主/次阈值按「去镀铬稳态」测量**（隐藏 `#site-hint`/`#onboarding`/`#discovery-notice`/`#consent-slot`/`#send-reason`），当日实测 **674px / 74.9%** ≥ 589px / 65.0%；另按 **v1 口径**（仅隐藏导航条）断言 `#log ≥405px`（v1 自身 `>45vh` 下限）证明**零回归**，并以抽屉**开/关逐字段相等（drift=0）**证明覆盖层不改变任何稳态几何。**原「589px = 65.5%」为 TASK-023 历史记录（早于 FR-052 自动授权块落地），不再单独作为今日阈值**〕 | P0 |
| FR-V2-024 | **入口可发现 + 不干扰 + 既有契约零回归**：入口常驻但**不遮挡交互**（可折叠/可最小化）；抽屉可关闭；**不改 v1 既有元素 ID / `.entry-*` 选择器**（测试门禁零回归） | 入口高 z-index 但不拦截 composer/交互（点击穿透/占位断言）；抽屉可关；既有 DOM id/类零重命名（grep 断言） | P0 |
| FR-V2-025 | **「不是提权面」文案钉死 [红线]**：树内文案显式声明「撤销/关断 = 回到更保守，**不放宽**任何门禁」；`delay` 档旁不得出现任何「可开关/可放宽」控件 | UI 文案含显式声明（断言 grep）；`delay`/`deny` 节点无开关控件（断言） | P0 |

### 5.4 OPS — 撤销与取消授权操作面（V2-3）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-V2-030 | **站点取消授权（站点级）[裁决⑤]**：树内可就地取消某站点授权——调用**既有** `removeOriginPermission(origin)` + `OriginStore.revoke` + content-script 注销 + 对账；工具面**即时移出**该站点工具 | `test:binding`（真实 dist + 真实站点）：取消授权 → 该站点工具**即时**从 `deriveTools()` 移出 + 审计；`host_permissions` 移除有回执 | P0 |
| FR-V2-031 | **可选能力单能力撤销（能力级）[裁决⑤]**：调用**既有** `removeCapabilityPermission` + `permissions.onRemoved` 对账 + `capability-changed` 推送 → 对应工具**即时移出** `deriveTools()` + `optional-permission/revoked` 审计；失败给可读原因 | `test:binding`：撤销 bookmarks/downloads/notify/clipboard 任一 → 工具即时移出 + 派发被可读拒绝 + 审计；`remove` 失败不静默（可读错误） | P0 |
| FR-V2-032 | **隐私开关翻转**：调用**既有** `capabilitySetting.save`（6 开关）与 `tabs-setting`；关闭即从 `deriveTools()` 移除该工具组（`enabled` 语义，不静默保留）；再次开启即恢复 | 6 开关 + tabs 开关可翻转；关闭 → 工具移出 + 派发被拒；再开启恢复；开关状态与工具面一致（断言） | P0 |
| FR-V2-033 | **按 origin 自动授权关断**：调用**既有** `autoAuth.clear(origin)`（读+写都关）；**撤销自动授权 ≠ 撤销站点授权**（授权与自动授权独立维度） | 一键关断后该 origin 读/写自动授权均为 false；站点授权状态不变（断言）；下一次同档位调用恢复 `ask`（EC-V2-016） | P0 |
| FR-V2-034 | **LLM 断开（清 key）**：调用既有 key-store 清除（BYOK）；回执可读；不静默失败 | 断开后 `maskedConfig().hasKey === false`；回执可读；清除失败有可读原因 | P1 |
| FR-V2-035 | **会话组解散（可选）**：调用既有 `session-store.deleteGroup` / `removeOrigin`；**分组只共享对话、不代表互相授权**（文案明示） | 解散后会话键与成员列表正确回退；文案明示「分组≠授权」；不触及任何 origin 授权 | P1 |
| FR-V2-036 | **撤销/关断只走既有 fail-closed 通路 [红线]**：树内所有操作面**只能调用既有 fail-closed 通路**，**永不放宽** `riskDefaults` / 4 条硬底线；**不得**新增任何绕过门禁的旁路 | 操作面代码只调用既有 ops（评审 + 单测）；无新增 policy/gate 旁路（grep）；撤销路径不得改变 `PLUGIN_RISK_DEFAULTS` | P0 |
| FR-V2-037 | **撤销后有可见后果（三件套）[作者确认 2026-09-13]**：① **回执**（成功/失败原因可读）② **工具面已移除的证据**（树内可查该工具已不在 `deriveTools()`）③ **审计入口**（`admin_audit-export` 可查对应事件） | 撤销后三件套均可验证（`test:binding` + 单测）；回执含成功/失败可读原因；工具面证据可查；审计事件可查（不强制渲染在树内，但入口可达） | P0 |
| FR-V2-038 | **静态 `permissions` 不可逐项撤销，如实披露 [裁决⑤/红线]**：静态权限项（tabs/scripting/activeTab/storage/sidePanel）**不得显示为可撤销**；必须**如实披露**「技术上不可逐项撤销，需停用/卸载扩展」；只提供隐私开关（tabs-setting / capability-setting） | UI 文案对静态权限给出「不可逐项撤销」说明（断言）；静态权限项无撤销按钮；不假装可撤销 | P0 |
| FR-V2-039 | **不引入静默失败 / 假成功 [红线]**：所有新增操作回执必须可读（成功/失败原因 + 下一步）；失败不得渲染为成功；不得 bare `catch` 吞错 | 失败路径返回可读原因（断言 ≥3 类）；无 bare `catch` 吞断言（grep + 评审）；失败不显示成功态 | P0 |
| FR-V2-040 | **撤销需显式意图（防误触）**：站点取消授权 / 能力撤销 / LLM 断开等不可逆或高影响操作须**显式确认**（确认摘要含作用对象 + 后果），拒绝即不执行、fail-closed | 不可逆操作触发确认（断言）；确认摘要可读；拒绝后零操作；取消授权类操作入审计 | P1 |

### 5.5 ARC — 命令档案浏览器（V2-4）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-V2-050 | **每条命令有档（34 工具 / 142 子命令）**：对账基线每一条工具与子命令**逐条有档**：`allow` / `ask` / `delay(=deny)` + risk 档 + 来源 + `delayMs` + 抑制态 | 单测/对账门禁：**142 子命令逐条有档**（覆盖率 100%）；工具 34/34；无遗漏、无多余 | P1 |
| FR-V2-051 | **`deny` 三成因显式分列可读**：`deny` 必须分列三种成因——① 未授权 origin（S1）② 未知/缺失/非法 risk（S3 fail-closed）③ `evaluate` 设计硬底线；另标注 `auto-authorize` 的 `hardDeny` | 命令档案对每个 `deny` 标注成因类别（S1/S3/evaluate/hardDeny）；分类正确率单测覆盖；未知 risk 归 S3 | P1 |
| FR-V2-052 | **不把 `deny` 渲染成可关的开关 [红线]**：`deny`/`delay` 档 **fail-closed 不可放宽**；档案**只读展示**，**无任何命令级覆盖操作** | `deny` 节点无开关/无覆盖按钮（断言）；无命令级策略写入路径（grep）；`denyPriority` 语义不变 | P0 |
| FR-V2-053 | **与 parity 同源机器对账**：档案真值与 `policy.ts` / `auto-authorize.ts` 真值一致；与 `test/parity.test.ts` **同源**——新增/丢失命令即失败；判定表机器校验 | 命令档案判定表与 `policy.ts`/`auto-authorize.ts` 一致（单测）；parity 门禁双向 + 子命令级；新增/丢失即 FAIL | P1 |
| FR-V2-054 | **`delay` 撞词消歧文案 [裁决①/作者确认 2026-09-13]**：同一处并标「`delay`（= `deny`，fail-closed，**非可配置档位**；与命令间 `delayMs` 无关）」；`delayMs` 列独立展示并与 `delay` 档语义区分 | 文案断言含完整消歧句；`delayMs` 与档位分列展示；无任何「第三档位」暗示 | P0 |
| FR-V2-055 | **来源标注**：每条命令标注来源——base 内建 / 站点声明 `site_*` / 插件 `admin_*`·`tabs`·`bookmarks`·`downloads`·`notify`·`clipboard` | 来源标注与注册真值一致（单测）；`site_*` 标注所属站点 origin；插件工具来源分类正确 | P1 |
| FR-V2-056 | **抑制态标注 + 可检索/过滤**：命令标注「当前是否被开关/授权状态抑制」（如 tabs 开关关、能力未授权/撤销、站点未授权）；可按档位/risk/来源检索过滤 | 抑制态与 `deriveTools()` 真值一致（单测）；检索/过滤可用且只读 | P1 |

### 5.6 SEC — 安全红线（横切，**必须落成 FR + 反向断言 AC**）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-V2-060 | **树是「可见性 + 撤销」面，不是「提权」面 [红线]**：树内撤销/关断**只调用既有 fail-closed 通路**；**永不放宽** `riskDefaults`、4 条硬底线、`clipboard read` 状态档、`bookmarks remove` 自动授权排除 | 安全专项单测 + 反向断言（AC-V2-005）；无放宽路径（grep/评审）；文案显式声明「撤销 ≠ 放宽」 | P0 |
| FR-V2-061 | **4 条硬底线不变 [红线]**：①未授权 origin 仍 `deny`（S1）②未知/缺失/非法 risk 仍 `deny`（S3 fail-closed）③ `evaluate` 仍 `deny`（设计硬底线）④破坏性写仍 `ask`（denylist，不纳入写自动） | 反向断言：**撤销后** `evaluate` 仍 deny / 破坏性仍 ask / 未授权仍 deny / 未知 risk 仍 deny；`riskDefaults` 与 4 硬底线代码零 diff | P0 |
| FR-V2-062 | **`clipboard read` 状态档永不自动放行 + `bookmarks remove` 不纳入自动授权 [红线]**：`clipboard` 读为 `state` 档，「读操作自动」开启仍 `ask`；`bookmarks remove` 破坏性，写自动开启仍 `ask` | 反向断言：撤销后 / 自动授权开启时 `clipboard read` 仍 `ask`、`bookmarks remove` 仍 `ask`；`decideAutoAuthorization` 硬底线零改动 | P0 |
| FR-V2-063 | **撤销路径不得成为放宽门禁的旁路 [红线·安全复核]**：安全复核「撤销路径不得成为放宽门禁的旁路」；树内操作**不得**新增任何改变判定结果的路径 | 安全复核记录（plan/spec 层登记）；单测证明撤销前后判定链真值不变（仅状态收紧） | P0 |
| FR-V2-064 | **未知/非法 risk fail-closed 展示为 `deny` 且不可关 [红线]**：投影遇未知/非法 risk 一律展示为 `deny`（S3），**不可关**、不可覆盖 | 未知 risk 命令展示 `deny` + 成因 S3（断言）；无开关 | P0 |
| FR-V2-065 | **投影与审计零明文 [红线]**：树投影与新增审计**零明文**——不含 LLM key / 剪贴板内容 / 通知正文 / 页面数据；沿用 v1 脱敏口径 | 投影输出与审计 grep 零命中 key/剪贴板/通知明文（断言）；只记长度/路径等非敏感派生量 | P0 |

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

---

## 8. 验收标准（总体验收清单）

> **重点**：本清单显式包含 ① **安全反向断言**（AC-V2-003/005）② **侧栏回归量化断言**（AC-V2-002）③ **体积基线守卫**（AC-V2-006）。所有门禁**串行**执行，**绝不并发**。

| # | 验收项 | 验证方式（可自动化优先） | 关联 |
|----|--------|--------------------------|------|
| AC-V2-001 | **V2-1 投影正确性**：四层分组（森林）模型确定性快照；树命令集合 == `deriveTools()` + registry（不重不漏）；零明文（无 key/剪贴板/通知内容）；`state` 消息 additive 兼容 | node 单测：确定性投影快照；双向集合对账；明文 grep 零命中；`state` 消息回归断言 | FR-V2-010~017, NFR-V2-006 |
| AC-V2-002 | **V2-2 悬浮树 UI + 侧栏布局回归量化**（`test:ui`，真实 dist，视口 **400×900**，**断言只增不减**）：① 悬浮入口存在且可开合；② 抽屉四维度可见 + 状态徽标；③ 空态/降级可读；④ **`#log` `flex-grow = 1`**（非 45vh 硬编码）；⑤ **`#log` 稳态 `clientHeight` ≥589px（主断言）且占比 ≥65.0%（次断言，v1 基线 65.44% 留 0.44pp 余量）**（不得回退）；⑥ **`composer` 底边 − 视口底 ∈ [0, +8px]**（贴底，**不得为负 = 不得被挤出视口**，D-079 回归）；⑦ **悬浮入口 boundingRect 与 `#composer` boundingRect 不相交**（无遮挡）；⑧ **文档级水平溢出 = 0**（400px 与 **320px** 窄栏）；⑨ v1 既有 `#15a~#15q` 断言**零删减** | `npm run test:ui`（串行）：上述 ①~⑨ 全绿；既有断言计数**只增不减** | FR-V2-020~025, NFR-V2-004/007 |
| AC-V2-003 | **V2-3 撤销与取消授权链**（`test:binding`，真实 dist + 真实站点）：站点取消授权 → 工具面**即时移出** + 审计；可选能力 `permissions.remove` → 工具移出 + 审计；开关关断 → `deriveTools()` 无该工具；**硬底线不被撤销面绕过** | `npm run test:binding`（串行）：三类撤销链 + 反向断言（见 AC-V2-005）全绿 | FR-V2-030~040, NFR-V2-009 |
| AC-V2-004 | **V2-4 命令档案齐全**：**142 子命令逐条有档**（工具 34/34）；判定表与 `policy.ts` / `auto-authorize.ts` 真值一致；`deny` 三成因（S1/S3/evaluate + hardDeny）分类正确；与 `test/parity.test.ts` 同源，新增/丢失命令即失败 | node 单测 + 对账门禁：142 子命令覆盖率 100%；判定表一致性；deny 分类正确；parity 双向 FAIL 能力 | FR-V2-050~056, NFR-V2-008 |
| AC-V2-005 | **安全红线反向断言（原文钉死）**：撤销/关断后——**① 未授权 origin 仍 `deny`（S1）**；**② 未知/非法 risk 仍 `deny`（S3 fail-closed）**；**③ `evaluate` 仍 `deny`**；**④ 破坏性写仍 `ask`**；**⑤ `clipboard read`（state 档）仍 `ask`（永不自动放行）**；**⑥ `bookmarks remove` 仍 `ask`（不纳入写自动）**；且 `PLUGIN_RISK_DEFAULTS` / 4 硬底线代码**零 diff** | 单测：撤销/关断/自动授权开启等各状态下逐条反向断言（①②③④⑤⑥）；`policy.ts`/`auto-authorize.ts` git diff 为空 | FR-V2-036/060~065, NFR-V2-006 |
| AC-V2-006 | **体积基线守卫（基线 ≠ 目标预算）**：`sidepanel.js` 设回归基线（build 后实测登记，v1 当前 1,068,165 B）+ 容差；`content.js` **不增长**（≤ 1,073,453 B）；守卫**只吞 `ENOENT`**、其余错误必须抛出；**反证自测**（故意超限必须 FAIL）；**不得以基线值宣布 NFR-007 目标达成** | node 单测：基线守卫 + 反证自测；`content.js` 体积断言；目标预算与回归基线分列记录 | NFR-V2-001/002 |
| AC-V2-007 | **零新权限 / 零注入 / 不动 base / 不改 options**：`manifest.json` 静态权限 diff 为空；无 `<all_urls>` / 无新增静态 `content_scripts`；`packages/web-cli-base/**` diff 为空；`options.html` diff 为空；依赖零新增 | git diff 断言 + grep 断言 + `package.json` 依赖核对 | FR-V2-002/004, NFR-V2-002/003/010 |
| AC-V2-008 | **树 ≠ 设置面板（边界）**：树与设置面板是两个可分别打开的并列界面；树可在**不打开设置面板**的情况下使用；设置面板既有入口/行为零回归 | `test:ui`：树独立开合断言；设置面板回归断言零删减；`options.html` 零 diff | FR-V2-004, NG-V2-006 |
| AC-V2-009 | **v1 记录保护**：v1 `state.json` 的 `phase`/`status`/`updatedAt` 零变更；v2 全部内容在新目录；父 Feature 未执行 tasks/build/review/validate；4 子 Feature 均为叶子 | git diff 断言（v1 目录零变更）；父/子 `state.json` 结构核对 | FR-V2-001, G-V2-007 |
| AC-V2-010 | **`delay` 撞词消歧**：命令档案文案同一处并标「`delay`（= `deny`，fail-closed，非可配置档位；与命令间 `delayMs` 无关）」；`delayMs` 独立列示；无「第三档位」暗示 | UI/档案文案 grep 断言；`delayMs` 与档位分列展示断言 | FR-V2-054, EC-V2-015 |
| AC-V2-011 | **门禁串行 + 全仓 0 fail**：`test` / `test:ui` / `test:binding` **串行**执行；全仓 0 fail；`web-cli-base` **483 零回归**；`tsc` 0 error | 串行执行记录 + 基线核对 + `tsc --noEmit` | NFR-V2-009/010 |
| AC-V2-012 | **范围纪律（NG 核验）**：NG-V2-001~010 逐项核验未越界（不做命令级覆盖 / 不做静态权限假撤销 / 不做页面注入层 / 不做树内改绑 LLM / 不改判定链 / 不改 options / 不解决 NFR-007 / 不新增依赖权限 / 不合 main 不发布 / 不改 v1 文件） | NG 清单逐项 grep/评审；越界项为零 | NG-V2-001~010, §3.2 |

> **【AC-V2-002 口径订正 · 2026-09-13 · 来源 ADR-V2-006（编排器代作者决策，2026-09-13 授权）】** 本条 ⑤ 原为「`#log` 稳态高度占比 **≥65.5%**」，但 v1 实测基线 `589/900 = **65.44% < 65.5%**`——逐字执行会在 v1 基线上**必然失败**（属**口径自相矛盾**，非布局回归）。故订正为「**`#log` 稳态 `clientHeight` ≥589px（主断言，绝对量）且占比 ≥65.0%（次断言，保守下限）**」：589px 与 `composer ∈[0,+8px]` 均为**可证伪硬阈值**，门禁不因此空洞。订正依据 = 父 `plan.md` **ADR-V2-006**（侧栏不回退量化口径 + §3.3 口径说明 + §5 D10 决策登记）。**本次仅订正 AC-V2-002 本条**，其余 FR/NFR/EC/AC 条文不变。

> **【AC-V2-002 测量条件补注 · 2026-09-13 · D-V22-01（V2-3 最小补注；不删除原有数值）】** 本条 ⑤ 的 589px / 65.0% 阈值须在明确的**测量条件**下执行：**(a) 去镀铬稳态**（隐藏 `#site-hint`/`#onboarding`/`#discovery-notice`/`#consent-slot`/`#send-reason`）= `test:insight` 主/次断言口径，当日实测 **674px / 74.9%**（≥ 589px / 65.0% 通过）；**(b) v1 口径**（仅隐藏导航条）= 另加断言 `#log ≥405px`（v1 自身 `>45vh` 下限），证明**零回归**；**(c) 抽屉开/关逐字段相等（drift=0）**证明 V2-2 覆盖层不改变稳态几何。来源/明细 = `docs/dev.md` §11.3 口径订正注 + `specs-tree-v2-2-floating-tree-ui/build.md` §5.1/§6。**本补注只增不改，原数值全部保留**。

---

## 9. 明确不做项（登记以防范围蔓延）

| # | 明确不做 | 依据 |
|---|---------|------|
| NG-V2-001 | **命令级策略覆盖**（树内改单条命令的 allow/ask/deny） | 作者裁决⑤未选，明确排除；若未来要做须单开 Feature + 安全评审 |
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
| **V2-1 连接树数据模型与状态投影** | `specs-tree-v2-1-connect-tree-model/` | 把四维度聚合为**单一可投影的树模型**（确定性「当前状态 → 树节点」映射与快照），供全部 UI 消费；**纯读、零副作用、不渲染 UI** | FR-V2-010~017 | **P0** | plan |
| **V2-2 悬浮连接树 UI 与交互** | `specs-tree-v2-2-floating-tree-ui/` | 侧栏**常驻悬浮入口**（FAB / 浮动按钮）+ **树抽屉**：四维度层级导航、检索/过滤、状态徽标、**操作简单**（少层级、可直达） | FR-V2-020~025 | **P0** | plan |
| **V2-3 撤销与取消授权操作面** | `specs-tree-v2-3-revoke-ops/` | 树内**就地执行**：站点取消授权 / 可选能力单能力撤销 / 隐私开关 / 自动授权关断 / LLM 断开 / 会话组解散；**撤销后有可见后果**（回执 + 工具面证据 + 审计） | FR-V2-030~040、FR-V2-060~065 | **P0** | plan |
| **V2-4 命令档案浏览器** | `specs-tree-v2-4-command-archive/` | **每条 CLI 命令**的处置档档案（`allow`/`ask`/`delay(=deny)` + risk + 来源 + `delayMs` + 抑制态）；`deny` 三成因分列可读；可检索/过滤 | FR-V2-050~056 | **P1**（后段） | plan |

**子 Feature 边界（做什么 / 不做什么）**

| 子 Feature | ✅ 做什么 | ❌ 不做什么 |
|-----------|----------|-------------|
| V2-1 | 四维度 → 树模型确定性投影快照；命令集合对账（== `deriveTools()` + registry）；零明文；`state` 消息 additive 扩展 | 不改 `policy.ts` 判定链 / `riskDefaults` / 4 硬底线；不新增权限；不碰 base；不渲染 UI；不做任何写操作 |
| V2-2 | 侧栏内渲染悬浮入口 + 树抽屉（复用 v1 三区 flex 全高布局与 `ui/settings/*` **实现**）；明暗适配；窄侧栏零水平溢出；空态/降级可读 | 不做页面注入悬浮层；不放进设置面板；不改 `options.html`；不遮挡 composer；不做写操作（操作面归 V2-3） |
| V2-3 | 复用既有 ops 就地撤销（站点级 + 能力级 + 开关 + 自动授权关断 + LLM 断开 + 会话组）；回执 + 工具面证据 + 审计入口；静态权限不可撤销如实披露 | 不做命令级策略覆盖；不新增权限；不放宽硬底线；不假装静态权限可撤销；不引入静默失败/假成功 |
| V2-4 | 34 工具 / 142 子命令逐条有档；deny 三成因分列；与 parity 同源机器对账；`delay` 消歧；可检索/过滤 | 不把 `deny` 渲染成可关开关；不做命令级覆盖；不预设站点 runtime 行为（档案只读真值） |

**里程碑（ROADMAP M-V2-1~4 对齐）**：M-V2-1 只读连接树可查（V2-1 + V2-2）→ M-V2-2 树内可就地操作（V2-3）→ M-V2-3 命令档案齐全（V2-4）→ M-V2-4 v2 收口（**不合 main、不发布**）。

---

## 11. 开放问题

### 11.1 本次立项已向作者确认的问题（2026-09-13，均已答复，不再开放）

| # | 问题 | 作者答复（**已确认**） | 规范落点 |
|---|------|----------------------|---------|
| 1 | 「连接树」是严格树还是森林/分组视图 | ✅ **四层分组视图 / 森林**（以「本插件」为根的四个并列分组，允许跨层引用，并如实说明「不是严格树」） | FR-V2-010、AC-V2-001 |
| 2 | 树内 UI 文案用作者词 `delay` 还是 v1 的 `deny` | ✅ **同处并标**「`delay`（= `deny`，fail-closed）」 | FR-V2-054、AC-V2-010 |
| 3 | 撤销后的「可见后果」面是否含审计入口 | ✅ **三项都给**：回执 + 工具面已移除证据 + 审计入口（`admin_audit-export`） | FR-V2-037、AC-V2-003 |
| 4 | 最终 Feature 命名 | ✅ **`specs-tree-web-cli-plugin-v2-insight`** | §1、FR-V2-001 |
| 5 | 结构：父 + 4 子 vs 单 Feature 4 波次 | ✅ **父 Feature + 4 叶子子 Feature** | §10、FR-V2-001 |

### 11.2 剩余待作者确认的建议值（**不阻塞 plan；若作者未答则按建议值执行**）

| # | 问题 | 建议值（标注为「待作者确认的建议值」） | 影响 |
|---|------|-----------------------------------|------|
| O-V2-001 | 树抽屉的默认开合状态（常驻入口是否默认展开） | **默认收起**（入口常驻、抽屉按需展开，避免挤压侧栏） | V2-2；与 AC-V2-002 布局断言相关 |
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

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.3 | **最小补注 `AC-V2-002` / `FR-V2-023` 的测量条件**（D-V22-01，V2-3 build 阶段）：明确阈值必须在「去镀铬稳态」（实测 674px / 74.9%）与「v1 口径」（另断言 `#log ≥405px` 零回归 + 开/关 drift=0）下执行；来源 = `docs/dev.md` §11.3 口径订正注 + V2-2 `build.md` §5.1/§6。**只增不改**：原有 589px / 65.0%（及历史 65.5%）数值全部保留。仅这两处条文，其余不变 | 2026-09-13 | SDDU Build Agent（编排器代作者决策，2026-09-13 授权） |
| v1.2 | **最小订正 `FR-V2-023` 与 §2.5 的 `65.5%` 残留口径**（v1.1 已订正 `AC-V2-002` ⑤，但 `FR-V2-023` 验收列与 §2.5「侧栏布局基线（量化）」仍残留「占比 ≥65.5%」/「589px = 65.5%」）：两处统一为「稳态 **`clientHeight` ≥589px（主断言）且占比 ≥65.0%（次断言）**」，并注明订正原因与来源（589/900 = **65.44% < 65.5%**，逐字断言在 v1 基线必然失败；来源 **ADR-V2-006**，口径与 `AC-V2-002` 完全一致）。**仅改这两处数字口径**，不改其他条文、不改 v1 任何文件 | 2026-09-13 | SDDU Build Agent（编排器代作者决策，2026-09-13 授权） |
| v1.1 | **最小订正 `AC-V2-002` ⑤**：`#log` 稳态高度口径由「占比 **≥65.5%**」订正为「**`clientHeight` ≥589px（主断言）且占比 ≥65.0%（次断言，v1 基线 65.44% 留 0.44pp 余量）**」，并在该 AC 处注明订正原因与来源（**ADR-V2-006**，编排器代作者决策 2026-09-13 授权）。**仅改这一处 AC 条文**，其余 FR/NFR/EC/AC 不变；不改 v1 任何文件 | 2026-09-13 | SDDU Tasks Agent |
| v1.0 | 初始创建（作者批准**从 spec 阶段直接切入**，跳过 discovery）。以 `ROADMAP.md` §二 v0.8「F-27」小节为**一手输入**（**作者原始诉求逐字留存** + **作者五项口径裁决 2026-09-13** + 可投影面清单 + 子拆分 + 风险 R-V2-1~5）；**逐文件核实可投影面**（origin-store / extension-env / content-script-registry / capability-permissions / capability-setting / tabs-setting / host.suppressCapability / auto-authorize / policy / declared-tools / parity baseline 34·142 / key-store / status / providers / session-store / audit-sink / perf-baseline / docs/dev 布局量化）。**结构（作者确认）**：父 Feature + **4 叶子子 Feature**（V2-1~V2-4），父 Feature 为轻量规范容器（不执行 tasks/build/review/validate）。**编号**：FR-V2-001~065 / NFR-V2-001~010 / EC-V2-001~016 / AC-V2-001~012，**与 v1 FR-001~FR-055 等零冲突**。**安全红线**落成 FR-V2-060~065 + **反向断言 AC-V2-005**（撤销后 evaluate 仍 deny / 破坏性仍 ask / 未授权仍 deny / 未知 risk 仍 deny / clipboard read 仍 ask / bookmarks remove 仍 ask）；**侧栏回归量化断言** AC-V2-002（`#log` ≥65.5% / composer 底边−视口底 ∈[0,+8px] / 入口与 composer 不相交 / 400·320px 零水平溢出，断言只增不减）；**体积基线守卫** NFR-V2-001 + AC-V2-006（基线 ≠ 目标预算；只吞 ENOENT；反证自测；content.js 不增长）；**`delay` 撞词消歧** FR-V2-054 + AC-V2-010。**v1 记录保护**：`specs-tree-web-cli-plugin` 保持 `phase=validated` / `status=tracked` 原样不动。**本文档只写需求（spec 层）**：不写技术方案、不写代码、不排任务 | 2026-09-13 | SDDU Spec Agent |
