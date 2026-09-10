# 验证报告：specs-tree-web-cli-plugin（web-cli-plugin，v0.8 · P0 最小可用集）

> **文档定位**: SDDU 验证策略 — 指导 validate Agent 执行自主验证的场景和方法；验证结果见 validate-report.md
> **前置依赖**: spec.md（46 FR / 10 NFR / 16 EC / 12 AC）、plan.md（12 ADR）、tasks.md、build.md（D-001~D-016）、review-report.md v2.0（R2：⚠️ 有条件通过，0 阻塞）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-11
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-11
> **更新说明**: 初始创建：P0 最小可用集（TASK-001~011 + R1 修复轮）独立验证策略（V1~V13）

## 1. 验证概要

> 本策略为「验证场景矩阵」定义（不预填结果）。实测结果见 `validate-report.md`。

| 维度 | 策略目标 | 达标基线 |
|------|---------|:--:|
| FR 测试覆盖 | P0 范围内每个 FR ≥ 1 条独立证据 | 100%（P0 定义） |
| NFR 覆盖 | 每个 NFR 有承接证据或显式「不适用/未定义」说明 | ≥ 80% |
| 构建 | `npm run build` + `npm test` 退出码 0 | ✅ |
| 接口一致性 | 协议描述符/RPC 契约/权限门禁实测符合 spec | ✅ |
| 漂移项 | spec/plan 零改动；无严重漂移 | 0 严重 |
| 阻塞问题 | 0 | 0 |

**Feature 类型**: 代码类（MV3 扩展 + 协议层 + 安全层 + 测试 + 文档）→ 全五维度验证（测试覆盖 / 接口数据 / 构建 / 性能边界 / 漂移检测）。

**验证范围**: P0 最小可用集 = TASK-001~011（波0 门槛 + 波1 四根柱子）+ R1 修复轮（BLK-1/BLK-2 + 6 改进）。P1（TASK-012~015）/ P2（TASK-016）不在本轮，作为遗留标注。

**验证对象来源**：
- `spec.md`：46 FR / 10 NFR / 16 EC / 12 AC → 逐项承接
- `plan.md`（12 ADR + §5.3 波次 + §6 文件影响）、`tasks.md`（16 任务 + §4.5 F-1~F-8）
- `build.md`（D-001~D-016 + 门禁）、`review-report.md`（R2 遗留清单 10 项）
- 实际产物：`packages/web-cli-plugin/**`、`packages/lgdl-web/src/web-cli-host/**`、`packages/lgdl-web/public/.well-known/web-cli.json`

## 2. 自主验证场景（V1~V13）

| # | 验证对象 | 验证步骤 | 预期结果 | 验证维度 | 验证方法 |
|---|---------|---------|---------|:--:|:--:|
| V1 | 全仓构建（FR-001/005，AC-002） | 运行 `npm run build`；检查插件 dist 产物 | 退出码 0；background/content/sidepanel/options 四入口 + manifest 产出 | 构建 | 脚本/自动化 |
| V2 | 全仓测试 + 上游零回归（FR-002，NFR-005，AC-001） | 运行 `npm test`；解析各 workspace pass/fail/skip | 0 fail；base 483 / lgdl-web 75 / plugin 68；上游零删除零降级 | 测试覆盖 | 脚本/自动化 |
| V3 | 插件类型检查（NFR-006） | `npm run typecheck --workspace @lgdl/web-cli-plugin` | `tsc --noEmit` 0 error | 构建 | 自动化 |
| V4 | 安全面端到端（FR-023~028，NFR-001，EC-003/004/005/015） | 以真实编译模块（dist-test）构造对抗用例：未授权 deny / 站点自报 read 的危险工具 / 显式确认放行 / 不透明工具 fail-closed / confirm 无应答·异常·取消→deny / 审计明文零命中 / 授权≠信任 / S1-S2-S3 / 发现审计 | 全部断言通过；危险工具未确认前 RPC 不被调用；无静默 allow | 接口数据 + 测试覆盖 | 独立脚本 |
| V5 | 协议机制（FR-010~014，NFR-009，EC-001/002/014） | 真实模块验证：发现三态 / well-known+html-link+相对 href / 默认 untrusted / 完整性篡改检测 / 版本 accept·degrade·reject / 非法声明可读拒绝 / RPC 契约 roundtrip / 超时可读 | 全部断言通过；站点中立无硬编码 | 接口数据 | 独立脚本 + grep |
| V6 | 红线 grep（NFR-001/005/009，AC-012） | 12 项断言：无 `.executor(` 旁路 / 无 silentAllow / effectiveRisk 不返回 riskHint / 零 LGDL 私有依赖 / 运行时依赖仅 base / 无空 catch / content 无全局污染 / 无 lgdl-ai-settings·localStorage / base 零改动 / protocol·discovery·security 无站点特化 / 无 base 源码分叉 / content 不持 key | 全部 0 命中 | 漂移 + 接口 | 独立脚本 |
| V7 | G-MV3 平台门（FR-005/006/009，NFR-002/004，AC-002） | `chromium --headless=new --load-extension=dist` + CDP 连接 service_worker；探针 manifest/permissions/optional/storage/sidePanel/scripting | SW target 可达；mv=3；permissions=[activeTab,scripting,storage,sidePanel]；无 tabs；无静态 content_scripts；storage 往返 true；0 扩展异常 | 构建 + 性能边界 | 独立脚本 |
| V8 | G-KEY 端点门（FR-034，EC-009） | SW 内带 Authorization fetch 火山端点 | 返回 HTTP 状态码（非 CORS/网络失败） | 接口数据 | 独立脚本 |
| V9a | 全链浏览器验证·受控 harness（FR-016/017/018/020/041/042/043，AC-009/010，EC-011/013） | 真实 dist 拷贝 + **仅**补 fixture origin 到 manifest.host_permissions（唯一偏差，已披露）；真实内容脚本注入 → 自动发现 → 授权 → mock LLM 驱动 chat → host CommandRouter → invokeSite → content → page RPC → 回写结果；三轮（读 / 写+确认放行 / 写+确认拒绝）；核对审计事件、多轮历史、零异常 | 读工具返回 `welcome`；写工具经确认放行后 `✓ note added`；拒绝后不执行且后续读可见/不可见对应状态；审计含 origin-authorize/descriptor-read/permission/tool-call/confirm(ask·allow·deny)；多轮历史累积 | 接口数据 + 测试覆盖 | 独立 harness 脚本 |
| V9b | 全链浏览器验证·真实产物人工面 H0/H6（R8） | 用**未改动**的真实 dist 尝试 `chrome.permissions.request` 与 `chrome.scripting.executeScript` | 预期受限于无 activeTab 手势/无权限对话框 → 记录确切失败；移交人工面 | 构建 | 独立脚本（如实标注无法执行） |
| V10 | FR/NFR/EC/AC 承接矩阵（全部） | 逐项将 FR/NFR/EC/AC 映射到测试用例或脚本证据 | P0 FR 100% 有证据；NFR ≥80%；EC/AC 逐项判定 | 测试覆盖 | 静态 + 实测 |
| V11 | 漂移检测（NFR-005，AC-012） | `git status`/`git diff` 核对 spec/plan/tasks 未改；扫描孤立代码/需求缺失；核对文档与实现一致性 | spec/plan 零改动；无严重漂移；记录文档级偏差 | 漂移 | 脚本 + 人工 |
| V12 | 遗留核验（review R2 §7.4） | 逐项核对 10 项遗留是否被如实标注；核对 P1/P2 文件确实未产出 | 10 项均如实标注；P1/P2 未实现项显式列出 | 漂移 | 脚本 + 人工 |
| V13 | 依赖纪律（NFR-009，AC-012） | 核对根 package.json 零改动、插件运行时依赖仅 base、lgdl-web 仅 test 脚本追加（零删除） | 零新增运行时依赖；既有测试守恒 | 构建 + 漂移 | 脚本 |

> **质量门槛**：P0 范围内每个 FR ≥ 1 个 Vx；五个验证维度（测试覆盖/接口数据/构建/性能边界/漂移）均至少 1 条；无法执行项显式标注「无法执行/移交人工」。

## 3. 验证维度与判定口径

| 维度 | 对应 Vx | 判定口径 |
|------|:--:|------|
| 测试覆盖 | V2/V4/V5/V9a/V10 | 用例通过 + FR/NFR 逐项承接 |
| 接口数据 | V4/V5/V8/V9a | 真实模块/浏览器实测行为符合 spec 契约 |
| 构建 | V1/V3/V7/V9b/V13 | 退出码 0、产物完整、门禁可达 |
| 性能边界 | V7/V10 | NFR-007 无量化阈值 → 标注「未定义/无法执行」，不作虚假达标 |
| 漂移 | V6/V11/V12 | spec/plan 零改动；孤立代码/需求缺失如实记录 |

## 4. 结论判定规则

- ✅ **通过**：0 阻塞 + 构建/门禁全绿 + P0 FR 100% 承接 + NFR ≥80% + 0 严重漂移
- ⚠️ **有条件通过**：0 阻塞但存在非阻塞偏差（含文档漂移、无法执行的浏览器人工面、release 前安全加固项）
- ❌ **不通过**：存在阻塞（安全红线/构建失败/未覆盖 P0 FR/严重漂移）

## 5. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：V1~V13 验证场景矩阵（P0 最小可用集 + R1 修复轮） | 2026-09-11 | SDDU Validate Agent |
