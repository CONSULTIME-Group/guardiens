import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Nombre de fiches liées sur une page département. */
export const DEPARTMENT_SITTER_LINKS_SIZE = 12;

export interface DepartmentSitterLink {
  id: string;
  first_name: string | null;
  city: string | null;
}

export interface DepartmentPublicSitters {
  sitters: DepartmentSitterLink[];
  total: number;
  /** Vrai tant que la lecture n'est pas terminée (réussie, vide ou en erreur). */
  isLoading: boolean;
}

/**
 * Gardiens d'un département, lus dans la vue publique `public_profiles`
 * uniquement (prénom et ville, déjà publics sur /gardiens/:id). Aucun
 * filtre de vivier : tri par identité vérifiée, puis photo, puis
 * identifiant (ordre stable), puis plafond. Le nombre réel est renvoyé
 * pour le lien vers la liste complète.
 */
export function useDepartmentPublicSitters(departmentName: string | null | undefined): DepartmentPublicSitters {
  const { data, isLoading, isFetched } = useQuery({
    queryKey: ["department-public-sitters", departmentName],
    enabled: !!departmentName,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: dept, error: deptError } = await supabase
        .from("departements")
        .select("code")
        .eq("nom", departmentName!)
        .maybeSingle();
      const code = (dept?.code as string | undefined) ?? null;
      if (deptError || !code) return { sitters: [] as DepartmentSitterLink[], total: 0 };
      const { data: rows, count, error } = await supabase
        .from("public_profiles")
        .select("id, first_name, city", { count: "exact" })
        .in("role", ["sitter", "both"])
        .eq("departement_code", code)
        .not("first_name", "is", null)
        .order("identity_verified", { ascending: false, nullsFirst: false })
        .order("avatar_url", { ascending: true, nullsFirst: false })
        .order("id", { ascending: true })
        .limit(DEPARTMENT_SITTER_LINKS_SIZE);
      if (error) return { sitters: [] as DepartmentSitterLink[], total: 0 };
      return { sitters: (rows ?? []) as DepartmentSitterLink[], total: count ?? 0 };
    },
  });
  return {
    sitters: data?.sitters ?? [],
    total: data?.total ?? 0,
    isLoading: !!departmentName && (isLoading || !isFetched),
  };
}

interface Props {
  deptIn: string;
  sitters: DepartmentSitterLink[];
  total: number;
}

/** Liens HTML vers les fiches publiques des gardiens du département. */
const DepartmentSitterLinks = ({ deptIn, sitters, total }: Props) => {
  if (sitters.length === 0) return null;
  return (
    <section className="max-w-5xl mx-auto px-4 py-6 md:py-10 border-t border-border">
      <h2 className="font-heading text-2xl font-bold text-foreground mb-4">Des gardiens inscrits {deptIn}</h2>
      <ul className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {sitters.map((s) => (
          <li key={s.id}>
            <Link to={`/gardiens/${s.id}`} className="text-sm text-primary hover:underline">
              {s.first_name}
              {s.city ? `, ${s.city}` : ""}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm">
        <Link to="/recherche-gardiens" className="text-primary hover:underline">
          Voir tous les gardiens
        </Link>
        <span className="text-muted-foreground"> ({total} inscrits {deptIn})</span>
      </p>
    </section>
  );
};

export default DepartmentSitterLinks;
