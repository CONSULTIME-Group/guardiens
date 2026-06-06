import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

/**
 * Outil admin : injecte des données de test dans sitter_profiles
 * (5 nouveaux champs StepExperience) puis force un reload pour confirmer
 * leur affichage côté UI.
 */
export default function AdminTestSitterFields() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const SAMPLE = {
    dog_sizes_accepted: ["small", "medium", "large"],
    demanding_breeds_ok: true,
    indoor_cats_only: true,
    own_animals: ["chien", "chat"],
    guard_experience: "experimente",
  };

  const injectTestData = async () => {
    setLoading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) {
        toast.error("Vous devez être connecté.");
        return;
      }

      const { data: existing } = await supabase
        .from("sitter_profiles")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();

      let error;
      if (existing) {
        ({ error } = await supabase
          .from("sitter_profiles")
          .update(SAMPLE)
          .eq("user_id", userId));
      } else {
        ({ error } = await supabase
          .from("sitter_profiles")
          .insert({ user_id: userId, ...SAMPLE }));
      }

      if (error) {
        toast.error(`Erreur : ${error.message}`);
        return;
      }

      toast.success("Données de test injectées. Rechargement…");
      setTimeout(() => window.location.assign("/profile?role=sitter&step=experience"), 800);
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setLoading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) return;
      const { data: row, error } = await supabase
        .from("sitter_profiles")
        .select(
          "dog_sizes_accepted, demanding_breeds_ok, indoor_cats_only, own_animals, guard_experience"
        )
        .eq("user_id", userId)
        .maybeSingle();
      if (error) {
        toast.error(error.message);
        return;
      }
      setData(row);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <h1 className="text-2xl font-bold">Test, 5 champs StepExperience</h1>
      <Card className="p-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          Injecte des valeurs de test dans <code>sitter_profiles</code> pour
          votre compte, puis recharge la page profil gardien à l'étape
          Expérience.
        </p>
        <pre className="text-xs bg-muted p-3 rounded overflow-auto">
          {JSON.stringify(SAMPLE, null, 2)}
        </pre>
        <div className="flex gap-2">
          <Button onClick={injectTestData} disabled={loading}>
            Injecter & recharger
          </Button>
          <Button variant="outline" onClick={verify} disabled={loading}>
            Vérifier en DB
          </Button>
        </div>
        {data && (
          <pre className="text-xs bg-muted p-3 rounded overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </Card>
    </div>
  );
}
