import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  buildReschedulePatch,
  hasMissionPeriod,
  localIsoDay,
  RESCHEDULE_ERRORS,
  suggestedEndDate,
  type ReschedulePatch,
  type RescheduleResult,
} from "@/lib/missionReschedule";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mission: { id: string; user_id: string; date_needed?: string | null; end_date?: string | null };
  onSaved: (patch: ReschedulePatch) => void;
}

/**
 * Lot X2 : « Reporter » un besoin publié. L'auteur choisit une nouvelle date
 * (à partir d'aujourd'hui) et, si le besoin a une période, sa nouvelle fin.
 * Écriture directe sur sa ligne (politique « Users can update own missions »).
 */
const RescheduleMissionDialog = ({ open, onOpenChange, mission, onSaved }: Props) => {
  const { toast } = useToast();
  const withPeriod = hasMissionPeriod(mission);
  const today = localIsoDay();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStart("");
    setEnd("");
    setError(null);
  }, [open]);

  const onStartChange = (value: string) => {
    setStart(value);
    setError(null);
    if (withPeriod) {
      const proposed = suggestedEndDate(mission, value);
      if (proposed && (!end || end < value)) setEnd(proposed);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    const result = buildReschedulePatch(mission, { start, end });
    if (result.ok === false) {
      setError(RESCHEDULE_ERRORS[(result as Extract<RescheduleResult, { ok: false }>).reason]);
      return;
    }
    setSaving(true);
    try {
      const { data, error: updateError } = await supabase
        .from("small_missions")
        .update(result.patch)
        .eq("id", mission.id)
        .eq("user_id", mission.user_id)
        .select("id")
        .maybeSingle();
      if (updateError) throw updateError;
      if (!data) throw new Error("La nouvelle date n'a pas pu être enregistrée.");
      void trackEvent("mission_rescheduled", {
        metadata: { mission_id: mission.id, with_period: withPeriod },
      });
      onSaved(result.patch);
      onOpenChange(false);
      toast({ title: "Nouvelle date enregistrée", description: "Votre besoin reste visible avec cette date." });
    } catch (err: any) {
      logger.error("[RescheduleMissionDialog]", { err: String(err?.message || err) });
      toast({
        variant: "destructive",
        title: "Date non enregistrée",
        description: err?.message || "Réessayez dans un instant.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choisir une nouvelle date</DialogTitle>
          <DialogDescription>
            Votre besoin reste en ligne avec la date que vous choisissez.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reschedule-start">{withPeriod ? "Nouvelle date de début" : "Nouvelle date"}</Label>
            <Input
              id="reschedule-start"
              type="date"
              min={today}
              value={start}
              onChange={(e) => onStartChange(e.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "reschedule-error" : undefined}
            />
          </div>
          {withPeriod && (
            <div className="space-y-1.5">
              <Label htmlFor="reschedule-end">Fin de période</Label>
              <Input
                id="reschedule-end"
                type="date"
                min={start || today}
                value={end}
                onChange={(e) => { setEnd(e.target.value); setError(null); }}
              />
            </div>
          )}
          {error && (
            <p id="reschedule-error" role="alert" className="text-sm text-destructive">{error}</p>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Garder la date actuelle
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Enregistrement" : "Enregistrer la date"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RescheduleMissionDialog;
