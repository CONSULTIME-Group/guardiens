import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import fallbackMarrakech from "@/assets/fallback-marrakech.webp";


interface LiveSit {
  id: string;
  slug: string | null;
  title: string;
  start_date: string | null;
  end_date: string | null;
  city: string | null;
  country: string | null;
  is_urgent: boolean;
  cover_photo_url: string | null;
  first_photo: string | null;
  gallery_photo: string | null;
  sit_city: string | null;
  user_id: string;
}

const fmt = (d: string | null) =>
  d ? format(new Date(d), "d MMM", { locale: fr }) : "";

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

const isHighlighted = (s: LiveSit) => s.is_urgent && isForeign(s.country);

/**
 * Aperçu live des annonces sous le Hero.
 * Carte "{t("live_listings.super_opportunity")}" (urgent + étranger) en grand format à gauche,
 * 3 autres en pile à droite.
 */
const LiveListingsStrip: React.FC = () => {
  const { t } = useTranslation();
  const [sits, setSits] = useState<LiveSit[]>([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    let cancelled = false;
    (async () => {
      const todayIso = new Date().toISOString().slice(0, 10);
      const { data: rawSits } = await supabase
        .from("sits")
        .select("id, slug, title, start_date, end_date, user_id, property_id, cover_photo_url, city, country, is_urgent")
        .eq("status", "published")
        .eq("accepting_applications", true)
        .or(`end_date.is.null,end_date.gte.${todayIso}`)
        .order("created_at", { ascending: false })
        .limit(12);

      if (cancelled || !rawSits?.length) {
        if (!cancelled) setLoading(false);
        return;
      }

      const ownerIds = Array.from(new Set(rawSits.map((s: any) => s.user_id).filter(Boolean)));
      const propIds = Array.from(new Set(rawSits.map((s: any) => s.property_id).filter(Boolean)));

      const [{ data: owners }, { data: props }, { data: gallery }] = await Promise.all([
        supabase.from("public_profiles").select("id, city").in("id", ownerIds),
        supabase.from("properties").select("id, cover_photo_url, photos").in("id", propIds),
        supabase
          .from("owner_gallery")
          .select("user_id, photo_url, position")
          .in("user_id", ownerIds)
          .order("position", { ascending: true }),
      ]);

      const ownerMap = new Map((owners || []).map((o: any) => [o.id, o]));
      const propMap = new Map((props || []).map((p: any) => [p.id, p]));
      const galleryMap = new Map<string, string>();
      (gallery || []).forEach((g: any) => {
        if (!galleryMap.has(g.user_id) && g.photo_url) galleryMap.set(g.user_id, g.photo_url);
      });

      const enriched: LiveSit[] = rawSits.map((s: any) => {
        const o = ownerMap.get(s.user_id);
        const p = propMap.get(s.property_id);
        return {
          id: s.id,
          slug: s.slug ?? null,
          title: s.title,
          start_date: s.start_date,
          end_date: s.end_date,
          sit_city: s.city ?? null,
          country: s.country ?? null,
          is_urgent: !!s.is_urgent,
          city: s.city ?? o?.city ?? null,
          cover_photo_url: s.cover_photo_url ?? p?.cover_photo_url ?? null,
          first_photo: p?.photos?.[0] ?? null,
          gallery_photo: galleryMap.get(s.user_id) ?? null,
          user_id: s.user_id,
        };
      });

      // Priorisation : urgent+étranger d'abord, puis urgent, puis étranger, puis récents.
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

  const resolvePhoto = (s: LiveSit) =>
    s.cover_photo_url || s.first_photo || s.gallery_photo || fallbackImageFor(s.sit_city, s.country);

  const labelGeo = (s: LiveSit) => {
    const countryLabel = isForeign(s.country)
      ? (s.country || "").trim().toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())
      : null;
    const cityLabel = s.sit_city
      ? `${s.sit_city.charAt(0).toUpperCase()}${s.sit_city.slice(1).toLowerCase()}`
      : s.city;
    return cityLabel && countryLabel ? `${cityLabel}, ${countryLabel}` : cityLabel;
  };

  const fmtDates = (s: LiveSit) =>
    s.start_date && s.end_date ? `${fmt(s.start_date)} – ${fmt(s.end_date)}` : null;

  const featured = sits.find(isHighlighted);
  const rest = featured ? sits.filter((s) => s.id !== featured.id).slice(0, 1) : sits;

  return (
    <section
      aria-label={t("live_listings.aria")}
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
                {t("live_listings.eyebrow")}
              </p>

            </div>
            <h2 className="font-heading text-lg md:text-2xl font-semibold text-foreground leading-tight">
              {t("live_listings.title")}
            </h2>
          </div>
          <Link
            to="/annonces"
            className="text-xs md:text-sm text-primary font-semibold hover:underline whitespace-nowrap shrink-0 pb-1"
          >
            {t("live_listings.see_all")} <span aria-hidden>→</span>
          </Link>
        </div>

        {featured ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-5">
            {/* Carte featured surdimensionnée */}
            <Link
              to={`/annonces/${featured.slug || featured.id}`}
              className="group lg:col-span-3 relative overflow-hidden rounded-3xl border-2 border-destructive/40 bg-card shadow-lg hover:shadow-2xl hover:border-destructive/70 transition-all"
            >
              <div className="aspect-[16/10] md:aspect-[16/9] relative overflow-hidden">
                {resolvePhoto(featured) ? (
                  <img
                    src={resolvePhoto(featured) as string}
                    alt={featured.title}
                    loading="lazy"
                    width={960}
                    height={540}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-accent/60 to-muted" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                {/* Bandeau {t("live_listings.super_opportunity")} */}
                <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 bg-destructive text-destructive-foreground text-[11px] md:text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full shadow-lg">
                    <span className="h-1.5 w-1.5 rounded-full bg-destructive-foreground animate-pulse" aria-hidden />
                    Urgent
                  </span>
                  <span className="inline-flex items-center bg-amber-500 text-white text-[11px] md:text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full shadow-lg">
                    {t("live_listings.super_opportunity")}
                  </span>
                </div>

                {/* Contenu en bas */}
                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 text-white">
                  <p className="text-[11px] md:text-xs uppercase tracking-[0.18em] font-semibold opacity-90 mb-2">
                    {labelGeo(featured)}
                  </p>
                  <h3 className="font-heading text-xl md:text-3xl font-bold leading-tight mb-2 line-clamp-2">
                    {featured.title}
                  </h3>
                  {fmtDates(featured) && (
                    <p className="text-sm md:text-base font-medium opacity-90">
                      {fmtDates(featured)}
                    </p>
                  )}
                  <span className="mt-3 inline-flex items-center gap-1.5 bg-white/95 text-foreground text-xs md:text-sm font-semibold px-3 py-1.5 rounded-full">
                    {t("live_listings.discover")} <span aria-hidden>→</span>
                  </span>
                </div>
              </div>
            </Link>

            {/* Pile de 3 cartes secondaires */}
            <div className="lg:col-span-1 grid grid-cols-1 gap-3 md:gap-4">
              {rest.map((s) => {
                const photo = resolvePhoto(s);
                const dates = fmtDates(s);
                const geo = labelGeo(s);
                return (
                  <Link
                    key={s.id}
                    to={`/annonces/${s.slug || s.id}`}
                    className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/50 hover:shadow-md transition-all flex lg:flex-row flex-col"
                  >
                    <div className="lg:w-2/5 aspect-[4/3] lg:aspect-auto bg-muted relative overflow-hidden shrink-0">
                      {photo ? (
                        <img
                          src={photo}
                          alt={s.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-accent/60 to-muted" />
                      )}
                      {s.is_urgent && (
                        <span className="absolute top-1.5 left-1.5 bg-destructive text-destructive-foreground text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full">
                          Urgent
                        </span>
                      )}
                    </div>
                    <div className="p-2.5 md:p-3 flex-1 min-w-0 flex flex-col justify-center">
                      {geo && (
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 truncate">
                          {geo}
                        </p>
                      )}
                      <h3 className="font-heading text-xs md:text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
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
        ) : (
          // Pas d'opportunité phare : grille uniforme
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {rest.map((s) => {
              const photo = resolvePhoto(s);
              const dates = fmtDates(s);
              const geo = labelGeo(s);
              return (
                <Link
                  key={s.id}
                  to={`/annonces/${s.slug || s.id}`}
                  className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all"
                >
                  <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                    {photo ? (
                      <img src={photo} alt={s.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-accent/60 to-muted" />
                    )}
                    {s.is_urgent && (
                      <span className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full">
                        Urgent
                      </span>
                    )}
                    {geo && (
                      <span className="absolute bottom-2 left-2 bg-background/95 backdrop-blur text-foreground text-[11px] md:text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm max-w-[85%]">
                        <span className="truncate">{geo}</span>
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-heading text-xs md:text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                      {s.title}
                    </h3>
                    {dates && <p className="text-[10px] md:text-xs text-muted-foreground mt-1.5 font-medium">{dates}</p>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default LiveListingsStrip;
