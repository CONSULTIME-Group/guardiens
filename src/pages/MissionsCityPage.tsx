import { Suspense, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import PageMeta from "@/components/PageMeta";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { NeedCard, HelperCard, type EntraideNeed, type PublicHelper } from "@/components/entraide/EntraideCards";
import EntraideProofs from "@/components/entraide/EntraideProofs";
import { supabase } from "@/integrations/supabase/client";
import { haversineDistance } from "@/lib/geocode";
import { lazyWithRetry as lazy } from "@/lib/lazyWithRetry";
import { MISSIONS_CITIES } from "@/data/missionsCityContent";

const EntraideMap = lazy(() => import("@/components/entraide/EntraideMap"), "EntraideMap");

interface AvailableProfile {
  id: string;
  latitude_approx: number | null;
  longitude_approx: number | null;
}

const isInsideRadius = (
  center: { lat: number; lng: number },
  radiusKm: number,
  latitude: number | null,
  longitude: number | null,
) => latitude !== null && longitude !== null
  && haversineDistance(center.lat, center.lng, latitude, longitude) <= radiusKm;

const fetchAvailableProfiles = async (): Promise<AvailableProfile[]> => {
  const rows: AvailableProfile[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data } = await (supabase as any)
      .from("public_profiles")
      .select("id, latitude_approx, longitude_approx")
      .eq("available_for_help", true)
      .not("latitude_approx", "is", null)
      .not("longitude_approx", "is", null)
      .range(from, from + pageSize - 1);
    const page = (data || []) as AvailableProfile[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
};

export const cityAvailabilityLabel = (count: number, cityName: string) => count >= 5
  ? `${count} personnes disponibles autour de ${cityName}`
  : "La carte se remplit avec les coups de main du coin.";

export interface MissionsCityPageProps {
  citySlug: string;
}

const MissionsCityPage = ({ citySlug }: MissionsCityPageProps) => {
  const c = MISSIONS_CITIES[citySlug];
  const [needs, setNeeds] = useState<EntraideNeed[]>([]);
  const [helpers, setHelpers] = useState<PublicHelper[]>([]);
  const [availableCount, setAvailableCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"needs" | "helpers">("needs");
  // Carte par défaut sur ordinateur, liste par défaut sur mobile.
  const [mapOpen, setMapOpen] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches);

  useEffect(() => {
    if (!c) return;
    let active = true;
    const load = async () => {
      const [profiles, needsResult, helpersResult, countsResult] = await Promise.all([
        fetchAvailableProfiles(),
        supabase.from("public_small_missions").select("id, slug, title, city, date_needed, end_date, latitude, longitude, photos, sit_mode").eq("status", "open").eq("mission_type", "besoin").order("created_at", { ascending: false }),
        supabase.from("public_helpers").select("id, first_name, avatar_url, city, latitude_approx, longitude_approx, helps_with"),
        supabase.from("public_mission_response_counts").select("mission_id, response_count"),
      ]);
      if (!active) return;

      const counts = new Map((countsResult.data || []).map((row) => [row.mission_id, row.response_count || 0]));
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const localNeeds = (needsResult.data || [])
        .filter((row) => {
          const date = row.end_date || row.date_needed;
          return (!date || new Date(date) >= today)
            && isInsideRadius(c.coordinates, c.radiusKm, row.latitude, row.longitude);
        })
        .map((row) => ({ ...row, response_count: counts.get(row.id) || 0 })) as EntraideNeed[];
      localNeeds.sort((a, b) => {
        const aDistance = haversineDistance(c.coordinates.lat, c.coordinates.lng, Number(a.latitude), Number(a.longitude));
        const bDistance = haversineDistance(c.coordinates.lat, c.coordinates.lng, Number(b.latitude), Number(b.longitude));
        return aDistance - bDistance;
      });

      const localHelpers = (helpersResult.data || [])
        .flatMap((row) => row.id && row.first_name ? [{ ...row, id: row.id, first_name: row.first_name }] : [])
        .filter((row) => isInsideRadius(c.coordinates, c.radiusKm, row.latitude_approx, row.longitude_approx)) as PublicHelper[];
      localHelpers.sort((a, b) => {
        const aDistance = haversineDistance(c.coordinates.lat, c.coordinates.lng, Number(a.latitude_approx), Number(a.longitude_approx));
        const bDistance = haversineDistance(c.coordinates.lat, c.coordinates.lng, Number(b.latitude_approx), Number(b.longitude_approx));
        return aDistance - bDistance;
      });

      setAvailableCount(profiles.filter((profile) => isInsideRadius(c.coordinates, c.radiusKm, profile.latitude_approx, profile.longitude_approx)).length);
      setNeeds(localNeeds);
      setHelpers(localHelpers);
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [c]);

  const origin = useMemo<[number, number] | null>(() => c ? [c.coordinates.lat, c.coordinates.lng] : null, [c]);

  if (!c) return <Navigate to="/petites-missions" replace />;

  const path = `/petites-missions/${c.slug}`;
  const distanceFromCity = (latitude: number | null, longitude: number | null) => latitude !== null && longitude !== null
    ? haversineDistance(c.coordinates.lat, c.coordinates.lng, latitude, longitude)
    : null;
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: c.faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: "https://guardiens.fr/" },
      { "@type": "ListItem", position: 2, name: "Entraide", item: "https://guardiens.fr/petites-missions" },
      { "@type": "ListItem", position: 3, name: c.cityName, item: `https://guardiens.fr${path}` },
    ],
  };

  return (
    <>
      <PageMeta title={c.metaTitle} description={c.metaDescription} path={path} jsonLd={[breadcrumbSchema, faqSchema]} />
      <div className="min-h-screen bg-background font-body">
        <PublicHeader />
        <PageBreadcrumb items={[{ label: "Entraide", href: "/petites-missions" }, { label: c.cityName }]} />
        <main className="min-w-0">
          <section className="border-b border-border bg-background">
            <div className={`mx-auto grid max-w-6xl gap-8 px-4 py-[52px] sm:px-6 lg:px-8 ${c.heroImage ? "md:grid-cols-[1fr_0.72fr] md:items-center" : ""}`}>
              <div>
                <p className="text-sm font-semibold text-primary">Entraide à {c.cityName}</p>
                <h1 className="mt-2 max-w-4xl font-heading text-3xl font-bold leading-tight text-foreground sm:text-5xl">{c.h1}</h1>
                <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">{c.intro}</p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Button asChild><Link to="/inscription?redirect=/petites-missions/creer">J'ai besoin d'un coup de main</Link></Button>
                  <Button asChild variant="outline"><Link to="/inscription?redirect=/petites-missions?vue=autour">Je veux bien aider</Link></Button>
                </div>
              </div>
              {c.heroImage && <img src={c.heroImage} alt={c.heroAlt || ""} width={720} height={480} className="aspect-[3/2] w-full rounded-lg object-cover" />}
            </div>
          </section>

          <div className="mx-auto max-w-6xl space-y-[52px] px-4 py-[52px] sm:px-6 lg:px-8">
            <section aria-labelledby="city-map-title">
              <p className="text-sm font-semibold text-primary">Autour de {c.cityName}</p>
              <h2 id="city-map-title" className="mt-1 font-heading text-2xl font-semibold text-foreground">{cityAvailabilityLabel(availableCount, c.cityName)}</h2>
              <div className="mt-5">
                <Suspense fallback={<div className="h-[360px] animate-pulse rounded-lg bg-muted sm:h-[520px]" />}>
                  <EntraideMap needs={needs} helpers={helpers} focus={origin} />
                </Suspense>
              </div>
            </section>

            <section aria-labelledby="city-needs-title">
              <h2 id="city-needs-title" className="font-heading text-2xl font-semibold text-foreground">Besoins ouverts près de {c.cityName}</h2>
              {loading ? <div className="mt-5 grid gap-4 md:grid-cols-2" aria-busy="true"><div className="h-40 animate-pulse rounded-lg bg-muted" /><div className="h-40 animate-pulse rounded-lg bg-muted" /></div>
                : needs.length > 0 ? <div className="mt-5 grid gap-4 md:grid-cols-2">{needs.map((need) => <NeedCard key={need.id} need={need} distance={distanceFromCity(need.latitude, need.longitude)} showDistance />)}</div>
                  : <p className="mt-5 rounded-lg border border-border p-5 text-sm text-muted-foreground">Le prochain besoin apparaîtra ici. Vous pouvez décrire le vôtre dès maintenant.</p>}
            </section>

            <section aria-labelledby="city-helpers-title">
              <h2 id="city-helpers-title" className="font-heading text-2xl font-semibold text-foreground">Autour de vous</h2>
              {loading ? <div className="mt-5 grid gap-4 md:grid-cols-2" aria-busy="true"><div className="h-40 animate-pulse rounded-lg bg-muted" /><div className="h-40 animate-pulse rounded-lg bg-muted" /></div>
                : helpers.length > 0 ? <div className="mt-5 grid gap-4 md:grid-cols-2">{helpers.map((helper) => <HelperCard key={helper.id} helper={helper} distance={distanceFromCity(helper.latitude_approx, helper.longitude_approx)} showDistance />)}</div>
                  : <p className="mt-5 rounded-lg border border-border p-5 text-sm text-muted-foreground">Les premières personnes qui décrivent leurs coups de main apparaîtront ici.</p>}
            </section>

            <EntraideProofs origin={origin} title={`Ça s'est passé près de ${c.cityName}`} />
          </div>

          <section className="border-y border-border bg-muted/30">
            <div className="mx-auto max-w-3xl space-y-[52px] px-4 py-[52px] sm:px-6">
              {c.sections.map((section) => (
                <article key={section.heading}>
                  <h2 className="font-heading text-2xl font-semibold leading-snug text-foreground">{section.heading}</h2>
                  <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">{section.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="mx-auto max-w-3xl px-4 py-[52px] sm:px-6" aria-labelledby="city-faq-title">
            <h2 id="city-faq-title" className="font-heading text-2xl font-semibold text-foreground">Questions fréquentes, {c.cityName}</h2>
            <Accordion type="single" collapsible className="mt-5 space-y-3">
              {c.faq.map((item, index) => (
                <AccordionItem key={item.q} value={`faq-${index}`} className="rounded-lg border border-border bg-card px-4">
                  <AccordionTrigger className="text-left font-semibold">{item.q}</AccordionTrigger>
                  <AccordionContent className="leading-relaxed text-muted-foreground">{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        </main>
        <PublicFooter />
      </div>
    </>
  );
};

export default MissionsCityPage;
