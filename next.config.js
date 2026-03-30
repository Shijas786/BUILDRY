const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [{ source: '/onboarding', destination: '/feed', permanent: false }]
  },
  /**
   * When `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` is your real site (e.g. buildry.in), the SDK uses
   * `https://buildry.in/__/auth/handler`. Proxy those paths to `*.firebaseapp.com` so OAuth shows
   * your domain while Firebase still serves the handler + `__/firebase/init.json`.
   */
  async rewrites() {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    if (!projectId) return []
    const host = `${projectId}.firebaseapp.com`
    return [
      { source: '/__/auth/:path*', destination: `https://${host}/__/auth/:path*` },
      { source: '/__/firebase/:path*', destination: `https://${host}/__/firebase/:path*` },
    ]
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
