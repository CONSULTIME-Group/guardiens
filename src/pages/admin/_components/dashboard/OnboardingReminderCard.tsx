import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const OnboardingReminderCard = () => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base flex items-center gap-2">
        <Mail className="h-4 w-4" />
        Rappels onboarding
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground mb-4">
        Envoyer manuellement l'email J+1 aux inscrits des dernières 48h avec un profil complété à moins de 60%.
      </p>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Mail className="h-4 w-4 mr-2" />
            Envoyer onboarding J+1 maintenant
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l'envoi</AlertDialogTitle>
            <AlertDialogDescription>
              Cela enverra un email de rappel aux membres inscrits dans les dernières 48h dont le profil est complété à moins de 60%. Les doublons sont automatiquement exclus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              try {
                const { data, error } = await supabase.functions.invoke('send-onboarding-j1', {
                  body: { minHours: 0, maxHours: 48 },
                });
                if (error) throw error;
                toast.success(`Envoi terminé : ${data?.sent ?? 0} email(s) envoyé(s), ${data?.skipped ?? 0} ignoré(s)`);
              } catch (err: any) {
                toast.error("Erreur lors de l'envoi : " + (err.message || "Erreur inconnue"));
              }
            }}>
              Confirmer l'envoi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CardContent>
  </Card>
);
