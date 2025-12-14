'use client';

import { GoogleOAuthProvider } from '@react-oauth/google';
import { ReactNode } from 'react';

export function OAuthProvider({ children }: { children: ReactNode }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID;

  if (!clientId) {
    console.error('NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID is not configured');
    return <>{children}</>;
  }

  return <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>;
}
