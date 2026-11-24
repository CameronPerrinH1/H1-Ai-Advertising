import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// lastModified is when each page's content last changed. Update it with the content.
const PAGES: [path: string, lastModified: string][] = [
  ["/", "2026-11-17"],
  ["/book", "2026-11-17"],
  ["/terms", "2026-11-17"],
  ["/privacy", "2026-11-17"],
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map(([path, lastModified]) => ({ url: SITE_URL + path, lastModified }));
}
