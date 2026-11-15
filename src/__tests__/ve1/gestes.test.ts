// Lots VE-1 à VE-4 (15/11/2026) : une ligne par personne ou par annonce,
// messages prêts, renvois justes, candidature rapide hors de la liste.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildWorkList, type WorkListRaw } from "../../../supabase/functions/_shared/admin-work-list.ts";
import { buildGestures, gesturesSentence, sinceLabel } from "@/lib/admin/gestures";
import { memberMessageDrafts, type MemberDraftTopic } from "@/lib/admin/memberMessageDrafts";
import { signalListLink } from "@/components/admin/signals/signalGrouping";

const NOW = new Date("2026-11-15T22:00:00Z").getTime();
const alma = (id: string, type: string, severity: string) => ({
  id, signal_type: type, severity, entity_type: "profile", entity_id: "p1", detected_at: "2026-11-14T14:22:28Z",
  metadata: { profile_id: "p1", first_name: "Ludmila", city: "Villentrois", role: "owner", page_path: "/owner-profile", excerpt: "Ya pas !!",
    messages: [{ text: "Ya pas !!", bug_item: "bouton suppression annonce", page_path: "/owner-profile" }] },
});
const noApp = (id: string, start: string, eligible: number) => ({
  id, signal_type: "no_applications", severity: "warning", entity_type: "sit", entity_id: id, detected_at: "2026-11-13T10:00:00Z",
  metadata: { sit_title: `Garde ${id}`, sit_city: `Ville ${id}`, days_since_published: 4, eligible_sitters_count: eligible, owner_id: `o-${id}`, start_date: start },
});
const RAW: WorkListRaw = {
  sources: { signals: true, sits: true, queues: true, relances: true, health: true },
  signals: [
    alma("s1", "alma_frustration", "critical"),
    alma("s2", "alma_bug_report", "warning"),
    noApp("a", "2026-11-23", 2),
    noApp("b", "2026-12-06", 6),
    noApp("c", "2026-12-24", 3),
    noApp("d", "2027-02-06", 0),
    { id: "f", signal_type: "suspicious_account", severity: "warning", entity_type: "profile", entity_id: "p9", detected_at: "2026-11-15T20:00:00Z", metadata: { signal: "fast_apply", first_name: "Marion" } },
  ],
  sits: [
    { id: "a", start_date: "2026-11-23", title: "Garde a", city: "Ville a" },
    { id: "b", start_date: "2026-12-06", title: "Garde b", city: "Ville b" },
    { id: "c", start_date: "2026-12-24", title: "Garde c", city: "Ville c" },
    { id: "d", start_date: "2027-02-06", title: "Garde d", city: "Ville d" },
  ],
  queues: [{ key: "errorsOld", count: 1, oldest: "2026-11-14T08:00:00Z" }],
  relances_failed_7d: 0,
  health: [],
};
const gestures = buildGestures(buildWorkList(RAW, NOW), NOW);
const byKey = (k: string) => gestures.find((g) => g.key === k)!;

describe("VE-1 : une ligne, un geste", () => {
  it("deux signaux d'Alma du même membre font une seule ligne, qui écrit", () => {
    const g = byKey("alma:p1");
    expect(gestures.filter((x) => x.key.startsWith("alma:"))).toHaveLength(1);
    expect(g.signals.map((s) => s.id).sort()).toEqual(["s1", "s2"]);
    expect(g.kind).toBe("write");
    expect(g.actionLabel).toBe("Écrire à Ludmila");
    expect(g.title).toBe("Ludmila, propriétaire à Villentrois, cherche de l'aide après un échange avec Alma");
    expect(g.quote).toBe("Ya pas !!");
    expect(g.detail).toContain("son profil propriétaire");
    expect(g.detail).toContain("bouton suppression annonce");
    expect(g.bucket).toBe("today");
    expect(g.write).toEqual({ userId: "p1", firstName: "Ludmila", topic: "alma_help" });
  });

  it("une annonce sans candidature par ligne, rangée par date de départ", () => {
    const a = byKey("sit:a");
    expect(a.bucket).toBe("today");
    expect(a.kind).toBe("broadcast");
    expect(a.actionLabel).toBe("Prévenir les 2 gardiens");
    expect(a.chip).toBe("Départ dans 8 jours");
    expect(a.secondaryWrite?.userId).toBe("o-a");
    expect(byKey("sit:b").bucket).toBe("week");
    const far = byKey("sit:far");
    expect(far.kind).toBe("more");
    expect(far.children?.map((c) => c.key)).toEqual(["sit:c", "sit:d"]);
    expect(far.actionLabel).toBe("Afficher les 2");
    expect(far.children?.[1].actionLabel).toBe("Élargir la diffusion");
  });

  it("une file sans signal garde sa phrase, le bouton reprend son verbe", () => {
    const e = gestures.find((g) => g.kind === "link")!;
    expect(e.actionLabel).toBe("Corriger");
    expect(e.link).toBe("/admin/errors");
  });

  it("aujourd'hui d'abord, et la phrase de tête compte les deux temps", () => {
    const buckets = gestures.map((g) => g.bucket);
    expect(buckets.indexOf("week")).toBeGreaterThan(buckets.lastIndexOf("today"));
    expect(gesturesSentence(gestures)).toBe("3 gestes aujourd'hui, 2 cette semaine.");
    expect(gesturesSentence([])).toBe("Tout est à jour aujourd'hui.");
    expect(sinceLabel("2026-11-14T14:22:28Z", NOW)).toBe("Depuis hier");
  });

  it("aucun bouton ne dit « Voir »", () => {
    const all = [...gestures, ...gestures.flatMap((g) => g.children ?? [])];
    expect(all.every((g) => g.actionLabel !== "Voir" && g.actionLabel.length > 3)).toBe(true);
  });
});

describe("VE-4 : candidature rapide hors de la liste", () => {
  it("rangée dans la synthèse du lundi, les autres comptes suspects restent", () => {
    const model = buildWorkList(RAW, NOW);
    expect(model.items.some((i) => i.type === "suspicious_account")).toBe(false);
    expect(model.hebdo).toContainEqual({ type: "suspicious_account", count: 1 });
    const other = buildWorkList({ ...RAW, signals: [{ ...RAW.signals![6], metadata: { signal: "many_reports" } }] }, NOW);
    expect(other.items.some((i) => i.type === "suspicious_account")).toBe(true);
  });
});

describe("VE-2 : messages prêts", () => {
  const TOPICS: MemberDraftTopic[] = ["alma_help", "alma_churn", "no_applications"];
  const ctx = { name: "Ludmila", quote: "Ya pas !!", subjectHint: "bouton suppression annonce", city: "Montcaret", startsWhen: "dans 8 jours", sittersNearby: 2, daysPublished: 4 };

  it("trois versions distinctes par sujet, avec salutation et formule de fin", () => {
    for (const t of TOPICS) {
      const d = memberMessageDrafts(t, ctx);
      expect(d, t).toHaveLength(3);
      expect(new Set(d.map((x) => x.body)).size, t).toBe(3);
      for (const x of d) {
        expect(x.body.startsWith("Bonjour Ludmila,"), t).toBe(true);
        expect(x.body.trimEnd().endsWith("Belle journée à vous,"), t).toBe(true);
        expect(x.subject.length, t).toBeGreaterThan(5);
      }
    }
  });

  it("le texte reprend le sujet : phrase du membre, blocage, annonce", () => {
    const [help] = memberMessageDrafts("alma_help", ctx);
    expect(help.body).toContain("« Ya pas !! »");
    expect(help.body).toContain("« bouton suppression annonce »");
    const [owner] = memberMessageDrafts("no_applications", ctx);
    expect(owner.body).toContain("à Montcaret");
    expect(owner.body).toContain("2 gardiens vivent à proximité");
    expect(owner.body).toContain("dans 8 jours");
  });

  it("règles de contenu : ni tiret long, ni promesse de chercher un gardien, ni rencontre imposée", () => {
    for (const t of TOPICS) for (const c of [ctx, {}]) for (const x of memberMessageDrafts(t, c)) {
      const text = `${x.subject}\n${x.body}`;
      expect(text).not.toMatch(/[\u2014\u2013]/);
      expect(text).not.toMatch(/je (vous )?(cherche|trouve)(rai)? un gardien|nous (vous )?(cherch|trouv)\w+ un gardien/i);
      expect(text).not.toMatch(/rencontre obligatoire|undefined|null/);
    }
  });

  it("sans prénom ni phrase, le message reste propre", () => {
    const [d] = memberMessageDrafts("alma_help", {});
    expect(d.body.startsWith("Bonjour,")).toBe(true);
    expect(d.body).not.toContain("«");
  });
});

describe("VE-2 et VE-3 : câblage", () => {
  const blocks = readFileSync("src/pages/admin/_components/dashboard/PilotageBlocks.tsx", "utf8");
  const dialog = readFileSync("src/pages/admin/_components/users/WriteToMemberDialog.tsx", "utf8");

  it("la ligne ouvre le composeur en messagerie Guardiens, avec contexte, versions et fermeture du signal", () => {
    expect(blocks).toContain('channel: "message"');
    expect(blocks).toContain("memberMessageDrafts(");
    expect(blocks).toContain("signalIds:");
    expect(dialog).toContain("admin_send_message_to_user");
    expect(dialog).toContain('action_taken: "member_written"');
    expect(dialog).toContain("Autre version (");
  });

  it("un signal de contenu ou de ville ne renvoie plus vers /admin", () => {
    const s = { id: "x", signal_type: "content_quality_drift", severity: "warning", entity_id: null, detected_at: "", metadata: {} };
    expect(signalListLink({ ...s, entity_type: "content" } as never)).toBe("/admin/articles");
    expect(signalListLink({ ...s, entity_type: "city" } as never)).toBe("/admin/city-pages");
  });

  it("libellés français sur la carte d'annonce", () => {
    expect(readFileSync("src/components/admin/signals/NoApplicationsCard.tsx", "utf8")).not.toContain("Broadcast aux");
  });
});

describe("VE-5 : gabarits complétés et chiffres filtrés", () => {
  const raw: WorkListRaw = {
    sources: { signals: true, sits: true, queues: true, relances: true, health: true },
    signals: [
      { id: "t", signal_type: "dormant_top_sitter", severity: "warning", entity_type: "profile", entity_id: "g1", detected_at: "2026-11-10T08:00:00Z", metadata: { first_name: "Nicolas", avg_rating: 4.9, reviews_count: 6, days_since_last_application: 62 } },
      { id: "u", signal_type: "suspicious_account", severity: "warning", entity_type: "profile", entity_id: "p7", detected_at: "2026-11-15T08:00:00Z", metadata: { signal: "many_reports", first_name: "Paul" } },
    ],
    sits: [], queues: [], relances_failed_7d: 0, health: [],
  };
  const list = buildGestures(buildWorkList(raw, NOW), NOW);

  it("meilleur gardien endormi : le bouton écrit, la carte reste sous « Autres gestes »", () => {
    const g = list.find((x) => x.write?.topic === "dormant_sitter")!;
    expect(g.kind).toBe("write");
    expect(g.actionLabel).toBe("Écrire à Nicolas");
    expect(g.moreActions).toBe(true);
    expect(g.detail).toBe("6 avis, note de 4,9 sur 5, dernière candidature il y a 62 jours.");
  });

  it("compte à examiner : la carte reste le geste principal, un mot de bienvenue en second", () => {
    const g = list.find((x) => x.signals[0].id === "u")!;
    expect(g.kind).toBe("card");
    expect(g.secondaryWrite).toMatchObject({ userId: "p7", topic: "account_welcome", label: "Écrire à Paul" });
  });

  it("deux nouveaux sujets, trois versions chacun, mêmes règles", () => {
    for (const t of ["dormant_sitter", "account_welcome"] as const) {
      const d = memberMessageDrafts(t, { name: "Nicolas", daysQuiet: 62 });
      expect(new Set(d.map((x) => x.body)).size).toBe(3);
      for (const x of d) {
        expect(x.body.startsWith("Bonjour Nicolas,")).toBe(true);
        expect(`${x.subject}${x.body}`).not.toMatch(/[\u2014\u2013]|undefined|null/);
      }
    }
    expect(memberMessageDrafts("dormant_sitter", { daysQuiet: 62 })[0].body).toContain("il y a 62 jours");
  });

  it("les chiffres de la vue d'ensemble ouvrent une liste filtrée", () => {
    const blocks = readFileSync("src/pages/admin/_components/dashboard/PilotageBlocks.tsx", "utf8");
    expect(blocks).toContain('"/admin/listings?filter=awaiting_reply"');
    expect(blocks).toContain('"/admin/users?new=7"');
    expect(readFileSync("src/lib/admin/listingSituation.ts", "utf8")).toContain('awaiting_reply: "Candidatures sans réponse, garde à venir"');
    expect(readFileSync("src/pages/admin/AdminUsers.tsx", "utf8")).toContain('urlParams.get("new")');
  });
});
