import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async redirects() {
    return [
      { source: "/", destination: "/landing", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/_next/static/chunks/:name.js",
        headers: [{ key: "Content-Type", value: "application/javascript" }],
      },
      {
        source: "/_next/static/chunks/:name.css",
        headers: [{ key: "Content-Type", value: "text/css" }],
      },
      {
        source: "/_next/static/media/:path*",
        headers: [{ key: "Content-Type", value: "font/woff2" }],
      },
    ];
  },
};

export default nextConfig;
