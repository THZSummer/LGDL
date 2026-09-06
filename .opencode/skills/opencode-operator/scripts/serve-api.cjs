#!/usr/bin/env node
'use strict';

/**
 * serve-api.cjs - opencode serve HTTP API 封装脚本
 *
 * 零依赖，使用 Node.js 内置模块。
 * 封装 serve 的会话管理、消息发送、轮询、进程管理。
 * LLM 调用本脚本，不需要手动构造 curl 命令。
 *
 * 用法：
 *   node serve-api.cjs run --message "..." [--agent sddu] [--dir .] [--port 4096] [--timeout 600]
 *   node serve-api.cjs start [--port 4096] [--hostname 127.0.0.1] [--dir .]
 *   node serve-api.cjs send --url <url> --message "..." [--agent sddu] [--timeout 600]
 *   node serve-api.cjs stop --port 4096
 *   node serve-api.cjs ps [--port 4096]
 *   node serve-api.cjs sessions --port 4096 [--agent <name>] [--grep <kw>] [--limit 5] [--full]
 *   node serve-api.cjs rm --port 4096 --session <sid>
 */

const { spawn, execSync } = require('child_process');
const http = require('http');
const { parseArgs } = require('util');

// ─── 参数解析 ───

function parseCliArgs(args) {
  const { values } = parseArgs({
    args,
    options: {
      port:      { type: 'string' },
      hostname:  { type: 'string' },
      dir:       { type: 'string' },
      message:   { type: 'string' },
      agent:     { type: 'string' },
      timeout:   { type: 'string' },
      interval:  { type: 'string' },
      session:   { type: 'string' },
      grep:      { type: 'string' },
      limit:     { type: 'string' },
      full:      { type: 'boolean' },
    },
    strict: false,
  });
  return values;
}

function requireOpts(opts, keys) {
  const missing = keys.filter(k => opts[k] === undefined);
  if (missing.length > 0) {
    output({ error: '缺少必填参数 ' + missing.map(k => '--' + k).join(', ') });
    process.exit(1);
  }
}

function getUrl(opts) {
  const port = opts.port || '4096';
  const hostname = opts.hostname || '127.0.0.1';
  return `http://${hostname}:${port}`;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function elapsed(start) {
  return ((Date.now() - start) / 1000).toFixed(1) + 's';
}

function output(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

// ─── 任务完成检测 ───
// opencode session 无 status 字段，通过消息数是否增长来判断任务是否完成。
// 连续 2 次轮询消息数不变，且消息数 > 1（有 user + assistant），则认为完成。

async function checkDone(url, sessionId, lastMsgCount) {
  const messages = await httpGet(`${url}/session/${sessionId}/message`, 10000);
  const count = Array.isArray(messages) ? messages.length : 1;
  const done = count > 1 && count === lastMsgCount;
  return { done, count, messages };
}

// ─── HTTP 工具函数 ───

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
    req.setTimeout(timeoutMs || 10000, () => { req.destroy(new Error('HTTP timeout')); });
    req.end();
  });
}

function httpPost(url, body, timeoutMs) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const payload = JSON.stringify(body);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ raw: data }); }
      });
    });
    req.on('error', (e) => { e._url = url; reject(e); });
    req.setTimeout(timeoutMs || 10000, () => { req.destroy(new Error('HTTP timeout')); });
    req.write(payload);
    req.end();
  });
}

// ─── 子命令：start ───

async function cmdStart(opts) {
  const port = parseInt(opts.port || '4096');
  const hostname = opts.hostname || '127.0.0.1';
  const dir = opts.dir || '.';

  // 启动 serve 进程（detached，父进程退出后存活）
  const child = spawn('opencode', ['serve', '--port', String(port), '--hostname', hostname], {
    cwd: dir,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();

  const pid = child.pid;
  const url = `http://${hostname}:${port}`;

  // 等待健康检查通过（最多 30 秒）
  for (let i = 0; i < 30; i++) {
    await sleep(1000);
    try {
      const health = await httpGet(`${url}/global/health`, 5000);
      if (health) {
        output({ url, port, pid, status: 'running' });
        return;
      }
    } catch { /* 还没启动 */ }
  }

  output({ error: `serve 启动超时，端口 ${port} 无响应`, pid });
  process.exit(1);
}

// ─── 子命令：send ───

async function cmdSend(opts) {
  const url = getUrl(opts);
  const message = opts.message;
  const agent = opts.agent;
  const timeoutSec = parseInt(opts.timeout || '600');
  const intervalSec = parseInt(opts.interval || '5');

  requireOpts(opts, ['port', 'message']);

  const start = Date.now();

  // 1. 创建会话
  const session = await httpPost(`${url}/session`, { title: 'serve-api-task' });
  const sessionId = session.id;

  if (!sessionId) {
    output({ error: '创建会话失败', response: session });
    process.exit(1);
  }

  // 2. 异步发送消息
  const msgBody = { parts: [{ type: 'text', text: message }] };
  if (agent) msgBody.agent = agent;

  await httpPost(`${url}/session/${sessionId}/prompt_async`, msgBody);

  // 3. 轮询直到完成（消息数连续 2 次不变则认为完成）
  let done = false;
  let lastMsgCount = 0;
  let messages = [];
  while (!done && (Date.now() - start) < timeoutSec * 1000) {
    await sleep(intervalSec * 1000);
    try {
      const r = await checkDone(url, sessionId, lastMsgCount);
      done = r.done;
      lastMsgCount = r.count;
      messages = r.messages;
      process.stderr.write(`[${elapsed(start)}] messages: ${r.count}${done ? ' (done)' : ''}\n`);
    } catch (e) {
      process.stderr.write(`[${elapsed(start)}] poll error: ${e.message}\n`);
    }
  }

  if (!done) {
    output({ error: '任务超时', sessionId, duration: elapsed(start) });
    process.exit(1);
  }

  output({ sessionId, status: 'completed', messages, duration: elapsed(start) });
}

// ─── 子命令：stop ───

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

function cmdStop(opts) {
  const port = opts.port;
  requireOpts(opts, ['port']);

  const pids = portPids(port);
  if (pids.length === 0) {
    output({ killed: false, port: parseInt(port), reason: '端口无进程' });
    return;
  }

  // 1. SIGTERM 优雅停止
  for (const p of pids) {
    try { process.kill(parseInt(p), 'SIGTERM'); } catch {}
  }
  try { execSync('sleep 1'); } catch {}

  // 2. 残留检测 + kill -9 兜底
  let forced = false;
  const remain = portPids(port);
  if (remain.length > 0) {
    for (const p of remain) {
      try { process.kill(parseInt(p), 'SIGKILL'); } catch {}
    }
    forced = true;
    try { execSync('sleep 0.5'); } catch {}
  }

  // 3. 最终确认（真实状态，避免误报）
  const after = portPids(port);
  if (after.length === 0) {
    output({ killed: true, port: parseInt(port), pids: pids.map(Number), forced });
  } else {
    output({ killed: false, port: parseInt(port), pids: after.map(Number), reason: '仍有进程残留，请手动检查' });
    process.exit(1);
  }
}

// ─── HTTP 工具函数 ── DELETE

function httpDelete(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: 'DELETE',
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
    req.setTimeout(timeoutMs || 10000, () => { req.destroy(new Error('HTTP timeout')); });
    req.end();
  });
}

// ─── 子命令：sessions（列出会话） ───

async function cmdSessions(opts) {
  const url = getUrl(opts);

  requireOpts(opts, ['port']);

  const sessions = await httpGet(`${url}/session`, 10000);
  let list = Array.isArray(sessions) ? sessions : [];

  // 1. agent 过滤
  if (opts.agent) {
    list = list.filter(s => s.agent === opts.agent);
  }

  // 2. grep 过滤 title
  if (opts.grep) {
    const kw = String(opts.grep).toLowerCase();
    list = list.filter(s => String(s.title || '').toLowerCase().includes(kw));
  }

  // 3. 按 time 降序排序（无效 time 放最后）
  //    time 可能是对象 {created,updated} 或字符串，兼容处理
  const getTs = (t) => {
    if (typeof t === 'object' && t) return t.updated || t.created || 0;
    return new Date(t).getTime() || 0;
  };
  list.sort((a, b) => getTs(b.time) - getTs(a.time));

  // 4. limit 切片（limit=0 不限返回全部；默认 5）
  const limit = opts.limit !== undefined ? parseInt(opts.limit) : 5;
  if (limit > 0) list = list.slice(0, limit);

  // 5. 输出：full 返回完整；默认摘要（id/title/agent/time）
  if (opts.full) {
    output(list);
  } else {
    output(list.map(s => ({
      id: String(s.id || '').slice(0, 12),
      title: s.title,
      agent: s.agent,
      time: s.time,
    })));
  }
}

// ─── 子命令：rm（删除会话，不可逆） ───

async function cmdRm(opts) {
  const url = getUrl(opts);
  const sessionId = opts.session;

  requireOpts(opts, ['port', 'session']);

  const response = await httpDelete(`${url}/session/${sessionId}`, 10000);
  output({ deleted: true, sessionId, response });
}

// ─── 子命令：ps（进程巡检） ───

async function cmdPs(opts) {
  const psOutput = execSync('ps -eo pid,etime,command', { encoding: 'utf8' });
  const lines = psOutput.split('\n').filter(line => /[o]pencode\s+serve/.test(line));

  const processes = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 解析：PID（行首数字）、etime（第二列非空）、command（剩余）
    const m = trimmed.match(/^(\d+)\s+(\S+)\s+(.+)$/);
    if (!m) continue;

    const pid = m[1];
    const etime = m[2];
    const command = m[3];

    // 从 command 提取参数
    const portMatch = command.match(/--port\s+(\d+)/);
    const hostMatch = command.match(/--hostname\s+(\S+)/);
    const dirMatch  = command.match(/--(?:dir|cwd)\s+(\S+)/);

    const port     = portMatch ? parseInt(portMatch[1]) : 4096;
    const hostname = hostMatch ? hostMatch[1] : '127.0.0.1';
    const dir      = dirMatch  ? dirMatch[1]  : null;

    // 可选按端口过滤
    if (opts.port && String(port) !== String(opts.port)) continue;

    processes.push({ pid, etime, port, hostname, dir });
  }

  // 对每个进程做健康探测（复用现有 async httpGet）
  const results = [];
  for (const proc of processes) {
    const url = `http://${proc.hostname}:${proc.port}`;
    let health  = 'down';
    let version = null;

    try {
      const h = await httpGet(`${url}/global/health`, 3000);
      health  = 'alive';
      version = (h && h.version) ? h.version : 'unknown';
    } catch { /* 探测失败视为 down */ }

    results.push({
      pid:      proc.pid,
      etime:    proc.etime,
      port:     proc.port,
      hostname: proc.hostname,
      dir:      proc.dir,
      health,
      version,
    });
  }

  output(results);
}

// ─── 子命令：submit（非阻塞提交） ───

async function cmdSubmit(opts) {
  const url = getUrl(opts);
  const message = opts.message;
  const agent = opts.agent;

  requireOpts(opts, ['message']);

  // 创建会话 + 异步发送消息，不等结果
  const session = await httpPost(`${url}/session`, { title: 'serve-api-task' });
  const sessionId = session.id;

  const msgBody = { parts: [{ type: 'text', text: message }] };
  if (agent) msgBody.agent = agent;
  await httpPost(`${url}/session/${sessionId}/prompt_async`, msgBody);

  output({ sessionId, status: 'submitted', url });
}

// ─── 子命令：status（查状态） ───

async function cmdStatus(opts) {
  const url = getUrl(opts);
  const sessionId = opts.session;

  requireOpts(opts, ['port']);

  // 检查服务器健康
  let health;
  try {
    health = await httpGet(`${url}/global/health`, 5000);
  } catch {
    output({ server: 'down', url });
    return;
  }

  // 指定 session 时查询会话详情
  if (sessionId) {
    try {
      const messages = await httpGet(`${url}/session/${sessionId}/message`, 10000);
      const msgCount = Array.isArray(messages) ? messages.length : 1;
      // 通过消息数判断：>1 条消息且最后一条非 user 则认为完成
      const lastMsg = Array.isArray(messages) && messages.length > 0 ? messages[messages.length - 1] : null;
      const lastRole = lastMsg ? (lastMsg.role || lastMsg.type || '') : '';
      const done = msgCount > 1 && lastRole !== 'user';
      output({
        server: 'running',
        sessionId,
        status: done ? 'completed' : 'running',
        messageCount: msgCount,
      });
    } catch (e) {
      output({ server: 'running', sessionId, error: e.message });
    }
    return;
  }

  // 只报告服务器状态
  output({ server: 'running', url, version: health.version || 'unknown' });
}

// ─── 子命令：result（取结果） ───

async function cmdResult(opts) {
  const url = getUrl(opts);
  const sessionId = opts.session;

  requireOpts(opts, ['port', 'session']);

  const messages = await httpGet(`${url}/session/${sessionId}/message`, 30000);
  const msgCount = Array.isArray(messages) ? messages.length : 1;
  const lastMsg = Array.isArray(messages) && messages.length > 0 ? messages[messages.length - 1] : null;
  const lastRole = lastMsg ? (lastMsg.role || lastMsg.type || '') : '';
  const done = msgCount > 1 && lastRole !== 'user';

  output({ sessionId, status: done ? 'completed' : 'running', messages });
}

// ─── 子命令：abort（中止会话） ───

async function cmdAbort(opts) {
  const url = getUrl(opts);
  const sessionId = opts.session;

  requireOpts(opts, ['port', 'session']);

  await httpPost(`${url}/session/${sessionId}/abort`, {});
  output({ aborted: true, sessionId });
}

// ─── 子命令：run（start + send + stop 一条龙） ───

async function cmdRun(opts) {
  const message = opts.message;
  requireOpts(opts, ['message']);

  const agent = opts.agent;
  const dir = opts.dir || '.';
  const port = parseInt(opts.port || '4096');
  const timeoutSec = parseInt(opts.timeout || '600');
  const start = Date.now();

  // 1. 启动 serve
  const child = spawn('opencode', ['serve', '--port', String(port), '--hostname', '127.0.0.1'], {
    cwd: dir,
    detached: false,
    stdio: 'ignore',
  });

  const url = `http://127.0.0.1:${port}`;

  // 等待健康检查
  let ready = false;
  for (let i = 0; i < 30; i++) {
    await sleep(1000);
    try {
      await httpGet(`${url}/global/health`, 5000);
      ready = true;
      break;
    } catch {}
  }

  if (!ready) {
    try { child.kill('SIGKILL'); } catch {}
    output({ error: 'serve 启动超时' });
    process.exit(1);
  }

  // 2. 创建会话 + 发送消息 + 轮询
  try {
    const session = await httpPost(`${url}/session`, { title: 'serve-api-run' });
    const sessionId = session.id;

    const msgBody = { parts: [{ type: 'text', text: message }] };
    if (agent) msgBody.agent = agent;
    await httpPost(`${url}/session/${sessionId}/prompt_async`, msgBody);

    // 轮询（消息数连续 2 次不变则完成）
    let done = false;
    let lastMsgCount = 0;
    let messages = [];
    while (!done && (Date.now() - start) < timeoutSec * 1000) {
      await sleep(5000);
      try {
        const r = await checkDone(url, sessionId, lastMsgCount);
        done = r.done;
        lastMsgCount = r.count;
        messages = r.messages;
        process.stderr.write(`[${elapsed(start)}] messages: ${r.count}${done ? ' (done)' : ''}\n`);
      } catch (e) {
        process.stderr.write(`[${elapsed(start)}] poll error: ${e.message}\n`);
      }
    }

    output({
      sessionId,
      status: done ? 'completed' : 'timeout',
      messages,
      duration: elapsed(start),
      port,
    });
  } finally {
    // 3. 停止 serve
    try { child.kill('SIGTERM'); } catch {}
  }
}

// ─── 主入口 ───

// 全局未捕获 Promise 拒绝处理器 — 将 serve 连接错误转为友好 JSON 输出
process.on('unhandledRejection', (err) => {
  const url = err._url || '';
  const code = err.code || '';

  if (code === 'ECONNREFUSED' || code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'ENOTFOUND') {
    output({
      error: '无法连接到 serve 服务器',
      url,
      code,
      hint: '请确认 serve 已启动，可用 ps 命令巡检或 start 命令启动',
    });
  } else {
    output({
      error: err.message || String(err),
      url,
    });
  }

  process.exit(1);
});

const args = process.argv.slice(2);
const cmd = args[0];
const opts = parseCliArgs(args.slice(1));

switch (cmd) {
  case 'start':
    cmdStart(opts);
    break;
  case 'submit':
    cmdSubmit(opts);
    break;
  case 'send':
    cmdSend(opts);
    break;
  case 'status':
    cmdStatus(opts);
    break;
  case 'result':
    cmdResult(opts);
    break;
  case 'abort':
    cmdAbort(opts);
    break;
  case 'stop':
    cmdStop(opts);
    break;
  case 'run':
    cmdRun(opts);
    break;
  case 'ps':
    cmdPs(opts);
    break;
  case 'sessions':
    cmdSessions(opts);
    break;
  case 'rm':
    cmdRm(opts);
    break;
  default:
    process.stderr.write(`Usage: node serve-api.cjs <command> [options]

 阻塞模式：
   run    --message "..." [--agent sddu] [--dir .] [--port 4096] [--timeout 600]
          一条龙：启动 serve -> 提交 -> 轮询 -> 取结果 -> 关闭

   send   --port 4096 --message "..." [--agent sddu] [--timeout 600]
          向已运行的 serve 提交任务，阻塞直到完成

 非阻塞模式：
   start  [--port 4096] [--hostname 127.0.0.1] [--dir .]
          启动 serve，返回端口 + PID

   submit --port 4096 --message "..." [--agent sddu]
          提交任务，立即返回 sessionId，不等待完成

   status --port 4096 [--session <sid>]
          查 serve 健康状态；指定 --session 时查会话进度

   result --port 4096 --session <sid>
          取已完成的会话消息

   abort  --port 4096 --session <sid>
          中止运行中的会话

   stop   --port 4096
          按端口查找并杀掉 serve 进程

   ps     [--port 4096]
          列出所有运行中的 serve 进程加健康探测

   sessions --port 4096 [--agent <name>] [--grep <kw>] [--limit 5] [--full]
          列出会话（默认摘要最近5条，数据全局共享）

   rm     --port 4096 --session <sid>
          删除指定会话（不可逆）
 `);
    process.exit(1);
}
