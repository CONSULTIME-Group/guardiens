import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Eye, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PreviewResponse {
  count: number;
  subject: string;
  cta_label: string;
  cta_url: string;
  already_sent_today: boolean;
  last_campaign: {
    id: string;
    created_at: string;
    recipients_count: number;
  } | null;
  sample: Array<{ first_name: string; email_masked: string }>;
}

async function invokeCampaign(mode: "preview" | "send" | "test_only"): Promise<PreviewResponse & { sent?: number; errors?: number }> {
  const { data, error } = await supabase.functions.invoke(
    "send-owner-activation-campaign",
    { body: { mode } },
  );
  if (error) throw error;
  return data as PreviewResponse & { sent?: number; errors?: number };
}

export const OwnerActivationCampaignCard = () => {
  const qc = useQueryClient();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const preview = useQuery({
    queryKey: ["owner_activation_preview"],
    queryFn: () => invokeCampaign("preview"),
    staleTime: 60_000,
  });

  const sendMut = useMutation({
    mutationFn: () => invokeCampaign("send"),
    onSuccess: (data) => {
      toast.success(
        `${data.sent ?? 0} email${(data.sent ?? 0) > 1 ? "s" : ""} envoyé${(data.sent ?? 0) > 1 ? "s" : ""}, ${data.errors ?? 0} erreur${(data.errors ?? 0) > 1 ? "s" : ""}`,
      );
      qc.invalidateQueries({ queryKey: ["owner_activation_preview"] });
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Envoi impossible");
    },
  });

  const testMut = useMutation({
    mutationFn: () => invokeCampaign("test_only"),
    onSuccess: () => toast.success("Email de test envoyé à votre adresse admin"),
    onError: (err: any) => toast.error(err?.message ?? "Test impossible"),
  });

  const count = preview.data?.count ?? 0;
  const alreadySent = !!preview.data?.already_sent_today;
  const last = preview.data?.last_campaign;

  return (
    <>
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <BellRing className="h-4 w-4 text-primary" aria-hidden />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm text-foreground">
                  Réveiller les propriétaires dormants
                </p>
                {preview.isLoading ? (
                  <Badge variant="outline" className="text-[10px]">Chargement...</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">
                    {count} propriétaire{count > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {count > 0
                  ? `${count} propriétaires sont inscrits sans avoir publié d'annonce. Lancez la campagne "L'entraide du coin" pour leur rappeler que Guardiens ne sert pas qu'à partir 15 jours.`
                  : "Aucun propriétaire dormant sur le segment actuellement."}
              </p>
              {last && (
                <p className="text-[11px] text-muted-foreground mt-2">
                  Dernière campagne : {new Date(last.created_at).toLocaleString("fr-FR")} · {last.recipients_count} email{last.recipients_count > 1 ? "s" : ""} envoyé{last.recipients_count > 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPreviewOpen(true)}
              disabled={preview.isLoading || count === 0}
            >
              <Eye className="h-3.5 w-3.5 mr-1.5" aria-hidden />
              Preview
            </Button>
            <Button
              size="sm"
              onClick={() => setConfirmOpen(true)}
              disabled={preview.isLoading || count === 0 || alreadySent || sendMut.isPending}
            >
              {sendMut.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" aria-hidden />
              ) : (
                <Send className="h-3.5 w-3.5 mr-1.5" aria-hidden />
              )}
              {alreadySent
                ? "Déjà envoyée aujourd'hui, réessayer demain"
                : "Lancer la campagne"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => testMut.mutate()}
              disabled={testMut.isPending}
            >
              {testMut.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" aria-hidden />
              ) : null}
              Envoyer un test à mon adresse
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Preview de la campagne</DialogTitle>
            <DialogDescription>
              Sujet : « {preview.data?.subject} »
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              {count} destinataire{count > 1 ? "s" : ""} au total. Échantillon des 20 premiers :
            </p>
            <ul className="divide-y rounded-md border">
              {(preview.data?.sample ?? []).map((r, i) => (
                <li key={i} className="flex items-center justify-between px-3 py-2">
                  <span className="font-medium">{r.first_name || "(sans prénom)"}</span>
                  <span className="text-xs text-muted-foreground font-mono">{r.email_masked}</span>
                </li>
              ))}
            </ul>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Envoyer à {count} propriétaires ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Chaque destinataire recevra l'email « {preview.data?.subject} ». Une seule campagne par jour est autorisée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                sendMut.mutate();
              }}
            >
              Confirmer et envoyer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
