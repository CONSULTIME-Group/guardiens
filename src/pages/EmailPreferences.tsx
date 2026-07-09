import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type Prefs = {
  product_emails: boolean;
  digest_emails: boolean;
  alert_emails: boolean;
  new_mission_digest: boolean;
  nearby_daily_digest: boolean;
  nearby_daily_radius_km: 5 | 15 | 30;
};

const EmailPreferences = () => {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({
    product_emails: true,
    digest_emails: true,
    alert_emails: true,
    new_mission_digest: true,
    nearby_daily_digest: true,
    nearby_daily_radius_km: 15,
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("email_preferences")
        .select("product_emails, digest_emails, alert_emails, new_mission_digest, nearby_daily_digest, nearby_daily_radius_km")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setPrefs({
        product_emails: data.product_emails ?? true,
        digest_emails: data.digest_emails ?? true,
        alert_emails: data.alert_emails ?? true,
        new_mission_digest: (data as any).new_mission_digest ?? true,
        nearby_daily_digest: (data as any).nearby_daily_digest ?? true,
        nearby_daily_radius_km: ((data as any).nearby_daily_radius_km ?? 15) as 5 | 15 | 30,
      });
      setLoading(false);
    })();
  }, [user]);

  if (!authLoading && !user) return <Navigate to="/login" replace />;

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.rpc("upsert_my_email_preferences", {
      p_product: prefs.product_emails,
      p_digest: prefs.digest_emails,
      p_alert: prefs.alert_emails,
      p_new_mission_digest: prefs.new_mission_digest,
      p_nearby_daily_digest: prefs.nearby_daily_digest,
      p_nearby_daily_radius_km: prefs.nearby_daily_radius_km,
    } as any);
    setSaving(false);
    if (error) toast.error("Impossible d'enregistrer vos préférences");
    else toast.success("Préférences enregistrées");
  };

  return (
    <div className="min-h-screen bg-background py-6 md:py-10 px-4">
      <Helmet>
        <title>Préférences email, Guardiens</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <h1 className="font-heading text-2xl md:text-3xl mb-2">Préférences email</h1>
          <p className="text-muted-foreground">
            Choisissez les types d'emails que vous souhaitez recevoir. Les emails essentiels
            (confirmations de garde, identité, sécurité) restent toujours envoyés.
          </p>
        </header>

        {loading || authLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Emails essentiels</CardTitle>
                <CardDescription>
                  Confirmations de garde, vérification d'identité, annulations, réponses directes,
                  rappels d'abonnement. Ces emails sont indispensables et ne peuvent pas être désactivés.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Switch checked disabled aria-label="Emails essentiels (toujours actifs)" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">Conseils & accompagnement</CardTitle>
                  <CardDescription>
                    Conseils pour publier votre annonce, complétion de profil, rappels d'avis.
                  </CardDescription>
                </div>
                <Switch
                  checked={prefs.product_emails}
                  onCheckedChange={(v) => setPrefs((p) => ({ ...p, product_emails: v }))}
                />
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">Alertes nouvelles annonces</CardTitle>
                  <CardDescription>
                    Notifications dès qu'une nouvelle garde apparaît dans une de vos zones d'alerte.
                  </CardDescription>
                </div>
                <Switch
                  checked={prefs.alert_emails}
                  onCheckedChange={(v) => setPrefs((p) => ({ ...p, alert_emails: v }))}
                />
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">Récapitulatifs</CardTitle>
                  <CardDescription>
                    Synthèses périodiques de votre activité (à venir).
                  </CardDescription>
                </div>
                <Switch
                  checked={prefs.digest_emails}
                  onCheckedChange={(v) => setPrefs((p) => ({ ...p, digest_emails: v }))}
                />
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">Digest quotidien entraide</CardTitle>
                  <CardDescription>
                    Chaque soir, jusqu'à 3 nouvelles petites missions publiées dans les 24h
                    dans un rayon de 30 km autour de chez vous. L'entraide reste gratuite.
                  </CardDescription>
                </div>
                <Switch
                  checked={prefs.new_mission_digest}
                  onCheckedChange={(v) => setPrefs((p) => ({ ...p, new_mission_digest: v }))}
                />
              </CardHeader>
            </Card>


            <div className="flex justify-end">
              <Button onClick={save} disabled={saving} className="h-11 md:h-auto">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enregistrer mes préférences
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EmailPreferences;
