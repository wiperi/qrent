import type { NextConfig } from 'next';
import { config as dotenvConfig } from 'dotenv';
import { join } from 'path';

// Load .env in development environment
if (process.env.NODE_ENV === 'development') {
  console.log('🔄 Loading:', join(__dirname, '../../.env'));
  dotenvConfig({ path: join(__dirname, '../../.env') });
  console.log('🌐 Backend URL:', process.env.NEXT_PUBLIC_BACKEND_URL);
}

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
