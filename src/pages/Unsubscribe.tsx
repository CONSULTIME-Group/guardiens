import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Helmet } from "react-helmet-async";

type Status = "loading" | "valid" | "already" | "invalid" | "success_all" | "success_partial" | "error";
type Prefs = { product_emails: boolean; digest_emails: boolean; alert_emails: boolean };

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe`;
const APIKEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const post = (body: Record<string, unknown>) =>
  fetch(FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: APIKEY, Authorization: `Bearer ${APIKEY}` },
    body: JSON.stringify(body),
  }).then((r) => r.json().then((d) => ({ ok: r.ok, data: d })));

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [submitting, setSubmitting] = useState<"all" | "partial" | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Prefs>({ product_emails: true, digest_emails: true, alert_emails: true });

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${FN_URL}?token=${token}`, { headers: { apikey: APIKEY } });
        const data = await res.json();
        if (!res.ok) {
          setStatus("invalid");
          return;
        }
        setEmail(data.email ?? null);
        if (data.preferences) {
          setPrefs({
            product_emails: data.preferences.product_emails ?? true,
            digest_emails: data.preferences.digest_emails ?? true,
            alert_emails: data.preferences.alert_emails ?? true,
          });
        }
        if (data.already_unsubscribed) setStatus("already");
        else if (data.valid) setStatus("valid");
        else setStatus("invalid");
      } catch {
        setStatus("error");
      }
    })();
  }, [token]);

  const handleUnsubscribeAll = async () => {
    if (!token) return;
    setSubmitting("all");
    const { ok, data } = await post({ token, all: true });
    setSubmitting(null);
    if (ok && data.success) setStatus("success_all");
    else if (data?.reason === "already_unsubscribed") setStatus("already");
    else setStatus("error");
  };

  const handleSavePartial = async () => {
    if (!token) return;
    setSubmitting("partial");
    const { ok, data } = await post({
      token,
      categories: {
        product: prefs.product_emails,
        digest: prefs.digest_emails,
        alert: prefs.alert_emails,
      },
    });
    setSubmitting(null);
    if (ok && data.success) setStatus("success_partial");
    else setStatus("error");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Helmet>
        <title>Désinscription email, Guardiens</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="font-heading text-xl">Vos préférences email</CardTitle>
          {email && <CardDescription className="break-all">{email}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p>Vérification en cours…</p>
            </div>
          )}

          {status === "valid" && (
            <>
              <p className="text-sm text-muted-foreground">
                Vous pouvez choisir précisément quels emails recevoir, ou vous désinscrire de
                l'ensemble des envois non essentiels. Les emails essentiels (confirmations de
                garde, identité, sécurité) restent toujours envoyés.
              </p>

              <div className="space-y-3">
                <PrefRow
                  title="Conseils & accompagnement"
                  desc="Conseils pour publier votre annonce, complétion de profil, rappels d'avis."
                  checked={prefs.product_emails}
                  onChange={(v) => setPrefs((p) => ({ ...p, product_emails: v }))}
                />
                <PrefRow
                  title="Alertes nouvelles annonces"
                  desc="Notifications dès qu'une nouvelle garde apparaît dans une de vos zones."
                  checked={prefs.alert_emails}
                  onChange={(v) => setPrefs((p) => ({ ...p, alert_emails: v }))}
                />
                <PrefRow
                  title="Récapitulatifs"
                  desc="Synthèses périodiques de votre activité (à venir)."
                  checked={prefs.digest_emails}
                  onChange={(v) => setPrefs((p) => ({ ...p, digest_emails: v }))}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button
                  onClick={handleSavePartial}
                  disabled={submitting !== null}
                  className="flex-1"
                >
                  {submitting === "partial" && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Enregistrer mes choix
                </Button>
                <Button
                  variant="outline"
                  onClick={handleUnsubscribeAll}
                  disabled={submitting !== null}
                  className="flex-1"
                >
                  {submitting === "all" && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Tout désactiver
                </Button>
              </div>
            </>
          )}

          {status === "success_partial" && (
            <div className="flex flex-col items-center gap-2 text-primary py-6">
              <CheckCircle className="h-10 w-10" />
              <p className="font-medium">Préférences enregistrées</p>
              <p className="text-sm text-muted-foreground text-center">
                Vous continuerez à recevoir uniquement les catégories activées.
              </p>
            </div>
          )}

          {status === "success_all" && (
            <div className="flex flex-col items-center gap-2 text-primary py-6">
              <CheckCircle className="h-10 w-10" />
              <p className="font-medium">Désinscription confirmée</p>
              <p className="text-sm text-muted-foreground text-center">
                Vous ne recevrez plus d'emails non essentiels.
              </p>
            </div>
          )}

          {status === "already" && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground py-6">
              <CheckCircle className="h-10 w-10" />
              <p>Vous êtes déjà désinscrit(e).</p>
            </div>
          )}

          {status === "invalid" && (
            <div className="flex flex-col items-center gap-2 text-destructive py-6">
              <XCircle className="h-10 w-10" />
              <p>Lien invalide ou expiré.</p>
              <Link to="/email-preferences" className="text-sm underline text-muted-foreground">
                Gérer mes préférences depuis mon compte
              </Link>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-2 text-destructive py-6">
              <XCircle className="h-10 w-10" />
              <p>Une erreur est survenue. Veuillez réessayer.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const PrefRow = ({
  title, desc, checked, onChange,
}: { title: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-start justify-between gap-4 p-3 rounded-md border bg-card">
    <div className="min-w-0">
      <div className="font-medium text-sm">{title}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

export default Unsubscribe;
