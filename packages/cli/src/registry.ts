/**
 * LGDL CLI command registry.
 *
 * Each command is a standalone module exporting an LgdlCommand.
 * Registering a new command = dropping a file in commands/ and adding
 * it to the registry — the main entry point never changes.
 */
import type { Command } from 'commander';

/** A pluggable CLI command. */
export interface LgdlCommand {
  /** command name (used in help and registration) */
  name: string;
  /** one-line description shown in help */
  description: string;
  /** 1-2 example invocations (shown after the options block in --help, clig.dev style) */
  examples?: string[];
  /** register the command on the program */
  register(program: Command): void;
}

/** All registered commands — add new ones here. */
import { initCommand } from './commands/init.js';
import { renderCommand } from './commands/render.js';
import { statusCommand, docInfoCommand, listNodeKindsCommand, getNodeCommand, getEdgeCommand, findNodeCommand } from './commands/queries.js';
import { addNodeCommand } from './commands/add-node.js';
import { removeNodeCommand } from './commands/remove-node.js';
import { updateNodeCommand } from './commands/update-node.js';
import { addEdgeCommand } from './commands/add-edge.js';
import { updateEdgeCommand } from './commands/update-edge.js';
import { removeEdgeCommand } from './commands/remove-edge.js';
import { addGroupCommand } from './commands/add-group.js';
import { removeGroupCommand } from './commands/remove-group.js';
import { updateGroupCommand } from './commands/update-group.js';
import { convertCommand } from './commands/convert.js';
import { importCommand } from './commands/import.js';

export const COMMANDS: LgdlCommand[] = [
  initCommand,
  renderCommand,
  statusCommand,
  docInfoCommand,
  listNodeKindsCommand,
  getNodeCommand,
  getEdgeCommand,
  findNodeCommand,
  convertCommand,
  importCommand,
  addNodeCommand,
  removeNodeCommand,
  updateNodeCommand,
  addEdgeCommand,
  updateEdgeCommand,
  removeEdgeCommand,
  addGroupCommand,
  removeGroupCommand,
  updateGroupCommand,
];

/** Register every command onto a program. */
export function registerAll(program: Command): void {
  for (const cmd of COMMANDS) {
    cmd.register(program);
    // clig.dev: help should include one or two example invocations.
    if (cmd.examples && cmd.examples.length > 0) {
      const registered = program.commands.find((c) => c.name() === cmd.name);
      registered?.addHelpText(
        'after',
        `\nExamples:\n${cmd.examples.map((e) => `  $ lgdl-cli ${e}`).join('\n')}\n`,
      );
    }
  }
}
