import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Eye, EyeOff, Trash2 } from "lucide-react";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Brouillon", variant: "outline" },
  published: { label: "Publiée", variant: "default" },
  confirmed: { label: "Confirmée", variant: "secondary" },
  completed: { label: "Terminée", variant: "secondary" },
  cancelled: { label: "Annulée", variant: "destructive" },
};

const AdminListings = () => {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState<"sits" | "long_stays">("sits");

  const fetchListings = useCallback(async () => {
    setLoading(true);
    const fetchQuery = async () => {
      if (filterType === "sits") {
        let q = supabase.from("sits").select("*, profiles!inner(first_name, last_name, email)").order("created_at", { ascending: false });
        if (filterStatus !== "all") q = q.eq("status", filterStatus as any);
        return q;
      } else {
        let q = supabase.from("long_stays").select("*, profiles!inner(first_name, last_name, email)").order("created_at", { ascending: false });
        if (filterStatus !== "all") q = q.eq("status", filterStatus as any);
        return q;
      }
    };
    const { data, error } = await fetchQuery();
    if (error) toast.error("Erreur de chargement");
    else setListings(data || []);
    setLoading(false);
  }, [filterType, filterStatus]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  // Count applications for each listing
  const [appCounts, setAppCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!listings.length) return;
    const fetchCounts = async () => {
      const table = filterType === "sits" ? "applications" : "long_stay_applications";
      const fk = filterType === "sits" ? "sit_id" : "long_stay_id";
      const ids = listings.map((l) => l.id);
      const { data } = await supabase.from(table).select(`id, ${fk}`).in(fk, ids);
      const counts: Record<string, number> = {};
      data?.forEach((a: any) => {
        const key = a[fk];
        counts[key] = (counts[key] || 0) + 1;
      });
      setAppCounts(counts);
    };
    fetchCounts();
  }, [listings, filterType]);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette annonce ?")) return;
    const { error } = await supabase.from(filterType).delete().eq("id", id);
    if (error) toast.error("Erreur");
    else { toast.success("Annonce supprimée"); fetchListings(); }
  };

  const filtered = listings.filter((l) => {
    if (!search) return true;
    return l.title?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <h1 className="font-body text-2xl font-bold">Annonces</h1>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="sits">Gardes courtes</SelectItem>
            <SelectItem value="long_stays">Longue durée</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="draft">Brouillon</SelectItem>
            <SelectItem value="published">Publiée</SelectItem>
            <SelectItem value="confirmed">Confirmée</SelectItem>
            <SelectItem value="completed">Terminée</SelectItem>
            <SelectItem value="cancelled">Annulée</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Propriétaire</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Candidatures</TableHead>
              <TableHead>Publiée le</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chargement…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucune annonce</TableCell></TableRow>
            ) : filtered.map((listing) => {
              const s = statusLabels[listing.status] || statusLabels.draft;
              const profile = (listing as any).profiles;
              return (
                <TableRow key={listing.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">{listing.title || "Sans titre"}</TableCell>
                  <TableCell className="text-sm">
                    {profile?.first_name} {profile?.last_name}
                    <div className="text-xs text-muted-foreground">{profile?.email}</div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {listing.start_date ? format(new Date(listing.start_date), "d MMM", { locale: fr }) : "—"}
                    {" → "}
                    {listing.end_date ? format(new Date(listing.end_date), "d MMM yyyy", { locale: fr }) : "—"}
                  </TableCell>
                  <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                  <TableCell className="text-sm">{appCounts[listing.id] || 0}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(listing.created_at), "d MMM yyyy", { locale: fr })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Supprimer" onClick={() => handleDelete(listing.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
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

export default AdminListings;
