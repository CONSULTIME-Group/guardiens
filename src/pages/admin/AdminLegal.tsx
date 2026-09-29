import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, ScrollText, Shield, FileText, Eye } from "lucide-react";

const legalPages = [
  {
    title: "Conditions Générales d'Utilisation",
    path: "/cgu",
    icon: ScrollText,
    description: "Règles d'utilisation de la plateforme, responsabilités des utilisateurs et de l'éditeur.",
    lastUpdate: "Gérée dans le code (Terms.tsx)",
  },
  {
    title: "Politique de confidentialité",
    path: "/confidentialite",
    icon: Shield,
    description: "Traitement des données personnelles, durée de conservation, droits RGPD.",
    lastUpdate: "Gérée dans le code (Privacy.tsx)",
  },
  {
    title: "Mentions légales",
    path: "/mentions-legales",
    icon: FileText,
    description: "Informations sur l'éditeur (Jérémie Martinot, EI), hébergement, contact.",
    lastUpdate: "Gérée dans le code (MentionsLegales.tsx)",
  },
  {
    title: "Conditions Générales de Service",
    path: "/cgs",
    icon: ScrollText,
    description: "Conditions de l'accès gardien et des services associés.",
    lastUpdate: "Gérée dans le code (Cgs.tsx)",
  },
  {
    title: "Politique cookies",
    path: "/cookies",
    icon: Shield,
    description: "Cookies par finalité, durée, émetteur, et gestion du consentement.",
    lastUpdate: "Gérée dans le code (Cookies.tsx)",
  },
];

const AdminLegal = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">Pages légales</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Vérifiez et consultez les pages légales du site. Toute modification se fait directement dans le code source.
        </p>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4 px-5">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Conformité RGPD</p>
              <p className="text-xs text-muted-foreground mt-1">
                Bandeau de consentement actif. La mesure d'audience (Google Analytics 4) est soumise à consentement et se charge seulement après « Tout accepter ». Choix conservé 6 mois.
                Les pages sont conformes pour une EI de droit français (SIRET 894 864 040 00015).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {legalPages.map((page) => (
          <Card key={page.path}>
            <CardContent className="flex items-center justify-between py-4 px-5">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-muted">
                  <page.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">{page.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 max-w-md">{page.description}</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-1">{page.lastUpdate}</p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" className="text-xs h-8" asChild>
                  <a href={page.path} target="_blank" rel="noopener noreferrer">
                    <Eye className="h-3.5 w-3.5 mr-1.5" />
                    Voir
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Checklist conformité</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { label: "Mentions légales complètes (éditeur, hébergeur, contact)", done: true },
              { label: "CGU avec conditions d'utilisation et responsabilités", done: true },
              { label: "Politique de confidentialité RGPD", done: true },
              { label: "Bandeau cookies : accepter, refuser, personnaliser, choix conservé 6 mois", done: true },
              { label: "Lien de désabonnement dans les emails", done: true },
              { label: "Droit de suppression de compte (RGPD Art. 17)", done: true },
              { label: "Comparaison tarifaire avec clause de bonne foi", done: true },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${item.done ? "bg-success" : "bg-warning"}`} />
                <span className="text-xs text-muted-foreground">{item.label}</span>
                {item.done && <Badge variant="outline" className="text-[10px] h-4">OK</Badge>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLegal;
