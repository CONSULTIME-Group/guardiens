import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import PostalCodeCityFields from "@/components/profile/PostalCodeCityFields";
import { format } from "date-fns";

const OnboardingPage = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("first_name, avatar_url, postal_code, city, bio, onboarding_completed, date_of_birth, animal_experience")
        .eq("id", user.id)
        .single();
      if (data) {
        setFirstName(data.first_name ?? "");
        setPostalCode(data.postal_code ?? "");
        setCity(data.city ?? "");
      }
      setLoaded(true);
    })();
  }, [user, navigate]);

  const canSubmit =
    firstName.trim().length > 0 &&
    postalCode.length === 5 &&
    city.trim().length > 0 &&
    !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc("complete_onboarding", {
        p_first_name: firstName.trim(),
        p_avatar_url: null as unknown as string,
        p_postal_code: postalCode.trim(),
        p_city: city.trim(),
        p_bio: null,
        p_date_of_birth: null as unknown as string,
        p_animal_experience: null as unknown as string,
      });
      if (error) {
        const msg = error.message || "";
        if (msg.includes("INVALID_FIRST_NAME")) {
          toast.error("Prénom requis");
        } else if (msg.includes("INVALID_POSTAL_CODE")) {
          toast.error("Code postal requis");
        } else if (msg.includes("INVALID_CITY")) {
          toast.error("Ville requise — sélectionnez votre ville dans la liste");
        } else {
          toast.error("Erreur", { description: "Une erreur est survenue, veuillez réessayer." });
        }
        return;
      }
      await refreshProfile();
      toast.success("Profil complété", { description: "Bienvenue dans la communauté Guardiens." });
      navigate("/dashboard", { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-xl">
        {/* Logo */}
        <h2 className="font-heading text-xl md:text-2xl font-bold text-center">
          <span className="text-primary">g</span>uardiens
        </h2>

        <h1 className="text-2xl font-semibold text-center mt-6 text-foreground">
          Bienvenue chez Guardiens
        </h1>
        <p className="text-center text-muted-foreground mt-2 mb-8">
          Avant de continuer, complétez ces quelques informations essentielles. Ça prend 2 minutes.
        </p>

        <div className="space-y-6">
          {/* ── Champ 1 : Prénom ── */}
          <div>
            <label className="block text-sm font-medium mb-2">Votre prénom</label>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Marie"
              maxLength={50}
            />
          </div>

          {/* ── Champ 2 : Code postal / Ville ── */}
          <div>
            <label className="block text-sm font-medium mb-2">Votre code postal</label>
            <p className="text-sm text-muted-foreground mb-3">
              Pour vous proposer des annonces près de chez vous.
            </p>
            <PostalCodeCityFields
              city={city}
              postalCode={postalCode}
              onChange={(partial) => {
                if (partial.city !== undefined) setCity(partial.city);
                if (partial.postal_code !== undefined) setPostalCode(partial.postal_code);
              }}
              required
            />
          </div>

          {/* ── Bouton final ── */}
          <div className="pt-6 sticky bottom-0 bg-background pb-4 border-t border-border md:static md:pb-0 md:border-t-0">
            <Button
              className="w-full"
              size="lg"
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  Validation...
                </>
              ) : (
                "C'est parti"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
