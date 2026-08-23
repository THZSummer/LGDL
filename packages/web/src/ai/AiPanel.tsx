// AI 助手面板：消息列表 + 预置提示词滑轨 + 输入框 + lgdl 命令块「执行」
import React, { useCallback, useRef, useState } from 'react';
import {
  extractCommands,
  executeCommands,
  describeCommandLine,
  type CommandExecResult,
} from './ops';
import { chat, loadSettings, PROVIDERS, type ProviderSettings } from './provider';
import { buildTurns } from './prompts';
import { SettingsPanel } from './SettingsPanel';

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/** 把 AI 输出写入编辑器（由 App 提供，写入后实时渲染）。 */
export type ApplySource = (source: string) => void;

/**
 * 预置操作提示词（点击即发送给 AI）。支持后续追加：
 * 在数组末尾加一项 { id, label, hint, prompt } 即可，无需改其他代码。
 */
export interface PresetPrompt {
  id: string;
  label: string;
  hint: string; // 悬停提示
  prompt: string; // 发送给 AI 的指令（可含 {source} 占位符，发送时替换为当前源码）
}

export const PRESET_PROMPTS: PresetPrompt[] = [
  {
    id: 'fix',
    label: '语法修复',
    hint: '检查当前源码的语法/校验错误，输出修复后的完整代码',
    prompt:
      '请检查下面当前图源码中的语法错误和校验问题（如重复边、自环、非法字段、节点/分组冲突等），' +
      '输出修复后的完整 LGDL 代码。\n\n当前图源码：\n{source}',
  },
  {
    id: 'optimize',
    label: '自动优化',
    hint: '优化节点/边的结构与命名，让图更清晰',
    prompt:
      '请优化下面当前图的节点、边、分组的结构与命名：消除冗余、合并同类、命名更清晰，' +
      '输出优化后的完整 LGDL 代码（保持语义不变）。\n\n当前图源码：\n{source}',
  },
  {
    id: 'simplify',
    label: '简化图',
    hint: '删减次要节点与边，突出核心脉络',
    prompt:
      '请简化下面当前图：删减次要/冗余的节点和边，突出核心流程与关键依赖，' +
      '输出简化后的完整 LGDL 代码。\n\n当前图源码：\n{source}',
  },
  {
    id: 'create',
    label: '自由创作',
    hint: '从零开始创作一张新图',
    prompt: '请自由创作一张图（可以选择 flowchart、mindmap、er、state 等类型），输出完整的 LGDL 代码。',
  },
  {
    id: 'explain',
    label: '解释当前图',
    hint: '解读当前图的结构与含义',
    prompt: '请解释下面当前图：它表达了什么、有哪些关键节点/边/分组、整体结构如何。\n\n当前图源码：\n{source}',
  },
  {
    id: 'flowchart',
    label: '画流程图',
    hint: '生成一张 flowchart 流程图',
    prompt: '请创作一张业务流程图（type: flowchart），包含开始、若干处理步骤、判断分支和结束，输出完整的 LGDL 代码。',
  },
  {
    id: 'mindmap',
    label: '画思维导图',
    hint: '生成一张 mindmap 思维导图',
    prompt: '请创作一张主题思维导图（type: mindmap），中心主题下分 3-5 个一级分支，每个分支有 2-3 个子项，输出完整的 LGDL 代码。',
  },
  {
    id: 'sequence',
    label: '画时序图',
    hint: '生成一张 sequence 时序图',
    prompt: '请创作一张系统交互时序图（type: sequence），包含 3-4 个参与者、至少 5 条带标签的消息交互，输出完整的 LGDL 代码。',
  },
  {
    id: 'er',
    label: '画 ER 图',
    hint: '生成一张 er 实体关系图',
    prompt: '请创作一张数据库 ER 图（type: er），包含 3-4 个实体及其成员字段、实体间关系（带基数），输出完整的 LGDL 代码。',
  },
  {
    id: 'state',
    label: '画状态机',
    hint: '生成一张 state 状态机图',
    prompt: '请创作一张状态机图（type: state），包含初始状态、3-4 个业务状态、终止状态及转移边，输出完整的 LGDL 代码。',
  },
  {
    id: 'gantt',
    label: '画甘特图',
    hint: '生成一张 gantt 甘特图',
    prompt: '请创作一张项目排期甘特图（type: gantt），包含 4-6 个任务（含开始日期/持续天数），其中至少一个里程碑，输出完整的 LGDL 代码。',
  },
  {
    id: 'class',
    label: '画类图',
    hint: '生成一张 uml-class 类图',
    prompt: '请创作一张 UML 类图（type: uml-class），包含 3-4 个类（含成员与关系），输出完整的 LGDL 代码。',
  },
  {
    id: 'arch',
    label: '画架构图',
    hint: '生成一张 arch 架构图',
    prompt: '请创作一张系统架构图（type: arch），包含分层（接入层/应用层/数据层）或模块分组、节点间依赖边，输出完整的 LGDL 代码。',
  },
  {
    id: 'datastream',
    label: '画数据流图',
    hint: '生成一张 datastream 数据流图',
    prompt: '请创作一张数据流图（type: datastream），包含 2-3 个泳道分区和若干数据流转边，输出完整的 LGDL 代码。',
  },
  {
    id: 'add-node',
    label: '追加节点',
    hint: '在当前图中新增节点并接入现有流程',
    prompt:
      '请给下面当前图追加一个业务上合理的节点（kind 与现有节点匹配），并添加必要的边把它接入现有流程，' +
      '输出修改后的完整 LGDL 代码。\n\n当前图源码：\n{source}',
  },
  {
    id: 'add-edge',
    label: '补充连接',
    hint: '补全图中缺失/合理的依赖边',
    prompt:
      '请检查下面当前图：节点之间的关系是否完整、是否有明显缺失的依赖边，补充合理的边，' +
      '输出修改后的完整 LGDL 代码。\n\n当前图源码：\n{source}',
  },
  {
    id: 'group',
    label: '整理分组',
    hint: '用 groups 给节点归类分层',
    prompt:
      '请给下面当前图设计合理的分组（groups）：按业务域或层次归类节点，输出修改后的完整 LGDL 代码。' +
      '\n\n当前图源码：\n{source}',
  },
  {
    id: 'convert',
    label: '转换图类型',
    hint: '把当前图转换为另一种图类型',
    prompt:
      '请把下面当前图转换为另一种更合适的图类型（如 flowchart → sequence），语义保持对应，' +
      '输出转换后的完整 LGDL 代码。\n\n当前图源码：\n{source}',
  },
];

let nextId = 1;

/** 极简 markdown 渲染：行内 code、加粗；``` 围栏 → 代码块。 */
function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // 行内 `code` 与 **bold** 简单解析
  const re = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith('`')) {
      nodes.push(
        <code key={k++} className="ai-inline-code">
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      nodes.push(
        <strong key={k++}>{token.slice(2, -2)}</strong>,
      );
    }
    last = m.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** lgdl 命令块：展示 AI 输出的命令行序列，点「执行」在编辑器上运行（与 CLI 同语义）。 */
function CommandBlock({
  commands,
  currentSource,
  onApply,
  autoApply = false,
}: {
  commands: string;
  currentSource: string;
  onApply: ApplySource;
  autoApply?: boolean;
}) {
  const [status, setStatus] = useState<'idle' | 'applied' | 'error'>('idle');
  const [result, setResult] = useState<CommandExecResult | null>(null);
  const lines = commands.split('\n').map((l) => l.trim()).filter(Boolean);

  const run = useCallback(() => {
    const r = executeCommands(currentSource, commands);
    setResult(r);
    if (r.ok && r.changed) {
      onApply(r.source);
      setStatus('applied');
    } else if (r.ok) {
      // status 或空操作：没有修改，仅展示输出（不写编辑器）
      setStatus('applied');
    } else {
      setStatus('error');
    }
  }, [commands, currentSource, onApply]);

  // 自动应用：挂载时触发一次（autoApply 开启时新到达的回复自动执行）
  const appliedRef = useRef(false);
  React.useEffect(() => {
    if (autoApply && !appliedRef.current) {
      appliedRef.current = true;
      run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoApply]);

  return (
    <div className={`ai-codeblock ai-opsblock${status === 'error' ? ' has-error' : ''}`}>
      <div className="ai-codeblock-head">
        <span className="ai-codeblock-lang">lgdl · 命令</span>
        <button
          className="ai-apply-btn"
          onClick={run}
          disabled={status === 'applied'}
          title="在编辑器上逐条执行（与 CLI lgdl 命令同一套语义）"
        >
          {status === 'applied' ? '✓ 已执行' : '执行'}
        </button>
      </div>
      <div className="ai-opsblock-body">
        {lines.map((line, i) => (
          <div key={i} className="ai-opsblock-line">
            <span className="ai-opsblock-idx">{i + 1}</span>
            <code>{line}</code>
          </div>
        ))}
      </div>
      {status === 'applied' && result && (
        <div className="ai-opsblock-ok">
          {result.lines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      )}
      {status === 'error' && (
        <div className="ai-codeblock-errors">
          <div className="ai-codeblock-error-title">✖ 命令未执行</div>
          {result?.lines.map((l, i) => (
            <div key={i} className="ai-codeblock-error">
              {l}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** 将消息内容拆成段落 + lgdl 命令块。 */
function MessageBody({
  content,
  onApply,
  currentSource,
  autoApply = false,
}: {
  content: string;
  onApply: ApplySource;
  currentSource: string;
  autoApply?: boolean;
}) {
  const parts: React.ReactNode[] = [];
  const re = /```(?:bash|sh|lgdl-cli|lgdl)\s*\n([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(content))) {
    if (m.index > last) {
      const text = content.slice(last, m.index).trim();
      if (text) {
        parts.push(
          <p key={k++} className="ai-msg-para">
            {renderInline(text)}
          </p>,
        );
      }
    }
    const body = m[1].replace(/\n$/, '');
    parts.push(
      <CommandBlock key={k++} commands={body} currentSource={currentSource} onApply={onApply} autoApply={autoApply} />,
    );
    last = m.index + m[0].length;
  }
  const tail = content.slice(last).trim();
  if (tail) {
    parts.push(
      <p key={k++} className="ai-msg-para">
        {renderInline(tail)}
      </p>,
    );
  }
  return <>{parts}</>;
}

export function AiPanel({
  onApply,
  currentSource = '',
  settings,
  onSaveSettings,
}: {
  onApply: ApplySource;
  currentSource?: string;
  settings: ProviderSettings;
  onSaveSettings: (s: ProviderSettings) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: nextId++,
      role: 'system',
      content:
        '🤖 我是 LGDL AI 助手：通过自然语言生成或修改图。我会用 `lgdl` 命令（如 `lgdl status`、`lgdl add-node --id x`）操作图，点「执行」运行。首次使用请点击面板右上角 ⚙ 设置 API Provider 与 Key。',
    },
  ]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [autoApply, setAutoApply] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(nextId);
  const currentSourceRef = useRef(currentSource);
  currentSourceRef.current = currentSource;
  const presetTrackRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // 预置滑轨：垂直滚轮转横向滚动（内容溢出时才劫持，避免挡住页面滚动）
  React.useEffect(() => {
    const el = presetTrackRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth + 1) return; // 无溢出，不劫持
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const appendMessage = useCallback((role: ChatMessage['role'], content: string) => {
    setMessages((prev) => [...prev, { id: idRef.current++, role, content }]);
  }, []);

  // 滚动到底部（新消息/思考中）
  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);
  React.useEffect(() => {
    scrollToBottom();
  }, [messages, pending, scrollToBottom]);

  const send = useCallback(
    (text?: string) => {
      const message = (text ?? input).trim();
      if (!message || pending) return;
      appendMessage('user', message);
      setInput('');
      setPending(true);

      const s = settingsRef.current;
      if (!s.apiKey.trim()) {
        appendMessage(
          'assistant',
          '⚠ 尚未配置 API Key。请点击面板右上角 **⚙ 设置**，选择服务商并粘贴你的 API Key，然后再试。',
        );
        setPending(false);
        return;
      }
      // 不可直连厂商（CORS 受限）直接拦截，避免白等
      const cfg = PROVIDERS.find((p) => p.id === s.providerId);
      if (cfg && !cfg.browserDirect) {
        appendMessage(
          'assistant',
          `⚠ ${cfg.name} 不允许浏览器直连（CORS 受限），当前版本无法使用。请点击 **⚙ 设置** 换用 DeepSeek / Qwen / OpenAI 等可直连服务商；本地代理（lgdl serve）将在 v0.6 提供。`,
        );
        setPending(false);
        return;
      }

      const { system, messages: turnMessages } = buildTurns(
        message,
        currentSourceRef.current,
        historyRef.current,
      );

      chat(s, [{ role: 'system', content: system }, ...turnMessages])
        .then((res) => {
          if (!res.content.trim()) {
            appendMessage('assistant', '⚠ AI 返回了空内容，请重试或换一个模型。');
            return;
          }
          appendMessage('assistant', res.content);
          // 维护多轮对话历史（保留最近 20 条，避免上下文无限膨胀）
          historyRef.current = [...historyRef.current, ...turnMessages, { role: 'assistant', content: res.content }];
          if (historyRef.current.length > 20) {
            historyRef.current = historyRef.current.slice(-20);
          }
        })
        .catch((err) => {
          appendMessage('assistant', `✖ ${(err as Error).message}`);
        })
        .finally(() => setPending(false));
    },
    [input, pending, appendMessage],
  );

  /** 点击预置提示词胶囊：把指令（含当前源码上下文）直接发给 AI。 */
  const sendPreset = useCallback(
    (preset: PresetPrompt) => {
      const prompt = preset.prompt.includes('{source}')
        ? preset.prompt.replace('{source}', currentSourceRef.current || '（当前编辑器为空）')
        : preset.prompt;
      send(prompt);
    },
    [send],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    },
    [send],
  );

  return (
    <div className="ai-panel">
      <div className="ai-messages" ref={listRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`ai-msg ai-msg-${msg.role}`}>
            <div className="ai-msg-bubble">
              <MessageBody content={msg.content} onApply={onApply} currentSource={currentSourceRef.current} autoApply={autoApply} />
            </div>
          </div>
        ))}
        {pending && (
          <div className="ai-msg ai-msg-assistant">
            <div className="ai-msg-bubble ai-thinking">
              <span className="ai-thinking-dot" />
              <span className="ai-thinking-dot" />
              <span className="ai-thinking-dot" />
            </div>
          </div>
        )}
      </div>
      <div className="ai-preset-bar" aria-label="预置操作">
        <span className="ai-preset-label">快捷操作</span>
        <div className="ai-preset-track" ref={presetTrackRef}>
          {PRESET_PROMPTS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="ai-preset-chip"
              title={preset.hint}
              onClick={() => sendPreset(preset)}
              disabled={pending}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
      <div className="ai-input-bar">
        <textarea
          className="ai-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="描述你想生成的图，或要求修改当前图（Enter 发送，Shift+Enter 换行）"
          rows={2}
          disabled={pending}
        />
        <div className="ai-input-side">
          <label className="ai-auto-apply" title="开启后，AI 回复中的 LGDL 代码块校验通过即自动写入编辑器">
            <input
              type="checkbox"
              checked={autoApply}
              onChange={(e) => setAutoApply(e.target.checked)}
              disabled={pending}
            />
            <span>自动应用</span>
          </label>
          <button className="ai-send-btn" onClick={() => send()} disabled={pending || !input.trim()}>
            {pending ? '…' : '发送'}
          </button>
        </div>
      </div>
    </div>
  );
}
