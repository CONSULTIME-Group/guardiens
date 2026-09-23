import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageMeta from "@/components/PageMeta";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import { HelperCard, NeedRow, type EntraideNeed, type NeedRowState, type PublicHelper } from "@/components/entraide/EntraideCards";
import type { MissionBadgeRow } from "@/components/missions/MissionBadgesReceived";
import EntraideProofs from "@/components/entraide/EntraideProofs";
import { useAuth } from "@/contexts/AuthContext";
import { useAccessLevel } from "@/hooks/useAccessLevel";
import { supabase } from "@/integrations/supabase/client";
import { geocodeCity } from "@/lib/geocode";
import { trackEvent } from "@/lib/analytics";
import { lazyWithRetry as lazy } from "@/lib/lazyWithRetry";
import { MISSIONS_CITIES, MISSIONS_CITY_SLUGS } from "@/data/missionsCityContent";
import {
  HELPERS_PAGE_SIZE,
  distanceFrom,
  isSectorQuiet,
  memberSubtitle,
  nearestDistanceKm,
  sortByDistance,
  type Origin,
} from "@/lib/entraideHubModel";
import { QUICK_CAN_HELP_MESSAGE, respondToMission } from "@/lib/missionRespond";
import { toast } from "sonner";

const EntraideMap = lazy(() => import("@/components/entraide/EntraideMap"), "EntraideMap");

const FAQ = [
  { question: "Comment trouver un coup de main près de chez vous ?", answer: "Indiquez votre ville pour classer les besoins et les personnes disponibles par proximité." },
  { question: "Que faire quand le fil est calme aujourd'hui ?", answer: "Décrivez votre besoin. Il reste visible dans le fil et les personnes disponibles près de chez vous le reçoivent." },
  { question: "Faut-il payer pour utiliser l'Entraide ?", answer: "L'Entraide est ouverte à tous les membres. Vous convenez ensemble d'un service ou d'une attention en retour." },
  { question: "Quelle différence avec une garde de maison ?", answer: "L'Entraide répond à un besoin ponctuel et court dans la journée. Une garde de maison couvre un séjour de plusieurs jours sur place." },
] as const;

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })),
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

/** En-tête compact du membre : origine automatique, statut d'aide, action principale. */
export const EntraideMemberHeader = ({ subtitle, availableForHelp, onNeed, onHelp, locationField }: {
  subtitle: string | null;
  availableForHelp: boolean;
  onNeed: () => void;
  onHelp: () => void;
  locationField: React.ReactNode;
}) => (
  <header className="pb-6 pt-3">
    <p className="text-sm font-semibold text-primary">Entraide</p>
    <h1 className="mt-2 font-heading text-3xl font-bold leading-tight text-foreground sm:text-4xl">Besoins près de chez vous</h1>
    <p className="mt-3 max-w-2xl text-base text-muted-foreground">
      {subtitle || "Indiquez votre ville pour voir les besoins les plus proches."}
    </p>
    {locationField}
    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
      <Button onClick={onNeed}>Demander un coup de main</Button>
      {availableForHelp ? (
        <p className="text-sm text-muted-foreground">
          Vous êtes disponible pour aider. Vous recevez les besoins publiés près de chez vous.{" "}
          <Link to="/profile?section=skills" className="font-semibold text-primary underline underline-offset-4">Modifier</Link>
        </p>
      ) : (
        <Button variant="outline" onClick={onHelp}>Me rendre disponible pour aider</Button>
      )}
    </div>
  </header>
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

interface MemberProfile {
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  available_for_help: boolean;
}

const EntraideHub = () => {
  const { isAuthenticated, user } = useAuth();
  const { canApplyMissions } = useAccessLevel();
  const navigate = useNavigate();
  const [needs, setNeeds] = useState<EntraideNeed[]>([]);
  const [helpers, setHelpers] = useState<PublicHelper[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState("");
  const [searchedOrigin, setSearchedOrigin] = useState<Origin>(null);
  const [searchedCity, setSearchedCity] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [showLocationField, setShowLocationField] = useState(false);
  // Liste par défaut partout, mobile et ordinateur, connecté ou non.
  const [mapOpen, setMapOpen] = useState(false);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [myResponses, setMyResponses] = useState<Set<string>>(new Set());
  const [responding, setResponding] = useState<string | null>(null);
  const [helpersShown, setHelpersShown] = useState(HELPERS_PAGE_SIZE);
  const [counts, setCounts] = useState<Map<string, { given_count: number | null; received_count: number | null }>>(new Map());
  const [badges, setBadges] = useState<Map<string, MissionBadgeRow[]>>(new Map());

  useEffect(() => {
    const load = async () => {
      const [needsResult, helpersResult, countsResult] = await Promise.all([
        supabase.from("public_small_missions").select("id, user_id, slug, title, city, category, date_needed, end_date, latitude, longitude, photos, sit_mode").eq("status", "open").eq("mission_type", "besoin").order("created_at", { ascending: false }),
        supabase.from("public_helpers").select("id, first_name, avatar_url, city, latitude_approx, longitude_approx, helps_with"),
        supabase.from("public_mission_response_counts").select("mission_id, response_count"),
      ]);
      const responseCounts = new Map((countsResult.data || []).map((row) => [row.mission_id, row.response_count || 0]));
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setNeeds((needsResult.data || []).filter((row) => {
        const date = row.end_date || row.date_needed;
        return !date || new Date(date) >= today;
      }).map((row) => ({ ...row, response_count: responseCounts.get(row.id) || 0 })) as EntraideNeed[]);
      setHelpers((helpersResult.data || []).flatMap((row) => row.id && row.first_name ? [{ ...row, id: row.id, first_name: row.first_name }] : []) as PublicHelper[]);
      setLoading(false);
    };
    void load();
  }, []);

  // Membre connecté : origine et réponses déjà données, deux lectures.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const load = async () => {
      const [profileResult, responsesResult] = await Promise.all([
        supabase.from("profiles").select("city, latitude, longitude, available_for_help").eq("id", user.id).maybeSingle(),
        supabase.from("small_mission_responses").select("mission_id").eq("responder_id", user.id),
      ]);
      if (cancelled) return;
      if (profileResult.data) setProfile(profileResult.data as MemberProfile);
      setMyResponses(new Set((responsesResult.data || []).map((row) => row.mission_id)));
    };
    void load();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Identité stable de l'origine : sans ce useMemo, chaque rendu produit un
  // nouveau tableau, ce qui relance les tris, les requêtes groupées et boucle.
  const origin: Origin = useMemo(() => {
    if (searchedOrigin) return searchedOrigin;
    if (profile?.latitude !== null && profile?.latitude !== undefined && profile?.longitude !== null && profile?.longitude !== undefined) {
      return [profile.latitude, profile.longitude];
    }
    return null;
  }, [searchedOrigin, profile?.latitude, profile?.longitude]);

  const originCity = searchedCity || profile?.city || null;

  const needDistance = useCallback((need: EntraideNeed) => distanceFrom(origin, need.latitude, need.longitude), [origin]);
  const helperDistance = useCallback((helper: PublicHelper) => distanceFrom(origin, helper.latitude_approx, helper.longitude_approx), [origin]);

  const sortedNeeds = useMemo(
    () => (origin ? sortByDistance(needs, needDistance) : needs),
    [needs, origin, needDistance],
  );
  const sortedHelpers = useMemo(
    () => (origin ? sortByDistance(helpers, helperDistance) : helpers),
    [helpers, origin, helperDistance],
  );
  const visibleHelpers = useMemo(() => sortedHelpers.slice(0, helpersShown), [sortedHelpers, helpersShown]);

  // Compteurs et écussons des personnes affichées, une requête groupée chacune.
  useEffect(() => {
    const ids = visibleHelpers.map((helper) => helper.id);
    if (ids.length === 0) return;
    let cancelled = false;
    const load = async () => {
      const [countsResult, badgesResult] = await Promise.all([
        supabase.from("public_help_counts").select("user_id, given_count, received_count").in("user_id", ids),
        supabase.from("profile_mission_badges" as never).select("user_id, badge_key, earned_count, last_earned_at").in("user_id", ids),
      ]);
      if (cancelled) return;
      setCounts(new Map((countsResult.data || []).map((row) => [row.user_id as string, { given_count: row.given_count, received_count: row.received_count }])));
      const grouped = new Map<string, MissionBadgeRow[]>();
      for (const row of (badgesResult.data || []) as unknown as (MissionBadgeRow & { user_id: string })[]) {
        grouped.set(row.user_id, [...(grouped.get(row.user_id) || []), row]);
      }
      setBadges(grouped);
    };
    void load();
    return () => { cancelled = true; };
  }, [visibleHelpers]);

  const nearest = useMemo(() => nearestDistanceKm(sortedNeeds.map(needDistance)), [sortedNeeds, needDistance]);
  const sectorQuiet = isSectorQuiet(origin, nearest, sortedNeeds.length);

  const locate = async () => {
    if (city.trim().length < 2 || locating) return;
    setLocating(true);
    const result = await geocodeCity(city, "FR");
    setLocating(false);
    if (result) {
      setSearchedOrigin([result.lat, result.lng]);
      setSearchedCity(city.trim());
    }
  };

  const goNeed = () => navigate(isAuthenticated ? "/petites-missions/creer" : "/inscription?redirect=/petites-missions/creer");
  const goHelp = async () => {
    if (!isAuthenticated || !user?.id) {
      navigate("/inscription?redirect=/petites-missions");
      return;
    }
    await supabase.from("profiles").update({ available_for_help: true }).eq("id", user.id);
    setProfile((prev) => (prev ? { ...prev, available_for_help: true } : prev));
    toast.success("Vous serez prévenu quand quelqu'un près de chez vous aura besoin. Vous direz oui ou non à chaque fois.");
    void trackEvent("mission_can_help", { metadata: { source: "hub", action: "helper_enabled" } });
  };

  const needState = (need: EntraideNeed): NeedRowState => {
    if (user?.id && need.user_id === user.id) return "own";
    if (myResponses.has(need.id)) return "responded";
    return "default";
  };

  const detailPath = (need: EntraideNeed) => `/petites-missions/${need.slug || need.id}`;

  const canHelp = async (need: EntraideNeed) => {
    if (!isAuthenticated || !user?.id) {
      navigate(`/inscription?redirect=${encodeURIComponent(detailPath(need))}`);
      return;
    }
    if (!canApplyMissions) {
      navigate(detailPath(need));
      return;
    }
    if (responding) return;
    setResponding(need.id);
    void trackEvent("mission_can_help", { metadata: { mission_id: need.id, source: "hub_list" } });
    const outcome = await respondToMission({ missionId: need.id, userId: user.id, message: QUICK_CAN_HELP_MESSAGE });
    setResponding(null);
    switch (outcome.kind) {
      case "sent":
        setMyResponses((prev) => new Set(prev).add(need.id));
        toast.success("Réponse envoyée. La personne qui demande va être prévenue.");
        break;
      case "duplicate":
        setMyResponses((prev) => new Set(prev).add(need.id));
        toast.info("Vous avez déjà proposé votre aide pour ce besoin.");
        break;
      case "closed":
        toast.error("Ce besoin est clôturé. Il accepte de nouvelles réponses plus tard.");
        break;
      case "own_mission":
        toast.info("Ce besoin est le vôtre.");
        break;
      case "account_not_active":
        toast.error("Contactez le support pour rétablir l'accès à l'entraide.");
        break;
      case "cap_reached":
        toast.info("5 personnes ont déjà proposé leur aide. Une place se libérera si l'auteur en décline une.");
        break;
      case "missing":
        toast.error("Ce besoin est introuvable.");
        break;
      default:
        toast.error("Réessayez dans un instant.");
    }
  };

  const locationField = (
    <div className="mt-4">
      {showLocationField || !origin ? (
        <div className="flex max-w-md gap-2">
          <Input value={city} onChange={(event) => setCity(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void locate(); }} placeholder="Votre ville" aria-label="Votre ville" className="min-w-0" />
          <Button type="button" variant="outline" onClick={locate} disabled={locating}>{locating ? "Recherche..." : "Afficher"}</Button>
        </div>
      ) : (
        <button type="button" onClick={() => setShowLocationField(true)} className="text-sm font-semibold text-primary underline underline-offset-4">
          Changer de lieu
        </button>
      )}
    </div>
  );

  const viewToggle = (
    <div className="mt-6 flex justify-end">
      <div className="inline-grid grid-cols-2 rounded-lg border border-border bg-muted p-1" role="group" aria-label="Affichage des résultats">
        <Button type="button" variant={!mapOpen ? "default" : "ghost"} size="sm" onClick={() => setMapOpen(false)}>Liste</Button>
        <Button type="button" variant={mapOpen ? "default" : "ghost"} size="sm" onClick={() => setMapOpen(true)}>Carte</Button>
      </div>
    </div>
  );

  return (
    <>
      <PageMeta
        title="Entraide près de chez vous, Guardiens"
        description="Trouvez un coup de main près de chez vous, ou proposez le vôtre aux membres du coin."
        path="/petites-missions"
        jsonLd={[faqSchema]}
      />
      <PageBreadcrumb items={[{ label: "Entraide" }]} />
      <div className="min-w-0 bg-background pb-24">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          {isAuthenticated ? (
            <EntraideMemberHeader
              subtitle={memberSubtitle(originCity, nearest)}
              availableForHelp={profile?.available_for_help === true}
              onNeed={goNeed}
              onHelp={goHelp}
              locationField={locationField}
            />
          ) : (
            <>
              <EntraideHubIntro isAuthenticated={isAuthenticated} onNeed={goNeed} onHelp={goHelp} />
              {locationField}
            </>
          )}

          <section className="pt-2" aria-labelledby="entraide-needs-title">
            <h2 id="entraide-needs-title" className="sr-only">Besoins ouverts</h2>
            {viewToggle}

            {mapOpen && (
              <div className="mt-3">
                <Suspense fallback={<div className="h-[360px] animate-pulse rounded-lg bg-muted" />}>
                  <EntraideMap needs={sortedNeeds} helpers={sortedHelpers} focus={origin} />
                </Suspense>
              </div>
            )}

            {sectorQuiet && (
              <div className="mt-5 rounded-lg border border-border bg-card p-5">
                <p className="text-sm font-semibold text-foreground">Le premier besoin de votre secteur peut être le vôtre.</p>
                <Button className="mt-3" onClick={goNeed}>Demander un coup de main</Button>
              </div>
            )}

            {loading ? (
              <div className="mt-5 space-y-3" aria-busy="true">{[0, 1, 2, 3].map((item) => <div key={item} className="h-[96px] animate-pulse rounded-lg bg-muted" />)}</div>
            ) : mapOpen ? null : sortedNeeds.length > 0 ? (
              <ul className="mt-5 space-y-3">
                {sortedNeeds.map((need) => (
                  <NeedRow
                    key={need.id}
                    need={need}
                    distance={needDistance(need)}
                    state={needState(need)}
                    pending={responding === need.id}
                    onCanHelp={() => void canHelp(need)}
                  />
                ))}
              </ul>
            ) : (
              <p className="mt-5 rounded-lg border border-border p-5 text-sm text-muted-foreground">Le prochain besoin apparaîtra ici. Les personnes disponibles restent visibles plus bas.</p>
            )}
          </section>

          <section className="mt-14" aria-labelledby="entraide-helpers-title">
            <h2 id="entraide-helpers-title" className="font-heading text-2xl font-semibold text-foreground">Prêts à aider près de chez vous</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {visibleHelpers.map((helper) => (
                <HelperCard
                  key={helper.id}
                  helper={helper}
                  distance={helperDistance(helper)}
                  showDistance={origin !== null}
                  counts={counts.get(helper.id) ?? null}
                  badgeRows={badges.get(helper.id) ?? []}
                />
              ))}
            </div>
            {sortedHelpers.length > visibleHelpers.length && (
              <Button variant="outline" className="mt-5" onClick={() => setHelpersShown((shown) => shown + HELPERS_PAGE_SIZE)}>
                Voir {HELPERS_PAGE_SIZE} de plus
              </Button>
            )}
          </section>

          <EntraideProofs origin={origin} />

          <nav className="mt-10 border-y border-border py-4 text-sm text-muted-foreground" aria-label="Entraide dans votre ville">
            <span>Dans votre ville : </span>
            {MISSIONS_CITY_SLUGS.map((slug, index) => (
              <span key={slug}>
                {index > 0 && ", "}
                <Link to={`/petites-missions/${slug}`} className="font-semibold text-primary underline-offset-4 hover:underline">{MISSIONS_CITIES[slug].cityName}</Link>
              </span>
            ))}
          </nav>

          <section className="mt-14 border-y border-border py-8" aria-labelledby="credoc-title">
            <p className="text-sm font-semibold text-primary">54 %</p>
            <h2 id="credoc-title" className="mt-1 font-heading text-xl font-semibold text-foreground">54 % des Français échangent régulièrement avec les gens qui habitent près de chez eux (CRÉDOC, Solitudes 2025).</h2>
            <a className="mt-3 inline-block text-sm font-semibold text-primary underline underline-offset-4" href="/actualites/technologie-recreer-lien-pres-de-chez-soi">Lire l'article</a>
          </section>
          <EntraideFaq />
        </div>
      </div>
    </>
  );
};

export default EntraideHub;
