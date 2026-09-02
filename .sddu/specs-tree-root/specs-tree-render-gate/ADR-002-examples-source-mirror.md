# ADR-002: A 档 11 源获取策略（render 包内受管镜像，禁跨包反向依赖）

## 状态
ACCEPTED

## 背景
spec FR-002/FR-008 要求 A 档 11 例的输入 = `EXAMPLES[i].source`（examples.ts 单一事实源），快照基线从该 source 出发 parse→layout→render，且「不依赖磁盘 .lgdl/.svg 文件」（D-002/FR-008）。真实约束（2026-09-02 核实）：
- 单一事实源 `packages/lgdl-web/src/examples.ts`（:14-71 共 11 条）位于 **lgdl-web**——render 的**下游**（web 依赖 render，web/package.json dependencies 含 `@lgdl/lgdl-render`）；
- lgdl-web `private: true`、无 main/exports 入口、CI 的 build 步骤**不构建 lgdl-web**（.github/workflows/ci.yml build 清单仅 core/layout/router/render/web-cli-base/lgdl-web-cli/lgdl-web-op-cli 七包）→ render 测试运行时反向 import `@lgdl/lgdl-web` 不可行（成环 + dist 可能不存在）；
- examples/ 磁盘 *.lgdl 是生成物，且 gen-examples.mjs 链路已断、磁盘 .svg 已漂移 7/11（discovery §3.4）→ 不可作为测试输入。

## 决策
render 包内建**受管镜像** `packages/lgdl-render/src/test-support/examples-sources.ts`：导出 `EXAMPLES_SOURCES: { id: string; source: string }[]`，内容从 `packages/lgdl-web/src/examples.ts` 的 11 个 EXAMPLES 条目**逐字复制**（保持双引号转义字符串原文，语义逐字节等价）。文件头注释声明：
- `DO NOT EDIT — 同步源：packages/lgdl-web/src/examples.ts（单一事实源）`；
- 同步规程：examples.ts 变更后由人工/后续 Feature 执行一次复制，随 golden 快照重建一并 review（git diff 核对镜像与 web 源一致）。

同步为低频人工步骤 + review diff 核对，**不引入跨包运行时读取、不新增生成脚本**（脚本蔓延与 NG-002 精神冲突；本 Feature 不修生成链路）。

## 后果
- 测试自洽且确定性：A 档审计与 golden 快照的输入在 render 包内闭合，CI/本地行为一致；
- 镜像与 web 事实源存在**漂移窗口**（新增风险 R-008）：缓解 = 文件头声明 + review 阶段 diff 抽查 + tasks/build 提示 + 快照黄金基线以镜像为准（若镜像与 web 不同步，golden 不会静默漂移，只会随下次显式重建而更新）；
- FR-010「快照可再生成」从镜像出发（重建 = 镜像 + env 更新门，见 ADR-003），链路自洽、与断掉的 gen-examples.mjs 解耦。
