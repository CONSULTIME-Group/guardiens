import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { associationLocalActions, associationLocalActionReady, hasActionPoint, isRecentActionConfirmation, localActionDay, localActionSkillMatch, missionLocalAction, requiredLocalActionSkillMatch, selectLocalUsefulActions, type AssociationLocalAction, type LocalAction } from "@/lib/localUsefulActions";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/hooks/useLocalUsefulActions", () => ({ useLocalUsefulActions: () => ({ data: null }) }));
import LocalUsefulActions, { LocalUsefulActionsView } from "@/components/dashboard/shared/LocalUsefulActions";

const now = new Date("2026-10-18T08:00:00Z");
const point = { latitude: 45.76, longitude: 4.83 };
const action = (patch: Partial<LocalAction> = {}): LocalAction => ({
  id: "arrosage", kind: "entraide", title: "Arroser le potager", city: "Lyon", ...point,
  href: "/petites-missions/arrosage", date: "2026-10-19", until: "2026-10-19", when: "2026-10-19",
  duration: "Une heure", confirmedOn: "2026-10-17", skills: ["Arrosage plantes"], requiredSkills: [], beginnerFriendly: true, ...patch,
});
const select = (list: LocalAction[], skills: string[] = [], radiusKm = 15) => selectLocalUsefulActions(list, { point, skills, radiusKm, now });
const mission = (patch = {}) => ({
  id: "mission", user_id: "autre", title: "Monter une commode", city: "Lyon", ...point,
  status: "open", category: "house", created_at: "2026-10-17T10:00:00Z", ...patch,
});
const local: AssociationLocalAction = {
  enabled: true, title: "Aider à la collecte de nourriture", city: "Lyon", ...point,
  confirmed_on: "2026-10-17", available_from: "2026-10-19", available_until: "2026-10-25",
  duration: "Deux heures", beginner_friendly: true,
};
const assoc = (a: AssociationLocalAction | null = local, url = "https://association.example/action") => ({
  slug: "les-chats", name: "Les chats", needs_details: [{ url, local_action: a }],
});

describe("Proximité réelle et sélection commune", () => {
  it("ne remplace jamais une action éloignée par une appartenance au même département", () => {
    expect(select([action({ latitude: 46.2, city: "Même département" })])).toEqual([]);
  });
  it("respecte le rayon choisi sans élargissement automatique", () => {
    const nearby = action({ latitude: 45.86 });
    expect(select([nearby], [], 5)).toHaveLength(0);
    expect(select([nearby], [], 15)).toHaveLength(1);
    expect(select([action({ latitude: 45.96 })], [], 30)).toHaveLength(1);
  });
  it.each([null, undefined, NaN, Infinity, 95, "45.76"])("refuse une latitude inconnue ou invalide : %s", latitude => {
    expect(selectLocalUsefulActions([action()], { point: { latitude, longitude: 4.83 }, skills: [], now })).toEqual([]);
  });
  it("accepte le méridien et l'équateur, mais pas le point sentinelle 0,0", () => {
    expect(hasActionPoint({ latitude: 0, longitude: 2 })).toBe(true);
    expect(hasActionPoint({ latitude: 45, longitude: 0 })).toBe(true);
    expect(hasActionPoint({ latitude: 0, longitude: 0 })).toBe(false);
  });
  it("réunit les trois types, supprime les doublons et conserve deux propositions", () => {
    const result = select([action(), action(), action({ id: "projet", kind: "projet" }), action({ id: "asso", kind: "association" })]);
    expect(result).toHaveLength(2);
    expect(new Set(result.map(a => a.id)).size).toBe(2);
  });
  it("retire les événements terminés, y compris s'ils restent ouverts en base", () => {
    expect(select([action({ until: "2026-10-17" })])).toEqual([]);
    expect(select([action({ until: "2026-10-18" })])).toHaveLength(1);
  });
});

describe("Savoir-faire et découverte", () => {
  it("rapproche montage de meubles et commode, arrosage et potager", () => {
    expect(localActionSkillMatch("Monter une commode", ["Montage de meubles"])).toBe(true);
    expect(localActionSkillMatch("Arroser le potager", ["Arrosage plantes"])).toBe(true);
  });
  it("ne transforme pas la couture en compétence de bricolage", () => {
    expect(localActionSkillMatch("Montage de meubles", ["Couture"])).toBe(false);
  });
  it("propose un début accessible sans savoir-faire renseigné", () => {
    expect(select([action()])).toHaveLength(1);
    expect(select([action({ beginnerFriendly: false })])).toHaveLength(0);
  });
  it("priorise les savoir-faire déclarés à l'intérieur du rayon", () => {
    const result = select([action({ id: "numerique", skills: ["Informatique"] }), action({ id: "jardin", latitude: 45.77 })], ["Arrosage plantes"]);
    expect(result[0].id).toBe("jardin");
  });
  it("vérifie tous les prérequis et ne déduit pas la charpente du bricolage", () => {
    expect(requiredLocalActionSkillMatch("bois", ["Bricolage"])).toBe(false);
    expect(requiredLocalActionSkillMatch("bois", ["Travail du bois"])).toBe(true);
    expect(select([action({ requiredSkills: ["bois", "potager"] })], ["Travail du bois"])).toHaveLength(0);
    expect(select([action({ requiredSkills: ["bois", "potager"] })], ["Travail du bois", "Potager"])).toHaveLength(1);
  });
  it("utilise les centres d'intérêt pour classer, jamais pour ouvrir une tâche non débutante", () => {
    const context = { point, skills: [], interests: ["Potager"], now };
    expect(selectLocalUsefulActions([action({ beginnerFriendly: false })], context)).toHaveLength(0);
    expect(selectLocalUsefulActions([action({ beginnerFriendly: false })], { ...context, skills: ["Potager"] })).toHaveLength(1);
    expect(selectLocalUsefulActions([action({ beginnerFriendly: true })], context)[0]?.matchingSkill).toBe(true);
    expect(selectLocalUsefulActions([action({ requiredSkills: ["potager"] })], context)).toHaveLength(0);
  });
});

describe("Demandes et projets réellement ouverts", () => {
  it.each([{ status: "completed" }, { user_id: "moi" }, { mission_type: "offre" }, { accepting_applications: false }, { latitude: null }, { date_needed: "2026-10-17" }])("écarte une demande non éligible : %j", patch => {
    expect(missionLocalAction(mission(patch), "moi", now)).toBeNull();
  });
  it("ne présente pas une vieille demande sans date comme un besoin confirmé", () => {
    expect(missionLocalAction(mission({ created_at: "2026-08-01T00:00:00Z" }), "moi", now)).toBeNull();
  });
  it("classe la catégorie projet et garde sa destination et ses prérequis", () => {
    const result = missionLocalAction(mission({ category: "projet", slug: "jardin-partage", savoir_faire_attendus: ["potager"] }), "moi", now);
    expect(result?.kind).toBe("projet");
    expect(result?.href).toBe("/projets/jardin-partage");
    expect(result?.beginnerFriendly).toBe(false);
    expect(result?.requiredSkills).toEqual(["potager"]);
  });
});

describe("Actions des associations", () => {
  it("un besoin général ou un siège connu ne suffit pas", () => {
    expect(associationLocalActions(assoc(null), now)).toEqual([]);
    expect(associationLocalActions(assoc({ ...local, latitude: null }), now)).toEqual([]);
  });
  it("utilise le lieu d'exécution propre au besoin et un lien vers celui-ci", () => {
    const result = associationLocalActions(assoc({ ...local, city: "Villeurbanne", latitude: 45.77 }), now);
    expect(result[0].city).toBe("Villeurbanne");
    expect(result[0].href).toBe("/associations/les-chats#besoin-0");
  });
  it.each([{ enabled: false }, { confirmed_on: "2026-09-01" }, { confirmed_on: "2026-10-19" }, { available_until: "2026-10-17" }, { available_until: "2026-02-30" }, { duration: "" }, { beginner_friendly: false }])("masque les actions incomplètes, expirées ou non confirmées : %j", patch => {
    expect(associationLocalActions(assoc({ ...local, ...patch }), now)).toEqual([]);
  });
  it("refuse une URL de source non navigable", () => {
    expect(associationLocalActionReady(local, "javascript:alert(1)")).toBe(false);
    expect(associationLocalActionReady(local, "https://")).toBe(false);
  });
  it("tient compte de la journée parisienne et du délai de 30 jours", () => {
    expect(localActionDay(new Date("2026-10-17T23:30:00Z"))).toBe("2026-10-18");
    expect(isRecentActionConfirmation("2026-09-18", now)).toBe(true);
    expect(isRecentActionConfirmation("2026-09-17", now)).toBe(false);
  });
});

describe("Rendu du bloc commun", () => {
  it("reste absent pour un visiteur", () => {
    const { container } = render(<MemoryRouter><LocalUsefulActions /></MemoryRouter>);
    expect(container.innerHTML).toBe("");
  });
  it("montre la tâche, le type, le lieu, le temps et permet un changement volontaire de rayon", () => {
    const change = vi.fn();
    render(<MemoryRouter><LocalUsefulActionsView actions={select([action()])} radius={15} onRadiusChange={change} /></MemoryRouter>);
    expect(screen.getByText("Arroser le potager")).toBeTruthy();
    expect(screen.getByText("Coup de main")).toBeTruthy();
    expect(screen.getByText(/Une heure/)).toBeTruthy();
    expect(screen.getByRole("link").getAttribute("href")).toBe("/petites-missions/arrosage");
    fireEvent.change(screen.getByRole("combobox", { name: "Rayon des actions locales" }), { target: { value: "5" } });
    expect(change).toHaveBeenCalledWith(5);
  });
});
