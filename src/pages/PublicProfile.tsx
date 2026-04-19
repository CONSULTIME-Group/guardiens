import { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Calendar, Star, PawPrint, Car, Globe, Briefcase, Home, MessageSquare, ArrowLeft, Eye, ChevronRight, Handshake } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Helmet } from "react-helmet-async";
import PageMeta from "@/components/PageMeta";
import ReviewsDisplay from "@/components/reviews/ReviewsDisplay";
import ReportButton from "@/components/reports/ReportButton";
import PublicGallery from "@/components/profile/PublicGallery";
import PublicExperiences from "@/components/profile/PublicExperiences";
import PublicOwnerGallery from "@/components/profile/PublicOwnerGallery";
import OwnerHighlights from "@/components/profile/OwnerHighlights";

import EntraideSection from "@/components/missions/EntraideSection";
import PublicSkills from "@/components/profile/PublicSkills";
import EnvironmentPills from "@/components/shared/EnvironmentPills";
import CancellationReviewsSection from "@/components/reviews/CancellationReviewsSection";
import ProfileSkeleton from "@/components/skeletons/ProfileSkeleton";
import ProfileSchemaOrg from "@/components/seo/ProfileSchemaOrg";

const speciesLabels: Record<string, string> = {
  dog: "🐕 Chiens", cat: "🐱 Chats", horse: "🐴 Chevaux", bird: "🐦 Oiseaux",
  rodent: "🐹 Rongeurs", fish: "🐠 Poissons", reptile: "🦎 Reptiles",
  farm_animal: "🐄 Animaux de ferme", nac: "🦔 NAC",
};

const lifestyleLabels: Record<string, string> = {
  remote_worker: "Télétravailleur", retired: "Retraité(e)", nomad: "Nomade",
  couple: "En couple", family: "Famille", student: "Étudiant(e)", solo: "Solo",
};

const PublicProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [profile, setProfile] = useState<any>(null);
  const [sitterProfile, setSitterProfile] = useState<any>(null);
  const [ownerProfile, setOwnerProfile] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [pastAnimals, setPastAnimals] = useState<any[]>([]);
  const [reviewStats, setReviewStats] = useState({ count: 0, avg: 0 });
  const [completedSits, setCompletedSits] = useState(0);
  const [galleryPhotos, setGalleryPhotos] = useState<any[]>([]);
  const [externalExperiences, setExternalExperiences] = useState<any[]>([]);
  const [ownerGalleryPhotos, setOwnerGalleryPhotos] = useState<any[]>([]);
  const [ownerHighlights, setOwnerHighlights] = useState<any[]>([]);
  const [badgeCounts, setBadgeCounts] = useState<{ badge_key: string; count: number }[]>([]);
  const [isEmergencySitter, setIsEmergencySitter] = useState(false);
  const [activeSit, setActiveSit] = useState<any>(null);
  const [trustedSittersCount, setTrustedSittersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [profileRes, sitterRes, ownerRes, propsRes, reviewsRes] = await Promise.all([
        supabase.from("public_profiles").select("*").eq("id", id).single(),
        supabase.from("sitter_profiles").select("*").eq("user_id", id).maybeSingle(),
        supabase.from("owner_profiles").select("*").eq("user_id", id).maybeSingle(),
        supabase.from("properties").select("*, pets(*)").eq("user_id", id),
        supabase.from("reviews").select("overall_rating").eq("reviewee_id", id).eq("published", true),
      ]);

      setProfile(profileRes.data);
      setSitterProfile(sitterRes.data);
      setOwnerProfile(ownerRes.data);

      if (propsRes.data) {
        setProperties(propsRes.data);
        setPets(propsRes.data.flatMap((p: any) => p.pets || []));
      }

      const reviews = reviewsRes.data || [];
      setReviewStats({
        count: reviews.length,
        avg: reviews.length > 0 ? reviews.reduce((s: number, r: any) => s + r.overall_rating, 0) / reviews.length : 0,
      });

      if (sitterRes.data) {
        const { data: pa } = await supabase.from("past_animals").select("*").eq("sitter_profile_id", sitterRes.data.id);
        setPastAnimals(pa || []);
      }

      const { count } = await supabase.from("applications").select("id", { count: "exact", head: true }).eq("sitter_id", id).eq("status", "accepted");
      setCompletedSits(count || 0);

      const [galleryRes, extExpRes, ownerGalRes, highlightsRes, badgesRes, emRes, activeSitRes] = await Promise.all([
        supabase.from("sitter_gallery").select("*").eq("user_id", id).order("created_at", { ascending: false }),
        supabase.from("external_experiences").select("*").eq("user_id", id).order("created_at", { ascending: false }),
        supabase.from("owner_gallery").select("*").eq("user_id", id).order("created_at", { ascending: false }),
        supabase.from("owner_highlights").select("*, sitter:sitter_id(first_name, avatar_url)").eq("owner_id", id).eq("hidden", false).order("created_at", { ascending: false }),
        supabase.from("badge_attributions").select("badge_id").eq("user_id", id),
        supabase.from("emergency_sitter_profiles").select("is_active").eq("user_id", id).eq("is_active", true).maybeSingle(),
        supabase.from("sits").select("id, title").eq("user_id", id).in("status", ["published", "confirmed"]).limit(1).maybeSingle(),
      ]);

      setGalleryPhotos(galleryRes.data || []);
      setExternalExperiences(extExpRes.data || []);
      setOwnerGalleryPhotos(ownerGalRes.data || []);
      setOwnerHighlights(highlightsRes.data || []);
      setIsEmergencySitter(!!emRes.data);
      setActiveSit(activeSitRes.data);

      if (badgesRes.data && badgesRes.data.length > 0) {
        const countMap = new Map<string, number>();
        badgesRes.data.forEach((b: any) => countMap.set(b.badge_id, (countMap.get(b.badge_id) || 0) + 1));
        setBadgeCounts(Array.from(countMap.entries()).map(([badge_key, count]) => ({ badge_key, count })));
      }

      setLoading(false);
      window.prerenderReady = true;
    };
    load();
  }, [id]);

  if (loading) return <ProfileSkeleton />;
  if (!profile) return <div className="p-6 md:p-10 text-muted-foreground">Profil introuvable.</div>;

  const createdDate = new Date(profile.created_at);
  const memberSince = !isNaN(createdDate.getTime()) ? format(createdDate, "MMMM yyyy", { locale: fr }) : "";
  const isSitter = profile.role === "sitter" || profile.role === "both";
  const isOwner = profile.role === "owner" || profile.role === "both";
  const isOwnProfile = user?.id === id;
  const verifiedExpCount = externalExperiences.filter((e: any) => e.verification_status === "verified").length;
  const totalSits = completedSits + verifiedExpCount;
  const firstName = profile.first_name || "Membre";
  const topBadge = "";
  const shouldIndex = (profile.profile_completion || 0) >= 60;

  const tabParam = searchParams.get("tab");
  const defaultTab = tabParam === "proprio" && isOwner ? "owner" : (isSitter ? "sitter" : "owner");

  const roleLabel = isSitter && isOwner
    ? "Gardien & Propriétaire"
    : isSitter ? "Gardien vérifié" : "Propriétaire";
  const metaTitle = `${firstName} — ${roleLabel} à ${profile.city || "France"} | Guardiens`;
  const metaDesc = isSitter
    ? `${firstName}, gardien à ${profile.city || "France"}. ${totalSits} garde${totalSits > 1 ? "s" : ""}, note ${reviewStats.avg.toFixed(1)}/5. ${topBadge ? topBadge + ". " : ""}Contactez-le sur Guardiens.`
    : `${firstName}, propriétaire à ${profile.city || "France"}. ${pets.length} animal${pets.length > 1 ? "ux" : ""}. ${totalSits} garde${totalSits > 1 ? "s" : ""}, note ${reviewStats.avg.toFixed(1)}/5.`;

  const handleContact = async () => {
    if (!user || !id) return;
    // Look for existing private conversation (no sit/mission linked)
    const { data: existingConvs } = await supabase
      .from("conversations")
      .select("id, sit_id")
      .or(`and(owner_id.eq.${user.id},sitter_id.eq.${id}),and(owner_id.eq.${id},sitter_id.eq.${user.id})`);
    // Prefer a private conv (no sit_id), else most recent
    const privateConv = existingConvs?.find(c => !c.sit_id);
    const existingConv = privateConv || existingConvs?.[0];
    if (existingConv) {
      navigate(`/messages?conv=${existingConv.id}`);
    } else {
      const { data: newConv } = await supabase.from("conversations").insert({
        owner_id: user.id, sitter_id: id,
        sit_id: null, small_mission_id: null,
      }).select("id").single();
      if (newConv) navigate(`/messages?conv=${newConv.id}`);
    }
  };

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const ogImageUrl = isSitter && shouldIndex && id
    ? `https://${projectId}.functions.supabase.co/og-profile?id=${id}`
    : profile.avatar_url || undefined;

  const knowsAboutList = [
    ...(sitterProfile?.competences || []),
    ...(ownerProfile?.competences || []),
  ].filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);

  return (
    <TooltipProvider>
      {/* SEO */}
      <PageMeta
        title={metaTitle}
        description={metaDesc}
        path={`/profil/${id}`}
        image={ogImageUrl}
        type="website"
        noindex={!shouldIndex}
      />
      <ProfileSchemaOrg
        name={firstName}
        city={profile.city || undefined}
        postalCode={profile.postal_code || undefined}
        avatarUrl={profile.avatar_url || undefined}
        bio={profile.bio || undefined}
        avgRating={reviewStats.avg}
        reviewCount={reviewStats.count}
        completedSits={totalSits}
        identityVerified={!!profile.identity_verified}
        knowsAbout={knowsAboutList}
        url={`https://guardiens.fr/gardiens/${id}`}
        role={profile.role}
      />

      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-6 md:py-10 pb-24 space-y-6">

          {/* Back button */}
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2 text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-1" /> Retour
          </Button>

          {/* === HEADER === */}
          <div className="flex flex-col sm:flex-row items-start gap-5">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={`Photo de ${firstName}`} className="w-24 h-24 rounded-full object-cover shadow-md border-2 border-background shrink-0" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-card border-2 border-border flex items-center justify-center font-heading text-3xl font-bold shrink-0 shadow-sm text-foreground">
                {firstName.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-heading text-2xl font-bold text-foreground">{firstName}</h1>
                {/* Status badges — migration en cours */}
              </div>

              <div className="flex items-center gap-3 text-sm mt-1 flex-wrap text-muted-foreground">
                {(profile.postal_code || profile.city) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {[profile.city, profile.postal_code].filter(Boolean).join(" · ")}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Membre depuis {memberSince}
                </span>
              </div>

              {profile.bio && (
                <p className="text-sm italic mt-2 text-muted-foreground">{profile.bio}</p>
              )}

              {/* Skills shown in Entraide tab only */}

              <div className="flex gap-2 mt-2">
                {isSitter && <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">🏡 Gardien</span>}
                {isOwner && <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">🐾 Propriétaire</span>}
              </div>
            </div>

            {!isOwnProfile && (
              <div className="flex gap-2 shrink-0">
                <ReportButton targetId={id!} targetType="profile" />
              </div>
            )}
          </div>

          {/* === METRICS BAR === */}
          <div className="grid grid-cols-4 divide-x rounded-xl border border-border bg-card p-0 shadow-sm">
            {defaultTab === "owner" ? (
              <MetricCell label="Séjours hébergés" value={String(completedSits)} />
            ) : (
              <MetricCell label="Gardes" value={String(totalSits)} />
            )}
            <MetricCell
              label="Note"
              value={reviewStats.count > 0 ? reviewStats.avg.toFixed(1) : "—"}
              suffix={reviewStats.count > 0 ? <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500 ml-0.5" /> : undefined}
            />
            <MetricCell
              label="Annulations"
              value={String((profile.cancellation_count || 0) + (profile.cancellations_as_proprio || 0))}
              variant={(profile.cancellation_count || 0) + (profile.cancellations_as_proprio || 0) === 0 ? "success" : "warning"}
            />
            <MetricCell label="Avis" value={String(reviewStats.count)} />
          </div>
          {(profile.cancellations_as_proprio || 0) > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {profile.cancellations_as_proprio} annulation{(profile.cancellations_as_proprio || 0) > 1 ? "s" : ""} de garde
            </p>
          )}
          {(profile.cancellation_count || 0) > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {profile.cancellation_count} annulation{(profile.cancellation_count || 0) > 1 ? "s" : ""} en tant que gardien
            </p>
          )}

          {/* === ENVIRONMENTS === */}
          {ownerProfile?.environments?.length > 0 && (
            <div className="mb-4">
              <EnvironmentPills selected={ownerProfile.environments} onChange={() => {}} readOnly />
            </div>
          )}

          {/* === BADGES === */}
          {/* Badges — migration en cours */}

          {/* === TABS === */}
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="w-full bg-card border border-border shadow-sm rounded-xl">
              {isSitter && <TabsTrigger value="sitter" className="flex-1 gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-primary">Gardien</TabsTrigger>}
              {isOwner && <TabsTrigger value="owner" className="flex-1 gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-primary">Propriétaire</TabsTrigger>}
              <TabsTrigger value="entraide" className="flex-1 gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <Handshake className="h-3.5 w-3.5" /> Entraide
              </TabsTrigger>
              <TabsTrigger value="reviews" className="flex-1 gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-primary">Avis ({reviewStats.count})</TabsTrigger>
              {(galleryPhotos.length > 0 || ownerGalleryPhotos.length > 0) && (
                <TabsTrigger value="gallery" className="flex-1 gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-primary">Galerie ({galleryPhotos.length + ownerGalleryPhotos.length})</TabsTrigger>
              )}
            </TabsList>

            {/* --- Sitter tab --- */}
            {isSitter && (
              <TabsContent value="sitter" className="space-y-4 mt-4">
                {sitterProfile ? (
                  <>
                    {/* Key info grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {sitterProfile.experience_years && <InfoCell icon={<Briefcase className="h-4 w-4" />} label="Expérience" value={sitterProfile.experience_years === "5+" ? "5+ ans" : sitterProfile.experience_years + " ans"} />}
                      {sitterProfile.animal_types?.length > 0 && <InfoCell icon={<PawPrint className="h-4 w-4" />} label="Animaux" value={sitterProfile.animal_types.map((t: string) => speciesLabels[t]?.slice(2) || t).join(", ")} />}
                      {sitterProfile.has_vehicle !== null && <InfoCell icon={<Car className="h-4 w-4" />} label="Véhicule" value={sitterProfile.has_vehicle ? "Oui" : "Non"} />}
                      {sitterProfile.languages?.length > 0 && <InfoCell icon={<Globe className="h-4 w-4" />} label="Langues" value={sitterProfile.languages.join(", ")} />}
                    </div>

                    {/* Motivation */}
                    {sitterProfile.motivation && (
                      <Card>
                        <h3 className="font-heading font-semibold text-sm mb-1 text-foreground">Motivation</h3>
                        <p className="text-sm whitespace-pre-line text-muted-foreground">{sitterProfile.motivation}</p>
                      </Card>
                    )}

                    {/* Lifestyle */}
                    {sitterProfile.lifestyle?.length > 0 && (
                      <Card>
                        <h3 className="font-heading font-semibold text-sm mb-2 text-foreground">Mode de vie</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {sitterProfile.lifestyle.map((l: string) => (
                            <span key={l} className="px-2.5 py-1 rounded-full text-xs bg-muted text-foreground">
                              {lifestyleLabels[l] || l}
                            </span>
                          ))}
                        </div>
                      </Card>
                    )}

                    {/* Bonus skills */}
                    {sitterProfile.bonus_skills?.length > 0 && (
                      <Card>
                        <h3 className="font-heading font-semibold text-sm mb-2 text-foreground">Compétences bonus</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {sitterProfile.bonus_skills.map((s: string) => (
                            <span key={s} className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">{s}</span>
                          ))}
                        </div>
                      </Card>
                    )}

                    {/* Handover preferences */}
                    {sitterProfile.handover_preference && (
                      <Card>
                        <h3 className="font-heading font-semibold text-sm mb-1 text-foreground">Comment j'aime arriver</h3>
                        <p className="text-sm text-muted-foreground">{sitterProfile.handover_preference}</p>
                      </Card>
                    )}

                    {/* References */}
                    {sitterProfile.references_text && (
                      <Card>
                        <h3 className="font-heading font-semibold text-sm mb-1 text-foreground">Références</h3>
                        <p className="text-sm whitespace-pre-line text-muted-foreground">{sitterProfile.references_text}</p>
                      </Card>
                    )}

                    {/* Past animals */}
                    {pastAnimals.length > 0 && (
                      <Card>
                        <h3 className="font-heading font-semibold text-sm mb-3 text-foreground">Animaux gardés par le passé</h3>
                        <div className="flex gap-4 overflow-x-auto pb-2">
                          {pastAnimals.map(pa => (
                            <div key={pa.id} className="flex flex-col items-center gap-1.5 shrink-0">
                              {pa.photo_url ? (
                                <img src={pa.photo_url} alt={pa.name} className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm" />
                              ) : (
                                <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center text-xl">
                                  {pa.species === "dog" ? "🐕" : pa.species === "cat" ? "🐱" : "🐾"}
                                </div>
                              )}
                              <span className="text-xs font-medium text-foreground">{pa.name}</span>
                              {pa.breed && <span className="text-[10px] text-muted-foreground">{pa.breed}</span>}
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}

                    {/* External experiences */}
                    <PublicExperiences experiences={externalExperiences} />
                  </>
                ) : (
                  <p className="text-sm italic text-muted-foreground">Profil gardien non complété.</p>
                )}
              </TabsContent>
            )}

            {/* --- Owner tab --- */}
            {isOwner && (
              <TabsContent value="owner" className="space-y-4 mt-4">
                {/* Pets */}
                {pets.length > 0 && (
                  <Card>
                    <h3 className="font-heading font-semibold text-sm mb-3 text-foreground">Les animaux</h3>
                    <div className="grid gap-3">
                      {pets.map(pet => (
                        <div key={pet.id} className="flex items-center gap-3">
                          {pet.photo_url ? (
                            <img src={pet.photo_url} alt={pet.name} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm" />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center text-lg">
                              {speciesLabels[pet.species]?.charAt(0) || "🐾"}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-sm text-foreground">{pet.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {speciesLabels[pet.species]?.slice(2) || pet.species}
                              {pet.breed && ` · ${pet.breed}`}
                              {pet.age && ` · ${pet.age} an${pet.age > 1 ? "s" : ""}`}
                            </p>
                            {pet.character && <p className="text-xs mt-0.5 text-muted-foreground">{pet.character}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Properties */}
                {properties.map(prop => (
                  <Card key={prop.id}>
                    <h3 className="font-heading font-semibold text-sm mb-2 flex items-center gap-2 text-foreground">
                      <Home className="h-4 w-4" /> Le logement
                    </h3>
                    <div className="text-sm mb-2 text-muted-foreground">
                      <span className="capitalize font-medium">{prop.type}</span>
                      {prop.environment && <span> · {prop.environment}</span>}
                    </div>
                    {prop.description && <p className="text-sm mb-3 text-muted-foreground">{prop.description}</p>}
                    {prop.photos?.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1">
                        {prop.photos.slice(0, 6).map((url: string, i: number) => (
                          <img key={i} src={url} alt="" className="w-32 h-24 rounded-lg object-cover shrink-0 shadow-sm" />
                        ))}
                      </div>
                    )}
                    {prop.equipments?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {prop.equipments.map((e: string) => (
                          <span key={e} className="px-2 py-0.5 rounded-full text-xs bg-muted text-foreground">{e}</span>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}

                {/* Owner preferences */}
                {ownerProfile && (
                  <>
                    {ownerProfile.welcome_notes && (
                      <Card>
                        <h3 className="font-heading font-semibold text-sm mb-1 text-foreground">Comment j'accueille</h3>
                        <p className="text-sm text-muted-foreground">{ownerProfile.welcome_notes}</p>
                      </Card>
                    )}
                    {ownerProfile.rules_notes && (
                      <Card>
                        <h3 className="font-heading font-semibold text-sm mb-1 text-foreground">Règles de la maison</h3>
                        <p className="text-sm whitespace-pre-line text-muted-foreground">{ownerProfile.rules_notes}</p>
                      </Card>
                    )}
                  </>
                )}

                {/* Highlights (coups de coeur) */}
                <OwnerHighlights highlights={ownerHighlights} />
              </TabsContent>
            )}

            {/* --- Entraide tab --- */}
            <TabsContent value="entraide" className="mt-4 space-y-6">
              {profile.available_for_help && profile.skill_categories?.length > 0 && (
                <PublicSkills skillCategories={profile.skill_categories} userId={id!} firstName={firstName} city={profile.city} />
              )}
              <EntraideSection userId={id!} />
            </TabsContent>

            {/* --- Reviews tab --- */}
            <TabsContent value="reviews" className="mt-4 space-y-8">
              <ReviewsDisplay userId={id!} showAnimalCare={isSitter} />
              <CancellationReviewsSection userId={id!} />
            </TabsContent>

            {/* --- Gallery tab --- */}
            <TabsContent value="gallery" className="space-y-6 mt-4">
              {galleryPhotos.length > 0 && <PublicGallery photos={galleryPhotos} firstName={firstName} />}
              {ownerGalleryPhotos.length > 0 && <PublicOwnerGallery photos={ownerGalleryPhotos} firstName={firstName} city={profile.city} />}
            </TabsContent>
          </Tabs>
        </div>

        {/* === STICKY CTA === */}
        {!isOwnProfile && user && (
          <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur-sm shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
            <div className="max-w-3xl mx-auto px-4 py-3 flex gap-3">
              {activeSit && (
                <Button variant="outline" className="flex-1 gap-1.5" asChild>
                  <Link to={`/sits/${activeSit.id}`}>
                    <Eye className="h-4 w-4" /> Voir l'annonce
                  </Link>
                </Button>
              )}
              <Button className="flex-1 gap-1.5" onClick={handleContact}>
                <MessageSquare className="h-4 w-4" /> Contacter {firstName}
              </Button>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

/* Helpers */
const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-xl border border-border bg-card p-4 shadow-sm ${className}`}>
    {children}
  </div>
);

const MetricCell = ({ label, value, suffix, variant }: { label: string; value: string; suffix?: React.ReactNode; variant?: "success" | "warning" }) => (
  <div className="flex flex-col items-center py-3 gap-0.5">
    <span className={`text-lg font-bold flex items-center ${variant === "success" ? "text-green-600" : variant === "warning" ? "text-orange-600" : "text-foreground"}`}>
      {value}{suffix}
    </span>
    <span className="text-[11px] text-muted-foreground">{label}</span>
  </div>
);

const InfoCell = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
    <div className="flex items-center gap-2 mb-1 text-muted-foreground">
      {icon}
      <span className="text-xs">{label}</span>
    </div>
    <p className="text-sm font-medium text-foreground">{value}</p>
  </div>
);

export default PublicProfile;
