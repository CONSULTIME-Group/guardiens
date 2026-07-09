import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Settings, Globe, Database, ExternalLink, CheckCircle2, AlertCircle, Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { invalidateFeatureFlag } from "@/hooks/useFeatureFlag";
import { toast } from "sonner";

const FOUNDER_DATE = "2026-09-30";
const MANDATORY_ONBOARDING_FLAG = "mandatory_affinity_onboarding";

const AdminSettings = () => {
  const [stats, setStats] = useState({ totalUsers: 0, totalSits: 0, totalReviews: 0 });
  const [loading, setLoading] = useState(true);
  const [mandatoryOnboarding, setMandatoryOnboarding] = useState<boolean | null>(null);
  const [togglingFlag, setTogglingFlag] = useState(false);

 useEffect(() => {
 const fetchStats = async () => {
 try {
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
 });
 } catch (err) {
 console.warn("AdminSettings: stats unavailable", err);
 } finally {
 setLoading(false);
 }
 };
    void fetchStats();
  }, []);

  useEffect(() => {
    supabase
      .from("feature_flags")
      .select("enabled")
      .eq("key", MANDATORY_ONBOARDING_FLAG)
      .maybeSingle()
      .then(({ data }) => setMandatoryOnboarding(!!data?.enabled));
  }, []);

  const toggleMandatoryOnboarding = async (next: boolean) => {
    setTogglingFlag(true);
    const previous = mandatoryOnboarding;
    setMandatoryOnboarding(next);
    const { error } = await supabase
      .from("feature_flags")
      .update({ enabled: next, updated_at: new Date().toISOString() })
      .eq("key", MANDATORY_ONBOARDING_FLAG);
    setTogglingFlag(false);
    if (error) {
      setMandatoryOnboarding(previous);
      toast.error("Impossible de mettre à jour le réglage.");
      return;
    }
    invalidateFeatureFlag(MANDATORY_ONBOARDING_FLAG);
    toast.success(next ? "Étape d'onboarding activée." : "Étape d'onboarding désactivée.");
  };


 return (
 <div className="space-y-6">
 <div>
 <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">Paramètres du site</h1>
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
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
 Les membres inscrits avant le {new Date(FOUNDER_DATE).toLocaleDateString("fr-FR")} obtiennent le statut Fondateur (gratuit).
 </p>
 </div>
 <Badge variant="default" className="text-xs">Actif</Badge>
 </div>
 <Separator />
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium">Espace propriétaire gratuit</p>
 <p className="text-xs text-muted-foreground">
 L'espace propriétaire est gratuit, sans limite de durée.
 </p>
 </div>
 <Badge variant="default" className="text-xs">Actif</Badge>
 </div>
 <Separator />
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium">Entraide entre membres</p>
 <p className="text-xs text-muted-foreground">
 Les petites missions d'entraide sont gratuites pour tous, sans limite.
 </p>
 </div>
 <Badge variant="default" className="text-xs">Gratuit</Badge>
 </div>
 <Separator />
 <div className="flex items-center justify-between">
 <div>
  <p className="text-sm font-medium">Abonnement gardien</p>
 <p className="text-xs text-muted-foreground">6,99 €/mois pour activer l'espace gardien (hors fondateurs).</p>
 </div>
 <Badge variant="secondary" className="text-xs">6,99 €/mois</Badge>
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
 <Badge variant="outline" className="text-xs border-warning text-warning">Temporaire</Badge>
 </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature flags */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Flag className="h-4 w-4" />
            Réglages instantanés
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">Étape d'onboarding obligatoire (affinité)</p>
              <p className="text-xs text-muted-foreground mt-1">
                Après l'inscription, force les nouveaux membres à renseigner les animaux acceptés, la présence attendue et le type de gardien avant d'accéder au tableau de bord. Bascule sans redéploiement.
              </p>
            </div>
            <Switch
              checked={mandatoryOnboarding === true}
              disabled={mandatoryOnboarding === null || togglingFlag}
              onCheckedChange={toggleMandatoryOnboarding}
              aria-label="Activer l'étape d'onboarding obligatoire"
            />
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
 className={`text-xs ${service.status !== "connecté" ? "border-warning text-warning" : ""}`}
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
