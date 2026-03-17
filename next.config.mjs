/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      'ws',
      '@prisma/client',
      '@prisma/adapter-neon',
      '@neondatabase/serverless',
    ],
  },
};

export default nextConfig;
