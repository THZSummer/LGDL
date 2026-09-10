# 验证报告：specs-tree-web-cli-plugin（web-cli-plugin，v0.8 · P0 最小可用集）

> **文档定位**: SDDU 验证报告 — 逐项记录自主验证的执行结果，作为工作流终点
> **验证策略**: `validate.md`（V1~V13 验证场景矩阵）
> **前置依赖**: `validate.md`、`spec.md`（46 FR / 10 NFR / 16 EC / 12 AC）、`plan.md`（12 ADR）、`tasks.md`、`build.md`（D-001~D-016）、`review-report.md` v2.0（R2：⚠️ 有条件通过）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-11
> **验证轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-11
> **更新说明**: 初始创建：P0 最小可用集（TASK-001~011 + R1 修复轮）独立验证执行（构建/测试/安全/协议/门禁/全链/红线/漂移/遗留）
> **验证基线**: HEAD = `a803e81`（review R2 复审提交）；工作区 clean（验证前）；未 git 提交
> **方法**: 独立复跑（不引用 build/review 声明）+ 自建对抗脚本 + 受控浏览器 harness（唯一偏差已披露）

## 1. 验证概要

| 维度 | 数值 |
|------|:--:|
| 验证场景总数 | 13（V1~V13） |
| 通过 | 12 |
| 失败 | 0 |
| 无法执行 | 1（V9b 真实产物全链人工面，受限于 headless 无法构造 activeTab 手势） |
| 阻塞问题 | **0** |
| 独立脚本 | 12 个（见 §4） |

## 2. 逐项验证结果（V1~V13）

| # | 验证对象 | 验证步骤（摘要） | 预期结果 | 实测结果 | 判定 |
|---|---------|---------|---------|---------|:--:|
| V1 | 全仓构建 | `npm run build` | 退出码 0 + dist 四入口 | 退出码 0（45.9s）；plugin dist：background 931.0kb / content 25.1kb / sidepanel 8.2kb / options 893.9kb + manifest/html | ✅ |
| V2 | 全仓测试 + 上游零回归 | `npm test` | 0 fail；base 483 / lgdl-web 75 / plugin 68 | 退出码 0；core 267 / render 94(+1 skip) / router 8 / lgdl-web 75 / web-cli-cli 84 / op-cli 15 / base 483 / plugin 68，**全 0 fail** | ✅ |
| V3 | 插件类型检查 | `tsc --noEmit` | 0 error | 退出码 0，0 error | ✅ |
| V4 | 安全面端到端 | 10 条对抗断言（真实 dist-test 模块） | 全部通过、无静默 allow | **10 pass / 0 fail**；另 R-BLK1a 残余复现（5 命中，见 §3.4） | ✅ |
| V5 | 协议机制 | 8 条真实模块断言 | 三态/信任/版本/RPC 全通过 | **8 pass / 0 fail** | ✅ |
| V6 | 红线 grep | 12 项断言 | 全部 0 命中 | **12/12 OK** | ✅ |
| V7 | G-MV3 | headless load-extension + CDP SW 探针 | SW 可达、mv=3、权限最小、0 异常 | PASS：`chrome-extension://mekg…/background.js`；name=web-cli plugin；mv=3；permissions=[activeTab,scripting,storage,sidePanel]；optional=[https://*/*]；无静态 content_scripts；storage 往返 true；sidePanel/scripting=object；**uncaught=0** | ✅ |
| V8 | G-KEY | SW 内带 Authorization fetch 火山端点 | 返回 HTTP 状态（非 CORS/网络失败） | **HTTP 401**（`ark.cn-beijing.volces.com`） | ✅ |
| V9a | 全链浏览器（受控 harness） | 真实内容脚本注入→发现→授权→mock LLM→host→RPC，三轮 | 读/写确认放行/写确认拒绝全链闭环 + 审计 + 多轮 | **读 `welcome`；写 allow `✓ note added`；写 deny `权限被拒：用户取消/拒绝`；后续读 `welcome\nfrom-plugin`**；审计含 origin-authorize/descriptor-read/permission/tool-call/confirm(ask·allow·deny)；多轮历史累积；0 异常（详见 §3.2） | ✅ |
| V9b | 全链浏览器·真实产物 H0/H6 | 未改动 dist 尝试 permissions.request + executeScript | 记录真实限制 | `permissions.request` 回调 `cb:undefined`（未授予）；`executeScript` → **"Cannot access contents of the page. Extension manifest must request permission to access the respective host."** → 无法执行，移交人工面 | ⏭️ |
| V10 | FR/NFR/EC/AC 承接矩阵 | 逐项映射证据 | P0 FR 100%；NFR ≥80% | P0 FR 31/31 有证据（7 项为浏览器级 partial）；NFR 9/10；EC/AC 见 §3.3 | ✅ |
| V11 | 漂移检测 | git status/diff + 孤立代码 + 文档一致性 | spec/plan 零改动；无严重漂移 | spec/plan/tasks **零改动**（git 空）；无严重漂移；1 处文档级偏差（见 §3.5） | ✅ |
| V12 | 遗留核验 | 核对 review R2 §7.4 的 10 项 + P1/P2 | 如实标注 | 10/10 如实标注；P1/P2 文件确认未产出（见 §5） | ✅ |
| V13 | 依赖纪律 | 根/插件/lgdl-web package.json diff | 零新增运行时依赖、既有测试守恒 | 根 package.json **零改动**；插件运行时依赖仅 `@lgdl/web-cli-base ^0.7.0`；lgdl-web 仅 test 脚本**追加**（既有 66 用例零删除） | ✅ |

## 3. 验证详细信息

### 3.1 测试覆盖

**全仓测试（独立复跑 `npm test`）**：

| 包 | tests | pass | fail | skip |
|----|:--:|:--:|:--:|:--:|
| @lgdl/lgdl-core | 267 | 267 | 0 | 0 |
| @lgdl/lgdl-render | 95 | 94 | 0 | 1 |
| @lgdl/lgdl-router | 8 | 8 | 0 | 0 |
| @lgdl/lgdl-web | 75 | 75 | 0 | 0 |
| @lgdl/lgdl-web-cli | 84 | 84 | 0 | 0 |
| @lgdl/lgdl-web-op-cli | 15 | 15 | 0 | 0 |
| @lgdl/web-cli-base | 483 | 483 | 0 | 0 |
| @lgdl/web-cli-plugin | 68 | 68 | 0 | 0 |

> 上游 base 483 / lgdl-web 75（既有 66 + 新增 9 web-cli-host）零回归；插件 68 用例逐条列出见 `/tmp/.../12-plugin-testnames.txt`。

**FR 承接矩阵（P0 范围，plan §5.3 波1 定义）**：

| FR | 描述（摘要） | 测试/脚本证据 | 结果 |
|----|------------|--------------|:--:|
| FR-001 | 上游 v0.7.0 基线引用 | `package.json` dep `^0.7.0` + base version 0.7.0（V13/V6-5） | ✅ |
| FR-002 | additive 复用零分叉 | base 483 零回归 + `redact.ts` re-export base（V2/V6-11） | ✅ |
| FR-003 | 独立包零 LGDL 私有依赖 | V6-4（0 命中）+ V1 独立构建 | ✅ |
| FR-004 | 共存替换/对象区分 + 双工具面冲突检测 | `e2e.generality` 冲突检测（仅插件侧重复注册） | ⚠️ partial（IMP-8：未覆盖插件 vs 内置助手双执行） |
| FR-005 | 插件载体可加载 | V7 G-MV3 | ✅ |
| FR-006 | 权限最小化 + 运行时授权 | V7 权限清单 + `extension-env.test` + V9a authorize | ✅ |
| FR-007 | content 隔离无侵入 | `content.test` 无全局污染 + V6-7 | ✅ |
| FR-008 | CSP/跨域如实转译 | `unsupported.test`×2 + SW `capabilityFailure` 接线 | ✅ |
| FR-009 | MV3 最小验证门 | `spike-mv3-gkey.md` + V7 | ✅ |
| FR-010 | 发现三态 | `discovery.test` + V5-V-PROTO-1 | ✅ |
| FR-011 | 可声明工具面最小语义 | `descriptor` 测试 + V5-V-PROTO-7 + V9a 站点工具注册 | ✅ |
| FR-012 | 默认 untrusted + 信任分离 + 完整性 | `trust.test` + V5-V-PROTO-3/4 | ✅ |
| FR-013 | 版本演进兼容 | `version.test` + V5-V-PROTO-5 | ✅ |
| FR-014 | 发现失败降级 | `discovery.test`（absent/transient/invalid）+ V5-V-PROTO-6 | ✅ |
| FR-016 | 最小试点 ≥2 站点 | `spike-protocol-pilot.md` + fixture E2E + V9a（非 LGDL）；LGDL 侧浏览器级未做 | ⚠️ partial（R8） |
| FR-017 | 会话/多轮/工具/ask | `chat-session.test`×6 + V9a 多轮；`askUser` 未接线 | ⚠️ partial（R7） |
| FR-018 | LGDL 图内容操作 | `web-cli-host` router 图读用例 + RPC 代码；浏览器 LGDL E2E 未做 | ⚠️ partial（R8） |
| FR-020 | 编辑器写回 onApply | `web-cli-host` bridge 写回校验用例×2 | ✅ |
| FR-022 | 能力对照矩阵 + 最小能力集 | `docs/capability-matrix.md`（34 项 + 8 项最小集） | ✅ |
| FR-023 | per-origin 显式授权 | `origin-store.test` + policy S1 + V4/V9a authorize | ✅ |
| FR-024 | 敏感操作二次确认 | `confirm.test` + V4-V-SEC-5 + V9a confirm allow/deny | ✅ |
| FR-025 | 全程可审计 | `audit-sink.test` + `discovery-audit.test` + V9a 审计事件面 | ✅ |
| FR-026 | 只读默认/写面确认 | `policy` riskDefaults 测试 + V4 | ✅ |
| FR-027 | untrusted + 危险档位 fail-closed | `host.test` BLK-1×3 + V4-V-SEC-1/2/4 | ✅ |
| FR-028 | 敏感数据脱敏 | `redact`/`audit-sink` 测试 + V4-V-SEC-6 | ✅ |
| FR-030 | 条款合规评估先行 | `docs/compliance.md`（试点站点逐项结论） | ✅ |
| FR-033 | 插件独立配置 key | `key-store.test` + V9a storage 配置 | ✅ |
| FR-035 | key 安全隔离 | `key-store` 掩码测试 + V6-12 + V4-V-SEC-6 | ✅ |
| FR-041 | 作用于 LGDL Web 页 | `.well-known/web-cli.json` + `index.html` link + `web-cli-host` + `declaration.ts`；浏览器级未实测 | ⚠️ partial（R8） |
| FR-042 | LGDL 功能等价替代 | 矩阵 + `web-cli-host` node 用例；浏览器等价性未断言 | ⚠️ partial（R8） |
| FR-043 | 通用性验证（非 LGDL） | `e2e.generality` fixture + V9a harness 全链 | ✅（harness 口径，已披露） |
| FR-037 | Gate-D 门槛（spec 标 P0） | 未实现（plan 归 P1/P2；`docs/gate-d.md` 未产出） | ❌ 未实现（优先级不一致，R9 IMP-12） |
| FR-038 | 下线执行与回退（spec 标 P0） | 未实现（plan 归波3/P2） | ❌ 未实现（同上） |

> **FR 覆盖率**：P0 最小可用集（plan 定义 31 FR）**31/31 = 100% 有承接证据**（其中 7 项为「浏览器级/askUser partial」，已如实标注）。若计入 spec 标 P0 但 plan 降级的 FR-037/038，则 31/33 = 94%（偏差已披露，非阻塞）。

**NFR 承接矩阵**：

| NFR | 描述（摘要） | 证据 | 结果 |
|-----|------------|------|:--:|
| NFR-001 | 安全基线（无旁路/无静默 allow/fail-closed/脱敏） | V4 10/10 + V6 12/12 | ✅ |
| NFR-002 | 权限最小化与最小侵入 | V7 权限清单 + `content.test` 隔离 | ✅ |
| NFR-003 | 审计完整性 | `audit-sink`/`discovery-audit` + V9a 事件面 | ✅ |
| NFR-004 | 平台兼容性 MV3 | V7 + `minimum_chrome_version:114` + spike | ✅ |
| NFR-005 | 上游契约一致零分叉 | V2 base 483 + V6-11 | ✅ |
| NFR-006 | 可测试性 | 68 + 9 用例 + `smoke-checklist.md` | ✅ |
| NFR-007 | 性能与预算 | **无量化阈值、无基准测量** → 未执行 | ⏭️ 未定义/无法执行 |
| NFR-008 | 可用性/可理解性 | 失败/授权/确认文案可读（中文）断言 | ✅（partial：无 UX 评审） |
| NFR-009 | 独立性与可移植性 | V6-4 零私有依赖 + V1 独立构建 | ✅ |
| NFR-010 | 合规可追溯 | `docs/compliance.md` | ✅ |

> **NFR 覆盖率**：9/10 = 90% 有证据（NFR-007 无量化阈值，如实标注未执行）≥ 80% 门槛。

**EC 承接**：EC-001✅ / EC-002✅ / EC-003✅ / EC-004✅ / EC-005✅ / EC-006✅（partial：真实 CSP 未模拟）/ EC-007✅ / **EC-008⚠️**（`hasOriginPermission` 就绪，无撤销流用例）/ **EC-009⚠️**（G-KEY 401 + `classifyError`，未逐厂商）/ EC-011✅ / **EC-012⚠️**（仅插件侧重复注册）/ EC-013✅（含 V9a SW 重启会话恢复）/ EC-014✅ / EC-015✅；EC-010、EC-016 属 P1/P2（未实现，如实标注）。

**AC 承接**：AC-001✅ / AC-002✅ / AC-003✅（LGDL 浏览器级 partial）/ AC-004⚠️partial（askUser/事件/UI 归 P1）/ AC-005✅ / AC-006✅ / AC-007⚠️partial（CORS 逐厂商结论有限）/ **AC-008⏭️**（Gate-D P1/P2 未实现）/ AC-009⚠️partial（node 级 host 用例，浏览器 LGDL E2E 归 R8）/ AC-010⚠️partial（fixture + harness，真实产物全链归 R8）/ AC-011⚠️partial（冒烟清单就绪，dev/release 文档 P1）/ AC-012✅。

### 3.2 接口与数据实测

**协议/RPC 契约（V5，真实模块）**：发现三态（supported/unsupported/unknown）✅；well-known URL + link/meta + 相对 href 子路径解析（`https://s.test/LGDL/` → `.../LGDL/.well-known/web-cli.json`）✅；默认 untrusted ✅；sha256 完整性（正确 true / 篡改 false / 缺失 false）✅；版本 accept/degrade/reject ✅；非法声明可读拒绝（JSON/工具 id/transport）✅；RPC invoke/result/probe/descriptor roundtrip + 跨通道拒绝 ✅；超时 `RpcTimeoutError` 可读 ✅。

**全链浏览器实测（V9a，受控 harness）**：

| 链路环节 | 实测证据 |
|---------|---------|
| 内容脚本注入 | `chrome.scripting.executeScript` → `injected` |
| 自动发现 → background | SW `state` → `discoveryState: "supported"` |
| 声明读取 → 审计 | `descriptor-read`（ok=true, origin=fixture） |
| 授权 | `authorize` → `{authorized:true, trust:"untrusted"}` |
| host 工具面组装 | `site.notes-list` / `site.notes-add` 出现在 `state.tools` |
| 读工具全链 | chat → mock LLM tool_call → host dispatch → RPC → 页面 `notes-list` → **`welcome`** 回传 |
| 写工具（确认放行） | `confirm` ask → allow → `tool-call` ok → **`✓ note added`** |
| 写工具（确认拒绝） | `confirm` ask → **deny** → `permission` deny → 工具未执行 → `权限被拒：用户取消/拒绝` |
| 状态持久 | 后续读返回 **`welcome\nfrom-plugin`**（放行的写生效） |
| 审计事件面 | origin-authorize / descriptor-read / permission(allow·deny) / tool-call(ok) / confirm(ask·allow·deny) |
| 多轮会话 | 第 3 轮 LLM 请求消息序列累积 `system,user,assistant,tool,assistant,user,…`（FR-017） |
| 异常 | SW 异常 0 / options 页异常 0 |

> **harness 披露（重要）**：真实 dist 在 headless 下**无法注入内容脚本**（`permissions.request` 回调 `cb:undefined`；`executeScript` 报 *"Cannot access contents of the page. Extension manifest must request permission to access the respective host."*）。故 V9a 使用**真实 dist 的字节级拷贝**，**唯一偏差** = 在 `manifest.host_permissions` 追加 fixture origin（`http://127.0.0.1:8795/*`）；所有 JS 与发布产物一致。此项**不冒充**真实产物全链 PASS（见 V9b）。

### 3.3 构建脚本

| 命令 | 退出码 | 耗时 | 输出摘要 | 结果 |
|------|:--:|------|---------|:--:|
| `npm run build` | 0 | 45.9s | plugin dist 四入口 + manifest/html | ✅ |
| `npm test` | 0 | 63.8s | 全仓 0 fail（8 包） | ✅ |
| `npm run typecheck --workspace @lgdl/web-cli-plugin` | 0 | — | `tsc --noEmit` 0 error | ✅ |
| `chromium --headless=new --load-extension=dist` + CDP | 0 | — | G-MV3 PASS + G-KEY 401 | ✅ |

### 3.4 性能与边界

| 对象 | 要求 | 实测 | 判定 |
|------|------|------|:--:|
| NFR-007 性能预算 | 无量化阈值（spec 未定义） | 未测量 | ⏭️ 无法执行（未定义阈值） |
| R-BLK1a 破坏性动词绕过（残余） | 发布前加固 | **复现**：`purge-list`/`delete-all-list`/`wipe-get`/`drop-show`/`reset-status` → `read`/allow | ⚠️ 非阻塞残余（release 前处置） |
| 会话历史上限 | 防无界增长 | `MAX_SESSION_TURNS=40`，裁剪后首条强制 user（测试覆盖） | ✅ |

### 3.5 漂移检测

| 漂移类型 | 检测命令/方法 | 结果 |
|---------|-------------|------|
| 规格漂移（spec/plan/tasks 被改） | `git diff HEAD -- spec.md plan.md tasks.md` | ✅ 空（零改动） |
| 孤立代码（有代码无需求） | grep 符号引用 | ⚠️ 少量次要：`host.activeOrigin`/`controller.clear` 无调用（C4 残余）；`unsupportedCapability`/`isAttributed`/`attributionHelpLines` 仅测试引用 |
| 需求缺失（有需求无代码） | FR 对照 | FR-037/038（spec P0，plan 降级 P1/P2，未实现）——已披露 |
| 文档与实现一致性 | 人工核对 | ⚠️ `capability-matrix.md` 第 17 行 `ask-user` 标「对齐/P0/最小能力集=是」，但实现未接线 `askUser`（与 R7 矛盾）；`options/index.html:54` 引用不存在的 `docs/protocol.md`（IMP-10） |

## 4. 验证脚本执行记录

> 脚本存放：`/tmp/sddu-validate-web-cli-plugin-20260911-013054/`（仓库零污染；受控 harness 扩展临时置于 `$HOME` 并在验证后删除）。

| 脚本文件 | 用途 | 对应场景 | 退出码 | 关键输出 |
|---------|------|:--:|:--:|---------|
| `01-build.log` | 全仓构建 | V1 | 0 | 插件 dist 四入口，45.9s |
| `02-test.log` | 全仓测试 | V2 | 0 | 全仓 0 fail |
| `03-typecheck.log` | 插件 tsc | V3 | 0 | 0 error |
| `v-security.mjs` | 安全面对抗 E2E | V4 | 0 | pass=10 fail=0；R-BLK1a 5 命中 |
| `v-protocol.mjs` | 协议机制 | V5 | 0 | pass=8 fail=0 |
| `v-grep.sh` | 红线 grep 12 项 | V6 | 0 | 12/12 OK |
| `v-gate.mjs` | G-MV3 + G-KEY | V7/V8 | 0 | G-MV3 PASS；G-KEY 401 |
| `v-fullchain-probe.mjs` | 真实产物权限/注入探测 | V9b | 0 | 权限未授予、注入受限 |
| `v-perm-probe.mjs` | `permissions.request` 行为 | V9b | 0 | `timeout` / contains=false |
| `v-bind-probe2.mjs` | SW 重启 + session 恢复 | V9a | 0 | state 返回已绑定 tab |
| `v-fullchain.mjs` | 全链浏览器 harness | V9a | 0 | 读/写 allow/写 deny 全链闭环 |
| `v-v9b-realart.mjs` | 真实产物注入确切失败 | V9b | 0 | *"Cannot access contents of the page…"* |

## 5. 阻塞问题

**无阻塞问题（0）。**

## 6. 结论

**结论**: ⚠️ **有条件通过（Conditional Pass）**

**指标达标矩阵**：

| 指标 | 要求 | 实测 | 达标？ |
|------|------|------|:--:|
| FR 测试覆盖（P0 定义） | 100% | 31/31 有证据（7 项 partial） | ✅ |
| FR 测试覆盖（含 spec 标 P0 的 FR-037/038） | 100% | 31/33 = 94% | ⚠️ |
| NFR 覆盖 | ≥ 80% | 90%（NFR-007 未定义阈值） | ✅ |
| 构建退出码 | 0 | 0（build/test/tsc 全 0） | ✅ |
| 阻塞问题数 | 0 | 0 | ✅ |
| 漂移项 | 0 严重 | 0 严重（2 处文档级偏差 + FR-037/038 优先级不一致） | ✅ |

**理由**：P0 最小可用集的四条柱子（插件可用 / 安全基线 / 通用站点最小闭环 / LGDL 等价）经独立复跑与对抗脚本验证成立——全仓 0 fail、上游 base 483 零回归、base 零改动、`tsc` 0 error；安全面 10/10（含 BLK-1 站点自报 `riskHint` 红线根除、fail-closed、确认不可绕过、脱敏零明文）；协议机制 8/8（站点中立、无 LGDL 硬编码）；红线 grep 12/12；G-MV3/G-KEY 独立复现 PASS；并在受控浏览器 harness 中打通 **content→background→host→RPC 全链**（读/写确认放行/写确认拒绝 + 审计 + 多轮）。

未判「✅ 通过」的原因（均为非阻塞）：
1. **V9b 无法执行**：真实产物在 headless 下无法构造 `activeTab` 手势 / 无法授予 host permission（已独立实证），AC-009/AC-010 的**真实产物浏览器级全链**（H0/H6）须移交人工面。
2. **R-BLK1a 安全加固项**（中）：破坏性动词命名为 `*-list/*-get` 时被插件白名单判为 read→allow（独立复现 5 例）；虽与 FR-026「只读缺省放行」不冲突且需已授权 untrusted origin，仍应在面向真实 untrusted 站点发布前加破坏性动词 denylist。
3. **FR-037/038 优先级不一致**：spec 标 P0，plan 归 P1/P2 且未实现（R9 IMP-12）。
4. **文档级偏差**：`capability-matrix.md` 第 17 行 `ask-user` 标 P0「对齐/最小能力集=是」但未接线；`options/index.html:54` 引用不存在的 `docs/protocol.md`。
5. P1/P2 未实现项（TASK-012~016）与 review R2 §7.4 的 10 项遗留见 §5（下方遗留移交清单）。

**遗留移交清单（非阻塞）**：

| # | 遗留 | 严重度 | 归属 | 说明 |
|---|------|:--:|------|------|
| R8 | 真实产物 content→background→host→RPC 全链浏览器验证（H0/H6） | 中 | 人工面 | headless 无法构造 activeTab 手势（V9b 实证）；harness 口径已 PASS |
| R-BLK1a | `effectiveRisk` id 白名单可被恶意命名绕过（破坏性动词作 `*-list/*-get`） | 中 | release 前 / P1 | 建议破坏性动词 denylist；独立复现 5 例 |
| R7 | 任务内 `askUser` 问答缝未接线（权限 ask 已可用） | 低 | P1（TASK-013） | 与 `capability-matrix` 第 17 行声明不一致 |
| R9-6 | IMP-6 discovery fetch 落 content（vs plan §3.2 background 特权 fetch） | 低 | P1/P2 | 已可读降级，不静默 |
| R9-7 | IMP-7 `transport.channel` 未动态绑定（P0 仅默认通道） | 低 | P1/P2 | 建议协议文档记录 |
| R9-8 | IMP-8 插件 vs 内置助手双工具面冲突用例缺失 | 低 | P1（过渡期） | 仅插件侧重复注册已测 |
| R9-10 | `docs/gate-d.md`/`protocol.md` 未产出；options 引用不存在文档 | 低 | P1（TASK-014） | 文案指向待修（已核实 `options/index.html:54`） |
| R9-12 | FR-037/038 spec P0 vs plan 波3/P2 不一致 | 低 | P1/P2 | 建议补注降级理由 |
| — | `requestOriginPermission` 双调用（sidepanel + background）文案不一致 | 低 | P1 | 门禁以 OriginStore 为准 |
| — | `unsupported.ts` 部分导出仅测试引用；`host.activeOrigin`/`controller.clear` 无调用 | 低 | P1/P2 | 次要死代码 |
| P1 | TASK-012~015：协议文档 / UI 操作+事件 / 风控+合规迁移调试文档 / 可选 DOM 工具面 | — | 未实现 | 文件确认 ABSENT |
| P2 | TASK-016：发布渠道 + Gate-D 下线执行（`ai/` 未摘除） | — | 未实现 | 文件确认 ABSENT |

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：P0 最小可用集独立验证（V1~V13；全仓 0 fail / 安全 10/10 / 协议 8/8 / 红线 12/12 / G-MV3·G-KEY PASS / 受控全链 PASS / V9b 真实产物无法执行）；**结论 ⚠️ 有条件通过（0 阻塞）** | 2026-09-11 | SDDU Validate Agent |
