/**
 * events-tools.ts —— events 事件订阅/拉取工具（TASK-005，EVT FR-008~015 + ADR-005）。
 *
 * 顶层 `events` 工具（group=observe）：11 子命令承载事件 push/订阅通道工具面 ——
 *   subscribe（--kind dom|lifecycle|console|network|paste|dialog + 过滤 + 预算 + --sensitive）
 *   / unsubscribe / list / pause / resume / clear / pull（--lastId/--max 增量）
 *   / pull-sensitive（明细，risk 'write' + 显式 --trusted true + ask）
 *   / status / budget / switch（全局通道开关，FR-014）。
 *
 * 语义落位（ADR-005）：
 *   - FR-009「dom observe」= `events subscribe --kind dom`（帮助面显式别名标注，不新增 dom 子命令）；
 *     lifecycle/console/network/paste/dialog 同理 = kind 枚举。
 *   - 订阅过滤 = 事件类型（csv）∩ selector（css:/text= 语法面）∩ URL 模式（network/lifecycle）
 *     ∩ level 集（console）——glob 沿既有语义（hub 入口 busFilterMatch）。
 *   - 权限（FR-005/ADR-001）：entry risk='read' 底档 + subcommandRisks —— subscribe/list/status/
 *     pull → 'read'（观察只读子面，场景可免 ask）；unsubscribe/pause/resume/clear/budget/switch →
 *     'state'（缺省 ask）；pull-sensitive → 'write'（敏感明细 trusted+ask，决策入审计）。
 *   - untrusted 双闸（v3 page-eval 先例）：pull-sensitive 明细声明需显式 `--trusted true`；
 *     subscribe `--sensitive true` 全程入审计；事件面明文细仅在观察源携带 sensitiveDetail 时
 *     经 pull-sensitive 通道供给（普通 pull 只见脱敏摘要）。注（改进 #3/C16）：真实浏览器内置
 *     观察源（platform-events）当前**零明文供给** —— 明文细仅测试/注入面可经该通道取回；确需
 *     cookie 值等明文细请走 `cookie read-detail --trusted true`（FR-006/030）。
 *   - 上下文预算（NFR-003/ADR-004）：pull 输出默认摘要 ≤ N（DEFAULT_BUDGETS.summaryN，--max 可配），
 *     大负载不整段进 output；事件负载统一面 {seq,ts,kind,type,target,text(masked),meta}。
 *
 * 局限声明（FR-015/NFR-004）：同 realm 观察；跨 realm/worker/非 JS 子资源不可达（NG-010/012）；
 * 不升级 isTrusted；被 stopImmediatePropagation 吞掉的事件不可承诺；整页导航后订阅失效（EC-001）。
 *
 * 本文件零 LGDL/react import（NFR-001）；预算值只引用 DEFAULT_BUDGETS 常量不硬编码（ADR-004）。
 */
import { DEFAULT_BUDGETS } from './event-bus.js';
import type { PlatformEnv, PlatformEventHub, PlatformObserveKind } from './platform.js';
import type { AuditSink } from './audit.js';
import { attributionHelpLines } from './ext-attribution.js';
import { redactUrlQuery } from './sensitive.js';
import type { ToolEntry, ToolContext, ToolResult } from './router.js';

/** events 子命令（11）。 */
export type EventsSubcommand =
  | 'subscribe'
  | 'unsubscribe'
  | 'list'
  | 'pause'
  | 'resume'
  | 'clear'
  | 'pull'
  | 'pull-sensitive'
  | 'status'
  | 'budget'
  | 'switch';

/** 11 子命令注册序（schema enum / help / executor 单一数据源）。 */
export const EVENTS_SUBCOMMANDS: EventsSubcommand[] = [
  'subscribe', 'unsubscribe', 'list', 'pause', 'resume', 'clear',
  'pull', 'pull-sensitive', 'status', 'budget', 'switch',
];

/** 观察 kind 枚举（schema/help）。 */
export const OBSERVE_KINDS: PlatformObserveKind[] = ['dom', 'lifecycle', 'console', 'network', 'paste', 'dialog'];

// ---------- 审计记录点（FR-007；字段无明文） ----------

function auditSubscribe(sink: AuditSink | undefined, subId: string, kind: PlatformObserveKind, sensitive: boolean): void {
  sink?.record({ type: 'subscribe', ts: Date.now(), tool: 'events', subId, subKind: kind, sensitive, detail: `订阅 ${kind} 观察${sensitive ? '（sensitive）' : ''}` });
}

function auditUnsubscribe(sink: AuditSink | undefined, subId: string, kind: PlatformObserveKind | undefined, delivered: number): void {
  sink?.record({ type: 'unsubscribe', ts: Date.now(), tool: 'events', subId, subKind: kind, count: delivered, detail: '退订事件订阅' });
}

function auditDelivery(sink: AuditSink | undefined, subId: string, kind: PlatformObserveKind | undefined, count: number, dropped: number): void {
  sink?.record({ type: 'event-delivery-summary', ts: Date.now(), tool: 'events', subId, subKind: kind, count, detail: `投递 ${count}${dropped > 0 ? ` · 丢弃 ${dropped}` : ''}` });
}

function auditDecision(sink: AuditSink | undefined, detail: string): void {
  sink?.record({ type: 'permission', ts: Date.now(), tool: 'events', decision: 'deny', reason: detail, by: 'untrusted-guard' });
}

// ---------- 参数解析 ----------

/** 正整数参数（--lastId/--max/--bufferLimit/--autoPause/--seq）。 */
function intArg(args: Record<string, string>, key: string, { nonNegative = true, min = 0 } = {}): { n?: number; error?: string } {
  const raw = args[key];
  if (raw === undefined || raw.trim() === '') return {};
  if (!/^\d+$/.test(raw)) return { error: `✖ events --${key} 需为非负整数（收到 "${raw}"）` };
  const n = Number(raw);
  if (n < min) return { error: `✖ events --${key} 需 ≥ ${min}（收到 "${raw}"）` };
  return nonNegative ? { n } : { n };
}

const csvList = (v: string | undefined): string[] | undefined => {
  if (v === undefined || v.trim() === '') return undefined;
  const out = v.split(',').map((s) => s.trim()).filter((s) => s !== '');
  return out.length > 0 ? out : undefined;
};

const flagTrue = (v: string | undefined): boolean => v === 'true';

// ---------- 执行器 ----------

/** events 工具执行器（hub 注入面 = env.events；未注入 → 通道不可用转译 EC-011）。 */
export async function executeEventsTool(
  hub: PlatformEventHub | undefined,
  subcommand: string,
  args: Record<string, string>,
  ctx?: ToolContext,
): Promise<ToolResult> {
  const audit = ctx?.services?.audit;
  if (!hub) {
    return {
      ok: false,
      output:
        '✖ 事件通道不可用（env.events 未注入）—— 事件订阅/观察仅在浏览器场景可用（node 面测试注入 fake hub）；' +
        '订阅注册后需 `events switch --on true` 开启全局通道（默认关 = 零常驻，FR-014）。',
      error: 'events hub not injected (EC-011)',
    };
  }
  if (!EVENTS_SUBCOMMANDS.includes(subcommand as EventsSubcommand)) {
    return {
      ok: false,
      output: `✖ events 未知子命令 "${subcommand}"（可用：${EVENTS_SUBCOMMANDS.join('/')}）`,
      error: 'unknown subcommand',
    };
  }

  try {
    switch (subcommand as EventsSubcommand) {
      case 'subscribe': {
        const kindRaw = (args.kind ?? '').trim();
        if (!(OBSERVE_KINDS as string[]).includes(kindRaw)) {
          return {
            ok: false,
            output: `✖ events subscribe 缺少/非法 --kind（可选 ${OBSERVE_KINDS.join('/')}；dom observe（FR-009）= events subscribe --kind dom）`,
            error: 'invalid kind',
          };
        }
        const kind = kindRaw as PlatformObserveKind;
        const sensitive = flagTrue(args.sensitive);
        const budget: { bufferLimit?: number; autoPauseAt?: number } = {};
        const bl = intArg(args, 'bufferLimit', { min: 1 });
        if (bl.error) return { ok: false, output: bl.error };
        if (bl.n !== undefined) budget.bufferLimit = bl.n;
        const ap = intArg(args, 'autoPause', { min: 1 });
        if (ap.error) return { ok: false, output: ap.error };
        if (ap.n !== undefined) budget.autoPauseAt = ap.n;
        const r = await hub.subscribe({
          kind,
          filter: {
            types: csvList(args.type),
            levels: csvList(args.level),
            urlPattern: args.url && args.url.trim() !== '' ? args.url.trim() : undefined,
            selector: args.selector && args.selector.trim() !== '' ? args.selector.trim() : undefined,
          },
          ...(bl.n !== undefined || ap.n !== undefined ? { budget } : {}),
          sensitive,
          label: args.label?.trim() || undefined,
        });
        if ('error' in r) return { ok: false, output: r.error, error: 'subscribe failed' };
        auditSubscribe(audit, r.subId, kind, sensitive);
        const filterNote = buildFilterNote(args);
        return {
          ok: true,
          output:
            `✓ 事件订阅已注册：${r.subId}（kind=${kind}${filterNote}${sensitive ? ' · sensitive=是（敏感订阅入审计；事件面明文细仅当观察源供给时经 pull-sensitive —— 真实浏览器内置源当前零明文供给 FR-006）' : ''}）。\n` +
            `下一步：events switch --on true（全局通道默认关 FR-014）→ 事件入缓冲 → events pull --subId ${r.subId} 增量取回；events status 看水位。` +
            (sensitive ? '\n注：确需 cookie 值等明文细请走 cookie read-detail --trusted true（FR-006/030）。' : ''),
        };
      }

      case 'unsubscribe': {
        const subId = args.subId ?? '';
        if (!subId) return { ok: false, output: '✖ events unsubscribe 缺少 --subId <订阅 id>' };
        const found = (await hub.list()).find((s) => s.subId === subId);
        const r = await hub.unsubscribe(subId);
        if ('error' in r) return { ok: false, output: r.error, error: 'unsubscribe failed' };
        auditUnsubscribe(audit, subId, found?.kind, found?.delivered ?? 0);
        return { ok: true, output: `✓ 已退订 ${subId}${found ? `（kind=${found.kind} · 累计 ${found.delivered} 条）` : ''}` };
      }

      case 'list': {
        const subs = await hub.list();
        if (subs.length === 0) {
          return { ok: true, output: '（当前无活跃订阅 —— events subscribe 注册；整页导航后订阅随文档销毁呈空态，需重新订阅 EC-001）' };
        }
        const lines = subs.map((s) => {
          const flags = [
            s.paused ? '已暂停' : undefined,
            s.autoPaused ? '自动暂停(预算)' : undefined,
            s.sensitive ? 'sensitive' : undefined,
          ].filter(Boolean);
          return (
            `  ${s.subId}  kind=${s.kind}  ${s.filterLabel}${s.label ? `（${s.label}）` : ''}` +
            `\n      已收 ${s.delivered} · 丢弃 ${s.dropped} · 缓冲 ${s.bufferSize}/${s.bufferLimit} · 游标 ${s.lastId}` +
            (flags.length > 0 ? ` · [${flags.join('|')}]` : '')
          );
        });
        return { ok: true, output: `事件订阅清单（${subs.length}）：\n${lines.join('\n')}` };
      }

      case 'pause':
      case 'resume':
      case 'clear': {
        const subId = args.subId ?? '';
        if (!subId) return { ok: false, output: `✖ events ${subcommand} 缺少 --subId <订阅 id>` };
        const r = subcommand === 'pause' ? await hub.pause(subId) : subcommand === 'resume' ? await hub.resume(subId) : await hub.clear(subId);
        if ('error' in r) return { ok: false, output: r.error, error: `${subcommand} failed` };
        const verb = subcommand === 'pause' ? '已暂停' : subcommand === 'resume' ? '已恢复' : '已清空缓冲';
        return { ok: true, output: `✓ ${verb} ${subId}${subcommand === 'resume' ? '（累计预算周期重置，FR-014）' : ''}` };
      }

      case 'pull': {
        const subId = args.subId ?? '';
        if (!subId) return { ok: false, output: '✖ events pull 缺少 --subId <订阅 id>' };
        const lastIdA = intArg(args, 'lastId');
        if (lastIdA.error) return { ok: false, output: lastIdA.error };
        const maxA = intArg(args, 'max', { min: 1 });
        if (maxA.error) return { ok: false, output: maxA.error };
        const r = await hub.pull(subId, {
          ...(lastIdA.n !== undefined ? { lastId: lastIdA.n } : {}),
          ...(maxA.n !== undefined ? { max: maxA.n } : {}),
        });
        if (!r.ok) return { ok: false, output: r.error ?? 'pull failed', error: 'pull failed' };
        auditDelivery(audit, subId, r.events[0]?.kind, r.events.length, r.dropped);
        const found = (await hub.list()).find((s) => s.subId === subId);
        const kindLabel = found?.kind ?? r.events[0]?.kind;
        const summaryBudget = maxA.n ?? DEFAULT_BUDGETS.summaryN; // 上下文预算 N（ADR-004：默认 10 摘要）
        const shown = r.events.slice(0, summaryBudget);
        const total = r.events.length;
        const lines = shown.map((e) => {
          const text = e.text !== undefined ? ` · text=${truncateForContext(e.text)}` : '';
          const metaBits = summarizeMeta(e.meta, e.kind);
          // 来源去重（C 缺陷）：dom 观察源事件同带顶层 source 与 meta.source —— metaBits 已由
          // summarizeMeta 输出 meta.source（src=），此处仅在 meta 未含 source 时才补顶层 e.source，
          // 保证同一来源只打印一次 src=（其余 kind 仅 meta.source → 语义不变，单次输出）。
          return `  [${e.seq}] ${e.ts} ${e.kind} ${e.type ?? ''}${e.target ? ` @${e.target}` : ''}${text}${metaBits}${e.count !== undefined && e.count > 1 ? ` · count=${e.count}` : ''}${e.source && typeof e.meta?.source !== 'string' ? ` · src=${e.source}` : ''}${e.truncated ? ' · [截断]' : ''}`;
        });
        const moreNote =
          total > shown.length
            ? `\n（共 ${total} 条增量，上下文预算默认只示 ${DEFAULT_BUDGETS.summaryN} 条摘要 —— 明细可 events pull --subId ${subId} --lastId ${r.lastId} --max <N> 续拉；NFR-003）`
            : '';
        return {
          ok: true,
          output:
            `✓ events pull（${subId}${kindLabel ? ` · ${kindLabel}` : ''}）：增量 ${total} 条 · 游标 ${r.lastId}` +
            ` · 缓冲 ${r.bufferSize} · 累计丢弃 ${r.dropped}${r.note ? `\n${r.note}` : ''}\n${lines.join('\n')}${moreNote}`,
        };
      }

      case 'pull-sensitive': {
        const subId = args.subId ?? '';
        const seqA = intArg(args, 'seq');
        if (!subId || seqA.n === undefined) {
          return { ok: false, output: '✖ events pull-sensitive 需 --subId <订阅 id> + --seq <事件 seq>' };
        }
        // untrusted 双闸（v3 page-eval 先例）：敏感明细细默认拒，须显式 --trusted true
        if (!flagTrue(args.trusted)) {
          auditDecision(audit, 'pull-sensitive 未声明 --trusted true → deny（FR-006 untrusted 双闸）');
          return {
            ok: false,
            output:
              '✖ events pull-sensitive 拒绝执行：敏感明细细默认视为 untrusted，须显式声明 --trusted true（且经权限 ask 放行 —— risk write，FR-006）。' +
              '普通脱敏摘要经 events pull 即可见；确需明文明细才走本通道。',
            error: 'untrusted sensitive pull rejected',
          };
        }
        const r = await hub.pullSensitive(subId, seqA.n);
        if (!r.ok) return { ok: false, output: r.error ?? 'pull-sensitive failed', error: 'pull-sensitive failed' };
        auditDecision(audit, `pull-sensitive 放行（trusted）：${subId} seq=${seqA.n}`);
        return { ok: true, output: `✓ 敏感明细细（${subId} seq=${seqA.n}）：\n${r.detail ?? ''}` };
      }

      case 'status': {
        const st = await hub.status();
        const head = [
          `事件通道状态：全局开关 ${st.enabled ? 'ON' : 'OFF（默认关 —— 订阅后 events switch --on true 开启，FR-014）'}`,
          `订阅数 ${st.subscriptionCount}（上限 ${st.budgets.maxSubscriptions}） · 缓冲中事件 ${st.totalBuffered}`,
          `预算（单一数据源 DEFAULT_BUDGETS）：缓冲 ${st.budgets.bufferLimit}（可配至 ${st.budgets.bufferLimitMax}）· 累计 ${st.budgets.cumulativeBudget} 自动暂停 · 速率 ${st.budgets.ratePerSec} 条/s · 合并窗口 ${st.budgets.mergeWindowMs}ms · 摘要 N=${st.budgets.summaryN} · 负载 ${st.budgets.payloadBudgetChars}B`,
          `开关关闭态丢弃 ${st.disabledDropped} · 速率丢弃 ${st.rateDropped}`,
        ];
        const subs =
          st.subscriptions.length === 0
            ? ['（无活跃订阅）']
            : st.subscriptions.map(
                (s) => `  ${s.subId} ${s.kind}${s.paused ? ' [已暂停]' : ''}${s.autoPaused ? ' [自动暂停]' : ''} · 已收 ${s.delivered} · 缓冲 ${s.bufferSize}/${s.bufferLimit} · 丢弃 ${s.dropped}`,
              );
        return { ok: true, output: `${head.join('\n')}\n订阅：\n${subs.join('\n')}` };
      }

      case 'budget': {
        const subId = args.subId ?? '';
        if (!subId) return { ok: false, output: '✖ events budget 需 --subId <订阅 id>（+ --bufferLimit / --autoPause）' };
        const bl = intArg(args, 'bufferLimit', { min: 1 });
        if (bl.error) return { ok: false, output: bl.error };
        const ap = intArg(args, 'autoPause', { min: 1 });
        if (ap.error) return { ok: false, output: ap.error };
        if (bl.n === undefined && ap.n === undefined) {
          return { ok: false, output: '✖ events budget 需至少一个调整项：--bufferLimit <1~1000> / --autoPause <正整数>' };
        }
        const r = await hub.setBudget({ subId, bufferLimit: bl.n, autoPauseAt: ap.n });
        if ('error' in r) return { ok: false, output: r.error, error: 'budget failed' };
        return { ok: true, output: `✓ 已调整 ${subId} 预算${bl.n !== undefined ? ` · bufferLimit=${bl.n}` : ''}${ap.n !== undefined ? ` · autoPause=${ap.n}` : ''}` };
      }

      case 'switch': {
        const onRaw = args.on;
        if (onRaw !== 'true' && onRaw !== 'false') {
          return { ok: false, output: '✖ events switch 需 --on true|false（全局通道开关，默认关 = 无订阅零常驻 NFR-007）' };
        }
        const r = await hub.switch(onRaw === 'true');
        if ('error' in r) return { ok: false, output: r.error, error: 'switch failed' };
        return {
          ok: true,
          output:
            onRaw === 'true'
              ? '✓ 事件通道已开启 —— 订阅事件开始入缓冲（events pull/status 取回）'
              : '✓ 事件通道已关闭 —— 事件不再入缓冲（订阅保留；开关关闭态丢弃计数可见于 events status）',
        };
      }
    }
  } catch (err) {
    return { ok: false, output: `✖ events ${subcommand} 调用失败：${err instanceof Error ? err.message : String(err)}`, error: 'events failed' };
  }
}

// ---------- 输出格式化辅助 ----------

function truncateForContext(s: string): string {
  const MAX = 120;
  return s.length > MAX ? `${s.slice(0, MAX)}…` : s;
}

function summarizeMeta(meta: Record<string, unknown> | undefined, kind: string): string {
  if (!meta) return '';
  const bits: string[] = [];
  if (kind === 'console' && typeof meta.level === 'string') bits.push(`level=${meta.level}`);
  if (kind === 'network') {
    if (typeof meta.method === 'string') bits.push(`method=${meta.method}`);
    // 网络事件摘要呈现目标 URL（脱敏位：查询串 token/key/sign 经 redactUrlQuery 掩码后才进
    // 输出 —— 观察源已脱敏 + 工具面二次脱敏双保险，FR-006/012；截断 120 上下文预算）
    if (typeof meta.url === 'string' && meta.url !== '') bits.push(`url=${truncateForContext(redactUrlQuery(meta.url))}`);
    if (typeof meta.status === 'number') bits.push(`status=${meta.status}`);
    if (typeof meta.durationMs === 'number') bits.push(`耗时=${meta.durationMs}ms`);
    if (typeof meta.error === 'string') bits.push(`error=${meta.error}`);
  }
  if (kind === 'lifecycle' && typeof meta.url === 'string' && meta.url !== '') bits.push(`url=${truncateForContext(meta.url)}`);
  if (typeof meta.source === 'string') bits.push(`src=${meta.source}`);
  return bits.length > 0 ? ` · ${bits.join(' · ')}` : '';
}

function buildFilterNote(args: Record<string, string>): string {
  const parts: string[] = [];
  if (csvList(args.type)) parts.push(`类型=${csvList(args.type)?.join(',')}`);
  if (csvList(args.level)) parts.push(`level=${csvList(args.level)?.join(',')}`);
  if (args.url?.trim()) parts.push(`URL=${args.url.trim()}`);
  if (args.selector?.trim()) parts.push(`selector=${args.selector.trim()}`);
  return parts.length > 0 ? ` · 过滤[${parts.join(' ∩ ')}]` : '';
}

// ---------- ToolEntry ----------

const EVENTS_DESC =
  'events：事件 push/订阅通道工具（11 子命令；FR-008~015）。' +
  ' subscribe（--kind dom|lifecycle|console|network|paste|dialog —— 注意：dom observe（FR-009）= events subscribe --kind dom，' +
  ' 别名语义落位不新增 dom 子命令）+ 过滤（--type 事件类型 csv ∩ --selector css:/text= ∩ --url glob ∩ --level）+ 预算（--bufferLimit/--autoPause）+ --sensitive true' +
  ' / unsubscribe / list / pause / resume / clear / pull（--lastId 增量，无重复无遗漏 AC-002）/ pull-sensitive（事件面明文细 --trusted true + ask；真实浏览器内置观察源当前零明文供给 FR-006，cookie 明文细走 read-detail）' +
  ' / status（订阅清单 + 预算水位 + 自动暂停提示）/ budget（订阅级预算）/ switch（全局通道开关 --on true|false，默认关零常驻 FR-014）。' +
  ' 事件流不自动进上下文（NFR-003：pull 默认只示摘要+计数）；订阅随整页导航失效需重订阅（EC-001）。' +
  ' 参数进 args 对象：{"subcommand":"subscribe","args":{"kind":"dom","type":"click"}}。';

const EVENTS_SCHEMA = {
  type: 'object',
  properties: {
    subcommand: {
      type: 'string',
      enum: EVENTS_SUBCOMMANDS,
      description: 'events 子命令（11：subscribe/unsubscribe/list/pause/resume/clear/pull/pull-sensitive/status/budget/switch）。',
    },
    args: {
      type: 'object',
      properties: {
        kind: { type: 'string', description: 'subscribe 观察源 kind：dom/lifecycle/console/network/paste/dialog（dom observe FR-009 = --kind dom）。' },
        type: { type: 'string', description: 'subscribe 事件类型过滤（csv：click,keydown,…）。' },
        level: { type: 'string', description: 'subscribe console level 过滤（csv：error,warn,…）。' },
        url: { type: 'string', description: 'subscribe URL glob 过滤（network/lifecycle）。' },
        selector: { type: 'string', description: 'subscribe selector 目标过滤（css:/text= 语法面，dom）。' },
        sensitive: { type: 'string', description: 'subscribe "true" = 观察敏感面（console/键入）→ 全程入审计；事件面明文细仅当观察源供给时经 pull-sensitive（真实浏览器内置源当前零明文供给 FR-006；cookie 明文细走 cookie read-detail）。' },
        bufferLimit: { type: 'string', description: 'subscribe/budget 订阅缓冲上限（1~1000；缺省 200）。' },
        autoPause: { type: 'string', description: 'subscribe/budget 累计预算（正整数；超限自动暂停可 resume）。' },
        label: { type: 'string', description: 'subscribe 订阅标签（list/审计展示）。' },
        subId: { type: 'string', description: 'unsubscribe/pause/resume/clear/pull/pull-sensitive/budget 的订阅 id。' },
        lastId: { type: 'string', description: 'pull 增量游标（只拉 seq>lastId；本地游标=已拉最大 seq）。' },
        max: { type: 'string', description: 'pull 最大条数（上下文只见摘要；缺省默认摘要预算 N=10）。' },
        seq: { type: 'string', description: 'pull-sensitive 目标事件 seq（敏感明细细）。' },
        trusted: { type: 'string', description: 'pull-sensitive "true" = 显式 trusted 声明（缺省 untrusted 拒，FR-006）。' },
        on: { type: 'string', description: 'switch 全局通道开关：true 开 / false 关（默认关零常驻）。' },
      },
    },
  },
  required: ['subcommand'],
} as const;

export function eventsHelp(): string {
  return [
    'events —— 事件订阅/拉取工具（事件 push 通道工具面，FR-008~015）',
    '用法：events <subscribe|unsubscribe|list|pause|resume|clear|pull|pull-sensitive|status|budget|switch> [--参数]',
    '',
    '别名（ADR-005）：dom observe（FR-009）= events subscribe --kind dom —— 生命周期/console/网络观察 = --kind lifecycle/console/network；不新增 dom 子命令',
    '通道语义：订阅 →（events switch --on true 开启全局通道，默认关零常驻 FR-014）→ 页面事件同步入缓冲 → events pull 增量取回（lastId 无重复无遗漏）',
    '',
    'risk 分级（FR-005/ADR-001）：',
    '  [read 观察只读]  subscribe（无 --sensitive）/ list / status / pull（摘要+计数，脱敏）',
    '  [state 订阅生命周期·缺省 ask]  unsubscribe / pause / resume / clear / budget / switch',
    '  [write 敏感明细·缺省 ask + trusted]  pull-sensitive（--trusted true 显式声明 + ask 放行，决策入审计）',
    '  subscribe --sensitive true → 订阅全程入审计 + 敏感订阅标记；事件面明文细仅当观察源携带敏感明细时',
    '    经 pull-sensitive 通道取回 —— 真实浏览器内置观察源当前零明文供给（FR-006 保守），该通道为测试/',
    '    注入面与后续观察源供给预留；确需 cookie 值等明文细请走 cookie read-detail --trusted true（FR-030）',
    '',
    '子命令：',
    '  subscribe  --kind dom|lifecycle|console|network|paste|dialog [--type csv] [--level csv] [--url glob] [--selector css:/text=] [--bufferLimit N] [--autoPause N] [--sensitive true] [--label]',
    '  unsubscribe / pause / resume / clear  --subId <id>',
    '  pull       --subId <id> [--lastId N] [--max N]  增量取回（摘要默认 N=10 预算；续拉 --lastId）',
    '  pull-sensitive --subId <id> --seq N --trusted true  事件面明文细（risk write + ask；真实浏览器内置观察源当前零明文供给 → 恒无保留明细，通道为观察源/注入面供给预留）',
    '  status     通道状态（订阅清单/预算水位/自动暂停提示/丢弃计数）',
    '  budget     --subId <id> [--bufferLimit 1~1000] [--autoPause N]',
    '  switch     --on true|false  全局通道开关（默认关 = 无订阅零常驻 NFR-007）',
    '',
    '预算（DEFAULT_BUDGETS 单一数据源，ADR-004）：缓冲 200（可配至 1000）/ 累计 2000 自动暂停 / 并发 8 / 速率 200 条/s / 合并窗口 800ms（仅 scroll/resize/mousemove/mouseover 抖动类）/ 摘要 N=10 / 负载 4KB 截断',
    '事件负载统一面 {seq,ts,kind,type,target,text(脱敏),meta}；键入敏感面不含明文值（key 名+修饰键），input 敏感目标值掩码（FR-006）',
    '过滤语法（ADR-005）：类型 ∩ selector（css:/text=）∩ URL glob ∩ level；glob * / ? 沿既有语义',
    '',
    '局限声明（FR-015/NFR-004/NG-010/012）：同 realm 观察（跨 realm/worker/非 JS 子资源不可达 → F-14/CDP 归属）；' +
      '不升级 isTrusted；被 stopImmediatePropagation 吞掉的事件不可承诺；整页导航后订阅随文档销毁（EC-001：list 空态 + 需重新 read-state + 订阅）；' +
      '网络观察 = 宿主自身 fetch/XHR（AI 自请求 env.fetch 早期绑定默认不可见，ADR-008）',
      '',
      ...attributionHelpLines(),
  ].join('\n');
}

/** 创建 events 工具条目（env.events 注入；group=observe；subcommandRisks = 观察只读/状态/写三档）。 */
export function createEventsToolEntry(env: PlatformEnv): ToolEntry {
  return {
    name: 'events',
    summary: '事件订阅/拉取通道（subscribe/pull/status；dom observe = subscribe --kind dom）',
    schema: { name: 'events', description: EVENTS_DESC, parameters: EVENTS_SCHEMA as unknown as Record<string, unknown> },
    risk: 'read',
    group: 'observe',
    subcommandRisks: {
      subscribe: 'read',
      list: 'read',
      status: 'read',
      pull: 'read',
      'pull-sensitive': 'write',
      unsubscribe: 'state',
      pause: 'state',
      resume: 'state',
      clear: 'state',
      budget: 'state',
      switch: 'state',
    },
    executor: async (tc, ctx) => executeEventsTool(env.events, tc.subcommand, tc.args, ctx),
    help: eventsHelp,
  };
}
