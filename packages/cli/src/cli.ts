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
  .version('0.1.0')
  // throw instead of process.exit so we can give friendly messages
  .exitOverride()
  // suppress commander's own error printing; we render messages in catch
  .configureOutput({ writeErr: () => {}, outputError: () => {} });

// register every command from the registry
registerAll(program);

program.parseAsync().catch((err) => {
  const msg = String(err?.message ?? err);
  if (err?.code === 'commander.optionMissingArgument') {
    // user typed `--opt` with no value: they intended to set it, so prompt
    const flag = (msg.match(/'([^']+)'/) ?? [])[1] ?? '该选项';
    console.error(`✖ 参数 ${flag} 需要提供一个值`);
    console.error(`  可用选项见 --help`);
  } else if (err?.code && String(err.code).startsWith('commander.')) {
    // invalid choice / missing required option / unknown command, etc.
    console.error(msg.replace(/^error:\s*/, '✖ '));
  } else {
    console.error(err);
  }
  process.exit(1);
});
