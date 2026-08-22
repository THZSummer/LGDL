import type { Command } from 'commander';
import type { LgdlCommand } from '../registry.js';
import { mutate, parseIdList } from '../shared.js';
import { addGroup } from '@lgdl/core';

export const addGroupCommand: LgdlCommand = {
  name: 'add-group',
  description: 'add a group (lane/partition)',
  register(program: Command) {
    program
      .command('add-group <file>')
      .description('add a group (lane/partition)')
      .requiredOption('--id <id>', 'group id')
      .option('--label <label>', 'group label')
      .option('--contains <ids>', 'comma-separated member node ids')
      .action((file: string, opts: { id: string; label?: string; contains?: string }) => {
        mutate(file, (doc) => addGroup(doc, { id: opts.id, label: opts.label, contains: parseIdList(opts.contains) }));
      });
  },
};
