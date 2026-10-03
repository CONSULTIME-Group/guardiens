import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { publicFirstName } from "@/lib/displayName";

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
  /** Lecture en échec : distinct d'un total réel de zéro. */
  isError: boolean;
}

/**
 * Gardiens d'un département, lus dans la vue publique `public_profiles`
 * uniquement (prénom et ville, déjà publics sur /gardiens/:id). Aucun
 * filtre de vivier (ni complétion, ni vérification, ni prénom renseigné) :
 * tri par identité vérifiée, puis avatar_url non nul d'abord (à l'intérieur,
 * ordre alphabétique de l'adresse de l'image, sans signification, seulement
 * stable), puis identifiant, puis plafond. Le nombre réel est renvoyé pour le
 * lien vers la liste complète.
 */
export function useDepartmentPublicSitters(departmentName: string | null | undefined): DepartmentPublicSitters {
  const { data, isLoading, isFetched, isError } = useQuery({
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
      if (deptError) throw deptError;
      if (!code) return { sitters: [] as DepartmentSitterLink[], total: 0 };
      const { data: rows, count, error } = await supabase
        .from("public_profiles")
        .select("id, first_name, city", { count: "exact" })
        .in("role", ["sitter", "both"])
        .eq("departement_code", code)
        .order("identity_verified", { ascending: false, nullsFirst: false })
        .order("avatar_url", { ascending: true, nullsFirst: false })
        .order("id", { ascending: true })
        .limit(DEPARTMENT_SITTER_LINKS_SIZE);
      if (error) throw error;
      return { sitters: (rows ?? []) as DepartmentSitterLink[], total: count ?? 0 };
    },
  });
  return {
    sitters: data?.sitters ?? [],
    total: data?.total ?? 0,
    isLoading: !!departmentName && (isLoading || !isFetched),
    isError,
  };
}

interface Props {
  deptIn: string;
  sitters: DepartmentSitterLink[];
  total: number;
  isError?: boolean;
}

/** Libellé affiché : prénom public, repli neutre si absent (jamais d'identifiant). */
export const sitterLinkLabel = (s: DepartmentSitterLink): string => {
  const name = publicFirstName(s.first_name) || "Gardien inscrit";
  return s.city ? `${name}, ${s.city}` : name;
};

/** Liens HTML vers les fiches publiques des gardiens du département. */
const DepartmentSitterLinks = ({ deptIn, sitters, total, isError = false }: Props) => {
  return (
    <section className="max-w-5xl mx-auto px-4 py-6 md:py-10 border-t border-border">
      <h2 className="font-heading text-2xl font-bold text-foreground mb-4">Des gardiens inscrits {deptIn}</h2>
      {isError ? (
        <p className="text-sm text-muted-foreground">La liste des gardiens n'a pas pu être chargée.</p>
      ) : sitters.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun gardien n'est encore inscrit {deptIn}.</p>
      ) : (
        <ul className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {sitters.map((s) => (
            <li key={s.id}>
              <Link to={`/gardiens/${s.id}`} className="text-sm text-primary hover:underline">
                {sitterLinkLabel(s)}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-sm">
        <Link to="/recherche-gardiens" className="text-primary hover:underline">
          Voir tous les gardiens
        </Link>
        {!isError && <span className="text-muted-foreground"> ({total} inscrits {deptIn})</span>}
      </p>
    </section>
  );
};

export default DepartmentSitterLinks;
