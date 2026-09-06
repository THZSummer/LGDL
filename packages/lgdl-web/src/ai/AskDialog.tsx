/**
 * AskDialog.tsx —— 场景 ask 裁决 UI（FR-041/007/023；NG-008：ask UI 归场景）。
 *
 * 双入口：
 *  - permission（权限 ask，FR-007）：框架级门禁命中 ask → 展示工具/原因 → allow/deny
 *    （可记住选择 —— 场景缓存后续交 PRM/路由策略）；
 *  - user（ask-user 任务内澄清，FR-023）：AI 主动提问 → 选项/确认/自由文本回填。
 * 语义区分（help 同 base）：权限 ask 决定「工具能否执行」；ask-user 是内容澄清。
 */
import React from 'react';

export type AskDialogEntry =
  | {
      kind: 'permission';
      tool: string;
      reason: string;
      /** 记住本次选择（UI 勾选，返回给调用方持久化/后续策略）。 */
    }
  | {
      kind: 'user';
      kindOf: 'choice' | 'confirm' | 'text';
      prompt: string;
      options?: string[];
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
            </div>
            <div style={{ marginBottom: 10, color: '#4b5563' }}>{entry.reason}</div>
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
