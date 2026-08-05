import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

interface BlockedMember {
  id: string;
  blocked_id: string;
  first_name: string | null;
  avatar_url: string | null;
}

/**
 * Liste des membres bloqués, avec déblocage.
 * La policy "Users can unblock" de blocked_users autorise la suppression
 * par le bloqueur, cette carte en est la surface d'usage.
 */
const BlockedMembersCard = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<BlockedMember[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data: blocks } = await supabase
      .from("blocked_users")
      .select("id, blocked_id")
      .eq("blocker_id", user.id)
      .order("created_at", { ascending: false });
    const list = (blocks ?? []) as { id: string; blocked_id: string }[];
    if (list.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data: profiles } = await supabase
      .from("public_profiles" as any)
      .select("id, first_name, avatar_url")
      .in("id", list.map((b) => b.blocked_id));
    const byId = new Map(((profiles ?? []) as any[]).map((p) => [p.id, p]));
    setRows(
      list.map((b) => ({
        id: b.id,
        blocked_id: b.blocked_id,
        first_name: byId.get(b.blocked_id)?.first_name ?? null,
        avatar_url: byId.get(b.blocked_id)?.avatar_url ?? null,
      })),
    );
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { void load(); }, [load]);

  const unblock = async (id: string) => {
    const { error } = await supabase.from("blocked_users").delete().eq("id", id);
    if (error) {
      toast({ title: "Déblocage impossible", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Membre débloqué" });
    await load();
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div>
        <h3 className="font-heading font-semibold text-foreground text-sm">Membres bloqués</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Un membre bloqué ne peut plus vous écrire ni voir vos publications. Vous pouvez le débloquer à tout moment.
        </p>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Vous n'avez bloqué aucun membre.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
              <Avatar className="h-8 w-8">
                <AvatarImage src={r.avatar_url ?? undefined} alt="" />
                <AvatarFallback>{(r.first_name ?? "M").slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="flex-1 min-w-0 text-sm text-foreground truncate">
                {r.first_name ?? "Membre"}
              </span>
              <ConfirmDialog
                trigger={<Button variant="outline" size="sm">Débloquer</Button>}
                title="Débloquer ce membre ?"
                description="Il pourra de nouveau vous contacter et voir vos publications."
                confirmLabel="Débloquer"
                onConfirm={() => unblock(r.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default BlockedMembersCard;
