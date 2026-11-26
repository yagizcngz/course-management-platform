// Public pages listed in /sitemap.xml; <loc> must be an absolute URL, so the host comes from the request.
const PATHS = ["/", "/kurslar", "/kategoriler", "/egitmenler", "/topluluk", "/hakkimizda"];

export const sitemapXml = (origin: string) => {
  const urls = PATHS.map(
    (p) => `  <url><loc>${new URL(p, origin).href}</loc><changefreq>weekly</changefreq></url>`,
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
};
