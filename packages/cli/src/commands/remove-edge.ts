import type { Command } from 'commander';
import type { LgdlCommand } from '../registry.js';
import { mutate } from '../shared.js';
import { removeEdge } from '@lgdl/core';

export const removeEdgeCommand: LgdlCommand = {
  name: 'remove-edge',
  description: 'remove an edge',
  register(program: Command) {
    program
      .command('remove-edge')
      .description('remove an edge')
      .requiredOption('--file <file>', 'path to .lgdl file')
      .requiredOption('--from <id>', 'source node id')
      .requiredOption('--to <id>', 'target node id')
      .option('--edge-label <label>', 'only remove the parallel edge with this label (required when several edges share from/to)')
      .action((opts: { file: string; from: string; to: string; edgeLabel?: string }) => {
        mutate(opts.file, (doc) => removeEdge(doc, opts.from, opts.to, opts.edgeLabel));
      });
  },
};
