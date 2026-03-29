const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [{ source: '/onboarding', destination: '/feed', permanent: false }]
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  transpilePackages: [
    '@reown/appkit',
    '@reown/appkit-adapter-wagmi',
    '@reown/appkit-adapter-solana',
    '@wagmi/connectors',
    'wagmi',
    'viem',
    '@ffmpeg/ffmpeg',
    '@ffmpeg/util',
  ],
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, net: false, tls: false };
    config.resolve.alias = {
      ...config.resolve.alias,
      'porto/internal': false,
      'porto': false,
      '@wagmi/core': path.resolve(__dirname, 'node_modules/@wagmi/core'),
    };
    return config;
  },
}

module.exports = nextConfig
