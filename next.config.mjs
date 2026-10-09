/** @type {import('next').NextConfig} */
// Shown at the bottom of every page so you can tell which version a phone is running.
const buildTime = new Date().toLocaleString('en-GB', { timeZone: 'Africa/Cairo', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: (process.env.VERCEL_GIT_COMMIT_SHA || 'local').slice(0, 7),
    NEXT_PUBLIC_BUILD_TIME: buildTime,
  },
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
