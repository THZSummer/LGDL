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
