import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isSensitiveField,
  sensitiveFieldMatch,
  sensitiveWriteDecision,
  maskValue,
  MASKED_CHAR,
  MASK_PLACEHOLDER_MAX,
  SENSITIVE_READ_NOTE,
  SENSITIVE_WRITE_NOTE,
  SENSITIVE_AUTOCOMPLETE_TOKENS,
  SENSITIVE_NAME_ID_TOKENS,
  type FieldIdentity,
  type SensitiveMatch,
} from './sensitive.js';
import {
  redactUrlQuery,
  isSensitiveHeader,
  maskHeaderValue,
  maskTextPayload,
  maskByMode,
  SENSITIVE_URL_PARAM_NAMES,
  SENSITIVE_HEADER_NAMES,
  TYPING_PAYLOAD_POLICY,
  CONSOLE_TEXT_POLICY,
  DIALOG_TEXT_POLICY,
  RICH_CLIPBOARD_TEXT_POLICY,
  SENSITIVE_V4_NOTE,
  type TextMaskPolicy,
} from './sensitive.js';

function hit(field: FieldIdentity): SensitiveMatch | null {
  return sensitiveFieldMatch(field);
}

// ---- type=password 分类（最强信号）----

test('sensitive: type=password is sensitive via type rule', () => {
  const m = hit({ type: 'password', name: 'pwd' });
  assert.ok(m);
  if (m) {
    assert.equal(m.rule, 'type');
    assert.equal(m.kind, 'password');
    assert.equal(m.match, 'type=password');
  }
  assert.equal(isSensitiveField({ type: 'password' }), true);
});

test('sensitive: type matching is case-insensitive, source preserves original', () => {
  const m = hit({ type: 'PASSWORD' });
  assert.ok(m);
  if (m) {
    assert.equal(m.rule, 'type');
    assert.equal(m.source, 'PASSWORD');
    assert.equal(m.kind, 'password');
  }
});

test('sensitive: type=text / ordinary fields are not sensitive', () => {
  assert.equal(isSensitiveField({ type: 'text', name: 'q' }), false);
  assert.equal(isSensitiveField({ type: 'email', name: 'email' }), false);
  assert.equal(isSensitiveField({}), false);
  assert.equal(isSensitiveField({ type: 'checkbox', name: 'remember' }), false);
});

// ---- autocomplete 凭据 token（标准敏感面）----

test('sensitive: autocomplete credential tokens classify', () => {
  const cases: Array<[string, string]> = [
    ['current-password', 'password'],
    ['new-password', 'password'],
    ['one-time-code', 'otp'],
    ['cc-number', 'card'],
    ['cc-csc', 'card'],
    ['cc-exp', 'card'],
  ];
  for (const [token, kind] of cases) {
    const m = hit({ autocomplete: token });
    assert.ok(m, `expected sensitive for autocomplete=${token}`);
    if (m) {
      assert.equal(m.rule, 'autocomplete');
      assert.equal(m.kind, kind);
      assert.equal(m.match, token);
    }
  }
});

test('sensitive: autocomplete multi-token string detects embedded credential token', () => {
  const m = hit({ autocomplete: 'username current-password' });
  assert.ok(m);
  if (m) {
    assert.equal(m.rule, 'autocomplete');
    assert.equal(m.match, 'current-password');
    assert.equal(m.source, 'username current-password');
  }
});

test('sensitive: non-credential autocomplete (off/username) is not sensitive', () => {
  assert.equal(isSensitiveField({ autocomplete: 'off' }), false);
  assert.equal(isSensitiveField({ autocomplete: 'username' }), false);
  assert.equal(isSensitiveField({ autocomplete: 'name' }), false);
});

test('sensitive: exported token lists cover mapped tokens', () => {
  for (const tok of ['current-password', 'new-password', 'one-time-code', 'cc-number']) {
    assert.ok(SENSITIVE_AUTOCOMPLETE_TOKENS.includes(tok));
  }
  for (const tok of ['password', 'token', 'apikey', 'cvv', 'otp']) {
    assert.ok(SENSITIVE_NAME_ID_TOKENS.includes(tok));
  }
});

// ---- name/id 凭据词元启发式 ----

test('sensitive: name/id credential heuristics (camel/snake/kebab/trailing digits)', () => {
  const cases: Array<[FieldIdentity, string, string]> = [
    [{ name: 'user_password' }, 'name-id', 'password'],
    [{ name: 'password' }, 'name-id', 'password'],
    [{ name: 'passwd' }, 'name-id', 'password'],
    [{ name: 'passcode123' }, 'name-id', 'password'],
    [{ id: 'currentPassword' }, 'name-id', 'password'],
    [{ name: 'apiKey' }, 'name-id', 'credential'],
    [{ name: 'secret_token' }, 'name-id', 'credential'],
    [{ name: 'otpCode' }, 'name-id', 'otp'],
    [{ id: 'card_number' }, 'name-id', 'card'],
    [{ name: 'creditCardNumber' }, 'name-id', 'card'],
    [{ name: 'cvv2' }, 'name-id', 'card'],
  ];
  for (const [field, rule, kind] of cases) {
    const m = hit(field);
    assert.ok(m, `expected sensitive for ${JSON.stringify(field)}`);
    if (m) {
      assert.equal(m.rule, rule, `rule for ${JSON.stringify(field)}`);
      assert.equal(m.kind, kind, `kind for ${JSON.stringify(field)}`);
    }
  }
});

test('sensitive: non-credential name/id are unaffected (FR-024 tail)', () => {
  const ordinary: FieldIdentity[] = [
    { name: 'username' },
    { id: 'emailAddr' },
    { name: 'firstName' },
    { name: 'search' },
    { name: 'rememberMe' },
    { name: 'keywords' },
  ];
  for (const f of ordinary) {
    assert.equal(isSensitiveField(f), false, `expected non-sensitive for ${JSON.stringify(f)}`);
    assert.equal(sensitiveFieldMatch(f), null);
  }
});

test('sensitive: multiple signals pick the most severe kind (type > autocomplete > name-id)', () => {
  // type=password beats a non-secret-looking name
  const a = hit({ type: 'password', name: 'username' });
  assert.ok(a && a.rule === 'type' && a.kind === 'password');
  // autocomplete credential beats an unrelated name
  const b = hit({ autocomplete: 'cc-number', name: 'cardInput' });
  assert.ok(b && b.rule === 'autocomplete' && b.kind === 'card');
});

// ---- 读侧脱敏（FR-024/EC-005：无明文）----

test('sensitive: maskValue reveals no plaintext and reports kind/length only', () => {
  const secret = 'S3cr3t!P@ss';
  const masked = maskValue(secret, 'password');
  assert.ok(!masked.includes(secret), `masked must not contain plaintext: ${masked}`);
  assert.match(masked, /password/);
  assert.match(masked, /值已脱敏/);
  assert.match(masked, new RegExp(`${secret.length} 位`));
  const dots = masked.split(MASKED_CHAR).length - 1;
  assert.equal(dots, Math.min(secret.length, MASK_PLACEHOLDER_MAX));
});

test('sensitive: maskValue handles empty and over-long values', () => {
  const empty = maskValue('', 'password');
  assert.match(empty, /空/);
  assert.ok(!empty.includes(MASKED_CHAR));
  const long = maskValue('x'.repeat(40), 'token');
  assert.match(long, /40 位/);
  assert.match(long, /…/);
  assert.equal(long.split(MASKED_CHAR).length - 1, MASK_PLACEHOLDER_MAX);
});

test('sensitive: maskValue defaults kind to generic label', () => {
  const masked = maskValue('abc');
  assert.match(masked, /敏感字段/);
  assert.ok(!masked.includes('abc'));
});

test('sensitive: aggregate mask output contains no plaintext across kinds (grep assertion)', () => {
  const secret = 'hunter2-credit-4242';
  const outputs = [
    maskValue(secret, 'password'),
    maskValue(secret, 'credential'),
    maskValue(secret, 'card'),
    maskValue(secret, 'otp'),
    SENSITIVE_READ_NOTE,
    SENSITIVE_WRITE_NOTE,
  ].join('\n');
  assert.ok(!outputs.includes(secret), 'no plaintext anywhere in masked output');
});

// ---- 写侧策略（FR-024/ADR-004：ask + trusted）----

test('sensitive: sensitive write decision = ask + requiresTrusted', () => {
  const d = sensitiveWriteDecision({ type: 'password', name: 'loginPassword' });
  assert.equal(d.sensitive, true);
  if (d.sensitive) {
    assert.equal(d.defaultAction, 'ask');
    assert.equal(d.requiresTrusted, true);
    assert.equal(d.match.kind, 'password');
  }
});

test('sensitive: non-sensitive write decision = allow (no extra sensitive gate)', () => {
  const d = sensitiveWriteDecision({ type: 'text', name: 'username' });
  assert.deepEqual(d, { sensitive: false, defaultAction: 'allow' });
});

// ---- 帮助文案（AskDialog/help 复用）----

test('sensitive: read/write notes encode FR-024 policy wording', () => {
  assert.match(SENSITIVE_READ_NOTE, /脱敏/);
  assert.match(SENSITIVE_READ_NOTE, /FR-024/);
  assert.match(SENSITIVE_WRITE_NOTE, /ask/);
  assert.match(SENSITIVE_WRITE_NOTE, /trusted/);
  assert.match(SENSITIVE_WRITE_NOTE, /FR-024/);
});

// ================= v4 FR-006 脱敏函数族（ADR-006/TASK-002） =================

// ---- redactUrlQuery（URL 查询串 token/key/sign 掩码） ----

test('sensitive v4: redactUrlQuery 掩码 token/key/sign 参数，非敏感参数不受影响（FR-006/EC-003）', () => {
  const cases: Array<[string, string]> = [
    ['https://a.com/x?token=SECRET123&name=alice', 'https://a.com/x?token=•••&name=alice'],
    ['/api?api_key=k123&page=2&sign=abc', '/api?api_key=•••&page=2&sign=•••'],
    ['https://a.com/p?key=xyz&q=hi#sec', 'https://a.com/p?key=•••&q=hi#sec'],
  ];
  for (const [input, expected] of cases) {
    const out = redactUrlQuery(input);
    assert.equal(out, expected);
    assert.ok(!out.includes('SECRET123') && !out.includes('k123') && !out.includes('xyz'), `no plaintext in ${out}`);
  }
});

test('sensitive v4: redactUrlQuery 无查询串/无敏感参数原样返回（不误伤）', () => {
  assert.equal(redactUrlQuery('https://a.com/path'), 'https://a.com/path');
  assert.equal(redactUrlQuery('https://a.com/p?q=hello&page=2'), 'https://a.com/p?q=hello&page=2');
  assert.equal(redactUrlQuery(''), '');
  assert.ok(SENSITIVE_URL_PARAM_NAMES.includes('token'));
  assert.ok(SENSITIVE_URL_PARAM_NAMES.includes('sign'));
});

// ---- isSensitiveHeader + maskHeaderValue ----

test('sensitive v4: isSensitiveHeader 命中 authorization/cookie/x-api-key/proxy-authorization', () => {
  for (const name of ['authorization', 'cookie', 'x-api-key', 'proxy-authorization', 'Authorization', 'COOKIE']) {
    assert.equal(isSensitiveHeader(name), true, `expected sensitive: ${name}`);
  }
  for (const name of ['content-type', 'accept', 'user-agent', 'x-request-id']) {
    assert.equal(isSensitiveHeader(name), false, `expected non-sensitive: ${name}`);
  }
  assert.ok(SENSITIVE_HEADER_NAMES.includes('authorization'));
  assert.ok(SENSITIVE_HEADER_NAMES.includes('cookie'));
  assert.ok(SENSITIVE_HEADER_NAMES.includes('x-api-key'));
  assert.ok(SENSITIVE_HEADER_NAMES.includes('proxy-authorization'));
});

test('sensitive v4: maskHeaderValue 掩码/长度占位/类型替代三态，不含明文；非敏感头原样', () => {
  const secret = 'Bearer eyJhbGciOiJIUzI1NiJ9';
  const masked = maskHeaderValue('authorization', secret);
  assert.ok(!masked.includes('eyJhbGci'), 'no plaintext');
  assert.match(masked, /•/);
  const len = maskHeaderValue('cookie', secret, { mode: 'length' });
  assert.match(len, /位/);
  const typ = maskHeaderValue('x-api-key', secret, { mode: 'type' });
  assert.ok(!typ.includes('eyJhbGci'));
  assert.equal(maskHeaderValue('content-type', 'application/json'), 'application/json');
});

// ---- maskTextPayload（key=value / Bearer / token: 启发式，三态） ----

test('sensitive v4: maskTextPayload key=value / token: 敏感键掩码，非敏感键不动', () => {
  const out = maskTextPayload('user=alice&password=hunter2&token=abc123&mode=fast');
  assert.ok(!out.includes('hunter2') && !out.includes('abc123'));
  assert.ok(out.includes('user=alice') && out.includes('mode=fast'));
  assert.match(out, /password=•••/);
  assert.match(out, /token=•••/);
  const colon = maskTextPayload('token: xyz-789');
  assert.ok(!colon.includes('xyz-789'));
});

test('sensitive v4: maskTextPayload Bearer 掩码 + 大小写不敏感', () => {
  const out = maskTextPayload('Authorization: Bearer AAA.BBB.CCC done');
  assert.ok(!out.includes('AAA.BBB.CCC'));
  assert.match(out, /Bearer •••/);
  const lower = maskTextPayload('bearer token123');
  assert.ok(!lower.includes('token123'));
});

test('sensitive v4: maskTextPayload JSON 键值 + 三态 + 幂等（不重复掩码）', () => {
  const json = '{"token":"SECRET","name":"alice","password":"pw1"}';
  const out = maskTextPayload(json);
  assert.ok(!out.includes('SECRET') && !out.includes('pw1'));
  assert.ok(out.includes('"name":"alice"'));
  // 幂等：对已掩码结果再跑一次不改变
  assert.equal(maskTextPayload(out), out);
  const len = maskTextPayload('password=123456', { mode: 'length' });
  assert.match(len, /位/);
  const typ = maskTextPayload('password=123456', { mode: 'type' });
  assert.ok(!typ.includes('123456'));
});

test('sensitive v4: 普通文本（无敏感形态）原样返回', () => {
  const text = 'hello world, this is a normal sentence with spaces';
  assert.equal(maskTextPayload(text), text);
});

// ---- 键入负载策略 / 文本面策略常量 ----

test('sensitive v4: 键入负载策略不含明文值回显（key 名 + 修饰键布尔，FR-006）', () => {
  assert.equal(TYPING_PAYLOAD_POLICY.keyName, true);
  assert.equal(TYPING_PAYLOAD_POLICY.modifiers, true);
  assert.equal(TYPING_PAYLOAD_POLICY.plaintextValue, false);
  assert.equal(TYPING_PAYLOAD_POLICY.plaintextFieldValue, false);
});

test('sensitive v4: console/对话框/富剪贴板文本脱敏策略常量存在且缺省保守', () => {
  for (const p of [CONSOLE_TEXT_POLICY, DIALOG_TEXT_POLICY, RICH_CLIPBOARD_TEXT_POLICY] as TextMaskPolicy[]) {
    assert.equal(p.mode, 'mask');
  }
  assert.match(SENSITIVE_V4_NOTE, /FR-006/);
});

// ---- maskByMode 三态（沿 v3 maskValue） ----

test('sensitive v4: maskByMode mask/length/type 三态无明文', () => {
  const v = 'S3cr3t!';
  assert.ok(!maskByMode(v, 'mask').includes(v));
  assert.match(maskByMode(v, 'length'), /位/);
  assert.ok(!maskByMode(v, 'type').includes(v));
});
