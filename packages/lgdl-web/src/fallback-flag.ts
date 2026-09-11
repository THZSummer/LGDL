/**
 * 内置助手下线的回退开关（FR-038 / D-6 / TASK-016）。
 *
 * - 构建期环境变量 `VITE_AI_ASSISTANT_FALLBACK`，**默认 off**（未设置 / 非 `'on'` 均视为 off）。
 * - ⚠️ 语义边界：TASK-016 在同一提交内删除了 `src/ai/*`（内置助手代码），因此**本开关不会
 *   在本构建中恢复旧面板**——真正的紧急回退路径是 `git revert` 下线提交（前一版本保留
 *   `ai/` 全量），见 `packages/web-cli-plugin/docs/migration.md` §5.4。
 * - 本开关保留为显式旋钮与终止里程碑锚点：off 时用户看到「AI 能力已迁移至插件」的静默
 *   告知（EC-016 不静默）；on 时额外展示回退路径说明。按迁移文档 §5.3 C-4，过渡期收敛后
 *   本开关与其消费点一并移除。
 */
export const AI_ASSISTANT_FALLBACK_ENABLED = import.meta.env.VITE_AI_ASSISTANT_FALLBACK === 'on';
