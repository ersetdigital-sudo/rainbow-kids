import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://rainbowkids.id";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: "", priority: 1, freq: "daily" as const },
    { path: "/sales", priority: 0.9, freq: "daily" as const },
    { path: "/ar", priority: 0.9, freq: "daily" as const },
    { path: "/stock", priority: 0.9, freq: "daily" as const },
    { path: "/purchases", priority: 0.8, freq: "weekly" as const },
    { path: "/opname", priority: 0.7, freq: "weekly" as const },
    { path: "/reports", priority: 0.8, freq: "weekly" as const },
    { path: "/history", priority: 0.8, freq: "weekly" as const },
    { path: "/approvals", priority: 0.7, freq: "weekly" as const },
    { path: "/invoice", priority: 0.7, freq: "weekly" as const },
    { path: "/users", priority: 0.5, freq: "monthly" as const },
  ];

  return routes.map((r) => ({
    url: `${base}${r.path}`,
    lastModified: new Date(),
    changeFrequency: r.freq,
    priority: r.priority,
  }));
}
