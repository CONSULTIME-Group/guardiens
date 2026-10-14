/**
 * Lot A7 : signaux du lien avec Alma côté site.
 *
 * Les annonces, candidatures, coups de main et écussons viennent des lectures
 * partagées du tableau de bord (src/lib/dashboardShared.ts, aucune lecture de
 * plus) ; le reste (échanges avec Alma, garde confirmée, avis, coups de main
 * rendus) vient d'une seule fonction, my_alma_bond_signals, lue à la demande.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  cached,
  fetchMyApplicationsIndex,
  fetchMyBadges,
  fetchMyEmergencyProfileId,
  fetchMySitsFull,
  fetchMySmallMissionsIndex,
} from "@/lib/dashboardShared";
import {
  computeAlmaBond,
  parisDay,
  type AlmaBond,
  type BondServerSignals,
  type BondSignals,
} from "../../../supabase/functions/_shared/alma-bond";

export * from "../../../supabase/functions/_shared/alma-bond";

/** Jour de Paris courant. */
export function todayParis(): string {
  return parisDay(new Date().toISOString()) ?? new Date().toISOString().slice(0, 10);
}

/** Signaux tirés des lectures partagées, sans lecture de plus. */
export async function loadCachedBondSignals(
  userId: string,
  activeRole: "owner" | "sitter",
  profileCompletion: number | null,
): Promise<BondSignals> {
  const [sits, apps, missions, badges, emergencyId] = await Promise.all([
    fetchMySitsFull(userId).catch(() => [] as any[]),
    fetchMyApplicationsIndex(userId).catch(() => []),
    fetchMySmallMissionsIndex(userId).catch(() => []),
    fetchMyBadges(userId).catch(() => []),
    fetchMyEmergencyProfileId(userId).catch(() => null),
  ]);
  return {
    today: todayParis(),
    activeRole,
    profileCompletion,
    ownSits: (sits as any[]).map((s) => ({
      id: s.id,
      status: s.status,
      published_at: s.published_at ?? null,
      created_at: s.created_at ?? null,
      start_date: s.start_date ?? null,
      end_date: s.end_date ?? null,
      applications: Array.isArray(s.applications) ? s.applications : [],
    })),
    sentApplications: (apps as any[]).map((a) => ({
      sit_id: a.sit_id ?? null,
      status: a.status,
      created_at: a.created_at,
      sit: a.sit ? { id: a.sit.id ?? null, status: a.sit.status ?? null, start_date: a.sit.start_date ?? null, end_date: a.sit.end_date ?? null } : null,
    })),
    missions: (missions as any[]).map((m) => ({ id: m.id, status: m.status, created_at: m.created_at ?? null })),
    badges: (badges as any[]).map((b) => ({ created_at: b.created_at ?? null })),
    isEmergencySitter: !!emergencyId,
  };
}

/** Une lecture : my_alma_bond_signals (lot A7). null si la fonction répond en erreur. */
export function fetchBondServerSignals(userId: string): Promise<BondServerSignals | null> {
  return cached(["alma-bond-signals", userId], async () => {
    try {
      const { data, error } = await (supabase as any).rpc("my_alma_bond_signals");
      if (error || !data || typeof data !== "object") return null;
      return data as BondServerSignals;
    } catch {
      return null;
    }
  });
}

/** Lien complet : lectures partagées puis signaux serveur. */
export async function loadAlmaBond(
  userId: string,
  activeRole: "owner" | "sitter",
  profileCompletion: number | null,
): Promise<AlmaBond> {
  const [signals, server] = await Promise.all([
    loadCachedBondSignals(userId, activeRole, profileCompletion),
    fetchBondServerSignals(userId),
  ]);
  return computeAlmaBond({ ...signals, server });
}
