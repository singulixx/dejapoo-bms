/** @type {import("next").NextConfig} */
const nextConfig = {
  // Workaround for occasional Vercel tracing failures (ENOENT on
  // "*_client-reference-manifest.js" under .next/server/app/...).
  // Disabling output file tracing prevents the deployment build from
  // aborting during the trace step.
  outputFileTracing: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        port: ""
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: ""
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        port: ""
      },
      {
        protocol: "https",
        hostname: "pub-b7fd9c30cdbf439183b75041f5f71b92.r2.dev",
        port: ""
      }
    ]
  }
};

export default nextConfig;
