import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Chromium binary + puppeteer must stay as real node_modules (not bundled).
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core", "docxtemplater"],
  // Files read from disk at runtime by the document generators.
  // Keys are picomatch globs, so "[id]" would be a character class — match all API routes.
  outputFileTracingIncludes: {
    "/api/**": [
      "./templates/**",
      "./node_modules/@fontsource/{arimo,carlito,tinos,caladea}/files/*-latin-*.woff2",
      "./node_modules/@sparticuz/chromium/bin/**",
      "./node_modules/docx-preview/dist/docx-preview.min.js",
      "./node_modules/jszip/dist/jszip.min.js",
    ],
  },
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
