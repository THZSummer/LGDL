#!/usr/bin/env node
/**
 * generate-tree.cjs — SDDU 目录导航脚本
 *
 * 用途：扫描指定 Feature 目录及父目录链，生成/更新各层级 TREE.md 导航文件。
 *
 * 入参：
 *   --target <目录路径>    必填。当前 Feature 路径，支持相对 .sddu/ 或绝对路径。
 *                          例：--target specs-tree-root/specs-tree-tree-skill/
 *
 * 出参 (stdout JSON)：
 *   {
 *     "created": ["path/to/new/TREE.md", ...],
 *     "updated": [{"path": "path/to/updated/TREE.md", "changes": ["change1", ...]}, ...],
 *     "skipped": ["path/to/unchanged/TREE.md", ...],
 *     "errors": [],
 *     "stats": {"scanned": 3, "created": 1, "updated": 1, "skipped": 1}
 *   }
 *
 * 退出码：
 *   0 — 成功（含部分跳过/警告）
 *   1 — 致命错误（参数错误、目录不存在）
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─────────────────────────── 命令行参数解析 ───────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  let target = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--target' && i + 1 < args.length) {
      target = args[i + 1];
      i++;
    }
  }

  if (!target) {
    console.error('❌ 错误：缺少 --target 参数');
    console.error('用法：node generate-tree.cjs --target <目录路径>');
    console.error('示例：node generate-tree.cjs --target specs-tree-root/specs-tree-tree-skill/');
    process.exit(1);
  }

  return target;
}

// ─────────────────────────── 路径工具 ───────────────────────────

/**
 * 解析 --target 为绝对路径。
 * 支持：相对 .sddu/ 的路径、相对 cwd 的路径、绝对路径。
 */
function resolveTarget(cwd, targetArg) {
  // 绝对路径
  if (path.isAbsolute(targetArg)) {
    return targetArg;
  }

  // 以 .sddu/ 开头的相对路径 → 基于 cwd 解析
  const candidate = path.resolve(cwd, targetArg);
  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
    return candidate;
  }

  // 尝试移除 .sddu/ 前缀重试
  const stripped = targetArg.replace(/^\.sddu\//, '');
  const candidate2 = path.resolve(cwd, '.sddu', stripped);
  if (fs.existsSync(candidate2) && fs.statSync(candidate2).isDirectory()) {
    return candidate2;
  }

  return candidate;
}

// ─────────────────────────── 文件系统工具 ───────────────────────────

function safeExec(cmd, fallback) {
  try {
    return execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }).trim();
  } catch {
    return fallback || '';
  }
}

function safeReadJson(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

function safeReadFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
  } catch {
    return null;
  }
}

// ─────────────────────────── 状态标记 ───────────────────────────

/**
 * 根据 state.json（v3.0.0 两字段模型）生成状态标记。
 * 兼容旧格式（phase 为数字）。
 */
function getStatusMark(stateJson) {
  if (!stateJson) return '⚠️ 状态异常';

  let phase = stateJson.phase;
  let status = stateJson.status;

  // 兼容旧格式：phase 为数字时转换
  if (typeof phase === 'number') {
    const phaseMap = {
      0: 'discovered', 1: 'specified', 2: 'planned', 3: 'tasked',
      4: 'builded', 5: 'reviewed', 6: 'validated'
    };
    phase = phaseMap[phase] || String(phase);
  }

  switch (status) {
    case 'completed':
      return '✅ 已完成';
    case 'suspended': {
      const note = stateJson.suspended && stateJson.suspended.suspendedNote
        ? ' - ' + stateJson.suspended.suspendedNote : '';
      return `🟡 搁置${note}`;
    }
    case 'terminated':
      return '🚫 已终止';
    case 'merged': {
      const into = (stateJson.merged && stateJson.merged.mergedInto) || 'N/A';
      return `🔵 已迁出 → ${into}`;
    }
    case 'tracked': {
      if (phase === 'validated') return '✅ 已完成';
      return `🟢 tracked [${phase}]`;
    }
    default:
      return '⚠️ 状态异常';
  }
}

/**
 * 根据 phase（字符串）获取中文阶段名。
 */
function getPhaseName(phase) {
  const map = {
    registered: '注册',
    discovered: '发现',
    specified: '规范',
    planned: '设计',
    tasked: '任务分解',
    builded: '构建完成',
    reviewed: '审查完成',
    validated: '验证完成'
  };
  return map[phase] || phase;
}

/**
 * 根据 phase 获取阶段编号字符串（如 "7/7"）。
 * 支持字符串 phase（如 "validated"）和数字 phase（如 7）。
 */
function getPhaseStage(phase) {
  const stageMap = {
    registered: 0, discovered: 1, specified: 2, planned: 3,
    tasked: 4, builded: 5, reviewed: 6, validated: 7
  };
  if (typeof phase === 'number') return `${phase}/7`;
  const stage = stageMap[phase];
  return stage !== undefined ? `${stage}/7` : '?/7';
}

// ─────────────────────────── 文件简介提取 ───────────────────────────

/**
 * 从 .md 文件中提取标题和简短概述。
 */
function extractMdInfo(filePath) {
  const content = safeReadFile(filePath);
  if (!content) return null;

  const lines = content.split('\n');
  let title = '';
  let overview = '';
  let inFrontmatter = false;
  let frontmatterEnded = false;

  for (const line of lines) {
    const trimmed = line.trim();
    // 处理 YAML frontmatter
    if (trimmed === '---') {
      if (!frontmatterEnded) {
        inFrontmatter = !inFrontmatter;
        if (!inFrontmatter) frontmatterEnded = true;
      }
      continue;
    }
    if (inFrontmatter) continue;
    // 跳过文档定位/描述行（以 > 开头）
    if (trimmed.startsWith('>')) continue;
    // 跳过表格行
    if (trimmed.startsWith('|')) continue;
    // 跳过代码块标记
    if (trimmed.startsWith('```')) continue;
    // 找到 # 标题
    if (!title && line.startsWith('# ')) {
      title = line.replace(/^# /, '').trim();
      continue;
    }
    // 找到第一个有实质内容的段落作为概述
    if (title && !overview && trimmed
        && !trimmed.startsWith('#')
        && !trimmed.startsWith('-')
        && !trimmed.startsWith('*')
        && trimmed.length > 10) {
      overview = trimmed;
    }
  }

  if (!title) {
    title = path.basename(filePath, '.md');
  }

  if (!overview) {
    overview = title;
  }

  // 截断概述到 80 字符
  if (overview.length > 80) {
    overview = overview.substring(0, 77) + '...';
  }

  return { title, overview };
}

// ─────────────────────────── TREE.md 生成 ───────────────────────────

/**
 * 生成 Feature 级 TREE.md 内容。
 */
function generateFeatureTree(dirPath, dirName, relPath) {
  const files = safeExec(`find "${dirPath}" -maxdepth 1 -type f \\( -name "*.md" -o -name "*.json" \\) ! -name "TREE.md" 2>/dev/null | sort`)
    .split('\n')
    .filter(Boolean);

  const subdirs = safeExec(`find "${dirPath}" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | sort`)
    .split('\n')
    .filter(Boolean);

  const stateJson = safeReadJson(path.join(dirPath, 'state.json'));

  // 提取简介（从 spec.md 或 discovery.md）
  let summary = '';
  const specPath = path.join(dirPath, 'spec.md');
  const discPath = path.join(dirPath, 'discovery.md');
  if (fs.existsSync(specPath)) {
    const info = extractMdInfo(specPath);
    if (info && info.overview) summary = info.overview;
  }
  if (!summary && fs.existsSync(discPath)) {
    const info = extractMdInfo(discPath);
    if (info && info.overview) summary = info.overview;
  }
  if (!summary) {
    summary = `${dirName} 目录`;
  }

  // 构建目录结构树
  const treeLines = [];
  treeLines.push(`${dirName}/`);
  const allEntries = [];

  // TREE.md always first
  allEntries.push({ name: 'TREE.md', comment: '本文件 - 目录导航' });

  for (const f of files) {
    const name = path.basename(f);
    const ext = path.extname(name);
    if (name === 'state.json') {
      const statusMark = getStatusMark(stateJson);
      allEntries.push({ name, comment: `状态文件 (${statusMark})` });
    } else if (ext === '.md') {
      const info = extractMdInfo(f);
      const comment = info ? info.title : name;
      allEntries.push({ name, comment });
    } else if (ext === '.json') {
      allEntries.push({ name, comment: '任务清单 (机器可读)' });
    }
  }

  for (const d of subdirs) {
    const name = path.basename(d);
    // 读取子目录 TREE 获取简介
    const subTreePath = path.join(d, 'TREE.md');
    let comment = '';
    if (fs.existsSync(subTreePath)) {
      const subContent = safeReadFile(subTreePath);
      if (subContent) {
        const match = subContent.match(/^## 目录简介\n([^\n#]+)/m);
        if (match) comment = match[1].trim().substring(0, 50);
      }
    }
    if (!comment) comment = '子目录';
    allEntries.push({ name: name + '/', comment });
  }

  // 渲染树形图
  for (let i = 0; i < allEntries.length; i++) {
    const e = allEntries[i];
    const isLast = i === allEntries.length - 1;
    const prefix = isLast ? '└── ' : '├── ';
    const name = e.name + (e.comment ? `          # ${e.comment}` : '');
    treeLines.push(`${prefix}${name}`);
  }

  // 构建文件说明表
  const fileTableRows = [];
  for (const f of files) {
    const name = path.basename(f);
    const ext = path.extname(name);
    if (name === 'state.json') {
      const mark = getStatusMark(stateJson);
      fileTableRows.push(`| ${name} | 状态文件 | ${mark} |`);
    } else if (ext === '.md') {
      const info = extractMdInfo(f);
      const desc = info ? `${info.title} — ${info.overview}` : name;
      // 确定状态标记 — .md 文件统一标记为存在
      const fileStatus = '✅ 存在';
      fileTableRows.push(`| ${name} | ${desc} | ${fileStatus} |`);
    } else if (ext === '.json') {
      fileTableRows.push(`| ${name} | 任务清单（机器可读） | ✅ 存在 |`);
    }
  }

  // 拼接最终内容
  const lines = [];
  lines.push(`# Directory: ${relPath}`);
  lines.push('');
  lines.push('## 目录简介');
  lines.push(summary);
  lines.push('');
  lines.push('## 目录结构');
  lines.push('```');
  for (const tl of treeLines) {
    lines.push(tl);
  }
  lines.push('```');
  lines.push('');
  lines.push('## 文件说明');
  lines.push('| 文件 | 说明 | 状态 |');
  lines.push('|------|------|------|');
  for (const row of fileTableRows) {
    lines.push(row);
  }
  lines.push('');

  // Feature 状态表（从 state.json 读取实际 phase 和 status）
  if (stateJson && stateJson.phase) {
    const featureId = (stateJson.metadata && stateJson.metadata.featureId) || stateJson.featureId || 'N/A';
    const phaseStr = `${getPhaseName(stateJson.phase)} (${getPhaseStage(stateJson.phase)})`;
    const statusMark = getStatusMark(stateJson);
    lines.push('## Feature 状态');
    lines.push('| 字段 | 值 |');
    lines.push('|------|-----|');
    lines.push(`| Feature ID | ${featureId} |`);
    lines.push(`| Phase | ${phaseStr} |`);
    lines.push(`| Status | ${statusMark} |`);
    lines.push('');
  }

  lines.push('## 上级目录');
  lines.push('- [返回上级](../TREE.md)');
  lines.push('- [返回首页](../../TREE.md)');

  return lines.join('\n') + '\n';
}

/**
 * 在 specs-tree-root/TREE.md 中更新指定 Feature 的行。
 * 采用行级替换策略，只修改 Feature 条目行，保留其余内容不变。
 */
function updateSpecsRootTree(existingContent, targetDirName, stateJson) {
  if (!existingContent) return null;

  const lines = existingContent.split('\n');
  const newLines = [];
  const featureDirName = path.basename(targetDirName);
  const phase = (stateJson && stateJson.phase) ? (typeof stateJson.phase === 'number' ? stateJson.phase : stateJson.phase) : 'discovered';
  const status = (stateJson && stateJson.status) || 'tracked';
  const statusMark = getStatusMark(stateJson);
  const featureId = (stateJson && stateJson.metadata && stateJson.metadata.featureId) || '';
  const description = (stateJson && stateJson.metadata && stateJson.metadata.name) || '';

  let changes = [];

  let inFeatureTable = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 检测是否进入 Feature 表格区域
    if (line.includes('| 目录 | Feature ID | 说明 |') || line.includes('| 目录 | Feature ID | 说明 | Phase | Status |')) {
      inFeatureTable = true;
      newLines.push(line);
      continue;
    }
    if (inFeatureTable && line.trim() === '') {
      inFeatureTable = false;
      newLines.push(line);
      continue;
    }

    if (inFeatureTable && line.startsWith('|') && line.includes(featureDirName)) {
      // 这是目标 Feature 的行 — 需要更新
      const cols = line.split('|').filter(c => c.trim());
      // 检查是否有 Phase 列（6 列表格）还是无 Phase 列（5 列）
      if (cols.length >= 6) {
        // 有 Phase + Status 列
        const phaseStr = String(phase);
        const newLine = `| ${featureDirName} | ${featureId} | ${description} | ${phaseStr} | ${statusMark} |`;
        newLines.push(newLine);
        changes.push(`状态变更: ${featureDirName} → ${statusMark}`);
      } else if (cols.length >= 5) {
        // 只有 Status 列
        const newLine = `| ${featureDirName} | ${featureId} | ${description} | ${statusMark} |`;
        newLines.push(newLine);
        changes.push(`状态变更: ${featureDirName} → ${statusMark}`);
      } else {
        newLines.push(line);
      }
      continue;
    }

    newLines.push(line);
  }

  const newContent = newLines.join('\n');
  if (newContent !== existingContent) {
    return { content: newContent, changes };
  }
  return null;
}

/**
 * 更新 .sddu/TREE.md 中的统计信息。
 */
function updateRootTree(existingContent, allFeatures) {
  if (!existingContent) return null;

  const tracked = allFeatures.filter(f => f.status === 'tracked' || f.status === 'active').length;
  const completed = allFeatures.filter(f => f.status === 'completed').length;
  const terminated = allFeatures.filter(f => f.status === 'terminated').length;

  const lines = existingContent.split('\n');
  const newLines = [];
  let inStatsTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('Feature 总数') || line.includes('已完成') || line.includes('进行中') || line.includes('已终止')) {
      inStatsTable = true;
    }
    if (inStatsTable && line.trim() === '') {
      inStatsTable = false;
    }

    if (inStatsTable) {
      if (line.includes('Feature 总数')) {
        newLines.push(`| Feature 总数 | ${allFeatures.length} |`);
      } else if (line.includes('已完成 (completed)')) {
        newLines.push(`| 已完成 (completed) | ${completed} |`);
      } else if (line.includes('进行中 (tracked)')) {
        newLines.push(`| 进行中 (tracked) | ${tracked} |`);
      } else if (line.includes('已终止 (terminated)')) {
        newLines.push(`| 已终止 (terminated) | ${terminated} |`);
      } else {
        newLines.push(line);
      }
      continue;
    }

    newLines.push(line);
  }

  const newContent = newLines.join('\n');
  if (newContent !== existingContent) {
    return { content: newContent, changes: [`统计更新: ${allFeatures.length} 个 Feature, ${completed} 已完成, ${tracked} 进行中, ${terminated} 已终止`] };
  }
  return null;
}

// ─────────────────────────── 主逻辑 ───────────────────────────

function main() {
  const cwd = process.cwd();
  const targetArg = parseArgs();
  const targetPath = resolveTarget(cwd, targetArg);

  // 验证 .sddu/ 目录存在
  const sdduRoot = path.resolve(cwd, '.sddu');
  if (!fs.existsSync(sdduRoot) || !fs.statSync(sdduRoot).isDirectory()) {
    console.error('❌ 错误：.sddu/ 目录不存在，请先初始化 SDDU 工作空间');
    process.exit(1);
  }

  // 验证 target 路径有效
  if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isDirectory()) {
    console.error(`❌ 错误：目标路径不存在或不是目录 — ${targetArg}`);
    process.exit(1);
  }

  // 确保 target 在 .sddu/ 下
  const relTarget = path.relative(sdduRoot, targetPath);
  if (relTarget.startsWith('..')) {
    console.error(`❌ 错误：--target 必须在 .sddu/ 目录下，当前为: ${targetArg}`);
    process.exit(1);
  }

  const report = {
    created: [],
    updated: [],
    skipped: [],
    errors: [],
    stats: { scanned: 0, created: 0, updated: 0, skipped: 0 }
  };

  // 构建扫描链：Feature 目录 → 父目录 (specs-tree-root) → 根目录 (.sddu)
  const scanChain = [];

  // 1. Feature 目录
  scanChain.push({
    dir: targetPath,
    type: 'feature',
    relPath: '.sddu/' + relTarget + '/',
    dirName: path.basename(targetPath)
  });

  // 2. 父目录 (specs-tree-root)
  const parentDir = path.dirname(targetPath);
  const relParent = path.relative(cwd, parentDir);
  if (parentDir !== sdduRoot && parentDir !== cwd) {
    const parentRelPath = relParent.startsWith('.sddu')
      ? relParent + '/'
      : '.sddu/' + path.relative(sdduRoot, parentDir) + '/';
    scanChain.push({
      dir: parentDir,
      type: 'parent',
      relPath: parentRelPath,
      dirName: path.basename(parentDir)
    });
  }

  // 3. 根目录 (.sddu)
  scanChain.push({
    dir: sdduRoot,
    type: 'root',
    relPath: '.sddu/',
    dirName: '.sddu'
  });

  // 收集所有 Feature 的 state.json（供根目录统计使用）
  const specsTreeRoot = path.join(sdduRoot, 'specs-tree-root');
  const allFeatures = [];
  if (fs.existsSync(specsTreeRoot)) {
    const featureDirs = safeExec(`find "${specsTreeRoot}" -mindepth 1 -maxdepth 1 -type d -name "specs-tree-*" 2>/dev/null | sort`)
      .split('\n')
      .filter(Boolean);
    for (const fd of featureDirs) {
      const stateJson = safeReadJson(path.join(fd, 'state.json'));
      if (stateJson) {
        allFeatures.push({
          name: path.basename(fd),
          status: stateJson.status || 'tracked',
          phase: stateJson.phase || ''
        });
      } else {
        allFeatures.push({ name: path.basename(fd), status: 'tracked', phase: '' });
      }
    }
  }

  // 处理扫描链中的每个目录
  for (const entry of scanChain) {
    report.stats.scanned++;
    const treePath = path.join(entry.dir, 'TREE.md');
    const stateJson = (entry.type === 'feature')
      ? safeReadJson(path.join(entry.dir, 'state.json'))
      : safeReadJson(path.join(entry.dir, 'state.json'));

    if (entry.type === 'feature') {
      // Feature 级目录：完整生成 TREE.md
      const newContent = generateFeatureTree(entry.dir, entry.dirName, entry.relPath);
      const existingContent = safeReadFile(treePath);

      if (!existingContent) {
        // 新创建
        try {
          fs.writeFileSync(treePath, newContent, 'utf8');
          report.created.push(entry.relPath + 'TREE.md');
          report.stats.created++;
        } catch (err) {
          report.errors.push(`创建失败: ${treePath} — ${err.message}`);
        }
      } else {
        // Diff 比较
        if (newContent.trim() === existingContent.trim()) {
          report.skipped.push(entry.relPath + 'TREE.md');
          report.stats.skipped++;
        } else {
          try {
            fs.writeFileSync(treePath, newContent, 'utf8');
            const changes = [];
            // 简单检测新增/删除文件
            const oldFiles = new Set();
            const newFiles = new Set();
            for (const m of existingContent.matchAll(/^\| ([^\|]+) \|/gm)) {
              oldFiles.add(m[1].trim());
            }
            for (const m of newContent.matchAll(/^\| ([^\|]+) \|/gm)) {
              newFiles.add(m[1].trim());
            }
            for (const f of newFiles) {
              if (!oldFiles.has(f)) changes.push(`新增文件: ${f}`);
            }
            for (const f of oldFiles) {
              if (!newFiles.has(f) && f !== '文件') changes.push(`移除文件: ${f}`);
            }
            if (changes.length === 0) changes.push('内容已更新');
            report.updated.push({ path: entry.relPath + 'TREE.md', changes });
            report.stats.updated++;
          } catch (err) {
            report.errors.push(`写入失败: ${treePath} — ${err.message}`);
          }
        }
      }
    } else if (entry.type === 'parent') {
      // specs-tree-root 级：更新 Feature 行
      // 使用 Feature 自身的 state.json 获取准确的 phase/status
      const featureState = safeReadJson(path.join(targetPath, 'state.json'));
      const existingContent = safeReadFile(treePath);
      if (!existingContent) {
        report.skipped.push(entry.relPath + 'TREE.md (文件不存在)');
        report.stats.skipped++;
        continue;
      }
      const result = updateSpecsRootTree(existingContent, targetPath, featureState);
      if (!result) {
        report.skipped.push(entry.relPath + 'TREE.md');
        report.stats.skipped++;
      } else {
        try {
          fs.writeFileSync(treePath, result.content, 'utf8');
          report.updated.push({ path: entry.relPath + 'TREE.md', changes: result.changes });
          report.stats.updated++;
        } catch (err) {
          report.errors.push(`写入失败: ${treePath} — ${err.message}`);
        }
      }
    } else if (entry.type === 'root') {
      // 根目录 .sddu/ 级：更新统计
      const existingContent = safeReadFile(treePath);
      if (!existingContent) {
        report.skipped.push(entry.relPath + 'TREE.md (文件不存在)');
        report.stats.skipped++;
        continue;
      }
      const result = updateRootTree(existingContent, allFeatures);
      if (!result) {
        report.skipped.push(entry.relPath + 'TREE.md');
        report.stats.skipped++;
      } else {
        try {
          fs.writeFileSync(treePath, result.content, 'utf8');
          report.updated.push({ path: entry.relPath + 'TREE.md', changes: result.changes });
          report.stats.updated++;
        } catch (err) {
          report.errors.push(`写入失败: ${treePath} — ${err.message}`);
        }
      }
    }
  }

  // 输出 JSON 报告
  console.log(JSON.stringify(report, null, 2));
}

main();
