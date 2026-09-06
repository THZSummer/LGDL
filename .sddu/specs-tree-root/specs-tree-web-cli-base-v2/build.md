# 构建报告：web-cli-base v2（specs-tree-web-cli-base-v2）— P0 波次

> **文档定位**: SDDU 构建报告 — 记录 P0 波次任务的文件变更和实现结果，作为 review 阶段的输入
> **前置依赖**: tasks.md/tasks.json（任务清单）、plan.md（8 ADR 技术方案）、spec.md（46 FR 需求）
> **创建人**: SDDU Build Agent
> **创建时间**: 2026-09-06
> **版本**: v1.0（P0）
> **更新人**: SDDU Build Agent
> **更新时间**: 2026-09-06
> **更新说明**: 初始创建（P0 波次 TASK-001~007 实施完成；P1/P2/GATE 留后续波次）

## 1. 构建概要

| 维度 | 数值 |
|------|:--:|
| 完成任务数 | 7 / 15（本次范围 P0） |
| 复杂度分布 | S×0 / M×2（TASK-004/005/006 中 M 级 3）/ L×4（001/002/003/007） |
| 新增文件 | 23 个 |
| 修改文件 | 10 个（router.ts 跨 TASK-002/005） |
| 验证 | base build + test 151 用例全绿；lgdl-web vite build + tsc 零错误 + 48 用例全绿 |

## 2. 文件变更

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| NEW | packages/web-cli-base/src/permission.ts | TASK-001 | PermissionGate 裁决管线（规则集/策略/allowed-tools/缺省取向）+ ask 契约 + EC-014 deny 优先 |
| NEW | packages/web-cli-base/src/permission.test.ts | TASK-001 | 裁决矩阵/间谍断言/ask 三路/EC-014/glob 工具（14 例） |
| NEW | packages/web-cli-base/src/audit.ts | TASK-001 | AuditSink 事件面（权限/调用/扩展注册/压缩）+ memory/console + createAudit |
| NEW | packages/web-cli-base/src/audit.test.ts | TASK-001 | 四类事件 + sink 注入 |
| NEW | packages/web-cli-base/src/platform.ts | TASK-001 | PlatformEnv DI 缝 + browserEnv/nodeEnv + 授权失败转译（FR-009/EC-003） |
| NEW | packages/web-cli-base/src/platform.test.ts | TASK-001 | node 假面断言 + 转译注入 |
| MODIFY | packages/web-cli-base/src/router.ts | TASK-002/005 | 注册表 v2（fqn 键/ns/group/enabled/risk + register/unregister/query/enabledTools/setNamespaceOrder）+ dispatch 五步链 + PostToolUse 审计 + web-fetch 内建升级接线 |
| MODIFY | packages/web-cli-base/src/router.test.ts | TASK-002 | v2 专项 12 例增补（F-23 既有 18 例零回归） |
| NEW | packages/web-cli-base/src/storage-mem.ts | TASK-003 | StorageBackend 抽象 + memory 实现（rev/冲突标记 EC-013） |
| NEW | packages/web-cli-base/src/storage-idb.ts | TASK-003 | IndexedDB 载体（对象库/事务/rev；node 面转译桩） |
| NEW | packages/web-cli-base/src/storage-opfs.ts | TASK-003 | OPFS 卷载体（目录/文件句柄/越界防护；node 面转译桩） |
| NEW | packages/web-cli-base/src/storage-tools.ts | TASK-003 | storage + storage-quota 工具（FR-013/014，EC-004/005 转译） |
| NEW | packages/web-cli-base/src/storage-tools.test.ts | TASK-003 | CRUD 全链/quota 格式/EC-004/013 + 浏览器冒烟预留注释 |
| NEW | packages/web-cli-base/src/settings.ts | TASK-003 | settings 同步 KV（localStorage/memory 双后端 + 命名空间隔离，FR-015/042） |
| NEW | packages/web-cli-base/src/settings.test.ts | TASK-003 | CRUD + 隔离 + LS 降级 |
| NEW | packages/web-cli-base/src/doc-tools.ts | TASK-004 | doc-read/doc-edit 内容对象原语（str_replace/insert/create；changed+source） |
| NEW | packages/web-cli-base/src/doc-tools.test.ts | TASK-004 | 假 ctx 读写/无上下文错误/编辑推进/read-before-edit 策略联动 |
| MODIFY | packages/web-cli-base/src/web-fetch.ts | TASK-005 | v2 升级：executeWebFetchWithOptions（clean/maxBytes/timeoutMs/错误分类/untrusted）；F-23 入口逐字节兼容 |
| MODIFY | packages/web-cli-base/src/tools.ts | TASK-005 | WEB_FETCH_TOOL schema 追加可选 clean/maxBytes/timeoutMs |
| MODIFY | packages/web-cli-base/src/web-fetch.test.ts | TASK-005 | 增补原文/清洗两态/标记/截断/错误分类（既有用例零回归） |
| NEW | packages/web-cli-base/src/web-search.ts | TASK-005 | web-search（env.search 注入；未配置禁用态+指引 EC-006；untrusted FR-010） |
| NEW | packages/web-cli-base/src/web-search.test.ts | TASK-005 | 假服务全链 + 未配置态 + enabled:false 三链 |
| NEW | packages/web-cli-base/src/session-store.ts | TASK-006 | SessionStore（turns/恢复点序列化 + rev 冲突/last-write + aux 存档） |
| NEW | packages/web-cli-base/src/session-tool.ts | TASK-006 | session 工具（persist/status/query/list/add-checkpoint） |
| NEW | packages/web-cli-base/src/context-tool.ts | TASK-006 | context 工具（compact：摘要器注入 + 原始存档 + 审计 NFR-009） |
| NEW | packages/web-cli-base/src/task-state.test.ts | TASK-006 | session/context 段（持久恢复等价/冲突/interrupted 基线/压缩可审计；TASK-010 扩展） |
| NEW | packages/web-cli-base/src/assembly.ts | TASK-007 | buildDefaultMatrix + createP0DomainTools + createDefaultRouter（AC-001 自足冒烟） |
| NEW | packages/web-cli-base/src/assembly.test.ts | TASK-007 | 矩阵三链断言 + 顺序契约 |
| MODIFY | packages/web-cli-base/src/index.ts | TASK-007 | P0 导出面（permission/audit/platform/assembly + P0 域工厂 + store 类型） |
| MODIFY | packages/lgdl-web/src/ai/session.ts | TASK-007 | 组装点 v1：browserEnv 注入 + 矩阵消费 + policy.onAsk 桥 + audit + ctx.services（SessionStore）+ web-search 条件注入 |
| MODIFY | packages/lgdl-web/src/ai/session.test.ts | TASK-007 | 矩阵派生顺序改写（D-005）+ ask 桥三路 + services 注入断言 + web-search 条件开 |
| MODIFY | packages/lgdl-web/src/ai/provider.ts | TASK-007 | ProviderSettings.webSearch（BYOK）+ saveWebSearch |
| MODIFY | packages/lgdl-web/src/ai/provider.test.ts | TASK-007 | webSearch 读写/缺省/专用 setter/零回归 |

## 3. 任务完成清单

| 任务 | 名称 | 复杂度 | 状态 | 对应 FR |
|------|------|:--:|:--:|------|
| TASK-001 | base 机制层三件套（permission/audit/platform） | L | ✅ completed | FR-005~010 |
| TASK-002 | base registry v2（router 注册表 + dispatch 门禁/审计接线） | L | ✅ completed | FR-001~005/038/043 |
| TASK-003 | base 存储域（storage 载体双轨 + storage-tools + settings） | L | ✅ completed | FR-013~015/042 |
| TASK-004 | base doc-tools（doc-read / doc-edit 原语） | M | ✅ completed | FR-011/012 |
| TASK-005 | base NET P0（web-fetch additive 升级 + web-search 骨架） | M | ✅ completed | FR-018/019/010/040 |
| TASK-006 | base SES 域（session-store + session-tool + context-tool） | M | ✅ completed | FR-034/035 |
| TASK-007 | base assembly + index P0 导出 + lgdl-web 组装接入 v1 | L | ✅ completed | FR-039/040/044/042 |

> P1（TASK-008~012）、P2（TASK-013~014）、GATE（TASK-015）不在本次范围，留后续波次。

## 4. 测试覆盖与门禁

| 验证面 | 命令 | 结果 |
|------|------|:--:|
| base build | npm run build --workspace @lgdl/web-cli-base | ✅ tsc 零错误 |
| base test | npm run test --workspace @lgdl/web-cli-base | ✅ 151/151（F-23 基线 73 例零回归，新增 78 例） |
| lgdl-web vite build | npm run build --workspace @lgdl/lgdl-web | ✅ 零错误 |
| lgdl-web 显式 tsc | npx tsc --noEmit -p packages/lgdl-web/tsconfig.json | ✅ 零错误 |
| lgdl-web test | npm run test --workspace @lgdl/lgdl-web | ✅ 48/48 |

红线核验：
- runner 主体零改动：`git diff` runner.ts/delay.ts/sleep.ts/llm.ts/protocol.ts 为空 ✅
- ToolEntry additive：F-23 router.test 既有用例原样通过（router.test.ts:153 顺序断言零回归）✅
- D-005 测试守恒：session.test.ts 派生顺序断言随矩阵扩展「改写有据」（矩阵派生断言承接，代码注释已记录）✅
- base 零 LGDL/react import（grep 仅命中「零依赖」声明注释，无 import）✅

## 5. 下一步

| 场景 | 操作 |
|------|------|
| P0 已完成 | 后续波次运行 `@sddu-build` 续作 P1（TASK-008~012）；全部完成后运行 `@sddu-review specs-tree-web-cli-base-v2` 开始审查 |
| 浏览器真实冒烟 | validate 阶段承接：IDB/OPFS 真持久、Notification/clipboard 授权、ask UI、web-search BYOK 全链（storage-tools.test.ts 已列预留清单） |

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：P0 波次 TASK-001~007 实施完成（机制层/registry v2/存储域/doc/NET/SES/assembly+lgdl-web v1）；base 151 + lgdl-web 48 用例全绿 | 2026-09-06 | SDDU Build Agent |

---

## 6. P2 + GATE 增补（2026-09-06 续跑）

**P2 波次（TASK-013~014）**
| 任务 | 名称 | 状态 | 验证 |
|------|------|:--:|------|
| TASK-013 | 浏览器/网络试点（notify / clipboard / save-file / stream） | ✅ | base 192（+11） |
| TASK-014 | 执行/编排/MCP 试点（exec-remote / worker-session / eval-wasm / mcp-client） | ✅ | base 204（+12） |

- 新增：`notify.ts` `clipboard.ts` `save-file.ts`(+test) `stream.ts` `exec-remote.ts` `worker-session.ts` `mcp-client.ts`(+test) `p2-web-tools.test.ts` `p2-exec.test.ts`；MODIFY `eval-tools.ts`(+wasm 面)/`eval-tools.test.ts`（wasm 段）/`index.ts`（P2 导出）。
- **裁剪记录（S-04）**：workflow 编排「后置」不进本版（spec S-04）；MCP Streamable HTTP 试点「纳入」（S-07）；notify/clipboard/stream/save 授权失败转译单测经注入桩覆盖。
- 红线：`runner.ts` 零改动；TaskState/jobs 在途规范对象 + interrupted/cancel 终态不被覆盖（EC-008）；MCP 端点不可达 → 该源降级不注册、其余源不受影响（EC-012 测试断言）；worker-session 崩溃自动重建主会话不中断（EC-009）。

**GATE（TASK-015）全仓门禁结果**
| 包 | build | test（pass/fail） |
|----|:--:|:--:|
| lgdl-cli | ✅ | 0/0 |
| lgdl-core | ✅ | 267/0 |
| lgdl-layout | ✅ | 0/0 |
| lgdl-render | ✅ | 94/0（95 例，1 skipped 系基线） |
| lgdl-router | ✅ | 8/0 |
| lgdl-web | ✅（vite+tsc 零错误） | 51/0 |
| lgdl-web-cli | ✅ | 84/0 |
| lgdl-web-op-cli | ✅ | 15/0 |
| web-cli-base | ✅（tsc 零错误） | 204/0 |

- grep 零残留：base 无 `@lgdl/react` import、无 .tsx/React 泄漏；OS 工具名仅 NG-004/NG-005 边界声明注释（无实现）；无策略旁路。
- D-005 测试守恒：F-23 既有用例只增不删；session.test.ts 派生顺序断言随矩阵三阶段扩展改写有据。
- 真实浏览器冒烟面（FSA/Notification/clipboard 授权、ws/SSE、eval-wasm、MCP 真端点、dom-* 真 DOM、IDB/OPFS 真持久）移交 validate（FR-045/AC-008 基线）。
