import { useEffect, useId, useRef, useState } from "react";
import { Car } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { hasTripsAnswer, type TripsColumns } from "@/lib/trips";
import { fetchMySitterProfile, patchMyProfileCache } from "@/lib/myProfile";
import TripsQuestion from "@/components/profile/TripsQuestion";

/**
 * Lot SC3 (10/11/2026, arène claude/arene/2026-11-10-score-completion) : la
 * question des trajets posée au moment où elle change un match, sur une
 * annonce qui demande une voiture et pour un gardien qui n'a jamais répondu.
 * Une réponse en un toucher, écrite aussitôt dans sitter_profiles ; « Plus
 * tard » la fait taire 30 jours sur cet appareil. Rien ne bloque jamais la
 * candidature (doctrine : on trie, on n'élimine jamais).
 */
export const TRIPS_SNOOZE_DAYS = 30;
const snoozeKey = (userId: string) => `guardiens_trips_snooze_${userId}`;

export function isTripsSnoozed(userId: string, now = Date.now()): boolean {
  try {
    const raw = localStorage.getItem(snoozeKey(userId));
    if (!raw) return false;
    const at = Number(raw);
    return Number.isFinite(at) && now - at < TRIPS_SNOOZE_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

export function snoozeTrips(userId: string, now = Date.now()): void {
  try {
    localStorage.setItem(snoozeKey(userId), String(now));
  } catch {
    /* stockage indisponible : la question reviendra, sans gêne */
  }
}

/** La question s'affiche seulement si la voiture est nécessaire et la réponse absente. */
export function shouldAskTrips(carRequired: boolean | null | undefined, cols: Partial<TripsColumns> | null | undefined, userId: string | null | undefined): boolean {
  if (carRequired !== true || !userId) return false;
  if (hasTripsAnswer(cols ?? {})) return false;
  return !isTripsSnoozed(userId);
}

interface Props {
  userId: string;
  carRequired: boolean | null | undefined;
  columns: Partial<TripsColumns> | null | undefined;
  context: "application" | "sit_view";
  sitId?: string;
  onAnswered?: (cols: TripsColumns) => void;
}

const TripsPrompt = ({ userId, carRequired, columns, context, sitId, onAnswered }: Props) => {
  const [visible, setVisible] = useState(() => shouldAskTrips(carRequired, columns, userId));
  const [saved, setSaved] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const seenRef = useRef(false);
  const titleId = useId();

  useEffect(() => {
    if (!saved) setVisible(shouldAskTrips(carRequired, columns, userId));
  }, [carRequired, columns?.has_vehicle, columns?.has_license, userId, saved]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (visible && !seenRef.current) {
      seenRef.current = true;
      void trackEvent("trips_prompt_seen", { metadata: { context, sit_id: sitId ?? null } });
    }
  }, [visible, context, sitId]);

  if (saved) {
    return (
      <p role="status" className="text-xs text-muted-foreground" data-testid="trips-prompt-saved">
        {saved}
      </p>
    );
  }
  if (!visible) return null;

  const answer = async (cols: TripsColumns) => {
    if (cols.has_vehicle === null) return;
    setFailed(false);
    const { data, error } = await supabase
      .from("sitter_profiles")
      .update({ has_license: cols.has_license, has_vehicle: cols.has_vehicle } as any)
      .eq("user_id", userId)
      .select("user_id");
    // Aucune ligne écrite (pas de fiche gardien) : échec dit, jamais un « merci ».
    if (error || !data || data.length === 0) {
      setFailed(true);
      return;
    }
    patchMyProfileCache(userId, { has_license: cols.has_license, has_vehicle: cols.has_vehicle }, "my-sitter-profile");
    void trackEvent("trips_prompt_answered", {
      metadata: { context, sit_id: sitId ?? null, has_vehicle: cols.has_vehicle, has_license: cols.has_license },
    });
    setSaved("Merci, c'est noté sur votre profil.");
    onAnswered?.(cols);
  };

  return (
    <section
      className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2"
      aria-labelledby={context === "application" ? titleId : undefined}
      aria-label={context === "application" ? undefined : "Pour vos trajets sur place"}
      data-testid="trips-prompt"
    >
      {/* Sur la page d'annonce, l'étiquette « Voiture nécessaire sur place »
          dit déjà le besoin : la phrase ne vient qu'à la candidature. */}
      {context === "application" && (
        <p id={titleId} className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Car className="h-4 w-4 text-primary shrink-0" aria-hidden />
          Cette maison demande une voiture sur place.
        </p>
      )}
      <TripsQuestion
        value={columns ?? {}}
        onChange={answer}
        roleLine="Votre réponse rejoint votre profil et compte double sur les annonces où une voiture est nécessaire."
      />
      {failed && <p className="text-xs text-destructive">Enregistrement impossible pour le moment. Réessayez.</p>}
      <button
        type="button"
        className="text-xs text-muted-foreground underline underline-offset-2 min-h-11"
        onClick={() => {
          snoozeTrips(userId);
          setVisible(false);
          void trackEvent("trips_prompt_snoozed", { metadata: { context, sit_id: sitId ?? null } });
        }}
      >
        Plus tard
      </button>
    </section>
  );
};

export default TripsPrompt;

/**
 * Page d'une annonce vue par un gardien connecté (SitterSitView) : la voiture
 * nécessaire se dit en tête du contenu, puis la question des trajets si le
 * gardien n'a jamais répondu. Lecture du profil seulement quand la voiture
 * est nécessaire (cache partagé de src/lib/myProfile.ts).
 */
export const SitCarNeed = ({ carRequired, userId, userRole, sitId }: { carRequired: boolean | null | undefined; userId: string | null | undefined; userRole?: string | null; sitId: string }) => {
  // La question ne vise que les gardiens (rôle sitter ou both).
  const asksTrips = userRole === "sitter" || userRole === "both";
  const [cols, setCols] = useState<TripsColumns | null>(null);
  useEffect(() => {
    if (carRequired !== true || !userId || !asksTrips) return;
    let cancelled = false;
    fetchMySitterProfile(userId)
      .then(({ data }) => {
        if (cancelled) return;
        const sp = (data ?? {}) as Record<string, unknown>;
        setCols({
          has_license: typeof sp.has_license === "boolean" ? sp.has_license : null,
          has_vehicle: typeof sp.has_vehicle === "boolean" ? sp.has_vehicle : null,
        });
      })
      .catch(() => { /* lecture en échec : l'étiquette reste, la question attend */ });
    return () => { cancelled = true; };
  }, [carRequired, userId, asksTrips]);

  if (carRequired !== true) return null;
  return (
    <div className="mt-6 space-y-3" data-testid="sit-car-need">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/20 px-3 py-1.5 text-sm text-foreground">
        <Car className="h-4 w-4" aria-hidden />
        Voiture nécessaire sur place
      </span>
      {userId && asksTrips && cols && (
        <TripsPrompt userId={userId} carRequired columns={cols} context="sit_view" sitId={sitId} onAnswered={setCols} />
      )}
    </div>
  );
};
