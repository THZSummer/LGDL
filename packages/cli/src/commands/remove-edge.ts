import type { Command } from 'commander';
import type { LgdlCommand } from '../registry.js';
import { mutate } from '../shared.js';
import { removeEdge } from '@lgdl/core';

export const removeEdgeCommand: LgdlCommand = {
  name: 'remove-edge',
  description: 'remove an edge',
  register(program: Command) {
    program
      .command('remove-edge <file>')
      .description('remove an edge')
      .requiredOption('--from <id>', 'source node id')
      .requiredOption('--to <id>', 'target node id')
      .action((file: string, opts: { from: string; to: string }) => {
        mutate(file, (doc) => removeEdge(doc, opts.from, opts.to));
      });
  },
};
