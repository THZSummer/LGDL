/**
 * LGDL 适配层（首个适配场景单点，ADR-003；F-13 ② 自 base/adapters/lgdl.ts 全量随迁）。
 *
 * 本文件承载 LGDL 领域语义注入面：
 *   - lgdlKindResolver：docType→kind 解析器（= 迁自 core commands.ts defaultKindFor 逻辑逐字节）
 *   - lgdlBuildOperation：预注入 resolver 的 buildOperation
 *   - lgdlApplier：createOperationApplier<LgdlOperation, LgdlDocument>(lgdlDispatch)
 *     分派器单例（lgdlDispatch 定义于本包 operations.ts，ADR-004/ADR-005）
 *   - lgdlDomain：19 领域符号 + applier + buildOperation + webCliHelp 注入面（ADR-006）
 *   - lgdlExecutor：createExecutor(lgdlDomain, options) 执行器单例（注入
 *     commandPrefix='lgdl-web-cli'/parseBatch=本包 parseWebCliBatch/
 *     describeSubcommand=describeLgdlSubcommand，ADR-005；无 handleLine——
 *     fetch 行处理器由 web 侧 lgdl-web.ts 注入，ADR-007）
 *
 * 框架核心（base commands/operations/exec/protocol/help/tools/llm）零领域引用；
 * LGDL 语义收敛于本单点（NFR-004 / R-011）。
 */
import { createOperationApplier, createExecutor } from '@lgdl/web-cli-base';
import type { DomainApi, MutationResult, OperationBatchResult } from '@lgdl/web-cli-base';
import type { LgdlOperation, LgdlDocument } from '@lgdl/lgdl-core';
import {
  parseLgdl,
  validate,
  serializeLgdl,
  formatStatus,
  templateForType,
  supportedTemplateTypes,
  convert,
  listFormats,
  listNodeKinds,
  queryDocInfo,
  queryNode,
  queryEdge,
  findNodes,
  DIAGRAM_TYPES,
  DIAGRAM_TYPE_LABELS,
} from '@lgdl/lgdl-core';
import { buildOperation } from '../commands.js';
import type { KindResolver } from '../commands.js';
import { lgdlDispatch } from '../operations.js';
import { parseWebCliBatch } from '../protocol.js';
import { webCliHelp } from '../help.js';

/** docType→kind 解析器（= 现状 defaultKindFor 逻辑逐字节，D-010/ADR-004）。 */
export const lgdlKindResolver: KindResolver = (docType?: string): string => {
  if (docType === 'er' || docType === 'uml-class') return 'entity';
  if (docType === 'state') return 'state';
  return 'process';
};

/** LGDL 操作分派器单例（ADR-005：注入 lgdlDispatch 9 变体，分派语义与迁移前一致）。 */
export const lgdlApplier: {
  applyOperation: (doc: LgdlDocument, operation: LgdlOperation) => MutationResult<LgdlDocument>;
  applyOperations: (doc: LgdlDocument, ops: LgdlOperation[]) => OperationBatchResult<LgdlDocument>;
} = createOperationApplier<LgdlOperation, LgdlDocument>(lgdlDispatch);

/** 预注入 resolver 的 buildOperation（ADR-004：LGDL 调用方经适配单例显式使用）。 */
export const lgdlBuildOperation = (
  command: string,
  args: Record<string, string | undefined>,
  docType?: string,
) => buildOperation(command, args, docType, lgdlKindResolver);

/** LGDL 领域注入面（ADR-006：19 领域符号全量收口，泛型化 ADR-003）。 */
export const lgdlDomain: DomainApi<LgdlOperation, LgdlDocument> = {
  parseLgdl,
  validate,
  serializeLgdl,
  applyOperation: lgdlApplier.applyOperation,
  applyOperations: lgdlApplier.applyOperations,
  formatStatus,
  templateForType,
  supportedTemplateTypes,
  convert,
  listFormats,
  buildOperation: lgdlBuildOperation,
  listNodeKinds,
  queryDocInfo,
  queryNode,
  queryEdge,
  findNodes,
  DIAGRAM_TYPES,
  DIAGRAM_TYPE_LABELS,
  webCliHelp,
};

/** describeCommandLine 的子命令描述（ADR-005：lgdl-web-cli 文案逐字节，:352-366 迁出实现）。 */
const describeLgdlSubcommand = (
  subcommand: string,
  args: Record<string, string>,
): string | null => {
  if (subcommand === 'status') return 'lgdl-web-cli status — 查看当前图结构';
  if (subcommand === 'validate') return 'lgdl-web-cli validate — 校验当前图语法';
  if (subcommand === 'init') return 'lgdl-web-cli init — 初始化为默认图';
  if (subcommand === 'convert') return `lgdl-web-cli convert --to ${args.to} — 导出格式`;
  if (subcommand === 'doc-info') return 'lgdl-web-cli doc-info — 文档概览';
  if (subcommand === 'get-node') return `lgdl-web-cli get-node --id ${args.id} — 节点详情`;
  if (subcommand === 'get-edge') return 'lgdl-web-cli get-edge — 边详情';
  if (subcommand === 'find-node') return `lgdl-web-cli find-node — 搜索节点（${args.label ?? args.q}）`;
  if (subcommand === 'list-node-kinds') return 'lgdl-web-cli list-node-kinds — 节点 kind 清单';
  if (subcommand === 'list-diagram-types') return 'lgdl-web-cli list-diagram-types — 图类型清单';
  return `${subcommand} ${Object.values(args).join(' ')}`;
};

/** LGDL 执行器单例（AiPanel 经 '@lgdl/lgdl-web-cli/lgdl' 消费 executeSubcommand）。 */
export const lgdlExecutor = createExecutor<LgdlOperation, LgdlDocument>(lgdlDomain, {
  commandPrefix: 'lgdl-web-cli',
  parseBatch: parseWebCliBatch,
  describeSubcommand: describeLgdlSubcommand,
});

/** 适配单例具名导出（AiPanel 调用点零改动：executeSubcommand 符号名不变）。 */
export const executeSubcommand = lgdlExecutor.executeSubcommand;
export const executeCommands = lgdlExecutor.executeCommands;
export const describeCommandLine = lgdlExecutor.describeCommandLine;
