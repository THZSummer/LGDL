/**
 * skill-loader.ts —— SKILL.md 加载（FR-036/FR-008/FR-038；S-06）。
 *
 * 生态位（discovery §3.3 F 组 ◐）：包管理/插件生态位 → skill 目录：SKILL.md
 * frontmatter（name/description/allowed-tools）+ 正文提示；内容来源 = 内置打包
 * 先行（本文件提供 parse/buildPrompt）+ 运行时加载接口预留（fetchRemoteSkill；
 * CSP connect-src 约束文档化）+ 用户导入可选。提示注入 = 场景组装 system 时经
 * createSkillPrompt() 使用；可选工具注册 = 经 router 动态注册为 skill:* 命名空间
 * （FR-002/038：全流程入审计），allowed-tools 门禁 = 越权注册被拒（FR-008/AC-012）。
 *
 * 本文件零 LGDL/react import（NFR-001）。
 */
import type { CommandRouter, RegisterOptions, ToolEntry } from './router.js';

export interface SkillFrontmatter {
  name: string;
  description: string;
  /** 技能允许的工具全限定名集（FR-008：越权注册被拒）。 */
  allowedTools?: string[];
}

export interface SkillDef extends SkillFrontmatter {
  /** SKILL.md 正文（提示注入文本）。 */
  body: string;
}

/** 解析 SKILL.md（frontmatter YAML 最小子集：name/description/allowed-tools + 正文）。 */
export function parseSkillMd(md: string): SkillDef | null {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(md);
  if (!m) return null;
  const fmRaw = m[1];
  const body = m[2].trim();
  const getVal = (key: string): string | null => {
    const re = new RegExp(`^${key}\\s*:\\s*(.*)$`, 'm');
    const mm = re.exec(fmRaw);
    return mm ? mm[1].trim().replace(/^['"]|['"]$/g, '') : null;
  };
  const name = getVal('name') ?? '';
  const description = getVal('description') ?? '';
  // allowed-tools：支持同值内联（[a, b] / a,b）与后续 `- x` 行列表；去重/去 '-' 噪声
  const allowedSet = new Set<string>();
  const inline = (getVal('allowed-tools') ?? '')
    .replace(/^\[|\]$/g, '')
    .split(/[,\s]+/)
    .filter((s) => s && s !== '-');
  for (const s of inline) allowedSet.add(s.trim());
  const lines = fmRaw.split('\n');
  const atIdx = lines.findIndex((l) => /^allowed-tools\s*:/.test(l));
  if (atIdx >= 0) {
    for (let i = atIdx + 1; i < lines.length; i++) {
      const l = lines[i].trim();
      if (!l) continue;
      if (!l.startsWith('- ')) break; // 下一键开始
      const tok = l.slice(2).trim().replace(/^['"]|['"]$/g, '');
      if (tok) allowedSet.add(tok);
    }
  }
  const allowedTools = [...allowedSet];
  if (!name || !description) return null;
  return { name, description, ...(allowedTools.length > 0 ? { allowedTools } : {}), body };
}

/** 提示注入（场景组装 system 用；含边界声明）。 */
export function createSkillPrompt(skill: SkillDef): string {
  const lines = [
    `[Skill:${skill.name}] ${skill.description}`,
    skill.body,
  ];
  if (skill.allowedTools && skill.allowedTools.length > 0) {
    lines.push(`（本技能允许使用的工具白名单：${skill.allowedTools.join(', ')}；白名单外工具不可注册/不可用）`);
  }
  return lines.join('\n\n');
}

export interface InstallSkillOptions {
  /** 动态源标识（审计 FR-038；缺省 `skill:<name>`）。 */
  source?: string;
  /** 注册前校验：技能声明 tools 必须在其 allowed-tools（越权注册被拒 FR-008）。 */
  registerTools?: ToolEntry[];
}

/** 安装技能：校验并注册其工具（skill:* 命名空间 + allowed-tools 门禁 + 审计）。 */
export function installSkill(router: CommandRouter, skill: SkillDef, opts: InstallSkillOptions = {}): void {
  const source = opts.source ?? `skill:${skill.name}`;
  const tools = opts.registerTools ?? [];
  for (const tool of tools) {
    // 注册 fqn = skill.<name>（loader 强制命名空间 skill:*）
    const fqn = `skill.${tool.name}`;
    if (skill.allowedTools && skill.allowedTools.length > 0 && !skill.allowedTools.includes(fqn)) {
      throw new Error(`技能 "${skill.name}" 的工具 "${fqn}" 不在其 allowed-tools（${skill.allowedTools.join(',')}）——注册被拒（FR-008）`);
    }
    const entry: ToolEntry = { ...tool, namespace: 'skill' };
    const regOpts: RegisterOptions = { source };
    router.register(entry, regOpts); // 命名空间冲突 → router 抛错（EC-010）；动态源全流程入审计（FR-038）
  }
}

/**
 * 运行时加载接口预留（FR-036/S-06）：经 URL 拉取 SKILL.md 文本。
 * CSP connect-src 约束：远程 skill 源需在 connect-src 放行；worker/script 同源约束文档化于 help。
 */
export async function fetchRemoteSkill(url: string, opts: { fetchImpl?: typeof fetch } = {}): Promise<SkillDef | null> {
  const fetcher = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const res = await fetcher(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`skill 拉取失败（HTTP ${res.status}）：${url}`);
  const text = await res.text();
  return parseSkillMd(text);
}

/** 便捷：把已解析技能的提示文本加入场景 system（多技能拼接）。 */
export function buildSkillSection(skills: SkillDef[]): string {
  return skills.map(createSkillPrompt).join('\n\n---\n\n');
}
