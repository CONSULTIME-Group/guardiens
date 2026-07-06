// Mini-wizard 5 questions, génère 3 brouillons de bio, choix au clic.

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { AlmaAvatar } from "./alma/AlmaAvatar";


type Draft = { tone: "chaleureux" | "professionnel" | "concis"; text: string };

const TONE_LABEL: Record<Draft["tone"], string> = {
  chaleureux: "Chaleureux",
  professionnel: "Professionnel",
  concis: "Concis",
};

type Props = {
  onPick: (text: string) => void;
};

export default function GenerateBioButton({ onPick }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"form" | "loading" | "drafts">("form");
  const [drafts, setDrafts] = useState<Draft[]>([]);

  const [experience, setExperience] = useState("");
  const [animals, setAnimals] = useState("");
  const [motivation, setMotivation] = useState("");
  const [availability, setAvailability] = useState("");
  const [style, setStyle] = useState("");

  const canSubmit = experience.trim().length >= 5 && animals.trim().length >= 3 && motivation.trim().length >= 5;

  const reset = () => {
    setStep("form");
    setDrafts([]);
  };

  const submit = async () => {
    setStep("loading");
    try {
      const { data, error } = await supabase.functions.invoke("generate-bio-drafts", {
        body: { answers: { experience, animals, motivation, availability, style } },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setDrafts(((data as any)?.drafts || []) as Draft[]);
      setStep("drafts");
    } catch (e: any) {
      toast({ title: "Génération impossible", description: e?.message || "Réessayez plus tard.", variant: "destructive" });
      setStep("form");
    }
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => { reset(); setOpen(true); }} className="gap-2">
        <Sparkles className="h-4 w-4" />
        Générer ma bio
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Brouillons de bio</DialogTitle>
            <DialogDescription>Répondez en quelques mots, l'IA propose 3 versions. Vous choisissez celle qui vous ressemble.</DialogDescription>
          </DialogHeader>

          {step === "form" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Votre expérience avec les animaux (en quelques mots)</Label>
                <Input value={experience} onChange={e => setExperience(e.target.value)} placeholder="Ex : j'ai eu 2 chiens et 1 chat pendant 15 ans" maxLength={200} />
              </div>
              <div className="space-y-1.5">
                <Label>Animaux que vous êtes à l'aise de garder</Label>
                <Input value={animals} onChange={e => setAnimals(e.target.value)} placeholder="Ex : chiens calmes, chats, petits NAC" maxLength={200} />
              </div>
              <div className="space-y-1.5">
                <Label>Pourquoi vous voulez devenir gardien</Label>
                <Textarea value={motivation} onChange={e => setMotivation(e.target.value)} placeholder="Ex : besoin de coupures dans mon télétravail, j'adore la compagnie des animaux" rows={3} maxLength={400} />
              </div>
              <div className="space-y-1.5">
                <Label>Vos disponibilités habituelles <span className="text-muted-foreground font-normal text-xs">(optionnel)</span></Label>
                <Input value={availability} onChange={e => setAvailability(e.target.value)} placeholder="Ex : week-ends et vacances scolaires" maxLength={150} />
              </div>
              <div className="space-y-1.5">
                <Label>Quelque chose à ajouter sur vous <span className="text-muted-foreground font-normal text-xs">(optionnel)</span></Label>
                <Input value={style} onChange={e => setStyle(e.target.value)} placeholder="Ex : ancienne aide-vétérinaire, retraitée, photographe amateur" maxLength={200} />
              </div>
            </div>
          )}

          {step === "loading" && (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Rédaction des 3 brouillons…
            </div>
          )}

          {step === "drafts" && (
            <div className="space-y-3">
              {drafts.map((d, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-2 hover:border-primary transition">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-primary">{TONE_LABEL[d.tone]}</span>
                    <Button size="sm" variant="default" onClick={() => { onPick(d.text); setOpen(false); toast({ title: "Bio insérée", description: "Vous pouvez encore la modifier librement." }); }}>
                      Utiliser
                    </Button>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{d.text}</p>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => setStep("form")}>← Modifier mes réponses</Button>
            </div>
          )}

          <DialogFooter>
            {step === "form" && (
              <>
                <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
                <Button onClick={submit} disabled={!canSubmit}>Générer</Button>
              </>
            )}
            {step === "drafts" && (
              <Button variant="ghost" onClick={() => setOpen(false)}>Fermer</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
