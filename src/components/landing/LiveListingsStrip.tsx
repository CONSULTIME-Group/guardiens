import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import fallbackMarrakech from "@/assets/fallback-marrakech.webp";

interface LiveSit {
  id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  city: string | null;
  country: string | null;
  is_urgent: boolean;
  cover_photo_url: string | null;
  first_photo: string | null;
  sit_city: string | null;
}

const fmt = (d: string | null) =>
  d ? format(new Date(d), "d MMM", { locale: fr }) : "";

// Mapping pays → emoji drapeau (basique, étendre au besoin)
const flagFor = (country: string | null): string | null => {
  if (!country) return null;
  const c = country.trim().toUpperCase();
  const map: Record<string, string> = {
    MAROC: "🇲🇦", MOROCCO: "🇲🇦", MA: "🇲🇦",
    FRANCE: "🇫🇷", FR: "🇫🇷",
    ESPAGNE: "🇪🇸", SPAIN: "🇪🇸", ES: "🇪🇸",
    PORTUGAL: "🇵🇹", PT: "🇵🇹",
    ITALIE: "🇮🇹", ITALY: "🇮🇹", IT: "🇮🇹",
    BELGIQUE: "🇧🇪", BELGIUM: "🇧🇪", BE: "🇧🇪",
    SUISSE: "🇨🇭", SWITZERLAND: "🇨🇭", CH: "🇨🇭",
  };
  return map[c] ?? null;
};

// Fallback image curée selon ville/pays quand l'annonce n'a aucune photo.
const fallbackImageFor = (city: string | null, country: string | null): string | null => {
  const c = (city || "").toUpperCase();
  const co = (country || "").toUpperCase();
  if (c.includes("MARRAKECH") || c.includes("MARRAKESH") || co === "MAROC" || co === "MOROCCO") {
    return fallbackMarrakech;
  }
  return null;
};

const isForeign = (country: string | null) => {
  if (!country) return false;
  const c = country.trim().toUpperCase();
  return c !== "FRANCE" && c !== "FR" && c !== "";
};

/**
 * Aperçu compact des annonces de garde dispo, affiché directement
 * sous le Hero de la home. Cible : conversion visiteur anon.
 * Met en avant urgences + destinations étrangères.
 */
const LiveListingsStrip: React.FC = () => {
  const [sits, setSits] = useState<LiveSit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: rawSits } = await supabase
        .from("sits")
        .select("id, title, start_date, end_date, user_id, property_id, cover_photo_url, city, country, is_urgent")
        .eq("status", "published")
        .eq("accepting_applications", true)
        .order("created_at", { ascending: false })
        .limit(12);

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
          sit_city: s.city ?? null,
          country: s.country ?? null,
          is_urgent: !!s.is_urgent,
          city: s.city ?? o?.city ?? null,
          cover_photo_url: s.cover_photo_url ?? p?.cover_photo_url ?? null,
          first_photo: p?.photos?.[0] ?? null,
        };
      });

      // Priorisation : urgent d'abord, puis étranger, puis récents.
      enriched.sort((a, b) => {
        const sa = (a.is_urgent ? 2 : 0) + (isForeign(a.country) ? 1 : 0);
        const sb = (b.is_urgent ? 2 : 0) + (isForeign(b.country) ? 1 : 0);
        return sb - sa;
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

  if (loading || sits.length < 1) return null;

  const gridCols =
    sits.length === 1
      ? "grid-cols-1 max-w-sm"
      : sits.length === 2
      ? "grid-cols-1 sm:grid-cols-2 max-w-3xl"
      : sits.length === 3
      ? "grid-cols-2 md:grid-cols-3"
      : "grid-cols-2 md:grid-cols-4";

  return (
    <section
      aria-label="Annonces de garde disponibles maintenant"
      className="bg-gradient-to-b from-accent/20 to-background border-b border-border/40"
    >
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-7 md:py-10">
        <div className="flex items-end justify-between gap-3 mb-4 md:mb-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              <p className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-primary font-semibold font-body">
                En direct
              </p>
            </div>
            <h2 className="font-heading text-lg md:text-2xl font-semibold text-foreground leading-tight">
              Annonces de garde dispo
            </h2>
          </div>
          <Link
            to="/annonces"
            className="text-xs md:text-sm text-primary font-semibold hover:underline whitespace-nowrap shrink-0 pb-1"
          >
            Voir tout <span aria-hidden>→</span>
          </Link>
        </div>

        <div className={`grid ${gridCols} gap-3 md:gap-4 mx-auto`}>
          {sits.map((s) => {
            const photo = s.cover_photo_url || s.first_photo || fallbackImageFor(s.sit_city, s.country);
            const dates =
              s.start_date && s.end_date
                ? `${fmt(s.start_date)} – ${fmt(s.end_date)}`
                : null;
            const flag = flagFor(s.country);
            const cityLabel = s.sit_city
              ? `${s.sit_city.charAt(0).toUpperCase()}${s.sit_city.slice(1).toLowerCase()}`
              : s.city;
            return (
              <Link
                key={s.id}
                to={`/annonces/${s.id}`}
                className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all"
              >
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  {photo ? (
                    <img
                      src={photo}
                      alt={s.title}
                      loading="lazy"
                      width={800}
                      height={608}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-accent/60 to-muted" />
                  )}

                  {/* Badge urgence en haut à gauche */}
                  {s.is_urgent && (
                    <span className="absolute top-2 left-2 inline-flex items-center gap-1 bg-destructive text-destructive-foreground text-[10px] md:text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shadow-md">
                      <span className="h-1.5 w-1.5 rounded-full bg-destructive-foreground animate-pulse" aria-hidden />
                      Urgent
                    </span>
                  )}

                  {/* Badge géo en bas, plus visible */}
                  {cityLabel && (
                    <span className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 bg-background/95 backdrop-blur text-foreground text-[11px] md:text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
                      {flag && <span aria-hidden>{flag}</span>}
                      <span className="truncate max-w-[120px]">{cityLabel}</span>
                    </span>
                  )}
                </div>
                <div className="p-3 md:p-3.5">
                  <h3 className="font-heading text-xs md:text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                    {s.title}
                  </h3>
                  {dates && (
                    <p className="text-[10px] md:text-xs text-muted-foreground mt-1.5 font-medium">
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
