'use client';

import { useId, useState, type ReactNode } from 'react';
import { Check, Mail } from 'lucide-react';
import styles from '@/styles/rental-tools.module.css';

type State = 'idle' | 'sending' | 'saved' | 'invalid' | 'limited' | 'failed';

export default function RentalBetaSignup({
  locale,
  assistantAction,
}: {
  locale: string;
  assistantAction: ReactNode;
}) {
  const zh = locale === 'zh';
  const label = useId();
  const signupHint = useId();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>('idle');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === 'sending') return;
    setState('sending');
    try {
      const response = await fetch('/api/rental-alerts/interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale }),
      });
      if (response.status === 400) {
        setState('invalid');
        return;
      }
      if (response.status === 429) {
        setState('limited');
        return;
      }
      if (!response.ok || (await response.json()).status !== 'registered') throw new Error();
      setState('saved');
      setEmail('');
    } catch {
      setState('failed');
    }
  }

  const confirmed = state === 'saved';
  const notice =
    state === 'saved'
      ? zh
        ? '已报名，内测开放后我们会邮件联系你。'
        : 'You’re on the list. We’ll email you when the beta opens.'
      : state === 'limited'
        ? zh
          ? '请求过多，请稍后再试。'
          : 'Too many requests. Please try again later.'
        : state === 'invalid'
          ? zh
            ? '请输入有效的邮箱地址。'
            : 'Enter a valid email address.'
          : state === 'failed'
            ? zh
              ? '暂时无法登记，请重试。'
              : 'Could not save your email. Try again.'
            : '';

  return (
    <section className={styles.signup} aria-labelledby={label} data-clarity-mask="true">
      <div className={styles.signupIntro}>
        <span className={styles.mailIcon}>
          <Mail size={19} aria-hidden="true" />
        </span>
        <div>
          <div className={styles.signupTitle}>
            <h2 id={label}>
              {zh ? (
                <>
                  符合你条件的新房源，
                  <wbr />
                  直接发到邮箱
                </>
              ) : (
                'Matching new rentals, straight to your inbox'
              )}
            </h2>
            <span>{zh ? '内测招募' : 'Beta waitlist'}</span>
          </div>
          <p>
            {zh
              ? '内测开放后，Qrent 每天从 Realestate 和 Domain 筛选悉尼房源。有新房源符合你的预算、区域和入住时间，就邮件提醒你。'
              : 'When the beta opens, Qrent will check Realestate and Domain daily and email you when new Sydney rentals match your budget, preferred areas and move-in date.'}
          </p>
        </div>
      </div>
      <form onSubmit={submit} className={styles.signupForm}>
        <div className={styles.emailFields}>
          <input
            type="email"
            name="email"
            aria-label={zh ? '邮箱地址' : 'Email address'}
            aria-describedby={signupHint}
            autoComplete="email"
            placeholder={zh ? '输入邮箱地址' : 'Your email address'}
            value={email}
            onChange={event => {
              setEmail(event.target.value);
              if (state !== 'idle') setState('idle');
            }}
            maxLength={254}
            required
            disabled={state === 'sending'}
          />
          <button className={styles.primary} disabled={state === 'sending'}>
            {state === 'sending'
              ? zh
                ? '登记中…'
                : 'Saving…'
              : zh
                ? '报名内测'
                : 'Join the waitlist'}
          </button>
        </div>
        <p
          id={signupHint}
          role="status"
          className={styles.signupNotice}
          data-state={confirmed ? 'success' : state}
        >
          {confirmed && <Check size={14} aria-hidden="true" />}
          {notice ||
            (zh
              ? '开放后邮件邀请你设置筛选条件。'
              : 'We’ll invite you to set your filters when it opens.')}
        </p>
      </form>
      {assistantAction}
    </section>
  );
}
