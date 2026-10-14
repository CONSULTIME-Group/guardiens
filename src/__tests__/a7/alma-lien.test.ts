/**
 * Lot A7 (14/10/2026) : le lien avec Alma. Recette du module partagé
 * supabase/functions/_shared/alma-bond.ts, du filet de sortie et du câblage.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  allowedBondClaims,
  bondClaimsIn,
  bondHeaderLine,
  computeAlmaBond,
  formatBondBlock,
  momentCelebration,
  planCelebration,
  stageCelebration,
  type BondSignals,
} from "../../../supabase/functions/_shared/alma-bond";
import { checkOutput, repairOutput, type OutputGuardInput } from "../../../supabase/functions/_shared/alma-companion";
import { ALMA_SYSTEM_PROMPT } from "../../../supabase/functions/_shared/alma-system-prompt";
import { ALMA_VERSION } from "../../../supabase/functions/_shared/alma-version";
import { ALMA_THRESHOLDS } from "@/hooks/useAlmaEvolution";

const root = resolve(__dirname, "../../..");
const read = (p: string) => readFileSync(resolve(root, p), "utf8");
const TODAY = "2026-10-14";

function base(over: Partial<BondSignals> = {}): BondSignals {
  return {
    today: TODAY,
    activeRole: "owner",
    profileCompletion: 70,
    ownSits: [],
    sentApplications: [],
    missions: [],
    badges: [],
    server: { member_since: "2026-09-03T08:00:00Z", alma_exchanges: 0, alma_first_at: null },
    ...over,
  };
}

const guard = (over: Partial<OutputGuardInput> = {}): OutputGuardInput => ({
  memberText: "",
  contextText: "",
  gazetteer: [],
  noListingPlaces: [],
  actionLabels: [],
  hasPriorExchange: false,
  ...over,
});

describe("A7, module du lien : stade et moments datés", () => {
  it("profil sous 40 % : nouvelle rencontre ; à 40 % sans geste : éveillée", () => {
    expect(computeAlmaBond(base({ profileCompletion: 39 })).stage).toBe("nouvelle");
    expect(computeAlmaBond(base({ profileCompletion: 40 })).stage).toBe("eveillee");
    expect(ALMA_THRESHOLDS.profileCompletionMin).toBe(40);
  });

  it("annonce publiée : Proche depuis le jour de publication, moment daté avec lien", () => {
    const b = computeAlmaBond(base({
      ownSits: [
        { id: "s2", status: "published", published_at: "2026-10-10T09:00:00Z" },
        { id: "s1", status: "expired", published_at: "2026-09-20T22:30:00Z" },
      ],
    }));
    expect(b.stage).toBe("complice");
    expect(b.stageLabel).toBe("Proche");
    const m = b.moments.find((x) => x.key === "premiere_annonce")!;
    // 22 h 30 UTC le 20 septembre = 21 septembre à Paris.
    expect(m.date).toBe("2026-09-21");
    expect(m.href).toBe("/sits/s1");
    expect(b.stageSince).toBe("2026-09-21");
  });

  it("garde réalisée, avis, écusson, coup de main rendu : Fidèle, moments datés dans l'ordre", () => {
    const b = computeAlmaBond(base({
      activeRole: "sitter",
      sentApplications: [{ sit_id: "g1", status: "accepted", created_at: "2026-08-01T10:00:00Z", sit: { id: "g1", status: "completed", start_date: "2026-08-20", end_date: "2026-08-27" } }],
      badges: [{ created_at: "2026-09-02T10:00:00Z" }],
      server: {
        member_since: "2026-07-15T10:00:00Z",
        alma_exchanges: 4,
        alma_first_at: "2026-09-10T10:24:01Z",
        first_confirmed_at: "2026-08-05T12:00:00Z",
        first_confirmed_sit_id: "g1",
        reviews_received: 1,
        first_review_at: "2026-08-30T08:00:00Z",
        help_given: 1,
        first_help_at: "2026-10-01T08:00:00Z",
      },
    }));
    expect(b.stage).toBe("fidele");
    expect(b.stageSince).toBe("2026-08-27");
    expect(b.moments.map((m) => m.key)).toEqual([
      "premiere_candidature",
      "premiere_garde_confirmee",
      "premiere_garde_realisee",
      "premier_avis",
      "premier_ecusson",
      "premiere_rencontre",
      "premier_coup_de_main",
    ]);
    expect(b.moments.find((m) => m.key === "premiere_garde_realisee")!.href).toBe("/review/g1");
    expect(b.moments.find((m) => m.key === "premier_coup_de_main")!.variant).toBe("rendu");
    expect(b.daysKnown).toBe(34);
  });

  it("aucun moment sans donnée", () => {
    const b = computeAlmaBond(base({
      ownSits: [{ id: "s1", status: "published", published_at: null }],
      server: { member_since: null, alma_exchanges: 0, alma_first_at: "2026-10-01T10:00:00Z", reviews_received: 0, first_review_at: "2026-10-01T10:00:00Z", help_given: 0, first_help_at: "2026-10-01T10:00:00Z", first_confirmed_at: null },
    }));
    expect(b.moments).toEqual([]);
    expect(b.memberSince).toBeNull();
    // Annonce publiée sans date : le geste compte, le moment reste absent.
    expect(b.stage).toBe("complice");
    expect(b.stageSince).toBeNull();
  });

  it("première rencontre au premier échange seulement", () => {
    const none = computeAlmaBond(base());
    expect(none.moments.some((m) => m.key === "premiere_rencontre")).toBe(false);
    expect(none.firstMeeting).toBeNull();
    expect(none.daysKnown).toBeNull();
    const one = computeAlmaBond(base({ server: { member_since: "2026-09-03T08:00:00Z", alma_exchanges: 1, alma_first_at: "2026-10-12T18:00:00Z" } }));
    expect(one.moments).toEqual([expect.objectContaining({ key: "premiere_rencontre", date: "2026-10-12" })]);
    expect(one.daysKnown).toBe(2);
  });

  it("prochain pas : toujours une page réelle, vers un échange entre membres", () => {
    const owner = computeAlmaBond(base({ profileCompletion: 70 }));
    expect(owner.next).toMatchObject({ href: "/sits/create" });
    const fidele = computeAlmaBond(base({ badges: [{ created_at: "2026-10-01T10:00:00Z" }] }));
    expect(fidele.next).toMatchObject({ href: "/petites-missions" });
    const low = computeAlmaBond(base({ profileCompletion: 10, activeRole: "sitter" }));
    expect(low.next).toMatchObject({ href: "/profile" });
  });

  it("en-tête du dock : « Avec vous depuis le 3 septembre · Proche »", () => {
    const b = computeAlmaBond(base({ ownSits: [{ id: "s1", status: "published", published_at: "2026-10-01T09:00:00Z" }] }));
    expect(bondHeaderLine(b, TODAY)).toBe("Avec vous depuis le 3 septembre · Proche");
    expect(bondHeaderLine(b, "2027-01-02")).toBe("Avec vous depuis le 3 septembre 2026 · Proche");
    expect(bondHeaderLine(null, TODAY)).toBeNull();
  });
});

describe("A7, bloc du prompt", () => {
  it("ne contient que les moments fournis, 3 au plus, récent marqué", () => {
    const b = computeAlmaBond(base({
      ownSits: [{ id: "s1", status: "published", published_at: "2026-10-12T09:00:00Z" }],
      sentApplications: [{ sit_id: "x", status: "pending", created_at: "2026-09-01T09:00:00Z", sit: null }],
      server: { member_since: "2026-08-01T09:00:00Z", alma_exchanges: 3, alma_first_at: "2026-09-15T09:00:00Z" },
    }));
    const block = formatBondBlock(b, TODAY);
    expect(block).toContain("VOTRE LIEN AVEC CETTE PERSONNE");
    expect(block).toContain("Stade du lien : Proche, depuis le 1er septembre 2026");
    expect(block).toContain("Votre première annonce en ligne, le 12 octobre 2026 (RÉCENT");
    expect(block).toContain("Votre première candidature envoyée, le 1er septembre 2026.");
    expect(block).toContain("Vous vous parlez depuis le 15 septembre 2026 (3 échanges");
    for (const absent of ["garde", "avis", "écusson", "coup de main"]) {
      expect(block.toLowerCase()).not.toContain(absent);
    }
    expect(block).not.toMatch(/[–—]/);
  });

  it("sans échange : première conversation, et au plus trois moments", () => {
    const b = computeAlmaBond(base({
      ownSits: [{ id: "s1", status: "published", published_at: "2026-10-01T09:00:00Z" }],
      sentApplications: [{ sit_id: "x", status: "pending", created_at: "2026-09-01T09:00:00Z", sit: null }],
      missions: [{ id: "m1", status: "open", created_at: "2026-09-05T09:00:00Z" }],
      badges: [{ created_at: "2026-09-07T09:00:00Z" }],
    }));
    const block = formatBondBlock(b, TODAY);
    expect(block).toContain("c'est votre première conversation");
    expect(block.match(/^ {2}· /gm)?.length).toBe(3);
  });

  it("le prompt reçoit la section LE LIEN et la version passe en a7", () => {
    expect(ALMA_SYSTEM_PROMPT).toContain("LE LIEN");
    expect(ALMA_SYSTEM_PROMPT).toContain("Tu te souviens seulement de ce que ce bloc contient");
    expect(ALMA_SYSTEM_PROMPT).toContain("Un moment marqué RÉCENT se salue une fois");
    // Lot A4 : la version a changé depuis (2026-10-14.a4), elle reste datée.
    expect(ALMA_VERSION).toMatch(/^2026-10-14\.a\d+$/);
  });

  it("alma-chat envoie le bloc et lit le lien en une lecture", () => {
    const src = read("supabase/functions/alma-chat/index.ts");
    expect(src).toContain("formatBondBlock(bond, todayIso)");
    expect(src).toContain('userClient.rpc("my_alma_bond_signals")');
    expect(src).toContain("allowedClaims: allowedBondClaims(bond, facts)");
    expect(src).toContain("country, latitude, longitude, created_at\")");
  });
});

describe("A7, filet de sortie : moment fantôme", () => {
  it("retire « votre première garde » quand aucun moment ne la porte", () => {
    const text = "Votre première garde s'est très bien passée. Une nouvelle annonce attend près de chez vous.";
    const g = guard({ allowedClaims: [] });
    expect(checkOutput(text, g)).toContain("moment_fantome:garde");
    expect(repairOutput(text, g)).toBe("Une nouvelle annonce attend près de chez vous.");
  });

  it("garde la phrase quand le lien porte la garde", () => {
    const b = computeAlmaBond(base({ server: { first_confirmed_at: "2026-09-01T10:00:00Z", first_confirmed_sit_id: "g" } }));
    const g = guard({ allowedClaims: allowedBondClaims(b, null) });
    expect(checkOutput("Votre première garde est confirmée, belle étape.", g)).toEqual([]);
  });

  it("une invitation au présent n'est pas un moment", () => {
    expect(bondClaimsIn("Publiez votre première annonce, je vous accompagne.")).toEqual([]);
    expect(bondClaimsIn("Vous avez publié votre annonce la semaine dernière.")).toEqual(["annonce"]);
    expect(bondClaimsIn("Vous avez déjà reçu un avis.")).toEqual(["avis"]);
  });

  it("sans liste fournie, aucun contrôle (rétrocompatible)", () => {
    expect(checkOutput("Votre première garde s'est bien passée.", guard())).toEqual([]);
  });
});

describe("A7, moments célébrés", () => {
  const recent = () => computeAlmaBond(base({ ownSits: [{ id: "s9", status: "published", published_at: "2026-10-13T09:00:00Z" }] }));
  const input = (over: Partial<Parameters<typeof planCelebration>[0]> = {}) => ({
    bond: recent(),
    today: TODAY,
    shownKeys: ["stade:eveillee"],
    frequency: "balanced",
    mutedCategories: [],
    sessionUsed: false,
    role: "owner" as const,
    ...over,
  });

  it("un moment récent jamais montré s'accueille avec un bouton utile", () => {
    const plan = planCelebration(input());
    expect(plan.celebrate).toMatchObject({
      ruleKey: "moment:premiere_annonce",
      text: "Votre première annonce est en ligne. Je la note dans notre carnet.",
      action: { label: "Voir mon annonce", href: "/sits/s9" },
    });
  });

  it("un moment déjà montré ne revient pas ; le stade prend la suite", () => {
    const plan = planCelebration(input({ shownKeys: ["stade:eveillee", "moment:premiere_annonce"] }));
    expect(plan.celebrate?.ruleKey).toBe("stade:complice");
    const again = planCelebration(input({ shownKeys: ["stade:eveillee", "stade:complice", "moment:premiere_annonce"] }));
    expect(again.celebrate).toBeNull();
  });

  it("fréquence silent : aucune bulle", () => {
    expect(planCelebration(input({ frequency: "silent" })).celebrate).toBeNull();
  });

  it("catégorie muette ou bulle déjà vue dans la session : aucune bulle", () => {
    expect(planCelebration(input({ mutedCategories: ["alma_moment"] })).celebrate).toBeNull();
    expect(planCelebration(input({ sessionUsed: true })).celebrate).toBeNull();
  });

  it("un moment ancien reste au carnet, le premier relevé de stade se fait sans bulle", () => {
    const old = computeAlmaBond(base({ ownSits: [{ id: "s1", status: "published", published_at: "2026-08-01T09:00:00Z" }] }));
    const plan = planCelebration(input({ bond: old, shownKeys: [] }));
    expect(plan.celebrate).toBeNull();
    expect(plan.recordSilently).toEqual(["stade:complice"]);
  });

  it("la première rencontre ne fait pas de bulle ; la garde réalisée invite à l'avis", () => {
    const b = computeAlmaBond(base({ server: { alma_exchanges: 1, alma_first_at: "2026-10-14T08:00:00Z", first_completed_end: "2026-10-12", first_completed_sit_id: "g1", completed_count: 1 } }));
    const rencontre = b.moments.find((m) => m.key === "premiere_rencontre")!;
    expect(momentCelebration(rencontre, "owner")).toBeNull();
    const realisee = b.moments.find((m) => m.key === "premiere_garde_realisee")!;
    expect(momentCelebration(realisee, "owner")).toMatchObject({ action: { label: "Laisser mon avis", href: "/review/g1" } });
  });

  it("textes : voix d'Alma, sans tiret long, sans formule de centre d'appel ni dépendance", () => {
    const b = computeAlmaBond(base({
      sentApplications: [{ sit_id: "x", status: "accepted", created_at: "2026-10-01T09:00:00Z", sit: { id: "x", status: "completed", start_date: "2026-10-02", end_date: "2026-10-05" } }],
      ownSits: [{ id: "s1", status: "published", published_at: "2026-10-01T09:00:00Z" }],
      missions: [{ id: "m1", status: "open", created_at: "2026-10-02T09:00:00Z" }],
      badges: [{ created_at: "2026-10-03T09:00:00Z" }],
      server: { reviews_received: 1, first_review_at: "2026-10-06T09:00:00Z", first_confirmed_at: "2026-10-01T12:00:00Z", first_confirmed_sit_id: "x" },
    }));
    const texts = [
      ...b.moments.map((m) => m.label),
      ...b.moments.map((m) => momentCelebration(m, "owner")).filter(Boolean).flatMap((c) => [c!.text, c!.action.label]),
      ...(["eveillee", "complice", "fidele"] as const).map((st) => stageCelebration({ ...b, stage: st })!.text),
      b.next!.milestone,
    ];
    for (const t of texts) {
      expect(t).not.toMatch(/[–—]/);
      expect(t).not.toMatch(/n'h[ée]sitez pas|voisin|gratuit|manqu[ée]|seul(e)?\b|toujours là pour vous|rien que (vous|nous)/i);
    }
  });
});

describe("A7, câblage", () => {
  it("migration : une fonction pour soi, réservée aux membres connectés", () => {
    const sql = read("supabase/prepared-migrations/20261014180200_a7_alma_lien.sql");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.my_alma_bond_signals()");
    expect(sql).toContain("v_uid uuid := auth.uid()");
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.my_alma_bond_signals() FROM anon;");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.my_alma_bond_signals() TO authenticated;");
    expect(sql).not.toMatch(/auth\.users|\.email\b|'email'/i);
  });

  it("dock : en-tête du lien, bulle de moment hors silence, lien lu hors du tableau de bord", () => {
    const dock = read("src/components/ai/alma/AlmaDock.tsx");
    expect(dock).toContain("bondLine={bondLine}");
    expect(dock).toContain("useAlmaBond(expanded || !pillHiddenHere)");
    expect(dock).toMatch(/!isSilent && moment\.celebration/);
    expect(dock).toContain('navigate("/alma#carnet")');
    const hook = read("src/hooks/useAlmaMoment.ts");
    expect(hook).toContain('trackEvent("alma_moment_shown"');
    expect(hook).toContain('trackEvent("alma_moment_clicked"');
  });

  it("/alma : carnet pour un membre connecté seulement", () => {
    const page = read("src/pages/AlmaEvolution.tsx");
    expect(page).toContain("useAlmaBond(!!user?.id)");
    expect(page).toContain("{bond && <AlmaCarnet bond={bond} />}");
  });
});
