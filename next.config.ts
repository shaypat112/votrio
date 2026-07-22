import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  logging: {
    browserToTerminal: "warn",
    fetches: { fullUrl: false },
  },
};

export default nextConfig;
