import type { Command } from 'commander';
import type { LgdlCommand } from '../registry.js';
import { mutate, parseAttrs, parseMember, collect } from '../shared.js';
import { applyOperation } from '@lgdl/core';

export const addNodeCommand: LgdlCommand = {
  name: 'add-node',
  description: 'add a node',
  register(program: Command) {
    program
      .command('add-node')
      .description('add a node')
      .requiredOption('--file <file>', 'path to .lgdl file')
      .requiredOption('--id <id>', 'node id')
      .option('--label <label>', 'display label')
      .option('--kind <kind>', 'node kind (start|end|process|decision|entity|note|state|milestone); defaults to a type-appropriate kind (entity for er/uml-class, state for state, else process)')
      .option('--group <group>', 'group id to place the node into')
      .option('--member <kind=..,name=..[,visibility=..][,type=..][,params=".."]>', 'structured class member (repeatable, uml-class entity only)', collect)
      .option('--attrs <key=value>', 'extension attribute (repeatable, e.g. --attrs start=0 --attrs duration=3)', collect)
      .action((opts: { file: string; id: string; label?: string; kind?: string; group?: string; member?: string[]; attrs?: string[] }) => {
        mutate(opts.file, (doc) => {
          // default the kind to the diagram type's semantic role so an ER
          // node is an entity, a state node is a state, etc.
          const kind =
            opts.kind ??
            (doc.type === 'er' || doc.type === 'uml-class'
              ? 'entity'
              : doc.type === 'state'
                ? 'state'
                : 'process');
          if (doc.type === 'gantt') {
            const attrs = parseAttrs(opts.attrs) ?? {};
            if (typeof attrs.start !== 'number' || typeof attrs.duration !== 'number') {
              const epoch = typeof doc.meta?.ganttEpoch === 'string' ? doc.meta.ganttEpoch : '2026-01-01';
              console.error(`⚠ gantt node "${opts.id}" lacks start/duration — day 0 = ${epoch}, it will render as a placeholder at day 0/1d`);
            }
          }
          return applyOperation(doc, {
            op: 'add-node',
            id: opts.id,
            label: opts.label,
            kind: kind as never,
            group: opts.group,
            members: opts.member?.map(parseMember),
            attrs: parseAttrs(opts.attrs),
          });
        });
      });
  },
};
