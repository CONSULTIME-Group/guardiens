/**
 * useAlmaBond, lot A7 : le lien complet avec Alma (stade, date, moments datés,
 * prochain pas), lu à la demande.
 *
 * `enabled` faux : aucune lecture. Le dock l'active hors du tableau de bord ou
 * panneau ouvert, la page /alma pour un membre connecté : le budget de
 * lectures du tableau de bord (lots P1b, P3) reste intact.
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { loadAlmaBond, type AlmaBond } from "@/lib/alma/bond";

export function useAlmaBond(enabled = true): { bond: AlmaBond | null; loading: boolean } {
  const { user, activeRole } = useAuth();
  const uid = user?.id ?? null;
  const role: "owner" | "sitter" = activeRole === "owner" ? "owner" : "sitter";
  const completion = typeof user?.profileCompletion === "number" ? user.profileCompletion : 0;
  const [bond, setBond] = useState<AlmaBond | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !uid) return;
    let alive = true;
    setLoading(true);
    loadAlmaBond(uid, role, completion)
      .then((b) => { if (alive) setBond(b); })
      .catch(() => { /* Sans lien, le dock garde son affichage habituel. */ })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [enabled, uid, role, completion]);

  return { bond: uid ? bond : null, loading };
}
