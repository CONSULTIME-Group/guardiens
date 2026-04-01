import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, AlertCircle, Home, Info, Lock } from "lucide-react";
import { differenceInDays } from "date-fns";

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

const CreateLongStay = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [estimatedContribution, setEstimatedContribution] = useState("");
  const [conditions, setConditions] = useState("");
  const [accessLevel, setAccessLevel] = useState<string>("eligible");

  const [property, setProperty] = useState<any>(null);
  const [pets, setPets] = useState<any[]>([]);
  const [eligibility, setEligibility] = useState<{ eligible: boolean; completedSits: number; verified: boolean }>({ eligible: false, completedSits: 0, verified: false });
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [propRes, profileRes] = await Promise.all([
        supabase.from("properties").select("*").eq("user_id", user.id).limit(1).maybeSingle(),
        supabase.from("profiles").select("identity_verified").eq("id", user.id).single(),
      ]);
      setProperty(propRes.data);

      // Load pets if property exists
      if (propRes.data) {
        const { data: petsData } = await supabase.from("pets").select("*").eq("property_id", propRes.data.id);
        setPets(petsData || []);
      }

      // Check eligibility: 2+ completed sits as owner + verified ID
      const { data: ownerSits } = await supabase.from("sits").select("id, status").eq("user_id", user.id);
      const completedSits = (ownerSits || []).filter((s: any) => s.status === "completed").length;
      const verified = profileRes.data?.identity_verified || false;
      setEligibility({
        eligible: completedSits >= 2 && verified,
        completedSits,
        verified,
      });

      setLoading(false);
    };
    load();
  }, [user]);

  const today = new Date().toISOString().split("T")[0];
  const minDuration = startDate && endDate ? differenceInDays(new Date(endDate), new Date(startDate)) : 0;
  const dateError = startDate && endDate && minDuration < 30
    ? "Les gardes longue durée commencent à partir de 30 jours. Pour une durée plus courte, publiez une garde classique." : null;

  const canPublish = property && title && startDate && endDate && !dateError && eligibility.eligible;

  const handlePublish = async () => {
    if (!user || !property || !canPublish) return;
    setPublishing(true);
    try {
      const { data, error } = await supabase.from("long_stays").insert({
        user_id: user.id,
        property_id: property.id,
        title,
        start_date: startDate,
        end_date: endDate,
        estimated_contribution: estimatedContribution || null,
        conditions,
        access_level: accessLevel as any,
        status: "published" as any,
      }).select("id").single();

      if (error) throw error;
      toast({ title: "Annonce publiée ! 🎉", description: "Les gardiens éligibles peuvent maintenant postuler." });
      navigate(`/long-stays/${data.id}`);
    } catch {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de publier l'annonce." });
    } finally {
      setPublishing(false);
    }
  };

  if (loading) return <div className="p-6 md:p-10 max-w-3xl mx-auto text-muted-foreground">Chargement...</div>;

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto animate-fade-in pb-40">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Retour au dashboard
      </Link>

      <h1 className="font-heading text-3xl font-bold mb-2">Proposer une garde longue durée</h1>
      <p className="text-muted-foreground mb-8">Confiez votre maison à un gardien de confiance pour une longue période.</p>

      {/* Eligibility gate */}
      {!eligibility.eligible && (
        <div className="bg-muted/50 border border-border rounded-xl p-5 mb-8 text-center">
          <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">Fonctionnalité non débloquée</p>
          <p className="text-sm text-muted-foreground mt-2">
            {eligibility.completedSits < 2
              ? `Réalisez ${2 - eligibility.completedSits} garde${2 - eligibility.completedSits > 1 ? "s" : ""} supplémentaire${2 - eligibility.completedSits > 1 ? "s" : ""} pour débloquer les annonces longue durée.`
              : ""}
            {!eligibility.verified ? " Vérifiez votre identité dans les paramètres." : ""}
          </p>
          <Link to="/sits/create" className="text-sm text-primary hover:underline mt-3 inline-block">
            Publier une garde classique →
          </Link>
        </div>
      )}

      {!property && eligibility.eligible && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-8 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-destructive">Aucun logement renseigné</p>
            <p className="text-sm text-muted-foreground mt-1">Complétez votre profil propriétaire pour ajouter un logement.</p>
            <Link to="/owner-profile" className="text-sm text-primary underline mt-2 inline-block">Compléter mon profil →</Link>
          </div>
        </div>
      )}

      {eligibility.eligible && (
        <div className="space-y-8 pb-32">
          <div className="space-y-6">
            <div>
              <Label className="text-sm font-medium">Titre de l'annonce *</Label>
              <Input
                placeholder="Ex : Maison + 2 chiens à Écully — disponible juillet à septembre"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Date de début *</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} min={today} className="mt-1.5" />
              </div>
              <div>
                <Label className="text-sm font-medium">Date de fin *</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate || today} className="mt-1.5" />
              </div>
            </div>
            {dateError && (
              <p className="text-sm text-destructive flex items-center gap-1.5 -mt-2">
                <AlertCircle className="h-3.5 w-3.5" /> {dateError}
              </p>
            )}

            <div>
              <Label className="text-sm font-medium">Contribution estimée aux frais (optionnel)</Label>
              <Input
                placeholder="Ex : ~150€/mois pour les charges courantes (électricité, gaz, eau, internet)"
                value={estimatedContribution}
                onChange={e => setEstimatedContribution(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Conditions particulières</Label>
              <Textarea
                placeholder="Ex : Ménage avant le départ, entretien jardin, arrosage potager"
                value={conditions}
                onChange={e => setConditions(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Ouvert à</Label>
              <Select value={accessLevel} onValueChange={setAccessLevel}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="eligible">Tous les gardiens éligibles</SelectItem>
                  <SelectItem value="past_sitters">Mes anciens gardiens uniquement</SelectItem>
                  <SelectItem value="invite_only">Sur invitation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contribution info block */}
          <div className="mt-8 p-4 rounded-lg border border-border" style={{ backgroundColor: "#F8F6F1" }}>
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sm">À propos de la contribution aux frais</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Pour une garde longue durée, il est d'usage de convenir d'une contribution aux frais de la maison (électricité, gaz, eau, internet).
                  Ce n'est ni un loyer ni une sous-location — c'est une participation aux charges, comme on le ferait chez un ami.
                  Discutez-en ensemble avant de confirmer.
                </p>
              </div>
            </div>
          </div>

          {/* Property summary */}
          {property && (
            <div className="mt-10 space-y-6">
              <h2 className="font-heading text-xl font-semibold">Logement proposé</h2>
              <div className="bg-card rounded-lg border border-border p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-primary" />
                    <h3 className="font-heading text-sm font-semibold">
                      {typeLabels[property.type] || property.type}
                      {property.environment ? ` · ${envLabels[property.environment] || property.environment}` : ""}
                    </h3>
                  </div>
                  <Link to="/owner-profile" className="text-xs text-primary hover:underline">Modifier</Link>
                </div>
                {property.rooms_count ? (
                  <p className="text-sm text-muted-foreground">{property.rooms_count} pièces · {property.bedrooms_count} chambres</p>
                ) : null}
                {property.photos?.length > 0 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto">
                    {property.photos.slice(0, 4).map((url: string, i: number) => (
                      <img key={i} src={url} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0" />
                    ))}
                  </div>
                )}
              </div>

              {/* Pets */}
              {pets.length > 0 && (
                <div className="bg-card rounded-lg border border-border p-5">
                  <h3 className="font-heading text-sm font-semibold mb-3">Animaux à garder</h3>
                  <div className="space-y-2">
                    {pets.map(pet => (
                      <div key={pet.id} className="flex items-center gap-2 text-sm">
                        <span>{speciesEmoji[pet.species] || "🐾"}</span>
                        <span className="font-medium">{pet.name || "Sans nom"}</span>
                        {pet.breed && <span className="text-muted-foreground">· {pet.breed}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Legal notice */}
          <div className="mt-8 p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground leading-relaxed">
              La garde longue durée est un accord privé entre les deux parties. La contribution aux frais couvre les charges courantes et ne constitue pas un loyer.
              Guardiens facture des frais de service de 70€ à chaque partie pour garantir l'engagement et financer le service.
            </p>
          </div>

          {/* Publish button */}
          <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-card border-t border-border p-4 z-40">
            <div className="max-w-3xl mx-auto">
              <Button
                onClick={handlePublish}
                disabled={!canPublish || publishing}
                className="w-full h-12 text-base font-semibold"
              >
                {publishing ? "Publication en cours..." : "Publier l'annonce longue durée"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateLongStay;
