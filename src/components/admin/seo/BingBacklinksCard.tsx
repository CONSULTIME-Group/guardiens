import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link2 } from "lucide-react";
import { useBingData, type BingLinkRow } from "@/hooks/useBingData";

/**
 * Top backlinks Bing (GetLinkCounts). Affiche les domaines référents
 * principaux avec le nombre de liens entrants.
 */
export default function BingBacklinksCard() {
  const { data, isLoading } = useBingData();

  if (data?.error || isLoading) return null;

  const raw = (data?.links && "d" in data.links ? data.links.d : undefined) as unknown;
  const rows: BingLinkRow[] = Array.isArray(raw) ? (raw as BingLinkRow[]) : [];
  if (rows.length === 0) return null;

  const top = [...rows].sort((a, b) => (b.Count ?? 0) - (a.Count ?? 0)).slice(0, 15);
  const total = rows.reduce((s, r) => s + (r.Count ?? 0), 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Link2 className="h-4 w-4 text-primary" />
          Backlinks Bing
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {rows.length.toLocaleString()} pages référentes, {total.toLocaleString()} liens au total
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 text-xs">
          {top.map((r, i) => (
            <div key={i} className="flex justify-between gap-2 border-b border-border/40 pb-1">
              <a
                href={r.Url ?? "#"}
                target="_blank"
                rel="noreferrer noopener"
                className="truncate font-mono hover:underline text-foreground"
              >
                {(r.Url ?? "–").replace(/^https?:\/\//, "")}
              </a>
              <span className="font-mono shrink-0 text-muted-foreground">
                {(r.Count ?? 0).toLocaleString()} liens
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
