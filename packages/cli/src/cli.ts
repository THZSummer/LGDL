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
import { hintFor } from './option-hints.js';

const program = new Command();

program
  .name('lgdl')
  .description('Logical Graph Description Language — semantic-first diagram language for AI agents')
  .version('0.1.0')
  // throw instead of process.exit so we can give friendly messages
  .exitOverride()
  // after any error, print the failed command's help (options + choices)
  .showHelpAfterError()
  // suppress commander's raw "error: ..." line; we print our own message
  .configureOutput({ writeOut: (s) => process.stdout.write(s), writeErr: (s) => process.stderr.write(s), outputError: () => {} });

// register every command from the registry
registerAll(program);

program.parseAsync().catch((err) => {
  const msg = String(err?.message ?? err);

  if (err?.code === 'commander.optionMissingArgument') {
    // user typed `--opt` with no value: report valid choices directly
    const flag = (msg.match(/'([^']+)'/) ?? [])[1] ?? '';
    const hints = hintFor(flag);
    if (hints) {
      console.error(`✖ 参数 ${flag} 需要提供一个值`);
      console.error(`  可选值: ${hints.join(' | ')}`);
    } else {
      console.error(`✖ 参数 ${flag} 需要提供一个值`);
    }
  } else if (err?.code && String(err.code).startsWith('commander.')) {
    // invalid choice / missing required option / unknown command
    console.error(msg.replace(/^error:\s*/, '✖ '));
  } else {
    console.error(err);
  }

  // showHelpAfterError already printed the failed command's help to stderr
  process.exit(1);
});
