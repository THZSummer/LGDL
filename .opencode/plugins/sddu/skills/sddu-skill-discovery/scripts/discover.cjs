#!/usr/bin/env node
'use strict';

/**
 * discover.cjs - SDDU Skill 发现脚本（确定性执行）
 *
 * 零依赖，使用 Node.js 内置模块。
 * 扫描源目录发现 SDDU Skill，实现 list / summary / path 三个确定性操作。
 * 替代 Agent 手动 ls / read / 解析 frontmatter 的自由发挥，保证一致性：
 *   - 目录名命名规范校验、frontmatter 解析、level 判定全部由代码锁死
 *
 * 本脚本独立实现，不依赖 sddu-skill-sync（两个技能解耦，各自零依赖）。
 *
 * 用法：
 *   node discover.cjs list                         # 列出所有可用 Skill 目录名
 *   node discover.cjs summary <name>               # 读取指定 Skill 摘要（frontmatter + level）
 *   node discover.cjs path <name>                  # 获取指定 Skill 目录路径
 *   node discover.cjs --user-src <path>            # 指定用户级源（默认 .sddu/skills/）
 *   node discover.cjs --fw-src <path>              # 指定框架级源（默认 .opencode/plugins/sddu/skills/）
 *   node discover.cjs --help                       # 显示帮助
 */

const fs = require('fs');
const path = require('path');
const { parseArgs } = require('util');

const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function usage() {
  console.log(`Usage: node discover.cjs <action> [name] [options]

action:
  list                     列出所有可用 Skill 目录名（仅命名规范过滤）
  summary <name>           读取指定 Skill 摘要（frontmatter name/description + level）
  path <name>              获取指定 Skill 目录路径

options:
  --user-src <path>        用户级源目录（默认 .sddu/skills/）
  --fw-src <path>          框架级源目录（默认 .opencode/plugins/sddu/skills/）
  --help                   显示帮助`);
}

function parseCliArgs(args) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      'user-src': { type: 'string' },
      'fw-src':   { type: 'string' },
      help:       { type: 'boolean' },
    },
    strict: false,
    allowPositionals: true,
  });
  return { values, positionals };
}

// ─── frontmatter 解析（仅需 name/description 存在性判定）───

function unquote(s) {
  s = s.trim();
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1);
  if (s.length >= 2 && s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1);
  return s;
}

function parseFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const body = m[1];
  const name = (body.match(/^name:\s*(.+)$/m) || [])[1];
  const desc = (body.match(/^description:\s*(.+)$/m) || [])[1];
  return { name: name && unquote(name), description: desc && unquote(desc) };
}

// ─── 源目录结构 ───

function getSources(opts) {
  return [
    { dir: path.resolve(opts['user-src'] || '.sddu/skills'), level: 'user' },
    { dir: path.resolve(opts['fw-src'] || '.opencode/plugins/sddu/skills'), level: 'framework' },
  ];
}

// 在源目录中定位技能：按"目录存在"定位（SKILL.md 有效性交给 summary 判断），返回 { path, level } 或 null
function locateSkill(name, sources) {
  if (!NAME_RE.test(name)) return null;
  for (const s of sources) {
    const dirPath = path.join(s.dir, name);
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      return { path: dirPath, level: s.level };
    }
  }
  return null;
}

function output(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

// ─── action: list ───
// 仅返回命名规范过滤的目录名（有效性交给 summary 判断，与原契约一致）

function actionList(opts, sources) {
  const names = [];
  for (const s of sources) {
    if (!fs.existsSync(s.dir)) continue;
    for (const entry of fs.readdirSync(s.dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.')) continue; // 跳过隐藏目录
      if (NAME_RE.test(entry.name)) names.push(entry.name);
    }
  }
  // 去重（同名时框架级优先由 sync 处理，发现阶段只报告一次）
  output([...new Set(names)].sort());
}

// ─── action: summary ───
// 读取指定 Skill 摘要：frontmatter name/description + level（sddu- 前缀 → framework）

function actionSummary(opts, sources, name) {
  if (!name) {
    output({ error: 'missing_name', reason: 'summary 需要 <name> 参数' });
    process.exit(1);
  }
  const found = locateSkill(name, sources);
  if (!found) {
    output({ error: 'not_found', name });
    process.exit(1);
  }
  const sk = path.join(found.path, 'SKILL.md');
  if (!fs.existsSync(sk)) {
    output({ error: 'invalid', reason: 'missing SKILL.md', name });
    process.exit(1);
  }
  const fm = parseFrontmatter(fs.readFileSync(sk, 'utf8'));
  if (!fm.name || !fm.description) {
    output({ error: 'malformed', reason: 'missing name/description', name });
    process.exit(1);
  }
  const level = fm.name.startsWith('sddu-') ? 'framework' : 'user';
  output({ name: fm.name, description: fm.description, level, source: found.path });
}

// ─── action: path ───
// 获取指定 Skill 目录路径

function actionPath(opts, sources, name) {
  if (!name) {
    output({ error: 'missing_name', reason: 'path 需要 <name> 参数' });
    process.exit(1);
  }
  const found = locateSkill(name, sources);
  if (!found) {
    output({ error: 'not_found', name });
    process.exit(1);
  }
  output({ path: found.path, level: found.level });
}

function main() {
  const { values, positionals } = parseCliArgs(process.argv.slice(2));
  if (values.help) { usage(); return; }

  const action = positionals[0];
  const name = positionals[1];
  const sources = getSources(values);

  switch (action) {
    case 'list':
      actionList(values, sources);
      break;
    case 'summary':
      actionSummary(values, sources, name);
      break;
    case 'path':
      actionPath(values, sources, name);
      break;
    default:
      usage();
      process.exit(action ? 1 : 0);
  }
}

main();
