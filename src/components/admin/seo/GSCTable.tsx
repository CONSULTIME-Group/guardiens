import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { GSCRow } from "@/hooks/useSeoData";

interface GSCTableProps {
  title: string;
  rows: GSCRow[];
  type: "page" | "query";
}

const PositionBadge = ({ position }: { position: number }) => {
  const rounded = Math.round(position * 10) / 10;
  if (rounded <= 3) return <Badge className="bg-[#2D7D46] text-white">{rounded}</Badge>;
  if (rounded <= 10) return <Badge className="bg-[#F59E0B] text-white">{rounded}</Badge>;
  return <Badge className="bg-[#EF4444] text-white">{rounded}</Badge>;
};

const GSCTable = ({ title, rows, type }: GSCTableProps) => {
  if (!rows || rows.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4">Aucune donnée disponible</div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{type === "page" ? "Page" : "Requête"}</TableHead>
          <TableHead className="text-right">Clics</TableHead>
          <TableHead className="text-right">Impressions</TableHead>
          <TableHead className="text-right">CTR</TableHead>
          <TableHead className="text-center">Position</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => {
          const label = row.keys?.[0] || "—";
          const displayLabel = type === "page" 
            ? label.replace("https://guardiens.fr", "").replace("https://www.guardiens.fr", "") || "/"
            : label;

          return (
            <TableRow key={i}>
              <TableCell className="max-w-[300px]">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{displayLabel}</span>
                  {type === "page" && (
                    <a
                      href={label}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground shrink-0"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
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

export default GSCTable;
