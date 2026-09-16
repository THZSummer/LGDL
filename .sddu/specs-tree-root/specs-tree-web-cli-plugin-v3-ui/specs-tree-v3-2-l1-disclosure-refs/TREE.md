# Directory: .sddu/specs-tree-root/specs-tree-web-cli-plugin-v3-ui/specs-tree-v3-2-l1-disclosure-refs/

## 目录简介
父问题的第三面：**五类高后果信息与普通信息同密度并列、无永不折叠常驻位**（Q-UI-003）。E 稿的处理方式是「**就地展开**」：与当前任务强相关...

## 目录结构
```
specs-tree-v3-2-l1-disclosure-refs/
├── TREE.md          # 本文件 - 目录导航
├── build.md         # 构建报告（§9 修复轮 V3-VOL-1；§10 修复轮 R2：F-01 + 元门禁 + I-01~I-10；§11 **收口轮**：validate R1 的 N-01~N-13 处置）
├── plan.md          # 技术计划：specs-tree-v3-2-l1-disclosure-refs（V3-2 L1 就地展开与引用 / 回执）
├── review.md        # 审查清单（C1~C38 + 五维度 + 门禁可失败性专项）
├── review-report.md # 审查报告 R1（有条件通过 0 阻塞；F-01 跨叶真缺陷；I-01~I-10；§15 收口轮回填指针）
├── spec.md          # Feature Specification：specs-tree-v3-2-l1-disclosure-refs（V3-2 L1 就地展开与引用 / 回执）
├── state.json          # 状态文件 (🟢 tracked [validated]；含 closeoutRound 收口记录)
├── tasks.json          # 任务清单 (机器可读)
├── tasks.md          # 任务分解：specs-tree-v3-2-l1-disclosure-refs（V3-2 L1 就地展开与引用 / 回执）
├── validate.md       # 验证策略（V1~V18 场景矩阵 + 独立复现原则 + 对照基线 C-1~C-14）
└── validate-report.md # 验证报告 R1（⚠️ 有条件通过 0 阻塞；独立复现成立；新发现 N-01~N-13 → 收口轮全部处置）
```

## 文件说明
| 文件 | 说明 | 状态 |
|------|------|------|
| plan.md | 技术计划：specs-tree-v3-2-l1-disclosure-refs（V3-2 L1 就地展开与引用 / 回执） — type RefVerdict = 'valid' | 'invalid' | 'unknown'; | ✅ 存在 |
| spec.md | Feature Specification：specs-tree-v3-2-l1-disclosure-refs（V3-2 L1 就地展开与引用 / 回执） — 父问题的第三面：**五类高后果信息与普通信息同密度并列、无永不折叠常驻位**（Q-UI-003）。E 稿的处理方式是「**就地展开**」：与当前任务强相关... | ✅ 存在 |
| state.json | 状态文件（含 files.build/review/reviewReport/validate/validationReport 登记 + `closeoutRound` 收口记录） | 🟢 tracked [validated] |
| tasks.json | 任务清单（机器可读） | ✅ 存在 |
| build.md | 构建报告：10 任务 / 6 波实施记录 + §9 修复轮（裁决 V3-VOL-1：撤销自加 cap → 四条替代守卫；逐断言反证 RP-L1-A~H）+ **§10 修复轮 R2**（F-01 门禁不可 FAIL 的四条修复与实跑验收 + 新增元门禁 `test/gate-integrity.test.ts` + I-01~I-10 逐条处置；全门禁串行复跑至绿 760/11/127/157/99/167/108/192/24/e2e/6）+ **§11 收口轮**（validate R1 的 N-01~N-13 处置：元门禁三处盲区自修 / N-04~N-11 修实现与文档 / N-12 扫目录推导 / N-06 收敛到 v3-4；体积显式重登记 327,679 → 328,476 B（ceiling 344,899）；门禁 13/13 绿 **764/11/127/157/103/167/108/192/24/9/e2e**） | ✅ 存在 |
| review.md | 审查清单（C1~C38 + 五维度 + 门禁可失败性专项） | ✅ 存在 |
| review-report.md | 审查报告 R1（结论：**有条件通过、本叶 0 阻塞**；F-01 跨叶真缺陷；I-01~I-10） | ✅ 存在 |
| tasks.md | 任务分解：specs-tree-v3-2-l1-disclosure-refs（V3-2 L1 就地展开与引用 / 回执） — Wave 1 ── 无依赖，4 路并行写入（文件不相交，纯函数/纯数据模块） | ✅ 存在 |
| validate.md | 验证策略：V1~V18 自主验证场景矩阵（五维度）+ 独立复现原则（自写口径 / 自写 CDP 与夹具驱动 / 独立反证 / 逐字节还原）+ 对照基线 C-1~C-14 | ✅ 存在 |
| validate-report.md | 验证报告 **R1**：⚠️ **有条件通过（0 阻塞）** —— F-01 独立证伪（`EXIT=1` + 诊断 976 B）、密度自写口径 21 格逐格相等、fail-closed 12 次不确定场景全阻断 + 41 控件穷举零放行、台账自写逐行审计、门禁串行 13/13；新发现 **N-01~N-13**（→ 2026-09-16 收口轮逐条处置，见 `build.md §11`） | ✅ 存在 |

## Feature 状态
| 字段 | 值 |
|------|-----|
| Feature ID | N/A |
| Phase | 实施构建→审查→验证（5/7 → 6/7 → **7/7**）；**2026-09-16 收口轮保持 `phase=validated`**（处置 validate R1 的 N-01~N-13，收口非新阶段） |
| Status | 🟢 tracked [validated] |

## 上级目录
- [返回上级](../TREE.md)
- [返回首页](../../TREE.md)
