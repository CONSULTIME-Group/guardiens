import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Eye, EyeOff, Trash2, Search, Sparkles, Share2, Link2, Mail, BarChart3 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import DraftStatsPanel from "@/components/admin/DraftStatsPanel";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Brouillon", variant: "outline" },
  published: { label: "En ligne", variant: "default" },
  confirmed: { label: "Confirmée", variant: "secondary" },
  completed: { label: "Terminée", variant: "secondary" },
  cancelled: { label: "Masquée / annulée", variant: "destructive" },
};

type Stats = {
  views: number;
  uniqueViews: number;
  publicViews: number;
  memberViews: number;
  uniqueMemberViews: number;
  messages: number;
  conversations: number;
  applications: number;
  lastViewAt: string | null;
};

const AdminListings = () => {
  const navigate = useNavigate();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  // Annonces = vie de la publication. Par défaut : tout ce qui est visible publiquement ou bloqué côté annonce (hors brouillons et hors gardes opérationnelles déjà confirmées)
  const [filterStatus, setFilterStatus] = useState<"published" | "draft" | "cancelled" | "all" | "no_draft">("published");
  const [filterCity, setFilterCity] = useState("");
  const [stats, setStats] = useState<Record<string, Stats>>({});
  const [cities, setCities] = useState<string[]>([]);
  const [deleteModal, setDeleteModal] = useState<string | null>(null);
  const [hideModal, setHideModal] = useState<string | null>(null);

  // Traffic sheet
  const [trafficOpen, setTrafficOpen] = useState(false);
  const [trafficListing, setTrafficListing] = useState<any | null>(null);
  const [trafficSources, setTrafficSources] = useState<Array<{ referrer_host: string; hits: number; last_hit_at: string }>>([]);
  const [trafficLoading, setTrafficLoading] = useState(false);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("sits")
      .select(`*, owner:profiles!sits_user_id_fkey(first_name, last_name, city, avatar_url)`)
      .order("created_at", { ascending: false })
      .limit(2000);
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

  // Batch stats : vues, vues uniques, msg, conversations, candidatures, dernière vue
  useEffect(() => {
    if (!listings.length) { setStats({}); return; }
    const ids = listings.map((l) => l.id);
    supabase.rpc("admin_get_listings_stats" as any, { p_sit_ids: ids }).then(({ data, error }) => {
      if (error) { console.error("admin_get_listings_stats:", error); return; }
      const map: Record<string, Stats> = {};
      (data as any[] || []).forEach((r) => {
        map[r.sit_id] = {
          views: Number(r.view_count) || 0,
          uniqueViews: Number(r.unique_view_count) || 0,
          publicViews: Number(r.public_view_count) || 0,
          memberViews: Number(r.member_view_count) || 0,
          uniqueMemberViews: Number(r.unique_member_view_count) || 0,
          messages: Number(r.message_count) || 0,
          conversations: Number(r.conversation_count) || 0,
          applications: Number(r.application_count) || 0,
          lastViewAt: r.last_view_at,
        };
      });
      setStats(map);
    });
  }, [listings]);

  const openTraffic = async (listing: any) => {
    setTrafficListing(listing);
    setTrafficOpen(true);
    setTrafficLoading(true);
    setTrafficSources([]);
    const { data, error } = await supabase.rpc("admin_get_listing_traffic_sources" as any, { p_sit_id: listing.id, p_limit: 20 });
    if (error) console.error("admin_get_listing_traffic_sources:", error);
    setTrafficSources((data as any[]) || []);
    setTrafficLoading(false);
  };

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
      if (!data?.success) throw new Error(data?.error || "suppression impossible");
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

  const buildShareData = (listing: any) => {
    const url = `https://guardiens.fr/annonces/${listing.id}`;
    const title = listing.title || "Une annonce de garde sur Guardiens";
    const text = `${title}${listing.owner?.city ? ` — ${listing.owner.city}` : ""} : découvrez cette annonce sur Guardiens.`;
    return { url, title, text };
  };
  const withShareTracking = (url: string, channel: "twitter" | "facebook" | "whatsapp" | "email") => {
    const tracked = new URL(url);
    tracked.searchParams.set("utm_source", channel === "twitter" ? "twitter" : channel);
    tracked.searchParams.set("utm_medium", "share");
    tracked.searchParams.set("utm_campaign", "admin_listing_share");
    return tracked.toString();
  };
  const handleCopyLink = async (listing: any) => {
    const { url } = buildShareData(listing);
    try { await navigator.clipboard.writeText(url); toast.success("Lien copié"); }
    catch { toast.error("Impossible de copier le lien"); }
  };
  const handleNativeShare = async (listing: any) => {
    const data = buildShareData(listing);
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try { await (navigator as any).share(data); } catch {}
    } else handleCopyLink(listing);
  };
  const openShareWindow = (url: string) => window.open(url, "_blank", "noopener,noreferrer,width=600,height=600");
  const handleShareTo = (listing: any, channel: "twitter" | "facebook" | "whatsapp" | "email") => {
    const data = buildShareData(listing);
    const encodedUrl = encodeURIComponent(withShareTracking(data.url, channel));
    const encodedText = encodeURIComponent(data.text);
    switch (channel) {
      case "twitter": openShareWindow(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`); break;
      case "facebook": openShareWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`); break;
      case "whatsapp": openShareWindow(`https://wa.me/?text=${encodedText}%20${encodedUrl}`); break;
      case "email": window.location.href = `mailto:?subject=${encodeURIComponent(data.title)}&body=${encodedText}%0A%0A${encodedUrl}`; break;
    }
  };

  // Totaux d'en-tête
  const totalViews = Object.values(stats).reduce((a, s) => a + s.views, 0);
  const totalUniques = Object.values(stats).reduce((a, s) => a + s.uniqueViews, 0);
  const totalMsg = Object.values(stats).reduce((a, s) => a + s.messages, 0);
  const totalApps = Object.values(stats).reduce((a, s) => a + s.applications, 0);
  const lastViewGlobal = Object.values(stats)
    .map((s) => s.lastViewAt)
    .filter(Boolean)
    .sort()
    .pop() as string | undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">Annonces</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Vie de la publication : visibilité, trafic, candidatures.
          Les gardes confirmées (post-acceptation) sont dans l'onglet <span className="font-medium text-foreground">Gardes</span>.
        </p>
      </div>

      <DraftStatsPanel />

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher titre ou proprio…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="published">En ligne (par défaut)</SelectItem>
            <SelectItem value="draft">Brouillons</SelectItem>
            <SelectItem value="cancelled">Masquées / annulées</SelectItem>
            <SelectItem value="no_draft">Tout sauf brouillons</SelectItem>
            <SelectItem value="all">Tous statuts</SelectItem>
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

      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="secondary">{filtered.length} annonce{filtered.length > 1 ? "s" : ""}</Badge>
        <Badge variant="outline">{totalViews} vues</Badge>
        <Badge variant="outline">{totalUniques} uniques</Badge>
        <Badge variant="outline">{totalMsg} msg</Badge>
        <Badge variant="outline">{totalApps} candidatures</Badge>
        {lastViewGlobal && (
          <Badge variant="outline">
            Dernière vue {formatDistanceToNow(new Date(lastViewGlobal), { addSuffix: true, locale: fr })}
          </Badge>
        )}
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Proprio</TableHead>
              <TableHead>Ville</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead className="text-right" title="Vues totales (public + membres)">Vues</TableHead>
              <TableHead className="text-right" title="Visiteurs uniques (par session/membre)">Uniques</TableHead>
              <TableHead className="text-right">Msg</TableHead>
              <TableHead className="text-right">Cand.</TableHead>
              <TableHead>Dernière vue</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Chargement…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Aucune annonce</TableCell></TableRow>
            ) : filtered.map((listing) => {
              const s = statusLabels[listing.status] || statusLabels.draft;
              const st = stats[listing.id];
              return (
                <TableRow key={listing.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">{listing.title || "Sans titre"}</TableCell>
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
                  <TableCell className="text-right text-sm font-medium tabular-nums">{st?.views ?? "—"}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground tabular-nums">{st?.uniqueViews ?? "—"}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{st?.messages ?? "—"}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{st?.applications ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {st?.lastViewAt ? formatDistanceToNow(new Date(st.lastViewAt), { addSuffix: true, locale: fr }) : "—"}
                  </TableCell>
                  <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Sources de trafic" onClick={() => openTraffic(listing)}>
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Voir l'annonce" onClick={() => navigate(`/sits/${listing.id}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" title="Partager">
                            <Share2 className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel className="text-xs text-muted-foreground">Partager cette annonce</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => handleCopyLink(listing)}><Link2 className="h-4 w-4 mr-2" /> Copier le lien</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleNativeShare(listing)}><Share2 className="h-4 w-4 mr-2" /> Partage rapide…</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => handleShareTo(listing, "facebook")}>Facebook</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleShareTo(listing, "twitter")}>X (Twitter)</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleShareTo(listing, "whatsapp")}>WhatsApp</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleShareTo(listing, "email")}><Mail className="h-4 w-4 mr-2" /> E-mail</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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

      {/* Traffic sheet */}
      <Sheet open={trafficOpen} onOpenChange={setTrafficOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base">
              {trafficListing?.title || "Annonce"}
            </SheetTitle>
            <p className="text-xs text-muted-foreground">
              {trafficListing?.owner?.first_name} {trafficListing?.owner?.last_name} · {trafficListing?.owner?.city || "—"}
            </p>
          </SheetHeader>

          {trafficListing && stats[trafficListing.id] && (
            <div className="grid grid-cols-3 gap-2 my-4">
              <div className="rounded-md border p-3 text-center">
                <div className="text-xl font-semibold tabular-nums">{stats[trafficListing.id].publicViews}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">Vues public</div>
              </div>
              <div className="rounded-md border p-3 text-center">
                <div className="text-xl font-semibold tabular-nums">{stats[trafficListing.id].memberViews}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">Vues membres</div>
              </div>
              <div className="rounded-md border p-3 text-center">
                <div className="text-xl font-semibold tabular-nums">{stats[trafficListing.id].uniqueMemberViews}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">Membres uniq.</div>
              </div>
              <div className="rounded-md border p-3 text-center">
                <div className="text-xl font-semibold tabular-nums">{stats[trafficListing.id].messages}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">Messages</div>
              </div>
              <div className="rounded-md border p-3 text-center">
                <div className="text-xl font-semibold tabular-nums">{stats[trafficListing.id].conversations}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">Conversations</div>
              </div>
              <div className="rounded-md border p-3 text-center">
                <div className="text-xl font-semibold tabular-nums">{stats[trafficListing.id].applications}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">Candidatures</div>
              </div>
              <div className="rounded-md border p-3 text-center">
                <div className="text-xl font-semibold tabular-nums">
                  {stats[trafficListing.id].views > 0
                    ? Math.round((stats[trafficListing.id].applications / stats[trafficListing.id].views) * 100)
                    : 0}%
                </div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">Cand./Vues</div>
              </div>
            </div>
          )}

          <Separator />

          <div className="mt-4">
            <h4 className="text-sm font-semibold mb-2">Sources de trafic</h4>
            <p className="text-xs text-muted-foreground mb-3">
              D'où viennent les visiteurs de cette annonce (referrer HTTP).
            </p>
            {trafficLoading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : trafficSources.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune vue enregistrée.</p>
            ) : (
              <ul className="space-y-1.5">
                {trafficSources.map((s) => (
                  <li key={s.referrer_host} className="flex items-center justify-between gap-2 text-sm border-b border-border/50 pb-1.5">
                    <span className="truncate font-mono text-xs">{s.referrer_host}</span>
                    <span className="flex items-center gap-3 shrink-0">
                      <span className="tabular-nums font-medium">{s.hits}</span>
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {formatDistanceToNow(new Date(s.last_hit_at), { addSuffix: true, locale: fr })}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-6">
            <Button variant="outline" size="sm" className="w-full" onClick={() => trafficListing && navigate(`/sits/${trafficListing.id}`)}>
              Ouvrir l'annonce publique
            </Button>
          </div>
        </SheetContent>
      </Sheet>

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
            {deleteModal && (stats[deleteModal]?.applications || 0) > 0
              ? `Cette annonce a ${stats[deleteModal].applications} candidature${stats[deleteModal].applications > 1 ? "s" : ""}. Elles seront supprimées avec l'annonce. Cette action est irréversible.`
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
