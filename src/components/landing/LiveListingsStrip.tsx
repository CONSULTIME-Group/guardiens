import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface LiveSit {
  id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  city: string | null;
  cover_photo_url: string | null;
  first_photo: string | null;
}

const fmt = (d: string | null) =>
  d ? format(new Date(d), "d MMM", { locale: fr }) : "";

/**
 * Aperçu compact des annonces de garde dispo, affiché directement
 * sous le Hero de la home. Cible : conversion visiteur anon.
 * Non destructif vis à vis de la section #annonces-en-cours plus bas.
 */
const LiveListingsStrip: React.FC = () => {
  const [sits, setSits] = useState<LiveSit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: rawSits } = await supabase
        .from("sits")
        .select("id, title, start_date, end_date, user_id, property_id, cover_photo_url")
        .eq("status", "published")
        .eq("accepting_applications", true)
        .order("created_at", { ascending: false })
        .limit(8);

      if (cancelled || !rawSits?.length) {
        if (!cancelled) setLoading(false);
        return;
      }

      const ownerIds = Array.from(new Set(rawSits.map((s: any) => s.user_id).filter(Boolean)));
      const propIds = Array.from(new Set(rawSits.map((s: any) => s.property_id).filter(Boolean)));

      const [{ data: owners }, { data: props }] = await Promise.all([
        supabase.from("public_profiles").select("id, city").in("id", ownerIds),
        supabase.from("properties").select("id, cover_photo_url, photos").in("id", propIds),
      ]);

      const ownerMap = new Map((owners || []).map((o: any) => [o.id, o]));
      const propMap = new Map((props || []).map((p: any) => [p.id, p]));

      const enriched: LiveSit[] = rawSits.map((s: any) => {
        const o = ownerMap.get(s.user_id);
        const p = propMap.get(s.property_id);
        return {
          id: s.id,
          title: s.title,
          start_date: s.start_date,
          end_date: s.end_date,
          city: o?.city ?? null,
          cover_photo_url: s.cover_photo_url ?? p?.cover_photo_url ?? null,
          first_photo: p?.photos?.[0] ?? null,
        };
      });

      if (!cancelled) {
        setSits(enriched.slice(0, 4));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || sits.length < 3) return null;

  return (
    <section
      aria-label="Annonces de garde disponibles maintenant"
      className="bg-background border-b border-border/40"
    >
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="flex items-center justify-between gap-3 mb-4 md:mb-5">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <p className="text-[11px] md:text-xs uppercase tracking-[0.18em] text-muted-foreground font-body truncate">
              Annonces de garde dispo en ce moment
            </p>
          </div>
          <Link
            to="/annonces"
            className="text-xs md:text-sm text-primary font-semibold hover:underline whitespace-nowrap"
          >
            Voir tout <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {sits.map((s) => {
            const photo = s.cover_photo_url || s.first_photo;
            const dates =
              s.start_date && s.end_date
                ? `${fmt(s.start_date)} – ${fmt(s.end_date)}`
                : null;
            return (
              <Link
                key={s.id}
                to={`/annonces/${s.id}`}
                className="group bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-md transition-all"
              >
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  {photo ? (
                    <img
                      src={photo}
                      alt={s.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-accent/40 to-muted" />
                  )}
                  {s.city && (
                    <span className="absolute bottom-2 left-2 bg-background/95 backdrop-blur text-foreground text-[10px] md:text-xs font-medium px-2 py-0.5 rounded-full shadow-sm">
                      {s.city}
                    </span>
                  )}
                </div>
                <div className="p-2.5 md:p-3">
                  <h3 className="font-heading text-xs md:text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                    {s.title}
                  </h3>
                  {dates && (
                    <p className="text-[10px] md:text-xs text-muted-foreground mt-1 font-medium">
                      {dates}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default LiveListingsStrip;
