import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PostalCodeCityFields from "@/components/profile/PostalCodeCityFields";
import { departmentCodeFromPostal } from "@/lib/postalDepartment";
import { isPostalCodeValidForCountry } from "@/lib/setupState";
import { cn } from "@/lib/utils";

export interface InlinePlaceSaved {
  city: string;
  postalCode: string;
  country: string;
}

interface Props {
  userId: string;
  initialPostalCode: string;
  initialCountry: string;
  /** Le clic sur « Suivant » a trouvé la commune vide. */
  invalid?: boolean;
  onSaved: (place: InlinePlaceSaved) => void;
}

/** Commune prête à être écrite sur le profil, ou null. */
export const placeToWrite = (o: { city: string; postalCode: string; country: string | null }): Record<string, unknown> | null => {
  const city = o.city.trim();
  if (city.length < 2) return null;
  const country = (o.country || "").trim().toUpperCase();
  if (country === "FR") {
    if (!isPostalCodeValidForCountry(o.postalCode, "FR")) return null;
    return {
      city,
      postal_code: o.postalCode.trim(),
      country: "FR",
      departement_code: departmentCodeFromPostal(o.postalCode),
    };
  }
  // Hors de France, le pays doit être choisi. Le code postal reste celui du profil.
  if (!country) return null;
  return { city, country };
};

/**
 * Lot ENT1 : quand le profil n'a pas de commune, elle se saisit dans le
 * formulaire d'annonce avec le même composant que l'écran P1 de l'arrivée,
 * et s'écrit sur le profil (commune, code postal, pays). Le géocodage du
 * profil part comme d'habitude, par le déclencheur de la base.
 */
const InlineProfilePlaceBlock = ({ userId, initialPostalCode, initialCountry, invalid, onSaved }: Props) => {
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState(initialPostalCode);
  const [country, setCountry] = useState<string | null>(initialCountry || "FR");
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);
  const lastWrittenRef = useRef("");

  useEffect(() => {
    const write = placeToWrite({ city, postalCode, country });
    if (!write) return;
    const signature = JSON.stringify(write);
    if (signature === lastWrittenRef.current) return;
    // Une commune choisie dans la liste s'écrit aussitôt, une saisie libre attend la fin de la frappe.
    const t = setTimeout(async () => {
      const { error } = await supabase.from("profiles").update(write as never).eq("id", userId);
      if (error) {
        console.error("[InlineProfilePlaceBlock] save failed", error);
        setFailed(true);
        return;
      }
      lastWrittenRef.current = signature;
      setFailed(false);
      setSaved(true);
      onSaved({
        city: String(write.city),
        postalCode: typeof write.postal_code === "string" ? write.postal_code : postalCode,
        country: String(write.country),
      });
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, postalCode, country, userId]);

  return (
    <div
      id="sit-city-field"
      data-testid="sit-city-field"
      className={cn("scroll-mt-24", invalid && !saved && "rounded-xl border border-destructive bg-destructive/5 p-3")}
    >
      <p className="text-sm font-medium text-foreground">Commune de votre logement</p>
      <p className="text-xs text-muted-foreground mt-0.5 mb-2">
        Indiquez la commune de votre logement pour que les gardiens sachent où se trouve la garde.
      </p>
      <PostalCodeCityFields
        city={city}
        postalCode={postalCode}
        country={country}
        cityLabel="Commune"
        cityId="sit_city_required"
        postalId="sit_postal_required"
        inputClassName="h-12 text-base rounded-lg"
        onChange={(v) => {
          setSaved(false);
          if (v.city !== undefined) setCity(v.city);
          if (v.postal_code !== undefined) setPostalCode(v.postal_code);
          if (v.country !== undefined) setCountry(v.country ?? null);
        }}
      />
      <p role="status" className="mt-2 text-xs text-muted-foreground min-h-[1rem]">
        {saved ? "Commune enregistrée sur votre profil." : ""}
      </p>
      {invalid && !saved && (
        <p role="alert" className="text-sm font-medium text-destructive">Indiquez la commune de votre logement pour continuer</p>
      )}
      {failed && (
        <p role="alert" className="text-sm font-medium text-destructive">Enregistrement impossible pour le moment, votre saisie est conservée.</p>
      )}
    </div>
  );
};

export default InlineProfilePlaceBlock;
