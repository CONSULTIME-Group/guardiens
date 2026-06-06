import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * IndexNow : push d'URLs vers Bing, Yandex, Seznam, Naver.
 * Clé hébergée à /a932ae5a07bd450db43be9ad2fdb7440.txt
 */
export default function IndexNowPanel() {
  const [extra, setExtra] = useState("");
  const [busy, setBusy] = useState<null | "all" | "extra">(null);
  const [last, setLast] = useState<{ status: number; submitted: number; response: string } | null>(null);

  const run = async (kind: "all" | "extra") => {
    setBusy(kind);
    try {
      const body: Record<string, unknown> = {};
      if (kind === "all") body.all = true;
      else {
        const urls = extra.split(/[\s,;\n]+/).map((s) => s.trim()).filter(Boolean);
        if (!urls.length) {
          toast.error("Renseignez au moins une URL.");
          setBusy(null);
          return;
        }
        body.urls = urls;
      }
      const { data, error } = await supabase.functions.invoke("notify-indexnow", { body });
      if (error) throw error;
      setLast(data as typeof last);
      if ((data as { ok: boolean }).ok) {
        toast.success(`IndexNow : ${(data as { submitted: number }).submitted} URLs envoyées.`);
      } else {
        toast.error(`IndexNow refus : status ${(data as { status: number }).status}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur IndexNow");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">IndexNow, push Bing / Yandex</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Notifie instantanément Bing, Yandex, Seznam et Naver des URLs nouvelles ou modifiées.
          Clé publique : <code className="bg-muted px-1 rounded text-xs">/a932ae5a07bd450db43be9ad2fdb7440.txt</code>.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => run("all")} disabled={busy !== null}>
            {busy === "all" ? "Envoi en cours…" : "Tout pousser (articles + villes + guides)"}
          </Button>
        </div>

        <div className="pt-2 border-t space-y-2">
          <label className="text-sm font-medium">URLs ciblées (une par ligne)</label>
          <Textarea
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            placeholder={"/actualites/mon-article\nhttps://guardiens.fr/pricing"}
            rows={4}
            className="font-mono text-xs"
          />
          <Button variant="outline" onClick={() => run("extra")} disabled={busy !== null}>
            {busy === "extra" ? "Envoi…" : "Pousser ces URLs"}
          </Button>
        </div>

        {last && (
          <div className="text-xs text-muted-foreground border rounded p-2 space-y-1">
            <div>Status HTTP : <span className="font-mono">{last.status}</span> · {last.submitted} URLs envoyées</div>
            {last.response && <div className="font-mono whitespace-pre-wrap break-all">{last.response}</div>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
