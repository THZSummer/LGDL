/**
 * Ambient typing for elkjs's self-contained bundled build
 * (`elkjs/lib/elk.bundled.js`). We import the bundled CJS directly (not the
 * package `main`), because `main.js`'s worker variant does
 * `require('web-worker')` and breaks Vite/ESM bundling. The bundled build is a
 * synchronous wasm UMD needing no worker.
 *
 * elkjs ships `lib/elk-api.d.ts`, whose default export is typed as a
 * constructable `{ new(...): ELK }`. With `moduleResolution: NodeNext` the
 * default import gets a synthetic shape that TS rejects as "not constructable"
 * even though it works at runtime. This module re-declares the constructable
 * default + the layout result types so `new ELK()` type-checks, without
 * touching the dependency.
 */
declare module 'elkjs/lib/elk.bundled.js' {
  export interface ElkPoint {
    x: number;
    y: number;
  }
  export interface ElkEdgeSection {
    id?: string;
    startPoint: ElkPoint;
    endPoint: ElkPoint;
    bendPoints?: ElkPoint[];
  }
  export interface ElkExtendedEdge {
    id: string;
    sections?: ElkEdgeSection[];
  }
  export interface ElkNode {
    id: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    children?: ElkNode[];
    edges?: ElkExtendedEdge[];
  }
  export interface ElkPrimitiveEdge {
    id: string;
    sources: string[];
    targets: string[];
  }
  export interface ElkGraph {
    id: string;
    layoutOptions?: Record<string, string>;
    children?: ElkNode[];
    edges?: Array<ElkPrimitiveEdge | ElkExtendedEdge>;
    width?: number;
    height?: number;
  }
  export interface ElkLayoutArgs {
    [key: string]: unknown;
  }
  export interface ELK {
    layout<T extends ElkGraph>(graph: T, args?: ElkLayoutArgs): Promise<T>;
  }
  export interface ElkConstructorArgs {
    defaultLayoutOptions?: Record<string, string>;
  }
  const ElkConstructor: {
    new (args?: ElkConstructorArgs): ELK;
  };
  export default ElkConstructor;
}
