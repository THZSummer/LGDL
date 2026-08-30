# 移交简报：@sddu-spec 需求定义（1.spec 阶段）

> 生成: sddu-discovery · 2026-08-30
> 用途: discovery 阶段完成后的移交简报。因子代理嵌套深度限制，无法经 task tool 嵌套启动 sddu-spec，请在**顶层**直接运行 `@sddu-spec LGDL 业务全景`，并将本文件作为任务简报传入（或让 spec agent 首先读取本文件）。
> 下游阶段: 1.spec → 2.plan → 3.tasks → 4.build → 5.review → 6.validate

## 1. 背景与任务性质

- Feature「LGDL 业务全景」（featureKey: specs-tree-business-panorama）的 0.discovery 已完成（state.json phase: discovered），现进入 1.spec。
- 本 Feature 目标：补齐 LGDL 业务全景 **Why 层**素材——问题定义与产品定位、竞争定位、目标用户与核心场景、语言设计产品哲学、版本演进叙事。**交付物是「业务全景文档」的需求规范，不是软件功能需求**。
- 项目对象：LGDL（/home/usb/wks/gits/GitHub/LGDL）——面向 AI Agent 的语义优先图表描述语言（npm 包 @lgdl/core/layout/render/cli 等 + Web 工作台），作者以纯 Vibe Coding 方式开发，存量文档缺 Why 层。
- ⚠️ 访谈已完成且受访人（项目唯一作者）答题极简、跳答率高——**不要尝试再发起深度访谈**；以产物文件为准做规范推导，无法支撑的内容列为开放项并标注，不得虚构。

## 2. 必读输入（按序完整读取）

1. `.sddu/specs-tree-root/specs-tree-business-panorama/state.json` —— Feature 状态与范围
2. 同目录 `discovery.md` —— Why 层访谈完整记录（**核心输入**）
3. 同目录 `facts-baseline.md` —— What 层事实基线（带源文件锚点）
4. 同目录 `interview-guide.md` —— 访谈提纲（了解问题覆盖面）

## 3. discovery 关键结论摘要（详情与原话以 discovery.md 为准）

- **核心问题链**：「语义优先」为立项前设计公理（原话"设计好的"）；现实印证 = Mermaid 等现有工具布局算法在真实业务图上不可预测地差（"有时候极差"）+ AI 布局效果不稳定；痛点烈度 = 工作流"无比煎熬"，非可用性灾难。
- **定位**：AI-first 从未摇摆；双 CLI 全为 AI Agent 设计，人类开发者直接接触语法为少数场景；端排序 Why = "cli对于AIAgent使用大势所趋"。
- **核心机制 Why**：「AI 不直写源码」= 命令面强约束替代自由文本，掐断「语法变形→难校验→频繁返工」损耗链。
- 🚨 **双层消费模型**（对 design.md:73 绝对化表述的修正）：人类（理解 LGDL、决策、指挥）→ AI Agent（执行、经 CLI 操作图）；LGDL 必须对 AI 可操作、对人类可理解。
- 🚨 **AI 自主决策清单（3 例）**：9 种图类型圈定、v0.6 路线图、YAML 风格语法形态——均为 AI 提案/规定，作者角色 = 方向把关 + 验收 + 否决权（"如果JSON更好可以更换"）。
- 🚨 **v0.6 素材置信度整体降级**：v0.6 Unreleased 中混有未经作者审视的 AI 规划（原话"仅记录，不作为参考"）；除带验证记录的已实施工程事实（如 core 314 / render 21 / web 107 全绿）可作 What 层引用外，v0.6 Why 层一律不可作为业务全景素材。
- **竞争定位素材仅 2 条**：排除 Mermaid 因语言不纯（混入颜色等非业务逻辑关注点）；兼容/迁移二维框架（对内抛弃错误设计不做向后兼容，对外迁移靠 convert/import CLI 承担）。
- v0.4/v0.5 同日完成是巧合、非决策链（铺路假设被否定）；v0.1 决策集回望"没有偏差"。

## 4. 硬约束

1. **空白点不编造**：discovery.md 中标 ⛔ 的条目（G1-Q1 具体场景、G2-Q2/Q3/Q5/Q6、G3-Q3、G4-Q4、G5-Q1/Q4/Q6）及标 ⏳ 的收尾两问，在 spec 中列为「待作者补写/接受留白」开放项。
2. **AI 自主决策类内容必须定义置信度标注规则**（AI 提案 ≠ 作者确认愿景），建议三级：作者确认 / AI 提案待审视 / 用户跳过未获得。
3. **v0.6 Why 层素材禁止进入全景叙事需求**。
4. 不修改存量文档漂移（如 design.md config.ts 漂移仅记录）——漂移校正是后续独立 Feature，不在本 spec 范围。
5. **写入路径限制**：只允许写 `.sddu/specs-tree-root/specs-tree-business-panorama/` 下的 `spec.md`（新建）与 `state.json`（更新）；不得修改 LGDL 项目源码与存量文档（README/CHANGELOG/design.md 等）。本仓库无 `.opencode/plugins/sddu` 模板（此前产物均为自建结构），spec.md 结构自定但需覆盖 §5 任务清单。
6. **完成后更新 state.json**：phase 改为 `"speced"`，artifacts 数组追加 `"spec.md"`，notes 追加 spec 阶段进度；用 `python3 -m json.tool` 校验 JSON 合法。

## 5. spec.md 任务清单（至少包含）

1. 文档目标与读者（目标是让「外人」5 分钟理解 LGDL 为什么存在）
2. 文档结构需求（章节骨架建议，映射 discovery 五组 + 元发现章节「人机协作模式」）
3. 内容需求逐条（每章必须覆盖的 Why 结论，引用 discovery 条目编号如 G1-Q3/G4-Q6）
4. 置信度与标注规则（三级标注 + v0.6 降级规则）
5. 空白点处理需求（汇总全部开放项及每项建议处理方式：作者补写 / 接受留白 / 后续 Feature）
6. 验收标准（可检查的完成定义）

## 6. 收尾两问（⏳ 未答，答复后请补入 discovery.md 收尾节并评估对 spec 的影响）

1. 五个层面（痛点/竞品/场景/哲学/演进）里，哪个最能让「外人」在 5 分钟内理解 LGDL 为什么存在？（追问变体：是否正是「AI 提案 → 作者把关」的人机协作模式本身？）
2. 有没有访谈完全没问到、但你认为属于「业务全景」必写的 Why？

## 7. 移交后向 2.plan 的提示

- spec 完成后建议 @sddu-plan 重点处理：置信度标注规则如何落到文档写作任务、空白点的作者补写排期、以及 v0.6 素材分层引用的写作约束。
