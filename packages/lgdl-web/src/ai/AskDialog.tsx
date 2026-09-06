/**
 * AskDialog.tsx —— 场景 ask 裁决 UI（FR-041/007/023；NG-008：ask UI 归场景）。
 *
 * 双入口：
 *  - permission（权限 ask，FR-007）：框架级门禁命中 ask → 展示工具/原因 → allow/deny
 *    （可记住选择 —— 场景缓存后续交 PRM/路由策略）；
 *  - user（ask-user 任务内澄清，FR-023）：AI 主动提问 → 选项/确认/自由文本回填。
 * 语义区分（help 同 base）：权限 ask 决定「工具能否执行」；ask-user 是内容澄清。
 *
 * v3 ask 呈现主体扩展（TASK-009/FR-044）：permission 呈现含 子命令名/risk 徽标
 * （FR-005/007）、page-eval 代码摘要（FR-008，summarizeCode 预算内压平，不复显全文）、
 * 敏感字段写入确认文案（FR-024/EC-005，SENSITIVE_WRITE_NOTE）。数据源 = base AskQuestion
 * 经 buildPermissionAskEntry 映射（AiPanel permHandler 调用；单一呈现数据源）。
 * v3 P2（TASK-011/FR-044 尾项）：permission 呈现增 save/截图/剪贴板授权路径提示
 * （authNote —— save 手势 → 系统保存对话框、拒绝 → 下载链降级 EC-012；chrome screenshot
 * 自动下载链 + 摘要 dataURL 不进上下文 ADR-003；clipboard 读=敏感面进上下文 / 写=写入，
 * FR-029/028/030 转译面），场景显式声明 base 同源语义。
 */
import React from 'react';
import { summarizeCode, SENSITIVE_WRITE_NOTE, type AskQuestion } from '@lgdl/web-cli-base';

export type AskDialogEntry =
  | {
      kind: 'permission';
      tool: string;
      reason: string;
      /** v3（FR-005/007）：子命令（gate ask 携带；无子命令调用 = 工具级 ask，缺省）。 */
      subcommand?: string;
      /** v3：子命令级/工具级 risk（effectiveRisk：'read'|'ui'|'write'|'evaluate' 等）。 */
      risk?: string;
      /** v3：ask 入参（page-eval 代码摘要 / 敏感写入确认面数据源）。 */
      args?: Record<string, string>;
      /** v3（FR-008/044）：page-eval 代码摘要（预算内压平，不回显整段代码全文）。 */
      codeSummary?: string;
      /** v3（FR-024/044）：敏感字段写入确认文案开关（dom 写子命令 ask 呈现）。 */
      sensitiveWrite?: boolean;
      /** v3 P2（TASK-011/FR-044 尾项）：save/截图/剪贴板授权路径提示文案（FR-029/028/030 转译）。 */
      authNote?: string;
      /** 记住本次选择（UI 勾选，返回给调用方持久化/后续策略）。 */
    }
  | {
      kind: 'user';
      kindOf: 'choice' | 'confirm' | 'text';
      prompt: string;
      options?: string[];
    };

/**
 * dom 写子命令面（写 = 可触达敏感字段；与 base dom-tools subcommandRisks write 组对齐）。
 * FR-024 敏感写入确认文案的触发面：这些子命令经 ops 写入控件/元素值，若目标为 password/
 * 凭据类字段即受「写默认 ask + trusted 声明」约束 —— ask 弹层对写组一律附确认文案。
 */
const DOM_WRITE_SUBCOMMANDS: ReadonlySet<string> = new Set([
  'type',
  'set-text',
  'set-attr',
  'remove-attr',
  'set-style',
  'set-value',
  'fill',
  'add',
  'remove',
]);

/**
 * v3 P2（TASK-011/FR-044 尾项）：save/截图/剪贴板授权路径提示（FR-029/028/030 转译面）。
 * 文案与 base 执行器/帮助面同源语义（save-file.ts / chrome-tools.ts / clipboard.ts）——
 * 让正在裁决 allow/deny 的用户明确「允许后会发生什么 / 拒绝或系统授权失败后如何降级」。
 */
function authPathNote(tool: string, subcommand: string | undefined): string | undefined {
  if (tool === 'save') {
    // FR-029/EC-012：save = 系统文件保存对话框（File System Access 手势授权）；拒绝/不可用
    // → download 下载链降级（export 落盘两路同源）；会话不中断、不静默丢数据
    return (
      '授权路径提示（save）：允许后将弹出系统文件保存对话框（File System Access，需你手势确认）。' +
      '取消/拒绝不会中断会话（可读结果）；系统保存不可用或被拒时，export/save 落盘自动降级为下载链（blob <a download>），数据不静默丢失（EC-012）。'
    );
  }
  if (tool === 'chrome' && subcommand === 'screenshot') {
    // FR-028/ADR-003：截图成功即自动触发下载链 + 返回 {尺寸/字节/文件名} 摘要；
    // dataURL 不整段进 AI 上下文（--include-dataurl true 才预算内回带头段）；下载链不可用 → 可读降级
    return (
      '授权路径提示（截图）：允许后截图完成即自动触发下载链（保存至浏览器下载目录）并返回 {尺寸/字节/文件名} 摘要。' +
      'dataURL 不进入 AI 上下文（P-03/ADR-003）；如需回传用 --include-dataurl true（预算内头段）。下载链不可用/被拒 → 可读降级，截图数据不静默丢弃。'
    );
  }
  if (tool === 'clipboard' && subcommand === 'read') {
    // FR-030/FR-005：读 = 敏感面 —— 允许后剪贴板文本原文将进入 AI 上下文
    return '授权路径提示（剪贴板读取）：读取为敏感面 —— 允许后剪贴板文本原文将进入 AI 上下文。仅在内容可信、可展示时允许（FR-030/EC-005）。';
  }
  if (tool === 'clipboard' && subcommand === 'write') {
    // FR-030：写 = 允许后 AI 写入系统剪贴板（可在其他应用粘贴）
    return '授权路径提示（剪贴板写入）：允许后 AI 将指定文本写入系统剪贴板（后续可在其他应用粘贴）（FR-030）。';
  }
  return undefined;
}

/**
 * v3（FR-044 主体 + TASK-011 尾项）：把 base AskQuestion 映射为 permission 呈现数据 ——
 * 子命令名/risk + page-eval 代码摘要（summarizeCode 预算内）+ 敏感字段写入确认文案开关 +
 * save/截图/剪贴板授权路径提示（authNote）。
 * AiPanel permHandler 经本函数构建 askEntry（单一呈现数据源，AskDialog 渲染零业务分支）。
 */
export function buildPermissionAskEntry(q: AskQuestion): AskDialogEntry {
  const entry: AskDialogEntry = {
    kind: 'permission',
    tool: q.tool,
    reason: q.reason,
    ...(q.subcommand ? { subcommand: q.subcommand } : {}),
    ...(q.risk ? { risk: q.risk } : {}),
    ...(q.args && Object.keys(q.args).length > 0 ? { args: q.args } : {}),
  };
  // page-eval 最高档 ask（FR-008/037/045）：evaluate 风险档（或工具名 page-eval）→ 代码摘要
  const isPageEval = q.tool === 'page-eval' || q.risk === 'evaluate';
  const code = isPageEval ? q.args?.code : undefined;
  if (code && code.trim() !== '') {
    entry.codeSummary = summarizeCode(code);
  }
  // 敏感字段写入确认（FR-024/EC-005）：dom 写子命令 ask（effectiveRisk 'write'）附确认文案
  if (q.tool === 'dom' && q.risk === 'write' && q.subcommand && DOM_WRITE_SUBCOMMANDS.has(q.subcommand)) {
    entry.sensitiveWrite = true;
  }
  // v3 P2（TASK-011/FR-044 尾项）：save/截图/剪贴板授权路径提示（FR-029/028/030 转译）
  const note = authPathNote(q.tool, q.subcommand);
  if (note) entry.authNote = note;
  return entry;
}

const riskLabel: Record<string, string> = {
  read: '只读',
  ui: 'UI 副作用',
  write: '写入',
  external: '外部',
  state: '状态',
  evaluate: '最高档 evaluate',
};

export function AskDialog({
  entry,
  onPermissionDecision,
  onUserAnswer,
  onUserCancel,
}: {
  entry: AskDialogEntry | null;
  onPermissionDecision: (action: 'allow' | 'deny', remember: boolean) => void;
  onUserAnswer: (value: string) => void;
  onUserCancel: () => void;
}) {
  const [remember, setRemember] = React.useState(false);
  const [text, setText] = React.useState('');
  const [picked, setPicked] = React.useState<string | null>(null);

  // 每次打开重置
  React.useEffect(() => {
    setRemember(false);
    setText('');
    setPicked(null);
  }, [entry]);

  if (!entry) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 10,
          padding: '18px 22px',
          maxWidth: 480,
          width: '90%',
          boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
          color: '#1f2937',
          font: '14px/1.6 system-ui, sans-serif',
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 6 }}>
          {entry.kind === 'permission' ? '⚠ 权限确认（AI 请求执行工具）' : '❓ AI 向你提问'}
        </div>

        {entry.kind === 'permission' ? (
          <>
            <div style={{ marginBottom: 4 }}>
              <strong>{entry.tool}</strong>
              {/* v3（FR-044）：子命令名 / risk 徽标（FR-005/007 子命令级 ask 呈现） */}
              {(entry.subcommand || entry.risk) && (
                <span style={{ display: 'inline-flex', gap: 6, marginLeft: 8, flexWrap: 'wrap', verticalAlign: 'middle' }}>
                  {entry.subcommand && (
                    <code
                      style={{
                        background: '#eef2ff',
                        color: '#3730a3',
                        borderRadius: 4,
                        padding: '1px 7px',
                        fontSize: 12,
                      }}
                    >
                      子命令：{entry.subcommand}
                    </code>
                  )}
                  {entry.risk && (
                    <code
                      style={{
                        background: entry.risk === 'evaluate' ? '#fef2f2' : '#f3f4f6',
                        color: entry.risk === 'evaluate' ? '#b91c1c' : '#374151',
                        borderRadius: 4,
                        padding: '1px 7px',
                        fontSize: 12,
                      }}
                    >
                      risk：{entry.risk}（{riskLabel[entry.risk] ?? entry.risk}）
                    </code>
                  )}
                </span>
              )}
            </div>
            <div style={{ marginBottom: 10, color: '#4b5563' }}>{entry.reason}</div>
            {/* v3（FR-008/044）：page-eval 最高档 ask —— 代码摘要（预算内压平 + 门禁说明） */}
            {entry.codeSummary && (
              <div
                style={{
                  marginBottom: 10,
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: 6,
                  padding: '8px 10px',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>将执行代码（宿主页同源上下文；摘要）：</div>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', font: '12px/1.5 ui-monospace, monospace' }}>
                  {entry.codeSummary}
                </pre>
                <div style={{ marginTop: 6, color: '#9a3412', fontSize: 12 }}>
                  untrusted 代码缺省拒执行 —— 须显式 --trusted true 且本确认放行后才执行（FR-008/045）；执行全程入审计。
                </div>
              </div>
            )}
            {/* v3（FR-024/044）：敏感字段写入确认文案（dom 写子命令 ask） */}
            {entry.sensitiveWrite && (
              <div
                style={{
                  marginBottom: 10,
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 6,
                  padding: '8px 10px',
                  color: '#991b1b',
                  fontSize: 13,
                }}
              >
                {SENSITIVE_WRITE_NOTE}
              </div>
            )}
            {/* v3 P2（TASK-011/FR-044 尾项）：save/截图/剪贴板授权路径提示（FR-029/028/030 转译） */}
            {entry.authNote && (
              <div
                style={{
                  marginBottom: 10,
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: 6,
                  padding: '8px 10px',
                  color: '#1e40af',
                  fontSize: 13,
                }}
              >
                {entry.authNote}
              </div>
            )}
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12 }}>
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              记住本次选择（allow/deny 记入本会话策略）
            </label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => onPermissionDecision('deny', remember)}
                style={btnStyle('#dc2626')}
              >
                拒绝
              </button>
              <button
                type="button"
                onClick={() => onPermissionDecision('allow', remember)}
                style={btnStyle('#16a34a')}
              >
                允许
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 10, color: '#4b5563' }}>{entry.prompt}</div>
            {entry.kindOf === 'choice' && entry.options ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                {entry.options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    style={btnStyle(picked === opt ? '#2563eb' : '#e5e7eb', picked === opt ? '#fff' : '#1f2937')}
                    onClick={() => setPicked(opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : entry.kindOf === 'confirm' ? (
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button type="button" style={btnStyle('#16a34a')} onClick={() => onUserAnswer('yes')}>
                  是
                </button>
                <button type="button" style={btnStyle('#dc2626')} onClick={() => onUserAnswer('no')}>
                  否
                </button>
              </div>
            ) : (
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onUserAnswer(text)}
                placeholder="输入回答…"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  marginBottom: 12,
                }}
              />
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" style={btnStyle('#6b7280')} onClick={onUserCancel}>
                取消
              </button>
              {entry.kindOf === 'choice' && (
                <button type="button" style={btnStyle('#2563eb')} disabled={!picked} onClick={() => picked && onUserAnswer(picked)}>
                  确定
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function btnStyle(bg: string, color = '#fff'): React.CSSProperties {
  return {
    background: bg,
    color,
    border: 'none',
    borderRadius: 6,
    padding: '7px 16px',
    cursor: 'pointer',
    fontWeight: 600,
  };
}
