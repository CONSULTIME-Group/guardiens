import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Calendar, Home, Info, Star, Lock, Pencil, Trash2, XCircle } from "lucide-react";
import PostConfirmationChecklist from "@/components/sits/PostConfirmationChecklist";
import LongStayApplicationsList from "@/components/sits/LongStayApplicationsList";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

const typeLabels: Record<string, string> = {
  apartment: "Appartement", house: "Maison", farm: "Ferme", chalet: "Chalet", other: "Autre",
};
const envLabels: Record<string, string> = {
  city_center: "Centre-ville", suburban: "Périurbain", countryside: "Campagne",
  mountain: "Montagne", seaside: "Bord de mer", forest: "Forêt",
};
const speciesEmoji: Record<string, string> = {
  dog: "🐕", cat: "🐱", horse: "🐴", bird: "🐦", rodent: "🐹",
  fish: "🐠", reptile: "🦎", farm_animal: "🐄", nac: "🐾",
};

const LongStayDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [longStay, setLongStay] = useState<any>(null);
  const [property, setProperty] = useState<any>(null);
  const [pets, setPets] = useState<any[]>([]);
  const [owner, setOwner] = useState<any>(null);
  const [ownerReviews, setOwnerReviews] = useState<any[]>([]);
  const [eligibility, setEligibility] = useState<{ eligible: boolean; completedSits: number; avgRating: number | null; verified: boolean }>({ eligible: false, completedSits: 0, avgRating: null, verified: false });
  const [hasApplied, setHasApplied] = useState(false);
  const [message, setMessage] = useState("Bonjour, je suis intéressé(e) par cette garde longue durée. Je suis disponible aux dates indiquées et je prendrai soin de votre logement et de vos animaux.");
  const [applying, setApplying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    if (!id || !user) return;
    const load = async () => {
      const { data: lsData } = await supabase.from("long_stays").select("*").eq("id", id).single();
      if (!lsData) { setLoading(false); return; }
      setLongStay(lsData);

      const [propRes, ownerRes, reviewsRes, appRes, petsRes, eligRes, profileRes, myReviewsRes] = await Promise.all([
        supabase.from("properties").select("*").eq("id", lsData.property_id).single(),
        supabase.from("profiles").select("*").eq("id", lsData.user_id).single(),
        supabase.from("reviews").select("overall_rating").eq("reviewee_id", lsData.user_id).eq("published", true),
        supabase.from("long_stay_applications").select("id").eq("long_stay_id", id).eq("sitter_id", user.id).limit(1),
        supabase.from("pets").select("*").eq("property_id", lsData.property_id),
        supabase.from("applications").select("id, sit:sits!inner(status)").eq("sitter_id", user.id).eq("status", "accepted"),
        supabase.from("profiles").select("identity_verified").eq("id", user.id).single(),
        supabase.from("reviews").select("overall_rating").eq("reviewee_id", user.id).eq("published", true),
      ]);

      setProperty(propRes.data);
      setOwner(ownerRes.data);
      setOwnerReviews(reviewsRes.data || []);
      setHasApplied((appRes.data || []).length > 0);
      setPets(petsRes.data || []);

      const completedSits = (eligRes.data || []).filter((a: any) => a.sit?.status === "completed").length;
      const myReviews = myReviewsRes.data || [];
      const avgRating = myReviews.length > 0
        ? myReviews.reduce((sum: number, r: any) => sum + r.overall_rating, 0) / myReviews.length
        : null;
      const verified = profileRes.data?.identity_verified || false;
      const isEligible = completedSits >= 3 && (avgRating !== null && avgRating >= 4.7) && verified;
      setEligibility({ eligible: isEligible, completedSits, avgRating, verified });

      setLoading(false);
    };
    load();
  }, [id, user]);

  const handleApply = async () => {
    if (!user || !longStay) return;
    setApplying(true);
    try {
      const { error } = await supabase.from("long_stay_applications").insert({
        long_stay_id: longStay.id,
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

  const handleDelete = async () => {
    if (!user || !longStay) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("long_stays").delete().eq("id", longStay.id);
      if (error) throw error;
      toast({ title: "Annonce supprimée", description: "Votre garde longue durée a été supprimée." });
      navigate("/dashboard");
    } catch {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de supprimer l'annonce." });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleCancel = async () => {
    if (!user || !longStay) return;
    setCancelling(true);
    try {
      const { error } = await supabase.from("long_stays").update({
        status: "cancelled" as any,
      }).eq("id", longStay.id);
      if (error) throw error;

      // Increment cancellation count
      await supabase.from("profiles").update({
        cancellation_count: (owner?.cancellation_count || 0) + 1,
      }).eq("id", user.id);

      setLongStay({ ...longStay, status: "cancelled" });
      toast({ title: "Garde annulée", description: "La garde longue durée a été annulée." });
      setCancelDialogOpen(false);
    } catch {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible d'annuler la garde." });
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <div className="p-6 md:p-10 max-w-3xl mx-auto text-muted-foreground">Chargement...</div>;
  if (!longStay) return <div className="p-6 md:p-10 max-w-3xl mx-auto text-muted-foreground">Annonce introuvable.</div>;

  const isOwner = user?.id === longStay.user_id;
  const nights = longStay.start_date && longStay.end_date ? differenceInDays(new Date(longStay.end_date), new Date(longStay.start_date)) : 0;

  const ownerAvgRating = ownerReviews.length > 0
    ? (ownerReviews.reduce((s, r) => s + r.overall_rating, 0) / ownerReviews.length).toFixed(1)
    : null;

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto animate-fade-in pb-16">
      <Link to="/search" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Retour
      </Link>

      {/* Cancelled banner */}
      {longStay.status === "cancelled" && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 mb-4 flex items-center gap-2">
          <XCircle className="h-5 w-5 text-destructive shrink-0" />
          <p className="text-sm font-medium text-destructive">Cette garde a été annulée.</p>
        </div>
      )}

      {/* Badge + Owner actions */}
      <div className="flex items-center justify-between mb-3">
        <Badge className="bg-[#DBEAFE] text-[#1E40AF] border-blue-200 hover:bg-[#DBEAFE]">Longue durée</Badge>
        {isOwner && longStay.status !== "cancelled" && (
          <div className="flex items-center gap-2">
            {longStay.status !== "confirmed" && (
              <Button variant="outline" size="sm" asChild className="gap-1.5">
                <Link to={`/long-stays/${longStay.id}/edit`}>
                  <Pencil className="h-3.5 w-3.5" /> Modifier
                </Link>
              </Button>
            )}

            {longStay.status === "confirmed" ? (
              <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
                    <XCircle className="h-3.5 w-3.5" /> Annuler la garde
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Annuler cette garde confirmée ?</DialogTitle>
                    <DialogDescription>
                      Le gardien sera notifié de l'annulation. Cette action incrémente votre compteur d'annulations.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-2">
                    <Textarea
                      placeholder="Raison de l'annulation (optionnel)..."
                      value={cancelReason}
                      onChange={e => setCancelReason(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Retour</Button>
                    <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
                      {cancelling ? "Annulation..." : "Confirmer l'annulation"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : (
              <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" /> Supprimer
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Supprimer cette annonce ?</DialogTitle>
                    <DialogDescription>
                      Cette action est irréversible. Toutes les candidatures associées seront également supprimées.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                      {deleting ? "Suppression..." : "Confirmer la suppression"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}
      </div>

      {/* Title & dates */}
      <h1 className="font-heading text-2xl md:text-3xl font-bold mb-2">{longStay.title}</h1>
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
        {longStay.start_date && longStay.end_date && (
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {format(new Date(longStay.start_date), "d MMM yyyy", { locale: fr })} → {format(new Date(longStay.end_date), "d MMM yyyy", { locale: fr })}
            <span className="text-foreground font-medium">({nights} nuits)</span>
          </span>
        )}
      </div>

      {/* Post-confirmation checklist for long stays */}
      {longStay.status === "confirmed" && user && (
        <div className="mb-6">
          <PostConfirmationChecklist
            sitId={longStay.id}
            sitOwnerId={longStay.user_id}
            propertyId={longStay.property_id}
            startDate={longStay.start_date}
            endDate={longStay.end_date}
            ownerCity={owner?.city}
            isOwner={isOwner}
            
          />
        </div>
      )}

      {/* Contribution info block */}
      <div className="p-4 rounded-lg border border-border mb-6" style={{ backgroundColor: "#F8F6F1" }}>
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-sm">À propos de la contribution aux frais</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Pour une garde longue durée, il est d'usage de convenir d'une contribution aux frais de la maison (électricité, gaz, eau, internet).
              Ce n'est ni un loyer ni une sous-location — c'est une participation aux charges, comme on le ferait chez un ami.
              Discutez-en ensemble avant de confirmer.
            </p>
            {longStay.estimated_contribution && (
              <p className="text-sm font-medium mt-3">
                Contribution estimée par le propriétaire : {longStay.estimated_contribution}
              </p>
            )}
          </div>
        </div>
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

      {/* Pets */}
      {pets.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6">
          <h2 className="font-heading text-lg font-semibold mb-3">Animaux à garder</h2>
          <div className="space-y-2">
            {pets.map(pet => (
              <div key={pet.id} className="flex items-center gap-2 text-sm">
                <span>{speciesEmoji[pet.species] || "🐾"}</span>
                <span className="font-medium">{pet.name || "Sans nom"}</span>
                {pet.breed && <span className="text-muted-foreground">· {pet.breed}</span>}
                {pet.age && <span className="text-muted-foreground">· {pet.age} an{pet.age > 1 ? "s" : ""}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conditions */}
      {longStay.conditions && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6">
          <h2 className="font-heading text-lg font-semibold mb-2">Conditions</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-line">{longStay.conditions}</p>
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

      {/* Applications list for owner */}
      {isOwner && (
        <LongStayApplicationsList
          longStayId={longStay.id}
          longStayTitle={longStay.title}
          petNames={pets.map((p: any) => p.name || "Sans nom")}
          startDate={longStay.start_date ? format(new Date(longStay.start_date), "d MMM yyyy", { locale: fr }) : ""}
          endDate={longStay.end_date ? format(new Date(longStay.end_date), "d MMM yyyy", { locale: fr }) : ""}
          propertyId={longStay.property_id}
        />
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
                {eligibility.avgRating === null || eligibility.avgRating < 4.7 ? " avec une note de 4.7+" : ""}
                {!eligibility.verified ? " et vérifiez votre identité" : ""} pour accéder aux gardes longue durée.
              </p>
              <Link to="/search" className="text-sm text-primary hover:underline mt-3 inline-block">
                Trouver une garde →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Service fee notice */}
      <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 mb-6">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-sm">Frais de service : 70 € par partie à la confirmation</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Lorsqu'une garde longue durée est confirmée, des frais de service de 70 € sont demandés au propriétaire et au gardien.
              Ces frais couvrent la vérification des profils, l'assistance et la médiation en cas de besoin.
            </p>
          </div>
        </div>
      </div>

      {/* Legal */}
      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <p className="text-xs text-muted-foreground leading-relaxed">
          La garde longue durée est un accord privé entre les deux parties. La contribution aux frais couvre les charges courantes et ne constitue pas un loyer.
          Guardiens facilite la mise en relation mais n'est pas partie à l'accord.
        </p>
      </div>
    </div>
  );
};

export default LongStayDetail;
