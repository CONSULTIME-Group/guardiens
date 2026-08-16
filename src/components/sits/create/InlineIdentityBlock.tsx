import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { COUNTRIES } from "@/lib/countries";
import { isPostalCodeValidForCountry } from "@/lib/setupState";

interface Props {
  userId: string;
  initialFirstName: string;
  initialPostalCode: string;
  /** Pays du profil (code ISO 2 lettres), France par défaut. */
  initialCountry?: string;
  onSaved: (identity: { firstName: string; postalCode: string; country: string }) => void;
}

/**
 * Prénom, code postal et pays collectés sur place quand ils manquent au
 * profil. Ils portent la géolocalisation de l'annonce et son en-tête
 * public, et n'étaient demandés nulle part avant ce parcours. Écrit sur
 * profiles, sans quitter la création d'annonce ni perdre la saisie en
 * cours.
 *
 * Le pays conditionne le format du code postal : 5 chiffres stricts pour
 * la France, format national permissif ailleurs (règle non négociable du
 * 16/08/2026, voir src/lib/setupState.ts). Un inscrit hors France peut
 * publier une annonce.
 */
const InlineIdentityBlock = ({ userId, initialFirstName, initialPostalCode, initialCountry = "FR", onSaved }: Props) => {
  const [firstName, setFirstName] = useState(initialFirstName);
  const [country, setCountry] = useState(initialCountry || "FR");
  const [postalCode, setPostalCode] = useState(initialPostalCode);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isFrance = country === "FR";

  const save = async () => {
    const cleanName = firstName.trim();
    const cleanPostal = postalCode.trim();
    if (cleanName.length < 2) {
      setError("Indiquez votre prénom, tel qu'il apparaîtra sur votre annonce.");
      return;
    }
    if (!isPostalCodeValidForCountry(cleanPostal, country)) {
      setError(
        isFrance
          ? "Indiquez votre code postal à 5 chiffres, par exemple 69001."
          : "Indiquez le code postal de votre pays (2 à 12 caractères, chiffres et lettres).",
      );
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ first_name: cleanName, postal_code: cleanPostal, country })
        .eq("id", userId);
      if (updateError) throw updateError;
      onSaved({ firstName: cleanName, postalCode: cleanPostal, country });
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
          <Label htmlFor="setup-identity-country">Pays</Label>
          <Select
            value={country}
            onValueChange={(v) => { setCountry(v); setError(null); }}
            disabled={saving}
          >
            <SelectTrigger id="setup-identity-country" className="h-12">
              <SelectValue placeholder="Sélectionner un pays" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {COUNTRIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="setup-identity-postal">Code postal</Label>
          <Input
            id="setup-identity-postal"
            value={postalCode}
            onChange={(e) => setPostalCode(isFrance ? e.target.value.replace(/\D/g, "") : e.target.value)}
            placeholder={isFrance ? "Ex : 69001" : "Ex : 1000, K1A 0B1"}
            inputMode={isFrance ? "numeric" : "text"}
            maxLength={isFrance ? 5 : 12}
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
