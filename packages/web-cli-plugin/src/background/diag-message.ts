/**
 * `diag` message payload（TASK-019 任务 C）。
 *
 * options 页的「环境自检 / 诊断」需要 background 侧的权威信息：SW 上报版本、
 * SW 启动时间、当前活跃站点与**已授权 origin 列表**（options 自己不持有 OriginStore）。
 *
 * 与 `state-message.ts` 同风格：纯 async 投影、零依赖、node 可测；只回非敏感字段
 * （origin 字符串本身在用户已授权上下文中可见，不含任何 key）。
 */
import type { OriginRecord } from '../security/origin-store.js';

export interface DiagMessagePayload {
  /** `chrome.runtime.getManifest().version`（SW 视角）。 */
  version: string;
  /** 构建时间戳（构建期注入；未注入为 'dev'）。 */
  buildStamp: string;
  /** SW 本次启动时间（ms epoch）。 */
  swStartedAt: number;
  /** 当前绑定站点 origin（无则 null）。 */
  activeOrigin: string | null;
  /** 当前站点的发现三态（无则 null）。 */
  discoveryState: string | null;
  /** 已授权（authorized=true）的 origin 列表，排序稳定。 */
  authorizedOrigins: string[];
}

export async function buildDiagMessage(input: {
  version: string;
  buildStamp: string;
  swStartedAt: number;
  activeOrigin: string | null;
  discoveryState: string | null;
  listOrigins: () => Promise<OriginRecord[]>;
}): Promise<DiagMessagePayload> {
  let records: OriginRecord[] = [];
  try {
    records = await input.listOrigins();
  } catch {
    records = [];
  }
  const authorizedOrigins = records
    .filter((r) => r.authorized === true)
    .map((r) => r.origin)
    .sort((a, b) => a.localeCompare(b));
  return {
    version: input.version,
    buildStamp: input.buildStamp,
    swStartedAt: input.swStartedAt,
    activeOrigin: input.activeOrigin,
    discoveryState: input.discoveryState,
    authorizedOrigins,
  };
}
