import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  serverExternalPackages: ["pg", "@electric-sql/pglite"],
  outputFileTracingRoot: process.cwd(),
  // `next build` renders pages in one worker per CPU it sees, and Render reports the whole host's CPUs, not the 0.5 this service has.
  // Each worker opens its own database connections, and Supabase's session pooler only allows ~15 in all (the live site holds some too),
  // so an unlucky host exhausts it mid-build. Two workers keep the build well under the limit.
  experimental: { cpus: 2, serverActions: { bodySizeLimit: "6mb" } },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
