import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { GSCRow } from "@/hooks/useSeoData";

interface GSCTableProps {
  rows: GSCRow[];
}

const PositionBadge = ({ position }: { position: number }) => {
  const rounded = Math.round(position * 10) / 10;
  if (rounded <= 3) return <Badge className="bg-emerald-600 text-white">{rounded}</Badge>;
  if (rounded <= 10) return <Badge className="bg-orange-500 text-white">{rounded}</Badge>;
  return <Badge className="bg-red-500 text-white">{rounded}</Badge>;
};

const GSCQueriesTable = ({ rows }: GSCTableProps) => {
  if (!rows || rows.length === 0) {
    return <div className="text-sm text-muted-foreground py-4">Aucune donnée disponible</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Requête</TableHead>
          <TableHead className="text-right">Clics</TableHead>
          <TableHead className="text-right">Impressions</TableHead>
          <TableHead className="text-right">CTR</TableHead>
          <TableHead className="text-center">Position</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => {
          const label = row.keys?.[0] || "—";
          return (
            <TableRow key={i}>
              <TableCell className="max-w-[300px]">
                <span className="truncate text-sm font-medium block">{label}</span>
              </TableCell>
              <TableCell className="text-right font-medium">{row.clicks}</TableCell>
              <TableCell className="text-right text-muted-foreground">{row.impressions.toLocaleString()}</TableCell>
              <TableCell className="text-right text-muted-foreground">{(row.ctr * 100).toFixed(1)}%</TableCell>
              <TableCell className="text-center">
                <PositionBadge position={row.position} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default GSCQueriesTable;
