// Audit Tarifs, outil dev-only.
// Liste toutes les sources de prix de l'app et signale les divergences avec
// la source unique de vérité (`src/lib/pricing.ts`). Non indexable, non monté
// en production.

import { Helmet } from "react-helmet-async";
import {
  OWNER_PRICE,
  SITTER_PRICE,
  SITTER_PRICE_NUMERIC,
  SITTER_PRICE_CURRENCY,
  SITTER_PRICE_ONESHOT,
  SITTER_PRICE_ONESHOT_NUMERIC,
  SITTER_PRICE_ANNUAL,
  SITTER_PRICE_ANNUAL_NUMERIC,
  SITTER_PRICE_ANNUAL_MONTHLY_EQUIV,
  SITTER_PRICE_ANNUAL_DISCOUNT_PCT,
} from "@/lib/pricing";

// Imports `?raw` : récupère le code source brut. Vite supporte nativement.
// Le composant étant lazy + dev-only, le coût bundle reste contenu.
import pricingPageSrc from "@/pages/Pricing.tsx?raw";
import checkoutFnSrc from "../../supabase/functions/create-checkout-session/index.ts?raw";

type Formula = "owner" | "mensuel" | "one_shot" | "annuel";
type BackendKey = "monthly" | "one_shot" | "annuel";

interface Row {
  formula: Formula;
  source: string; // file/path label
  field: string; // ce qu'on lit
  found: string | null;
  expected: string;
  ok: boolean;
}

const NBSP = "\u00A0";

// ── Extracteurs ──────────────────────────────────────────────────────────────

function extractCtaLabel(src: string, key: Formula | BackendKey): string | null {
  const re = new RegExp(`${key}\\s*:\\s*["']([^"']+)["']`);
  return src.match(re)?.[1] ?? null;
}

function extractOfferPrice(src: string, offerName: string): string | null {
  const re = new RegExp(
    `"${offerName.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}"[\\s\\S]{0,400}?price:\\s*["']([^"']+)["']`,
  );
  return src.match(re)?.[1] ?? null;
}

function extractBackendPriceId(src: string, key: Formula | BackendKey): string | null {
  const re = new RegExp(`${key}["']?\\s*:\\s*["'](price_[A-Za-z0-9]+)["']`);
  return src.match(re)?.[1] ?? null;
}

function extractBackendMode(src: string, key: Formula | BackendKey): string | null {
  const re = new RegExp(`${key}[\\s\\S]{0,400}?mode:\\s*["'](payment|subscription)["']`);
  return src.match(re)?.[1] ?? null;
}

// ── Construction des lignes d'audit ──────────────────────────────────────────

function buildRows(): Row[] {
  const rows: Row[] = [];

  // Helper
  const push = (r: Row) => rows.push(r);

  // -------- Propriétaire (gratuit) --------
  push({
    formula: "owner",
    source: "src/lib/pricing.ts",
    field: "OWNER_PRICE",
    found: OWNER_PRICE,
    expected: `0${NBSP}€`,
    ok: (OWNER_PRICE as string) === `0${NBSP}€`,
  });

  // -------- Mensuel 6,99 € --------
  push({
    formula: "mensuel",
    source: "src/lib/pricing.ts",
    field: "SITTER_PRICE",
    found: SITTER_PRICE,
    expected: `6,99${NBSP}€/mois`,
    ok: SITTER_PRICE === `6,99${NBSP}€/mois`,
  });
  push({
    formula: "mensuel",
    source: "src/lib/pricing.ts",
    field: "SITTER_PRICE_NUMERIC",
    found: String(SITTER_PRICE_NUMERIC),
    expected: "6.99",
    ok: SITTER_PRICE_NUMERIC === 6.99,
  });
  {
    const offerPrice = extractOfferPrice(pricingPageSrc, "Abonnement Gardien, Mensuel");
    push({
      formula: "mensuel",
      source: "src/pages/Pricing.tsx (Offer)",
      field: 'Schema.org Offer "Mensuel".price',
      found: offerPrice,
      expected: "6.99",
      ok: offerPrice === String(SITTER_PRICE_NUMERIC),
    });
  }
  {
    const id = extractBackendPriceId(checkoutFnSrc, "monthly");
    push({
      formula: "mensuel",
      source: "supabase/functions/create-checkout-session",
      field: 'PRICE_IDS["monthly"]',
      found: id,
      expected: "price_… (subscription)",
      ok: !!id,
    });
    const mode = extractBackendMode(checkoutFnSrc, "monthly");
    push({
      formula: "mensuel",
      source: "supabase/functions/create-checkout-session",
      field: "Stripe checkout mode",
      found: mode,
      expected: "subscription",
      ok: mode === "subscription",
    });
  }

  // -------- One-shot 10 € --------
  push({
    formula: "one_shot",
    source: "src/lib/pricing.ts",
    field: "SITTER_PRICE_ONESHOT",
    found: SITTER_PRICE_ONESHOT,
    expected: `10${NBSP}€`,
    ok: SITTER_PRICE_ONESHOT === `10${NBSP}€`,
  });
  push({
    formula: "one_shot",
    source: "src/lib/pricing.ts",
    field: "SITTER_PRICE_ONESHOT_NUMERIC",
    found: String(SITTER_PRICE_ONESHOT_NUMERIC),
    expected: "10",
    ok: SITTER_PRICE_ONESHOT_NUMERIC === 10,
  });
  {
    const cta = extractCtaLabel(pricingPageSrc, "one_shot");
    push({
      formula: "one_shot",
      source: "src/pages/Pricing.tsx (state ctaLabels)",
      field: "CTA libellé one_shot",
      found: cta,
      expected: `Accéder un mois, 10${NBSP}€`,
      ok: !!cta && cta.includes("10") && cta.includes("€"),
    });
  }
  {
    const offerPrice = extractOfferPrice(pricingPageSrc, "Accès Gardien, Un mois");
    push({
      formula: "one_shot",
      source: "src/pages/Pricing.tsx (Offer)",
      field: 'Schema.org Offer "Un mois".price',
      found: offerPrice,
      expected: "10.00",
      ok: !!offerPrice && parseFloat(offerPrice) === SITTER_PRICE_ONESHOT_NUMERIC,
    });
  }
  {
    const id = extractBackendPriceId(checkoutFnSrc, "one_shot");
    push({
      formula: "one_shot",
      source: "supabase/functions/create-checkout-session",
      field: 'PRICE_IDS["one_shot"]',
      found: id,
      expected: "price_… (payment)",
      ok: !!id,
    });
    const mode = extractBackendMode(checkoutFnSrc, "one_shot");
    push({
      formula: "one_shot",
      source: "supabase/functions/create-checkout-session",
      field: "Stripe checkout mode",
      found: mode,
      expected: "payment",
      ok: mode === "payment",
    });
  }

  // -------- Annuel 65 € --------
  push({
    formula: "annuel",
    source: "src/lib/pricing.ts",
    field: "SITTER_PRICE_ANNUAL",
    found: SITTER_PRICE_ANNUAL,
    expected: `65${NBSP}€/an`,
    ok: SITTER_PRICE_ANNUAL === `65${NBSP}€/an`,
  });
  push({
    formula: "annuel",
    source: "src/lib/pricing.ts",
    field: "SITTER_PRICE_ANNUAL_NUMERIC",
    found: String(SITTER_PRICE_ANNUAL_NUMERIC),
    expected: "65",
    ok: SITTER_PRICE_ANNUAL_NUMERIC === 65,
  });
  push({
    formula: "annuel",
    source: "src/lib/pricing.ts",
    field: "ANNUAL_MONTHLY_EQUIV / DISCOUNT",
    found: `${SITTER_PRICE_ANNUAL_MONTHLY_EQUIV} (-${SITTER_PRICE_ANNUAL_DISCOUNT_PCT}%)`,
    expected: `5,42${NBSP}€/mois (-22%)`,
    ok:
      SITTER_PRICE_ANNUAL_MONTHLY_EQUIV === `5,42${NBSP}€/mois` &&
      SITTER_PRICE_ANNUAL_DISCOUNT_PCT === 22,
  });
  {
    const cta = extractCtaLabel(pricingPageSrc, "annuel");
    push({
      formula: "annuel",
      source: "src/pages/Pricing.tsx (state ctaLabels)",
      field: "CTA libellé annuel",
      found: cta,
      expected: `Choisir l'annuel, 65${NBSP}€/an`,
      ok: !!cta && cta.includes("65") && cta.includes("€"),
    });
  }
  {
    const offerPrice = extractOfferPrice(pricingPageSrc, "Abonnement Gardien, Annuel");
    push({
      formula: "annuel",
      source: "src/pages/Pricing.tsx (Offer)",
      field: 'Schema.org Offer "Annuel".price',
      found: offerPrice,
      expected: "65.00",
      ok: !!offerPrice && parseFloat(offerPrice) === SITTER_PRICE_ANNUAL_NUMERIC,
    });
  }
  {
    const id = extractBackendPriceId(checkoutFnSrc, "annuel");
    push({
      formula: "annuel",
      source: "supabase/functions/create-checkout-session",
      field: 'PRICE_IDS["annuel"]',
      found: id,
      expected: "price_… (subscription)",
      ok: !!id,
    });
    const mode = extractBackendMode(checkoutFnSrc, "annuel");
    push({
      formula: "annuel",
      source: "supabase/functions/create-checkout-session",
      field: "Stripe checkout mode",
      found: mode,
      expected: "subscription",
      ok: mode === "subscription",
    });
  }

  // -------- Devise --------
  push({
    formula: "owner",
    source: "src/lib/pricing.ts",
    field: "SITTER_PRICE_CURRENCY",
    found: SITTER_PRICE_CURRENCY,
    expected: "EUR",
    ok: SITTER_PRICE_CURRENCY === "EUR",
  });

  return rows;
}

// ── Vue ──────────────────────────────────────────────────────────────────────

const formulaLabel: Record<Formula, string> = {
  owner: "Propriétaire (0 €)",
  mensuel: "Mensuel (6,99 €/mois)",
  one_shot: "Ponctuel (10 €)",
  annuel: "Annuel (65 €/an)",
};

const AuditTarifs = () => {
  const isDev = import.meta.env.DEV;

  if (!isDev) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <Helmet>
          <meta name="robots" content="noindex,nofollow" />
          <title>Audit tarifs, indisponible</title>
        </Helmet>
        <div className="max-w-md text-center space-y-2">
          <h1 className="text-2xl font-semibold">Audit tarifs</h1>
          <p className="text-muted-foreground">
            Cet outil est réservé au mode développement. Il n'est pas accessible en production.
          </p>
        </div>
      </main>
    );
  }

  const rows = buildRows();
  const drift = rows.filter((r) => !r.ok);
  const grouped = (Object.keys(formulaLabel) as Formula[]).map((f) => ({
    formula: f,
    rows: rows.filter((r) => r.formula === f),
  }));

  return (
    <main className="min-h-screen p-6 md:p-10 max-w-6xl mx-auto">
      <Helmet>
        <meta name="robots" content="noindex,nofollow" />
        <title>Audit tarifs, dev</title>
      </Helmet>

      <header className="mb-8 space-y-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Outil dev, non monté en production
        </p>
        <h1 className="text-3xl font-semibold">Audit tarifs</h1>
        <p className="text-muted-foreground max-w-2xl">
          Compare toutes les sources de prix (constants, UI/state, Schema.org,
          mapping backend Stripe) à la source unique de vérité{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">src/lib/pricing.ts</code>.
        </p>
        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium ${
            drift.length === 0
              ? "bg-success/10 text-success"
              : "bg-destructive/10 text-destructive"
          }`}
          aria-live="polite"
        >
          {drift.length === 0
            ? `OK, ${rows.length} sources alignées`
            : `${drift.length} divergence(s) sur ${rows.length} sources`}
        </div>
      </header>

      {grouped.map(({ formula, rows: group }) => (
        <section key={formula} className="mb-10">
          <h2 className="text-xl font-semibold mb-3">{formulaLabel[formula]}</h2>
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3 font-medium">Source</th>
                  <th className="p-3 font-medium">Champ</th>
                  <th className="p-3 font-medium">Valeur trouvée</th>
                  <th className="p-3 font-medium">Attendu</th>
                  <th className="p-3 font-medium w-16 text-center">Statut</th>
                </tr>
              </thead>
              <tbody>
                {group.map((r, i) => (
                  <tr
                    key={i}
                    className={`border-t ${!r.ok ? "bg-destructive/5" : ""}`}
                  >
                    <td className="p-3 font-mono text-xs text-muted-foreground">
                      {r.source}
                    </td>
                    <td className="p-3">{r.field}</td>
                    <td className="p-3 font-mono text-xs whitespace-pre-wrap">
                      {r.found ?? <span className="text-destructive">∅ introuvable</span>}
                    </td>
                    <td className="p-3 font-mono text-xs text-muted-foreground whitespace-pre-wrap">
                      {r.expected}
                    </td>
                    <td className="p-3 text-center">
                      {r.ok ? (
                        <span className="text-success font-bold">OK</span>
                      ) : (
                        <span className="text-destructive font-bold">DRIFT</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <footer className="mt-12 pt-6 border-t text-xs text-muted-foreground space-y-1">
        <p>
          Lecture source : Vite <code>?raw</code> sur <code>src/pages/Pricing.tsx</code> et{" "}
          <code>supabase/functions/create-checkout-session/index.ts</code>.
        </p>
        <p>
          Limite connue : ne valide pas le montant réel côté Stripe (Dashboard).
          À compléter par un job nocturne <code>stripe.prices.retrieve()</code>.
        </p>
      </footer>
    </main>
  );
};

export default AuditTarifs;
