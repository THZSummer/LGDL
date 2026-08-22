import type { Command } from 'commander';
import type { LgdlCommand } from '../registry.js';
import { mutate, parseAttrs, parseMember, collect } from '../shared.js';
import { updateNode } from '@lgdl/core';

export const updateNodeCommand: LgdlCommand = {
  name: 'update-node',
  description: 'update a node label/kind/members/attrs',
  register(program: Command) {
    program
      .command('update-node')
      .description('update a node label/kind/members/attrs')
      .requiredOption('--file <file>', 'path to .lgdl file')
      .requiredOption('--id <id>', 'node id')
      .option('--label <label>', 'new label')
      .option('--kind <kind>', 'new kind')
      .option('--member-add <kind=..,name=..[,visibility=..][,type=..][,params=".."]>', 'append a structured class member')
      .option('--member-remove <name>', 'remove a class member by name')
      .option('--attrs <key=value>', 'extension attribute (repeatable, merged)', collect)
      .action((opts: { file: string; id: string; label?: string; kind?: string; memberAdd?: string; memberRemove?: string; attrs?: string[] }) => {
        mutate(opts.file, (doc) =>
          updateNode(doc, {
            id: opts.id,
            label: opts.label,
            kind: opts.kind as never,
            memberAdd: opts.memberAdd ? parseMember(opts.memberAdd) : undefined,
            memberRemove: opts.memberRemove,
            attrs: parseAttrs(opts.attrs),
          }),
        );
      });
  },
};
