import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Calendar, MapPin, MessageSquare, Star, Users, Clock, ChevronRight, Plus, PawPrint, Dog, Cat, Bird, Fish, Rabbit, BarChart3, Clock3, Lock, CheckCircle2, BookOpen, Compass } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

const sitStatusConfig: Record<string, { emoji: string; label: string; color: string }> = {
  published: { emoji: "🔵", label: "En recherche", color: "bg-blue-50 border-blue-200" },
  confirmed: { emoji: "🟠", label: "À venir", color: "bg-orange-50 border-orange-200" },
  completed: { emoji: "⚪", label: "Terminée", color: "bg-muted border-border" },
  cancelled: { emoji: "⚪", label: "Annulée", color: "bg-muted border-border" },
};

const speciesEmoji: Record<string, string> = {
  dog: "🐕", cat: "🐱", horse: "🐴", bird: "🐦",
  rodent: "🐹", fish: "🐠", reptile: "🦎",
  farm_animal: "🐄", nac: "🐾",
};

const speciesLabel: Record<string, string> = {
  dog: "Chien", cat: "Chat", horse: "Cheval", bird: "Oiseau",
  rodent: "Rongeur", fish: "Poisson", reptile: "Reptile",
  farm_animal: "Animal de ferme", nac: "NAC",
};

const OwnerDashboard = () => {
  const { user } = useAuth();
  const [sits, setSits] = useState<any[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [recentApps, setRecentApps] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sitterCount, setSitterCount] = useState(0);
  const [reviews, setReviews] = useState<any[]>([]);
  const [longStays, setLongStays] = useState<any[]>([]);
  const [ownerEligible, setOwnerEligible] = useState(false);
  const [breedArticles, setBreedArticles] = useState<any[]>([]);
  const [breedProfiles, setBreedProfiles] = useState<any[]>([]);
  const [localGuides, setLocalGuides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [sitsRes, unreadRes, sittersRes, propsRes, reviewsRes, longStaysRes, profileRes] = await Promise.all([
        supabase.from("sits").select("*, applications(id, status)").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("messages").select("id", { count: "exact", head: true }).neq("sender_id", user.id).is("read_at", null),
        supabase.from("sitter_profiles").select("id", { count: "exact", head: true }),
        supabase.from("properties").select("id").eq("user_id", user.id),
        supabase.from("reviews").select("overall_rating").eq("reviewee_id", user.id).eq("published", true),
        supabase.from("long_stays").select("*, long_stay_applications(id, status)").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("profiles").select("identity_verified").eq("id", user.id).single(),
      ]);

      const sitsData = sitsRes.data || [];
      setSits(sitsData);
      setUnreadCount(unreadRes.count || 0);
      setSitterCount(sittersRes.count || 0);
      setReviews(reviewsRes.data || []);
      setLongStays(longStaysRes.data || []);
      // Owner eligibility for long stays: TEMPORARILY BYPASSED FOR TESTING
      const completedCount = sitsData.filter((s: any) => s.status === "completed").length;
      setOwnerEligible(completedCount >= 2 && (profileRes.data?.identity_verified || false));

      // Load pets from user's properties
      const propIds = (propsRes.data || []).map((p: any) => p.id);
      let petsData: any[] = [];
      if (propIds.length > 0) {
        const { data } = await supabase
          .from("pets")
          .select("*")
          .in("property_id", propIds);
        petsData = data || [];
        setPets(petsData);
      }

      // Recent applications across all sits
      const sitIds = sitsData.map((s: any) => s.id);
      if (sitIds.length > 0) {
        const { data: apps } = await supabase
          .from("applications")
          .select("*, sitter:profiles!applications_sitter_id_fkey(first_name, avatar_url), sit:sits(title)")
          .in("sit_id", sitIds)
          .order("created_at", { ascending: false })
          .limit(3);
        setRecentApps(apps || []);
      }

      // Fetch breed-related data based on pet breeds
      const petBreeds = petsData.map((p: any) => p.breed?.trim().toLowerCase()).filter(Boolean);
      const uniqueBreeds = [...new Set(petBreeds)];
      if (uniqueBreeds.length > 0) {
        // Fetch breed profiles
        const { data: bProfiles } = await supabase
          .from("breed_profiles")
          .select("*")
          .in("breed", uniqueBreeds);
        setBreedProfiles(bProfiles || []);

        // Fetch matching articles
        const { data: breedArts } = await supabase
          .from("articles")
          .select("id, title, slug, cover_image_url, excerpt, category, related_breed")
          .eq("published", true)
          .eq("category", "guide_race")
          .limit(20);
        const matched = (breedArts || []).filter((a: any) =>
          uniqueBreeds.some((b: string) =>
            a.title?.toLowerCase().includes(b) ||
            a.related_breed?.toLowerCase().includes(b) ||
            a.slug?.toLowerCase().includes(b)
          )
        );
        setBreedArticles(matched.slice(0, 3));
      }

      // Fetch local city guides based on user's city
      const userCity = profileRes.data ? (await supabase.from("profiles").select("city").eq("id", user.id).single()).data?.city : null;
      if (userCity) {
        const { data: guides } = await supabase
          .from("city_guides")
          .select("id, city, slug, department, intro")
          .eq("published", true)
          .limit(20);
        // Prioritize same city, then same department
        const sameCity = (guides || []).filter((g: any) => g.city?.toLowerCase() === userCity.toLowerCase());
        const others = (guides || []).filter((g: any) => g.city?.toLowerCase() !== userCity.toLowerCase());
        setLocalGuides([...sameCity, ...others].slice(0, 3));
      }

      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) return <div className="p-6 text-muted-foreground">Chargement...</div>;

  const activeSits = sits.filter(s => ["published", "confirmed"].includes(s.status));
  const completedSits = sits.filter(s => s.status === "completed");
  const upcomingSits = sits
    .filter(s => ["published", "confirmed"].includes(s.status) && s.start_date)
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
    .slice(0, 3);

  const isOngoing = (s: any) => {
    if (s.status !== "confirmed") return false;
    const now = new Date();
    return s.start_date && new Date(s.start_date) <= now && s.end_date && new Date(s.end_date) >= now;
  };

  // Find next sit for each pet (through property_id)
  const getNextSitForPet = (pet: any) => {
    const now = new Date();
    return sits
      .filter(s => s.property_id === pet.property_id && ["published", "confirmed"].includes(s.status) && s.start_date && new Date(s.start_date) >= now)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())[0];
  };

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold">
          Bonjour{user?.firstName ? `, ${user.firstName}` : ""} 👋
        </h1>
        {user && user.profileCompletion < 100 && (
          <Link to="/profile" className="text-sm text-primary hover:underline mt-1 inline-block">
            Profil complété à {user.profileCompletion}% — Compléter mon profil →
          </Link>
        )}
      </div>

      {/* CTA Publier si aucune annonce active */}
      {activeSits.length === 0 && (
        <Link to="/sits/create" className="block p-6 rounded-xl bg-primary/5 border-2 border-dashed border-primary/30 hover:border-primary/50 hover:shadow-md transition-all text-center">
          <Plus className="h-8 w-8 text-primary mx-auto mb-2" />
          <p className="font-heading font-semibold text-lg">Publier une annonce de garde</p>
          <p className="text-sm text-muted-foreground mt-1">Décrivez vos dates et les gardiens pourront postuler</p>
        </Link>
      )}

      {/* Candidatures récentes - en haut si il y en a */}
      {recentApps.length > 0 && (
        <DashSection title="Candidatures reçues" icon={Users} action={
          <Link to="/sits" className="text-xs text-primary hover:underline">Voir toutes mes annonces</Link>
        }>
          <div className="space-y-2">
            {recentApps.map(app => (
              <Link key={app.id} to={`/sits/${app.sit_id}`} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:shadow-sm transition-shadow">
                {app.sitter?.avatar_url ? (
                  <img src={app.sitter.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                    {app.sitter?.first_name?.charAt(0) || "?"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{app.sitter?.first_name || "Gardien"}</p>
                  <p className="text-xs text-muted-foreground truncate">{app.sit?.title}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            ))}
          </div>
        </DashSection>
      )}

      {/* Mes animaux */}
      <DashSection title="Mes animaux" icon={PawPrint} action={
        <Link to="/owner-profile" className="text-xs text-primary hover:underline">Gérer</Link>
      }>
        {pets.length === 0 ? (
          <EmptyCard text="Aucun animal enregistré." cta="Ajouter un animal" to="/owner-profile" />
        ) : (
          <div className="grid gap-2">
            {pets.map(pet => {
              const nextSit = getNextSitForPet(pet);
              const emoji = speciesEmoji[pet.species] || "🐾";
              const label = speciesLabel[pet.species] || pet.species;
              const daysUntil = nextSit?.start_date ? differenceInDays(new Date(nextSit.start_date), new Date()) : null;

              return (
                <div key={pet.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                  {pet.photo_url ? (
                    <img src={pet.photo_url} alt={pet.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-lg shrink-0">
                      {emoji}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <p className="text-sm font-medium truncate">{pet.name || "Sans nom"}</p>
                      <span className="text-xs text-muted-foreground">
                        {label}{pet.breed ? ` · ${pet.breed}` : ""}{pet.age ? ` · ${pet.age} an${pet.age > 1 ? "s" : ""}` : ""}
                      </span>
                    </div>
                    {nextSit ? (
                      <Link to={`/sits/${nextSit.id}`} className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5">
                        <Calendar className="h-3 w-3" />
                        Prochaine garde {daysUntil !== null && daysUntil >= 0
                          ? daysUntil === 0 ? "aujourd'hui" : `dans ${daysUntil} jour${daysUntil > 1 ? "s" : ""}`
                          : format(new Date(nextSit.start_date), "d MMM", { locale: fr })}
                      </Link>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-0.5">Aucune garde prévue</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DashSection>

      {/* Fiches race personnalisées */}
      {breedProfiles.length > 0 && (
        <DashSection title="Conseils pour vos races" icon={BookOpen} action={
          <Link to="/actualites?cat=guide_race" className="text-xs text-primary hover:underline">Tous les guides</Link>
        }>
          <div className="grid gap-4">
            {breedProfiles.map((bp: any) => (
              <div key={bp.id} className="p-4 rounded-xl bg-card border border-border space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{speciesEmoji[bp.species] || "🐾"}</span>
                  <h3 className="font-heading font-semibold text-sm capitalize">{bp.breed}</h3>
                </div>
                <div className="grid gap-1.5 text-xs text-muted-foreground">
                  <p><span className="font-medium text-foreground">Tempérament :</span> {bp.temperament?.slice(0, 120)}…</p>
                  <p><span className="font-medium text-foreground">Exercice :</span> {bp.exercise_needs?.slice(0, 120)}…</p>
                  <p><span className="font-medium text-foreground">Conseil gardien :</span> {bp.sitter_tips?.slice(0, 120)}…</p>
                </div>
                {/* Link to matching article if exists */}
                {breedArticles.find((a: any) => a.slug?.includes(bp.breed) || a.title?.toLowerCase().includes(bp.breed)) && (
                  <Link
                    to={`/actualites/${breedArticles.find((a: any) => a.slug?.includes(bp.breed) || a.title?.toLowerCase().includes(bp.breed))?.slug}`}
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
                  >
                    Lire le guide complet <ChevronRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </DashSection>
      )}

      {/* Articles race sans fiche (fallback) */}
      {breedArticles.filter((a: any) => !breedProfiles.some((bp: any) => a.slug?.includes(bp.breed) || a.title?.toLowerCase().includes(bp.breed))).length > 0 && (
        <DashSection title="Articles pour vos races" icon={BookOpen}>
          <div className="grid gap-3">
            {breedArticles
              .filter((a: any) => !breedProfiles.some((bp: any) => a.slug?.includes(bp.breed) || a.title?.toLowerCase().includes(bp.breed)))
              .map((article: any) => (
              <Link key={article.id} to={`/actualites/${article.slug}`} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:shadow-md transition-shadow">
                {article.cover_image_url ? (
                  <img src={article.cover_image_url} alt={article.title} className="w-14 h-14 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-accent flex items-center justify-center shrink-0">
                    <BookOpen className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{article.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{article.excerpt}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            ))}
          </div>
        </DashSection>
      )}

      {/* Guides locaux */}
      {localGuides.length > 0 && (
        <DashSection title="Guides autour de chez vous" icon={Compass} action={
          <Link to="/guides" className="text-xs text-primary hover:underline">Tous les guides</Link>
        }>
          <div className="grid gap-3">
            {localGuides.map((guide: any) => (
              <Link key={guide.id} to={`/guides/${guide.slug}`} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{guide.city}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{guide.department}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            ))}
          </div>
        </DashSection>
      )}

      {upcomingSits.length > 0 && (
        <DashSection title="Prochaines gardes" icon={Clock} action={
          <Link to="/sits" className="text-xs text-primary hover:underline">Voir tout</Link>
        }>
          <div className="grid gap-3">
            {upcomingSits.map(sit => {
              const cfg = sitStatusConfig[sit.status] || sitStatusConfig.published;
              const ongoing = isOngoing(sit);
              const appCount = sit.applications?.length || 0;
              const daysUntil = sit.start_date ? differenceInDays(new Date(sit.start_date), new Date()) : null;

              return (
                <Link key={sit.id} to={`/sits/${sit.id}`} className="block p-4 rounded-xl border border-border bg-card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{cfg.emoji} {sit.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {sit.start_date && sit.end_date
                          ? `${format(new Date(sit.start_date), "d MMM", { locale: fr })} → ${format(new Date(sit.end_date), "d MMM yyyy", { locale: fr })}`
                          : "Dates non définies"}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {ongoing && <span className="text-green-700 font-medium">🟢 En cours</span>}
                    {!ongoing && daysUntil !== null && daysUntil >= 0 && (
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {daysUntil === 0 ? "Aujourd'hui" : `Dans ${daysUntil} jour${daysUntil > 1 ? "s" : ""}`}</span>
                    )}
                    {sit.status === "published" && (
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {appCount} candidature{appCount !== 1 ? "s" : ""}</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </DashSection>
      )}

      {/* Mes annonces */}
      <DashSection title="Mes annonces" icon={Calendar} action={
        <Link to="/sits/create">
          <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Publier une annonce</Button>
        </Link>
      }>
        {sits.length === 0 ? (
          <EmptyCard text="Aucune annonce pour le moment." cta="Publier ma première annonce" to="/sits/create" />
        ) : (
          <div className="grid gap-3">
            {sits.slice(0, 5).map(sit => {
              const cfg = sitStatusConfig[sit.status] || sitStatusConfig.published;
              const ongoing = isOngoing(sit);
              const appCount = sit.applications?.length || 0;
              const daysUntil = sit.start_date ? differenceInDays(new Date(sit.start_date), new Date()) : null;

              return (
                <Link key={sit.id} to={`/sits/${sit.id}`} className={`block p-4 rounded-xl border ${cfg.color} hover:shadow-md transition-shadow`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{cfg.emoji} {sit.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {sit.start_date && sit.end_date
                          ? `${format(new Date(sit.start_date), "d MMM", { locale: fr })} → ${format(new Date(sit.end_date), "d MMM yyyy", { locale: fr })}`
                          : "Dates non définies"}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {ongoing && <span className="text-green-700 font-medium">🟢 En cours</span>}
                    {!ongoing && sit.status === "confirmed" && daysUntil !== null && daysUntil > 0 && (
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Dans {daysUntil} jour{daysUntil > 1 ? "s" : ""}</span>
                    )}
                    {sit.status === "published" && (
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {appCount} candidature{appCount !== 1 ? "s" : ""}</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </DashSection>

      {/* Gardes longue durée */}
      <DashSection title="Gardes longue durée" icon={Clock3} action={
        ownerEligible ? (
          <Link to="/long-stays/create">
            <Button size="sm" variant="outline" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Proposer une garde longue durée</Button>
          </Link>
        ) : undefined
      }>
        {!ownerEligible ? (
          <div className="p-5 rounded-xl border border-dashed border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Lock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Longue durée verrouillée</p>
                <p className="text-xs text-muted-foreground">Complétez les étapes ci-dessous pour débloquer.</p>
              </div>
            </div>
            <div className="space-y-2.5">
              <ProgressItem done={completedSits.length >= 2} label={`${Math.min(completedSits.length, 2)}/2 gardes complétées`} />
              <ProgressItem done={false} label="Identité vérifiée" hint="Vérifier →" hintTo="/settings#verification" />
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                <span>Progression</span>
                <span>{Math.round(((completedSits.length >= 2 ? 1 : 0) / 2) * 100)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((completedSits.length >= 2 ? 1 : 0) / 2) * 100}%` }} />
              </div>
            </div>
          </div>
        ) : longStays.length === 0 ? (
          <EmptyCard text="Aucune annonce longue durée publiée." cta="Proposer une garde longue durée" to="/long-stays/create" />
        ) : (
          <div className="grid gap-3">
            {longStays.slice(0, 3).map((ls: any) => {
              const appCount = ls.long_stay_applications?.length || 0;
              return (
                <Link key={ls.id} to={`/long-stays/${ls.id}`} className="block p-4 rounded-xl border border-blue-200 bg-card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge className="bg-[#DBEAFE] text-[#1E40AF] border-blue-200 hover:bg-[#DBEAFE] text-[10px] px-1.5 py-0">Longue durée</Badge>
                        <span className="font-medium text-sm">{ls.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {ls.start_date && ls.end_date
                          ? `${format(new Date(ls.start_date), "d MMM", { locale: fr })} → ${format(new Date(ls.end_date), "d MMM yyyy", { locale: fr })}`
                          : "Dates non définies"}
                        {ls.estimated_contribution ? ` · ${ls.estimated_contribution}` : ""}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  </div>
                  {appCount > 0 && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Users className="h-3 w-3" /> {appCount} candidature{appCount !== 1 ? "s" : ""}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </DashSection>

      {/* Candidatures already shown above */}

      {/* Métriques */}
      <DashSection title="Mes métriques" icon={BarChart3}>
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 rounded-xl border border-border bg-card text-center">
            <p className="text-2xl font-bold">{completedSits.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Garde{completedSits.length !== 1 ? "s" : ""} complétée{completedSits.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card text-center">
            {reviews.length > 0 ? (
              <>
                <p className="text-2xl font-bold flex items-center justify-center gap-1">
                  {(reviews.reduce((sum, r) => sum + r.overall_rating, 0) / reviews.length).toFixed(1)}
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                </p>
                <p className="text-xs text-muted-foreground mt-1">{reviews.length} avis</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-muted-foreground">—</p>
                <p className="text-xs text-muted-foreground mt-1">Note moyenne</p>
              </>
            )}
          </div>
          <div className="p-4 rounded-xl border border-border bg-card text-center">
            <p className="text-2xl font-bold">{pets.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Animal{pets.length !== 1 ? "x" : ""}</p>
          </div>
        </div>
      </DashSection>

      {unreadCount > 0 && (
        <Link to="/messages" className="block p-4 rounded-xl bg-primary/5 border border-primary/10 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{unreadCount} message{unreadCount > 1 ? "s" : ""} non lu{unreadCount > 1 ? "s" : ""}</p>
              <p className="text-xs text-muted-foreground">Consultez vos conversations</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </Link>
      )}

      {/* Suggestions */}
      {sitterCount > 0 && (
        <Link to="/search" className="block p-4 rounded-xl bg-accent/50 border border-border hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <PawPrint className="h-5 w-5 text-primary" />
            <p className="text-sm"><span className="font-medium">{sitterCount} gardien{sitterCount > 1 ? "s" : ""}</span> disponible{sitterCount > 1 ? "s" : ""} sur la plateforme</p>
          </div>
        </Link>
      )}

      {/* Reassurance */}
      <div className="p-5 rounded-xl bg-primary/5 border border-primary/10 text-center">
        <p className="text-sm font-medium text-primary">Votre réseau local de gardiens vérifiés est là pour vous.</p>
        <p className="text-xs text-muted-foreground mt-1">Profils vérifiés · Avis croisés · Gardiens d'urgence mobilisables</p>
      </div>
    </div>
  );
};

// Shared components
const DashSection = ({ title, icon: Icon, action, children }: {
  title: string; icon: React.ElementType; action?: React.ReactNode; children: React.ReactNode;
}) => (
  <div>
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="font-heading text-lg font-semibold">{title}</h2>
      </div>
      {action}
    </div>
    {children}
  </div>
);

const EmptyCard = ({ text, cta, to }: { text: string; cta: string; to: string }) => (
  <div className="p-6 rounded-xl border border-dashed border-border text-center">
    <p className="text-sm text-muted-foreground mb-3">{text}</p>
    <Link to={to}><Button size="sm">{cta}</Button></Link>
  </div>
);

const ProgressItem = ({ done, label, hint, hintTo }: { done: boolean; label: string; hint?: string; hintTo?: string }) => (
  <div className="flex items-center gap-2">
    {done ? (
      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
    ) : (
      <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
    )}
    <span className={`text-xs ${done ? "text-foreground line-through" : "text-muted-foreground"}`}>{label}</span>
    {hint && !done && (hintTo ? (
      <Link to={hintTo} className="text-[10px] text-primary hover:underline">{hint}</Link>
    ) : (
      <span className="text-[10px] text-primary">{hint}</span>
    ))}
  </div>
);

export default OwnerDashboard;
