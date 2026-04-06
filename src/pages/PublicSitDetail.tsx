import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Star, PawPrint, Home, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import VerifiedBadge from "@/components/profile/VerifiedBadge";

import { TooltipProvider } from "@/components/ui/tooltip";
import ApplicationModal from "@/components/sits/ApplicationModal";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";

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

const PublicSitDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const { hasAccess } = useSubscriptionAccess();
  const [sit, setSit] = useState<any>(null);
  const [owner, setOwner] = useState<any>(null);
  const [property, setProperty] = useState<any>(null);
  const [pets, setPets] = useState<any[]>([]);
  const [badges, setBadges] = useState<{ badge_key: string; count: number }[]>([]);
  const [avgRating, setAvgRating] = useState<string | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [applyOpen, setApplyOpen] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data: sitData } = await supabase.from("sits").select("*").eq("id", id).single();
      if (!sitData) { setLoading(false); return; }
      setSit(sitData);

      const [ownerRes, propRes, reviewsRes, badgeRes] = await Promise.all([
        supabase.from("profiles").select("id, first_name, city, avatar_url, identity_verified, bio").eq("id", sitData.user_id).single(),
        supabase.from("properties").select("*").eq("id", sitData.property_id).single(),
        supabase.from("reviews").select("overall_rating").eq("reviewee_id", sitData.user_id).eq("published", true),
        supabase.from("badge_attributions").select("badge_key").eq("receiver_id", sitData.user_id),
      ]);

      setOwner(ownerRes.data);
      setProperty(propRes.data);

      const reviews = reviewsRes.data || [];
      setReviewCount(reviews.length);
      if (reviews.length > 0) {
        setAvgRating((reviews.reduce((s: number, r: any) => s + r.overall_rating, 0) / reviews.length).toFixed(1));
      }

      const badgeMap = new Map<string, number>();
      (badgeRes.data || []).forEach((b: any) => badgeMap.set(b.badge_key, (badgeMap.get(b.badge_key) || 0) + 1));
      setBadges(Array.from(badgeMap.entries()).map(([badge_key, count]) => ({ badge_key, count })).sort((a, b) => b.count - a.count));

      if (propRes.data) {
        const { data: petsData } = await supabase.from("pets").select("*").eq("property_id", propRes.data.id);
        setPets(petsData || []);
      }

      if (user) {
        const { data: appRes } = await supabase.from("applications").select("id").eq("sit_id", id!).eq("sitter_id", user.id).maybeSingle();
        if (appRes) setHasApplied(true);
      }

      setLoading(false);
    };
    load();
  }, [id, user]);

  if (loading) return <div className="p-6 md:p-10 text-muted-foreground">Chargement...</div>;
  if (!sit) return <div className="p-6 md:p-10"><p>Annonce introuvable.</p></div>;
  if (sit.status !== "published") return <div className="p-6 md:p-10"><p>Cette annonce n'est plus disponible.</p></div>;

  const photos: string[] = property?.photos || [];
  const formatDate = (d: string | null) => d ? format(new Date(d), "d MMMM yyyy", { locale: fr }) : "";
  const environments = (sit.environments || []).length > 0
    ? sit.environments
    : (property?.environment ? [property.environment] : []);

  return (
    <div className="max-w-4xl mx-auto pb-32">
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>

      {/* Hero photo */}
      {photos.length > 0 && (
        <img src={photos[0]} alt="Logement" className="w-full h-64 md:h-80 object-cover" />
      )}

      <div className="p-6 md:p-10">
        {/* Title */}
        <h1 className="font-heading text-2xl md:text-3xl font-bold mb-2">
          {sit.title || `Garde à ${owner?.city || "..."}`}
        </h1>

        {/* Location & dates */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-6">
          {owner?.city && (
            <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{owner.city}</span>
          )}
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {formatDate(sit.start_date)} → {formatDate(sit.end_date)}
            {sit.flexible_dates && <span className="text-xs bg-accent px-2 py-0.5 rounded-full ml-1">Flexible</span>}
          </span>
        </div>

        {/* Animals */}
        {pets.length > 0 && (
          <div className="mb-6">
            <h2 className="font-heading font-semibold mb-3 flex items-center gap-2">
              <PawPrint className="h-4 w-4 text-primary" /> Les animaux
            </h2>
            <div className="flex flex-wrap gap-3">
              {pets.map((pet: any) => (
                <div key={pet.id} className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-3">
                  <span className="text-xl">{speciesEmoji[pet.species] || "🐾"}</span>
                  <div>
                    <p className="font-medium text-sm">{pet.name}</p>
                    {pet.breed && <p className="text-xs text-muted-foreground">{pet.breed}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Housing */}
        {property && (
          <div className="mb-6 bg-card border border-border rounded-xl p-5">
            <h2 className="font-heading font-semibold mb-2 flex items-center gap-2">
              <Home className="h-4 w-4 text-primary" /> Le logement
            </h2>
            <p className="text-sm">{typeLabels[property.type] || property.type} · {envLabels[property.environment] || property.environment}</p>
            {property.description && <p className="text-sm text-muted-foreground mt-2">{property.description}</p>}
          </div>
        )}

        {/* Environments */}
        {environments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {environments.map((env: string) => (
              <span key={env} className="px-2.5 py-1 rounded-full bg-accent text-xs">{envLabels[env] || env}</span>
            ))}
          </div>
        )}

        {/* Open to */}
        {sit.open_to && sit.open_to.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2">Idéale pour</h3>
            <div className="flex flex-wrap gap-1.5">
              {sit.open_to.map((t: string) => (
                <span key={t} className="px-2.5 py-1 rounded-full bg-accent text-xs">{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* Owner profile card */}
        {owner && (
          <div className="flex items-center gap-3 mb-8 p-4 bg-card rounded-xl border border-border">
            {owner.avatar_url ? (
              <img src={owner.avatar_url} alt={owner.first_name} className="w-14 h-14 rounded-full object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center font-heading text-lg font-bold text-primary">
                {owner.first_name?.charAt(0) || "?"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium flex items-center gap-1.5">
                {owner.first_name}
                {owner.identity_verified && <VerifiedBadge />}
              </p>
              {avgRating && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Star className="h-3.5 w-3.5 text-secondary fill-secondary" /> {avgRating} ({reviewCount} avis)
                </span>
              )}
            </div>
            {badges.length > 0 && (
              <TooltipProvider>
                {/* Badges — migration en cours */}
              </TooltipProvider>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-40 pb-20 md:pb-4">
          <div className="max-w-4xl mx-auto">
            {!isAuthenticated ? (
              <Link to="/register?role=sitter">
                <Button className="w-full h-12 text-base font-semibold">
                  S'inscrire pour postuler — gratuit →
                </Button>
              </Link>
            ) : !hasAccess ? (
              <Link to="/mon-abonnement">
                <Button className="w-full h-12 text-base font-semibold">
                  S'abonner pour postuler
                </Button>
              </Link>
            ) : hasApplied ? (
              <Button className="w-full h-12 text-base font-semibold" disabled>
                <CheckCircle2 className="h-5 w-5 mr-2" /> Candidature envoyée ✓
              </Button>
            ) : (
              <Button className="w-full h-12 text-base font-semibold" onClick={() => setApplyOpen(true)}>
                Postuler à cette garde
              </Button>
            )}
          </div>
        </div>
      </div>

      {isAuthenticated && sit && (
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
      )}
    </div>
  );
};

export default PublicSitDetail;
