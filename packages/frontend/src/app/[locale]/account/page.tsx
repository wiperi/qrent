'use client';

import { useAuth } from '@/hooks/use-auth';
import { showLoginModal } from '@/lib/auth-events';
import { useTRPC } from '@/lib/trpc';
import { readAuthToken } from '@/lib/auth-storage';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

export default function Account() {
  const { user, token, isLoading, hasSessionError, refreshUser } = useAuth();
  const t = useTranslations('Account');
  const trpc = useTRPC();
  const capabilities = useQuery(trpc.auth.capabilities.queryOptions());
  const send = useMutation(trpc.auth.sendVerificationEmail.mutationOptions());
  const verify = useMutation(trpc.auth.verifyEmail.mutationOptions());
  const [code, setCode] = useState('');
  const [remaining, setRemaining] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setCode('');
    setMessage('');
    setError('');
    setRemaining(0);
  }, [user?.id]);

  useEffect(() => {
    if (!remaining) return;
    const timer = window.setTimeout(() => setRemaining(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [remaining]);

  const sendCode = async () => {
    setError('');
    setMessage('');
    try {
      await send.mutateAsync();
      if (readAuthToken() !== token) return;
      setRemaining(capabilities.data?.verificationResendSeconds || 60);
      setMessage(t('sent'));
    } catch {
      if (readAuthToken() !== token) return;
      setError(t('sendFailed'));
    }
  };

  const verifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !/^\d{6}$/.test(code)) return;
    setError('');
    setMessage('');
    try {
      await verify.mutateAsync({ email: user.email, code: Number(code) });
      if (readAuthToken() !== token) return;
      await refreshUser();
      if (readAuthToken() !== token) return;
      setCode('');
      setMessage(t('verifiedSuccess'));
    } catch {
      if (readAuthToken() !== token) return;
      setError(t('verifyFailed'));
    }
  };

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10 sm:py-14">
      <h1 className="text-3xl font-bold text-slate-900">{t('title')}</h1>
      <p className="mt-2 text-slate-600">{t('description')}</p>
      <section
        className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"
        aria-busy={isLoading}
      >
        {isLoading ? (
          <p role="status">{t('loading')}</p>
        ) : hasSessionError ? (
          <div>
            <p role="alert">{t('sessionFailed')}</p>
            <button
              type="button"
              onClick={() => void refreshUser()}
              className="mt-4 text-blue-700 underline"
            >
              {t('retry')}
            </button>
          </div>
        ) : !user ? (
          <div>
            <p>{t('loginRequired')}</p>
            <button
              type="button"
              onClick={showLoginModal}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white"
            >
              {t('login')}
            </button>
          </div>
        ) : (
          <>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-slate-500">{t('name')}</dt>
                <dd className="mt-1 break-words font-medium text-slate-900">{user.name}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500">{t('email')}</dt>
                <dd className="mt-1 break-all font-medium text-slate-900">{user.email}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500">{t('status')}</dt>
                <dd
                  className={`mt-1 font-medium ${user.emailVerified ? 'text-green-700' : 'text-amber-700'}`}
                >
                  {t(user.emailVerified ? 'verified' : 'unverified')}
                </dd>
              </div>
            </dl>
            {!user.emailVerified && (
              <div className="mt-6 border-t border-slate-200 pt-5">
                <h2 className="font-semibold text-slate-900">{t('verifyTitle')}</h2>
                {capabilities.isPending ? (
                  <p className="mt-2 text-sm text-slate-600">{t('loading')}</p>
                ) : !capabilities.data?.emailVerification ? (
                  <p className="mt-2 text-sm text-slate-600">{t('mailUnavailable')}</p>
                ) : (
                  <>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {t('verifyDescription')}
                    </p>
                    <button
                      type="button"
                      onClick={() => void sendCode()}
                      disabled={send.isPending || verify.isPending || remaining > 0}
                      className="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 disabled:opacity-50"
                    >
                      {send.isPending
                        ? t('sending')
                        : remaining > 0
                          ? t('resendIn', { seconds: remaining })
                          : t('sendCode')}
                    </button>
                  </>
                )}
                <form onSubmit={verifyCode} className="mt-4 space-y-3">
                  <label
                    htmlFor="verification-code"
                    className="block text-sm font-medium text-slate-700"
                  >
                    {t('code')}
                  </label>
                  <input
                    id="verification-code"
                    value={code}
                    onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 tracking-widest"
                  />
                  <button
                    type="submit"
                    disabled={verify.isPending || send.isPending || code.length !== 6}
                    className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
                  >
                    {verify.isPending ? t('verifying') : t('verify')}
                  </button>
                </form>
              </div>
            )}
            {message && (
              <p role="status" className="mt-4 text-sm leading-6 text-green-700">
                {message}
              </p>
            )}
            {error && (
              <p role="alert" className="mt-4 text-sm leading-6 text-red-700">
                {error}
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
}
