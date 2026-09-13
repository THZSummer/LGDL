/**
 * V2-4 parity 同源锚点常量（FR-V2-053 / NFR-V24-003；ADR-V2-021 / ADR-V2-023）。
 *
 * 单一真值 = `test/parity/baseline-catalog.json`（34 工具 / 142 子命令；provenance
 * `main@2ddc92299ad10cfe0ea2b65403243a45ce7fb041`）。本模块把它投影为**纯常量**，
 * 供 `service-worker` 注入 `snapshot.catalogMeta?`（P0 预留位，V2-4 首次兑现）。
 *
 * 纪律（防漂移 / 防夸大）：
 *   1. 纯常量：无 `node:` 导入、无扩展接口、零 IO、零副作用（可进 runtime bundle）；
 *   2. 运行时不打包 baseline JSON（测试件不入包、不增重）；
 *   3. 漂移门禁（`test/insight-archive.test.ts` A7）断言本常量 === `loadBaseline()` 真值
 *      （含 40 位 provenance commit）；改一位即 FAIL；
 *   4. 本常量**只描述基线**（34/142 + 来源 commit），**不描述**本轮渲染了多少卡 ——
 *      渲染计数只来自 `snapshot.meta.counts`（禁止「34/142 已全部渲染」类夸大）。
 */
import type { CatalogMeta } from './tree-model.js';

/** 对账基线锚点：工具数 / 子命令数 / 来源 commit（typed by V2-1 既有 `CatalogMeta`）。 */
export const CATALOG_BASELINE_META: CatalogMeta = {
  toolCount: 34,
  subcommandCount: 142,
  provenanceCommit: '2ddc92299ad10cfe0ea2b65403243a45ce7fb041',
};
