import type { Command } from 'commander';
import type { LgdlCommand } from '../registry.js';
import { mutate } from '../shared.js';
import { applyOperation, buildOperation } from '@lgdl/core';

export const addGroupCommand: LgdlCommand = {
  name: 'add-group',
  description: 'add a group (lane/partition)',
  register(program: Command) {
    program
      .command('add-group')
      .description('add a group (lane/partition)')
      .requiredOption('--file <file>', 'path to .lgdl file')
      .requiredOption('--id <id>', 'group id')
      .option('--label <label>', 'group label')
      .option('--contains <ids>', 'comma-separated member ids (node ids and/or nested group ids)')
      .action((opts: { file: string; id: string; label?: string; contains?: string }) => {
        mutate(opts.file, (doc) => {
          const op = buildOperation('add-group', { id: opts.id, label: opts.label, contains: opts.contains });
          return applyOperation(doc, op);
        });
      });
  },
};
