import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Eye, EyeOff, Trash2, Search, Sparkles, Share2, Link2, Mail } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Brouillon", variant: "outline" },
  published: { label: "Publiée", variant: "default" },
  confirmed: { label: "Confirmée", variant: "secondary" },
  completed: { label: "Terminée", variant: "secondary" },
  cancelled: { label: "Annulée", variant: "destructive" },
};

const AdminListings = () => {
  const navigate = useNavigate();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("no_draft");
  const [filterCity, setFilterCity] = useState("");
  const [appCounts, setAppCounts] = useState<Record<string, number>>({});
  const [cities, setCities] = useState<string[]>([]);
  const [deleteModal, setDeleteModal] = useState<string | null>(null);
  const [hideModal, setHideModal] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("sits").select(`*, owner:profiles!sits_user_id_fkey(first_name, last_name, city, avatar_url)`).order("created_at", { ascending: false });
    if (filterStatus === "no_draft") {
      q = q.neq("status", "draft" as any);
    } else if (filterStatus !== "all") {
      q = q.eq("status", filterStatus as any);
    }
    const { data, error } = await q;
    if (error) toast.error("Erreur de chargement");
    else {
      setListings(data || []);
      const uniqueCities = [...new Set((data || []).map((l: any) => l.owner?.city).filter(Boolean))];
      setCities(uniqueCities as string[]);
    }
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  useEffect(() => {
    if (!listings.length) return;
    const ids = listings.map((l) => l.id);
    const fetchCounts = async () => {
      const counts: Record<string, number> = {};
      // RPC sécurisée : ne retourne que les compteurs (pas le détail des candidatures)
      const { data, error } = await supabase.rpc("admin_get_application_counts", { p_sit_ids: ids });
      if (error) {
        console.error("admin_get_application_counts:", error);
      } else {
        (data || []).forEach((row: any) => { counts[row.sit_id] = row.total; });
      }
      setAppCounts(counts);
    };
    fetchCounts();
  }, [listings]);

  const handleHide = async (id: string) => {
    await supabase.from("sits").update({ status: "cancelled" as any }).eq("id", id);
    const listing = listings.find(l => l.id === id);
    if (listing?.owner) {
      await supabase.from("notifications").insert({
        user_id: listing.user_id, type: "listing_hidden",
        title: "Annonce masquée par l'admin",
        body: `Votre annonce "${listing.title || "Sans titre"}" a été masquée de la recherche par un administrateur.`,
        link: `/sits/${id}`,
      });
    }
    toast.success("Annonce masquée"); setHideModal(null); fetchListings();
  };

  const handleRestore = async (id: string) => {
    await supabase.from("sits").update({ status: "published" as any }).eq("id", id);
    toast.success("Annonce remise en ligne"); fetchListings();
  };

  const handleDelete = async (id: string) => {
    const listing = listings.find(l => l.id === id);
    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-listing", {
        body: {
          listingId: id,
          listingType: "sits",
          ownerUserId: listing?.user_id ?? null,
          listingTitle: listing?.title ?? "Sans titre",
        },
      });

      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.error || "suppression impossible");
      }

      toast.success("Annonce supprimée");
      setDeleteModal(null);
      setListings(prev => prev.filter(l => l.id !== id));
      await fetchListings();
    } catch (err: any) {
      toast.error("Erreur : " + (err?.message || "suppression impossible"));
      setDeleteModal(null);
    }
  };

  const filtered = listings.filter((l) => {
    if (search && !l.title?.toLowerCase().includes(search.toLowerCase()) && !l.owner?.first_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCity && filterCity !== "all_cities" && l.owner?.city !== filterCity) return false;
    return true;
  });

  const formatLastActivity = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: fr });
    } catch {
      return "—";
    }
  };

  const buildShareData = (listing: any) => {
    const url = `${window.location.origin}/sits/${listing.id}`;
    const title = listing.title || "Une annonce de garde sur Guardiens";
    const text = `${title}${listing.owner?.city ? ` — ${listing.owner.city}` : ""} : découvrez cette annonce sur Guardiens.`;
    return { url, title, text };
  };

  const handleCopyLink = async (listing: any) => {
    const { url } = buildShareData(listing);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié dans le presse-papier");
    } catch {
      toast.error("Impossible de copier le lien");
    }
  };

  const handleNativeShare = async (listing: any) => {
    const data = buildShareData(listing);
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share(data);
      } catch {
        /* annulé par l'utilisateur */
      }
    } else {
      handleCopyLink(listing);
    }
  };

  const openShareWindow = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=600");
  };

  const handleShareTo = (listing: any, channel: "twitter" | "facebook" | "whatsapp" | "email") => {
    const data = buildShareData(listing);
    const encodedUrl = encodeURIComponent(data.url);
    const encodedText = encodeURIComponent(data.text);
    switch (channel) {
      case "twitter":
        openShareWindow(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`);
        break;
      case "facebook":
        openShareWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`);
        break;
      case "whatsapp":
        openShareWindow(`https://wa.me/?text=${encodedText}%20${encodedUrl}`);
        break;
      case "email":
        window.location.href = `mailto:?subject=${encodeURIComponent(data.title)}&body=${encodedText}%0A%0A${encodedUrl}`;
        break;
    }
  };

    <div className="space-y-6">
      <h1 className="font-body text-2xl font-bold">Annonces</h1>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher titre ou proprio…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="no_draft">Sans brouillons</SelectItem>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="draft">Brouillons</SelectItem>
            <SelectItem value="published">Publiée</SelectItem>
            <SelectItem value="confirmed">Confirmée</SelectItem>
            <SelectItem value="completed">Terminée</SelectItem>
            <SelectItem value="cancelled">Annulée</SelectItem>
          </SelectContent>
        </Select>
        {cities.length > 0 && (
          <Select value={filterCity} onValueChange={setFilterCity}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Ville" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all_cities">Toutes villes</SelectItem>
              {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <p className="text-sm text-muted-foreground">{filtered.length} annonce{filtered.length > 1 ? "s" : ""}</p>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Proprio</TableHead>
              <TableHead>Ville</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Dernière activité</TableHead>
              <TableHead>Candidatures</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Chargement…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Aucune annonce</TableCell></TableRow>
            ) : filtered.map((listing) => {
              const s = statusLabels[listing.status] || statusLabels.draft;
              return (
                <TableRow key={listing.id}>
                  <TableCell className="font-medium max-w-[180px] truncate">{listing.title || "Sans titre"}</TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-2">
                      {listing.owner?.avatar_url && <img src={listing.owner.avatar_url} className="w-6 h-6 rounded-full object-cover" />}
                      <span>{listing.owner?.first_name} {listing.owner?.last_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{listing.owner?.city || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {listing.start_date ? format(new Date(listing.start_date), "d MMM", { locale: fr }) : "—"}
                    {" → "}
                    {listing.end_date ? format(new Date(listing.end_date), "d MMM yy", { locale: fr }) : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatLastActivity(listing.updated_at)}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{appCounts[listing.id] || 0}</TableCell>
                  <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Voir" onClick={() => navigate(`/sits/${listing.id}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {listing.status !== "cancelled" ? (
                        <Button variant="ghost" size="icon" title="Masquer" onClick={() => setHideModal(listing.id)}>
                          <EyeOff className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" title="Remettre en ligne" onClick={() => handleRestore(listing.id)}>
                          <Sparkles className="h-4 w-4 text-primary" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" title="Supprimer" onClick={() => setDeleteModal(listing.id)}>
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

      {/* Hide confirmation */}
      <Dialog open={!!hideModal} onOpenChange={(o) => !o && setHideModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Masquer cette annonce ?</DialogTitle></DialogHeader>
          <DialogDescription>L'annonce sera retirée de la recherche. Le propriétaire sera notifié.</DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHideModal(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => hideModal && handleHide(hideModal)}>Masquer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteModal} onOpenChange={(o) => !o && setDeleteModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Supprimer cette annonce ?</DialogTitle></DialogHeader>
          <DialogDescription>
            {deleteModal && (appCounts[deleteModal] || 0) > 0
              ? `Cette annonce a ${appCounts[deleteModal]} candidature${appCounts[deleteModal] > 1 ? "s" : ""}. Elles seront supprimées avec l'annonce. Cette action est irréversible.`
              : "Cette action est irréversible. Le propriétaire sera notifié."}
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModal(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => deleteModal && handleDelete(deleteModal)}>Supprimer définitivement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminListings;
