import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { PRODUCTS } from "@/lib/products";

const BASE_URL = "https://quantm-trade-holding.lovable.app";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const staticPaths: SitemapEntry[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/about", changefreq: "monthly", priority: "0.7" },
          { path: "/methodology", changefreq: "monthly", priority: "0.8" },
          { path: "/status", changefreq: "hourly", priority: "0.5" },
          { path: "/screener", changefreq: "daily", priority: "0.9" },
          { path: "/preise", changefreq: "weekly", priority: "0.9" },
          { path: "/produkte", changefreq: "daily", priority: "0.8" },
          { path: "/heatmap", changefreq: "hourly", priority: "0.7" },
          { path: "/maerkte", changefreq: "hourly", priority: "0.7" },
          { path: "/news", changefreq: "hourly", priority: "0.7" },
          { path: "/global-intel", changefreq: "daily", priority: "0.6" },
          { path: "/kalender", changefreq: "daily", priority: "0.6" },
          { path: "/picks", changefreq: "daily", priority: "0.8" },
          { path: "/analyse", changefreq: "daily", priority: "0.7" },
          { path: "/track-record", changefreq: "weekly", priority: "0.7" },
          { path: "/ai-learning", changefreq: "weekly", priority: "0.5" },
          { path: "/welcome", changefreq: "monthly", priority: "0.5" },
        ];

        const tickerPaths: SitemapEntry[] = PRODUCTS.map((p) => ({
          path: `/produkte/${encodeURIComponent(p.symbol)}`,
          changefreq: "daily",
          priority: "0.6",
        }));

        const entries = [...staticPaths, ...tickerPaths];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
