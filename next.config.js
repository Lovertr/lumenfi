const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Edge-level redirects — guaranteed to fire before any function/middleware runs.
  // Belt-and-suspenders for routes that might not get a locale prefix from middleware.
  async redirects() {
    return [
      { source: '/login', destination: '/th/login', permanent: false },
      { source: '/signup', destination: '/th/signup', permanent: false },
      { source: '/dashboard', destination: '/th/dashboard', permanent: false },
      { source: '/accounts', destination: '/th/accounts', permanent: false },
      { source: '/accounts/:path*', destination: '/th/accounts/:path*', permanent: false },
      { source: '/transactions', destination: '/th/transactions', permanent: false },
      { source: '/transactions/:path*', destination: '/th/transactions/:path*', permanent: false },
      { source: '/debts', destination: '/th/debts', permanent: false },
      { source: '/investments', destination: '/th/investments', permanent: false },
      { source: '/goals', destination: '/th/goals', permanent: false },
      { source: '/ai', destination: '/th/ai', permanent: false },
      { source: '/settings', destination: '/th/settings', permanent: false },
      { source: '/settings/:path*', destination: '/th/settings/:path*', permanent: false },
      { source: '/more', destination: '/th/more', permanent: false },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
