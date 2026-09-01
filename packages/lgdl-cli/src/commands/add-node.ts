import type { Command } from 'commander';
import type { LgdlCommand } from '../registry.js';
import { mutate, collect } from '../shared.js';
import { applyOperation, buildOperation } from '@lgdl/lgdl-web-cli';

export const addNodeCommand: LgdlCommand = {
  name: 'add-node',
  description: 'add a node (kind=group with --contains creates a group)',
  examples: ['add-node --file flow.lgdl --id user --label 用户', 'add-node --file flow.lgdl --id g1 --kind group --contains a,b'],
  register(program: Command) {
    program
      .command('add-node')
      .description('add a node (kind=group with --contains creates a group)')
      .requiredOption('--file <file>', 'path to .lgdl file')
      .requiredOption('--id <id>', 'node id')
      .option('--label <label>', 'display label')
      .option('--kind <kind>', 'node kind (start|end|process|decision|entity|note|state|milestone|group); defaults to a type-appropriate kind (entity for er/uml-class, state for state, else process); --contains requires --kind group')
      .option('--group <group>', 'group id to place the node into')
      .option('--contains <ids>', 'comma-separated member ids for a group node (requires --kind group; node ids and/or nested group ids)')
      .option('--member <kind=..,name=..[,visibility=..][,type=..][,params=".."]>', 'structured class member (repeatable, uml-class entity only)', collect)
      .option('--attrs <key=value>', 'extension attribute (repeatable, e.g. --attrs start=0 --attrs duration=3)', collect)
      .action((opts: { file: string; id: string; label?: string; kind?: string; group?: string; contains?: string; member?: string[]; attrs?: string[] }) => {
        mutate(opts.file, (doc) => {
          if (doc.type === 'gantt') {
            const hasStart = opts.attrs?.some((a) => a.startsWith('start='));
            const hasDuration = opts.attrs?.some((a) => a.startsWith('duration='));
            if (!hasStart || !hasDuration) {
              const epoch = typeof doc.meta?.ganttEpoch === 'string' ? doc.meta.ganttEpoch : '2026-01-01';
              console.error(`⚠ gantt node "${opts.id}" lacks start/duration — day 0 = ${epoch}, it will render as a placeholder at day 0/1d`);
            }
          }
          const op = buildOperation('add-node', {
            id: opts.id,
            label: opts.label,
            kind: opts.kind,
            group: opts.group,
            contains: opts.contains,
            member: opts.member?.join('\n'),
            attrs: opts.attrs?.join(','),
          }, doc.type);
          return applyOperation(doc, op);
        });
      });
  },
};
