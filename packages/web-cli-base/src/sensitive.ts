/**
 * sensitive.ts —— 敏感字段分类/脱敏（纯数据函数；FR-024/ADR-004/EC-005）。
 *
 * 密码/凭据类字段（input[type=password]、信用卡号等敏感面）的行为准则数据面：
 *   - **读侧**：值不回显 —— `maskValue` 以「类型/长度/占位」代替明文（FR-024/EC-005）；
 *     read-element/snapshot/interactives/采集的敏感值展示统一经本模块。
 *   - **写侧**：type/fill 写入敏感字段默认 ask + 需场景显式 trusted 声明
 *     （FR-024/ADR-004；`sensitiveWriteDecision` 表达该纯数据裁决，执行面由 router
 *     子命令级 risk + 场景策略承接）。
 *   - 审计/日志不回显敏感值（NFR-002/EC-005）。
 *
 * 分类来源（保守启发式，宁可遮不可漏 FR-024 取向）：
 *   ① type=password（最强信号）
 *   ② autocomplete 属性（HTML 标准凭据 token：current-password / new-password /
 *      one-time-code / cc-* 卡片数据面）
 *   ③ name/id 凭据词元启发式（camelCase / snake / kebab 归一后匹配密码/凭据/密钥词集）
 * 非敏感字段（username/email/search 等）不受影响（FR-024 尾句）。
 *
 * 本文件零 DOM/lgdl/react import（NFR-001），纯数据函数 node 可测。
 */

/** 可判定敏感字段的最小属性面（platform-dom/collect 读取到的表单控件元数据）。 */
export interface FieldIdentity {
  /** 控件 type 属性（input 等；如 'password' / 'text' / 'email'）。 */
  type?: string;
  /** name 属性。 */
  name?: string;
  /** id 属性。 */
  id?: string;
  /** autocomplete 属性（HTML 标准 token，可含空格分隔多值）。 */
  autocomplete?: string;
}

/** 敏感命中规则来源。 */
export type SensitiveRule = 'type' | 'autocomplete' | 'name-id';

/** 敏感分类标签。 */
export type SensitiveKind = 'password' | 'credential' | 'otp' | 'card';

/** 敏感命中详情（读侧脱敏展示 / 写侧 ask 文案 / 审计共用）。 */
export interface SensitiveMatch {
  /** 命中规则来源。 */
  rule: SensitiveRule;
  /** 命中的原始特征（type/autocomplete/name 或 id 的原值）。 */
  source: string;
  /** 命中词元/特征（如 'password'、'current-password'、'card'）。 */
  match: string;
  /** 归一分类标签。 */
  kind: SensitiveKind;
}

/** autocomplete 凭据 token → 分类（HTML 标准敏感面）。 */
const AUTOCOMPLETE_KIND: Record<string, SensitiveKind> = {
  'current-password': 'password',
  'new-password': 'password',
  'one-time-code': 'otp',
  'cc-number': 'card',
  'cc-csc': 'card',
  'cc-exp': 'card',
  'cc-exp-month': 'card',
  'cc-exp-year': 'card',
  'cc-name': 'card',
  'cc-type': 'card',
};

/** name/id 凭据词元 → 分类（启发式词集；保守取向宁可遮不可漏）。 */
const NAME_ID_KIND: Record<string, SensitiveKind> = {
  password: 'password',
  passwd: 'password',
  pwd: 'password',
  passcode: 'password',
  passphrase: 'password',
  pin: 'password',
  secret: 'credential',
  token: 'credential',
  credential: 'credential',
  credentials: 'credential',
  apikey: 'credential',
  key: 'credential',
  otp: 'otp',
  totp: 'otp',
  card: 'card',
  cardnumber: 'card',
  creditcard: 'card',
  cvv: 'card',
  cvc: 'card',
  pan: 'card',
  securitycode: 'card',
};

/** 敏感 autocomplete token 清单（公开只读；测试/文档/后续策略引用）。 */
export const SENSITIVE_AUTOCOMPLETE_TOKENS: readonly string[] = Object.keys(AUTOCOMPLETE_KIND);
/** 敏感 name/id 凭据词元清单（公开只读；测试/文档/后续策略引用）。 */
export const SENSITIVE_NAME_ID_TOKENS: readonly string[] = Object.keys(NAME_ID_KIND);

/** 分类严重度（多信号并存时取最高；password 最高）。 */
const KIND_SEVERITY: Record<SensitiveKind, number> = { password: 0, otp: 1, card: 2, credential: 3 };
/** 规则强度（同分类时 type > autocomplete > name-id）。 */
const RULE_SEVERITY: Record<SensitiveRule, number> = { type: 0, autocomplete: 1, 'name-id': 2 };

/**
 * name/id 归一为词元：camelCase 拆分 + 小写 + 非字母数字分隔 + 去首尾数字。
 * 例：'currentPassword' → ['current','password']；'user_pass' → ['user','pass']；
 *     'cardNumber2' → ['card','number']；'apiKey' → ['api','key']。
 */
function tokenizeIdentifier(s: string): string[] {
  const camelSplit = s.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return camelSplit
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((t) => t.replace(/^\d+|\d+$/g, ''))
    .filter((t) => t.length > 0);
}

function bestOf(candidates: SensitiveMatch[]): SensitiveMatch | null {
  if (candidates.length === 0) return null;
  candidates.sort(
    (a, b) => KIND_SEVERITY[a.kind] - KIND_SEVERITY[b.kind] || RULE_SEVERITY[a.rule] - RULE_SEVERITY[b.rule],
  );
  return candidates[0];
}

/** 单来源（name 或 id）identifier 内取最严重词元命中。 */
function bestIdentifierMatch(source: string): SensitiveMatch | null {
  const hits: SensitiveMatch[] = [];
  for (const tok of tokenizeIdentifier(source)) {
    const kind = NAME_ID_KIND[tok];
    if (kind) hits.push({ rule: 'name-id', source, match: tok, kind });
  }
  return bestOf(hits);
}

/**
 * 判定字段是否敏感并返回命中详情（无命中 = null = 非敏感）。
 * 信号强度顺序：type=password → autocomplete token → name/id 词元启发式。
 */
export function sensitiveFieldMatch(field: FieldIdentity): SensitiveMatch | null {
  const candidates: SensitiveMatch[] = [];

  const typeRaw = field.type?.trim();
  if (typeRaw) {
    const t = typeRaw.toLowerCase();
    if (t === 'password') {
      candidates.push({ rule: 'type', source: typeRaw, match: 'type=password', kind: 'password' });
    }
  }

  const autoRaw = field.autocomplete?.trim();
  if (autoRaw) {
    const hits: SensitiveMatch[] = [];
    for (const tokRaw of autoRaw.split(/[\s,]+/)) {
      const kind = AUTOCOMPLETE_KIND[tokRaw.toLowerCase()];
      if (kind) hits.push({ rule: 'autocomplete', source: autoRaw, match: tokRaw.toLowerCase(), kind });
    }
    const best = bestOf(hits);
    if (best) candidates.push(best);
  }

  if (field.name) {
    const m = bestIdentifierMatch(field.name);
    if (m) candidates.push(m);
  }
  if (field.id) {
    const m = bestIdentifierMatch(field.id);
    if (m) candidates.push(m);
  }

  return bestOf(candidates);
}

/** 便捷布尔：字段是否敏感（sensitiveFieldMatch 不为 null）。 */
export function isSensitiveField(field: FieldIdentity): boolean {
  return sensitiveFieldMatch(field) !== null;
}

// ---------- 读侧脱敏（FR-024/EC-005：值不回显，占位/长度/类型代替） ----------

export const MASKED_CHAR = '•';
/** 占位串最大长度（超长值截断为 24 + 省略号，仍以数字给出真实长度）。 */
export const MASK_PLACEHOLDER_MAX = 24;

/**
 * 敏感值脱敏为展示串：输出只含「分类 kind + 长度 + 占位符」，**绝不含明文**。
 * @param value 原始值（仅用于取长度，不回显内容）
 * @param kind  分类标签（type=password / 凭据词元等；缺省 '敏感字段'）
 */
export function maskValue(value: string, kind = '敏感字段'): string {
  const len = value.length;
  if (len === 0) return `${kind}：值已脱敏（空）`;
  const shown = Math.min(len, MASK_PLACEHOLDER_MAX);
  const dots = MASKED_CHAR.repeat(shown) + (len > shown ? '…' : '');
  return `${kind}：值已脱敏 · ${len} 位 · ${dots}`;
}

// ---------- 写侧策略（FR-024/ADR-004：默认 ask + 场景 trusted 声明） ----------

export type SensitiveWriteDecision =
  | { sensitive: true; defaultAction: 'ask'; requiresTrusted: true; match: SensitiveMatch }
  | { sensitive: false; defaultAction: 'allow' };

/**
 * 写侧纯数据裁决：敏感字段写入默认 ask 且要求场景显式 trusted 声明（FR-024/ADR-004）；
 * 非敏感字段无附加敏感档提升（其写风险由子命令级 risk 面另行裁决）。执行面由
 * router 子命令级 risk + 场景策略承接，本函数为裁决所需的事实函数。
 */
export function sensitiveWriteDecision(field: FieldIdentity): SensitiveWriteDecision {
  const match = sensitiveFieldMatch(field);
  return match
    ? { sensitive: true, defaultAction: 'ask', requiresTrusted: true, match }
    : { sensitive: false, defaultAction: 'allow' };
}

/** 读侧策略说明（帮助/AskDialog 文案复用；FR-024/EC-005）。 */
export const SENSITIVE_READ_NOTE =
  '敏感字段（password/凭据/密钥）值在读取/回显/采集时一律脱敏（占位/长度/类型代替，FR-024/EC-005）；审计与日志不回显敏感值；非敏感字段不受影响。';

/** 写侧策略说明（帮助/AskDialog 敏感写入确认文案复用；FR-024/ADR-004）。 */
export const SENSITIVE_WRITE_NOTE =
  '敏感字段（password/凭据/密钥）写入默认 ask，并需场景显式 trusted 声明后放行（FR-024/ADR-004）；审计与日志不回显敏感值。';

// ================= v4 FR-006 扩展：通用文本/URL/header 面脱敏函数族（ADR-006，TASK-002） =================
// 纯函数追加（既有表单字段模型零改动，v3 FR-024 零回归）；掩码/长度占位/类型替代三态沿 maskValue。

/** 掩码/占位三态（沿 v3 maskValue：掩码字符 / 长度占位 / 类型替代）。 */
export type TextMaskMode = 'mask' | 'length' | 'type';

/** 文本/URL/header 脱敏策略（缺省保守：mode=mask）。 */
export interface TextMaskPolicy {
  mode?: TextMaskMode;
}

/** 缺省保守策略（各文本面可配；未配时按本常量）。 */
export const DEFAULT_TEXT_MASK_POLICY: TextMaskPolicy = { mode: 'mask' };

/** URL 查询串敏感参数名（小写；保守取向 token/key/sign/凭据词元，宁可遮不可漏 FR-024）。 */
export const SENSITIVE_URL_PARAM_NAMES: readonly string[] = [
  'token', 'access_token', 'id_token', 'refresh_token', 'key', 'api_key', 'apikey',
  'sign', 'sig', 'signature', 'secret', 'client_secret', 'password', 'passwd', 'pwd',
  'auth', 'authorization', 'x-api-key', 'session', 'sessionid', 'sid', 'code',
  'credential', 'private_key', 'appsecret', 'cvv', 'card', 'pan', 'otp',
];

/** 敏感请求/响应 header 名（小写；authorization/cookie/x-api-key/proxy-authorization 等）。 */
export const SENSITIVE_HEADER_NAMES: readonly string[] = [
  'authorization', 'cookie', 'x-api-key', 'proxy-authorization', 'set-cookie', 'proxy-authenticate',
];

/** 键入负载策略（FR-006/ADR-005：keydown/input 负载**不含明文值回显** —— key 名 + 修饰键布尔）。 */
export const TYPING_PAYLOAD_POLICY = {
  /** 负载含按键 key 名（Enter/Tab/ArrowUp…）。 */
  keyName: true,
  /** 负载含修饰键布尔（ctrl/shift/alt/meta）。 */
  modifiers: true,
  /** 负载不含明文按键值（字符回显 = false）。 */
  plaintextValue: false,
  /** 负载不含 input 目标字段明文值（敏感字段掩码经 maskValue）。 */
  plaintextFieldValue: false,
} as const;

/** console 文本脱敏策略常量（缺省保守；可配 override）。 */
export const CONSOLE_TEXT_POLICY: TextMaskPolicy = { mode: 'mask' };
/** 对话框文本脱敏策略常量（缺省保守）。 */
export const DIALOG_TEXT_POLICY: TextMaskPolicy = { mode: 'mask' };
/** 富剪贴板文本脱敏策略常量（缺省保守）。 */
export const RICH_CLIPBOARD_TEXT_POLICY: TextMaskPolicy = { mode: 'mask' };

/** 掩码/占位渲染（不含明文；mode=mask 固定 3 掩码字符 / length 长度位 / type 类型替代）。 */
export function maskByMode(value: string, mode: TextMaskMode = 'mask', kind = '敏感'): string {
  if (value.length === 0) return value;
  if (mode === 'length') return `[${kind} ${value.length} 位]`;
  if (mode === 'type') return `[${kind}]`;
  return `${MASKED_CHAR.repeat(3)}`;
}

/**
 * URL 查询串脱敏（FR-006/ADR-006/EC-003）：token/key/sign 等敏感查询参数值掩码，
 * 非敏感参数与 path/hash 不受影响。纯字符串处理（相对 URL 亦可），无 URL 全局依赖。
 */
export function redactUrlQuery(url: string): string {
  const hashIdx = url.indexOf('#');
  const hash = hashIdx >= 0 ? url.slice(hashIdx) : '';
  const noHash = hashIdx >= 0 ? url.slice(0, hashIdx) : url;
  const qIdx = noHash.indexOf('?');
  if (qIdx < 0) return url;
  const base = noHash.slice(0, qIdx);
  const query = noHash.slice(qIdx + 1);
  if (query === '') return url;
  const parts = query.split('&').map((pair) => {
    if (pair === '') return pair;
    const eq = pair.indexOf('=');
    const name = eq >= 0 ? pair.slice(0, eq) : pair;
    const value = eq >= 0 ? pair.slice(eq + 1) : '';
    const nameKey = name.toLowerCase().replace(/\[\]$/, '');
    if (SENSITIVE_URL_PARAM_NAMES.includes(nameKey)) {
      return eq >= 0 ? `${name}=${maskByMode(value, 'mask', '已脱敏')}` : `${name}=`;
    }
    return pair;
  });
  return `${base}?${parts.join('&')}${hash}`;
}

/** header 名是否敏感（authorization/cookie/x-api-key/proxy-authorization；大小写不敏感）。 */
export function isSensitiveHeader(name: string): boolean {
  return SENSITIVE_HEADER_NAMES.includes(name.trim().toLowerCase());
}

/** header 值脱敏（敏感名命中才掩码；非敏感头原样返回 —— 不进敏感路径）。 */
export function maskHeaderValue(name: string, value: string, policy: TextMaskPolicy = DEFAULT_TEXT_MASK_POLICY): string {
  if (!isSensitiveHeader(name)) return value;
  return maskByMode(value, policy.mode ?? 'mask', name.trim().toLowerCase());
}

/** 敏感 key 词元判定（text= 面 / key=value 启发式共用；小写归一词元）。 */
function isSensitiveKeyToken(key: string): boolean {
  const k = key.trim().toLowerCase();
  const toks = tokenizeIdentifier(k);
  if (toks.length === 0) return false;
  // 精确名优先（header/url 参数集合）
  if (SENSITIVE_HEADER_NAMES.includes(k) || SENSITIVE_URL_PARAM_NAMES.includes(k)) return true;
  // 词元启发式：任一 token 命中敏感词集（password/token/secret/key/apikey/cvv…）即保守命中
  return toks.some((t) => NAME_ID_KIND[t] !== undefined);
}

/**
 * 通用文本负载脱敏（FR-006/ADR-006）：启发式命中三类形态并掩码 ——
 *   ① key=value / key: value / key = value（key 敏感 → 掩码 value，非敏感 key 原样）
 *   ② Bearer <token>（大小写不敏感；token 掩码）
 *   ③ JSON 键值 `"key":"value"` / `'key':'value'`（key 敏感 → 掩码 value）
 * 未命中形态的普通文本原样返回（不误伤非敏感内容）。
 */
export function maskTextPayload(text: string, policy: TextMaskPolicy = DEFAULT_TEXT_MASK_POLICY): string {
  const mode = policy.mode ?? 'mask';
  let out = text;

  // ① key=value / key: value / key = value（key 敏感 → 掩码 value；值为字面 "Bearer" 时跳过，
  //    交给 ② 整体掩码 token —— 避免 "Authorization: Bearer x" 把 Bearer 前缀遮掉）
  out = out.replace(/(\b[A-Za-z_][A-Za-z0-9_\-\.\[\]]*)(\s*[:=]\s*)([^\s,;&"'`]+)/g, (_all, key: string, sep: string, val: string) => {
    if (!isSensitiveKeyToken(String(key))) return _all;
    if (String(val).toLowerCase() === 'bearer') return _all;
    const masked = maskByMode(String(val), mode, String(key));
    return `${key}${sep}${masked}`;
  });

  // ② Bearer <token>（大小写不敏感；token 掩码）
  out = out.replace(/(\bbearer\s+)([A-Za-z0-9_\-\.=~+/]+)/gi, (_all, head: string, val: string) => {
    if (String(val).startsWith(MASKED_CHAR)) return _all; // 幂等：已掩码不再处理
    return `${head}${maskByMode(String(val), mode, 'token')}`;
  });

  // ③ JSON 形态 "key":"value"（key 敏感）
  out = out.replace(/(["'])([A-Za-z_][A-Za-z0-9_\-\.\[\]]*)(["']\s*:\s*["'])([^"']*)(["'])/g, (_all, q1: string, key: string, q2: string, val: string, q3: string) => {
    if (!isSensitiveKeyToken(String(key))) return _all;
    return `${q1}${key}${q2}${maskByMode(String(val), mode, String(key))}${q3}`;
  });

  return out;
}

/** v4 脱敏说明（帮助/AskDialog 文案复用；FR-006/ADR-006）。 */
export const SENSITIVE_V4_NOTE =
  'v4 敏感面（FR-006）：cookie 值/URL 查询串 token·key·sign 参数/敏感 header/键入内容/console·对话框文本/富剪贴板 一律缺省脱敏（掩码/长度占位/类型替代）；明细获取需 trusted + ask；审计与日志零明文。';
