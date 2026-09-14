import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { SPECIALTY_OPTIONS } from "@/lib/proSpecialties";
import { Loader2, ShieldCheck } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

/**
 * Déclaration de statut professionnel.
 *
 * Périmètre volontairement réduit à la seule déclaration : la spécialité
 * renseignée bascule `profiles.pro_status` en `declared` par déclencheur.
 * Cette déclaration sert la modération du positionnement entre particuliers
 * (signalement d'un tarif évoqué sans statut déclaré), elle reste interne.
 */

type ProStatus = "none" | "declared" | "pending" | "verified" | "rejected";

const ProVerificationSection = ({ user }: { user: any }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [proStatus, setProStatus] = useState<ProStatus>("none");
  const [specialty, setSpecialty] = useState<string>("");

  const loadAll = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data: profile } = await supabase
      .from("profiles")
      .select("pro_status, pro_specialty")
      .eq("id", user.id)
      .maybeSingle();
    if (profile) {
      setProStatus(((profile as any).pro_status as ProStatus) ?? "none");
      setSpecialty((profile as any).pro_specialty ?? "");
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadAll();
  }, [user?.id]);

  const saveProfile = async () => {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ pro_specialty: specialty || null } as any)
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Déclaration enregistrée" });
    await loadAll();
  };

  const clearProStatus = async () => {
    if (!user?.id) return;
    setClearing(true);
    const { error } = await supabase
      .from("profiles")
      .update({ pro_specialty: null } as any)
      .eq("id", user.id);
    setClearing(false);
    if (error) {
      toast({ title: "Impossible de retirer votre déclaration", description: error.message, variant: "destructive" });
      return;
    }
    setSpecialty("");
    toast({ title: "Déclaration retirée" });
    await loadAll();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement de votre déclaration…
      </div>
    );
  }

  return (
    <section id="pro" className="space-y-6">
      <header className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-heading text-xl font-bold text-foreground">Statut professionnel</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Vous exercez une activité animalière déclarée (éducateur, vétérinaire, toiletteur, comportementaliste,
            pension agréée) ? Indiquez votre spécialité : les échanges où vous évoquez vos tarifs restent lisibles
            par l'équipe comme une activité professionnelle assumée.
          </p>
        </div>
        {proStatus === "declared" && (
          <Badge className="bg-success/15 text-success border-success/30 hover:bg-success/15">Déclaré</Badge>
        )}
      </header>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="space-y-1.5 sm:max-w-md">
          <Label>Spécialité</Label>
          <Select value={specialty} onValueChange={setSpecialty}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              {SPECIALTY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={saveProfile} disabled={saving} className="w-full sm:w-auto">
          {saving ? "Enregistrement…" : "Enregistrer ma déclaration"}
        </Button>
      </div>

      {(proStatus !== "none" || specialty) && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 space-y-3">
          <h3 className="font-heading font-semibold text-foreground">Retirer ma déclaration</h3>
          <p className="text-sm text-muted-foreground">
            Votre spécialité est effacée et votre statut repasse à « aucun ». Vous pourrez déclarer à nouveau votre
            activité plus tard.
          </p>
          <ConfirmDialog
            trigger={
              <Button variant="destructive" disabled={clearing} className="w-full sm:w-auto">
                {clearing ? "Retrait en cours…" : "Retirer ma déclaration"}
              </Button>
            }
            title="Retirer votre déclaration ?"
            description="Votre spécialité est effacée et votre statut repasse à « aucun »."
            confirmLabel="Retirer"
            destructive
            onConfirm={clearProStatus}
          />
        </div>
      )}
    </section>
  );
};

export default ProVerificationSection;
