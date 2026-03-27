import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/app/projects/:id/workspace",
        destination: "/app/projects/:id",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
