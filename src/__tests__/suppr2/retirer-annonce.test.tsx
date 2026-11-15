/**
 * Lot SUPPR2 (15/11/2026) : message de contact du 14/11, une propriétaire ne
 * trouvait pas comment supprimer son annonce ; Alma lui avait proposé trois
 * fois « Lancer un projet à plusieurs » et situé le bouton dans le formulaire.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { buildVerifiedFacts } from "../../../supabase/functions/_shared/alma-facts";
import { emptyInventory } from "../../../supabase/functions/_shared/alma-inventory";
import { computeNextAction, type NextActionInput } from "../../../supabase/functions/_shared/alma-next-action";
import { ALMA_SITE_KNOWLEDGE } from "../../../supabase/functions/_shared/alma-site-knowledge";

const TODAY = "2026-11-14";
const SIT = { id: "s1", title: "Gardiennage près de Beauval", status: "published", city: "Villentrois", start_date: "2027-04-09", end_date: "2027-04-18" };
const ask = (question: string, over: Partial<NextActionInput> = {}): NextActionInput => ({
  facts: buildVerifiedFacts({ role: "owner", ownSits: [SIT], received: [], sent: [], missions: [], today: TODAY }),
  inventory: { ...emptyInventory({ postal_code: "36600" }) },
  accountRole: "owner",
  activeRole: "owner",
  question,
  register: "dossier" as any,
  helpIntent: false,
  largeAnimals: false,
  completion: 70,
  today: TODAY,
  foreignOpen: true,
  ...over,
});

describe("SUPPR2 · retirer son annonce", () => {
  it.each(["je veux supprimer mon annonce", "comment rendre mon annonce invisible", "dépublier"])("« %s » mène à « Gérer cette garde »", (q) => {
    const r = computeNextAction(ask(q));
    expect(r.action).toEqual({ label: "Retirer mon annonce", path: "/sits/s1#gerer-cette-garde", reason: "retirer_annonce" });
  });

  it("sur la fiche de son annonce, le verbe seul suffit", () => {
    const viewedSit = { id: "s1", action: { label: "Voir les candidatures", path: "/sits/s1#candidatures", reason: "x" } as any };
    const r = computeNextAction(ask("comment la supprimer ? je peux juste la modifier", { viewedSit }));
    expect(r.action?.path).toBe("/sits/s1#gerer-cette-garde");
  });

  it("aucun « projet à plusieurs » sans en parler ni demander de l'aide", () => {
    const r = computeNextAction(ask("Ya pas !!"));
    const paths = [r.action?.path, ...r.chips.map((c) => c.path)].filter(Boolean) as string[];
    expect(paths.some((p) => p.startsWith("/projets/publier"))).toBe(false);
    const asked = computeNextAction(ask("je voudrais lancer un projet de haie à plusieurs"));
    const p2 = [asked.action?.path, ...asked.chips.map((c) => c.path)].filter(Boolean) as string[];
    expect(p2.some((p) => p.startsWith("/projets/publier"))).toBe(true);
  });

  it("Alma sait où sont les boutons", () => {
    const e = ALMA_SITE_KNOWLEDGE.find((k) => k.key === "mes_annonces")!;
    expect(e.purpose).toContain("bloc « Gérer cette garde » en bas de la fiche");
    expect(e.triggers).toContain("supprimer mon annonce");
  });

  it("le formulaire de modification mène au bloc, qui porte l'ancre", () => {
    expect(readFileSync("src/pages/EditSit.tsx", "utf8")).toContain("to={`/sits/${id}#gerer-cette-garde`}");
    const block = readFileSync("src/components/sits/shared/OwnerSitManagement.tsx", "utf8");
    expect(block).toContain('id="gerer-cette-garde"');
    expect(block).toContain('if (location.hash !== "#gerer-cette-garde") return;');
  });
});
