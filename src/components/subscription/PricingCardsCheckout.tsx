import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
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
              <span className="text-3xl font-heading font-bold tabular-nums">6,99 €</span>
              <span className="text-sm text-muted-foreground font-body">/mois</span>
            </p>
            <p className="text-xs text-muted-foreground font-body mb-4">
              Sans engagement, résiliable à tout moment.
            </p>
            <ul className="text-sm font-body space-y-2 mb-6 flex-1">
              <li className="flex items-start gap-2">
                <span aria-hidden className="text-primary mt-0.5 shrink-0 select-none">,</span>
                <span>Sans engagement</span>
              </li>
              <li className="flex items-start gap-2">
                <span aria-hidden className="text-primary mt-0.5 shrink-0 select-none">,</span>
                <span>Résiliable en un clic</span>
              </li>
              <li className="flex items-start gap-2">
                <span aria-hidden className="text-primary mt-0.5 shrink-0 select-none">,</span>
                <span>Accès complet à toutes les fonctionnalités</span>
              </li>
              <li className="flex items-start gap-2">
                <span aria-hidden className="text-primary mt-0.5 shrink-0 select-none">,</span>
                <span>Aucune commission sur les gardes</span>
              </li>
            </ul>
            <Button className="w-full font-body" onClick={handleCheckout} disabled={loading !== null}>
              {loading === "monthly" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Activer mon abonnement"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
