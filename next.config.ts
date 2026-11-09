import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    // Baseline hardening found missing by the 2026-11-09 production scan (1 of 6
    // headers present). The CSP restricts only framing, plugins, <base> and form
    // targets so it cannot break scripts, styles or images.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'; upgrade-insecure-requests",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
