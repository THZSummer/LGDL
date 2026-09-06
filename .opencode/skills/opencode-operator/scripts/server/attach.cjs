#!/usr/bin/env node
'use strict';

/**
 * attach.cjs - 附加到运行中的 opencode serve（人工运维工具，人类友好输出）
 *
 * 零依赖，使用 Node.js 内置模块。健康检查通过后以 TUI 模式 attach 到 serve。
 *
 * 给"人"在终端使用；LLM Agent 请用 ../serve-api.cjs（stdout JSON）。
 *
 * 用法：
 *   node attach.cjs [--port 14096] [--hostname 127.0.0.1] [--dir .]
 *
 * 默认 --dir 为当前工作目录（运行脚本时所在目录），可用 --dir <path> 覆盖。
 */

const { spawn } = require('child_process');
const http = require('http');
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

async function main() {
  const opts = parseCliArgs(process.argv.slice(2));
  const port = parseInt(opts.port || String(DEFAULT_PORT), 10);
  const hostname = opts.hostname || DEFAULT_HOST;
  const dir = opts.dir ? path.resolve(opts.dir) : process.cwd();

  const url = `http://${hostname}:${port}`;

  // 检查服务是否在运行
  try {
    await httpGet(`${url}/global/health`, 3000);
  } catch {
    console.error(`!! opencode serve 未运行（${url}），请先执行: node restart.cjs --port ${port} --dir ${dir}`);
    process.exit(1);
  }

  console.log(`==> attach 到 ${url}（工作目录 ${dir}）`);
  // TUI 模式必须 inherit stdio，保持交互式分屏
  const child = spawn('opencode', ['attach', url, '--dir', dir], { stdio: 'inherit' });
  child.on('exit', (code) => process.exit(code ?? 0));
}

main().catch((e) => {
  console.error('!! 执行失败:', e.message);
  process.exit(1);
});
