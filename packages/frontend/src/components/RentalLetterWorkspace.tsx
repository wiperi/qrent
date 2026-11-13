'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Copy,
  Download,
  FilePenLine,
  FileText,
  HandHeart,
  Settings2,
} from 'lucide-react';
import { create } from 'zustand';
import { requestRentalAssistant } from '@/lib/rental-assistant/client-request';
import type {
  ChatReply,
  ModelConnection,
  RentalLetterType,
} from '@/lib/rental-assistant/contracts';
import {
  exampleLetter,
  rentalLetterForm,
  type RentalLetterForm,
} from '@/lib/rental-assistant/letter-workspace';
import { useRentalSession } from '@/lib/rental-assistant/session';
import RentalModelSettings, { rentalModelName } from './RentalModelSettings';
import styles from '@/styles/rental-letter-workspace.module.css';
import { letterFields } from './rental-letter-fields';

type Locale = 'zh' | 'en';
type Draft = { answer: string; language: Locale; sourcePreserved?: boolean; changed?: boolean };
type Letter = { fields: Record<string, string>; language: Locale; draft?: Draft };

// Retain the two forms and their drafts during in-tab navigation.
const blankLetter: Letter = { fields: {}, language: 'en' };
const useLetters = create<{
  letters: Record<RentalLetterType, Letter>;
  update: (type: RentalLetterType, fn: (letter: Letter) => Letter) => void;
}>(set => ({
  letters: { cover: blankLetter, parent: blankLetter },
  update: (type, fn) =>
    set(state => ({ letters: { ...state.letters, [type]: fn(state.letters[type]) } })),
}));

const titles = {
  cover: { zh: '租房申请信', en: 'Rental cover letter' },
  parent: { zh: '父母资助信', en: 'Parent support letter' },
};
const errorCopy: Record<string, [string, string]> = {
  invalid_request: [
    '请检查必填项和资助金额后重试。',
    'Check the required fields and the contribution amount.',
  ],
  invalid_connection: ['模型连接不可用，请检查设置。', 'Check your model connection.'],
  provider_key: [
    '模型服务拒绝了请求，请检查 API Key 和权限。',
    'The provider rejected the request. Check your key and permissions.',
  ],
  provider_limit: [
    '模型服务达到请求或额度上限，请稍后再试。',
    'The provider reached a request or quota limit. Try again later.',
  ],
  provider_model: [
    '模型服务拒绝了这次生成，请切换模型后重试。',
    'The provider rejected this draft request. Try another model.',
  ],
  rate_limit: ['请求较多，请稍后再试。', 'Too many requests. Try again in a moment.'],
  timeout: [
    '本次生成超时，资料已保留，可以重试。',
    'Drafting timed out. Your details are still here; try again.',
  ],
  history_unavailable: [
    '写信工具暂时不可用，请稍后再试。',
    'The letter tool is temporarily unavailable. Try again later.',
  ],
  model_unavailable: [
    '没能生成草稿，资料已保留，可以重试。',
    'Could not generate the draft. Your details are still here; try again.',
  ],
};

function Field({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: string;
  children: ReactNode;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldTitle}>
        {label}
        {optional && <span>{optional}</span>}
      </span>
      {children}
    </label>
  );
}

export default function RentalLetterWorkspace({
  type,
  locale,
}: {
  type: RentalLetterType;
  locale: Locale;
}) {
  const zh = locale === 'zh';
  const cover = type === 'cover';
  const letter = useLetters(state => state.letters[type]);
  const update = useLetters(state => state.update);
  const connection = useRentalSession(state => state.connection);
  const setConnection = useRentalSession(state => state.setConnection);
  const [settings, setSettings] = useState(false);
  const [pending, setPending] = useState(false);
  const [showSample, setShowSample] = useState(false);
  const [error, setError] = useState('');
  const [copyState, setCopyState] = useState<'ready' | 'copied' | 'error'>('ready');
  const preview = useRef<HTMLHeadingElement>(null);
  const settingsPanel = useRef<HTMLDivElement>(null);
  const settingsButton = useRef<HTMLButtonElement>(null);
  const request = useRef<AbortController | null>(null);
  const [queued, setQueued] = useState<RentalLetterForm | null>(null);
  const settingsId = useId();
  const formId = useId();
  const detailsId = useId();
  const previewId = useId();
  const errorId = useId();
  const lastDraft = letter.draft;
  const viewingDraft = Boolean(lastDraft && !showSample);
  const optional = zh ? '选填' : 'Optional';
  const base = '/' + locale;
  const guide =
    base +
    '/guides/application-documents' +
    (cover ? '#cover-letter' : '#parent-letter-and-history');

  useEffect(() => () => request.current?.abort(), []);

  function updateField(key: string, value: string) {
    setQueued(null);
    setError('');
    update(type, current => ({
      ...current,
      fields: { ...current.fields, [key]: value },
      draft: current.draft && { ...current.draft, changed: true },
    }));
  }

  function field(key: string) {
    const definition = letterFields[key];
    const options = definition.options;
    const required =
      definition.required || (key === 'amount' && letter.fields.amountKind === 'cap');
    const value = letter.fields[key] ?? options?.[0][0] ?? '';
    const onChange = (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => updateField(key, event.target.value);
    const textProps = {
      name: key,
      value,
      onChange,
      required,
      placeholder: definition.placeholder?.[locale],
      maxLength: definition.max ?? 280,
    };
    return (
      <Field
        label={definition.label[locale]}
        optional={required || definition.implicit ? undefined : optional}
      >
        {options ? (
          <span className={styles.select}>
            <select name={key} value={value} required={required} onChange={onChange}>
              {options.map(([value, title]) => (
                <option key={value} value={value}>
                  {title[locale]}
                </option>
              ))}
            </select>
            <ChevronDown size={15} aria-hidden="true" />
          </span>
        ) : definition.long ? (
          <textarea {...textProps} rows={2} />
        ) : (
          <input
            {...textProps}
            type="text"
            inputMode={definition.decimal ? 'decimal' : undefined}
            pattern={definition.decimal ? '[0-9]{1,8}([.][0-9]{1,2})?' : undefined}
            title={
              definition.decimal
                ? zh
                  ? '只填澳元数字，最多两位小数'
                  : 'Enter AUD as a number with up to two decimal places'
                : undefined
            }
          />
        )}
      </Field>
    );
  }

  function openSettings() {
    setSettings(true);
    requestAnimationFrame(() => settingsPanel.current?.scrollIntoView({ block: 'nearest' }));
  }

  async function draft(form: RentalLetterForm, model: ModelConnection) {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setError('');
    setCopyState('ready');
    try {
      const response = await requestRentalAssistant(
        model,
        {
          locale,
          messages: [{ role: 'user', content: 'Draft ' + type + ' letter' }],
          letterForm: form,
        },
        controller.signal
      );
      const result: ChatReply & { code?: string; sourcePreserved?: boolean } =
        await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok || !result.answer) {
        setError(result.code ?? 'model_unavailable');
        return;
      }
      update(type, current => ({
        ...current,
        draft: {
          answer: result.answer,
          language: form.language,
          sourcePreserved: result.sourcePreserved,
        },
      }));
      setShowSample(false);
      requestAnimationFrame(() => {
        preview.current?.focus({ preventScroll: true });
        preview.current?.scrollIntoView({ block: 'nearest' });
      });
    } catch {
      if (!controller.signal.aborted) setError('model_unavailable');
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setPending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const fields = Object.fromEntries(
      Object.entries(letter.fields).filter(([, value]) => value.trim())
    );
    const parsed = rentalLetterForm.safeParse({ ...fields, type, language: letter.language });
    if (!parsed.success) {
      setError('invalid_request');
      return;
    }
    if (!connection) {
      setQueued(parsed.data);
      openSettings();
      return;
    }
    void draft(parsed.data, connection);
  }

  function saveModel(model: ModelConnection) {
    setConnection(model, true);
    setSettings(false);
    const form = queued;
    setQueued(null);
    if (form) void draft(form, model);
    else settingsButton.current?.focus();
  }

  function cancelDraft() {
    request.current?.abort();
    setPending(false);
  }

  async function copy() {
    if (!lastDraft?.answer) return;
    try {
      await navigator.clipboard.writeText(lastDraft.answer);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
  }

  function download() {
    if (!lastDraft?.answer) return;
    const url = URL.createObjectURL(
      new Blob([lastDraft.answer], { type: 'text/plain;charset=utf-8' })
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `qrent-${type}-letter.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const label = titles[type][locale];
  const modelName = rentalModelName(connection, locale);
  const previewLanguage = viewingDraft ? lastDraft!.language : letter.language;
  return (
    <main className={styles.workspace} data-clarity-mask="true">
      <div className={styles.container}>
        <Link className={styles.back} href={base + '/assistant'}>
          <ArrowLeft size={16} aria-hidden="true" />
          {zh ? '返回小 Q' : 'Back to Little Q'}
        </Link>

        <header className={styles.header}>
          <div>
            <h1>{label}</h1>
            <p>
              {cover
                ? zh
                  ? '把你的租房经历、资金来源和入住计划写成一封给中介的信。'
                  : 'Turn your rental history, funding and move-in plans into a letter for the agent.'
                : zh
                  ? '由家长说明资助哪些费用、金额和期限。'
                  : 'Help a parent explain which expenses they can cover, how much and for how long.'}
            </p>
          </div>
          <button
            ref={settingsButton}
            className={styles.modelButton}
            type="button"
            aria-expanded={settings}
            aria-controls={settingsId}
            disabled={pending}
            onClick={() => {
              if (settings) {
                setQueued(null);
                setSettings(false);
              } else openSettings();
            }}
          >
            <Settings2 size={17} aria-hidden="true" />
            {modelName ? (
              <>
                <span>{modelName}</span>
                <span className={styles.modelAction}>{zh ? '模型设置' : 'Model settings'}</span>
              </>
            ) : zh ? (
              '连接模型'
            ) : (
              'Connect a model'
            )}
          </button>
        </header>

        <div className={styles.settingsPanel} ref={settingsPanel} hidden={!settings}>
          {settings && (
            <RentalModelSettings
              id={settingsId}
              locale={locale}
              connection={connection}
              preferredProvider="qwen"
              onSave={saveModel}
            />
          )}
        </div>

        <nav className={styles.tabs} aria-label={zh ? '选择信件类型' : 'Letter type'}>
          {(['cover', 'parent'] as const).map(kind => {
            const Icon = kind === 'cover' ? FilePenLine : HandHeart;
            return (
              <Link
                key={kind}
                href={base + '/assistant/letters/' + kind}
                aria-current={kind === type ? 'page' : undefined}
              >
                <Icon size={17} aria-hidden="true" />
                {titles[kind][locale]}
              </Link>
            );
          })}
        </nav>

        <div className={styles.desk}>
          <section id={detailsId} className={styles.details} aria-labelledby={formId}>
            <header className={styles.panelHeader}>
              <div>
                <h2 id={formId}>{zh ? '填写资料' : 'Letter details'}</h2>
                <p>{zh ? '选填项可以留空。' : 'Leave any optional fields blank.'}</p>
              </div>
              <a href={'#' + previewId} className={styles.jump}>
                {zh ? '查看预览' : 'Preview'} <ArrowRight size={15} aria-hidden="true" />
              </a>
            </header>
            <form onSubmit={submit} aria-describedby={error ? errorId : undefined}>
              <fieldset className={styles.formFields} disabled={pending}>
                <legend className={styles.visuallyHidden}>{label}</legend>
                <div className={styles.section}>
                  <h3>
                    {cover
                      ? zh
                        ? '申请人和房源'
                        : 'Applicant and property'
                      : zh
                        ? '申请人和资助人'
                        : 'Applicant and parent'}
                  </h3>
                  <div className={styles.fieldPair}>
                    {field('applicant')}
                    {field(cover ? 'property' : 'parent')}
                  </div>
                  <div className={styles.fieldPair}>
                    {field(cover ? 'agent' : 'relationship')}
                    {field(cover ? 'study' : 'agent')}
                  </div>
                </div>

                <div className={styles.section}>
                  <h3>
                    {cover
                      ? zh
                        ? '租住计划与申请材料'
                        : 'Tenancy and supporting details'
                      : zh
                        ? '资助范围'
                        : 'Support details'}
                  </h3>
                  {cover ? (
                    <>
                      <div className={styles.fieldPair}>
                        {field('localHistory')}
                        {field('terms')}
                      </div>
                      {field('history')}
                      {field('funding')}
                    </>
                  ) : (
                    <>
                      {field('expenses')}
                      <div className={styles.fieldPair}>
                        {field('amount')}
                        {field('amountKind')}
                      </div>
                      <div className={styles.fieldPair}>
                        {field('frequency')}
                        {field('duration')}
                      </div>
                      {field('contact')}
                    </>
                  )}
                  <details className={styles.additional}>
                    <summary>
                      {cover
                        ? zh
                          ? '补充同住人或证明材料'
                          : 'Add co-applicants or supporting documents'
                        : zh
                          ? '补充房源地址或资助证明'
                          : 'Add property address or proof of support'}
                      <ChevronDown size={15} aria-hidden="true" />
                    </summary>
                    <div>
                      {field(cover ? 'household' : 'property')}
                      {field(cover ? 'references' : 'proof')}
                    </div>
                  </details>
                </div>

                <div className={styles.formFooter}>
                  <Field label={zh ? '成稿语言' : 'Draft language'}>
                    <span className={styles.select}>
                      <select
                        name="language"
                        value={letter.language}
                        onChange={event => {
                          setQueued(null);
                          const language = event.target.value === 'zh' ? 'zh' : 'en';
                          update(type, current => ({
                            ...current,
                            language,
                            draft: current.draft && { ...current.draft, changed: true },
                          }));
                        }}
                      >
                        <option value="en">{zh ? '英文' : 'English'}</option>
                        <option value="zh">{zh ? '简体中文' : 'Simplified Chinese'}</option>
                      </select>
                      <ChevronDown size={15} aria-hidden="true" />
                    </span>
                  </Field>
                  <button type="submit" className={styles.generate} disabled={pending}>
                    {pending
                      ? zh
                        ? '正在起草…'
                        : 'Drafting…'
                      : lastDraft
                        ? zh
                          ? '重新生成草稿'
                          : 'Regenerate draft'
                        : zh
                          ? '生成草稿'
                          : 'Generate draft'}
                    <ArrowRight size={18} aria-hidden="true" />
                  </button>
                </div>
              </fieldset>
              {pending && (
                <p className={styles.progress} role="status">
                  {zh ? '正在生成草稿。' : 'Generating your draft.'}
                  <button type="button" onClick={cancelDraft}>
                    {zh ? '停止生成' : 'Stop generating'}
                  </button>
                </p>
              )}
              {error && (
                <p id={errorId} className={styles.error} role="alert">
                  {(errorCopy[error] ?? errorCopy.model_unavailable)[zh ? 0 : 1]}
                  {['invalid_connection', 'provider_key', 'provider_model'].includes(error) && (
                    <button type="button" onClick={openSettings}>
                      {zh ? '检查模型设置' : 'Check model settings'}
                    </button>
                  )}
                </p>
              )}
              {!pending && settings && queued && (
                <p className={styles.progress} role="status">
                  {zh
                    ? '连接模型后会继续生成，已填写的资料会保留。'
                    : 'Your details are saved here. The draft will start after you connect.'}
                </p>
              )}
              <p className={styles.privacy}>
                {zh
                  ? '写信资料和草稿不进入小 Q 的问答记录。'
                  : 'Letter details and drafts stay out of Little Q’s chat history.'}
              </p>
            </form>
          </section>

          <section id={previewId} className={styles.preview} aria-labelledby={previewId + '-title'}>
            <header className={styles.previewHeader}>
              <div>
                <h2 id={previewId + '-title'} ref={preview} tabIndex={-1}>
                  {zh ? '信件预览' : 'Letter preview'}
                </h2>
                <p>
                  {viewingDraft
                    ? lastDraft?.changed
                      ? zh
                        ? '资料已更改。重新生成后会更新草稿。'
                        : 'Details changed. Generate again to update this draft.'
                      : zh
                        ? '可直接编辑正文，复制的是编辑后的版本。'
                        : 'Edit the letter directly. Copy uses your edited text.'
                    : zh
                      ? '这是使用虚构资料的范例。'
                      : 'This example uses fictional details.'}
                </p>
              </div>
              {lastDraft && (
                <button
                  type="button"
                  className={styles.textButton}
                  onClick={() => setShowSample(value => !value)}
                >
                  {showSample
                    ? zh
                      ? '返回草稿'
                      : 'Back to draft'
                    : zh
                      ? '查看范例'
                      : 'View example'}
                </button>
              )}
            </header>

            <div className={styles.paper}>
              <div className={styles.paperHeader}>
                <FileText size={19} aria-hidden="true" />
                <div>
                  <p>{label}</p>
                  <span>{previewLanguage === 'en' ? 'English' : '简体中文'}</span>
                </div>
              </div>
              {viewingDraft && lastDraft ? (
                <textarea
                  className={styles.letterBody}
                  aria-label={zh ? '编辑信件正文' : 'Edit letter text'}
                  lang={previewLanguage}
                  spellCheck
                  rows={13}
                  value={lastDraft.answer}
                  onChange={event => {
                    const answer = event.target.value;
                    setCopyState('ready');
                    update(type, current => ({
                      ...current,
                      draft: current.draft && { ...current.draft, answer },
                    }));
                  }}
                />
              ) : (
                <div className={styles.sample} lang={previewLanguage}>
                  {exampleLetter(type, previewLanguage)}
                </div>
              )}
            </div>

            {viewingDraft && lastDraft && (
              <div className={styles.output}>
                {lastDraft.sourcePreserved && (
                  <p>
                    {zh
                      ? '草稿保留了部分原文，请核对语言和表述。'
                      : 'Some original wording was kept. Review the language and phrasing.'}
                  </p>
                )}
                {/\[(?:房源地址|property address)\]/.test(lastDraft.answer) && (
                  <p>
                    {zh
                      ? '发送前，请把正文中的房源地址占位符替换成实际地址。'
                      : 'Replace the property address placeholder before sending.'}
                  </p>
                )}
                <div className={styles.outputActions}>
                  <button
                    type="button"
                    onClick={() => void copy()}
                    disabled={!lastDraft.answer.trim()}
                  >
                    {copyState === 'copied' ? (
                      <Check size={16} aria-hidden="true" />
                    ) : (
                      <Copy size={16} aria-hidden="true" />
                    )}
                    {copyState === 'copied'
                      ? zh
                        ? '已复制'
                        : 'Copied'
                      : zh
                        ? '复制正文'
                        : 'Copy letter'}
                  </button>
                  <button type="button" onClick={download} disabled={!lastDraft.answer.trim()}>
                    <Download size={16} aria-hidden="true" />
                    {zh ? '下载 TXT' : 'Download TXT'}
                  </button>
                </div>
                <span
                  role="status"
                  className={copyState === 'error' ? styles.error : styles.visuallyHidden}
                >
                  {copyState === 'copied'
                    ? zh
                      ? '信件正文已复制。'
                      : 'Letter copied.'
                    : copyState === 'error'
                      ? zh
                        ? '无法访问剪贴板，可以手动选择正文复制。'
                        : 'Clipboard unavailable. Select the letter text to copy it.'
                      : ''}
                </span>
              </div>
            )}

            <footer className={styles.sources}>
              <a href={'#' + detailsId} className={styles.returnToDetails}>
                <ArrowLeft size={14} aria-hidden="true" /> {zh ? '返回填写' : 'Back to details'}
              </a>
              <Link href={guide}>
                {zh ? '申请材料指南' : 'Application document guide'}{' '}
                <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
              {cover && (
                <Link href={base + '/blog/available-date-rental-cover-letter'}>
                  {zh ? 'Cover Letter 案例' : 'Cover letter walkthrough'}{' '}
                  <ArrowUpRight size={14} aria-hidden="true" />
                </Link>
              )}
            </footer>
          </section>
        </div>
      </div>
    </main>
  );
}
