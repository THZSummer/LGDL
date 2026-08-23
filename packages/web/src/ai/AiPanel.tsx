// AI 助手面板：消息列表 + 预置提示词滑轨 + 输入框 + lgdl-web-cli 命令块「执行」
import React, { useCallback, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { executeSubcommand, executeWebFetch } from './ops';
import { chat, loadSettings, PROVIDERS, type ChatTurn, type ProviderSettings, type WebCliToolCall } from './provider';
import { LGDL_SYSTEM_PROMPT } from './prompts';
import { SettingsPanel } from './SettingsPanel';

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant' | 'system' | 'tool';
  /** 内容类型：chat=markdown 渲染（代码均展示）；web-cli=命令框渲染（可执行） */
  type: 'chat' | 'web-cli';
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

/** 把 toolCall 的 args 构造成命令行文本（--key value，值带引号）。 */
function toolCallToCommand(tc: WebCliToolCall): string {
  const prefix = tc.name === 'lgdl-web-op-cli' ? 'lgdl-web-op-cli' : tc.name === 'lgdl-web-fetch' ? 'lgdl-web-fetch' : 'lgdl-web-cli';
  const parts = tc.subcommand ? [`${prefix} ${tc.subcommand}`] : [prefix];
  for (const [k, v] of Object.entries(tc.args)) {
    parts.push(`--${k} ${/[\s"]/.test(v) ? `"${v}"` : v}`);
  }
  return parts.join(' ');
}

/**
 * 消息渲染：协议层先行拆分，chat 与 web-cli 明确分流。
 *
 * AI 回复由两种类型组成：
 *   - chat（表达）：除协议块外的全部内容 → react-markdown 完整渲染
 *   - web-cli（执行）：```lgdl-web-cli 围栏 → 命令块（可执行）
 * 协议块在渲染前精确提取（不交给 markdown 解析器判断），
 * 剩余文本整体按 markdown 渲染——类型由协议层区分，无猜测。
 */
/** chat 消息：纯 markdown 渲染（标题/列表/表格/引用/代码块展示…）。
 *  注意：chat 框内任何代码块（包括 lgdl-web-cli 字样）都是展示，不执行——
 *  执行只发生在 type='web-cli' 的消息里（协议层区分）。 */
function MarkdownBody({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // 块级代码块已由 code 组件自带 <pre>，避免 react-markdown 再套一层
        pre: ({ children }) => <>{children}</>,
        // 行内 `code`
        code({ className, children }) {
          const match = /language-([\w-]+)/.exec(className ?? '');
          const lang = match?.[1] ?? '';
          const text = String(children);
          if (lang === '' && !text.includes('\n')) {
            return <code className="ai-inline-code">{children}</code>;
          }
          // 块级代码块（展示用，无执行语义）
          return (
            <pre className="ai-md-code">
              <code className={className}>{children}</code>
            </pre>
          );
        },
        p: ({ children }) => <p className="ai-msg-para">{children}</p>,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noreferrer" className="ai-md-link">
            {children}
          </a>
        ),
        table: ({ children }) => (
          <div className="ai-md-table-wrap">
            <table className="ai-md-table">{children}</table>
          </div>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export function AiPanel({
  onApply,
  onWebOp,
  currentSource = '',
  docId = 'main',
  settings,
  onSaveSettings,
}: {
  onApply: ApplySource;
  /** lgdl-web-op-cli 执行器（UI 操作，返回结果文本给 AI 反馈） */
  onWebOp: (subcommand: string, args: Record<string, string>) => string;
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
      type: 'chat',
      content:
        '🤖 我是 LGDL AI 助手：通过自然语言生成或修改图。我会用 lgdl-web-cli 命令（如 lgdl-web-cli status --doc main、lgdl-web-cli add-node --doc main --id x）操作图，点「执行」运行。首次使用请点击面板右上角 ⚙ 设置 API Provider 与 Key。',
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

  const appendMessage = useCallback(
    (role: ChatMessage['role'], content: string, type: ChatMessage['type'] = 'chat') => {
      setMessages((prev) => [...prev, { id: idRef.current++, role, content, type }]);
    },
    [],
  );

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

      // ---- agent 循环：像终端一样逐步执行（轮数上限来自设置，默认 1000，
      // 防死循环用；正常任务几乎不会触达，真死循环时用户在设置里调小）----
      const MAX_ROUNDS = settingsRef.current.maxRounds ?? 1000;
      // 会话消息序列：system + user 指令 + (assistant 回复+toolCalls + tool 结果)...
      const turns: ChatTurn[] = [
        { role: 'user', content: message },
      ];
      const failCount = { current: 0 };
      let sourceNow = currentSourceRef.current;

      const step = async (round: number) => {
        if (round > MAX_ROUNDS) {
          appendMessage('assistant', `⚠ 已达到 ${MAX_ROUNDS} 轮上限（可在 ⚙ 设置中调整），自动停止。`);
          setPending(false);
          return;
        }
        // 组装本轮 LLM 输入：system + 历史；tool 结果保持 tool 角色
        // （provider.chat 会映射为 OpenAI tool / Claude tool_result）
        const sys = { role: 'system' as const, content: LGDL_SYSTEM_PROMPT };
        const msgs: ChatTurn[] = turns.filter((t) => t.role !== 'system');
        try {
          const res = await chat(s, [sys, ...msgs]);
          const reply = res.content.trim();

          // web-cli（图操作）+ web-op（UI 操作）+ web-fetch（web 获取）→ 统一执行
          const allCalls = [...res.toolCalls, ...res.opCalls, ...res.fetchCalls];
          if (allCalls.length > 0) {
            if (reply) {
              appendMessage('assistant', reply);
            }
            // 一个 assistant 消息携带全部 toolCalls（OpenAI/Claude 要求
            // tool 结果紧跟带 tool_calls 的 assistant 消息，中间不能插消息）
            const toolCallsMeta = allCalls.map((tc) => ({
              id: tc.id,
              name: tc.name,
              arguments: tc.rawArguments,
            }));
            turns.push({ role: 'assistant', content: reply, toolCalls: toolCallsMeta });

            let failed = false;
            for (const tc of allCalls) {
              const commandLine = toolCallToCommand(tc);
              appendMessage('assistant', commandLine, 'web-cli');
              let output: string;
              if (tc.name === 'lgdl-web-op-cli') {
                // UI 操作（与手动点击等效），由 App 执行
                output = onWebOp(tc.subcommand, tc.args);
              } else if (tc.name === 'lgdl-web-fetch') {
                // 基础 web 获取（独立工具，不改文档）
                const exec = await executeWebFetch(tc.args.path ?? '');
                output = exec.lines.join('\n') || '(无输出)';
                if (!exec.ok) failed = true;
              } else {
                // 图内容操作：结构化执行（不走文本解析，无 --doc 要求）
                const exec = await executeSubcommand(sourceNow, tc.subcommand, tc.args, docIdRef.current);
                if (exec.changed) {
                  onApply(exec.source);
                  sourceNow = exec.source;
                }
                output = exec.lines.join('\n') || '(无输出)';
                if (!exec.ok) failed = true;
              }
              appendMessage('tool', output);
              // tool 结果反馈（紧跟 assistant tool_calls，含 toolCallId）
              turns.push({ role: 'tool', content: output, toolCallId: tc.id });
            }
            if (failed) {
              // 失败提示在所有 tool 结果之后（不插在 assistant/tool 之间）
              appendMessage('assistant', '部分命令执行失败，请根据上面的错误修正后继续。');
              turns.push({ role: 'user', content: '上一条命令执行失败，请查看错误并修正命令后重试。' });
            }
            await step(round + 1);
            return;
          }

          // 无 tool_calls：chat 表达
          if (reply) {
            appendMessage('assistant', reply);
            turns.push({ role: 'assistant', content: reply });
          } else {
            appendMessage('assistant', '⚠ AI 返回了空内容，请重试或换一个模型。');
          }
          setPending(false);
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
    [input, pending, appendMessage, onApply, onWebOp],
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
          <div key={msg.id} className={`ai-msg ai-msg-${msg.role}${msg.type === 'web-cli' ? ' ai-msg-webcli' : ''}`}>
            <div className="ai-msg-bubble">
              {msg.role === 'tool' ? (
                <pre className="ai-tool-output">{msg.content}</pre>
              ) : msg.type === 'web-cli' ? (
                // web-cli 消息 → 命令文本展示（已由 agent 循环自动执行，
                // 结果在紧随的 tool 消息里）；无 markdown 解析
                <pre className="ai-webcli-command">{msg.content}</pre>
              ) : (
                // chat 消息 → markdown 渲染；里面任何代码块都是展示，不执行
                <MarkdownBody content={msg.content} />
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
