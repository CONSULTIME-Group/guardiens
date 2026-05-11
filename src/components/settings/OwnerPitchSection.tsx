import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Shield } from "lucide-react";

const OwnerPitchSection = ({ user }: { user: any }) => {
  const [loaded, setLoaded] = useState(false);
  const [accept, setAccept] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      const ownerRole = profile?.role === "owner" || profile?.role === "both";
      setIsOwner(ownerRole);
      if (ownerRole) {
        const { data } = await supabase.from("owner_profiles").select("accept_unsolicited_pitches").eq("user_id", user.id).maybeSingle();
        if (data) setAccept(data.accept_unsolicited_pitches ?? true);
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
      toast.success(v ? "Vous recevrez les contacts spontanés." : "Vous ne recevrez plus de contacts spontanés.");
    }
  };

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-primary" />
        <h2 className="font-heading text-lg font-semibold">Contacts spontanés des gardiens</h2>
      </div>
      <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex-1">
          <Label className="text-sm font-medium">Autoriser les gardiens à me contacter sans annonce</Label>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Les gardiens peuvent vous contacter même si vous n'avez pas d'annonce active. Désactivez si vous préférez ne recevoir que des candidatures sur vos annonces publiées.
          </p>
        </div>
        <Switch checked={accept} onCheckedChange={handleToggle} />
      </div>
    </section>
  );
};

export default OwnerPitchSection;
