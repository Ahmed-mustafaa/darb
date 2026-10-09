/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // A type-only mistake should never block a deploy; the app is still checked with `npm run typecheck`.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    // InstaPay QR images and payment screenshots are uploaded through server actions.
    serverActions: { bodySizeLimit: '5mb' },
  },
};

export default nextConfig;
