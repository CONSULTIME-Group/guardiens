import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  SITTER_PRICE_ONESHOT,
  SITTER_PRICE_ONESHOT_NUMERIC,
  SITTER_PRICE_CURRENCY,
} from "../pricing";

/**
 * Garantit que le prix ponctuel (10 €) reste identique partout :
 *  - constante `pricing.ts` (source de vérité)
 *  - libellé CTA + state `formule` côté UI (`Pricing.tsx`)
 *  - JSON-LD Schema.org `Offer` (price + url plan=one_shot)
 *  - mapping backend Stripe (`create-checkout-session`)
 *
 * Tout drift bloque le build (DGCCRF / L121-2 : prix affiché = prix facturé).
 */

const NBSP = "\u00A0";
const PRICING_PAGE = readFileSync(
  resolve(__dirname, "../../pages/Pricing.tsx"),
  "utf8",
);
const CHECKOUT_FN = readFileSync(
  resolve(
    __dirname,
    "../../../supabase/functions/create-checkout-session/index.ts",
  ),
  "utf8",
);

describe("Prix ponctuel — cohérence UI / state / pricing.ts / Schema.org", () => {
  it("pricing.ts expose 10 € avec espace insécable et valeur numérique alignée", () => {
    expect(SITTER_PRICE_ONESHOT).toBe(`10${NBSP}€`);
    expect(SITTER_PRICE_ONESHOT_NUMERIC).toBe(10);
    expect(SITTER_PRICE_CURRENCY).toBe("EUR");
  });

  it("Pricing.tsx déclare le state `formule` avec la valeur 'one_shot'", () => {
    expect(PRICING_PAGE).toMatch(/useState<['"]one_shot['"]\s*\|/);
    expect(PRICING_PAGE).toContain("setFormule('one_shot')");
  });

  it("Pricing.tsx affiche le CTA ponctuel avec '10\\u00A0€'", () => {
    // Libellé CTA exact : "Accéder un mois, 10 €" (virgule, pas de tiret cadratin)
    expect(PRICING_PAGE).toMatch(
      /one_shot:\s*["']Accéder un mois, 10\\u00A0€["']/,
    );
  });

  it("Schema.org Offer one_shot facture 10.00 EUR à l'URL plan=one_shot", () => {
    // Extraction de l'objet Offer 'Accès Gardien, Un mois'
    const offerMatch = PRICING_PAGE.match(
      /"Accès Gardien, Un mois"[\s\S]*?priceValidUntil:[^,]+,/,
    );
    expect(offerMatch, "Offer one_shot introuvable dans Pricing.tsx").not.toBeNull();
    const offerBlock = offerMatch![0];

    expect(offerBlock).toMatch(/price:\s*["']10\.00["']/);
    expect(offerBlock).toContain("SITTER_PRICE_CURRENCY");
    expect(SITTER_PRICE_CURRENCY).toBe("EUR");
    expect(offerBlock).toContain("eligibleCustomerType");
    expect(offerBlock).toContain("plan=one_shot");
    expect(offerBlock).toContain("schema.org/InStock");
  });

  it("Backend Stripe mappe `one_shot` sur un price_id en mode `payment`", () => {
    expect(CHECKOUT_FN).toMatch(/one_shot["']?\s*:\s*["']price_[A-Za-z0-9]+["']/);
    // S'assure que la formule one_shot reste un paiement unique (pas un abo)
    expect(CHECKOUT_FN).toMatch(/one_shot[\s\S]{0,400}mode:\s*["']payment["']/);
  });

  it("Aucune mention résiduelle de l'ancien prix 12 € pour la formule ponctuelle", () => {
    // L'ancienne valeur 12 € (price_1TJKw9…) ne doit plus apparaître dans l'UI ni le mapping
    expect(PRICING_PAGE).not.toMatch(/12[\u00A0 ]?€[^\d]/);
    expect(CHECKOUT_FN).not.toContain("price_1TJKw9EbGS9RIjqFjRSGwnsQ");
  });
});
