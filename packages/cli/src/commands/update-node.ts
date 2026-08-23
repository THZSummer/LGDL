import type { Command } from 'commander';
import type { LgdlCommand } from '../registry.js';
import { mutate, collect } from '../shared.js';
import { applyOperation, buildOperation } from '@lgdl/core';

export const updateNodeCommand: LgdlCommand = {
  name: 'update-node',
  description: 'update a node label/kind/members/attrs',
  examples: ['update-node --file flow.lgdl --id user --label 新名'],
  register(program: Command) {
    program
      .command('update-node')
      .description('update a node label/kind/members/attrs')
      .requiredOption('--file <file>', 'path to .lgdl file')
      .requiredOption('--id <id>', 'node id')
      .option('--new-id <id>', 'rename the node (edges and group membership are rewritten)')
      .option('--label <label>', 'new label')
      .option('--kind <kind>', 'new kind')
      .option('--member-add <kind=..,name=..[,visibility=..][,type=..][,params=".."]>', 'append a structured class member')
      .option('--member-remove <name>', 'remove a class member by name')
      .option('--attrs <key=value>', 'extension attribute (repeatable, merged)', collect)
      .action((opts: { file: string; id: string; newId?: string; label?: string; kind?: string; memberAdd?: string; memberRemove?: string; attrs?: string[] }) => {
        mutate(opts.file, (doc) => {
          const op = buildOperation('update-node', {
            id: opts.id,
            'new-id': opts.newId,
            label: opts.label,
            kind: opts.kind,
            'member-add': opts.memberAdd,
            'member-remove': opts.memberRemove,
            attrs: opts.attrs?.join(','),
          }, doc.type);
          return applyOperation(doc, op);
        });
      });
  },
};
