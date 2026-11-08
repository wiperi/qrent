'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BookOpen,
  ChevronDown,
  Maximize2,
  MapPin,
  MessageCircle,
  Settings2,
  X,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { ChatReply, ModelConnection } from '@/lib/rental-assistant/contracts';
import { useRentalSession, type RentalTurn } from '@/lib/rental-assistant/session';
import RentalAssistantSources from './RentalAssistantSources';
import styles from '@/styles/rental-tools.module.css';

function latestSearch(turns: RentalTurn[]) {
  const listingTurn = turns.findLast(turn =>
    turn.reply.evidence.some(item => item.kind === 'listings')
  );
  const listings = listingTurn?.reply.evidence.filter(item => item.kind === 'listings');
  const latest = listings?.at(-1);
  if (!latest) return undefined;
  const group = listings!.filter(
    item => JSON.stringify(item.filters) === JSON.stringify(latest.filters)
  );
  return {
    school: group.every(item => item.school === latest.school) ? latest.school : undefined,
    suburbs: group.flatMap(item => (item.suburb ? [item.suburb] : [])).slice(0, 3),
    ...latest.filters,
  };
}

const errorMessages: Record<string, [string, string]> = {
  invalid_request: [
    '这条消息无法提交，请缩短后重试。',
    'This message could not be sent. Try a shorter message.',
  ],
  invalid_connection: [
    '请检查 API 地址，使用可访问的 HTTPS 服务地址。',
    'Check the base URL and use a reachable HTTPS endpoint.',
  ],
  provider_key: [
    '模型服务拒绝了请求，请检查 API Key 和权限。',
    'The provider rejected the request. Check your key and permissions.',
  ],
  rate_limit: ['请求较多，请稍后再试。', 'Too many requests. Try again in a moment.'],
  connect_first: ['先连接模型，再发送问题。', 'Connect a model to send your question.'],
  provider_limit: [
    '模型服务达到请求或额度上限，请稍后重试。',
    'Your provider reached a request or quota limit. Try again later.',
  ],
  provider_model: [
    '模型服务拒绝了此模型或工具请求，请核对模型名及工具调用支持。',
    'Check the model name and that it supports tool calling.',
  ],
  timeout: [
    '这次查询超时，请重试或缩小查询范围。',
    'This request timed out. Try again or narrow your question.',
  ],
  model_unavailable: [
    '暂时连不上模型服务，请检查设置后重试。',
    'The model is unavailable. Check your connection and try again.',
  ],
  empty_answer: [
    '模型没有返回回答，请重试或换一个模型。',
    'The model returned no answer. Try again or choose another model.',
  ],
};

export default function RentalAssistant({
  locale,
  defaultModelAvailable,
  onClose,
}: {
  locale: 'zh' | 'en';
  defaultModelAvailable: boolean;
  onClose?: () => void;
}) {
  const zh = locale === 'zh';
  const panel = Boolean(onClose);
  const Frame = panel ? 'div' : 'main';
  const Heading = panel ? 'h2' : 'h1';
  const settingsId = useId();
  const session = useRentalSession();
  const connection =
    session.connection ?? (defaultModelAvailable ? { type: 'local' as const } : null);
  const { turns, draft, setDraft, addTurn, clearTurns, setConnection } = session;
  const [connectionType, setConnectionType] = useState<ModelConnection['type']>(
    connection?.type ?? 'compatible'
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  const active = useRef<AbortController | null>(null);
  const conversation = useRef<HTMLDivElement>(null);
  const settings = useRef<HTMLFormElement>(null);
  const suggestions = zh
    ? [
        'UNSW 的 Eastgardens 和 Randwick，两房周租各多少？',
        '没有澳洲租房记录，申请时能准备哪些替代材料？',
        'USYD 的 Newtown 有周租 900 以内的两房吗？看房时该检查什么？',
      ]
    : [
        'Compare two-bedroom rents in Eastgardens and Randwick near UNSW.',
        'I have no local rental history. What can I prepare to support my application?',
        'Find two-bedroom rentals in Newtown under $900 near USYD. What should I check at an inspection?',
      ];
  const connectedName =
    connection?.type === 'local'
      ? zh
        ? '默认模型'
        : 'Default model'
      : connection?.type === 'compatible'
        ? connection.model
        : zh
          ? '待连接'
          : 'Connect a model';

  const settingsLabel = zh
    ? connection
      ? '模型设置'
      : '连接模型'
    : connection
      ? 'Model settings'
      : 'Connect a model';

  useEffect(() => () => active.current?.abort(), []);

  useEffect(() => {
    if (settingsOpen) settings.current?.querySelector<HTMLElement>('input, select')?.focus();
  }, [settingsOpen]);

  useEffect(() => {
    const thread = conversation.current;
    const latest = thread?.querySelector(':scope > ol > li:last-child');
    if (thread && latest) {
      thread.scrollTop +=
        latest.getBoundingClientRect().top - thread.getBoundingClientRect().top - 12;
    }
  }, [turns, pending]);

  function applySettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (connectionType === 'local') setConnection({ type: 'local' });
    else {
      const baseUrl = String(form.get('baseUrl') ?? '').trim();
      const model = String(form.get('model') ?? '').trim();
      const apiKey = String(form.get('apiKey') ?? '').trim();
      if (!/^https:\/\//i.test(baseUrl) || !model || !apiKey) {
        setError('invalid_connection');
        return;
      }
      setConnection({ type: 'compatible', baseUrl, model, apiKey });
      event.currentTarget.reset();
    }
    setError('');
    setSettingsOpen(false);
  }

  async function send(value: string) {
    const question = value.trim();
    if (!question || active.current) return;
    if (!connection) {
      setDraft(question);
      setSettingsOpen(true);
      setError('connect_first');
      return;
    }
    const controller = new AbortController();
    active.current = controller;
    setDraft('');
    setError('');
    setPending(question);
    try {
      const messages = turns
        .slice(-3)
        .flatMap(({ question, reply }) => [
          { role: 'user', content: question },
          ...(reply.answer ? [{ role: 'assistant', content: reply.answer }] : []),
        ]);
      messages.push({ role: 'user', content: question });
      const response = await fetch('/api/rental-assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale, connection, messages, previousSearch: latestSearch(turns) }),
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.code || 'model_unavailable');
        setDraft(question);
        return;
      }
      addTurn({ question, reply: result });
    } catch {
      if (!controller.signal.aborted) setError('model_unavailable');
      setDraft(question);
    } finally {
      active.current = null;
      setPending('');
    }
  }

  function showReply(reply: ChatReply, index: number) {
    const anchor = 'qrent-source-' + index + '-';
    const text = reply.answer.replace(/\[([RG]\d+)\](?!\()/g, (match, id: string) =>
      reply.evidence.some(source => source.id === id) ? '[' + id + '](#' + anchor + id + ')' : match
    );
    return (
      <div className={styles.assistantTurn}>
        <p className={styles.replyName}>
          <MessageCircle size={15} aria-hidden="true" />
          {zh ? '小 Q 助手' : 'Little Q'}
        </p>
        <div className={styles.answer}>
          <ReactMarkdown
            allowedElements={[
              'p',
              'strong',
              'em',
              'ol',
              'ul',
              'li',
              'h2',
              'h3',
              'h4',
              'a',
              'blockquote',
              'code',
              'br',
              'hr',
            ]}
            unwrapDisallowed
            components={{
              a: ({ href, children }) =>
                href?.startsWith('#' + anchor) ? <a href={href}>{children}</a> : <>{children}</>,
            }}
          >
            {text || (zh ? '以下是本次查询的结果。' : 'Here are the results from this search.')}
          </ReactMarkdown>
        </div>
        {!!reply.evidence.length && (
          <RentalAssistantSources sources={reply.evidence} anchor={anchor} locale={locale} />
        )}
      </div>
    );
  }

  return (
    <Frame
      className={panel ? styles.assistantPage + ' ' + styles.assistantWindow : styles.assistantPage}
      data-clarity-mask="true"
    >
      {!panel && (
        <Link href={'/' + locale + '/search'} className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden="true" />
          {zh ? '返回房源搜索' : 'Back to rentals'}
        </Link>
      )}
      <header className={styles.assistantHeader}>
        <div>
          <Heading>
            <MessageCircle size={panel ? 21 : 28} aria-hidden="true" />
            {zh ? '小 Q 助手' : 'Little Q'}
          </Heading>
          {!panel && (
            <p>
              {zh
                ? 'QRent 的租房助手。可以比较周租、聊选区和看房，也能帮你准备租房申请。'
                : 'Your QRent rental assistant. Compare weekly rents, talk through your options, or get help with an application.'}
            </p>
          )}
        </div>
        <div className={styles.chatActions}>
          <button
            type="button"
            className={styles.settingsButton}
            aria-label={settingsLabel}
            aria-expanded={settingsOpen}
            aria-controls={settingsId}
            title={connectedName}
            onClick={() => setSettingsOpen(open => !open)}
          >
            <Settings2 size={16} aria-hidden="true" />
            <span>{settingsLabel}</span>
            {!panel && <ChevronDown size={15} aria-hidden="true" />}
          </button>
          {panel && (
            <>
              {!pending && (
                <Link
                  href={'/' + locale + '/assistant'}
                  className={styles.chatIcon}
                  aria-label={zh ? '展开完整对话' : 'Open full chat'}
                  onClick={onClose}
                >
                  <Maximize2 size={17} aria-hidden="true" />
                </Link>
              )}
              <button
                type="button"
                className={styles.chatIcon}
                aria-label={zh ? '收起小 Q 助手' : 'Close Little Q'}
                onClick={onClose}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </header>

      {settingsOpen && (
        <form ref={settings} id={settingsId} className={styles.settings} onSubmit={applySettings}>
          <h2>{zh ? '模型连接' : 'Model connection'}</h2>
          {defaultModelAvailable && (
            <label>
              <span>{zh ? '模型来源' : 'Model provider'}</span>
              <select
                value={connectionType}
                onChange={event =>
                  setConnectionType(event.target.value === 'local' ? 'local' : 'compatible')
                }
                disabled={!!pending}
              >
                <option value="local">{zh ? '默认模型' : 'Default model'}</option>
                <option value="compatible">
                  {zh ? '自带 API Key（OpenAI 兼容）' : 'Bring your own key (OpenAI-compatible)'}
                </option>
              </select>
            </label>
          )}
          {connectionType === 'compatible' && (
            <div className={styles.settingsFields}>
              <label>
                <span>{zh ? 'API 地址' : 'API base URL'}</span>
                <input
                  name="baseUrl"
                  type="url"
                  placeholder="https://api.example.com/v1"
                  required
                  maxLength={400}
                  defaultValue={connection?.type === 'compatible' ? connection.baseUrl : ''}
                  disabled={!!pending}
                />
              </label>
              <label>
                <span>{zh ? '模型名称' : 'Model name'}</span>
                <input
                  name="model"
                  placeholder={zh ? '支持工具调用的模型' : 'A model with tool calling'}
                  required
                  maxLength={150}
                  defaultValue={connection?.type === 'compatible' ? connection.model : ''}
                  disabled={!!pending}
                />
              </label>
              <label>
                <span>API Key</span>
                <input
                  name="apiKey"
                  type="password"
                  autoComplete="off"
                  placeholder={zh ? '输入你的 API Key' : 'Enter your API key'}
                  required
                  maxLength={1024}
                  disabled={!!pending}
                />
              </label>
            </div>
          )}
          <div className={styles.settingsFoot}>
            <p>
              {zh
                ? '对话和引用片段会发送给所选模型。Key 仅用于当前标签页的模型请求。切换模型会开启新对话。'
                : 'Messages and cited passages go to the selected model. The key is used for model requests in this tab. Switching models starts a new chat.'}
            </p>
            <button className={styles.primary} disabled={!!pending}>
              {zh ? '使用此模型' : 'Use this model'}
            </button>
          </div>
        </form>
      )}

      <section className={styles.chat} aria-label={zh ? '租房对话' : 'Rental chat'}>
        <div
          className={styles.conversation}
          ref={conversation}
          aria-live="polite"
          aria-relevant="additions"
        >
          {!turns.length && !pending ? (
            <div className={styles.starters}>
              <h2>{zh ? '你想找什么样的房子？' : 'What are you looking for?'}</h2>
              <p>
                {connection
                  ? zh
                    ? '告诉我你的学校、预算或租房问题，我们可以一起理清下一步。'
                    : 'Share a campus, a budget or a rental question, and we can work through your next step.'
                  : zh
                    ? '连接支持工具调用的 OpenAI 兼容模型，即可查房源、比较周租和问租房攻略。'
                    : 'Connect an OpenAI-compatible model with tool calling to compare rents and ask rental questions.'}
              </p>
              <ul>
                {suggestions.map((question, index) => (
                  <li key={question}>
                    <button type="button" onClick={() => void send(question)}>
                      {index === 1 ? (
                        <BookOpen size={17} aria-hidden="true" />
                      ) : (
                        <MapPin size={17} aria-hidden="true" />
                      )}
                      <span>{question}</span>
                      <ArrowRight size={15} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ol className={styles.thread}>
              {turns.map((turn, index) => (
                <li key={index}>
                  <p className={styles.userQuestion}>{turn.question}</p>
                  {showReply(turn.reply, index)}
                </li>
              ))}
              {pending && (
                <li>
                  <p className={styles.userQuestion}>{pending}</p>
                  <p className={styles.working} role="status">
                    <span aria-hidden="true" />
                    {zh ? '小 Q 正在组织回答…' : 'Little Q is preparing a reply…'}
                  </p>
                </li>
              )}
            </ol>
          )}
        </div>
        <form
          className={styles.composer}
          onSubmit={event => {
            event.preventDefault();
            void send(draft);
          }}
        >
          {error && (
            <p role="alert" className={styles.chatError}>
              {(errorMessages[error] ?? errorMessages.model_unavailable)[zh ? 0 : 1]}
            </p>
          )}
          <div className={styles.composerInput}>
            <textarea
              aria-label={zh ? '输入租房问题' : 'Enter a rental question'}
              placeholder={
                zh
                  ? '例如：UNSW 附近周租 850 以内的两房…'
                  : 'For example, two bedrooms near UNSW under $850/week…'
              }
              value={draft}
              onChange={event => setDraft(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  void send(draft);
                }
              }}
              rows={2}
              maxLength={1500}
              disabled={!!pending}
            />
            {pending ? (
              <button
                className={styles.settingsButton}
                type="button"
                onClick={() => active.current?.abort()}
              >
                {zh ? '停止' : 'Stop'}
              </button>
            ) : (
              <button
                className={styles.send}
                disabled={!draft.trim()}
                aria-label={zh ? '发送' : 'Send'}
              >
                <ArrowUp size={20} aria-hidden="true" />
              </button>
            )}
          </div>
          <div className={styles.composerFoot}>
            <span>
              {zh ? '房源与攻略来源为 QRent' : 'Listing and guide sources come from QRent'}
            </span>
            {!!turns.length && (
              <button
                type="button"
                disabled={!!pending}
                onClick={() => {
                  clearTurns();
                  setError('');
                }}
              >
                {zh ? '新对话' : 'New chat'}
              </button>
            )}
          </div>
        </form>
      </section>
    </Frame>
  );
}
