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
  serializeLgdl,
} from '@lgdl/core';
import { layoutDocument } from '@lgdl/layout';
import { renderSvg } from '@lgdl/render';

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

program
  .command('add-node <file>')
  .description('add a node')
  .requiredOption('--id <id>', 'node id')
  .option('--label <label>', 'display label')
  .option('--kind <kind>', 'node kind (start|end|process|decision|entity|note)', 'process')
  .option('--group <group>', 'group id to place the node into')
  .action((file: string, opts: { id: string; label?: string; kind: string; group?: string }) => {
    mutate(file, (doc) => addNode(doc, { id: opts.id, label: opts.label, kind: opts.kind as never, group: opts.group }));
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
  .description('update a node label/kind')
  .requiredOption('--id <id>', 'node id')
  .option('--label <label>', 'new label')
  .option('--kind <kind>', 'new kind')
  .action((file: string, opts: { id: string; label?: string; kind?: string }) => {
    mutate(file, (doc) => updateNode(doc, { id: opts.id, label: opts.label, kind: opts.kind as never }));
  });

program
  .command('add-edge <file>')
  .description('add an edge')
  .requiredOption('--from <id>', 'source node id')
  .requiredOption('--to <id>', 'target node id')
  .option('--label <label>', 'edge label')
  .action((file: string, opts: { from: string; to: string; label?: string }) => {
    mutate(file, (doc) => addEdge(doc, { from: opts.from, to: opts.to, label: opts.label }));
  });

program
  .command('remove-edge <file>')
  .description('remove an edge')
  .requiredOption('--from <id>', 'source node id')
  .requiredOption('--to <id>', 'target node id')
  .action((file: string, opts: { from: string; to: string }) => {
    mutate(file, (doc) => removeEdge(doc, opts.from, opts.to));
  });

program.parseAsync().catch((err) => {
  console.error(err);
  process.exit(1);
});
