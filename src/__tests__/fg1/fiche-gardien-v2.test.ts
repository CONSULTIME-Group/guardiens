/**
 * Lots FG0 à FG3 (14/11/2026) : fiche gardien publique v2, maquettes Claude
 * Design « Fiche gardien publique · avant / après » validées par Jérémie
 * (« ça me plaît, go »), arène claude/arene/2026-11-14-fiche-gardien.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  experienceGlance,
  glanceItems,
  lifestylePublicLabel,
  readProfileSource,
  shouldTrackProfileOpen,
  sitterProfileHref,
} from "@/lib/sitterProfileV2";

const read = (p: string) => readFileSync(p, "utf8");
const page = read("src/pages/PublicSitterProfile.tsx");
const hero = read("src/components/profile/ProfileHero.tsx");
const f1 = read("src/components/profile/sitter/SitterF1Sections.tsx");
const v2 = read("src/components/profile/sitter/SitterV2Sections.tsx");
const gardien = page.slice(page.indexOf("ONGLET GARDIEN, fiche allégée"), page.indexOf("ONGLET PROPRIO, flux narratif"));

describe("bandeau des chiffres : réels, une fois chacun", () => {
  it("fiche riche : garde, note, expérience, ancienneté", () => {
    const items = glanceItems({ completedSits: 1, avgRating: 5, reviewCount: 1, experience: "5+ ans", memberSince: "2026-03-10T10:00:00Z" });
    expect(items.map((i) => i.value)).toEqual(["1", "5,0 / 5", "5 ans +", "Mars 2026"]);
    expect(items[0].label).toBe("garde sur Guardiens");
    expect(items[1]).toMatchObject({ label: "d'après 1 avis", anchor: "avis" });
  });
  it("fiche vide : aucun zéro, rien d'inventé", () => {
    const items = glanceItems({ completedSits: 0, avgRating: 0, reviewCount: 0, experience: "Débutant", memberSince: "2026-10-02T10:00:00Z" });
    expect(items.map((i) => i.label)).toEqual(["membre depuis"]);
    expect(items.some((i) => /^0/.test(i.value))).toBe(false);
  });
  it("expérience déclarée en mots", () => {
    expect(experienceGlance("3-5 ans")?.value).toBe("3 à 5 ans");
    expect(experienceGlance("1-3 ans")?.value).toBe("1 à 3 ans");
    expect(experienceGlance("")).toBeNull();
    expect(experienceGlance(null)).toBeNull();
  });
  it("la liste d'animaux quitte le bandeau, la note quitte l'en-tête", () => {
    expect(page).not.toContain('label: "animaux gardés", size: "sm"');
    expect(hero).toContain("p.avgRating > 0 && p.reviewCount > 0 && !v2");
  });
});

describe("style de vie lu en mots neutres", () => {
  it("valeurs au masculin réécrites, valeurs inconnues gardées", () => {
    expect(lifestylePublicLabel("Sportif / grandes balades")).toBe("Sport et grandes balades");
    expect(lifestylePublicLabel("Joueur")).toBe("Jeux");
    expect(lifestylePublicLabel("Lève-tôt")).toBe("Lève-tôt");
    expect(lifestylePublicLabel("Autre chose")).toBe("Autre chose");
  });
});

describe("structure de la fiche v2", () => {
  it("la présentation se lit en entier, en lettre, sans « Lire la suite »", () => {
    expect(gardien).toContain("<SitterLetter");
    expect(v2).not.toContain("Lire la suite");
    expect(v2).not.toContain("cutLongText");
  });
  it("le quotidien déclaré tient dans une carte, avec la correspondance du propriétaire", () => {
    expect(gardien).toContain("<SitterDailyCard");
    expect(gardien).toMatch(/label: "Style de vie", chips:/);
    expect(gardien).toMatch(/label: "Environnements préférés", chips:/);
  });
  it("la correspondance affiche le même chiffre que la page de candidature", () => {
    expect(gardien).toContain('displayKey="score"');
  });
  it("plus de mode d'emploi en étapes ni de phrase d'Alma sur l'onglet gardien", () => {
    expect(f1).not.toContain("HowItWorksSteps");
    expect(f1).not.toContain("Une rencontre avant la garde est conseillée");
    expect(gardien).not.toContain("<AlmaWhisperCard");
    expect(gardien).not.toContain("c'est le bon moment pour prendre contact");
  });
  it("plus de phrase des facettes ni de surtitres en capitales sur les nouvelles sections", () => {
    expect(page).not.toContain("garde chez les autres et participe à l'entraide.");
    expect(v2).not.toMatch(/uppercase/);
  });
  it("deux colonnes sur ordinateur, une colonne ordonnée au téléphone", () => {
    expect(gardien).toContain("lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]");
    for (const n of [1, 2, 3, 4, 6, 8]) expect(gardien).toContain(`order-${n} lg:order-none`);
  });
  it("trois gardiens du département en fin de fiche, lus avec photo", () => {
    expect(page).toContain('.select("id, first_name, city, avatar_url")');
    expect(page).toContain('.not("avatar_url", "is", null)');
    expect(gardien).toContain("<NearbySitters");
  });
});

describe("en-tête : gouache entière, à côté du prénom sur ordinateur", () => {
  it("deux emplacements de la même image, jamais recadrée", () => {
    expect(hero).toContain("data-hero-gouache-side");
    const side = hero.slice(hero.indexOf("data-hero-gouache-side"), hero.indexOf("</picture>", hero.indexOf("data-hero-gouache-side")));
    expect(side).toContain("object-contain");
    expect(side).not.toContain("object-cover");
    expect(hero).toMatch(/lg:max-w-\[856px\]" data-hero-gouache-side/);
  });
  it("lot FG1b : prénom et marque d'identité sur une ligne dans la colonne de 440 px", () => {
    expect(hero).toContain("lg:text-[36px]");
    expect(hero).toContain("lg:w-[440px]");
    expect(read("src/index.css")).toMatch(/profile-hero-identity \{\s*width: 440px;/);
  });
  it("le lieu de vie reste « Habite à » (lot CP1)", () => {
    expect(hero).toContain("Habite à ${placeParts}");
  });
  it("le texte sous le bouton du visiteur ne promet pas la gratuité", () => {
    expect(hero).not.toContain("L'inscription est gratuite.");
    expect(hero).toContain("Créez votre compte pour écrire à ${p.firstName}.");
  });
});

describe("téléphone : une seule barre", () => {
  it("la barre de navigation basse est masquée sur la fiche", () => {
    expect(page).toContain("useHideBottomNav(true)");
  });
  it("la barre de la fiche dit la disponibilité, sans note", () => {
    const bar = f1.slice(f1.indexOf("export const SitterStickyBar"), f1.indexOf("export const SitterGlanceBand"));
    expect(bar).not.toContain("★");
    expect(bar).toContain('isAvailable ? "Disponible" : ""');
  });
});

describe("onglet entraide", () => {
  it("coups de main en mots, sans grandes cartes ni « mission »", () => {
    const offer = f1.slice(f1.indexOf("export const EntraideOfferSection"), f1.indexOf("export const CtaButton"));
    expect(offer).toContain("Ses coups de main");
    expect(offer).not.toContain("Ce que je propose");
    expect(offer).not.toContain("flex-col items-center gap-2 rounded-xl");
    expect(page).not.toContain("Pas encore de mission réalisée");
    expect(page).toContain("Un coup de main commence par un message");
  });
});

describe("lot FG0 : provenance des ouvertures de fiche", () => {
  it("lecture du paramètre ?depuis=", () => {
    expect(readProfileSource("candidature")).toBe("candidature");
    expect(readProfileSource("SORTIE")).toBe("sortie");
    expect(readProfileSource("pirate")).toBe("direct");
    expect(readProfileSource(null)).toBe("direct");
    expect(sitterProfileHref("abc", "coup-de-main")).toBe("/gardiens/abc?depuis=coup-de-main");
  });
  it("une mesure par fiche et par provenance dans l'onglet", () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
    expect(shouldTrackProfileOpen(storage, "a", "candidature")).toBe(true);
    expect(shouldTrackProfileOpen(storage, "a", "candidature")).toBe(false);
    expect(shouldTrackProfileOpen(storage, "a", "direct")).toBe(true);
    expect(shouldTrackProfileOpen(null, "a", "direct")).toBe(true);
  });
  it("les liens vers une fiche portent leur provenance", () => {
    expect(read("src/pages/ApplicationDetail.tsx")).toContain('sitterProfileHref(app!.sitter_id, "candidature")');
    expect(read("src/components/sits/ApplicationsList.tsx").match(/sitterProfileHref\(app\.sitter_id, "candidature"\)/g)?.length).toBe(5);
    expect(read("src/components/dashboard/owner/ApplicationsSection.tsx")).toContain('sitterProfileHref(sitter.id, "candidature")');
    expect(read("src/components/messages/ConversationHeader.tsx")).toContain('"conversation")');
    expect(read("src/components/missions/MissionResponseCard.tsx")).toContain('"coup-de-main")');
    const sortie = read("src/pages/SortieDetail.tsx");
    expect(sortie).toContain('sitterProfileHref(outing.organizer_id, "sortie")');
    expect(sortie).toContain('sitterProfileHref(a.user_id, "sortie")');
  });
  it("événement sitter_profile_opened, onglet qui garde la provenance", () => {
    expect(read("src/lib/analytics.ts")).toContain('| "sitter_profile_opened"');
    expect(page).toContain('trackEvent("sitter_profile_opened"');
    expect(page).toContain('next.set("tab", tab);');
  });
});

describe("textes sans tiret cadratin ni demi-cadratin", () => {
  it("nouveaux fichiers", () => {
    for (const src of [v2, read("src/lib/sitterProfileV2.ts")]) expect(src).not.toMatch(/[—–]/);
  });
});
