# ADR-003: golden 快照资产格式与更新门（test-assets + 字节/sha 双校验 + env 显式重建）

## 状态
ACCEPTED

## 背景
spec 开放问题 #3「快照资产落位与重建入口细节」待 plan 决策；FR-008（11 组 {id}.svg + sha256 manifest 建档）、FR-009（逐字节比对 + 禁止测试静默更新基线）、FR-010（可再生成）。约束：资产与 examples/*.svg 物理分离（D-002）；不新增 CI workflow（FR-011）；dist/ 惯例 gitignored；引擎确定性已实测（双渲染字节一致，discovery §3.4-2）；manifest 若含时间戳将破坏 git diff 确定性。

## 决策
1. **资产目录** `packages/lgdl-render/test-assets/golden/`（提交 git，与 gitignored 的 dist/dist-test 无关）：
   - `{id}.svg` × 11 —— 当前引擎渲染字节**原样**写入（无尾换行加工）；
   - `manifest.json` —— `{ "version": 1, "ids": [11 个 id，文档序], "files": { id: sha256hex } }`；**不含时间戳/环境信息**，保证重建后 manifest 可 diff（确定性）。
2. **读取路径**：测试内 `new URL('../../test-assets/golden/', import.meta.url)` —— 编译产物位于 dist-test/，相对解析回包根（不依赖 process.cwd，npm 从任意目录执行均稳定）。
3. **双校验**：快照断言 = 渲染字符串与 `{id}.svg` 文件字节相等 **且** sha256(渲染串) === manifest.files[id]（文件被篡改但 manifest 未更新 → 红；manifest 被改但文件未动 → 红）。
4. **更新/重建门（FR-009/EC-002/FR-010）**：测试代码仅在环境变量 `LGDL_UPDATE_SNAPSHOTS=1` 时执行写路径（重写 11 svg + manifest 后**立即重新断言一致**）；未设置时测试只读，代码路径不存在任何写盘分支 → 正常 `npm test`/CI（不设 env）**不可能静默更新基线**。首建基线/接受有意漂移 = 作者显式 `LGDL_UPDATE_SNAPSHOTS=1 npm run test --workspace @lgdl/lgdl-render` → 人工 git diff 审阅 → 独立 commit。
5. **不新增脚本/npm script**：重建入口即上述 env 命令，避免 package.json/scripts 面改动（FR-011 最小化）。

## 后果
- 零脚本、零 workflow、零 package.json 改动；CI 只读门禁天然生效；
- 首建前（资产缺失）普通模式测试红 → 以 env 模式建档（FR-008 首建流程 = tasks 阶段一次性执行）；
- 误更新风险极低（env 显式 + 独立 commit 规程）；manifest 确定性使重建 diff 可人工审。
