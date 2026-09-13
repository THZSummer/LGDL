# Feature Specification：specs-tree-v2-3-revoke-ops（V2-3 撤销与取消授权操作面）

> **文档定位**: SDDU 需求规范（**叶子子 Feature**）— 定义 V2-3 的功能/非功能需求与验收边界，作为 plan 阶段的输入
> **前置依赖**: 父 Feature `specs-tree-web-cli-plugin-v2-insight/spec.md`（v1.0，2026-09-13）——本子 Feature 的需求为**父 spec 的 FR-V2-030~FR-V2-040 + FR-V2-060~FR-V2-065**；上游依赖 V2-1（树模型）与 V2-2（UI 载体）
> **创建人**: SDDU Spec Agent · **创建时间**: 2026-09-13 · **版本**: v1.0 · **更新人/时间**: SDDU Spec Agent / 2026-09-13
> **更新说明**: 初始创建。随父 Feature 立项（父 + 4 叶子子 Feature，作者确认 2026-09-13）。

## 1. 元数据

| 字段 | 值 |
|------|-----|
| Feature ID | specs-tree-v2-3-revoke-ops（父：specs-tree-web-cli-plugin-v2-insight） |
| 名称 | V2-3 撤销与取消授权操作面 |
| 优先级 | **P0**（P0 闭环第三环：可操作；作者原话「可查看，**可操作**」是硬要求） |
| 目标版本 | v0.8（与 v1 / 父 v2 同批叠加） |
| 承载需求 | 父 spec **FR-V2-030~FR-V2-040** + 安全红线 **FR-V2-060~FR-V2-065** |
| 依赖 | V2-1 / V2-2；v1 既有 ops（`platform/extension-env.ts` `removeOriginPermission` / `content-script-registry` 对账 / `capability-permissions.ts` `removeCapabilityPermission` + `onRemoved` / `capability-setting.save` / `tabs-setting` / `auto-authorize.clear` / `llm/key-store.clear` / `session-store` 分组） |
| 建议进入阶段 | plan（**含安全复核：撤销路径不得成为放宽门禁的旁路**） |

## 2. 上下文与边界

**为什么存在**：作者原话「哪些要取消授权」「取消授权」「可查看，**可操作**」。V2-3 让树内**就地执行**撤销；**撤销后有可见后果**（作者确认三件套：回执 + 工具面已移除证据 + 审计入口）。

**边界（做什么 / 不做什么）**

| ✅ 做什么 | ❌ 不做什么 |
|-----------|-------------|
| 站点级 + 能力级撤销（作者裁决⑤）：站点取消授权 / 可选能力单能力撤销 / 隐私开关 / 自动授权关断 / LLM 断开 / 会话组解散 | **不做命令级策略覆盖**（作者未选，明确排除） |
| 只调用**既有 ops**（`removeOriginPermission` + 对账 / `removeCapabilityPermission` + `onRemoved` / `capabilitySetting.save` / `autoAuth.clear` / key-store 清除 / session-store 分组） | **不新增权限、不放宽硬底线** |
| 回执 + 工具面已移除证据 + 审计入口（`admin_audit-export`） | **不做静态 `permissions` 假撤销**（如实披露需停用/卸载扩展） |
| 撤销后**即时**从 `deriveTools()` 移出并给树内证据 | **不引入静默失败 / 假成功** |

## 3. 目标与非目标

**Goals**：G1 树内可就地撤销（站点级 + 能力级）；G2 撤销后可见后果三件套；G3 撤销/关断只收紧不放宽；G4 回执可读、无假成功。
**Non-Goals**：NG1 命令级覆盖；NG2 静态权限假撤销；NG3 新增权限/放宽门禁；NG4 静默失败/假成功；NG5 改判定链。

## 4. 功能需求

> 本子 Feature **直接承载父 spec 的以下 FR**（权威条文见父 `spec.md §5.4` 与 `§5.6`）：

| 父 FR | 一句话 | 子级验收补充 |
|-------|--------|-------------|
| FR-V2-030 | 站点取消授权（站点级）：`removeOriginPermission` + `OriginStore.revoke` + content-script 注销 + 对账 | `test:binding`：工具**即时**移出 + 审计 + 权限移除回执 |
| FR-V2-031 | 可选能力单能力撤销：`removeCapabilityPermission` + `onRemoved` 对账 + `capability-changed` | 工具即时移出 + 派发可读拒绝 + `optional-permission/revoked` 审计 |
| FR-V2-032 | 隐私开关翻转（6 开关 + tabs 开关） | 关闭即移出工具面；再开启恢复 |
| FR-V2-033 | 按 origin 自动授权关断（`autoAuth.clear`，读写都关） | 不撤销站点授权（独立维度）；下次调用恢复 `ask` |
| FR-V2-034 (P1) | LLM 断开（清 key） | `hasKey=false` + 可读回执 |
| FR-V2-035 (P1) | 会话组解散 | 会话键正确回退；明示「分组≠授权」 |
| FR-V2-036 | 撤销/关断只走既有 fail-closed 通路 | 无新增绕过门禁旁路（grep/评审） |
| FR-V2-037 | 可见后果三件套（回执 + 工具面证据 + 审计入口） | 三件套均可验证 |
| FR-V2-038 | 静态 `permissions` 不可逐项撤销，如实披露 | 静态权限项无撤销按钮 + 「需停用/卸载扩展」说明 |
| FR-V2-039 | 不引入静默失败 / 假成功 | 失败返回可读原因；无 bare `catch` 吞断言 |
| FR-V2-040 (P1) | 撤销需显式意图（确认摘要 + fail-closed） | 不可逆/高影响操作触发确认；拒绝零操作 |
| FR-V2-060~065 | **安全红线**（见下「安全红线」节） | 反向断言钉死 |

**安全红线（必须落成反向断言）**

> 树是「**可见性 + 撤销**」面，**不是提权面**：撤销/关断**只调用既有 fail-closed 通路**，**永不放宽**：

- `PLUGIN_RISK_DEFAULTS` 不放宽（read→allow、write/external/ui/state→ask、evaluate→deny）；
- 4 条硬底线——① 未授权 origin 仍 `deny`（S1）② 未知/非法 risk 仍 `deny`（S3 fail-closed）③ `evaluate` 仍 `deny` ④ 破坏性写仍 `ask`；
- `clipboard read`（`state` 档）**永不自动放行**；
- `bookmarks remove`（破坏性）**不纳入自动授权**；
- 撤销路径**不得成为放宽门禁的旁路**（安全复核）。

## 5. 非功能需求

| ID | 类别 | 需求 | 验收 |
|----|------|------|------|
| NFR-V23-001 | 安全·只收紧 | 撤销/关断只调用既有 ops，判定链真值不变（仅状态收紧） | 单测撤销前后判定真值不变；`policy`/`auto-authorize` git diff 为空 |
| NFR-V23-002 | 无假成功 | 失败可读、不渲染成功态；无 bare `catch` | ≥3 类失败路径可读；grep 断言 |
| NFR-V23-003 | 即时性 | 撤销后工具面**即时**移出（不等待重启/重载） | `test:binding` 即时断言 |
| NFR-V23-004 | 审计 | 撤销/关断/开关变更入审计（零明文） | 审计事件断言 + 明文 grep |
| NFR-V23-005 | 幂等 | 重复撤销幂等（可读「已撤销」，不报错刷屏） | 单测 |
| NFR-V23-006 | 权限/体积 | 静态 `permissions` 零新增；`content.js` 不增长 | diff/体积断言 |

## 6. 边界情况

| ID | 场景 | 处理 |
|----|------|------|
| EC-V23-001 | 取消授权时 `removeOriginPermission` 失败 | 可读失败原因 + 下一步；revoke 与注销**分别如实报告** |
| EC-V23-002 | 撤销成功但 content-script 注销/对账失败 | 授权已撤销如实呈现；注销失败单独可读披露 + 重试提示 |
| EC-V23-003 | `removeCapabilityPermission` 失败/上下文不支持 | 可读「当前上下文不支持…」；能力状态**保持不变**（不假装已撤销） |
| EC-V23-004 | `onRemoved` 事件竞态 | 显式 `permission-changed` 重对账兜底（工具仍即时移出 + 审计 + 幂等） |
| EC-V23-005 | 静态 `permissions` 被请求撤销 | 如实披露「需停用/卸载扩展」；无撤销按钮 |
| EC-V23-006 | LLM 清除 key 失败 / 未配置 | 可读原因；`hasKey` 不假装翻转 |
| EC-V23-007 | 用户快速重复点击撤销 | 幂等；不产生重复审计噪音 |
| EC-V23-008 | 关闭自动授权后下一次调用 | 立即恢复 `ask`；不撤销站点授权；审计体现设置变更 |
| EC-V23-009 | 会话组解散时存在待决 `confirm`/`ask-user` | 按 v1 EC-019 fail-closed（confirm=拒绝 / ask-user=取消）；不静默挂起 |

## 7. 验收标准

| # | 验收项 | 验证方式 | 关联 |
|---|--------|---------|------|
| AC-V23-001 | 站点取消授权 → 工具面即时移出 + 审计 + 权限移除回执 | `test:binding`（串行，真实 dist + 真实站点） | FR-V2-030/037 |
| AC-V23-002 | 可选能力撤销 → 工具即时移出 + 派发可读拒绝 + 审计 | `test:binding` | FR-V2-031/037 |
| AC-V23-003 | 开关关断 → `deriveTools()` 无该工具；再开启恢复 | 单测 + `test:ui` | FR-V2-032 |
| AC-V23-004 | **安全红线反向断言（在撤销/关断/自动授权开启等状态下逐条）**：① 未授权 origin 仍 `deny`（S1）；② 未知/非法 risk 仍 `deny`（S3）；③ `evaluate` 仍 `deny`；④ 破坏性写仍 `ask`；⑤ `clipboard read` 仍 `ask`；⑥ `bookmarks remove` 仍 `ask` | 单测（逐条断言）；`policy.ts`/`auto-authorize.ts` git diff 为空 | FR-V2-036/060~065 |
| AC-V23-005 | 撤销后可见后果三件套可验证（回执 + 工具面证据 + 审计入口 `admin_audit-export`） | 单测 + `test:binding` | FR-V2-037 |
| AC-V23-006 | 静态权限如实披露不可逐项撤销；无假撤销按钮 | 断言 | FR-V2-038 |
| AC-V23-007 | 无静默失败/假成功（≥3 类失败可读；无 bare catch） | 断言 + grep | FR-V2-039, NFR-V23-002 |
| AC-V23-008 | 撤销幂等 + 审计零明文 | 单测 + grep | NFR-V23-004/005 |

## 8. 开放问题

| # | 问题 | 状态 |
|---|------|:--:|
| 1 | 二次确认（FR-V2-040）适用范围 | **待作者确认的建议值：不可逆/高影响操作需确认；开关翻转不需确认（可逆）**（O-V2-005） |
| 2 | LLM 断开 / 会话组解散是否入 P0 | **待作者确认的建议值：均归 P1**（O-V2-002/O-V2-003） |
| 3 | 撤销回执/审计入口在树内的呈现形态 | 归 plan（父 P-V2-05） |

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（随父 Feature 立项；承载父 spec FR-V2-030~040 + 安全红线 FR-V2-060~065；含反向断言验收） | 2026-09-13 | SDDU Spec Agent |
