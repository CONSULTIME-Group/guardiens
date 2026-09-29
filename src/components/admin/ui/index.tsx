import { useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { UNAVAILABLE_LABEL } from "@/lib/admin/readError";
import { cellValue } from "@/lib/admin/labels";

/** Lot A11 : composants partagés de l'admin, un seul de chaque. */

type Tone = "default" | "primary" | "success" | "warning" | "info" | "destructive";

const TONE: Record<Tone, string> = {
  default: "text-foreground",
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  info: "text-info",
  destructive: "text-destructive",
};

export interface KpiTileProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}

export const KpiTile = ({ label, value, hint, icon, tone = "default", onClick, active, className }: KpiTileProps) => {
  const Comp: any = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-colors",
        onClick && "hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active && "border-primary ring-1 ring-primary/30",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className={cn("mt-1 font-heading text-2xl font-semibold tabular-nums", TONE[tone])}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </Comp>
  );
};

export const EmptyState = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground", className)}>
    {children}
  </div>
);

export const ErrorState = ({ detail, onRetry, className }: { detail?: string; onRetry?: () => void; className?: string }) => (
  <div role="alert" className={cn("rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-4 text-sm text-destructive flex flex-wrap items-center gap-3", className)}>
    <span className="font-medium">{UNAVAILABLE_LABEL}</span>
    {detail && <span className="text-destructive/80">{detail}</span>}
    {onRetry && (
      <Button size="sm" variant="outline" onClick={onRetry} className="ml-auto">
        <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Relancer la lecture
      </Button>
    )}
  </div>
);

export const LoadingState = ({ label = "Chargement…", className }: { label?: string; className?: string }) => (
  <div role="status" className={cn("flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground", className)}>
    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
    {label}
  </div>
);

export const FilterBar = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>
);

export interface DataColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Colonne secondaire : masquée sous md. */
  secondary?: boolean;
  align?: "left" | "right";
}

export function DataTable<T>({
  columns, rows, rowKey, empty,
}: {
  columns: DataColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: ReactNode;
}) {
  if (rows.length === 0) return <EmptyState>{empty ?? "La liste se remplira dès la première entrée."}</EmptyState>;
  const cls = (c: DataColumn<T>) => cn(c.secondary && "hidden md:table-cell", c.align === "right" && "text-right tabular-nums");
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>{columns.map((c) => <TableHead key={c.key} className={cls(c)}>{c.header}</TableHead>)}</TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={rowKey(r)}>
              {columns.map((c) => {
                const v = c.cell(r);
                return <TableCell key={c.key} className={cls(c)}>{typeof v === "string" || v == null ? cellValue(v) : v}</TableCell>;
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** Pagination locale par 24 avec recherche, pour les longues listes. */
export const PAGE_SIZE = 24;

export const Pager = ({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) => {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-2 pt-2 text-sm text-muted-foreground">
      <span>Page {page + 1} sur {pages} · {total} éléments</span>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={page === 0} onClick={() => onPage(page - 1)}>Précédente</Button>
        <Button size="sm" variant="outline" disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>Suivante</Button>
      </div>
    </div>
  );
};

/** Recherche insensible à la casse et aux accents, puis pagination par 24. */
export const normalizeSearch = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function usePagedSearch<T>(rows: T[], text: (row: T) => string) {
  const [query, setQueryRaw] = useState("");
  const [page, setPage] = useState(0);
  const q = normalizeSearch(query.trim());
  const filtered = q ? rows.filter((r) => normalizeSearch(text(r)).includes(q)) : rows;
  const maxPage = Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1);
  const current = Math.min(page, maxPage);
  const visible = filtered.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  const setQuery = (v: string) => { setQueryRaw(v); setPage(0); };
  return { query, setQuery, page: current, setPage, filtered, visible, total: filtered.length };
}

export const SearchInput = ({ value, onChange, placeholder = "Rechercher", className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) => (
  <Input type="search" aria-label={placeholder} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className={cn("max-w-xs", className)} />
);
