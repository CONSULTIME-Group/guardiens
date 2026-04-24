import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { History, ChevronDown, ChevronUp } from "lucide-react";

interface DateChange {
  id: string;
  changed_by: string | null;
  changed_by_role: string | null;
  old_start_date: string | null;
  old_end_date: string | null;
  new_start_date: string | null;
  new_end_date: string | null;
  changed_at: string;
  actor_name?: string | null;
}

interface Props {
  sitId: string;
}

const formatDate = (d: string | null) =>
  d ? format(new Date(d), "d MMM yyyy", { locale: fr }) : "—";

const roleLabel = (role: string | null) => {
  switch (role) {
    case "admin":
      return "Admin";
    case "owner":
      return "Propriétaire";
    case "system":
      return "Système";
    default:
      return "Utilisateur";
  }
};

const SitDateHistory = ({ sitId }: Props) => {
  const [changes, setChanges] = useState<DateChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("sit_date_changes" as any)
        .select("*")
        .eq("sit_id", sitId)
        .order("changed_at", { ascending: false });

      if (error || !data) {
        setLoading(false);
        return;
      }

      const rows = data as unknown as DateChange[];
      const ids = Array.from(
        new Set(rows.map((r) => r.changed_by).filter(Boolean) as string[])
      );

      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", ids);

        const nameById = new Map<string, string>();
        (profiles || []).forEach((p: any) => {
          const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
          nameById.set(p.id, name || "Utilisateur");
        });

        rows.forEach((r) => {
          if (r.changed_by) r.actor_name = nameById.get(r.changed_by) || null;
        });
      }

      setChanges(rows);
      setLoading(false);
    };
    load();
  }, [sitId]);

  if (loading || changes.length === 0) return null;

  return (
    <div className="mt-4 rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 p-4 text-left"
      >
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            Historique des dates ({changes.length})
          </span>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <ul className="border-t border-border divide-y divide-border">
          {changes.map((c) => (
            <li key={c.id} className="p-4 text-sm space-y-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium">
                  {c.actor_name || roleLabel(c.changed_by_role)}
                  <span className="text-muted-foreground font-normal">
                    {" "}
                    · {roleLabel(c.changed_by_role)}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(c.changed_at), "d MMM yyyy 'à' HH:mm", {
                    locale: fr,
                  })}
                </span>
              </div>
              <div className="text-muted-foreground">
                <span className="line-through">
                  {formatDate(c.old_start_date)} → {formatDate(c.old_end_date)}
                </span>
                <span className="mx-2">⟶</span>
                <span className="text-foreground font-medium">
                  {formatDate(c.new_start_date)} → {formatDate(c.new_end_date)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SitDateHistory;
