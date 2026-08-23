import type { Command } from 'commander';
import type { LgdlCommand } from '../registry.js';
import { mutate, parseAttrs, collect } from '../shared.js';
import { updateGroup } from '@lgdl/core';

export const updateGroupCommand: LgdlCommand = {
  name: 'update-group',
  description: 'update a group label/members/attrs',
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
        if (
          opts.newId === undefined &&
          opts.label === undefined &&
          opts.memberAdd === undefined &&
          opts.memberRemove === undefined &&
          opts.attrs === undefined
        ) {
          console.error('✖ no change requested — pass at least one of --new-id, --label, --member-add, --member-remove, --attrs');
          process.exit(1);
        }
        mutate(opts.file, (doc) =>
          updateGroup(doc, {
            id: opts.id,
            newId: opts.newId,
            label: opts.label,
            memberAdd: opts.memberAdd,
            memberRemove: opts.memberRemove,
            attrs: parseAttrs(opts.attrs),
          }),
        );
      });
  },
};
