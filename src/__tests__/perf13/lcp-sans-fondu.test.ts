/**
 * Lot perf 13 (26/10/2026) : contenu réel compté par le LCP. Une image ou un
 * texte peint à opacité 0 (apparition en fondu) n'est jamais candidat LCP :
 * la photo de la fiche ou du tableau de bord était remplacée par le bandeau
 * cookies, peint après le premier affichage (LCP mobile 7,1 s au p75 sur
 * /actualites/:id quand le bandeau l'emporte, 2,8 s sur /auth/confirm,
 * mesure du 26/10/2026, 14 jours), et chaque page apparaissait 0,5 s plus tard.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";

const read = (p: string) => readFileSync(p, "utf8");

describe("perf 13, aucune page n'apparaît en fondu", () => {
  it("pages : seuls les écrans de création d'annonce et la galerie de test gardent leur fondu", () => {
    const allowed = new Set(["CreateSit.tsx", "TestHeroGallery.tsx", "Dashboard.tsx"]);
    const offenders = readdirSync("src/pages")
      .filter((f) => f.endsWith(".tsx") && !allowed.has(f))
      .filter((f) => /className="[^"]*\banimate-fade-in\b/.test(read(`src/pages/${f}`)));
    expect(offenders).toEqual([]);
  });

  it("tableau de bord : fondu au seul changement d'espace", () => {
    const d = read("src/pages/Dashboard.tsx");
    expect(d).toContain('className={transitioning ? "animate-fade-out" : roleSwitched ? "animate-fade-in" : undefined}');
    expect(d).toMatch(/if \(activeRole !== displayedRole\) \{\s*setRoleSwitched\(true\);/);
  });

  it("bandeau cookies en fondu : jamais candidat LCP à la place du contenu", () => {
    expect(read("src/components/legal/CookieConsentBanner.tsx")).toMatch(/fixed inset-x-0 bottom-0 z-\[60\][^"]*animate-fade-in"/);
  });

  it("photos du haut du tableau de bord en priorité haute", () => {
    for (const f of [
      "src/components/dashboard/sitter/SitterMatchSection.tsx",
      "src/components/dashboard/sitter/SitterCockpit.tsx",
      "src/components/dashboard/owner/OwnerCockpit.tsx",
    ]) {
      expect(read(f), f).toMatch(/loading="eager"\s+fetchPriority="high"/);
    }
  });
});
