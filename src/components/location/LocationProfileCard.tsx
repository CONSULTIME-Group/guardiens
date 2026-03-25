import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MapPin, RefreshCw, Check } from "lucide-react";

interface LocationProfile {
  neighborhood_type: string;
  nature_access: string;
  amenities: string;
  transport: string;
  activities: string;
  ideal_for: string;
}

interface Props {
  city: string;
  postalCode: string;
  onUseDescription?: (text: string) => void;
  editable?: boolean;
}

const fields: { key: keyof LocationProfile; label: string; emoji: string }[] = [
  { key: "neighborhood_type", label: "Quartier", emoji: "🏘️" },
  { key: "nature_access", label: "Nature", emoji: "🌿" },
  { key: "amenities", label: "Services", emoji: "🏪" },
  { key: "transport", label: "Transports", emoji: "🚆" },
  { key: "activities", label: "Activités", emoji: "🎭" },
];

const LocationProfileCard = ({ city, postalCode, onUseDescription, editable = false }: Props) => {
  const [profile, setProfile] = useState<LocationProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [used, setUsed] = useState(false);

  const fetchProfile = async (forceRegenerate = false) => {
    if (!city || !postalCode || postalCode.length < 4) return;
    setLoading(true);
    setError(false);
    setUsed(false);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-location-profile", {
        body: { city: city.trim(), postal_code: postalCode.trim() },
      });

      if (fnError || data?.error) {
        setError(true);
      } else {
        setProfile(data);
      }
    } catch {
      setError(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
  }, [city, postalCode]);

  if (!city || !postalCode || postalCode.length < 4) return null;

  if (loading) {
    return (
      <div className="mt-4 rounded-lg border border-border bg-accent/50 p-4 animate-pulse">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Découverte de {city} en cours...
        </div>
      </div>
    );
  }

  if (error || !profile) return null;

  const fullDescription = [
    profile.neighborhood_type,
    profile.nature_access,
    profile.amenities,
    profile.transport,
    profile.activities,
  ].filter(Boolean).join("\n");

  const handleUse = () => {
    if (onUseDescription) {
      onUseDescription(fullDescription);
      setUsed(true);
    }
  };

  return (
    <div className="mt-4 rounded-lg border border-border bg-accent/30 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary shrink-0" />
          <h4 className="text-sm font-semibold">Découvrir {city}</h4>
        </div>
        {editable && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fetchProfile(true)}
            className="text-xs text-muted-foreground h-7"
          >
            <RefreshCw className="h-3 w-3 mr-1" /> Régénérer
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {fields.map(({ key, label, emoji }) => (
          profile[key] ? (
            <div key={key} className="text-sm">
              <span className="font-medium">{emoji} {label} :</span>{" "}
              <span className="text-muted-foreground">{profile[key]}</span>
            </div>
          ) : null
        ))}
      </div>

      {/* Ideal for — highlighted */}
      {profile.ideal_for && (
        <p className="text-sm italic text-primary font-medium pt-1">
          ✨ {profile.ideal_for}
        </p>
      )}

      {/* Use button (owner profile only) */}
      {editable && onUseDescription && (
        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUse}
            disabled={used}
            className="text-xs"
          >
            {used ? (
              <><Check className="h-3 w-3 mr-1" /> Description utilisée</>
            ) : (
              "Utiliser cette description"
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default LocationProfileCard;
