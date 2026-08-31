/**
 * 命令机制壳（F-13 ② 纯化后：业务面已随迁 web-cli 业务包）。
 *
 * 本文件保留中性命令机制类型与校验壳：
 *   - CommandSpec：命令参数规格契约（领域注册表复用）
 *   - requireParams / assertChangeRequested：通用参数校验（不引用任何领域类型）
 *   - KindResolver：docType→kind 解析器签名（领域注入实现）
 *
 * （自 lgdl-core commands.ts 迁入的 LGDL 面——COMMANDS 9 命令注册表/
 * KNOWN_PARAMS/buildOperation/parseAttrsSpec/parseMemberSpec/defaultKindFor
 * 已随迁 web-cli 业务包/src/commands.ts，本模块零领域引用。）
 */
/** 一个命令的参数（--file/--doc 由两端各自处理，不在此列）。 */
export interface CommandSpec {
  name: string;
  description: string;
  /** 必填参数（逗号分隔的 --key 名） */
  required: string[];
  /** no-change 校验：这些可选参数至少要出现一个（update 系列） */
  changeKeys: string[];
  /** 全部可选参数名（用于校验未知参数） */
  optional: string[];
}

/** 校验必填参数；缺失抛错。 */
export function requireParams(spec: CommandSpec, args: Record<string, string | undefined>): void {
  for (const key of spec.required) {
    if (args[key] === undefined) {
      throw new Error(`缺少必填参数 --${key}（${spec.name}）`);
    }
  }
}

/** no-change 校验：update 系列必须至少有一个变更参数。 */
export function assertChangeRequested(spec: CommandSpec, args: Record<string, string | undefined>): void {
  if (spec.changeKeys.length > 0 && spec.changeKeys.every((k) => args[k] === undefined)) {
    throw new Error(
      `no change requested — 至少传一个：${spec.changeKeys.map((k) => `--${k}`).join(' / ')}`,
    );
  }
}

/**
 * docType → kind 解析器签名（ADR-004：领域语义由适配层注入）。
 */
export type KindResolver = (docType?: string) => string;
