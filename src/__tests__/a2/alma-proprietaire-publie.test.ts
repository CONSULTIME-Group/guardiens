/**
 * Lot A2 (audit Alma en arène du 14/10/2026) : le propriétaire publie d'abord.
 * Recette : publication en tête pour le propriétaire sans annonce, repli
 * d'entraide sur intention seulement, international réservé au gardien,
 * candidatures en attente selon la règle X3a, carte du site (espaces, emails
 * et alertes, savoir-faire), relances avec bouton lu en base, aperçu seul.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { ALMA_SITE_KNOWLEDGE, selectKnowledge } from "../../../supabase/functions/_shared/alma-site-knowledge";
import { buildVerifiedFacts, moodTruthFromFacts, type VerifiedFactsInput } from "../../../supabase/functions/_shared/alma-facts";
import { emptyInventory, type AlmaInventory } from "../../../supabase/functions/_shared/alma-inventory";
import { computeNextAction, type NextActionInput } from "../../../supabase/functions/_shared/alma-next-action";
import { detectRegister } from "../../../supabase/functions/_shared/alma-system-prompt";
import { detectAlmaIntent, almaHelpDirective } from "../../../supabase/functions/_shared/alma-intent";
import { summarizeAwaiting as summarizeFn } from "../../../supabase/functions/_shared/applications-awaiting";
import { ALMA_PAGE_LABELS, almaPageLabel } from "../../../supabase/functions/_shared/alma-page-labels";
import { summarizeAwaiting as summarizeSite, sitStatusMap } from "@/lib/applicationsAwaiting";
import { pickAlmaRail } from "@/lib/almaRailPhrase";
import { ALMA_CTA_ACTION_TO_URL, resolveAlmaCtaHref } from "@/lib/alma/cta-actions";
import { decideWhisperArrival } from "@/lib/alma/whisperArrival";
import { buildUsageNudgeWhisper } from "@/lib/alma/whisper-triggers";

const TODAY = "2026-10-14";
const read = (p: string) => readFileSync(p, "utf8");

const facts = (over: Partial<VerifiedFactsInput> = {}) =>
  buildVerifiedFacts({ role: "owner", ownSits: [], received: [], sent: [], missions: [], today: TODAY, ...over });
const inv = (over: Partial<AlmaInventory> = {}): AlmaInventory => ({ ...emptyInventory({ postal_code: "69005" }), ...over });

/** Entrée de computeNextAction telle que alma-chat la construit pour une question. */
const ask = (question: string, over: Partial<NextActionInput> = {}): NextActionInput => {
  const intent = detectAlmaIntent(question, []);
  return {
    facts: facts(),
    inventory: inv(),
    accountRole: "owner",
    activeRole: "owner",
    question,
    register: detectRegister(question),
    helpIntent: Boolean(almaHelpDirective(intent)),
    largeAnimals: Boolean((intent as any).largeAnimals),
    completion: 70,
    today: TODAY,
    foreignOpen: true,
    ...over,
  };
};

const allPaths = (r: ReturnType<typeof computeNextAction>) =>
  [r.action?.path, ...r.chips.map((c) => c.path)].filter((p): p is string => Boolean(p));

describe("A2, le propriétaire sans annonce publie d'abord", () => {
  it.each(["Je prépare mon annonce", "Comment ça marche ?", "Bonjour"])("« %s » : intention_garde en premier, vers /sits/create", (q) => {
    const r = computeNextAction(ask(q));
    expect(r.action?.reason).toBe("intention_garde");
    expect(r.action?.label).toBe("Publier mon annonce de garde");
    expect(r.action?.path.startsWith("/sits/create?titre=")).toBe(true);
  });

  it("« annuler les alertes mail » : la publication reste en tête pour le propriétaire sans annonce", () => {
    expect(computeNextAction(ask("annuler les alertes mail")).action?.reason).toBe("intention_garde");
  });

  it("un brouillon passe devant : le publier, sans seconde annonce", () => {
    const f = facts({ ownSits: [{ id: "d1", title: "Mes chats", status: "draft", city: "Lyon", start_date: "2026-12-20", end_date: "2026-12-30" }] });
    const r = computeNextAction(ask("Bonjour", { facts: f }));
    expect(r.action?.reason).toBe("brouillon");
    expect(allPaths(r).some((p) => p.startsWith("/sits/create?titre="))).toBe(false);
  });

  it("une annonce publiée : aucune proposition de nouvelle annonce sans départ annoncé", () => {
    const f = facts({ ownSits: [{ id: "s1", title: "Mes chats", status: "published", city: "Lyon", start_date: "2026-12-20", end_date: "2026-12-30" }] });
    const r = computeNextAction(ask("Bonjour", { facts: f }));
    expect(allPaths(r).some((p) => p.startsWith("/sits/create"))).toBe(false);
  });

  it("une garde confirmée côté propriétaire : aucune nouvelle annonce d'office", () => {
    const f = facts({ ownSits: [{ id: "c1", title: "Mes chats", status: "confirmed", city: "Lyon", start_date: "2026-10-20", end_date: "2026-10-30" }] });
    const r = computeNextAction(ask("Bonjour", { facts: f }));
    expect(allPaths(r).some((p) => p.startsWith("/sits/create"))).toBe(false);
  });

  it("un double rôle en espace gardien ne reçoit la publication que s'il parle de départ", () => {
    const quiet = computeNextAction(ask("Bonjour", { accountRole: "both", activeRole: "sitter" }));
    expect(quiet.action?.reason).not.toBe("intention_garde");
    const leaving = computeNextAction(ask("Je pars en vacances à Noël", { accountRole: "both", activeRole: "sitter" }));
    expect(allPaths(leaving).some((p) => p.startsWith("/sits/create"))).toBe(true);
  });

  it("une intention de gardien n'appelle aucune action propriétaire", () => {
    const r = computeNextAction(ask("Je cherche une garde", { accountRole: "both", activeRole: "owner", sitterIntent: true }));
    expect(allPaths(r).some((p) => p.startsWith("/sits/create"))).toBe(false);
  });
});

describe("A2, entraide_premiere sur intention d'aide seulement", () => {
  it("un propriétaire sans intention d'aide n'a plus entraide_premiere", () => {
    for (const q of ["Bonjour", "Comment ça marche ?", "Je prépare mon annonce"]) {
      const r = computeNextAction(ask(q));
      expect([r.action?.path, ...r.chips.map((c) => c.path)].some((p) => p?.startsWith("/petites-missions/creer"))).toBe(false);
    }
  });

  it("des mots d'entraide gardent le repli « Demander un coup de main »", () => {
    const r = computeNextAction(ask("Je cherche quelqu'un pour une partie de scrabble"));
    expect(allPaths(r).some((p) => p.startsWith("/petites-missions/creer"))).toBe(true);
  });

  it("une intention d'aide garde le coup de main", () => {
    const r = computeNextAction(ask("Bonjour", { helpIntent: true }));
    expect(allPaths(r).some((p) => p.startsWith("/petites-missions/creer"))).toBe(true);
  });

  it("une demande d'entraide proche reste proposée", () => {
    const r = computeNextAction(ask("Bonjour", { inventory: inv({ demandes_entraide: [{ titre: "Partie de belote", ville: "Lyon", lien: "/petites-missions/m1", id: "m1" }] }) }));
    expect(r.chips.some((c) => c.path === "/petites-missions/m1")).toBe(true);
  });
});

describe("A2, international réservé au côté gardien", () => {
  it("un gardien hors de France garde l'action internationale", () => {
    const r = computeNextAction(ask("Bonjour", { accountRole: "sitter", activeRole: "sitter", facts: facts({ role: "sitter" }), inventory: emptyInventory({ country: "CH" }) }));
    expect(r.action?.path).toBe("/annonces/international");
  });

  it("un propriétaire hors de France ou qui parle d'étranger n'a pas l'action internationale", () => {
    for (const r of [
      computeNextAction(ask("Bonjour", { inventory: emptyInventory({ country: "CH" }) })),
      computeNextAction(ask("Je pars à l'étranger cet hiver")),
    ]) {
      expect(allPaths(r)).not.toContain("/annonces/international");
    }
  });
});

describe("A2, candidatures reçues selon la règle X3a", () => {
  const ownSits = [
    { id: "s1", title: "Chats", status: "published", city: "Lyon", start_date: "2026-11-01", end_date: null },
    { id: "s2", title: "Chien", status: "published", city: "Lyon", start_date: "2026-12-01", end_date: null },
    { id: "s3", title: "Ancienne", status: "expired", city: "Lyon", start_date: "2026-09-01", end_date: null },
  ];
  const received = [
    { id: "a1", sit_id: "s1", status: "discussing", viewed_at: "2026-10-02T09:00:00Z", created_at: "2026-10-02T08:00:00Z" },
    { id: "a2", sit_id: "s2", status: "viewed", viewed_at: "2026-09-29T09:00:00Z", created_at: "2026-09-28T08:00:00Z" },
    { id: "a3", sit_id: "s3", status: "pending", viewed_at: null, created_at: "2026-08-01T08:00:00Z" },
    { id: "a4", sit_id: "s1", status: "declined", viewed_at: "2026-09-20T09:00:00Z", created_at: "2026-09-01T08:00:00Z" },
  ];

  it("vues ou en discussion comptent, annonce close écartée, plus ancienne désignée", () => {
    const f = facts({ ownSits, received });
    expect(f.candidatures_en_attente).toEqual({ nombre: 2, nouvelles: 0, plus_ancienne_annonce: "s2", plus_ancienne_jours: 16 });
    expect(moodTruthFromFacts(f, TODAY).receivedPending).toBe(true);
  });

  it("« Lire les candidatures reçues » mène à /sits/<annonce de la plus ancienne>#candidatures", () => {
    const r = computeNextAction(ask("Bonjour", { facts: facts({ ownSits, received }) }));
    expect(r.action).toEqual({ label: "Lire les candidatures reçues", path: "/sits/s2#candidatures", reason: "candidatures_en_attente" });
  });

  it("la copie côté fonctions rend le même résumé que src/lib/applicationsAwaiting", () => {
    const now = new Date(`${TODAY}T12:00:00Z`);
    const apps = received.map((a) => ({ id: a.id, sit_id: a.sit_id, status: a.status, created_at: a.created_at }));
    const map = sitStatusMap(ownSits);
    expect(summarizeFn(apps, map, now)).toEqual(summarizeSite(apps, map, now));
    expect(summarizeFn(apps, null, now)).toEqual(summarizeSite(apps, null, now));
  });

  it("alma-chat lit l'identifiant des candidatures et compte l'attente X3a dans le dossier", () => {
    const facts = read("supabase/functions/_shared/alma-facts.ts");
    expect(facts).toContain('select("id, sit_id, status, viewed_at, created_at")');
    const chat = read("supabase/functions/alma-chat/index.ts");
    expect(chat).not.toContain('mine.filter((a) => a.status === "pending").length');
    expect(chat).toContain("candidatures_en_attente: summarizeAwaiting(");
    expect(read("supabase/functions/_shared/applications-awaiting.ts")).not.toMatch(/from ["'](@\/|\.\.\/\.\.\/\.\.\/src)/);
  });
});

describe("A2, aucun chemin d'action avec ?tab=", () => {
  it("moteur, carte, relances et rail", () => {
    const cases: NextActionInput[] = [
      ask("Bonjour"),
      ask("Bonjour", { accountRole: "sitter", activeRole: "sitter", facts: facts({ role: "sitter" }) }),
      ask("Qu'est-ce qui manque à mon profil ?", { accountRole: "sitter", activeRole: "sitter", facts: facts({ role: "sitter" }) }),
      ask("Je pars en vacances", { helpIntent: true }),
    ];
    for (const c of cases) for (const p of allPaths(computeNextAction(c))) expect(p).not.toMatch(/[?&]tab=/);
    for (const e of ALMA_SITE_KNOWLEDGE) for (const p of [e.path, ...(e.aliases ?? [])]) expect(p).not.toMatch(/[?&]tab=/);
    for (const url of Object.values(ALMA_CTA_ACTION_TO_URL)) expect(url).not.toMatch(/[?&]tab=/);
  });

  it("browse_sits vers /annonces, view_applications vers /sits", () => {
    expect(resolveAlmaCtaHref("browse_sits")).toBe("/annonces");
    expect(resolveAlmaCtaHref("view_applications")).toBe("/sits");
    expect(resolveAlmaCtaHref("none")).toBeNull();
  });
});

describe("A2, carte du site", () => {
  const top = (question: string, role: "owner" | "sitter" = "owner") => selectKnowledge({ question, role })[0]?.key;

  it("« annuler les alertes mail » sélectionne emails_alertes (réponse fausse du 12/10)", () => {
    expect(top("annuler les alertes mail")).toBe("emails_alertes");
    expect(top("Comment arrêter les alertes par email ?", "sitter")).toBe("emails_alertes");
    const entry = ALMA_SITE_KNOWLEDGE.find((e) => e.key === "emails_alertes")!;
    expect([entry.path, ...(entry.aliases ?? [])]).toEqual(["/settings?section=alerts", "/settings?section=notifications"]);
  });

  it("« retirer mon espace gardien » sélectionne mes_espaces (réponse fausse du 09/10)", () => {
    expect(top("retirer mon espace gardien", "sitter")).toBe("mes_espaces");
    expect(top("Comment ajouter un espace propriétaire ?", "sitter")).toBe("mes_espaces");
    const entry = ALMA_SITE_KNOWLEDGE.find((e) => e.key === "mes_espaces")!;
    expect(entry.path).toBe("/settings?section=spaces");
    expect(entry.purpose).toMatch(/annonces, gardes et candidatures en cours/);
  });

  it("savoir-faire décrit, vers /profile?section=savoir-faire", () => {
    expect(top("Où remplir mes savoir-faire ?")).toBe("savoir_faire");
    expect(ALMA_SITE_KNOWLEDGE.find((e) => e.key === "savoir_faire")!.path).toBe("/profile?section=savoir-faire");
  });

  it("les rubriques visées existent dans les pages", () => {
    const settings = read("src/pages/Settings.tsx");
    for (const id of ["spaces", "alerts", "notifications"]) expect(settings).toContain(`id: "${id}"`);
    expect(settings).toContain('searchParams.get("section")');
    expect(read("src/pages/SitterProfile.tsx")).toContain('"savoir-faire": "skills"');
    expect(read("src/pages/OwnerProfile.tsx")).toContain('"savoir-faire": "skills"');
  });

  it("chaque rubrique porte un libellé de page, la rubrique exacte d'abord", () => {
    expect(almaPageLabel("/settings?section=spaces")).toBe("Mes espaces");
    expect(almaPageLabel("/settings?section=alerts")).toBe("Alertes annonces");
    expect(almaPageLabel("/settings?section=notifications")).toBe("Notifications email");
    expect(almaPageLabel("/profile?section=savoir-faire")).toBe("Mes savoir-faire");
    expect(almaPageLabel("/settings?section=security")).toBe("Réglages");
    for (const e of ALMA_SITE_KNOWLEDGE.filter((x) => ["mes_espaces", "emails_alertes", "savoir_faire"].includes(x.key))) {
      for (const p of [e.path, ...(e.aliases ?? [])]) expect(ALMA_PAGE_LABELS[p], p).toBeTruthy();
    }
  });

  it("textes conformes : sans tiret long, sans « voisin », sans « gratuit »", () => {
    const text = JSON.stringify(ALMA_SITE_KNOWLEDGE.filter((e) => ["mes_espaces", "emails_alertes", "savoir_faire"].includes(e.key)));
    expect(text).not.toMatch(/[—–]/);
    expect(text).not.toMatch(/voisin|gratuit|impossible/i);
  });
});

describe("A2, rail d'Alma côté propriétaire", () => {
  const owner = (s: Partial<{ ongoingSit: boolean; pendingApps: boolean; noActiveSit: boolean; oldestAwaitingSitId: string | null }>) => ({
    ongoingSit: false, pendingApps: false, noActiveSit: false, ...s,
  });

  it("noActiveSit : action vers /sits/create", () => {
    const r = pickAlmaRail({ variant: "owner", hidden: false, ownerState: owner({ noActiveSit: true }) });
    expect(r.action).toEqual({ id: "publier_annonce", label: "Publier mon annonce de garde", href: "/sits/create" });
  });

  it("candidatures en attente : la plus ancienne", () => {
    expect(pickAlmaRail({ variant: "owner", hidden: false, ownerState: owner({ pendingApps: true, oldestAwaitingSitId: "s9" }) }).action?.href).toBe("/sits/s9#candidatures");
    expect(pickAlmaRail({ variant: "owner", hidden: false, ownerState: owner({ pendingApps: true }) }).action?.href).toBe("/sits");
  });

  it("garde en cours ou Alma masquée : aucun lien", () => {
    expect(pickAlmaRail({ variant: "owner", hidden: false, ownerState: owner({ ongoingSit: true, noActiveSit: true }) }).action).toBeNull();
    expect(pickAlmaRail({ variant: "owner", hidden: true, ownerState: owner({ noActiveSit: true }) }).action).toBeNull();
  });

  it("le tableau de bord transmet l'annonce de la plus ancienne candidature", () => {
    expect(read("src/components/dashboard/OwnerDashboard.tsx")).toContain("oldestAwaitingSitId: awaiting.oldest?.sitId ?? null");
  });
});

describe("A2, relances d'Alma", () => {
  it("le bouton de la relance vient de la base", () => {
    const hook = read("src/hooks/useAlmaCulturalFact.ts");
    expect(hook).toContain("cta_label: fact.cta_label ?? null");
    expect(hook).toContain("cta_action: fact.cta_action ?? null");
    const w = buildUsageNudgeWhisper({ payload: { id: "f1", type: "usage_nudge", content: "Texte", cta_label: "Voir les gardiens", cta_action: "browse_sitters" }, audience: "owner", surface: "owner_dashboard" });
    expect(w.primaryAction?.label).toBe("Voir les gardiens");
    expect((w.metadata as any).cta_action).toBe("browse_sitters");
    const none = buildUsageNudgeWhisper({ payload: { id: "f2", type: "usage_nudge", content: "Texte", cta_label: "Découvrir", cta_action: "none" }, audience: "owner", surface: "owner_dashboard" });
    expect(none.primaryAction).toBeUndefined();
  });

  it("la fonction en base renvoie cta_label et cta_action (migration préparée)", () => {
    const sql = read("supabase/prepared-migrations/20261014180000_a2_alma_relance_bouton.sql");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.get_alma_cultural_fact(");
    expect(sql).toContain("'cta_label', v_row.cta_label");
    expect(sql).toContain("'cta_action', v_row.cta_action");
    expect(sql).toContain("(coalesce(f.target_role, 'any') IN ('any', 'both') OR f.target_role = v_target)");
  });

  it("le clic est mesuré par alma_whisper_action_clicked, avec le fait d'origine", () => {
    const dock = read("src/components/ai/alma/AlmaDock.tsx");
    expect(dock).toContain('trackEvent("alma_whisper_action_clicked", {');
    expect(dock).toContain("fact_id: (whisper.metadata as any)?.fact_id ?? null");
  });

  it("une relance d'usage s'affiche en aperçu seul sur ordinateur, les autres whispers inchangés", () => {
    const desk = { isMobile: false, pathname: "/sits", spontaneousAlreadyUsed: false, formFieldFocused: false };
    expect(decideWhisperArrival({ ...desk, whisperType: "usage_nudge" })).toBe("peek");
    expect(decideWhisperArrival({ ...desk, whisperType: "cultural_fact" })).toBe("open_spontaneous");
    expect(decideWhisperArrival({ ...desk, whisperType: "usage_nudge", formFieldFocused: true })).toBe("badge_only");
    expect(decideWhisperArrival({ ...desk, isMobile: true, pathname: "/dashboard", whisperType: "usage_nudge" })).toBe("badge_only");
    expect(read("src/components/ai/alma/AlmaDock.tsx")).toContain("whisperType: currentWhisper.type");
  });

  it("l'ouverture volontaire reste intacte", () => {
    const dock = read("src/components/ai/alma/AlmaDock.tsx");
    expect(dock).toContain("window.addEventListener(ALMA_OPEN_DOCK_EVENT, onOpen)");
    expect(dock).toContain('onClick={(e) => openPanel("peek", e.currentTarget)}');
  });
});
