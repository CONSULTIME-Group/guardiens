/**
 * Lot L3 (08/11/2026, arène tableau de bord v2, direction B) : le récit de
 * l'accueil en logique pure. Recette : 11 états des maquettes (B-01, 03, 04,
 * 07, 08, 12, 13, 16, 17, 19) plus le guide ouvert à J-7, chacun avec une
 * seule action, des textes sans tiret long ni tournure négative, et
 * uniquement des faits fournis en entrée.
 */
import { describe, it, expect } from "vitest";
import {
  resolveOwnerStory,
  resolveSitterStory,
  resolveStory,
  pickFirstStory,
  storyDate,
  joinNames,
  shiftDays,
  OWNER_FRIEZE,
  SITTER_FRIEZE,
  FRIEZE_MEETING_STEP,
  STORY_EVENTS,
  type Story,
} from "@/lib/dashboardStory";

const TODAY = "2026-11-08";
const DASH = /[–—]/;
const NEGATIVE = /(?<!\p{L})(ne|pas|jamais|aucun|aucune)(?!\p{L})|(?<!\p{L})n['’]/iu;

function texts(s: Story): string[] {
  return [s.eyebrow, s.title, s.lead ?? "", s.cta.label, s.secondary?.label ?? ""].filter(Boolean);
}

function checkDoctrine(s: Story) {
  for (const t of texts(s)) {
    expect(t, t).not.toMatch(DASH);
    expect(t, t).not.toMatch(NEGATIVE);
  }
  expect(s.cta.href.startsWith("/")).toBe(true);
}

describe("L3, récit propriétaire", () => {
  it("B-01 · première annonce : la question seule, sans frise", () => {
    const s = resolveOwnerStory({ today: TODAY, period: "noel", city: "Caluire", petNames: ["Caramel", "Noisette"] });
    expect(s.chapter).toBe("first_listing");
    expect(s.title).toBe("Qui veillera sur Caramel et Noisette pour Noël ?");
    expect(s.eyebrow).toBe("Votre maison à Caluire");
    expect(s.cta.href).toBe("/sits/create?express=1&periode=noel&debut=2026-12-19&fin=2027-01-03");
    expect(s.frieze).toBeNull();
    checkDoctrine(s);
  });

  it("B-01 sans animaux déclarés : la maison, rien d'inventé", () => {
    const s = resolveOwnerStory({ today: TODAY, period: "hiver", petNames: [] });
    expect(s.title).toBe("Qui veillera sur votre maison cet hiver ?");
    expect(s.eyebrow).toBe("Votre maison");
  });

  it("B-03 · annonce en ligne : frise sur Candidats, gardiens à proximité en second", () => {
    const s = resolveOwnerStory({
      today: TODAY,
      petNames: ["Caramel", "Noisette"],
      activeSit: { id: "s1", start_date: "2026-12-19", end_date: "2027-01-03" },
      nearbySittersCount: 118,
    });
    expect(s.chapter).toBe("listed");
    expect(s.title).toBe("Du 19 décembre au 3 janvier, Caramel et Noisette attendent leur gardien.");
    expect(s.frieze).toEqual({ labels: OWNER_FRIEZE, current: 1 });
    expect(s.cta).toEqual({ label: "Voir mon annonce", href: "/sits/s1" });
    expect(s.secondary).toEqual({ label: "118 gardiens à proximité", href: "/recherche-gardiens" });
    checkDoctrine(s);
  });

  it("B-04 · candidatures à lire : le prénom du premier candidat, l'action le nomme", () => {
    const s = resolveOwnerStory({
      today: TODAY,
      petNames: ["Caramel", "Noisette"],
      activeSit: { id: "s1" },
      awaiting: { total: 2, unread: 2, first: { sitId: "s1", sitterFirstName: "Camille" } },
    });
    expect(s.chapter).toBe("applications");
    expect(s.title).toBe("Camille propose de veiller sur Caramel et Noisette.");
    expect(s.lead).toBe("Une autre candidature vous attend.");
    expect(s.cta).toEqual({ label: "Lire la candidature de Camille", href: "/sits/s1#candidatures" });
    expect(s.frieze?.current).toBe(1);
    checkDoctrine(s);
  });

  it("B-07 · tout est lu : prendre le temps de choisir", () => {
    const s = resolveOwnerStory({
      today: TODAY,
      activeSit: { id: "s1" },
      awaiting: { total: 2, unread: 0, first: { sitId: "s1", sitterFirstName: "Théo" } },
    });
    expect(s.chapter).toBe("choose");
    expect(s.title).toBe("Prenez le temps de choisir.");
    expect(s.lead).toBe("2 candidatures lues attendent votre réponse.");
    expect(s.cta.label).toBe("Choisir mon gardien");
    checkDoctrine(s);
  });

  it("garde confirmée : la rencontre reste facultative, frise sur Rencontre", () => {
    const s = resolveOwnerStory({
      today: TODAY,
      petNames: ["Caramel"],
      confirmedSit: { id: "s1", start_date: "2026-12-19", sitterFirstName: "Camille" },
    });
    expect(s.chapter).toBe("confirmed");
    expect(s.eyebrow).toBe("Dans 41 jours");
    expect(s.title).toBe("Camille veillera sur Caramel à partir du 19 décembre.");
    expect(s.lead).toMatch(/si vous le souhaitez/);
    expect(s.frieze?.current).toBe(FRIEZE_MEETING_STEP);
    checkDoctrine(s);
  });

  it("garde en cours, puis avis", () => {
    const ongoing = resolveOwnerStory({ today: TODAY, ongoingSit: { id: "s1", end_date: "2026-11-15", sitterFirstName: "Anne" } });
    expect(ongoing.chapter).toBe("ongoing");
    expect(ongoing.title).toBe("Anne veille sur votre maison.");
    expect(ongoing.frieze?.current).toBe(3);
    const review = resolveOwnerStory({ today: TODAY, reviewDue: { sitId: "s9", sitterFirstName: "Anne" } });
    expect(review.chapter).toBe("review");
    expect(review.cta.href).toBe("/review/s9");
    checkDoctrine(ongoing);
    checkDoctrine(review);
  });

  it("brouillon vivant : reprise ; brouillon passé : première annonce", () => {
    const draft = resolveOwnerStory({ today: TODAY, latestDraft: { id: "d1", end_date: "2026-12-30" } });
    expect(draft.chapter).toBe("draft");
    expect(draft.cta.href).toBe("/sits/create?draftId=d1");
    expect(draft.frieze).toBeNull();
    const past = resolveOwnerStory({ today: TODAY, latestDraft: { id: "d1", end_date: "2026-10-01" } });
    expect(past.chapter).toBe("first_listing");
  });

  it("une seule action pleine dans chaque récit propriétaire", () => {
    const s = resolveOwnerStory({ today: TODAY, activeSit: { id: "s1" }, nearbySittersCount: 0 });
    expect(s.secondary).toBeUndefined();
    expect(typeof s.cta.label).toBe("string");
  });
});

describe("L3, récit gardien", () => {
  const opening = {
    id: "o1",
    slug: "garde-ecully",
    ownerFirstName: "Laurence",
    city: "Écully",
    distanceKm: 8.6,
    start_date: "2027-01-09",
    end_date: "2027-01-20",
    petNames: ["Pompon"],
  };

  it("B-08 · gardien nouveau : la garde ouverte, la recherche nationale à portée", () => {
    const s = resolveSitterStory({ today: TODAY, opening, openCount: 23 });
    expect(s.chapter).toBe("opening");
    expect(s.eyebrow).toBe("Nouvelle garde, à 9 km");
    expect(s.title).toBe("Pompon attend son gardien à Écully.");
    expect(s.lead).toBe("Chez Laurence, du 9 janvier au 20 janvier.");
    expect(s.cta).toEqual({ label: "Découvrir chez Laurence", href: "/sits/garde-ecully" });
    expect(s.secondary).toEqual({ label: "Voir les 23 gardes ouvertes", href: "/search?zone=france" });
    expect(s.frieze).toEqual({ labels: SITTER_FRIEZE, current: 0 });
    checkDoctrine(s);
  });

  it("B-12 · candidature envoyée : Réponse s'allume", () => {
    const s = resolveSitterStory({
      today: TODAY,
      pendingApplication: { sitId: "o1", ownerFirstName: "Laurence", created_at: "2026-11-08T09:00:00Z" },
      opening,
      openCount: 23,
    });
    expect(s.chapter).toBe("applied");
    expect(s.title).toBe("Votre mot est chez Laurence.");
    expect(s.frieze?.current).toBe(1);
    checkDoctrine(s);
  });

  it("B-17 · cinq jours plus tard : la deuxième candidature", () => {
    const s = resolveSitterStory({
      today: "2026-11-13",
      pendingApplication: { sitId: "o1", ownerFirstName: "Laurence", created_at: "2026-11-08T09:00:00Z" },
      opening: { id: "o2", ownerFirstName: "Hélène", city: "Tassin", petNames: ["Biscuit"], start_date: "2027-01-06", end_date: "2027-01-18" },
      openCount: 23,
    });
    expect(s.chapter).toBe("second_application");
    expect(s.title).toBe("Pendant que Laurence choisit, Biscuit vous attend à Tassin.");
    expect(s.cta.label).toBe("Découvrir chez Hélène");
    checkDoctrine(s);
  });

  it("cinq jours sans autre garde ouverte : le récit reste sur l'attente", () => {
    const s = resolveSitterStory({
      today: "2026-11-13",
      pendingApplication: { sitId: "o1", ownerFirstName: "Laurence", created_at: "2026-11-08T09:00:00Z" },
      opening: { id: "o1" },
    });
    expect(s.chapter).toBe("applied");
  });

  it("B-13 et B-16 · garde confirmée : écrire, se rencontrer si vous le souhaitez, date du guide", () => {
    const s = resolveSitterStory({
      today: TODAY,
      confirmedSit: { id: "c1", propertyId: "p1", start_date: "2026-12-19", city: "Annecy", ownerFirstName: "Anne", petNames: ["Figue", "Olive"] },
    });
    expect(s.chapter).toBe("confirmed");
    expect(s.eyebrow).toBe("Annecy · dans 41 jours");
    expect(s.title).toBe("Figue et Olive vous attendent le 19 décembre.");
    expect(s.cta).toEqual({ label: "Écrire à Anne", href: "/sits/c1" });
    expect(s.lead).toBe("Se rencontrer avant, si vous le souhaitez. Le guide de la maison s'ouvre le 12 décembre.");
    expect(s.frieze?.current).toBe(FRIEZE_MEETING_STEP);
    checkDoctrine(s);
  });

  it("J-7 · le guide de la maison est ouvert", () => {
    const s = resolveSitterStory({
      today: "2026-12-12",
      confirmedSit: { id: "c1", propertyId: "p1", start_date: "2026-12-19", city: "Annecy", ownerFirstName: "Anne", petNames: ["Figue", "Olive"] },
    });
    expect(s.chapter).toBe("guide_open");
    expect(s.cta).toEqual({ label: "Lire le guide de la maison", href: "/house-guide/p1" });
    expect(s.secondary?.label).toBe("Écrire à Anne");
    checkDoctrine(s);
  });

  it("aucune garde mise en avant : la recherche nationale", () => {
    const s = resolveSitterStory({ today: TODAY, openCount: 23 });
    expect(s.chapter).toBe("discover");
    expect(s.title).toBe("23 gardes ouvertes vous attendent en France.");
    expect(s.cta.href).toBe("/search?zone=france");
    checkDoctrine(s);
  });
});

describe("L3, double rôle (B-19)", () => {
  const owner = resolveOwnerStory({
    today: TODAY,
    activeSit: { id: "s1" },
    awaiting: { total: 2, unread: 2, first: { sitId: "s1", sitterFirstName: "Camille" } },
  });
  const sitter = resolveSitterStory({ today: TODAY, confirmedSit: { id: "c1", start_date: "2026-12-19", ownerFirstName: "Martine" } });

  it("le récit le plus urgent s'ouvre d'abord", () => {
    expect(pickFirstStory(owner, sitter).space).toBe("owner");
    const calmOwner = resolveOwnerStory({ today: TODAY, activeSit: { id: "s1" } });
    expect(pickFirstStory(calmOwner, sitter).space).toBe("sitter");
  });

  it("le dernier choix du membre est gardé", () => {
    expect(pickFirstStory(owner, sitter, "sitter").space).toBe("sitter");
  });

  it("point d'entrée unique", () => {
    expect(resolveStory({ space: "owner", today: TODAY }).chapter).toBe("first_listing");
    expect(resolveStory({ space: "sitter", today: TODAY }).chapter).toBe("discover");
  });
});

describe("L3, outils", () => {
  it("dates, noms, décalage", () => {
    expect(storyDate("2026-12-19")).toBe("19 décembre");
    expect(storyDate("x")).toBeNull();
    expect(joinNames(["Mila", " ", "Rex", "Nala"])).toBe("Mila, Rex et Nala");
    expect(shiftDays("2026-12-19", -7)).toBe("2026-12-12");
    expect(shiftDays("2026-03-02", -7)).toBe("2026-02-23");
  });

  it("événements de mesure nommés une fois", () => {
    expect(STORY_EVENTS).toEqual({
      seen: "dashboard_story_seen",
      ctaClicked: "dashboard_story_cta_clicked",
      friezeStepClicked: "dashboard_frieze_step_clicked",
    });
  });
});
