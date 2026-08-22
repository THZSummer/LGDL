import type { Command } from 'commander';
import type { LgdlCommand } from '../registry.js';
import { mutate, parseAttrs, collect } from '../shared.js';
import { addEdge } from '@lgdl/core';

export const addEdgeCommand: LgdlCommand = {
  name: 'add-edge',
  description: 'add an edge',
  register(program: Command) {
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
  },
};
