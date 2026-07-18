import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const SITEMAP_PATH = path.join(ROOT_DIR, "public", "sitemap.xml");
const BLOG_DATA_PATH = path.join(ROOT_DIR, "src", "data", "blogArticles.ts");

const staticRoutes = [
  { loc: "https://dinboard.pl/", lastmod: "2026-07-08", priority: "1.0" },
  { loc: "https://dinboard.pl/polityka-prywatnosci", lastmod: "2026-06-28", priority: "0.3" },
  { loc: "https://dinboard.pl/regulamin", lastmod: "2026-06-28", priority: "0.3" },
  { loc: "https://dinboard.pl/kontakt", lastmod: "2026-07-08", priority: "0.5" },
  { loc: "https://dinboard.pl/o-nas", lastmod: "2026-07-08", priority: "0.5" },
  { loc: "https://dinboard.pl/poradniki", lastmod: "2026-07-02", priority: "0.8" },
];

const content = fs.readFileSync(BLOG_DATA_PATH, "utf-8");

const articles = [];
const blocks = content.split("slug:");
for (let i = 1; i < blocks.length; i++) {
  const block = blocks[i];
  const slugMatch = block.match(/^\s*"([^"]+)"/);
  const dateMatch = block.match(/date:\s*"([^"]+)"/);
  if (slugMatch && dateMatch) {
    articles.push({
      loc: `https://dinboard.pl/poradniki/${slugMatch[1]}`,
      lastmod: dateMatch[1],
      priority: "0.6",
    });
  }
}

const allRoutes = [...staticRoutes, ...articles];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- WHY: wygenerowane automatycznie (scripts/generate-sitemap.mjs). -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes
  .map(
    (r) => `  <url>
    <loc>${r.loc}</loc>
    <lastmod>${r.lastmod}</lastmod>
    <priority>${r.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;

fs.writeFileSync(SITEMAP_PATH, xml, "utf-8");
console.log(`[sitemap] Wygenerowano sitemap.xml w public/sitemap.xml z ${allRoutes.length} linkami.`);
