---
name: sddu-skill-sync
description: "当需要将 SDDU Skill 从源目录同步到实际目录时加载。描述同步逻辑：扫描源目录→检测当前 LLM Agent 工具的实际目录路径→全量拷贝+管辖标识标记→清理残留→输出同步报告。适配不同 LLM Agent 工具（OpenCode/Codex/Claude Code 等）。"
---

# sddu-skill-sync

## 接口

阅读本章节即可使用本 Skill，无需阅读后续实现细节。

同步的确定性操作（扫描、拷贝、manifest 更新、清理、备份/回滚）由 `scripts/sync.cjs` 锁死实现——Agent 调用脚本即可，**不要**手动执行 `ls`/`cp`/编辑 manifest 等自由操作。

### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| `--apply` | flag | ❌ | 实际执行。默认 dry-run 只输出预览报告，不写任何文件 |
| `--dest` | string | ❌ | 实际目录（默认 `.opencode/skills/`） |
| `--user-src` | string | ❌ | 用户级源目录（默认 `.sddu/skills/`） |
| `--fw-src` | string | ❌ | 框架级源目录（默认 `.opencode/plugins/sddu/skills/`） |
| `--backup-dir` | string | ❌ | 备份目录（默认 `<dest>/.backup/`） |
| `--rollback` | string | ❌ | 回滚到指定备份时间戳 |

### 返回值（stdout JSON）

```
{ "mode": "dry-run" | "apply",
  "dest": "<实际目录>",
  "scanned": ["<技能名>"...],
  "added": [...], "updated": [...], "skipped": [...],
  "cleaned": [...], "protected": [...], "conflicts": [],
  "backup": "<备份路径>" }        // 仅 apply 模式
```

- `protected`：实际目录中**非 SDDU 创建的第三方技能**——只报告，绝不拷贝/覆盖/清理/触碰
- 退出码：成功 0；失败（回滚目标不存在等）1

可能异常：

| 情况 | 结果 |
|------|------|
| 实际目录无写入权限 | 报错退出，建议在 `opencode.json` 中为 `sddu-skill-sync` 设置 `allow` |
| 源目录为空 | 报告 `scanned: []`，无操作 |
| 回滚目标备份不存在 | 报错退出（exit 1） |

### 调用示例

```
用户："同步 SDDU Skills"
→ 先干跑预览：node scripts/sync.cjs
→ 确认无误后执行：node scripts/sync.cjs --apply
→ 读 stdout JSON 报告，向用户汇报新增/更新/清理/受保护项
```

---

## 操作

> 以下为接口的实现细节——LLM 按 ## 接口 中的参数调用即可。
>
> **执行方式**：本 Skill 的确定性步骤（扫描、拷贝、manifest 更新、清理、备份/回滚）由 `scripts/sync.cjs` 实现。Agent 只需调用脚本并解读 JSON 报告；以下各步骤为**原理说明**（知识背景），供理解与排障，不要求 Agent 手动执行。

### 步骤 1：扫描源目录

扫描以下两个源目录，识别所有有效的 SDDU Skill：

**用户级源目录**：`.sddu/skills/`
- 扫描该目录下的所有子目录
- 识别标准：子目录包含有效的 `SKILL.md` 文件
- 命名空间：无前缀限制（但不能使用 `sddu-` 前缀，那是框架保留前缀）

**框架级源目录**：`.opencode/plugins/sddu/skills/`
- 扫描该目录下的所有子目录
- 识别标准：子目录包含有效的 `SKILL.md` 文件
- 命名空间：所有框架级 Skill 以 `sddu-` 前缀命名

**有效 Skill 判定标准**：
1. 目录存在且包含 `SKILL.md` 文件
2. `SKILL.md` 包含合法的 YAML frontmatter（至少包含 `name` 和 `description` 字段）
3. 目录名符合 `^[a-z0-9]+(-[a-z0-9]+)*$` 约束

将扫描结果汇总为一个 Skill 清单，记录每个 Skill 的：
- `name`：Skill 名称（来自 frontmatter）
- `source`：来源（`user` 或 `framework`）
- `source_path`：源目录中的完整路径
- `status`：`valid` / `invalid`（无效的 Skill 列出原因但不参与后续拷贝）

**源目录路径说明**：
在 SDDU 源码仓库中，框架级 Skill 的源码位于 `src/skills/`，构建后打包到 `dist/sddu/skills/`，由 install.sh 部署到目标项目的 `.opencode/plugins/sddu/skills/`。本 Skill 在目标项目运行时扫描的框架级源目录是 `.opencode/plugins/sddu/skills/`。

### 步骤 2：检测实际目录路径

检测当前使用的 LLM Agent 工具，确定其 Skill 实际目录路径。

**常见 LLM Agent 工具的实际目录**：

| LLM Agent 工具 | 实际目录路径 |
|---------------|------------|
| OpenCode | `.opencode/skills/` |
| Claude Code | `.claude/skills/` |
| Codex | `.codex/skills/` |

**检测策略**（按优先级尝试）：
1. 检查项目根目录下是否存在 `.opencode/` 目录 → OpenCode 环境
2. 检查项目根目录下是否存在 `.claude/` 目录 → Claude Code 环境
3. 检查项目根目录下是否存在 `.codex/` 目录 → Codex 环境
4. 如果同时存在多个目录，以最先检测到的为准，并在同步报告中注明
5. 如果无法识别当前 LLM Agent 工具，提示用户手动指定实际目录路径

> **设计原则**：本 Skill body 使用通用自然语言描述实际目录检测逻辑，而非硬编码路径。当需要适配新的 LLM Agent 工具时，只需在上述表格中新增一行即可——这正是将同步逻辑封装在 Skill 而非 bash 脚本中的核心价值。

### 步骤 3：全量拷贝 + 管辖标识

将步骤 1 中识别出的所有有效 Skill 从源目录全量拷贝到实际目录。

#### 拷贝规则

1. **框架级 Skill**（来源 = `framework`）：保持 `sddu-` 前缀拷贝到实际目录
   - 源：`.opencode/plugins/sddu/skills/sddu-skill-sync/`
   - 目标：`<实际目录>/sddu-skill-sync/`

2. **用户级 Skill**（来源 = `user`）：保持原名拷贝到实际目录
   - 源：`.sddu/skills/my-custom-skill/`
   - 目标：`<实际目录>/my-custom-skill/`

3. **命名冲突处理**：当用户级 Skill 与框架级 Skill 目录名冲突时：
   - **框架级优先**——框架级版本覆盖用户级版本
   - 在同步报告中标注冲突并说明覆盖行为
   - 正常情况不应发生——用户级 Skill 不应使用 `sddu-` 前缀（NFR-005 约束）

4. **拷贝内容**：每个 Skill 目录下的所有文件（`SKILL.md`、`scripts/`、`references/`、`assets/` 等）一并拷贝，保持目录结构不变

#### 管辖标识机制

拷贝完成后，在实际目录中创建/更新 `.sddu-manifest.txt` 管辖标识清单文件。

**`.sddu-manifest.txt` 格式**：
```
# SDDU Skill Manifest — 由 sddu-skill-sync 自动维护，请勿手动编辑
# 格式：<skill-name> | <source> | <last-synced>
sddu-skill-discovery | framework | 2026-07-19T10:30:00Z
sddu-skill-creator | framework | 2026-07-19T10:30:00Z
sddu-skill-sync | framework | 2026-07-19T10:30:00Z
my-custom-skill | user | 2026-07-19T10:30:00Z
```

**管辖标识的作用**：
- **区分 SDDU 管辖 Skill 与第三方 Skill**：实际目录中可能同时存在 SDDU 管辖的 Skill 和用户手动放置的第三方 Skill。通过 `.sddu-manifest.txt` 清单，本 Skill 只操作清单中的 Skill，绝不误删或覆盖清单外的文件。
- **残留清理的依据**：步骤 4 的清理操作依赖此清单判断哪些 Skill 是 SDDU 管辖的。
- **同步状态追踪**：记录每个 Skill 的来源和最后同步时间，供诊断命令（`sddu skill doctor`）使用。

**操作安全原则**：
- 只拷贝/覆盖 `.sddu-manifest.txt` 清单中的 Skill
- 不操作实际目录中清单外的任何文件或目录
- 更新已有 Skill 时，以全量覆盖方式同步（源目录版本覆盖实际目录版本）

### 步骤 4：残留清理

检查实际目录中是否存在**源目录中已删除的** SDDU 管辖 Skill，并将其清理。

**清理流程**：
1. 读取实际目录中的 `.sddu-manifest.txt`，获取上次同步时的 Skill 清单（记作「旧清单」）
2. 对比步骤 1 中扫描出的当前有效 Skill 清单（记作「新清单」）
3. 找出「旧清单中有但新清单中没有」的 Skill → 这些是源目录中已被删除的残留
4. 对每个残留 Skill，从实际目录中删除其目录及其所有内容
5. 更新 `.sddu-manifest.txt`，移除已删除的 Skill 条目

**安全边界**：
- **只清理 SDDU 管辖的 Skill**：依据 `.sddu-manifest.txt` 清单判断。清单外的目录和文件（用户手动放置的第三方 Skill）绝不被清理。
- **清理前提示用户**：在删除任何 Skill 前，列出将被清理的 Skill 清单并征求用户确认（如 Agent 工具支持确认机制）。
- **跳过不完整清理**：如果 `.sddu-manifest.txt` 不存在（首次同步），跳过清理步骤。

**清理场景示例**：
- 用户从 `.sddu/skills/` 中删除了 `old-skill/` 目录，执行同步后，实际目录中的 `old-skill/` 被清理
- 框架级 Skill 在新版插件中被移除，执行同步后，实际目录中对应的 `sddu-*` 目录被清理
- 用户在 `.opencode/skills/` 中手动放置的 `third-party-skill/` 不受影响

### 步骤 5：输出同步报告

同步完成后，输出结构化的同步报告。

**报告格式**：
```
=== SDDU Skill 同步报告 ===
同步时间：2026-07-19 10:30:00
LLM Agent 工具：OpenCode
实际目录：.opencode/skills/

--- 源目录扫描 ---
用户级源（.sddu/skills/）：2 个有效 Skill, 0 个无效
框架级源（.opencode/plugins/sddu/skills/）：3 个有效 Skill, 0 个无效

--- 同步结果 ---
✅ 新增：1 个
   - my-custom-skill（用户级）
✅ 更新：2 个
   - sddu-skill-creator（框架级）— 内容已更新
   - sddu-skill-sync（框架级）— 内容已更新
⏭️ 跳过：0 个
🗑️ 清理：1 个
   - old-skill（用户级）— 源目录中已删除
⚠️ 冲突：0 个

--- 实际目录状态 ---
SDDU 管辖 Skill 总数：5 个
第三方 Skill（非 SDDU 管辖）：2 个
管辖标识文件：.opencode/skills/.sddu-manifest.txt（已更新）
```

**报告输出规则**：
- **新增**（`✅`）：源目录中有但 `.sddu-manifest.txt` 中没有的 Skill
- **更新**（`✅`）：源目录中 SKILL.md 的修改时间晚于实际目录中对应文件的 Skill
- **跳过**（`⏭️`）：源目录和目标目录内容一致的 Skill（无需操作）
- **清理**（`🗑️`）：`.sddu-manifest.txt` 中有但源目录中没有的 Skill
- **冲突**（`⚠️`）：命名冲突的 Skill（应标注覆盖行为）

## 权限说明

本 Skill 的同步操作涉及文件系统的读写操作，需要以下权限：

| 操作 | 需要的工具权限 | 说明 |
|------|-------------|------|
| 扫描目录 | 文件读取工具（如 `ls`/`readdir`） | 读取源目录的子目录列表 |
| 读取 SKILL.md | 文件读取工具（如 `read`） | 验证 Skill 有效性 |
| 拷贝文件 | 文件写入工具（如 `cp`/`write`） | 将源目录 Skill 拷贝到实际目录 |
| 创建/更新 manifest | 文件写入工具 | 维护 `.sddu-manifest.txt` |
| 删除残留 | 文件删除工具（如 `rm`） | 清理已删除的 Skill |

**建议的权限配置**（在 `opencode.json` 中）：
```json
{
  "permissions": {
    "sddu-skill-sync": "allow"
  }
}
```

> **跨 LLM Agent 工具注意事项**：不同 LLM Agent 工具提供的文件操作工具名称和权限模型可能不同（如 OpenCode 使用 `bash` 工具，Claude Code 使用 `Write`/`Edit` 工具）。本 Skill body 使用通用自然语言描述操作意图（如「拷贝文件」「删除目录」），Agent 应根据当前环境自行选择可用的工具执行。如果当前环境缺少必要的文件操作权限，Agent 应在同步报告中说明并建议用户手动授予权限。

---

## 脚本

### sync.cjs（确定性同步脚本）

- **用途**：扫描源目录 → 全量覆盖拷贝到实际目录 → 更新 manifest → 清理残留 → 输出 JSON 报告
- **入参**：见 ## 接口 参数表（`--apply` / `--dest` / `--user-src` / `--fw-src` / `--backup-dir` / `--rollback`）
- **出参**：stdout JSON（`mode` / `scanned` / `added` / `updated` / `skipped` / `cleaned` / `protected` / `backup`）
- **安全设计**：
  - **备份先行**：`--apply` 执行前自动备份实际目录到 `<dest>/.backup/<时间戳>/`（含 manifest 快照），可用 `--rollback <时间戳>` 恢复
  - **白名单保护**：只操作 `.sddu-manifest.txt` 中登记的 SDDU 管辖技能
  - **第三方硬保护**：实际目录中存在但不在 manifest 且源目录无的技能（用户手动放置的第三方 Skill）→ 归入 `protected`，**绝不**拷贝/覆盖/清理/触碰
  - **默认 dry-run**：不带 `--apply` 只输出预览，不写任何文件；确认后再实际执行
  - **嵌套防御**：拷贝采用「先删目标再拷贝」或内容合并（`<src>/.` → `<dst>/`），**禁止**对已存在目标执行 `cp -r <src> <dst>`（会产生 `xxx/xxx/` 嵌套目录）
- **零依赖**：Node 内置模块（fs / path / util），无需安装

---

## 诊断与排错

### 常见问题

| 问题 | 可能原因 | 解决方案 |
|------|---------|---------|
| 实际目录中没有 SDDU Skill | 尚未执行过同步 | 触发本 Skill 执行同步 |
| 同步后仍然缺少某 Skill | 该 Skill 的 SKILL.md frontmatter 格式有误 | 检查源目录中对应 SKILL.md 的 frontmatter，确保包含 `name` 和 `description` |
| 用户级 Skill 被覆盖 | 用户级 Skill 使用了 `sddu-` 前缀（框架保留前缀） | 将用户级 Skill 重命名为无 `sddu-` 前缀的名称 |
| 第三方 Skill 被误删 | `.sddu-manifest.txt` 损坏或手动编辑错误 | 恢复 `.sddu-manifest.txt` 备份，或手动重新构建清单 |
| 同步提示缺少文件操作权限 | Agent 工具权限配置不足 | 在 `opencode.json` 中为 `sddu-skill-sync` 设置 `allow` 权限 |
| 实际目录出现 `xxx/xxx/` 嵌套目录 | 手工执行 `cp -r <src> <dst>`（目标已存在）或旧版同步 | 删除嵌套层目录（`xxx/xxx/`），用 `scripts/sync.cjs --apply` 重跑（脚本先删后拷，不会嵌套） |

### 冷启动场景

首次安装 SDDU 后，`sddu-skill-sync` 自身位于框架级源目录（`.opencode/plugins/sddu/skills/`），尚未同步到实际目录。此时用户使用 SDDU Agent（如 `@sddu` 或 `@sddu-fast`）时：

1. SDDU Agent 通过模板中的 Skill 发现指令，扫描源目录发现 `sddu-skill-sync` 存在
2. Agent 提示用户：「检测到 SDDU Skill 尚未同步到实际目录，是否需要现在同步？」
3. 用户确认后，Agent 加载本 Skill 并执行首次同步

> 非 SDDU Agent 场景下如需同步，只需询问任意 SDDU Agent（如 `@sddu 同步 SDDU Skills`）即可。

## 与其他 Skill 的关系

本 Skill 是 SDDU Skill 三元自举闭环的同步环节：

```
sddu-skill-discovery  ──→ 告诉 Agent 如何发现有哪些 Skill（源目录扫描）
sddu-skill-creator    ──→ 告诉 Agent 如何创建新 Skill
sddu-skill-sync       ──→ 告诉 Agent 如何将 Skill 同步到实际目录
```

**协作方式**：
- `sddu-skill-discovery` 扫描源目录发现 `sddu-skill-sync` 存在
- Agent 加载 `sddu-skill-sync` 执行同步，将源目录 Skill 拷贝到实际目录
- 同步完成后，LLM Agent 通过原生机制扫描实际目录，自动发现并加载 Skill

三者共同实现「用 Skill 发现 Skill + 用 Skill 创建 Skill + 用 Skill 同步 Skill」的完整 Skill 生态闭环。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建 — 扫描源目录 → 拷贝 → 管辖标识 → 清理 → 报告 | 2026-07-19 | SDDU Build Agent |
| v1.1 | 脚本化：新增 `scripts/sync.cjs` 锁死确定性步骤（扫描/拷贝/manifest/清理），杜绝 Agent 手动 `cp -r` 嵌套；默认 dry-run + `--apply` 执行；备份先行 + `--rollback` 回滚；第三方技能硬保护（`protected`） | 2026-08-12 | @sddu-fast |
