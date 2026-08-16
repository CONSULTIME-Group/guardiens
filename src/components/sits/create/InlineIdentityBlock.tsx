import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Props {
  userId: string;
  initialFirstName: string;
  initialPostalCode: string;
  onSaved: (identity: { firstName: string; postalCode: string }) => void;
}

/**
 * Prénom et code postal collectés sur place quand ils manquent au profil.
 * Ils portent la géolocalisation de l'annonce et son en-tête public, et
 * n'étaient demandés nulle part avant ce parcours. Écrit sur profiles,
 * sans quitter la création d'annonce ni perdre la saisie en cours.
 */
const InlineIdentityBlock = ({ userId, initialFirstName, initialPostalCode, onSaved }: Props) => {
  const [firstName, setFirstName] = useState(initialFirstName);
  const [postalCode, setPostalCode] = useState(initialPostalCode);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const cleanName = firstName.trim();
    const cleanPostal = postalCode.trim();
    if (cleanName.length < 2) {
      setError("Indiquez votre prénom, tel qu'il apparaîtra sur votre annonce.");
      return;
    }
    if (!/^\d{5}$/.test(cleanPostal)) {
      setError("Indiquez votre code postal à 5 chiffres, par exemple 69001.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ first_name: cleanName, postal_code: cleanPostal })
        .eq("id", userId);
      if (updateError) throw updateError;
      onSaved({ firstName: cleanName, postalCode: cleanPostal });
      toast.success("Identité enregistrée");
    } catch (e: any) {
      console.error("[InlineIdentityBlock] save failed", e);
      toast.error("Enregistrement impossible", {
        description: "Réessayez dans un instant, votre saisie est conservée.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="setup-identity-firstname">Prénom</Label>
          <Input
            id="setup-identity-firstname"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Ex : Marie"
            autoComplete="given-name"
            className="h-12"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="setup-identity-postal">Code postal</Label>
          <Input
            id="setup-identity-postal"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="Ex : 69001"
            inputMode="numeric"
            maxLength={5}
            autoComplete="postal-code"
            className="h-12"
          />
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">{error}</p>
      )}
      <Button type="button" onClick={save} disabled={saving}>
        {saving ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </div>
  );
};

export default InlineIdentityBlock;
