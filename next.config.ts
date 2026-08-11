import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Temporarily disabled reactCompiler for Hostinger compatibility
  // reactCompiler: true,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
