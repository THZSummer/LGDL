import type { Command } from 'commander';
import type { LgdlCommand } from '../registry.js';
import { mutate, parseAttrs, collect } from '../shared.js';
import { updateEdge } from '@lgdl/core';

export const updateEdgeCommand: LgdlCommand = {
  name: 'update-edge',
  description: 'update an edge label/attrs',
  register(program: Command) {
    program
      .command('update-edge')
      .description('update an edge label/attrs')
      .requiredOption('--file <file>', 'path to .lgdl file')
      .requiredOption('--from <id>', 'source node id')
      .requiredOption('--to <id>', 'target node id')
      .option('--label <label>', 'new label')
      .option('--attrs <key=value>', 'extension attribute (repeatable, merged)', collect)
      .action((opts: { file: string; from: string; to: string; label?: string; attrs?: string[] }) => {
        mutate(opts.file, (doc) => updateEdge(doc, { from: opts.from, to: opts.to, label: opts.label, attrs: parseAttrs(opts.attrs) }));
      });
  },
};
