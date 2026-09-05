// AI 助手面板：消息列表 + 预置提示词滑轨 + 输入框 + lgdl-web-cli 命令块「执行」
import React, { useCallback, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PROVIDERS, type ProviderSettings } from './provider';
import { LGDL_SYSTEM_PROMPT } from './prompts';
import { parseNextActions, type NextAction } from '@lgdl/lgdl-web-op-cli';
import type { AiSession } from './session';
import { SettingsPanel } from './SettingsPanel';

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant' | 'system' | 'tool';
  /**
   * 内容类型：chat=markdown 渲染（代码均展示）；web-cli=命令框渲染（可执行）；
   * next-actions=推荐下一步的胶囊卡片（点击即把动作作为用户指令发送）。
   */
  type: 'chat' | 'web-cli' | 'next-actions';
  content: string;
  /** type === 'next-actions' 时的推荐动作列表（点击胶囊 → 发送 prompt） */
  actions?: NextAction[];
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
    prompt: '请创作一张系统架构图（arch）：分层（接入层/应用层/数据层）用 add-node --kind group，节点用 add-node，依赖用 add-edge。用 lgdl-web-cli 命令搭建。',
  },
  {
    id: 'datastream',
    label: '画数据流图',
    hint: '生成一张 datastream 数据流图（用 lgdl-web-cli 命令）',
    prompt: '请创作一张数据流图（datastream）：2-3 个泳道（add-node --kind group）、数据节点（entity）、流转边。用 lgdl-web-cli 命令搭建。',
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
    hint: '用 add-node --kind group 给节点归类分层',
    prompt: '请给当前图设计合理分组（add-node --kind group --contains / update-node --contains-add）：按业务域或层次归类节点。',
  },
  {
    id: 'convert',
    label: '转换图类型',
    hint: '把当前图转换为另一种图类型（用 lgdl-web-cli 命令）',
    prompt: '请把当前图转换为另一种更合适的图类型（如 flowchart → sequence），语义保持对应。用 lgdl-web-cli 命令重建节点与边。',
  },
];

let nextId = 1;

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

/** 推荐下一步卡片：AI 完成总结后推荐的胶囊列表，点击即把动作发送给 AI 继续。 */
function NextActionsCard({
  actions,
  onPick,
  disabled,
}: {
  actions: NextAction[];
  onPick: (prompt: string) => void;
  disabled?: boolean;
}) {
  if (actions.length === 0) return null;
  return (
    <div className="ai-next-actions">
      <div className="ai-next-actions-title">AI 推荐下一步：</div>
      <div className="ai-next-actions-track">
        {actions.map((a, i) => (
          <button
            key={`${a.label}-${i}`}
            type="button"
            className="ai-next-chip"
            title={a.prompt}
            onClick={() => onPick(a.prompt)}
            disabled={disabled}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function AiPanel({
  onApply,
  session,
  currentSource = '',
  settings,
  onSaveSettings,
}: {
  onApply: ApplySource;
  /** AI 会话（App 持有单一组装点：router + 业务工具 + delay 600；本组件注入渲染/交互事件） */
  session: AiSession;
  currentSource?: string;
  settings: ProviderSettings;
  onSaveSettings: (s: ProviderSettings) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: nextId++,
      role: 'system',
      type: 'chat',
      content:
        '🤖 我是 LGDL Web 工作台的 AI 操作助手：通过自然语言帮你生成或修改图。我会用 lgdl-web-cli 命令操作图（如 lgdl-web-cli status --doc main、lgdl-web-cli add-node --doc main --id x），并在预览中定位/高亮让你看到每一步改动。首次使用请点击面板右上角 ⚙ 设置 API Provider 与 Key。',
    },
  ]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(nextId);
  const currentSourceRef = useRef(currentSource);
  currentSourceRef.current = currentSource;
  const presetTrackRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  // 使用指南（README-CLI.md）：会话开始时由系统自动加载一次并注入 system，
  // 不依赖 AI 调 web-fetch（模型可能漏传 --path 导致加载失败）。
  const guideDocRef = useRef<string | null>(null);
  const guideLoadingRef = useRef<Promise<void> | null>(null);
  const ensureGuideDoc = useCallback((): Promise<void> => {
    if (guideDocRef.current !== null) return Promise.resolve();
    if (!guideLoadingRef.current) {
      guideLoadingRef.current = (async () => {
        try {
          const res = await fetch('lgdl/web/workbench/README-CLI.md', { cache: 'no-store' });
          if (res.ok) guideDocRef.current = await res.text();
        } catch {
          // 加载失败不阻塞：AI 仍可全程用 --help 查询
        }
      })();
    }
    return guideLoadingRef.current;
  }, []);

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
    (role: ChatMessage['role'], content: string, type: ChatMessage['type'] = 'chat', actions?: NextAction[]) => {
      setMessages((prev) => [...prev, { id: idRef.current++, role, content, type, actions }]);
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

      // 触发使用指南加载（缓存幂等；system() 里 await 保证已就绪）
      void ensureGuideDoc();

      // ---- agent 循环已上收 web-cli-base AgentRunner（FR-006/D-003）：
      // 本组件只注入 system 组装（LGDL_SYSTEM_PROMPT + guideDoc）、渲染事件
      // （events → appendMessage）与 LGDL 特有处理点（hooks：next-actions 拦截
      // + onApply 编辑器写回）；工具分发/命令文本/schema 供给全部经 session 的
      // router（唯一组装点）派生，本组件无 tc.name 分发/前缀/sleep/help 聚合面。
      const run = session.runAgent({
        user: message,
        system: async () => {
          // 使用指南已由系统自动加载：随 system 一并提供（战略层知识），
          // AI 无需（也不应）再调 web-fetch 获取该方法论文档
          await ensureGuideDoc();
          const guideDoc = guideDocRef.current;
          return guideDoc
            ? `${LGDL_SYSTEM_PROMPT}\n\n## 使用指南（系统已自动加载，供参考）\n\n${guideDoc}`
            : LGDL_SYSTEM_PROMPT;
        },
        maxRounds: s.maxRounds ?? 1000,
        events: {
          // assistant 新增文本 → chat 消息（markdown）
          onAssistantText: (t) => appendMessage('assistant', t),
          // 工具命令文本 → web-cli 命令块消息（已由 runner 自动执行，结果在紧随的 tool 消息里）
          onCommandLine: (c) => appendMessage('assistant', c, 'web-cli'),
          // 工具输出 → tool 消息
          onToolOutput: (o) => appendMessage('tool', o),
          // 轮次上限（可在 ⚙ 设置中调整）
          onRoundLimit: (max) => appendMessage('assistant', `⚠ 已达到 ${max} 轮上限（可在 ⚙ 设置中调整），自动停止。`),
          // 空内容提示
          onEmptyReply: () => appendMessage('assistant', '⚠ AI 返回了空内容，请重试或换一个模型。'),
          // LLM 调用失败：首次展示并重试，连续失败提示停止
          onLLMError: (msg, willRetry) => {
            appendMessage('assistant', `✖ ${msg}`);
            if (!willRetry) {
              appendMessage('assistant', '⚠ LLM 连续调用失败，已停止（可稍后重试或检查 API 设置）。');
            }
          },
          // 失败聚合提示（runner 已内部 push 纠正 user turn）
          onFailAggregate: () => appendMessage('assistant', '部分命令执行失败，请根据上面的错误修正后继续。'),
          // 本轮结束 → 解除 pending
          onFinish: () => setPending(false),
        },
        hooks: {
          // lgdl-web-op-cli next-actions → 胶囊卡片消息（UI 交互，App 不参与）
          intercept: (tc) => {
            if (tc.name === 'lgdl-web-op-cli' && tc.subcommand === 'next-actions') {
              const actions = parseNextActions(tc.args.actions ?? '');
              if (actions.length === 0) {
                return { ok: false, output: '✖ next-actions 需要 actions 参数（JSON 数组：[{"label":"...","prompt":"..."}]）' };
              }
              appendMessage('assistant', '', 'next-actions', actions);
              return { ok: true, output: `✓ 已展示 ${actions.length} 个推荐动作（点击胶囊即发送）` };
            }
            return null;
          },
          // 文档变更类工具完成 → 写回编辑器（session 内部已推进 run-local source）
          onToolDone: (_tc, result) => {
            if (result.changed && typeof result.source === 'string') onApply(result.source);
          },
        },
      });
      void run.run();
    },
    [input, pending, appendMessage, onApply, session, ensureGuideDoc],
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
              {msg.type === 'next-actions' ? (
                // AI 推荐的下一步动作：胶囊卡片，点击即把动作作为用户指令发送
                <NextActionsCard actions={msg.actions ?? []} onPick={(p) => send(p)} disabled={pending} />
              ) : msg.role === 'tool' ? (
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
          <button className="ai-send-btn" onClick={() => send()} disabled={pending || !input.trim()}>
            {pending ? '…' : '发送'}
          </button>
        </div>
      </div>
    </div>
  );
}
