import type { Command } from 'commander';
import type { LgdlCommand } from '../registry.js';
import { loadDocument } from '../shared.js';
import { validate } from '@lgdl/core';

export const statusCommand: LgdlCommand = {
  name: 'status',
  description: 'print the textual graph structure (AI-readable)',
  register(program: Command) {
    program
      .command('status')
      .description('print the textual graph structure (AI-readable)')
      .requiredOption('--file <file>', 'path to .lgdl file')
      .action((opts: { file: string }) => {
        const doc = loadDocument(opts.file);
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
  },
};
