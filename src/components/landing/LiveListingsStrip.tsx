import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRecentPublishedSits } from "@/hooks/useRecentPublishedSits";
import { haversineDistance } from "@/lib/geocode";
import { storageImageSrcSet, storageImageUrl } from "@/lib/storageImage";
import type { HomeOrigin } from "@/components/landing/HomeProximitySearch";
import RecentSitsItemListJsonLd from "@/components/seo/RecentSitsItemListJsonLd";
import { homeListingPlace } from "@/lib/homeListingPlace";
import { inferMissionCategory } from "@/lib/missionCategories";
import { fetchUpcomingOutings } from "@/lib/outingsData";
import { outingDateLabel } from "@/lib/outings";
import outingVisual from "@/assets/missions/spot-jeux-480.webp";

interface HomeListing {
  id: string;
  kind: "garde" | "besoin" | "sortie";
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
  /** Code du département (971 à 988 pour l'outre-mer). */
  departementCode?: string | null;
  /** Ligne de date déjà rédigée (sorties : jour et heure). */
  dateLabel?: string;
  /** Carte d'invitation, affichée tant qu'aucune sortie n'est ouverte. */
  invitation?: boolean;
  /** Lieu affiché : commune puis département, ou pays hors de France (lot H2). */
  place?: string;
}

const MAX_LISTINGS = 6;

/** Une couleur par famille, lisible sur la photo (lot VIT1). */
const KIND_BADGE: Record<HomeListing["kind"], string> = {
  garde: "bg-primary text-primary-foreground",
  besoin: "bg-terra text-terra-foreground",
  sortie: "bg-foreground text-background",
};

/** Titre selon l'origine : ville saisie, sinon vue nationale. */
export const liveListingsTitle = (origin: HomeOrigin | null) => {
  const city = origin?.city?.trim();
  if (!city) return "En ce moment sur Guardiens";
  return `En ce moment près de ${city.charAt(0).toLocaleUpperCase("fr")}${city.slice(1)}`;
};

/**
 * Gardes de maison d'abord, entraide ensuite : cinq gardes et un besoin,
 * ou quatre gardes, un besoin et une sortie quand la carte de sortie est là.
 * Un besoin n'apparaît que s'il porte une photo.
 */
const GUARD_TARGET = 5;
const NEED_TARGET = 1;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Score de vitrine d'une garde, sans ville saisie.
 * Photos : 0 sans photo, 1 pour une ou deux, 2 à partir de trois.
 * Fraîcheur : 2 sous 14 jours, 1 sous 30 jours, 0 au delà.
 * Destination : 2 pour une garde hors de France métropolitaine (autre pays,
 * ou outre-mer d'après le code du département : la Polynésie porte le pays
 * « FR » en base), qui fait voyager la home.
 */
export const showcaseScore = (listing: HomeListing, now: number = Date.now()) => {
  const photos = listing.photoCount ?? (listing.photo ? 1 : 0);
  const photoScore = photos >= 3 ? 2 : photos >= 1 ? 1 : 0;
  const created = listing.createdAt ? Date.parse(listing.createdAt) : NaN;
  const ageDays = Number.isNaN(created) ? Infinity : (now - created) / DAY_MS;
  const freshness = ageDays <= 14 ? 2 : ageDays <= 30 ? 1 : 0;
  const country = (listing.country ?? "FR").toUpperCase();
  const overseas = /^9[78]/.test(String(listing.departementCode ?? "").trim());
  const destination = country !== "FR" || overseas ? 2 : 0;
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

const photosOf = (l: HomeListing) => l.photoCount ?? (l.photo ? 1 : 0);

/**
 * Vitrine nationale : score décroissant, puis l'annonce la mieux illustrée,
 * puis la plus récente (lot VIT1 : à score égal, douze photos passent devant
 * une seule).
 */
export const rankShowcaseGuards = (guards: HomeListing[], now: number = Date.now()) =>
  onePerOwner(
    [...guards].sort((a, b) => showcaseScore(b, now) - showcaseScore(a, now) || photosOf(b) - photosOf(a) || byCreatedDesc(a, b)),
  );

const distanceFrom = (origin: HomeOrigin | null, lat: number | null, lng: number | null) =>
  origin && lat !== null && lng !== null ? haversineDistance(origin.lat, origin.lng, lat, lng) : null;

/** Avec une ville saisie : la plus proche d'abord, avec photo avant sans photo. */
const byDistance = (a: HomeListing, b: HomeListing) =>
  (a.distance ?? Number.MAX_VALUE) - (b.distance ?? Number.MAX_VALUE);

const hasPhoto = (l: HomeListing) => Boolean(l.photo) || (l.photoCount ?? 0) > 0;

/** Un coup de main hors animaux d'abord : la home montre l'étendue de l'entraide (lot VIT1). */
const nonAnimalFirst = (needs: HomeListing[]) => {
  // « Pet sitting », « pension chat », « garde de chien » : titres d'animaux que la règle générale laisse passer.
  const isAnimal = (l: HomeListing) => inferMissionCategory(l.title) === "animals" || /\b(pet[- ]?sitting|gardiennage)\b/i.test(l.title);
  return [...needs.filter((l) => !isAnimal(l)), ...needs.filter(isAnimal)];
};

/** Titre affiché : émojis retirés, espaces resserrés. */
export const cleanListingTitle = (title: string) =>
  title.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "").replace(/\s+/g, " ").trim();

export const LISTING_KIND_LABEL: Record<HomeListing["kind"], string> = {
  garde: "Garde de maison",
  besoin: "Coup de main",
  sortie: "Sortie",
};

/**
 * Compose les cartes de la home.
 * Sans ville saisie : vitrine nationale (photos, fraîcheur, destinations).
 * Avec une ville saisie : proximité, photo prioritaire à distance égale.
 * Avec une carte de sortie (lot VIT1) : quatre gardes, un coup de main, une
 * sortie, dans l'ordre garde, garde, coup de main, sortie, garde, garde, pour
 * que les trois familles tiennent dans les premiers balayages au téléphone.
 */
export const composeHomeListings = (
  guards: HomeListing[],
  needs: HomeListing[],
  origin: HomeOrigin | null,
  now: number = Date.now(),
  outing: HomeListing | null = null,
) => {
  const rankedGuards = origin
    ? onePerOwner([...guards].sort((a, b) => byDistance(a, b) || Number(hasPhoto(b)) - Number(hasPhoto(a))))
    : rankShowcaseGuards(guards, now);
  const photoNeeds = needs.filter(hasPhoto);
  const rankedNeeds = origin ? [...photoNeeds].sort(byDistance) : nonAnimalFirst(photoNeeds);
  const guardTarget = outing ? GUARD_TARGET - 1 : GUARD_TARGET;
  const selectedGuards = rankedGuards.slice(0, guardTarget);
  const selectedNeeds = rankedNeeds.slice(0, NEED_TARGET);
  const extras = [...selectedNeeds, ...(outing ? [outing] : [])];
  const total = selectedGuards.length + extras.length;
  const remaining = total >= MAX_LISTINGS ? [] : [
    ...rankedGuards.slice(guardTarget),
    ...rankedNeeds.slice(NEED_TARGET),
  ].slice(0, MAX_LISTINGS - total);
  if (!outing) return [...selectedGuards, ...extras, ...remaining];
  return [...selectedGuards.slice(0, 2), ...extras, ...selectedGuards.slice(2), ...remaining];
};

/** Carte affichée tant qu'aucune sortie n'est ouverte : elle invite à en proposer une. */
const OUTING_INVITATION: HomeListing = {
  id: "invitation",
  kind: "sortie",
  invitation: true,
  title: "Balade, jeux de société, marché : proposez une sortie près de chez vous",
  city: null,
  date: null,
  endDate: null,
  photo: null,
  href: "/sorties/proposer",
  latitude: null,
  longitude: null,
  distance: null,
};

/**
 * `origin` : ville saisie par le visiteur, qui trie par proximité.
 * `profileOrigin` : ville du profil d'un membre connecté, qui sert seulement à
 * afficher la distance sans changer l'ordre de la vitrine nationale.
 */
export default function LiveListingsStrip({ origin = null, profileOrigin = null, isAuthenticated = false }: { origin?: HomeOrigin | null; profileOrigin?: HomeOrigin | null; isAuthenticated?: boolean }) {
  const { data: sits = [], isLoading: sitsLoading } = useRecentPublishedSits();
  const [missions, setMissions] = useState<HomeListing[]>([]);
  const [loadingMissions, setLoadingMissions] = useState(true);
  const [outing, setOuting] = useState<HomeListing>(OUTING_INVITATION);
  // La vitrine attend la lecture des sorties : une carte posée puis remplacée ferait clignoter la quatrième place.
  const [outingReady, setOutingReady] = useState(false);

  useEffect(() => {
    let active = true;
    // Une lecture en échec laisse la carte d'invitation en place.
    void Promise.resolve().then(fetchUpcomingOutings).catch(() => ({ data: [] })).then(({ data }) => {
      if (!active) return;
      setOutingReady(true);
      // La prochaine sortie où il reste une place.
      const next = data.find((o) => o.capacity > o.taken);
      if (!next) return;
      setOuting({
        id: next.id,
        kind: "sortie",
        title: next.title,
        city: next.city,
        place: homeListingPlace({ city: next.city, postalCode: next.postal_code }),
        date: null,
        endDate: null,
        dateLabel: outingDateLabel(next.starts_at),
        photo: null,
        href: `/sorties/${next.slug}`,
        latitude: null,
        longitude: null,
        distance: null,
      });
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    void supabase
      .from("public_small_missions")
      .select("id, slug, title, city, postal_code, date_needed, photos, latitude, longitude, created_at")
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
          place: homeListingPlace({ city: mission.city, postalCode: mission.postal_code }),
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
      place: homeListingPlace({ city: sit.city, departementCode: sit.departement_code, country: sit.country }),
      date: sit.start_date,
      endDate: sit.end_date,
      photo: sit.cover_photo_url,
      photoCount: sit.photo_count ?? (sit.cover_photo_url ? 1 : 0),
      createdAt: sit.created_at,
      country: sit.country,
      departementCode: sit.departement_code,
      ownerId: sit.user_id,
      href: `/annonces/${sit.slug || sit.id}`,
      latitude: sit.owner?.latitude ?? null,
      longitude: sit.owner?.longitude ?? null,
      distance: null,
    }));
    const reference = origin ?? profileOrigin;
    const locatedGuards = guards.map((listing) => ({ ...listing, distance: distanceFrom(reference, listing.latitude, listing.longitude) }));
    const locatedNeeds = missions.map((listing) => ({ ...listing, distance: distanceFrom(reference, listing.latitude, listing.longitude) }));
    // Une sortie n'a pas de coordonnées : avec une ville saisie, la carte invite à en proposer une près de chez soi.
    const outingCard = origin ? OUTING_INVITATION : outing;
    const card = outingCard.invitation && !isAuthenticated
      ? { ...outingCard, href: `/inscription?redirect=${encodeURIComponent("/sorties/proposer")}` }
      : outingCard;
    return composeHomeListings(locatedGuards, locatedNeeds, origin, Date.now(), card);
  }, [isAuthenticated, missions, origin, outing, profileOrigin, sits]);

  const formatDate = (date: string | null) => date
    ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(date))
    : null;

  if (sitsLoading || loadingMissions || !outingReady) {
    // Squelette à la même hauteur que la vitrine chargée (lot perf 16, 04/11/2026) :
    // un bandeau réduit à une barre poussait tout le reste de l'accueil (sommaire,
    // « Comment ça marche », pied de page) au moment de l'arrivée des annonces.
    return (
      <section id="en-ce-moment" className="border-b border-border/40 bg-background py-[52px] scroll-mt-24 md:py-16" aria-busy="true" aria-labelledby="live-listings-title" data-testid="live-listings-skeleton">
        <div className="lp-wide">
          {/* Titre et surtitre réels (ils ne dépendent pas des annonces) : hauteur exacte à toute largeur. */}
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">En direct</p>
          <h2 id="live-listings-title" className="mt-2 font-heading text-3xl font-semibold text-foreground md:text-5xl">{liveListingsTitle(origin)}</h2>
          <div className="-mx-4 mt-8 flex gap-4 overflow-hidden px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:gap-5 md:px-0 md:pb-0 lg:grid-cols-3" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-[80%] shrink-0 overflow-hidden rounded-lg border border-border bg-card md:w-auto md:shrink">
                <div className="aspect-[4/3] animate-pulse bg-muted" />
                <div className="h-[138px] p-4"><div className="h-3 w-16 animate-pulse rounded bg-muted" /><div className="mt-3 h-5 w-4/5 animate-pulse rounded bg-muted" /></div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-5 text-sm font-semibold text-primary">
            <Link to="/annonces" className="hover:underline">Voir les gardes</Link>
            <Link to="/petites-missions" className="hover:underline">Voir les coups de main</Link>
            <Link to="/sorties" className="hover:underline">Voir les sorties</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="en-ce-moment" className="border-b border-border/40 bg-background py-[52px] scroll-mt-24 md:py-16" aria-labelledby="live-listings-title">
      <RecentSitsItemListJsonLd listings={listings.filter((l) => !l.invitation).map((l) => ({ href: l.href, title: cleanListingTitle(l.title) || LISTING_KIND_LABEL[l.kind] }))} name={liveListingsTitle(origin)} />
      <div className="lp-wide">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">En direct</p>
        <h2 id="live-listings-title" className="mt-2 font-heading text-3xl font-semibold text-foreground md:text-5xl">{liveListingsTitle(origin)}</h2>
        {listings.length > 0 ? (
          <div className="-mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:snap-none md:grid-cols-2 md:gap-5 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-3" data-testid="live-listings-list">
            {listings.map((listing) => {
              const start = formatDate(listing.date);
              const end = formatDate(listing.endDate);
              const meta = listing.dateLabel ?? [start && end ? `${start} au ${end}` : start, listing.distance !== null ? `${Math.round(listing.distance)} km` : null].filter(Boolean).join(" · ");
              const title = cleanListingTitle(listing.title) || LISTING_KIND_LABEL[listing.kind];
              const photo = listing.kind === "sortie" ? null : listing.photo;
              return (
                <Link key={`${listing.kind}-${listing.id}`} to={listing.href} data-invitation={listing.invitation ? "" : undefined} className="group w-[80%] shrink-0 snap-start overflow-hidden rounded-lg md:w-auto md:shrink border border-border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    {photo ? <img src={storageImageUrl(photo, { width: 480, height: 360 }) || photo} srcSet={storageImageSrcSet(photo, [400, 640], 75, 4 / 3)} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" alt={title} width={480} height={360} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" /> : listing.kind === "sortie" ? <img src={outingVisual} alt="" aria-hidden="true" width={480} height={480} loading="lazy" className="h-full w-full object-contain p-4" /> : null}
                    <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-sm font-semibold shadow-sm ${KIND_BADGE[listing.kind]}`} data-testid="live-listing-kind">{LISTING_KIND_LABEL[listing.kind]}</span>
                  </div>
                  <div className="p-4">
                    <h3 className="line-clamp-2 font-heading text-lg font-semibold text-foreground">{title}</h3>
                    {(listing.place || listing.city) && <p className="mt-2 truncate text-sm font-medium text-foreground/80" data-testid="live-listing-place">{listing.place || listing.city}</p>}
                    {meta && <p className="mt-0.5 text-sm text-muted-foreground">{meta}</p>}
                    {listing.invitation && <p className="mt-2 text-sm font-semibold text-primary">Proposer une sortie</p>}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : <p className="mt-5 text-muted-foreground">Les prochaines annonces apparaîtront ici dès leur publication.</p>}
        <div className="mt-8 flex flex-wrap gap-5 text-sm font-semibold text-primary">
          <Link to="/annonces" className="hover:underline">Voir les gardes</Link>
          <Link to="/petites-missions" className="hover:underline">Voir les coups de main</Link>
            <Link to="/sorties" className="hover:underline">Voir les sorties</Link>
        </div>
      </div>
    </section>
  );
}
