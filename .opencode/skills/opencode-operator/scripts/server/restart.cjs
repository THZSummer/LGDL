#!/usr/bin/env node
'use strict';

/**
 * restart.cjs - 重启 opencode serve（人工运维工具，人类友好输出）
 *
 * 零依赖，使用 Node.js 内置模块。操作对象是 opencode serve server：
 *   杀旧进程（SIGTERM → kill -9 兜底）→ spawn detached 启动 → 健康检查 → 日志/PID 落盘
 *
 * 给"人"在终端使用；LLM Agent 请用 ../serve-api.cjs（stdout JSON）。
 *
 * 用法：
 *   node restart.cjs [--port 14096] [--hostname 127.0.0.1] [--dir .]
 *
 * 默认 --dir 为当前工作目录（运行脚本时所在目录），可用 --dir <path> 覆盖。
 * 日志与 PID 文件写入 <dir>/.opencode/logs/。
 */

const { spawn, execSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { parseArgs } = require('util');

const DEFAULT_PORT = 14096;
const DEFAULT_HOST = '127.0.0.1';

function parseCliArgs(args) {
  const { values } = parseArgs({
    args,
    options: {
      port:     { type: 'string' },
      hostname: { type: 'string' },
      dir:      { type: 'string' },
    },
    strict: false,
  });
  return values;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function httpGet(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ raw: data }); }
      });
    });
    req.on('error', (e) => { e._url = url; reject(e); });
    req.setTimeout(timeoutMs || 3000, () => { req.destroy(new Error('HTTP timeout')); });
    req.end();
  });
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
  const dir = opts.dir ? path.resolve(opts.dir) : process.cwd();

  const url = `http://${hostname}:${port}`;
  const logDir = path.join(dir, '.opencode', 'logs');
  const logFile = path.join(logDir, `opencode-serve-${port}.log`);
  const pidFile = path.join(logDir, `opencode-serve-${port}.pid`);

  fs.mkdirSync(logDir, { recursive: true });

  // 1. 终止占用端口的旧进程
  const oldPids = portPids(port);
  if (oldPids.length > 0) {
    console.log(`==> 停止旧 serve（端口 ${port}）: ${oldPids.join(', ')}`);
    killPids(oldPids, 'SIGTERM');
    await sleep(1000);
    const remain = portPids(port);
    if (remain.length > 0) {
      console.log(`    强杀残留进程: ${remain.join(', ')}`);
      killPids(remain, 'SIGKILL');
    }
  } else {
    console.log(`==> 端口 ${port} 无旧进程，跳过停止`);
  }

  // 2. 以目标目录为工作目录启动 serve（serve 不支持 --dir，须 cwd 到目标目录）
  //    detached + unref：脱离父进程，脚本/终端退出时不会连带终止 serve
  console.log(`==> 启动 opencode serve（端口 ${port}，工作目录 ${dir}）`);
  const logFd = fs.openSync(logFile, 'a');
  const child = spawn('opencode', ['serve', '--port', String(port), '--hostname', hostname], {
    cwd: dir,
    detached: true,
    stdio: ['ignore', logFd, logFd],
  });
  child.unref();
  const pid = child.pid;
  fs.writeFileSync(pidFile, String(pid));

  // 3. 健康检查（最多 30 秒；每次请求带超时防止端口半开时无限挂起）
  console.log('==> 等待健康检查（最多 30 秒）...');
  for (let i = 0; i < 30; i++) {
    await sleep(1000);
    try {
      await httpGet(`${url}/global/health`, 3000);
      console.log(`==> ✓ serve 已就绪: ${url}（pid ${pid}）`);
      console.log(`    日志: ${logFile}`);
      console.log(`    attach: node scripts/server/attach.cjs --port ${port} --dir ${dir}`);
      process.exit(0);
    } catch { /* 还没启动 */ }
  }

  console.error(`!! serve 启动超时，请查看日志: ${logFile}`);
  process.exit(1);
}

main().catch((e) => {
  console.error('!! 执行失败:', e.message);
  process.exit(1);
});
