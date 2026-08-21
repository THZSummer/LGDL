#!/usr/bin/env node
/**
 * LGDL CLI — v0.1.
 *
 * Commands: init, render, status, diff, add-node, remove-node, update-node,
 * add-edge, remove-edge, import-mermaid, export-mermaid.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { Command } from 'commander';
import {
  parseLgdl,
  validate,
  addNode,
  addEdge,
  removeNode,
  removeEdge,
  updateNode,
  updateEdge,
  addGroup,
  removeGroup,
  serializeLgdl,
} from '@lgdl/core';
import { layoutDocument } from '@lgdl/layout';
import { renderSvg } from '@lgdl/render';

/** commander option collector: accumulate repeated --attrs into an array */
function collect(value: string, previous: string[]): string[] {
  return [...(previous ?? []), value];
}

const program = new Command();

program
  .name('lgdl')
  .description('Logical Graph Description Language — semantic-first diagram language for AI agents')
  .version('0.1.0');

function loadDocument(file: string) {
  if (!existsSync(file)) {
    console.error(`Error: file not found: ${file}`);
    process.exit(1);
  }
  const src = readFileSync(file, 'utf8');
  const result = parseLgdl(src);
  for (const issue of result.issues) {
    console.error(`${issue.severity === 'error' ? '✖' : '⚠'} [${issue.location ?? 'doc'}] ${issue.message}`);
  }
  if (!result.valid) {
    console.error(`Error: "${file}" is invalid (${result.issues.filter((i) => i.severity === 'error').length} errors)`);
    process.exit(1);
  }
  return result.document;
}

program
  .command('init <file>')
  .description('initialize an empty diagram file')
  .action((file: string) => {
    if (existsSync(file)) {
      console.error(`Error: file already exists: ${file}`);
      process.exit(1);
    }
    const template = `# LGDL diagram
type: flowchart

nodes:
  - id: start
    label: 开始
    kind: start
`;
    writeFileSync(file, template, 'utf8');
    console.log(`✓ initialized ${file}`);
  });

program
  .command('render <file>')
  .description('render a diagram to SVG (auto layout)')
  .option('-o, --output <file>', 'output file', 'out.svg')
  .action((file: string, opts: { output: string }) => {
    const doc = loadDocument(file);
    const layout = layoutDocument(doc);
    const svg = renderSvg(doc, layout);
    writeFileSync(opts.output, svg, 'utf8');
    console.log(`✓ rendered ${file} -> ${opts.output} (${layout.width}x${layout.height}, ${doc.nodes.length} nodes, ${doc.edges.length} edges)`);
  });

program
  .command('status <file>')
  .description('print the textual graph structure (AI-readable)')
  .action((file: string) => {
    const doc = loadDocument(file);
    console.log(`# ${doc.title ?? 'untitled'} [${doc.type}]`);
    console.log('');
    console.log('## nodes');
    for (const n of doc.nodes) {
      console.log(`  ${n.id}${n.label ? ` (${n.label})` : ''}${n.kind && n.kind !== 'process' ? ` :${n.kind}` : ''}`);
    }
    console.log('');
    console.log('## edges');
    for (const e of doc.edges) {
      console.log(`  ${e.from} -> ${e.to}${e.label ? ` [${e.label}]` : ''}`);
    }
    if (doc.groups.length > 0) {
      console.log('');
      console.log('## groups');
      for (const g of doc.groups) {
        console.log(`  ${g.id}${g.label ? ` (${g.label})` : ''}: ${g.contains.join(', ')}`);
      }
    }
    const res = validate(doc);
    if (!res.valid) {
      console.error('(document has validation errors)');
      process.exit(1);
    }
  });

// ---- incremental edit commands (AI-agent interface) ----

function mutate(file: string, fn: (doc: ReturnType<typeof loadDocument>) => { document: ReturnType<typeof loadDocument>; summary: string }) {
  const doc = loadDocument(file);
  try {
    const { document, summary } = fn(doc);
    // re-validate after mutation
    const res = validate(document);
    if (!res.valid) {
      console.error(`✖ mutation rejected: ${res.issues.map((i) => i.message).join('; ')}`);
      process.exit(1);
    }
    writeFileSync(file, serializeLgdl(document), 'utf8');
    console.log(`✓ ${summary}`);
    console.log(`  (saved ${file})`);
  } catch (err) {
    console.error(`✖ ${(err as Error).message}`);
    process.exit(1);
  }
}

/**
 * Parse repeated --attrs key=value options into an attrs object.
 * Supports: --attrs start=0 --attrs duration=3 --attrs done=true --attrs name="a b"
 */
function parseAttrs(values: string[] | undefined): Record<string, unknown> | undefined {
  if (!values || values.length === 0) return undefined;
  const attrs: Record<string, unknown> = {};
  for (const raw of values) {
    const eq = raw.indexOf('=');
    if (eq === -1) {
      console.error(`✖ invalid --attrs "${raw}" (expected key=value)`);
      process.exit(1);
    }
    const key = raw.slice(0, eq).trim();
    let value: unknown = raw.slice(eq + 1).trim();
    if (value === 'true') value = true;
    else if (value === 'false') value = false;
    else if (/^-?\d+$/.test(String(value))) value = parseInt(String(value), 10);
    else if (/^-?\d+\.\d+$/.test(String(value))) value = parseFloat(String(value));
    else if ((value as string).startsWith('"') && (value as string).endsWith('"')) {
      value = (value as string).slice(1, -1);
    }
    attrs[key] = value;
  }
  return attrs;
}

program
  .command('add-node <file>')
  .description('add a node')
  .requiredOption('--id <id>', 'node id')
  .option('--label <label>', 'display label')
  .option('--kind <kind>', 'node kind (start|end|process|decision|entity|note|state|milestone)', 'process')
  .option('--group <group>', 'group id to place the node into')
  .option('--attrs <key=value>', 'extension attribute (repeatable, e.g. --attrs start=0 --attrs duration=3)', collect)
  .action((file: string, opts: { id: string; label?: string; kind: string; group?: string; attrs?: string[] }) => {
    mutate(file, (doc) =>
      addNode(doc, { id: opts.id, label: opts.label, kind: opts.kind as never, group: opts.group, attrs: parseAttrs(opts.attrs) }),
    );
  });

program
  .command('remove-node <file>')
  .description('remove a node (auto-cleans attached edges)')
  .requiredOption('--id <id>', 'node id')
  .action((file: string, opts: { id: string }) => {
    mutate(file, (doc) => removeNode(doc, opts.id));
  });

program
  .command('update-node <file>')
  .description('update a node label/kind/attrs')
  .requiredOption('--id <id>', 'node id')
  .option('--label <label>', 'new label')
  .option('--kind <kind>', 'new kind')
  .option('--attrs <key=value>', 'extension attribute (repeatable, merged)', collect)
  .action((file: string, opts: { id: string; label?: string; kind?: string; attrs?: string[] }) => {
    mutate(file, (doc) =>
      updateNode(doc, { id: opts.id, label: opts.label, kind: opts.kind as never, attrs: parseAttrs(opts.attrs) }),
    );
  });

program
  .command('add-edge <file>')
  .description('add an edge')
  .requiredOption('--from <id>', 'source node id')
  .requiredOption('--to <id>', 'target node id')
  .option('--label <label>', 'edge label')
  .option('--attrs <key=value>', 'extension attribute (repeatable, e.g. --attrs cardinality="1..*")', collect)
  .action((file: string, opts: { from: string; to: string; label?: string; attrs?: string[] }) => {
    mutate(file, (doc) => addEdge(doc, { from: opts.from, to: opts.to, label: opts.label, attrs: parseAttrs(opts.attrs) }));
  });

program
  .command('update-edge <file>')
  .description('update an edge label/attrs')
  .requiredOption('--from <id>', 'source node id')
  .requiredOption('--to <id>', 'target node id')
  .option('--label <label>', 'new label')
  .option('--attrs <key=value>', 'extension attribute (repeatable, merged)', collect)
  .action((file: string, opts: { from: string; to: string; label?: string; attrs?: string[] }) => {
    mutate(file, (doc) => updateEdge(doc, { from: opts.from, to: opts.to, label: opts.label, attrs: parseAttrs(opts.attrs) }));
  });

program
  .command('remove-edge <file>')
  .description('remove an edge')
  .requiredOption('--from <id>', 'source node id')
  .requiredOption('--to <id>', 'target node id')
  .action((file: string, opts: { from: string; to: string }) => {
    mutate(file, (doc) => removeEdge(doc, opts.from, opts.to));
  });

program
  .command('add-group <file>')
  .description('add a group (lane/partition)')
  .requiredOption('--id <id>', 'group id')
  .option('--label <label>', 'group label')
  .option('--contains <ids>', 'comma-separated member node ids')
  .action((file: string, opts: { id: string; label?: string; contains?: string }) => {
    const contains = opts.contains ? opts.contains.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
    mutate(file, (doc) => addGroup(doc, { id: opts.id, label: opts.label, contains }));
  });

program
  .command('remove-group <file>')
  .description('remove a group')
  .requiredOption('--id <id>', 'group id')
  .action((file: string, opts: { id: string }) => {
    mutate(file, (doc) => removeGroup(doc, opts.id));
  });

program.parseAsync().catch((err) => {
  console.error(err);
  process.exit(1);
});
