/**
 * Lot ADM20 (audit de l'espace admin du 11/11/2026) : annonces commencées
 * dont les candidats attendent, relance limitée aux gardes à venir, menu
 * rangé selon l'usage, mots internes retirés.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isListingStartedWaiting, startedSitCandidateMessage } from "@/lib/admin/listingStartedWaiting";
import { LISTING_FILTERS, LISTING_FILTER_LABELS, listingFilterScope } from "@/lib/admin/listingSituation";
import { QUEUE_COPY } from "../../../supabase/functions/_shared/admin-work-list";

const read = (f: string) => readFileSync(resolve(process.cwd(), f), "utf8");
const now = new Date("2026-11-11T12:00:00");

describe("annonce commencée, candidats en attente", () => {
  it("publiée, début passé, au moins une candidature en attente", () => {
    expect(isListingStartedWaiting({ status: "published", start_date: "2026-10-31", activeApplications: 10 }, now)).toBe(true);
    expect(isListingStartedWaiting({ status: "published", start_date: "2026-12-24", activeApplications: 3 }, now)).toBe(false);
    expect(isListingStartedWaiting({ status: "published", start_date: "2026-10-31", activeApplications: 0 }, now)).toBe(false);
    expect(isListingStartedWaiting({ status: "confirmed", start_date: "2026-10-31", activeApplications: 2 }, now)).toBe(false);
    expect(isListingStartedWaiting({ status: "published", start_date: "2026-10-31", activeApplications: null }, now)).toBe(false);
  });
  it("le filtre et la ligne de la liste portent la même destination", () => {
    expect(LISTING_FILTERS).toContain("started_waiting");
    expect(LISTING_FILTER_LABELS.started_waiting).toBe("Commencées, candidats en attente");
    expect(listingFilterScope("started_waiting")).toEqual({ status: "published" });
    expect(QUEUE_COPY.startedWaiting.link).toBe("/admin/listings?filter=started_waiting");
    expect(QUEUE_COPY.startedWaiting.title(1)).toBe("Décider du sort de 1 annonce commencée dont les candidats attendent");
    expect(QUEUE_COPY.startedWaiting.title(2)).toBe("Décider du sort de 2 annonces commencées dont les candidats attendent");
  });
  it("la migration ajoute la file et borne la relance aux gardes à venir", () => {
    const sql = read("drizzle/migrations/0139_adm20_annonces_commencees.sql");
    expect(sql).toContain("'key', 'startedWaiting'");
    expect(sql).toContain("adm20_garde_a_venir");
    expect(sql).toContain("s.start_date::date >= (now() AT TIME ZONE 'Europe/Paris')::date");
    expect(sql).not.toMatch(/\b(DELETE|UPDATE|INSERT)\b/);
  });
});

describe("message type aux candidats", () => {
  const m = startedSitCandidateMessage({ sitterFirstName: "Léa", sitTitle: "Garde de deux chats à Marseille", ownerFirstName: "Camille" });
  it("dit la relance faite, laisse la réponse au propriétaire, sans promesse", () => {
    expect(m.body).toContain("Bonjour Léa,");
    expect(m.body).toContain("nous avons relancé Camille");
    expect(m.body).toContain("La réponse à une candidature appartient au propriétaire");
    expect(m.body).not.toMatch(/nous (allons )?(vous )?(trouver|chercher)/i);
    expect(m.subject + m.body).not.toMatch(/[—–]/);
  });
  it("sans prénoms, le message reste correct", () => {
    const g = startedSitCandidateMessage({ sitTitle: "Garde à Siros" });
    expect(g.body.startsWith("Bonjour,")).toBe(true);
    expect(g.body).toContain("nous avons relancé le propriétaire");
  });
});

describe("menu et mots", () => {
  const nav = read("src/components/admin/AdminSidebar.tsx");
  it("Messages contact et Erreurs au quotidien, Affinité aux outils", () => {
    const daily = nav.slice(nav.indexOf('label: "AU QUOTIDIEN"'), nav.indexOf('label: "CHAQUE SEMAINE"'));
    expect(daily).toContain('"/admin/contact-messages"');
    expect(daily).toContain('"/admin/errors"');
    const weekly = nav.slice(nav.indexOf('label: "CHAQUE SEMAINE"'), nav.indexOf('label: "MEMBRES ET GARDES"'));
    expect(weekly).not.toContain('"/admin/affinity"');
    expect((nav.match(/"\/admin\/errors"/g) ?? []).length).toBe(1);
    expect((nav.match(/"\/admin\/contact-messages"/g) ?? []).length).toBe(1);
    expect((nav.match(/"\/admin\/affinity"/g) ?? []).length).toBe(1);
  });
  it("aucun nom interne à l'écran", () => {
    expect(read("src/pages/admin/AdminTraffic.tsx")).not.toContain("(lot C1)");
    expect(read("src/pages/admin/AdminEmailHealth.tsx")).not.toContain("(email_send_log)");
  });
});
