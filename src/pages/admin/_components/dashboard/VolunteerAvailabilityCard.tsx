import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { DEPT_NAMES } from "@/lib/departments";

interface Row {
  structure_types: string[] | null;
  departments: string[] | null;
}

const countBy = (rows: Row[], key: keyof Row) => {
  const acc = new Map<string, number>();
  for (const r of rows) {
    for (const v of r[key] ?? []) acc.set(v, (acc.get(v) ?? 0) + 1);
  }
  return [...acc.entries()].sort((a, b) => b[1] - a[1]);
};

/**
 * Compteur des personnes disponibles pour du bénévolat en association.
 * Lecture réservée aux administrateurs par les règles d'accès de la table.
 */
export const VolunteerAvailabilityCard = () => {
  const { data } = useQuery({
    queryKey: ["admin-volunteer-availability"],
    queryFn: async (): Promise<Row[]> => {
      const { data } = await supabase
        .from("volunteer_availability")
        .select("structure_types, departments")
        .eq("available", true);
      return data ?? [];
    },
  });

  const rows = data ?? [];
  const byStructure = countBy(rows, "structure_types");
  const byDept = countBy(rows, "departments").slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Bénévolat en association</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-2xl font-semibold">{rows.length}</p>
        <p className="text-sm text-muted-foreground">personnes disponibles</p>

        <div>
          <p className="text-sm font-medium mb-1">Par type de structure</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            {byStructure.map(([label, n]) => (
              <li key={label} className="flex justify-between gap-4">
                <span>{label}</span>
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-medium mb-1">Par département</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            {byDept.map(([code, n]) => (
              <li key={code} className="flex justify-between gap-4">
                <span>{DEPT_NAMES[code] ? `${code} ${DEPT_NAMES[code]}` : code}</span>
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default VolunteerAvailabilityCard;
