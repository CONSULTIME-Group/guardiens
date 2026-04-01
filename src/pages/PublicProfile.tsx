import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Calendar, Star, PawPrint, Car, Globe, Briefcase, Home, MessageSquare, ArrowLeft, Eye, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Helmet } from "react-helmet-async";
import BadgeShieldGrid from "@/components/badges/BadgeShieldGrid";
import BadgeShield from "@/components/badges/BadgeShield";
import StatusShield from "@/components/badges/StatusShield";
import ReviewsDisplay from "@/components/reviews/ReviewsDisplay";
import ReportButton from "@/components/reports/ReportButton";
import PublicGallery from "@/components/profile/PublicGallery";
import PublicExperiences from "@/components/profile/PublicExperiences";
import PublicOwnerGallery from "@/components/profile/PublicOwnerGallery";
import OwnerHighlights from "@/components/profile/OwnerHighlights";
import { getBadgeDef } from "@/components/badges/badgeDefinitions";
import EntraideSection from "@/components/missions/EntraideSection";
import PublicSkills from "@/components/profile/PublicSkills";
import EnvironmentPills from "@/components/shared/EnvironmentPills";
import CancellationReviewsSection from "@/components/reviews/CancellationReviewsSection";

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
        supabase.from("profiles").select("*").eq("id", id).single(),
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
        supabase.from("badge_attributions").select("badge_key").eq("receiver_id", id),
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
        badgesRes.data.forEach((b: any) => countMap.set(b.badge_key, (countMap.get(b.badge_key) || 0) + 1));
        setBadgeCounts(Array.from(countMap.entries()).map(([badge_key, count]) => ({ badge_key, count })));
      }

      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return <div className="p-6 md:p-10 text-muted-foreground">Chargement...</div>;
  if (!profile) return <div className="p-6 md:p-10 text-muted-foreground">Profil introuvable.</div>;

  const memberSince = format(new Date(profile.created_at), "MMMM yyyy", { locale: fr });
  const isSitter = profile.role === "sitter" || profile.role === "both";
  const isOwner = profile.role === "owner" || profile.role === "both";
  const isOwnProfile = user?.id === id;
  const verifiedExpCount = externalExperiences.filter((e: any) => e.verification_status === "verified").length;
  const totalSits = completedSits + verifiedExpCount;
  const firstName = profile.first_name || "Membre";
  const topBadge = badgeCounts.length > 0 ? getBadgeDef(badgeCounts.sort((a, b) => b.count - a.count)[0].badge_key)?.label : "";
  const shouldIndex = (profile.profile_completion || 0) >= 60;

  const metaTitle = isSitter
    ? `${firstName} — Gardien vérifié à ${profile.city || "France"} | Guardiens`
    : `${firstName} — Propriétaire à ${profile.city || "France"} | Guardiens`;
  const metaDesc = isSitter
    ? `${firstName}, gardien à ${profile.city || "France"}. ${totalSits} garde${totalSits > 1 ? "s" : ""}, note ${reviewStats.avg.toFixed(1)}/5. ${topBadge ? topBadge + ". " : ""}Contactez-le sur Guardiens.`
    : `${firstName}, propriétaire à ${profile.city || "France"}. ${pets.length} animal${pets.length > 1 ? "ux" : ""}. ${totalSits} garde${totalSits > 1 ? "s" : ""}, note ${reviewStats.avg.toFixed(1)}/5.`;

  const handleContact = async () => {
    if (!user || !id) return;
    const { data: existingConv } = await supabase
      .from("conversations")
      .select("id")
      .or(`and(owner_id.eq.${user.id},sitter_id.eq.${id}),and(owner_id.eq.${id},sitter_id.eq.${user.id})`)
      .maybeSingle();
    if (existingConv) {
      navigate(`/messages?conv=${existingConv.id}`);
    } else {
      const { data: newConv } = await supabase.from("conversations").insert({ owner_id: user.id, sitter_id: id }).select("id").single();
      if (newConv) navigate(`/messages?conv=${newConv.id}`);
    }
  };

  return (
    <TooltipProvider>
      {/* SEO */}
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDesc} />
        {!shouldIndex && <meta name="robots" content="noindex, nofollow" />}
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDesc} />
        {profile.avatar_url && <meta property="og:image" content={profile.avatar_url} />}
        <meta property="og:type" content="profile" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Person",
          name: firstName,
          ...(profile.city && { address: { "@type": "PostalAddress", addressLocality: profile.city } }),
          ...(profile.identity_verified && { hasCredential: { "@type": "EducationalOccupationalCredential", credentialCategory: "Identity Verified" } }),
        })}</script>
      </Helmet>

      <div className="min-h-screen" style={{ backgroundColor: "#FAF9F6" }}>
        <div className="max-w-3xl mx-auto px-4 py-6 md:py-10 pb-24 space-y-6">

          {/* Back button */}
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2 text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-1" /> Retour
          </Button>

          {/* === HEADER === */}
          <div className="flex flex-col sm:flex-row items-start gap-5">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={`Photo de ${firstName}`} className="w-24 h-24 rounded-full object-cover shadow-md border-2 border-white shrink-0" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-white border-2 border-border flex items-center justify-center font-heading text-3xl font-bold shrink-0 shadow-sm" style={{ color: "#1C1B18" }}>
                {firstName.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-heading text-2xl font-bold" style={{ color: "#1C1B18" }}>{firstName}</h1>
                {profile.identity_verified && <StatusShield type="verified" />}
                {profile.is_founder && <StatusShield type="founder" />}
                {isEmergencySitter && <StatusShield type="emergency" />}
              </div>

              <div className="flex items-center gap-3 text-sm mt-1 flex-wrap" style={{ color: "#6B7280" }}>
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
                <p className="text-sm italic mt-2" style={{ color: "#4B5563" }}>{profile.bio}</p>
              )}

              {/* Skills section */}
              {profile.available_for_help && profile.skill_categories?.length > 0 && (
                <PublicSkills skillCategories={profile.skill_categories} userId={id!} />
              )}

              <div className="flex gap-2 mt-2">
                {isSitter && <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: "#D8F3DC", color: "#2D6A4F" }}>🏡 Gardien</span>}
                {isOwner && <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: "#DBEAFE", color: "#1E40AF" }}>🐾 Propriétaire</span>}
              </div>
            </div>

            {!isOwnProfile && (
              <div className="flex gap-2 shrink-0">
                <ReportButton targetId={id!} targetType="profile" />
              </div>
            )}
          </div>

          {/* === METRICS BAR === */}
          <div className="grid grid-cols-4 divide-x rounded-xl border bg-white p-0 shadow-sm" style={{ borderColor: "#E6E2D9" }}>
            <MetricCell label="Gardes" value={String(totalSits)} />
            <MetricCell
              label="Note"
              value={reviewStats.count > 0 ? reviewStats.avg.toFixed(1) : "—"}
              suffix={reviewStats.count > 0 ? <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500 ml-0.5" /> : undefined}
            />
            <MetricCell
              label="Annulations"
              value={String(profile.cancellation_count || 0)}
              valueColor={(profile.cancellation_count || 0) === 0 ? "#16A34A" : "#EA580C"}
            />
            <MetricCell label="Avis" value={String(reviewStats.count)} />
          </div>

          {/* === ENVIRONMENTS === */}
          {ownerProfile?.environments?.length > 0 && (
            <div className="mb-4">
              <EnvironmentPills selected={ownerProfile.environments} onChange={() => {}} readOnly />
            </div>
          )}

          {/* === BADGES === */}
          {badgeCounts.length > 0 && (
            <div className="rounded-xl border bg-white p-5 shadow-sm" style={{ borderColor: "#E6E2D9" }}>
              <BadgeShieldGrid badges={badgeCounts} title={isSitter ? "Ses badges" : "Ses badges"} />
            </div>
          )}

          {/* === TABS === */}
          <Tabs defaultValue={isSitter ? "sitter" : "owner"} className="w-full">
            <TabsList className="w-full bg-white border shadow-sm rounded-xl" style={{ borderColor: "#E6E2D9" }}>
              {isSitter && <TabsTrigger value="sitter" className="flex-1 gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-primary">Gardien</TabsTrigger>}
              {isOwner && <TabsTrigger value="owner" className="flex-1 gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-primary">Propriétaire</TabsTrigger>}
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
                        <h3 className="font-heading font-semibold text-sm mb-1" style={{ color: "#1C1B18" }}>Motivation</h3>
                        <p className="text-sm whitespace-pre-line" style={{ color: "#4B5563" }}>{sitterProfile.motivation}</p>
                      </Card>
                    )}

                    {/* Lifestyle */}
                    {sitterProfile.lifestyle?.length > 0 && (
                      <Card>
                        <h3 className="font-heading font-semibold text-sm mb-2" style={{ color: "#1C1B18" }}>Mode de vie</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {sitterProfile.lifestyle.map((l: string) => (
                            <span key={l} className="px-2.5 py-1 rounded-full text-xs" style={{ backgroundColor: "#F3F4F6", color: "#374151" }}>
                              {lifestyleLabels[l] || l}
                            </span>
                          ))}
                        </div>
                      </Card>
                    )}

                    {/* Bonus skills */}
                    {sitterProfile.bonus_skills?.length > 0 && (
                      <Card>
                        <h3 className="font-heading font-semibold text-sm mb-2" style={{ color: "#1C1B18" }}>Compétences bonus</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {sitterProfile.bonus_skills.map((s: string) => (
                            <span key={s} className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: "#D8F3DC", color: "#2D6A4F" }}>{s}</span>
                          ))}
                        </div>
                      </Card>
                    )}

                    {/* Handover preferences */}
                    {sitterProfile.handover_preference && (
                      <Card>
                        <h3 className="font-heading font-semibold text-sm mb-1" style={{ color: "#1C1B18" }}>Comment j'aime arriver</h3>
                        <p className="text-sm" style={{ color: "#4B5563" }}>{sitterProfile.handover_preference}</p>
                      </Card>
                    )}

                    {/* References */}
                    {sitterProfile.references_text && (
                      <Card>
                        <h3 className="font-heading font-semibold text-sm mb-1" style={{ color: "#1C1B18" }}>Références</h3>
                        <p className="text-sm whitespace-pre-line" style={{ color: "#4B5563" }}>{sitterProfile.references_text}</p>
                      </Card>
                    )}

                    {/* Past animals */}
                    {pastAnimals.length > 0 && (
                      <Card>
                        <h3 className="font-heading font-semibold text-sm mb-3" style={{ color: "#1C1B18" }}>Animaux gardés par le passé</h3>
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
                              <span className="text-xs font-medium" style={{ color: "#1C1B18" }}>{pa.name}</span>
                              {pa.breed && <span className="text-[10px]" style={{ color: "#6B7280" }}>{pa.breed}</span>}
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}

                    {/* External experiences */}
                    <PublicExperiences experiences={externalExperiences} />
                  </>
                ) : (
                  <p className="text-sm italic" style={{ color: "#6B7280" }}>Profil gardien non complété.</p>
                )}
              </TabsContent>
            )}

            {/* --- Owner tab --- */}
            {isOwner && (
              <TabsContent value="owner" className="space-y-4 mt-4">
                {/* Pets */}
                {pets.length > 0 && (
                  <Card>
                    <h3 className="font-heading font-semibold text-sm mb-3" style={{ color: "#1C1B18" }}>Les animaux</h3>
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
                            <p className="font-medium text-sm" style={{ color: "#1C1B18" }}>{pet.name}</p>
                            <p className="text-xs" style={{ color: "#6B7280" }}>
                              {speciesLabels[pet.species]?.slice(2) || pet.species}
                              {pet.breed && ` · ${pet.breed}`}
                              {pet.age && ` · ${pet.age} an${pet.age > 1 ? "s" : ""}`}
                            </p>
                            {pet.character && <p className="text-xs mt-0.5" style={{ color: "#4B5563" }}>{pet.character}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Properties */}
                {properties.map(prop => (
                  <Card key={prop.id}>
                    <h3 className="font-heading font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: "#1C1B18" }}>
                      <Home className="h-4 w-4" /> Le logement
                    </h3>
                    <div className="text-sm mb-2" style={{ color: "#4B5563" }}>
                      <span className="capitalize font-medium">{prop.type}</span>
                      {prop.environment && <span> · {prop.environment}</span>}
                    </div>
                    {prop.description && <p className="text-sm mb-3" style={{ color: "#4B5563" }}>{prop.description}</p>}
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
                          <span key={e} className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: "#F3F4F6", color: "#374151" }}>{e}</span>
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
                        <h3 className="font-heading font-semibold text-sm mb-1" style={{ color: "#1C1B18" }}>Comment j'accueille</h3>
                        <p className="text-sm" style={{ color: "#4B5563" }}>{ownerProfile.welcome_notes}</p>
                      </Card>
                    )}
                    {ownerProfile.rules_notes && (
                      <Card>
                        <h3 className="font-heading font-semibold text-sm mb-1" style={{ color: "#1C1B18" }}>Règles de la maison</h3>
                        <p className="text-sm whitespace-pre-line" style={{ color: "#4B5563" }}>{ownerProfile.rules_notes}</p>
                      </Card>
                    )}
                  </>
                )}

                {/* Highlights (coups de coeur) */}
                <OwnerHighlights highlights={ownerHighlights} />
              </TabsContent>
            )}

            {/* --- Reviews tab --- */}
            <TabsContent value="reviews" className="mt-4 space-y-8">
              <ReviewsDisplay userId={id!} showAnimalCare={isSitter} />
              <EntraideSection userId={id!} />
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
          <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white/95 backdrop-blur-sm shadow-[0_-2px_10px_rgba(0,0,0,0.05)]" style={{ borderColor: "#E6E2D9" }}>
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
  <div className={`rounded-xl border bg-white p-4 shadow-sm ${className}`} style={{ borderColor: "#E6E2D9" }}>
    {children}
  </div>
);

const MetricCell = ({ label, value, suffix, valueColor }: { label: string; value: string; suffix?: React.ReactNode; valueColor?: string }) => (
  <div className="flex flex-col items-center py-3 gap-0.5">
    <span className="text-lg font-bold flex items-center" style={{ color: valueColor || "#1C1B18" }}>
      {value}{suffix}
    </span>
    <span className="text-[11px]" style={{ color: "#6B7280" }}>{label}</span>
  </div>
);

const InfoCell = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="rounded-xl border bg-white p-3 shadow-sm" style={{ borderColor: "#E6E2D9" }}>
    <div className="flex items-center gap-2 mb-1" style={{ color: "#6B7280" }}>
      {icon}
      <span className="text-xs">{label}</span>
    </div>
    <p className="text-sm font-medium" style={{ color: "#1C1B18" }}>{value}</p>
  </div>
);

export default PublicProfile;
