'use client';

import { useAuth } from '@/hooks/use-auth';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import GoogleLoginButton from './GoogleLoginButton';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToSignup?: () => void;
}

export default function LoginForm({ onSuccess, onSwitchToSignup }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const t = useTranslations('Auth');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      onSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">
          {t('loginTitle')}
        </h2>

        {/* Google 登录按钮 */}
        <div className="mb-4">
          <GoogleLoginButton
            onSuccess={onSuccess}
            onError={(err) => setError(err)}
          />
        </div>

        {/* 分隔线 */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">或使用邮箱登录</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              {t('email')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('email')}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              {t('password')}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('password')}
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-2 rounded-md">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Loading...' : t('loginButton')}
          </button>
        </form>

        {onSwitchToSignup && (
          <p className="mt-4 text-center text-sm text-gray-600">
            {t('switchToSignup')}{' '}
            <button
              onClick={onSwitchToSignup}
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              {t('signupButton')}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}