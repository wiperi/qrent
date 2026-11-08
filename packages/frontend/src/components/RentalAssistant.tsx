'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useTransition } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Maximize2,
  MapPin,
  MessageCircle,
  Settings2,
  X,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { ChatReply } from '@/lib/rental-assistant/contracts';
import { modelPresets, modelProviders } from '@/lib/rental-assistant/presets';
import { useRentalSession, type RentalTurn } from '@/lib/rental-assistant/session';
import RentalAssistantSources from './RentalAssistantSources';
import styles from '@/styles/rental-tools.module.css';

function latestSearch(turns: RentalTurn[]) {
  const listingTurn = turns.findLast(
    turn => turn.reply.search || turn.reply.evidence.some(item => item.kind === 'listings')
  );
  if (listingTurn?.reply.search) return listingTurn.reply.search;
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
    '模型连接暂不可用，请重新选择模型并检查 Key。',
    'Choose your model again and check its key.',
  ],
  provider_key: [
    '模型服务拒绝了请求，请检查 API Key 和权限。',
    'The provider rejected the request. Check your key and permissions.',
  ],
  rate_limit: ['请求较多，请稍后再试。', 'Too many requests. Try again in a moment.'],
  invalid_key: ['请输入完整的 API Key。', 'Enter a valid API key.'],
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
  const router = useRouter();
  const [expanding, expand] = useTransition();
  const session = useRentalSession();
  const connection =
    session.connection ?? (defaultModelAvailable ? { type: 'local' as const } : null);
  const {
    turns,
    draft,
    settingsOpen,
    keyDraft,
    pending,
    error,
    request,
    showSettings,
    selectProvider,
    setKeyDraft,
    setDraft,
    setError,
    beginTurn,
    finishTurn,
    addTurn,
    clearTurns,
    setConnection,
  } = session;
  const provider =
    session.selectedProvider ??
    (connection?.type === 'preset'
      ? connection.provider
      : defaultModelAvailable
        ? 'local'
        : 'deepseek');
  const preset = provider === 'local' ? undefined : modelPresets[provider];
  const conversation = useRef<HTMLDivElement>(null);
  const settingsHeading = useRef<HTMLHeadingElement>(null);
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
    connection?.type === 'preset'
      ? modelPresets[connection.provider].label[locale]
      : connection?.type === 'compatible'
        ? connection.model
        : connection && (zh ? '默认模型' : 'Default model');
  const settingsLabel = settingsOpen
    ? zh
      ? '返回对话'
      : 'Back to chat'
    : connection
      ? zh
        ? '模型设置'
        : 'Model settings'
      : zh
        ? '连接模型'
        : 'Connect a model';

  useEffect(() => {
    if (settingsOpen) settingsHeading.current?.focus({ preventScroll: true });
  }, [settingsOpen]);

  useEffect(() => {
    const thread = conversation.current;
    const latest = thread?.querySelector(':scope > ol > li:last-child');
    if (thread && latest) {
      thread.scrollTop +=
        latest.getBoundingClientRect().top - thread.getBoundingClientRect().top - 12;
    }
  }, [turns, pending, settingsOpen]);

  function applySettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (provider === 'local') {
      setConnection({ type: 'local' });
      return;
    }
    const apiKey = keyDraft.trim();
    if (!/^[\x21-\x7e]{1,1024}$/.test(apiKey)) {
      setError('invalid_key');
      return;
    }
    setConnection({ type: 'preset', provider, apiKey });
  }

  async function send(value: string) {
    const question = value.trim();
    if (!question || pending) return;
    if (!connection) {
      setDraft(question);
      showSettings(true);
      return;
    }
    const controller = beginTurn(question);
    if (!controller) return;
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
      finishTurn();
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
          {zh ? '小 Q · AI 找房' : 'Little Q · AI Rentals'}
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
            {zh ? '小 Q · AI 找房' : 'Little Q · AI Rentals'}
          </Heading>
          {!panel && (
            <p>
              {zh
                ? 'Qrent 的租房助手。可以比较周租、聊选区和看房，也能帮你准备租房申请。'
                : 'Your Qrent rental assistant. Compare weekly rents, talk through your options, or get help with an application.'}
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
            title={connectedName || undefined}
            onClick={() => showSettings(!settingsOpen)}
          >
            {settingsOpen ? (
              <ArrowLeft size={16} aria-hidden="true" />
            ) : (
              <Settings2 size={16} aria-hidden="true" />
            )}
            <span>{settingsLabel}</span>
          </button>
          {panel && (
            <>
              <button
                type="button"
                className={styles.chatIcon}
                aria-label={zh ? '展开完整对话' : 'Open full chat'}
                title={expanding ? (zh ? '正在展开' : 'Opening chat') : undefined}
                aria-busy={expanding}
                disabled={expanding}
                onClick={() => expand(() => router.push('/' + locale + '/assistant'))}
              >
                <Maximize2 size={17} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={styles.chatIcon}
                aria-label={zh ? '收起小 Q' : 'Close Little Q'}
                onClick={onClose}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </header>

      {settingsOpen ? (
        <form id={settingsId} className={styles.settings} onSubmit={applySettings}>
          <h2 tabIndex={-1} ref={settingsHeading}>
            {zh ? '选择模型' : 'Choose a model'}
          </h2>
          <fieldset
            className={styles.providerOptions}
            aria-label={zh ? '选择模型' : 'Choose a model'}
          >
            {modelProviders.map(option => (
              <label key={option} className={styles.providerOption}>
                <input
                  type="radio"
                  name="provider"
                  value={option}
                  checked={provider === option}
                  onChange={() => selectProvider(option)}
                  disabled={!!pending}
                />
                <span>{modelPresets[option].label[locale]}</span>
              </label>
            ))}
            {defaultModelAvailable && (
              <label className={styles.providerOption}>
                <input
                  type="radio"
                  name="provider"
                  value="local"
                  checked={provider === 'local'}
                  onChange={() => selectProvider('local')}
                  disabled={!!pending}
                />
                <span>{zh ? '默认模型' : 'Default model'}</span>
              </label>
            )}
          </fieldset>
          {preset && (
            <label className={styles.modelKey}>
              <span>API Key</span>
              <input
                name="apiKey"
                type="password"
                autoComplete="off"
                placeholder={preset.keyLabel[locale]}
                required
                maxLength={1024}
                value={keyDraft}
                onChange={event => setKeyDraft(event.target.value)}
                disabled={!!pending}
              />
            </label>
          )}
          {error && (
            <p role="alert" className={styles.chatError}>
              {(errorMessages[error] ?? errorMessages.model_unavailable)[zh ? 0 : 1]}
            </p>
          )}
          <div className={styles.settingsFoot}>
            <p>
              {zh
                ? 'Key 仅用于当前标签页的模型请求。'
                : 'The key is used for model requests in this tab.'}
            </p>
            {preset && (
              <a href={preset.help} target="_blank" rel="noreferrer">
                {zh ? '如何获取 Key' : 'Get an API key'}
              </a>
            )}
          </div>
          <button className={styles.primary} disabled={!!pending}>
            {zh ? '连接并继续' : 'Connect and continue'}
          </button>
        </form>
      ) : (
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
                      ? '选一个模型，填入 Key，就能查房源、比较周租和问租房攻略。'
                      : 'Choose a model and enter its key to compare rents or ask a rental question.'}
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
                  onClick={() => request?.abort()}
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
                {zh ? '房源与攻略来源为 Qrent' : 'Listing and guide sources come from Qrent'}
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
      )}
    </Frame>
  );
}
