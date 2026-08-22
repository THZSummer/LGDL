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
  /** register the command on the program */
  register(program: Command): void;
}

/** All registered commands — add new ones here. */
import { initCommand } from './commands/init.js';
import { renderCommand } from './commands/render.js';
import { statusCommand } from './commands/status.js';
import { addNodeCommand } from './commands/add-node.js';
import { removeNodeCommand } from './commands/remove-node.js';
import { updateNodeCommand } from './commands/update-node.js';
import { addEdgeCommand } from './commands/add-edge.js';
import { updateEdgeCommand } from './commands/update-edge.js';
import { removeEdgeCommand } from './commands/remove-edge.js';
import { addGroupCommand } from './commands/add-group.js';
import { removeGroupCommand } from './commands/remove-group.js';

export const COMMANDS: LgdlCommand[] = [
  initCommand,
  renderCommand,
  statusCommand,
  addNodeCommand,
  removeNodeCommand,
  updateNodeCommand,
  addEdgeCommand,
  updateEdgeCommand,
  removeEdgeCommand,
  addGroupCommand,
  removeGroupCommand,
];

/** Register every command onto a program. */
export function registerAll(program: Command): void {
  for (const cmd of COMMANDS) {
    cmd.register(program);
  }
}
