/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    serverComponentsExternalPackages: ["puppeteer", "puppeteer-core", "html-to-docx", "docx"],
  },
};

export default nextConfig;
