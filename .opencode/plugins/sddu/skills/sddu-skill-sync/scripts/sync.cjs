#!/usr/bin/env node
'use strict';

/**
 * sync.cjs - SDDU Skill 同步脚本（确定性执行）
 *
 * 零依赖，使用 Node.js 内置模块。
 * 扫描源目录 → 全量覆盖拷贝到实际目录 → 更新 manifest → 清理残留 → 输出 JSON 报告。
 * 替代 Agent 手动 ls/cp/更新 manifest 的自由发挥，保证一致性与安全边界：
 *   - 拷贝采用「先删目标再拷贝」，杜绝 cp -r 嵌套（xxx/xxx/ 双层目录）
 *   - 只操作 manifest 白名单中的 SDDU 管辖技能；第三方技能（非 SDDU 创建）绝不触碰
 *   - 默认 dry-run 只预览；--apply 实际执行前自动备份，支持 --rollback 回滚
 *
 * 用法：
 *   node sync.cjs                        # 干跑：输出预览报告，不写任何文件
 *   node sync.cjs --apply                # 实际执行（备份 → 拷贝 → 清理 → 更新 manifest）
 *   node sync.cjs --dest <path>          # 指定实际目录（默认 .opencode/skills/）
 *   node sync.cjs --user-src <path>      # 指定用户级源（默认 .sddu/skills/）
 *   node sync.cjs --fw-src <path>        # 指定框架级源（默认 .opencode/plugins/sddu/skills/）
 *   node sync.cjs --backup-dir <path>    # 指定备份目录（默认 <dest>/.backup/）
 *   node sync.cjs --rollback <ts>        # 回滚到指定备份时间戳
 *   node sync.cjs --help                 # 显示帮助
 */

const fs = require('fs');
const path = require('path');
const { parseArgs } = require('util');

const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MANIFEST_HEADER = [
  '# SDDU Skill Manifest - 由 sddu-skill-sync 自动维护，请勿手动编辑',
  '# 格式：<skill-name> | <source> | <last-synced>',
];

function usage() {
  console.log(`Usage: node sync.cjs [options]

  --apply           实际执行（默认 dry-run 只预览，不写文件）
  --dest <path>     实际目录（默认 .opencode/skills/）
  --user-src <path> 用户级源目录（默认 .sddu/skills/）
  --fw-src <path>   框架级源目录（默认 .opencode/plugins/sddu/skills/）
  --backup-dir <p>  备份目录（默认 <dest>/.backup/）
  --rollback <ts>   回滚到指定备份时间戳
  --help            显示帮助`);
}

function parseCliArgs(args) {
  const { values } = parseArgs({
    args,
    options: {
      apply:      { type: 'boolean' },
      dest:       { type: 'string' },
      'user-src': { type: 'string' },
      'fw-src':   { type: 'string' },
      'backup-dir': { type: 'string' },
      rollback:   { type: 'string' },
      help:       { type: 'boolean' },
    },
    strict: false,
  });
  return values;
}

// ─── frontmatter 解析（仅需 name/description 存在性判定）───

function parseFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const body = m[1];
  const name = (body.match(/^name:\s*(.+)$/m) || [])[1];
  const desc = (body.match(/^description:\s*(.+)$/m) || [])[1];
  return { name: name && name.trim(), description: desc && desc.trim() };
}

// 有效 Skill 判定：SKILL.md 存在 + frontmatter 含 name/description + 目录名规范
function isValidSkillDir(dirPath) {
  const sk = path.join(dirPath, 'SKILL.md');
  if (!fs.existsSync(sk)) return { valid: false, reason: 'missing SKILL.md' };
  const fm = parseFrontmatter(fs.readFileSync(sk, 'utf8'));
  if (!fm.name || !fm.description) return { valid: false, reason: 'missing name/description' };
  if (!NAME_RE.test(fm.name)) return { valid: false, reason: 'invalid name: ' + fm.name };
  return { valid: true };
}

// ─── manifest 读写 ───

function readManifest(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8')
    .split('\n')
    .filter(l => l && !l.trim().startsWith('#'))
    .map(l => {
      const [name, source, ts] = l.split('|').map(x => x.trim());
      return { name, source, ts };
    })
    .filter(x => x.name);
}

function writeManifest(file, skills) {
  const now = new Date().toISOString();
  const lines = [...MANIFEST_HEADER, ...skills.map(s => `${s.name} | ${s.source} | ${now}`)];
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, lines.join('\n') + '\n');
}

// ─── 扫描源目录 ───

function scanSources(sourceDirs) {
  const scanned = [];
  for (const { dir, level } of sourceDirs) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.')) continue; // 跳过隐藏目录（如 .backup）
      if (!NAME_RE.test(entry.name)) continue; // 目录名不合规，跳过
      const dirPath = path.join(dir, entry.name);
      const check = isValidSkillDir(dirPath);
      if (check.valid) scanned.push({ name: entry.name, level, sourcePath: dirPath });
    }
  }
  return scanned;
}

// ─── 回滚 ───

function doRollback(opts) {
  const dest = path.resolve(opts.dest || '.opencode/skills');
  const backupDir = path.resolve(opts['backup-dir'] || path.join(dest, '.backup'));
  const ts = opts.rollback;
  const backupPath = path.join(backupDir, ts);
  if (!fs.existsSync(backupPath)) {
    console.error(JSON.stringify({ error: `备份不存在: ${backupPath}` }, null, 2));
    process.exit(1);
  }
  const skillsBackup = path.join(backupPath, 'skills');
  let restored = [];
  if (fs.existsSync(skillsBackup)) {
    for (const entry of fs.readdirSync(skillsBackup, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const destPath = path.join(dest, entry.name);
      fs.rmSync(destPath, { recursive: true, force: true });
      fs.cpSync(path.join(skillsBackup, entry.name), destPath, { recursive: true });
      restored.push(entry.name);
    }
  }
  const mf = path.join(backupPath, 'manifest.txt');
  if (fs.existsSync(mf)) fs.copyFileSync(mf, path.join(dest, '.sddu-manifest.txt'));
  console.log(JSON.stringify({ rolledBack: ts, dest, restored }, null, 2));
}

// ─── 主流程 ───

async function main() {
  const opts = parseCliArgs(process.argv.slice(2));
  if (opts.help) { usage(); return; }
  if (opts.rollback) { doRollback(opts); return; }

  const dest = path.resolve(opts.dest || '.opencode/skills');
  const userSrc = path.resolve(opts['user-src'] || '.sddu/skills');
  const fwSrc = path.resolve(opts['fw-src'] || '.opencode/plugins/sddu/skills');
  const backupDir = path.resolve(opts['backup-dir'] || path.join(dest, '.backup'));
  const apply = !!opts.apply;
  const manifestFile = path.join(dest, '.sddu-manifest.txt');

  // 1. 扫描源目录
  const scanned = scanSources([
    { dir: userSrc, level: 'user' },
    { dir: fwSrc, level: 'framework' },
  ]);

  // 2. 读取 manifest 白名单 + 扫描实际目录
  const manifest = readManifest(manifestFile);
  const destSkills = fs.existsSync(dest)
    ? fs.readdirSync(dest, { withFileTypes: true }).filter(e => e.isDirectory() && !e.name.startsWith('.')).map(e => e.name)
    : [];
  const byName = new Map(scanned.map(s => [s.name, s]));
  const manifestNames = new Set(manifest.map(m => m.name));

  // 3. 差异计算
  const added = [];
  const updated = [];
  const skipped = [];
  const cleaned = [];
  const protectedList = [];

  for (const s of scanned) {
    const destPath = path.join(dest, s.name);
    if (!fs.existsSync(destPath)) {
      added.push(s.name);
    } else {
      const srcM = fs.statSync(path.join(s.sourcePath, 'SKILL.md')).mtimeMs;
      const dstM = fs.statSync(path.join(destPath, 'SKILL.md')).mtimeMs;
      if (srcM > dstM) updated.push(s.name);
      else skipped.push(s.name);
    }
  }

  // 清理候选：manifest 管辖且源已删除（仅当实际目录仍存在该技能）
  for (const name of manifestNames) {
    if (!byName.has(name) && fs.existsSync(path.join(dest, name))) {
      cleaned.push(name);
    }
  }

  // 第三方保护：实际目录存在但不在 manifest 且源无 → 绝不操作
  for (const name of destSkills) {
    if (!byName.has(name) && !manifestNames.has(name)) {
      protectedList.push(name);
    }
  }

  const report = {
    mode: apply ? 'apply' : 'dry-run',
    dest,
    scanned: scanned.map(s => s.name),
    added,
    updated,
    skipped,
    cleaned,
    protected: protectedList,
    conflicts: [],
  };

  if (!apply) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  // 4. 备份（先行）
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, ts);
  fs.mkdirSync(path.join(backupPath, 'skills'), { recursive: true });
  for (const name of destSkills) {
    fs.cpSync(path.join(dest, name), path.join(backupPath, 'skills', name), { recursive: true });
  }
  if (fs.existsSync(manifestFile)) {
    fs.copyFileSync(manifestFile, path.join(backupPath, 'manifest.txt'));
  }
  report.backup = backupPath;

  // 5. 拷贝（先删后拷，杜绝嵌套）
  for (const s of scanned) {
    const destPath = path.join(dest, s.name);
    fs.rmSync(destPath, { recursive: true, force: true });
    fs.cpSync(s.sourcePath, destPath, { recursive: true });
  }

  // 6. 清理（仅 cleaned：manifest 管辖 + 源已删除）
  for (const name of cleaned) {
    fs.rmSync(path.join(dest, name), { recursive: true, force: true });
  }

  // 7. 更新 manifest
  writeManifest(manifestFile, scanned.map(s => ({ name: s.name, source: s.level })));

  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(JSON.stringify({ error: e.message }, null, 2));
  process.exit(1);
});
