import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";

/**
 * Lot ADM14 (demande de Jérémie du 09/11/2026 : « il n'y a pas de pastille
 * quand il y a des nouvelles annonces ») : Annonces et Entraide portent un
 * compteur gris des annonces publiées et des besoins déposés depuis la
 * dernière ouverture de leur page. C'est une information, pas une tâche : il
 * ne compte pas dans la pastille rouge de la vue d'ensemble.
 * Repère gardé dans ce navigateur (localStorage, par admin) ; sans repère, les
 * 7 derniers jours.
 */
export type AdminNewsKey = "listings" | "entraide";

export const ADMIN_NEWS_PATHS: Record<AdminNewsKey, string> = {
  listings: "/admin/listings",
  entraide: "/admin/small-missions",
};

export const NEWS_DEFAULT_WINDOW_MS = 7 * 86_400_000;
export const ADMIN_NEWS_SEEN_EVENT = "admin-news-seen";

const storageKey = (k: AdminNewsKey, userId: string) => `admin.news.seen.${k}:${userId}`;

/**
 * Date du repère : dernière ouverture de la page, sinon 7 jours avant
 * maintenant, gardée tout de suite pour que le repère (et la clé de lecture)
 * ne bouge plus d'un affichage à l'autre.
 */
export function readNewsSince(k: AdminNewsKey, userId: string, now: number = Date.now()): string {
  try {
    const v = localStorage.getItem(storageKey(k, userId));
    if (v && !Number.isNaN(Date.parse(v))) return v;
    const first = new Date(now - NEWS_DEFAULT_WINDOW_MS).toISOString();
    localStorage.setItem(storageKey(k, userId), first);
    return first;
  } catch {
    // Sans stockage : repère arrondi à l'heure, stable pendant la visite.
    const hour = Math.floor((now - NEWS_DEFAULT_WINDOW_MS) / 3_600_000) * 3_600_000;
    return new Date(hour).toISOString();
  }
}

/** Page de nouveautés ouverte par ce chemin, s'il y en a une. */
export function newsKeyForPath(pathname: string): AdminNewsKey | null {
  for (const k of Object.keys(ADMIN_NEWS_PATHS) as AdminNewsKey[]) {
    const p = ADMIN_NEWS_PATHS[k];
    if (pathname === p || pathname.startsWith(p + "/")) return k;
  }
  return null;
}

/** Ouvrir la page pose le repère : le compteur s'efface. */
export function markAdminNewsSeen(pathname: string, userId: string | undefined, now: number = Date.now()): void {
  const k = newsKeyForPath(pathname);
  if (!k || !userId) return;
  try { localStorage.setItem(storageKey(k, userId), new Date(now).toISOString()); } catch { /* stockage indisponible */ }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(ADMIN_NEWS_SEEN_EVENT));
}

export interface AdminNews { listings: number; entraide: number }

export async function fetchAdminNews(since: Record<AdminNewsKey, string>): Promise<AdminNews> {
  const [sits, missions] = await Promise.all([
    // Annonces de garde mises en ligne depuis le repère (brouillons exclus par published_at).
    supabase.from("sits").select("id", { count: "exact", head: true })
      .gte("published_at", since.listings)
      .in("status", ["published", "confirmed", "in_progress"]),
    // Besoins d'entraide déposés depuis le repère, visibles.
    supabase.from("small_missions").select("id", { count: "exact", head: true })
      .gte("created_at", since.entraide)
      .eq("mission_type", "besoin")
      .neq("status", "cancelled")
      .is("hidden_at", null)
      .is("moderation_hidden_at", null),
  ]);
  if (sits.error) throw sits.error;
  if (missions.error) throw missions.error;
  return { listings: sits.count ?? 0, entraide: missions.count ?? 0 };
}

/** Texte du compteur : rien à zéro ou en échec (une information, jamais un faux 0 ni un « ? »). */
export function newsText(n: number | undefined): string | null {
  if (!n || n <= 0) return null;
  return n > 99 ? "99+" : String(n);
}

export function newsLabel(k: AdminNewsKey, n: number): string {
  if (k === "listings") return n > 1 ? `${n} nouvelles annonces depuis votre dernière visite` : "1 nouvelle annonce depuis votre dernière visite";
  return n > 1 ? `${n} nouveaux besoins d'entraide depuis votre dernière visite` : "1 nouveau besoin d'entraide depuis votre dernière visite";
}

export function useAdminNews(adminConfirmed?: boolean): Partial<AdminNews> {
  const { user } = useAuth();
  const admin = useAdmin();
  const isAdmin = adminConfirmed ?? (admin.isAdmin && !admin.loading);
  const userId = user?.id;
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const on = () => setTick((t) => t + 1);
    window.addEventListener(ADMIN_NEWS_SEEN_EVENT, on);
    return () => window.removeEventListener(ADMIN_NEWS_SEEN_EVENT, on);
  }, []);
  const since = userId
    ? { listings: readNewsSince("listings", userId), entraide: readNewsSince("entraide", userId) }
    : null;
  const q = useQuery({
    queryKey: ["admin-news", userId, since?.listings, since?.entraide, tick],
    queryFn: () => fetchAdminNews(since!),
    enabled: !!since && isAdmin === true,
    staleTime: 60_000,
    refetchInterval: 120_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
  return q.data ?? {};
}
