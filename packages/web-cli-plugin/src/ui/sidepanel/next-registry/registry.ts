/**
 * V5-1 TASK-V5-102/103/104 (ADR-V5-001) — the NextProvider **registry**
 * (Seam 三件套之二): `validateNextProvider` (R2/R4 loud) + `resolveOrder`
 * (依赖就绪 / 优先级显式化 / **顺序不来自数组位置**) + 可逆注册 (R1/R3).
 *
 * 实现层铁律: `REGISTRY` **单点写入**（全文件唯一 `push` / `splice`）；失败一律
 * loud（`{ok:false,error}`），**禁止静默覆盖或静默默认**。
 *
 * @module ui/sidepanel/next-registry/registry
 */
import {
  MOUNT_MODE,
  NEXT_MODES,
  NEXT_SERVICES,
  type NextMountPoint,
  type NextProvider,
} from './definition.js';

interface Row {
  def: NextProvider;
  /** Registration sequence — the stable tie-break that is NOT the array index. */
  seq: number;
}

const REGISTRY: Row[] = [];
let SEQ = 0;
/** Optional known-op set: when set, a dangling chip is a loud registration failure. */
let KNOWN_OPS: ReadonlySet<string> | null = null;

export type ValidateResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: string };

export function setKnownOpIds(ids: readonly string[] | null): void {
  KNOWN_OPS = ids === null ? null : new Set(ids);
}

export function countProviders(): number {
  return REGISTRY.length;
}

/** A snapshot of the current rows (array order = registration order). */
export function listProviders(): readonly NextProvider[] {
  return REGISTRY.map((r) => r.def);
}

/**
 * R2/R3/R4/R5 — the loud validator. `mountPoint` defaults to `next`; the provider's
 * declared `mode` must equal `MOUNT_MODE[mountPoint]` (混用 ⇒ loud).
 */
export function validateNextProvider(def: NextProvider, mountPoint: NextMountPoint = 'next'): ValidateResult {
  if (!def || typeof def.id !== 'string' || def.id.length === 0) return { ok: false, error: 'missing-id' };
  if (def.priority !== 0 && def.priority !== 1 && def.priority !== 2 && def.priority !== 3) {
    return { ok: false, error: `priority-out-of-range:${String(def.priority)}` };
  }
  if (!(NEXT_MODES as readonly string[]).includes(def.mode)) {
    return { ok: false, error: `mode-not-in-set:${String(def.mode)}` };
  }
  if (def.mode !== MOUNT_MODE[mountPoint]) {
    return { ok: false, error: `mode-mismatch:${mountPoint}:${String(def.mode)}` };
  }
  if (!Array.isArray(def.deps)) return { ok: false, error: 'deps-not-array' };
  for (const d of def.deps) {
    if (!(NEXT_SERVICES as readonly string[]).includes(d)) return { ok: false, error: `unknown-dep:${String(d)}` };
  }
  if (def.fail !== 'card-boundary' && def.fail !== 'snapshot-rollback') {
    return { ok: false, error: `fail-not-in-set:${String(def.fail)}` };
  }
  if (typeof def.when !== 'function') return { ok: false, error: 'missing-when' };
  if (!Array.isArray(def.chips) || def.chips.length === 0) return { ok: false, error: 'empty-chips' };
  if (KNOWN_OPS) {
    for (const c of def.chips) {
      if (!KNOWN_OPS.has(c)) return { ok: false, error: `dangling-chip:${String(c)}` };
    }
  }
  return { ok: true };
}

/**
 * R2 — dependency topo. `deps` name **services** (`⊆ NEXT_SERVICES`), not other
 * providers, so the service order is total and this is the identity map; the
 * provider ordering itself is decided by {@link resolveOrder}.
 */
export function topoByDeps(defs: readonly NextProvider[]): readonly NextProvider[] {
  return defs;
}

/**
 * R2/R3 — the resolved order: `(priority asc, prepend desc, registrationSeq asc)`.
 * The array's current position never participates; the registration sequence does.
 */
export function resolveOrder(): readonly NextProvider[] {
  return topoByDeps(
    [...REGISTRY]
      .sort(
        (a, b) =>
          a.def.priority - b.def.priority ||
          Number(b.def.prepend === true) - Number(a.def.prepend === true) ||
          a.seq - b.seq,
      )
      .map((r) => r.def),
  );
}

export interface RegisterOpts {
  readonly overwrite?: boolean;
}
export type RegisterResult =
  | { readonly ok: true; readonly id: string; readonly unregister: () => number }
  | { readonly ok: false; readonly error: string; readonly unregister: null };

/** R1 — the idempotent remover (the **only** `REGISTRY.splice` site). */
function removeRowById(id: string): number {
  const i = REGISTRY.findIndex((r) => r.def.id === id);
  if (i >= 0) REGISTRY.splice(i, 1);
  return REGISTRY.length;
}

/**
 * R1/R3 — register a provider. Loud on any validation failure or duplicate id;
 * `{overwrite:true}` replaces the row **by id** in place (count unchanged).
 */
export function registerNextProvider(def: NextProvider, opts?: RegisterOpts): RegisterResult {
  const v = validateNextProvider(def);
  if (!v.ok) return { ok: false, error: v.error, unregister: null };
  const found = REGISTRY.find((r) => r.def.id === def.id);
  if (found) {
    if (opts?.overwrite !== true) return { ok: false, error: `duplicate-id:${def.id}`, unregister: null };
    found.def = def;
    return { ok: true, id: def.id, unregister: () => removeRowById(def.id) };
  }
  REGISTRY.push({ def, seq: SEQ++ });
  return { ok: true, id: def.id, unregister: () => removeRowById(def.id) };
}
