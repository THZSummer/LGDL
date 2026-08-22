import type { Command } from 'commander';
import type { LgdlCommand } from '../registry.js';
import { mutate } from '../shared.js';
import { removeGroup } from '@lgdl/core';

export const removeGroupCommand: LgdlCommand = {
  name: 'remove-group',
  description: 'remove a group',
  register(program: Command) {
    program
      .command('remove-group <file>')
      .description('remove a group')
      .requiredOption('--id <id>', 'group id')
      .action((file: string, opts: { id: string }) => {
        mutate(file, (doc) => removeGroup(doc, opts.id));
      });
  },
};
