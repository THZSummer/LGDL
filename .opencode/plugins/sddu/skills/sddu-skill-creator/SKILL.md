---
name: sddu-skill-creator
description: "当用户需要创建新的 SDDU Skill 时加载。对话式引导工作流：确定 Skill 用途 → 撰写 description（触发语义优化，避免重叠）→ 编写 body（Progressive Disclosure 指导）→ 输出 SKILL.md 到 `.sddu/skills/<name>/` → 可选触发测试。产出符合 OpenCode/Anthropic 规范的用户级 SKILL.md。"
---

# sddu-skill-creator

## 接口

阅读本章节即可使用本 Skill，无需阅读后续引导步骤细节。

### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| `intent` | string | ✅ | 用户想创建什么 Skill——它做什么、什么时候触发 |

### 返回值

**成功**：
```
创建文件：.sddu/skills/<name>/SKILL.md
```
- `name` 符合 `^[a-z0-9]+(-[a-z0-9]+)*$`，不与已有 Skill 重名或冲突
- `description` ≤ 1024 字符，自然语言，不与已有 Skill 的 description 高度重叠
- body ≤ 500 行，遵循 Progressive Disclosure 原则

**后续**：告知用户通过 `@sddu 同步 SDDU Skills` 将新 Skill 同步到实际目录，或直接说出触发场景语句进行测试。

### 调用示例

从零创建：
```
用户："帮我创建一个支付接入的 Skill"
→ 加载本 Skill
→ 按 §1-§6 引导：确定接口 → 撰写 description → 冲突检查 → 编写 body → 输出文件
→ 产物：.sddu/skills/payment-integration/SKILL.md
```

从对话提取：
```
用户："把刚才的部署流程变成 Skill"
→ 从对话历史提取步骤
→ 引导用户确认接口（触发条件、输入、输出）
→ 产物：.sddu/skills/deploy-workflow/SKILL.md
```

---

## 执行流程

> 以下为接口的实现细节——LLM 按 ## 接口 中的参数调用即可，无需阅读本节及后续章节。

加载本 Skill 后：
1. 首先通过 `sddu-skill-discovery` 获取已有 Skill 清单（供后续冲突检查和命名验证使用）
2. 询问用户想创建什么 Skill——它做什么、什么时候触发、输入什么、产出什么
3. 按以下步骤引导用户完成：确定用途 → 撰写 description → 冲突检查 → 编写 body → 输出 SKILL.md

---

## Skill 是什么

SDDU Skill 解决两个核心问题：

**可重复性** — 相同的执行流程不再每次向 Agent 口述。Markdown body 定义步骤、规则和判断标准，Agent 加载后按指引执行。

**一致性** — LLM 推理天然有方差。对于"不能出错"的步骤——精确格式生成、复杂计算、模板渲染、确定性文件操作——用 `scripts/` 中的代码锁死行为：Agent 调用脚本、提供入参，脚本保证结果。这也是 Anthropic 官方 skills 仓库的实践——大量内置脚本确保复杂任务的执行可靠性。

```
Skill = Markdown 指令（LLM 负责理解、决策、编排）
      + scripts/（确定性代码——不能出错的步骤）
      + references/（按需注入的参考上下文）
      + assets/（模板、图标等静态资源）
```

> 识别"该用脚本"的信号：用户反复纠正同一个步骤的输出，或多轮测试中 Agent 都独立写出了类似的临时代码——这意味着该步骤应该固化到 `scripts/`，避免每次让 LLM 重新发明轮子。

---

## 1. 确定 Skill 用途

引导用户回答三个核心问题。先把 Skill 当成一个黑盒——定义它的接口契约，再在 §3 中填充执行步骤。

1. **什么时候触发**（description 字段的核心输入）：用户会说什么话、问什么问题时，Agent 应该加载这个 Skill。

2. **输入什么**：调用方（Agent 或用户）需要提供哪些信息——文件路径、配置参数、数据格式。即 Skill 的入参。

3. **产出什么**：Skill 执行完后生成什么——代码文件、检查报告、配置变更。即 Skill 的返回值。

**引导话术示例**：
> "先说什么时候触发——比如用户说'接入支付宝'。再说输入——Agent 需要知道路由文件在哪、商户号是什么。最后说输出——回调代码写好、沙箱测试通过。"

如果用户无法清晰回答，引导其先通过一个具体的使用场景反推。

---

## 2. 撰写 description

`description` 是 Skill 的**触发钥匙**——LLM Agent 根据它来判定是否加载你的 Skill。一个好的 description 能显著提高触发准确率。

### 2.1 撰写规则

| 规则 | 说明 |
|------|------|
| **用自然语言** | 写完整的 1-2 句自然语言，不要堆砌关键词。Agent 理解语义而非关键词匹配。 |
| **覆盖关键触发场景** | 列举用户可能的表达方式——命令式（"帮我接入支付"）、疑问式（"怎么接入支付宝？"）、任务式（"我要做支付集成"）。 |
| **避免与已有 Skill 重叠** | 检查已有的框架级 Skill（`sddu-skill-*`）和用户级 Skill 的 description，确保措辞有足够的区分度。重叠会导致 Agent 误触发错误的 Skill。 |
| **长度 ≤ 1024 字符** | OpenCode/Anthropic 规范要求 description 不超过 1024 字符。 |
| **YAML frontmatter 安全** | 若 description 含特殊字符（`:`、`{`、`}`、`[`、`]`、`"`），用双引号包裹整个内容。 |

### 2.2 生成候选方案

根据用户在第 1 步描述的「做什么 + 触发场景」，提供 **2-3 个候选 description**，每个从不同角度切入：

- **候选 A（动作导向）**：强调用户的行为意图——"当用户需要接入支付渠道、配置支付 SDK 或集成第三方支付时…"
- **候选 B（场景导向）**：强调问题的特征——"当用户提到支付宝、微信支付、银联等支付渠道的接入、配置或集成时…"
- **候选 C（混合导向）**：结合动作和场景——"当用户需要集成支付能力（支付宝/微信支付/银联等），包括 SDK 配置、回调处理和测试验证时…"

请用户选择最贴合使用场景的一个，或基于候选做调整。**建议用户用真实场景做口头测试**——说出几个典型触发语句，看 description 是否能正确匹配。

### 2.3 冲突检查

在用户选定 description 后，使用 `sddu-skill-discovery` 获取的已有 Skill 清单（framework_skills + user_skills），与候选 description 做交叉比对，按以下标准标注重叠风险等级：

| 等级 | 判断标准 | 处理 |
|:--:|------|------|
| 🟢 **低** | 已有 Skill 的 description 描述的场景与本 Skill 明显不同（如一个管支付、一个管部署） | 无需处理，用户可直接使用该 description |
| 🟡 **中** | 场景相近但触发关键词有足够区分度（如"接入支付" vs "支付回调调试"） | 提示用户注意区分，建议微调措辞增加区分度 |
| 🔴 **高** | 场景高度重叠且触发关键词区分度不足（如已有"支付集成"，用户要创建"支付接入"） | 建议用户调整 description 增加区分度措辞，或考虑是否应复用已有 Skill 而非创建新 Skill |

列出所有 🟡/🔴 等级的已有 Skill（name + description），并给出具体调整建议。

---

## 3. 编写 body

Skill body 是 Agent 加载 Skill 后获取的完整指令。遵循 **Progressive Disclosure** 原则组织内容。

> **接口优先**：在写执行步骤之前，先把 §1 定义的三个契约写进 body 开头——触发条件、输入、输出。让加载这个 Skill 的 Agent 第一眼就看到"我需要什么、我能拿到什么"，再往下读具体步骤。好的 Skill 文档读起来像 API 文档，不是教程。

### 3.1 结构原则

```
┌─ Metadata（~100 words）──────────────────────────┐
│  name + description（frontmatter）                │
│  ▶ Agent 首先看到的摘要信息                        │
├─ Body（核心指令，on trigger 加载）─────────────────┤
│  执行流程、规则、判断标准、检查清单                 │
│  ▶ LLM 负责理解、决策、编排                        │
├─ scripts/（确定性执行）──────────────────────────┐
│  可执行代码——精确格式生成、复杂计算、模板渲染       │
│  ▶ Agent 调用脚本并传参，脚本保证结果               │
├─ references/ + assets/（按需引用）───────────────┐
│  references/：参考文档，按需注入 context            │
│  assets/：模板、图标等静态资源                      │
│  ▶ Agent 按需读取                                  │
└──────────────────────────────────────────────────┘
```

### 3.2 编写要点

| 要点 | 说明 |
|------|------|
| **开门见山** | 第一段直接说明本 Skill 的用途和适用场景，不用长篇背景介绍。 |
| **分步清晰** | 将执行流程拆解为编号步骤——Agent 更容易按顺序执行。 |
| **提供检查清单** | 用 `- [ ]` 格式列出关键验收点，Agent 可以自检。 |
| **举例说明** | 对复杂步骤给出输入/输出示例——Agent 理解示例比理解抽象描述更准确。 |
| **标注边界** | 明确说明「本 Skill 不做什么」——避免 Agent 越界执行。 |
| **引用子资源** | 若需要脚本或参考文档，用相对路径引用（`references/api-doc.md`、`scripts/verify.sh`）。 |
| **≤ 500 行** | body 总行数控制在 500 行以内（NFR-006）。超过时建议拆分为多个协作 Skill。 |

### 3.3 何时用 scripts/ vs 纯 Markdown

Skill body 定义"做什么、怎么判断"，scripts/ 定义"怎么做才不出错"。

| 用 scripts/ | 纯 Markdown body |
|------------|-----------------|
| 输出格式有严格约束（JSON Schema、YAML、SQL） | 输出是自然语言（解释、建议、报告） |
| 涉及精确计算、数据变换、格式转换 | LLM 根据上下文做判断、选择、权衡 |
| 纯文件操作（模板渲染、批量重命名、拷贝） | 步骤本身简单且容错率高 |
| 多轮迭代后同一个步骤仍然被用户反复纠正 | 该步骤第一次就能稳定执行 |

**实践原则**：先纯 Markdown 写出初版，运行 3-5 个测试用例。如果某个步骤的输出在多个测试中都不一致、或用户反复纠正同一个位置——那就是该步骤该移入 `scripts/` 的信号。避免过早优化：不是所有重复操作都需要脚本，只有在 LLM 确实无法稳定执行时才引入。

**脚本文档规约**：body 中每引用一个脚本，必须写清三点——用途、入参、出参。把每个脚本也当成一个黑盒。

```
## 步骤 3：生成合规报告
调用 `scripts/generate_report.py`：
- **用途**：根据检测数据生成 JSON 格式的合规报告
- **入参**：`<步骤1产生的数据文件路径>` `<步骤2产生的配置文件路径>`
- **出参**：`output/report.json`（JSON，字段：pass_count、fail_count、details）
- Agent 读取出参后继续下一步
```

### 3.4 常见模式

| Skill 类型 | Body 典型结构 |
|-----------|-------------|
| **流程指引**（如 bug-fix-workflow） | 概述 → 步骤 1-N（每步含输入/操作/输出/检查清单）→ 完成验证 |
| **脚本驱动**（如 report-generator） | 概述 → 前置条件 → 调用 scripts/xxx 的步骤（入参/出参）→ 结果处理 |
| **检查清单**（如 deploy-checklist） | 概述 → 分类检查项（安全/性能/兼容性）→ 通过标准 |
| **知识注入**（如 coding-standards） | 概述 → 规则列表（Do/Don't 对照）→ 示例 |
| **工具集成**（如 payment-integration） | 概述 → 前置条件 → SDK 安装 → 配置 → 回调处理 → 测试 |

---

## 4. 输出 SKILL.md

### 4.1 路径规则

| 层级 | 目标路径 | 适用场景 |
|------|---------|---------|
| **用户级 Skill** | `.sddu/skills/<skill-name>/SKILL.md` | 项目特有业务流程、团队规范、个人工具 |

> 框架级 Skill（如 `sddu-skill-*`）通过 SDDU 源码仓库的 `src/skills/` 目录维护，随插件安装自动分发到用户项目，不由本 Skill 创建。如需将用户级 Skill 升级为框架级：通过源码迁移到 SDDU 仓库的 `src/skills/`，走完整 SDDU 流程后随插件发布。

### 4.2 产出检查清单

在输出 SKILL.md 之前，逐项确认：

- [ ] `name` 字段符合 `^[a-z0-9]+(-[a-z0-9]+)*$`（小写字母/数字/连字符）
- [ ] `name` 字段 1-64 字符
- [ ] `description` 字段 ≤ 1024 字符，使用自然语言
- [ ] body 不超过 500 行
- [ ] body 不含敏感信息（密钥、内部 URL、个人信息）
- [ ] 引用的 `scripts/`、`references/`、`assets/` 文件路径有效
- [ ] YAML frontmatter 格式正确（无缩进错误、特殊字符已转义）

### 4.3 输出后的用户指引

告知用户可立即使用——通过 `sddu-skill-sync` 同步到实际目录（`@sddu 同步 SDDU Skills`），或直接说出触发场景描述语句测试 Skill 是否被正确触发。

---

## 5. 触发测试（可选，推荐）

对用户级 Skill，建议进行快速触发测试，验证 description 的触发准确率。

### 5.1 测试方法

提供 **3-5 个测试场景描述**——模拟用户可能说的不同措辞，覆盖：

| 场景类型 | 示例 |
|---------|------|
| **直接命令** | 用最直接的措辞表达任务意图 |
| **疑问句式** | 用"怎么…""如何…"开头的提问 |
| **模糊表达** | 用不精确但语义相近的措辞 |
| **混合上下文** | 含其他无关内容的长文本，但核心语义指向 Skill |
| **相近但无关** | 语义相近但不应触发 Skill 的场景（负样本） |

### 5.2 结果分析

对每个测试场景，观察 Agent 是否加载了该 Skill。若未触发，分析 description 的不足之处：

- **description 太宽泛** → 缩小场景范围，增加具体关键词
- **description 太狭窄** → 扩展触发场景覆盖
- **与已有 Skill 重叠** → 增加区分度措辞

根据测试结果调整 description 后，**建议保留测试报告**（作为 Skill 目录下的 `references/trigger-test-report.md`），方便后续维护。

---

## 6. 命名检查规则

在产出 SKILL.md 前，**必须执行命名检查**：

1. **检查 `sddu-` 前缀**：若用户输入的 name 以 `sddu-` 开头，**立即警告**——`sddu-` 是 SDK 框架的保留前缀，用户级 Skill 不得使用。建议改用其他前缀或无前缀命名。

2. **检查命名规范**：name 必须符合 `^[a-z0-9]+(-[a-z0-9]+)*$`：
   - 全部小写字母、数字、连字符
   - 不以连字符开头或结尾
   - 不含连续连字符（`--`）
   - 不含空格、下划线、大写字母、特殊字符

3. **检查与已有 Skill 重名**：从 `sddu-skill-discovery` 获取的 Skill 清单中，确认用户输入的 name 不与已有 Skill 的 `name` 字段值重复。注意：name 匹配基于 SKILL.md 的 frontmatter `name` 字段值，而非目录名。

---

## 7. 自举闭环说明

`sddu-skill-creator` 本身是框架级 Skill，属于 SDDU 三元自举闭环的一环：

```
┌─────────────────────────────────────────────────┐
│           SDDU Skill 三元自举闭环                  │
│                                                   │
│  sddu-skill-discovery  → 告诉 Agent 如何发现 Skill │
│  sddu-skill-creator    → 告诉 Agent 如何创建 Skill │
│  sddu-skill-sync       → 告诉 Agent 如何同步 Skill │
│                                                   │
│  「用 Skill 发现 + 用 Skill 创建 + 用 Skill 同步」   │
└─────────────────────────────────────────────────┘
```

**产出**：用户通过本 Skill 创建的 Skill 始终为**用户级**（`.sddu/skills/<name>/SKILL.md`），受 git 管理，随项目分发。框架级 Skill（`sddu-skill-*`）的创建路径不同——通过 SDDU 源码仓库的 `src/skills/` 目录维护，经完整 SDDU 流程（discovery → spec → plan → build → review → validate）后随插件发布给所有用户。

> **注意**：framework-level skills 正式发布后，其 `description` 会更新以避免与新框架级 Skill 冲突。用户可放心创建用户级 Skill，不受框架发布节奏影响。

---

## 8. 快速参考卡

### 合法 SKILL.md 最小示例

```markdown
---
name: my-payment-integration
description: "当用户需要接入第三方支付渠道（支付宝、微信支付等），包括 SDK 安装、配置、回调处理和沙箱测试时加载。"
---

# my-payment-integration

## 接口

阅读本章节即可使用本 Skill，无需阅读后续实现细节。

### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| `channel` | string | ✅ | `"alipay"` — 支付宝（含 APP 支付、网页支付）<br>`"wechat"` — 微信支付（含 JSAPI、Native、小程序）<br>`"unionpay"` — 银联支付（含网关支付、在线支付） |
| `project_root` | string | ✅ | 项目根目录路径 |
| `merchant_config` | object | ✅ | 商户号、密钥等配置（用户提供或从项目配置中读取） |

### 返回值

**成功**：

    { "files": ["src/payment/alipay.js", "src/payment/callback.js"], "test_result": "passed" }

**异常**：

| 情况 | 返回值 |
|------|--------|
| 商户配置无效 | `{ "error": "invalid_config", "reason": "app_id 或密钥缺失" }` |
| SDK 安装失败 | `{ "error": "install_failed", "reason": "..." }` |

### 调用示例

    { channel: "alipay", project_root: ".", merchant_config: { app_id: "2021xxx", private_key: "..." } }
    → { files: ["src/payment/alipay.js", "src/payment/callback.js"], test_result: "passed" }

    { channel: "wechat", project_root: "/home/project", merchant_config: { mch_id: "123" } }
    → { error: "invalid_config", reason: "缺少 api_key" }

## 执行流程
1. 确认支付渠道（根据 `channel` 参数）
2. 安装对应 SDK
3. 配置商户信息和回调 URL（根据 `merchant_config`）
4. 实现支付回调处理
5. 执行沙箱测试

## 检查清单
- [ ] SDK 安装成功
- [ ] 商户配置有效
- [ ] 回调 URL 可访问
- [ ] 沙箱测试全部通过
```

> 如果 Skill 包含脚本，在 body 末尾添加 `## 脚本` 章节，为每个脚本写清契约（用途 / 入参 / 出参）。详见 §3.3。

### Frontmatter 字段速查

| 字段 | 必填 | 约束 |
|------|:--:|------|
| `name` | ✅ | 1-64 字符，`^[a-z0-9]+(-[a-z0-9]+)*$` |
| `description` | ✅ | 1-1024 字符，自然语言 |
| `license` | ❌ | 可选 |
| `compatibility` | ❌ | 可选，OpenCode 扩展字段 |
| `metadata` | ❌ | 可选，OpenCode 扩展字段 |

### Body 规模速查

| 约束 | 值 |
|------|:--:|
| 推荐最大行数 | ≤ 500 |
| 超过 500 行 | 建议拆分为多个协作 Skill |
| Metadata 区 | ~100 words |
| 引用子目录 | `scripts/`、`references/`、`assets/` |
