# 验证报告：specs-tree-web-cli-plugin（web-cli-plugin，v0.8 · 全量 P0+P1+P2）

> **文档定位**: SDDU 验证报告 — 逐项记录自主验证的执行结果，作为工作流终点
> **验证策略**: `validate.md`（V1~V13 验证场景矩阵）
> **前置依赖**: `validate.md`、`spec.md`（46 FR / 10 NFR / 16 EC / 12 AC）、`plan.md`（12 ADR）、`tasks.md`、`build.md`（D-001~D-016）、`review-report.md` v2.0（R2：⚠️ 有条件通过）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-11
> **验证轮次**: R1（P0 最小可用集）+ **R2 全量（P0+P1+P2，16/16 任务）**
> **版本**: v2.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-12
> **更新说明**: R2 全量独立验证：P0 回归 + P1（TASK-012~015）+ P2（TASK-016 发布渠道 + Gate-D 内置助手下线）+ 遗留清账独立复核；46 FR / 10 NFR / 16 EC / 12 AC 全量承接；独立复跑 build/test/tsc/E2E/G-MV3/G-KEY/红线 grep + 自写 R-BLK1a 复现 + NFR-007 实测 + revert 可性实测。**结论 ✅ 通过（0 阻塞）**。
> **验证基线（R2）**: HEAD = `046ec31`（分支 `feature/web-cli-plugin`）；工作区仅 `.opencode/opencode.json`（环境模型配置，与 Feature 无关）
> **方法**: 独立复跑（不引用 build/review 声明）+ 自建对抗/测量脚本（`/tmp/sddu-validate-web-cli-plugin-r2-20260912-022746/`）+ 受控 CDP 扩展探针（唯一偏差已披露）

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

## R2 全量验证（2026-09-12，P0 + P1 + P2 · 16/16 任务）

> **范围**：P0（TASK-001~011，回归确认）+ P1（TASK-012~015）+ P2（TASK-016 发布渠道 + Gate-D 内置助手下线）+ 遗留清账（R-BLK1a / R7 / R9-6·7·8·10·12 / minors / EC-008·009·012 / AC partials / NFR-007 / R8）。
> **基线**：HEAD `046ec31`；R2 全部命令均为本轮独立复跑，不引用 build/review 声明。

### R2-1. 验证概要

| 维度 | 数值 |
|------|:--:|
| 验证场景总数 | 11（V-R2-1 ~ V-R2-11，覆盖五维度全量） |
| 通过 | 11 |
| 失败 | 0 |
| 无法执行 | 0（真实手势/真实 LLM 人工面单列为「移交人工」，非场景失败） |
| 阻塞问题 | **0** |
| 新增独立脚本 | 4 个有效（`rblk1a-repro.mjs` / `nfr007-measure.mjs` / `v-grep.sh` / `gate-probe3.mjs`）+ 2 个弃用探针迭代 + 1 个临时 worktree revert 实测 |
| FR 承接 | **46/46 = 100%** 有证据 |
| NFR 承接 | **10/10 = 100%** 有证据（NFR-007 已量化并实测） |
| EC 承接 | **16/16 = 100%** 有证据 |
| AC 承接 | **12/12 = 100%** 有证据（AC-009/010 以真实 dist 全链 E2E，唯一偏差已明示） |

### R2-2. 独立复跑输出（本 Agent 实测，逐条命令）

| # | 命令 | 退出码 | 实测结果 |
|---|------|:--:|------|
| V-R2-1 | `npm run build` | 0 | 全仓构建 73.9s；插件 dist：`background.js` 969,356B / `content.js` 34,938B / `sidepanel.js` 15,512B / `options.js` 915,305B + `manifest.json`/2×html |
| V-R2-2 | `npm test` | 0 | 1095 tests / **0 fail** / 1 skip：core 267 · render 95(1 skip) · router 8 · **lgdl-web 31** · web-cli 84 · op-cli 15 · **base 483** · plugin **112**（+ lgdl-cli/lgdl-layout 各 0） |
| V-R2-3 | `npm run typecheck --workspace @lgdl/web-cli-plugin` | 0 | `tsc --noEmit` **0 error** |
| V-R2-4 | `npm run test:e2e --workspace @lgdl/web-cli-plugin` | 0 | R8 真实 dist 全链 PASS：场景 A（非 LGDL fixture，AC-010）+ 场景 B（LGDL Workbench 真实 dist，AC-009）；**唯一偏差明示** = `host_permissions` 预授予本地 origin（真实手势 UX = 人工面） |
| V-R2-5 | 自写 `rblk1a-repro.mjs` | 0 | 原 5 例 `purge-list`/`delete-all-list`/`wipe-get`/`drop-show`/`reset-status` 全部 `≠read`（→`write`/ask）；合法读 `notes-list`/`notes-status`/`foo.show`/`store.orders-list` 仍 `read`；子命令破坏性（`harmless-list`+`wipe`）也 `≠read`。**10 pass / 0 fail** |
| V-R2-6 | 自写 `nfr007-measure.mjs` | 0 | 50 次已授权读派发 **3.0ms（0.060ms/call）** < 250ms；`content.js` 34,938B ≤ 64KB；事件摘要 N=10；500 commit 后快照 40 turns（首条 user，JSON 1421B ≤ 64KB）。**全部 PASS** |
| V-R2-7 | 自写 `v-grep.sh`（8 项红线） | 0 | **8/8 OK**：无 `.executor(` 直调 / 无 `silentAllow|allowSilently` / 无 `return …riskHint` / 插件 src 零 LGDL 私有依赖 / 插件 src 无 `lgdl-ai-settings|localStorage` / content 无 window·globalThis 全局赋值 / 无空 catch / base 工作区零改动 |
| V-R2-8 | 自写 `gate-probe3.mjs`（CDP 真实 dist 扩展） | 0 | **G-MV3 PASS**：name=`web-cli plugin`、mv=3、permissions=`[activeTab,scripting,storage,sidePanel]`、无 `tabs/history/cookies`、`optional_host_permissions=["https://*/*"]`、无静态 `content_scripts`、storage 往返 true、sidePanel/scripting=object；**G-KEY PASS**：火山端点带 Authorization fetch → **HTTP 401**（非 CORS/网络失败） |
| V-R2-9 | `git diff $MB..HEAD`（漂移） | 0 | spec 仅 v1.1→v1.2 补注；plan.md/tasks.json **零改动**；tasks.md 仅 +1 状态行；仅 `ai/*` 测试删除（授权） |
| V-R2-10 | 零引用运行时导出扫描（115 符号） | 0 | **0 未引用**（对比 R1 的死代码项已闭合） |
| V-R2-11 | 单提交 revert 可性实测（临时 worktree） | — | `git revert --no-commit 762d3a6` 恢复 `ai/*` 8 文件 + App.tsx 接线；仅 `.sddu/…/state.json` 冲突（过程产物，非产品代码）。详见 R2-8 |

> **CDP 探针说明（如实）**：G-MV3/G-KEY 断言在扩展的 **options 页面执行上下文**（同为 `chrome-extension://` origin，权限/API 语义与 SW 等价）完成；SW target 亦被解析并可达，但对该 target 直接 `Runtime.evaluate` 在本环境挂起（未阻塞结论，改用扩展页上下文）。此为方法差异，非产物偏差。

### R2-3. FR 全量承接矩阵（46/46）

| FR | 描述（摘要） | R2 独立证据 | 判定 |
|----|------------|------------|:--:|
| FR-001 | 上游 v0.7.0 稳定基线 | `packages/web-cli-plugin/package.json` dep `^0.7.0`；base `package.json` version=**0.7.0**；`git tag v0.7.0` 存在；`npm view @lgdl/web-cli-base version`=**0.7.0** | ✅ |
| FR-002 | additive 复用零分叉 | base 483 零回归（V-R2-2）；`security/redact.ts` re-export base `sensitive`（非复制）；115 导出 0 未引用 | ✅ |
| FR-003 | 独立包零 LGDL 私有依赖 | V-R2-7 grep 0 命中；插件独立 `npm run build` 产出可单独加载 dist | ✅ |
| FR-004 | 共存替换/对象区分 + 冲突检测 | `App.tsx:17-19,1144+` 保留 `web-cli-host`；`ai/*` 移除以对象区分消解 O-001↔O-006；`web-cli-host.test.ts:247-276` 单工具面不变量（各注册一次 / 无 `site.*` / 单次 dispatch `sourceReads===1`） | ✅ |
| FR-005 | 插件载体可加载运行 | V-R2-8 G-MV3；dist 4 入口 + manifest | ✅ |
| FR-006 | 权限最小化 + 运行时授权 | manifest 最小面；`extension-env.ts:84-112` `request/has/removeOriginPermission`；`sidepanel.ts:221` 用户手势申请；EC-008 revoke 用例 | ✅ |
| FR-007 | content 隔离无侵入 | `content.test` 无全局污染负向断言；V-R2-7 window/globalThis 赋值 0 | ✅ |
| FR-008 | CSP/跨域如实转译 | `capabilityFailure` 经 `service-worker.ts:88` 接入 invokeSite 失败路径；`unsupported.test`×2 | ✅ |
| FR-009 | MV3 最小验证门 | `spike-mv3-gkey.md` 七项逐项 PASS/降级（无「未测」）+ V-R2-8 | ✅ |
| FR-010 | 发现三态 | `discovery.ts` 三态；`discovery.test`×10；无逐站点硬编码 | ✅ |
| FR-011 | 可声明工具面最小语义 | `protocol/descriptor.ts`（id/summary/params/subcommands/riskHint/protocolVersion/transport）；`protocol.test` | ✅ |
| FR-012 | 默认 untrusted + 完整性与溯源 | `protocol/trust.ts`；sha256 篡改检测用例；`origin-store` 授权/信任分离 | ✅ |
| FR-013 | 版本演进兼容 | `protocol/version.ts` accept/degrade/reject/invalid + 可读 notice；`version negotiation is auditable` 用例 | ✅ |
| FR-014 | 发现失败降级 ≥3 | `discovery.test`：无声明/非法/版本不匹配/transient 四类可读 | ✅ |
| FR-015 | 协议中立 + 标准化预留 | `docs/protocol.md`（191 行）`grep -rniE lgdl` **0 命中** | ✅ |
| FR-016 | 最小试点 ≥2 站点 | `spike-protocol-pilot.md`（LGDL + 非 LGDL fixture）；E2E 场景 A/B（真实 dist，偏差明示） | ✅ |
| FR-017 | 会话/多轮/工具/ask | `chat-session`/`chat-runner` 多轮（第二轮回看首轮）；`ask-bridge.ts`+`host.ts:84`+`sidepanel.ts:292` 任务内 ask 真实接线；`ask-bridge.test`×4 + `host.test`×2 + `sidepanel.test`×1 | ✅ |
| FR-018 | LGDL 图内容操作对齐 | `web-cli-host/host-router.ts` 注册 `lgdl-web-cli`；E2E 场景 B 图读全链 | ✅ |
| FR-019 | LGDL UI 操作对齐 | `site:lgdl-web-op-cli` 经 RPC+门禁（`content.test` 用例）；`web-cli-host.test` UI op 用例 | ✅ |
| FR-020 | 编辑器写回 onApply 替代 | `web-cli-host/bridge.ts` `parseLgdl` 校验 + `onApply`；`web-cli-host.test` 写回校验 + 「onApply 恰好一次」；无 React 状态直连 | ✅ |
| FR-021 | 事件/观察消费 | `page-bridge` `events.{subscribe,pull,unsubscribe,status}` + 预算截断；`content.test`×3 | ✅ |
| FR-022 | 能力对照矩阵 + 最小能力集 | `docs/capability-matrix.md` 34 项逐项归属 + 8 项最小集；`docs.test` 交叉引用 | ✅ |
| FR-023 | per-origin 显式授权 | `security/origin-store.ts`；`policy.ts:61-72` S1 未授权 deny；`security.test` | ✅ |
| FR-024 | 敏感操作二次确认 | `security/confirm.ts` 无应答/超时/异常→deny；`confirm` 摘要脱敏用例 | ✅ |
| FR-025 | 全程可审计 | `audit-sink` + `discovery-audit.ts`（发现/声明读取入审计）；`security.test` 审计用例；E2E 审计事件面（A 11 / B 7） | ✅ |
| FR-026 | 只读默认/写面确认 | `PLUGIN_RISK_DEFAULTS` read→allow / write·external·ui·state→ask / evaluate→deny；不可放宽至静默 | ✅ |
| FR-027 | untrusted + 危险档位强制确认 + fail-closed | `policy.ts` S1/S2/S3 + `denyPriority`；`effectiveRisk` 插件自决；`host.test` BLK-1×3 + R-BLK1a×4 | ✅ |
| FR-028 | 敏感数据脱敏 | `redact.ts` re-export base + `maskArgValue`；审计零明文负向断言；V-R2-7 | ✅ |
| FR-029 | 越权拒执行 + 风控护栏 | `createRiskGuard`（60/6s per-origin 令牌桶 + pause/resume/stop/reset）；`host.ts:121` `site.*` 前置 check；`host.test`/`security.test` 风控用例 | ✅ |
| FR-030 | 条款合规评估先行 | `docs/compliance.md` 试点站点逐项结论 + 分级 | ✅ |
| FR-031 | 用户告知与知情同意 | `sidepanel.test`「informed-consent risks and capability boundary readable」；`compliance.md §5` | ✅ |
| FR-032 | 合规边界文档化 + 不适用清单 | `compliance.md §4`（S-1~S-7 / O-1~O-10）；options 页入口 | ✅ |
| FR-033 | 插件独立配置 key | `llm/key-store.ts`（`chrome.storage.local`）；V-R2-7 无 `lgdl-ai-settings`/`localStorage` | ✅ |
| FR-034 | 8 厂商 BYOK + CORS 处置 | `llm/providers.ts` 8 厂商；`compliance.md §7` 逐厂商直连结论；`llm.test` 断言 8 端点 host 被 manifest 覆盖；G-KEY 401 | ✅ |
| FR-035 | key 安全隔离 | key 仅 background 读取；`key-store` 掩码用例；站点脚本不可读 chrome.storage | ✅ |
| FR-036 | 不自动迁移 + 手动重配指引 | `llm.test` AC-007「never touches built-in assistant storage」；`docs/migration.md §3` 重配指引 | ✅ |
| FR-037 | Gate-D 门槛定义 | `docs/gate-d.md` D-1~D-7 逐条可验收 + 验收记录 + EC-016 处置；`docs.test` 存在性 | ✅ |
| FR-038 | 下线执行与回退风险控制 | `ai/*` 已移除（`test ! -d`）；revert 实测恢复；`fallback-flag.ts` 默认 off；`migration.md §5.4` | ✅（见 R2-8 说明） |
| FR-039 | 存量迁移路径 | `docs/migration.md §2/§3/§4`（差异清单 + 重配 + 习惯对照） | ✅ |
| FR-040 | 过渡期双份维护控制 | `migration.md §5` 起止条件 + 收敛计划 C-1~C-5 + 终止时点 | ✅ |
| FR-041 | 作用于 LGDL Web 页 | `public/.well-known/web-cli.json` + `index.html:8` `link rel=web-cli` + `declaration.ts` + `bridge.ts`；E2E 场景 B | ✅ |
| FR-042 | LGDL 功能等价替代 | 矩阵差异显式说明；E2E 场景 B 图读；写回 node 断言；真实编辑器 UX = H6 人工面 | ✅（自动面） |
| FR-043 | 通用性验证（非 LGDL） | `e2e.generality.test` fixture + E2E 场景 A 真实 dist 全链（偏差明示） | ✅ |
| FR-044 | 本地加载调试链路 | `docs/dev.md §3/§4/§5`（unpacked 加载/调试/热重载） | ✅ |
| FR-045 | 冒烟验证方法论 | `docs/smoke-checklist.md`（M1~M23 机械面 + H0~H10 人工面 + 降级出口）；`perf-budget.test` 机械可验证 | ✅ |
| FR-046 | 发布渠道 | `docs/release.md`（本地 unpacked + 自托管分发 + 版本管理；商店后续 S-016） | ✅ |

> **R1 partial 收敛说明**：R1 中标注 partial 的 FR-004/013/014/015/016/017/018/019/021/029/031/032/037/038/039/040/041/042/043/044/045/046 在 R2 均补齐承接证据（P1/P2 + E2E + 文档）。FR-041/042/043 的**真实手势驱动浏览器人工 UX**（H0/H6）与真实 LLM（H7）仍为人工面（见 R2-12），但其自动可验证面全部达标。

### R2-4. NFR 全量（10/10）

| NFR | 描述（摘要） | R2 证据 | 判定 |
|-----|------------|--------|:--:|
| NFR-001 | 安全基线（无旁路/无静默 allow/fail-closed/脱敏） | V-R2-7 8/8；V-R2-5 R-BLK1a；`host.test` BLK-1/R-BLK1a；`policy` S1/S2/S3 | ✅ |
| NFR-002 | 权限最小化与最小侵入 | V-R2-8 权限面；无静态 content_scripts；`content.test` 隔离；默认无操作零常驻监听 | ✅（真实内存采样 = 人工面） |
| NFR-003 | 审计完整性 | `discovery-audit` + `audit-sink`；E2E 审计事件数（A 11 / B 7） | ✅ |
| NFR-004 | MV3 平台兼容 | V-R2-8 + `minimum_chrome_version:114` + spike 结论 | ✅ |
| NFR-005 | 上游契约一致零分叉 | base 483 零回归 + V-R2-7 base 零改动 + `router.ts`/`permission.ts` 未改 | ✅ |
| NFR-006 | 可测试性 | 插件 112 + lgdl-web 31 + E2E（`npm run test:e2e`）+ smoke 机械/人工分离 | ✅ |
| NFR-007 | 性能与预算 | **已量化阈值 + 实测**：V-R2-6（0.060ms/call < 5ms；content 34,938B ≤ 64KB；事件 10；会话 40；审计 500；令牌桶 60/6s）；`docs/dev.md §8` | ✅ |
| NFR-008 | 可用性/可理解性 | 失败/授权/确认文案中文可读断言；`sidepanel.test` 知情同意可读 | ✅（无独立 UX 评审 → H1~H10 人工面） |
| NFR-009 | 独立性与可移植性 | V-R2-7 零私有依赖 + 独立构建 + `protocol.md` 零 LGDL 耦合 | ✅ |
| NFR-010 | 合规可追溯 | `compliance.md` 结论含依据/时间；变更可审计 | ✅ |

### R2-5. EC 全量（16/16）

| EC | 场景 | R2 证据 | 判定 |
|----|------|--------|:--:|
| EC-001 | 无声明 | `discovery.test`「no declaration → unsupported」；不误报支持 | ✅ |
| EC-002 | 声明无效/被篡改/来源不可信 | `trust` sha256 篡改检测 + 默认 untrusted；`protocol.test` | ✅ |
| EC-003 | 危险档位未确认 | `host.test` untrusted write deny / 未确认执行器不被调用 | ✅ |
| EC-004 | 未授权 origin | `policy` S1 deny；`security.test`；E2E「unauthorized origin rejected before site call」 | ✅ |
| EC-005 | 二次确认超时/取消 | `confirm.ts` 无应答/超时/异常→deny；`sidepanel.test` | ✅ |
| EC-006 | 内容脚本冲突 / CSP 阻断 | isolated world + `capabilityFailure` 可读降级；**真实 CSP 未模拟**（H0 人工面） | ✅（结论性） |
| EC-007 | 跨域受限能力 | `unsupported.test` + `dom-agent` 不可达可读转译 | ✅ |
| EC-008 | 权限被拒/被撤销 | `extension-env.test`「revoke → removed → false → re-request」；`service-worker.ts:281-299,425-437` | ✅ |
| EC-009 | key 无效/额度/CORS | `compliance.md §7` 8 厂商直连结论 + `classifyError`；G-KEY 401 | ✅ |
| EC-010 | 条款禁止/风控触发 | `compliance.md §4` + `risk-guard` 限速/暂停/中止 | ✅ |
| EC-011 | 导航致会话失效 | `chat-session.test` 导航清空 + `controller.markNavigated`；`sidepanel` 失效提示 | ✅ |
| EC-012 | 过渡期双工具面冲突 | 1:1 改写为下线后单工具面不变量（各注册一次/无 `site.*`/单次执行）；计数 12 不变 | ✅ |
| EC-013 | 崩溃/更新/会话审计完整性 | `service-worker` 启动恢复 + `chat-session` storage 持久 + 审计不丢 | ✅ |
| EC-014 | 协议版本不匹配/工具下线 | `version` 四态 + 入审计 | ✅ |
| EC-015 | 敏感数据外泄 | `redact`/`audit-sink` 明文零命中；key 不进上下文 | ✅ |
| EC-016 | 下线后插件不可用回退 | Gate-D D-1~D-7 + `App.tsx:1298-1325` 静态迁移告知 + `fallback` 默认 off + 单提交 revert；**不静默** | ✅ |

### R2-6. AC 全量（12/12）

| AC | 验收项（摘要） | R2 证据 | 判定 |
|----|------------|--------|:--:|
| AC-001 | 上游基线衔接与 additive 契约 | V-R2-2 base 483；V-R2-7 base 零改动；npm/tag 0.7.0 | ✅ |
| AC-002 | 插件载体与平台约束 | V-R2-8 G-MV3；权限清单；隔离断言；不可达转译 | ✅ |
| AC-003 | 协议发现/声明最小语义 + 试点 | 三态断言；试点 ≥2 站点；E2E A | ✅ |
| AC-004 | 能力面对齐 | 会话/工具/ask 三路 + 图内容 + UI + 写回 + 事件 + 矩阵最小集 8/8 | ✅（UI 真实交互 = H1~H3/H6） |
| AC-005 | 安全/授权/审计 | V-R2-5/V-R2-7 + security/host 用例 + E2E 审计 | ✅ |
| AC-006 | 合规 | `compliance.md` 全链 + 授权知情同意断言 | ✅ |
| AC-007 | Key 管理 | 独立配置 + 8 厂商结论 + key 隔离 + 不自动迁移指引 | ✅ |
| AC-008 | 替代与迁移 | `gate-d.md` D-1~D-7 + 收敛计划 + 回退预案 + 迁移指引 | ✅（D-3 人工面 H6 明示） |
| AC-009 | LGDL 页端到端 | E2E 场景 B（真实 dist，偏差明示）；真实编辑器 UX = H6 | ✅（自动面） |
| AC-010 | 通用任意站点端到端 | E2E 场景 A（真实 dist，偏差明示） | ✅（自动面） |
| AC-011 | 调试/验证/发布链路 | `dev.md` + `smoke-checklist.md` + `release.md` + `docs.test` | ✅ |
| AC-012 | 范围纪律（NG-001~010） | V-R2-7 红线；无商店发布；单标签；无自动迁移；无框架重写 | ✅ |

### R2-7. 遗留闭合独立复核

| 遗留项 | R1/R2 状态 | R2 独立复核 | 判定 |
|--------|:--:|------------|:--:|
| **R-BLK1a**（id 白名单被破坏性命名绕过） | R1 未闭合 → 本轮清账 | 自写 `rblk1a-repro.mjs`（编译产物 `dist-test/src/tools/declared-tools.js`）：原 5 例全 `≠read`；合法读零误伤；子命令破坏性也拦截。源码 `DESTRUCTIVE_VERBS`(§89) + `hasDestructiveVerb`(:175) 逐段+子命令 + `isSafeReadOnlyTool`(:187) 前置 denylist + `effectiveRisk`(:209) 插件自决 | ✅ 闭合 |
| **R7**（任务内 askUser） | R7 遗留 | `ask-bridge.ts:37-71` deliver/settle/timeout，失败/超时→canceled；`host.ts:84` 注册 `createAskUserToolEntry`；`service-worker.ts:111,124,393-403`；`sidepanel.ts:292`。测试 `ask-bridge.test`×4 + `host.test`×2 + `sidepanel.test`×1 全绿 | ✅ 真实接线 |
| **R9-6**（discovery fetch 落点） | R9-6 | D-021 决策 content 页面源 fetch（无 host 权限即可发现）；`content-script.ts:9-16` 注释 + `protocol.md §2` 明示；失败可读降级 | ✅ 已决策 |
| **R9-7**（transport.channel 动态绑定） | R9-7 | `page-bridge.ts:157,279-283` `bindTransport` 改写闭包；`content-script.ts:77` 发现后绑定；`content.test`/`protocol.test` 用例 | ✅ 真实生效 |
| **R9-8 / EC-012** | R9-8 | 1:1 改写为下线后单工具面不变量（`web-cli-host.test.ts:247-276`），计数 12 不变 | ✅ 合理改写 |
| **R9-10**（文档引用悬空） | R9-10 | `options/index.html:54-55` 引用 `compliance/protocol/migration.md`（均存在）；`docs.test.ts` 3 用例（存在 + 无悬空 + 交叉引用） | ✅ 闭合 |
| **R9-12**（FR-037/038 优先级） | R9-12 | `git diff b53ddfe^ b53ddfe -- spec.md`：仅版本行 + 优先级列补注 + §5.8 归属段 + 修订记录；FR 描述/验收标准零变更 | ✅ 仅补注 |
| **minors**（双调用/死代码） | minors | `requestOriginPermission` 仅 `sidepanel.ts:221` 用户手势（`service-worker.ts:275` 读上报值）；115 导出 0 未引用 | ✅ 闭合 |
| **EC-008** | EC-008 | `extension-env.test` revoke→removed→false→re-request | ✅ 闭合 |
| **EC-009** | EC-009 | `compliance.md §7` 8 厂商逐项 + `llm.test` host 覆盖断言 | ✅ 闭合 |
| **NFR-007** | 未定义阈值 | 已量化 + V-R2-6 实测 | ✅ 闭合 |
| **R8**（真实产物全链） | 无法执行 → 已固化 | `npm run test:e2e` 独立复跑 PASS；**唯一偏差 = manifest 副本 `host_permissions` 追加本地 origin**（JS 字节与发布一致），代码/输出/`dev.md §7.4`/`build.md §11.4` 四处明示「不得表述为无偏差真实产物 PASS」 | ✅ 机制全链（偏差明示） |

### R2-8. P2 内置助手下线独立核验

| 核验点 | R2 独立证据 | 判定 |
|--------|------------|:--:|
| `lgdl-web/src/ai/` 完全移除 | `test ! -d packages/lgdl-web/src/ai` 通过；`git diff --diff-filter=D` 确认删除 8 文件 | ✅ |
| 活代码零残留 | 全仓 grep `AiPanel/SettingsPanel/createAiSession/src/ai/`：活 `import` 0；命中仅为 base 红线文件（`runner/sleep/sensitive`）与 `lgdl-web-cli` 旧路径溯源注释 + 下线说明 | ✅（历史注释如实区分） |
| `web-cli-host` + base 机制层保留 | `App.tsx:17-19` import `createWebCliHostRouter`/`startWebCliBridge`/`buildDeclaration`；`:1144-1151` 仍挂载；`web-cli-host/*` 3 文件存在 → O-001 对象区分成立 | ✅ |
| `lgdl-web/package.json` test script 同步 | diff：移除 `src/ai/provider.test.ts`+`session.test.ts`，加入 `src/web-cli-host/web-cli-host.test.ts`；lgdl-web 复跑 **31 pass / 0 fail** | ✅ |
| **其他测试零删除零降级** | `git diff --diff-filter=D` 全分支**仅** `ai/provider.test.ts`+`ai/session.test.ts` 删除；其余测试文件均新增；base 483 零回归 | ✅ |
| 回退预案可执行性 | `VITE_AI_ASSISTANT_FALLBACK` 默认 off（`fallback-flag.ts:12` `=== 'on'`；无 `.env*` 设值）；临时 worktree 实测 `git revert --no-commit 762d3a6` **恢复 `ai/*` 8 文件 + App.tsx 接线**；终止时点 C-4/C-5 明示 | ✅（见下方说明） |
| EC-016 不静默 | `App.tsx:1298-1325` 静态迁移告知卡（安装 + 授权 + 迁移/回退指引）+ `.ai-migrated-*` 样式；无空白 | ✅ |
| Gate-D D-1~D-7 判定诚实性 | `gate-d.md §2` D-3 = **「PASS（自动化面）/ ⏳ 人工面 H6 待执行（已文档化非阻塞）」**，未记为整体 PASS；无「声称 PASS 实则未做」 | ✅ |

> **回退可性如实说明（非阻塞）**：① 单提交 revert **对产品代码有效**（恢复 AI），但会在过程产物 `.sddu/…/state.json` 产生**一处 merge 冲突**（可手工解决，非产品代码）；② 该提交同时含 P2 其余产物（`release.md`、Gate-D 记录、`providers.ts` 等），因此 revert 会一并回退整个 P2 里程碑，而不仅「AI 下线」。建议后续把「下线」拆为独立提交，或文档补充「定向回退」步骤。此为回退粒度提示，不影响回退路径存在性与可执行性。

### R2-9. 门禁（独立复跑）

| 门禁 | 命令 | 结果 |
|------|------|:--:|
| G-MV3 | 自写 `gate-probe3.mjs`（真实 dist + headless chromium `--no-sandbox` + CDP） | ✅ PASS（name/mv=3/权限最小/无静态 content_scripts/storage 往返/sidePanel·scripting 可达） |
| G-KEY | 同上扩展上下文带 Authorization fetch 火山端点 | ✅ PASS（HTTP 401，非 CORS/网络失败） |
| R8 E2E | `npm run test:e2e` | ✅ PASS（场景 A + B；唯一偏差明示，未冒充无偏差） |

### R2-10. 红线 grep（独立复跑）

8/8 零命中（V-R2-7）：无 `.executor(` 直调 · 无 `silentAllow/allowSilently` · 无 `return …riskHint` · 插件 src 零 LGDL 私有依赖 · 插件 src 无 `lgdl-ai-settings|localStorage` · content 无 window/globalThis 全局赋值 · 无空 catch · base 零改动。另：插件运行时依赖仅 `{"@lgdl/web-cli-base":"^0.7.0"}`（根 `package.json` 分支内零改动）。

### R2-11. 漂移检测

| 漂移类型 | 检测 | 结果 |
|---------|------|------|
| 规格漂移 | `git diff b53ddfe^ b53ddfe -- spec.md` | ✅ 仅补注：优先级列 + §5.8 归属段 + 修订记录；**未削弱既有需求** |
| plan/tasks 越权改动 | `git log $MB..HEAD -- plan.md tasks.json` | ✅ plan.md/tasks.json **零改动**；tasks.md 仅 +1 状态行（`762d3a6`） |
| 孤立代码 | 115 运行时导出扫描 | ✅ 0 未引用 |
| 需求缺失 | 46 FR 对照 | ✅ 无缺失（全量有证据） |
| 文档级偏差 | 人工核对 | ⚠️ 3 处低（见 R2-14-1，非阻塞） |

### R2-12. 遗留终态与 v0.8 完成判定

**仍未完成/未执行项（均为已文档化人工面或后续里程碑，非代码缺陷）**：

| # | 项 | 状态 | 对 v0.8 完成是否阻塞 |
|---|----|:--:|:--:|
| H0 | content script 真实手势注入（headless 无法构造） | ⏳ 移交人工 | 不阻塞（E2E 以预授权覆盖机制面） |
| H1~H5 | side panel 多轮/授权弹层/二次确认/审计查看/导航提示 真实交互 | ⏳ 移交人工 | 不阻塞 |
| H6 | LGDL 真实页端到端（编辑器写回 + 既有功能零回归） | ⏳ 移交人工 | 不阻塞（自动面 + 写回 node 断言已过） |
| H7 | 真实 LLM 闭环（BYOK） | ⏳ 移交人工（可选） | 不阻塞（G-KEY 401 已证可达） |
| H8~H10 | 风控控件/事件订阅/任务内 ask-user 真实 UI | ⏳ 移交人工 | 不阻塞（node 面已过） |
| C-4 | 移除 `VITE_AI_ASSISTANT_FALLBACK` | ⏳ 下一版本 | 不阻塞 |
| C-5 | 过渡期关闭（文档/清单归档 + 清理遗留 CSS） | ⏳ 下一版本 | 不阻塞 |
| S-016 | 商店发布 | ⏳ 后续（本版不承诺） | 不阻塞 |
| — | 扩展 SW 真实内存采样 | ⏳ 人工面 | 不阻塞 |

**v0.8 完成判定**：**自动可验证面 + 文档面 100% 达标**（46 FR / 10 NFR / 16 EC / 12 AC 全部有承接证据，0 阻塞，构建/测试/类型/E2E/门禁/红线全绿）。上表人工面（H0~H10）与后续里程碑（C-4/C-5/S-016）**已由 spec（FR-045 机械/人工分离）与 review §8.7 显式文档化**，属设计内的残余验证项，**不阻塞 v0.8 需求完成判定**。

### R2-13. 验证脚本执行记录（ADR-003）

> 脚本存放：`/tmp/sddu-validate-web-cli-plugin-r2-20260912-022746/`（仓库零污染；临时 worktree 已 `git worktree remove`；chromium profile 已清理）。

| 脚本文件 | 用途 | 对应场景 | 退出码 | 关键输出 |
|---------|------|:--:|:--:|---------|
| `01-build.log` | 全仓构建 | V-R2-1 | 0 | dist 四入口；73.9s |
| `02-test.log` | 全仓测试 | V-R2-2 | 0 | 1095 tests / 0 fail / 1 skip |
| `03-typecheck.log` | 插件 tsc | V-R2-3 | 0 | 0 error |
| `04-e2e.log` | R8 真实 dist 全链 E2E | V-R2-4 | 0 | 场景 A + B PASS；偏差明示 |
| `rblk1a-repro.mjs` | R-BLK1a 破坏性动词对抗复现 | V-R2-5 | 0 | 10 pass / 0 fail |
| `nfr007-measure.mjs` | NFR-007 时延/体积/预算实测 | V-R2-6 | 0 | 0.060ms/call；34,938B；40 turns |
| `v-grep.sh` | 红线 grep 8 项 | V-R2-7 | 0 | 8/8 OK |
| `gate-probe3.mjs` | G-MV3 + G-KEY（真实 dist CDP） | V-R2-8 | 0 | G-MV3/G-KEY PASS |
| `gate-probe.mjs` / `gate-probe2.mjs` | 探针迭代（前者缺 `--no-sandbox`；后者未识别插件 SW） | V-R2-8 | 1 / 1 | **已弃用**（如实记录，最终以 probe3 为准） |
| `09-testnames.txt` | 全仓测试名清单 | V-R2-2 | 0 | 1094 行；0 失败 |
| `/tmp/r2-revert-wt`（临时 worktree） | 单提交 revert 可性实测 | V-R2-10 | — | 恢复 `ai/*` + App.tsx；state.json 1 冲突；已清理 |

### R2-14. 阻塞问题与结论

**阻塞问题：0。**

**非阻塞观察项（3 处低，供后续维护；不影响结论）**：

| # | 项 | 位置 | 建议 |
|---|----|------|------|
| O-1 | `test/perf-budget.test.ts:6` 注释引用 `docs/dev.md §9`，实际性能章节为 **§8**（§9 为变更记录） | `perf-budget.test.ts:6` | 改 §8 |
| O-2 | `docs/gate-d.md §2` 判定语「D-1~D-7 达标」与 D-3 行「PASS（自动化面）/⏳ H6」并存；§1 规则「全部 PASS 方可下线」口径宜明确「除已文档化人工项外」 | `gate-d.md:88,90` | 收窄措辞，避免「达标」误读为全 PASS |
| O-3 | `spec.md v1.2 §5.8` 补注含「`lgdl-web/src/ai/*` 未摘除」（写作时点早于 P2），P2 下线后该句已过时 | `spec.md:233` | 补一行「P2 已下线」或迁注至 build |

**结论：✅ 通过（Pass）**

| 指标 | 要求 | 实测 | 达标？ |
|------|------|------|:--:|
| FR 测试/证据覆盖 | 100% | **46/46 = 100%** | ✅ |
| NFR 覆盖 | ≥ 80% | **10/10 = 100%**（NFR-007 已量化实测） | ✅ |
| EC 覆盖 | — | **16/16 = 100%** | ✅ |
| AC 覆盖 | — | **12/12 = 100%** | ✅ |
| 构建退出码 | 0 | build/test/tsc/E2E 全 0 | ✅ |
| 严重漂移 | 0 | 0 严重（3 处低文档级观察） | ✅ |
| 阻塞问题 | 0 | **0** | ✅ |

**判定理由**：全量 16/16 任务（P0 回归 + P1 + P2 + 遗留清账）经独立复跑与自写脚本验证成立——全仓 1095 tests **0 fail**、base 483 零回归、lgdl-web 31（授权删除）、插件 112、`tsc` 0 error、`npm run test:e2e` 真实 dist 全链 PASS（偏差明示）；曾为唯一中危安全项的 **R-BLK1a 经自写脚本独立复现确认闭合**（原 5 例不再 read→allow，合法读零误伤）；R7 askUser 为真实接线；NFR-007 已量化并实测达标；P2 内置助手下线正确（`ai/*` 移除、活代码零残留、`web-cli-host`/base 机制层保留、测试删除严格限于 `src/ai/*`、回退预案默认 off 且可 revert、EC-016 不静默、Gate-D D-3 人工面如实标注）；红线 grep 8/8 + 115 导出 0 未引用；spec 仅补注未削弱需求，plan/tasks.json 零改动。

**残余移交（非阻塞）**：真实浏览器人工面 H0/H2/H4/H6/H7/H8/H9/H10（`docs/smoke-checklist.md §2`）与后续里程碑 C-4/C-5、S-016 商店发布、扩展 SW 真实内存采样——均由 spec/review 显式文档化，移交人工/后续版本。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v2.0 | **R2 全量验证**：P0 回归 + P1 + P2 + 遗留清账；46 FR / 10 NFR / 16 EC / 12 AC 全量承接（100%）；独立复跑 build/test/tsc/E2E/G-MV3/G-KEY/红线 grep + 自写 R-BLK1a 复现 + NFR-007 实测 + revert 可性实测；**结论 ✅ 通过（0 阻塞）** | 2026-09-12 | SDDU Validate Agent |
| v1.0 | 初始创建：P0 最小可用集独立验证（V1~V13；全仓 0 fail / 安全 10/10 / 协议 8/8 / 红线 12/12 / G-MV3·G-KEY PASS / 受控全链 PASS / V9b 真实产物无法执行）；**结论 ⚠️ 有条件通过（0 阻塞）** | 2026-09-11 | SDDU Validate Agent |
