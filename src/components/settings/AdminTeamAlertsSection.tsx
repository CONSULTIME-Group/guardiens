import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { TEAM_ALERTS, TEAM_ALERT_DEFAULTS, readTeamAlertPrefs, type TeamAlertKey, type TeamAlertPrefs } from "@/lib/admin/teamAlerts";

/**
 * Lot ADM22 : alertes de l'équipe. Visible des comptes admin seulement.
 * Chaque interrupteur vaut un email immédiat à l'adresse du compte.
 */
export default function AdminTeamAlertsSection() {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const [prefs, setPrefs] = useState<TeamAlertPrefs>(TEAM_ALERT_DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [savingKey, setSavingKey] = useState<TeamAlertKey | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let current = true;
    setLoaded(false); setMessage("");
    if (!user?.id || !isAdmin) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table absente des types générés
    (supabase as any).from("admin_alert_preferences")
      .select("contact_email, suspicious_email, health_email")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }: { data: Record<string, unknown> | null; error: unknown }) => {
        if (!current) return;
        if (error) setMessage("Vos alertes n'ont pas pu être lues. Rechargez la page dans un instant.");
        else { setPrefs(readTeamAlertPrefs(data)); setLoaded(true); }
      });
    return () => { current = false; };
  }, [user?.id, isAdmin]);

  if (!user?.id || !isAdmin) return null;

  const save = async (key: TeamAlertKey, value: boolean) => {
    const previous = prefs;
    const next = { ...prefs, [key]: value };
    setPrefs(next); setSavingKey(key); setMessage("");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table absente des types générés
    const { error } = await (supabase as any).from("admin_alert_preferences")
      .upsert({ user_id: user.id, ...next, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    setSavingKey(null);
    if (error) { setPrefs(previous); setMessage("Ce réglage n'a pas pu être enregistré. Réessayez dans un instant."); }
  };

  return (
    <div data-testid="admin-team-alerts" className="mb-8 rounded-xl border border-border bg-muted/30 p-4">
      <div className="mb-3 flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="font-heading text-lg font-semibold">Alertes de l'équipe</h2>
          <p className="text-sm text-muted-foreground">
            Réservé à l'équipe Guardiens. Un email immédiat à {user.email ?? "votre adresse de compte"}, en plus du point du matin.
          </p>
        </div>
      </div>
      <div className="space-y-3">
        {TEAM_ALERTS.map(({ key, label, hint }) => (
          <div key={key} className="flex min-h-[44px] items-center justify-between gap-3">
            <div className="min-w-0">
              <Label htmlFor={`team-alert-${key}`} className="text-sm">
                {label}
                {savingKey === key && <span className="ml-2 text-xs text-muted-foreground">Enregistrement…</span>}
              </Label>
              <p className="text-xs text-muted-foreground">{hint}</p>
            </div>
            <Switch
              id={`team-alert-${key}`}
              data-testid={`team-alert-${key}`}
              checked={prefs[key]}
              disabled={!loaded || savingKey !== null}
              onCheckedChange={(v) => save(key, v)}
            />
          </div>
        ))}
      </div>
      {message && <p role="status" className="mt-3 text-sm text-destructive">{message}</p>}
    </div>
  );
}
