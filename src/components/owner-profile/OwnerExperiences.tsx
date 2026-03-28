import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CheckCircle2, Clock, XCircle, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { compressImageFile } from "@/lib/compressImage";

const PLATFORMS = [
  "TrustedHousesitters", "Nomador", "Emprunte Mon Toutou", "Bouche à oreille", "Autre",
];

const statusBadge: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  pending: { label: "En attente de vérification", icon: Clock, className: "bg-orange-100 text-orange-700" },
  verified: { label: "Vérifiée ✓", icon: CheckCircle2, className: "bg-green-100 text-green-700" },
  rejected: { label: "Rejetée", icon: XCircle, className: "bg-destructive/10 text-destructive" },
};

const OwnerExperiences = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [experiences, setExperiences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [platform, setPlatform] = useState("TrustedHousesitters");
  const [summary, setSummary] = useState("");
  const [animalTypes, setAnimalTypes] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [duration, setDuration] = useState("");
  const [expDate, setExpDate] = useState("");
  const [screenshots, setScreenshots] = useState<File[]>([]);

  const loadExperiences = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("external_experiences")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setExperiences(data || []);
    setLoading(false);
  };

  useEffect(() => { loadExperiences(); }, [user]);

  const handleSubmit = async () => {
    if (!user || !summary.trim()) return;
    setSubmitting(true);

    // Upload screenshots
    const urls: string[] = [];
    for (const file of screenshots.slice(0, 3)) {
      const ext = file.name.split(".").pop();
      const path = `owner-exp/${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("experience-screenshots").upload(path, file);
      if (!error) {
        const { data: u } = supabase.storage.from("experience-screenshots").getPublicUrl(path);
        urls.push(u.publicUrl);
      }
    }

    const { error } = await supabase.from("external_experiences").insert({
      user_id: user.id,
      platform_name: platform,
      summary: summary.trim(),
      animal_types: animalTypes.trim(),
      city: city.trim() || null,
      country: country.trim() || null,
      duration: duration.trim(),
      experience_date: expDate.trim(),
      screenshot_urls: urls,
    });

    setSubmitting(false);
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    } else {
      toast({ title: "Expérience soumise !", description: "Elle sera vérifiée par notre équipe." });
      setShowForm(false);
      resetForm();
      loadExperiences();
    }
  };

  const resetForm = () => {
    setPlatform("TrustedHousesitters");
    setSummary("");
    setAnimalTypes("");
    setCity("");
    setCountry("");
    setDuration("");
    setExpDate("");
    setScreenshots([]);
  };

  if (loading) return <div className="text-muted-foreground text-sm">Chargement...</div>;

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl font-bold">Mes expériences d'accueil</h2>
      <p className="text-sm text-muted-foreground">
        Montrez que vous avez l'habitude d'accueillir des gardiens — importez vos expériences d'autres plateformes.
      </p>

      {/* Existing experiences */}
      {experiences.length > 0 && (
        <div className="space-y-3">
          {experiences.map((exp: any) => {
            const badge = statusBadge[exp.verification_status] || statusBadge.pending;
            const Icon = badge.icon;
            return (
              <div key={exp.id} className="bg-card rounded-xl border border-border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{exp.platform_name}</span>
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
                    <Icon className="h-3 w-3" /> {badge.label}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{exp.summary}</p>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {exp.animal_types && <span>🐾 {exp.animal_types}</span>}
                  {exp.duration && <span>⏱ {exp.duration}</span>}
                  {exp.experience_date && <span>📅 {exp.experience_date}</span>}
                  {exp.city && <span>📍 {exp.city}{exp.country ? `, ${exp.country}` : ""}</span>}
                </div>
                {exp.admin_note && exp.verification_status === "rejected" && (
                  <p className="text-xs text-destructive bg-destructive/5 rounded p-2">{exp.admin_note}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add form */}
      {showForm ? (
        <div className="bg-card rounded-xl border border-primary/30 p-5 space-y-4">
          <h3 className="font-heading font-semibold">Ajouter une expérience</h3>

          <div className="space-y-2">
            <Label>Plateforme</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Screenshot de l'avis (1-3 images)</Label>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="h-3 w-3 mr-1" /> {screenshots.length > 0 ? `${screenshots.length} fichier(s)` : "Choisir"}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => setScreenshots(Array.from(e.target.files || []).slice(0, 3))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Résumé de l'expérience</Label>
            <Textarea
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="Décrivez cette expérience : qui a gardé, combien de temps, comment ça s'est passé..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Animaux gardés</Label>
            <Input value={animalTypes} onChange={e => setAnimalTypes(e.target.value)} placeholder="Ex : 2 labradors + 1 chat" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Ville</Label>
              <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Lyon" />
            </div>
            <div className="space-y-2">
              <Label>Pays</Label>
              <Input value={country} onChange={e => setCountry(e.target.value)} placeholder="France" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Durée</Label>
              <Input value={duration} onChange={e => setDuration(e.target.value)} placeholder="3 semaines" />
            </div>
            <div className="space-y-2">
              <Label>Date approximative</Label>
              <Input value={expDate} onChange={e => setExpDate(e.target.value)} placeholder="Août 2024" />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={submitting || !summary.trim()}>
              {submitting ? "Envoi..." : "Soumettre pour vérification"}
            </Button>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Annuler</Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setShowForm(true)} className="w-full">
          <Plus className="h-4 w-4 mr-2" /> Ajouter une expérience
        </Button>
      )}
    </div>
  );
};

export default OwnerExperiences;
