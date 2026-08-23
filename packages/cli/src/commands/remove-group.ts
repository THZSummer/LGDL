import type { Command } from 'commander';
import type { LgdlCommand } from '../registry.js';
import { mutate } from '../shared.js';
import { applyOperation, buildOperation } from '@lgdl/core';

export const removeGroupCommand: LgdlCommand = {
  name: 'remove-group',
  description: 'remove a group',
  register(program: Command) {
    program
      .command('remove-group')
      .description('remove a group')
      .requiredOption('--file <file>', 'path to .lgdl file')
      .requiredOption('--id <id>', 'group id')
      .action((opts: { file: string; id: string }) => {
        mutate(opts.file, (doc) => { const op = buildOperation('remove-group', { id: opts.id }); return applyOperation(doc, op); });
      });
  },
};
