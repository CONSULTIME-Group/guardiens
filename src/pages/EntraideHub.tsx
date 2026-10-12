import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageMeta from "@/components/PageMeta";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import { HelperCard, NeedRow, openHelperConversation, type EntraideNeed, type NeedRowState, type PublicHelper } from "@/components/entraide/EntraideCards";
import type { MissionBadgeRow } from "@/components/missions/MissionBadgesReceived";
import EntraideProofs from "@/components/entraide/EntraideProofs";
import { useAuth } from "@/contexts/AuthContext";
import { useAccessLevel } from "@/hooks/useAccessLevel";
import MutualAidRadiusLine from "@/components/entraide/MutualAidRadiusLine";
import { supabase } from "@/integrations/supabase/client";
import { geocodeCity } from "@/lib/geocode";
import { trackEvent } from "@/lib/analytics";
import { lazyWithRetry as lazy } from "@/lib/lazyWithRetry";
import { MISSIONS_CITIES, MISSIONS_CITY_SLUGS } from "@/data/missionsCityContent";
import {
  HELPERS_PAGE_SIZE,
  distanceFrom,
  NEARBY_THRESHOLD_KM,
  sortByDistance,
  type Origin,
} from "@/lib/entraideHubModel";
import {
  HELPERS_FIRST_SHOWN,
  helpersCountLine,
  helpersMore,
  farNeedsLabel,
  farNeedsHeading,
  farNeedsOpenByDefault,
  NEEDS_SHOWN_WITHOUT_PLACE,
  helpersSectionTitle,
  needFormPath,
  type EntraideIdeaKey,
} from "@/lib/entraideIdeas";
import EntraideIdeas from "@/components/entraide/EntraideIdeas";
import { respondToMission } from "@/lib/missionRespond";
import CanHelpDialog from "@/components/entraide/CanHelpDialog";
import { toast } from "sonner";
import { capitalizeFirstName } from "@/lib/displayName";
import { sortHelpers } from "@/lib/helperDisplay";

const EntraideMap = lazy(() => import("@/components/entraide/EntraideMap"), "EntraideMap");

const FAQ = [
  { question: "Comment trouver un coup de main près de chez vous ?", answer: "Indiquez votre ville : les besoins et les personnes disponibles sont classés par proximité." },
  { question: "Que faire quand le fil est calme ?", answer: "Décrivez votre besoin. Il part vers les membres disponibles les plus proches et reste visible dans le fil." },
  { question: "Faut-il payer pour utiliser l'Entraide ?", answer: "Guardiens est gratuit. Entre membres, l'échange se fait en services ou en attentions, convenus ensemble." },
  { question: "Quelle différence avec une garde de maison ?", answer: "L'Entraide répond à un besoin court et ponctuel. Une garde de maison couvre un séjour de plusieurs jours sur place." },
] as const;

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })),
};

const HOW_STEPS = [
  "Vous décrivez le coup de main et le moment qui vous convient.",
  "Votre demande part vers les personnes disponibles les plus proches, dix à la fois.",
  "Quelqu'un répond « Je peux », vous convenez ensemble du moment et d'un service ou d'une attention en retour.",
] as const;

/**
 * Lot E4 : en-tête unique, visiteur et membre. Un seul bouton plein
 * (« Demander un coup de main ») ; « Proposer mon aide » en second plan,
 * remplacé par la ligne de rayon quand la personne aide déjà.
 */
export const EntraideHubIntro = ({ city, countLine, showHelp, onNeed, onHelp, children }: {
  city: string | null;
  countLine: string | null;
  showHelp: boolean;
  onNeed: () => void;
  onHelp: () => void;
  children?: React.ReactNode;
}) => (
  <header className="pb-2 pt-3">
    <p className="text-xs font-semibold uppercase tracking-wide text-primary">{city ? `Entraide · autour de ${city}` : "Entraide"}</p>
    <h1 className="mt-2 max-w-3xl font-heading text-[1.75rem] font-bold leading-tight text-foreground sm:text-[2.5rem]">
      Entraide et coups de main près de chez vous
    </h1>
    <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
      {countLine ? `${countLine} ` : ""}
      <span className="hidden sm:inline">Le potager à arroser, les courses, un trajet, une partie de jeux de société : dites simplement ce qu'il vous faut.</span>
      <span className="sm:hidden">Dites simplement ce qu'il vous faut.</span>
    </p>
    <div className="mt-5 flex flex-row flex-wrap items-center gap-3">
      <Button onClick={onNeed}>Demander un coup de main</Button>
      {showHelp && <Button variant="outline" onClick={onHelp}>Proposer mon aide</Button>}
    </div>
    {children}
  </header>
);

export const EntraideHowItWorks = () => (
  <section className="mt-12" aria-labelledby="entraide-how-title">
    <h2 id="entraide-how-title" className="font-heading text-2xl font-semibold text-foreground">Comment ça se passe</h2>
    <ol className="mt-5 grid gap-4 sm:grid-cols-3">
      {HOW_STEPS.map((step, index) => (
        <li key={step} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
          <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary font-heading text-sm font-semibold text-secondary-foreground">{index + 1}</span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  </section>
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
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [myResponses, setMyResponses] = useState<Set<string>>(new Set());
  const [responding, setResponding] = useState<string | null>(null);
  const [confirmNeed, setConfirmNeed] = useState<EntraideNeed | null>(null);
  const [confirmFirstName, setConfirmFirstName] = useState<string | null>(null);
  const [helpersShown, setHelpersShown] = useState(HELPERS_FIRST_SHOWN);
  // Lot E11 : null tant que le membre n'a pas choisi ; sinon son choix.
  const [farOpen, setFarOpen] = useState<boolean | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [counts, setCounts] = useState<Map<string, { given_count: number | null; received_count: number | null }>>(new Map());
  const [badges, setBadges] = useState<Map<string, MissionBadgeRow[]>>(new Map());

  useEffect(() => {
    const load = async () => {
      const [needsResult, helpersResult, countsResult] = await Promise.all([
        supabase.from("public_small_missions").select("id, user_id, slug, title, city, category, date_needed, end_date, latitude, longitude, photos, sit_mode").eq("status", "open").eq("mission_type", "besoin").order("created_at", { ascending: false }),
        supabase.from("public_helpers").select("id, first_name, avatar_url, city, latitude_approx, longitude_approx, helps_with, competences, last_active_on"),
        supabase.from("public_mission_response_counts").select("mission_id, response_count"),
      ]);
      const responseCounts = new Map((countsResult.data || []).map((row) => [row.mission_id, row.response_count || 0]));
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      // Les projets participatifs ont leur propre page (/projets).
      const openNeeds = (needsResult.data || []).filter((row) => {
        if (row.category === "projet") return false;
        const date = row.end_date || row.date_needed;
        return !date || new Date(date) >= today;
      });
      // Portraits des auteurs d'annonces sans photo : une seule lecture groupée
      // sur la vue publique (l'auteur n'est pas forcément un aidant).
      const authorIds = [...new Set(openNeeds.filter((row) => !row.photos?.[0] && row.user_id).map((row) => row.user_id as string))];
      const authors = new Map<string, { avatar_url: string | null; first_name: string | null }>();
      if (authorIds.length > 0) {
        const { data: authorRows } = await supabase.from("public_profiles").select("id, first_name, avatar_url").in("id", authorIds);
        for (const row of authorRows || []) if (row.id) authors.set(row.id, { avatar_url: row.avatar_url, first_name: row.first_name });
      }
      setNeeds(openNeeds.map((row) => {
        const author = row.user_id ? authors.get(row.user_id) : undefined;
        return { ...row, response_count: responseCounts.get(row.id) || 0, author_avatar_url: author?.avatar_url ?? null, author_first_name: author?.first_name ?? null };
      }) as EntraideNeed[]);
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
        supabase.from("small_mission_responses").select("mission_id").eq("responder_id", user.id).in("status", ["pending", "accepted"]),
      ]);
      if (cancelled) return;
      if (profileResult.data) setProfile(profileResult.data as MemberProfile);
      setProfileLoaded(true);
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

  const originCity = capitalizeFirstName(searchedCity || profile?.city) || null;

  const needDistance = useCallback((need: EntraideNeed) => distanceFrom(origin, need.latitude, need.longitude), [origin]);
  const helperDistance = useCallback((helper: PublicHelper) => distanceFrom(origin, helper.latitude_approx, helper.longitude_approx), [origin]);

  const sortedNeeds = useMemo(
    () => (origin ? sortByDistance(needs, needDistance) : needs),
    [needs, origin, needDistance],
  );
  const sortedHelpers = useMemo(
    () => {
      const otherHelpers = user?.id ? helpers.filter((helper) => helper.id !== user.id) : helpers;
      // Lot E3 : celles et ceux qui disent pour quoi ils peuvent aider d'abord, puis la distance.
      return sortHelpers(otherHelpers, origin ? helperDistance : null);
    },
    [helpers, origin, helperDistance, user?.id],
  );
  const visibleHelpers = useMemo(() => sortedHelpers.slice(0, helpersShown), [sortedHelpers, helpersShown]);

  // Compteurs et écussons des personnes affichées, une requête groupée chacune.
  const visibleHelperIds = useMemo(() => visibleHelpers.map((helper) => helper.id).join(","), [visibleHelpers]);
  useEffect(() => {
    const ids = visibleHelperIds ? visibleHelperIds.split(",") : [];
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
  }, [visibleHelperIds]);

  // Lot E4 : besoins proches d'abord, les autres repliés sous « Plus loin ».
  const nearNeeds = useMemo(
    () => (origin
      ? sortedNeeds.filter((need) => { const d = needDistance(need); return d !== null && d <= NEARBY_THRESHOLD_KM; })
      : sortedNeeds.slice(0, NEEDS_SHOWN_WITHOUT_PLACE)),
    [sortedNeeds, origin, needDistance],
  );
  const farNeeds = useMemo(
    () => sortedNeeds.filter((need) => !nearNeeds.includes(need)),
    [sortedNeeds, nearNeeds],
  );
  // Lot E11 : peu de besoins proches, les autres s'affichent d'emblée sous un titre.
  const farDefaultOpen = farNeedsOpenByDefault(origin !== null, nearNeeds.length);
  const farShown = farDefaultOpen || farOpen === true;
  // Membre : on attend son profil (son lieu) avant d'afficher chiffres et besoins.
  const originPending = isAuthenticated && !profileLoaded;
  const pageLoading = loading || originPending;
  const sectorQuiet = origin !== null && !pageLoading && nearNeeds.length === 0;
  const nearHelpersCount = useMemo(
    () => (origin ? sortedHelpers.filter((helper) => { const d = helperDistance(helper); return d !== null && d <= NEARBY_THRESHOLD_KM; }).length : sortedHelpers.length),
    [sortedHelpers, origin, helperDistance],
  );
  // « vous » quand la position est connue sans nom de ville.
  const placeCity = origin ? originCity || "vous" : null;
  const helpersMoreAction = helpersMore(helpersShown, nearHelpersCount, sortedHelpers.length, HELPERS_PAGE_SIZE);

  // Lot E4 : retour d'inscription depuis « Écrire à X » (?contact=<id>).
  useEffect(() => {
    const contactId = searchParams.get("contact");
    if (!contactId || !isAuthenticated || loading) return;
    const next = new URLSearchParams(searchParams);
    next.delete("contact");
    setSearchParams(next, { replace: true });
    const helper = helpers.find((row) => row.id === contactId);
    if (helper && helper.id !== user?.id) void openHelperConversation(helper, navigate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isAuthenticated, loading, helpers]);

  const locate = async () => {
    if (city.trim().length < 2 || locating) return;
    setLocating(true);
    const result = await geocodeCity(city, "FR");
    setLocating(false);
    if (result) {
      setSearchedOrigin([result.lat, result.lng]);
      setSearchedCity(city.trim());
      setShowLocationField(false);
      setHelpersShown(HELPERS_FIRST_SHOWN);
      setFarOpen(null);
    }
  };

  const goNeed = () => navigate(needFormPath(isAuthenticated));
  const pickIdea = (key: EntraideIdeaKey, label: string) => {
    // Lot M1 : tile_id stable (clé de l'idée) et page d'origine du clic.
    void trackEvent("entraide_idea_tile_clicked", {
      metadata: {
        tile_id: key,
        source: typeof window !== "undefined" ? window.location.pathname : null,
        idea: key,
        authenticated: isAuthenticated,
      },
    });
    navigate(needFormPath(isAuthenticated, label));
  };
  const goHelp = async () => {
    if (!isAuthenticated || !user?.id) {
      navigate("/inscription?redirect=/petites-missions");
      return;
    }
    await supabase.from("profiles").update({ available_for_help: true }).eq("id", user.id);
    setProfile((prev) => (prev ? { ...prev, available_for_help: true } : prev));
    toast.success("C'est noté. Vous recevrez les besoins publiés près de chez vous, et vous choisirez ceux qui vous parlent.");
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
    setConfirmFirstName(null);
    setConfirmNeed(need);
    if (need.user_id) {
      const { data } = await supabase.from("public_profiles").select("first_name").eq("id", need.user_id).maybeSingle();
      setConfirmFirstName(capitalizeFirstName((data as { first_name?: string | null } | null)?.first_name) || null);
    }
  };

  const sendCanHelp = async (need: EntraideNeed, message: string) => {
    if (!user?.id || responding) return;
    setResponding(need.id);
    void trackEvent("mission_can_help", { metadata: { mission_id: need.id, source: "hub_list" } });
    const outcome = await respondToMission({ missionId: need.id, userId: user.id, message });
    setResponding(null);
    setConfirmNeed(null);
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
    <div className="flex max-w-md gap-2">
      <Input value={city} onChange={(event) => setCity(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void locate(); }} placeholder="Votre ville" aria-label="Votre ville" className="min-w-0" />
      <Button type="button" variant="outline" onClick={locate} disabled={locating}>{locating ? "Recherche..." : "Afficher"}</Button>
    </div>
  );

  const viewToggle = (
    <div className="flex justify-end">
      <div className="inline-grid grid-cols-2 rounded-lg border border-border bg-muted p-1" role="group" aria-label="Affichage des résultats">
        <Button type="button" variant={!mapOpen ? "default" : "ghost"} size="sm" onClick={() => setMapOpen(false)}>Liste</Button>
        <Button type="button" variant={mapOpen ? "default" : "ghost"} size="sm" onClick={() => setMapOpen(true)}>Carte</Button>
      </div>
    </div>
  );

  return (
    <>
      <PageMeta
        title="Entraide entre particuliers : coups de main près de chez vous | Guardiens"
        description="Jardinage, courses, trajets, une partie de belote : demandez ou proposez un coup de main près de chez vous. Guardiens est gratuit."
        path="/petites-missions"
        jsonLd={[faqSchema]}
      />
      <PageBreadcrumb items={[{ label: "Entraide" }]} />
      <div className="min-w-0 bg-background pb-24">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <EntraideHubIntro
            city={placeCity}
            countLine={pageLoading ? null : helpersCountLine(nearHelpersCount, placeCity)}
            showHelp={!isAuthenticated || (profileLoaded && profile?.available_for_help !== true)}
            onNeed={goNeed}
            onHelp={goHelp}
          >
            <div className="mt-4 space-y-1 text-sm text-muted-foreground">
              {originPending ? null : origin && !showLocationField ? (
                <p>
                  Lieu : {originCity || "votre position"} ·{" "}
                  <button type="button" onClick={() => setShowLocationField(true)} className="font-semibold text-primary underline underline-offset-4">
                    Changer de lieu
                  </button>
                </p>
              ) : locationField}
              {isAuthenticated && <MutualAidRadiusLine availableForHelp={profileLoaded ? profile?.available_for_help === true : null} />}
              {profile?.available_for_help === true && (
                <p>
                  <Link to="/profile?section=savoir-faire" className="font-semibold text-primary underline underline-offset-4">Mes savoir-faire</Link>
                </p>
              )}
            </div>
          </EntraideHubIntro>

          <EntraideIdeas onPick={pickIdea} />

          <section className="pt-2" aria-labelledby="entraide-needs-title">
            <div className="mt-6 flex items-center justify-between gap-3 sm:mt-8 sm:items-end">
              <div className="min-w-0">
                <h2 id="entraide-needs-title" className="font-heading text-xl font-semibold text-foreground sm:text-2xl">Besoins ouverts</h2>
                {placeCity && <p className="hidden text-sm text-muted-foreground sm:block">Autour de {placeCity}</p>}
              </div>
              {viewToggle}
            </div>

            {mapOpen && (
              <div className="mt-3">
                <Suspense fallback={<div className="h-[360px] animate-pulse rounded-lg bg-muted" />}>
                  <EntraideMap needs={sortedNeeds} helpers={sortedHelpers} focus={origin} />
                </Suspense>
              </div>
            )}

            {pageLoading ? (
              <div className="mt-5 space-y-3" aria-busy="true">{[0, 1, 2, 3].map((item) => <div key={item} className="h-[96px] animate-pulse rounded-lg bg-muted" />)}</div>
            ) : mapOpen ? null : (
              <>
                {sectorQuiet ? (
                  <div className="mt-5 rounded-lg border border-border bg-card p-5">
                    <p className="font-heading text-lg font-semibold text-foreground">
                      {placeCity ? `Le fil est calme autour de ${placeCity} aujourd'hui` : "Le fil est calme dans votre secteur aujourd'hui"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">Votre demande sera la première du secteur. Elle part vers les personnes disponibles les plus proches, dix à la fois.</p>
                    <Button variant="outline" className="mt-3" onClick={goNeed}>Écrire ma demande</Button>
                  </div>
                ) : nearNeeds.length > 0 ? (
                  <ul className="mt-5 space-y-3">
                    {nearNeeds.map((need) => (
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

                {farNeeds.length > 0 && (
                  <div className="mt-8">
                    {farDefaultOpen ? (
                      <div>
                        <h3 className="font-heading text-lg font-semibold text-foreground">{farNeedsHeading(farNeeds.length)}</h3>
                        <p className="text-sm text-muted-foreground">Pour celles et ceux qui passent par là, ou qui ont de la famille dans le coin.</p>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        aria-expanded={farShown}
                        aria-controls="entraide-far-needs"
                        onClick={() => setFarOpen(!farShown)}
                        className="h-auto whitespace-normal py-2 text-left"
                      >
                        {farNeedsLabel(farNeeds.length, origin !== null)}
                      </Button>
                    )}
                    <ul id="entraide-far-needs" hidden={!farShown} className="mt-3 space-y-3">
                      {farNeeds.map((need) => (
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
                  </div>
                )}
              </>
            )}
          </section>

          <EntraideHowItWorks />

          <section className="mt-14" aria-labelledby="entraide-helpers-title">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Le pouls de la communauté</p>
            <h2 id="entraide-helpers-title" className="mt-1 font-heading text-2xl font-semibold text-foreground">{helpersSectionTitle(nearHelpersCount, placeCity)}</h2>
            <p className="mt-2 text-sm text-muted-foreground">Aider, c'est aussi se faire du bien.</p>
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
            {helpersMoreAction && (
              <Button variant="outline" className="mt-5" onClick={() => setHelpersShown(helpersMoreAction.next)}>
                {helpersMoreAction.label}
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
          <CanHelpDialog
            open={confirmNeed !== null}
            firstName={confirmFirstName}
            needTitle={confirmNeed?.title || ""}
            sending={responding !== null}
            onCancel={() => setConfirmNeed(null)}
            onSend={(message) => { if (confirmNeed) void sendCanHelp(confirmNeed, message); }}
          />
        </div>
      </div>
    </>
  );
};

export default EntraideHub;
