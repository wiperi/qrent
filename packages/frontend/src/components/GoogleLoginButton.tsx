'use client';

import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/hooks/use-auth';

interface GoogleLoginButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function GoogleLoginButton({ onSuccess, onError }: GoogleLoginButtonProps) {
  const { googleLogin } = useAuth();

  return (
    <GoogleLogin
      onSuccess={async (credentialResponse) => {
        if (!credentialResponse.credential) {
          onError?.('No credential received from Google');
          return;
        }

        try {
          await googleLogin(credentialResponse.credential);
          onSuccess?.();
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Google login failed';
          onError?.(errorMessage);
        }
      }}
      onError={() => {
        onError?.('Google login failed');
      }}
      useOneTap={false}
      theme="outline"
      size="large"
      text="continue_with"
      width="100%"
    />
  );
}
