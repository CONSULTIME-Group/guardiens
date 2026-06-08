import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import {
  SITTER_PRICE_NUMERIC,
  SITTER_PRICE_ANNUAL_NUMERIC,
  SITTER_PRICE_ANNUAL_MONTHLY_EQUIV,
  SITTER_PRICE_ANNUAL_DISCOUNT_PCT,
} from "@/lib/pricing";
import FreeAccountSection from "./FreeAccountSection";

// NOTE, Le calcul prorata 2026 (`calculateYearlyProrata`) a été supprimé.
// Risque DGCCRF / L121-2 : prix affiché ≠ prix débité. La formule annuelle
// facture désormais un montant fixe de 65 €/an (cf. `src/lib/pricing.ts`)
// quel que soit le moment de la souscription.

type Formula = "monthly" | "annuel";

export default function PricingCards() {
  const [loading, setLoading] = useState<Formula | null>(null);

  const handleCheckout = async (formula: Formula) => {
    setLoading(formula);
    try {
      const { data, error } = await supabase.functions.invoke(
        "create-checkout-session",
        { body: { formula_type: formula } },
      );
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (e: unknown) {
      toast.error("Impossible de lancer le paiement. Veuillez réessayer.");
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
          <p className="text-3xl font-heading font-bold tabular-nums mb-1">
            {SITTER_PRICE_NUMERIC.toString().replace(".", ",")}&nbsp;&#8364;
          </p>
          <p className="text-sm font-body text-muted-foreground mb-4">
            / mois, sans engagement
          </p>
          <ul className="text-sm font-body text-foreground/70 space-y-2 mb-6 flex-1">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
              Postuler aux gardes
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
              Messagerie illimitée
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
              Visible dans la recherche
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
              Résiliation en 1 clic
            </li>
          </ul>
          <button
            onClick={() => handleCheckout("monthly")}
            disabled={loading !== null}
            className="w-full py-3 rounded-xl border border-primary text-primary font-body font-medium text-sm hover:bg-primary/5 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading === "monthly" && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading === "monthly" ? "Redirection…" : "Choisir le mensuel"}
          </button>
        </div>

        {/* Annuel, 65 €/an, prix fixe (plus de prorata) */}
        <div className="bg-primary text-primary-foreground rounded-2xl p-6 flex flex-col relative overflow-hidden">
          <span className="absolute top-4 right-4 bg-white/20 text-white text-xs font-body px-2 py-0.5 rounded-full">
            -{SITTER_PRICE_ANNUAL_DISCOUNT_PCT}%
          </span>
          <p className="text-xs tracking-widest uppercase text-white/60 font-body mb-3">
            Annuel
          </p>
          <p className="text-3xl font-heading font-bold mb-1">
            {SITTER_PRICE_ANNUAL_NUMERIC}&nbsp;&#8364;
          </p>
          <p className="text-sm font-body text-white/70 mb-1">
            / an, soit {SITTER_PRICE_ANNUAL_MONTHLY_EQUIV} équivalent
          </p>
          <p className="text-xs font-body text-white/75 mb-4">
            Renouvellement annuel automatique. Résiliable à tout moment.
          </p>
          <ul className="text-sm font-body text-white/80 space-y-2 mb-6 flex-1">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-white/90 shrink-0" />
              Tout du mensuel
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-white/90 shrink-0" />
              Économie de {SITTER_PRICE_ANNUAL_DISCOUNT_PCT}% vs mensuel
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-white/90 shrink-0" />
              Un seul prélèvement par an
            </li>
          </ul>
          <button
            onClick={() => handleCheckout("annuel")}
            disabled={loading !== null}
            className="w-full py-3 rounded-xl bg-white text-primary font-body font-medium text-sm hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading === "annuel" && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading === "annuel"
              ? "Redirection…"
              : `Choisir l'annuel, ${SITTER_PRICE_ANNUAL_NUMERIC}\u00A0\u20AC/an`}
          </button>
        </div>

        <p className="text-xs font-body text-muted-foreground text-center md:col-span-2">
          Renouvellement automatique. Vous recevrez un rappel 30 jours avant
          chaque échéance et pourrez résilier à tout moment.
        </p>
      </div>
    </div>
  );
}
