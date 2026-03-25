import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

type Status = "loading" | "valid" | "already" | "invalid" | "success" | "error";

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }

    const validate = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`,
          { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
        );
        const data = await res.json();
        if (!res.ok) setStatus("invalid");
        else if (data.valid === false && data.reason === "already_unsubscribed") setStatus("already");
        else if (data.valid) setStatus("valid");
        else setStatus("invalid");
      } catch { setStatus("error"); }
    };
    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) setStatus("error");
      else setStatus("success");
    } catch { setStatus("error"); }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="font-heading text-xl">Désinscription</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p>Vérification en cours…</p>
            </div>
          )}
          {status === "valid" && (
            <>
              <p className="text-muted-foreground">
                Souhaitez-vous vous désinscrire des emails de notification ?
              </p>
              <Button onClick={handleUnsubscribe} disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirmer la désinscription
              </Button>
            </>
          )}
          {status === "success" && (
            <div className="flex flex-col items-center gap-2 text-primary">
              <CheckCircle className="h-10 w-10" />
              <p className="font-medium">Désinscription confirmée</p>
              <p className="text-sm text-muted-foreground">Vous ne recevrez plus d'emails de notification.</p>
            </div>
          )}
          {status === "already" && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <CheckCircle className="h-10 w-10" />
              <p>Vous êtes déjà désinscrit(e).</p>
            </div>
          )}
          {status === "invalid" && (
            <div className="flex flex-col items-center gap-2 text-destructive">
              <XCircle className="h-10 w-10" />
              <p>Lien invalide ou expiré.</p>
            </div>
          )}
          {status === "error" && (
            <div className="flex flex-col items-center gap-2 text-destructive">
              <XCircle className="h-10 w-10" />
              <p>Une erreur est survenue. Veuillez réessayer.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Unsubscribe;
