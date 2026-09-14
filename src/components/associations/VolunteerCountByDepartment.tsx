/**
 * Compteur public des personnes déclarées disponibles pour donner un coup de
 * main à une association, par département.
 *
 * Source : la vue `public_volunteer_counts`, lisible par tout le monde. Elle
 * applique un seuil de 3 en base : un département sous ce seuil n'y figure
 * simplement pas. Le composant suit la même règle et ne rend rien du tout
 * quand le département est absent : pas d'état vide, pas de zéro, pas de
 * message d'attente. Il s'allumera le jour où le seuil sera franchi.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type CountRow = { departement_code: string; nb_disponibles: number };

export const useVolunteerCounts = () => {
  const { data } = useQuery({
    queryKey: ["public-volunteer-counts"],
    staleTime: 30 * 60 * 1000,
    queryFn: async (): Promise<CountRow[]> => {
      const { data } = await supabase
        .from("public_volunteer_counts" as any)
        .select("departement_code, nb_disponibles");
      return ((data as any) ?? []) as CountRow[];
    },
  });
  return new Map((data ?? []).map((r) => [String(r.departement_code), r.nb_disponibles]));
};

interface Props {
  departementCode: string | null | undefined;
  className?: string;
}

export const VolunteerCountByDepartment = ({ departementCode, className }: Props) => {
  const counts = useVolunteerCounts();
  const code = (departementCode ?? "").trim();
  const n = code ? counts.get(code) : undefined;
  if (!n || n < 1) return null;

  return (
    <p className={cn("text-sm text-muted-foreground font-body", className)}>
      <span className="font-heading text-base font-semibold text-foreground">{n}</span>{" "}
      personnes se sont déclarées disponibles dans ce département pour donner un coup de main.
    </p>
  );
};

export default VolunteerCountByDepartment;
