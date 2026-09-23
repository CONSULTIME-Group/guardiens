import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { hasMoneyMention } from "@/lib/missionContentGuards";
import { toast } from "sonner";

/** Ancre visée par le bouton de l'email Entraide n°1. */
export const HELPS_WITH_ANCHOR = "ce-que-je-propose";

const HelpsWithReminder = () => {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    void supabase.from("profiles").select("available_for_help, helps_with").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (active) setVisible(Boolean(data?.available_for_help && !data.helps_with?.trim()));
    });
    return () => { active = false; };
  }, [user?.id]);

  // Arrivée depuis l'email : le bloc est déjà déplié, on amène la personne
  // dessus et le curseur se place dans le champ.
  useEffect(() => {
    if (!visible) return;
    if (window.location.hash !== `#${HELPS_WITH_ANCHOR}`) return;
    const timer = window.setTimeout(() => {
      fieldRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      fieldRef.current?.focus();
    }, 150);
    return () => window.clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  const save = async () => {
    const clean = value.trim();
    if (!clean || hasMoneyMention(clean)) {
      toast.error("Décrivez un coup de main sans mention d'argent.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ helps_with: clean }).eq("id", user?.id || "");
    setSaving(false);
    if (error) {
      toast.error("Votre réponse sera enregistrée dans un instant. Réessayez.");
      return;
    }
    setVisible(false);
    toast.success("Votre réponse est enregistrée.");
  };

  return (
    <section
      id={HELPS_WITH_ANCHOR}
      className="mx-auto mb-5 w-full max-w-6xl scroll-mt-24 px-4 sm:px-5 md:px-8"
      aria-labelledby="helps-with-title"
    >
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 sm:p-5">
        <h2 id="helps-with-title" className="font-heading text-lg font-semibold text-foreground">
          Une chose que vous aimez faire pour les gens du coin ?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">En échange d'un merci ou d'un service. 200 caractères.</p>
        <Textarea ref={fieldRef} value={value} onChange={(event) => setValue(event.target.value)} maxLength={200} className="mt-3" />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">{value.length}/200</span>
          <Button type="button" size="sm" onClick={save} disabled={saving || value.trim().length === 0}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HelpsWithReminder;
