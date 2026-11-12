import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { OUTING_ALERT_COPY, OUTING_ALERT_RADII } from "@/lib/outings";
import { fetchMyOutingAlertPreference, saveMyOutingAlertPreference, type OutingAlertPreference } from "@/lib/outingsData";
import { trackEvent } from "@/lib/analytics";

/**
 * Lot SORT4 : réglage de l'alerte « nouvelle sortie » dans Paramètres, Alertes.
 * Chaque geste s'enregistre aussitôt, l'ancien réglage revient si l'écriture échoue.
 */
const OutingAlertsCard = ({ postalCode }: { postalCode: string | null }) => {
  const [pref, setPref] = useState<OutingAlertPreference | null>(null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchMyOutingAlertPreference().then((p) => {
      if (cancelled) return;
      if (p) setPref(p); else setFailed(true);
    });
    return () => { cancelled = true; };
  }, []);

  const save = async (next: OutingAlertPreference) => {
    if (!pref || saving) return;
    const previous = pref;
    setPref(next);
    setSaving(true);
    const ok = await saveMyOutingAlertPreference(next);
    setSaving(false);
    if (!ok) { setPref(previous); toast.error(OUTING_ALERT_COPY.failed); return; }
    toast.success(OUTING_ALERT_COPY.saved);
    trackEvent("outing_alert_setting_changed", { metadata: { enabled: next.enabled, radius: next.radius } });
  };

  if (failed) return null;
  return (
    <section className="mb-8 rounded-2xl border border-border bg-card p-4" data-testid="outing-alerts-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold">{OUTING_ALERT_COPY.title}</h2>
          <p className="text-sm text-muted-foreground">{OUTING_ALERT_COPY.subtitle}</p>
        </div>
        {pref ? (
          <Switch
            id="outing-alerts-switch"
            aria-label={OUTING_ALERT_COPY.switchLabel}
            checked={pref.enabled}
            disabled={saving}
            onCheckedChange={(v) => save({ ...pref, enabled: v })}
          />
        ) : <Skeleton className="h-6 w-11 rounded-full" />}
      </div>
      {pref?.enabled && (
        <div className="mt-4 flex flex-col gap-2">
          <p id="outing-alerts-distance" className="text-sm font-semibold">{OUTING_ALERT_COPY.distance}</p>
          <div role="radiogroup" aria-labelledby="outing-alerts-distance" className="grid grid-cols-3 gap-1.5">
            {OUTING_ALERT_RADII.map((r) => (
              <button
                key={r.value}
                type="button"
                role="radio"
                aria-checked={pref.radius === r.value}
                disabled={saving}
                onClick={() => pref.radius !== r.value && save({ ...pref, radius: r.value })}
                className={`h-12 rounded-xl border text-sm ${pref.radius === r.value ? "border-primary bg-primary/10 font-semibold text-primary" : "border-input bg-card font-medium"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <p className="text-[13px] leading-relaxed text-muted-foreground">{OUTING_ALERT_COPY.quartierHelp(postalCode)}</p>
          <p className="text-[13px] leading-relaxed text-muted-foreground">{OUTING_ALERT_COPY.rhythm}</p>
        </div>
      )}
    </section>
  );
};

export default OutingAlertsCard;
