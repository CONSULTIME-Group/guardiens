import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Upload, CheckCircle2, Clock, XCircle, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { compressImageFile } from "@/lib/compressImage";

const platformOptions = [
  "Rover",
  "TrustedHouseSitters",
  "Nomador",
  "Emprunte Mon Toutou",
  "Bouche à oreille",
  "Autre",
];

interface Experience {
  id: string;
  platform_name: string;
  screenshot_urls: string[];
  summary: string;
  animal_types: string;
  city: string | null;
  country: string | null;
  duration: string;
  experience_date: string;
  verification_status: "pending" | "verified" | "rejected";
  admin_note: string | null;
  created_at: string;
}

const statusConfig = {
  pending: { icon: Clock, label: "En attente de vérification", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  verified: { icon: CheckCircle2, label: "Expérience vérifiée", className: "bg-primary/10 text-primary" },
  rejected: { icon: XCircle, label: "Rejetée", className: "bg-destructive/10 text-destructive" },
};

const ExternalExperiences = () => {
  const { user } = useAuth();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [platform, setPlatform] = useState("");
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [summary, setSummary] = useState("");
  const [animalTypes, setAnimalTypes] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [duration, setDuration] = useState("");
  const [expDate, setExpDate] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("external_experiences").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => { setExperiences((data as any[]) || []); setLoading(false); });
  }, [user]);

  const resetForm = () => {
    setPlatform("");
    setScreenshots([]);
    setSummary("");
    setAnimalTypes("");
    setCity("");
    setCountry("");
    setDuration("");
    setExpDate("");
  };

  const handleSubmit = async () => {
    if (!user || !platform || !summary || screenshots.length === 0) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    if (summary.length > 300) {
      toast.error("Le résumé ne doit pas dépasser 300 caractères.");
      return;
    }
    // Validate screenshots
    for (const file of screenshots) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Chaque screenshot ne doit pas dépasser 5 Mo.");
        return;
      }
      const allowed = ["image/jpeg", "image/png", "image/webp"];
      if (!allowed.includes(file.type)) {
        toast.error("Format de screenshot non supporté. Utilisez JPG ou PNG.");
        return;
      }
    }
    setSubmitting(true);
    try {
      const urls: string[] = [];
      for (const rawFile of screenshots.slice(0, 3)) {
        const file = await compressImageFile(rawFile, 5, 2048);
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("experience-screenshots").upload(path, file);
        if (upErr) throw upErr;
        urls.push(path);
      }

      const { data, error } = await supabase.from("external_experiences").insert({
        user_id: user.id,
        platform_name: platform,
        screenshot_urls: urls,
        summary,
        animal_types: animalTypes,
        city: city || null,
        country: country || null,
        duration,
        experience_date: expDate,
      }).select().single();

      if (error) throw error;
      setExperiences(prev => [data as any, ...prev]);
      resetForm();
      setDialogOpen(false);
      toast.success("Expérience soumise pour vérification !");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la soumission. Vérifiez vos fichiers et réessayez.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-muted-foreground text-sm py-8 text-center">Chargement...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold">Expériences passées</h2>
          <p className="text-sm text-muted-foreground">Vos gardes passées ailleurs comptent aussi.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Ajouter une expérience</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Ajouter une expérience externe</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Plateforme *</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger><SelectValue placeholder="Choisir une plateforme" /></SelectTrigger>
                  <SelectContent>
                    {platformOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Screenshot de l'avis * (1-3 images, JPG/PNG, max 5 Mo chacune)</Label>
                <Input type="file" accept="image/jpeg,image/png" multiple onChange={e => setScreenshots(Array.from(e.target.files || []).slice(0, 3))} />
                <p className="text-xs text-muted-foreground mt-1">Faites une capture d'écran de l'avis que vous avez reçu sur l'autre plateforme.</p>
              </div>
              <div>
                <Label>Résumé de l'expérience * <span className="text-muted-foreground font-normal">({summary.length}/300)</span></Label>
                <Textarea value={summary} onChange={e => setSummary(e.target.value.slice(0, 300))} rows={4} maxLength={300} placeholder="Décrivez cette garde en quelques phrases : quels animaux, combien de temps, ce que vous avez aimé." />
              </div>
              <div>
                <Label>Animaux gardés *</Label>
                <Input value={animalTypes} onChange={e => setAnimalTypes(e.target.value)} placeholder="2 labradors + 1 chat" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Ville</Label>
                  <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Megève" />
                </div>
                <div>
                  <Label>Pays</Label>
                  <Input value={country} onChange={e => setCountry(e.target.value)} placeholder="France" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Durée *</Label>
                  <Input value={duration} onChange={e => setDuration(e.target.value)} placeholder="3 semaines" />
                </div>
                <div>
                  <Label>Date approximative</Label>
                  <Input type="month" value={expDate} onChange={e => setExpDate(e.target.value)} />
                </div>
              </div>
              <Button onClick={handleSubmit} disabled={!platform || !summary || screenshots.length === 0 || !animalTypes || !duration || submitting} className="w-full">
                <Upload className="h-4 w-4 mr-2" /> {submitting ? "Envoi en cours..." : "Soumettre pour vérification"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {experiences.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Vous avez de l'expérience sur d'autres plateformes ? Importez vos avis ici.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {experiences.map(exp => {
            const status = statusConfig[exp.verification_status];
            const StatusIcon = status.icon;
            return (
              <div key={exp.id} className="p-4 rounded-xl bg-card border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{exp.platform_name}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                      <StatusIcon className="h-3 w-3" /> {status.label}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{exp.summary}</p>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{exp.animal_types}</span>
                  {exp.city && <span>· {exp.city}{exp.country ? `, ${exp.country}` : ""}</span>}
                  <span>· {exp.duration}</span>
                  {exp.experience_date && <span>· {exp.experience_date}</span>}
                </div>
                {exp.verification_status === "rejected" && exp.admin_note && (
                  <p className="text-xs text-destructive">Motif : {exp.admin_note}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ExternalExperiences;
