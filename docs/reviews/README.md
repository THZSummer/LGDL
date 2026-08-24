# 视觉模型评审记录（渲染质量维度）

> 本目录存放 **2026-08-22** 一轮视觉模型评审的原始输出（commit `645a0a1` 起配套生成）。
> 评审对象是 `examples/` 中**早期示例图**的**渲染质量**（布局/连线/可读性/配色），
> 与 `docs/ai-vision-review.md`（AI 工程师实战 + 业务语义评审）是**两个不同维度**的评审。

## 评审维度

每份 review 按 5 个维度评价渲染质量 + 改进建议：

1. **布局质量** — 间距均匀性、留白、整体平衡
2. **结构质量** — 层级流向、聚合容器归属、节点对齐
3. **连线与箭头** — 标注遮挡、连线重叠、方向正确性
4. **可读性** — 字号、对比度、文字完整性
5. **颜色样式** — 层级/分支色彩区分度

## 文件与对应示例图

| review 文件 | 对应示例图（examples/） |
|---|---|
| `review_architecture.txt` | `architecture`（架构图） |
| `review_microservices.txt` | `microservices`（微服务架构） |
| `review_datastream.txt` | `datastream`（数据流） |
| `review_er.txt` | `er`（ER 图） |
| `review_gantt.txt` | `gantt`（甘特图） |
| `review_mindmap.txt` | `mindmap`（思维导图） |
| `review_sequence.txt` | `sequence`（时序图） |
| `review_state.txt` | `state`（状态机） |
| `review_uml-class.txt` | `uml-class`（类图） |

## 与 ai-vision-review.md 的关系

- **本目录**：渲染质量（"画得好不好看"）——布局/连线/配色，驱动 **render 包**改进
- **ai-vision-review.md**：业务语义（"画得对不对"）——结构/逻辑/工程合理性，驱动 **core 校验 + AI 建模**改进

两轮评审共同产出 v0.6 改进清单（见 `docs/ai-vision-review.md` §4）。
