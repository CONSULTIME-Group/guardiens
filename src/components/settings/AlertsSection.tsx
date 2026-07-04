import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import PostalCodeCityFields from "@/components/profile/PostalCodeCityFields";

interface AlertPref {
  id: string;
  label: string;
  zone_type: string;
  city: string | null;
  postal_code: string | null;
  radius_km: number | null;
  departement: string | null;
  region_code: string | null;
  alert_types: string[];
  heure_envoi: string;
  frequence: string;
  active: boolean;
  created_at: string;
}

const AlertsSection = ({ user }: { user: any }) => {
  const [alertes, setAlertes] = useState<AlertPref[]>([]);
  const [loadingAlertes, setLoadingAlertes] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingLabelValue, setEditingLabelValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AlertPref | null>(null);

  const [autourDeVous, setAutourDeVous] = useState(false);
  const [loadingAutour, setLoadingAutour] = useState(true);

  const [formLabel, setFormLabel] = useState("");
  const [formZoneType, setFormZoneType] = useState<"rayon" | "departement" | "region">("rayon");
  const [formCity, setFormCity] = useState("");
  const [formPostalCode, setFormPostalCode] = useState("");
  const [formRadiusKm, setFormRadiusKm] = useState(15);
  const [formDepartement, setFormDepartement] = useState("");
  const [formAlertTypes, setFormAlertTypes] = useState<string[]>(["gardes", "missions"]);
  const [formHeure, setFormHeure] = useState("08:00");
  const [formFrequence, setFormFrequence] = useState<"quotidien" | "hebdo">("quotidien");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("alert_preferences").select("*").eq("user_id", user.id).order("created_at", { ascending: true })
      .then(({ data }) => { setAlertes((data as AlertPref[]) || []); setLoadingAlertes(false); });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("email_preferences").eq("id", user.id).single()
      .then(({ data }) => {
        const prefs = (data as any)?.email_preferences as any;
        setAutourDeVous(prefs?.autour_de_vous ?? false);
        setLoadingAutour(false);
      });
  }, [user]);

  const activeCount = alertes.filter((a) => a.active).length;

  const handleToggleActive = async (alerte: AlertPref) => {
    const newValue = !alerte.active;
    if (newValue && activeCount >= 3) {
      toast.error("Vous avez atteint le maximum de 3 zones actives.");
      return;
    }
    setAlertes((prev) => prev.map((a) => (a.id === alerte.id ? { ...a, active: newValue } : a)));
    await supabase.from("alert_preferences").update({ active: newValue }).eq("id", alerte.id).eq("user_id", user.id);
  };

  const handleLabelBlur = async (alerte: AlertPref) => {
    setEditingLabelId(null);
    const trimmed = editingLabelValue.trim();
    if (!trimmed || trimmed === alerte.label) return;
    setAlertes((prev) => prev.map((a) => (a.id === alerte.id ? { ...a, label: trimmed } : a)));
    await supabase.from("alert_preferences").update({ label: trimmed }).eq("id", alerte.id).eq("user_id", user.id);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    setAlertes((prev) => prev.filter((a) => a.id !== id));
    await supabase.from("alert_preferences").delete().eq("id", id).eq("user_id", user.id);
    toast.success("Alerte supprimée.");
  };

  const resetForm = () => {
    setFormLabel(""); setFormZoneType("rayon"); setFormCity(""); setFormPostalCode("");
    setFormRadiusKm(15); setFormDepartement(""); setFormAlertTypes(["gardes", "missions"]);
    setFormHeure("08:00"); setFormFrequence("quotidien"); setShowForm(false);
  };

  const handleCreate = async () => {
    if (!formLabel.trim()) { toast.error("Veuillez saisir un nom pour la zone."); return; }
    if (formAlertTypes.length === 0) { toast.error("Sélectionnez au moins un type d'annonce."); return; }
    if (formZoneType === "rayon" && !formCity) { toast.error("Veuillez saisir une ville."); return; }
    if (formZoneType === "departement" && !/^\d{2,3}$/.test(formDepartement)) {
      toast.error("Veuillez saisir un code département valide (2 ou 3 chiffres).");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.rpc("create_alert_preference", {
      p_label: formLabel.trim(),
      p_zone_type: formZoneType,
      p_city: formZoneType === "rayon" ? formCity : null,
      p_postal_code: formZoneType === "rayon" ? formPostalCode : null,
      p_radius_km: formZoneType === "rayon" ? formRadiusKm : null,
      p_departement: formZoneType === "departement" ? formDepartement : null,
      p_region_code: formZoneType === "region" ? "FR" : null,
      p_alert_types: formAlertTypes,
      p_heure_envoi: formHeure,
      p_frequence: formFrequence,
    });
    setSaving(false);
    if (error) {
      if (error.message?.includes("Maximum 3 zones")) toast.error("Vous avez atteint le maximum de 3 zones actives.");
      else toast.error("Une erreur est survenue. Veuillez réessayer.");
      return;
    }
    setAlertes((prev) => [...prev, {
      id: data as string, label: formLabel.trim(), zone_type: formZoneType,
      city: formZoneType === "rayon" ? formCity : null,
      postal_code: formZoneType === "rayon" ? formPostalCode : null,
      radius_km: formZoneType === "rayon" ? formRadiusKm : null,
      departement: formZoneType === "departement" ? formDepartement : null,
      region_code: formZoneType === "region" ? "FR" : null,
      alert_types: formAlertTypes, heure_envoi: formHeure, frequence: formFrequence,
      active: true, created_at: new Date().toISOString(),
    }]);
    toast.success("Alerte créée avec succès.");
    resetForm();
  };

  const handleAutourToggle = async (newValue: boolean) => {
    setAutourDeVous(newValue);
    const { data: profileData } = await supabase.from("profiles").select("email_preferences").eq("id", user.id).single();
    const currentPrefs = ((profileData as any)?.email_preferences as any) || {};
    await supabase.from("profiles").update({ email_preferences: { ...currentPrefs, autour_de_vous: newValue } } as any).eq("id", user.id);
  };

  const zoneDescription = (a: AlertPref) => {
    if (a.zone_type === "rayon") return `${a.city} · ${a.radius_km} km`;
    if (a.zone_type === "departement") return `Département ${a.departement}`;
    return "France entière";
  };

  const firstActiveAlert = alertes.find((a) => a.active);
  const radiusOptions = [5, 15, 30, 50, 100];

  return (
    <>
      <section>
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="h-5 w-5 text-primary" />
          <h2 className="font-heading text-lg font-semibold">Alertes annonces et missions</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Recevez un email quand de nouvelles annonces apparaissent dans vos zones configurées.
        </p>

        {loadingAlertes ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => (<Skeleton key={i} className="h-16 w-full rounded-lg" />))}</div>
        ) : alertes.length === 0 && !showForm ? (
          <div className="bg-muted rounded-lg p-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">Vous n'avez pas encore configuré d'alerte.</p>
            <Button onClick={() => setShowForm(true)}>Créer votre première alerte</Button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {alertes.map((alerte) => (
                <div key={alerte.id} className="bg-card border rounded-lg p-4 flex items-start gap-4">
                  <Switch checked={alerte.active} onCheckedChange={() => handleToggleActive(alerte)} />
                  <div className="flex-1 min-w-0">
                    {editingLabelId === alerte.id ? (
                      <Input autoFocus value={editingLabelValue}
                        onChange={(e) => setEditingLabelValue(e.target.value)}
                        onBlur={() => handleLabelBlur(alerte)}
                        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                        className="h-7 text-sm font-medium px-1 py-0" />
                    ) : (
                      <span className="font-medium cursor-pointer hover:underline"
                        onClick={() => { setEditingLabelId(alerte.id); setEditingLabelValue(alerte.label); }}>
                        {alerte.label}
                      </span>
                    )}
                    <p className="text-sm text-muted-foreground">{zoneDescription(alerte)}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {alerte.alert_types.map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs">
                          {t === "gardes" ? "Gardes" : "Petites missions"}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {alerte.heure_envoi} · {alerte.frequence === "quotidien" ? "Tous les jours" : "Chaque lundi"}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="ml-auto shrink-0" onClick={() => setDeleteTarget(alerte)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {activeCount < 3 ? (
              <Button variant="outline" className="w-full mt-3" onClick={() => setShowForm(true)} disabled={showForm}>
                <Plus className="h-4 w-4 mr-1" /> Ajouter une zone
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground text-center mt-3">
                Vous avez atteint le maximum de 3 zones actives.
              </p>
            )}
          </>
        )}

        {showForm && (
          <div className="mt-4 border-t pt-4 space-y-4">
            <div className="space-y-2">
              <Label>Nom de la zone</Label>
              <Input placeholder="Ex : Autour de Lyon" value={formLabel} onChange={(e) => setFormLabel(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Type de zone</Label>
              <div className="flex gap-2 flex-wrap">
                {([
                  { value: "rayon", label: "Par rayon" },
                  { value: "departement", label: "Par département" },
                  { value: "region", label: "France entière" },
                ] as const).map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setFormZoneType(opt.value)}
                    className={`border rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      formZoneType === opt.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-accent"
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {formZoneType === "rayon" && (
              <>
                <PostalCodeCityFields city={formCity} postalCode={formPostalCode}
                  onChange={(partial) => {
                    if (partial.city !== undefined) setFormCity(partial.city);
                    if (partial.postal_code !== undefined) setFormPostalCode(partial.postal_code);
                  }} required />
                <div className="space-y-2">
                  <Label>Rayon</Label>
                  <div className="flex gap-2 flex-wrap">
                    {radiusOptions.map((r) => (
                      <button key={r} type="button" onClick={() => setFormRadiusKm(r)}
                        className={`border rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                          formRadiusKm === r
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:bg-accent"
                        }`}>
                        {r} km
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {formZoneType === "departement" && (
              <div className="space-y-2">
                <Label>Code département (ex : 69, 38, 01)</Label>
                <Input value={formDepartement}
                  onChange={(e) => setFormDepartement(e.target.value.replace(/\D/g, "").slice(0, 3))}
                  inputMode="numeric" maxLength={3} placeholder="69" className="w-24" />
              </div>
            )}

            {formZoneType === "region" && (
              <p className="text-sm text-muted-foreground">
                Vous recevrez les annonces publiées dans toute la France.
              </p>
            )}

            <div className="space-y-2">
              <Label>Je veux être alerté(e) pour</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="alert-gardes" checked={formAlertTypes.includes("gardes")}
                    onCheckedChange={(checked) => setFormAlertTypes((prev) => checked ? [...prev, "gardes"] : prev.filter((t) => t !== "gardes"))} />
                  <Label htmlFor="alert-gardes" className="text-sm font-normal">Gardes</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="alert-missions" checked={formAlertTypes.includes("missions")}
                    onCheckedChange={(checked) => setFormAlertTypes((prev) => checked ? [...prev, "missions"] : prev.filter((t) => t !== "missions"))} />
                  <Label htmlFor="alert-missions" className="text-sm font-normal">Petites missions</Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Heure de réception</Label>
              <Select value={formHeure} onValueChange={setFormHeure}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="08:00">8h00</SelectItem>
                  <SelectItem value="12:00">12h00</SelectItem>
                  <SelectItem value="18:00">18h00</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fréquence</Label>
              <div className="flex gap-2">
                {([
                  { value: "quotidien", label: "Quotidien" },
                  { value: "hebdo", label: "Hebdomadaire (chaque lundi)" },
                ] as const).map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setFormFrequence(opt.value)}
                    className={`border rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      formFrequence === opt.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-accent"
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetForm}>Annuler</Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? "Enregistrement..." : "Enregistrer cette alerte"}
              </Button>
            </div>
          </div>
        )}
      </section>

      <Separator className="my-6" />

      <section>
        <h2 className="font-heading text-lg font-semibold mb-2">Autour de vous</h2>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm">Membres disponibles pour aider</p>
            <p className="text-sm text-muted-foreground">
              Chaque lundi matin, découvrez les membres disponibles près de chez vous et leurs compétences.
            </p>
          </div>
          <Switch checked={autourDeVous} onCheckedChange={handleAutourToggle} disabled={loadingAutour} />
        </div>
        {autourDeVous && (
          <p className="text-xs text-muted-foreground mt-2">
            {firstActiveAlert
              ? `Dans un rayon de ${firstActiveAlert.radius_km || 15} km autour de ${firstActiveAlert.city || "votre ville"}`
              : "Dans un rayon de 15 km autour de votre ville"}
          </p>
        )}
      </section>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cette alerte ?</DialogTitle>
            <DialogDescription>
              Vous ne recevrez plus d'emails pour la zone « {deleteTarget?.label} ».
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AlertsSection;
