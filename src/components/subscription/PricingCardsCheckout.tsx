import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import FreeAccountSection from "./FreeAccountSection";

export default function PricingCardsCheckout() {
  const [loading, setLoading] = useState<"monthly" | null>(null);

  const handleCheckout = async () => {
    setLoading("monthly");
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { formula_type: "monthly" },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
      else throw new Error(data?.error || "no url");
    } catch {
      toast.error("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      <FreeAccountSection />
      <div className="max-w-md mx-auto">
        <div className="relative">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3 py-0.5 rounded-full font-medium font-body z-10">
            Formule unique
          </span>
          <div className="bg-card border-2 border-primary rounded-xl p-6 flex flex-col">
            <p className="font-heading text-lg font-semibold mb-2">Espace gardien</p>
            <p className="mb-1">
              <span className="text-3xl font-heading font-bold">6,99 €</span>
              <span className="text-sm text-muted-foreground font-body">/mois</span>
            </p>
            <p className="text-xs text-muted-foreground font-body mb-4">
              7 jours d'essai. Sans engagement, annulable à tout moment.
            </p>
            <ul className="text-sm font-body space-y-2 mb-6 flex-1">
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-primary shrink-0" /> 7 jours d'essai offerts
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-primary shrink-0" /> Sans engagement
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-primary shrink-0" /> Annulable en un clic
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-primary shrink-0" /> Accès complet à toutes les fonctionnalités
              </li>
            </ul>
            <Button className="w-full font-body" onClick={handleCheckout} disabled={loading !== null}>
              {loading === "monthly" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Démarrer mon essai de 7 jours"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
