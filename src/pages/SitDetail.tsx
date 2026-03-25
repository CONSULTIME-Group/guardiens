import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, MapPin, Star, ShieldCheck, Home, PawPrint, MessageSquare, Users, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import ApplicationModal from "@/components/sits/ApplicationModal";
import ApplicationsList from "@/components/sits/ApplicationsList";
import ReviewsDisplay from "@/components/reviews/ReviewsDisplay";
import CancelSitModal from "@/components/sits/CancelSitModal";

const envLabels: Record<string, string> = {
  city_center: "Centre-ville", suburban: "Périurbain", countryside: "Campagne",
  mountain: "Montagne", seaside: "Bord de mer", forest: "Forêt",
};
const typeLabels: Record<string, string> = {
  apartment: "Appartement", house: "Maison", farm: "Ferme", chalet: "Chalet", other: "Autre",
};
const speciesEmoji: Record<string, string> = {
  dog: "🐕", cat: "🐈", horse: "🐴", bird: "🐦", rodent: "🐹",
  fish: "🐠", reptile: "🦎", farm_animal: "🐄", nac: "🐾",
};
const walkLabels: Record<string, string> = { none: "Aucune balade", "30min": "30 min/jour", "1h": "1h/jour", "2h_plus": "2h+/jour" };
const aloneLabels: Record<string, string> = { never: "Jamais seul", "2h": "2h max seul", "6h": "6h max seul", all_day: "Peut rester seul toute la journée" };

interface SitData {
  id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  flexible_dates: boolean | null;
  specific_expectations: string | null;
  open_to: string[] | null;
  status: string;
  user_id: string;
  property_id: string;
}

const SitDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, activeRole } = useAuth();
  const [sit, setSit] = useState<SitData | null>(null);
  const [owner, setOwner] = useState<any>(null);
  const [property, setProperty] = useState<any>(null);
  const [pets, setPets] = useState<any[]>([]);
  const [ownerProfile, setOwnerProfile] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [sitterProfile, setSitterProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [applyOpen, setApplyOpen] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data: sitData } = await supabase.from("sits").select("*").eq("id", id).single();
      if (!sitData) { setLoading(false); return; }
      setSit(sitData as SitData);

      const [ownerRes, propRes, ownerProfRes, reviewsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", sitData.user_id).single(),
        supabase.from("properties").select("*").eq("id", sitData.property_id).single(),
        supabase.from("owner_profiles").select("*").eq("user_id", sitData.user_id).maybeSingle(),
        supabase.from("reviews").select("*, reviewer:profiles!reviews_reviewer_id_fkey(first_name, avatar_url)").eq("reviewee_id", sitData.user_id).eq("published", true),
      ]);

      setOwner(ownerRes.data);
      setProperty(propRes.data);
      setOwnerProfile(ownerProfRes.data);
      setReviews(reviewsRes.data || []);

      if (propRes.data) {
        const { data: petsData } = await supabase.from("pets").select("*").eq("property_id", propRes.data.id);
        setPets(petsData || []);
      }

      // Load sitter profile for compatibility badges + check if already applied
      if (user) {
        const [spRes, appRes] = await Promise.all([
          supabase.from("sitter_profiles").select("*").eq("user_id", user.id).maybeSingle(),
          supabase.from("applications").select("id").eq("sit_id", id!).eq("sitter_id", user.id).maybeSingle(),
        ]);
        setSitterProfile(spRes.data);
        if (appRes.data) setHasApplied(true);
      }

      setLoading(false);
    };
    load();
  }, [id, user]);

  if (loading) return <div className="p-6 md:p-10 text-muted-foreground">Chargement...</div>;
  if (!sit) return <div className="p-6 md:p-10"><p>Annonce introuvable.</p></div>;

  const photos: string[] = (property as any)?.photos || [];
  const avgRating = reviews.length > 0 ? (reviews.reduce((s: number, r: any) => s + r.overall_rating, 0) / reviews.length).toFixed(1) : null;

  // Compatibility badges
  const badges: string[] = [];
  if (sitterProfile && activeRole === "sitter") {
    const sitterAnimals: string[] = sitterProfile.animal_types || [];
    const petSpecies = pets.map((p: any) => p.species);
    const matchAnimal = petSpecies.some((s: string) => sitterAnimals.includes(s));
    if (matchAnimal) badges.push("Correspond à votre expérience animaux");
    if (sitterProfile.geographic_radius && owner?.city && user?.firstName) badges.push(`Proche de chez vous`);
  }

  const formatDate = (d: string | null) => d ? format(new Date(d), "d MMMM yyyy", { locale: fr }) : "";

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto animate-fade-in pb-32">
      <Link to="/search" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Retour à la recherche
      </Link>

      {/* Compatibility badges */}
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {badges.map(b => (
            <span key={b} className="px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: "#D8F3DC", color: "#2D6A4F" }}>
              <CheckCircle2 className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />{b}
            </span>
          ))}
        </div>
      )}

      {/* Header */}
      <h1 className="font-heading text-2xl md:text-3xl font-bold mb-2">{sit.title}</h1>
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
        <span className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4" />
          {formatDate(sit.start_date)} → {formatDate(sit.end_date)}
          {sit.flexible_dates && <span className="text-xs bg-accent px-2 py-0.5 rounded-full ml-1">Flexible</span>}
        </span>
        {owner?.city && (
          <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{owner.city}</span>
        )}
      </div>

      {/* Owner badge */}
      {owner && (
        <div className="flex items-center gap-3 mb-8 p-3 bg-card rounded-lg border border-border">
          {owner.avatar_url ? (
            <img src={owner.avatar_url} alt={owner.first_name} className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center font-heading text-lg font-bold">
              {owner.first_name?.charAt(0) || "?"}
            </div>
          )}
          <div>
            <p className="font-medium">{owner.first_name}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {avgRating && <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />{avgRating}</span>}
              <span>{reviews.length} avis</span>
            </div>
          </div>
        </div>
      )}

      {/* Le logement */}
      {property && (
        <Section icon={Home} title="Le logement">
          {photos.length > 0 && (
            <div className="mb-4 relative">
              <img src={photos[photoIndex]} alt="Logement" className="w-full h-64 rounded-lg object-cover" />
              {photos.length > 1 && (
                <div className="flex gap-1.5 mt-2 overflow-x-auto">
                  {photos.map((p: string, i: number) => (
                    <button key={i} onClick={() => setPhotoIndex(i)}
                      className={`w-16 h-12 rounded-md object-cover border-2 shrink-0 overflow-hidden ${i === photoIndex ? "border-primary" : "border-transparent"}`}>
                      <img src={p} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <p className="text-sm font-medium">{typeLabels[property.type] || property.type} · {envLabels[property.environment] || property.environment}</p>
          {property.rooms_count ? <p className="text-sm text-muted-foreground">{property.rooms_count} pièces · {property.bedrooms_count} chambres</p> : null}
          {property.description && <p className="text-sm text-muted-foreground mt-2">{property.description}</p>}
          {property.equipments?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {property.equipments.map((eq: string) => (
                <span key={eq} className="px-2 py-0.5 rounded-full bg-accent text-xs">{eq}</span>
              ))}
            </div>
          )}
          {property.region_highlights && <p className="text-sm text-muted-foreground mt-2">🌿 {property.region_highlights}</p>}
        </Section>
      )}

      {/* Les animaux */}
      {pets.length > 0 && (
        <Section icon={PawPrint} title="Les animaux">
          <div className="space-y-4">
            {pets.map((pet: any) => (
              <div key={pet.id} className="flex gap-3 p-3 bg-accent/50 rounded-lg">
                {pet.photo_url ? (
                  <img src={pet.photo_url} alt={pet.name} className="w-14 h-14 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center text-2xl shrink-0">
                    {speciesEmoji[pet.species] || "🐾"}
                  </div>
                )}
                <div>
                  <p className="font-medium text-sm">{speciesEmoji[pet.species]} {pet.name}{pet.breed ? ` — ${pet.breed}` : ""}{pet.age ? ` · ${pet.age} ans` : ""}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {[
                      pet.walk_duration && pet.walk_duration !== "none" ? walkLabels[pet.walk_duration] : null,
                      pet.alone_duration ? aloneLabels[pet.alone_duration] : null,
                      pet.medication ? "Médication requise" : "Pas de médication",
                    ].filter(Boolean).join(" · ")}
                  </p>
                  {pet.character && <p className="text-xs text-muted-foreground mt-0.5">{pet.character}</p>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Ce qu'on attend */}
      {(ownerProfile || sit.specific_expectations) && (
        <Section icon={ShieldCheck} title="Ce qu'on attend">
          <div className="text-sm space-y-2">
            {ownerProfile?.preferred_sitter_types?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {ownerProfile.preferred_sitter_types.map((t: string) => (
                  <span key={t} className="px-2 py-0.5 rounded-full bg-accent text-xs">{t}</span>
                ))}
              </div>
            )}
            {ownerProfile?.presence_expected && <p>Présence attendue : {ownerProfile.presence_expected}</p>}
            {ownerProfile?.visits_allowed && <p>Visites : {ownerProfile.visits_allowed}</p>}
            {ownerProfile?.overnight_guest && <p>Invités : {ownerProfile.overnight_guest}</p>}
            {ownerProfile?.rules_notes && <p className="text-muted-foreground">{ownerProfile.rules_notes}</p>}
            {sit.specific_expectations && <p className="mt-2 p-3 bg-accent/50 rounded-lg">{sit.specific_expectations}</p>}
          </div>
        </Section>
      )}

      {/* L'accueil */}
      {ownerProfile && (ownerProfile.meeting_preference?.length > 0 || ownerProfile.news_frequency) && (
        <Section icon={MessageSquare} title="L'accueil">
          <div className="text-sm space-y-1">
            {ownerProfile.meeting_preference?.length > 0 && <p>Rencontre : {ownerProfile.meeting_preference.join(", ")}</p>}
            {ownerProfile.handover_preference && <p>Passage de relais : {ownerProfile.handover_preference}</p>}
            {ownerProfile.welcome_notes && <p className="text-muted-foreground">{ownerProfile.welcome_notes}</p>}
            {ownerProfile.news_frequency && <p>Nouvelles : {ownerProfile.news_frequency}</p>}
            {ownerProfile.news_format?.length > 0 && <p>Format : {ownerProfile.news_format.join(", ")}</p>}
          </div>
        </Section>
      )}

      {/* Avis */}
      <Section icon={Star} title="Avis">
        <ReviewsDisplay userId={sit.user_id} showAnimalCare={false} />
      </Section>

      {/* Leave review CTA for completed sits */}
      {sit.status === "completed" && user && sit.user_id !== user.id && (
        <div className="mt-4">
          <Link to={`/review/${sit.id}`}>
            <Button variant="outline" className="w-full gap-2">
              <Star className="h-4 w-4" /> Laisser un avis
            </Button>
          </Link>
        </div>
      )}
      {sit.status === "completed" && user && sit.user_id === user.id && (
        <div className="mt-4">
          <Link to={`/review/${sit.id}`}>
            <Button variant="outline" className="w-full gap-2">
              <Star className="h-4 w-4" /> Laisser un avis sur le gardien
            </Button>
          </Link>
        </div>
      )}

      {/* Reassurance */}
      <div className="mt-8 bg-primary/5 border border-primary/10 rounded-lg p-5 text-center">
        <p className="font-heading text-sm font-semibold text-primary">Vous partez l'esprit léger — et si un imprévu survient, votre réseau local de gardiens prend le relais.</p>
        <p className="text-xs text-muted-foreground mt-1">Profils vérifiés · Avis croisés · Gardiens d'urgence mobilisables</p>
      </div>

      {/* Owner: house guide + applications list */}
      {sit.user_id === user?.id && (
        <>
          <div className="mt-8 p-4 bg-accent/50 rounded-lg border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">📋 Guide de la maison</p>
                <p className="text-xs text-muted-foreground">Adresse, codes, contacts véto, consignes — partagé avec le gardien après confirmation</p>
              </div>
              <Link to={`/house-guide/${sit.property_id}`}>
                <Button variant="outline" size="sm">Modifier</Button>
              </Link>
            </div>
          </div>
          <ApplicationsList
            sitId={sit.id}
            sitTitle={sit.title}
            petNames={pets.map((p: any) => p.name)}
            startDate={formatDate(sit.start_date)}
            endDate={formatDate(sit.end_date)}
            propertyId={sit.property_id}
          />
        </>
      )}

      {/* Sitter: apply button */}
      {activeRole === "sitter" && sit.user_id !== user?.id && (
        <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-card border-t border-border p-4 z-40 md:pb-4 pb-20">
          <div className="max-w-3xl mx-auto">
            {hasApplied ? (
              <Button className="w-full h-12 text-base font-semibold" disabled>
                <CheckCircle2 className="h-5 w-5 mr-2" /> Candidature envoyée ✓
              </Button>
            ) : (
              <Button className="w-full h-12 text-base font-semibold" onClick={() => setApplyOpen(true)}>
                Postuler
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Application modal */}
      <ApplicationModal
        open={applyOpen}
        onOpenChange={setApplyOpen}
        sitId={sit.id}
        ownerId={sit.user_id}
        ownerFirstName={owner?.first_name || ""}
        petNames={pets.map((p: any) => p.name)}
        city={owner?.city || ""}
        startDate={formatDate(sit.start_date)}
        endDate={formatDate(sit.end_date)}
        onSuccess={() => setHasApplied(true)}
      />
    </div>
  );
};

const Section = ({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) => (
  <div className="mt-8">
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-4 w-4 text-primary" />
      <h2 className="font-heading text-lg font-semibold">{title}</h2>
    </div>
    {children}
  </div>
);

export default SitDetail;
