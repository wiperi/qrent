'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { ModelConnection } from '@/lib/rental-assistant/contracts';
import { modelPresets, modelProviders, type ModelProvider } from '@/lib/rental-assistant/presets';
import styles from '@/styles/rental-tools.module.css';

export function rentalModelName(
  connection: ModelConnection | null | undefined,
  locale: 'zh' | 'en'
) {
  return connection?.type === 'preset'
    ? modelPresets[connection.provider].label[locale]
    : connection?.type === 'compatible'
      ? connection.model
      : connection
        ? locale === 'zh'
          ? '默认模型'
          : 'Default model'
        : undefined;
}

export default function RentalModelSettings({
  id,
  locale,
  connection,
  defaultModelAvailable = false,
  preferredProvider = 'deepseek',
  pending = false,
  error,
  onSave,
}: {
  id: string;
  locale: 'zh' | 'en';
  connection?: ModelConnection | null;
  defaultModelAvailable?: boolean;
  preferredProvider?: ModelProvider;
  pending?: boolean;
  error?: string;
  onSave: (connection: ModelConnection) => void;
}) {
  const zh = locale === 'zh';
  const name = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const [provider, setProvider] = useState<ModelProvider | 'local'>(
    connection?.type === 'preset'
      ? connection.provider
      : defaultModelAvailable
        ? 'local'
        : preferredProvider
  );
  const [key, setKey] = useState('');
  const [invalidKey, setInvalidKey] = useState(false);
  const [changed, setChanged] = useState(false);
  const preset = provider === 'local' ? undefined : modelPresets[provider];

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);

  function select(option: ModelProvider | 'local') {
    setProvider(option);
    setKey('');
    setInvalidKey(false);
    setChanged(true);
  }

  return (
    <form
      id={id}
      className={styles.settings}
      onSubmit={event => {
        event.preventDefault();
        if (pending) return;
        if (provider === 'local') {
          onSave({ type: 'local' });
          return;
        }
        const apiKey = key.trim();
        if (!/^[\x21-\x7e]{1,1024}$/.test(apiKey)) {
          setInvalidKey(true);
          return;
        }
        onSave({ type: 'preset', provider, apiKey });
      }}
    >
      <h2 tabIndex={-1} ref={heading}>
        {zh ? '选择模型' : 'Choose a model'}
      </h2>
      <fieldset className={styles.providerOptions} aria-label={zh ? '选择模型' : 'Choose a model'}>
        {modelProviders.map(option => (
          <label key={option} className={styles.providerOption}>
            <input
              type="radio"
              name={name}
              value={option}
              checked={provider === option}
              onChange={() => select(option)}
              disabled={pending}
            />
            <span>{modelPresets[option].label[locale]}</span>
          </label>
        ))}
        {defaultModelAvailable && (
          <label className={styles.providerOption}>
            <input
              type="radio"
              name={name}
              value="local"
              checked={provider === 'local'}
              onChange={() => select('local')}
              disabled={pending}
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
            value={key}
            onChange={event => {
              setKey(event.target.value);
              setInvalidKey(false);
              setChanged(true);
            }}
            disabled={pending}
          />
        </label>
      )}
      {(invalidKey || (error && !changed)) && (
        <p role="alert" className={styles.chatError}>
          {invalidKey ? (zh ? '请输入完整的 API Key。' : 'Enter a valid API key.') : error}
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
      <button className={styles.primary} disabled={pending}>
        {zh ? '连接并继续' : 'Connect and continue'}
      </button>
    </form>
  );
}
