import type { Command } from 'commander';
import type { LgdlCommand } from '../registry.js';
import { mutate } from '../shared.js';
import { removeNode } from '@lgdl/core';

export const removeNodeCommand: LgdlCommand = {
  name: 'remove-node',
  description: 'remove a node (auto-cleans attached edges)',
  register(program: Command) {
    program
      .command('remove-node <file>')
      .description('remove a node (auto-cleans attached edges)')
      .requiredOption('--id <id>', 'node id')
      .action((file: string, opts: { id: string }) => {
        mutate(file, (doc) => removeNode(doc, opts.id));
      });
  },
};
