import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRecentPublishedSits } from "@/hooks/useRecentPublishedSits";
import { haversineDistance } from "@/lib/geocode";
import { storageImageSrcSet, storageImageUrl } from "@/lib/storageImage";
import type { HomeOrigin } from "@/components/landing/HomeProximitySearch";

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
}

const MAX_LISTINGS = 6;
const GUARD_TARGET = 4;
const NEED_TARGET = 2;

const distanceFrom = (origin: HomeOrigin | null, lat: number | null, lng: number | null) =>
  origin && lat !== null && lng !== null ? haversineDistance(origin.lat, origin.lng, lat, lng) : null;

const byDistance = (a: HomeListing, b: HomeListing) =>
  (a.distance ?? Number.MAX_VALUE) - (b.distance ?? Number.MAX_VALUE);

export const composeHomeListings = (guards: HomeListing[], needs: HomeListing[], origin: HomeOrigin | null) => {
  const rankedGuards = origin ? [...guards].sort(byDistance) : guards;
  const rankedNeeds = origin ? [...needs].sort(byDistance) : needs;
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

export default function LiveListingsStrip({ origin = null }: { origin?: HomeOrigin | null }) {
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
      .limit(24)
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
      href: `/annonces/${sit.slug || sit.id}`,
      latitude: sit.owner?.latitude ?? null,
      longitude: sit.owner?.longitude ?? null,
      distance: null,
    }));
    const locatedGuards = guards.map((listing) => ({ ...listing, distance: distanceFrom(origin, listing.latitude, listing.longitude) }));
    const locatedNeeds = missions.map((listing) => ({ ...listing, distance: distanceFrom(origin, listing.latitude, listing.longitude) }));
    return composeHomeListings(locatedGuards, locatedNeeds, origin);
  }, [missions, origin, sits]);

  const formatDate = (date: string | null) => date
    ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(date))
    : null;

  if (sitsLoading || loadingMissions) {
    return <section id="en-ce-moment" className="border-b border-border/40 bg-background py-[52px] scroll-mt-24" aria-busy="true"><div className="lp-wide"><div className="h-8 w-72 animate-pulse rounded bg-muted" /></div></section>;
  }

  return (
    <section id="en-ce-moment" className="border-b border-border/40 bg-background py-[52px] scroll-mt-24 md:py-16" aria-labelledby="live-listings-title">
      <div className="lp-wide">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">En direct</p>
        <h2 id="live-listings-title" className="mt-2 font-heading text-3xl font-semibold text-foreground md:text-4xl">En ce moment près de chez vous</h2>
        {listings.length > 0 ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => {
              const start = formatDate(listing.date);
              const end = formatDate(listing.endDate);
              return (
                <Link key={`${listing.kind}-${listing.id}`} to={listing.href} className="group overflow-hidden rounded-lg border border-border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
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