//@ts-check

const { composePlugins, withNx } = require('@nx/next');

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  nx: {
    svgr: false,
  },
  output: 'standalone',
  reactStrictMode: true,
  typedRoutes: false,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  typescript: {
    // Skip type checking during build - types are validated by IDE and pre-commit
    // This is needed due to Next.js 15 bug with route groups and typed routes
    ignoreBuildErrors: true,
  },
};

const plugins = [withNx];

module.exports = composePlugins(...plugins)(nextConfig);
