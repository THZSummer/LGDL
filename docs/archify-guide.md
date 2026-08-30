# Archify 使用指南

> Agent-first 的"架构图即代码"工具：Agent 在对话中生成 Typed JSON IR，Archify 校验后确定性编译为自包含、可交互的 HTML/SVG 技术图。
> 仓库：<https://github.com/tt-a1i/archify>（MIT，30k+ stars）

## 项目介绍

### 定位

- **Mermaid 替代品**，但不是通用绘图编辑器：不做自动 Mermaid 解析、通用自动布局、WYSIWYG 编辑器、托管分享服务
- Agent 负责生成 **Typed JSON IR**，Archify 负责**校验**并**确定性编译**为便携成品
- 核心理念："Truth before spectacle"——所有聚焦、路径、可达范围、源码链接都必须来自作者定义或已验证的证据，不编造拓扑

### 五种图类型

| 类型 | 最适合 | Prompt 中应包含 |
|---|---|---|
| **architecture** | 组件、服务、存储、系统边界 | 范围、核心组件、主要路径 |
| **workflow** | CI/CD、审批、工具调用、Runbook | 参与者、顺序、分支、异常 |
| **sequence** | API 调用、缓存回源、鉴权、异步链路 | 调用方、被调用方、返回、时序 |
| **dataflow** | 数据管线、血缘、PII、下游消费者 | 来源、转换、存储、边界 |
| **lifecycle** | 状态、重试、等待、终态 | 状态、事件、重试与取消路径 |

### 核心特性

1. **Typed JSON IR** —— 每种图都有 Schema 和可复现的源文件
2. **交付前门禁** —— Schema、布局、HTML/SVG、线路、标签净空检查全部通过，成品才会原子替换
3. **结构化修复回执** —— `validate --json` / `deliver --json` 返回稳定规则码、精确对象和 `supportedFixes`，最多两轮聚焦修复
4. **交互不编造拓扑** —— 聚焦 / 上下游可达 / 路径探查 / 角色对比 / 故事播放都复用作者定义的节点与关系
5. **源码证据** —— Architecture 节点可带 `SRC n`，打开由 Git 校验、固定到公开 commit 的文件与行号
6. **Delta 对比** —— 两份快照 → Before / Delta / After，适合 PR / 设计评审
7. **便携交付** —— 单个 HTML 文件即可分享；导出支持 PNG / SVG / WebM / 1200×630 分享卡片
8. **显式动效** —— 不设置 `animation` 则完全静态；动效遵守 `prefers-reduced-motion`，不进入标准导出

### 工作原理

| 步骤 | 发生什么 |
|---|---|
| 生成 | Agent 根据描述创建 Typed JSON IR |
| 校验 | 内置 Validator 和布局规则检查；失败时返回机器可读 JSON 指出局部修复 |
| 预览（可选） | 仅 loopback 的桌面会话监听一个 JSON 源文件，只刷新通过验证的版本，失败时保留最后好图 |
| 交付 | 生成候选并检查；只有通过门禁的结果才原子替换目标文件 |
| 迭代 | Agent 修改源文件，不干扰无关结构 |

## 安装

### 环境要求

- Node.js `>=18`（本仓库安装时使用 v24.15.0，满足要求）

### 方式一：skills CLI（推荐）

```bash
# 全局安装（所有项目可用）
npx skills add tt-a1i/archify -g

# 项目级安装
npx skills add tt-a1i/archify --skill archify --agent opencode --copy --yes
```

### 方式二：手动安装

把仓库的 `archify/` 子目录复制到 opencode 的 skills 目录之一：

- `~/.config/opencode/skills/`（全局）
- `.opencode/skills/`（项目级，本仓库采用此方式）
- `.agents/skills/`

```bash
git clone --depth 1 https://github.com/tt-a1i/archify
cp -r archify/archify <目标 skills 目录>/archify
```

> 网络加速：GitHub 直连慢时可使用镜像代理，
> 如 `https://gh-proxy.com/https://github.com/tt-a1i/archify`。

### 其他 Agent 支持

| 使用位置 | 安装方式 |
|---|---|
| Claude Code | `~/.claude/skills/` 或 `.claude/skills/` |
| Codex CLI | `~/.agents/skills/` 或 `.agents/skills/` |
| Cursor | 通过 agent switcher 生成命令 |
| Raven | ZIP 解压到 `~/.raven/workspace/skills` |
| Claude.ai | Settings → Capabilities → Skills 上传 `archify.zip` |

### 安装验证

```bash
cd .opencode/skills/archify
node bin/archify.mjs doctor   # 全部 [ok] 且输出 "Archify is ready."
```

## 使用

### 对话中使用（Agent Skill 模式）

安装后重启 opencode 会话，直接说：

```text
使用 archify 梳理这个仓库的运行时架构
```

带约束的推荐写法（效果更好）：

```text
分析这个仓库，然后使用 archify 生成一张高层运行时架构图。
只保留 8–12 个核心组件，突出一条主要路径，并标出外部依赖与信任边界。
辅助信息放进说明卡片，不要继续增加连线。
```

针对单条链路：

```text
使用 archify 画出这条登录流程：Browser -> Web App -> API -> JWT 校验 ->
Redis Session 查询 -> PostgreSQL 回源。把缓存未命中作为次要路径。
```

对话中可持续细调（`增加 Redis`、`把鉴权移到左侧`、`突出回滚路径`），Archify 保留 Typed Source，只修改相关部分。

### CLI 直接使用（零依赖）

入口：`node .opencode/skills/archify/bin/archify.mjs <command>`

```bash
# 场景选图建议（不确定用哪种图时）
node bin/archify.mjs guide "展示带 Redis 缓存未命中的 API 请求"
node bin/archify.mjs guide "梳理 Kafka Topic、消费者组、重放和死信队列" --json

# 校验
node bin/archify.mjs validate workflow examples/agent-tool-call.workflow.json --quality showcase --json

# 预览（显式启用的桌面创作模式，仅监听 127.0.0.1）
node bin/archify.mjs preview workflow examples/agent-tool-call.workflow.json /tmp/workflow.html --quality showcase

# 交付（校验通过才原子写入目标文件）
node bin/archify.mjs deliver workflow examples/agent-tool-call.workflow.json /tmp/workflow.html --quality showcase --open --json

# 架构对比（PR / 设计评审）
node bin/archify.mjs compare architecture base.json head.json architecture-delta.html --json

# 生成示例与演示
node bin/archify.mjs demo /tmp/archify-demo
```

### 命令速查

| 命令 | 用途 |
|---|---|
| `render <type> <in.json> [out.html]` | 渲染为 HTML/SVG |
| `validate <type> <in.json>` | 校验源文件，`--json` 输出结构化诊断 |
| `deliver <type> <in.json> [out.html]` | 校验 + 原子交付，可选 `--open` |
| `preview <type> <in.json> [out.html]` | 桌面实时预览，失败保留最后好图 |
| `compare architecture <base> <head> [out]` | Before / Delta / After 对比 |
| `inspect <type> <in.json>` | 查看源文件结构摘要 |
| `check <out.html>` | 检查已生成的 HTML 成品 |
| `visual-check <out.html>` | 视觉检查 |
| `guide [场景]` | 根据场景建议图类型 |
| `brands [name]` / `brands capture <url>` | 内置品牌徽标查询 / 捕获 |
| `examples` / `doctor` / `demo [dir]` | 示例 / 体检 / 生成演示 |

图类型：`architecture` / `workflow` / `sequence` / `dataflow` / `lifecycle`

### 源文件关键配置

```json
{
  "meta": {
    "locale": "zh-CN",
    "animation": "trace",
    "visual_preset": "signal-flow"
  }
}
```

- `locale`：`en` 或 `zh-CN`，影响 `<html lang>`、默认图例和固定 Viewer UI；不设置默认英文，作者内容不会被机器翻译
- `animation`：不设置则完全静态
- `visual_preset`：`classic`（默认）/ `signal-flow` / `blueprint` / `editorial`

### 失败修复约定

- 读取 `validate --json` / `deliver --json` 输出的 `diagnostics[]`
- 只修改 `subject` 指向的对象，使用 `supportedFixes` 列出的修复方式
- 不要整图重写，不要突破最多两轮的聚焦修复上限
- 确定性诊断通过不等于视觉复核通过，重要成品建议 `visual-check`

## 与本仓库（LGDL）的关联

LGDL 本身做图表语言与 SVG 渲染（`packages/render`），Archify 的以下思路值得参考：

- **确定性渲染**：同一 IR 恒定产出同一成品
- **交付前门禁 + 结构化诊断**：机器可读规则码 + `supportedFixes`，而非堆栈/自由文本
- **便携单文件 HTML**：成品自包含、零运行时依赖
- **显式能力开关**：动效、预览、工程画像都是 opt-in，不静默开启
