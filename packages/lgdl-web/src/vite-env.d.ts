/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * 回退开关（FR-038 / D-6）：`'on'` = 启用；缺省或任何其他值 = off（**默认 off**）。
   * 见 `src/fallback-flag.ts` 与 `packages/web-cli-plugin/docs/migration.md` §5.4。
   */
  readonly VITE_AI_ASSISTANT_FALLBACK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
