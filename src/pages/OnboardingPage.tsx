import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import PostalCodeCityFields from "@/components/profile/PostalCodeCityFields";

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
        .select("first_name, postal_code, city, onboarding_completed")
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
    city.trim().length > 0 &&
    postalCode.length === 5 &&
    !isSubmitting;

  const handleSubmit = async () => {
    setIsSubmitting(true);

    const { data, error } = await supabase.rpc("complete_onboarding", {
      p_first_name: firstName.trim(),
      p_postal_code: postalCode,
      p_city: city.trim(),
    });

    setIsSubmitting(false);

    if (error) {
      if (error.message.includes("INVALID_FIRST_NAME")) {
        toast.error("Prénom requis", {
          description: "Veuillez renseigner votre prénom.",
        });
      } else if (error.message.includes("INVALID_POSTAL_CODE")) {
        toast.error("Code postal requis", {
          description: "Veuillez renseigner votre code postal.",
        });
      } else if (error.message.includes("INVALID_CITY")) {
        toast.error("Ville requise", {
          description: "Sélectionnez votre ville dans la liste.",
        });
      } else {
        toast.error("Erreur", {
          description: "Une erreur est survenue. Veuillez réessayer.",
        });
      }
      return;
    }

    if (data === true) {
      await refreshProfile();
      toast.success("C'est parti", {
        description: "Bienvenue dans la communauté Guardiens.",
      });
      navigate("/dashboard", { replace: true });
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
        <h2 className="font-heading text-xl md:text-2xl font-bold text-center">
          <span className="text-primary">g</span>uardiens
        </h2>

        <h1 className="text-2xl font-semibold text-center mt-6 text-foreground">
          Bienvenue chez Guardiens
        </h1>
        <p className="text-center text-muted-foreground mt-2 mb-8">
          Quelques informations pour démarrer. 30 secondes.
        </p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Votre prénom</label>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Marie"
              maxLength={50}
            />
          </div>

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
