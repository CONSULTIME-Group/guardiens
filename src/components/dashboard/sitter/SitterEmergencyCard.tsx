import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Zap, CheckCircle2, XCircle, Settings, ChevronRight, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import ChipSelect from "@/components/profile/ChipSelect";
import { toast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const animalOptions = ["Chiens", "Chats", "NAC", "Chevaux", "Animaux de ferme"];

interface SitterEmergencyCardProps {
  /** Le gardien a-t-il déjà un profil urgence en base ? */
  hasEmergencyProfile: boolean;
}

/**
 * Carte unifiée Gardien d'urgence, 3 états :
 *   1. LOCKED     → critères non remplis (éligibilité affichée)
 *   2. ELIGIBLE   → tous les critères OK, profil pas encore créé (CTA activation)
 *   3. ACTIVE     → profil créé, pilotage des préférences inline
 *
 * Remplace la cohabitation EmergencyEligibility + EmergencyDashSection.
 */
const SitterEmergencyCard = ({ hasEmergencyProfile }: SitterEmergencyCardProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [checks, setChecks] = useState<{
    completedSits: number;
    avgRating: number;
    recentCancellations: number;
    identityVerified: boolean;
    hasSubscription: boolean;
  } | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [radius, setRadius] = useState([20]);
  const [animalTypes, setAnimalTypes] = useState<string[]>([]);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [appsRes, reviewsRes, profileRes, cancellationsRes, subRes, emRes] = await Promise.all([
      supabase.from("applications").select("id, sit:sits!inner(status)").eq("sitter_id", user.id).eq("status", "accepted"),
      supabase.from("reviews").select("overall_rating").eq("reviewee_id", user.id).eq("published", true),
      supabase.from("profiles").select("identity_verified").eq("id", user.id).single(),
      supabase.from("sits").select("id").eq("cancelled_by", user.id).gte("cancelled_at", sixMonthsAgo.toISOString()),
      supabase.from("subscriptions").select("status, expires_at").eq("user_id", user.id).maybeSingle(),
      supabase.from("emergency_sitter_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    ]);

    const completedSits = (appsRes.data || []).filter((a: any) => a.sit?.status === "completed").length;
    const reviews = reviewsRes.data || [];
    const avgRating = reviews.length > 0 ? reviews.reduce((s: number, r: any) => s + r.overall_rating, 0) / reviews.length : 0;
    const sub = subRes.data;
    const now = new Date();
    const hasSubscription = sub != null && (
      sub.status === "active" || sub.status === "trial"
      || (sub.expires_at && new Date(sub.expires_at) > now)
    );
    setChecks({
      completedSits,
      avgRating: Math.round(avgRating * 10) / 10,
      recentCancellations: cancellationsRes.data?.length || 0,
      identityVerified: profileRes.data?.identity_verified || false,
      hasSubscription,
    });
    if (emRes.data) {
      setProfile(emRes.data);
      setRadius([emRes.data.radius_km || 20]);
      setAnimalTypes((emRes.data.animal_types as string[]) || []);
      setSmsAlerts(emRes.data.sms_alerts || false);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const handleSave = async () => {
    if (!user || !profile || previewMode) return;
    setSaving(true);
    await supabase.from("emergency_sitter_profiles").update({
      radius_km: radius[0],
      animal_types: animalTypes,
      sms_alerts: smsAlerts,
    } as any).eq("user_id", user.id);
    setSaving(false);
    setEditOpen(false);
    toast({ title: "Préférences mises à jour" });
    load();
  };

  const handleToggleActive = async (active: boolean) => {
    if (!user || previewMode) return;
    await supabase.from("emergency_sitter_profiles").update({ is_active: active } as any).eq("user_id", user.id);
    setProfile((prev: any) => ({ ...prev, is_active: active }));
    toast({ title: active ? "Mode urgence réactivé" : "Mode urgence désactivé" });
  };

  // ─── Mode aperçu (dev only) ───
  // Active via ?previewEmergency=locked|eligible|active dans l'URL,
  // puis switch flottant en haut de la carte pour basculer entre les 3 vues.
  const isDev = import.meta.env.DEV;
  const initialPreview = (() => {
    if (!isDev || typeof window === "undefined") return null;
    const p = new URLSearchParams(window.location.search).get("previewEmergency");
    return p === "locked" || p === "eligible" || p === "active" ? p : null;
  })();
  const [previewMode, setPreviewMode] = useState<"locked" | "eligible" | "active" | null>(
    initialPreview as any
  );

  // Toggle visible uniquement si on entre en mode aperçu via l'URL
  // (?previewEmergency=locked|eligible|active). Évite la fuite UI en preview/prod.
  const PreviewToggle = isDev && initialPreview !== null ? (
    <div className="flex items-center gap-1 rounded-full border border-dashed border-amber-400/60 bg-background/80 backdrop-blur px-2 py-1 mb-2 text-[11px] w-fit">
      <Eye className="h-3 w-3 text-amber-600" />
      <span className="text-muted-foreground mr-1">Aperçu :</span>
      {([
        { key: "locked", label: "Verrouillé" },
        { key: "eligible", label: "Éligible" },
        { key: "active", label: "Actif" },
      ] as const).map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => setPreviewMode(key)}
          className={`px-1.5 py-0.5 rounded-full transition ${
            previewMode === key
              ? "bg-amber-500 text-white font-medium"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {label}
        </button>
      ))}
      {previewMode !== null && (
        <button
          type="button"
          onClick={() => setPreviewMode(null)}
          className="ml-1 px-1.5 py-0.5 rounded-full text-muted-foreground hover:text-foreground"
          aria-label="Quitter l'aperçu (revenir aux données réelles)"
          title="Revenir aux données réelles"
        >
          ✕
        </button>
      )}
    </div>
  ) : null;

  if (loading && !previewMode) {
    return <div className="rounded-2xl border border-border bg-card p-5 h-40 animate-pulse" aria-busy="true" />;
  }
  if (!checks && !previewMode) return null;

  // Données fictives pour l'aperçu
  const previewChecks = {
    locked: { completedSits: 1, avgRating: 4.5, recentCancellations: 1, identityVerified: false, hasSubscription: true },
    eligible: { completedSits: 5, avgRating: 4.8, recentCancellations: 0, identityVerified: true, hasSubscription: true },
    active: { completedSits: 8, avgRating: 4.9, recentCancellations: 0, identityVerified: true, hasSubscription: true },
  };
  const previewProfile = {
    is_active: true,
    radius_km: 20,
    animal_types: ["Chiens", "Chats"],
    sms_alerts: true,
    interventions_count: 2,
  };

  const effectiveChecks = previewMode ? previewChecks[previewMode] : checks!;
  const effectiveProfile = previewMode === "active" ? previewProfile : profile;
  const effectiveHasProfile = previewMode
    ? previewMode === "active"
    : hasEmergencyProfile;

  // ─── ÉTAT 3, ACTIVE ───
  if (effectiveHasProfile && effectiveProfile) {
    return (
      <>
        {PreviewToggle}
        <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100/50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow">
                <Zap className="h-4 w-4" fill="currentColor" />
              </span>
              <div>
                <p className="font-heading font-semibold text-sm">Gardien d'urgence</p>
                <p className="text-xs text-muted-foreground">
                  {effectiveProfile.is_active ? "Actif, visible en cas d'urgence" : "Désactivé"}
                </p>
              </div>
            </div>
            <Switch checked={effectiveProfile.is_active} onCheckedChange={handleToggleActive} />
          </div>

          {effectiveProfile.is_active && (
            <div className="text-xs text-muted-foreground space-y-1 pl-1">
              <p>Rayon : <span className="font-medium text-foreground">{effectiveProfile.radius_km} km</span></p>
              <p>Animaux : <span className="font-medium text-foreground">{(effectiveProfile.animal_types as string[])?.join(", ") || "Tous"}</span></p>
              <p>Alertes SMS : <span className="font-medium text-foreground">{effectiveProfile.sms_alerts ? "activées" : "désactivées"}</span></p>
              {(effectiveProfile as any).interventions_count > 0 && (
                <p className="text-amber-700 font-medium pt-1">
                  {(effectiveProfile as any).interventions_count} intervention{(effectiveProfile as any).interventions_count > 1 ? "s" : ""}, {(effectiveProfile as any).interventions_count} mois offert{(effectiveProfile as any).interventions_count > 1 ? "s" : ""}
                </p>
              )}
            </div>
          )}

          <Button variant="outline" size="sm" className="gap-1.5 w-full" onClick={() => setEditOpen(true)}>
            <Settings className="h-3.5 w-3.5" /> Modifier mes disponibilités
          </Button>
        </div>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-heading">Paramètres Gardien d'urgence</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 mt-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Rayon : {radius[0]} km</label>
                <Slider value={radius} onValueChange={setRadius} min={5} max={35} step={5} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Animaux acceptés</label>
                <ChipSelect options={animalOptions} selected={animalTypes} onChange={setAnimalTypes} />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={smsAlerts} onCheckedChange={setSmsAlerts} />
                <label className="text-sm">Alertes SMS</label>
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // ─── ÉTAT 1 & 2 ───
  const items = [
    { label: `Gardes : ${effectiveChecks.completedSits}/5`, ok: effectiveChecks.completedSits >= 5 },
    { label: `Note : ${effectiveChecks.avgRating || ","}/4.7`, ok: effectiveChecks.avgRating >= 4.7 },
    { label: `Annulations (6 mois) : ${effectiveChecks.recentCancellations}`, ok: effectiveChecks.recentCancellations === 0 },
    { label: "Identité vérifiée", ok: effectiveChecks.identityVerified },
    { label: "Abonnement actif", ok: effectiveChecks.hasSubscription },
  ];
  const allOk = previewMode === "eligible" ? true : items.every(i => i.ok);
  const remaining = Math.max(0, 5 - effectiveChecks.completedSits);

  // ─── ÉTAT 2, ELIGIBLE ───
  if (allOk) {
    return (
      <>
        {PreviewToggle}
        <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100/50 p-5 space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow">
              <Zap className="h-4 w-4" fill="currentColor" />
            </span>
            <div>
              <p className="font-heading font-semibold text-sm">Vous êtes éligible</p>
              <p className="text-xs text-muted-foreground">Activez le mode Gardien d'urgence</p>
            </div>
          </div>
          <p className="text-xs text-foreground/80">
            Tous les critères sont validés. Activez votre profil pour recevoir les demandes urgentes des propriétaires de votre zone.
          </p>
          <Button asChild size="sm" className="w-full bg-amber-500 hover:bg-amber-600 text-white">
            <Link to="/gardien-urgence">Activer maintenant</Link>
          </Button>
        </div>
      </>
    );
  }

  // ─── ÉTAT 1, LOCKED ───
  return (
    <>
      {PreviewToggle}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-muted">
            <Zap className="h-4 w-4 text-amber-500" />
          </span>
          <div>
            <p className="font-heading font-semibold text-sm">Gardien d'urgence</p>
            <p className="text-xs text-muted-foreground">Le plus haut niveau de confiance</p>
          </div>
        </div>

        <div className="space-y-1.5">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              {item.ok ? (
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground/60 shrink-0" />
              )}
              <span className={item.ok ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
            </div>
          ))}
        </div>

        {remaining > 0 && (
          <p className="text-xs text-muted-foreground">
            Encore {remaining} garde{remaining > 1 ? "s" : ""} pour débloquer le statut.
          </p>
        )}

        <Link to="/gardien-urgence" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
          En savoir plus <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </>
  );
};

export default SitterEmergencyCard;
