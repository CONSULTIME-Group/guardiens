import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import ChipSelect from "@/components/profile/ChipSelect";
import { ArrowLeft, AlertCircle } from "lucide-react";

const openToOptions = ["Familles", "Solo", "Couples", "Retraités", "Sans préférence"];

const EditSit = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [flexibleDates, setFlexibleDates] = useState(false);
  const [specificExpectations, setSpecificExpectations] = useState("");
  const [openTo, setOpenTo] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    const load = async () => {
      const { data } = await supabase.from("sits").select("*").eq("id", id).eq("user_id", user.id).single();
      if (!data) { navigate("/sits"); return; }
      setTitle(data.title || "");
      setStartDate(data.start_date || "");
      setEndDate(data.end_date || "");
      setFlexibleDates(data.flexible_dates || false);
      setSpecificExpectations(data.specific_expectations || "");
      setOpenTo((data.open_to as string[]) || []);
      setLoading(false);
    };
    load();
  }, [id, user, navigate]);

  const today = new Date().toISOString().split("T")[0];
  const dateError = startDate && endDate && startDate >= endDate
    ? "La date de fin doit être après la date de début." : null;

  const handleSave = async () => {
    if (!user || !id || dateError) return;
    setSaving(true);
    const { error } = await supabase.from("sits").update({
      title,
      start_date: startDate,
      end_date: endDate,
      flexible_dates: flexibleDates,
      specific_expectations: specificExpectations,
      open_to: openTo,
    }).eq("id", id).eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de sauvegarder." });
      return;
    }
    toast({ title: "Annonce mise à jour ✓" });
    navigate(`/sits/${id}`);
  };

  if (loading) return <div className="p-6 md:p-10 text-muted-foreground">Chargement...</div>;

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto animate-fade-in pb-40">
      <Link to={`/sits/${id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Retour à l'annonce
      </Link>

      <h1 className="font-heading text-2xl md:text-3xl font-bold mb-2">Modifier l'annonce</h1>
      <p className="text-muted-foreground mb-8 text-sm">Modifiez les informations spécifiques à cette garde. Le logement et les animaux se gèrent depuis votre profil.</p>

      <div className="space-y-6 pb-32">
        <div>
          <Label className="text-sm font-medium">Titre de l'annonce</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} className="mt-1.5" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Date de début</Label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} min={today} className="mt-1.5" />
          </div>
          <div>
            <Label className="text-sm font-medium">Date de fin</Label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate || today} className="mt-1.5" />
          </div>
        </div>
        {dateError && (
          <p className="text-sm text-destructive flex items-center gap-1.5 -mt-2">
            <AlertCircle className="h-3.5 w-3.5" /> {dateError}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Switch checked={flexibleDates} onCheckedChange={setFlexibleDates} />
          <Label className="text-sm">Dates flexibles</Label>
        </div>

        <div>
          <Label className="text-sm font-medium">Attentes spécifiques à cette garde</Label>
          <Textarea
            placeholder="Ce qui est particulier à cette garde"
            value={specificExpectations}
            onChange={e => setSpecificExpectations(e.target.value)}
            className="mt-1.5"
            rows={4}
          />
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">Annonce ouverte à</Label>
          <ChipSelect options={openToOptions} selected={openTo} onChange={setOpenTo} />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-card border-t border-border p-4 z-40">
        <div className="max-w-3xl mx-auto flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => navigate(`/sits/${id}`)}>
            Annuler
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving || !!dateError}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditSit;