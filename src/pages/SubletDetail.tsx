import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Home, MapPin, Star, User, AlertCircle, Lock } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

const priceTypeLabels: Record<string, string> = {
  per_night: "/ nuit", per_week: "/ semaine", per_month: "/ mois",
};
const typeLabels: Record<string, string> = {
  apartment: "Appartement", house: "Maison", farm: "Ferme", chalet: "Chalet", other: "Autre",
};
const envLabels: Record<string, string> = {
  city_center: "Centre-ville", suburban: "Périurbain", countryside: "Campagne",
  mountain: "Montagne", seaside: "Bord de mer", forest: "Forêt",
};

const SubletDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();

  const [sublet, setSublet] = useState<any>(null);
  const [property, setProperty] = useState<any>(null);
  const [owner, setOwner] = useState<any>(null);
  const [ownerReviews, setOwnerReviews] = useState<any[]>([]);
  const [eligibility, setEligibility] = useState<{ eligible: boolean; completedSits: number; avgRating: number | null }>({ eligible: false, completedSits: 0, avgRating: null });
  const [hasApplied, setHasApplied] = useState(false);
  const [message, setMessage] = useState("Bonjour, je suis intéressé(e) par votre sous-location. Je suis disponible aux dates indiquées et je prendrai soin de votre logement.");
  const [applying, setApplying] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !user) return;
    const load = async () => {
      // Load sublet
      const { data: subletData } = await supabase.from("sublets").select("*").eq("id", id).single();
      if (!subletData) { setLoading(false); return; }
      setSublet(subletData);

      // Load property, owner, reviews in parallel
      const [propRes, ownerRes, reviewsRes, appRes, eligRes] = await Promise.all([
        supabase.from("properties").select("*").eq("id", subletData.property_id).single(),
        supabase.from("profiles").select("*").eq("id", subletData.user_id).single(),
        supabase.from("reviews").select("overall_rating").eq("reviewee_id", subletData.user_id).eq("published", true),
        supabase.from("sublet_applications").select("id").eq("sublet_id", id).eq("sitter_id", user.id).limit(1),
        // Check eligibility: completed sits as sitter
        supabase.from("applications").select("id, sit:sits!inner(status)").eq("sitter_id", user.id).eq("status", "accepted"),
      ]);

      setProperty(propRes.data);
      setOwner(ownerRes.data);
      setOwnerReviews(reviewsRes.data || []);
      setHasApplied((appRes.data || []).length > 0);

      // Calculate eligibility
      const completedSits = (eligRes.data || []).filter((a: any) => a.sit?.status === "completed").length;
      const { data: myReviews } = await supabase.from("reviews").select("overall_rating").eq("reviewee_id", user.id).eq("published", true);
      const avgRating = myReviews && myReviews.length > 0
        ? myReviews.reduce((sum: number, r: any) => sum + r.overall_rating, 0) / myReviews.length
        : null;
      const isEligible = completedSits >= 3 && (avgRating !== null && avgRating >= 4.5);
      setEligibility({ eligible: isEligible, completedSits, avgRating });

      setLoading(false);
    };
    load();
  }, [id, user]);

  const handleApply = async () => {
    if (!user || !sublet) return;
    setApplying(true);
    try {
      const { error } = await supabase.from("sublet_applications").insert({
        sublet_id: sublet.id,
        sitter_id: user.id,
        message,
      });
      if (error) throw error;
      setHasApplied(true);
      toast({ title: "Candidature envoyée ! 🎉", description: "Le propriétaire recevra votre demande." });
    } catch {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible d'envoyer la candidature." });
    } finally {
      setApplying(false);
    }
  };

  if (loading) return <div className="p-6 md:p-10 max-w-3xl mx-auto text-muted-foreground">Chargement...</div>;
  if (!sublet) return <div className="p-6 md:p-10 max-w-3xl mx-auto text-muted-foreground">Sous-location introuvable.</div>;

  const isOwner = user?.id === sublet.user_id;
  const nights = sublet.start_date && sublet.end_date ? differenceInDays(new Date(sublet.end_date), new Date(sublet.start_date)) : 0;

  const calculateTotal = () => {
    const amount = Number(sublet.price_amount);
    if (sublet.price_type === "per_night") return { total: amount * nights, label: `${amount}€/nuit × ${nights} nuits` };
    if (sublet.price_type === "per_week") {
      const weeks = Math.ceil(nights / 7);
      return { total: amount * weeks, label: `${amount}€/sem × ${weeks} semaine${weeks > 1 ? "s" : ""}` };
    }
    const months = Math.ceil(nights / 30);
    return { total: amount * months, label: `${amount}€/mois × ${months} mois` };
  };
  const pricing = calculateTotal();

  const ownerAvgRating = ownerReviews.length > 0
    ? (ownerReviews.reduce((s, r) => s + r.overall_rating, 0) / ownerReviews.length).toFixed(1)
    : null;

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto animate-fade-in pb-16">
      <Link to="/search" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Retour
      </Link>

      {/* Badge */}
      <Badge className="mb-3 bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">Sous-location</Badge>

      {/* Title & dates */}
      <h1 className="font-heading text-2xl md:text-3xl font-bold mb-2">{sublet.title}</h1>
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
        {sublet.start_date && sublet.end_date && (
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {format(new Date(sublet.start_date), "d MMM yyyy", { locale: fr })} → {format(new Date(sublet.end_date), "d MMM yyyy", { locale: fr })}
            <span className="text-foreground font-medium">({nights} nuits)</span>
          </span>
        )}
      </div>

      {/* Pricing */}
      <div className="bg-card border border-border rounded-xl p-5 mb-6">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-3xl font-bold">{sublet.price_amount}€</span>
          <span className="text-muted-foreground">{priceTypeLabels[sublet.price_type]}</span>
        </div>
        <p className="text-sm text-muted-foreground">{pricing.label} = <span className="text-foreground font-semibold">{pricing.total}€ total</span></p>
        <p className="text-xs text-muted-foreground mt-2">Airbnb dans cette zone : ~70€/nuit en moyenne</p>
        {sublet.price_amount < 50 && (
          <Badge className="mt-2 bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">Prix réduit</Badge>
        )}
      </div>

      {/* Property */}
      {property && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Home className="h-4 w-4 text-primary" />
            <h2 className="font-heading text-lg font-semibold">Le logement</h2>
          </div>
          <p className="text-sm mb-2">
            {typeLabels[property.type] || property.type}
            {property.environment ? ` · ${envLabels[property.environment] || property.environment}` : ""}
          </p>
          {property.rooms_count && (
            <p className="text-sm text-muted-foreground">{property.rooms_count} pièces · {property.bedrooms_count} chambres</p>
          )}
          {property.description && <p className="text-sm text-muted-foreground mt-2">{property.description}</p>}
          {property.equipments?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {property.equipments.map((eq: string) => (
                <span key={eq} className="px-2 py-0.5 rounded-full bg-accent text-xs">{eq}</span>
              ))}
            </div>
          )}
          {property.photos?.length > 0 && (
            <div className="flex gap-2 mt-3 overflow-x-auto">
              {property.photos.map((url: string, i: number) => (
                <img key={i} src={url} alt="" className="w-28 h-28 rounded-lg object-cover shrink-0" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Conditions */}
      {sublet.conditions && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6">
          <h2 className="font-heading text-lg font-semibold mb-2">Conditions</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-line">{sublet.conditions}</p>
        </div>
      )}

      {/* Owner */}
      {owner && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6">
          <div className="flex items-center gap-3">
            {owner.avatar_url ? (
              <img src={owner.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-lg font-bold">
                {owner.first_name?.charAt(0) || "?"}
              </div>
            )}
            <div>
              <p className="font-medium">{owner.first_name || "Propriétaire"}</p>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {ownerAvgRating && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                    {ownerAvgRating} ({ownerReviews.length} avis)
                  </span>
                )}
                <span>Membre depuis {format(new Date(owner.created_at), "MMM yyyy", { locale: fr })}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Apply section */}
      {!isOwner && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6">
          {eligibility.eligible ? (
            hasApplied ? (
              <div className="text-center py-4">
                <p className="font-medium text-primary">✅ Candidature envoyée</p>
                <p className="text-sm text-muted-foreground mt-1">Le propriétaire examinera votre demande.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="font-heading text-lg font-semibold">Postuler</h2>
                <Textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={3}
                  placeholder="Votre message au propriétaire..."
                />
                <Button onClick={handleApply} disabled={applying} className="w-full">
                  {applying ? "Envoi..." : "Envoyer ma candidature"}
                </Button>
              </div>
            )
          ) : (
            <div className="text-center py-4">
              <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">Conditions non remplies</p>
              <p className="text-sm text-muted-foreground mt-2">
                Complétez {Math.max(0, 3 - eligibility.completedSits)} garde{3 - eligibility.completedSits > 1 ? "s" : ""} supplémentaire{3 - eligibility.completedSits > 1 ? "s" : ""}
                {eligibility.avgRating === null || eligibility.avgRating < 4.5 ? " avec une note de 4.5+" : ""} pour débloquer les sous-locations.
              </p>
              <Link to="/search" className="text-sm text-primary hover:underline mt-3 inline-block">
                Trouver une garde →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Legal */}
      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <p className="text-xs text-muted-foreground leading-relaxed">
          La sous-location est un accord privé entre les deux parties. Guardiens facilite la mise en relation mais n'est pas partie au contrat.
          Le propriétaire est responsable de vérifier que la sous-location est autorisée par son bail ou sa situation.
        </p>
      </div>
    </div>
  );
};

export default SubletDetail;
