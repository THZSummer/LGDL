/**
 * LGDL 适配层（首个适配场景单点，ADR-003）。
 *
 * 本文件承载 LGDL 领域语义注入面：
 *   - lgdlKindResolver：docType→kind 解析器（= 迁自 core commands.ts defaultKindFor 逻辑逐字节）
 *   - lgdlBuildOperation：预注入 resolver 的 buildOperation
 *   - lgdlApplier：createOperationApplier(9 mutations) 分派器单例（ADR-005）
 *   - lgdlDomain：19 领域符号 + applier + buildOperation + webCliHelp 注入面（ADR-006）
 *   - lgdlExecutor：createExecutor(lgdlDomain) 执行器单例（中性，无 handleLine——
 *     fetch 行处理器由 web 侧 lgdl-web.ts 注入，ADR-007）
 *
 * 框架核心（commands/operations/exec/protocol/help/tools/llm）零领域引用；
 * LGDL 语义收敛于本单点（NFR-004 / R-011）。
 */
import { createOperationApplier } from '../operations.js';
import { buildOperation } from '../commands.js';
import type { KindResolver } from '../commands.js';
import { createExecutor } from '../exec.js';
import type { DomainApi } from '../exec.js';
import { webCliHelp } from '../help.js';
import {
  addNode,
  addEdge,
  removeNode,
  removeEdge,
  updateNode,
  updateEdge,
  addGroup,
  removeGroup,
  updateGroup,
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
} from '@lgdl/core';

/** docType→kind 解析器（= 现状 defaultKindFor 逻辑逐字节，D-010/ADR-004）。 */
export const lgdlKindResolver: KindResolver = (docType?: string): string => {
  if (docType === 'er' || docType === 'uml-class') return 'entity';
  if (docType === 'state') return 'state';
  return 'process';
};

/** LGDL 操作分派器单例（ADR-005：注入 9 个 mutation，分派语义与迁移前一致）。 */
export const lgdlApplier = createOperationApplier({
  addNode,
  addEdge,
  removeNode,
  removeEdge,
  updateNode,
  updateEdge,
  addGroup,
  removeGroup,
  updateGroup,
});

/** 预注入 resolver 的 buildOperation（ADR-004：LGDL 调用方经适配单例显式使用）。 */
export const lgdlBuildOperation = (
  command: string,
  args: Record<string, string | undefined>,
  docType?: string,
) => buildOperation(command, args, docType, lgdlKindResolver);

/** LGDL 领域注入面（ADR-006：19 领域符号全量收口，EC-004）。 */
export const lgdlDomain: DomainApi = {
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

/** LGDL 执行器单例（AiPanel 经 '@lgdl/web-cli-base/lgdl' 消费 executeSubcommand）。 */
export const lgdlExecutor = createExecutor(lgdlDomain);

/** 适配单例具名导出（AiPanel 调用点零改动：executeSubcommand 符号名不变）。 */
export const executeSubcommand = lgdlExecutor.executeSubcommand;
export const executeCommands = lgdlExecutor.executeCommands;
export const describeCommandLine = lgdlExecutor.describeCommandLine;
