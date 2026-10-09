/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // InstaPay QR images and payment screenshots are uploaded through server actions.
    serverActions: { bodySizeLimit: '5mb' },
  },
};

export default nextConfig;
