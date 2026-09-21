import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import EntraideProofCard from "@/components/entraide/EntraideProofCard";
import { selectProofs, PROOF_LIMIT, type EntraideProof } from "@/lib/entraideProofs";

/**
 * « Ça s'est passé près de chez vous » : au plus trois rencontres confirmées,
 * les plus récentes dans un rayon de cinquante kilomètres, sinon les plus
 * récentes de France.
 */
const EntraideProofs = ({ origin = null, title = "Ça s'est passé près de chez vous" }: {
  origin?: [number, number] | null;
  title?: string;
}) => {
  const [proofs, setProofs] = useState<EntraideProof[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("public_entraide_proofs")
        .select("mission_id, helper_first_name, owner_first_name, city, latitude_approx, longitude_approx, word, happened_at")
        .order("happened_at", { ascending: false })
        .limit(60);
      if (!cancelled) setProofs((data || []) as EntraideProof[]);
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const shown = selectProofs(proofs, origin, PROOF_LIMIT);
  if (shown.length === 0) return null;

  return (
    <section className="mt-10 border-t border-border pt-8" aria-labelledby="entraide-proofs-title">
      <h2 id="entraide-proofs-title" className="font-heading text-2xl font-semibold text-foreground">{title}</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {shown.map((proof) => <EntraideProofCard key={proof.mission_id} proof={proof} />)}
      </div>
    </section>
  );
};

export default EntraideProofs;
