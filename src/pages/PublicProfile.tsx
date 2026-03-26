import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Calendar, Star, PawPrint, Car, Globe, Briefcase, Heart, Users, Home, MessageSquare, ArrowLeft } from "lucide-react";
import BadgePills from "@/components/badges/BadgePills";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import VerifiedBadge from "@/components/profile/VerifiedBadge";
import ReviewsDisplay from "@/components/reviews/ReviewsDisplay";
import ReportButton from "@/components/reports/ReportButton";
import PublicGallery from "@/components/profile/PublicGallery";
import PublicExperiences from "@/components/profile/PublicExperiences";
import PublicOwnerGallery from "@/components/profile/PublicOwnerGallery";
import OwnerHighlights from "@/components/profile/OwnerHighlights";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageMeta from "@/components/PageMeta";

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
        const allPets = propsRes.data.flatMap((p: any) => p.pets || []);
        setPets(allPets);
      }

      const reviews = reviewsRes.data || [];
      setReviewStats({
        count: reviews.length,
        avg: reviews.length > 0 ? reviews.reduce((s: number, r: any) => s + r.overall_rating, 0) / reviews.length : 0,
      });

      // Past animals for sitter
      if (sitterRes.data) {
        const { data: pa } = await supabase.from("past_animals").select("*").eq("sitter_profile_id", sitterRes.data.id);
        setPastAnimals(pa || []);
      }

      // Completed sits count
      const { count } = await supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("sitter_id", id)
        .eq("status", "accepted");
      setCompletedSits(count || 0);

      // Gallery photos (sitter)
      const { data: gallery } = await supabase.from("sitter_gallery").select("*").eq("user_id", id).order("created_at", { ascending: false });
      setGalleryPhotos(gallery || []);

      // External experiences (only verified ones visible publicly via RLS)
      const { data: extExp } = await supabase.from("external_experiences").select("*").eq("user_id", id).order("created_at", { ascending: false });
      setExternalExperiences(extExp || []);

      // Owner gallery
      const { data: ownerGal } = await supabase.from("owner_gallery").select("*").eq("user_id", id).order("created_at", { ascending: false });
      setOwnerGalleryPhotos(ownerGal || []);

      // Owner highlights (coups de coeur)
      const { data: highlights } = await supabase
        .from("owner_highlights")
        .select("*, sitter:sitter_id(first_name, avatar_url)")
        .eq("owner_id", id)
        .eq("hidden", false)
        .order("created_at", { ascending: false });
      setOwnerHighlights(highlights || []);

      // Badge counts
      const { data: badges } = await supabase.from("badge_attributions").select("badge_key").eq("receiver_id", id);
      if (badges && badges.length > 0) {
        const countMap = new Map<string, number>();
        badges.forEach((b: any) => countMap.set(b.badge_key, (countMap.get(b.badge_key) || 0) + 1));
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

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-10 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2 -ml-2 text-muted-foreground">
        <ArrowLeft className="w-4 h-4 mr-1" /> Retour
      </Button>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start gap-5">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="w-24 h-24 rounded-2xl object-cover shadow-md shrink-0" />
        ) : (
          <div className="w-24 h-24 rounded-2xl bg-muted flex items-center justify-center font-heading text-3xl font-bold shrink-0">
            {profile.first_name?.charAt(0) || "?"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-heading text-2xl font-bold">{profile.first_name}</h1>
            {profile.identity_verified && <VerifiedBadge size="md" />}
            {profile.is_founder && (
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">Fondateur</span>
            )}
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
            {(profile.postal_code || profile.city) && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {[profile.postal_code, profile.city].filter(Boolean).join(" ")}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Membre depuis {memberSince}
            </span>
          </div>

          {/* Roles badges */}
          <div className="flex gap-2 mt-2">
            {isSitter && (
              <span className="px-2.5 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium">🏡 Gardien</span>
            )}
            {isOwner && (
              <span className="px-2.5 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium">🐾 Propriétaire</span>
            )}
          </div>

          {/* Review summary */}
          {reviewStats.count > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="font-bold text-sm">{reviewStats.avg.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({reviewStats.count} avis)</span>
              {totalSits > 0 && (
                <span className="text-xs text-muted-foreground">
                  · {totalSits} garde{totalSits > 1 ? "s" : ""} au total
                  {verifiedExpCount > 0 && ` (${completedSits} Guardiens + ${verifiedExpCount} vérifiée${verifiedExpCount > 1 ? "s" : ""} ailleurs)`}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 shrink-0">
          {!isOwnProfile && user && (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={async () => {
                // Find existing conversation or create one
                const { data: existingConv } = await supabase
                  .from("conversations")
                  .select("id")
                  .or(`and(owner_id.eq.${user.id},sitter_id.eq.${id}),and(owner_id.eq.${id},sitter_id.eq.${user.id})`)
                  .maybeSingle();

                if (existingConv) {
                  navigate(`/messages?conv=${existingConv.id}`);
                } else {
                  const { data: newConv } = await supabase
                    .from("conversations")
                    .insert({ owner_id: user.id, sitter_id: id! })
                    .select("id")
                    .single();
                  if (newConv) navigate(`/messages?conv=${newConv.id}`);
                }
              }}
            >
              <MessageSquare className="h-3.5 w-3.5" /> Contacter
            </Button>
          )}
          {!isOwnProfile && (
            <ReportButton targetId={id!} targetType="profile" />
          )}
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <div className="p-4 rounded-xl bg-card border border-border">
          <p className="text-sm whitespace-pre-line">{profile.bio}</p>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue={isSitter ? "sitter" : "owner"} className="w-full">
        <TabsList className="w-full">
          {isSitter && <TabsTrigger value="sitter" className="flex-1 gap-1.5"><Users className="h-3.5 w-3.5" /> Gardien</TabsTrigger>}
          {isOwner && <TabsTrigger value="owner" className="flex-1 gap-1.5"><Home className="h-3.5 w-3.5" /> Propriétaire</TabsTrigger>}
          <TabsTrigger value="reviews" className="flex-1 gap-1.5"><Star className="h-3.5 w-3.5" /> Avis ({reviewStats.count})</TabsTrigger>
        </TabsList>

        {/* Sitter tab */}
        {isSitter && (
          <TabsContent value="sitter" className="space-y-4 mt-4">
            {sitterProfile ? (
              <>
                {/* Motivation */}
                {sitterProfile.motivation && (
                  <div>
                    <h3 className="font-heading font-semibold text-sm mb-1">Motivation</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{sitterProfile.motivation}</p>
                  </div>
                )}

                {/* Key info grid */}
                <div className="grid grid-cols-2 gap-3">
                  {sitterProfile.experience_years && (
                    <InfoCard icon={<Briefcase className="h-4 w-4" />} label="Expérience" value={sitterProfile.experience_years} />
                  )}
                  {sitterProfile.animal_types && sitterProfile.animal_types.length > 0 && (
                    <InfoCard icon={<PawPrint className="h-4 w-4" />} label="Animaux" value={sitterProfile.animal_types.map((t: string) => speciesLabels[t] || t).join(", ")} />
                  )}
                  {sitterProfile.has_vehicle !== null && (
                    <InfoCard icon={<Car className="h-4 w-4" />} label="Véhicule" value={sitterProfile.has_vehicle ? "Oui" : "Non"} />
                  )}
                  {sitterProfile.languages && sitterProfile.languages.length > 0 && (
                    <InfoCard icon={<Globe className="h-4 w-4" />} label="Langues" value={sitterProfile.languages.join(", ")} />
                  )}
                </div>

                {/* Lifestyle */}
                {sitterProfile.lifestyle && sitterProfile.lifestyle.length > 0 && (
                  <div>
                    <h3 className="font-heading font-semibold text-sm mb-2">Mode de vie</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {sitterProfile.lifestyle.map((l: string) => (
                        <span key={l} className="px-2.5 py-1 rounded-full bg-accent text-accent-foreground text-xs">
                          {lifestyleLabels[l] || l}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bonus skills */}
                {sitterProfile.bonus_skills && sitterProfile.bonus_skills.length > 0 && (
                  <div>
                    <h3 className="font-heading font-semibold text-sm mb-2">Compétences bonus</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {sitterProfile.bonus_skills.map((s: string) => (
                        <span key={s} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* References */}
                {sitterProfile.references_text && (
                  <div>
                    <h3 className="font-heading font-semibold text-sm mb-1">Références</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{sitterProfile.references_text}</p>
                  </div>
                )}

                {/* Past animals */}
                {pastAnimals.length > 0 && (
                  <div>
                    <h3 className="font-heading font-semibold text-sm mb-2">Animaux gardés par le passé</h3>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {pastAnimals.map(pa => (
                        <div key={pa.id} className="flex flex-col items-center gap-1 shrink-0">
                          {pa.photo_url ? (
                            <img src={pa.photo_url} alt={pa.name} className="w-14 h-14 rounded-full object-cover" />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-lg">
                              {pa.species === "dog" ? "🐕" : pa.species === "cat" ? "🐱" : "🐾"}
                            </div>
                          )}
                          <span className="text-xs font-medium">{pa.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* External experiences */}
                <PublicExperiences experiences={externalExperiences} />

                {/* Gallery */}
                <PublicGallery photos={galleryPhotos} firstName={profile.first_name || "Gardien"} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">Profil gardien non complété.</p>
            )}
          </TabsContent>
        )}

        {/* Owner tab */}
        {isOwner && (
          <TabsContent value="owner" className="space-y-4 mt-4">
            {/* Pets */}
            {pets.length > 0 && (
              <div>
                <h3 className="font-heading font-semibold text-sm mb-3">Animaux</h3>
                <div className="grid gap-3">
                  {pets.map(pet => (
                    <div key={pet.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                      {pet.photo_url ? (
                        <img src={pet.photo_url} alt={pet.name} className="w-12 h-12 rounded-xl object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-lg">
                          {speciesLabels[pet.species]?.charAt(0) || "🐾"}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm">{pet.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {speciesLabels[pet.species]?.slice(2) || pet.species}
                          {pet.breed && ` · ${pet.breed}`}
                          {pet.age && ` · ${pet.age} an${pet.age > 1 ? "s" : ""}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Properties */}
            {properties.length > 0 && (
              <div>
                <h3 className="font-heading font-semibold text-sm mb-3">Logement</h3>
                {properties.map(prop => (
                  <div key={prop.id} className="p-4 rounded-xl bg-card border border-border space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Home className="h-4 w-4 text-muted-foreground" />
                      <span className="capitalize font-medium">{prop.type}</span>
                      {prop.environment && <span className="text-muted-foreground">· {prop.environment}</span>}
                    </div>
                    {prop.description && (
                      <p className="text-sm text-muted-foreground">{prop.description}</p>
                    )}
                    {prop.photos && prop.photos.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {prop.photos.slice(0, 4).map((url: string, i: number) => (
                          <img key={i} src={url} alt="" className="w-28 h-20 rounded-lg object-cover shrink-0" />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Owner preferences */}
            {ownerProfile && (
              <div>
                <h3 className="font-heading font-semibold text-sm mb-2">Attentes</h3>
                <div className="text-sm text-muted-foreground space-y-1">
                  {ownerProfile.specific_expectations && <p>{ownerProfile.specific_expectations}</p>}
                  {ownerProfile.welcome_notes && <p>{ownerProfile.welcome_notes}</p>}
                </div>
              </div>
            )}

            {/* Highlights (coups de coeur) */}
            <OwnerHighlights highlights={ownerHighlights} />

            {/* Owner experiences */}
            <PublicExperiences experiences={externalExperiences} />

            {/* Owner gallery */}
            <PublicOwnerGallery photos={ownerGalleryPhotos} firstName={profile.first_name || "Propriétaire"} city={profile.city} />
          </TabsContent>
        )}

        {/* Reviews tab */}
        <TabsContent value="reviews" className="mt-4">
          <ReviewsDisplay userId={id!} showAnimalCare={isSitter} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const InfoCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="p-3 rounded-xl bg-card border border-border">
    <div className="flex items-center gap-2 text-muted-foreground mb-1">
      {icon}
      <span className="text-xs">{label}</span>
    </div>
    <p className="text-sm font-medium">{value}</p>
  </div>
);

export default PublicProfile;
