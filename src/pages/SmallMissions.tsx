import { useState, useEffect, useMemo } from "react";
import entraideHeader from "@/assets/entraide-header.jpg";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dog, Flower2, Home, Handshake, ArrowRight, Lock, X, Sprout, PawPrint, GraduationCap, Star } from "lucide-react";
import PageMeta from "@/components/PageMeta";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { useAccessLevel } from "@/hooks/useAccessLevel";
import AccessGateBanner from "@/components/access/AccessGateBanner";

const CATEGORY_META: Record<string, { label: string; icon: typeof Dog; colorClass: string }> = {
  animals: { label: "Animaux", icon: Dog, colorClass: "text-orange-500" },
  garden: { label: "Jardin", icon: Flower2, colorClass: "text-green-600" },
  house: { label: "Maison", icon: Home, colorClass: "text-blue-500" },
  skills: { label: "Compétences", icon: Handshake, colorClass: "text-amber-600" },
};

// Map mission categories to skill categories
const MISSION_TO_SKILL: Record<string, string> = {
  animals: "animaux",
  garden: "jardin",
  house: "coups_de_main",
  skills: "competences",
};
const SKILL_TO_MISSION: Record<string, string> = {
  animaux: "animals",
  jardin: "garden",
  competences: "skills",
  coups_de_main: "house",
};

const SKILL_PILL_META: Record<string, { label: string; icon: typeof Sprout }> = {
  jardin: { label: "Jardin", icon: Sprout },
  animaux: { label: "Animaux", icon: PawPrint },
  competences: { label: "Compétences", icon: GraduationCap },
  coups_de_main: { label: "Coups de main", icon: Handshake },
};

const EXAMPLES = [
  { cat: "animals", title: "Promener Filou 3 fois cette semaine", exchange: "Plateau de fromages maison et une bonne bouteille" },
  { cat: "animals", title: "Nourrir mes 4 chats samedi et dimanche matin", exchange: "Un dîner à mon retour, je cuisine bien !" },
  { cat: "animals", title: "Accompagner mon chien chez le véto mercredi", exchange: "Confitures maison (abricot et figue)" },
  { cat: "animals", title: "Garder mes 3 poules le week-end du 15 juin", exchange: "Les œufs sont pour vous !" },
  { cat: "garden", title: "Arroser le potager pendant 5 jours", exchange: "Servez-vous dans les tomates et les courgettes !" },
  { cat: "garden", title: "Coup de main pour tailler la haie samedi", exchange: "BBQ à midi, je m'occupe de tout" },
  { cat: "garden", title: "Tondre la pelouse une fois par semaine en juillet", exchange: "Profitez du jardin, de la piscine, et du hamac" },
  { cat: "house", title: "Réceptionner un colis mardi entre 10h et 12h", exchange: "Un café et des gâteaux maison" },
  { cat: "house", title: "Relever le courrier pendant 10 jours", exchange: "Un panier de légumes du jardin" },
  { cat: "house", title: "Monter un meuble Ikea ce week-end", exchange: "Pizza maison et bières fraîches" },
  { cat: "skills", title: "Véto à la retraite — questions sur votre chien", exchange: "Le plaisir de voir des animaux heureux" },
  { cat: "skills", title: "Dog-training : les bases (rappel, marche en laisse)", exchange: "Un bon café et une balade ensemble" },
];

type StatusFilter = "active" | "all";
type CategoryFilter = "all" | "animals" | "garden" | "house" | "skills";

const SmallMissions = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const { hasAccess, status: subStatus } = useSubscriptionAccess();
  const { level: accessLevel, profileCompletion, canApplyMissions } = useAccessLevel();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [skillPromptDismissed, setSkillPromptDismissed] = useState(() => {
    try { return localStorage.getItem("guardiens_skill_prompt_dismissed") === "true"; } catch { return false; }
  });

  // Current user's skills
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

  // Fetch missions
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
        .select("mission_id")
        .in("mission_id", missionIds);

      const countMap = new Map<string, number>();
      (responses || []).forEach((r: any) => {
        countMap.set(r.mission_id, (countMap.get(r.mission_id) || 0) + 1);
      });

      return missions.map((m: any) => ({ ...m, response_count: countMap.get(m.id) || 0 }));
    },
  });

  // Fetch available helpers
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

      // Get review stats for helpers
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

      // Get completed sits count
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

  // Filter missions
  const filteredMissions = (allMissions || [])
    .filter((m: any) => {
      if (statusFilter === "active" && m.status === "completed") return false;
      if (categoryFilter !== "all" && m.category !== categoryFilter) return false;
      return true;
    })
    .sort((a: any, b: any) => {
      const order: Record<string, number> = { open: 0, in_progress: 1, completed: 2 };
      const diff = (order[a.status] ?? 9) - (order[b.status] ?? 9);
      if (diff !== 0) return diff;
      // Smart sort: if user has skills, prioritize matching missions
      if (mySkills.length > 0) {
        const aMatches = mySkills.some(s => SKILL_TO_MISSION[s] === a.category);
        const bMatches = mySkills.some(s => SKILL_TO_MISSION[s] === b.category);
        if (aMatches && !bMatches) return -1;
        if (!aMatches && bMatches) return 1;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  // Filter helpers by category
  const filteredHelpers = (availableHelpers || []).filter((h: any) => {
    if (categoryFilter === "all") return true;
    const skillKey = MISSION_TO_SKILL[categoryFilter];
    return h.skill_categories?.includes(skillKey);
  });

  // Interleave: 1 TYPE B every 4 TYPE A, never 2 consecutive
  const interleaved = useMemo(() => {
    const result: { type: "mission" | "helper"; data: any }[] = [];
    let helperIdx = 0;
    filteredMissions.forEach((m, i) => {
      result.push({ type: "mission", data: m });
      if ((i + 1) % 4 === 0 && helperIdx < filteredHelpers.length) {
        result.push({ type: "helper", data: filteredHelpers[helperIdx] });
        helperIdx++;
      }
    });
    // Add remaining helpers at the end if few missions
    while (helperIdx < filteredHelpers.length && filteredMissions.length > 0) {
      result.push({ type: "helper", data: filteredHelpers[helperIdx] });
      helperIdx++;
    }
    return result;
  }, [filteredMissions, filteredHelpers]);

  const dismissSkillPrompt = () => {
    setSkillPromptDismissed(true);
    try { localStorage.setItem("guardiens_skill_prompt_dismissed", "true"); } catch {}
  };

  const FILTER_PILLS: { key: CategoryFilter; label: string; icon: typeof Dog | null }[] = [
    { key: "all", label: "Tout", icon: null },
    { key: "garden", label: "Jardin", icon: Sprout },
    { key: "animals", label: "Animaux", icon: PawPrint },
    { key: "skills", label: "Compétences", icon: GraduationCap },
    { key: "house", label: "Coups de main", icon: Handshake },
  ];

  return (
    <>
      <PageMeta
        title="Petites missions — Entre gens du coin | Guardiens"
        description="Des coups de main, des échanges, des compétences. Entre gens du coin qui se choisissent."
      />

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="font-heading text-2xl font-bold tracking-tight">
              <span className="text-primary">g</span>
              <span className="text-foreground">uardiens</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link to="/actualites" className="text-sm text-muted-foreground hover:text-foreground hidden sm:inline">Articles</Link>
              <Link to="/guides" className="text-sm text-muted-foreground hover:text-foreground hidden sm:inline">Guides locaux</Link>
              <Link to="/tarifs" className="text-sm text-muted-foreground hover:text-foreground hidden sm:inline">Tarifs</Link>
              {!isAuthenticated ? (
                <>
                  <Link to="/login"><Button variant="outline" size="sm">Connexion</Button></Link>
                  <Link to="/register"><Button size="sm">S'inscrire</Button></Link>
                </>
              ) : (
                <Link to="/dashboard"><Button size="sm">Dashboard</Button></Link>
              )}
            </div>
          </div>
        </header>

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

            {isAuthenticated && canApplyMissions && (
              <div className="text-center">
                <Link to="/petites-missions/creer">
                  <Button variant="hero" size="lg">
                    Poster une petite mission
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
            {isAuthenticated && (accessLevel === 1 || accessLevel === 2) && (
              <AccessGateBanner level={accessLevel} profileCompletion={profileCompletion} context="mission" />
            )}

            {/* Skill prompt for users without skills */}
            {isAuthenticated && mySkills.length === 0 && !skillPromptDismissed && (
              <div className="bg-muted rounded-xl p-4 flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-sm text-foreground font-medium">
                    Déclare tes compétences pour voir en priorité les échanges qui te correspondent.
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
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <button
                  onClick={() => setStatusFilter("active")}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${statusFilter === "active" ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Actives
                </button>
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${statusFilter === "all" ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Toutes
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
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
            </div>

            <h2 className="font-heading text-2xl font-bold text-foreground text-center">
              Missions ({filteredMissions.length})
            </h2>

            {interleaved.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {interleaved.map((item, idx) => {
                  if (item.type === "mission") {
                    const m = item.data;
                    const meta = CATEGORY_META[m.category] || CATEGORY_META.animals;
                    const Icon = meta.icon;
                    const isCompleted = m.status === "completed";
                    return (
                      <Link key={`m-${m.id}`} to={isAuthenticated ? `/petites-missions/${m.id}` : "/register"}>
                        <Card className={`border-border transition-colors h-full ${isCompleted ? "opacity-50 grayscale" : "hover:border-primary/30"}`}>
                          <CardContent className="p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Icon className={`h-4 w-4 ${meta.colorClass}`} />
                                <span className="text-xs font-medium text-muted-foreground">{meta.label}</span>
                              </div>
                              {m.response_count > 0 && (
                                <span className="text-xs text-muted-foreground bg-accent px-2 py-0.5 rounded-full">
                                  {m.response_count} proposition{m.response_count > 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                            <p className="font-medium text-sm text-foreground">{m.title}</p>
                            <p className="text-xs text-muted-foreground">{m.city} · {m.duration_estimate}</p>
                            <p className="text-xs text-muted-foreground">En échange : {m.exchange_offer}</p>
                            {isCompleted ? (
                              <span className="inline-block text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Trouvé</span>
                            ) : m.status === "in_progress" ? (
                              <span className="inline-block text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">En cours</span>
                            ) : null}
                            {!isCompleted && (
                              m.user_id === user?.id ? (
                                <span className="inline-block text-xs text-muted-foreground text-center w-full mt-2">Ta mission</span>
                              ) : isAuthenticated && !canApplyMissions ? (
                                <Button size="sm" variant="outline" className="w-full mt-2 gap-1 text-muted-foreground" disabled>
                                  <Lock className="h-3 w-3" /> Complète ton profil
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
                  } else {
                    // TYPE B — Available helper card
                    const h = item.data;
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
                          {displayedSkills.map(key => {
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
                            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
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
                  }
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Aucune mission ne correspond à ces filtres.</p>
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
              Les petites missions, c'est ce même esprit. Tu as besoin d'un coup de main avec tes animaux, ton jardin, ou ta maison ? Quelqu'un du coin est là. Pas contre de l'argent — contre un bon repas, des tomates du jardin, ou simplement le plaisir de se rendre service.
            </p>
          </section>

          {/* Exemples par catégorie */}
          <section className="space-y-8">
            <h2 className="font-heading text-2xl font-bold text-foreground text-center">Exemples de missions</h2>
            {(["animals", "garden", "house", "skills"] as const).map((cat) => {
              const meta = CATEGORY_META[cat];
              const Icon = meta.icon;
              const items = EXAMPLES.filter((e) => e.cat === cat);
              return (
                <div key={cat} className="space-y-3">
                  <h3 className="font-heading text-lg font-semibold flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${meta.colorClass}`} />
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

          {/* Comment ça marche */}
          <section className="space-y-8">
            <h2 className="font-heading text-2xl font-bold text-foreground text-center">Comment ça marche</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { step: "1", title: "Poste ta mission", desc: "Décris ce dont tu as besoin et ce que tu proposes en échange." },
                { step: "2", title: "Quelqu'un répond", desc: "Un membre du coin te propose son aide. Échangez en messagerie." },
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
              Tu proposes un coup de main, l'autre t'offre un bon repas, des légumes du jardin, ou simplement sa gratitude.
              C'est comme ça qu'on a commencé : un chien à promener, un café qui s'éternise, et une amitié qui dure.
            </p>
          </section>

          {/* CTA */}
          <section className="text-center space-y-4 py-8">
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Rejoins une communauté qui s'entraide — pas une marketplace.
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
                description: "Entraide communautaire entre gens du coin autour des animaux, du jardin et de la maison.",
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
