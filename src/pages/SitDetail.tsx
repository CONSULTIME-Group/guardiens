import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, MapPin, Star, ShieldCheck, Home, PawPrint, MessageSquare, CheckCircle2, XCircle, Send, Pencil, Heart, LockKeyhole } from "lucide-react";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { useAccessLevel } from "@/hooks/useAccessLevel";
import AccessGateBanner from "@/components/access/AccessGateBanner";
import PostConfirmationChecklist from "@/components/sits/PostConfirmationChecklist";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import ApplicationModal from "@/components/sits/ApplicationModal";
import ApplicationsList from "@/components/sits/ApplicationsList";
import ReviewsDisplay from "@/components/reviews/ReviewsDisplay";
import CancelSitModal from "@/components/sits/CancelSitModal";
import BreedProfileCard from "@/components/breeds/BreedProfileCard";
import ReportButton from "@/components/reports/ReportButton";
import VerifiedBadge from "@/components/profile/VerifiedBadge";
import LocationProfileCard from "@/components/location/LocationProfileCard";
import { useToast } from "@/hooks/use-toast";
import { geocodeCity } from "@/lib/geocode";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, activeRole } = useAuth();
  const { hasAccess: subHasAccess } = useSubscriptionAccess();
  const { level: accessLevel, profileCompletion, canApplyGuards } = useAccessLevel();
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
  const [cancelOpen, setCancelOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

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

      // Geocode city for map
      if (ownerRes.data?.city) {
        geocodeCity(ownerRes.data.city).then((result) => {
          if (result) setCoords({ lat: result.lat, lng: result.lng });
        });
      }

      if (propRes.data) {
        const { data: petsData } = await supabase.from("pets").select("*").eq("property_id", propRes.data.id);
        setPets(petsData || []);
      }

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
  const isOwner = sit.user_id === user?.id;
  const isDraft = sit.status === "draft";

  const badges: string[] = [];
  if (sitterProfile && activeRole === "sitter") {
    const sitterAnimals: string[] = sitterProfile.animal_types || [];
    const petSpecies = pets.map((p: any) => p.species);
    const matchAnimal = petSpecies.some((s: string) => sitterAnimals.includes(s));
    if (matchAnimal) badges.push("Correspond à votre expérience animaux");
    if (sitterProfile.geographic_radius && owner?.city && user?.firstName) badges.push("Proche de chez vous");
  }

  const formatDate = (d: string | null) => d ? format(new Date(d), "d MMMM yyyy", { locale: fr }) : "";

  const handlePublish = async () => {
    if (!isOwner || !isDraft || publishing) return;
    setPublishing(true);
    const { error } = await supabase
      .from("sits")
      .update({ status: "published" as any })
      .eq("id", sit.id)
      .eq("user_id", user!.id);
    setPublishing(false);
    if (error) {
      toast({ variant: "destructive", title: "Publication impossible", description: "Le brouillon n'a pas pu être publié." });
      return;
    }
    setSit({ ...sit, status: "published" });
    toast({ title: "Annonce publiée", description: "Les gardiens peuvent maintenant candidater." });
  };

  const statusLabel: Record<string, { label: string; className: string }> = {
    draft: { label: "Brouillon", className: "bg-muted text-muted-foreground" },
    published: { label: "Publiée", className: "bg-primary/10 text-primary" },
    confirmed: { label: "Confirmée", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
    completed: { label: "Terminée", className: "bg-accent text-muted-foreground" },
    cancelled: { label: "Annulée", className: "bg-destructive/10 text-destructive" },
  };
  const status = statusLabel[sit.status] || statusLabel.draft;

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto animate-fade-in pb-32">
      <Link to={isOwner ? "/sits" : "/search"} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> {isOwner ? "Retour à mes annonces" : "Retour à la recherche"}
      </Link>

      {/* Draft banner */}
      {isOwner && isDraft && (
        <div className="mb-6 rounded-xl border border-border bg-accent/50 p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-heading text-base font-semibold">Cette annonce est encore en brouillon</p>
              <p className="text-sm text-muted-foreground">Publie-la pour qu'elle apparaisse dans la recherche.</p>
            </div>
            <Button onClick={handlePublish} disabled={publishing} className="gap-2 md:self-start">
              <Send className="h-4 w-4" />
              {publishing ? "Publication..." : "Publier l'annonce"}
            </Button>
          </div>
        </div>
      )}

      {/* Sitter match badges */}
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {badges.map(b => (
            <span key={b} className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
              <CheckCircle2 className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />{b}
            </span>
          ))}
        </div>
      )}

      {/* Hero: Photos gallery */}
      {photos.length > 0 && (
        <div className="mb-6 relative">
          <img src={photos[photoIndex]} alt="Logement" className="w-full h-72 md:h-96 rounded-xl object-cover" />
          {photos.length > 1 && (
            <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
              {photos.map((p: string, i: number) => (
                <button
                  key={i}
                  onClick={() => setPhotoIndex(i)}
                  className={`w-16 h-12 rounded-md object-cover border-2 shrink-0 overflow-hidden transition-all ${i === photoIndex ? "border-primary ring-2 ring-primary/30" : "border-transparent opacity-70 hover:opacity-100"}`}
                >
                  <img src={p} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Title, location, dates, status */}
      <div className="flex items-start justify-between gap-4 mb-1">
        <h1 className="font-heading text-2xl md:text-3xl font-bold">{sit.title || `Garde à ${owner?.city || "..."}`}</h1>
        <div className="flex items-center gap-2 shrink-0">
          {isOwner && (
            <Link to={`/sits/${sit.id}/edit`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" /> Modifier
              </Button>
            </Link>
          )}
          {user && sit.user_id !== user.id && <ReportButton targetId={sit.id} targetType="sit" />}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-6">
        {owner?.city && (
          <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{owner.city}</span>
        )}
        <span className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4" />
          {formatDate(sit.start_date)} → {formatDate(sit.end_date)}
          {sit.flexible_dates && <span className="text-xs bg-accent px-2 py-0.5 rounded-full ml-1">Flexible</span>}
        </span>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${status.className}`}>{status.label}</span>
        {avgRating && (
          <span className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />{avgRating} ({reviews.length})
          </span>
        )}
      </div>

      {/* Owner card */}
      {owner && (
        <div className="flex items-center gap-3 mb-8 p-4 bg-card rounded-xl border border-border">
          <Link to={`/sitter/${owner.id}`}>
            {owner.avatar_url ? (
              <img src={owner.avatar_url} alt={owner.first_name} className="w-14 h-14 rounded-full object-cover hover:ring-2 hover:ring-primary/30 transition-all" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center font-heading text-lg font-bold">
                {owner.first_name?.charAt(0) || "?"}
              </div>
            )}
          </Link>
          <div className="flex-1 min-w-0">
            <Link to={`/sitter/${owner.id}`} className="font-medium flex items-center gap-1.5 hover:underline">
              {owner.first_name}
              {owner.identity_verified && <VerifiedBadge />}
            </Link>
            <p className="text-xs text-muted-foreground mt-0.5">
              {owner.bio ? owner.bio.slice(0, 80) + (owner.bio.length > 80 ? "…" : "") : "Propriétaire"}
            </p>
          </div>
          {!isOwner && (
            <Link to={`/sitter/${owner.id}`}>
              <Button variant="outline" size="sm">Voir le profil</Button>
            </Link>
          )}
        </div>
      )}

      {/* Post-confirmation checklist */}
      {sit && user && (sit.status === "confirmed" || sit.status === "in_progress") && (
        <div className="mb-8">
          <PostConfirmationChecklist
            sitId={sit.id}
            sitOwnerId={sit.user_id}
            propertyId={sit.property_id}
            startDate={sit.start_date}
            endDate={sit.end_date}
            ownerCity={owner?.city}
            isOwner={isOwner}
            isLongStay={false}
          />
        </div>
      )}

      {/* Tabbed content like Nomador */}
      <Tabs defaultValue="animals" className="mt-2">
        <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent h-auto p-0 gap-0">
          <TabsTrigger value="animals" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm">
            🐾 Animaux
          </TabsTrigger>
          <TabsTrigger value="housing" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm">
            🏠 Logement
          </TabsTrigger>
          <TabsTrigger value="expectations" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm">
            📋 Attentes
          </TabsTrigger>
          <TabsTrigger value="reviews" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm">
            ⭐ Avis ({reviews.length})
          </TabsTrigger>
        </TabsList>

        {/* Animals tab */}
        <TabsContent value="animals" className="mt-6">
          {pets.length > 0 ? (
            <div className="space-y-4">
              {pets.map((pet: any) => (
                <div key={pet.id}>
                  <div className="flex gap-3 p-4 bg-card rounded-xl border border-border">
                    {pet.photo_url ? (
                      <img src={pet.photo_url} alt={pet.name} className="w-20 h-20 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center text-3xl shrink-0">
                        {speciesEmoji[pet.species] || "🐾"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-heading font-semibold">{speciesEmoji[pet.species]} {pet.name}{pet.breed ? ` — ${pet.breed}` : ""}{pet.age ? ` · ${pet.age} ans` : ""}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {pet.walk_duration && pet.walk_duration !== "none" && (
                          <span className="px-2 py-0.5 rounded-full bg-accent text-xs">🚶 {walkLabels[pet.walk_duration]}</span>
                        )}
                        {pet.alone_duration && (
                          <span className="px-2 py-0.5 rounded-full bg-accent text-xs">🕐 {aloneLabels[pet.alone_duration]}</span>
                        )}
                        {pet.medication && (
                          <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs">💊 Médication</span>
                        )}
                      </div>
                      {pet.character && <p className="text-sm text-muted-foreground mt-2">{pet.character}</p>}
                    </div>
                  </div>
                  {pet.breed && (
                    <BreedProfileCard
                      species={pet.species}
                      breed={pet.breed}
                      ownerNote={pet.owner_breed_note}
                      ownerFirstName={owner?.first_name}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic py-8 text-center">Aucun animal renseigné pour cette garde.</p>
          )}
        </TabsContent>

        {/* Housing tab */}
        <TabsContent value="housing" className="mt-6 space-y-6">
          {property && (
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center gap-2 mb-3">
                <Home className="h-4 w-4 text-primary" />
                <h3 className="font-heading font-semibold">Le logement</h3>
              </div>
              <p className="text-sm font-medium">{typeLabels[property.type] || property.type} · {envLabels[property.environment] || property.environment}</p>
              {property.rooms_count ? <p className="text-sm text-muted-foreground mt-1">{property.rooms_count} pièces · {property.bedrooms_count} chambres</p> : null}
              {property.description && <p className="text-sm text-muted-foreground mt-2">{property.description}</p>}
              {property.equipments?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {property.equipments.map((eq: string) => (
                    <span key={eq} className="px-2.5 py-1 rounded-full bg-accent text-xs">{eq}</span>
                  ))}
                </div>
              )}
              {property.region_highlights && <p className="text-sm text-muted-foreground mt-3">🌿 {property.region_highlights}</p>}
            </div>
          )}

          {/* Location map */}
          {coords && owner?.city && (
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-primary" />
                <h3 className="font-heading font-semibold">Emplacement</h3>
              </div>
              <div className="rounded-lg overflow-hidden border border-border h-52">
                <iframe
                  title="Carte"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.05},${coords.lat - 0.03},${coords.lng + 0.05},${coords.lat + 0.03}&layer=mapnik&marker=${coords.lat},${coords.lng}`}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">📍 {owner.city} — emplacement approximatif</p>
            </div>
          )}

          {/* Location profile */}
          {owner?.city && owner?.postal_code && (
            <LocationProfileCard city={owner.city} postalCode={owner.postal_code} />
          )}
        </TabsContent>

        {/* Expectations tab */}
        <TabsContent value="expectations" className="mt-6 space-y-6">
          {(ownerProfile || sit.specific_expectations) && (
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <h3 className="font-heading font-semibold">Ce qu'on attend</h3>
              </div>
              <div className="text-sm space-y-2">
                {ownerProfile?.preferred_sitter_types?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {ownerProfile.preferred_sitter_types.map((t: string) => (
                      <span key={t} className="px-2.5 py-1 rounded-full bg-accent text-xs">{t}</span>
                    ))}
                  </div>
                )}
                {ownerProfile?.presence_expected && <p>Présence attendue : {ownerProfile.presence_expected}</p>}
                {ownerProfile?.visits_allowed && <p>Visites : {ownerProfile.visits_allowed}</p>}
                {ownerProfile?.overnight_guest && <p>Invités : {ownerProfile.overnight_guest}</p>}
                {ownerProfile?.rules_notes && <p className="text-muted-foreground">{ownerProfile.rules_notes}</p>}
                {sit.specific_expectations && <p className="mt-2 p-3 bg-accent/50 rounded-lg">{sit.specific_expectations}</p>}
              </div>
            </div>
          )}

          {ownerProfile && (ownerProfile.meeting_preference?.length > 0 || ownerProfile.news_frequency) && (
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4 text-primary" />
                <h3 className="font-heading font-semibold">L'accueil</h3>
              </div>
              <div className="text-sm space-y-1">
                {ownerProfile.meeting_preference?.length > 0 && <p>Rencontre : {ownerProfile.meeting_preference.join(", ")}</p>}
                {ownerProfile.handover_preference && <p>Passage de relais : {ownerProfile.handover_preference}</p>}
                {ownerProfile.welcome_notes && <p className="text-muted-foreground">{ownerProfile.welcome_notes}</p>}
                {ownerProfile.news_frequency && <p>Nouvelles : {ownerProfile.news_frequency}</p>}
                {ownerProfile.news_format?.length > 0 && <p>Format : {ownerProfile.news_format.join(", ")}</p>}
              </div>
            </div>
          )}

          {sit.open_to && sit.open_to.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="font-heading font-semibold text-sm mb-2">Ouvert à</h3>
              <div className="flex flex-wrap gap-1.5">
                {sit.open_to.map((t: string) => (
                  <span key={t} className="px-2.5 py-1 rounded-full bg-accent text-xs">{t}</span>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Reviews tab */}
        <TabsContent value="reviews" className="mt-6">
          <ReviewsDisplay userId={sit.user_id} showAnimalCare={false} />
          {sit.status === "completed" && user && (
            <div className="mt-4">
              <Link to={`/review/${sit.id}`}>
                <Button variant="outline" className="w-full gap-2">
                  <Star className="h-4 w-4" /> {sit.user_id === user.id ? "Laisser un avis sur le gardien" : "Laisser un avis"}
                </Button>
              </Link>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Owner-only sections */}
      {isOwner && (
        <>
          <div className="mt-8 p-4 bg-accent/50 rounded-xl border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">📋 Guide de la maison</p>
                <p className="text-xs text-muted-foreground">Adresse, codes, contacts véto — partagé après confirmation</p>
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

      {/* Cancel button */}
      {sit && user && (sit.status === "confirmed" || sit.status === "published") && (
        (isOwner || (hasApplied && sit.status === "confirmed")) && (
          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
              onClick={() => setCancelOpen(true)}
            >
              <XCircle className="h-4 w-4 mr-1" /> Annuler cette garde
            </Button>
          </div>
        )
      )}

      <div className="mt-8 bg-primary/5 border border-primary/10 rounded-xl p-5 text-center">
        <p className="font-heading text-sm font-semibold text-primary">Vous partez l'esprit léger — et si un imprévu survient, votre réseau local de gardiens prend le relais.</p>
        <p className="text-xs text-muted-foreground mt-1">Profils vérifiés · Avis croisés · Gardiens d'urgence mobilisables</p>
      </div>

      {/* Sitter apply bar - highlights shown just before */}
      {activeRole === "sitter" && !isOwner && sit.status === "published" && (
        <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-card border-t border-border p-4 z-40 md:pb-4 pb-20">
          <div className="max-w-4xl mx-auto">
            {hasApplied ? (
              <Button className="w-full h-12 text-base font-semibold" disabled>
                <CheckCircle2 className="h-5 w-5 mr-2" /> Candidature envoyée ✓
              </Button>
            ) : !subHasAccess ? (
              <Button className="w-full h-12 text-base font-semibold bg-amber-600 hover:bg-amber-700 text-white" onClick={() => navigate("/mon-abonnement")}>
                <LockKeyhole className="h-5 w-5 mr-2" /> Abonnez-vous pour postuler — 49€/an
              </Button>
            ) : (
              <Button className="w-full h-12 text-base font-semibold" onClick={() => setApplyOpen(true)}>
                Postuler pour cette garde
              </Button>
            )}
          </div>
        </div>
      )}

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

      {sit && (
        <CancelSitModal
          open={cancelOpen}
          onOpenChange={setCancelOpen}
          sitId={sit.id}
          sitTitle={sit.title}
          sitOwnerId={sit.user_id}
          startDate={formatDate(sit.start_date)}
          endDate={formatDate(sit.end_date)}
          onCancelled={() => {
            setSit({ ...sit, status: "cancelled" });
            setCancelOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default SitDetail;