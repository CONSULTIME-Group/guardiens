// Ancienne fonction sitemap, réduite à un proxy du fichier statique (SEO-3).
// Source unique du plan du site : scripts/generate-sitemap.mjs au build.
import { proxySitemap } from "./proxy.ts";

Deno.serve((req) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405 });
  }
  return proxySitemap();
});
