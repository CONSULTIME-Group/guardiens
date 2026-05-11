import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Shield } from "lucide-react";

const OwnerPitchSection = ({ user }: { user: any }) => {
  const [loaded, setLoaded] = useState(false);
  // Défaut OFF : on protège la valeur des annonces de garde.
  // L'entraide (petites missions) n'est PAS impactée par ce réglage.
  const [accept, setAccept] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      const ownerRole = profile?.role === "owner" || profile?.role === "both";
      setIsOwner(ownerRole);
      if (ownerRole) {
        const { data } = await supabase.from("owner_profiles").select("accept_unsolicited_pitches").eq("user_id", user.id).maybeSingle();
        if (data) setAccept(data.accept_unsolicited_pitches ?? false);
      }
      setLoaded(true);
    })();
  }, [user]);

  if (!loaded || !isOwner) return null;

  const handleToggle = async (v: boolean) => {
    setAccept(v);
    const { error } = await supabase.from("owner_profiles").update({ accept_unsolicited_pitches: v }).eq("user_id", user.id);
    if (error) {
      toast.error("Erreur lors de la sauvegarde");
      setAccept(!v);
    } else {
      toast.success(v ? "Les gardiens peuvent vous proposer une garde spontanément." : "Les gardiens ne pourront pas vous démarcher pour une garde.");
    }
  };

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-primary" />
        <h2 className="font-heading text-lg font-semibold">Démarchage spontané pour une garde</h2>
      </div>
      <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex-1">
          <Label className="text-sm font-medium">Autoriser les gardiens à me proposer une garde sans annonce active</Label>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Recommandé : laissez désactivé. Les gardiens passent ainsi par vos annonces publiées, ce qui garantit un cadre clair (dates, animaux, attentes).
          </p>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            <strong className="text-foreground">L'entraide entre voisins reste toujours ouverte :</strong> ce réglage ne concerne <em>que</em> les propositions de garde. Les coups de main ponctuels (petites missions) peuvent vous être proposés librement.
          </p>
        </div>
        <Switch checked={accept} onCheckedChange={handleToggle} />
      </div>
    </section>
  );
};

export default OwnerPitchSection;
