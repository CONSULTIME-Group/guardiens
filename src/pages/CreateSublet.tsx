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
import { ArrowLeft, AlertCircle, Home, MapPin } from "lucide-react";

const typeLabels: Record<string, string> = {
  apartment: "Appartement", house: "Maison", farm: "Ferme", chalet: "Chalet", other: "Autre",
};
const envLabels: Record<string, string> = {
  city_center: "Centre-ville", suburban: "Périurbain", countryside: "Campagne",
  mountain: "Montagne", seaside: "Bord de mer", forest: "Forêt",
};

const CreateSublet = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [priceAmount, setPriceAmount] = useState("");
  const [priceType, setPriceType] = useState<string>("per_night");
  const [conditions, setConditions] = useState("");
  const [accessLevel, setAccessLevel] = useState<string>("eligible");

  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from("properties").select("*").eq("user_id", user.id).limit(1).maybeSingle();
      setProperty(data);
      setLoading(false);
    };
    load();
  }, [user]);

  const today = new Date().toISOString().split("T")[0];
  const dateError = startDate && endDate && startDate >= endDate
    ? "La date de fin doit être après la date de début." : null;

  const canPublish = property && title && startDate && endDate && !dateError && priceAmount && Number(priceAmount) > 0;

  const handlePublish = async () => {
    if (!user || !property || !canPublish) return;
    setPublishing(true);
    try {
      const { data, error } = await supabase.from("sublets").insert({
        user_id: user.id,
        property_id: property.id,
        title,
        start_date: startDate,
        end_date: endDate,
        price_amount: Number(priceAmount),
        price_type: priceType as any,
        conditions,
        access_level: accessLevel as any,
        status: "published" as any,
      }).select("id").single();

      if (error) throw error;
      toast({ title: "Sous-location publiée ! 🎉", description: "Les gardiens éligibles peuvent maintenant postuler." });
      navigate(`/sublets/${data.id}`);
    } catch {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de publier la sous-location." });
    } finally {
      setPublishing(false);
    }
  };

  if (loading) return <div className="p-6 md:p-10 max-w-3xl mx-auto text-muted-foreground">Chargement...</div>;

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto animate-fade-in pb-32">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Retour au dashboard
      </Link>

      <h1 className="font-heading text-3xl font-bold mb-2">Proposer une sous-location</h1>
      <p className="text-muted-foreground mb-8">Proposez votre logement à prix réduit aux gardiens de confiance de la communauté.</p>

      {!property && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-8 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-destructive">Aucun logement renseigné</p>
            <p className="text-sm text-muted-foreground mt-1">Complétez votre profil propriétaire pour ajouter un logement.</p>
            <Link to="/owner-profile" className="text-sm text-primary underline mt-2 inline-block">Compléter mon profil →</Link>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <Label className="text-sm font-medium">Titre de l'annonce *</Label>
          <Input
            placeholder="Ex : Maison avec jardin à Écully — disponible juillet-août — 25€/nuit"
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Prix *</Label>
            <Input
              type="number"
              placeholder="25"
              value={priceAmount}
              onChange={e => setPriceAmount(e.target.value)}
              min="0"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Type de tarif</Label>
            <Select value={priceType} onValueChange={setPriceType}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="per_night">Par nuit</SelectItem>
                <SelectItem value="per_week">Par semaine</SelectItem>
                <SelectItem value="per_month">Par mois</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">Conditions spécifiques</Label>
          <Textarea
            placeholder="Ménage en fin de séjour, caution de X€, charges eau/électricité incluses..."
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
              <Link to="/owner-profile" className="text-xs text-primary hover:underline">Modifier dans mon profil</Link>
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
        </div>
      )}

      {/* Legal notice */}
      <div className="mt-8 p-4 rounded-lg bg-muted/50 border border-border">
        <p className="text-xs text-muted-foreground leading-relaxed">
          La sous-location est un accord privé entre les deux parties. Guardiens facilite la mise en relation mais n'est pas partie au contrat.
          Le propriétaire est responsable de vérifier que la sous-location est autorisée par son bail ou sa situation.
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
            {publishing ? "Publication en cours..." : "Publier la sous-location"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateSublet;
