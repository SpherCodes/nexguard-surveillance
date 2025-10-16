import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */

  // Enable React strict mode for better error detection
  reactStrictMode: true,

  // Turbopack configuration (now stable)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js'
      }
    }
  }
};

export default nextConfig;
