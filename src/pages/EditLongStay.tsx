import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { differenceInDays } from "date-fns";

const EditLongStay = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [estimatedContribution, setEstimatedContribution] = useState("");
  const [conditions, setConditions] = useState("");
  const [accessLevel, setAccessLevel] = useState("eligible");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    const load = async () => {
      const { data } = await supabase.from("long_stays").select("*").eq("id", id).single();
      if (!data || data.user_id !== user.id) {
        navigate("/dashboard");
        return;
      }
      setTitle(data.title || "");
      setStartDate(data.start_date || "");
      setEndDate(data.end_date || "");
      setEstimatedContribution(data.estimated_contribution || "");
      setConditions(data.conditions || "");
      setAccessLevel(data.access_level || "eligible");
      setLoading(false);
    };
    load();
  }, [id, user, navigate]);

  const today = new Date().toISOString().split("T")[0];
  const minDuration = startDate && endDate ? differenceInDays(new Date(endDate), new Date(startDate)) : 0;
  const dateError = startDate && endDate && minDuration < 30
    ? "Les gardes longue durée commencent à partir de 30 jours." : null;

  const canSave = title && startDate && endDate && !dateError;

  const handleSave = async () => {
    if (!user || !id || !canSave) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("long_stays").update({
        title,
        start_date: startDate,
        end_date: endDate,
        estimated_contribution: estimatedContribution || null,
        conditions,
        access_level: accessLevel as any,
      }).eq("id", id);
      if (error) throw error;
      toast({ title: "Annonce mise à jour ✅" });
      navigate(`/long-stays/${id}`);
    } catch {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de sauvegarder." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 md:p-10 max-w-3xl mx-auto text-muted-foreground">Chargement...</div>;

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto animate-fade-in pb-40">
      <Link to={`/long-stays/${id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Retour à l'annonce
      </Link>

      <h1 className="font-heading text-3xl font-bold mb-2">Modifier l'annonce</h1>
      <p className="text-muted-foreground mb-8">Mettez à jour les informations de votre garde longue durée.</p>

      <div className="space-y-6 pb-32">
        <div>
          <Label className="text-sm font-medium">Titre de l'annonce *</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} className="mt-1.5" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Date de début *</Label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} min={today} className="mt-1.5" />
          </div>
          <div>
            <Label className="text-sm font-medium">Date de fin *</Label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate || today} className="mt-1.5" />
          </div>
        </div>
        {dateError && (
          <p className="text-sm text-destructive flex items-center gap-1.5 -mt-2">
            <AlertCircle className="h-3.5 w-3.5" /> {dateError}
          </p>
        )}

        <div>
          <Label className="text-sm font-medium">Contribution estimée aux frais (optionnel)</Label>
          <Input value={estimatedContribution} onChange={e => setEstimatedContribution(e.target.value)} className="mt-1.5" />
        </div>

        <div>
          <Label className="text-sm font-medium">Conditions particulières</Label>
          <Textarea value={conditions} onChange={e => setConditions(e.target.value)} className="mt-1.5" />
        </div>

        <div>
          <Label className="text-sm font-medium">Ouvert à</Label>
          <Select value={accessLevel} onValueChange={setAccessLevel}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="eligible">Tous les gardiens éligibles</SelectItem>
              <SelectItem value="past_sitters">Mes anciens gardiens uniquement</SelectItem>
              <SelectItem value="invite_only">Sur invitation</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-card border-t border-border p-4 z-40">
        <div className="max-w-3xl mx-auto">
          <Button onClick={handleSave} disabled={!canSave || saving} className="w-full h-12 text-base font-semibold">
            {saving ? "Enregistrement..." : "Enregistrer les modifications"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditLongStay;
