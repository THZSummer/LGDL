/**
 * V5.5-2 **TASK-V55-207 / 208** (ADR-V55-007 §1/§6 · FR-SELF-042/044/048 · AC-SELF-007 ·
 * R-SELF-905) — the **确定性引导流**：**恰 4 步、恰一处声明**（识别 → 引导 → 采集 → 完成）。
 *
 * ── 为什么是「声明单源」而不是给引导写一条新流程 ───────────────────────────────
 *
 * 主题① 的逐字要求是「**由系统代码流程**驱动用户去配置 LLM」⇒ 零 LLM 调用、同输入同路径、
 * 可机核。因此引导本身**不新造任何执行面**：四个步骤全部**复用既有的唯一载体**——
 *
 *   | 步 | 可判断据 | 复用的既有载体（零第二实现） |
 *   |---|---|---|
 *   | ① `detect`  | `llm.unconfigured` 事实成立（主动识别 ∨ 被动观测） | `noteLlmBlockedFact` + 既有 `risk: llmBlocked` |
 *   | ② `guide`   | 流内出现 `[data-op="op.llm-config"]` **op-direct chip** | 既有 `llm.unconfigured` provider + `OPS_RECOVERY_ROWS` |
 *   | ③ `collect` | 既有三段 params 序列 `choice → text → secret` | **既有** `OP_PARAM_SEQUENCE['op.llm-config']` |
 *   | ④ `complete`| `op.llm-config` 成功回执（**回执在前**）+ 悬置续接（**续接在后**） | 既有 receipt 单源 + `suspension.ts#resumeSuspension` |
 *
 * `src/**` 里这四步**只在这里声明一次**：门禁从本文件的源文本抽取 `id` 序列并逐项核
 * `evidence` / `carrier`（删任一步 ⇒ FAIL；顺序错 ⇒ FAIL）。采集段的**条数**不在这里
 * 再写一份——它读 `OP_PARAM_SEQUENCE` 的既有单源（第二份序列 ⇒ FAIL）。
 *
 * ── 不跳走（法六不破）──────────────────────────────────────────────────────
 *
 * 引导**全程在流内闭环**：零视图切换、零 `#open-settings` 调用、零 `location` 变更。设置
 * 面保留**管理**职责（同一 `op.llm-config` 执行体，ADR-V55-005 §3），但引导不把人送过去。
 *
 * @module ui/sidepanel/next-registry/onboarding-flow
 */
import { OP_PARAM_SEQUENCE } from './ops.js';
import { blockedTerminalOf } from './providers.js';

/** 配置执行体（**唯一**）——`op.llm-config`；引导的 chip 与设置面是同一个 op。 */
export const ONBOARD_CHIP_OP = 'op.llm-config';

/**
 * ① / ② 的可判断据 = **该 op 所修复的阻塞终态**（从唯一双射行反查，**零第二字面量**：
 * 阻塞态字符串只允许出现在 `definition.ts` 声明 + `providers.ts` 双射点，BT-1 红线）。
 */
const DETECT_EVIDENCE = blockedTerminalOf(ONBOARD_CHIP_OP) ?? '';

/** ① detect 的流内事实行（零明文：不提凭据、不含任何值）。 */
export const ONBOARD_DETECT_TEXT = '未配置 LLM：不需要重说一遍，由系统流程带你完成配置（本机写入 · 掩码 · 零明文）';

/** ④ complete 的续接留痕（悬置任务自动接上时的一行事实）。 */
export const ONBOARD_RESUME_TEXT = '配置完成：已自动接上你刚才那句话（无需重说）';

/** 失效出口的固化文案（EC-SELF-011：**不制造假成功**，但必须仍有可走的一步）。 */
export const ONBOARD_INVALIDATED_TEXT = '原任务已失效（站点或会话已变）：下方给出可走的一步';

/**
 * **恰 4 步**（顺序 = 数组顺序；每步的 `evidence` / `carrier` 是可机核契约）。
 * `Object.freeze` 保证运行期不可被追加第 5 步（门禁另有注入反证）。
 */
export const ONBOARD_STEPS = Object.freeze([
  { id: 'detect', evidence: DETECT_EVIDENCE, carrier: 'system-row' },
  { id: 'guide', evidence: DETECT_EVIDENCE, carrier: 'nextstep-card', chip: ONBOARD_CHIP_OP },
  { id: 'collect', evidence: 'op.llm-config:params', carrier: 'ask-cards', reuse: 'OP_PARAM_SEQUENCE' },
  { id: 'complete', evidence: 'op.llm-config:receipt(ok=true)', carrier: 'system-row + resume' },
] as const);

export type OnboardStepId = (typeof ONBOARD_STEPS)[number]['id'];

/** 采集段的步骤数：**从既有单源读**（第二份序列 ⇒ FAIL）。 */
export const ONBOARD_COLLECT_STEPS = OP_PARAM_SEQUENCE[ONBOARD_CHIP_OP]?.length ?? 0;

/** 步骤 id 的声明顺序（门禁与调用方共用，不手写第二份）。 */
export const ONBOARD_STEP_IDS: readonly OnboardStepId[] = Object.freeze(ONBOARD_STEPS.map((s) => s.id));

/** 一步的序号（0-based；未知 id ⇒ -1，**不静默回落**）。 */
export function onboardStepIndex(id: string): number {
  return ONBOARD_STEP_IDS.indexOf(id as OnboardStepId);
}
