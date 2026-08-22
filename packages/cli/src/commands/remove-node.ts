import type { Command } from 'commander';
import type { LgdlCommand } from '../registry.js';
import { mutate } from '../shared.js';
import { removeNode } from '@lgdl/core';

export const removeNodeCommand: LgdlCommand = {
  name: 'remove-node',
  description: 'remove a node (auto-cleans attached edges)',
  register(program: Command) {
    program
      .command('remove-node')
      .description('remove a node (auto-cleans attached edges)')
      .requiredOption('--file <file>', 'path to .lgdl file')
      .requiredOption('--id <id>', 'node id')
      .action((opts: { file: string; id: string }) => {
        mutate(opts.file, (doc) => removeNode(doc, opts.id));
      });
  },
};
