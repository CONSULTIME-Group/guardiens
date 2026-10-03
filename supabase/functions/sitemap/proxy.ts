/**
 * Proxy de l'ancienne fonction sitemap (SEO-3) : relaie le fichier statique
 * généré au build, sans aucune requête en base et sans passer par le domaine
 * public (qui pourrait renvoyer vers cette fonction, donc boucler).
 */
export const STATIC_SITEMAP_ORIGIN = "https://guardiens.lovable.app/sitemap.xml";
export const CANONICAL_HOST = "https://guardiens.fr";
export const FETCH_TIMEOUT_MS = 8000;
export const MAX_BYTES = 10 * 1024 * 1024;

export function validateSitemapBody(body: string): { ok: true; urls: number } | { ok: false; reason: string } {
  const t = body.trim();
  if (!t.startsWith("<?xml")) return { ok: false, reason: "en-tête XML absent" };
  if (!/<urlset[\s>]/.test(t) || !t.endsWith("</urlset>")) return { ok: false, reason: "urlset incomplet" };
  const opens = (t.match(/<url>/g) || []).length;
  const closes = (t.match(/<\/url>/g) || []).length;
  if (opens === 0 || opens !== closes) return { ok: false, reason: "balises url invalides" };
  const locs = [...t.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
  if (locs.length !== opens) return { ok: false, reason: "url sans loc" };
  if (locs.some((l) => !l.startsWith(`${CANONICAL_HOST}/`) && l !== CANONICAL_HOST)) {
    return { ok: false, reason: "loc hors domaine canonique" };
  }
  return { ok: true, urls: opens };
}

export async function proxySitemap(fetchImpl: typeof fetch = fetch): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetchImpl(STATIC_SITEMAP_ORIGIN, { signal: ctrl.signal, redirect: "manual" });
    if (res.status !== 200) return fail(`statut amont ${res.status}`);
    const body = await res.text();
    if (body.length > MAX_BYTES) return fail("réponse trop volumineuse");
    const v = validateSitemapBody(body);
    if (v.ok === false) return fail(v.reason);
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
        "X-Sitemap-Source": "static",
      },
    });
  } catch (e) {
    return fail(e instanceof Error && e.name === "AbortError" ? "délai dépassé" : "lecture amont impossible");
  } finally {
    clearTimeout(timer);
  }
}

function fail(reason: string): Response {
  return new Response(`Sitemap indisponible (${reason})`, {
    status: 503,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "Retry-After": "300" },
  });
}
