import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  robots: { index: true, follow: true, "max-image-preview": "large" },
  icons: { icon: { url: "/favicon.svg", type: "image/svg+xml" }, apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#0d0a17" };

// Hide reveal targets until the motion layer (public/assets/motion.js) runs, but never for long:
// if it hasn't started within 3 seconds, drop the class so the page shows as plain HTML.
const HB_JS =
  "document.documentElement.classList.add('hb-js');setTimeout(function(){if(!window.hbMotion)document.documentElement.classList.remove('hb-js')},3000)";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // hb-js is added before React hydrates, so the class list differs on purpose.
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preload" href="/assets/fonts/dm-sans-latin-var.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/assets/fonts/dm-serif-display-italic-latin.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/assets/fonts/SweetSansPro-Medium.woff2" as="font" type="font/woff2" crossOrigin="" />
        <script dangerouslySetInnerHTML={{ __html: HB_JS }} />
        {/* The motion layer (scroll reveals, hero swap, header, mobile menu, FAQ accordion), styled by
            app/motion.css. It's a plain deferred script on purpose: it runs as soon as the HTML is parsed,
            without waiting for React to load and hydrate, so above-the-fold reveals aren't delayed.
            It changes classes and attributes before hydration; those elements carry
            suppressHydrationWarning. /assets is cached for a year: bump ?v= after editing it. */}
        <script src="/assets/motion.js?v=6" defer />
      </head>
      <body>{children}</body>
    </html>
  );
}
