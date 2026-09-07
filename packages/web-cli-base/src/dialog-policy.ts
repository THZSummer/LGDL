/**
 * dialog-policy.ts —— 对话框应答策略纯匹配（TASK-006，FR-017/ADR-007，node 可测）。
 *
 * 规则 = {类型 × 文本/URL glob pattern → 动作 accept/dismiss/promptText}。
 * 缺省保守（EC-005）：alert → accept（记录即返回，无阻塞）；confirm/prompt 无匹配 → dismiss
 * （返回否定值）+ 事件 + 审计。误确认护栏（EC-006）：DESTRUCTIVE_PATTERNS 破坏性文案命中
 * 且无显式 trusted accept 规则命中 → 永不自动 accept。prompt 自动输入仅 trusted 规则
 * 显式提供 text 时生效（FR-017）。本文件纯逻辑，零 DOM/lgdl/react import（NFR-001）。
 */
import type { PlatformDialogRuleSpec } from './platform.js';

/** 对话框类型（页面 JS 模态框同 realm override 可达面）。 */
export type DialogType = 'alert' | 'confirm' | 'prompt';

/** 应答动作。 */
export type DialogAction = 'accept' | 'dismiss' | 'promptText';

export interface DialogContext {
  type: DialogType;
  /** 对话框文本（脱敏前原文 —— 策略匹配在页面侧原文上进行；审计/事件面用脱敏摘要）。 */
  text: string;
  /** 对话框触发页 URL（glob 匹配位）。 */
  url?: string;
  /** 是否 trusted 上下文（显式 trusted accept 规则放行条件；缺省 false）。 */
  trusted?: boolean;
}

export interface DialogDecision {
  action: DialogAction;
  /** promptText 应答文本（仅 trusted 规则显式提供时）。 */
  text?: string;
  /** 命中规则描述（审计/帮助；无敏感文本）。 */
  by: string;
}

/** 误确认护栏破坏性词元（中英；删除/覆盖/清除/提交类，EC-006）。 */
export const DESTRUCTIVE_PATTERNS: readonly string[] = [
  'delete', 'remove', 'clear', 'overwrite', 'submit', 'confirm delete', 'permanently',
  'reset', 'erase', 'destroy', 'terminate', 'drop table', 'truncate', 'unlink',
  '删除', '覆盖', '清除', '提交', '确认删除', '永久', '移除', '重置', '销毁', '注销', '清空', '放弃更改',
];

/** 破坏性文案判定（大小写不敏感；保守取向宁可拦不可误放）。 */
export function isDestructiveText(text: string): boolean {
  const t = text.toLowerCase();
  return DESTRUCTIVE_PATTERNS.some((p) => t.includes(p.toLowerCase()));
}

/** 单规则是否命中上下文（类型 + 文本/URL glob）。 */
export function ruleMatches(rule: PlatformDialogRuleSpec, ctx: DialogContext): boolean {
  if (rule.type !== ctx.type) return false;
  if (rule.pattern !== undefined && rule.pattern !== '') {
    const p = rule.pattern.toLowerCase();
    const hitText = ctx.text.toLowerCase().includes(p);
    const hitUrl = ctx.url !== undefined && ctx.url.toLowerCase().includes(p);
    if (!hitText && !hitUrl) return false;
  }
  return true;
}

/**
 * 应答决策（纯逻辑；FR-017/ADR-007）：
 *   ① 缺省保守三路：alert → accept（记录即返回）；confirm/prompt 无匹配 → dismiss（否定值）。
 *   ② 显式规则命中：动作按规则；promptText 仅 trusted 规则生效（untrusted promptText 忽略 → dismiss）。
 *   ③ 误确认护栏（EC-006）：破坏性文案 + 动作 accept 的规则**非 trusted 显式** → deny-accept（改 dismiss）。
 * 规则命中优先级 = 规则顺序首个命中（场景显式 trusted accept 规则须置于缺省前）。
 */
export function resolveDialogAction(rules: PlatformDialogRuleSpec[], ctx: DialogContext): DialogDecision {
  // ① 显式规则集命中（顺序首个）
  for (const rule of rules) {
    if (!ruleMatches(rule, ctx)) continue;
    if (rule.action === 'accept') {
      // EC-006 护栏：破坏性文案 + accept 规则 —— 须 trusted 规则显式命中才放行
      if (isDestructiveText(ctx.text) && rule.trusted !== true) {
        return { action: 'dismiss', by: `护栏 deny-accept：破坏性文案命中（规则 ${rule.type} 非 trusted，EC-006）` };
      }
      return { action: 'accept', by: `规则命中 accept（${describeRule(rule)}）` };
    }
    if (rule.action === 'dismiss') {
      return { action: 'dismiss', by: `规则命中 dismiss（${describeRule(rule)}）` };
    }
    if (rule.action === 'promptText') {
      // prompt 自动输入仅 trusted 规则显式提供 text 生效（FR-017）
      if (ctx.type === 'prompt' && rule.trusted === true && rule.text !== undefined) {
        return { action: 'promptText', text: rule.text, by: '规则命中 promptText（trusted）' };
      }
      return {
        action: 'dismiss',
        by: rule.trusted === true ? 'promptText 规则缺 text → dismiss（无输入可答）' : 'promptText 规则非 trusted → 忽略 dismiss（FR-017）',
      };
    }
  }
  // ② 缺省保守三路（EC-005）
  if (ctx.type === 'alert') return { action: 'accept', by: '缺省保守：alert 记录即返回（无阻塞）' };
  return { action: 'dismiss', by: '缺省保守：confirm/prompt 无匹配 → dismiss（否定值，EC-005）' };
}

function describeRule(rule: PlatformDialogRuleSpec): string {
  return `${rule.type}${rule.pattern ? ` pattern=${rule.pattern}` : ''}${rule.trusted ? ' trusted' : ''}`;
}

/** 策略帮助说明（help/AskDialog 复用）。 */
export const DIALOG_POLICY_NOTE =
  '对话框应答缺省保守（FR-017/ADR-007）：alert 记录即返回；confirm/prompt 无匹配规则 → dismiss（否定值）；' +
  '破坏性文案（删除/覆盖/清除/提交类）无显式 trusted accept 规则 → 永不自动 accept（EC-006）；' +
  'prompt 自动输入值仅 trusted 规则显式提供时生效。';
