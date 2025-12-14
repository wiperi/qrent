'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import GoogleLoginButton from './GoogleLoginButton';

interface SignupFormProps {
  onSuccess?: () => void;
}

export default function SignupForm({ onSuccess }: SignupFormProps) {
  const [error, setError] = useState('');
  const t = useTranslations('Auth');

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="shadow-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">{t('signupTitle')}</CardTitle>
        </CardHeader>

        <CardContent>
          <p className="text-center text-gray-600 mb-6">
            Sign up with your Google account to get started
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
        </CardContent>
      </Card>
    </div>
  );
}