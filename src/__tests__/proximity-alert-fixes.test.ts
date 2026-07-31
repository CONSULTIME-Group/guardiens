import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  clampRadiusKm,
  MAX_RADIUS_KM,
} from "../../supabase/functions/_shared/proximity-radius";
import { evaluateSitAlert } from "../../supabase/functions/_shared/sit-alert-guard";
import {
  acquireWorkerLock,
  isLockAvailable,
  type LockClientLike,
} from "../../supabase/functions/_shared/worker-lock";

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

describe("Défaut 1, plafond de rayon des diffusions de proximité", () => {
  it("ramène une demande de 800 km à 200 km et signale l'écrêtage", () => {
    const d = clampRadiusKm(800);
    expect(d.radiusKm).toBe(200);
    expect(d.requestedRadiusKm).toBe(800);
    expect(d.clamped).toBe(true);
    expect(MAX_RADIUS_KM).toBe(200);
  });

  it("laisse passer un rayon raisonnable sans écrêtage", () => {
    expect(clampRadiusKm(47)).toEqual({ radiusKm: 47, requestedRadiusKm: 47, clamped: false });
  });

  it("est appliqué côté serveur et remonté dans la réponse", () => {
    const src = read("supabase/functions/send-listing-proximity/index.ts");
    expect(src).toContain("clampRadiusKm");
    expect(src).toContain("radius_clamped");
    expect(src).toContain("requested_radius_km");
    expect(src).not.toContain("Math.min(2000");
  });

  it("est reflété par l'UI admin", () => {
    for (const f of [
      "src/components/admin/ListingProximityCard.tsx",
      "src/components/admin/signals/BroadcastSitDialog.tsx",
    ]) {
      const src = read(f);
      expect(src).toContain("max={MAX_RADIUS_KM}");
      expect(src).toContain("clampRadiusInput");
      expect(src).toContain("Plafonné à");
    }
  });
});

describe("Défaut 2, statut de l'annonce", () => {
  it("bloque une alerte dont l'annonce est passée en cancelled", () => {
    const v = evaluateSitAlert("nearby-sit-alert", "cancelled");
    expect(v.block).toBe(true);
    expect(v.reason).toContain("cancelled");
  });

  it("bloque une annonce disparue et laisse passer une annonce publiée", () => {
    expect(evaluateSitAlert("nearby-sit-alert", null).block).toBe(true);
    expect(evaluateSitAlert("nearby-sit-alert", "published").block).toBe(false);
  });

  it("n'affecte pas les autres templates", () => {
    expect(evaluateSitAlert("application-accepted", "cancelled").block).toBe(false);
  });

  it("contrôle à l'enqueue et au drainage", () => {
    const prox = read("supabase/functions/send-listing-proximity/index.ts");
    expect(prox).toContain("sit_not_published");

    const sender = read("supabase/functions/send-transactional-email/index.ts");
    expect(sender).toContain("isSitStatusGuardedTemplate");
    expect(sender).toContain("evaluateSitAlert");
    expect(sender).toContain("'abandoned'");
  });
});

describe("Défaut 3, lissage global au compte", () => {
  it("la seconde invocation concurrente sort sur lock_held sans envoyer", async () => {
    let held = false;
    const client: LockClientLike = {
      rpc: async (fn) => {
        if (fn === "try_acquire_worker_lock") {
          if (held) return { data: false, error: null };
          held = true;
          return { data: true, error: null };
        }
        held = false;
        return { data: null, error: null };
      },
    };
    expect(await acquireWorkerLock(client)).toBe(true);
    expect(await acquireWorkerLock(client)).toBe(false);
  });

  it("un bail expiré redevient disponible", () => {
    const now = Date.now();
    expect(isLockAvailable(now, null)).toBe(true);
    expect(isLockAvailable(now, new Date(now + 60_000).toISOString())).toBe(false);
    expect(isLockAvailable(now, new Date(now - 1_000).toISOString())).toBe(true);
  });

  it("le worker prend le verrou et le relâche", () => {
    const src = read("supabase/functions/process-mass-email-queue/index.ts");
    expect(src).toContain("acquireWorkerLock");
    expect(src).toContain('skipped: "lock_held"');
    expect(src).toContain("releaseWorkerLock");
  });
});
