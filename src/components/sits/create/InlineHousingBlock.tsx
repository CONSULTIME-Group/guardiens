import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const TYPES = [
  { value: "apartment", label: "Appartement" },
  { value: "house", label: "Maison" },
  { value: "farm", label: "Ferme" },
  { value: "chalet", label: "Chalet" },
  { value: "other", label: "Autre" },
];

const ENVS = [
  { value: "city_center", label: "Centre-ville" },
  { value: "suburban", label: "Périurbain" },
  { value: "countryside", label: "Campagne" },
  { value: "mountain", label: "Montagne" },
  { value: "seaside", label: "Bord de mer" },
  { value: "forest", label: "Forêt" },
];

const COUNTS = ["1", "2", "3", "4", "5", "6"];

export interface InlineHousingResult {
  id: string;
  type: string;
  environment: string | null;
  rooms_count: number | null;
  bedrooms_count: number | null;
}

interface Props {
  userId: string;
  onSaved: (property: InlineHousingResult) => void;
}

/**
 * Description minimale du logement, remplissable sans quitter le parcours.
 * Le reste des informations (équipements, description longue) se complète
 * ensuite depuis le profil, sans bloquer la publication.
 */
const InlineHousingBlock = ({ userId, onSaved }: Props) => {
  const [type, setType] = useState("house");
  const [environment, setEnvironment] = useState("countryside");
  const [rooms, setRooms] = useState("3");
  const [bedrooms, setBedrooms] = useState("1");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        user_id: userId,
        type,
        environment,
        rooms_count: Number(rooms),
        bedrooms_count: Number(bedrooms),
      };
      const { data, error } = await supabase
        .from("properties")
        .insert(payload as any)
        .select("id, type, environment, rooms_count, bedrooms_count")
        .single();
      if (error) throw error;
      onSaved(data as InlineHousingResult);
      toast.success("Logement enregistré");
    } catch (e: any) {
      console.error("[InlineHousingBlock] save failed", e);
      toast.error("Enregistrement impossible", {
        description: e?.message || "Réessayez dans un instant, votre saisie est conservée.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="setup-housing-type">Type de logement</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger id="setup-housing-type" className="h-12"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="setup-housing-env">Environnement</Label>
          <Select value={environment} onValueChange={setEnvironment}>
            <SelectTrigger id="setup-housing-env" className="h-12"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ENVS.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="setup-housing-rooms">Nombre de pièces</Label>
          <Select value={rooms} onValueChange={setRooms}>
            <SelectTrigger id="setup-housing-rooms" className="h-12"><SelectValue /></SelectTrigger>
            <SelectContent>
              {COUNTS.map((c) => <SelectItem key={c} value={c}>{c === "6" ? "Plus de 5" : c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="setup-housing-bedrooms">Nombre de chambres</Label>
          <Select value={bedrooms} onValueChange={setBedrooms}>
            <SelectTrigger id="setup-housing-bedrooms" className="h-12"><SelectValue /></SelectTrigger>
            <SelectContent>
              {COUNTS.map((c) => <SelectItem key={c} value={c}>{c === "6" ? "Plus de 5" : c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button type="button" onClick={save} disabled={saving}>
        {saving ? "Enregistrement…" : "Enregistrer mon logement"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Vous pourrez enrichir cette description (équipements, ambiance) depuis votre profil, à tout moment.
      </p>
    </div>
  );
};

export default InlineHousingBlock;
