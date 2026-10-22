import type { NextConfig } from "next";

// In the Base44 preview the dev server is reached through the public proxy
// origin (https://3000-<suffix>), which Next blocks for dev assets/HMR unless
// it is allowed. Only applied when BASE44_PREVIEW_MODE === "1".
const previewOrigins =
  process.env.BASE44_PREVIEW_MODE === "1" && process.env.BASE44_PUBLIC_HOST_SUFFIX
    ? ["3000-" + process.env.BASE44_PUBLIC_HOST_SUFFIX]
    : [];

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: previewOrigins,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
