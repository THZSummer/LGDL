# 发布渠道与版本管理（FR-046 / S-016 / TASK-016）

> **文档定位**: 定义 web-cli 插件首版的**分发渠道、分发物构成与版本管理方式**；商店发布（Chrome Web Store 等）为后续动作（S-016，本版不做）。
> **适用范围**: `@lgdl/web-cli-plugin`（`packages/web-cli-plugin`，private 包，`version` 当前 `0.8.0`）。
> **基线**: 上游运行时依赖仅 `@lgdl/web-cli-base ^0.7.0`（零其他运行时依赖，见 `package.json`）。

## 1. 渠道策略（首版）

首版**不发布到浏览器扩展商店**，采用两类可自持渠道：

| 渠道 | 适用 | 分发物 | 获取方式 | 本版 |
|------|------|--------|----------|:----:|
| **本地 unpacked（开发/自用）** | 开发者、内测、自托管部署前验证 | `dist/` 目录（未打包） | `npm run build --workspace @lgdl/web-cli-plugin` → `chrome://extensions` 开发者模式「加载已解压的扩展程序」→ 选 `packages/web-cli-plugin/dist` | ✅ 主渠道 |
| **自托管 / 未打包分发** | 团队内分发、非商店安装 | 构建产物压缩包（`dist` 的 `.zip`/tar），或源码 + 构建脚本 | 由分发方托管（内部制品库/文件共享）；接收方解压后按 unpacked 加载 | ✅ 支持 |
| **浏览器商店（后续）** | 公开分发 | 商店要求的打包产物 + 商店表单/审核材料 | Chrome Web Store 等 | ⏳ 后续（S-016） |

> 说明：解压加载（unpacked）方式下 Chromium 会提示「开发者模式扩展」，这是 Chromium 的安全提示，非缺陷。企业/团队分发可结合浏览器策略做强制安装（策略配置超出本版范围）。

## 2. 分发物构成（`dist/`）

`npm run build --workspace @lgdl/web-cli-plugin` 由 `build.mjs`（esbuild）产出：

| 产物 | 说明 |
|------|------|
| `dist/manifest.json` | MV3 清单（`background.service_worker` type module；权限面最小化：`activeTab`/`scripting`/`storage`/`sidePanel`；`optional_host_permissions https://*/*`；`side_panel.default_path`；`options_page`；无静态全站 `content_scripts`） |
| `dist/background.js` | Service Worker（控制面：消息路由 + 门禁 + 工具注册 + LLM/key） |
| `dist/content.js` | content script（数据面：isolated world + page-bridge RPC） |
| `dist/sidepanel.html` + `dist/sidepanel.js` | side panel UI（会话/授权/二次确认/审计/风控/ask-user） |
| `dist/options.html` + `dist/options.js` | 设置页（8 厂商 BYOK / 迁移指引 / 合规清单入口） |
| 其他静态资源 | 由 `build.mjs` 从 `src/ui/**` 拷贝（HTML 等） |

**分发前核对**：
1. `npm run build --workspace @lgdl/web-cli-plugin` 成功，`dist/` 含 `manifest.json` 与三面入口。
2. `npm run typecheck --workspace @lgdl/web-cli-plugin` 0 error。
3. `npm run test --workspace @lgdl/web-cli-plugin` 全绿（含 `docs.test.ts` 文档引用完整性）。
4. 冒烟：`docs/smoke-checklist.md`（机械面 CDP 可自动；人工面 H0~H10 需真实浏览器交互）。
5. 压缩分发时**排除**开发产物（`dist-test/`、`test/`、`node_modules/`），仅分发 `dist/`。

## 3. 版本管理

- **版本号来源**：`packages/web-cli-plugin/package.json` 的 `version`（当前 `0.8.0`，与 LGDL v0.8 主题「浏览器插件孵化」对齐）。`manifest.json` 的 `version` 由构建/维护与之一致，发布前核对。
- **版本位约定**：
  - 跟随 LGDL 版本线（v0.8 = 插件孵化首版）；上游 `@lgdl/web-cli-base` 兼容基线在 `dependencies` 以 `^` 约束（`^0.7.0`）。
  - 破坏性协议变更（descriptor/RPC/信任语义）→ 升 minor 并同步 `docs/protocol.md` 的版本协商说明；纯修复 → patch。
- **变更记录**：随仓库根 `CHANGELOG.md` 或 Feature 过程产物（`build.md`）登记；每版记录：版本号、基线（上游 base 版本）、分发物校验（构建字节/冒烟结论）、已知偏差。
- **可重复构建**：不含随机/时间戳注入（`build.mjs` 为确定性 esbuild 打包）；同一源码构建产物字节应一致。R8 E2E 的唯一已知偏差（`manifest` 副本 `host_permissions` 追加本地 origin）**仅存在于测试副本**，不进入分发物（见 `state.json` / `build.md` §11.4）。
- **回退**：分发渠道不保留历史版本的硬承诺；紧急回退以内置助手下线回退预案为准（`docs/migration.md` §5.4：`git revert` 下线提交 + `VITE_AI_ASSISTANT_FALLBACK` 默认 off）。

## 4. 商店发布（后续，S-016）

本版**不承诺**商店发布时间表。后续立项需至少覆盖：
- 商店材料：隐私政策（权限用途、LLM key 本地存储、审计数据不落远端）、权限最小化说明、截图/描述。
- 审核合规：MV3 合规、远程代码/LLM 端点声明、`optional_host_permissions` 用途说明。
- 发布管道：签名打包、版本升级、回滚策略。
- 与 `docs/compliance.md`（站点自动化条款评估）和 `docs/migration.md`（存量迁移）的一致性复核。

## 5. 引用

- 开发与调试（本地加载 / 热重载）：`docs/dev.md`
- 冒烟方法论（机械面/人工面）：`docs/smoke-checklist.md`
- 迁移与回退预案：`docs/migration.md`
- 合规（站点条款 / 不适用清单）：`docs/compliance.md`
- 协议（站点中立）：`docs/protocol.md`

## 6. 变更记录

| 版本 | 说明 |
|------|------|
| 1.0 | 首版（TASK-016 / FR-046）：本地 unpacked + 自托管/未打包分发；分发物构成与构建核对；版本管理约定；商店发布后续（S-016）。 |
