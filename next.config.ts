import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/app/projects",
        destination: "/app/sessoes",
        permanent: false,
      },
      {
        source: "/app/projects/:id",
        destination: "/app/sessoes/:id",
        permanent: false,
      },
      {
        source: "/app/projects/:id/workspace",
        destination: "/app/sessoes/:id",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
