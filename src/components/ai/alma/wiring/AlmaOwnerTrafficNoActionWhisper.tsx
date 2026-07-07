/**
 * Alma — Trigger owner_traffic_no_action (P1).
 *
 * Composant invisible monté dans OwnerDashboard. Détecte une annonce publiée
 * qui a de la visibilité réelle (views_30d >= seuil) MAIS aucune candidature.
 * Utilise EXCLUSIVEMENT les métriques réelles chargées par
 * `useOwnerDashboardData` (views_30d via RPC get_sit_views_count,
 * applications via jointure sits→applications).
 *
 * Si aucune annonce ne remplit la condition, aucun whisper.
 */
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAlma } from "@/contexts/AlmaContext";
import { buildTrafficNoActionWhisper } from "@/lib/alma/whisper-triggers";
import type { SitRow } from "@/components/dashboard/owner/types";

const MIN_VIEWS_THRESHOLD = 20;

interface Props {
  sits: SitRow[];
}

export function AlmaOwnerTrafficNoActionWhisper({ sits }: Props) {
  const { queueWhisper, canEmit } = useAlma();
  const navigate = useNavigate();
  const firedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!canEmit("owner_traffic_no_action")) return;
    if (!Array.isArray(sits) || sits.length === 0) return;

    // Cible : annonce publiée avec vues réelles >= seuil ET 0 candidature.
    const candidate = sits.find((s) => {
      if (s.status !== "published") return false;
      const views = Number(s.views_30d ?? 0);
      if (!Number.isFinite(views) || views < MIN_VIEWS_THRESHOLD) return false;
      const apps = Array.isArray(s.applications) ? s.applications.length : 0;
      return apps === 0;
    });
    if (!candidate) return;
    if (firedFor.current === candidate.id) return;
    firedFor.current = candidate.id;

    queueWhisper(
      buildTrafficNoActionWhisper({
        views: Number(candidate.views_30d ?? 0),
        onSuggestions: () => navigate(`/sits/${candidate.id}/edit`),
      }),
    );
  }, [sits, canEmit, queueWhisper, navigate]);

  return null;
}

export default AlmaOwnerTrafficNoActionWhisper;
