// Lots ANN-1 et ANN-2 (16/11/2026) : page Annonces de l'admin triée par
// urgence, une phrase par annonce, textes prêts pour écrire.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { compareUrgency, daysUntil, listingUrgency, matchesCounter, URGENCY_COUNTERS, type UrgencyInput } from "@/lib/admin/listingUrgency";
import { memberMessageDrafts } from "@/lib/admin/memberMessageDrafts";
import { LISTING_FILTERS, listingFilterScope } from "@/lib/admin/listingSituation";

const NOW = new Date("2026-11-16T12:00:00");
const ago = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();
const base = (o: Partial<UrgencyInput>): UrgencyInput => ({ status: "published", published_at: ago(10), activeApplications: 0, waiting: 0, ...o });

// Situations réelles relevées le 16/11/2026.
const MONTCARET = base({ start_date: "2026-11-23", end_date: "2026-11-27", published_at: ago(3) });
const LICQ = base({ start_date: "2026-11-26", end_date: "2026-11-30", activeApplications: 4, waiting: 4, oldestWaitingAt: ago(32) });
const SIROS = base({ start_date: "2026-11-01", end_date: "2026-11-30", activeApplications: 1, waiting: 1, oldestWaitingAt: ago(13) });
const QUEBEC = base({ start_date: "2026-12-07", activeApplications: 1, waiting: 1, oldestWaitingAt: ago(33) });
const LONGVIC = base({ start_date: "2026-12-06", published_at: ago(20) });
const VULBAS = base({ start_date: "2026-12-05", activeApplications: 3, waiting: 3, oldestWaitingAt: ago(4) });
const SANTENY = base({ start_date: "2026-12-23", published_at: ago(1) });

describe("ANN-1 : une phrase et un geste par annonce", () => {
  it("garde commencée, candidats en attente : écrire au propriétaire", () => {
    const u = listingUrgency(SIROS, NOW)!;
    expect(u.key).toBe("started");
    expect(u.phrase).toBe("Garde commencée le 1er novembre, 1 candidat attend depuis 13 jours");
    expect(u.gesture).toBe("write_owner");
  });

  it("départ sous 14 jours sans candidature : prévenir les gardiens", () => {
    const u = listingUrgency(MONTCARET, NOW)!;
    expect(u.key).toBe("departure_soon");
    expect(u.phrase).toBe("Départ dans 7 jours, aucune candidature");
    expect(u.gesture).toBe("broadcast");
  });

  it("départ sous 14 jours avec candidats : écrire au propriétaire", () => {
    const u = listingUrgency(LICQ, NOW)!;
    expect(u.phrase).toBe("4 candidats attendent depuis 32 jours, départ dans 10 jours");
    expect(u.gesture).toBe("write_owner");
  });

  it("attente de plus de 7 jours", () => {
    const u = listingUrgency(QUEBEC, NOW)!;
    expect(u.key).toBe("waiting_long");
    expect(u.phrase).toBe("1 candidat attend depuis 33 jours");
    expect(u.chip).toBe("Attente de 33 jours");
  });

  it("aucune candidature après 48 heures, départ lointain", () => {
    const u = listingUrgency(LONGVIC, NOW)!;
    expect(u.key).toBe("no_application");
    expect(u.phrase).toBe("Aucune candidature après 20 jours en ligne");
  });

  it("annonces qui suivent leur cours : sans geste", () => {
    expect(listingUrgency(VULBAS, NOW)).toMatchObject({ key: "ok", gesture: "none", phrase: "3 candidatures en cours, la plus ancienne il y a 4 jours" });
    expect(listingUrgency(SANTENY, NOW)).toMatchObject({ key: "ok", phrase: "Publiée récemment, premières candidatures à venir" });
    expect(listingUrgency({ ...VULBAS, status: "draft" }, NOW)).toBeNull();
  });

  it("tri : commencée, départ proche, attente longue, sans candidature, le reste", () => {
    const list = [SANTENY, VULBAS, LONGVIC, QUEBEC, LICQ, MONTCARET, SIROS].map((l) => listingUrgency(l, NOW));
    const order = [...list].sort(compareUrgency).map((u) => u!.phrase.slice(0, 18));
    expect(order).toEqual([
      "Garde commencée le", "Départ dans 7 jour", "4 candidats attend", "1 candidat attend ", "Aucune candidature", "3 candidatures en ", "Publiée récemment,",
    ]);
  });

  it("compteurs : mêmes règles que les phrases", () => {
    const all = [SIROS, MONTCARET, LICQ, QUEBEC, LONGVIC, VULBAS, SANTENY];
    const count = (f: string) => all.filter((l) => matchesCounter(f, listingUrgency(l, NOW), l, NOW)).length;
    expect(URGENCY_COUNTERS.map((c) => c.filter)).toEqual(["published", "waiting_long", "departure_soon", "to_staff", "started_waiting"]);
    expect(count("published")).toBe(7);
    expect(count("waiting_long")).toBe(2);
    expect(count("departure_soon")).toBe(2);
    expect(count("to_staff")).toBe(2);
    expect(count("started_waiting")).toBe(1);
    expect(daysUntil("2026-11-23", NOW)).toBe(7);
  });

  it("filtres d'URL connus, périmètre « en ligne »", () => {
    for (const f of ["waiting_long", "departure_soon"]) {
      expect(LISTING_FILTERS).toContain(f);
      expect(listingFilterScope(f as never)).toEqual({ status: "published" });
    }
  });
});

describe("ANN-2 : textes prêts", () => {
  const ctx = { name: "Eliane", city: "Licq-Athérey", startsWhen: "dans 10 jours", waitingCount: 4, waitingDays: 32, startedOn: "1er novembre", ownerName: "Magali" };

  it("trois versions par sujet, avec la situation de l'annonce", () => {
    for (const t of ["owner_waiting", "owner_started", "candidate_started"] as const) {
      const d = memberMessageDrafts(t, ctx);
      expect(new Set(d.map((x) => x.body)).size, t).toBe(3);
      for (const x of d) {
        expect(x.body.startsWith("Bonjour Eliane,"), t).toBe(true);
        expect(x.body.trimEnd().endsWith("Belle journée à vous,"), t).toBe(true);
        const text = `${x.subject}\n${x.body}`;
        expect(text, t).not.toMatch(/[—–]|undefined|null/);
        expect(text, t).not.toMatch(/je (vous )?(cherche|trouve)(rai)? un gardien|nous (vous )?(cherch|trouv)\w+ un gardien/i);
        expect(text, t).not.toMatch(/rencontre (est )?obligatoire/i);
      }
    }
    expect(memberMessageDrafts("owner_waiting", ctx)[0].body).toContain("4 gardiens attendent une réponse de votre part depuis 32 jours");
    expect(memberMessageDrafts("owner_started", ctx)[0].body).toContain("a commencé le 1er novembre");
    expect(memberMessageDrafts("candidate_started", ctx)[0].body).toContain("Nous avons relancé Magali");
  });

  it("la rencontre reste facultative dans le texte au propriétaire", () => {
    expect(memberMessageDrafts("owner_waiting", ctx)[0].body).toContain("reste possible si vous le souhaitez");
  });

  it("câblage de la page", () => {
    const page = readFileSync("src/pages/admin/AdminListings.tsx", "utf8");
    expect(page).toContain('admin_get_listings_waiting');
    expect(page).toContain('data-testid="urgency-counters"');
    expect(page).toContain('data-testid="row-write-owner"');
    expect(page).toContain('channel: "message"');
    expect(page).toContain('data-testid="listing-stats"');
    expect(page).toContain("onWriteCandidate=");
    expect(page).not.toContain("> Contacter");
    expect(readFileSync("src/components/admin/ListingDrilldownDialog.tsx", "utf8")).toContain('data-testid="drill-write-candidate"');
    expect(readFileSync("drizzle/migrations/0177_ann1_listings_waiting.sql", "utf8")).toContain("REVOKE ALL ON FUNCTION public.admin_get_listings_waiting(uuid[]) FROM PUBLIC, anon");
  });
});
