import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDocTools, executeDocRead, executeDocEdit, applyDocEdit } from './doc-tools.js';
import type { DocToolDeps } from './doc-tools.js';
import type { PolicyAction } from './permission.js';
import { createCommandRouter } from './router.js';
import type { WebCliToolCall } from './llm.js';

const SRC = `title: t
nodes:
  - id: a
    label: A
`;

function tc(name: string, args: Record<string, string> = {}, subcommand = ''): WebCliToolCall {
  return { id: 'call-1', name, subcommand, args, rawArguments: JSON.stringify(args) };
}

/** fake doc deps：docId → 内容的内存文档注册表。 */
function makeDeps(initial: Record<string, string> = {}): { deps: DocToolDeps; docs: Map<string, string> } {
  const docs = new Map<string, string>(Object.entries(initial));
  const deps: DocToolDeps = {
    resolve: (docId) => docs.get(docId) ?? null,
    listReadable: () => [...docs.entries()].map(([id]) => ({ id, kind: 'context' as const })),
    apply: async (docId, content) => {
      docs.set(docId, content);
      return { ok: true };
    },
  };
  return { deps, docs };
}

// ---- FR-011：doc-read ----

test('doc-read: 假 ctx（source/docId）读回内容对象', async () => {
  const { deps } = makeDeps({ main: SRC });
  // 经 deps.resolve(docId)
  const r1 = await executeDocRead(deps, { args: { doc: 'main' } }, { docId: 'main' });
  assert.equal(r1.ok, true);
  assert.equal(r1.output, SRC);
  // 经 ctx.source（无 docId 解析器也成）
  const r2 = await executeDocRead({}, { args: {} }, { source: 'plain-text-content' });
  assert.equal(r2.ok, true);
  assert.equal(r2.output, 'plain-text-content');
});

test('doc-read: 无上下文 → 友好错误 + 列出可读对象', async () => {
  const { deps } = makeDeps({ a: 'A', b: 'B' });
  const r = await executeDocRead(deps, { args: {} }, {});
  assert.equal(r.ok, false);
  assert.match(r.output, /无可用内容对象/);
  assert.match(r.output, /可读对象：/);
  assert.match(r.output, /- a/);
  assert.match(r.output, /- b/);
  // 空可读列表
  const empty = await executeDocRead({}, { args: {} }, {});
  assert.equal(empty.ok, false);
  assert.match(empty.output, /暂无可读对象/);
});

test('doc-read: 显式 --doc 与上下文不一致 → 友好错误（防误读）', async () => {
  const { deps } = makeDeps({ main: 'M' });
  const r = await executeDocRead(deps, { args: { doc: 'other' } }, { docId: 'main', source: 'M' });
  assert.equal(r.ok, false);
  assert.match(r.output, /找不到文档对象 "other"/);
});

// ---- FR-012：doc-edit 编辑原语 ----

test('applyDocEdit: str_replace/insert/create 纯函数', () => {
  const replaced = applyDocEdit('a -> b', { op: 'str_replace', old: 'a -> b', new: 'a -> c' });
  assert.equal(replaced.ok, true);
  if (replaced.ok) assert.equal(replaced.content, 'a -> c');
  // 未找到 → 失败且不改
  const miss = applyDocEdit('x', { op: 'str_replace', old: 'nope', new: 'y' });
  assert.equal(miss.ok, false);
  const inserted = applyDocEdit('hello world', { op: 'insert', after: 'hello', text: ' dear' });
  assert.equal(inserted.ok, true);
  if (inserted.ok) assert.equal(inserted.content, 'hello dear world');
  const created = applyDocEdit('old', { op: 'create', text: 'brand new' });
  assert.equal(created.ok, true);
  if (created.ok) assert.equal(created.content, 'brand new');
});

test('doc-edit: str_replace 返回 changed+source 推进（F-23 契约兼容）', async () => {
  const { deps, docs } = makeDeps({ main: SRC });
  const r = await executeDocEdit(deps, { subcommand: 'str_replace', args: { old: 'label: A', new: 'label: X' } }, { docId: 'main' });
  assert.equal(r.ok, true, r.error);
  assert.equal(r.changed, true);
  assert.ok(typeof r.source === 'string' && r.source.includes('label: X'));
  assert.ok(!r.source.includes('label: A'));
  // apply 写回 → 再读已更新
  assert.ok(docs.get('main')?.includes('label: X'));
  // 再次编辑推进（续上轮 source）
  const r2 = await executeDocEdit(deps, { subcommand: 'insert', args: { after: 'title: t', text: '\nversion: 2' } }, { docId: 'main' });
  assert.equal(r2.ok, true);
  assert.ok(r2.source?.includes('version: 2'));
});

test('doc-edit: 缺参/未知原语/无上下文错误', async () => {
  const { deps } = makeDeps({ main: SRC });
  const noOp = await executeDocEdit(deps, { subcommand: '', args: {} }, { docId: 'main' });
  assert.equal(noOp.ok, false);
  assert.match(noOp.output, /缺少编辑原语/);
  const noOld = await executeDocEdit(deps, { subcommand: 'str_replace', args: { new: 'x' } }, { docId: 'main' });
  assert.equal(noOld.ok, false);
  assert.match(noOld.output, /--old/);
  const noCtx = await executeDocEdit({}, { subcommand: 'create', args: { text: 'x' } }, {});
  assert.equal(noCtx.ok, false);
  assert.match(noCtx.output, /无可用内容对象/);
});

// ---- read-before-edit 策略联动（PRM 承载，FR-012/FR-005） ----

test('doc-edit: 未先读（ready=false）→ 权限 ask 联动；deny 时执行器不被调用', async () => {
  const asks: string[] = [];
  const router = createCommandRouter({
    builtins: false,
    policy: {
      // 场景取向：doc 写默认放行，read-before-edit 策略对「未先读的编辑」要求 ask
      rules: [{ risk: 'write', action: 'allow' }],
      strategies: [
        {
          name: 'read-before-edit',
          check: async (input): Promise<PolicyAction | null> => {
            if (input.subcommand === 'edit' && input.ctx.ready !== true) return 'ask';
            return null;
          },
        },
      ],
      onAsk: async (q) => {
        asks.push(q.tool);
        return { action: 'deny' };
      },
    },
  });
  const docTools = createDocTools(makeDeps({ main: SRC }).deps);
  router.register(docTools[0]); // doc-read
  router.register(docTools[1]); // doc-edit
  let editRan = 0;
  router.register({
    name: 'probe',
    schema: { name: 'probe', description: '', parameters: {} },
    executor: async () => {
      editRan += 1;
      return { ok: true, output: 'ran' };
    },
  });
  // doc-edit dispatch（未先读）→ ask 命中 → deny → 权限被拒 + 无 changed
  const denied = await router.dispatch(tc('doc-edit', { old: 'a', new: 'b' }, 'edit'), { docId: 'main', source: SRC, ready: false });
  assert.equal(denied.ok, false);
  assert.match(denied.output, /权限被拒/);
  assert.equal(asks.length, 1);
  // ready=true → 策略放行 → 执行器正常执行（doc-edit changed）
  const allowed = await router.dispatch(tc('doc-edit', { old: 'label: A', new: 'label: Z' }, 'str_replace'), { docId: 'main', source: SRC, ready: true });
  assert.equal(allowed.ok, true, allowed.error);
  assert.equal(allowed.changed, true);
  // read-before-edit 只作用于 edit 语义：probe 工具（无该策略匹配）不受影响
  const p = await router.dispatch(tc('probe'));
  assert.equal(p.output, 'ran');
  assert.equal(editRan, 1);
});

// ---- 经 CommandRouter 注册（doc 域组 + 元数据） ----

test('doc-tools: ToolEntry 元数据 + 派发集成', async () => {
  const { deps } = makeDeps({ main: SRC });
  const router = createCommandRouter({ builtins: false });
  for (const e of createDocTools(deps)) router.register(e);
  assert.deepEqual(router.deriveTools().map((t) => t.name), ['doc-read', 'doc-edit']);
  const read = await router.dispatch(tc('doc-read'), { docId: 'main', source: SRC });
  assert.equal(read.ok, true);
  assert.ok(read.output.includes('label: A'));
  const edit = await router.dispatch(tc('doc-edit', { old: 'label: A', new: 'label: Q' }, 'str_replace'), { docId: 'main', source: SRC });
  assert.equal(edit.ok, true, edit.error);
  assert.equal(edit.changed, true);
  assert.ok(edit.source?.includes('label: Q'));
  const help = router.listHelp();
  assert.ok(!help.includes('[doc]')); // 单组不插组头（旧文本兼容）
  // 追加不同组工具 → [doc] 组头出现
  router.register({
    name: 'misc',
    schema: { name: 'misc', description: '', parameters: {} },
    executor: async () => ({ ok: true, output: 'x' }),
  });
  const grouped = router.listHelp();
  assert.ok(grouped.includes('[doc]'));
});
