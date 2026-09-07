/**
 * cookie-tools.ts —— cookie 工具（TASK-007，CK FR-019/020 + ADR-009）。
 *
 * 4 子命令：read（同源非 HttpOnly 读 —— 值缺省掩码）/ read-detail（明细细：risk 'write' 档 +
 * 显式 --trusted true + ask，决策入审计）/ write / delete（risk 'write' 缺省 ask + untrusted 值拒写
 * + 写后回读断言）。门禁（FR-005/006/007）：无旁路 —— 经 router PermissionGate + executor
 * untrusted 双闸；审计 = 名掩码 + 域 + 动作（无明文值）；受限标志位分类转译在 ops 面（EC-007）。
 * HttpOnly 读/跨域/域级批量 → 不支持 + chrome.cookies 归属（EC-009，统一文案面 TASK-010）。
 */
import type { PlatformDomOps, PlatformEnv } from './platform.js';
import { maskValue } from './sensitive.js';
import type { AuditSink } from './audit.js';
import { attributionHelpLines } from './ext-attribution.js';
import type { ToolEntry, ToolContext, ToolResult } from './router.js';

/** cookie 子命令（4）。 */
export type CookieSubcommand = 'read' | 'read-detail' | 'write' | 'delete';

export const COOKIE_SUBCOMMANDS: CookieSubcommand[] = ['read', 'read-detail', 'write', 'delete'];

function auditCookie(sink: AuditSink | undefined, action: string, name: string, domain: string | undefined, detail: string): void {
  sink?.record({
    type: 'cookie',
    ts: Date.now(),
    tool: 'cookie',
    action,
    domain,
    detail: `cookie 名已掩码（${maskValue(name, 'cookie')}）· ${detail}`,
  });
}

function opMissing(name: string): ToolResult {
  return {
    ok: false,
    output: `✖ cookie 该能力在当前环境未注入（env.dom.ops.${name} 缺省）—— cookie 读写仅在浏览器场景可用；写类子命令受权限门禁（PRM）约束`,
    error: `cookie ops ${name} not injected`,
  };
}

/** executor（env.dom.ops.cookie* 注入面；read 经 ops 输出，值不出现在本层明文）。 */
export async function executeCookieTool(env: PlatformEnv, subcommand: string, args: Record<string, string>, ctx?: ToolContext): Promise<ToolResult> {
  const audit = ctx?.services?.audit;
  const ops: PlatformDomOps | undefined = env.dom?.ops;
  if (!ops) {
    return {
      ok: false,
      output: '✖ cookie 操作面未注入（env.dom.ops 缺省）—— cookie 读写仅在浏览器场景可用；写类子命令受权限门禁（PRM）约束',
      error: 'cookie ops not injected',
    };
  }
  if (!COOKIE_SUBCOMMANDS.includes(subcommand as CookieSubcommand)) {
    return {
      ok: false,
      output: `✖ cookie 未知子命令 "${subcommand}"（可用：${COOKIE_SUBCOMMANDS.join('/')}）`,
      error: 'unknown subcommand',
    };
  }
  const name = (args.name ?? '').trim();
  const domain = args.domain?.trim() || undefined;

  switch (subcommand as CookieSubcommand) {
    case 'read': {
      if (typeof ops.cookieRead !== 'function') return opMissing('cookieRead');
      const r = await ops.cookieRead();
      auditCookie(audit, 'read', name || '(全部)', undefined, '读（值缺省掩码）');
      return r.ok ? { ok: true, output: r.output } : { ok: false, output: r.output, error: r.error };
    }

    case 'read-detail': {
      // 明细细 = risk 'write' 档 + untrusted 双闸 + 场景 ask（FR-006）
      if (args.trusted !== 'true') {
        auditCookie(audit, 'read-detail-denied', name || '(全部)', domain, '未声明 --trusted true → deny');
        return {
          ok: false,
          output: '✖ cookie read-detail 拒绝执行：cookie 明细细默认 untrusted，须显式声明 --trusted true（且经权限 ask 放行 —— risk write，FR-006）。read 已给掩码摘要，确需明文才走本通道。',
          error: 'untrusted cookie detail rejected',
        };
      }
      if (typeof ops.cookieRead !== 'function') return opMissing('cookieRead');
      const r = await ops.cookieRead({ includeValue: true });
      if (r.ok) auditCookie(audit, 'read-detail', name || '(全部)', domain, 'trusted 放行 → 明细已取回');
      return r.ok ? { ok: true, output: r.output } : { ok: false, output: r.output, error: r.error };
    }

    case 'write': {
      if (!name) return { ok: false, output: '✖ cookie write 缺少 --name <cookie 名>' };
      const value = args.value ?? '';
      if (value === '') return { ok: false, output: '✖ cookie write 缺少 --value <值>（或值为空）' };
      // untrusted 双闸（FR-005/EC-004）：写值默认 untrusted → --trusted true 才写
      if (args.trusted !== 'true') {
        auditCookie(audit, 'write-denied', name, domain, 'untrusted 值拒写');
        return {
          ok: false,
          output: '✖ cookie write 拒绝执行：写入值默认视为 untrusted（可能来自网络/采集/外部内容），须显式声明 --trusted true（且经权限 ask 放行，FR-005/EC-004）',
          error: 'untrusted cookie value rejected',
        };
      }
      if (typeof ops.cookieWrite !== 'function') return opMissing('cookieWrite');
      const r = await ops.cookieWrite({
        name,
        value,
        ...(domain ? { domain } : {}),
        ...(args.path?.trim() ? { path: args.path.trim() } : {}),
        ...(args.secure === 'true' ? { secure: true } : {}),
        ...(args.sameSite && ['Lax', 'Strict', 'None'].includes(args.sameSite) ? { sameSite: args.sameSite as 'Lax' | 'Strict' | 'None' } : {}),
        ...(args.maxAge !== undefined && /^\d+$/.test(args.maxAge) ? { maxAge: Number(args.maxAge) } : {}),
      });
      auditCookie(audit, 'write', name, domain, '写后回读断言（值不回审计）');
      return r.ok ? { ok: true, output: r.output } : { ok: false, output: r.output, error: r.error };
    }

    case 'delete': {
      if (!name) return { ok: false, output: '✖ cookie delete 缺少 --name <cookie 名>' };
      if (args.trusted !== 'true') {
        auditCookie(audit, 'delete-denied', name, domain, '未声明 --trusted true → deny');
        return {
          ok: false,
          output: '✖ cookie delete 拒绝执行：删除为写操作，默认 untrusted —— 须显式声明 --trusted true（且经权限 ask 放行，FR-005/020）',
          error: 'untrusted cookie delete rejected',
        };
      }
      if (typeof ops.cookieDelete !== 'function') return opMissing('cookieDelete');
      const r = await ops.cookieDelete({
        name,
        ...(domain ? { domain } : {}),
        ...(args.path?.trim() ? { path: args.path.trim() } : {}),
      });
      auditCookie(audit, 'delete', name, domain, '删后回读断言');
      return r.ok ? { ok: true, output: r.output } : { ok: false, output: r.output, error: r.error };
    }
  }
}

// ---------- ToolEntry ----------

const COOKIE_DESC =
  'cookie：同源 cookie 读写删（FR-019/020；document.cookie 可达面 = 同源非 HttpOnly）。' +
  ' read（值缺省掩码）/ read-detail（明细细：--trusted true + ask）/ write（--name --value，同源非 HttpOnly；--trusted true 双闸 + 写后回读）' +
  ' / delete（--name；--trusted true + 删后回读）。写类子命令 risk=write 缺省 ask（场景 deny/ask 不可静默 allow）；审计名掩码 + 域 + 动作（无明文）。' +
  ' Secure 仅 HTTPS 可写 / HttpOnly 不可写 → 分类转译（EC-007）；HttpOnly 读/跨域/域级批量 → 不支持 + chrome.cookies 归属（EC-009，F-14 契约预留）。' +
  ' 参数进 args 对象：{"subcommand":"read"} / {"subcommand":"write","args":{"name":"sid","value":"abc","trusted":"true"}}。';

const COOKIE_SCHEMA = {
  type: 'object',
  properties: {
    subcommand: {
      type: 'string',
      enum: COOKIE_SUBCOMMANDS,
      description: 'cookie 子命令（4：read/read-detail/write/delete）。',
    },
    args: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'cookie 名（read 缺省 = 全清单）。' },
        value: { type: 'string', description: 'write 值（untrusted 拒写，需 --trusted true）。' },
        path: { type: 'string', description: 'cookie path（缺省 /）。' },
        domain: { type: 'string', description: 'cookie domain（同源；跨域域级 → 归属 chrome.cookies）。' },
        secure: { type: 'string', description: 'write "true" = Secure 标志（仅 HTTPS/localhost 可写，EC-007）。' },
        sameSite: { type: 'string', description: 'write SameSite：Lax/Strict/None。' },
        maxAge: { type: 'string', description: 'write max-age 秒（缺省会话 cookie）。' },
        trusted: { type: 'string', description: '"true" = 显式 trusted（write/delete/read-detail 必需；缺省 untrusted 拒，FR-005/006）。' },
      },
    },
  },
  required: ['subcommand'],
} as const;

export function cookieHelp(): string {
  return [
    'cookie —— 同源 cookie 读写删（FR-019/020/ADR-009）',
    '用法：cookie <read|read-detail|write|delete> [--参数]',
    '',
    'risk 分级（FR-005）：',
    '  [read]  read（值缺省掩码 —— 非敏感摘要面免 ask）',
    '  [write·缺省 ask + trusted 双闸]  read-detail（明细细）/ write / delete（均需 --trusted true 显式声明；场景规则 deny/ask 不可静默 allow，FR-030）',
    '',
    '子命令：',
    '  read        同源非 HttpOnly cookie 清单（document.cookie 可达面；值掩码 maskValue，FR-006）',
    '  read-detail --trusted true   明细细（决策入审计）',
    '  write       --name <名> --value <值> --trusted true [--path] [--domain] [--secure true] [--sameSite] [--maxAge]',
    '  delete      --name <名> --trusted true [--path] [--domain]',
    '',
    '受限标志位（EC-007）：Secure 仅 HTTPS/localhost 可写；HttpOnly 页面不可读不可写 → 分类转译可读',
    '边界（EC-009）：HttpOnly 读/跨域 cookie/域级批量管理 → 不支持 + chrome.cookies 归属（F-14 扩展宿主契约预留，FR-025；统一文案面 TASK-010）',
    '审计（FR-007）：名掩码 + 域 + 动作，值明文零入库',
    ...attributionHelpLines(),
  ].join('\n');
}

/** 创建 cookie 工具条目（env.dom.ops 注入；group=cookie）。 */
export function createCookieToolEntry(env: PlatformEnv): ToolEntry {
  return {
    name: 'cookie',
    summary: '同源 cookie 读写删（值缺省掩码；明细/写/删 trusted + ask）',
    schema: { name: 'cookie', description: COOKIE_DESC, parameters: COOKIE_SCHEMA as unknown as Record<string, unknown> },
    risk: 'read',
    group: 'cookie',
    subcommandRisks: {
      read: 'read',
      'read-detail': 'write',
      write: 'write',
      delete: 'write',
    },
    executor: async (tc, ctx) => executeCookieTool(env, tc.subcommand, tc.args, ctx),
    help: cookieHelp,
  };
}
