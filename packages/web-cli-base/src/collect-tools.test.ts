/**
 * collect-tools.test.ts —— extract/export 工具单测（FR-038~042 / ADR-006 / EC-002/011/012）。
 *
 * 覆盖：extract（fake ops 注入 JSON 行 → buffer 只回摘要/数据不进 output；list fields
 * 透传；meta 来源上下文；空集非错误；定位语法错误 EC-002；限速预检 ops 未被调用；
 * over-cap 中止保留已采 EC-011；未注入/失败转译）→ export（text/json/csv 三格式 +
 * RFC4180 转义 + 元数据头 + xlsx 指引/注入扩展点 + 落盘两路 save/download + 降级内容
 * EC-012 + trust 元数据 + 敏感脱敏无明文）→ dispatch 级 risk 断言（read 免 ask / write 可 deny）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PlatformDomOps, PlatformEnv, PlatformFilePicker } from './platform.js';
import { nodeEnv } from './platform.js';
import { createCommandRouter } from './router.js';
import type { WebCliToolCall } from './llm.js';
import { createCollectBuffer } from './collect.js';
import type { CollectRow } from './collect.js';
import {
  createExtractToolEntry,
  createExportToolEntry,
  createCollectToolEntries,
  csvEscapeCell,
  serializeRowsCsv,
  parseExtractedOutput,
  extractHelp,
  exportHelp,
} from './collect-tools.js';

function tc(name: string, args: Record<string, string> = {}, subcommand = ''): WebCliToolCall {
  return { id: 'call-1', name, subcommand, args, rawArguments: JSON.stringify(args) };
}

/** fake ops 基座（7 既有方法桩；extract 测试覆写 extractData）。 */
function stubOps(): PlatformDomOps {
  return {
    readState: async () => ({ ok: false, output: 'stub' }),
    click: async () => ({ ok: false, output: 'stub' }),
    hover: async () => ({ ok: false, output: 'stub' }),
    scroll: async () => ({ ok: false, output: 'stub' }),
    zoom: async () => ({ ok: false, output: 'stub' }),
    fullscreen: async () => ({ ok: false, output: 'stub' }),
    snapshot: async () => ({ ok: false, output: 'stub' }),
  };
}

interface ExtractCall {
  kind: string;
  selector?: string;
  fields?: Record<string, string>;
  maxItems?: number;
}

/** extract env：nodeEnv + fake extractData（记录调用） + 来源 URL。 */
function makeExtractEnv(over: {
  url?: string;
  rows?: CollectRow[];
  extractData?: PlatformDomOps['extractData'];
} = {}): { env: PlatformEnv; calls: ExtractCall[]; buffer: ReturnType<typeof createCollectBuffer> } {
  const calls: ExtractCall[] = [];
  const rows = over.rows ?? [];
  const ops: PlatformDomOps = {
    ...stubOps(),
    extractData:
      over.extractData ??
      (async (o) => {
        calls.push(o as ExtractCall);
        return { ok: true, output: JSON.stringify(rows) };
      }),
  };
  const env: PlatformEnv = {
    ...nodeEnv(),
    dom: { ops, state: { snapshot: async () => ({ url: over.url ?? 'https://shop.example/list' }) } },
  };
  return { env, calls, buffer: createCollectBuffer({ minAppendIntervalMs: 0 }) };
}

function makePicker(over: Partial<PlatformFilePicker> = {}): { picker: PlatformFilePicker; calls: { op: 'save' | 'download'; name: string; data: string | Blob }[] } {
  const calls: { op: 'save' | 'download'; name: string; data: string | Blob }[] = [];
  const picker: PlatformFilePicker = {
    save: async (o) => {
      calls.push({ op: 'save', name: o.suggestedName, data: o.data });
      return { ok: true };
    },
    download: async (o) => {
      calls.push({ op: 'download', name: o.filename, data: o.data });
    },
    ...over,
  };
  return { picker, calls };
}

function exportEnvOf(picker: PlatformFilePicker): PlatformEnv {
  return { ...nodeEnv(), filePicker: picker };
}

function textOf(d: string | Blob): string {
  return typeof d === 'string' ? d : '[blob]';
}

// ================= extract =================

test('extract: table 抽取 → buffer 写入，数据不进 output 只回摘要（FR-038/AC-012）', async () => {
  const rows: CollectRow[] = [
    { 产品: 'Alpha', 价格: '10' },
    { 产品: 'Beta', 价格: '20' },
  ];
  const { env, calls, buffer } = makeExtractEnv({ rows });
  const entry = createExtractToolEntry(env, buffer);
  const r = await entry.executor(tc('extract', { kind: 'table', selector: '#data', id: 't1' }), {});
  assert.equal(r.ok, true, r.error);
  assert.match(r.output, /✓ extract table：已采 2 条 → buffer "t1"（累计 2 条）/);
  assert.match(r.output, /来源：https:\/\/shop\.example\/list/);
  assert.match(r.output, /trust：untrusted/);
  // 数据不回传上下文：行内容零回显（提示注入/预算护栏）
  assert.equal(r.output.includes('Alpha'), false);
  assert.equal(r.output.includes('价格'), false);
  assert.deepEqual(calls, [{ kind: 'table', selector: '#data' }]);
  const e = buffer.get('t1');
  assert.ok(e);
  assert.deepEqual(e.rows, rows);
  assert.equal(e.meta.url, 'https://shop.example/list');
  assert.equal(e.meta.trust, 'untrusted');
});

test('extract: list fields JSON 透传 ops + meta 来源为 DOM 面（FR-038/ADR-007）', async () => {
  const rows: CollectRow[] = [{ 标题: '产品A', 价格: '9.9' }];
  const { env, calls, buffer } = makeExtractEnv({ rows });
  const entry = createExtractToolEntry(env, buffer);
  const r = await entry.executor(
    tc('extract', { kind: 'list', selector: '#cards', id: 'l1', fields: '{"标题":"h3 a", "价格":".price"}' }),
    {},
  );
  assert.equal(r.ok, true, r.error);
  assert.match(r.output, /已采 1 条/);
  assert.deepEqual(calls, [{ kind: 'list', selector: '#cards', fields: { 标题: 'h3 a', 价格: '.price' } }]);
  assert.deepEqual(buffer.get('l1')?.rows, rows);
});

test('extract: maxItems 透传 + meta kind 无 selector 亦可（页面元数据）', async () => {
  const { env, calls, buffer } = makeExtractEnv({ rows: [{ title: '页面标题' }] });
  const entry = createExtractToolEntry(env, buffer);
  const r = await entry.executor(tc('extract', { kind: 'meta', id: 'm1', maxItems: '50' }), {});
  assert.equal(r.ok, true, r.error);
  assert.deepEqual(calls, [{ kind: 'meta', maxItems: 50 }]);
  assert.equal(buffer.get('m1')?.rows.length, 1);
});

test('extract: 无匹配返回空集 + 说明（非错误）且不建缓冲条目（FR-038）', async () => {
  const { env, buffer } = makeExtractEnv({ rows: [] });
  const entry = createExtractToolEntry(env, buffer);
  const r = await entry.executor(tc('extract', { kind: 'table', selector: '#empty', id: 'x' }), {});
  assert.equal(r.ok, true);
  assert.match(r.output, /无匹配/);
  assert.match(r.output, /0 条/);
  assert.equal(buffer.has('x'), false);
});

test('extract: 定位语法错误面 —— role=/xpath= 显式不支持，ops 未被调用（EC-002）', async () => {
  const { env, calls, buffer } = makeExtractEnv({ rows: [{ a: 1 }] });
  const entry = createExtractToolEntry(env, buffer);
  const xpath = await entry.executor(tc('extract', { kind: 'table', selector: 'xpath=//div', id: 'x' }), {});
  assert.equal(xpath.ok, false);
  assert.match(xpath.output, /xpath=/);
  assert.match(xpath.output, /不支持/);
  const role = await entry.executor(tc('extract', { kind: 'list', selector: '#l', fields: '{"x":"role=button"}', id: 'y' }), {});
  assert.equal(role.ok, false);
  assert.match(role.output, /字段 "x" 定位错误/);
  assert.equal(calls.length, 0); // 间谍断言：预校验失败未触碰 DOM
});

test('extract: 参数错误可读 —— 未知 kind/缺 selector/缺 fields/非法 fields', async () => {
  const { env, calls, buffer } = makeExtractEnv({ rows: [{ a: 1 }] });
  const entry = createExtractToolEntry(env, buffer);
  const badKind = await entry.executor(tc('extract', { kind: 'row' }), {});
  assert.equal(badKind.ok, false);
  assert.match(badKind.output, /未知 kind/);
  const noSel = await entry.executor(tc('extract', { kind: 'table' }), {});
  assert.equal(noSel.ok, false);
  assert.match(noSel.output, /--selector/);
  const noFields = await entry.executor(tc('extract', { kind: 'list', selector: '#l' }), {});
  assert.equal(noFields.ok, false);
  assert.match(noFields.output, /--fields/);
  const badJson = await entry.executor(tc('extract', { kind: 'list', selector: '#l', fields: 'not-json' }), {});
  assert.equal(badJson.ok, false);
  assert.match(badJson.output, /JSON/);
  const emptyFields = await entry.executor(tc('extract', { kind: 'list', selector: '#l', fields: '{}' }), {});
  assert.equal(emptyFields.ok, false);
  assert.match(emptyFields.output, /字段映射为空/);
  const emptySel = await entry.executor(tc('extract', { kind: 'list', selector: '#l', fields: '{"x":""}' }), {});
  assert.equal(emptySel.ok, false);
  assert.match(emptySel.output, /"x" 的定位为空/);
  assert.equal(calls.length, 0);
});

test('extract: ops 未注入 / op 失败 / 授权异常转译（FR-002/EC-008）', async () => {
  const buffer = createCollectBuffer();
  // nodeEnv 无 extractData → 未注入可读错误
  const bare = createExtractToolEntry(nodeEnv(), buffer);
  const noInj = await bare.executor(tc('extract', { kind: 'table', selector: '#t' }), {});
  assert.equal(noInj.ok, false);
  assert.match(noInj.output, /未注入/);
  // op 返回失败
  const failEnv = makeExtractEnv({
    extractData: async () => ({ ok: false, output: '✖ 表格解析失败：结构不可识别', error: 'parse failed' }),
  });
  const failEntry = createExtractToolEntry(failEnv.env, failEnv.buffer);
  const f = await failEntry.executor(tc('extract', { kind: 'table', selector: '#t' }), {});
  assert.equal(f.ok, false);
  assert.match(f.output, /表格解析失败/);
  // op 抛授权异常 → 转译可读
  const throwEnv = makeExtractEnv({
    extractData: async () => {
      const e = new Error('document gone');
      e.name = 'NotFoundError';
      throw e;
    },
  });
  const tEntry = createExtractToolEntry(throwEnv.env, throwEnv.buffer);
  const t = await tEntry.executor(tc('extract', { kind: 'table', selector: '#t' }), {});
  assert.equal(t.ok, false);
  assert.match(t.output, /DOM 采集/);
  assert.ok(t.error);
});

test('extract: 限速预检在 ops 调用之前 —— 间谍断言第二次未触碰 DOM（FR-042）', async () => {
  const clock = { now: 0 };
  const calls: ExtractCall[] = [];
  const ops: PlatformDomOps = {
    ...stubOps(),
    extractData: async (o) => {
      calls.push(o as ExtractCall);
      return { ok: true, output: JSON.stringify([{ v: 1 }]) };
    },
  };
  const env: PlatformEnv = { ...nodeEnv(), dom: { ops, state: { snapshot: async () => ({ url: 'https://x' }) } } };
  const buffer = createCollectBuffer({ minAppendIntervalMs: 300, now: () => clock.now });
  const entry = createExtractToolEntry(env, buffer);
  const first = await entry.executor(tc('extract', { kind: 'table', selector: '#t', id: 'p' }), {});
  assert.equal(first.ok, true, first.error);
  clock.now = 100;
  const second = await entry.executor(tc('extract', { kind: 'table', selector: '#t', id: 'p' }), {});
  assert.equal(second.ok, false);
  assert.match(second.output, /采集过于频繁/);
  assert.equal(calls.length, 1); // 第二次未调用 ops
});

test('extract: over-cap 中止保留已采数据（EC-011）', async () => {
  const rows: CollectRow[] = [{ v: 1 }, { v: 2 }];
  const { env } = makeExtractEnv({ rows });
  const buf2 = createCollectBuffer({ maxTotalRows: 2, minAppendIntervalMs: 0 });
  const entry2 = createExtractToolEntry(env, buf2);
  const first = await entry2.executor(tc('extract', { kind: 'table', selector: '#t', id: 'c' }), {});
  assert.equal(first.ok, true, first.error);
  const second = await entry2.executor(tc('extract', { kind: 'table', selector: '#t', id: 'c' }), {});
  assert.equal(second.ok, false);
  assert.match(second.output, /已达缓冲总量上限/);
  assert.equal(buf2.get('c')?.rows.length, 2); // 已采数据保留
});

test('extract: 敏感内容采集自动脱敏 —— 导出无明文（FR-024/EC-005/AC-008）', async () => {
  const { env, buffer } = makeExtractEnv({
    rows: [{ user: 'alice', password: 'pw-12345', note: '普通' }],
  });
  const entry = createExtractToolEntry(env, buffer);
  const r = await entry.executor(tc('extract', { kind: 'table', selector: '#t', id: 'sec' }), {});
  assert.equal(r.ok, true, r.error);
  const e = buffer.get('sec');
  assert.ok(e);
  assert.equal(e.rows[0]?.user, 'alice');
  assert.ok(typeof e.rows[0]?.password === 'string' && e.rows[0].password.startsWith('密码'));
  assert.equal(JSON.stringify(e.rows).includes('pw-12345'), false);
  assert.equal(r.output.includes('pw-12345'), false);
});

// ================= export =================

test('export: csv —— RFC4180 表头 + 转义（逗号/引号/换行）落盘（FR-040）', async () => {
  // 先直接断言序列化器（确定性转义）
  assert.equal(csvEscapeCell('plain'), 'plain');
  assert.equal(csvEscapeCell('a,b'), '"a,b"');
  assert.equal(csvEscapeCell('he said "hi"'), '"he said ""hi"""');
  assert.equal(csvEscapeCell('line1\nline2'), '"line1\nline2"');
  assert.equal(
    serializeRowsCsv([
      { name: 'A,公司', note: '他说"hi"\n第二行' },
      { name: 'B', note: 'plain' },
    ]),
    'name,note\r\n"A,公司","他说""hi""\n第二行"\r\nB,plain',
  );
  // 工具链路：buffer → csv 落盘（fake picker）
  const buffer = createCollectBuffer({ minAppendIntervalMs: 0 });
  buffer.append('csv1', [{ name: 'Alice', score: '9' }, { name: 'Bob', score: '10' }], { url: 'https://shop.example/list' });
  const { picker, calls } = makePicker();
  const entry = createExportToolEntry(exportEnvOf(picker), { buffer });
  const r = await entry.executor(tc('export', { id: 'csv1', format: 'csv', filename: 'out.csv' }), {});
  assert.equal(r.ok, true, r.error);
  assert.match(r.output, /✓ 已导出 buffer "csv1" → out\.csv/);
  assert.match(r.output, /RFC4180/);
  assert.match(r.output, /trust：untrusted/);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].op, 'save');
  assert.equal(calls[0].name, 'out.csv');
  assert.equal(textOf(calls[0].data), 'name,score\r\nAlice,9\r\nBob,10');
});

test('export: json —— 元数据头 source/collectedAt/trust + rows（FR-040/042）', async () => {
  const buffer = createCollectBuffer({ minAppendIntervalMs: 0 });
  buffer.append('j', [{ n: 'A', v: 1 }, { n: 'B', v: 2 }], { url: 'https://shop.example/list' });
  const { picker, calls } = makePicker();
  const entry = createExportToolEntry(exportEnvOf(picker), { buffer });
  const r = await entry.executor(tc('export', { id: 'j', format: 'json', filename: 'out.json' }), {});
  assert.equal(r.ok, true, r.error);
  const doc = JSON.parse(textOf(calls[0].data)) as {
    meta: { source: string; collectedAt: number; trust: string; bufferId: string; rowCount: number; fields: string[] };
    fields: string[];
    rows: CollectRow[];
  };
  assert.equal(doc.meta.source, 'https://shop.example/list');
  assert.ok(doc.meta.collectedAt > 0);
  assert.equal(doc.meta.trust, 'untrusted');
  assert.equal(doc.meta.bufferId, 'j');
  assert.equal(doc.meta.rowCount, 2);
  assert.deepEqual(doc.fields, ['n', 'v']);
  assert.deepEqual(doc.rows, [{ n: 'A', v: 1 }, { n: 'B', v: 2 }]);
});

test('export: text —— 逐行 tab 拼接（原样/拼接，FR-040）', async () => {
  const buffer = createCollectBuffer({ minAppendIntervalMs: 0 });
  buffer.append('t', [{ a: '1', b: 'x' }, { a: '2', b: 'y' }]);
  const { picker } = makePicker();
  const entry = createExportToolEntry(exportEnvOf(picker), { buffer });
  const r = await entry.executor(tc('export', { id: 't', format: 'text', filename: 'out.txt' }), {});
  assert.equal(r.ok, true, r.error);
});

test('export: 导出成功只回摘要不回数据（预算/注入护栏）；缺省文件名带时间戳', async () => {
  const buffer = createCollectBuffer({ minAppendIntervalMs: 0 });
  buffer.append('d', [{ 秘密值: '秘密值XYZ-不要回显' }], { url: 'https://host/p' });
  const { picker, calls } = makePicker();
  const entry = createExportToolEntry(exportEnvOf(picker), { buffer });
  const r = await entry.executor(tc('export', { id: 'd', format: 'csv' }), {});
  assert.equal(r.ok, true, r.error);
  assert.equal(r.output.includes('秘密值XYZ-不要回显'), false);
  assert.match(calls[0].name, /^collect-d-\d{8}-\d{6}\.csv$/);
});

test('export: 落盘两路 —— save 手势被拒自动降级下载链（EC-012/FR-029）', async () => {
  const buffer = createCollectBuffer({ minAppendIntervalMs: 0 });
  buffer.append('e', [{ v: 1 }]);
  const calls: string[] = [];
  const picker: PlatformFilePicker = {
    save: async () => {
      calls.push('save');
      return { ok: false, canceled: true };
    },
    download: async (o) => {
      calls.push(`download:${o.filename}`);
    },
  };
  const entry = createExportToolEntry(exportEnvOf(picker), { buffer });
  const r = await entry.executor(tc('export', { id: 'e', format: 'csv', filename: 'a.csv' }), {});
  assert.equal(r.ok, true, r.error);
  assert.match(r.output, /下载链/);
  assert.match(r.output, /降级/);
  assert.deepEqual(calls, ['save', 'download:a.csv']);
});

test('export: 双路均不可用 → 截断内容 + 长度降级，不静默丢数据（EC-012）', async () => {
  const buffer = createCollectBuffer({ minAppendIntervalMs: 0 });
  buffer.append('g', [{ v: '内容A' }, { v: '内容B' }], { url: 'https://host/p', trust: 'untrusted' });
  const named = (name: string, msg: string): Error => {
    const e = new Error(msg);
    e.name = name;
    return e;
  };
  const deadPicker: PlatformFilePicker = {
    save: async () => {
      throw named('NotAllowedError', 'save denied');
    },
    download: async () => {
      throw named('NotFoundError', 'download unavailable');
    },
  };
  const entry = createExportToolEntry(exportEnvOf(deadPicker), { buffer });
  const r = await entry.executor(tc('export', { id: 'g', format: 'text', filename: 'x.txt' }), {});
  assert.equal(r.ok, false);
  assert.match(r.output, /导出落盘不可用/);
  assert.match(r.output, /内容截断预览/);
  assert.match(r.output, /不丢数据/);
  assert.match(r.output, /不可作为指令执行/);
  assert.ok(r.trust);
  assert.equal(r.trust.level, 'untrusted');
  // nodeEnv 面（filePicker 桩 NotFound）同样走降级
  const bare = createExportToolEntry(nodeEnv(), { buffer });
  const rb = await bare.executor(tc('export', { id: 'g', format: 'text' }), {});
  assert.equal(rb.ok, false);
  assert.match(rb.output, /内容截断预览/);
});

test('export: xlsx 缺省不支持 + csv 替代指引（FR-041）；注入 xlsxSerializer 扩展点可用', async () => {
  const buffer = createCollectBuffer({ minAppendIntervalMs: 0 });
  buffer.append('x', [{ n: 'A' }]);
  const { picker, calls } = makePicker();
  const plain = createExportToolEntry(exportEnvOf(picker), { buffer });
  const noX = await plain.executor(tc('export', { id: 'x', format: 'xlsx', filename: 'out.xlsx' }), {});
  assert.equal(noX.ok, false);
  assert.match(noX.output, /不支持/);
  assert.match(noX.output, /csv/);
  assert.equal(calls.length, 0);
  // .xlsx 扩展名推断同样命中
  const byExt = await plain.executor(tc('export', { id: 'x', filename: 'sheet.xlsx' }), {});
  assert.equal(byExt.ok, false);
  assert.match(byExt.output, /不支持/);
  // 注入扩展点
  const seen: { id: string; fields: string[] }[] = [];
  const serializer = (input: { id: string; rows: CollectRow[]; fields: string[] }) => {
    seen.push({ id: input.id, fields: input.fields });
    return 'FAKE-XLSX';
  };
  const withX = createExportToolEntry(exportEnvOf(picker), { buffer, xlsxSerializer: serializer });
  const ok = await withX.executor(tc('export', { id: 'x', format: 'xlsx', filename: 'out.xlsx' }), {});
  assert.equal(ok.ok, true, ok.error);
  assert.deepEqual(seen, [{ id: 'x', fields: ['n'] }]);
  assert.equal(calls[0].op, 'save');
  assert.equal(textOf(calls[0].data), 'FAKE-XLSX');
});

test('export: buffer id 不存在 → 可读错误 + 引导（同 id 采集后导出）', async () => {
  const buffer = createCollectBuffer({ minAppendIntervalMs: 0 });
  const { picker } = makePicker();
  const entry = createExportToolEntry(exportEnvOf(picker), { buffer });
  const noId = await entry.executor(tc('export', { id: 'nope', format: 'csv' }), {});
  assert.equal(noId.ok, false);
  assert.match(noId.output, /先用 extract 采集/);
});

// ================= dispatch / 元数据 / 帮助面 =================

test('collect-tools: ToolEntry 元数据 + dispatch 级 risk（extract read 放行 / export write deny）', async () => {
  const { env: domEnv } = makeExtractEnv({ rows: [{ v: 1 }] });
  const { picker } = makePicker();
  const env: PlatformEnv = { ...domEnv, filePicker: picker }; // extract + export 同一 env
  const buffer = createCollectBuffer({ minAppendIntervalMs: 0 });
  const { extract, export: exp } = createCollectToolEntries(env, buffer);

  // 无策略 router：注册 + 元数据断言
  const router = createCommandRouter({ builtins: false });
  router.register(extract);
  router.register(exp);
  const byName = (n: string) => router.query({ name: n })[0];
  assert.equal(byName('extract').group, 'collect');
  assert.equal(byName('extract').risk, 'read');
  assert.equal(byName('export').group, 'collect');
  assert.equal(byName('export').risk, 'write');
  const ok = await router.dispatch(tc('extract', { kind: 'table', selector: '#t', id: 'd1' }));
  assert.equal(ok.ok, true, ok.output);
  assert.ok(buffer.get('d1'));
  // export 无策略（policyGate 缺省）→ 直接执行（写 risk 由场景策略 ask/deny 面承接）
  const out = await router.dispatch(tc('export', { id: 'd1', format: 'csv', filename: 'd.csv' }));
  assert.equal(out.ok, true, out.output);

  // 策略面：risk write deny → export 拒（执行器不落盘），extract(read) 仍放行
  const gate = createCommandRouter({
    builtins: false,
    policy: { rules: [{ risk: 'write', action: 'deny', note: '落盘禁（测试）' }] },
  });
  gate.register(createExtractToolEntry(env, buffer));
  gate.register(createExportToolEntry(env, { buffer }));
  const denied = await gate.dispatch(tc('export', { id: 'd1', format: 'csv', filename: 'd.csv' }));
  assert.equal(denied.ok, false);
  assert.match(denied.output, /权限被拒/);
  const readOk = await gate.dispatch(tc('extract', { kind: 'meta', id: 'm2' }));
  assert.equal(readOk.ok, true, readOk.output);
});

test('collect-tools: parseExtractedOutput 契约（数组 / {rows,truncated} / 非法）', () => {
  assert.deepEqual(parseExtractedOutput('[{"a":1},{"a":2}]'), {
    ok: true,
    data: { rows: [{ a: 1 }, { a: 2 }], truncated: false },
  });
  assert.deepEqual(parseExtractedOutput('{"rows":[{"b":2}],"truncated":true}'), {
    ok: true,
    data: { rows: [{ b: 2 }], truncated: true },
  });
  assert.deepEqual(parseExtractedOutput(''), { ok: true, data: { rows: [], truncated: false } });
  assert.equal(parseExtractedOutput('not-json').ok, false);
  assert.equal(parseExtractedOutput('"str"').ok, false);
});

test('collect-tools: 帮助面含数据流/语法/护栏/翻页原语/xlsx 边界声明', () => {
  const eh = extractHelp();
  assert.match(eh, /extract/);
  assert.match(eh, /text=|text\*=/);
  assert.match(eh, /role=|xpath=/);
  assert.match(eh, /翻页|AI 编排/);
  assert.match(eh, /护栏|上限|限速/);
  assert.match(eh, /不回传上下文|摘要/);
  const xh = exportHelp();
  assert.match(xh, /RFC4180/);
  assert.match(xh, /元数据头/);
  assert.match(xh, /xlsx|不支持/);
  assert.match(xh, /下载链|降级/);
  assert.match(xh, /trust|untrusted/);
});
