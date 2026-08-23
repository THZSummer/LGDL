// AI 助手面板：消息列表 + 预置提示词滑轨 + 输入框 + lgdl-web-cli 命令块「执行」
import React, { useCallback, useRef, useState } from 'react';
import {
  extractCommands,
  executeCommands,
  describeCommandLine,
  type CommandExecResult,
} from './ops';
import { chat, loadSettings, PROVIDERS, type ProviderSettings } from './provider';
import { LGDL_SYSTEM_PROMPT } from './prompts';
import { SettingsPanel } from './SettingsPanel';

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant' | 'system' | 'tool';
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
    hint: '检查并修复当前图的错误（用 lgdl-web-cli 命令）',
    prompt: '请检查当前图的错误（先 lgdl-web-cli status --doc main 看结构，再定位问题），然后用 lgdl-web-cli 命令修复（如 update-node / update-edge / remove-edge 等）。',
  },
  {
    id: 'optimize',
    label: '自动优化',
    hint: '优化节点/边的结构与命名（用 lgdl-web-cli 命令）',
    prompt: '请优化当前图的节点、边、分组结构与命名：消除冗余、合并同类、命名更清晰（用 lgdl-web-cli 命令增量修改，保持语义不变）。',
  },
  {
    id: 'simplify',
    label: '简化图',
    hint: '删减次要节点与边，突出核心脉络（用 lgdl-web-cli 命令）',
    prompt: '请简化当前图：删减次要/冗余的节点和边，突出核心流程与关键依赖（用 lgdl-web-cli 命令，如 remove-node / remove-edge）。',
  },
  {
    id: 'create',
    label: '自由创作',
    hint: '从零开始创作一张新图（用 lgdl-web-cli 命令）',
    prompt: '请自由创作一张图（flowchart、mindmap、er、state 等类型都行）。先 lgdl-web-cli status --doc main 看当前图，若已有内容先清理，再用 lgdl-web-cli 命令逐步搭建。',
  },
  {
    id: 'explain',
    label: '解释当前图',
    hint: '解读当前图的结构与含义',
    prompt: '请先用 lgdl-web-cli status --doc main 查看当前图，然后解释：它表达了什么、有哪些关键节点/边/分组、整体结构如何。',
  },
  {
    id: 'flowchart',
    label: '画流程图',
    hint: '生成一张 flowchart 流程图（用 lgdl-web-cli 命令）',
    prompt: '请创作一张业务流程图（flowchart）：开始、若干处理步骤、判断分支、结束。用 lgdl-web-cli 命令搭建（lgdl-web-cli add-node --doc main ...）。',
  },
  {
    id: 'mindmap',
    label: '画思维导图',
    hint: '生成一张 mindmap 思维导图（用 lgdl-web-cli 命令）',
    prompt: '请创作一张主题思维导图（mindmap）：中心主题 + 3-5 个一级分支，每个分支 2-3 个子项。用 lgdl-web-cli 命令搭建。',
  },
  {
    id: 'sequence',
    label: '画时序图',
    hint: '生成一张 sequence 时序图（用 lgdl-web-cli 命令）',
    prompt: '请创作一张系统交互时序图（sequence）：3-4 个参与者、至少 5 条带标签的消息。用 lgdl-web-cli 命令搭建。',
  },
  {
    id: 'er',
    label: '画 ER 图',
    hint: '生成一张 er 实体关系图（用 lgdl-web-cli 命令）',
    prompt: '请创作一张数据库 ER 图（er）：3-4 个实体（entity + 成员）、实体间关系带基数（--cardinality-from/to）。用 lgdl-web-cli 命令搭建。',
  },
  {
    id: 'state',
    label: '画状态机',
    hint: '生成一张 state 状态机图（用 lgdl-web-cli 命令）',
    prompt: '请创作一张状态机图（state）：初始状态、3-4 个业务状态、终止状态、转移边带事件标签。用 lgdl-web-cli 命令搭建。',
  },
  {
    id: 'gantt',
    label: '画甘特图',
    hint: '生成一张 gantt 甘特图（用 lgdl-web-cli 命令）',
    prompt: '请创作一张项目排期甘特图（gantt）：4-6 个任务（--attrs start=天数,duration=天数），至少一个里程碑（duration=0）。用 lgdl-web-cli 命令搭建。',
  },
  {
    id: 'class',
    label: '画类图',
    hint: '生成一张 uml-class 类图（用 lgdl-web-cli 命令）',
    prompt: '请创作一张 UML 类图（uml-class）：3-4 个类（entity + --member-add kind=attribute/name=...），类间关系。用 lgdl-web-cli 命令搭建。',
  },
  {
    id: 'arch',
    label: '画架构图',
    hint: '生成一张 arch 架构图（用 lgdl-web-cli 命令）',
    prompt: '请创作一张系统架构图（arch）：分层（接入层/应用层/数据层）用 add-group，节点用 add-node，依赖用 add-edge。用 lgdl-web-cli 命令搭建。',
  },
  {
    id: 'datastream',
    label: '画数据流图',
    hint: '生成一张 datastream 数据流图（用 lgdl-web-cli 命令）',
    prompt: '请创作一张数据流图（datastream）：2-3 个泳道（add-group）、数据节点（entity）、流转边。用 lgdl-web-cli 命令搭建。',
  },
  {
    id: 'add-node',
    label: '追加节点',
    hint: '在当前图中新增节点并接入流程（用 lgdl-web-cli 命令）',
    prompt: '请给当前图追加一个业务上合理的节点（kind 与现有节点匹配），并用 add-node / add-edge 接入现有流程。',
  },
  {
    id: 'add-edge',
    label: '补充连接',
    hint: '补全图中缺失/合理的依赖边（用 lgdl-web-cli 命令）',
    prompt: '请检查当前图（lgdl-web-cli status --doc main）：节点间关系是否完整、有无缺失依赖边，用 add-edge 补充合理连接。',
  },
  {
    id: 'group',
    label: '整理分组',
    hint: '用 add-group 给节点归类分层',
    prompt: '请给当前图设计合理分组（add-group / update-group）：按业务域或层次归类节点。',
  },
  {
    id: 'convert',
    label: '转换图类型',
    hint: '把当前图转换为另一种图类型（用 lgdl-web-cli 命令）',
    prompt: '请把当前图转换为另一种更合适的图类型（如 flowchart → sequence），语义保持对应。用 lgdl-web-cli 命令重建节点与边。',
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

/** lgdl web-cli 命令块：展示 AI 输出的协议块，点「执行」在编辑器上运行（与 CLI 同语义）。 */
function CommandBlock({
  commands,
  currentSource,
  docId,
  onApply,
  autoApply = false,
}: {
  commands: string;
  currentSource: string;
  docId: string;
  onApply: ApplySource;
  autoApply?: boolean;
}) {
  const [status, setStatus] = useState<'idle' | 'applied' | 'error'>('idle');
  const [result, setResult] = useState<CommandExecResult | null>(null);
  const lines = commands.split('\n').map((l) => l.trim()).filter(Boolean);

  const run = useCallback(() => {
    const r = executeCommands(currentSource, commands, docId);
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
  }, [commands, currentSource, docId, onApply]);

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
        <span className="ai-codeblock-lang">lgdl-web-cli · 执行</span>
        <button
          className="ai-apply-btn"
          onClick={run}
          disabled={status === 'applied'}
          title="在编辑器上逐条执行（与终端 lgdl-cli 命令同一套语义）"
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

/** 将消息内容拆成段落 + lgdl-web-cli 协议块（执行调用）。 */
function MessageBody({
  content,
  onApply,
  currentSource,
  docId,
  autoApply = false,
}: {
  content: string;
  onApply: ApplySource;
  currentSource: string;
  docId: string;
  autoApply?: boolean;
}) {
  const parts: React.ReactNode[] = [];
  // lgdl-web-cli 块是执行协议；其他代码块（bash/code/yaml...）一律当普通文本展示
  const re = /```(lgdl-web-cli)\s*\n([\s\S]*?)```/g;
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
    const body = m[2].replace(/\n$/, '');
    parts.push(
      <CommandBlock key={k++} commands={body} currentSource={currentSource} docId={docId} onApply={onApply} autoApply={autoApply} />,
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
  docId = 'main',
  settings,
  onSaveSettings,
}: {
  onApply: ApplySource;
  currentSource?: string;
  /** 当前文档 id（web-cli 的 --doc 必填，未来多标签/多文档时扩展） */
  docId?: string;
  settings: ProviderSettings;
  onSaveSettings: (s: ProviderSettings) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: nextId++,
      role: 'system',
      content:
        '🤖 我是 LGDL AI 助手：通过自然语言生成或修改图。我会用 `lgdl-web-cli` 命令（如 `lgdl-web-cli status --doc main`、`lgdl-web-cli add-node --doc main --id x`）操作图，点「执行」运行。首次使用请点击面板右上角 ⚙ 设置 API Provider 与 Key。',
    },
  ]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [autoApply, setAutoApply] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(nextId);
  const currentSourceRef = useRef(currentSource);
  currentSourceRef.current = currentSource;
  const docIdRef = useRef(docId);
  docIdRef.current = docId;
  const presetTrackRef = useRef<HTMLDivElement>(null);
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

      // ---- agent 循环：像终端一样逐步执行（最多 MAX_ROUNDS 轮）----
      const MAX_ROUNDS = 10;
      // 会话消息序列：system + user 指令 + (assistant 回复 + tool 结果)...
      const turns: { role: 'system' | 'user' | 'assistant' | 'tool'; content: string }[] = [
        { role: 'user', content: message },
      ];
      const failCount = { current: 0 };
      let sourceNow = currentSourceRef.current;

      const step = async (round: number) => {
        if (round > MAX_ROUNDS) {
          appendMessage('assistant', `⚠ 已达到 ${MAX_ROUNDS} 轮上限，自动停止（可继续发消息让 AI 接着做）。`);
          setPending(false);
          return;
        }
        // 组装本轮 LLM 输入：system + 历史；tool 结果映射为 user 角色，
        // 并合并相邻同 role 消息（OpenAI 兼容 API 不允许连续 user/assistant）
        const sys = { role: 'system' as const, content: LGDL_SYSTEM_PROMPT };
        const raw: { role: 'user' | 'assistant'; content: string }[] = turns
          .filter((t) => t.role !== 'system')
          .map((t) => ({
            role: t.role === 'tool' ? 'user' : (t.role as 'user' | 'assistant'),
            content: t.role === 'tool' ? `[web-cli 执行结果]\n${t.content}` : t.content,
          }));
        const msgs: { role: 'user' | 'assistant'; content: string }[] = [];
        for (const m of raw) {
          const last = msgs[msgs.length - 1];
          if (last && last.role === m.role) {
            last.content += `\n\n${m.content}`;
          } else {
            msgs.push({ ...m });
          }
        }
        try {
          const res = await chat(s, [sys, ...msgs]);
          const reply = res.content.trim();
          if (!reply) {
            appendMessage('assistant', '⚠ AI 返回了空内容，请重试或换一个模型。');
            setPending(false);
            return;
          }
          appendMessage('assistant', reply);
          turns.push({ role: 'assistant', content: reply });

          // 提取命令块：无命令 → 任务完成
          const commands = extractCommands(reply);
          if (!commands) {
            setPending(false);
            return; // AI 以总结收尾
          }

          // 执行命令（作用于当前编辑器源码）
          const exec = executeCommands(sourceNow, commands, docIdRef.current);
          // 有修改才写回编辑器；status/空操作仅展示
          if (exec.changed) {
            onApply(exec.source);
            sourceNow = exec.source;
          }
          const output = exec.lines.join('\n') || '(无输出)';
          appendMessage('tool', output);
          // 执行结果作为 tool 反馈给 AI（映射为 user 角色时带明确前缀）
          turns.push({
            role: 'tool',
            content: `[web-cli 执行结果]\n${output}`,
          });

          if (!exec.ok) {
            // 执行失败：反馈给 AI 让其修正（终端体验：看到错误继续）
            appendMessage('assistant', '命令执行失败，请根据上面的错误修正后继续。');
            turns.push({ role: 'user', content: '上一条命令执行失败，请查看错误并修正命令后重试。' });
          }
          await step(round + 1);
        } catch (err) {
          // LLM 调用失败（网络/API 错误）：展示并反馈给 AI 重试一次，连续失败则停
          const msg = (err as Error).message;
          appendMessage('assistant', `✖ ${msg}`);
          if (failCount.current >= 1) {
            appendMessage('assistant', '⚠ LLM 连续调用失败，已停止（可稍后重试或检查 API 设置）。');
            setPending(false);
            return;
          }
          failCount.current += 1;
          turns.push({ role: 'user', content: `上一步调用出错：${msg}。请修正后重试（如果问题与图无关请直接总结收尾）。` });
          await step(round + 1);
        }
      };

      step(1);
    },
    [input, pending, appendMessage, onApply],
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
              {msg.role === 'tool' ? (
                <pre className="ai-tool-output">{msg.content}</pre>
              ) : (
                <MessageBody content={msg.content} onApply={onApply} currentSource={currentSourceRef.current} docId={docIdRef.current} autoApply={autoApply} />
              )}
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
