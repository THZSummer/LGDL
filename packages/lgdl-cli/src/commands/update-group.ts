import type { Command } from 'commander';
import type { LgdlCommand } from '../registry.js';
import { mutate, collect } from '../shared.js';
import { applyOperation, buildOperation } from '@lgdl/lgdl-web-cli';

export const updateGroupCommand: LgdlCommand = {
  name: 'update-group',
  description: 'update a group label/members/attrs',
  examples: ['update-group --file flow.lgdl --id g1 --label 新域'],
  register(program: Command) {
    program
      .command('update-group')
      .description('update a group label/members/attrs')
      .requiredOption('--file <file>', 'path to .lgdl file')
      .requiredOption('--id <id>', 'group id')
      .option('--new-id <id>', 'rename the group (aggregate edges and parent contains are rewritten)')
      .option('--label <label>', 'new label')
      .option('--member-add <id>', 'append a member (node or nested group id)')
      .option('--member-remove <id>', 'remove a member by id')
      .option('--attrs <key=value>', 'extension attribute (repeatable, merged)', collect)
      .action((opts: { file: string; id: string; newId?: string; label?: string; memberAdd?: string; memberRemove?: string; attrs?: string[] }) => {
        mutate(opts.file, (doc) => {
          const op = buildOperation('update-group', {
            id: opts.id,
            'new-id': opts.newId,
            label: opts.label,
            'member-add': opts.memberAdd,
            'member-remove': opts.memberRemove,
            attrs: opts.attrs?.join(','),
          });
          return applyOperation(doc, op);
        });
      });
  },
};
