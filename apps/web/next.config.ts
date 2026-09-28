import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: ["@horune/design-system", "@horune/theme-schema", "@horune/theme-renderer", "@horune/theme-studio"],
  poweredByHeader: false
};

export default nextConfig;
