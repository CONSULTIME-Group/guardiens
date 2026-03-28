import { useState } from "react";
import entraideHeader from "@/assets/entraide-header.jpg";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dog, Flower2, Home, Handshake, ArrowRight, Filter, Lock } from "lucide-react";
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
  const { hasAccess, status: subStatus } = useSubscriptionAccess();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

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

  const filteredMissions = (allMissions || [])
    .filter((m: any) => {
      if (statusFilter === "active" && m.status === "completed") return false;
      if (categoryFilter !== "all" && m.category !== categoryFilter) return false;
      return true;
    })
    .sort((a: any, b: any) => {
      // Active first, completed last
      const order: Record<string, number> = { open: 0, in_progress: 1, completed: 2 };
      const diff = (order[a.status] ?? 9) - (order[b.status] ?? 9);
      if (diff !== 0) return diff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <>
      <PageMeta
        title="Petites missions — Entraide entre voisins autour des animaux et du jardin | Guardiens"
        description="Besoin d'un coup de main pour promener le chien, arroser le jardin, nourrir les chats ? La communauté Guardiens s'entraide — pas d'argent, juste du lien. Inscrivez-vous gratuitement."
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

        {/* Hero with image */}
        <section className="relative -mt-0 overflow-hidden rounded-b-2xl">
          <div className="absolute inset-0">
            <img src={entraideHeader} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/75 to-background/60" />
          </div>
          <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24 text-center space-y-4">
            <h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground">
              Petites missions — Entraide entre voisins
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Besoin d'un coup de main ? Quelqu'un de la communauté est là. Pas d'argent — juste du lien.
            </p>
          </div>
        </section>

        <main className="max-w-6xl mx-auto px-4 py-12 space-y-16">
          <section className="space-y-6">

              {isAuthenticated && hasAccess && (
                <div className="text-center">
                  <Link to="/petites-missions/creer">
                    <Button variant="hero" size="lg">
                      Poster une petite mission
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              )}
              {isAuthenticated && !hasAccess && (
                <div className="text-center space-y-2">
                  <Link to="/mon-abonnement">
                    <Button variant="outline" size="lg" className="gap-2">
                      <Lock className="h-4 w-4" />
                      Abonnement requis pour poster une mission
                    </Button>
                  </Link>
                  <p className="text-xs text-muted-foreground">Passez Premium pour participer à l'entraide</p>
                </div>
              )}

              {/* Filters */}
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
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                  {([["all", "Tout", null], ["animals", "Animaux", Dog], ["garden", "Jardin", Flower2], ["house", "Maison", Home], ["skills", "Compétences", Handshake]] as const).map(([key, label, Icon]) => (
                    <button
                      key={key}
                      onClick={() => setCategoryFilter(key as CategoryFilter)}
                      className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1 ${categoryFilter === key ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {Icon && <Icon className="h-3.5 w-3.5" />}
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <h2 className="font-heading text-2xl font-bold text-foreground text-center">
                Missions ({filteredMissions.length})
              </h2>

              {filteredMissions.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMissions.map((m: any) => {
                  const meta = CATEGORY_META[m.category] || CATEGORY_META.animals;
                  const Icon = meta.icon;
                  const isCompleted = m.status === "completed";
                  return (
                    <Link key={m.id} to={isAuthenticated ? `/petites-missions/${m.id}` : "/register"}>
                      <Card className={`border-border transition-colors h-full ${isCompleted ? "opacity-50 grayscale" : "hover:border-primary/30"}`}>
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Icon className={`h-4 w-4 ${meta.colorClass}`} />
                              <span className="text-xs font-medium text-muted-foreground">{meta.label}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {m.response_count > 0 && (
                                <span className="text-xs text-muted-foreground bg-accent px-2 py-0.5 rounded-full">
                                  {m.response_count} proposition{m.response_count > 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="font-medium text-sm text-foreground">{m.title}</p>
                          <p className="text-xs text-muted-foreground">{m.city} • {m.duration_estimate}</p>
                          <p className="text-xs text-muted-foreground">En échange : {m.exchange_offer}</p>
                          {isCompleted ? (
                            <span className="inline-block text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">✅ Trouvé</span>
                          ) : m.status === "in_progress" ? (
                            <span className="inline-block text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full">En cours</span>
                          ) : null}
                          {!isCompleted && (
                            m.user_id === user?.id ? (
                              <span className="inline-block text-xs text-muted-foreground text-center w-full mt-2">Votre mission</span>
                            ) : isAuthenticated && !hasAccess ? (
                              <Button size="sm" variant="outline" className="w-full mt-2 gap-1 text-muted-foreground" disabled>
                                <Lock className="h-3 w-3" /> Abonnement requis
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" className="w-full mt-2">
                                {isAuthenticated ? "Proposer mon aide" : "Inscrivez-vous pour aider"}
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
                <p className="text-center text-muted-foreground py-8">Aucune mission ne correspond à ces filtres.</p>
              )}
            </section>

          {(!allMissions || allMissions.length === 0) && (
            <section className="text-center space-y-6 max-w-3xl mx-auto">
              <h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground">
                Petites missions — L'entraide entre voisins, version Guardiens
              </h1>
            </section>
          )}

          <section className="text-left space-y-4 text-muted-foreground max-w-3xl mx-auto">
            <p>
              Chez Guardiens, tout a commencé par un coup de main. Promener un chien, nourrir des chats le temps d'un week-end, arroser un jardin. Avant les gardes longues, il y avait ces petits gestes — et c'est eux qui ont créé la confiance.
            </p>
            <p>
              Les petites missions, c'est ce même esprit. Vous avez besoin d'un coup de main avec vos animaux, votre jardin, ou votre maison ? Quelqu'un de la communauté est là. Pas contre de l'argent — contre un bon repas, des tomates du jardin, ou simplement le plaisir de se rendre service.
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
                { step: "1", title: "Postez votre mission", desc: "Décrivez ce dont vous avez besoin et ce que vous proposez en échange." },
                { step: "2", title: "Quelqu'un répond", desc: "Un membre de la communauté vous propose son aide. Échangez en messagerie." },
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
          <section
            className="rounded-2xl p-6 md:p-8 text-center space-y-4 border"
            style={{ backgroundColor: "hsl(45 30% 96%)", borderColor: "hsl(40 20% 85%)" }}
          >
            <h2 className="font-heading text-xl font-bold text-foreground">L'entraide, c'est l'esprit Guardiens</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Les petites missions, c'est l'entraide entre voisins. Pas de l'argent, pas du travail — du lien.
              Vous proposez un coup de main, l'autre vous offre un bon repas, des légumes du jardin, ou simplement sa gratitude.
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
                description: "Entraide communautaire entre voisins autour des animaux, du jardin et de la maison.",
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
