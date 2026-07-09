/**
 * Statut de l'étape d'onboarding "affinité" pour l'utilisateur courant.
 *
 * Regarde les champs cibles côté gardien et côté propriétaire selon le rôle
 * du profil. L'étape est requise si au moins un jeu de champs du rôle
 * concerné est incomplet. Rôle "both" = les deux jeux doivent être remplis.
 *
 * Renvoie aussi la date d'inscription (`profileCreatedAt`) pour permettre au
 * garde-fou global de restreindre la redirection aux nouveaux inscrits
 * (comptes créés après la date de bascule `applies_since` du flag).
 *
 * Utilisé par le garde-fou global (`OnboardingGate`) et par la page
 * `/onboarding/affinity` pour savoir quels blocs afficher.
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface AffinityOnboardingStatus {
  loading: boolean;
  role: "owner" | "sitter" | "both" | null;
  needsSitter: boolean;
  needsOwner: boolean;
  /** Doit-on afficher l'étape ? true si au moins un des deux jeux est incomplet. */
  needsOnboarding: boolean;
  /** Date d'inscription du compte (ISO), pour scoper le garde aux nouveaux. */
  profileCreatedAt: string | null;
  /** Rechargement à la volée (après enregistrement). */
  refresh: () => Promise<void>;
}

async function loadStatus(userId: string, role: string | null) {
  const [sitterRes, ownerRes, profileRes] = await Promise.all([
    supabase
      .from("sitter_profiles")
      .select("animal_types, work_during_sit, sitter_type")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("owner_profiles")
      .select("presence_expected, preferred_sitter_types")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("created_at")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  const sitter = sitterRes.data as { animal_types?: string[] | null; work_during_sit?: string | null; sitter_type?: string | null } | null;
  const owner = ownerRes.data as { presence_expected?: string | null; preferred_sitter_types?: string[] | null } | null;
  const profile = profileRes.data as { created_at?: string | null } | null;

  const sitterComplete =
    !!sitter &&
    (sitter.animal_types?.length ?? 0) > 0 &&
    !!sitter.work_during_sit &&
    !!sitter.sitter_type;

  const ownerComplete =
    !!owner &&
    !!owner.presence_expected &&
    (owner.preferred_sitter_types?.length ?? 0) > 0;

  const isSitter = role === "sitter" || role === "both";
  const isOwner = role === "owner" || role === "both";

  return {
    needsSitter: isSitter && !sitterComplete,
    needsOwner: isOwner && !ownerComplete,
    profileCreatedAt: profile?.created_at ?? null,
  };
}

export function useAffinityOnboardingStatus(): AffinityOnboardingStatus {
  const { user } = useAuth();
  const role = (user?.role ?? null) as "owner" | "sitter" | "both" | null;
  const [state, setState] = useState({
    loading: !!user,
    needsSitter: false,
    needsOwner: false,
    profileCreatedAt: null as string | null,
  });

  const refresh = async () => {
    if (!user) {
      setState({ loading: false, needsSitter: false, needsOwner: false, profileCreatedAt: null });
      return;
    }
    const s = await loadStatus(user.id, role);
    setState({ loading: false, ...s });
  };

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setState({ loading: false, needsSitter: false, needsOwner: false, profileCreatedAt: null });
      return;
    }
    setState((prev) => ({ ...prev, loading: true }));
    loadStatus(user.id, role)
      .then((s) => { if (!cancelled) setState({ loading: false, ...s }); })
      .catch(() => { if (!cancelled) setState({ loading: false, needsSitter: false, needsOwner: false, profileCreatedAt: null }); });
    return () => { cancelled = true; };
  }, [user, role]);

  return {
    ...state,
    role,
    needsOnboarding: state.needsSitter || state.needsOwner,
    refresh,
  };
}
