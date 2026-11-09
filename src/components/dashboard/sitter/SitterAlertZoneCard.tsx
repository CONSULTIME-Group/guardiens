/**
 * Lot D7 (09/11/2026, audit « Tableaux de bord ordinateur », état G3) : sur
 * l'accueil ordinateur d'un gardien dont la garde ouverte la plus proche est
 * au-delà de 50 km, le pas du moment est sa zone d'alerte. Trois zones au plus
 * (100 km, son département, la France), sans celles qu'il suit déjà, chacune
 * avec son nombre réel de gardes ouvertes (jamais de zéro), un seul bouton
 * plein « Enregistrer ma zone » (create_alert_preference, gardes et nouvelles
 * annonces). Ses zones actuelles restent en place.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import {
  ALERT_ZONE_CTA,
  ALERT_ZONE_FULL,
  ALERT_ZONE_KEEP,
  ALERT_ZONE_TITLE,
  alertZoneDone,
  alertZoneRpcArgs,
  alertZonesFull,
  buildAlertZoneChoices,
  defaultAlertZone,
  type AlertZoneData,
  type AlertZoneKind,
} from "@/lib/alertZoneOptions";

interface Props {
  userId: string;
  data: AlertZoneData;
  nearestKm: number | null;
}

const SECTOR_PATH = "/mon-secteur";

export default function SitterAlertZoneCard({ userId, data, nearestKm }: Props) {
  const choices = useMemo(() => buildAlertZoneChoices(data), [data]);
  const full = alertZonesFull(data);
  const [picked, setPicked] = useState<AlertZoneKind | null>(() => defaultAlertZone(choices));
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [failed, setFailed] = useState<"full" | "error" | null>(null);

  const seen = useRef(false);
  useEffect(() => {
    if (seen.current || choices.length === 0) return;
    seen.current = true;
    try {
      void trackEvent("dashboard_alert_zone_seen", {
        source: "/dashboard",
        metadata: { zones: choices.map((c) => c.kind), counts: choices.map((c) => c.count), nearest_km: nearestKm, full },
      });
    } catch { /* mesure facultative */ }
  }, [choices, nearestKm, full]);

  if (choices.length === 0 && !done) return null;

  const save = async () => {
    const choice = choices.find((c) => c.kind === picked);
    if (!choice || saving) return;
    setSaving(true);
    setFailed(null);
    try {
      const { error } = await supabase.rpc("create_alert_preference", alertZoneRpcArgs(choice.kind, data) as any);
      if (error) {
        setFailed(/Maximum/i.test(String((error as any)?.message ?? "")) ? "full" : "error");
        return;
      }
      // Même geste que l'état sans garde proche : les nouvelles annonces par email.
      await supabase.from("email_preferences").upsert({ user_id: userId, new_sit_digest: true }, { onConflict: "user_id" });
      setDone(alertZoneDone(choice.scope));
      void trackEvent("sitter_alert_subscribed", {
        source: "dashboard_alert_zone",
        metadata: { type: choice.kind, radius_km: choice.kind === "rayon" ? 100 : null, open_count: choice.count, nearest_km: nearestKm },
      });
    } catch {
      setFailed("error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      aria-labelledby="alert-zone-title"
      data-testid="sitter-alert-zone"
      className="bg-card rounded-[22px] px-[22px] py-[26px] md:px-[34px] md:py-[30px]"
      style={{ boxShadow: "0 1px 2px rgba(29,27,22,0.04), 0 12px 32px rgba(29,27,22,0.07)" }}
    >
      <div className="flex items-center gap-[8px]">
        <span aria-hidden="true" className="inline-block bg-secondary" style={{ width: "20px", height: "2px" }} />
        <p className="text-secondary uppercase" style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.16em" }}>
          Votre zone d'alerte
        </p>
      </div>
      <h2 id="alert-zone-title" className="font-heading text-foreground mt-[8px] text-[22px] font-semibold leading-tight">
        {ALERT_ZONE_TITLE}
      </h2>

      {done ? (
        <div className="mt-[16px]" role="status" data-testid="sitter-alert-zone-done">
          <p className="text-[14.5px] text-foreground">{done}</p>
          <Link to={SECTOR_PATH} className="mt-[10px] inline-block text-primary text-[13.5px] font-semibold hover:underline underline-offset-4">
            Gérer mes zones d'alerte
          </Link>
        </div>
      ) : full ? (
        <div className="mt-[16px]">
          <p className="text-[14px] text-muted-foreground">{ALERT_ZONE_FULL}</p>
          <Link
            to={SECTOR_PATH}
            className="mt-[14px] inline-flex min-h-[44px] items-center rounded-full border border-primary px-[18px] text-[14px] font-semibold text-primary hover:bg-primary/5"
          >
            Ouvrir Mon secteur
          </Link>
        </div>
      ) : (
        <>
          <fieldset className="mt-[16px]">
            <legend className="sr-only">Zone d'alerte</legend>
            <div className="flex flex-col gap-[10px]">
              {choices.map((c) => (
                <label
                  key={c.kind}
                  className={`flex min-h-[48px] cursor-pointer items-center gap-[12px] rounded-[14px] border px-[16px] py-[10px] ${
                    picked === c.kind ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <input
                    type="radio"
                    name="alert-zone"
                    value={c.kind}
                    checked={picked === c.kind}
                    onChange={() => setPicked(c.kind)}
                    className="h-4 w-4 accent-[hsl(var(--primary))]"
                  />
                  <span className="flex-1 text-[14.5px] font-semibold text-foreground">{c.label}</span>
                  {c.countLine && <span className="text-[13px] text-muted-foreground tabular-nums">{c.countLine}</span>}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-[18px] flex flex-wrap items-center gap-x-[16px] gap-y-[8px]">
            <button
              type="button"
              onClick={save}
              disabled={!picked || saving}
              data-testid="sitter-alert-zone-save"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary px-[18px] text-[14px] font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? "Enregistrement…" : ALERT_ZONE_CTA}
            </button>
            <span className="text-[12.5px] text-muted-foreground">{ALERT_ZONE_KEEP}</span>
          </div>
          {failed && (
            <p role="alert" className="mt-[12px] text-[13.5px] text-destructive">
              {failed === "full" ? ALERT_ZONE_FULL : "L'enregistrement a échoué. Réessayez dans un instant."}
            </p>
          )}
        </>
      )}
    </section>
  );
}
