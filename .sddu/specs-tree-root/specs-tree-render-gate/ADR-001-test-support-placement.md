# ADR-001: 测试侧代码落位与编译边界（test-support 目录 + tsconfig exclude）

## 状态
ACCEPTED

## 背景
spec FR-005 要求 geometry-audit helper「放 render 包测试支持代码，非 src 业务导出，不进包 exports」；FR-011/EC-007 要求新增用例落入既有收集面，允许最小测试侧调整，不得改动包 exports/构建产物；NFR-001 要求 src 业务文件零 diff、dist/index.js 产物与改动前一致。

实测约束（2026-09-02 代码核实）：
- render `package.json` test 脚本 = `tsc src/*.test.ts --outDir dist-test … && node --test dist-test/*.test.js`（package.json:16）——shell glob `src/*.test.ts` 只匹配 src **顶层**测试文件；
- 测试编译（tsc 带文件参数）**忽略 tsconfig**，纯靠命令行 flag + import 图拉入被引模块并发射到 dist-test（故现有 `./index.js` 相对 import 会把 src/index.ts 编入 dist-test）；
- build `tsc`（无参数）读 tsconfig：`include: ["src"]`、`exclude: ["src/**/*.test.ts", "dist"]`（tsconfig.json:14-20）→ 任何 src 下**非 *.test.ts** 的 .ts 都会被编进 dist；
- dist/ 与 dist-test/ 均 gitignored（.gitignore `dist/`），dist 产物不进 git。

矛盾点：helper 若以普通 `.ts` 放 src 顶层/子目录，会被 build 编入 dist（污染产物、违背「不进包」精神）；若全塞进单个 `*.test.ts` 巨型文件，违背 FR-004/NFR-006 的可读组织与分工。

## 决策
1. 共享纯模块（geometry-audit / render-harness / examples-sources 镜像 / matrix-docs-b）放 `packages/lgdl-render/src/test-support/*.ts`——文件名**不以 `.test.ts` 结尾**（顶层 glob 不匹配、不成为独立测试入口），由测试文件以相对 `.js` 扩展 import（NodeNext 解析 + `--rewriteRelativeImportExtensions` 已具备，同 svg.test.ts:3 `./index.js` 先例）。
2. render `tsconfig.json` 的 `exclude` 追加 `"src/test-support"`（tsconfig.json:14-20）→ build 产物 dist 与改动前逐字节一致（该目录不进 dist）；测试编译命令行模式忽略 tsconfig，不受影响，test-support 经 import 图进入 dist-test/test-support/ 而非测试入口。
3. 全部新测试文件放 src **顶层** `*.test.ts`（matrix-a/matrix-b/snapshot/geometry-audit/kind-coverage/degraded-paths）→ 既有 test 脚本 glob 零改动自动收集；`node --test dist-test/*.test.js` 顶层 glob 只跑 *.test.js，dist-test/test-support/*.js 不会被当测试执行。

## 后果
- render `package.json` 零改动；ci.yml 零改动；`git diff --stat` 仅新增测试文件/测试资产 + tsconfig 一行 exclude（纳入 NFR-001 审计清单，review 阶段核对）；
- dist/ 产物不变（NFR-001：dist/index.js hash 一致 + 无新增 dist 模块）；
- tsconfig 是唯一「非测试」配置文件改动，已在 plan §5 明示为 FR-011 允许的最小文件组织调整；
- 若未来测试文件需要分目录，才需动 test 脚本收集面（EC-007 预案，本 Feature 不触发）。
