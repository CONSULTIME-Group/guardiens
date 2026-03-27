import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Zap, Settings, CheckCircle2, XCircle } from "lucide-react";
import ChipSelect from "@/components/profile/ChipSelect";
import { toast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const animalOptions = ["Chiens", "Chats", "NAC", "Chevaux", "Animaux de ferme"];

const EmergencyDashSection = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [radius, setRadius] = useState([20]);
  const [animalTypes, setAnimalTypes] = useState<string[]>([]);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("emergency_sitter_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    setProfile(data);
    if (data) {
      setRadius([data.radius_km || 20]);
      setAnimalTypes((data.animal_types as string[]) || []);
      setSmsAlerts(data.sms_alerts || false);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const handleSave = async () => {
    if (!user || !profile) return;
    setSaving(true);
    await supabase.from("emergency_sitter_profiles").update({
      radius_km: radius[0],
      animal_types: animalTypes,
      sms_alerts: smsAlerts,
    } as any).eq("user_id", user.id);
    setSaving(false);
    setEditOpen(false);
    toast({ title: "Préférences mises à jour ✓" });
    load();
  };

  const handleToggle = async (active: boolean) => {
    if (!user) return;
    await supabase.from("emergency_sitter_profiles").update({ is_active: active } as any).eq("user_id", user.id);
    setProfile((prev: any) => ({ ...prev, is_active: active }));
    toast({ title: active ? "Mode urgence réactivé ⚡" : "Mode urgence désactivé" });
  };

  if (loading || !profile) return null;

  return (
    <div className="rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-900/10 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow">
            <Zap className="h-4 w-4" fill="currentColor" />
          </span>
          <div>
            <p className="font-heading font-semibold text-sm">Gardien d'urgence</p>
            <p className="text-xs text-muted-foreground">
              {profile.is_active ? "Actif ✅" : "Désactivé"}
            </p>
          </div>
        </div>
        <Switch checked={profile.is_active} onCheckedChange={handleToggle} />
      </div>

      {profile.is_active && (
        <div className="text-xs text-muted-foreground space-y-1">
          <p>📍 Rayon : {profile.radius_km} km</p>
          <p>🐾 {(profile.animal_types as string[])?.join(", ") || "Tous"}</p>
          <p>{profile.sms_alerts ? "📱 Alertes SMS activées" : "📱 Alertes SMS désactivées"}</p>
          {(profile as any).interventions_count > 0 && (
            <p>⚡ {(profile as any).interventions_count} intervention{(profile as any).interventions_count > 1 ? "s" : ""} — {(profile as any).interventions_count * 3} mois offert{(profile as any).interventions_count * 3 > 1 ? "s" : ""}</p>
          )}
        </div>
      )}

      <Button variant="outline" size="sm" className="gap-1.5 w-full" onClick={() => setEditOpen(true)}>
        <Settings className="h-3.5 w-3.5" /> Modifier mes disponibilités
      </Button>

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
    </div>
  );
};

export default EmergencyDashSection;
