import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format, isPast, isFuture } from "date-fns";
import { fr } from "date-fns/locale";

const AdminSitsManagement = () => {
  const [sits, setSits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");

  const fetchSits = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("sits")
      .select("*, profiles!sits_user_id_fkey(first_name, last_name)")
      .in("status", ["confirmed", "completed", "cancelled"])
      .order("start_date", { ascending: false });

    if (filterStatus === "confirmed") query = supabase.from("sits").select("*, profiles!sits_user_id_fkey(first_name, last_name)").eq("status", "confirmed").order("start_date", { ascending: false });
    if (filterStatus === "completed") query = supabase.from("sits").select("*, profiles!sits_user_id_fkey(first_name, last_name)").eq("status", "completed").order("start_date", { ascending: false });
    if (filterStatus === "cancelled") query = supabase.from("sits").select("*, profiles!sits_user_id_fkey(first_name, last_name)").eq("status", "cancelled").order("start_date", { ascending: false });

    const { data, error } = await query;
    if (error) toast.error("Erreur de chargement");
    else setSits(data || []);
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { fetchSits(); }, [fetchSits]);

  // Get accepted sitters for each sit
  const [sitters, setSitters] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!sits.length) return;
    const fetchSitters = async () => {
      const ids = sits.map((s) => s.id);
      const { data } = await supabase
        .from("applications")
        .select("sit_id, profiles!applications_sitter_id_fkey(first_name, last_name)")
        .in("sit_id", ids)
        .eq("status", "accepted");
      const map: Record<string, string> = {};
      data?.forEach((a: any) => {
        const p = a.profiles;
        if (p) map[a.sit_id] = `${p.first_name || ""} ${p.last_name || ""}`.trim();
      });
      setSitters(map);
    };
    fetchSitters();
  }, [sits]);

  // Check reviews for sits
  const [reviews, setReviews] = useState<Record<string, { owner: boolean; sitter: boolean }>>({});
  useEffect(() => {
    if (!sits.length) return;
    const fetchReviews = async () => {
      const ids = sits.map((s) => s.id);
      const { data } = await supabase.from("reviews").select("sit_id, review_type").in("sit_id", ids);
      const map: Record<string, { owner: boolean; sitter: boolean }> = {};
      data?.forEach((r: any) => {
        if (!map[r.sit_id]) map[r.sit_id] = { owner: false, sitter: false };
        if (r.review_type === "owner_to_sitter") map[r.sit_id].owner = true;
        if (r.review_type === "sitter_to_owner") map[r.sit_id].sitter = true;
      });
      setReviews(map);
    };
    fetchReviews();
  }, [sits]);

  const forceComplete = async (id: string) => {
    const { error } = await supabase.from("sits").update({ status: "completed" }).eq("id", id);
    if (error) toast.error("Erreur");
    else { toast.success("Garde marquée terminée"); fetchSits(); }
  };

  const getTimingStatus = (sit: any) => {
    if (sit.status === "cancelled") return { label: "Annulée", variant: "destructive" as const };
    if (sit.status === "completed") return { label: "Terminée", variant: "secondary" as const };
    if (!sit.start_date) return { label: "À venir", variant: "outline" as const };
    const start = new Date(sit.start_date);
    const end = sit.end_date ? new Date(sit.end_date) : null;
    if (isFuture(start)) return { label: "À venir", variant: "outline" as const };
    if (end && isPast(end)) return { label: "Dates passées", variant: "destructive" as const };
    return { label: "En cours", variant: "default" as const };
  };

  return (
    <div className="space-y-6">
      <h1 className="font-body text-2xl font-bold">Gardes</h1>

      <div className="flex gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="confirmed">Confirmées</SelectItem>
            <SelectItem value="completed">Terminées</SelectItem>
            <SelectItem value="cancelled">Annulées</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Annonce</TableHead>
              <TableHead>Propriétaire</TableHead>
              <TableHead>Gardien</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Avis</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chargement…</TableCell></TableRow>
            ) : sits.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucune garde</TableCell></TableRow>
            ) : sits.map((sit) => {
              const timing = getTimingStatus(sit);
              const profile = (sit as any).profiles;
              const rev = reviews[sit.id] || { owner: false, sitter: false };
              return (
                <TableRow key={sit.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">{sit.title || "Sans titre"}</TableCell>
                  <TableCell className="text-sm">{profile?.first_name} {profile?.last_name}</TableCell>
                  <TableCell className="text-sm">{sitters[sit.id] || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {sit.start_date ? format(new Date(sit.start_date), "d MMM", { locale: fr }) : "—"}
                    {" → "}
                    {sit.end_date ? format(new Date(sit.end_date), "d MMM yyyy", { locale: fr }) : "—"}
                  </TableCell>
                  <TableCell><Badge variant={timing.variant}>{timing.label}</Badge></TableCell>
                  <TableCell className="text-xs">
                    <div>Proprio: {rev.owner ? "✅" : "❌"}</div>
                    <div>Gardien: {rev.sitter ? "✅" : "❌"}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    {sit.status === "confirmed" && timing.label === "Dates passées" && (
                      <Button variant="outline" size="sm" onClick={() => forceComplete(sit.id)}>
                        Forcer fin
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminSitsManagement;
