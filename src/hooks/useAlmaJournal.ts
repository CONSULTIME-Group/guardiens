/**
 * Charge les faits du dossier et construit la page du jour d'Alma (lot Y).
 *
 * Tout est déterministe et lu en base, aucun appel au modèle. Le calcul des
 * entrées vit dans `src/lib/alma/journal.ts`, testé à part.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeptCode } from "@/lib/departments";
import {
  buildAlmaJournal,
  type AlmaJournalFacts,
  type AlmaJournalPage,
  type AlmaJournalRuleKey,
} from "@/lib/alma/journal";
import { useProfileCompletionMissing } from "@/hooks/useProfileCompletionMissing";

const EMPTY_PAGE: AlmaJournalPage = { entries: [], invitation: null };

const WEEKDAYS = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
];

const daysBetween = (iso: string | null): number | null => {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / 86400000);
};

export interface UseAlmaJournalResult {
  page: AlmaJournalPage;
  markActed: (ruleKey: AlmaJournalRuleKey) => void;
}

export function useAlmaJournal(
  userId: string | undefined,
  activeRole: "owner" | "sitter",
  enabled: boolean,
): UseAlmaJournalResult {
  const [page, setPage] = useState<AlmaJournalPage>(EMPTY_PAGE);
  const completion = useProfileCompletionMissing(activeRole, enabled ? userId : undefined);
  const topMissing = useMemo(() => {
    const item = [...completion.missing].sort((a, b) => b.points - a.points)[0];
    return item ? { label: item.label, points: item.points, href: item.href } : null;
  }, [completion.missing]);

  useEffect(() => {
    if (!enabled || !userId) {
      setPage(EMPTY_PAGE);
      return;
    }
    let cancelled = false;

    const load = async () => {
      try {
        const facts: AlmaJournalFacts = { activeRole, topMissing };

        // Historique d'affichage : fraîcheur et actions suivies.
        const { data: history } = await supabase
          .from("alma_journal_shown")
          .select("rule_key, shown_on, acted_at")
          .eq("user_id", userId)
          .order("shown_on", { ascending: false })
          .limit(60);

        const rows = history ?? [];
        const threeDaysAgo = new Date(Date.now() - 3 * 86400000)
          .toISOString()
          .slice(0, 10);
        facts.shownRecently = rows
          .filter((r) => r.shown_on >= threeDaysAgo)
          .map((r) => r.rule_key as AlmaJournalRuleKey);
        facts.actedKeys = rows
          .filter((r) => r.acted_at)
          .map((r) => r.rule_key as AlmaJournalRuleKey);

        const envieRows = rows.filter((r) => r.rule_key === "envie_benevolat");
        facts.envieIgnoredCount = envieRows.filter((r) => !r.acted_at).length;
        facts.envieDaysSinceLastShown = envieRows[0]
          ? daysBetween(`${envieRows[0].shown_on}T00:00:00Z`)
          : null;

        // Variation des formulations, stable sur la journée.
        facts.variantSeed = Math.floor(Date.now() / 86400000);

        const { data: profile } = await supabase
          .from("profiles")
          .select("postal_code")
          .eq("id", userId)
          .maybeSingle();

        if (activeRole === "owner") {
          const [{ data: sits }, { data: properties }] = await Promise.all([
            supabase
              .from("sits")
              .select("id, status, published_at, created_at, property_id")
              .eq("user_id", userId)
              .in("status", ["draft", "published"])
              .order("created_at", { ascending: false })
              .limit(20),
            supabase
              .from("properties")
              .select("id, photos, region_highlights")
              .eq("user_id", userId),
          ]);

          const publishedSits = (sits ?? []).filter((s) => s.status === "published");
          const sitIds = publishedSits.map((s) => s.id);

          if (sitIds.length > 0) {
            const { data: applications } = await supabase
              .from("applications")
              .select("id, sit_id, viewed_at")
              .in("sit_id", sitIds);
            const apps = applications ?? [];
            facts.unreadApplications = apps.filter((a) => !a.viewed_at).length;

            const withApplication = new Set(apps.map((a) => a.sit_id));
            const silent = publishedSits
              .filter((s) => !withApplication.has(s.id))
              .map((s) => daysBetween(s.published_at ?? s.created_at) ?? 0)
              .sort((a, b) => b - a)[0];
            facts.publishedSitWithoutApplicationDays = silent ?? null;
          }

          const usedPropertyId = publishedSits.find((s) => s.property_id)?.property_id
            ?? (sits ?? []).find((s) => s.property_id)?.property_id
            ?? null;
          const property = (properties ?? []).find((p) => p.id === usedPropertyId)
            ?? (properties ?? [])[0]
            ?? null;
          if (property) {
            const photos = Array.isArray(property.photos) ? property.photos : [];
            facts.propertyPhotoCount = photos.length;
            facts.regionHighlightsLength = (property.region_highlights ?? "").trim().length;
          }

          const draft = (sits ?? []).find(
            (s) => s.status === "draft" && (daysBetween(s.created_at) ?? 0) > 3,
          );
          facts.draftSitWeekday = draft
            ? WEEKDAYS[new Date(draft.created_at).getDay()]
            : null;

        } else {
          const { data: applications } = await supabase
            .from("applications")
            .select("id, status, created_at, sits(city)")
            .eq("sitter_id", userId)
            .eq("status", "pending")
            .order("created_at", { ascending: true })
            .limit(10);
          const waiting = (applications ?? [])
            .map((a) => ({
              city: ((a as { sits?: { city?: string | null } | null }).sits?.city) ?? null,
              days: daysBetween(a.created_at) ?? 0,
            }))
            .sort((a, b) => b.days - a.days)[0];
          facts.pendingApplication = waiting ?? null;

        }

        // Envie d'Alma : une association publiée dans le département, et
        // aucune déclaration de bénévolat encore remplie.
        const dept = getDeptCode(profile?.postal_code ?? null);
        if (dept) {
          const { data: volunteer } = await supabase
            .from("volunteer_availability")
            .select("user_id")
            .eq("user_id", userId)
            .maybeSingle();
          if (!volunteer) {
            const { data: association } = await supabase
              .from("animal_associations")
              .select("name, slug")
              .eq("status", "published")
              .eq("departement_code", dept)
              .limit(1)
              .maybeSingle();
            facts.association = association
              ? { name: association.name, slug: association.slug }
              : null;
          }
        }

        const built = buildAlmaJournal(facts);
        if (cancelled) return;
        setPage(built);

        if (built.entries.length > 0) {
          const today = new Date().toISOString().slice(0, 10);
          await supabase.from("alma_journal_shown").upsert(
            built.entries.map((entry) => ({
              user_id: userId,
              rule_key: entry.ruleKey,
              shown_on: today,
            })),
            { onConflict: "user_id,rule_key,shown_on", ignoreDuplicates: true },
          );
        }
      } catch {
        // Silencieux : sans page du jour, le panneau garde son ouverture habituelle.
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [activeRole, enabled, topMissing, userId]);

  const markActed = useCallback(
    (ruleKey: AlmaJournalRuleKey) => {
      if (!userId) return;
      const today = new Date().toISOString().slice(0, 10);
      void supabase
        .from("alma_journal_shown")
        .update({ acted_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("rule_key", ruleKey)
        .eq("shown_on", today);
    },
    [userId],
  );

  return { page, markActed };
}
