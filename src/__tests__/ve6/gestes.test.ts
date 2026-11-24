// Lot VE-6 (24/11/2026) : une ligne par annonce, tous types de signaux
// confondus, et un geste faisable en un clic. Recette 1 à 3, 5 à 7 du prompt
// claude/prompt-ve6-vue-ensemble-gestes-faisables-24-novembre-2026.md.
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { buildWorkList, type WorkListRaw } from "../../../supabase/functions/_shared/admin-work-list.ts";
import { SIGNAL_TYPES, sitGroupSummary } from "../../../supabase/functions/_shared/admin-signal-config.ts";
import { alsoWords, applyOwnerAbsence, broadcastSitIds, buildGestures, gesturesSentence } from "@/lib/admin/gestures";
import { groupQueueSignals, SIT_ENTRY_TYPES } from "@/components/admin/signals/actionQueue";
import { sitCardLine } from "@/components/admin/signals/SitSignalGroupCard";
import type { AdminSignalBase } from "@/components/admin/signals/signalGrouping";

const NOW = new Date("2026-11-24T08:00:00Z").getTime();
const DAY = 86_400_000;
const ago = (days: number) => new Date(NOW - days * DAY).toISOString();

type Meta = Record<string, unknown>;
const onSit = (id: string, type: string, sit: string, severity = "warning", metadata: Meta = {}) => ({
  id, signal_type: type, severity, entity_type: "sit", entity_id: sit, detected_at: "2026-11-22T10:00:00Z",
  metadata: { sit_title: `Garde ${sit}`, ...metadata },
});
/** Lieu à situer : le signal porte le profil, l'annonce est dans les métadonnées. */
const coords = (id: string, sit: string) => ({
  id, signal_type: "owner_missing_coordinates", severity: "warning", entity_type: "profile", entity_id: `owner-${sit}`,
  detected_at: "2026-11-22T10:00:00Z", metadata: { sit_id: sit, sit_title: `Garde ${sit}`, owner_first_name: "Sami" },
});
const noApp = (id: string, sit: string, start: string, metadata: Meta = {}) => onSit(id, "no_applications", sit, "warning", {
  sit_city: `Ville ${sit}`, days_since_published: 4, eligible_sitters_count: 6, owner_id: `owner-${sit}`, start_date: start, ...metadata,
});
const raw = (signals: unknown[], sits: { id: string; start_date: string; title: string; city: string }[]): WorkListRaw => ({
  sources: { signals: true, sits: true, queues: true, relances: true, health: true },
  signals, sits, queues: [], relances_failed_7d: 0, health: [],
} as unknown as WorkListRaw);
const gesturesOf = (signals: unknown[], sits: { id: string; start_date: string; title: string; city: string }[]) =>
  buildGestures(buildWorkList(raw(signals, sits), NOW), NOW);

const AIKO = { id: "aiko", start_date: "2026-11-28", title: "Aïko", city: "Licq Atherey" };
const DJERBA = { id: "djerba", start_date: "2026-12-20", title: "Maison à Djerba", city: "Tezdayine" };
const LONGVIC = { id: "longvic", start_date: "2026-12-01", title: "Garde longvic", city: "Longvic" };

describe("VE-6 A : une ligne par annonce", () => {
  const unconfirmed = onSit("u1", "owner_sit_unconfirmed", "aiko", "critical", { owner_id: "o-aiko", owner_first_name: "Eliane" });
  const stalled = onSit("d1", "stalled_discussion", "aiko", "warning", { owner_id: "o-aiko" });

  it("recette 1 : discussion à l'arrêt et garde à confirmer tiennent sur une ligne", () => {
    const alone = gesturesOf([unconfirmed], [AIKO]);
    const both = gesturesOf([unconfirmed, stalled], [AIKO]);
    expect(both).toHaveLength(1);
    expect(both.length).toBe(alone.length);
    const g = both[0];
    expect(g.title).toBe("Aider le propriétaire à confirmer son gardien");
    expect(g.detail).toContain("Aussi : 1 discussion à l'arrêt.");
    expect(g.signals.map((s) => s.id)).toEqual(["u1", "d1"]);
    expect(g.sitId).toBe("aiko");
    // Avant le lot : deux lignes. Le total baisse de 1, la phrase et la pastille suivent.
    expect(gesturesSentence(both)).toBe("1 geste aujourd'hui.");
  });

  it("recette 1 : trois discussions se disent au pluriel", () => {
    const g = gesturesOf([unconfirmed, stalled, { ...stalled, id: "d2" }, { ...stalled, id: "d3" }], [AIKO])[0];
    expect(g.detail).toContain("Aussi : 3 discussions à l'arrêt.");
    expect(g.signals).toHaveLength(4);
  });

  it("recette 2 : zéro gardien touché et lieu à situer, le lieu est le signal principal", () => {
    const list = gesturesOf([onSit("z1", "sit_published_zero_reach", "djerba", "critical"), coords("c1", "djerba")], [DJERBA]);
    expect(list).toHaveLength(1);
    const g = list[0];
    expect(g.type).toBe("owner_missing_coordinates");
    expect(g.title).toBe("Corriger le lieu de 1 propriétaire à situer sur la carte");
    expect(g.actionLabel).toBe("Corriger");
    expect(g.detail).toContain("Aussi : zéro gardien touché.");
    expect(g.signals.map((s) => s.id)).toEqual(["c1", "z1"]);
    // L'annonce garde l'échéance du signal le plus pressé.
    expect(g.bucket).toBe("today");
    expect(g.tone).toBe("urgent");
  });

  it("recette 3 : la ligne « aucune candidature » absorbe les autres signaux et reste une diffusion", () => {
    const list = gesturesOf([noApp("n1", "longvic", "2026-12-01"), coords("c2", "longvic")], [LONGVIC]);
    expect(list).toHaveLength(1);
    const g = list[0];
    expect(g.kind).toBe("broadcast");
    expect(g.key).toBe("sit:longvic");
    expect(g.actionLabel).toBe("Diffuser l'annonce");
    // La fenêtre de diffusion lit le premier signal de la ligne.
    expect(g.signals[0].id).toBe("n1");
    expect(g.signals.map((s) => s.id)).toEqual(["n1", "c2"]);
    expect(g.detail).toContain("Aussi : lieu à situer.");
    expect(g.secondaryWrite?.userId).toBe("owner-longvic");
  });

  it("deux annonces restent deux lignes, une personne sans annonce garde la sienne", () => {
    const other = { id: "puy", start_date: "2026-11-29", title: "Garde puy", city: "Puycelsi" };
    const list = gesturesOf([
      unconfirmed,
      onSit("d9", "stalled_discussion", "puy", "warning", { owner_id: "o-puy" }),
      { id: "s9", signal_type: "suspicious_account", severity: "warning", entity_type: "profile", entity_id: "p9", detected_at: "2026-11-23T10:00:00Z", metadata: { first_name: "Marion" } },
    ], [AIKO, other]);
    expect(list).toHaveLength(3);
    expect(list.filter((g) => g.sitId).map((g) => g.sitId).sort()).toEqual(["aiko", "puy"]);
  });

  it("une annonce lointaine fusionnée reste rangée avec les annonces lointaines", () => {
    const far1 = { id: "f1", start_date: "2027-02-06", title: "Garde f1", city: "Ville f1" };
    const far2 = { id: "f2", start_date: "2027-03-06", title: "Garde f2", city: "Ville f2" };
    const list = gesturesOf([noApp("n8", "f1", "2027-02-06"), coords("c8", "f1"), noApp("n9", "f2", "2027-03-06")], [far1, far2]);
    expect(list).toHaveLength(1);
    expect(list[0].kind).toBe("more");
    expect(list[0].children?.map((c) => c.key)).toEqual(["sit:f1", "sit:f2"]);
    expect(list[0].children?.[0].signals.map((s) => s.id)).toEqual(["n8", "c8"]);
  });

  it("« Aussi » : un type sans mot court reprend son libellé, sans tiret long", () => {
    const words = alsoWords([{ id: "x", signal_type: "repeated_cancellations", severity: "warning", entity_type: "sit", entity_id: "s", detected_at: ago(1), metadata: {} }]);
    expect(words).toBe(SIGNAL_TYPES.repeated_cancellations.label.toLowerCase());
    expect(words).not.toMatch(/[—–]/);
  });
});

describe("VE-6 B : les lignes de garde écrivent au propriétaire", () => {
  it("recette 4 : avec owner_id et prénom, le bouton devient « Écrire à Eliane »", () => {
    const g = gesturesOf([onSit("u1", "owner_sit_unconfirmed", "aiko", "critical", { owner_id: "o-aiko", owner_first_name: "Eliane" })], [AIKO])[0];
    expect(g.kind).toBe("write");
    expect(g.actionLabel).toBe("Écrire à Eliane");
    expect(g.moreActions).toBe(true);
    expect(g.ownerWrite).toEqual({
      userId: "o-aiko", firstName: "Eliane", sitId: "aiko", types: ["owner_sit_unconfirmed"],
      applications: 0, city: "Licq Atherey", startDate: "2026-11-28",
    });
  });

  it("sans prénom : « Écrire au propriétaire » ; candidatures comptées pour le gabarit", () => {
    const g = gesturesOf([
      onSit("p1", "pending_application", "aiko", "critical", { owner_id: "o-aiko" }),
      onSit("p2", "pending_application", "aiko", "critical", { owner_id: "o-aiko" }),
    ], [AIKO])[0];
    expect(g.actionLabel).toBe("Écrire au propriétaire");
    expect(g.ownerWrite?.applications).toBe(2);
  });

  it("sans owner_id : la carte dépliée reste le geste", () => {
    const g = gesturesOf([onSit("d1", "stalled_discussion", "aiko", "critical")], [AIKO])[0];
    expect(g.kind).toBe("card");
    expect(g.actionLabel).toBe("Relancer");
    expect(g.ownerWrite).toBeUndefined();
  });

  it("recette 5 : owner_sit_unconfirmed seul donne une entrée par annonce", () => {
    const entries = groupQueueSignals([onSit("u1", "owner_sit_unconfirmed", "aiko", "critical")] as unknown as AdminSignalBase[]);
    expect(entries).toHaveLength(1);
    expect(entries[0].kind).toBe("sit");
    expect(entries[0].kind === "sit" && entries[0].sitId).toBe("aiko");
    expect([...SIT_ENTRY_TYPES].sort()).toEqual(["owner_sit_unconfirmed", "pending_application", "stalled_discussion"]);
    // La configuration partagée (email du matin) reste telle quelle.
    expect(SIGNAL_TYPES.owner_sit_unconfirmed.queueGroup).toBeUndefined();
  });

  it("la carte de l'annonce dit « garde à confirmer », le résumé partagé reste tel quel", () => {
    const sit = { title: "Aïko", city: "Licq Atherey", start_date: "2026-11-28" };
    expect(sitCardLine(sit, ["owner_sit_unconfirmed"])).toBe("Aïko, Licq Atherey, début le 28 novembre 2026 : garde à confirmer");
    expect(sitCardLine(sit, ["stalled_discussion", "owner_sit_unconfirmed"])).toBe("Aïko, Licq Atherey, début le 28 novembre 2026 : 1 discussion à l'arrêt, garde à confirmer");
    expect(sitCardLine(sit, ["pending_application"])).toBe("Aïko, Licq Atherey, début le 28 novembre 2026 : 1 candidature sans réponse");
    expect(sitGroupSummary(["owner_sit_unconfirmed"])).toBe("");
  });
});

describe("VE-6 D : diffuser seulement quand le propriétaire est là", () => {
  const base = gesturesOf([noApp("n1", "longvic", "2026-12-01")], [LONGVIC]);

  it("recette 7 : absent depuis 20 jours, le bouton écrit et la diffusion passe en lien", () => {
    const g = applyOwnerAbsence(base, new Map([["longvic", ago(20)]]), NOW)[0];
    expect(g.ownerAbsentDays).toBe(20);
    expect(g.actionLabel).toBe("Écrire au propriétaire");
    expect(g.detail).toContain("Propriétaire absent depuis 20 jours.");
    expect(g.kind).toBe("broadcast");
    expect(g.secondaryWrite?.topic).toBe("no_applications");
  });

  it("recette 7 : vu il y a 5 jours, date inconnue ou lecture en échec, la ligne reste telle quelle", () => {
    for (const map of [new Map([["longvic", ago(5)]]), new Map([["longvic", null]]), new Map<string, string | null>(), null, undefined]) {
      const g = applyOwnerAbsence(base, map, NOW)[0];
      expect(g.actionLabel).toBe("Diffuser l'annonce");
      expect(g.ownerAbsentDays).toBeUndefined();
      expect(g.detail).not.toContain("absent");
    }
  });

  it("le seuil est celui de ownerAbsence (14 jours), aucune seconde constante", () => {
    expect(applyOwnerAbsence(base, new Map([["longvic", ago(14)]]), NOW)[0].ownerAbsentDays).toBeUndefined();
    expect(applyOwnerAbsence(base, new Map([["longvic", ago(15)]]), NOW)[0].ownerAbsentDays).toBe(15);
    expect(readFileSync("src/lib/admin/gestures.ts", "utf8")).not.toMatch(/OWNER_ABSENT_AFTER_DAYS\s*=|=\s*14\b/);
  });

  it("les annonces lointaines repliées sont lues et servies aussi", () => {
    const far1 = { id: "f1", start_date: "2027-02-06", title: "Garde f1", city: "Ville f1" };
    const far2 = { id: "f2", start_date: "2027-03-06", title: "Garde f2", city: "Ville f2" };
    const list = gesturesOf([noApp("n1", "longvic", "2026-12-01"), noApp("n8", "f1", "2027-02-06"), noApp("n9", "f2", "2027-03-06")], [LONGVIC, far1, far2]);
    expect(broadcastSitIds(list)).toEqual(["f1", "f2", "longvic"]);
    const out = applyOwnerAbsence(list, new Map([["f2", ago(43)]]), NOW);
    expect(out.find((g) => g.kind === "more")?.children?.map((c) => c.ownerAbsentDays)).toEqual([undefined, 43]);
  });

  it("recette 7, détail : le compte dit qu'il inclut les gardiens déjà prévenus", () => {
    expect(base[0].detail).toContain("6 gardiens à proximité, déjà prévenus compris.");
    const one = gesturesOf([noApp("n1", "longvic", "2026-12-01", { eligible_sitters_count: 1 })], [LONGVIC])[0];
    expect(one.detail).toContain("1 gardien à proximité, déjà prévenus compris.");
  });
});

describe("VE-6 C : un seul mot pour fermer une ligne", () => {
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return f === "__tests__" || f === "test" ? [] : walk(p);
    return /\.(ts|tsx)$/.test(f) ? [p] : [];
  });

  it("recette 6 : « Classer sans agir » n'existe plus dans src", () => {
    const hits = walk("src").filter((p) => readFileSync(p, "utf8").includes("Classer sans agir"));
    expect(hits).toEqual([]);
  });

  it("textes ajoutés : aucun tiret cadratin ni demi-cadratin", () => {
    for (const p of [
      "src/lib/admin/gestures.ts",
      "src/pages/admin/_components/dashboard/PilotageBlocks.tsx",
      "src/components/admin/signals/actionQueue.ts",
      "src/components/admin/signals/SitSignalGroupCard.tsx",
      "src/components/admin/signals/BroadcastSitDialog.tsx",
    ]) {
      const strings = readFileSync(p, "utf8").match(/(["'`])(?:(?!\1)[^\\\n]|\\.)*\1/g) ?? [];
      expect(strings.filter((s) => /[—–]/.test(s) && !/\\u201[34]/.test(s)), p).toEqual([]);
    }
  });
});
