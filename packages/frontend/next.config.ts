import { config as dotenvConfig } from 'dotenv';
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
  // ✅ i18n：英文为默认（无前缀），中文使用 /zh 前缀
  i18n: {
    locales: ['en', 'zh'],
    defaultLocale: 'en',
    localeDetection: false,
  },

  eslint: { ignoreDuringBuilds: false },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api.dicebear.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  async redirects() {
    return [
      /** ========= 首选域名规范化（裸域 → www） ========= */
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'qrent.rent' }],
        destination: 'https://www.qrent.rent/:path*',
        permanent: true,
      },

      /** ========= 语言根路径处理 ========= */
      // 英文为默认语言：/en → /（去掉无意义的 en 前缀，保证英文规范 URL 唯一）
      { source: '/en', destination: '/', permanent: true },
      { source: '/en/:path*', destination: '/:path*', permanent: true },

      // 中文为前缀语言：保留 /zh 与 /zh/*（不要把 /zh 301 到 /）
      // 下面仅清理“确实不存在的中文历史路径”到对应中文有效页

      /** ========= 异常根路径字符（404 → 200） ========= */
      { source: '/$', destination: '/', permanent: true },
      { source: '/&', destination: '/', permanent: true },

      /** ========= 历史中文路径清理（目标必须在中文空间） ========= */
      { source: '/zh/findAHome', destination: '/zh/search', permanent: true },
      { source: '/zh/resourceCenter', destination: '/zh/blog', permanent: true },
      { source: '/zh/justLanded', destination: '/zh/blog', permanent: true },
      { source: '/zh/prepareDocuments', destination: '/zh/blog', permanent: true },
      // 如还有其他中文旧别名，按需继续加到 /zh/blog/xxx 或 /zh/search

      /** ========= 英文历史路径清理（英文为默认，无前缀） ========= */
      { source: '/en/prepareDocuments', destination: '/blog', permanent: true },
      { source: '/en/rentalGuide', destination: '/blog', permanent: true },
      { source: '/en/findAHome', destination: '/search', permanent: true },
      { source: '/en/justLanded', destination: '/blog', permanent: true },
      { source: '/en/contact', destination: '/contact', permanent: true },
      { source: '/en/blog', destination: '/blog', permanent: true },
      { source: '/en/blog/:slug*', destination: '/blog/:slug*', permanent: true },

      /** ========= 其他历史路径（中文为主域，但英文默认，仍归并到英文规范 URL） ========= */
      { source: '/rentalGuide', destination: '/blog', permanent: true },
      { source: '/prepareDocuments', destination: '/blog', permanent: true },
      { source: '/findAHome', destination: '/search', permanent: true },
      { source: '/resourceCenter', destination: '/blog', permanent: true },
      { source: '/blog/qrent-product-hunt', destination: '/blog', permanent: true },

      /** ========= 联系与杂项 ========= */
      // 你现在 /contact（英文）与 /zh/contact（中文）都存在：不做 301（保持 200 可索引）
      // Cloudflare 的 email-protection 垃圾路径，导向注册页以免 404
      { source: '/cdn-cgi/l/email-protection', destination: '/signup', permanent: true },

      /** ========= 邮箱样式路径统一到 /signup ========= */
      {
        source: '/:email([\\w.%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,})',
        destination: '/signup',
        permanent: true,
      },
      {
        source: '/zh/:email([\\w.%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,})',
        destination: '/signup',
        permanent: true,
      },

      /** ========= 规范化查询参数（重复网页 → 规范页） ========= */
      // 1) 去除 ?ref=xxx（首页）
      {
        source: '/',
        has: [{ type: 'query', key: 'ref' }],
        destination: '/',
        permanent: true,
      },
      // 2) 英文 search：/search?page=1 → /search
      {
        source: '/search',
        has: [{ type: 'query', key: 'page', value: '1' }],
        destination: '/search',
        permanent: true,
      },
      // 3) 英文 search：/search?university=USYD&page=1 → /search?university=USYD
      {
        source: '/search',
        has: [
          { type: 'query', key: 'page', value: '1' },
          { type: 'query', key: 'university' },
        ],
        destination: '/search?university=:university',
        permanent: true,
      },
      // 4) 中文 search 同步规范化
      {
        source: '/zh/search',
        has: [{ type: 'query', key: 'page', value: '1' }],
        destination: '/zh/search',
        permanent: true,
      },
      {
        source: '/zh/search',
        has: [
          { type: 'query', key: 'page', value: '1' },
          { type: 'query', key: 'university' },
        ],
        destination: '/zh/search?university=:university',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
