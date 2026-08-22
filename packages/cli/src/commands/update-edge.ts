import type { Command } from 'commander';
import type { LgdlCommand } from '../registry.js';
import { mutate, parseAttrs, collect } from '../shared.js';
import { updateEdge } from '@lgdl/core';

export const updateEdgeCommand: LgdlCommand = {
  name: 'update-edge',
  description: 'update an edge label/attrs',
  register(program: Command) {
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
  },
};
