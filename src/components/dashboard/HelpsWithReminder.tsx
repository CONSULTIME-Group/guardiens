import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/** Ancre historique de l'email Entraide n°1, conservée pour les anciens liens. */
export const HELPS_WITH_ANCHOR = "ce-que-je-propose";

/**
 * Rappel du tableau de bord : renvoie vers l'écran unique /ma-ligne,
 * seul endroit où la ligne d'entraide s'écrit.
 */
const HelpsWithReminder = () => {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    void supabase.from("profiles").select("available_for_help, helps_with").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (active) setVisible(Boolean(data?.available_for_help && !data.helps_with?.trim()));
    });
    return () => { active = false; };
  }, [user?.id]);

  if (!visible) return null;

  return (
    <section
      id={HELPS_WITH_ANCHOR}
      className="mx-auto mb-5 w-full max-w-6xl scroll-mt-24 px-4 sm:px-5 md:px-8"
      aria-labelledby="helps-with-title"
    >
      <div className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h2 id="helps-with-title" className="font-heading text-lg font-semibold text-foreground">
            Une chose que vous aimez faire pour les gens du coin ?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Une ligne suffit, trente secondes.</p>
        </div>
        <Link
          to="/ma-ligne"
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          J'écris ma ligne
        </Link>
      </div>
    </section>
  );
};

export default HelpsWithReminder;
