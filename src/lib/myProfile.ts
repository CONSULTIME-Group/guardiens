/**
 * Profil du membre connecté, lu une seule fois (lot P1).
 *
 * Une seule lecture `profiles.*` par personne, partagée par tous les écrans
 * membres via le cache React Query (clé ["my-profile", userId], 5 min).
 * Même principe pour sitter_profiles, owner_profiles et public_profiles.
 * Les écritures passent par `patchMyProfileCache` pour garder le cache juste.
 *
 * Hors application (tests unitaires sans client enregistré), chaque appel
 * relit la base : aucun état partagé entre deux tests.
 */
import type { QueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getAppQueryClient } from "@/lib/appQueryClient";

export const MY_PROFILE_STALE_MS = 5 * 60 * 1000;

type Row = Record<string, any>;
type Result = { data: Row | null; error: any };

// Client enregistré par App.tsx (registerAppQueryClient), lu à chaque appel.
const qc = (): QueryClient | null => getAppQueryClient();

type Kind = "my-profile" | "my-sitter-profile" | "my-owner-profile" | "my-public-profile";

const SOURCES: Record<Kind, { table: string; col: string }> = {
  "my-profile": { table: "profiles", col: "id" },
  "my-sitter-profile": { table: "sitter_profiles", col: "user_id" },
  "my-owner-profile": { table: "owner_profiles", col: "user_id" },
  "my-public-profile": { table: "public_profiles", col: "id" },
};

async function readRaw(kind: Kind, userId: string): Promise<Result> {
  const { table, col } = SOURCES[kind];
  const { data, error } = await (supabase.from(table as any) as any)
    .select("*")
    .eq(col, userId)
    .maybeSingle();
  if (error) throw error;
  return { data: (data as Row) ?? null, error: null };
}

async function readCached(kind: Kind, userId: string): Promise<Result> {
  try {
    const client = qc();
    if (!client) return await readRaw(kind, userId);
    return await client.fetchQuery({
      queryKey: [kind, userId],
      queryFn: () => readRaw(kind, userId),
      staleTime: MY_PROFILE_STALE_MS,
    });
  } catch (error) {
    return { data: null, error };
  }
}

export const fetchMyProfile = (userId: string) => readCached("my-profile", userId);
export const fetchMySitterProfile = (userId: string) => readCached("my-sitter-profile", userId);
export const fetchMyOwnerProfile = (userId: string) => readCached("my-owner-profile", userId);
export const fetchMyPublicProfile = (userId: string) => readCached("my-public-profile", userId);

/** Met à jour le cache après une écriture, sans relire la base. */
export function patchMyProfileCache(userId: string, patch: Row, kind: Kind = "my-profile") {
  const client = qc();
  if (!client) return;
  client.setQueryData<Result>([kind, userId], (prev) =>
    prev?.data ? { data: { ...prev.data, ...patch }, error: null } : prev,
  );
}

/** Force la relecture au prochain appel (après une écriture complexe). */
export function invalidateMyProfile(userId: string, kind: Kind = "my-profile") {
  void qc()?.invalidateQueries({ queryKey: [kind, userId] });
}

export function useMyProfile(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["my-profile", userId],
    queryFn: () => readRaw("my-profile", userId as string),
    enabled: !!userId,
    staleTime: MY_PROFILE_STALE_MS,
    select: (r) => r.data,
  });
}
