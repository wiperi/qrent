/**
 * Next.js 配置文件
 *
 * 此文件配置 Next.js 应用程序，包括：
 * - 从多个 .env 文件加载环境变量（根目录和本地）
 * - Next-intl 插件用于国际化
 * - 外部域名的图片优化设置（Notion CDN）
 * - ESLint 配置
 * - Turbopack 用于开发环境
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
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
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
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default withNextIntl(nextConfig);
