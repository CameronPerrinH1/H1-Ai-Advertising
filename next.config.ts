import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The old static site served /book, /terms and /privacy without a trailing slash.
  trailingSlash: false,
  images: { unoptimized: true },
  experimental: {
    // The old pages carried their styles inline in the HTML. Inlining keeps it that way:
    // no extra render-blocking stylesheet request.
    inlineCss: true,
  },
  async redirects() {
    // The static site answered the .html addresses too (Vercel cleanUrls redirected them).
    return [
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/book.html", destination: "/book", permanent: true },
      { source: "/terms.html", destination: "/terms", permanent: true },
      { source: "/privacy.html", destination: "/privacy", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        // Fonts and images keep their names when unchanged; give a replaced file a new name.
        source: "/assets/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/:file(favicon.svg|apple-touch-icon.png|og-image.jpg)",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ];
  },
};

export default config;
