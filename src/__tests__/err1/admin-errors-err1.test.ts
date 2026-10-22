/**
 * Lot ERR1 : lecture des dossiers d'erreur (hors du site, famille, récidive)
 * et brief de correction sans donnée de membre.
 */
import { describe, it, expect } from "vitest";
import {
  presentError,
  hostingNoise,
  errorFamilyKey,
  priorResolutions,
  errorViewStats,
  type ErrorRecord,
} from "@/lib/admin/errorPresentation";
import { buildFixBrief } from "@/lib/admin/errorFixBrief";

const base: ErrorRecord = {
  id: "00000000-0000-4000-8000-000000000001",
  user_id: "11111111-2222-4333-8444-555555555555",
  user_email: "membre@example.com",
  message: "Network non-2xx: 503 POST /__l5e/trackevents",
  stack: "Error: Network non-2xx\n    at https://guardiens.fr/assets/AfterPaintExtras-CnO8SfHe.js:1:11692",
  source: "NetworkErrorMonitor",
  line_no: null,
  col_no: null,
  url: "https://guardiens.fr/petites-missions?city=Annecy",
  user_agent: "Mozilla/5.0",
  severity: "error",
  context: { route: "/petites-missions", method: "POST", url: "/__l5e/trackevents", status: 503, source: "NetworkErrorMonitor" },
  fingerprint: "ul3xds",
  occurrences: 2,
  first_seen_at: "2026-10-21T13:25:59Z",
  last_seen_at: "2026-10-21T13:37:12Z",
  resolved_at: null,
  resolved_by: null,
  admin_notes: null,
  created_at: "2026-10-21T13:25:59Z",
};

describe("lecture des dossiers", () => {
  it("classe la mesure d'audience de l'hébergeur hors du site", () => {
    expect(hostingNoise(base)).toMatch(/hébergeur/);
    const row = presentError(base);
    expect(row.hostingReason).toBeTruthy();
    expect(errorViewStats([row]).hosting).toBe(1);
  });

  it("donne la même famille à deux mises en ligne d'une erreur d'application", () => {
    const a = { ...base, source: null, context: {}, message: "x at /assets/Index-AbCdEf12.js" };
    const b = { ...a, message: "x at /assets/Index-Zz99Yy88.js" };
    expect(errorFamilyKey(a)).toBe(errorFamilyKey(b));
  });

  it("repère une récidive après résolution, jamais l'inverse", () => {
    const fixed = presentError({ ...base, id: "a", resolved_at: "2026-10-22T05:00:00Z", admin_notes: "Ignoré depuis ERR1" });
    const again = presentError({ ...base, id: "b", fingerprint: "zz", first_seen_at: "2026-10-23T08:00:00Z" });
    const older = presentError({ ...base, id: "c", fingerprint: "yy", first_seen_at: "2026-10-20T08:00:00Z" });
    const map = priorResolutions([fixed, again, older]);
    expect(map.get("b")?.admin_notes).toBe("Ignoré depuis ERR1");
    expect(map.has("c")).toBe(false);
  });
});

describe("brief de correction", () => {
  const row = presentError({
    ...base,
    message: "Network non-2xx: 504 POST https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/moderate-content",
    context: {
      route: "/sits/create", method: "POST", status: 504, pg_code: "IDLE_TIMEOUT",
      url: "https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/moderate-content",
      response_body: '{"code":"IDLE_TIMEOUT","message":"contact membre@example.com"}',
    },
  });
  const brief = buildFixBrief([row], { now: new Date("2026-10-22T07:00:00Z") });

  it("donne le dépôt, la méthode et le dossier", () => {
    expect(brief).toContain("CONSULTIME-Group/guardiens");
    expect(brief).toContain("AGENTS.md");
    expect(brief).toContain("[Réseau 504] POST /functions/v1/moderate-content sur /sits/create");
    expect(brief).toContain(base.id);
    expect(brief).toContain("IDLE_TIMEOUT");
  });

  it("ne contient ni email ni identifiant de compte", () => {
    expect(brief).not.toMatch(/membre@example\.com/);
    expect(brief).not.toContain(base.user_id!);
  });

  it("respecte la ponctuation maison", () => {
    expect(brief).not.toMatch(/[–—]/);
  });
});
