import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";


export default function AdminRelanceIncomplet() {
  const [loading, setLoading] = useState<"dry" | "send" | null>(null);
  const [result, setResult] = useState<any>(null);
  const [confirmed, setConfirmed] = useState(false);

  const run = async (dryRun: boolean) => {
    setLoading(dryRun ? "dry" : "send");
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("send-relance-profil-incomplet", {
        body: { dryRun },
      });
      if (error) throw error;
      setResult(data);
      if (!dryRun) toast.success(`Envoyés : ${data.sent} / Erreurs : ${data.errors}`);
    } catch (e: any) {
      toast.error(e.message || "Erreur");
      setResult({ error: e.message });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Relance profils incomplets — J+2</h1>
          <p className="text-muted-foreground mt-1">
            Envoie le mail "votre profil est invisible" aux membres avec 0% de complétion inscrits depuis +2 jours.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>1. Estimer la cible</CardTitle>
            <CardDescription>Aperçu sans envoi — applique tous les filtres (suppression, déjà envoyés).</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => run(true)} disabled={loading !== null} variant="outline">
              {loading === "dry" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Estimer
            </Button>
          </CardContent>
        </Card>

        {result && !result.error && (
          <Card className="border-primary/40 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Résultat
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {result.dryRun ? (
                <>
                  <div>Candidats trouvés : <strong>{result.totalCandidates}</strong></div>
                  <div>En liste de suppression : {result.suppressed}</div>
                  <div>Déjà relancés : {result.alreadySent}</div>
                  <div className="text-base pt-2">À envoyer : <strong className="text-primary">{result.toSend}</strong></div>
                  {result.sampleEmails?.length > 0 && (
                    <div className="text-xs text-muted-foreground pt-2">
                      Exemples : {result.sampleEmails.join(", ")}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>Total ciblé : <strong>{result.total}</strong></div>
                  <div>Envoyés : <strong className="text-primary">{result.sent}</strong></div>
                  <div>Erreurs : <strong className={result.errors > 0 ? "text-destructive" : ""}>{result.errors}</strong></div>
                  {result.errorDetails?.length > 0 && (
                    <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto">
                      {JSON.stringify(result.errorDetails, null, 2)}
                    </pre>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              2. Lancer l'envoi
            </CardTitle>
            <CardDescription>
              Action irréversible. Coche la case puis clique pour envoyer la salve à tous les destinataires éligibles.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="h-4 w-4"
              />
              Je confirme avoir vérifié l'estimation et le rendu du mail.
            </label>
            <Button
              onClick={() => run(false)}
              disabled={!confirmed || loading !== null}
              variant="destructive"
            >
              {loading === "send" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Envoyer la salve maintenant
            </Button>
          </CardContent>
        </Card>
    </div>
  );
}
