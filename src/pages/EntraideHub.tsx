import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageMeta from "@/components/PageMeta";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import { NeedCard, HelperCard, type EntraideNeed, type PublicHelper } from "@/components/entraide/EntraideCards";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { geocodeCity, haversineDistance } from "@/lib/geocode";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";

const EntraideMap = lazy(() => import("@/components/entraide/EntraideMap"));
type HubView = "needs" | "helpers";

const FAQ = [
  { question: "Comment trouver un coup de main près de chez vous ?", answer: "Indiquez votre ville pour classer les besoins et les personnes disponibles par proximité." },
  { question: "Que faire quand le fil est calme aujourd'hui ?", answer: "Décrivez votre besoin. Il reste visible dans le fil et les personnes disponibles près de chez vous le reçoivent." },
  { question: "Faut-il payer pour utiliser l'Entraide ?", answer: "L'Entraide est ouverte à tous les membres, pour 0 €. Vous convenez ensemble d'un service ou d'une attention." },
  { question: "Quelle différence avec une garde de maison ?", answer: "L'Entraide répond à un besoin ponctuel et court dans la journée. Une garde de maison couvre un séjour de plusieurs jours sur place." },
] as const;

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })),
};

export const filterPublicHelpers = (helpers: PublicHelper[], query: string): PublicHelper[] => {
  const normalized = query.trim().toLocaleLowerCase("fr");
  return helpers.filter((helper) => `${helper.first_name} ${helper.city || ""} ${helper.helps_with}`.toLocaleLowerCase("fr").includes(normalized));
};

export const EntraideHubIntro = ({ isAuthenticated, onNeed, onHelp }: {
  isAuthenticated: boolean;
  onNeed: () => void;
  onHelp: () => void;
}) => (
  <>
    <header className="pb-8 pt-3 sm:pb-10">
      <p className="text-sm font-semibold text-primary">Entraide</p>
      <h1 className="mt-2 max-w-4xl font-heading text-3xl font-bold leading-tight text-foreground sm:text-5xl">
        Et si, à quelques kilomètres de chez vous, quelqu'un avait besoin d'un petit coup de main ?
      </h1>
      <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
        Arroser quelques plantes. Nourrir un chat. Réceptionner un colis. Aider à déplacer un meuble. Des choses qui, pour l'un, sont un vrai besoin, et qui, pour l'autre, coûtent très peu. Et parfois, font plaisir.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button onClick={onNeed}>J'ai besoin d'un coup de main</Button>
        <Button variant="outline" onClick={onHelp}>Je veux bien donner un coup de main</Button>
      </div>
    </header>
    <section className="border-y border-border py-6" aria-labelledby="concretement-title">
      <h2 id="concretement-title" className="font-heading text-xl font-semibold text-foreground">Concrètement</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Vous dites ce dont vous avez besoin. Dix personnes du coin le reçoivent. L'une d'elles dit « Je peux » et vous échangez ensemble.
      </p>
    </section>
    {!isAuthenticated && (
      <section className="mt-8 rounded-lg border border-primary/20 bg-primary/5 p-5 sm:p-6" aria-label="Comment ça marche">
        <p className="text-xs font-semibold uppercase text-primary">Coups de main</p>
        <h2 className="mt-1 font-heading text-xl font-semibold text-foreground">Comment ça marche ?</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          <li className="rounded-lg border border-border bg-card p-4"><strong className="text-sm text-foreground">1. Vous dites</strong><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Décrivez le coup de main et le moment qui vous conviendrait.</p></li>
          <li className="rounded-lg border border-border bg-card p-4"><strong className="text-sm text-foreground">2. Dix personnes le reçoivent</strong><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Les personnes disponibles les plus proches découvrent votre besoin.</p></li>
          <li className="rounded-lg border border-border bg-card p-4"><strong className="text-sm text-foreground">3. L'une dit « Je peux »</strong><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Vous échangez directement et choisissez ensemble le coup de main.</p></li>
        </ol>
      </section>
    )}
  </>
);

export const EntraideFaq = () => (
  <section className="mt-12 border-t border-border pt-8" aria-labelledby="entraide-faq-title">
    <h2 id="entraide-faq-title" className="font-heading text-2xl font-semibold text-foreground">Questions fréquentes</h2>
    <Accordion type="single" collapsible className="mt-5 space-y-2">
      {FAQ.map((item, index) => (
        <AccordionItem key={item.question} value={`faq-${index}`} className="rounded-lg border border-border bg-card px-4">
          <AccordionTrigger className="text-left font-semibold">{item.question}</AccordionTrigger>
          <AccordionContent className="leading-relaxed text-muted-foreground">{item.answer}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  </section>
);

const EntraideHub = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<HubView>(params.get("vue") === "autour" ? "helpers" : "needs");
  const [needs, setNeeds] = useState<EntraideNeed[]>([]);
  const [helpers, setHelpers] = useState<PublicHelper[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [origin, setOrigin] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [needsResult, helpersResult, countsResult] = await Promise.all([
        supabase.from("public_small_missions").select("id, slug, title, city, date_needed, end_date, latitude, longitude").eq("status", "open").eq("mission_type", "besoin").order("created_at", { ascending: false }),
        supabase.from("public_helpers").select("id, first_name, avatar_url, city, latitude_approx, longitude_approx, helps_with"),
        supabase.from("public_mission_response_counts").select("mission_id, response_count"),
      ]);
      const counts = new Map((countsResult.data || []).map((row) => [row.mission_id, row.response_count || 0]));
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setNeeds((needsResult.data || []).filter((row) => {
        const date = row.end_date || row.date_needed;
        return !date || new Date(date) >= today;
      }).map((row) => ({ ...row, response_count: counts.get(row.id) || 0 })) as EntraideNeed[]);
      setHelpers((helpersResult.data || []).flatMap((row) => row.id && row.first_name && row.helps_with ? [{ ...row, id: row.id, first_name: row.first_name, helps_with: row.helps_with }] : []) as PublicHelper[]);
      setLoading(false);
    };
    void load();
  }, []);

  const setHubView = (next: HubView) => {
    setView(next);
    const copy = new URLSearchParams(params);
    if (next === "helpers") copy.set("vue", "autour"); else copy.delete("vue");
    setParams(copy, { replace: true });
    if (next === "helpers") setMapOpen(window.matchMedia("(min-width: 768px)").matches);
  };

  const locateCity = async () => {
    if (city.trim().length < 2 || locating) return;
    setLocating(true);
    const result = await geocodeCity(city, "FR");
    setLocating(false);
    if (result) {
      setOrigin([result.lat, result.lng]);
      setMapOpen(true);
    }
  };

  const needDistance = (need: EntraideNeed) => origin && need.latitude !== null && need.longitude !== null
    ? haversineDistance(origin[0], origin[1], need.latitude, need.longitude) : null;
  const helperDistance = (helper: PublicHelper) => origin && helper.latitude_approx !== null && helper.longitude_approx !== null
    ? haversineDistance(origin[0], origin[1], helper.latitude_approx, helper.longitude_approx) : null;

  const sortedNeeds = useMemo(() => [...needs].sort((a, b) => {
    const aDistance = needDistance(a); const bDistance = needDistance(b);
    if (aDistance === null) return bDistance === null ? 0 : 1;
    if (bDistance === null) return -1;
    return aDistance - bDistance;
  }), [needs, origin]);
  const filteredHelpers = useMemo(() => filterPublicHelpers(helpers, query).sort((a, b) => {
    const aDistance = helperDistance(a); const bDistance = helperDistance(b);
    if (aDistance === null) return bDistance === null ? 0 : 1;
    if (bDistance === null) return -1;
    return aDistance - bDistance;
  }), [helpers, origin, query]);

  const goNeed = () => navigate(isAuthenticated ? "/petites-missions/creer" : "/inscription?redirect=/petites-missions/creer");
  const goHelp = async () => {
    if (!isAuthenticated || !user?.id) {
      navigate("/inscription?redirect=/petites-missions?vue=autour");
      return;
    }
    await supabase.from("profiles").update({ available_for_help: true }).eq("id", user.id);
    setHubView("helpers");
    toast.success("Vous serez prévenu quand quelqu'un près de chez vous aura besoin. Vous direz oui ou non à chaque fois.");
    void trackEvent("mission_can_help", { metadata: { source: "hub", action: "helper_enabled" } });
  };

  const helperPersonSchemas = helpers.map((helper) => ({
    "@context": "https://schema.org",
    "@type": "Person",
    name: helper.first_name,
    description: helper.helps_with,
    address: helper.city ? { "@type": "PostalAddress", addressLocality: helper.city } : undefined,
  }));

  return (
    <>
      <PageMeta title="Entraide près de chez vous, Guardiens" description="Découvrez les besoins et les gens du coin disponibles pour un coup de main." path="/petites-missions" jsonLd={[faqSchema, ...helperPersonSchemas]} />
      <PageBreadcrumb items={[{ label: "Entraide" }]} />
      <main className="min-w-0 bg-background pb-24">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <EntraideHubIntro isAuthenticated={isAuthenticated} onNeed={goNeed} onHelp={goHelp} />

          <section className="pt-8" aria-labelledby="entraide-discovery-title">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-primary">Près de chez vous</p>
                <h2 id="entraide-discovery-title" className="font-heading text-2xl font-semibold text-foreground">Le coin en mouvement</h2>
              </div>
              <div className="inline-grid grid-cols-2 rounded-lg border border-border bg-muted p-1" role="tablist" aria-label="Choisir une vue">
                <Button type="button" variant={view === "needs" ? "default" : "ghost"} size="sm" role="tab" aria-selected={view === "needs"} onClick={() => setHubView("needs")}>Besoins</Button>
                <Button type="button" variant={view === "helpers" ? "default" : "ghost"} size="sm" role="tab" aria-selected={view === "helpers"} onClick={() => setHubView("helpers")}>Autour de vous</Button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
              {view === "helpers" ? <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un prénom, une ville ou un coup de main" aria-label="Rechercher parmi les gens du coin" /> : <div />}
              <div className="flex gap-2">
                <Input value={city} onChange={(event) => setCity(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void locateCity(); }} placeholder="Votre ville" aria-label="Votre ville" className="min-w-0 sm:w-48" />
                <Button type="button" variant="outline" onClick={locateCity} disabled={locating}>{locating ? "Recherche..." : "Situer"}</Button>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <div className="inline-grid grid-cols-2 rounded-lg border border-border bg-muted p-1" role="group" aria-label="Affichage des résultats">
                <Button type="button" variant={!mapOpen ? "default" : "ghost"} size="sm" onClick={() => setMapOpen(false)}>Liste</Button>
                <Button type="button" variant={mapOpen ? "default" : "ghost"} size="sm" onClick={() => setMapOpen(true)}>Carte</Button>
              </div>
            </div>
            {mapOpen && (
              <div className="mt-3">
                <Suspense fallback={<div className="h-[360px] animate-pulse rounded-lg bg-muted" />}>
                  <EntraideMap needs={sortedNeeds} helpers={filteredHelpers} focus={origin} />
                </Suspense>
              </div>
            )}

            {loading ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2" aria-busy="true">{[0, 1, 2, 3].map((item) => <div key={item} className="h-40 animate-pulse rounded-lg bg-muted" />)}</div>
            ) : mapOpen ? null : view === "needs" ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">{sortedNeeds.map((need) => <NeedCard key={need.id} need={need} distance={needDistance(need)} showDistance={origin !== null} />)}</div>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2">{filteredHelpers.map((helper) => <HelperCard key={helper.id} helper={helper} distance={helperDistance(helper)} showDistance={origin !== null} />)}</div>
            )}

            {!loading && view === "needs" && sortedNeeds.length === 0 && <p className="mt-5 rounded-lg border border-border p-5 text-sm text-muted-foreground">Le prochain besoin apparaîtra ici. Les gens du coin restent visibles dans l'autre vue.</p>}
            {!loading && view === "helpers" && filteredHelpers.length === 0 && <p className="mt-5 rounded-lg border border-border p-5 text-sm text-muted-foreground">Essayez un autre mot pour découvrir les personnes disponibles.</p>}
          </section>

          <section className="mt-14 border-y border-border py-8" aria-labelledby="credoc-title">
            <p className="text-sm font-semibold text-primary">54 %</p>
            <h2 id="credoc-title" className="mt-1 font-heading text-xl font-semibold text-foreground">54 % des Français échangent régulièrement avec les gens qui habitent près de chez eux (CRÉDOC, Solitudes 2025).</h2>
            <a className="mt-3 inline-block text-sm font-semibold text-primary underline underline-offset-4" href="/actualites/technologie-recreer-lien-pres-de-chez-soi">Lire l'article</a>
          </section>
          <EntraideFaq />
        </div>
      </main>
    </>
  );
};

export default EntraideHub;