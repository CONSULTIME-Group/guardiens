/**
 * useAlmaMoment, lot A7 : la bulle d'un moment réel ou d'un passage de stade.
 *
 * Une bulle par session au plus, jamais en fréquence « silent » ni en
 * catégorie muette (alma_moment), jamais un moment déjà montré
 * (alma_journal_shown, rule_key « moment:<clé> » ou « stade:<stade> »).
 * La décision vient de planCelebration (module partagé, testé à part).
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyProfile } from "@/lib/myProfile";
import { trackEvent } from "@/lib/analytics";
import {
  BOND_RULE_KEYS,
  planCelebration,
  todayParis,
  type AlmaBond,
  type Celebration,
} from "@/lib/alma/bond";

export const ALMA_MOMENT_SESSION_KEY = "guardiens_alma_moment_shown";

export function almaMomentSessionUsed(): boolean {
  try {
    return typeof window !== "undefined" && window.sessionStorage.getItem(ALMA_MOMENT_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markSessionUsed() {
  try {
    window.sessionStorage.setItem(ALMA_MOMENT_SESSION_KEY, "1");
  } catch {
    // Stockage indisponible : la mémoire de la page suffit.
  }
}

interface Options {
  userId: string | null;
  bond: AlmaBond | null;
  frequency: string;
  frequencyLoading?: boolean;
  role: "owner" | "sitter";
  /** La bulle peut s'afficher ici (pastille visible, panneau fermé). */
  enabled: boolean;
}

export function useAlmaMoment({ userId, bond, frequency, frequencyLoading, role, enabled }: Options) {
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [decided, setDecided] = useState(false);

  useEffect(() => {
    if (decided || !enabled || !userId || !bond || frequencyLoading) return;
    let alive = true;
    void (async () => {
      try {
        const [{ data: rows, error }, profileRes] = await Promise.all([
          supabase
            .from("alma_journal_shown")
            .select("rule_key")
            .eq("user_id", userId)
            .in("rule_key", BOND_RULE_KEYS),
          fetchMyProfile(userId).catch(() => ({ data: null } as any)),
        ]);
        if (!alive || error) return;
        const muted = (profileRes?.data as any)?.alma_muted_categories;
        const today = todayParis();
        const plan = planCelebration({
          bond,
          today,
          shownKeys: (rows ?? []).map((r: any) => r.rule_key as string),
          frequency,
          mutedCategories: Array.isArray(muted) ? muted : [],
          sessionUsed: almaMomentSessionUsed(),
          role,
        });
        setDecided(true);
        const toRecord = [...plan.recordSilently, ...(plan.celebrate ? [plan.celebrate.ruleKey] : [])];
        if (toRecord.length) {
          await supabase.from("alma_journal_shown").upsert(
            toRecord.map((rule_key) => ({ user_id: userId, rule_key, shown_on: today })),
            { onConflict: "user_id,rule_key,shown_on", ignoreDuplicates: true },
          );
        }
        if (!alive || !plan.celebrate) return;
        markSessionUsed();
        setCelebration(plan.celebrate);
        trackEvent("alma_moment_shown", {
          metadata: { rule_key: plan.celebrate.ruleKey, kind: plan.celebrate.kind, stage: bond.stage },
        });
      } catch {
        // Silencieux : sans historique lisible, aucune bulle.
      }
    })();
    return () => { alive = false; };
  }, [bond, decided, enabled, frequency, frequencyLoading, role, userId]);

  // Passage en silence pendant l'affichage : la bulle se retire.
  useEffect(() => {
    if (frequency === "silent") setCelebration(null);
  }, [frequency]);

  const dismiss = useCallback(() => setCelebration(null), []);

  const act = useCallback(() => {
    if (!celebration || !userId) return;
    trackEvent("alma_moment_clicked", {
      metadata: { rule_key: celebration.ruleKey, kind: celebration.kind, href: celebration.action.href },
    });
    void supabase
      .from("alma_journal_shown")
      .update({ acted_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("rule_key", celebration.ruleKey);
    setCelebration(null);
  }, [celebration, userId]);

  return { celebration, dismiss, act };
}
