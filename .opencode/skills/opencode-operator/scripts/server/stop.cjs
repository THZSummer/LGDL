#!/usr/bin/env node
'use strict';

/**
 * stop.cjs - 停止 opencode serve（人工运维工具，人类友好输出）
 *
 * 零依赖，使用 Node.js 内置模块。终止占用端口的 serve 进程：
 *   SIGTERM → 等待退出 → kill -9 兜底强杀残留
 *
 * 给"人"在终端使用；LLM Agent 请用 ../serve-api.cjs stop（stdout JSON）。
 *
 * 用法：
 *   node stop.cjs [--port 14096] [--hostname 127.0.0.1]
 */

const { execSync } = require('child_process');
const { parseArgs } = require('util');

const DEFAULT_PORT = 14096;
const DEFAULT_HOST = '127.0.0.1';

function parseCliArgs(args) {
  const { values } = parseArgs({
    args,
    options: {
      port:     { type: 'string' },
      hostname: { type: 'string' },
    },
    strict: false,
  });
  return values;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// 获取占用指定端口的进程 PID（lsof 优先，回退 fuser）
function portPids(port) {
  try {
    const out = execSync(`lsof -ti:${port} 2>/dev/null`).toString().trim();
    if (out) return out.split('\n');
  } catch { /* lsof 无输出或不存在 */ }
  try {
    const out = execSync(`fuser ${port}/tcp 2>/dev/null`).toString().trim();
    if (out) return out.split(/\s+/).filter(Boolean);
  } catch { /* fuser 无输出或不存在 */ }
  return [];
}

function killPids(pids, signal) {
  for (const p of pids) {
    try { process.kill(parseInt(p), signal); } catch { /* 进程已退出 */ }
  }
}

async function main() {
  const opts = parseCliArgs(process.argv.slice(2));
  const port = parseInt(opts.port || String(DEFAULT_PORT), 10);
  const hostname = opts.hostname || DEFAULT_HOST;

  const pids = portPids(port);
  if (pids.length === 0) {
    console.log(`==> 端口 ${port} 无 serve 进程，无需停止`);
    process.exit(0);
  }

  console.log(`==> 停止 serve（${hostname}:${port}）: ${pids.join(', ')}`);
  killPids(pids, 'SIGTERM');
  await sleep(1000);

  const remain = portPids(port);
  if (remain.length > 0) {
    console.log(`    强杀残留进程: ${remain.join(', ')}`);
    killPids(remain, 'SIGKILL');
    await sleep(500);
  }

  const after = portPids(port);
  if (after.length === 0) {
    console.log(`==> ✓ serve 已停止（端口 ${port} 已释放）`);
    process.exit(0);
  } else {
    console.error(`!! 端口 ${port} 仍有进程: ${after.join(', ')}，请手动检查`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('!! 执行失败:', e.message);
  process.exit(1);
});
