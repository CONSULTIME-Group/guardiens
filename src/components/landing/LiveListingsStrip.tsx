import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRecentPublishedSits } from "@/hooks/useRecentPublishedSits";
import { haversineDistance } from "@/lib/geocode";
import { storageImageSrcSet, storageImageUrl } from "@/lib/storageImage";
import type { HomeOrigin } from "@/components/landing/HomeProximitySearch";
import RecentSitsItemListJsonLd from "@/components/seo/RecentSitsItemListJsonLd";

interface HomeListing {
  id: string;
  kind: "garde" | "besoin";
  title: string;
  city: string | null;
  date: string | null;
  endDate: string | null;
  photo: string | null;
  href: string;
  latitude: number | null;
  longitude: number | null;
  distance: number | null;
  /** Date de publication (ISO), pour la fraîcheur. */
  createdAt?: string | null;
  /** Nombre de photos du logement ou du besoin. */
  photoCount?: number;
  /** Code pays ISO (FR, CA, PF...). */
  country?: string | null;
  /** Auteur de l'annonce, pour ne montrer qu'une annonce par membre. */
  ownerId?: string | null;
}

const MAX_LISTINGS = 6;

/** Titre selon l'origine : ville saisie, sinon vue nationale. */
export const liveListingsTitle = (origin: HomeOrigin | null) => {
  const city = origin?.city?.trim();
  if (!city) return "En ce moment sur Guardiens";
  return `En ce moment près de ${city.charAt(0).toLocaleUpperCase("fr")}${city.slice(1)}`;
};

/**
 * Gardes de maison d'abord, entraide ensuite : cinq gardes, un besoin.
 * Un besoin n'apparaît que s'il porte une photo.
 */
const GUARD_TARGET = 5;
const NEED_TARGET = 1;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Score de vitrine d'une garde, sans ville saisie.
 * Photos : 0 sans photo, 1 pour une ou deux, 2 à partir de trois.
 * Fraîcheur : 2 sous 14 jours, 1 sous 30 jours, 0 au delà.
 * Destination : 2 pour une garde hors de France métropolitaine et de ses
 * départements (Québec, Polynésie...), qui fait voyager la home.
 */
export const showcaseScore = (listing: HomeListing, now: number = Date.now()) => {
  const photos = listing.photoCount ?? (listing.photo ? 1 : 0);
  const photoScore = photos >= 3 ? 2 : photos >= 1 ? 1 : 0;
  const created = listing.createdAt ? Date.parse(listing.createdAt) : NaN;
  const ageDays = Number.isNaN(created) ? Infinity : (now - created) / DAY_MS;
  const freshness = ageDays <= 14 ? 2 : ageDays <= 30 ? 1 : 0;
  const country = (listing.country ?? "FR").toUpperCase();
  const destination = country !== "FR" ? 2 : 0;
  return photoScore + freshness + destination;
};

const byCreatedDesc = (a: HomeListing, b: HomeListing) =>
  (b.createdAt ? Date.parse(b.createdAt) : 0) - (a.createdAt ? Date.parse(a.createdAt) : 0);

/** Une seule annonce par membre : la mieux classée. */
const onePerOwner = (listings: HomeListing[]) => {
  const seen = new Set<string>();
  return listings.filter((l) => {
    if (!l.ownerId) return true;
    if (seen.has(l.ownerId)) return false;
    seen.add(l.ownerId);
    return true;
  });
};

/** Vitrine nationale : score décroissant, puis la plus récente d'abord. */
export const rankShowcaseGuards = (guards: HomeListing[], now: number = Date.now()) =>
  onePerOwner(
    [...guards].sort((a, b) => showcaseScore(b, now) - showcaseScore(a, now) || byCreatedDesc(a, b)),
  );

const distanceFrom = (origin: HomeOrigin | null, lat: number | null, lng: number | null) =>
  origin && lat !== null && lng !== null ? haversineDistance(origin.lat, origin.lng, lat, lng) : null;

/** Avec une ville saisie : la plus proche d'abord, avec photo avant sans photo. */
const byDistance = (a: HomeListing, b: HomeListing) =>
  (a.distance ?? Number.MAX_VALUE) - (b.distance ?? Number.MAX_VALUE);

const hasPhoto = (l: HomeListing) => Boolean(l.photo) || (l.photoCount ?? 0) > 0;

/**
 * Compose les cartes de la home.
 * Sans ville saisie : vitrine nationale (photos, fraîcheur, destinations).
 * Avec une ville saisie : proximité, photo prioritaire à distance égale.
 */
export const composeHomeListings = (
  guards: HomeListing[],
  needs: HomeListing[],
  origin: HomeOrigin | null,
  now: number = Date.now(),
) => {
  const rankedGuards = origin
    ? onePerOwner([...guards].sort((a, b) => byDistance(a, b) || Number(hasPhoto(b)) - Number(hasPhoto(a))))
    : rankShowcaseGuards(guards, now);
  const photoNeeds = needs.filter(hasPhoto);
  const rankedNeeds = origin ? [...photoNeeds].sort(byDistance) : photoNeeds;
  const selected = [
    ...rankedGuards.slice(0, GUARD_TARGET),
    ...rankedNeeds.slice(0, NEED_TARGET),
  ];
  if (selected.length >= MAX_LISTINGS) return selected;
  const remaining = [
    ...rankedGuards.slice(GUARD_TARGET),
    ...rankedNeeds.slice(NEED_TARGET),
  ];
  return [...selected, ...remaining.slice(0, MAX_LISTINGS - selected.length)];
};

/**
 * `origin` : ville saisie par le visiteur, qui trie par proximité.
 * `profileOrigin` : ville du profil d'un membre connecté, qui sert seulement à
 * afficher la distance sans changer l'ordre de la vitrine nationale.
 */
export default function LiveListingsStrip({ origin = null, profileOrigin = null }: { origin?: HomeOrigin | null; profileOrigin?: HomeOrigin | null }) {
  const { data: sits = [], isLoading: sitsLoading } = useRecentPublishedSits();
  const [missions, setMissions] = useState<HomeListing[]>([]);
  const [loadingMissions, setLoadingMissions] = useState(true);

  useEffect(() => {
    let active = true;
    void supabase
      .from("public_small_missions")
      .select("id, slug, title, city, date_needed, photos, latitude, longitude, created_at")
      .eq("status", "open")
      .eq("mission_type", "besoin")
      .order("created_at", { ascending: false })
      .limit(40)
      .then(({ data }) => {
        if (!active) return;
        setMissions((data ?? []).map((mission) => ({
          id: String(mission.id),
          kind: "besoin",
          title: mission.title || "Coup de main",
          city: mission.city,
          date: mission.date_needed,
          endDate: null,
          photo: mission.photos?.[0] ?? null,
          photoCount: (mission.photos ?? []).filter(Boolean).length,
          createdAt: mission.created_at,
          href: `/petites-missions/${mission.slug || mission.id}`,
          latitude: mission.latitude,
          longitude: mission.longitude,
          distance: null,
        })));
        setLoadingMissions(false);
      });
    return () => { active = false; };
  }, []);

  const listings = useMemo(() => {
    const guards: HomeListing[] = sits.map((sit) => ({
      id: sit.id,
      kind: "garde",
      title: sit.title,
      city: sit.city,
      date: sit.start_date,
      endDate: sit.end_date,
      photo: sit.cover_photo_url,
      photoCount: sit.photo_count ?? (sit.cover_photo_url ? 1 : 0),
      createdAt: sit.created_at,
      country: sit.country,
      ownerId: sit.user_id,
      href: `/annonces/${sit.slug || sit.id}`,
      latitude: sit.owner?.latitude ?? null,
      longitude: sit.owner?.longitude ?? null,
      distance: null,
    }));
    const reference = origin ?? profileOrigin;
    const locatedGuards = guards.map((listing) => ({ ...listing, distance: distanceFrom(reference, listing.latitude, listing.longitude) }));
    const locatedNeeds = missions.map((listing) => ({ ...listing, distance: distanceFrom(reference, listing.latitude, listing.longitude) }));
    return composeHomeListings(locatedGuards, locatedNeeds, origin);
  }, [missions, origin, profileOrigin, sits]);

  const formatDate = (date: string | null) => date
    ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(date))
    : null;

  if (sitsLoading || loadingMissions) {
    return <section id="en-ce-moment" className="border-b border-border/40 bg-background py-[52px] scroll-mt-24" aria-busy="true"><div className="lp-wide"><div className="h-8 w-72 animate-pulse rounded bg-muted" /></div></section>;
  }

  return (
    <section id="en-ce-moment" className="border-b border-border/40 bg-background py-[52px] scroll-mt-24 md:py-16" aria-labelledby="live-listings-title">
      <RecentSitsItemListJsonLd listings={listings} name={liveListingsTitle(origin)} />
      <div className="lp-wide">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">En direct</p>
        <h2 id="live-listings-title" className="mt-2 font-heading text-3xl font-semibold text-foreground md:text-5xl">{liveListingsTitle(origin)}</h2>
        {listings.length > 0 ? (
          <div className="-mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:snap-none md:grid-cols-2 md:gap-5 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-3" data-testid="live-listings-list">
            {listings.map((listing) => {
              const start = formatDate(listing.date);
              const end = formatDate(listing.endDate);
              return (
                <Link key={`${listing.kind}-${listing.id}`} to={listing.href} className="group w-[80%] shrink-0 snap-start overflow-hidden rounded-lg md:w-auto md:shrink border border-border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <div className="aspect-[4/3] overflow-hidden bg-muted">
                    {listing.photo ? <img src={storageImageUrl(listing.photo, { width: 480, height: 360 }) || listing.photo} srcSet={storageImageSrcSet(listing.photo, [400, 640], 75, 4 / 3)} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" alt={listing.title} width={480} height={360} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" /> : <div className="flex h-full items-center justify-center px-6 text-center font-heading text-xl text-muted-foreground">{listing.kind === "garde" ? "Garde de maison" : "Coup de main"}</div>}
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{listing.kind === "garde" ? "Garde" : "Besoin"}</p>
                    <h3 className="mt-2 line-clamp-2 font-heading text-lg font-semibold text-foreground">{listing.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{[listing.city, start && end ? `${start} au ${end}` : start, listing.distance !== null ? `${Math.round(listing.distance)} km` : null].filter(Boolean).join(" · ")}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : <p className="mt-5 text-muted-foreground">Les prochaines annonces apparaîtront ici dès leur publication.</p>}
        <div className="mt-8 flex flex-wrap gap-5 text-sm font-semibold text-primary">
          <Link to="/annonces" className="hover:underline">Voir les gardes</Link>
          <Link to="/petites-missions" className="hover:underline">Voir les besoins</Link>
        </div>
      </div>
    </section>
  );
}
