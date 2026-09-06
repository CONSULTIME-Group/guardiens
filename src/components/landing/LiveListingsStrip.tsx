import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useRecentPublishedSits } from "@/hooks/useRecentPublishedSits";
import fallbackMarrakech from "@/assets/fallback-marrakech.webp";
import { storageImageUrl, storageImageSrcSet } from "@/lib/storageImage";


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
  pet_count: number;
}

// Vague conversion du 06/09/2026 : six annonces en grille 3 x 2.
const MAX_LISTINGS = 6;



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
 * Preuve vivante de la page d'accueil : les annonces réelles, remontées en
 * troisième position. Une grille uniforme de six annonces, photo, lieu,
 * dates, nature de la garde et nombre d'animaux quand il y en a. Uniquement
 * des données de la base, aucune annonce fictive : sous six annonces
 * publiées, on affiche celles qui existent.
 */
const LiveListingsStrip: React.FC = () => {
  const { t, i18n } = useTranslation();
  // Formateur natif Intl, mémorisé sur la langue active : pas de dépendance date-fns sur la landing.
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat((i18n.language || "fr").slice(0, 2), {
        day: "numeric",
        month: "short",
      }),
    [i18n.language]
  );
  const fmt = (d: string | null) => {
    if (!d) return "";
    const parsed = new Date(d);
    if (Number.isNaN(parsed.getTime())) return "";
    return dateFormatter.format(parsed);
  };
  const [sits, setSits] = useState<LiveSit[]>([]);
  const [enriching, setEnriching] = useState(true);
  const { data: sharedSits, isLoading: sitsLoading } = useRecentPublishedSits();
  const loading = sitsLoading || enriching;

  useEffect(() => {
    if (sitsLoading) return;
    let cancelled = false;
    (async () => {
      const rawSits = (sharedSits ?? []).slice(0, 12);

      if (cancelled || !rawSits.length) {
        if (!cancelled) {
          setSits([]);
          setEnriching(false);
        }
        return;
      }

      const ownerIds = Array.from(new Set(rawSits.map((s) => s.user_id).filter(Boolean)));
      const propIds = Array.from(new Set(rawSits.map((s) => s.property_id).filter(Boolean)));

      const [{ data: owners }, { data: props }, { data: gallery }, { data: pets }] = await Promise.all([
        supabase.from("public_profiles").select("id, city").in("id", ownerIds),
        supabase.from("properties").select("id, cover_photo_url, photos").in("id", propIds as string[]),
        supabase
          .from("owner_gallery")
          .select("user_id, photo_url, position")
          .in("user_id", ownerIds)
          .order("position", { ascending: true }),
        propIds.length
          ? supabase.from("pets").select("property_id").in("property_id", propIds as string[])
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const ownerMap = new Map((owners || []).map((o: any) => [o.id, o]));
      const propMap = new Map((props || []).map((p: any) => [p.id, p]));
      const galleryMap = new Map<string, string>();
      (gallery || []).forEach((g: any) => {
        if (!galleryMap.has(g.user_id) && g.photo_url) galleryMap.set(g.user_id, g.photo_url);
      });
      const petCountMap = new Map<string, number>();
      (pets || []).forEach((p: any) => {
        if (p.property_id) petCountMap.set(p.property_id, (petCountMap.get(p.property_id) ?? 0) + 1);
      });

      const enriched: LiveSit[] = rawSits.map((s) => {
        const o = ownerMap.get(s.user_id);
        const p = s.property_id ? propMap.get(s.property_id) : undefined;
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
          pet_count: s.property_id ? petCountMap.get(s.property_id) ?? 0 : 0,
        };
      });

      // Priorisation : urgent+étranger d'abord, puis urgent, puis étranger, puis récents.
      enriched.sort((a, b) => {
        const sa = (a.is_urgent ? 2 : 0) + (isForeign(a.country) ? 1 : 0);
        const sb = (b.is_urgent ? 2 : 0) + (isForeign(b.country) ? 1 : 0);
        return sb - sa;
      });

      if (!cancelled) {
        setSits(enriched.slice(0, MAX_LISTINGS));
        setEnriching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sharedSits, sitsLoading]);

  if (loading) {
    return (
      <section
        aria-label={t("live_listings.loading")}
        aria-busy="true"
        className="bg-gradient-to-b from-accent/20 to-background border-b border-border/40"
      >
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
          <div className="mb-6 space-y-2">
            <div className="h-3 w-24 rounded-full bg-muted animate-pulse" />
            <div className="h-7 w-80 max-w-full rounded-md bg-muted animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden border border-border">
                <div className="aspect-[4/3] bg-muted animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-3 w-20 rounded-full bg-muted animate-pulse" />
                  <div className="h-4 w-full rounded-md bg-muted animate-pulse" />
                  <div className="h-3 w-32 rounded-full bg-muted animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (sits.length < 1) {
    return (
      <section
        aria-label={t("live_listings.aria")}
        className="bg-gradient-to-b from-accent/20 to-background border-b border-border/40"
      >
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-10 md:py-14 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <p className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-primary font-semibold font-body">
              {t("live_listings.eyebrow")}
            </p>
          </div>
          <h2 className="font-heading text-xl md:text-2xl font-semibold text-foreground leading-tight mb-2">
            {t("live_listings.empty_title")}
          </h2>
          <p className="font-body text-sm md:text-base text-muted-foreground max-w-lg mx-auto mb-6">
            {t("live_listings.empty_body")}
          </p>
          <Link
            to="/inscription?role=owner"
            className="inline-flex items-center gap-1.5 rounded-full px-6 py-3 bg-primary text-primary-foreground text-sm font-semibold font-body hover:brightness-95 transition-all shadow-md shadow-primary/30"
          >
            {t("live_listings.empty_cta")} <span aria-hidden>→</span>
          </Link>
        </div>
      </section>
    );
  }



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
    s.start_date && s.end_date ? `${fmt(s.start_date)} - ${fmt(s.end_date)}` : null;

  return (
    <section
      aria-label={t("live_listings.aria")}
      className="bg-gradient-to-b from-accent/20 to-background border-b border-border/40"
    >
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <p className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-primary font-semibold font-body">
              {t("live_listings.eyebrow")}
            </p>
          </div>
          <h2 className="font-heading text-2xl md:text-3xl font-semibold text-foreground leading-tight">
            {t("live_listings.title")}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {sits.map((s) => {
            const photo = resolvePhoto(s);
            const dates = fmtDates(s);
            const geo = labelGeo(s);
            return (
              <Link
                key={s.id}
                to={`/annonces/${s.slug || s.id}`}
                className="notebook-card notebook-card-paper group relative min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <div className="notebook-card-edge" aria-hidden="true" />
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  {photo ? (
                    <img
                      src={storageImageUrl(photo, { width: 480, height: 360 }) || photo}
                      srcSet={storageImageSrcSet(photo, [400, 640], 75, 4 / 3)}
                      sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                      alt={s.title}
                      loading="lazy"
                      width={480}
                      height={360}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-accent/60 to-muted" />
                  )}
                  {s.is_urgent && (
                    <span className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full">
                      {t("live_listings.urgent")}
                    </span>
                  )}
                  {geo && (
                    <span className="absolute bottom-2 left-2 bg-background/95 backdrop-blur text-foreground text-[11px] md:text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm max-w-[85%]">
                      <span className="truncate">{geo}</span>
                    </span>
                  )}
                </div>
                <div className="p-3.5 md:p-4">
                  <h3 className="font-heading text-base md:text-lg font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                    {s.title}
                  </h3>
                  {dates && (
                    <p className="text-xs md:text-sm text-muted-foreground mt-1 font-medium">
                      {dates}
                    </p>
                  )}
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">
                    {s.pet_count > 0
                      ? `${t("live_listings.nature_both")} · ${t("live_listings.animals", { count: s.pet_count })}`
                      : t("live_listings.nature_house")}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/annonces"
            className="inline-flex items-center min-h-[44px] text-sm text-primary font-semibold hover:underline underline-offset-4"
          >
            {t("live_listings.see_all")} <span aria-hidden className="ml-1">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default LiveListingsStrip;
