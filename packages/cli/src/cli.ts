#!/usr/bin/env node
/**
 * LGDL CLI — v0.1.
 *
 * Commands are pluggable: each lives in src/commands/*.ts and is registered
 * via the command registry (src/registry.ts). Adding a command = create a
 * module + add it to the registry — this file never changes.
 */
import { Command } from 'commander';
import { registerAll } from './registry.js';

const program = new Command();

program
  .name('lgdl')
  .description('Logical Graph Description Language — semantic-first diagram language for AI agents')
  .version('0.1.0');

// register every command from the registry
registerAll(program);

program.parseAsync().catch((err) => {
  console.error(err);
  process.exit(1);
});
