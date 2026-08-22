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
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const program = new Command();

// read version from package.json so `lgdl -V` tracks the published version
const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8')) as { version: string };

program
  .name('lgdl')
  .description('Logical Graph Description Language — semantic-first diagram language for AI agents')
  .version(pkg.version)
  // throw instead of process.exit so we can give friendly messages
  .exitOverride()
  // after any error, print the failed command's help (options + choices)
  .showHelpAfterError()
  // suppress commander's raw "error: ..." line; we print our own message
  .configureOutput({ writeOut: (s) => process.stdout.write(s), writeErr: (s) => process.stderr.write(s), outputError: () => {} });

// register every command from the registry
registerAll(program);

program.parseAsync().catch((err) => {
  // `-V` already printed the version; commander throws commander.version
  // as a control-flow signal (via exitOverride) — just exit cleanly.
  if (err?.code === 'commander.version' || err?.code === 'commander.helpDisplayed') {
    process.exit(0);
  }

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
  } else if (err?.code === 'commander.unknownOption') {
    // `--xxx` at top level where xxx matches a command name: the user
    // probably meant a command (commands don't take `--`).
    const flag = (msg.match(/'([^']+)'/) ?? [])[1] ?? '';
    const cmdName = flag.replace(/^--/, '');
    const matchingCmd = program.commands.find((c) => c.name() === cmdName);
    if (matchingCmd) {
      console.error(`✖ 未知选项 '${flag}'`);
      console.error(`  你是不是想用命令: lgdl ${cmdName} <file> ？（命令不需要 -- 前缀）`);
    } else {
      console.error(msg.replace(/^error:\s*/, '✖ '));
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
