import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Zap, CheckCircle2 } from "lucide-react";
import ChipSelect from "@/components/profile/ChipSelect";
import { toast } from "@/hooks/use-toast";

const animalOptions = ["Chiens", "Chats", "NAC", "Chevaux", "Animaux de ferme"];

interface EmergencyActivationProps {
  onActivated: () => void;
}

const EmergencyActivation = ({ onActivated }: EmergencyActivationProps) => {
  const { user } = useAuth();
  const [radius, setRadius] = useState([20]);
  const [animalTypes, setAnimalTypes] = useState<string[]>(["Chiens", "Chats"]);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleActivate = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("emergency_sitter_profiles").insert({
      user_id: user.id,
      radius_km: radius[0],
      animal_types: animalTypes,
      sms_alerts: smsAlerts,
      is_active: true,
    } as any);
    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: "Impossible d'activer le mode.", variant: "destructive" });
      return;
    }
    toast({ title: "Mode Gardien d'urgence activé ⚡" });
    onActivated();
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="text-sm font-medium mb-1.5 block">Rayon d'intervention : {radius[0]} km</label>
        <Slider value={radius} onValueChange={setRadius} min={5} max={30} step={5} />
      </div>

      <div>
        <label className="text-sm font-medium mb-1.5 block">Types d'animaux acceptés en urgence</label>
        <ChipSelect options={animalOptions} selected={animalTypes} onChange={setAnimalTypes} />
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={smsAlerts} onCheckedChange={setSmsAlerts} />
        <label className="text-sm">M'alerter immédiatement par SMS en cas d'urgence</label>
      </div>

      <Button onClick={handleActivate} disabled={saving || animalTypes.length === 0} className="w-full gap-2">
        <Zap className="h-4 w-4" />
        {saving ? "Activation..." : "Activer le mode Gardien d'urgence"}
      </Button>
    </div>
  );
};

export default EmergencyActivation;
