# AI 视觉评审暴露的 Bug 明细（v0.6 排期用）

> 本文档把 [ai-vision-review.md](ai-vision-review.md) §4 「跨图共性发现」里属于**产品缺陷 / 渲染增强**的
> 条目，逐条落到「现象 → 根因 → 涉及文件与行号 → 修法」，并为每条给出**定性**：
> `bug`（现有功能行为错误，该修）或 `渲染增强`（非错误，但可提升）。
> 业务建模类问题（补 releaseStock、地址快照、枚举等）属**内容层**，不进本文档，归 AI 提示词模板范畴。
>
> 结论概览：bug 3 条（① 布线交叉/标签重叠、② 甘特图过扁/[时间刻度]不可读/泳道无分隔线、
> ④ 跨层长斜线横穿）+ 渲染增强 1 条（③ 重复标签冗余）。
>
> **修复状态（已全部落地）**：①②④ 在 `packages/render`（`orthogonalize` 正交绕障布线 +
> `placeLabelBox` 障碍感知标签避让）与 `packages/layout`（甘特自适应时间刻度）修复；
> ③ 在 `packages/render` 用「同 from+同 label 扇出合并」将重复标签合并为源端一次标注。
> 均经多张同类型示例图重新渲染验证，`npm run test` 全绿（core 314 / render 21 / web 107）。

---

## ① 连线交叉 / 标签重叠 — `bug`（render / layout）

- **出现图**：arch、mindmap、er、state、uml-class（5 张全中）
- **现象**：多条边互相穿插；边标签压在别的边或节点上。
- **根因**：
  - 布局层用 dagre 分层（`layoutHierarchical`）与放射（mindmap），但**边路径全是直线段拼接，没有正交/避障走线**。
  - 渲染层唯一避让是 `placeLabel`（`packages/render/src/index.ts:227`）——只在**标签与标签同 y 且水平重叠**时上下错开 ±14px；既不避开**节点盒**，也不避开**别的边**。
  - mindmap 采用固定半径 + 中心角平分（`packages/layout/src/index.ts:239` `MIND_LEVEL_SEP=180`），兄弟节点扇区相邻时连线结构性交叉，避让救不了。
- **修法（render/layout）**：边路径改 90° 正交布线；标签避让节点盒；mindmap 在兄弟子树间留扇区间隔。

---

## ② 甘特图过扁 / 时间刻度不可读 / 泳道无分隔线 — `bug`（render / layout）

- **出现图**：gantt-saas-roadmap（7 任务 / 3 泳道）
- **现象**：整图宽 1600+、高仅约 400，比例 ≈4:1 显得压扁；时间轴 `D0,D1,…` 挤在 40px 格子里字太小；3 条泳道（group）看不到背景/分隔线。
- **根因**：
  - `layoutGantt`（`packages/layout/src/index.ts:520`）：`height = GRAPH_MARGIN*2 + GANTT_HEADER_H + tasks.length*GANTT_ROW_H`，行高固定 `GANTT_ROW_H=48`（:510）、条高 `48-16=32`；而 `width` 随 `(maxEnd-minStart)*GANTT_COL_W` 线性拉长，任务跨度一大即横向爆宽 → 宽高比失衡。
  - `renderGantt`（`packages/render/src/index.ts:947`）**完全没读 `doc.groups`**：只画了背景 `rect`、任务条、依赖箭头、时间轴——没有泳道背景块/分隔线，group 数据在 gantt 分支被丢弃。
  - 时间刻度 `GANTT_COL_W=40`（:511）恒定 + `maxDay=(width-GRAPH_MARGIN-GANTT_LABEL_W)/colW`（:1008），跨度大时长轴被切成几十上百个小格，`10px` 字号不可读。
- **修法（render/layout）**：提高 `GANTT_ROW_H`（≈64）并加高条；时间轴支持"天 / 周 / 月"分档；渲染器补充 group 泳道背景 + 分隔线。

---

## ③ "路由转发"重复标签冗余 — `渲染增强`（render）

- **出现图**：arch
- **现象**：多条边都标同一"路由转发"，视觉密集冗余。
- **根因**：重复来自**建模内容**，不是渲染错误——分叉的多条边被建模者每条都写了相同 label，渲染器只是忠实绘制。渲染器无法自动去重而不丢语义。
- **定性更正**：属**渲染器增强**，不是渲染画错了。
- **修法（render / CLI）**：渲染器对"同 from、同 label、发向多个 to"的边合并成一条 + 分支标记；或 CLI 建模侧提示合并。

---

## ④ "申请退款"长斜线横穿全图 — `bug`（render / layout）

- **出现图**：state-order
- **现象**：`申请退款` 边从上层状态跨到另一层，拖出长斜线横穿中间节点，与发货等边交叉。
- **根因**：state 用 dagre TB 分层；dagre 返回的边折点经渲染层 `trimmed/snap`
  （`packages/render/src/index.ts:644-646`）后按直线段连接，无正交化、无绕道。当一条边连接的两个状态
  在 Y 方向跨越多个 rank 时，即得斜穿长线。
- **修法（render/layout）**：边路由做 90° 正交化 + 中线绕行（避开节点盒与其他边）；对"向回指 / 跨层"边强制走外圈折返通道。
