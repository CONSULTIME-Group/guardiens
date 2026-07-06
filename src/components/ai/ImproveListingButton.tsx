// Bouton + dialog pour améliorer titre/description d'une annonce via l'IA.
// Branché sur l'edge function `improve-sit-description`.

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { AlmaAvatar } from "./alma/AlmaAvatar";


type Props = {
  title: string;
  description: string;
  context?: Record<string, unknown>;
  onApply: (patch: { title?: string; description?: string }) => void;
  disabled?: boolean;
};

export default function ImproveListingButton({ title, description, context, onApply, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ title: string; description: string; suggestions: string[] } | null>(null);
  const [applyTitle, setApplyTitle] = useState(true);
  const [applyDesc, setApplyDesc] = useState(true);

  const run = async () => {
    if (description.trim().length < 20) {
      toast({ title: "Texte trop court", description: "Écrivez au moins 20 caractères avant d'améliorer.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    setOpen(true);
    try {
      const { data, error } = await supabase.functions.invoke("improve-sit-description", {
        body: { title, description, context },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult(data as any);
    } catch (e: any) {
      toast({ title: "Amélioration impossible", description: e?.message || "Réessayez plus tard.", variant: "destructive" });
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    if (!result) return;
    const patch: { title?: string; description?: string } = {};
    if (applyTitle) patch.title = result.title;
    if (applyDesc) patch.description = result.description;
    onApply(patch);
    toast({ title: "Annonce mise à jour", description: "Vérifiez le résultat avant de publier." });
    setOpen(false);
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={run} disabled={disabled || loading} className="gap-2 text-primary">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlmaAvatar size={24} />}
        Améliorer avec Alma
      </Button>


      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Alma vous propose une amélioration</DialogTitle>
            <DialogDescription>Vous choisissez ce que vous gardez. Aucun changement n'est appliqué sans votre validation.</DialogDescription>
          </DialogHeader>

          {loading && (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Alma prépare…
            </div>
          )}


          {result && !loading && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="apply-title" checked={applyTitle} onCheckedChange={v => setApplyTitle(!!v)} />
                  <label htmlFor="apply-title" className="text-sm font-medium">Titre proposé</label>
                </div>
                <p className="text-sm bg-muted rounded-md p-3">{result.title}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="apply-desc" checked={applyDesc} onCheckedChange={v => setApplyDesc(!!v)} />
                  <label htmlFor="apply-desc" className="text-sm font-medium">Description proposée</label>
                </div>
                <p className="text-sm bg-muted rounded-md p-3 whitespace-pre-wrap">{result.description}</p>
              </div>

              {result.suggestions?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Conseils complémentaires</p>
                  <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                    {result.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={apply} disabled={!result || (!applyTitle && !applyDesc)}>Appliquer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
