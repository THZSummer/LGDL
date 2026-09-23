/**
 * V5.5F-1 **TASK-V55F-118 / 119 / 120** (ADR-SGO-003 §1/§2/§4/§7 · FR-SGO-030~038 ·
 * AC-SGO-007/022/025 · R-SGO-904/913) — **`--ref <n>` 引用锚定包装层**.
 *
 * ── 题眼（根因 C/D/E/F）────────────────────────────────────────────────────────
 *
 * base `dom` 工具**零 `ref` 参数**（只认 `--selector`/`--text`），而锚点其实**已存在**：
 * `content/ref-capture.ts` 在捕获时把 `data-wcli-ref = refId` 写在**单一节点**上
 * （best-effort）。跨进程断层（面板持引用表 / 工具调用在 SW）使「用户指的是哪一处」
 * 对写命令**物理不可见** —— 写错节点（R-SGO-004）因此是高危面。
 *
 * 本模块是 **plugin 侧条目包装**（`chrome-host.ts#wrapChromeEntryForHost` 先例）：
 *   · 覆写 `schema`（新增 `--ref`，仅 `set-text` 生效）；**零新子命令**（`--ref` 是参数）；
 *   · 替换 `executor`：解析 `--ref` → **合成锚** `[data-wcli-ref="ref_n"]` → **live 单节点闸**
 *     → **交基线 `baseExecutor`**（锚定通过后与既有路径逐字同形）；
 *   · `risk` / `subcommandRisks` **逐字段 spread 自 base，永不放宽**（FR-SGO-032 / R-SGO-904）。
 *
 * ── fail-closed 且非静默（EC 家族，逐条可判）──────────────────────────────────
 *
 * | EC | 场景 | 处理 |
 * |---|---|---|
 * | **EC-SGO-001** | 0 命中 | 可读错误（引用锚定失败：目标不存在）+ 指引；**不回退 `--selector`** |
 * | **EC-SGO-002** | 多命中（≥2） | 拒绝锚定（`nodeCount !== 1` 即失配）+ 显式报告命中数；**不按首元素** |
 * | **EC-SGO-003** | `data-wcli-ref` 标记缺失 / 页面侧不可达 | 非静默：报告「引用标记不可用」+ 指引；不静默改用语义路径 |
 * | **EC-SGO-004** | 引用已失效（`refState !== 'valid'`） | fail-closed；**不沿用失效引用的选择器** |
 * | **EC-SGO-015** | `--ref` 与 `--selector` 同给 | **显式错误**（不静默择一） |
 * | **EC-SGO-016** | `--ref n` 越界（本回合引用表内不存在） | fail-closed + 非静默 |
 * | **EC-SGO-017** | `--ref` 用在读命令（非 `set-text`） | 本阶段不支持（NG-SGO-010 / PD-SGO-001）⇒ 显式错误 |
 *
 * ── 零触碰（FR-SGO-037 / N-SGO-008）────────────────────────────────────────────
 *
 * 包装层是**工具条目层**：不触达 `src/security/policy.ts` / `auto-authorize.ts`，
 * 不入 `packages/web-cli-base/**`（N-SGO-007）。
 *
 * ── 口径显式登记（R-SGO-913）──────────────────────────────────────────────────
 *
 * live 单节点闸是**每写一次**的只读身份观测（`observeIdentity` 单一实现），**不是**
 * 「每回合一次只读重观测」（NG-SGO-013 / NFR-SGO-008 面向「引用注入」面）。
 *
 * @module tools/dom-anchor
 */
import type { PlatformEnv, ToolCallArgs, ToolEntry, ToolResult } from '@lgdl/web-cli-base';
import { observeIdentity } from '../background/ref-observe.js';
import { refTurnHolder } from '../background/ref-turn.js';

/** 锚点属性名（与 `content/ref-capture.ts#REF_MARK_ATTR` 同值 —— 页面侧的单一铸造点）。 */
export const REF_MARK_ATTR = 'data-wcli-ref';

/** 本阶段**唯一**落地 `--ref` 的子命令（FR-SGO-035 / §6）。 */
export const REF_ANCHOR_SUBCOMMAND = 'set-text';

/** `refId` ⇒ 合成锚选择器（**恰一处**铸造；与 chip 文案「用引用 N 做…」同词汇）。 */
export function anchorSelectorFor(refNum: number): string {
  return `[${REF_MARK_ATTR}="ref_${refNum}"]`;
}

/** 锚定失败的可读错误（`ToolResult`；`ok: false` ⇒ 走既有失败渲染面，零新 kind）。 */
function anchorFailure(error: string): ToolResult {
  return { ok: false, output: error, error };
}

/** 逐条 EC 的可读文案（含指引；**零用户内容值**）。 */
export const ANCHOR_ERRORS = Object.freeze({
  onlySetText:
    '引用锚定失败（EC-SGO-017）：`--ref <n>` 本阶段仅支持 `dom set-text`（写命令）。' +
    '读命令请改用 `--selector`；如需按引用读取，请先拾取目标再查看引用证据。',
  mutualExclusive:
    '引用锚定失败（EC-SGO-015）：`--ref <n>` 与 `--selector` 互斥（不静默择一）。' +
    '请二选一 —— 按引用锚定用 `--ref <n>`，按选择器锚定用 `--selector`。',
  lexical:
    '引用锚定失败：引用序号须为正整数（`--ref <n>`，n ≥ 1）。' +
    '序号与引用 chip 上的编号一致；请输入引用序号后重试。',
  outOfRange:
    '引用锚定失败（EC-SGO-016）：引用序号不存在于本回合的引用范围。' +
    '请在页面上重新拾取目标以建立新的引用，或改用 `--selector`。',
  staleRef:
    '引用锚定失败（EC-SGO-004）：该引用已失效，不得沿用它的选择器。' +
    '请在页面上重新拾取目标以建立新的引用，或改用 `--selector`。',
  notFound:
    '引用锚定失败（EC-SGO-001）：目标不存在（引用标记在该页面 0 命中）。' +
    '目标可能已被移除或在页面重渲染后断链 —— 请重新拾取，或改用 `--selector`。',
  nodeCountMismatch:
    '引用锚定失败（EC-SGO-002）：目标不唯一（引用标记命中多个节点）。' +
    '引用锚定要求恰 1 个节点，**不按首元素**执行 —— 请重新拾取该目标，或改用 `--selector`。',
  markMissing:
    '引用锚定失败（EC-SGO-003）：引用标记不可用（`data-wcli-ref` 缺失 / 页面侧不可达）。' +
    '页面可能在重渲染（SPA / 框架接管）后丢失标记 —— 请重新拾取，或改用 `--selector`。',
} as const);

/** 越界命中的**显式**命中数（EC-SGO-002 要求显式报告）。 */
function mismatchText(nodeCount: number): string {
  return `${ANCHOR_ERRORS.nodeCountMismatch}（实测命中 ${nodeCount} 个节点）`;
}

/** 解析链的判定视图（纯数据；门禁可对判据本体注入反证）。 */
export interface AnchorResolution {
  readonly ok: boolean;
  /** 锚定通过后交给**基线 executor** 的选择器（合成锚）。 */
  readonly selector?: string;
  /** 锚定引用序号（路 A）。 */
  readonly refNum?: number;
  readonly error?: string;
}

/**
 * **解析链**（ADR-SGO-003 §2，逐级 fail-closed）。纯函数 + 注入式观测 ⇒ node 可测、
 * 门禁可对每一级注入反证（不依赖真 `chrome.*`）。
 *
 * 任一级失败 ⇒ 返回 `{ ok: false, error }`（可读 + 指引）；**绝不**静默回退
 * `--selector` / **绝不**按首元素（FR-SGO-034）。
 */
export async function resolveRefAnchor(
  tc: ToolCallArgs,
  deps: {
    readonly refs: readonly { readonly refNum: number; readonly refId: string; readonly refState: string; readonly selector: string }[];
    readonly observeTarget: { readonly tabId?: number; readonly observe?: (tabId: number, selector: string) => Promise<{ status: string; refMark?: string; nodeCount?: number } | undefined> } | undefined;
  },
): Promise<AnchorResolution> {
  const refArg = String(tc.args?.ref ?? '').trim();
  if (refArg.length === 0) return { ok: false, error: '' }; // 未给 --ref ⇒ 调用方走既有路径
  // ① 仅 `set-text`（EC-SGO-017）。
  if (tc.subcommand !== REF_ANCHOR_SUBCOMMAND) return { ok: false, error: ANCHOR_ERRORS.onlySetText };
  // ② 与 `--selector` 互斥（EC-SGO-015）。
  if (String(tc.args?.selector ?? '').trim().length > 0) return { ok: false, error: ANCHOR_ERRORS.mutualExclusive };
  // ③ 词法：正整数（不含 0 / 小数 / 前导零之外的形态）。
  if (!/^[1-9]\d*$/.test(refArg)) return { ok: false, error: ANCHOR_ERRORS.lexical };
  const refNum = Number(refArg);
  // ④ 查**当前回合快照**（SW 单源）；越界 ⇒ EC-SGO-016。
  const ref = deps.refs.find((r) => r.refNum === refNum);
  if (!ref) return { ok: false, error: ANCHOR_ERRORS.outOfRange };
  // ⑤ 失效引用不入范围（EC-SGO-004）—— 不沿用它的选择器。
  if (ref.refState !== 'valid') return { ok: false, error: ANCHOR_ERRORS.staleRef };
  // ⑥ 合成锚。
  const selector = anchorSelectorFor(refNum);
  // ⑦ live 单节点闸：`nodeCount === 1` 为**唯一**通过条件（AC-SGO-022）。
  const target = deps.observeTarget;
  if (!target || target.tabId === undefined || !target.observe) return { ok: false, error: ANCHOR_ERRORS.markMissing };
  const seen = await target.observe(target.tabId, selector);
  if (!seen) return { ok: false, error: ANCHOR_ERRORS.markMissing };
  if (seen.status === 'invalid-selector') return { ok: false, error: ANCHOR_ERRORS.markMissing };
  if (seen.status === 'missing') return { ok: false, error: ANCHOR_ERRORS.notFound };
  if (seen.status === 'ambiguous') return { ok: false, error: mismatchText(seen.nodeCount ?? 0) };
  if (seen.status !== 'resolved' || seen.nodeCount !== 1) return { ok: false, error: mismatchText(seen.nodeCount ?? 0) };
  // ⑧ 身份一致（标记必须 = refId；缺失/不等 ⇒ 标记不可用，EC-SGO-003）。
  if (seen.refMark !== ref.refId) return { ok: false, error: ANCHOR_ERRORS.markMissing };
  return { ok: true, selector, refNum };
}

/**
 * **包装层**（TASK-V55F-118 / 119）：覆写 `schema` + 替换 `executor`；`risk` /
 * `subcommandRisks` 及全部既有字段**逐字段 spread 自 base** —— 本函数**不出现**
 * `risk` / `subcommandRisks` 字面量（门禁按此判「不放宽」，R-SGO-904）。
 */
export function wrapDomEntryForAnchor(entry: ToolEntry, _env: PlatformEnv): ToolEntry {
  const baseExecutor = entry.executor;
  const params = entry.schema.parameters as { properties?: Record<string, unknown> } & Record<string, unknown>;
  return {
    ...entry,
    // schema 覆写：**仅新增** `ref` 参数（`--ref` 是参数，不是子命令 ⇒ `SUBCOMMANDS` 不动）。
    schema: {
      ...entry.schema,
      parameters: {
        ...params,
        properties: {
          ...(params.properties ?? {}),
          ref: {
            type: 'string',
            description:
              '引用序号（`--ref <n>` → `[data-wcli-ref="ref_n"]`）：把写入锚定到本次拾取的引用目标；' +
              '仅 `set-text` 生效，与 `--selector` 互斥。失配 / 失效一律 fail-closed（可读错误 + 指引）。',
          },
        },
      },
    },
    executor: async (tc, ctx) => {
      const refArg = String(tc.args?.ref ?? '').trim();
      if (refArg.length === 0) return baseExecutor(tc, ctx); // 未给 --ref ⇒ 既有路径逐字不变
      const resolved = await resolveRefAnchor(tc, {
        refs: refTurnHolder.refs(),
        observeTarget: refTurnHolder.observeTarget(),
      });
      if (!resolved.ok) return anchorFailure(resolved.error ?? ANCHOR_ERRORS.markMissing);
      // 锚定通过 ⇒ **交基线 executor**（去掉 `ref` 参数，注入合成锚选择器）。
      const { ref: _ref, ...rest } = tc.args;
      void _ref;
      return baseExecutor({ ...tc, args: { ...rest, selector: resolved.selector as string } }, ctx);
    },
  };
}

/** 只读观测缝的默认绑定（生产路径；门禁可注入假观测）。 */
export const defaultObserver = observeIdentity;
