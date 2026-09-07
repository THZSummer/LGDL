/**
 * net-tools.ts —— 网络拦截规则引擎与 net 工具（TASK-012，NET FR-018/ADR-008；P2 门禁）。
 *
 * 纯规则引擎（node 可测）：URL 模式匹配（glob）→ 发出前修改动作（增改 header/查询参数/
 * 请求体字段）。G-02 验证门已过（真实 chromium：同 realm fetch 改写 header/参数到达网络栈）。
 *
 * net 工具 6 子命令：rule-add（--url glob + --actions JSON；**untrusted 拒需 --trusted true**，
 * EC-004）/ list / remove / intercept-on / intercept-off / status。整工具 P2 缺省 deny
 * （entry risk='write' + LGDL 矩阵默认关 + deny 策略兜底，FR-018/030）。响应伪造/缓存篡改/
 * 先网络栈/跨 realm → 不支持 + webRequest/DNR/CDP 归属（FR-025）。拦截命中审计：规则 id +
 * URL 脱敏摘要 + 动作（无明文）。
 */
import { globMatch } from './permission.js';
import { redactUrlQuery } from './sensitive.js';
import type { PlatformEnv, PlatformNetAction, PlatformNetRuleSpec } from './platform.js';
import type { AuditSink } from './audit.js';
import type { ToolEntry, ToolContext, ToolResult } from './router.js';

/** net 子命令（6）。 */
export type NetSubcommand = 'rule-add' | 'list' | 'remove' | 'intercept-on' | 'intercept-off' | 'status';

export const NET_SUBCOMMANDS: NetSubcommand[] = ['rule-add', 'list', 'remove', 'intercept-on', 'intercept-off', 'status'];

// ---------- 纯规则引擎（node 可测：URL 命中 + 动作序列） ----------

export interface NetRequestLike {
  url: string;
  method: string;
  /** 头（大小写不敏感语义由应用面保证；本层小写归一）。 */
  headers: Record<string, string>;
  /** 请求体（字符串可改形态；非字符串体 → 请求体字段动作跳过）。 */
  body?: unknown;
}

export interface NetApplyResult {
  url: string;
  headers: Record<string, string>;
  body?: unknown;
  /** 命中的规则 id（按序全部应用）。 */
  hits: string[];
  /** 被跳过的动作（如非字符串请求体改字段/removeHeader 缺值）。 */
  skipped: string[];
}

/** 规则 URL 命中（glob；未声明 pattern=全量）。 */
export function netRuleMatches(rule: PlatformNetRuleSpec, url: string): boolean {
  if (!rule.urlPattern || rule.urlPattern === '*') return true;
  return globMatch(url, rule.urlPattern);
}

/** 应用动作序列（发出前修改；纯函数）。 */
export function applyNetRules(rules: PlatformNetRuleSpec[], req: NetRequestLike): NetApplyResult {
  const out: NetApplyResult = { url: req.url, headers: { ...req.headers }, body: req.body, hits: [], skipped: [] };
  for (const rule of rules) {
    if (!rule.trusted) continue; // untrusted 规则永不应用（双闸兜底）
    if (!netRuleMatches(rule, out.url)) continue;
    for (const act of rule.actions) {
      const r = applyAction(act, out);
      if (r.skipped) out.skipped.push(r.skipped);
    }
    if (rule.actions.length > 0) out.hits.push(rule.id);
  }
  return out;
}

/** 单动作应用。 */
function applyAction(act: PlatformNetAction, out: NetApplyResult): { skipped?: string } {
  switch (act.op) {
    case 'addHeader':
      if (act.value === undefined) return { skipped: `addHeader ${act.name} 缺 value` };
      out.headers[act.name.toLowerCase()] = act.value;
      return {};
    case 'setHeader':
      if (act.value === undefined) return { skipped: `setHeader ${act.name} 缺 value` };
      out.headers[act.name.toLowerCase()] = act.value;
      return {};
    case 'removeHeader':
      delete out.headers[act.name.toLowerCase()];
      return {};
    case 'addQuery':
      if (act.value === undefined) return { skipped: `addQuery ${act.name} 缺 value` };
      out.url = setQuery(out.url, act.name, act.value, false);
      return {};
    case 'setQuery':
      if (act.value === undefined) return { skipped: `setQuery ${act.name} 缺 value` };
      out.url = setQuery(out.url, act.name, act.value, true);
      return {};
    case 'removeQuery':
      out.url = removeQuery(out.url, act.name);
      return {};
    case 'setBodyField': {
      const r = setBodyField(out.body, act.name, act.value);
      if (r === null) return { skipped: `setBodyField ${act.name} 跳过（请求体非可改字符串/URLSearchParams 形态）` };
      out.body = r;
      return {};
    }
    case 'removeBodyField': {
      const r = removeBodyField(out.body, act.name);
      if (r === null) return { skipped: `removeBodyField ${act.name} 跳过（请求体非可改形态）` };
      out.body = r;
      return {};
    }
  }
  return {};
}

function setQuery(url: string, name: string, value: string, overwrite: boolean): string {
  const u = new URL(url, 'http://x'); // 相对兜底（真实 fetch url 为绝对）
  if (overwrite || !u.searchParams.has(name)) u.searchParams.set(name, value);
  return url.startsWith('http') ? u.toString() : `${u.pathname}${u.search}${u.hash}`;
}
function removeQuery(url: string, name: string): string {
  const u = new URL(url, 'http://x');
  u.searchParams.delete(name);
  return url.startsWith('http') ? u.toString() : `${u.pathname}${u.search}${u.hash}`;
}
/** JSON 对象体字段（string 且可 parse / URLSearchParams）；不可改形态 → null。 */
function setBodyField(body: unknown, name: string, value: string | undefined): unknown {
  if (value === undefined) return null;
  const parsed = tryJsonObject(body);
  if (parsed) {
    parsed[name] = value;
    return JSON.stringify(parsed);
  }
  if (body instanceof URLSearchParams) {
    body.set(name, value);
    return body;
  }
  return null;
}
function removeBodyField(body: unknown, name: string): unknown {
  const parsed = tryJsonObject(body);
  if (parsed) {
    delete parsed[name];
    return JSON.stringify(parsed);
  }
  if (body instanceof URLSearchParams) {
    body.delete(name);
    return body;
  }
  return null;
}
function tryJsonObject(body: unknown): Record<string, unknown> | null {
  if (typeof body !== 'string') return null;
  try {
    const o = JSON.parse(body);
    return o && typeof o === 'object' && !Array.isArray(o) ? (o as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** 审计命中摘要（URL 脱敏；FR-007 无明文）。 */
export function netHitAudit(sink: AuditSink | undefined, hits: string[], url: string, actionsCount: number): void {
  if (hits.length === 0) return;
  sink?.record({
    type: 'net-intercept',
    ts: Date.now(),
    tool: 'net',
    action: 'intercept-hit',
    count: hits.length,
    detail: `规则 [${hits.join(',')}] 命中 · URL 脱敏摘要（${redactUrlQuery(url).slice(0, 120)}） · 动作 ${actionsCount} 个`,
  });
}

// ---------- executor（env.events.sources.netIntercept 注入面；整工具 write 缺省 deny） ----------

export async function executeNetTool(env: PlatformEnv, subcommand: string, args: Record<string, string>, ctx?: ToolContext): Promise<ToolResult> {
  const ctrl = env.events?.sources.netIntercept;
  const audit = ctx?.services?.audit;
  if (!ctrl) {
    return {
      ok: false,
      output: '✖ net 工具不可用（env.events 未注入 —— 网络拦截仅在浏览器场景可用）',
      error: 'net controller not injected (EC-011)',
    };
  }
  if (!NET_SUBCOMMANDS.includes(subcommand as NetSubcommand)) {
    return { ok: false, output: `✖ net 未知子命令 "${subcommand}"（可用：${NET_SUBCOMMANDS.join('/')}）`, error: 'unknown subcommand' };
  }
  const trustedGuard = (what: string): ToolResult | null => {
    if (args.trusted !== 'true') {
      audit?.record({ type: 'permission', ts: Date.now(), tool: 'net', decision: 'deny', by: 'untrusted-guard', reason: `${what} 未声明 --trusted true → deny（FR-005/EC-004）` });
      return {
        ok: false,
        output: `✖ net ${what} 拒绝执行：拦截规则/开关默认视为 untrusted（写面 P2 缺省 deny，FR-018/EC-004），须显式声明 --trusted true 并经权限 ask 放行。`,
        error: 'untrusted net op rejected',
      };
    }
    return null;
  };

  switch (subcommand as NetSubcommand) {
    case 'rule-add': {
      const g = trustedGuard('rule-add');
      if (g) return g;
      const url = (args.url ?? '').trim() || '*';
      const actionsRaw = args.actions ?? '';
      let actions: PlatformNetAction[];
      try {
        const parsed = JSON.parse(actionsRaw);
        if (!Array.isArray(parsed)) throw new Error('非数组');
        actions = parsed as PlatformNetAction[];
      } catch {
        return { ok: false, output: '✖ net rule-add --actions 需为 JSON 数组：[{"op":"addHeader","name":"x","value":"y"},...]（op: addHeader/setHeader/removeHeader/addQuery/setQuery/removeQuery/setBodyField/removeBodyField）' };
      }
      if (actions.length === 0) return { ok: false, output: '✖ net rule-add --actions 不能为空' };
      const bad = actions.filter((a) => !a.op || typeof a.name !== 'string');
      if (bad.length > 0) return { ok: false, output: '✖ net rule-add --actions 含非法项（缺 op/name）' };
      const id = args.id?.trim() || `rule-${Date.now().toString(36)}`;
      const rule: PlatformNetRuleSpec = { id, urlPattern: url, actions, trusted: true };
      const r = await ctrl.setRules([...(await ctrl.rules()), rule]);
      if ('error' in r) return { ok: false, output: r.error, error: 'rule-add failed' };
      audit?.record({ type: 'net-intercept', ts: Date.now(), tool: 'net', action: 'rule-add', detail: `规则 ${id} 注册（URL 模式 ${url} · ${actions.length} 动作；trusted）` });
      return { ok: true, output: `✓ 拦截规则已注册：${id}（URL ${url} · ${actions.length} 动作）。注意：整工具 P2 缺省 deny —— 需 net intercept-on 且经门禁放行才生效（FR-018）` };
    }
    case 'list': {
      const rules = await ctrl.rules();
      if (rules.length === 0) return { ok: true, output: '（当前无拦截规则 —— net rule-add 注册；无规则零开销零改写，FR-018/ADR-008）' };
      const lines = rules.map((r) => `  ${r.id}  url=${r.urlPattern}  actions=${r.actions.map((a) => `${a.op}:${a.name}`).join(',')}  trusted`);
      return { ok: true, output: `拦截规则（${rules.length}）：\n${lines.join('\n')}` };
    }
    case 'remove': {
      const g = trustedGuard('remove');
      if (g) return g;
      const id = args.id ?? '';
      if (!id) return { ok: false, output: '✖ net remove 需 --id <规则 id>' };
      const rules = (await ctrl.rules()).filter((r) => r.id !== id);
      const r = await ctrl.setRules(rules);
      if ('error' in r) return { ok: false, output: r.error, error: 'remove failed' };
      audit?.record({ type: 'net-intercept', ts: Date.now(), tool: 'net', action: 'rule-remove', detail: `规则 ${id} 移除` });
      return { ok: true, output: `✓ 已移除规则 ${id}` };
    }
    case 'intercept-on':
    case 'intercept-off': {
      const g = trustedGuard(subcommand);
      if (g) return g;
      const on = subcommand === 'intercept-on';
      const r = await ctrl.setIntercept(on);
      if ('error' in r) return { ok: false, output: r.error, error: 'setIntercept failed' };
      audit?.record({ type: 'net-intercept', ts: Date.now(), tool: 'net', action: on ? 'intercept-on' : 'intercept-off' });
      return { ok: true, output: on ? '✓ 拦截已开启 —— 匹配规则在宿主 fetch/XHR 发出前生效（命中全量审计，URL 脱敏）' : '✓ 拦截已关闭 —— 宿主请求不再改写（规则保留）' };
    }
    case 'status': {
      const st = await ctrl.status();
      return {
        ok: true,
        output: `网络拦截：${st.on ? 'ON' : 'OFF（P2 缺省 deny —— 需 trusted + ask 开启，FR-018）'} · 规则 ${st.ruleCount} 条（net list 查看）\n边界：响应伪造/缓存篡改/先网络栈/跨 realm → 不支持 + webRequest/DNR/CDP 归属（FR-025）`,
      };
    }
  }
}

// ---------- ToolEntry ----------

const NET_DESC =
  'net：宿主自身 fetch/XHR 发出前修改拦截（FR-018/ADR-008；P2 门禁缺省 deny）。' +
  ' rule-add（--url glob + --actions JSON；--trusted true 必需）/ list / remove / intercept-on / intercept-off / status。' +
  ' 动作 op：addHeader/setHeader/removeHeader/addQuery/setQuery/removeQuery/setBodyField/removeBodyField（请求体字段仅字符串 JSON/URLSearchParams 形态）。' +
  ' 命中全量审计（规则 id + URL 脱敏摘要 + 动作，无明文）；无规则零开销零改写。响应伪造/缓存篡改/先网络栈/跨 realm → 不支持（webRequest/DNR/CDP 归属 FR-025）。' +
  ' 参数进 args 对象：{"subcommand":"rule-add","args":{"url":"https://api.example.com/*","actions":"[{\\"op\\":\\"addHeader\\",\\"name\\":\\"x-debug\\",\\"value\\":\\"1\\"}]","trusted":"true"}}。';

const NET_SCHEMA = {
  type: 'object',
  properties: {
    subcommand: { type: 'string', enum: NET_SUBCOMMANDS, description: 'net 子命令（6）。' },
    args: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'rule-add URL glob（缺省 * = 全量）。' },
        actions: { type: 'string', description: 'rule-add 动作 JSON 数组。' },
        id: { type: 'string', description: 'rule-add 规则 id（可选，缺省生成）/ remove 目标 id。' },
        trusted: { type: 'string', description: '"true" = 显式 trusted（P2 deny 门禁必需，FR-018）。' },
      },
    },
  },
  required: ['subcommand'],
} as const;

export function netHelp(): string {
  return [
    'net —— 宿主自身 fetch/XHR 拦截（FR-018/ADR-008，P2 门禁）',
    '用法：net <rule-add|list|remove|intercept-on|intercept-off|status> [--参数]',
    '',
    '风险（FR-018/030）：整工具缺省 deny（entry risk write + 矩阵默认关 + LGDL deny 规则）—— 须 --trusted true + ask 放行 + intercept-on',
    'G-02 验证（真实 chromium）：同 realm fetch 改写 header/查询参数已实测到达网络栈',
    '子命令：rule-add --url <glob> --actions <JSON> --trusted true / list / remove --id / intercept-on|off --trusted true / status',
    '动作 op：addHeader/setHeader/removeHeader（header）/ addQuery/setQuery/removeQuery（查询参数）/ setBodyField/removeBodyField（请求体字段，仅 JSON 字符串/URLSearchParams 形态）',
    '审计（FR-007）：命中 = 规则 id + URL 脱敏摘要 + 动作；无明文；无规则零开销零改写',
    '边界（FR-025/NG-010）：响应伪造/缓存篡改/先网络栈/跨 realm（img/script/导航/worker）→ 不支持 + webRequest/DNR/CDP 归属',
  ].join('\n');
}

/** 创建 net 工具条目（env.events.sources.netIntercept；group=net；P2 write 档）。 */
export function createNetToolEntry(env: PlatformEnv): ToolEntry {
  return {
    name: 'net',
    summary: '宿主 fetch/XHR 发出前拦截（P2 deny + trusted + 审计；矩阵默认关）',
    schema: { name: 'net', description: NET_DESC, parameters: NET_SCHEMA as unknown as Record<string, unknown> },
    risk: 'write',
    group: 'net',
    subcommandRisks: {
      'rule-add': 'write',
      list: 'read',
      remove: 'write',
      'intercept-on': 'write',
      'intercept-off': 'write',
      status: 'read',
    },
    executor: async (tc, ctx) => executeNetTool(env, tc.subcommand, tc.args, ctx),
    help: netHelp,
  };
}
