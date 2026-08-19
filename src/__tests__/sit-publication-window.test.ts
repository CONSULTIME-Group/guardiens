import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import {
  isWithinPublicationWindow,
  publicationWindowOrClause,
} from "../../supabase/functions/_shared/sit-publication-window";

/**
 * Garde-fou du constat du 19/08/2026 : les digests filtraient les annonces
 * sur created_at. Une annonce restée en brouillon puis publiée plus de 24 h
 * après création n'entrait jamais dans la fenêtre (quatre annonces du 18/08
 * invisibles). La clé de vérité est published_at, avec repli created_at.
 */

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
const SINCE_24H = hoursAgo(24);

describe("fenêtre de publication des annonces", () => {
  it("le cas exact du 19/08 : créée il y a 45 jours, publiée il y a 2 heures, entre dans la fenêtre", () => {
    const sit = { created_at: hoursAgo(24 * 45), published_at: hoursAgo(2) };
    expect(isWithinPublicationWindow(sit, SINCE_24H)).toBe(true);
  });

  it("une annonce publiée il y a plus de 24 h n'entre pas", () => {
    const sit = { created_at: hoursAgo(24 * 45), published_at: hoursAgo(30) };
    expect(isWithinPublicationWindow(sit, SINCE_24H)).toBe(false);
  });

  it("repli sur created_at quand published_at est nul (historique)", () => {
    expect(isWithinPublicationWindow({ created_at: hoursAgo(2), published_at: null }, SINCE_24H)).toBe(true);
    expect(isWithinPublicationWindow({ created_at: hoursAgo(24 * 45), published_at: null }, SINCE_24H)).toBe(false);
  });

  it("sans aucune date, hors fenêtre", () => {
    expect(isWithinPublicationWindow({ created_at: null, published_at: null }, SINCE_24H)).toBe(false);
  });

  it("la clause PostgREST vise published_at avec repli created_at, sans millisecondes", () => {
    const clause = publicationWindowOrClause("2026-08-18T06:35:12.345Z");
    expect(clause).toContain("published_at.gte.2026-08-18T06:35:12Z");
    expect(clause).toContain("and(published_at.is.null,created_at.gte.2026-08-18T06:35:12Z)");
    expect(clause).not.toContain(".345");
  });

  it("send-alert-digest filtre les annonces sur la mise en ligne, pas la création", () => {
    const src = readFileSync("supabase/functions/send-alert-digest/index.ts", "utf8");
    expect(src).toContain("publicationWindowOrClause(sinceISO)");
    // Un seul filtre created_at doit rester : celui des petites missions,
    // qui n'ont pas de date de publication.
    expect(src.match(/\.gte\("created_at", sinceISO\)/g) ?? []).toHaveLength(1);
  });

  it("send-nearby-daily-digest filtre les annonces sur la mise en ligne, pas la création", () => {
    const src = readFileSync("supabase/functions/send-nearby-daily-digest/index.ts", "utf8");
    expect(src).toContain("publicationWindowOrClause(since)");
    expect(src.match(/\.gte\('created_at', since\)/g) ?? []).toHaveLength(1);
  });
});
