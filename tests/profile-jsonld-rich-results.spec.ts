/**
 * E2E — Vérifie le JSON-LD (Rich Results) sur une page profil gardien.
 *
 * Charge la page dans un vrai navigateur (SPA → JSON-LD injecté via Helmet),
 * extrait tous les `<script type="application/ld+json">`, et valide :
 *   - présence d'un bloc Person (identité, name)
 *   - présence d'un bloc Service (provider, serviceType)
 *   - aggregateRating bien porté par Service (éligible Rich Results),
 *     PAS par Person (non éligible)
 *
 * Le PROFILE_ID peut être surchargé via la var d'env PROFILE_ID. Par défaut
 * on cible un gardien connu pour avoir au moins 1 avis publié.
 */
import { test, expect } from "../playwright-fixture";

const PROFILE_ID =
  process.env.PROFILE_ID || "7bf29905-d372-4669-93b1-ec7def9b06d5";

const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ||
  process.env.BASE_URL ||
  "https://guardiens.fr";

test("Profil gardien : JSON-LD Person + Service + aggregateRating valide pour Rich Results", async ({
  page,
}) => {
  const url = `${BASE_URL.replace(/\/$/, "")}/gardiens/${PROFILE_ID}`;
  await page.goto(url, { waitUntil: "networkidle" });

  // Attendre l'injection Helmet (au moins un script ld+json présent).
  await page.waitForFunction(
    () =>
      document.querySelectorAll('script[type="application/ld+json"]').length >
      0,
    null,
    { timeout: 15_000 },
  );

  const blocks = await page.$$eval(
    'script[type="application/ld+json"]',
    (els) =>
      els
        .map((el) => {
          try {
            return JSON.parse(el.textContent || "");
          } catch {
            return null;
          }
        })
        .filter(Boolean),
  );

  expect(blocks.length, "au moins un bloc JSON-LD attendu").toBeGreaterThan(0);

  const person = blocks.find((b: any) => b["@type"] === "Person");
  const service = blocks.find((b: any) => b["@type"] === "Service");

  // ── Person ──────────────────────────────────────────────────────────────
  expect(person, "bloc Person attendu").toBeTruthy();
  expect(person["@context"]).toBe("https://schema.org");
  expect(typeof person.name).toBe("string");
  expect(person.name.length).toBeGreaterThan(0);
  expect(person.url).toContain(`/gardiens/${PROFILE_ID}`);

  // aggregateRating doit être PORTÉ PAR Service (éligible Rich Results),
  // PAS par Person.
  expect(
    person.aggregateRating,
    "aggregateRating ne doit PAS être sur Person (non éligible Rich Results)",
  ).toBeUndefined();

  // ── Service ─────────────────────────────────────────────────────────────
  expect(service, "bloc Service attendu pour un profil gardien").toBeTruthy();
  expect(service["@context"]).toBe("https://schema.org");
  expect(service.serviceType).toMatch(/garde/i);
  expect(service.provider, "Service.provider doit être un Person").toBeTruthy();
  expect(service.provider["@type"]).toBe("Person");
  expect(service.provider.name).toBe(person.name);

  // ── aggregateRating (présent uniquement si avis ≥ 1) ────────────────────
  if (service.aggregateRating) {
    const ar = service.aggregateRating;
    expect(ar["@type"]).toBe("AggregateRating");
    expect(typeof ar.ratingValue).toBe("number");
    expect(ar.ratingValue).toBeGreaterThanOrEqual(1);
    expect(ar.ratingValue).toBeLessThanOrEqual(5);
    expect(typeof ar.reviewCount).toBe("number");
    expect(ar.reviewCount).toBeGreaterThanOrEqual(1);
    expect(ar.bestRating).toBe(5);
    expect(ar.worstRating).toBe(1);
  }

  // ── interactionStatistic (si présent) ──────────────────────────────────
  if (service.interactionStatistic) {
    expect(service.interactionStatistic["@type"]).toBe("InteractionCounter");
    expect(service.interactionStatistic.interactionType).toBe(
      "https://schema.org/PerformAction",
    );
    expect(typeof service.interactionStatistic.userInteractionCount).toBe(
      "number",
    );
  }
});
