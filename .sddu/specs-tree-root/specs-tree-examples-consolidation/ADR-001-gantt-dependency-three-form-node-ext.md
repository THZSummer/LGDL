# ADR-001: gantt 依赖三型构造需新增 doc/retro 两 process 节点

## 状态
PROPOSED

## 背景
spec D-004（spec.md:161-178）要求 gantt 例（产品发布甘特图）补全时间轴语义：launch 里程碑 duration 1→0 + 依赖边覆盖三型（gap≈0 链 ≥4 边 / 目标在左 1 边 / gap≥20 1 边，FR-004）。spec D-004 表（spec.md:169-174）对三型的示例构造明确写出两条独立边：

| 型 | spec 示例构造 |
|---|---|
| 目标在左 | `test→doc`：doc.start（并行编写中）< test.end |
| gap≥20 | `test→retro`：retro.start = test.end + 20 |

但现有 gantt 节点集（examples/gantt.lgdl:4-34）仅 research/design/develop/test 4 process + launch 1 milestone，**不含 doc、retro 节点**——spec 表引用了节点集中不存在的 id。

## 决策
在 gantt 例中**新增 2 个 process 节点** doc（文档编写，与开发/测试并行）与 retro（发布复盘），承载"目标在左 / gap≥20"两条独立边（源节点 test 为 process，符合 spec D-004「gap≥20 与目标在左各由 1 条独立边承担，源节点均为 process」约束）。

- doc：`start: 10, duration: 2`（与 develop/test 并行编写；doc.start 10 < test.end 18 → 目标在左判定成立）
- retro：`start: 38, duration: 4`（retro.start 38 − test.end 18 = 20 ≥ 20 → gap≥20 判定成立）
- 行序（nodes 声明序 = layout 逐行序，lgdl-layout/src/index.ts:721-730）：research/design/develop/doc/test/retro/launch——test 与 doc 相邻、test 与 retro 相邻、develop→test 垂直段 x=14 列经 doc 条空列（doc 占 10..12）、test→launch 垂直段 x=18 列经 retro 条空列（retro 占 38..42），遵循 B7「相邻行 + 空列」构造纪律（matrix-docs-b.ts:401-403）。
- 主线 4 process（research→design→develop→test→launch）语义保留，4 条 gap≈0 链边判定不变。

## 唯一性论证（为何必须新增节点）
现有 5 节点（research/design/develop/test/launch）已全部处于主线 gap≈0 链上（research→design→develop→test→launch 首尾相接）。在该节点集内：
1. 任意再连边要么与既有主线边重复（同 from→to），要么引入与主线数值冲突的新依赖；
2. FR-004 同时要求「gap≈0 链 ≥4 边」与「目标在左 1 边 + gap≥20 1 边」——后两型的判定（target.start < source.end / target.start − source.end ≥ 20）与 gap≈0（target.start = source.end）在**同一对节点上互斥**，只能在链外节点对上构造；
3. 因此**新增节点是唯一同时满足 FR-004 三型 + 主线 4 阶段语义的构造**。

## 备选方案
- **仅现有 5 节点构造**：无法同时满足 gap≈0 链 ≥4 边与两独立边（上述论证）→ 否决。
- **复用 B 档 B7 fixture 承担三型示范、A 档 gantt 只改 duration=0**：违反 spec G-003/FR-004「gantt 例依赖边覆盖三型」的显式验收标准（A 档示例集是官方范本）→ 否决。
- **新增节点（选择）**：唯一满足 FR-004 验收的构造；doc（并行文档编写）/ retro（上线复盘）语义与产品发布主线自然契合，不损害范本语义自洽。

## 后果
- 正面：gantt 例成为 7 任务（6 process + 1 milestone）全特性范本，A 档首次覆盖依赖三型与 duration=0 里程碑；kind-coverage milestone 菱形断言（kind-coverage.test.ts:138-154）不受影响（按 kind 绘菱形，与 duration 无关，render index.ts:1237-1243）。
- 负面/待验证：
  1. **推断需作者确认**——spec D-004 表引用 doc/retro 但未显式声明"新增节点"；若作者意图为仅现有节点构造，需回退修订 spec（经论证不可行）。
  2. golden gantt.svg 字节必变（任务 5→7 + duration 1→0 + 边 4→6），属 FR-011 预期变更集。
  3. 三型数值为基线构造，tasks 期可按 U-2 微调但三型判定不可降级；最终以 matrix-a 0 违例门禁验收（FR-004/EC-001），真红走最小调整或 EC-001 记录，不降审计标准。
  4. 里程碑 duration=0 文本渲染为 `${start}d +0d`（render index.ts:1219 → `18d +0d`），语义是否符合作者预期留待 validate 实测确认（EC-002/OQ-5），本 Feature 不改引擎。

## 修订记录
| 版本 | 说明 | 日期 | 修订人 |
|------|------|------|--------|
| v1.0 | 初始创建（PROPOSED，待 tasks 期作者确认） | 2026-09-03 | SDDU Plan Agent |
