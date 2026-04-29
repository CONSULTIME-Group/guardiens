import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import FreeAccountSection from "./FreeAccountSection";

const calculateProrata = () => {
  const now = new Date();
  const nextMonth = now.getMonth() + 1;
  const monthsRemaining = Math.max(0, 12 - nextMonth);
  const fullPrice = monthsRemaining * 6.99;
  const discountedPrice = Math.round(fullPrice * 0.8 * 100) / 100;
  const savings = Math.round((fullPrice - discountedPrice) * 100) / 100;
  return { months: monthsRemaining, price: discountedPrice, savings };
};

export default function PricingCardsCheckout() {
  const [loading, setLoading] = useState<"oneshot" | "monthly" | "prorata" | null>(null);
  const { months, price: prorataPrice, savings } = calculateProrata();

  const handleCheckout = async (type: "oneshot" | "monthly" | "prorata") => {
    setLoading(type);
    try {
      const formulaMap: Record<string, string> = {
        oneshot: "one_shot",
        monthly: "monthly",
        prorata: "prorata",
      };
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { formula_type: formulaMap[type] },
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="bg-card border border-border rounded-xl p-5 flex flex-col">
        <p className="font-heading text-lg font-semibold mb-2">Un mois</p>
        <p className="mb-1"><span className="text-3xl font-heading font-bold">12€</span><span className="text-sm text-muted-foreground font-body">/mois</span></p>
        <p className="text-xs text-muted-foreground font-body mb-4">Paiement immédiat. Sans renouvellement.</p>
        <ul className="text-sm font-body space-y-2 mb-6 flex-1">
          <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> Accès complet 30 jours</li>
          <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> Aucun engagement</li>
          <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> Aucune CB mémorisée</li>
        </ul>
        <Button variant="outline" className="w-full font-body" onClick={() => handleCheckout("oneshot")} disabled={loading !== null}>
          {loading === "oneshot" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Accéder un mois"}
        </Button>
      </div>

      <div className="relative flex flex-col">
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3 py-0.5 rounded-full font-medium font-body z-10">Le plus choisi</span>
        <div className="bg-card border-2 border-primary rounded-xl p-5 flex flex-col flex-1">
          <p className="font-heading text-lg font-semibold mb-2">Mois après mois</p>
          <p className="mb-1"><span className="text-3xl font-heading font-bold">6,99€</span><span className="text-sm text-muted-foreground font-body">/mois</span></p>
          <p className="text-xs text-muted-foreground font-body mb-4">7 jours d'essai. Annulable à tout moment.</p>
          <ul className="text-sm font-body space-y-2 mb-6 flex-1">
            <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> 7 jours d'essai offerts</li>
            <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> Sans engagement</li>
            <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> Annulable en un clic</li>
          </ul>
          <Button className="w-full font-body" onClick={() => handleCheckout("monthly")} disabled={loading !== null}>
            {loading === "monthly" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Commencer gratuitement"}
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 flex flex-col">
        <span className="inline-flex self-start bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium font-body mb-2">-20%</span>
        <p className="font-heading text-lg font-semibold mb-2">Jusqu'à fin 2026</p>
        <p className="mb-1"><span className="text-3xl font-heading font-bold">{prorataPrice}€</span><span className="text-sm text-muted-foreground font-body"> pour {months} mois</span></p>
        <p className="text-xs text-muted-foreground font-body mb-1">Un seul paiement pour tous les mois restants en 2026</p>
        <p className="text-xs text-green-600 font-medium font-body mb-4">Économie de {savings}€ vs mensuel</p>
        <ul className="text-sm font-body space-y-2 mb-6 flex-1">
          <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> Accès jusqu'au 31 décembre</li>
          <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> Soit {months > 0 ? Math.round(prorataPrice / months * 100) / 100 : 0}€/mois</li>
          <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> Aucun renouvellement automatique</li>
        </ul>
        <Button variant="outline" className="w-full font-body" onClick={() => handleCheckout("prorata")} disabled={loading !== null}>
          {loading === "prorata" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Choisir cette formule"}
        </Button>
      </div>
    </div>

    <FreeAccountSection />
    </div>
  );
}
