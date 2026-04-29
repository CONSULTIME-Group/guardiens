import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import FreeAccountSection from "./FreeAccountSection";

const calculateYearlyProrata = (): { price: number; months: number; savings: number } => {
  const now = new Date();
  const endOfYear = new Date(2026, 11, 31);
  const months = Math.max(0, Math.floor(
    (endOfYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
  ));
  const fullPrice = months * 6.99;
  const discounted = Math.round(fullPrice * 0.8 * 100) / 100;
  const savings = Math.round(fullPrice * 0.2 * 100) / 100;
  return { price: discounted, months, savings };
};

export default function PricingCards() {
  const [loading, setLoading] = useState<"monthly" | "yearly" | null>(null);
  const { price: prorataPrice, months, savings } = calculateYearlyProrata();

  const handleCheckout = async (type: "monthly" | "yearly") => {
    setLoading(type);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          lookup_key: type === "monthly" ? "gardien_mensuel" : "gardien_annuel_2026",
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (e: any) {
      toast.error("Impossible de lancer le paiement. Veuillez reessayer.");
      logger.error("Erreur checkout", { err: String(e) });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      <FreeAccountSection />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Mensuel */}
      <div className="bg-card border border-border rounded-2xl p-6 flex flex-col">
        <p className="text-xs tracking-widest uppercase text-muted-foreground font-body mb-3">
          Mensuel
        </p>
        <p className="text-3xl font-heading font-bold mb-1">6,99&#8364;</p>
        <p className="text-sm font-body text-muted-foreground mb-4">
          / mois — sans engagement
        </p>
        <ul className="text-sm font-body text-foreground/70 space-y-2 mb-6 flex-1">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
            Postuler aux gardes
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
            Messagerie illimitee
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
            Visible dans la recherche
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
            Resiliation en 1 clic
          </li>
        </ul>
        <button
          onClick={() => handleCheckout("monthly")}
          disabled={loading !== null}
          className="w-full py-3 rounded-xl border border-primary text-primary font-body font-medium text-sm hover:bg-primary/5 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading === "monthly" && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading === "monthly" ? "Redirection..." : "Choisir le mensuel"}
        </button>
      </div>

      {/* Annuel 2026 */}
      <div className="bg-primary text-primary-foreground rounded-2xl p-6 flex flex-col relative overflow-hidden">
        <span className="absolute top-4 right-4 bg-white/20 text-white text-xs font-body px-2 py-0.5 rounded-full">
          -20%
        </span>
        <p className="text-xs tracking-widest uppercase text-white/60 font-body mb-3">
          Annuel 2026
        </p>
        <p className="text-3xl font-heading font-bold mb-1">{prorataPrice}&#8364;</p>
        <p className="text-sm font-body text-white/70 mb-1">
          {months} mois x 6,99&#8364; x 0,8 = {prorataPrice}&#8364; pour finir 2026
        </p>
        <p className="text-xs font-body text-white/50 mb-4">
          Renouvellement au 1er janvier 2027 a 6,99&#8364;/mois
        </p>
        <ul className="text-sm font-body text-white/80 space-y-2 mb-6 flex-1">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-white/90 shrink-0" />
            Tout du mensuel
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-white/90 shrink-0" />
            Economie de {savings}&#8364; vs mensuel
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-white/90 shrink-0" />
            Resiliable avant le 1er janvier
          </li>
        </ul>
        <button
          onClick={() => handleCheckout("yearly")}
          disabled={loading !== null}
          className="w-full py-3 rounded-xl bg-white text-primary font-body font-medium text-sm hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading === "yearly" && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading === "yearly" ? "Redirection..." : `Choisir l'annuel — ${prorataPrice}\u20AC`}
        </button>
      </div>

      <p className="text-xs font-body text-muted-foreground text-center md:col-span-2">
        Renouvellement automatique au 1er janvier 2027 a 6,99&#8364;/mois sauf resiliation avant cette date.
        Vous recevrez un rappel 30 jours avant.
      </p>
      </div>

      <FreeAccountSection />
    </div>
  );
}
