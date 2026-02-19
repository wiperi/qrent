/**
 * Next.js config for the frontend app.
 *
 * Responsibilities:
 * - Load environment variables for local/dev builds
 * - Apply next-intl plugin wiring
 * - Configure Turbopack root + remote image patterns
 */
import { config as dotenvConfig } from 'dotenv';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { join } from 'path';

// Load .env files
console.log('🔄 Loading environment variables...');

// Load root .env file
dotenvConfig({ path: join(__dirname, '../../.env') });

// Load local .env.local file (for Notion configuration)
dotenvConfig({ path: join(__dirname, '.env.local') });

if (process.env.NODE_ENV === 'development') {
  console.log('🌐 Backend URL:', process.env.NEXT_PUBLIC_BACKEND_URL);
  console.log('🔗 Notion Token:', process.env.NOTION_TOKEN ? '✅ Set' : '❌ Not set');
  console.log('🗃️ Notion Database ID:', process.env.NOTION_DATABASE_ID ? '✅ Set' : '❌ Not set');
}

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

const nextConfig: NextConfig = {
  // Fix incorrect workspace root inference when multiple lockfiles exist on the machine.
  turbopack: {
    // In a pnpm workspace the real `node_modules` usually lives at the repo root,
    // so Turbopack must be allowed to read outside `packages/frontend`.
    root: join(__dirname, '../..'),
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.domainstatic.com.au',
      },
      {
        protocol: 'https',
        hostname: 'prod-files-secure.s3.us-west-2.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'www.notion.so',
      },
      {
        protocol: 'https',
        hostname: '**.reastatic.net',
      },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default withNextIntl(nextConfig);
