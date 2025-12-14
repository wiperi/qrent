'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import GoogleLoginButton from './GoogleLoginButton';

interface LoginFormProps {
  onSuccess?: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [error, setError] = useState('');
  const t = useTranslations('Auth');

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">
          {t('loginTitle')}
        </h2>

        <p className="text-center text-gray-600 mb-6">
          Sign in with your Google account to continue
        </p>

        {/* Google 登录按钮 */}
        <GoogleLoginButton
          onSuccess={onSuccess}
          onError={(err) => setError(err)}
        />

        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-2 rounded-md mt-4">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}