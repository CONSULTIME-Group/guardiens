import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import Head from "@/components/seo/Head";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type Radius = 5 | 15 | 30 | 50 | 100;
const RADIUS_OPTIONS: Radius[] = [5, 15, 30, 50, 100];

type SitFrequency = "immediate" | "weekly" | "none";
type MutualAidFrequency = "weekly" | "none";

type Prefs = {
  product_emails: boolean;
  sit_alert_frequency: SitFrequency;
  mutual_aid_frequency: MutualAidFrequency;
  nearby_daily_radius_km: Radius;
};

const SIT_CHOICES: Array<{ value: SitFrequency; label: string; help: string }> = [
  {
    value: "immediate",
    label: "À chaque nouvelle annonce",
    help: "Un email dès qu'une garde correspond à votre secteur.",
  },
  {
    value: "weekly",
    label: "Une fois par semaine",
    help: "Un seul résumé, le mercredi matin.",
  },
  {
    value: "none",
    label: "Jamais",
    help: "Vous consultez les annonces quand vous le souhaitez.",
  },
];

const MUTUAL_AID_CHOICES: Array<{ value: MutualAidFrequency; label: string; help: string }> = [
  {
    value: "weekly",
    label: "Une fois par semaine",
    help: "Les coups de main et les questions ouvertes autour de vous, le mercredi matin.",
  },
  { value: "none", label: "Jamais", help: "Aucun email d'entraide." },
];

function ChoiceRow<T extends string>({
  choices,
  value,
  onChange,
  name,
}: {
  choices: Array<{ value: T; label: string; help: string }>;
  value: T;
  onChange: (v: T) => void;
  name: string;
}) {
  return (
    <div role="radiogroup" aria-label={name} className="space-y-2">
      {choices.map((c) => {
        const selected = value === c.value;
        return (
          <button
            key={c.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(c.value)}
            className={`w-full text-left rounded-lg border px-4 py-3 transition ${
              selected
                ? "border-primary bg-primary/5"
                : "border-input bg-background hover:bg-muted"
            }`}
          >
            <span className="block text-sm font-medium text-foreground">{c.label}</span>
            <span className="block text-xs text-muted-foreground mt-0.5">{c.help}</span>
          </button>
        );
      })}
    </div>
  );
}

const EmailPreferences = () => {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({
    product_emails: true,
    sit_alert_frequency: "immediate",
    mutual_aid_frequency: "weekly",
    nearby_daily_radius_km: 30,
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("email_preferences")
        .select(
          "product_emails, sit_alert_frequency, mutual_aid_frequency, nearby_daily_radius_km",
        )
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setPrefs({
          product_emails: data.product_emails ?? true,
          sit_alert_frequency: ((data as any).sit_alert_frequency ?? "immediate") as SitFrequency,
          mutual_aid_frequency: ((data as any).mutual_aid_frequency ?? "weekly") as MutualAidFrequency,
          nearby_daily_radius_km: ((data as any).nearby_daily_radius_km ?? 30) as Radius,
        });
      }
      setLoading(false);
    })();
  }, [user]);

  if (!authLoading && !user) return <Navigate to="/login" replace />;

  const save = async () => {
    setSaving(true);
    // Les anciens drapeaux restent alimentés, de façon cohérente avec les
    // fréquences choisies, le temps que tous les envois soient migrés.
    const { error } = await supabase.rpc("upsert_my_email_preferences", {
      p_product: prefs.product_emails,
      p_digest: prefs.sit_alert_frequency !== "none" || prefs.mutual_aid_frequency !== "none",
      p_alert: prefs.sit_alert_frequency !== "none",
      p_new_mission_digest: prefs.mutual_aid_frequency !== "none",
      p_nearby_daily_digest: prefs.sit_alert_frequency === "immediate",
      p_nearby_daily_radius_km: prefs.nearby_daily_radius_km,
      p_sit_alert_frequency: prefs.sit_alert_frequency,
      p_mutual_aid_frequency: prefs.mutual_aid_frequency,
    } as any);
    setSaving(false);
    if (error) toast.error("Impossible d'enregistrer vos préférences");
    else toast.success("Préférences enregistrées");
  };

  const showRadius =
    prefs.sit_alert_frequency !== "none" || prefs.mutual_aid_frequency !== "none";

  return (
    <div className="min-h-screen bg-background py-6 md:py-10 px-4">
      <Head>
        <title>Préférences email, Guardiens</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <h1 className="font-heading text-2xl md:text-3xl mb-2">Préférences email</h1>
          <p className="text-muted-foreground">
            Trois réglages, un par type d'email. Chaque flux est indépendant : couper l'un
            n'éteint jamais les autres. Les emails essentiels (confirmations de garde,
            identité, sécurité) restent toujours envoyés.
          </p>
        </header>

        {loading || authLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Nouvelles annonces de garde</CardTitle>
                <CardDescription>
                  Les gardes publiées autour de chez vous.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChoiceRow
                  name="Fréquence des nouvelles annonces"
                  choices={SIT_CHOICES}
                  value={prefs.sit_alert_frequency}
                  onChange={(v) => setPrefs((p) => ({ ...p, sit_alert_frequency: v }))}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Entraide et questions</CardTitle>
                <CardDescription>
                  Les coups de main demandés ou proposés près de chez vous, et les questions
                  encore sans réponse retenue. L'entraide reste sans contrepartie financière.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChoiceRow
                  name="Fréquence de l'entraide"
                  choices={MUTUAL_AID_CHOICES}
                  value={prefs.mutual_aid_frequency}
                  onChange={(v) => setPrefs((p) => ({ ...p, mutual_aid_frequency: v }))}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">Conseils et accompagnement</CardTitle>
                  <CardDescription>
                    Conseils pour publier votre annonce, complétion de profil, rappels d'avis.
                  </CardDescription>
                </div>
                <Switch
                  checked={prefs.product_emails}
                  onCheckedChange={(v) => setPrefs((p) => ({ ...p, product_emails: v }))}
                  aria-label="Conseils et accompagnement"
                />
              </CardHeader>
            </Card>

            {showRadius && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Votre rayon</CardTitle>
                  <CardDescription>
                    Nous regardons d'abord dans ce rayon. S'il n'y a presque rien cette
                    semaine, nous élargissons jusqu'à 100 km et nous vous le disons dans
                    l'email. Si rien n'existe, aucun email ne part.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {RADIUS_OPTIONS.map((km) => (
                      <button
                        key={km}
                        type="button"
                        onClick={() => setPrefs((p) => ({ ...p, nearby_daily_radius_km: km }))}
                        className={`px-4 py-2 rounded-md text-sm border transition ${
                          prefs.nearby_daily_radius_km === km
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-foreground border-input hover:bg-muted"
                        }`}
                      >
                        {km} km
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

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
