import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import HintBubble from "../profile/HintBubble";
import { fr } from "date-fns/locale";
import { useState, useEffect } from "react";
import type { DateRange } from "react-day-picker";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const OwnerStepCalendar = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  // Load existing dates from sits (draft) on mount
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("sits")
        .select("start_date, end_date")
        .eq("user_id", user.id)
        .eq("status", "draft")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.start_date && data?.end_date) {
        setDateRange({
          from: new Date(data.start_date),
          to: new Date(data.end_date),
        });
      }
    };
    load();
  }, [user]);

  const handleSelect = async (range: DateRange | undefined) => {
    setDateRange(range);
    if (!range?.from || !range?.to || !user) return;

    setSaving(true);
    try {
      // Save as a draft sit linked to user's first property
      const { data: property } = await supabase
        .from("properties")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (!property) {
        setSaving(false);
        return;
      }

      // Check for existing draft
      const { data: existingDraft } = await supabase
        .from("sits")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "draft")
        .limit(1)
        .maybeSingle();

      if (existingDraft) {
        await supabase
          .from("sits")
          .update({
            start_date: range.from.toISOString().split("T")[0],
            end_date: range.to.toISOString().split("T")[0],
          })
          .eq("id", existingDraft.id);
      } else {
        await supabase.from("sits").insert({
          user_id: user.id,
          property_id: property.id,
          title: "Brouillon",
          start_date: range.from.toISOString().split("T")[0],
          end_date: range.to.toISOString().split("T")[0],
          status: "draft",
        });
      }

      toast({ title: "Dates sauvegardées" });
    } catch {
      toast({ variant: "destructive", title: "Erreur de sauvegarde" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl font-bold">Calendrier</h2>
      <HintBubble>Ajoutez vos prochaines dates d'absence. Plus vous remplissez tôt, plus vous aurez de candidatures.</HintBubble>

      <div className="space-y-3">
        <Label>Périodes d'absence</Label>
        <p className="text-sm text-muted-foreground">
          Sélectionnez vos dates d'absence sur le calendrier. Les dates seront sauvegardées automatiquement.
        </p>
        <div className="bg-card rounded-lg border border-border p-4 flex justify-center">
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={handleSelect}
            locale={fr}
            numberOfMonths={1}
            disabled={{ before: new Date() }}
          />
        </div>
        {dateRange?.from && (
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <span className="font-medium">Période sélectionnée : </span>
            {dateRange.from.toLocaleDateString("fr-FR")}
            {dateRange.to && ` — ${dateRange.to.toLocaleDateString("fr-FR")}`}
            {saving && <span className="ml-2 text-muted-foreground">Sauvegarde...</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerStepCalendar;
