import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://escapement.vercel.app";
  const now = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/mint`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/lease`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
  ];
}
