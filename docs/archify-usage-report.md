# Archify 使用体验报告（LGDL 双全景项目实测）

> 报告人：sddu-docs Agent，经 SDDU 协调器整理
> 日期：2026-08-31

## 一、使用概况

| 项目 | 内容 |
|---|---|
| 时间 | 2026-08-30 至 2026-08-31 |
| 项目 | LGDL 双全景（业务全景 + 技术全景） |
| 图总数 | **8 张** |
| 交付结果 | 全部通过 archify 门禁并交付（8/8） |
| 使用方式 | Agent 会话内生成 Typed JSON IR → 校验 → 编译 HTML（流程详见 docs/archify-guide.md） |

### 图片清单

| 全景 | 图名 | 类型 |
|---|---|---|
| 技术全景 | architecture-packages（6 包依赖合并视图） | architecture |
| 技术全景 | architecture-layers（四层架构） | architecture |
| 技术全景 | architecture-deps（包依赖） | architecture |
| 技术全景 | dataflow-cli（终端编译管线） | dataflow |
| 技术全景 | dataflow-web（Web 编译管线） | dataflow |
| 技术全景 | sequence-ai-ops（Web AI 命令管线） | sequence |
| 业务全景 | 双层消费模型 | architecture |
| 业务全景 | 核心业务旅程 | dataflow |

### 类型分布

| 类型 | 数量 |
|---|---|
| architecture | 4 |
| dataflow | 3 |
| sequence | 1 |
| **合计** | **8** |

## 二、工作流体验（四段式，实测）

### 1. IR 生成

Agent 先读取 `.opencode/skills/archify/SKILL.md` 与 `docs/archify-guide.md`，按各图类型的 schema 手写 Typed JSON IR。源文件保留在 `diagrams/ir/`（技术全景与业务全景各一套目录），可复现、可增量修改。

### 2. 校验门禁

`validate --quality showcase` 实测结果：**8/8 图全部通过 9/9 artifact checks**，composition pass（0 errors / 0 warnings）。

### 3. 交付

`deliver` 校验通过后原子写入 HTML 成品。成品自包含、零运行时依赖，单文件约 **700KB**。

### 4. 视觉检查

`visual-check` 实测：每张图在 **4 档视口**（1440×900 / 1600×1000 / 1920×1080 / 2048×1320）下 containment 全过（`scrollW ≤ innerW && scrollH ≤ innerH`），readabilityOk（投影字号 ≥ 6px 门槛，实测 7px）。产出 light/dark 双主题 PNG 截图 + contact-sheet HTML + JSON 报告。

## 三、遇到的约束与解决（5 例）

| # | 约束 | 解决方式 |
|---|---|---|
| 1 | **sequence 自环消息不支持**：renderer 不支持 OPS→OPS 自环（原 mermaid 有该能力） | 拆为「读 / 写」两条真实消息表达 |
| 2 | **首屏 viewBox 比例约束**：首屏约束下 viewBox 比例须 ≤ ~0.39（validator 用 930px 可读宽） | vbW 取 1080，保住投影字号 6.03px |
| 3 | **相邻消息行最小间距**：28px 限制下消息数从 12 精简到 9 | 被精简消息内容全部移入 3 张说明卡片，零信息丢失 |
| 4 | **guided-views 取舍**：为换取垂直预算 | 移除 guided-views，确保首屏不溢出 |
| 5 | **workflow 类型改型 dataflow**：核心业务旅程最初用 workflow 类型，其固定列网格（3-4 列仅 70px 间距）反复触发布局冲突且纵向超出桌面视口 | 按 skill 规则「两轮修复未果后调整」，改用 dataflow 类型一次通过——实际验证了「结构化修复回执 + 最多两轮聚焦修复」规则 |

## 四、与 Mermaid 对比（实测体会）

| 维度 | Archify | Mermaid |
|---|---|---|
| 替换规模 | 全景 6 处 mermaid 全部替换（含 1 张 sequenceDiagram） | — |
| 确定性 | 同一 IR 恒定产出同一成品（guide.md 核心理念验证） | 布局不可控 |
| 门禁 | 交付前 schema / 布局 / 净空检查，失败有结构化回执（规则码 + supportedFixes） | 无校验 |
| 交互 | 亮/暗主题切换、平移缩放、聚焦与上下游依赖追踪、源码证据（SRC n） | 静态（GitHub 等平台可渲染但不可交互） |
| 静态内嵌 | visual-check 产出 PNG 可 `![](path)` 直接嵌入 md（本次落地 6 处「PNG 内嵌 + 交互链接」组合写法） | 仅渲染，不可交互 |
| 代价 | IR 手写成本高于 mermaid 简写；单文件约 700KB 体积大 | 体积小、写法简 |

## 五、与 LGDL 自身对比（同为确定性图技术路线，定位互补）

> 本项目特殊性：报告者既是 archify 的用户，又是 LGDL（语义优先图表语言 + 自研 SVG 渲染）的作者方——两个系统走同一条「确定性渲染」技术路线，对比有直接参考价值。

### 5.1 定位对比

| 维度 | Archify | LGDL |
|---|---|---|
| 定位 | Agent-first 的「架构图即代码」工具：Agent 生成 IR，Archify 校验并编译 | 面向 AI Agent 的语义优先图表描述语言：`.lgdl` 文本只含语义，布局由引擎固化 |
| 输入 | Typed JSON IR（每种图有 schema） | 手写 YAML 子集 DSL（语义优先，零布局信息） |
| 输出 | 自包含交互 HTML / SVG / PNG / WebM（便携分享） | SVG / ASCII / PNG（经 CLI 或 Web 工作台） |
| 图类型 | 5 种（architecture / workflow / sequence / dataflow / lifecycle） | 9 种（flowchart / mindmap / uml-class / arch / datastream / sequence / er / state / gantt） |
| 消费方 | 主要是 Agent 会话内生成，人类浏览 | AI Agent 经双 CLI 操作，人类理解后指挥 AI（双层消费模型） |
| 交互性 | 成品可交互（主题切换/缩放/聚焦/依赖追踪/源码证据） | 静态 SVG 为主（Web 预览有 data-lgdl-loc 点击定位） |

### 5.2 理念共识（同一条技术路线）

1. **确定性渲染**：同一输入恒定产出同一成品——archify「同一 IR → 同一 HTML」，LGDL「语义不变则输出不变」（design.md:29）
2. **交付前门禁**：archify 的 validate/deliver 门禁 ↔ LGDL 的 error-only 严格校验（ADR-005）——都不允许「带病交付」，失败必须显式暴露
3. **不制造灰色地带**：archify 不编造拓扑（Truth before spectacle）↔ LGDL 零猜测哲学（G4-Q2：warning 是可容忍的错误，会滋生关联性错误）
4. **显式能力开关**：archify 动效/预览/画像 opt-in ↔ LGDL 语义/呈现解耦（颜色等呈现关注点逐出语言）

### 5.3 差异点与互鉴价值

| 差异 | Archify 侧 | LGDL 侧 | 互鉴 |
|---|---|---|---|
| 输入形态 | 结构化 JSON IR（schema 强约束） | 文本 DSL（YAML 子集） | LGDL 的「显性字段、零猜测」与 archify 的 schema 约束异曲同工；archify 的机器可读诊断（规则码 + supportedFixes）值得 LGDL CLI 的报错设计参考（当前 LGDL 是 error + 可定位路径） |
| 交互 | 成品内建 Viewer 交互 | 静态输出 + Web 侧 data-lgdl-loc | LGDL render 已有 data-lgdl-loc 源映射，若未来加交互化，archify 的聚焦/依赖追踪交互范式可参考 |
| 类型体系 | 5 种通用架构叙事类型 | 9 种图语言类型（含泳道/甘特等专用布局） | 类型粒度不同：archify 偏「叙事视角」，LGDL 偏「图类型语义」；互不覆盖，属互补 |
| 体积 | 单 HTML ~700KB | SVG 轻量 | archify 交互富集但重；LGDL 轻量但静态 |
| 校验哲学 | 交付门禁 + 两轮聚焦修复 | error-only 无静默降级 | 两者共享「确定性、无灰色地带」内核，实现路径不同 |

### 5.4 结论

两个系统是**同一技术信念（确定性 + 门禁 + 不编造）在两条产品路径上的实现**：archify 服务「Agent 生成 → 人浏览」的通用架构叙事，LGDL 服务「人理解 → AI 经 CLI 操作」的语义图表语言。本次项目同时深度使用两者（archify 8 张图 + LGDL 6 包全景），验证了该技术路线的可行性；两者在「机器可读诊断」「交互范式」「类型粒度」上可互相借鉴。

## 六、优点总结

1. **交付前门禁 + 结构化诊断**：Agent 可闭环自修复，8/8 一次通过（仅 workflow 一例两轮后调整类型）
2. **成品自包含**：单 HTML、零运行时依赖，分享即用
3. **视觉检查体系完善**：多视口 containment + 可读性检查 + 双主题 PNG，为「人工目检不可行」的 Agent 场景提供了自动化质量兜底
4. **IR 源文件保留**：可增量修改、可复现、可 diff
5. **与 LGDL 自身哲学呼应**：确定性渲染、交付门禁、显式能力开关（见 guide.md「与本仓库的关联」）

## 七、痛点与不足

1. **模型能力依赖**：生成 IR 需要模型准确理解 schema（本次用 deepseek-v4-flash 系列完成）；低配模型可能反复触发修复循环
2. **几何约束偏紧**：首屏比例、行距、固定列网格等约束对内容多的图（12+ 消息的 sequence、复杂 workflow）友好度不足，需手动精简或改型
3. **体积**：单 HTML 约 700KB（含内联 Viewer / 主题 / 交互逻辑），比 mermaid 重
4. **类型覆盖差异**：5 种类型（architecture / workflow / sequence / dataflow / lifecycle）与 LGDL 的 9 种图类型不对等，部分业务图需「降级改型」适配
5. **Agent 无法目检**：visual-check 是自动化收据，最终视觉验收仍需人工打开 HTML（本次已如实披露该边界）

## 八、改进建议

1. 对 sequence / workflow 放宽首屏与行距约束，或提供「内容多时自动分页 / 滚动」选项
2. 提供 workflow → dataflow 等跨类型迁移辅助（减少 Agent 手动改写 IR）
3. 可考虑精简运行时体积（按需加载 Viewer）
4. 为常见图提供更薄的 IR 模板（降低手写成本）
5. 探索 PNG 截图质量与交互 HTML 的自动双交付集成

## 九、修订记录表

| 版本 | 变更说明 | 日期 | 报告人 |
|---|---|---|---|
| v1.0 | 初始创建：LGDL 双全景项目 8 张图实测体验 | 2026-08-31 | sddu-docs Agent |
| v1.1 | 新增「五、与 LGDL 自身对比」章节，后续章节编号顺延 | 2026-08-31 | sddu-docs Agent |
