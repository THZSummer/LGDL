---
name: sddu-skill-discovery
description: "当 SDDU Agent 需要发现可用的 SDDU Skill 时加载此 Skill。描述如何扫描源目录、识别有效 SKILL.md、区分框架级（sddu-前缀）和用户级（无前缀）Skill。仅覆盖 SDDU 源目录扫描流程（流程①），不涉及 LLM Agent 原生发现机制。"
---

# sddu-skill-discovery

## 接口

阅读本章节即可使用本 Skill，无需阅读后续实现细节。

发现操作的确定性步骤（目录扫描、frontmatter 解析、level 判定）由 `scripts/discover.cjs` 锁死实现——Agent 调用脚本即可，**不要**手动执行 `ls`/`read`/解析 YAML 等自由操作。

### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| `action` | string | ✅ | `list` — 获取所有 Skill 目录名<br>`summary <name>` — 读取指定 Skill 摘要<br>`path <name>` — 获取指定 Skill 路径 |
| `name` | string | 条件 | `summary` 和 `path` 需要——Skill 目录名 |
| `--user-src` / `--fw-src` | string | ❌ | 覆盖源目录（默认 `.sddu/skills/` / `.opencode/plugins/sddu/skills/`） |

### 返回值（stdout JSON）

**`list`**：
```
["sddu-skill-discovery", "sddu-skill-creator", "sddu-skill-sync", "payment-integration"]
```
- 扫描 `.sddu/skills/`（用户级）+ `.opencode/plugins/sddu/skills/`（框架级）
- 仅返回符合 `^[a-z0-9]+(-[a-z0-9]+)*$` 的目录名（隐藏目录跳过）
- 源目录不存在时跳过，不报错

**`summary <name>`**：
```
{ "name": "payment-integration", "description": "...", "level": "user", "source": ".sddu/skills/payment-integration/" }
```

| 异常 | 返回值 |
|------|--------|
| 目录无 SKILL.md | `{ "error": "invalid", "reason": "missing SKILL.md" }` |
| frontmatter 缺少必填字段 | `{ "error": "malformed", "reason": "missing name/description" }` |
| 技能不存在 | `{ "error": "not_found", "name": "<name>" }` |

**`path <name>`**：
```
{ "path": ".sddu/skills/payment-integration/", "level": "user" }
```
- 拿到路径后 Agent 自行进入目录，按需读取 SKILL.md body 及 references/、scripts/ 等资源

### 调用示例

```
node scripts/discover.cjs list
→ ["sddu-skill-discovery", "sddu-skill-creator", ...]

node scripts/discover.cjs summary payment-integration
→ { name: "...", description: "...", level: "user", ... }
或 → { error: "invalid", reason: "missing SKILL.md" }

node scripts/discover.cjs path payment-integration
→ { path: ".sddu/skills/payment-integration/", level: "user" }
```

### 冷启动

若 `list` 结果包含 `sddu-skill-sync` 但实际目录 `.opencode/skills/` 为空——从源目录 `.opencode/plugins/sddu/skills/sddu-skill-sync/SKILL.md` 加载 `sddu-skill-sync` 执行同步。

---

## 操作

> 以下为接口的实现细节——LLM 按 ## 接口 中的参数调用即可。
>
> **执行方式**：本 Skill 的确定性步骤（扫描、frontmatter 解析、level 判定）由 `scripts/discover.cjs` 实现。Agent 只需调用脚本并解读 JSON；以下各操作为**原理说明**（知识背景），供理解与排障，不要求 Agent 手动执行。

### 操作 1：列出所有 Skill

**入参**：无

**出参**：
```
["sddu-skill-discovery", "sddu-skill-creator", "sddu-skill-sync", "payment-integration"]
```

**规则**：
- 扫描 `.sddu/skills/`（用户级）和 `.opencode/plugins/sddu/skills/`（框架级）
- 仅返回符合 `^[a-z0-9]+(-[a-z0-9]+)*$` 的目录名
- 不判断目录内是否有有效 SKILL.md（交给操作 2）
- 源目录不存在时跳过，不报错

**开销**：低（`ls` 目录，不读文件内容）

### 操作 2：读取 Skill 摘要

**入参**：Skill 目录名（字符串，如 `payment-integration`）

**出参**：
```
{ "name": "payment-integration", "description": "当用户需要接入支付渠道时...", "level": "user", "source": ".sddu/skills/payment-integration/" }
```

**规则**：
- 在源目录中定位 `<name>/SKILL.md`，仅解析 frontmatter 的 `name` 和 `description`
- `level` 判断：`name` 以 `sddu-` 开头 → `"framework"`，否则 → `"user"`
- 可在操作 1 的结果上批量调用

**异常**：

| 情况 | 返回 |
|------|------|
| 目录无 SKILL.md | `{ "error": "invalid", "reason": "missing SKILL.md" }` |
| frontmatter 缺失必填字段 | `{ "error": "malformed", "reason": "missing name/description" }` |

**开销**：~100 tokens（仅 frontmatter）

### 操作 3：获取 Skill 路径

**入参**：Skill 目录名（字符串）

**出参**：
```
{ "path": ".sddu/skills/payment-integration/", "level": "user" }
```

**后续**：Agent 自行进入该路径，按需读取 SKILL.md body 及 references/、scripts/ 等子目录。

**开销**：无（路径拼接，零 token）

---

## 可用 Skill 清单组织

完成三轮操作后，Agent 应维护如下结构的可用 Skill 清单（内部变量，不输出给用户）：

```yaml
framework_skills:                    # 框架级 Skill（sddu- 前缀）
  - name: sddu-skill-discovery
    description: "..."
    source: ".opencode/plugins/sddu/skills/sddu-skill-discovery/"
  - name: sddu-skill-creator
    description: "..."
    source: ".opencode/plugins/sddu/skills/sddu-skill-creator/"
  - name: sddu-skill-sync
    description: "..."
    source: ".opencode/plugins/sddu/skills/sddu-skill-sync/"

user_skills:                         # 用户级 Skill（无前缀）
  - name: payment-integration
    description: "..."
    source: ".sddu/skills/payment-integration/"

invalid_skills:                      # 无效 Skill（供诊断参考）
  - directory: "broken-skill"
    reason: "missing SKILL.md"
    source: ".sddu/skills/broken-skill/"
```

## 核心概念

### 源目录

| 层级 | 路径 | 维护者 |
|------|------|--------|
| 用户级 Skills | `.sddu/skills/` | 用户手写、编辑、删除 |
| 框架级 Skills | `.opencode/plugins/sddu/skills/` | SDDU 框架，随插件分发 |

### 命名空间规则

- **`sddu-` 前缀**：框架级 Skill（基于 SKILL.md 的 `name` 字段判断）
- **无前缀**：用户级 Skill
- 用户级 Skill 不得使用 `sddu-` 前缀——该前缀为框架保留

### 两套发现流程（互不干扰）

- **流程①（本 Skill 覆盖）**：SDDU Agent 扫描源目录，管理自有 Skill 清单——与 LLM Agent 类型解耦
- **流程②（不覆盖）**：LLM Agent 按原生逻辑扫描实际目录（`.opencode/skills/`），自动发现和加载

## 边界情况处理

| 场景 | 处理方式 |
|------|---------|
| 源目录不存在（如用户未创建 `.sddu/skills/`） | 跳过该源目录，不报错——继续扫描其他源目录 |
| 操作 2 返回异常（frontmatter 缺失必填字段） | 将该项从可用清单中移除，归入 `invalid_skills` |
| 操作 1 过滤：目录名不符合命名规范（如包含大写字母或特殊字符） | 排除该目录，不进入操作 2 |
| 操作 2 返回异常（目录无 SKILL.md） | 将该项归入 `invalid_skills`，reason = "missing SKILL.md" |
| 用户级 Skill 使用了 `sddu-` 前缀命名 | 标记警告——该类 Skill 视为命名不规范的用户级 Skill，同步时可能被框架级版本覆盖 |
| 框架级 Skill 和用户级 Skill 非前缀部分重名 | 两个 Skill 均纳入可用清单——框架级优先规则由 `sddu-skill-sync` 在同步时执行，本 Skill 仅负责发现和报告 |
| 某个源目录下存在非 Skill 的子目录或文件 | 忽略非目录项。对子目录执行操作 2 判断有效性 |

## 与 sddu-skill-sync 的关系

本 Skill（`sddu-skill-discovery`）只负责**扫描源目录发现 Skill**，不执行任何同步操作。

同步操作由框架级 Skill `sddu-skill-sync` 负责——将源目录的 Skill 同步到 LLM Agent 实际目录（如 `.opencode/skills/`），使 LLM Agent 原生机制可以加载这些 Skill。

当本 Skill 发现源目录中存在 `sddu-skill-sync` 而实际目录中缺少 SDDU Skill 时，Agent 应从源目录 `.opencode/plugins/sddu/skills/sddu-skill-sync/SKILL.md` 直接读取 `sddu-skill-sync` 的 Skill body 并按其指引执行同步。注意：冷启动时 `skill()` 工具只能加载实际目录中已存在的 Skill，必须从源目录路径直接读取。

## 与 sddu-skill-creator 的关系

本 Skill（`sddu-skill-discovery`）负责**发现**已有 Skill，`sddu-skill-creator` 负责**创建**新 Skill。

当用户请求创建新 Skill 时，Agent 应：
1. 使用操作 1 + 操作 2 获取已有 Skill 清单
2. 将清单传递给 `sddu-skill-creator`，供其做 description 交叉冲突检查
3. 新 Skill 创建后，重新执行操作 1 + 操作 2 更新可用清单

## 自举闭环中的地位

本 Skill 是 SDDU Skill 自举闭环的三元之一：

```
sddu-skill-discovery ──→ 告诉 Agent 如何发现 Skill（本 Skill）
sddu-skill-creator   ──→ 告诉 Agent 如何创建 Skill
sddu-skill-sync      ──→ 告诉 Agent 如何同步 Skill

三者共同实现：「用 Skill 发现 Skill + 用 Skill 创建 Skill + 用 Skill 同步 Skill」
```

---

## 脚本

### discover.cjs（确定性发现脚本）

- **用途**：扫描源目录发现 SDDU Skill，实现 list / summary / path 三个确定性操作
- **入参**：见 ## 接口 参数表（`action` + 可选 `name`，`--user-src` / `--fw-src` 覆盖源目录）
- **出参**：stdout JSON（`list` → 名称数组；`summary` → `{name, description, level, source}`；`path` → `{path, level}`）
- **独立实现**：本脚本与 `sddu-skill-sync` 的 `sync.cjs` 互相独立、不共享代码（两个技能解耦，各自零依赖）
- **零依赖**：Node 内置模块（fs / path / util），无需安装

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建 — 基于 spec FR-025 和 plan ADR-004 创建三阶段渐进披露模型 | 2026-07-19 | SDDU Build Agent |
| v1.1 | 脚本化：新增 `scripts/discover.cjs` 锁死确定性步骤（目录扫描/frontmatter 解析/level 判定），替代 Agent 手动 ls/read；独立实现，与 sddu-skill-sync 解耦 | 2026-08-12 | @sddu-fast |
