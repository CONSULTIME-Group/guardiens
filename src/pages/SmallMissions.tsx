import { useState } from "react";
import entraideHeader from "@/assets/entraide-header.jpg";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dog, Flower2, Handshake, ArrowRight, Lock, X, Sprout, PawPrint, GraduationCap, Star } from "lucide-react";
import PageMeta from "@/components/PageMeta";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { useAccessLevel } from "@/hooks/useAccessLevel";
import AccessGateBanner from "@/components/access/AccessGateBanner";
import ProposeExchangeDialog from "@/components/missions/ProposeExchangeDialog";

const CATEGORY_META: Record<string, { label: string; icon: typeof Dog; colorClass: string }> = {
  animals: { label: "Animaux", icon: Dog, colorClass: "text-primary" },
  garden: { label: "Jardin", icon: Flower2, colorClass: "text-primary" },
  skills: { label: "Compétences", icon: Handshake, colorClass: "text-primary" },
  coups_de_main: { label: "Coups de main", icon: Handshake, colorClass: "text-primary" },
};

const MISSION_TO_SKILL: Record<string, string> = {
  animals: "animaux",
  garden: "jardin",
  skills: "competences",
  coups_de_main: "coups_de_main",
};
const SKILL_TO_MISSION: Record<string, string> = {
  animaux: "animals",
  jardin: "garden",
  competences: "skills",
  coups_de_main: "coups_de_main",
};

const SKILL_PILL_META: Record<string, { label: string; icon: typeof Sprout }> = {
  jardin: { label: "Jardin", icon: Sprout },
  animaux: { label: "Animaux", icon: PawPrint },
  competences: { label: "Compétences", icon: GraduationCap },
  coups_de_main: { label: "Coups de main", icon: Handshake },
};

const DURATION_LABELS: Record<string, string> = {
  half_day: "Demi-journée",
  full_day: "Journée",
  weekend: "Week-end",
  week: "Semaine",
};

function formatCity(city: string): string {
  return city.replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDuration(raw: string): string {
  return DURATION_LABELS[raw] || raw;
}

const EXAMPLES = [
  { cat: "animals", title: "Promener Filou 3 fois cette semaine", exchange: "Plateau de fromages maison et une bonne bouteille" },
  { cat: "animals", title: "Nourrir mes 4 chats samedi et dimanche matin", exchange: "Un dîner à mon retour, je cuisine bien !" },
  { cat: "animals", title: "Accompagner mon chien chez le véto mercredi", exchange: "Confitures maison (abricot et figue)" },
  { cat: "animals", title: "Garder mes 3 poules le week-end du 15 juin", exchange: "Les œufs sont pour vous !" },
  { cat: "garden", title: "Arroser le potager pendant 5 jours", exchange: "Servez-vous dans les tomates et les courgettes !" },
  { cat: "garden", title: "Coup de main pour tailler la haie samedi", exchange: "BBQ à midi, je m'occupe de tout" },
  { cat: "garden", title: "Tondre la pelouse une fois par semaine en juillet", exchange: "Profitez du jardin, de la piscine, et du hamac" },
  { cat: "skills", title: "Véto à la retraite — questions sur votre chien", exchange: "Le plaisir de voir des animaux heureux" },
  { cat: "skills", title: "Dog-training : les bases (rappel, marche en laisse)", exchange: "Un bon café et une balade ensemble" },
];

type CategoryFilter = "all" | "animals" | "garden" | "skills" | "coups_de_main" | "mine";
type ModeFilter = "need" | "offer";

const SmallMissions = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const { hasAccess, status: subStatus } = useSubscriptionAccess();
  const { level: accessLevel, profileCompletion, canApplyMissions } = useAccessLevel();
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [mode, setMode] = useState<ModeFilter>("need");
  const [dialogMission, setDialogMission] = useState<any>(null);
  const [dialogTarget, setDialogTarget] = useState<{ id: string; name: string } | null>(null);
  const [skillPromptDismissed, setSkillPromptDismissed] = useState(() => {
    try { return localStorage.getItem("guardiens_skill_prompt_dismissed") === "true"; } catch { return false; }
  });

  const { data: currentUserProfile } = useQuery({
    queryKey: ["my-profile-skills", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("skill_categories, available_for_help")
        .eq("id", user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const mySkills: string[] = (currentUserProfile as any)?.skill_categories || [];

  const { data: allMissions } = useQuery({
    queryKey: ["small-missions-all"],
    queryFn: async () => {
      const { data: missions } = await supabase
        .from("small_missions")
        .select("*, profiles:user_id(first_name, avatar_url)")
        .in("status", ["open", "in_progress", "completed"] as any[])
        .order("created_at", { ascending: false })
        .limit(50);

      if (!missions || missions.length === 0) return [];

      const missionIds = missions.map((m: any) => m.id);
      const { data: responses } = await supabase
        .from("small_mission_responses")
        .select("mission_id, responder_id")
        .in("mission_id", missionIds);

      const countMap = new Map<string, number>();
      const myResponseSet = new Set<string>();
      (responses || []).forEach((r: any) => {
        countMap.set(r.mission_id, (countMap.get(r.mission_id) || 0) + 1);
        if (r.responder_id === user?.id) myResponseSet.add(r.mission_id);
      });

      return missions.map((m: any) => ({
        ...m,
        response_count: countMap.get(m.id) || 0,
        already_proposed: myResponseSet.has(m.id),
      }));
    },
  });

  const { data: availableHelpers } = useQuery({
    queryKey: ["available-helpers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, avatar_url, city, skill_categories, available_for_help")
        .eq("available_for_help", true)
        .not("skill_categories", "eq", "{}")
        .limit(20);
      if (!data) return [];

      const helperIds = data.map((h: any) => h.id);
      const { data: reviews } = await supabase
        .from("reviews")
        .select("reviewee_id, overall_rating")
        .in("reviewee_id", helperIds)
        .eq("published", true);

      const reviewMap = new Map<string, { count: number; total: number }>();
      (reviews || []).forEach((r: any) => {
        const current = reviewMap.get(r.reviewee_id) || { count: 0, total: 0 };
        reviewMap.set(r.reviewee_id, { count: current.count + 1, total: current.total + r.overall_rating });
      });

      const { data: apps } = await supabase
        .from("applications")
        .select("sitter_id")
        .in("sitter_id", helperIds)
        .eq("status", "accepted");

      const sitsMap = new Map<string, number>();
      (apps || []).forEach((a: any) => {
        sitsMap.set(a.sitter_id, (sitsMap.get(a.sitter_id) || 0) + 1);
      });

      return data
        .filter((h: any) => h.id !== user?.id)
        .map((h: any) => {
          const rev = reviewMap.get(h.id);
          return {
            ...h,
            review_avg: rev ? rev.total / rev.count : 0,
            review_count: rev?.count || 0,
            sits_count: sitsMap.get(h.id) || 0,
          };
        });
    },
    enabled: isAuthenticated,
  });

  const filteredMissions = (allMissions || [])
    .filter((m: any) => {
      if (m.category === "house") return false;
      if (categoryFilter === "mine") return m.user_id === user?.id;
      if (categoryFilter !== "all" && m.category !== categoryFilter) return false;
      return true;
    })
    .sort((a: any, b: any) => {
      const order: Record<string, number> = { open: 0, in_progress: 1, completed: 2 };
      const diff = (order[a.status] ?? 9) - (order[b.status] ?? 9);
      if (diff !== 0) return diff;
      if (mySkills.length > 0) {
        const aMatches = mySkills.some(s => SKILL_TO_MISSION[s] === a.category);
        const bMatches = mySkills.some(s => SKILL_TO_MISSION[s] === b.category);
        if (aMatches && !bMatches) return -1;
        if (!aMatches && bMatches) return 1;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const filteredHelpers = (availableHelpers || []).filter((h: any) => {
    if (categoryFilter === "all" || categoryFilter === "mine") return true;
    const skillKey = MISSION_TO_SKILL[categoryFilter];
    return h.skill_categories?.includes(skillKey);
  });

  const missionCount = filteredMissions.length;
  const helperCount = filteredHelpers.length;

  const dismissSkillPrompt = () => {
    setSkillPromptDismissed(true);
    try { localStorage.setItem("guardiens_skill_prompt_dismissed", "true"); } catch {}
  };

  const FILTER_PILLS: { key: CategoryFilter; label: string; icon: typeof Dog | null }[] = [
    { key: "all", label: "Tout", icon: null },
    { key: "garden", label: "Jardin", icon: Sprout },
    { key: "animals", label: "Animaux", icon: PawPrint },
    { key: "skills", label: "Compétences", icon: GraduationCap },
    { key: "coups_de_main", label: "Coups de main", icon: Handshake },
    { key: "mine", label: "Mes missions", icon: null },
  ];

  return (
    <>
      <PageMeta
        title="Petites missions — Entre gens du coin | Guardiens"
        description="Des coups de main, des échanges, des compétences. Entre gens du coin qui se choisissent."
      />

      <div className="min-h-screen bg-background">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-b-2xl">
          <div className="absolute inset-0">
            <img src={entraideHeader} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/75 to-background/60" />
          </div>
          <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24 text-center space-y-4">
            <h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground">
              Petites missions — Entre gens du coin
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Des coups de main, des échanges, des compétences. Entre gens du coin qui se choisissent.
            </p>
          </div>
        </section>

        <main className="max-w-6xl mx-auto px-4 py-12 space-y-16">
          <section className="space-y-6">

            {/* Mode toggle: need / offer */}
            <div className="flex items-center justify-center gap-1 bg-muted rounded-lg p-1 w-fit mx-auto">
              <button
                onClick={() => setMode("need")}
                className={`px-4 py-2 text-sm rounded-md transition-colors ${mode === "need" ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
              >
                Je cherche de l'aide
              </button>
              <button
                onClick={() => setMode("offer")}
                className={`px-4 py-2 text-sm rounded-md transition-colors ${mode === "offer" ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
              >
                Je propose mon aide
              </button>
            </div>

            {isAuthenticated && canApplyMissions && (
              <div className="text-center">
                <Link to={mode === "need" ? "/petites-missions/creer" : "/profile"}>
                  <Button variant="hero" size="lg">
                    {mode === "need" ? "Poster une mission" : "Proposer mon aide"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
            {isAuthenticated && (accessLevel === 1 || accessLevel === 2) && (
              <AccessGateBanner level={accessLevel} profileCompletion={profileCompletion} context="mission" />
            )}

            {/* Skill prompt */}
            {isAuthenticated && mySkills.length === 0 && !skillPromptDismissed && (
              <div className="bg-muted rounded-xl p-4 flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-sm text-foreground font-medium">
                    Déclarez vos compétences pour voir en priorité les échanges qui vous correspondent.
                  </p>
                  <Link to="/profile" className="text-sm text-primary font-semibold mt-1 inline-block">
                    Compléter mon profil →
                  </Link>
                </div>
                <button onClick={dismissSkillPrompt} className="text-muted-foreground hover:text-foreground shrink-0">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Category filter pills */}
            <div className="flex flex-wrap items-center gap-2 justify-center">
              {FILTER_PILLS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setCategoryFilter(key)}
                  className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition-colors ${
                    categoryFilter === key
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-foreground border-border hover:border-primary/40"
                  }`}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {label}
                </button>
              ))}
            </div>

            {/* ═══ Section 1 — Missions près de chez toi ═══ */}
            <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              Missions près de chez toi
              <span className="text-xs font-normal bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                {missionCount} mission{missionCount > 1 ? "s" : ""}
              </span>
            </h2>

            {missionCount > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMissions.map((m: any) => {
                  const meta = CATEGORY_META[m.category] || CATEGORY_META.animals;
                  const Icon = meta.icon;
                  const isCompleted = m.status === "completed";
                  const isMine = m.user_id === user?.id;
                  return (
                    <Link key={`m-${m.id}`} to={isAuthenticated ? `/petites-missions/${m.id}` : "/register"}>
                      <Card className={`border-border transition-colors h-full ${isCompleted ? "opacity-50 grayscale" : "hover:border-primary/30"}`}>
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-primary" />
                              <span className="text-xs font-medium text-muted-foreground">{meta.label}</span>
                            </div>
                            {m.response_count > 0 && (
                              <span className="text-xs text-muted-foreground bg-accent px-2 py-0.5 rounded-full">
                                {m.response_count} proposition{m.response_count > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                          <p className="font-medium text-sm text-foreground">{m.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCity(m.city || "—")} · {formatDuration(m.duration_estimate || "—")}
                          </p>
                          <p className="text-xs text-muted-foreground">En échange : {m.exchange_offer}</p>
                          {isCompleted ? (
                            <span className="inline-block text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Trouvé</span>
                          ) : m.status === "in_progress" ? (
                            <span className="inline-block text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">En cours</span>
                          ) : null}
                          {!isCompleted && (
                            isMine ? (
                              <span className="inline-block text-xs text-muted-foreground text-center w-full mt-2">Votre mission</span>
                            ) : isAuthenticated && !canApplyMissions ? (
                              <Button size="sm" variant="outline" className="w-full mt-2 gap-1 text-muted-foreground" disabled>
                                <Lock className="h-3 w-3" /> Complétez votre profil
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" className="w-full mt-2">
                                Proposer mon aide
                              </Button>
                            )
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground">
                  Aucune mission publiée près de chez toi.
                </p>
                <Link to="/petites-missions/creer" className="text-sm text-primary underline mt-1 inline-block">
                  Publie la tienne →
                </Link>
              </div>
            )}

            {/* ═══ Section 2 — Disponibles pour aider ═══ */}
            {helperCount > 0 && (
              <div className="mt-10">
                <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                  Disponibles pour aider
                  <span className="text-xs font-normal bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    {helperCount} voisin{helperCount > 1 ? "s" : ""}
                  </span>
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredHelpers.map((h: any) => {
                    const skillCats: string[] = h.skill_categories || [];
                    const displayedSkills = skillCats.slice(0, 2);
                    const extraCount = skillCats.length - 2;
                    return (
                      <div key={`h-${h.id}`} className="rounded-2xl border border-primary/20 bg-card p-5 space-y-3">
                        <span className="inline-block text-xs rounded-full bg-primary/10 text-primary px-3 py-1">
                          Disponible pour aider
                        </span>
                        <div className="flex items-center gap-3">
                          {h.avatar_url ? (
                            <img src={h.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover border border-border" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                              {h.first_name?.charAt(0) || "?"}
                            </div>
                          )}
                          <div>
                            <p className="text-base font-heading font-semibold text-foreground">{h.first_name}</p>
                            {h.city && <p className="text-xs text-muted-foreground">{h.city}</p>}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {displayedSkills.map((key: string) => {
                            const meta = SKILL_PILL_META[key];
                            if (!meta) return null;
                            const SkIcon = meta.icon;
                            return (
                              <span key={key} className="flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 text-primary px-2.5 py-0.5 text-xs">
                                <SkIcon className="h-3 w-3" />
                                {meta.label}
                              </span>
                            );
                          })}
                          {extraCount > 0 && (
                            <span className="text-xs text-muted-foreground px-2 py-0.5">+{extraCount}</span>
                          )}
                        </div>
                        {h.sits_count > 0 && (
                          <p className="text-xs text-foreground/60 flex items-center gap-1">
                            <Star className="h-3 w-3 fill-primary text-primary" />
                            {h.review_count > 0 ? `${h.review_avg.toFixed(1)} · ` : ""}{h.sits_count} garde{h.sits_count > 1 ? "s" : ""}
                          </p>
                        )}
                        <button
                          onClick={() => navigate(`/profil/${h.id}`)}
                          className="text-sm text-primary font-semibold hover:underline"
                        >
                          Proposer un échange →
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {(!allMissions || allMissions.length === 0) && (
            <section className="text-center space-y-6 max-w-3xl mx-auto">
              <h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground">
                Petites missions — L'entraide entre gens du coin, version Guardiens
              </h1>
            </section>
          )}

          <section className="text-left space-y-4 text-muted-foreground max-w-3xl mx-auto">
            <p>
              Chez Guardiens, tout a commencé par un coup de main. Promener un chien, nourrir des chats le temps d'un week-end, arroser un jardin. Avant les gardes longues, il y avait ces petits gestes — et c'est eux qui ont créé la confiance.
            </p>
            <p>
              Les petites missions, c'est ce même esprit. Vous avez besoin d'un coup de main avec vos animaux, votre jardin ? Quelqu'un du coin est là. Pas contre de l'argent — contre un bon repas, des tomates du jardin, ou simplement le plaisir de se rendre service.
            </p>
          </section>

          {/* Exemples par catégorie — sans Maison */}
          <section className="space-y-8">
            <h2 className="font-heading text-2xl font-bold text-foreground text-center">Exemples de missions</h2>
            {(["animals", "garden", "skills"] as const).map((cat) => {
              const meta = CATEGORY_META[cat];
              const Icon = meta.icon;
              const items = EXAMPLES.filter((e) => e.cat === cat);
              return (
                <div key={cat} className="space-y-3">
                  <h3 className="font-heading text-lg font-semibold flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    {meta.label}
                  </h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {items.map((ex) => (
                      <Card key={ex.title} className="border-dashed border-border bg-card">
                        <CardContent className="p-4 space-y-2">
                          <p className="font-medium text-sm text-foreground">{ex.title}</p>
                          <p className="text-xs text-muted-foreground">En échange : {ex.exchange}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>

          {/* Comment ça marche — une seule occurrence */}
          <section className="space-y-8">
            <h2 className="font-heading text-2xl font-bold text-foreground text-center">Comment ça marche</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { step: "1", title: "Poster votre mission", desc: "Décrivez ce dont vous avez besoin et ce que vous proposez en échange." },
                { step: "2", title: "Quelqu'un répond", desc: "Un membre du coin vous propose son aide. Échangez en messagerie." },
                { step: "3", title: "Rendez-vous et entraidez-vous", desc: "Vous vous rencontrez, vous vous aidez, et souvent ça finit autour d'un café." },
              ].map((s) => (
                <div key={s.step} className="text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto font-bold">
                    {s.step}
                  </div>
                  <h3 className="font-heading font-semibold text-foreground">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Encart pédagogique */}
          <section className="rounded-2xl p-6 md:p-8 text-center space-y-4 border border-border bg-muted">
            <h2 className="font-heading text-xl font-bold text-foreground">L'entraide, c'est l'esprit Guardiens</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Les petites missions, c'est l'entraide entre gens du coin. Pas de l'argent, pas du travail — du lien.
              Proposez un coup de main, l'autre vous offre un bon repas, des légumes du jardin, ou simplement sa gratitude.
              C'est comme ça qu'on a commencé : un chien à promener, un café qui s'éternise, et une amitié qui dure.
            </p>
          </section>

          {/* CTA */}
          <section className="text-center space-y-4 py-8">
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Rejoignez une communauté qui s'entraide — pas une marketplace.
            </p>
            {isAuthenticated ? (
              <Link to="/petites-missions/creer">
                <Button variant="hero" size="xl">
                  Poster une petite mission
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            ) : (
              <Link to="/register">
                <Button variant="hero" size="xl">S'inscrire gratuitement</Button>
              </Link>
            )}
          </section>

          {/* Schema.org */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Service",
                name: "Petites missions Guardiens",
                description: "Entraide communautaire entre gens du coin autour des animaux, du jardin et des compétences.",
                areaServed: { "@type": "AdministrativeArea", name: "Auvergne-Rhône-Alpes" },
                provider: { "@type": "Organization", name: "Guardiens", url: "https://guardiens.fr" },
              }),
            }}
          />
        </main>

        <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
          <div className="max-w-6xl mx-auto px-4 flex flex-wrap justify-center gap-4">
            <Link to="/a-propos" className="hover:text-foreground">À propos</Link>
            <Link to="/contact" className="hover:text-foreground">Contact</Link>
            <Link to="/cgu" className="hover:text-foreground">CGU</Link>
            <Link to="/confidentialite" className="hover:text-foreground">Confidentialité</Link>
            <Link to="/mentions-legales" className="hover:text-foreground">Mentions légales</Link>
          </div>
        </footer>
      </div>
    </>
  );
};

export default SmallMissions;
