import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  buildNoelV3EmailData,
  cleanPetName,
  frRange,
  isOwnNoelPhotoPath,
  isWellFormedNoelToken,
  NOEL_EMAIL_GROUP,
  NOEL_V3_PROOF,
  NOEL_V3_RELANCE_SUBJECTS,
  NOEL_V3_SUBJECTS,
  NOEL_V3_TEMPLATES,
  noelDraftText,
  noelDraftTitle,
  noelPhotoPath,
  noelTokenState,
  noelV3Variant,
  petNamesLabel,
  propertyPhrase,
  validNoelDates,
} from "../../../supabase/functions/_shared/owner-noel-v3.ts";
import {
  noelV3TemplateFor,
  relanceTargets,
  relanceTooEarly,
  splitNoelV3Audience,
} from "../../../supabase/functions/_shared/owner-noel-v3-audience.ts";
import { isOwnerV2Holdout } from "../../../supabase/functions/_shared/owner-departure-logic.ts";
import { excludeNoelV3Recipients, isNoelPeriodKey } from "../../../supabase/functions/send-seasonal-nurture/cohort.ts";
import { nextStep, photoExt, publishHref, readyNearbyLine, stepLabel } from "@/lib/annonceNoel";

// Verrous du lot V1 « Email de Noël v3 » (14/10/2026) : un email, un geste.

const ROOT = resolve(__dirname, "../../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");
const FN = "supabase/functions";
const TPL = `${FN}/_shared/transactional-email-templates`;
const MIGRATION = "supabase/prepared-migrations/20261014170000_v1_noel_v3.sql";
const TOKEN = "a".repeat(64);

const firstIds = (pred: (id: string) => boolean, n: number) => {
  const out: string[] = [];
  for (let i = 0; out.length < n && i < 5000; i++) {
    const id = `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
    if (pred(id)) out.push(id);
  }
  return out;
};

describe("V1.1 Trois variantes selon ce qui manque", () => {
  it("logement sans logement, photo sans photo, prête sinon", () => {
    expect(noelV3Variant({ hasProperty: false, photoCount: 3 })).toBe("logement");
    expect(noelV3Variant({ hasProperty: true, photoCount: 0 })).toBe("photo");
    expect(noelV3Variant({ hasProperty: true, photoCount: 1 })).toBe("pret");
  });

  it("données par destinataire : jeton, variante, titre, dates", () => {
    const d = buildNoelV3EmailData({
      firstName: " Camille ", city: "Draveil", propertyType: "house", hasProperty: true,
      petNames: ["mila"], photoCount: 2, photoUrl: "https://x.supabase.co/p.jpg", token: TOKEN,
      periodUrl: "https://guardiens.fr/ma-periode/b", nearby: { count: 90, label: "90 gardiens à moins de 50 km de Draveil", faces: [{ id: "1", firstName: "Tom" }] },
    });
    expect(d.variant).toBe("pret");
    expect(d.firstName).toBe("Camille");
    expect(d.pageUrl).toContain(`/annonce-noel/${TOKEN}?`);
    expect(d.pageUrl).toContain("utm_campaign=owner_noel_v3");
    expect(d.pageUrl).toContain("&v=pret");
    expect(d.propertyLabel).toBe("votre maison à Draveil");
    expect(d.petNames).toEqual(["Mila"]);
    expect(d.draftTitle).toBe("Garde de Mila pendant les fêtes, à Draveil");
    expect(d.datesLabel).toBe("Du 19 décembre au 3 janvier");
    expect(d.photoUrl).toBe("https://x.supabase.co/p.jpg");
    expect(d.nearbyLabel).toBe("90 gardiens à moins de 50 km de Draveil");
    expect(d.faces).toHaveLength(1);
  });

  it("brouillon existant : son titre est repris", () => {
    const d = buildNoelV3EmailData({ hasProperty: true, petNames: [], photoCount: 1, token: TOKEN, existingDraftTitle: "Ma maison à Annecy", city: "Annecy" });
    expect(d.draftTitle).toBe("Ma maison à Annecy");
  });

  it("sans commune ou sans gardien proche : aucun libellé de proximité (bloc « Ajoutez votre commune »)", () => {
    const near = { count: 12, label: "12 gardiens à moins de 50 km de chez vous", faces: [] };
    expect(buildNoelV3EmailData({ hasProperty: false, petNames: [], photoCount: 0, token: TOKEN, nearby: near }).nearbyLabel).toBeUndefined();
    expect(buildNoelV3EmailData({ hasProperty: false, petNames: [], photoCount: 0, token: TOKEN, city: "Lyon", nearby: { count: 0, label: null, faces: [] } }).nearbyLabel).toBeUndefined();
  });

  it("variante logement : ni logement, ni titre, ni photo dans les données", () => {
    const d = buildNoelV3EmailData({ hasProperty: false, petNames: [], photoCount: 0, token: TOKEN, photoUrl: "https://x/p.jpg" });
    expect(d.propertyLabel).toBeUndefined();
    expect(d.draftTitle).toBeUndefined();
    expect(d.photoUrl).toBeUndefined();
  });

  it("gabarit réel : variante au J0, relance à J+3", () => {
    expect(noelV3TemplateFor({ variant: "photo" }, false)).toBe("owner-noel-v3-photo");
    expect(noelV3TemplateFor({ variant: "photo" }, true)).toBe("owner-noel-v3-relance");
    expect(NOEL_EMAIL_GROUP).toEqual(["owner-noel-2026", ...Object.values(NOEL_V3_TEMPLATES)]);
  });
});

describe("V1.2 Brouillon préparé : textes", () => {
  const base = { city: "Draveil", start: "2026-12-19", end: "2027-01-03" };
  it("titre selon les animaux, 120 caractères au plus", () => {
    expect(noelDraftTitle({ ...base, petNames: [] })).toBe("Garde de ma maison pendant les fêtes, à Draveil");
    expect(noelDraftTitle({ ...base, petNames: [], hasUnnamedPets: true })).toBe("Garde de mes animaux et ma maison pendant les fêtes, à Draveil");
    expect(noelDraftTitle({ ...base, petNames: ["rex", "nala"] })).toBe("Garde de Rex et Nala pendant les fêtes, à Draveil");
    expect(noelDraftTitle({ ...base, city: "x".repeat(200), petNames: [] }).length).toBeLessThanOrEqual(120);
  });

  it("texte affirmatif, sans genre attribué, rencontre facultative, plus de 30 caractères", () => {
    for (const petNames of [[], ["Mila"], ["Rex", "Nala"]]) {
      for (const hasUnnamedPets of [false, true]) {
        const t = noelDraftText({ ...base, petNames, hasUnnamedPets });
        expect(t.length).toBeGreaterThan(30);
        expect(t).toContain("si les deux le souhaitent");
        expect(t).not.toMatch(/[—–]/);
        expect(t).not.toMatch(/\b(il|elle|ils|elles|gentil|gentille|le chien|la chienne|voisin|disponible|ne |n')/i);
      }
    }
  });

  it("prénoms : majuscule, accord en liste, saisie nettoyée", () => {
    expect(petNamesLabel(["mila", "rex", "nala"])).toBe("Mila, Rex et Nala");
    expect(cleanPetName("  Mila  ")).toBe("Mila");
    expect(cleanPetName("<script>")).toBeNull();
    expect(cleanPetName("x".repeat(41))).toBeNull();
  });

  it("dates : à venir, fin après le début, 120 jours au plus", () => {
    expect(validNoelDates("2026-12-19", "2027-01-03", "2026-10-27")).toEqual({ start: "2026-12-19", end: "2027-01-03" });
    expect(validNoelDates("2026-10-01", "2026-10-30", "2026-10-27")).toBeNull();
    expect(validNoelDates("2026-12-20", "2026-12-20", "2026-10-27")).toBeNull();
    expect(validNoelDates("2026-12-01", "2027-06-01", "2026-10-27")).toBeNull();
    expect(validNoelDates("19/12/2026", "2027-01-03", "2026-10-27")).toBeNull();
    expect(frRange("2026-12-26", "2027-01-01")).toBe("Du 26 décembre au 1er janvier");
  });

  it("titre et texte suivent le type de logement, prénom à apostrophe typographique accepté", () => {
    expect(noelDraftTitle({ ...base, petNames: [], propertyType: "apartment" })).toBe("Garde de mon appartement pendant les fêtes, à Draveil");
    expect(noelDraftText({ ...base, petNames: [], propertyType: "apartment" })).toContain("L'appartement reste à garder");
    expect(noelDraftText({ ...base, petNames: [], hasUnnamedPets: true })).not.toContain("d'eux");
    expect(cleanPetName("D’Artagnan")).toBe("D’Artagnan");
  });

  it("brouillon existant : ses dates à venir sont reprises dans l'email, des dates passées laissent celles de Noël", () => {
    const f = { hasProperty: true, petNames: [], photoCount: 1, token: TOKEN, today: "2026-10-27" };
    expect(buildNoelV3EmailData({ ...f, existingDraftDates: { start: "2027-02-10", end: "2027-02-20" } }).datesLabel).toBe("Du 10 février au 20 février");
    expect(buildNoelV3EmailData({ ...f, existingDraftDates: { start: "2026-08-01", end: "2026-08-10" } }).datesLabel).toBe("Du 19 décembre au 3 janvier");
  });

  it("libellé du logement", () => {
    expect(propertyPhrase("apartment", "Lyon")).toBe("votre appartement à Lyon");
    expect(propertyPhrase("weird", "")).toBe("votre logement");
  });
});

describe("V1.3 Jeton et photo par la page", () => {
  it("jeton : forme et état", () => {
    expect(isWellFormedNoelToken(TOKEN)).toBe(true);
    expect(isWellFormedNoelToken("abc")).toBe(false);
    expect(isWellFormedNoelToken("z".repeat(64))).toBe(false);
    const now = new Date("2026-10-27T10:00:00Z");
    expect(noelTokenState(null, now)).toBe("invalid");
    expect(noelTokenState({ profile_id: "u", expires_at: "2026-11-26T00:00:00Z", revoked_at: null }, now)).toBe("valid");
    expect(noelTokenState({ profile_id: "u", expires_at: "2026-10-01T00:00:00Z", revoked_at: null }, now)).toBe("expired");
    expect(noelTokenState({ profile_id: "u", expires_at: "2026-11-26T00:00:00Z", revoked_at: "2026-10-20T00:00:00Z" }, now)).toBe("revoked");
  });

  it("photo : dossier du propriétaire seulement", () => {
    const p = noelPhotoPath("u1", 1, "ab-cd", "PNG");
    expect(p).toBe("u1/owner-gallery/noel-1-abcd.png");
    expect(isOwnNoelPhotoPath("u1", p)).toBe(true);
    expect(isOwnNoelPhotoPath("u2", p)).toBe(false);
    expect(isOwnNoelPhotoPath("u1", "u1/owner-gallery/noel-1-../../x.jpg")).toBe(false);
    expect(isOwnNoelPhotoPath("u1", "u1/owner-gallery/autre.jpg")).toBe(false);
    expect(photoExt({ type: "image/webp" })).toBe("webp");
    expect(photoExt({ type: "image/heic" })).toBe("jpg");
  });

  it("la fonction ne renvoie ni email ni coordonnées, et la publication passe par la connexion", () => {
    const src = read(`${FN}/annonce-noel/index.ts`);
    const fn = src.slice(src.indexOf("async function statePayload"), src.indexOf("Deno.serve"));
    const payload = fn.slice(fn.indexOf("return {"));
    expect(payload).not.toMatch(/\bemail\b/);
    expect(payload).not.toMatch(/latitude:|longitude:/);
    expect(src).not.toMatch(/status: 'published'/);
    expect(src).toContain("isAccountBlockedForMarketing");
    expect(src).toContain("RATE_PER_TOKEN");
    expect(publishHref("s1")).toBe("/sits/s1?publier=1");
  });

  it("page : brouillon du propriétaire préservé, questions fermées, prénom vide accepté, photo contrôlée", () => {
    const src = read(`${FN}/annonce-noel/index.ts`);
    expect(src).toContain("cleanPetName((p as { name?: string })?.name) ?? ''");
    expect(src).toContain("reason: 'questions_closed'");
    expect(src).toContain("draft.start_date < today");
    expect(src).toContain("ownText ? `${ownText}\\n\\n${text}` : text");
    expect(src).toContain("const createdByPage = (ctx.token.answers ?? {}).created_draft_id === draft.id");
    expect(src).toContain("PHOTO_MIME.has(mime)");
    expect(read(`${FN}/send-sit-draft-reminder/index.ts`)).toContain('.in("template_name", NOEL_V3_ALL_TEMPLATES)');
    expect(read(`${FN}/send-mass-email/index.ts`)).toContain("loadSeasonalNoelReceived(serviceClient, emails)");
  });

  it("étapes de la page", () => {
    const s = { has_property: true, questions: false, pets_answered: false, dates_answered: false, photo_count: 1 };
    expect(nextStep({ ...s, has_property: false })).toBe("logement");
    expect(nextStep({ ...s, questions: true })).toBe("pets");
    expect(nextStep({ ...s, questions: true, pets_answered: true })).toBe("dates");
    expect(nextStep({ ...s, photo_count: 0 })).toBe("photo");
    expect(nextStep(s)).toBe("ready");
    expect(stepLabel("pets")).toBe("2 sur 3");
    expect(stepLabel("ready")).toBeNull();
    expect(readyNearbyLine(90)).toBe("90 gardiens à moins de 50 km la découvrent dès sa publication.");
    expect(readyNearbyLine(1)).toBe("1 gardien à moins de 50 km la découvre dès sa publication.");
    expect(readyNearbyLine(0)).toBeNull();
  });

  it("route sans connexion, publication automatique sur la fiche après connexion", () => {
    expect(read("src/App.tsx")).toContain('<Route path="/annonce-noel/:token" element={<AnnonceNoel />} />');
    const view = read("src/components/sits/views/OwnerSitView.tsx");
    expect(view).toContain('publishParams.get("publier") === "1"');
    expect(view).toMatch(/if \(!isDraft \|\| publishNeedsForm \|\| !canPublish \|\| publishing\) return;/);
  });
});

describe("V1.4 Photo obligatoire côté serveur", () => {
  const sql = read(MIGRATION);
  it("déclencheur sur la première mise en ligne seulement", () => {
    expect(sql).toContain("CREATE TRIGGER trg_guard_sit_publish_requires_photo");
    expect(sql).toContain("BEFORE INSERT OR UPDATE OF status ON public.sits");
    expect(sql).toContain("TG_OP = 'INSERT' OR OLD.status = 'draft'::sit_status");
    expect(sql).toContain("HINT = 'sit_photo_required'");
  });
  it("table des jetons réservée au service_role", () => {
    expect(sql).toContain("REVOKE ALL ON TABLE public.owner_noel_tokens FROM PUBLIC, anon, authenticated;");
    expect(sql).toContain("GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.owner_noel_tokens TO service_role;");
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
  });
});

describe("V1.5 Audience : témoin, départ lointain, un seul email de Noël, pression", () => {
  it("répartition pure", () => {
    const [holdout] = firstIds((id) => isOwnerV2Holdout(id), 1);
    const plain = firstIds((id) => !isOwnerV2Holdout(id), 4);
    const rows = [
      { id: holdout, email: "h@x.fr" },
      { id: plain[0], email: "hold@x.fr" },
      { id: plain[1], email: "Recu@x.fr" },
      { id: plain[2], email: "busy@x.fr" },
      { id: plain[3], email: "ok@x.fr" },
    ];
    const r = splitNoelV3Audience(rows, {
      holds: new Set([plain[0]]),
      received: new Set(["recu@x.fr"]),
      recentCounts: new Map([["busy@x.fr", 3]]),
    });
    expect(r.rows.map((x) => x.email)).toEqual(["ok@x.fr"]);
    expect(r).toMatchObject({ holdoutExcluded: 1, departureHoldExcluded: 1, alreadyReceived: 1, pressureExcluded: 1 });
  });

  it("relance : ouvreurs sans clic, page jamais ouverte, 72 heures après", () => {
    const sends = [
      { recipient_email: "a@x.fr", status: "opened", first_opened_at: "t", first_clicked_at: null },
      { recipient_email: "b@x.fr", status: "clicked", first_opened_at: "t", first_clicked_at: "t" },
      { recipient_email: "c@x.fr", status: "sent", first_opened_at: null, first_clicked_at: null },
      { recipient_email: "D@x.fr", status: "opened", first_opened_at: "t", first_clicked_at: null },
      { recipient_email: "e@x.fr", status: "skipped", first_opened_at: "t", first_clicked_at: null },
    ];
    const t = relanceTargets(sends, new Set(["id-d"]), new Map([["d@x.fr", "id-d"]]));
    expect([...t]).toEqual(["a@x.fr"]);
    const now = new Date("2026-10-30T10:00:00Z");
    expect(relanceTooEarly("2026-10-27T09:00:00Z", now)).toBe(false);
    expect(relanceTooEarly("2026-10-28T09:00:00Z", now)).toBe(true);
    expect(relanceTooEarly(null, now)).toBe(true);
  });

  it("send-mass-email : gabarit par destinataire, garde de la relance, noel-2026 écarte la v3", () => {
    const src = read(`${FN}/send-mass-email/index.ts`);
    expect(src).toContain("templateName = noelV3TemplateFor(");
    expect(src).toContain("relanceTooEarly(");
    expect(src).toContain('"noel_v3_data_missing"');
    expect(src).toContain("NOEL_EMAIL_GROUP.filter((t) => t !== OWNER_NOEL_TEMPLATE)");
    // Estimation : aucun jeton créé.
    const count = src.slice(src.indexOf('if (mode === "count")'), src.indexOf("// Mode SEND"));
    expect(count).not.toContain("buildNoelV3DataFor");
    expect(count).not.toContain("mintNoelV3Tokens");
  });

  it("envoi saisonnier de Noël : sans les destinataires de la v3", () => {
    expect(isNoelPeriodKey("noel-2026")).toBe(true);
    expect(isNoelPeriodKey("toussaint-2026")).toBe(false);
    const r = excludeNoelV3Recipients([{ email: "A@x.fr" }, { email: "b@x.fr" }], new Set(["a@x.fr"]));
    expect(r).toEqual({ rows: [{ email: "b@x.fr" }], excluded: 1 });
    expect(read(`${FN}/send-seasonal-nurture/index.ts`)).toContain("isNoelPeriodKey(periodKey)");
  });
});

describe("V1.6 Gabarits", () => {
  const names = [...Object.values(NOEL_V3_TEMPLATES), "owner-noel-v3-relance"];
  it("enregistrés, catégorie produit, signés des fondateurs, datés", () => {
    const registry = read(`${TPL}/registry.ts`);
    const categories = read(`${FN}/_shared/email-categories.ts`);
    const sender = read(`${FN}/_shared/sender-address.ts`);
    const cap = read(`${FN}/_shared/email-cap.ts`);
    const product = categories.slice(categories.indexOf("const PRODUCT"), categories.indexOf("const DIGEST"));
    for (const n of names) {
      expect(registry).toContain(`'${n}':`);
      expect(product).toContain(`'${n}'`);
      expect(sender).toContain(`"${n}"`);
      expect(cap).toContain(`'${n}'`);
    }
  });

  it("objets : apostrophe typographique, sans « ! » ni tiret", () => {
    for (const f of [...Object.values(NOEL_V3_SUBJECTS), ...Object.values(NOEL_V3_RELANCE_SUBJECTS)]) {
      for (const s of [f("Camille"), f("")]) {
        expect(s).not.toMatch(/['!—–]/);
        expect(s.trim()).toBe(s);
      }
    }
  });

  it("textes : doctrine (gratuit sans durée, à proximité, aucun tiret, aucune coche)", () => {
    const files = [
      `${TPL}/_owner-noel-v3-parts.tsx`,
      ...names.map((n) => `${TPL}/${n}.tsx`),
      `${FN}/_shared/owner-noel-v3.ts`,
      "src/pages/AnnonceNoel.tsx",
    ];
    for (const f of files) {
      const src = read(f);
      expect(src, f).not.toMatch(/[—–✓✔]/);
      expect(src, f).not.toMatch(/voisin|disponibles?\b|offert|sans engagement|gratuit pour|pendant la phase/i);
    }
    expect(NOEL_V3_PROOF).toBe("Près de 3 annonces publiées sur 4 reçoivent des candidatures, les premières arrivent en général sous 24 heures.");
    const parts = read(`${TPL}/_owner-noel-v3-parts.tsx`);
    expect(parts).toContain("Ajouter ma commune");
    expect(parts).toContain("Dites-le-nous en un clic");
  });
});
