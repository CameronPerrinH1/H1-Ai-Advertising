import type { Metadata } from "next";

export const SITE_URL = "https://h1aiadvertising.com";
const SITE_NAME = "H1 AI Advertising";

/** Title, description, canonical, Open Graph and Twitter tags for one page, as the static site had them. */
export function pageMetadata({ path, title, description }: { path: string; title: string; description: string }): Metadata {
  const url = SITE_URL + path;
  const image = { url: `${SITE_URL}/og-image.jpg`, width: 1200, height: 630, alt: "H1 AI Advertising: the MedSpa AI Booking Engine" };
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: SITE_NAME, locale: "en_US", url, title, description, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}
