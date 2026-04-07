import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Settings, Globe, Users, Bell, Shield, Database, ExternalLink, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminSettings = () => {
  const [founderDate, setFounderDate] = useState("2026-05-13");
  const [stats, setStats] = useState({ totalUsers: 0, totalSits: 0, totalReviews: 0, storageUsed: "—" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [
        { count: totalUsers },
        { count: totalSits },
        { count: totalReviews },
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("sits").select("id", { count: "exact", head: true }),
        supabase.from("reviews").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        totalUsers: totalUsers || 0,
        totalSits: totalSits || 0,
        totalReviews: totalReviews || 0,
        storageUsed: "—",
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-body text-2xl font-bold">Paramètres du site</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configuration générale de la plateforme guardiens.
        </p>
      </div>

      {/* Platform info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Informations de la plateforme
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Nom du site</label>
              <p className="text-sm font-medium">guardiens</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Domaine</label>
              <p className="text-sm font-medium">guardiens.fr</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Domaine d'envoi email</label>
              <p className="text-sm font-medium">guardiens.fr</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Éditeur</label>
              <p className="text-sm font-medium">Jérémie Martinot (EI)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats snapshot */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            État de la base de données
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-xl font-bold">{stats.totalUsers}</div>
                <div className="text-xs text-muted-foreground">Utilisateurs</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-xl font-bold">{stats.totalSits}</div>
                <div className="text-xs text-muted-foreground">Gardes créées</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-xl font-bold">{stats.totalReviews}</div>
                <div className="text-xs text-muted-foreground">Avis</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-xl font-bold">{stats.storageUsed}</div>
                <div className="text-xs text-muted-foreground">Stockage</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Business rules */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Règles métier actives
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Statut Fondateur</p>
                <p className="text-xs text-muted-foreground">
                  Les membres inscrits avant le {new Date(founderDate).toLocaleDateString("fr-FR")} obtiennent le statut Fondateur (gratuit à vie).
                </p>
              </div>
              <Badge variant="default" className="text-xs">Actif</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Gratuité propriétaires 2026</p>
                <p className="text-xs text-muted-foreground">
                  Accès gratuit pour tous les propriétaires pendant l'année 2026.
                </p>
              </div>
              <Badge variant="default" className="text-xs">Actif</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Abonnement gardien</p>
                <p className="text-xs text-muted-foreground">49 €/an pour les gardiens (hors fondateurs).</p>
              </div>
              <Badge variant="secondary" className="text-xs">49 €/an</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Frais longue durée</p>
                <p className="text-xs text-muted-foreground">70 € de frais de service pour les gardes de 30+ jours.</p>
              </div>
              <Badge variant="secondary" className="text-xs">70 €</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Publication croisée des avis</p>
                <p className="text-xs text-muted-foreground">
                  Les avis ne sont publiés que lorsque les deux parties ont déposé le leur.
                </p>
              </div>
              <Badge variant="default" className="text-xs">Actif</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Auto-confirmation email</p>
                <p className="text-xs text-muted-foreground">
                  Activé temporairement (DNS en attente pour guardiens.fr).
                </p>
              </div>
              <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700">Temporaire</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* External services */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            Services externes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: "Google Analytics", id: "G-9JP4VR1RRP", status: "connecté" },
              { name: "Nominatim (Géocodage)", id: "OpenStreetMap", status: "connecté" },
              { name: "Domaine email", id: "guardiens.fr", status: "DNS en attente" },
            ].map((service) => (
              <div key={service.name} className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-medium">{service.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{service.id}</p>
                </div>
                <Badge
                  variant={service.status === "connecté" ? "default" : "outline"}
                  className={`text-xs ${service.status !== "connecté" ? "border-yellow-500 text-yellow-700" : ""}`}
                >
                  {service.status === "connecté" ? (
                    <><CheckCircle2 className="h-3 w-3 mr-1" />{service.status}</>
                  ) : (
                    <><AlertCircle className="h-3 w-3 mr-1" />{service.status}</>
                  )}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;
