// Carrousel compact « Au-delà des frontières » injecté dans /annonces.
// Expose les annonces hors France au trafic principal (qui ne voit jamais
// /annonces/international en noindex). Masqué si aucune annonce hors FR.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Globe2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface IntlSit {
  id: string;
  title: string | null;
  city: string | null;
  country: string | null;
  cover_photo_url: string | null;
  property: { photos: string[] | null } | null;
}

const InternationalShowcase = () => {
  const [sits, setSits] = useState<IntlSit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("sits")
        .select("id, title, city, country, cover_photo_url, property:properties(photos)")
        .eq("status", "published")
        .eq("accepting_applications", true)
        .not("country", "is", null)
        .neq("country", "FR")
        .order("created_at", { ascending: false })
        .limit(6);
      if (cancelled) return;
      setSits((data as any) || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading || sits.length === 0) return null;

  return (
    <section
      aria-labelledby="intl-showcase-title"
      className="max-w-6xl mx-auto px-4 md:px-6 pt-2 pb-6 md:pb-10"
    >
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-1.5">
            International
          </p>
          <h2 id="intl-showcase-title" className="font-heading text-xl md:text-2xl font-medium text-foreground">
            Au-delà des frontières
          </h2>
        </div>
        <Link
          to="/annonces/international"
          className="shrink-0 text-sm text-primary font-semibold hover:underline underline-offset-4 inline-flex items-center gap-1.5"
        >
          Tout voir <span aria-hidden>→</span>
        </Link>
      </div>

      <div className="-mx-4 md:mx-0 overflow-x-auto md:overflow-visible pb-2 md:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ul className="flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 px-4 md:px-0">
          {sits.slice(0, 3).map((s) => {
            const cover = s.cover_photo_url || s.property?.photos?.[0] || null;
            return (
              <li key={s.id} className="shrink-0 w-[78vw] sm:w-[60vw] md:w-auto">
                <Link
                  to={`/annonces/${s.id}`}
                  className="group block rounded-2xl overflow-hidden border border-border bg-card hover:shadow-lg transition-shadow h-full"
                >
                  <div className="aspect-[4/3] bg-muted overflow-hidden">
                    {cover ? (
                      <img
                        src={cover}
                        alt={s.title || "Annonce de garde à l'international"}
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
                    <h3 className="font-heading text-base font-medium text-foreground line-clamp-2">
                      {s.title || "Garde de maison"}
                    </h3>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

export default InternationalShowcase;
