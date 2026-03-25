import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Clock, FileText } from "lucide-react";

const emailTemplates = [
  { name: "Email de bienvenue", trigger: "Après inscription", status: "Automatique" },
  { name: "Confirmation d'email", trigger: "Inscription", status: "Automatique" },
  { name: "Nouvelle candidature reçue", trigger: "Candidature créée", status: "Automatique" },
  { name: "Candidature acceptée", trigger: "Statut → acceptée", status: "Automatique" },
  { name: "Rappel garde dans 7 jours", trigger: "Cron J-7", status: "Automatique" },
  { name: "Rappel garde dans 48h", trigger: "Cron J-2", status: "Automatique" },
  { name: "Garde terminée — laisser un avis", trigger: "J+1 après fin", status: "Automatique" },
  { name: "Relance avis", trigger: "J+5 après fin", status: "Automatique" },
  { name: "Annulation de garde", trigger: "Statut → annulée", status: "Automatique" },
];

const AdminEmails = () => {
  return (
    <div className="space-y-6">
      <h1 className="font-body text-2xl font-bold">Emails & Communications</h1>

      {/* Email templates list */}
      <div>
        <h2 className="font-body text-lg font-semibold mb-4">Templates d'emails automatiques</h2>
        <div className="grid gap-3">
          {emailTemplates.map((tpl) => (
            <Card key={tpl.name}>
              <CardContent className="flex items-center justify-between py-4 px-6">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium text-sm">{tpl.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {tpl.trigger}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">{tpl.status}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Placeholder for targeted emails */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Envoyer un email ciblé
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            L'envoi d'emails ciblés nécessite la configuration d'un domaine email. 
            Cette fonctionnalité sera disponible une fois le domaine configuré dans les paramètres Lovable Cloud.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminEmails;
