/**
 * Lot RCH5 (14/11/2026, arène « page Recherche », plan v3 corrigé, PR 5).
 *
 * Ligne d'alerte de la liste des gardes. Elle ne dit que ce qui arrivera
 * vraiment (décision 2 de Jérémie, « ligne d'alerte toujours vraie ») :
 *  - état lu par my_alert_email_state() (migration 0163) : « off », rien ne
 *    part, la ligne est masquée ; « digest », rythme espacé, la ligne renvoie
 *    aux préférences email ; « immediate », un email part à la publication ;
 *  - le ciblage mesure la distance depuis chez le gardien
 *    (notify-sitters-on-publish), d'où « de chez vous », jamais la ville
 *    cherchée ;
 *  - rayon proposé selon la distance déclarée (décision 3) : 30, 50 ou 100 km.
 * Visiteur : invitation à créer un compte gardien, sans promesse de rythme.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { ALLOWED_ALERT_RADII, proposedAlertRadius } from "@/lib/alertRadius";

type EmailState = "immediate" | "digest" | "off";

interface Props {
  userId: string | null;
  /** Adresse d'inscription du visiteur (retour à la recherche). */
  visitorSignupHref: string | null;
  /** Distance déclarée par le gardien (rayon de mobilité), null si silence. */
  declaredRadiusKm: number | null;
  /** Ville du profil, libellé de la zone créée. */
  homeCity: string | null;
}

export const alertLineText = {
  visitor: "Recevez par email les nouvelles gardes près de chez vous.",
  visitorCta: "Créer mon compte gardien",
  offer: (r: number) => `Recevez par email les nouvelles gardes à moins de ${r} km de chez vous, dès leur publication.`,
  current: (r: number) => `Vos alertes : les nouvelles gardes à moins de ${r} km de chez vous, dès leur publication.`,
  digest: "Vos alertes partent une fois par semaine.",
  digestCta: "Préférences email",
  cta: (r: number) => `Recevoir jusqu'à ${r} km`,
  done: (r: number) => `Zone enregistrée. Les nouvelles gardes à moins de ${r} km de chez vous arrivent par email, dès leur publication.`,
};

/** Rayon proposé au-delà de la zone actuelle : le proposé s'il est plus large, sinon le palier suivant. */
export function nextAlertRadius(currentKm: number | null, proposedKm: number): number | null {
  if (currentKm == null) return proposedKm;
  if (proposedKm > currentKm) return proposedKm;
  const next = (ALLOWED_ALERT_RADII as readonly number[]).find((r) => r >= 30 && r > currentKm);
  return next ?? null;
}

const lineCls = "my-8 flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-primary/20 bg-primary/[0.04] px-4 py-4 sm:px-5";
const ctaCls = "inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60";

export default function AlertActionLine({ userId, visitorSignupHref, declaredRadiusKm, homeCity }: Props) {
  const [state, setState] = useState<EmailState | null>(null);
  const [currentKm, setCurrentKm] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const [stateRes, zonesRes] = await Promise.all([
          supabase.rpc("my_alert_email_state" as any),
          supabase
            .from("alert_preferences")
            .select("radius_km")
            .eq("user_id", userId)
            .eq("active", true)
            .eq("zone_type", "rayon")
            .contains("alert_types", ["gardes"]),
        ]);
        if (cancelled) return;
        const s = (stateRes as any)?.data;
        setState(s === "immediate" || s === "digest" ? s : "off");
        const radii = ((zonesRes as any)?.data ?? []).map((z: any) => Number(z.radius_km)).filter((n: number) => Number.isFinite(n) && n > 0);
        setCurrentKm(radii.length > 0 ? Math.max(...radii) : null);
      } catch {
        if (!cancelled) setState("off");
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (!userId) {
    if (!visitorSignupHref) return null;
    return (
      <div className={lineCls} data-testid="alert-action-line" data-state="visitor">
        <p className="flex-1 text-[14px] text-foreground">{alertLineText.visitor}</p>
        <Link to={visitorSignupHref} className={ctaCls}>{alertLineText.visitorCta}</Link>
      </div>
    );
  }
  if (state === null || state === "off") return null;

  if (state === "digest") {
    return (
      <div className={lineCls} data-testid="alert-action-line" data-state="digest">
        <p className="flex-1 text-[14px] text-foreground">{alertLineText.digest}</p>
        <Link to="/email-preferences" className={ctaCls}>{alertLineText.digestCta}</Link>
      </div>
    );
  }

  const proposed = proposedAlertRadius(declaredRadiusKm);
  const target = nextAlertRadius(currentKm, proposed);

  const save = async () => {
    if (!target || saving) return;
    setSaving(true);
    setFailed(false);
    try {
      const place = (homeCity || "").trim();
      const { error } = await supabase.rpc("create_alert_preference", {
        p_label: place ? `Gardes · ${place} · ${target} km` : `Gardes · ${target} km de chez moi`,
        p_zone_type: "rayon",
        p_city: place || null,
        p_postal_code: null,
        p_radius_km: target,
        p_departement: null,
        p_region_code: null,
        p_alert_types: ["gardes"],
        p_heure_envoi: "08:00",
        p_frequence: "quotidien",
      });
      if (error) { setFailed(true); return; }
      setDone(target);
      setCurrentKm(target);
      void trackEvent("sitter_alert_subscribed", { source: "search_alert_line", metadata: { radius_km: target, previous_km: currentKm, declared_km: declaredRadiusKm } });
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className={lineCls} data-testid="alert-action-line" data-state="done" role="status">
        <p className="flex-1 text-[14px] text-foreground">{alertLineText.done(done)}</p>
      </div>
    );
  }

  return (
    <div className={lineCls} data-testid="alert-action-line" data-state={currentKm ? "current" : "offer"}>
      <p className="flex-1 text-[14px] text-foreground">
        {currentKm ? alertLineText.current(currentKm) : alertLineText.offer(target ?? proposed)}
        {failed && <span className="block mt-1 text-[13px] text-destructive">La zone n'a pas pu être enregistrée. Réessayez depuis Mon secteur.</span>}
      </p>
      {target && (
        <button type="button" onClick={save} disabled={saving} className={ctaCls}>
          {alertLineText.cta(target)}
        </button>
      )}
    </div>
  );
}
