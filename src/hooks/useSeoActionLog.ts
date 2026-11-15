/**
 * Lot TRF-5 : lecture et écriture du journal des actions SEO (seo_action_log,
 * réservé à l'équipe par les règles de la table).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { reportAdminReadError } from "@/lib/admin/readError";
import type { SeoActionKind, SeoLogEntry, SnapshotPoint } from "@/lib/admin/seoActionLog";

const KEY = ["admin-seo-action-log"];

export function useSeoActionLog() {
  return useQuery({
    queryKey: KEY,
    staleTime: 60_000,
    queryFn: async (): Promise<SeoLogEntry[]> => {
      const { data, error } = await (supabase.from as any)("seo_action_log")
        .select("id, created_at, kind, path, note, before, after")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) { reportAdminReadError("Journal des actions SEO", error); throw error; }
      return (data ?? []) as SeoLogEntry[];
    },
  });
}

export interface LogSeoActionInput { kind: SeoActionKind; path: string; note?: string; before?: Record<string, unknown> }

export function useLogSeoAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: LogSeoActionInput) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await (supabase.from as any)("seo_action_log").insert({
        actor: auth.user?.id ?? null,
        kind: input.kind,
        path: input.path,
        note: input.note ?? null,
        before: input.before ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Relevés Search Console des pages touchées par le journal (clics par fin de période). */
export function useSeoSnapshotPoints(paths: string[]) {
  const sorted = [...new Set(paths)].sort();
  return useQuery({
    queryKey: ["admin-seo-snapshots", sorted],
    enabled: sorted.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<SnapshotPoint[]> => {
      const exact = sorted.filter((p) => !p.endsWith("/*"));
      const prefixes = sorted.filter((p) => p.endsWith("/*")).map((p) => p.slice(0, -1));
      const out: SnapshotPoint[] = [];
      if (exact.length > 0) {
        const { data, error } = await (supabase.from as any)("seo_gsc_snapshots")
          .select("period_end, key, clicks, impressions").eq("kind", "page").in("key", exact).limit(5000);
        if (error) throw error;
        out.push(...((data ?? []) as SnapshotPoint[]));
      }
      for (const prefix of prefixes) {
        const { data, error } = await (supabase.from as any)("seo_gsc_snapshots")
          .select("period_end, key, clicks, impressions").eq("kind", "page").like("key", `${prefix}%`).limit(10000);
        if (error) throw error;
        out.push(...((data ?? []) as SnapshotPoint[]));
      }
      return out;
    },
  });
}
