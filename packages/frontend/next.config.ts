import { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  async rewrites() {
    console.log('!!!!!!!!!!!!!!!!!!!!!!!Rewrites function is being called!');
    return [
      {
        source: '/api/:path*',
        destination: 'http://134.175.168.147:5000/api/:path*',
      },
      {
        source: '/:locale?/auth/login',
        destination: 'http://139.180.164.78:3201/auth/login',
      },
      {
        source: '/:locale?/auth/register',
        destination: 'http://139.180.164.78:3201/auth/register',
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
