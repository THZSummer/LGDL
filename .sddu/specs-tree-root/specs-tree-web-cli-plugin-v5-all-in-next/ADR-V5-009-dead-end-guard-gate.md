# ADR-V5-009: 死端守护门禁（阻塞态枚举 + N=0 机核 + 双向反证）

## 状态
ACCEPTED

## 背景

真机断流现场（23:12:51~23:12:59，逐字）：

```
23:12:51 下一步推荐：重新绑定当前标签页 / 重新拾取 / 改用描述
23:12:57 ✓ 已重新绑定当前标签页：https://open.bigmodel.cn
23:12:59 ✖ 页面侧不可用：未授权站点 https://open.bigmodel.cn：页面侧零注入
```

四层根因（spec §2.2）：R1 授权 chip 只在 `firstRun`（`recommend.ts:296-307` 谓词含 `firstRun`）；R2 `RECOVERY_CHIP_ORDER.site = ['rebind','repick','describe']` **无 `authorize`**；R3 `error` 行零 chip（`cards/error.ts:1-27`）；R4 结果 = **死端**。⇒ 「阻塞终态之后流内零可达 next」在现状**可复现且不可回归**（Q-ALLN-008）。

FR-ALLN-010 要求阻塞终态 5 类**唯一声明源**；FR-ALLN-011 要求任一阻塞终态出现后 **N = 0 秒内**（同屏紧随）流内必有可达 next；FR-ALLN-015 要求门禁**双向**变红。

## 选项

| 选项 | 形态 | 优点 | 缺点 |
|---|---|---|---|
| **A 单一枚举源 + 双形态判据（行内 chip ∨ 紧随 nextstep 卡）+ 双向注入**（选） | `BLOCKED_TERMINALS` 唯一常量；门禁从源文本抽取 + Chromium 逐类驱动 | 判据可 FAIL 可反证；新增阻塞态自动纳入 | 5 类需可 headless 驱动（binding.stale / ref.all-invalid 需 seam） |
| B 只做「S2 场景」单点回归 | 实现最省 | 只覆盖未授权一类 ⇒ 其余 4 类死端复发不可发现；违 FR-ALLN-010/011 |
| C 用「推荐器有候选」静态断言代替流内可达性 | 无需 Chromium | **假判据**：候选存在 ≠ 流内 chip 可达（真机断流正是候选存在而死端） |

## 决策

**采用 A**。

### 1. 阻塞态枚举单源（v5-1 交付）

- `next-registry/definition.ts`：`BLOCKED_TERMINALS = Object.freeze(['site.unauthorized','llm.unconfigured','perm.missing','binding.stale','ref.all-invalid'] as const)`（**恰 5 项**）。
- 「声明恰一次」扫描（NFR-ALLN-004）：`src` 中该 5 字符串的**字面量**只允许出现在 `definition.ts`；其余位置必须从常量派生。反证：在别处写第二个字面量 ⇒ FAIL。
- 每个阻塞类 ↔ 一个 P0 恢复 provider（ADR-V5-001 的迁移表）。

### 2. 「N = 0 内 next 存在」的**机器化判定**

阻塞卡（或 ✖ 行）渲染后，**同一渲染帧内**（`dispatch → render()` 同步，无定时器）：

```
nextOf(el) =
    el.querySelector('[data-op]')                                  // 形态① 行内 next chip
  ?? 后续同场景可见兄弟中「最近的」[data-msg-type="nextstep"]
      且其内部 querySelector('[data-op]') 非空                      // 形态② 紧随 nextstep 卡
deadEnd(el) = nextOf(el) === null
```

- 判据：对 5 类阻塞态**逐类**断言 `deadEnd === false`；**死端 = 0**（同屏扫描：`#stream` 内所有阻塞卡 `deadEnd` 全为 false）。
- **N = 0** 的实现口径：门禁在 `await` 阻塞态的状态派发之后**立即**断言（不 poll、不 sleep），因为面板渲染是同步的（`sidepanel.ts:2224 dispatch → render()`）；若某类需异步（如 probe 恢复）则该类断言点后移到其状态派发之后，仍要求**同屏**（无新阻塞卡插入期间）存在 next。

### 3. 5 类阻塞态的 headless 驱动路径

| 阻塞类 | headless 驱动 |
|---|---|
| `site.unauthorized` | 绑定未授权 origin（既有 binding seam） |
| `llm.unconfigured` | 清空 key-store（`clearLlm` 等价） |
| `perm.missing` | 授权 origin + 未授予可选能力 |
| `binding.stale` | 注入 `site.bindingStale = true` 的 state 载荷（v5-1 提供 provider；seam 由既有 `state` 消息承载） |
| `ref.all-invalid` | 驱动全部引用 stale（既有 ref seam） |

### 4. 双向注入反证（FR-ALLN-015 / 121）

- ① **新增阻塞态却无 next**：向 `BLOCKED_TERMINALS` 注入第 6 项（无对应 provider）⇒ 门禁 FAIL；
- ② **已有 next 被删**：移除某阻塞 error 卡的铸造期 `recovery`（ADR-V5-002）⇒ 门禁 FAIL；
- 两者随后**逐字节还原** ⇒ PASS（记录 sha256 前后相同）。
- 判据纳入 `test:gate-integrity` 受审集合（`test:gate-integrity ≥13` 只增）。

### 5. S2 全链首验收（v5-2 主验收，AC-ALLN-001）

`no-dead-end.mjs` 复用 S2 全链：绑定 → 探测 → 未授权 → ✖ 阻塞 → 授权 next 产出 → auth 卡 → execute → ✓ 回执 → 探测恢复 → 拾取 next 产出；断言死端 = 0；**浏览器原生权限弹窗体感入人工面**（EC-ALLN-007，`⏳`/`PASS` 不得冒充）。

## 后果

**正面**：死端 = 0 可机核；5 类阻塞逐类护栏；新增阻塞态自动纳入（枚举单源）；真机 S2 断流不再复发且可回归。

**代价 / 风险**：新增 Chromium 门禁 `test/ui/no-dead-end.mjs`（必须**串行**跑，一次一个 Chromium，N13）；`binding.stale` / `ref.all-invalid` 的驱动需要 seam（若 seam 不足，须回到 v5-1 补 provider 的可注入 `when(ctx)`，不得以人工判据替代）。R-ALLN-014 残余（弹窗人工面）显式登记。

## 影响 FR

FR-ALLN-010 / 011 / 012 / 014 / 015 / 016 / 013；EC-ALLN-005 / 006 / 013；N22；AC-ALLN-001 / 002 / 021。

## 回滚

`no-dead-end.mjs` 为新增 ⇒ 回滚 = 删除门禁文件 + 从 `gate-integrity` 受审集合移除该条（逐行）。`BLOCKED_TERMINALS` 常量保留（它是 v5-1 的注册表基础，与门禁解耦）。**不动**任何既有门禁。
