# Feature Specification：specs-tree-v2-4-command-archive（V2-4 命令档案浏览器）

> **文档定位**: SDDU 需求规范（**叶子子 Feature**）— 定义 V2-4 的功能/非功能需求与验收边界，作为 plan 阶段的输入
> **前置依赖**: 父 Feature `specs-tree-web-cli-plugin-v2-insight/spec.md`（v1.0，2026-09-13）——本子 Feature 的需求为**父 spec 的 FR-V2-050~FR-V2-056**；上游依赖 V2-1（树模型中的命令投影）
> **创建人**: SDDU Spec Agent · **创建时间**: 2026-09-13 · **版本**: v1.0 · **更新人/时间**: SDDU Spec Agent / 2026-09-13
> **更新说明**: 初始创建。随父 Feature 立项（父 + 4 叶子子 Feature，作者确认 2026-09-13）。**P1（作者点名的四维度之一，但纯展示、工作量大 → v2 后段）。**

## 1. 元数据

| 字段 | 值 |
|------|-----|
| Feature ID | specs-tree-v2-4-command-archive（父：specs-tree-web-cli-plugin-v2-insight） |
| 名称 | V2-4 命令档案浏览器 |
| 优先级 | **P1**（后段；不阻塞 P0「可见 + 可操作」闭环） |
| 目标版本 | v0.8（与 v1 / 父 v2 同批叠加） |
| 承载需求 | 父 spec **FR-V2-050~FR-V2-056** |
| 依赖 | V2-1；`tools/declared-tools.ts` + base registry + `security/policy.ts` + `security/auto-authorize.ts` + `test/parity/baseline-catalog.json`（34 工具 / 142 子命令） |
| 建议进入阶段 | plan |

## 2. 上下文与边界

**为什么存在**：作者原话「总共有哪些 cli 命令，那些 allow、哪些 ask、哪些 delay」。V2-4 为**每条命令**建卡：处置档 + risk 档 + 来源 + `delayMs` + 抑制态；`deny` **三成因分列可读**。

**边界（做什么 / 不做什么）**

| ✅ 做什么 | ❌ 不做什么 |
|-----------|-------------|
| 覆盖对账基线 **34 工具 / 142 子命令**并逐条有档 | **不把 `deny` 渲染成「用户可关的开关」**（fail-closed 不可放宽） |
| `deny` 三成因分列（未授权 S1 / 未知或非法 risk S3 fail-closed / `evaluate` 硬底线）+ `auto-authorize` 的 `hardDeny` | **不做命令级覆盖**（作者未选） |
| 与 `test/parity.test.ts` 同源，纳入机器对账（新增/丢失命令即失败） | **不预设站点 runtime 行为**（档案只读真值） |
| `delay` 撞词消歧文案；来源标注；抑制态标注；可检索/过滤 | 不改判定链 / 不放宽门禁 / 不新增权限 |

## 3. 目标与非目标

**Goals**：G1 142 子命令逐条有档；G2 `deny` 三成因分列可读；G3 与 parity 同源机器对账；G4 `delay` 撞词消歧。
**Non-Goals**：NG1 可关的 `deny` 开关；NG2 命令级覆盖；NG3 放宽门禁；NG4 预设站点 runtime；NG5 改判定链。

## 4. 功能需求

> 本子 Feature **直接承载父 spec 的以下 FR**（权威条文见父 `spec.md §5.5`）：

| 父 FR | 一句话 | 子级验收补充 |
|-------|--------|-------------|
| FR-V2-050 | 每条命令有档（34 工具 / 142 子命令）：`allow`/`ask`/`delay(=deny)` + risk + 来源 + `delayMs` + 抑制态 | 覆盖率 **100%**；34/34 工具 |
| FR-V2-051 | `deny` 三成因分列可读（S1 未授权 / S3 未知或非法 risk / `evaluate` 硬底线）+ `hardDeny` | 每个 `deny` 标注成因类别；分类正确 |
| FR-V2-052 | 不把 `deny` 渲染成可关开关（只读，无命令级覆盖） | `deny` 节点无开关；无命令级写入路径 |
| FR-V2-053 | 与 parity 同源机器对账（新增/丢失命令即失败） | 判定表与 `policy.ts`/`auto-authorize.ts` 一致；双向 + 子命令级 |
| FR-V2-054 | `delay` 撞词消歧文案 | 文案：「`delay`（= `deny`，fail-closed，非可配置档位；与命令间 `delayMs` 无关）」；`delayMs` 独立列 |
| FR-V2-055 | 来源标注（base 内建 / `site_*` / 插件 `admin_*`·`tabs`·`bookmarks`·`downloads`·`notify`·`clipboard`） | 与注册真值一致；`site_*` 标注所属 origin |
| FR-V2-056 | 抑制态标注 + 可检索/过滤 | 抑制态与 `deriveTools()` 一致；检索只读 |

**`delay` 消歧（红线文案，必须原样落成）**：
> `delay`（= `deny`，fail-closed，**非可配置档位**；与命令间 `delayMs` 无关）

## 5. 非功能需求

| ID | 类别 | 需求 | 验收 |
|----|------|------|------|
| NFR-V24-001 | 只读 | 档案为纯展示，无任何写路径（无命令级覆盖） | grep 无覆盖写入；`deny` 节点无开关 |
| NFR-V24-002 | 真值一致 | 判定表与 `policy.ts` / `auto-authorize.ts` 真值一致 | 单测 |
| NFR-V24-003 | 可测试性 | 与 `test/parity.test.ts` 同源，142 子命令逐条可验 | 对账门禁 |
| NFR-V24-004 | 零明文 | 档案不含 key / 剪贴板 / 通知明文 | grep 断言 |
| NFR-V24-005 | 可读性 | `deny` 三成因用用户语言表达；`delay` 消歧完整 | 文案断言 |

## 6. 边界情况

| ID | 场景 | 处理 |
|----|------|------|
| EC-V24-001 | risk 未知/非法/缺失 | 展示 `deny` + 成因 S3（不可关） |
| EC-V24-002 | 命令集合与基线漂移（新增/丢失） | 对账 FAIL；以 `deriveTools()` + registry 为真值 |
| EC-V24-003 | 命令被开关/授权状态抑制 | 标注抑制态（不误报为可执行） |
| EC-V24-004 | `site_*` 工具所属站点未授权 | 归属 S1 deny 成因并标注来源站点 |
| EC-V24-005 | 用户把 `delay` 误读为「待批准/可配置延迟」 | 消歧文案完整可读（AC-V24-005） |

## 7. 验收标准

| # | 验收项 | 验证方式 | 关联 |
|---|--------|---------|------|
| AC-V24-001 | **142 子命令逐条有档（覆盖率 100%）**；工具 34/34；无遗漏/无多余 | node 单测 + 对账门禁 | FR-V2-050 |
| AC-V24-002 | `deny` 三成因分类正确（S1/S3/evaluate）+ hardDeny | node 单测 | FR-V2-051 |
| AC-V24-003 | 判定表与 `policy.ts`/`auto-authorize.ts` 真值一致；parity 双向 FAIL 能力 | node 单测 + 与 `test/parity.test.ts` 同源 | FR-V2-053 |
| AC-V24-004 | `deny`/`delay` 节点无开关控件；无命令级覆盖写入路径 | 断言 + grep | FR-V2-052 |
| AC-V24-005 | `delay` 撞词消歧文案完整；`delayMs` 独立列示；无「第三档位」暗示 | 文案 grep 断言 | FR-V2-054 |
| AC-V24-006 | 来源标注正确（含 `site_*` 所属 origin） | node 单测 | FR-V2-055 |
| AC-V24-007 | 抑制态与 `deriveTools()` 一致；检索/过滤只读可用 | node 单测 | FR-V2-056 |

## 8. 开放问题

| # | 问题 | 状态 |
|---|------|:--:|
| 1 | 命令档案与 `parity.test.ts` 同源对账的具体实现 | 归 plan（父 P-V2-06） |
| 2 | 档案视图与 V2-1 命令投影的复用边界 | 归 plan |

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（随父 Feature 立项；承载父 spec FR-V2-050~056；P1 后段；含 delay 消歧红线文案） | 2026-09-13 | SDDU Spec Agent |
