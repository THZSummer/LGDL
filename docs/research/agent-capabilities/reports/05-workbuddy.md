# WorkBuddy 基础能力调研报告

> 调研对象：WorkBuddy（腾讯系桌面 AI 助手，与 CodeBuddy 同源）
> 方法：gh CLI 拉取社区归档仓库 `infometa/workbuddyskills`（WorkBuddy 公开市场包：技能/连接器/专家/插件）+ 官网
> 日期：2026-09-06
> 目的：为 web-cli-base 孵化提供"agent 基础能力"参考输入

---

## 1. 定位

**WorkBuddy 是桌面 AI 助手（desktop agent harness）**，属于 Claude Code / OpenClaw 同类的本地 agent。特色是**强大的市场生态**：技能包 / 连接器 / 专家插件 / 插件市场四层，走"开箱即用"路线（装技能即得能力，无需写代码）。

> 背景：WorkBuddy 与腾讯 CodeBuddy 相关，公开市场包由社区归档（`infometa/workbuddyskills`）。

## 2. 生态规模（社区归档实测）

| 分类 | 数量 | 说明 |
|------|------|------|
| 技能包 `skills/` | **295** | 每包含 `SKILL.md` |
| 连接器 `connectors/` | **103** | 每连接器含 `mcp.json` + 自带 skills |
| 专家插件 `experts/` | **410** | agents / skills / avatars + expert_center.json |
| 官方插件 market | **57** | |
| 团队插件 market | **31** | |

**技能分类**：AI/Agent 工具 159、腾讯/微信/企微 47、文档/办公 44、搜索/研究 15、设计/UI 12、数据/金融 6、内容/营销 5、云/存储 4、开发/工程 2。

## 3. 基础能力实现方式

### 3.1 技能（Skill）= SKILL.md + frontmatter
WorkBuddy 技能与 OpenClaw/Claude Code **完全同构**：

```markdown
---
name: browser
description: "headless Puppeteer browser..."
version: 1.0.0
allowed-tools: Bash          # 声明该技能允许用哪些工具
---

# SKILL: Browser
...
```

**关键设计：**
- `allowed-tools` 字段：技能可声明自己需要的工具白名单（权限下沉到技能级）
- 多语言 description（description_zh/en）：市场国际化
- 技能即"能力包"：装一个技能 = 获得一类能力（浏览器、CLI、云部署等）

### 3.2 连接器（Connector）= mcp.json + skills
每个连接器是一个 MCP 服务配置（`mcp.json`）+ 配套 skills。**能力通过 MCP 标准协议挂载**（百度网盘、77ircloud、AWS 等 103 个）。

### 3.3 专家插件（Expert）= agents/skills/avatars
专家 = 角色化 agent 包（410 个），如 a-share-analysis（A股分析）、academic-journal-selector（期刊选投）等——**专业领域 agent 预制化**。

### 3.4 插件市场
官方/团队两级 marketplace，走"一键安装"分发（类 VSCode 插件市场）。

## 4. 代表性能力（从市场抽样）

| 能力 | 实现 | 说明 |
|------|------|------|
| 浏览器渲染 | `browser` 技能（Puppeteer）| 渲染 JS 页面提文本 |
| 浏览器自动化 | `browser-use` 技能（browser-use）| 表单填写/截图/数据提取 |
| 云浏览器 | `browser-cash` 技能 | Browser.cash API 反反爬 |
| 云开发部署 | `cloudbase` 技能 | 微信云开发全栈 |
| 拆书/技能提取 | `cangjie-skill` | 书→可执行技能集 |
| 能力进化 | `capability-evolver` | GitHub API 自动发 issue/release |
| 专业分析 | `a-share-analysis` 等专家 | 领域 agent 预制 |

## 5. 对 web-cli-base 孵化的可借鉴点

| # | WorkBuddy 设计 | 借鉴价值 |
|---|---------------|---------|
| 1 | **技能 = SKILL.md + allowed-tools** | 技能声明工具白名单——权限下沉到技能粒度（web-cli-base 可借鉴"技能即权限边界"） |
| 2 | **能力靠市场包分发（零代码安装）** | 295 技能/103 连接器/410 专家全是装即用——生态分发决定能力丰富度 |
| 3 | **MCP 连接器标准** | 所有外部能力走 mcp.json——web-cli-base 扩展对齐 MCP 已验证 |
| 4 | **专家 = 角色化 agent 预制** | 领域 agent 可预制分发（A股分析、期刊选投等） |
| 5 | **多语言 description** | 技能国际化元数据 |
| 6 | **连接器自带 skills** | 连接器 = 配置 + 使用说明绑定，开箱即用 |

## 6. 一句话结论

WorkBuddy 验证了 **"SKILL.md 技能 + MCP 连接器 + 专家预制 + 市场分发"** 这条 agent 能力生态路线的可行性与规模（近 900 个市场包）。对 web-cli-base 最值得搬的是 **allowed-tools 技能级权限声明**、**连接器自带 skills 的开箱即用模式**、**领域专家预制分发**——它证明了"agent 基础能力"不只是 8 个核心工具，而是**可无限扩展、按技能/连接器封装的生态**。
