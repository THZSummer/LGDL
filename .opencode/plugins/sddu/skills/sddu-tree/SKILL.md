---
name: sddu-tree
description: "SDDU 目录导航 Skill - 当 Agent 完成主流程后需要为指定 Feature 目录及父目录链生成或更新 TREE.md 目录导航文件时使用。负责接收 Feature 路径并调用脚本完成目录扫描、文件简介提取和导航文件生成，不聚合多 Feature 产物。"
---

# sddu-tree

## 概述

你是 SDDU 目录导航 Skill。你的核心能力是调用 `scripts/generate-tree.cjs` 脚本，为指定 Feature 目录及父目录链生成/更新 `TREE.md` 导航文件。

**职责边界**：
- **负责**：加载 Skill → 接收 `--target` 路径 → 调用脚本 → 解析 JSON 报告 → 输出人类可读摘要
- **不负责**：不直接执行 find/head/grep/read（由脚本确定性处理），不聚合多 Feature 产物（sddu-docs 职责）

**触发条件**：
- **自动触发**：8 个主流程 Agent 完成后，通过 `## Skill 发现` 章节加载，传入当前 Feature 路径
- **手动触发**：用户显式请求「更新 .sddu 目录导航」「扫描 TREE」「生成目录树」等

## 接口

阅读本章节即可使用本 Skill，无需阅读后续工作流细节。

### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| `target` | string | ✅ | 当前 Feature 目录路径。相对 `.sddu/` 的路径，如 `specs-tree-root/specs-tree-tree-skill/`。由 Agent 模板完成协议自动传入。 |

### 返回值

**成功**（脚本 stdout JSON）：
```json
{
  "created": [".sddu/specs-tree-root/specs-tree-tree-skill/TREE.md"],
  "updated": [{"path": ".sddu/specs-tree-root/TREE.md", "changes": ["状态变更: specs-tree-tree-skill -> ✅ 已完成"]}],
  "skipped": [".sddu/TREE.md"],
  "errors": [],
  "stats": {"scanned": 3, "created": 1, "updated": 1, "skipped": 1}
}
```

**后续**：Agent 解析 JSON 报告，向用户输出人类可读摘要（已创建 X 个、已更新 Y 个、跳过 Z 个）。

### 调用示例

```
Agent 完成主流程 -> 加载 sddu-tree Skill -> 传入当前 Feature 路径
-> node scripts/generate-tree.cjs --target specs-tree-root/specs-tree-tree-skill/
-> 解析 JSON 报告 -> 输出摘要
```

## 前置条件

在调用脚本前：
1. 检查 `.sddu/` 目录是否存在
2. 如不存在，输出「❌ .sddu/ 目录不存在，请先初始化 SDDU 工作空间」，不抛异常
3. 确认 `--target <Feature路径>` 参数可用（自动触发由 Agent 模板传入当前 Feature 路径）

## 工作流

### 步骤 1：验证前置条件

检查 `.sddu/` 目录存在 → 不存在则输出错误提示并终止。

### 步骤 2：调用 generate-tree 脚本

调用 `scripts/generate-tree.cjs`：
- **用途**：扫描指定 Feature 目录及父目录链，生成/更新各层级 TREE.md
- **入参**：`--target <当前 Feature 路径>`（必填。相对 .sddu/ 的路径，如 `specs-tree-root/specs-tree-tree-skill/`）
- **出参**：stdout JSON 变更报告，字段：
  - `created` — 新建的 TREE.md 路径列表
  - `updated` — 更新的 TREE.md 路径及变更明细列表
  - `skipped` — 跳过的 TREE.md 路径列表（内容一致，无变化）
  - `errors` — 错误列表
  - `stats` — 统计汇总 (scanned/created/updated/skipped)
- **退出码**：0=成功，1=致命错误
- **Agent 行为**：执行 `node scripts/generate-tree.cjs --target <path>` → 捕获 stdout → 解析 JSON

### 步骤 3：解析报告并输出摘要

根据 JSON 报告的 `created`/`updated`/`skipped` 字段，输出人类可读摘要：
- 已创建 X 个、已更新 Y 个、跳过 Z 个
- 如有 errors，输出 ⚠️ 警告

## 异常处理

| 场景 | 处理方式 |
|------|----------|
| `.sddu/` 目录不存在 | 输出「❌ .sddu/ 目录不存在，请先初始化 SDDU 工作空间」，不中断主流程 |
| 脚本返回非零退出码 | 读取 stderr → 输出 ⚠️ 警告 + 脚本错误信息，不中断主流程 |
| 脚本 stdout 非合法 JSON | 输出 ⚠️ 警告：脚本输出异常，目录导航未更新 |
| `--target` 路径无效 | 由脚本 exit(1) 返回错误信息 → Agent 转发输出 |

## Skill 发现

需要发现或使用 SDDU Skill 时，读取 `.opencode/plugins/sddu/skills/sddu-skill-discovery/SKILL.md` 获取完整指引。

## 脚本

| 脚本 | 路径 | 用途 |
|------|------|------|
| generate-tree.cjs | scripts/generate-tree.cjs | 扫描 Feature 目录及父目录链，生成/更新 TREE.md。入参 `--target <path>`，出参 stdout JSON。 |

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建 — 从 @sddu-tree Agent 模板（265 行）全量迁移为框架级 Skill。Progressive Disclosure 三层编排。 | 2026-07-22 | SDDU Build Agent |
| v2.0 | 脚本化 + 定向扫描优化：6 步工作流移入 `scripts/generate-tree.cjs`（确定性执行），body 从 223 行缩减到 ~55 行，新增 `--target` 定向扫描替代全量扫描。 | 2026-07-22 | SDDU Build Agent |
| v2.1 | 对照 sddu-skill-creator 规范修正：description 去除关键词堆砌 + 新增标准 ## 接口 章节 | 2026-07-22 | SDDU Build Agent |
