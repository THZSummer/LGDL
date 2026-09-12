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
| `dist/manifest.json` | MV3 清单（`background.service_worker` type module；权限面：`activeTab`/`scripting`/`storage`/`sidePanel`/**`tabs`（FR-049 作者决策③）**；`optional_host_permissions https://*/*`；`side_panel.default_path`；`options_page`；无静态全站 `content_scripts`） |
| `dist/background.js` | Service Worker（控制面：消息路由 + 门禁 + 工具注册 + LLM/key） |
| `dist/content.js` | content script（数据面：isolated world + page-bridge RPC） |
| `dist/sidepanel.html` + `dist/sidepanel.js` | side panel UI（会话/授权/二次确认/审计/风控/ask-user + **TASK-033 面板内设置视图**） |
| `dist/options.html` + `dist/options.js` | **兜底**设置页（8 厂商 BYOK / 迁移指引 / 合规清单入口；主设置入口已改为侧栏内设置视图，本页保留供 `chrome://extensions` 与宽屏排障，逻辑与面板共用 `src/ui/settings/`） |
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

## 5. 安装警告与用户可感知差异（v0.9 增补：`tabs` 权限 / FR-049）

> 作者 2026-09-12 决策③：**同意新增 `tabs` 权限**（接受安装警告），用于插件级标签页管理工具 `tabs`（list/switch/open；**不含 close**）。这是相对上一分发包**唯一**的权限变化。

### 5.1 安装/更新警告变化

| | 上一分发包 | 本包 |
|--|-----------|------|
| `permissions` | `activeTab` / `scripting` / `storage` / `sidePanel` | 同左 **+ `tabs`** |
| Chrome 权限提示 | 无浏览数据相关提示 | 新增 **「读取您的浏览记录」**（Chrome 对 `tabs` 的通用措辞） |
| 其他权限 | — | **零新增**（无 `<all_urls>`、无 `*://*/*`、无静态 `content_scripts`） |

**如实告知**：该提示为浏览器统一措辞；插件只用 `tabs` 读取**当前打开标签页**的 id/标题/URL，用于助手列出/切换/打开标签页，**不读取浏览历史**（§ compliance.md §9.1/§9.2）。用户不接受该权限时可不安装/不更新；安装后可在 options 页关闭应用内开关（见下）。

### 5.2 用户可感知差异

| 差异 | 说明 |
|------|------|
| 新增助手工具 `tabs` | `list`（列出标签页，默认仅 origin+path）/ `switch`（切页并切会话）/ `open`（打开新 http(s) 标签页）；**不含 close** |
| 新增安装权限提示 | 见 §5.1「读取您的浏览记录」 |
| 新增 options 开关 | 「允许助手查看/切换标签页（默认开）」；关闭后 `tabs` 从 LLM 工具面移除（面板内设置视图与 options 兜底页都可操作） |
| **设置入口变化（TASK-033）** | 侧栏顶部「⚙ 设置」改为**面板内设置视图**（零跳转、不开新标签页、切回保留聊天）；`options.html` 保留为兜底页（`chrome://extensions` → 扩展程序选项） |
| 绑定回退路径增强 | 有 `tabs` 后后台可直接读取当前标签页 URL，`rebind` 不再依赖点击手势即可读取地址（点图标路径保持不变） |
| 隐私默认 | `list` 默认去除 query/fragment，避免用户查询串进入模型上下文；仅 `--full` 显式返回完整 URL |

## 6. 引用

- 开发与调试（本地加载 / 热重载）：`docs/dev.md`
- 冒烟方法论（机械面/人工面）：`docs/smoke-checklist.md`
- 迁移与回退预案：`docs/migration.md`
- 合规（站点条款 / 不适用清单）：`docs/compliance.md`
- 协议（站点中立）：`docs/protocol.md`

## 7. 变更记录

| 版本 | 说明 |
|------|------|
| 1.0 | 首版（TASK-016 / FR-046）：本地 unpacked + 自托管/未打包分发；分发物构成与构建核对；版本管理约定；商店发布后续（S-016）。 |
| 1.1 | FR-049（作者决策③ 2026-09-12）：新增 `tabs` 权限与插件级标签页管理工具（list/switch/open，不含 close）；补 §5 安装警告变化（「读取您的浏览记录」）与用户可感知差异；§2 权限面同步。 |
| 1.2 | TASK-033：设置入口由跳转 `options.html` 改为**侧栏内设置视图**（零跳转、聊天状态保留）；设置逻辑抽为共享模块 `src/ui/settings/`（面板与 options 兜底页共用，消除分叉）；`options.html` 保留为兜底、功能不退化；**无新权限、无新依赖、manifest 零改动**。 |
