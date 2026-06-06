// Page dédiée aux annonces de garde hors France.
// Volontairement légère : pas de carte (les distances FR n'ont pas de sens ici),
// pas de filtres complexes. Une grille simple avec ville + pays + visuel + lien.
// Découle d'un besoin réel remonté par un propriétaire à Marrakech (juin 2026).
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Globe2, MapPin } from "lucide-react";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const CANONICAL = "https://guardiens.fr/annonces/international";
const TITLE = "Annonces de garde d'animaux à l'étranger | Guardiens";
const DESCRIPTION =
  "Annonces de garde d'animaux à domicile hors de France : Maroc, Espagne, Belgique, Suisse, Portugal et plus. Consultation libre, inscription gratuite pour postuler.";

type IntlSit = {
  id: string;
  title: string | null;
  city: string | null;
  country: string | null;
  start_date: string | null;
  end_date: string | null;
  cover_photo_url: string | null;
  property?: { photos?: string[] | null } | null;
};

function formatPeriod(s?: string | null, e?: string | null) {
  if (!s && !e) return "Dates flexibles";
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  if (s && e) return `${fmt(s)} → ${fmt(e)}`;
  return fmt((s || e) as string);
}

export default function InternationalListings() {
  const [sits, setSits] = useState<IntlSit[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("sits")
        .select("id, title, city, country, start_date, end_date, cover_photo_url, property:properties(photos)")
        .eq("status", "published")
        .not("country", "is", null)
        .neq("country", "FR")
        .order("created_at", { ascending: false })
        .limit(60);
      if (cancelled) return;
      setSits((data as any[]) || []);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta name="robots" content="noindex,follow" />
        <link rel="canonical" href={CANONICAL} />
      </Helmet>

      <PublicHeader />

      <main id="main-content" className="flex-1 min-w-0" role="main">
        <section className="max-w-6xl mx-auto px-4 md:px-6 pt-10 pb-6">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-3 flex items-center gap-2">
            <Globe2 className="h-3.5 w-3.5" /> Annonces hors France
          </p>
          <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl font-medium leading-tight text-foreground tracking-tight max-w-3xl">
            Gardes d'animaux à l'étranger
          </h1>
          <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Notre communauté grandit aussi au-delà des frontières françaises.
            Découvrez les annonces publiées par des propriétaires installés à
            l'étranger, Maroc, Espagne, Belgique, Suisse, Portugal et plus.
          </p>
          <p className="mt-3 text-sm">
            <Link to="/annonces" className="text-primary font-semibold hover:underline underline-offset-4">
              ← Revenir aux annonces en France
            </Link>
          </p>
        </section>

        <section className="max-w-6xl mx-auto px-4 md:px-6 pb-16">
          {sits === null ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-64 rounded-2xl" />
              ))}
            </div>
          ) : sits.length === 0 ? (
            <div className="border border-dashed border-border rounded-2xl p-10 text-center">
              <Globe2 className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <h2 className="font-heading text-xl font-medium text-foreground mb-2">
                Pas encore d'annonce hors France
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Vous habitez à l'étranger et cherchez un gardien&nbsp;? Vous
                pouvez créer votre annonce sur Guardiens, votre pays sera bien
                pris en compte.
              </p>
              <Link
                to="/inscription"
                className="inline-flex mt-5 items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Publier mon annonce →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {sits.map((s) => {
                const cover = s.cover_photo_url || s.property?.photos?.[0] || null;
                return (
                  <Link
                    key={s.id}
                    to={`/annonces/${s.id}`}
                    className="group block rounded-2xl overflow-hidden border border-border bg-card hover:shadow-lg transition-shadow"
                  >
                    <div className="aspect-[4/3] bg-muted overflow-hidden">
                      {cover ? (
                        <img
                          src={cover}
                          alt={s.title || "Annonce de garde"}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <Globe2 className="h-10 w-10 opacity-40" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5">
                        <MapPin className="h-3 w-3" />
                        {s.city || ","}
                        {s.country && s.country !== "FR" && (
                          <span className="font-medium text-foreground/80">({s.country})</span>
                        )}
                      </p>
                      <h3 className="font-heading text-base font-medium text-foreground line-clamp-2 mb-2">
                        {s.title || "Garde d'animaux"}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {formatPeriod(s.start_date, s.end_date)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
