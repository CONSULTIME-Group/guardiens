import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  ALMA_SITE_KNOWLEDGE,
  ALMA_KNOWLEDGE_EXCLUDED_ROUTES,
  selectKnowledge,
  formatKnowledge,
} from "../../supabase/functions/_shared/alma-site-knowledge";
import {
  buildVerifiedFacts,
  isMoodLineTruthful,
  moodTruthFromFacts,
  type VerifiedFactsInput,
} from "../../supabase/functions/_shared/alma-facts";
import {
  departementOf,
  emptyInventory,
  formatInventory,
  type AlmaInventory,
} from "../../supabase/functions/_shared/alma-inventory";
import {
  applyDraftToAction,
  computeNextAction,
  formatActionDirective,
  type NextActionInput,
} from "../../supabase/functions/_shared/alma-next-action";
import { buildAlmaSystemPrompt } from "../../supabase/functions/_shared/alma-system-prompt";
import { readFormPrefill } from "@/lib/formPrefill";
import { readAlmaAction, readAlmaChips } from "@/lib/alma/conversation-store";
import { applyDeepLinkTarget } from "@/lib/alma/applyDeepLink";
import { howSitWorksStarter, promptStarters } from "@/lib/alma/prompt-starters";

const TODAY = "2026-09-29";
const read = (p: string) => readFileSync(p, "utf8");

/** Routes de App.tsx : chemin et redirection. */
function appRoutes(): Array<{ path: string; redirect: boolean }> {
  const chunks = read("src/App.tsx").split("<Route").slice(1);
  const out: Array<{ path: string; redirect: boolean }> = [];
  for (const c of chunks) {
    const m = c.match(/^\s+path="([^"]+)"/);
    if (!m) continue;
    const firstLine = c.split("\n")[0];
    out.push({ path: m[1], redirect: /element=\{\s*<Navigate|<Redirect[A-Z]\w*|Navigate to=/.test(firstLine) });
  }
  return out;
}

const noFacts = (over: Partial<VerifiedFactsInput> = {}) =>
  buildVerifiedFacts({ role: "sitter", ownSits: [], received: [], sent: [], missions: [], today: TODAY, ...over });

const inv = (over: Partial<AlmaInventory> = {}): AlmaInventory => ({ ...emptyInventory({ postal_code: "77000" }), ...over });

const base = (over: Partial<NextActionInput>): NextActionInput => ({
  facts: noFacts(),
  inventory: inv(),
  accountRole: "sitter",
  activeRole: "sitter",
  question: "Bonjour",
  register: "reassurance",
  completion: 70,
  ...over,
});

describe("J2-A, base de connaissance", () => {
  const routes = appRoutes();
  const all = new Set(routes.map((r) => r.path));
  const described = new Set(ALMA_SITE_KNOWLEDGE.flatMap((e) => [e.path, ...(e.aliases ?? [])]));

  it("chaque chemin décrit existe dans App.tsx", () => {
    expect([...described].filter((p) => !all.has(p))).toEqual([]);
  });

  it("chaque route publique ou membre est décrite ou exclue avec motif", () => {
    const uncovered = routes
      .filter((r) => !r.redirect && !/^\/(admin|test|dev)/.test(r.path))
      .filter((r) => !described.has(r.path) && !ALMA_KNOWLEDGE_EXCLUDED_ROUTES.includes(r.path))
      .map((r) => r.path);
    expect(uncovered).toEqual([]);
  });

  it("couvre les fonctionnalités exigées", () => {
    for (const p of ["/annonces", "/sits/create", "/recherche-gardiens", "/recherche", "/petites-missions", "/petites-missions/creer",
      "/questions/:id", "/projets", "/projets/publier", "/associations", "/gardien-urgence", "/house-guide/:propertyId", "/sits",
      "/mes-avis", "/planche-badges", "/onboarding/affinity", "/mon-secteur", "/ma-periode", "/parrainage", "/annonces/international",
      "/settings", "/messages", "/favoris", "/notifications"]) {
      expect(described.has(p), p).toBe(true);
    }
    expect(ALMA_SITE_KNOWLEDGE.some((e) => e.key === "suppression")).toBe(true);
  });

  it("textes conformes : sans tiret long, sans voisin, sans gratuit, sans garde d'enfants", () => {
    const text = JSON.stringify(ALMA_SITE_KNOWLEDGE);
    expect(text).not.toMatch(/[\u2014\u2013]/);
    expect(text).not.toMatch(/voisin/i);
    expect(text).not.toMatch(/gratuit/i);
    expect(text).not.toMatch(/garde d'enfant/i);
    expect(text).toMatch(/échecs/);
    expect(text).toMatch(/l'échange se fait en temps et en savoir-faire/);
  });

  it("n'envoie que les entrées pertinentes du tour", () => {
    const picked = selectKnowledge({ question: "je cherche un refuge pour être bénévole", role: "sitter" });
    expect(picked[0].path).toBe("/associations");
    expect(picked.length).toBeLessThanOrEqual(6);
    expect(formatKnowledge(picked)).toContain("/associations : ");
    expect(buildAlmaSystemPrompt("reassurance")).toContain("LA CARTE DU SITE");
  });
});

describe("J2-A, inventaire", () => {
  it("déduit le département", () => {
    expect(departementOf({ postal_code: "56100" })).toBe("56");
    expect(departementOf({ postal_code: "77510" })).toBe("77");
    expect(departementOf({ postal_code: "97400" })).toBe("974");
    expect(departementOf({ departement_code: "2a" })).toBe("2A");
    expect(departementOf({})).toBeNull();
  });

  it("vide : invite à lancer la première demande et l'alerte de secteur, sans aucun chiffre de réseau", () => {
    const text = formatInventory(inv());
    expect(text).toContain("/petites-missions/creer");
    expect(text).toContain("/mon-secteur");
    expect(text).not.toMatch(/\d+ (gardiens|membres)/);
  });

  it("nomme les éléments réels avec leur lien", () => {
    const text = formatInventory(inv({ demandes_entraide: [{ titre: "Partie de belote", ville: "Vannes", lien: "/petites-missions/x", id: "x" }] }));
    expect(text).toContain("- Partie de belote, Vannes, /petites-missions/x");
  });

  it("hors de France : /annonces/international", () => {
    expect(formatInventory(emptyInventory({ country: "BE" }))).toContain("/annonces/international");
  });
});

describe("J2-A, faits vérifiés et rôle both", () => {
  it("Véronica (both, rôle propriétaire affiché) : sa candidature du jour est lue", () => {
    const f = buildVerifiedFacts({
      role: "both", today: TODAY, missions: [], received: [],
      ownSits: [{ id: "s1", title: "Mes chats", status: "published", city: "Lyon", start_date: "2026-10-20", end_date: "2026-10-27" }],
      sent: [{ sit_id: "a", status: "pending", created_at: `${TODAY}T09:00:00Z`, sit: { id: "a", title: "Garde à Caluire", status: "published", city: "Caluire", start_date: "2026-11-02", end_date: null } }],
    });
    expect(f.candidatures_envoyees).toEqual({ pending: 1 });
    expect(f.annonces_publiees).toHaveLength(1);
  });

  it("une candidature acceptée sur garde confirmée devient une garde confirmée côté gardien", () => {
    const f = buildVerifiedFacts({
      role: "sitter", today: TODAY, missions: [], received: [], ownSits: [],
      sent: [{ sit_id: "a", status: "accepted", created_at: "2026-09-01T00:00:00Z", sit: { id: "a", title: "T", status: "confirmed", city: "C", start_date: "2026-09-30", end_date: "2026-10-05" } }],
    });
    expect(f.gardes_confirmees).toEqual([{ side: "gardien", sit_id: "a", titre: "T", ville: "C", debut: "2026-09-30", fin: "2026-10-05" }]);
  });
});

describe("J2-A, humeur sans garde confirmée", () => {
  const truth = (input: Partial<VerifiedFactsInput>) => moodTruthFromFacts(noFacts(input), TODAY);

  it("Laëtitia : candidature en discussion pour le 04/12, pas de « garde démarre bientôt »", () => {
    const t = truth({ sent: [{ sit_id: "a", status: "discussing", created_at: "2026-09-20T00:00:00Z", sit: { id: "a", title: "x", status: "published", city: "y", start_date: "2026-12-04", end_date: null } }] });
    expect(isMoodLineTruthful("Votre garde démarre bientôt. Je reste à côté, au cas où.", t)).toBe(false);
  });
  it("membre sans aucune candidature : pas de « garde démarre bientôt »", () => {
    expect(isMoodLineTruthful("Votre garde démarre bientôt. Je reste à côté, au cas où.", truth({}))).toBe(false);
  });
  it("Françoise, aucune candidature : pas de « votre garde commence demain »", () => {
    expect(isMoodLineTruthful("Votre garde commence demain. Je reste concentrée.", truth({}))).toBe(false);
  });
  it("Pascal, gardien : jamais « Votre départ approche », même avec une garde confirmée", () => {
    const t = truth({ sent: [{ sit_id: "a", status: "accepted", created_at: "2026-09-01T00:00:00Z", sit: { id: "a", title: "x", status: "confirmed", city: "y", start_date: "2026-09-30", end_date: "2026-10-02" } }] });
    expect(isMoodLineTruthful("Votre départ approche. Je regarde ce qui reste à caler, à votre rythme.", t)).toBe(false);
  });
  it("propriétaire avec garde confirmée demain : la phrase est vraie ; un décor reste toujours permis", () => {
    const t = truth({ role: "owner", ownSits: [{ id: "s", title: "x", status: "confirmed", city: "y", start_date: "2026-09-30", end_date: "2026-10-03" }] });
    expect(isMoodLineTruthful("Votre garde commence demain. Je reste concentrée.", t)).toBe(true);
    expect(isMoodLineTruthful("Votre départ approche. Je regarde ce qui reste à caler, à votre rythme.", t)).toBe(true);
    expect(isMoodLineTruthful("Ma balle est sous le canapé. Le canapé a gagné.", truth({}))).toBe(true);
  });
  it("le serveur réserve l'humeur à la petite conversation et vérifie la phrase", () => {
    const src = read("supabase/functions/alma-chat/index.ts");
    expect(src).toContain("isMoodLineTruthful(moodLine, moodTruthFromFacts(facts!, todayIso))");
    expect(src).toContain('register === "perso" || isSmallTalk(message)');
    expect(read("src/hooks/useAlmaMood.ts")).toContain("isMoodLineTruthful(picked.content, truth)");
  });
});

describe("J2-A, moteur de prochaine action", () => {
  it("Jean Pierre (both, 15 chevaux, cherche de l'aide) : publier sa garde, jamais le profil", () => {
    const r = computeNextAction(base({
      accountRole: "both", activeRole: "sitter", helpIntent: true, largeAnimals: true, completion: 20,
      question: "je ne pose pas ma candidature je cherche au contraire de l'aide ! j'ai 15 chevaux et poneys",
    }));
    expect(r.action?.path).toBe(`/sits/create?titre=${encodeURIComponent("Garde de mes chevaux et poneys")}`);
    expect([r.action, ...r.chips].some((c) => c?.path?.includes("profile"))).toBe(false);
  });

  it("Véronica (both, propriétaire affiché, candidatures reçues non ouvertes) : les lire", () => {
    const facts = buildVerifiedFacts({
      role: "both", today: TODAY, missions: [],
      ownSits: [{ id: "s1", title: "Mes chats", status: "published", city: "Lyon", start_date: "2026-10-20", end_date: null }],
      received: [{ sit_id: "s1", status: "pending", viewed_at: null, created_at: `${TODAY}T08:00:00Z` }],
      sent: [{ sit_id: "a", status: "pending", created_at: `${TODAY}T09:00:00Z`, sit: null }],
    });
    const r = computeNextAction(base({ facts, accountRole: "both", activeRole: "owner" }));
    expect(r.action).toMatchObject({ path: "/sits", reason: "candidatures_non_ouvertes" });
  });

  it("Jacqueline en Bretagne (propriétaire, 56) : répondre à la demande d'entraide proche, sans score", () => {
    const r = computeNextAction(base({
      accountRole: "owner", activeRole: "owner", completion: 55,
      inventory: { ...emptyInventory({ postal_code: "56000" }), demandes_entraide: [{ titre: "Partie de Scrabble", ville: "Vannes", lien: "/petites-missions/m1", id: "m1" }] },
    }));
    expect(r.action).toMatchObject({ path: "/petites-missions/m1", reason: "entraide_proche" });
    expect(r.action?.label).toContain("Partie de Scrabble");
  });

  it("gardien sans candidature, garde proche : la nommer et y postuler", () => {
    const r = computeNextAction(base({ inventory: inv({ gardes: [{ titre: "Deux chats à Melun", ville: "Melun", lien: "/annonces/deux-chats", id: "sit-1" }] }) }));
    expect(r.action).toEqual({ label: "Postuler : Deux chats à Melun", path: "/sits/sit-1?postuler=1", reason: "annonce_proche" });
  });

  it("gardien sans rien de proche : alerte de secteur", () => {
    expect(computeNextAction(base({})).action).toMatchObject({ path: "/mon-secteur" });
  });

  it("gardien, candidature sans réponse depuis 10 jours : une autre annonce proche nommée", () => {
    const facts = noFacts({ sent: [{ sit_id: "old", status: "pending", created_at: "2026-09-19T00:00:00Z", sit: null }] });
    const r = computeNextAction(base({ facts, inventory: inv({ gardes: [{ titre: "Chien à Provins", ville: "Provins", lien: "/annonces/p", id: "p1" }] }) }));
    expect(r.action?.reason).toBe("candidature_sans_reponse");
  });

  it("membre hors de France : annonces à l'international", () => {
    const r = computeNextAction(base({ inventory: emptyInventory({ country: "CH" }) }));
    expect(r.action?.path).toBe("/annonces/international");
  });

  it("propriétaire avec brouillon : le publier", () => {
    const facts = noFacts({ role: "owner", ownSits: [{ id: "d1", title: "Noël avec Moka", status: "draft", city: null, start_date: null, end_date: null }] });
    const r = computeNextAction(base({ facts, accountRole: "owner", activeRole: "owner" }));
    expect(r.action).toMatchObject({ path: "/sits/create?draftId=d1", reason: "brouillon" });
  });

  it("« Bonjour » : jamais le profil en action, même à 55 %", () => {
    const r = computeNextAction(base({ accountRole: "owner", activeRole: "owner", completion: 55 }));
    expect(r.action?.path).not.toMatch(/profile/);
    expect(r.chips.some((c) => c.path?.includes("profile"))).toBe(false);
  });

  it("profil : sur demande, en action principale ; sous 40 %, une seule fois par conversation", () => {
    expect(computeNextAction(base({ question: "Qu'est-ce qui manque à mon profil ?" })).action?.path).toBe("/profile");
    const low = computeNextAction(base({ accountRole: "owner", activeRole: "owner", completion: 30 }));
    expect(low.action?.path).not.toBe("/owner-profile");
    const already = computeNextAction(base({ question: "Qu'est-ce qui manque", completion: 30, profileAlreadySuggested: true, accountRole: "owner", activeRole: "owner" }));
    expect(already.chips.some((c) => c.path === "/owner-profile")).toBe(false);
  });

  it("question sur Alma : aucune action ; sujet sensible : l'action vient après", () => {
    expect(computeNextAction(base({ register: "perso", question: "d'où tu viens ?" })).action).toBeNull();
    const s = computeNextAction(base({ register: "sensible", question: "mon chien est malade" }));
    expect(s.placement).toBe("after");
    expect(formatActionDirective(s)).toContain("Réponds d'abord");
  });

  it("sur une fiche d'annonce, « Je postule » ouvre le formulaire ; « Comment se passe une garde » suit le rôle", () => {
    const r = computeNextAction(base({ pagePath: "/sits/abc" }));
    expect(r.chips[0]).toEqual({ label: "Je postule", path: "/sits/abc?postuler=1" });
    expect(r.chips.length).toBeLessThanOrEqual(3);
    expect(r.chips.find((c) => c.prompt)?.prompt).toBe("Comment se passe une garde, côté gardien ?");
    const owner = computeNextAction(base({ activeRole: "owner", accountRole: "owner" }));
    expect(owner.chips.find((c) => c.prompt)?.prompt).toBe("Comment se passe une garde, côté propriétaire ?");
    expect(JSON.stringify([r, owner])).not.toMatch(/Je m'en occupe|Accompagnez moi/);
  });

  it("Alma rédige : la ligne BROUILLON préremplit le formulaire et sort du texte", () => {
    const out = applyDraftToAction(
      "Je vous propose ce titre.\nBROUILLON: Une belote le jeudi | Deux joueurs du coin pour une belote au café.",
      { label: "Demander un coup de main", path: "/petites-missions/creer?titre=x", reason: "entraide_premiere" },
    );
    expect(out.answer).toBe("Je vous propose ce titre.");
    const params = new URLSearchParams(out.action!.path.split("?")[1]);
    expect(params.get("titre")).toBe("Une belote le jeudi");
    expect(params.get("description")).toBe("Deux joueurs du coin pour une belote au café.");
    const other = applyDraftToAction("Texte\nBROUILLON: A b c | d", { label: "x", path: "/mon-secteur", reason: "r" });
    expect(other.action?.path).toBe("/mon-secteur");
    expect(other.answer).toBe("Texte");
  });
});

describe("J2-A, préremplissage des trois formulaires", () => {
  it("nettoie et plafonne", () => {
    const p = new URLSearchParams({ titre: "  <b>une   belote</b> — jeudi  ", description: "a".repeat(1500), categorie: "jardin" });
    const r = readFormPrefill(p, { titleMax: 100, descriptionMax: 1000, categories: ["jardin", "autre"] });
    expect(r.title).toBe("Une belote , jeudi");
    expect(r.description).toHaveLength(1000);
    expect(r.category).toBe("jardin");
    expect(readFormPrefill(new URLSearchParams({ categorie: "argent" }), { titleMax: 10, descriptionMax: 10, categories: ["jardin"] }).category).toBeNull();
    expect(readFormPrefill(new URLSearchParams({ titre: "x".repeat(300) }), { titleMax: 100, descriptionMax: 10 }).title).toHaveLength(100);
  });

  it("les trois formulaires lisent titre et description", () => {
    expect(read("src/pages/CreateSmallMission.tsx")).toContain("readFormPrefill(searchParams, { titleMax: MAX_TITLE_LEN");
    expect(read("src/pages/CreateSmallMission.tsx")).toContain("useState(() => prefill.description)");
    expect(read("src/pages/CreateSit.tsx")).toContain("readFormPrefill(searchParams, { titleMax: MAX_TITLE_LENGTH");
    const projet = read("src/pages/CreateProjet.tsx");
    expect(projet).toContain("categories: PROJET_NATURE_VALUES");
    expect(projet).toContain("useState<Record<string, string>>({})"); // déclarations jamais préremplies
  });

  it("le lien « Je postule » suit la logique du bouton", () => {
    const b = { param: "1", acceptingApplications: true, accessLevel: 2, hasApplied: false, canApplyGuards: true };
    expect(applyDeepLinkTarget(b)).toBe("apply");
    expect(applyDeepLinkTarget({ ...b, accessLevel: 1 })).toBe("completion");
    expect(applyDeepLinkTarget({ ...b, hasApplied: true })).toBeNull();
    expect(applyDeepLinkTarget({ ...b, param: null })).toBeNull();
    expect(read("src/components/sits/views/SitterSitView.tsx")).toContain('searchParams.get("postuler")');
  });
});

describe("J2-A, rétrocompatibilité de la réponse", () => {
  it("action et chips sont optionnels, et seuls les chemins internes passent", () => {
    expect(readAlmaAction(undefined)).toBeUndefined();
    expect(readAlmaAction({ label: "x", path: "https://ailleurs.example" })).toBeUndefined();
    expect(readAlmaAction({ label: "x", path: "//ailleurs.example" })).toBeUndefined();
    expect(readAlmaAction({ label: "Voir", path: "/annonces" })).toEqual({ label: "Voir", path: "/annonces" });
    expect(readAlmaChips([{ label: "a", path: "/a" }, { label: "b", prompt: "b ?" }, { label: "c" }, { label: "d", path: "/d" }, { label: "e", path: "/e" }])).toHaveLength(3);
    expect(readAlmaChips("x")).toBeUndefined();
  });

  it("le serveur garde answer et remaining, ajoute action et chips seulement s'ils existent", () => {
    const src = read("supabase/functions/alma-chat/index.ts");
    expect(src).toContain("answer,\n      remaining:");
    expect(src).toContain("...(action ? { action: { label: action.label, path: action.path } } : {})");
    expect(src).toContain("...(next && next.chips.length ? { chips: next.chips } : {})");
  });

  it("amorces : version du rôle", () => {
    expect(howSitWorksStarter("sitter")).toBe("Comment se passe une garde, côté gardien ?");
    expect(promptStarters("other", { activeRole: "owner" })[0]).toBe("Comment se passe une garde, côté propriétaire ?");
    expect(promptStarters("other")[0]).toBe("Comment se passe une garde ?");
  });
});

describe("J2-C, relecture des descriptions", () => {
  const byKey = (k: string) => ALMA_SITE_KNOWLEDGE.find((e) => e.key === k)!;
  it("parrainage et abonnement sans prix ni bascule tarifaire", () => {
    expect(byKey("parrainage").purpose).toBe("Lien personnel pour inviter des proches et des gens du coin à rejoindre Guardiens.");
    expect(byKey("abonnement").purpose).toBe("État de l'accès gardien du compte.");
  });
  it("identité affirmative", () => {
    expect(byKey("identite").purpose).toBe("Réglages du compte, préférences d'email et vérification d'identité, qui ajoute l'écusson Identité vérifiée sur le profil.");
  });
  it("suppression alignée sur le code : immédiate", () => {
    expect(byKey("suppression").purpose).toContain("immédiate et irréversible");
    expect(byKey("suppression").purpose).not.toContain("30 jours");
  });
  it("écussons : planche membre liée depuis la grille du profil", () => {
    expect(byKey("ecussons").path).toBe("/planche-badges");
    expect(readFileSync("src/components/badges/BadgeGridSection.tsx", "utf8")).toContain('to="/planche-badges"');
  });
  it("aucune formulation proscrite dans descriptions et amorces", () => {
    for (const e of ALMA_SITE_KNOWLEDGE) {
      const t = `${e.purpose} ${e.opener ?? ""}`;
      expect(t, e.key).not.toMatch(/gratuit|voisin|enfant|payant|\u2014|\u2013/i);
      expect(t, e.key).not.toMatch(/\b(ne|n')\s?\S+\s(pas|plus|jamais)\b|\baucune?\b/i);
    }
  });
});
