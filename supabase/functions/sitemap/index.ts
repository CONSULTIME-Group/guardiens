// Plan du site public actuel. Memes lectures et criteres que le build,
// uniquement avec la cle anon et ses restrictions RLS.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { collectSitemapData } from "../_shared/sitemap-data.js";
import { fetchAllPages, supabasePage } from "../_shared/sitemap-core.js";
import { createLiveSitemapHandler, createSitemapDocument, ROUTES_ORIGIN, validateRoutesConfig } from "./live.js";

const handler = createLiveSitemapHandler({
  generate: async () => {
    const response = await fetch(ROUTES_ORIGIN, { signal: AbortSignal.timeout(12_000), redirect: "error", cache: "no-store" });
    if (!response.ok) throw new Error(`Route inventory unavailable: ${response.status}`);
    const config = validateRoutesConfig(await response.json());
    const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, signal: AbortSignal.timeout(12_000) }) },
    });
    const today = new Date();
    const data = await collectSitemapData({
      today,
      readAll: (source: string, table: string, columns: string, key: string, build?: (q: any) => any) =>
        fetchAllPages({ source, key, page: supabasePage(client, table, columns, key, build) }),
      // Pas de cache de contenu par famille : toute generation relit la base.
      fetchOrCache: async (_key: string, _cache: unknown, _probe: unknown, fetcher: () => Promise<unknown[]>, builder: (rows: unknown[]) => unknown[]) => builder(await fetcher()),
      maxUpdatedAtWithCount: () => Promise.resolve(null),
    });
    return createSitemapDocument(config, data, today).xml;
  },
});
Deno.serve(handler);
